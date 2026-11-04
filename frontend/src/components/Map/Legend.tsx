import {
  useLayerStore,
  LAYER_DEFINITIONS,
  LAYER_IDS,
} from '@/store/layerStore'

/**
 * Renders a compact color-scale legend for each currently visible layer.
 * Positioned over the map canvas (bottom-left).
 */
export function Legend() {
  const layers = useLayerStore((s) => s.layers)
  const activeLayers = LAYER_IDS.filter((id) => layers[id].visible)

  if (activeLayers.length === 0) return null

  return (
    <div className="flex flex-col gap-2 max-w-[220px]">
      {activeLayers.map((id) => {
        const { legend } = LAYER_DEFINITIONS[id]
        const { stops } = legend

        return (
          <div
            key={id}
            className="bg-surface/90 backdrop-blur-sm border border-border rounded-lg p-2.5"
          >
            {/* Title */}
            <p className="text-[11px] font-semibold text-text-secondary mb-1.5 leading-none">
              {legend.title}{' '}
              <span className="font-normal">({legend.unit})</span>
            </p>

            {/* Gradient bar */}
            <div className="flex h-2.5 rounded overflow-hidden">
              {stops.map((stop, i) => (
                <div
                  key={i}
                  className="flex-1"
                  style={{ backgroundColor: stop.color }}
                />
              ))}
            </div>

            {/* Min / Max labels */}
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-text-secondary leading-none">
                {stops[0].label}
              </span>
              <span className="text-[10px] text-text-secondary leading-none">
                {stops[stops.length - 1].label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
