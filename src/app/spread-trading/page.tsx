'use client';

import { usePrivy } from "@privy-io/react-auth";
import SpreadTradingInterface from "@/components/SpreadTradingInterface";
import { useEffect, useState } from "react";
import { uniswapService } from "@/services/uniswap";

interface Trade {
  timestamp: string;
  amount0: string;
  amount1: string;
  amountUSD: string;
  type: 'buy' | 'sell';
  price: number;
}

export default function SpreadTradingPage() {
  const { authenticated } = usePrivy();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const swaps = await uniswapService.getRecentSwaps(50);
        
        const processedTrades = swaps
          .filter(swap => 
            (swap.pool?.token0?.symbol === 'WETH' && swap.pool?.token1?.symbol === 'USDC') ||
            (swap.pool?.token0?.symbol === 'USDC' && swap.pool?.token1?.symbol === 'WETH')
          )
          .map(swap => ({
            timestamp: new Date(parseInt(swap.timestamp) * 1000).toISOString(), // Convert Unix timestamp
            amount0: swap.amount0,
            amount1: swap.amount1,
            amountUSD: swap.amountUSD,
            type: determineTradeType(swap),
            price: calculateTradePrice(swap)
          }));

        setTrades(processedTrades);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch trades:', error);
        setLoading(false);
      }
    };

    // Add helper functions
    const determineTradeType = (swap: any) => {
      if (swap.pool.token0.symbol === 'WETH') {
        return parseFloat(swap.amount0) > 0 ? 'sell' : 'buy';
      } else {
        return parseFloat(swap.amount0) > 0 ? 'buy' : 'sell';
      }
    };

    const calculateTradePrice = (swap: any) => {
      const amount0 = Math.abs(parseFloat(swap.amount0));
      const amount1 = Math.abs(parseFloat(swap.amount1));
      return swap.pool.token0.symbol === 'WETH' ? amount1 / amount0 : amount0 / amount1;
    };

    if (authenticated) {
      fetchTrades();
      const interval = setInterval(fetchTrades, 15000);
      return () => clearInterval(interval);
    }
  }, [authenticated]);

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <p className="text-lg">Please connect your wallet to access spread trading.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <p className="text-lg">Loading trading data...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold mb-6">WETH/USDC Spread Trading</h1>
        <SpreadTradingInterface trades={trades} />
      </div>
    </div>
  );
}