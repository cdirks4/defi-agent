"use client";

import { useState, useEffect } from "react";
import { SimulationTrade } from "@/types/simulation";

interface SimulationStreamHookResult {
  trades: SimulationTrade[];
  isStreaming: boolean;
  error: string | null;
  progress: number;
  isConnected: boolean;
}

export function useSimulationStream(
  simulationId: string
): SimulationStreamHookResult {
  const [trades, setTrades] = useState<SimulationTrade[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!simulationId) return;

    setIsStreaming(true);
    const evtSource = new EventSource(
      `/api/simulation/stream?id=${simulationId}`
    );

    evtSource.addEventListener("open", () => {
      console.log("EventSource connection established");
      setIsConnected(true);
      setError(null);
    });

    evtSource.addEventListener("trade", (event) => {
      try {
        const trade = JSON.parse(event.data) as SimulationTrade;
        setTrades((prev) => {
          // Check if we already have this trade
          const exists = prev.some(
            (t) =>
              t.timestamp === trade.timestamp &&
              t.type === trade.type &&
              t.price === trade.price
          );
          if (exists) return prev;
          return [...prev, trade];
        });
      } catch (err) {
        console.error("Error parsing trade data:", err);
      }
    });

    evtSource.addEventListener("progress", (event) => {
      try {
        const { progress } = JSON.parse(event.data);
        setProgress(progress);
        if (progress === 100) {
          // Keep the connection open for a bit to ensure we get all trades
          setTimeout(() => {
            evtSource.close();
            setIsStreaming(false);
          }, 2000);
        }
      } catch (err) {
        console.error("Error parsing progress data:", err);
      }
    });

    evtSource.addEventListener("error", (event) => {
      const errorMsg =
        event instanceof ErrorEvent
          ? event.message
          : "Connection to simulation stream failed";
      console.error("EventSource error:", errorMsg);
      setError(errorMsg);
      setIsConnected(false);
      if (evtSource.readyState === EventSource.CLOSED) {
        setIsStreaming(false);
      }
    });

    return () => {
      evtSource.close();
      setIsStreaming(false);
      setIsConnected(false);
    };
  }, [simulationId]);

  return { trades, isStreaming, error, progress, isConnected };
}
