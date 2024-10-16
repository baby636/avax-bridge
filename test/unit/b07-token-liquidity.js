/*
  Unit and integration tests for the token-liquidity.js library
*/

'use strict'

const assert = require('chai').assert
const sinon = require('sinon')
const nock = require('nock')

const TokenLiquidity = require('../../src/lib/token-liquidity')

// const bitboxMock = require('bitbox-mock')
// const txMockData = require('./mocks/transactions')
const libMockData = require('./mocks/token-liquidity-mock')
const avaxMockData = require('./mocks/avax.mock')

// Used for debugging.
const util = require('util')
util.inspect.defaultOptions = { depth: 1 }

// Determine if this is a Unit or Integration test
// If not specified, default to unit test.
if (!process.env.APP_ENV) process.env.APP_ENV = 'test'
if (!process.env.TEST_ENV) process.env.TEST_ENV = 'unit'
// const REST_URL = `https://trest.bitcoin.com/v2/`

describe('#token-liquidity', () => {
  let sandbox
  let lib

  before(() => {})

  beforeEach(() => {
    lib = new TokenLiquidity()

    // mockedWallet = Object.assign({}, testwallet) // Clone the testwallet
    sandbox = sinon.createSandbox()

    // Activate nock if it's inactive.
    if (!nock.isActive()) nock.activate()
  })

  afterEach(() => {
    // Clean up HTTP mocks.
    nock.cleanAll() // clear interceptor list.
    nock.restore()

    sandbox.restore()
  })

  describe('#exchangeTokensForBCH', () => {
    it('should calculate values in the spreadsheet', () => {
      const exchangeObj = {
        tokenIn: 500,
        // tokenBalance: 8500,
        bchBalance: 12.41463259,
        bchOriginalBalance: 25,
        tokenOriginalBalance: 5000
      }

      const retObj = lib.exchangeTokensForBCH(exchangeObj)
      // console.log(`retObj: ${JSON.stringify(retObj, null, 2)}`)

      const result = retObj.bchOut

      assert.isNumber(result)
      assert.equal(result, 1.1814112, 'Should match spreadsheet')
    })

    it('should calculate values in the spreadsheet', () => {
      const exchangeObj = {
        tokenIn: 500,
        // tokenBalance: 15000,
        bchBalance: 3.38338208,
        bchOriginalBalance: 25,
        tokenOriginalBalance: 5000
      }

      const retObj = lib.exchangeTokensForBCH(exchangeObj)
      // console.log(`retObj: ${JSON.stringify(retObj, null, 2)}`)

      const result = retObj.bchOut

      assert.isNumber(result)
      assert.equal(result, 0.32197408, 'Should match spreadsheet')
    })

    it('should calculate values in the spreadsheet', () => {
      const exchangeObj = {
        tokenIn: 500,
        // tokenBalance: 1000,
        bchBalance: 55.63852321,
        bchOriginalBalance: 25,
        tokenOriginalBalance: 5000
      }

      const retObj = lib.exchangeTokensForBCH(exchangeObj)
      // console.log(`retObj: ${JSON.stringify(retObj, null, 2)}`)

      assert.equal(retObj.bchOut, 2.5000027)
      assert.equal(retObj.bch2, 53.13852321)
      assert.equal(retObj.token2, -5627.704642)
    })

    it('should work with negative token balances', () => {
      const exchangeObj = {
        tokenIn: 500,
        // tokenBalance: 1000,
        bchBalance: 50,
        bchOriginalBalance: 25,
        tokenOriginalBalance: 5000
      }

      const retObj = lib.exchangeTokensForBCH(exchangeObj)
      // console.log(`retObj: ${JSON.stringify(retObj, null, 2)}`)

      assert.equal(retObj.bchOut, 2.5000027)
      assert.equal(retObj.bch2, 47.5)
      assert.equal(retObj.token2, -4500)
    })

    it('should work with negative token balances', () => {
      const exchangeObj = {
        tokenIn: 500,
        // tokenBalance: 1000,
        bchBalance: 55,
        bchOriginalBalance: 25,
        tokenOriginalBalance: 5000
      }

      const retObj = lib.exchangeTokensForBCH(exchangeObj)
      // console.log(`retObj: ${JSON.stringify(retObj, null, 2)}`)

      assert.equal(retObj.bchOut, 2.5000027)
      assert.equal(retObj.bch2, 52.5)
      assert.equal(retObj.token2, -5500.00000001)
    })

    it('should throw error if bchBalance is not defined', async () => {
      try {
        await lib.exchangeTokensForBCH({})
      } catch (error) {
        assert.include(error.message, 'bchBalance must be defined')
      }
    })
  })

  describe('exchangeBCHForTokens', () => {
    it('should calculate values in the spreadsheet', () => {
      const exchangeObj = {
        // bchIn: 1.181410849,
        bchIn: 1.30565831,
        bchBalance: 12.41463259,
        bchOriginalBalance: 25,
        tokenOriginalBalance: 5000
      }

      const result = lib.exchangeBCHForTokens(exchangeObj)
      // console.log(`result: ${util.inspect(result)}`)

      assert.hasAllKeys(result, ['tokensOut', 'bch2', 'token2'])
      assert.equal(
        Math.floor(result.tokensOut),
        499,
        'Should match spreadsheet'
      )
      assert.isNumber(result.bch2)
      assert.isNumber(result.token2)
    })

    it('should calculate values in the spreadsheet', () => {
      const exchangeObj = {
        bchIn: 5.81360394,
        bchBalance: 3.38338208,
        bchOriginalBalance: 25,
        tokenOriginalBalance: 5000
      }

      const result = lib.exchangeBCHForTokens(exchangeObj)
      // console.log(`result: ${util.inspect(result)}`)

      assert.hasAllKeys(result, ['tokensOut', 'bch2', 'token2'])
      assert.equal(
        Math.floor(result.tokensOut),
        4999,
        'Should match spreadsheet'
      )
      assert.isNumber(result.bch2)
      assert.isNumber(result.token2)
    })

    it('should throw error if bchBalance is not defined', async () => {
      try {
        await lib.exchangeBCHForTokens({})
      } catch (error) {
        assert.include(error.message, 'bchBalance must be defined')
      }
    })
  })

  describe('#detectNewTxs', () => {
    it('should return new txs', async () => {
      const knownTxids = libMockData.knownTxids

      const obj = {
        seenTxs: knownTxids.slice(0, -1)
      }

      // If unit test, use the mocking library instead of live calls.
      sandbox.stub(lib.bch, 'getTransactions').resolves(libMockData.mockGetTxs)

      sandbox.stub(lib.txs, 'getTxConfirmations').resolves(libMockData.confs)

      const result = await lib.detectNewTxs(obj)
      // console.log(`result: ${JSON.stringify(result, null, 2)}`)

      assert.isArray(result)
      assert.hasAllKeys(result[0], ['txid', 'confirmations'])
    })

    it('should return an empty array if no new txs', async () => {
      const knownTxids = libMockData.knownTxids

      const obj = {
        seenTxs: knownTxids
      }

      // If unit test, use the mocking library instead of live calls.
      sandbox.stub(lib.bch, 'getTransactions').resolves(libMockData.mockGetTxs)

      sandbox.stub(lib.txs, 'getTxConfirmations').resolves(libMockData.confs)

      const result = await lib.detectNewTxs(obj)
      // console.log(`result: ${JSON.stringify(result, null, 2)}`)

      assert.isArray(result)
      assert.equal(result.length, 0)
    })

    it('should catch and throw errors', async () => {
      try {
        // Force an error
        sandbox
          .stub(lib.bch, 'getTransactions')
          .rejects(new Error('test error'))

        const knownTxids = libMockData.knownTxids

        const obj = {
          seenTxs: knownTxids
        }

        await lib.detectNewTxs(obj)

        assert.fail('Unexpected result')
      } catch (err) {
        assert.include(err.message, 'test error')
      }
    })
  })

  describe('#detectNewAvaxTxs', () => {
    it('should return new txs', async () => {
      const knownTxids = avaxMockData.knownTxids
      const txHistory = avaxMockData.txHistory.data.transactions.results

      const obj = {
        seenAvaxTxs: knownTxids.slice(0, -1)
      }

      sandbox.stub(lib.avax, 'getTransactions').resolves(txHistory)

      const result = await lib.detectNewAvaxTxs(obj)

      assert.isArray(result)
      assert.hasAllKeys(result[0], ['id', 'memo', 'inputs', 'outputs'])
    })

    it('should return an empty array if no new txs', async () => {
      const knownTxids = avaxMockData.knownTxids
      const txHistory = avaxMockData.txHistory.data.transactions.results

      const obj = {
        seenAvaxTxs: knownTxids
      }

      sandbox.stub(lib.avax, 'getTransactions').resolves(txHistory)
      const result = await lib.detectNewAvaxTxs(obj)

      assert.isArray(result)
      assert.equal(result.length, 0)
    })

    it('should throw and catch an error', async () => {
      try {
        const knownTxids = avaxMockData.knownTxids

        const obj = {
          seenAvaxTxs: knownTxids.slice(0, -1)
        }
        // Force an error
        sandbox
          .stub(lib.avax, 'getTransactions')
          .rejects(new Error('test error'))
        await lib.detectNewAvaxTxs(obj)
        assert.fail('Unexpected result')
      } catch (err) {
        assert.include(err.message, 'test error')
      }
    })
  })

  describe('#processAvaxTx', () => {
    it('should log some info and return a valid object', async () => {
      try {
        sandbox
          .stub(lib.bridge.avax, 'burnToken')
          .resolves(avaxMockData.knownTxids[0])

        const formatedTx = avaxMockData.formatedTx
        const result = await lib.processAvaxTx(formatedTx, avaxMockData.assetDescription)

        assert.equal(result.isValid, true)
        assert.hasAllKeys(result, ['amount', 'code', 'bchaddr', 'isValid'])
      } catch (error) {
        assert.fail('Unexpected result', error)
      }
    })

    it('should return an invalid object if the tx was to the same wallet', async () => {
      try {
        sandbox
          .stub(lib.bridge.avax, 'burnToken')
          .resolves(avaxMockData.knownTxids[0])

        const result = await lib.processAvaxTx(avaxMockData.formatedSelfTx)
        assert.isFalse(result.isValid)
      } catch (error) {
        assert.fail('unexpected result', error)
      }
    })

    it('should throw and catch an error', async () => {
      try {
        sandbox
          .stub(lib.bridge.avax, 'burnToken')
          .resolves(avaxMockData.knownTxids[0])

        await lib.processAvaxTx({ id: null })
        assert.fail('Unexpected result')
      } catch (error) {
        console.log(error)
        assert.include(error.message, 'txid needs to be a string')
      }
    })
  })

  describe('#pRetryProcessTx function', () => {
    it('should throw error if parameters are not defined', async () => {
      try {
        await lib.pRetryProcessTx()
      } catch (error) {
        // console.log('Error: ', error)
        assert.include(error.message, 'obj is undefined')
      }
    })

    it('Should return object with avax code', async () => {
      try {
        const obj = {
          txid:
            'c040ce544e219133f9562c795b4f92a329b9b9152f47a831609781f197f8d7a6',
          bchBalance: 12,
          isTokenTx: 0,
          tokenBalance: 1
        }

        sandbox.stub(lib, 'processTx').resolves(libMockData.processOpReturnTx)

        const result = await lib.pRetryProcessTx(obj, false, { denomination: 2 })
        assert.hasAllKeys(result, ['txid', 'bchBalance', 'tokenBalance', 'type', 'addr'])
        assert.equal(result.type, 'avax')
        assert.equal(result.txid, 'e15fef99a0df2b450cadd0c6644f1edfc17fe55951f1fdfcf3eabe0abfe46e79')
      } catch (error) {
        console.log(error)
        // assert.include(error.message, `Error in "pRetryProcessTx" functions`)
      }
    })

    it('Should return object with token code', async () => {
      try {
        // console.log('init test')
        const obj = {
          txid:
            'e15fef99a0df2b450cadd0c6644f1edfc17fe55951f1fdfcf3eabe0abfe46e79',
          bchBalance: 12,
          isTokenTx: 10,
          tokenBalance: 1
        }

        sandbox.stub(lib, 'processTx').resolves(libMockData.processSLPTx)

        const result = await lib.pRetryProcessTx(obj, true, { denomination: 2 })
        assert.hasAllKeys(result, ['txid', 'bchBalance', 'tokenBalance', 'type', 'amount'])
        assert.equal(result.type, 'token')
      } catch (error) {
        console.log(error)
        // assert.include(error.message, `Error in "pRetryProcessTx" functions`)
      }
    })
  })

  // Only run these tests for a unit test.
  if (process.env.TEST_ENV === 'unit') {
    describe('compareLastTransaction', () => {
      /*
        it(`should return false if transactions are the same`, async () => {
          const obj = {
            bchAddr: `bchtest:qq8wqgxq0uu4y6k92pw9f7s6hxzfp9umsvtg39pzqf`,
            txid: `9f56ba221d862e41f33b564e49ddffc66ec9b5bcaf4669d40e1d890ade4817bc`,
            bchBalance: 25,
            tokenBalance: 5000
          }

          const result = await lib.compareLastTransaction(obj, tknLib, bchLib, BITBOX)
          console.log(`result: ${util.inspect(result)}`)

          assert.equal(result, false, 'return false expected')
        })
        */
      /*
      it('should send BCH in exchange for tokens', async () => {
        const obj = {
          bchAddr: `bchtest:qq8wqgxq0uu4y6k92pw9f7s6hxzfp9umsvtg39pzqf`,
          txid: `298e9186a2113443f3b2064ee0bf0ae1973434ae48e9ec3c3e27bfea41d41b05`,
          bchBalance: 7.68905269,
          tokenBalance: 100000
        }

        const result = await lib.compareLastTransaction(obj)
        // console.log(`result: ${util.inspect(result)}`)

        // Should return the last transactions, as well as the new balance of BCH
        // and the token.
        assert.hasAllKeys(result, [
          'lastTransaction',
          'bchBalance'
          // 'tokenBalance'
        ])
      })

      it('should send tokens in exchange for BCH', async () => {
        const obj = {
          bchAddr: `bchtest:qq8wqgxq0uu4y6k92pw9f7s6hxzfp9umsvtg39pzqf`,
          txid: `a77762bb47c130e755cc053db51333bbd64596eefd18baffc08a447749863fa9`,
          bchBalance: 7.68905269,
          tokenBalance: 100000
        }
        //

        const result = await lib.compareLastTransaction(obj)
        // console.log(`result: ${util.inspect(result)}`)

        // Should return the last transactions, as well as the new balance of BCH
        // and the token.
        assert.hasAllKeys(result, [
          'lastTransaction',
          'bchBalance'
          // 'tokenBalance'
        ])
      })
      */
    })
    describe('#getPrice()', () => {
      it('should get the current price from coinbase api', async () => {
        try {
          sandbox
            .stub(lib, 'got')
            .resolves(libMockData.exchangeRatesResponse)

          sandbox
            .stub(lib.bch, 'getBCHBalance')
            .resolves(12.44768481)

          const result = await lib.getPrice()
          assert.isString(result)
        } catch (error) {
          assert.fail('Unexpected result')
        }
      })
      it('should get the current price from the local state if an error is thrown', async () => {
        try {
          sandbox
            .stub(lib, 'got')
            .throws(new Error('test error'))

          const result = await lib.getPrice()
          assert.isString(result)
        } catch (error) {
          assert.fail('Unexpected result')
        }
      })
      it('should handle error ', async () => {
        try {
          sandbox
            .stub(lib, 'got')
            .throws(new Error('Coinbase exchange rate could not be retrieved!'))
          sandbox
            .stub(lib.tlUtil, 'readState')
            .throws(new Error('Cant get the current price from the local state'))

          await lib.getPrice()
          assert.fail('Unexpected result')
        } catch (error) {
          assert.include(error.message, 'Cant get the current price from the local state')
        }
      })
    })
    describe('#getBlockchainBalances()', () => {
      it('should get the current blockchain balances', async () => {
        try {
          sandbox
            .stub(lib.bch, 'getBCHBalance')
            .resolves(12.44768481)
          sandbox
            .stub(lib.slp, 'getTokenBalance')
            .resolves(12.44768481)

          const result = await lib.getBlockchainBalances()
          assert.property(result, 'bchBalance')
          assert.property(result, 'tokenBalance')
          assert.isNumber(result.bchBalance)
          assert.isNumber(result.tokenBalance)
        } catch (error) {
          assert.fail('Unexpected result')
        }
      })
      it('should handle error if an error is thrown getting bch balance', async () => {
        try {
          sandbox
            .stub(lib.bch, 'getBCHBalance')
            .throws(new Error('test error'))

          await lib.getBlockchainBalances()
          assert.fail('Unexpected result')
        } catch (error) {
          assert.include(error.message, 'test error')
        }
      })
      it('should handle error if an error is thrown getting slp balance', async () => {
        try {
          sandbox
            .stub(lib.bch, 'getBCHBalance')
            .resolves(12.44768481)
          sandbox
            .stub(lib.slp, 'getTokenBalance')
            .throws(new Error('test error'))

          await lib.getBlockchainBalances()
          assert.fail('Unexpected result')
        } catch (error) {
          assert.include(error.message, 'test error')
        }
      })
    })
    describe('#getSpotPrice()', () => {
      it('should get the spot price', async () => {
        try {
          const bchBalance = 12.44768481
          const usdPerBCH = 1

          const result = await lib.getSpotPrice(bchBalance, usdPerBCH)

          assert.isNumber(result)
        } catch (error) {
          assert.fail('Unexpected result')
        }
      })
      it('should throw error if bchBalance is not provided', async () => {
        try {
          await lib.getSpotPrice()

          assert.fail('Unexpected result')
        } catch (error) {
          assert.include(error.message, 'bchBalance is required')
        }
      })
      it('should throw error if usdPerBCH is not provided', async () => {
        try {
          const bchBalance = 12.44768481

          await lib.getSpotPrice(bchBalance)

          assert.fail('Unexpected result')
        } catch (error) {
          assert.include(error.message, 'usdPerBCH is required')
        }
      })
      it('should handle error', async () => {
        try {
          const bchBalance = 12.44768481
          const usdPerBCH = 1
          sandbox
            .stub(lib.tlUtil, 'round8')
            .throws(new Error('test error'))

          await lib.getSpotPrice(bchBalance, usdPerBCH)

          assert.fail('Unexpected result')
        } catch (error) {
          assert.include(error.message, 'test error')
        }
      })
    })
    describe('#getEffectiveTokenBalance()', () => {
      it('should get token balance', async () => {
        try {
          const bchBalance = 12.44768481

          const result = await lib.getEffectiveTokenBalance(bchBalance)

          assert.isNumber(result)
        } catch (error) {
          assert.fail('Unexpected result')
        }
      })
      it('should throw error if bchBalance is not provided', async () => {
        try {
          await lib.getEffectiveTokenBalance()

          assert.fail('Unexpected result')
        } catch (error) {
          assert.include(error.message, 'bchBalance is required')
        }
      })

      it('should handle error', async () => {
        try {
          const bchBalance = 12.44768481
          sandbox
            .stub(lib.tlUtil, 'round8')
            .throws(new Error('test error'))

          await lib.getEffectiveTokenBalance(bchBalance)

          assert.fail('Unexpected result')
        } catch (error) {
          assert.include(error.message, 'test error')
        }
      })
    })
  }
})
