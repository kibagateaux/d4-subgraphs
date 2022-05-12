import {
  FeedConfirmed,
} from "./types/ChainlinkFeedRegistry/ChainlinkFeedRegistry"

import {
  OraclePaid as OraclePaidEvent
} from "./types/templates/ChainlinkFeed/ChainlinkFeed"

import {
  getOrCreateFeed,
  getOrCreateNode,
  getOrCreatePayment
} from './utils';

export function handleFeedConfirmed(event: FeedConfirmed): void {
  const feed = getOrCreateFeed(
    event.params.latestAggregator,
    event.block.number
  );

  //const transmitters = ChainlinkAggregator(feed).transmitters()
  // transmitters.forEach(node => { const node = getOrCreateNode(node); node.save() });
}

export function handleOraclePaid(event: OraclePaidEvent): void {
  // Chainlink Feed is contract that emits OraclePaid events
  const feed = getOrCreateFeed(event.address, event.block.number);
  
  // chainlink node is recipient of payment
  const node = getOrCreateNode(event.params.payee);
  
  const payment = getOrCreatePayment(event);
}
