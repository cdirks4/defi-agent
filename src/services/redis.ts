import { Redis } from "@upstash/redis";

interface ZAddOptions {
  score: number;
  member: string;
}

class RedisService {
  private client: Redis | null = null;

  constructor() {
    try {
      if (
        !process.env.UPSTASH_REDIS_REST_URL ||
        !process.env.UPSTASH_REDIS_REST_TOKEN
      ) {
        console.warn("Redis credentials not found in environment variables");
        return;
      }

      this.client = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
    } catch (error) {
      console.error("Failed to initialize Redis client:", error);
    }
  }

  async get(key: string): Promise<any> {
    try {
      if (!this.client) {
        return null;
      }
      return await this.client.get(key);
    } catch (error) {
      console.error(`Redis get error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: any, options?: { ex?: number }): Promise<void> {
    try {
      if (!this.client) {
        return;
      }
      await this.client.set(key, value, options);
    } catch (error) {
      console.error(`Redis set error for key ${key}:`, error);
    }
  }

  async zadd(key: string, scoreMembers: ZAddOptions): Promise<number | null> {
    try {
      if (!this.client) {
        return null;
      }
      return await this.client.zadd(key, { [scoreMembers.member]: scoreMembers.score });
    } catch (error) {
      console.error(`Redis zadd error for key ${key}:`, error);
      return null;
    }
  }

  async zrange(
    key: string, 
    start: number, 
    stop: number, 
    options?: { rev?: boolean }
  ): Promise<string[]> {
    try {
      if (!this.client) {
        return [];
      }
      const command = options?.rev ? 'zrevrange' : 'zrange';
      return await this.client[command](key, start, stop) as string[];
    } catch (error) {
      console.error(`Redis zrange error for key ${key}:`, error);
      return [];
    }
  }

  async del(key: string): Promise<number> {
    try {
      if (!this.client) {
        return 0;
      }
      return await this.client.del(key);
    } catch (error) {
      console.error(`Redis del error for key ${key}:`, error);
      return 0;
    }
  }
}

export const redis = new RedisService();

export async function initializeRedisIndices() {
  try {
    // Perform connection test
    await redis.set("test_connection", "ok");
    await redis.get("test_connection");
    console.log("Redis indices ready for use");
  } catch (error) {
    console.warn("Redis initialization failed:", error);
  }
}
