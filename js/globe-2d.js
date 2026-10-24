/* ============================================================
   TerraTrend — Canvas 2D orthographic globe fallback
   Used when WebGL is unavailable (hardware acceleration off).
   Fetches world-atlas TopoJSON from jsDelivr, decodes it in
   pure JS (no topojson library), renders an orthographic
   projection on the same #globe-canvas element.
   Implements window.TerraTrendGlobe so the rest of the app
   works identically whether 3D or 2D.
   ============================================================ */

window.Globe2D = (function () {
  "use strict";

  const TOPO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
  const OCEAN_COLOR   = "#060d1f";
  const LAND_COLOR    = "#1a2e4a";
  const LAND_STROKE   = "#2a4a6a";
  const GRATICULE_COL = "rgba(80,130,200,0.12)";
  const SPHERE_GLOW   = "rgba(34,100,200,0.18)";
  const MARKER_COLORS = {};

  /* ---------- Minimal TopoJSON decoder ----------
     Handles Polygon and MultiPolygon geometries.
     No external dependency. */
  function decodeTopojson(topo, objectName) {
    const obj  = topo.objects[objectName];
    const sc   = topo.transform.scale;
    const tr   = topo.transform.translate;

    /* Decode delta-encoded arcs to [lon, lat] */
    const decoded = topo.arcs.map(arc => {
      let x = 0, y = 0;
      return arc.map(([dx, dy]) => {
        x += dx; y += dy;
        return [x * sc[0] + tr[0], y * sc[1] + tr[1]];
      });
    });

    function ringCoords(arcIdxList) {
      const pts = [];
      for (const i of arcIdxList) {
        const arc = i >= 0 ? decoded[i] : [...decoded[~i]].reverse();
        pts.push(...(pts.length ? arc.slice(1) : arc));
      }
      return pts;
    }

    const features = [];
    for (const geom of obj.geometries) {
      let polys = [];
      if (geom.type === "Polygon") {
        polys = [geom.arcs.map(ringCoords)];
      } else if (geom.type === "MultiPolygon") {
        polys = geom.arcs.map(p => p.map(ringCoords));
      }
      features.push({ type: geom.type, polys });
    }
    return features;
  }

  /* ---------- Orthographic projection ---------- */
  function ortho(lon, lat, rotLon, rotLat, cx, cy, R) {
    const λ  = (lon - rotLon) * Math.PI / 180;
    const φ  = lat            * Math.PI / 180;
    const φ0 = rotLat         * Math.PI / 180;
    const cosC = Math.sin(φ0) * Math.sin(φ) + Math.cos(φ0) * Math.cos(φ) * Math.cos(λ);
    if (cosC < 0) return null; // behind the sphere
    const x =  R * Math.cos(φ) * Math.sin(λ);
    const y = -R * (Math.cos(φ0) * Math.sin(φ) - Math.sin(φ0) * Math.cos(φ) * Math.cos(λ));
    return [cx + x, cy + y];
  }

  /* ---------- Init ---------- */
  function init(canvas, hotspots, onHotspotClick, onSurfaceClick) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let features = [];
    let rotLon = 0, rotLat = 20;
    let dragging = false, lastX = 0, lastY = 0;
    let velX = 0.3;
    let animFrame = null;
    let activeIdx = -1;
    let hoveredIdx = -1;
    let tooltip = { visible: false, text: "", x: 0, y: 0 };

    /* Size canvas to window */
    function resize() {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    window.addEventListener("resize", () => { resize(); draw(); });
    resize();

    /* Fetch world geometry */
    fetch(TOPO_URL)
      .then(r => r.json())
      .then(topo => {
        features = decodeTopojson(topo, "countries");
        draw();
        loop();
      })
      .catch(() => {
        // Even if fetch fails just show the spinning ocean sphere
        draw();
        loop();
      });

    /* ---------- Draw one frame ---------- */
    function draw() {
      const W = canvas.width, H = canvas.height;
      const R = Math.min(W, H) * 0.42;
      const cx = W / 2, cy = H / 2;

      ctx.clearRect(0, 0, W, H);

      /* Atmosphere glow */
      const atm = ctx.createRadialGradient(cx, cy, R * 0.88, cx, cy, R * 1.14);
      atm.addColorStop(0, "rgba(34,130,255,0.22)");
      atm.addColorStop(1, "rgba(0,0,0,0)");
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.14, 0, Math.PI * 2);
      ctx.fillStyle = atm;
      ctx.fill();

      /* Ocean */
      const ocean = ctx.createRadialGradient(cx - R * 0.28, cy - R * 0.22, 0, cx, cy, R);
      ocean.addColorStop(0, "#0d2040");
      ocean.addColorStop(1, OCEAN_COLOR);
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = ocean;
      ctx.fill();

      /* Graticule (10° grid) */
      ctx.strokeStyle = GRATICULE_COL;
      ctx.lineWidth = 0.5;
      for (let lon = -180; lon <= 180; lon += 30) {
        ctx.beginPath();
        let first = true;
        for (let lat = -90; lat <= 90; lat += 2) {
          const p = ortho(lon, lat, rotLon, rotLat, cx, cy, R);
          if (!p) { first = true; continue; }
          if (first) { ctx.moveTo(p[0], p[1]); first = false; } else ctx.lineTo(p[0], p[1]);
        }
        ctx.stroke();
      }
      for (let lat = -90; lat <= 90; lat += 30) {
        ctx.beginPath();
        let first = true;
        for (let lon = -180; lon <= 180; lon += 2) {
          const p = ortho(lon, lat, rotLon, rotLat, cx, cy, R);
          if (!p) { first = true; continue; }
          if (first) { ctx.moveTo(p[0], p[1]); first = false; } else ctx.lineTo(p[0], p[1]);
        }
        ctx.stroke();
      }

      /* Land */
      ctx.fillStyle = LAND_COLOR;
      ctx.strokeStyle = LAND_STROKE;
      ctx.lineWidth = 0.8;
      for (const feat of features) {
        for (const poly of feat.polys) {
          for (const ring of poly) {
            ctx.beginPath();
            let first = true;
            for (const [lon, lat] of ring) {
              const p = ortho(lon, lat, rotLon, rotLat, cx, cy, R);
              if (!p) { first = true; continue; }
              if (first) { ctx.moveTo(p[0], p[1]); first = false; } else ctx.lineTo(p[0], p[1]);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }
        }
      }

      /* Globe rim */
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(60,120,220,0.35)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      /* Hotspot markers */
      if (hotspots) {
        hotspots.forEach((spot, i) => {
          const p = ortho(spot.lon, spot.lat, rotLon, rotLat, cx, cy, R);
          if (!p) return;
          const col = "#" + spot.color.toString(16).padStart(6, "0");
          const isActive  = i === activeIdx;
          const isHovered = i === hoveredIdx;
          const mr = isActive ? 10 : isHovered ? 8 : 6;

          /* Glow ring */
          const grd = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], mr * 2.5);
          grd.addColorStop(0, col + "88");
          grd.addColorStop(1, col + "00");
          ctx.beginPath();
          ctx.arc(p[0], p[1], mr * 2.5, 0, Math.PI * 2);
          ctx.fillStyle = grd;
          ctx.fill();

          /* Dot */
          ctx.beginPath();
          ctx.arc(p[0], p[1], mr, 0, Math.PI * 2);
          ctx.fillStyle = isActive ? col : col + "cc";
          ctx.fill();
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = isActive ? 2 : 1;
          ctx.stroke();
        });
      }

      /* Tooltip */
      if (tooltip.visible) {
        const pad = 10;
        ctx.font = "13px IBM Plex Mono, monospace";
        const tw = ctx.measureText(tooltip.text).width;
        const tx = Math.min(tooltip.x + 14, W - tw - pad * 2 - 4);
        const ty = tooltip.y - 28;
        ctx.fillStyle = "rgba(9,10,24,0.92)";
        ctx.beginPath();
        ctx.roundRect(tx - pad, ty - 16, tw + pad * 2, 28, 6);
        ctx.fill();
        ctx.strokeStyle = "rgba(139,124,255,0.5)";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = "#eef0ff";
        ctx.fillText(tooltip.text, tx, ty);
      }
    }

    /* ---------- Auto-spin loop ---------- */
    function loop() {
      if (!dragging) rotLon += velX * 0.05;
      draw();
      animFrame = requestAnimationFrame(loop);
    }

    /* ---------- Hit-test: which hotspot is near screen point? ---------- */
    function hitHotspot(ex, ey) {
      if (!hotspots) return -1;
      const W = canvas.width, H = canvas.height;
      const R = Math.min(W, H) * 0.42;
      const cx = W / 2, cy = H / 2;
      let best = -1, bestD = 22;
      hotspots.forEach((spot, i) => {
        const p = ortho(spot.lon, spot.lat, rotLon, rotLat, cx, cy, R);
        if (!p) return;
        const d = Math.hypot(ex - p[0], ey - p[1]);
        if (d < bestD) { bestD = d; best = i; }
      });
      return best;
    }

    /* ---------- Reverse-project screen point to lat/lon ---------- */
    function screenToLatLon(ex, ey) {
      const W = canvas.width, H = canvas.height;
      const R = Math.min(W, H) * 0.42;
      const cx = W / 2, cy = H / 2;
      const dx = (ex - cx) / R, dy = (ey - cy) / R;
      const r2 = dx * dx + dy * dy;
      if (r2 > 1) return null;
      const z  = Math.sqrt(1 - r2);
      const φ0 = rotLat * Math.PI / 180;
      const lat = Math.asin(dy * Math.cos(φ0) + z * Math.sin(φ0)) * 180 / Math.PI;
      const lon = rotLon + Math.atan2(dx, z * Math.cos(φ0) - dy * Math.sin(φ0)) * 180 / Math.PI;
      return { lat, lon };
    }

    /* ---------- Mouse / touch events ---------- */
    canvas.addEventListener("pointerdown", e => {
      dragging = true; lastX = e.clientX; lastY = e.clientY; velX = 0;
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener("pointermove", e => {
      if (dragging) {
        const dx = e.clientX - lastX;
        rotLon += dx * 0.4;
        velX = dx * 0.4;
        lastX = e.clientX; lastY = e.clientY;
      } else {
        const hi = hitHotspot(e.clientX, e.clientY);
        hoveredIdx = hi;
        canvas.style.cursor = hi >= 0 ? "pointer" : "grab";
        if (hi >= 0) {
          tooltip = { visible: true, text: hotspots[hi].name + " — click to open", x: e.clientX, y: e.clientY };
        } else {
          tooltip.visible = false;
        }
      }
    });
    canvas.addEventListener("pointerup", e => {
      const moved = Math.abs(e.clientX - lastX) + Math.abs(e.clientY - lastY);
      dragging = false;
      if (moved < 5) {
        const hi = hitHotspot(e.clientX, e.clientY);
        if (hi >= 0) {
          activeIdx = hi;
          if (onHotspotClick) onHotspotClick(hi);
        } else {
          const ll = screenToLatLon(e.clientX, e.clientY);
          if (ll && onSurfaceClick) onSurfaceClick(ll.lat, ll.lon);
        }
      }
    });
    canvas.style.cursor = "grab";

    /* ---------- Public API (matches TerraTrendGlobe interface) ---------- */
    window.TerraTrendGlobe = {
      selectHotspot(idx) {
        activeIdx = idx;
        if (hotspots && hotspots[idx]) {
          rotLon = -hotspots[idx].lon + 15;
        }
      }
    };
  }

  return { init };
})();
