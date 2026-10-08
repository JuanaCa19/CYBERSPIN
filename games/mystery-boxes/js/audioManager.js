/* audioManager.js — sonidos con WebAudio (sin archivos). Comparte "snd" y "vol" con Bomb Race (localStorage "ebr.c"). */
(function () {
  'use strict';
  const MG = (window.MysteryBoxesGame = window.MysteryBoxesGame || {});
  let AC = null;
  const cfg = () => MG.questionManager.cfg();

  function unlock() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.resume) AC.resume(); } catch (e) { /* sin audio */ } }
  function beep(f, d, type, v, s, slide) {
    const c = cfg(); if (!c.snd || !AC) return;
    try {
      const o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime + (s || 0);
      o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
      g.gain.setValueAtTime(.22 * c.vol * (v == null ? 1 : v) + .0002, t);
      g.gain.exponentialRampToValueAtTime(.0002, t + d);
      o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d + .02);
    } catch (e) { /* ignorar */ }
  }
  const A = (MG.audioManager = {
    unlock,
    enabled: () => !!cfg().snd,
    toggle() { MG.questionManager.patchCfg({ snd: !cfg().snd }); unlock(); A.click(); return cfg().snd; },
    click: () => beep(440, .08, 'square', .6),
    hover: () => beep(620, .05, 'triangle', .4),
    appear: () => beep(300, .12, 'triangle', .5, 0, 600),
    shuffle: () => beep(180 + Math.random() * 120, .06, 'square', .35),
    tick: (i) => beep(520 + (i % 8) * 60, .07, 'triangle', .7),      // selección (cada luz)
    lock: () => { beep(660, .12, 'square'); beep(990, .2, 'sine', 1, .1); },
    rumble: () => beep(90, .6, 'sawtooth', .8, 0, 140),                // caja temblando
    open: () => { beep(330, .25, 'sawtooth', .6, 0, 880); beep(880, .3, 'sine', 1, .12); beep(1318, .4, 'sine', .8, .22); },
    reveal: () => [523, 659, 784].forEach((f, i) => beep(f, .22, 'sine', 1, i * .09)),
    ok: () => [523, 659, 784, 1046].forEach((f, i) => beep(f, .22, 'sine', 1, i * .1)),
    bad: () => { beep(300, .22, 'square'); beep(170, .4, 'square', 1, .2); },
    done: () => [523, 659, 784, 1046, 1318].forEach((f, i) => beep(f, .3, 'sine', 1, i * .13)),
  });
  document.addEventListener('pointerdown', unlock, { once: false, passive: true });
})();
