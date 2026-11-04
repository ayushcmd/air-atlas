# AIR ATLAS — Climate & Impact Global Tracker

An interactive dashboard for visualizing global climate, weather, and environmental risk data in real time, combining 2D interactive maps (MapLibre GL) with 3D Three.js globe visualizations. Built for climate analysts, developers, and researchers to understand atmospheric conditions, extreme weather anomalies, and environmental impact.

[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-Pages%20%2B%20Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)

---

## 🌟 Features

* **Interactive 2D Maps (MapLibre GL):**
  - Switchable weather tile layers: Temperature (`temp_new`), Precipitation (`precipitation_new`), Cloud Cover (`clouds_new`), Wind Speed (`wind_new`), and Atmospheric Pressure (`pressure_new`).
  - Resilient basemap support: MapTiler vector basemaps with automatic CARTO Dark Matter fallback.
* **3D Earth Globe (Three.js & React Three Fiber):**
  - Interactive globe with atmosphere shader, instanced city data points, color-coded temperature gradients, and click-to-focus navigation.
* **Real-Time Synchronisation & Alerts:**
  - Continuous 30-second live refresh cycle with pause/resume controls.
  - Automated threshold alerts for extreme heat (>40°C), extreme cold (<-20°C), severe winds (>100 km/h), and hazardous air quality.
* **Historical Analytics & Data Export:**
  - Recharts multi-metric time-series graphs for past 1h, 6h, 12h, 24h, 3d, 7d, 14d, and 30d.
  - One-click CSV dataset export combining historical weather and air pollution metrics.
  - Embedded Grafana dashboard view with configurable external endpoint support.
* **Serverless Edge Architecture:**
  - Edge API routing via **Cloudflare Workers** with 0ms cold starts.
  - Global static asset hosting and CDN caching via **Cloudflare Pages**.
  - Multi-provider data resilience: OpenWeatherMap + MapTiler with automatic Open-Meteo fallback.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│              FRONTEND (Cloudflare Pages — React 19 + Vite)      │
├─────────────────────────────────────────────────────────────────┤
│  MapLibre GL (2D)     Three.js Globe (3D)     Recharts Analytics│
│  Layer Manager        City Data Points        CSV Export        │
└───────────────────────────────┬─────────────────────────────────┘
                                │ HTTPS / JSON
┌───────────────────────────────▼─────────────────────────────────┐
│              API LAYER (Cloudflare Workers — TypeScript)        │
├─────────────────────────────────────────────────────────────────┤
│  /api/weather/:lat/:lon       /api/air-quality/:lat/:lon        │
│  /api/geocode?query=...       /api/history (weather, aqi, csv)  │
│  /api/tiles/:layer/:z/:x/:y   /api/usage                        │
│  Auth Guard & Circuit Breaker Edge Cache (Cache-Control)        │
└───────────────────────────────┬─────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│              DATA SOURCES & EXTERNAL PROVIDERS                  │
│  OpenWeatherMap (Primary)     Open-Meteo (Automatic Fallback)   │
│  MapTiler (Geocoding / Maps)  NASA Visible Earth (Textures)     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 💻 Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript 5, Vite 6, Tailwind CSS 4 |
| **Mapping & 3D** | MapLibre GL JS, Three.js, React Three Fiber, Drei |
| **State & Analytics** | Zustand 5, Recharts |
| **Edge Serverless API** | Cloudflare Workers, Web Standard Fetch APIs |
| **Edge Caching** | Cloudflare Workers Cache API, HTTP Cache-Control |
| **Data Providers** | OpenWeatherMap, MapTiler, Open-Meteo (Weather & AQI), NASA Blue Marble |
| **Local Full-Stack Dev** | Express 4, Redis 7, InfluxDB 2.7, Grafana, Docker Compose |

---

## 🚀 Quick Start

### 1. Prerequisites
* **Node.js 20+**
* **npm 10+**
* **Cloudflare Wrangler CLI** (`npm i -g wrangler`)

### 2. Installation
```bash
git clone https://github.com/ayushcmd/air-atlas.git
cd air-atlas

# Install frontend dependencies
npm --prefix frontend install

# Install backend dependencies (for local Express runtime)
npm --prefix backend install
```

### 3. Local Development

#### Option A: Running with Cloudflare Worker API (Recommended)
```bash
# Terminal 1 — Cloudflare Worker API
wrangler dev --port 8787

# Terminal 2 — Frontend Dev Server
npm --prefix frontend run dev
```

#### Option B: Running with Local Express & Docker
```bash
# Start infrastructure
docker compose up redis influxdb -d

# Start backend
npm --prefix backend run dev

# Start frontend
npm --prefix frontend run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

---

## ⚙️ Environment Variables

Copy `.env.example` to configure your environment:

### Cloudflare Worker Secrets (Production)
Configure via `wrangler secret put <NAME>`:

| Variable | Description | Default / Fallback |
|---|---|---|
| `OPENWEATHERMAP_API_KEY` | OpenWeatherMap key for live weather, AQI, and map tiles | Automatically falls back to Open-Meteo |
| `MAPTILER_API_KEY` | Server-side key for geocoding queries | Automatically falls back to Open-Meteo |
| `CORS_ORIGIN` | Allowed CORS origins for API requests | Defaults to `*` |

### Frontend Variables (`frontend/.env`)

| Variable | Description | Default / Fallback |
|---|---|---|
| `VITE_API_BASE_URL` | Base URL of deployed Cloudflare Worker API | Empty (uses relative `/api` proxy in dev) |
| `VITE_MAPTILER_API_KEY` | Client-side MapTiler key for vector basemap | Automatically falls back to CARTO Dark Matter |
| `VITE_GRAFANA_URL` | External Grafana dashboard URL | Defaults to `http://localhost:4000` |

---

## 📡 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | API health check and server timestamp |
| `GET` | `/api` | Service identification and version info |
| `GET` | `/api/weather/:lat/:lon` | Current weather + 5-day daily forecast summary |
| `GET` | `/api/air-quality/:lat/:lon` | Air Quality Index (1–5) and pollutant concentrations |
| `GET` | `/api/geocode?query=<query>` | Geographic location search and coordinate lookup |
| `GET` | `/api/tiles/:layer/:z/:x/:y` | Weather tile raster proxy (temp, precipitation, clouds, wind, pressure) |
| `GET` | `/api/history/weather/:lat/:lon` | Historical weather time series (`1h` to `30d`) |
| `GET` | `/api/history/air-quality/:lat/:lon` | Historical AQI time series (`1h` to `30d`) |
| `GET` | `/api/history/export/:lat/:lon` | Download joined weather & AQI time-series as CSV |
| `GET` | `/api/usage` | Real-time API consumption against free-tier quotas |

---

## ☁️ Deployment

### Cloudflare Workers (Backend API)
```bash
# Verify worker bundle
wrangler deploy --dry-run

# Deploy to Cloudflare Workers
wrangler deploy
```

### Cloudflare Pages (Frontend)
```bash
# Build production bundle
npm --prefix frontend run build

# Deploy via Wrangler
wrangler pages deploy frontend/dist --project-name air-atlas
```

---

## 📜 Attribution & License

Air Atlas is licensed under the [MIT License](LICENSE).

This project is built upon and adapted from the open-source **Climate & Impact Global Tracker** created by **Gabriel Martínez ([`tabries`](https://github.com/tabries))**.

See [`ATTRIBUTION.md`](ATTRIBUTION.md) for complete details on third-party libraries, datasets, and code provenance.
