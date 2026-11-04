import type { HistoryPoint, AqiHistoryPoint } from '../types'

function rangeToHours(range: string): { hours: number; pastDays: number } {
  switch (range) {
    case '1h':
      return { hours: 2, pastDays: 1 }
    case '6h':
      return { hours: 6, pastDays: 1 }
    case '12h':
      return { hours: 12, pastDays: 1 }
    case '24h':
      return { hours: 24, pastDays: 1 }
    case '3d':
      return { hours: 72, pastDays: 3 }
    case '7d':
      return { hours: 168, pastDays: 7 }
    case '14d':
      return { hours: 336, pastDays: 14 }
    case '30d':
      return { hours: 720, pastDays: 30 }
    default:
      return { hours: 24, pastDays: 1 }
  }
}

export async function queryWeatherHistory(
  lat: number,
  lon: number,
  range = '24h',
): Promise<HistoryPoint[]> {
  const { hours, pastDays } = rangeToHours(range)
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m&past_days=${pastDays}&forecast_days=1`

  const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) {
    throw new Error(`History weather service error: ${res.status}`)
  }

  const data = (await res.json()) as any
  const h = data.hourly
  if (!h || !Array.isArray(h.time)) return []

  const total = h.time.length
  // Find current hour index or take recent `hours` slice
  const startIndex = Math.max(0, total - 24 - hours)
  const endIndex = Math.min(total, startIndex + hours)

  const points: HistoryPoint[] = []
  for (let i = startIndex; i < endIndex; i++) {
    points.push({
      time: new Date(h.time[i] + 'Z').toISOString(),
      temp: h.temperature_2m?.[i] != null ? Math.round(h.temperature_2m[i]) : null,
      humidity: h.relative_humidity_2m?.[i] != null ? Math.round(h.relative_humidity_2m[i]) : null,
      wind_speed:
        h.wind_speed_10m?.[i] != null
          ? Math.round((h.wind_speed_10m[i] / 3.6) * 10) / 10
          : null,
      precipitation: h.precipitation?.[i] ?? 0,
      feels_like:
        h.apparent_temperature?.[i] != null
          ? Math.round(h.apparent_temperature[i])
          : null,
    })
  }

  return points
}

export async function queryAqiHistory(
  lat: number,
  lon: number,
  range = '24h',
): Promise<AqiHistoryPoint[]> {
  const { hours, pastDays } = rangeToHours(range)
  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=european_aqi,pm2_5,pm10,ozone&past_days=${pastDays}&forecast_days=1`

  const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) {
    throw new Error(`History air-quality service error: ${res.status}`)
  }

  const data = (await res.json()) as any
  const h = data.hourly
  if (!h || !Array.isArray(h.time)) return []

  const total = h.time.length
  const startIndex = Math.max(0, total - 24 - hours)
  const endIndex = Math.min(total, startIndex + hours)

  const points: AqiHistoryPoint[] = []
  for (let i = startIndex; i < endIndex; i++) {
    const raw = h.european_aqi?.[i]
    let aqi: number | null = null
    if (raw != null) {
      if (raw < 20) aqi = 1
      else if (raw < 40) aqi = 2
      else if (raw < 60) aqi = 3
      else if (raw < 80) aqi = 4
      else aqi = 5
    }

    points.push({
      time: new Date(h.time[i] + 'Z').toISOString(),
      aqi,
      pm2_5: h.pm2_5?.[i] != null ? Math.round(h.pm2_5[i] * 10) / 10 : null,
      pm10: h.pm10?.[i] != null ? Math.round(h.pm10[i] * 10) / 10 : null,
      o3: h.ozone?.[i] != null ? Math.round(h.ozone[i] * 10) / 10 : null,
    })
  }

  return points
}

export async function exportCsv(
  lat: number,
  lon: number,
  range = '24h',
): Promise<string> {
  const [weatherData, aqiData] = await Promise.all([
    queryWeatherHistory(lat, lon, range),
    queryAqiHistory(lat, lon, range),
  ])

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

  const aqiMap = new Map(aqiData.map((a) => [a.time, a]))

  const rows = weatherData.map((w) => {
    const a = aqiMap.get(w.time)
    return [
      w.time,
      w.temp ?? '',
      w.feels_like ?? '',
      w.humidity ?? '',
      w.wind_speed ?? '',
      w.precipitation ?? '',
      a?.aqi ?? '',
      a?.pm2_5 ?? '',
      a?.pm10 ?? '',
      a?.o3 ?? '',
    ].join(',')
  })

  return [headers.join(','), ...rows].join('\n')
}
