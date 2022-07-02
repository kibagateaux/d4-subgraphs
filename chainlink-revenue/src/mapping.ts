import {
  FeedConfirmed,
} from "./types/ChainlinkFeedRegistry/ChainlinkFeedRegistry"

import {
  RandomWordsFulfilled,
} from "./types/ChainlinkVRF2/ChainlinkVRF2"

import {
  OraclePaid as OraclePaidEvent
} from "./types/templates/ChainlinkFeed/ChainlinkFeed"

import {
  getOrCreateFeed,
  getOrCreateNode,
  getOrCreatePayment,
  SERVICE_PRICE_FEED,
  SERVICE_VRF2,
} from './utils';

export function handleFeedConfirmed(event: FeedConfirmed): void {
  const feed = getOrCreateFeed(
    event.params.latestAggregator,
    event.block.number,
    'price-feed'
  );

  //const transmitters = ChainlinkAggregator(feed).transmitters()
  // transmitters.forEach(node => { const node = getOrCreateNode(node); node.save() });
}

export function handleOraclePaid(event: OraclePaidEvent): void {
  // Chainlink Feed is contract that emits OraclePaid events
  const feed = getOrCreateFeed(
    event.address,
    event.block.number,
    SERVICE_PRICE_FEED
  );
  
  // chainlink node is recipient of payment
  const node = getOrCreateNode(event.params.payee);
  
  const payment = getOrCreatePayment(event, SERVICE_PRICE_FEED);
}


export function handleVRF2Fulfilled(event: RandomWordsFulfilled): void {
  const feed = getOrCreateFeed(
    event.params.latestAggregator,
    event.block.number,
    SERVICE_VRF2
  );

  
  // can find  Node address from this line.
  // they dont emit in event so might have to use tx params to call  private getRandomnessFromProof()  to get hash then address
  // https://github.com/smartcontractkit/chainlink/blob/e1e78865d4f3e609e7977777d7fb0604913b63ed/contracts/src/v0.8/VRFCoordinatorV2.sol#L598

  const payment = getOrCreatePayment(event, SERVICE_VRF2);
}
