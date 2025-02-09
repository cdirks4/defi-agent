import { NextResponse } from "next/server";
import { redis } from "@/services/redis";
import { safeParseJSON } from "@/utils/json";
import { SimulationResult } from "@/types/simulation";

interface StoredSimulation {
  id: string;
  createdAt: string;
  poolId: string;
  status: "completed" | "running" | "failed";
  result?: SimulationResult;
}

export async function GET() {
  try {
    // Use zrange to get simulation IDs from the sorted set
    const simulationKeys = await redis.zrange("simulations:index", 0, -1, {
      rev: true,
    });

    if (!simulationKeys || simulationKeys.length === 0) {
      return NextResponse.json({ simulations: [] });
    }

    const simulations = await Promise.all(
      simulationKeys.map(async (simulationId) => {
        const key = `simulation:${simulationId}:metadata`;
        const data = await redis.get(key);
        return safeParseJSON<StoredSimulation>(data);
      })
    );

    const validSimulations = simulations
      .filter(Boolean)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    return NextResponse.json({ simulations: validSimulations });
  } catch (error) {
    console.error("Failed to fetch simulations:", error);
    return NextResponse.json(
      { error: "Failed to fetch simulations" },
      { status: 500 }
    );
  }
}
