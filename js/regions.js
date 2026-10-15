/* ============================================================
   TerraTrend — regional trend zones
   Each zone: lat/lon box [south, north, west, east] on the globe.
   Click inside the box → that zone's trend story opens.
   For big regions the box covers the whole area; clicking the
   exact country is still matched (boxes can overlap smaller ones).
   ============================================================ */

const REGION_ZONES = [
  // ---------- ICE / CRYOSPHERE ----------
  {
    id: "greenland",
    name: "Greenland Ice Sheet",
    icon: "🧊",
    bounds: [59, 84, -75, -10],           // [s, n, w, e]
    color: 0x8be9ff,
    what: "Ice sheet mass balance",
    where: "Greenland — fastest loss at peripheral outlet glaciers",
    rate: "≈ −270 gigatonnes of ice per year",
    significance: "YES — GRACE & GRACE-FO agree across 20+ yrs",
    tone: "yes",
    description:
      "The GRACE satellites literally weigh the ice sheet by tracking tiny shifts in Earth's gravity field. Greenland's losses have accelerated since the early 2000s, and meltwater from it is now one of the largest single contributors to global sea level rise.",
    source: "NASA GRACE / GRACE Follow-On"
  },
  {
    id: "arctic-sea-ice",
    name: "Arctic Sea Ice",
    icon: "❄️",
    bounds: [66, 90, -180, 180],
    color: 0xbfe9ff,
    what: "September sea-ice extent",
    where: "Central Arctic Ocean",
    rate: "≈ −13% per decade vs 1981–2010 average",
    significance: "YES — strongest land-sea contrast on Earth",
    tone: "yes",
    description:
      "Every summer the Arctic cap shrinks, and the summer minimum has fallen dramatically since satellite records began in 1979. Older, thicker multi-year ice is being replaced by thin seasonal ice that melts more easily — a reinforcing loop.",
    source: "NASA NSIDC · passive microwave record"
  },
  {
    id: "antarctica",
    name: "Antarctic Ice",
    icon: "🐧",
    bounds: [-90, -60, -180, 180],
    color: 0xa8d8ff,
    what: "Ice sheet mass & ice-shelf stability",
    where: "West Antarctica — Amundsen Sea sector (Thwaites)",
    rate: "≈ −150 gigatonnes per year, concentrated in the west",
    significance: "YES — sustained trend since the 1990s",
    tone: "yes",
    description:
      "West Antarctic glaciers are grounded below sea level and exposed to warm Circumpolar Deep Water, so the same process that stabilizes East Antarctica drives rapid loss in the west — opposite trends on one continent.",
    source: "NASA ICESat-2 · GRACE-FO · Operation IceBridge"
  },

  // ---------- LAND REGIONS ----------
  {
    id: "north-america-wildfire",
    name: "North American Wildfire",
    icon: "🔥",
    bounds: [31, 70, -130, -60],
    color: 0xff8c42,
    what: "Burned area & fire radiative power",
    where: "Western US & boreal Canada",
    rate: "Fire seasons weeks longer than in the 1970s–80s",
    significance: "MIXED — steep rise in forests, decline in some grasslands",
    tone: "mixed",
    description:
      "MODIS and VIIRS satellites detect every fire on the continent daily. Warmer, drier summers have lengthened fire seasons and boosted extreme fire behavior, while burned area in some shrub and grass systems has actually declined — a perfect detective contrast.",
    source: "NASA MODIS / VIIRS active fire products"
  },
  {
    id: "amazon",
    name: "Amazon Rainforest",
    icon: "🌳",
    bounds: [-20, 6, -75, -45],
    color: 0x35d07f,
    what: "Forest cover & fire activity",
    where: "Brazilian Amazon 'arc of deforestation'",
    rate: "Deforestation pulses; fire counts spike in drought years",
    significance: "MIXED — protection policies vs drought & fire feedback",
    tone: "mixed",
    description:
      "The Amazon sits near a tipping point: deforestation and drought dry the forest, drying feeds fire, and fire pushes more clearing. GEDI and ICESat-2 now track canopy height loss from orbit, while some years show sharp recovery when enforcement strengthens.",
    source: "NASA GEDI · ICESat-2 · MODIS"
  },
  {
    id: "sahara-sahel",
    name: "Sahel & Sahara Greening",
    icon: "🏜️",
    bounds: [10, 30, -17, 35],
    color: 0xffd166,
    what: "Vegetation index & rainfall",
    where: "Sahel belt south of the Sahara",
    rate: "Seasonal greening trends vary; multi-decadal seesaw",
    significance: "MIXED — wetting Sahel vs deepening Sahara interior",
    tone: "mixed",
    description:
      "A detective's favorite: the same monsoon system that dried the Sahel in the 1970s–80s has partially recovered, and satellite greening shows vegetation pushing north — yet the Sahara's deep interior stays one of Earth's most stable climatological zones.",
    source: "NASA MODIS NDVI · GPM rainfall"
  },
  {
    id: "india-groundwater",
    name: "NW India Groundwater",
    icon: "💧",
    bounds: [22, 32, 68, 82],
    color: 0x6ee7b7,
    what: "Terrestrial water storage",
    where: "Indus & Ganges basins, NW India + Pakistan",
    rate: "One of the fastest aquifer declines measured from orbit",
    significance: "YES — strong multi-year GRACE signal",
    tone: "yes",
    description:
      "GRACE-FO senses water moving through the ground. Pumping for irrigation drains the aquifer faster than monsoon rain can refill it — a falling trend invisible at the surface but unmistakable from 490 km up.",
    source: "NASA GRACE-FO terrestrial water storage"
  },
  {
    id: "middle-east-water",
    name: "Middle East Water Stress",
    icon: "🏞️",
    bounds: [12, 40, 34, 63],
    color: 0xd4a94a,
    what: "Freshwater storage & drought extent",
    where: "Tigris–Euphrates basin & Arabian Peninsula",
    rate: "Sustained multi-year storage decline",
    significance: "YES — GRACE detects multi-year droughts",
    tone: "yes",
    description:
      "GRACE watched the 2007–2017 drought drain the Tigris–Euphrates basin faster than any comparable period in the record — part climate, part pumping. Reservoir maps from MODIS show the same story from the surface.",
    source: "NASA GRACE-FO · MODIS reservoir products"
  },
  {
    id: "china-north",
    name: "North China Groundwater",
    icon: "🚜",
    bounds: [32, 43, 105, 123],
    color: 0x9fbf6a,
    what: "North China Plain water table",
    where: "Hebei / Shandong / Henan plains",
    rate: "Among the fastest aquifer declines globally",
    significance: "YES — decade-scale GRACE decline",
    tone: "yes",
    description:
      "The North China Plain grows a huge share of the nation's wheat with water pumped from deep aquifers. GRACE shows the storage trend running consistently downward since 2002 — a supply problem measured in cubic kilometers.",
    source: "NASA GRACE-FO"
  },
  {
    id: "australia",
    name: "Australia Drought & Fire",
    icon: "🦘",
    bounds: [-44, -10, 112, 155],
    color: 0xe07850,
    what: "Drought extent & fire weather",
    where: "Southeast Australia — Murray–Darling Basin",
    rate: "Longer droughts; fire weather seasons extending",
    significance: "MIXED — wetter north vs drier southeast",
    tone: "mixed",
    description:
      "The same continent carries opposite trends: tropical north greening under stronger monsoon rains while the southeast endures record drought and the 2019–20 Black Summer fires. Opposite directions, one island — exactly the detective contrast the challenge wants.",
    source: "NASA MODIS · TRMM/GPM · GRACE-FO"
  },
  {
    id: "california",
    name: "California Water",
    icon: "🌴",
    bounds: [32, 42, -125, -114],
    color: 0x4fd1c5,
    what: "Central Valley groundwater & snowpack",
    where: "Central Valley aquifer + Sierra Nevada snow",
    rate: "Major storage losses in 2012–16 & 2020–22 droughts",
    significance: "YES — GRACE resolves the valley from orbit",
    tone: "yes",
    description:
      "GRACE can see California's Central Valley shrink as an aquifer. Meanwhile Sierra snowpack — a natural reservoir for 30 million people — shows declining trends, shifting the state's water timing earlier each spring.",
    source: "NASA GRACE-FO · Airborne Snow Observatory"
  },
  {
    id: "siberia",
    name: "Siberian Permafrost",
    icon: "🥶",
    bounds: [50, 75, 55, 180],
    color: 0x88aaff,
    what: "Permafrost extent & boreal fire",
    where: "Siberian lowlands & taiga",
    rate: "Ground thawing; fire counts rising in boreal forests",
    significance: "YES — clear multi-decadal thaw signal",
    tone: "yes",
    description:
      "Permafrost that stayed frozen for millennia is thawing, releasing stored carbon and buckling infrastructure, while boreal fires — visible to MODIS/VIIRS — burn areas that historically rarely burned.",
    source: "NASA MODIS · ICESat-2 · SMAP"
  },
  {
    id: "europe",
    name: "European Heat & Drought",
    icon: "🌡️",
    bounds: [35, 60, -10, 40],
    color: 0xffb84d,
    what: "Summer heat extremes & soil moisture",
    where: "Mediterranean & central Europe",
    rate: "Heat waves intensifying faster than global average",
    significance: "MIXED — drying south vs variable north",
    tone: "mixed",
    description:
      "Europe is a global hot spot for summer heat amplification. Soil moisture from SMAP and GRACE-FO shows the Mediterranean side drying while some northern areas stay wet — a gradient the detective can map within one continent.",
    source: "NASA SMAP · GRACE-FO · MODIS"
  },
  {
    id: "tibet",
    name: "Tibetan Plateau Ice",
    icon: "🏔️",
    bounds: [27, 40, 75, 103],
    color: 0xc9b8ff,
    what: "Third Pole glacier mass",
    where: "Himalaya–Karakoram–Tibetan Plateau",
    rate: "Most glaciers losing mass; Karakoram anomaly persists",
    significance: "MIXED — regional 'anomaly' where some glaciers hold steady",
    tone: "mixed",
    water: "Feeds rivers for ~2 billion people",
    description:
      "'Third Pole' ice feeds the Indus, Ganges, Brahmaputra, Yangtze and Mekong. Most glaciers are thinning, yet the Karakoram range famously holds steady or gains — a celebrated opposite-trend puzzle, now largely explained by summer cooling from irrigation.",
    source: "NASA ICESat-2 · GRACE-FO · HIMAP"
  },

  // ---------- OCEAN ZONES ----------
  {
    id: "west-pacific-sea-level",
    name: "Western Pacific Sea Level",
    icon: "🌊",
    bounds: [-20, 20, 120, 180],
    color: 0x2fa8ff,
    what: "Regional sea surface height",
    where: "Western tropical Pacific — Philippines to Kiribati",
    rate: "2–3× the global average rate",
    significance: "YES — 30-yr altimeter record, >99% confidence",
    tone: "yes",
    description:
      "Trade winds pile warm water into the western Pacific 'warm pool', so islands like Kiribati and Tuvalu see the ocean climb several times faster than the world average — the same global process, regionally amplified.",
    source: "NASA/CNES Jason-3 · Sentinel-6 MF"
  },
  {
    id: "gulf-stream",
    name: "Atlantic Overturning",
    icon: "🧭",
    bounds: [5, 62, -75, 5],
    color: 0x5f8cff,
    what: "AMOC strength & subpolar 'cold blob'",
    where: "North Atlantic subpolar gyre",
    rate: "Weak evidence of slowing; 'cold blob' persists",
    significance: "MIXED — signals inside natural decadal noise",
    tone: "mixed",
    description:
      "South of Greenland a patch of ocean refuses to warm while the rest of the globe heats — the famous 'cold blob'. Whether it marks a slowing AMOC is one of the liveliest open debates in ocean science: a trend that is real but not yet provably significant.",
    source: "NASA/JPL RAPID array · satellite altimetry"
  },
  {
    id: "pacific-warm-pool",
    name: "Equatorial Pacific ENSO",
    icon: "🌀",
    bounds: [-15, 15, -180, -80],
    color: 0x46c2ff,
    what: "Sea surface temperature (ENSO cycle)",
    where: "Central & eastern equatorial Pacific",
    rate: "El Niño/La Niña swings ±2 °C, no simple one-way trend",
    significance: "MIXED — a cycle, not yet a clean trend",
    tone: "mixed",
    description:
      "The equatorial Pacific swings between El Niño and La Niña, temporarily redistributing heat worldwide. Detecting the long-term trend under this natural cycle is a classic statistical detective exercise — exactly the challenge's 'significance' question.",
    source: "NASA/JPL Jason-3 · Sentinel-6 · GPM"
  },
  {
    id: "southern-ocean",
    name: "Southern Ocean Carbon",
    icon: "🫧",
    bounds: [-65, -45, -180, 180],
    color: 0x35b5a5,
    what: "Carbon uptake & freshwater balance",
    where: "Circumpolar belt around Antarctica",
    rate: "Strongest ocean CO₂ sink; trend varies by decade",
    significance: "MIXED — reinvigorated after 2000s plateau",
    tone: "mixed",
    description:
      "The Southern Ocean absorbs a huge share of humanity's CO₂. Its uptake weakened in the 1990s, then reinvigorated — showing detectives that even a global sink has decades that trend opposite ways before the long-term direction reasserts.",
    source: "NASA OCO-2 · SMAP salinity"
  },
  {
    id: "coral-triangles",
    name: "Coral Reef Heat Stress",
    icon: "🪸",
    bounds: [-12, 25, 95, 170],
    color: 0xff7eb6,
    what: "Sea surface temperature & coral bleaching risk",
    where: "Coral Triangle & Great Barrier Reef",
    rate: "Bleaching events now near-annual in warm years",
    significance: "YES — warming trend clear above ENSO noise",
    tone: "yes",
    description:
      "Reefs live near their thermal limit: just 1 °C above normal summer maximum for weeks triggers mass bleaching. The warming trend here is unmistakable against the year-to-year ENSO cycle — a trend both real and significant.",
    source: "NASA MODIS SST · GPM"
  }
];

// ---------- Generic fallbacks ----------
const FALLBACK_TEMPLATES = [
  {
    match: (lat) => lat >= 60,
    what: "Polar climate variables",
    where: "High northern latitudes",
    rate: "Arctic amplification: warming 3–4× global average",
    significance: "YES — one of the clearest trends in the record",
    tone: "yes",
    icon: "❄️",
    color: 0xbfe9ff,
    description:
      "You've clicked the far north — the fastest-warming zone on Earth. Snow cover, sea ice and permafrost all show consistent one-way trends here.",
    source: "NASA GISTEMP · NSIDC · SMAP"
  },
  {
    match: (lat) => lat >= 23.5 && lat < 60,
    what: "Mid-latitude climate variables",
    where: "Northern temperate zone",
    rate: "≈ +0.2 °C per decade, region-dependent",
    significance: "MIXED — trend clear, regional details vary",
    tone: "mixed",
    icon: "🌍",
    color: 0x9fc3ff,
    description:
      "Temperate latitudes carry strong weather noise on top of the warming trend, which makes them great practice for the challenge's statistical detective work.",
    source: "NASA GISTEMP v4 · NOAA"
  },
  {
    match: (lat) => lat >= -23.5 && lat < 23.5,
    what: "Tropical climate variables",
    where: "Tropics",
    rate: "Warming with strong ENSO modulation",
    significance: "MIXED — cycle-dominated, long trend emerging",
    tone: "mixed",
    icon: "🌴",
    color: 0x46c2ff,
    description:
      "The tropics are Earth's heat engine — ENSO swings dominate year to year while the background slowly warms. Separating those two signals is core detective work.",
    source: "NASA/JPL Jason-3 · GPM · MODIS"
  },
  {
    match: (lat) => lat < -60,
    what: "Antarctic variables",
    where: "Antarctica & Southern Ocean",
    rate: "West losing ice; East largely stable",
    significance: "YES for the west — regional contrast is the story",
    tone: "yes",
    icon: "🐧",
    color: 0xa8d8ff,
    description:
      "Same continent, opposite trends: rapid loss in west Antarctica, stability in the east. It's the challenge's core lesson in one place.",
    source: "NASA ICESat-2 · GRACE-FO"
  },
  {
    match: () => true,
    what: "Regional Earth observations",
    where: "Southern mid-latitudes",
    rate: "Trends vary strongly by region",
    significance: "MIXED — explore the marked hotspots",
    tone: "mixed",
    icon: "🗺️",
    color: 0x9fc3ff,
    description:
      "A quieter data corner. Try clicking the glowing pins — or a region like Australia, the Amazon or the western Pacific — for a full case file.",
    source: "NASA Earth observation missions"
  }
];

/* ---------- Lookup helpers ---------- */
function findRegionForPoint(lat, lon) {
  // smaller boxes first so a specific region wins over a big ocean box
  const sorted = REGION_ZONES.slice().sort(
    (a, b) => boxArea(a.bounds) - boxArea(b.bounds)
  );
  for (const zone of sorted) {
    const [s, n, w, e] = zone.bounds;
    const inLat = lat >= s && lat <= n;
    const inLon = w <= e ? lon >= w && lon <= e : lon >= w || lon <= e; // wrap antimeridian
    if (inLat && inLon) return zone;
  }
  return FALLBACK_TEMPLATES.find((t) => t.match(lat)) || FALLBACK_TEMPLATES[0];
}

function boxArea(b) {
  const [s, n, w, e] = b;
  const latH = Math.max(0.001, n - s);
  const lonW = e >= w ? e - w : 360 - (w - e);
  return latH * lonW;
}

// Export to global scope
if (typeof window !== "undefined") {
  window.REGION_ZONES = REGION_ZONES;
  window.findRegionForPoint = findRegionForPoint;
}
