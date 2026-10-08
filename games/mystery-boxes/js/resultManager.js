/* resultManager.js — historial de la ronda actual (ROUND RESULTS) y resumen final. Solo presentación: los datos están en roundManager. */
(function () {
  'use strict';
  const MG = (window.MysteryBoxesGame = window.MysteryBoxesGame || {});
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const mark = (r) => (r.correct ? '<b class="okc">✓ Correct</b>' : '<b class="noc">✕ Incorrect</b>');
  MG.resultManager = {
    esc,
    /* 1. Juan — ✓ Correct */
    listHTML(results, numbered) {
      if (!results.length) return '<p class="mu">Nobody has played yet.</p>';
      return '<ol class="rl' + (numbered ? '' : ' plain') + '">' + results.map((r) =>
        `<li class="${r.correct ? 'ok' : 'no'}"><span class="nm">${esc(r.student.name)}</span> — ${mark(r)}</li>`).join('') + '</ol>';
    },
    /* Lista final tal como se pidió: ✓ Juan — Correct */
    finalHTML(results) {
      return '<ul class="rl final">' + results.map((r) =>
        `<li class="${r.correct ? 'ok' : 'no'}"><i>${r.correct ? '✓' : '✕'}</i><span class="nm">${esc(r.student.name)}</span> — ${r.correct ? 'Correct' : 'Incorrect'}</li>`).join('') + '</ul>';
    },
  };
})();
