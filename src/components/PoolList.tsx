'use client';

import { useTopPools } from "@/hooks/useUniswap";
import Link from "next/link";
import Spinner from "./base/Spinner";

export default function PoolList() {
  const { pools, loading, error } = useTopPools();

  if (loading) {
    return (
      <div className="flex justify-center my-8">
        <Spinner size="lg" color="border-[var(--primary)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-[var(--error)] mb-4 p-4 card">
        Failed to load pools: {error.message}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {pools?.map((pool) => (
        <Link 
          href={`/simulations/${pool.id}`} 
          key={pool.id}
          className="card hover:border-[var(--primary)] transition-colors cursor-pointer"
        >
          <div className="flex flex-col gap-2">
            <h3 className="text-lg font-medium">
              {pool.token0.symbol}/{pool.token1.symbol}
            </h3>
            <div className="text-sm text-[var(--muted)]">
              <div className="flex justify-between mb-1">
                <span>TVL:</span>
                <span>${Number(pool.totalValueLockedUSD).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span>Volume:</span>
                <span>${Number(pool.volumeUSD).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="flex justify-between">
                <span>Fee Tier:</span>
                <span>{Number(pool.feeTier) / 10000}%</span>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
