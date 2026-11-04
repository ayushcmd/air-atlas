import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/* ── Layer types ───────────────────────────────────────────────────────── */

export type WeatherLayerId = 'temp' | 'precipitation' | 'clouds' | 'wind' | 'pressure'

export interface LegendStop {
  color: string
  label: string
}

export interface LegendConfig {
  title: string
  unit: string
  stops: LegendStop[]
}

export interface LayerDefinition {
  label: string
  owmTileLayer: string
  icon: string
  legend: LegendConfig
}

/* ── Layer definitions with legend color scales ────────────────────────── */

export const LAYER_DEFINITIONS: Record<WeatherLayerId, LayerDefinition> = {
  temp: {
    label: 'Temperature',
    owmTileLayer: 'temp_new',
    icon: '🌡️',
    legend: {
      title: 'Temperature',
      unit: '°C',
      stops: [
        { color: '#821692', label: '-40' },
        { color: '#0000ff', label: '-20' },
        { color: '#00b4ff', label: '-10' },
        { color: '#00ffff', label: '0' },
        { color: '#00ff00', label: '10' },
        { color: '#ffff00', label: '20' },
        { color: '#ff8c00', label: '30' },
        { color: '#ff0000', label: '40' },
      ],
    },
  },
  precipitation: {
    label: 'Precipitation',
    owmTileLayer: 'precipitation_new',
    icon: '🌧️',
    legend: {
      title: 'Precipitation',
      unit: 'mm',
      stops: [
        { color: 'transparent', label: '0' },
        { color: '#00b4ff80', label: '0.5' },
        { color: '#0064ff', label: '1' },
        { color: '#3200ff', label: '2' },
        { color: '#9600c8', label: '5' },
        { color: '#ff00ff', label: '10' },
        { color: '#ff6400', label: '140' },
      ],
    },
  },
  clouds: {
    label: 'Clouds',
    owmTileLayer: 'clouds_new',
    icon: '☁️',
    legend: {
      title: 'Cloud Cover',
      unit: '%',
      stops: [
        { color: '#ffffff10', label: '0' },
        { color: '#ffffff40', label: '25' },
        { color: '#ffffff80', label: '50' },
        { color: '#ffffffb3', label: '75' },
        { color: '#ffffffdd', label: '100' },
      ],
    },
  },
  wind: {
    label: 'Wind Speed',
    owmTileLayer: 'wind_new',
    icon: '💨',
    legend: {
      title: 'Wind Speed',
      unit: 'm/s',
      stops: [
        { color: '#ffffff40', label: '0' },
        { color: '#aef1f9', label: '5' },
        { color: '#96d4ea', label: '15' },
        { color: '#38a3d0', label: '25' },
        { color: '#0c6cb1', label: '50' },
        { color: '#c63d2f', label: '100' },
      ],
    },
  },
  pressure: {
    label: 'Pressure',
    owmTileLayer: 'pressure_new',
    icon: '🔵',
    legend: {
      title: 'Sea-Level Pressure',
      unit: 'hPa',
      stops: [
        { color: '#0000cc', label: '940' },
        { color: '#0066ff', label: '980' },
        { color: '#00ff00', label: '1010' },
        { color: '#ffff00', label: '1030' },
        { color: '#ff0000', label: '1070' },
      ],
    },
  },
}

export const LAYER_IDS = Object.keys(LAYER_DEFINITIONS) as WeatherLayerId[]

/* ── Store ──────────────────────────────────────────────────────────────── */

interface LayerState {
  layers: Record<WeatherLayerId, { visible: boolean; opacity: number }>
  toggleLayer: (id: WeatherLayerId) => void
  setOpacity: (id: WeatherLayerId, opacity: number) => void
}

export const useLayerStore = create<LayerState>()(
  persist(
    (set) => ({
      layers: {
        temp: { visible: false, opacity: 0.6 },
        precipitation: { visible: false, opacity: 0.6 },
        clouds: { visible: false, opacity: 0.5 },
        wind: { visible: false, opacity: 0.6 },
        pressure: { visible: false, opacity: 0.6 },
      },

      toggleLayer: (id) =>
        set((state) => ({
          layers: {
            ...state.layers,
            [id]: { ...state.layers[id], visible: !state.layers[id].visible },
          },
        })),

      setOpacity: (id, opacity) =>
        set((state) => ({
          layers: {
            ...state.layers,
            [id]: { ...state.layers[id], opacity },
          },
        })),
    }),
    { name: 'climate-tracker-layers' },
  ),
)
