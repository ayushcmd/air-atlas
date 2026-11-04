export interface Env {
  OPENWEATHERMAP_API_KEY?: string
  MAPTILER_API_KEY?: string
  CORS_ORIGIN?: string
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

export interface WeatherResponse {
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

export interface GeocodeResult {
  lat: number
  lon: number
  name: string
  country: string
  full_name: string
}

export interface HistoryPoint {
  time: string
  temp: number | null
  humidity: number | null
  wind_speed: number | null
  precipitation: number | null
  feels_like: number | null
}

export interface AqiHistoryPoint {
  time: string
  aqi: number | null
  pm2_5: number | null
  pm10: number | null
  o3: number | null
}

export interface UsageSnapshot {
  owm: {
    daily: number
    minutely: number
    dailyLimit: number
    minuteLimit: number
    dailyGuard: number
  }
  maptiler: {
    monthly: number
    monthlyLimit: number
    monthlyGuard: number
  }
}
