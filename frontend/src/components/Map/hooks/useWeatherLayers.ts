import { useEffect, useRef } from 'react'
import { apiUrl } from '@/config/api'
import type maplibregl from 'maplibre-gl'
import {
  useLayerStore,
  LAYER_DEFINITIONS,
  LAYER_IDS,
  type WeatherLayerId,
} from '@/store/layerStore'

/**
 * Synchronises the weather tile layers on the MapLibre map
 * with the current layer store state (visible / opacity).
 *
 * Call once from MapContainer after the map instance is available.
 */
export function useWeatherLayers(map: maplibregl.Map | null) {
  const layers = useLayerStore((s) => s.layers)
  const initialised = useRef(false)

  useEffect(() => {
    if (!map) return

    const sync = () => syncLayers(map, layers)

    if (map.isStyleLoaded()) {
      sync()
      initialised.current = true
    } else if (!initialised.current) {
      map.once('load', () => {
        sync()
        initialised.current = true
      })
    }
  }, [map, layers])
}

/* ── Internal helpers ──────────────────────────────────────────────────── */

function syncLayers(
  map: maplibregl.Map,
  layers: Record<WeatherLayerId, { visible: boolean; opacity: number }>,
) {
  for (const id of LAYER_IDS) {
    const def = LAYER_DEFINITIONS[id]
    const state = layers[id]
    const sourceId = `owm-${id}`
    const layerId = `owm-${id}-layer`

    if (state.visible) {
      ensureSource(map, sourceId, def.owmTileLayer)
      ensureLayer(map, layerId, sourceId, state.opacity)
    } else {
      removeLayerAndSource(map, layerId, sourceId)
    }
  }
}

function ensureSource(map: maplibregl.Map, sourceId: string, owmTile: string) {
  if (map.getSource(sourceId)) return
  map.addSource(sourceId, {
    type: 'raster',
    tiles: [apiUrl(`/api/tiles/${owmTile}/{z}/{x}/{y}`)],
    tileSize: 256,
    attribution: '&copy; <a href="https://openweathermap.org/">OpenWeatherMap</a>',
  })
}

function ensureLayer(
  map: maplibregl.Map,
  layerId: string,
  sourceId: string,
  opacity: number,
) {
  if (map.getLayer(layerId)) {
    map.setPaintProperty(layerId, 'raster-opacity', opacity)
    return
  }
  map.addLayer({
    id: layerId,
    type: 'raster',
    source: sourceId,
    paint: {
      'raster-opacity': opacity,
      'raster-fade-duration': 300,
    },
  })
}

function removeLayerAndSource(
  map: maplibregl.Map,
  layerId: string,
  sourceId: string,
) {
  if (map.getLayer(layerId)) map.removeLayer(layerId)
  if (map.getSource(sourceId)) map.removeSource(sourceId)
}
