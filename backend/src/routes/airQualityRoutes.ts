import { Router } from 'express'
import { getAirQuality } from '../services/airQualityService'
import { validate } from '../middleware/validate'
import { cache } from '../middleware/cache'
import { weatherParamsSchema } from '../schemas/weatherSchema'

const router = Router()

const AQI_TTL = 30 * 60 // 30 minutes

/**
 * GET /api/air-quality/:lat/:lon
 * Returns current air quality index and pollutant concentrations for a coordinate pair.
 */
router.get(
  '/:lat/:lon',
  validate(weatherParamsSchema, 'params'),
  cache(AQI_TTL),
  async (req, res, next) => {
    try {
      const { lat, lon } = req.params as unknown as { lat: number; lon: number }
      const data = await getAirQuality(lat, lon)
      res.json(data)
    } catch (err) {
      next(err)
    }
  },
)

export default router
