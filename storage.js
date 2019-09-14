const api = require('./api')

class RequestChainStorage {
  /**
   * requestChainOptions:
   * restUrl: url of the rest server to sign and broadcast tx
   * chainId: Id of the cosmos chain to use
   * accountNumber: Number of the account used to broadcast tx
   * accountName: Name of the account used to broadcast tx
   * accountPassword: Password to sign tx with the given account
   * accountAddress: Address of the account
   * gas: gas used for tx
   */
  constructor(requestChainOptions) {
    this.requestChainOptions = requestChainOptions

    // TODO: check type
  }

  async initialize () {}

  async append (data) {
    const appendResult = await api.appendBlock(data, this.requestChainOptions)

    return {
      meta: {
        timestamp: appendResult.timestamp,
      },
      result: {
        dataId: appendResult.index.toString(),
      }
    }
  }

  async read (dataId) {
    const readResult = await api.getBlock(parseInt(dataId), this.requestChainOptions)

    return {
      meta: {
        timestamp: readResult.timestamp,
      },
      result: {
        content: readResult.block,
      }
    }
  }

  async readMany (dataIds) {
    const readPromises = []

    for(let i=0; i<dataIds.length; i++) {
      readPromises.push(this.read(dataIds[i]))
    }

    return Promise.all(readPromises)
  }

  // TODO: Optimize API calls
  async getData (options) {
    const emptyResult = {
      meta: {
        metaData: [],
        lastTimestamp: 0,
      },
      result: {
        dataIds: [],
        data: [],
      }
    }

    // No block check
    const blockCount = await api.getBlockCount(this.requestChainOptions)
    if (blockCount === 0) {
      return emptyResult
    }

    let blockFrom = 0
    let blockTo = blockCount-1

    const firstResult = await api.getBlock(blockFrom, this.requestChainOptions)
    const lastResult = await api.getBlock(blockTo, this.requestChainOptions)
    const firstTimestamp = firstResult.timestamp
    let lastTimestamp = lastResult.timestamp

    // Check first if the timestamp is out of range
    if (options && options.from && options.from > lastTimestamp) {
      return emptyResult
    }
    if (options && options.to && options.to < firstTimestamp) {
      return emptyResult
    }


    // Find block index to search from
    if (options && options.from && options.from > firstTimestamp) {
      const tmp = await this.getBlocksSurroundingTimestamp(blockFrom, blockTo, options.from)
      blockFrom = tmp.blockAfter
    }

    // Find block index to search to
    if (options && options.to && options.to < lastTimestamp) {
      const tmp = await this.getBlocksSurroundingTimestamp(blockFrom, blockTo, options.to)
      blockTo = tmp.blockBefore
    }

    // Fetch all block
    const metadataArray = []
    const dataIdArray = []
    const dataArray = []
    for(let blockIterator = blockFrom; blockIterator <= blockTo; blockIterator++) {
      dataIdArray.push(blockIterator.toString())

      const readResult = await api.getBlock(blockIterator, this.requestChainOptions)
      metadataArray.push({timestamp: readResult.timestamp})
      dataArray.push(readResult.block)

      if(blockIterator === blockTo) {
        lastTimestamp = readResult.timestamp
      }
    }

    return {
      meta: {
        metaData: metadataArray,
        lastTimestamp,
      },
      result: {
        dataIds: dataIdArray,
        data: dataArray,
      },
    }
  }

  async getDataId (options) {
    const getDataResult = await this.getData(options)

    return {
      meta: getDataResult.meta,
      result: {
        dataIds: getDataResult.result.dataIds,
      },
    }
  }

  async getBlocksSurroundingTimestamp(blockFrom, blockTo, timestamp) {
    let blockFromTmp = blockFrom
    let blockToTmp = blockTo
    let blockHalf = Math.floor((blockFromTmp+blockToTmp)/2)
    let readResult

    while(blockFromTmp < blockToTmp-1) {
      readResult = await api.getBlock(blockHalf, this.requestChainOptions)

      if(readResult.timestamp > timestamp) {
        blockToTmp = blockHalf
        blockHalf = Math.floor((blockFromTmp+blockToTmp)/2)
      } else if(readResult.timestamp < timestamp) {
        blockFromTmp = blockHalf
        blockHalf = Math.floor((blockFromTmp+blockToTmp)/2)
      } else {
        return {
          blockBefore: blockHalf,
          blockAfter: blockHalf,
        }
      }
    }

    return {
      blockBefore: blockFromTmp,
      blockAfter: blockFromTmp+1,
    }
  }
}

exports.default = RequestChainStorage;
