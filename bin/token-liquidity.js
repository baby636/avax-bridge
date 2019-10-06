/*
  Liquidity app for SLP BCH tokens inspired by Bancors whitepaper
*/

'use strict'

// const lib = require('../src/lib/token-util.js')
const got = require('got')

const SLP = require('../src/lib/slp')
const slp = new SLP()

const BCH = require('../src/lib/bch')
const bch = new BCH()

// App utility functions library.
const TLUtils = require('../src/lib/util')
const tlUtil = new TLUtils()

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

const BCH_ADDR1 = config.BCH_ADDR
// const TOKEN_ID = config.TOKEN_ID

let bchBalance
let tokenBalance

async function startTokenLiquidity () {
  // Get BCH balance.
  const addressInfo = await bch.getBCHBalance(config.BCH_ADDR, false)
  bchBalance = addressInfo.balance
  config.bchBalance = bchBalance
  wlogger.info(
    `BCH address ${config.BCH_ADDR} has a balance of ${bchBalance} BCH`
  )

  // console.log(`addressInfo: ${JSON.stringify(addressInfo, null, 2)}`)

  // Get all the TXIDs associated with this apps address. The app assumes all
  // these TXs have been processed.
  let seenTxs = addressInfo.txids
  // console.log(`seenTxs: ${JSON.stringify(seenTxs, null, 2)}`)

  // Get SLP token balance
  tokenBalance = await slp.getTokenBalance(config.SLP_ADDR)
  wlogger.info(
    `SLP token address ${config.SLP_ADDR} has a balance of: ${tokenBalance}`
  )
  config.tokenBalance = tokenBalance

  // Get the BCH-USD exchange rate.
  let USDperBCH
  try {
    const rawRate = await got(
      `https://api.coinbase.com/v2/exchange-rates?currency=BCH`
    )
    const jsonRate = JSON.parse(rawRate.body)
    // console.log(`jsonRate: ${JSON.stringify(jsonRate, null, 2)}`);
    USDperBCH = jsonRate.data.rates.USD
    wlogger.info(`USD/BCH exchange rate: $${USDperBCH}`)

    config.usdPerBCH = USDperBCH
  } catch (err) {
    wlogger.error(
      `Coinbase exchange rate could not be retrieved!. Assuming hard coded value.`
    )
    wlogger.error(err)
    USDperBCH = 300
  }

  // Calculate exchange rate spot price.;
  const marketCap = USDperBCH * bchBalance
  console.log(`Market cap of BCH controlled by app: $${marketCap}`)
  const price = lib.getSpotPrice(bchBalance, USDperBCH)
  console.log(`Token spot price: $${price}`)

  setInterval(async function () {
    const now = new Date()
    let outStr = `${now.toLocaleString()}: Checking transactions... `

    const obj = {
      seenTxs
    }

    const newTxids = await lib.detectNewTxs(obj)
    // console.log(`retObj: ${JSON.stringify(retObj, null, 2)}`)

    // If there are no new transactions, exit.
    if (newTxids.length === 0) {
      // Retrieve the balances from the blockchain.
      const retObj2 = await lib.getBlockchainBalances(config.BCH_ADDR)
      console.log(`retObj2: ${JSON.stringify(retObj2, null, 2)}`)

      // Update the app balances.
      bchBalance = retObj2.bchBalance
      tokenBalance = retObj2.tokenBalance

      outStr += `...nothing new. BCH: ${bchBalance}, SLP: ${tokenBalance}`
      console.log(`${outStr}`)

      return
    }

    // Add the new txids to the seenTxs array.
    newTxids.map(x => seenTxs.push(x.txid))

    outStr += `...${newTxids.length} new transactions found!`
    console.log(`${outStr}`)

    // process the new TX.
    for (let i = 0; i < newTxids.length; i++) {
      const obj = {
        txid: newTxids[i].txid,
        bchBalance,
        tokenBalance
      }

      const result = await lib.processTx(obj)
      console.log(`result: ${JSON.stringify(result, null, 2)}`)

      // Update the app balances.
      bchBalance = result.bchBalance
      tokenBalance = result.tokenBalance
      console.log(`BCH: ${bchBalance}, SLP: ${tokenBalance}`)
    }
  }, 60000 * 2)

  // Get the last transaction associated with this address.
  // let lastTransaction = await txs.getLastConfirmedTransaction(BCH_ADDR1)

  // // Periodically check the last transaction.
  // setInterval(async function () {
  //   try {
  //     // console.log(`Checking transactions...`)
  //     const obj = {
  //       bchAddr: BCH_ADDR1,
  //       txid: lastTransaction,
  //       bchBalance: bchBalance,
  //       tokenBalance: tokenBalance
  //     }
  //
  //     const retObj = await lib.compareLastTransaction(obj)
  //     const newTx = retObj.lastTransaction
  //
  //     // Save the updated price information.
  //     await tlUtil.saveState(config)
  //
  //     // Update the last transaction.
  //     if (newTx) lastTransaction = newTx
  //     if (retObj.bchBalance) bchBalance = retObj.bchBalance
  //     if (retObj.tokenBalance) tokenBalance = retObj.tokenBalance
  //
  //     const now = new Date()
  //
  //     // New Balances:
  //     wlogger.info(
  //       `bchBalance: ${bchBalance}, tokenBalance: ${tokenBalance}, timestamp: ${now.toLocaleString()}`
  //     )
  //
  //     config.bchBalance = bchBalance
  //     config.tokenBalance = tokenBalance
  //   } catch (err) {
  //     wlogger.error(`Error checking transactions in token-liquidity.js`, err)
  //   }
  // }, 60000 * 2)
}

module.exports = {
  startTokenLiquidity
}
