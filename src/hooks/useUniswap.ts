import { useQuery } from "urql";
import { useMemo } from "react";
import { Pool, PoolsResponse, SwapsResponse, TokensResponse } from "@/types/uniswap";

const TOP_POOLS_QUERY = `
  query GetTopPools {
    pools(
      first: 10,
      orderBy: totalValueLockedUSD,
      orderDirection: desc,
      where: { 
        volumeUSD_gt: "1000000"
      }
    ) {
      id
      token0 {
        id
        symbol
        name
        decimals
      }
      token1 {
        id
        symbol
        name
        decimals
      }
      feeTier
      liquidity
      token0Price
      token1Price
      volumeUSD
      totalValueLockedUSD
      feesUSD
      txCount
    }
  }
`;

const POOL_DATA_QUERY = `
  query GetPoolData($poolAddress: ID!) {
    pool(id: $poolAddress) {
      id
      token0 {
        id
        symbol
        name
        decimals
      }
      token1 {
        id
        symbol
        name
        decimals
      }
      feeTier
      liquidity
      sqrtPrice
      token0Price
      token1Price
      tick
      volumeUSD
      totalValueLockedUSD
      feesUSD
      txCount
    }
  }
`;

const RECENT_SWAPS_QUERY = `
  query GetRecentSwaps($poolAddress: ID!, $limit: Int!) {
    swaps(
      where: { pool: $poolAddress }
      orderBy: timestamp
      orderDirection: desc
      first: $limit
    ) {
      id
      timestamp
      amount0
      amount1
      amountUSD
      pool {
        token0 {
          symbol
        }
        token1 {
          symbol
        }
      }
    }
  }
`;

const VALID_TOKENS_QUERY = `
  query GetValidTokens {
    tokens(
      first: 20,
      orderBy: totalValueLockedUSD,
      orderDirection: desc,
      where: {
        totalValueLockedUSD_gt: "100000"
        volumeUSD_gt: "10000"
      }
    ) {
      id
      symbol
      name
      decimals
      derivedETH
      totalValueLockedUSD
      volumeUSD
    }
  }
`;

export function useTopPools() {
  const [result] = useQuery<PoolsResponse>({
    query: TOP_POOLS_QUERY,
    context: useMemo(() => ({
      requestPolicy: 'network-only'
    }), [])
  });

  const filteredPools = useMemo(() => 
    result.data?.pools?.filter((pool): pool is Pool => 
      Boolean(pool?.token0?.decimals && 
      pool?.token1?.decimals && 
      Number(pool.totalValueLockedUSD) > 0)
    ),
    [result.data?.pools]
  );

  return {
    pools: filteredPools,
    loading: result.fetching,
    error: result.error,
  };
}

export function usePoolData(poolAddress: string) {
  const [result] = useQuery<{ pool: Pool }>({
    query: POOL_DATA_QUERY,
    variables: useMemo(() => ({ poolAddress }), [poolAddress]),
    pause: !poolAddress,
    context: useMemo(() => ({
      requestPolicy: 'cache-and-network'
    }), [])
  });

  const validPool = useMemo(() => 
    result.data?.pool && 
    result.data.pool.token0?.decimals && 
    result.data.pool.token1?.decimals,
    [result.data?.pool]
  );

  return {
    data: validPool ? result.data.pool : null,
    loading: result.fetching,
    error: result.error,
  };
}

export function useRecentSwaps(poolAddress: string, limit: number = 10) {
  const [result] = useQuery<SwapsResponse>({
    query: RECENT_SWAPS_QUERY,
    variables: useMemo(() => ({ poolAddress, limit }), [poolAddress, limit]),
    pause: !poolAddress,
    context: useMemo(() => ({
      requestPolicy: 'network-only'
    }), [])
  });

  const filteredSwaps = useMemo(() => 
    result.data?.swaps?.filter(swap => 
      swap?.pool?.token0?.symbol && 
      swap?.pool?.token1?.symbol
    ),
    [result.data?.swaps]
  );

  return {
    swaps: filteredSwaps,
    loading: result.fetching,
    error: result.error,
  };
}

export function useValidTokens() {
  const [result] = useQuery<TokensResponse>({
    query: VALID_TOKENS_QUERY,
    context: useMemo(() => ({
      requestPolicy: 'cache-and-network'
    }), [])
  });

  const filteredTokens = useMemo(() => 
    result.data?.tokens?.filter(token => 
      token?.decimals && 
      Number(token.totalValueLockedUSD) > 0
    ),
    [result.data?.tokens]
  );

  return {
    tokens: filteredTokens,
    loading: result.fetching,
    error: result.error,
  };
}
