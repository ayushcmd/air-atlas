import type { Env, UsageSnapshot } from './types'
import { getWeather } from './services/weather'
import { getAirQuality } from './services/airQuality'
import { geocode } from './services/geocode'
import { queryWeatherHistory, queryAqiHistory, exportCsv } from './services/history'
import { isOwmAvailable, markOwmFailed } from './services/authGuard'

const TRANSPARENT_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQABNl7BcQAAAABJRU5ErkJggg=='

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes
}

function getCorsHeaders(env: Env, request: Request): HeadersInit {
  const origin = request.headers.get('Origin') || '*'
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Range',
    'Access-Control-Max-Age': '86400',
  }
}

function jsonResponse(data: unknown, status = 200, extraHeaders: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
  })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const corsHeaders = getCorsHeaders(env, request)

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders })
    }

    const url = new URL(request.url)
    const path = url.pathname

    try {
      // ── GET /health ────────────────────────────────────────────────────────
      if (path === '/health') {
        return jsonResponse(
          { status: 'ok', timestamp: new Date().toISOString() },
          200,
          corsHeaders,
        )
      }

      // ── GET /api ───────────────────────────────────────────────────────────
      if (path === '/api') {
        return jsonResponse(
          { message: 'Climate Tracker API', version: '1.0.0' },
          200,
          corsHeaders,
        )
      }

      // ── GET /api/weather/:lat/:lon ─────────────────────────────────────────
      const weatherMatch = path.match(/^\/api\/weather\/(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/)
      if (weatherMatch) {
        const lat = parseFloat(weatherMatch[1])
        const lon = parseFloat(weatherMatch[2])

        if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
          return jsonResponse({ error: 'Invalid coordinates' }, 400, corsHeaders)
        }

        const data = await getWeather(lat, lon, env)
        return jsonResponse(data, 200, {
          ...corsHeaders,
          'Cache-Control': 'public, max-age=1800',
        })
      }

      // ── GET /api/air-quality/:lat/:lon ─────────────────────────────────────
      const aqiMatch = path.match(/^\/api\/air-quality\/(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/)
      if (aqiMatch) {
        const lat = parseFloat(aqiMatch[1])
        const lon = parseFloat(aqiMatch[2])

        if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
          return jsonResponse({ error: 'Invalid coordinates' }, 400, corsHeaders)
        }

        const data = await getAirQuality(lat, lon, env)
        return jsonResponse(data, 200, {
          ...corsHeaders,
          'Cache-Control': 'public, max-age=1800',
        })
      }

      // ── GET /api/geocode?query=... ─────────────────────────────────────────
      if (path === '/api/geocode') {
        const query = url.searchParams.get('query')
        if (!query || query.trim().length < 2) {
          return jsonResponse({ error: 'Query must be at least 2 characters' }, 400, corsHeaders)
        }

        const results = await geocode(query.trim(), env)
        return jsonResponse(results, 200, {
          ...corsHeaders,
          'Cache-Control': 'public, max-age=86400',
        })
      }

      // ── GET /api/tiles/:layer/:z/:x/:y ─────────────────────────────────────
      const tileMatch = path.match(/^\/api\/tiles\/([^/]+)\/(\d+)\/(\d+)\/(\d+)$/)
      if (tileMatch) {
        const [, layer, z, x, y] = tileMatch
        const validLayers = ['temp_new', 'precipitation_new', 'clouds_new', 'wind_new', 'pressure_new']

        if (!validLayers.includes(layer)) {
          return jsonResponse({ error: `Invalid layer: ${layer}` }, 400, corsHeaders)
        }

        const apiKey = env.OPENWEATHERMAP_API_KEY
        if (isOwmAvailable(apiKey)) {
          try {
            const tileUrl = `https://tile.openweathermap.org/map/${layer}/${z}/${x}/${y}.png?appid=${apiKey}`
            const tileRes = await fetch(tileUrl)
            if (tileRes.status === 401) {
              markOwmFailed()
            } else if (tileRes.ok) {
              const imageBytes = await tileRes.arrayBuffer()
              return new Response(imageBytes, {
                status: 200,
                headers: {
                  ...corsHeaders,
                  'Content-Type': 'image/png',
                  'Cache-Control': 'public, max-age=600',
                },
              })
            }
          } catch {
            // Graceful transparent fallback on network failure
          }
        }

        // Graceful transparent 1x1 PNG fallback — avoids repetitive external tile requests
        const pngBytes = base64ToUint8Array(TRANSPARENT_PNG_BASE64)
        return new Response(pngBytes, {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=3600',
          },
        })
      }

      // ── GET /api/history/weather/:lat/:lon ─────────────────────────────────
      const historyWeatherMatch = path.match(
        /^\/api\/history\/weather\/(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/,
      )
      if (historyWeatherMatch) {
        const lat = parseFloat(historyWeatherMatch[1])
        const lon = parseFloat(historyWeatherMatch[2])
        const range = url.searchParams.get('range') || '24h'
        const every = url.searchParams.get('every') || '1h'

        const data = await queryWeatherHistory(lat, lon, range)
        return jsonResponse(
          { lat, lon, range, every, count: data.length, data },
          200,
          {
            ...corsHeaders,
            'Cache-Control': 'public, max-age=1200',
          },
        )
      }

      // ── GET /api/history/air-quality/:lat/:lon ─────────────────────────────
      const historyAqiMatch = path.match(
        /^\/api\/history\/air-quality\/(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/,
      )
      if (historyAqiMatch) {
        const lat = parseFloat(historyAqiMatch[1])
        const lon = parseFloat(historyAqiMatch[2])
        const range = url.searchParams.get('range') || '24h'
        const every = url.searchParams.get('every') || '1h'

        const data = await queryAqiHistory(lat, lon, range)
        return jsonResponse(
          { lat, lon, range, every, count: data.length, data },
          200,
          {
            ...corsHeaders,
            'Cache-Control': 'public, max-age=1200',
          },
        )
      }

      // ── GET /api/history/export/:lat/:lon ──────────────────────────────────
      const exportMatch = path.match(
        /^\/api\/history\/export\/(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/,
      )
      if (exportMatch) {
        const lat = parseFloat(exportMatch[1])
        const lon = parseFloat(exportMatch[2])
        const range = url.searchParams.get('range') || '24h'

        const csv = await exportCsv(lat, lon, range)
        return new Response(csv, {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="climate-${lat.toFixed(2)}_${lon.toFixed(2)}_${range}.csv"`,
          },
        })
      }

      // ── GET /api/usage ─────────────────────────────────────────────────────
      if (path === '/api/usage') {
        const snapshot: UsageSnapshot = {
          owm: {
            daily: 0,
            minutely: 0,
            dailyLimit: 1000,
            minuteLimit: 60,
            dailyGuard: 950,
          },
          maptiler: {
            monthly: 0,
            monthlyLimit: 10000,
            monthlyGuard: 9500,
          },
        }
        return jsonResponse(snapshot, 200, corsHeaders)
      }

      // ── 404 Route Not Found ────────────────────────────────────────────────
      return jsonResponse({ error: `Not Found: ${path}` }, 404, corsHeaders)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Internal Server Error'
      return jsonResponse({ error: message }, 500, corsHeaders)
    }
  },
}
