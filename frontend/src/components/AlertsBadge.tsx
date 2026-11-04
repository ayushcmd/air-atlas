import { useState } from 'react'
import { useRealtimeStore } from '@/store/realtimeStore'

/**
 * Displays a bell icon with badge count for weather alerts.
 * Clicking opens a dropdown with alert details.
 */
export function AlertsBadge() {
  const alerts = useRealtimeStore((s) => s.alerts)
  const hasUnread = useRealtimeStore((s) => s.hasUnreadAlerts)
  const dismissAlerts = useRealtimeStore((s) => s.dismissAlerts)
  const clearAlerts = useRealtimeStore((s) => s.clearAlerts)
  const [open, setOpen] = useState(false)

  const totalAlerts = alerts.reduce((sum, e) => sum + e.alerts.length, 0)

  return (
    <div className="relative">
      <button
        onClick={() => {
          setOpen((v) => !v)
          if (hasUnread) dismissAlerts()
        }}
        className="relative p-1.5 rounded-md hover:bg-surface-hover transition-colors text-text-secondary hover:text-text-primary"
        aria-label="Weather alerts"
      >
        🔔
        {hasUnread && totalAlerts > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white">
            {totalAlerts > 9 ? '9+' : totalAlerts}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 max-h-80 overflow-y-auto rounded-lg border border-border bg-surface shadow-xl z-50">
          <div className="flex items-center justify-between p-3 border-b border-border">
            <span className="text-sm font-semibold text-text-primary">
              Alerts
            </span>
            {alerts.length > 0 && (
              <button
                onClick={() => {
                  clearAlerts()
                  setOpen(false)
                }}
                className="text-xs text-text-secondary hover:text-text-primary"
              >
                Clear all
              </button>
            )}
          </div>

          {alerts.length === 0 ? (
            <div className="p-4 text-center text-sm text-text-secondary">
              No alerts
            </div>
          ) : (
            <div className="flex flex-col">
              {alerts.map((event, i) => (
                <div key={`${event.timestamp}-${i}`} className="border-b border-border/50 last:border-0">
                  {event.alerts.map((alert, j) => (
                    <div
                      key={`${alert.type}-${j}`}
                      className={`px-3 py-2 text-xs ${
                        alert.severity === 'critical'
                          ? 'bg-danger/10 text-danger'
                          : 'bg-amber-500/10 text-amber-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{alert.severity === 'critical' ? '🚨' : '⚠️'}</span>
                        <span className="font-medium">{alert.message}</span>
                      </div>
                      <div className="text-[10px] mt-0.5 opacity-60">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
