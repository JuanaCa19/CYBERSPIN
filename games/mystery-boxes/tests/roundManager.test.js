/* Prueba de la regla fundamental: nadie sale dos veces en una misma ronda.
 * Ejecutar:  node games/mystery-boxes/tests/roundManager.test.js
 */
const assert = require('assert');
const R = require('../js/roundManager.js');

const names = (n) => Array.from({ length: n }, (_, i) => ({ id: 'id' + i, name: 'Student ' + i }));
let rounds = 0, picks = 0;

for (let trial = 0; trial < 2000; trial++) {
  const n = 1 + (trial % 40);
  const list = names(n);
  const snapshot = JSON.stringify(list);
  const r = trial % 7 === 0 ? R.start(list) : R.newRound(list);
  assert(r.ok); rounds++;
  assert.strictEqual(R.available.length, n, 'AVAILABLE must start as a full copy of ALL');
  const seen = new Set();
  while (!R.isComplete()) {
    const boxes = R.drawBoxes();
    assert(boxes.length >= 1 && boxes.length <= R.MAX_BOXES);
    assert.strictEqual(new Set(boxes.map((b) => b.student.id)).size, boxes.length, 'one distinct student per box');
    boxes.forEach((b) => { assert(b.student, 'box without student'); assert(!seen.has(b.student.id), 'removed student in a box'); });
    const chosen = R.select(boxes[Math.random() * boxes.length | 0].student);
    assert(!seen.has(chosen.id), 'DUPLICATE in the same round: ' + chosen.name);
    seen.add(chosen.id); picks++;
    assert(!R.available.some((s) => s.id === chosen.id), 'selected student still available');
    assert.throws(() => R.select(chosen), /not available|already selected/); // can't pick twice
    R.record(Math.random() < .5, 'q');
    assert.strictEqual(R.left(), n - seen.size);
  }
  assert.strictEqual(seen.size, n, 'everyone is picked exactly once');
  assert.strictEqual(R.results.length, n);
  assert.throws(() => R.drawBoxes(), /No students/); // no more boxes after the last one
  assert.strictEqual(JSON.stringify(list), snapshot, 'original list must not be modified');
}

/* Nueva ronda: vuelven todos */
R.newRound(names(4));
const b = R.drawBoxes(); R.select(b[0].student); R.record(true, 'q');
assert.strictEqual(R.left(), 3);
R.newRound(names(4));
assert.strictEqual(R.left(), 4); assert.strictEqual(R.results.length, 0);

/* Validaciones */
assert.strictEqual(R.newRound([]).ok, false);
assert.strictEqual(R.validate([{ id: 'a', name: '   ' }]).ok, false);
assert.strictEqual(R.sanitize([{ id: 'a', name: 'María' }, { id: 'b', name: 'maria' }, { id: 'a', name: 'X' }]).length, 1, 'duplicates removed');
console.log(`OK — ${rounds} rounds, ${picks} selections, 0 duplicates.`);
