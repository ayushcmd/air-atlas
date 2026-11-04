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

/** Raw shape returned by OpenWeatherMap /air_pollution endpoint */
export interface OWMAirPollutionResponse {
  list: {
    main: { aqi: number }
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
  }[]
}
