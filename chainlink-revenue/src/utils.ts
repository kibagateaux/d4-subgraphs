import {
  BigInt,
  BigDecimal,
  Address,
  crypto,
  log,
 } from "@graphprotocol/graph-ts"

import { ChainlinkFeed } from "./types/templates"

import {
  UniV3Pool
} from "./types/ChainlinkFeedRegistry/UniV3Pool"

import {
  OraclePaid as OraclePaidEvent
} from "./types/templates/ChainlinkFeed/ChainlinkFeed"

import { getUsdPrice } from "./prices"

import { Node, Feed, Payment, GlobalSummary  } from "./types/schema"
import { BIGDECIMAL_1E18, BIGDECIMAL_ZERO, BIGINT_1E18, BIGINT_ZERO } from "./prices/common/constants"


export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

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

export function getOrCreateFeed(address: Address, startBlock: BigInt): Feed {
  let feed = Feed.load(address.toHexString());
  if(feed === null) {
    ChainlinkFeed.create(address); // start indexing payments on new feed
    feed = new Feed(address.toHexString());
    feed.startBlock = startBlock;
    feed.nodes = [];
    feed.save();
  }
  return feed;
}


// Uni V3 launched right before feed registry so we can use it for all LINK pricing
const UNI_V3_ETH_LINK_30_BPS_POOL: Address = Address.fromString("0xa6cc3c2531fdaa6ae1a3ca84c2855806728693e8");
const UNI_V3_ETH_USDC_5_BPS_POOL: Address = Address.fromString("0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640");
const linkEthPool = UniV3Pool.bind(UNI_V3_ETH_LINK_30_BPS_POOL);
const ethUsdPool = UniV3Pool.bind(UNI_V3_ETH_USDC_5_BPS_POOL);

// getting price from uni v3 pool docs
// https://docs.uniswap.org/sdk/guides/fetching-prices#understanding-sqrtprice
let priceExponent = 2 ** 192
let Q192 = BigDecimal.fromString(priceExponent.toString());

export function getLinkUsdPrice(block: BigInt): BigInt {
  const linkEthXqrtPriceX96 = linkEthPool.slot0().value0;
  // const linkEthPrice = (new BigInt(2)).pow(192).div(pow(2));
  // const ethUsdPrice =  ethUsdPool.slot0().value0.pow(2).div((new BigInt(2)).pow(192));

  let linkEthNum = linkEthXqrtPriceX96.times(linkEthXqrtPriceX96).toBigDecimal()
  let linkEthPrice = linkEthNum
    .div(Q192)
    .times(exponentToBigDecimal(BigInt.fromI32(18))) // ETH decimals
    .div(BIGDECIMAL_1E18); // LINK decimals

  log.info('LINK/ETH price {} at block {}', [linkEthPrice.toString(), block.toString()]);

  const ethUsdXqrtPriceX96 = ethUsdPool.slot0().value0;
  let ethUsdNum = ethUsdXqrtPriceX96.times(ethUsdXqrtPriceX96).toBigDecimal()
  let ethUsdPrice = linkEthNum
    .div(Q192)
    .times(exponentToBigDecimal(BigInt.fromI32(6))) // USDC decimals
    .div(BIGDECIMAL_1E18) // ETH decimals

  log.info('ETH/USD price {} at block {}', [ethUsdPrice.toString(), block.toString()]);
  // TODO need to do something about token decimals before returning price me thinks
  return BigInt.fromString(linkEthPrice.times(ethUsdPrice).toString());
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

    const feed = getOrCreateFeed(event.address, event.block.number);
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


export function exponentToBigDecimal(decimals: BigInt): BigDecimal {
  let dec = "1"
  for (let i = 0; decimals.gt(new BigInt(i)); i++) {
    dec = dec + "0"
  }
  return BigDecimal.fromString(dec)
}
