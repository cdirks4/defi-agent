import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { tradingService } from "@/services/trading";
import { agentKit } from "@/services/agentkit";
import Button from "./base/Button";
import Spinner from "./base/Spinner";
import { useWebSocket } from "@/hooks/useWebSocket";
import { createEmbedding } from "@/services/embedding";
import { uniswapService } from "@/services/uniswap";
import { TOKEN_ADDRESSES } from "@/lib/constants";

interface Trade {
  timestamp: string;
  amount0: string;
  amount1: string;
  amountUSD: string;
  type: "buy" | "sell";
  price: number;
}

interface SpreadTradingInterfaceProps {
  trades: Trade[];
}

interface TradeWindow {
  startTime: string;
  endTime: string;
  avgSpread: number;
  confidence: number;
  predictedDirection: "buy" | "sell";
}

const WETH_ADDRESS = TOKEN_ADDRESSES["arbitrum-sepolia"].WETH;
const USDC_ADDRESS = TOKEN_ADDRESSES["arbitrum-sepolia"].USDC;

export default function SpreadTradingInterface({
  trades,
}: SpreadTradingInterfaceProps) {
  const { user } = usePrivy();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isTrading, setIsTrading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decision, setDecision] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [tradeWindows, setTradeWindows] = useState<TradeWindow[]>([]);
  const [lastTradeTime, setLastTradeTime] = useState<Date | null>(null);
  const [historicalContext, setHistoricalContext] = useState<any[]>([]);

  // WebSocket connection for real-time data
  const { data: realtimeSwaps } = useWebSocket({
    endpoint: `https://gateway.thegraph.com/api/1055d3690bf5a07d168419b363ea550d/subgraphs/id/5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV`,
    query: `
      subscription {
        swaps(where: {
          token0: "${WETH_ADDRESS}",
          token1: "${USDC_ADDRESS}"
        }) {
          timestamp
          amount0
          amount1
          amountUSD
        }
      }
    `,
  });

  const calculateSpread = (windowTrades?: Trade[]): number => {
    const tradesToAnalyze = windowTrades || trades;
    if (!tradesToAnalyze || tradesToAnalyze.length < 2) return 0;

    const recentTrades = tradesToAnalyze.slice(-2);
    const prices = recentTrades.map((t) => t.price);
    const spread = (Math.abs(prices[0] - prices[1]) / prices[0]) * 100;
    return spread;
  };

  const compareWithHistory = async (
    windowTrades: Trade[],
    historicalPatterns: any[]
  ): Promise<number> => {
    if (!windowTrades.length || !historicalPatterns.length) return 0;

    const windowPattern = await createEmbedding(
      windowTrades.map((t) => ({
        price: t.price,
        volume: parseFloat(t.amountUSD),
      }))
    );

    // Calculate cosine similarity with historical patterns
    const similarities = historicalPatterns.map((pattern) => {
      const dotProduct = pattern.reduce(
        (sum: number, val: number, i: number) =>
          sum + val * (windowPattern[i] || 0),
        0
      );
      const magnitude1 = Math.sqrt(
        pattern.reduce((sum: number, val: number) => sum + val * val, 0)
      );
      const magnitude2 = Math.sqrt(
        windowPattern.reduce((sum: number, val: number) => sum + val * val, 0)
      );
      return dotProduct / (magnitude1 * magnitude2);
    });

    return Math.max(...similarities);
  };

  const predictTradeDirection = (windowTrades: Trade[]): "buy" | "sell" => {
    if (!windowTrades.length) return "buy";

    const priceChanges = windowTrades
      .slice(1)
      .map((trade, i) => trade.price - windowTrades[i].price);

    const averageChange =
      priceChanges.reduce((sum, change) => sum + change, 0) /
      priceChanges.length;
    return averageChange > 0 ? "buy" : "sell";
  };

  const calculateVolume = (trades: Trade[]): number => {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return trades
      .filter((t) => new Date(t.timestamp).getTime() > oneDayAgo)
      .reduce((sum, trade) => sum + parseFloat(trade.amountUSD), 0);
  };

  const calculateVolatility = (trades: Trade[]): number => {
    if (trades.length < 2) return 0;

    const returns = trades
      .slice(1)
      .map((trade, i) => (trade.price - trades[i].price) / trades[i].price);

    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const squaredDiffs = returns.map((ret) => Math.pow(ret - mean, 2));
    const variance =
      squaredDiffs.reduce((sum, diff) => sum + diff, 0) / returns.length;

    return Math.sqrt(variance);
  };

  const calculateOptimalAmount = (window: TradeWindow): string => {
    // Base amount on spread size and confidence
    const baseAmount = 0.1; // 0.1 ETH base
    const spreadMultiplier = window.avgSpread > 1 ? 1.5 : 1;
    const confidenceMultiplier = window.confidence;

    const optimalAmount = baseAmount * spreadMultiplier * confidenceMultiplier;
    return optimalAmount.toFixed(4);
  };

  const handleAnalyzeAndTrade = async () => {
    if (!user?.id) return;

    try {
      setIsAnalyzing(true);
      setError(null);

      // Analyze current market conditions
      const currentSpread = calculateSpread();
      const currentVolatility = calculateVolatility(trades);

      const analysis = {
        spread: currentSpread,
        volatility: currentVolatility,
        volume24h: calculateVolume(trades),
        recommendedAction:
          currentSpread > 0.5 && currentVolatility < 0.1 ? "TRADE" : "WAIT",
      };

      setDecision(analysis);

      if (analysis.recommendedAction === "TRADE") {
        setIsTrading(true);
        const tradeResult = await tradingService.purchaseToken({
          userId: user.id,
          tokenAddress: WETH_ADDRESS,
          amount: "0.1",
          maxSlippage: 0.05,
        });
        setResult(tradeResult);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
      setIsTrading(false);
    }
  };

  useEffect(() => {
    const loadHistoricalContext = async () => {
      const historicalTrades = await uniswapService.getHistoricalTrades(
        "WETH",
        "USDC",
        "30d"
      );
      const patterns = await createEmbedding(historicalTrades);
      setHistoricalContext(patterns);
    };

    loadHistoricalContext();
  }, []);

  useEffect(() => {
    if (realtimeSwaps) {
      const updatedTrades = [...trades, ...realtimeSwaps].slice(-50);
      findTradeWindows(updatedTrades);
    }
  }, [realtimeSwaps]);

  const findTradeWindows = async (currentTrades: Trade[]) => {
    const windows: TradeWindow[] = [];
    const windowSize = 5;

    for (let i = 0; i < currentTrades.length - windowSize; i++) {
      const windowTrades = currentTrades.slice(i, i + windowSize);
      const spread = calculateSpread(windowTrades);

      const similarity = await compareWithHistory(
        windowTrades,
        historicalContext
      );

      if (spread > 0.5 && similarity > 0.8) {
        windows.push({
          startTime: windowTrades[0].timestamp,
          endTime: windowTrades[windowTrades.length - 1].timestamp,
          avgSpread: spread,
          confidence: similarity,
          predictedDirection: predictTradeDirection(windowTrades),
        });
      }
    }

    setTradeWindows(windows);
  };

  const executeQuickTrade = async (window: TradeWindow) => {
    if (!user?.id || Date.now() - (lastTradeTime?.getTime() || 0) < 30000) {
      return;
    }

    try {
      setIsTrading(true);
      await agentKit.connectWallet(user.id, false);

      const tradeResult = await tradingService.purchaseToken({
        userId: user.id,
        tokenAddress:
          window.predictedDirection === "buy" ? WETH_ADDRESS : USDC_ADDRESS,
        amount: calculateOptimalAmount(window),
        maxSlippage: 0.05,
      });

      setResult(tradeResult);
      setLastTradeTime(new Date());
    } catch (err: any) {
      setError(`Quick trade failed: ${err.message}`);
    } finally {
      setIsTrading(false);
    }
  };

  return (
    <div className="space-y-6">
      {tradeWindows.length > 0 && (
        <div className="card p-4 bg-yellow-500/10">
          <h3 className="text-lg font-medium mb-4">Trading Windows</h3>
          <div className="space-y-2">
            {tradeWindows.map((window, i) => (
              <div key={i} className="flex justify-between items-center">
                <span>Spread: {window.avgSpread.toFixed(2)}%</span>
                <span>Confidence: {(window.confidence * 100).toFixed(1)}%</span>
                <Button
                  onClick={() => executeQuickTrade(window)}
                  disabled={isTrading}
                  className={`${
                    window.predictedDirection === "buy"
                      ? "bg-green-500"
                      : "bg-red-500"
                  }`}
                  label={`Quick ${window.predictedDirection.toUpperCase()}`}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4">
          <h3 className="text-lg font-medium mb-2">Current Spread</h3>
          <div
            className={`text-2xl font-bold ${
              calculateSpread() > 0 ? "text-green-500" : "text-red-500"
            }`}
          >
            {calculateSpread().toFixed(2)}%
          </div>
        </div>

        <div className="card p-4">
          <h3 className="text-lg font-medium mb-2">24h Volume</h3>
          <div className="text-2xl font-bold">
            ${calculateVolume(trades).toLocaleString()}
          </div>
        </div>

        <div className="card p-4">
          <h3 className="text-lg font-medium mb-2">Volatility</h3>
          <div className="text-2xl font-bold">
            {calculateVolatility(trades).toFixed(4)}
          </div>
        </div>
      </div>

      <div className="card p-4">
        <h3 className="text-lg font-medium mb-4">Recent Trades</h3>
        <div className="space-y-2">
          {trades.slice(0, 5).map((trade, i) => (
            <div
              key={i}
              className={`flex justify-between items-center ${
                trade.type === "buy" ? "text-green-500" : "text-red-500"
              }`}
            >
              <span>
                {new Date(trade.timestamp).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
              <span>{trade.type.toUpperCase()}</span>
              <span>
                $
                {parseFloat(trade.amountUSD).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-4">
        <Button
          onClick={handleAnalyzeAndTrade}
          disabled={isAnalyzing || isTrading}
          className="w-full"
          label={
            isAnalyzing
              ? "Analyzing Market..."
              : isTrading
              ? "Executing Trade..."
              : "Analyze & Trade"
          }
        />

        {error && <div className="mt-4 text-red-500 text-sm">{error}</div>}

        {decision && (
          <div className="mt-4 space-y-2">
            <h4 className="font-medium">Analysis Result:</h4>
            <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto">
              {JSON.stringify(decision, null, 2)}
            </pre>
          </div>
        )}

        {result && (
          <div className="mt-4 space-y-2">
            <h4 className="font-medium">Trade Result:</h4>
            <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
