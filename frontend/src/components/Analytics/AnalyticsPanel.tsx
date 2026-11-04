import { useAnalyticsStore, type AnalyticsTab } from '@/store/analyticsStore'
import { HistoryChart } from './HistoryChart'
import { GrafanaDashboard } from './GrafanaDashboard'
import { ExportButton } from './ExportButton'

const TABS: { value: AnalyticsTab; label: string; icon: string }[] = [
  { value: 'history', label: 'History', icon: '📈' },
  { value: 'grafana', label: 'Grafana', icon: '📊' },
]

/**
 * Analytics panel displayed at the bottom of the main area.
 * Contains tabbed views: built-in history charts and Grafana embed.
 */
export function AnalyticsPanel() {
  const isOpen = useAnalyticsStore((s) => s.isOpen)
  const activeTab = useAnalyticsStore((s) => s.activeTab)
  const setActiveTab = useAnalyticsStore((s) => s.setActiveTab)
  const toggle = useAnalyticsStore((s) => s.toggle)

  return (
    <div
      className={`absolute bottom-0 left-0 right-0 z-30 transition-transform duration-300 ${
        isOpen ? 'translate-y-0' : 'translate-y-[calc(100%-2.5rem)]'
      }`}
    >
      {/* ── Toggle bar ──────────────────────────────────────────────── */}
      <button
        onClick={toggle}
        className="flex items-center justify-between w-full h-10 px-4
                   bg-surface/95 backdrop-blur-sm border-t border-border
                   text-text-primary text-sm font-medium
                   hover:bg-surface-hover transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <span>📊 Analytics</span>
          {/* Tabs in header when open */}
          {isOpen && (
            <div className="flex gap-1 ml-2">
              {TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={(e) => {
                    e.stopPropagation()
                    setActiveTab(tab.value)
                  }}
                  className={`px-2 py-0.5 text-xs rounded-md transition-colors ${
                    activeTab === tab.value
                      ? 'bg-accent text-surface font-semibold'
                      : 'text-text-secondary hover:bg-surface-hover'
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isOpen && <ExportButton />}
          <span className="text-text-secondary text-xs">
            {isOpen ? '▼ Close' : '▲ Open'}
          </span>
        </div>
      </button>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <div
        className="bg-surface/95 backdrop-blur-sm border-t border-border overflow-y-auto p-4"
        style={{ maxHeight: 'calc(50vh - 2.5rem)' }}
      >
        {activeTab === 'history' && <HistoryChart />}
        {activeTab === 'grafana' && <GrafanaDashboard />}
      </div>
    </div>
  )
}
