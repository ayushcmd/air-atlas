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

/** Raw shape returned by OpenWeatherMap /forecast endpoint */
export interface OWMForecastItem {
  dt: number
  main: {
    temp: number
    temp_min: number
    temp_max: number
    feels_like: number
    humidity: number
    pressure: number
  }
  weather: { id: number; main: string; description: string; icon: string }[]
  clouds: { all: number }
  wind: { speed: number; deg: number }
  rain?: { '3h': number }
  pop: number
  dt_txt: string
}

export interface OWMCurrentResponse {
  name: string
  sys: { country?: string }
  coord: { lat: number; lon: number }
  main: {
    temp: number
    feels_like: number
    humidity: number
    pressure: number
  }
  weather: { id: number; main: string; description: string; icon: string }[]
  clouds: { all: number }
  wind: { speed: number; deg: number }
  rain?: { '1h': number }
}

export interface OWMForecastResponse {
  list: OWMForecastItem[]
}
