import { useWeatherStore } from '@/store/weatherStore'
import type { AirQualityData } from '@/store/weatherStore'
import { useRealtimeStore } from '@/store/realtimeStore'

/** Displays current weather, AQI, and 5-day forecast for the selected location. */
export function DataPanel() {
  // All hooks must be at the top, unconditionally
  const weather = useWeatherStore((s) => s.weather)
  const airQuality = useWeatherStore((s) => s.airQuality)
  const loading = useWeatherStore((s) => s.loading)
  const error = useWeatherStore((s) => s.error)
  const selectedLocation = useWeatherStore((s) => s.selectedLocation)
  const isLive = useRealtimeStore((s) => s.connectionStatus === 'connected')

  if (!selectedLocation) {
    return (
      <div className="flex items-center justify-center h-full text-text-secondary text-sm p-6">
        Click the map or search for a location to see weather data.
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 text-danger text-sm">
        <p className="font-semibold">Error loading weather</p>
        <p className="mt-1 text-text-secondary">{error}</p>
      </div>
    )
  }

  if (!weather) return null

  const { current, forecast, location } = weather
  const iconUrl = `https://openweathermap.org/img/wn/${current.icon}@2x.png`

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto h-full">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-text-primary">{location}</h2>
          {isLive && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              Live
            </span>
          )}
        </div>
        <p className="text-xs text-text-secondary">
          {selectedLocation.lat.toFixed(4)}, {selectedLocation.lon.toFixed(4)}
        </p>
      </div>

      {/* ── Current conditions ────────────────────────────────────────── */}
      <div className="rounded-lg bg-surface-alt border border-border p-4">
        <div className="flex items-center gap-3">
          <img src={iconUrl} alt={current.description} className="h-14 w-14" />
          <div>
            <p className="text-3xl font-bold">{current.temp}°C</p>
            <p className="text-sm text-text-secondary capitalize">{current.description}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <Stat label="Feels like" value={`${current.feels_like}°C`} />
          <Stat label="Humidity" value={`${current.humidity}%`} />
          <Stat label="Wind" value={`${current.wind_speed} m/s`} />
          <Stat label="Clouds" value={`${current.cloud_cover}%`} />
          <Stat label="Precipitation" value={`${current.precipitation} mm`} />
          <Stat label="Wind dir" value={`${current.wind_direction}°`} />
        </div>
      </div>

      {/* ── Air Quality ──────────────────────────────────────────────── */}
      {airQuality && <AqiSection data={airQuality} />}

      {/* ── 5-day forecast ────────────────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold text-text-secondary mb-2 uppercase tracking-wide">
          5-Day Forecast
        </h3>
        <div className="flex flex-col gap-2">
          {forecast.map((day) => (
            <div
              key={day.date}
              className="flex items-center rounded-lg bg-surface-alt border border-border px-3 py-2 text-sm"
            >
              <img
                src={`https://openweathermap.org/img/wn/${day.icon}.png`}
                alt={day.description}
                className="h-8 w-8 mr-2"
              />
              <span className="w-24 text-text-secondary">{formatDate(day.date)}</span>
              <span className="flex-1 capitalize text-text-secondary text-xs">{day.description}</span>
              <span className="font-medium text-accent">{day.temp_high}°</span>
              <span className="text-text-secondary mx-1">/</span>
              <span className="text-text-secondary">{day.temp_low}°</span>
              <span className="ml-3 text-xs text-text-secondary">{day.rain_chance}% 💧</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Helpers ────────────────────────────────────────────────────────────── */

const AQI_COLORS = ['#4ade80', '#facc15', '#fb923c', '#f87171', '#a855f7']

function AqiSection({ data }: { data: AirQualityData }) {
  const color = AQI_COLORS[data.aqi - 1] ?? '#94a3b8'

  return (
    <div className="rounded-lg bg-surface-alt border border-border p-4">
      <div className="flex items-center gap-3 mb-3">
        <div
          className="px-3 py-1 rounded-full text-sm font-bold"
          style={{ backgroundColor: color + '22', color }}
        >
          AQI {data.aqi}
        </div>
        <span className="text-sm text-text-secondary">{data.label}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <Stat label="PM2.5" value={`${data.components.pm2_5.toFixed(1)} µg/m³`} />
        <Stat label="PM10" value={`${data.components.pm10.toFixed(1)} µg/m³`} />
        <Stat label="O₃" value={`${data.components.o3.toFixed(1)} µg/m³`} />
        <Stat label="NO₂" value={`${data.components.no2.toFixed(1)} µg/m³`} />
        <Stat label="SO₂" value={`${data.components.so2.toFixed(1)} µg/m³`} />
        <Stat label="CO" value={`${data.components.co.toFixed(1)} µg/m³`} />
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-text-secondary text-xs">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  )
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00')
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}
