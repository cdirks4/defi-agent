import { createClient } from "urql";
import { cacheExchange, fetchExchange } from "@urql/core";
import { SUBGRAPH_URLS } from "@/lib/constants";

interface Token {
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
}

interface TokensResponse {
  tokens: Token[];
}

class UniswapService {
  private client;

  constructor() {
    this.client = createClient({
      url: SUBGRAPH_URLS[
        (process.env.NEXT_PUBLIC_CHAIN as keyof typeof SUBGRAPH_URLS) ||
          "TESTNET"
      ],
      exchanges: [cacheExchange, fetchExchange],
    });
  }

  async getTokens(): Promise<Token[]> {
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

    return data.tokens.filter(
      (token) =>
        token.id &&
        token.symbol &&
        token.decimals &&
        Number(token.totalValueLockedUSD) > 100000 &&
        Number(token.volumeUSD) > 10000
    );
  }

  async getPoolData() {
    try {
      const tokens = await this.getTokens();

      if (!tokens || !Array.isArray(tokens)) {
        throw new Error("Invalid token data received");
      }

      // Get ETH price from a reliable pool
      const ethPrice = 2000; // In production, fetch this from an oracle

      // Map tokens to include USD prices and filter out any with invalid derivedETH
      const inputTokens = tokens
        .filter((token) => 
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

      return {
        inputTokens,
      };
    } catch (error) {
      console.error("Failed to fetch pool data:", error);
      return { inputTokens: [] };
    }
  }

  async getRecentSwaps(limit: number = 10) {
    const query = `
      query {
        swaps(
          first: ${limit},
          orderBy: timestamp,
          orderDirection: desc,
          where: { amountUSD_gt: "10000" }
        ) {
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
        }
      }
    `;

    const { data, error } = await this.client.query(query, {}).toPromise();

    if (error) throw new Error(`Failed to fetch swaps: ${error.message}`);
    return data?.swaps || [];
  }

  async getPoolMetrics(
    poolAddress: string = "0x7e8f317a45d67e27e095436d2e0d47171e7c769f",
    days: number = 7
  ) {
    const timestamp = Math.floor((Date.now() - days * 86400 * 1000) / 1000);

    const query = `
      query GetPoolMetrics($poolAddress: String!, $timestamp: Int!) {
        liquidityPoolDailySnapshots(
          where: { 
            pool: $poolAddress,
            timestamp_gt: $timestamp
          }
          orderBy: timestamp
          orderDirection: asc
        ) {
          timestamp
          totalValueLockedUSD
          dailyVolumeUSD
          dailySupplySideRevenueUSD
          inputTokenPrices
        }
      }
    `;

    const { data, error } = await this.client
      .query(query, { poolAddress, timestamp })
      .toPromise();

    if (error)
      throw new Error(`Failed to fetch pool metrics: ${error.message}`);
    return data.liquidityPoolDailySnapshots;
  }
}

export const uniswapService = new UniswapService();
