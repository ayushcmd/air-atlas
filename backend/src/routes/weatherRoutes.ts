import { Router } from 'express'
import { getWeather } from '../services/weatherService'
import { validate } from '../middleware/validate'
import { cache } from '../middleware/cache'
import { weatherParamsSchema } from '../schemas/weatherSchema'

const router = Router()

const WEATHER_TTL = 30 * 60 // 30 minutes

/**
 * GET /api/weather/:lat/:lon
 * Returns current weather + 5-day forecast for a coordinate pair.
 */
router.get(
  '/:lat/:lon',
  validate(weatherParamsSchema, 'params'),
  cache(WEATHER_TTL),
  async (req, res, next) => {
  try {
    const { lat, lon } = req.params as unknown as { lat: number; lon: number }
    const data = await getWeather(lat, lon)
    res.json(data)
  } catch (err) {
    next(err)
  }
})

export default router
