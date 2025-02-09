"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { safeFormatNumber, safeFormatPercentage } from "@/lib/safeFormatNumber";

interface SimulationSummary {
  id: string;
  createdAt: string;
  poolId: string;
  status: "completed" | "running" | "failed";
  metrics: {
    totalTrades: number;
    winRate: number;
    totalProfit: number;
  };
}

export default function SimulationsPage() {
  const [simulations, setSimulations] = useState<SimulationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSimulations();
  }, []);

  const fetchSimulations = async () => {
    try {
      const response = await fetch("/api/simulations");
      const data = await response.json();
      setSimulations(data.simulations);
    } catch (error) {
      console.error("Failed to fetch simulations:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-4">Loading simulations...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Trading Simulations</h1>

      <div className="grid gap-4">
        {simulations.map((sim) => (
          <Link key={sim.id} href={`/simulations/${sim.id}`} className="block">
            <div className="card p-4 hover:bg-accent/5 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-medium">Simulation {sim.id}</h3>
                  <p className="text-sm text-muted-foreground">
                    {new Date(sim.createdAt).toLocaleString()}
                  </p>
                </div>
                <span
                  className={`
                  px-2 py-1 rounded-full text-sm
                  ${
                    sim.status === "completed"
                      ? "bg-green-100 text-green-800"
                      : sim.status === "running"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-red-100 text-red-800"
                  }
                `}
                >
                  {sim.status}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Trades</p>
                  <p className="font-medium">{sim.metrics.totalTrades}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Win Rate</p>
                  <p className="font-medium">
                    {safeFormatPercentage(sim.metrics.winRate, 1)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Profit</p>
                  <p className="font-medium">
                    {safeFormatNumber(sim.metrics.totalProfit, 2)}
                  </p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
