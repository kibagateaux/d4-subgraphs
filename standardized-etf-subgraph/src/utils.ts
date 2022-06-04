import { BigInt, BigDecimal, Address } from "@graphprotocol/graph-ts";

import { TokenSetETF as EtfContract } from "../generated/TokenSetEtf/TokenSetEtf";
import { _ERC20  } from "../generated/TokenSetEtf/_ERC20";
import { ETF, Holder } from "../generated/schema";
import { getUsdPrice } from "./prices";
import { BIGINT_ZERO } from "./prices/common/constants";

export function getOrCreateEtf(id: Address): ETF {
  let etf = ETF.load(id.toHexString());

  if(etf === null) {
    etf = new ETF(id.toHexString())
    const token = _ERC20.bind(id)
    etf.decimals = token.decimals().toI32()
    etf.symbol = token.symbol()
    etf.name = token.name()
    etf.totalSupply = token.totalSupply()
    etf.marketCap = BIGINT_ZERO // no price yet on first block created
  }

  return etf
}

export function getOrCreateHolder(etf: Address, holder: Address): Holder {
  const id = `${etf}-${holder}`;
  let hodlr = Holder.load(id);

  if(hodlr === null) {
    getOrCreateEtf(etf);
    
    hodlr = new Holder(id)

    const token = _ERC20.bind(etf)
    hodlr.etf = etf.toString()
    hodlr.amount = token.balanceOf(holder)
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
