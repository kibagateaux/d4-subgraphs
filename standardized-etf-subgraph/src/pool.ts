// export function handleSwap(event: Swap): void {
//   let pair = Pair.load(event.address.toHexString())
//   let token0 = Token.load(pair.token0)
//   let token1 = Token.load(pair.token1)
//   let amount0In = convertTokenToDecimal(event.params.amount0In, token0.decimals)
//   let amount1In = convertTokenToDecimal(event.params.amount1In, token1.decimals)
//   let amount0Out = convertTokenToDecimal(event.params.amount0Out, token0.decimals)
//   let amount1Out = convertTokenToDecimal(event.params.amount1Out, token1.decimals)

//   // totals for volume updates
//   let amount0Total = amount0Out.plus(amount0In)
//   let amount1Total = amount1Out.plus(amount1In)

//   // ETH/USD prices
//   let bundle = Bundle.load('1')

//   // get total amounts of derived USD and ETH for tracking
//   let derivedAmountETH = token1.derivedETH
//     .times(amount1Total)
//     .plus(token0.derivedETH.times(amount0Total))
//     .div(BigDecimal.fromString('2'))
//   let derivedAmountUSD = derivedAmountETH.times(bundle.ethPrice)

//   // only accounts for volume through white listed tokens
//   let trackedAmountUSD = getTrackedVolumeUSD(amount0Total, token0 as Token, amount1Total, token1 as Token, pair as Pair)

//   let trackedAmountETH: BigDecimal
//   if (bundle.ethPrice.equals(ZERO_BD)) {
//     trackedAmountETH = ZERO_BD
//   } else {
//     trackedAmountETH = trackedAmountUSD.div(bundle.ethPrice)
//   }

//   // update token0 global volume and token liquidity stats
//   token0.tradeVolume = token0.tradeVolume.plus(amount0In.plus(amount0Out))
//   token0.tradeVolumeUSD = token0.tradeVolumeUSD.plus(trackedAmountUSD)
//   token0.untrackedVolumeUSD = token0.untrackedVolumeUSD.plus(derivedAmountUSD)

//   // update token1 global volume and token liquidity stats
//   token1.tradeVolume = token1.tradeVolume.plus(amount1In.plus(amount1Out))
//   token1.tradeVolumeUSD = token1.tradeVolumeUSD.plus(trackedAmountUSD)
//   token1.untrackedVolumeUSD = token1.untrackedVolumeUSD.plus(derivedAmountUSD)

//   // update txn counts
//   token0.txCount = token0.txCount.plus(ONE_BI)
//   token1.txCount = token1.txCount.plus(ONE_BI)

//   // update pair volume data, use tracked amount if we have it as its probably more accurate
//   pair.volumeUSD = pair.volumeUSD.plus(trackedAmountUSD)
//   pair.volumeToken0 = pair.volumeToken0.plus(amount0Total)
//   pair.volumeToken1 = pair.volumeToken1.plus(amount1Total)
//   pair.untrackedVolumeUSD = pair.untrackedVolumeUSD.plus(derivedAmountUSD)
//   pair.txCount = pair.txCount.plus(ONE_BI)
//   pair.save()

//   // update global values, only used tracked amounts for volume
//   let uniswap = UniswapFactory.load(FACTORY_ADDRESS)
//   uniswap.totalVolumeUSD = uniswap.totalVolumeUSD.plus(trackedAmountUSD)
//   uniswap.totalVolumeETH = uniswap.totalVolumeETH.plus(trackedAmountETH)
//   uniswap.untrackedVolumeUSD = uniswap.untrackedVolumeUSD.plus(derivedAmountUSD)
//   uniswap.txCount = uniswap.txCount.plus(ONE_BI)

//   // save entities
//   pair.save()
//   token0.save()
//   token1.save()
//   uniswap.save()

//   let transaction = Transaction.load(event.transaction.hash.toHexString())
//   if (transaction === null) {
//     transaction = new Transaction(event.transaction.hash.toHexString())
//     transaction.blockNumber = event.block.number
//     transaction.timestamp = event.block.timestamp
//     transaction.mints = []
//     transaction.swaps = []
//     transaction.burns = []
//   }

//   let swap = new SwapEvent(event.transaction.hash.toHexString())

//   // update swap event
//   swap.transaction = transaction.id
//   swap.pair = pair.id
//   swap.timestamp = transaction.timestamp
//   swap.transaction = transaction.id
//   swap.sender = event.params.sender
//   swap.amount0In = amount0In
//   swap.amount1In = amount1In
//   swap.amount0Out = amount0Out
//   swap.amount1Out = amount1Out
//   swap.to = event.params.to
//   swap.from = event.transaction.from
//   swap.logIndex = event.logIndex
//   // use the tracked amount if we have it
//   swap.amountUSD = trackedAmountUSD === ZERO_BD ? derivedAmountUSD : trackedAmountUSD
//   swap.save()

//   // update the transaction

//   // TODO: Consider using .concat() for handling array updates to protect
//   // against unintended side effects for other code paths.
//   swaps.push(swap.id)
//   transaction.swaps = swaps
//   transaction.save()
// }
