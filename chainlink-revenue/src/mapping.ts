import {
  FeedConfirmed as FeedConfirmedEvent,
} from "./types/ChainlinkFeedRegistry/ChainlinkFeedRegistry"

import {
  OraclePaid as OraclePaidEvent
} from "./types/templates/ChainlinkFeed/ChainlinkFeed"

import {
  RandomWordsFulfilled as RandomWordsFulfilledEvent,
} from "./types/ChainlinkVRF2/ChainlinkVRF2"

import {
  getOrCreateFeed,
  getOrCreateNode,
  getOrCreatePayment,
  getOrCreateVrf2Payment,
  SERVICE_PRICE_FEED,
  SERVICE_VRF2,
} from './utils';

export function handleFeedConfirmed(event: FeedConfirmedEvent): void {
  const feed = getOrCreateFeed(
    event.params.latestAggregator,
    event.block.number,
    SERVICE_PRICE_FEED
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
  
  const payment = getOrCreatePayment(event);
}

export function handleVRF2Fulfilled(event: RandomWordsFulfilledEvent): void {
  const feed = getOrCreateFeed(
    event.address,
    event.block.number,
    SERVICE_VRF2
  );
  const payment = getOrCreateVrf2Payment(event);
}
