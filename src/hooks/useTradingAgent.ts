import { useState, useCallback } from "react";
import { walletService } from "@/services/wallet";
import { ethers } from "ethers";

interface TradingAction {
  type: "BUY" | "SELL";
  token: string;
  amount: string;
  price: string;
}

export function useTradingAgent() {
  const [isLoading, setIsLoading] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<string | null>(null);

  const executeTrade = useCallback(async (action: TradingAction) => {
    setIsLoading(true);
    try {
      const txHash = await walletService.executeTradeAction({
        type: action.type,
        params: {
          tokenAddress: action.token,
          amount: ethers.parseEther(action.amount),
          price: ethers.parseEther(action.price),
        },
      });
      setLastTransaction(txHash);
      return txHash;
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
