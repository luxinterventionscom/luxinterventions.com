// LGR · Lux Gestion Résidences — Résidences & Syndics
// Archive des devis, rapports et factures par syndic / gérance / agence et par résidence : recherche, aperçu avec loupe,
// dossiers d'intervention (Dev. → Rap. → Fac.), récapitulatifs Excel / PDF, impression et envoi. Chiffré, synchronisé.
import * as C from './core.js';
import { S, put, get, live, trash, restore } from './core.js';
import { tr, LANGS } from './i18n.js';
import { openPdf, pdfPageUrl, pdfText, kindOf, attachLens, zoomView } from './viewer.js';
import { xlsxBlob } from '../ares/xlsx.js';
import { makePdf, textWidth } from '../ares/pdfmini.js';
import { passphraseStrength } from '../ares/crypto.js';

export const VERSION = '1.0.2';
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const ls = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* */ } } };

// ── Langue ──
let LANG = ls.get('lgrLang', '') || (LANGS.includes((navigator.language || 'fr').slice(0, 2)) ? navigator.language.slice(0, 2) : 'fr');
const t = (s, ...a) => { let o = tr(s, LANG); a.forEach((v, i) => { o = o.split('{' + i + '}').join(v); }); return o; };
const LOC = { fr: 'fr-FR', en: 'en-GB', de: 'de-DE', it: 'it-IT' };

// ── Thème (par appareil) ──
const THEMES = { verre: 'Bleu nuit & Verre', noir: 'Noir & Or', ivoire: 'Ivoire & Encre' };
const setTheme = (k) => { document.documentElement.dataset.theme = THEMES[k] ? k : 'verre'; ls.set('lgrTheme', k); const m = $('meta[name=theme-color]'); if (m) m.content = { verre: '#0f1c2e', noir: '#0e0e10', ivoire: '#f6f3ec' }[k] || '#0f1c2e'; };
setTheme(ls.get('lgrTheme', 'verre'));

// ── Formats ──
const TYPES = { fac: 'Fac.', dev: 'Dev.', rap: 'Rap.' };
const TYPE_LONG = { fac: 'Facture', dev: 'Devis', rap: 'Rapport' };
const STATES = { fac: { apayer: 'À payer', payee: 'Payée' }, dev: { attente: 'En attente', accepte: 'Accepté', refuse: 'Refusé' }, rap: {} };
const DEF_ST = { fac: 'apayer', dev: 'attente', rap: '' };
const SYN_TYPES = { syndic: 'Syndic', gerance: 'Gérance', agence: 'Agence' };
const money = (n) => (n == null || n === '' || isNaN(n)) ? '—' : new Intl.NumberFormat(LOC[LANG] || 'fr-FR', { style: 'currency', currency: 'EUR' }).format(n);
const dmy = (iso) => { if (!iso) return '—'; const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };
const today = () => new Date().toISOString().slice(0, 10);
const parseAmount = (v) => { const s = String(v ?? '').replace(/[\s  ’']/g, '').replace(/€|eur/i, ''); if (!s) return null; const n = parseFloat(/,\d{1,2}$/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '')); return isFinite(n) ? Math.round(n * 100) / 100 : null; };
const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const stLabel = (d) => (STATES[d.type] || {})[d.st] || '';
const stClass = (d) => ({ payee: 'ok', accepte: 'ok', refuse: 'bad', apayer: 'warn', attente: 'mut' })[d.st] || 'mut';
const synName = (id) => (get('syn', id) || {}).nom || '';
const resName = (id) => (get('res', id) || {}).nom || '';
const resAddr = (r) => r ? [[r.rue, r.num].filter(Boolean).join(' '), [r.cp, r.ville].filter(Boolean).join(' '), r.pays && r.pays !== 'Luxembourg' ? r.pays : ''].filter(Boolean).join(', ') : '';
const docTitle = (d) => `${t(TYPES[d.type])} ${d.no || '—'}`;
const fileName = (d) => (d.file && d.file.name) || 'document';

// ── Toast et feuilles (modales) ──
function toast(m, ms = 2800) { const el = $('#toast'); el.textContent = m; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), ms); }
const sheets = [];
function sheet(html, { wide = false, onClose } = {}) {
  const el = document.createElement('div'); el.className = 'sheetbg';
  el.innerHTML = `<div class="sheet${wide ? ' wide' : ''}" role="dialog">${html}</div>`;
  document.body.appendChild(el); sheets.push({ el, onClose });
  el.addEventListener('mousedown', (e) => { if (e.target === el) closeSheet(); });
  translate(el);
  const f = el.querySelector('input:not([type=hidden]):not([type=checkbox]):not([type=file]),select,textarea'); if (f && matchMedia('(pointer:fine)').matches) setTimeout(() => f.focus(), 30);
  return el.firstElementChild;
}
function closeSheet() { const s = sheets.pop(); if (s) { s.el.remove(); if (s.onClose) s.onClose(); } }
addEventListener('keydown', (e) => { if (e.key === 'Escape' && sheets.length && !$('.zoomov')) closeSheet(); });
function ask(msg, { ok = 'OK', cancel = 'Annuler', danger = false } = {}) {
  return new Promise((res) => {
    const s = sheet(`<p class="askmsg">${esc(t(msg))}</p><div class="row end"><button class="btn g" data-a="no">${esc(t(cancel))}</button><button class="btn ${danger ? 'danger' : ''}" data-a="yes">${esc(t(ok))}</button></div>`, { onClose: () => res(false) });
    s.addEventListener('click', (e) => { const a = e.target.closest('[data-a]'); if (!a) return; const v = a.dataset.a === 'yes'; sheets.at(-1).onClose = null; closeSheet(); res(v); });
  });
}
// traduction des textes fixes déjà dans le HTML (attribut data-t ou texte des éléments marqués)
function translate(root) {
  if (LANG === 'fr') return;
  $$('[placeholder]', root).forEach((e) => { e.placeholder = t(e.getAttribute('placeholder')); });
  $$('[data-tt]', root).forEach((e) => { e.title = t(e.dataset.tt); });
}

// ── Boot : écran du coffre ──
const app = $('#app');
async function boot() {
  document.documentElement.lang = LANG;
  if (await C.resume()) return start();
  if (await C.hasVault()) return lockScreen('unlock');
  lockScreen('welcome');
}
function langPills() { return `<div class="langs">${LANGS.map((l) => `<button class="pill${l === LANG ? ' on' : ''}" data-lang="${l}">${l.toUpperCase()}</button>`).join('')}</div>`; }
function brandBlock() { return `<div class="lk-brand"><div class="lk-logo">LGR</div><div class="lk-name">Lux Gestion Résidences</div><div class="lk-sub">${esc(t('Résidences & Syndics'))}</div></div>`; }
function lockScreen(mode, extra = {}) {
  document.body.classList.add('locked');
  const errs = { badpass: 'Clé incorrecte.', offline: 'Pas de connexion : impossible de joindre le serveur.', novault: 'Aucun coffre LGR sur le serveur pour l’instant.', locked: 'Trop d’essais : réessayez dans 15 minutes.', server: 'Le serveur ne répond pas correctement. Réessayez.', norecovery: 'Pas de clé de secours pour ce coffre.' };
  let body = '';
  if (mode === 'welcome') body = `<h2>${esc(t('Bienvenue'))}</h2><p class="mut">${esc(t('Votre archive de devis, rapports et factures, chiffrée sur cet appareil et synchronisée entre vos appareils.'))}</p>
    <button class="btn big" data-a="new">🔐 ${esc(t('Créer mon coffre LGR'))}</button>
    <button class="btn g big" data-a="have">☁️ ${esc(t('J’ai déjà un coffre (autre appareil)'))}</button>`;
  if (mode === 'new') body = `<h2>${esc(t('Créer mon coffre'))}</h2><p class="mut">${esc(t('Choisissez une clé d’accès : une phrase longue que vous retenez (au moins 10 caractères). Personne ne peut la retrouver pour vous, nous non plus.'))}</p>
    <form data-f="new"><label>${esc(t('Clé d’accès'))}<input name="p1" type="password" autocomplete="new-password" required minlength="10"></label><div class="meter"><i></i></div>
    <label>${esc(t('Répétez la clé'))}<input name="p2" type="password" autocomplete="new-password" required></label>
    <div class="err"></div><button class="btn big">${esc(t('Créer le coffre'))}</button><button type="button" class="btn g" data-a="back">‹ ${esc(t('Retour'))}</button></form>`;
  if (mode === 'code') body = `<h2>🧩 ${esc(t('Votre clé de secours'))}</h2><p class="mut">${esc(t('Si vous oubliez la clé d’accès, seule cette clé de secours ouvre le coffre. Notez-la ou imprimez-la et gardez-la en lieu sûr.'))}</p>
    <div class="rcode">${esc(extra.code)}</div><div class="row"><button class="btn g" data-a="copy">📋 ${esc(t('Copier'))}</button><button class="btn g" data-a="printcode">🖨️ ${esc(t('Imprimer'))}</button></div>
    <label class="chk"><input type="checkbox" name="noted"> ${esc(t('Je l’ai notée en lieu sûr'))}</label><button class="btn big" data-a="codeok" disabled>${esc(t('Continuer'))} →</button>`;
  if (mode === 'unlock' || mode === 'have' || mode === 'rec') {
    const rec = mode === 'rec';
    body = `<h2>${esc(t(rec ? 'Ouvrir avec la clé de secours' : mode === 'have' ? 'Ouvrir mon coffre' : 'Déverrouiller'))}</h2>
    ${mode === 'have' ? `<p class="mut">${esc(t('Entrez la clé d’accès choisie sur votre autre appareil : le coffre et les documents arrivent du serveur.'))}</p>` : ''}
    <form data-f="unlock" data-rec="${rec ? 1 : ''}"><label>${esc(t(rec ? 'Clé de secours' : 'Clé d’accès'))}<input name="p" type="${rec ? 'text' : 'password'}" autocomplete="${rec ? 'off' : 'current-password'}" required ${rec ? 'placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"' : ''}></label>
    <label class="chk"><input type="checkbox" name="keep" checked> ${esc(t('Rester connecté sur cet appareil'))}</label>
    <div class="err"></div><button class="btn big">${esc(t('Ouvrir'))}</button></form>
    <div class="row center small">${rec ? `<button class="lnk" data-a="unlock">${esc(t('J’ai ma clé d’accès'))}</button>` : `<button class="lnk" data-a="rec">🧩 ${esc(t('Clé d’accès oubliée ?'))}</button>`}${mode === 'have' ? `<button class="lnk" data-a="back">‹ ${esc(t('Retour'))}</button>` : ''}</div>`;
  }
  app.innerHTML = `<div class="lockwrap"><div class="lockcard">${langPills()}${brandBlock()}${body}</div></div>`;
  translate(app);
  const card = $('.lockcard');
  const busy = (f, on) => { const b = f.querySelector('button:not([type=button])'); if (b) { b.disabled = on; b.classList.toggle('busy', on); } };
  card.onclick = async (e) => {
    const a = e.target.closest('[data-a],[data-lang]'); if (!a) return;
    if (a.dataset.lang) { LANG = a.dataset.lang; ls.set('lgrLang', LANG); document.documentElement.lang = LANG; return lockScreen(mode, extra); }
    const k = a.dataset.a;
    if (k === 'new') lockScreen('new'); else if (k === 'have') lockScreen('have'); else if (k === 'back') lockScreen('welcome');
    else if (k === 'rec') lockScreen('rec'); else if (k === 'unlock') lockScreen((await C.hasVault()) ? 'unlock' : 'have');
    else if (k === 'copy') { navigator.clipboard?.writeText(extra.code).then(() => toast(t('Copié'))); }
    else if (k === 'printcode') printHtml(`<h2>LGR · Lux Gestion Résidences</h2><p>${esc(t('Clé de secours du coffre'))}</p><p style="font:700 22pt monospace;letter-spacing:.05em">${esc(extra.code)}</p><p>${esc(t('À garder en lieu sûr. Elle ouvre le coffre si la clé d’accès est oubliée.'))}</p><p>${dmy(today())}</p>`);
    else if (k === 'codeok') { await C.remember(true); start(); }
  };
  card.onchange = (e) => { if (e.target.name === 'noted') $('[data-a=codeok]').disabled = !e.target.checked; };
  card.oninput = (e) => { if (e.target.name === 'p1') { const s = passphraseStrength(e.target.value); $('.meter i').style.width = (s * 25) + '%'; $('.meter').dataset.s = s; } };
  card.onsubmit = async (e) => {
    e.preventDefault(); const f = e.target, err = f.querySelector('.err'); err.textContent = '';
    if (f.dataset.f === 'new') {
      if (f.p1.value.length < 10) { err.textContent = t('Au moins 10 caractères.'); return; }
      if (f.p1.value !== f.p2.value) { err.textContent = t('Les deux clés ne sont pas identiques.'); return; }
      busy(f, true);
      try { const code = await C.createVault(f.p1.value); lockScreen('code', { code }); } catch (x) { console.error(x); err.textContent = t('Erreur : {0}', x.message); busy(f, false); }
    } else {
      busy(f, true);
      try { await C.unlock(f.p.value.trim() && f.dataset.rec ? f.p.value.trim() : f.p.value, { recovery: !!f.dataset.rec }); await C.remember(f.keep.checked); start(); }
      catch (x) { err.textContent = t(errs[x.message] || 'Erreur : {0}', x.message); busy(f, false); }
    }
  };
}

// ── L'app ouverte ──
let F = ls.get('lgrFilters', null) || {};
F = { q: '', type: '', per: 'all', y: new Date().getFullYear(), from: '', to: '', syn: '', res: '', st: '', ...F, q: '' };
let SEL = '', SORT = ls.get('lgrSort', { k: 'date', d: -1 }), LIMIT = 200;
let started = false;
function start() {
  document.body.classList.remove('locked');
  if (started) { app.innerHTML = shellHtml(); render(); C.sync(); return; }
  started = true;
  app.innerHTML = shellHtml();
  C.onChange((w) => { if (w === 'status') side(); else if (!document.querySelector('.sheetbg')) render(); else side(); });
  addEventListener('hashchange', render);
  app.addEventListener('click', onClick);
  app.addEventListener('input', onInput);
  app.addEventListener('change', onInput);
  dragDrop();
  render();
  C.serverMeta().then(() => { side(); C.sync(); });
}
const shellHtml = () => `<aside class="side"></aside><main class="main" id="main"></main><section class="prev" id="prev"></section>
  <nav class="tabs" id="tabs"></nav><button class="fab" data-a="add" aria-label="＋ Document">＋</button>
  <div class="dropzone" id="drop"><div>📥 ${esc(t('Déposez les fichiers ici'))}</div></div>`;
const route = () => (location.hash.replace(/^#\/?/, '') || 'docs').split('/');
function render() {
  if (document.body.classList.contains('locked') || !$('#main')) return;
  const [r, id] = route();
  document.body.dataset.view = r;
  side(); tabs();
  const main = $('#main');
  if (r === 'doc' && id) { SEL = id; main.innerHTML = ''; viewDoc(main, id); $('#prev').innerHTML = ''; return; }
  const V = { docs: viewDocs, syndics: viewSyndics, residences: viewResidences, dossiers: viewDossiers, recap: viewRecap, reglages: viewReglages, corbeille: viewTrash }[r] || viewDocs;
  V(main);
  translate(main);
  if (r === 'docs' && SEL && get('doc', SEL) && innerWidth >= 1100) preview($('#prev'), SEL); else $('#prev').innerHTML = r === 'docs' && innerWidth >= 1100 ? `<div class="empty">${esc(t('Choisissez un document pour le voir ici.'))}</div>` : '';
}
function side() {
  const s = S.db.soc || {}, el = $('.side'); if (!el) return;
  const r = route()[0];
  const n = (k) => `<a class="nav${r === k || (k === 'docs' && r === 'doc') ? ' on' : ''}" href="#/${k}">`;
  const syns = live('syn').sort((a, b) => a.nom.localeCompare(b.nom));
  const cnt = {}; live('doc').forEach((d) => { cnt[d.syn] = (cnt[d.syn] || 0) + 1; });
  el.innerHTML = `<button class="soc" data-a="soc" data-tt="Personnaliser : logo, société, thème">${s.logo ? `<img src="${esc(s.logo)}" alt="">` : `<span class="nologo">${esc(t('Votre logo'))}</span>`}<span class="socn"><b>${esc(s.nom || t('Votre société'))}</b><small>${esc(s.adresse || t('adresse · contact'))}</small></span><span class="pen">✏️</span></button>
    <div class="brand">LGR<small>Lux Gestion Résidences</small></div>
    ${n('docs')}🗂️ ${esc(t('Documents'))}</a>${n('syndics')}🏢 ${esc(t('Syndics & gérances'))}</a>${n('residences')}🏠 ${esc(t('Résidences'))}</a>${n('dossiers')}🔗 ${esc(t('Dossiers d’intervention'))}</a>${n('recap')}📊 ${esc(t('Récapitulatifs'))}</a>
    <div class="sec">${esc(t('Mes syndics'))}</div><div class="synlist">${syns.map((x) => `<a class="nav sm${F.syn === x.id && r === 'docs' ? ' on' : ''}" href="#/docs" data-a="fsyn" data-id="${x.id}">${esc(x.nom)} <span class="mut">· ${cnt[x.id] || 0}</span></a>`).join('') || `<div class="mut small pad">${esc(t('Aucun pour l’instant'))}</div>`}</div>
    <div class="grow"></div>${syncBadge()}${n('reglages')}⚙️ ${esc(t('Réglages'))}</a><button class="nav out" data-a="lock">🚪 ${esc(t('Se déconnecter'))}</button><div class="ver">LGR v${VERSION}</div><button class="mout" data-a="lock" aria-label="${esc(t('Se déconnecter'))}">🚪</button>`;
}
function syncBadge() {
  const m = S.meta || {};
  let txt, cls;
  if (!m.onServer) { txt = S.server === 'none' ? t('Synchronisation à activer') : t('Sur cet appareil seulement'); cls = 'warn'; }
  else if (!S.online) { txt = t('Hors ligne · enregistré ici'); cls = 'warn'; }
  else if (S.err === 'auth') { txt = t('Clé changée ailleurs : reconnectez-vous'); cls = 'bad'; }
  else if (S.err) { txt = t('Synchronisation en attente'); cls = 'warn'; }
  else { txt = S.lastSync ? t('Synchronisé') + ' · ' + new Date(S.lastSync).toLocaleTimeString(LOC[LANG], { hour: '2-digit', minute: '2-digit' }) : t('Synchronisation…'); cls = 'ok'; }
  return `<a class="syncb ${cls}" href="#/reglages">☁️ ${esc(txt)}</a>`;
}
function tabs() {
  const r = route()[0], el = $('#tabs');
  const T = [['docs', '🗂️', 'Documents'], ['syndics', '🏢', 'Syndics'], ['residences', '🏠', 'Résidences'], ['recap', '📊', 'Récap.'], ['reglages', '⚙️', 'Réglages']];
  el.innerHTML = T.map(([k, i, l]) => `<a href="#/${k}" class="${r === k || (k === 'docs' && r === 'doc') ? 'on' : ''}"><span>${i}</span>${esc(t(l))}</a>`).join('');
}

// ── Filtres et recherche ──
function period(f) {
  const y = +f.y || new Date().getFullYear(), now = new Date();
  const ym = (yy, m) => `${yy}-${String(m).padStart(2, '0')}`;
  const lastDay = (yy, m) => new Date(yy, m, 0).getDate();
  const R = (a, b) => [a, b];
  switch (f.per) {
    case 'm0': return R(ym(now.getFullYear(), now.getMonth() + 1) + '-01', ym(now.getFullYear(), now.getMonth() + 1) + '-' + lastDay(now.getFullYear(), now.getMonth() + 1));
    case 'm1': { const d = new Date(now.getFullYear(), now.getMonth() - 1, 1); return R(ym(d.getFullYear(), d.getMonth() + 1) + '-01', ym(d.getFullYear(), d.getMonth() + 1) + '-' + lastDay(d.getFullYear(), d.getMonth() + 1)); }
    case 'q1': case 'q2': case 'q3': case 'q4': { const q = +f.per[1]; return R(ym(y, q * 3 - 2) + '-01', ym(y, q * 3) + '-' + lastDay(y, q * 3)); }
    case 's1': return R(y + '-01-01', y + '-06-30');
    case 's2': return R(y + '-07-01', y + '-12-31');
    case 'y': return R(y + '-01-01', y + '-12-31');
    case 'custom': return R(f.from || '0000', f.to || '9999');
    default: return null;
  }
}
const perLabel = (f) => {
  const y = f.y; const L = { all: t('Toutes les dates'), m0: t('Ce mois-ci'), m1: t('Le mois dernier'), q1: `${t('T1')} ${y}`, q2: `${t('T2')} ${y}`, q3: `${t('T3')} ${y}`, q4: `${t('T4')} ${y}`, s1: `${t('1er semestre')} ${y}`, s2: `${t('2e semestre')} ${y}`, y: `${t('Année')} ${y}`, custom: `${dmy(f.from)} → ${dmy(f.to)}` };
  return L[f.per] || L.all;
};
const hayCache = new Map();
function hay(d) {
  const c = hayCache.get(d.id); if (c && c.u === d.u) return c.h;
  const r = get('res', d.res) || {}, s = get('syn', d.syn) || {};
  const h = norm([TYPES[d.type], t(TYPES[d.type]), TYPE_LONG[d.type], t(TYPE_LONG[d.type]), d.no, s.nom, r.nom, resAddr(r), d.objet, d.notes, d.montant != null ? String(d.montant).replace('.', ',') : '', d.montant, dmy(d.date), d.date, stLabel(d), t(stLabel(d)), fileName(d), d.txt].join(' '));
  hayCache.set(d.id, { u: d.u, h }); return h;
}
function filterDocs(f) {
  const p = period(f), q = norm(f.q).split(/\s+/).filter(Boolean);
  let out = live('doc').filter((d) => (!f.type || d.type === f.type) && (!f.syn || d.syn === f.syn) && (!f.res || d.res === f.res) && (!f.st || d.st === f.st) && (!p || (d.date >= p[0] && d.date <= p[1])) && (!q.length || q.every((w) => hay(d).includes(w))));
  const k = SORT.k, dir = SORT.d;
  const val = (d) => k === 'montant' ? (d.montant ?? -1) : k === 'no' ? norm(d.no) : k === 'res' ? norm(resName(d.res)) : k === 'type' ? d.type : (d.date || '') + (d.added || '');
  out.sort((a, b) => (val(a) > val(b) ? 1 : val(a) < val(b) ? -1 : 0) * dir);
  return out;
}
function totals(list) {
  const fac = list.filter((d) => d.type === 'fac');
  const sum = (l) => l.reduce((n, d) => n + (d.montant || 0), 0);
  return { n: list.length, fac: sum(fac), apayer: sum(fac.filter((d) => d.st === 'apayer')), payee: sum(fac.filter((d) => d.st === 'payee')), dev: sum(list.filter((d) => d.type === 'dev')), devAcc: sum(list.filter((d) => d.type === 'dev' && d.st === 'accepte')) };
}
function filterBar(f, { prefix = 'f' } = {}) {
  const syns = live('syn').sort((a, b) => a.nom.localeCompare(b.nom));
  const ress = live('res').filter((r) => !f.syn || r.syn === f.syn).sort((a, b) => a.nom.localeCompare(b.nom));
  const years = [...new Set([new Date().getFullYear(), ...live('doc').map((d) => +String(d.date).slice(0, 4)).filter(Boolean)])].sort((a, b) => b - a);
  const stOpts = f.type ? Object.entries(STATES[f.type] || {}) : [...Object.entries(STATES.fac), ...Object.entries(STATES.dev)];
  const chip = (v, l) => `<button class="chip${f.type === v ? ' on' : ''}" data-a="${prefix}type" data-v="${v}">${esc(t(l))}</button>`;
  return `<div class="chips">${chip('', 'Tous')}${chip('fac', 'Fac.')}${chip('dev', 'Dev.')}${chip('rap', 'Rap.')}
    <select class="chip sel" data-f="${prefix}" name="per">${[['all', 'Toutes les dates'], ['m0', 'Ce mois-ci'], ['m1', 'Le mois dernier'], ['q1', 'T1'], ['q2', 'T2'], ['q3', 'T3'], ['q4', 'T4'], ['s1', '1er semestre'], ['s2', '2e semestre'], ['y', 'Année'], ['custom', 'Du… au…']].map(([v, l]) => `<option value="${v}"${f.per === v ? ' selected' : ''}>📅 ${esc(t(l))}</option>`).join('')}</select>
    ${/^(q|s|y)/.test(f.per) ? `<select class="chip sel" data-f="${prefix}" name="y">${years.map((y) => `<option${+f.y === y ? ' selected' : ''}>${y}</option>`).join('')}</select>` : ''}
    ${f.per === 'custom' ? `<input class="chip sel" type="date" data-f="${prefix}" name="from" value="${esc(f.from)}"><input class="chip sel" type="date" data-f="${prefix}" name="to" value="${esc(f.to)}">` : ''}
    <select class="chip sel" data-f="${prefix}" name="syn"><option value="">🏢 ${esc(t('Tous les syndics'))}</option>${syns.map((s) => `<option value="${s.id}"${f.syn === s.id ? ' selected' : ''}>${esc(s.nom)}</option>`).join('')}</select>
    <select class="chip sel" data-f="${prefix}" name="res"><option value="">🏠 ${esc(t('Toutes les résidences'))}</option>${ress.map((r) => `<option value="${r.id}"${f.res === r.id ? ' selected' : ''}>${esc(r.nom)}</option>`).join('')}</select>
    <select class="chip sel" data-f="${prefix}" name="st"><option value="">● ${esc(t('Tous les états'))}</option>${stOpts.map(([v, l]) => `<option value="${v}"${f.st === v ? ' selected' : ''}>● ${esc(t(l))}</option>`).join('')}</select>
    ${f.type || f.per !== 'all' || f.syn || f.res || f.st ? `<button class="chip clr" data-a="${prefix}clear">✕ ${esc(t('Effacer les filtres'))}</button>` : ''}</div>`;
}
const tag = (d) => `<span class="tag t-${d.type}">${esc(t(TYPES[d.type]))}</span>`;
const stTag = (d) => stLabel(d) ? `<span class="st ${stClass(d)}">● ${esc(t(stLabel(d)))}</span>` : '<span class="st mut">—</span>';

// ── Vue : documents ──
function viewDocs(main) {
  const list = filterDocs(F), tot = totals(list);
  const th = (k, l, cls = '') => `<th class="${cls} sortable${SORT.k === k ? ' on' : ''}" data-a="sort" data-k="${k}">${esc(t(l))}${SORT.k === k ? (SORT.d > 0 ? ' ▲' : ' ▼') : ''}</th>`;
  const none = !live('doc').length;
  main.innerHTML = `<div class="mhead"><h2>${esc(t('Documents'))}</h2><span class="mut small">${esc(perLabel(F))}</span></div>
  <div class="search"><span>🔍</span><input id="q" type="search" placeholder="Rechercher : n°, résidence, syndic, mot du document…" value="${esc(F.q)}" autocomplete="off"></div>
  ${filterBar(F)}
  ${none ? emptyDocs() : list.length ? `<table class="docs"><thead><tr>${th('type', 'Type')}${th('no', 'N°')}${th('res', 'Résidence · syndic')}${th('date', 'Date')}${th('montant', 'Montant', 'r')}<th>${esc(t('État'))}</th></tr></thead><tbody>
    ${list.slice(0, LIMIT).map((d) => `<tr class="${d.id === SEL ? 'sel' : ''}" data-a="open" data-id="${d.id}"><td>${tag(d)}</td><td><b>${esc(d.no || '—')}</b>${d.dos ? ' <span class="mut" title="dossier">🔗</span>' : ''}</td><td>${esc(resName(d.res) || '—')}<div class="mut small">${esc(synName(d.syn))}${d.objet ? ' · ' + esc(d.objet) : ''}</div></td><td>${dmy(d.date)}</td><td class="r">${money(d.montant)}</td><td>${stTag(d)}</td></tr>`).join('')}
    </tbody></table>${list.length > LIMIT ? `<button class="btn g wide" data-a="more">${esc(t('Afficher plus ({0} de plus)', list.length - LIMIT))}</button>` : ''}`
    : `<div class="empty">${esc(t('Aucun document ne correspond.'))}</div>`}
  <div class="bar"><span class="small">${esc((tot.n === 1 ? t('1 document') : t('{0} documents', tot.n)))}<br>${esc(t('factures {0} · à payer {1}', money(tot.fac), money(tot.apayer)))}</span>
  <span class="row"><button class="btn g" data-a="xls">⬇️ Excel</button><button class="btn g" data-a="pdf">🖨️ PDF</button><button class="btn" data-a="add">＋ ${esc(t('Document'))}</button></span></div>`;
}
function emptyDocs() {
  const s = live('syn').length, r = live('res').length;
  return `<div class="welcome"><h3>${esc(t('Pour commencer'))}</h3><ol>
    <li class="${s ? 'done' : ''}"><button class="lnk" data-a="newsyn">🏢 ${esc(t('Ajoutez un syndic, une gérance ou une agence'))}</button></li>
    <li class="${r ? 'done' : ''}"><button class="lnk" data-a="newres">🏠 ${esc(t('Ajoutez ses résidences'))}</button></li>
    <li><button class="lnk" data-a="add">📄 ${esc(t('Ajoutez vos devis, rapports et factures'))}</button> <span class="mut small">${esc(t('(PDF, photos, Word, Excel — ou glissez-les sur la fenêtre)'))}</span></li>
    <li><button class="lnk" data-a="soc">✏️ ${esc(t('Mettez votre logo et vos coordonnées'))}</button></li></ol></div>`;
}

// ── Aperçu d'un document (panneau de droite ou plein écran sur téléphone) ──
const urls = new Map(); // id du fichier → { url, kind, pdf, pages }
async function fileView(d) {
  if (!d.file) return null;
  const c = urls.get(d.file.id); if (c) return c;
  const bytes = await C.readFile(d.file.id);
  const kind = kindOf(d.file.mime, d.file.name);
  const blob = new Blob([bytes], { type: d.file.mime || 'application/octet-stream' });
  const v = { kind, blob, raw: URL.createObjectURL(blob), pages: 1, pageUrls: {} };
  if (kind === 'pdf') { v.pdf = await openPdf(bytes); v.pages = v.pdf.numPages; }
  urls.set(d.file.id, v);
  if (urls.size > 12) { const [k, o] = urls.entries().next().value; URL.revokeObjectURL(o.raw); Object.values(o.pageUrls).forEach(URL.revokeObjectURL); o.pdf?.destroy(); urls.delete(k); }
  return v;
}
async function pageUrl(v, n) {
  if (v.kind !== 'pdf') return v.raw;
  if (!v.pageUrls[n]) v.pageUrls[n] = await pdfPageUrl(v.pdf, n, 3000);
  return v.pageUrls[n];
}
function chain(d) {
  if (!d.dos) return '';
  const order = { dev: 0, rap: 1, fac: 2 };
  const l = live('doc').filter((x) => x.dos === d.dos).sort((a, b) => order[a.type] - order[b.type] || (a.date > b.date ? 1 : -1));
  return `<div class="chain">${l.map((x, i) => `${i ? '<span class="arr">→</span>' : ''}<button class="${x.id === d.id ? 'cur' : ''}" data-a="go" data-id="${x.id}">${esc(t(TYPES[x.type]))} <b>${esc(x.no || '—')}</b></button>`).join('')}</div>`;
}
function docInfo(d) {
  const r = get('res', d.res), s = get('syn', d.syn);
  const sts = Object.entries(STATES[d.type] || {});
  return `<dl class="info"><dt>${esc(t('Syndic'))}</dt><dd>${s ? `<a href="#/docs" data-a="fsyn" data-id="${s.id}">${esc(s.nom)}</a>` : '—'}</dd>
    <dt>${esc(t('Résidence'))}</dt><dd>${r ? `<a href="#/docs" data-a="fres" data-id="${r.id}">${esc(r.nom)}</a><div class="mut small">${esc(resAddr(r))}</div>` : '—'}</dd>
    <dt>${esc(t('Date'))}</dt><dd>${dmy(d.date)}</dd>${d.type !== 'rap' || d.montant != null ? `<dt>${esc(t('Montant'))}</dt><dd><b>${money(d.montant)}</b></dd>` : ''}
    ${d.objet ? `<dt>${esc(t('Objet'))}</dt><dd>${esc(d.objet)}</dd>` : ''}${d.notes ? `<dt>${esc(t('Notes'))}</dt><dd class="pre">${esc(d.notes)}</dd>` : ''}
    ${d.type === 'fac' && d.st === 'payee' && d.payeLe ? `<dt>${esc(t('Payée le'))}</dt><dd>${dmy(d.payeLe)}</dd>` : ''}
    <dt>${esc(t('Fichier'))}</dt><dd class="small">${d.file ? esc(d.file.name) + ' · ' + Math.max(1, Math.round(d.file.size / 1024)) + ' Ko' : '—'}</dd></dl>
    ${sts.length ? `<div class="stbtns">${sts.map(([v, l]) => `<button class="chip${d.st === v ? ' on' : ''}" data-a="setst" data-id="${d.id}" data-v="${v}">${esc(t(l))}</button>`).join('')}</div>` : ''}`;
}
function docActions(d) {
  return `<div class="acts"><button class="btn g" data-a="dprint" data-id="${d.id}">🖨️ ${esc(t('Imprimer'))}</button><button class="btn g" data-a="dshare" data-id="${d.id}">📤 ${esc(t('Envoyer'))}</button><button class="btn g" data-a="ddl" data-id="${d.id}">⬇️ ${esc(t('Télécharger'))}</button>
    <button class="btn g" data-a="link" data-id="${d.id}">🔗 ${esc(t(d.dos ? 'Dossier' : 'Relier'))}</button><button class="btn g" data-a="edit" data-id="${d.id}">✏️ ${esc(t('Modifier'))}</button><button class="btn g" data-a="del" data-id="${d.id}">🗑️</button></div>
    <div class="mut small hint">📤 ${esc(t('E-mail · WhatsApp · SMS (menu Partager)'))}</div>`;
}
async function viewerInto(box, d) {
  box.innerHTML = `<div class="paper loading">⏳</div>`;
  if (!d.file) { box.innerHTML = `<div class="paper nofile">${esc(t('Pas de fichier joint'))}</div>`; return; }
  let v;
  try { v = await fileView(d); } catch (e) { box.innerHTML = `<div class="paper nofile">${esc(t(e.message === 'nofile' ? 'Fichier pas encore arrivé sur le serveur (il est sur l’autre appareil).' : 'Fichier indisponible pour l’instant (hors ligne ?).'))}</div>`; return; }
  if (v.kind === 'file') { box.innerHTML = `<div class="paper nofile"><div class="big">${/xls|sheet|csv/i.test(d.file.mime + d.file.name) ? '📊' : '📝'}</div><b>${esc(d.file.name)}</b><p class="mut">${esc(t('Pas d’aperçu pour ce type de fichier : ouvrez-le ou envoyez-le.'))}</p><button class="btn" data-a="ddl" data-id="${d.id}">⬇️ ${esc(t('Ouvrir / télécharger'))}</button></div>`; return; }
  let n = 1;
  const draw = async () => {
    const u = await pageUrl(v, n);
    box.innerHTML = `<div class="paper img"><img alt="" src="${u}"></div>${v.pages > 1 ? `<div class="pgnav"><button data-pg="-1">‹</button> ${n} / ${v.pages} <button data-pg="1">›</button></div>` : ''}<div class="mut small hint">🔍 ${esc(t('Survol = loupe · double-clic = 3000 × 3000 px'))}</div>`;
    const img = $('img', box);
    img.onerror = () => { box.innerHTML = `<div class="paper nofile">${esc(t('Ce navigateur ne sait pas afficher ce format (HEIC : utilisez Safari).'))}<br><br><button class="btn" data-a="ddl" data-id="${d.id}">⬇️ ${esc(t('Télécharger'))}</button></div>`; };
    attachLens(img);
    img.ondblclick = () => zoomView(u, { title: docTitle(d), pages: v.pages, page: n, onPage: (p) => pageUrl(v, p) });
    let tap = 0; img.addEventListener('touchend', () => { const now = Date.now(); if (now - tap < 350) img.ondblclick(); tap = now; });
  };
  box.onclick = (e) => { const b = e.target.closest('[data-pg]'); if (b) { n = Math.min(v.pages, Math.max(1, n + +b.dataset.pg)); draw(); } };
  await draw();
}
function preview(el, id) {
  const d = get('doc', id); if (!d) { el.innerHTML = ''; return; }
  el.innerHTML = `<div class="phead"><b class="ptitle">${esc(docTitle(d))}</b>${stTag(d)}</div><div class="pview"></div>${chain(d)}${docActions(d)}${docInfo(d)}`;
  translate(el);
  viewerInto($('.pview', el), d);
}
function viewDoc(main, id) {
  const d = get('doc', id);
  if (!d) { main.innerHTML = `<div class="empty">${esc(t('Document introuvable (peut-être dans la corbeille).'))}</div>`; return; }
  main.innerHTML = `<div class="mhead"><button class="btn g" data-a="back">‹ ${esc(t('Retour'))}</button><h2>${esc(docTitle(d))}</h2>${stTag(d)}</div>
    <div class="docpage"><div class="pview"></div><div>${chain(d)}${docActions(d)}${docInfo(d)}</div></div>`;
  translate(main);
  viewerInto($('.pview', main), d);
}

// ── Ajouter des documents ──
function guess(text, name, d) {
  const T = (text || '') + '\n' + (name || '');
  const g = {};
  if (/devis|offre de prix|quotation|angebot|kostenvoranschlag|preventivo/i.test(T)) g.type = 'dev';
  if (/rapport|report|bericht|expertise|constat|gutachten|relazione/i.test(T)) g.type = g.type || 'rap';
  if (/facture|invoice|rechnung|fattura|note d.honoraires/i.test(T)) g.type = 'fac';
  const nm = T.match(/(?:facture|devis|rapport|invoice|rechnung|offre|n[°ºo]\.?|nr\.?|num[ée]ro)\s*[:#n°º.]*\s*([A-Z]{0,4}[-/ ]?\d[\w\-/.]{1,18})/i) || String(name).match(/([A-Z]{1,4}[-_]?\d{2,4}[-_]\d{1,6})/i);
  if (nm) g.no = nm[1].replace(/[._]+$/, '').trim();
  const dm = T.match(/\b(\d{1,2})[./-](\d{1,2})[./-](20\d{2})\b/);
  if (dm) { const iso = `${dm[3]}-${dm[2].padStart(2, '0')}-${dm[1].padStart(2, '0')}`; if (!isNaN(Date.parse(iso))) g.date = iso; }
  const am = [...T.matchAll(/(?:total|montant|à payer|net à payer|solde|betrag|summe|totale|amount due)[^\d\n]{0,40}?(\d{1,3}(?:[ .’'  ]?\d{3})*,\d{2}|\d+\.\d{2})/gi)];
  if (am.length) g.montant = parseAmount(am[am.length - 1][1]);
  const nt = norm(T);
  const r = live('res').find((x) => x.nom && nt.includes(norm(x.nom))); if (r) { g.res = r.id; g.syn = r.syn; }
  if (!g.syn) { const s = live('syn').find((x) => x.nom && nt.includes(norm(x.nom))); if (s) g.syn = s.id; }
  return g;
}
const ACCEPT = '.pdf,.jpg,.jpeg,.png,.heic,.heif,.webp,.doc,.docx,.xls,.xlsx,.csv,.odt,.ods,application/pdf,image/*';
function addDocs(files) {
  if (!files || !files.length) {
    const s = sheet(`<h3>＋ ${esc(t('Ajouter des documents'))}</h3><label class="drop"><input type="file" multiple accept="${ACCEPT}" hidden><div class="big">📥</div><b>${esc(t('Choisir des fichiers'))}</b><div class="mut small">${esc(t('PDF, JPG, PNG, HEIC, Word, Excel · plusieurs à la fois'))}</div><div class="mut small">${esc(t('Sur iMac : glissez-les ici depuis Mail ou le Finder'))}</div></label>
      <p class="mut small">📱 ${esc(t('Sur iPhone / iPad : dans Mail, touchez la pièce jointe → « Enregistrer dans Fichiers », puis choisissez-la ici.'))}</p><div class="row end"><button class="btn g" data-a="x">${esc(t('Annuler'))}</button></div>`);
    $('input', s).onchange = (e) => { const fl = [...e.target.files]; closeSheet(); addDocs(fl); };
    const lab = $('.drop', s);
    lab.ondragover = (e) => { e.preventDefault(); lab.classList.add('over'); }; lab.ondragleave = () => lab.classList.remove('over');
    lab.ondrop = (e) => { e.preventDefault(); const fl = [...e.dataTransfer.files]; closeSheet(); addDocs(fl); };
    s.onclick = (e) => { if (e.target.closest('[data-a=x]')) closeSheet(); };
    return;
  }
  const queue = [...files]; let i = 0, saved = 0;
  const next = async () => {
    if (i >= queue.length) { if (saved) toast(t('{0} document(s) enregistré(s)', saved)); render(); return; }
    const f = queue[i++];
    if (f.size > 30 * 1024 * 1024) { toast(t('« {0} » est trop gros (30 Mo max.)', f.name)); return next(); }
    const bytes = new Uint8Array(await f.arrayBuffer());
    const kind = kindOf(f.type, f.name);
    const txt = kind === 'pdf' ? await pdfText(bytes) : { text: '', pages: 0 };
    const g = guess(txt.text, f.name);
    const d = { type: g.type || 'fac', no: g.no || '', date: g.date || today(), syn: g.syn || F.syn || '', res: g.res || F.res || '', montant: g.montant ?? null, objet: '', notes: '', txt: txt.text };
    d.st = DEF_ST[d.type];
    let thumb = '';
    try { if (kind === 'img') thumb = URL.createObjectURL(f); else if (kind === 'pdf') { const p = await openPdf(bytes); thumb = await pdfPageUrl(p, 1, 900); p.destroy(); } } catch { thumb = ''; }
    docForm(d, { file: f, bytes, thumb, step: `${i} / ${queue.length}`, guessed: g, onSave: () => { saved++; next(); }, onSkip: next });
  };
  next();
}
function synOptions(sel) { return `<option value="">—</option>${live('syn').sort((a, b) => a.nom.localeCompare(b.nom)).map((s) => `<option value="${s.id}"${s.id === sel ? ' selected' : ''}>${esc(s.nom)}</option>`).join('')}`; }
function resOptions(syn, sel) { return `<option value="">—</option>${live('res').filter((r) => !syn || r.syn === syn).sort((a, b) => a.nom.localeCompare(b.nom)).map((r) => `<option value="${r.id}"${r.id === sel ? ' selected' : ''}>${esc(r.nom)}</option>`).join('')}`; }
function docForm(d, { file, bytes, thumb, step, guessed = {}, onSave, onSkip } = {}) {
  const isNew = !d.id;
  const sg = (k) => guessed[k] != null && guessed[k] !== '' ? ` <span class="sugg" data-tt="Proposé d’après le document : vérifiez">✨</span>` : '';
  const s = sheet(`<h3>${esc(t(isNew ? 'Nouveau document' : 'Modifier le document'))}${step ? ` <span class="mut small">· ${esc(t('fichier {0}', step))}</span>` : ''}</h3>
    <div class="dform">${thumb ? `<div class="thumb"><img src="${thumb}" alt=""></div>` : file ? `<div class="thumb file">📄<br><small>${esc(file.name)}</small></div>` : ''}
    <form data-f="doc"><div class="typepick">${Object.entries(TYPES).map(([k, l]) => `<label class="chip${d.type === k ? ' on' : ''}"><input type="radio" name="type" value="${k}"${d.type === k ? ' checked' : ''} hidden>${esc(t(l))} <small>${esc(t(TYPE_LONG[k]))}</small></label>`).join('')}${sg('type')}</div>
    <div class="grid2"><label>${esc(t('N°'))}${sg('no')}<input name="no" value="${esc(d.no)}" placeholder="F-2026-118" required></label><label>${esc(t('Date'))}${sg('date')}<input name="date" type="date" value="${esc(d.date)}" required></label></div>
    <div class="grid2"><label>${esc(t('Syndic · gérance · agence'))}${sg('syn')}<span class="row"><select name="syn">${synOptions(d.syn)}</select><button type="button" class="btn g sq" data-a="qsyn" data-tt="Nouveau syndic">＋</button></span></label>
    <label>${esc(t('Résidence'))}${sg('res')}<span class="row"><select name="res">${resOptions(d.syn, d.res)}</select><button type="button" class="btn g sq" data-a="qres" data-tt="Nouvelle résidence">＋</button></span></label></div>
    <label>${esc(t('Objet / désignation'))}<input name="objet" value="${esc(d.objet)}" placeholder="Remplacement du cylindre, fuite toiture…"></label>
    <div class="grid2"><label>${esc(t('Montant (€)'))}${sg('montant')}<input name="montant" inputmode="decimal" value="${d.montant != null ? esc(String(d.montant).replace('.', ',')) : ''}" placeholder="1 240,00"></label>
    <label class="stsel">${esc(t('État'))}<select name="st"></select></label></div>
    <label>${esc(t('Notes'))}<textarea name="notes" rows="2">${esc(d.notes)}</textarea></label>
    ${!file && isNew ? '' : !isNew ? `<label class="small">${esc(t('Remplacer le fichier'))}<input type="file" name="file" accept="${ACCEPT}"></label>` : ''}
    <div class="err"></div>
    <div class="row end">${onSkip ? `<button type="button" class="btn g" data-a="skip">${esc(t('Ignorer ce fichier'))}</button>` : `<button type="button" class="btn g" data-a="x">${esc(t('Annuler'))}</button>`}<button class="btn">${esc(t('Enregistrer'))}</button></div></form></div>`, { wide: true, onClose: () => { if (thumb) URL.revokeObjectURL(thumb); } });
  const f = $('form', s);
  const fillSt = () => { const ty = f.type.value, cur = d.type === ty ? d.st : DEF_ST[ty]; f.st.innerHTML = Object.entries(STATES[ty]).map(([v, l]) => `<option value="${v}"${v === cur ? ' selected' : ''}>${esc(t(l))}</option>`).join('') || '<option value="">—</option>'; $('.stsel', s).style.visibility = ty === 'rap' ? 'hidden' : ''; };
  fillSt();
  s.addEventListener('change', (e) => {
    if (e.target.name === 'type') { $$('.typepick .chip', s).forEach((c) => c.classList.toggle('on', c.querySelector('input').checked)); fillSt(); }
    if (e.target.name === 'syn') f.res.innerHTML = resOptions(f.syn.value, f.res.value && (get('res', f.res.value) || {}).syn === f.syn.value ? f.res.value : '');
    if (e.target.name === 'res' && f.res.value && !f.syn.value) { const r = get('res', f.res.value); if (r) { f.syn.innerHTML = synOptions(r.syn); f.res.innerHTML = resOptions(r.syn, r.id); } }
  });
  s.addEventListener('click', (e) => {
    const a = e.target.closest('[data-a]'); if (!a) return;
    if (a.dataset.a === 'x') closeSheet();
    if (a.dataset.a === 'skip') { closeSheet(); onSkip(); }
    if (a.dataset.a === 'qsyn') synForm({}, (x) => { f.syn.innerHTML = synOptions(x.id); f.res.innerHTML = resOptions(x.id, ''); });
    if (a.dataset.a === 'qres') resForm({ syn: f.syn.value }, (x) => { f.syn.innerHTML = synOptions(x.syn); f.res.innerHTML = resOptions(x.syn, x.id); });
  });
  f.onsubmit = async (e) => {
    e.preventDefault();
    const btn = f.querySelector('button:not([type=button])'); btn.disabled = true;
    try {
      const rec = isNew ? { ...d } : get('doc', d.id);
      Object.assign(rec, { type: f.type.value, no: f.no.value.trim(), date: f.date.value, syn: f.syn.value, res: f.res.value, objet: f.objet.value.trim(), notes: f.notes.value.trim(), montant: parseAmount(f.montant.value), st: f.st.value || '' });
      if (rec.type === 'fac' && rec.st === 'payee' && !rec.payeLe) rec.payeLe = today();
      const nf = f.file && f.file.files[0];
      const src = file || nf;
      if (src) {
        const b = bytes || new Uint8Array(await src.arrayBuffer());
        if (b.length > 30 * 1024 * 1024) throw new Error(t('Fichier trop gros (30 Mo max.)'));
        const old = rec.file;
        rec.file = { id: await C.addFile(b), name: src.name, mime: src.type || '', size: b.length };
        if (old) rec.oldFiles = [...(rec.oldFiles || []), old]; // l'ancien fichier reste (rien ne se perd)
        if (nf && kindOf(src.type, src.name) === 'pdf') rec.txt = (await pdfText(b)).text;
      }
      if (isNew) rec.added = new Date().toISOString();
      put('doc', rec);
      sheets.at(-1).onClose = null; closeSheet();
      if (onSave) onSave(rec); else toast(t('Enregistré'));
      if (thumb) URL.revokeObjectURL(thumb);
    } catch (x) { $('.err', s).textContent = x.message; btn.disabled = false; }
  };
}
function dragDrop() {
  let n = 0; const dz = { classList: { add: (c) => $('#drop')?.classList.add(c), remove: (c) => $('#drop')?.classList.remove(c) } };
  const has = (e) => [...(e.dataTransfer?.types || [])].includes('Files');
  addEventListener('dragenter', (e) => { if (!has(e) || document.querySelector('.sheetbg')) return; n++; dz.classList.add('on'); });
  addEventListener('dragleave', () => { if (--n <= 0) { n = 0; dz.classList.remove('on'); } });
  addEventListener('dragover', (e) => { if (has(e)) e.preventDefault(); });
  addEventListener('drop', (e) => { if (!has(e)) return; e.preventDefault(); n = 0; dz.classList.remove('on'); if (!document.querySelector('.sheetbg')) addDocs([...e.dataTransfer.files]); });
}

// ── Syndics, gérances, agences ──
function synForm(x, done) {
  const isNew = !x.id;
  const s = sheet(`<h3>${esc(t(isNew ? 'Nouveau syndic / gérance / agence' : 'Modifier'))}</h3><form data-f="syn">
    <div class="typepick">${Object.entries(SYN_TYPES).map(([k, l]) => `<label class="chip${(x.type || 'syndic') === k ? ' on' : ''}"><input type="radio" name="type" value="${k}"${(x.type || 'syndic') === k ? ' checked' : ''} hidden>${esc(t(l))}</label>`).join('')}</div>
    <label>${esc(t('Nom'))}<input name="nom" value="${esc(x.nom)}" required placeholder="Syndic Horizon"></label>
    <label>${esc(t('Personne de contact'))}<input name="contact" value="${esc(x.contact)}"></label>
    <div class="grid2"><label>${esc(t('E-mail'))}<input name="email" type="email" value="${esc(x.email)}"></label><label>${esc(t('Téléphone'))}<input name="tel" type="tel" value="${esc(x.tel)}"></label></div>
    <label>${esc(t('Adresse'))}<input name="adresse" value="${esc(x.adresse)}"></label><label>${esc(t('Notes'))}<textarea name="notes" rows="2">${esc(x.notes)}</textarea></label>
    <div class="row end"><button type="button" class="btn g" data-a="x">${esc(t('Annuler'))}</button><button class="btn">${esc(t('Enregistrer'))}</button></div></form>`);
  s.addEventListener('change', (e) => { if (e.target.name === 'type') $$('.typepick .chip', s).forEach((c) => c.classList.toggle('on', c.querySelector('input').checked)); });
  s.onclick = (e) => { if (e.target.closest('[data-a=x]')) closeSheet(); };
  $('form', s).onsubmit = (e) => {
    e.preventDefault(); const f = e.target;
    const rec = isNew ? {} : get('syn', x.id);
    Object.assign(rec, { type: f.type.value, nom: f.nom.value.trim(), contact: f.contact.value.trim(), email: f.email.value.trim(), tel: f.tel.value.trim(), adresse: f.adresse.value.trim(), notes: f.notes.value.trim() });
    put('syn', rec); closeSheet(); if (done) done(rec); else render();
  };
}
function resForm(x, done) {
  const isNew = !x.id;
  const s = sheet(`<h3>${esc(t(isNew ? 'Nouvelle résidence' : 'Modifier la résidence'))}</h3><form data-f="res">
    <label>${esc(t('Nom de la résidence'))}<input name="nom" value="${esc(x.nom)}" required placeholder="Résidence Les Tilleuls"></label>
    <label>${esc(t('Syndic · gérance · agence'))}<span class="row"><select name="syn" required>${synOptions(x.syn)}</select><button type="button" class="btn g sq" data-a="qsyn">＋</button></span></label>
    <div class="grid3"><label class="span2">${esc(t('Rue'))}<input name="rue" value="${esc(x.rue)}"></label><label>${esc(t('Numéro'))}<input name="num" value="${esc(x.num)}"></label></div>
    <div class="grid3"><label>${esc(t('Code postal'))}<input name="cp" value="${esc(x.cp)}" placeholder="L-1234"></label><label>${esc(t('Ville'))}<input name="ville" value="${esc(x.ville)}"></label><label>${esc(t('Pays'))}<input name="pays" value="${esc(x.pays || 'Luxembourg')}"></label></div>
    <label>${esc(t('Notes (accès, code, concierge…)'))}<textarea name="notes" rows="2">${esc(x.notes)}</textarea></label>
    <div class="row end"><button type="button" class="btn g" data-a="x">${esc(t('Annuler'))}</button><button class="btn">${esc(t('Enregistrer'))}</button></div></form>`);
  s.onclick = (e) => { const a = e.target.closest('[data-a]'); if (!a) return; if (a.dataset.a === 'x') closeSheet(); if (a.dataset.a === 'qsyn') synForm({}, (y) => { $('select[name=syn]', s).innerHTML = synOptions(y.id); }); };
  $('form', s).onsubmit = (e) => {
    e.preventDefault(); const f = e.target;
    const rec = isNew ? {} : get('res', x.id);
    Object.assign(rec, { nom: f.nom.value.trim(), syn: f.syn.value, rue: f.rue.value.trim(), num: f.num.value.trim(), cp: f.cp.value.trim(), ville: f.ville.value.trim(), pays: f.pays.value.trim() || 'Luxembourg', notes: f.notes.value.trim() });
    put('res', rec); closeSheet(); if (done) done(rec); else render();
  };
}
function viewSyndics(main) {
  const docs = live('doc');
  const list = live('syn').sort((a, b) => a.nom.localeCompare(b.nom));
  main.innerHTML = `<div class="mhead"><h2>${esc(t('Syndics & gérances'))}</h2><button class="btn" data-a="newsyn">＋ ${esc(t('Ajouter'))}</button></div>
  ${list.length ? `<div class="cards">${list.map((s) => {
    const ds = docs.filter((d) => d.syn === s.id), tot = totals(ds), rs = live('res').filter((r) => r.syn === s.id);
    return `<div class="card"><div class="row between"><div><span class="tag">${esc(t(SYN_TYPES[s.type] || 'Syndic'))}</span> <b class="cname">${esc(s.nom)}</b></div><button class="btn g sm" data-a="editsyn" data-id="${s.id}">✏️</button></div>
      <div class="mut small">${esc([s.contact, s.email, s.tel].filter(Boolean).join(' · '))}</div>
      <div class="kpis"><span><b>${rs.length}</b> ${esc(t('résidences'))}</span><span><b>${ds.length}</b> ${esc(t('documents'))}</span><span class="warn"><b>${money(tot.apayer)}</b> ${esc(t('à payer'))}</span></div>
      <div class="row wrap">${rs.map((r) => `<button class="chip" data-a="fres" data-id="${r.id}">🏠 ${esc(r.nom)}</button>`).join('')}<button class="chip" data-a="newres" data-syn="${s.id}">＋ ${esc(t('Résidence'))}</button></div>
      <div class="row"><button class="btn g sm" data-a="fsyn" data-id="${s.id}">🗂️ ${esc(t('Documents'))}</button><button class="btn g sm" data-a="recsyn" data-id="${s.id}">📊 ${esc(t('Récapitulatif'))}</button>${s.email ? `<a class="btn g sm" href="mailto:${esc(s.email)}">✉️</a>` : ''}${s.tel ? `<a class="btn g sm" href="tel:${esc(s.tel)}">📞</a>` : ''}</div></div>`;
  }).join('')}</div>` : `<div class="empty">${esc(t('Aucun syndic pour l’instant.'))}<br><br><button class="btn" data-a="newsyn">＋ ${esc(t('Ajouter un syndic, une gérance ou une agence'))}</button></div>`}`;
}
function viewResidences(main) {
  const docs = live('doc');
  const syns = live('syn').sort((a, b) => a.nom.localeCompare(b.nom));
  const res = live('res');
  const q = norm(F.rq || '');
  const groups = [...syns, { id: '', nom: t('Sans syndic') }].map((s) => ({ s, rs: res.filter((r) => (r.syn || '') === s.id && (!q || norm(r.nom + ' ' + resAddr(r)).includes(q))).sort((a, b) => a.nom.localeCompare(b.nom)) })).filter((g) => g.rs.length);
  main.innerHTML = `<div class="mhead"><h2>${esc(t('Résidences'))}</h2><button class="btn" data-a="newres">＋ ${esc(t('Ajouter'))}</button></div>
  <div class="search"><span>🔍</span><input id="rq" type="search" placeholder="Nom, rue, ville…" value="${esc(F.rq || '')}"></div>
  ${groups.length ? groups.map((g) => `<h4 class="grp">🏢 ${esc(g.s.nom)}</h4><div class="cards">${g.rs.map((r) => {
    const ds = docs.filter((d) => d.res === r.id);
    return `<div class="card"><div class="row between"><b class="cname">🏠 ${esc(r.nom)}</b><button class="btn g sm" data-a="editres" data-id="${r.id}">✏️</button></div><div class="mut small">${esc(resAddr(r))}</div>
      <div class="kpis"><span><b>${ds.filter((d) => d.type === 'dev').length}</b> ${esc(t('Dev.'))}</span><span><b>${ds.filter((d) => d.type === 'rap').length}</b> ${esc(t('Rap.'))}</span><span><b>${ds.filter((d) => d.type === 'fac').length}</b> ${esc(t('Fac.'))}</span></div>
      <div class="row"><button class="btn g sm" data-a="fres" data-id="${r.id}">🗂️ ${esc(t('Documents'))}</button><button class="btn g sm" data-a="adddoc" data-res="${r.id}">＋ ${esc(t('Document'))}</button></div></div>`;
  }).join('')}</div>`).join('') : `<div class="empty">${esc(t('Aucune résidence pour l’instant.'))}</div>`}`;
}
function viewDossiers(main) {
  const docs = live('doc').filter((d) => d.dos);
  const by = {}; docs.forEach((d) => { (by[d.dos] = by[d.dos] || []).push(d); });
  const list = Object.values(by).map((l) => l.sort((a, b) => ({ dev: 0, rap: 1, fac: 2 })[a.type] - ({ dev: 0, rap: 1, fac: 2 })[b.type])).sort((a, b) => (b.at(-1).date > a.at(-1).date ? 1 : -1));
  main.innerHTML = `<div class="mhead"><h2>${esc(t('Dossiers d’intervention'))}</h2></div><p class="mut">${esc(t('Un dossier relie le devis, le rapport et la facture d’une même intervention. Ouvrez un document et touchez « 🔗 Relier ».'))}</p>
  ${list.length ? `<div class="cards">${list.map((l) => { const d = l[0]; const f = l.find((x) => x.type === 'fac'); return `<div class="card"><b class="cname">🏠 ${esc(resName(d.res) || '—')}</b><div class="mut small">${esc(synName(d.syn))}${d.objet ? ' · ' + esc(d.objet) : ''}</div>${chain(d)}${f ? `<div class="small">${esc(t('Facture'))} : <b>${money(f.montant)}</b> ${stTag(f)}</div>` : `<div class="small mut">${esc(t('Pas encore de facture'))}</div>`}</div>`; }).join('')}</div>` : `<div class="empty">${esc(t('Aucun dossier pour l’instant.'))}</div>`}`;
}
function linkForm(d) {
  const cands = live('doc').filter((x) => x.id !== d.id && (!d.res || x.res === d.res || !x.res)).sort((a, b) => (b.date > a.date ? 1 : -1)).slice(0, 80);
  const s = sheet(`<h3>🔗 ${esc(t('Dossier d’intervention'))}</h3><p class="mut small">${esc(t('Reliez ce document au devis, au rapport ou à la facture de la même intervention.'))}</p>
    ${d.dos ? chain(d) + `<button class="btn g" data-a="unlink">✂️ ${esc(t('Retirer ce document du dossier'))}</button>` : ''}
    <div class="search"><span>🔍</span><input id="lq" placeholder="N°, objet…"></div><div class="picklist">${cands.map((x) => `<button class="pick" data-a="pick" data-id="${x.id}" data-h="${esc(hay(x).slice(0, 300))}">${tag(x)} <b>${esc(x.no || '—')}</b> <span class="mut small">${dmy(x.date)} · ${esc(resName(x.res))} ${x.objet ? '· ' + esc(x.objet) : ''}</span>${x.dos ? ' 🔗' : ''}</button>`).join('') || `<div class="mut">${esc(t('Aucun autre document pour cette résidence.'))}</div>`}</div>
    <div class="row end"><button class="btn g" data-a="x">${esc(t('Fermer'))}</button></div>`, { wide: true });
  $('#lq', s).oninput = (e) => { const q = norm(e.target.value); $$('.pick', s).forEach((b) => { b.style.display = !q || b.dataset.h.includes(q) ? '' : 'none'; }); };
  s.onclick = (e) => {
    const a = e.target.closest('[data-a]'); if (!a) return;
    if (a.dataset.a === 'x') closeSheet();
    if (a.dataset.a === 'unlink') { const r = get('doc', d.id); delete r.dos; put('doc', r); closeSheet(); render(); }
    if (a.dataset.a === 'pick') {
      const o = get('doc', a.dataset.id), me = get('doc', d.id);
      const dos = me.dos || o.dos || C.uid();
      if (o.dos && me.dos && o.dos !== me.dos) live('doc').filter((x) => x.dos === o.dos).forEach((x) => { x.dos = dos; put('doc', x); });
      me.dos = dos; o.dos = dos; if (!me.res && o.res) { me.res = o.res; me.syn = o.syn; }
      put('doc', me); put('doc', o); closeSheet(); toast(t('Relié')); render();
    }
  };
}

// ── Récapitulatifs ──
let R = ls.get('lgrRecap', null) || { type: 'fac', per: 'q' + (Math.floor(new Date().getMonth() / 3) + 1), y: new Date().getFullYear(), syn: '', res: '', st: '', from: '', to: '' };
function viewRecap(main) {
  const list = filterDocs({ ...R, q: '' }), tot = totals(list);
  main.innerHTML = `<div class="mhead"><h2>${esc(t('Récapitulatifs'))}</h2></div><p class="mut">${esc(t('Pour les secrétaires des syndics : choisissez le syndic et la période, puis envoyez le récapitulatif en Excel ou en PDF.'))}</p>
  ${filterBar(R, { prefix: 'r' })}
  <div class="recapbox"><div class="rhead">${recapHeadHtml(R)}</div>
  ${list.length ? `<table class="docs rec"><thead><tr><th>${esc(t('Type'))}</th><th>${esc(t('N°'))}</th><th>${esc(t('Date'))}</th><th>${esc(t('Résidence'))}</th><th>${esc(t('Objet'))}</th><th class="r">${esc(t('Montant'))}</th><th>${esc(t('État'))}</th></tr></thead><tbody>
  ${list.map((d) => `<tr data-a="go" data-id="${d.id}"><td>${tag(d)}</td><td><b>${esc(d.no)}</b></td><td>${dmy(d.date)}</td><td>${esc(resName(d.res))}</td><td class="small">${esc(d.objet)}</td><td class="r">${money(d.montant)}</td><td>${stTag(d)}</td></tr>`).join('')}</tbody>
  <tfoot>${recapTotals(R, tot).map(([l, v]) => `<tr><td colspan="5"><b>${esc(l)}</b></td><td class="r"><b>${money(v)}</b></td><td></td></tr>`).join('')}</tfoot></table>` : `<div class="empty">${esc(t('Aucun document pour ce choix.'))}</div>`}</div>
  <div class="bar"><span class="small">${esc((tot.n === 1 ? t('1 document') : t('{0} documents', tot.n)))}</span><span class="row wrap"><button class="btn g" data-a="rxls">⬇️ Excel</button><button class="btn g" data-a="rpdf">⬇️ PDF</button><button class="btn g" data-a="rprint">🖨️ ${esc(t('Imprimer'))}</button><button class="btn" data-a="rshare">📤 ${esc(t('Envoyer'))}</button></span></div>
  <div class="mut small hint">📤 ${esc(t('E-mail · WhatsApp · SMS (menu Partager) : le PDF et le fichier Excel sont joints.'))}</div>`;
}
function recapTitle(f) {
  const parts = [f.type ? t({ fac: 'Factures', dev: 'Devis', rap: 'Rapports' }[f.type]) : t('Documents')];
  if (f.syn) parts.push(synName(f.syn)); if (f.res) parts.push(resName(f.res));
  parts.push(perLabel(f)); if (f.st) parts.push(t((STATES.fac[f.st] || STATES.dev[f.st] || '')));
  return parts.join(' · ');
}
function recapHeadHtml(f) {
  const s = S.db.soc || {};
  return `<div class="rsoc">${s.logo ? `<img src="${esc(s.logo)}" alt="">` : ''}<div><b>${esc(s.nom || '')}</b><div class="small">${esc([s.adresse, s.email, s.tel].filter(Boolean).join(' · '))}</div>${s.tva ? `<div class="small">${esc(s.tva)}</div>` : ''}</div></div><div class="rtitle"><div class="small mut">${esc(t('Récapitulatif'))} · ${dmy(today())}</div><b>${esc(recapTitle(f))}</b></div>`;
}
function recapTotals(f, tot) {
  const out = [];
  if (!f.type || f.type === 'fac') { out.push([t('Total des factures'), tot.fac]); if (!f.st) { out.push([t('dont payées'), tot.payee]); out.push([t('dont à payer'), tot.apayer]); } }
  if (!f.type || f.type === 'dev') { out.push([t('Total des devis'), tot.dev]); if (!f.st) out.push([t('dont acceptés'), tot.devAcc]); }
  return out;
}
const fname = (f, ext) => ('LGR-' + recapTitle(f)).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.-]+/g, '_').replace(/_+/g, '_').slice(0, 90) + '.' + ext;
function recapXlsx(f) {
  const list = filterDocs({ ...f, q: '' });
  const head = [t('Type'), t('N°'), t('Date'), t('Syndic'), t('Résidence'), t('Adresse'), t('Objet'), t('Montant (€)'), t('État'), t('Payée le'), t('Dossier'), t('Fichier')];
  const order = { dev: 0, rap: 1, fac: 2 };
  const rows = list.map((d) => [t(TYPE_LONG[d.type]), d.no, dmy(d.date), synName(d.syn), resName(d.res), resAddr(get('res', d.res)), d.objet || '', d.montant ?? '', t(stLabel(d)), d.payeLe ? dmy(d.payeLe) : '', d.dos ? live('doc').filter((x) => x.dos === d.dos).sort((a, b) => order[a.type] - order[b.type]).map((x) => TYPES[x.type] + ' ' + x.no).join(' → ') : '', fileName(d)]);
  rows.push([]); recapTotals(f, totals(list)).forEach(([l, v]) => rows.push(['', '', '', '', '', '', l, v]));
  return xlsxBlob(head, rows, t('Récapitulatif'));
}
async function logoJpeg() {
  const s = S.db.soc || {}; if (!s.logo) return null;
  const img = new Image(); img.src = s.logo; await img.decode().catch(() => {});
  if (!img.naturalWidth) return null;
  const k = Math.min(1, 400 / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
  const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
  const b = await new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.9));
  return { bytes: new Uint8Array(await b.arrayBuffer()), w: c.width, h: c.height };
}
const clean = (s) => String(s ?? '').replace(/[\u{1F000}-\u{1FFFF}☀-➿️]/gu, '').trim();
async function recapPdf(f) {
  const list = filterDocs({ ...f, q: '' }), tot = totals(list), s = S.db.soc || {};
  const P = makePdf(), M = 40, W = P.W, logo = await logoJpeg();
  const ink = [0.106, 0.18, 0.294];
  const cols = [[M, t('Type'), 50], [M + 50, t('N°'), 80], [M + 130, t('Date'), 58], [M + 188, t('Résidence'), 110], [M + 298, t('Objet'), 92], [W - M - 62, t('Montant'), 0, 'right'], [W - M - 58, t('État'), 58]];
  const fit = (str, w, size = 8.5) => { let x = clean(str); while (x && textWidth(x, size) > w - 4) x = x.slice(0, -1); return x.length < clean(str).length ? x.slice(0, -1) + '…' : x; };
  let y;
  const header = (first) => {
    y = M;
    if (first) {
      let x0 = M;
      if (logo) { const h = 46, w = Math.min(120, logo.w * h / logo.h); P.image(M, y, w, h, logo.bytes, logo.w, logo.h); x0 = M + w + 12; }
      P.text(x0, y + 12, clean(s.nom || ''), { size: 12, bold: true, color: ink });
      P.text(x0, y + 26, clean([s.adresse].filter(Boolean).join('')), { size: 8.5 });
      P.text(x0, y + 37, clean([s.email, s.tel, s.tva].filter(Boolean).join(' · ')), { size: 8.5 });
      P.text(W - M, y + 12, clean(t('Récapitulatif')), { size: 9, align: 'right', color: [0.4, 0.4, 0.4] });
      P.text(W - M, y + 26, dmy(today()), { size: 9, align: 'right', color: [0.4, 0.4, 0.4] });
      y += 62; P.line(M, y, W - M, y, { w: 1.4, color: ink }); y += 20;
      P.wrap(M, y, clean(recapTitle(f)), W - 2 * M, { size: 13, bold: true, color: ink }); y += 26;
    }
    P.rect(M, y - 11, W - 2 * M, 16, { fill: [0.95, 0.94, 0.92] });
    cols.forEach(([x, l, , al]) => P.text(al === 'right' ? W - M - 66 : x + 2, y, clean(l), { size: 8, bold: true, align: al === 'right' ? 'right' : 'left' }));
    y += 16;
  };
  header(true);
  for (const d of list) {
    if (y > P.H - 70) { P.page(); header(false); }
    const v = [t(TYPES[d.type]), d.no, dmy(d.date), resName(d.res), d.objet, money(d.montant), t(stLabel(d))];
    cols.forEach(([x, , w, al], i) => { if (al === 'right') P.text(W - M - 66, y, clean(v[i]).replace(/[  ]/g, ' '), { size: 8.5, align: 'right' }); else P.text(x + 2, y, fit(v[i], w), { size: 8.5, bold: i === 1 }); });
    y += 5; P.line(M, y, W - M, y, { w: 0.3 }); y += 11;
  }
  y += 6;
  for (const [l, v] of recapTotals(f, tot)) { if (y > P.H - 50) { P.page(); y = M; } P.text(W - M - 160, y, clean(l), { size: 9, bold: true, align: 'right' }); P.text(W - M - 66, y, money(v).replace(/[  ]/g, ' '), { size: 9, bold: true, align: 'right' }); y += 14; }
  const n = P.count();
  for (let i = 0; i < n; i++) { P.onPage(i); P.text(M, P.H - 24, clean(`LGR · ${s.nom || 'Lux Gestion Résidences'}`), { size: 7.5, color: [0.5, 0.5, 0.5] }); P.text(W - M, P.H - 24, `${t('Page')} ${i + 1} / ${n}`, { size: 7.5, align: 'right', color: [0.5, 0.5, 0.5] }); }
  return new Blob([P.bytes()], { type: 'application/pdf' });
}
function recapPrintHtml(f) {
  const list = filterDocs({ ...f, q: '' }), tot = totals(list);
  return `<div class="rhead">${recapHeadHtml(f)}</div><table class="docs"><thead><tr><th>${esc(t('Type'))}</th><th>${esc(t('N°'))}</th><th>${esc(t('Date'))}</th><th>${esc(t('Résidence'))}</th><th>${esc(t('Objet'))}</th><th class="r">${esc(t('Montant'))}</th><th>${esc(t('État'))}</th></tr></thead><tbody>
  ${list.map((d) => `<tr><td>${esc(t(TYPES[d.type]))}</td><td><b>${esc(d.no)}</b></td><td>${dmy(d.date)}</td><td>${esc(resName(d.res))}</td><td>${esc(d.objet)}</td><td class="r">${money(d.montant)}</td><td>${esc(t(stLabel(d)))}</td></tr>`).join('')}</tbody>
  <tfoot>${recapTotals(f, tot).map(([l, v]) => `<tr><td colspan="5"><b>${esc(l)}</b></td><td class="r"><b>${money(v)}</b></td><td></td></tr>`).join('')}</tfoot></table>`;
}

// ── Imprimer, télécharger, partager ──
function printHtml(html) {
  let p = $('#print'); if (!p) { p = document.createElement('div'); p.id = 'print'; document.body.appendChild(p); }
  p.innerHTML = html;
  const imgs = $$('img', p);
  Promise.all(imgs.map((i) => i.complete ? 0 : new Promise((ok) => { i.onload = i.onerror = ok; }))).then(() => setTimeout(() => { window.print(); }, 150));
}
function download(blob, name) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 60000);
}
async function share(files, text) {
  const fl = files.map(([b, n]) => new File([b], n, { type: b.type }));
  if (navigator.canShare && navigator.canShare({ files: fl })) {
    try { await navigator.share({ files: fl, title: text, text }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  fl.forEach((f) => download(f, f.name));
  toast(t('Fichier(s) téléchargé(s) : joignez-les à votre e-mail ou message.'), 4500);
}
async function docBlob(d) { const bytes = await C.readFile(d.file.id); return new Blob([bytes], { type: d.file.mime || 'application/octet-stream' }); }
async function printDoc(d) {
  if (!d.file) return toast(t('Pas de fichier joint'));
  toast(t('Préparation…'));
  const v = await fileView(d);
  if (v.kind === 'file') return download(v.blob, d.file.name);
  const pages = [];
  for (let i = 1; i <= v.pages; i++) pages.push(await pageUrl(v, i));
  printHtml(pages.map((u) => `<img class="ppage" src="${u}">`).join(''));
}

// ── Ma société, thème (crayon ✏️) ──
function socForm() {
  const s = { ...(S.db.soc || {}) };
  const sh = sheet(`<h3>✏️ ${esc(t('Ma société'))}</h3><p class="mut small">${esc(t('Le logo et ces données apparaissent dans l’app et en tête des récapitulatifs imprimés et envoyés.'))}</p>
    <form data-f="soc"><div class="logopick"><label class="logobox">${s.logo ? `<img src="${esc(s.logo)}" alt="">` : `＋<br>${esc(t('Logo'))}<br><small>PNG · JPG</small>`}<input type="file" accept="image/*" hidden name="logo"></label>${s.logo ? `<button type="button" class="lnk" data-a="nologo">${esc(t('Retirer le logo'))}</button>` : ''}</div>
    <label>${esc(t('Nom de la société'))}<input name="nom" value="${esc(s.nom)}"></label><label>${esc(t('Adresse'))}<input name="adresse" value="${esc(s.adresse)}"></label>
    <div class="grid2"><label>${esc(t('E-mail'))}<input name="email" type="email" value="${esc(s.email)}"></label><label>${esc(t('Téléphone'))}<input name="tel" value="${esc(s.tel)}"></label></div>
    <label>${esc(t('N° TVA / RCS (facultatif)'))}<input name="tva" value="${esc(s.tva)}"></label>
    <div class="lab">${esc(t('Thème (un clic)'))}</div><div class="themes">${Object.entries(THEMES).map(([k, l]) => `<button type="button" class="themeb th-${k}${document.documentElement.dataset.theme === k ? ' on' : ''}" data-a="theme" data-v="${k}"><i></i>${esc(l)}${k === 'verre' ? `<small>${esc(t('par défaut'))}</small>` : ''}</button>`).join('')}</div>
    <div class="row end"><button type="button" class="btn g" data-a="x">${esc(t('Annuler'))}</button><button class="btn">${esc(t('Enregistrer'))}</button></div></form>`, { wide: true });
  const f = $('form', sh);
  f.logo.onchange = async () => {
    const file = f.logo.files[0]; if (!file) return;
    const img = new Image(); img.src = URL.createObjectURL(file); await img.decode().catch(() => {});
    const k = Math.min(1, 360 / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
    const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(img.naturalWidth * k)); c.height = Math.max(1, Math.round(img.naturalHeight * k));
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(img.src);
    s.logo = c.toDataURL('image/png'); $('.logobox', sh).innerHTML = `<img src="${s.logo}" alt="">`;
  };
  sh.onclick = (e) => {
    const a = e.target.closest('[data-a]'); if (!a) return;
    if (a.dataset.a === 'x') closeSheet();
    if (a.dataset.a === 'nologo') { s.logo = ''; $('.logobox', sh).innerHTML = `＋<br>${esc(t('Logo'))}`; a.remove(); }
    if (a.dataset.a === 'theme') { setTheme(a.dataset.v); $$('.themeb', sh).forEach((b) => b.classList.toggle('on', b === a)); }
  };
  f.onsubmit = (e) => { e.preventDefault(); Object.assign(s, { nom: f.nom.value.trim(), adresse: f.adresse.value.trim(), email: f.email.value.trim(), tel: f.tel.value.trim(), tva: f.tva.value.trim() }); put('soc', s); closeSheet(); toast(t('Enregistré')); render(); };
}

// ── Réglages ──
function viewReglages(main) {
  const m = S.meta || {};
  const srv = { ok: 'Serveur prêt', none: 'Serveur prêt, synchronisation pas encore activée', old: 'Le Worker n’est pas encore à jour (le titulaire doit le republier)', off: 'Hors ligne' }[S.server] || '…';
  main.innerHTML = `<div class="mhead"><h2>⚙️ ${esc(t('Réglages'))}</h2></div><div class="setgrid">
  <div class="card"><h4>✏️ ${esc(t('Ma société'))}</h4><p class="mut small">${esc(t('Logo, nom, adresse, contact, thème.'))}</p><button class="btn g" data-a="soc">✏️ ${esc(t('Personnaliser'))}</button></div>
  <div class="card"><h4>🌐 ${esc(t('Langue'))}</h4>${langPills()}</div>
  <div class="card"><h4>☁️ ${esc(t('Synchronisation'))}</h4><p class="small">${esc(t(m.onServer ? 'Activée : vos appareils partagent le même coffre chiffré.' : 'Pas encore activée : tout reste sur cet appareil.'))}</p><p class="mut small">${esc(t(srv))}</p>
    ${m.onServer ? `<button class="btn g" data-a="syncnow">🔄 ${esc(t('Synchroniser maintenant'))}</button>${S.err === 'auth' ? `<button class="btn" data-a="relogin">🔑 ${esc(t('Se reconnecter'))}</button>` : ''}` : `<button class="btn" data-a="enablesync">☁️ ${esc(t('Activer la synchronisation'))}</button>`}
    <p class="mut small" id="pend"></p></div>
  <div class="card"><h4>🔐 ${esc(t('Sécurité'))}</h4><div class="col"><button class="btn g" data-a="lock">🔒 ${esc(t('Verrouiller maintenant'))}</button><button class="btn g" data-a="chpass">🔑 ${esc(t('Changer la clé d’accès'))}</button><button class="btn g" data-a="newrec">🧩 ${esc(t('Nouvelle clé de secours'))}</button></div></div>
  <div class="card"><h4>📦 ${esc(t('Sauvegarde chiffrée'))}</h4><p class="mut small">${esc(t('Un fichier .lgr illisible sans votre clé. À garder sur une clé USB ou un disque.'))}</p><div class="col"><button class="btn g" data-a="bk1">📦 ${esc(t('Fiches seulement (léger)'))}</button><button class="btn g" data-a="bk2">📦 ${esc(t('Tout, avec les fichiers'))}</button><label class="btn g">📥 ${esc(t('Importer une sauvegarde'))}<input type="file" accept=".lgr" hidden id="imp"></label></div></div>
  <div class="card"><h4>🗑️ ${esc(t('Corbeille'))}</h4><p class="mut small">${esc(t('{0} élément(s) supprimé(s), à restaurer si besoin.', ['doc', 'syn', 'res'].reduce((n, c) => n + Object.values(S.db[c]).filter((r) => r.del).length, 0)))}</p><a class="btn g" href="#/corbeille">🗑️ ${esc(t('Ouvrir la corbeille'))}</a></div>
  <div class="card"><h4>📲 ${esc(t('Installer l’app'))}</h4><p class="small">${esc(t('iMac (Safari) : menu Fichier → « Ajouter au Dock ». iPhone / iPad : bouton Partager → « Sur l’écran d’accueil ».'))}</p></div>
  <div class="card"><h4>ℹ️ ${esc(t('À propos'))}</h4><p class="small">LGR · Lux Gestion Résidences — ${esc(t('Résidences & Syndics'))} · v${VERSION}</p><p class="mut small">${esc(t('Données chiffrées sur l’appareil (AES-256) avant tout envoi : le serveur ne peut pas les lire.'))}</p></div></div>`;
  C.pendingCount().then((n) => { const el = $('#pend'); if (el && n) el.textContent = t('{0} fichier(s) en attente d’envoi', n); });
  $('#imp').onchange = async (e) => { const fl = e.target.files[0]; if (!fl) return; try { const r = await C.importBackup(await fl.text()); toast(t('Importé : {0} documents, {1} fichiers', r.docs, r.files)); render(); } catch (x) { toast(t(x.message === 'otherkey' ? 'Cette sauvegarde vient d’un autre coffre.' : 'Fichier non reconnu.')); } };
}
function viewTrash(main) {
  const rows = [];
  for (const [c, l] of [['doc', '📄'], ['syn', '🏢'], ['res', '🏠']]) Object.values(S.db[c]).filter((r) => r.del).forEach((r) => rows.push({ c, l, r }));
  rows.sort((a, b) => b.r.del - a.r.del);
  main.innerHTML = `<div class="mhead"><a class="btn g" href="#/reglages">‹ ${esc(t('Réglages'))}</a><h2>🗑️ ${esc(t('Corbeille'))}</h2></div><p class="mut">${esc(t('Rien n’est effacé pour de bon : restaurez ce que vous voulez.'))}</p>
  ${rows.length ? `<div class="cards">${rows.map(({ c, l, r }) => `<div class="card row between"><span>${l} <b>${esc(c === 'doc' ? docTitle(r) : r.nom)}</b> <span class="mut small">· ${esc(t('supprimé le {0}', new Date(r.del).toLocaleDateString(LOC[LANG])))}</span></span><button class="btn g sm" data-a="restore" data-c="${c}" data-id="${r.id}">↩️ ${esc(t('Restaurer'))}</button></div>`).join('')}</div>` : `<div class="empty">${esc(t('La corbeille est vide.'))}</div>`}`;
}
function passForm(title, fields, onOk) {
  const s = sheet(`<h3>${esc(t(title))}</h3><form>${fields.map(([n, l, ty]) => `<label>${esc(t(l))}<input name="${n}" type="${ty || 'password'}" required></label>`).join('')}<div class="err"></div><div class="row end"><button type="button" class="btn g" data-a="x">${esc(t('Annuler'))}</button><button class="btn">OK</button></div></form>`);
  s.onclick = (e) => { if (e.target.closest('[data-a=x]')) closeSheet(); };
  $('form', s).onsubmit = async (e) => { e.preventDefault(); const b = e.target.querySelector('button:not([type=button])'); b.disabled = true; try { await onOk(e.target, s); } catch (x) { $('.err', s).textContent = t({ badpass: 'Clé incorrecte.', badcode: 'Code de configuration incorrect.', exists: 'Un coffre LGR existe déjà sur le serveur : ouvrez-le depuis l’écran d’accueil (« J’ai déjà un coffre »).', nocode: 'Le code de configuration n’est pas encore dans le Worker (secret LGR_SETUP_CODE).', server: 'Le serveur ne répond pas correctement. Réessayez.', offline: 'Pas de connexion.' }[x.message] || x.message); b.disabled = false; } };
}
function showCode(code) {
  const s = sheet(`<h3>🧩 ${esc(t('Votre nouvelle clé de secours'))}</h3><p class="mut small">${esc(t('L’ancienne ne marche plus. Notez-la ou imprimez-la et gardez-la en lieu sûr.'))}</p><div class="rcode">${esc(code)}</div><div class="row end"><button class="btn g" data-a="p">🖨️ ${esc(t('Imprimer'))}</button><button class="btn" data-a="x">OK</button></div>`);
  s.onclick = (e) => { const a = e.target.closest('[data-a]'); if (!a) return; if (a.dataset.a === 'x') closeSheet(); if (a.dataset.a === 'p') printHtml(`<h2>LGR · Lux Gestion Résidences</h2><p>${esc(t('Clé de secours du coffre'))}</p><p style="font:700 22pt monospace">${esc(code)}</p><p>${dmy(today())}</p>`); };
}

// ── Clics et saisies ──
async function onClick(e) {
  if (document.body.classList.contains('locked')) return;
  const a = e.target.closest('[data-a],[data-lang]'); if (!a) return;
  if (a.dataset.lang) { LANG = a.dataset.lang; ls.set('lgrLang', LANG); document.documentElement.lang = LANG; hayCache.clear(); return render(); }
  const k = a.dataset.a, id = a.dataset.id;
  const saveF = () => ls.set('lgrFilters', { ...F, q: '' }), saveR = () => ls.set('lgrRecap', R);
  switch (k) {
    case 'open': SEL = id; if (innerWidth >= 1100) { $$('tr.sel').forEach((r) => r.classList.remove('sel')); a.classList.add('sel'); preview($('#prev'), id); } else location.hash = '#/doc/' + id; break;
    case 'go': if (innerWidth >= 1100 && route()[0] === 'docs') { SEL = id; render(); } else location.hash = '#/doc/' + id; break;
    case 'back': history.length > 1 ? history.back() : (location.hash = '#/docs'); break;
    case 'add': addDocs(); break;
    case 'adddoc': F.res = a.dataset.res; F.syn = (get('res', F.res) || {}).syn || ''; saveF(); addDocs(); break;
    case 'more': LIMIT += 300; render(); break;
    case 'sort': SORT = { k: a.dataset.k, d: SORT.k === a.dataset.k ? -SORT.d : (a.dataset.k === 'date' || a.dataset.k === 'montant' ? -1 : 1) }; ls.set('lgrSort', SORT); render(); break;
    case 'ftype': F.type = a.dataset.v; if (F.st && !(STATES[F.type] || {})[F.st]) F.st = ''; saveF(); render(); break;
    case 'fclear': F = { ...F, type: '', per: 'all', syn: '', res: '', st: '' }; saveF(); render(); break;
    case 'rtype': R.type = a.dataset.v; if (R.st && !(STATES[R.type] || {})[R.st]) R.st = ''; saveR(); render(); break;
    case 'rclear': R = { ...R, type: '', per: 'all', syn: '', res: '', st: '' }; saveR(); render(); break;
    case 'fsyn': e.preventDefault(); F = { ...F, syn: id, res: '' }; saveF(); location.hash = '#/docs'; render(); break;
    case 'fres': e.preventDefault(); F = { ...F, res: id, syn: (get('res', id) || {}).syn || '' }; saveF(); location.hash = '#/docs'; render(); break;
    case 'recsyn': R = { ...R, syn: id, res: '' }; saveR(); location.hash = '#/recap'; break;
    case 'xls': download(recapXlsx({ ...F }), fname(F, 'xlsx')); break;
    case 'pdf': download(await recapPdf({ ...F }), fname(F, 'pdf')); break;
    case 'rxls': download(recapXlsx(R), fname(R, 'xlsx')); break;
    case 'rpdf': download(await recapPdf(R), fname(R, 'pdf')); break;
    case 'rprint': printHtml(recapPrintHtml(R)); break;
    case 'rshare': share([[await recapPdf(R), fname(R, 'pdf')], [recapXlsx(R), fname(R, 'xlsx')]], recapTitle(R)); break;
    case 'newsyn': synForm({}); break;
    case 'editsyn': synForm(get('syn', id)); break;
    case 'newres': resForm({ syn: a.dataset.syn || F.syn || '' }); break;
    case 'editres': resForm(get('res', id)); break;
    case 'soc': socForm(); break;
    case 'edit': docForm({ ...get('doc', id) }); break;
    case 'link': linkForm(get('doc', id)); break;
    case 'setst': { const d = get('doc', id); d.st = a.dataset.v; if (d.type === 'fac') d.payeLe = d.st === 'payee' ? (d.payeLe || today()) : ''; put('doc', d); break; }
    case 'del': if (await ask('Mettre ce document à la corbeille ? (vous pourrez le restaurer)', { ok: 'Mettre à la corbeille', danger: true })) { trash('doc', id); SEL = ''; if (route()[0] === 'doc') location.hash = '#/docs'; toast(t('Dans la corbeille')); } break;
    case 'restore': restore(a.dataset.c, id); toast(t('Restauré')); break;
    case 'dprint': printDoc(get('doc', id)).catch(() => toast(t('Fichier indisponible pour l’instant (hors ligne ?).'))); break;
    case 'ddl': { const d = get('doc', id); try { download(await docBlob(d), fileName(d)); } catch { toast(t('Fichier indisponible pour l’instant (hors ligne ?).')); } break; }
    case 'dshare': { const d = get('doc', id); if (!d.file) return toast(t('Pas de fichier joint')); try { share([[await docBlob(d), fileName(d)]], `${t(TYPE_LONG[d.type])} ${d.no} · ${resName(d.res)} · ${money(d.montant)}`); } catch { toast(t('Fichier indisponible pour l’instant (hors ligne ?).')); } break; }
    case 'syncnow': toast(t('Synchronisation…')); await C.sync(); toast(S.err ? t('Synchronisation en attente') : t('Synchronisé')); render(); break;
    case 'relogin': await C.forgetMeta(); lockScreen('have'); break;
    case 'lock': await C.lock(); location.hash = ''; lockScreen('unlock'); break;
    case 'enablesync': passForm('Activer la synchronisation', [['code', 'Code de configuration (donné par le titulaire du Worker)', 'text']], async (f) => { await C.enableSync(f.code.value.trim()); closeSheet(); toast(t('Synchronisation activée')); render(); }); break;
    case 'chpass': passForm('Changer la clé d’accès', [['old', 'Clé d’accès actuelle'], ['p1', 'Nouvelle clé (au moins 10 caractères)'], ['p2', 'Répétez la nouvelle clé']], async (f) => { if (f.p1.value.length < 10) throw new Error(t('Au moins 10 caractères.')); if (f.p1.value !== f.p2.value) throw new Error(t('Les deux clés ne sont pas identiques.')); await C.changePass(f.old.value, f.p1.value); closeSheet(); toast(t('Clé d’accès changée')); }); break;
    case 'newrec': passForm('Nouvelle clé de secours', [['p', 'Clé d’accès']], async (f) => { const code = await C.newRecovery(f.p.value); closeSheet(); showCode(code); }); break;
    case 'bk1': case 'bk2': toast(t('Préparation…')); download(await C.backupBlob(k === 'bk2'), `LGR-sauvegarde-${today()}${k === 'bk2' ? '-complete' : ''}.lgr`); break;
  }
}
function onInput(e) {
  const el = e.target;
  if (el.id === 'q') { F.q = el.value; LIMIT = 200; clearTimeout(onInput.t); onInput.t = setTimeout(() => { const pos = el.selectionStart; render(); const q = $('#q'); if (q) { q.focus(); try { q.setSelectionRange(pos, pos); } catch { /* */ } } }, 180); return; }
  if (el.id === 'rq') { F.rq = el.value; clearTimeout(onInput.t); onInput.t = setTimeout(() => { render(); const q = $('#rq'); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }, 180); return; }
  if (e.type !== 'change' || !el.dataset.f) return;
  const o = el.dataset.f === 'r' ? R : F;
  o[el.name] = el.name === 'y' ? +el.value : el.value;
  if (el.name === 'syn' && o.res && (get('res', o.res) || {}).syn !== o.syn) o.res = '';
  if (el.name === 'res' && o.res) o.syn = (get('res', o.res) || {}).syn || o.syn;
  ls.set(el.dataset.f === 'r' ? 'lgrRecap' : 'lgrFilters', el.dataset.f === 'r' ? R : { ...F, q: '' });
  render();
}
addEventListener('resize', () => { clearTimeout(onInput.r); onInput.r = setTimeout(() => { if (!document.body.classList.contains('locked') && !document.querySelector('.sheetbg') && route()[0] === 'docs') render(); }, 250); });

if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
boot();
