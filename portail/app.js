// LuxInterventions — Portail Gérance / Syndic
// Plusieurs utilisateurs et plusieurs gérances : chacun voit uniquement ses résidences et ses demandes,
// l'équipe LuxInterventions (rôle « admin ») voit tout et traite les demandes.

import { startI18n, LOCALES, translate as T } from '/ares/i18n.js';
import { PTL_INVITE } from '/ares/ptl-invite.js';
import { videoEmbed } from '/ares/video-embed.js';
import { pubStatInit, pubSeen, pubTap } from '/ares/pubstat.js';

const VERSION = '1.6.0';
// Langue du portail : choisie par l'utilisateur, sinon celle du téléphone (français par défaut)
const PTL_LANGS = { fr: 'Français', de: 'Deutsch', en: 'English', it: 'Italiano', pt: 'Português', es: 'Español' };
const LANG = (() => {
  try { const l = localStorage.getItem('ptlLang'); if (PTL_LANGS[l]) return l; } catch {}
  const n = (navigator.language || '').slice(0, 2).toLowerCase();
  return PTL_LANGS[n] ? n : 'fr';
})();
const LOC = LOCALES[LANG] || 'fr-LU';
await startI18n(LANG, (l) => import(`./i18n/${l}.js`));
// le service worker traduit les notifications push dans cette langue
try { caches.open('ptl-pref').then((c) => c.put('/__ptl-lang', new Response(LANG))).catch(() => {}); } catch {}

// Message d'invitation (email / WhatsApp) dans la langue du portail
const INVITE = PTL_INVITE;
const API = document.querySelector('meta[name="ptl-api"]').content.replace(/\/$/, '') + '/api/portail/';
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
  wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L3.5 17.3a1.8 1.8 0 0 0 2.5 2.5l5.8-5.8a4 4 0 0 0 5.2-5.4l-2.6 2.6-2.4-.4-.4-2.4 2.6-2.1Z"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10.3 21a2 2 0 0 0 3.4 0"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  send: '<path d="M21 3 10 14M21 3l-7 18-4-7-7-4 18-7Z"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
};
const icon = (n) => new Raw(`<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`);

// ───────────────────────── Libellés ─────────────────────────
const STATUS = {
  recue: { label: 'Reçue', cls: 'bad', step: 0 },
  prise: { label: 'Prise en charge', cls: 'warn', step: 1 },
  planifiee: { label: 'Planifiée', cls: 'acc', step: 2 },
  encours: { label: 'En cours', cls: 'acc', step: 3 },
  terminee: { label: 'Terminée', cls: 'ok', step: 4 },
  annulee: { label: 'Annulée', cls: '', step: -1 },
};
const STEPS = ['recue', 'prise', 'planifiee', 'encours', 'terminee'];
const URG = {
  urgent: { label: 'Urgent', sub: 'Intervention sous 2 h', dot: '🔴', cls: 'bad' },
  '24h': { label: 'Sous 24 h', sub: 'Dans la journée', dot: '🟠', cls: 'warn' },
  planifie: { label: 'Planifié', sub: 'À convenir', dot: '🟢', cls: 'ok' },
};
const CATEGORIES = ['Plomberie', 'Électricité', 'Chauffage', 'Chaudière', 'Radiateurs', 'Sanitaire', 'Maçonnerie', 'Carrelage', 'Pose de panneaux', 'Peinture', 'Panneaux solaires', 'Serrurerie', 'Toiture / façade', 'Vitrerie', 'Menuiserie', 'Nettoyage', 'Espaces verts', 'Ascenseur', 'Autre'];
// Ce qu'il faut faire et où (enregistré en clair dans « categorie » et « lieu », séparé par « · »)
const NATURES = ['Réparer', 'Nettoyer', 'Refaire', 'Remplacer', 'Installer / poser', 'Contrôler'];
const ZONES = ['Appartement', 'Chambre', 'Box / garage', 'Cave', 'Jardin commun', 'Parties communes / hall', 'Cage d’escalier', 'Toiture / façade', 'Chaufferie / local technique', 'Parking / extérieur', 'Autre'];
// Morceaux « A · B · C » : chacun dans son <span> pour être traduit séparément ; « Étage 2 » → « Étage » + 2
const partsHtml = (s) => String(s || '').split(' · ').filter(Boolean).map((x, i) => { const m = /^(Étage|Date souhaitée :) (.+)$/.exec(x); return html`${i ? ' · ' : ''}${m ? html`<span>${m[1]}</span> ${m[2]}` : html`<span>${x}</span>`}`; });
const ROLES = { admin: 'LuxInterventions', gerance_admin: 'Responsable gérance', gerance_user: 'Utilisateur gérance' };
// Fiche d'évaluation d'une intervention terminée (remplie par la gérance, enregistrée comme message du suivi)
const EVAL_CRIT = [
  ['rapidite', 'Rapidité & ponctualité', 'Délais de réponse et d’arrivée'],
  ['competence', 'Compétence technique', 'Résolution efficace de la panne'],
  ['courtoisie', 'Courtoisie & disponibilité', 'Relation avec le personnel'],
  ['proprete', 'Propreté & ordre', 'Soin des lieux en fin de travaux'],
];
const EVAL_LVL = [['1', '😞', 'Insuffisant'], ['2', '😐', 'Suffisant'], ['3', '🙂', 'Bon'], ['4', '⭐', 'Excellent']];
const EVAL_GLOBAL = [['ok', 'Satisfait'], ['part', 'Partiellement satisfait'], ['ko', 'Non satisfait']];
const EVAL_HEAD = '⭐ Évaluation de l’intervention';
// le texte enregistré est en français (lisible tel quel par l'équipe) ; on le relit pour l'afficher dans la langue de chacun
function evalText(ref, v) {
  const lvl = (k) => { const l = EVAL_LVL.find((x) => x[0] === k); return l ? l[1] + ' ' + l[2] : '—'; };
  return [`${EVAL_HEAD} #${ref}`, ...EVAL_CRIT.map(([k, l]) => `${l} : ${lvl(v[k])}`), `Avis global : ${(EVAL_GLOBAL.find((g) => g[0] === v.global) || ['', '—'])[1]}`,
    v.notes ? `Notes : ${v.notes}` : '', `Rempli et confirmé par : ${v.nom}`].filter(Boolean).join('\n');
}
function evalParse(text) {
  if (!text || !text.startsWith(EVAL_HEAD)) return null;
  const v = {};
  for (const line of text.split('\n').slice(1)) {
    const i = line.indexOf(' : '); if (i < 0) continue;
    const k = line.slice(0, i), val = line.slice(i + 3);
    const c = EVAL_CRIT.find((x) => x[1] === k);
    if (c) v[c[0]] = (EVAL_LVL.find((l) => val === l[1] + ' ' + l[2]) || [])[0];
    else if (k === 'Avis global') v.global = (EVAL_GLOBAL.find((g) => g[1] === val) || [])[0];
    else if (k === 'Notes') v.notes = val;
    else if (k === 'Rempli et confirmé par') v.nom = val;
  }
  return v;
}
function evalCard(v, e) {
  const lvl = (k) => EVAL_LVL.find((l) => l[0] === k);
  return html`<div class="card eval-sum" style="margin-bottom:12px">
    <div class="eval-title">⭐ <span>Évaluation de l’intervention</span></div>
    <div class="eval-rows">${EVAL_CRIT.map(([k, l]) => { const x = lvl(v[k]); return html`<div class="eval-row"><span>${l}</span><b>${x ? html`${x[1]} <span>${x[2]}</span>` : '—'}</b></div>`; })}
      <div class="eval-row"><span>Avis global</span><b>${(EVAL_GLOBAL.find((g) => g[0] === v.global) || ['', '—'])[1]}</b></div></div>
    ${v.notes ? html`<div class="tl-text">${v.notes}</div>` : ''}
    <div class="tiny muted" style="margin-top:8px">✍️ <span>Rempli et confirmé par</span> <b>${v.nom || '—'}</b>${e ? ' · ' + fmtDateTime(e.created_at) : ''}</div></div>`;
}

const MONTHS_FULL = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

const fmtDateTime = (t) => (t ? new Date(t).toLocaleString(LOC, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
const fmtDate = (t) => (t ? new Date(t).toLocaleDateString(LOC, { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const fmtPlanned = (s) => (s ? new Date(s).toLocaleString(LOC, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
function ago(t) {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24);
  return `il y a ${d} j`;
}
function duration(ms) {
  if (ms == null) return '—';
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h} h ${String(m % 60).padStart(2, '0')}`;
  return `${Math.round(h / 24)} jours`;
}
const initials = (name) => String(name || '?').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

// ───────────────────────── État ─────────────────────────
const state = {
  token: null,
  me: null,
  vapidKey: null,
  route: 'home',
  cache: {},
  filters: { scope: 'active', urg: '', org: '', residence: '', q: '' },
  sheet: null,
};
const isAdmin = () => state.me && state.me.role === 'admin';
const isManager = () => state.me && state.me.role !== 'gerance_user';

try { state.token = localStorage.getItem('ptlToken'); } catch {}

// ───────────────────────── API ─────────────────────────
class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
async function api(path, opts = {}) {
  if (state.demo) {
    const r = await state.demo.api(path, opts);
    const notes = state.demo.takeNotices();
    notes.forEach((n, i) => setTimeout(() => toast(n), 900 + i * 400));
    return r;
  }
  const headers = { ...(opts.headers || {}) };
  if (state.token) headers.Authorization = 'Bearer ' + state.token;
  let body = opts.body;
  if (body && !(body instanceof Blob) && !(body instanceof ArrayBuffer) && typeof body !== 'string') {
    body = JSON.stringify(body);
    headers['Content-Type'] = 'application/json';
  }
  let r;
  try {
    r = await fetch(API + path, { method: opts.method || 'GET', headers, body, cache: 'no-store' });
  } catch {
    throw new ApiError(0, 'Pas de connexion internet');
  }
  if (r.status === 401 && state.me) {
    logout('Votre session a expiré. Reconnectez-vous.');
    throw new ApiError(401, 'Session expirée');
  }
  if (opts.raw) {
    if (!r.ok) throw new ApiError(r.status, 'Erreur ' + r.status);
    return r;
  }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new ApiError(r.status, j.error || 'Erreur ' + r.status);
  return j;
}

// Mot de passe → clé dérivée dans le navigateur (PBKDF2) ; le serveur ne voit jamais le mot de passe.
const hexOf = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
async function deriveKey(password, saltB64, iter) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password.normalize('NFC')), 'PBKDF2', false, ['deriveBits']);
  const salt = Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0));
  return hexOf(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, base, 256));
}
async function newCredentials(password, iter) {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const salt = btoa(String.fromCharCode(...saltBytes));
  const key = await deriveKey(password, salt, iter);
  const authHash = hexOf(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key)));
  return { salt, authHash };
}

// ───────────────────────── Toasts & dialogues ─────────────────────────
function toast(msg, opts = {}) {
  const el = document.createElement('div');
  el.className = 'toast' + (opts.bad ? ' bad' : '');
  el.setAttribute('role', 'status');
  setHtml(el, html`<span>${msg}</span>`);
  $('#toasts').append(el);
  setTimeout(() => el.remove(), 3500);
}
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

function setBusy(btn, busy, label) {
  if (!btn) return;
  if (busy) { btn.dataset.label = btn.innerHTML; btn.disabled = true; setHtml(btn, html`<span class="spinner"></span> ${label || ''}`); }
  else { btn.disabled = false; if (btn.dataset.label) btn.innerHTML = btn.dataset.label; }
}

// ───────────────────────── Écrans d'accès ─────────────────────────
const lockEl = $('#lock');
const appEl = $('#app');
const brandHead = () => html`
  <img class="lock-banner" src="/portail/icons/ptl-banner.webp" alt="Terre · Eau · Feu · Air — LuxInterventions" width="1100" height="283">
  <div class="lock-head"><h1>Portail Gérance</h1><p>LuxInterventions · Interventions techniques 7j/7</p></div>
  ${langMini()}`;
// écran d'accès : initiales seules « FR | DE | EN … »
const langMini = () => html`<div class="lang-mini" data-notr="1" role="group" aria-label="Langue">${['fr', 'de', 'en', 'it', 'pt', 'es'].map((k) => html`<button type="button" data-action="set-lang" data-id="${k}" title="${PTL_LANGS[k]}" aria-pressed="${LANG === k}">${k.toUpperCase()}</button>`)}</div>`;
const pwField = (name, placeholder, autocomplete) => html`<div class="pw-wrap">
  <input type="password" name="${name}" placeholder="${placeholder}" autocomplete="${autocomplete}" required autocapitalize="off" autocorrect="off" spellcheck="false">
  <button class="btn icon" type="button" data-action="toggle-pw" aria-label="Afficher">${icon('eye')}</button></div>`;

function renderLock(mode, data = {}) {
  appEl.hidden = true;
  lockEl.hidden = false;
  if (mode === 'checking') {
    setHtml(lockEl, html`<div class="lock-card">${brandHead()}<div style="display:flex;justify-content:center;padding:12px"><div class="spinner accent"></div></div></div>`);
    return;
  }
  if (mode === 'setup') {
    setHtml(lockEl, html`<form class="lock-card" data-form="setup" autocomplete="off">${brandHead()}
      <div class="alert info">${icon('key')}<div><b>Première configuration.</b> Créez le compte administrateur LuxInterventions.</div></div>
      <label class="field">Code de configuration <input name="code" type="password" required placeholder="PORTAIL_SETUP_CODE"></label>
      <label class="field">Votre nom <input name="name" required autocomplete="name"></label>
      <label class="field">Email <input name="email" type="email" required autocomplete="email"></label>
      <label class="field">Mot de passe ${pwField('pass', 'Au moins 10 caractères', 'new-password')}</label>
      <label class="field">Confirmer ${pwField('pass2', 'Retapez le mot de passe', 'new-password')}</label>
      <div class="lock-err" role="alert"></div>
      <button class="btn primary block" type="submit">Créer le compte</button></form>`);
    return;
  }
  if (mode === 'invite') {
    setHtml(lockEl, html`<form class="lock-card" data-form="invite" autocomplete="off">${brandHead()}
      <div class="alert info">${icon('users')}<div>Bienvenue <b>${data.name}</b> — ${data.org}.<br>Choisissez votre mot de passe <b>une seule fois</b> : ensuite vous vous connecterez avec votre email et ce mot de passe.</div></div>
      <input type="hidden" name="token" value="${data.token}">
      <input type="text" name="username" value="${data.email}" autocomplete="username" readonly class="muted">
      <label class="field">Mot de passe ${pwField('pass', 'Au moins 10 caractères', 'new-password')}</label>
      <label class="field">Confirmer ${pwField('pass2', 'Retapez le mot de passe', 'new-password')}</label>
      <div class="lock-err" role="alert"></div>
      <button class="btn primary block" type="submit">Activer mon accès</button>
      <p class="tiny muted" style="text-align:center">En activant votre accès, vous confirmez avoir pris connaissance de la <a href="/confidentialite.html" target="_blank" rel="noopener">politique de confidentialité</a>.</p></form>`);
    return;
  }
  if (mode === 'invalid-invite') {
    setHtml(lockEl, html`<div class="lock-card">${brandHead()}<div class="alert bad">${icon('alert')}<div>${data.message}</div></div>
      <button class="btn block" data-action="to-login">Aller à la connexion</button></div>`);
    return;
  }
  setHtml(lockEl, html`<form class="lock-card" data-form="login">${brandHead()}
    <label class="field">Email <input name="email" type="email" required autocomplete="username" value="${data.email || ''}"></label>
    <label class="field">Mot de passe ${pwField('pass', '••••••••••', 'current-password')}</label>
    <div class="lock-err" role="alert">${data.message || ''}</div>
    <button class="btn primary block" type="submit">Se connecter</button>
    <p class="tiny muted" style="text-align:center">Première fois ? Ouvrez le <b>lien personnel</b> reçu par email ou WhatsApp : vous y choisirez votre mot de passe.<br>Mot de passe oublié ? Demandez un nouveau lien à votre responsable ou à LuxInterventions.</p>
    <button class="btn ghost block" type="button" data-action="demo-start">${icon('eye')} Découvrir le portail en mode démo</button>
    <p class="tiny muted" style="text-align:center"><a href="/confidentialite.html" target="_blank" rel="noopener">Confidentialité</a> · <a href="/mentions-legales.html" target="_blank" rel="noopener">Mentions légales</a></p>
  </form>`);
  setTimeout(() => lockEl.querySelector('[name=email]')?.focus(), 50);
}

async function startDemo(role) {
  const { createDemo } = await import('./demo.js');
  state.demo = createDemo();
  if (role) state.demo.switchTo(role);
  state.token = null;
  history.replaceState(null, '', location.pathname + '#demo');
  await startSession();
}

async function boot() {
  renderLock('checking');
  if (location.hash === '#demo') return startDemo();
  const inv = location.hash.match(/invite=([0-9a-f]{64})/);
  if (inv) {
    try {
      const d = await api('invite/' + inv[1]);
      history.replaceState(null, '', location.pathname);
      return renderLock('invite', { ...d, token: inv[1] });
    } catch (e) {
      history.replaceState(null, '', location.pathname);
      return renderLock('invalid-invite', { message: e.message });
    }
  }
  if (state.token) {
    try { return await startSession(); } catch (e) { if (e.status !== 401) return renderLock('login', { message: e.message }); }
  }
  try {
    const st = await api('status');
    renderLock(st.configured ? 'login' : 'setup');
  } catch (e) {
    renderLock('login', { message: e.message });
  }
}

function checkPasswords(form) {
  const p = form.pass.value;
  if (p.length < 10) return 'Mot de passe trop court (10 caractères minimum).';
  if (p !== form.pass2.value) return 'Les deux mots de passe ne correspondent pas.';
  return '';
}

async function login(email, password) {
  const pre = await api('prelogin', { method: 'POST', body: { email } });
  const authKey = await deriveKey(password, pre.salt, pre.iter);
  const { token } = await api('login', { method: 'POST', body: { email, authKey } });
  saveToken(token);
}
function saveToken(token) {
  state.token = token;
  try { localStorage.setItem('ptlToken', token); localStorage.setItem('ptlEmail', state.lastEmail || ''); } catch {}
}

async function startSession() {
  const me = await api('me');
  state.me = me.user;
  state.vapidKey = me.vapidKey;
  lockEl.hidden = true;
  setHtml(lockEl, '');
  appEl.hidden = false;
  renderShell();
  const h = state.demo ? '' : location.hash.slice(2);
  const t = h.match(/^t\/([a-z0-9]+)/);
  go(t ? 'demandes' : h || 'home', true);
  if (t) openTicket(t[1]);
  startPolling();
  initPush();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('/portail-sw.js', { scope: '/portail' }).catch(() => {});
}

async function logout(message) {
  if (state.demo) { location.href = location.pathname; return; }
  if (state.token && !message) { try { await api('logout', { method: 'POST' }); } catch {} }
  state.token = null;
  state.me = null;
  state.cache = {};
  try { localStorage.removeItem('ptlToken'); } catch {}
  stopPolling();
  document.querySelectorAll('dialog[open]').forEach((d) => d.close());
  setHtml(appEl, '');
  let email = '';
  try { email = localStorage.getItem('ptlEmail') || ''; } catch {}
  renderLock('login', { message: message || '', email });
}

// ───────────────────────── Actualisation automatique ─────────────────────────
let pollTimer = null;
function startPolling() {
  stopPolling();
  pollTimer = setInterval(() => { if (document.visibilityState === 'visible' && state.me) refresh(true); }, 30000);
}
function stopPolling() { clearInterval(pollTimer); }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && state.me) refresh(true); });

async function refresh(silent) {
  try {
    await loadRoute(state.route);
    renderView();
    if (state.sheet && state.sheet.kind === 'ticket' && !sheetBusy()) await openTicket(state.sheet.id, true);
  } catch (e) {
    if (!silent) toast(e.message, { bad: true });
  }
}
const sheetBusy = () => { const a = document.activeElement; return a && $('#sheet').contains(a) && a.matches('input, textarea, select'); };

// ───────────────────────── Coquille & navigation ─────────────────────────
function navItems() {
  const items = [['home', 'Accueil', 'home'], ['demandes', 'Demandes', 'wrench'], ['residences', 'Résidences', 'building']];
  if (isAdmin()) items.push(['gerances', 'Gérances', 'users']);
  else if (isManager()) items.push(['equipe', 'Équipe', 'users']);
  items.push(['stats', 'Statistiques', 'chart']);
  items.push(['plus', 'Plus', 'more']);
  return items;
}
function renderShell() {
  const nb = ([id, label, ic]) => html`<button class="navbtn" data-action="go" data-to="${id}">${icon(ic)}<span>${label}</span><i class="navbadge" data-badge="${id}" hidden></i></button>`;
  setHtml(appEl, html`
    <nav class="sidenav" aria-label="Navigation">
      <div class="brand"><img class="brand-mark" src="/portail/icons/ptl-192.png" alt="" width="36" height="36"><span>LuxInterventions<small>${isAdmin() ? 'Espace équipe' : state.me.org_name || 'Portail gérance'}</small></span></div>
      ${navItems().map(nb)}
      <div class="spacer"></div>
      <button class="navbtn" data-action="logout">${icon('logout')}<span>Déconnexion</span></button>
    </nav>
    <div>
      <header class="topbar">
        <div class="brand"><img class="brand-mark" src="/portail/icons/ptl-192.png" alt="" width="36" height="36"><span>${isAdmin() ? 'LuxInterventions' : state.me.org_name || 'Portail'}</span></div>
        <button class="btn sm primary" data-action="new-ticket">${icon('plus')} <span class="hide-xs">Nouvelle demande</span></button>
      </header>
      ${state.demo ? html`<div class="demo-bar">${icon('eye')}<span class="grow"><b>Mode démo</b> — données d’exemple, rien n’est enregistré.</span>
        <span class="demo-switch"><button class="chip" data-action="demo-switch" data-id="gerance" aria-pressed="${!isAdmin()}">Vue gérance</button><button class="chip" data-action="demo-switch" data-id="admin" aria-pressed="${isAdmin()}">Vue LuxInterventions</button></span>
        <button class="btn sm ghost" data-action="logout">Quitter</button></div>` : ''}
      <main class="main" id="view"></main>
    </div>
    <nav class="bottomnav" style="grid-template-columns:repeat(${navItems().length - 1},1fr)" aria-label="Navigation">${navItems().filter((x) => x[0] !== 'stats').map(nb)}</nav>`);
}

async function go(route, replace) {
  const valid = navItems().map((x) => x[0]);
  if (!valid.includes(route)) route = 'home';
  state.route = route;
  const url = '#/' + route;
  if (replace) history.replaceState(null, '', url); else if (location.hash !== url) history.pushState(null, '', url);
  document.querySelectorAll('.navbtn[data-to]').forEach((b) => (b.dataset.to === route ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current')));
  const view = $('#view');
  if (!state.cache[route]) setHtml(view, html`<div class="empty"><div class="spinner accent" style="margin:0 auto"></div></div>`);
  scrollTo(0, 0);
  try {
    await loadRoute(route);
    renderView();
  } catch (e) {
    setHtml(view, html`<div class="empty card">${icon('alert')}<p>${e.message}</p><button class="btn" style="margin-top:12px" data-action="retry">Réessayer</button></div>`);
  }
}
addEventListener('popstate', () => {
  if (!state.me) return;
  const h = location.hash.slice(2);
  if (/^t\//.test(h)) return;
  if (state.sheet) closeSheet(true);
  go(h || 'home', true);
});

// Chargement des données de chaque écran
async function loadRoute(route) {
  const f = state.filters;
  const org = isAdmin() && f.org ? '&org=' + f.org : '';
  if (route === 'home') {
    const [stats, tickets, pubs] = await Promise.all([api('stats' + (org ? '?' + org.slice(1) : '')), api('tickets?scope=active' + org), api('pubs').catch(() => ({ items: [] }))]);
    state.cache.home = { stats, tickets: tickets.tickets, pubs: pubs.items || [] };
  } else if (route === 'demandes') {
    const [tickets, residences] = await Promise.all([
      api(`tickets?scope=${f.scope}${org}${f.residence ? '&residence=' + f.residence : ''}`),
      state.cache.residencesList ? Promise.resolve({ residences: state.cache.residencesList }) : api('residences'),
    ]);
    state.cache.residencesList = residences.residences;
    state.cache.demandes = tickets.tickets;
  } else if (route === 'residences') {
    const r = await api('residences' + (org ? '?' + org.slice(1) : ''));
    state.cache.residences = r.residences;
    state.cache.residencesList = isAdmin() && f.org ? state.cache.residencesList : r.residences;
  } else if (route === 'gerances') {
    const [orgs, users] = await Promise.all([api('orgs'), api('users')]);
    state.cache.gerances = { orgs: orgs.orgs, users: users.users };
    state.cache.orgs = orgs.orgs;
  } else if (route === 'equipe') {
    state.cache.equipe = (await api('users')).users;
  } else if (route === 'stats') {
    const [all, ev] = await Promise.all([api('tickets?scope=all' + org), api('evals' + (org ? '?' + org.slice(1) : '')).catch(() => null)]);
    state.cache.stats = { tickets: all.tickets, evals: ev ? ev.evals : null };
  }
  if (isAdmin() && !state.cache.orgs) state.cache.orgs = (await api('orgs')).orgs;
  updateBadges();
}

function updateBadges() {
  const tickets = (state.cache.home && state.cache.home.tickets) || [];
  const n = isAdmin() ? tickets.filter((t) => t.status === 'recue').length : 0;
  document.querySelectorAll('[data-badge=demandes], [data-badge=home]').forEach((b) => {
    b.hidden = !(n && b.dataset.badge === 'home');
    b.textContent = n;
  });
  document.title = (n ? `(${n}) ` : '') + 'Portail Gérance — LuxInterventions';
}

function renderView() {
  const view = $('#view');
  if (!view || !state.me) return;
  const a = document.activeElement;
  const keep = a && a.dataset && a.dataset.input === 'q' ? a.selectionStart : null;
  setHtml(view, VIEWS[state.route]());
  if (!state.demo) pubSeen(view);
  if (keep != null) { const s = view.querySelector('[data-input=q]'); if (s) { s.focus(); s.setSelectionRange(keep, keep); } }
}

const pageHead = (title, sub, actions = '') => html`<div class="page-head"><div><h1>${title}</h1>${sub ? html`<p>${sub}</p>` : ''}</div>${actions}</div>`;
const empty = (ic, text, action) => html`<div class="empty card">${icon(ic)}<p>${text}</p>${action ? html`<div style="margin-top:14px">${action}</div>` : ''}</div>`;
const orgName = (id) => ((state.cache.orgs || []).find((o) => o.id === id) || {}).name || '';
const orgFilter = () => (isAdmin() && (state.cache.orgs || []).length > 1 ? html`<div class="chips" style="margin-bottom:12px">
  <button class="chip" data-action="org-filter" data-id="" aria-pressed="${!state.filters.org}">Toutes les gérances</button>
  ${state.cache.orgs.map((o) => html`<button class="chip" data-action="org-filter" data-id="${o.id}" aria-pressed="${state.filters.org === o.id}">${o.name}</button>`)}</div>` : '');

function ticketRow(t) {
  const st = STATUS[t.status];
  const u = URG[t.urgence];
  return html`<button class="row ticket-row ${t.status === 'recue' && t.urgence === 'urgent' ? 'is-urgent' : ''}" data-action="open-ticket" data-id="${t.id}">
    <span class="urg-dot urg-${t.urgence}" title="${u.label}"></span>
    <span class="grow">
      <span class="title" style="display:block">#${t.ref} · ${t.residence_name}${t.lieu ? html` <span class="muted">— ${partsHtml(t.lieu)}</span>` : ''}</span>
      <span class="meta" style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
        <span class="badge ${st.cls}">${st.label}</span>
        ${t.categorie ? html`<span>${partsHtml(t.categorie)}</span>` : ''}
        ${isAdmin() ? html`<span>· ${t.org_name}</span>` : ''}
        ${t.status === 'planifiee' && t.planned_at ? html`<span>· ${fmtPlanned(t.planned_at)}</span>` : html`<span>· ${ago(t.status === 'recue' ? t.created_at : t.updated_at)}</span>`}
        ${t.photos ? html`<span>· ${icon('camera')}${t.photos}</span>` : ''}
      </span>
    </span>
    ${t.urgence === 'urgent' && t.status !== 'terminee' && t.status !== 'annulee' ? html`<span class="badge bad">Urgent</span>` : ''}
  </button>`;
}

// Guide « Premiers pas » : les étapes se cochent toutes seules
function guideCard(stats) {
  let hidden = state.guideHidden;
  try { hidden = hidden || (!state.demo && localStorage.getItem('ptlGuideHidden') === '1'); } catch {}
  if (hidden) return '';
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const push = pushState() === 'on' || pushState() === 'demo';
  const orgs = state.cache.orgs || [];
  const steps = isAdmin()
    ? [
        [orgs.length > 0, 'Créez les gérances partenaires', 'go', 'gerances'],
        [orgs.some((o) => o.users > 0), 'Invitez leurs responsables (lien personnel par email ou WhatsApp)', 'go', 'gerances'],
        [push, 'Activez les notifications pour être alerté des urgences', 'push-on', ''],
        [standalone, 'Installez l’app sur votre téléphone', 'go', 'plus'],
      ]
    : [
        [(stats.residences || 0) > 0, 'Ajoutez vos résidences (une seule fois : accès, clés, contact)', 'new-residence', ''],
        [(stats.createdMonth || 0) + (stats.open || 0) > 0, 'Envoyez votre première demande d’intervention', 'new-ticket', ''],
        [push, 'Activez les notifications pour suivre vos demandes', 'push-on', ''],
        [standalone, 'Installez l’app sur votre téléphone', 'go', 'plus'],
      ];
  const done = steps.filter((x) => x[0]).length;
  if (done === steps.length && !state.demo) return '';
  let shut = false;
  try { shut = localStorage.getItem('ptlGuideShut') === '1'; } catch {}
  return html`<details class="card guide fold" style="margin-bottom:14px"${shut ? '' : ' open'}>
    <summary class="card-title" style="margin-bottom:8px"><h3>Premiers pas · ${done}/${steps.length}</h3></summary>
    <div class="progress" style="margin-bottom:10px"><i style="width:${(done / steps.length) * 100}%"></i></div>
    ${steps.map(([ok, label, action, to], i) => html`<div class="guide-step ${ok ? 'ok' : ''}"><span class="guide-num">${ok ? '✓' : i + 1}</span><span class="grow">${label}</span>${ok ? '' : html`<button class="btn sm" data-action="${action}" data-to="${to}">Faire</button>`}</div>`)}
    <p class="tiny muted" style="margin-top:10px">🔑 Le mot de passe se choisit <b>une seule fois</b>, avec le lien d’invitation. Ensuite : email + mot de passe, sur n’importe quel appareil. Oublié ? Demandez un nouveau lien.</p>
    <div style="text-align:right;margin-top:6px"><button class="btn sm ghost" data-action="guide-hide">Masquer</button></div>
  </details>`;
}

// ───────────────────────── Vues ─────────────────────────
// Annonces des partenaires (publiées depuis l'app de gestion) : petit lecteur vidéo, itinéraire, appel, site
const PUB_ICON = { musique: '🎵', resto: '🍕', bar: '🍺', horeca: '☕', bricolage: '🔨', meubles: '🛋️', courses: '🛒', proxi: '🏪', bureau: '🏢', social: '📱', services: '🧰', autre: '📌' };
pubStatInit(API.replace(/\/api\/portail\/$/, ''), 'ptl', () => LANG);
document.addEventListener('click', (e) => { if (!state.demo) pubTap(e); }, true);
const TICKER_BASE = API.replace(/\/api\/portail\/$/, '');
// la barra crypto (servie par le Worker) annonce sa hauteur réelle : le cadre s'adapte (PC, téléphone)
addEventListener('message', (e) => {
  if (e.origin !== new URL(TICKER_BASE).origin || !e.data || typeof e.data.tickerH !== 'number') return;
  const h = Math.max(30, Math.min(160, Math.round(e.data.tickerH)));
  document.querySelectorAll('.ticker').forEach((t) => { t.style.height = h + 'px'; });
});
let pubTurn = 0;
try { pubTurn = (+localStorage.getItem('ptlPubTurn') || 0) + 1; localStorage.setItem('ptlPubTurn', String(pubTurn)); } catch { /* stockage indisponible */ }
const pubShut = new Set((() => { try { return JSON.parse(localStorage.getItem('ptlPubShut') || '[]'); } catch { return []; } })());
// replier / déplier une annonce ou le guide : on s'en souvient sur cet appareil
document.addEventListener('toggle', (e) => {
  const el = e.target;
  if (!el.classList || !el.classList.contains('fold')) return;
  if (el.dataset.pid) {
    if (el.open) pubShut.delete(el.dataset.pid); else pubShut.add(el.dataset.pid);
    try { localStorage.setItem('ptlPubShut', JSON.stringify([...pubShut].slice(-50))); } catch { /* stockage indisponible */ }
  } else if (el.classList.contains('guide')) {
    try { localStorage.setItem('ptlGuideShut', el.open ? '0' : '1'); } catch { /* stockage indisponible */ }
  }
}, true);
// une annonce par emplacement (haut sous « Bonjour », milieu, bas au-dessus de la barre crypto) ; plusieurs → une autre à chaque ouverture
function pubSlot(k) {
  const list = ((state.cache.home && state.cache.home.pubs) || []).filter((a) => (a.slot || 'milieu') === k);
  if (!list.length) return '';
  const a = list[pubTurn % list.length], v = videoEmbed(a.video);
  return html`<details class="card ptl-pub fold" style="margin:12px 0" data-pid="${a.id}"${pubShut.has(a.id) ? '' : ' open'}><summary><div class="small muted"><b class="pub-lbl">📣 Publicité</b> · ${PUB_ICON[a.cat] || '📌'}</div><b style="font-size:17px">${a.nom}</b></summary>${a.texte ? html`<p class="small" style="margin:4px 0 0;white-space:pre-wrap">${a.texte}</p>` : ''}
      ${v ? html`<div class="vid${v.tall ? ' tall' : ''}${v.audio ? ' audio' : ''}" style="${v.audio ? `height:${v.audio}px` : ''}"><iframe src="${v.src}" loading="lazy" title="Vidéo" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>` : ''}
      <div class="small muted" style="margin-top:6px">📍 ${a.adresse}</div>
      <div class="actions" style="margin-top:8px;flex-wrap:wrap">
        <a class="btn sm" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(a.adresse)}" target="_blank" rel="noopener" data-pev="map">🧭 Itinéraire</a>
        ${a.tel ? html`<a class="btn sm" href="tel:${a.tel.replace(/[^\d+]/g, '')}" data-pev="call">📞 Appeler</a>` : ''}
        ${a.web ? html`<a class="btn sm" href="${a.web}" target="_blank" rel="noopener" data-pev="web">🌐 Site web</a>` : ''}
        ${a.video && !v ? html`<a class="btn sm" href="${a.video}" target="_blank" rel="noopener" data-pev="video">▶ Vidéo</a>` : ''}</div></details>`;
}
// barre des cours crypto (TradingView) : servie par le Worker sur un autre domaine, isolée du portail
const tickerBar = () => html`<div class="ticker"><iframe src="${API.replace(/api\/portail\/$/, '')}ticker" title="Crypto" loading="lazy" referrerpolicy="no-referrer" scrolling="no"></iframe></div>`;

const VIEWS = {
  home() {
    const { stats, tickets } = state.cache.home || { stats: {}, tickets: [] };
    const recue = tickets.filter((t) => t.status === 'recue');
    const others = tickets.filter((t) => t.status !== 'recue');
    const today = new Date().toISOString().slice(0, 10);
    const planToday = tickets.filter((t) => t.status === 'planifiee' && (t.planned_at || '').startsWith(today));
    const hello = html`Bonjour <span>${state.me.name.split(' ')[0]}</span>`;
    // l'équipe arrive : en route / sur place (clignote) ; prévue aujourd'hui
    const coming = tickets.filter((t) => t.status === 'encours');
    const arrive = coming.length || planToday.length ? html`<div class="arrive">${coming.map((t) => html`<button class="arrive-b go" data-action="open-ticket" data-id="${t.id}"><span class="arr-dot"></span><span class="grow">🚚 <b>LuxInterventions est en route / sur place</b><span class="meta" style="display:block">#${t.ref} · ${t.residence_name}${t.technicien ? html` · <span>technicien</span> ${t.technicien}` : ''}</span></span></button>`)}
      ${planToday.map((t) => html`<button class="arrive-b today" data-action="open-ticket" data-id="${t.id}"><span class="arr-dot"></span><span class="grow">📅 <b>Aujourd'hui</b> ${new Date(t.planned_at).toLocaleTimeString(LOC, { hour: '2-digit', minute: '2-digit' })}<span class="meta" style="display:block">#${t.ref} · ${t.residence_name}${t.technicien ? html` · <span>technicien</span> ${t.technicien}` : ''}</span></span></button>`)}</div>` : '';
    const pushCard = !['on', 'demo'].includes(pushState()) ? html`<div class="alert ${isAdmin() ? 'warn' : 'info'}" style="margin-bottom:14px;align-items:center">${icon('bell')}<div style="flex:1">${isAdmin()
      ? html`<b>Activez les notifications</b> pour être alerté immédiatement des nouvelles demandes urgentes.` : html`<b>Activez les notifications</b> pour suivre l'avancement de vos demandes.`}</div><button class="btn sm" data-action="push-on">Activer</button></div>` : '';
    if (isAdmin()) {
      return html`${pushCard}
        ${guideCard(stats)}
        ${pageHead(hello, 'Espace équipe LuxInterventions')}
        ${arrive}
        ${pubSlot('haut')}
        ${orgFilter()}
        <div class="metrics">
          <div class="metric"><div class="lbl">À traiter</div><div class="val ${recue.length ? 'red' : 'green'}">${recue.length}</div><div class="sub">nouvelles demandes</div></div>
          <div class="metric"><div class="lbl">Urgences ouvertes</div><div class="val ${stats.urgent ? 'red' : 'green'}">${stats.urgent || 0}</div></div>
          <div class="metric"><div class="lbl">En cours</div><div class="val">${stats.open || 0}</div><div class="sub">${planToday.length} planifiée(s) aujourd'hui</div></div>
          <div class="metric"><div class="lbl">Délai de prise en charge</div><div class="val">${duration(stats.avgTakeMs)}</div><div class="sub">urgences : ${duration(stats.avgTakeUrgentMs)} · 90 jours</div></div>
        </div>
        ${pubSlot('milieu')}
        <div class="section-label">À traiter maintenant</div>
        ${recue.length ? html`<div class="list">${recue.map(ticketRow)}</div>` : html`<div class="alert" style="background:var(--green-soft);color:var(--green)">${icon('check')}<div>Aucune nouvelle demande en attente.</div></div>`}
        <div class="section-label">En cours</div>
        ${others.length ? html`<div class="list">${others.map(ticketRow)}</div>` : html`<p class="muted small">Aucune intervention en cours.</p>`}
        ${pubSlot('bas')}${tickerBar()}`;
    }
    return html`${pushCard}
      ${guideCard(stats)}
      ${pageHead(hello, state.me.org_name || '')}
      ${arrive}
      ${pubSlot('haut')}
      <button class="big-cta" data-action="new-ticket">${icon('plus')}<span><b>Nouvelle demande d'intervention</b><small>Urgence, photos, accès — en 30 secondes</small></span></button>
      <div class="metrics" style="margin-top:14px">
        <div class="metric"><div class="lbl">En cours</div><div class="val">${stats.open || 0}</div><div class="sub">${stats.urgent ? html`<span class="red">${stats.urgent} urgente(s)</span>` : 'demandes ouvertes'}</div></div>
        <div class="metric"><div class="lbl">Terminées ce mois</div><div class="val green">${stats.doneMonth || 0}</div><div class="sub">${stats.createdMonth || 0} demandée(s)</div></div>
        <div class="metric"><div class="lbl">Prise en charge</div><div class="val">${duration(stats.avgTakeMs)}</div><div class="sub">délai moyen</div></div>
        <div class="metric"><div class="lbl">Résidences</div><div class="val">${stats.residences || 0}</div><div class="sub">${stats.apartments ? stats.apartments + ' appartements' : ''}</div></div>
      </div>
      ${pubSlot('milieu')}
      <button class="btn block" style="margin-top:12px" data-action="go" data-to="stats">${icon('chart')} Statistiques de nos interventions</button>
      <div class="section-label">Mes demandes en cours</div>
      ${tickets.length ? html`<div class="list">${tickets.map(ticketRow)}</div>` : empty('check', 'Aucune demande en cours.', html`<button class="btn primary" data-action="new-ticket">${icon('plus')} Nouvelle demande</button>`)}
      ${pubSlot('bas')}${tickerBar()}`;
  },

  stats() {
    const { tickets, evals } = state.cache.stats || { tickets: [], evals: [] };
    const now = new Date(), Y = 365 * 864e5;
    const ts = tickets.filter((t) => t.created_at >= Date.now() - Y && t.status !== 'annulee');
    const done = ts.filter((t) => t.status === 'terminee' && t.done_at);
    const taken = ts.filter((t) => t.taken_at);
    const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
    const avgTake = avg(taken.map((t) => t.taken_at - t.created_at)), avgDone = avg(done.map((t) => t.done_at - t.created_at));
    // 12 derniers mois : demandées / terminées
    const months = Array.from({ length: 12 }, (_, i) => { const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1); return { y: d.getFullYear(), m: d.getMonth(), lbl: d.toLocaleDateString(LOC, { month: 'short' }), c: 0, f: 0 }; });
    const mi = (t) => months.findIndex((x) => { const d = new Date(t); return d.getFullYear() === x.y && d.getMonth() === x.m; });
    for (const t of ts) { const i = mi(t.created_at); if (i >= 0) months[i].c++; }
    for (const t of done) { const i = mi(t.done_at); if (i >= 0) months[i].f++; }
    const maxM = Math.max(1, ...months.map((x) => Math.max(x.c, x.f)));
    const count = (key) => { const o = {}; for (const t of ts) { const k = key(t); if (k) o[k] = (o[k] || 0) + 1; } return Object.entries(o).sort((a, b) => b[1] - a[1]); };
    const byType = count((t) => (t.categorie || 'Autre').split(' · ')[0]).slice(0, 10);
    const byUrg = Object.keys(URG).map((k) => [k, ts.filter((t) => t.urgence === k).length]);
    const byRes = count((t) => t.residence_name).slice(0, 8);
    const bars = (rows, total, fmt = (k) => html`<span>${k}</span>`) => html`<div class="hbars">${rows.map(([k, n]) => html`<div class="hbar"><span class="hb-l">${fmt(k)}</span><span class="hb-t"><i style="width:${Math.round((n / Math.max(1, total)) * 100)}%"></i></span><b>${n}</b></div>`)}</div>`;
    // satisfaction (fiches d'évaluation)
    const ev = (evals || []).map((e) => evalParse(e.text)).filter(Boolean);
    const glob = EVAL_GLOBAL.map(([k, l]) => [l, ev.filter((v) => v.global === k).length]);
    const crit = EVAL_CRIT.map(([k, l]) => { const xs = ev.map((v) => +v[k]).filter(Boolean); return [l, xs.length ? avg(xs) : null]; });
    const pct = ev.length ? Math.round((ev.filter((v) => v.global === 'ok').length / ev.length) * 100) : null;
    return html`
      ${pageHead('Statistiques', isAdmin() ? 'Toutes les gérances — 12 derniers mois' : html`${state.me.org_name || ''} — <span>12 derniers mois</span>`)}
      ${orgFilter()}
      <div class="metrics">
        <div class="metric"><div class="lbl">Demandes</div><div class="val">${ts.length}</div><div class="sub">12 derniers mois</div></div>
        <div class="metric"><div class="lbl">Terminées</div><div class="val green">${done.length}</div><div class="sub">${ts.length ? Math.round((done.length / ts.length) * 100) + ' %' : ''}</div></div>
        <div class="metric"><div class="lbl">Prise en charge</div><div class="val">${duration(avgTake)}</div><div class="sub">délai moyen</div></div>
        <div class="metric"><div class="lbl">Résolution</div><div class="val">${duration(avgDone)}</div><div class="sub">de la demande à la fin</div></div>
        <div class="metric"><div class="lbl">Satisfaction</div><div class="val ${pct == null ? '' : pct >= 80 ? 'green' : pct >= 50 ? '' : 'red'}">${pct == null ? '—' : pct + ' %'}</div><div class="sub">${ev.length} <span>évaluations</span></div></div>
      </div>
      <div class="card stat-card"><div class="section-label" style="margin-top:0">Demandes et interventions terminées par mois</div>
        <div class="vbars">${months.map((x) => html`<div class="vb"><div class="vb-bars"><i class="c" style="height:${Math.round((x.c / maxM) * 100)}%" title="${x.c}"></i><i class="f" style="height:${Math.round((x.f / maxM) * 100)}%" title="${x.f}"></i></div><small>${x.lbl}</small></div>`)}</div>
        <div class="legend-row tiny"><span><i class="lg c"></i> <span>Demandées</span></span><span><i class="lg f"></i> <span>Terminées</span></span></div></div>
      <div class="stat-grid">
        <div class="card stat-card"><div class="section-label" style="margin-top:0">Par type de travaux</div>${byType.length ? bars(byType, ts.length) : html`<p class="muted small">—</p>`}</div>
        <div class="card stat-card"><div class="section-label" style="margin-top:0">Par urgence</div>${bars(byUrg, ts.length, (k) => html`${URG[k].dot} <span>${URG[k].label}</span>`)}
          <div class="section-label">Par résidence</div>${byRes.length ? bars(byRes, ts.length) : html`<p class="muted small">—</p>`}</div>
      </div>
      <div class="card stat-card"><div class="section-label" style="margin-top:0">⭐ Satisfaction</div>
        ${evals == null ? html`<p class="muted small">Disponible après la mise à jour du serveur.</p>` : ev.length ? html`<div class="stat-grid">
          <div>${bars(glob, ev.length)}</div>
          <div class="hbars">${crit.map(([l, a]) => html`<div class="hbar"><span class="hb-l"><span>${l}</span></span><span class="hb-t"><i class="sat" style="width:${a ? Math.round((a / 4) * 100) : 0}%"></i></span><b>${a ? EVAL_LVL[Math.round(a) - 1][1] + ' ' + a.toFixed(1).replace('.', ',') : '—'}</b></div>`)}</div>
        </div>` : html`<p class="muted small">Pas encore d’évaluation. Après chaque intervention terminée, la gérance peut remplir la fiche « ⭐ Évaluer l’intervention ».</p>`}</div>`;
  },

  demandes() {
    const f = state.filters;
    let list = state.cache.demandes || [];
    if (f.urg) list = list.filter((t) => t.urgence === f.urg);
    const q = f.q.trim().toLowerCase();
    if (q) list = list.filter((t) => [t.ref, t.residence_name, t.residence_address, t.lieu, t.categorie, t.description, t.org_name, t.technicien].join(' ').toLowerCase().includes(q));
    const resList = (state.cache.residencesList || []).filter((r) => !f.org || r.org_id === f.org);
    return html`
      ${pageHead('Demandes', `${list.length} demande${list.length > 1 ? 's' : ''}`, html`<button class="btn primary desk-only" data-action="new-ticket">${icon('plus')} Nouvelle demande</button>`)}
      <div class="tabs" role="tablist" style="max-width:420px">
        ${[['active', 'En cours'], ['done', 'Terminées'], ['all', 'Toutes']].map(([k, l]) => html`<button class="tab" role="tab" aria-selected="${f.scope === k}" data-action="scope" data-id="${k}">${l}</button>`)}
      </div>
      ${orgFilter()}
      <div class="toolbar">
        <div class="search" style="flex:1;min-width:200px;margin:0">${icon('search')}<input type="search" data-input="q" placeholder="Rechercher : n°, résidence, lieu…" value="${f.q}" autocomplete="off"></div>
        <select data-input="residence" aria-label="Résidence" style="max-width:240px"><option value="">Toutes les résidences</option>${resList.map((r) => html`<option value="${r.id}" ${f.residence === r.id ? new Raw('selected') : ''}>${r.name}</option>`)}</select>
      </div>
      <div class="chips" style="margin-bottom:12px">
        <button class="chip" data-action="urg-filter" data-id="" aria-pressed="${!f.urg}">Toutes urgences</button>
        ${Object.entries(URG).map(([k, u]) => html`<button class="chip" data-action="urg-filter" data-id="${k}" aria-pressed="${f.urg === k}">${u.dot} ${u.label}</button>`)}
      </div>
      ${list.length ? html`<div class="list">${list.map(ticketRow)}</div>` : empty('wrench', 'Aucune demande.', html`<button class="btn primary" data-action="new-ticket">${icon('plus')} Nouvelle demande</button>`)}`;
  },

  residences() {
    const q = (state.filters.rq || '').trim().toLowerCase();
    let list = state.cache.residences || [];
    if (q) list = list.filter((r) => [r.name, r.address, r.org_name].join(' ').toLowerCase().includes(q));
    const apts = list.reduce((a, r) => a + (r.apartments || 0), 0);
    return html`
      ${pageHead('Résidences', `${list.length} résidence${list.length > 1 ? 's' : ''}${apts ? ' · ' + apts + ' appartements' : ''}`, html`<button class="btn primary" data-action="new-residence">${icon('plus')} Ajouter</button>`)}
      ${orgFilter()}
      <div class="search">${icon('search')}<input type="search" data-input="rq" placeholder="Rechercher une résidence, une adresse…" value="${state.filters.rq || ''}" autocomplete="off"></div>
      ${list.length ? html`<div class="list">${list.map((r) => html`<button class="row" data-action="open-residence" data-id="${r.id}">
        <span class="avatar">${icon('building')}</span>
        <span class="grow"><span class="title" style="display:block">${r.name}</span><span class="meta">${r.address || '—'}${isAdmin() ? ' · ' + r.org_name : ''}</span></span>
        ${r.open ? html`<span class="badge warn">${r.open} en cours</span>` : html`<span class="tiny muted">${r.tickets} demande${r.tickets > 1 ? 's' : ''}</span>`}
      </button>`)}</div>` : empty('building', q ? 'Aucun résultat.' : 'Aucune résidence enregistrée. Ajoutez vos résidences une seule fois : elles seront proposées à chaque demande.', !q ? html`<button class="btn primary" data-action="new-residence">${icon('plus')} Ajouter une résidence</button>` : '')}`;
  },

  gerances() {
    const { orgs, users } = state.cache.gerances || { orgs: [], users: [] };
    const staff = users.filter((u) => u.role === 'admin');
    return html`
      ${pageHead('Gérances & accès', `${orgs.length} gérance${orgs.length > 1 ? 's' : ''} · ${users.filter((u) => u.active).length} utilisateurs actifs`, html`<button class="btn primary" data-action="new-org">${icon('plus')} Nouvelle gérance</button>`)}
      ${orgs.length ? html`<div class="grid cols-auto">${orgs.map((o) => html`<button class="card" style="text-align:left;font:inherit;color:inherit;cursor:pointer;width:100%" data-action="open-org" data-id="${o.id}">
        <div class="card-title"><h3>${o.name}</h3>${o.open ? html`<span class="badge warn">${o.open} en cours</span>` : ''}</div>
        <div class="pay-foot"><span>${o.residences} résidence${o.residences > 1 ? 's' : ''}</span><span>${o.users} utilisateur${o.users > 1 ? 's' : ''}</span></div>
      </button>`)}</div>` : empty('users', 'Aucune gérance. Créez la première, puis invitez ses utilisateurs.', html`<button class="btn primary" data-action="new-org">${icon('plus')} Nouvelle gérance</button>`)}
      <div class="section-label">Équipe LuxInterventions</div>
      <div class="list">${staff.map(userRow)}</div>
      <button class="btn block" style="margin-top:10px" data-action="new-user" data-org="" data-role="admin">${icon('plus')} Inviter un membre de l'équipe</button>`;
  },

  equipe() {
    const users = state.cache.equipe || [];
    return html`
      ${pageHead('Équipe', state.me.org_name, html`<button class="btn primary" data-action="new-user" data-org="${state.me.org_id}" data-role="gerance_user">${icon('plus')} Inviter</button>`)}
      <p class="small muted" style="margin-bottom:12px">Chaque personne a son propre accès : on sait toujours qui a fait quelle demande. Un compte désactivé ne peut plus se connecter.</p>
      <div class="list">${users.map(userRow)}</div>`;
  },

  plus() {
    const ps = pushState();
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    const now = new Date();
    return html`
      ${pageHead('Plus', '')}
      <div class="card" style="display:flex;gap:14px;align-items:center">
        <span class="avatar" style="width:48px;height:48px">${initials(state.me.name)}</span>
        <div class="grow"><div class="title">${state.me.name}</div><div class="meta small muted">${state.me.email} · ${ROLES[state.me.role]}${state.me.org_name ? ' · ' + state.me.org_name : ''}</div></div>
      </div>
      <div class="section-label">Notifications</div>
      <div class="list settings">
        <div class="row">${icon('bell')}<span class="grow"><span class="title" style="display:block">Notifications sur cet appareil</span>
          <span class="meta" style="white-space:normal">${ps === 'demo' ? 'En démo, les notifications sont simulées par des messages à l’écran.' : ps === 'on' ? 'Activées ✓' : ps === 'denied' ? 'Bloquées dans les réglages du navigateur' : ps === 'unsupported' ? (isIOS && !standalone ? 'Sur iPhone : installez d’abord l’app (Partager → « Sur l’écran d’accueil »), puis ouvrez-la depuis l’icône.' : 'Non disponibles sur ce navigateur') : 'Désactivées'}</span></span>
          ${ps === 'on' ? html`<button class="btn sm" data-action="push-test">Tester</button><button class="btn sm ghost" data-action="push-off">Désactiver</button>` : ps === 'off' ? html`<button class="btn sm primary" data-action="push-on">Activer</button>` : ''}</div>
      </div>
      ${!standalone ? html`<div class="section-label">Application</div><div class="list settings"><div class="row">${icon('phoneApp')}<span class="grow"><span class="title" style="display:block">Installer sur ce téléphone</span>
        <span class="meta" style="white-space:normal">${isIOS ? 'Safari : Partager → « Sur l’écran d’accueil ».' : 'Ajoute l’icône LuxInterventions sur l’écran d’accueil.'}</span></span>
        ${installPrompt ? html`<button class="btn sm primary" data-action="install">Installer</button>` : ''}</div></div>` : ''}
      <div class="section-label">Rapports</div>
      <form class="card" data-form="report" style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end">
        <label class="field" style="flex:1;min-width:140px">Mois<input type="month" name="month" value="${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}" required></label>
        ${isAdmin() ? html`<label class="field" style="flex:1;min-width:160px">Gérance<select name="org"><option value="">Toutes</option>${(state.cache.orgs || []).map((o) => html`<option value="${o.id}">${o.name}</option>`)}</select></label>` : ''}
        <button class="btn primary" type="submit">${icon('download')} Rapport mensuel</button>
      </form>
      <div class="section-label">Langue</div>
      <div style="text-align:left">${langMini()}</div>
      <div class="section-label">Compte</div>
      <div class="list settings">
        <button class="row" data-action="change-password">${icon('key')}<span class="grow title">Changer mon mot de passe</span></button>
        <button class="row" data-action="logout">${icon('logout')}<span class="grow title red">Se déconnecter</span></button>
      </div>
      <p class="tiny muted" style="margin-top:28px;text-align:center">LuxInterventions · Portail gérance v${VERSION}</p>`;
  },
};

function userRow(u) {
  const pending = !u.has_password;
  return html`<div class="row">
    <span class="avatar" style="${u.active ? '' : 'background:var(--surface-2);color:var(--text-3)'}">${initials(u.name)}</span>
    <span class="grow"><span class="title" style="display:block">${u.name} ${u.id === state.me.id ? html`<span class="badge">vous</span>` : ''}</span>
      <span class="meta">${u.email} · ${ROLES[u.role]}${!u.active ? ' · désactivé' : pending ? ' · invitation en attente' : u.last_login ? ' · vu ' + ago(u.last_login) : ''}</span></span>
    ${u.id !== state.me.id ? html`<button class="btn sm" data-action="user-link" data-id="${u.id}" title="Nouveau lien d'accès">${icon('link')}<span class="hide-xs">${pending ? 'Lien' : 'Réinit.'}</span></button>
      <button class="btn sm ghost ${u.active ? 'danger' : ''}" data-action="user-toggle" data-id="${u.id}" data-active="${u.active ? 1 : 0}">${u.active ? 'Désactiver' : 'Réactiver'}</button>` : ''}
  </div>`;
}

// ───────────────────────── Feuilles ─────────────────────────
const sheetEl = $('#sheet');
function openSheet(kind, id, data) {
  state.sheet = { kind, id, data };
  renderSheet();
  if (!sheetEl.open) sheetEl.showModal();
}
function closeSheet(fromPop) {
  const wasTicket = state.sheet && state.sheet.kind === 'ticket';
  state.sheet = null;
  if (sheetEl.open) sheetEl.close();
  revokePhotos();
  if (wasTicket && !fromPop && /^#\/t\//.test(location.hash)) history.replaceState(null, '', '#/' + state.route);
}
sheetEl.addEventListener('close', () => { state.sheet = null; revokePhotos(); });
sheetEl.addEventListener('click', (e) => { if (e.target === sheetEl) closeSheet(); });

function renderSheet() {
  const s = state.sheet;
  if (!s) return;
  const r = SHEETS[s.kind](s);
  if (!r) return closeSheet();
  sheetEl.className = 'sheet' + (r.narrow ? ' narrow' : '');
  setHtml(sheetEl, html`
    <div class="sheet-head"><h2>${r.title}</h2><button class="btn icon ghost" data-action="close-sheet" aria-label="Fermer">${icon('x')}</button></div>
    <div class="sheet-body">${r.body}</div>
    ${r.foot ? html`<div class="sheet-foot">${r.foot}</div>` : ''}`);
  if (r.after) r.after();
}

const field = (label, name, value, o = {}) => html`<label class="field ${o.full ? 'full' : ''}">${label}
  <input name="${name}" type="${o.type || 'text'}" value="${value ?? ''}" ${o.required ? new Raw('required') : ''} ${o.attrs ? new Raw(o.attrs) : ''} placeholder="${o.placeholder || ''}"></label>`;
const kv = (k, v) => (v ? html`<dt>${k}</dt><dd>${v}</dd>` : '');

// Photos : chargées avec le jeton, affichées via des URL « blob: »
let photoUrls = [];
function revokePhotos() { photoUrls.forEach((u) => URL.revokeObjectURL(u)); photoUrls = []; }
async function loadPhotoInto(img) {
  try {
    const r = await api('photos/' + img.dataset.photo, { raw: true });
    const u = URL.createObjectURL(await r.blob());
    photoUrls.push(u);
    img.src = u;
    img.closest('a').href = u;
  } catch { img.alt = 'Photo indisponible'; }
}

// Compression des photos avant l'envoi (max 1600 px, JPEG)
async function compressImage(file) {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * scale);
    c.height = Math.round(bmp.height * scale);
    const cx = c.getContext('2d');
    cx.fillStyle = '#ffffff'; // fond blanc : le JPEG n'a pas de transparence
    cx.fillRect(0, 0, c.width, c.height);
    cx.drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.82));
  } catch {
    return file; // format non lisible par le navigateur : envoi tel quel
  }
}
async function uploadPhotos(ticketId, files, eventId) {
  let n = 0;
  for (const f of files) {
    const blob = await compressImage(f);
    await api(`tickets/${ticketId}/photos`, { method: 'PUT', body: blob, headers: { 'Content-Type': blob.type || f.type || 'image/jpeg', ...(eventId ? { 'X-Event-Id': eventId } : {}) } });
    n++;
  }
  return n;
}

async function openTicket(id, silent) {
  try {
    const d = await api('tickets/' + id);
    if (!silent || !state.sheet || state.sheet.kind !== 'ticket' || state.sheet.id !== id) {
      if (location.hash !== '#/t/' + id) history.pushState(null, '', '#/t/' + id);
    }
    const same = state.sheet && state.sheet.kind === 'ticket' && state.sheet.id === id;
    const changed = !same || JSON.stringify(state.sheet.data) !== JSON.stringify(d);
    if (changed) openSheet('ticket', id, d);
  } catch (e) {
    if (!silent) toast(e.message, { bad: true });
  }
}

const SHEETS = {
  ticket({ data: d }) {
    const t = d.ticket;
    const res = d.residence || {};
    const st = STATUS[t.status];
    const u = URG[t.urgence];
    const byEvent = {};
    for (const p of d.photos) (byEvent[p.event_id || 'root'] = byEvent[p.event_id || 'root'] || []).push(p);
    const firstEvent = d.events[0];
    const rootPhotos = [...(byEvent.root || []), ...((firstEvent && byEvent[firstEvent.id]) || [])];
    const gallery = (list) => (list && list.length ? html`<div class="photos">${list.map((p) => html`<a target="_blank" rel="noopener"><img data-photo="${p.id}" alt="Photo" loading="lazy"></a>`)}</div>` : '');
    const tel = (t.contact_phone || res.contact_phone || '').replace(/[^\d+]/g, '');
    const open = !['terminee', 'annulee'].includes(t.status);
    let actions = '';
    if (isAdmin() && open) {
      const next = { recue: ['take', 'Prendre en charge'], prise: ['plan', 'Planifier'], planifiee: ['start', '🚚 En route'], encours: ['finish', 'Terminer'] }[t.status];
      actions = html`<div class="actions">
        <button class="btn primary" data-action="t-${next[0]}" data-id="${t.id}">${next[1]}</button>
        ${t.status === 'planifiee' ? html`<button class="btn" data-action="t-plan" data-id="${t.id}">Replanifier</button>` : ''}
        ${t.status !== 'encours' && t.status !== 'recue' ? html`<button class="btn" data-action="t-finish" data-id="${t.id}">Terminer</button>` : ''}
        <button class="btn ghost danger" data-action="t-cancel" data-id="${t.id}">Annuler</button></div>`;
    } else if (!isAdmin() && t.status === 'recue') {
      actions = html`<div class="actions"><button class="btn ghost danger" data-action="t-cancel" data-id="${t.id}">Annuler la demande</button></div>`;
    }
    const evalEv = d.events.find((e) => e.kind === 'comment' && evalParse(e.text));
    const evLabel = (e) => (e.kind === 'create' ? 'Demande créée' : e.kind === 'status' ? STATUS[e.status].label : e === evalEv ? '⭐ Évaluation' : 'Message');
    return {
      title: `#${t.ref} · ${res.name || ''}`,
      body: html`
        <div class="ticket-head">
          <span class="badge ${u.cls}">${u.dot} ${u.label}</span>
          <span class="badge ${st.cls}">${st.label}</span>
          ${t.categorie ? html`<span class="badge">${partsHtml(t.categorie)}</span>` : ''}
        </div>
        ${t.status !== 'annulee' ? html`<ol class="stepper">${STEPS.map((k, i) => html`<li class="${i < st.step ? 'done' : i === st.step ? 'now' : ''}"><i></i><span>${STATUS[k].label}</span></li>`)}</ol>` : ''}
        ${t.status === 'planifiee' || t.planned_at ? html`<div class="alert info" style="margin-bottom:12px">${icon('calendar')}<div>Intervention prévue <b>${fmtPlanned(t.planned_at)}</b>${t.technicien ? html` — technicien : <b>${t.technicien}</b>` : ''}</div></div>` : ''}
        ${actions}
        <div class="card" style="margin-bottom:12px"><div class="small muted" style="margin-bottom:6px">Description</div><div style="white-space:pre-wrap">${t.description}</div></div>
        ${(() => {
          // photos du dégât (gérance, à la demande) | photos après réparation (équipe LuxInterventions)
          const after = d.events.filter((e) => e !== firstEvent && e.user_role === 'admin').flatMap((e) => byEvent[e.id] || []);
          if (!rootPhotos.length && !after.length) return '';
          return html`<div class="card ba" style="margin-bottom:12px"><div class="ba-grid">
            <div><div class="ba-h">📷 <span>Avant</span> <span class="tiny muted">— <span>photos du dégât</span></span></div>${rootPhotos.length ? gallery(rootPhotos) : html`<p class="tiny muted">—</p>`}</div>
            <div><div class="ba-h ok">✅ <span>Après</span> <span class="tiny muted">— <span>travail terminé</span></span></div>${after.length ? gallery(after) : html`<p class="tiny muted">${t.status === 'terminee' ? '—' : 'Les photos de la réparation apparaîtront ici.'}</p>`}</div>
          </div></div>`;
        })()}
        <dl class="kv small">
          ${kv('Résidence', html`${res.name}<div class="tiny muted">${res.address || ''}</div>`)}
          ${kv('Lieu', t.lieu ? partsHtml(t.lieu) : '')}
          ${isAdmin() ? kv('Gérance', res.org_name) : ''}
          ${kv('Contact sur place', t.contact_name || res.contact_name ? html`${t.contact_name || res.contact_name}${tel ? html` · <a href="tel:${tel}">${t.contact_phone || res.contact_phone}</a>` : ''}` : '')}
          ${kv('Accès', t.acces || res.access)}
          ${kv('Clés', res.keys_info)}
          ${kv('Disponibilités', t.dispo ? partsHtml(t.dispo) : '')}
          ${kv('Demandée', fmtDateTime(t.created_at))}
          ${kv('Prise en charge', t.taken_at ? fmtDateTime(t.taken_at) + ' (' + duration(t.taken_at - t.created_at) + ')' : '')}
          ${kv('Terminée', t.done_at && t.status === 'terminee' ? fmtDateTime(t.done_at) : '')}
        </dl>
        ${t.rapport ? html`<div class="section-label">Rapport d'intervention</div><div class="note">${t.rapport}</div>` : ''}
        ${evalEv ? html`<div class="section-label">Évaluation</div>${evalCard(evalParse(evalEv.text), evalEv)}`
          : t.status === 'terminee' && !isAdmin() ? html`<div class="card eval-cta" style="margin-bottom:12px"><div><b>Votre avis compte</b><div class="small muted">Évaluez cette intervention en 30 secondes : rapidité, compétence, courtoisie, propreté.</div></div>
            <button class="btn primary" data-action="t-eval" data-id="${t.id}">⭐ Évaluer l’intervention</button></div>` : ''}
        <div class="section-label">Suivi</div>
        <div class="timeline">${d.events.map((e) => html`<div class="tl ${e.kind} ${e.user_role === 'admin' ? 'staff' : ''}">
          <div class="tl-head"><b>${evLabel(e)}</b> <span class="muted">· ${e.user_name || '—'}${e.user_role === 'admin' ? ' (LuxInterventions)' : ''} · ${fmtDateTime(e.created_at)}</span></div>
          ${e.text && e.kind !== 'create' && e !== evalEv ? html`<div class="tl-text">${e.text}</div>` : ''}
          ${e !== firstEvent ? gallery(byEvent[e.id]) : ''}
        </div>`)}</div>
        <form data-form="comment" class="comment-box">
          <input type="hidden" name="id" value="${t.id}">
          <textarea name="text" placeholder="${isAdmin() ? 'Message à la gérance…' : 'Message à LuxInterventions…'}" style="min-height:70px"></textarea>
          <div style="display:flex;gap:8px;align-items:center;margin-top:8px">
            <label class="btn sm" style="cursor:pointer">${icon('camera')} Photo<input type="file" name="photos" accept="image/*" multiple hidden data-input="count-files"></label>
            <span class="tiny muted" data-files></span>
            <button class="btn sm primary" type="submit" style="margin-left:auto">${icon('send')} Envoyer</button>
          </div>
        </form>`,
      after: () => sheetEl.querySelectorAll('img[data-photo]').forEach(loadPhotoInto),
    };
  },

  'eval-form'({ id, data }) {
    const t = data.ticket, res = data.residence || {};
    return {
      title: 'Fiche d’évaluation de l’intervention',
      body: html`<form id="f" data-form="eval" class="eval-form">
        <input type="hidden" name="id" value="${id}"><input type="hidden" name="ref" value="${t.ref}">
        <p class="small" style="margin:0 0 10px">Votre avis est essentiel pour améliorer notre service.</p>
        <dl class="kv small" style="margin-bottom:12px">
          ${kv('Intervention n°', '#' + t.ref)}${kv('Date', fmtDate(t.done_at || t.updated_at))}${kv('Client / résidence', res.name + (res.org_name ? ' · ' + res.org_name : ''))}
        </dl>
        <div class="eval-grid">
          <div class="eval-head"><span></span>${EVAL_LVL.map(([, em, l]) => html`<span>${em}<small>${l}</small></span>`)}</div>
          ${EVAL_CRIT.map(([k, l, sub]) => html`<div class="eval-line" role="radiogroup" aria-label="${l}"><div class="eval-crit"><b>${l}</b><small>${sub}</small></div>
            ${EVAL_LVL.map(([v, em, lab]) => html`<label class="eval-opt" title="${lab}"><input type="radio" name="${k}" value="${v}" required><span>${em}</span><small>${lab}</small></label>`)}</div>`)}
        </div>
        <div class="section-label">Avis global</div>
        <div class="eval-global" role="radiogroup">${EVAL_GLOBAL.map(([v, l]) => html`<label class="eval-gopt"><input type="radio" name="global" value="${v}" required><span>${l}</span></label>`)}</div>
        <label class="field" style="margin-top:12px">Notes ou suggestions<textarea name="notes" maxlength="1500" placeholder="Facultatif"></textarea></label>
        <label class="field">Nom et prénom de la personne qui remplit<input name="nom" required value="${(state.me && state.me.name) || ''}" autocomplete="name"></label>
        <label class="row" style="gap:8px;align-items:flex-start;cursor:pointer"><input type="checkbox" name="ok" required style="width:20px;min-height:20px;margin-top:2px"><span class="small">Je confirme cette évaluation (vaut signature).</span></label>
        <div class="lock-err" role="alert"></div>
      </form>`,
      foot: html`<button class="btn" data-action="t-eval-back" data-id="${id}">Retour</button><button class="btn primary" type="submit" form="f">⭐ Envoyer l’évaluation</button>`,
    };
  },

  'ticket-form'({ data = {} }) {
    const res = (state.cache.residencesList || []).filter((r) => !isAdmin() || !state.filters.org || r.org_id === state.filters.org);
    if (!res.length) {
      return { title: 'Nouvelle demande', narrow: true, body: empty('building', 'Ajoutez d’abord la résidence concernée : ses informations (accès, clés, contact) seront reprises automatiquement.', html`<button class="btn primary" data-action="new-residence">${icon('plus')} Ajouter une résidence</button>`) };
    }
    return {
      title: 'Nouvelle demande',
      body: html`<form id="f" data-form="ticket" class="fields">
        <label class="field full">Résidence<select name="residence_id" required><option value="">— Choisir —</option>
          ${res.map((r) => html`<option value="${r.id}" ${data.residence_id === r.id ? new Raw('selected') : ''}>${r.name}${r.address ? ' — ' + r.address : ''}${isAdmin() ? ' (' + r.org_name + ')' : ''}</option>`)}</select></label>
        <div class="full"><div class="small" style="font-weight:600;color:var(--text-2);margin-bottom:6px">Urgence</div>
          <div class="urg-choices">${Object.entries(URG).map(([k, u]) => html`<label class="urg-choice urg-${k}"><input type="radio" name="urgence" value="${k}" required ${k === (data.urgence || '') ? new Raw('checked') : ''}><span>${u.dot} <b>${u.label}</b><small>${u.sub}</small></span></label>`)}</div></div>
        <label class="field">Type de travaux<select name="categorie">${CATEGORIES.map((c) => html`<option value="${c}">${c}</option>`)}</select></label>
        <label class="field">Travail demandé<select name="nature"><option value="">—</option>${NATURES.map((c) => html`<option value="${c}">${c}</option>`)}</select></label>
        <label class="field">Où ?<select name="zone"><option value="">—</option>${ZONES.map((c) => html`<option value="${c}">${c}</option>`)}</select></label>
        ${field('Étage', 'etage', '', { placeholder: 'ex. RDC, 2, sous-sol' })}
        ${field('N° / précision', 'lieu', '', { full: true, placeholder: 'ex. App. 4B, box 12, chambre 3, cuisine' })}
        ${field('Date souhaitée', 'date_souhaitee', '', { type: 'date' })}
        <label class="field full">Description du problème<textarea name="description" required placeholder="Que se passe-t-il ? Depuis quand ? Risque de dégâts ?"></textarea></label>
        <label class="field full">Photos (jusqu'à 6)<input type="file" name="photos" accept="image/*" multiple data-input="preview-files"></label>
        <div class="full photos" id="preview"></div>
        ${field('Contact sur place', 'contact_name', '', { placeholder: 'Nom (locataire, concierge…)' })}
        ${field('Téléphone du contact', 'contact_phone', '', { type: 'tel', placeholder: '+352 …' })}
        ${field('Accès', 'acces', '', { full: true, placeholder: 'Code porte, clé chez le concierge… (sinon : infos de la résidence)' })}
        ${field('Disponibilités', 'dispo', '', { full: true, placeholder: 'ex. en semaine après 17 h' })}
      </form>`,
      foot: html`<button class="btn" data-action="close-sheet">Annuler</button><button class="btn primary" type="submit" form="f">${icon('send')} Envoyer la demande</button>`,
    };
  },

  residence({ id }) {
    const r = (state.cache.residences || state.cache.residencesList || []).find((x) => x.id === id);
    if (!r) return null;
    const hist = state.sheet.data && state.sheet.data.tickets;
    return {
      title: r.name,
      body: html`
        <dl class="kv small" style="margin-bottom:14px">
          ${kv('Adresse', r.address)}${isAdmin() ? kv('Gérance', r.org_name) : ''}${kv('Appartements', r.apartments)}
          ${kv('Accès', r.access)}${kv('Clés', r.keys_info)}${kv('Contact', [r.contact_name, r.contact_phone].filter(Boolean).join(' · '))}
        </dl>
        ${r.notes ? html`<div class="note" style="margin-bottom:14px">${r.notes}</div>` : ''}
        <button class="btn primary block" data-action="new-ticket" data-residence="${r.id}">${icon('plus')} Nouvelle demande pour cette résidence</button>
        <div class="section-label">Historique des interventions</div>
        ${hist ? (hist.length ? html`<div class="list">${hist.map(ticketRow)}</div>` : html`<p class="muted small">Aucune demande pour cette résidence.</p>`) : html`<div class="spinner accent"></div>`}`,
      foot: html`<button class="btn ghost danger" data-action="residence-archive" data-id="${r.id}">${icon('trash')}</button><button class="btn" data-action="edit-residence" data-id="${r.id}">${icon('edit')} Modifier</button>`,
    };
  },

  'residence-form'({ id }) {
    const r = id ? (state.cache.residences || state.cache.residencesList || []).find((x) => x.id === id) || {} : {};
    return {
      title: id ? 'Modifier la résidence' : 'Nouvelle résidence',
      body: html`<form id="f" data-form="residence" class="fields">
        <input type="hidden" name="id" value="${id || ''}">
        ${isAdmin() && !id ? html`<label class="field full">Gérance<select name="org_id" required><option value="">— Choisir —</option>${(state.cache.orgs || []).map((o) => html`<option value="${o.id}" ${state.filters.org === o.id ? new Raw('selected') : ''}>${o.name}</option>`)}</select></label>` : ''}
        ${field('Nom de la résidence', 'name', r.name, { full: true, required: true, placeholder: 'ex. Résidence Val St André 37' })}
        ${field('Adresse', 'address', r.address, { full: true, placeholder: 'Rue, numéro, code postal, ville' })}
        ${field("Nombre d'appartements", 'apartments', r.apartments, { type: 'number', attrs: 'min="0" inputmode="numeric"' })}
        ${field('Contact sur place', 'contact_name', r.contact_name, { placeholder: 'Concierge, président du conseil…' })}
        ${field('Téléphone du contact', 'contact_phone', r.contact_phone, { type: 'tel' })}
        ${field('Accès', 'access', r.access, { full: true, placeholder: 'Code porte, badge, interphone…' })}
        ${field('Clés', 'keys_info', r.keys_info, { full: true, placeholder: 'Où trouver les clés (local, boîte à clés…)' })}
        <label class="field full">Notes<textarea name="notes" placeholder="Compteurs, local technique, particularités…">${r.notes || ''}</textarea></label>
      </form>`,
      foot: html`<button class="btn" data-action="close-sheet">Annuler</button><button class="btn primary" type="submit" form="f">Enregistrer</button>`,
    };
  },

  'status-form'({ id, data }) {
    const t = data.ticket;
    const kind = data.kind; // plan | finish
    const d = new Date(Date.now() + 3600000);
    const local = (x) => new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    return {
      title: kind === 'plan' ? `Planifier #${t.ref}` : `Terminer #${t.ref}`,
      narrow: true,
      body: html`<form id="f" data-form="status" class="fields">
        <input type="hidden" name="id" value="${id}"><input type="hidden" name="kind" value="${kind}">
        ${kind === 'plan' ? html`${field('Date et heure', 'planned_at', t.planned_at || local(d), { type: 'datetime-local', required: true, full: true })}
          ${field('Technicien', 'technicien', t.technicien, { full: true, placeholder: 'Nom du technicien' })}
          <label class="field full">Message à la gérance (facultatif)<textarea name="text" style="min-height:70px" placeholder="ex. Merci de prévenir le locataire"></textarea></label>`
        : html`<label class="field full">Rapport d'intervention<textarea name="rapport" required placeholder="Travaux effectués, pièces remplacées, recommandations…">${t.rapport || ''}</textarea></label>
          <label class="field full">Photos après intervention<input type="file" name="photos" accept="image/*" multiple></label>`}
      </form>`,
      foot: html`<button class="btn" data-action="back-ticket" data-id="${id}">Retour</button><button class="btn primary" type="submit" form="f">${kind === 'plan' ? 'Planifier' : 'Terminer l’intervention'}</button>`,
    };
  },

  org({ id }) {
    const { orgs, users } = state.cache.gerances || { orgs: [], users: [] };
    const o = orgs.find((x) => x.id === id);
    if (!o) return null;
    const list = users.filter((u) => u.org_id === id);
    return {
      title: o.name,
      body: html`
        <dl class="kv small" style="margin-bottom:14px">${kv('Téléphone', o.phone)}${kv('Email', o.email)}${kv('Résidences', String(o.residences))}${kv('Demandes en cours', String(o.open))}</dl>
        <div class="section-label" style="margin-top:0">Utilisateurs</div>
        ${list.length ? html`<div class="list">${list.map(userRow)}</div>` : html`<p class="muted small">Aucun utilisateur. Invitez le responsable de la gérance.</p>`}
        <button class="btn primary block" style="margin-top:12px" data-action="new-user" data-org="${id}" data-role="gerance_admin">${icon('plus')} Inviter un utilisateur</button>
        <div class="actions" style="margin-top:12px">
          <button class="btn" data-action="org-residences" data-id="${id}">${icon('building')} Résidences</button>
          <button class="btn" data-action="org-tickets" data-id="${id}">${icon('wrench')} Demandes</button>
        </div>`,
      foot: html`<button class="btn ghost danger" data-action="del-org" data-id="${id}">${icon('trash')} Supprimer la gérance</button><button class="btn" data-action="edit-org" data-id="${id}">${icon('edit')} Modifier</button>`,
    };
  },

  'org-form'({ id }) {
    const o = id ? (state.cache.orgs || []).find((x) => x.id === id) || {} : {};
    return {
      title: id ? 'Modifier la gérance' : 'Nouvelle gérance',
      narrow: true,
      body: html`<form id="f" data-form="org" class="fields"><input type="hidden" name="id" value="${id || ''}">
        ${field('Nom', 'name', o.name, { full: true, required: true, placeholder: 'ex. Gérance Dupont SA' })}
        ${field('Téléphone', 'phone', o.phone, { type: 'tel' })}${field('Email', 'email', o.email, { type: 'email' })}</form>`,
      foot: html`<button class="btn" data-action="close-sheet">Annuler</button><button class="btn primary" type="submit" form="f">Enregistrer</button>`,
    };
  },

  'user-form'({ data }) {
    const roles = data.role === 'admin' ? [['admin', ROLES.admin]] : [['gerance_admin', 'Responsable (peut inviter des collègues)'], ['gerance_user', 'Utilisateur (fait et suit les demandes)']];
    return {
      title: data.role === 'admin' ? 'Inviter un membre de l’équipe' : 'Inviter un utilisateur',
      narrow: true,
      body: html`<form id="f" data-form="user" class="fields"><input type="hidden" name="org_id" value="${data.org || ''}">
        ${field('Nom et prénom', 'name', '', { full: true, required: true })}
        ${field('Email', 'email', '', { full: true, type: 'email', required: true })}
        ${field('Téléphone', 'phone', '', { full: true, type: 'tel' })}
        <label class="field full">Rôle<select name="role">${roles.map(([k, l]) => html`<option value="${k}" ${k === data.role ? new Raw('selected') : ''}>${l}</option>`)}</select></label>
        <p class="tiny muted full">Un lien personnel sera créé : la personne l’ouvre et choisit son mot de passe. Valable 14 jours.</p></form>`,
      foot: html`<button class="btn" data-action="close-sheet">Annuler</button><button class="btn primary" type="submit" form="f">Créer le lien</button>`,
    };
  },

  'invite-link'({ data }) {
    const link = `${location.origin}/portail.html#invite=${data.token}`;
    const inv = INVITE[LANG] || INVITE.fr;
    const msg = inv.text(data.name, link);
    const tel = (data.phone || '').replace(/[^\d]/g, '').replace(/^00/, '');
    return {
      title: 'Lien d’accès prêt',
      narrow: true,
      body: html`${state.demo ? html`<div class="alert info" style="margin-bottom:10px">${icon('eye')}<div>Démo : ce lien est fictif. En réel, la personne l’ouvre et choisit son mot de passe.</div></div>` : ''}<p class="small" style="margin-bottom:10px">Envoyez ce lien à <b>${data.name}</b> (${data.email}). Il est personnel : ne le partagez pas avec d’autres personnes.</p>
        <div class="note" style="word-break:break-all;font-family:var(--mono);font-size:12px" id="invLink">${link}</div>
        <div class="actions" style="margin-top:12px">
          <button class="btn" data-action="copy" data-text="${link}">${icon('file')} Copier</button>
          <a class="btn" href="mailto:${data.email}?subject=${encodeURIComponent(inv.subject)}&body=${encodeURIComponent(msg)}">${icon('mail')} Email</a>
          <a class="btn" target="_blank" rel="noopener" href="https://wa.me/${tel}?text=${encodeURIComponent(msg)}">${icon('msg')} WhatsApp</a>
        </div>`,
      foot: html`<button class="btn primary" data-action="close-sheet">Terminé</button>`,
    };
  },

  'password-form'() {
    return {
      title: 'Changer mon mot de passe',
      narrow: true,
      body: html`<form id="f" data-form="password" class="stack">
        <label class="field">Mot de passe actuel ${pwField('old', '', 'current-password')}</label>
        <label class="field">Nouveau mot de passe ${pwField('pass', 'Au moins 10 caractères', 'new-password')}</label>
        <label class="field">Confirmer ${pwField('pass2', '', 'new-password')}</label>
        <div class="lock-err" role="alert"></div></form>`,
      foot: html`<button class="btn" data-action="close-sheet">Annuler</button><button class="btn primary" type="submit" form="f">Changer</button>`,
    };
  },
};

// ───────────────────────── Notifications push ─────────────────────────
let pushSub = null;
let pushPerm = typeof Notification !== 'undefined' ? Notification.permission : 'unsupported';
function pushState() {
  if (state.demo) return 'demo';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || typeof Notification === 'undefined') return 'unsupported';
  if (pushPerm === 'denied') return 'denied';
  return pushSub ? 'on' : 'off';
}
async function initPush() {
  if (pushState() === 'unsupported' || pushState() === 'demo') return;
  try {
    const reg = await navigator.serviceWorker.getRegistration('/portail');
    pushSub = reg ? await reg.pushManager.getSubscription() : null;
    if (pushSub) await api('push', { method: 'POST', body: pushSub.toJSON() });
  } catch {}
  renderView();
}
async function enablePush() {
  if (pushState() === 'unsupported') return toast('Notifications non disponibles ici. Sur iPhone : installez l’app puis ouvrez-la depuis l’icône.', { bad: true });
  pushPerm = await Notification.requestPermission();
  if (pushPerm !== 'granted') { renderView(); return toast('Notifications refusées', { bad: true }); }
  const reg = await navigator.serviceWorker.register('/portail-sw.js', { scope: '/portail' });
  await navigator.serviceWorker.ready;
  const key = Uint8Array.from(atob(state.vapidKey.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((state.vapidKey.length + 3) % 4)), (c) => c.charCodeAt(0));
  pushSub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
  await api('push', { method: 'POST', body: pushSub.toJSON() });
  renderView();
  toast('Notifications activées');
}
async function disablePush() {
  if (pushSub) {
    try { await api('push', { method: 'DELETE', body: { endpoint: pushSub.endpoint } }); } catch {}
    try { await pushSub.unsubscribe(); } catch {}
  }
  pushSub = null;
  renderView();
}

let installPrompt = null;
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installPrompt = e; if (state.route === 'plus') renderView(); });

// ───────────────────────── Rapport mensuel imprimable ─────────────────────────
async function printReport(month, org) {
  const [y, m] = month.split('-').map(Number);
  const { tickets } = await api(`tickets?scope=all&month=${month}${org ? '&org=' + org : ''}`);
  const title = `Rapport d'interventions — ${MONTHS_FULL[m - 1]} ${y}`;
  const who = org ? orgName(org) : isAdmin() ? 'Toutes les gérances' : state.me.org_name;
  const done = tickets.filter((t) => t.status === 'terminee');
  const takes = tickets.filter((t) => t.taken_at).map((t) => t.taken_at - t.created_at);
  const avg = takes.length ? takes.reduce((a, b) => a + b, 0) / takes.length : null;
  const byCat = {};
  tickets.forEach((t) => (byCat[t.categorie || 'Autre'] = (byCat[t.categorie || 'Autre'] || 0) + 1));
  const el = $('#print');
  setHtml(el, html`<div class="pr-head"><div><b>LuxInterventions</b> · ${title}</div><div>Imprimé le ${fmtDate(Date.now())}</div></div>
    <h1>${title}</h1><p class="pr-sub">${who}</p>
    <table class="tbl"><tbody>
      <tr><td>Demandes reçues</td><td class="r">${tickets.length}</td></tr>
      <tr><td>Dont urgentes</td><td class="r">${tickets.filter((t) => t.urgence === 'urgent').length}</td></tr>
      <tr><td>Terminées</td><td class="r">${done.length}</td></tr>
      <tr><td>Délai moyen de prise en charge</td><td class="r">${duration(avg)}</td></tr>
    </tbody></table>
    ${Object.keys(byCat).length ? html`<h2>Par type</h2><table class="tbl"><tbody>${Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([k, v]) => html`<tr><td>${k}</td><td class="r">${v}</td></tr>`)}</tbody></table>` : ''}
    <h2>Détail des demandes</h2>
    ${tickets.length ? html`<table class="tbl"><thead><tr><th>N°</th><th>Date</th><th>Résidence</th><th>Lieu</th><th>Type</th><th>Urgence</th><th>Statut</th><th>Prise en charge</th></tr></thead><tbody>
      ${tickets.sort((a, b) => a.created_at - b.created_at).map((t) => html`<tr><td>${t.ref}</td><td>${fmtDate(t.created_at)}</td><td>${t.residence_name}</td><td>${t.lieu || ''}</td><td>${t.categorie || ''}</td><td>${URG[t.urgence].label}</td><td>${STATUS[t.status].label}</td><td>${t.taken_at ? duration(t.taken_at - t.created_at) : '—'}</td></tr>`)}
    </tbody></table>` : html`<p>Aucune demande ce mois-ci.</p>`}`);
  document.body.classList.add('printing');
  const doneFn = () => { document.body.classList.remove('printing'); setHtml(el, ''); removeEventListener('afterprint', doneFn); };
  addEventListener('afterprint', doneFn);
  setTimeout(() => print(), 60);
}

// ───────────────────────── Actions ─────────────────────────
async function setStatus(id, status, extra = {}) {
  await api(`tickets/${id}/status`, { method: 'POST', body: { status, ...extra } });
  await refresh(true);
  await openTicket(id, true);
}

const ACTIONS = {
  go: (d) => { if (state.sheet) closeSheet(); go(d.to); },
  retry: () => go(state.route, true),
  logout: async () => { if (await confirmBox('Se déconnecter ?', { ok: 'Déconnexion' })) logout(); },
  'to-login': () => renderLock('login'),
  'set-lang': (d) => { if (d.id === LANG) return; try { localStorage.setItem('ptlLang', d.id); } catch {} location.reload(); },
  'toggle-pw': (_, el) => {
    const inp = el.parentElement.querySelector('input');
    inp.type = inp.type === 'password' ? 'text' : 'password';
    setHtml(el, icon(inp.type === 'password' ? 'eye' : 'eyeOff'));
  },
  'close-sheet': () => closeSheet(),
  'demo-start': () => startDemo(),
  'demo-switch': async (d) => {
    state.demo.switchTo(d.id);
    state.me = { ...state.demo.me };
    state.cache = {};
    state.filters.org = '';
    if (state.sheet) closeSheet();
    renderShell();
    await go('home', true);
    toast(d.id === 'admin' ? 'Vous voyez maintenant le portail comme l’équipe LuxInterventions' : 'Vous voyez maintenant le portail comme une gérance');
  },
  'guide-hide': () => { try { localStorage.setItem('ptlGuideHidden', '1'); } catch {} state.guideHidden = true; renderView(); },
  'open-ticket': (d) => openTicket(d.id),
  'back-ticket': (d) => openTicket(d.id),
  async 'new-ticket'(d) {
    if (!state.cache.residencesList) state.cache.residencesList = (await api('residences')).residences;
    if (isAdmin() && !state.cache.orgs) state.cache.orgs = (await api('orgs')).orgs;
    openSheet('ticket-form', null, { residence_id: d.residence || '' });
  },
  async 't-take'(d) { await setStatus(d.id, 'prise'); toast('Demande prise en charge — la gérance est prévenue'); },
  async 't-start'(d) { await setStatus(d.id, 'encours'); toast('Intervention en cours'); },
  't-plan': (d) => openSheet('status-form', d.id, { ticket: state.sheet.data.ticket, kind: 'plan' }),
  't-eval': (d) => openSheet('eval-form', d.id, { ticket: state.sheet.data.ticket, residence: state.sheet.data.residence }),
  't-eval-back': (d) => openTicket(d.id),
  't-finish': (d) => openSheet('status-form', d.id, { ticket: state.sheet.data.ticket, kind: 'finish' }),
  async 't-cancel'(d) {
    if (!(await confirmBox('Annuler cette demande ?', { ok: 'Annuler la demande', danger: true }))) return;
    await setStatus(d.id, 'annulee');
    toast('Demande annulée');
  },
  scope: (d) => { state.filters.scope = d.id; go('demandes', true); },
  'urg-filter': (d) => { state.filters.urg = d.id; renderView(); },
  'org-filter': (d) => { state.filters.org = d.id; state.filters.residence = ''; go(state.route, true); },
  'new-residence': async () => {
    if (isAdmin() && !state.cache.orgs) state.cache.orgs = (await api('orgs')).orgs;
    openSheet('residence-form');
  },
  'edit-residence': (d) => openSheet('residence-form', d.id),
  async 'open-residence'(d) {
    openSheet('residence', d.id, null);
    try {
      const { tickets } = await api(`tickets?scope=all&residence=${d.id}`);
      if (state.sheet && state.sheet.kind === 'residence' && state.sheet.id === d.id) { state.sheet.data = { tickets }; renderSheet(); }
    } catch (e) { toast(e.message, { bad: true }); }
  },
  async 'residence-archive'(d) {
    if (!(await confirmBox('Retirer cette résidence ?', { ok: 'Retirer', danger: true, detail: 'Elle ne sera plus proposée pour les nouvelles demandes. L’historique des interventions est conservé.' }))) return;
    await api('residences/' + d.id, { method: 'PATCH', body: { active: false } });
    state.cache.residencesList = null;
    closeSheet();
    go('residences', true);
  },
  'new-org': () => openSheet('org-form'),
  // supprimer une gérance : tout ce qui la concerne (utilisateurs, résidences, demandes, photos) — on tape son nom pour confirmer
  async 'del-org'(d) {
    const o = (state.cache.orgs || []).find((x) => x.id === d.id);
    if (!o) return;
    const typed = prompt(`${T('Supprimer définitivement la gérance, ses utilisateurs, ses résidences, ses demandes et leurs photos ?')}\n\n${T('Tapez son nom pour confirmer :')} ${o.name}`);
    if (typed == null) return;
    if (typed.trim() !== o.name) return toast(T('Nom différent : rien n’a été supprimé.'), { bad: true });
    try {
      await api('orgs/' + o.id, { method: 'DELETE', body: { confirm: typed.trim() } });
      toast(T('Gérance supprimée'));
      closeSheet(true);
      await refresh(true);
    } catch (e) { toast(e.message, { bad: true }); }
  },
  'edit-org': (d) => openSheet('org-form', d.id),
  'open-org': (d) => openSheet('org', d.id),
  'org-residences': (d) => { state.filters.org = d.id; closeSheet(); go('residences'); },
  'org-tickets': (d) => { state.filters.org = d.id; closeSheet(); go('demandes'); },
  'new-user': (d) => openSheet('user-form', null, { org: d.org, role: d.role }),
  async 'user-link'(d) {
    const users = (state.cache.gerances && state.cache.gerances.users) || state.cache.equipe || [];
    const u = users.find((x) => x.id === d.id);
    if (u.has_password && !(await confirmBox(`Nouveau lien pour ${u.name} ?`, { ok: 'Créer le lien', detail: 'Son mot de passe actuel restera valable jusqu’à ce qu’il en choisisse un nouveau avec le lien.' }))) return;
    const { invite } = await api(`users/${d.id}/invite`, { method: 'POST' });
    openSheet('invite-link', null, { token: invite, name: u.name, email: u.email, phone: u.phone });
  },
  async 'user-toggle'(d) {
    const active = d.active !== '1';
    if (!active && !(await confirmBox('Désactiver cet accès ?', { ok: 'Désactiver', danger: true, detail: 'La personne est déconnectée immédiatement et ne peut plus se connecter. Ses demandes restent dans l’historique.' }))) return;
    await api('users/' + d.id, { method: 'PATCH', body: { active } });
    await refresh(true);
    if (state.sheet && state.sheet.kind === 'org') renderSheet();
    toast(active ? 'Accès réactivé' : 'Accès désactivé');
  },
  'change-password': () => openSheet('password-form'),
  copy: async (d) => { try { await navigator.clipboard.writeText(d.text); toast('Copié'); } catch { toast('Copie impossible', { bad: true }); } },
  'push-on': () => enablePush().catch((e) => toast(e.message || 'Impossible d’activer les notifications', { bad: true })),
  'push-off': () => disablePush(),
  'push-test': async () => { await api('push/test', { method: 'POST' }); toast('Notification de test envoyée'); },
  install: async () => { if (!installPrompt) return; installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; renderView(); },
};

// ───────────────────────── Formulaires ─────────────────────────
const fd2obj = (fd) => Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === 'string'));
const FORMS = {
  async login(fd, form) {
    const btn = form.querySelector('[type=submit]');
    setBusy(btn, true, 'Connexion…');
    try {
      state.lastEmail = fd.get('email').trim().toLowerCase();
      await login(state.lastEmail, fd.get('pass'));
      await startSession();
    } catch (e) {
      setBusy(btn, false);
      form.querySelector('.lock-err').textContent = e.message;
    }
  },
  async setup(fd, form) {
    const err = checkPasswords(form);
    if (err) return (form.querySelector('.lock-err').textContent = err);
    const btn = form.querySelector('[type=submit]');
    setBusy(btn, true, 'Création…');
    try {
      const { iter } = await api('status');
      const email = fd.get('email').trim().toLowerCase();
      const cred = await newCredentials(fd.get('pass'), iter);
      await api('setup', { method: 'POST', body: { setupCode: fd.get('code'), name: fd.get('name'), email, ...cred } });
      state.lastEmail = email;
      await login(email, fd.get('pass'));
      await startSession();
      toast('Compte administrateur créé');
    } catch (e) {
      setBusy(btn, false);
      form.querySelector('.lock-err').textContent = e.message;
    }
  },
  async invite(fd, form) {
    const err = checkPasswords(form);
    if (err) return (form.querySelector('.lock-err').textContent = err);
    const btn = form.querySelector('[type=submit]');
    setBusy(btn, true, 'Activation…');
    try {
      const d = await api('invite/' + fd.get('token'));
      const cred = await newCredentials(fd.get('pass'), d.iter);
      const { token } = await api('invite/' + fd.get('token'), { method: 'POST', body: cred });
      state.lastEmail = d.email;
      saveToken(token);
      await startSession();
      toast('Bienvenue ! Votre accès est activé.');
    } catch (e) {
      setBusy(btn, false);
      form.querySelector('.lock-err').textContent = e.message;
    }
  },
  async ticket(fd, form) {
    const btn = $('#sheet button[type=submit]');
    const files = [...form.photos.files].slice(0, 6);
    setBusy(btn, true, 'Envoi…');
    try {
      const body = fd2obj(fd);
      // type + travail demandé, zone + étage + précision, date souhaitée + disponibilités
      body.categorie = [body.categorie, body.nature].filter(Boolean).join(' · ').slice(0, 60);
      body.lieu = [body.zone, body.etage ? 'Étage ' + body.etage : '', body.lieu].filter(Boolean).join(' · ').slice(0, 200);
      const ds = /^\d{4}-\d{2}-\d{2}$/.test(body.date_souhaitee || '') ? body.date_souhaitee.split('-').reverse().join('/') : '';
      body.dispo = [ds ? 'Date souhaitée : ' + ds : '', body.dispo].filter(Boolean).join(' · ');
      for (const k of ['nature', 'zone', 'etage', 'date_souhaitee']) delete body[k];
      const { id, ref } = await api('tickets', { method: 'POST', body });
      if (files.length) { setBusy(btn, true, `Photos 0/${files.length}…`); await uploadPhotos(id, files); }
      toast(`Demande #${ref} envoyée — LuxInterventions est prévenu`);
      await refresh(true);
      await openTicket(id);
    } catch (e) {
      setBusy(btn, false);
      toast(e.message, { bad: true });
    }
  },
  async eval(fd, form) {
    const v = { nom: String(fd.get('nom') || '').trim(), notes: String(fd.get('notes') || '').trim().replace(/\s*\n\s*/g, ' '), global: fd.get('global') };
    for (const [k] of EVAL_CRIT) v[k] = fd.get(k);
    const err = form.querySelector('.lock-err');
    if (EVAL_CRIT.some(([k]) => !v[k]) || !v.global) return (err.textContent = 'Choisissez une note pour chaque critère et l’avis global.');
    if (!v.nom) return (err.textContent = 'Indiquez votre nom.');
    if (!fd.get('ok')) return (err.textContent = 'Cochez la confirmation.');
    const btn = $('#sheet button[type=submit]');
    setBusy(btn, true);
    try {
      await api(`tickets/${fd.get('id')}/comments`, { method: 'POST', body: { text: evalText(fd.get('ref'), v) } });
      toast('Merci ! Évaluation envoyée à LuxInterventions');
      await openTicket(fd.get('id'));
    } catch (e) {
      setBusy(btn, false);
      toast(e.message, { bad: true });
    }
  },
  async comment(fd, form) {
    const files = [...form.photos.files].slice(0, 6);
    const text = fd.get('text').trim();
    if (!text && !files.length) return;
    const btn = form.querySelector('[type=submit]');
    setBusy(btn, true);
    try {
      const { event_id } = await api(`tickets/${fd.get('id')}/comments`, { method: 'POST', body: { text, photoOnly: !text } });
      if (files.length) await uploadPhotos(fd.get('id'), files, event_id);
      await openTicket(fd.get('id'), true);
    } catch (e) {
      setBusy(btn, false);
      toast(e.message, { bad: true });
    }
  },
  async status(fd, form) {
    const id = fd.get('id');
    const btn = $('#sheet button[type=submit]');
    setBusy(btn, true);
    try {
      if (fd.get('kind') === 'plan') {
        await api(`tickets/${id}/status`, { method: 'POST', body: { status: 'planifiee', planned_at: fd.get('planned_at'), technicien: fd.get('technicien'), text: fd.get('text') } });
        toast('Intervention planifiée — la gérance est prévenue');
      } else {
        const r = await api(`tickets/${id}/status`, { method: 'POST', body: { status: 'terminee', rapport: fd.get('rapport') } });
        const files = [...form.photos.files];
        if (files.length) await uploadPhotos(id, files, r.event_id);
        toast('Intervention terminée');
      }
      await refresh(true);
      await openTicket(id);
    } catch (e) {
      setBusy(btn, false);
      toast(e.message, { bad: true });
    }
  },
  async residence(fd) {
    const b = fd2obj(fd);
    try {
      if (b.id) await api('residences/' + b.id, { method: 'PATCH', body: b });
      else await api('residences', { method: 'POST', body: b });
      state.cache.residencesList = null;
      toast('Résidence enregistrée');
      closeSheet();
      if (state.route === 'residences') await go('residences', true); else await refresh(true);
    } catch (e) { toast(e.message, { bad: true }); }
  },
  async org(fd) {
    const b = fd2obj(fd);
    try {
      if (b.id) await api('orgs/' + b.id, { method: 'PATCH', body: b });
      else await api('orgs', { method: 'POST', body: b });
      state.cache.orgs = null;
      closeSheet();
      await go('gerances', true);
      toast('Gérance enregistrée');
    } catch (e) { toast(e.message, { bad: true }); }
  },
  async user(fd) {
    const b = fd2obj(fd);
    try {
      const { invite } = await api('users', { method: 'POST', body: b });
      await refresh(true);
      openSheet('invite-link', null, { token: invite, name: b.name, email: b.email, phone: b.phone });
    } catch (e) { toast(e.message, { bad: true }); }
  },
  async password(fd, form) {
    const errEl = form.querySelector('.lock-err');
    const err = checkPasswords(form);
    if (err) return (errEl.textContent = err);
    try {
      const pre = await api('prelogin', { method: 'POST', body: { email: state.me.email } });
      const oldKey = await deriveKey(fd.get('old'), pre.salt, pre.iter);
      const cred = await newCredentials(fd.get('pass'), pre.iter);
      await api('me/password', { method: 'POST', body: { oldKey, ...cred } });
      closeSheet();
      toast('Mot de passe changé');
    } catch (e) { errEl.textContent = e.message; }
  },
  async report(fd) {
    try { await printReport(fd.get('month'), fd.get('org') || ''); } catch (e) { toast(e.message, { bad: true }); }
  },
};

// ───────────────────────── Événements ─────────────────────────
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el || !ACTIONS[el.dataset.action]) return;
  e.preventDefault();
  Promise.resolve(ACTIONS[el.dataset.action](el.dataset, el, e)).catch((err) => toast(err.message || 'Erreur', { bad: true }));
});
document.addEventListener('submit', (e) => {
  const f = e.target;
  if (!FORMS[f.dataset.form]) return;
  e.preventDefault();
  FORMS[f.dataset.form](new FormData(f), f);
});
document.addEventListener('input', (e) => {
  const k = e.target.dataset.input;
  if (k === 'q') { state.filters.q = e.target.value; renderView(); }
  if (k === 'rq') { state.filters.rq = e.target.value; renderView(); }
});
document.addEventListener('change', (e) => {
  const k = e.target.dataset.input;
  if (k === 'residence') { state.filters.residence = e.target.value; go('demandes', true); }
  if (k === 'preview-files') {
    const box = $('#preview');
    revokePhotos();
    const files = [...e.target.files];
    if (files.length > 6) toast('6 photos maximum : les premières seront envoyées');
    setHtml(box, files.slice(0, 6).map((f) => { const u = URL.createObjectURL(f); photoUrls.push(u); return html`<a><img src="${u}" alt=""></a>`; }));
  }
  if (k === 'count-files') {
    const n = e.target.files.length;
    e.target.closest('form').querySelector('[data-files]').textContent = n ? `${n} photo${n > 1 ? 's' : ''}` : '';
  }
});

navigator.serviceWorker && navigator.serviceWorker.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'open' && state.me) {
    const m = String(e.data.url || '').match(/#\/t\/([a-z0-9]+)/);
    if (m) openTicket(m[1]);
  }
});

boot();
