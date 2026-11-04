import { createClient } from 'redis'

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379'

export const redis = createClient({ url: REDIS_URL })

redis.on('error', (err: Error) => {
  console.error('[Redis] Connection error:', err.message)
})

redis.on('connect', () => {
  console.log('[Redis] Connected')
})

/** Connect to Redis. Logs a warning instead of crashing if unavailable. */
export async function connectRedis(): Promise<void> {
  try {
    await redis.connect()
  } catch (err) {
    console.warn('[Redis] Failed to connect — caching disabled:', (err as Error).message)
  }
}
