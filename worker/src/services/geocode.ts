import type { Env, GeocodeResult } from '../types'
import { isMapTilerAvailable, markMapTilerFailed } from './authGuard'

export async function geocode(query: string, env: Env): Promise<GeocodeResult[]> {
  const apiKey = env.MAPTILER_API_KEY

  if (isMapTilerAvailable(apiKey)) {
    try {
      const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json?key=${apiKey}`
      const res = await fetch(url)
      if (res.status === 401 || res.status === 403) {
        markMapTilerFailed()
      } else if (res.ok) {
        const data = (await res.json()) as any
        if (Array.isArray(data.features)) {
          return data.features.map((f: any) => {
            const country = f.context?.find((c: any) => c.id?.startsWith('country'))?.text ?? ''
            return {
              lat: f.center[1],
              lon: f.center[0],
              name: f.text,
              country,
              full_name: f.place_name,
            }
          })
        }
      }
    } catch {
      // Fall through to Open-Meteo
    }
  }

  // Open-Meteo Geocoding fallback
  const omUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=10&language=en&format=json`
  const omRes = await fetch(omUrl)
  if (!omRes.ok) {
    throw new Error(`Geocode service unavailable: ${omRes.status}`)
  }

  const om = (await omRes.json()) as any
  if (!om.results || !Array.isArray(om.results)) {
    return []
  }

  return om.results.map((r: any) => ({
    lat: r.latitude,
    lon: r.longitude,
    name: r.name,
    country: r.country || '',
    full_name: [r.name, r.admin1, r.country].filter(Boolean).join(', '),
  }))
}
