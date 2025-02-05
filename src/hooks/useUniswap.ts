import { useQuery } from "urql";

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

export function useTopPools() {
  const [result] = useQuery({
    query: TOP_POOLS_QUERY,
  });

  return {
    pools: result.data?.pools,
    loading: result.fetching,
    error: result.error,
  };
}

export function usePoolData(poolAddress: string) {
  const [result] = useQuery({
    query: POOL_DATA_QUERY,
    variables: { poolAddress },
  });

  return {
    data: result.data?.pool,
    loading: result.fetching,
    error: result.error,
  };
}

export function useRecentSwaps(poolAddress: string, limit: number = 10) {
  const [result] = useQuery({
    query: RECENT_SWAPS_QUERY,
    variables: { poolAddress, limit },
  });

  return {
    swaps: result.data?.swaps,
    loading: result.fetching,
    error: result.error,
  };
}
