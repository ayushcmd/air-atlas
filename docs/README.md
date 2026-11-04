# AIR ATLAS Documentation

Welcome to the **AIR ATLAS** documentation index. This directory organizes architecture guides, engineering reports, and historical audit artifacts.

---

## 1. What is AIR ATLAS?

**AIR ATLAS** is a real-time global climate and environmental impact tracking dashboard combining 2D geospatial maps (MapLibre GL JS) with 3D Earth visualizations (Three.js / React Three Fiber).

* **Production Frontend:** [`https://air-atlas.pages.dev`](https://air-atlas.pages.dev)
* **Production Edge API:** [`https://air-atlas-api.ayushcmd08.workers.dev`](https://air-atlas-api.ayushcmd08.workers.dev)
* **Hosting Platform:** Cloudflare Pages (Static SPA) + Cloudflare Workers (V8 Serverless Edge API)

---

## 2. Documentation Directory Structure

```text
docs/
├── README.md                  # This documentation index
└── audits/                    # Comprehensive forensic audit & test reports
    ├── AUDIT_REPORT.md        # Master production & codebase audit report
    ├── BUGS_AND_FIXES.md      # Initial bug register & remediation blueprints
    ├── DEPLOYMENT_AUDIT.md    # Initial deployment configuration audit
    ├── FINAL_TEST_RESULTS.md  # Complete 19-point testing & validation matrix
    ├── GIT_HISTORY_AUDIT.md   # Git provenance & ancestry audit
    ├── GIT_INTEGRITY_REPORT.md# Git identity, root commit & GitHub contributor audit
    ├── PERFORMANCE_REPORT.md  # Vite bundle analysis & edge latency benchmarks
    ├── PRODUCTION_HEALTH_REPORT.md # Production endpoints & browser verification
    ├── PRODUCTION_READINESS_REPORT.md # Pre-deployment readiness evaluation
    ├── REMEDIATION_REPORT.md  # Itemized code fixes & hardening report
    ├── SECURITY_AUDIT.md      # Threat model, secrets scan & dependency audit
    └── UPDATED_BUG_REGISTER.md# Final status of all identified bugs & fixes
```

---

## 3. Engineering & Architecture Documentation

Future architecture diagrams, RFCs, and integration specifications should be placed directly in subdirectories under `docs/`:
* `docs/architecture/` — System architecture, edge topology, and data flow specifications.
* `docs/api/` — OpenAPI/Swagger schemas and endpoint specifications.
* `docs/guides/` — Developer setup, contribution guidelines, and local simulation workflows.

---

## 4. Attribution & Licensing

AIR ATLAS is released under the [MIT License](file:///c:/Projects/AYUSHCMD-GITHUB/atlas/LICENSE).

The repository maintains strict compliance with open-source licensing and upstream provenance:
* **[`LICENSE`](../LICENSE)** — Dual-attribution copyright notice (Gabriel Martínez & ayushcmd).
* **[`ATTRIBUTION.md`](../ATTRIBUTION.md)** — Complete notices for the upstream project, MapLibre GL, Three.js, Recharts, Open-Meteo, and NASA Visible Earth datasets.
