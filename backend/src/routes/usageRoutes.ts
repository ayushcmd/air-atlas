import { Router } from 'express'
import { getUsageSnapshot } from '../utils/usageTracker'

const router = Router()

/**
 * GET /api/usage
 * Returns current API usage counters for OpenWeatherMap and MapTiler,
 * compared to their free-tier limits.
 */
router.get('/', async (_req, res, next) => {
  try {
    const snapshot = await getUsageSnapshot()
    res.json(snapshot)
  } catch (err) {
    next(err)
  }
})

export default router
