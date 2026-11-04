import { useEffect, useRef, useState } from 'react'
import { apiUrl } from '@/config/api'

interface UsageData {
  owm: {
    daily: number
    minutely: number
    dailyLimit: number
    minuteLimit: number
    dailyGuard: number
  }
  maptiler: {
    monthly: number
    monthlyLimit: number
    monthlyGuard: number
  }
}

function UsageMeter({
  used,
  limit,
  guard,
  label,
}: {
  used: number
  limit: number
  guard: number
  label: string
}) {
  const pct = Math.min((used / limit) * 100, 100)
  const barColor =
    used >= guard ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-emerald-500'

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-[10px]">
        <span className="text-text-secondary">{label}</span>
        <span className={used >= guard ? 'text-red-400 font-semibold' : pct >= 70 ? 'text-yellow-400' : 'text-text-secondary'}>
          {used.toLocaleString()} / {limit.toLocaleString()}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-surface overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

/**
 * Compact badge in the sidebar header that shows real-time API usage
 * against free-tier limits for OpenWeatherMap and MapTiler.
 * Polling interval: 30 s.
 */
export function ApiUsageBadge() {
  const [data, setData] = useState<UsageData | null>(null)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const load = () =>
      fetch(apiUrl('/api/usage'))
        .then((r) => (r.ok ? (r.json() as Promise<UsageData>) : Promise.reject()))
        .then(setData)
        .catch(() => {})
    load()
    const id = setInterval(load, 30_000)
    return () => clearInterval(id)
  }, [])

  // Close popover on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  if (!data) return null

  const owmPct = (data.owm.daily / data.owm.dailyLimit) * 100
  const owmCritical = data.owm.daily >= data.owm.dailyGuard

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        title="API usage vs. free-tier limits"
        className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors cursor-pointer ${
          owmCritical
            ? 'border-red-500/60 text-red-400 bg-red-500/10'
            : owmPct >= 70
            ? 'border-yellow-500/60 text-yellow-400 bg-yellow-500/10'
            : 'border-border text-text-secondary hover:text-text-primary'
        }`}
      >
        API {Math.round(owmPct)}%
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-64 rounded-lg border border-border bg-surface/95 backdrop-blur-sm shadow-xl p-3 flex flex-col gap-3">
          <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">
            API Usage — Free Tier
          </p>

          {/* OpenWeatherMap */}
          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-medium text-text-primary">OpenWeatherMap</p>
            <UsageMeter
              used={data.owm.daily}
              limit={data.owm.dailyLimit}
              guard={data.owm.dailyGuard}
              label="Calls today (limit: 1,000/day)"
            />
            <UsageMeter
              used={data.owm.minutely}
              limit={data.owm.minuteLimit}
              guard={data.owm.minuteLimit}
              label="Calls this minute (limit: 60/min)"
            />
          </div>

          {/* MapTiler */}
          <div className="flex flex-col gap-2 border-t border-border pt-2">
            <p className="text-[11px] font-medium text-text-primary">MapTiler</p>
            <UsageMeter
              used={data.maptiler.monthly}
              limit={data.maptiler.monthlyLimit}
              guard={data.maptiler.monthlyGuard}
              label="Geocode calls this month (limit: 10k)"
            />
          </div>

          {owmCritical && (
            <p className="text-[10px] text-red-400 border-t border-border pt-2">
              ⚠ Requests paused at 95 % to stay under the free limit.
            </p>
          )}
          {!owmCritical && (
            <p className="text-[10px] text-text-secondary/60 border-t border-border pt-2">
              Requests auto-pause at 95 % of each limit.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
