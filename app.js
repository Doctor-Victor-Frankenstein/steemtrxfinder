// const dsteem         = require('dsteem')
// const client         = new dsteem.Client('https://api.steemit.com')
const MIN            = 60 * 1000
const SEC            = 1000
const  sec_per_block = 3

var d                = new Date()
var n                = d.getTimezoneOffset() * MIN

var post_created     = ''

function findCommentTrx (client, author, permlink, blockNum) {
	return new Promise(async (resolve, reject) => {
		let block     = {}
		if (!blockNum) {
			// console.log('first run')
			let res      = await client.database.call('get_content', [author, permlink])
			post_created = res.created
			post_created = new Date(Date.parse(post_created) - n)
			
			block        = await client.blockchain.getCurrentBlockHeader()
			blockNum     = await client.blockchain.getCurrentBlockNum()
			first_run    = false
		} else {
			block = await client.database.getBlockHeader(blockNum)
		}
		// console.log('\n ** blockNum = ' + blockNum + ' **')
		let block_time = new Date(Date.parse(block.timestamp) - n)
		let timediff = (block_time - post_created) / 1000
		// console.log('timediff = ' + timediff + ' sec')
		if (timediff > 3) {
			let block_delta = timediff / sec_per_block
			console.log('block_delta = ' + block_delta)
			return start(author, permlink, blockNum - block_delta).then((res) => { return resolve(res)})
		} else if (timediff < 0) {
			let block_delta = timediff / sec_per_block
			console.log('block_delta = ' + block_delta)
			return start(author, permlink, blockNum - block_delta).then((res) => { return resolve(res)})
		} else {
			console.log('origin BLOCK has been found')
			let block = await client.database.getBlock(blockNum + 1)
			let trxs = block.transactions
			trxs.forEach((trx) => {
				trx.operations.forEach((op) => {
					if (op[0] == 'comment') {
						// console.log(op[1].permlink)
						if (op[1].permlink == permlink) {
							console.log('bingo, TRX has been found')
							// console.log('bingo, permlink has been found')
							// console.log(op[1].permlink)
							trx.operations.forEach((op) => {
								if (op[0] == 'custom_json' && op[1].id == 'likwid-beneficiary') {
									let json = JSON.parse(op[1].json)
									// console.log(json)
									let beneficiaries = []
									try {
										beneficiaries = json.beneficiaries
									} catch(e) {
										console.log(e)
										return reject('custom_json detected but missing beneficiaries array')
									}
									return resolve(beneficiaries)
								}
							})
						}
					}
				})
			})
			return resolve()
		}
	})
}

function findVoteTrx (trans, _client) {
	return new Promise(async (resolve, reject) => {
		// console.log(trans.op[1])
		let blockNum = trans.block
		let block
		try { 
			block = await _client.database.getBlock(blockNum)
		} catch(e) {
			return reject(e)
		}
		// console.log('origin BLOCK has been found')
		// let block = await client.database.getBlock(blockNum + 1)
		let trxs = block.transactions
		trxs.forEach((trx) => {
			trx.operations.forEach((op) => {
				if (op[0] == 'vote') {
					// console.log(op[1])
					if ( JSON.stringify(op[1]) === JSON.stringify(trans.op[1]) ) {
						// console.log('bingo, TRX has been found')
						return resolve(trx)
					}
				}
			})
		})
		return reject()
	})
}

module.exports = {
	findCommentTrx: findCommentTrx,
	findVoteTrx: findVoteTrx
}

