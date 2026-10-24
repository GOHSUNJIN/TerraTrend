/* ============================================================
   TerraTrend — 3D interactive Earth (Three.js r160, global build)
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
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (err) {
    startFallback2D();
    return;
  }

  // Interrupted GPU contexts (tab throttling, driver resets) otherwise just
  // freeze the globe — surface it and offer a reload instead.
  canvas.addEventListener("webglcontextlost", function (e) {
    e.preventDefault();
    startFallback2D();
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

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
      loaderLabel.textContent = "OFFLINE MODE — STYLIZED EARTH";
      setTimeout(() => loaderLabel.remove(), 2500);
    }
  );

  function buildEarth(texture) {
    const geometry = new THREE.SphereGeometry(GLOBE_RADIUS, 96, 96);
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.9,
      metalness: 0.05
    });
    earthMesh = new THREE.Mesh(geometry, material);
    globeGroup.add(earthMesh);
    addAtmosphere();
    addMarkers();
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
      new THREE.SphereGeometry(GLOBE_RADIUS * 1.16, 64, 64),
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
    scene.add(atmosphere);
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

  // Canvas-text label sprite that floats above a marker
  function makeLabelSprite(text, hexColor) {
    const pad = 18;
    const font = "600 44px Space Grotesk, system-ui, sans-serif";
    const measure = document.createElement("canvas").getContext("2d");
    measure.font = font;
    const textW = measure.measureText(text).width;

    const c = document.createElement("canvas");
    c.width = Math.ceil(textW + pad * 2);
    c.height = 76;
    const ctx = c.getContext("2d");

    // pill backdrop for legibility over the Earth texture
    ctx.beginPath();
    const r = c.height / 2 - 6;
    ctx.roundRect(4, 4, c.width - 8, c.height - 8, r);
    ctx.fillStyle = "rgba(4,7,15,0.72)";
    ctx.fill();
    ctx.strokeStyle = "#" + hexColor.toString(16).padStart(6, "0") + "cc";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.font = font;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#e9f0fc";
    ctx.fillText(text, c.width / 2, c.height / 2 + 2);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;

    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        depthTest: false
      })
    );
    // keep world size in step with the canvas aspect
    const labelWorldH = 0.16;
    sprite.scale.set((labelWorldH * c.width) / c.height, labelWorldH, 1);
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
      glow.scale.setScalar(0.34);
      anchor.add(glow);
      markerGlows.push({ sprite: glow, phase: i * 1.3 });

      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.028, 12, 12),
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

      globeGroup.add(anchor);
    });
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
    // subtle camera parallax target — makes the scene feel more 3D
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
    tooltip.innerHTML = `${spot.icon} <strong>${spot.name}</strong> — click to open`;
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
      window.TerraTrendUI.openPanel(
        { ...spot, significanceTone: spot.significanceTone },
        formatLatLon(spot.lat, spot.lon)
      );
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

  window.TerraTrendGlobe = { selectHotspot, flyTo, projectToScreen };

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
    } else {
      globeGroup.position.set(0, w > 640 ? 0.55 : 0.9, 0);
      globeGroup.scale.setScalar(w > 640 ? 0.85 : 0.62);
    }
  }
  window.addEventListener("resize", resize);
  resize();

  // ---------- Animation loop ----------
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    // frame-rate-independent smoothing: ~1 at 60fps, larger arcs on slow frames
    const dt = Math.min(Math.max(t - (animate.lastT || t), 0), 0.05);
    animate.lastT = t;
    const s = dt * 60;

    if (!userInteracting && !dragState.active) {
      globeGroup.rotation.y += AUTO_SPIN;
    } else {
      globeGroup.rotation.y += dragState.velX * 0.4;
      dragState.velX *= 0.94;
    }

    // vertical drag inertia keeps easing after release, like the horizontal spin
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
    globeGroup.position.y += Math.sin(t * 0.6) * 0.0006;

    // eased camera drift: parallax toward the pointer, framed on the globe
    parallax.x += (parallax.tx - parallax.x) * Math.min(1, 0.035 * s);
    parallax.y += (parallax.ty - parallax.y) * Math.min(1, 0.035 * s);
    camera.position.x = parallax.x;
    camera.position.y = parallax.y;
    camera.lookAt(globeGroup.position);

    markerGlows.forEach(({ sprite, phase }, i) => {
      const pulse = 1 + Math.sin(t * 2.4 + phase) * 0.18;
      const boost = i === hoveredIndex ? 1.45 : 1;
      sprite.scale.setScalar(0.34 * pulse * boost);    });

    updatePings(performance.now());
    updateHover();
    renderer.render(scene, camera);
  }

  if (typeof HOTSPOTS !== "undefined") {
    animate();
  }
})();
