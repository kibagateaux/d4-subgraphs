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
  Transfer
} from "../generated/schema"

import { getUsdPrice } from "../Oracle";

export function handleApproval(event: ApprovalEvent): void {
  let entity = new Approval(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity.owner = event.params.owner
  entity.spender = event.params.spender
  entity.value = event.params.value
  entity.save()
}

export function handleComponentAdded(event: ComponentAddedEvent): void {
  let entity = new ComponentAdded(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity._component = event.params._component
  entity.save()
}

export function handleComponentRemoved(event: ComponentRemovedEvent): void {
  let entity = new ComponentRemoved(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity._component = event.params._component
  entity.save()
}

export function handleDefaultPositionUnitEdited(
  event: DefaultPositionUnitEditedEvent
): void {
  let entity = new DefaultPositionUnitEdited(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity._component = event.params._component
  entity._realUnit = event.params._realUnit
  entity.save()
}

export function handleExternalPositionDataEdited(
  event: ExternalPositionDataEditedEvent
): void {
  let entity = new ExternalPositionDataEdited(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity._component = event.params._component
  entity._positionModule = event.params._positionModule
  entity._data = event.params._data
  entity.save()
}

export function handleExternalPositionUnitEdited(
  event: ExternalPositionUnitEditedEvent
): void {
  let entity = new ExternalPositionUnitEdited(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity._component = event.params._component
  entity._positionModule = event.params._positionModule
  entity._realUnit = event.params._realUnit
  entity.save()
}

export function handleInvoked(event: InvokedEvent): void {
  let entity = new Invoked(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity._target = event.params._target
  entity._value = event.params._value
  entity._data = event.params._data
  entity._returnValue = event.params._returnValue
  entity.save()
}

export function handleManagerEdited(event: ManagerEditedEvent): void {
  let entity = new ManagerEdited(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity._newManager = event.params._newManager
  entity._oldManager = event.params._oldManager
  entity.save()
}

export function handleModuleAdded(event: ModuleAddedEvent): void {
  let entity = new ModuleAdded(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity._module = event.params._module
  entity.save()
}

export function handleModuleInitialized(event: ModuleInitializedEvent): void {
  let entity = new ModuleInitialized(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity._module = event.params._module
  entity.save()
}

export function handleModuleRemoved(event: ModuleRemovedEvent): void {
  let entity = new ModuleRemoved(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity._module = event.params._module
  entity.save()
}

export function handlePendingModuleRemoved(
  event: PendingModuleRemovedEvent
): void {
  let entity = new PendingModuleRemoved(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity._module = event.params._module
  entity.save()
}

export function handlePositionModuleAdded(
  event: PositionModuleAddedEvent
): void {
  let entity = new PositionModuleAdded(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity._component = event.params._component
  entity._positionModule = event.params._positionModule
  entity.save()
}

export function handlePositionModuleRemoved(
  event: PositionModuleRemovedEvent
): void {
  let entity = new PositionModuleRemoved(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity._component = event.params._component
  entity._positionModule = event.params._positionModule
  entity.save()
}

export function handlePositionMultiplierEdited(
  event: PositionMultiplierEditedEvent
): void {
  let entity = new PositionMultiplierEdited(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity._newMultiplier = event.params._newMultiplier
  entity.save()
}

export function handleTransfer(event: TransferEvent): void {
  let entity = new Transfer(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity.from = event.params.from
  entity.to = event.params.to
  entity.value = event.params.value
  entity.save()
}
