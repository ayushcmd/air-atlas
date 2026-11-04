import { Server as SocketServer, Socket } from 'socket.io'
import type { Server as HttpServer } from 'http'
import { getWeather } from '../services/weatherService'
import { getAirQuality } from '../services/airQualityService'
import { writeWeatherPoint, writeAirQualityPoint } from '../services/influxService'
import { logger } from '../utils/logger'

/* ── Configuration ──────────────────────────────────────────────────────── */

/** How often to broadcast weather updates for subscribed locations (ms) */
const BROADCAST_INTERVAL = Number(process.env.WS_BROADCAST_INTERVAL) || 30_000

/** Maximum locations a single client can subscribe to */
const MAX_SUBSCRIPTIONS = 5

/* ── Types ──────────────────────────────────────────────────────────────── */

interface SubscribePayload {
  lat: number
  lon: number
  name?: string
}

interface WeatherUpdate {
  lat: number
  lon: number
  location: string
  current: Record<string, unknown>
  forecast: Record<string, unknown>[]
  timestamp: string
}

interface AirQualityUpdate {
  lat: number
  lon: number
  aqi: number
  label: string
  components: Record<string, number>
  timestamp: string
}

/* ── Tracked subscriptions ──────────────────────────────────────────────── */

/** Key = "lat,lon" (rounded to 2dp) — value = set of socket IDs */
const locationSubscribers = new Map<string, Set<string>>()

/** Reverse map: socket ID → set of location keys */
const clientSubscriptions = new Map<string, Set<string>>()

function locationKey(lat: number, lon: number): string {
  return `${lat.toFixed(2)},${lon.toFixed(2)}`
}

/* ── Helper: fetch & emit weather + AQI for a location ──────────────────── */

async function fetchAndEmit(
  io: SocketServer,
  key: string,
  lat: number,
  lon: number,
) {
  const timestamp = new Date().toISOString()

  try {
    const [weatherResult, aqiResult] = await Promise.allSettled([
      getWeather(lat, lon),
      getAirQuality(lat, lon),
    ])

    if (weatherResult.status === 'fulfilled') {
      const w = weatherResult.value
      const update: WeatherUpdate = {
        lat: w.lat,
        lon: w.lon,
        location: w.location,
        current: w.current as unknown as Record<string, unknown>,
        forecast: w.forecast as unknown as Record<string, unknown>[],
        timestamp,
      }
      io.to(key).emit('weather:update', update)

      // Persist to InfluxDB (fire-and-forget)
      writeWeatherPoint(w)
    } else {
      logger.warn(`Socket broadcast: weather fetch failed for ${key}`, {
        error: weatherResult.reason?.message,
      })
    }

    if (aqiResult.status === 'fulfilled') {
      const a = aqiResult.value
      const locationName = weatherResult.status === 'fulfilled' ? weatherResult.value.location : undefined
      const update: AirQualityUpdate = {
        lat,
        lon,
        aqi: a.aqi,
        label: a.label,
        components: a.components,
        timestamp,
      }
      io.to(key).emit('air-quality:update', update)

      // Persist to InfluxDB (fire-and-forget) — include location tag if available
      writeAirQualityPoint(lat, lon, a, locationName)
    }
  } catch (err) {
    logger.error(`Socket broadcast error for ${key}`, {
      error: err instanceof Error ? err.message : err,
    })
  }
}

/* ── Handle alert thresholds ────────────────────────────────────────────── */

interface AlertThresholds {
  temp_high: number
  temp_low: number
  wind_speed: number
  aqi: number
}

const DEFAULT_THRESHOLDS: AlertThresholds = {
  temp_high: 40,
  temp_low: -20,
  wind_speed: 100,
  aqi: 300,
}

function checkAlerts(
  io: SocketServer,
  key: string,
  weather: Record<string, unknown>,
  aqi?: number,
) {
  const alerts: Array<{ type: string; message: string; severity: 'warning' | 'critical' }> = []

  const temp = weather.temp as number | undefined
  const windSpeed = weather.wind_speed as number | undefined

  if (temp !== undefined && temp > DEFAULT_THRESHOLDS.temp_high) {
    alerts.push({
      type: 'extreme_heat',
      message: `Extreme heat: ${temp}°C`,
      severity: temp > 45 ? 'critical' : 'warning',
    })
  }
  if (temp !== undefined && temp < DEFAULT_THRESHOLDS.temp_low) {
    alerts.push({
      type: 'extreme_cold',
      message: `Extreme cold: ${temp}°C`,
      severity: temp < -30 ? 'critical' : 'warning',
    })
  }
  if (windSpeed !== undefined && windSpeed > DEFAULT_THRESHOLDS.wind_speed / 3.6) {
    // Convert km/h threshold to m/s for comparison
    alerts.push({
      type: 'high_wind',
      message: `High wind: ${windSpeed} m/s`,
      severity: windSpeed > 40 ? 'critical' : 'warning',
    })
  }
  if (aqi !== undefined && aqi > DEFAULT_THRESHOLDS.aqi) {
    alerts.push({
      type: 'poor_air_quality',
      message: `Poor air quality: AQI ${aqi}`,
      severity: aqi > 400 ? 'critical' : 'warning',
    })
  }

  if (alerts.length > 0) {
    io.to(key).emit('weather:alerts', {
      lat: parseFloat(key.split(',')[0]),
      lon: parseFloat(key.split(',')[1]),
      alerts,
      timestamp: new Date().toISOString(),
    })
  }
}

/* ── Main setup ─────────────────────────────────────────────────────────── */

export function setupSocketIO(httpServer: HttpServer): SocketServer {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  })

  logger.info('⚡ Socket.IO server initialised')

  // ── Connection handler ──────────────────────────────────────────────
  io.on('connection', (socket: Socket) => {
    logger.info(`Client connected: ${socket.id}`)
    clientSubscriptions.set(socket.id, new Set())

    // Tell the client the broadcast interval so UI can show a countdown
    socket.emit('config', { broadcastInterval: BROADCAST_INTERVAL })

    // ── Subscribe to a location ─────────────────────────────────────
    socket.on('subscribe', async (payload: SubscribePayload) => {
      const { lat, lon } = payload
      if (typeof lat !== 'number' || typeof lon !== 'number') {
        socket.emit('error', { message: 'Invalid subscribe payload' })
        return
      }

      const key = locationKey(lat, lon)
      const mySubs = clientSubscriptions.get(socket.id)!

      // Enforce max subscriptions
      if (mySubs.size >= MAX_SUBSCRIPTIONS && !mySubs.has(key)) {
        socket.emit('error', {
          message: `Max ${MAX_SUBSCRIPTIONS} subscriptions reached`,
        })
        return
      }

      // Join the Socket.IO room for this location
      socket.join(key)
      mySubs.add(key)

      if (!locationSubscribers.has(key)) {
        locationSubscribers.set(key, new Set())
      }
      locationSubscribers.get(key)!.add(socket.id)

      logger.info(`${socket.id} subscribed to ${key}`)

      // Send an immediate update on subscribe
      await fetchAndEmit(io, key, lat, lon)
    })

    // ── Unsubscribe from a location ──────────────────────────────────
    socket.on('unsubscribe', (payload: SubscribePayload) => {
      const { lat, lon } = payload
      const key = locationKey(lat, lon)

      socket.leave(key)
      clientSubscriptions.get(socket.id)?.delete(key)
      locationSubscribers.get(key)?.delete(socket.id)

      // Clean up empty location entries
      if (locationSubscribers.get(key)?.size === 0) {
        locationSubscribers.delete(key)
      }

      logger.info(`${socket.id} unsubscribed from ${key}`)
    })

    // ── Disconnect ───────────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      logger.info(`Client disconnected: ${socket.id} (${reason})`)

      const mySubs = clientSubscriptions.get(socket.id) ?? new Set()
      for (const key of mySubs) {
        locationSubscribers.get(key)?.delete(socket.id)
        if (locationSubscribers.get(key)?.size === 0) {
          locationSubscribers.delete(key)
        }
      }
      clientSubscriptions.delete(socket.id)
    })
  })

  // ── Periodic broadcast ───────────────────────────────────────────────
  setInterval(async () => {
    const activeLocations = Array.from(locationSubscribers.keys())
    if (activeLocations.length === 0) return

    logger.info(`Broadcasting weather for ${activeLocations.length} location(s)`)

    // Fetch in batches of 5 to avoid hammering the API
    const BATCH_SIZE = 5
    for (let i = 0; i < activeLocations.length; i += BATCH_SIZE) {
      const batch = activeLocations.slice(i, i + BATCH_SIZE)
      await Promise.all(
        batch.map(async (key) => {
          const [latStr, lonStr] = key.split(',')
          const lat = parseFloat(latStr)
          const lon = parseFloat(lonStr)
          await fetchAndEmit(io, key, lat, lon)

          // Check for alerts after fetching (reuse latest data from cache)
          try {
            const weather = await getWeather(lat, lon)
            const aqi = await getAirQuality(lat, lon).catch(() => null)
            checkAlerts(
              io,
              key,
              weather.current as unknown as Record<string, unknown>,
              aqi?.aqi,
            )
          } catch {
            // Alert check is best-effort
          }
        }),
      )
    }
  }, BROADCAST_INTERVAL)

  return io
}
