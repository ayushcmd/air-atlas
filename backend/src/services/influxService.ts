import { Point } from '@influxdata/influxdb-client'
import { getInfluxClient, INFLUXDB_ORG, INFLUXDB_BUCKET } from '../config/influx'
import { logger } from '../utils/logger'
import type { WeatherResponse } from '../types/weather'
import type { AirQualityData } from '../types/airQuality'

/* ── Write helpers ──────────────────────────────────────────────────────── */

/**
 * Write a weather data point to InfluxDB.
 *
 * Measurement: `weather`
 * Tags: location (city name), lat, lon
 * Fields: temp, feels_like, humidity, wind_speed, wind_direction,
 *         cloud_cover, precipitation
 */
export function writeWeatherPoint(data: WeatherResponse): void {
  const client = getInfluxClient()
  if (!client) return

  try {
    const writeApi = client.getWriteApi(INFLUXDB_ORG, INFLUXDB_BUCKET, 's')

    const point = new Point('weather')
      .tag('location', data.location)
      .tag('lat', data.lat.toFixed(2))
      .tag('lon', data.lon.toFixed(2))
      .floatField('temp', data.current.temp)
      .floatField('feels_like', data.current.feels_like)
      .intField('humidity', data.current.humidity)
      .floatField('wind_speed', data.current.wind_speed)
      .intField('wind_direction', data.current.wind_direction)
      .intField('cloud_cover', data.current.cloud_cover)
      .floatField('precipitation', data.current.precipitation)

    writeApi.writePoint(point)
    writeApi.close().catch((err) => {
      logger.error('[InfluxDB] Weather write flush error:', err.message)
    })
  } catch (err) {
    logger.error('[InfluxDB] Weather write error:', (err as Error).message)
  }
}

/**
 * Write an air quality data point to InfluxDB.
 *
 * Measurement: `air_quality`
 * Tags: lat, lon, location (optional — provided when written via socket)
 * Fields: aqi, pm2_5, pm10, o3, no2, so2, co, nh3
 */
export function writeAirQualityPoint(
  lat: number,
  lon: number,
  data: AirQualityData,
  location?: string,
): void {
  const client = getInfluxClient()
  if (!client) return

  try {
    const writeApi = client.getWriteApi(INFLUXDB_ORG, INFLUXDB_BUCKET, 's')

    const point = new Point('air_quality')
      .tag('lat', lat.toFixed(2))
      .tag('lon', lon.toFixed(2))

    if (location) point.tag('location', location)

    point
      .intField('aqi', data.aqi)
      .stringField('label', data.label)
      .floatField('pm2_5', data.components.pm2_5)
      .floatField('pm10', data.components.pm10)
      .floatField('o3', data.components.o3)
      .floatField('no2', data.components.no2)
      .floatField('so2', data.components.so2)
      .floatField('co', data.components.co)
      .floatField('nh3', data.components.nh3)

    writeApi.writePoint(point)
    writeApi.close().catch((err) => {
      logger.error('[InfluxDB] AQI write flush error:', err.message)
    })
  } catch (err) {
    logger.error('[InfluxDB] AQI write error:', (err as Error).message)
  }
}

/* ── Query helpers ──────────────────────────────────────────────────────── */

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

/**
 * Query weather history for a location.
 * @param lat Latitude (rounded to 2dp for tag matching)
 * @param lon Longitude (rounded to 2dp for tag matching)
 * @param range Flux duration string, e.g. '24h', '7d', '30d'
 * @param every Aggregation window, e.g. '1h', '6h', '1d'
 */
export async function queryWeatherHistory(
  lat: number,
  lon: number,
  range = '24h',
  every = '1h',
): Promise<HistoryPoint[]> {
  const client = getInfluxClient()
  if (!client) return []

  const queryApi = client.getQueryApi(INFLUXDB_ORG)

  const flux = `
    from(bucket: "${INFLUXDB_BUCKET}")
      |> range(start: -${range})
      |> filter(fn: (r) => r._measurement == "weather")
      |> filter(fn: (r) => r.lat == "${lat.toFixed(2)}" and r.lon == "${lon.toFixed(2)}")
      |> filter(fn: (r) => r._field == "temp" or r._field == "humidity" or r._field == "wind_speed" or r._field == "precipitation" or r._field == "feels_like")
      |> aggregateWindow(every: ${every}, fn: mean, createEmpty: false)
      |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
      |> sort(columns: ["_time"])
  `

  const results: HistoryPoint[] = []

  return new Promise((resolve, reject) => {
    queryApi.queryRows(flux, {
      next: (row, tableMeta) => {
        const obj = tableMeta.toObject(row)
        results.push({
          time: obj._time as string,
          temp: obj.temp ?? null,
          humidity: obj.humidity ?? null,
          wind_speed: obj.wind_speed ?? null,
          precipitation: obj.precipitation ?? null,
          feels_like: obj.feels_like ?? null,
        })
      },
      error: (err) => {
        logger.error('[InfluxDB] Weather query error:', err.message)
        reject(err)
      },
      complete: () => resolve(results),
    })
  })
}

/**
 * Query air quality history for a location.
 */
export async function queryAqiHistory(
  lat: number,
  lon: number,
  range = '24h',
  every = '1h',
): Promise<AqiHistoryPoint[]> {
  const client = getInfluxClient()
  if (!client) return []

  const queryApi = client.getQueryApi(INFLUXDB_ORG)

  const flux = `
    from(bucket: "${INFLUXDB_BUCKET}")
      |> range(start: -${range})
      |> filter(fn: (r) => r._measurement == "air_quality")
      |> filter(fn: (r) => r.lat == "${lat.toFixed(2)}" and r.lon == "${lon.toFixed(2)}")
      |> filter(fn: (r) => r._field == "aqi" or r._field == "pm2_5" or r._field == "pm10" or r._field == "o3")
      |> aggregateWindow(every: ${every}, fn: mean, createEmpty: false)
      |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
      |> sort(columns: ["_time"])
  `

  const results: AqiHistoryPoint[] = []

  return new Promise((resolve, reject) => {
    queryApi.queryRows(flux, {
      next: (row, tableMeta) => {
        const obj = tableMeta.toObject(row)
        results.push({
          time: obj._time as string,
          aqi: obj.aqi ?? null,
          pm2_5: obj.pm2_5 ?? null,
          pm10: obj.pm10 ?? null,
          o3: obj.o3 ?? null,
        })
      },
      error: (err) => {
        logger.error('[InfluxDB] AQI query error:', err.message)
        reject(err)
      },
      complete: () => resolve(results),
    })
  })
}
