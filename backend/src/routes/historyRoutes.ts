import { Router, type Request, type Response, type NextFunction } from 'express'
import {
  queryWeatherHistory,
  queryAqiHistory,
  type HistoryPoint,
  type AqiHistoryPoint,
} from '../services/influxService'
import { cache } from '../middleware/cache'

const router = Router()

/** TTL in seconds for each time range — shorter ranges refresh sooner */
const HISTORY_TTL: Record<string, number> = {
  '1h':  5 * 60,
  '6h':  10 * 60,
  '12h': 15 * 60,
  '24h': 20 * 60,
  '3d':  30 * 60,
  '7d':  60 * 60,
  '14d': 2 * 60 * 60,
  '30d': 3 * 60 * 60,
}

/* ── Allowed range / window values (prevent Flux injection) ─────────────── */

const ALLOWED_RANGES = new Set(['1h', '6h', '12h', '24h', '3d', '7d', '14d', '30d'])
const ALLOWED_WINDOWS = new Set(['5m', '15m', '30m', '1h', '3h', '6h', '12h', '1d'])

function resolveWindow(range: string): string {
  const map: Record<string, string> = {
    '1h': '5m',
    '6h': '15m',
    '12h': '30m',
    '24h': '1h',
    '3d': '3h',
    '7d': '6h',
    '14d': '12h',
    '30d': '1d',
  }
  return map[range] ?? '1h'
}

/**
 * GET /api/history/weather/:lat/:lon?range=24h&every=1h
 *
 * Returns time-series weather data from InfluxDB.
 */
router.get(
  '/weather/:lat/:lon',
  (req, res, next) => {
    const range = ALLOWED_RANGES.has(req.query.range as string)
      ? (req.query.range as string)
      : '24h'
    return cache(HISTORY_TTL[range] ?? 20 * 60)(req, res, next)
  },
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const lat = parseFloat(String(req.params.lat))
      const lon = parseFloat(String(req.params.lon))

      if (Number.isNaN(lat) || Number.isNaN(lon)) {
        res.status(400).json({ error: 'Invalid lat/lon parameters' })
        return
      }

      const range = ALLOWED_RANGES.has(req.query.range as string)
        ? (req.query.range as string)
        : '24h'
      const every = ALLOWED_WINDOWS.has(req.query.every as string)
        ? (req.query.every as string)
        : resolveWindow(range)

      const data: HistoryPoint[] = await queryWeatherHistory(lat, lon, range, every)
      res.json({ lat, lon, range, every, count: data.length, data })
    } catch (err) {
      next(err)
    }
  },
)

/**
 * GET /api/history/air-quality/:lat/:lon?range=24h&every=1h
 *
 * Returns time-series air quality data from InfluxDB.
 */
router.get(
  '/air-quality/:lat/:lon',
  (req, res, next) => {
    const range = ALLOWED_RANGES.has(req.query.range as string)
      ? (req.query.range as string)
      : '24h'
    return cache(HISTORY_TTL[range] ?? 20 * 60)(req, res, next)
  },
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const lat = parseFloat(String(req.params.lat))
      const lon = parseFloat(String(req.params.lon))

      if (Number.isNaN(lat) || Number.isNaN(lon)) {
        res.status(400).json({ error: 'Invalid lat/lon parameters' })
        return
      }

      const range = ALLOWED_RANGES.has(req.query.range as string)
        ? (req.query.range as string)
        : '24h'
      const every = ALLOWED_WINDOWS.has(req.query.every as string)
        ? (req.query.every as string)
        : resolveWindow(range)

      const data: AqiHistoryPoint[] = await queryAqiHistory(lat, lon, range, every)
      res.json({ lat, lon, range, every, count: data.length, data })
    } catch (err) {
      next(err)
    }
  },
)

/**
 * GET /api/history/export/:lat/:lon?range=24h&format=csv
 *
 * Export weather history as CSV.
 */
router.get(
  '/export/:lat/:lon',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const lat = parseFloat(String(req.params.lat))
      const lon = parseFloat(String(req.params.lon))

      if (Number.isNaN(lat) || Number.isNaN(lon)) {
        res.status(400).json({ error: 'Invalid lat/lon parameters' })
        return
      }

      const range = ALLOWED_RANGES.has(req.query.range as string)
        ? (req.query.range as string)
        : '24h'
      const every = resolveWindow(range)

      const [weatherData, aqiData] = await Promise.all([
        queryWeatherHistory(lat, lon, range, every),
        queryAqiHistory(lat, lon, range, every),
      ])

      // Build CSV
      const headers = [
        'time',
        'temp_c',
        'feels_like_c',
        'humidity_pct',
        'wind_speed_ms',
        'precipitation_mm',
        'aqi',
        'pm2_5',
        'pm10',
        'o3',
      ]

      // Index AQI data by time for joining
      const aqiByTime = new Map(aqiData.map((a) => [a.time, a]))

      const rows = weatherData.map((w) => {
        const aqi = aqiByTime.get(w.time)
        return [
          w.time,
          w.temp ?? '',
          w.feels_like ?? '',
          w.humidity ?? '',
          w.wind_speed ?? '',
          w.precipitation ?? '',
          aqi?.aqi ?? '',
          aqi?.pm2_5 ?? '',
          aqi?.pm10 ?? '',
          aqi?.o3 ?? '',
        ].join(',')
      })

      const csv = [headers.join(','), ...rows].join('\n')

      res.setHeader('Content-Type', 'text/csv')
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="climate-${lat.toFixed(2)}_${lon.toFixed(2)}_${range}.csv"`,
      )
      res.send(csv)
    } catch (err) {
      next(err)
    }
  },
)

export default router
