import {
  Transfer,
} from "../generated/Web3DataIndex/TokenSetETF"

import {
  Holder,
  RedeemEvent,
  MintEvent,
  TransferEvent,
  Pool
} from "../generated/schema"

import { getUsdPrice } from "./prices";
import { ZERO_ADDRESS } from "./prices/common/constants";
import {
  getOrCreateEtf,
  getTokenBalance,
  getOrCreateHolder,
  getMarketcap,
  getEventId,
} from "./utils";

import { log } from "@graphprotocol/graph-ts";

export function handleTransfer(event: Transfer): void {
  const id = event.transaction.hash.toHexString(),
        to = event.params.to,
        from = event.params.from,
        etfAddress = event.address,
        etf = getOrCreateEtf(etfAddress),
        eventId = getEventId(event)
        // pool1 = Pool.load(etf.id),
        // pool2 = Pool.load(from.toHexString())

  // log.warning(
  //   "transfer to {}, from {} ", [
  //   to.toHexString(), from.toHexString()
  // ])
  
  // if can't load etf then can't process transfer
  if(etf === null) return;

  // if transfer is to a dex then tracked in Swap, not Transfer. 
  // TODO: if(event.receipt.logs.includes(SwapEvent)) return;
  // if(pool1 !== null || pool2 !== null) return; 

  if(from == ZERO_ADDRESS) {
    // mint
    const holdr = getOrCreateHolder(to, etfAddress)
    let mint = new MintEvent(eventId)
    mint.etf = etf.id
    mint.holder =  holdr.id
    mint.amount = event.params.value
    mint.block = event.block.number
    mint.time = event.block.timestamp
  

    log.warning("mint time {}", [mint.time.toString()])
    etf.totalSupply = etf.totalSupply.plus(event.params.value)

    mint.save()
  } else if (to == ZERO_ADDRESS) {
    // redeem
    const holdr = getOrCreateHolder(from, etfAddress)
    let redeem = new RedeemEvent(eventId)
    redeem.etf = etf.id
    redeem.holder =  holdr.id
    redeem.amount = event.params.value
    redeem.block = event.block.number
    redeem.time = event.block.timestamp

    log.warning("redeem time {}", [redeem.time.toString()])
  
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
    transfer.etf = etf.id
    transfer.from = `${from.toHexString()}-${etfAddress}`
    transfer.to = `${to.toHexString()}-${etfAddress}`
    transfer.amount = event.params.value
    transfer.block = event.block.number
    transfer.time = event.block.timestamp

    log.warning("etf normal transfer {}", [event.params.value.toString()])
    transfer.save()
  }

  etf.marketCap = getMarketcap(etfAddress)
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
