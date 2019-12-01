const axios = require('axios')

module.exports = {
  getBlock: async (blockIndex, requestChainOptions) => {
    let res

    try {
      res = await axios.get(`${requestChainOptions.restUrl}/requestchain/getblock/${blockIndex}`)
    } catch (e) {
      throw(e)
    }

    if (res.status !== 200) {
      throw(res.status)
    }

    return res.data.result
  },
  getBlockCount: async (requestChainOptions) => {
    let res

    try {
      res = await axios.get(`${requestChainOptions.restUrl}/requestchain/blockcount`)
    } catch (e) {
      throw(e)
    }

    if (res.status !== 200) {
      throw(res.status)
    }

    return res.data.result
  },
  appendBlock: async (blockContent, requestChainOptions) => {
    let res

    const messageToBroadcast = JSON.stringify({
      chain_id: requestChainOptions.chainId,
      account_number: requestChainOptions.accountNumber,
      address: requestChainOptions.accountAddress,
      password: requestChainOptions.accountPassword,
      name: requestChainOptions.accountName,
      tx:
      {
        msg: [
          {
            type: 'requestchain/AppendBlock',
            value:
            {
              block: blockContent,
              signer: requestChainOptions.accountAddress
            }
          }
        ],
        fee:
        {
          amount:[],
          gas:requestChainOptions.gas
        },
      }
    })

    // amount:[
    //   {
    //     denom: 'stake',
    //     amount: '1'
    //   }
    // ],

    // Sign and broadcast the transaction
    try {
      res = await axios.post(`${requestChainOptions.restUrl}/requestchain/broadcast`, messageToBroadcast, {
          headers: {
            'Content-Type': 'application/json',
          }
        }
      )
    } catch (e) {
      throw(e)
    }

    if (res.status !== 200) {
      throw(res.status)
    }

    return res.data.result
  },
}
