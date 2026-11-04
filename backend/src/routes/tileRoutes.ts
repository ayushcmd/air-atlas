import { Router } from 'express'
import axios from 'axios'
import { apiClient } from '../config/apiClient'
import { logger } from '../utils/logger'

const router = Router()

const OWM_TILE_BASE = 'https://tile.openweathermap.org/map'

const VALID_LAYERS = [
  'temp_new',
  'precipitation_new',
  'clouds_new',
  'wind_new',
  'pressure_new',
]

/**
 * GET /api/tiles/:layer/:z/:x/:y
 * Proxies OpenWeatherMap weather map tiles so the API key stays server-side.
 * Responses are cached by the browser via Cache-Control headers.
 */
router.get('/:layer/:z/:x/:y', async (req, res, next) => {
  try {
    const { layer, z, x, y } = req.params

    if (!VALID_LAYERS.includes(layer)) {
      res.status(400).json({ error: `Invalid layer: ${layer}` })
      return
    }

    const apiKey = process.env.OPENWEATHERMAP_API_KEY
    if (!apiKey) {
      res.status(500).json({ error: 'OWM API key not configured' })
      return
    }

    const url = `${OWM_TILE_BASE}/${layer}/${z}/${x}/${y}.png?appid=${apiKey}`

    const response = await apiClient.get(url, {
      responseType: 'arraybuffer',
      timeout: 10_000,
    })

    res.set({
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=600', // 10-min browser cache
      'Access-Control-Allow-Origin': '*',
    })
    res.send(response.data)
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      // Tile not found — return transparent 1×1 PNG
      const TRANSPARENT_PNG = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQAB' +
          'Nl7BcQAAAABJRU5ErkJggg==',
        'base64',
      )
      res.set({ 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=60' })
      res.send(TRANSPARENT_PNG)
      return
    }
    logger.warn('Tile proxy error', {
      layer: req.params.layer,
      z: req.params.z,
      x: req.params.x,
      y: req.params.y,
    })
    next(err)
  }
})

export default router
