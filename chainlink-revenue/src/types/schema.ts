// THIS IS AN AUTOGENERATED FILE. DO NOT EDIT THIS FILE DIRECTLY.

import {
  TypedMap,
  Entity,
  Value,
  ValueKind,
  store,
  Bytes,
  BigInt,
  BigDecimal
} from "@graphprotocol/graph-ts";

export class Feed extends Entity {
  constructor(id: string) {
    super();
    this.set("id", Value.fromString(id));
  }

  save(): void {
    let id = this.get("id");
    assert(id != null, "Cannot save Feed entity without an ID");
    if (id) {
      assert(
        id.kind == ValueKind.STRING,
        `Entities of type Feed must have an ID of type String but the id '${id.displayData()}' is of type ${id.displayKind()}`
      );
      store.set("Feed", id.toString(), this);
    }
  }

  static load(id: string): Feed | null {
    return changetype<Feed | null>(store.get("Feed", id));
  }

  get id(): string {
    let value = this.get("id");
    return value!.toString();
  }

  set id(value: string) {
    this.set("id", Value.fromString(value));
  }

  get nodes(): Array<string> {
    let value = this.get("nodes");
    return value!.toStringArray();
  }

  set nodes(value: Array<string>) {
    this.set("nodes", Value.fromStringArray(value));
  }

  get payments(): Array<string> | null {
    let value = this.get("payments");
    if (!value || value.kind == ValueKind.NULL) {
      return null;
    } else {
      return value.toStringArray();
    }
  }

  set payments(value: Array<string> | null) {
    if (!value) {
      this.unset("payments");
    } else {
      this.set("payments", Value.fromStringArray(<Array<string>>value));
    }
  }

  get startBlock(): BigInt {
    let value = this.get("startBlock");
    return value!.toBigInt();
  }

  set startBlock(value: BigInt) {
    this.set("startBlock", Value.fromBigInt(value));
  }

  get service(): string {
    let value = this.get("service");
    return value!.toString();
  }

  set service(value: string) {
    this.set("service", Value.fromString(value));
  }
}

export class Node extends Entity {
  constructor(id: string) {
    super();
    this.set("id", Value.fromString(id));
  }

  save(): void {
    let id = this.get("id");
    assert(id != null, "Cannot save Node entity without an ID");
    if (id) {
      assert(
        id.kind == ValueKind.STRING,
        `Entities of type Node must have an ID of type String but the id '${id.displayData()}' is of type ${id.displayKind()}`
      );
      store.set("Node", id.toString(), this);
    }
  }

  static load(id: string): Node | null {
    return changetype<Node | null>(store.get("Node", id));
  }

  get id(): string {
    let value = this.get("id");
    return value!.toString();
  }

  set id(value: string) {
    this.set("id", Value.fromString(value));
  }

  get payments(): Array<string> | null {
    let value = this.get("payments");
    if (!value || value.kind == ValueKind.NULL) {
      return null;
    } else {
      return value.toStringArray();
    }
  }

  set payments(value: Array<string> | null) {
    if (!value) {
      this.unset("payments");
    } else {
      this.set("payments", Value.fromStringArray(<Array<string>>value));
    }
  }
}

export class Payment extends Entity {
  constructor(id: string) {
    super();
    this.set("id", Value.fromString(id));
  }

  save(): void {
    let id = this.get("id");
    assert(id != null, "Cannot save Payment entity without an ID");
    if (id) {
      assert(
        id.kind == ValueKind.STRING,
        `Entities of type Payment must have an ID of type String but the id '${id.displayData()}' is of type ${id.displayKind()}`
      );
      store.set("Payment", id.toString(), this);
    }
  }

  static load(id: string): Payment | null {
    return changetype<Payment | null>(store.get("Payment", id));
  }

  get id(): string {
    let value = this.get("id");
    return value!.toString();
  }

  set id(value: string) {
    this.set("id", Value.fromString(value));
  }

  get amount(): BigInt {
    let value = this.get("amount");
    return value!.toBigInt();
  }

  set amount(value: BigInt) {
    this.set("amount", Value.fromBigInt(value));
  }

  get usd(): BigDecimal {
    let value = this.get("usd");
    return value!.toBigDecimal();
  }

  set usd(value: BigDecimal) {
    this.set("usd", Value.fromBigDecimal(value));
  }

  get timestamp(): BigInt {
    let value = this.get("timestamp");
    return value!.toBigInt();
  }

  set timestamp(value: BigInt) {
    this.set("timestamp", Value.fromBigInt(value));
  }

  get block(): BigInt {
    let value = this.get("block");
    return value!.toBigInt();
  }

  set block(value: BigInt) {
    this.set("block", Value.fromBigInt(value));
  }

  get to(): string {
    let value = this.get("to");
    return value!.toString();
  }

  set to(value: string) {
    this.set("to", Value.fromString(value));
  }

  get feed(): string {
    let value = this.get("feed");
    return value!.toString();
  }

  set feed(value: string) {
    this.set("feed", Value.fromString(value));
  }
}

export class GlobalSummary extends Entity {
  constructor(id: string) {
    super();
    this.set("id", Value.fromString(id));
  }

  save(): void {
    let id = this.get("id");
    assert(id != null, "Cannot save GlobalSummary entity without an ID");
    if (id) {
      assert(
        id.kind == ValueKind.STRING,
        `Entities of type GlobalSummary must have an ID of type String but the id '${id.displayData()}' is of type ${id.displayKind()}`
      );
      store.set("GlobalSummary", id.toString(), this);
    }
  }

  static load(id: string): GlobalSummary | null {
    return changetype<GlobalSummary | null>(store.get("GlobalSummary", id));
  }

  get id(): string {
    let value = this.get("id");
    return value!.toString();
  }

  set id(value: string) {
    this.set("id", Value.fromString(value));
  }

  get totalTokensPaid(): BigInt {
    let value = this.get("totalTokensPaid");
    return value!.toBigInt();
  }

  set totalTokensPaid(value: BigInt) {
    this.set("totalTokensPaid", Value.fromBigInt(value));
  }

  get totalUsdPaid(): BigDecimal {
    let value = this.get("totalUsdPaid");
    return value!.toBigDecimal();
  }

  set totalUsdPaid(value: BigDecimal) {
    this.set("totalUsdPaid", Value.fromBigDecimal(value));
  }
}
