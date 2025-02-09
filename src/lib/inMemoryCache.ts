import { logger } from "@/lib/logger";

/**
 * In-memory cache implementation with TTL support
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class InMemoryCache {
  private cache: Map<string, CacheEntry<any>>;
  private readonly DEFAULT_TTL = 60 * 1000; // 1 minute default TTL

  constructor() {
    this.cache = new Map();
  }

  set<T>(key: string, value: T, ttlMs: number = this.DEFAULT_TTL): void {
    const expiresAt = Date.now() + ttlMs;
    this.cache.set(key, { value, expiresAt });
    logger.debug('Cache entry set', {
      module: 'cache',
      method: 'set',
      key,
      ttlMs,
      expiresAt: new Date(expiresAt).toISOString()
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      logger.debug('Cache miss', {
        module: 'cache',
        method: 'get',
        key,
        reason: 'entry_not_found'
      });
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      logger.debug('Cache miss', {
        module: 'cache',
        method: 'get',
        key,
        reason: 'entry_expired',
        expiresAt: new Date(entry.expiresAt).toISOString()
      });
      return null;
    }

    logger.debug('Cache hit', {
      module: 'cache',
      method: 'get',
      key,
      expiresIn: Math.round((entry.expiresAt - Date.now()) / 1000) + 's'
    });
    return entry.value as T;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache stats
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Export a singleton instance
export const inMemoryCache = new InMemoryCache();

// Start periodic cleanup
setInterval(() => {
  inMemoryCache.cleanup();
}, 60000); // Clean up every minute
