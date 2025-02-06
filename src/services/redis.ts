import { Redis } from "@upstash/redis";
// UPSTASH_REDIS_REST_URL = "https://darling-muskrat-30013.upstash.io";
// UPSTASH_REDIS_REST_TOKEN = "";
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
        url: "https://darling-muskrat-30013.upstash.io",
        token: "AXU9AAIjcDFkZTQzMWMxZjQ1NTA0ZGIwYTBkZTUzOWZiOTNiNjk0MXAxMA",
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
