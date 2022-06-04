import {
  Transfer as TransferEvent
} from "../generated/TokenSetETF/TokenSetETF"

import {
  Holder,
  RedeemEvent,
  MintEvent,
} from "../generated/schema"

import { getUsdPrice } from "./prices";
import { ZERO_ADDRESS } from "./prices/common/constants";
import {
  getOrCreateEtf,
  getTokenBalance,
  getOrCreateHolder
} from "./utils";

export function handleTransfer(event: TransferEvent): void {
  const to = event.params.to
  const from = event.params.from
  const etfAddress = event.address
  const etf = getOrCreateEtf(etfAddress)
  const sender = event.transaction.from
  let id = event.transaction.hash.toHexString()


  if(to !== ZERO_ADDRESS && from !== ZERO_ADDRESS) {
    // on normal transfer just track total holder account + balance
    const holder1 = getOrCreateHolder(to, etfAddress)
    holder1.amount = holder1.amount.plus(event.params.value)
    const holder2 = getOrCreateHolder(from, etfAddress)
    holder2.amount = holder2.amount.minus(event.params.value)
    holder1.save()
    holder2.save()
    return;
  }
  
  // track mint/burn events and update global data
  
  const holder = getOrCreateHolder(etfAddress, sender)

  let entity: RedeemEvent | MintEvent | null = RedeemEvent.load(id)

  if(to === ZERO_ADDRESS) {
    // burn
    entity = new RedeemEvent(id)
    etf.totalSupply = etf.totalSupply.minus(event.params.value)
  } else {
    // mint
    entity = new MintEvent(id)
    etf.totalSupply = etf.totalSupply.plus(event.params.value)
  }
  
  entity.holder = event.transaction.from.toHexString()
  entity.amount = event.params.value
  entity.block = event.block.number
  entity.time = event.block.timestamp

  entity.save()
  etf.save()
}

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
