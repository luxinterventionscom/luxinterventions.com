// Ares Invest — Gestion locataires (interface)
import { Vault, payKey, isLegacy, ApiError, uid } from './store.js';
import { passphraseStrength } from './crypto.js';

const VERSION = '2.3.0';
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
const isoDate = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const today = () => isoDate(new Date());
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const level = (p) => (p >= 80 ? '' : p >= 50 ? 'warn' : 'bad');

// ───────────────────────── Règles métier ─────────────────────────
// Immeuble ─┬─ Logement (appartement, studio, chambre…) ── Locataires successifs (jamais effacés : `sortie` = date de départ)
//           ├─ Versements au propriétaire principal (loyer du bail principal, mois par mois)
//           └─ Dépenses (réparations…), rattachées à l'immeuble ou à un logement précis
const fullName = (l) => [l.prenom, l.nom].filter(Boolean).join(' ') || 'Sans nom';
const initials = (l) => (((l.prenom || '')[0] || '') + ((l.nom || '')[0] || '')).toUpperCase() || '?';
const immName = (id) => (vault.get('immeubles', id) || {}).adresse || 'Sans immeuble';
const LOG_TYPES = { appartement: 'Appartement', studio: 'Studio', chambre: 'Chambre', autre: 'Autre' };
const logName = (id) => (vault.get('logements', id) || {}).nom || '';
const whereOf = (l) => [logName(l.logId), immName(l.immId)].filter(Boolean).join(' · ');
const byName = (a, b) => fullName(a).localeCompare(fullName(b), 'fr');
const byAddr = (a, b) => (a.adresse || '').localeCompare(b.adresse || '', 'fr');
const byLogName = (a, b) => (a.nom || '').localeCompare(b.nom || '', 'fr', { numeric: true });
const byDebut = (a, b) => (a.debut || '').localeCompare(b.debut || '');
const ym = (y, m) => y * 12 + (m - 1);
const ymOf = (s) => { const [y, m] = String(s).split('-'); return +y * 12 + (+m - 1); };
const addDays = (s, n) => { const d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + n); return isoDate(d); };
const nowYm = () => { const d = new Date(); return d.getFullYear() * 12 + d.getMonth(); };
const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`;
const duree = (months) => (months >= 12 ? `${Math.floor(months / 12)} an${months >= 24 ? 's' : ''}${months % 12 ? ' ' + (months % 12) + ' mois' : ''}` : `${months} mois`);

// Statut d'un locataire dans le temps
// (sans paramètre par défaut : ces fonctions sont passées directement à Array.filter)
const isGone = (l) => !!l.sortie && l.sortie < today();
const isFuture = (l) => !!l.debut && l.debut > today();
const isCurrent = (l) => !isGone(l);
const currentLocs = () => vault.list('locataires').filter(isCurrent);

function isDue(l, y, m) {
  const k = ym(y, m);
  if (l.debut && k < ymOf(l.debut)) return false;
  if (l.fin && k > ymOf(l.fin)) return false;
  if (l.sortie && k > ymOf(l.sortie)) return false;
  return true;
}
const payment = (locId, y, m) => vault.get('paiements', payKey(locId, y, m));
const paidAmount = (p, l) => (p.montant != null ? p.montant : l.loyer) || 0;
const paysOf = (locId) => vault.list('paiements').filter((p) => p.locId === locId);
const totalPaid = (l) => paysOf(l.id).reduce((a, p) => a + paidAmount(p, l), 0);

function lateMonths(l, ref = new Date()) {
  const y = ref.getFullYear();
  const out = [];
  for (let m = 1; m < ref.getMonth() + 1; m++) if (isDue(l, y, m) && !payment(l.id, y, m)) out.push(m);
  return out;
}
function daysUntil(date) {
  if (!date) return null;
  return Math.round((new Date(date + 'T00:00:00') - new Date(today() + 'T00:00:00')) / 86400000);
}
const daysToEnd = (l) => daysUntil(l.fin);
function yearStats(l, y) {
  let due = 0, paid = 0;
  for (let m = 1; m <= 12; m++) {
    if (isDue(l, y, m)) due += l.loyer || 0;
    const p = payment(l.id, y, m);
    if (p) paid += paidAmount(p, l);
  }
  return { due, paid };
}
const inYear = (date, y) => !y || String(date || '').startsWith(String(y));
const depensesOf = (immId, y, logId) => vault.list('depenses').filter((d) => (!immId || d.immId === immId) && (!logId || d.logId === logId) && inYear(d.date, y));
const sum = (arr, f) => arr.reduce((a, x) => a + (f(x) || 0), 0);

// Logements & occupation
const logsOf = (immId) => vault.list('logements').filter((g) => g.immId === immId).sort(byLogName);
const tenantsOfLog = (logId) => vault.list('locataires').filter((l) => l.logId === logId).sort(byDebut);
const tenantsOfImm = (immId) => vault.list('locataires').filter((l) => l.immId === immId);
const occupantsNow = (logId) => tenantsOfLog(logId).filter((l) => !isGone(l) && !isFuture(l));
function occupancy(logId) {
  const ls = tenantsOfLog(logId).filter((l) => l.debut);
  if (!ls.length) return null;
  const start = Math.min(...ls.map((l) => ymOf(l.debut)));
  const end = nowYm();
  const months = new Set();
  for (const l of ls) {
    const to = Math.min(end, l.sortie ? ymOf(l.sortie) : end);
    for (let k = ymOf(l.debut); k <= to; k++) months.add(k);
  }
  const total = Math.max(1, end - start + 1);
  return { occupied: Math.min(months.size, total), total, vacant: Math.max(0, total - months.size) };
}
// Durée du séjour en mois (prévue jusqu'à la sortie si elle est connue)
const stayMonths = (l) => (l.debut && !isFuture(l) ? Math.max(1, (l.sortie ? ymOf(l.sortie) : nowYm()) - ymOf(l.debut) + 1) : null);

// Bail principal : loyer versé au propriétaire
const ownerRent = (im) => (im.loyer || 0) + (im.charges || 0);
function isOwnerDue(im, y, m) {
  if (!ownerRent(im)) return false;
  const k = ym(y, m);
  if (im.bailDebut && k < ymOf(im.bailDebut)) return false;
  if (im.bailFin && k > ymOf(im.bailFin)) return false;
  return true;
}
const versement = (immId, y, m) => vault.get('versements', payKey(immId, y, m));
const versementsOf = (immId, y) => vault.list('versements').filter((v) => v.immId === immId && (!y || v.y === y));

// Bilan d'un immeuble (ou d'un logement) — une année, ou depuis l'origine si y est vide
function bilan({ immId, logId, y }) {
  const ls = logId ? tenantsOfLog(logId) : tenantsOfImm(immId);
  const encaisse = sum(ls, (l) => sum(paysOf(l.id).filter((p) => !y || p.y === y), (p) => paidAmount(p, l)));
  const depenses = sum(logId ? depensesOf(null, y, logId) : depensesOf(immId, y), (d) => d.montant);
  const verse = logId ? 0 : sum(versementsOf(immId, y), (v) => v.montant);
  return { encaisse, depenses, verse, net: encaisse - depenses - verse, occupants: ls.length };
}
function dataYears() {
  const cy = new Date().getFullYear();
  let min = cy;
  for (const p of vault.list('paiements')) min = Math.min(min, p.y || cy);
  for (const v of vault.list('versements')) min = Math.min(min, v.y || cy);
  for (const d of vault.list('depenses')) if (d.date) min = Math.min(min, +d.date.slice(0, 4));
  for (const l of vault.list('locataires')) if (l.debut) min = Math.min(min, +l.debut.slice(0, 4));
  const out = [];
  for (let y = Math.max(min, cy - 30); y <= cy + 1; y++) out.push(y);
  return out;
}

// ───────────────────────── État de l'interface ─────────────────────────
const ui = {
  route: 'dashboard',
  year: new Date().getFullYear(),
  immFilter: '',
  search: '',
  locSeg: 'actuels',
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

// Boîte de choix : choices = [{ value, label, cls }] ; renvoie la valeur choisie ou null.
function choiceBox(message, detail, choices) {
  const dlg = $('#confirm');
  setHtml(dlg, html`
    <div class="sheet-body">
      <h2 style="font-size:18px;margin-bottom:8px">${message}</h2>
      ${detail ? html`<p class="muted small">${detail}</p>` : ''}
    </div>
    <div class="sheet-foot" style="flex-wrap:wrap">
      <button class="btn" data-v="" type="button">Annuler</button>
      ${choices.map((c) => html`<button class="btn ${c.cls || ''}" data-v="${c.value}" type="button">${c.label}</button>`)}
    </div>`);
  return new Promise((resolve) => {
    dlg.querySelectorAll('button').forEach((b) => (b.onclick = () => { dlg.close(); resolve(b.dataset.v || null); }));
    dlg.onclose = () => resolve(null);
    dlg.showModal();
  });
}

const confirmBox = async (message, { ok = 'Confirmer', danger = false, detail = '' } = {}) =>
  (await choiceBox(message, detail, [{ value: 'yes', label: ok, cls: danger ? 'danger solid' : 'primary' }])) === 'yes';

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

const METER_HINT = 'Conseil : une phrase de 4 ou 5 mots est à la fois forte et facile à retenir.';
function attachMeter(root) {
  root.querySelector('[name=pass]').addEventListener('input', (e) => {
    const s = passphraseStrength(e.target.value);
    const colors = ['var(--red-strong)', 'var(--red-strong)', 'var(--amber)', 'var(--green)', 'var(--green)'];
    const labels = ['Trop courte', 'Faible', 'Correcte', 'Forte', 'Excellente'];
    Object.assign(root.querySelector('#meter').style, { width: (s + 1) * 20 + '%', background: colors[s] });
    root.querySelector('#meterTxt').textContent = e.target.value ? labels[s] : METER_HINT;
  });
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
      <div class="tiny muted" id="meterTxt">${METER_HINT}</div>
      <label class="field">Confirmer la clé ${pwField('pass2', 'Retapez la clé', 'new-password')}</label>
      ${legacy ? html`<label class="row" style="padding:0;min-height:0;gap:10px;border:0"><input type="checkbox" name="legacy" checked style="width:20px;min-height:20px"> <span class="small">Importer les données de l'ancienne version trouvées sur cet appareil (${legacy.immeubles.length} immeubles, ${legacy.locataires.length} locataires)</span></label>` : ''}
      <div class="lock-err" role="alert">${error}</div>
      <button class="btn primary block" type="submit">Créer le coffre sécurisé</button>
      ${foot}
    </form>`);
    attachMeter(lockEl);
    return;
  }
  if (mode === 'recover') {
    setHtml(lockEl, html`<form class="lock-card" data-form="recover" autocomplete="off">
      ${head}
      <div class="alert info">${icon('key')}<div><b>Clé d'accès oubliée ?</b> Saisissez la <b>clé de secours</b> (24 caractères, ex. ABCD-EFGH-…) créée dans Réglages. Vous choisirez ensuite une nouvelle clé d'accès.</div></div>
      <label class="field">Clé de secours <input name="code" required placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX" autocapitalize="characters" autocorrect="off" spellcheck="false" style="font-family:var(--mono);letter-spacing:.05em"></label>
      <div class="lock-err" role="alert">${error}</div>
      <button class="btn primary block" type="submit">Ouvrir avec la clé de secours</button>
      <button class="btn ghost block" type="button" data-action="lock-mode" data-id="unlock">Retour</button>
      <p class="tiny muted">Sans clé de secours, les données ne peuvent pas être récupérées : elles sont chiffrées et personne d'autre ne possède la clé.</p>
      ${foot}
    </form>`);
    setTimeout(() => lockEl.querySelector('[name=code]')?.focus(), 50);
    return;
  }
  if (mode === 'newkey') {
    setHtml(lockEl, html`<form class="lock-card" data-form="newkey" autocomplete="off">
      ${head}
      <div class="alert info" style="background:var(--green-soft);color:var(--green)">${icon('check')}<div><b>Coffre ouvert.</b> Choisissez maintenant votre nouvelle clé d'accès.</div></div>
      <label class="field">Nouvelle clé d'accès ${pwField('pass', 'Au moins 12 caractères', 'new-password')}</label>
      <div class="meter"><i id="meter"></i></div>
      <div class="tiny muted" id="meterTxt">${METER_HINT}</div>
      <label class="field">Confirmer la clé ${pwField('pass2', 'Retapez la clé', 'new-password')}</label>
      <div class="lock-err" role="alert">${error}</div>
      <button class="btn primary block" type="submit">Enregistrer la nouvelle clé</button>
      ${foot}
    </form>`);
    attachMeter(lockEl);
    return;
  }
  setHtml(lockEl, html`<form class="lock-card" data-form="unlock">
    ${head}
    <input type="text" name="username" value="Ares Invest" autocomplete="username" hidden>
    <label class="field">Clé d'accès ${pwField('pass', '••••••••••••', 'current-password')}</label>
    <div class="lock-err" role="alert">${error}</div>
    <button class="btn primary block" type="submit">Déverrouiller</button>
    <button class="btn ghost block" type="button" data-action="lock-mode" data-id="recover">Clé d'accès oubliée ?</button>
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

async function onRecover(fd, form) {
  setBusy(form, true, 'Vérification…');
  try {
    const r = await vault.unlockWithRecovery(fd.get('code'));
    if (r.setup) return renderLock('setup');
    renderLock('newkey');
  } catch (e) {
    setBusy(form, false);
    form.querySelector('.lock-err').textContent = e.message || 'Erreur';
  }
}

async function onNewKey(fd, form) {
  const pass = fd.get('pass');
  const err = form.querySelector('.lock-err');
  if (pass.length < 12 || passphraseStrength(pass) < 2) return (err.textContent = 'Clé trop faible : au moins 12 caractères, idéalement une phrase de plusieurs mots.');
  if (pass !== fd.get('pass2')) return (err.textContent = 'Les deux clés ne correspondent pas.');
  setBusy(form, true, 'Enregistrement…');
  try {
    await vault.changePassphrase(pass);
    startSession();
    toast("Nouvelle clé d'accès enregistrée");
  } catch (e) {
    setBusy(form, false);
    err.textContent = e.message || 'Erreur';
  }
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
const yearSelect = (y) => html`<select data-input="year" style="width:auto;min-width:100px" aria-label="Année">${dataYears().map((yy) => html`<option value="${yy}" ${yy === y ? new Raw('selected') : ''}>${yy}</option>`)}</select>`;
const empty = (ic, text, action) => html`<div class="empty card">${icon(ic)}<p>${text}</p>${action ? html`<div style="margin-top:14px">${action}</div>` : ''}</div>`;

// ───────────────────────── Vues ─────────────────────────
const VIEWS = {
dashboard() {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const locs = currentLocs().sort(byName);
    const due = locs.filter((l) => isDue(l, y, m));
    const expected = sum(due, (l) => l.loyer);
    const received = sum(vault.list('locataires'), (l) => { const p = payment(l.id, y, m); return p ? paidAmount(p, l) : 0; });
    const todo = due.filter((l) => !payment(l.id, y, m));
    const late = locs.map((l) => ({ l, months: lateMonths(l, now) })).filter((x) => x.months.length >= 1).sort((a, b) => b.months.length - a.months.length);
    const expiring = locs.map((l) => ({ l, d: daysToEnd(l) })).filter((x) => x.d != null && x.d >= 0 && x.d <= 60 && !x.l.sortie).sort((a, b) => a.d - b.d);
    const leaving = locs.filter((l) => l.sortie && daysUntil(l.sortie) >= 0 && daysUntil(l.sortie) <= 60).sort((a, b) => a.sortie.localeCompare(b.sortie));
    const arriving = locs.filter((l) => isFuture(l)).sort(byDebut);
    const imms = vault.list('immeubles').sort(byAddr);
    const logs = vault.list('logements');
    const vacants = logs.filter((g) => !occupantsNow(g.id).length);
    const ownerTodo = imms.filter((im) => isOwnerDue(im, y, m) && !versement(im.id, y, m));
    const p = pct(received, expected);
    const alertBtn = (cls, ic, action, id, content) => html`<button class="alert ${cls}" style="width:100%;border:0;font:inherit;text-align:left;cursor:pointer" data-action="${action}" data-id="${id}">${icon(ic)}<div>${content}</div></button>`;

    if (!imms.length && !locs.length) {
      return html`${pageHead('Bienvenue', 'Commencez par ajouter un immeuble, puis ses logements et locataires.')}
        ${empty('building', 'Aucun immeuble pour le moment.', html`<button class="btn primary" data-action="new-imm">${icon('plus')} Ajouter un immeuble</button>`)}`;
    }

    const nudge = vault.hasRecovery === false ? html`<div class="alert warn" style="margin-bottom:14px;align-items:center">${icon('shield')}<div style="flex:1"><b>Pas encore de clé de secours.</b> Sans elle, une clé d'accès oubliée rend les données irrécupérables.</div><button class="btn sm" data-action="make-recovery">Créer</button></div>` : '';
    return html`
      ${nudge}
      ${pageHead(MONTHS_FULL[m - 1] + ' ' + y, `${plural(locs.length, 'locataire')} · ${plural(imms.length, 'immeuble')}${logs.length ? ' · ' + plural(logs.length, 'logement') : ''}`)}
      <div class="metrics">
        <div class="metric hero">
          <div class="lbl">Encaissé ce mois</div>
          <div class="val">${money(received)} <span class="muted" style="font-size:16px;font-weight:550">/ ${money(expected)}</span></div>
          <div class="progress ${level(p)}" style="margin-top:10px"><i style="width:${Math.min(p, 100)}%"></i></div>
          <div class="sub">${p}% · ${plural(todo.length, 'loyer')} à encaisser</div>
        </div>
        <div class="metric"><div class="lbl">Retards</div><div class="val ${late.length ? 'red' : 'green'}">${late.length}</div><div class="sub">locataires</div></div>
        <div class="metric"><div class="lbl">Logements vacants</div><div class="val ${vacants.length ? 'amber' : 'green'}">${vacants.length}</div><div class="sub">sur ${logs.length}</div></div>
        <div class="metric"><div class="lbl">Loyers perçus / mois</div><div class="val">${money(expected)}</div><div class="sub">baux en cours</div></div>
        <div class="metric"><div class="lbl">Propriétaires / mois</div><div class="val">${money(sum(imms.filter((im) => isOwnerDue(im, y, m)), ownerRent))}</div><div class="sub">bail principal</div></div>
      </div>

      ${late.length || expiring.length || leaving.length || arriving.length || vacants.length ? html`<div class="section-label">À surveiller</div><div class="stack">
        ${late.slice(0, 6).map(({ l, months }) => alertBtn(months.length >= 2 ? 'bad' : 'warn', 'alert', 'open-loc', l.id, html`<b>${fullName(l)}</b> — ${months.length} mois impayé${months.length > 1 ? 's' : ''} (${months.map((x) => MONTHS[x - 1]).join(', ')})`))}
        ${leaving.map((l) => alertBtn('warn', 'calendar', 'open-loc', l.id, html`<b>${fullName(l)}</b> quitte ${logName(l.logId) || 'le logement'} le ${fmtDate(l.sortie)}`))}
        ${arriving.map((l) => alertBtn('info', 'users', 'open-loc', l.id, html`<b>${fullName(l)}</b> arrive dans ${logName(l.logId) || immName(l.immId)} le ${fmtDate(l.debut)}`))}
        ${expiring.map(({ l, d }) => alertBtn('warn', 'calendar', 'open-loc', l.id, html`<b>${fullName(l)}</b> — fin de contrat ${d === 0 ? "aujourd'hui" : `dans ${plural(d, 'jour')}`} (${fmtDate(l.fin)})`))}
        ${vacants.slice(0, 6).map((g) => alertBtn('info', 'home', 'open-log', g.id, html`<b>${g.nom}</b> (${immName(g.immId)}) est vacant`))}
      </div>` : ''}

      <div class="section-label">À encaisser — ${MONTHS_FULL[m - 1]}</div>
      ${todo.length ? html`<div class="list">${todo.map((l) => html`
        <div class="row">
          <button class="avatar" style="border:0;cursor:pointer" data-action="open-loc" data-id="${l.id}">${initials(l)}</button>
          <div class="grow"><div class="title">${fullName(l)}</div><div class="meta">${whereOf(l)}</div></div>
          <div class="amount">${money(l.loyer)}</div>
          <button class="btn sm primary" data-action="pay" data-loc="${l.id}" data-y="${y}" data-m="${m}">${icon('check')} Payé</button>
        </div>`)}</div>` : html`<div class="alert" style="background:var(--green-soft);color:var(--green)">${icon('check')}<div>Tous les loyers de ${MONTHS_FULL[m - 1].toLowerCase()} sont encaissés.</div></div>`}

      ${ownerTodo.length ? html`<div class="section-label">À verser aux propriétaires — ${MONTHS_FULL[m - 1]}</div>
      <div class="list">${ownerTodo.map((im) => html`<div class="row">
        <span class="avatar" style="background:var(--amber-soft);color:var(--amber)">${icon('key')}</span>
        <div class="grow"><div class="title">${im.adresse}</div><div class="meta">${im.proprietaire || 'Propriétaire'}</div></div>
        <div class="amount">${money(ownerRent(im))}</div>
        <button class="btn sm" data-action="toggle-vers" data-imm="${im.id}" data-y="${y}" data-m="${m}">${icon('check')} Versé</button>
      </div>`)}</div>` : ''}

      <div class="section-label">Immeubles</div>
      <div class="grid cols-auto">${imms.map((im) => {
        const ls = locs.filter((l) => l.immId === im.id);
        const exp = sum(ls.filter((l) => isDue(l, y, m)), (l) => l.loyer);
        const rec = sum(tenantsOfImm(im.id), (l) => { const pp = payment(l.id, y, m); return pp ? paidAmount(pp, l) : 0; });
        const pp = pct(rec, exp);
        return html`<button class="card" style="text-align:left;font:inherit;color:inherit;cursor:pointer;width:100%" data-action="open-imm" data-id="${im.id}">
          <div class="card-title"><h3>${im.adresse}</h3><span class="badge ${pp >= 100 ? 'ok' : pp >= 50 ? 'warn' : 'bad'}">${pp}%</span></div>
          <div class="progress ${level(pp)}"><i style="width:${Math.min(pp, 100)}%"></i></div>
          <div class="pay-foot"><span>${plural(ls.length, 'locataire')}</span><span class="num">${money(rec)} / ${money(exp)}</span></div>
        </button>`;
      })}</div>`;
  },

  immeubles() {
    const y = new Date().getFullYear();
    const imms = vault.list('immeubles').sort(byAddr);
    return html`
      ${pageHead('Immeubles', plural(imms.length, 'immeuble'), html`<button class="btn primary desk-only" data-action="new-imm">${icon('plus')} Ajouter</button>`)}
      ${imms.length ? html`<div class="grid cols-auto">${imms.map((im) => {
        const logs = logsOf(im.id);
        const occ = logs.filter((g) => occupantsNow(g.id).length).length;
        const b = bilan({ immId: im.id, y });
        return html`<div class="card">
          <div class="card-title"><h3>${im.adresse}</h3><button class="btn icon ghost sm" data-action="edit-imm" data-id="${im.id}" aria-label="Modifier">${icon('edit')}</button></div>
          <dl class="kv small">
            <dt>Logements</dt><dd>${logs.length ? html`${occ} occupé${occ > 1 ? 's' : ''} / ${logs.length}` : '—'}</dd>
            <dt>Locataires actuels</dt><dd>${tenantsOfImm(im.id).filter(isCurrent).length}</dd>
            ${ownerRent(im) ? html`<dt>Bail principal</dt><dd class="num">${money(ownerRent(im))} / mois</dd>` : ''}
            <dt>Encaissé ${y}</dt><dd class="num green">${money(b.encaisse)}</dd>
            ${b.verse ? html`<dt>Versé propriétaire</dt><dd class="num">−${money(b.verse)}</dd>` : ''}
            <dt>Dépenses ${y}</dt><dd class="num ${b.depenses ? 'red' : ''}">${b.depenses ? '−' + money(b.depenses) : money(0)}</dd>
            <dt>Gain net ${y}</dt><dd class="num ${b.net < 0 ? 'red' : 'accent'}">${money(b.net)}</dd>
          </dl>
          <div class="actions" style="margin:14px 0 0">
            <button class="btn sm primary" data-action="open-imm" data-id="${im.id}">${icon('building')} Logements & bilan</button>
            <button class="btn sm" data-action="open-imm" data-id="${im.id}" data-tab="deps">${icon('receipt')} Dépenses</button>
          </div>
        </div>`;
      })}</div>` : empty('building', 'Aucun immeuble enregistré.', html`<button class="btn primary" data-action="new-imm">${icon('plus')} Ajouter un immeuble</button>`)}`;
  },

  locataires() {
    const q = ui.search.trim().toLowerCase();
    const imms = vault.list('immeubles').sort(byAddr);
    const all = vault.list('locataires');
    const anciens = ui.locSeg === 'anciens';
    let locs = all.filter((l) => (anciens ? isGone(l) : isCurrent(l))).sort(byName);
    if (ui.immFilter) locs = locs.filter((l) => l.immId === ui.immFilter);
    if (q) locs = locs.filter((l) => [l.nom, l.prenom, l.tel, l.mail, immName(l.immId), logName(l.logId)].join(' ').toLowerCase().includes(q));
    if (anciens) locs.sort((a, b) => (b.sortie || '').localeCompare(a.sortie || ''));
    const groups = imms.map((im) => ({ im, ls: locs.filter((l) => l.immId === im.id) })).filter((g) => g.ls.length);
    const orphans = locs.filter((l) => !vault.get('immeubles', l.immId));
    if (orphans.length) groups.push({ im: { adresse: 'Sans immeuble' }, ls: orphans });
    const nGone = all.filter(isGone).length;
    return html`
      ${pageHead('Locataires', `${all.length - nGone} actuels · ${nGone} anciens`, html`<button class="btn primary desk-only" data-action="new-loc">${icon('plus')} Ajouter</button>`)}
      <div class="tabs" role="tablist" style="max-width:360px">
        <button class="tab" role="tab" aria-selected="${!anciens}" data-action="loc-seg" data-id="actuels">Actuels</button>
        <button class="tab" role="tab" aria-selected="${anciens}" data-action="loc-seg" data-id="anciens">Anciens (${nGone})</button>
      </div>
      <div class="search">${icon('search')}<input type="search" name="search" placeholder="Rechercher un nom, un logement, un téléphone…" value="${ui.search}" data-input="search" autocomplete="off"></div>
      ${imms.length > 1 ? html`<div class="chips" style="margin-bottom:14px">
        <button class="chip" data-action="imm-filter" data-id="" aria-pressed="${!ui.immFilter}">Tous</button>
        ${imms.map((im) => html`<button class="chip" data-action="imm-filter" data-id="${im.id}" aria-pressed="${ui.immFilter === im.id}">${im.adresse}</button>`)}
      </div>` : ''}
      ${groups.length ? groups.map(({ im, ls }) => html`
        <div class="section-label">${im.adresse}</div>
        <div class="list">${ls.map((l) => {
          const late = anciens ? 0 : lateMonths(l).length;
          const d = daysToEnd(l);
          const badges = [];
          if (l.type === 'sous') badges.push(html`<span class="badge">Sous-loc.</span>`);
          if (anciens) badges.push(html`<span class="badge">${fmtDate(l.debut) || '?'} → ${fmtDate(l.sortie)}</span>`);
          else {
            if (isFuture(l)) badges.push(html`<span class="badge acc">Arrive le ${fmtDate(l.debut)}</span>`);
            if (l.sortie) badges.push(html`<span class="badge warn">Départ ${fmtDate(l.sortie)}</span>`);
            if (late) badges.push(html`<span class="badge ${late >= 2 ? 'bad' : 'warn'}">${late} mois de retard</span>`);
            if (d != null && d >= 0 && d <= 60 && !l.sortie) badges.push(html`<span class="badge warn">Fin ${fmtDate(l.fin)}</span>`);
          }
          return html`<button class="row" data-action="open-loc" data-id="${l.id}">
            <span class="avatar" ${anciens ? new Raw('style="background:var(--surface-2);color:var(--text-3)"') : ''}>${initials(l)}</span>
            <span class="grow">
              <span class="title" style="display:block">${fullName(l)}</span>
              <span class="meta" style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">${l.logId ? html`<span>${logName(l.logId)}</span>` : ''}${badges}</span>
            </span>
            <span class="amount ${anciens ? 'muted' : ''}">${money(l.loyer)}</span>
          </button>`;
        })}</div>`) : empty('users', q || ui.immFilter ? 'Aucun résultat.' : anciens ? 'Aucun ancien locataire pour le moment.' : 'Aucun locataire enregistré.', !q && !ui.immFilter && !anciens ? html`<button class="btn primary" data-action="new-loc">${icon('plus')} Ajouter un locataire</button>` : '')}`;
  },

  paiements() {
    const y = ui.year;
    const now = new Date();
    const cy = now.getFullYear(), cm = now.getMonth() + 1;
    let imms = vault.list('immeubles').sort(byAddr);
    const all = imms;
    if (ui.immFilter) imms = imms.filter((im) => im.id === ui.immFilter);
    let gDue = 0, gPaid = 0;
    const activeIn = (l) => MONTHS.some((_, i) => isDue(l, y, i + 1) || payment(l.id, y, i + 1));
    const cards = imms.map((im) => {
      const ls = tenantsOfImm(im.id).filter(activeIn).sort((a, b) => byLogName({ nom: logName(a.logId) }, { nom: logName(b.logId) }) || byDebut(a, b));
      if (!ls.length) return '';
      let due = 0, paid = 0;
      const rows = ls.map((l) => {
        const s = yearStats(l, y);
        due += s.due; paid += s.paid;
        return html`<div class="pay-tenant">
          <div class="pay-head"><button class="name" style="background:none;border:0;font:inherit;font-weight:650;color:inherit;cursor:pointer;padding:0" data-action="open-loc" data-id="${l.id}">${fullName(l)}</button>
            ${l.logId ? html`<span class="badge">${logName(l.logId)}</span>` : ''}<span class="muted small num">${money(l.loyer)}/mois</span>
            ${isGone(l) ? html`<span class="badge">parti le ${fmtDate(l.sortie)}</span>` : l.sortie ? html`<span class="badge warn">départ ${fmtDate(l.sortie)}</span>` : ''}</div>
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
        ${yearSelect(y)}
        ${all.length > 1 ? html`<div class="chips" style="flex:1;min-width:0">
          <button class="chip" data-action="imm-filter" data-id="" aria-pressed="${!ui.immFilter}">Tous</button>
          ${all.map((im) => html`<button class="chip" data-action="imm-filter" data-id="${im.id}" aria-pressed="${ui.immFilter === im.id}">${im.adresse}</button>`)}
        </div>` : ''}
      </div>
      ${cards.length ? html`<div class="stack">${cards}</div>
        <div class="card" style="margin-top:12px;border-color:var(--accent)"><div class="card-title" style="margin:0"><h3>Total ${y}</h3></div>
        <div class="totals" style="background:none;padding:8px 0 0;margin:0"><span>Attendu <b>${money(gDue)}</b></span><span>Reçu <b class="green">${money(gPaid)}</b></span><span>Reste <b class="${gDue - gPaid > 0 ? 'red' : 'green'}">${money(Math.max(gDue - gPaid, 0))}</b></span><span>Taux <b>${pct(gPaid, gDue)}%</b></span></div></div>`
        : empty('wallet', 'Aucun locataire à afficher pour ' + y + '.')}`;
  },

  stats() {
    const y = ui.year;
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
    const due = sum(monthly, (x) => x.due);
    const paid = sum(monthly, (x) => x.paid);
    const deps = depensesOf('', y);
    const depTotal = sum(deps, (d) => d.montant);
    const verse = sum(vault.list('versements').filter((v) => v.y === y), (v) => v.montant);
    const max = Math.max(1, ...monthly.map((x) => Math.max(x.due, x.paid)));
    const cats = { reparation: 'Réparations', assurance: 'Assurance', taxe: 'Taxes / impôts', entretien: 'Entretien', autre: 'Autre' };
    const byCat = Object.entries(cats).map(([k, label]) => ({ label, total: sum(deps.filter((d) => d.cat === k), (d) => d.montant) })).filter((x) => x.total);
    const hist = Object.values(vault.state.historique).filter((h) => !h.del).sort((a, b) => b.t - a.t);
    const origin = imms.map((im) => ({ im, b: bilan({ immId: im.id }) }));
    const tot = { encaisse: sum(origin, (x) => x.b.encaisse), verse: sum(origin, (x) => x.b.verse), depenses: sum(origin, (x) => x.b.depenses), net: sum(origin, (x) => x.b.net), occupants: sum(origin, (x) => x.b.occupants) };
    return html`
      ${pageHead('Statistiques', 'Vue financière annuelle et depuis l’origine', html`<div style="display:flex;gap:8px">${yearSelect(y)}<button class="btn" data-action="print-global">${icon('download')} Imprimer</button></div>`)}
      <div class="metrics">
        <div class="metric"><div class="lbl">Loyers encaissés</div><div class="val green">${money(paid)}</div><div class="sub">${pct(paid, due)}% de ${money(due)}</div></div>
        <div class="metric"><div class="lbl">Manquant</div><div class="val ${due - paid > 0 ? 'red' : ''}">${money(Math.max(due - paid, 0))}</div></div>
        <div class="metric"><div class="lbl">Versé propriétaires</div><div class="val">${money(verse)}</div></div>
        <div class="metric"><div class="lbl">Réparations & frais</div><div class="val">${money(depTotal)}</div></div>
        <div class="metric hero"><div class="lbl">Gain net ${y}</div><div class="val ${paid - depTotal - verse < 0 ? 'red' : 'accent'}">${money(paid - depTotal - verse)}</div><div class="sub">encaissé − propriétaires − dépenses</div></div>
      </div>
      <div class="section-label">Encaissement mensuel ${y}</div>
      <div class="card">
        <div class="bars">${monthly.map((x, i) => html`<div class="bar" title="${MONTHS_FULL[i]} : ${money(x.paid)} / ${money(x.due)}">
          <div class="track"><div class="fill ${x.due && x.paid >= x.due ? 'full' : ''}" style="height:${(x.paid / max) * 100}%"></div></div><small>${MONTHS[i][0]}</small></div>`)}</div>
      </div>
      <div class="section-label">Par immeuble — ${y}</div>
      <div class="card scroll-x" style="padding:6px">
        <table class="tbl"><thead><tr><th>Immeuble</th><th class="r">Encaissé</th><th class="r">Propriét.</th><th class="r">Dépenses</th><th class="r">Net</th></tr></thead><tbody>
        ${imms.map((im) => { const b = bilan({ immId: im.id, y }); return html`<tr data-action="open-imm" data-id="${im.id}" data-tab="bilan" style="cursor:pointer"><td>${im.adresse}</td><td class="r green">${money(b.encaisse)}</td><td class="r">${b.verse ? '−' + money(b.verse) : '—'}</td><td class="r">${b.depenses ? '−' + money(b.depenses) : '—'}</td><td class="r ${b.net < 0 ? 'red' : 'accent'}">${money(b.net)}</td></tr>`; })}
        </tbody></table>
      </div>
      <div class="section-label">Depuis l’origine</div>
      <div class="card scroll-x" style="padding:6px">
        <table class="tbl"><thead><tr><th>Immeuble</th><th class="r">Occupants</th><th class="r">Encaissé</th><th class="r">Propriét.</th><th class="r">Dépenses</th><th class="r">Gain net</th></tr></thead><tbody>
        ${origin.map(({ im, b }) => html`<tr data-action="open-imm" data-id="${im.id}" data-tab="bilan" style="cursor:pointer"><td>${im.adresse}</td><td class="r">${b.occupants}</td><td class="r green">${money(b.encaisse)}</td><td class="r">${b.verse ? '−' + money(b.verse) : '—'}</td><td class="r">${b.depenses ? '−' + money(b.depenses) : '—'}</td><td class="r ${b.net < 0 ? 'red' : 'accent'}"><b>${money(b.net)}</b></td></tr>`)}
        <tr><td><b>Total</b></td><td class="r"><b>${tot.occupants}</b></td><td class="r green"><b>${money(tot.encaisse)}</b></td><td class="r"><b>${tot.verse ? '−' + money(tot.verse) : '—'}</b></td><td class="r"><b>${tot.depenses ? '−' + money(tot.depenses) : '—'}</b></td><td class="r accent"><b>${money(tot.net)}</b></td></tr>
        </tbody></table>
      </div>
      ${byCat.length ? html`<div class="section-label">Dépenses par catégorie — ${y}</div><div class="list">${byCat.map((c) => html`<div class="row"><span class="grow">${c.label}</span><span class="amount">${money(c.total)}</span></div>`)}</div>` : ''}
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
        <button class="row" data-action="make-recovery">${icon('shield')}<span class="grow"><span class="title" style="display:block">Clé de secours ${vault.hasRecovery ? html`<span class="badge ok">active</span>` : vault.hasRecovery === false ? html`<span class="badge warn">à créer</span>` : ''}</span><span class="meta">Pour retrouver l'accès si la clé d'accès est oubliée</span></span></button>
        <button class="row" data-action="change-key">${icon('key')}<span class="grow"><span class="title" style="display:block">Changer la clé d'accès</span><span class="meta">Les autres appareils devront utiliser la nouvelle clé</span></span></button>
        <button class="row" data-action="lock">${icon('lock')}<span class="grow title">Verrouiller maintenant</span></button>
        <button class="row" data-action="wipe-all">${icon('trash')}<span class="grow"><span class="title red" style="display:block">Effacer toutes les données</span><span class="meta">Immeubles, locataires, paiements, documents — sur tous les appareils</span></span></button>
        <button class="row" data-action="forget">${icon('trash')}<span class="grow"><span class="title red" style="display:block">Oublier cet appareil</span><span class="meta">Efface la copie chiffrée locale (les données restent sur le serveur)</span></span></button>
      </div>

      <div class="section-label">Données</div>
      <div class="list settings">
        <button class="row" data-action="export-enc">${icon('shield')}<span class="grow"><span class="title" style="display:block">Sauvegarde chiffrée</span><span class="meta">Fichier .ares, lisible uniquement avec la clé</span></span></button>
        <button class="row" data-action="export-json">${icon('download')}<span class="grow"><span class="title" style="display:block">Export lisible (JSON)</span><span class="meta">Non chiffré — à conserver en lieu sûr</span></span></button>
        <button class="row" data-action="import">${icon('upload')}<span class="grow"><span class="title" style="display:block">Importer</span><span class="meta">Sauvegarde .ares ou export JSON (ancienne version incluse)</span></span></button>
        <button class="row" data-action="print">${icon('file')}<span class="grow title">Imprimer la page Paiements</span></button>
      </div>

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
function openSheet(kind, id, tab, preset) {
  ui.sheet = { kind, id, tab: tab || null, preset };
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
const money$ = 'inputmode="decimal" step="0.01" min="0"';
const tabsBar = (tabs, cur) => html`<div class="tabs" role="tablist">${tabs.map(([k, label]) => html`<button class="tab" role="tab" aria-selected="${cur === k}" data-action="sheet-tab" data-id="${k}">${label}</button>`)}</div>`;
const kvRow = (k, v) => html`<dt>${k}</dt><dd>${v}</dd>`;
const DEP_CATS = { reparation: '🔧 Réparation', assurance: '🛡️ Assurance', taxe: '🏛️ Taxe / impôt', entretien: '🧹 Entretien', autre: '📦 Autre' };

function tenantFields(l, prefix = '') {
  return html`
    ${field('Prénom', prefix + 'prenom', l.prenom, { attrs: 'autocomplete="off"' })}
    ${field('Nom', prefix + 'nom', l.nom, { required: true, attrs: 'autocomplete="off"' })}
    ${field('Loyer mensuel (€)', prefix + 'loyer', l.loyer, { type: 'number', required: true, attrs: money$ })}
    <label class="field">Type<select name="${prefix}type"><option value="principal">Principal</option><option value="sous" ${l.type === 'sous' ? new Raw('selected') : ''}>Sous-locataire</option></select></label>
    ${field('Téléphone', prefix + 'tel', l.tel, { type: 'tel', placeholder: '+352 …', attrs: 'autocomplete="off"' })}
    ${field('Email', prefix + 'mail', l.mail, { type: 'email', attrs: 'autocomplete="off"' })}
    ${field('Caution (€)', prefix + 'caution', l.caution, { type: 'number', attrs: money$ })}
    ${field('Note caution', prefix + 'cautionNote', l.cautionNote)}
    ${field("Début du contrat (entrée)", prefix + 'debut', l.debut, { type: 'date', required: !!prefix })}
    ${field('Fin du contrat', prefix + 'fin', l.fin, { type: 'date' })}`;
}

function logementSelect(selLog, selImm) {
  const imms = vault.list('immeubles').sort(byAddr);
  return html`<label class="field full">Logement
    <select name="place" data-input="place" required>
      <option value="">— Choisir —</option>
      ${imms.map((im) => html`<optgroup label="${im.adresse}">
        ${logsOf(im.id).map((g) => {
          const occ = occupantsNow(g.id);
          return html`<option value="log:${g.id}" ${g.id === selLog ? new Raw('selected') : ''}>${g.nom}${occ.length ? ' — occupé (' + occ.map(fullName).join(', ') + ')' : ' — vacant'}</option>`;
        })}
        <option value="new:${im.id}">➕ Nouveau logement dans cet immeuble…</option>
        <option value="imm:${im.id}" ${!selLog && selImm === im.id ? new Raw('selected') : ''}>Immeuble sans logement précis</option>
      </optgroup>`)}
    </select></label>
    <div class="fields full" id="newLogWrap" hidden>
      ${field('Nom du nouveau logement', 'newLogNom', '', { placeholder: 'ex. Appartement 2B, Chambre 3' })}
      <label class="field">Type<select name="newLogType">${Object.entries(LOG_TYPES).map(([k, v]) => html`<option value="${k}">${v}</option>`)}</select></label>
    </div>`;
}

function monthGrid(y, cells) {
  return html`<div class="months" style="grid-template-columns:repeat(6,1fr);margin-bottom:12px">${cells}</div>`;
}

function depensesPanel(immId) {
  const deps = depensesOf(immId).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const logs = logsOf(immId);
  return html`<form data-form="dep" class="fields" style="margin-bottom:16px">
      <input type="hidden" name="immId" value="${immId}">
      ${field('Description', 'desc', '', { full: true, required: true, placeholder: 'ex. Réparation toiture' })}
      ${field('Montant (€)', 'montant', '', { type: 'number', required: true, attrs: 'inputmode="decimal" step="0.01" min="0.01"' })}
      ${field('Date', 'date', today(), { type: 'date', required: true })}
      <label class="field">Catégorie<select name="cat">${Object.entries(DEP_CATS).map(([k, v]) => html`<option value="${k}">${v}</option>`)}</select></label>
      <label class="field">Concerne<select name="logId"><option value="">Tout l'immeuble</option>${logs.map((g) => html`<option value="${g.id}">${g.nom}</option>`)}</select></label>
      <button class="btn primary full" type="submit">${icon('plus')} Ajouter la dépense</button>
    </form>
    ${deps.length ? html`<div class="list">${deps.map((d) => html`<div class="row"><span class="grow"><span class="title" style="display:block">${d.desc}</span><span class="meta">${fmtDate(d.date)} · ${DEP_CATS[d.cat] || d.cat}${d.logId ? ' · ' + logName(d.logId) : ''}</span></span>
      <span class="amount red">−${money(d.montant)}</span><button class="btn icon sm ghost danger" data-action="del-dep" data-id="${d.id}" aria-label="Supprimer">${icon('trash')}</button></div>`)}</div>
      <div class="totals"><span>Total depuis l'origine</span><b class="red">−${money(sum(deps, (d) => d.montant))}</b></div>` : html`<p class="muted small">Aucune dépense.</p>`}`;
}

function bilanTable(rows) {
  return html`<div class="scroll-x"><table class="tbl"><thead><tr><th>Année</th><th class="r">Encaissé</th>${rows.some((r) => r.verse) ? html`<th class="r">Propriét.</th>` : ''}<th class="r">Dépenses</th><th class="r">Net</th></tr></thead><tbody>
    ${rows.map((r) => html`<tr><td>${r.y}</td><td class="r green">${money(r.encaisse)}</td>${rows.some((x) => x.verse) ? html`<td class="r">${r.verse ? '−' + money(r.verse) : '—'}</td>` : ''}<td class="r">${r.depenses ? '−' + money(r.depenses) : '—'}</td><td class="r ${r.net < 0 ? 'red' : 'accent'}">${money(r.net)}</td></tr>`)}
  </tbody></table></div>`;
}
const yearsWithData = (f) => dataYears().filter((y) => y <= new Date().getFullYear()).map((y) => ({ y, ...f(y) })).filter((r) => r.encaisse || r.depenses || r.verse).reverse();

const SHEETS = {
  'imm-form'({ id }) {
    const im = id ? vault.get('immeubles', id) : {};
    if (id && !im) return null;
    return {
      title: id ? "Modifier l'immeuble" : 'Nouvel immeuble',
      body: html`<form id="f" data-form="imm" class="fields">
        <input type="hidden" name="id" value="${id || ''}">
        ${field('Adresse complète', 'adresse', im.adresse, { full: true, required: true, placeholder: 'ex. 34, rue Josy Haendel' })}
        <div class="section-label full" style="margin:6px 0 0">Bail principal (ce que vous payez au propriétaire)</div>
        ${field('Propriétaire', 'proprietaire', im.proprietaire, { full: true, placeholder: 'Nom du propriétaire (laisser vide si vous êtes propriétaire)' })}
        ${field('Loyer au propriétaire (€ / mois)', 'loyer', im.loyer, { type: 'number', attrs: money$ })}
        ${field('Charges (€ / mois)', 'charges', im.charges, { type: 'number', attrs: money$ })}
        ${field('Début du bail principal', 'bailDebut', im.bailDebut, { type: 'date' })}
        ${field('Fin du bail principal', 'bailFin', im.bailFin, { type: 'date' })}
        <label class="field full">Notes<textarea name="note" placeholder="Travaux, assurance, syndic…">${im.note || ''}</textarea></label>
      </form>`,
      foot: html`${id ? html`<button class="btn ghost danger" data-action="del-imm" data-id="${id}" aria-label="Supprimer">${icon('trash')}</button>` : ''}
        <button class="btn" data-action="close-sheet">Annuler</button><button class="btn primary" type="submit" form="f">Enregistrer</button>`,
    };
  },

  imm({ id, tab }) {
    const im = vault.get('immeubles', id);
    if (!im) return null;
    tab = tab || 'logs';
    const y = new Date().getFullYear();
    let body;
    if (tab === 'logs') {
      const logs = logsOf(id);
      const unassigned = tenantsOfImm(id).filter((l) => isCurrent(l) && !vault.get('logements', l.logId));
      body = html`
        ${unassigned.length ? html`<div class="alert warn" style="margin-bottom:12px">${icon('alert')}<div>${plural(unassigned.length, 'locataire')} sans logement attribué. Attribuez-leur un logement pour suivre les changements d'occupants.</div></div>
          <div class="list" style="margin-bottom:16px">${unassigned.map((l) => html`<div class="row"><span class="avatar">${initials(l)}</span><span class="grow title">${fullName(l)}</span><button class="btn sm" data-action="edit-loc" data-id="${l.id}">Attribuer</button></div>`)}</div>` : ''}
        ${logs.length ? html`<div class="list">${logs.map((g) => {
          const occ = occupantsNow(g.id);
          const next = tenantsOfLog(g.id).filter((l) => isFuture(l));
          const leaving = occ.filter((l) => l.sortie);
          return html`<button class="row" data-action="open-log" data-id="${g.id}">
            <span class="avatar" style="${occ.length ? '' : 'background:var(--amber-soft);color:var(--amber)'}">${icon(g.type === 'chambre' ? 'key' : 'home')}</span>
            <span class="grow"><span class="title" style="display:block">${g.nom} <span class="muted small">${LOG_TYPES[g.type] || ''}</span></span>
              <span class="meta" style="display:flex;gap:6px;flex-wrap:wrap">${occ.length ? occ.map(fullName).join(', ') : html`<span class="badge warn">Vacant</span>`}
              ${leaving.map((l) => html`<span class="badge warn">départ ${fmtDate(l.sortie)}</span>`)}${next.map((l) => html`<span class="badge acc">arrivée ${fmtDate(l.debut)}</span>`)}</span></span>
            <span class="tiny muted">${plural(tenantsOfLog(g.id).length, 'occupant')}</span>
          </button>`;
        })}</div>` : html`<p class="muted small">Aucun logement. Ajoutez les appartements ou chambres de cet immeuble pour suivre leurs occupants successifs.</p>`}
        <button class="btn block" style="margin-top:12px" data-action="new-log" data-imm="${id}">${icon('plus')} Ajouter un logement</button>`;
    } else if (tab === 'proprio') {
      const rent = ownerRent(im);
      const cy = y, cm = new Date().getMonth() + 1;
      body = html`
        <dl class="kv" style="margin-bottom:16px">
          ${kvRow('Propriétaire', im.proprietaire || '—')}
          ${kvRow('Loyer + charges', rent ? money(rent) + ' / mois' : '—')}
          ${kvRow('Bail principal', html`${im.bailDebut ? fmtDate(im.bailDebut) : '?'} → ${im.bailFin ? fmtDate(im.bailFin) : 'indéterminé'}`)}
          ${kvRow('Total versé', html`<span class="num">${money(sum(versementsOf(id), (v) => v.montant))}</span>`)}
        </dl>
        ${rent ? [cy, cy - 1].map((yy) => html`<div class="section-label" style="margin-top:4px">${yy} · versé ${money(sum(versementsOf(id, yy), (v) => v.montant))}</div>
          ${monthGrid(yy, MONTHS.map((mn, i) => {
            const m = i + 1;
            const v = versement(id, yy, m);
            const dueM = isOwnerDue(im, yy, m);
            const past = ym(yy, m) < ym(cy, cm);
            return html`<button class="mcell ${v ? 'paid' : !dueM ? 'off' : past ? 'late' : ''}" data-action="toggle-vers" data-imm="${id}" data-y="${yy}" data-m="${m}">${mn}<small>${v ? '✓' : dueM ? (past ? '!' : '·') : '–'}</small></button>`;
          }))}`) : html`<div class="alert info">${icon('key')}<div>Aucun loyer au propriétaire renseigné. Si vous louez cet immeuble à un propriétaire principal, indiquez le montant dans « Modifier ».</div></div>`}
        <p class="tiny muted">Touchez un mois pour enregistrer le versement au propriétaire.</p>`;
    } else if (tab === 'deps') {
      body = depensesPanel(id);
    } else {
      const b = bilan({ immId: id });
      const logs = logsOf(id);
      body = html`
        <div class="metrics" style="margin-bottom:16px">
          <div class="metric hero"><div class="lbl">Gain net depuis l'origine</div><div class="val ${b.net < 0 ? 'red' : 'accent'}">${money(b.net)}</div><div class="sub">loyers encaissés − propriétaire − dépenses</div></div>
          <div class="metric"><div class="lbl">Loyers encaissés</div><div class="val green">${money(b.encaisse)}</div></div>
          <div class="metric"><div class="lbl">Versé propriétaire</div><div class="val">${money(b.verse)}</div></div>
          <div class="metric"><div class="lbl">Réparations & frais</div><div class="val">${money(b.depenses)}</div></div>
          <div class="metric"><div class="lbl">Occupants</div><div class="val">${b.occupants}</div><div class="sub">depuis l'origine</div></div>
        </div>
        <div class="section-label">Par année</div>
        ${bilanTable(yearsWithData((yy) => bilan({ immId: id, y: yy })))}
        ${logs.length ? html`<div class="section-label">Par logement</div>
        <div class="list">${logs.map((g) => {
          const bb = bilan({ logId: g.id });
          const occ = occupancy(g.id);
          return html`<button class="row" data-action="open-log" data-id="${g.id}" data-tab="bilan"><span class="grow"><span class="title" style="display:block">${g.nom}</span>
            <span class="meta">${plural(bb.occupants, 'occupant')}${occ ? ` · occupé ${pct(occ.occupied, occ.total)}% du temps` : ''}${bb.depenses ? ' · dépenses ' + money(bb.depenses) : ''}</span></span>
            <span class="amount green">${money(bb.encaisse)}</span></button>`;
        })}</div>` : ''}`;
    }
    return {
      title: im.adresse,
      body: html`${tabsBar([['logs', 'Logements'], ['proprio', 'Propriétaire'], ['deps', 'Dépenses'], ['bilan', 'Bilan']], tab)}${body}`,
      foot: html`<button class="btn" data-action="print-imm" data-id="${id}">${icon('download')} Imprimer</button><button class="btn" data-action="edit-imm" data-id="${id}">${icon('edit')} Modifier</button>`,
    };
  },

  'log-form'({ id, preset }) {
    const g = id ? vault.get('logements', id) : { immId: preset, type: 'appartement' };
    if (id && !g) return null;
    return {
      title: id ? 'Modifier le logement' : 'Nouveau logement',
      narrow: true,
      body: html`<form id="f" data-form="log" class="fields">
        <input type="hidden" name="id" value="${id || ''}">
        ${field('Nom', 'nom', g.nom, { full: true, required: true, placeholder: 'ex. Appartement 2B, Chambre 3, Studio RDC' })}
        <label class="field full">Immeuble<select name="immId" required>${vault.list('immeubles').sort(byAddr).map((im) => html`<option value="${im.id}" ${im.id === g.immId ? new Raw('selected') : ''}>${im.adresse}</option>`)}</select></label>
        <label class="field">Type<select name="type">${Object.entries(LOG_TYPES).map(([k, v]) => html`<option value="${k}" ${g.type === k ? new Raw('selected') : ''}>${v}</option>`)}</select></label>
        ${field('Surface (m²)', 'surface', g.surface, { type: 'number', attrs: 'inputmode="decimal" min="0" step="0.1"' })}
        ${field('Étage', 'etage', g.etage)}
        ${field('Loyer indicatif (€)', 'loyer', g.loyer, { type: 'number', attrs: money$ })}
        <label class="field full">Notes<textarea name="note" placeholder="Équipements, compteurs, état…">${g.note || ''}</textarea></label>
      </form>`,
      foot: html`${id ? html`<button class="btn ghost danger" data-action="del-log" data-id="${id}" aria-label="Supprimer">${icon('trash')}</button>` : ''}
        <button class="btn" data-action="close-sheet">Annuler</button><button class="btn primary" type="submit" form="f">Enregistrer</button>`,
    };
  },

  log({ id, tab }) {
    const g = vault.get('logements', id);
    if (!g) return null;
    tab = tab || 'now';
    const all = tenantsOfLog(id);
    const occ = occupantsNow(id);
    const future = all.filter((l) => isFuture(l));
    let body;
    if (tab === 'now') {
      const last = all.filter((l) => isGone(l)).sort((a, b) => (b.sortie || '').localeCompare(a.sortie || ''))[0];
      body = html`
        <dl class="kv small" style="margin-bottom:16px">
          ${kvRow('Immeuble', immName(g.immId))}
          ${kvRow('Type', LOG_TYPES[g.type] || '—')}
          ${g.surface ? kvRow('Surface', g.surface + ' m²') : ''}
          ${g.etage ? kvRow('Étage', g.etage) : ''}
          ${g.loyer ? kvRow('Loyer indicatif', money(g.loyer)) : ''}
        </dl>
        ${g.note ? html`<div class="note" style="margin-bottom:16px">${g.note}</div>` : ''}
        <div class="section-label" style="margin-top:0">Occupant${occ.length > 1 ? 's' : ''} actuel${occ.length > 1 ? 's' : ''}</div>
        ${occ.length ? html`<div class="list" style="margin-bottom:12px">${occ.map((l) => html`<div class="row">
          <button class="avatar" style="border:0;cursor:pointer" data-action="open-loc" data-id="${l.id}">${initials(l)}</button>
          <button class="grow" style="background:none;border:0;font:inherit;color:inherit;text-align:left;cursor:pointer;min-width:0" data-action="open-loc" data-id="${l.id}"><span class="title" style="display:block">${fullName(l)}</span><span class="meta">depuis ${fmtDate(l.debut) || '?'}${l.sortie ? ' · départ le ' + fmtDate(l.sortie) : ''}</span></button>
          <button class="btn sm" data-action="replace" data-id="${l.id}">${icon('sync')} Changer</button>
        </div>`)}</div>` : html`<div class="alert warn" style="margin-bottom:12px">${icon('home')}<div><b>Logement vacant</b>${last ? html` depuis le départ de ${fullName(last)} (${fmtDate(last.sortie)})` : ''}.</div></div>`}
        ${future.length ? html`<div class="section-label">Arrivée prévue</div><div class="list" style="margin-bottom:12px">${future.map((l) => html`<button class="row" data-action="open-loc" data-id="${l.id}"><span class="avatar">${initials(l)}</span><span class="grow"><span class="title" style="display:block">${fullName(l)}</span><span class="meta">le ${fmtDate(l.debut)}</span></span></button>`)}</div>` : ''}
        <button class="btn block ${occ.length ? '' : 'primary'}" data-action="new-loc" data-log="${id}">${icon('plus')} ${occ.length ? 'Ajouter un colocataire' : 'Ajouter un locataire'}</button>`;
    } else if (tab === 'hist') {
      body = all.length ? html`<div class="list">${[...all].reverse().map((l) => {
        const months = stayMonths(l);
        return html`<button class="row" data-action="open-loc" data-id="${l.id}">
          <span class="avatar" style="${isGone(l) ? 'background:var(--surface-2);color:var(--text-3)' : ''}">${initials(l)}</span>
          <span class="grow"><span class="title" style="display:block">${fullName(l)} ${!isGone(l) && !isFuture(l) ? html`<span class="badge ok">actuel</span>` : isFuture(l) ? html`<span class="badge acc">à venir</span>` : ''}</span>
            <span class="meta">${isFuture(l) ? `arrivée prévue le ${fmtDate(l.debut)}` : html`${fmtDate(l.debut) || '?'} → ${l.sortie ? (isGone(l) ? fmtDate(l.sortie) : 'départ prévu le ' + fmtDate(l.sortie)) : "aujourd'hui"}${months ? ' · ' + duree(months) : ''}`}</span></span>
          <span class="amount green">${money(totalPaid(l))}</span>
        </button>`;
      })}</div><p class="tiny muted" style="margin-top:8px">Montant = total des loyers encaissés pendant le séjour.</p>` : html`<p class="muted small">Aucun occupant enregistré.</p>`;
    } else {
      const b = bilan({ logId: id });
      const occu = occupancy(id);
      const stays = all.map(stayMonths).filter(Boolean);
      body = html`
        <div class="metrics" style="margin-bottom:16px">
          <div class="metric hero"><div class="lbl">Loyers encaissés depuis l'origine</div><div class="val green">${money(b.encaisse)}</div><div class="sub">${b.depenses ? 'net après dépenses : ' + money(b.encaisse - b.depenses) : 'aucune dépense rattachée'}</div></div>
          <div class="metric"><div class="lbl">Occupants</div><div class="val">${b.occupants}</div></div>
          <div class="metric"><div class="lbl">Dépenses</div><div class="val">${money(b.depenses)}</div></div>
          <div class="metric"><div class="lbl">Taux d'occupation</div><div class="val">${occu ? pct(occu.occupied, occu.total) + '%' : '—'}</div><div class="sub">${occu ? duree(occu.vacant) + ' de vacance' : ''}</div></div>
          <div class="metric"><div class="lbl">Séjour moyen</div><div class="val">${stays.length ? duree(Math.round(sum(stays, (x) => x) / stays.length)) : '—'}</div></div>
        </div>
        <div class="section-label">Par année</div>
        ${bilanTable(yearsWithData((yy) => bilan({ logId: id, y: yy })))}
        ${depensesOf(null, null, id).length ? html`<div class="section-label">Dépenses de ce logement</div><div class="list">${depensesOf(null, null, id).sort((a, b) => (b.date || '').localeCompare(a.date || '')).map((d) => html`<div class="row"><span class="grow"><span class="title" style="display:block">${d.desc}</span><span class="meta">${fmtDate(d.date)}</span></span><span class="amount red">−${money(d.montant)}</span></div>`)}</div>` : ''}`;
    }
    return {
      title: g.nom,
      body: html`${tabsBar([['now', 'Actuel'], ['hist', `Occupants (${all.length})`], ['bilan', 'Bilan']], tab)}${body}`,
      foot: html`<button class="btn icon" data-action="print-log" data-id="${id}" aria-label="Imprimer">${icon('download')}</button><button class="btn" data-action="open-imm" data-id="${g.immId}">${icon('building')} Immeuble</button><button class="btn" data-action="edit-log" data-id="${id}">${icon('edit')} Modifier</button>`,
    };
  },

  'loc-form'({ id, preset }) {
    const l = id ? vault.get('locataires', id) : { immId: ui.immFilter || '', type: 'principal', debut: today() };
    if (id && !l) return null;
    if (!id && preset) {
      const g = vault.get('logements', preset);
      if (g) Object.assign(l, { logId: g.id, immId: g.immId, loyer: g.loyer || '' });
    }
    if (!vault.list('immeubles').length) return { title: 'Nouveau locataire', body: empty('building', "Ajoutez d'abord un immeuble.", html`<button class="btn primary" data-action="new-imm">${icon('plus')} Ajouter un immeuble</button>`) };
    return {
      title: id ? 'Modifier le locataire' : 'Nouveau locataire',
      body: html`<form id="f" data-form="loc" class="fields">
        <input type="hidden" name="id" value="${id || ''}">
        ${logementSelect(l.logId, l.immId)}
        ${tenantFields(l)}
        ${id ? html`${field('Date de sortie', 'sortie', l.sortie, { type: 'date' })}${field('Caution rendue (€)', 'cautionRendue', l.cautionRendue, { type: 'number', attrs: money$ })}` : ''}
      </form>`,
      foot: html`<button class="btn" data-action="close-sheet">Annuler</button><button class="btn primary" type="submit" form="f">Enregistrer</button>`,
    };
  },

  'replace-form'({ id }) {
    const old = vault.get('locataires', id);
    if (!old) return null;
    const where = logName(old.logId) || immName(old.immId);
    const sortie = old.sortie || today();
    return {
      title: 'Changer de locataire',
      body: html`<form id="f" data-form="replace" class="fields">
        <input type="hidden" name="id" value="${id}">
        <div class="alert warn full">${icon('alert')}<div>Vous allez changer le locataire de <b>${where}</b>. <b>${fullName(old)}</b> sera archivé comme ancien locataire : ses paiements, documents et son historique sont conservés pour les statistiques.</div></div>
        <div class="section-label full" style="margin:8px 0 0">Départ de ${fullName(old)}</div>
        ${field('Date de sortie', 'sortie', sortie, { type: 'date', required: true })}
        ${field('Caution rendue (€)', 'cautionRendue', old.cautionRendue ?? old.caution, { type: 'number', attrs: money$ })}
        <label class="field full">Remarques de sortie<textarea name="sortieNote" style="min-height:70px" placeholder="État des lieux, retenues, nouvelle adresse…">${old.sortieNote || ''}</textarea></label>
        <label class="full" style="display:flex;gap:10px;align-items:center;font-size:15px;margin-top:4px"><input type="checkbox" name="vacant" data-input="vacant" style="width:22px;min-height:22px"> Pas encore de nouveau locataire (le logement devient vacant)</label>
        <fieldset id="newTenant" class="fields full" style="border:0">
          <div class="section-label full" style="margin:8px 0 0">Nouveau locataire</div>
          ${tenantFields({ loyer: old.loyer, type: old.type, debut: addDays(sortie, 1) }, 'n_')}
        </fieldset>
      </form>`,
      foot: html`<button class="btn" data-action="close-sheet">Annuler</button><button class="btn primary" type="submit" form="f">Confirmer le changement</button>`,
    };
  },

  loc({ id, tab }) {
    const l = vault.get('locataires', id);
    if (!l) return null;
    tab = tab || 'infos';
    const y = new Date().getFullYear();
    const docs = vault.list('documents').filter((d) => d.locId === id).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const gone = isGone(l);
    const late = gone ? [] : lateMonths(l);
    const d = daysToEnd(l);
    let body;
    if (tab === 'infos') {
      const tel = (l.tel || '').replace(/[^\d+]/g, '');
      body = html`
        ${gone ? html`<div class="alert info" style="margin-bottom:14px">${icon('history')}<div><b>Ancien locataire</b> — parti le ${fmtDate(l.sortie)}${stayMonths(l) ? ' après ' + duree(stayMonths(l)) : ''}.</div></div>` : ''}
        ${!gone && l.sortie ? html`<div class="alert warn" style="margin-bottom:14px">${icon('calendar')}<div>Départ prévu le <b>${fmtDate(l.sortie)}</b>.</div></div>` : ''}
        <div class="actions">
          ${tel ? html`<a class="btn" href="tel:${tel}">${icon('phone')} Appeler</a><a class="btn" href="sms:${tel}">${icon('msg')} SMS</a>` : ''}
          ${l.mail ? html`<a class="btn" href="mailto:${l.mail}">${icon('mail')} Email</a>` : ''}
        </div>
        ${late.length ? html`<div class="alert ${late.length >= 2 ? 'bad' : 'warn'}" style="margin-bottom:14px">${icon('alert')}<div>${late.length} mois impayé${late.length > 1 ? 's' : ''} : ${late.map((m) => MONTHS_FULL[m - 1]).join(', ')}</div></div>` : ''}
        <dl class="kv">
          ${kvRow('Immeuble', immName(l.immId))}
          ${kvRow('Logement', l.logId ? html`<a href="#" data-action="open-log" data-id="${l.logId}">${logName(l.logId)}</a>` : '—')}
          ${kvRow('Loyer', html`<span class="num">${money(l.loyer)} / mois</span>`)}
          ${kvRow('Type', l.type === 'sous' ? 'Sous-locataire' : 'Principal')}
          ${kvRow('Téléphone', l.tel || '—')}
          ${kvRow('Email', l.mail || '—')}
          ${kvRow('Caution', html`<span class="num">${l.caution ? money(l.caution) : '—'}</span>${l.cautionNote ? html`<div class="tiny muted">${l.cautionNote}</div>` : ''}${l.cautionRendue != null && l.sortie ? html`<div class="tiny muted">rendue : ${money(l.cautionRendue)}</div>` : ''}`)}
          ${kvRow('Entrée', l.debut ? fmtDate(l.debut) : '?')}
          ${kvRow('Fin du contrat', html`${l.fin ? fmtDate(l.fin) : 'indéterminée'}${d != null && d >= 0 && d <= 60 && !gone ? html`<div class="tiny amber">dans ${plural(d, 'jour')}</div>` : ''}`)}
          ${l.sortie ? kvRow('Sortie', fmtDate(l.sortie)) : ''}
          ${kvRow('Total encaissé', html`<span class="num green">${money(totalPaid(l))}</span>`)}
        </dl>
        ${l.sortieNote ? html`<div class="section-label">Remarques de sortie</div><div class="note">${l.sortieNote}</div>` : ''}`;
    } else if (tab === 'pay') {
      const years = [...new Set([y, y - 1, ...paysOf(id).map((p) => p.y)])].filter((yy) => yy === y || MONTHS.some((_, i) => isDue(l, yy, i + 1) || payment(id, yy, i + 1))).sort((a, b) => b - a);
      body = html`${years.map((yy) => {
        const s = yearStats(l, yy);
        return html`<div class="section-label" style="margin-top:4px">${yy} · <span class="green">${money(s.paid)}</span> / ${money(s.due)}</div>
          ${monthGrid(yy, MONTHS.map((mn, i) => {
            const m = i + 1;
            const p = payment(l.id, yy, m);
            const dueM = isDue(l, yy, m);
            const past = ym(yy, m) < ym(y, new Date().getMonth() + 1);
            return html`<button class="mcell ${p ? 'paid' : !dueM ? 'off' : past ? 'late' : ''}" data-action="toggle-pay" data-loc="${l.id}" data-y="${yy}" data-m="${m}">${mn}<small>${p ? (p.date ? fmtDate(p.date).replace(/ \d{4}$/, '') : '✓') : dueM ? (past ? '!' : '·') : '–'}</small></button>`;
          }))}`;
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
      body: html`${tabsBar([['infos', 'Infos'], ['pay', 'Loyers'], ['docs', 'Docs'], ['notes', 'Notes'], ['hist', 'Journal']], tab)}${body}`,
      foot: tab === 'infos' ? html`<button class="btn ghost danger" data-action="del-loc" data-id="${id}" aria-label="Supprimer">${icon('trash')}</button>
        ${!gone ? html`<button class="btn" data-action="replace" data-id="${id}">${icon('sync')} Départ</button>` : ''}
        <button class="btn primary" data-action="edit-loc" data-id="${id}">${icon('edit')} Modifier</button>` : null,
    };
  },

  recovery({ preset: code }) {
    const body = encodeURIComponent(`Clé de secours Ares Invest :\n\n${code}\n\nEn cas d'oubli de la clé d'accès : https://luxinterventions.com/locataires.html → « Clé d'accès oubliée ? ».\nNe transférez pas cet email.`);
    return {
      title: 'Votre clé de secours',
      narrow: true,
      body: html`
        <div class="alert warn" style="margin-bottom:16px">${icon('alert')}<div><b>Notez-la maintenant :</b> elle ne sera plus jamais affichée. Avec elle, on peut ouvrir le coffre et choisir une nouvelle clé d'accès. Gardez-la hors ligne (papier dans un coffre, gestionnaire de mots de passe).</div></div>
        <div style="font-family:var(--mono);font-size:22px;font-weight:700;letter-spacing:.06em;text-align:center;padding:18px 8px;background:var(--surface-2);border-radius:var(--radius);word-break:break-all" id="rcode">${code}</div>
        <div class="actions" style="margin-top:14px">
          <button class="btn" data-action="copy-recovery">${icon('file')} Copier</button>
          <button class="btn" data-action="print-recovery">${icon('download')} Imprimer</button>
          <a class="btn" href="mailto:?subject=${encodeURIComponent('Ares Invest — clé de secours')}&body=${body}">${icon('mail')} Email</a>
        </div>
        <p class="tiny muted">Email : pratique, mais toute personne qui accède à votre messagerie pourrait ouvrir le coffre. Le papier est plus sûr.</p>`,
      foot: html`<button class="btn primary" data-action="close-sheet">J'ai noté ma clé de secours</button>`,
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

async function toggleVers(immId, y, m) {
  const im = vault.get('immeubles', immId);
  if (!im) return;
  const k = payKey(immId, y, m);
  const label = `${im.adresse} — ${MONTHS_FULL[m - 1]} ${y}`;
  const prev = vault.get('versements', k);
  if (prev) {
    await vault.mutate((tx) => tx.remove('versements', k), 'Versement propriétaire annulé', label, immId);
    toast('Versement annulé · ' + MONTHS_FULL[m - 1], { undo: () => vault.mutate((tx) => tx.put('versements', { ...prev, id: k }), 'Versement propriétaire rétabli', label, immId) });
  } else {
    const montant = ownerRent(im);
    await vault.mutate((tx) => tx.put('versements', { id: k, immId, y, m, date: today(), montant }), 'Versement au propriétaire', label + ' · ' + money(montant), immId);
    toast('Versé au propriétaire · ' + money(montant), { undo: () => vault.mutate((tx) => tx.remove('versements', k), 'Versement propriétaire annulé', label, immId) });
  }
}

// Lit le champ « Logement » : logement existant, nouveau logement, ou immeuble seul.
function readPlace(fd) {
  const [kind, ref] = String(fd.get('place') || '').split(':');
  if (kind === 'log') { const g = vault.get('logements', ref); return { logId: ref, immId: g ? g.immId : '' }; }
  if (kind === 'new') return { newLog: { immId: ref, nom: String(fd.get('newLogNom') || '').trim() || 'Nouveau logement', type: fd.get('newLogType') || 'appartement' }, immId: ref };
  return { logId: '', immId: ref || '' };
}
const tenantFromForm = (fd, p = '') => ({
  nom: fd.get(p + 'nom').trim(), prenom: fd.get(p + 'prenom').trim(), loyer: num(fd.get(p + 'loyer')), type: fd.get(p + 'type'),
  tel: fd.get(p + 'tel').trim(), mail: fd.get(p + 'mail').trim(), caution: num(fd.get(p + 'caution')), cautionNote: fd.get(p + 'cautionNote').trim(),
  debut: fd.get(p + 'debut'), fin: fd.get(p + 'fin'),
});

// ───────────────────────── Rapports imprimables ─────────────────────────
function printDoc(title, body) {
  const el = $('#print');
  setHtml(el, html`<div class="pr-head"><div><b>Ares Invest</b> · ${title}</div><div>Imprimé le ${fmtDate(today())}</div></div>${body}`);
  document.body.classList.add('printing');
  const done = () => { document.body.classList.remove('printing'); setHtml(el, ''); removeEventListener('afterprint', done); };
  addEventListener('afterprint', done);
  setTimeout(() => print(), 60);
}
const prBilan = (b, withOcc) => html`<table class="tbl"><tbody>
  <tr><td>Loyers encaissés</td><td class="r green">${money(b.encaisse)}</td></tr>
  ${b.verse != null ? html`<tr><td>Versé au propriétaire</td><td class="r">${neg(b.verse)}</td></tr>` : ''}
  <tr><td>Réparations & frais</td><td class="r">${neg(b.depenses)}</td></tr>
  <tr><td><b>Gain net</b></td><td class="r"><b>${money(b.net ?? b.encaisse - b.depenses)}</b></td></tr>
  ${withOcc ? html`<tr><td>Occupants</td><td class="r">${b.occupants}</td></tr>` : ''}
</tbody></table>`;
const neg = (v) => (v ? '−' + money(v) : '—');
const mark = (ok, due) => (ok ? '✓' : due ? '✗' : '–');

function occupantsTable(ls) {
  return html`<table class="tbl"><thead><tr><th>Locataire</th><th>Logement</th><th>Entrée</th><th>Sortie</th><th>Durée</th><th class="r">Loyer</th><th class="r">Total payé</th></tr></thead><tbody>
    ${ls.map((l) => html`<tr><td>${fullName(l)}</td><td>${logName(l.logId) || '—'}</td><td>${fmtDate(l.debut) || '?'}</td><td>${l.sortie ? fmtDate(l.sortie) : 'en cours'}</td><td>${stayMonths(l) ? duree(stayMonths(l)) : '—'}</td><td class="r">${money(l.loyer)}</td><td class="r">${money(totalPaid(l))}</td></tr>`)}
  </tbody></table>`;
}

function reportImmeuble(immId, y) {
  const im = vault.get('immeubles', immId);
  const logs = logsOf(immId);
  const ls = tenantsOfImm(immId);
  const active = ls.filter((l) => MONTHS.some((_, i) => isDue(l, y, i + 1) || payment(l.id, y, i + 1))).sort((a, b) => byLogName({ nom: logName(a.logId) }, { nom: logName(b.logId) }));
  const deps = depensesOf(immId, y).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const years = yearsWithData((yy) => bilan({ immId, y: yy }));
  return html`
    <h1>${im.adresse}</h1>
    <p class="pr-sub">${im.proprietaire ? 'Propriétaire : ' + im.proprietaire + ' · ' : ''}${ownerRent(im) ? 'Bail principal : ' + money(ownerRent(im)) + ' / mois' : ''}${im.bailDebut ? ' · depuis le ' + fmtDate(im.bailDebut) : ''}</p>
    <div class="pr-cols"><div><h2>Bilan ${y}</h2>${prBilan(bilan({ immId, y }))}</div><div><h2>Depuis l'origine</h2>${prBilan(bilan({ immId }), true)}</div></div>
    ${years.length > 1 ? html`<h2>Par année</h2>${bilanTable(years)}` : ''}
    ${logs.length ? html`<h2>Logements</h2><table class="tbl"><thead><tr><th>Logement</th><th>Type</th><th>Occupant actuel</th><th class="r">Occupants</th><th class="r">Occupation</th><th class="r">Encaissé total</th></tr></thead><tbody>
      ${logs.map((g) => { const o = occupancy(g.id); const bb = bilan({ logId: g.id }); return html`<tr><td>${g.nom}</td><td>${LOG_TYPES[g.type] || ''}</td><td>${occupantsNow(g.id).map(fullName).join(', ') || 'Vacant'}</td><td class="r">${bb.occupants}</td><td class="r">${o ? pct(o.occupied, o.total) + '%' : '—'}</td><td class="r">${money(bb.encaisse)}</td></tr>`; })}
    </tbody></table>` : ''}
    ${active.length ? html`<h2>Loyers ${y}</h2><table class="tbl pr-grid"><thead><tr><th>Locataire</th><th>Logement</th><th class="r">Loyer</th>${MONTHS.map((m) => html`<th>${m}</th>`)}<th class="r">Payé</th><th class="r">Reste</th></tr></thead><tbody>
      ${active.map((l) => { const st = yearStats(l, y); return html`<tr><td>${fullName(l)}</td><td>${logName(l.logId)}</td><td class="r">${money(l.loyer)}</td>${MONTHS.map((_, i) => html`<td class="c">${mark(payment(l.id, y, i + 1), isDue(l, y, i + 1))}</td>`)}<td class="r">${money(st.paid)}</td><td class="r">${money(Math.max(st.due - st.paid, 0))}</td></tr>`; })}
    </tbody></table>` : ''}
    ${ownerRent(im) ? html`<h2>Versements au propriétaire ${y}</h2><table class="tbl pr-grid"><thead><tr>${MONTHS.map((m) => html`<th>${m}</th>`)}<th class="r">Total versé</th></tr></thead><tbody><tr>${MONTHS.map((_, i) => html`<td class="c">${mark(versement(immId, y, i + 1), isOwnerDue(im, y, i + 1))}</td>`)}<td class="r">${money(sum(versementsOf(immId, y), (v) => v.montant))}</td></tr></tbody></table>` : ''}
    ${deps.length ? html`<h2>Dépenses ${y}</h2><table class="tbl"><thead><tr><th>Date</th><th>Description</th><th>Concerne</th><th class="r">Montant</th></tr></thead><tbody>${deps.map((d) => html`<tr><td>${fmtDate(d.date)}</td><td>${d.desc}</td><td>${logName(d.logId) || 'Immeuble'}</td><td class="r">${money(d.montant)}</td></tr>`)}</tbody></table>` : ''}
    ${ls.length ? html`<h2>Historique des occupants</h2>${occupantsTable([...ls].sort(byDebut))}` : ''}`;
}

function reportLogement(logId) {
  const g = vault.get('logements', logId);
  const b = bilan({ logId });
  const o = occupancy(logId);
  return html`
    <h1>${g.nom} — ${immName(g.immId)}</h1>
    <p class="pr-sub">${LOG_TYPES[g.type] || ''}${g.surface ? ' · ' + g.surface + ' m²' : ''}${o ? ` · occupé ${pct(o.occupied, o.total)}% du temps, ${duree(o.vacant)} de vacance` : ''}</p>
    <h2>Bilan depuis l'origine</h2>${prBilan({ ...b, verse: null, net: b.encaisse - b.depenses }, true)}
    <h2>Par année</h2>${bilanTable(yearsWithData((yy) => bilan({ logId, y: yy })))}
    <h2>Occupants successifs</h2>${occupantsTable(tenantsOfLog(logId))}`;
}

function reportGlobal(y, details) {
  const imms = vault.list('immeubles').sort(byAddr);
  const rows = imms.map((im) => ({ im, a: bilan({ immId: im.id, y }), o: bilan({ immId: im.id }) }));
  const T = (k, f) => sum(rows, (r) => r[k][f]);
  return html`
    <h1>Rapport ${y}</h1>
    <p class="pr-sub">${plural(imms.length, 'immeuble')} · ${plural(vault.list('logements').length, 'logement')} · ${plural(currentLocs().length, 'locataire')} actuels</p>
    <h2>Année ${y}</h2>
    <table class="tbl"><thead><tr><th>Immeuble</th><th class="r">Encaissé</th><th class="r">Propriétaire</th><th class="r">Dépenses</th><th class="r">Gain net</th></tr></thead><tbody>
      ${rows.map(({ im, a }) => html`<tr><td>${im.adresse}</td><td class="r">${money(a.encaisse)}</td><td class="r">${neg(a.verse)}</td><td class="r">${neg(a.depenses)}</td><td class="r">${money(a.net)}</td></tr>`)}
      <tr><td><b>Total</b></td><td class="r"><b>${money(T('a', 'encaisse'))}</b></td><td class="r"><b>${neg(T('a', 'verse'))}</b></td><td class="r"><b>${neg(T('a', 'depenses'))}</b></td><td class="r"><b>${money(T('a', 'net'))}</b></td></tr>
    </tbody></table>
    <h2>Depuis l'origine</h2>
    <table class="tbl"><thead><tr><th>Immeuble</th><th class="r">Occupants</th><th class="r">Encaissé</th><th class="r">Propriétaire</th><th class="r">Dépenses</th><th class="r">Gain net</th></tr></thead><tbody>
      ${rows.map(({ im, o }) => html`<tr><td>${im.adresse}</td><td class="r">${o.occupants}</td><td class="r">${money(o.encaisse)}</td><td class="r">${neg(o.verse)}</td><td class="r">${neg(o.depenses)}</td><td class="r">${money(o.net)}</td></tr>`)}
      <tr><td><b>Total</b></td><td class="r"><b>${T('o', 'occupants')}</b></td><td class="r"><b>${money(T('o', 'encaisse'))}</b></td><td class="r"><b>${neg(T('o', 'verse'))}</b></td><td class="r"><b>${neg(T('o', 'depenses'))}</b></td><td class="r"><b>${money(T('o', 'net'))}</b></td></tr>
    </tbody></table>
    ${details ? imms.map((im) => html`<section class="pr-page">${reportImmeuble(im.id, y)}</section>`) : ''}`;
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
  'new-loc': (d) => openSheet('loc-form', null, null, d.log),
  'edit-loc': (d) => openSheet('loc-form', d.id),
  'open-loc': (d) => openSheet('loc', d.id),
  'sheet-tab': (d) => { ui.sheet.tab = d.id; ui.sheet.rendered = false; renderSheet(); sheetEl.querySelector('.sheet-body').scrollTop = 0; },
  'open-imm': (d) => openSheet('imm', d.id, d.tab),
  'open-log': (d) => openSheet('log', d.id, d.tab),
  'new-log': (d) => openSheet('log-form', null, null, d.imm),
  'edit-log': (d) => openSheet('log-form', d.id),
  replace: (d) => openSheet('replace-form', d.id),
  'toggle-vers': (d) => toggleVers(d.imm, +d.y, +d.m),
  'loc-seg': (d) => { ui.locSeg = d.id; renderView(); },
  'close-sheet': () => closeSheet(),
  'lock-mode': (d) => renderLock(d.id),
  async 'make-recovery'() {
    if (!navigator.onLine) return toast('Connexion requise', { bad: true });
    const k = await promptKey('Clé de secours', (vault.hasRecovery ? 'Une nouvelle clé de secours remplacera l’ancienne, qui ne fonctionnera plus. ' : '') + 'Saisissez votre clé d’accès actuelle pour continuer.');
    if (!k) return;
    if (!(await vault.verifyPassphrase(k))) return toast("Clé d'accès incorrecte", { bad: true });
    try {
      const code = await vault.createRecovery();
      openSheet('recovery', null, null, code);
      if (ui.route === 'reglages' || ui.route === 'dashboard') renderView();
    } catch (e) {
      toast(e.message || 'Erreur', { bad: true });
    }
  },
  'copy-recovery': async () => {
    try { await navigator.clipboard.writeText($('#rcode').textContent.trim()); toast('Clé copiée'); } catch { toast('Copie impossible : notez-la à la main', { bad: true }); }
  },
  'print-recovery': () => printDoc('Clé de secours', html`<h1>Clé de secours</h1><p class="pr-sub">À conserver en lieu sûr. En cas d'oubli de la clé d'accès : luxinterventions.com/locataires.html → « Clé d'accès oubliée ? »</p><div style="font:700 26px/1.4 monospace;letter-spacing:.08em;border:2px solid #000;padding:24px;text-align:center;margin-top:24px">${ui.sheet && ui.sheet.preset}</div>`),
  'print-imm': (d) => printDoc('Rapport immeuble', reportImmeuble(d.id, ui.year)),
  'print-log': (d) => printDoc('Rapport logement', reportLogement(d.id)),
  async 'print-global'() {
    const c = await choiceBox('Imprimer le rapport ' + ui.year, 'Le résumé tient sur une page. Le rapport complet ajoute le détail de chaque immeuble (loyers mois par mois, dépenses, occupants).', [{ value: 'short', label: 'Résumé' }, { value: 'full', label: 'Complet', cls: 'primary' }]);
    if (c) printDoc('Rapport ' + ui.year, reportGlobal(ui.year, c === 'full'));
  },
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
    if (!(await confirmBox(`Supprimer « ${im.adresse} » ?`, { ok: 'Supprimer', danger: true, detail: `Tout sera effacé définitivement, y compris l'historique : ${plural(ls.length, 'locataire')}, logements, paiements, versements, dépenses et documents. Les statistiques de cet immeuble seront perdues.` }))) return;
    const docs = vault.list('documents').filter((doc) => ls.some((l) => l.id === doc.locId));
    await vault.mutate((tx) => {
      tx.remove('immeubles', d.id);
      for (const l of ls) tx.remove('locataires', l.id);
      for (const p of vault.list('paiements')) if (ls.some((l) => l.id === p.locId)) tx.remove('paiements', p.id);
      for (const x of depensesOf(d.id)) tx.remove('depenses', x.id);
      for (const g of logsOf(d.id)) tx.remove('logements', g.id);
      for (const v of versementsOf(d.id)) tx.remove('versements', v.id);
      for (const doc of docs) tx.remove('documents', doc.id);
    }, 'Immeuble supprimé', im.adresse, d.id);
    for (const doc of docs) await vault.deleteFile(doc.id);
    closeSheet();
    toast('Immeuble supprimé');
  },
  async 'del-loc'(d) {
    const l = vault.get('locataires', d.id);
    if (!(await confirmBox(`Supprimer définitivement ${fullName(l)} ?`, { ok: 'Supprimer', danger: true, detail: isCurrent(l) ? 'Si le locataire part, utilisez plutôt « Départ » : il sera archivé et ses loyers resteront dans les statistiques. La suppression efface aussi ses paiements et documents.' : 'Ses paiements et documents seront effacés et disparaîtront des statistiques.' }))) return;
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
  async 'del-log'(d) {
    const g = vault.get('logements', d.id);
    const ls = tenantsOfLog(d.id);
    if (ls.length) return toast(`Impossible : ${plural(ls.length, 'occupant')} enregistré${ls.length > 1 ? 's' : ''} dans ce logement (historique).`, { bad: true });
    if (!(await confirmBox(`Supprimer « ${g.nom} » ?`, { ok: 'Supprimer', danger: true }))) return;
    await vault.mutate((tx) => tx.remove('logements', d.id), 'Logement supprimé', g.nom, g.immId);
    openSheet('imm', g.immId);
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
  async 'wipe-all'() {
    const k = await promptKey('Effacer toutes les données ?', 'Tout sera supprimé sur tous les appareils : immeubles, logements, locataires, paiements, dépenses et documents. Faites d’abord une sauvegarde chiffrée si besoin. Saisissez votre clé d’accès pour confirmer.');
    if (!k) return;
    if (!(await vault.verifyPassphrase(k))) return toast("Clé d'accès incorrecte", { bad: true });
    if (!(await confirmBox('Dernière confirmation', { ok: 'Tout effacer', danger: true, detail: 'Cette action est irréversible.' }))) return;
    await vault.wipeAll();
    ui.immFilter = '';
    toast('Toutes les données ont été effacées');
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
  recover: onRecover,
  newkey: onNewKey,
  async imm(fd) {
    const id = fd.get('id');
    const rec = {
      adresse: fd.get('adresse').trim(), proprietaire: fd.get('proprietaire').trim(), loyer: num(fd.get('loyer')), charges: num(fd.get('charges')),
      bailDebut: fd.get('bailDebut'), bailFin: fd.get('bailFin'), note: fd.get('note').trim(),
    };
    if (id) rec.id = id;
    const saved = await vault.mutate((tx) => tx.put('immeubles', rec), id ? 'Immeuble modifié' : 'Immeuble ajouté', rec.adresse);
    toast(id ? 'Immeuble enregistré' : 'Immeuble ajouté');
    openSheet('imm', saved.id);
  },
  async log(fd) {
    const id = fd.get('id');
    const rec = {
      nom: fd.get('nom').trim(), immId: fd.get('immId'), type: fd.get('type'), surface: fd.get('surface') ? num(fd.get('surface')) : '',
      etage: fd.get('etage').trim(), loyer: num(fd.get('loyer')), note: fd.get('note').trim(),
    };
    if (id) rec.id = id;
    const saved = await vault.mutate((tx) => {
      const g = tx.put('logements', rec);
      for (const l of tenantsOfLog(g.id)) if (l.immId !== g.immId) tx.put('locataires', { id: l.id, immId: g.immId });
      return g;
    }, id ? 'Logement modifié' : 'Logement ajouté', `${rec.nom} (${immName(rec.immId)})`, rec.immId);
    toast(id ? 'Logement enregistré' : 'Logement ajouté');
    openSheet('log', saved.id);
  },
  async loc(fd) {
    const id = fd.get('id');
    const prev = id ? vault.get('locataires', id) : null;
    const place = readPlace(fd);
    if (!place.immId) return toast('Choisissez un logement ou un immeuble', { bad: true });
    const rec = { ...tenantFromForm(fd), id: id || uid(), immId: place.immId, logId: place.logId || '' };
    if (id) {
      rec.sortie = fd.get('sortie') || '';
      rec.cautionRendue = fd.get('cautionRendue') === '' ? null : num(fd.get('cautionRendue'));
    }
    // Nouveau locataire dans un logement déjà occupé → avertir et proposer le remplacement.
    let replaced = [];
    if (place.logId && (!prev || prev.logId !== place.logId) && !(rec.sortie && rec.sortie < today())) {
      const from = rec.debut || today();
      const occ = tenantsOfLog(place.logId).filter((o) => o.id !== rec.id && (!o.sortie || o.sortie >= from));
      if (occ.length) {
        const names = occ.map(fullName).join(', ');
        const choice = await choiceBox(
          `${logName(place.logId)} est déjà occupé`,
          `${names} occupe${occ.length > 1 ? 'nt' : ''} ce logement. Remplacer : ${names} sera archivé avec une sortie au ${fmtDate(addDays(from, -1))}, ses loyers restent dans les statistiques. Colocation : les deux restent en place.`,
          [{ value: 'coloc', label: 'Colocation' }, { value: 'replace', label: 'Remplacer', cls: 'primary' }]
        );
        if (!choice) return;
        if (choice === 'replace') replaced = occ;
      }
    }
    const where = place.newLog ? place.newLog.nom : logName(place.logId) || immName(place.immId);
    const saved = await vault.mutate((tx) => {
      if (place.newLog) rec.logId = tx.put('logements', place.newLog).id;
      for (const o of replaced) tx.put('locataires', { id: o.id, sortie: addDays(rec.debut || today(), -1) });
      return tx.put('locataires', rec);
    }, replaced.length ? 'Locataire remplacé' : id ? 'Locataire modifié' : 'Locataire ajouté',
    replaced.length ? `${replaced.map(fullName).join(', ')} → ${fullName(rec)} (${where})` : `${fullName(rec)} (${where})`, rec.id);
    toast(replaced.length ? 'Locataire remplacé, ancien locataire archivé' : id ? 'Locataire enregistré' : 'Locataire ajouté');
    openSheet('loc', saved.id);
  },
  async replace(fd) {
    const old = vault.get('locataires', fd.get('id'));
    if (!old) return;
    const sortie = fd.get('sortie');
    const where = logName(old.logId) || immName(old.immId);
    const upd = { id: old.id, sortie, cautionRendue: fd.get('cautionRendue') === '' ? null : num(fd.get('cautionRendue')), sortieNote: fd.get('sortieNote').trim() };
    const nu = fd.get('vacant') ? null : { ...tenantFromForm(fd, 'n_'), id: uid(), immId: old.immId, logId: old.logId || '' };
    if (nu && nu.debut && nu.debut <= sortie && !(await confirmBox('Dates qui se chevauchent', { ok: 'Continuer', detail: `Le nouveau locataire entre le ${fmtDate(nu.debut)}, avant ou le jour de la sortie de ${fullName(old)} (${fmtDate(sortie)}).` }))) return;
    await vault.mutate((tx) => {
      tx.put('locataires', upd);
      if (nu) tx.put('locataires', nu);
    }, nu ? 'Locataire remplacé' : 'Départ enregistré', nu ? `${fullName(old)} → ${fullName(nu)} (${where}), sortie le ${fmtDate(sortie)}` : `${fullName(old)} quitte ${where} le ${fmtDate(sortie)}`, old.id);
    toast(nu ? `${fullName(nu)} enregistré · ${fullName(old)} archivé` : 'Départ enregistré · logement vacant');
    if (old.logId) openSheet('log', old.logId); else openSheet('loc', nu ? nu.id : old.id);
  },
  async notes(fd) {
    const l = vault.get('locataires', fd.get('id'));
    await vault.mutate((tx) => tx.put('locataires', { id: l.id, notes: fd.get('notes') }), 'Notes modifiées', fullName(l), l.id);
    toast('Notes enregistrées');
  },
  async dep(fd, form) {
    const rec = { immId: fd.get('immId'), logId: fd.get('logId') || '', desc: fd.get('desc').trim(), montant: num(fd.get('montant')), date: fd.get('date'), cat: fd.get('cat') };
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
      await vault.importState(obj);
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
  if (k === 'place') {
    const isNew = e.target.value.startsWith('new:');
    $('#newLogWrap').hidden = !isNew;
    $('#newLogWrap [name=newLogNom]').required = isNew;
    const g = e.target.value.startsWith('log:') && vault.get('logements', e.target.value.slice(4));
    const loyer = e.target.form.loyer;
    if (g && g.loyer && loyer && !loyer.value) loyer.value = g.loyer;
  }
  if (k === 'vacant') $('#newTenant').disabled = e.target.checked;
  // Formulaire de changement : l'entrée du nouveau locataire suit par défaut la date de sortie.
  const f = e.target.form;
  if (f && f.dataset.form === 'replace' && e.target.name === 'sortie' && e.target.value && f.n_debut) f.n_debut.value = addDays(e.target.value, 1);
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
