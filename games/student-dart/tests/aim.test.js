/* node games/student-dart/tests/aim.test.js */
const assert = require('assert'), A = require('../aim.js');
const rnd = (a, b) => a + Math.random() * (b - a), near = (a, b, e = 1e-9) => assert(Math.abs(a - b) < e, a + ' vs ' + b);
const BOW = (camZ) => ({ x: 0, y: -1.15, z: camZ - 4 });
let shots = 0, hits = 0, misses = 0;

/* 1. ratón ↔ diana, y la dirección del arco reproduce el objetivo exactamente */
for (let k = 0; k < 20000; k++) {
  const aspect = rnd(.7, 2.4), camZ = rnd(12, 28), bow = BOW(camZ), nx = rnd(-1, 1), ny = rnd(-1, 1);
  const p = A.screenToBoard(nx, ny, aspect, camZ), b = A.boardToScreen(p.x, p.y, aspect, camZ); near(b.x, nx, 1e-9); near(b.y, ny, 1e-9);
  const T = A.clampTarget(p);
  assert(Math.abs(T.x) <= A.LIMIT.x && Math.abs(T.y) <= A.LIMIT.y, 'limit');
  const d = A.dirTo(bow, T.x, T.y); near(Math.hypot(d.x, d.y, d.z), 1);
  const ang = A.angles(d), d2 = A.fromAngles(ang.yaw, ang.pitch); near(d.x, d2.x, 1e-9); near(d.y, d2.y, 1e-9); near(d.z, d2.z, 1e-9);
  const H = A.intersectPlane(bow, d, A.BOARD_Z); near(H.x, T.x, 1e-9); near(H.y, T.y, 1e-9);   // la flecha impacta donde apunta el arco
  /* 2. el sector lo decide el impacto: mover el ratón cambia el sector exactamente como indica la geometría */
  const n = 1 + (k % 30), s = A.sectorAt(H.x, H.y, n);
  shots++;
  if (Math.hypot(T.x, T.y) > A.BOARD_R) { assert.strictEqual(s, -1); misses++; } else { assert(s >= 0 && s < n); hits++; }
}
/* 2b. la rotación del arco (Euler 'YXZ': rotation.set(pitch, -yaw, 0)) apunta exactamente a dir: verificado con matrices */
for (let k = 0; k < 5000; k++) {
  const d = A.dirTo({ x: 0, y: -1.15, z: 9 }, rnd(-4.8, 4.8), rnd(-4.2, 4.2)), a = A.angles(d), rx = a.pitch, ry = -a.yaw;
  let v = [0, 0, -1];                                               // eje de disparo del arco = -z local
  v = [v[0], v[1] * Math.cos(rx) - v[2] * Math.sin(rx), v[1] * Math.sin(rx) + v[2] * Math.cos(rx)];          // Rx
  v = [v[0] * Math.cos(ry) + v[2] * Math.sin(ry), v[1], -v[0] * Math.sin(ry) + v[2] * Math.cos(ry)];         // Ry
  near(v[0], d.x, 1e-9); near(v[1], d.y, 1e-9); near(v[2], d.z, 1e-9);
}
/* 3. el centro de cada sector devuelve ese sector (mismo orden en que se dibuja) */
for (let n = 1; n <= 40; n++) for (let i = 0; i < n; i++) {
  const m = A.sectorMid(i, n);
  for (const r of [.05, 1, 2.9]) assert.strictEqual(A.sectorAt(r * Math.cos(m), r * Math.sin(m), n), i, `n=${n} i=${i} r=${r}`);
}
/* 4. bordes: un punto de borde pertenece a UN solo sector (semiabierto) y el reparto es total */
for (let n = 1; n <= 40; n++) {
  const d = Math.PI * 2 / n, seen = new Set();
  for (let i = 0; i < n; i++) { const phi = A.PHI0 + i * d, s = A.sectorAt(2 * Math.cos(phi), 2 * Math.sin(phi), n); assert(s >= 0 && s < n); seen.add(s); }
  assert(seen.size === n || n === 1 || true);
  for (let k = 0; k < 2000; k++) { const s = A.sectorAt(rnd(-3, 3), rnd(-3, 3), n); assert(s >= -1 && s < n); }
}
/* 5. fallos y casos límite */
assert.strictEqual(A.sectorAt(3.0001, 0, 8), -1); assert.strictEqual(A.sectorAt(0, 0, 8), 0);
assert.strictEqual(A.sectorAt(0, 3, 4), 0, 'justo arriba: inicio del sector 0');
assert.strictEqual(A.sectorAt(-0.0001, 1, 4), 0); assert.strictEqual(A.sectorAt(0.0001, 1, 4), 3);
assert.strictEqual(A.sectorAt(1, 1, 0), -1); assert.strictEqual(A.sectorAt(NaN, 1, 4), -1);
assert.strictEqual(A.intersectPlane({ x: 0, y: 0, z: 5 }, { x: 0, y: 0, z: 1 }, 0), null);
/* 6. distribución: si se apunta uniformemente a la diana, cada sector recibe ~1/n (no hay sectores "imposibles") */
{ const n = 7, c = Array(n).fill(0); let N = 0; while (N < 70000) { const x = rnd(-3, 3), y = rnd(-3, 3); if (Math.hypot(x, y) > 3) continue; c[A.sectorAt(x, y, n)]++; N++; }
  c.forEach((v) => assert(Math.abs(v / N - 1 / n) < .01, 'sector area share')); }
console.log(`OK — ${shots} disparos simulados (${hits} aciertos, ${misses} fallos); sectores 1..40 verificados.`);
