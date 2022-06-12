import { TokenSetETF as EtfContract } from "../generated/Web3DataIndex/TokenSetETF";
import { _ERC20  } from "../generated/Web3DataIndex/_ERC20";
import { ETF, Holder, LiquidityPool } from "../generated/schema";
import { Pools } from "../generated/templates"

import { getUsdPrice } from "./prices";

import {
  BigInt,
  BigDecimal,
  Address,
  log,
  Bytes,
  ethereum,
  crypto,
  ByteArray,
} from "@graphprotocol/graph-ts";

import {
  BIGDECIMAL_ZERO,
  BIGDECIMAL_1E18,
  BIGINT_ZERO,
  ZERO_ADDRESS,
  ZERO_ADDRESS_STRING
} from "./prices/common/constants";

/**
 * @notice generate entity id for ETF events in schema
 */
export function getEventId(event: ethereum.Event): string {
  const addr = event.address.toHexString(),
        tx = event.transaction.hash.toHexString(),
        nonce = event.logIndex.toString()
  return `${addr}-${tx}-${nonce}`
}

export function getOrCreateEtf(id: Address): ETF {
  let etf = ETF.load(id.toHexString())

  if(etf === null) {
    etf = new ETF(id.toHexString())
    const erc = _ERC20.bind(id);

    // TODO can do checks to ensure its an "etf" token e.g. contract name is SetToken
    // const metadata = _getTokenMetadataSimple(id)
    // etf.decimals = metadata.decimals
    // etf.symbol = metadata.symbol
    // etf.name = metadata.name
    // etf.totalSupply = metadata.totalSupply

    const nameResult = erc.try_name()
    if(!nameResult.reverted) etf.name = nameResult.value
    else etf.name = "Unknown Token"
    
    const symbolResult = erc.try_symbol()
    if(!symbolResult.reverted) etf.symbol = symbolResult.value
    else etf.symbol = "XXX"
    
    const decimalResult = erc.try_decimals()
    if(!decimalResult.reverted) etf.decimals = decimalResult.value.toI32()
    else etf.decimals = 18
    
    const totalSupplyResult = erc.try_totalSupply()
    if(!totalSupplyResult.reverted) etf.totalSupply = totalSupplyResult.value
    else etf.totalSupply = BIGINT_ZERO


    etf.marketCap = BIGDECIMAL_ZERO // no price yet on first block created
    etf.lastPriceUSD = BIGDECIMAL_ZERO
    etf.lastPriceBlockNumber = BIGINT_ZERO
    
    // thats all mandatory data. can add optional stuf f per provider elsewhere
    etf.save()

    getOrCreatePoolsForToken(id, true)
  }

  return etf
}

export function getOrCreateHolder(holder: Address, etf: Address): Holder {
  const id = `${holder.toHexString()}-${etf.toHexString()}`
  let hodlr = Holder.load(id)

  if(hodlr === null) {
    getOrCreateEtf(etf)
    hodlr = new Holder(id)

    hodlr.etf = etf.toHexString()
    hodlr.address = Bytes.fromHexString(holder.toHexString())
    hodlr.amount = getTokenBalance(etf, holder)

    hodlr.save()
  }

  return hodlr
}

export function getTokenBalance(token: Address, address: Address): BigInt {
  const result = _ERC20.bind(token).try_balanceOf(address)
  return result.reverted ? BIGINT_ZERO : result.value
}

export function getEtfMarketcap(etf: ETF): BigDecimal {
  log.warning(
    "mcap vars supply {}, decimals {}",
    [etf.totalSupply.toString(), etf.decimals.toString()]
  )
  const value = getUsdPrice(
    Address.fromString(etf.id),
    etf.totalSupply.toBigDecimal()
  )
  return value.div(exponentToBigDecimal(etf.decimals))
}


const UNI_V2_FACTORY = Address.fromString("0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f")
const SUSHI_FACTORY = Address.fromString("0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac")
const ETH_ADDRESS = ZERO_ADDRESS
const USDC_ADDRESS = Address.fromString("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48")
const UNI_FACTORY_INITCODE = Bytes.fromHexString('0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f')

const DATA_ETH_SUSHI_POOL = Address.fromString("0x208226200b45b82212b814f49efa643980a7bdd1")

function encodeAndHash(values: Array<ethereum.Value>): ByteArray {
  return crypto.keccak256(
    ethereum.encode(
      // forcefully cast value[] -> tuple
      ethereum.Value.fromTuple( changetype<ethereum.Tuple>(values) )
    )!
  )
}
      
function getTokenSalt(token0: Address, token1: Address): Bytes  {
  return Bytes.fromByteArray(
    encodeAndHash([
      ethereum.Value.fromAddress(token0),
      ethereum.Value.fromAddress(token1)
    ])
  )
}

export function getPoolPairAddress(factory: Address, salt: Bytes, initCode: Bytes): Address {
// https://docs.uniswap.org/protocol/V2/guides/smart-contract-integration/getting-pair-addresses

  const poolHash = encodeAndHash([
    ethereum.Value.fromBytes(Bytes.fromHexString('0xff')),
    ethereum.Value.fromAddress(factory),
    ethereum.Value.fromBytes(salt),
    ethereum.Value.fromBytes(initCode)
  ])
  log.warning("uni pool hash {}", [poolHash.toHexString()])
  const addrOffset = 26 // trim  0x + first 12 bytes
  const poolAddr = poolHash.toHexString().substring(addrOffset)
  log.warning("uni pool addr {}", [poolAddr])

  return Address.fromString(poolAddr)
}

function orderTokensForPoolHash(token0: Address, token1: Address): Address[] {
  // eth = 0x0 so other token cant be lower
  if(token0 === ETH_ADDRESS) return [token0, token1]
  if(token1 === ETH_ADDRESS) return [token1, token0]

  // order tokens by uint(address) value
  const getVal = (a: Address): BigInt =>
    BigInt.fromByteArray(ByteArray.fromHexString(a.toHexString()))

  log.warning(
    "vals to compare @ {} @ {} @ {} @ ",
    [(getVal(token0) < getVal(token1)).toString(), getVal(token0).toString(), getVal(token1).toString()]
  )
  // const getVal = (a: Address): BigInt => BigInt.fromString(a.toHexString())
  return getVal(token0) < getVal(token1) ?
    [token0, token1] :
    [token1, token0]
}

export function getOrCreatePoolsForToken(token: Address, isEtf: bool): LiquidityPool[] {
   const poolSettings: Address[][] = [
     [ UNI_V2_FACTORY, token, USDC_ADDRESS ],
     [ UNI_V2_FACTORY, token, ETH_ADDRESS ],
     [ SUSHI_FACTORY, token, USDC_ADDRESS ],
     [ SUSHI_FACTORY, token, ETH_ADDRESS ]
   ]
  // don't need to have eth/usdc token data stored. only care about LP

  const pools: LiquidityPool[] = changetype<LiquidityPool[]>(
    poolSettings.map<LiquidityPool>((p: Address[]): LiquidityPool => {
      const ordered = orderTokensForPoolHash(p[1], p[2])
      const addy = getPoolPairAddress(
        p[0],
        // Bytes.fromByteArray(getTokenSalt(ordered[0], ordered[1])),
        changetype<Bytes>(getTokenSalt(ordered[0], ordered[1])),
        UNI_FACTORY_INITCODE
      )
      // const addy = DATA_ETH_SUSHI_POOL

      let pool = LiquidityPool.load(addy.toHexString())
      
      if(pool === null) {
        Pools.create(addy) //start tracking events on pool
        pool = new LiquidityPool(addy.toHexString()) 
        const poolErc = _ERC20.bind(addy)

        const nameResult = poolErc.try_name()
        if(!nameResult.reverted) pool.name = nameResult.value
        else pool.name = `${ordered[0]}/${ordered[1]} LP`
        
        const symbolResult = poolErc.try_symbol()
        if(!symbolResult.reverted) pool.symbol = symbolResult.value
        else pool.symbol = `${ordered[0]}-${ordered[1]}-LP`
        
        // assumes uni v2 pool
        const totalSupplyResult = poolErc.try_totalSupply()
        if(!totalSupplyResult.reverted) pool.outputTokenSupply = totalSupplyResult.value
        else pool.outputTokenSupply = BIGINT_ZERO
        
        pool.inputTokens = ordered.map<string>((a) => a.toString())
        pool.outputToken  = addy.toHexString() //  for uni v2ish LP token is pair contract
        pool.inputTokenBalances = [getTokenBalance(addy, ordered[0]), getTokenBalance(addy, ordered[1])]
        // @dev assume all pools are uni v2ish 50/50 pools
        pool.inputTokenWeights = [new BigInt(50).toBigDecimal(), new BigInt(50).toBigDecimal()]
        pool.outputTokenPriceUSD = getUsdPrice(
          Address.fromString((pool.outputToken || ZERO_ADDRESS_STRING)!),
          (pool.outputTokenSupply || new BigInt(1))!.toBigDecimal()
        )
        
        pool.cumulativeVolumeUSD = BIGDECIMAL_ZERO
        pool.totalValueLockedUSD = BIGDECIMAL_ZERO
        // pool.fees = []

        // dont track. but conform to standard
        pool.createdTimestamp = BIGINT_ZERO
        pool.createdBlockNumber = BIGINT_ZERO

        pool.save()
      }

      return pool
    })
  )

  return pools
}

export function exponentToBigDecimal(decimals: number): BigDecimal {
  let dec = "1"
  for (let i = 0; i < decimals; i++) {
    dec = dec + "0"
  }
  return BigDecimal.fromString(dec)
}
