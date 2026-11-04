# AIR ATLAS — BUGS, VULNERABILITIES & REMEDIATION REGISTER

**Audit Date:** 2026-11-04  
**Auditor:** Antigravity AI Forensic Audit Engine  
**Project:** AIR ATLAS — Climate & Impact Global Tracker  
**Local Directory:** `C:\Projects\AYUSHCMD-GITHUB\atlas`  
**Target Repository:** `https://github.com/ayushcmd/air-atlas.git`

---

## 1. Bug & Vulnerability Register Summary

| ID | Title | Severity | Component | Status |
| :--- | :--- | :---: | :--- | :--- |
| **BUG-01** | CI Workflow Fails on Frontend Lint Step | **HIGH** | `.github/workflows/ci.yml` | Identified & Fix Defined |
| **BUG-02** | Grafana Dashboard Attempts Insecure Localhost Iframe | **MEDIUM** | `frontend/src/components/Dashboard/GrafanaDashboard.tsx` | Identified & Fix Defined |
| **BUG-03** | Dead Dependency `socket.io-client` in Frontend Manifest | **LOW** | `frontend/package.json` | Identified & Fix Defined |
| **BUG-04** | Missing Dedicated WebGL Error Boundary in 3D Globe | **LOW** | `frontend/src/components/Globe/GlobeContainer.tsx` | Identified & Fix Defined |
| **BUG-05** | Unconfigured Optional Keys Trigger Graceful Fallbacks | **INFORMATIONAL** | `worker/src/services/tiles.ts` | Documented & Validated |

---

## 2. Detailed Bug Analyses & Remediation Blueprints

---

### BUG-01: CI Workflow Fails on Frontend Lint Step

- **Finding ID:** `BUG-01`
- **Severity:** **HIGH** (Breaks automated CI/CD pipeline on GitHub Actions)
- **Affected File:** `.github/workflows/ci.yml` / `frontend/package.json`
- **Observed In:** GitHub Actions Run ID `41779051107`

#### Reproduction Steps
```bash
cd C:\Projects\AYUSHCMD-GITHUB\atlas\frontend
npm run lint
```

#### Actual Behavior
The command exits with an error code:
```text
ESLint couldn't find an eslint.config.(js|mjs|cjs) file.
From ESLint v9.0.0, the default configuration file format is now eslint.config.js.
If you'd like to use the old configuration file format, see:
https://eslint.org/docs/latest/use/configure/migration-guide#set-an-environment-variable
```

#### Root Cause Analysis
The GitHub Actions workflow `.github/workflows/ci.yml` executes `npm run lint` in the `frontend` directory. `frontend/package.json` defines `"lint": "eslint ."`. However, ESLint v9 was installed during dependencies initialization, and no flat configuration file (`eslint.config.js`) exists in `frontend/`.

#### Remediation Blueprint
Create `frontend/eslint.config.js` with TypeScript and React support, or update the script to use modern ESLint flat config.

```javascript
// frontend/eslint.config.js
import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'react': reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'react/react-in-jsx-scope': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
];
```

---

### BUG-02: Grafana Dashboard Attempts Insecure Localhost Iframe

- **Finding ID:** `BUG-02`
- **Severity:** **MEDIUM** (Triggers browser mixed-content warning in production)
- **Affected File:** `frontend/src/components/Dashboard/GrafanaDashboard.tsx` (Lines 15–18)

#### Reproduction Steps
1. Navigate to `https://air-atlas.pages.dev` in Google Chrome.
2. Click the **Analytics** / **Grafana** navigation tab.
3. Open Developer Tools (`F12`) -> Console.

#### Actual Behavior
An iframe attempts to load `http://localhost:4000`:
```text
Mixed Content: The page at 'https://air-atlas.pages.dev' was loaded over HTTPS, but requested an insecure frame 'http://localhost:4000'. This request has been blocked; the content must be served over HTTPS.
```

#### Root Cause Analysis
In `GrafanaDashboard.tsx`:
```typescript
const grafanaUrl = import.meta.env.VITE_GRAFANA_URL || 'http://localhost:4000';
```
When deployed to production without the optional `VITE_GRAFANA_URL` environment variable configured, the component defaults to unencrypted local development HTTP (`http://localhost:4000`). Browsers strictly block unencrypted iframes from secure HTTPS origins.

#### Remediation Blueprint
Update `GrafanaDashboard.tsx` to detect if `import.meta.env.VITE_GRAFANA_URL` is absent. When absent, render a clean, styled configuration placeholder instead of rendering a broken `<iframe>`.

```tsx
// Proposed update to GrafanaDashboard.tsx
export const GrafanaDashboard: React.FC = () => {
  const grafanaUrl = import.meta.env.VITE_GRAFANA_URL;

  if (!grafanaUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-400">
        <Activity className="w-16 h-16 text-emerald-500 mb-4 animate-pulse" />
        <h3 className="text-xl font-bold text-white mb-2">Dedicated Grafana Analytics Engine</h3>
        <p className="max-w-md text-sm text-slate-400 mb-6">
          Grafana embedded metrics are optional. To link your live Grafana instance, configure <code className="text-emerald-400">VITE_GRAFANA_URL</code> in your Cloudflare Pages environment variables.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <iframe src={grafanaUrl} className="w-full h-full border-0" title="Grafana Dashboard" />
    </div>
  );
};
```

---

### BUG-03: Dead Dependency `socket.io-client` in Frontend Manifest

- **Finding ID:** `BUG-03`
- **Severity:** **LOW** (Unnecessary package dependency)
- **Affected File:** `frontend/package.json`

#### Reproduction Steps
Run a code search across `frontend/src/` for `socket.io`:
```bash
git grep "socket.io" frontend/src/
# Result: 0 matches
```

#### Root Cause Analysis
During upstream refactoring to serverless Cloudflare Workers, real-time telemetry was migrated from WebSocket / Socket.IO to HTTP fetch polling in `frontend/src/hooks/useSocket.ts`. The package `"socket.io-client": "^4.7.4"` remained in `frontend/package.json`.

#### Remediation Blueprint
Uninstall or remove `socket.io-client` from `frontend/package.json`:
```bash
npm --prefix frontend uninstall socket.io-client
```

---

### BUG-04: Missing Dedicated WebGL Error Boundary in 3D Globe

- **Finding ID:** `BUG-04`
- **Severity:** **LOW** (Edge-case client resilience)
- **Affected File:** `frontend/src/components/Globe/GlobeContainer.tsx`

#### Reproduction Steps
Load the 3D globe on a legacy virtual machine or browser instance with WebGL hardware acceleration disabled.

#### Actual Behavior
The `<Canvas>` element throws a context initialization error:
```text
Error: WebGL not supported
```

#### Root Cause Analysis
`GlobeContainer.tsx` directly renders `<Canvas>` without a component-level error boundary.

#### Remediation Blueprint
Wrap the Canvas in a fallback boundary that catches context errors and renders an informational message:
`"WebGL hardware acceleration is unavailable on this device. Please use the 2D Map view."`

---

### BUG-05: Unconfigured Optional Keys Trigger Graceful Fallbacks

- **Finding ID:** `BUG-05`
- **Severity:** **INFORMATIONAL** (Expected behavior under zero-key setup)
- **Affected Components:**
  - `worker/src/services/tiles.ts`
  - `frontend/src/components/Map/MapContainer.tsx`

#### Analysis
- When `OPENWEATHERMAP_API_KEY` is not set on the Worker, `/api/tiles/*` returns a 67-byte 1x1 transparent PNG.
- When `VITE_MAPTILER_API_KEY` is not set on the Frontend, `MapContainer.tsx` falls back to CARTO Dark Matter raster tiles.
- **Verification:** Both fallbacks were tested in Chrome and verified to handle the missing keys with 100% stability. No crashes occur.
- **Remediation:** If the user wishes to view high-resolution satellite imagery or live OpenWeatherMap precipitation radar, they may optionally add these API keys in the Cloudflare Dashboard.

---

## 3. Remediation Priority Matrix

1. **P0 (Immediate):** Add `frontend/eslint.config.js` to restore green CI runs on GitHub Actions.
2. **P1 (Next Release):** Replace broken `<iframe>` in `GrafanaDashboard.tsx` with a clean fallback banner.
3. **P2 (Maintenance):** Remove `socket.io-client` from `frontend/package.json`.
4. **P3 (Hardening):** Add WebGL fallback boundary to `GlobeContainer.tsx`.
