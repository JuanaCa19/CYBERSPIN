/* roundManager.js — lógica PURA de la ronda (sin DOM, sin Three.js; se puede probar en Node).
 *
 *   ALL STUDENTS        = copia de la lista registrada al empezar la ronda (nunca se modifica durante la ronda)
 *   AVAILABLE STUDENTS  = quienes todavía pueden salir en ESTA ronda
 *
 *   start / newRound : AVAILABLE = copia de ALL
 *   select(student)  : AVAILABLE = AVAILABLE − student   (se quita en el instante de salir, ANTES de la pregunta)
 *
 * Un estudiante seleccionado no vuelve a estar disponible hasta la siguiente ronda,
 * sea cual sea el resultado de su pregunta.
 */
(function (root) {
  'use strict';

  const MAX_BOXES = 12; // cajas visibles a la vez (si hay más estudiantes, se reparten al azar entre las cajas)

  const norm = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

  /* Copia limpia: sin vacíos, sin duplicados (por id y por nombre). */
  function sanitize(list) {
    const ids = new Set(), names = new Set(), out = [];
    (list || []).forEach((s) => {
      if (!s) return;
      const name = String(s.name == null ? '' : s.name).replace(/\s+/g, ' ').trim();
      const id = s.id != null ? String(s.id) : 'n:' + norm(name);
      if (!name || ids.has(id) || names.has(norm(name))) return;
      ids.add(id); names.add(norm(name)); out.push({ id, name });
    });
    return out;
  }

  const R = {
    roundNumber: 0,
    all: [],         // ALL STUDENTS (snapshot de la ronda)
    available: [],   // AVAILABLE STUDENTS
    results: [],     // [{ student, correct, question }]
    current: null,   // estudiante seleccionado cuya pregunta está en curso
    pending: false,  // true entre select() y record()
    selectedCount: 0,

    /* Valida la lista sin empezar nada. */
    validate(list) {
      return sanitize(list).length ? { ok: true } : { ok: false, error: 'no-students', message: 'Please add at least one student.' };
    },

    /* Primera ronda (round = 1). */
    start(list) { R.roundNumber = 0; return R.newRound(list); },

    /* Nueva ronda: AVAILABLE vuelve a ser una copia COMPLETA de ALL (la lista original no se toca). */
    newRound(list) {
      const all = sanitize(list);
      if (!all.length) return { ok: false, error: 'no-students', message: 'Please add at least one student.' };
      R.roundNumber++;
      R.all = all;
      R.available = all.slice();
      R.results = [];
      R.current = null;
      R.pending = false;
      R.selectedCount = 0;
      return { ok: true, round: R.roundNumber, total: all.length };
    },

    /* Asigna un estudiante DISTINTO a cada caja (solo de AVAILABLE). Si hay más estudiantes que cajas, usa un subconjunto al azar. */
    drawBoxes(max) {
      if (!R.available.length) throw new Error('No students available');
      const n = Math.min(R.available.length, max || MAX_BOXES);
      return shuffle(R.available).slice(0, n).map((student, i) => ({ boxId: i, student }));
    },

    /* Selecciona `student` (debe estar disponible) y lo QUITA de AVAILABLE inmediatamente. */
    select(student) {
      if (R.pending) throw new Error('A student is already selected');
      const k = student ? R.available.findIndex((s) => s.id === student.id) : -1;
      if (k < 0) throw new Error('Student is not available in this round');
      const [s] = R.available.splice(k, 1);
      R.current = s; R.pending = true; R.selectedCount++;
      return s;
    },

    /* Guarda el resultado del estudiante actual. */
    record(correct, question) {
      if (!R.pending || !R.current) throw new Error('No student selected');
      R.results.push({ student: R.current, correct: !!correct, question: question || '' });
      R.current = null; R.pending = false;
      return R.results[R.results.length - 1];
    },

    isComplete() { return R.available.length === 0 && !R.pending; },
    left() { return R.available.length; },
    total() { return R.all.length; },
    summary() {
      return { round: R.roundNumber, selected: R.results.length, remaining: R.available.length, total: R.all.length,
        correct: R.results.filter((r) => r.correct).length, incorrect: R.results.filter((r) => !r.correct).length };
    },
    sanitize, shuffle, MAX_BOXES,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = R;
  else { root.MysteryBoxesGame = root.MysteryBoxesGame || {}; root.MysteryBoxesGame.roundManager = R; }
})(typeof window !== 'undefined' ? window : globalThis);
