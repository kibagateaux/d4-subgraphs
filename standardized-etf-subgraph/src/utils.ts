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

import { TokenSetETF as EtfContract } from "../generated/Web3DataIndex/TokenSetETF";
import { _ERC20  } from "../generated/Web3DataIndex/_ERC20";
import { ETF, Holder, Pool } from "../generated/schema";
import { Pools } from "../generated/templates"
import { getUsdPrice } from "./prices";
import { BIGDECIMAL_ZERO, BIGDECIMAL_1E18, BIGINT_ZERO, ZERO_ADDRESS } from "./prices/common/constants";

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
  let etf = ETF.load(id.toHexString());

  if(etf === null) {
    etf = new ETF(id.toHexString())
    const token = _ERC20.bind(id)

    // TODO can do checks to ensure its an "etf" token e.g. contract name is SetToken

    let failed = false;

    const decimalResult = token.try_decimals()
    if(!decimalResult.reverted) etf.decimals = decimalResult.value.toI32();
    else etf.decimals = 18;

    const symbolResult = token.try_symbol()
    if(!symbolResult.reverted) etf.symbol = symbolResult.value;
    else etf.symbol = "XXX";

    const nameResult = token.try_name()
    if(!nameResult.reverted) etf.name = nameResult.value;
    else etf.name = "Unknown Token";
    
    // const totalSupplyResult = token.try_totalSupply()
    // if(!totalSupplyResult.reverted) etf.totalSupply = totalSupplyResult.value;
    // else etf.totalSupply = BIGINT_ZERO;
    etf.totalSupply = BIGINT_ZERO;

    etf.marketCap = BIGDECIMAL_ZERO // no price yet on first block created

    etf.save()

    getOrCreatePoolsForToken(id)
  }

  return etf
}

export function getOrCreateHolder(holder: Address, etf: Address): Holder {
  const id = `${holder.toHexString()}-${etf.toHexString()}`;
  let hodlr = Holder.load(id);

  if(hodlr === null) {
    getOrCreateEtf(etf);
    
    hodlr = new Holder(id)

    const token = _ERC20.bind(etf)
    hodlr.etf = etf.toHexString()
    hodlr.address = Bytes.fromHexString(holder.toHexString())
    const result = token.try_balanceOf(holder)
    hodlr.amount = result.reverted ? BIGINT_ZERO : result.value

    hodlr.save()
  }

  return hodlr
}

export function getTokenBalance(etf: Address, holder: Address): BigInt {
  try {
    return _ERC20.bind(etf).balanceOf(holder)
  } catch (e) {
    return BIGINT_ZERO
  }
}

export function getMarketcap(etf: Address): BigDecimal {
  const token = _ERC20.bind(etf)
  if(token !== null) {
    let totalSupplyResult = token.try_totalSupply()
    let totalSupply = totalSupplyResult.reverted ? BIGINT_ZERO : totalSupplyResult.value;
    
    let decimalsResult = token.try_decimals()
    let decimals = decimalsResult.reverted ? BIGINT_ZERO : decimalsResult.value;

    const value = getUsdPrice(etf, totalSupply.toBigDecimal())
    
    return BIGDECIMAL_ZERO.equals(value) ?
      BIGDECIMAL_ZERO :
      value.div(BIGDECIMAL_1E18.times(decimals.toBigDecimal()))
    }

  return BIGDECIMAL_ZERO
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
      
function getTokenSalt(token0: Address, token1: Address): ByteArray  {
  return encodeAndHash([
    ethereum.Value.fromAddress(token0),
    ethereum.Value.fromAddress(token1)
  ])
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

export function getOrCreatePoolsForToken(etf: Address): Pool[] {
   const poolSettings: Address[][] = [
     [ UNI_V2_FACTORY, etf, USDC_ADDRESS ],
     [ UNI_V2_FACTORY, etf, ETH_ADDRESS ],
     [ SUSHI_FACTORY, etf, USDC_ADDRESS ],
     [ SUSHI_FACTORY, etf, ETH_ADDRESS ]
   ]
  
  const pools: Pool[] = changetype<Pool[]>(
    poolSettings.map<Pool>((p: Address[]): Pool => {
      const ordered = orderTokensForPoolHash(p[1], p[2])
      const addy = getPoolPairAddress(
        p[0],
        changetype<Bytes>(getTokenSalt(ordered[0], ordered[1])),
        UNI_FACTORY_INITCODE
      )
      // const addy = DATA_ETH_SUSHI_POOL

      let pool = Pool.load(addy.toHexString())
      if(pool == null) {
        Pools.create(addy)
        pool = new Pool(addy.toHexString())

        pool.baseToken = p[1].toHexString()
        pool.quoteToken = p[2].toHexString()
        pool.baseTokenBalance = BIGINT_ZERO
        pool.quoteTokenBalance = BIGINT_ZERO
        pool.totalSwapVolume = BIGINT_ZERO
        pool.totalSwapVolumeUsd = BIGINT_ZERO
        
        pool.save()
      }

      return pool
    })
  )

  return pools
}
