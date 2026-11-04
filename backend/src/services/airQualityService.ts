import { apiClient } from '../config/apiClient'
import { trackOWMCall } from '../utils/usageTracker'
import type { AirQualityData, OWMAirPollutionResponse } from '../types/airQuality'

const BASE_URL = 'https://api.openweathermap.org/data/2.5'

const AQI_LABELS = ['Good', 'Fair', 'Moderate', 'Poor', 'Very Poor']

/**
 * Fetch air quality data from OpenWeatherMap Air Pollution API.
 * Returns the AQI index (1-5), a human-readable label, and component concentrations.
 */
export async function getAirQuality(lat: number, lon: number): Promise<AirQualityData> {
  const apiKey = process.env.OPENWEATHERMAP_API_KEY
  if (!apiKey) throw new Error('OPENWEATHERMAP_API_KEY is not set')

  await trackOWMCall(1)

  const res = await apiClient.get<OWMAirPollutionResponse>(`${BASE_URL}/air_pollution`, {
    params: { lat, lon, appid: apiKey },
  })

  const entry = res.data.list[0]

  return {
    aqi: entry.main.aqi,
    label: AQI_LABELS[entry.main.aqi - 1] ?? 'Unknown',
    components: entry.components,
  }
}
