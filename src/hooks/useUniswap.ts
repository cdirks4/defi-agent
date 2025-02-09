import { useQuery } from "urql";
import { useMemo } from "react";
import {
  Pool,
  PoolsResponse,
  SwapsResponse,
  TokensResponse,
} from "@/types/uniswap";
import { inMemoryCache } from "@/lib/inMemoryCache";

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
  query GetRecentSwaps($poolAddress: ID!) {
    swaps(
      where: { pool: $poolAddress }
      orderBy: timestamp
      orderDirection: desc
      first: 50
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
    context: useMemo(
      () => ({
        requestPolicy: "cache-and-network",
      }),
      []
    ),
  });

  const filteredPools = useMemo(() => {
    const cacheKey = "top_pools_filtered";
    const cached = inMemoryCache.get<Pool[]>(cacheKey);
    if (cached) return cached;

    const filtered =
      result.data?.pools?.filter((pool): pool is Pool =>
        Boolean(
          pool?.token0?.decimals &&
            pool?.token1?.decimals &&
            Number(pool.totalValueLockedUSD) > 0
        )
      ) || [];

    if (filtered.length > 0) {
      inMemoryCache.set(cacheKey, filtered, 30000); // 30 second cache
    }

    return filtered;
  }, [result.data?.pools]);

  return {
    pools: filteredPools,
    loading: result.fetching,
    error: result.error,
  };
}

export function usePoolData(poolAddress: string) {
  const variables = useMemo(
    () => ({ poolAddress: poolAddress || "" }),
    [poolAddress]
  );
  const context = useMemo(
    () => ({
      requestPolicy: "cache-and-network" as const,
    }),
    []
  );

  const [result] = useQuery<{ pool: Pool }>({
    query: POOL_DATA_QUERY,
    variables,
    context,
    pause: !poolAddress,
  });

  const validPool = useMemo(() => {
    if (!poolAddress) return null;

    const cacheKey = `pool_data:${poolAddress}`;
    const cached = inMemoryCache.get<Pool | null>(cacheKey);
    if (cached !== null) return cached;

    const valid =
      result.data?.pool &&
      result.data.pool.token0?.decimals &&
      result.data.pool.token1?.decimals
        ? result.data.pool
        : null;

    if (valid) {
      inMemoryCache.set(cacheKey, valid, 30000); // 30 second cache
    }

    return valid;
  }, [result.data?.pool, poolAddress]);

  return {
    data: validPool,
    loading: result.fetching,
    error: result.error,
  };
}

export function useRecentSwaps(poolAddress: string) {
  const variables = useMemo(
    () => ({ poolAddress: poolAddress || "" }),
    [poolAddress]
  );
  const context = useMemo(
    () => ({
      requestPolicy: "network-only" as const,
    }),
    []
  );

  const [result] = useQuery<SwapsResponse>({
    query: RECENT_SWAPS_QUERY,
    variables,
    context,
    pause: !poolAddress,
  });

  const filteredSwaps = useMemo(() => {
    if (!poolAddress) return [];

    const cacheKey = `recent_swaps:${poolAddress}`;
    const cached = inMemoryCache.get<SwapsResponse["swaps"]>(cacheKey);
    if (cached) return cached;

    const filtered =
      result.data?.swaps?.filter(
        (swap) => swap?.pool?.token0?.symbol && swap?.pool?.token1?.symbol
      ) || [];

    if (filtered.length > 0) {
      inMemoryCache.set(cacheKey, filtered, 15000); // 15 second cache for recent swaps
    }

    return filtered;
  }, [result.data?.swaps, poolAddress]);

  return {
    swaps: filteredSwaps,
    loading: result.fetching,
    error: result.error,
  };
}

export function useValidTokens() {
  const [result] = useQuery<TokensResponse>({
    query: VALID_TOKENS_QUERY,
    context: useMemo(
      () => ({
        requestPolicy: "cache-and-network",
      }),
      []
    ),
  });

  const filteredTokens = useMemo(() => {
    const cacheKey = "valid_tokens_filtered";
    const cached = inMemoryCache.get<TokensResponse["tokens"]>(cacheKey);
    if (cached) return cached;

    const filtered =
      result.data?.tokens?.filter(
        (token) => token?.decimals && Number(token.totalValueLockedUSD) > 0
      ) || [];

    if (filtered.length > 0) {
      inMemoryCache.set(cacheKey, filtered, 30000); // 30 second cache
    }

    return filtered;
  }, [result.data?.tokens]);

  return {
    tokens: filteredTokens,
    loading: result.fetching,
    error: result.error,
  };
}
