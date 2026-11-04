import { create } from 'zustand'
import { apiUrl } from '@/config/api'

/* ── Types ──────────────────────────────────────────────────────────────── */

export interface HistoryPoint {
  time: string
  temp: number | null
  humidity: number | null
  wind_speed: number | null
  precipitation: number | null
  feels_like: number | null
}

export interface AqiHistoryPoint {
  time: string
  aqi: number | null
  pm2_5: number | null
  pm10: number | null
  o3: number | null
}

export type TimeRange = '1h' | '6h' | '12h' | '24h' | '3d' | '7d' | '14d' | '30d'

export type AnalyticsTab = 'history' | 'grafana'

interface AnalyticsState {
  /* Visibility */
  isOpen: boolean
  activeTab: AnalyticsTab

  /* History data */
  weatherHistory: HistoryPoint[]
  aqiHistory: AqiHistoryPoint[]
  range: TimeRange
  loading: boolean
  error: string | null

  /* Actions */
  toggle: () => void
  open: () => void
  close: () => void
  setActiveTab: (tab: AnalyticsTab) => void
  setRange: (range: TimeRange) => void
  fetchHistory: (lat: number, lon: number) => Promise<void>
  clearHistory: () => void
}

/* ── Store ──────────────────────────────────────────────────────────────── */

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  isOpen: false,
  activeTab: 'history',

  weatherHistory: [],
  aqiHistory: [],
  range: '24h',
  loading: false,
  error: null,

  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  setActiveTab: (tab) => set({ activeTab: tab }),

  setRange: (range) => {
    set({ range })
  },

  fetchHistory: async (lat, lon) => {
    const { range } = get()
    set({ loading: true, error: null })

    try {
      const [weatherRes, aqiRes] = await Promise.allSettled([
        fetch(apiUrl(`/api/history/weather/${lat}/${lon}?range=${range}`)).then(async (r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`)
          return r.json()
        }),
        fetch(apiUrl(`/api/history/air-quality/${lat}/${lon}?range=${range}`)).then(async (r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`)
          return r.json()
        }),
      ])

      set({
        weatherHistory:
          weatherRes.status === 'fulfilled' ? weatherRes.value.data : [],
        aqiHistory:
          aqiRes.status === 'fulfilled' ? aqiRes.value.data : [],
        loading: false,
      })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load history',
        loading: false,
      })
    }
  },

  clearHistory: () =>
    set({ weatherHistory: [], aqiHistory: [], error: null }),
}))
