import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { agentDecisionService } from "@/services/agent-decision";
import { uniswapService } from "@/services/uniswap";
import Button from "./base/Button";

export default function AITradingTest() {
  const { user } = usePrivy();
  const [marketData, setMarketData] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(20);

  const fetchMarketData = async () => {
    const [tokens, pools, swaps] = await Promise.all([
      uniswapService.getTopTokens(10),
      uniswapService.getTopPools(10),
      uniswapService.getRecentSwaps(20)
    ]);
    return { tokens, pools, swaps };
  };

  const startTest = async () => {
    setIsLoading(true);
    setTimeLeft(20);
    
    try {
      // Fetch initial market data
      const data = await fetchMarketData();
      setMarketData(data);

      // Start countdown
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Let AI make decision
      const decision = await agentDecisionService.makeTradeDecision(user?.id || "test");
      setAnalysis(decision);

    } catch (error) {
      console.error("Test failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-white rounded-lg shadow">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">AI Trading Test</h2>
        <Button
          label={isLoading ? `Analyzing (${timeLeft}s)...` : "Start Test"}
          onClick={startTest}
          disabled={isLoading}
        />
      </div>

      {marketData && (
        <div className="grid grid-cols-2 gap-4">
          <div className="border rounded p-4">
            <h3 className="font-semibold mb-2">Available Tokens</h3>
            <div className="space-y-2">
              {marketData.tokens.map((token: any) => (
                <div key={token.id} className="text-sm">
                  <div className="flex justify-between">
                    <span>{token.symbol}</span>
                    <span>${parseFloat(token.volumeUSD).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border rounded p-4">
            <h3 className="font-semibold mb-2">Recent Swaps</h3>
            <div className="space-y-2">
              {marketData.swaps.map((swap: any) => (
                <div key={swap.id} className="text-sm">
                  <div>{swap.token0.symbol} → {swap.token1.symbol}</div>
                  <div className="text-gray-500">
                    ${parseFloat(swap.amountUSD).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {analysis && (
        <div className="border rounded p-4 bg-blue-50">
          <h3 className="font-semibold mb-2">AI Analysis</h3>
          <div className="space-y-2">
            <div>Decision: {analysis.decision}</div>
            {analysis.selectedToken && (
              <>
                <div>Selected Token: {analysis.selectedToken.symbol}</div>
                <div>Amount: {analysis.selectedToken.amount}</div>
                <div>Confidence Score: {analysis.selectedToken.score}</div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}