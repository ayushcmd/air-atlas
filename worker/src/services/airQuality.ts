import type { Env, AirQualityData } from '../types'
import { isOwmAvailable, markOwmFailed } from './authGuard'

const AQI_LABELS = ['Good', 'Fair', 'Moderate', 'Poor', 'Very Poor']

function normalizeAqi(rawAqi: number): number {
  if (rawAqi <= 1) return 1
  if (rawAqi === 2) return 2
  if (rawAqi === 3) return 3
  if (rawAqi === 4) return 4
  return 5
}

export async function getAirQuality(lat: number, lon: number, env: Env): Promise<AirQualityData> {
  const apiKey = env.OPENWEATHERMAP_API_KEY

  if (isOwmAvailable(apiKey)) {
    try {
      const url = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) })
      if (res.status === 401) {
        markOwmFailed()
      } else if (res.ok) {
        const data = (await res.json()) as any
        const entry = data.list[0]
        const aqi = normalizeAqi(entry.main.aqi)
        return {
          aqi,
          label: AQI_LABELS[aqi - 1] ?? 'Unknown',
          components: entry.components,
        }
      }
    } catch {
      // Fall through to Open-Meteo
    }
  }

  // Open-Meteo Air Quality fallback
  const omUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=european_aqi,us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone`
  const omRes = await fetch(omUrl, { signal: AbortSignal.timeout(8000) })
  if (!omRes.ok) {
    throw new Error(`Air quality service unavailable: ${omRes.status}`)
  }

  const om = (await omRes.json()) as any
  const cur = om.current || {}

  let aqi = 1
  const rawAqi = cur.european_aqi ?? 0
  if (rawAqi < 20) aqi = 1
  else if (rawAqi < 40) aqi = 2
  else if (rawAqi < 60) aqi = 3
  else if (rawAqi < 80) aqi = 4
  else aqi = 5

  return {
    aqi,
    label: AQI_LABELS[aqi - 1],
    components: {
      co: cur.carbon_monoxide ?? 0,
      no: 0,
      no2: cur.nitrogen_dioxide ?? 0,
      o3: cur.ozone ?? 0,
      so2: cur.sulphur_dioxide ?? 0,
      pm2_5: cur.pm2_5 ?? 0,
      pm10: cur.pm10 ?? 0,
      nh3: 0,
    },
  }
}
