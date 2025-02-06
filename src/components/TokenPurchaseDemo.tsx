import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { agentDecisionService } from "@/services/agent-decision";
import { tradingService } from "@/services/trading";
import { uniswapService } from "@/services/uniswap";
import Button from "./base/Button";

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

        try {
          setTokens(tokensData);
        } catch (err) {
          console.error("Failed to set tokens data:", err);
        }

        try {
          setRecentSwaps(swapsData);
        } catch (err) {
          console.error("Failed to set swaps data:", err);
        }
      } catch (err) {
        console.error("Failed to fetch market data:", err);
        setError("Failed to fetch market data. Please try again later.");
      }
    };

    try {
      fetchMarketData();
      const interval = setInterval(fetchMarketData, 30000);
      return () => {
        try {
          clearInterval(interval);
        } catch (err) {
          console.error("Failed to clear interval:", err);
        }
      };
    } catch (err) {
      console.error("Failed to setup market data fetching:", err);
      setError("Failed to initialize market data fetching.");
    }
  }, []);

  const handleAutomatedTrade = async () => {
    if (!user?.id) {
      setError("User not authenticated");
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const decision = await agentDecisionService.makeTradeDecision(user.id);
      try {
        setDecision(decision);
      } catch (err) {
        console.error("Failed to set decision:", err);
      }

      if (decision.selectedToken) {
        try {
          setIsTrading(true);
          const result = await tradingService.purchaseToken({
            userId: user.id,
            tokenAddress: decision.selectedToken.address,
            amount: decision.selectedToken.amount,
          });
          try {
            setResult(result);
          } catch (err) {
            console.error("Failed to set result:", err);
          }
        } catch (err: any) {
          setError(`Failed to execute trade: ${err.message}`);
        }
      }
    } catch (err: any) {
      setError(`Analysis failed: ${err.message}`);
    } finally {
      try {
        setIsAnalyzing(false);
        setIsTrading(false);
      } catch (err) {
        console.error("Failed to reset trading states:", err);
      }
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
      />

      {decision && (
        <div className="mt-4 p-2 bg-blue-100 text-blue-700 rounded">
          <p>Decision: {decision.decision}</p>
          {decision.selectedToken && (
            <>
              <p>Selected Token: {decision.selectedToken.symbol}</p>
              <p>Amount: {decision.selectedToken.amount}</p>
            </>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 p-2 bg-red-100 text-red-700 rounded">{error}</div>
      )}

      {result && (
        <div className="mt-4 p-2 bg-green-100 text-green-700 rounded">
          <p>Transaction successful!</p>
          <p>Token: {result.token}</p>
          <p>Amount: {result.amount}</p>
          <p>Transaction: {result.txHash}</p>
        </div>
      )}
    </div>
  );
}
