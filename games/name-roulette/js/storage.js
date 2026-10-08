/* storage.js — persistencia en localStorage con validación estricta. */
(function (RN) {
  'use strict';

  const { cleanName, nameKey, uid, toInt, MAX_NAME_LENGTH, MAX_PARTICIPANTS } = RN.utils;
  const STORAGE_KEY = 'ruleta-inteligente:v1';
  const MODES = ['random', 'fair'];

  function defaultState() {
    return {
      participants: [], // { id, name, picks, doneRound }
      history: [],      // { n, name, round, time }  (más reciente primero)
      round: 1,
      spins: 0,
      totalSelected: 0,
      mode: 'fair',
      pickCount: 1,
    };
  }

  /** Reconstruye un estado seguro a partir de datos desconocidos. Lanza error si no es un objeto. */
  function sanitize(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Formato inválido');

    const state = defaultState();
    state.round = toInt(raw.round, 1, 1);
    state.spins = toInt(raw.spins, 0);
    state.totalSelected = toInt(raw.totalSelected, 0);
    state.mode = MODES.includes(raw.mode) ? raw.mode : 'fair';
    state.pickCount = toInt(raw.pickCount, 1, 1, 5);

    const ids = new Set();
    const names = new Set();
    const list = Array.isArray(raw.participants) ? raw.participants.slice(0, MAX_PARTICIPANTS) : [];
    for (const item of list) {
      if (!item || typeof item !== 'object') continue;
      const name = cleanName(item.name).slice(0, MAX_NAME_LENGTH);
      const key = nameKey(name);
      if (!name || names.has(key)) continue;
      const id = typeof item.id === 'string' && item.id && !ids.has(item.id) ? item.id : uid();
      ids.add(id);
      names.add(key);
      state.participants.push({
        id,
        name,
        picks: toInt(item.picks, 0),
        doneRound: toInt(item.doneRound, null, 1),
      });
    }

    const entries = Array.isArray(raw.history) ? raw.history.slice(0, 2000) : [];
    entries.forEach((entry, index) => {
      if (!entry || typeof entry !== 'object') return;
      const name = cleanName(entry.name).slice(0, MAX_NAME_LENGTH);
      if (!name) return;
      const time = Number.isNaN(new Date(entry.time).getTime()) ? new Date().toISOString() : entry.time;
      state.history.push({
        n: toInt(entry.n, entries.length - index, 1),
        name,
        round: toInt(entry.round, 1, 1),
        time,
      });
    });

    return state;
  }

  /** Devuelve { state, recovered, available }. Nunca lanza. */
  function load() {
    let text = null;
    try {
      text = localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      return { state: defaultState(), recovered: false, available: false };
    }
    if (text === null) return { state: defaultState(), recovered: false, available: true };

    try {
      return { state: sanitize(JSON.parse(text)), recovered: false, available: true };
    } catch (error) {
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* sin acceso */ }
      return { state: defaultState(), recovered: true, available: true };
    }
  }

  /** Devuelve true si se guardó correctamente. */
  function save(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (error) {
      return false;
    }
  }

  function clear() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (error) { /* sin acceso */ }
  }

  RN.storage = { STORAGE_KEY, defaultState, sanitize, load, save, clear };
})(window.RN);
