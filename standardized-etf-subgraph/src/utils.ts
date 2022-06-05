import {
  BigInt,
  BigDecimal,
  Address,
  log,
  Bytes,
  ethereum
} from "@graphprotocol/graph-ts";

import { TokenSetETF as EtfContract } from "../generated/TokenSetEtf/TokenSetEtf";
import { _ERC20  } from "../generated/TokenSetEtf/_ERC20";
import { ETF, Holder, Pool } from "../generated/schema";
import { getUsdPrice } from "./prices";
import { BIGDECIMAL_ZERO, BIGDECIMAL_1E18, BIGINT_ZERO } from "./prices/common/constants";

export function getMarketcap(etf: Address): BigDecimal {
  const token = _ERC20.bind(etf)
  if(token !== null) {
    let totalSupplyResult = token.try_totalSupply()
    let totalSupply = totalSupplyResult.reverted ? BIGINT_ZERO : totalSupplyResult.value;
    
    let decimalsResult = token.try_decimals()
    let decimals = decimalsResult.reverted ? BIGINT_ZERO : decimalsResult.value;

    const price = getUsdPrice(etf, totalSupply.toBigDecimal())
    
    return BIGDECIMAL_ZERO.equals(price) ?
      BIGDECIMAL_ZERO :
      price.div(BIGDECIMAL_1E18.times(decimals.toBigDecimal()))
    }

  return BIGDECIMAL_ZERO
}

export function getOrCreateEtf(id: Address): ETF {
  let etf = ETF.load(id.toHexString());

  if(etf === null) {
    etf = new ETF(id.toHexString())
    const token = _ERC20.bind(id)

    // can do checks to ensure its an "etf" token e.g. contract name is SetToken

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

    // TODO genereate pool addresses for uni v2 / sushi
  }

  return etf
}

const UNI_v2_FACTORY = Address.fromString("0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f")
const UNI_FACTORY_HEXCODE = '0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f'
const SUSHI_FACTORY = Address.fromString("0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac")
const ETH_ADDRESS = Address.fromString("0x0")
const USDC_ADDRESS = Address.fromString("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48")


export function getOrCreatePoolsForToken(etf: Address): Pool[] {
  // https://docs.uniswap.org/protocol/V2/guides/smart-contract-integration/getting-pair-addresses
  let tokens: Address[] = etf > USDC_ADDRESS ? [USDC_ADDRESS, etf] : [etf, USDC_ADDRESS];
  let tupleArray: Array<ethereum.Value> = [
    ethereum.Value.fromAddress(tokens[0]),
    ethereum.Value.fromAddress(tokens[1]),
  ]
  let encoded = ethereum.encode(ethereum.Value.fromTuple(tupleArray as ethereum.Tuple))!

  return [new Pool("0")]
}

export function getOrCreateHolder(etf: Address, holder: Address): Holder {
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

export function getEventId(event: ethereum.Event): string {
  return `${event.address}-${event.logIndex}-${event.transaction.hash}`
}
