/* app.js — controlador: estado, render, eventos, diálogos y flujo de giro. */
(function (RN) {
  'use strict';

  const { h, wait, formatDateTime, cleanName, nameKey } = RN.utils;
  const P = RN.participants;
  const S = RN.storage;

  const MODE_INFO = {
    fair: {
      badge: '⚖️ Modo justo activo',
      hint: 'Quien ha salido menos veces tiene más probabilidad. El azar sigue presente: nadie queda excluido.',
    },
    random: {
      badge: '🎲 Modo aleatorio activo',
      hint: 'Todos los participantes disponibles tienen exactamente la misma probabilidad.',
    },
  };

  const ui = { busy: false, saveWarned: false };
  let pendingList = null; // cambios remotos recibidos mientras la ruleta gira
  let legacy = [];        // participantes locales previos (para conservar sus conteos al migrar)
  const els = {};
  let state;
  let wheel;

  const $ = (id) => document.getElementById(id);
  const colorFor = (index) => `hsl(${Math.round((index * 137.508 + 210) % 360)}, 68%, 42%)`;


  /* ---------------- Participantes compartidos (Firebase) ---------------- */

  function dbMessage(result) {
    switch (result && result.error) {
      case 'duplicate': return `"${result.name || 'Ese nombre'}" ya está en la lista.`;
      case 'empty': return 'El nombre no puede estar vacío.';
      case 'limit': return `Máximo ${ArenaDB.MAX_ITEMS} participantes.`;
      case 'permission-denied': return 'Firebase rechazó la operación: revisa las reglas de la base de datos.';
      default: return 'No hay conexión con la base de datos. Inténtalo de nuevo.';
    }
  }

  /** La lista de nombres viene de la nube; los conteos (veces elegido, ronda) se conservan localmente. */
  function applyRemoteList(list) {
    if (ui.busy) { pendingList = list; return; }
    const byId = new Map(state.participants.map((p) => [p.id, p]));
    const byName = new Map([...legacy, ...state.participants].map((p) => [nameKey(p.name), p]));
    state.participants = list.map((r) => {
      const old = byId.get(r.id) || byName.get(nameKey(r.name));
      return { id: r.id, name: r.name, picks: old ? old.picks : 0, doneRound: old ? old.doneRound : null };
    });
    commit();
  }

  /* ---------------- Avisos (toasts) ---------------- */

  function toast(message, type = 'info') {
    while (els.toasts.children.length >= 4) els.toasts.firstChild.remove();
    const node = h('div', { class: `toast ${type}`, text: message });
    els.toasts.append(node);
    setTimeout(() => node.remove(), type === 'error' ? 5000 : 3400);
  }

  /* ---------------- Persistencia ---------------- */

  function commit() {
    if (!S.save(state) && !ui.saveWarned) {
      ui.saveWarned = true;
      toast('No se pudo guardar en este navegador. Los cambios se perderán al cerrar.', 'warn');
    }
    render();
  }

  /* ---------------- Render ---------------- */

  function render() {
    renderWheel();
    renderControls();
    renderRound();
    renderParticipants();
    renderStats();
    renderHistory();
  }

  function renderWheel() {
    wheel.setItems(state.participants.map((p, i) => ({
      label: p.name,
      color: colorFor(i),
      dimmed: P.hasPlayedThisRound(state, p),
    })));
  }

  function renderControls() {
    const pool = P.getPool(state);
    const info = MODE_INFO[state.mode];

    els.modeBadge.textContent = info.badge;
    els.modeBadge.className = `mode-badge ${state.mode}`;
    els.modeHint.textContent = info.hint;
    document.querySelectorAll('input[name="mode"]').forEach((radio) => {
      radio.checked = radio.value === state.mode;
    });
    els.pickCount.value = String(state.pickCount);

    let hint = '';
    if (!state.participants.length) hint = 'Agrega al menos un participante para poder girar.';
    else if (!pool.length) hint = 'Todos participaron. Inicia una nueva ronda para continuar.';
    else if (state.pickCount > pool.length) {
      els.countHint.textContent = `Solo ${pool.length === 1 ? 'queda 1 persona disponible' : `quedan ${pool.length} personas disponibles`} en esta ronda.`;
    }
    if (!(state.pickCount > pool.length && pool.length)) els.countHint.textContent = '';
    els.spinHint.textContent = ui.busy ? '' : hint;

    els.spinBtn.disabled = ui.busy;
    els.spinBtn.textContent = ui.busy ? '⏳ GIRANDO…' : '🎡 GIRAR';
    document.querySelectorAll('[data-lock]').forEach((el) => { el.disabled = ui.busy; });
  }

  function renderRound() {
    const stats = P.getStats(state);
    const total = stats.participants;
    const complete = P.isRoundComplete(state);
    els.roundNumber.textContent = state.round;
    els.roundProgressText.textContent = total
      ? `${stats.playedThisRound} de ${total} ya participaron`
      : 'Sin participantes todavía';
    els.roundBar.style.width = total ? `${(stats.playedThisRound / total) * 100}%` : '0%';
    els.roundBanner.hidden = !complete;
    els.newRoundBtn.classList.toggle('pulse', complete && !ui.busy);
  }

  function renderParticipants() {
    els.participantCount.textContent = state.participants.length;
    if (!state.participants.length) {
      els.participantList.replaceChildren(
        h('li', { class: 'empty', text: 'Aún no hay participantes. Escribe un nombre arriba o pega una lista.' }),
      );
      return;
    }
    const rows = state.participants.map((p, i) => {
      const done = P.hasPlayedThisRound(state, p);
      return h('li', { class: `participant${done ? ' done' : ''}` },
        h('span', { class: 'swatch', style: `background:${colorFor(i)};color:${colorFor(i)}` }),
        h('span', { class: 'participant-name', text: p.name, title: p.name }),
        done ? h('span', { class: 'badge ok', text: '✓ ronda' }) : null,
        h('span', { class: 'badge', text: `${p.picks}×`, title: 'Veces seleccionado' }),
        h('button', {
          type: 'button', class: 'icon-btn', disabled: ui.busy, dataset: { action: 'edit', id: p.id },
          'aria-label': `Editar a ${p.name}`, title: 'Editar', text: '✎',
        }),
        h('button', {
          type: 'button', class: 'icon-btn danger', disabled: ui.busy, dataset: { action: 'delete', id: p.id },
          'aria-label': `Eliminar a ${p.name}`, title: 'Eliminar', text: '🗑',
        }),
      );
    });
    els.participantList.replaceChildren(...rows);
  }

  function renderStats() {
    const stats = P.getStats(state);
    els.statParticipants.textContent = stats.participants;
    els.statRound.textContent = stats.round;
    els.statSelected.textContent = stats.totalSelected;
    els.statSpins.textContent = stats.spins;
    els.statMost.textContent = stats.most;
    els.statMost.title = stats.most;
    els.statLeast.textContent = stats.least;
    els.statLeast.title = stats.least;
  }

  function renderHistory() {
    if (!state.history.length) {
      els.historyList.replaceChildren(h('li', { class: 'empty', text: 'El historial aparecerá aquí después del primer giro.' }));
      return;
    }
    els.historyList.replaceChildren(...state.history.map((entry) => h('li', { class: 'history-item' },
      h('span', { class: 'history-num', text: `#${entry.n}` }),
      h('span', { class: 'history-name', text: entry.name, title: entry.name }),
      h('span', { class: 'history-meta', text: `Ronda ${entry.round} · ${formatDateTime(entry.time)}` }),
    )));
  }

  /* ---------------- Diálogos ---------------- */

  function confirmDialog({ title, message, okText = 'Confirmar' }) {
    const dialog = els.confirmDialog;
    els.confirmTitle.textContent = title;
    els.confirmMessage.textContent = message;
    els.confirmOk.textContent = okText;
    dialog.returnValue = '';
    dialog.showModal();
    return new Promise((resolve) => {
      dialog.addEventListener('close', () => resolve(dialog.returnValue === 'ok'), { once: true });
    });
  }

  /** Devuelve el nombre nuevo (ya validado) o null si se cancela. */
  function editDialog(participant) {
    const { editDialog: dialog, editInput: input, editError: error, editForm: form } = els;
    input.value = participant.name;
    input.removeAttribute('aria-invalid');
    error.textContent = '';
    dialog.returnValue = '';
    dialog.showModal();
    input.select();
    return new Promise((resolve) => {
      const controller = new AbortController();
      form.addEventListener('submit', (event) => {
        const check = P.validateName(state, input.value, participant.id);
        if (check.ok) return; // el formulario method="dialog" cierra con returnValue "ok"
        event.preventDefault();
        error.textContent = check.error;
        input.setAttribute('aria-invalid', 'true');
        input.focus();
      }, { signal: controller.signal });
      dialog.addEventListener('close', () => {
        controller.abort();
        resolve(dialog.returnValue === 'ok' ? cleanName(input.value) : null);
      }, { once: true });
    });
  }

  function showResult(winners) {
    const dialog = els.resultDialog;
    els.winnerList.className = `winner-list${winners.length > 1 ? ' multi' : ''}`;
    els.winnerList.replaceChildren(...winners.map((name, i) => {
      const item = h('li', { text: name });
      item.style.animationDelay = `${i * 120}ms`;
      return item;
    }));
    dialog.returnValue = '';
    dialog.showModal();
    const stopConfetti = launchConfetti(els.confetti);
    els.resultContinue.focus();
    return new Promise((resolve) => {
      dialog.addEventListener('close', () => { stopConfetti(); resolve(); }, { once: true });
    });
  }

  /** Confeti sutil dentro del diálogo. Devuelve una función para detenerlo. */
  function launchConfetti(canvas) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const colors = ['#6c7bff', '#22d3ee', '#f472b6', '#fbbf24', '#34d399'];
    const pieces = Array.from({ length: 70 }, () => ({
      x: rect.width / 2, y: rect.height * 0.4,
      vx: (Math.random() - 0.5) * 10, vy: -Math.random() * 9 - 2,
      size: 4 + Math.random() * 4, color: colors[Math.floor(Math.random() * colors.length)], life: 1,
    }));
    let frameId = 0;
    let last = performance.now();
    const step = (now) => {
      const dt = Math.min(32, now - last) / 16.67;
      last = now;
      ctx.clearRect(0, 0, rect.width, rect.height);
      let alive = false;
      for (const p of pieces) {
        p.vy += 0.25 * dt; p.vx *= 0.99;
        p.x += p.vx * dt; p.y += p.vy * dt; p.life -= 0.007 * dt;
        if (p.life <= 0 || p.y > rect.height) continue;
        alive = true;
        ctx.globalAlpha = Math.max(p.life, 0);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size * 0.6);
      }
      ctx.globalAlpha = 1;
      if (alive) frameId = requestAnimationFrame(step);
    };
    frameId = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(frameId); ctx.clearRect(0, 0, rect.width, rect.height); };
  }

  /* ---------------- Acciones ---------------- */

  function setBusy(value) {
    ui.busy = value;
    document.body.classList.toggle('is-busy', value);
    render();
  }

  function setLiveResult(text) {
    els.liveResult.textContent = text;
    els.liveResult.classList.remove('pop');
    void els.liveResult.offsetWidth; // reinicia la animación
    if (text) els.liveResult.classList.add('pop');
  }

  async function handleSpin() {
    if (ui.busy) return;
    const pool = P.getPool(state);
    const count = state.pickCount;

    if (!state.participants.length) return toast('Agrega al menos un participante para girar.', 'error');
    if (!pool.length) return toast('¡Todos participaron! Inicia una nueva ronda para seguir.', 'warn');
    if (count > pool.length) {
      return toast(`Solo hay ${pool.length} ${pool.length === 1 ? 'persona disponible' : 'personas disponibles'} en esta ronda. Reduce la cantidad o inicia una nueva ronda.`, 'error');
    }

    setBusy(true);
    setLiveResult('');
    const winners = [];
    try {
      for (let i = 0; i < count; i++) {
        const chosen = P.pickWinner(state);
        const targetIndex = state.participants.indexOf(chosen);
        const visualIndex = await wheel.spin(targetIndex, { duration: i === 0 ? 5200 : 3200 });
        if (visualIndex !== targetIndex) console.error('El resultado visual no coincidió con el lógico.');
        // Se registra lo que el indicador realmente señala: lo que se ve es lo que cuenta.
        const winner = state.participants[visualIndex] || chosen;
        P.recordPick(state, winner);
        winners.push(winner.name);
        setLiveResult(count > 1 ? `Selección ${i + 1} de ${count}: ${winner.name}` : `Seleccionado: ${winner.name}`);
        commit();
        if (i < count - 1) await wait(1000);
      }
      await wait(350);
      await showResult(winners);
    } catch (error) {
      console.error(error);
      toast('Ocurrió un error durante el giro. Puedes intentarlo de nuevo.', 'error');
    } finally {
      setBusy(false);
      if (pendingList) { const queued = pendingList; pendingList = null; applyRemoteList(queued); }
      if (P.isRoundComplete(state)) toast('🎉 ¡Todos participaron! Puedes iniciar una nueva ronda.', 'success');
    }
  }

  async function handleAdd(event) {
    event.preventDefault();
    if (ui.busy) return;
    const check = P.validateName(state, els.nameInput.value);
    if (!check.ok) {
      els.addError.textContent = check.error;
      els.nameInput.setAttribute('aria-invalid', 'true');
      els.nameInput.focus();
      return;
    }
    const result = await ArenaDB.add(check.name);
    if (!result.ok) {
      els.addError.textContent = dbMessage(result);
      els.nameInput.setAttribute('aria-invalid', 'true');
      els.nameInput.focus();
      return;
    }
    els.nameInput.value = '';
    clearAddError();
    toast(`"${result.name}" se agregó a la ruleta.`, 'success');
    els.nameInput.focus();
  }

  function clearAddError() {
    els.addError.textContent = '';
    els.nameInput.removeAttribute('aria-invalid');
  }

  async function handleBulkAdd(event) {
    event.preventDefault();
    if (ui.busy) return;
    if (!els.bulkInput.value.trim()) return toast('Pega al menos un nombre (uno por línea).', 'error');
    const lines = els.bulkInput.value.split(/\r?\n/).filter((line) => line.trim() !== '');
    const r = await ArenaDB.addMany(lines);
    if (r.failed) return toast(dbMessage({ error: r.error }), 'error');
    const notes = [];
    if (r.duplicates) notes.push(`${r.duplicates} repetido${r.duplicates > 1 ? 's' : ''}`);
    if (r.invalid) notes.push(`${r.invalid} no válido${r.invalid > 1 ? 's' : ''}`);
    if (r.overLimit) notes.push(`${r.overLimit} fuera del límite`);
    const extra = notes.length ? ` (omitidos: ${notes.join(', ')})` : '';
    if (!r.added) return toast(`No se agregó ningún nombre${extra}.`, 'error');
    els.bulkInput.value = '';
    toast(`Se agregaron ${r.added} participante${r.added > 1 ? 's' : ''}${extra}.`, notes.length ? 'warn' : 'success');
  }

  async function handleListClick(event) {
    const button = event.target.closest('button[data-action]');
    if (!button || ui.busy) return;
    const participant = state.participants.find((p) => p.id === button.dataset.id);
    if (!participant) return;

    if (button.dataset.action === 'edit') {
      const newName = await editDialog(participant);
      if (newName === null || newName === participant.name) return;
      const result = await ArenaDB.rename(participant.id, newName);
      if (!result.ok) return toast(dbMessage(result), 'error');
      toast('Nombre actualizado.', 'success');
    } else if (button.dataset.action === 'delete') {
      const isLast = state.participants.length === 1;
      const confirmed = await confirmDialog({
        title: `¿Eliminar a ${participant.name}?`,
        message: isLast
          ? 'Es el último participante: la lista quedará vacía. Se elimina también de los demás juegos. Su historial se conserva.'
          : 'Dejará de aparecer en la ruleta y en los demás juegos. Su historial se conserva.',
        okText: 'Eliminar',
      });
      if (!confirmed || ui.busy) return;
      const result = await ArenaDB.remove(participant.id);
      if (!result.ok) return toast(dbMessage(result), 'error');
      toast(`"${participant.name}" fue eliminado.`, 'success');
    }
  }

  async function handleNewRound() {
    if (ui.busy) return;
    if (!state.participants.length) return toast('Agrega participantes antes de iniciar una ronda.', 'error');
    if (!P.isRoundComplete(state)) {
      const confirmed = await confirmDialog({
        title: '¿Iniciar nueva ronda?',
        message: 'Todavía hay participantes que no han salido en esta ronda. Se reiniciará la participación sin borrar los nombres.',
        okText: 'Nueva ronda',
      });
      if (!confirmed || ui.busy) return;
    }
    P.newRound(state);
    setLiveResult('');
    commit();
    toast(`Comenzó la ronda ${state.round}.`, 'success');
  }

  async function handleClearHistory() {
    if (ui.busy) return;
    if (!state.history.length) return toast('El historial ya está vacío.', 'warn');
    const confirmed = await confirmDialog({
      title: '¿Limpiar el historial?',
      message: 'Se borrará la lista de resultados. Los conteos del modo justo y las estadísticas se conservan.',
      okText: 'Limpiar historial',
    });
    if (!confirmed || ui.busy) return;
    state.history = [];
    commit();
    toast('Historial borrado.', 'success');
  }

  async function handleResetAll() {
    if (ui.busy) return;
    const confirmed = await confirmDialog({
      title: '¿Restablecer todo?',
      message: 'Se borrarán historial, rondas, conteos, estadísticas y configuración. La lista de participantes guardada en la nube se conserva. Esta acción no se puede deshacer.',
      okText: 'Restablecer todo',
    });
    if (!confirmed || ui.busy) return;
    S.clear();
    state = S.defaultState();
    legacy = [];
    state.participants = ArenaDB.list().map((r) => ({ id: r.id, name: r.name, picks: 0, doneRound: null }));
    wheel.resetRotation();
    setLiveResult('');
    commit();
    toast('La aplicación se restableció por completo.', 'success');
  }

  function handleModeChange(event) {
    if (ui.busy || !event.target.matches('input[name="mode"]')) return;
    state.mode = event.target.value === 'random' ? 'random' : 'fair';
    commit();
    toast(MODE_INFO[state.mode].badge.replace(' activo', ''), 'info');
  }

  function handleCountChange() {
    if (ui.busy) return;
    state.pickCount = Math.min(5, Math.max(1, parseInt(els.pickCount.value, 10) || 1));
    commit();
  }

  /* ---------------- Inicio (los listeners se registran una sola vez) ---------------- */

  function cacheElements() {
    [
      'toasts', 'modeBadge', 'modeHint', 'pickCount', 'countHint', 'spinBtn', 'spinHint', 'liveResult',
      'roundNumber', 'roundProgressText', 'roundBar', 'roundBanner', 'newRoundBtn',
      'participantCount', 'participantList', 'addForm', 'nameInput', 'addError', 'bulkForm', 'bulkInput',
      'statParticipants', 'statRound', 'statSelected', 'statSpins', 'statMost', 'statLeast',
      'historyList', 'clearHistoryBtn', 'resetAllBtn',
      'confirmDialog', 'confirmTitle', 'confirmMessage', 'confirmOk', 'confirmCancel',
      'editDialog', 'editForm', 'editInput', 'editError', 'editCancel',
      'resultDialog', 'winnerList', 'resultContinue', 'confetti',
    ].forEach((id) => { els[id] = $(id); });
  }

  function bindEvents() {
    els.spinBtn.addEventListener('click', handleSpin);
    els.addForm.addEventListener('submit', handleAdd);
    els.nameInput.addEventListener('input', clearAddError);
    els.bulkForm.addEventListener('submit', handleBulkAdd);
    els.participantList.addEventListener('click', handleListClick);
    els.newRoundBtn.addEventListener('click', handleNewRound);
    els.clearHistoryBtn.addEventListener('click', handleClearHistory);
    els.resetAllBtn.addEventListener('click', handleResetAll);
    els.pickCount.addEventListener('change', handleCountChange);
    document.querySelector('.mode-select').addEventListener('change', handleModeChange);
    els.confirmCancel.addEventListener('click', () => els.confirmDialog.close('cancel'));
    els.editCancel.addEventListener('click', () => els.editDialog.close('cancel'));
    // Cerrar al hacer clic fuera del cuadro
    [els.confirmDialog, els.editDialog, els.resultDialog].forEach((dialog) => {
      dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close('cancel'); });
    });
  }

  function init() {
    cacheElements();
    const loaded = S.load();
    state = loaded.state;
    wheel = new RN.Roulette($('wheel'));
    bindEvents();
    render();
    legacy = state.participants.slice();
    ArenaDB.mountBadge();
    let wasOffline = false;
    ArenaDB.onStatus((st) => {
      if (st === 'offline' && !wasOffline) toast('Sin conexión a la base de datos. Se muestra la última copia guardada.', 'warn');
      wasOffline = st === 'offline';
    });
    ArenaDB.onChange(applyRemoteList);
    ArenaDB.migrateOnce(legacy.map((p) => p.name)).then((n) => {
      if (n) toast(`${n} participante${n > 1 ? 's' : ''} de este navegador se subieron a la nube.`, 'success');
    });
    if (loaded.recovered) toast('Los datos guardados estaban dañados y se restablecieron.', 'warn');
    if (!loaded.available) toast('El almacenamiento local no está disponible: no se guardarán los cambios.', 'warn');
  }

  document.addEventListener('DOMContentLoaded', init);
})(window.RN);
