import type { Request, Response, NextFunction } from 'express'
import axios from 'axios'
import { logger } from '../utils/logger'

interface ApiError extends Error {
  status?: number
}

/**
 * Global Express error handler.
 * - Detects upstream API failures (axios errors) and returns 502
 * - Returns the raw status for known HTTP errors
 * - Falls back to 500 for everything else
 */
export function errorHandler(
  err: ApiError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  // Axios / upstream API errors
  if (axios.isAxiosError(err)) {
    const upstream = err.response?.status ?? 502
    const message = err.response?.data?.message ?? 'External API request failed'
    logger.warn('Upstream API error', {
      url: req.originalUrl,
      upstreamStatus: upstream,
      message,
    })
    res.status(502).json({ error: 'Upstream API error', message })
    return
  }

  const status = err.status ?? 500
  const message = status < 500 ? err.message : 'Internal server error'

  if (status >= 500) {
    logger.error('Unhandled server error', {
      url: req.originalUrl,
      method: req.method,
      error: err.message,
      stack: err.stack,
    })
  } else {
    logger.warn('Client error', { url: req.originalUrl, status, message })
  }

  res.status(status).json({ error: message })
}
