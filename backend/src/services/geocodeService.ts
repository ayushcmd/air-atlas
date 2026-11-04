import axios from 'axios'
import { apiClient } from '../config/apiClient'
import { trackMapTilerCall } from '../utils/usageTracker'
import { logger } from '../utils/logger'
import type { GeocodeResult, GeocodeResponse } from '../types/geocode'

const MAPTILER_BASE = 'https://api.maptiler.com/geocoding'

export async function geocode(query: string): Promise<GeocodeResult[]> {
  const apiKey = process.env.MAPTILER_API_KEY
  if (!apiKey) throw new Error('MAPTILER_API_KEY is not set')

  await trackMapTilerCall()

  // MapTiler geocoding endpoint: query goes in URL path
  const url = `${MAPTILER_BASE}/${encodeURIComponent(query)}.json`
  logger.info(`[Geocode] URL: ${url}`)

  try {
    const res = await apiClient.get<GeocodeResponse>(url, {
      params: {
        key: apiKey,
      },
    })
    logger.info(`[Geocode] Success: ${res.data.features.length} results`)
    return res.data.features.map((f) => {
      const country = f.context?.find((c) => c.id.startsWith('country'))?.text ?? ''
      return {
        lat: f.center[1],
        lon: f.center[0],
        name: f.text,
        country,
        full_name: f.place_name,
      }
    })
  } catch (err) {
    if (axios.isAxiosError(err)) {
      logger.error(`[Geocode] API Error: ${err.response?.status} - ${err.response?.statusText}`, {
        url,
        data: err.response?.data,
      })
    }
    throw err
  }
}
