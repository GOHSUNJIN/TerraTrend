/* ============================================================
   TerraTrend - Mann-Kendall trend test + Sen's slope
   Reference: Mann (1945), Kendall (1975), Sen (1968)
   ============================================================ */

window.MannKendall = (function () {
  "use strict";

  /* Abramowitz & Stegun normal CDF approximation (error < 7.5e-8) */
  function normalCDF(x) {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp((-x * x) / 2);
    const poly = t * (0.3193815 + t * (-0.3565638 + t * (1.7814779 + t * (-1.821256 + t * 1.3302744))));
    const p = 1 - d * poly;
    return x >= 0 ? p : 1 - p;
  }

  // Returns { s, z, pValue, senSlope, significant, confidence, trend }
  function test(values) {
    const n = values.length;
    if (n < 4) {
      return { s: 0, z: 0, pValue: 1, senSlope: 0, significant: false, confidence: "insufficient data", trend: "flat" };
    }

    // Kendall S statistic
    let s = 0;
    for (let i = 0; i < n - 1; i++) {
      for (let j = i + 1; j < n; j++) {
        const d = values[j] - values[i];
        if (d > 0) s++;
        else if (d < 0) s--;
      }
    }

    const varS = (n * (n - 1) * (2 * n + 5)) / 18; // variance of S, no ties correction
    const z = s > 0 ? (s - 1) / Math.sqrt(varS)
            : s < 0 ? (s + 1) / Math.sqrt(varS)    // continuity correction
            : 0;
    const pValue = 2 * (1 - normalCDF(Math.abs(z)));

    const slopes = [];
    for (let i = 0; i < n - 1; i++) {
      for (let j = i + 1; j < n; j++) {
        slopes.push((values[j] - values[i]) / (j - i));
      }
    }
    slopes.sort((a, b) => a - b);
    const senSlope = slopes[Math.floor(slopes.length / 2)];

    const significant = pValue < 0.05;
    const confidence =
      pValue < 0.001 ? ">99.9%" :
      pValue < 0.01  ? ">99%"   :
      pValue < 0.05  ? ">95%"   :
      pValue < 0.10  ? ">90%"   :
      `${Math.round((1 - pValue) * 100)}%`;

    return {
      s, z: +z.toFixed(3), pValue: +pValue.toFixed(4),
      senSlope: +senSlope.toFixed(4),
      significant, confidence,
      trend: s > 0 ? "up" : s < 0 ? "down" : "flat"
    };
  }

  return { test };
})();
