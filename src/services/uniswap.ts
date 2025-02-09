import { createClient } from "urql";
import { cacheExchange, fetchExchange } from "@urql/core";
import { SUBGRAPH_URLS } from "@/lib/constants";
import {
  Token,
  TokensResponse,
  Swap,
  Pool,
  PoolDayData,
} from "@/types/uniswap";
import { mapTokenAddress } from "@/lib/tokenAddressMapping";
import { inMemoryCache } from "@/lib/inMemoryCache";

class UniswapService {
  private client;
  private readonly CACHE_TTL = 30000; // 30 seconds cache for market data
  private readonly HISTORICAL_CACHE_TTL = 300000; // 5 minutes for historical data

  constructor() {
    this.client = createClient({
      url: SUBGRAPH_URLS["arbitrum-sepolia"],
      exchanges: [cacheExchange, fetchExchange] as const,
    });
  }

  async getTokenPairs() {
    const cacheKey = "token_pairs";
    const cached = inMemoryCache.get<Pool[]>(cacheKey);
    if (cached) return cached;

    const query = `
      query {
        pools(
          first: 100,
          orderBy: totalValueLockedUSD,
          orderDirection: desc,
          where: {
            volumeUSD_gt: "100000"
          }
        ) {
          id
          token0 {
            id
            symbol
            decimals
          }
          token1 {
            id
            symbol
            decimals
          }
          totalValueLockedUSD
          volumeUSD
        }
      }
    `;

    const { data, error } = await this.client.query(query, {}).toPromise();

    if (error) throw new Error(`Failed to fetch pools: ${error.message}`);
    const pools = data?.pools || [];
    inMemoryCache.set(cacheKey, pools, this.CACHE_TTL);
    return pools;
  }

  async getTokens(): Promise<Token[]> {
    const cacheKey = "tokens";
    const cached = inMemoryCache.get<Token[]>(cacheKey);
    if (cached) return cached;

    const query = `
      query {
        tokens(
          first: 10,
          orderBy: totalValueLockedUSD,
          orderDirection: desc,
          where: { 
            volumeUSD_gt: "100000",
            totalValueLockedUSD_gt: "100000"
          }
        ) {
          id
          symbol
          name
          decimals
          totalSupply
          volume
          volumeUSD
          feesUSD
          txCount
          poolCount
          totalValueLocked
          totalValueLockedUSD
          derivedETH
        }
      }
    `;

    const { data, error } = await this.client
      .query<TokensResponse>(query, {})
      .toPromise();
    if (error) throw new Error(`Failed to fetch tokens: ${error.message}`);
    if (!data?.tokens) return [];

    const tokens = data.tokens
      .filter(
        (token) =>
          token.id &&
          token.symbol &&
          token.decimals &&
          Number(token.totalValueLockedUSD) > 100000 &&
          Number(token.volumeUSD) > 10000
      )
      .map((token) => ({
        ...token,
        address: token.id,
      }));

    inMemoryCache.set(cacheKey, tokens, this.CACHE_TTL);
    return tokens;
  }

  async getHistoricalTrades(poolId: string, startDate: string) {
    const cacheKey = `historical_trades:${poolId}:${startDate}`;
    const cached = inMemoryCache.get<Swap[]>(cacheKey);
    if (cached) return cached;

    const swapsQuery = `
      query GetHistoricalTrades($poolId: ID!) {
        pool(id: $poolId) {
          swaps(
            first: 100,
            orderBy: timestamp,
            orderDirection: desc
          ) {
            id
            timestamp
            amount0
            amount1
            amountUSD
            pool {
              token0 {
                symbol
                decimals
              }
              token1 {
                symbol
                decimals
              }
            }
          }
        }
      }
    `;

    const { data, error } = await this.client
      .query(swapsQuery, { poolId })
      .toPromise();

    if (error)
      throw new Error(`Failed to fetch historical trades: ${error.message}`);

    const swaps = data?.pool?.swaps || [];
    inMemoryCache.set(cacheKey, swaps, this.HISTORICAL_CACHE_TTL);
    return swaps;
  }

  async getPoolData() {
    const cacheKey = "pool_data";
    const cached = inMemoryCache.get<Pool>(cacheKey);
    if (cached) return cached;

    try {
      const tokens = await this.getTokens();

      if (!tokens || !Array.isArray(tokens)) {
        throw new Error("Invalid token data received");
      }

      const ethPrice = 2000;

      const inputTokens = tokens
        .filter(
          (token) =>
            token &&
            token.id &&
            token.symbol &&
            Number(token.derivedETH) > 0 &&
            Number(token.totalValueLockedUSD) > 0
        )
        .map((token) => ({
          ...token,
          priceUSD: (Number(token.derivedETH) * ethPrice).toString(),
        }));

      if (!inputTokens.length) {
        throw new Error("No valid tokens found");
      }

      const result = { inputTokens };
      inMemoryCache.set(cacheKey, result, this.CACHE_TTL);
      return result;
    } catch (error) {
      console.error("Failed to fetch pool data:", error);
      return { inputTokens: [] };
    }
  }

  async getRecentSwaps(limit: number = 10): Promise<Swap[]> {
    const cacheKey = `recent_swaps:${limit}`;
    const cached = inMemoryCache.get<Swap[]>(cacheKey);
    if (cached) return cached;

    const query = `
      query {
        swaps(
          first: ${limit},
          orderBy: timestamp,
          orderDirection: desc,
          where: { amountUSD_gt: "10000" }
        ) {
          id
          timestamp
          token0 {
            symbol
          }
          token1 {
            symbol
          }
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

    const { data, error } = await this.client.query(query, {}).toPromise();

    if (error) throw new Error(`Failed to fetch swaps: ${error.message}`);
    const swaps = data?.swaps || [];
    inMemoryCache.set(cacheKey, swaps, this.CACHE_TTL);
    return swaps;
  }

  async getPoolMetrics(poolId: string, days: number = 7) {
    const cacheKey = `pool_metrics:${poolId}:${days}`;
    const cached = inMemoryCache.get<PoolDayData[]>(cacheKey);
    if (cached) return cached;

    const timestamp = Math.floor((Date.now() - days * 86400 * 1000) / 1000);

    const query = `
      query GetPoolMetrics($poolId: ID!, $timestamp: Int!) {
        pool(id: $poolId) {
          poolDayData(
            where: { date_gt: $timestamp }
            orderBy: date
            orderDirection: asc
          ) {
            date
            tvlUSD
            volumeUSD
            feesUSD
            token0Price
            token1Price
            high
            low
            close
          }
        }
      }
    `;

    const { data, error } = await this.client
      .query(query, { poolId, timestamp })
      .toPromise();

    if (error)
      throw new Error(`Failed to fetch pool metrics: ${error.message}`);

    const metrics = data?.pool?.poolDayData || [];
    inMemoryCache.set(cacheKey, metrics, this.HISTORICAL_CACHE_TTL);
    return metrics;
  }
}

export const uniswapService = new UniswapService();
