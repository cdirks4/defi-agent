import { uniswapService } from "./uniswap";
import { tradingService } from "./trading";
import { cacheService } from "./cache";
import { redis } from "./redis";

// Add interface for cached decision type
interface CachedDecision {
  timestamp: number;
  analysis: any;
  selectedToken: {
    address: string;
    symbol: string;
    amount: string;
  };
}

export class AgentDecisionService {
  private readonly DECISION_TIMEOUT = 20000;
  private readonly MIN_LIQUIDITY = 100000;

  async makeTradeDecision(userId: string): Promise<{
    decision: string;
    selectedToken?: {
      address: string;
      symbol: string;
      amount: string;
    };
  }> {
    const startTime = Date.now();

    try {
      // Check cache with error handling
      try {
        const cachedDecisionStr = await redis.get(`last_decision:${userId}`);
        if (cachedDecisionStr) {
          try {
            const cachedDecision = JSON.parse(
              typeof cachedDecisionStr === 'string' ? cachedDecisionStr : JSON.stringify(cachedDecisionStr)
            ) as CachedDecision;
            
            if (cachedDecision.timestamp && Date.now() - cachedDecision.timestamp < 60000) {
              console.log("Using cached decision for user:", userId);
              return {
                decision: "CACHED",
                selectedToken: cachedDecision.selectedToken,
              };
            }
          } catch (parseError) {
            console.error("Failed to parse cached decision:", parseError);
            // Continue with fresh analysis if cache parsing fails
          }
        }
      } catch (cacheError) {
        console.error("Cache retrieval error:", cacheError);
        // Continue with fresh analysis if cache access fails
      }

      // Fetch both pool and token data with error handling
      const [poolData, recentSwaps] = await Promise.allSettled([
        uniswapService.getPoolData().catch(error => {
          console.error("Pool data fetch failed:", error);
          return { inputTokens: [] };
        }),
        uniswapService.getRecentSwaps(20).catch(error => {
          console.error("Recent swaps fetch failed:", error);
          return [];
        })
      ]);

      const tokens = poolData.status === 'fulfilled' ? poolData.value.inputTokens : [];
      const swaps = recentSwaps.status === 'fulfilled' ? recentSwaps.value : [];

      if (!tokens.length) {
        console.log("No valid tokens found in pool data");
        return { decision: "ERROR - No valid tokens found" };
      }

      // Pre-filter tokens to avoid analyzing invalid data
      const validTokens = tokens.filter(token => {
        try {
          const tvl = parseFloat(token.totalValueLockedUSD);
          const isValid = token.id &&
            token.symbol &&
            tvl > this.MIN_LIQUIDITY &&
            token.priceUSD &&
            parseFloat(token.priceUSD) > 0;
          
          if (!isValid) {
            console.log("Filtered out invalid token:", token.symbol || token.id);
          }
          return isValid;
        } catch (filterError) {
          console.error("Token filtering error:", filterError);
          return false;
        }
      });

      if (!validTokens.length) {
        return { decision: "NO_TRADE - No tokens meet criteria" };
      }

      // Analyze market conditions with validated token data
      const analysis = await this.analyzeMarketData(validTokens, swaps);

      if (Date.now() - startTime > this.DECISION_TIMEOUT) {
        return { decision: "TIMEOUT - No trade executed" };
      }

      const selectedToken = this.selectBestToken(analysis);

      if (!selectedToken) {
        return { decision: "NO_TRADE - Market conditions unfavorable" };
      }

      const decision = {
        decision: "TRADE",
        selectedToken: {
          address: selectedToken.id,
          symbol: selectedToken.symbol,
          amount: "0.01", // Reduced amount for safer testing
        },
      };

      // Cache the successful decision with error handling
      try {
        await redis.set(
          `last_decision:${userId}`,
          JSON.stringify({
            timestamp: Date.now(),
            analysis,
            selectedToken: decision.selectedToken,
          }),
          { ex: 300 }
        );
      } catch (cacheError) {
        console.error("Failed to cache decision:", cacheError);
        // Continue without caching
      }

      return decision;

    } catch (error) {
      console.error("Decision making failed:", error);
      try {
        const cachedDecisionStr = await redis.get(`last_decision:${userId}`);
        if (cachedDecisionStr) {
          const cachedDecision = JSON.parse(
            typeof cachedDecisionStr === 'string' ? cachedDecisionStr : JSON.stringify(cachedDecisionStr)
          ) as CachedDecision;
          if (cachedDecision.selectedToken) {
            return {
              decision: "CACHED_FALLBACK",
              selectedToken: cachedDecision.selectedToken,
            };
          }
        }
      } catch (fallbackError) {
        console.error("Fallback cache retrieval failed:", fallbackError);
      }
      return { decision: "ERROR - Could not analyze market" };
    }
  }

  private async analyzeMarketData(tokens: any[], recentSwaps: any[]) {
    try {
      const analysis = tokens
        .filter(token => {
          try {
            const isValid = token.id &&
              token.symbol &&
              token.volumeUSD &&
              token.totalValueLockedUSD &&
              parseFloat(token.volumeUSD) > 0 &&
              parseFloat(token.totalValueLockedUSD) > 0;
            
            if (!isValid) {
              console.log("Invalid token data during analysis:", token);
            }
            return isValid;
          } catch (validationError) {
            console.error("Token validation error:", validationError);
            return false;
          }
        })
        .map(token => {
          try {
            return {
              symbol: token.symbol,
              id: token.id,
              score: this.calculateTokenScore(token, recentSwaps),
              priceUSD: token.priceUSD,
              volume24h: token.volumeUSD,
              tvl: token.totalValueLockedUSD,
            };
          } catch (mappingError) {
            console.error("Token mapping error:", mappingError);
            return null;
          }
        })
        .filter(Boolean);

      return analysis.sort((a, b) => b.score - a.score);
    } catch (error) {
      console.error("Market data analysis failed:", error);
      return [];
    }
  }

  private calculateTokenScore(token: any, recentSwaps: any[]) {
    try {
      // Normalize values to prevent extreme scores
      const volumeUSD = parseFloat(token.volumeUSD);
      const tvlUSD = parseFloat(token.totalValueLockedUSD);
      
      if (isNaN(volumeUSD) || isNaN(tvlUSD)) {
        console.error("Invalid numeric values for token:", token.symbol);
        return 0;
      }

      const volumeScore = Math.min(volumeUSD / 1000000, 10);
      const liquidityScore = Math.min(tvlUSD / 1000000, 10);

      // Count recent swaps involving this token
      const recentSwapCount = recentSwaps.filter(
        swap => 
          (swap.token0?.symbol === token.symbol) ||
          (swap.token1?.symbol === token.symbol)
      ).length;

      const swapScore = Math.min(recentSwapCount / 2, 5);

      return (volumeScore * 0.4) + (liquidityScore * 0.4) + (swapScore * 0.2);
    } catch (error) {
      console.error("Score calculation failed for token:", token.symbol, error);
      return 0;
    }
  }

  private selectBestToken(analysis: any[]) {
    try {
      return analysis.find(token => {
        const volume24h = parseFloat(token.volume24h);
        const tvl = parseFloat(token.tvl);
        
        if (isNaN(volume24h) || isNaN(tvl)) {
          console.error("Invalid numeric values in best token selection:", token);
          return false;
        }

        return token.score > 1.0 && 
          volume24h > 100000 && // Minimum 100k daily volume
          tvl > 500000; // Minimum 500k TVL
      });
    } catch (error) {
      console.error("Best token selection failed:", error);
      return null;
    }
  }
}

export const agentDecisionService = new AgentDecisionService();
