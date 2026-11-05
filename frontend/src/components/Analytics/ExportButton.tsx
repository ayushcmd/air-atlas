import { useWeatherStore } from '@/store/weatherStore'
import { useAnalyticsStore } from '@/store/analyticsStore'
import { apiUrl } from '@/config/api'
import { useState } from 'react'

/**
 * Button that downloads historical weather + AQI data as a CSV file
 * from the backend /api/history/export endpoint.
 */
export function ExportButton() {
  const selectedLocation = useWeatherStore((s) => s.selectedLocation)
  const range = useAnalyticsStore((s) => s.range)
  const [downloading, setDownloading] = useState(false)

  if (!selectedLocation) return null

  async function handleExport() {
    if (!selectedLocation) return
    setDownloading(true)

    try {
      const { lat, lon } = selectedLocation
      const url = apiUrl(`/api/history/export/${lat}/${lon}?range=${range}`)
      const res = await fetch(url)
      const contentType = res.headers.get('content-type') || ''

      if (!res.ok) throw new Error(`Export failed: HTTP ${res.status}`)
      if (contentType.includes('text/html')) {
        throw new Error('Export failed: received HTML page instead of CSV file')
      }

      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `climate-${lat.toFixed(2)}_${lon.toFixed(2)}_${range}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    } catch (err) {
      console.error('CSV export error:', err)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={downloading}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md
                 bg-surface-alt border border-border text-text-secondary
                 hover:bg-surface-hover hover:text-text-primary transition-colors
                 disabled:opacity-50 disabled:cursor-not-allowed"
      title="Export data as CSV"
    >
      {downloading ? (
        <span className="h-3 w-3 animate-spin rounded-full border border-text-secondary border-t-transparent" />
      ) : (
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )}
      Export CSV
    </button>
  )
}
