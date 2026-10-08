/* studentManager.js — lista ALL STUDENTS registrada. Reutiliza ArenaDB (la misma lista que Bomb Race y la Ruleta:
 * Firebase + copia en localStorage), así que los estudiantes persisten al cerrar la página.
 * Aquí NO existe ningún estado de ronda: eso vive en roundManager. */
(function () {
  'use strict';
  const MG = (window.MysteryBoxesGame = window.MysteryBoxesGame || {});

  const errText = (r) => {
    switch (r && r.error) {
      case 'empty': return 'The name cannot be empty.';
      case 'duplicate': return 'That student is already in the list.';
      case 'limit': return 'Student limit reached (' + ArenaDB.MAX_ITEMS + ').';
      case 'permission-denied': return 'Firebase rules block this action. Check the database rules.';
      default: return 'No connection to the database. Try again.';
    }
  };

  MG.studentManager = {
    /* Copia de solo lectura [{id,name}] */
    list: () => ArenaDB.list().map((p) => ({ id: p.id, name: p.name })),
    count: () => ArenaDB.list().length,
    status: () => ArenaDB.status(),
    onChange: (fn) => ArenaDB.onChange(fn),
    onStatus: (fn) => ArenaDB.onStatus(fn),
    errText,
    async add(name) { const r = await ArenaDB.add(name); return r.ok ? r : Object.assign(r, { message: errText(r) }); },
    async addMany(lines) {
      const r = await ArenaDB.addMany(lines.map((n) => String(n).replace(/^["'\s]+|["'\s]+$/g, '')));
      r.message = r.failed ? errText({ error: r.error }) : r.added + ' added' + (r.duplicates ? ', ' + r.duplicates + ' duplicate(s) skipped' : '') + '.';
      return r;
    },
    async rename(id, name) { const r = await ArenaDB.rename(id, name); return r.ok ? r : Object.assign(r, { message: errText(r) }); },
    async remove(id) { const r = await ArenaDB.remove(id); return r.ok ? r : Object.assign(r, { message: errText(r) }); },
    syncLine() {
      const s = ArenaDB.status();
      return s === 'online' ? '☁ Synced: this list is shared with every game and device.'
        : s === 'offline' ? '⚠ Offline: showing the last saved copy. Changes need a connection.' : 'Connecting to the database…';
    },
  };
})();
