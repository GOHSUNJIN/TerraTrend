/* ============================================================
   TerraTrend — UI wiring
   Variable selector · real data via TerraTrendData ·
   Mann-Kendall significance display · info panel · modals
   ============================================================ */

(function () {
  "use strict";

  function hex(c) { return "#" + c.toString(16).padStart(6, "0"); }
  function trendArrow(t) { return t === "up" ? "▲" : t === "down" ? "▼" : "◇"; }
  function shortRate(r) { return r.split(" ").slice(0, 5).join(" "); }

  function flyToHotspot(spot) {
    if (window.TerraTrendGlobe) {
      const idx = HOTSPOTS.indexOf(spot);
      if (idx >= 0) window.TerraTrendGlobe.selectHotspot(idx, false);
    }
  }

  // ---------- Chart ----------
  const chartCanvas = document.getElementById("panel-chart");
  const chartTip    = document.getElementById("chart-tip");
  const chartTitleEl = document.getElementById("chart-title");
  let chartState = { pts: [], color: "#22e0ee" };

  function fmtVal(v, unit) {
    const a = Math.abs(v);
    const digits = a >= 100 ? 1 : a >= 10 ? 2 : 3;
    const sign = v >= 0 ? "+" : "−";
    return sign + Math.abs(v).toFixed(digits) + (unit ? " " + unit : "");
  }

  function drawChart(pts, color, unit, targetCanvas) {
    const canvas = targetCanvas || chartCanvas;
    if (!canvas || !pts.length) return;
    const ctx = canvas.getContext && canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    const isMini = !!targetCanvas;
    const pad = isMini ? { l: 2, r: 2, t: 4, b: 4 } : { l: 42, r: 12, t: 14, b: 20 };

    ctx.clearRect(0, 0, W, H);

    const vals = pts.map(p => p.value);
    let min = Math.min(...vals), max = Math.max(...vals);
    if (max - min < 1e-9) { max += 1; min -= 1; }
    const span = max - min;
    min -= span * 0.12; max += span * 0.12;

    const xFn = i => pad.l + (i / (pts.length - 1)) * (W - pad.l - pad.r);
    const yFn = v => pad.t + (1 - (v - min) / (max - min)) * (H - pad.t - pad.b);

    // Grid
    if (!isMini) {
      ctx.strokeStyle = "rgba(160,190,240,0.08)";
      ctx.lineWidth = 1;
      for (let g = 0; g <= 4; g++) {
        const gy = pad.t + (g / 4) * (H - pad.t - pad.b);
        ctx.beginPath(); ctx.moveTo(pad.l, gy); ctx.lineTo(W - pad.r, gy); ctx.stroke();
      }
      ctx.font = "9px IBM Plex Mono, monospace";
      ctx.fillStyle = "rgba(159,176,205,0.52)";
      ctx.textAlign = "right";
      [0, 0.5, 1].forEach(t => {
        const val = max - t * (max - min);
        const gy = pad.t + t * (H - pad.t - pad.b);
        const a = Math.abs(val), d = a >= 100 ? 0 : a >= 10 ? 1 : 2;
        ctx.fillText((val >= 0 ? "+" : "-") + a.toFixed(d), pad.l - 4, gy + 3);
      });
      ctx.fillStyle = "rgba(159,176,205,0.6)";
      ctx.textAlign = "left";
      ctx.fillText(String(pts[0].year), pad.l, H - 4);
      ctx.textAlign = "right";
      ctx.fillText(String(pts[pts.length - 1].year), W - pad.r, H - 4);
      ctx.textAlign = "left";
    }

    // Trend line (linear regression overlay)
    if (!isMini && pts.length > 2) {
      const n = pts.length;
      const mx = (n - 1) / 2;
      const my = vals.reduce((a, b) => a + b, 0) / n;
      let num = 0, den = 0;
      vals.forEach((v, i) => { num += (i - mx) * (v - my); den += (i - mx) ** 2; });
      const slope = den ? num / den : 0;
      const inter = my - slope * mx;
      ctx.beginPath();
      ctx.moveTo(xFn(0), yFn(inter));
      ctx.lineTo(xFn(n - 1), yFn(inter + slope * (n - 1)));
      ctx.strokeStyle = color + "55";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Area fill
    const grad = ctx.createLinearGradient(0, pad.t, 0, H - pad.b);
    grad.addColorStop(0, color + "44");
    grad.addColorStop(1, color + "00");
    ctx.beginPath();
    ctx.moveTo(xFn(0), yFn(vals[0]));
    pts.forEach((p, i) => ctx.lineTo(xFn(i), yFn(p.value)));
    ctx.lineTo(xFn(pts.length - 1), H - pad.b);
    ctx.lineTo(xFn(0), H - pad.b);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.moveTo(xFn(0), yFn(vals[0]));
    pts.forEach((p, i) => ctx.lineTo(xFn(i), yFn(p.value)));
    ctx.strokeStyle = color;
    ctx.lineWidth = isMini ? 1.5 : 2;
    ctx.lineJoin = "round";
    ctx.stroke();

    if (!isMini) {
      ctx.beginPath();
      ctx.arc(xFn(0), yFn(vals[0]), 2.5, 0, Math.PI * 2);
      ctx.arc(xFn(pts.length - 1), yFn(vals[pts.length - 1]), 2.5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }

    if (!targetCanvas) {
      chartState = { pts, color, unit, x: xFn, y: yFn, W, H, pad };
    }
  }

  function bindChartHover() {
    if (!chartCanvas) return;
    chartCanvas.addEventListener("pointermove", e => {
      const { pts, color, unit } = chartState;
      if (!pts.length) return;
      const rect = chartCanvas.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * chartCanvas.width;
      const pL = chartState.pad?.l ?? 8, pR = chartState.pad?.r ?? 12;
      const idx = Math.round(((px - pL) / (chartCanvas.width - pL - pR)) * (pts.length - 1));
      const c = Math.max(0, Math.min(pts.length - 1, idx));
      const p = pts[c];
      chartTip.innerHTML = `${p.year} · <span class="tip-val">${fmtVal(p.value, unit)}</span>`;
      chartTip.hidden = false;
      chartTip.style.left = Math.max(40, Math.min(chartCanvas.width - 40, px)) / chartCanvas.width * 100 + "%";
      chartTip.style.top = "-26px";
      drawChart(pts, color, unit);
      const ctx = chartCanvas.getContext("2d");
      ctx.beginPath();
      ctx.arc(chartState.x(c), chartState.y(p.value), 4, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
    });
    chartCanvas.addEventListener("pointerleave", () => {
      chartTip.hidden = true;
      drawChart(chartState.pts, chartState.color, chartState.unit);
    });
  }

  // ---------- Splash ----------
  const splash       = document.getElementById("splash");
  const launchBtn    = document.getElementById("launch-btn");
  const varSel       = document.getElementById("var-selector");
  const headerTools  = document.getElementById("header-tools");

  if (launchBtn) {
    launchBtn.addEventListener("click", () => {
      splash.classList.add("dismissed");
      document.body.classList.add("app-armed");
      if (varSel) varSel.hidden = false;
      if (headerTools) headerTools.hidden = false;
      const chatWrap = document.getElementById("chatbot-wrap");
      if (chatWrap) chatWrap.hidden = false;
      setTimeout(() => {
        if (typeof HOTSPOTS !== "undefined" && HOTSPOTS.length) {
          flyToHotspot(HOTSPOTS[0]);
          window.TerraTrendUI.openPanel(HOTSPOTS[0]);
        }
      }, 1800);
    });
  }

  // ---------- Variable selector ----------
  const pillWrap = document.getElementById("var-selector-pills");
  let activeHotspotId = null;

  if (pillWrap && typeof HOTSPOTS !== "undefined") {
    HOTSPOTS.forEach((spot, i) => {
      const pill = document.createElement("button");
      pill.className = "var-pill";
      pill.setAttribute("role", "option");
      pill.setAttribute("aria-label", `Select ${spot.name}`);
      pill.dataset.id = spot.id;
      pill.style.setProperty("--pill-col", hex(spot.color));
      pill.innerHTML =
        `<span class="pill-icon">${spot.icon}</span>` +
        `<span class="pill-text"><span class="pill-name">${spot.name}</span><span class="pill-rate">${shortRate(spot.rate)}</span></span>` +
        `<span class="pill-arrow ${spot.trend}">${trendArrow(spot.trend)}</span>`;
      pill.addEventListener("click", () => {
        activatePill(spot, i);
        flyToHotspot(spot);
        window.TerraTrendUI.openPanel(spot);
      });
      pillWrap.appendChild(pill);
    });
  }

  function activatePill(spot, idx) {
    activeHotspotId = spot.id;
    document.querySelectorAll(".var-pill").forEach((p, i) => {
      p.classList.toggle("active", i === idx);
      p.setAttribute("aria-selected", i === idx ? "true" : "false");
    });
  }

  // ---------- Modals ----------
  function setupModal(modalId, openers) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    const open = () => { modal.hidden = false; document.body.classList.add("modal-open"); };
    const close = () => { modal.hidden = true; document.body.classList.remove("modal-open"); };
    openers.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("click", e => { e.preventDefault(); open(); });
    });
    modal.querySelectorAll("[data-method-close]").forEach(el => el.addEventListener("click", close));
    const closeBtn = modal.querySelector(".panel-close");
    if (closeBtn) closeBtn.addEventListener("click", close);
    document.addEventListener("keydown", e => { if (e.key === "Escape" && !modal.hidden) close(); });
    return { open, close };
  }
  setupModal("method-modal", ["rail-method"]);
  setupModal("about-modal",  ["rail-about"]);

  const fsBtn = document.getElementById("rail-fullscreen");
  if (fsBtn) {
    fsBtn.addEventListener("click", () => {
      document.fullscreenElement
        ? document.exitFullscreen && document.exitFullscreen()
        : document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
    });
  }

  // ---------- Header scroll state ----------
  const header = document.querySelector(".site-header");
  window.addEventListener("scroll", () => {
    if (header) header.classList.toggle("scrolled", window.scrollY > window.innerHeight - 80);
  }, { passive: true });

  // ---------- Data badge ----------
  const dataBadge      = document.getElementById("data-badge");
  const dataBadgeLabel = document.getElementById("data-badge-label");

  function setDataBadge(isLive, sourceLabel) {
    if (!dataBadge) return;
    dataBadge.hidden = false;
    dataBadge.className = "data-badge " + (isLive ? "live" : "archived");
    dataBadgeLabel.textContent = isLive ? "LIVE DATA" : "ARCHIVED DATA";
    dataBadge.title = sourceLabel || "";
  }

  // ---------- Mann-Kendall block ----------
  const mkBlock = document.getElementById("mk-block");
  const mkEls = {
    badge: document.getElementById("mk-badge"),
    trend: document.getElementById("mk-trend"),
  };
  const mkStatsLine = document.getElementById("mk-stats-line");

  function renderMK(mk, color) {
    if (!mk || !mkBlock) return;
    mkBlock.hidden = false;
    mkBlock.style.setProperty("--mk-col", color || "#8b7cff");

    const arrow = mk.trend === "up" ? "▲" : mk.trend === "down" ? "▼" : "◇";
    mkEls.badge.textContent = mk.significant ? "SIGNIFICANT" : "NOT SIGNIFICANT";
    mkEls.badge.className   = "mk-badge " + (mk.significant ? "sig-yes" : "sig-no");
    mkEls.trend.textContent = arrow + " " + mk.trend.toUpperCase();
    if (mkStatsLine) {
      const pStr = mk.pValue < 0.001 ? "< 0.001" : mk.pValue.toFixed(3);
      mkStatsLine.textContent = `S = ${mk.s} · Z = ${mk.z.toFixed(2)} · p = ${pStr} · ${mk.confidence}`;
    }
  }

  // ---------- Info panel ----------
  const panel = document.getElementById("info-panel");
  const els = {
    kicker:  document.getElementById("panel-kicker"),
    coords:  document.getElementById("panel-coords"),
    title:   document.getElementById("panel-title"),
    tagline: document.getElementById("panel-tagline"),
    rate:    document.getElementById("panel-rate"),
    desc:    document.getElementById("panel-desc"),
    source:  document.getElementById("panel-source"),
    close:   document.getElementById("panel-close")
  };

  let panelIndex = -1;
  const prevBtn  = document.getElementById("panel-prev");
  const nextBtn  = document.getElementById("panel-next");
  const navCount = document.getElementById("panel-nav-count");

  window.TerraTrendUI = {
    async openPanel(spot, coords) {
      if (!panel) return;

      // Fill static data immediately
      els.kicker.textContent  = "TREND FILE · " + spot.id.toUpperCase().replace(/-/g, " ");
      els.title.textContent   = spot.icon + "  " + spot.name;
      els.tagline.textContent = spot.tagline || "";
      els.rate.textContent    = "—";
      els.desc.textContent    = spot.description;
      els.coords.textContent  = coords || "PINNED HOTSPOT";

      panel.classList.remove("hidden");
      panel.classList.add("visible");
      if (window.TerraTrendGlobeControl) window.TerraTrendGlobeControl.pause();
      document.getElementById("chatbot-wrap")?.classList.add("panel-open");

      panelIndex = HOTSPOTS.indexOf(spot);
      if (navCount) navCount.textContent = panelIndex >= 0 ? (panelIndex + 1) + " / " + HOTSPOTS.length : "—";
      if (prevBtn) prevBtn.disabled = panelIndex < 0;
      if (nextBtn) nextBtn.disabled = panelIndex < 0;

      // Update variable selector pill
      if (panelIndex >= 0) activatePill(spot, panelIndex);

      const col = hex(spot.color);

      function applyData(data, upgrading) {
        if (!data) return;
        if (data.mkResult?.senSlope !== undefined) {
          const s = data.mkResult.senSlope;
          els.rate.textContent = (s >= 0 ? "+" : "") + s.toFixed(3) + " " + (data.unit || "") + " / yr (Sen's slope)";
          if (data.isLive) updateTickerItem(spot.id, s, data.unit || "", data.mkResult.trend || spot.trend);
        } else {
          els.rate.textContent = spot.rate;
        }
        els.source.textContent = "DATA: " + data.source;
        setDataBadge(data.isLive, data.source);
        renderMK(data.mkResult, col);
        if (chartTitleEl) chartTitleEl.textContent = data.label || "Trend series";
        if (data.series?.length > 0) drawChart(data.series, col, data.unit);
      }

      if (window.TerraTrendData) {
        if (mkBlock) mkBlock.hidden = true;

        // Step 1: show curated data instantly (no waiting)
        const fast = await window.TerraTrendData.loadCurated(spot);
        if (fast) {
          applyData(fast, false);
          if (dataBadge) { dataBadge.hidden = false; dataBadgeLabel.textContent = "CHECKING…"; dataBadge.className = "data-badge loading"; }
        }

        // Step 2: try live source in background, upgrade if it succeeds
        window.TerraTrendData.load(spot).then(live => {
          if (live?.isLive) applyData(live, true);
          else if (dataBadge) { dataBadge.className = "data-badge archived"; dataBadgeLabel.textContent = "ARCHIVED DATA"; }
        }).catch(() => {
          if (dataBadge) { dataBadge.className = "data-badge archived"; dataBadgeLabel.textContent = "ARCHIVED DATA"; }
        });
      } else {
        els.rate.textContent   = spot.rate;
        els.source.textContent = "DATA: " + spot.source;
      }
    },

    closePanel() {
      if (!panel) return;
      panel.classList.remove("visible");
      panel.classList.add("hidden");
      if (window.TerraTrendGlobeControl) window.TerraTrendGlobeControl.resume();
      document.getElementById("chatbot-wrap")?.classList.remove("panel-open");
    }
  };

  if (els.close) els.close.addEventListener("click", () => window.TerraTrendUI.closePanel());

  function showCase(i) {
    panelIndex = ((i % HOTSPOTS.length) + HOTSPOTS.length) % HOTSPOTS.length;
    const spot = HOTSPOTS[panelIndex];
    flyToHotspot(spot);
    window.TerraTrendUI.openPanel(spot);
  }
  if (prevBtn) prevBtn.addEventListener("click", () => showCase(panelIndex - 1));
  if (nextBtn) nextBtn.addEventListener("click", () => showCase(panelIndex + 1));

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") window.TerraTrendUI.closePanel();
    if (!panel || !panel.classList.contains("visible")) return;
    if (e.key === "ArrowRight" && panelIndex >= 0) showCase(panelIndex + 1);
    if (e.key === "ArrowLeft"  && panelIndex >= 0) showCase(panelIndex - 1);
  });

  // ---------- Chatbot FAB (placeholder) ----------
  const chatFab   = document.getElementById("chatbot-fab");
  const chatPanel = document.getElementById("chatbot-panel");
  const chatClose = document.getElementById("chatbot-close");
  if (chatFab && chatPanel) {
    chatFab.addEventListener("click", () => { chatPanel.hidden = !chatPanel.hidden; });
    if (chatClose) chatClose.addEventListener("click", () => { chatPanel.hidden = true; });
  }

  // ---------- Ticker ----------
  const tickerTrack = document.getElementById("ticker-track");
  if (tickerTrack && typeof HOTSPOTS !== "undefined") {
    const items = HOTSPOTS.map(s => {
      const dir = s.trend === "up" ? "▲" : s.trend === "down" ? "▼" : "◇";
      const cls = s.trend === "down" ? "down" : s.trend === "mixed" ? "mixed" : "up";
      return `<span class="ticker-item" data-ticker-id="${s.id}"><span class="ticker-icon">${s.icon}</span>${s.name.toUpperCase()}<b class="${cls}">${dir} ${shortRate(s.rate).toUpperCase()}</b></span>`;
    });
    const half = document.createElement("div");
    half.className = "ticker-half";
    half.innerHTML = items.join("");
    tickerTrack.appendChild(half.cloneNode(true));
    tickerTrack.appendChild(half.cloneNode(true));
  }

  function updateTickerItem(id, senSlope, unit, trend) {
    const dir = trend === "up" ? "▲" : trend === "down" ? "▼" : "◇";
    const cls = trend === "down" ? "down" : trend === "mixed" ? "mixed" : "up";
    const val = (senSlope >= 0 ? "+" : "") + Math.abs(senSlope).toFixed(2) + (unit ? " " + unit.toUpperCase() : "");
    document.querySelectorAll(`.ticker-item[data-ticker-id="${id}"] b`).forEach(b => {
      b.className = cls;
      b.textContent = dir + " " + val + " / YR";
    });
  }

  // ---------- Scroll reveals ----------
  const revealObs = new IntersectionObserver(
    entries => entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add("revealed"); revealObs.unobserve(en.target); } }),
    { threshold: 0.15 }
  );
  document.querySelectorAll(".step, .about-facts div").forEach(el => revealObs.observe(el));

  bindChartHover();
})();
