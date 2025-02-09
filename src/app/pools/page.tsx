"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { useTopPools } from "@/hooks/useUniswap";
import Spinner from "@/components/base/Spinner";

interface Pool {
  id: string;
  token0: {
    symbol: string;
    address: string;
  };
  token1: {
    symbol: string;
    address: string;
  };
  feeTier: number;
  liquidity: string;
  volumeUSD: string;
}

export default function PoolsPage() {
  const { user } = usePrivy();
  const { pools, loading, error } = useTopPools();

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] p-8">
        <div className="card max-w-4xl mx-auto p-6 flex justify-center">
          <Spinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--background)] p-8">
        <div className="card max-w-4xl mx-auto p-6">
          <div className="text-[var(--error)]">
            Failed to load pools: {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] p-8">
      <div className="card max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Trading Pools</h1>

        <div className="grid gap-4">
          {pools?.map((pool: Pool) => (
            <Link
              key={pool.id}
              href={`/simulations/${pool.id}`}
              className="block"
            >
              <div className="card p-4 hover:bg-accent/5 transition-colors">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium">
                      {pool.token0.symbol}/{pool.token1.symbol}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Fee: {(pool.feeTier / 10000).toFixed(2)}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      Volume: $
                      {Number(pool.volumeUSD).toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
