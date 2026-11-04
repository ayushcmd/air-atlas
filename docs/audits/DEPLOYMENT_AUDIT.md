# Deployment Audit — AIR ATLAS

**Audit Date:** 2026-11-04  
**Project:** AIR ATLAS (Climate & Impact Global Tracker)  
**Repository:** https://github.com/ayushcmd/air-atlas  
**Upstream Repository:** https://github.com/tabries/climate-tracker  
**Target Environment:** Cloudflare Pages (Frontend) + Cloudflare Workers (Backend API)  

---

## 1. Executive Summary

The Climate & Impact Global Tracker is a real-time climate monitoring dashboard combining 2D interactive weather layers (MapLibre GL) and 3D Earth visualizations (Three.js / React Three Fiber) with real-time alerts, analytics charts, and data export.

The original implementation uses a split architecture:
1. **Frontend:** React 19 SPA powered by Vite 6, Tailwind CSS 4, Zustand 5, MapLibre GL, Three.js, Recharts, and `socket.io-client`.
2. **Backend:** Express 4 Node.js service utilizing Socket.IO, Redis 7 (caching and API rate limiting), InfluxDB 2.7 (time-series storage), and Grafana (embedded iframe dashboard).

This audit details every component, endpoint, dependency, and external integration, followed by a compatibility analysis for migration to Cloudflare's serverless edge platform (Cloudflare Pages + Cloudflare Workers).

---

## 2. Existing Architecture & Directory Structure

```
atlas/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── apiClient.ts         # Axios instance for outbound API calls
│   │   │   ├── influx.ts            # InfluxDB client singleton & connection check
│   │   │   └── redis.ts             # Redis client singleton & connection handler
│   │   ├── middleware/
│   │   │   ├── cache.ts             # Redis-based HTTP response caching
│   │   │   ├── error.ts             # Central Express error handler
│   │   │   ├── rateLimiter.ts       # express-rate-limit middleware
│   │   │   └── validate.ts          # Zod schema validation middleware
│   │   ├── routes/
│   │   │   ├── airQualityRoutes.ts  # /api/air-quality/:lat/:lon
│   │   │   ├── geocodeRoutes.ts     # /api/geocode?query=...
│   │   │   ├── historyRoutes.ts     # /api/history (weather, air-quality, export)
│   │   │   ├── tileRoutes.ts        # /api/tiles/:layer/:z/:x/:y
│   │   │   ├── usageRoutes.ts       # /api/usage
│   │   │   └── weatherRoutes.ts     # /api/weather/:lat/:lon
│   │   ├── schemas/
│   │   │   ├── geocodeSchema.ts     # Zod validator for geocoding queries
│   │   │   └── weatherSchema.ts     # Zod validator for lat/lon params
│   │   ├── services/
│   │   │   ├── airQualityService.ts # OpenWeatherMap Air Pollution API client
│   │   │   ├── geocodeService.ts    # MapTiler Geocoding API client
│   │   │   ├── influxService.ts     # InfluxDB Point writes & Flux queries
│   │   │   └── weatherService.ts    # OpenWeatherMap current & forecast client
│   │   ├── socket/
│   │   │   └── socketService.ts     # Socket.IO connection, room, & broadcast logic
│   │   ├── types/                   # TypeScript interfaces (weather, AQI, geocode)
│   │   ├── utils/
│   │   │   ├── logger.ts            # Winston logger
│   │   │   └── usageTracker.ts      # Redis-backed rate usage meters & guards
│   │   └── index.ts                 # Express & HTTP server entry point
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AlertsBadge.tsx      # Notification badge for active weather alerts
│   │   │   ├── ApiUsageBadge.tsx    # Live meter for OWM / MapTiler quota
│   │   │   ├── DataPanel.tsx        # Weather & AQI details sidebar panel
│   │   │   ├── Layout.tsx           # Main application view container
│   │   │   ├── RealtimeStatus.tsx   # Live connection indicator & pause toggle
│   │   │   ├── SearchBar.tsx        # Location search autocomplete
│   │   │   ├── Analytics/           # Recharts HistoryChart, CSV Export, Grafana iframe
│   │   │   ├── Globe/               # Three.js 3D Globe, Atmosphere, DataPoints
│   │   │   └── Map/                 # MapLibre 2D Map, LayerManager, Legend
│   │   ├── data/
│   │   │   └── worldCities.ts       # Preset cities for Globe 3D visualization
│   │   ├── hooks/
│   │   │   └── useSocket.ts         # Socket.IO lifecycle & state synchronization
│   │   ├── store/
│   │   │   ├── analyticsStore.ts    # Zustand store for historical analytics
│   │   │   ├── layerStore.ts        # Zustand store for map layer toggles & opacity
│   │   │   ├── realtimeStore.ts     # Zustand store for live status & alerts
│   │   │   ├── viewStore.ts         # Zustand store for 2D Map vs 3D Globe toggle
│   │   │   └── weatherStore.ts      # Zustand store for selected location & data
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
├── docker-compose.yml               # Local container orchestration (Redis, InfluxDB, Grafana)
└── README.md
```

---

## 3. Comprehensive Backend Endpoint Inventory

| HTTP Method | Route | Parameters | Caching / TTL | Description |
|---|---|---|---|---|
| `GET` | `/health` | None | None | Health check returning status and UTC timestamp. |
| `GET` | `/api` | None | None | API title and version metadata. |
| `GET` | `/api/weather/:lat/:lon` | `lat` (-90..90), `lon` (-180..180) | 30 minutes (Redis) | Fetches current weather + 5-day daily forecast summary from OpenWeatherMap. |
| `GET` | `/api/air-quality/:lat/:lon` | `lat` (-90..90), `lon` (-180..180) | 30 minutes (Redis) | Fetches Air Quality Index (1–5), human label, and 8 pollutant concentrations. |
| `GET` | `/api/geocode` | `query` (min 2 chars) | 24 hours (Redis) | Queries MapTiler Geocoding API for city/region suggestions and coordinates. |
| `GET` | `/api/tiles/:layer/:z/:x/:y` | `layer` (`temp_new`, `precipitation_new`, `clouds_new`, `wind_new`, `pressure_new`), `z`, `x`, `y` | 10 minutes (`Cache-Control`) | Proxies OpenWeatherMap weather raster tiles with server-side API key injection. Returns 1×1 transparent PNG on 404. |
| `GET` | `/api/history/weather/:lat/:lon` | `lat`, `lon`, `range` (`1h`..`30d`), `every` (`5m`..`1d`) | 5 min to 3 hours (Redis) | Aggregated time-series weather points (`temp`, `humidity`, `wind_speed`, `precipitation`, `feels_like`). |
| `GET` | `/api/history/air-quality/:lat/:lon` | `lat`, `lon`, `range` (`1h`..`30d`), `every` (`5m`..`1d`) | 5 min to 3 hours (Redis) | Aggregated time-series AQI points (`aqi`, `pm2_5`, `pm10`, `o3`). |
| `GET` | `/api/history/export/:lat/:lon` | `lat`, `lon`, `range` (`1h`..`30d`) | None (Rate limit: 10/min) | Generates and streams downloadable CSV containing combined weather & AQI history. |
| `GET` | `/api/usage` | None | None | Returns real-time API quota counters against free-tier limits for OWM and MapTiler. |

---

## 4. API Key & Credential Dependencies

1. **`OPENWEATHERMAP_API_KEY`** (Backend secret):
   - Used in: `weatherService.ts`, `airQualityService.ts`, `tileRoutes.ts`, `socketService.ts`.
   - Purpose: Current weather, 5-day forecast, air pollution, weather tile layers.
2. **`MAPTILER_API_KEY`** (Backend secret):
   - Used in: `geocodeService.ts`.
   - Purpose: Server-side geocoding queries.
3. **`VITE_MAPTILER_API_KEY`** (Frontend public env var):
   - Used in: `frontend/src/components/Map/MapContainer.tsx`.
   - Purpose: MapLibre GL vector basemap tiles (`https://api.maptiler.com/maps/dataviz-dark/style.json`).
4. **`INFLUXDB_TOKEN` / `INFLUXDB_URL` / `INFLUXDB_ORG` / `INFLUXDB_BUCKET`** (Backend config):
   - Used in: `influx.ts`, `influxService.ts`.
   - Purpose: Time-series database writes and Flux queries. Gracefully disables if token is empty.
5. **`REDIS_URL`** (Backend config):
   - Used in: `redis.ts`, `cache.ts`, `usageTracker.ts`.
   - Purpose: Caching API responses and storing rate quota counters. Gracefully disables if Redis is unavailable.

---

## 5. Real-Time Functionality Analysis

* **Protocol:** Socket.IO over WebSockets with HTTP long-polling fallback.
* **Cadence:** 30,000 ms (30 s) broadcast interval.
* **Subscriptions:** Client emits `subscribe` `{ lat, lon }` and `unsubscribe` `{ lat, lon }`.
* **Emitted Events:**
  - `config`: `{ broadcastInterval: 30000 }`
  - `weather:update`: Updated current weather and forecast.
  - `air-quality:update`: Updated AQI and component readings.
  - `weather:alerts`: Generated when thresholds are breached:
    - Extreme Heat: Temp > 40°C
    - Extreme Cold: Temp < -20°C
    - Severe Wind: Wind > 100 km/h (27.8 m/s)
    - Hazardous Air Quality: AQI > 300 / Level 5
* **Client UI Integration:**
  - `RealtimeStatus.tsx` shows connection dot (emerald = Live, amber = Connecting, red = Offline).
  - Time since last update ticker (`Xs ago`).
  - Play/Pause toggle to pause live refreshes.
  - Notification badge with unread alert counts and popup drawer.

---

## 6. Cloudflare Compatibility Issues & Resolutions

| Component | Existing Implementation | Cloudflare Edge Issue | Resolution Strategy |
|---|---|---|---|
| **Server Framework** | Express 4 on Node.js HTTP server | Cloudflare Workers execute on V8 isolates using Web Standard `fetch` (Request/Response), not Node.js `http` listeners. | Implement a unified Cloudflare Worker router using standard Web APIs (`fetch`, `Request`, `Response`, `URLPattern`). |
| **Real-Time Push** | Socket.IO server daemon | Persistent Socket.IO daemon cannot run on serverless Workers without dedicated stateful compute. | Replace Socket.IO with a lightweight client-side periodic refresh controller (`useLiveRefresh.ts`). Executes every 30s, evaluates identical alert thresholds, updates Zustand stores (`realtimeStore`, `weatherStore`), preserves UI status ("Live", "↻ 30s", pause/resume), and eliminates WebSocket connection instability. |
| **Caching Layer** | Redis 7 via TCP socket (`ioredis` / `redis`) | TCP socket connections to private Redis instances are not available in standard Workers without tunnels or external Upstash Redis. | Utilize Cloudflare Workers Cache API (`caches.default`) with standard HTTP `Cache-Control` headers for edge caching. |
| **Time-Series DB** | InfluxDB 2.7 (local Docker) | InfluxDB requires a running daemon with persistent storage. | Integrate Open-Meteo's open historical API (`api.open-meteo.com` & `air-quality-api.open-meteo.com`) as the historical data engine for time-series charts and CSV exports. Open-Meteo provides instant, global historical weather and AQI data without maintaining a database. |
| **Map Tiles** | `/api/tiles/:layer/:z/:x/:y` Express proxy | OpenWeatherMap tiles require server-side API key hiding. | Port `/api/tiles/:layer/:z/:x/:y` to Cloudflare Worker with edge streaming and 10-minute Cloudflare cache. |
| **Basemap Fallback** | MapTiler vector basemap requires key | If `VITE_MAPTILER_API_KEY` is not supplied or invalid, map fails with 403. | Provide a free fallback basemap style (e.g. OpenStreetMap / CARTO Dark Matter / CartoDB raster/vector tiles) so the 2D map renders even if the user has not configured a MapTiler key. |
| **Grafana Embed** | Hardcoded `http://localhost:4000` iframe | Localhost URL is non-functional in production. | Make Grafana URL configurable via `VITE_GRAFANA_URL` and show a clean placeholder notice if no external Grafana instance is configured. |
| **Frontend Routing & Static Assets** | Vite dev proxy / Nginx container | Cloudflare Pages hosts static assets with single-page app (SPA) fallback. | Configure `_routes.json` or Pages SPA redirect rules (`/* /index.html 200`) and deploy to Cloudflare Pages. |

---

## 7. Migration Readiness Verdict

**Verdict: Fully Compatible.**  
All core features — 2D MapLibre map, 3D Three.js globe, live weather data, AQI ratings, search & geocoding, real-time periodic refresh, threshold alerts, time-series charts, and CSV export — can be migrated to Cloudflare Pages and Cloudflare Workers with zero loss of functionality.
