/* ============================================================
   TerraTrend - data layer
   Live sources (CORS-enabled, no auth required):
     CO₂         → NOAA GML Mauna Loa annual CSV
     Temperature  → Open-Meteo ERA5 reanalysis (any lat/lon)
     Greenland    → Open-Meteo ERA5 at Greenland (local warming)
     Wildfire     → Open-Meteo precipitation anomaly at Amazon
                    (drought proxy for fire risk)
   Archived (curated real measurements):
     Sea level    → NASA/CNES Jason-3 / Sentinel-6 altimetry
     Groundwater  → NASA GRACE-FO terrestrial water storage
   ============================================================ */

window.TerraTrendData = (function () {
  "use strict";

  const OPEN_METEO = "https://archive-api.open-meteo.com/v1/archive";
  const NOAA_CO2   = "https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_annmean_mlo.csv";
  const START = "2000-01-01", END = "2023-12-31";

  const FALLBACK = {
    "co2":           "co2.json",
    "temp-anomaly":  "temperature.json",
    "sea-level":     "sea-level.json",
    "greenland-ice": "ice.json",
    "groundwater":   "groundwater.json",
    "wildfire":      "wildfire.json",
    "arctic-ice":    "arctic-ice.json",
    "ocean-heat":    "ocean-heat.json"
  };

  const memCache = {};

  /* Fetch with hard timeout */
  async function tFetch(url, ms) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms || 7000);
    try {
      const r = await fetch(url, { signal: ctrl.signal });
      clearTimeout(t);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r;
    } finally { clearTimeout(t); }
  }

  /* ---------- Live: NOAA GML CO₂ ---------- */
  async function liveCO2() {
    const r   = await tFetch(NOAA_CO2, 7000);
    const txt = await r.text();
    const series = [];
    for (const line of txt.split("\n")) {
      if (line.startsWith("#") || !line.trim()) continue;
      const [y, v] = line.trim().split(",");
      const year = parseInt(y), val = parseFloat(v);
      if (!isNaN(year) && !isNaN(val) && year >= 2000 && year <= 2023)
        series.push({ year, value: +val.toFixed(2) });
    }
    if (series.length < 10) throw new Error("CO₂: too few rows");
    return {
      series,
      label: "CO₂ (ppm)",
      unit: "ppm",
      source: "NOAA GML Mauna Loa Observatory (live)"
    };
  }

  /* ---------- Live: Open-Meteo ERA5 daily → yearly mean ---------- */
  async function liveOpenMeteo(lat, lon, variable, label, unit, sourceName) {
    const url = `${OPEN_METEO}?latitude=${lat}&longitude=${lon}` +
                `&start_date=${START}&end_date=${END}` +
                `&daily=${variable}&timezone=UTC`;
    const r    = await tFetch(url, 10000);
    const data = await r.json();
    const times = data.daily?.time;
    const vals  = data.daily?.[variable];
    if (!times || !vals) throw new Error("Open-Meteo: unexpected shape");

    /* Aggregate daily → yearly mean */
    const buckets = {};
    times.forEach((t, i) => {
      if (vals[i] === null) return;
      const y = t.slice(0, 4);
      if (!buckets[y]) buckets[y] = [];
      buckets[y].push(vals[i]);
    });
    const series = Object.keys(buckets)
      .sort()
      .filter(y => parseInt(y) >= 2000 && parseInt(y) <= 2023)
      .map(y => ({
        year: parseInt(y),
        value: +(buckets[y].reduce((a, b) => a + b, 0) / buckets[y].length).toFixed(3)
      }));

    if (series.length < 10) throw new Error("Open-Meteo: too few years");
    return { series, label, unit, source: sourceName + " via Open-Meteo ERA5 (live)" };
  }

  /* ---------- Curated fallback ---------- */
  async function curated(id) {
    const file = FALLBACK[id];
    if (!file) throw new Error(`No fallback for "${id}"`);
    const r  = await fetch(`data/fallback/${file}`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }

  /* ---------- Build result with MK ---------- */
  function withMK(raw, isLive) {
    const series = raw.series || [];
    const mk = (window.MannKendall && series.length >= 4)
      ? window.MannKendall.test(series.map(p => p.value))
      : null;
    return { series, label: raw.label, unit: raw.unit || "", source: raw.source, isLive, mkResult: mk };
  }

  /* ---------- Public: load(hotspot) ----------
     Strategy: try live source, fall back to curated JSON.
     Shows curated data instantly, upgrades silently on success. */
  async function load(hotspot) {
    const id = hotspot.id;
    if (memCache[id]) return memCache[id];

    let live = null;
    try {
      if (id === "co2") {
        live = await liveCO2();
      } else if (id === "temp-anomaly") {
        live = await liveOpenMeteo(
          hotspot.lat, hotspot.lon,
          "temperature_2m_mean",
          "Temperature 2m (°C)", "°C",
          "ECMWF ERA5 reanalysis"
        );
      } else if (id === "greenland-ice") {
        live = await liveOpenMeteo(
          hotspot.lat, hotspot.lon,
          "temperature_2m_mean",
          "Greenland surface temp (°C)", "°C",
          "ECMWF ERA5 reanalysis – Greenland"
        );
      } else if (id === "wildfire") {
        live = await liveOpenMeteo(
          hotspot.lat, hotspot.lon,
          "precipitation_sum",
          "Amazon precipitation (mm/yr)", "mm",
          "ECMWF ERA5 reanalysis – Amazon basin"
        );
      }
    } catch (e) {
      live = null;
    }

    let result;
    if (live) {
      result = withMK(live, true);
    } else {
      try {
        const fb = await curated(id);
        result = withMK({ series: fb.series, label: fb.label, unit: fb.unit, source: fb.source }, false);
      } catch {
        result = withMK({ series: [], label: hotspot.what, unit: "", source: hotspot.source }, false);
      }
    }

    memCache[id] = result;
    return result;
  }

  /* Instant curated load - called first so the panel opens without waiting */
  async function loadCurated(hotspot) {
    try {
      const fb = await curated(hotspot.id);
      return withMK({ series: fb.series, label: fb.label, unit: fb.unit, source: fb.source }, false);
    } catch {
      return null;
    }
  }

  return { load, loadCurated };
})();
