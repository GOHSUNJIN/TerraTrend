/* ============================================================
   TerraTrend — hotspot dataset
   Each entry is a "case file" pinned to a real-world location.
   lat/lon place the marker on the 3D globe.
   ============================================================ */

const HOTSPOTS = [
  {
    id: "sea-level",
    name: "Rising Seas",
    icon: "🌊",
    lat: 8.5,
    lon: -75.0,
    color: 0x2fa8ff,
    tagline: "The ocean is climbing, and it isn't stopping.",
    what: "Global mean sea level",
    where: "Global — fastest near the tropical western Pacific & Caribbean",
    rate: "≈ +4.5 mm per year (and accelerating)",
    significance: "Yes — >99% confidence over the satellite record",
    significanceTone: "high",
    description:
      "Satellite altimeters have tracked sea surface height since 1993. The rate has roughly doubled from the 20th-century average, driven by thermal expansion and meltwater from land ice. Some Pacific islands see 2–3× the global average.",
    source: "NASA/CNES Jason-3, Sentinel-6 Michael Freilich",
    trend: "up"
  },
  {
    id: "greenland-ice",
    name: "Greenland Ice Loss",
    icon: "🧊",
    lat: 72.0,
    lon: -40.0,
    color: 0x8be9ff,
    tagline: "An ice sheet shedding mass at hundreds of gigatonnes a year.",
    what: "Ice sheet mass",
    where: "Greenland — heaviest loss along peripheral glaciers",
    rate: "≈ −270 gigatonnes per year",
    significance: "Yes — GRACE & GRACE-FO agree across 20+ years",
    significanceTone: "high",
    description:
      "The GRACE missions weigh the ice sheet by measuring tiny changes in Earth's gravity field. Greenland's mass loss has accelerated since the early 2000s and is now a leading contributor to sea level rise.",
    source: "NASA GRACE / GRACE Follow-On",
    trend: "down"
  },
  {
    id: "co2",
    name: "CO₂ Accumulation",
    icon: "🏭",
    lat: -5.0,
    lon: 120.0,
    color: 0xffb84d,
    tagline: "A greenhouse gas curve that keeps steepening.",
    what: "Atmospheric CO₂ concentration",
    where: "Global — strongest gradients near industrial & biomass regions",
    rate: "≈ +2.4 ppm per year",
    significance: "Yes — continuous record since 1958 (Keeling Curve)",
    significanceTone: "high",
    description:
      "OCO-2 maps CO₂ from space while Mauna Loa provides the longest continuous record. The annual growth rate has climbed from ~0.8 ppm/yr in the 1960s to well over 2 ppm/yr today.",
    source: "NASA OCO-2 · NOAA Global Monitoring Lab",
    trend: "up"
  },
  {
    id: "temp-anomaly",
    name: "Warming Anomaly",
    icon: "🌡️",
    lat: 45.0,
    lon: 40.0,
    color: 0xff6b6b,
    tagline: "Every decade warmer than the last.",
    what: "Global temperature anomaly",
    where: "Global — amplified at the Arctic (Arctic amplification)",
    rate: "≈ +0.2 °C per decade",
    significance: "Yes — far outside natural variability",
    significanceTone: "high",
    description:
      "The Arctic warms several times faster than the global average — the same process can push one region's trend up faster than another's, exactly the kind of contrast the challenge asks detectives to spot.",
    source: "NASA GISS GISTEMP v4 · NOAA",
    trend: "up"
  },
  {
    id: "wildfire",
    name: "Wildfire Intensity",
    icon: "🔥",
    lat: -8.0,
    lon: -55.0,
    color: 0xff8c42,
    tagline: "Fire seasons growing longer, hotter, and harder to contain.",
    what: "Fire Radiative Power & burned area",
    where: "Amazon, boreal Canada & Siberia, Australia",
    rate: "Regional fire seasons lengthening by weeks",
    significance: "Mixed — rising in some regions, declining in others",
    significanceTone: "mixed",
    description:
      "MODIS and VIIRS detect every fire on Earth daily. Burned area is falling in African savannas while extreme fire behavior rises in forests — the same process, opposite regional trends.",
    source: "NASA MODIS / VIIRS active fire products",
    trend: "mixed"
  },
  {
    id: "groundwater",
    name: "Groundwater Decline",
    icon: "💧",
    lat: 28.0,
    lon: 72.0,
    color: 0x6ee7b7,
    tagline: "Aquifers draining faster than rain can refill them.",
    what: "Terrestrial water storage",
    where: "NW India, California's Central Valley, Middle East",
    rate: "Several cm/year water-equivalent loss",
    significance: "Yes — strong multi-year GRACE signal",
    significanceTone: "high",
    description:
      "GRACE-FO senses water moving through the ground. Some of Earth's largest aquifers show sustained decline — a falling trend invisible at the surface but unmistakable from orbit.",
    source: "NASA GRACE-FO terrestrial water storage",
    trend: "down"
  }
];
