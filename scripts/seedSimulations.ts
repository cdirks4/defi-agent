import { redis } from "../src/services/redis";

const SAMPLE_POOLS = [
  "0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640", // USDC/ETH
  "0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8", // USDC/WETH
  "0x4e68ccd3e89f51c3074ca5072bbac773960dfa36", // WETH/USDT
];

const STATUSES = ["completed", "running", "failed"];

function generateRandomMetrics() {
  return {
    totalTrades: Math.floor(Math.random() * 100) + 1,
    winRate: Math.random() * 100,
    totalProfit: Math.random() * 200 - 100,
    successfulTrades: Math.floor(Math.random() * 50),
    averageReturn: Math.random() * 10,
    maxDrawdown: Math.random() * 30,
    sharpeRatio: Math.random() * 3,
    profitFactor: Math.random() * 2 + 0.5,
  };
}

async function seedSimulations() {
  try {
    // Clear existing simulation data
    const existingKeys = await redis.keys("simulation:*");
    if (existingKeys.length > 0) {
      await redis.del(existingKeys);
    }

    // Create sample simulations
    for (let i = 0; i < 10; i++) {
      const simulationId = `sim_${Date.now() - i * 86400000}`; // Different timestamps
      const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];
      const poolId =
        SAMPLE_POOLS[Math.floor(Math.random() * SAMPLE_POOLS.length)];

      const simulation = {
        id: simulationId,
        createdAt: new Date(Date.now() - i * 86400000).toISOString(),
        poolId,
        status,
        metrics: generateRandomMetrics(),
      };

      // Store simulation metadata
      await redis.set(
        `simulation:${simulationId}:metadata`,
        JSON.stringify(simulation)
      );

      // Store simulation progress
      if (status === "completed") {
        await redis.zadd(
          `simulation:${simulationId}:progress`,
          Date.now(),
          JSON.stringify({ progress: 100 })
        );
      } else if (status === "running") {
        const progress = Math.floor(Math.random() * 90) + 10;
        await redis.zadd(
          `simulation:${simulationId}:progress`,
          Date.now(),
          JSON.stringify({ progress })
        );
      }

      console.log(`Created simulation: ${simulationId}`);
    }

    console.log("Seed completed successfully");
  } catch (error) {
    console.error("Seed failed:", error);
  } finally {
    // Close Redis connection
    redis.quit();
  }
}

// Run the seed
seedSimulations();
