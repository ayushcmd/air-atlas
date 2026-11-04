import { useWeatherStore } from '@/store/weatherStore'

const GRAFANA_BASE = import.meta.env.VITE_GRAFANA_URL || 'http://localhost:4000'
const DASHBOARD_UID = 'climate-tracker-main'

/**
 * Embeds the Grafana Climate Tracker dashboard in an iframe.
 * Grafana must be running with anonymous auth enabled and allow_embedding = true.
 *
 * The dashboard is filtered by the currently selected location.
 */
export function GrafanaDashboard() {
  const selectedLocation = useWeatherStore((s) => s.selectedLocation)

  // Build the solo/embedded URL with location filter
  const params = new URLSearchParams({
    orgId: '1',
    theme: 'dark',
    kiosk: '',
    refresh: '30s',
  })

  // If a location is selected, pass it as a variable
  if (selectedLocation) {
    params.set('var-location', selectedLocation.name)
  }

  const iframeUrl = `${GRAFANA_BASE}/d/${DASHBOARD_UID}/climate-tracker?${params.toString()}`

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-secondary">
          Data sourced from InfluxDB via Grafana
        </p>
        <a
          href={`${GRAFANA_BASE}/d/${DASHBOARD_UID}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-accent hover:underline"
        >
          Open in Grafana ↗
        </a>
      </div>

      <div
        className="relative w-full rounded-lg overflow-hidden border border-border bg-[#181b1f]"
        style={{ height: 480 }}
      >
        <iframe
          src={iframeUrl}
          className="absolute inset-0 w-full h-full border-0"
          title="Grafana Climate Dashboard"
          loading="lazy"
        />
      </div>
    </div>
  )
}
