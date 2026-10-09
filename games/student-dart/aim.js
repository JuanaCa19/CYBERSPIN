/* aim.js — matemática PURA del apuntado y del impacto de Student Dart (sin DOM ni Three.js; se prueba en Node).
 *
 * Sistema de coordenadas del mundo: x → derecha, y → arriba, z → hacia el jugador.
 *   · Diana: círculo de radio BOARD_R centrado en (0,0), cara en el plano z = BOARD_Z.
 *   · Cámara en (0,0,camZ) mirando hacia -z.  El arco está delante de la cámara en `bow` (origen de la flecha).
 *
 * Cadena de apuntado (todo derivado del ratón, nada aleatorio):
 *   ratón (NDC) → punto objetivo en la diana (rayo de cámara ∩ plano) → se limita a LIMIT
 *   → dirección del arco = normalize(objetivo − bow)  (yaw/pitch del arco)
 *   → la flecha viaja por el rayo  bow + t·dir → impacto = rayo ∩ plano de la diana
 *   → sector = f(ángulo del impacto)   |   fuera del radio = FALLO
 *
 * Regla de sectores (única y consistente):
 *   · n sectores iguales de Δ = 2π/n que llegan hasta el centro. El sector 0 empieza arriba (φ = π/2)
 *     y los siguientes avanzan en sentido antihorario.
 *   · Intervalos semiabiertos [inicio, fin): un impacto exactamente sobre un borde pertenece SOLO al sector
 *     que empieza en ese borde, así que nunca puede seleccionar a dos estudiantes.
 *   · El centro exacto (r = 0) pertenece al sector 0. Cualquier otro punto del centro se resuelve por su ángulo.
 *   · r > BOARD_R es fallo (r = BOARD_R todavía cuenta como acierto).
 */
(function (root) {
  'use strict';
  const TAU = Math.PI * 2;
  const A = {
    BOARD_R: 3,
    BOARD_Z: 0.1,
    WALL_Z: -0.55,
    PHI0: Math.PI / 2,
    FOV: 45,
    LIMIT: { x: 4.8, y: 4.2 },      // zona máxima apuntable (en unidades de la diana): evita apuntar fuera del escenario
    ARROW_TIP: 0.7,                  // distancia centro de la flecha → punta (astil/2 + cono)

    /* Posición del ratón (NDC −1…1) → punto sobre el plano de la diana (rayo de la cámara). */
    screenToBoard(ndcX, ndcY, aspect, camZ) {
      const t = Math.tan(A.FOV * Math.PI / 360), dist = camZ - A.BOARD_Z;
      return { x: ndcX * t * aspect * dist, y: ndcY * t * dist };
    },
    /* Inversa (para pruebas y para colocar elementos de la interfaz). */
    boardToScreen(x, y, aspect, camZ) {
      const t = Math.tan(A.FOV * Math.PI / 360), dist = camZ - A.BOARD_Z;
      return { x: x / (t * aspect * dist), y: y / (t * dist) };
    },
    clampTarget(p) {
      return { x: Math.max(-A.LIMIT.x, Math.min(A.LIMIT.x, p.x)), y: Math.max(-A.LIMIT.y, Math.min(A.LIMIT.y, p.y)) };
    },
    /* Dirección unitaria del arco desde `bow` hacia el objetivo (x,y) en la diana. */
    dirTo(bow, tx, ty) {
      const dx = tx - bow.x, dy = ty - bow.y, dz = A.BOARD_Z - bow.z, l = Math.hypot(dx, dy, dz);
      return { x: dx / l, y: dy / l, z: dz / l };
    },
    /* Ángulos del arco: yaw (izq/der) y pitch (elevación). Con rotation.order='YXZ': rotation.set(pitch, −yaw, 0). */
    angles(d) { return { yaw: Math.atan2(d.x, -d.z), pitch: Math.atan2(d.y, Math.hypot(d.x, d.z)) }; },
    /* Inverso de angles(): dirección que mira un arco con ese yaw/pitch. */
    fromAngles(yaw, pitch) { return { x: Math.cos(pitch) * Math.sin(yaw), y: Math.sin(pitch), z: -Math.cos(pitch) * Math.cos(yaw) }; },
    /* Rayo (origen o, dirección d) ∩ plano z = zPlane. null si no avanza hacia ese plano. */
    intersectPlane(o, d, zPlane) {
      if (d.z >= 0) return null;
      const t = (zPlane - o.z) / d.z;
      if (t < 0) return null;
      return { x: o.x + d.x * t, y: o.y + d.y * t, z: zPlane, t };
    },
    onBoard(x, y) { return Math.hypot(x, y) <= A.BOARD_R; },
    /* Sector (0…n−1) que contiene el punto (x,y) de la diana (con rotación opcional spinAngle), o −1 si cae fuera de ella. */
    sectorAt(x, y, n, spinAngle = 0) {
      if (!(n > 0) || !isFinite(x) || !isFinite(y) || Math.hypot(x, y) > A.BOARD_R) return -1;
      if (x === 0 && y === 0) return 0;
      const cs = Math.cos(-spinAngle), sn = Math.sin(-spinAngle);
      const rx = x * cs - y * sn, ry = x * sn + y * cs;
      const d = TAU / n;
      let a = (Math.atan2(ry, rx) - A.PHI0) % TAU; if (a < 0) a += TAU;
      return Math.min(n - 1, Math.floor(a / d));
    },
    /* Ángulo (rad, mundo) del centro del sector i de n. */
    sectorMid(i, n) { return A.PHI0 + (i + 0.5) * TAU / n; },
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = A; else root.Aim = A;
})(typeof window !== 'undefined' ? window : globalThis);
