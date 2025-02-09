import { PrismaClient } from "@prisma/client";
import { SimulationResult } from "@/types/simulation";
import { logger } from "@/lib/logger";

class DatabaseService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async storeInteraction(data: {
    userId: string;
    message: string;
    response: string;
    embedding?: number[];
    metadata?: any;
  }) {
    return this.prisma.$executeRaw`
      INSERT INTO "UserInteraction" ("userId", "message", "response", "embedding", "metadata")
      VALUES (${data.userId}, ${data.message}, ${data.response}, 
        ${data.embedding ? `[${data.embedding.join(",")}]` : null}::vector,
        ${JSON.stringify(data.metadata || {})}::jsonb)
    `;
  }

  async getUserHistory(userId: string, limit = 5) {
    return this.prisma.userInteraction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  async storeTrade(data: {
    userId: string;
    txHash: string;
    tokenSymbol: string;
    amount: string;
    price: string;
    type: "BUY" | "SELL";
    status: string;
  }) {
    return this.prisma.tradeHistory.create({
      data,
    });
  }

  async getTradeHistory(userId: string) {
    return this.prisma.tradeHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async storeSimulationResult(data: {
    userId: string;
    startDate: Date;
    endDate: Date;
    token0: string;
    token1: string;
    result: SimulationResult;
  }) {
    const context = {
      module: 'database',
      method: 'storeSimulationResult',
      userId: data.userId,
      token0: data.token0,
      token1: data.token1,
      startDate: data.startDate.toISOString(),
      endDate: data.endDate.toISOString()
    };

    try {
      logger.info('Storing simulation result', context);

      const result = await this.prisma.simulationHistory.create({
        data: {
          userId: data.userId,
          startDate: data.startDate,
          endDate: data.endDate,
          token0: data.token0,
          token1: data.token1,
          trades: data.result.trades,
          metrics: data.result.metrics,
          marketContext: data.result.marketContext,
        },
      });

      logger.info('Successfully stored simulation result', {
        ...context,
        resultId: result.id
      });

      return result;
    } catch (error) {
      logger.error('Failed to store simulation result', context, error as Error);
      throw error;
    }
  }

  async getSimulationHistory(userId: string, limit = 10) {
    return this.prisma.simulationHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  async storeEmbedding(data: {
    vector: number[];
    content: string;
    metadata: any;
  }) {
    try {
      const vectorString = JSON.stringify(data.vector);
  
      return this.prisma.simulationResult.create({
        data: {
          userId: 'simulation', // Add default userId
          vector: vectorString,
          content: data.content,
          metadata: data.metadata,
          createdAt: new Date(),
          startDate: new Date(data.metadata.period.start), // Add required fields
          endDate: new Date(data.metadata.period.end),
          token0: data.metadata.tokenPair.token0,
          token1: data.metadata.tokenPair.token1,
          result: {}, // Add empty result object
        },
      });
    } catch (error) {
      console.error("Failed to store embedding:", error);
      return null;
    }
  }

  // Additional database helper methods can be added here
}

export const dbService = new DatabaseService();
