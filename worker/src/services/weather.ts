import type { Env, WeatherResponse, ForecastDay } from '../types'
import { isOwmAvailable, markOwmFailed } from './authGuard'

function wmoCodeToWeather(code: number): { description: string; icon: string } {
  if (code === 0) return { description: 'Clear sky', icon: '01d' }
  if (code === 1) return { description: 'Mainly clear', icon: '02d' }
  if (code === 2) return { description: 'Partly cloudy', icon: '03d' }
  if (code === 3) return { description: 'Overcast', icon: '04d' }
  if (code === 45 || code === 48) return { description: 'Fog', icon: '50d' }
  if (code >= 51 && code <= 55) return { description: 'Drizzle', icon: '09d' }
  if (code >= 61 && code <= 65) return { description: 'Rain', icon: '10d' }
  if (code >= 71 && code <= 77) return { description: 'Snow', icon: '13d' }
  if (code >= 80 && code <= 82) return { description: 'Showers', icon: '09d' }
  if (code >= 85 && code <= 86) return { description: 'Snow showers', icon: '13d' }
  if (code >= 95) return { description: 'Thunderstorm', icon: '11d' }
  return { description: 'Partly cloudy', icon: '02d' }
}

export async function getWeather(lat: number, lon: number, env: Env): Promise<WeatherResponse> {
  const apiKey = env.OPENWEATHERMAP_API_KEY

  if (isOwmAvailable(apiKey)) {
    try {
      const baseUrl = 'https://api.openweathermap.org/data/2.5'
      const params = `lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`

      const [currentRes, forecastRes] = await Promise.all([
        fetch(`${baseUrl}/weather?${params}`),
        fetch(`${baseUrl}/forecast?${params}`),
      ])

      if (currentRes.status === 401 || forecastRes.status === 401) {
        markOwmFailed()
      } else if (currentRes.ok && forecastRes.ok) {
        const currentData = (await currentRes.json()) as any
        const forecastData = (await forecastRes.json()) as any

        const days: Record<string, any[]> = {}
        for (const item of forecastData.list) {
          const date = item.dt_txt.split(' ')[0]
          if (!days[date]) days[date] = []
          days[date].push(item)
        }

        const forecast: ForecastDay[] = Object.entries(days)
          .slice(0, 5)
          .map(([date, dayItems]) => {
            const temps = dayItems.map((i) => i.main.temp)
            const midday = dayItems.find((i: any) => i.dt_txt.includes('12:00')) ?? dayItems[0]
            return {
              date,
              temp_high: Math.round(Math.max(...temps)),
              temp_low: Math.round(Math.min(...temps)),
              rain_chance: Math.round((midday.pop ?? 0) * 100),
              description: midday.weather[0].description,
              icon: midday.weather[0].icon,
            }
          })

        return {
          lat,
          lon,
          location: currentData.name || `${lat.toFixed(2)}, ${lon.toFixed(2)}`,
          current: {
            temp: Math.round(currentData.main.temp),
            feels_like: Math.round(currentData.main.feels_like),
            humidity: currentData.main.humidity,
            wind_speed: currentData.wind.speed,
            wind_direction: currentData.wind.deg ?? 0,
            cloud_cover: currentData.clouds.all ?? 0,
            precipitation: currentData.rain?.['1h'] ?? currentData.snow?.['1h'] ?? 0,
            description: currentData.weather[0].description,
            icon: currentData.weather[0].icon,
          },
          forecast,
        }
      }
    } catch {
      // Fall through to Open-Meteo fallback
    }
  }

  // Open-Meteo open weather fallback
  const omUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`
  const omRes = await fetch(omUrl)
  if (!omRes.ok) {
    throw new Error(`Weather service unavailable: ${omRes.status}`)
  }

  const om = (await omRes.json()) as any
  const cur = om.current
  const curWeather = wmoCodeToWeather(cur.weather_code)

  const forecast: ForecastDay[] = []
  const dailyDates = om.daily?.time ?? []
  for (let i = 0; i < Math.min(dailyDates.length, 5); i++) {
    const code = om.daily.weather_code?.[i] ?? 0
    const w = wmoCodeToWeather(code)
    forecast.push({
      date: dailyDates[i],
      temp_high: Math.round(om.daily.temperature_2m_max?.[i] ?? 0),
      temp_low: Math.round(om.daily.temperature_2m_min?.[i] ?? 0),
      rain_chance: Math.round(om.daily.precipitation_probability_max?.[i] ?? 0),
      description: w.description,
      icon: w.icon,
    })
  }

  return {
    lat,
    lon,
    location: `${lat.toFixed(2)}, ${lon.toFixed(2)}`,
    current: {
      temp: Math.round(cur.temperature_2m),
      feels_like: Math.round(cur.apparent_temperature),
      humidity: Math.round(cur.relative_humidity_2m),
      wind_speed: Math.round((cur.wind_speed_10m / 3.6) * 10) / 10,
      wind_direction: Math.round(cur.wind_direction_10m),
      cloud_cover: Math.round(cur.cloud_cover),
      precipitation: cur.precipitation ?? 0,
      description: curWeather.description,
      icon: curWeather.icon,
    },
    forecast,
  }
}
