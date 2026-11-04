/**
 * Temperature legend + info overlay shown in the 3D Globe view.
 * Displays the cold→hot color ramp and city count.
 */
export function GlobeLegend() {
  return (
    <div className="flex flex-col gap-3 pointer-events-none select-none">
      {/* Temperature color ramp */}
      <div className="bg-surface/80 backdrop-blur-sm rounded-lg border border-border px-3 py-2 pointer-events-auto">
        <p className="text-xs font-medium text-text-primary mb-1.5">
          Temperature <span className="text-text-secondary">(°C)</span>
        </p>
        <div
          className="h-2.5 rounded-sm w-36"
          style={{
            background:
              'linear-gradient(to right, #0000ff, #00ffff, #00ff00, #ffff00, #ff0000)',
          }}
        />
        <div className="flex justify-between text-[10px] text-text-secondary mt-0.5">
          <span>−10</span>
          <span>42</span>
        </div>
      </div>

      {/* Info */}
      <div className="bg-surface/80 backdrop-blur-sm rounded-lg border border-border px-3 py-2 pointer-events-auto">
        <p className="text-[10px] text-text-secondary leading-relaxed">
          Click a city point to view its weather on the 2D map.
          <br />
          Scroll to zoom · Drag to rotate.
        </p>
      </div>
    </div>
  )
}
