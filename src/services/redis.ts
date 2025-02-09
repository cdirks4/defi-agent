import { Redis } from "@upstash/redis";
import { calculateWaitTime, handleRetryError } from "@/utils/llamaRetryUtils";
import { logger } from "@/lib/logger";

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

  async zadd(key: string, scoreMembers: { score: number; member: string }, maxRetries = 3): Promise<number | null> {
    let attempt = 1;
    while (attempt <= maxRetries) {
      try {
        if (!this.client) {
          return null;
        }
        const { score, member } = scoreMembers;

        logger.debug('Adding to sorted set', {
          module: 'redis',
          method: 'zadd',
          key,
          score,
          memberLength: member.length
        });

        // Upstash Redis expects zadd arguments in this format: { score: number, member: any }
        return await this.client.zadd(key, { score, member });
      } catch (error) {
        const context = {
          module: 'redis',
          method: 'zadd',
          key,
          attempt,
          maxRetries
        };

        handleRetryError(error, attempt, { context });

        if (attempt === maxRetries) {
          logger.error(`Redis zadd failed after ${maxRetries} attempts for key ${key}`, context, error as Error);
          return null;
        }

        const waitTime = calculateWaitTime(error, attempt, { context });
        await new Promise(resolve => setTimeout(resolve, waitTime));
        attempt++;
      }
    }
    return null;
  }

  async zrange(
    key: string,
    start: number,
    stop: number,
    options?: { rev?: boolean }
  ): Promise<string[]> {
    try {
      if (!this.client) {
        logger.warn('Redis client not initialized', {
          module: 'redis',
          method: 'zrange',
          key
        });
        return [];
      }
      
      let results: string[];
      
      if (options?.rev) {
        // For reverse order, we need to use ZREVRANGE
        // Upstash Redis doesn't have direct ZREVRANGE, so we'll use zrange with different parameters
        results = await this.client.zrange(key, start, stop, {
          rev: true
        }) as string[];
        
        logger.debug('Fetched sorted set in reverse order', {
          module: 'redis',
          method: 'zrange',
          key,
          resultsCount: results.length,
          reversed: true
        });
      } else {
        results = await this.client.zrange(key, start, stop) as string[];
        
        logger.debug('Fetched sorted set in normal order', {
          module: 'redis',
          method: 'zrange',
          key,
          resultsCount: results.length
        });
      }
      
      return results;
    } catch (error) {
      logger.error('Redis zrange error', {
        module: 'redis',
        method: 'zrange',
        key,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
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
    const testResult = await redis.get("test_connection");
    
    if (testResult !== "ok") {
      throw new Error("Redis connection test failed: unexpected response");
    }
    
    logger.info("Redis indices ready for use", {
      module: 'redis',
      method: 'initializeRedisIndices'
    });
  } catch (error) {
    logger.error("Redis initialization failed", {
      module: 'redis',
      method: 'initializeRedisIndices'
    }, error as Error);
  }
}
