/*
  Unit and integration tests for avax.js library.
*/

'use strict'

const assert = require('chai').assert
const sinon = require('sinon')
const cloneDeep = require('lodash.clonedeep')

const AVAX = require('../../src/lib/avax')

const avaxMockDataLib = require('./mocks/avax.mock')
// const mockWallet = require('./mocks/testwallet.json')

const config = require('../../config')

// If not specified, default to unit test.
if (!process.env.TL_ENV) process.env.TL_ENV = 'test'

describe('#avax-lib', () => {
  let sandbox
  let uut
  let avaxMockData

  before(() => {})

  beforeEach(() => {
    avaxMockData = cloneDeep(avaxMockDataLib)
    config.AVAX_TOKEN_ID = avaxMockData.fakeConfig.AVAX_TOKEN

    uut = new AVAX(avaxMockData.fakeConfig)
    // mockedWallet = Object.assign({}, testwallet) // Clone the testwallet
    sandbox = sinon.createSandbox()
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('#getTransactions', () => {
    it('should get Token balance in the given avalanche address', async () => {
      sandbox
        .stub(uut.axios, 'post')
        .resolves({ status: 200, data: avaxMockData.txHistory })

      const addr = 'X-avax150agl543yn0n5z9z20tgmrggs8fc2ckkma4qfv'

      const historicalTxs = await uut.getTransactions(addr)

      assert.isArray(historicalTxs)
    })

    it('should catch and throw errors if address is not string', async () => {
      try {
        const addr = ''

        await uut.getTransactions(addr)

        assert.fail('Unexpected result')
      } catch (err) {
        assert.include(err.message, 'is not valid')
      }
    })

    it('should catch and throw errors', async () => {
      try {
        // Force an error
        sandbox
          .stub(uut.axios, 'post')
          .resolves({ status: 400 })

        const addr = 'X-avax150agl543yn0n5z9z20tgmrggs8fc2ckkma4qfv'

        await uut.getTransactions(addr)

        assert.fail('Unexpected result')
      } catch (err) {
        assert.include(err.message, 'No transaction history ')
      }
    })
  })

  describe('#getTokenBalance', () => {
    it('should get token balance in the address', async () => {
      sandbox
        .stub(uut.xchain, 'getBalance')
        .resolves({ balance: '2000' })

      const addr = 'X-avax150agl543yn0n5z9z20tgmrggs8fc2ckkma4qfv'

      const balance = await uut.getTokenBalance(addr)

      assert.equal(balance, 2000)
    })

    it('should get token balance in the address with decimals', async () => {
      sandbox
        .stub(uut.xchain, 'getBalance')
        .resolves({ balance: '2000' })
      sandbox
        .stub(uut.xchain, 'getAssetDescription')
        .resolves(avaxMockData.assetDescription)

      const addr = 'X-avax150agl543yn0n5z9z20tgmrggs8fc2ckkma4qfv'

      const balance = await uut.getTokenBalance(addr, true)

      assert.equal(balance, 20.00)
    })

    it('should throw and catch an error', async () => {
      try {
        sandbox
          .stub(uut.xchain, 'getBalance')
          .rejects(new Error('test error'))

        const addr = 'X-avax150agl543yn0n5z9z20tgmrggs8fc2ckkma4qfv'
        await uut.getTokenBalance(addr, false)
        assert.fail('unexpected result')
      } catch (err) {
        assert.include(err.message, 'test error')
      }
    })
  })

  describe('#justTxs', () => {
    it('should return an array with only the txids', () => {
      const txHistory = avaxMockData.txHistory.data.transactions.results
      const txids = uut.justTxs(txHistory)

      assert.isArray(txids)
      assert(txids.length > 0)
      assert.isString(txids[0])
    })
  })

  describe('#filterNewTx', () => {
    it('should return only the new txs', () => {
      const txHistory = avaxMockData.txHistory.data.transactions.results
      const newTx = avaxMockData.knownTxids.slice(-1)
      const txs = uut.filterNewTx(newTx, txHistory)

      assert.isArray(txs)
      assert.hasAllKeys(txs[0], ['id', 'memo', 'inputs', 'outputs'])
    })
  })

  describe('#getUserAddress', () => {
    it('should return the senders address', () => {
      const address = uut.getUserAddress(avaxMockData.formatedTx)
      assert.typeOf(address, 'string')
    })
  })

  describe('#getAssetDescription', () => {
    it('should return the senders address', async () => {
      sandbox
        .stub(uut.xchain, 'getAssetDescription')
        .resolves(avaxMockData.assetDescription)
      const desc = await uut.getAssetDescription()
      assert.property(desc, 'denomination')
      assert.typeOf(desc.denomination, 'number')
    })
  })

  describe('#parseMemoFrom64', () => {
    it('should throw an error if there encodedMemo argument is not a string', async () => {
      try {
        await uut.parseMemoFrom64(42)
        assert.fail('unexpected result')
      } catch (err) {
        assert.include(err.message, 'must be of type string')
      }
    })

    it('should return the pased memo field', async () => {
      try {
        const memo = uut.parseMemoFrom64('U29tZSBtZW1vIHRvIGNoZWNrIGFmdGVy')
        assert.typeOf(memo, 'string')
      } catch (err) {
        assert.fail('unexpected result')
      }
    })
  })

  describe('#readMemoField', () => {
    it('should throw an error if there encodedMemo argument is not a string', async () => {
      try {
        await uut.readMemoField(42)
        assert.fail('unexpected result')
      } catch (err) {
        assert.include(err.message, 'must be of type string')
      }
    })

    it('should return an invalid object', async () => {
      try {
        const obj = uut.readMemoField(avaxMockData.invalidMemo)
        assert.equal(obj.isValid, false)
      } catch (err) {
        assert.fail('unexpected result')
      }
    })

    it('should return a valid object', async () => {
      try {
        const obj = uut.readMemoField(avaxMockData.base64Memo)
        assert.equal(obj.isValid, true)
        assert.property(obj, 'code')
        assert.property(obj, 'bchaddr')
      } catch (err) {
        assert.fail('unexpected result')
      }
    })
  })

  describe('#sendTokens', () => {
    it('should throw an error if AVAX_PRIVATE_KEY doesnt create an address', async () => {
      try {
        sandbox.stub(uut.xchain, 'getAVAXAssetID').resolves(avaxMockData.avaxID)
        sandbox.stub(uut.xchain.keyChain(), 'getAddresses').returns([])
        sandbox.stub(uut.xchain.keyChain(), 'getAddressStrings').returns([])
        const num = 10

        await uut.sendTokens(avaxMockData.senderAddress, num)
        assert.fail('unexpected result')
      } catch (err) {
        assert.include(err.message, 'No available addresses')
      }
    })

    it('should throw an error if there are no UTXOS', async () => {
      try {
        sandbox.stub(uut.xchain, 'getAVAXAssetID').resolves(avaxMockData.avaxID)
        sandbox
          .stub(uut.xchain.keyChain(), 'getAddresses')
          .returns(avaxMockData.addresses)
        sandbox
          .stub(uut.xchain.keyChain(), 'getAddressStrings')
          .returns([avaxMockData.fakeConfig.AVAX_ADDR])
        sandbox
          .stub(uut.xchain, 'getUTXOs')
          .resolves({ utxos: avaxMockData.emptyUTXOSet })

        const num = 10

        await uut.sendTokens(avaxMockData.senderAddress, num)
        assert.fail('unexpected result')
      } catch (err) {
        assert.include(err.message, 'no UTXOs')
      }
    })

    it('should throw an error if the wallet doesnt have enought founds', async () => {
      try {
        sandbox.stub(uut.xchain, 'getAVAXAssetID').resolves(avaxMockData.avaxID)
        sandbox
          .stub(uut.xchain.keyChain(), 'getAddresses')
          .returns(avaxMockData.addresses)
        sandbox
          .stub(uut.xchain.keyChain(), 'getAddressStrings')
          .returns([avaxMockData.fakeConfig.AVAX_ADDR])
        sandbox
          .stub(uut.xchain, 'getUTXOs')
          .resolves({ utxos: avaxMockData.UTXOWithoutFee })

        const num = 10

        await uut.sendTokens(avaxMockData.senderAddress, num)
        assert.fail('unexpected result')
      } catch (err) {
        assert.include(err.message, 'enough founds')
      }
    })

    it('should throw an error if the token amount in the wallet is already 0', async () => {
      try {
        sandbox.stub(uut.xchain, 'getAVAXAssetID').resolves(avaxMockData.avaxID)
        sandbox
          .stub(uut.xchain.keyChain(), 'getAddresses')
          .returns(avaxMockData.addresses)
        sandbox
          .stub(uut.xchain.keyChain(), 'getAddressStrings')
          .returns([avaxMockData.fakeConfig.AVAX_ADDR])
        sandbox
          .stub(uut.xchain, 'getUTXOs')
          .resolves({ utxos: avaxMockData.UTXOWithoutToken })

        const num = 10

        await uut.sendTokens(avaxMockData.senderAddress, num)
        assert.fail('unexpected result')
      } catch (err) {
        assert.include(err.message, 'Token quantity is not enough')
      }
    })

    it('should complete successfully', async () => {
      try {
        sandbox.stub(uut.xchain, 'getAVAXAssetID').resolves(avaxMockData.avaxID)
        sandbox
          .stub(uut.xchain.keyChain(), 'getAddresses')
          .returns(avaxMockData.addresses)
        sandbox
          .stub(uut.xchain.keyChain(), 'getAddressStrings')
          .returns([avaxMockData.fakeConfig.AVAX_ADDR])
        sandbox
          .stub(uut.xchain, 'getUTXOs')
          .resolves({ utxos: avaxMockData.UTXOWithToken })
        sandbox.stub(uut.xchain, 'issueTx').resolves(avaxMockData.knownTxids[0])

        const num = 5

        const txid = await uut.sendTokens(avaxMockData.senderAddress, num)
        assert.typeOf(txid, 'string')
      } catch (err) {
        console.log(err)
        assert.fail('unexpected result')
      }
    })

    it('should complete successfully with no remainder', async () => {
      try {
        sandbox.stub(uut.xchain, 'getAVAXAssetID').resolves(avaxMockData.avaxID)
        sandbox
          .stub(uut.xchain.keyChain(), 'getAddresses')
          .returns(avaxMockData.addresses)
        sandbox
          .stub(uut.xchain.keyChain(), 'getAddressStrings')
          .returns([avaxMockData.fakeConfig.AVAX_ADDR])
        sandbox
          .stub(uut.xchain, 'getUTXOs')
          .resolves({ utxos: avaxMockData.UTXOWithToken })
        sandbox.stub(uut.xchain, 'issueTx').resolves(avaxMockData.knownTxids[0])

        const num = 50

        const txid = await uut.sendTokens(avaxMockData.senderAddress, num)
        assert.typeOf(txid, 'string')
      } catch (err) {
        console.log(err)
        assert.fail('unexpected result')
      }
    })
  })
})
