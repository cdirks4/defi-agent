"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { SimulationParams, SimulationResult } from "@/types/simulation";
import Button from "@/components/base/Button";
import Spinner from "@/components/base/Spinner";
import SimulationResultDisplay from "@/components/SimulationResult";
import { usePoolData } from "@/hooks/useUniswap";
import StrategyConfigurationForm from "@/components/simulation/StrategyConfigurationForm";

export default function SimulationDetailPage({
  params: routeParams,
}: {
  params: { poolId: string };
}) {
  const urlParams = useParams();
  const poolId = typeof urlParams?.poolId === 'string' ? urlParams.poolId : routeParams.poolId;
  const { user } = usePrivy();
  const {
    data: pool,
    loading: poolLoading,
    error: poolError,
  } = usePoolData(poolId);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [duration, setDuration] = useState(15); // Default 15 minutes
  const [windowExtension, setWindowExtension] = useState(1); // Default no extension
  const [strategyConfig, setStrategyConfig] = useState({
    strategy: "momentum",
    stopLoss: 0.2,
    takeProfit: 0.5,
    tradeSizeScaling: 1.0
  });

  if (!poolId) {
    return (
      <div className="min-h-screen bg-[var(--background)] p-8">
        <div className="card max-w-md mx-auto p-6 text-center">
          <p className="mb-4">Invalid pool ID</p>
        </div>
      </div>
    );
  }

  if (!user?.id) {
    return (
      <div className="min-h-screen bg-[var(--background)] p-8">
        <div className="card max-w-md mx-auto p-6 text-center">
          <p className="mb-4">Please connect your wallet to run simulations</p>
        </div>
      </div>
    );
  }

  if (poolLoading) {
    return (
      <div className="flex justify-center my-8">
        <Spinner size="lg" color="border-[var(--primary)]" />
      </div>
    );
  }

  if (poolError || !pool) {
    return (
      <div className="text-[var(--error)] mb-4 p-4 card">
        Failed to load pool data: {poolError?.message || "Pool not found"}
      </div>
    );
  }

  const runSimulation = async () => {
    if (!user?.id || !pool) return;

    setLoading(true);
    setError(null);

    try {
      let simulationParams: SimulationParams;
      const now = new Date();

      if (isLiveMode) {
        const endTime = new Date(now.getTime() + duration * 60 * 1000);

        simulationParams = {
          startDate: now.toISOString(),
          endDate: endTime.toISOString(),
          poolId: poolId,
          initialCapital: 1,
          tradeSize: 0.1,
          simulateLive: true,
          simulationDuration: duration,
          strategyConfig: strategyConfig,
        };
      } else {
        const startDate = new Date(now.getTime() - duration * 60 * 1000);

        simulationParams = {
          startDate: startDate.toISOString(),
          endDate: now.toISOString(),
          poolId: poolId,
          initialCapital: 1,
          tradeSize: 0.1,
          simulateLive: false,
          simulationDuration: duration,
          windowExtensionFactor: windowExtension,
          strategyConfig: strategyConfig,
        };
      }

      const response = await fetch("/api/simulation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(simulationParams),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Simulation failed");
      }

      const result = await response.json();
      setResult(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      {loading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Spinner size="lg" />
            <p className="text-muted-foreground">Preparing simulation...</p>
            <p className="text-sm text-muted-foreground">This may take a few minutes</p>
          </div>
        </div>
      )}
      
      <div className="max-w-7xl mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold mb-6">
          {pool.token0.symbol}/{pool.token1.symbol} Trading Simulation
        </h1>

        <div className="card p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium mb-4">Basic Configuration</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Simulation Mode
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          checked={!isLiveMode}
                          onChange={() => setIsLiveMode(false)}
                          className="mr-2"
                        />
                        Historical
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          checked={isLiveMode}
                          onChange={() => setIsLiveMode(true)}
                          className="mr-2"
                        />
                        Live
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Duration (minutes)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max={isLiveMode ? 60 : 43200} // Max 30 days for historical
                      value={duration}
                      onChange={(e) =>
                        setDuration(
                          Math.max(5, Math.min(isLiveMode ? 60 : 43200, parseInt(e.target.value) || 15))
                        )
                      }
                      className="w-24 px-3 py-2 border rounded bg-[var(--background)] text-[var(--foreground)]"
                    />
                    <p className="text-sm text-[var(--muted)] mt-1">
                      {isLiveMode ? 
                        'Choose between 5-60 minutes' : 
                        'Choose between 5 minutes and 30 days (43200 minutes)'}
                    </p>
                  </div>

                  {!isLiveMode && (
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Historical Window Extension
                      </label>
                      <select
                        className="w-48 px-3 py-2 border rounded bg-[var(--background)] text-[var(--foreground)]"
                        onChange={(e) => setWindowExtension(Number(e.target.value))}
                        defaultValue="1"
                      >
                        <option value="1">No extension (1x)</option>
                        <option value="2">Double window (2x)</option>
                        <option value="3">Triple window (3x)</option>
                        <option value="4">Quadruple window (4x)</option>
                      </select>
                      <p className="text-sm text-[var(--muted)] mt-1">
                        Extend the historical data lookup window if not enough trades
                        are found
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium mb-4">Strategy Configuration</h2>
                <StrategyConfigurationForm
                  onConfigChange={setStrategyConfig}
                  defaultConfig={strategyConfig}
                />
              </div>
            </div>
          </div>

          <div className="mt-8">
            <Button
              onClick={runSimulation}
              isLoading={loading}
              disabled={loading}
              label={
                loading
                  ? "Running Simulation..."
                  : `Start ${isLiveMode ? "Live" : "Historical"} Simulation`
              }
            />

            <p className="text-sm text-[var(--muted)] mt-4">
              {isLiveMode
                ? `Simulates trading decisions over the next ${duration} minutes in real-time. No actual trades are executed.`
                : `Simulates trading decisions using historical data from a ${duration}-minute window. No actual trades are executed.`}
            </p>
          </div>
        </div>

        {error && (
          <div className="text-[var(--error)] mb-4 p-4 card">{error}</div>
        )}

        {loading && (
          <div className="flex justify-center my-8">
            <Spinner size="lg" color="border-[var(--primary)]" />
          </div>
        )}

        {result && <SimulationResultDisplay result={result} />}
      </div>
    </div>
  );
}
