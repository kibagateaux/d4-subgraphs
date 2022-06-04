import {
  Approval as ApprovalEvent,
  ComponentAdded as ComponentAddedEvent,
  ComponentRemoved as ComponentRemovedEvent,
  DefaultPositionUnitEdited as DefaultPositionUnitEditedEvent,
  ExternalPositionDataEdited as ExternalPositionDataEditedEvent,
  ExternalPositionUnitEdited as ExternalPositionUnitEditedEvent,
  Invoked as InvokedEvent,
  ManagerEdited as ManagerEditedEvent,
  ModuleAdded as ModuleAddedEvent,
  ModuleInitialized as ModuleInitializedEvent,
  ModuleRemoved as ModuleRemovedEvent,
  PendingModuleRemoved as PendingModuleRemovedEvent,
  PositionModuleAdded as PositionModuleAddedEvent,
  PositionModuleRemoved as PositionModuleRemovedEvent,
  PositionMultiplierEdited as PositionMultiplierEditedEvent,
  Transfer as TransferEvent
} from "../generated/TokenSetETF/TokenSetETF"

import {
  Approval,
  ComponentAdded,
  ComponentRemoved,
  DefaultPositionUnitEdited,
  ExternalPositionDataEdited,
  ExternalPositionUnitEdited,
  Invoked,
  ManagerEdited,
  ModuleAdded,
  ModuleInitialized,
  ModuleRemoved,
  PendingModuleRemoved,
  PositionModuleAdded,
  PositionModuleRemoved,
  PositionMultiplierEdited,
  Transfer,
  RedeemEvent,
  MintEvent,
} from "../generated/schema"

import { getUsdPrice } from "./prices";
import { ZERO_ADDRESS } from "./prices/common/constants";


export function handleTransfer(event: TransferEvent): void {
  const to = event.params.to
  const from = event.params.from
  const sender = event.transaction.from
  let id = event.transaction.hash.toHexString()

  if(
    to === ZERO_ADDRESS && from === sender ||
    from === ZERO_ADDRESS && to === sender
  ) {
    // only track mint/burn events, tx sender mut be etf holder
    return;
  }

  const etf = getOrCreateEtf(event.address)
  const holder = getOrCreateHolder(event.transaction.from)

  let entity  = Transfer.load(id)

  if(to === ZERO_ADDRESS) {
    // burn
    entity = new RedeemEvent(id)
    etf.totalSupply = etf.totalSupply.sub(event.params.value)
  } else {
    // mint
    entity = new MintEvent(id)
    etf.totalSupply = etf.totalSupply.add(event.params.value)
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
