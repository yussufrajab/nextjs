/**
 * Redis Connection Configuration
 *
 * Provides a singleton Redis connection for BullMQ job queues
 * Used for background job processing and progress tracking
 */

import Redis from 'ioredis';

// Redis connection configuration
const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined, // Optional password for cloud Redis
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: false, // Required for BullMQ
  retryStrategy(times: number) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
};

// Singleton Redis connection
let redisConnection: Redis | null = null;

/**
 * Get or create Redis connection
 * @returns Redis connection instance
 */
export function getRedisConnection(): Redis {
  if (!redisConnection) {
    redisConnection = new Redis(REDIS_CONFIG);

    redisConnection.on('connect', () => {
      console.log('✅ Redis connected');
    });

    redisConnection.on('error', (error) => {
      console.error('❌ Redis connection error:', error);
    });

    redisConnection.on('close', () => {
      console.log('⚠️  Redis connection closed');
    });
  }

  return redisConnection;
}

/**
 * Close Redis connection (for cleanup)
 */
export async function closeRedisConnection(): Promise<void> {
  if (redisConnection) {
    await redisConnection.quit();
    redisConnection = null;
  }
}

/**
 * Create a new Redis connection (for BullMQ workers/queues)
 * Each queue/worker should have its own connection
 */
export function createRedisConnection(): Redis {
  return new Redis(REDIS_CONFIG);
}
