/* boxManager.js — escena 3D de Mystery Boxes (Three.js r128, el mismo que usa Bomb Race).
 * Las cajas son objetos reales del escenario: flotan, giran, brillan, reaccionan al cursor, se barajan y se abren.
 * Este módulo NO decide qué estudiante sale: solo anima. Cada caja guarda en `box.student` el estudiante que le
 * asignó roundManager; el estudiante nunca se dibuja hasta que la caja se abre.
 * Rendimiento: 1 luz con sombra, 1 luz móvil, geometrías/texturas compartidas, partículas en un único THREE.Points.
 */
(function () {
  'use strict';
  const MG = (window.MysteryBoxesGame = window.MysteryBoxesGame || {});
  const THREE = window.THREE;

  const PAL = [0xff5a5a, 0x3d9bff, 0x35d07f, 0xb26bff, 0xff8a1c, 0x20d3d3, 0xff6fb5, 0xa6e22e, 0x5b6bff, 0xd946ef, 0x2ec4b6, 0xff7a6b];
  const GOLD = 0xffd23f;
  const SX = 2.9, SZ = 2.7;
  const ease = {
    lin: (k) => k,
    out: (k) => 1 - Math.pow(1 - k, 3),
    inout: (k) => (k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
    back: (k) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); },
  };
  const lerp = (a, b, k) => a + (b - a) * k;

  /* ---------- estado del módulo ---------- */
  let ren, scene, cam, canvas, keyLight, spot, running = false, lastT = 0, T = 0;
  let boxes = [], tweens = [], hover = -1, mode = 'none', pickCb = null, camShake = 0;
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), camGoalPos = new THREE.Vector3(), camGoalLook = new THREE.Vector3();
  let overview = { d: 14, h: 9, ty: .4 };
  let focused = null;
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(-9, -9);
  let shared = null;

  /* ---------- tweens (usan el reloj del juego; cancelAll los libera) ---------- */
  function tween(ms, fn, ez) {
    return new Promise((res) => { tweens.push({ t: 0, d: Math.max(ms, 1) / 1000, fn: fn || (() => {}), ez: ez || ease.lin, res }); });
  }
  const wait = (ms) => tween(ms);
  function cancelAll() { const l = tweens; tweens = []; l.forEach((x) => x.res()); }

  /* ---------- texturas y geometrías compartidas ---------- */
  function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); return t; }
  function makeShared() {
    shared = {
      body: new THREE.BoxGeometry(1.6, 1.25, 1.6),
      band: new THREE.BoxGeometry(1.64, 1.27, .3),
      lid: new THREE.BoxGeometry(1.76, .38, 1.76),
      lidBand: new THREE.BoxGeometry(1.8, .4, .3),
      bow: new THREE.BoxGeometry(.34, .34, .34),
      qPlane: new THREE.PlaneGeometry(.95, .95),
      flat: new THREE.PlaneGeometry(1, 1),
      beam: new THREE.CylinderGeometry(.75, .42, 4.2, 20, 1, true),
      gold: new THREE.MeshStandardMaterial({ color: GOLD, roughness: .35, metalness: .5, emissive: GOLD, emissiveIntensity: .12 }),
      qTex: canvasTex(256, 256, (g, w, h) => {
        g.fillStyle = 'rgba(8,14,40,.88)'; g.beginPath(); g.arc(w / 2, h / 2, 112, 0, 7); g.fill();
        g.lineWidth = 12; g.strokeStyle = '#ffd23f'; g.stroke();
        g.fillStyle = '#ffd23f'; g.font = '900 170px system-ui,Arial,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', w / 2, h / 2 + 10);
      }),
      haloTex: canvasTex(128, 128, (g, w, h) => {
        const r = g.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
        r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.45, 'rgba(255,255,255,.35)'); r.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = r; g.fillRect(0, 0, w, h);
      }),
      dotTex: canvasTex(64, 64, (g, w, h) => {
        const r = g.createRadialGradient(32, 32, 1, 32, 32, 31);
        r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.4, 'rgba(255,255,255,.6)'); r.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = r; g.fillRect(0, 0, w, h);
      }),
    };
    shared.qMat = new THREE.MeshBasicMaterial({ map: shared.qTex, transparent: true, depthWrite: false });
  }

  /* ---------- partículas (un solo Points reutilizable) ---------- */
  const PMAX = 520;
  let P = null;
  function makeParticles() {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(PMAX * 3), col = new Float32Array(PMAX * 3);
    for (let i = 0; i < PMAX; i++) pos[i * 3 + 1] = -999;
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({ size: .32, map: shared.dotTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
    const pts = new THREE.Points(geo, mat); pts.frustumCulled = false;
    scene.add(pts);
    P = { pts, pos, col, geo, vel: new Float32Array(PMAX * 3), life: new Float32Array(PMAX), max: new Float32Array(PMAX), g: new Float32Array(PMAX), base: new Float32Array(PMAX * 3), next: 0 };
  }
  function burst(x, y, z, n, colors, speed, up, life, grav) {
    const c = new THREE.Color();
    for (let k = 0; k < n; k++) {
      const i = P.next; P.next = (P.next + 1) % PMAX;
      const a = Math.random() * 6.283, r = Math.random() * speed;
      P.pos[i * 3] = x; P.pos[i * 3 + 1] = y; P.pos[i * 3 + 2] = z;
      P.vel[i * 3] = Math.cos(a) * r; P.vel[i * 3 + 1] = Math.random() * up + 1; P.vel[i * 3 + 2] = Math.sin(a) * r;
      const L = (life || 1) * (.6 + Math.random() * .6); P.life[i] = L; P.max[i] = L; P.g[i] = grav == null ? 9 : grav;
      c.setHex(colors[(Math.random() * colors.length) | 0]);
      P.base[i * 3] = c.r; P.base[i * 3 + 1] = c.g; P.base[i * 3 + 2] = c.b;
    }
  }
  function stepParticles(dt) {
    for (let i = 0; i < PMAX; i++) {
      if (P.life[i] <= 0) continue;
      P.life[i] -= dt;
      if (P.life[i] <= 0) { P.pos[i * 3 + 1] = -999; P.col[i * 3] = P.col[i * 3 + 1] = P.col[i * 3 + 2] = 0; continue; }
      P.vel[i * 3 + 1] -= P.g[i] * dt;
      P.pos[i * 3] += P.vel[i * 3] * dt; P.pos[i * 3 + 1] += P.vel[i * 3 + 1] * dt; P.pos[i * 3 + 2] += P.vel[i * 3 + 2] * dt;
      if (P.pos[i * 3 + 1] < .03 && P.g[i] > 0) { P.pos[i * 3 + 1] = .03; P.vel[i * 3 + 1] *= -.3; P.vel[i * 3] *= .6; P.vel[i * 3 + 2] *= .6; }
      const k = Math.min(1, P.life[i] / P.max[i] * 1.6);
      P.col[i * 3] = P.base[i * 3] * k; P.col[i * 3 + 1] = P.base[i * 3 + 1] * k; P.col[i * 3 + 2] = P.base[i * 3 + 2] * k;
    }
    P.geo.attributes.position.needsUpdate = true; P.geo.attributes.color.needsUpdate = true;
  }
  /* destellos ambientales (siempre presentes, muy baratos) */
  let amb = null;
  function makeAmbient() {
    const N = 60, geo = new THREE.BufferGeometry(), pos = new Float32Array(N * 3), seed = [];
    for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - .5) * 26; pos[i * 3 + 1] = Math.random() * 7; pos[i * 3 + 2] = (Math.random() - .5) * 14; seed.push(Math.random() * 6.28); }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: .16, map: shared.dotTex, color: 0x9fc2ff, transparent: true, opacity: .75, depthWrite: false, blending: THREE.AdditiveBlending }));
    pts.frustumCulled = false; scene.add(pts); amb = { pts, pos, seed, N, geo };
  }
  function stepAmbient(dt) {
    for (let i = 0; i < amb.N; i++) {
      amb.pos[i * 3 + 1] += dt * (.25 + (i % 5) * .08);
      amb.pos[i * 3] += Math.sin(T * .5 + amb.seed[i]) * dt * .25;
      if (amb.pos[i * 3 + 1] > 7.5) amb.pos[i * 3 + 1] = 0;
    }
    amb.geo.attributes.position.needsUpdate = true;
  }

  /* ---------- una caja ---------- */
  function makeBox(i, student) {
    const color = PAL[i % PAL.length];
    const root = new THREE.Group(), inner = new THREE.Group(); root.add(inner);
    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: .42, metalness: .12, emissive: color, emissiveIntensity: .06 });
    const lidMat = new THREE.MeshStandardMaterial({ color, roughness: .38, metalness: .15, emissive: color, emissiveIntensity: .06 });
    const body = new THREE.Mesh(shared.body, bodyMat); body.position.y = .625; body.castShadow = true; body.receiveShadow = true; inner.add(body);
    const band = new THREE.Mesh(shared.band, shared.gold); band.position.y = .625; inner.add(band);
    const q = new THREE.Mesh(shared.qPlane, shared.qMat); q.position.set(0, .62, .81); inner.add(q);
    // tapa con bisagra en el borde trasero
    const lidPivot = new THREE.Group(); lidPivot.position.set(0, 1.25, -.88); inner.add(lidPivot);
    const lid = new THREE.Mesh(shared.lid, lidMat); lid.position.set(0, .19, .88); lid.castShadow = true; lidPivot.add(lid);
    const lb = new THREE.Mesh(shared.lidBand, shared.gold); lb.position.set(0, .2, .88); lidPivot.add(lb);
    const bow = new THREE.Mesh(shared.bow, shared.gold); bow.position.set(0, .5, .88); bow.rotation.set(.6, .785, 0); lidPivot.add(bow);
    // interior luminoso + haz de luz (ocultos hasta abrir)
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
    const innerGlow = new THREE.Mesh(shared.flat, glowMat); innerGlow.rotation.x = -Math.PI / 2; innerGlow.scale.set(1.45, 1.45, 1); innerGlow.position.y = 1.24; inner.add(innerGlow);
    const beamMat = new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
    const beam = new THREE.Mesh(shared.beam, beamMat); beam.position.y = 3.3; inner.add(beam);
    // halo en el suelo
    const haloMat = new THREE.MeshBasicMaterial({ color, map: shared.haloTex, transparent: true, opacity: .22, depthWrite: false, blending: THREE.AdditiveBlending });
    const halo = new THREE.Mesh(shared.flat, haloMat); halo.rotation.x = -Math.PI / 2; halo.scale.set(4, 4, 1); halo.position.y = .02; root.add(halo);
    body.userData.idx = i; lid.userData.idx = i;
    scene.add(root);
    return { i, color, student, root, inner, body, lid, bodyMat, lidMat, lidPivot, glowMat, beamMat, innerGlow, beam, halo, haloMat,
      phase: Math.random() * 6.28, glow: 0, glowT: 0, scale: 0, hov: 0, lidAngle: 0, shake: 0, slot: { x: 0, z: 0 }, sprite: null, gone: false, yJump: 0, yaw: 0, dim: 0 };
  }
  function disposeBox(b) {
    scene.remove(b.root);
    [b.bodyMat, b.lidMat, b.glowMat, b.beamMat, b.haloMat].forEach((m) => m.dispose());
    if (b.sprite) { b.sprite.material.map.dispose(); b.sprite.material.dispose(); }
  }
  function clearBoxes() { cancelAll(); boxes.forEach(disposeBox); boxes = []; hover = -1; focused = null; spot.intensity = 0; }

  /* ---------- layout: filas centradas ---------- */
  function layout(n) {
    const maxCols = n <= 3 ? 3 : n === 4 ? 4 : n <= 6 ? 3 : 4;
    const rows = Math.ceil(n / maxCols), base = Math.floor(n / rows), extra = n % rows, out = [];
    let widest = 0;
    for (let r = 0; r < rows; r++) {
      const cnt = base + (r < extra ? 1 : 0); widest = Math.max(widest, cnt);
      for (let c = 0; c < cnt; c++) out.push({ x: (c - (cnt - 1) / 2) * SX, z: (r - (rows - 1) / 2) * SZ });
    }
    return { slots: out, rows, widest };
  }
  function fitCamera(rows, widest) {
    const aspect = cam.aspect, tan = Math.tan(cam.fov * Math.PI / 360);
    const hw = (widest - 1) * SX / 2 + 1.9, depth = (rows - 1) * SZ / 2 + 1.4;
    const pitch = 34 * Math.PI / 180;
    const dH = hw / (tan * aspect), dV = (depth * Math.sin(pitch) + 2.3) / tan;
    const d = Math.max(dH, dV, 8.5) * 1.12 + depth * Math.cos(pitch) * .5;
    overview = { d, h: d * Math.sin(pitch), z: d * Math.cos(pitch), ty: .55 };
  }
  function overviewGoal() {
    camGoalPos.set(Math.sin(T * .25) * .5, overview.h + Math.sin(T * .4) * .15, overview.z);
    camGoalLook.set(0, overview.ty, 0);
  }
  function focusGoal() {
    const z = focusPos.z;
    /* Encuadre calculado para dejar libres el banner superior (≈115–185 px) y el panel de pregunta (desde ≈440 px) a 1366×768 */
    camGoalPos.set(0, 4.2, z + 12.2);
    camGoalLook.set(0, .5, z);
  }
  const focusPos = { x: 0, z: 2.2 };

  /* ---------- API pública ---------- */
  const B = (MG.boxManager = {
    ok: false,
    init(cv) {
      if (!THREE) throw new Error('Three.js not loaded');
      canvas = cv;
      ren = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      ren.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      ren.shadowMap.enabled = true; ren.shadowMap.type = THREE.PCFShadowMap;
      ren.setClearColor(0x000000, 0);
      scene = new THREE.Scene();
      cam = new THREE.PerspectiveCamera(45, 1, .1, 120);
      scene.add(new THREE.HemisphereLight(0xcfdcff, 0x1b2458, .95));
      keyLight = new THREE.DirectionalLight(0xffffff, .85); keyLight.position.set(5, 14, 9); keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      Object.assign(keyLight.shadow.camera, { left: -14, right: 14, top: 12, bottom: -12, near: 1, far: 40 });
      scene.add(keyLight);
      spot = new THREE.PointLight(0xffffff, 0, 11, 2); scene.add(spot);
      makeShared();
      // suelo: disco decorativo (degradado + rejilla) + plano que solo recibe sombras
      const floorTex = canvasTex(512, 512, (g, w, h) => {
        const r = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2);
        r.addColorStop(0, 'rgba(70,110,230,.55)'); r.addColorStop(.6, 'rgba(40,70,170,.28)'); r.addColorStop(1, 'rgba(20,40,110,0)');
        g.fillStyle = r; g.fillRect(0, 0, w, h);
        g.strokeStyle = 'rgba(140,180,255,.16)'; g.lineWidth = 2;
        for (let k = 1; k < 16; k++) { g.beginPath(); g.moveTo(k * w / 16, 0); g.lineTo(k * w / 16, h); g.stroke(); g.beginPath(); g.moveTo(0, k * h / 16); g.lineTo(w, k * h / 16); g.stroke(); }
        g.globalCompositeOperation = 'destination-in';
        const m = g.createRadialGradient(w / 2, h / 2, w * .2, w / 2, h / 2, w / 2); m.addColorStop(0, '#fff'); m.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = m; g.fillRect(0, 0, w, h);
      });
      const disc = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshBasicMaterial({ map: floorTex, transparent: true, depthWrite: false }));
      disc.rotation.x = -Math.PI / 2; disc.position.y = -.01; scene.add(disc);
      const sh = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: .38 }));
      sh.rotation.x = -Math.PI / 2; sh.position.y = .005; sh.receiveShadow = true; scene.add(sh);
      makeParticles(); makeAmbient();
      canvas.addEventListener('pointermove', (e) => {
        const r = canvas.getBoundingClientRect();
        ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      });
      canvas.addEventListener('pointerleave', () => { ptr.set(-9, -9); });
      canvas.addEventListener('click', (e) => {
        if (mode !== 'pick' || !pickCb) return;
        const r = canvas.getBoundingClientRect();
        ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        const idx = pickAt();
        if (idx >= 0) pickCb(idx);
      });
      window.addEventListener('resize', B.resize); B.resize();
      camPos.set(0, 12, 12); camLook.set(0, .5, 0);
      B.ok = true;
      if (!running) { running = true; lastT = performance.now(); requestAnimationFrame(frame); }
    },
    resize() {
      if (!ren) return;
      const w = window.innerWidth, h = window.innerHeight;
      ren.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
      if (boxes.length) { const L = layout(boxes.length); fitCamera(L.rows, L.widest); }
    },
    count: () => boxes.length,
    box: (i) => boxes[i],
    /* 'none' | 'hover' (reaccionan al cursor) | 'pick' (además se puede hacer clic; cb(index)) */
    setMode(m, cb) { mode = m; pickCb = cb || null; if (m === 'none') { hover = -1; canvas.style.cursor = ''; } },
    cancelAll,

    /* Crea las cajas (una por asignación) con animación de entrada. `assign` = [{student}] o un número (decorativas). */
    build(assign) {
      clearBoxes();
      const items = typeof assign === 'number' ? Array.from({ length: assign }, () => ({ student: null })) : assign;
      const L = layout(items.length); fitCamera(L.rows, L.widest);
      boxes = items.map((a, i) => { const b = makeBox(i, a.student); b.slot = L.slots[i]; b.root.position.set(b.slot.x, 0, b.slot.z); b.root.scale.setScalar(.001); return b; });
      focused = null; spot.intensity = 0;
      MG.audioManager && MG.audioManager.appear();
      return Promise.all(boxes.map((b, i) => wait(i * 70).then(() => tween(520, (k) => { b.scale = k; b.yJump = (1 - k) * 4; }, ease.back))));
    },
    /* Baraja: las cajas saltan e intercambian lugares varias veces. */
    async shuffle(ms) {
      const n = boxes.length; if (n < 2) { await wait(ms * .5); return; }
      const rounds = Math.max(3, Math.round(ms / 520)), per = ms / rounds;
      for (let r = 0; r < rounds; r++) {
        const slots = MG.roundManager.shuffle(boxes.map((b) => b.slot));
        MG.audioManager.shuffle();
        camShake = .25;
        await Promise.all(boxes.map((b, i) => {
          const from = { x: b.slot.x, z: b.slot.z }, to = slots[i]; b.slot = to;
          return tween(per, (k) => { b.root.position.x = lerp(from.x, to.x, k); b.root.position.z = lerp(from.z, to.z, k); b.yJump = Math.sin(k * Math.PI) * 1.3; b.glow = Math.sin(k * Math.PI) * .6; b.glowT = 0; }, ease.inout);
        }));
        boxes.forEach((b) => { b.yJump = 0; });
      }
    },
    /* Las luces saltan de caja en caja, cada vez más lento, y terminan en `finalIndex`.
       El profesor puede cortar la animación con un clic sobre cualquier caja (el estudiante dentro ya es aleatorio). */
    chase(finalIndex, opts) {
      opts = opts || {};
      return new Promise((resolve) => {
        const n = boxes.length; let hops = Math.max(10, Math.min(18, n * 2 + 6)), h = 0, prev = -1, done = false, timer = null;
        const light = (i, snd) => { boxes.forEach((b, k) => { b.glowT = k === i ? 1 : 0; }); if (i >= 0) { const b = boxes[i]; spot.color.setHex(b.color); b.hop = 1; if (snd) MG.audioManager.tick(h); } };
        const finish = (idx, clicked) => {
          if (done) return; done = true; clearTimeout(timer); mode = 'none'; pickCb = null;
          light(idx, false); resolve({ index: idx, clicked: !!clicked });
        };
        mode = 'pick'; pickCb = (idx) => finish(idx, true);
        const hop = () => {
          if (done) return;
          h++; let i;
          if (h >= hops) i = finalIndex;
          else { do { i = (Math.random() * n) | 0; } while (n > 1 && i === prev); }
          prev = i; light(i, true);
          if (h >= hops) { timer = setTimeout(() => finish(finalIndex, false), 420); return; }
          const k = h / hops; timer = setTimeout(hop, 85 + Math.pow(k, 2.2) * 330);
        };
        hop();
      });
    },
    /* Caja elegida: se destaca, tiembla, se ilumina, viaja al centro y se abre. */
    async open(index) {
      const b = boxes[index]; focused = b; mode = 'none';
      b.hop = 0;
      boxes.forEach((o) => { if (o !== b) o.glowT = 0; });
      b.glowT = 1; spot.color.setHex(b.color);
      MG.audioManager.lock();
      await Promise.all([
        tween(900, (k) => { b.shake = k; }, ease.lin),
        (async () => { MG.audioManager.rumble(); await wait(250); })(),
      ]);
      // viaja al frente-centro mientras los demás se alejan
      const from = { x: b.root.position.x, z: b.root.position.z }, others = boxes.filter((o) => o !== b), sc0 = others.map((o) => ({ s: o.dim, x: o.root.position.x, z: o.root.position.z }));
      b.shake = .55;
      await tween(650, (k) => {
        b.root.position.x = lerp(from.x, focusPos.x, k); b.root.position.z = lerp(from.z, focusPos.z, k); b.scale = 1 + k * .25; b.yJump = Math.sin(k * Math.PI) * 1;
        others.forEach((o, j) => { o.dim = lerp(sc0[j].s, 1, k); o.root.position.z = sc0[j].z - k * 3.2; o.root.position.x = sc0[j].x * (1 + k * .25); });
      }, ease.inout);
      b.yJump = 0;
      // tapa: tiembla fuerte, estalla
      await tween(450, (k) => { b.shake = .6 + k * .9; b.glow = k; });
      MG.audioManager.open();
      b.shake = 0; camShake = .5;
      const t0 = b.root.position;
      burst(t0.x, 2.2, t0.z, 60, [GOLD, 0xffffff, b.color, 0xfff2b0], 5.5, 7, 1.2, 8);
      keyLight.intensity = 1.5;
      await tween(520, (k) => { b.lidAngle = 2.05 * ease.back(k); b.glowMat.opacity = k * .9; b.beamMat.opacity = k * .35; keyLight.intensity = lerp(1.5, .85, k); }, ease.lin);
      b.lidAngle = 2.05;
    },
    /* Aparece el nombre flotando sobre la caja abierta. */
    async showName(name) {
      const b = focused; if (!b) return;
      const tex = canvasTex(1024, 256, (g, w, h) => {
        g.fillStyle = 'rgba(8,14,40,.92)'; const r = 40; g.beginPath(); g.moveTo(r, 10); g.arcTo(w - 10, 10, w - 10, h - 10, r); g.arcTo(w - 10, h - 10, 10, h - 10, r); g.arcTo(10, h - 10, 10, 10, r); g.arcTo(10, 10, w - 10, 10, r); g.fill();
        g.lineWidth = 14; g.strokeStyle = '#ffd23f'; g.stroke();
        let fs = 150; g.font = `900 ${fs}px system-ui,Arial,sans-serif`;
        while (g.measureText(name.toUpperCase()).width > w - 110 && fs > 40) { fs -= 6; g.font = `900 ${fs}px system-ui,Arial,sans-serif`; }
        g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(name.toUpperCase(), w / 2, h / 2 + 6);
      });
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
      spr.renderOrder = 20; spr.scale.set(.01, .01, 1); spr.position.set(0, 1.4, 0); b.root.add(spr); b.sprite = spr;
      MG.audioManager.reveal();
      const p = b.root.position;
      burst(p.x, 2.6, p.z, 50, [GOLD, 0xffffff, 0xff6fb5, 0x3d9bff, 0x35d07f], 4.5, 6, 1.4, 5);
      await tween(650, (k) => { spr.scale.set(3.2 * k, .8 * k, 1); spr.position.y = lerp(1.4, 2.3, k); }, ease.back);
    },
    /* Reacción al resultado. */
    async verdict(ok) {
      const b = focused; if (!b) return;
      const p = b.root.position;
      if (ok) {
        MG.audioManager.ok();
        burst(p.x, 2.4, p.z, 90, [0x35d07f, GOLD, 0xffffff, 0x3d9bff], 6.5, 9, 1.6, 7);
        await tween(500, (k) => { b.yJump = Math.abs(Math.sin(k * Math.PI * 2)) * .8; });
      } else {
        MG.audioManager.bad();
        burst(p.x, 1.8, p.z, 50, [0xff4d4d, 0x992222, 0x777777], 3.5, 3, 1.4, -1);
        camShake = .5;
        await tween(450, (k) => { b.shake = (1 - k) * 1.2; b.glow = 1 - k; });
        b.shake = 0;
      }
    },
    /* El estudiante deja la ronda: nombre y caja se desvanecen. */
    async dismiss() {
      const b = focused; if (!b) return;
      b.gone = true;
      const s0 = b.scale, others = boxes.filter((o) => o !== b);
      await tween(450, (k) => { b.scale = s0 * (1 - k); b.yJump = k * 1.6; b.lidAngle = 2.05 * (1 - k * .3); if (b.sprite) b.sprite.material.opacity = 1 - k; others.forEach((o) => { o.scale = 1 - k * .9; }); }, ease.inout);
      focused = null;
    },
    /* Fuegos artificiales de fin de ronda. */
    async fireworks() {
      MG.audioManager.done();
      for (let i = 0; i < 6; i++) {
        burst((Math.random() - .5) * 9, 2.5 + Math.random() * 3, (Math.random() - .5) * 4, 55, [GOLD, 0xff6fb5, 0x3d9bff, 0x35d07f, 0xffffff], 4.5, 3, 1.5, 3.5);
        await wait(280);
      }
    },
    clear() { clearBoxes(); },
    view(m) { focused = m === 'focus' ? focused : null; },
    /* para pruebas */
    debug: () => ({ n: boxes.length, mode, students: boxes.map((b) => b.student && b.student.name), slots: boxes.map((b) => b.slot), glow: boxes.map((b) => +b.glowT) }),
  });

  /* ---------- bucle ---------- */
  function pickAt() {
    ray.setFromCamera(ptr, cam);
    const hit = ray.intersectObjects(boxes.filter((b) => !b.gone).flatMap((b) => [b.body, b.lid]), false)[0];
    return hit ? hit.object.userData.idx : -1;
  }
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - lastT) / 1000, .05); lastT = now; T += dt;
    // tweens
    for (let i = 0; i < tweens.length;) {
      const w = tweens[i]; w.t += dt; const k = Math.min(w.t / w.d, 1); w.fn(w.ez(k));
      if (k >= 1) { tweens.splice(i, 1); w.res(); } else i++;
    }
    // hover
    let h = -1;
    if (mode === 'pick' || mode === 'hover') { if (ptr.x > -2) h = pickAt(); }
    hover = h; canvas.style.cursor = h >= 0 && mode === 'pick' ? 'pointer' : h >= 0 ? 'help' : '';
    // cajas
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i], isF = b === focused;
      const target = Math.max(b.glowT, i === hover ? (mode === 'pick' ? .75 : .45) : 0);
      b.glow += (target - b.glow) * Math.min(1, dt * 10);
      if (b.hop > 0) b.hop = Math.max(0, b.hop - dt * 5);
      const idle = isF ? 0 : Math.sin(T * 1.6 + b.phase) * .09;
      const hopY = (b.hop || 0) * .45, hovY = i === hover ? .22 : 0;
      b.hov += (hovY - b.hov) * Math.min(1, dt * 8);
      b.inner.position.y = .14 + idle + b.hov + hopY + b.yJump;
      const sx = b.shake ? (Math.random() - .5) * .16 * b.shake : 0, sz = b.shake ? (Math.random() - .5) * .16 * b.shake : 0;
      b.inner.position.x = sx; b.inner.position.z = sz;
      let yawT = Math.sin(T * .7 + b.phase) * .1;
      if (i === hover) { const dx = ptr.x * .35; yawT = dx; }
      b.yaw += (yawT - b.yaw) * Math.min(1, dt * 6);
      b.inner.rotation.y = b.yaw + (b.shake ? (Math.random() - .5) * .12 * b.shake : 0);
      b.inner.rotation.z = Math.sin(T * 1.2 + b.phase) * .015 + (b.shake ? (Math.random() - .5) * .08 * b.shake : 0);
      const gl = b.glow, dim = b.dim || 0;
      b.bodyMat.emissiveIntensity = (.06 + gl * .85) * (1 - dim * .8); b.lidMat.emissiveIntensity = b.bodyMat.emissiveIntensity;
      b.haloMat.opacity = (.2 + gl * .65) * (1 - dim * .7);
      b.halo.scale.setScalar(4 + gl * 1.2);
      const sc = Math.max(.001, b.scale * (1 + gl * .1) * (1 - dim * .42));
      b.root.scale.setScalar(sc);
      b.root.position.y = 0;
      b.lidPivot.rotation.x = -b.lidAngle;
      if (b.lidAngle > .1) { b.beamMat.opacity = Math.max(b.beamMat.opacity * (b.gone ? .9 : 1), 0); b.beam.rotation.y += dt * .6; b.glowMat.opacity = .75 + Math.sin(T * 5) * .12; if (b.gone) { b.glowMat.opacity *= .5; } }
      if (b.sprite && !b.gone) b.sprite.position.y = 2.3 + Math.sin(T * 2.2) * .06;
    }
    // luz móvil sigue a la caja resaltada
    let hi = null, best = .3;
    boxes.forEach((b) => { if (b.glow > best && !b.gone) { best = b.glow; hi = b; } });
    if (hi) { const p = hi.root.position; spot.position.set(p.x, 3.2, p.z + 1.2); spot.color.setHex(hi.color); spot.intensity += (best * 1.9 - spot.intensity) * Math.min(1, dt * 12); }
    else spot.intensity += (0 - spot.intensity) * Math.min(1, dt * 8);
    // cámara
    if (focused) focusGoal(); else overviewGoal();
    const kc = 1 - Math.exp(-3.2 * dt);
    camPos.lerp(camGoalPos, kc); camLook.lerp(camGoalLook, kc);
    camShake = Math.max(0, camShake - dt * 1.4);
    cam.position.set(camPos.x + (Math.random() - .5) * camShake * .35, camPos.y + (Math.random() - .5) * camShake * .35, camPos.z);
    cam.lookAt(camLook);
    stepParticles(dt); stepAmbient(dt);
    ren.render(scene, cam);
  }
})();
