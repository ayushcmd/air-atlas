import { useEffect } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { useAnalyticsStore, type TimeRange } from '@/store/analyticsStore'
import { useWeatherStore } from '@/store/weatherStore'

/* ── Time-range options ─────────────────────────────────────────────────── */

const RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: '1h', label: '1 h' },
  { value: '6h', label: '6 h' },
  { value: '12h', label: '12 h' },
  { value: '24h', label: '24 h' },
  { value: '3d', label: '3 d' },
  { value: '7d', label: '7 d' },
  { value: '14d', label: '14 d' },
  { value: '30d', label: '30 d' },
]

/* ── Format helper ──────────────────────────────────────────────────────── */

function formatTime(iso: string, range: TimeRange): string {
  const d = new Date(iso)
  if (['1h', '6h', '12h', '24h'].includes(range)) {
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit' })
}

/* ── Component ──────────────────────────────────────────────────────────── */

export function HistoryChart() {
  const selectedLocation = useWeatherStore((s) => s.selectedLocation)
  const {
    weatherHistory,
    aqiHistory,
    range,
    loading,
    error,
    setRange,
    fetchHistory,
  } = useAnalyticsStore()

  // Fetch data when location or range changes
  useEffect(() => {
    if (selectedLocation) {
      fetchHistory(selectedLocation.lat, selectedLocation.lon)
    }
  }, [selectedLocation, range, fetchHistory])

  if (!selectedLocation) {
    return (
      <div className="text-text-secondary text-sm text-center py-8">
        Select a location to view historical data.
      </div>
    )
  }

  /* ── Merge weather + AQI data by time ─────────────────────────────── */
  const aqiByTime = new Map(aqiHistory.map((a) => [a.time, a]))
  const chartData = weatherHistory.map((w) => {
    const aqi = aqiByTime.get(w.time)
    return {
      time: formatTime(w.time, range),
      temp: w.temp != null ? Math.round(w.temp * 10) / 10 : null,
      feels_like: w.feels_like != null ? Math.round(w.feels_like * 10) / 10 : null,
      humidity: w.humidity != null ? Math.round(w.humidity) : null,
      wind_speed: w.wind_speed != null ? Math.round(w.wind_speed * 10) / 10 : null,
      precipitation: w.precipitation != null ? Math.round(w.precipitation * 100) / 100 : null,
      aqi: aqi?.aqi != null ? Math.round(aqi.aqi * 10) / 10 : null,
    }
  })

  return (
    <div className="flex flex-col gap-4">
      {/* ── Range selector ────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 flex-wrap">
        {RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setRange(opt.value)}
            className={`px-2 py-0.5 text-xs rounded-md transition-colors ${
              range === opt.value
                ? 'bg-accent text-surface font-semibold'
                : 'text-text-secondary hover:bg-surface-hover'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* ── Loading / Error / Empty states ────────────────────────────── */}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      )}

      {error && (
        <div className="text-danger text-sm py-4 text-center">{error}</div>
      )}

      {!loading && !error && chartData.length === 0 && (
        <div className="text-text-secondary text-sm text-center py-8">
          No historical data yet. Data is recorded every time the app fetches
          weather for this location.
        </div>
      )}

      {/* ── Temperature chart ─────────────────────────────────────────── */}
      {!loading && chartData.length > 0 && (
        <>
          <div>
            <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
              Temperature
            </h4>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -15 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} unit="°C" />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#e2e8f0' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line
                    type="monotone"
                    dataKey="temp"
                    name="Temp"
                    stroke="#f97316"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="feels_like"
                    name="Feels Like"
                    stroke="#fb923c"
                    strokeWidth={1}
                    strokeDasharray="4 2"
                    dot={false}
                  />
                  <Bar
                    dataKey="precipitation"
                    name="Rain (mm)"
                    fill="#38bdf8"
                    opacity={0.4}
                    yAxisId={0}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Humidity & Wind chart ──────────────────────────────────── */}
          <div>
            <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
              Humidity &amp; Wind
            </h4>
            <div className="h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -15 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#e2e8f0' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line
                    type="monotone"
                    dataKey="humidity"
                    name="Humidity %"
                    stroke="#22d3ee"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="wind_speed"
                    name="Wind (m/s)"
                    stroke="#4ade80"
                    strokeWidth={2}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── AQI chart (if data exists) ─────────────────────────────── */}
          {aqiHistory.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
                Air Quality
              </h4>
              <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -15 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <Tooltip
                      contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: '#e2e8f0' }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line
                      type="monotone"
                      dataKey="aqi"
                      name="AQI"
                      stroke="#a855f7"
                      strokeWidth={2}
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
