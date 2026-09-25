// Données, stockage local chiffré (IndexedDB), synchronisation avec le Worker.
//
// Modèle : chaque collection est un dictionnaire { id: enregistrement }.
// Chaque enregistrement porte `u` (horodatage de modification) et `del` (suppression).
// Deux copies se fusionnent enregistrement par enregistrement : la plus récente gagne.
// Ainsi téléphone et ordinateur peuvent travailler hors ligne et se resynchroniser sans perte.

import * as C from './crypto.js';

export const COLLECTIONS = ['immeubles', 'locataires', 'paiements', 'depenses', 'documents', 'historique'];
const HIST_MAX = 1000;
const DATA_LABEL = 'ares-data-v2';
const fileLabel = (id) => 'ares-file:' + id;

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
export const emptyState = () => Object.fromEntries([['v', 2], ...COLLECTIONS.map((c) => [c, {}])]);
export const payKey = (locId, y, m) => `${locId}-${y}-${m}`;

// ───────────────────────── IndexedDB (clé/valeur) ─────────────────────────
const idb = {
  _db: null,
  open() {
    if (this._db) return this._db;
    this._db = new Promise((resolve, reject) => {
      const r = indexedDB.open('ares-v2', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    return this._db;
  },
  async tx(mode, fn) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const t = db.transaction('kv', mode);
      const req = fn(t.objectStore('kv'));
      t.oncomplete = () => resolve(req && req.result);
      t.onerror = () => reject(t.error);
    });
  },
  get: (k) => idb.tx('readonly', (s) => s.get(k)),
  set: (k, v) => idb.tx('readwrite', (s) => s.put(v, k)),
  del: (k) => idb.tx('readwrite', (s) => s.delete(k)),
  clear: () => idb.tx('readwrite', (s) => s.clear()),
};

// ───────────────────────── Fusion ─────────────────────────
function stable(v) {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  return JSON.stringify(v);
}

function newer(a, b) {
  if (!a) return b;
  if (!b) return a;
  if ((a.u || 0) !== (b.u || 0)) return (a.u || 0) > (b.u || 0) ? a : b;
  return stable(a) >= stable(b) ? a : b; // départage déterministe
}

export function merge(a, b) {
  const out = emptyState();
  for (const c of COLLECTIONS) {
    const A = (a && a[c]) || {};
    const B = (b && b[c]) || {};
    for (const id of new Set([...Object.keys(A), ...Object.keys(B)])) out[c][id] = newer(A[id], B[id]);
  }
  const hist = Object.values(out.historique).sort((x, y) => y.t - x.t);
  if (hist.length > HIST_MAX) for (const h of hist.slice(HIST_MAX)) delete out.historique[h.id];
  return out;
}

export const sameState = (a, b) => stable(a) === stable(b);

// ───────────────────────── Migration de l'ancien format ─────────────────────────
export function isLegacy(obj) {
  return obj && Array.isArray(obj.immeubles) && Array.isArray(obj.locataires);
}

export function fromLegacy(old) {
  const now = Date.now();
  const s = emptyState();
  const files = [];
  const num = (v) => (typeof v === 'number' && isFinite(v) ? v : parseFloat(v) || 0);
  for (const im of old.immeubles || []) {
    if (!im || !im.id) continue;
    s.immeubles[im.id] = { id: im.id, adresse: im.adresse || '', loyer: num(im.loyer), charges: num(im.charges), note: im.note || '', u: now };
  }
  for (const l of old.locataires || []) {
    if (!l || !l.id) continue;
    const { docs, ...rest } = l;
    s.locataires[l.id] = { ...rest, loyer: num(l.loyer), caution: num(l.caution), u: now };
    for (const d of docs || []) {
      const id = d.id || uid();
      s.documents[id] = { id, locId: l.id, label: d.label || 'Document', date: d.date || '', size: d.size || 0, mime: 'application/pdf', u: now };
      if (typeof d.data === 'string' && d.data.startsWith('data:')) files.push({ id, dataUrl: d.data });
    }
  }
  for (const [k, v] of Object.entries(old.paiements || {})) {
    const m = k.match(/^(.+)-(\d{4})-(\d{1,2})$/);
    if (!m) continue;
    const loc = s.locataires[m[1]];
    s.paiements[k] = { id: k, locId: m[1], y: +m[2], m: +m[3], date: (v && v.date) || '', montant: loc ? loc.loyer : 0, u: now };
  }
  for (const [immId, list] of Object.entries(old.depenses || {})) {
    for (const d of list || []) {
      const id = d.id || uid();
      s.depenses[id] = { id, immId, desc: d.desc || '', montant: num(d.montant), date: d.date || '', cat: d.cat || 'autre', u: now };
    }
  }
  for (const h of old.historique || []) {
    const id = uid();
    s.historique[id] = { id, t: Date.parse(h.date) || now, action: h.action || '', detail: h.detail || '', u: now };
  }
  return { state: s, files };
}

function dataUrlToBytes(url) {
  const i = url.indexOf(',');
  const meta = url.slice(5, i);
  const data = url.slice(i + 1);
  return meta.endsWith(';base64') ? C.b64.decode(data) : new TextEncoder().encode(decodeURIComponent(data));
}

// ───────────────────────── API du Worker ─────────────────────────
class Api {
  constructor(base) {
    this.base = base.replace(/\/$/, '') + '/api/ares/';
    this.token = null;
  }
  async req(path, opts = {}) {
    const headers = { ...(opts.headers || {}) };
    if (this.token) headers.Authorization = 'Bearer ' + this.token;
    const r = await fetch(this.base + path, { ...opts, headers, cache: 'no-store' });
    return r;
  }
  static async err(r) {
    try {
      return (await r.json()).error || 'Erreur ' + r.status;
    } catch {
      return 'Erreur ' + r.status;
    }
  }
}

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// ───────────────────────── Coffre (Vault) ─────────────────────────
export class Vault {
  constructor(apiBase) {
    this.api = new Api(apiBase);
    this.dek = null;
    this.state = emptyState();
    this.etag = null;
    this.dirty = false;
    this.status = 'idle'; // idle | pending | syncing | synced | offline | error
    this.lastSync = null;
    this.listeners = new Set();
    this._syncing = null;
    this._again = false;
    this._timer = null;
  }

  on(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  emit(kind) {
    for (const fn of this.listeners) fn(kind);
  }
  setStatus(s, msg) {
    this.status = s;
    this.statusMsg = msg || '';
    this.emit('status');
  }

  // ── Configuration & déverrouillage ──
  async remoteMeta() {
    const r = await this.api.req('meta');
    if (r.status === 404) return { configured: false };
    if (!r.ok) throw new ApiError(r.status, await Api.err(r));
    return r.json();
  }

  async setup(setupCode, passphrase) {
    const salt = C.b64.encode(C.randomBytes(16));
    const iter = C.PBKDF2_ITER;
    const { kek, authToken, authHash } = await C.deriveFromPassphrase(passphrase, salt, iter);
    const dek = await C.newDataKey();
    const wrappedKey = await C.wrapDataKey(dek, kek);
    const r = await this.api.req('setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ setupCode, salt, iter, wrappedKey, authHash }),
    });
    if (!r.ok) throw new ApiError(r.status, await Api.err(r));
    await idb.clear();
    await idb.set('meta', { salt, iter, wrappedKey });
    this.api.token = authToken;
    this.dek = await C.unwrapDataKey(wrappedKey, kek);
    this.state = emptyState();
    this.etag = null;
    this.dirty = true;
    await this.persist();
  }

  async unlock(passphrase) {
    let meta = null;
    let online = navigator.onLine;
    if (online) {
      try {
        meta = await this.remoteMeta();
        if (!meta.configured) return { setup: true };
      } catch (e) {
        if (e instanceof ApiError) throw e;
        online = false;
      }
    }
    const cached = await idb.get('meta');
    if (!meta) meta = cached;
    if (!meta) throw new ApiError(0, 'Hors ligne et aucune copie locale sur cet appareil.');

    const { kek, authToken } = await C.deriveFromPassphrase(passphrase, meta.salt, meta.iter);
    let wrappedKey = cached && cached.salt === meta.salt ? cached.wrappedKey : null;
    if (online) {
      this.api.token = authToken;
      const r = await this.api.req('key');
      if (r.status === 401 || r.status === 429) {
        this.api.token = null;
        throw new ApiError(r.status, await Api.err(r));
      }
      if (r.ok) wrappedKey = (await r.json()).wrappedKey;
    }
    if (!wrappedKey) throw new ApiError(0, 'Connexion requise pour le premier accès sur cet appareil.');
    try {
      this.dek = await C.unwrapDataKey(wrappedKey, kek);
    } catch {
      throw new ApiError(401, "Clé d'accès incorrecte");
    }
    this.api.token = authToken;
    if (cached && cached.salt !== meta.salt) {
      // La clé a été changée depuis un autre appareil : l'ancienne copie locale est illisible.
      await idb.clear();
    }
    await idb.set('meta', { salt: meta.salt, iter: meta.iter, wrappedKey });
    await this.loadLocal();
    return { ok: true };
  }

  async changePassphrase(newPassphrase) {
    // La clé de données ne change pas : on la ré-enveloppe avec la nouvelle clé d'accès.
    const meta = await idb.get('meta');
    const salt = C.b64.encode(C.randomBytes(16));
    const iter = C.PBKDF2_ITER;
    const next = await C.deriveFromPassphrase(newPassphrase, salt, iter);
    // Déballage temporaire extractible pour pouvoir ré-envelopper.
    const current = this._kekForRewrap;
    if (!current) throw new Error('Session expirée, reconnectez-vous.');
    const dekX = await C.unwrapDataKey(meta.wrappedKey, current, true);
    const wrappedKey = await C.wrapDataKey(dekX, next.kek);
    const r = await this.api.req('rekey', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ salt, iter, wrappedKey, authHash: next.authHash }),
    });
    if (!r.ok) throw new ApiError(r.status, await Api.err(r));
    this.api.token = next.authToken;
    this._kekForRewrap = next.kek;
    await idb.set('meta', { salt, iter, wrappedKey });
  }

  async verifyPassphrase(passphrase) {
    const meta = await idb.get('meta');
    const { kek } = await C.deriveFromPassphrase(passphrase, meta.salt, meta.iter);
    try {
      await C.unwrapDataKey(meta.wrappedKey, kek);
      this._kekForRewrap = kek;
      return true;
    } catch {
      return false;
    }
  }

  lock() {
    this.dek = null;
    this.api.token = null;
    this._kekForRewrap = null;
    this.state = emptyState();
    clearTimeout(this._timer);
    this.emit('locked');
  }

  get unlocked() {
    return !!this.dek;
  }

  // ── Copie locale chiffrée ──
  async loadLocal() {
    const blob = await idb.get('state');
    this.etag = (await idb.get('etag')) || null;
    this.dirty = !!(await idb.get('dirty'));
    this.state = emptyState();
    if (blob) {
      try {
        this.state = merge(emptyState(), await C.decryptJson(this.dek, blob, DATA_LABEL));
      } catch {
        this.etag = null; // copie locale illisible : on repart du serveur
      }
    }
    this.emit('data');
  }

  async persist() {
    await idb.set('state', await C.encryptJson(this.dek, this.state, DATA_LABEL));
    await idb.set('etag', this.etag);
    await idb.set('dirty', this.dirty);
  }

  // ── Lecture ──
  list(c) {
    return Object.values(this.state[c]).filter((r) => !r.del);
  }
  get(c, id) {
    const r = this.state[c][id];
    return r && !r.del ? r : null;
  }

  // ── Écriture ──
  async mutate(fn, action, detail, ref) {
    const now = Date.now();
    const touched = [];
    const tx = {
      put: (c, rec) => {
        const id = rec.id || uid();
        const prev = this.state[c][id];
        const next = { ...(prev && !prev.del ? prev : {}), ...rec, id, u: now };
        delete next.del;
        this.state[c][id] = next;
        touched.push([c, id]);
        return next;
      },
      remove: (c, id) => {
        const prev = this.state[c][id];
        if (!prev || prev.del) return;
        this.state[c][id] = { id, del: true, u: now };
        touched.push([c, id]);
      },
    };
    const result = fn(tx);
    if (action) {
      const id = uid();
      this.state.historique[id] = { id, t: now, action, detail: detail || '', ref: ref || '', u: now };
    }
    this.dirty = true;
    await this.persist();
    this.emit('data');
    if (this.status !== 'offline') this.setStatus('pending');
    this.scheduleSync(600);
    return result;
  }

  async mergeIn(other) {
    this.state = merge(this.state, other);
    this.dirty = true;
    await this.persist();
    this.emit('data');
    this.scheduleSync(100);
  }

  // ── Synchronisation ──
  scheduleSync(ms) {
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this.sync(), ms);
  }

  sync() {
    if (!this.unlocked) return Promise.resolve();
    if (this._syncing) {
      this._again = true;
      return this._syncing;
    }
    this._syncing = this._sync().finally(() => {
      this._syncing = null;
      if (this._again) {
        this._again = false;
        this.scheduleSync(50);
      }
    });
    return this._syncing;
  }

  async _sync() {
    if (!navigator.onLine) return this.setStatus('offline');
    this.setStatus('syncing');
    try {
      for (let attempt = 0; attempt < 5; attempt++) {
        const headers = this.etag && !this.dirty ? { 'If-None-Match': this.etag } : {};
        const r = await this.api.req('data', { headers });
        if (r.status === 401) throw new ApiError(401, "Clé d'accès changée sur un autre appareil. Reconnectez-vous.");
        if (r.status === 304) break; // rien de neuf, rien à envoyer
        let remote = null;
        let etag = null;
        if (r.ok) {
          etag = r.headers.get('ETag');
          remote = merge(emptyState(), await C.decryptJson(this.dek, await r.arrayBuffer(), DATA_LABEL));
        } else if (r.status !== 404) throw new ApiError(r.status, await Api.err(r));

        const merged = merge(this.state, remote || emptyState());
        const changedLocal = !sameState(merged, this.state);
        this.state = merged;
        if (remote && sameState(merged, remote)) {
          this.etag = etag;
          this.dirty = false;
          await this.persist();
          if (changedLocal) this.emit('data');
          break;
        }
        const body = await C.encryptJson(this.dek, merged, DATA_LABEL);
        const put = await this.api.req('data', {
          method: 'PUT',
          headers: etag ? { 'If-Match': etag } : { 'If-None-Match': '*' },
          body,
        });
        if (put.status === 412) continue; // un autre appareil a écrit entre-temps : on refusionne
        if (!put.ok) throw new ApiError(put.status, await Api.err(put));
        this.etag = put.headers.get('ETag') || (await put.json().catch(() => ({}))).etag || null;
        this.dirty = false;
        await this.persist();
        if (changedLocal) this.emit('data');
        break;
      }
      await this.flushFiles();
      this.lastSync = new Date();
      this.setStatus(this.dirty ? 'error' : 'synced', this.dirty ? 'Conflits répétés, nouvel essai bientôt' : '');
    } catch (e) {
      if (e instanceof ApiError) {
        this.setStatus('error', e.message);
        if (e.status === 401) this.emit('auth-lost');
      } else if (!navigator.onLine || e instanceof TypeError) {
        this.setStatus('offline');
      } else {
        this.setStatus('error', e.message);
      }
    }
  }

  // ── Documents (chiffrés séparément, pour garder la base légère) ──
  async saveFile(id, bytes) {
    const blob = await C.encryptBytes(this.dek, bytes, fileLabel(id));
    await idb.set('file:' + id, blob);
    const pending = (await idb.get('pendingFiles')) || [];
    if (!pending.includes(id)) pending.push(id);
    await idb.set('pendingFiles', pending);
    this.scheduleSync(100);
  }

  async deleteFile(id) {
    await idb.del('file:' + id);
    const pending = ((await idb.get('pendingFiles')) || []).filter((x) => x !== id);
    await idb.set('pendingFiles', pending);
    const dels = (await idb.get('pendingDeletes')) || [];
    dels.push(id);
    await idb.set('pendingDeletes', dels);
    this.scheduleSync(100);
  }

  async flushFiles() {
    const pending = (await idb.get('pendingFiles')) || [];
    for (const id of [...pending]) {
      const blob = await idb.get('file:' + id);
      if (blob) {
        const r = await this.api.req('files/' + id, { method: 'PUT', body: blob });
        if (!r.ok) throw new ApiError(r.status, await Api.err(r));
      }
      pending.splice(pending.indexOf(id), 1);
      await idb.set('pendingFiles', pending);
    }
    const dels = (await idb.get('pendingDeletes')) || [];
    for (const id of [...dels]) {
      const r = await this.api.req('files/' + id, { method: 'DELETE' });
      if (!r.ok && r.status !== 404) throw new ApiError(r.status, await Api.err(r));
      dels.splice(dels.indexOf(id), 1);
      await idb.set('pendingDeletes', dels);
    }
  }

  async readFile(id) {
    let blob = await idb.get('file:' + id);
    if (!blob) {
      const r = await this.api.req('files/' + id);
      if (!r.ok) throw new ApiError(r.status, r.status === 404 ? 'Document introuvable' : await Api.err(r));
      blob = new Uint8Array(await r.arrayBuffer());
      await idb.set('file:' + id, blob);
    }
    return C.decryptBytes(this.dek, blob, fileLabel(id));
  }

  // ── Import / export ──
  async importLegacy(obj) {
    const { state, files } = fromLegacy(obj);
    for (const f of files) {
      try {
        await this.saveFile(f.id, dataUrlToBytes(f.dataUrl));
      } catch {
        state.documents[f.id].label += ' (illisible)';
      }
    }
    await this.mergeIn(state);
    return { immeubles: Object.keys(state.immeubles).length, locataires: Object.keys(state.locataires).length, documents: files.length };
  }

  async exportEncrypted() {
    const meta = await idb.get('meta');
    const data = C.b64.encode(await C.encryptJson(this.dek, this.state, DATA_LABEL));
    return { format: 'ares-backup', v: 1, date: new Date().toISOString(), salt: meta.salt, iter: meta.iter, wrappedKey: meta.wrappedKey, data };
  }

  static async openBackup(backup, passphrase) {
    const { kek } = await C.deriveFromPassphrase(passphrase, backup.salt, backup.iter);
    let dek;
    try {
      dek = await C.unwrapDataKey(backup.wrappedKey, kek);
    } catch {
      throw new Error('Clé incorrecte pour cette sauvegarde');
    }
    return C.decryptJson(dek, C.b64.decode(backup.data), DATA_LABEL);
  }

  async forgetDevice() {
    this.lock();
    await idb.clear();
  }
}
