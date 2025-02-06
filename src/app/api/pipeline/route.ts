import { NextRequest, NextResponse } from "next/server";
import { tradingService } from "@/services/trading";
import { uniswapTradeService } from "@/services/uniswapTrades";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, tokenAddress, amount, maxSlippage } = body;

    if (!userId || !tokenAddress || !amount) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Execute the trade through our trading service
    const result = await tradingService.purchaseToken({
      userId,
      tokenAddress,
      amount,
      maxSlippage,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Pipeline execution error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Pipeline execution failed",
      },
      { status: 500 }
    );
  }
}
