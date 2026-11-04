import { useWeatherStore } from '@/store/weatherStore'

const DASHBOARD_UID = 'climate-tracker-main'

function getValidGrafanaUrl(): { url: string | null; error?: string } {
  const rawUrl = (import.meta.env.VITE_GRAFANA_URL as string | undefined)?.trim()
  if (!rawUrl) {
    return { url: null }
  }

  try {
    const parsed = new URL(rawUrl)
    // In production, strictly enforce HTTPS to prevent mixed-content blocking
    if (import.meta.env.PROD && parsed.protocol !== 'https:') {
      return {
        url: null,
        error: 'In production, VITE_GRAFANA_URL must use a secure HTTPS protocol (e.g. https://grafana.example.com).',
      }
    }
    // Remove trailing slashes
    return { url: rawUrl.replace(/\/+$/, '') }
  } catch {
    return {
      url: null,
      error: 'The configured VITE_GRAFANA_URL is not a valid URL format.',
    }
  }
}

/**
 * Embeds the Grafana Climate Tracker dashboard in an iframe when configured.
 * Grafana must be running with anonymous auth enabled and allow_embedding = true.
 *
 * If VITE_GRAFANA_URL is absent or invalid, renders a styled AIR ATLAS configuration
 * placeholder rather than an unreachable localhost iframe.
 */
export function GrafanaDashboard() {
  const selectedLocation = useWeatherStore((s) => s.selectedLocation)
  const { url: grafanaBase, error: configError } = getValidGrafanaUrl()

  if (!grafanaBase) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-text-secondary">
            Time-Series Telemetry Engine
          </p>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-surface-alt text-text-secondary border border-border">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            Optional Extension
          </span>
        </div>

        <div
          className="relative w-full rounded-lg border border-border bg-[#181b1f] p-6 flex flex-col items-center justify-center text-center"
          style={{ minHeight: 440 }}
        >
          <div className="w-12 h-12 rounded-xl bg-surface-alt border border-border flex items-center justify-center mb-4 text-accent">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>

          <h3 className="text-base font-semibold text-text-primary mb-1">
            Dedicated Grafana Analytics Engine
          </h3>
          <p className="max-w-md text-xs text-text-secondary mb-6 leading-relaxed">
            {configError ??
              'Grafana dashboard embedding provides multi-tier time-series analytics, alert thresholds, and InfluxDB telemetry. In-app analytics are currently powered directly by the Cloudflare Worker API.'}
          </p>

          <div className="w-full max-w-md rounded-md bg-surface-alt/70 border border-border/80 p-4 text-left">
            <h4 className="text-[11px] font-semibold text-text-primary uppercase tracking-wider mb-2.5">
              Configuration Instructions
            </h4>
            <ol className="text-xs text-text-secondary space-y-2 list-decimal list-inside leading-relaxed">
              <li>
                Configure Grafana with{' '}
                <code className="text-accent bg-surface px-1 py-0.5 rounded text-[11px]">
                  allow_embedding = true
                </code>{' '}
                and anonymous access enabled.
              </li>
              <li>
                Deploy your Grafana instance with an HTTPS endpoint (e.g.{' '}
                <code className="text-accent bg-surface px-1 py-0.5 rounded text-[11px]">
                  https://grafana.example.com
                </code>
                ).
              </li>
              <li>
                Set the environment variable{' '}
                <code className="text-accent bg-surface px-1 py-0.5 rounded text-[11px]">
                  VITE_GRAFANA_URL
                </code>{' '}
                in your Cloudflare Pages dashboard.
              </li>
            </ol>
          </div>
        </div>
      </div>
    )
  }

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

  const iframeUrl = `${grafanaBase}/d/${DASHBOARD_UID}/climate-tracker?${params.toString()}`

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-secondary">
          Data sourced from InfluxDB via Grafana
        </p>
        <a
          href={`${grafanaBase}/d/${DASHBOARD_UID}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-accent hover:underline inline-flex items-center gap-1"
        >
          Open in Grafana
          <span aria-hidden="true">↗</span>
        </a>
      </div>

      <div
        className="relative w-full rounded-lg overflow-hidden border border-border bg-[#181b1f]"
        style={{ height: 480 }}
      >
        <iframe
          src={iframeUrl}
          className="absolute inset-0 w-full h-full border-0"
          title="AIR ATLAS Live Grafana Analytics Dashboard"
          loading="lazy"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    </div>
  )
}
