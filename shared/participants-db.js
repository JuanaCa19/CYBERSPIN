/* participants-db.js — lista de participantes compartida entre todos los juegos.
 * Usa la API REST de Firebase Realtime Database (sin SDK) + EventSource para tiempo real.
 * Datos en: /english-game-arena/participants/{id} = { name, createdAt }
 * API:  ArenaDB.onChange(fn) · ArenaDB.onStatus(fn) · ArenaDB.add(name) · ArenaDB.addMany(names)
 *       ArenaDB.rename(id, name) · ArenaDB.remove(id) · ArenaDB.list() · ArenaDB.status()
 */
(function () {
  'use strict';

  const DB_URL = 'https://stock-flow-b661f-default-rtdb.firebaseio.com';
  const ROOT = 'english-game-arena/participants';
  const CACHE_KEY = 'arena.participants.cache';
  const MIGRATED_KEY = 'arena.participants.migrated';
  const MAX_NAME = 40;
  const MAX_ITEMS = 200;

  const url = (path) => `${DB_URL}/${ROOT}${path ? '/' + path : ''}.json`;
  const clean = (v) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, MAX_NAME);
  const key = (v) => clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  let items = [];             // [{ id, name, createdAt }] ordenado por createdAt
  let status = 'connecting';  // connecting | online | offline
  let loaded = false;
  const changeCbs = [];
  const statusCbs = [];
  let source = null;
  let retryTimer = null;

  /* ---------- caché local (para ver la lista aunque no haya conexión) ---------- */
  function readCache() {
    try { const v = JSON.parse(localStorage.getItem(CACHE_KEY)); return Array.isArray(v) ? v : []; }
    catch (e) { return []; }
  }
  function writeCache() {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(items)); } catch (e) { /* sin acceso */ }
  }

  /* ---------- notificaciones ---------- */
  function setStatus(next) {
    if (status === next) return;
    status = next;
    statusCbs.forEach((cb) => { try { cb(status); } catch (e) { console.error(e); } });
  }
  function emit() {
    items.sort((a, b) => (a.createdAt - b.createdAt) || a.name.localeCompare(b.name));
    writeCache();
    changeCbs.forEach((cb) => { try { cb(items.slice()); } catch (e) { console.error(e); } });
  }

  /* ---------- normalización de lo que llega de Firebase ---------- */
  function fromRemote(obj) {
    const out = [];
    if (obj && typeof obj === 'object') {
      for (const id of Object.keys(obj)) {
        const r = obj[id];
        if (!r || typeof r !== 'object') continue;
        const name = clean(r.name);
        if (!name) continue;
        out.push({ id, name, createdAt: Number(r.createdAt) || 0 });
      }
    }
    return out;
  }

  /* ---------- HTTP ---------- */
  async function http(method, path, body) {
    const res = await fetch(url(path), {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) {
      const err = new Error(res.status === 401 || res.status === 403 ? 'permission-denied' : 'http-' + res.status);
      err.code = err.message;
      throw err;
    }
    return res.json();
  }

  /* ---------- tiempo real (Server-Sent Events) ---------- */
  function applyStream(type, data) {
    if (!data) return;
    const path = data.path || '/';
    const value = data.data;
    if (type === 'put') {
      if (path === '/') {
        items = fromRemote(value);
      } else {
        const id = path.split('/')[1];
        const rest = path.split('/').slice(2);
        if (!rest.length) {
          items = items.filter((p) => p.id !== id);
          const one = value == null ? [] : fromRemote({ [id]: value });
          items.push(...one);
        } else if (value == null) {
          /* campo suelto borrado: ignorar */
        } else {
          const p = items.find((x) => x.id === id);
          if (p && rest[0] === 'name') p.name = clean(value);
          if (p && rest[0] === 'createdAt') p.createdAt = Number(value) || 0;
        }
      }
    } else if (type === 'patch') {
      for (const sub of Object.keys(value || {})) {
        const id = sub.split('/')[0];
        const r = value[sub];
        items = items.filter((p) => p.id !== id);
        if (r && typeof r === 'object') items.push(...fromRemote({ [id]: r }));
      }
    }
    loaded = true;
    emit();
  }

  function connect() {
    if (source) { source.close(); source = null; }
    clearTimeout(retryTimer);
    if (typeof EventSource === 'undefined') { poll(); return; }
    try {
      source = new EventSource(url(''));
    } catch (e) { setStatus('offline'); retryTimer = setTimeout(connect, 5000); return; }

    source.addEventListener('open', () => setStatus('online'));
    source.addEventListener('put', (ev) => { setStatus('online'); try { applyStream('put', JSON.parse(ev.data)); } catch (e) { console.error(e); } });
    source.addEventListener('patch', (ev) => { try { applyStream('patch', JSON.parse(ev.data)); } catch (e) { console.error(e); } });
    source.addEventListener('cancel', () => { setStatus('offline'); }); // reglas de seguridad rechazaron la lectura
    source.addEventListener('auth_revoked', () => setStatus('offline'));
    source.addEventListener('error', () => {
      setStatus('offline');
      if (source && source.readyState === 2) { // CLOSED: reintentar nosotros
        source.close(); source = null;
        retryTimer = setTimeout(connect, 5000);
      } // si es CONNECTING, el navegador reintenta solo
    });
  }

  /* Plan B si el navegador no soporta EventSource */
  async function refresh() {
    try {
      items = fromRemote(await http('GET', ''));
      loaded = true; setStatus('online'); emit();
    } catch (e) { setStatus('offline'); }
  }
  function poll() { refresh(); retryTimer = setInterval(refresh, 4000); }

  /* ---------- operaciones ---------- */
  function validate(raw, ignoreId) {
    const name = clean(raw);
    if (!name) return { ok: false, error: 'empty' };
    if (items.some((p) => p.id !== ignoreId && key(p.name) === key(name))) return { ok: false, error: 'duplicate', name };
    if (items.length >= MAX_ITEMS && !ignoreId) return { ok: false, error: 'limit' };
    return { ok: true, name };
  }

  async function add(raw) {
    const v = validate(raw);
    if (!v.ok) return v;
    try {
      const r = await http('POST', '', { name: v.name, createdAt: Date.now() }); // → { name: "-Nxyz" }
      if (!items.some((p) => p.id === r.name)) { items.push({ id: r.name, name: v.name, createdAt: Date.now() }); emit(); }
      setStatus('online');
      return { ok: true, id: r.name, name: v.name };
    } catch (e) { setStatus('offline'); return { ok: false, error: e.code || 'network' }; }
  }

  async function addMany(names) {
    const summary = { added: 0, duplicates: 0, invalid: 0, overLimit: 0, failed: 0, error: null };
    const seen = new Set(items.map((p) => key(p.name)));
    const batch = {};
    const stamp = Date.now();
    let count = items.length;
    (names || []).forEach((raw, i) => {
      const name = clean(raw);
      if (!name) { if (String(raw || '').trim()) summary.invalid++; return; }
      if (seen.has(key(name))) { summary.duplicates++; return; }
      if (count >= MAX_ITEMS) { summary.overLimit++; return; }
      seen.add(key(name)); count++;
      // id ordenable generado en el cliente (evita una petición por nombre)
      const id = '-' + stamp.toString(36) + i.toString(36).padStart(3, '0') + Math.random().toString(36).slice(2, 6);
      batch[id] = { name, createdAt: stamp + i };
    });
    const ids = Object.keys(batch);
    if (!ids.length) return summary;
    try {
      await http('PATCH', '', batch);
      ids.forEach((id) => {
        if (!items.some((p) => p.id === id)) items.push({ id, name: batch[id].name, createdAt: batch[id].createdAt });
      });
      emit(); setStatus('online');
      summary.added = ids.length;
    } catch (e) { setStatus('offline'); summary.failed = ids.length; summary.error = e.code || 'network'; }
    return summary;
  }

  async function rename(id, raw) {
    const v = validate(raw, id);
    if (!v.ok) return v;
    try {
      await http('PATCH', encodeURIComponent(id), { name: v.name });
      const p = items.find((x) => x.id === id);
      if (p) { p.name = v.name; emit(); }
      setStatus('online');
      return { ok: true, name: v.name };
    } catch (e) { setStatus('offline'); return { ok: false, error: e.code || 'network' }; }
  }

  async function remove(id) {
    try {
      await http('DELETE', encodeURIComponent(id));
      items = items.filter((p) => p.id !== id); emit(); setStatus('online');
      return { ok: true };
    } catch (e) { setStatus('offline'); return { ok: false, error: e.code || 'network' }; }
  }

  /* Sube una sola vez los nombres que ya existían en este navegador (si la nube está vacía). */
  async function migrateOnce(localNames) {
    try { if (localStorage.getItem(MIGRATED_KEY)) return 0; } catch (e) { return 0; }
    if (!loaded) await new Promise((res) => { const t = setTimeout(res, 6000); onChange(function f() { if (loaded) { clearTimeout(t); res(); } }); });
    if (!loaded) return 0;                       // sin conexión: se intentará en otra visita
    let n = 0;
    if (!items.length && localNames && localNames.length) n = (await addMany(localNames)).added;
    try { localStorage.setItem(MIGRATED_KEY, '1'); } catch (e) { /* ignorar */ }
    return n;
  }

  /* ---------- suscripciones ---------- */
  function onChange(cb) { changeCbs.push(cb); if (loaded || items.length) cb(items.slice()); }
  function onStatus(cb) { statusCbs.push(cb); cb(status); }

  /* ---------- indicador visual reutilizable ---------- */
  function mountBadge(parent) {
    const el = document.createElement('div');
    el.className = 'arena-sync';
    el.setAttribute('role', 'status');
    el.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:9999;padding:5px 11px;border-radius:999px;font:600 12px system-ui,sans-serif;background:rgba(10,14,30,.85);color:#fff;border:1px solid rgba(255,255,255,.25);pointer-events:none';
    (parent || document.body).appendChild(el);
    onStatus((s) => {
      el.textContent = s === 'online' ? '● Sincronizado' : s === 'offline' ? '○ Sin conexión (mostrando copia local)' : '◌ Conectando…';
      el.style.color = s === 'online' ? '#4ade80' : s === 'offline' ? '#fbbf24' : '#cbd5e1';
    });
    return el;
  }

  /* arranque: mostrar al instante la copia local y luego conectar */
  items = fromRemote(Object.fromEntries(readCache().map((p) => [p.id, p])));
  connect();

  window.ArenaDB = {
    DB_URL, MAX_NAME, MAX_ITEMS,
    list: () => items.slice(), status: () => status, isLoaded: () => loaded,
    onChange, onStatus, add, addMany, rename, remove, migrateOnce, mountBadge, reconnect: connect,
  };
})();
