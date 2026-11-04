import rateLimit from 'express-rate-limit'

/**
 * General API rate limiter.
 * Default: 100 req / 15 min in production, 500 in development.
 * Override with RATE_LIMIT_MAX env var.
 */
const defaultMax = process.env.NODE_ENV === 'production' ? 100 : 500

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX ?? String(defaultMax), 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
})

/**
 * Stricter limiter for search/geocode — 30 requests per minute per IP.
 */
export const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many search requests, please slow down.' },
})

/**
 * Limiter for export endpoints — 10 requests per minute per IP.
 */
export const exportLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many export requests, please try again later.' },
})
