import { Router } from 'express'
import { geocode } from '../services/geocodeService'
import { validate } from '../middleware/validate'
import { cache } from '../middleware/cache'
import { geocodeQuerySchema } from '../schemas/geocodeSchema'

const router = Router()

const GEOCODE_TTL = 24 * 60 * 60 // 24 hours

/**
 * GET /api/geocode?query=Paris
 * Returns a list of matching locations with coordinates.
 */
router.get('/', validate(geocodeQuerySchema, 'query'), cache(GEOCODE_TTL), async (req, res, next) => {
  try {
    const { query } = req.query as unknown as { query: string }
    const results = await geocode(query)
    res.json(results)
  } catch (err) {
    next(err)
  }
})

export default router
