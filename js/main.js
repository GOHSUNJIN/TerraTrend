/* ============================================================
   TerraTrend — UI wiring (NASA Eyes-style app shell)
   Splash gate · hotspot cards · bottom-bar dots · side rail ·
   info panel · scroll reveal
   ============================================================ */

(function () {
  "use strict";

  function hex(c) {
    return "#" + c.toString(16).padStart(6, "0");
  }
  function trendArrow(t) {
    return t === "up" ? "▲" : t === "down" ? "▼" : "◇";
  }
  function shortRate(r) {
    return r.split(" ").slice(0, 5).join(" ");
  }
  function flyToHotspot(spot) {
    if (window.TerraTrendGlobe) {
      const idx = HOTSPOTS.indexOf(spot);
      if (idx >= 0) window.TerraTrendGlobe.selectHotspot(idx, false);
    }
  }

  // ---------- Synthetic trend series (faithful to each hotspot's direction & rate) ----------
  // Honest synthetic data: generation 0 is 2000, start values and per-year drift
  // mirror each hotspot's stated rate so the chart matches the case file.
  const SERIES = {
    "sea-level":       { label: "GMSL (mm)",    start: 0,      drift: 4.5,  noise: 4,  cycle: 5,  dir: "up" },
    "greenland-ice":   { label: "Ice mass (Gt)", start: 5000,   drift: -270, noise: 60, cycle: 0,  dir: "down" },
    "co2":             { label: "CO₂ (ppm)",    start: 369,    drift: 2.4,  noise: 0.7, cycle: 6,  dir: "up" },
    "temp-anomaly":    { label: "Anomaly (°C)",  start: 0.35,   drift: 0.2,  noise: 0.09, cycle: 4.5, dir: "up" },
    "wildfire":        { label: "FRP index",     start: 100,    drift: 3.5,  noise: 22, cycle: 7,  dir: "mixed" },
    "groundwater":     { label: "TWS (cm weq)",  start: 0,      drift: -2.5, noise: 1.8, cycle: 0,  dir: "down" }
  };

  function makeSeries(id) {
    const cfg = SERIES[id] || { label: "Index", start: 100, drift: 0, noise: 6, cycle: 0, dir: "mixed" };
    const years = 26; // 2000–2025
    const pts = [];
    let seed = id.length * 977 + years; // deterministic pseudo-random per hotspot
    const rand = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return (seed / 2147483648) * 2 - 1; // [-1, 1]
    };
    for (let i = 0; i < years; i++) {
      let v = cfg.start + cfg.drift * i + (cfg.cycle ? Math.sin((i / cfg.cycle) * Math.PI * 2) * cfg.drift * 0.35 : 0);
      v += rand() * cfg.noise;
      pts.push({ year: 2000 + i, value: v });
    }
    return { cfg, pts };
  }

  // ---------- Interactive mini chart ----------
  const chartCanvas = document.getElementById("panel-chart");
  const chartTip = document.getElementById("chart-tip");
  let chartState = { pts: [], cfg: null, color: "#22e0ee" };

  function fmtVal(v) {
    const a = Math.abs(v);
    const digits = a >= 100 ? 0 : a >= 10 ? 1 : 2;
    return (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(digits);
  }

  function drawChart(pts, color, targetCanvas) {
    const canvas = targetCanvas || chartCanvas;
    if (!canvas || !pts.length) return;
    const ctx = canvas.getContext && canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;
    const isMini = !!targetCanvas; // sparkline mode: skip grid/labels
    const pad = isMini ? { l: 2, r: 2, t: 4, b: 4 } : { l: 8, r: 8, t: 14, b: 18 };
    ctx.clearRect(0, 0, W, H);

    const vals = pts.map((p) => p.value);
    let min = Math.min(...vals);
    let max = Math.max(...vals);
    if (max - min < 1e-9) { max += 1; min -= 1; }
    const span = max - min;
    min -= span * 0.12;
    max += span * 0.12;

    const x = (i) => pad.l + (i / (pts.length - 1)) * (W - pad.l - pad.r);
    const y = (v) => pad.t + (1 - (v - min) / (max - min)) * (H - pad.t - pad.b);

    // baseline grid + year labels (full chart only)
    if (!isMini) {
      ctx.strokeStyle = "rgba(160,190,240,0.1)";
      ctx.lineWidth = 1;
      for (let g = 0; g <= 3; g++) {
        const gy = pad.t + (g / 3) * (H - pad.t - pad.b);
        ctx.beginPath();
        ctx.moveTo(pad.l, gy);
        ctx.lineTo(W - pad.r, gy);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(159,176,205,0.75)";
      ctx.font = "9px IBM Plex Mono, monospace";
      ctx.fillText("2000", pad.l, H - 5);
      const endLabel = String(pts[pts.length - 1].year);
      ctx.textAlign = "right";
      ctx.fillText(endLabel, W - pad.r, H - 5);
      ctx.textAlign = "left";
    }

    // area fill
    const grad = ctx.createLinearGradient(0, pad.t, 0, H - pad.b);
    grad.addColorStop(0, color + "55");
    grad.addColorStop(1, color + "00");
    ctx.beginPath();
    ctx.moveTo(x(0), y(vals[0]));
    pts.forEach((p, i) => ctx.lineTo(x(i), y(p.value)));
    ctx.lineTo(x(pts.length - 1), H - pad.b);
    ctx.lineTo(x(0), H - pad.b);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // line
    ctx.beginPath();
    ctx.moveTo(x(0), y(vals[0]));
    pts.forEach((p, i) => ctx.lineTo(x(i), y(p.value)));
    ctx.strokeStyle = color;
    ctx.lineWidth = isMini ? 1.5 : 2;
    ctx.lineJoin = "round";
    ctx.stroke();

    // endpoints (full chart only)
    if (!isMini) {
      ctx.beginPath();
      ctx.arc(x(0), y(vals[0]), 2.5, 0, Math.PI * 2);
      ctx.arc(x(pts.length - 1), y(vals[pts.length - 1]), 2.5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }

    chartState = { pts, cfg: chartState.cfg, color, x, y, W, H, pad };
  }

  function bindChartHover() {
    if (!chartCanvas || !chartCanvas.addEventListener) return;
    chartCanvas.addEventListener("pointermove", (e) => {
      const { pts, color } = chartState;
      if (!pts.length) return;
      const rect = chartCanvas.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * chartCanvas.width;
      const idx = Math.round(((px - 8) / (chartCanvas.width - 16)) * (pts.length - 1));
      const clamped = Math.max(0, Math.min(pts.length - 1, idx));
      const p = pts[clamped];
      chartTip.innerHTML = `${p.year} · <span class="tip-val">${fmtVal(p.value)}</span>`;
      chartTip.hidden = false;
      const relX = Math.max(40, Math.min(chartCanvas.width - 40, px));
      chartTip.style.left = (relX / chartCanvas.width) * 100 + "%";
      chartTip.style.top = "-26px";
      // redraw with marker at hovered point
      drawChart(pts, color, chartCanvas);
      const ctx = chartCanvas.getContext("2d");
      ctx.beginPath();
      ctx.arc(chartState.x(clamped), chartState.y(p.value), 4, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
    });
    chartCanvas.addEventListener("pointerleave", () => {
      chartTip.hidden = true;
      drawChart(chartState.pts, chartState.color, chartCanvas);
    });
  }

  // ---------- Splash gate ----------
  const splash = document.getElementById("splash");
  const launchBtn = document.getElementById("launch-btn");
  const sideRail = document.querySelector(".side-rail");
  const bottomBar = document.querySelector(".bottom-bar");

  // ---------- Bottom bar: auto-hide + fixed toggle button ----------
  const barToggle = document.getElementById("bar-toggle");
  const BAR_HIDE_DELAY = 4500;
  let barHideTimer = null;

  function showBar() {
    if (!bottomBar) return;
    bottomBar.classList.add("active");
    bottomBar.style.opacity = "";
    bottomBar.style.pointerEvents = "";
    document.body.classList.add("bar-open");
    resetBarTimer();
  }
  function hideBar() {
    if (!bottomBar) return;
    bottomBar.classList.remove("active");
    bottomBar.style.opacity = "0";
    bottomBar.style.pointerEvents = "none";
    document.body.classList.remove("bar-open");
    clearTimeout(barHideTimer);
  }
  function resetBarTimer() {
    clearTimeout(barHideTimer);
    barHideTimer = setTimeout(hideBar, BAR_HIDE_DELAY);
  }
  if (bottomBar) {
    // stay open while the pointer or keyboard focus is inside the bar
    bottomBar.addEventListener("mouseenter", () => clearTimeout(barHideTimer));
    bottomBar.addEventListener("mouseleave", resetBarTimer);
    bottomBar.addEventListener("focusin", () => clearTimeout(barHideTimer));
    bottomBar.addEventListener("focusout", resetBarTimer);
  }
  if (barToggle) {
    barToggle.addEventListener("click", () => {
      if (bottomBar.classList.contains("active")) hideBar();
      else showBar();
    });
  }

  if (launchBtn) {
    launchBtn.addEventListener("click", () => {
      splash.classList.add("dismissed");
      document.body.classList.add("app-armed");
      if (sideRail) sideRail.classList.add("active");
      // the bar stays tucked away — only the toggle button shows
      if (barToggle) barToggle.classList.add("active");
    });
  }

  // ---------- Bottom control bar: quick-select hotspot dots ----------
  const dotWrap = document.getElementById("bar-dots");
  if (dotWrap && typeof HOTSPOTS !== "undefined") {
    HOTSPOTS.forEach((spot) => {
      const dot = document.createElement("button");
      dot.className = "bar-dot";
      dot.style.setProperty("--dot", hex(spot.color));
      dot.dataset.name = spot.name.toUpperCase();
      dot.setAttribute("aria-label", "Go to case file: " + spot.name);
      dot.addEventListener("click", () => {
        flyToHotspot(spot);
        window.TerraTrendUI.openPanel(spot);
        hideBar(); // a case file was picked — the bar is no longer in use
      });
      dotWrap.appendChild(dot);
    });
  }

  // ---------- Side rail ----------
  const railBtns = [
    { id: "rail-mission", target: "#detective" },
    { id: "rail-about", target: "#about" }
  ];
  railBtns.forEach(({ id, target }) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener("click", () => {
      const el = document.querySelector(target);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    });
  });

  const fsBtn = document.getElementById("rail-fullscreen");
  if (fsBtn) {
    fsBtn.addEventListener("click", () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen &&
          document.documentElement.requestFullscreen();
      } else {
        document.exitFullscreen && document.exitFullscreen();
      }
    });
  }

  // ---------- App bar: solid background after scrolling the app view ----------
  const header = document.querySelector(".site-header");
  const appView = document.getElementById("globe-section");
  function updateHeader() {
    if (!header || !appView) return;
    const past = window.scrollY > window.innerHeight - 80;
    header.classList.toggle("scrolled", past);
  }
  window.addEventListener("scroll", updateHeader, { passive: true });
  updateHeader();

  // ---------- Case-file bar & toggle: only visible in the globe view ----------
  function updateBarViewport() {
    document.body.classList.toggle("scrolled-globe", window.scrollY > window.innerHeight * 0.6);
  }
  window.addEventListener("scroll", updateBarViewport, { passive: true });
  updateBarViewport();

  // ---------- Bottom bar: hide on scroll ----------
  // (replaced by the auto-hide + toggle logic above)

  // ---------- Build hotspot cards grid ----------
  const grid = document.getElementById("hotspot-grid");
  if (grid && typeof HOTSPOTS !== "undefined") {
    HOTSPOTS.forEach((spot, i) => {
      const card = document.createElement("button");
      // every case card is a uniform grid cell
      card.className = "hotspot-card";
      const labelMap = {
    co2: 'CO₂ <span class="subscript">Accumulation</span>',
    sealevel: 'GMSL <span class="subscript">Rise</span>',
    greenlandice: 'Ice <span class="subscript">Mass</span>',
    tempanomaly: 'Temp <span class="subscript">Anomaly</span>',
    wildfire: 'Fire <span class="subscript">Index</span>',
    groundwater: 'Water <span class="subscript">Storage</span>'
  };
  const pillContent = labelMap[spot.id] || `${spot.name}`;
  card.innerHTML = `
        <span class="card-glow" style="--glow:${hex(spot.color)}"></span>
        <span class="card-icon">${spot.icon}</span>
        <h3>${spot.name}</h3>
        <p class="card-tag">${spot.tagline}</p>
        <div class="trend-pill">${pillContent}</div>
        <canvas class="card-spark" width="252" height="34" aria-hidden="true"></canvas>
        <span class="card-rate">${trendArrow(spot.trend)} ${shortRate(spot.rate)}</span>
        <figure class="card-photo">
          <img src="${spot.image}" alt="${spot.imageAlt}" loading="lazy" decoding="async" onerror="this.closest('.card-photo').classList.add('no-img')" />
        </figure>
        <span class="card-cta">View on globe →</span>
      `;
      const spark = card.querySelector(".card-spark");
      if (spark) drawChart(makeSeries(spot.id).pts, hex(spot.color), spark);
      card.addEventListener("click", () => {
        if (window.TerraTrendGlobe) {
          window.TerraTrendGlobe.selectHotspot(i, false);
        }
        document.getElementById("globe-section").scrollIntoView({ behavior: "smooth" });
        setTimeout(() => {
          if (window.TerraTrendUI) window.TerraTrendUI.openPanel(spot);
        }, 650);
      });
      // mouse-follow neon spotlight inside the card
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty("--mx", (e.clientX - r.left) + "px");
        card.style.setProperty("--my", (e.clientY - r.top) + "px");
      });
      grid.appendChild(card);
    });
  }

  // ---------- Info panel ----------
  const panel = document.getElementById("info-panel");
  const els = {
    kicker: document.getElementById("panel-kicker"),
    coords: document.getElementById("panel-coords"),
    title: document.getElementById("panel-title"),
    tagline: document.getElementById("panel-tagline"),
    what: document.getElementById("panel-what"),
    where: document.getElementById("panel-where"),
    rate: document.getElementById("panel-rate"),
    sig: document.getElementById("panel-sig"),
    desc: document.getElementById("panel-desc"),
    source: document.getElementById("panel-source"),
    close: document.getElementById("panel-close")
  };

  // Shift the side rail out of the panel's way on wide screens
  function setRailShift(on) {
    if (sideRail) sideRail.classList.toggle("shifted", on && window.innerWidth > 1100);
  }

  window.TerraTrendUI = {
    openPanel(spot, coords) {
      if (!panel) return;
      els.kicker.textContent = "TREND FILE · " + spot.id.toUpperCase().replace(/-/g, " ");
      els.title.textContent = spot.icon + "  " + spot.name;
      els.tagline.textContent = spot.tagline || "";
      els.what.textContent = spot.what;
      els.where.textContent = spot.where;
      els.rate.textContent = spot.rate;
      els.sig.textContent = spot.significance;
      els.sig.className =
        "sig " +
        (spot.significanceTone === "yes" || spot.significanceTone === "high"
          ? "sig-yes"
          : "sig-mixed");
      els.desc.textContent = spot.description;
      els.source.textContent = "DATA: " + spot.source;
      // case-file photo (same NASA imagery as the hotspot card)
      const photoFig = document.getElementById("panel-photo");
      const photoImg = document.getElementById("panel-photo-img");
      if (photoFig && photoImg) {
        if (spot.image) {
          photoImg.onerror = () => { photoFig.hidden = true; };
          photoImg.onload = () => { photoFig.hidden = false; };
          photoImg.alt = spot.imageAlt || spot.name;
          photoImg.src = spot.image; // hidden until it actually loads
        } else {
          photoFig.hidden = true;
          photoImg.onerror = null;
          photoImg.onload = null;
          photoImg.removeAttribute("src");
        }
      }
      els.coords.textContent = coords || "PINNED HOTSPOT";
      panel.classList.remove("hidden");
      panel.classList.add("visible");
      setRailShift(true);

      // interactive chart for pinned hotspots
      panelIndex = HOTSPOTS.indexOf(spot);
      if (navCount) navCount.textContent = "—";
      const series = panelIndex >= 0 ? makeSeries(spot.id) : null;
      if (series) {
        navCount.textContent = (panelIndex + 1) + " / " + HOTSPOTS.length;
        chartState.cfg = series.cfg;
        drawChart(series.pts, hex(spot.color), chartCanvas);
      }
      if (prevBtn) prevBtn.disabled = navCount.textContent === "—";
      if (nextBtn) nextBtn.disabled = navCount.textContent === "—";
    },
    closePanel() {
      if (!panel) return;
      panel.classList.remove("visible");
      panel.classList.add("hidden");
      setRailShift(false);
    }
  };

  if (els.close) {
    els.close.addEventListener("click", () => window.TerraTrendUI.closePanel());
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") window.TerraTrendUI.closePanel();
    if (!panel || !panel.classList.contains("visible")) return;
    if (e.key === "ArrowRight" && panelIndex >= 0) showCase(panelIndex + 1);
    if (e.key === "ArrowLeft" && panelIndex >= 0) showCase(panelIndex - 1);
  });

  // ---------- Mobile nav ----------
  const toggle = document.getElementById("nav-toggle");
  const nav = document.querySelector(".main-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      nav.classList.toggle("open");
      toggle.textContent = nav.classList.contains("open") ? "✕" : "☰";
    });
    nav.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => {
        nav.classList.remove("open");
        toggle.textContent = "☰";
      })
    );
  }

  // ---------- Panel prev/next navigation ----------
  let panelIndex = -1;
  const prevBtn = document.getElementById("panel-prev");
  const nextBtn = document.getElementById("panel-next");
  const navCount = document.getElementById("panel-nav-count");

  function showCase(i) {
    panelIndex = ((i % HOTSPOTS.length) + HOTSPOTS.length) % HOTSPOTS.length;
    const spot = HOTSPOTS[panelIndex];
    flyToHotspot(spot);
    window.TerraTrendUI.openPanel(spot);
  }
  if (prevBtn) prevBtn.addEventListener("click", () => showCase(panelIndex - 1));
  if (nextBtn) nextBtn.addEventListener("click", () => showCase(panelIndex + 1));

  // ---------- Neon marquee ticker ----------
  const tickerTrack = document.getElementById("ticker-track");
  if (tickerTrack && typeof HOTSPOTS !== "undefined") {
    const items = HOTSPOTS.map((spot) => {
      const dir = spot.trend === "up" ? "▲" : spot.trend === "down" ? "▼" : "◇";
      const dirClass = spot.trend === "down" ? "down" : "up";
      return `<span class="ticker-item">${spot.icon} ${spot.name.toUpperCase()} <b class="${dirClass}">${dir} ${shortRate(spot.rate).toUpperCase()}</b></span>`;
    });
    // two identical halves → translateX(-50%) loops seamlessly
    const half = document.createElement("div");
    half.className = "ticker-half";
    half.innerHTML = items.join("");
    tickerTrack.appendChild(half.cloneNode(true));
    tickerTrack.appendChild(half.cloneNode(true));
  }

  // ---------- Reveal-on-scroll for sections ----------
  const revealEls = document.querySelectorAll(".step, .hotspot-card, .about-facts div");
  const revealObs = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add("revealed");
          revealObs.unobserve(en.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  revealEls.forEach((el) => revealObs.observe(el));

  bindChartHover();
})();
