# TerraTrend - Earth System Trend Detective

NASA Space Apps 2026 landing page. An interactive 3D Earth revealing
significant trends in NASA Earth-system data, pinned to real locations on
the globe and opened as public “case files.”

## Contents

- [Architecture](#architecture)
- [Data model](#data-model)
- [Runtime behaviour](#runtime-behaviour)
- [Design and accessibility](#design-and-accessibility)
- [Deployment](#deployment)
- [Development checklist](#development-checklist)
- [Known limitations](#known-limitations)

---

## Architecture

- **Static site, no build step.** Plain HTML + CSS + vanilla JS. `node_modules/`
  is not required.
- **Files**
  - `index.html` - document shell, views, modals.
  - `css/style.css` - Apple-inspired design tokens, dark neon-glow theme,
    responsive layout.
  - `js/data.js` - the **case-file dataset** (`HOTSPOTS`).
  - `js/regions.js` - **regional trend zones** (`REGION_ZONES`) + fallbacks.
  - `js/globe.js` - Three.js 3D globe, markers, drag rotation, click-to-scan.
  - `js/main.js` - UI wiring: cards, panel, dots, modals, ticker, reveals.
- **Asset loading order** (all `defer`): Three.js → `data.js` → `regions.js`
  → `globe.js` → `main.js`.

## Data model

### `HOTSPOTS` (per case file)
| Key | Purpose |
|-----|---------|
| `id` | slug: `sea-level`, `greenland-ice`, `co2`, `temp-anomaly`, `wildfire`, `groundwater` |
| `name` | display title |
| `icon` | emoji/indicator shown in cards, panel, ticker |
| `lat`, `lon` | globe pin position |
| `color` | 24-bit hex of the trend accent |
| `tagline` | short human line under the card title |
| `what` / `where` / `rate` / `significance` | case-file facts |
| `description` | longer, plain-language paragraph |
| `source` | data provenance |
| `trend` | `"up" | "down" | "mixed"` |
| `image`, `imageAlt` | NASA photo URL + accessibility text |

### `REGION_ZONES`
Each zone: `id`, `name`, `icon`, `bounds` (south/north/west/east), `color`,
`what`, `where`, `rate`, `significance`, `tone` (`"yes"` | `"mixed"`),
`description`, `source`. Larger boxes are intentionally sorted **after** smaller
boxes so a specific region matches before a broad ocean box.

### Fallbacks
`FALLBACK_TEMPLATES` - latitude-matching templates that activate when no zone
bounds contain the scan point. The last entry is the catch-all.

## Runtime behaviour

### Splash gate
- `#splash` is a fixed, centered LAUNCH gate.
- Clicking **Launch the globe** hides the splash, adds `app-armed` to `<body>`,
  opens the side rail, and leaves the case-file bar closed (only the ◎ toggle
  shows).

### 3D globe (`globe.js`)
- WebGL fallback overlay (`#globe-fallback`) if Three.js is blocked, WebGL is
  unavailable, or the GPU context is lost.
- Globe auto-spins; drag rotates; markers ping on hover; clicking anywhere scans
  the lat/lon and opens the matching region’s case file.

### Hotspot cards (hidden by default)
- Rendered into `<div class="hotspot-grid" id="hotspot-grid">` by
  `main.js` (until the section is removed from the page).
- Each card is a `<button>` containing:
  - a neon `card-glow` blob,
  - `card-icon`,
  - `<h3>` title,
  - `card-tag` tagline,
  - `trend-pill` label with a **subscript span** (never color alone),
  - `card-spark` mini sparkline canvas,
  - `card-rate` with a text arrow + truncated rate (e.g. `▲ +4.5`),
  - `card-photo` image,
  - `card-cta` “View on globe →”.
- Cards are appended, then `IntersectionObserver` (threshold 0.15) adds the
  `.revealed` class for the scroll reveal.

### Info panel
- Opened with `window.TerraTrendUI.openPanel(spot)`.
- Shows photo, kicker, title, tagline, `what` / `where` / `rate` / `significance`
  facts, `description`, `source`, and an interactive canvas chart of the
  hotspot’s synthetic trend series.
- Prev/next navigation updates `panel-nav-count`.

### Side rail
- Four circular tools (top→bottom): `!` (Method), 🖽 (Mission), `?` (About),
  ⛶ (Fullscreen). `!.shifted` moves the rail right when the panel is open and
  the viewport is wider than 1100 px.

### Bottom case-file bar
- Auto-hides after ~4.5 s; a fixed ◎ toggle reopens it.
- Hidden when scroll passes `0.6 × innerHeight`; `bar-open` shows it again.
- Dots inject `bar-dot` buttons from `HOTSPOTS`, each with `aria-label`.

### Modals
- `method-modal` and `about-modal` are `hidden` until opened via the side rail /
  nav buttons; backdrop click and × close, Escape closes all.

### Marquee ticker
- Two identical halves of all hotspot items slide `translateX(-50%)` for a
  seamless loop; hover pauses.

### Scroll reveal
- `IntersectionObserver` on `.step`, `.hotspot-card`, `.about-facts div`
  (threshold 0.15) adds `.revealed` when scrolled into view.

## Design and accessibility

- **Tokens** (`:root`): semantic color roles (`--bg`, `--surface`,
  `--text`, `--accent`, `--accent-2`, `--signal-warm`, …), Space Grotesk +
  IBM Plex Mono, reduced-weight text, `--focus-ring` for `:focus-visible`.
- **Trend cards are never color-alone**: `card-icon`, `trend-pill`, and
  `card-rate` (`${trendArrow(spot.trend)} ${shortRate(spot.rate)}`) provide
  symbol + text, per the Apple color guidance.
- **Reduced motion**: `@media (prefers-reduced-motion: reduce)` disables
  animations/transitions and the ticker/aurora scroll cues.
- **Touch / pointer**: `touch-action: pan-y` on the panel chart; `pointermove`
  tooltips on hot spots; cards are keyboard-focusable `<button>`s.

## Deployment

- Lowered from a GitHub Pages-adjacent setup to **Vercel**.
  - Repo remote: `https://github.com/love98ed/TerraTrend.git`
  - Live demo: `https://terratrend.vercel.app`
- No build step or package dependencies; Vercel serves the static files as-is.
- Local dev: `python3 -m http.server 8090` then `http://localhost:8090`.

## Development checklist

- `node --check js/main.js`
- `node --check js/data.js`
- `node --check js/regions.js`
- `node --check js/globe.js`
- Visual check in a browser (no server here in the sandbox).

## Known limitations

- The TREND FILES section is disabled: `index.html` no longer contains the
  `#hotspots-section`, and `main.js` no longer mounts hotspot cards - so the
  trends section is intentionally hidden and inert.
- The side-rail method/about buttons no longer carry the `?` glyph; they are
  `!` and `?` respectively (per the user’s final request).
- Visual verification (screenshots / browser) was not run in this environment.
