import type { Request, Response, NextFunction } from 'express'
import { redis } from '../config/redis'

/**
 * Returns an Express middleware that:
 *  1. Checks Redis for a cached response keyed on `req.originalUrl`
 *  2. If found, returns it immediately (cache hit)
 *  3. Otherwise lets the request through and stores the response body in Redis
 *     with the given TTL (in seconds)
 */
export function cache(ttlSeconds: number) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip caching if Redis is not ready
    if (!redis.isReady) {
      next()
      return
    }

    const key = `cache:${req.originalUrl}`

    try {
      const cached = await redis.get(key)
      if (cached) {
        res.setHeader('X-Cache', 'HIT')
        res.json(JSON.parse(cached))
        return
      }
    } catch {
      // Redis error — degrade gracefully and proceed without cache
      next()
      return
    }

    // Monkey-patch res.json to capture and store the response
    const originalJson = res.json.bind(res)
    res.json = (body: unknown) => {
      if (res.statusCode === 200 && redis.isReady) {
        redis.setEx(key, ttlSeconds, JSON.stringify(body)).catch(() => {
          // ignore write errors
        })
      }
      res.setHeader('X-Cache', 'MISS')
      return originalJson(body)
    }

    next()
  }
}
