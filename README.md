# ◎ TerraTrend — Earth System Trend Detective

**2026 NASA Space Apps Challenge** · Challenge: *Be an Earth System Trend Detective*

> Select a variable. Spin the globe. Discover what is changing, where, how much, and whether it is statistically significant.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-terratrend.vercel.app-8b7cff?style=flat-square)](https://terratrend.vercel.app)
[![NASA Space Apps](https://img.shields.io/badge/NASA%20Space%20Apps-2026-22e0ee?style=flat-square)](https://www.spaceappschallenge.org/)
[![Static Site](https://img.shields.io/badge/Stack-Vanilla%20JS%20%2B%20Three.js-ff6fb5?style=flat-square)](#technology)

---

## The Challenge

The 2026 NASA Space Apps Challenge asks: *what is changing on Earth, where is it happening, how much is it changing, and is it statistically significant?*

TerraTrend answers those four questions at once — by pulling real NASA and NOAA measurements, running the Mann-Kendall non-parametric trend test on each time series, and pinning every statistically significant result to the exact location on a 3D globe where it was recorded.

---

## Screenshots

<p align="center">
  <img src="docs/screenshots/splash.png" alt="Launch splash screen" width="45%" />
  <img src="docs/screenshots/globe.png" alt="Interactive 3D globe" width="45%" />
</p>

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        TerraTrend  ◎                           │
│                     (Static Web App)                            │
└─────────────────┬───────────────────────────┬───────────────────┘
                  │                           │
        ┌─────────▼─────────┐     ┌───────────▼───────────┐
        │   Data Layer       │     │   Rendering Layer      │
        │  (nasa-data.js)    │     │   (globe.js / globe-   │
        │                   │     │    2d.js + Three.js)    │
        │ ┌───────────────┐ │     │                        │
        │ │  Live Sources  │ │     │  ┌──────────────────┐  │
        │ │               │ │     │  │  3D WebGL Globe   │  │
        │ │ NOAA GML CO₂  │ │     │  │  (Three.js r160)  │  │
        │ │ Open-Meteo    │ │     │  │  - Earth texture  │  │
        │ │ ERA5 reanalysis│ │     │  │  - Atmosphere     │  │
        │ └───────────────┘ │     │  │  - Hotspot markers│  │
        │ ┌───────────────┐ │     │  │  - Click-to-ping  │  │
        │ │ Fallback JSON  │ │     │  └──────────────────┘  │
        │ │               │ │     │  ┌──────────────────┐  │
        │ │ co2.json       │ │     │  │  2D Canvas Mode   │  │
        │ │ sea-level.json │ │     │  │  (WebGL fallback) │  │
        │ │ ice.json       │ │     │  └──────────────────┘  │
        │ │ temperature.json│ │     └───────────────────────┘
        │ │ groundwater.json│ │
        │ │ wildfire.json  │ │     ┌───────────────────────┐
        │ └───────────────┘ │     │   Statistics Layer     │
        └─────────┬─────────┘     │  (mann-kendall.js)     │
                  │               │                        │
                  │               │  Input: time series    │
        ┌─────────▼─────────┐     │  Output:               │
        │  UI Layer          │     │  · S statistic         │
        │  (main.js)         │     │  · Z score             │
        │                   │◄────│  · p-value             │
        │ · Variable pills   │     │  · Sen's slope         │
        │ · Info panel       │     │  · Significant?        │
        │ · Trend chart      │     └───────────────────────┘
        │ · Mann-Kendall UI  │
        │ · Live ticker      │     ┌───────────────────────┐
        │ · Chatbot (soon)   │     │   Region Layer         │
        └───────────────────┘     │  (regions.js)          │
                                  │                        │
                                  │  Maps any lat/lon →    │
                                  │  nearest hotspot zone  │
                                  │  (surface click)       │
                                  └───────────────────────┘
```

### Data Flow

```
User clicks "Launch"
        │
        ▼
Globe initialises (Three.js or 2D fallback)
        │
        ▼
User selects variable pill  ──► Globe flies to hotspot location
        │
        ▼
loadCurated(spot)  ──── Instant: archived JSON from /data/fallback/
        │
        ▼
Info panel opens with curated data + MK stats
        │
        ▼  (background)
load(spot) attempts live API
  ├── NOAA GML CSV  (CO₂)
  └── Open-Meteo ERA5  (temperature, ice, wildfire)
        │
        ▼
If live succeeds → panel upgrades silently, ticker updates
If live fails   → stays on archived data (labelled ARCHIVED DATA)
```

---

## How We Catch a Trend

| Step | What happens |
|------|-------------|
| **01 Select** | Choose one of six Earth science variables measured by NASA missions or Earth system models |
| **02 Fetch** | Live data pulled from NOAA GML and Open-Meteo ERA5 APIs; curated real-measurement archives used as instant fallback |
| **03 Test** | Mann-Kendall non-parametric test computes S, Z, p-value, and Sen's slope. Trend reported *significant* only when p < 0.05 |
| **04 Pin** | Every confirmed trend is anchored to the measurement location. Click anywhere on the globe to surface the regional trend at that coordinate |

---

## Variables

| Variable | Data Source | Live API | Archive |
|----------|------------|---------|---------|
| 🌊 Rising Seas | NASA/CNES Jason-3, Sentinel-6 | — | `sea-level.json` |
| 🧊 Greenland Ice | GRACE-FO + ERA5 reanalysis | Open-Meteo | `ice.json` |
| 🏭 CO₂ Accumulation | NOAA GML Mauna Loa | NOAA GML CSV | `co2.json` |
| 🌡️ Warming Anomaly | ECMWF ERA5 reanalysis | Open-Meteo | `temperature.json` |
| 🔥 Wildfire Risk | ECMWF ERA5 Amazon precip | Open-Meteo | `wildfire.json` |
| 💧 Groundwater | NASA GRACE-FO TWS | — | `groundwater.json` |

---

## Technology

- **Three.js r160** — 3D WebGL globe, self-hosted so no CDN blocking issues
- **Canvas 2D fallback** — automatic degradation when WebGL is unavailable (remote desktop, GPU blocklisted)
- **Mann-Kendall test** — non-parametric trend detection; same method used by Earth scientists
- **Open-Meteo ERA5** — free, CORS-enabled reanalysis API (no key required)
- **NOAA GML** — live Mauna Loa CO₂ data
- **Vanilla JS** — zero build step, zero runtime dependencies beyond Three.js

### Performance choices

| Problem | Solution |
|---------|---------|
| Full-width `backdrop-filter` every frame | Removed from header; replaced with gradient fade |
| Moving starfield at 60 fps | Static radial-gradient layers |
| Nebula scale animation invalidating GPU cache | Translate-only keyframes (no `scale`) |
| `MeshStandardMaterial` PBR cost | `MeshPhongMaterial` (~2× faster fragment shader) |
| Frame overrun at 60 fps during auto-spin | 20 fps idle / 5 fps when panel open / 60 fps on drag |
| Pixel ratio on HiDPI | Capped at 1.5 (saves ~55% GPU pixels vs native 2×) |

---

## Project Structure

```
TerraTrend/
├── index.html              # Single-page app shell
├── favicon.svg             # SVG favicon (◎ brand mark)
├── css/
│   └── style.css           # All styles (dark neon-glow design)
├── js/
│   ├── data.js             # HOTSPOTS and REGION_ZONES definitions
│   ├── regions.js          # findRegionForPoint() surface-click resolver
│   ├── mann-kendall.js     # MannKendall.test() — S, Z, p, Sen's slope
│   ├── nasa-data.js        # Data layer: live APIs + fallback JSON
│   ├── globe.js            # Three.js 3D globe (WebGL path)
│   ├── globe-2d.js         # Canvas 2D globe (fallback path)
│   ├── main.js             # UI wiring: pills, panel, chart, ticker
│   └── vendor/
│       └── three.min.js    # Three.js r160 (self-hosted)
├── data/
│   └── fallback/           # Curated real-measurement JSON archives
│       ├── co2.json
│       ├── sea-level.json
│       ├── ice.json
│       ├── temperature.json
│       ├── groundwater.json
│       └── wildfire.json
└── fonts/                  # Self-hosted woff2 (Space Grotesk + IBM Plex Mono)
```

---

## Running Locally

No build step. No dependencies to install.

```bash
# Option 1: Python
python3 -m http.server 8090
# open http://localhost:8090

# Option 2: Node
npx serve .

# Option 3: Open index.html directly in a modern browser
```

> **Note:** Live API calls (NOAA, Open-Meteo) require a server context (not `file://`). Archived fallback data works without a server.

---

## What's Next (Roadmap)

- **Earth AI assistant** — chatbot placeholder wired, ready for Claude API integration to explain trends in plain language
- **More variables** — ocean heat content, Arctic sea ice extent, deforestation index
- **Animation playback** — scrub through years to watch trends evolve spatially
- **Custom region upload** — bring your own CSV and run Mann-Kendall on the spot

---

## Team

Built for the **2026 NASA Space Apps Challenge** with real NASA and NOAA Earth science data.

*Not affiliated with NASA. Built with curiosity.*

**Live Demo:** https://terratrend.vercel.app
