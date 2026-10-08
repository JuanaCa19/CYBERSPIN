/* questionManager.js — preguntas de inglés. NO duplica nada: usa el banco compartido (ArenaQuestions)
 * y la misma configuración/preguntas propias que Bomb Race (localStorage "ebr.c" y "ebr.q"). */
(function () {
  'use strict';
  const MG = (window.MysteryBoxesGame = window.MysteryBoxesGame || {});
  const KC = 'ebr.c', KQ = 'ebr.q', MEM = {};
  const T = ArenaQuestions.TOPICS;
  const read = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return k in MEM ? MEM[k] : d; } };
  const write = (k, v) => { MEM[k] = v; try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin acceso */ } };
  const used = new Set(); // preguntas ya usadas en esta ronda (se limpia al empezar cada ronda)

  const cfg = () => {
    const c = Object.assign({ mode: 'auto', topics: T.slice(), level: 'm', rep: 'reset', snd: true, vol: .5 }, read(KC, {}));
    c.topics = (c.topics || []).filter((t) => T.includes(t));
    return c;
  };
  /* Guarda solo las claves indicadas, conservando el resto de la configuración de Bomb Race. */
  const patchCfg = (p) => write(KC, Object.assign({}, read(KC, {}), p));
  const custom = () => { const q = read(KQ, []); return Array.isArray(q) ? q : []; };

  MG.questionManager = {
    cfg, patchCfg, custom, LEVELS: ArenaQuestions.LEVELS,
    resetRound: () => used.clear(),
    next: () => ArenaQuestions.pick(cfg(), custom(), used),
    /* Pregunta propia (mismo formato que Bomb Race → aparece también allí). */
    addCustom(q, a) {
      q = String(q || '').trim(); a = String(a || '').trim();
      if (!q || !a) return { ok: false, message: 'The question and expected answer are required.' };
      const list = custom();
      if (list.some((x) => String(x.q).toLowerCase() === q.toLowerCase())) return { ok: false, message: 'That question already exists.' };
      list.push({ q, a, alts: [], kw: [], exp: '', topic: T[0], level: cfg().level });
      write(KQ, list);
      return { ok: true, message: 'Question saved.' };
    },
  };
})();
