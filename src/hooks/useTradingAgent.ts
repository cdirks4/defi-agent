import { useState, useCallback } from "react";
import { tradingService } from "@/services/trading";
import { ethers } from "ethers";

interface TradingAction {
  type: "BUY" | "SELL";
  token: string;
  amount: string;
  price: string;
  userId: string;
}

export function useTradingAgent() {
  const [isLoading, setIsLoading] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<string | null>(null);

  const executeTrade = useCallback(async (action: TradingAction) => {
    setIsLoading(true);
    try {
      const result = await tradingService.purchaseToken({
        userId: action.userId,
        tokenAddress: action.token,
        amount: action.amount,
        maxSlippage: 1, // 1% slippage tolerance
      });
      
      if (result.success) {
        setLastTransaction(result.timestamp.toString());
      }
      
      return result;
    } catch (error) {
      console.error("Trade execution failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    executeTrade,
    isLoading,
    lastTransaction,
  };
}
