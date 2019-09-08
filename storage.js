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
    appendResult = await api.appendBlock(data, this.requestChainOptions)

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
    readResult = await api.getBlock(parseInt(dataId), this.requestChainOptionsTest)

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
    const readPromises

    for(let i=0; i<dataIds.len; i++) {
      readPromises.push(this.read(dataIds[i]))
    }

    return Promise.all(readPromises)
  }

  // TODO: Optimize API calls
  async getData (options?: ITimestampBoundaries) {
    let lastTimestamp

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
    const blockCount = await api.getBlockCount(this.requestChainOptionsTest)
    if (blockCount === 0) {
      return emptyResult
    }

    let blockFrom = 0
    let blockTo = blockCount-1

    firstResult = await api.getBlock(blockFrom, this.requestChainOptionsTest)
    lastResult = await api.getBlock(blockTo, this.requestChainOptionsTest)
    const firstTimestamp = firstResult.timestamp
    const lastTimestamp = lastResult.timestamp

    // Check first if the timestamp is out of range
    if (options && options.from && options.from > lastTimestamp) {
      return emptyResult
    }
    if (options && options.to && options.to < firstTimestamp) {
      return emptyResult
    }


    // Find block index to search from
    if (options && options.from && options.from > firstTimestamp) {
      const tmp = getBlocksSurroundingTimestamp(blockFrom, blockTo, options.from)
      blockFrom = tmp.blockAfter
    }

    // Find block index to search to
    if (options && options.to && options.to < lastTimestamp) {
      const tmp = getBlocksSurroundingTimestamp(blockFrom, blockTo, options.to)
      blockto = tmp.blockBefore
    }

    // Fetch all block
    const metadataArray = []
    const dataIdArray = []
    const dataArray = []
    for(let blockIterator = blockFrom; blockIterator <= blockto; blockIterator++) {
      dataIdArray.push(blockIterator.toString())

      const readResult = await api.getBlock(blockIterator, this.requestChainOptionsTest)
      metadataArray.push({timestamp: readResult.timestamp})
      dataArray.push(readResult.block)

      if(blockIterator === blockto) {
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

  async getDataId (options?: ITimestampBoundaries) {
    const getDataResult = await getData(options)

    return {
      meta: getDataResult.meta,
      result: {
        data: getDataResult.result.data,
      },
    }
  }

  async getBlocksSurroundingTimestamp(blockFrom, blockTo, timestamp) {
    let blockFromTmp = blockFrom
    let blockToTmp = blockTo
    let blockHalf = (blockFromTmp+blockToTmp)/2
    let readResult

    while(blockFromTmp < blockToTmp) {
      readResult = await api.getBlock(blockHalf, this.requestChainOptionsTest)

      if(readResult.timestamp < options.from) {
        blockToTmp = blockHalf
        blockHalf = (blockFromTmp+blockToTmp)/2
      } else if(readResult.timestamp > options.from) {
        blockFromTmp = blockHalf
        blockHalf = (blockFromTmp+blockToTmp)/2
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
