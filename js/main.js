/* ============================================================
   TerraTrend — UI wiring
   Variable selector · real data via TerraTrendData ·
   Mann-Kendall significance display · info panel · modals
   ============================================================ */

(function () {
  "use strict";

  const { drawChart, bindChartHover } = window.TerraTrendChart;

  function hex(c) { return "#" + c.toString(16).padStart(6, "0"); }
  function trendArrow(t) { return t === "up" ? "▲" : t === "down" ? "▼" : "↕"; }
  function shortRate(r) { return r.split(" ").slice(0, 5).join(" "); }

  function flyToHotspot(spot) {
    if (window.TerraTrendGlobe) {
      const idx = HOTSPOTS.indexOf(spot);
      if (idx >= 0) window.TerraTrendGlobe.selectHotspot(idx, false);
    }
  }

  // ---------- URL deep-link ----------
  function getSpotFromURL() {
    try {
      const id = new URLSearchParams(window.location.search).get("spot");
      return typeof HOTSPOTS !== "undefined" && id ? (HOTSPOTS.find(h => h.id === id) || null) : null;
    } catch { return null; }
  }
  function updateURL(spotId) {
    if (history.replaceState)
      history.replaceState(null, "", spotId ? "?spot=" + spotId : location.pathname);
  }

  // ---------- Chart ----------
  const chartTitleEl = document.getElementById("chart-title");
  const exploredSet = new Set();

  function showOnboardingHint() {
    if (sessionStorage.getItem("tt-hinted")) return;
    sessionStorage.setItem("tt-hinted", "1");
    const hint = document.createElement("div");
    hint.className = "onboard-hint";
    hint.innerHTML = '<span class="onboard-arrow">←</span><span>Pick a variable</span>';
    document.body.appendChild(hint);
    requestAnimationFrame(() => requestAnimationFrame(() => hint.classList.add("visible")));
    const dismiss = () => {
      hint.classList.remove("visible");
      hint.addEventListener("transitionend", () => hint.remove(), { once: true });
    };
    const dismissTimer = setTimeout(dismiss, 5000);
    pillWrap?.addEventListener("click", () => { clearTimeout(dismissTimer); dismiss(); }, { once: true });
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
      const tourBtnEl = document.getElementById("auto-tour-btn");
      if (tourBtnEl) tourBtnEl.hidden = false;

      // Scroll hint
      const scrollHintEl = document.getElementById("scroll-hint");
      if (scrollHintEl) {
        scrollHintEl.hidden = false;
        requestAnimationFrame(() => requestAnimationFrame(() => scrollHintEl.classList.add("visible")));
        window.addEventListener("scroll", () => {
          scrollHintEl.classList.remove("visible");
          scrollHintEl.addEventListener("transitionend", () => { scrollHintEl.hidden = true; }, { once: true });
        }, { once: true, passive: true });
      }

      setTimeout(() => {
        if (typeof HOTSPOTS !== "undefined" && HOTSPOTS.length) {
          const urlSpot = getSpotFromURL();
          if (urlSpot) {
            tourIndex = Math.max(0, HOTSPOTS.indexOf(urlSpot));
            flyToHotspot(urlSpot);
            window.TerraTrendUI.openPanel(urlSpot);
          }
        }
      }, 1800);
      setTimeout(showOnboardingHint, 2800);
      // Warn 3s before auto-tour starts, then launch at 15s
      if (!getSpotFromURL()) {
        autoTourPreTimer = setTimeout(() => {
          const btn = document.getElementById("auto-tour-btn");
          if (btn) { btn.classList.add("pending"); btn.textContent = "TOUR IN 3S…"; }
          autoTourPreTimer = setTimeout(startAutoTour, 3000);
        }, 12000);
      }
    });
  }

  // ---------- Variable selector ----------
  const pillWrap = document.getElementById("var-selector-pills");
  let activeHotspotId = null;
  let tourIndex = 0;

  // ---------- Auto-tour ----------
  let autoTourTimer    = null;
  let autoTourPreTimer = null;
  let autoTourActive   = false;

  function stopAutoTour() {
    clearTimeout(autoTourPreTimer);
    autoTourPreTimer = null;
    if (autoTourActive) {
      autoTourActive = false;
      clearInterval(autoTourTimer);
      autoTourTimer = null;
    }
    const btn = document.getElementById("auto-tour-btn");
    if (btn) { btn.classList.remove("active", "pending"); btn.textContent = "▶ AUTO-TOUR"; }
  }

  function startAutoTour() {
    if (autoTourActive) return;
    autoTourPreTimer = null;
    autoTourActive = true;
    const btn = document.getElementById("auto-tour-btn");
    if (btn) { btn.classList.remove("pending"); btn.classList.add("active"); btn.textContent = "⏹ TOURING"; }
    autoTourTimer = setInterval(() => {
      tourIndex = (tourIndex + 1) % HOTSPOTS.length;
      const spot = HOTSPOTS[tourIndex];
      flyToHotspot(spot);
      window.TerraTrendUI.openPanel(spot);
    }, 8000);
  }

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
        `<span class="pill-name">${spot.name}${spot.shortVal ? `<span class="pill-rate">${spot.shortVal}</span>` : ""}</span>` +
        `<canvas class="pill-spark" width="44" height="18" aria-hidden="true"></canvas>` +
        `<span class="pill-arrow ${spot.trend}">${trendArrow(spot.trend)}</span>`;
      pill.addEventListener("click", () => {
        stopAutoTour();
        tourIndex = i;
        activatePill(spot, i);
        flyToHotspot(spot);
        window.TerraTrendUI.openPanel(spot);
      });
      pillWrap.appendChild(pill);
    });
  }

  // Draw sparklines on all pills asynchronously after creation
  if (window.TerraTrendData && pillWrap && typeof HOTSPOTS !== "undefined") {
    HOTSPOTS.forEach((spot, i) => {
      window.TerraTrendData.loadCurated(spot).then(data => {
        if (!data?.series?.length) return;
        const sparkCanvas = pillWrap.children[i]?.querySelector(".pill-spark");
        if (sparkCanvas) drawChart(data.series, hex(spot.color), data.unit, sparkCanvas);
      }).catch(() => {});
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

  // ---------- Header scroll state + chatbot fade ----------
  const header = document.querySelector(".site-header");
  const siteFooter = document.querySelector(".site-footer");
  window.addEventListener("scroll", () => {
    if (header) header.classList.toggle("scrolled", window.scrollY > window.innerHeight - 80);
    const chatWrap = document.getElementById("chatbot-wrap");
    if (chatWrap && siteFooter) {
      // dist is negative when footer is visible, positive when below viewport
      const dist = siteFooter.getBoundingClientRect().top - window.innerHeight;
      // +150 buffer so chatbot stays fully visible until footer actually enters viewport
      chatWrap.style.opacity = Math.min(1, Math.max(0, (dist + 150) / 150));
    }
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

    const arrow = mk.trend === "up" ? "▲" : mk.trend === "down" ? "▼" : "↕";
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
    kicker:        document.getElementById("panel-kicker"),
    coords:        document.getElementById("panel-coords"),
    title:         document.getElementById("panel-title"),
    tagline:       document.getElementById("panel-tagline"),
    rate:          document.getElementById("panel-rate"),
    desc:          document.getElementById("panel-desc"),
    source:        document.getElementById("panel-source"),
    close:         document.getElementById("panel-close"),
    mission:       document.getElementById("panel-mission"),
    finding:       document.getElementById("panel-finding"),
    findingText:   document.getElementById("finding-text"),
    whyMatters:    document.getElementById("why-matters"),
    whyMattersText:document.getElementById("why-matters-text"),
    what:          document.getElementById("panel-what"),
    where:         document.getElementById("panel-where"),
    whatWhere:     document.getElementById("panel-what-where"),
    photoWrap:     document.getElementById("panel-photo-wrap"),
    photo:         document.getElementById("panel-photo"),
    chartDelta:    document.getElementById("chart-delta")
  };

  let panelIndex = -1;
  const prevBtn  = document.getElementById("panel-prev");
  const nextBtn  = document.getElementById("panel-next");
  const navCount = document.getElementById("panel-nav-count");

  window.TerraTrendUI = {
    async openPanel(spot, coords) {
      if (!panel) return;

      // Update page title
      document.title = spot.name + " — TerraTrend";

      // Fill static data immediately
      els.kicker.textContent  = "TREND FILE · " + spot.id.toUpperCase().replace(/-/g, " ");
      els.title.textContent   = spot.icon + "  " + spot.name;
      els.tagline.textContent = spot.tagline || "";
      els.rate.textContent    = "—";
      els.rate.classList.add("loading");
      els.desc.textContent    = spot.description;
      els.coords.textContent  = coords || "PINNED HOTSPOT";
      if (els.mission) els.mission.textContent = spot.mission || "";
      if (els.finding)  els.finding.hidden  = !spot.keyFinding;
      if (els.findingText && spot.keyFinding)   els.findingText.textContent   = spot.keyFinding;
      if (els.whyMatters) els.whyMatters.hidden = !spot.whyItMatters;
      if (els.whyMattersText && spot.whyItMatters) els.whyMattersText.textContent = spot.whyItMatters;
      if (els.what)  els.what.textContent  = spot.what  || "";
      if (els.where) els.where.textContent = spot.where || "";
      if (els.whatWhere) els.whatWhere.hidden = true;
      if (els.photo && els.photoWrap) {
        if (spot.image) {
          els.photo.src = spot.image;
          els.photo.alt = spot.imageAlt || spot.name;
          els.photoWrap.hidden = false;
          panel.classList.remove("no-photo");
        } else {
          els.photoWrap.hidden = true;
          panel.classList.add("no-photo");
        }
      }
      if (els.chartDelta) els.chartDelta.hidden = true;

      // Mutual exclusivity: close chatbot if open
      const chatPanelEl = document.getElementById("chatbot-panel");
      if (chatPanelEl) chatPanelEl.hidden = true;

      clearTimeout(panel._hideTimer);
      panel.classList.remove("hidden");
      void panel.offsetWidth;
      panel.classList.add("visible");
      setTimeout(() => els.close?.focus(), 350);

      // Stagger-reveal each panel section
      const panelBody = panel.querySelector(".panel-body");
      if (panelBody) {
        panelBody.classList.remove("entering");
        void panelBody.offsetWidth;
        panelBody.classList.add("entering");
      }

      if (window.TerraTrendGlobeControl) window.TerraTrendGlobeControl.pause();
      document.getElementById("chatbot-wrap")?.classList.add("panel-open");

      panelIndex = HOTSPOTS.indexOf(spot);
      if (panelIndex >= 0) {
        window.TerraTrendGlobe?.setHighlight?.(panelIndex);
        updateURL(spot.id);
        exploredSet.add(panelIndex);
        const counter = document.getElementById("explore-counter");
        if (counter) {
          counter.textContent = `INVESTIGATED · ${exploredSet.size} / ${HOTSPOTS.length}`;
          if (exploredSet.size === HOTSPOTS.length) counter.classList.add("all-explored");
        }
        const barFill = document.getElementById("explore-bar-fill");
        if (barFill) barFill.style.width = (exploredSet.size / HOTSPOTS.length * 100) + "%";
        const pill = pillWrap?.querySelectorAll(".var-pill")[panelIndex];
        if (pill) pill.classList.add("viewed");
      }
      if (navCount) navCount.textContent = panelIndex >= 0 ? (panelIndex + 1) + " / " + HOTSPOTS.length : "—";
      if (prevBtn) prevBtn.disabled = panelIndex < 0;
      if (nextBtn) nextBtn.disabled = panelIndex < 0;

      // Update variable selector pill
      if (panelIndex >= 0) activatePill(spot, panelIndex);

      const col = hex(spot.color);

      function applyData(data, upgrading) {
        if (!data) return;
        els.rate.classList.remove("loading");
        if (data.mkResult?.senSlope !== undefined) {
          const s = data.mkResult.senSlope;
          els.rate.textContent = (s >= 0 ? "+" : "") + s.toFixed(3) + " " + (data.unit || "") + " / yr (Sen's slope)";
          if (data.isLive) updateTickerItem(spot.id, s, data.unit || "", data.mkResult.trend || spot.trend);
        } else {
          els.rate.textContent = spot.rate;
        }
        if (spot.sourceUrl) {
          els.source.innerHTML = `DATA: <a href="${spot.sourceUrl}" target="_blank" rel="noopener noreferrer">${data.source}</a>`;
        } else {
          els.source.textContent = "DATA: " + data.source;
        }
        setDataBadge(data.isLive, data.source);
        renderMK(data.mkResult, col);
        if (chartTitleEl) chartTitleEl.textContent = data.label || "Trend series";
        if (data.series?.length > 0) {
          drawChart(data.series, col, data.unit);
          if (els.chartDelta && data.series.length >= 2) {
            const first = data.series[0], last = data.series[data.series.length - 1];
            const delta = last.value - first.value;
            const sign = delta >= 0 ? "+" : "";
            const absD = Math.abs(delta);
            const dp = absD >= 100 ? 1 : absD >= 10 ? 2 : 3;
            els.chartDelta.textContent = `Total: ${sign}${delta.toFixed(dp)} ${data.unit || ""} · ${first.year} → ${last.year}`;
            els.chartDelta.hidden = false;
          }
        }
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
        if (spot.sourceUrl) {
          els.source.innerHTML = `DATA: <a href="${spot.sourceUrl}" target="_blank" rel="noopener noreferrer">${spot.source}</a>`;
        } else {
          els.source.textContent = "DATA: " + spot.source;
        }
      }
    },

    closePanel() {
      if (!panel) return;
      stopAutoTour();
      panel.classList.remove("visible");
      clearTimeout(panel._hideTimer);
      panel._hideTimer = setTimeout(() => panel.classList.add("hidden"), 310);
      if (window.TerraTrendGlobeControl) window.TerraTrendGlobeControl.resume();
      document.getElementById("chatbot-wrap")?.classList.remove("panel-open");
      window.TerraTrendGlobe?.clearHighlight?.();
      updateURL(null);
      document.title = "TerraTrend: Earth System Trend Detective | NASA Space Apps 2026";
      pillWrap?.querySelector(".var-pill.active")?.focus();
    }
  };

  if (els.close) els.close.addEventListener("click", () => window.TerraTrendUI.closePanel());

  // Auto-tour toggle button
  const autoTourBtn = document.getElementById("auto-tour-btn");
  if (autoTourBtn) {
    autoTourBtn.addEventListener("click", () => {
      const wasActive = autoTourActive;
      stopAutoTour();
      if (!wasActive) startAutoTour();
    });
  }

  function showCase(i) {
    stopAutoTour();
    panelIndex = ((i % HOTSPOTS.length) + HOTSPOTS.length) % HOTSPOTS.length;
    tourIndex = panelIndex;
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

  // ---------- Share button ----------
  const shareBtn = document.getElementById("panel-share");
  if (shareBtn) {
    const shareSVG = shareBtn.innerHTML;
    shareBtn.addEventListener("click", () => {
      const id = panelIndex >= 0 ? HOTSPOTS[panelIndex].id : null;
      const url = location.origin + location.pathname + (id ? "?spot=" + id : "");
      const finish = (ok) => {
        shareBtn.setAttribute("data-copied", ok ? "yes" : "err");
        shareBtn.title = ok ? "Copied!" : "Copy link";
        setTimeout(() => { shareBtn.removeAttribute("data-copied"); shareBtn.title = "Copy link"; shareBtn.innerHTML = shareSVG; }, 2000);
        if (ok) shareBtn.innerHTML = "✓";
      };
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => finish(true)).catch(() => finish(false));
      else { prompt("Copy this link:", url); }
    });
  }

  // ---------- Chatbot FAB (placeholder) ----------
  const chatFab   = document.getElementById("chatbot-fab");
  const chatPanel = document.getElementById("chatbot-panel");
  const chatClose = document.getElementById("chatbot-close");
  if (chatFab && chatPanel) {
    chatFab.addEventListener("click", () => {
      const willOpen = chatPanel.hidden;
      chatPanel.hidden = !chatPanel.hidden;
      if (willOpen) window.TerraTrendUI.closePanel(); // mutual exclusivity
    });
    if (chatClose) chatClose.addEventListener("click", () => { chatPanel.hidden = true; });
  }

  // ---------- Ticker ----------
  const tickerTrack = document.getElementById("ticker-track");
  if (tickerTrack && typeof HOTSPOTS !== "undefined") {
    const items = HOTSPOTS.map(s => {
      const dir = s.trend === "up" ? "▲" : s.trend === "down" ? "▼" : "↕";
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
    const dir = trend === "up" ? "▲" : trend === "down" ? "▼" : "↕";
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
