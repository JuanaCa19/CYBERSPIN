/* game.js — controlador de MYSTERY BOXES: une los módulos y gobierna el flujo.
 *   STUDENTS → START GAME → [START ROUND] → shuffle → selección → caja abierta → pregunta → CORRECT/INCORRECT
 *   → NEXT STUDENT → (otra selección) … → ROUND COMPLETE → PLAY AGAIN / MAIN MENU
 * Regla fundamental (en roundManager): el estudiante sale de AVAILABLE en cuanto es seleccionado, sin importar el resultado. */
(function () {
  'use strict';
  const MG = window.MysteryBoxesGame, RM = MG.roundManager, SM = MG.studentManager, QM = MG.questionManager, BM = MG.boxManager, UI = MG.uiManager, AU = MG.audioManager, RS = MG.resultManager;
  const MENU_URL = '../../index.html?back=mystery-boxes';
  const G = { phase: 'students', token: 0, q: null, reveal: false, editId: null, confirm: null, msg: '', msgOk: false, early: false };
  MG.state = G; // útil para depurar en consola

  const hudInfo = () => ({ round: RM.roundNumber, left: RM.left(), total: RM.total(), selected: RM.selectedCount });
  const live = (t) => t === G.token; // ¿sigue vigente esta secuencia asíncrona?
  const rnd = (n) => (Math.random() * n) | 0;

  /* ---------- pantalla STUDENTS ---------- */
  function showStudents() {
    G.token++; G.phase = 'students'; G.early = false;
    BM.cancelAll(); BM.setMode('none');
    UI.hud(null); UI.banner(); UI.dock(''); UI.resetBump();
    BM.build(5);
    UI.students(SM.list(), { sync: SM.syncLine(), msg: G.msg, ok: G.msgOk, editId: G.editId });
    G.msg = '';
  }
  const note = (m, ok) => { UI.setMsg(m, ok); };
  function refreshList() { if (G.phase === 'students') { UI.setStudentList(SM.list(), G.editId); UI.setSync(SM.syncLine()); } }

  /* ---------- inicio de partida / ronda ---------- */
  function startGame() {
    const list = SM.list(), v = RM.validate(list);
    if (!v.ok) { note(v.message); UI.toast(v.message); return; }
    RM.start(list); QM.resetRound();
    beginRound();
  }
  function beginRound() {
    const my = ++G.token; G.phase = 'ready'; G.q = null; G.early = false;
    UI.screen(''); UI.banner(); UI.resetBump(); UI.hud(hudInfo()); UI.results(RM.results);
    UI.dock('');
    BM.cancelAll();
    BM.build(RM.drawBoxes()).then(() => {
      if (!live(my)) return;
      BM.setMode('hover'); UI.startRound();
    });
  }

  /* ---------- selección ---------- */
  async function runSelection() {
    const my = G.token;
    if (RM.isComplete() || RM.pending) return;
    G.phase = 'shuffling'; UI.banner(); UI.hint('🔀 Shuffling the boxes…'); BM.setMode('none');
    await BM.shuffle(1800); if (!live(my)) return;
    G.phase = 'choosing'; UI.hint('✨ Picking a box… <b>or click any box!</b>', true);
    const final = rnd(BM.count());                 // el azar decide; un clic del profesor solo corta la animación
    const res = await BM.chase(final); if (!live(my)) return;
    const box = BM.box(res.index);
    if (!box || !box.student) { UI.toast('Internal error: box without student'); return restoreReady(); }
    let student;
    try { student = RM.select(box.student); }       // ← AVAILABLE − seleccionado (inmediato)
    catch (err) { console.error(err); UI.toast(err.message); return restoreReady(); }
    UI.hud(hudInfo());                              // STUDENTS LEFT / SELECTED se actualizan ya
    G.phase = 'opening'; UI.hint('📦 Opening…');
    await BM.open(res.index); if (!live(my)) return;
    UI.banner('MYSTERY BOX OPENED!', student.name, 'sm');
    await BM.showName(student.name); if (!live(my)) return;
    askQuestion();
  }
  function restoreReady() { G.phase = 'ready'; BM.setMode('hover'); UI.startRound(); }

  /* ---------- pregunta y veredicto ---------- */
  function askQuestion() {
    G.phase = 'question'; G.q = QM.next(); G.reveal = false;
    UI.question(G.q, RM.current.name, false);
    lockJudge();
  }
  function lockJudge() { // evita clics accidentales justo al aparecer
    ['#okBtn', '#noBtn'].forEach((s) => { const b = UI.$(s); if (b) { b.disabled = true; setTimeout(() => { b.disabled = false; }, 600); } });
  }
  async function verdict(ok) {
    if (G.phase !== 'question') return;
    const my = G.token, name = RM.current.name;
    G.phase = 'result';
    RM.record(ok, G.q.q);                           // el estudiante YA estaba fuera; esto solo guarda el resultado
    UI.results(RM.results); UI.dock('');
    UI.banner(ok ? '✓ CORRECT!' : '✕ INCORRECT', ok ? name + ' PASSED!' : name + ' IS OUT!', ok ? 'ok' : 'no');
    BM.verdict(ok);
    await new Promise((r) => setTimeout(r, 900)); if (!live(my)) return;
    G.phase = 'afterResult'; UI.next(RM.isComplete());
  }
  async function nextStudent() {
    if (G.phase !== 'afterResult') return;
    const my = G.token; G.phase = 'leaving'; UI.dock(''); UI.banner();
    await BM.dismiss(); if (!live(my)) return;
    if (RM.isComplete()) return finishRound(false);
    await BM.build(RM.drawBoxes()); if (!live(my)) return;   // cajas nuevas, solo con estudiantes disponibles
    runSelection();
  }

  /* ---------- fin de ronda ---------- */
  function finishRound(early) {
    const my = ++G.token; G.phase = 'complete'; G.early = !!early;
    BM.cancelAll(); BM.setMode('none'); BM.clear(); UI.dock(''); UI.banner();
    UI.hud(hudInfo()); UI.results(RM.results);
    UI.complete(RM.summary(), RM.results, early);
    if (!early) BM.fireworks();
    else BM.build(5);
  }
  function playAgain() {
    const r = RM.newRound(SM.list());               // AVAILABLE = copia completa de ALL; nada de la ronda anterior se conserva
    if (!r.ok) { UI.toast(r.message); G.msg = r.message; return showStudents(); }
    QM.resetRound(); beginRound();
  }

  /* ---------- salir ---------- */
  function goMenu() { G.token++; BM.cancelAll(); location.href = MENU_URL; }
  function askMenu() {
    const active = !['students', 'complete'].includes(G.phase);
    if (!active) return goMenu();
    G.confirm = goMenu; UI.confirm('Back to the main menu? The current round will be lost.', 'MAIN MENU');
  }

  /* ---------- acciones de la interfaz ---------- */
  UI.onAction(async (a, d) => {
    switch (a) {
      case 'menu': askMenu(); break;
      case 'menuNow': goMenu(); break;
      case 'snd': AU.toggle(); UI.sound(); break;
      case 'res': UI.toggleResults(); break;
      case 'end':
        if (G.phase === 'complete') break;
        G.confirm = () => finishRound(true); UI.confirm('End the round now?', 'END ROUND'); break;
      case 'dyes': { const f = G.confirm; G.confirm = null; UI.closeConfirm(); if (f) f(); break; }
      case 'dno': G.confirm = null; UI.closeConfirm(); break;
      /* estudiantes */
      case 'sadd': {
        const r = await SM.add(UI.val('#sn')); note(r.ok ? '“' + r.name + '” added.' : r.message, r.ok);
        if (r.ok) { UI.$('#sn').value = ''; refreshList(); } UI.focus('#sn'); break;
      }
      case 'slist': {
        const r = await SM.addMany(UI.val('#sl').split(/\r?\n/)); note(r.message, !r.failed);
        if (!r.failed) UI.$('#sl').value = ''; refreshList(); break;
      }
      case 'sedit': G.editId = d.id; refreshList(); UI.focus('#se'); break;
      case 'scancel': G.editId = null; refreshList(); break;
      case 'ssave': {
        const r = await SM.rename(d.id, UI.val('#se'));
        if (r.ok) { G.editId = null; note('Saved.', true); } else note(r.message);
        refreshList(); break;
      }
      case 'sdel': { if (G.editId === d.id) G.editId = null; const r = await SM.remove(d.id); note(r.ok ? 'Removed.' : r.message, r.ok); refreshList(); break; }
      case 'start': AU.unlock(); startGame(); break;
      /* preguntas */
      case 'qmode': QM.patchCfg({ mode: d.v }); UI.students(SM.list(), { sync: SM.syncLine(), editId: G.editId }); break;
      case 'qlevel': QM.patchCfg({ level: d.v }); UI.students(SM.list(), { sync: SM.syncLine(), editId: G.editId }); break;
      case 'qadd': { const r = QM.addCustom(UI.val('#qq'), UI.val('#qa')); if (r.ok) UI.students(SM.list(), { sync: SM.syncLine(), msg: r.message, ok: true, editId: G.editId }); else UI.setQMsg(r.message); break; }
      /* ronda */
      case 'startRound': if (G.phase === 'ready') runSelection(); break;
      case 'rev': if (G.phase === 'question') { G.reveal = !G.reveal; UI.question(G.q, RM.current.name, G.reveal); } break;
      case 'newq': if (G.phase === 'question') { G.q = QM.next(); G.reveal = false; UI.question(G.q, RM.current.name, false); } break;
      case 'ok': verdict(true); break;
      case 'no': verdict(false); break;
      case 'next': nextStudent(); break;
      case 'again': playAgain(); break;
    }
  });

  /* ---------- arranque ---------- */
  function boot() {
    try { BM.init(UI.$('#stage3d')); } catch (e) { console.error(e); UI.$('#nogl').hidden = false; return; }
    UI.init();
    SM.onChange(refreshList);
    SM.onStatus(() => { if (G.phase === 'students') UI.setSync(SM.syncLine()); });
    showStudents();
  }
  if (!window.THREE) { UI.$('#nogl').hidden = false; } else boot();

  /* ---------- autoprueba: MysteryBoxesGame.selfTest() en la consola ---------- */
  MG.selfTest = function (rounds) {
    const saved = { all: RM.all, av: RM.available, res: RM.results, cur: RM.current, pend: RM.pending, n: RM.selectedCount, rn: RM.roundNumber };
    let picks = 0, dup = 0;
    for (let t = 0; t < (rounds || 300); t++) {
      const n = 1 + (t % 30), list = Array.from({ length: n }, (_, i) => ({ id: 's' + i, name: 'S' + i })), seen = new Set();
      RM.newRound(list);
      while (!RM.isComplete()) {
        const b = RM.drawBoxes(), s = RM.select(b[rnd(b.length)].student);
        if (seen.has(s.id)) dup++; seen.add(s.id); picks++; RM.record(Math.random() < .5, '');
      }
      if (seen.size !== n) dup++;
    }
    Object.assign(RM, { all: saved.all, available: saved.av, results: saved.res, current: saved.cur, pending: saved.pend, selectedCount: saved.n, roundNumber: saved.rn });
    const out = { rounds: rounds || 300, selections: picks, duplicates: dup, passed: dup === 0 };
    console.log('Mystery Boxes self-test', out); return out;
  };
})();
