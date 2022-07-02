import {
  log,
  Bytes,
  crypto,
  BigInt,
  Address,
  ethereum,
  ByteArray,
  BigDecimal,
 } from "@graphprotocol/graph-ts"

import { ChainlinkFeed } from "./types/templates"

import {
  OraclePaid as OraclePaidEvent
} from "./types/templates/ChainlinkFeed/ChainlinkFeed"

import {
  ChainlinkVRF2,
  RandomWordsFulfilled as RandomWordsFulfilledEvent,
} from "./types/ChainlinkVRF2/ChainlinkVRF2"

import {
  Node,
  Feed,
  Payment,
  GlobalSummary
} from "./types/schema"

import {
  BIGINT_ZERO,
  BIGINT_1E18,
  BIGDECIMAL_ZERO,
  BIGDECIMAL_1E18,
} from "./prices/common/constants"

import { getUsdPrice } from "./prices"


export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

export const SERVICE_VRF2 = 'vrf2'
export const SERVICE_PRICE_FEED = 'price-feed'
export const SERVICE_KEEPER = 'keeper'

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
  if(service == SERVICE_VRF2) {
    return getOrCreateVrfFeed(address, startBlock);
  }

  // default to price feed. makes type system easier not having to deal with null
  return getOrCreatePriceFeed(address, startBlock);
}

export function getOrCreateVrfFeed(address: Address, startBlock: BigInt): Feed {
  let feed = Feed.load(address.toHexString());
  if(feed === null) {
    feed = new Feed(address.toHexString());
    feed.startBlock = startBlock;
    feed.nodes = [];
    feed.service = SERVICE_VRF2;
    feed.save();
  }
  return feed;
}

export function getOrCreatePriceFeed(address: Address, startBlock: BigInt): Feed {
  let feed = Feed.load(address.toHexString());
  if(feed === null) {
    ChainlinkFeed.create(address); // start indexing payments on new feed
    feed = new Feed(address.toHexString());
    feed.startBlock = startBlock;
    feed.nodes = [];
    feed.service = SERVICE_PRICE_FEED;
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
export function generatePaymentId(event: ethereum.Event): string {
  const paymentData = event.transaction.hash
    .concat(event.address) //feed
    .concat(Bytes.fromHexString(event.logIndex.toHexString()));
    
  return crypto.keccak256(paymentData).toHexString();
}

export function getOrCreatePayment(event: object, service: string): Payment {
  const nodeAddress = getNodeForPayment(event, service);
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
    
    // payment.amount = service === SERVICE_PRICE_FEED ? event.params.amount : event.params.payment;
    payment.amount = event.params.amount || event.params.payment;
    payment.usd = getUsdPrice(
      event.params.linkToken,
      payment.amount.toBigDecimal()
    ).div(BIGDECIMAL_1E18)

    payment.block = event.block.number;
    payment.timestamp = event.block.timestamp;

    const feed = getOrCreateFeed(event.address, event.block.number, service);
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

// return oracle address
export function getNodeForPayment(event: object, service: string): Bytes {
  const type  = nameof(event)
  log.warning("type of payment", [type]);

  if(service === SERVICE_VRF2) {
    // VRF event doesnt publish who which node serviced the request
    // so we have to parse tx input and query onchain data to get Node's address

    const coordinator = ChainlinkVRF2.bind(event.address);

    // vrf Proof is 12 32 bytes (uint256s) + 1 20 bytes (address)
    // https://github.com/smartcontractkit/chainlink/blob/e1e78865d4f3e609e7977777d7fb0604913b63ed/contracts/src/v0.8/VRF.sol#L539-L549
    // vrf Request Commitment  is all packed into one slot
    // // https://github.com/smartcontractkit/chainlink/blob/e1e78865d4f3e609e7977777d7fb0604913b63ed/contracts/src/v0.8/VRFCoordinatorV2.sol#L101-L107
    
    //  OPTION 1: 
    // const proof = sliceHex(event.transaction.input, 0, 13 * 2);
    const str = event.transaction.input.toString();
    const proof = str.substring(0, 2 + 13 * 2);
    const rc = str.substring(29);
    
    
    // OPTION 2:
    // const proofStruct =  'uint256,uint256,uint256,uint256,uint256,uint256,uint256,address,uint256,uint256,uint256,uint256,uint256'
    // const rcStruct =  'uint64,uin64,uint32,uint32,address';
    // let decodedInputTuple = ethereum.decode(
      //   `(${proofStruct},${rcStruct})`,
      //   getTxnInputDataToDecode(event)
      // )!.toTuple()
      // log.warning('Dedoced tx data', [decodedInputTuple.toString()]);
      // const data2 = coordinator.getRandomnessFromProof(decodedInputTuple); // pretty sure we have to do same thing as above and split anyway
      
    // FUNCTION USED TO GET NODE ADDRESS IS PRIVATE SO NOT IN ABI
    // OPTION 1/2 not viable (?)
    const data = coordinator.getRandomnessFromProof(proof, rc);


    // OPTION 3: node address is used as key in mapping that gets updated in tx
    // can try to trace stack or reverese engineer address from storage slot or something
    let runDetails = ethereum.decode(
      'bytes32,uint256,uint256',
      getTxnInputDataToDecode(data)
    )!.toTuple()

    
    log.warning("VRF Node is...", [runDetails[0].toString()]);
    return runDetails[0].toBytes()
  }

  log.warning("Price Feed Node is...", [event.params.payee]);
  // default to prevent annoying type stuff
  return event.params.payee
}

export function exponentToBigDecimal(decimals: BigInt): BigDecimal {
  let dec = "1"
  for (let i = 0; decimals.ge(new BigInt(i)); i++) {
    dec = dec + "0"
  }
  return BigDecimal.fromString(dec)
}

// stolen from prices lib
export function sliceHex(data: ByteArray, offset: number, endOffset: number = 0): ByteArray {
  const str: string = data.toHexString()
  offset = 2 + 2 * offset as i32;
  if (endOffset !== 0) {
      return ByteArray.fromHexString("0x" + str.substring(offset as i32, 2 + 2 * endOffset as i32));
  }
  return ByteArray.fromHexString("0x" + str.substring(offset as i32));
}

// stolen from xnhns
export function getTxnInputDataToDecode(event: ethereum.Event): Bytes {
  const inputDataHexString = event.transaction.input.toHexString().slice(10); //take away function signature: '0x????????'
  const hexStringToDecode = '0x0000000000000000000000000000000000000000000000000000000000000020' + inputDataHexString; // prepend tuple offset
  return Bytes.fromByteArray(Bytes.fromHexString(hexStringToDecode));
}
