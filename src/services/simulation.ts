import {
  SimulationParams,
  SimulationResult,
  SimulationTrade,
  HistoricalTrade,
} from "@/types/simulation";
import { inMemoryCache } from "@/lib/inMemoryCache";
import { logger } from "@/lib/logger";
import {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  extractPricesFromTrades,
} from "@/lib/technicalIndicators";
import {
  makeTradeDecision,
  calculateTradeMetrics,
} from "@/utils/tradeSimulationHelper";
import { LlamaService } from "./llama";
import { uniswapService } from "./uniswap";
import { cacheService } from "./cache";
import { redis } from "./redis";
import {
  calculateSharpeRatio,
  calculateProfitFactor,
  calculateTransactionCosts,
  calculateAverageSlippage,
  calculateBenchmarkReturn,
  calculateBenchmarkProfitFactor,
  calculatePeriodicReturns,
} from "@/lib/backtestingMetrics";

class SimulationService {
  private readonly CACHE_TTL = {
    TRADES: 5 * 60 * 1000, // 5 minutes
    MARKET_CONTEXT: 60 * 1000, // 1 minute
  };

  private llamaService: LlamaService;

  constructor() {
    this.llamaService = new LlamaService({
      endpoint: process.env.LLAMA_API_ENDPOINT || "",
      context: { isSimulation: true },
    });
  }

  private async updateProgress(simulationId: string, progress: number) {
    try {
      const result = await redis.zadd(`simulation:${simulationId}:progress`, {
        score: Date.now(),
        member: JSON.stringify({ progress }),
      });

      if (result === null) {
        logger.warn(
          "Failed to update simulation progress in Redis, continuing simulation",
          {
            module: "simulation",
            method: "updateProgress",
            simulationId,
            progress,
          }
        );
      }
    } catch (error) {
      // Log the error but don't throw it - allow simulation to continue
      logger.error(
        "Failed to update simulation progress",
        {
          module: "simulation",
          method: "updateProgress",
          simulationId,
          progress,
        },
        error as Error
      );
    }
  }

  private sampleTrades(
    trades: HistoricalTrade[],
    params: SimulationParams
  ): HistoricalTrade[] {
    const startDate = new Date(params.startDate);
    const endDate = new Date(params.endDate);
    const durationInMinutes =
      (endDate.getTime() - startDate.getTime()) / (60 * 1000);

    // If duration is more than 60 minutes, sample the data
    if (durationInMinutes > 60) {
      const samplingInterval = params.samplingInterval || 5; // Default to 5-minute intervals
      const sampledTrades: HistoricalTrade[] = [];
      let currentInterval = new Date(startDate);

      while (currentInterval <= endDate) {
        const nextInterval = new Date(
          currentInterval.getTime() + samplingInterval * 60 * 1000
        );

        // Find trades in this interval
        const intervalTrades = trades.filter((trade) => {
          const tradeTime = new Date(trade.timestamp);
          return tradeTime >= currentInterval && tradeTime < nextInterval;
        });

        // If there are trades in this interval, take the most representative one
        if (intervalTrades.length > 0) {
          // Use the trade with the highest volume in this interval
          const mostSignificantTrade = intervalTrades.reduce(
            (prev, current) => {
              return parseFloat(current.amountUSD) > parseFloat(prev.amountUSD)
                ? current
                : prev;
            }
          );
          sampledTrades.push(mostSignificantTrade);
        }

        currentInterval = nextInterval;
      }

      logger.info(
        `Sampled ${trades.length} trades down to ${sampledTrades.length} trades`,
        {
          module: "simulation",
          method: "sampleTrades",
          originalCount: trades.length,
          sampledCount: sampledTrades.length,
          samplingInterval,
        }
      );

      return sampledTrades;
    }

    return trades;
  }

  public async runSimulation(
    params: SimulationParams
  ): Promise<SimulationResult> {
    const startTime = Date.now();
    const simulationId = `sim_${startTime}`;

    try {
      const context = {
        module: "simulation",
        method: "runSimulation",
        poolId: params.poolId,
        simulationType: params.simulateLive ? "live" : "historical",
        simulationId,
      };

      logger.info("Starting simulation", context);

      // Initial progress update - don't wait for it
      this.updateProgress(simulationId, 0).catch((error) => {
        logger.warn("Failed to update initial progress", {
          ...context,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      });

      // Fetch historical trades
      const trades = await this.getHistoricalTrades(params);
      if (!trades || trades.length === 0) {
        throw new Error("No historical trades found for the specified period");
      }

      // Sample trades for long periods
      const processedTrades = this.sampleTrades(trades, params);

      logger.info(`Found ${processedTrades.length} trades to process`, context);

      // Update progress after data fetching - don't wait for it
      this.updateProgress(simulationId, 20).catch((error) => {
        logger.warn("Failed to update progress after data fetching", {
          ...context,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      });

      // Process trades and generate simulation result
      const result = await this.processTradesAndGenerateResult(
        processedTrades,
        params,
        simulationId
      );

      const duration = Date.now() - startTime;
      logger.info(`Simulation completed in ${duration}ms`, {
        ...context,
        tradesProcessed: processedTrades.length,
        simulatedTrades: result.trades.length,
      });

      // Final progress update - don't wait for it
      this.updateProgress(simulationId, 100).catch((error) => {
        logger.warn("Failed to update final progress", {
          ...context,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      });

      return {
        ...result,
        simulationId,
        progress: 100,
        isRunning: false,
      };
    } catch (error) {
      logger.error("Simulation failed", context, error as Error);
      throw error;
    }
  }

  private async getHistoricalTrades(
    params: SimulationParams
  ): Promise<HistoricalTrade[]> {
    const cacheKey = `historical_trades:${params.poolId}:${params.startDate}`;
    const cached = inMemoryCache.get<HistoricalTrade[]>(cacheKey);

    if (cached) {
      logger.debug("Retrieved historical trades from cache", {
        module: "simulation",
        method: "getHistoricalTrades",
        tradesCount: cached.length,
      });
      return cached;
    }

    const trades = await uniswapService.getHistoricalTrades(
      params.poolId,
      params.startDate,
      params.endDate
    );

    if (trades && trades.length > 0) {
      inMemoryCache.set(cacheKey, trades, this.CACHE_TTL.TRADES);
      logger.info(`Found and cached ${trades.length} trades`);
    }

    return trades;
  }

  private async processTradesAndGenerateResult(
    trades: HistoricalTrade[],
    params: SimulationParams,
    simulationId: string
  ): Promise<SimulationResult> {
    const marketContext = await this.getMarketContext(trades);

    // Update progress after computing technical indicators
    await this.updateProgress(simulationId, 60).catch((error) => {
      logger.warn("Failed to update progress during processing", {
        module: "simulation",
        method: "processTradesAndGenerateResult",
        simulationId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    });

    const simulatedTrades: SimulationTrade[] = [];
    let lastSimulatedTrade: SimulationTrade | undefined;

    // Process each historical trade
    for (const trade of trades) {
      const tradeDecision = makeTradeDecision(
        trade,
        marketContext.technicalIndicators,
        params.strategyConfig || {
          strategy: "momentum",
          stopLoss: 0.2,
          takeProfit: 0.5,
          tradeSizeScaling: 1.0,
        },
        lastSimulatedTrade
      );

      if (tradeDecision.shouldTrade && tradeDecision.type) {
        const simulatedTrade: SimulationTrade = {
          timestamp: trade.timestamp,
          type: tradeDecision.type,
          price: trade.price,
          amount: (
            parseFloat(params.tradeSize?.toString() || "0.1") *
            (params.strategyConfig?.tradeSizeScaling || 1.0)
          ).toString(),
          confidence: tradeDecision.confidence,
          reasoning: tradeDecision.reasoning,
        };

        // Calculate profit if this is a closing trade
        if (lastSimulatedTrade) {
          const tradeAmount = parseFloat(simulatedTrade.amount);
          const profitMultiplier = lastSimulatedTrade.type === "BUY" ? 1 : -1;
          simulatedTrade.profit =
            profitMultiplier *
            tradeAmount *
            (simulatedTrade.price - lastSimulatedTrade.price);
        }

        simulatedTrades.push(simulatedTrade);
        lastSimulatedTrade = simulatedTrade;

        // Cache the simulated trade
        await cacheService.cacheSimulatedTrade(simulatedTrade, {
          simulationId,
          poolId: params.poolId,
        });
      }
    }

    // Update progress after processing trades
    await this.updateProgress(simulationId, 80).catch((error) => {
      logger.warn("Failed to update progress after processing", {
        module: "simulation",
        method: "processTradesAndGenerateResult",
        simulationId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    });

    // Calculate metrics
    const tradeMetrics = calculateTradeMetrics(simulatedTrades);
    const returns = calculatePeriodicReturns(simulatedTrades);
    const firstPrice = trades[0]?.price || 0;
    const lastPrice = trades[trades.length - 1]?.price || 0;

    const metrics = {
      totalTrades: simulatedTrades.length,
      successfulTrades: tradeMetrics.successfulTrades,
      totalProfit: tradeMetrics.totalProfit,
      winRate: tradeMetrics.winRate,
      averageReturn: tradeMetrics.averageReturn,
      maxDrawdown: tradeMetrics.maxDrawdown,
      sharpeRatio: calculateSharpeRatio(returns),
      profitFactor: calculateProfitFactor(simulatedTrades),
      totalTransactionCost: calculateTransactionCosts(simulatedTrades),
      averageSlippage: calculateAverageSlippage(simulatedTrades),
      benchmarkReturn: calculateBenchmarkReturn(firstPrice, lastPrice),
      benchmarkProfitFactor: calculateBenchmarkProfitFactor(
        firstPrice,
        lastPrice
      ),
    };

    logger.info("Simulation processing completed", {
      module: "simulation",
      method: "processTradesAndGenerateResult",
      simulationId,
      totalTrades: metrics.totalTrades,
      successRate: metrics.winRate.toFixed(2) + "%",
      totalProfit: metrics.totalProfit.toFixed(2),
    });

    return {
      trades: simulatedTrades,
      linkedHistoricalTrades: trades,
      simulationId,
      metrics,
      marketContext,
      simulationDuration: params.simulationDuration || 15,
      isLiveSimulation: params.simulateLive || false,
      progress: 90,
      isRunning: true,
    };
  }

  private async getMarketContext(trades: any[]) {
    const prices = extractPricesFromTrades(trades);

    // Check if we have enough price data for technical analysis
    if (prices.length < 2) {
      logger.warn("Insufficient price data for technical analysis", {
        module: "simulation",
        method: "getMarketContext",
        pricesCount: prices.length,
      });

      // Return empty arrays for all technical indicators
      return {
        averageSpread: 0,
        volatility: 0,
        volume: trades.reduce(
          (sum, trade) => sum + parseFloat(trade.amountUSD),
          0
        ),
        technicalIndicators: {
          sma: [],
          ema: [],
          rsi: [],
          macd: { macdLine: [], signalLine: [], histogram: [] },
          bollingerBands: { upper: [], middle: [], lower: [] },
        },
      };
    }

    return {
      averageSpread: 0, // Placeholder - implement actual spread calculation
      volatility: 0, // Placeholder - implement actual volatility calculation
      volume: trades.reduce(
        (sum, trade) => sum + parseFloat(trade.amountUSD),
        0
      ),
      technicalIndicators: {
        sma: calculateSMA(prices, 20),
        ema: calculateEMA(prices, 20),
        rsi: calculateRSI(prices, 14),
        macd: calculateMACD(prices),
        bollingerBands: calculateBollingerBands(prices, 20, 2),
      },
    };
  }
}

export const simulationService = new SimulationService();
