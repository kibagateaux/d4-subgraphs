import {
  Transfer,
} from "../generated/Web3DataIndex/TokenSetETF"

import {
  Holder,
  RedeemEvent,
  MintEvent,
  TransferEvent,
  LiquidityPool
} from "../generated/schema"

import {
  BIGDECIMAL_1E18,
  ZERO_ADDRESS,
  ZERO_ADDRESS_STRING
} from "./prices/common/constants"

import {
  getOrCreateEtf,
  getTokenBalance,
  getOrCreateHolder,
  getEtfMarketcap,
  getEventId,
  exponentToBigDecimal,
} from "./utils";

import { log } from "@graphprotocol/graph-ts"

export function handleTransfer(event: Transfer): void {
  const id = event.transaction.hash.toHexString(),
        to = event.params.to,
        from = event.params.from,
        etfAddress = event.address,
        etf = getOrCreateEtf(etfAddress),
        eventId = getEventId(event)
        // pool1 = LiquidityPool.load(etf.id),
        // pool2 = LiquidityPool.load(from.toHexString())

  // log.warning(
  //   "transfer to {}, from {} ", [
  //   to.toHexString(), from.toHexString()
  // ])
  
  // if can't load etf then can't process transfer
  if(!etf) return;

  // if transfer is to a dex then tracked in Swap, not Transfer. 
  // TODO: if(event.receipt.logs.includes(SwapEvent)) return;
  // if(pool1 !== null || pool2 !== null) return; 

  if(from == ZERO_ADDRESS) {
    // mint
    const holdr = getOrCreateHolder(to, etfAddress)
    let mint = new MintEvent(eventId)
    mint.hash = id
    mint.etf = etf.id
    mint.amount = event.params.value
    mint.logIndex = event.logIndex.toI32()
    mint.timestamp = event.block.timestamp
    mint.blockNumber = event.block.number
    mint.from = ZERO_ADDRESS_STRING
    mint.to =  holdr.id
  

    // log.warning("mint time {}", [mint.timestamp.toString()])
    etf.totalSupply = etf.totalSupply.plus(event.params.value)

    mint.save()
  } else if (to == ZERO_ADDRESS) {
    // redeem
    const holdr = getOrCreateHolder(from, etfAddress)
    let redeem = new RedeemEvent(eventId)
    redeem.hash = id
    redeem.etf = etf.id
    redeem.amount = event.params.value
    redeem.logIndex = event.logIndex.toI32()
    redeem.timestamp = event.block.timestamp
    redeem.blockNumber = event.block.number
    redeem.from =  holdr.id
    redeem.to = ZERO_ADDRESS_STRING

    // log.warning("redeem time {}", [redeem.timestamp.toString()])
  
    redeem.save()
    etf.totalSupply = etf.totalSupply.minus(event.params.value)
  } else {
    // on normal transfer just track total holder account + balance
    const receiver = getOrCreateHolder(to, etfAddress)
    receiver.amount = receiver.amount.plus(event.params.value)
    const sender = getOrCreateHolder(from, etfAddress)
    sender.amount = sender.amount.minus(event.params.value)
    receiver.save()
    sender.save()

    const transfer = new TransferEvent(eventId)
    transfer.hash = id
    transfer.etf = etf.id
    transfer.amount = event.params.value
    transfer.logIndex = event.logIndex.toI32()
    transfer.blockNumber = event.block.number
    transfer.timestamp = event.block.timestamp
    transfer.from = sender.id
    transfer.to = receiver.id

    // log.warning("etf normal transfer {}", [event.params.value.toString()])
    transfer.save()
  }

  etf.marketCap = getEtfMarketcap(etf)
  etf.lastPriceUSD = etf.marketCap.div(
    (etf.totalSupply.toBigDecimal()).div(exponentToBigDecimal(etf.decimals))
  )
  etf.lastPriceBlockNumber = event.block.number

  etf.save()
}



// funcs maybe use later


// export function handleComponentAdded(event: ComponentAddedEvent): void {
//   let entity = new ComponentAdded(
//     event.transaction.hash.toHex() + "-" + event.logIndex.toString()
//   )
//   entity._component = event.params._component
//   entity.save()
// }

// export function handleComponentRemoved(event: ComponentRemovedEvent): void {
//   let entity = new ComponentRemoved(
//     event.transaction.hash.toHex() + "-" + event.logIndex.toString()
//   )
//   entity._component = event.params._component
//   entity.save()
// }

// export function handleDefaultPositionUnitEdited(
//   event: DefaultPositionUnitEditedEvent
// ): void {
//   let entity = new DefaultPositionUnitEdited(
//     event.transaction.hash.toHex() + "-" + event.logIndex.toString()
//   )
//   entity._component = event.params._component
//   entity._realUnit = event.params._realUnit
//   entity.save()
// }

// export function handleManagerEdited(event: ManagerEditedEvent): void {
//   let entity = new ManagerEdited(
//     event.transaction.hash.toHex() + "-" + event.logIndex.toString()
//   )
//   entity._newManager = event.params._newManager
//   entity._oldManager = event.params._oldManager
  
//   entity.save()
// }
