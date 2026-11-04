import { apiClient } from '../config/apiClient'
import { trackOWMCall } from '../utils/usageTracker'
import type {
  WeatherResponse,
  OWMCurrentResponse,
  OWMForecastResponse,
  OWMForecastItem,
} from '../types/weather'

const BASE_URL = 'https://api.openweathermap.org/data/2.5'

/** Group forecast items (3h intervals) into daily summaries */
function aggregateForecast(items: OWMForecastItem[]) {
  const days: Record<string, OWMForecastItem[]> = {}

  for (const item of items) {
    const date = item.dt_txt.split(' ')[0]
    if (!days[date]) days[date] = []
    days[date].push(item)
  }

  return Object.entries(days)
    .slice(0, 5) // 5-day forecast
    .map(([date, dayItems]) => {
      const temps = dayItems.map((i) => i.main.temp)
      const midday = dayItems.find((i) => i.dt_txt.includes('12:00')) ?? dayItems[0]
      return {
        date,
        temp_high: Math.round(Math.max(...temps)),
        temp_low: Math.round(Math.min(...temps)),
        rain_chance: Math.round((midday.pop ?? 0) * 100),
        description: midday.weather[0].description,
        icon: midday.weather[0].icon,
      }
    })
}

export async function getWeather(lat: number, lon: number): Promise<WeatherResponse> {
  const apiKey = process.env.OPENWEATHERMAP_API_KEY
  if (!apiKey) throw new Error('OPENWEATHERMAP_API_KEY is not set')

  // Two OWM calls: current weather + 5-day forecast
  await trackOWMCall(2)

  const params = { lat, lon, appid: apiKey, units: 'metric' }

  const [currentRes, forecastRes] = await Promise.all([
    apiClient.get<OWMCurrentResponse>(`${BASE_URL}/weather`, { params }),
    apiClient.get<OWMForecastResponse>(`${BASE_URL}/forecast`, { params }),
  ])

  const c = currentRes.data
  const location = `${c.name}, ${c.sys.country}`

  return {
    lat: c.coord.lat,
    lon: c.coord.lon,
    location,
    current: {
      temp: Math.round(c.main.temp * 10) / 10,
      feels_like: Math.round(c.main.feels_like * 10) / 10,
      humidity: c.main.humidity,
      wind_speed: c.wind.speed,
      wind_direction: c.wind.deg,
      cloud_cover: c.clouds.all,
      precipitation: c.rain?.['1h'] ?? 0,
      description: c.weather[0].description,
      icon: c.weather[0].icon,
    },
    forecast: aggregateForecast(forecastRes.data.list),
  }
}
