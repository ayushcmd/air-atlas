import { create } from 'zustand'

export type ViewMode = 'map' | 'globe'

interface ViewState {
  mode: ViewMode
  setMode: (mode: ViewMode) => void
  toggleMode: () => void
}

/**
 * Manages the current view mode (2D Map vs 3D Globe).
 */
export const useViewStore = create<ViewState>((set) => ({
  mode: 'map',
  setMode: (mode) => set({ mode }),
  toggleMode: () =>
    set((s) => ({ mode: s.mode === 'map' ? 'globe' : 'map' })),
}))
