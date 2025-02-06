import { redis } from './redis'

export class CacheService {
  private readonly TTL = 3600 // 1 hour in seconds

  // Redis index prefixes
  private readonly INDICES = {
    USER_INTERACTIONS: 'idx:interactions',
    EMBEDDINGS: 'idx:embeddings',
    TRADE_HISTORY: 'idx:trades',
    ACTIVE_SESSIONS: 'idx:sessions'
  }

  async cacheUserInteraction(interaction: any) {
    const cacheKey = `interaction:${interaction.id}`
    await Promise.all([
      // Store the interaction
      redis.set(cacheKey, JSON.stringify(interaction), {
        ex: this.TTL
      }),
      // Add to user's interaction index
      redis.zadd(
        `${this.INDICES.USER_INTERACTIONS}:${interaction.userId}`,
        { score: Date.now(), member: cacheKey }
      )
    ])
    return cacheKey
  }

  async getCachedInteraction(id: string) {
    const cached = await redis.get(`interaction:${id}`)
    return cached ? JSON.parse(cached as string) : null
  }

  async getUserInteractions(userId: string, limit = 10) {
    const keys = await redis.zrange(
      `${this.INDICES.USER_INTERACTIONS}:${userId}`,
      0,
      limit - 1,
      { rev: true }
    )
    return Promise.all(
      keys.map(key => this.getCachedInteraction(key as string))
    )
  }

  async cacheEmbedding(embedding: number[], metadata: any) {
    const cacheKey = `embedding:${metadata.userId}:${Date.now()}`
    await Promise.all([
      redis.set(cacheKey, {
        vector: embedding,
        metadata
      }, {
        ex: this.TTL
      }),
      redis.zadd(
        `${this.INDICES.EMBEDDINGS}:${metadata.userId}`,
        { score: Date.now(), member: cacheKey }
      )
    ])
    return cacheKey
  }

  async getRecentEmbeddings(userId: string, limit = 5) {
    const keys = await redis.zrange(
      `${this.INDICES.EMBEDDINGS}:${userId}`,
      0,
      limit - 1,
      { rev: true }
    )
    return Promise.all(
      keys.map(key => redis.get(key as string))
    ).then(results => results.filter(Boolean))
  }

  async clearUserCache(userId: string) {
    const interactionKeys = await redis.zrange(
      `${this.INDICES.USER_INTERACTIONS}:${userId}`,
      0,
      -1
    )
    const embeddingKeys = await redis.zrange(
      `${this.INDICES.EMBEDDINGS}:${userId}`,
      0,
      -1
    )
    
    return Promise.all([
      ...interactionKeys.map(key => redis.del(key as string)),
      ...embeddingKeys.map(key => redis.del(key as string)),
      redis.del(`${this.INDICES.USER_INTERACTIONS}:${userId}`),
      redis.del(`${this.INDICES.EMBEDDINGS}:${userId}`)
    ])
  }
}

export const cacheService = new CacheService()