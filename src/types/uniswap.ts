export interface PoolToken {
  id: string;
  symbol: string;
  name: string;
  decimals: number;
}

export interface Pool {
  id: string;
  token0: PoolToken;
  token1: PoolToken;
  feeTier: string;
  liquidity: string;
  token0Price: string;
  token1Price: string;
  volumeUSD: string;
  totalValueLockedUSD: string;
  feesUSD: string;
  txCount: string;
  sqrtPrice?: string;
  tick?: string;
}

export interface Swap {
  id: string;
  timestamp: string;
  amount0: string;
  amount1: string;
  amountUSD: string;
  pool: {
    token0: {
      symbol: string;
    };
    token1: {
      symbol: string;
    };
  };
}

export interface Token {
  id: string;
  symbol: string;
  name: string;
  decimals: number;
  totalSupply: string;
  volume: string;
  volumeUSD: string;
  feesUSD: string;
  txCount: string;
  poolCount: string;
  totalValueLocked: string;
  totalValueLockedUSD: string;
  derivedETH: string;
  address?: string; // Alias for id
  priceUSD?: string;
}

export interface TokensResponse {
  tokens: Token[];
}

export interface PoolsResponse {
  pools: Pool[];
}

export interface SwapsResponse {
  swaps: Swap[];
}
