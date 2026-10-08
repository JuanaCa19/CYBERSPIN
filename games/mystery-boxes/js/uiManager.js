/* uiManager.js — todo el DOM de Mystery Boxes (HUD, banners, dock inferior, pantallas, diálogos). Sin lógica de juego:
 * los clics se reenvían a game.js mediante UI.onAction(fn) usando atributos data-a. */
(function () {
  'use strict';
  const MG = (window.MysteryBoxesGame = window.MysteryBoxesGame || {});
  const $ = (s) => document.querySelector(s);
  const esc = (s) => MG.resultManager.esc(s);
  let handler = () => {}, toastT = 0, lastLeft = null;

  const UI = (MG.uiManager = {
    $, esc,
    onAction(fn) { handler = fn; },
    init() {
      document.addEventListener('click', (e) => {
        const el = e.target.closest('[data-a]'); if (!el || el.disabled) return;
        MG.audioManager.unlock(); MG.audioManager.click();
        handler(el.dataset.a, el.dataset, el);
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.matches('[data-enter]')) { e.preventDefault(); handler(e.target.dataset.enter, e.target.dataset, e.target); }
        if (e.key === 'Escape' && !$('#dlg').hidden) handler('dno', {}, null);
      });
      UI.sound();
    },
    val: (sel) => { const e = $(sel); return e ? e.value : ''; },
    focus: (sel) => { const e = $(sel); if (e) { e.focus(); e.select && e.select(); } },
    sound() { $('#sndBtn').textContent = MG.audioManager.enabled() ? '🔊' : '🔇'; },

    /* ---- HUD ---- */
    hud(info) {
      const on = !!info;
      $('#chips').hidden = !on; $('#endBtn').hidden = !on; $('#resBtn').hidden = !on;
      if (!on) { $('#results').hidden = true; return; }
      $('#results').hidden = false;
      $('#cRound').textContent = info.round; $('#cTot').textContent = info.total; $('#cSel').textContent = info.selected;
      const left = $('#cLeft'); left.textContent = info.left;
      if (lastLeft !== null && lastLeft !== info.left) { left.classList.remove('bump'); void left.offsetWidth; left.classList.add('bump'); }
      lastLeft = info.left;
    },
    resetBump() { lastLeft = null; },
    results(list) {
      $('#rCount').textContent = '(' + list.length + ')';
      $('#rBody').innerHTML = MG.resultManager.listHTML(list, true);
      const b = $('#rBody'); b.scrollTop = b.scrollHeight;
    },
    toggleResults() { $('#results').classList.toggle('min'); },

    /* ---- banners / dock ---- */
    banner(top, main, cls) { $('#banner').innerHTML = top || main ? `<div class="bn ${cls || ''}"><div class="bt">${esc(top || '')}</div><div class="bm">${esc(main || '')}</div></div>` : ''; },
    dock(html) { $('#dock').innerHTML = html || ''; },
    hint(text, pulse) { UI.dock(`<div class="hint${pulse ? ' pulse' : ''}">${text}</div>`); },
    startRound(first) { UI.dock(`<button class="btn y huge" data-a="startRound" id="startRoundBtn">▶ START ROUND</button>`); },
    next(last) { UI.dock(`<button class="btn y huge" data-a="next">${last ? '🏁 FINISH ROUND' : 'NEXT STUDENT ▶'}</button>`); },
    question(q, name, reveal) {
      UI.dock(`<div class="qp"><div class="qm"><span class="who">▶ ${esc(name)}</span><span>${esc(q.topic)}</span><span>${esc(MG.questionManager.LEVELS[q.level] || '')}</span></div>
<div class="qt">${esc(q.q)}</div>
${reveal ? `<div class="ans">Expected answer: <b>${esc(q.a)}</b>${q.alts && q.alts.length ? '<br>Also valid: ' + esc(q.alts.join(' / ')) : ''}${q.exp ? '<br><i>' + esc(q.exp) + '</i>' : ''}</div>` : ''}
<div class="qrow"><button class="btn s" data-a="rev">${reveal ? 'HIDE' : 'SHOW'} ANSWER</button><button class="btn s" data-a="newq">↻ ANOTHER QUESTION</button></div>
<div class="judge"><h3>IS THE ANSWER CORRECT?</h3><div class="row"><button class="btn g huge" data-a="ok" id="okBtn">✓ CORRECT</button><button class="btn r huge" data-a="no" id="noBtn">✕ INCORRECT</button></div></div></div>`);
    },

    /* ---- pantallas ---- */
    screen(html) { const s = $('#screen'); s.innerHTML = html || ''; s.hidden = !html; },
    studentList(list, editId) {
      if (!list.length) return '<p class="mu" style="margin:10px 0">No students yet. Add at least one to play.</p>';
      return '<div class="lst" id="slist">' + list.map((p, i) => editId === p.id
        ? `<div><span class="n">${i + 1}.</span><input id="se" value="${esc(p.name)}" maxlength="40" data-enter="ssave" data-id="${esc(p.id)}"><button class="btn s g" data-a="ssave" data-id="${esc(p.id)}">SAVE</button><button class="btn s" data-a="scancel">✕</button></div>`
        : `<div><span class="n">${i + 1}.</span><span>${esc(p.name)}</span><button class="btn s" data-a="sedit" data-id="${esc(p.id)}">Edit</button><button class="btn s r" data-a="sdel" data-id="${esc(p.id)}">Delete</button></div>`).join('') + '</div>';
    },
    students(list, o) {
      const qm = MG.questionManager, c = qm.cfg(), n = qm.custom().length;
      UI.screen(`<div class="card"><h2>STUDENTS</h2>
<p class="mu" id="syncLine" style="margin:0">${esc(o.sync)}</p>
<p class="err ${o.ok ? 'ok' : ''}" id="smsg">${esc(o.msg || '')}</p>
<div class="row"><input id="sn" placeholder="Student name" maxlength="40" data-enter="sadd" autocomplete="off"><button class="btn y" data-a="sadd">+ ADD STUDENT</button></div>
<details class="qset" style="margin-top:8px"><summary>Add several at once (one name per line)</summary><textarea id="sl" rows="3" placeholder="Juan&#10;Carlos&#10;María"></textarea><div class="row"><button class="btn s" data-a="slist">ADD LIST</button></div></details>
<div id="slistWrap">${UI.studentList(list, o.editId)}</div>
<details class="qset"><summary>QUESTIONS (shared with English Bomb Race 3D)</summary>
 <div class="row"><button class="btn s ${c.mode === 'auto' ? 'y' : ''}" data-a="qmode" data-v="auto">AUTOMATIC</button><button class="btn s ${c.mode === 'manual' ? 'y' : ''}" data-a="qmode" data-v="manual">MANUAL (${n} custom)</button></div>
 ${c.mode === 'manual' && !n ? '<small>No custom questions yet: the built-in bank will be used.</small><br>' : ''}
 <div class="row"><small>Difficulty (automatic):</small>${['e', 'm', 'h'].map((l) => `<button class="btn s ${c.level === l ? 'y' : ''}" data-a="qlevel" data-v="${l}">${qm.LEVELS[l]}</button>`).join('')}</div>
 <div class="row"><input id="qq" placeholder="Custom question (in English)"><input id="qa" placeholder="Expected answer"><button class="btn s g" data-a="qadd">SAVE</button></div>
 <small id="qmsg">${c.topics.length} topic(s) selected. Edit topics or manage all questions in English Bomb Race 3D → QUESTIONS.</small></details>
<div class="actions"><button class="btn y huge" data-a="start">▶ START GAME</button></div></div>`);
    },
    setStudentList(list, editId) { const w = $('#slistWrap'); if (w) w.innerHTML = UI.studentList(list, editId); },
    setMsg(t, ok) { const e = $('#smsg'); if (e) { e.textContent = t || ''; e.className = 'err' + (ok ? ' ok' : ''); } },
    setSync(t) { const e = $('#syncLine'); if (e) e.textContent = t; },
    setQMsg(t) { const e = $('#qmsg'); if (e) e.textContent = t; },
    complete(s, results, early) {
      UI.screen(`<div class="card c"><h2>${early ? 'ROUND ENDED' : 'ROUND COMPLETE!'}</h2>
<div class="stats"><div class="stat">Students selected<b>${s.selected}</b></div><div class="stat">Students remaining<b>${s.remaining}</b></div><div class="stat ok">✓ Correct<b>${s.correct}</b></div><div class="stat no">✕ Incorrect<b>${s.incorrect}</b></div></div>
<h3>ROUND ${s.round} RESULTS</h3><div class="lst">${results.length ? MG.resultManager.finalHTML(results) : '<p class="mu">Nobody played.</p>'}</div>
<div class="actions"><button class="btn y huge" data-a="again">↻ PLAY AGAIN</button><button class="btn huge" data-a="menuNow">⌂ MAIN MENU</button></div></div>`);
    },
    confirm(text, yesLabel) {
      const d = $('#dlg'); d.hidden = false;
      d.innerHTML = `<div class="card c" style="width:min(460px,100%)"><h2 style="font-size:26px">${esc(text)}</h2><div class="actions"><button class="btn g big" data-a="dyes">${esc(yesLabel || 'CONFIRM')}</button><button class="btn big" data-a="dno">CANCEL</button></div></div>`;
    },
    closeConfirm() { const d = $('#dlg'); d.hidden = true; d.innerHTML = ''; },
    toast(msg, ok) { const t = $('#toast'); t.textContent = msg; t.className = 'on' + (ok ? ' ok' : ''); clearTimeout(toastT); toastT = setTimeout(() => { t.className = ''; }, 2600); },
  });
})();
