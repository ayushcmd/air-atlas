import { create } from 'zustand'
import { apiUrl } from '@/config/api'

/* ── Types ──────────────────────────────────────────────────────────────── */

export interface SelectedLocation {
  lat: number
  lon: number
  name: string
}

export interface CurrentWeather {
  temp: number
  feels_like: number
  humidity: number
  wind_speed: number
  wind_direction: number
  cloud_cover: number
  precipitation: number
  description: string
  icon: string
}

export interface ForecastDay {
  date: string
  temp_high: number
  temp_low: number
  rain_chance: number
  description: string
  icon: string
}

export interface WeatherData {
  lat: number
  lon: number
  location: string
  current: CurrentWeather
  forecast: ForecastDay[]
}

export interface AirQualityData {
  aqi: number
  label: string
  components: {
    co: number
    no: number
    no2: number
    o3: number
    so2: number
    pm2_5: number
    pm10: number
    nh3: number
  }
}

interface WeatherState {
  selectedLocation: SelectedLocation | null
  weather: WeatherData | null
  airQuality: AirQualityData | null
  loading: boolean
  error: string | null

  setSelectedLocation: (loc: SelectedLocation) => void
  clearSelection: () => void
}

/* ── Store ──────────────────────────────────────────────────────────────── */

export const useWeatherStore = create<WeatherState>((set) => ({
  selectedLocation: null,
  weather: null,
  airQuality: null,
  loading: false,
  error: null,

  setSelectedLocation: async (loc) => {
    set({ selectedLocation: loc, loading: true, error: null, airQuality: null })

    // Fetch weather + AQI concurrently; weather is critical, AQI is best-effort
    const [weatherResult, aqiResult] = await Promise.allSettled([
      fetch(apiUrl(`/api/weather/${loc.lat}/${loc.lon}`)).then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.message ?? `Weather API error (${res.status})`)
        }
        return res.json() as Promise<WeatherData>
      }),
      fetch(apiUrl(`/api/air-quality/${loc.lat}/${loc.lon}`)).then(async (res) => {
        if (!res.ok) throw new Error('AQI unavailable')
        return res.json() as Promise<AirQualityData>
      }),
    ])

    if (weatherResult.status === 'fulfilled') {
      set({ weather: weatherResult.value, loading: false })
    } else {
      set({
        error:
          weatherResult.reason instanceof Error
            ? weatherResult.reason.message
            : 'Unknown error',
        loading: false,
      })
    }

    if (aqiResult.status === 'fulfilled') {
      set({ airQuality: aqiResult.value })
    }
  },

  clearSelection: () =>
    set({ selectedLocation: null, weather: null, airQuality: null, error: null }),
}))
