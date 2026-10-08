/* utils.js — funciones pequeñas y reutilizables (sin dependencias). */
(function (RN) {
  'use strict';

  const MAX_NAME_LENGTH = 40;
  const MAX_PARTICIPANTS = 200;

  /** Quita espacios sobrantes (inicio, fin y repetidos en medio). */
  const cleanName = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();

  /** Clave de comparación: sin tildes ni mayúsculas ("María" == "maria"). */
  const nameKey = (value) =>
    cleanName(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  /** Número entero válido dentro de un rango, o el valor de reserva. */
  function toInt(value, fallback, min = 0, max = 1e9) {
    if (value === null || value === undefined || value === '') return fallback;
    const n = Math.floor(Number(value));
    return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
  }

  /** Aleatorio en [0, 1) con crypto cuando está disponible. */
  function random() {
    if (window.crypto && crypto.getRandomValues) {
      return crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
    }
    return Math.random();
  }

  /** Elige un elemento según pesos positivos. */
  function weightedPick(items, weightOf) {
    const weights = items.map(weightOf);
    const total = weights.reduce((sum, w) => sum + w, 0);
    let target = random() * total;
    for (let i = 0; i < items.length; i++) {
      target -= weights[i];
      if (target < 0) return items[i];
    }
    return items[items.length - 1];
  }

  function formatDateTime(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('es', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  }

  /** Crea elementos del DOM de forma segura (usa textContent, nunca innerHTML). */
  function h(tag, props = {}, ...children) {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
      if (value === null || value === undefined || value === false) continue;
      if (key === 'class') el.className = value;
      else if (key === 'text') el.textContent = value;
      else if (key === 'dataset') Object.assign(el.dataset, value);
      else if (key in el) el[key] = value;
      else el.setAttribute(key, value === true ? '' : value);
    }
    children.flat().forEach((child) => child != null && el.append(child));
    return el;
  }

  RN.utils = {
    MAX_NAME_LENGTH, MAX_PARTICIPANTS,
    cleanName, nameKey, uid, clamp, wait, toInt, random, weightedPick, formatDateTime, h,
  };
})((window.RN = window.RN || {}));
