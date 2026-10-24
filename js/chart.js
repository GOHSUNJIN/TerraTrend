/* TerraTrend - chart.js
   Interactive trend-series chart rendered on a <canvas> element.
   Exposes window.TerraTrendChart = { drawChart, fmtVal, bindChartHover }. */

window.TerraTrendChart = (function () {
  "use strict";

  let chartState = { pts: [], color: "#22e0ee" };

  function fmtVal(v, unit) {
    const a = Math.abs(v);
    const digits = a >= 100 ? 1 : a >= 10 ? 2 : 3;
    const sign = v >= 0 ? "+" : "−";
    return sign + Math.abs(v).toFixed(digits) + (unit ? " " + unit : "");
  }

  function drawChart(pts, color, unit, targetCanvas) {
    const canvas = targetCanvas || document.getElementById("panel-chart");
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
      if (unit) {
        ctx.fillStyle = "rgba(159,176,205,0.38)";
        ctx.fillText(unit, W - pad.r, pad.t + 10);
      }
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
    const chartCanvas = document.getElementById("panel-chart");
    const chartTip    = document.getElementById("chart-tip");
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

  return { drawChart, fmtVal, bindChartHover };
})();
