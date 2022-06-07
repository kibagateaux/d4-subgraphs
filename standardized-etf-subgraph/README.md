[Set Protocol V2 official subgraph](https://github.com/SetProtocol/set-protocol-v2-subgraph/blob/master/schema.graphql)


example subgraph to get events 
```
{
  etfs {
    name
    symbol
    totalSupply
    marketCap
    lastPriceUSD
    lastPriceBlockNumber
    events {
      __typename
      # ...on TransferEvent {
      #   to {id }
      #    from {id }
      #   amount
      # }
      ...on MintEvent {
				holder {id }
        amount
      }
      ...on RedeemEvent {
				holder {id }
        amount
      }
    }
  }
}
```
