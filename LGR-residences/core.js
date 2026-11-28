// LGR · Lux Gestion Résidences — le cœur : coffre chiffré local (IndexedDB) + synchronisation avec le Worker.
// Tout est chiffré dans le navigateur (AES-256-GCM, ../ares/crypto.js) : le serveur ne voit que des octets illisibles.
//
// Données : db = { v, syn:{id:fiche}, res:{…}, doc:{…}, soc:{…} } ; chaque fiche a « u » (modifiée le, ms) ;
// une fiche supprimée garde « del » (corbeille) : rien ne se perd, la fusion entre appareils garde la plus récente.
import { b64, randomBytes, PBKDF2_ITER, deriveFromPassphrase, newDataKey, wrapDataKey, unwrapDataKey, encryptBytes, decryptBytes, encryptJson, decryptJson, newRecoveryCode, normalizeRecoveryCode } from '../ares/crypto.js';

export const WORKER = 'https://luxinterventions-hitcounter.weathered-tree-cfd3.workers.dev';
const API = WORKER + '/api/lgr/';

// ── IndexedDB : « kv » (méta, données chiffrées, session) et « files » (fichiers chiffrés) ──
let idbP = null;
function idb() {
  if (!idbP) idbP = new Promise((ok, ko) => {
    const r = indexedDB.open('lgr', 1);
    r.onupgradeneeded = () => { r.result.createObjectStore('kv'); r.result.createObjectStore('files'); };
    r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error);
  });
  return idbP;
}
async function tx(store, mode, fn) {
  const d = await idb();
  return new Promise((ok, ko) => {
    const t = d.transaction(store, mode), s = t.objectStore(store);
    let out; const r = fn(s); if (r) r.onsuccess = () => { out = r.result; };
    t.oncomplete = () => ok(out); t.onerror = () => ko(t.error); t.onabort = () => ko(t.error);
  });
}
export const kvGet = (k) => tx('kv', 'readonly', (s) => s.get(k));
export const kvSet = (k, v) => tx('kv', 'readwrite', (s) => s.put(v, k));
export const kvDel = (k) => tx('kv', 'readwrite', (s) => s.delete(k));
const fGet = (k) => tx('files', 'readonly', (s) => s.get(k));
const fSet = (k, v) => tx('files', 'readwrite', (s) => s.put(v, k));
const fKeys = () => tx('files', 'readonly', (s) => s.getAllKeys());

export const uid = () => [...randomBytes(10)].map((b) => b.toString(36).padStart(2, '0')).join('').slice(0, 16);
export const emptyDb = () => ({ v: 1, syn: {}, res: {}, doc: {}, soc: {} });
export const COLS = ['syn', 'res', 'doc'];

export const S = { meta: null, dek: null, token: '', db: emptyDb(), etag: '', dirty: false, online: navigator.onLine, server: '', lastSync: 0, err: '' };
const listeners = new Set();
export const onChange = (f) => listeners.add(f);
const emit = (what) => listeners.forEach((f) => { try { f(what); } catch (e) { console.error(e); } });

// ── Serveur ──
async function api(path, { method = 'GET', body, json, headers = {}, auth = true } = {}) {
  const h = { ...headers };
  if (auth && S.token) h.Authorization = 'Bearer ' + S.token;
  if (json !== undefined) { h['Content-Type'] = 'application/json'; body = JSON.stringify(json); }
  return fetch(API + path, { method, headers: h, body, cache: 'no-store' });
}
// état du serveur : « ok » (coffre LGR prêt), « none » (Worker à jour, pas encore de coffre), « old » (Worker pas encore republié), « off » (hors ligne)
export async function serverMeta() {
  try {
    const r = await api('meta', { auth: false });
    const j = await r.json().catch(() => ({}));
    if (j.lgr && j.configured) { S.server = 'ok'; return j; }
    S.server = j.lgr ? 'none' : 'old'; return null;
  } catch { S.server = 'off'; return null; }
}

// ── Clés ──
async function keySlot(secret, salt, iter, dek) {
  const d = await deriveFromPassphrase(secret, salt, iter);
  return { salt, iter, wrappedKey: await wrapDataKey(dek, d.kek), authHash: d.authHash, token: d.authToken, kek: d.kek };
}
const plain = (k) => ({ salt: k.salt, iter: k.iter, wrappedKey: k.wrappedKey, authHash: k.authHash });
// nouveau coffre (sur cet appareil) : clé d'accès + clé de secours
export async function createVault(pass) {
  const dekX = await newDataKey();
  const main = await keySlot(pass, b64.encode(randomBytes(16)), PBKDF2_ITER, dekX);
  const code = newRecoveryCode();
  const rec = await keySlot(normalizeRecoveryCode(code), b64.encode(randomBytes(16)), PBKDF2_ITER, dekX);
  const meta = { v: 1, ...plain(main), recovery: plain(rec), onServer: false, createdAt: new Date().toISOString() };
  const old = await kvGet('data'); if (old) await kvSet('data-old-' + Date.now(), old); // jamais perdre un ancien coffre de cet appareil
  await kvSet('meta', meta);
  S.meta = meta; S.token = main.token;
  S.dek = await unwrapDataKey(main.wrappedKey, main.kek); // la clé de données reste non extractible en mémoire
  S.db = emptyDb(); S.dirty = true; S.etag = '';
  await kvDel('etag'); await kvDel('pend');
  await saveLocal(); emit('load');
  return code;
}
// une « serrure » : la clé d'accès (meta) ou la clé de secours (meta.recovery) ; la clé enveloppée vient du serveur si besoin
async function openSlot(meta, secret, recovery, extractable) {
  const slot = recovery ? meta.recovery : meta;
  if (!slot || !slot.salt) throw new Error('norecovery');
  const d = await deriveFromPassphrase(recovery ? normalizeRecoveryCode(secret) : secret, slot.salt, slot.iter);
  if (slot.authHash && d.authHash !== slot.authHash) throw new Error('badpass');
  if (!slot.wrappedKey) {
    let r;
    try { r = await api('key', { headers: { Authorization: 'Bearer ' + d.authToken }, auth: false }); } catch { throw new Error('offline'); }
    if (r.status === 401) throw new Error('badpass');
    if (r.status === 429) throw new Error('locked');
    if (!r.ok) throw new Error('server');
    slot.wrappedKey = (await r.json()).wrappedKey; slot.authHash = d.authHash;
  }
  let dek;
  try { dek = await unwrapDataKey(slot.wrappedKey, d.kek, extractable); } catch { throw new Error('badpass'); }
  return { dek, token: d.authToken };
}
// ouvrir : avec la clé d'accès ou la clé de secours ; méta de cet appareil, sinon celle du serveur (coffre créé sur un autre appareil)
export async function unlock(secret, { recovery = false } = {}) {
  let meta = await kvGet('meta');
  if (!meta) {
    const sm = await serverMeta();
    if (!sm) throw new Error(S.server === 'off' ? 'offline' : 'novault');
    meta = { v: 1, salt: sm.salt, iter: sm.iter, wrappedKey: '', authHash: '', recovery: sm.recovery ? { ...sm.recovery, wrappedKey: '', authHash: '' } : null, onServer: true };
  }
  const o = await openSlot(meta, secret, recovery, false);
  S.meta = meta; S.dek = o.dek; S.token = o.token;
  await kvSet('meta', meta);
  await loadLocal();
  return true;
}
// la clé d'accès a été changée sur un autre appareil : on oublie la méta de cet appareil (les données chiffrées restent)
export async function forgetMeta() { await kvDel('meta'); await lock(); }
// rester ouvert sur cet appareil : la clé (non extractible) et le jeton restent dans IndexedDB de ce navigateur
export async function remember(on) { if (on) await kvSet('sess', { dek: S.dek, token: S.token }); else await kvDel('sess'); }
export async function resume() {
  const s = await kvGet('sess').catch(() => null), meta = await kvGet('meta').catch(() => null);
  if (!s || !meta) return false;
  S.meta = meta; S.dek = s.dek; S.token = s.token;
  try { await loadLocal(); return true; } catch { return false; }
}
export async function lock() { await kvDel('sess'); S.dek = null; S.token = ''; S.db = emptyDb(); }
export const hasVault = async () => !!(await kvGet('meta'));

// changer la clé d'accès : il faut l'ancienne (ou la clé de secours) pour ressortir la clé de données
export async function changePass(oldSecret, newPass, { recovery = false } = {}) {
  const m = S.meta;
  const o = await openSlot(m, oldSecret, recovery, true);
  const nk = await keySlot(newPass, b64.encode(randomBytes(16)), PBKDF2_ITER, o.dek);
  if (m.onServer) {
    const r = await api('rekey', { method: 'POST', json: plain(nk), headers: { Authorization: 'Bearer ' + o.token }, auth: false });
    if (!r.ok) throw new Error('server');
  }
  Object.assign(m, plain(nk));
  await kvSet('meta', m); S.token = nk.token;
  if (await kvGet('sess')) await remember(true);
}
// nouvelle clé de secours (l'ancienne ne marche plus) : avec la clé d'accès
export async function newRecovery(pass) {
  const m = S.meta;
  const o = await openSlot(m, pass, false, true);
  const code = newRecoveryCode();
  const rk = plain(await keySlot(normalizeRecoveryCode(code), b64.encode(randomBytes(16)), PBKDF2_ITER, o.dek));
  if (m.onServer) { const r = await api('recovery', { method: 'POST', json: rk, headers: { Authorization: 'Bearer ' + o.token }, auth: false }); if (!r.ok) throw new Error('server'); }
  m.recovery = rk; await kvSet('meta', m);
  return code;
}

// ── Données ──
async function loadLocal() {
  const enc = await kvGet('data');
  S.db = enc ? await decryptJson(S.dek, enc, 'lgr-data') : emptyDb();
  for (const c of [...COLS, 'soc']) S.db[c] = S.db[c] || {};
  S.etag = (await kvGet('etag')) || ''; S.dirty = !!(await kvGet('dirty'));
  emit('load');
}
let saveT = null;
export async function saveLocal() {
  await kvSet('data', await encryptJson(S.dek, S.db, 'lgr-data'));
  await kvSet('dirty', S.dirty);
}
// enregistrer une fiche (syn, res, doc) ; soc = données de la société (une seule fiche)
export function put(col, rec) {
  rec.u = Date.now();
  if (col === 'soc') S.db.soc = rec; else { if (!rec.id) rec.id = uid(); S.db[col][rec.id] = rec; }
  S.dirty = true; emit(col);
  clearTimeout(saveT); saveT = setTimeout(() => { saveLocal().then(() => sync()).catch((e) => console.error(e)); }, 400);
  return rec;
}
export const trash = (col, id) => { const r = S.db[col][id]; if (r) { r.del = Date.now(); put(col, r); } };
export const restore = (col, id) => { const r = S.db[col][id]; if (r) { delete r.del; put(col, r); } };
export const live = (col) => Object.values(S.db[col] || {}).filter((r) => !r.del);
export const get = (col, id) => { const r = (S.db[col] || {})[id]; return r && !r.del ? r : null; };

// fusion : pour chaque fiche, la plus récente gagne (aussi pour les suppressions, qui sont des fiches datées)
function merge(a, b) {
  const out = emptyDb();
  for (const c of COLS) {
    out[c] = { ...(a[c] || {}) };
    for (const [id, r] of Object.entries(b[c] || {})) if (!out[c][id] || (r.u || 0) > (out[c][id].u || 0)) out[c][id] = r;
  }
  out.soc = (b.soc && (b.soc.u || 0) > ((a.soc && a.soc.u) || 0)) ? b.soc : (a.soc || {});
  return out;
}

// ── Fichiers : chiffrés sur l'appareil, puis envoyés au serveur ──
export async function addFile(bytes) {
  const id = uid() + uid().slice(0, 8);
  await fSet(id, await encryptBytes(S.dek, bytes, 'lgr-file:' + id));
  const pend = (await kvGet('pend')) || []; pend.push(id); await kvSet('pend', pend);
  return id;
}
export async function readFile(id) {
  let enc = await fGet(id);
  if (!enc) {
    const r = await api('f/' + id);
    if (!r.ok) throw new Error(r.status === 404 ? 'nofile' : 'server');
    enc = new Uint8Array(await r.arrayBuffer());
    await fSet(id, enc).catch(() => {});
  }
  return decryptBytes(S.dek, enc, 'lgr-file:' + id);
}
export const pendingCount = async () => ((await kvGet('pend')) || []).length;
export const localFileIds = () => fKeys();

// ── Synchronisation ──
let syncing = null, again = false;
export function sync() {
  if (!S.dek || !S.meta || !S.meta.onServer) return Promise.resolve();
  if (syncing) { again = true; return syncing; }
  syncing = (async () => {
    try {
      for (let round = 0; round < 4; round++) {
        const r = await api('data', { headers: S.etag ? { 'If-None-Match': S.etag } : {} });
        if (r.status === 401) throw new Error('auth');
        if (r.ok) {
          const remote = await decryptJson(S.dek, new Uint8Array(await r.arrayBuffer()), 'lgr-data');
          S.db = merge(S.db, remote); S.etag = r.headers.get('ETag') || ''; await kvSet('etag', S.etag);
          // ce qui est arrivé d'ailleurs est déjà là ; on renvoie seulement si on avait des changements
          await saveLocal(); emit('sync');
        } else if (r.status === 404) { S.etag = ''; S.dirty = true; }
        else if (r.status !== 304) throw new Error('server');
        if (!S.dirty) break;
        const body = await encryptJson(S.dek, S.db, 'lgr-data');
        const w = await api('data', { method: 'PUT', body, headers: S.etag ? { 'If-Match': S.etag } : { 'If-None-Match': '*' } });
        if (w.status === 412) continue; // quelqu'un a écrit entre-temps : on relit, on fusionne, on réessaie
        if (!w.ok) throw new Error('server');
        S.etag = w.headers.get('ETag') || ''; S.dirty = false;
        await kvSet('etag', S.etag); await kvSet('dirty', false);
        break;
      }
      const pend = (await kvGet('pend')) || [];
      for (const id of [...pend]) {
        const enc = await fGet(id);
        if (enc) { const w = await api('f/' + id, { method: 'PUT', body: enc }); if (!w.ok) throw new Error('file'); }
        const cur = (await kvGet('pend')) || []; await kvSet('pend', cur.filter((x) => x !== id));
      }
      S.lastSync = Date.now(); S.err = ''; S.server = 'ok';
    } catch (e) { S.err = S.online ? String(e.message || e) : 'offline'; }
    finally { syncing = null; emit('status'); if (again) { again = false; sync(); } }
  })();
  return syncing;
}
// activer la synchronisation : le coffre de cet appareil est copié sur le serveur (code de configuration du Worker)
export async function enableSync(setupCode) {
  const m = S.meta;
  const r = await api('setup', { method: 'POST', auth: false, json: { setupCode, salt: m.salt, iter: m.iter, wrappedKey: m.wrappedKey, authHash: m.authHash, recovery: m.recovery } });
  if (r.status === 403) throw new Error('badcode');
  if (r.status === 409) throw new Error('exists');
  if (r.status === 503) throw new Error('nocode');
  if (!r.ok) throw new Error('server');
  m.onServer = true; await kvSet('meta', m);
  S.dirty = true; S.etag = '';
  const all = await fKeys(); const pend = new Set((await kvGet('pend')) || []); all.forEach((k) => pend.add(k)); await kvSet('pend', [...pend]);
  await sync();
}
addEventListener('online', () => { S.online = true; sync(); emit('status'); });
addEventListener('offline', () => { S.online = false; emit('status'); });
setInterval(() => { if (document.visibilityState === 'visible') sync(); }, 60000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') sync(); });

// ── Sauvegarde chiffrée (fichier .lgr) : méta + données + fichiers, tous chiffrés ──
export async function backupBlob(withFiles) {
  const parts = [JSON.stringify({ lgr: 1, at: new Date().toISOString(), meta: { ...S.meta, onServer: false }, data: b64.encode(await encryptJson(S.dek, S.db, 'lgr-data')) }) + '\n'];
  if (withFiles) for (const id of await fKeys()) parts.push(id + '\t' + b64.encode(await fGet(id)) + '\n');
  return new Blob(parts, { type: 'application/octet-stream' });
}
// importer : fusion avec ce qui est déjà là (rien n'est écrasé) ; la sauvegarde doit venir du même coffre (même clé)
export async function importBackup(text) {
  const lines = text.split('\n'); const head = JSON.parse(lines[0]);
  if (!head.lgr) throw new Error('format');
  let remote;
  try { remote = await decryptJson(S.dek, b64.decode(head.data), 'lgr-data'); } catch { throw new Error('otherkey'); }
  let nf = 0; const pend = new Set((await kvGet('pend')) || []);
  for (const l of lines.slice(1)) { const i = l.indexOf('\t'); if (i < 0) continue; const id = l.slice(0, i); if (!(await fGet(id))) { await fSet(id, b64.decode(l.slice(i + 1))); pend.add(id); nf++; } }
  await kvSet('pend', [...pend]);
  S.db = merge(S.db, remote); S.dirty = true; await saveLocal(); emit('load'); sync();
  return { docs: Object.keys(remote.doc || {}).length, files: nf };
}
