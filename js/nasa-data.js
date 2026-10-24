/* ============================================================
   TerraTrend — data layer
   Loads curated real-measurement JSON (NOAA, NASA GRACE,
   GISTEMP, Jason-3 altimetry) and runs Mann-Kendall.
   Data is always available instantly — no network dependency
   on the critical path.
   ============================================================ */

window.TerraTrendData = (function () {
  "use strict";

  const FALLBACK_FILES = {
    "co2":           "co2.json",
    "temp-anomaly":  "temperature.json",
    "sea-level":     "sea-level.json",
    "greenland-ice": "ice.json",
    "groundwater":   "groundwater.json",
    "wildfire":      "wildfire.json"
  };

  const cache = {};

  async function loadFallback(id) {
    const file = FALLBACK_FILES[id];
    if (!file) throw new Error(`No data file for "${id}"`);
    const r = await fetch(`data/fallback/${file}`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }

  async function load(hotspot) {
    const id = hotspot.id;
    if (cache[id]) return cache[id];

    let series = [], meta = {};
    try {
      const fb = await loadFallback(id);
      series = fb.series || [];
      meta   = { label: fb.label, unit: fb.unit, source: fb.source };
    } catch (err) {
      console.warn("TerraTrendData: could not load data for", id, err);
    }

    const mk = (window.MannKendall && series.length >= 4)
      ? window.MannKendall.test(series.map(p => p.value))
      : null;

    const result = {
      series,
      label:  meta.label  || hotspot.what,
      unit:   meta.unit   || "",
      source: meta.source || hotspot.source,
      isLive: false,
      mkResult: mk
    };

    cache[id] = result;
    return result;
  }

  return { load };
})();
