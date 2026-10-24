# TerraTrend - Earth System Trend Detective

**NASA Space Apps Challenge 2026** — *Be an Earth System Trend Detective*

> Select a variable. Spin the globe. Discover what is changing, where, by how much and whether it is statistically significant.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-terratrend2.vercel.app-8b7cff?style=flat-square)](https://terratrend2.vercel.app)
[![Video Demo](https://img.shields.io/badge/Video%20Demo-YouTube-ff0000?style=flat-square&logo=youtube)](https://youtu.be/PLACEHOLDER)
[![NASA Space Apps](https://img.shields.io/badge/NASA%20Space%20Apps-2026-22e0ee?style=flat-square)](https://www.spaceappschallenge.org/)
[![Stack](https://img.shields.io/badge/Stack-Vanilla%20JS%20%2B%20Three.js-ff6fb5?style=flat-square)](#technology)

---

## Team

| Role | Name | LinkedIn |
|------|------|----------|
| Developer | Goh Sun Jin | [linkedin.com/in/gohsunjin](https://www.linkedin.com/in/gohsunjin) |
| Developer | Prabhakaran Ritish | [linkedin.com/in/prabhakaran-ritish-45286921a](https://www.linkedin.com/in/prabhakaran-ritish-45286921a) |

*The Data Detectives — NASA Space Apps 2026*

---

## The Challenge

The *Be an Earth System Trend Detective* challenge asks teams to use NASA data to answer four questions about a changing Earth:

| Question | How TerraTrend answers it |
|----------|--------------------------|
| **What** is changing? | 8 Earth science variables from NASA and NOAA missions, each with a plain-language case file |
| **Where** is it happening? | Every trend is pinned to its measurement location on a 3D globe; 20 clickable regional zones surface local stories |
| **How much** is it changing? | Sen's slope gives the rate of change per year in real units (mm, ppm, Gt, ZJ) |
| **Is it statistically significant?** | Mann-Kendall non-parametric test reports S, Z, p-value and confidence level; only trends with p < 0.05 are marked significant |

> **Why Mann-Kendall?** Unlike linear regression, Mann-Kendall is rank-based and robust to non-normal distributions and outliers — making it the standard method used by Earth scientists to detect monotonic trends in climate time series.

**NASA missions and datasets used:** GRACE-FO · Jason-3 / Sentinel-6 · OCO-2 / OCO-3 · GISS GISTEMP v4 · Terra / Aqua MODIS · NSIDC passive microwave · ICESat-2 · AIRS (Aqua) · NOAA GML Mauna Loa · NOAA NCEI / Argo Float Network

---

## Impact

TerraTrend turns decades of satellite measurements into detective stories that anyone can follow.

Every trend on this globe represents a real, measured change in an Earth system — changes that affect food security, coastal infrastructure, freshwater supply and weather patterns for billions of people. By surfacing the *key finding*, the *why it matters* narrative and the full statistical output for each variable, the app bridges the gap between raw NASA data archives and public understanding.

The target audience is anyone curious about what the data actually says: students, educators, journalists and policymakers who need to understand the science without reading technical papers.

---

## Screenshots

<p align="center">
  <img src="docs/screenshots/splash.png" alt="Launch splash screen" width="48%" />
  <img src="docs/screenshots/globe.png" alt="Interactive 3D globe with hotspot labels" width="48%" />
</p>
<p align="center">
  <img src="docs/screenshots/panel-open.png" alt="Case file panel with trend chart and Mann-Kendall statistics" width="48%" />
  <img src="docs/screenshots/mobile-panel.png" alt="Mobile view with panel open" width="22%" />
</p>

---

## How We Catch a Trend

| Step | What happens |
|------|-------------|
| **01 Select** | Choose one of eight Earth science variables measured by NASA missions or Earth system models |
| **02 Fetch** | Live data pulled from NOAA GML and Open-Meteo ERA5 APIs; curated real-measurement archives used as instant fallback |
| **03 Test** | Mann-Kendall non-parametric test computes S, Z, p-value and Sen's slope. Trend reported *significant* only when p < 0.05 |
| **04 Pin** | Every confirmed trend is anchored to the measurement location. Click anywhere on the globe to surface the regional trend at that coordinate |

---

## Variables

| Variable | NASA / Partner Mission | Live API | Record |
|----------|----------------------|---------|--------|
| Rising Seas | NASA/CNES Jason-3, Sentinel-6 | none | 1993-2023 |
| Greenland Ice Loss | NASA GRACE-FO | Open-Meteo ERA5 | 2000-2023 |
| CO2 Accumulation | NOAA GML / NASA OCO-2 | NOAA GML CSV | 1960-2023 |
| Warming Anomaly | NASA GISS GISTEMP v4 | Open-Meteo ERA5 | 1960-2023 |
| Wildfire Intensity | NASA Terra/Aqua MODIS | Open-Meteo ERA5 | 2000-2023 |
| Groundwater Decline | NASA GRACE-FO TWS | none | 2002-2023 |
| Arctic Sea Ice | NASA/NSIDC passive microwave | none | 1979-2023 |
| Ocean Heat | NOAA NCEI / Argo Float Network | none | 1993-2023 |

---

## Key Features

- **3D interactive globe** - WebGL globe with pulsing hotspot labels; clicking any label or marker opens its case file
- **Statistical significance** - Mann-Kendall test with S, Z, p-value and Sen's slope; plain-language interpretation alongside the numbers
- **Two-stage data loading** - archived JSON opens the panel instantly while a live API upgrade runs silently in the background
- **Case file panel** - NASA mission photograph, key finding callout, "Why It Matters" narrative, interactive trend chart and full source attribution
- **20 regional surface zones** - click anywhere on the globe to surface a local trend story for that coordinate
- **Explore tracker** - progress counter across all 8 variables with a completion moment when all are investigated
- **Responsive** - full mobile support with icon dock, floating panel and touch navigation
- **Earth AI assistant** *(work in progress)* - chatbot slot wired and ready for Claude API integration to explain trends in plain language

---

## Technology

- **Three.js r160** - 3D WebGL globe, self-hosted to avoid CDN blocking
- **Canvas 2D fallback** - automatic degradation when WebGL is unavailable
- **Mann-Kendall test** - implemented from scratch in `mann-kendall.js` (Mann 1945, Sen 1968); no external stats library
- **Open-Meteo ERA5** - free, CORS-enabled reanalysis API (no key required)
- **NOAA GML** - live Mauna Loa CO2 CSV
- **Vanilla JS** - zero build step, zero runtime dependencies beyond Three.js

---

## Running Locally

No build step. No dependencies to install.

```bash
# Option 1: Python
python3 -m http.server 8090
# open http://localhost:8090

# Option 2: Node
npx serve .
```

> Live API calls (NOAA, Open-Meteo) require a server context. Archived fallback data works without one.

---

## What's Next

- **Earth AI assistant** - Claude API integration to answer questions about any trend in plain language *(in progress)*
- **Animation playback** - scrub through years to watch trends evolve spatially
- **Custom dataset upload** - bring your own CSV and run Mann-Kendall on the spot

---

*Not affiliated with NASA. Built with curiosity and real Earth science data.*

**Live Demo:** https://terratrend2.vercel.app
