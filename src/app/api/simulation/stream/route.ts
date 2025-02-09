import { NextRequest } from "next/server";
import { logger } from "@/lib/logger";
import { LlamaService } from "@/services/llama";
import { redis } from "@/services/redis";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const simulationId = searchParams.get("id");

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let isStreamActive = true;
      let currentProgress = 0;
      const startTime = Date.now();
      const duration = 30000; // 30 seconds simulation
      let lastPrice = 1800; // Starting price for WETH pairs
      let tradeCount = 0;

      const interval = setInterval(async () => {
        if (!isStreamActive) {
          clearInterval(interval);
          return;
        }

        try {
          const elapsed = Date.now() - startTime;
          currentProgress = Math.min(
            100,
            Math.floor((elapsed / duration) * 100)
          );

          // Send progress update
          controller.enqueue(
            encoder.encode(
              `event: progress\ndata: ${JSON.stringify({
                progress: currentProgress,
              })}\n\n`
            )
          );

          // Generate trade every 2 seconds
          if (elapsed % 2000 < 1000) {
            // Simulate price movement with more realistic volatility
            const volatility = 0.002; // 0.2% price movement
            const priceChange = (Math.random() - 0.5) * 2 * volatility;
            const newPrice = lastPrice * (1 + priceChange);

            // Generate trade decision based on price movement
            const decision = priceChange > 0 ? "BUY" : "SELL";
            const confidence = 0.5 + Math.random() * 0.5; // 0.5 to 1.0
            const volume = Math.random() * 10 + 1; // 1-11 ETH volume

            const mockTrade = {
              timestamp: new Date().toISOString(),
              type: decision,
              price: newPrice,
              amount: volume.toFixed(3),
              confidence,
              profit: priceChange * volume * newPrice,
              reasoning: `${decision} signal based on ${(
                priceChange * 100
              ).toFixed(3)}% price movement`,
              metrics: {
                volume: 407146473.206,
                liquidity: 5438686.897,
                volatility: Math.abs(priceChange),
              },
            };

            controller.enqueue(
              encoder.encode(
                `event: trade\ndata: ${JSON.stringify(mockTrade)}\n\n`
              )
            );

            lastPrice = newPrice;
            tradeCount++;
          }

          if (currentProgress >= 100) {
            // Send final summary
            const summary = {
              totalTrades: tradeCount,
              finalPrice: lastPrice,
              success: true,
              metrics: {
                winRate: 0.65,
                totalProfit: 1234.56,
                sharpeRatio: 1.8,
              },
            };

            controller.enqueue(
              encoder.encode(
                `event: complete\ndata: ${JSON.stringify(summary)}\n\n`
              )
            );

            isStreamActive = false;
            clearInterval(interval);
            controller.close();
          }
        } catch (error) {
          console.error("Stream error:", error);
          isStreamActive = false;
          clearInterval(interval);
          controller.close();
        }
      }, 1000);

      // Cleanup on client disconnect
      request.signal.addEventListener("abort", () => {
        isStreamActive = false;
        clearInterval(interval);
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
