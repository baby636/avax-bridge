/*
  Liquidity app for Wormhole BCH tokens inspired by Bancors whitepaper
*/

'use strict'

// const lib = require('../src/lib/token-util.js')
const got = require('got')

const WH = require('../src/lib/wormhole')
const wh = new WH()

const SLP = require('../src/lib/slp')
const slp = new SLP()

const BCH = require('../src/lib/bch')
const bch = new BCH()

const Transactions = require('../src/lib/transactions')
const txs = new Transactions()

const TokenLiquidity = require('../src/lib/token-liquidity')
const lib = new TokenLiquidity()

const config = require('../config')
config.bchBalance = config.BCH_QTY_ORIGINAL
config.tokenBalance = config.TOKENS_QTY_ORIGINAL

// Winston logger
const wlogger = require('../src/utils/logging')

// Used for debugging.
const util = require('util')
util.inspect.defaultOptions = {
  showHidden: true,
  colors: true
}

const BITBOXCli = require('bitbox-sdk')
let BITBOX
if (config.NETWORK === `testnet`) {
  BITBOX = new BITBOXCli({ restURL: 'https://trest.bitcoin.com/v1/' })
} else {
  BITBOX = new BITBOXCli({ restURL: 'https://rest.bitcoin.com/v1/' })
}

const Wormhole = require('wormhole-sdk/lib/Wormhole').default
let wormhole
if (config.NETWORK === `testnet`) {
  wormhole = new Wormhole({ restURL: `https://trest.bitcoin.com/v1/` })
} else {
  wormhole = new Wormhole({ restURL: `https://rest.bitcoin.com/v1/` })
}

// const tknLib = require(`../src/utils/send-tokens.js`)
const bchLib = require(`../src/lib/send-bch.js`)

const BCH_ADDR1 = config.BCH_ADDR
const TOKEN_ID = config.TOKEN_ID

let bchBalance
let tokenBalance

async function startTokenLiquidity () {
  // Get BCH balance.
  const addressInfo = await bch.getBCHBalance(BCH_ADDR1, true)
  bchBalance = addressInfo.balance
  config.bchBalance = bchBalance
  wlogger.info(`BCH address ${BCH_ADDR1} has a balance of ${bchBalance} BCH`)

  // Get Wormhole token balance
  const tokenInfo = await wh.getTokenBalance(BCH_ADDR1)
  wlogger.info(`tokenInfo: ${JSON.stringify(tokenInfo, null, 2)}`)
  const thisToken = tokenInfo.find(token => token.propertyid === TOKEN_ID)
  tokenBalance = thisToken.balance
  config.tokenBalance = tokenBalance
  wlogger.info(`Token balance: ${tokenBalance}`)

  // Get SLP token balance
  const slpTokenInfo = await slp.getTokenBalance(BCH_ADDR1)
  wlogger.info(`SLP token: ${JSON.stringify(slpTokenInfo, null, 2)}`)

  // Get the BCH-USD exchange rate.
  let USDperBCH
  try {
    const rawRate = await got(`https://api.coinbase.com/v2/exchange-rates?currency=BCH`)
    const jsonRate = JSON.parse(rawRate.body)
    // console.log(`jsonRate: ${JSON.stringify(jsonRate, null, 2)}`);
    USDperBCH = jsonRate.data.rates.USD
    wlogger.info(`USD/BCH exchange rate: $${USDperBCH}`)

    config.usdPerBCH = USDperBCH
  } catch (err) {
    wlogger.error(`Coinbase exchange rate could not be retrieved!. Assuming hard coded value.`)
    wlogger.error(err)
    USDperBCH = 560
  }

  // Calculate exchange rate spot price.;
  const marketCap = USDperBCH * bchBalance
  console.log(`Market cap of BCH controlled by app: $${marketCap}`)
  const price = marketCap / tokenBalance
  console.log(`Token spot price: $${price}`)

  // Get the last transaction associated with this address.
  let lastTransaction = await txs.getLastConfirmedTransaction(BCH_ADDR1, BITBOX)

  // Periodically check the last transaction.
  setInterval(async function () {
    // console.log(`Checking transactions...`)
    const obj = {
      bchAddr: BCH_ADDR1,
      txid: lastTransaction,
      bchBalance: bchBalance,
      tokenBalance: tokenBalance
    }

    const retObj = await lib.compareLastTransaction(obj, bchLib, wormhole)
    const newTx = retObj.lastTransaction

    // Save the updated price information.
    await lib.saveState(config)

    // Update the last transaction.
    if (newTx) lastTransaction = newTx
    if (retObj.bchBalance) bchBalance = retObj.bchBalance
    if (retObj.tokenBalance) tokenBalance = retObj.tokenBalance

    const now = new Date()

    // New Balances:
    wlogger.info(`bchBalance: ${bchBalance}, tokenBalance: ${tokenBalance}, timestamp: ${now.toLocaleString()}`)

    config.bchBalance = bchBalance
    config.tokenBalance = tokenBalance
  }, 60000 * 2)
}

module.exports = {
  startTokenLiquidity
}
