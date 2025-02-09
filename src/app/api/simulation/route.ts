import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { LlamaService } from "@/services/llama";
import { uniswapService } from "@/services/uniswap";
import { redis } from "@/services/redis";
import { SimulationParams, SimulationResult } from "@/types/simulation";

interface TradeMetrics {
  type: "BUY" | "SELL";
  amount: number;
  price: number;
  timestamp: number;
  confidence: number;
}

const llama = new LlamaService({
  endpoint: process.env.LLAMA_API_ENDPOINT!,
  apiKey: process.env.LLAMA_API_KEY,
  context: { isSimulation: true },
});

// Trading decision prompt template with more market context
const TRADING_PROMPT = `As a DeFi trading expert, analyze the current market conditions and make a trading decision.

Current market conditions:
- Current Price: $\${price}
- 24h Volume: $\${volume}
- Total Liquidity: $\${liquidity}
- Recent trend: \${trend}
- Price Change: \${priceChange}%

Technical Indicators:
- RSI: \${rsi}
- MACD Signal: \${macdSignal}

Output a JSON response with:
{
  "decision": "BUY" or "SELL",
  "confidence": number between 0-1,
  "reasoning": "brief explanation"
}`;

export async function POST(req: NextRequest) {
  try {
    const params = await req.json();
    const simulationId = `sim_${Date.now()}`;
    const poolId =
      params.poolId || "0x7e8f317a45d67e27e095436d2e0d47171e7c769f";

    // Store simulation metadata
    await redis.set(
      `simulation:${simulationId}:metadata`,
      JSON.stringify({
        id: simulationId,
        poolId,
        startTime: Date.now(),
        params,
      })
    );

    // Add to simulations index
    await redis.zadd("simulations:index", {
      score: Date.now(),
      member: simulationId,
    });

    // For live simulations, return immediately
    if (params.simulateLive) {
      return NextResponse.json({
        simulationId,
        poolId,
        message: "Live simulation started",
      });
    }

    // Get pool data
    const poolData = await uniswapService.getPoolData(poolId);
    if (!poolData) {
      throw new Error("Pool data not available");
    }

    // Create a simple simulation result
    const result: SimulationResult = {
      simulationId,
      trades: [],
      metrics: {
        totalTrades: 0,
        successfulTrades: 0,
        totalProfit: 0,
        winRate: 0,
        averageReturn: 0,
        maxDrawdown: 0,
        sharpeRatio: 0,
        profitFactor: 1,
        totalTransactionCost: 0,
        averageSlippage: 0,
        benchmarkReturn: 0,
        benchmarkProfitFactor: 1,
      },
      marketContext: {
        averageSpread: parseFloat(poolData.feeTier) / 10000,
        volatility: 0,
        volume: parseFloat(poolData.volumeUSD),
        technicalIndicators: {
          sma: [],
          ema: [],
          rsi: [],
          macd: { macdLine: [], signalLine: [], histogram: [] },
          bollingerBands: { upper: [], middle: [], lower: [] },
        },
      },
      isLiveSimulation: params.simulateLive || false,
      simulationDuration: params.simulationDuration || 15,
      progress: 100,
    };

    return NextResponse.json(result);
  } catch (error) {
    logger.error("Simulation request failed", {
      module: "api",
      method: "simulation",
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { error: "Failed to run simulation" },
      { status: 500 }
    );
  }
}

// Update helper function signatures with proper types
function calculateTotalReturn(trades: TradeMetrics[]): number {
  return trades.reduce((total, trade) => {
    const multiplier = trade.type === "BUY" ? 1 : -1;
    return total + multiplier * trade.amount * trade.price;
  }, 0);
}

function calculateSharpeRatio(
  trades: TradeMetrics[],
  prices: number[]
): number {
  const returns = trades.map((trade) => {
    const multiplier = trade.type === "BUY" ? 1 : -1;
    return multiplier * trade.amount * trade.price;
  });

  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const stdDev = Math.sqrt(
    returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) /
      returns.length
  );

  return stdDev === 0 ? 0 : avgReturn / stdDev;
}

function calculateMaxDrawdown(trades: TradeMetrics[]): number {
  let peak = -Infinity;
  let maxDrawdown = 0;
  let runningTotal = 0;

  trades.forEach((trade) => {
    const multiplier = trade.type === "BUY" ? 1 : -1;
    runningTotal += multiplier * trade.amount * trade.price;
    peak = Math.max(peak, runningTotal);
    maxDrawdown = Math.max(maxDrawdown, peak - runningTotal);
  });

  return maxDrawdown;
}

function calculateWinRate(trades: TradeMetrics[]): number {
  if (trades.length === 0) return 0;
  const winningTrades = trades.filter((trade) => {
    const multiplier = trade.type === "BUY" ? 1 : -1;
    return multiplier * trade.amount * trade.price > 0;
  });
  return (winningTrades.length / trades.length) * 100;
}

// Technical analysis helper functions
function calculateRSI(prices: number[], period = 14): number {
  if (prices.length < period + 1) return 50;
  // ... RSI calculation logic
  return 50; // Placeholder
}

function calculateMACD(prices: number[]) {
  // ... MACD calculation logic
  return {
    macdLine: prices.map((p, i) => i * 0.1),
    signalLine: prices.map((p, i) => i * 0.08),
    histogram: prices.map((p, i) => 0.02),
  };
}

function calculateSMA(prices: number[]): number[] {
  // ... SMA calculation logic
  return prices.map((p, i) => p * 1.01);
}

function calculateEMA(prices: number[]): number[] {
  // ... EMA calculation logic
  return prices.map((p, i) => p * 1.02);
}

function calculateBollingerBands(
  prices: number[],
  period: number,
  stdDev: number
) {
  // ... Bollinger Bands calculation logic
  return {
    upper: prices.map((p) => p * 1.1),
    middle: prices,
    lower: prices.map((p) => p * 0.9),
  };
}

function calculateAveragePriceChange(prices: number[]): number {
  if (prices.length < 2) return 0;
  const changes = prices
    .slice(1)
    .map((price, i) => (price - prices[i]) / prices[i]);
  return changes.reduce((sum, change) => sum + change, 0) / changes.length;
}
