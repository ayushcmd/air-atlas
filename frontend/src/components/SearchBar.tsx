import { useState, useCallback, useRef, useEffect } from 'react'
import { useWeatherStore } from '@/store/weatherStore'
import { apiUrl, fetchJson } from '@/config/api'
import { WORLD_CITIES } from '@/data/worldCities'

interface Suggestion {
  lat: number
  lon: number
  name: string
  country: string
  full_name: string
  isCity?: boolean
}

/**
 * Debounced search bar with world-cities quick-pick and geocode fallback.
 */
export function SearchBar() {
  const [query, setQuery] = useState('')
  const [geocodeSuggestions, setGeocodeSuggestions] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const setSelectedLocation = useWeatherStore((s) => s.setSelectedLocation)

  // Build client-side city matches instantly from worldCities list
  const q = query.toLowerCase().trim()
  const cityMatches: Suggestion[] = q
    ? WORLD_CITIES.filter((c) => c.name.toLowerCase().includes(q))
        .slice(0, 5)
        .map((c) => ({ lat: c.lat, lon: c.lon, name: c.name, country: '', full_name: c.name, isCity: true }))
    : WORLD_CITIES.slice(0, 6).map((c) => ({
        lat: c.lat, lon: c.lon, name: c.name, country: '', full_name: c.name, isCity: true,
      }))

  // Merge: known cities first, then geocode results (no duplicates)
  const suggestions: Suggestion[] = [
    ...cityMatches,
    ...geocodeSuggestions.filter(
      (g) => !cityMatches.some((c) => c.name.toLowerCase() === g.name.toLowerCase()),
    ),
  ]

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setGeocodeSuggestions([])
      return
    }
    setLoading(true)
    try {
      const data = await fetchJson<Suggestion[]>(
        apiUrl(`/api/geocode?query=${encodeURIComponent(q)}`),
      )
      setGeocodeSuggestions(data)
    } catch {
      setGeocodeSuggestions([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = (value: string) => {
    setQuery(value)
    setOpen(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => search(value), 300)
  }

  const handleSelect = (s: Suggestion) => {
    setSelectedLocation({ lat: s.lat, lon: s.lon, name: s.full_name ?? s.name })
    setQuery(s.full_name ?? s.name)
    setOpen(false)
    setGeocodeSuggestions([])
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <input
        type="text"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder="Search location…"
        className="w-full rounded-lg bg-surface-alt border border-border px-4 py-2.5
                   text-text-primary placeholder:text-text-secondary
                   focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent
                   transition-all"
      />
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      )}

      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full rounded-lg bg-surface-alt border border-border
                        shadow-lg overflow-hidden max-h-72 overflow-y-auto">
          {!q && (
            <li className="px-4 py-1.5 text-[10px] text-text-secondary font-semibold uppercase tracking-wider border-b border-border">
              Popular cities
            </li>
          )}
          {suggestions.map((s, i) => (
            <li key={`${s.lat}-${s.lon}-${i}`}>
              <button
                type="button"
                onClick={() => handleSelect(s)}
                className="w-full text-left px-4 py-2.5 hover:bg-surface-hover
                           transition-colors text-sm flex items-center gap-2"
              >
                {s.isCity && <span className="text-accent text-[10px] shrink-0">★</span>}
                <span>
                  <span className="text-text-primary">{s.name}</span>
                  {s.country && (
                    <span className="text-text-secondary ml-1">— {s.country}</span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
