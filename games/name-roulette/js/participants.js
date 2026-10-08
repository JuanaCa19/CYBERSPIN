/* participants.js — lógica pura: participantes, rondas, selección y estadísticas. */
(function (RN) {
  'use strict';

  const { cleanName, nameKey, uid, weightedPick, MAX_NAME_LENGTH, MAX_PARTICIPANTS } = RN.utils;

  /** Valida un nombre. `ignoreId` permite conservar el nombre al editar. */
  function validateName(state, raw, ignoreId = null) {
    const name = cleanName(raw);
    if (!name) return { ok: false, error: 'El nombre no puede estar vacío.' };
    if (name.length > MAX_NAME_LENGTH) {
      return { ok: false, error: `El nombre no puede superar ${MAX_NAME_LENGTH} caracteres.` };
    }
    const key = nameKey(name);
    if (state.participants.some((p) => p.id !== ignoreId && nameKey(p.name) === key)) {
      return { ok: false, error: `"${name}" ya está en la lista.`, duplicate: true };
    }
    return { ok: true, name };
  }

  function add(state, raw) {
    if (state.participants.length >= MAX_PARTICIPANTS) {
      return { ok: false, error: `Máximo ${MAX_PARTICIPANTS} participantes.` };
    }
    const result = validateName(state, raw);
    if (!result.ok) return result;
    state.participants.push({ id: uid(), name: result.name, picks: 0, doneRound: null });
    return { ok: true, name: result.name };
  }

  /** Cada línea es un participante. Devuelve un resumen de lo ocurrido. */
  function addMany(state, text) {
    const summary = { added: 0, duplicates: 0, invalid: 0, overLimit: 0 };
    const lines = String(text ?? '').split(/\r?\n/).filter((line) => line.trim() !== '');
    for (const line of lines) {
      const result = add(state, line);
      if (result.ok) summary.added++;
      else if (result.duplicate) summary.duplicates++;
      else if (state.participants.length >= MAX_PARTICIPANTS) summary.overLimit++;
      else summary.invalid++;
    }
    return summary;
  }

  function rename(state, id, raw) {
    const participant = state.participants.find((p) => p.id === id);
    if (!participant) return { ok: false, error: 'No se encontró al participante.' };
    const result = validateName(state, raw, id);
    if (!result.ok) return result;
    participant.name = result.name;
    return { ok: true, name: result.name };
  }

  function remove(state, id) {
    const index = state.participants.findIndex((p) => p.id === id);
    if (index === -1) return false;
    state.participants.splice(index, 1);
    return true;
  }

  /* ---------- Rondas ---------- */

  const hasPlayedThisRound = (state, p) => p.doneRound === state.round;
  const getPool = (state) => state.participants.filter((p) => !hasPlayedThisRound(state, p));
  const isRoundComplete = (state) => state.participants.length > 0 && getPool(state).length === 0;

  function newRound(state) {
    state.round += 1;
  }

  /* ---------- Selección ---------- */

  /**
   * Peso de un participante dentro del grupo disponible.
   * Modo aleatorio: todos 1.
   * Modo justo: 1 / (1 + ventaja)^2, donde "ventaja" = veces elegido menos las del
   * que menos veces ha salido. Quien nunca salió pesa 1; con 1 vez más pesa 0.25;
   * con 2 más, 0.11... Nunca llega a 0, así que el azar sigue vivo.
   */
  function buildWeightFn(state, pool) {
    if (state.mode !== 'fair') return () => 1;
    const minPicks = Math.min(...pool.map((p) => p.picks));
    return (p) => 1 / Math.pow(1 + (p.picks - minPicks), 2);
  }

  /** Elige un ganador entre quienes no han participado en la ronda. */
  function pickWinner(state) {
    const pool = getPool(state);
    if (!pool.length) return null;
    return weightedPick(pool, buildWeightFn(state, pool));
  }

  /** Registra el resultado: participante, historial y contadores. */
  function recordPick(state, participant) {
    participant.picks += 1;
    participant.doneRound = state.round;
    state.spins += 1;
    state.totalSelected += 1;
    const nextNumber = state.history.length ? state.history[0].n + 1 : 1;
    state.history.unshift({
      n: nextNumber,
      name: participant.name,
      round: state.round,
      time: new Date().toISOString(),
    });
  }

  /* ---------- Estadísticas ---------- */

  function summarizeNames(names, totalParticipants) {
    if (!names.length) return '—';
    if (totalParticipants > 1 && names.length === totalParticipants) return 'Empate general';
    return names.length > 1 ? `${names[0]} +${names.length - 1}` : names[0];
  }

  function getStats(state) {
    const { participants } = state;
    const picks = participants.map((p) => p.picks);
    const max = picks.length ? Math.max(...picks) : 0;
    const min = picks.length ? Math.min(...picks) : 0;
    const namesWith = (value) => participants.filter((p) => p.picks === value).map((p) => p.name);
    const anyPicked = max > 0;
    return {
      participants: participants.length,
      round: state.round,
      playedThisRound: participants.length - getPool(state).length,
      totalSelected: state.totalSelected,
      spins: state.spins,
      most: anyPicked ? summarizeNames(namesWith(max), participants.length) : '—',
      least: anyPicked ? summarizeNames(namesWith(min), participants.length) : '—',
    };
  }

  RN.participants = {
    validateName, add, addMany, rename, remove,
    getPool, isRoundComplete, hasPlayedThisRound, newRound,
    pickWinner, recordPick, getStats,
  };
})(window.RN);
