/* ============================================================
   TerraTrend - regional trend zones
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
    where: "Greenland; fastest loss at peripheral outlet glaciers",
    rate: "≈ −270 gigatonnes of ice per year",
    significance: "YES; GRACE & GRACE-FO agree across 20+ yrs",
    tone: "yes",
    description:
      "The GRACE satellites literally weigh the ice sheet by tracking tiny shifts in Earth's gravity field. Greenland's losses have accelerated since the early 2000s and meltwater from it is now one of the largest single contributors to global sea level rise.",
    source: "NASA GRACE / GRACE Follow-On",
    sourceUrl: "https://gracefo.jpl.nasa.gov/"
  },
  {
    id: "arctic-sea-ice",
    name: "Arctic Sea Ice",
    icon: "❄️",
    bounds: [66, 90, -180, 180],
    color: 0xbfe9ff,
    what: "September sea-ice extent",
    where: "Central Arctic Ocean",
    rate: "≈ −13% per decade vs 1981-2010 average",
    significance: "YES; strongest land-sea contrast on Earth",
    tone: "yes",
    description:
      "Every summer the Arctic cap shrinks and the summer minimum has fallen dramatically since satellite records began in 1979. Older, thicker multi-year ice is being replaced by thin seasonal ice that melts more easily, a reinforcing loop.",
    source: "NASA NSIDC · passive microwave record",
    sourceUrl: "https://nsidc.org/data/seaice_index"
  },
  {
    id: "antarctica",
    name: "Antarctic Ice",
    icon: "🐧",
    bounds: [-90, -60, -180, 180],
    color: 0xa8d8ff,
    what: "Ice sheet mass & ice-shelf stability",
    where: "West Antarctica: Amundsen Sea sector (Thwaites)",
    rate: "≈ −150 gigatonnes per year, concentrated in the west",
    significance: "YES; sustained trend since the 1990s",
    tone: "yes",
    description:
      "West Antarctic glaciers are grounded below sea level and exposed to warm Circumpolar Deep Water, so the same process that stabilizes East Antarctica drives rapid loss in the west, opposite trends on one continent.",
    source: "NASA ICESat-2 · GRACE-FO · Operation IceBridge",
    sourceUrl: "https://icesat-2.gsfc.nasa.gov/"
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
    rate: "Fire seasons weeks longer than in the 1970s-80s",
    significance: "MIXED; steep rise in forests, decline in some grasslands",
    tone: "mixed",
    description:
      "MODIS and VIIRS satellites detect every fire on the continent daily. Warmer, drier summers have lengthened fire seasons and boosted extreme fire behavior, while burned area in some shrub and grass systems has actually declined, a perfect detective contrast.",
    source: "NASA MODIS / VIIRS active fire products",
    sourceUrl: "https://firms.modaps.eosdis.nasa.gov/"
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
    significance: "MIXED; protection policies vs drought & fire feedback",
    tone: "mixed",
    description:
      "The Amazon sits near a tipping point: deforestation and drought dry the forest, drying feeds fire and fire pushes more clearing. GEDI and ICESat-2 now track canopy height loss from orbit, while some years show sharp recovery when enforcement strengthens.",
    source: "NASA GEDI · ICESat-2 · MODIS",
    sourceUrl: "https://gedi.umd.edu/"
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
    significance: "MIXED; wetting Sahel vs deepening Sahara interior",
    tone: "mixed",
    description:
      "A detective's favorite: the same monsoon system that dried the Sahel in the 1970s-80s has partially recovered and satellite greening shows vegetation pushing north, yet the Sahara's deep interior stays one of Earth's most stable climatological zones.",
    source: "NASA MODIS NDVI · GPM rainfall",
    sourceUrl: "https://modis.gsfc.nasa.gov/"
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
    significance: "YES; strong multi-year GRACE signal",
    tone: "yes",
    description:
      "GRACE-FO senses water moving through the ground. Pumping for irrigation drains the aquifer faster than monsoon rain can refill it, a falling trend invisible at the surface but unmistakable from 490 km up.",
    source: "NASA GRACE-FO terrestrial water storage",
    sourceUrl: "https://gracefo.jpl.nasa.gov/"
  },
  {
    id: "middle-east-water",
    name: "Middle East Water Stress",
    icon: "🏞️",
    bounds: [12, 40, 34, 63],
    color: 0xd4a94a,
    what: "Freshwater storage & drought extent",
    where: "Tigris-Euphrates basin & Arabian Peninsula",
    rate: "Sustained multi-year storage decline",
    significance: "YES; GRACE detects multi-year droughts",
    tone: "yes",
    description:
      "GRACE watched the 2007-2017 drought drain the Tigris-Euphrates basin faster than any comparable period in the record; part climate, part pumping. Reservoir maps from MODIS show the same story from the surface.",
    source: "NASA GRACE-FO · MODIS reservoir products",
    sourceUrl: "https://gracefo.jpl.nasa.gov/"
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
    significance: "YES; decade-scale GRACE decline",
    tone: "yes",
    description:
      "The North China Plain grows a huge share of the nation's wheat with water pumped from deep aquifers. GRACE shows the storage trend running consistently downward since 2002, a supply problem measured in cubic kilometers.",
    source: "NASA GRACE-FO",
    sourceUrl: "https://gracefo.jpl.nasa.gov/"
  },
  {
    id: "australia",
    name: "Australia Drought & Fire",
    icon: "🦘",
    bounds: [-44, -10, 112, 155],
    color: 0xe07850,
    what: "Drought extent & fire weather",
    where: "Southeast Australia: Murray-Darling Basin",
    rate: "Longer droughts; fire weather seasons extending",
    significance: "MIXED; wetter north vs drier southeast",
    tone: "mixed",
    description:
      "The same continent carries opposite trends: tropical north greening under stronger monsoon rains while the southeast endures record drought and the 2019-20 Black Summer fires. Opposite directions, one island: exactly the detective contrast the challenge wants.",
    source: "NASA MODIS · TRMM/GPM · GRACE-FO",
    sourceUrl: "https://modis.gsfc.nasa.gov/"
  },
  {
    id: "california",
    name: "California Water",
    icon: "🌴",
    bounds: [32, 42, -125, -114],
    color: 0x4fd1c5,
    what: "Central Valley groundwater & snowpack",
    where: "Central Valley aquifer + Sierra Nevada snow",
    rate: "Major storage losses in 2012-16 & 2020-22 droughts",
    significance: "YES; GRACE resolves the valley from orbit",
    tone: "yes",
    description:
      "GRACE can see California's Central Valley shrink as an aquifer. Meanwhile Sierra snowpack, a natural reservoir for 30 million people, shows declining trends, shifting the state's water timing earlier each spring.",
    source: "NASA GRACE-FO · Airborne Snow Observatory",
    sourceUrl: "https://gracefo.jpl.nasa.gov/"
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
    significance: "YES; clear multi-decadal thaw signal",
    tone: "yes",
    description:
      "Permafrost that stayed frozen for millennia is thawing, releasing stored carbon and buckling infrastructure, while boreal fires, visible to MODIS/VIIRS, burn areas that historically rarely burned.",
    source: "NASA MODIS · ICESat-2 · SMAP",
    sourceUrl: "https://smap.jpl.nasa.gov/"
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
    significance: "MIXED; drying south vs variable north",
    tone: "mixed",
    description:
      "Europe is a global hot spot for summer heat amplification. Soil moisture from SMAP and GRACE-FO shows the Mediterranean side drying while some northern areas stay wet, a gradient the detective can map within one continent.",
    source: "NASA SMAP · GRACE-FO · MODIS",
    sourceUrl: "https://smap.jpl.nasa.gov/"
  },
  {
    id: "tibet",
    name: "Tibetan Plateau Ice",
    icon: "🏔️",
    bounds: [27, 40, 75, 103],
    color: 0xc9b8ff,
    what: "Third Pole glacier mass",
    where: "Himalaya-Karakoram-Tibetan Plateau",
    rate: "Most glaciers losing mass; Karakoram anomaly persists",
    significance: "MIXED; regional anomaly where some glaciers hold steady",
    tone: "mixed",
    water: "Feeds rivers for ~2 billion people",
    description:
      "Third Pole ice feeds the Indus, Ganges, Brahmaputra, Yangtze and Mekong. Most glaciers are thinning, yet the Karakoram range famously holds steady or gains, a celebrated opposite-trend puzzle now largely explained by summer cooling from irrigation.",
    source: "NASA ICESat-2 · GRACE-FO · HIMAP",
    sourceUrl: "https://icesat-2.gsfc.nasa.gov/"
  },

  // ---------- MORE LAND REGIONS ----------
  {
    id: "lake-chad",
    name: "Lake Chad Collapse",
    icon: "🏜️",
    bounds: [9, 16, 12, 24],
    color: 0xd4a94a,
    what: "Lake surface area & basin water storage",
    where: "Lake Chad Basin - Chad, Niger, Nigeria, Cameroon",
    rate: "Surface area fell from 25,000 km² to ~1,500 km² since 1963",
    significance: "YES; one of the most dramatic land-change signals in satellite history",
    tone: "yes",
    description:
      "NASA Landsat watched Lake Chad shrink to less than 10% of its 1960s size in real time. Climate variability and massive upstream irrigation diversions have together nearly erased a lake that once supported 30 million people, turning its exposed bed into a dust-blowing salt flat.",
    source: "NASA Landsat · MODIS · GRACE-FO",
    sourceUrl: "https://landsat.gsfc.nasa.gov/"
  },
  {
    id: "andes-glaciers",
    name: "Andes Tropical Glaciers",
    icon: "⛰️",
    bounds: [-18, 5, -80, -64],
    color: 0xb0d4ff,
    what: "Tropical glacier mass & extent",
    where: "Peru, Bolivia & Ecuador - Quelccaya, Huascarán, Chacaltaya",
    rate: "30-50% ice volume lost since 1980; Chacaltaya glacier vanished 2009",
    significance: "YES; fastest-disappearing glaciers on Earth by area fraction",
    tone: "yes",
    description:
      "The Andes hold over 99% of the world's tropical glaciers and NASA ICESat-2 surveys show them in near-freefall. Bolivia's Chacaltaya glacier, once a ski resort, vanished entirely in 2009. These glaciers regulate dry-season water for millions; when they disappear, the dry season has no buffer.",
    source: "NASA ICESat-2 · GRACE-FO · Landsat",
    sourceUrl: "https://icesat-2.gsfc.nasa.gov/"
  },
  {
    id: "alaska-glaciers",
    name: "Alaska Glacier Retreat",
    icon: "🌨️",
    bounds: [55, 72, -170, -130],
    color: 0x88aaff,
    what: "Glacier mass balance & permafrost thaw",
    where: "Gulf of Alaska, Juneau Icefield, Brooks Range",
    rate: "≈ −75 Gt/yr; Columbia Glacier retreated 20 km in 30 years",
    significance: "YES; continuous loss trend since at least 1980",
    tone: "yes",
    description:
      "Alaska's glaciers, tracked by GRACE-FO and NASA Operation IceBridge airborne surveys, are losing ice faster per unit area than almost anywhere outside Greenland. Meanwhile permafrost thaw is buckling roads, tilting forests and releasing ancient carbon that has been frozen since the last ice age.",
    source: "NASA GRACE-FO · Operation IceBridge · MODIS",
    sourceUrl: "https://gracefo.jpl.nasa.gov/"
  },
  {
    id: "aral-sea",
    name: "Aral Sea Disappearance",
    icon: "🌊",
    bounds: [42, 47, 55, 62],
    color: 0xd4a94a,
    what: "Lake surface area & regional salinity",
    where: "Kazakhstan / Uzbekistan border",
    rate: "Over 90% of water volume lost since 1960",
    significance: "YES; the largest man-made environmental disaster ever recorded from space",
    tone: "yes",
    description:
      "Soviet-era irrigation canals diverted the Amu Darya and Syr Darya rivers away from the Aral Sea and NASA Landsat documented the result decade by decade: one of the world's four largest lakes reduced to a series of toxic, hyper-saline remnants. The exposed lake bed is now a salt desert spreading dust across Central Asia.",
    source: "NASA Landsat · MODIS",
    sourceUrl: "https://landsat.gsfc.nasa.gov/"
  },
  {
    id: "bay-of-bengal",
    name: "Bay of Bengal Cyclones",
    icon: "🌀",
    bounds: [5, 25, 75, 100],
    color: 0x5f8cff,
    what: "Sea surface temperature & cyclone rapid intensification",
    where: "Bay of Bengal - Bangladesh, India & Myanmar coasts",
    rate: "SST +0.5 °C since 1980; rapid intensification events increasing",
    significance: "YES; warming clear; link to storm intensification significant",
    tone: "yes",
    description:
      "The Bay of Bengal is one of the world's most deadly tropical cyclone basins and a warmer sea surface gives storms more energy. NASA GPM measures rainfall inside cyclones in real time while MODIS tracks the warm core. Cyclone Fani (2019) and Amphan (2020) both rapidly intensified over anomalously warm water before making landfall.",
    source: "NASA GPM · MODIS SST · Jason-3",
    sourceUrl: "https://gpm.nasa.gov/"
  },
  {
    id: "scandinavia-ice",
    name: "Svalbard & Nordic Ice",
    icon: "🏔️",
    bounds: [58, 82, 5, 35],
    color: 0xa0d8ef,
    what: "Fjord glacier mass & sea ice extent",
    where: "Norway, Svalbard & the Barents Sea",
    rate: "Most Norwegian glaciers retreating 10-50 m/yr; Svalbard warming 5x global average",
    significance: "YES; consistent retreat and record sea ice losses",
    tone: "yes",
    description:
      "Svalbard is warming faster than almost anywhere else on Earth - measurable rainfall now falls there in January, once unthinkable. NASA Landsat and ICESat-2 show glacier fronts retreating year on year while Barents Sea ice-free summers grow longer each decade, opening Arctic shipping routes that didn't exist a generation ago.",
    source: "NASA Landsat · ICESat-2 · NSIDC",
    sourceUrl: "https://landsat.gsfc.nasa.gov/"
  },

  // ---------- AFRICA & SOUTHEAST ASIA ----------
  {
    id: "congo-rainforest",
    name: "Congo Rainforest",
    icon: "🌿",
    bounds: [-5, 5, 14, 32],
    color: 0x2db87a,
    what: "Forest cover & carbon storage",
    where: "Congo Basin: DRC, Republic of Congo, Cameroon",
    rate: "Deforestation accelerating; canopy height loss now detectable from orbit",
    significance: "YES; consistent loss signal in GEDI canopy height data",
    tone: "yes",
    description:
      "The Congo Basin is the world's second-largest tropical forest and one of Earth's most important carbon stores. Unlike the Amazon it remained relatively stable through the 1990s, but GEDI and MODIS now show accelerating forest loss and degradation driven by smallholder agriculture and charcoal production.",
    source: "NASA GEDI · MODIS · Landsat",
    sourceUrl: "https://gedi.umd.edu/"
  },
  {
    id: "horn-of-africa",
    name: "Horn of Africa Drought",
    icon: "☀️",
    bounds: [0, 12, 38, 51],
    color: 0xe07850,
    what: "Rainfall deficit & terrestrial water storage",
    where: "Ethiopia, Somalia, Kenya, Djibouti",
    rate: "5 consecutive failed rainy seasons 2020-2022; worst drought in 40 years",
    significance: "YES; GRACE-FO detects sustained multi-year water storage loss",
    tone: "yes",
    description:
      "The Horn of Africa experienced five consecutive failed rainy seasons between 2020 and 2022, the worst drought in four decades. GRACE-FO recorded sustained water storage losses across the region while GPM rainfall data confirmed the exceptional deficit. Climate change is shifting the Indian Ocean Dipole, suppressing rains that hundreds of millions depend on.",
    source: "NASA GRACE-FO · GPM · MODIS NDVI",
    sourceUrl: "https://gracefo.jpl.nasa.gov/"
  },
  {
    id: "east-africa-lakes",
    name: "East African Lakes",
    icon: "🏞️",
    bounds: [-12, 5, 28, 42],
    color: 0x35b5a5,
    what: "Lake water levels & basin hydrology",
    where: "Lake Victoria, Turkana, Tanganyika, Malawi",
    rate: "Lake Victoria rose 1.2 m in 2019-2020; Lake Turkana in multi-year decline",
    significance: "MIXED; extremes intensifying against a variable background",
    tone: "mixed",
    description:
      "East Africa's rift lakes are powerful climate recorders. Lake Victoria surged to its highest level in decades in 2020 after exceptional rainfall, flooding shoreline communities, while Lake Turkana faces a long-term freshwater squeeze. Landsat and GRACE-FO capture these opposite stories within the same basin.",
    source: "NASA Landsat · GRACE-FO · GPM",
    sourceUrl: "https://landsat.gsfc.nasa.gov/"
  },
  {
    id: "indonesia-fires",
    name: "Indonesian Peatland Fires",
    icon: "🔥",
    bounds: [-8, 6, 95, 120],
    color: 0xff7043,
    what: "Peat fire carbon emissions & deforestation",
    where: "Borneo (Kalimantan) & Sumatra, Indonesia",
    rate: "2015 fire season released more CO₂ than Germany emits in a year",
    significance: "YES; extreme fire years are traceable in global CO₂ anomalies",
    tone: "yes",
    description:
      "Indonesia's tropical peatlands store centuries of carbon. When drained for palm oil and pulp plantations then ignited, they burn underground for months. The 2015 event was among the largest single-year carbon emission events in modern records, detected globally by NASA's OCO-2 satellite as a clear CO₂ anomaly over the region.",
    source: "NASA MODIS · VIIRS · OCO-2",
    sourceUrl: "https://firms.modaps.eosdis.nasa.gov/"
  },
  {
    id: "mekong-basin",
    name: "Mekong River Basin",
    icon: "🏔️",
    bounds: [10, 25, 98, 108],
    color: 0x4fd1c5,
    what: "River discharge & delta sediment flux",
    where: "China, Myanmar, Laos, Thailand, Cambodia, Vietnam",
    rate: "River hit record lows in 2019-2020; delta subsiding 1-2 cm/yr",
    significance: "YES; dam cascade signal measurable in downstream hydrology",
    tone: "yes",
    description:
      "The Mekong feeds 70 million people but a cascade of upstream dams combined with drought pushed the river to record lows in 2019-2020. Satellite altimetry from Jason-3 shows the downstream discharge deficit while Landsat maps the shrinking delta, which is simultaneously sinking from groundwater extraction.",
    source: "NASA Landsat · Jason-3 · GRACE-FO",
    sourceUrl: "https://landsat.gsfc.nasa.gov/"
  },
  {
    id: "yangtze-basin",
    name: "Yangtze River Basin",
    icon: "🌧️",
    bounds: [24, 33, 98, 122],
    color: 0x5f8cff,
    what: "Flood and drought extremes & reservoir hydrology",
    where: "Central & eastern China: Three Gorges to Shanghai",
    rate: "Record floods in 2020; record drought in 2022 in the same basin",
    significance: "MIXED; extremes intensifying with a long-term trend emerging",
    tone: "mixed",
    description:
      "The Yangtze basin showcased the climate paradox in back-to-back years: catastrophic flooding in 2020 then a severe drought in 2022 that dried the river to its lowest level in recorded history. GRACE-FO, GPM and Landsat together tell the story of a basin swinging between extremes as the monsoon system intensifies.",
    source: "NASA GRACE-FO · GPM · Landsat · Jason-3",
    sourceUrl: "https://gracefo.jpl.nasa.gov/"
  },

  // ---------- ASIA & SOUTHEAST ASIA ----------
  {
    id: "bangladesh-delta",
    name: "Bangladesh & Ganges Delta",
    icon: "🌊",
    bounds: [20, 27, 86, 93],
    color: 0x2fa8ff,
    what: "Delta subsidence & sea level rise",
    where: "Ganges-Brahmaputra-Meghna delta, Bangladesh",
    rate: "Land sinking 1-2 cm/yr while sea level rises; combined exposure accelerating",
    significance: "YES; combined signal clear in satellite altimetry and InSAR",
    tone: "yes",
    description:
      "The Ganges-Brahmaputra delta is home to 170 million people on land that is sinking under its own weight while the sea rises around it. Groundwater extraction and sediment compaction drive subsidence of 1-2 cm per year, measured by InSAR and GRACE-FO, while Jason-3 tracks the rising sea. The combined threat places Bangladesh among the most acute climate risk signals on Earth.",
    source: "NASA GRACE-FO · Jason-3 · Sentinel-1 InSAR",
    sourceUrl: "https://gracefo.jpl.nasa.gov/"
  },
  {
    id: "pakistan-floods",
    name: "Pakistan Monsoon Extremes",
    icon: "🌧️",
    bounds: [24, 37, 60, 73],
    color: 0x5f8cff,
    what: "Monsoon extremes & glacial melt flooding",
    where: "Indus River basin, Pakistan",
    rate: "2022 floods submerged one third of the country; a 1-in-1,000-year rainfall event",
    significance: "YES; rainfall totals outside the entire historical envelope",
    tone: "yes",
    description:
      "In 2022 Pakistan experienced one of the worst climate disasters ever recorded: a supercharged monsoon combined with accelerated Himalayan glacial melt submerged a third of the country and affected 33 million people. GPM measured rainfall totals 400% above normal while MODIS mapped floodwater extent week by week as the disaster unfolded.",
    source: "NASA GPM · MODIS · GRACE-FO",
    sourceUrl: "https://gpm.nasa.gov/"
  },
  {
    id: "himalayan-glacial-lakes",
    name: "Himalayan Glacial Lakes",
    icon: "🏔️",
    bounds: [26, 36, 83, 97],
    color: 0xa8d8ff,
    what: "Glacial lake formation & outburst flood risk",
    where: "Nepal, Bhutan, northeastern India",
    rate: "Number of glacial lakes grew 53% between 1990 and 2018",
    significance: "YES; lake expansion confirmed by Landsat 30-year time series",
    tone: "yes",
    description:
      "As Himalayan glaciers retreat they leave behind lakes dammed by unstable ice and debris moraine. The number of glacial lakes in the Hindu Kush-Himalayan region grew 53% between 1990 and 2018 according to Landsat analysis. When these dams fail, glacial lake outburst floods can race down valleys in minutes, destroying villages and infrastructure far below.",
    source: "NASA Landsat · ICESat-2 · GRACE-FO",
    sourceUrl: "https://landsat.gsfc.nasa.gov/"
  },
  {
    id: "philippines-typhoons",
    name: "Philippines Super Typhoons",
    icon: "🌀",
    bounds: [5, 22, 115, 132],
    color: 0x46c2ff,
    what: "Typhoon rapid intensification & sea surface temperature",
    where: "Philippine Sea & Luzon Strait",
    rate: "Rapid intensification events increasing on a warming Philippine Sea",
    significance: "YES; SST warming trend directly drives intensification risk",
    tone: "yes",
    description:
      "The Philippines sits in the world's most active typhoon basin. As sea surface temperatures rise, typhoons can undergo rapid intensification, gaining Category 4 or 5 strength within 24 hours of landfall. Super Typhoon Haiyan (2013) and Goni (2020) both rapidly intensified over anomalously warm water. NASA GPM tracks rainfall rates inside storms while MODIS monitors the warm ocean pool beneath them.",
    source: "NASA GPM · MODIS SST · Jason-3",
    sourceUrl: "https://gpm.nasa.gov/"
  },
  {
    id: "vietnam-mekong-delta",
    name: "Vietnam Mekong Delta",
    icon: "🌾",
    bounds: [8, 16, 100, 110],
    color: 0x35d07f,
    what: "Delta subsidence & saltwater intrusion",
    where: "Mekong Delta, southern Vietnam",
    rate: "Sinking 1-3 cm/yr; saltwater intrusion worsening with each dry season",
    significance: "YES; subsidence and sea level rise signal combined in satellite data",
    tone: "yes",
    description:
      "The Mekong Delta feeds 20% of Vietnam's population but is sinking faster than sea level is rising. Groundwater extraction compacts the delta at 1-3 cm per year while upstream dams trap the sediment that once replenished it naturally. GRACE-FO and Sentinel-1 InSAR reveal the subsidence and the reduced sediment load is visible in Landsat water clarity trends.",
    source: "NASA GRACE-FO · Landsat · Sentinel-1 InSAR",
    sourceUrl: "https://gracefo.jpl.nasa.gov/"
  },
  {
    id: "mongolia-steppe",
    name: "Mongolia Steppe & Dzud",
    icon: "🐑",
    bounds: [38, 52, 92, 120],
    color: 0xffd166,
    what: "Grassland degradation & extreme winter drought",
    where: "Mongolian steppe and Gobi Desert fringe",
    rate: "Dzud frequency doubling; NDVI shows persistent grassland browning",
    significance: "YES; vegetation decline and dzud trend both significant",
    tone: "yes",
    description:
      "Mongolia's vast steppe is caught between summer drought and catastrophic winter dzuds: a uniquely Mongolian disaster where summer drought leaves animals too thin to survive a harsh winter, causing mass livestock mortality. MODIS NDVI shows the steppe browning decade by decade while land surface temperatures measured from orbit confirm the amplified warming at these latitudes.",
    source: "NASA MODIS NDVI · GISTEMP · GRACE-FO",
    sourceUrl: "https://modis.gsfc.nasa.gov/"
  },
  {
    id: "japan-seas",
    name: "Japan & Korea Seas",
    icon: "🌊",
    bounds: [25, 45, 125, 148],
    color: 0x2fa8ff,
    what: "Sea surface temperature & typhoon track shifts",
    where: "Sea of Japan, East China Sea, Philippine Sea near Japan",
    rate: "Sea of Japan warming at twice the global ocean average",
    significance: "YES; one of the fastest-warming regional seas in the world",
    tone: "yes",
    description:
      "The Sea of Japan is warming at roughly twice the global ocean average, driving changes in fisheries, typhoon tracks and the timing of seasonal marine events. NASA MUR SST data shows a consistent warming trend since the 1980s that has pushed warm-water fish species northward and lengthened the season of marine heatwaves around the Japanese and Korean archipelagos.",
    source: "NASA MUR SST · MODIS · GPM",
    sourceUrl: "https://podaac.jpl.nasa.gov/"
  },
  {
    id: "indian-ocean-dipole",
    name: "Indian Ocean Dipole",
    icon: "🌡️",
    bounds: [-10, 15, 52, 80],
    color: 0xff8c42,
    what: "Sea surface temperature gradient & precipitation anomalies",
    where: "Western Indian Ocean: Arabian Sea to Tanzania coast",
    rate: "Positive IOD events intensifying; 2019 event was the strongest in 60 years",
    significance: "YES; clear warming bias in the western pole across the satellite record",
    tone: "yes",
    description:
      "The Indian Ocean Dipole is a seesaw of warm and cool water that drives rainfall across Africa, Asia and Australia. A positive IOD warms the western Indian Ocean and cools the east, bringing floods to East Africa and drought to Australia exactly as happened in 2019. NASA Argo floats and satellite SST data show the western pole warming faster than the east, potentially locking the IOD in a persistently more positive state.",
    source: "NASA MUR SST · Argo Float Network · Jason-3",
    sourceUrl: "https://podaac.jpl.nasa.gov/"
  },

  // ---------- OCEAN ZONES ----------
  {
    id: "west-pacific-sea-level",
    name: "Western Pacific Sea Level",
    icon: "🌊",
    bounds: [-20, 20, 120, 180],
    color: 0x2fa8ff,
    what: "Regional sea surface height",
    where: "Western tropical Pacific: Philippines to Kiribati",
    rate: "2-3x the global average rate",
    significance: "YES; 30-yr altimeter record, >99% confidence",
    tone: "yes",
    description:
      "Trade winds pile warm water into the western Pacific warm pool, so islands like Kiribati and Tuvalu see the ocean climb several times faster than the world average, the same global process regionally amplified.",
    source: "NASA/CNES Jason-3 · Sentinel-6 MF",
    sourceUrl: "https://sealevel.jpl.nasa.gov/"
  },
  {
    id: "gulf-stream",
    name: "Atlantic Overturning",
    icon: "🧭",
    bounds: [5, 62, -75, 5],
    color: 0x5f8cff,
    what: "AMOC strength & subpolar cold blob",
    where: "North Atlantic subpolar gyre",
    rate: "Weak evidence of slowing; cold blob persists",
    significance: "MIXED; signals inside natural decadal noise",
    tone: "mixed",
    description:
      "South of Greenland a patch of ocean refuses to warm while the rest of the globe heats, the famous cold blob. Whether it marks a slowing AMOC is one of the liveliest open debates in ocean science: a trend that is real but not yet provably significant.",
    source: "NASA/JPL RAPID array · satellite altimetry",
    sourceUrl: "https://sealevel.jpl.nasa.gov/"
  },
  {
    id: "pacific-warm-pool",
    name: "Equatorial Pacific ENSO",
    icon: "🌀",
    bounds: [-15, 15, -180, -80],
    color: 0x46c2ff,
    what: "Sea surface temperature (ENSO cycle)",
    where: "Central & eastern equatorial Pacific",
    rate: "El Nino/La Nina swings ±2 °C, no simple one-way trend",
    significance: "MIXED; a cycle, not yet a clean trend",
    tone: "mixed",
    description:
      "The equatorial Pacific swings between El Nino and La Nina, temporarily redistributing heat worldwide. Detecting the long-term trend under this natural cycle is a classic statistical detective exercise, exactly the challenge's significance question.",
    source: "NASA/JPL Jason-3 · Sentinel-6 · GPM",
    sourceUrl: "https://sealevel.jpl.nasa.gov/"
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
    significance: "MIXED; reinvigorated after 2000s plateau",
    tone: "mixed",
    description:
      "The Southern Ocean absorbs a huge share of humanity's CO₂. Its uptake weakened in the 1990s then reinvigorated, showing detectives that even a global sink has decades that trend opposite ways before the long-term direction reasserts.",
    source: "NASA OCO-2 · SMAP salinity",
    sourceUrl: "https://ocov2.jpl.nasa.gov/"
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
    significance: "YES; warming trend clear above ENSO noise",
    tone: "yes",
    description:
      "Reefs live near their thermal limit: just 1 °C above normal summer maximum for weeks triggers mass bleaching. The warming trend here is unmistakable against the year-to-year ENSO cycle, a trend both real and significant.",
    source: "NASA MODIS SST · GPM",
    sourceUrl: "https://coralreefwatch.noaa.gov/"
  },
  {
    id: "mediterranean-warming",
    name: "Mediterranean Sea",
    icon: "🌊",
    bounds: [30, 46, -6, 37],
    color: 0x46c8ff,
    what: "Sea surface temperature & marine heatwaves",
    where: "Mediterranean Sea: Spain to Turkey, Morocco to Italy",
    rate: "Warming at 0.4 °C per decade, nearly double the global ocean average",
    significance: "YES; most consistent marine warming signal in the Northern Hemisphere",
    tone: "yes",
    description:
      "The Mediterranean is one of the fastest-warming bodies of water on Earth, enclosed by land that amplifies heat. Marine heatwaves have become near-annual events since 2015, bleaching Posidonia seagrass meadows and pushing fish species northward. NASA MUR SST records make the warming trend unmistakable across the full satellite record.",
    source: "NASA MUR SST · MODIS · Copernicus Marine Service",
    sourceUrl: "https://podaac.jpl.nasa.gov/"
  },
  {
    id: "red-sea",
    name: "Red Sea Warming",
    icon: "🌡️",
    bounds: [12, 28, 32, 44],
    color: 0xff5e8a,
    what: "Sea surface temperature & coral bleaching",
    where: "Red Sea: Egypt, Saudi Arabia, Yemen, Eritrea coasts",
    rate: "0.45 °C per decade; among the fastest-warming seas on Earth",
    significance: "YES; strong monotonic warming across the full satellite record",
    tone: "yes",
    description:
      "The Red Sea is one of the hottest and saltiest seas on Earth and it is warming faster than almost any other body of water. Its corals evolved under extreme heat and were once considered resilient, yet mass bleaching events have now become regular. The warming signal here carries almost no confounding natural variability, making it a clean detective case.",
    source: "NASA MUR SST · MODIS · Landsat",
    sourceUrl: "https://podaac.jpl.nasa.gov/"
  },
  {
    id: "singapore",
    name: "Singapore Urban Heat Island",
    icon: "🏙️",
    bounds: [0.5, 2.0, 102.8, 105.0],
    color: 0xff6b6b,
    what: "Urban heat island intensity & coastal sea level rise",
    where: "Singapore island and Strait of Malacca",
    rate: "Night temperatures rising 0.25 °C/decade; sea level up 3.5 mm/yr in the strait",
    significance: "YES; one of the most studied urban heat islands in tropical Asia",
    tone: "yes",
    description:
      "Singapore is a living laboratory for the urban heat island effect in the tropics. Dense urban surfaces absorb heat the surrounding ocean never stores, pushing nighttime temperatures up faster than regional background warming. The island sits just 1-3 metres above sea level: Jason-3 satellite altimetry records sea level in the Strait of Malacca rising at 3.5 mm per year. NASA Landsat time series captures how land cover shifted from mangrove to urban over five decades, replacing natural cooling with impervious surfaces.",
    source: "NASA Landsat · GISTEMP · Jason-3 · MODIS LST",
    sourceUrl: "https://earthobservatory.nasa.gov/"
  }
];

// ---------- Generic fallbacks ----------
const FALLBACK_TEMPLATES = [
  {
    match: (lat) => lat >= 60,
    name: "Polar Climate",
    what: "Polar climate variables",
    where: "High northern latitudes",
    rate: "Arctic amplification: warming 3-4x global average",
    significance: "YES; one of the clearest trends in the record",
    tone: "yes",
    icon: "❄️",
    color: 0xbfe9ff,
    description:
      "You've clicked the far north, the fastest-warming zone on Earth. Snow cover, sea ice and permafrost all show consistent one-way trends here.",
    source: "NASA GISTEMP · NSIDC · SMAP"
  },
  {
    match: (lat) => lat >= 23.5 && lat < 60,
    name: "Mid-latitude Climate",
    what: "Mid-latitude climate variables",
    where: "Northern temperate zone",
    rate: "≈ +0.2 °C per decade, region-dependent",
    significance: "MIXED; trend clear, regional details vary",
    tone: "mixed",
    icon: "🌍",
    color: 0x9fc3ff,
    description:
      "Temperate latitudes carry strong weather noise on top of the warming trend, which makes them great practice for the challenge's statistical detective work.",
    source: "NASA GISTEMP v4 · NOAA"
  },
  {
    match: (lat) => lat >= -23.5 && lat < 23.5,
    name: "Tropical Climate",
    what: "Tropical climate variables",
    where: "Tropics",
    rate: "Warming with strong ENSO modulation",
    significance: "MIXED; cycle-dominated, long trend emerging",
    tone: "mixed",
    icon: "🌴",
    color: 0x46c2ff,
    description:
      "The tropics are Earth's heat engine: ENSO swings dominate year to year while the background slowly warms. Separating those two signals is core detective work.",
    source: "NASA/JPL Jason-3 · GPM · MODIS"
  },
  {
    match: (lat) => lat < -60,
    name: "Antarctic Climate",
    what: "Antarctic variables",
    where: "Antarctica & Southern Ocean",
    rate: "West losing ice; East largely stable",
    significance: "YES for the west; regional contrast is the story",
    tone: "yes",
    icon: "🐧",
    color: 0xa8d8ff,
    description:
      "Same continent, opposite trends: rapid loss in west Antarctica, stability in the east. It's the challenge's core lesson in one place.",
    source: "NASA ICESat-2 · GRACE-FO"
  },
  {
    match: () => true,
    name: "Southern Latitudes",
    what: "Regional Earth observations",
    where: "Southern mid-latitudes",
    rate: "Trends vary strongly by region",
    significance: "MIXED; explore the marked hotspots",
    tone: "mixed",
    icon: "🗺️",
    color: 0x9fc3ff,
    description:
      "A quieter data corner. Try clicking the glowing pins or a region like Australia, the Amazon or the western Pacific for a full case file.",
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
