import {
  BigInt,
  ByteArray,
  BigDecimal,
  Address,
  crypto,
  log,
  Bytes,
 } from "@graphprotocol/graph-ts"

import { ChainlinkFeed } from "./types/templates"

import {
  OraclePaid as OraclePaidEvent
} from "./types/templates/ChainlinkFeed/ChainlinkFeed"

import {
  ChainlinkVRF2,
  RandomWordsFulfilled as RandomWordsFulfilledEvent
} from "./types/ChainlinkVRF2/ChainlinkVRF2"

import { getUsdPrice } from "./prices"

import { Node, Feed, Payment, GlobalSummary  } from "./types/schema"
import { BIGDECIMAL_1E18, BIGDECIMAL_ZERO, BIGINT_1E18, BIGINT_ZERO } from "./prices/common/constants"


export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
export const SERVICE_PRICE_FEED = 'price-feed'
export const SERVICE_VRF2 = 'vrf2'
export const SERVICE_KEEPR = 'keeper'

export function getGlobalSummary(): GlobalSummary {
  let global = GlobalSummary.load(ZERO_ADDRESS);
  
  if(global === null) {
    global = new GlobalSummary(ZERO_ADDRESS);
    global.totalTokensPaid = BIGINT_ZERO;
    global.totalUsdPaid = BIGDECIMAL_ZERO;
    global.save();
  }

  return global;
}

export function getOrCreateFeed(address: Address, startBlock: BigInt, service: string): Feed {
  let feed = Feed.load(address.toHexString());
  if(feed === null) {
    //i if price feed start indexing payments on new feed
    if(service === SERVICE_PRICE_FEED) ChainlinkFeed.create(address);

    feed = new Feed(address.toHexString());
    feed.startBlock = startBlock;
    feed.nodes = [];
    feed.service = service;
    feed.save();
  }
  return feed;
}

export function getOrCreateNode(address: Address): Node {
  let node = Node.load(address.toHexString());
  if(node === null) {
    node = new Node(address.toHexString());
    node.save();
  }
  return node;
}


// hashes feed address, node address, and block to get unique id
export function generatePaymentId(event: OraclePaidEvent): string {
  const paymentData = event.transaction.hash
    .concat(event.address) //feed
    .concat(event.params.payee); // chainlink node

  return crypto.keccak256(paymentData).toHexString();
}

export function getOrCreatePayment(event: OraclePaidEvent): Payment {
  const paymentId = generatePaymentId(event);
  let payment = Payment.load(paymentId);

  if(payment === null) {
    // can't destructure in assemblyscript :'(
    // const {
    //   address,
    //   params: { payee, amount },
    //   block: { number, timestamp }
    // } = event;

    payment = new Payment(paymentId);
    
    payment.amount = event.params.amount;
    // payment.usd = event.params.amount
    //   .times(getLinkUsdPrice(event.block.number))
    //   .div((new BigInt(10)).pow(18)); // remove LINK token decimals
    payment.usd = getUsdPrice(
      event.params.linkToken,
      payment.amount.toBigDecimal()
    ).div(BIGDECIMAL_1E18)
    payment.block = event.block.number;
    payment.timestamp = event.block.timestamp;

    const feed = getOrCreateFeed(event.address, event.block.number, SERVICE_PRICE_FEED);
    payment.feed = feed.id;
    payment.to = (getOrCreateNode(event.params.payee)).id;

    payment.save();

    //update global tracker
    const global = getGlobalSummary();
    global.totalTokensPaid = global.totalTokensPaid.plus(payment.amount);
    global.totalUsdPaid = global.totalUsdPaid.plus(payment.usd);
    global.save();

    // add node to feed's list if not already included
    if(!feed.nodes.includes(payment.to)) {
      const nodes = feed.nodes;
      nodes.push(payment.to); // can't push directly to array in enttiy
      feed.nodes = nodes;
      feed.save()
    }
  }

  return payment;

}


// hashes feed address, node address, and run id to get unique id
export function generateVrf2PaymentId(event: RandomWordsFulfilledEvent): string {
  const paymentData = event.transaction.hash
  .concat(event.address) //feed
  // forcefully cast Bytes -> Bytes. i dont fucking know
  .concat(changetype<Bytes>(Bytes.fromBigInt(event.params.requestId))); // uuid for run

  return crypto.keccak256(paymentData).toHexString();
}


export function getOrCreateVrf2Payment(event: RandomWordsFulfilledEvent): Payment {
  const paymentId = generateVrf2PaymentId(event);
  let payment = Payment.load(paymentId);

  if(payment === null) {
    // can't destructure in assemblyscript :'(
    // const {
    //   address,
    //   params: { payment },
    //   block: { number, timestamp }
    // } = event;

    payment = new Payment(paymentId);
    
    payment.amount = event.params.payment;
    // LINK address not emmitted link Price Feeds so pull from conbtract storage
    const link = (ChainlinkVRF2.bind(event.address)).LINK();
    payment.usd = getUsdPrice(
      link,
      payment.amount.toBigDecimal()
    ).div(BIGDECIMAL_1E18)
    payment.block = event.block.number;
    payment.timestamp = event.block.timestamp;

    const feed = getOrCreateFeed(event.address, event.block.number, SERVICE_VRF2);
    payment.feed = feed.id;

    // TODO: implement Node on VRF2. See branch #feature/unified-chainlink-api
    payment.to = ZERO_ADDRESS;

    payment.save();

    //update global tracker
    const global = getGlobalSummary();
    global.totalTokensPaid = global.totalTokensPaid.plus(payment.amount);
    global.totalUsdPaid = global.totalUsdPaid.plus(payment.usd);
    global.save();
  }

  return payment;
}


export function exponentToBigDecimal(decimals: BigInt): BigDecimal {
  let dec = "1"
  for (let i = 0; decimals.ge(new BigInt(i)); i++) {
    dec = dec + "0"
  }
  return BigDecimal.fromString(dec)
}
