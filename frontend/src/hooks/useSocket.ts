import { useEffect, useRef, useCallback } from 'react'
import { useWeatherStore } from '@/store/weatherStore'
import type { WeatherData, AirQualityData } from '@/store/weatherStore'
import { useRealtimeStore } from '@/store/realtimeStore'
import type { AlertEvent } from '@/store/realtimeStore'
import { apiUrl } from '@/config/api'

const BROADCAST_INTERVAL = 30_000 // 30 seconds

interface AlertItem {
  type: string
  message: string
  severity: 'warning' | 'critical'
}

function checkAlerts(lat: number, lon: number, weather: WeatherData, aqi?: AirQualityData | null): AlertEvent | null {
  const alerts: AlertItem[] = []
  const temp = weather.current.temp
  const windSpeed = weather.current.wind_speed

  if (temp > 40) {
    alerts.push({
      type: 'extreme_heat',
      message: `Extreme heat: ${temp}°C`,
      severity: temp > 45 ? 'critical' : 'warning',
    })
  }
  if (temp < -20) {
    alerts.push({
      type: 'extreme_cold',
      message: `Extreme cold: ${temp}°C`,
      severity: temp < -30 ? 'critical' : 'warning',
    })
  }
  if (windSpeed > 100 / 3.6) {
    alerts.push({
      type: 'high_wind',
      message: `High wind: ${windSpeed} m/s`,
      severity: windSpeed > 40 ? 'critical' : 'warning',
    })
  }
  if (aqi && (aqi.aqi >= 5 || aqi.label === 'Very Poor')) {
    alerts.push({
      type: 'poor_air_quality',
      message: `Hazardous air quality: ${aqi.label}`,
      severity: 'critical',
    })
  }

  if (alerts.length === 0) return null

  return {
    lat,
    lon,
    alerts,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Manages real-time data synchronization and live refresh.
 *
 * • Connects on mount, sets live status.
 * • Periodically fetches weather & air-quality updates every 30s.
 * • Evaluates threshold alerts (extreme temp, severe wind, hazardous AQI).
 * • Tracks connection status, last-update timestamp, and pause/resume in realtimeStore.
 */
export function useSocket() {
  const selectedLocation = useWeatherStore((s) => s.selectedLocation)
  const setConnectionStatus = useRealtimeStore((s) => s.setConnectionStatus)
  const setLastUpdate = useRealtimeStore((s) => s.setLastUpdate)
  const setBroadcastInterval = useRealtimeStore((s) => s.setBroadcastInterval)
  const addAlerts = useRealtimeStore((s) => s.addAlerts)
  const isPaused = useRealtimeStore((s) => s.isPaused)

  const timerRef = useRef<number | null>(null)

  const refreshLocation = useCallback(
    async (lat: number, lon: number) => {
      try {
        const [wRes, aqRes] = await Promise.allSettled([
          fetch(apiUrl(`/api/weather/${lat}/${lon}`)).then(async (r) => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`)
            return r.json() as Promise<WeatherData>
          }),
          fetch(apiUrl(`/api/air-quality/${lat}/${lon}`)).then(async (r) => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`)
            return r.json() as Promise<AirQualityData>
          }),
        ])

        const timestamp = new Date().toISOString()

        if (wRes.status === 'fulfilled') {
          const weather = wRes.value
          const currentLoc = useWeatherStore.getState().selectedLocation
          if (
            currentLoc &&
            Math.abs(currentLoc.lat - weather.lat) < 0.05 &&
            Math.abs(currentLoc.lon - weather.lon) < 0.05
          ) {
            useWeatherStore.setState({ weather })
          }

          const aqi = aqRes.status === 'fulfilled' ? aqRes.value : null
          if (aqi && currentLoc) {
            useWeatherStore.setState({ airQuality: aqi })
          }

          const alertEvent = checkAlerts(lat, lon, weather, aqi)
          if (alertEvent) {
            addAlerts(alertEvent)
          }

          setLastUpdate(timestamp)
          setConnectionStatus('connected')
        }
      } catch {
        // Soft error — keep connected state
      }
    },
    [addAlerts, setConnectionStatus, setLastUpdate],
  )

  useEffect(() => {
    setConnectionStatus('connected')
    setBroadcastInterval(BROADCAST_INTERVAL)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      setConnectionStatus('disconnected')
    }
  }, [setBroadcastInterval, setConnectionStatus])

  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    if (!selectedLocation || isPaused) return

    // Run interval
    timerRef.current = window.setInterval(() => {
      refreshLocation(selectedLocation.lat, selectedLocation.lon)
    }, BROADCAST_INTERVAL)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [selectedLocation, isPaused, refreshLocation])
}
