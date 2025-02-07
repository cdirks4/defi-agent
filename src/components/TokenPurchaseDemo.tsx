import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { uniswapService } from "@/services/uniswap";
import { tradingService } from "@/services/trading";
import { agentKit } from "@/services/agentkit";
import Button from "./base/Button";
import TransactionSuccessNotice from "./TransactionSuccessNotice";

interface TokenData {
  id: string;
  symbol: string;
  name: string;
  volumeUSD: string;
  totalValueLockedUSD: string;
}

interface SwapData {
  id: string;
  timestamp: string;
  token0: { symbol: string; id: string };
  token1: { symbol: string; id: string };
  amountUSD: string;
}

const DEFAULT_TRADE_AMOUNT = "0.1";

export default function TokenPurchaseDemo() {
  const { user } = usePrivy();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isTrading, setIsTrading] = useState(false);
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [recentSwaps, setRecentSwaps] = useState<SwapData[]>([]);
  const [decision, setDecision] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        const [tokensData, swapsData] = await Promise.all([
          uniswapService.getTokens(),
          uniswapService.getRecentSwaps(10),
        ]);
        setTokens(tokensData);
        setRecentSwaps(swapsData);
      } catch (err) {
        console.error("Failed to fetch market data:", err);
        setError("Failed to fetch market data. Please try again later.");
      }
    };

    fetchMarketData();
    const interval = setInterval(fetchMarketData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleAutomatedTrade = async () => {
    if (!user?.id) {
      setError("User not authenticated");
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      // Prepare market context for AI analysis
      const marketContext = {
        tokens: tokens.slice(0, 5).map((token) => ({
          symbol: token.symbol,
          volumeUSD: parseFloat(token.volumeUSD).toFixed(2),
          tvl: parseFloat(token.totalValueLockedUSD).toFixed(2),
        })),
        recentSwaps: recentSwaps.slice(0, 5).map((swap) => ({
          pair: `${swap.token0.symbol}-${swap.token1.symbol}`,
          amountUSD: parseFloat(swap.amountUSD).toFixed(2),
        })),
      };

      // Call server-side AI endpoint
      const aiResponse = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemPrompt: `As a DeFi expert, analyze this compact market data and recommend a token to trade. Focus on volume and liquidity trends. Output JSON: {"token":{"address":"0x...","symbol":"XXX"},"amount":"0.1","confidence":0.8,"reasoning":"brief reason"}`,
          userMessage: JSON.stringify(marketContext),
        }),
      });

      if (!aiResponse.ok) {
        throw new Error("AI analysis failed");
      }

      const { response } = await aiResponse.json();
      const decision = JSON.parse(response);

      // Ensure decision has valid amount, defaulting if not
      if (
        !decision.amount ||
        typeof decision.amount !== "string" ||
        isNaN(Number(decision.amount))
      ) {
        console.log(
          "Invalid or missing amount in AI response, using default:",
          DEFAULT_TRADE_AMOUNT
        );
        decision.amount = DEFAULT_TRADE_AMOUNT;
      }

      // Ensure confidence is a valid number
      if (isNaN(decision.confidence)) {
        decision.confidence = 0.8;
      }

      setDecision(decision);

      if (decision.token) {
        setIsTrading(true);
        try {
          // Connect agent wallet first
          await agentKit.connectWallet(user.id, false);

          // Execute trade directly through trading service
          const tradeResult = await tradingService.purchaseToken({
            userId: user.id,
            tokenAddress: decision.token.address,
            amount: decision.amount,
            maxSlippage: 1, // 1% slippage tolerance
          });

          setResult(tradeResult);
        } catch (error) {
          console.error("Trade execution failed:", error);
          setError(
            error instanceof Error ? error.message : "Failed to execute trade"
          );
        }
      }
    } catch (err: any) {
      setError(`Trading failed: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
      setIsTrading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg">
      <h2 className="text-lg font-bold mb-4">Automated Trading Demo</h2>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <h3 className="font-semibold mb-2">Available Tokens</h3>
          <div className="max-h-60 overflow-y-auto">
            {tokens.map((token) => (
              <div key={token.id} className="p-2 border-b">
                <p>
                  {token.symbol} ({token.name})
                </p>
                <p className="text-sm text-gray-600">
                  Volume: ${Number(token.volumeUSD).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Recent Swaps</h3>
          <div className="max-h-60 overflow-y-auto">
            {recentSwaps.map((swap) => (
              <div key={swap.id} className="p-2 border-b">
                <p>
                  {swap.token0.symbol} ↔ {swap.token1.symbol}
                </p>
                <p className="text-sm text-gray-600">
                  ${Number(swap.amountUSD).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Button
        label={
          isAnalyzing
            ? "Analyzing Market (20s)..."
            : isTrading
            ? "Executing Trade..."
            : "Start Automated Trade"
        }
        onClick={handleAutomatedTrade}
        disabled={isAnalyzing || isTrading}
        isLoading={isAnalyzing || isTrading}
      />

      {decision && (
        <div className="mt-4 p-2 bg-blue-100 text-blue-700 rounded">
          <p>Reasoning: {decision.reasoning}</p>
          {decision.token && (
            <>
              <p>Selected Token: {decision.token.symbol}</p>
              <p>Amount: {decision.amount}</p>
              <p>Confidence: {(decision.confidence * 100).toFixed(1)}%</p>
            </>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 p-2 bg-red-100 text-red-700 rounded">{error}</div>
      )}

      {result && result.success && (
        <div className="mt-4">
          <TransactionSuccessNotice
            token={result.token}
            amount={result.amount}
            txHash={result.txHash}
          />
        </div>
      )}
    </div>
  );
}
