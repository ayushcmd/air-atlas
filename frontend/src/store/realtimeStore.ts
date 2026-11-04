import { create } from 'zustand'

/* ── Types ──────────────────────────────────────────────────────────────── */

export interface WeatherAlert {
  type: string
  message: string
  severity: 'warning' | 'critical'
}

export interface AlertEvent {
  lat: number
  lon: number
  alerts: WeatherAlert[]
  timestamp: string
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected'

interface RealtimeState {
  /** Socket.IO connection status */
  connectionStatus: ConnectionStatus

  /** ISO timestamp of last successful weather push */
  lastUpdate: string | null

  /** Server-configured broadcast interval (ms) */
  broadcastInterval: number

  /** Active weather alerts for subscribed locations */
  alerts: AlertEvent[]

  /** Whether there is an unread (un-dismissed) alert */
  hasUnreadAlerts: boolean

  // ── actions ──
  setConnectionStatus: (status: ConnectionStatus) => void
  setLastUpdate: (ts: string) => void
  setBroadcastInterval: (ms: number) => void
  addAlerts: (event: AlertEvent) => void
  dismissAlerts: () => void
  clearAlerts: () => void
  isPaused: boolean
  togglePause: () => void
}

/* ── Store ──────────────────────────────────────────────────────────────── */

export const useRealtimeStore = create<RealtimeState>((set) => ({
  connectionStatus: 'disconnected',
  lastUpdate: null,
  broadcastInterval: 30_000,
  alerts: [],
  hasUnreadAlerts: false,

  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setLastUpdate: (ts) => set({ lastUpdate: ts }),
  setBroadcastInterval: (ms) => set({ broadcastInterval: ms }),

  addAlerts: (event) =>
    set((state) => ({
      alerts: [event, ...state.alerts].slice(0, 50), // keep last 50
      hasUnreadAlerts: true,
    })),

  dismissAlerts: () => set({ hasUnreadAlerts: false }),
  clearAlerts: () => set({ alerts: [], hasUnreadAlerts: false }),

  isPaused: false,
  togglePause: () => set((s) => ({ isPaused: !s.isPaused })),
}))
