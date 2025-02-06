import { PrismaClient } from "@prisma/client";

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

  async storeEmbedding(data: {
    vector: number[];
    content: string;
    metadata?: any;
  }) {
    return this.prisma.embedding.create({
      data: {
        vector: `[${data.vector.join(",")}]`,
        content: data.content,
        metadata: data.metadata || {},
      },
    });
  }

  async findSimilarEmbeddings(vector: number[], limit = 5) {
    return this.prisma.$queryRaw`
      SELECT id, content, metadata,
             1 - (vector <=> ${vector}::vector) as similarity
      FROM "embeddings"
      ORDER BY similarity DESC
      LIMIT ${limit}
    `;
  }

  async findSimilarInteractions(embedding: number[], limit = 5) {
    return this.prisma.$queryRaw`
      SELECT id, message, response, metadata,
             1 - (embedding <=> ${embedding}::vector) as similarity
      FROM "UserInteraction"
      ORDER BY similarity DESC
      LIMIT ${limit}
    `;
  }
}

export const dbService = new DatabaseService();
