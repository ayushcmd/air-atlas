export interface GeocodeResult {
  lat: number
  lon: number
  name: string
  country: string
  full_name: string
}

/** Raw shape from MapTiler Geocoding API (compatible with Mapbox format) */
export interface GeocodeResponse {
  features: GeocodeFeature[]
}

export interface GeocodeFeature {
  id: string
  place_name: string
  center: [number, number] // [lon, lat]
  text: string
  context?: { id: string; text: string }[]
}
