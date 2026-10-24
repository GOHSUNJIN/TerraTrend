/* ============================================================
   TerraTrend - 3D interactive Earth (Three.js r160, global build)
   - Auto-spins, drag to rotate, inertia, tilt clamped
   - Pre-pinned hotspot markers (HOTSPOTS) with hover tooltips
   - CLICK ANYWHERE: converts the 3D point to lat/lon, finds the
     regional trend zone (REGION_ZONES) and opens its case file
   - Expanding ping ring marks where you clicked
   ============================================================ */

(function () {
  "use strict";

  // ---------- Graceful degradation ----------
  // A missing WebGL context (hardware acceleration off, GPU blocklisted,
  // remote desktop) or a blocked 3D library used to throw and leave the
  // canvas black with no explanation. Detect both and show a friendly
  // overlay instead of failing silently.
  function showGlobeFallback(title, body) {
    if (document.getElementById("globe-fallback")) return;
    const box = document.createElement("div");
    box.id = "globe-fallback";
    box.className = "globe-fallback";
    box.innerHTML =
      "<div class='globe-fallback-card'>" +
      "<h3>" + title + "</h3>" +
      "<p>" + body + "</p>" +
      "<button type='button' id='globe-retry' class='btn-ghost'>RETRY SCAN</button>" +
      "</div>";
    box.querySelector("#globe-retry").addEventListener("click", () => window.location.reload());
    const stage = document.querySelector(".globe-stage");
    (stage || document.body).appendChild(box);
  }

  function webglSupported() {
    try {
      const probe = document.createElement("canvas");
      return !!(
        probe.getContext("webgl2") ||
        probe.getContext("webgl") ||
        probe.getContext("experimental-webgl")
      );
    } catch (e) {
      return false;
    }
  }

  const canvas = document.getElementById("globe-canvas");

  /* ---- Route to 2D canvas fallback if WebGL is unavailable ---- */
  function startFallback2D() {
    if (typeof Globe2D === "undefined") return;
    document.body.classList.add("globe-2d-mode");
    Globe2D.init(
      canvas,
      typeof HOTSPOTS !== "undefined" ? HOTSPOTS : [],
      function onHotspot(idx) {
        const spot = HOTSPOTS[idx];
        if (spot && window.TerraTrendUI) window.TerraTrendUI.openPanel(spot);
      },
      function onSurface(lat, lon) {
        if (typeof findRegionForPoint !== "undefined" && window.TerraTrendUI) {
          const region = findRegionForPoint(lat, lon);
          if (region) {
            const coords = lat.toFixed(2) + "°, " + lon.toFixed(2) + "°";
            window.TerraTrendUI.openPanel(region, coords);
          }
        }
      }
    );
  }

  if (typeof THREE === "undefined" || !webglSupported()) {
    startFallback2D();
    return;
  }

  // ---------- Basic setup ----------
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: "high-performance" });
  } catch (err) {
    startFallback2D();
    return;
  }

  // Interrupted GPU contexts (tab throttling, driver resets) otherwise just
  // freeze the globe - surface it and offer a reload instead.
  canvas.addEventListener("webglcontextlost", function (e) {
    e.preventDefault();
    startFallback2D();
  });

  /* Cap at 1.5: on 2x HiDPI this saves ~55% GPU pixels with no visible quality loss */
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  const CAMERA_Z = 7.2;
  camera.position.set(0, 0, CAMERA_Z);

  const globeGroup = new THREE.Group();
  scene.add(globeGroup);

  const GLOBE_RADIUS = 2.1;

  // ---------- Lights ----------
  scene.add(new THREE.AmbientLight(0xbfd8ff, 0.85));
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.1);
  keyLight.position.set(-4, 2.2, 4.5);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0x8b7cff, 0.95);
  rimLight.position.set(5, -2, -3);
  scene.add(rimLight);

  // ---------- Earth ----------
  let earthMesh = null;
  const textureLoader = new THREE.TextureLoader();
  textureLoader.setCrossOrigin("anonymous");

  const EARTH_TEXTURE_URL =
    "https://cdn.jsdelivr.net/npm/three-globe@2.31.1/example/img/earth-blue-marble.jpg";

  const fallbackTexture = makeFallbackTexture();
  let textureReady = false;

  const loaderLabel = document.createElement("div");
  loaderLabel.className = "globe-loading";
  loaderLabel.textContent = "ACQUIRING SATELLITE IMAGERY…";
  document.querySelector(".globe-stage").appendChild(loaderLabel);

  textureLoader.load(
    EARTH_TEXTURE_URL,
    (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      buildEarth(tex);
      textureReady = true;
      loaderLabel.remove();
    },
    undefined,
    () => {
      buildEarth(fallbackTexture);
      textureReady = true;
      loaderLabel.textContent = "OFFLINE MODE - STYLIZED EARTH";
      setTimeout(() => loaderLabel.remove(), 2500);
    }
  );

  function buildEarth(texture) {
    const geometry = new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64);
    /* MeshPhongMaterial: ~2× faster fragment shader than MeshStandardMaterial
       (Blinn-Phong vs full PBR). Visually indistinguishable with a photo texture. */
    const material = new THREE.MeshPhongMaterial({
      map: texture,
      shininess: 6,
      specular: new THREE.Color(0x111122)
    });
    earthMesh = new THREE.Mesh(geometry, material);
    globeGroup.add(earthMesh);
    addAtmosphere();
    addMarkers();
    resize(); // re-run now that markers exist so label boost applies immediately
  }

  // Crude stylized earth used only if the real texture can't load
  function makeFallbackTexture() {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 512;
    const ctx = c.getContext("2d");
    const ocean = ctx.createLinearGradient(0, 0, 0, 512);
    ocean.addColorStop(0, "#0b2a4a");
    ocean.addColorStop(0.5, "#0e3a63");
    ocean.addColorStop(1, "#0b2a4a");
    ctx.fillStyle = ocean;
    ctx.fillRect(0, 0, 1024, 512);
    ctx.fillStyle = "#1d5c3a";
    const blobs = [
      [180, 150, 90, 60], [260, 210, 70, 90], [520, 130, 120, 60],
      [560, 240, 90, 70], [640, 180, 60, 50], [820, 300, 110, 70],
      [300, 330, 60, 80], [480, 380, 90, 50], [880, 140, 80, 50]
    ];
    blobs.forEach(([x, y, w, h]) => {
      ctx.beginPath();
      ctx.ellipse(x, y, w / 2, h / 2, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = "#cfe6f5";
    ctx.fillRect(0, 0, 1024, 26);
    ctx.fillRect(0, 486, 1024, 26);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  // ---------- Atmosphere glow ----------
  function addAtmosphere() {
    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(GLOBE_RADIUS * 1.07, 64, 64),
      new THREE.ShaderMaterial({
        transparent: true,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        vertexShader: `
          varying vec3 vNormal;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec3 vNormal;
          void main() {
            float intensity = pow(0.62 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.5);
            vec3 glow = mix(vec3(0.55, 0.42, 1.0), vec3(0.13, 0.85, 0.93), intensity);
            gl_FragColor = vec4(glow, 1.0) * intensity * 1.4;
          }
        `
      })
    );
    globeGroup.add(atmosphere);
  }

  // ---------- Coordinates helpers ----------
  function latLonToVec3(lat, lon, r) {
    const phi = ((90 - lat) * Math.PI) / 180;
    const theta = ((lon + 180) * Math.PI) / 180;
    return new THREE.Vector3(
      -r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi),
      r * Math.sin(phi) * Math.sin(theta)
    );
  }

  // inverse of latLonToVec3 (assumes |v| == r)
  function vec3ToLatLon(v) {
    const r = v.length();
    const lat = (Math.asin(v.y / r) * 180) / Math.PI;
    let lon = (Math.atan2(v.z, -v.x) * 180) / Math.PI - 180;
    lon = ((lon + 540) % 360) - 180; // wrap into [-180, 180)
    return { lat, lon };
  }

  function formatLatLon(lat, lon) {
    const la = Math.abs(lat).toFixed(1) + "° " + (lat >= 0 ? "N" : "S");
    const lo = Math.abs(lon).toFixed(1) + "° " + (lon >= 0 ? "E" : "W");
    return la + ", " + lo;
  }

  // ---------- Pinned hotspot markers ----------
  const markerHitTargets = [];
  const markerGlows = [];
  const markerLabels = [];

  // Canvas-text label sprite that floats above a marker
  function makeLabelSprite(text, hexColor, icon) {
    const col = "#" + hexColor.toString(16).padStart(6, "0");
    const fullText = icon ? icon + "  " + text : text;

    const padX = 30;
    const font = "600 64px 'Space Grotesk', system-ui, sans-serif";
    const measure = document.createElement("canvas").getContext("2d");
    measure.font = font;
    const textW = measure.measureText(fullText).width;

    const W = Math.ceil(textW + padX * 2);
    const H = 120;
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const ctx = c.getContext("2d");
    const r = H / 2;

    // outer glow ring
    ctx.save();
    ctx.shadowColor = col;
    ctx.shadowBlur = 32;
    ctx.beginPath();
    ctx.roundRect(4, 4, W - 8, H - 8, r - 4);
    ctx.strokeStyle = col + "44";
    ctx.lineWidth = 10;
    ctx.stroke();
    ctx.restore();

    // dark glass background
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "rgba(10, 12, 32, 0.93)");
    bg.addColorStop(1, "rgba(4, 6, 18, 0.90)");
    ctx.beginPath();
    ctx.roundRect(6, 6, W - 12, H - 12, r - 6);
    ctx.fillStyle = bg;
    ctx.fill();

    // colored border
    ctx.beginPath();
    ctx.roundRect(6, 6, W - 12, H - 12, r - 6);
    ctx.strokeStyle = col + "cc";
    ctx.lineWidth = 3;
    ctx.stroke();

    // top hairline accent (gradient shimmer)
    const accent = ctx.createLinearGradient(W * 0.12, 0, W * 0.88, 0);
    accent.addColorStop(0,   col + "00");
    accent.addColorStop(0.5, col + "ff");
    accent.addColorStop(1,   col + "00");
    ctx.beginPath();
    ctx.roundRect(6, 6, W - 12, H - 12, r - 6);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // text with color glow
    ctx.font = font;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = col;
    ctx.shadowBlur = 18;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(fullText, W / 2, H / 2 + 2);
    ctx.shadowBlur = 0;

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;

    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        depthTest: true   // globe mesh occludes labels behind the globe
      })
    );
    const labelWorldH = 0.14;
    sprite.scale.set((labelWorldH * W) / H, labelWorldH, 1);
    return sprite;
  }

  function makeGlowSprite(hexColor) {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    const col = "#" + hexColor.toString(16).padStart(6, "0");
    g.addColorStop(0, col);
    g.addColorStop(0.25, col + "cc");
    g.addColorStop(1, col + "00");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(c),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );
  }

  function addMarkers() {
    HOTSPOTS.forEach((spot, i) => {
      const pos = latLonToVec3(spot.lat, spot.lon, GLOBE_RADIUS * 1.005);

      const anchor = new THREE.Group();
      anchor.position.copy(pos);

      const glow = makeGlowSprite(spot.color);
      glow.scale.setScalar(0.46);
      anchor.add(glow);
      markerGlows.push({ sprite: glow, phase: i * 1.3 });

      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.040, 12, 12),
        new THREE.MeshBasicMaterial({ color: spot.color })
      );
      anchor.add(dot);

      const hit = new THREE.Mesh(
        new THREE.SphereGeometry(0.09, 8, 8),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      hit.userData.hotspotIndex = i;
      anchor.add(hit);
      markerHitTargets.push(hit);

      // Label floats above the dot; depthTest:true occludes it when behind the globe
      const label = makeLabelSprite(spot.name, spot.color, spot.icon);
      label.position.copy(pos.clone().normalize().multiplyScalar(0.40));
      label.userData.hotspotIndex = i;
      anchor.add(label);
      markerLabels.push({ sprite: label, origX: label.scale.x, origY: label.scale.y, baseX: label.scale.x, baseY: label.scale.y, phase: i * 0.85 });
      markerHitTargets.push(label);

      globeGroup.add(anchor);
    });
  }

  // ---------- Highlight ring (selected hotspot) ----------
  let highlightMesh = null;

  function setHighlight(index) {
    if (highlightMesh) {
      globeGroup.remove(highlightMesh);
      highlightMesh.geometry.dispose();
      highlightMesh.material.dispose();
      highlightMesh = null;
    }
    if (index < 0 || index >= HOTSPOTS.length) return;
    const spot = HOTSPOTS[index];
    const pos = latLonToVec3(spot.lat, spot.lon, GLOBE_RADIUS * 1.004);
    highlightMesh = new THREE.Mesh(
      new THREE.RingGeometry(0.12, 0.165, 48),
      new THREE.MeshBasicMaterial({
        color: spot.color,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    highlightMesh.position.copy(pos);
    highlightMesh.lookAt(pos.clone().multiplyScalar(2));
    globeGroup.add(highlightMesh);
  }

  function clearHighlight() {
    if (!highlightMesh) return;
    globeGroup.remove(highlightMesh);
    highlightMesh.geometry.dispose();
    highlightMesh.material.dispose();
    highlightMesh = null;
  }

  // ---------- Click ping (expanding ring) ----------
  const activePings = [];

  function spawnPing(lat, lon, color) {
    const pos = latLonToVec3(lat, lon, GLOBE_RADIUS * 1.002);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.02, 0.045, 40),
      new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    ring.position.copy(pos);
    ring.lookAt(pos.clone().multiplyScalar(2)); // face outward
    globeGroup.add(ring);
    activePings.push({ mesh: ring, born: performance.now() });
  }

  function updatePings(now) {
    for (let i = activePings.length - 1; i >= 0; i--) {
      const p = activePings[i];
      const age = (now - p.born) / 1400; // seconds-ish
      if (age >= 1) {
        globeGroup.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        activePings.splice(i, 1);
        continue;
      }
      const s = 1 + age * 9;
      p.mesh.scale.setScalar(s);
      p.mesh.material.opacity = 0.95 * (1 - age);
    }
  }

  // ---------- Interaction: drag to rotate ----------
  const dragState = { active: false, lastX: 0, lastY: 0, velX: 0, velY: 0 };
  const AUTO_SPIN = 0.0022;
  let idleTimer = null;
  let userInteracting = false;
  let targetRotationX = 0.35;
  const MAX_TILT = 1.1;

  canvas.addEventListener("pointerdown", (e) => {
    dragState.active = true;
    dragState.lastX = e.clientX;
    dragState.lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add("grabbing");
    flagUserActivity();
  });

  window.addEventListener("pointermove", (e) => {
    if (!dragState.active) return;
    const dx = e.clientX - dragState.lastX;
    const dy = e.clientY - dragState.lastY;
    dragState.lastX = e.clientX;
    dragState.lastY = e.clientY;
    dragState.velX = dx * 0.005;
    dragState.velY = dy * 0.005;
    globeGroup.rotation.y += dragState.velX;
    targetRotationX = THREE.MathUtils.clamp(
      targetRotationX + dragState.velY,
      -MAX_TILT,
      MAX_TILT
    );
    // Cancel any active fly-to so the globe doesn't snap back after dragging
    flyTo.targetY = undefined;
    flyTo.targetX = undefined;
    flagUserActivity();
  });

  window.addEventListener("pointerup", () => {
    dragState.active = false;
    canvas.classList.remove("grabbing");
  });

  function flagUserActivity() {
    userInteracting = true;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => (userInteracting = false), 3200);
  }

  // Arrow-key globe rotation (skip when a modal or text input is focused)
  document.addEventListener("keydown", (e) => {
    if (document.body.classList.contains("modal-open")) return;
    if (document.activeElement && (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA")) return;
    const step = 0.06;
    if (e.key === "ArrowLeft")  { globeGroup.rotation.y -= step; flyTo.targetY = undefined; flagUserActivity(); e.preventDefault(); }
    if (e.key === "ArrowRight") { globeGroup.rotation.y += step; flyTo.targetY = undefined; flagUserActivity(); e.preventDefault(); }
    if (e.key === "ArrowUp")    { targetRotationX = THREE.MathUtils.clamp(targetRotationX - step, -MAX_TILT, MAX_TILT); flyTo.targetX = undefined; flagUserActivity(); e.preventDefault(); }
    if (e.key === "ArrowDown")  { targetRotationX = THREE.MathUtils.clamp(targetRotationX + step, -MAX_TILT, MAX_TILT); flyTo.targetX = undefined; flagUserActivity(); e.preventDefault(); }
  });

  // ---------- Raycasting: hover + click ----------
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2(-10, -10);
  // eased camera parallax state: x/y current, tx/ty target
  const parallax = { x: 0, y: 0, tx: 0, ty: 0 };
  let hoveredIndex = -1;
  let downAt = 0;
  let downX = 0;
  let downY = 0;

  canvas.addEventListener("pointerdown", (e) => {
    downAt = Date.now();
    downX = e.clientX;
    downY = e.clientY;
  });

  canvas.addEventListener("pointermove", (e) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    // subtle camera parallax target - makes the scene feel more 3D
    parallax.tx = pointer.x * 0.26;
    parallax.ty = pointer.y * 0.16;
  });

  canvas.addEventListener("click", (e) => {
    // ignore drags (moved > 6px or held > 350ms)
    const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
    if (moved > 6 || Date.now() - downAt > 350) return;

    raycaster.setFromCamera(pointer, camera);

    // 1) pinned hotspot markers take priority
    const markerHits = raycaster.intersectObjects(markerHitTargets, false);
    if (markerHits.length) {
      const idx = markerHits[0].object.userData.hotspotIndex;
      selectHotspot(idx, true);
      return;
    }

    // 2) otherwise: scan the Earth surface itself
    if (!earthMesh) return;
    const earthHits = raycaster.intersectObject(earthMesh, false);
    if (!earthHits.length) return;

    const localPoint = earthMesh.worldToLocal(earthHits[0].point.clone());
    const { lat, lon } = vec3ToLatLon(localPoint);

    const region =
      typeof findRegionForPoint === "function"
        ? findRegionForPoint(lat, lon)
        : null;
    if (!region) return;

    spawnPing(lat, lon, region.color || 0x4f8cff);
    flyTo(lat, lon);
    openRegionPanel(region, lat, lon);
  });

  function openRegionPanel(region, lat, lon) {
    if (!window.TerraTrendUI) return;
    window.TerraTrendUI.openPanel(
      {
        id: region.id || region.name,
        name: region.name,
        icon: region.icon || "📍",
        color: region.color || 0x4f8cff,
        tagline: region.tagline || "",
        what: region.what,
        where: region.where,
        rate: region.rate,
        significance: region.significance,
        significanceTone: region.tone || region.significanceTone || "mixed",
        description: region.description,
        source: region.source
      },
      formatLatLon(lat, lon)
    );
  }

  function updateHover() {
    if (!textureReady || dragState.active) return;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(markerHitTargets, false);
    const idx = hits.length ? hits[0].object.userData.hotspotIndex : -1;
    if (idx !== hoveredIndex) {
      hoveredIndex = idx;
      canvas.style.cursor = idx >= 0 ? "pointer" : "grab";
      updateTooltip(idx);
    }
  }

  /* Throttled hover: only runs on pointer movement, never inside the render loop */
  canvas.addEventListener("pointermove", () => {
    if (!dragState.active) updateHover();
  });

  const tooltip = document.createElement("div");
  tooltip.className = "globe-tooltip";
  tooltip.style.display = "none";
  document.body.appendChild(tooltip);

  function updateTooltip(idx) {
    if (idx < 0) {
      tooltip.style.display = "none";
      return;
    }
    const spot = HOTSPOTS[idx];
    tooltip.innerHTML = `${spot.icon} <strong>${spot.name}</strong> &nbsp;· Open Trend File`;
    tooltip.style.display = "block";
  }

  canvas.addEventListener("pointermove", (e) => {
    if (tooltip.style.display === "none") return;
    tooltip.style.left = e.clientX + 16 + "px";
    tooltip.style.top = e.clientY + 12 + "px";
  });

  // ---------- Selection API (used by cards in main.js) ----------
  function selectHotspot(index, openPanel) {
    const spot = HOTSPOTS[index];
    flyTo(spot.lat, spot.lon);
    spawnPing(spot.lat, spot.lon, spot.color);
    if (openPanel && window.TerraTrendUI) {
      window.TerraTrendUI.openPanel(spot, formatLatLon(spot.lat, spot.lon));
    }
  }

  function flyTo(lat, lon) {
    const target = latLonToVec3(lat, lon, 1);
    const targetY = -Math.atan2(target.x, target.z);
    const twoPi = Math.PI * 2;
    let delta = (targetY - globeGroup.rotation.y) % twoPi;
    if (delta > Math.PI) delta -= twoPi;
    if (delta < -Math.PI) delta += twoPi;
    flyTo.targetY = globeGroup.rotation.y + delta;
    flyTo.targetX = THREE.MathUtils.clamp(
      THREE.MathUtils.degToRad(lat) * 0.9,
      -MAX_TILT,
      MAX_TILT
    );
    flagUserActivity();
  }

  function projectToScreen(lat, lon) {
    const v = latLonToVec3(lat, lon, GLOBE_RADIUS);
    // globeGroup world matrix (includes rotation, tilt, scale, position)
    globeGroup.updateMatrixWorld();
    v.applyMatrix4(globeGroup.matrixWorld);
    const ndc = v.clone().project(camera);
    return {
      x: (ndc.x * 0.5 + 0.5) * window.innerWidth,
      y: (-ndc.y * 0.5 + 0.5) * window.innerHeight,
      facing: ndc.z < 1 && v.clone().sub(camera.position).dot(v.clone().normalize()) < 0 ? "front" : "back"
    }; // "front" = hemisphere toward the camera
  }

  window.TerraTrendGlobe = { selectHotspot, flyTo, projectToScreen, setHighlight, clearHighlight };

  // ---------- Responsive layout ----------
  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    if (w > 1024) {
      const worldWidthAtGlobe = 2 * Math.tan((camera.fov * Math.PI) / 360) * CAMERA_Z;
      // NASA Eyes style: globe centered on the full-bleed stage
      globeGroup.position.x = 0;
      globeGroup.position.y = -0.2;
      const scale = Math.min(1.12, Math.max(0.95, w / 1440));
      globeGroup.scale.setScalar(scale);
      camera.position.z = CAMERA_Z;
    } else if (w > 640) {
      globeGroup.position.set(0, 0.35, 0);
      globeGroup.scale.setScalar(0.85);
      camera.position.z = CAMERA_Z;
    } else {
      // Narrow portrait phones: pull camera back so globe fits in the horizontal FOV
      globeGroup.position.set(0, 0.6, 0);
      globeGroup.scale.setScalar(0.62);
      camera.position.z = 9.5;
    }

    // Compensate label scale against globeGroup reduction AND camera distance change
    // Extra 1.4× on narrow phones so labels remain readable
    const camZ  = w <= 640 ? 9.5 : CAMERA_Z;
    const glSc  = w <= 640 ? 0.62 : (w <= 1024 ? 0.85 : 1.0);
    const labelBoost = (CAMERA_Z / camZ) / glSc * (w <= 640 ? 1.4 : 1.0);
    markerLabels.forEach(l => {
      l.baseX = l.origX * labelBoost;
      l.baseY = l.origY * labelBoost;
    });
  }
  window.addEventListener("resize", resize);
  resize();

  /* Expose pause control so main.js can halt the globe while the info panel is open */
  let globePaused = false;
  window.TerraTrendGlobeControl = {
    pause() { globePaused = true; },
    resume() { globePaused = false; }
  };

  // ---------- Animation loop ----------
  const clock = new THREE.Clock();
  let lastFrameTs = 0;

  function animate(ts) {
    requestAnimationFrame(animate);

    // Skip all work when tab hidden
    if (document.hidden) return;

    // Throttle: 60fps active, 20fps idle auto-spin, pause when panel open
    const busy = dragState.active || userInteracting || activePings.length > 0;
    const minInterval = busy ? 16 : (globePaused ? 100 : 50); // 60fps / 10fps / 20fps
    if (ts - lastFrameTs < minInterval) return;
    lastFrameTs = ts;

    const t = clock.getElapsedTime();
    const dt = Math.min(Math.max(t - (animate.lastT || t), 0), 0.05);
    animate.lastT = t;
    const s = dt * 60;

    if (!userInteracting && !dragState.active) {
      globeGroup.rotation.y += AUTO_SPIN;
    } else {
      globeGroup.rotation.y += dragState.velX * 0.4;
      dragState.velX *= 0.94;
    }

    if (!dragState.active) {
      dragState.velY *= 0.94;
      if (Math.abs(dragState.velY) > 0.0002) {
        targetRotationX = THREE.MathUtils.clamp(
          targetRotationX + dragState.velY * 0.4,
          -MAX_TILT,
          MAX_TILT
        );
      }
    }

    if (flyTo.targetY !== undefined && !dragState.active) {
      globeGroup.rotation.y += (flyTo.targetY - globeGroup.rotation.y) * Math.min(1, 0.06 * s);
      targetRotationX += (flyTo.targetX - targetRotationX) * Math.min(1, 0.06 * s);
    }

    globeGroup.rotation.x += (targetRotationX - globeGroup.rotation.x) * Math.min(1, 0.08 * s);

    // Parallax camera drift - only update lookAt when it actually changed
    const px = parallax.x + (parallax.tx - parallax.x) * Math.min(1, 0.035 * s);
    const py = parallax.y + (parallax.ty - parallax.y) * Math.min(1, 0.035 * s);
    if (Math.abs(px - parallax.x) > 0.0001 || Math.abs(py - parallax.y) > 0.0001) {
      parallax.x = px;
      parallax.y = py;
      camera.position.x = px;
      camera.position.y = py;
      camera.lookAt(globeGroup.position);
    }

    markerGlows.forEach(({ sprite, phase }, i) => {
      const pulse = 1 + Math.sin(t * 2.4 + phase) * 0.18;
      const boost = i === hoveredIndex ? 1.45 : 1;
      sprite.scale.setScalar(0.46 * pulse * boost);
    });

    markerLabels.forEach(({ sprite, baseX, baseY, phase }) => {
      const pulse = 1 + Math.sin(t * 1.5 + phase) * 0.05;
      sprite.scale.set(baseX * pulse, baseY * pulse, 1);
    });

    updatePings(performance.now());

    if (highlightMesh) {
      highlightMesh.material.opacity = 0.7 + Math.sin(t * 1.6) * 0.3;
      highlightMesh.scale.setScalar(1 + Math.sin(t * 1.1) * 0.09);
    }

    renderer.render(scene, camera);
  }

  /* Delay full animation until after the splash is dismissed
     so the GPU isn't competing with CSS backdrop-filter blur during load */
  if (typeof HOTSPOTS !== "undefined") {
    const splashEl = document.getElementById("splash");
    if (splashEl && !document.body.classList.contains("app-armed")) {
      const launchBtn = document.getElementById("launch-btn");
      if (launchBtn) {
        launchBtn.addEventListener("click", () => requestAnimationFrame(animate), { once: true });
      } else {
        animate();
      }
    } else {
      animate();
    }
  }
})();
