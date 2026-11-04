# Attribution & Open Source Notices — Air Atlas

This project, **Air Atlas**, is built upon the open-source **Climate & Impact Global Tracker** created by **Gabriel Martínez (`tabries`)**.

---

## 1. Upstream Project

* **Project Title:** Climate & Impact Global Tracker
* **Original Author:** Gabriel Martínez (`gamartinezayala@gmail.com` / GitHub: [`tabries`](https://github.com/tabries))
* **License:** MIT License (Permissive open-source license)
* **Included Components from Upstream:**
  - Frontend React 19 architecture, design system, and UI layout
  - 2D MapLibre GL weather layers and layer manager
  - 3D Three.js Globe rendering and city instancing
  - Recharts historical charts and analytics panel
  - Original Express 4 backend routes, Zod schemas, and data models

---

## 2. Adaptations & Extensions by `ayushcmd`

* **Author:** `ayushcmd` (`ayush24a12res897@iitp.ac.in`)
* **Repository:** https://github.com/ayushcmd/air-atlas.git
* **Components Authored by `ayushcmd`:**
  - **Cloudflare Worker API Server (`worker/`):** Full edge API rewrite replacing Node.js Express server with Cloudflare Workers native runtime.
  - **Open-Meteo Fallback Engine:** Resilient multi-provider architecture ensuring weather, AQI, geocoding, and historical analytics work seamlessly with or without proprietary API keys.
  - **Edge Caching & Security:** Native Workers Cache API, CORS handling, and streaming tile proxy.
  - **Cloudflare Deployment Infrastructure:** `wrangler.jsonc`, Cloudflare Pages static SPA configuration, and deployment scripts.
  - **Audits & Documentation:** `DEPLOYMENT_AUDIT.md`, `ATTRIBUTION.md`, and deployment guides.

---

## 3. Third-Party Libraries & Datasets

| Component | Author / Source | License |
|---|---|---|
| MapLibre GL JS | MapLibre Contributors | BSD 3-Clause |
| Three.js / R3F / Drei | Mr.doob & Three.js Contributors | MIT |
| Recharts | Recharts Group | MIT |
| Zustand | Paul Henschel & Zustand Contributors | MIT |
| React / React DOM | Meta Platforms, Inc. | MIT |
| Vite | Evan You & Vite Contributors | MIT |
| Tailwind CSS | Tailwind Labs, Inc. | MIT |
| Earth Texture (`earth_daymap.jpg`) | NASA Visible Earth / Blue Marble | Public Domain |
| Open-Meteo Weather APIs | Open-Meteo GmbH | CC BY 4.0 |
| OpenWeatherMap & MapTiler APIs | OpenWeather Ltd & MapTiler AG | Proprietary / Free Tier |
