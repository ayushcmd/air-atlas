import { useState } from 'react'
import {
  useLayerStore,
  LAYER_DEFINITIONS,
  LAYER_IDS,
} from '@/store/layerStore'

/**
 * Floating panel that lets the user toggle weather tile layers and adjust
 * their opacity. Positioned over the map canvas.
 */
export function LayerManager() {
  const { layers, toggleLayer, setOpacity } = useLayerStore()
  const [collapsed, setCollapsed] = useState(false)

  const activeCount = LAYER_IDS.filter((id) => layers[id].visible).length

  return (
    <div className="bg-surface/90 backdrop-blur-sm border border-border rounded-lg shadow-lg select-none">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center justify-between w-full px-3 py-2.5 text-sm
                   hover:bg-surface-hover transition-colors rounded-lg"
      >
        <span className="font-semibold text-text-primary flex items-center gap-1.5">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-4 h-4 text-accent"
          >
            <path d="M1 4.75C1 3.784 1.784 3 2.75 3h14.5c.966 0 1.75.784 1.75 1.75v2.5A1.75 1.75 0 0 1 17.25 9H2.75A1.75 1.75 0 0 1 1 7.25v-2.5ZM1 12.75c0-.966.784-1.75 1.75-1.75h14.5c.966 0 1.75.784 1.75 1.75v2.5A1.75 1.75 0 0 1 17.25 17H2.75A1.75 1.75 0 0 1 1 15.25v-2.5Z" />
          </svg>
          Layers
        </span>
        <span className="flex items-center gap-1">
          {activeCount > 0 && (
            <span className="bg-accent/20 text-accent text-xs px-1.5 py-0.5 rounded-full font-medium">
              {activeCount}
            </span>
          )}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`w-4 h-4 text-text-secondary transition-transform ${collapsed ? '' : 'rotate-180'}`}
          >
            <path
              fillRule="evenodd"
              d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      </button>

      {/* ── Layer list ─────────────────────────────────────────────────── */}
      {!collapsed && (
        <div className="px-3 pb-3 flex flex-col gap-1.5">
          {LAYER_IDS.map((id) => {
            const def = LAYER_DEFINITIONS[id]
            const state = layers[id]

            return (
              <div key={id}>
                <label className="flex items-center gap-2 cursor-pointer text-sm py-1
                                  hover:bg-surface-hover rounded px-1.5 -mx-1.5 transition-colors">
                  <input
                    type="checkbox"
                    checked={state.visible}
                    onChange={() => toggleLayer(id)}
                    className="accent-accent h-3.5 w-3.5 rounded"
                  />
                  <span className="w-5 text-center">{def.icon}</span>
                  <span className="text-text-primary">{def.label}</span>
                </label>

                {/* Opacity slider (only when visible) */}
                {state.visible && (
                  <div className="flex items-center gap-2 ml-8 mt-0.5 mb-1">
                    <input
                      type="range"
                      min={10}
                      max={100}
                      value={Math.round(state.opacity * 100)}
                      onChange={(e) => setOpacity(id, Number(e.target.value) / 100)}
                      className="flex-1 h-1 accent-accent cursor-pointer"
                    />
                    <span className="text-[10px] text-text-secondary w-7 text-right">
                      {Math.round(state.opacity * 100)}%
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
