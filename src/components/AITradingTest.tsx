import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { uniswapService } from "@/services/uniswap";
import { tradingService } from "@/services/trading";
import { agentKit } from "@/services/agentkit";
import Button from "./base/Button";

export default function AITradingTest() {
  const { user } = usePrivy();
  const [marketData, setMarketData] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(20);
  const [error, setError] = useState<string | null>(null);

  const fetchMarketData = async () => {
    const [tokens, swaps] = await Promise.all([
      uniswapService.getTokens(),
      uniswapService.getRecentSwaps(20),
    ]);
    return { tokens, swaps };
  };

  const startTest = async () => {
    if (!user?.id) {
      setError("User not authenticated");
      return;
    }

    setIsLoading(true);
    setTimeLeft(20);
    setError(null);

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

      // Create market context for AI analysis
      const marketContext = {
        tokens: data.tokens.slice(0, 5).map((token: any) => ({
          symbol: token.symbol,
          volumeUSD: parseFloat(token.volumeUSD).toFixed(2),
          tvl: parseFloat(token.totalValueLockedUSD).toFixed(2),
        })),
        swaps: data.swaps.slice(0, 5).map((swap: any) => ({
          pair: `${swap.token0.symbol}-${swap.token1.symbol}`,
          amountUSD: parseFloat(swap.amountUSD).toFixed(2),
        })),
      };

      // Make API request to backend for AI analysis
      const aiResponse = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemPrompt: `As a DeFi expert, analyze this market data and recommend a token to trade. Focus on volume and liquidity trends. Output JSON: {"decision":"BUY/SELL","selectedToken":{"symbol":"XXX","amount":"0.1","score":0.8},"reasoning":"brief reason"}`,
          userMessage: JSON.stringify(marketContext),
        }),
      });

      if (!aiResponse.ok) {
        throw new Error("AI analysis failed");
      }

      const { response } = await aiResponse.json();
      const decision = JSON.parse(response);
      setAnalysis(decision);

      // Execute trade if it's a valid decision
      if (decision.selectedToken) {
        try {
          // Connect agent wallet first
          await agentKit.connectWallet(user.id, false);

          // Find token address from market data
          const selectedToken = data.tokens.find(
            (t: any) => t.symbol === decision.selectedToken.symbol
          );

          if (selectedToken) {
            const tradeResult = await tradingService.purchaseToken({
              userId: user.id,
              tokenAddress: selectedToken.id,
              amount: decision.selectedToken.amount,
              maxSlippage: 1,
            });

            setAnalysis((prev) => ({
              ...prev,
              tradeResult,
            }));
          }
        } catch (error) {
          console.error("Trade execution failed:", error);
          setError(
            error instanceof Error ? error.message : "Failed to execute trade"
          );
        }
      }
    } catch (error) {
      console.error("Test failed:", error);
      setError(error instanceof Error ? error.message : "Test failed");
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
          isLoading={isLoading}
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
                  <div>
                    {swap.token0.symbol} → {swap.token1.symbol}
                  </div>
                  <div className="text-gray-500">
                    ${parseFloat(swap.amountUSD).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>
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
                <div>Reasoning: {analysis.reasoning}</div>
              </>
            )}
            {analysis.tradeResult && analysis.tradeResult.success && (
              <div className="mt-2 p-2 bg-green-100 text-green-700 rounded">
                Trade executed successfully!
                {analysis.tradeResult.txHash && (
                  <div>
                    <a
                      href={`https://sepolia.arbiscan.io/tx/${analysis.tradeResult.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      View transaction
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
