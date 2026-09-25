// Ares Invest — Gestion locataires (interface)
import { Vault, payKey, isLegacy, ApiError } from './store.js';
import { passphraseStrength } from './crypto.js';

const VERSION = '2.0.0';
const API = document.querySelector('meta[name="ares-api"]').content;
const vault = new Vault(API);
const $ = (s, r = document) => r.querySelector(s);

// ───────────────────────── Gabarits HTML (échappement automatique) ─────────────────────────
class Raw {
  constructor(s) { this.s = s; }
  toString() { return this.s; }
}
const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const val = (v) => (v == null || v === false ? '' : v instanceof Raw ? v.s : Array.isArray(v) ? v.map(val).join('') : esc(v));
const html = (strings, ...vals) => new Raw(strings.reduce((out, s, i) => out + val(vals[i - 1]) + s));
const setHtml = (el, h) => { el.innerHTML = val(h); };

const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
  building: '<rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1M10 21v-3h4v3"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.3-5.5 6.5-5.5s5.7 2 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c1.8.7 3 2.5 3.5 5.2"/>',
  wallet: '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18M16 15h2"/><path d="M6 6V5a2 2 0 0 1 2-2h9"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
  lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>',
  shield: '<path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6L12 3Z"/><path d="m9 12 2 2 4-4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M3 3l18 18M10.6 5.1A10.6 10.6 0 0 1 12 5c6.4 0 10 7 10 7a17.7 17.7 0 0 1-3.2 4.2M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7c1.7 0 3.2-.5 4.5-1.2"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  msg: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12Z"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"/><path d="M14 3v5h5"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  upload: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  alert: '<path d="M12 3 2 20h20L12 3Z"/><path d="M12 10v4M12 17.5v.5"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  sync: '<path d="M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20v-4h-4"/>',
  receipt: '<path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2V3Z"/><path d="M9 8h6M9 12h6"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3M14 9l2 2"/>',
  phoneApp: '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
};
const icon = (n) => new Raw(`<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`);

// ───────────────────────── Formats ─────────────────────────
const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
const MONTHS_FULL = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const eurFmt = new Intl.NumberFormat('fr-LU', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 2 });
const money = (n) => eurFmt.format(n || 0);
const num = (v) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return isFinite(n) ? n : 0; };
const fmtDate = (s) => (s ? new Date(s + (s.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('fr-LU', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const fmtDateTime = (t) => new Date(t).toLocaleString('fr-LU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const today = () => new Date().toISOString().slice(0, 10);
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const level = (p) => (p >= 80 ? '' : p >= 50 ? 'warn' : 'bad');

// ───────────────────────── Règles métier ─────────────────────────
const fullName = (l) => [l.prenom, l.nom].filter(Boolean).join(' ') || 'Sans nom';
const initials = (l) => (((l.prenom || '')[0] || '') + ((l.nom || '')[0] || '')).toUpperCase() || '?';
const immName = (id) => (vault.get('immeubles', id) || {}).adresse || 'Sans immeuble';
const byName = (a, b) => fullName(a).localeCompare(fullName(b), 'fr');
const byAddr = (a, b) => (a.adresse || '').localeCompare(b.adresse || '', 'fr');
const ym = (y, m) => y * 12 + (m - 1);
const ymOf = (s) => { const d = new Date(s); return d.getFullYear() * 12 + d.getMonth(); };

function isDue(l, y, m) {
  const k = ym(y, m);
  if (l.debut && k < ymOf(l.debut)) return false;
  if (l.fin && k > ymOf(l.fin)) return false;
  return true;
}
const payment = (locId, y, m) => vault.get('paiements', payKey(locId, y, m));
const paidAmount = (p, l) => (p.montant != null ? p.montant : l.loyer) || 0;

function lateMonths(l, ref = new Date()) {
  const y = ref.getFullYear();
  const out = [];
  for (let m = 1; m < ref.getMonth() + 1; m++) if (isDue(l, y, m) && !payment(l.id, y, m)) out.push(m);
  return out;
}
function daysToEnd(l) {
  if (!l.fin) return null;
  return Math.round((new Date(l.fin + 'T00:00:00') - new Date(today() + 'T00:00:00')) / 86400000);
}
function yearStats(l, y) {
  let due = 0, paid = 0;
  for (let m = 1; m <= 12; m++) {
    if (isDue(l, y, m)) due += l.loyer || 0;
    const p = payment(l.id, y, m);
    if (p) paid += paidAmount(p, l);
  }
  return { due, paid };
}
const depensesOf = (immId, y) => vault.list('depenses').filter((d) => (!immId || d.immId === immId) && (!y || (d.date || '').startsWith(String(y))));

// ───────────────────────── État de l'interface ─────────────────────────
const ui = {
  route: 'dashboard',
  year: new Date().getFullYear(),
  immFilter: '',
  search: '',
  histShown: 20,
  sheet: null, // { kind, id, tab }
};

const NAV = [
  ['dashboard', 'Accueil', 'home'],
  ['immeubles', 'Immeubles', 'building'],
  ['locataires', 'Locataires', 'users'],
  ['paiements', 'Paiements', 'wallet'],
  ['stats', 'Statistiques', 'chart'],
  ['reglages', 'Réglages', 'more'],
];
const MOBILE_NAV = ['dashboard', 'immeubles', 'locataires', 'paiements', 'reglages'];

// ───────────────────────── Toasts & confirmations ─────────────────────────
function toast(msg, opts = {}) {
  const el = document.createElement('div');
  el.className = 'toast' + (opts.bad ? ' bad' : '');
  el.setAttribute('role', 'status');
  setHtml(el, html`<span>${msg}</span>${opts.undo ? html`<button type="button">Annuler</button>` : ''}`);
  if (opts.undo) el.querySelector('button').onclick = () => { el.remove(); opts.undo(); };
  $('#toasts').append(el);
  setTimeout(() => el.remove(), opts.undo ? 6000 : 3200);
}

function confirmBox(message, { ok = 'Confirmer', danger = false, detail = '' } = {}) {
  const dlg = $('#confirm');
  setHtml(dlg, html`
    <div class="sheet-body">
      <h2 style="font-size:18px;margin-bottom:8px">${message}</h2>
      ${detail ? html`<p class="muted small">${detail}</p>` : ''}
    </div>
    <div class="sheet-foot">
      <button class="btn" value="no" type="button">Annuler</button>
      <button class="btn ${danger ? 'danger solid' : 'primary'}" value="yes" type="button">${ok}</button>
    </div>`);
  return new Promise((resolve) => {
    dlg.querySelectorAll('button').forEach((b) => (b.onclick = () => { dlg.close(); resolve(b.value === 'yes'); }));
    dlg.onclose = () => resolve(false);
    dlg.showModal();
  });
}

function promptKey(title, detail) {
  const dlg = $('#confirm');
  setHtml(dlg, html`
    <form class="sheet-body stack" method="dialog">
      <h2 style="font-size:18px">${title}</h2>
      ${detail ? html`<p class="muted small">${detail}</p>` : ''}
      <input type="password" name="k" autocomplete="current-password" required placeholder="Clé d'accès">
      <div class="sheet-foot" style="padding:0;border:0;margin-top:16px">
        <button class="btn" value="no" type="button">Annuler</button>
        <button class="btn primary" type="submit">Valider</button>
      </div>
    </form>`);
  return new Promise((resolve) => {
    const f = dlg.querySelector('form');
    dlg.querySelector('button[value=no]').onclick = () => { dlg.close(); resolve(null); };
    f.onsubmit = (e) => { e.preventDefault(); const v = f.k.value; dlg.close(); resolve(v); };
    dlg.onclose = () => resolve(null);
    dlg.showModal();
    f.k.focus();
  });
}

// ───────────────────────── Écran de verrouillage ─────────────────────────
const lockEl = $('#lock');
const appEl = $('#app');

function legacyLocal() {
  try {
    const raw = localStorage.getItem('aresLocData');
    if (!raw) return null;
    const d = JSON.parse(raw);
    return isLegacy(d) && (d.immeubles.length || d.locataires.length) ? d : null;
  } catch { return null; }
}

function pwField(name, placeholder, autocomplete) {
  return html`<div class="pw-wrap">
    <input type="password" name="${name}" placeholder="${placeholder}" autocomplete="${autocomplete}" required autocapitalize="off" autocorrect="off" spellcheck="false">
    <button class="btn icon" type="button" data-action="toggle-pw" aria-label="Afficher">${icon('eye')}</button>
  </div>`;
}

function renderLock(mode, error = '') {
  appEl.hidden = true;
  lockEl.hidden = false;
  const legacy = legacyLocal();
  const head = html`
    <div class="lock-logo">${icon('lock')}</div>
    <div class="lock-head"><h1>Ares Invest</h1><p>Gestion locataires · Luxembourg</p></div>`;
  const foot = html`<div class="lock-foot">${icon('shield')} Chiffrement de bout en bout · AES-256</div>`;

  if (mode === 'checking') {
    setHtml(lockEl, html`<div class="lock-card">${head}<div style="display:flex;justify-content:center;padding:12px"><div class="spinner accent"></div></div>${foot}</div>`);
    return;
  }
  if (mode === 'setup') {
    setHtml(lockEl, html`<form class="lock-card" data-form="setup" autocomplete="off">
      ${head}
      <div class="alert info">${icon('key')}<div><b>Première configuration.</b> Choisissez la clé d'accès : elle chiffre toutes les données et ne peut pas être récupérée si elle est perdue.</div></div>
      <label class="field">Code de configuration
        <input name="code" type="password" required placeholder="ARES_SETUP_CODE" autocomplete="off">
      </label>
      <label class="field">Nouvelle clé d'accès ${pwField('pass', 'Au moins 12 caractères', 'new-password')}</label>
      <div class="meter"><i id="meter"></i></div>
      <div class="tiny muted" id="meterTxt">Conseil : une phrase de 4 ou 5 mots est à la fois forte et facile à retenir.</div>
      <label class="field">Confirmer la clé ${pwField('pass2', 'Retapez la clé', 'new-password')}</label>
      ${legacy ? html`<label class="row" style="padding:0;min-height:0;gap:10px;border:0"><input type="checkbox" name="legacy" checked style="width:20px;min-height:20px"> <span class="small">Importer les données de l'ancienne version trouvées sur cet appareil (${legacy.immeubles.length} immeubles, ${legacy.locataires.length} locataires)</span></label>` : ''}
      <div class="lock-err" role="alert">${error}</div>
      <button class="btn primary block" type="submit">Créer le coffre sécurisé</button>
      ${foot}
    </form>`);
    lockEl.querySelector('[name=pass]').addEventListener('input', (e) => {
      const s = passphraseStrength(e.target.value);
      const colors = ['var(--red-strong)', 'var(--red-strong)', 'var(--amber)', 'var(--green)', 'var(--green)'];
      const labels = ['Trop courte', 'Faible', 'Correcte', 'Forte', 'Excellente'];
      Object.assign($('#meter').style, { width: (s + 1) * 20 + '%', background: colors[s] });
      $('#meterTxt').textContent = e.target.value ? labels[s] : 'Conseil : une phrase de 4 ou 5 mots est à la fois forte et facile à retenir.';
    });
    return;
  }
  setHtml(lockEl, html`<form class="lock-card" data-form="unlock">
    ${head}
    <input type="text" name="username" value="Ares Invest" autocomplete="username" hidden>
    <label class="field">Clé d'accès ${pwField('pass', '••••••••••••', 'current-password')}</label>
    <div class="lock-err" role="alert">${error}</div>
    <button class="btn primary block" type="submit">Déverrouiller</button>
    ${!navigator.onLine ? html`<p class="tiny muted" style="text-align:center">Hors ligne : ouverture avec la copie chiffrée de cet appareil.</p>` : ''}
    ${foot}
  </form>`);
  setTimeout(() => lockEl.querySelector('[name=pass]')?.focus(), 50);
}

async function boot() {
  renderLock('checking');
  try {
    const meta = navigator.onLine ? await vault.remoteMeta() : null;
    renderLock(meta && !meta.configured ? 'setup' : 'unlock');
  } catch {
    renderLock('unlock');
  }
}

function setBusy(form, busy, label) {
  const b = form.querySelector('button[type=submit]');
  if (!b) return;
  if (busy) { b.dataset.label = b.textContent; b.disabled = true; setHtml(b, html`<span class="spinner"></span> ${label}`); }
  else { b.disabled = false; b.textContent = b.dataset.label || b.textContent; }
}

async function onUnlock(fd, form) {
  setBusy(form, true, 'Vérification…');
  try {
    const r = await vault.unlock(fd.get('pass'));
    if (r.setup) return renderLock('setup');
    startSession();
  } catch (e) {
    setBusy(form, false);
    form.querySelector('.lock-err').textContent = e.message || 'Erreur';
    form.pass.select();
  }
}

async function onSetup(fd, form) {
  const pass = fd.get('pass');
  const err = form.querySelector('.lock-err');
  if (pass.length < 12 || passphraseStrength(pass) < 2) return (err.textContent = 'Clé trop faible : au moins 12 caractères, idéalement une phrase de plusieurs mots.');
  if (pass !== fd.get('pass2')) return (err.textContent = 'Les deux clés ne correspondent pas.');
  setBusy(form, true, 'Création…');
  try {
    await vault.setup(fd.get('code'), pass);
  } catch (e) {
    setBusy(form, false);
    err.textContent = e.message || 'Erreur';
    return;
  }
  startSession();
  const legacy = fd.get('legacy') && legacyLocal();
  if (legacy) {
    try {
      const r = await vault.importLegacy(legacy);
      toast(`Import : ${r.immeubles} immeubles, ${r.locataires} locataires`);
    } catch (e) {
      toast("Import de l'ancienne version impossible : " + (e.message || 'erreur'), { bad: true });
    }
  }
  vault.sync();
}

// ───────────────────────── Session ─────────────────────────
let idleTimer = null;
let lastActive = Date.now();
let hiddenAt = null;
const lockMinutes = () => parseInt(localStorage.getItem('aresLockMin') || '15', 10);

function startSession() {
  lockEl.hidden = true;
  setHtml(lockEl, '');
  appEl.hidden = false;
  lastActive = Date.now();
  clearInterval(idleTimer);
  idleTimer = setInterval(() => {
    if (!vault.unlocked) return;
    if (Date.now() - lastActive > lockMinutes() * 60000) lockNow('Verrouillé après inactivité.');
    else if (document.visibilityState === 'visible') vault.sync();
  }, 30000);
  renderShell();
  go(location.hash.slice(2) || 'dashboard', true);
  vault.sync();
}

function lockNow(msg = '') {
  clearInterval(idleTimer);
  document.querySelectorAll('dialog[open]').forEach((d) => d.close());
  vault.lock();
  ui.sheet = null;
  for (const el of [appEl, sheetEl, $('#confirm'), $('#toasts')]) setHtml(el, '');
  renderLock('unlock', msg);
}

['pointerdown', 'keydown', 'touchstart'].forEach((ev) => addEventListener(ev, () => (lastActive = Date.now()), { passive: true }));
document.addEventListener('visibilitychange', () => {
  if (!vault.unlocked) return;
  if (document.visibilityState === 'hidden') hiddenAt = Date.now();
  else {
    if (hiddenAt && Date.now() - hiddenAt > lockMinutes() * 60000) return lockNow('Verrouillé après inactivité.');
    vault.sync();
  }
});
addEventListener('online', () => vault.unlocked && vault.sync());
addEventListener('offline', () => vault.unlocked && vault.setStatus('offline'));

vault.on((kind) => {
  if (!vault.unlocked) return;
  if (kind === 'status') renderSync();
  if (kind === 'data') { renderView(); renderSheet(); }
  if (kind === 'auth-lost') lockNow("La clé d'accès a été changée sur un autre appareil.");
});

// ───────────────────────── Coquille ─────────────────────────
function renderShell() {
  const navBtn = ([id, label, ic]) => html`<button class="navbtn" data-action="go" data-to="${id}">${icon(ic)}<span>${label}</span></button>`;
  setHtml(appEl, html`
    <nav class="sidenav" aria-label="Navigation">
      <div class="brand"><span class="brand-mark">${icon('building')}</span><span>Ares Invest<small>Gestion locataires</small></span></div>
      ${NAV.map(navBtn)}
      <div class="spacer"></div>
      <button class="navbtn" data-action="lock">${icon('lock')}<span>Verrouiller</span></button>
    </nav>
    <div>
      <header class="topbar">
        <div class="brand"><span class="brand-mark">${icon('building')}</span><span>Ares Invest</span></div>
        <button class="sync" id="sync" data-action="sync-now" data-s="idle"><i></i><span>…</span></button>
        <button class="btn icon ghost" data-action="lock" aria-label="Verrouiller" title="Verrouiller">${icon('lock')}</button>
      </header>
      <main class="main" id="view"></main>
    </div>
    <nav class="bottomnav" aria-label="Navigation">${NAV.filter(([id]) => MOBILE_NAV.includes(id)).map(([id, label, ic]) => navBtn([id, id === 'reglages' ? 'Plus' : label, ic]))}</nav>
    <button class="fab" id="fab" data-action="fab" aria-label="Ajouter" hidden>${icon('plus')}</button>
  `);
  renderSync();
}

function renderSync() {
  const el = $('#sync');
  if (!el) return;
  const labels = { idle: '…', pending: 'Enregistrement…', syncing: 'Synchronisation…', synced: 'Synchronisé', offline: 'Hors ligne', error: 'Erreur de synchro' };
  el.dataset.s = vault.status;
  el.title = vault.statusMsg || (vault.lastSync ? 'Dernière synchro : ' + fmtDateTime(vault.lastSync) : '');
  el.querySelector('span').textContent = labels[vault.status] || '';
  if (ui.route === 'reglages') renderView();
}

function go(route, replace) {
  if (!VIEWS[route]) route = 'dashboard';
  ui.route = route;
  const url = '#/' + route;
  if (replace) history.replaceState(null, '', url); else if (location.hash !== url) history.pushState(null, '', url);
  document.querySelectorAll('.navbtn[data-to]').forEach((b) => (b.dataset.to === route ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current')));
  const fab = $('#fab');
  if (fab) fab.hidden = !['immeubles', 'locataires'].includes(route);
  renderView();
  scrollTo(0, 0);
}
addEventListener('popstate', () => vault.unlocked && go(location.hash.slice(2) || 'dashboard', true));

function renderView() {
  const view = $('#view');
  if (!view || !vault.unlocked) return;
  const active = document.activeElement;
  const keepSearch = active && active.name === 'search' ? active.selectionStart : null;
  setHtml(view, VIEWS[ui.route]());
  if (keepSearch != null) {
    const s = view.querySelector('[name=search]');
    if (s) { s.focus(); s.setSelectionRange(keepSearch, keepSearch); }
  }
}

const pageHead = (title, sub, actions = '') => html`<div class="page-head"><div><h1>${title}</h1>${sub ? html`<p>${sub}</p>` : ''}</div>${actions}</div>`;
const empty = (ic, text, action) => html`<div class="empty card">${icon(ic)}<p>${text}</p>${action ? html`<div style="margin-top:14px">${action}</div>` : ''}</div>`;

// ───────────────────────── Vues ─────────────────────────
const VIEWS = {
  dashboard() {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const locs = vault.list('locataires').sort(byName);
    const due = locs.filter((l) => isDue(l, y, m));
    const expected = due.reduce((a, l) => a + (l.loyer || 0), 0);
    const received = locs.reduce((a, l) => { const p = payment(l.id, y, m); return a + (p ? paidAmount(p, l) : 0); }, 0);
    const todo = due.filter((l) => !payment(l.id, y, m));
    const late = locs.map((l) => ({ l, months: lateMonths(l, now) })).filter((x) => x.months.length >= 1).sort((a, b) => b.months.length - a.months.length);
    const expiring = locs.map((l) => ({ l, d: daysToEnd(l) })).filter((x) => x.d != null && x.d >= 0 && x.d <= 60).sort((a, b) => a.d - b.d);
    const imms = vault.list('immeubles').sort(byAddr);
    const p = pct(received, expected);

    if (!imms.length && !locs.length) {
      return html`${pageHead('Bienvenue', 'Commencez par ajouter un immeuble, puis ses locataires.')}
        ${empty('building', 'Aucun immeuble pour le moment.', html`<button class="btn primary" data-action="new-imm">${icon('plus')} Ajouter un immeuble</button>`)}`;
    }

    return html`
      ${pageHead(MONTHS_FULL[m - 1] + ' ' + y, `${locs.length} locataire${locs.length > 1 ? 's' : ''} · ${imms.length} immeuble${imms.length > 1 ? 's' : ''}`)}
      <div class="metrics">
        <div class="metric hero">
          <div class="lbl">Encaissé ce mois</div>
          <div class="val">${money(received)} <span class="muted" style="font-size:16px;font-weight:550">/ ${money(expected)}</span></div>
          <div class="progress ${level(p)}" style="margin-top:10px"><i style="width:${Math.min(p, 100)}%"></i></div>
          <div class="sub">${p}% · ${todo.length} loyer${todo.length > 1 ? 's' : ''} à encaisser</div>
        </div>
        <div class="metric"><div class="lbl">Retards</div><div class="val ${late.length ? 'red' : 'green'}">${late.length}</div><div class="sub">locataires</div></div>
        <div class="metric"><div class="lbl">Fins de contrat</div><div class="val ${expiring.length ? 'amber' : ''}">${expiring.length}</div><div class="sub">sous 60 jours</div></div>
        <div class="metric"><div class="lbl">Revenu mensuel</div><div class="val">${money(due.reduce((a, l) => a + (l.loyer || 0), 0))}</div><div class="sub">loyers en cours</div></div>
        <div class="metric"><div class="lbl">Dépenses ${y}</div><div class="val">${money(depensesOf('', y).reduce((a, d) => a + d.montant, 0))}</div><div class="sub">tous immeubles</div></div>
      </div>

      ${late.length || expiring.length ? html`<div class="section-label">À surveiller</div><div class="stack">
        ${late.slice(0, 6).map(({ l, months }) => html`<button class="alert ${months.length >= 2 ? 'bad' : 'warn'}" style="width:100%;border:0;font:inherit;text-align:left;cursor:pointer" data-action="open-loc" data-id="${l.id}">
          ${icon('alert')}<div><b>${fullName(l)}</b> — ${months.length} mois impayé${months.length > 1 ? 's' : ''} (${months.map((x) => MONTHS[x - 1]).join(', ')})</div></button>`)}
        ${expiring.map(({ l, d }) => html`<button class="alert warn" style="width:100%;border:0;font:inherit;text-align:left;cursor:pointer" data-action="open-loc" data-id="${l.id}">
          ${icon('calendar')}<div><b>${fullName(l)}</b> — fin de contrat ${d === 0 ? "aujourd'hui" : `dans ${d} jour${d > 1 ? 's' : ''}`} (${fmtDate(l.fin)})</div></button>`)}
      </div>` : ''}

      <div class="section-label">À encaisser — ${MONTHS_FULL[m - 1]}</div>
      ${todo.length ? html`<div class="list">${todo.map((l) => html`
        <div class="row">
          <button class="avatar" style="border:0;cursor:pointer" data-action="open-loc" data-id="${l.id}">${initials(l)}</button>
          <div class="grow"><div class="title">${fullName(l)}</div><div class="meta">${immName(l.immId)}</div></div>
          <div class="amount">${money(l.loyer)}</div>
          <button class="btn sm primary" data-action="pay" data-loc="${l.id}" data-y="${y}" data-m="${m}">${icon('check')} Payé</button>
        </div>`)}</div>` : html`<div class="alert info" style="background:var(--green-soft);color:var(--green)">${icon('check')}<div>Tous les loyers de ${MONTHS_FULL[m - 1].toLowerCase()} sont encaissés.</div></div>`}

      <div class="section-label">Immeubles</div>
      <div class="grid cols-auto">${imms.map((im) => {
        const ls = locs.filter((l) => l.immId === im.id);
        const exp = ls.filter((l) => isDue(l, y, m)).reduce((a, l) => a + (l.loyer || 0), 0);
        const rec = ls.reduce((a, l) => { const pp = payment(l.id, y, m); return a + (pp ? paidAmount(pp, l) : 0); }, 0);
        const pp = pct(rec, exp);
        return html`<button class="card" style="text-align:left;font:inherit;color:inherit;cursor:pointer;width:100%" data-action="imm-pay" data-id="${im.id}">
          <div class="card-title"><h3>${im.adresse}</h3><span class="badge ${pp >= 100 ? 'ok' : pp >= 50 ? 'warn' : 'bad'}">${pp}%</span></div>
          <div class="progress ${level(pp)}"><i style="width:${Math.min(pp, 100)}%"></i></div>
          <div class="pay-foot"><span>${ls.length} locataire${ls.length > 1 ? 's' : ''}</span><span class="num">${money(rec)} / ${money(exp)}</span></div>
        </button>`;
      })}</div>`;
  },

  immeubles() {
    const y = new Date().getFullYear();
    const imms = vault.list('immeubles').sort(byAddr);
    return html`
      ${pageHead('Immeubles', imms.length + ' immeuble' + (imms.length > 1 ? 's' : ''), html`<button class="btn primary desk-only" data-action="new-imm">${icon('plus')} Ajouter</button>`)}
      ${imms.length ? html`<div class="grid cols-auto">${imms.map((im) => {
        const ls = vault.list('locataires').filter((l) => l.immId === im.id);
        const deps = depensesOf(im.id, y).reduce((a, d) => a + d.montant, 0);
        const st = ls.reduce((a, l) => { const s = yearStats(l, y); a.due += s.due; a.paid += s.paid; return a; }, { due: 0, paid: 0 });
        return html`<div class="card">
          <div class="card-title"><h3>${im.adresse}</h3><button class="btn icon ghost sm" data-action="edit-imm" data-id="${im.id}" aria-label="Modifier">${icon('edit')}</button></div>
          <dl class="kv small">
            <dt>Loyer de base</dt><dd class="num">${money(im.loyer)}</dd>
            <dt>Charges</dt><dd class="num">${money(im.charges)}</dd>
            <dt>Locataires</dt><dd>${ls.length}</dd>
            <dt>Encaissé ${y}</dt><dd class="num green">${money(st.paid)} <span class="muted">/ ${money(st.due)}</span></dd>
            <dt>Dépenses ${y}</dt><dd class="num ${deps ? 'red' : ''}">${deps ? '−' + money(deps) : money(0)}</dd>
            <dt>Net ${y}</dt><dd class="num accent">${money(st.paid - deps)}</dd>
          </dl>
          ${im.note ? html`<div class="note" style="margin-top:12px">${im.note}</div>` : ''}
          <div class="actions" style="margin:14px 0 0">
            <button class="btn sm" data-action="imm-locs" data-id="${im.id}">${icon('users')} Locataires</button>
            <button class="btn sm" data-action="open-deps" data-id="${im.id}">${icon('receipt')} Dépenses</button>
          </div>
        </div>`;
      })}</div>` : empty('building', 'Aucun immeuble enregistré.', html`<button class="btn primary" data-action="new-imm">${icon('plus')} Ajouter un immeuble</button>`)}`;
  },

  locataires() {
    const y = new Date().getFullYear();
    const q = ui.search.trim().toLowerCase();
    const imms = vault.list('immeubles').sort(byAddr);
    let locs = vault.list('locataires').sort(byName);
    if (ui.immFilter) locs = locs.filter((l) => l.immId === ui.immFilter);
    if (q) locs = locs.filter((l) => [l.nom, l.prenom, l.tel, l.mail, immName(l.immId)].join(' ').toLowerCase().includes(q));
    const groups = imms.map((im) => ({ im, ls: locs.filter((l) => l.immId === im.id) })).filter((g) => g.ls.length);
    const orphans = locs.filter((l) => !vault.get('immeubles', l.immId));
    if (orphans.length) groups.push({ im: { adresse: 'Sans immeuble' }, ls: orphans });
    return html`
      ${pageHead('Locataires', vault.list('locataires').length + ' au total', html`<button class="btn primary desk-only" data-action="new-loc">${icon('plus')} Ajouter</button>`)}
      <div class="search">${icon('search')}<input type="search" name="search" placeholder="Rechercher un nom, un téléphone…" value="${ui.search}" data-input="search" autocomplete="off"></div>
      ${imms.length > 1 ? html`<div class="chips" style="margin-bottom:14px">
        <button class="chip" data-action="imm-filter" data-id="" aria-pressed="${!ui.immFilter}">Tous</button>
        ${imms.map((im) => html`<button class="chip" data-action="imm-filter" data-id="${im.id}" aria-pressed="${ui.immFilter === im.id}">${im.adresse}</button>`)}
      </div>` : ''}
      ${groups.length ? groups.map(({ im, ls }) => html`
        <div class="section-label">${im.adresse}</div>
        <div class="list">${ls.map((l) => {
          const late = lateMonths(l).length;
          const d = daysToEnd(l);
          return html`<button class="row" data-action="open-loc" data-id="${l.id}">
            <span class="avatar">${initials(l)}</span>
            <span class="grow">
              <span class="title" style="display:block">${fullName(l)}</span>
              <span class="meta" style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
                ${l.type === 'sous' ? html`<span class="badge">Sous-loc.</span>` : ''}
                ${late ? html`<span class="badge ${late >= 2 ? 'bad' : 'warn'}">${late} mois de retard</span>` : ''}
                ${d != null && d >= 0 && d <= 60 ? html`<span class="badge warn">Fin ${fmtDate(l.fin)}</span>` : ''}
                ${d != null && d < 0 ? html`<span class="badge">Contrat terminé</span>` : ''}
                ${!late && !(d != null && d <= 60) && l.tel ? l.tel : ''}
              </span>
            </span>
            <span class="amount">${money(l.loyer)}</span>
          </button>`;
        })}</div>`) : empty('users', q || ui.immFilter ? 'Aucun résultat.' : 'Aucun locataire enregistré.', !q && !ui.immFilter ? html`<button class="btn primary" data-action="new-loc">${icon('plus')} Ajouter un locataire</button>` : '')}`;
  },

  paiements() {
    const y = ui.year;
    const now = new Date();
    const cy = now.getFullYear(), cm = now.getMonth() + 1;
    let imms = vault.list('immeubles').sort(byAddr);
    const all = imms;
    if (ui.immFilter) imms = imms.filter((im) => im.id === ui.immFilter);
    let gDue = 0, gPaid = 0;
    const cards = imms.map((im) => {
      const ls = vault.list('locataires').filter((l) => l.immId === im.id).sort(byName);
      if (!ls.length) return '';
      let due = 0, paid = 0;
      const rows = ls.map((l) => {
        const s = yearStats(l, y);
        due += s.due; paid += s.paid;
        return html`<div class="pay-tenant">
          <div class="pay-head"><button class="name" style="background:none;border:0;font:inherit;font-weight:650;color:inherit;cursor:pointer;padding:0" data-action="open-loc" data-id="${l.id}">${fullName(l)}</button><span class="muted small num">${money(l.loyer)}/mois</span>${l.type === 'sous' ? html`<span class="badge">Sous-loc.</span>` : ''}</div>
          <div class="months">${MONTHS.map((mn, i) => {
            const m = i + 1;
            const p = payment(l.id, y, m);
            const dueM = isDue(l, y, m);
            const past = ym(y, m) < ym(cy, cm);
            const cls = p ? 'paid' : !dueM ? 'off' : past ? 'late' : '';
            return html`<button class="mcell ${cls} ${y === cy && m === cm ? 'now' : ''}" data-action="toggle-pay" data-loc="${l.id}" data-y="${y}" data-m="${m}" aria-label="${MONTHS_FULL[i]} ${y} : ${p ? 'payé' : 'non payé'}">${mn}<small>${p ? '✓' : dueM ? (past ? '!' : '·') : '–'}</small></button>`;
          })}</div>
          <div class="pay-foot"><span>Payé <b class="green num">${money(s.paid)}</b></span><span>Reste <b class="num ${s.due - s.paid > 0 ? 'red' : 'green'}">${money(Math.max(s.due - s.paid, 0))}</b></span></div>
        </div>`;
      });
      gDue += due; gPaid += paid;
      return html`<div class="card"><div class="card-title"><h3>${im.adresse}</h3><span class="badge ${level(pct(paid, due)) || 'ok'}">${pct(paid, due)}%</span></div>${rows}
        <div class="totals"><span>Attendu <b>${money(due)}</b></span><span>Reçu <b class="green">${money(paid)}</b></span><span>Reste <b class="${due - paid > 0 ? 'red' : 'green'}">${money(Math.max(due - paid, 0))}</b></span></div></div>`;
    }).filter(Boolean);
    return html`
      ${pageHead('Paiements', 'Touchez un mois pour enregistrer ou annuler un paiement.')}
      <div class="toolbar">
        <select data-input="year" aria-label="Année">${[cy - 3, cy - 2, cy - 1, cy, cy + 1].map((yy) => html`<option value="${yy}" ${yy === y ? new Raw('selected') : ''}>${yy}</option>`)}</select>
        ${all.length > 1 ? html`<div class="chips" style="flex:1;min-width:0">
          <button class="chip" data-action="imm-filter" data-id="" aria-pressed="${!ui.immFilter}">Tous</button>
          ${all.map((im) => html`<button class="chip" data-action="imm-filter" data-id="${im.id}" aria-pressed="${ui.immFilter === im.id}">${im.adresse}</button>`)}
        </div>` : ''}
      </div>
      ${cards.length ? html`<div class="stack">${cards}</div>
        <div class="card" style="margin-top:12px;border-color:var(--accent)"><div class="card-title" style="margin:0"><h3>Total ${y}</h3></div>
        <div class="totals" style="background:none;padding:8px 0 0;margin:0"><span>Attendu <b>${money(gDue)}</b></span><span>Reçu <b class="green">${money(gPaid)}</b></span><span>Reste <b class="${gDue - gPaid > 0 ? 'red' : 'green'}">${money(Math.max(gDue - gPaid, 0))}</b></span><span>Taux <b>${pct(gPaid, gDue)}%</b></span></div></div>`
        : empty('wallet', 'Aucun locataire à afficher.')}`;
  },

  stats() {
    const y = ui.year;
    const cy = new Date().getFullYear();
    const locs = vault.list('locataires');
    const imms = vault.list('immeubles').sort(byAddr);
    const monthly = MONTHS.map((_, i) => {
      const m = i + 1;
      let due = 0, paid = 0;
      for (const l of locs) {
        if (isDue(l, y, m)) due += l.loyer || 0;
        const p = payment(l.id, y, m);
        if (p) paid += paidAmount(p, l);
      }
      return { due, paid };
    });
    const due = monthly.reduce((a, x) => a + x.due, 0);
    const paid = monthly.reduce((a, x) => a + x.paid, 0);
    const deps = depensesOf('', y);
    const depTotal = deps.reduce((a, d) => a + d.montant, 0);
    const max = Math.max(1, ...monthly.map((x) => Math.max(x.due, x.paid)));
    const cats = { reparation: 'Réparations', assurance: 'Assurance', taxe: 'Taxes / impôts', entretien: 'Entretien', autre: 'Autre' };
    const byCat = Object.entries(cats).map(([k, label]) => ({ label, total: deps.filter((d) => d.cat === k).reduce((a, d) => a + d.montant, 0) })).filter((x) => x.total);
    const hist = Object.values(vault.state.historique).filter((h) => !h.del).sort((a, b) => b.t - a.t);
    return html`
      ${pageHead('Statistiques', 'Vue financière annuelle', html`<select data-input="year" style="width:auto" aria-label="Année">${[cy - 3, cy - 2, cy - 1, cy, cy + 1].map((yy) => html`<option value="${yy}" ${yy === y ? new Raw('selected') : ''}>${yy}</option>`)}</select>`)}
      <div class="metrics">
        <div class="metric"><div class="lbl">Attendu</div><div class="val">${money(due)}</div></div>
        <div class="metric"><div class="lbl">Encaissé</div><div class="val green">${money(paid)}</div><div class="sub">${pct(paid, due)}% du total</div></div>
        <div class="metric"><div class="lbl">Manquant</div><div class="val ${due - paid > 0 ? 'red' : ''}">${money(Math.max(due - paid, 0))}</div></div>
        <div class="metric"><div class="lbl">Dépenses</div><div class="val">${money(depTotal)}</div></div>
        <div class="metric hero"><div class="lbl">Revenu net ${y}</div><div class="val accent">${money(paid - depTotal)}</div><div class="sub">encaissé − dépenses</div></div>
      </div>
      <div class="section-label">Encaissement mensuel</div>
      <div class="card">
        <div class="bars">${monthly.map((x, i) => html`<div class="bar" title="${MONTHS_FULL[i]} : ${money(x.paid)} / ${money(x.due)}">
          <div class="track"><div class="fill ${x.due && x.paid >= x.due ? 'full' : ''}" style="height:${(x.paid / max) * 100}%"></div></div><small>${MONTHS[i][0]}</small></div>`)}</div>
      </div>
      <div class="section-label">Par immeuble</div>
      <div class="card scroll-x" style="padding:6px 6px">
        <table class="tbl"><thead><tr><th>Immeuble</th><th class="r">Encaissé</th><th class="r">Dépenses</th><th class="r">Net</th><th class="r">Taux</th></tr></thead><tbody>
        ${imms.map((im) => {
          const ls = locs.filter((l) => l.immId === im.id);
          const st = ls.reduce((a, l) => { const s = yearStats(l, y); a.due += s.due; a.paid += s.paid; return a; }, { due: 0, paid: 0 });
          const dp = depensesOf(im.id, y).reduce((a, d) => a + d.montant, 0);
          return html`<tr><td>${im.adresse}</td><td class="r green">${money(st.paid)}</td><td class="r">${dp ? '−' + money(dp) : '—'}</td><td class="r accent">${money(st.paid - dp)}</td><td class="r">${pct(st.paid, st.due)}%</td></tr>`;
        })}</tbody></table>
      </div>
      ${byCat.length ? html`<div class="section-label">Dépenses par catégorie</div><div class="list">${byCat.map((c) => html`<div class="row"><span class="grow">${c.label}</span><span class="amount">${money(c.total)}</span></div>`)}</div>` : ''}
      <div class="section-label">Historique des modifications</div>
      ${hist.length ? html`<div class="list">${hist.slice(0, ui.histShown).map((h) => html`<div class="row"><span class="grow"><span class="title" style="display:block;white-space:normal">${h.action}</span><span class="meta" style="white-space:normal">${h.detail}</span></span><span class="tiny muted" style="white-space:nowrap">${fmtDateTime(h.t)}</span></div>`)}</div>
        ${hist.length > ui.histShown ? html`<button class="btn block" style="margin-top:10px" data-action="more-hist">Afficher plus (${hist.length - ui.histShown})</button>` : ''}` : html`<p class="muted small">Aucune modification enregistrée.</p>`}`;
  },

  reglages() {
    const labels = { idle: 'En attente', pending: 'Modifications en cours d’envoi…', syncing: 'Synchronisation en cours…', synced: 'Tout est synchronisé', offline: "Hors ligne — les modifications sont enregistrées sur l'appareil", error: 'Erreur : ' + (vault.statusMsg || 'réessai automatique') };
    const theme = localStorage.getItem('aresTheme') || 'auto';
    const legacy = legacyLocal();
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    return html`
      ${pageHead('Réglages', 'Sécurité, synchronisation et données')}
      <div class="section-label">Synchronisation</div>
      <div class="list settings">
        <div class="row"><span class="grow"><span class="title" style="display:block">${labels[vault.status]}</span><span class="meta">${vault.lastSync ? 'Dernière synchro : ' + fmtDateTime(vault.lastSync) : 'Pas encore synchronisé'}</span></span>
          <button class="btn sm" data-action="sync-now">${icon('sync')} Synchroniser</button></div>
        <button class="row" data-action="go" data-to="stats">${icon('chart')}<span class="grow title">Statistiques et historique</span></button>
      </div>

      ${!standalone ? html`<div class="section-label">Application</div>
      <div class="list settings"><div class="row">${icon('phoneApp')}<span class="grow"><span class="title" style="display:block">Installer sur ce téléphone</span>
        <span class="meta" style="white-space:normal">${isIOS ? 'Safari : bouton Partager → « Sur l’écran d’accueil ».' : 'Ajoute l’icône Ares sur l’écran d’accueil, fonctionne hors ligne.'}</span></span>
        ${installPrompt ? html`<button class="btn sm primary" data-action="install">Installer</button>` : ''}</div></div>` : ''}

      <div class="section-label">Sécurité</div>
      <div class="list settings">
        <div class="row">${icon('lock')}<span class="grow title">Verrouillage automatique</span>
          <select data-input="lockmin" style="width:auto">${[5, 15, 30, 60].map((n) => html`<option value="${n}" ${lockMinutes() === n ? new Raw('selected') : ''}>${n} min</option>`)}</select></div>
        <button class="row" data-action="change-key">${icon('key')}<span class="grow"><span class="title" style="display:block">Changer la clé d'accès</span><span class="meta">Les autres appareils devront utiliser la nouvelle clé</span></span></button>
        <button class="row" data-action="lock">${icon('lock')}<span class="grow title">Verrouiller maintenant</span></button>
        <button class="row" data-action="forget">${icon('trash')}<span class="grow"><span class="title red" style="display:block">Oublier cet appareil</span><span class="meta">Efface la copie chiffrée locale (les données restent sur le serveur)</span></span></button>
      </div>

      <div class="section-label">Données</div>
      <div class="list settings">
        <button class="row" data-action="export-enc">${icon('shield')}<span class="grow"><span class="title" style="display:block">Sauvegarde chiffrée</span><span class="meta">Fichier .ares, lisible uniquement avec la clé</span></span></button>
        <button class="row" data-action="export-json">${icon('download')}<span class="grow"><span class="title" style="display:block">Export lisible (JSON)</span><span class="meta">Non chiffré — à conserver en lieu sûr</span></span></button>
        <button class="row" data-action="import">${icon('upload')}<span class="grow"><span class="title" style="display:block">Importer</span><span class="meta">Sauvegarde .ares ou export JSON (ancienne version incluse)</span></span></button>
        <button class="row" data-action="print">${icon('file')}<span class="grow title">Imprimer la page Paiements</span></button>
      </div>
      <input type="file" id="importFile" accept=".json,.ares,application/json" hidden>

      ${legacy ? html`<div class="section-label">Ancienne version</div>
      <div class="alert warn" style="margin-bottom:10px">${icon('alert')}<div>Une copie <b>non chiffrée</b> de l'ancienne version est encore présente dans ce navigateur (${legacy.immeubles.length} immeubles, ${legacy.locataires.length} locataires).</div></div>
      <div class="actions"><button class="btn" data-action="legacy-import">Importer</button><button class="btn danger" data-action="legacy-wipe">Effacer la copie</button></div>` : ''}

      <div class="section-label">Apparence</div>
      <div class="chips">${[['auto', 'Automatique'], ['light', 'Clair'], ['dark', 'Sombre']].map(([k, l]) => html`<button class="chip" data-action="theme" data-id="${k}" aria-pressed="${theme === k}">${l}</button>`)}</div>
      <p class="tiny muted" style="margin-top:28px;text-align:center">Ares Invest · v${VERSION} · données chiffrées AES-256-GCM de bout en bout</p>`;
  },
};

// ───────────────────────── Feuilles (détails & formulaires) ─────────────────────────
const sheetEl = $('#sheet');
function openSheet(kind, id, tab) {
  ui.sheet = { kind, id, tab: tab || null };
  renderSheet();
  if (!sheetEl.open) sheetEl.showModal();
}
function closeSheet() {
  ui.sheet = null;
  if (sheetEl.open) sheetEl.close();
}
sheetEl.addEventListener('close', () => (ui.sheet = null));
sheetEl.addEventListener('click', (e) => { if (e.target === sheetEl) closeSheet(); });

function renderSheet() {
  if (!ui.sheet || (!sheetEl.open && ui.sheet.rendered)) return;
  const s = ui.sheet;
  const r = SHEETS[s.kind](s);
  if (!r) return closeSheet();
  // Ne pas écraser une saisie en cours lors d'une mise à jour en arrière-plan.
  const focused = document.activeElement;
  if (s.rendered && (s.kind.endsWith('-form') || (sheetEl.contains(focused) && focused.matches('input, textarea, select')))) return;
  sheetEl.className = 'sheet' + (r.narrow ? ' narrow' : '');
  setHtml(sheetEl, html`
    <div class="sheet-head"><h2>${r.title}</h2><button class="btn icon ghost" data-action="close-sheet" aria-label="Fermer">${icon('x')}</button></div>
    <div class="sheet-body">${r.body}</div>
    ${r.foot ? html`<div class="sheet-foot">${r.foot}</div>` : ''}`);
  s.rendered = true;
}

const field = (label, name, value, opts = {}) => html`<label class="field ${opts.full ? 'full' : ''}">${label}
  <input name="${name}" type="${opts.type || 'text'}" value="${value ?? ''}" ${opts.required ? new Raw('required') : ''} ${opts.attrs ? new Raw(opts.attrs) : ''} placeholder="${opts.placeholder || ''}"></label>`;

const SHEETS = {
  'imm-form'({ id }) {
    const im = id ? vault.get('immeubles', id) : {};
    if (id && !im) return null;
    return {
      title: id ? "Modifier l'immeuble" : 'Nouvel immeuble',
      body: html`<form id="f" data-form="imm" class="fields">
        <input type="hidden" name="id" value="${id || ''}">
        ${field('Adresse complète', 'adresse', im.adresse, { full: true, required: true, placeholder: 'ex. 34, rue Josy Haendel' })}
        ${field('Loyer de base (€)', 'loyer', im.loyer, { type: 'number', attrs: 'inputmode="decimal" step="0.01" min="0"' })}
        ${field('Charges (€)', 'charges', im.charges, { type: 'number', attrs: 'inputmode="decimal" step="0.01" min="0"' })}
        <label class="field full">Notes<textarea name="note" placeholder="Travaux, assurance, syndic…">${im.note || ''}</textarea></label>
      </form>`,
      foot: html`${id ? html`<button class="btn ghost danger" data-action="del-imm" data-id="${id}">${icon('trash')}</button>` : ''}
        <button class="btn" data-action="close-sheet">Annuler</button><button class="btn primary" type="submit" form="f">Enregistrer</button>`,
    };
  },

  'loc-form'({ id, preset }) {
    const l = id ? vault.get('locataires', id) : { immId: ui.immFilter || '', type: 'principal', debut: today() };
    if (id && !l) return null;
    const imms = vault.list('immeubles').sort(byAddr);
    if (!imms.length) return { title: 'Nouveau locataire', body: empty('building', "Ajoutez d'abord un immeuble.", html`<button class="btn primary" data-action="new-imm">${icon('plus')} Ajouter un immeuble</button>`) };
    return {
      title: id ? 'Modifier le locataire' : 'Nouveau locataire',
      body: html`<form id="f" data-form="loc" class="fields">
        <input type="hidden" name="id" value="${id || ''}">
        ${field('Prénom', 'prenom', l.prenom, { attrs: 'autocomplete="off"' })}
        ${field('Nom', 'nom', l.nom, { required: true, attrs: 'autocomplete="off"' })}
        <label class="field full">Immeuble<select name="immId" required><option value="">— Choisir —</option>${imms.map((im) => html`<option value="${im.id}" ${im.id === l.immId ? new Raw('selected') : ''}>${im.adresse}</option>`)}</select></label>
        ${field('Loyer mensuel (€)', 'loyer', l.loyer, { type: 'number', required: true, attrs: 'inputmode="decimal" step="0.01" min="0"' })}
        <label class="field">Type<select name="type"><option value="principal">Principal</option><option value="sous" ${l.type === 'sous' ? new Raw('selected') : ''}>Sous-locataire</option></select></label>
        ${field('Téléphone', 'tel', l.tel, { type: 'tel', placeholder: '+352 …', attrs: 'autocomplete="off"' })}
        ${field('Email', 'mail', l.mail, { type: 'email', attrs: 'autocomplete="off"' })}
        ${field('Caution (€)', 'caution', l.caution, { type: 'number', attrs: 'inputmode="decimal" step="0.01" min="0"' })}
        ${field('Note caution', 'cautionNote', l.cautionNote)}
        ${field('Début du contrat', 'debut', l.debut, { type: 'date' })}
        ${field('Fin du contrat', 'fin', l.fin, { type: 'date' })}
      </form>`,
      foot: html`<button class="btn" data-action="close-sheet">Annuler</button><button class="btn primary" type="submit" form="f">Enregistrer</button>`,
    };
  },

  loc({ id, tab }) {
    const l = vault.get('locataires', id);
    if (!l) return null;
    tab = tab || 'infos';
    const y = new Date().getFullYear();
    const tabs = [['infos', 'Infos'], ['pay', 'Loyers'], ['docs', 'Docs'], ['notes', 'Notes'], ['hist', 'Journal']];
    const docs = vault.list('documents').filter((d) => d.locId === id).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const late = lateMonths(l);
    const d = daysToEnd(l);
    let body;
    if (tab === 'infos') {
      const tel = (l.tel || '').replace(/[^\d+]/g, '');
      body = html`
        <div class="actions">
          ${tel ? html`<a class="btn" href="tel:${tel}">${icon('phone')} Appeler</a><a class="btn" href="sms:${tel}">${icon('msg')} SMS</a>` : ''}
          ${l.mail ? html`<a class="btn" href="mailto:${l.mail}">${icon('mail')} Email</a>` : ''}
        </div>
        ${late.length ? html`<div class="alert ${late.length >= 2 ? 'bad' : 'warn'}" style="margin-bottom:14px">${icon('alert')}<div>${late.length} mois impayé${late.length > 1 ? 's' : ''} : ${late.map((m) => MONTHS_FULL[m - 1]).join(', ')}</div></div>` : ''}
        <dl class="kv">
          <dt>Immeuble</dt><dd>${immName(l.immId)}</dd>
          <dt>Loyer</dt><dd class="num">${money(l.loyer)} / mois</dd>
          <dt>Type</dt><dd>${l.type === 'sous' ? 'Sous-locataire' : 'Principal'}</dd>
          <dt>Téléphone</dt><dd>${l.tel || '—'}</dd>
          <dt>Email</dt><dd>${l.mail || '—'}</dd>
          <dt>Caution</dt><dd class="num">${l.caution ? money(l.caution) : '—'}${l.cautionNote ? html`<div class="tiny muted">${l.cautionNote}</div>` : ''}</dd>
          <dt>Contrat</dt><dd>${l.debut ? fmtDate(l.debut) : '?'} → ${l.fin ? fmtDate(l.fin) : 'indéterminé'}${d != null && d >= 0 && d <= 60 ? html`<div class="tiny amber">fin dans ${d} jours</div>` : ''}</dd>
          <dt>Encaissé ${y}</dt><dd class="num green">${money(yearStats(l, y).paid)}</dd>
        </dl>`;
    } else if (tab === 'pay') {
      body = html`${[y, y - 1].map((yy) => {
        const s = yearStats(l, yy);
        return html`<div class="section-label" style="margin-top:4px">${yy} · <span class="green">${money(s.paid)}</span> / ${money(s.due)}</div>
          <div class="months" style="grid-template-columns:repeat(6,1fr);margin-bottom:12px">${MONTHS.map((mn, i) => {
            const m = i + 1;
            const p = payment(l.id, yy, m);
            const dueM = isDue(l, yy, m);
            const past = ym(yy, m) < ym(y, new Date().getMonth() + 1);
            return html`<button class="mcell ${p ? 'paid' : !dueM ? 'off' : past ? 'late' : ''}" data-action="toggle-pay" data-loc="${l.id}" data-y="${yy}" data-m="${m}">${mn}<small>${p ? (p.date ? fmtDate(p.date).replace(/ \d{4}$/, '') : '✓') : dueM ? (past ? '!' : '·') : '–'}</small></button>`;
          })}</div>`;
      })}<p class="tiny muted">Touchez un mois pour enregistrer ou annuler le paiement.</p>`;
    } else if (tab === 'docs') {
      body = html`
        <form data-form="doc" class="stack" style="margin-bottom:16px">
          <input type="hidden" name="locId" value="${id}">
          <input name="label" placeholder="Nom du document (ex. Contrat de bail)" required>
          <input name="file" type="file" accept="application/pdf,image/*" required>
          <button class="btn primary block" type="submit">${icon('upload')} Ajouter le document</button>
          <p class="tiny muted">PDF ou photo · 10 Mo maximum · chiffré avant l'envoi.</p>
        </form>
        ${docs.length ? html`<div class="list">${docs.map((doc) => html`<div class="row">${icon('file')}
          <span class="grow"><span class="title" style="display:block">${doc.label}</span><span class="meta">${fmtDate(doc.date)} · ${Math.max(1, Math.round((doc.size || 0) / 1024))} Ko</span></span>
          <button class="btn icon sm" data-action="open-doc" data-id="${doc.id}" aria-label="Ouvrir">${icon('eye')}</button>
          <button class="btn icon sm ghost danger" data-action="del-doc" data-id="${doc.id}" aria-label="Supprimer">${icon('trash')}</button></div>`)}</div>` : html`<p class="muted small">Aucun document.</p>`}`;
    } else if (tab === 'notes') {
      body = html`<form data-form="notes" class="stack"><input type="hidden" name="id" value="${id}">
        <textarea name="notes" style="min-height:220px" placeholder="Problèmes signalés, échanges, réparations demandées…">${l.notes || ''}</textarea>
        <button class="btn primary block" type="submit">Enregistrer les notes</button></form>`;
    } else {
      const name = fullName(l);
      const alt = [l.nom, l.prenom].filter(Boolean).join(' ');
      const hist = Object.values(vault.state.historique).filter((h) => !h.del && (h.ref === id || (!h.ref && (h.detail || '').includes(alt || name)))).sort((a, b) => b.t - a.t).slice(0, 100);
      body = hist.length ? html`<div class="list">${hist.map((h) => html`<div class="row"><span class="grow"><span class="title" style="display:block;white-space:normal">${h.action}</span><span class="meta" style="white-space:normal">${h.detail}</span></span><span class="tiny muted">${fmtDateTime(h.t)}</span></div>`)}</div>` : html`<p class="muted small">Aucun historique.</p>`;
    }
    return {
      title: fullName(l),
      body: html`<div class="tabs" role="tablist">${tabs.map(([k, label]) => html`<button class="tab" role="tab" aria-selected="${tab === k}" data-action="loc-tab" data-id="${k}">${label}</button>`)}</div>${body}`,
      foot: tab === 'infos' ? html`<button class="btn ghost danger" data-action="del-loc" data-id="${id}" aria-label="Supprimer">${icon('trash')}</button><button class="btn primary" data-action="edit-loc" data-id="${id}">${icon('edit')} Modifier</button>` : null,
    };
  },

  deps({ id }) {
    const im = vault.get('immeubles', id);
    if (!im) return null;
    const cats = { reparation: '🔧 Réparation', assurance: '🛡️ Assurance', taxe: '🏛️ Taxe / impôt', entretien: '🧹 Entretien', autre: '📦 Autre' };
    const deps = depensesOf(id).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const total = deps.reduce((a, d) => a + d.montant, 0);
    return {
      title: 'Dépenses — ' + im.adresse,
      body: html`<form data-form="dep" class="fields" style="margin-bottom:16px">
          <input type="hidden" name="immId" value="${id}">
          ${field('Description', 'desc', '', { full: true, required: true, placeholder: 'ex. Réparation toiture' })}
          ${field('Montant (€)', 'montant', '', { type: 'number', required: true, attrs: 'inputmode="decimal" step="0.01" min="0.01"' })}
          ${field('Date', 'date', today(), { type: 'date', required: true })}
          <label class="field full">Catégorie<select name="cat">${Object.entries(cats).map(([k, v]) => html`<option value="${k}">${v}</option>`)}</select></label>
          <button class="btn primary full" type="submit">${icon('plus')} Ajouter la dépense</button>
        </form>
        ${deps.length ? html`<div class="list">${deps.map((d) => html`<div class="row"><span class="grow"><span class="title" style="display:block">${d.desc}</span><span class="meta">${fmtDate(d.date)} · ${cats[d.cat] || d.cat}</span></span>
          <span class="amount red">−${money(d.montant)}</span><button class="btn icon sm ghost danger" data-action="del-dep" data-id="${d.id}" aria-label="Supprimer">${icon('trash')}</button></div>`)}</div>
          <div class="totals"><span>Total</span><b class="red">−${money(total)}</b></div>` : html`<p class="muted small">Aucune dépense.</p>`}`,
    };
  },

  'key-form'() {
    return {
      title: "Changer la clé d'accès",
      narrow: true,
      body: html`<form id="f" data-form="rekey" class="stack">
        <div class="alert warn">${icon('alert')}<div>Tous les appareils devront utiliser la nouvelle clé. Les anciennes sauvegardes .ares restent lisibles avec l'ancienne clé.</div></div>
        <label class="field">Clé actuelle ${pwField('old', 'Clé actuelle', 'current-password')}</label>
        <label class="field">Nouvelle clé ${pwField('pass', 'Au moins 12 caractères', 'new-password')}</label>
        <label class="field">Confirmer ${pwField('pass2', 'Retapez la nouvelle clé', 'new-password')}</label>
        <div class="lock-err" role="alert"></div>
      </form>`,
      foot: html`<button class="btn" data-action="close-sheet">Annuler</button><button class="btn primary" type="submit" form="f">Changer la clé</button>`,
    };
  },
};

// ───────────────────────── Actions ─────────────────────────
function download(name, data, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([data], { type }));
  a.download = name;
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

async function togglePay(locId, y, m) {
  const l = vault.get('locataires', locId);
  if (!l) return;
  const k = payKey(locId, y, m);
  const label = `${fullName(l)} — ${MONTHS_FULL[m - 1]} ${y}`;
  const prev = vault.get('paiements', k);
  if (prev) {
    await vault.mutate((tx) => tx.remove('paiements', k), 'Paiement annulé', label, locId);
    toast('Paiement annulé · ' + MONTHS_FULL[m - 1], { undo: () => vault.mutate((tx) => tx.put('paiements', { ...prev, id: k }), 'Paiement rétabli', label, locId) });
  } else {
    await vault.mutate((tx) => tx.put('paiements', { id: k, locId, y, m, date: today(), montant: l.loyer || 0 }), 'Paiement enregistré', label + ' · ' + money(l.loyer), locId);
    toast('Payé · ' + fullName(l) + ' · ' + money(l.loyer), { undo: () => vault.mutate((tx) => tx.remove('paiements', k), 'Paiement annulé', label, locId) });
  }
}

let installPrompt = null;
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installPrompt = e; if (ui.route === 'reglages') renderView(); });

const ACTIONS = {
  go: (d) => { closeSheet(); go(d.to); },
  lock: () => lockNow(),
  'sync-now': () => vault.sync().then(() => vault.status === 'synced' && toast('Synchronisé')),
  'toggle-pw': (_, el) => {
    const inp = el.parentElement.querySelector('input');
    inp.type = inp.type === 'password' ? 'text' : 'password';
    setHtml(el, icon(inp.type === 'password' ? 'eye' : 'eyeOff'));
  },
  fab: () => (ui.route === 'immeubles' ? openSheet('imm-form') : openSheet('loc-form')),
  'new-imm': () => openSheet('imm-form'),
  'edit-imm': (d) => openSheet('imm-form', d.id),
  'new-loc': () => openSheet('loc-form'),
  'edit-loc': (d) => openSheet('loc-form', d.id),
  'open-loc': (d) => openSheet('loc', d.id),
  'loc-tab': (d) => { ui.sheet.tab = d.id; ui.sheet.rendered = false; renderSheet(); sheetEl.querySelector('.sheet-body').scrollTop = 0; },
  'open-deps': (d) => openSheet('deps', d.id),
  'close-sheet': () => closeSheet(),
  'imm-filter': (d) => { ui.immFilter = d.id; renderView(); },
  'imm-locs': (d) => { ui.immFilter = d.id; go('locataires'); },
  'imm-pay': (d) => { ui.immFilter = d.id; ui.year = new Date().getFullYear(); go('paiements'); },
  'more-hist': () => { ui.histShown += 30; renderView(); },
  pay: (d) => togglePay(d.loc, +d.y, +d.m),
  'toggle-pay': (d) => togglePay(d.loc, +d.y, +d.m),
  theme: (d) => { localStorage.setItem('aresTheme', d.id); applyTheme(); renderView(); },
  'change-key': () => openSheet('key-form'),
  print: () => { go('paiements'); setTimeout(() => print(), 300); },
  install: async () => { if (!installPrompt) return; installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; renderView(); },

  async 'del-imm'(d) {
    const im = vault.get('immeubles', d.id);
    const ls = vault.list('locataires').filter((l) => l.immId === d.id);
    if (!(await confirmBox(`Supprimer « ${im.adresse} » ?`, { ok: 'Supprimer', danger: true, detail: ls.length ? `Ses ${ls.length} locataire(s), leurs paiements et documents seront aussi supprimés.` : '' }))) return;
    const docs = vault.list('documents').filter((doc) => ls.some((l) => l.id === doc.locId));
    await vault.mutate((tx) => {
      tx.remove('immeubles', d.id);
      for (const l of ls) tx.remove('locataires', l.id);
      for (const p of vault.list('paiements')) if (ls.some((l) => l.id === p.locId)) tx.remove('paiements', p.id);
      for (const x of depensesOf(d.id)) tx.remove('depenses', x.id);
      for (const doc of docs) tx.remove('documents', doc.id);
    }, 'Immeuble supprimé', im.adresse, d.id);
    for (const doc of docs) await vault.deleteFile(doc.id);
    closeSheet();
    toast('Immeuble supprimé');
  },
  async 'del-loc'(d) {
    const l = vault.get('locataires', d.id);
    if (!(await confirmBox(`Supprimer ${fullName(l)} ?`, { ok: 'Supprimer', danger: true, detail: 'Ses paiements et documents seront aussi supprimés.' }))) return;
    const docs = vault.list('documents').filter((doc) => doc.locId === d.id);
    await vault.mutate((tx) => {
      tx.remove('locataires', d.id);
      for (const p of vault.list('paiements')) if (p.locId === d.id) tx.remove('paiements', p.id);
      for (const doc of docs) tx.remove('documents', doc.id);
    }, 'Locataire supprimé', fullName(l), d.id);
    for (const doc of docs) await vault.deleteFile(doc.id);
    closeSheet();
    toast('Locataire supprimé');
  },
  async 'del-dep'(d) {
    const dep = vault.get('depenses', d.id);
    if (!(await confirmBox('Supprimer cette dépense ?', { ok: 'Supprimer', danger: true, detail: `${dep.desc} — ${money(dep.montant)}` }))) return;
    await vault.mutate((tx) => tx.remove('depenses', d.id), 'Dépense supprimée', `${dep.desc} ${money(dep.montant)}`, dep.immId);
  },
  async 'open-doc'(d) {
    const doc = vault.get('documents', d.id);
    try {
      toast('Déchiffrement…');
      const bytes = await vault.readFile(d.id);
      const blob = new Blob([bytes], { type: doc.mime || 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const w = open(url, '_blank');
      if (!w) download(doc.label + (doc.mime === 'application/pdf' ? '.pdf' : ''), bytes, doc.mime);
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      toast(e.message || 'Document indisponible', { bad: true });
    }
  },
  async 'del-doc'(d) {
    const doc = vault.get('documents', d.id);
    if (!(await confirmBox(`Supprimer « ${doc.label} » ?`, { ok: 'Supprimer', danger: true }))) return;
    await vault.mutate((tx) => tx.remove('documents', d.id), 'Document supprimé', doc.label, doc.locId);
    await vault.deleteFile(d.id);
  },
  async forget() {
    if (!(await confirmBox('Oublier cet appareil ?', { ok: 'Oublier', danger: true, detail: vault.dirty ? 'Attention : des modifications ne sont pas encore synchronisées et seront perdues.' : 'La copie locale chiffrée sera effacée. Vos données restent sur le serveur.' }))) return;
    await vault.forgetDevice();
    location.reload();
  },
  async 'export-enc'() {
    const backup = await vault.exportEncrypted();
    download(`ares_sauvegarde_${today()}.ares`, JSON.stringify(backup), 'application/octet-stream');
    toast('Sauvegarde chiffrée téléchargée');
  },
  async 'export-json'() {
    if (!(await confirmBox('Exporter en clair ?', { ok: 'Exporter', detail: 'Ce fichier contient toutes les données personnelles des locataires sans chiffrement. Conservez-le en lieu sûr.' }))) return;
    download(`ares_export_${today()}.json`, JSON.stringify(vault.state, null, 2), 'application/json');
  },
  import: () => $('#importFile').click(),
  async 'legacy-import'() {
    const r = await vault.importLegacy(legacyLocal());
    toast(`Import : ${r.immeubles} immeubles, ${r.locataires} locataires, ${r.documents} documents`);
  },
  async 'legacy-wipe'() {
    if (!(await confirmBox("Effacer l'ancienne copie non chiffrée ?", { ok: 'Effacer', danger: true, detail: 'Importez-la avant si ce n’est pas déjà fait. Cette action ne touche pas aux données chiffrées.' }))) return;
    localStorage.removeItem('aresLocData');
    localStorage.removeItem('aresLastBackup');
    renderView();
    toast('Ancienne copie effacée');
  },
};

const FORMS = {
  unlock: onUnlock,
  setup: onSetup,
  async imm(fd) {
    const id = fd.get('id');
    const rec = { adresse: fd.get('adresse').trim(), loyer: num(fd.get('loyer')), charges: num(fd.get('charges')), note: fd.get('note').trim() };
    if (id) rec.id = id;
    const saved = await vault.mutate((tx) => tx.put('immeubles', rec), id ? 'Immeuble modifié' : 'Immeuble ajouté', rec.adresse);
    closeSheet();
    toast(id ? 'Immeuble enregistré' : 'Immeuble ajouté');
    return saved;
  },
  async loc(fd) {
    const id = fd.get('id');
    const rec = {
      nom: fd.get('nom').trim(), prenom: fd.get('prenom').trim(), immId: fd.get('immId'), loyer: num(fd.get('loyer')), type: fd.get('type'),
      tel: fd.get('tel').trim(), mail: fd.get('mail').trim(), caution: num(fd.get('caution')), cautionNote: fd.get('cautionNote').trim(),
      debut: fd.get('debut'), fin: fd.get('fin'),
    };
    if (id) rec.id = id;
    const saved = await vault.mutate((tx) => tx.put('locataires', rec), id ? 'Locataire modifié' : 'Locataire ajouté', [rec.nom, rec.prenom].join(' '), id);
    toast(id ? 'Locataire enregistré' : 'Locataire ajouté');
    openSheet('loc', saved.id);
  },
  async notes(fd) {
    const l = vault.get('locataires', fd.get('id'));
    await vault.mutate((tx) => tx.put('locataires', { id: l.id, notes: fd.get('notes') }), 'Notes modifiées', fullName(l), l.id);
    toast('Notes enregistrées');
  },
  async dep(fd, form) {
    const rec = { immId: fd.get('immId'), desc: fd.get('desc').trim(), montant: num(fd.get('montant')), date: fd.get('date'), cat: fd.get('cat') };
    if (!rec.desc || !rec.montant) return;
    await vault.mutate((tx) => tx.put('depenses', rec), 'Dépense ajoutée', `${rec.desc} ${money(rec.montant)}`, rec.immId);
    form.reset();
    toast('Dépense ajoutée');
  },
  async doc(fd, form) {
    const file = fd.get('file');
    const locId = fd.get('locId');
    if (!file || !file.size) return;
    if (file.size > 10 * 1024 * 1024) return toast('Fichier trop lourd (10 Mo maximum)', { bad: true });
    setBusy(form, true, 'Chiffrement…');
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const l = vault.get('locataires', locId);
      const doc = await vault.mutate((tx) => tx.put('documents', { locId, label: fd.get('label').trim(), date: today(), size: file.size, mime: file.type || 'application/octet-stream' }), 'Document ajouté', `${fd.get('label')} → ${fullName(l)}`, locId);
      await vault.saveFile(doc.id, bytes);
      toast('Document ajouté');
    } catch (e) {
      setBusy(form, false);
      toast(e.message || 'Erreur', { bad: true });
    }
  },
  async rekey(fd, form) {
    const err = form.querySelector('.lock-err');
    const pass = fd.get('pass');
    if (pass.length < 12 || passphraseStrength(pass) < 2) return (err.textContent = 'Nouvelle clé trop faible (12 caractères minimum).');
    if (pass !== fd.get('pass2')) return (err.textContent = 'Les deux nouvelles clés ne correspondent pas.');
    if (!navigator.onLine) return (err.textContent = 'Connexion requise.');
    const btn = sheetEl.querySelector('button[type=submit]');
    btn.disabled = true;
    try {
      if (!(await vault.verifyPassphrase(fd.get('old')))) { btn.disabled = false; return (err.textContent = 'Clé actuelle incorrecte.'); }
      await vault.changePassphrase(pass);
      closeSheet();
      toast("Clé d'accès changée");
    } catch (e) {
      btn.disabled = false;
      err.textContent = e.message || 'Erreur';
    }
  },
};

async function importFile(file) {
  let obj;
  try { obj = JSON.parse(await file.text()); } catch { return toast('Fichier illisible', { bad: true }); }
  try {
    if (obj && obj.format === 'ares-backup') {
      const k = await promptKey('Clé de la sauvegarde', 'Saisissez la clé d’accès utilisée au moment de la sauvegarde.');
      if (!k) return;
      const state = await Vault.openBackup(obj, k);
      if (!(await confirmBox('Fusionner cette sauvegarde ?', { ok: 'Fusionner', detail: 'Les éléments les plus récents sont conservés, rien n’est supprimé.' }))) return;
      await vault.mergeIn(state);
    } else if (isLegacy(obj)) {
      if (!(await confirmBox('Importer ces données ?', { ok: 'Importer', detail: `${obj.immeubles.length} immeubles, ${obj.locataires.length} locataires (ancienne version). Fusion avec les données actuelles.` }))) return;
      await vault.importLegacy(obj);
    } else if (obj && obj.v === 2 && obj.locataires) {
      if (!(await confirmBox('Importer cet export ?', { ok: 'Importer', detail: 'Fusion avec les données actuelles : les éléments les plus récents sont conservés.' }))) return;
      await vault.mergeIn(obj);
    } else return toast('Format non reconnu', { bad: true });
    toast('Import terminé');
  } catch (e) {
    toast(e.message || 'Import impossible', { bad: true });
  }
}

// ───────────────────────── Délégation d'événements ─────────────────────────
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el || !ACTIONS[el.dataset.action]) return;
  e.preventDefault();
  ACTIONS[el.dataset.action](el.dataset, el, e);
});
document.addEventListener('submit', (e) => {
  const f = e.target;
  if (!FORMS[f.dataset.form]) return;
  e.preventDefault();
  FORMS[f.dataset.form](new FormData(f), f);
});
document.addEventListener('input', (e) => {
  const k = e.target.dataset.input;
  if (k === 'search') { ui.search = e.target.value; renderView(); }
});
document.addEventListener('change', (e) => {
  const k = e.target.dataset.input;
  if (k === 'year') { ui.year = +e.target.value; renderView(); }
  if (k === 'lockmin') { localStorage.setItem('aresLockMin', e.target.value); toast('Verrouillage après ' + e.target.value + ' min'); }
  if (e.target.id === 'importFile' && e.target.files[0]) { importFile(e.target.files[0]); e.target.value = ''; }
});

function applyTheme() {
  const t = localStorage.getItem('aresTheme') || 'auto';
  if (t === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.dataset.theme = t;
  const dark = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  $('meta[name=theme-color]').content = dark ? '#0e0e10' : '#f5f4f0';
}

applyTheme();
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('/locataires-sw.js', { scope: '/locataires' }).catch(() => {});
}
boot();
