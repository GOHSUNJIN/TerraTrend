/* ============================================================
   TerraTrend — data layer
   Tries live NASA / NOAA APIs first; falls back to curated
   real-data JSON files. Emits events so the UI can show a
   LIVE vs ARCHIVED badge and never blocks the page.

   Live sources:
     Temperature  → NASA POWER API (larc.nasa.gov)
     CO₂          → NOAA GML annual CSV (gml.noaa.gov)
   Archived fallback: data/fallback/<id>.json (real values)
   ============================================================ */

window.TerraTrendData = (function () {
  "use strict";

  /* Map hotspot id → fallback JSON filename */
  const FALLBACK_FILES = {
    "co2":           "co2.json",
    "temp-anomaly":  "temperature.json",
    "sea-level":     "sea-level.json",
    "greenland-ice": "ice.json",
    "groundwater":   "groundwater.json",
    "wildfire":      "wildfire.json"
  };

  /* Cache so we only fetch once per id */
  const cache = {};

  /* Fetch a JSON file relative to the page root */
  async function fetchJSON(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }

  /* ---- Live source: NASA POWER API (temperature) ---- */
  async function fetchNASAPower(lat, lon, startYear, endYear) {
    const url =
      `https://power.larc.nasa.gov/api/temporal/annual/point` +
      `?parameters=T2M&community=RE` +
      `&latitude=${lat}&longitude=${lon}` +
      `&start=${startYear}&end=${endYear}&format=JSON`;
    const data = await fetchJSON(url);
    const raw = data?.properties?.parameter?.T2M;
    if (!raw) throw new Error("Unexpected POWER API shape");
    return Object.entries(raw)
      .filter(([y, v]) => v !== -999) // POWER uses -999 for missing
      .map(([y, v]) => ({ year: +y, value: +v.toFixed(3) }))
      .sort((a, b) => a.year - b.year);
  }

  /* ---- Live source: NOAA GML CO₂ CSV ---- */
  async function fetchNOAACO2() {
    const url = "https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_annmean_mlo.csv";
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const text = await r.text();
    const series = [];
    for (const line of text.split("\n")) {
      if (line.startsWith("#") || !line.trim()) continue;
      const parts = line.trim().split(",");
      if (parts.length < 2) continue;
      const year = parseInt(parts[0], 10);
      const value = parseFloat(parts[1]);
      if (!isNaN(year) && !isNaN(value) && year >= 2000) {
        series.push({ year, value: +value.toFixed(2) });
      }
    }
    if (series.length < 10) throw new Error("Insufficient CO₂ data");
    return series;
  }

  /* ---- Load the curated fallback JSON for an id ---- */
  async function fetchFallback(id) {
    const file = FALLBACK_FILES[id];
    if (!file) throw new Error(`No fallback for "${id}"`);
    return fetchJSON(`data/fallback/${file}`);
  }

  /* ---- Public API ---- */

  /**
   * load(hotspot)
   * Returns { series, label, unit, source, isLive, mkResult }
   * Always resolves — falls back to curated data on any error.
   */
  async function load(hotspot) {
    const id = hotspot.id;
    if (cache[id]) return cache[id];

    let series = null;
    let isLive = false;
    let liveSource = null;
    let fallbackMeta = null;

    /* Try live API */
    try {
      if (id === "temp-anomaly") {
        series = await fetchNASAPower(hotspot.lat, hotspot.lon, 2000, 2023);
        isLive = true;
        liveSource = "NASA POWER API (live)";
      } else if (id === "co2") {
        series = await fetchNOAACO2();
        isLive = true;
        liveSource = "NOAA GML API (live)";
      }
    } catch (_) {
      series = null;
    }

    /* Fall back to curated JSON */
    if (!series || series.length < 4) {
      try {
        const fb = await fetchFallback(id);
        series = fb.series;
        fallbackMeta = { label: fb.label, unit: fb.unit, source: fb.source };
        isLive = false;
      } catch (err) {
        console.warn("TerraTrendData: all sources failed for", id, err);
        series = [];
      }
    }

    /* Run Mann-Kendall */
    const values = series.map(p => p.value);
    const mkResult = window.MannKendall ? window.MannKendall.test(values) : null;

    const result = {
      series,
      label: fallbackMeta?.label || hotspot.what,
      unit:  fallbackMeta?.unit  || "",
      source: isLive ? liveSource : (fallbackMeta?.source || hotspot.source),
      isLive,
      mkResult
    };

    cache[id] = result;
    return result;
  }

  /* Prefetch all hotspots in the background after page loads */
  function prefetchAll(hotspots) {
    if (!hotspots || !hotspots.length) return;
    // Stagger to avoid hammering APIs simultaneously
    hotspots.forEach((h, i) => {
      setTimeout(() => load(h).catch(() => {}), i * 400);
    });
  }

  return { load, prefetchAll };
})();
