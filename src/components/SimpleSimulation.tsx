"use client";

import { useState } from "react";
import { useSimulationStream } from "@/hooks/useSimulationStream";

export default function SimpleSimulation() {
  const [simulationId, setSimulationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { trades, isStreaming, error, progress, isConnected } = useSimulationStream(simulationId || "");

  const startSimulation = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/simulation", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      
      if (!response.ok) throw new Error("Failed to start simulation");
      
      const data = await response.json();
      setSimulationId(data.simulationId);
    } catch (err) {
      console.error("Failed to start simulation:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <button
        onClick={startSimulation}
        disabled={loading || isStreaming}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        {loading ? "Starting..." : "Start Simple Simulation"}
      </button>

      {isStreaming && (
        <div className="mt-4">
          <div className="text-sm">Progress: {progress}%</div>
          <div className="text-sm">Connected: {isConnected ? "Yes" : "No"}</div>
          <div className="mt-2">
            <h3 className="font-medium">Trades:</h3>
            <div className="space-y-2">
              {trades.map((trade, i) => (
                <div key={i} className="text-sm">
                  {trade.type} @ {trade.price} ({trade.timestamp})
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 text-red-500">
          Error: {error}
        </div>
      )}
    </div>
  );
}