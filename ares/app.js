// CENTRAL-OGL — Gestion locative (interface). L'app est à CENTRAL-OGL (Ares Invest S.A.) ;
// les données de la société cliente (Réglages → Société, ici NOBIS s.a.r.l.) servent aux quittances et aux apps des locataires.
import './reqmark.js';
import { Vault, payKey, isLegacy, ApiError, uid, deviceLabel } from './store.js';
import { passphraseStrength } from './crypto.js';
import { binPlan } from './binplan.js';
import { chatResolve, chatOpen, newMsgId, editable } from './chatops.js';
import { trInit, trButton } from './chattr.js';
import qrcode from './qrcode.js';
import { getLang, setLang, startI18n, LANGS, LOCALES } from './i18n.js';
import { newsHtml } from './news.js';
import { emojiInit } from './emoji.js';
import { pushStatus, pushEnable, pushRefresh, setBadge } from './push-client.js';
import { scrollHintInit } from './scroll-hint.js';
import { pullRefreshInit } from './pull-refresh.js';
// tirer vers le bas en haut de la page : synchronise et recharge tout ce que l'écran montre
pullRefreshInit({
  lang: () => getLang(),
  refresh: async () => {
    if (!vault.unlocked) return;
    await vault.sync();
    await Promise.all([inboxSync(), chatPoll()].map((p) => Promise.resolve(p).catch(() => {})));
    renderView();
  },
});
scrollHintInit();
import { xlsxBlob } from './xlsx.js';
import { newEspaceId, newEspaceKey, sealJson, openJson, sealBytes, newOwnerKeys, openFromTenant, sealForOwner, unb64u, b64u, newAccessCode, codeHash, wrapWithCode } from './espace-crypto.js';

const VERSION = '2.324.0';
const API = document.querySelector('meta[name="ares-api"]').content;
let firstOpen = true;
// 🌐 centrale d'un client du réseau : …/locataires.html?t=<id> (gardé sur cet appareil) ; ?t=main → centrale principale
const TENANT = (() => {
  // …/centraldomier/?<id> (sans nom dans l'adresse) ou l'ancien …/locataires.html?t=<id>
  const q = new URLSearchParams(location.search).get('t') || ((location.search.match(/^\?([a-z0-9]{12,24})$/) || [])[1]) || '';
  try {
    if (q === 'main') { localStorage.removeItem('aresTenant'); return ''; }
    if (/^[a-z0-9]{12,24}$/.test(q)) { localStorage.setItem('aresTenant', q); return q; }
    // sans ?t= : dans un onglet du navigateur c'est TOUJOURS notre centrale ; seule l'app installée d'un client se souvient de la sienne
    const inst = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    return inst ? localStorage.getItem('aresTenant') || '' : '';
  } catch { return /^[a-z0-9]{12,24}$/.test(q) ? q : ''; }
})();
// CENTRAL-OGL · Organisation et gestion des locataires (ARES Invest s.a. / Nobis s.a.r.l.)
const brandName = () => societe().nom || OGL.nom; // nom qui signe les messages et les annonces
const OGL = { nom: 'CENTRAL-OGL', sub: 'ARES Invest s.a. / Nobis s.a.r.l.', info: 'Organisation et gestion des locataires' };
let tenantInfo = (() => { try { return JSON.parse(localStorage.getItem('aresTenantInfo:' + TENANT) || '{}'); } catch { return {}; } })();
{
  document.querySelector('link[rel=manifest]')?.remove();
  // adresse des clients : /centralluxintervention/?<numéro> (les anciens liens /centraldomier/… et locataires.html?t= y passent tout seuls)
  if (!/^\?[a-z0-9]{12,24}$/.test(location.search) || !location.pathname.startsWith('/central-ogl')) history.replaceState(null, '', '/central-ogl/?' + TENANT + location.hash); // CENTRAL-OGL : sa propre adresse (les anciens liens y passent tout seuls)
  const at = document.querySelector('meta[name=apple-mobile-web-app-title]');if (at) at.content = OGL.nom;
  document.title = OGL.nom;
}
// CENTRAL-OGL : il n'y a plus de centrale principale ; sans numéro de centrale dans l'adresse, on n'ouvre rien
const TENANT_ID = TENANT;
const centralUrl = (tid) => `${location.origin}/central-ogl/?${tid}`; // adresse de la centrale (kit de récupération)
if (!TENANT_ID) {
  document.title = OGL.nom;
  document.body.innerHTML = '<div style="font-family:system-ui,sans-serif;max-width:520px;margin:60px auto;padding:0 16px;text-align:center;color:#1a1a1a"><h1 style="font-size:22px">CENTRAL-OGL</h1><p>Ouvrez le lien de votre centrale (adresse avec son numéro).</p></div>';
  await new Promise(() => {});
}
const tenantSave = (t) => { if (!t) return; tenantInfo = t; try { localStorage.setItem('aresTenantInfo:' + TENANT, JSON.stringify(t)); } catch { /* stockage plein */ } if (t.nom) { document.title = OGL.nom; const at = document.querySelector('meta[name=apple-mobile-web-app-title]'); if (at) at.content = t.nom; } }; // nom sous l'icône de l'écran
// 🧾 qui signe les quittances : bailleur principal (locataire principal, comme la centrale principale aujourd'hui), propriétaire, ou gérance
const socRole = () => (tenantInfo.fil === 'proprio' ? (tenantInfo.sous ? 'sous' : 'proprio') : tenantInfo.fil === 'gerance' ? 'gest' : 'proprio');
const SOC_QUAL = { sous: 'locataire principal et bailleur', proprio: 'propriétaire et bailleur', gest: 'agissant pour le compte du bailleur' };
const SOC_FICHE = { sous: 'Votre société — locataire principal (apparaît sur les quittances et les relances)', proprio: 'Votre société — propriétaire / bailleur (apparaît sur les quittances et les relances)', gest: 'Votre société — gestionnaire (apparaît sur les quittances et les relances)' };
// rubriques de chaque filière (la centrale du client ne montre que les siennes)
const TENANT_ROUTES = {
  // CENTRAL-OGL : seulement la gestion des locataires (plus de demandes à CENTRAL-OGL ni de classement des ouvriers)
  gerance: ['dashboard', 'immeubles', 'locataires', 'paiements', 'compta', 'rapports', 'reglages'],
  proprio: ['dashboard', 'immeubles', 'locataires', 'paiements', 'compta', 'rapports', 'reglages'],
};
const tRoutes = () => TENANT_ROUTES[tenantInfo.fil] || TENANT_ROUTES.gerance;
const routeOk = (r) => (tRoutes().includes(r));
const homeRoute = () => (tRoutes()[0]);
const vault = new Vault(API, TENANT);
{
  const XF = new Set(['immeubles', 'logements', 'locataires']), rawList = vault.list.bind(vault);
  vault.listAll = rawList;
  vault.list = (c) => {
    const L = rawList(c);
    return L;
    const gone = new Set(rawList('immeubles').filter((x) => x.xfer).map((x) => x.id));
    return gone.size ? L.filter((x) => !x.xfer && !gone.has(x.immId)) : L;
  };
}
trInit(API, () => getLang()); // 🌐 traduction des messages des chats
emojiInit(); // 😊 bouton émojis dans les chats
// 🗄️ Nouveau départ : les données de test sont archivées (gardées, rien n'est effacé) et ne s'affichent plus
// nulle part (listes, statistiques, apps) ; Réglages → « Voir les archives » les montre à nouveau
const ARCH_COLS = new Set(['taches', 'devis', 'hotes', 'biens']);
let showArch = false;
{ const list0 = vault.list.bind(vault); vault.list = (c) => { const r = list0(c); return ARCH_COLS.has(c) && !showArch ? r.filter((x) => !x.arch) : r; }; }
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
  headset: '<path d="M4 13.5V12a8 8 0 0 1 16 0v1.5"/><rect x="2.5" y="12" width="3.5" height="6" rx="1.6"/><rect x="18" y="12" width="3.5" height="6" rx="1.6"/><path d="M19.75 18v.4c0 1.8-1.6 3.1-3.6 3.1H14"/><path d="M12 8.8a4.3 4.3 0 1 1-2.2 8l-2 .7.7-1.9A4.3 4.3 0 0 1 12 8.8z"/><circle cx="10.3" cy="13.1" r=".55" style="fill:currentColor;stroke:none"/><circle cx="12" cy="13.1" r=".55" style="fill:currentColor;stroke:none"/><circle cx="13.7" cy="13.1" r=".55" style="fill:currentColor;stroke:none"/>',
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
  car: '<path d="M5 17h14M3 17v-4l2-5a2 2 0 0 1 2-1h10a2 2 0 0 1 2 1l2 5v4"/><path d="M3 13h18"/><circle cx="7.5" cy="17.5" r="1.8"/><circle cx="16.5" cy="17.5" r="1.8"/>',
  qr: '<rect x="3.5" y="3.5" width="6" height="6" rx="1"/><rect x="14.5" y="3.5" width="6" height="6" rx="1"/><rect x="3.5" y="14.5" width="6" height="6" rx="1"/><path d="M14.5 14.5h2.5v2.5h-2.5zM18.5 18.5h2v2h-2zM18.5 14.5h2M14.5 20.5h2"/>',
  megaphone: '<path d="M3.5 10v4a1 1 0 0 0 1 1H7l7 4V5L7 9H4.5a1 1 0 0 0-1 1Z"/><path d="M17.5 9.5a3.5 3.5 0 0 1 0 5M8 15l1 4.5"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  luggage: '<rect x="5" y="7" width="14" height="12" rx="2"/><path d="M9 7V4h6v3M9 11v4M15 11v4"/><circle cx="8" cy="21" r="1"/><circle cx="16" cy="21" r="1"/>',
  homes: '<path d="M2 12 8 7l6 5"/><path d="M4 11v9h8v-9"/><path d="M12 9l5-4 5 4"/><path d="M14 20h6v-9.5"/><path d="M7 20v-3h2v3"/>',
  building: '<rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1M10 21v-3h4v3"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.3-5.5 6.5-5.5s5.7 2 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c1.8.7 3 2.5 3.5 5.2"/>',
  wallet: '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18M16 15h2"/><path d="M6 6V5a2 2 0 0 1 2-2h9"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
  lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>',
  shield: '<path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6L12 3Z"/><path d="m9 12 2 2 4-4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  archive: '<rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8"/><path d="M10 12h4"/>',
  eyeOff: '<path d="M3 3l18 18M10.6 5.1A10.6 10.6 0 0 1 12 5c6.4 0 10 7 10 7a17.7 17.7 0 0 1-3.2 4.2M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7c1.7 0 3.2-.5 4.5-1.2"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  msg: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12Z"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"/><path d="M14 3v5h5"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  upload: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="m21 16-5-5-9 9"/>',
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
  trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M17 5h3a3 3 0 0 1-3 4M7 5H4a3 3 0 0 0 3 4"/>',
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18M10 13v2h4v-2"/>',
  bed: '<path d="M3 7v13M21 13v7M3 16h18"/><path d="M3 13h18v-1a3 3 0 0 0-3-3h-7v4"/><circle cx="7" cy="11" r="1.6"/>',
  tool: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
};
const icon = (n) => new Raw(`<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`);

// ───────────────────────── Formats ─────────────────────────
// Langue de l'interface (Réglages → Apparence) : le français est la langue source, les autres sont traduites à l'affichage
const LANG = getLang(), LOC = LOCALES[LANG];
await startI18n(LANG);
const cap1 = (x) => x.charAt(0).toUpperCase() + x.slice(1);
const MONTHS = LANG === 'fr' ? ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'] : Array.from({ length: 12 }, (_, i) => cap1(new Date(2026, i, 15).toLocaleDateString(LOC, { month: 'short' }).replace('.', '')));
const MONTHS_FULL = LANG === 'fr' ? ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'] : Array.from({ length: 12 }, (_, i) => cap1(new Date(2026, i, 15).toLocaleDateString(LOC, { month: 'long' })));
const eurFmt = new Intl.NumberFormat(LOC, { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 2 });
const money = (n) => eurFmt.format(n || 0);
const num = (v) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return isFinite(n) ? n : 0; };
const fmtDate = (s) => (s ? new Date(s + (s.length === 10 ? 'T00:00:00' : '')).toLocaleDateString(LOC, { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const fmtDateTime = (t) => new Date(t).toLocaleString(LOC, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const isoDate = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const today = () => isoDate(new Date());
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const level = (p) => (p >= 80 ? '' : p >= 50 ? 'warn' : 'bad');

// ───────────────────────── Règles métier ─────────────────────────
// Immeuble ─┬─ Logement (appartement, studio, chambre…) ── Locataires successifs (jamais effacés : `sortie` = date de départ)
//           ├─ Versements au bailleur (loyer du bail principal, mois par mois)
//           └─ Dépenses (réparations…), rattachées à l'immeuble ou à un logement précis
const fullName = (l) => [l.prenom, l.nom].filter(Boolean).join(' ') || 'Sans nom';
// avatar d'un locataire : l'icône qu'il a choisie dans son app, sinon ses initiales
// photo de profil (locataire / ouvrier) : JPEG carré 256 px, mise par nous ou par la personne dans son app
const photoOk = (v) => typeof v === 'string' && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(v) && v.length < 160000;
const avIn = (l) => (l && photoOk(l.photo) ? html`<img class="av-ph" src="${l.photo}" alt="">` : initials(l));
const photoField = (rec, fallback) => html`<div class="full photo-pick"><span class="pp-circle">${photoOk(rec.photo) ? html`<img src="${rec.photo}" alt="">` : fallback}</span>
  <input type="hidden" name="photo" value="${photoOk(rec.photo) ? rec.photo : ''}">
  <label class="btn sm" style="cursor:pointer">📷 ${photoOk(rec.photo) ? 'Changer la photo' : 'Ajouter une photo'}<input type="file" accept="image/*" data-input="photo-pick" hidden></label>
  ${photoOk(rec.photo) ? html`<button type="button" class="btn sm ghost" data-action="photo-del">Retirer</button>` : ''}
  <span class="tiny muted">Facultatif — la personne peut aussi la mettre elle-même dans son app (⚙️).</span></div>`;
const initials = (l) => (l && emojiOk(l.avatar) ? html`<span class="av-emo">${l.avatar}</span>` : (((l.prenom || '')[0] || '') + ((l.nom || '')[0] || '')).toUpperCase() || '?');
const immName = (id) => (vault.get('immeubles', id) || {}).adresse || 'Sans immeuble';
// Type de structure (immeuble) et type d'unité louée (logement / local)
const IMM_TYPES = {
  immeuble: 'Immeuble à plusieurs étages', maison: 'Maison / propriété avec chambres', local: 'Ancien café / local transformé en chambres',
  residence: 'Résidence / foyer / colocation', colocation: 'Appartements en colocation (2 à 10 chambres)', studios: 'Immeuble de studios',
  commercial: 'Bâtiment commercial / bureaux', mixte: 'Mixte (habitation + commerce)', parking: 'Parking / garages', caves: 'Caves / débarras', autre: 'Autre structure',
};
const LOG_GROUPS = [
  ['Habitation', { appartement: 'Appartement', studio: 'Studio (lit, kitchenette, salle d’eau / WC indépendants)', chambre: 'Chambre', duplex: 'Duplex / penthouse', maison: 'Maison' }],
  ['Professionnel', { bureau: 'Bureau', commercial: 'Local commercial / magasin', restauration: 'Local de restauration (café, restaurant)', cabinet: 'Cabinet (médical, profession libérale)', atelier: 'Atelier / entrepôt' }],
  ['Annexes', { box: 'Espace box', garage: 'Garage / box', parking: 'Emplacement de parking', cave: 'Cave / débarras (à louer ou usage propre)', jardin: 'Jardin / terrain', autre: 'Autre' }],
];
const LOG_TYPES = Object.assign({}, ...LOG_GROUPS.map(([, t]) => t));
// nom court (« 2 », « 2B ») complété par le type : « Chambre 2 » — pour que l'occupant retrouve sa porte
const logLabel = (g) => { const n = String((g && g.nom) || '').trim(), t = g && LOG_TYPES[g.type]; return t && g.type !== 'autre' && /^[0-9][0-9A-Za-z.-]{0,3}$/.test(n) ? `${t.split(' ')[0]} ${n}` : n; };
const logTypeSelect = (name, cur) => html`<label class="field">Type<select name="${name}">${LOG_GROUPS.map(([g, t]) => html`<optgroup label="${g}">${Object.entries(t).map(([k, v]) => html`<option value="${k}" ${cur === k ? new Raw('selected') : ''}>${v}</option>`)}</optgroup>`)}</select></label>`;
const LOG_ROOMS = ['appartement', 'duplex', 'maison'];
// 🅿️ Parking / garage / box : pour quel véhicule (au lieu des m²), ouvert ou fermé, hauteur — mesures indicatives
const PARK_TYPES = ['parking', 'garage', 'box'];
const PARK_SIZE = { moto: '🏍️ Moto / scooter (~2,50 × 1,00 m)', std: '🚗 Voiture standard (5,00 × 2,50 m)', long: '🚙 Voiture longue / SUV (~5,50 × 2,70 m)', pmr: '♿ Place PMR — personne handicapée (~5,00 × 3,30 m)', van: '🚐 Camionnette / utilitaire (~6,50 × 3,00 m)' };
const PARK_KIND = { ouvert: 'Place ouverte (à l’air libre)', couvert: 'Place couverte', ferme: 'Box / garage fermé' };
// chaque morceau dans son propre texte (traduisible)
const parkHtml = (g) => { const k = g.park || {}, parts = [k.taille ? PARK_SIZE[k.taille].split(' (')[0] : '', k.genre ? PARK_KIND[k.genre].split(' (')[0] : '', k.h ? `hauteur max ${String(k.h).replace('.', ',')} m` : ''].filter(Boolean); return html`${parts.map((x, i) => html`${i ? ' · ' : ''}<span>${x}</span>`)}`; };
const parkTxt = (g) => { const k = g.park || {}; return [k.taille ? PARK_SIZE[k.taille].split(' (')[0] : '', k.genre ? PARK_KIND[k.genre].split(' (')[0] : '', k.h ? 'hauteur max ' + String(k.h).replace('.', ',') + ' m' : ''].filter(Boolean).join(' · '); };
// Annexes comprises avec le logement (cave, mansarde, garage…) et type de maison
const ANNEX = { cave: '🍷 Cave', mans: '🏠 Mansarde / grenier', garage: '🚗 Garage', parking: '🅿️ Place de parking', jardin: '🌿 Jardin', balcon: '🌇 Balcon / terrasse' };
const ANNEX_OPT = { mans: { hab: 'habitable', non: 'non habitable (rangement)' }, garage: { semi: 'au sous-sol / semi-enterré', ext: 'extérieur', box: 'box' } };
const MAISON_T = { isolee: 'Maison individuelle (4 façades libres)', jumelee: 'Maison jumelée (un mur commun)', rangee: 'Maison mitoyenne / en rangée (entre deux maisons)' };
// unités qui ne sont pas des logements : chacune a son propre fil avec le gestionnaire, pas de tour de poubelles
const NOT_HOME = ['cave', 'garage', 'box', 'parking', 'atelier', 'jardin'];
const annexOf = (g) => { const a = { ...((g && g.annex) || {}) }; if (g && g.mans && !a.mans) a.mans = 'hab'; return a; };
const annexText = (g) => Object.entries(annexOf(g)).filter(([k, v]) => v && ANNEX[k]).map(([k, v]) => ANNEX[k] + (ANNEX_OPT[k] && ANNEX_OPT[k][v] ? ' (' + ANNEX_OPT[k][v] + ')' : '') + ((g.annexM2 || {})[k] ? ' ' + (g.annexM2 || {})[k] + ' m²' : '')).join(' · ');
const logKind = (g) => { const t = (LOG_TYPES[g.type] || '').split(' (')[0], a = annexOf(g); return (LOG_ROOMS.includes(g.type) && (g.ch || a.mans) ? `${t} · ${g.ch ? g.ch + ' ch.' : ''}${a.mans ? (g.ch ? ' + ' : '') + 'mansarde' : ''}` : t) + (g.surface ? ` · ${g.surface} m²` : ''); };
const logIcon = (t) => (t === 'chambre' ? 'key' : LOG_GROUPS[1][1][t] ? 'building' : 'home');
// Où se trouve l'unité : « étage 1er · ancien bar »
const logWhere = (g) => [g.etage ? 'étage ' + g.etage : '', g.partie].filter(Boolean).join(' · ');
// Documents du locataire (dossier d'entrée, caution…)
const DOC_TYPES = {
  bail: 'Contrat de bail', identite: "Pièce d'identité (carte d'identité / passeport)", cns: 'Carte CNS (assurance maladie)', caution: 'Preuve de la caution (reçu, virement, message)',
  loyer: 'Preuve de paiement du loyer', assurance: 'Attestation assurance habitation', revenus: 'Fiches de salaire / revenus', titre: 'Titre de séjour', autre: 'Autre document',
};
const DOSSIER = [['bail', 'Contrat'], ['identite', 'Identité'], ['cns', 'CNS'], ['caution', 'Caution']];
const CAUTION_MODES = { especes: 'En main propre (espèces)', virement: 'Virement bancaire', cheque: 'Chèque', garantie: 'Garantie bancaire', autre: 'Autre' };
const logName = (id) => logLabel(vault.get('logements', id)) || '';
const whereOf = (l) => [logName(l.logId), immName(l.immId)].filter(Boolean).join(' · ');
const byName = (a, b) => fullName(a).localeCompare(fullName(b), 'fr');
const imms0 = () => vault.list('immeubles');
// Immeuble qui n'est plus en gestion (vendu, bail principal terminé…) : archivé, jamais effacé
const immGone = (im) => !!(im && im.finGestion) && im.finGestion <= today();
// Photos d'état des lieux : attachées au logement (pas au locataire), elles restent d'un occupant à l'autre
// État des lieux : une photo par pièce (posée par nous) ; à son départ, le locataire envoie les siennes (« sortie »)
const EDL_ROOMS = [['sdb', '🛁 Salle de bain'], ['cuisine', '🍳 Cuisine'], ['chambre', '🛏️ Chambre'], ['cave', '📦 Cave'], ['buanderie', '🧺 Buanderie'], ['parking', '🚗 Parking']];
const EDL_ROOM = Object.fromEntries(EDL_ROOMS);
const edlOf = (logId, kind = 'edl') => vault.list('documents').filter((d) => d.kind === kind && d.logId === logId).sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.u || 0) - (b.u || 0));
const edlIn = (logId, room) => edlOf(logId).filter((d) => d.room === room).pop();
const edlOutNew = () => vault.list('documents').filter((d) => d.kind === 'edl-out' && !d.seen);

// icône choisie par la personne dans son app (sinon celle de son métier)
const emojiOk = (v) => typeof v === 'string' && v.length <= 16 && /^\p{Extended_Pictographic}/u.test(v);
const TACHE_TYPES = { nettoyage: '🧹 Nettoyage', reparation: '🔧 Réparation', gros: '🚚 Gros travaux', autre: '📌 Autre' };
const RECURS = { '': 'Une seule fois', hebdo: 'Chaque semaine', '2sem': 'Toutes les 2 semaines', mois: 'Chaque mois' };
const STATUTS = { afaire: 'À faire', planifie: 'Planifiée', fait: 'Terminée' };
const ST_DOT = { afaire: '🔴', planifie: '🟡', fait: '🟢' };
const DECHETS = {
  residuel: { label: 'Déchets résiduels (poubelle grise)', short: 'Résiduels', color: '#6b7280' },
  organique: { label: 'Biodéchets / organique (umido)', short: 'Organique', color: '#92400e' },
  papier: { label: 'Papier / carton', short: 'Papier', color: '#2563eb' },
  verre: { label: 'Verre', short: 'Verre', color: '#15803d' },
  valorlux: { label: 'Valorlux (sacs bleus PMC)', short: 'Valorlux', color: '#0891b2' },
  encombrants: { label: 'Encombrants (grandes)', short: 'Encombrants', color: '#7c3aed' },
  autre: { label: 'Autre collecte', short: 'Autre', color: '#9a958a' },
};
const LIEUX = { rue: 'Sur le trottoir (devant l’immeuble)', soussol: 'Au sous-sol / local poubelles', garage: 'Au garage', autre: 'Autre (voir remarque)' };
const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const weekday = (s) => new Date(s + 'T00:00:00').getDay();
const fmtDay = (s) => new Date(s + 'T00:00:00').toLocaleDateString(LOC, { weekday: 'long', day: 'numeric', month: 'long' });

// Dates d'une règle récurrente entre from et to (inclus). start = première date de la série.
function recurDates(start, recur, from, to, end) {
  if (!start) return [];
  const stop = end && end < to ? end : to;
  if (!recur) return start >= from && start <= stop ? [start] : [];
  const out = [];
  if (recur === 'mois') {
    const [y, m, day] = start.split('-').map(Number);
    for (let n = 0; n < 600; n++) {
      const last = new Date(y, m + n, 0).getDate();
      const d = isoDate(new Date(y, m - 1 + n, Math.min(day, last)));
      if (d > stop) break;
      if (d >= from) out.push(d);
    }
    return out;
  }
  const step = recur === 'hebdo' ? 7 : 14;
  let d = start;
  if (d < from) {
    const gap = Math.round((new Date(from + 'T00:00:00') - new Date(d + 'T00:00:00')) / 864e5);
    d = addDays(d, Math.floor(gap / step) * step);
  }
  for (let i = 0; d <= stop && i < 800; i++, d = addDays(d, step)) if (d >= from) out.push(d);
  return out;
}
// Jours de collecte d'une règle de déchets
function collecteDates(c, from, to) {
  if (c.mode === 'dates') return (c.dates || []).filter((d) => d >= from && d <= to);
  if (c.mode === 'hebdo') {
    // Chaque semaine : toute la période, quel que soit le jour d'enregistrement
    let start = from;
    while (weekday(start) !== +c.jour) start = addDays(start, 1);
    return recurDates(start, 'hebdo', from, to);
  }
  if (c.mode === '2sem') {
    // Une semaine sur deux : on recule le repère pour couvrir aussi les dates avant le premier passage saisi
    let start = c.debut || from;
    if (start > from) start = addDays(start, -14 * Math.ceil((new Date(start + 'T00:00:00') - new Date(from + 'T00:00:00')) / (14 * 864e5)));
    return recurDates(start, '2sem', from, to);
  }
  return [];
}
// Quand sortir les poubelles : la veille au soir (par défaut) ou le jour même, tôt le matin
const SORTIES = { veille: 'La veille au soir', jour: 'Le jour même, tôt le matin' };
const sortieRule = (c) => (c.sortie === 'jour' ? `Le jour du passage, ${c.heure || 'tôt le matin'}` : `La veille au soir${c.heure ? ', ' + c.heure : ''}`);
const collecteRule = (c) => (c.mode === 'hebdo' ? `chaque ${JOURS[+c.jour]}` : c.mode === '2sem' ? `un ${JOURS[weekday(c.debut)]} sur deux (à partir du ${fmtDate(c.debut)})` : plural((c.dates || []).length, 'date'));
// Lecture souple de dates : 07/01/2026, 7.1.2026, 07/01 (année par défaut), 2026-01-07
// Mots-clés des types de déchets dans les calendriers des communes (français, allemand, luxembourgeois).
// Ordre = priorité : « encombrants ménagers » est un encombrant, pas un résiduel.
const DECHET_KEYS = {
  encombrants: /encombr|sperr|grouss/i,
  valorlux: /valorlux|pmc|sacs? bleus?|blo s[äa]ck|blaue s[äa]cke/i,
  verre: /verre|glas|gl[äa]ser/i,
  papier: /papier|carton|karton|pabeier/i,
  organique: /organ|bio|kompost|compost|gr[üu]ngut|d[ée]chets? verts/i,
  residuel: /r[ée]siduel|m[ée]nag|restm[üu]ll|rest ?offall|hausm[üu]ll|poubelle grise|graue/i,
};
// Événements d'un calendrier .ics : date + titre (+ catégories / description en secours)
function icsEvents(text) {
  return String(text || '').split(/BEGIN:VEVENT/i).slice(1).map((e) => {
    const u = e.replace(/\r?\n[ \t]/g, '');
    const d = u.match(/DTSTART[^:\n]*:(\d{4})(\d{2})(\d{2})/);
    const f = (k) => ((u.match(new RegExp('^' + k + '[^:\\n]*:(.*)$', 'im')) || [])[1] || '').replace(/\\([,;])/g, '$1').trim();
    return d ? { d: `${d[1]}-${d[2]}-${d[3]}`, name: f('SUMMARY'), cats: f('CATEGORIES'), desc: f('DESCRIPTION') } : null;
  }).filter(Boolean);
}
const classifyText = (t) => Object.keys(DECHET_KEYS).find((k) => DECHET_KEYS[k].test(t)) || null;
const classifyEvent = (e) => classifyText(e.name) || classifyText(e.cats) || classifyText(e.desc);
// Regroupe un calendrier complet de la commune par type de déchets
function icsGroups(text) {
  const g = {};
  for (const e of icsEvents(text)) {
    const cat = classifyEvent(e) || 'autre';
    const x = g[cat] || (g[cat] = { dates: new Set(), names: new Set(), by: {} });
    x.dates.add(e.d);
    if (e.name) {
      const nm = e.name.slice(0, 60);
      x.names.add(nm);
      // Nom exact de la collecte ce jour-là (ex. « Objets encombrants »), montré aux locataires si le type n'est pas reconnu
      x.by[e.d] = x.by[e.d] && !x.by[e.d].includes(nm) ? x.by[e.d] + ' + ' + nm : x.by[e.d] || nm;
    }
  }
  return Object.keys(DECHETS).filter((k) => g[k]).map((cat) => ({ cat, dates: [...g[cat].dates].sort(), names: [...g[cat].names].slice(0, 3), dnames: g[cat].by }));
}
// Noms par date pour une collecte liée à un calendrier (son type + les événements sans type reconnu)
function icsNames(text, cat) {
  const gs = icsGroups(text);
  return { ...((gs.find((x) => x.cat === 'autre') || {}).dnames || {}), ...((gs.find((x) => x.cat === cat) || {}).dnames || {}) };
}
function parseDates(text, year, cat) {
  const out = new Set();
  const src = String(text || '');
  // Calendrier .ics : si les événements portent un type de déchets, on ne garde que ceux de la collecte
  // (et ceux sans type reconnu) ; sinon toutes les dates
  if (/BEGIN:VEVENT/i.test(src)) {
    const evs = icsEvents(src);
    const typed = evs.some((e) => classifyEvent(e));
    const keep = cat && typed && DECHET_KEYS[cat] ? evs.filter((e) => { const c = classifyEvent(e); return c === cat || !c; }) : evs;
    return [...new Set(keep.map((e) => e.d))].sort();
  }
  for (const m of src.matchAll(/DTSTART[^:\n]*:(\d{4})(\d{2})(\d{2})/g)) out.add(`${m[1]}-${m[2]}-${m[3]}`);
  if (out.size) return [...out].sort();
  for (const tok of String(text || '').split(/[\s,;]+/).filter(Boolean)) {
    let m = tok.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    let d, mo, y;
    if (m) [, y, mo, d] = m;
    else if ((m = tok.match(/^(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?$/))) { [, d, mo, y] = m; y = y ? (y.length === 2 ? '20' + y : y) : year; }
    else continue;
    const dt = new Date(+y, +mo - 1, +d);
    if (dt.getMonth() === +mo - 1 && dt.getDate() === +d) out.add(isoDate(dt));
  }
  return [...out].sort();
}
const INT_GENRES = { interne: 'Ouvrier interne (salarié)', societe: 'Société externe', prive: 'Privé (travail occasionnel)' };
// heure proposée quand on touche une case vide : début du créneau, ou la fin de la maison précédente
const HOR_START = { matin: '08:00', aprem: '14:00', soir: '18:00', extra: '08:00' };
const SEMAINE = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const hm = (s) => { const m = /^(\d{1,2}):(\d{2})$/.exec(s || ''); return m ? +m[1] + +m[2] / 60 : null; };
// Heures prévues par jour de la semaine (0 = lundi)
// une ligne d'horaire sans durée (ex. 00:00–00:00) ne compte pas
document.addEventListener('input', (e) => { const w = e.target.closest && e.target.closest('.tph'); if (w) w.classList.toggle('v', !!e.target.value); }, true);
document.addEventListener('change', (e) => { const w = e.target.closest && e.target.closest('.tph'); if (w) w.classList.toggle('v', !!e.target.value); }, true);
// case photo de la chambre : aperçu tout de suite
document.addEventListener('change', (e) => {
  const sl = e.target.closest && e.target.closest('.ch-slot'), f = sl && e.target.files && e.target.files[0];
  if (!f) return;
  const old = sl.querySelector('img, .ch-empty'), img = document.createElement('img');
  img.src = URL.createObjectURL(f); img.alt = '';
  old.replaceWith(img);
}, true);
const dowOf = (iso) => (new Date(iso + 'T12:00:00').getDay() + 6) % 7;
const geoOk = (g) => g && Number.isFinite(+g.la) && Number.isFinite(+g.lo) && Math.abs(+g.la) <= 90 && Math.abs(+g.lo) <= 180;
const geoIn = (g) => (geoOk(g) ? { la: Math.round(+g.la * 1e6) / 1e6, lo: Math.round(+g.lo * 1e6) / 1e6, acc: Math.max(0, Math.min(99999, Math.round(+g.acc || 0))) } : null);
function geoFill(f, g, src, acc) {
  f.geoLa.value = g[0]; f.geoLo.value = g[1];
  let s = f.querySelector('[name=geoSrc]');
  if (!s) { s = document.createElement('input'); s.type = 'hidden'; s.name = 'geoSrc'; f.append(s); }
  s.value = src;
  const p = document.getElementById('geoNow');
  if (p) p.textContent = `✓ ${g[0]}, ${g[1]} ${src === 'ici' ? '(sur place' + (acc ? ', ±' + acc + ' m' : '') + ')' : '(OpenStreetMap)'} — touchez Enregistrer`;
}
async function osmGeo(adr, cc) {
  const q = cc || /luxemb|lëtzebuerg|deutschland|france|belgi/i.test(adr) ? adr : adr + ', Luxembourg';
  const r = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(q) + (cc ? '&countrycodes=' + String(cc).toLowerCase() : ''), { headers: { Accept: 'application/json' } });
  const j = r.ok ? await r.json() : [];
  return j && j[0] ? [Math.round(+j[0].lat * 1e6) / 1e6, Math.round(+j[0].lon * 1e6) / 1e6] : null;
}
const mondayOf = (iso) => addDays(iso, -dowOf(iso));
const placeName = (t) => (t.lieu ? `📍 ${[t.lieu.nom, t.lieu.adr].filter(Boolean).join(' — ')}` : t.dev ? `📝 ${[t.dev.client, t.dev.adr].filter(Boolean).join(' — ')}` : t.ptl ? `🏢 ${t.ptl.res}${t.ptl.adr ? ' — ' + t.ptl.adr : ''}` : [t.logId ? logName(t.logId) : 'Parties communes', immName(t.immId)].join(' · '));

// Agenda : tout ce qui se passe entre from et to (interventions + collectes), trié par jour
function agenda(from, to, immId) {
  const items = [];
  for (const t of vault.list('taches')) {
    if (immId && t.immId !== immId) continue;
    if (immGone(vault.get('immeubles', t.immId))) continue;
    if (t.recur) { for (const d of recurDates(t.date, t.recur, from, to, t.fin)) items.push({ d, kind: 'tache', t }); }
    else if (t.statut !== 'fait' && t.date) { const d0 = t.fini ? t.fini.d : t.date; items.push({ d: d0 < from ? from : d0, late: !t.fini && t.date < today(), kind: 'tache', t }); }
  }
  for (const c of vault.list('collectes')) {
    if (immId && c.immId !== immId) continue;
    if (immGone(vault.get('immeubles', c.immId))) continue;
    for (const d of collecteDates(c, from, to)) items.push({ d, kind: 'collecte', c });
  }
  return items.filter((x) => x.d <= to).sort((a, b) => a.d.localeCompare(b.d) || (a.kind === 'collecte' ? -1 : 1));
}
// ── Lien public « collectes » pour les locataires (adresse + dates, rien d'autre) ──
const pubUrl = (im) => `${location.origin}/collectes.html#${im.pubToken}`;
const qrSvg = (text, cell = 5) => { const q = qrcode(0, 'M'); q.addData(text); q.make(); return new Raw(q.createSvgTag(cell, 2)); };
function pubData(im) {
  const from = addDays(today(), -7), to = addDays(today(), 400);
  const items = vault.list('collectes').filter((c) => c.immId === im.id).sort((a, b) => Object.keys(DECHETS).indexOf(a.cat) - Object.keys(DECHETS).indexOf(b.cat))
    .map((c) => {
      const dates = collecteDates(c, from, to);
      const names = c.dnames ? Object.fromEntries(dates.filter((d) => c.dnames[d]).map((d) => [d, c.dnames[d]])) : {};
      return { cat: c.cat, sortie: c.sortie || 'veille', heure: c.heure || '', lieu: c.lieu, note: c.note || '', dates, ...(Object.keys(names).length ? { names } : {}) };
    });
  return { adresse: im.adresse, societe: societe().nom || '', tel: societe().tel || '', items };
}
// Republie la page publique d'un immeuble (ou de tous) après un changement ; silencieux hors ligne
async function publishPub(immId, loud) {
  const ims = vault.list('immeubles').filter((im) => im.pubToken && (!immId || im.id === immId));
  for (const im of ims) {
    try { await vault.publishPublic(im.pubToken, pubData(im)); } catch (e) { if (loud) toast(e.message || 'Publication impossible', { bad: true }); return false; }
  }
  return true;
}

// ───────────────────────── Espace locataire (lien personnel, contenu choisi, chiffré) ─────────────────────────
const ESP_SHOW = {
  pay: 'Paiements (mois payés / à payer, IBAN)',
  quit: 'Quittances à télécharger',
  contrat: 'Contrat (entrée, fin, loyer, révision)',
  docs: 'Son dossier : documents enregistrés (identité, CNS, caution, preuves de paiement…) avec aperçu — 👁 Privé pour en cacher un',
  coll: 'Collectes des déchets de l’immeuble',
  avis: 'Avis de l’immeuble (travaux, coupures…)',
  signal: 'Signaler un problème (avec photos)',
  edl: 'État des lieux : vos 6 photos (salle de bain, cuisine, chambre, cave, buanderie, parking) + ses photos de sortie à son départ',
  porte: 'Code de la porte (serrure à code / connectée)',
  regles: 'Règlement de la maison (à lire, avec « J’ai lu et j’accepte »)',
  chat: 'Messages de la maison (mini-chat entre habitants, lu par vous)',
};
const ESP_ALL = Object.fromEntries(Object.keys(ESP_SHOW).map((k) => [k, k !== 'porte']));
const espUrl = (l) => `${location.origin}/centrallocataires.html#${l.espace.id}.${l.espace.key}`;
const isPub = (a) => a.kind === 'pub';
const avisActifs = (immId) => vault.list('avis').filter((a) => !isPub(a) && (!a.immId || a.immId === immId) && (!a.fin || a.fin >= today()) && (!a.debut || a.debut <= addDays(today(), 60)))
  .sort((a, b) => (a.debut || '').localeCompare(b.debut || ''));
async function ownerKeys() {
  let k = vault.get('reglages', 'signal');
  if (!k || !k.pub) {
    const n = await newOwnerKeys();
    k = await vault.mutate((tx) => tx.put('reglages', { id: 'signal', ...n }), 'Clés des signalements créées', '');
  }
  return k;
}
// Code d'accès court pour l'app installée (le serveur ne garde que son empreinte + la clé enveloppée)
async function setAccessCode(l) {
  const e = l.espace;
  if (e.codeHash) await vault.espCodeDel(e.codeHash).catch(() => {});
  const code = newAccessCode();
  const h = await codeHash(code);
  await vault.espCodePut(h, { id: e.id, ...(await wrapWithCode(code, e.key)) });
  // fiche actuelle (la langue ou les rubriques ont pu changer pendant l'envoi du code)
  await vault.mutate((tx) => { const cur = vault.get('locataires', l.id); tx.put('locataires', { id: l.id, espace: { ...((cur && cur.espace) || e), code, codeHash: h } }); }, 'Code d’accès locataire créé', fullName(l), l.id);
  return code;
}
// Version du règlement (règlement général + règles propres à l'immeuble) : s'il change, chaque locataire doit l'accepter à nouveau
const RULES_V = 'r1';
function rulesVersion(im) {
  let h = 5381;
  for (const c of String((im && im.regles) || '')) h = ((h * 33) ^ c.charCodeAt(0)) >>> 0;
  return RULES_V + '-' + h.toString(36);
}
const rulesAccepted = (l) => !!(l.reglesLu && l.reglesV === rulesVersion(vault.get('immeubles', l.immId)));
const appUrl = () => `${location.origin}/centrallocataires.html`;
// Ce que le locataire voit — uniquement les rubriques cochées, uniquement ses propres données
function espaceData(l) {
  const e = l.espace, show = { ...ESP_ALL, ...(e.show || {}) };
  const g = vault.get('logements', l.logId), im = vault.get('immeubles', l.immId);
  const soc = societe();
  const out = {
    v: 1, gv: VERSION, lang: e.lang || '', prenom: l.prenom || '', nom: l.nom || '', avatar: emojiOk(l.avatar) ? l.avatar : '', photo: photoOk(l.photo) ? l.photo : '', logement: g ? logLabel(g) : '', adresse: im ? im.adresse : '', ville: im ? im.ville || '' : '', ...(im ? { pays: im.pays || societe().pays || 'LU', ...(Array.isArray(im.geo) ? { geo: im.geo } : {}) } : {}), show,
    societe: { role: socRole(), nom: soc.nom ? soc.nom : DEF_SOC(), adresse: soc.adresse || '', ville: soc.ville || '', tel: soc.tel || '', email: soc.email || '', logo: soc.logo || '', color: soc.color || '', sign: signLite.src === soc.signature && signLite.url ? signLite.url : soc.signature || '', signW: soc.signW || 8 },
    loyer: loyerAt(l, new Date().getFullYear(), new Date().getMonth() + 1) || l.loyer || 0, revis: revNext(l), parti: isGone(l) ? l.sortie : '', mail: l.mail || '',
    radio: (() => { const r = vault.get('reglages', 'radio'); return r && r.url ? { nom: r.nom || '', url: r.url } : { nom: 'Seven Radio', url: 'https://sevenradio.lu/?proradio-popup=1' }; })(),
    annex: g ? annexOf(g) : {}, annexM2: (g && g.annexM2) || {}, surface: (g && g.surface) || '', maison: g && g.type === 'maison' ? g.maison || '' : '', unit: g ? g.type : '',
  };
  if (show.pay || show.quit) {
    const cy = new Date().getFullYear();
    out.iban = show.pay && ibanOk(soc.iban) && !WRONG_ID.test(soc.iban) ? soc.iban : '';
    if (out.iban) { out.bic = soc.bic || ''; out.banque = soc.banque || ''; }
    if (show.pay) {
      const x = {};
      if (soc.paypal) x.paypal = soc.paypal;
      if (soc.cardLink) x.card = soc.cardLink;
      for (const c of ['btc', 'eth', 'usdt', 'usdc']) if (soc[c]) x[c] = { a: soc[c], n: soc[c + 'Net'] || '' };
      if (Object.keys(x).length) out.payx = x;
    }
    // tous les ans depuis l'entrée (15 ans au plus) : récapitulatif des loyers sur toute la location
    const y0 = Math.max(cy - 14, Math.min(cy - 1, +String(l.debut || '').slice(0, 4) || cy - 1));
    out.years = Array.from({ length: cy - y0 + 1 }, (_, k) => cy - k).filter((y) => MONTHS.some((_, i) => isDue(l, y, i + 1) || payment(l.id, y, i + 1))).map((y) => {
      const s = yearStats(l, y);
      return { y, rest: y >= cy - 1 ? s.rest : 0, upcoming: y >= cy - 1 ? s.upcoming : 0, paid: s.paid, months: MONTHS.map((_, i) => { const st = payState(l, y, i + 1); return [st.due, st.paid, st.p ? st.p.date || '' : '']; }) };
    });
  }
  // code de la porte : seulement s'il est actif et pas expiré (date de fin choisie dans l'app de gestion)
  if (show.porte && g && g.porte && g.porte.code && !g.porte.off && (!g.porte.fin || g.porte.fin >= today())) out.porte = { code: g.porte.code, depuis: g.porte.maj || '', info: g.porte.info || '', fin: g.porte.fin || '' };
  // garantie locative détenue par le bailleur + loyer tout compris : sur le récapitulatif des loyers du locataire
  out.inclus = soc.toutCompris !== false;
  out.logType = g ? g.type || '' : ''; // assurance habitation : conseillée (chambre) ou indispensable (studio, appartement, maison)
  if (l.caution) out.caution = { montant: l.caution, date: l.cautionDate || '', mode: CAUTION_MODES[l.cautionMode] ? l.cautionMode : '' };
  if (show.contrat) out.contrat = { debut: l.debut || '', fin: l.fin || '', revision: l.revision || '', caution: l.caution || 0, cautionDate: l.cautionDate || '', cautionMode: l.cautionMode || '' };
  if (show.docs) out.ups = vault.list('documents').filter((d) => d.locId === l.id && d.up).sort((a, b) => (b.upAt || '').localeCompare(a.upAt || '')).slice(0, 10)
    .map((d) => ({ k: d.up, dtype: d.dtype, at: d.upAt || d.date, st: d.kind === 'recu' ? 'wait' : d.kind === 'refus' ? 'ko' : 'ok', why: d.kind === 'refus' ? d.why || '' : '' }));
  if (show.docs) out.docs = vault.list('documents').filter((d) => d.locId === l.id && !d.kind).sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .map((d) => ({ id: d.id, label: d.label, dtype: d.dtype || '', pay: d.pay || '', date: d.date, mime: d.mime, size: d.size }));
  if (show.edl && g) {
    out.edl = EDL_ROOMS.map(([k]) => edlIn(g.id, k)).filter(Boolean).map((d) => ({ id: d.id, room: d.room, date: d.date }));
    out.edlOut = edlOf(g.id, 'edl-out').filter((d) => d.locId === l.id).map((d) => ({ room: d.room, date: d.date }));
  }
  if (show.coll && im) { out.coll = pubData(im).items; if (im.pubToken) out.collLink = pubUrl(im); }
  if (show.avis) out.avis = avisActifs(l.immId).map((a) => ({ texte: a.texte, debut: a.debut || '', fin: a.fin || '' }));
  if (show.regles) out.regles = { extra: (im && im.regles) || '', lu: l.reglesLu || '', lv: l.reglesV || '', v: rulesVersion(im) };
  if (show.chat && chatOn(im) && isCurrent(l)) {
    const g = (im.chats || {})[chatGroupKey(im, l)];
    if (g && g.members.includes(l.id)) {
      out.chat = { id: g.id, key: g.key, me: shortName(l), mid: l.id, solo: g.members.length < 2 };
      const ev = binRota(im, g, g.since || '2026-09-01', addDays(today(), 120));
      const gk = chatGroupKey(im, l);
      if (ev.length && g.members.length > 1) out.bins = {
        names: Object.fromEntries(g.members.map((m) => [m, shortName(vault.get('locataires', m) || {})])),
        order: (g.order || g.members).filter((id) => id && g.members.includes(id)),
        ev: ev.map((e) => ({ p: e.p, d: e.d, k: e.k, cats: e.cats })), log: ((im.binLog || {})[gk]) || {},
      };
    }
  }
  if (show.signal || show.regles || show.edl) { const k = vault.get('reglages', 'signal'); out.signalKey = k ? k.pub : ''; }
  if (show.signal) {
    out.signals = vault.list('taches').filter((t) => t.locId === l.id).sort((a, b) => (b.sentAt || b.date || '').localeCompare(a.sentAt || a.date || '')).slice(0, 20)
      .map((t) => ({ titre: t.titre.replace(/^(Signalement|Erreur signalée \(dossier \/ paiements\)) : /, ''), sent: t.sentAt || '', date: t.date || '', statut: t.statut, done: t.doneDate || '', ...(t.taxi && t.taxi.st === 'ok' ? { acc: 1 } : {}) }));
  }
  return out;
}
// ───── Messages de la maison : mini-chat des habitants d'un logement (lu et modéré par le gestionnaire) ─────
// Chaque fil a sa propre clé, donnée seulement aux habitants actuels (dans leur espace chiffré) ; quand quelqu'un
// part, on change de clé et on recopie l'historique : l'ancien habitant ne peut plus rien lire.
// Par défaut : seulement les habitants d'un même appartement (même logement, ou même « Situé dans » pour les chambres
// d'un appartement). Mettre en relation des appartements différents, c'est au gestionnaire de le choisir.
const CHAT_SCOPES = {
  partie: 'Même appartement (par défaut) : les chambres d’un même appartement en colocation discutent ensemble',
  logement: 'Même logement uniquement',
  structure: 'Toute la structure : tous les habitants ensemble (appartements différents)',
};
const chatScope = (im) => (im.chat && im.chat.scope) || 'partie';
// 💬 pourquoi la chat de la maison apparaît (ou pas) dans l'app de ce locataire : écrit dans sa fiche → 📱 Espace
function chatWhy(l, show) {
  const im = vault.get('immeubles', l.immId), g = im && (im.chats || {})[chatGroupKey(im, l)];
  const why = !show.chat ? 'la case « 💬 » ci-dessus est décochée'
    : !im ? 'aucun immeuble n’est indiqué dans sa fiche'
      : immGone(im) ? 'l’immeuble n’est plus en gestion (archivé)'
        : !chatOn(im) ? 'les « Messages de la maison » sont désactivés dans l’immeuble (Immeuble → 💬 Messages)'
          : !isCurrent(l) ? 'sa date de sortie est passée : il n’est plus locataire actuel'
            : !g || !g.members.includes(l.id) ? 'son groupe n’est pas encore créé : ouvrez l’immeuble → 💬 Messages, il se crée tout seul' : '';
  return html`<span class="tiny" style="display:block;margin-top:2px;color:${why ? 'var(--bad, #c0392b)' : 'var(--good, #15803d)'}">${why ? html`⚠️ <b>Chat de la maison absente de son app</b> : ${why}.` : html`✅ <b>Chat de la maison active</b>${g.members.length > 1 ? html` avec ${plural(g.members.length - 1, 'autre habitant')}` : ' (seul : il écrit au gestionnaire)'}.`}</span>`;
}
const chatOn = (im) => !!im && !(im.chat && im.chat.on === false) && !immGone(im);
function chatGroupKey(im, l) {
  const sc = chatScope(im), g = vault.get('logements', l.logId);
  if (g && NOT_HOME.includes(g.type)) return 'l:' + l.logId;
  if (sc === 'structure' || !l.logId) return 'all';
  if (sc === 'partie' && g && g.partie) return 'p:' + g.partie.trim().toLowerCase();
  // une chambre sans appartement indiqué : avec les autres chambres de la structure et les habitants sans logement précis
  if (sc === 'partie' && g && g.type === 'chambre') return 'all';
  return 'l:' + l.logId;
}
const chatLabel = (gk) => (gk === 'all' ? 'Toute la structure' : gk.startsWith('p:') ? (vault.list('logements').find((g) => (g.partie || '').trim().toLowerCase() === gk.slice(2)) || {}).partie || gk.slice(2) : logName(gk.slice(2)) || 'Logement');
// Appartements en colocation d'une structure : les chambres qui ont le même « Appartement » (champ partie)
function colocsOf(immId) {
  const m = new Map();
  for (const g of logsOf(immId)) { const k = (g.partie || '').trim(); if (k) { const key = k.toLowerCase(); if (!m.has(key)) m.set(key, { nom: k, logs: [] }); m.get(key).logs.push(g); } }
  return [...m.values()].sort((a, b) => a.nom.localeCompare(b.nom, 'fr', { numeric: true }));
}
const shortName = (l) => (l.prenom ? l.prenom + (l.nom ? ' ' + l.nom[0].toUpperCase() + '.' : '') : l.nom || 'Locataire');
const b64d = (x) => Uint8Array.from(atob(x), (c) => c.charCodeAt(0));
async function chatRead(g) {
  const out = [];
  for (const it of await vault.boardList(g.id)) { try { out.push({ ...(await openJson(g.key, b64d(it.d))), n: it.n }); } catch { /* illisible */ } }
  return out.sort((a, b) => (a.t || '').localeCompare(b.t || ''));
}
const chatSeenKey = (gid) => 'aresChatSeen:' + gid;
const setSeen = (gid, n) => { try { if (n) localStorage.setItem(chatSeenKey(gid), n); } catch {} };
// ───── Tour des poubelles : à tour de rôle entre les habitants d'un même fil ─────
// L'ordre suit les habitants ; quand quelqu'un part, sa place reste libre et le prochain qui arrive la prend.
function binOrder(prev, members) {
  const o = (prev || []).map((id) => (id && members.includes(id) ? id : null));
  for (const m of members) if (!o.includes(m)) { const i = o.indexOf(null); if (i >= 0) o[i] = m; else o.push(m); }
  return o;
}
const binsOn = (im) => !!im && im.bins !== false;
// Soirs (ou matins) de sortie de l'immeuble, plusieurs collectes le même soir = un seul tour
function binEvents(im, from, to) {
  const by = {};
  for (const c of vault.list('collectes').filter((x) => x.immId === im.id)) {
    for (const d of collecteDates(c, addDays(from, -1), addDays(to, 1))) {
      const p = (c.sortie || 'veille') === 'jour' ? d : addDays(d, -1);
      if (p < from || p > to) continue;
      const x = by[p] || (by[p] = { cats: new Set(), d });
      x.cats.add(c.cat);
      if (d > x.d) x.d = d; // jour du passage du camion
    }
  }
  return Object.keys(by).sort().map((p) => ({ p, d: by[p].d, cats: [...by[p].cats] }));
}
function binRota(im, g, from, to) {
  const order = (g.order || g.members).filter((id) => id && g.members.includes(id));
  if (order.length < 2 || !binsOn(im)) return [];
  const since = g.since || '2026-09-01';
  return binEvents(im, since, to).map((e, k) => ({ ...e, k, who: order[k % order.length] })).filter((e) => e.p >= from);
}
// Tours réels : oubli (personne n'a touché « Fait » avant le passage du camion) → l'oublieux fait aussi le tour suivant ;
// fait par un autre (« Je l'ai fait à sa place ») → l'autre lui rendra ce service au prochain tour de celui qui a aidé.
// Calcul partagé avec l'app des locataires : ares/binplan.js.
const binGroupPlan = (im, gk, g, msgs, to) => {
  const order = (g.order || g.members).filter((id) => id && g.members.includes(id));
  return binPlan(order, binRota(im, g, g.since || '2026-09-01', to || addDays(today(), 30)), msgs, ((im.binLog || {})[gk]) || {}, addDays(today(), -60), today());
};
// Mémorise chaque tour passé (fait / par qui / oublié) : les messages du fil s'effacent après 90 jours, le classement est annuel
async function binRecord(im, gk, g, msgs) {
  if (!binsOn(im) || msgs == null || !g || g.members.length < 2) return;
  const log = { ...(((im.binLog || {})[gk]) || {}) };
  let changed = false;
  for (const e of binGroupPlan(im, gk, g, msgs, today())) {
    if (e.d >= today() || log[e.p] || !(e.done || e.forgot)) continue;
    log[e.p] = { w: e.who, d: e.done || '', f: e.forgot ? 1 : 0 };
    changed = true;
  }
  const keepFrom = (new Date().getFullYear() - 1) + '-01-01';
  for (const k of Object.keys(log)) if (k < keepFrom) { delete log[k]; changed = true; }
  if (changed) await vault.mutate((tx) => tx.put('immeubles', { id: im.id, binLog: { ...(vault.get('immeubles', im.id).binLog || {}), [gk]: log } }), 'Tours des poubelles enregistrés', im.adresse, im.id);
}
async function binDaily() {
  let d = '';
  try { d = localStorage.getItem('aresBinDay') || ''; } catch {}
  if (d === today() || !vault.unlocked) return;
  for (const im of vault.list('immeubles').filter((x) => binsOn(x) && !x.xfer)) {
    for (const [gk, g] of Object.entries(im.chats || {})) { try { await binRecord(vault.get('immeubles', im.id), gk, g, await chatRead(g)); } catch { /* hors ligne */ } }
  }
  try { localStorage.setItem('aresBinDay', today()); } catch {}
}
const addMonths = (d, n) => { const x = new Date(d + 'T12:00'); x.setMonth(x.getMonth() + n); return x.toISOString().slice(0, 10); };
// 📦 Transfert d'immeubles (et de tout ce qui va avec) vers la centrale d'un client du réseau : copie chiffrée, rien n'est effacé ici
const bytesUrl = (b, mime) => 'data:' + (mime || 'application/octet-stream') + ';base64,' + b64big(b);
const b64big = (bytes) => { let bin = ''; const u = new Uint8Array(bytes); for (let i = 0; i < u.length; i += 0x8000) bin += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(bin); };
// 🌐 centrale d'un client : bandeau essai / lecture seule ; demandes d'intervention vers CENTRAL-OGL (chiffrées pour elle)
function tenantBanner() {
  if (tenantInfo.state === 'ro') return html`<div class="alert warn" style="margin-bottom:12px">${icon('lock')}<div><b>Lecture seule</b> — <span>la centrale ne peut pas enregistrer de modification pour le moment.</span></div></div>`;
  return '';
}
async function tenantSend(obj) {
  const k = await (await vault.call('network-key')).json();
  await vault.call('demande', { method: 'POST', body: await sealForOwner(k.pub, { client: socName(), fil: tenantInfo.fil || '', t: new Date().toISOString(), ...obj }) });
}
async function tenantRefresh() {
  if (!vault.unlocked) return;
  try { const j = await (await vault.call('tenant')).json(); if (j.tenant) { const prev = JSON.stringify(tenantInfo); tenantSave(j.tenant); if (JSON.stringify(j.tenant) !== prev) { renderShell(); go(ui.route, true); } } } catch { /* hors ligne */ }
}
// Classement de l'année : tours faits par personne, tours à rattraper
function binScores(plan, year) {
  const sc = {};
  for (const e of plan.filter((x) => x.p.startsWith(year + '-'))) {
    if (e.done) (sc[e.done] ||= { done: 0, forgot: 0 }).done++;
    if (e.forgot) (sc[e.who] ||= { done: 0, forgot: 0 }).forgot++;
  }
  return Object.entries(sc).sort((a, b) => b[1].done - a[1].done || a[1].forgot - b[1].forgot);
}

let chatBusy = false;
async function chatSync() {
  if (!vault.unlocked || chatBusy) return;
  chatBusy = true;
  try {
    for (const im of vault.list('immeubles').filter((x) => !x.xfer)) { // 📦 transféré : le fil appartient à l'autre centrale
      const cur = im.chats || {};
      const groups = {};
      if (chatOn(im)) for (const l of tenantsOfImm(im.id).filter(isCurrent)) (groups[chatGroupKey(im, l)] ||= []).push(l.id);
      // seul dans son logement (studio, garage, cave…) : le fil existe quand même, pour écrire au gestionnaire
      const next = {};
      let changed = false;
      for (const [gk, members] of Object.entries(groups)) {
        members.sort();
        const old = cur[gk];
        if (old && old.members.every((m) => members.includes(m))) {
          next[gk] = old.members.join() === members.join() && old.order && old.since ? old : { ...old, members, order: binOrder(old.order || old.members, members), since: old.since || today() };
          if (next[gk] !== old) changed = true;
          continue;
        }
        const g = { id: newEspaceId(), key: newEspaceKey(), members, order: binOrder(old ? old.order || old.members : [], members), since: (old && old.since) || today() };
        await vault.boardOn(g.id);
        if (old) {
          let last = '';
          for (const m of await chatRead(old).catch(() => [])) { const { n, ...msg } = m; last = (await (await vault.boardPost(g.id, await sealJson(g.key, msg), 'none')).json()).n || last; }
          setSeen(g.id, last);
          await vault.boardDel(old.id).catch(() => {});
        }
        next[gk] = g;
        changed = true;
      }
      for (const [gk, g] of Object.entries(cur)) {
        if (next[gk]) continue;
        const msgs = await chatRead(g).catch(() => null);
        // les tours de poubelles faits restent au classement « Locataire de l'année »
        if (msgs) await binRecord(vault.get('immeubles', im.id), gk, g, msgs).catch(() => {});
        // les habitants changent de groupe (ex. attribués à des chambres) : la conversation les suit
        const dest = Object.values(next).map((n) => ({ n, k: n.members.filter((m) => g.members.includes(m)).length })).sort((a, b) => b.k - a.k)[0];
        if (msgs && msgs.length && dest && dest.k >= 2) {
          for (const m of msgs) { const { n, ...msg } = m; await vault.boardPost(dest.n.id, await sealJson(dest.n.key, msg), 'none').catch(() => {}); }
        }
        await vault.boardDel(g.id).catch(() => {});
        changed = true;
      }
      if (changed) await vault.mutate((tx) => tx.put('immeubles', { id: im.id, chats: next }), 'Messages de la maison : habitants mis à jour', im.adresse, im.id);
    }
  } catch { /* hors ligne : on réessaiera */ }
  chatBusy = false;
}
// Nouveaux messages non lus (pour l'accueil)
async function chatPoll() {
  if (!vault.unlocked) return;
  const res = {};
  for (const im of vault.list('immeubles').filter((x) => !x.xfer)) for (const g of Object.values(im.chats || {})) { // 📦 transféré : ses messages vont à sa centrale, plus ici
    try {
      let seen = '';
      try { seen = localStorage.getItem(chatSeenKey(g.id)) || ''; } catch {}
      const raw = await chatRead(g), rs = chatResolve(raw);
      const n = rs.list.filter((m) => m.n > seen && m.m !== 'mgr' && !m.del && m.k !== 'bin').length;
      if (n) res[im.id] = (res[im.id] || 0) + n;
      await chatMarkPost(g, raw, rs, false); // ✓✓ : arrivé à la centrale
    } catch { /* hors ligne */ }
  }
  ui.chatNew = res;
  if (ui.route === 'dashboard') renderView();
}
async function chatLoad(imId, force) {
  const im = vault.get('immeubles', imId);
  if (!im || im.xfer) return; // 📦 transféré : la chat appartient à sa centrale
  ui.chatAt = ui.chatAt || {};
  ui.chatCache = ui.chatCache || {};
  if (!force && ui.chatAt[imId] && Date.now() - ui.chatAt[imId] < 15000) return;
  ui.chatAt[imId] = Date.now();
  for (const g of Object.values(im.chats || {})) {
    try { ui.chatCache[g.id] = await chatRead(g); await chatTidy(g, ui.chatCache[g.id]).then((again) => (again ? chatRead(g).then((r) => { ui.chatCache[g.id] = r; }) : 0)); binRecord(vault.get('immeubles', imId), Object.entries(im.chats || {}).find(([, x]) => x.id === g.id)?.[0], g, ui.chatCache[g.id]).catch(() => {}); } catch { ui.chatCache[g.id] = ui.chatCache[g.id] || []; }
    const c = ui.chatCache[g.id];
    if (c.length) setSeen(g.id, c.reduce((a, m) => (m.n > a ? m.n : a), ''));
    await chatViewSet(g, c).catch(() => {});
    if (ui.sheet && ui.sheet.kind === 'imm' && ui.sheet.id === imId && ui.sheet.tab === 'chat') await chatMarkPost(g, c, chatResolve(c), true).catch(() => {}); // ✓✓ bleu : lu
  }
  if (ui.chatNew) delete ui.chatNew[imId];
  const sig = JSON.stringify(Object.values(im.chats || {}).map((g) => (((ui.chatView || {})[g.id] || {}).list || []).map((m) => [m.id, m.x, m.del, m.p, m.et, m.recs.length])));
  const changed = sig !== (ui.chatSig || {})[imId];
  ui.chatSig = { ...(ui.chatSig || {}), [imId]: sig };
  if (changed && ui.sheet && ui.sheet.kind === 'imm' && ui.sheet.id === imId && ui.sheet.tab === 'chat') { ui.sheet.rendered = false; renderSheet(); }
}
// Prochains tours des poubelles d'un fil, avec qui et si c'est fait
function binsTable(im, g) {
  if (g.members.length < 2) return ''; // une seule personne : pas de tour de poubelles
  const gk = Object.entries(im.chats || {}).find(([, x]) => x.id === g.id)?.[0];
  const msgs = (ui.chatCache || {})[g.id];
  const plan = binGroupPlan(im, gk, g, msgs, addDays(today(), 21));
  const ev = plan.filter((e) => e.p >= addDays(today(), -3)).slice(0, 6);
  if (!ev.length) return '';
  const nm = (id) => shortName(vault.get('locataires', id) || {});
  const y = new Date().getFullYear();
  const sc = binScores(plan, y);
  return html`<div class="list small" style="margin-bottom:6px">${ev.map((e) => html`<div class="row"><span class="grow"><b>${fmtDay(e.p)}</b> — ${e.cats.map((c) => (DECHETS[c] || DECHETS.autre).short).join(' + ')}<span class="meta" style="display:block">tour de ${nm(e.who)}${e.extra ? ' (rattrapage)' : ''}${e.cant && !e.done ? ' · 🔁 ' + nm(e.cant) + ' ne peut pas' : ''}</span></span>
      ${e.done ? html`<span class="badge ok">✅ ${nm(e.done)}</span>` : e.forgot ? html`<span class="badge bad">❌ oublié</span>` : e.d < today() ? html`<span class="badge">…</span>` : html`<span class="badge">à venir</span>`}</div>`)}</div>
    ${sc.length ? html`<p class="tiny muted" style="margin:0 0 10px">🏆 ${y} : ${sc.map(([id, v]) => `${nm(id)} ${v.done} ✅${v.forgot ? ` · ${v.forgot} oubli${v.forgot > 1 ? 's' : ''}` : ''}`).join(' — ')}</p>` : ''}`;
}
// ✋ main rouge « stop » = message seulement entre un habitant et la centrale
const HANDR = new Raw('<svg class="hand" viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><g fill="#dc2626"><rect x="6.2" y="10.5" width="12.8" height="11.5" rx="5.2"/><rect x="6.2" y="5" width="2.9" height="10" rx="1.45"/><rect x="9.5" y="2.4" width="2.9" height="11" rx="1.45"/><rect x="12.8" y="2.9" width="2.9" height="11" rx="1.45"/><rect x="16.1" y="5.4" width="2.9" height="10" rx="1.45"/><rect x="2.6" y="10.6" width="2.9" height="8" rx="1.45" transform="rotate(-38 4 14.6)"/></g></svg>');
// Messages privés 🔒 : la centrale les ouvre avec sa clé ; ses réponses privées sont scellées pour elle et pour l'habitant
const chatOpenPriv = async (rec) => { const k = vault.get('reglages', 'signal'); return rec.o && k && k.priv ? (await openFromTenant(k.priv, unb64u(rec.o))).x : null; };
async function chatViewSet(g, raw) {
  const rs = chatResolve(raw);
  await chatOpen(rs.list, chatOpenPriv);
  const k = vault.get('reglages', 'signal');
  for (const m of rs.list) if (m.oh && k && k.priv) { try { m.hist = [...((await openFromTenant(k.priv, unb64u(m.oh))).hist || []), ...(m.hist || [])]; } catch { /* illisible */ } }
  ui.chatView = ui.chatView || {};
  ui.chatView[g.id] = rs;
  return rs;
}
// Accusé de lecture dans le fil (sans notification) : dl = reçu jusqu'au n°, rd = lu jusqu'au n° ; l'ancien accusé est effacé
async function chatMarkPost(g, raw, rs, read) {
  const top = raw.filter((m) => m.m !== 'mgr' && m.k !== 'rd').reduce((a, m) => (m.n > a ? m.n : a), '');
  if (!top) return;
  const dl = top > (rs.dl || '') ? top : rs.dl, rd = read ? top : rs.rd || '';
  if (dl === rs.dl && rd === (rs.rd || '')) return;
  await vault.boardPost(g.id, await sealJson(g.key, { k: 'rd', m: 'mgr', dl, rd, t: new Date().toISOString() }), 'none');
  for (const m of raw.filter((x) => x.k === 'rd')) await vault.boardDelMsg(g.id, m.n).catch(() => {});
}
// Rangement : un message supprimé par son auteur disparaît vraiment du fil ; un message rendu privé n'y laisse
// plus de texte lisible par les autres habitants (on le réécrit en privé, avec ses anciennes versions pour vous seul)
async function chatTidy(g, raw) {
  const k = vault.get('reglages', 'signal');
  const rs = chatResolve(raw), byN = new Map(raw.map((m) => [m.n, m]));
  let did = false;
  for (const m of rs.list) {
    if (m.del && m.m !== 'mgr') { for (const n of m.recs) await vault.boardDelMsg(g.id, n).catch(() => {}); did = true; continue; }
    if (!m.p || !k || !k.pub || !m.recs.some((n) => { const r = byN.get(n); return r && r.x != null && !r.p; })) continue;
    await chatOpen([m], chatOpenPriv);
    const hist = (m.hist || []).map((h) => ({ x: h.x, t: h.t }));
    const rec = { ...m };
    for (const f of ['recs', 'n', 'hist', 'x', 'oh']) delete rec[f];
    await vault.boardPost(g.id, await sealJson(g.key, { ...rec, oh: b64u(await sealForOwner(k.pub, { hist })) }), 'none');
    for (const r of m.recs) await vault.boardDelMsg(g.id, r).catch(() => {});
    did = true;
  }
  return did;
}
const chatBubbles = (rs, gid) => {
  const list = rs && rs.list;
  if (list == null) return html`<p class="muted small">Chargement…</p>`;
  const vis = list.filter((m) => !(m.del && m.m === 'mgr'));
  if (!vis.length) return html`<p class="muted small">Aucun message pour le moment.</p>`;
  const who = (id) => shortName(vault.get('locataires', id) || {});
  return html`${vis.map((m) => html`<div class="bub ${m.m === 'mgr' ? 'mgr' : ''} ${m.p ? 'bub-priv' : ''}"><div class="bub-h"><b>${m.m === 'mgr' ? '🛡️ Gestionnaire' : m.a}</b><span>${fmtDateTime(m.t)}</span>
    ${m.p ? html`<span class="bub-pv">${HANDR} ${m.m === 'mgr' ? 'privé — à ' + who(m.p) : 'privé'}</span>` : ''}
    ${m.m === 'mgr' ? html`<button class="bub-mn" data-action="chat-mn" data-id="${m.id}" aria-label="Options du message">⋯</button>` : html`<button class="bub-del" data-action="chat-del" data-id="${gid}" data-n="${m.recs.join(',')}" aria-label="Supprimer ce message">${icon('trash')}</button>`}</div>
    ${m.m === 'mgr' && ui.chatMn === m.id ? html`<div class="bub-menu">${editable(m) ? html`<button class="btn sm" data-action="chat-edit" data-id="${gid}" data-mid="${m.id}">✏️ Modifier</button>` : ''}<button class="btn sm danger" data-action="chat-del" data-id="${gid}" data-n="${m.recs.join(',')}">🗑️ Supprimer</button></div>` : ''}
    ${m.del || m.x == null || m.m === 'mgr' ? html`<div class="bub-x">${m.del ? html`<s>${m.x ?? ''}</s>` : m.x == null ? html`<i class="muted">🔒 illisible</i>` : m.x}</div>` : html`<div class="bub-x" data-trx="${m.x}">${m.x}</div>`}
    ${m.del ? html`<div class="bub-f">🗑️ supprimé par l’auteur</div>` : ''}
    ${m.hist && m.hist.length ? html`<details class="bub-old"><summary>modifié · voir avant</summary>${m.hist.map((h) => html`<div><span class="tiny muted">${fmtDateTime(h.t)}${h.p ? ' · 🔒' : ''}</span> ${h.x ?? '🔒'}</div>`)}</details>` : ''}
    ${m.p && m.m !== 'mgr' ? html`<button class="btn sm" style="margin-top:4px" data-action="chat-reply-priv" data-id="${gid}" data-loc="${m.p}">${HANDR} Répondre en privé</button>` : ''}</div>`)}`;
};

// « Du nouveau » pour un locataire ou l'équipe (avis, document, réponse à un signalement, nouveau travail…) :
// on compare avec la dernière publication et on envoie une notification (sans contenu) si quelque chose s'ajoute
const espNews = (d) => [
  ...(d.avis || []).map((a) => 'a:' + a.texte.slice(0, 40)), ...(d.docs || []).map((x) => 'd:' + x.id), ...(d.edl || []).map((x) => 'e:' + x.id),
  ...(d.signals || []).map((x) => 's:' + x.titre.slice(0, 30) + ':' + x.statut), ...(d.pubs || []).map((x) => 'p:' + x.id), ...(d.porte ? ['k:' + d.porte.code] : []),
];
// empreintes courtes (FNV-1a) : le navigateur ne garde pas en clair le code de porte ni les titres
const fnv = (str) => { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return (h >>> 0).toString(36); };
async function notifyNews(espId, raw) {
  const k = 'aresNews:' + espId, keys = raw.map(fnv);
  let prev = null;
  try { prev = JSON.parse(localStorage.getItem(k) || 'null'); } catch { /* stockage indisponible */ }
  if (Array.isArray(prev) && prev.some((x) => String(x).includes(':'))) prev = null; // ancien format en clair : pas de fausse « nouveauté »
  try { localStorage.setItem(k, JSON.stringify(keys)); } catch { /* stockage plein */ }
  if (Array.isArray(prev) && keys.some((x) => !prev.includes(x))) await vault.espNotify(espId).catch(() => {});
}
const espHashes = new Map(), espWarned = new Set();
// 🔄 toutes les apps (locataires, équipe) : on oublie ce qui a déjà été envoyé et on republie tout
async function appsRefreshAll() {
  espHashes.clear(); espWarned.clear();
  try { for (const k of Object.keys(localStorage)) if (k.startsWith('aresEsp:') || k.startsWith('aresNews:') === false && /^ares(Hote|Tx|Ann|Eq)/.test(k)) localStorage.removeItem(k); } catch { /* stockage */ }
  try { localStorage.removeItem('aresNetPubs2'); } catch { /* stockage */ }
  await espaceSync();
  try { localStorage.setItem('aresAppsVer', VERSION.split('.').slice(0, 2).join('.')); } catch { /* stockage */ }
  const n = vault.list('locataires').filter((x) => x.espace && x.espace.on).length;
  toast(espWarned.size ? `Apps mises à jour · ⚠️ ${espWarned.size} en erreur (voir les messages)` : `✓ Toutes les apps sont à jour (${plural(n, 'locataire')}, équipe, clients, partenaires)`, espWarned.size ? { bad: true } : {});
}
// timbre pour les apps des locataires : 1000 px de large au plus (≈ 300 dpi à 8 cm), sinon le PNG d'origine
// (photo du timbre, jusqu'à 1400 px) peut faire dépasser la taille permise et l'app n'est plus mise à jour
const signLite = { src: '', url: '' };
async function signLiteReady() {
  const src = societe().signature || '';
  if (signLite.src === src) return;
  let url = '';
  try {
    if (src) {
      const im = new Image(); im.src = src; await im.decode();
      const k = Math.min(1, 1000 / im.naturalWidth);
      if (k < 1 || src.length > 400000) {
        const c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        const u = c.toDataURL('image/png'); if (u.length < src.length) url = u;
      }
    }
  } catch { /* image illisible : on garde l'originale */ }
  Object.assign(signLite, { src, url });
}
let espTimer = null;
const scheduleEspaceSync = () => { clearTimeout(espTimer); espTimer = setTimeout(() => espaceSync(), 2500); };
async function sha256Hex(s) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map((b) => b.toString(16).padStart(2, '0')).join(''); }
// Publie (chiffré) l'espace de chaque locataire dont le contenu a changé, avec ses documents partagés
async function espaceSync(onlyId, loud) {
  if (!vault.unlocked) return true;
  await chatSync();
  await signLiteReady();
  for (const l of vault.list('locataires').filter((x) => x.espace && x.espace.on && x.espace.id && (!onlyId || x.id === onlyId))) {
    try {
      const data = espaceData(l);
      const h = await sha256Hex(JSON.stringify(data));
      let stored = espHashes.get(l.id);
      try { stored = stored || localStorage.getItem('aresEsp:' + l.espace.id); } catch {}
      if (h === stored && !loud) continue;
      const up = new Set(l.espace.docs || []);
      let docsChanged = false;
      const files = [...(data.docs || []), ...(data.edl || [])];
      for (const d of files) if (!up.has(d.id)) { await vault.espacePut(l.espace.id, await sealBytes(l.espace.key, await vault.readFile(d.id)), d.id); up.add(d.id); docsChanged = true; }
      for (const id of [...up]) if (!files.some((d) => d.id === id)) { await vault.espaceDel(l.espace.id, id).catch(() => {}); up.delete(id); docsChanged = true; }
      await vault.espacePut(l.espace.id, await sealJson(l.espace.key, data));
      espHashes.set(l.id, h);
      await notifyNews(l.espace.id, espNews(data));
      try { localStorage.setItem('aresEsp:' + l.espace.id, h); } catch {}
      // on repart de la fiche actuelle : la langue, le code ou les rubriques ont pu changer pendant la publication
      if (docsChanged) await vault.mutate((tx) => { const cur = vault.get('locataires', l.id); if (cur && cur.espace) tx.put('locataires', { id: l.id, espace: { ...cur.espace, docs: [...up] } }); }, 'Espace locataire : documents', fullName(l), l.id);
    } catch (e) {
      if (loud) { toast(e.message || 'Publication impossible (connexion ?)', { bad: true }); return false; }
      // en arrière-plan : on le dit une fois (sinon l'app du locataire reste sur l'ancienne version sans que personne le sache)
      if (navigator.onLine && !espWarned.has(l.id)) { espWarned.add(l.id); toast(e.message === 'session-taken' ? `App de ${fullName(l)} pas mise à jour : cette centrale est ouverte sur un autre appareil${e.info && e.info.device ? ' (' + e.info.device + ')' : ''}. Un seul appareil à la fois peut enregistrer : fermez-la là-bas, puis rechargez cette page.` : `App de ${fullName(l)} pas mise à jour : ${e.message || 'erreur'}`, { bad: true }); }
    }
  }
  return true;
}
// Signalements envoyés par les locataires → travaux dans Maintenance (+ photos dans la fiche du locataire)
let inboxBusy = false;
async function inboxSync() {
  const keys = vault.get('reglages', 'signal');
  if (!keys || !keys.priv || inboxBusy || !vault.unlocked) return;
  inboxBusy = true;
  let n = 0;
  try {
    for (const it of await vault.inboxList()) try {
      let msg;
      try { msg = await openFromTenant(keys.priv, await vault.inboxGet(it.name)); } catch { continue; }
      const l = vault.list('locataires').find((x) => x.espace && x.espace.id && x.espace.id === msg.espace && x.espace.id.startsWith(it.name.split('-')[1] || '-'));
      if (!l || !l.espace.on) { await vault.inboxDel(it.name); continue; }
      if (msg.type === 'paye') {
        const vir = { t: String(msg.t || new Date().toISOString()).slice(0, 30), montant: Math.max(0, +msg.montant || 0), ref: String(msg.ref || '').slice(0, 140), via: own(PAY_VIA, msg.via) ? msg.via : 'vir' };
        await vault.mutate((tx) => tx.put('locataires', { id: l.id, virSignal: vir }), 'Virement signalé par le locataire', `${fullName(l)} — ${money(vir.montant)}`, l.id);
        await vault.inboxDel(it.name);
        n++;
        continue;
      }
      if (msg.type === 'photo') {
        if (photoOk(msg.d) || msg.d === '') await vault.mutate((tx) => tx.put('locataires', { id: l.id, photo: msg.d }), msg.d ? 'Photo de profil du locataire' : 'Photo de profil retirée', fullName(l), l.id);
        await vault.inboxDel(it.name);
        continue;
      }
      if (msg.type === 'avatar') {
        if (emojiOk(msg.e)) await vault.mutate((tx) => tx.put('locataires', { id: l.id, avatar: msg.e }), 'Icône choisie par le locataire', `${fullName(l)} ${msg.e}`, l.id);
        await vault.inboxDel(it.name);
        continue;
      }
      if (msg.type === 'regles') {
        await vault.mutate((tx) => tx.put('locataires', { id: l.id, reglesLu: String(msg.t || '').slice(0, 10) || today(), reglesV: String(msg.v || '').slice(0, 40) }), 'Règlement de la maison accepté', fullName(l), l.id);
        await vault.inboxDel(it.name);
        continue;
      }
      if (msg.type === 'menage-eval') { await vault.inboxDel(it.name); continue; } // ancienne app : avis sur un passage (plus utilisé)
      if (msg.type === 'doc-up') {
        // 📤 document envoyé depuis l'app du locataire : à vérifier (✅ ranger dans le dossier / ❌ refuser avec le motif)
        const b = typeof msg.b === 'string' && msg.b.length < 12e6 ? msg.b : '', pdf = msg.mime === 'application/pdf';
        if (b && own(DOC_TYPES, msg.dtype) && (pdf || msg.mime === 'image/jpeg') && !vault.list('documents').some((x) => x.up === msg.k)) {
          let doc;
          await vault.mutate((tx) => { doc = tx.put('documents', { locId: l.id, kind: 'recu', up: String(msg.k || '').slice(0, 40), upAt: String(msg.t || '').slice(0, 30), st: 'wait', dtype: msg.dtype, label: DOC_TYPES[msg.dtype].replace(/ \(.*\)$/, ''), name: String(msg.name || '').slice(0, 80), date: String(msg.t || '').slice(0, 10) || today(), mime: pdf ? 'application/pdf' : 'image/jpeg', size: Math.round(b.length * 0.75) }); }, 'Document reçu du locataire (à vérifier)', `${fullName(l)} — ${DOC_TYPES[msg.dtype]}`, l.id);
          await vault.saveFile(doc.id, unb64u(b));
          n++;
        }
        await vault.inboxDel(it.name);
        continue;
      }
      if (msg.type === 'edl-out') {
        // Photos de sortie du locataire (une par pièce ; une nouvelle remplace la précédente de la même pièce)
        const g = vault.get('logements', l.logId);
        const ph = (Array.isArray(msg.photos) ? msg.photos : []).filter((x) => x && own(EDL_ROOM, x.room) && typeof x.b === 'string' && x.b.length < 4e6).slice(0, EDL_ROOMS.length);
        if (g && ph.length) {
          const olds = edlOf(g.id, 'edl-out').filter((d) => ph.some((x) => x.room === d.room));
          const files = [];
          await vault.mutate((tx) => {
            for (const d of olds) tx.remove('documents', d.id);
            for (const x of ph) { const doc = tx.put('documents', { logId: g.id, locId: l.id, room: x.room, kind: 'edl-out', label: `Sortie — ${EDL_ROOM[x.room].replace(/^\S+ /, '')} (${fullName(l)})`, date: String(msg.t || '').slice(0, 10) || today(), mime: 'image/jpeg', size: Math.round(x.b.length * 0.75) }); files.push([doc.id, x.b]); }
          }, 'Photos de sortie reçues', `${fullName(l)} — ${plural(ph.length, 'photo')}`, l.id);
          for (const [id, b] of files) await vault.saveFile(id, unb64u(b));
          for (const d of olds) { await vault.deleteFile(d.id).catch(() => {}); dropEdlUrl(d.id); }
          n++;
        }
        await vault.inboxDel(it.name);
        continue;
      }
      const titre = String(msg.titre || msg.texte || 'Problème').slice(0, 80);
      await vault.mutate((tx) => {
        const t = tx.put('taches', {
          type: msg.type === 'menage' ? 'nettoyage' : msg.type === 'dossier' || msg.type === 'autre' ? 'autre' : 'reparation', titre: (msg.type === 'dossier' ? 'Erreur signalée (dossier / paiements) : ' : 'Signalement : ') + titre, immId: l.immId, logId: l.logId || '', locId: l.id, intervenantId: '',
          date: today(), recur: '', statut: 'afaire', sentAt: msg.t || new Date().toISOString(),
          note: `${String(msg.texte || '').slice(0, 3000)}\n\n— Envoyé par ${fullName(l)} le ${fmtDateTime(msg.t || Date.now())}${msg.tel ? ' · tél. ' + String(msg.tel).slice(0, 30) : ''}${msg.dispo ? '\nDisponibilités : ' + String(msg.dispo).slice(0, 200) : ''}`,
        });
        (msg.photos || []).slice(0, 3).forEach((_, i) => tx.put('documents', { id: t.id + 'p' + i, locId: l.id, tacheId: t.id, kind: 'signal', label: `Signalement — photo ${i + 1}`, date: today(), mime: 'image/jpeg', size: Math.round(String(msg.photos[i]).length * 0.75) }));
        return t;
      }, 'Signalement reçu', `${fullName(l)} — ${titre}`, l.id).then(async (t) => {
        for (let i = 0; i < Math.min(3, (msg.photos || []).length); i++) await vault.saveFile(t.id + 'p' + i, unb64u(msg.photos[i]));
      });
      await vault.inboxDel(it.name);
      n++;
    } catch (er) {
      // un message mal formé ne doit pas bloquer les suivants : au 3e échec (en ligne), il est écarté
      if (!navigator.onLine) break;
      let f = {}; try { f = JSON.parse(localStorage.getItem('aresInboxFail') || '{}'); } catch { /* stockage indisponible */ }
      f[it.name] = (f[it.name] || 0) + 1;
      if (f[it.name] >= 3) { await vault.inboxDel(it.name).catch(() => {}); delete f[it.name]; console.warn('message écarté', it.name, er); }
      try { localStorage.setItem('aresInboxFail', JSON.stringify(f)); } catch { /* stockage plein */ }
    }
  } catch { /* hors ligne : on réessaiera */ }
  inboxBusy = false;
  if (n) toast(`📩 ${plural(n, 'message')} de locataire reçu${n > 1 ? 's' : ''} — voir l'accueil`);
}

// Messages envoyés par les locataires depuis leur app, pas encore ouverts dans Ares
// 📣 Annonce de la centrale : un seul message, envoyé dans la chat de chacun (habitants, équipe, clients du réseau)
// et dans la boîte chiffrée des clients du réseau (qui peuvent le transférer aux leurs)
// Plan du nettoyage : ce qui est ⭐ (ou lié à du ⭐) reste, le reste part
function testPlan() {
  const L = (c) => vault.list(c), keepImm = new Set(), keepLog = new Set(), keepLoc = new Set(), keepW = new Set();
  for (const im of L('immeubles')) if (im.vrai) keepImm.add(im.id);
  for (const l of L('locataires')) if (l.vrai) { keepLoc.add(l.id); if (l.immId) keepImm.add(l.immId); if (l.logId) keepLog.add(l.logId); }
  for (const w of L('intervenants')) if (w.vrai) keepW.add(w.id);
  for (const g of L('logements')) if (keepImm.has(g.immId)) keepLog.add(g.id);
  const tKeep = (t) => keepImm.has(t.immId) || keepLoc.has(t.locId) || keepW.has(t.intervenantId) || (!t.immId && !t.locId && !t.intervenantId);
  const del = {
    immeubles: L('immeubles').filter((x) => !keepImm.has(x.id)),
    logements: L('logements').filter((x) => !keepLog.has(x.id) && !keepImm.has(x.immId)),
    locataires: L('locataires').filter((x) => !keepLoc.has(x.id)),
    intervenants: L('intervenants').filter((x) => !keepW.has(x.id)),
    hotes: L('hotes').filter((x) => !x.vrai),
    paiements: L('paiements').filter((x) => x.locId && !keepLoc.has(x.locId)),
    documents: L('documents').filter((x) => (x.locId || x.immId || x.intervId) && !keepLoc.has(x.locId) && !keepImm.has(x.immId) && !keepW.has(x.intervId)),
    taches: L('taches').filter((x) => !tKeep(x)),
    collectes: L('collectes').filter((x) => x.immId && !keepImm.has(x.immId)),
    depenses: L('depenses').filter((x) => x.immId && !keepImm.has(x.immId)),
  };
  del.total = Object.values(del).reduce((a, v) => a + (Array.isArray(v) ? v.length : 0), 0);
  const keep = { immeubles: L('immeubles').filter((x) => keepImm.has(x.id)), locataires: L('locataires').filter((x) => keepLoc.has(x.id)), intervenants: L('intervenants').filter((x) => keepW.has(x.id)), hotes: L('hotes').filter((x) => x.vrai) };
  keep.total = keep.immeubles.length + keep.locataires.length + keep.intervenants.length + keep.hotes.length;
  return { del, keep };
}
// ⭐ « Vrai — à conserver » : posé à la main sur les vraies fiches ; « 🧹 Supprimer les données de test » ne touche jamais
// à une fiche ⭐ ni à ce qui en dépend (son logement, son immeuble, ses paiements, documents, travaux).
// Chaque personne (locataire, ouvrier, client) se marque une à une : un faux locataire dans un vrai immeuble part.
const vraiBtn = (c, r) => (r && r.id ? html`<button type="button" class="vrai ${r.vrai ? 'on' : ''}" data-action="vrai-tog" data-c="${c}" data-id="${r.id}" title="⭐ Vrai — à conserver">${r.vrai ? '⭐ Vrai' : '☆ Test ?'}</button>` : '');
const annLog = () => (vault.get('reglages', 'annLog') || {}).list || [];
// 🎧 Centralino : tous les messages reçus, par catégorie, avec un lien direct vers la conversation
function centralinoHtml() {
  const sig = newSignals();
  const imms = vault.list('immeubles').filter((im) => Object.keys(im.chats || {}).length && !immGone(im) && !im.xfer);
  const houseN = (im) => (ui.chatNew || {})[im.id] || 0;
  const eqs = vault.list('intervenants').filter((i) => !i.archive && ((i.chat || []).length || (i.espace && i.espace.on)))
    .map((i) => ({ i, last: (i.chat || []).filter((m) => !m.del).slice(-1)[0] }))
    .sort((a, b) => (b.i.chatNew || 0) - (a.i.chatNew || 0) || ((b.last || {}).at || '').localeCompare((a.last || {}).at || ''));
  const nHouse = imms.reduce((a, im) => a + houseN(im), 0), nEq = eqs.reduce((a, e) => a + (e.i.chatNew || 0), 0), tot = sig.length + nHouse + nEq;
  const open = ui.centOpen ?? tot > 0;
  const badge = (n) => (n ? html`<span class="badge bad">${n}</span>` : '');
  const row = (action, id, title, sub, n) => html`<button class="row" data-action="${action}" data-id="${id}"><span class="grow"><span class="title" style="display:block">${title}</span><span class="meta">${sub}</span></span>${badge(n)}</button>`;
  const recv = [];
  const nRecv = recv.filter((r) => !r.vu).length, tot2 = tot + nRecv;
  // la lumière suit l'horloge : quand l'accueil se redessine, elle continue sans repartir de zéro (pas de sautillement)
  return html`<details class="card centralino${tot2 ? ' cent-new' : ''}" ${open || nRecv ? new Raw('open') : ''} style="margin-bottom:14px;animation-delay:-${Date.now() % (tot2 ? 1600 : 3200)}ms">
  <summary data-action="cent-tog"><span class="cent-ic">${icon('headset')}</span><b>Centralino</b><span class="grow"></span>${tot2 ? html`<span class="badge bad">${tot2} nouveau${tot2 > 1 ? 'x' : ''}</span>` : html`<span class="muted small">rien de nouveau</span>`}</summary>
  <p style="margin:10px 0 0"><button class="btn primary sm" data-action="ann-new">📣 Annonce</button>${annLog().length ? html` <button class="btn sm" data-action="ann-log">🗂️ Annonces envoyées (${annLog().length})</button>` : ''}</p>
  ${recv.length ? html`<details class="cent-sec gfold" data-gk="cent|recv" ${foldIsOpen('cent|recv') ? new Raw('open') : ''}><summary>📣 Annonces reçues de la centrale ${badge(nRecv)}</summary><div class="list">${recv.map((r) => html`<div class="row" style="align-items:flex-start"><span class="grow"><span class="title" style="display:block;white-space:pre-wrap">${r.x}</span><span class="meta">${r.from || ''} · ${fmtDateTime(r.at)}</span></span><span style="display:flex;flex-direction:column;gap:6px"><button class="btn sm primary" data-action="ann-fwd" data-id="${r.id}">↪️ Transférer aux miens</button>${r.vu ? '' : html`<button class="btn sm" data-action="ann-vu" data-id="${r.id}">✓ Lu</button>`}</span></div>`)}</div></details>` : ''}
  <details class="cent-sec gfold" data-gk="cent|sig" ${foldIsOpen('cent|sig') ? new Raw('open') : ''}><summary>📩 Signalements des locataires ${badge(sig.length)}</summary>
  ${sig.length ? html`<div class="list">${sig.slice(0, 8).map((t) => { const l = vault.get('locataires', t.locId) || {}, w = null; return row('open-signal', t.id, html`${fullName(l)} — ${t.titre.replace(/^Signalement : /, '')}`, `${logName(l.logId) || immName(t.immId)} · ${fmtDateTime(t.sentAt)}`, 0); })}</div>` : html`<p class="small muted">Aucun nouveau signalement.</p>`}</details>
  <details class="cent-sec gfold" data-gk="cent|loc" ${foldIsOpen('cent|loc') ? new Raw('open') : ''}><summary>🏠 Messages des Locataires ${badge(nHouse)}</summary>
  ${imms.length ? html`<div class="list">${imms.map((im) => row('open-chat', im.id, immName(im.id), houseN(im) ? `${houseN(im)} nouveau${houseN(im) > 1 ? 'x messages' : ' message'} — touchez pour lire` : `${plural(Object.keys(im.chats || {}).length, 'fil')} · touchez pour ouvrir`, houseN(im)))}</div>` : html`<p class="small muted">Aucun fil de messages entre habitants.</p>`}</details>
  `;
}
const newSignals = () => vault.list('taches').filter((t) => t.sentAt && !t.vu).sort((a, b) => (b.sentAt || '').localeCompare(a.sentAt || ''));
const signalPhotos = (t) => vault.list('documents').filter((x) => x.tacheId === t.id).length;
const byAddr = (a, b) => (a.adresse || '').localeCompare(b.adresse || '', 'fr');
const byLogName = (a, b) => (a.nom || '').localeCompare(b.nom || '', 'fr', { numeric: true });
const byDebut = (a, b) => (a.debut || '').localeCompare(b.debut || '');
const ym = (y, m) => y * 12 + (m - 1);
const ymOf = (s) => { const [y, m] = String(s).split('-'); return +y * 12 + (+m - 1); };
const addDays = (s, n) => { const d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + n); return isoDate(d); };
const nowYm = () => { const d = new Date(); return d.getFullYear() * 12 + d.getMonth(); };
// Message d'invitation (WhatsApp / SMS / email) dans la langue choisie pour la personne (français par défaut)
const INVITE = {
  loc: {
    fr: { subj: 'Votre espace locataire', txt: (p, app, code, url, soc) => `Bonjour ${p}, voici votre app des locataires ${soc} (loyers, quittances, documents, collectes, signaler un problème).\n1) Ouvrez : ${app}\n2) Ajoutez-la à votre écran d'accueil\n3) Votre code d'accès personnel : ${code}\nOu ouvrez directement : ${url}\nCe code est personnel, ne le partagez pas.` },
    it: { subj: 'Il tuo spazio inquilino', txt: (p, app, code, url, soc) => `Buongiorno ${p}, ecco la tua app degli inquilini ${soc} (affitti, ricevute, documenti, raccolta rifiuti, segnalare un problema).\n1) Apri: ${app}\n2) Aggiungila alla schermata Home\n3) Il tuo codice d'accesso personale: ${code}\nOppure apri direttamente: ${url}\nQuesto codice è personale, non condividerlo.` },
    de: { subj: 'Ihr Mieterbereich', txt: (p, app, code, url, soc) => `Hallo ${p}, hier ist Ihre Mieter-App von ${soc} (Mieten, Quittungen, Dokumente, Müllabfuhr, Problem melden).\n1) Öffnen Sie: ${app}\n2) Legen Sie sie auf Ihren Startbildschirm\n3) Ihr persönlicher Zugangscode: ${code}\nOder direkt öffnen: ${url}\nDieser Code ist persönlich, bitte nicht weitergeben.` },
    pt: { subj: 'O seu espaço de inquilino', txt: (p, app, code, url, soc) => `Olá ${p}, aqui está a sua app dos inquilinos ${soc} (rendas, recibos, documentos, recolhas do lixo, comunicar um problema).\n1) Abra: ${app}\n2) Adicione-a ao ecrã principal\n3) O seu código de acesso pessoal: ${code}\nOu abra diretamente: ${url}\nEste código é pessoal, não o partilhe.` },
    en: { subj: 'Your tenant space', txt: (p, app, code, url, soc) => `Hello ${p}, here is your ${soc} tenants app (rent, receipts, documents, waste collection, report a problem).\n1) Open: ${app}\n2) Add it to your home screen\n3) Your personal access code: ${code}\nOr open directly: ${url}\nThis code is personal, do not share it.` },
    es: { subj: 'Tu espacio de inquilino', txt: (p, app, code, url, soc) => `Hola ${p}, aquí tienes tu app de inquilinos de ${soc} (alquileres, recibos, documentos, recogida de basura, avisar de un problema).\n1) Abre: ${app}\n2) Añádela a tu pantalla de inicio\n3) Tu código de acceso personal: ${code}\nO abre directamente: ${url}\nEste código es personal, no lo compartas.` },
  },
  eq: {
    fr: { subj: 'Votre app de travail', txt: (p, app, code, url, soc) => `Bonjour ${p}, voici votre app de travail ${soc} (planning, interventions, absences).\n1) Ouvrez : ${app}\n2) Ajoutez-la à votre écran d'accueil\n3) Votre code personnel : ${code}\nOu ouvrez directement : ${url}` },
    it: { subj: 'La tua app di lavoro', txt: (p, app, code, url, soc) => `Buongiorno ${p}, ecco la tua app di lavoro ${soc} (planning, interventi, assenze).\n1) Apri: ${app}\n2) Aggiungila alla schermata Home\n3) Il tuo codice personale: ${code}\nOppure apri direttamente: ${url}` },
    de: { subj: 'Ihre Arbeits-App', txt: (p, app, code, url, soc) => `Hallo ${p}, hier ist Ihre Arbeits-App von ${soc} (Planung, Einsätze, Abwesenheiten).\n1) Öffnen Sie: ${app}\n2) Legen Sie sie auf Ihren Startbildschirm\n3) Ihr persönlicher Code: ${code}\nOder direkt öffnen: ${url}` },
    pt: { subj: 'A sua app de trabalho', txt: (p, app, code, url, soc) => `Olá ${p}, aqui está a sua app de trabalho ${soc} (planeamento, intervenções, ausências).\n1) Abra: ${app}\n2) Adicione-a ao ecrã principal\n3) O seu código pessoal: ${code}\nOu abra diretamente: ${url}` },
    en: { subj: 'Your work app', txt: (p, app, code, url, soc) => `Hello ${p}, here is your ${soc} work app (schedule, jobs, absences).\n1) Open: ${app}\n2) Add it to your home screen\n3) Your personal code: ${code}\nOr open directly: ${url}` },
    es: { subj: 'Tu app de trabajo', txt: (p, app, code, url, soc) => `Hola ${p}, aquí tienes tu app de trabajo de ${soc} (planificación, intervenciones, ausencias).\n1) Abre: ${app}\n2) Añádela a tu pantalla de inicio\n3) Tu código personal: ${code}\nO abre directamente: ${url}` },
  },
};
const inviteMsg = (kind, lang, ...a) => { const t = INVITE[kind][lang] || INVITE[kind].fr; return { subj: t.subj, txt: t.txt(...a) }; };

// clé envoyée par un locataire / un ouvrier : seulement une vraie entrée de la liste
const own = (o, k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);
// CSV : une cellule texte qui commence par = + - @ deviendrait une formule dans Excel → précédée d'une apostrophe (les nombres restent des nombres)
const csvSafe = (v) => { const s = String(v ?? ''); return /^[=+\-@\t\r]/.test(s) && !/^-?\d+([.,]\d+)?$/.test(s) ? "'" + s : s; };
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

// Loyer applicable à un mois donné (tient compte des révisions : l.loyerHist = [{ from, loyer, prev }])
const histSorted = new WeakMap(); // l'historique trié une seule fois (et non à chaque mois affiché)
function loyerAt(l, y, m) {
  const raw = l.loyerHist || [];
  let hist = histSorted.get(raw);
  if (!hist) { hist = [...raw].sort((a, b) => a.from.localeCompare(b.from)); if (raw.length) histSorted.set(raw, hist); }
  if (!hist.length) return l.loyer || 0;
  let v = hist[0].prev != null ? hist[0].prev : l.loyer;
  for (const h of hist) if (ym(y, m) >= ymOf(h.from)) v = h.loyer;
  return v || 0;
}
// 🔄 Révision annoncée : prochaine hausse enregistrée (date future) — { from, ancien, nouveau }
const revNext = (l) => { const h = (l.loyerHist || []).filter((x) => x.from > today()).sort((a, b) => a.from.localeCompare(b.from))[0]; return h ? { from: h.from, ancien: h.prev != null ? h.prev : loyerAt(l, new Date().getFullYear(), new Date().getMonth() + 1), nouveau: h.loyer } : null; };
function revLetter(id) {
  const l = vault.get('locataires', id), r = l && revNext(l);
  if (!r) return toast('Aucune révision future enregistrée (bouton « Réviser le loyer »)', { bad: true });
  const ln = '_______________________________';
  printDoc('Avis de révision du loyer', html`<div style="font-size:12pt;line-height:1.55">
    <p style="text-align:right">${socName()}<br>${[societe().adresse, societe().ville].filter(Boolean).join(', ')}</p>
    <p><b>À l’attention de :</b> ${fullName(l)}<br>${whereOf(l)}</p>
    <p><b>Objet :</b> révision du loyer</p>
    <p>Madame, Monsieur,</p>
    <p>Nous vous informons que le loyer de votre logement est révisé à partir du <b>${fmtDate(r.from)}</b> :</p>
    <table style="border-collapse:collapse;margin:8px 0 14px"><tr><td style="padding:4px 18px 4px 0">Loyer actuel</td><td style="text-align:right"><b>${money(r.ancien)}</b> / mois</td></tr>
      <tr><td style="padding:4px 18px 4px 0">Nouveau loyer</td><td style="text-align:right"><b>${money(r.nouveau)}</b> / mois</td></tr>
      <tr><td style="padding:4px 18px 4px 0">Différence</td><td style="text-align:right">${r.nouveau >= r.ancien ? '+' : ''}${money(r.nouveau - r.ancien)} / mois</td></tr></table>
    <p>Les autres conditions de votre contrat restent inchangées. Le nouveau montant apparaît aussi dans votre app.</p>
    <p style="margin-top:18px">Fait à ${ln}, le ${fmtDate(today())}</p>
    <p>Pour ${socName()} : ${ln}</p>
    <div style="border:1.5px solid #333;border-radius:8px;padding:10px 14px;margin-top:22px"><p style="margin:0 0 6px"><b>Bien reçu — le locataire</b></p>
      <p style="margin:6px 0">Nom : ${fullName(l)}</p><p style="margin:6px 0">Date : ${ln}</p><p style="margin:6px 0">Signature : ${ln}</p></div></div>`, true);
}
const dueAmount = (l, y, m) => (isDue(l, y, m) ? loyerAt(l, y, m) : 0);
const paidAmount = (p, l) => (p.montant != null ? p.montant : loyerAt(l, p.y, p.m)) || 0;
// État d'un mois : payé en entier, partiellement, ou pas du tout
function payState(l, y, m) {
  const p = payment(l.id, y, m);
  const due = dueAmount(l, y, m);
  const paid = p ? paidAmount(p, l) : 0;
  const rest = Math.max(0, due - paid);
  return { p, due, paid, rest, state: !p ? 'none' : rest > 0.009 ? 'part' : 'paid' };
}
// paiements groupés par locataire : un index reconstruit seulement quand les données changent
let payIdx = null, payIdxOf = null, payIdxRev = -1;
const paysOf = (locId) => {
  if (!payIdx || payIdxOf !== vault.state.paiements || payIdxRev !== vault.rev) {
    payIdx = new Map();
    for (const p of vault.list('paiements')) { const a = payIdx.get(p.locId); if (a) a.push(p); else payIdx.set(p.locId, [p]); }
    payIdxOf = vault.state.paiements; payIdxRev = vault.rev;
  }
  return (payIdx.get(locId) || []).slice();
};
const totalPaid = (l) => paysOf(l.id).reduce((a, p) => a + paidAmount(p, l), 0);

// Mois échus (avant le mois en cours) non payés ou payés en partie
function lateMonths(l, ref = new Date()) {
  const y = ref.getFullYear();
  const out = [];
  for (let m = 1; m < ref.getMonth() + 1; m++) if (isDue(l, y, m) && payState(l, y, m).rest > 0.009) out.push(m);
  return out;
}
function daysUntil(date) {
  if (!date) return null;
  return Math.round((new Date(date + 'T00:00:00') - new Date(today() + 'T00:00:00')) / 86400000);
}
const daysToEnd = (l) => daysUntil(l.fin);
// Bilan annuel d'un locataire.
//   due      = loyers de toute l'année (contrat)      dueNow = loyers échus à ce jour (jusqu'au mois en cours)
//   paid     = tout ce qui a été encaissé             rest   = impayés à ce jour (mois échus non ou mal payés)
//   upcoming = loyers des mois à venir pas encore payés
// Un paiement en avance ou hors contrat ne compense jamais un mois impayé.
function yearStats(l, y) {
  const elapsed = monthsElapsed(y);
  let due = 0, dueNow = 0, paid = 0, rest = 0, upcoming = 0;
  for (let m = 1; m <= 12; m++) {
    const st = payState(l, y, m);
    due += st.due;
    paid += st.paid;
    if (m <= elapsed) { dueNow += st.due; rest += st.rest; } else upcoming += st.rest;
  }
  return { due, dueNow, paid, rest, upcoming, collected: dueNow - rest };
}
// Paiements enregistrés sur des mois hors des dates du contrat (avant l'entrée, après la fin ou la sortie)
const outsidePays = (l) => paysOf(l.id).filter((p) => !isDue(l, p.y, p.m)).sort((a, b) => ym(a.y, a.m) - ym(b.y, b.m));
const firstDay = (y, m) => `${y}-${String(m).padStart(2, '0')}-01`;
const lastDay = (y, m) => `${y}-${String(m).padStart(2, '0')}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`;
// Corrections de dates qui rendraient ces paiements conformes au contrat
function datesFix(l, pays = outsidePays(l)) {
  const fix = {};
  const before = pays.filter((p) => l.debut && ym(p.y, p.m) < ymOf(l.debut));
  if (before.length) fix.debut = firstDay(before[0].y, before[0].m);
  const after = pays.filter((p) => l.fin && ym(p.y, p.m) > ymOf(l.fin) && !(l.sortie && ym(p.y, p.m) > ymOf(l.sortie)));
  if (after.length) fix.fin = lastDay(after[after.length - 1].y, after[after.length - 1].m);
  const afterExit = pays.filter((p) => l.sortie && ym(p.y, p.m) > ymOf(l.sortie));
  return { fix, afterExit };
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

// Bail principal : loyer versé au bailleur
const ownerRent = (im) => (im.loyer || 0) + (im.charges || 0);
function isOwnerDue(im, y, m) {
  if (!ownerRent(im)) return false;
  const k = ym(y, m);
  if (im.bailDebut && k < ymOf(im.bailDebut)) return false;
  if (im.bailFin && k > ymOf(im.bailFin)) return false;
  return true;
}
const versement = (immId, y, m) => vault.get('versements', payKey(immId, y, m));
// 📅 Bail principal (vous êtes locataire principal, le bailleur est le propriétaire) : fin proche et préavis
const isBailPrincipal = (im) => !!(im && (im.proprietaire || ownerRent(im))) && !immGone(im);
const BAIL_DEC = { '': 'À décider', renouv: 'Nous renouvelons', stop: 'Nous ne renouvelons pas', ok: 'Réponse du bailleur reçue' };
function bailAlert(im) {
  if (!isBailPrincipal(im) || !im.bailFin || im.bailDec === 'ok') return null;
  const left = daysUntil(im.bailFin);
  if (left == null || left < -30 || left > 183) return null; // de 6 mois avant à 1 mois après
  const pm = num(im.preavis) || 0, lim = pm ? addMonths(im.bailFin, -pm) : '';
  return { left, pm, lim, limLeft: lim ? daysUntil(lim) : null };
}
// 💶 Rentabilité du mois : loyers des locataires actuels − loyer et charges au bailleur − dépenses de l'année réparties par mois
function rentaMois(im) {
  const now = new Date(), y = now.getFullYear(), m = now.getMonth() + 1;
  const locs = tenantsOfImm(im.id).filter((l) => isCurrent(l) && !isFuture(l));
  const loyers = sum(locs, (l) => loyerAt(l, y, m)), bail = ownerRent(im), dep = Math.round(sum(depensesOf(im.id, y), (d) => d.montant) / m);
  const vides = logsOf(im.id).filter((g) => !occupantsNow(g.id).length).length;
  return { loyers, bail, dep, net: loyers - bail - dep, nLocs: locs.length, vides };
}
const rentaLine = (r) => html`<span class="num">${money(r.loyers)}</span> − <span class="num">${money(r.bail)}</span>${r.dep ? html` − <span class="num">${money(r.dep)}</span>` : ''} = <b class="num ${r.net < 0 ? 'red' : 'green'}">${r.net < 0 ? '🔴' : '🟢'} ${r.net >= 0 ? '+' : ''}${money(r.net)} / mois</b>`;
function bailLetter(id) {
  const im = vault.get('immeubles', id);
  if (!im) return;
  const box = (t) => html`<p style="margin:6px 0">☐ ${t}</p>`, ln = '_______________________________';
  printDoc('Bail principal — renouvellement', html`<div style="font-size:12pt;line-height:1.55">
    <p style="text-align:right">${socName()}<br>${[societe().adresse, societe().ville].filter(Boolean).join(', ')}</p>
    <p><b>À l’attention de :</b> ${im.proprietaire || ln}</p>
    <p><b>Objet :</b> bail principal — ${im.adresse}${im.ville ? ', ' + im.ville : ''}${im.bailFin ? html` — fin prévue le <b>${fmtDate(im.bailFin)}</b>` : ''}</p>
    <p>Madame, Monsieur,</p>
    <p>Le bail principal du bien ci-dessus${im.bailDebut ? html`, commencé le ${fmtDate(im.bailDebut)},` : ''} arrive à son terme${im.bailFin ? html` le ${fmtDate(im.bailFin)}` : ''}. Nous vous informons de notre décision :</p>
    ${box('Nous souhaitons renouveler le bail.')}${box('Nous ne renouvelons pas le bail.')}
    <p>Merci de nous retourner ce document complété et signé${bailAlert(im) && bailAlert(im).lim ? html` avant le <b>${fmtDate(bailAlert(im).lim)}</b>` : ''}.</p>
    <p style="margin-top:18px">Fait à ${ln}, le ${ln}</p>
    <p>Signature du locataire principal : ${ln}</p>
    <div style="border:1.5px solid #333;border-radius:8px;padding:10px 14px;margin-top:22px"><p style="margin:0 0 6px"><b>Réponse du bailleur</b></p>
      ${box('J’accepte le renouvellement')}${box('Je refuse le renouvellement')}
      <p style="margin:6px 0">Conditions éventuelles (loyer, durée…) : ${ln}${ln}</p>
      <p style="margin:6px 0">Fait à ${ln}, le ${ln}</p><p style="margin:6px 0">Signature du bailleur : ${ln}</p></div>
    <p style="font-size:9pt;color:#666;margin-top:14px">Document à envoyer selon le délai de préavis prévu au contrat (recommandé avec accusé de réception conseillé).</p></div>`, true);
}
const versementsOf = (immId, y) => vault.list('versements').filter((v) => v.immId === immId && (!y || v.y === y));

// Bilan d'un immeuble (ou d'un logement) — une année, ou depuis l'origine si y est vide
function bilan({ immId, logId, y }) {
  const ls = logId ? tenantsOfLog(logId) : tenantsOfImm(immId);
  const encaisse = sum(ls, (l) => sum(paysOf(l.id).filter((p) => !y || p.y === y), (p) => paidAmount(p, l)));
  const depenses = sum(logId ? depensesOf(null, y, logId) : depensesOf(immId, y), (d) => d.montant);
  const verse = logId ? 0 : sum(versementsOf(immId, y), (v) => v.montant);
  return { encaisse, depenses, verse, net: encaisse - depenses - verse, occupants: ls.length };
}
// Frais fixes (salaires, bureau, provisions…) : montant mensuel actif entre debut et fin
const fraisOfMonth = (y, m) => sum(vault.list('frais').filter((f) => (!f.debut || ym(y, m) >= ymOf(f.debut)) && (!f.fin || ym(y, m) <= ymOf(f.fin))), (f) => f.montant);
// Mois écoulés d'une année (année en cours : jusqu'au mois actuel inclus)
const monthsElapsed = (y) => { const d = new Date(); return y < d.getFullYear() ? 12 : y > d.getFullYear() ? 0 : d.getMonth() + 1; };
const fraisOfYear = (y) => { let t = 0; for (let m = 1; m <= monthsElapsed(y); m++) t += fraisOfMonth(y, m); return t; };
// MASTER : nom, adresse, RCS, TVA, banque et logo viennent de 🧾 Facturation (la société des interventions) ;
// la fiche « main » de la MASTER ne garde que la TVA et les associés (les anciennes données restent, non utilisées)
const societe = () => {
  const m = vault.get('reglages', 'main') || {};
  return m;
};

class PtlError extends Error { constructor(status, message) { super(message); this.status = status; } }
// fiche du lieu d'intervention (demande d'une gérance) : où, à quel étage, qui contacter, codes, disponibilités
// lieux où nous avons déjà travaillé (interventions des gérances, des devis, adresses libres) : proposés quand on affecte un travail
const lieuxHist = () => {
  const m = new Map(), key = (x) => String(x || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
  const add = (p, d) => {
    if (!p || !(p.nom || p.adr)) return;
    const k = key(p.adr || p.nom), o = m.get(k);
    if (!o) m.set(k, { nom: p.nom || '', adr: p.adr || '', contact: p.contact || '', tel: p.tel || '', n: 1, d: d || '' });
    else { o.n++; if ((d || '') > o.d) Object.assign(o, { nom: p.nom || o.nom, contact: p.contact || o.contact, tel: p.tel || o.tel, d }); }
  };
  for (const t of vault.list('taches')) add(t.lieu ? t.lieu : t.ptl ? { nom: t.ptl.res, adr: t.ptl.adr, contact: t.ptl.contact, tel: t.ptl.tel } : t.dev ? { nom: t.dev.client, adr: t.dev.adr, contact: t.dev.contact, tel: t.dev.tel } : null, t.date);
  return [...m.values()].sort((a, b) => b.d.localeCompare(a.d) || b.n - a.n);
};
const lieuQ = (...x) => x.filter(Boolean).join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
// 🧭 itinéraire vers une adresse : Google Maps, Waze ou Plans (iPhone)
const navQ = (a) => (/luxemb|lëtzebuerg|deutschland|germany|france|belgi/i.test(a) ? a : a + ', Luxembourg');
const navLinks = (a) => { if (!String(a || '').trim()) return ''; const q = encodeURIComponent(navQ(String(a).trim()));
  return html`<span class="nav-links">🧭 Itinéraire : <a href="https://www.google.com/maps/dir/?api=1&destination=${q}" target="_blank" rel="noopener">Google Maps</a> · <a href="https://waze.com/ul?q=${q}&navigate=yes" target="_blank" rel="noopener">Waze</a> · <a href="https://maps.apple.com/?daddr=${q}&dirflg=d" target="_blank" rel="noopener">Plans</a></span>`; };
const lieuSelHtml = (t) => { const im = !t.lieu && t.immId ? vault.get('immeubles', t.immId) : null, adr = t.lieu ? t.lieu.adr : im ? im.adresse : '';
  return html`${t.lieu ? html`✅ 📍 <b>${t.lieu.nom || t.lieu.adr}</b>${t.lieu.nom && t.lieu.adr ? html` — ${t.lieu.adr}` : ''}` : t.immId ? html`✅ 🏠 <b>${immName(t.immId)}</b>` : html`<span class="muted">Aucun lieu choisi : touchez une ligne ci-dessous.</span>`}${adr ? html`<br>${navLinks(adr)}` : ''}`; };
const flag = (cc) => String.fromCodePoint(...[...cc].map((c) => 0x1f1a5 + c.charCodeAt(0)));
const paysNom = (cc) => { try { return new Intl.DisplayNames(['fr'], { type: 'region' }).of(cc); } catch { return cc; } };
// 🌍 tous les pays (adresse des annonces, pays des immeubles), triés par nom
const WORLD = 'AD AE AF AG AL AM AO AR AT AU AZ BA BB BD BE BF BG BH BI BJ BN BO BR BS BT BW BY BZ CA CD CF CG CH CI CL CM CN CO CR CU CV CY CZ DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FR GA GB GD GE GH GM GN GQ GR GT GW GY HK HN HR HT HU ID IE IL IN IQ IR IS IT JM JO JP KE KG KH KM KN KR KW KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MK ML MM MN MO MR MT MU MV MW MX MY MZ NA NE NG NI NL NO NP NZ OM PA PE PG PH PK PL PS PT PY QA RE RO RS RU RW SA SC SD SE SG SI SK SL SM SN SO SR SS SV SY SZ TD TG TH TJ TL TM TN TR TT TW TZ UA UG US UY UZ VA VE VN YE ZA ZM ZW'.split(' ');
const paysOptions = (sel) => WORLD.map((cc) => [cc, paysNom(cc)]).sort((a, b) => a[1].localeCompare(b[1], 'fr')).map(([cc, n]) => html`<option value="${cc}" ${cc === sel ? new Raw('selected') : ''}>${flag(cc)} ${n}</option>`);
// 🗣️ langues parlées par un client (plusieurs) : une liste à cocher, les langues choisies restent en ovales
const LG_ALL = { fr: 'Français', en: 'English', de: 'Deutsch', lb: 'Lëtzebuergesch', it: 'Italiano', pt: 'Português', es: 'Español', nl: 'Nederlands', ar: 'العربية', ru: 'Русский', uk: 'Українська', pl: 'Polski', ro: 'Română', tr: 'Türkçe', el: 'Ελληνικά', sq: 'Shqip', sr: 'Srpski / Hrvatski', zh: '中文', ja: '日本語', ko: '한국어', hi: 'हिन्दी', fa: 'فارسی', he: 'עברית', sv: 'Svenska', da: 'Dansk', no: 'Norsk', fi: 'Suomi', cs: 'Čeština', hu: 'Magyar', bg: 'Български' };
const lgChips = (ls) => (ls.length ? ls.map((k) => html`<span class="badge" style="border-radius:999px;padding:3px 10px;margin:2px 4px 2px 0;display:inline-block">${LG_ALL[k] || k}</span>`) : html`<span class="muted small">aucune</span>`);
// Petite boîte de saisie (texte) : renvoie la valeur ou null
// ✏️ corriger un message : le texte actuel est déjà dans la case
function promptEdit(title, value) {
  const dlg = $('#confirm');
  setHtml(dlg, html`
    <form class="sheet-body stack" method="dialog">
      <h2 style="font-size:18px">${title}</h2>
      <textarea name="t" required maxlength="1500" style="min-height:110px"></textarea>
      <div class="sheet-foot" style="padding:0;border:0;margin-top:16px">
        <button class="btn" value="no" type="button">Annuler</button>
        <button class="btn primary" type="submit">Enregistrer</button>
      </div>
    </form>`);
  return new Promise((resolve) => {
    const f = dlg.querySelector('form');
    f.t.value = value || '';
    dlg.querySelector('button[value=no]').onclick = () => { dlg.close(); resolve(null); };
    f.onsubmit = (e) => { e.preventDefault(); const v = f.t.value.trim().slice(0, 1500); dlg.close(); resolve(v || null); };
    dlg.onclose = null; setTimeout(() => { if (dlg.open) dlg.onclose = () => resolve(null); }, 0); // la fermeture de la fenêtre précédente (même <dialog>) arrive un instant après : elle ne doit pas annuler celle-ci
    dlg.showModal();
    f.t.focus();
  });
}
// Pays et taux de TVA (modifiables dans Réglages → Société) — aide à la comptabilité, pas un conseil fiscal
const PAYS = { LU: ['Luxembourg', [17, 14, 8, 3]], FR: ['France', [20, 10, 5.5, 2.1]], BE: ['Belgique', [21, 12, 6]], DE: ['Deutschland', [19, 7]], IT: ['Italia', [22, 10, 5, 4]], PT: ['Portugal', [23, 13, 6]], ES: ['España', [21, 10, 4]], NL: ['Nederland', [21, 9]], AT: ['Österreich', [20, 13, 10]], CH: ['Suisse', [8.1, 3.8, 2.6]] };
const tvaRates = () => { const s0 = societe(); const own = String(s0.taux || '').split(/[;, ]+/).map((x) => parseFloat(x.replace(',', '.'))).filter((x) => x > 0 && x < 100); return own.length ? own : (PAYS[s0.pays || 'LU'] || PAYS.LU)[1]; };
// Marque de l'app de gestion (fixe, indépendante de la société cliente)
const APP_BRAND = { nom: 'CENTRAL-OGL', sub: '', legal: 'Ares Invest S.A. · RCS B225245', logo: '/ares/icons/ares-192.png' };
APP_BRAND.logo = '/ares/icons/ares-192.png';
const DEF_SOC = () => (tenantInfo.nom || 'Centrale');
const socName = () => societe().nom || DEF_SOC();
// ligne légale (page de la clé, bas de la centrale) : la société de ⚙️ Réglages → 🧾 Facturation, gardée sur l'appareil pour la page de la clé
function legalLine() {
  if (vault.unlocked) {
    const f = societe(), v = [f.nom, f.rcs ? 'RCS ' + f.rcs : ''].filter(Boolean).join(' · ');
    try { if (v) localStorage.setItem('aresLegal', v); } catch { /* plein */ }
    return v || APP_BRAND.legal;
  }
  try { return localStorage.getItem('aresLegal') || APP_BRAND.legal; } catch { return APP_BRAND.legal; }
}
const socLogo = () => (societe().logo || '');
const htOf = (ttc, r) => (r ? ttc / (1 + r / 100) : ttc);
const r2 = (x) => Math.round(x * 100) / 100;
// Logo et nom partout dans l'app (et sur l'écran de verrouillage, mémorisés sur cet appareil)
// Identité légale de l'éditeur des apps : NOBIS s.a.r.l. (37, Val Saint André, L-1128 Luxembourg · RCS B225665 · TVA LU30599412).
// Correction unique : si la fiche Société contient encore Ares Invest S.A. / RCS B225245, on la remplace.
const NOBIS_ID = { nom: 'NOBIS s.a.r.l.', adresse: '37, Val Saint André', ville: 'L-1128 Luxembourg', rcs: 'B225665', tvaNum: 'LU30599412', pays: 'LU',
  iban: 'LU28 0099 7800 0139 1929', bic: 'CCRALULLXXX', banque: 'Banque Raiffeisen' };
// IBAN valide (contrôle officiel modulo 97)
function ibanOk(v) {
  const s = String(v || '').replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s)) return false;
  const r = (s.slice(4) + s.slice(0, 4)).replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let m = 0;
  for (const ch of r) m = (m * 10 + +ch) % 97;
  return m === 1;
}
const WRONG_ID = /\bares\b|arest|invenst|ares invest|B\s*225\s*245|LU\s*30440727/i;
async function fixIdentity() {
  return;
  const so = societe();
  const badIban = so.iban && (WRONG_ID.test(so.iban) || !ibanOk(so.iban));
  if (![so.nom, so.rcs, so.tvaNum].some((v) => WRONG_ID.test(v || '')) && !badIban) return;
  await vault.mutate((tx) => tx.put('reglages', { id: 'main', ...NOBIS_ID }), 'Société corrigée : NOBIS s.a.r.l.', `${so.nom || ''} → NOBIS s.a.r.l. · RCS B225665`);
  applyBrand();
  toast('Société corrigée : NOBIS s.a.r.l. · RCS B225665 · TVA LU30599412');
}
// L'en-tête de l'app montre la marque CENTRAL-OGL ; le logo de la société (Réglages) sert aux quittances et à l'app des locataires
function applyBrand() {
  const ico = tIco();
  if (ico) { APP_BRAND.logo = ico; document.querySelectorAll('link[rel~=icon], link[rel=apple-touch-icon]').forEach((l) => { l.href = ico; }); document.querySelectorAll('.lock-logo').forEach((img) => { img.src = ico; }); }
  document.querySelectorAll('.brand-mark').forEach((img) => { img.src = societe().logo ? societe().logo : APP_BRAND.logo; });
  // 🎨 centrale d'un client : la couleur de son logo
  const col = vault.unlocked ? societe().color || '' : '';
  if (/^#[0-9a-f]{6}$/i.test(col)) document.documentElement.style.setProperty('--accent', col); else document.documentElement.style.removeProperty('--accent');
}
// centrale d'un client : son logo (Réglages → Votre société) devient aussi son icône (onglet, iPhone, page de la clé)
function tIco() {
  const k = 'aresTIco:' + TENANT, v = vault.unlocked ? societe().logo || '' : null;
  if (v !== null) { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch { /* plein */ } return v; }
  try { return localStorage.getItem(k) || ''; } catch { return ''; }
}
async function brandSet(file) {
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) return toast('Image illisible', { bad: true });
  const S = 512, c = document.createElement('canvas'); c.width = S; c.height = S;
  const x = c.getContext('2d'), k = Math.max(S / bmp.width, S / bmp.height); // carré rempli (recadré au centre), fond blanc
  x.fillStyle = '#fff'; x.fillRect(0, 0, S, S); x.drawImage(bmp, (S - bmp.width * k) / 2, (S - bmp.height * k) / 2, bmp.width * k, bmp.height * k);
  const ico = c.toDataURL('image/png');
  await vault.mutate((tx) => tx.put('reglages', { id: 'brand', ico }), '🖼️ Icône de la CENTRAL-OGL', '');
  applyBrand(); renderShell(); renderView(); toast('🖼️ Icône changée');
  // publiée (c'est seulement un logo) : le bandeau DOMIER de toutes les apps la montre
  try { const b = Uint8Array.from(atob(ico.split(',')[1]), (ch) => ch.charCodeAt(0)); /* fetch d'une adresse data: est bloqué par la CSP */ await vault.call('brand', { method: 'PUT', headers: { 'Content-Type': 'image/png' }, body: b }); } catch { toast('Logo enregistré ici ; pour les apps, publiez le nouveau Worker', { bad: true }); }
}
{ const ic = tIco(); if (ic) { APP_BRAND.logo = ic; document.querySelectorAll('link[rel~=icon], link[rel=apple-touch-icon]').forEach((l) => { l.href = ic; }); } } // dès l'ouverture (page de la clé)
const associes = () => (societe().associes || []).filter((a) => a.nom && a.part > 0);

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
  tripTks: {}, trips: {}, // 🚗 jetons des trajets (intervention|jour) et leur état
  route: 'dashboard',
  year: new Date().getFullYear(),
  immFilter: '',
  search: '',
  locSeg: 'actuels',
  immSeg: 'actuels',
  histShown: 20,
  sheet: null, // { kind, id, tab }
  ptl: { data: null, loading: false, err: '', inv: {} }, // branche gérances (Gérances)
};

// Période choisie dans Comptabilité : année, trimestre (q1..q4) ou mois (m1..m12)
function cpRange(y, per) {
  const pad = (n) => String(n).padStart(2, '0');
  if (/^q[1-4]$/.test(per)) { const q = +per[1]; return [`${y}-${pad(q * 3 - 2)}-01`, `${y}-${pad(q * 3)}-${new Date(y, q * 3, 0).getDate()}`]; }
  if (/^m\d+$/.test(per)) { const m = +per.slice(1); return [`${y}-${pad(m)}-01`, `${y}-${pad(m)}-${new Date(y, m, 0).getDate()}`]; }
  return [`${y}-01-01`, `${y}-12-31`];
}
const cpLabel = (y, per) => (/^q/.test(per) ? `T${per[1]} ${y}` : /^m/.test(per) ? `${MONTHS_FULL[+per.slice(1) - 1]} ${y}` : `Année ${y}`);
// Journal : recettes (loyers encaissés), dépenses, versements aux bailleurs, frais fixes — avec HT / TVA / TTC
function journal(from, to) {
  const rows = [];
  const inR = (d) => d && d >= from && d <= to;
  const pad = (n) => String(n).padStart(2, '0');
  for (const p of vault.list('paiements')) {
    const l = vault.get('locataires', p.locId);
    if (!l) continue;
    const d = p.date || `${p.y}-${pad(p.m)}-01`;
    if (!inR(d)) continue;
    const im = vault.get('immeubles', l.immId) || {};
    const ttc = paidAmount(p, l), r = 0; // loyers : pas de TVA
    rows.push({ d, sens: 'R', cat: 'Loyer', lib: `Loyer ${MONTHS_FULL[p.m - 1].toLowerCase()} ${p.y} — ${fullName(l)}`, imm: im.adresse || '', ttc, tva: r2(ttc - htOf(ttc, r)), taux: r, piece: '' });
  }
  for (const x of vault.list('depenses')) {
    if (!inR(x.date)) continue;
    rows.push({ d: x.date, sens: 'D', cat: DEP_CATS[x.cat] || 'Dépense', lib: x.desc + (x.fournisseur ? ' — ' + x.fournisseur : '') + (x.numFacture ? ' (n° ' + x.numFacture + ')' : ''), imm: immName(x.immId), ttc: x.montant, tva: r2(x.montant - htOf(x.montant, x.tva || 0)), taux: x.tva || 0, piece: x.docId && vault.get('documents', x.docId) ? x.docId : '', depId: x.id });
  }
  for (const v of vault.list('versements')) {
    const d = v.date || `${v.y}-${pad(v.m)}-01`;
    if (!inR(d)) continue;
    rows.push({ d, sens: 'D', cat: 'Bailleur', lib: `Loyer principal ${MONTHS_FULL[v.m - 1].toLowerCase()} ${v.y}`, imm: immName(v.immId), ttc: v.montant, tva: 0, taux: 0, piece: '' });
  }
  const [y0, m0] = from.split('-').map(Number), [y1, m1] = to.split('-').map(Number);
  for (let k = y0 * 12 + m0 - 1; k <= y1 * 12 + m1 - 1; k++) {
    const y = Math.floor(k / 12), m = (k % 12) + 1;
    if (`${y}-${pad(m)}-01` > today()) break;
    const f = fraisOfMonth(y, m);
    if (f) rows.push({ d: `${y}-${pad(m)}-01`, sens: 'D', cat: 'Frais fixes', lib: `Frais fixes ${MONTHS_FULL[m - 1].toLowerCase()} ${y}`, imm: '', ttc: f, tva: 0, taux: 0, piece: '' });
  }
  return rows.sort((a, b) => a.d.localeCompare(b.d) || a.sens.localeCompare(b.sens));
}
function journalCsv(rows) {
  const n = (x) => String(r2(x)).replace('.', ',');
  const q = (x) => '"' + csvSafe(x).replace(/"/g, '""') + '"';
  const head = ['Date', 'Sens', 'Catégorie', 'Libellé', 'Immeuble', 'HT', 'Taux TVA %', 'TVA', 'TTC', 'Pièce jointe'];
  const lines = rows.map((r) => [r.d, r.sens === 'R' ? 'Recette' : 'Dépense', r.cat, r.lib, r.imm, n(r.ttc - r.tva), n(r.taux), n(r.tva), n(r.ttc), r.piece ? 'oui' : ''].map(q).join(';'));
  return '\ufeff' + [head.map(q).join(';'), ...lines].join('\r\n');
}

// ───────────────────────── Toasts & confirmations ─────────────────────────
function toast(msg, opts = {}) {
  const el = document.createElement('div');
  el.className = 'toast' + (opts.bad ? ' bad' : '');
  el.setAttribute('role', 'status');
  setHtml(el, html`<span>${msg}</span>${opts.undo ? html`<button type="button">Annuler</button>` : ''}`);
  if (opts.undo) el.querySelector('button').onclick = () => { el.remove(); opts.undo(); };
  // au-dessus de tout, même d'une fiche ouverte (couche « popover ») ; un toucher le ferme
  const host = $('#toasts');
  host.append(el);
  el.addEventListener('click', (e) => { if (!e.target.closest('button')) { el.remove(); toastHide(); } });
  try { if (host.showPopover) { if (host.matches(':popover-open')) host.hidePopover(); host.showPopover(); } } catch { /* navigateur ancien */ }
  setTimeout(() => { el.remove(); toastHide(); }, opts.undo || opts.bad ? 8000 : 5000);
}
function toastHide() { const h = $('#toasts'); try { if (!h.children.length && h.matches(':popover-open')) h.hidePopover(); } catch { /* navigateur ancien */ } }

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
    dlg.onclose = null; setTimeout(() => { if (dlg.open) dlg.onclose = () => resolve(null); }, 0); // la fermeture de la fenêtre précédente (même <dialog>) arrive un instant après : elle ne doit pas annuler celle-ci
    dlg.showModal();
  });
}

const confirmBox = async (message, { ok = 'Confirmer', danger = false, detail = '' } = {}) =>
  (await choiceBox(message, detail, [{ value: 'yes', label: ok, cls: danger ? 'danger solid' : 'primary' }])) === 'yes';

function promptKey(title, detail, warn = []) {
  const dlg = $('#confirm');
  setHtml(dlg, html`
    <form class="sheet-body stack" method="dialog">
      <h2 style="font-size:18px">${title}</h2>
      ${detail ? html`<p class="muted small">${detail}</p>` : ''}
      ${warn.length ? html`<div class="warn-box"><b class="warn-t">⚠️ ATTENTION</b>${warn.map((w) => html`<p>${w}</p>`)}</div>` : ''}
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
    dlg.onclose = null; setTimeout(() => { if (dlg.open) dlg.onclose = () => resolve(null); }, 0); // la fermeture de la fenêtre précédente (même <dialog>) arrive un instant après : elle ne doit pas annuler celle-ci
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
  <img class="lock-logo" src="${APP_BRAND.logo}" alt="" width="96" height="96">
  <div class="lock-head"><h1 data-notr="1">${OGL.nom}</h1><p data-notr="1">${OGL.sub}</p><p class="tiny">${OGL.info}</p><p class="tiny" data-notr="1"></p></div>`;
  const foot = html`<div class="lock-foot">${icon('shield')} Chiffrement de bout en bout · AES-256</div>`;
  if (mode === 'blocked') {
    setHtml(lockEl, html`<div class="lock-card">${head}<div class="alert warn">${icon('lock')}<div><b>Centrale bloquée.</b> La centrale est en lecture seule : contactez CENTRAL-OGL pour la réactiver. Vos données restent chiffrées et intactes.</div></div>${foot}</div>`);
    return;
  }

  if (mode === 'checking') {
    setHtml(lockEl, html`<div class="lock-card">${head}<div style="display:flex;justify-content:center;padding:12px"><div class="spinner accent"></div></div>${foot}</div>`);
    return;
  }
  if (mode === 'setup') {
    setHtml(lockEl, html`<form class="lock-card" data-form="setup" autocomplete="off">
      ${head}
      <div class="alert info">${icon('key')}<div><b>Première configuration.</b> Choisissez la clé d'accès : elle chiffre toutes les données et ne peut pas être récupérée si elle est perdue.</div></div>
      <label class="field">${"Code d’invitation"}
        <input name="code" type="password" required placeholder="${"Code d’invitation reçu"}" autocomplete="off">
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
  <div class="alert info">${icon('key')}<div><b>Clé d'accès oubliée ?</b> Seulement si vous aviez créé une <b>clé de secours</b> (Réglages → Sécurité, 24 caractères, ex. ABCD-EFGH-…) : saisissez-la ici, puis choisissez une nouvelle clé d'accès.${html`<br><br><b>Pas de clé de secours ?</b> Vos données ne peuvent pas être récupérées (elles sont chiffrées, personne d'autre n'a la clé). Demandez à CENTRAL-OGL de <b>remettre votre centrale à zéro</b> : vous recevrez un nouveau code d'invitation et repartirez d'une centrale vide.`}</div></div>
  ${html`<label class="field">🧩 Moitié A <span class="tiny muted">(votre e-mail, la feuille imprimée, ou cet appareil)</span><input name="ra" value="${(() => { try { return localStorage.getItem(recAKey()) || ''; } catch { return ''; } })()}" placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX" autocapitalize="characters" autocorrect="off" spellcheck="false" style="font-family:var(--mono)"></label>
  <label class="field">🧩 Moitié B <span class="tiny muted">(gardée à un autre endroit : associé, coffre…)</span><input name="rb" placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX" autocapitalize="characters" autocorrect="off" spellcheck="false" style="font-family:var(--mono)"></label>
  <p class="tiny muted" style="margin:0">Ou, si vous avez une clé de secours complète (ancienne version) :</p>`}
      <label class="field">Clé de secours <input name="code"  placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX" autocapitalize="characters" autocorrect="off" spellcheck="false" style="font-family:var(--mono);letter-spacing:.05em"></label>
      <div class="lock-err" role="alert">${error}</div>
  <button class="btn primary block" type="submit">Ouvrir avec la clé de secours</button>
  <button class="btn ghost block" type="button" data-action="lock-mode" data-id="unlock">Retour</button>
  <p class="tiny muted">Sans clé de secours, les données ne peuvent pas être récupérées : elles sont chiffrées et personne d'autre ne possède la clé.</p>
  ${foot}
</form>`);
    setTimeout(() => lockEl.querySelector('[name=code]')?.focus(), 50);
    return;
  }
  if (mode === 'op') {
    setHtml(lockEl, html`<form class="lock-card" data-form="op-unlock">
      ${head}
      <p class="small" style="margin:0"><b>👤 Opérateur de la centrale</b> — votre identifiant et votre mot de passe personnels, donnés par le responsable.</p>
      <label class="field">Identifiant<input name="login" required autocomplete="username" autocapitalize="none" spellcheck="false"></label>
      <label class="field">Mot de passe ${pwField('pass', '••••••••••', 'current-password')}</label>
      <div class="lock-err" role="alert">${error}</div>
      <button class="btn primary block" type="submit">Se connecter</button>
      <button class="btn ghost block" type="button" data-action="lock-mode" data-id="unlock">← Responsable (clé d'accès)</button>
      ${foot}
    </form>`);
    setTimeout(() => lockEl.querySelector('[name=login]')?.focus(), 50);
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
    <input type="text" name="username" value="CENTRAL-OGL" autocomplete="username" hidden>
    <label class="field">Clé d'accès ${pwField('pass', '••••••••••••', 'current-password')}</label>
    <div class="lock-err" role="alert">${error}</div>
    <button class="btn primary block" type="submit">Déverrouiller</button>
    <button class="btn ghost block" type="button" data-action="lock-mode" data-id="recover">Clé d'accès oubliée ?</button>
    <button class="btn ghost block" type="button" data-action="lock-mode" data-id="op">👤 Connexion opérateur (centraliste, comptable)</button>
    ${!navigator.onLine ? html`<p class="tiny muted" style="text-align:center">Hors ligne : ouverture avec la copie chiffrée de cet appareil.</p>` : ''}
    ${foot}
  </form>`);
  setTimeout(() => lockEl.querySelector('[name=pass]')?.focus(), 50);
}

async function boot() {
  renderLock('checking');
  try {
    const meta = navigator.onLine ? await vault.remoteMeta() : null;
    if (meta && meta.tenant) tenantSave(meta.tenant);
    renderLock(meta && !meta.configured ? 'setup' : 'unlock');
  } catch (e) {
    if (e && e.status === 403) { tenantSave((e.info && e.info.tenant) || tenantInfo); return renderLock('blocked'); }
    renderLock('unlock');
  }
}

function setBusy(form, busy, label) {
  const b = form.querySelector('button[type=submit]');
  if (!b) return;
  if (busy) { b.dataset.label = b.textContent; b.disabled = true; setHtml(b, html`<span class="spinner"></span> ${label}`); }
  else { b.disabled = false; b.textContent = b.dataset.label || b.textContent; }
}

// Un seul appareil connecté : si un autre est actif, proposer de prendre la main.
async function claimOrAsk() {
  try {
    await vault.claimSession(false);
    return true;
  } catch (e) {
    if (!(e instanceof ApiError)) return true; // réseau coupé : on continue hors ligne
    if (e.status !== 409) throw e;
    const i = e.info || {};
    const ago = i.lastSeen ? Math.max(0, Math.round((Date.now() - i.lastSeen) / 1000)) : null;
    const choice = await choiceBox(
      "CENTRAL-OGL est ouverte sur un autre appareil",
      `${i.device || 'Un autre appareil'} est connecté${i.since ? ' depuis ' + fmtDateTime(i.since) : ''}${ago != null ? ` (actif il y a ${ago} s)` : ''}. Un seul appareil peut être connecté à la fois : si vous continuez, l'autre sera déconnecté immédiatement.`,
      [{ value: 'take', label: 'Prendre la main', cls: 'primary' }]
    );
    if (!choice) return false;
    await vault.claimSession(true);
    return true;
  }
}

async function onRecover(fd, form) {
  setBusy(form, true, 'Vérification…');
  try {
    const full = String(fd.get('code') || '').trim() || rcJoin(fd.get('ra'), fd.get('rb'));
    if (!full) throw new Error('Écrivez la moitié A et la moitié B (24 caractères chacune), ou la clé de secours complète.');
    const r = await vault.unlockWithRecovery(full);
    if (r.setup) return renderLock('setup');
    if (!(await claimOrAsk())) { vault.lock(); return renderLock('unlock', 'Connexion annulée.'); }
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
    if (!(await claimOrAsk())) {
      vault.lock();
      return renderLock('unlock', 'Connexion annulée : CENTRAL-OGL reste ouverte sur l’autre appareil.');
    }
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
    await claimOrAsk();
  } catch (e) {
    setBusy(form, false);
    err.textContent = e.message || 'Erreur';
    return;
  }
  startSession();
  setTimeout(async () => { try { if (await vault.verifyPassphrase(pass)) await recActivate(); } catch { /* l'avis rouge de l'Accueil le proposera */ } }, 1500);
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

let lastInbox = 0;
// une notification arrive pendant que la centrale est ouverte : on relit tout de suite la boîte et les messages
if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message', (e) => { if (e.data && e.data.k === 'push' && vault.unlocked) { lastInbox = Date.now(); inboxSync(); chatPoll(); if (ui.sheet && ui.sheet.kind === 'imm' && ui.sheet.tab === 'chat') chatLoad(ui.sheet.id, true); } });
function startSession() {
  vault.api.who = whoLabel();
  document.body.classList.toggle('compta', isCompta());
  lockEl.hidden = true;
  setHtml(lockEl, '');
  appEl.hidden = false;
  lastActive = Date.now();
  clearInterval(idleTimer);
  idleTimer = setInterval(() => {
    if (!vault.unlocked) return;
    if (Date.now() - lastActive > lockMinutes() * 60000) lockNow('Verrouillé après inactivité.');
    else if (document.visibilityState === 'visible') { vault.sync(); if (Math.random() < 0.1) tenantRefresh(); if (Date.now() - lastInbox > 25000) { lastInbox = Date.now(); inboxSync(); chatPoll(); if (ui.sheet && ui.sheet.kind === 'imm' && ui.sheet.tab === 'chat') chatLoad(ui.sheet.id); } }
  }, 30000);
  renderShell();
  applyBrand();
  fixIdentity().catch(() => {});
  tenantRefresh();
  // à l'ouverture de l'app : toujours l'Accueil ; après un verrouillage automatique : la page où l'on était
  go(firstOpen ? 'dashboard' : location.hash.slice(2) || 'dashboard', true);
  firstOpen = false;
  vault.sync();
  pushInit(); // rappel « notifications coupées » dès l'Accueil
  setTimeout(async () => {
    await refreshIcs(false);
    // Une fois par jour : republier les pages locataires (dates glissantes sur 13 mois)
    let d = '';
    try { d = localStorage.getItem('aresPubDay') || ''; } catch {}
    if (d !== today() && (await publishPub())) try { localStorage.setItem('aresPubDay', today()); } catch {}
    await espaceSync();
    await inboxSync();
    pushInit();
    await chatPoll();
    await binDaily();
  }, 4000);
}

// Collectes liées au calendrier en ligne de la commune : mise à jour automatique (une fois par jour et par appareil)
async function refreshIcs(force, onlyId) {
  const key = 'aresIcsDay';
  let day = '';
  try { day = localStorage.getItem(key) || ''; } catch {}
  if (!force && day === today()) return 0;
  const list = vault.list('collectes').filter((c) => c.mode === 'dates' && c.icsUrl && (!onlyId || c.id === onlyId));
  if (!list.length || !vault.unlocked) return 0;
  let changed = 0;
  const byUrl = new Map();
  for (const c of list) {
    try {
      if (!byUrl.has(c.icsUrl)) byUrl.set(c.icsUrl, await vault.fetchIcs(c.icsUrl));
      const ds = parseDates(byUrl.get(c.icsUrl), new Date().getFullYear(), c.cat);
      if (!ds.length) throw new Error('aucune date dans le calendrier');
      const upd = { id: c.id, icsErr: '' };
      if (ds.join() !== (c.dates || []).join()) { upd.dates = ds; upd.icsAt = today(); changed++; }
      const dn = icsNames(byUrl.get(c.icsUrl), c.cat);
      if (JSON.stringify(dn) !== JSON.stringify(c.dnames || {})) { upd.dnames = dn; if (!upd.dates) { upd.dates = ds; changed++; } }
      // On n'écrit que si quelque chose change (pas d'entrée dans l'historique à chaque vérification)
      if (upd.dates || c.icsErr) await vault.mutate((tx) => tx.put('collectes', upd), upd.dates ? 'Calendrier mis à jour' : 'Calendrier à nouveau disponible', `${DECHETS[c.cat].short} — ${immName(c.immId)}${upd.dates ? ' · ' + plural(ds.length, 'date') : ''}`, c.immId);
    } catch (e) {
      if (force) toast(`${DECHETS[c.cat].short} : ${e.message || 'calendrier indisponible'}`, { bad: true });
      if (c.icsErr !== (e.message || 'erreur')) await vault.mutate((tx) => tx.put('collectes', { id: c.id, icsErr: e.message || 'erreur' }), 'Calendrier indisponible', `${DECHETS[c.cat].short} — ${immName(c.immId)}`, c.immId);
    }
  }
  try { localStorage.setItem(key, today()); } catch {}
  if (changed) for (const id of new Set(list.map((c) => c.immId))) await publishPub(id);
  if (changed && !force) toast(`Calendrier des collectes mis à jour (${plural(changed, 'collecte')})`);
  return changed;
}

function lockNow(msg = '') {
  edlUrls.forEach((u) => URL.revokeObjectURL(u));
  edlUrls.clear();
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
addEventListener('pagehide', () => vault.unlocked && vault.releaseSession());
addEventListener('offline', () => vault.unlocked && vault.setStatus('offline'));

vault.on((kind) => {
  if (!vault.unlocked) return;
  if (kind === 'status') renderSync();
  if (kind === 'data') { renderView(); renderSheet(); scheduleEspaceSync(); }
  if (kind === 'auth-lost') lockNow("La clé d'accès a été changée sur un autre appareil.");
  if (kind === 'session-lost') lockNow(`CENTRAL-OGL a été ouverte sur ${vault.sessionLostBy || 'un autre appareil'} : cet appareil a été déconnecté.`);
});

// (même ordre que la barre du bas du téléphone ; Locataires et Gestion locataire sont des onglets d'Immeubles)
const NAV_TREE = [
  ['dashboard', 'Accueil', 'home'],
  { group: 'Gestion', items: [['demandes', 'Demandes', 'tool'], ['maintenance', 'Interventions', 'tool'], ['immeubles', 'Mes Propriétés', 'building'], ['gerances', 'Gérances', 'briefcase'], ['licences', 'Clients', 'qr']] },
  ['champions', 'Classement', 'trophy'],
  { group: 'Comptabilité', items: [['compta', 'Comptabilité', 'chart', null, 'compta']] }
];
// téléphone : toutes les rubriques sur une barre qui défile au doigt
const NAV_MOBILE = [
  ['dashboard', 'Accueil', 'home'],
  ['demandes', 'Demandes', 'tool'],
  ['maintenance', 'Interventions', 'tool'],
  ['immeubles', 'Mes Propriétés', 'building'],
  ['gerances', 'Gérances', 'briefcase'],
  ['licences', 'Clients', 'qr'],
  ['champions', 'Classement', 'trophy'],
  ['compta', 'Comptabilité', 'chart', null, 'compta'],
  ['reglages', 'Réglages', 'gear']
];
const masked = () => new Set(); // « Masquer » retiré : plus rien de masqué ; // centrale d'un client : rien de masqué (le réglage n'existe que chez nous)
// pages qui appartiennent à une rubrique (Locataires et Gestion locataire sont dans Immeubles)
const maskOf = (route) => (['locataires', 'paiements'].includes(route) ? 'immeubles' : route);
// Légende des couleurs de nos activités (mêmes couleurs que dans les apps des locataires, de l'équipe et le portail)
const COLOR_LEG = [['#F97316', 'Signalements des locataires : dégâts, problèmes'], ['#0D9488', 'Locataires et loyers : logements, contrats, paiements'],
  ['#475569', 'Avis de l’immeuble : coupures, travaux dans les communs'],
];
// MASTER : sans « Locataires et loyers » ni « Avis de l’immeuble » (plus d’inquilini ni d’immeubles à elle)
const legList = () => (COLOR_LEG);
const legDots = () => html`<div class="leg-dots" aria-label="Légende des couleurs">${legList().map(([c, t]) => html`<button type="button" class="leg-dot" style="--c:${c}" data-action="leg-dot"><span class="leg-tip">${t}</span></button>`)}</div>`;
const navKeep = (it) => routeOk(it[0]) && !((it[4] === 'abo'));
function sideNavHtml() {
  return NAV_TREE.map((x) => (x.group ? (x.items.some(navKeep) ? html`<div class="nav-group">${x.group}</div>${x.items.filter(navKeep).map((it) => navItem(it, true))}` : '') : navKeep(x) ? navItem(x) : ''));
}
function navItem([id, label, ic, plus, sec], sub, mob) {
  if (masked().has(id)) return html`<span class="navbtn nav-masked${sub ? ' nav-sub' : ''}" aria-disabled="true" title="Masqué dans les réglages">${icon('lock')}<span>MASQUÉ</span></span>`;
  return html`<button class="navbtn${sub ? ' nav-sub' : ''}" data-action="go" data-to="${id}" ${sec ? new Raw(`data-sec="${sec}"`) : ''}>${icon(ic)}<span>${label}</span></button>${plus ? html`<button class="navbtn nav-plus" data-action="${plus[0]}">＋ <span>${plus[1]}</span></button>` : ''}`;
}
function renderShell() {
  const navBtn = ([id, label, ic]) => html`<button class="navbtn" data-action="go" data-to="${id}">${icon(ic)}<span>${label}</span></button>`;
  setHtml(appEl, html`
    <nav class="sidenav" aria-label="Navigation">
      <div class="brand">${html`<img class="brand-mark" src="${APP_BRAND.logo}" alt="" width="36" height="36">`}<span data-notr="1">${OGL.nom}<small>${OGL.sub}</small>${html`<small>${OGL.info}</small>`}</span></div>
      ${sideNavHtml()}
      ${navBtn(['reglages', 'Réglages', 'gear'])}
      ${legDots()}
      <div class="spacer"></div>
      <button class="navbtn" data-action="lock">🚪<span>Se déconnecter</span></button>
      <div class="tiny muted" data-notr style="text-align:center;padding:2px 0 6px">v${VERSION}</div>
    </nav>
    <div>
      <header class="topbar">
        <div class="brand"><img class="brand-mark" src="${APP_BRAND.logo}" alt="" width="36" height="36"><span data-notr="1">${OGL.nom}</span></div>
        <button class="sync" id="sync" data-action="sync-now" data-s="idle"><i></i><span>…</span></button>
        <button class="btn icon ghost" data-action="lock" aria-label="Verrouiller" title="Verrouiller">${icon('lock')}</button>
      </header>
      <main class="main" id="view"></main>
    </div>
    <nav class="bottomnav" aria-label="Navigation">${NAV_MOBILE.filter((x) => navKeep(x) || x[0] === 'reglages').map((x) => navItem(x, false, true))}</nav>
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
  if (route === 'reseau') { route = 'licences'; replace = true; } // ancienne adresse #/reseau
  if (!VIEWS[route] || masked().has(maskOf(route)) || !routeOk(route)) route = homeRoute();
  ui.route = route;
  const url = '#/' + route;
  if (replace) history.replaceState(null, '', url); else if (location.hash !== url) history.pushState(null, '', url);
  const navRoute = route === 'champeq' ? 'champions' : route === 'rapports' ? 'compta' : ['paiements', 'locataires'].includes(route) ? 'immeubles' : route;
  document.querySelectorAll('.navbtn[data-to]').forEach((b) => (b.dataset.to === navRoute && (!b.dataset.sec || b.dataset.sec === (ui.cpSec === 'abo' ? 'abo' : 'compta')) ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current')));
  bnavShow();
  renderView();
  scrollTo(0, 0);
}
// barre du bas : la rubrique ouverte reste visible ; les flèches ‹ › de scroll-hint.js montrent qu'il y en a d'autres
function bnavShow() {
  const nav = $('.bottomnav'), cur = nav && nav.querySelector('[aria-current=page]');
  if (!nav) return;
  if (cur && nav.scrollWidth > nav.clientWidth) { const x = cur.offsetLeft - (nav.clientWidth - cur.offsetWidth) / 2; nav.scrollTo({ left: Math.max(0, x), behavior: 'smooth' }); }
}
addEventListener('popstate', () => vault.unlocked && go(location.hash.slice(2) || 'dashboard', true));

// ── Toutes les sections de l'app : un clic ouvre / ferme, ouvertes elles brillent (lumière chaude) ──
// Un titre de section (.section-label) + son bloc, ou une carte avec titre (.card-title), deviennent repliables.
// Les longues listes démarrent fermées (avec le nombre de lignes) ; le choix est mémorisé sur cet appareil.
const foldPref = (() => { try { return JSON.parse(localStorage.getItem('aresFolds2') || '{}'); } catch { return {}; } })();
let foldScope = '', foldAllOpen = false;
// repli écrit à la main (dans les fiches) : ouvert par défaut, sinon le dernier choix sur cet appareil
const foldIsOpen = (k) => (k in foldPref ? foldPref[k] : true);
const foldKey = (label) => (foldScope || ui.route) + '|' + label.replace(/[\d.,€%]+/g, '#').replace(/\s+/g, ' ').trim().slice(0, 60);
document.addEventListener('toggle', (e) => {
  const d = e.target;
  if (!d.matches || !d.matches('details.gfold')) return;
  foldPref[d.dataset.gk] = d.open;
  try { localStorage.setItem('aresFolds2', JSON.stringify(foldPref)); } catch {}
}, true);
function makeFold(label, bodyEls, extraClass, before, cls) {
  const lines = bodyEls.reduce((n, el) => n + el.querySelectorAll('.row, tbody tr, .card:not(.metric)').length, 0);
  const key = foldKey(label);
  const searching = !!document.querySelector('#view input[type=search]')?.value;
  const open = searching || (key in foldPref ? foldPref[key] : foldAllOpen || lines <= 8);
  const d = document.createElement('details');
  d.className = 'card dfold gfold ' + (extraClass || '');
  d.dataset.gk = key;
  if (open) d.open = true;
  const sm = document.createElement('summary');
  const h = document.createElement('h3'); h.textContent = label;
  sm.appendChild(h);
  if (lines) { const sp = document.createElement('span'); sp.className = 'sum'; sp.textContent = lines + (lines > 1 ? ' éléments' : ' élément'); sm.appendChild(sp); }
  d.appendChild(sm);
  const body = document.createElement('div'); body.className = 'dfold-body';
  bodyEls.forEach((el) => body.appendChild(el));
  d.appendChild(body);
  before.replaceWith(d);
  if (cls) d.style.cssText = cls;
  return d;
}
function enhanceFolds(root, scope = '', allOpen = false) {
  foldScope = scope; foldAllOpen = allOpen;
  // 1) titres de section suivis d'une liste, d'une grille, d'un tableau…
  for (const lab of [...root.querySelectorAll('.section-label')]) {
    if (lab.closest('details, form, dialog') || lab.dataset.nofold != null) continue;
    const body = lab.nextElementSibling;
    if (!body || !body.matches('.list, .grid, .stack, .card, .metrics, .months, table, .tbl')) continue;
    const label = lab.textContent.trim();
    if (!label) continue;
    makeFold(label, [body], '', lab, 'margin-top:14px');
  }
  // 2) cartes avec un titre (h3)
  for (const card of [...root.querySelectorAll('.card')]) {
    if (card.matches('details, button, a, .metric, .empty, [data-action]') || card.closest('details, dialog, form')) continue;
    const t = card.querySelector(':scope > .card-title');
    const h = t && t.querySelector('h3');
    if (!h) continue;
    const label = h.textContent.trim();
    const acts = [...t.children].filter((c) => c !== h);
    const rest = [...card.children].filter((c) => c !== t);
    const bar = document.createElement('div');
    bar.className = 'fold-acts';
    acts.forEach((a) => bar.appendChild(a));
    const kids = acts.length ? [bar, ...rest] : rest;
    const style = card.getAttribute('style') || '';
    const extra = [...card.classList].filter((c) => c !== 'card').join(' ');
    makeFold(label, kids, extra, card, style);
  }
}
// 🗑️ Collectes d'un immeuble (Maintenance → Déchets, et onglet « 🗑️ Déchets » de la fiche, aussi dans la centrale d'un client)
function collCard(im) {
  const y = new Date().getFullYear();
          const cs = vault.list('collectes').filter((c) => c.immId === im.id).sort((a, b) => Object.keys(DECHETS).indexOf(a.cat) - Object.keys(DECHETS).indexOf(b.cat));
  const next = agenda(today(), addDays(today(), 30), im.id).filter((x) => x.kind === 'collecte')[0];
  return html`<div class="card" style="margin-bottom:12px">
    <div class="card-title"><h3>${im.adresse}</h3><button class="btn sm" data-action="new-collecte" data-imm="${im.id}" aria-label="Ajouter une collecte">${icon('plus')}</button></div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin:-2px 0 10px">
      <button class="btn sm ${cs.length ? '' : 'primary'}" data-action="ics-all" data-id="${im.id}">${icon('upload')} Calendrier de la commune</button>
    ${cs.length ? html`
      <button class="btn sm" data-action="print-collectes" data-id="${im.id}" data-y="${y}">${icon('download')} Affiche ${y}</button>
      <button class="btn sm ${im.pubToken ? '' : 'primary'}" data-action="share-coll" data-id="${im.id}">${icon('users')} Locataires${im.pubToken ? ' ✓' : ''}</button>` : ''}</div>
    ${next ? html`<p class="small" style="margin:0 0 8px">Prochaine : <b>${DECHETS[next.c.cat].short}</b> — ${fmtDay(next.d)}</p>` : ''}
    ${cs.length ? html`<div class="list">${cs.map((c) => html`<button class="row" data-action="edit-collecte" data-id="${c.id}">
      <span class="dot" style="background:${DECHETS[c.cat].color}"></span>
      <span class="grow"><span class="title" style="display:block;white-space:normal">${DECHETS[c.cat].label}</span><span class="meta" style="white-space:normal">passage ${collecteRule(c)} · sortir ${sortieRule(c).toLowerCase()} · ${LIEUX[c.lieu] || ''}${c.note ? ' · ' + c.note : ''}</span></span>
      ${c.mode === 'dates' && c.icsUrl ? (c.icsErr ? html`<span class="badge bad">lien en erreur</span>` : html`<span class="badge ok">🔗 auto</span>`) : c.mode === 'dates' && !(c.dates || []).some((d) => d >= today()) ? html`<span class="badge warn">à mettre à jour</span>` : ''}
    </button>`)}</div>` : html`<p class="muted small">Aucune collecte enregistrée.</p>`}
  </div>`;
}
// 🧩 Clé de secours en deux moitiés : A et B gardées à deux endroits différents (e-mail, papier, cet appareil, l'associé).
// Aucune moitié seule n'ouvre quoi que ce soit : A + B = la clé de secours (addition lettre par lettre, modulo 32).
const RCA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const rcNorm = (c) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/O/g, '0').replace(/I/g, '1');
const rcFmt = (x) => x.match(/.{1,4}/g).join('-');
function rcSplit(code) {
  const r = rcNorm(code), rnd = crypto.getRandomValues(new Uint8Array(r.length));
  let a = '', b = '';
  for (let i = 0; i < r.length; i++) { const ai = rnd[i] % 32; a += RCA[ai]; b += RCA[(RCA.indexOf(r[i]) - ai + 32) % 32]; }
  return { a: rcFmt(a), b: rcFmt(b) };
}
function rcJoin(a, b) {
  a = rcNorm(a); b = rcNorm(b);
  if (a.length !== 24 || b.length !== 24) return '';
  let r = '';
  for (let i = 0; i < 24; i++) { const x = RCA.indexOf(a[i]), y = RCA.indexOf(b[i]); if (x < 0 || y < 0) return ''; r += RCA[(x + y) % 32]; }
  return rcFmt(r);
}
const recAKey = () => 'aresRecA:' + TENANT;
// crée la clé de secours et la coupe en deux : A et B, à garder à deux endroits différents (ex. le directeur et l'associé)
async function recActivate() {
  const code = await vault.createRecovery();
  const { a, b } = rcSplit(code);
  try { localStorage.setItem(recAKey(), a); } catch { /* stockage indisponible */ }
  await vault.mutate((tx) => tx.put('reglages', { id: 'recSplit', at: today(), both: true }), '🧩 Récupération de clé activée', '');
  openSheet('rec-split', null, null, { a, b });
}
function renderView() {
  const view = $('#view');
  if (!view || !vault.unlocked) return;
  const active = document.activeElement;
  const keepSearch = active && active.name === 'search' ? active.selectionStart : null;
  setHtml(view, html`${tenantBanner()}${VIEWS[ui.route]()}<div style="text-align:center;margin:28px 0 8px"><button class="btn ghost" data-action="lock">🚪 Se déconnecter</button> <span class="tiny muted" data-notr>v${VERSION}</span><p class="tiny muted" style="margin:4px 0 0">La centrale se ferme : il faudra la clé pour rouvrir</p><p class="tiny" data-notr="1" style="margin:8px 0 0;color:#9a968c">v${VERSION}</p></div>`); // 🚪 en bas de chaque page, comme dans les apps ; version en gris
  enhanceFolds(view, '', false);
  updateBadge();
  if (keepSearch != null) {
    const s = view.querySelector('[name=search]');
    if (s) { s.focus(); s.setSelectionRange(keepSearch, keepSearch); }
  }
}

// Numéro sur l'icône de l'app : tout ce qui attend une action (messages, virements signalés, photos de sortie, équipe, annonces…)
// documents envoyés par les locataires, pas encore vérifiés
const recusAll = () => vault.list('documents').filter((d) => d.kind === 'recu' && vault.get('locataires', d.locId));
function pendingCount() {
  const chat = Object.entries(ui.chatNew || {}).filter(([imId, n]) => n && vault.get('immeubles', imId)).reduce((a, [, n]) => a + n, 0);
  return newSignals().length + vault.list('locataires').filter((l) => l.virSignal && !l.virSignal.vu).length + new Set(edlOutNew().map((d) => d.logId)).size
    + sum(vault.list('intervenants'), (i) => i.feedNew || 0) + chat + (ui.toolsPending || 0) + recusAll().length;
}
let badgeLast = -1;
function updateBadge() {
  if (!vault.unlocked) return;
  const n = pendingCount();
  if (n !== badgeLast) { badgeLast = n; setBadge(n, '/locataires'); }
}
// Notifications de l'app de gestion sur ce téléphone
let pushSt = '';
const pushPost = (b) => vault.pushSub({ ...b, lang: getLang() });
async function pushInit() { pushSt = await pushStatus('/locataires'); if (pushSt === 'on') pushRefresh('/locataires', pushPost); if (['reglages', 'dashboard'].includes(ui.route)) renderView(); }
// Accueil : tant que les notifications sont coupées sur cet appareil, on le rappelle (elles peuvent sauter après une mise à jour)
const pushNudge = () => (!pushSt || pushSt === 'on' || pushSt === 'unsupported' ? '' : html`<div class="alert warn push-nudge" style="margin-bottom:14px">🔔<div><b>Notifications désactivées sur cet appareil</b><br><span class="small">Sans elles, vous ne voyez pas les nouvelles demandes, messages et fins de travaux quand l’app est fermée.</span>
  ${pushSt === 'off' ? html`<br><button class="btn sm primary" style="margin-top:8px" data-action="push-on">🔔 Activer les notifications</button>` : html`<br><span class="small">${PUSH_MSG[pushSt]}</span>`}</div></div>`);
const PUSH_MSG = { off: '', on: '✓ Activées sur ce téléphone : le numéro sur l’icône indique ce qui attend une action.', denied: 'Bloquées : réactivez-les dans les réglages du téléphone (Notifications → cette app).', install: 'iPhone : installez d’abord l’app sur l’écran d’accueil, ouvrez-la depuis l’icône, puis activez-les ici.', unsupported: 'Non disponibles dans ce navigateur.' };
const pageHead = (title, sub, actions = '') => html`<div class="page-head"><div><h1>${title}</h1>${sub ? html`<p>${sub}</p>` : ''}</div>${actions}</div>`;
const yearSelect = (y) => html`<select data-input="year" style="width:auto;min-width:100px" aria-label="Année">${dataYears().map((yy) => html`<option value="${yy}" ${yy === y ? new Raw('selected') : ''}>${yy}</option>`)}</select>`;
const empty = (ic, text, action) => html`<div class="empty card">${icon(ic)}<p>${text}</p>${action ? html`<div style="margin-top:14px">${action}</div>` : ''}</div>`;

// Case d'un mois dans les grilles de loyers
function payCell(l, y, m, withDate) {
  const d = new Date();
  const cy = d.getFullYear(), cm = d.getMonth() + 1;
  const st = payState(l, y, m);
  const dueM = isDue(l, y, m);
  const past = ym(y, m) < ym(cy, cm);
  const cls = st.state === 'paid' ? 'paid' : st.state === 'part' ? 'part' : !dueM ? 'off' : past ? 'late' : '';
  const small = st.state === 'paid' ? (withDate && st.p.date ? fmtDate(st.p.date).replace(/ \d{4}$/, '') : '✓') : st.state === 'part' ? Math.round(st.paid) + '€' : dueM ? (past ? '!' : '·') : '–';
  const label = st.state === 'paid' ? 'payé' : st.state === 'part' ? `payé ${money(st.paid)} sur ${money(st.due)}` : 'non payé';
  return html`<button class="mcell ${cls} ${y === cy && m === cm ? 'now' : ''}" data-action="toggle-pay" data-loc="${l.id}" data-y="${y}" data-m="${m}" aria-label="${MONTHS_FULL[m - 1]} ${y} : ${label}">${MONTHS[m - 1]}<small>${small}</small></button>`;
}

// Lignes d'agenda et d'interventions (Maintenance)
// Carte de l'accueil : aujourd'hui et demain (poubelles à sortir la veille), interventions en retard
// Carte repliable : un clic ouvre / ferme ; ouverte, elle brille d'une lumière chaude et douce
const foldOpen = (() => { try { return new Set(JSON.parse(localStorage.getItem('aresFolds') || '[]')); } catch { return new Set(); } })();
document.addEventListener('toggle', (e) => {
  const d = e.target;
  if (!d.matches || !d.matches('details.dfold')) return;
  if (d.open) foldOpen.add(d.dataset.dfold); else foldOpen.delete(d.dataset.dfold);
  try { localStorage.setItem('aresFolds', JSON.stringify([...foldOpen])); } catch {}
}, true);
// 🔽 secteurs repliables (ouverts par défaut ; toucher le titre gris) — choix gardé sur l'appareil
const sfShutSet = (() => { try { return new Set(JSON.parse(localStorage.getItem('aresShut') || '[]')); } catch { return new Set(); } })();
{ const st = document.createElement('style'); st.textContent = '.sf-h::after{content:" ▾";opacity:.55}.sfold.shut>.sf-h::after{content:" ▸"}.sfold.shut>.sf-b{display:none}'; document.head.append(st); }
document.addEventListener('click', (e) => {
  const h = e.target.closest && e.target.closest('.sfold>.sf-h');
  if (!h) return;
  const c = h.parentElement, k = c.dataset.sfk;
  c.classList.toggle('shut');
  if (c.classList.contains('shut')) sfShutSet.add(k); else sfShutSet.delete(k);
  try { localStorage.setItem('aresShut', JSON.stringify([...sfShutSet])); } catch { /* plein */ }
});
const dfold = (key, title, sumTxt, body, style = '') => html`<details class="card dfold" data-dfold="${key}" style="${style}" ${foldOpen.has(key) ? new Raw('open') : ''}><summary><h3>${title}</h3><span class="sum">${sumTxt}</span></summary><div class="dfold-body">${body}</div></details>`;
function reportCollectes(immId, y) {
  const im = vault.get('immeubles', immId);
  const cs = vault.list('collectes').filter((c) => c.immId === immId).sort((a, b) => Object.keys(DECHETS).indexOf(a.cat) - Object.keys(DECHETS).indexOf(b.cat));
  const from = `${y}-01-01`, to = `${y}-12-31`;
  return html`<h1>Calendrier des collectes ${y}</h1>
    <p class="pr-sub">${im.adresse} — les dates ci-dessous sont les jours de <b>passage</b> du camion. Sortez les poubelles comme indiqué dans « Quand sortir » et rentrez-les après le passage.</p>
    <table class="tbl"><thead><tr><th>Collecte</th><th>Jour de passage</th><th>Quand sortir</th><th>Où déposer</th></tr></thead><tbody>
      ${cs.map((c) => html`<tr><td><b>${DECHETS[c.cat].label}</b></td><td>${c.mode === 'dates' ? plural(collecteDates(c, from, to).length, 'passage') + ' (voir ci-dessous)' : collecteRule(c)}</td><td><b>${sortieRule(c)}</b></td><td>${LIEUX[c.lieu] || ''}${c.note ? html`<br><span class="pr-sub">${c.note}</span>` : ''}</td></tr>`)}
    </tbody></table>
    <h2>Dates ${y}</h2>
    <table class="tbl pr-grid"><thead><tr><th>Mois</th>${cs.map((c) => html`<th>${DECHETS[c.cat].short}</th>`)}</tr></thead><tbody>
      ${MONTHS_FULL.map((mn, i) => {
        const a = `${y}-${String(i + 1).padStart(2, '0')}-01`, b = lastDay(y, i + 1);
        return html`<tr><td>${mn}</td>${cs.map((c) => html`<td>${collecteDates(c, a, b).map((d) => +d.slice(8)).join(', ')}</td>`)}</tr>`;
      })}
    </tbody></table>
    ${im.pubToken ? html`<div style="display:flex;gap:16px;align-items:center;margin-top:16px;border:1px solid #ccc;border-radius:10px;padding:10px 14px">
      <div class="qr" style="width:120px;flex:0 0 120px">${qrSvg(pubUrl(im), 4)}</div>
      <div><b>📱 Scannez : calendrier sur votre téléphone, rappel la veille.</b><br>Scansiona: calendario sul telefono, promemoria la sera prima.<br>Scannen: Kalender auf Ihrem Handy, Erinnerung am Vorabend.<br>Digitalize: calendário no telemóvel, aviso na véspera.<br>Scan: calendar on your phone, reminder the evening before.</div></div>` : ''}
    <p class="pr-sub" style="margin-top:14px">Une question ? ${brandName()}${societe().tel ? ' · ' + societe().tel : ''}</p>`;
}
const logOptions = (immId, sel) => html`<option value="">Parties communes / tout l'immeuble</option>${logsOf(immId).map((g) => html`<option value="${g.id}" ${g.id === sel ? new Raw('selected') : ''}>${logLabel(g)}</option>`)}`;
// Intervention terminée avec un coût : proposer de l'ajouter aux dépenses de l'immeuble (une seule fois)
// Coût d'une intervention terminée → dépense de l'appartement (ou des parties communes), automatiquement.
// Coût changé → dépense corrigée ; coût effacé ou intervention ré-ouverte → dépense retirée.
const depCat = (t) => (t.type === 'nettoyage' || t.type === 'entretien' ? 'entretien' : t.type === 'reparation' || t.type === 'gros' ? 'reparation' : 'autre');
async function syncDepense(t, quiet) {
  t = t && vault.get('taches', t.id);
  if (!t || t.recur) return;
  const dep = t.depId ? vault.get('depenses', t.depId) : null;
  const want = t.statut === 'fait' && t.cout > 0;
  const rec = { immId: t.immId, logId: t.logId || '', desc: t.titre, montant: t.cout, date: t.doneDate || today(), cat: depCat(t), tacheId: t.id };
  if (want && !dep && t.depSkip) return;
  if (want && !dep) {
    await vault.mutate((tx) => { const d = tx.put('depenses', rec); tx.put('taches', { id: t.id, depId: d.id }); }, 'Dépense ajoutée', `${t.titre} ${money(t.cout)}`, t.immId);
    if (!quiet) toast(`Coût ${money(t.cout)} ajouté aux dépenses — ${placeName(t)}`);
  } else if (want && dep && (dep.montant !== t.cout || dep.logId !== rec.logId || dep.immId !== rec.immId)) {
    await vault.mutate((tx) => tx.put('depenses', { id: dep.id, montant: t.cout, logId: rec.logId, immId: rec.immId, desc: rec.desc }), 'Dépense corrigée', `${t.titre} ${money(t.cout)}`, t.immId);
    if (!quiet) toast('Dépense corrigée');
  } else if (!want && t.depId) {
    await vault.mutate((tx) => { if (dep) tx.remove('depenses', dep.id); tx.put('taches', { id: t.id, depId: '' }); }, 'Dépense retirée', t.titre, t.immId);
    if (!quiet) toast('Dépense retirée (intervention non terminée ou sans coût)');
  }
}
const offerDepense = (t) => syncDepense(t);
// Facture jointe à une dépense (chiffrée, comme les autres documents)
// Logo de la société : réduit (400 px max), gardé dans le coffre chiffré
// Signature + timbre : PNG transparent, quel que soit le fichier (PNG, JPG, photo du téléphone) — le blanc du papier
// devient transparent (l'encre garde ses bords doux), les marges vides sont coupées, 1400 px de large au plus (≈ 300 dpi sur 12 cm)
async function cleanSignature(file) {
  const bmp = await createImageBitmap(file);
  const k0 = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k0); c.height = Math.round(bmp.height * k0);
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(bmp, 0, 0, c.width, c.height);
  const d = x.getImageData(0, 0, c.width, c.height), a = d.data;
  let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
  for (let i = 0; i < a.length; i += 4) {
    const l = a[i + 3] < 128 ? 255 : (a[i] + a[i + 1] + a[i + 2]) / 3;
    const al = Math.max(0, Math.min(255, Math.round(((235 - l) * 255) / 120)));
    a[i + 3] = Math.min(a[i + 3], al);
    if (al > 60) { const px = (i / 4) % c.width, py = Math.floor(i / 4 / c.width); if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py; }
  }
  if (x1 < 0) throw new Error('vide');
  x.putImageData(d, 0, 0);
  const m = 10; x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m); x1 = Math.min(c.width, x1 + m); y1 = Math.min(c.height, y1 + m);
  const w = x1 - x0, h = y1 - y0, k = Math.min(1, 1400 / w, 800 / h);
  const o = document.createElement('canvas'); o.width = Math.round(w * k); o.height = Math.round(h * k);
  o.getContext('2d').drawImage(c, x0, y0, w, h, 0, 0, o.width, o.height);
  return { url: o.toDataURL('image/png'), w: Math.round(w / k0), px: o.width };
}
// Aperçu de la signature sur une feuille A4 + qualité à l'impression (points par pouce réels à la largeur choisie)
const SIGN_W = [6, 8, 10, 12];
// met à jour seulement le bloc signature (les champs déjà tapés dans le formulaire Société restent)
const signRefresh = () => { const w = document.getElementById('signWrap'); if (w) setHtml(w, signBlock(societe())); };
const signDpi = (px, cm) => Math.round(px / (cm / 2.54));
function signBlock(st) {
  const steps = html`<ol class="small" style="margin:6px 0 0;padding-left:20px">
    <li>Signez et tamponnez sur une feuille blanche.</li>
    <li>Scannez-la à 300 ppp (600 ppp pour une impression plus grande), ou prenez une photo bien droite, avec une bonne lumière, sans ombre.</li>
    <li>Chargez le fichier ici (PNG ou JPG) : le fond devient transparent et les marges sont coupées automatiquement.</li>
    <li>Choisissez la largeur : regardez l’aperçu de la feuille et l’indicateur de qualité. Le timbre doit apparaître à peu près à sa taille réelle (mesurez-le avec une règle).</li></ol>`;
  const btn = html`<label class="btn sm ${st.signature ? '' : 'primary'}" style="cursor:pointer">✍️ ${st.signature ? 'Changer signature + timbre' : 'Charger signature + timbre'}<input type="file" accept="image/*" data-input="soc-sign" hidden></label>`;
  if (!st.signature) return html`<div class="full">${steps}<div style="margin-top:10px">${btn}</div>
    <p class="tiny muted" style="margin:6px 0 0">Le timbre doit être celui de la société indiquée ci-dessous.</p></div>`;
  const cm = SIGN_W.includes(+st.signW) ? +st.signW : 8, px = +st.signPx || 0, dpi = px ? signDpi(px, cm) : 0;
  const q = !px ? ['', '—', 'Rechargez l’image pour mesurer sa qualité.'] : dpi >= 250 ? ['ok', '✅ Nette à l’impression', ''] : dpi >= 150 ? ['warn', '🟡 Correcte', 'Pour un résultat plus net : scannez à 600 ppp, ou choisissez une largeur plus petite.'] : ['bad', '🔴 Floue à l’impression', 'Scannez la feuille à 300 ou 600 ppp (ou une photo plus grande), ou choisissez une largeur plus petite.'];
  const maxCm = px ? Math.floor((px / 250) * 2.54) : 0;
  return html`<div class="full sign-box">
    <div class="sign-a4" aria-label="Aperçu sur une feuille A4"><i style="width:60%"></i><i style="width:85%"></i><i style="width:85%"></i><i style="width:45%;margin-top:14px"></i>
      <img src="${st.signature}" alt="Signature + timbre" style="width:${cm * 10}px"><i style="width:30%"></i><span>A4 · 21 cm</span></div>
    <div class="sign-ctl">
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">${btn}<button class="btn sm ghost" type="button" data-action="soc-sign-del">Retirer</button></div>
      <label class="field" style="margin-top:10px">Largeur sur la feuille<select data-input="soc-sign-w">${SIGN_W.map((n) => html`<option value="${n}" ${cm === n ? new Raw('selected') : ''}>${n} cm${px ? ` — ${signDpi(px, n)} ppp` : ''}</option>`)}</select></label>
      <p style="margin:8px 0 0"><span class="badge ${q[0]}">${q[1]}</span>${dpi ? html` <span class="tiny muted">${dpi} ppp · image ${px} px</span>` : ''}</p>
      ${q[2] ? html`<p class="tiny" style="margin:6px 0 0">${q[2]}</p>` : ''}
      ${px && maxCm >= 6 && dpi < 250 ? html`<p class="tiny muted" style="margin:4px 0 0">Avec cette image, nette jusqu’à ${maxCm} cm de large.</p>` : ''}
      <details style="margin-top:8px"><summary class="small">Comment faire ?</summary>${steps}</details>
      <p class="tiny muted" style="margin:6px 0 0">Le timbre doit être celui de la société indiquée ci-dessous.</p>
    </div></div>`;
}
// 🎨 couleur du client = la couleur dominante de son logo (sans le blanc, le noir et le gris), assez foncée pour les boutons
function logoColor(c) {
  try {
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, b = {};
    for (let i = 0; i < d.length; i += 16) {
      if (d[i + 3] < 200) continue;
      const r = d[i], g = d[i + 1], bl = d[i + 2], mx = Math.max(r, g, bl), mn = Math.min(r, g, bl);
      if (mx - mn < 40 || mx < 40) continue;
      const k = (r >> 5) + ',' + (g >> 5) + ',' + (bl >> 5), o = b[k] || (b[k] = { w: 0, n: 0, r: 0, g: 0, b: 0 });
      o.w += 1 + (mx - mn) / 64; o.n++; o.r += r; o.g += g; o.b += bl;
    }
    const best = Object.values(b).sort((x, y) => y.w - x.w)[0];
    if (!best) return '';
    let rgb = [best.r, best.g, best.b].map((v) => v / best.n);
    const L = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
    if (L > 0.5) rgb = rgb.map((v) => v * 0.5 / L); // trop clair pour un bouton blanc sur couleur : on fonce
    return '#' + rgb.map((v) => Math.round(Math.min(255, v)).toString(16).padStart(2, '0')).join('');
  } catch { return ''; }
}
async function setLogo(file, field = 'logo') {
  if (field === 'signature') {
    try {
      const sign = await cleanSignature(file);
      await vault.mutate((tx) => tx.put('reglages', { id: 'main', signature: sign.url, signPx: sign.px }), 'Signature + timbre de la société', socName());
      // ≈ 300 points par pouce pour une impression nette : 700 px pour 6 cm, 950 px pour 8 cm
      if (sign.w < 700) toast(`Signature enregistrée, mais l’image est petite (${sign.w} px de large) : sur papier elle sera floue. Prenez une photo plus grande (1000 px ou plus).`, { bad: true });
      else toast('Signature + timbre enregistrés');
      signRefresh();
    } catch { toast('Image illisible : envoyez une photo ou un PNG / JPG de la signature sur fond blanc', { bad: true }); }
    return;
  }
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, (field === 'logo' ? 400 : 600) / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const url = c.toDataURL('image/png');
    const logo = url.length < 180000 ? url : c.toDataURL('image/jpeg', 0.85);
    const col = field === 'logo' ? logoColor(c) : '';
    await vault.mutate((tx) => tx.put('reglages', { id: 'main', [field]: logo, ...(col ? { color: col } : {}) }), field === 'logo' ? 'Logo de la société' : 'Signature + timbre de la société', socName());
    applyBrand();
    toast(field === 'logo' ? 'Logo enregistré' : 'Signature + timbre enregistrés');
    if (ui.sheet) { ui.sheet.rendered = false; renderSheet(); }
  } catch { toast('Image illisible', { bad: true }); }
}
async function attachFacture(dep, file) {
  if (file.size > 10 * 1024 * 1024) return toast('Fichier trop lourd (10 Mo maximum)', { bad: true });
  const img = /^image\//.test(file.type);
  const bytes = img ? await compressPhoto(file) : new Uint8Array(await file.arrayBuffer());
  const doc = await vault.mutate((tx) => { const x = tx.put('documents', { depId: dep.id, kind: 'facture', label: `Facture — ${dep.fournisseur || dep.desc}`, date: dep.date, size: bytes.length, mime: img ? 'image/jpeg' : file.type || 'application/pdf' }); tx.put('depenses', { id: dep.id, docId: x.id }); return x; }, 'Facture jointe', dep.desc, dep.immId);
  await vault.saveFile(doc.id, bytes);
  toast('Facture jointe');
}

const immHead = (cur, sub) => html`${pageHead('🏢 Immeubles', sub)}
  <div class="imm-row"><div class="tabs" role="tablist">${[['immeubles', '🏢 Immeubles'], ['locataires', '👥 Locataires']].map(([r, l, sh]) => masked().has(r) ? html`<span class="tab nav-masked" aria-disabled="true">🔒 MASQUÉ</span>` : html`<button class="tab" role="tab" aria-selected="${cur === r}" data-action="go" data-to="${r}">${sh ? html`<span class="t-lg">${l}</span><span class="t-sm">${sh}</span>` : l}</button>`)}</div>
    <div class="imm-btns"><button class="btn primary" data-action="new-imm">${icon('plus')} Immeuble</button><button class="btn primary" data-action="new-loc">${icon('plus')} Locataire</button></div></div>`;
// 👥 Locataires : Actuels | Anciens | 💶 Gestion locataire (paiements des loyers)
const locTabs = (cur, nGone) => html`<div class="tabs loc-tabs" role="tablist" style="max-width:560px">
  <button class="tab" role="tab" aria-selected="${cur === 'actuels'}" data-action="loc-seg" data-id="actuels">Actuels</button>
  <button class="tab" role="tab" aria-selected="${cur === 'anciens'}" data-action="loc-seg" data-id="anciens">Anciens (${nGone})</button>
  ${masked().has('paiements') ? html`<span class="tab nav-masked" aria-disabled="true">🔒 MASQUÉ</span>` : html`<button class="tab" role="tab" aria-selected="${cur === 'paiements'}" data-action="go" data-to="paiements"><span class="t-lg">💶 Gestion locataire</span><span class="t-sm">💶 Gestion loc.</span></button>`}</div>`;
// ── Fiche d'engagement (ouvriers occasionnels, sociétés) : assurance, paiement, obligations, signature digitale ──
// horaire fixe : ménage régulier, ou personnel interne de gestion quotidienne ; les ouvriers reçoivent jour/heure/lieu à chaque travail
const horFixed = (i) => i.metier === 'menage' || ((i.genre || 'interne') === 'interne' && (i.cat || 'quotidien') === 'quotidien');
// Comptes bancaires : longueur de l'IBAN par pays (Europe + voisins) et contrôle modulo 97 ; BIC du même pays
const IBAN_LEN = { AD: 24, AL: 28, AT: 20, BA: 20, BE: 16, BG: 22, BR: 29, CH: 21, CY: 28, CZ: 24, DE: 22, DK: 18, EE: 20, ES: 24, FI: 18, FO: 18, FR: 27, GB: 22, GI: 23, GL: 18, GR: 27, HR: 21, HU: 28, IE: 22, IS: 26, IT: 27, LI: 21, LT: 20, LU: 20, LV: 21, MA: 28, MC: 27, MD: 24, ME: 22, MK: 19, MT: 31, NL: 18, NO: 15, PL: 28, PT: 25, RO: 24, RS: 22, SE: 24, SI: 19, SK: 24, SM: 27, TN: 24, TR: 26, UA: 29, VA: 22, XK: 20 };
const ibanClean = (v) => String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const ibanFmt = (v) => ibanClean(v).replace(/(.{4})/g, '$1 ').trim();
function ibanCheck(v) {
  const x = ibanClean(v), cc = x.slice(0, 2);
  if (!x) return { ok: false, msg: 'IBAN obligatoire' };
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(x)) return { ok: false, msg: 'Doit commencer par le pays et 2 chiffres (ex. FR76…, LU28…, IT60…)' };
  if (!IBAN_LEN[cc]) return { ok: false, msg: `Pays « ${cc} » inconnu pour un IBAN` };
  if (x.length !== IBAN_LEN[cc]) return { ok: false, msg: `IBAN ${cc} : ${IBAN_LEN[cc]} caractères attendus, ${x.length} écrits` };
  let r = 0;
  for (const ch of x.slice(4) + x.slice(0, 4)) { const d = /\d/.test(ch) ? ch : String(ch.charCodeAt(0) - 55); for (const c of d) r = (r * 10 + +c) % 97; }
  if (r !== 1) return { ok: false, msg: 'Clé de contrôle fausse : un chiffre est mal recopié' };
  return { ok: true, cc, msg: `✓ IBAN ${cc} valide` };
}
function bicCheck(v, cc) {
  const x = String(v || '').toUpperCase().replace(/\s/g, '');
  if (!x) return { ok: false, msg: 'BIC obligatoire' };
  if (!/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(x)) return { ok: false, msg: '8 ou 11 caractères : 4 lettres banque + 2 lettres pays + 2 (+3) (ex. BNPAFRPPXXX)' };
  if (cc && x.slice(4, 6) !== cc) return { ok: false, msg: `Le BIC est du pays ${x.slice(4, 6)}, l’IBAN du pays ${cc}` };
  return { ok: true, msg: '✓ BIC valide' };
}
// BIC des principales banques luxembourgeoises, d'après le code banque de l'IBAN (LUkk BBB…) : proposé si la case est vide
const LU_BIC = { '001': ['BCEELULL', 'Spuerkeess'], '002': ['BILLLULL', 'BIL'], '003': ['BGLLLULL', 'BGL BNP Paribas'], '009': ['CCRALULL', 'Raiffeisen'], '014': ['CELLLULL', 'ING Luxembourg'], '111': ['CCPLLULL', 'POST Luxembourg'] };
function bankMsgs(f) {
  const ib0 = ibanCheck(f.iban.value), x = ibanClean(f.iban.value);
  if (ib0.ok && ib0.cc === 'LU' && !f.bic.value.trim() && LU_BIC[x.slice(4, 7)]) { f.bic.value = LU_BIC[x.slice(4, 7)][0]; if (f.banque && !f.banque.value.trim()) f.banque.value = LU_BIC[x.slice(4, 7)][1]; }
  const ib = ib0, bc = bicCheck(f.bic.value, ib.ok ? ib.cc : '');
  for (const [k, r, v] of [['iban', ib, f.iban.value], ['bic', bc, f.bic.value]]) { const m = f.querySelector(`.bank-msg[data-for=${k}]`); if (m) { m.textContent = v.trim() ? r.msg : ''; m.className = `bank-msg tiny ${r.ok ? 'green' : 'red'}`; } }
  return { ib, bc };
}
const frD = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
// 👥 Centrale : le responsable (clé principale) et les opérateurs (centraliste, comptable — mot de passe personnel, voir store.js)
const OP_ROLES = { centraliste: 'Centraliste', comptable: 'Comptable' };
const centraleConf = () => vault.get('reglages', 'centrale') || {};
const centraleResp = () => [centraleConf().prenom, centraleConf().nom].filter(Boolean).join(' ');
const whoLabel = () => (vault.op ? `${vault.op.name} (${OP_ROLES[vault.op.role] || vault.op.role})` : centraleResp() ? `${centraleResp()} (Directeur)` : '');
const isCompta = () => !!(vault.op && vault.op.role === 'comptable');
const opsListHtml = () => { const ops = ui.ops || []; return ops.length ? html`<div class="list" style="margin-bottom:10px">${ops.map((o) => html`<div class="row"><span class="avatar">👤</span><span class="grow"><span class="title" style="display:block">${o.name}</span><span class="meta">${OP_ROLES[o.role] || o.role} · <span>identifiant</span> ${o.login}</span></span>${vault.op && vault.op.id === o.id ? html`<span class="badge">vous</span>` : html`<button class="btn sm ghost danger" data-action="op-del" data-id="${o.id}">Retirer</button>`}</div>`)}</div>` : html`<p class="small muted" style="margin:0 0 10px">Aucun opérateur pour l’instant.</p>`; };
function centraleSection() {
  const c = centraleConf();
  if (isCompta()) return html`<div class="section-label">👥 Centrale</div><div class="card" style="margin-bottom:14px"><p style="margin:0">👤 Connecté : <b>${vault.op.name}</b> · ${OP_ROLES[vault.op.role] || ''}</p>${centraleResp() ? html`<p class="small muted" style="margin:6px 0 0">Responsable : ${centraleResp()}</p>` : ''}</div>`;
  // la liste arrive du serveur : on ne redessine que la liste (sinon ce qu'on est en train d'écrire serait effacé)
  if (ui.ops == null && navigator.onLine) { ui.ops = []; vault.operators().then((l) => { ui.ops = l; const box = $('#opsList'); if (box) setHtml(box, opsListHtml()); }).catch(() => { ui.ops = null; }); }
  return html`<div class="section-label">👥 Centrale : responsable et opérateurs</div>
    ${vault.op ? html`<p class="small" style="margin:0 0 8px">👤 Connecté : <b>${vault.op.name}</b> · ${OP_ROLES[vault.op.role] || ''}</p>` : ''}
    <div class="list settings" style="margin-bottom:12px">
      <button class="row" data-action="centrale-edit"><span class="avatar">⭐</span><span class="grow"><span class="title" style="display:block">Responsable de la centrale</span><span class="meta">${centraleResp() ? [centraleResp(), c.tel, c.email].filter(Boolean).join(' · ') : 'à compléter'}</span><span class="meta" style="display:block">Affiché sur vos documents.</span></span><span class="chev">›</span></button>
    </div>
    <div class="card" style="margin-bottom:14px">
      <b>👤 Opérateurs</b><p class="tiny muted" style="margin:2px 0 8px">Centraliste ou comptable : chacun se connecte avec son identifiant et son mot de passe (« 👤 Connexion opérateur » sur l’écran de verrouillage), sans connaître la clé d’accès du directeur. Le centraliste gère tout, y compris les accès des opérateurs. Le comptable voit tout, s’occupe des factures, mais n’affecte pas les travaux et ne gère pas les accès. Retirer un opérateur lui coupe l’accès tout de suite.</p>
      <div id="opsList">${opsListHtml()}</div>
      <button class="btn sm" data-action="op-new">${icon('plus')} Opérateur</button>
    </div>`;
}
// « Voir plus » : 10 lignes de plus à chaque toucher
const moreBtn = (total, lim) => (total > lim ? html`<button class="btn block" style="margin-top:12px" data-action="cp-more">⬇ Voir plus (${Math.min(10, total - lim)} sur ${total - lim} restantes)</button><p class="tiny muted" style="text-align:center;margin:6px 0 0">${lim} sur ${total} affichées</p>` : total > 10 ? html`<p class="tiny muted" style="text-align:center;margin:10px 0 0">Tout est affiché (${total})</p>` : '');

// ───────── 📊 Rapports & exports : contacts, travaux, heures, retards, totaux — filtres, colonnes au choix, Excel (.xlsx) ou PDF ─────────
const RPT_SRC = {
  contacts: ['👥 Contacts', [['cat', 'Catégorie'], ['nom', 'Nom'], ['prenom', 'Prénom'], ['soc', 'Société'], ['email', 'Email'], ['tel', 'Téléphone'], ['adr', 'Adresse'], ['info', 'Détail']], ['cat', 'nom', 'prenom', 'email', 'tel']],
  retards: ['⏰ Retards', [['type', 'Type de retard'], ['date', 'Date prévue / échéance'], ['qui', 'Qui'], ['quoi', 'Quoi / où'], ['j', 'Retard (jours)'], ['min', 'Retard (minutes)'], ['montant', 'Montant (€)']], null],
  totaux: ['📈 Totaux', [['ind', 'Indicateur'], ['val', 'Valeur']], null],
};
const RPT_WHO = { loc: 'Locataires' };
const RPT_LATE = { loyer: 'Loyers impayés' };
const rptDef = () => ({ src: 'contacts', from: today().slice(0, 4) + '-01-01', to: today(), who: Object.keys(RPT_WHO), late: Object.keys(RPT_LATE), genre: Object.keys(INT_GENRES), withMail: false, withTel: false, ttype: '', tstat: '', persons: null, orgs: null, lieux: null, q: '', cols: {} });
const rptCfg = () => (ui.rpt = ui.rpt || rptDef());
// filtres à cocher : personnes, sociétés (gérances), lieux — null = tous
const rptPlace = (t) => (t.immId && !t.lieu ? 'i:' + t.immId : 'l:' + String((t.lieu && (t.lieu.adr || t.lieu.nom)) || (t.ptl && (t.ptl.adr || t.ptl.res)) || (t.dev && (t.dev.adr || t.dev.client)) || '').toLowerCase().replace(/\s+/g, ' ').trim());
const rptOrg = (t) => (t.ptl ? t.ptl.org || '' : '');
const rptOk = (t, c) => (!c.persons || c.persons.includes(t.intervenantId || '')) && (!c.orgs || c.orgs.includes(rptOrg(t))) && (!c.lieux || c.lieux.includes(rptPlace(t)));
const rptCols = (c) => c.cols[c.src] || RPT_SRC[c.src][2] || RPT_SRC[c.src][1].map(([k]) => k);
const daysBetween = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5);
const inPer = (d, c) => d && d >= c.from && d <= c.to;
function rptRetards(c) {
  const out = [], T = today(), on = new Set(c.late), pers = (t) => rptOk(t, c);
  if (on.has('loyer') && !c.persons && !c.orgs && !c.lieux) {
    for (const l of currentLocs()) {
      for (let y = +c.from.slice(0, 4); y <= +c.to.slice(0, 4); y++) for (let m = 1; m <= 12; m++) {
        const d = `${y}-${String(m).padStart(2, '0')}-01`;
        if (d > T || !inPer(d, c) || !isDue(l, y, m)) continue;
        const st = payState(l, y, m);
        if (st.rest > 0.009 && (y < +T.slice(0, 4) || m < +T.slice(5, 7))) out.push({ type: RPT_LATE.loyer, date: d, qui: fullName(l), quoi: [logName(l.logId), immName(l.immId)].filter(Boolean).join(' · '), j: daysBetween(d, T), min: '', montant: Math.round(st.rest * 100) / 100 });
      }
    }
  }
  return out.sort((a, b) => a.type.localeCompare(b.type) || a.date.localeCompare(b.date));
}
function rptRows(c) {
  if (c.src === 'contacts') {
    const out = [], who = new Set(c.who), add = (cat, o) => out.push({ cat, ...o });
    if (who.has('loc')) for (const l of currentLocs()) add(RPT_WHO.loc, { nom: l.nom || '', prenom: l.prenom || '', soc: '', email: l.mail || '', tel: l.tel || '', adr: [logName(l.logId), immName(l.immId)].filter(Boolean).join(' · '), info: '' });
    return out.filter((r) => (!c.withMail || r.email) && (!c.withTel || r.tel)).sort((a, b) => a.cat.localeCompare(b.cat) || (a.nom || a.soc).localeCompare(b.nom || b.soc));
  }
  if (c.src === 'retards') return rptRetards(c);
  // totaux de la période : loyers impayés
  const rc = rptRetards({ ...c, late: ['loyer'] });
  return [['Loyers impayés (mois)', rc.length], ['Loyers impayés (€)', Math.round(rc.reduce((n, r) => n + (+r.montant || 0), 0) * 100) / 100]].map(([ind, val]) => ({ ind, val }));
}
const rptVal = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v.split('-').reverse().join('/') : v ?? '');
const rptTable = (c) => { const cols = rptCols(c), L = Object.fromEntries(RPT_SRC[c.src][1]); const rows = rptRows(c); return { head: cols.map((k) => L[k]), rows: rows.map((r) => cols.map((k) => rptVal(r[k]))), n: rows.length }; };
const rptTitle = (c) => `${RPT_SRC[c.src][0].replace(/^\S+\s/, '')}${c.src === 'contacts' ? '' : ` ${fmtDate(c.from)} – ${fmtDate(c.to)}`}`;
const rptChk = (k, v, on, label) => html`<label class="chip" style="cursor:pointer"><input type="checkbox" data-input="rpt-arr" data-k="${k}" value="${v}" ${on ? new Raw('checked') : ''} class="rpt-cb">${label}</label>`;
function rptView() {
  const c = rptCfg(), L = RPT_SRC[c.src], cols = rptCols(c), tb = rptTable(c);
  const saved = ((vault.get('reglages', 'rapports') || {}).list) || [];
  const y = +today().slice(0, 4), m = today().slice(0, 7);
  const per = c.src === 'contacts' ? '' : html`<div class="fields" style="margin-bottom:6px">
      <label class="field">Du<input type="date" data-input="rpt" data-k="from" value="${c.from}"></label><label class="field">Au<input type="date" data-input="rpt" data-k="to" value="${c.to}"></label></div>
    <div class="chips" style="margin-bottom:10px">${[['Ce mois', m + '-01', today()], ['Cette année', y + '-01-01', today()], ['Année ' + (y - 1), (y - 1) + '-01-01', (y - 1) + '-12-31'], ['Depuis le début', '2000-01-01', today()]].map(([l, f, t]) => html`<button class="chip" data-action="rpt-per" data-f="${f}" data-t="${t}" aria-pressed="${c.from === f && c.to === t}">${l}</button>`)}</div>`;
  const filters = c.src === 'contacts' ? html`<div class="chips" style="margin-bottom:8px">${Object.entries(RPT_WHO).map(([k, l]) => rptChk('who', k, c.who.includes(k), l))}</div>
      <div class="chips">${rptChk('withMail', '1', c.withMail, 'Seulement avec email')}${rptChk('withTel', '1', c.withTel, 'Seulement avec téléphone')}</div>`
    : '';
  return html`<button class="btn sm ghost" style="margin-bottom:8px" data-action="rpt-back">← Statistiques</button>${pageHead('🖨️ Statistiques sur mesure', 'Statistiques : choisissez quoi, filtrez, cochez les colonnes, puis Excel ou PDF.')}
    <div class="chips" style="margin-bottom:12px">${Object.entries(RPT_SRC).map(([k, [l]]) => html`<button class="chip" data-action="rpt-src" data-id="${k}" aria-pressed="${c.src === k}">${l}</button>`)}</div>
    ${saved.length ? html`<div class="section-label">⭐ Mes listes</div><div class="chips" style="margin-bottom:12px">${saved.map((s) => html`<span class="chip" style="display:inline-flex;gap:6px;align-items:center"><button style="border:0;background:none;font:inherit;color:inherit;cursor:pointer;padding:0" data-action="rpt-load" data-id="${s.id}">${s.nom}</button><button style="border:0;background:none;cursor:pointer;padding:0" data-action="rpt-del" data-id="${s.id}" aria-label="Supprimer">✕</button></span>`)}</div>` : ''}
    <div class="card" style="margin-bottom:12px"><div class="section-label" style="margin-top:0">Filtres</div>${per}${filters}</div>
    <div class="card" style="margin-bottom:12px"><div class="section-label" style="margin-top:0">Colonnes</div><div class="chips">${L[1].map(([k, l]) => html`<label class="chip" style="cursor:pointer"><input type="checkbox" data-input="rpt-col" value="${k}" ${cols.includes(k) ? new Raw('checked') : ''} class="rpt-cb">${l}</label>`)}</div></div>
    <div class="rpt-acts">
      <button class="btn primary" data-action="rpt-xlsx" ${tb.n && cols.length ? '' : new Raw('disabled')}>⬇️ Excel (.xlsx)</button>
      <button class="btn" data-action="rpt-print" ${tb.n && cols.length ? '' : new Raw('disabled')}>🖨️ Imprimer / PDF</button>
      <span class="rpt-save"><input id="rptName" placeholder="Nom de la liste (ex. Téléphones collaborateurs)" style="min-width:220px"><button class="btn" data-action="rpt-save">💾 Enregistrer dans Mes listes</button></span></div>
    <div class="section-label">Aperçu — lignes : ${tb.n}</div>
    ${tb.n && cols.length ? html`<div style="overflow-x:auto"><table class="tbl rpt-tbl"><thead><tr>${tb.head.map((h) => html`<th>${h}</th>`)}</tr></thead><tbody>${tb.rows.slice(0, 300).map((r) => html`<tr>${r.map((v) => html`<td>${v}</td>`)}</tr>`)}</tbody></table></div>${tb.n > 300 ? html`<p class="tiny muted">Aperçu limité à 300 lignes ; l’export contient tout.</p>` : ''}` : html`<p class="muted">Rien avec ces filtres.</p>`}`;
}

const VIEWS = {
  rapports() { return rptView(); },

  dashboard() {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const locs = currentLocs().sort(byName);
    const due = locs.filter((l) => isDue(l, y, m));
    const expected = sum(due, (l) => dueAmount(l, y, m));
    const received = sum(vault.list('locataires'), (l) => { const p = payment(l.id, y, m); return p ? paidAmount(p, l) : 0; });
    const todo = due.filter((l) => payState(l, y, m).rest > 0.009);
    const revisions = locs.filter((l) => l.revision && daysUntil(l.revision) <= 60).sort((a, b) => a.revision.localeCompare(b.revision));
    const ownerDueMonth = sum(imms0().filter((im) => isOwnerDue(im, y, m)), ownerRent);
    const fraisMois = fraisOfMonth(y, m);
    const verseMois = sum(vault.list('versements').filter((v) => v.y === y && v.m === m), (v) => v.montant);
    const depMois = sum(vault.list('depenses').filter((d) => (d.date || '').startsWith(`${y}-${String(m).padStart(2, '0')}`)), (d) => d.montant);
    const prevu = expected - ownerDueMonth - fraisMois;
    const realise = received - verseMois - fraisMois - depMois;
    const parts = associes();
    const late = locs.map((l) => ({ l, months: lateMonths(l, now) })).filter((x) => x.months.length >= 1).sort((a, b) => b.months.length - a.months.length);
    const expiring = locs.map((l) => ({ l, d: daysToEnd(l) })).filter((x) => x.d != null && x.d >= 0 && x.d <= 60 && !x.l.sortie).sort((a, b) => a.d - b.d);
    const leaving = locs.filter((l) => l.sortie && daysUntil(l.sortie) >= 0 && daysUntil(l.sortie) <= 60).sort((a, b) => a.sortie.localeCompare(b.sortie));
    const arriving = locs.filter((l) => isFuture(l)).sort(byDebut);
    const outside = vault.list('locataires').filter((l) => outsidePays(l).length).sort(byName);
    const imms = vault.list('immeubles').filter((im) => !immGone(im)).sort(byAddr);
    const logs = vault.list('logements').filter((g) => !immGone(vault.get('immeubles', g.immId)));
    const vacants = logs.filter((g) => !occupantsNow(g.id).length);
    const ownerTodo = imms.filter((im) => isOwnerDue(im, y, m) && !versement(im.id, y, m));
    const p = pct(received, expected);
    const alertBtn = (cls, ic, action, id, content) => html`<button class="alert ${cls}" style="width:100%;border:0;font:inherit;text-align:left;cursor:pointer" data-action="${action}" data-id="${id}">${icon(ic)}<div>${content}</div></button>`;

    if (!imms.length && !locs.length) {
      return html`${pushNudge()}${centralinoHtml()}${html`${pageHead('Bienvenue', 'Commencez par ajouter un immeuble, puis ses logements et locataires.')}
        ${empty('building', 'Aucun immeuble pour le moment.', html`<button class="btn primary" data-action="new-imm">${icon('plus')} Immeuble</button>`)}`}`;
    }

    const nudge = !vault.get('reglages', 'recSplit') ? html`<div class="alert bad" style="margin-bottom:14px;align-items:center">${icon('shield')}<div style="flex:1"><b>🧩 Activez la récupération de votre clé.</b> Sans elle, une clé d'accès oubliée = toutes vos données perdues. 1 minute, et personne d'autre ne peut lire vos données.</div><button class="btn sm primary" data-action="make-recovery">Activer</button></div>` : !(vault.get('reglages', 'recSplit') || {}).both ? html`<div class="alert bad" style="margin-bottom:14px;align-items:center">${icon('shield')}<div style="flex:1"><b>🧩 Refaites votre kit de récupération.</b> La moitié B était gardée par l’ancienne centrale principale, qui n’existe plus : créez un nouveau kit et gardez vous-même les deux moitiés, à deux endroits différents.</div><button class="btn sm primary" data-action="make-recovery">Refaire</button></div>` : vault.hasRecovery === false ? html`<div class="alert warn" style="margin-bottom:14px;align-items:center">${icon('shield')}<div style="flex:1"><b>Pas encore de clé de secours.</b> Sans elle, une clé d'accès oubliée rend les données irrécupérables.</div><button class="btn sm" data-action="make-recovery">Créer</button></div>` : '';
    const sig = newSignals();
    const sigBox = sig.length ? html`<div class="card mk mk-int mk-on" style="margin-bottom:14px">
        <div class="card-title" style="margin-bottom:8px"><h3>📩 <span>${sig.length > 1 ? sig.length + " nouveaux messages" : "1 nouveau message"}${sig.every((t) => !t.byInterv) ? (sig.length > 1 ? ' de locataires' : ' de locataire') : ''}</span></h3></div>
        <div class="stack">${sig.slice(0, 8).map((t) => { const l = vault.get('locataires', t.locId) || {}, w = null; const n = signalPhotos(t); return alertBtn('bad', 'msg', 'open-signal', t.id, html`<b>${fullName(l)}</b> · ${logName(l.logId) || immName(t.immId)} — ${t.titre.replace(/^Signalement : /, '').replace(/^Problème signalé par [^:]+ : /, '⚠️ ')}<div class="tiny">${fmtDateTime(t.sentAt)}${n ? ` · 📷 ${n} photo${n > 1 ? 's' : ''}` : ''} · touchez pour lire</div>`); })}</div>
      </div>` : '';
    const virs = vault.list('locataires').filter((l) => l.virSignal && !l.virSignal.vu);
    const edlNew = [...new Set(edlOutNew().map((d) => d.logId))].filter((id) => vault.get('logements', id));
    const edlBox = edlNew.length ? html`<div class="stack" style="margin-bottom:14px">${edlNew.map((id) => { const ph = edlOutNew().filter((d) => d.logId === id), w = vault.get('locataires', ph[0].locId); return alertBtn('info', 'camera', 'open-edl-out', id, html`📷 <b>${plural(ph.length, 'photo')} de sortie</b> à contrôler — ${logName(id)}${w ? ' · ' + fullName(w) : ''}<div class="tiny">touchez pour comparer avec vos photos d’entrée</div>`); })}</div>` : '';
    const virBox = virs.length ? html`<div class="stack" style="margin-bottom:14px">${virs.map((l) => alertBtn('info', 'wallet', 'open-vir', l.id, html`💳 <b>${fullName(l)}</b> dit avoir payé${l.virSignal.montant ? html` <b>${money(l.virSignal.montant)}</b>` : ''} par ${PAY_VIA[l.virSignal.via || 'vir']} — ${l.virSignal.ref}<div class="tiny">${fmtDateTime(l.virSignal.t)} · vérifiez la réception, puis cochez le mois payé</div>`))}</div>` : '';
    const bailBox = (() => {
      const al = imms0().map((im) => [im, bailAlert(im)]).filter(([, a]) => a).sort((x, y) => x[1].left - y[1].left);
      const revB = imms0().filter((im) => isBailPrincipal(im) && im.bailRev && daysUntil(im.bailRev) >= -15 && daysUntil(im.bailRev) <= 60);
      const lose = imms0().filter((im) => isBailPrincipal(im) && ownerRent(im)).map((im) => [im, rentaMois(im)]).filter(([, r]) => r.net < 0);
      if (!al.length && !lose.length && !revB.length) return '';
      return html`<div class="stack" style="margin-bottom:14px">${al.map(([im, a]) => alertBtn(a.limLeft != null && a.limLeft <= 30 ? 'bad' : 'warn', 'calendar', 'bail-open', im.id, html`📅 <b>${im.adresse}</b> : bail principal ${a.left >= 0 ? html`jusqu’au <b>${fmtDate(im.bailFin)}</b> (${plural(a.left, 'jour')})` : html`terminé le ${fmtDate(im.bailFin)}`}
        <div class="tiny">${a.lim ? (a.limLeft >= 0 ? html`✉️ Préavis de ${a.pm} mois : recommandé à envoyer <b>avant le ${fmtDate(a.lim)}</b> (${plural(a.limLeft, 'jour')})` : html`⚠️ Date du préavis (${fmtDate(a.lim)}) dépassée — vérifiez le contrat`) : 'Indiquez le préavis du contrat (mois) dans la fiche de l’immeuble'} · ${BAIL_DEC[im.bailDec || '']} · 📄 lettre A4 dans la fiche</div>`))}
        ${revB.map((im) => alertBtn('info', 'chart', 'edit-imm', im.id, html`🔄 <b>${im.adresse}</b> : révision du loyer au bailleur le <b>${fmtDate(im.bailRev)}</b> (${plural(Math.max(0, daysUntil(im.bailRev)), 'jour')})<div class="tiny">Loyer actuel ${money(ownerRent(im))} / mois · mettez le nouveau loyer dans la fiche : la rentabilité se recalcule</div>`))}
        ${lose.map(([im, r]) => alertBtn('bad', 'alert', 'bail-open', im.id, html`🔴 <b>${im.adresse}</b> : perd <b>${money(-r.net)} / mois</b><div class="tiny">${rentaLine(r)}${r.vides ? html` · <span>${r.vides} logement(s) vide(s)</span>` : ''}</div>`))}</div>`;
    })();
    const appsVer = (() => { try { return localStorage.getItem('aresAppsVer') || ''; } catch { return 'x'; } })(), verMM = VERSION.split('.').slice(0, 2).join('.');
    const appsBox = appsVer !== verMM && vault.list('locataires').some((x) => x.espace && x.espace.on) ? html`<div class="alert info" style="margin-bottom:14px;align-items:center">🆕<div style="flex:1"><b>Mise à jour importante (v${verMM})</b> : mettez à jour ${"les apps des locataires"} pour qu’elles reçoivent les nouveautés.</div><button class="btn sm primary" data-action="apps-refresh-all">🔄 Tout mettre à jour</button></div>` : '';
    return html`
      
      ${pushNudge()}
      ${bailBox}
      ${appsBox}
      
      ${nudge}
      ${sigBox}
      ${centralinoHtml()}
      
      ${virBox}
      ${edlBox}
      ${imms.length || locs.length ? html`      ${pageHead(MONTHS_FULL[m - 1] + ' ' + y, `${plural(locs.length, 'locataire')} · ${plural(imms.length, 'immeuble')}${logs.length ? ' · ' + plural(logs.length, 'logement') : ''}`)}
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
        <div class="metric"><div class="lbl">Bailleurs / mois</div><div class="val">${money(ownerDueMonth)}</div><div class="sub">bail principal</div></div>
      </div>

      ${dfold('res', `Résultat de ${MONTHS_FULL[m - 1].toLowerCase()}`, html`Net prévu <b class="${prevu < 0 ? 'red' : 'accent'}">${money(prevu)}</b> · réalisé <b class="${realise < 0 ? 'red' : ''}">${money(realise)}</b>`, html`
        <dl class="kv small">
          <dt>Loyers attendus</dt><dd class="num">${money(expected)}</dd>
          <dt>Bailleurs</dt><dd class="num">${ownerDueMonth ? '−' + money(ownerDueMonth) : '—'}</dd>
          <dt>Frais fixes (salaires, bureau…)</dt><dd class="num">${fraisMois ? '−' + money(fraisMois) : html`<a href="#" data-action="open-frais">à saisir</a>`}</dd>
          <dt><b>Net prévu</b></dt><dd class="num"><b class="${prevu < 0 ? 'red' : 'accent'}">${money(prevu)}</b></dd>
          <dt>Net réalisé à ce jour</dt><dd class="num ${realise < 0 ? 'red' : ''}">${money(realise)}</dd>
          ${parts.map((a) => html`<dt>Part de ${a.nom} (${a.part}%)</dt><dd class="num">${money((prevu * a.part) / 100)}</dd>`)}
        </dl>
        ${!parts.length ? html`<p class="tiny muted" style="margin-top:8px"><a href="#" data-action="open-societe">Ajouter les associés</a> pour voir la part de chacun.</p>` : ''}
        <button class="btn sm ghost" style="margin-top:8px" data-action="open-frais">${icon('edit')} Frais fixes</button>`, 'margin-top:10px')}` : ''}

      ${late.length || expiring.length || leaving.length || arriving.length || vacants.length || revisions.length || outside.length ? html`<div class="section-label">À surveiller</div><div class="stack">
        
        ${outside.map((l) => alertBtn('warn', 'calendar', 'fix-dates', l.id, html`<b>${fullName(l)}</b> — ${plural(outsidePays(l).length, 'loyer')} payé${outsidePays(l).length > 1 ? 's' : ''} hors des dates du contrat : touchez pour corriger`))}
    ${late.slice(0, 6).map(({ l, months }) => alertBtn(months.length >= 2 ? 'bad' : 'warn', 'alert', 'open-loc', l.id, html`<b>${fullName(l)}</b> — ${months.length} mois impayé${months.length > 1 ? 's' : ''} (${months.map((x) => MONTHS[x - 1]).join(', ')})`))}
    ${leaving.map((l) => alertBtn('warn', 'calendar', 'open-loc', l.id, html`<b>${fullName(l)}</b> quitte ${logName(l.logId) || 'le logement'} le ${fmtDate(l.sortie)}`))}
    ${[...new Set(recusAll().map((d) => d.locId))].map((lid) => { const l = vault.get('locataires', lid), n = recusAll().filter((d) => d.locId === lid).length; return alertBtn('info', 'file', 'open-loc-docs', lid, html`📥 <b>${fullName(l)}</b> a envoyé ${plural(n, 'document')} — à vérifier<div class="tiny">touchez pour voir, accepter ou refuser</div>`); })}
    ${arriving.map((l) => alertBtn('info', 'users', 'open-loc', l.id, html`<b>${fullName(l)}</b> arrive dans ${logName(l.logId) || immName(l.immId)} le ${fmtDate(l.debut)}`))}
    ${expiring.map(({ l, d }) => alertBtn('warn', 'calendar', 'renew', l.id, html`<b>${fullName(l)}</b> — fin de contrat ${d === 0 ? "aujourd'hui" : `dans ${plural(d, 'jour')}`} (${fmtDate(l.fin)}). Toucher pour prolonger.`))}
    ${revisions.map((l) => alertBtn('info', 'chart', 'index', l.id, html`<b>${fullName(l)}</b> — révision du loyer ${daysUntil(l.revision) < 0 ? 'prévue depuis le' : 'prévue le'} ${fmtDate(l.revision)} (${money(l.loyer)}). Toucher pour réviser.`))}
    ${vacants.slice(0, 6).map((g) => alertBtn('info', 'home', 'open-log', g.id, html`<b>${logLabel(g)}</b> (${immName(g.immId)}) est vacant`))}
  </div>` : ''}

      <div class="section-label">À encaisser — ${MONTHS_FULL[m - 1]}</div>
      ${todo.length ? html`<div class="list">${todo.map((l) => html`
        <div class="row">
          <button class="avatar" style="border:0;cursor:pointer" data-action="open-loc" data-id="${l.id}">${avIn(l)}</button>
          <div class="grow"><div class="title">${fullName(l)}</div><div class="meta">${payState(l, y, m).state === 'part' ? html`<span class="amber">payé ${money(payState(l, y, m).paid)} · reste</span> ` : ''}${whereOf(l)}</div></div>
          <div class="amount">${money(payState(l, y, m).rest)}</div>
          <button class="btn icon sm ghost" data-action="relance" data-id="${l.id}" aria-label="Relancer" title="Relancer">${icon('msg')}</button>
          <button class="btn sm primary" data-action="pay" data-loc="${l.id}" data-y="${y}" data-m="${m}">${icon('check')} Payé</button>
        </div>`)}</div>` : html`<div class="alert" style="background:var(--green-soft);color:var(--green)">${icon('check')}<div>Tous les loyers de ${MONTHS_FULL[m - 1].toLowerCase()} sont encaissés.</div></div>`}

      ${ownerTodo.length ? dfold('vers', `À verser aux bailleurs — ${MONTHS_FULL[m - 1]}`, html`${plural(ownerTodo.length, 'bailleur')} · <b>${money(sum(ownerTodo, ownerRent))}</b>`, html`
      <div class="list">${ownerTodo.map((im) => html`<div class="row">
        <span class="avatar" style="background:var(--amber-soft);color:var(--amber)">${icon('key')}</span>
        <div class="grow"><div class="title">${im.adresse}</div><div class="meta">${im.proprietaire || 'Bailleur'}</div></div>
        <div class="amount">${money(ownerRent(im))}</div>
        <button class="btn sm" data-action="toggle-vers" data-imm="${im.id}" data-y="${y}" data-m="${m}">${icon('check')} Versé</button>
      </div>`)}</div>`, 'margin-top:14px') : ''}

      ${dfold('imms', 'Immeubles', (() => { const e = sum(imms, (im) => sum(locs.filter((l) => l.immId === im.id), (l) => dueAmount(l, y, m))); const r = sum(imms, (im) => sum(tenantsOfImm(im.id), (l) => { const pp = payment(l.id, y, m); return pp ? paidAmount(pp, l) : 0; })); return html`${plural(imms.length, 'immeuble')} · encaissé <b>${pct(r, e)} %</b> (${money(r)} / ${money(e)})`; })(), html`
      <div class="grid cols-auto">${imms.map((im) => {
        const ls = locs.filter((l) => l.immId === im.id);
        const exp = sum(ls, (l) => dueAmount(l, y, m));
        const rec = sum(tenantsOfImm(im.id), (l) => { const pp = payment(l.id, y, m); return pp ? paidAmount(pp, l) : 0; });
        const pp = pct(rec, exp);
        return html`<button class="card" style="text-align:left;font:inherit;color:inherit;cursor:pointer;width:100%" data-action="open-imm" data-id="${im.id}">
          <div class="card-title"><h3>${im.adresse}</h3><span class="badge ${pp >= 100 ? 'ok' : pp >= 50 ? 'warn' : 'bad'}">${pp}%</span></div>
          <div class="progress ${level(pp)}"><i style="width:${Math.min(pp, 100)}%"></i></div>
          <div class="pay-foot"><span>${im.type && im.type !== 'immeuble' ? (IMM_TYPES[im.type] || '') + ' · ' : ''}${plural(ls.length, 'locataire')}</span><span class="num">${money(rec)} / ${money(exp)}</span></div>
        </button>`;
      })}</div>`, 'margin-top:14px')}${html`<div style="margin-top:14px">${new Raw(newsHtml(API))}</div>`}`;
  },

  immeubles() {
    const y = new Date().getFullYear();
    const every = vault.list('immeubles').sort(byAddr);
    const nGone = every.filter(immGone).length;
    const anciens = ui.immSeg === 'anciens' && nGone > 0;
    const imms = every.filter((im) => immGone(im) === anciens);
    return html`
      ${immHead('immeubles', `${plural(every.length - nGone, 'immeuble')} en gestion${nGone ? ' · ' + nGone + ' archivé' + (nGone > 1 ? 's' : '') : ''}`)}
      ${nGone ? html`<div class="tabs" role="tablist" style="max-width:380px">
        <button class="tab" role="tab" aria-selected="${!anciens}" data-action="imm-seg" data-id="actuels">En gestion</button>
        <button class="tab" role="tab" aria-selected="${anciens}" data-action="imm-seg" data-id="anciens">Plus en gestion (${nGone})</button>
      </div>` : ''}
      ${ui.mapImm && vault.get('immeubles', ui.mapImm) ? (() => { const mi = vault.get('immeubles', ui.mapImm); const qq = encodeURIComponent(mi.adresse + ', Luxembourg'); return html`<div class="card map-card" style="margin-bottom:14px;padding:0;overflow:hidden">
        <div style="display:flex;align-items:center;gap:8px;padding:10px 14px"><b style="flex:1">📍 ${mi.adresse}</b><a class="btn sm" href="https://www.google.com/maps/search/?api=1&query=${qq}" target="_blank" rel="noopener">Ouvrir dans Google Maps</a><a class="btn sm" href="https://www.google.com/maps/dir/?api=1&destination=${qq}" target="_blank" rel="noopener">🧭 Itinéraire</a><button class="btn sm ghost" data-action="imm-map" data-id="">✕</button></div>
        <iframe src="https://maps.google.com/maps?q=${qq}&z=16&output=embed" title="Plan" loading="lazy" referrerpolicy="no-referrer" style="width:100%;height:260px;border:0;display:block"></iframe></div>`; })() : ''}
      ${imms.length ? html`<div class="grid cols-auto">${imms.map((im) => {
        const logs = logsOf(im.id);
        const occ = logs.filter((g) => occupantsNow(g.id).length).length;
        const b = bilan({ immId: im.id, y });
        return html`<div class="card">
          <div class="card-title"><h3>${im.adresse}</h3><button class="btn icon ghost sm" data-action="imm-map" data-id="${im.id}" aria-label="Voir sur la carte" title="Voir sur la carte">📍</button><button class="btn icon ghost sm" data-action="edit-imm" data-id="${im.id}" aria-label="Modifier">${icon('edit')}</button></div>
          <dl class="kv small">
            ${immGone(im) ? html`<dt>Fin de gestion</dt><dd>${fmtDate(im.finGestion)}</dd>` : ''}
            <dt>Logements</dt><dd>${logs.length ? html`${occ} occupé${occ > 1 ? 's' : ''} / ${logs.length}` : '—'}</dd>
            <dt>Locataires actuels</dt><dd>${tenantsOfImm(im.id).filter(isCurrent).length}</dd>
            ${ownerRent(im) ? html`<dt>Bail principal</dt><dd class="num">${money(ownerRent(im))} / mois${im.bailFin ? html` · fin ${fmtDate(im.bailFin)}` : ''}</dd>` : ''}
            ${ownerRent(im) && !immGone(im) ? html`<dt>Rentabilité / mois</dt><dd>${rentaLine(rentaMois(im))}</dd>` : ''}
            <dt>Encaissé ${y}</dt><dd class="num green">${money(b.encaisse)}</dd>
            ${b.verse ? html`<dt>Versé bailleur</dt><dd class="num">−${money(b.verse)}</dd>` : ''}
            <dt>Dépenses ${y}</dt><dd class="num ${b.depenses ? 'red' : ''}">${b.depenses ? '−' + money(b.depenses) : money(0)}</dd>
            <dt>Gain net ${y}</dt><dd class="num ${b.net < 0 ? 'red' : 'accent'}">${money(b.net)}</dd>
          </dl>
          <div class="actions" style="margin:14px 0 0">
            <button class="btn sm primary" data-action="open-imm" data-id="${im.id}">${icon('building')} Log. & Bilan</button>
            <button class="btn sm" data-action="open-imm" data-id="${im.id}" data-tab="deps">${icon('receipt')} Dépenses</button>
          </div>
        </div>`;
      })}</div>` : empty('building', 'Aucun immeuble enregistré.', html`<button class="btn primary" data-action="new-imm">${icon('plus')} Immeuble</button>`)}`;
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
      ${immHead('locataires', `👥 ${all.length - nGone} locataires actuels · ${nGone} anciens`)}
      ${locTabs(anciens ? 'anciens' : 'actuels', nGone)}
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
          if (anciens) badges.push(html`<span class="badge">${fmtDate(l.debut) || '?'} → ${fmtDate(l.sortie)}</span>`);
          else {
            if (isFuture(l)) badges.push(html`<span class="badge acc">Arrive le ${fmtDate(l.debut)}</span>`);
            if (l.sortie) badges.push(html`<span class="badge warn">Départ ${fmtDate(l.sortie)}</span>`);
            if (late) badges.push(html`<span class="badge ${late >= 2 ? 'bad' : 'warn'}">${late} mois de retard</span>`);
            if (d != null && d >= 0 && d <= 60 && !l.sortie) badges.push(html`<span class="badge warn">Fin ${fmtDate(l.fin)}</span>`);
          }
          return html`<button class="row" data-action="open-loc" data-id="${l.id}">
            <span class="avatar" ${anciens ? new Raw('style="background:var(--surface-2);color:var(--text-3)"') : ''}>${avIn(l)}</span>
            <span class="grow">
              <span class="title" style="display:block">${fullName(l)}</span>
              <span class="meta" style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">${l.logId ? html`<span>${logName(l.logId)}</span>` : ''}${badges}</span>
            </span>
            ${!anciens && l.espace && l.espace.on ? html`<span class="btn sm ghost" role="button" data-action="esp-refresh" data-id="${l.id}" title="Mettre à jour son app maintenant">🔄</span>` : ''}${anciens ? '' : html`<span class="btn sm" role="button" data-action="open-esp" data-id="${l.id}" title="App du locataire : code et lien">📲 ${l.espace && l.espace.on ? '✓' : 'App'}</span>`}
            <span class="amount ${anciens ? 'muted' : ''}">${money(l.loyer)}</span>
          </button>`;
        })}</div>`) : empty('users', q || ui.immFilter ? 'Aucun résultat.' : anciens ? 'Aucun ancien locataire pour le moment.' : 'Aucun locataire enregistré.', !q && !ui.immFilter && !anciens ? html`<button class="btn primary" data-action="new-loc">${icon('plus')} Locataire</button>` : '')}`;
  },

  paiements() {
    const y = ui.year;
    let imms = vault.list('immeubles').sort(byAddr);
    const all = imms;
    if (ui.immFilter) imms = imms.filter((im) => im.id === ui.immFilter);
    let gDue = 0, gPaid = 0, gRest = 0, gColl = 0;
    const activeIn = (l) => MONTHS.some((_, i) => isDue(l, y, i + 1) || payment(l.id, y, i + 1));
    const cards = imms.map((im) => {
      const ls = tenantsOfImm(im.id).filter(activeIn).sort((a, b) => byLogName({ nom: logName(a.logId) }, { nom: logName(b.logId) }) || byDebut(a, b));
      if (!ls.length) return '';
      let due = 0, paid = 0, rest = 0, collected = 0;
      const rows = ls.map((l) => {
        const s = yearStats(l, y);
        due += s.dueNow; paid += s.paid; rest += s.rest; collected += s.collected;
        return html`<div class="pay-tenant">
          <div class="pay-head"><button class="name" style="background:none;border:0;font:inherit;font-weight:650;color:inherit;cursor:pointer;padding:0" data-action="open-loc" data-id="${l.id}">${fullName(l)}</button>
            ${l.logId ? html`<span class="badge">${logName(l.logId)}</span>` : ''}<span class="muted small num">${money(l.loyer)}/mois</span>
            ${isGone(l) ? html`<span class="badge">parti le ${fmtDate(l.sortie)}</span>` : l.sortie ? html`<span class="badge warn">départ ${fmtDate(l.sortie)}</span>` : ''}</div>
          <div class="months">${MONTHS.map((_, i) => payCell(l, y, i + 1))}</div>
          <div class="pay-foot"><span>Payé <b class="green num">${money(s.paid)}</b></span><span>Impayé à ce jour <b class="num ${s.rest > 0.009 ? 'red' : 'green'}">${money(s.rest)}</b>${s.upcoming > 0.009 ? html` · <span class="muted">à venir ${money(s.upcoming)}</span>` : ''}</span></div>
          ${outsidePays(l).some((p) => p.y === y) ? html`<button class="alert warn" style="width:100%;border:0;font:inherit;text-align:left;cursor:pointer;margin-top:6px" data-action="fix-dates" data-id="${l.id}">${icon('alert')}<div>Loyer(s) payé(s) hors des dates du contrat — touchez pour corriger les dates.</div></button>` : ''}
        </div>`;
      });
      gDue += due; gPaid += paid; gRest += rest; gColl += collected;
      return html`<div class="card"><div class="card-title"><h3>${im.adresse}</h3><span style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;justify-content:flex-end"><span class="tiny muted"><b class="green">${money(collected)}</b> reçus</span><span class="badge ${level(pct(collected, due)) || 'ok'}">${pct(collected, due)}%</span></span></div>${rows}
        <div class="totals"><span>Échu à ce jour <b>${money(due)}</b></span><span>Reçu <b class="green">${money(paid)}</b></span><span>Impayé <b class="${rest > 0.009 ? 'red' : 'green'}">${money(rest)}</b></span></div></div>`;
    }).filter(Boolean);
    return html`
      ${immHead('locataires', '💶 Gestion locataire — paiements des loyers : touchez un mois vide pour le marquer payé ; touchez un mois payé pour le montant, la quittance ou l’annulation.')}
      ${locTabs('paiements', vault.list('locataires').filter(isGone).length)}
      <div class="toolbar">
        ${yearSelect(y)}
        ${all.length > 1 ? html`<div class="chips pay-chips">
          <button class="chip" data-action="imm-filter" data-id="" aria-pressed="${!ui.immFilter}">Tous</button>
          ${all.map((im) => html`<button class="chip" data-action="imm-filter" data-id="${im.id}" aria-pressed="${ui.immFilter === im.id}">${im.adresse}</button>`)}
        </div>` : ''}
      </div>
      ${cards.length ? html`<div class="stack pay-stack">${cards}</div>
        <div class="card" style="margin-top:12px;border-color:var(--accent)"><div class="card-title" style="margin:0"><h3>Total ${y}</h3></div>
        <div class="totals" style="background:none;padding:8px 0 0;margin:0"><span>Échu à ce jour <b>${money(gDue)}</b></span><span>Reçu <b class="green">${money(gPaid)}</b></span><span>Impayé <b class="${gRest > 0.009 ? 'red' : 'green'}">${money(gRest)}</b></span><span>Taux <b>${pct(gColl, gDue)}%</b></span></div></div>`
        : empty('wallet', 'Aucun locataire à afficher pour ' + y + '.')}`;
  },

  compta() {
    const y = ui.year, tab = ['journal', 'frais', 'export'].includes(ui.cpTab) ? ui.cpTab : 'journal';
    const per = ui.cpPer || (ui.cpPer = 'y');
    const soc = societe();
    // deux espaces séparés : Comptabilité (pour l'État) | Statistiques
    const sec = ui.cpSec || 'compta';
    const secTabs = html`<div class="tabs" role="tablist" style="max-width:640px;margin-bottom:16px">${[['compta', html`📒 <span class="tab-long">Comptabilité</span><span class="tab-short">Compta</span>`], ['stats', html`📊 <span class="tab-long">Statistiques</span><span class="tab-short">Stats</span>`]].map(([k, l]) => html`<button class="tab" role="tab" aria-selected="${sec === k}" data-action="cp-sec" data-id="${k}">${l}</button>`)}</div>`;
    if (sec === 'stats') return html`${secTabs}${pageHead('📊 Statistiques', 'Loyers, occupation, dépenses')}${VIEWS.stats()}`;
    const tabs = html`<div class="tabs tabs-wrap" role="tablist" style="max-width:720px">${[['journal', 'Journal'], ['frais', '💸 Frais fixes'], ['export', 'Export']].map(([k, l]) => html`<button class="tab" role="tab" aria-selected="${tab === k}" data-action="cp-tab" data-id="${k}">${l}</button>`)}</div>`;
    if (tab === 'stats') ui.cpTab = 'journal';
    const perSel = html`<select data-input="cp-per" style="width:auto" aria-label="Période"><option value="y" ${per === 'y' ? new Raw('selected') : ''}>Toute l’année</option>${[1, 2, 3, 4].map((q) => html`<option value="q${q}" ${per === 'q' + q ? new Raw('selected') : ''}>Trimestre ${q}</option>`)}${MONTHS_FULL.map((mn, i) => html`<option value="m${i + 1}" ${per === 'm' + (i + 1) ? new Raw('selected') : ''}>${mn}</option>`)}</select>`;
    const [from, to] = cpRange(y, per);
    const all = journal(from, to);
    // Recherche (nom, libellé, immeuble, montant, date) et dates du / au
    const q = (ui.cpQ || '').trim().toLowerCase();
    const rows = all.filter((r) => (!ui.cpFrom || r.d >= ui.cpFrom) && (!ui.cpTo || r.d <= ui.cpTo)
      && (!q || [r.lib, r.cat, r.imm, r.d, fmtDate(r.d), money(r.ttc), String(r2(r.ttc))].join(' ').toLowerCase().includes(q)));
    const R = rows.filter((r) => r.sens === 'R'), D = rows.filter((r) => r.sens === 'D');
    const tR = sum(R, (r) => r.ttc), tD = sum(D, (r) => r.ttc);
    const tools = html`<div class="toolbar">${yearSelect(y)}${perSel}</div>`;
    let body;
    if (tab === 'journal') {
      const noPiece = D.filter((r) => r.depId && !r.piece).length;
      body = html`<div class="metrics" style="margin-bottom:14px">
          <div class="metric"><div class="lbl">Recettes</div><div class="val green">${money(tR)}</div><div class="sub">${plural(R.length, 'écriture')}</div></div>
          <div class="metric"><div class="lbl">Dépenses</div><div class="val">${money(tD)}</div><div class="sub">${plural(D.length, 'écriture')}</div></div>
          <div class="metric hero"><div class="lbl">Résultat ${cpLabel(y, per)}</div><div class="val ${tR - tD < 0 ? 'red' : 'accent'}">${money(tR - tD)}</div><div class="sub">recettes − dépenses (TTC)</div></div>
        </div>
        ${noPiece ? html`<div class="alert warn" style="margin-bottom:12px">${icon('file')}<div><b>${plural(noPiece, 'dépense')} sans facture jointe</b> — ajoutez-la avec 📎+ dans Immeuble → Dépenses.</div></div>` : ''}
        <div class="cp-filter">
          <div class="search">${icon('search')}<input type="search" name="search" data-input="cp-q" value="${ui.cpQ || ''}" placeholder="Rechercher : nom, libellé, immeuble, montant, date…" autocomplete="off"></div>
          <div class="cp-dates"><label class="field" style="margin:0">Du<input type="date" data-input="cp-from" value="${ui.cpFrom || ''}"></label>
          <label class="field" style="margin:0">Au<input type="date" data-input="cp-to" value="${ui.cpTo || ''}"></label></div>
          ${q || ui.cpFrom || ui.cpTo ? html`<button class="btn sm ghost" data-action="cp-clear" style="align-self:flex-start">✕ Effacer</button>` : ''}
        </div>
        ${q || ui.cpFrom || ui.cpTo ? html`<p class="small muted" style="margin:0 0 8px">${plural(rows.length, 'résultat')}</p>` : ''}
        ${(() => {
          if (!rows.length) return empty('file', q || ui.cpFrom || ui.cpTo ? 'Rien trouvé.' : 'Aucune écriture sur cette période.');
          // 10 lignes à la fois, les plus récentes d'abord ; « Voir plus » en ajoute 10
          const sorted = rows.slice().sort((a, b) => b.d.localeCompare(a.d) || a.sens.localeCompare(b.sens));
          const lim = ui.cpLim || 10, vis = sorted.slice(0, lim);
          const months = [...new Set(vis.map((r) => r.d.slice(0, 7)))];
          const mLabel = (k) => `${MONTHS_FULL[+k.slice(5, 7) - 1]} ${k.slice(0, 4)}`;
          return html`<div class="card" style="padding:0;overflow:auto"><table class="tbl cp-tbl"><thead><tr><th>Date</th><th>Libellé</th><th class="r">HT</th><th class="r">TVA</th><th class="r">TTC</th><th></th></tr></thead><tbody>
          ${months.map((mk) => { const mr = vis.filter((r) => r.d.startsWith(mk)), all = sorted.filter((r) => r.d.startsWith(mk)); const rr = sum(all.filter((r) => r.sens === 'R'), (r) => r.ttc), dd = sum(all.filter((r) => r.sens === 'D'), (r) => r.ttc); return html`<tr class="cp-month"><td colspan="6"><b>${mLabel(mk)}</b> <span class="tiny muted">· recettes <b class="green">${money(rr)}</b> · dépenses <b class="red">${money(dd)}</b></span></td></tr>
            ${mr.map((r) => html`<tr><td class="nowrap">${fmtDate(r.d)}</td><td><b>${r.cat}</b> · ${r.lib}${r.imm ? html`<div class="tiny muted">${r.imm}</div>` : ''}</td>
            <td class="r">${money(r.ttc - r.tva)}</td><td class="r">${r.tva ? money(r.tva) : '—'}</td><td class="r ${r.sens === 'R' ? 'green' : 'red'}">${r.sens === 'R' ? '' : '−'}${money(r.ttc)}</td>
            <td>${r.piece ? html`<button class="btn sm" data-action="open-doc" data-id="${r.piece}">📎</button>` : ''}</td></tr>`)}`; })}
          </tbody></table></div>
          ${moreBtn(sorted.length, lim)}`;
        })()}`;
    } else if (tab === 'frais') {
      // frais fixes (salaires, bureau, provisions…) : déduits du résultat, donc ici avec les comptes
      // le formulaire reste dans la fenêtre : une synchro qui redessine la page n'efface pas ce qu'on tape
      const fl = vault.list('frais').sort((a, b) => (a.libelle || '').localeCompare(b.libelle || '')), nowD = new Date();
      body = html`<div class="card"><p class="small muted" style="margin-top:0">Coûts de gestion qui ne dépendent pas d’un immeuble (salaires, bureau, provisions…) : déduits du résultat.</p>
        ${fl.length ? html`<div class="list">${fl.map((f) => html`<div class="row"><span class="grow"><span class="title" style="display:block">${f.libelle}</span><span class="meta">${f.debut ? 'depuis ' + fmtDate(f.debut) : ''}${f.fin ? ' jusqu’au ' + fmtDate(f.fin) : ''}</span></span><span class="amount">${money(f.montant)}/mois</span></div>`)}</div>
        <div class="totals"><span>Ce mois-ci</span><b>${money(fraisOfMonth(nowD.getFullYear(), nowD.getMonth() + 1))}</b></div>` : html`<p class="muted small">Aucun frais fixe.</p>`}
        <button class="btn primary" style="margin-top:12px" data-action="open-frais">${icon('edit')} Ajouter / modifier les frais fixes</button></div>`;
    } else {
      body = html`<div class="card"><p style="margin-top:0">Téléchargez le <b>journal ${cpLabel(y, per)}</b> (recettes, dépenses, bailleurs, frais fixes, avec HT / TVA / TTC) pour votre comptable. Le fichier s’ouvre dans Excel, Numbers ou LibreOffice.</p>
        <button class="btn primary" data-action="cp-csv">${icon('download')} Télécharger le journal (Excel / CSV)</button>
        <button class="btn" data-action="cp-print">${icon('file')} Imprimer / PDF</button>
        <p class="tiny muted" style="margin-bottom:0">Les factures restent dans l’app (chiffrées) : ouvrez-les avec 📎 dans le Journal pour les télécharger une par une.</p></div>`;
    }
    return html`${secTabs}${pageHead('📒 Comptabilité', 'Journal, frais fixes et export pour le comptable')}${tabs}${tools}${body}`;
  },

  stats() {
    const y = ui.year;
    const locs = vault.list('locataires');
    const imms = vault.list('immeubles').sort(byAddr);
    const monthly = MONTHS.map((_, i) => {
      const m = i + 1;
      let due = 0, paid = 0;
      for (const l of locs) {
        due += dueAmount(l, y, m);
        const p = payment(l.id, y, m);
        if (p) paid += paidAmount(p, l);
      }
      return { due, paid };
    });
    const paid = sum(monthly, (x) => x.paid);
    const ys = locs.map((l) => yearStats(l, y));
    const due = sum(ys, (x) => x.dueNow);
    const manquant = sum(ys, (x) => x.rest);
    const collected = sum(ys, (x) => x.collected);
    const deps = depensesOf('', y);
    const depTotal = sum(deps, (d) => d.montant);
    const verse = sum(vault.list('versements').filter((v) => v.y === y), (v) => v.montant);
    const frais = fraisOfYear(y);
    const netReel = paid - depTotal - verse - frais;
    const parts = associes();
    const max = Math.max(1, ...monthly.map((x) => Math.max(x.due, x.paid)));
    const cats = { reparation: 'Réparations', assurance: 'Assurance', taxe: 'Taxes / impôts', entretien: 'Entretien', autre: 'Autre' };
    const byCat = Object.entries(cats).map(([k, label]) => ({ label, total: sum(deps.filter((d) => d.cat === k), (d) => d.montant) })).filter((x) => x.total);
    const hist = Object.values(vault.state.historique).filter((h) => !h.del).sort((a, b) => b.t - a.t);
    const origin = imms.map((im) => ({ im, b: bilan({ immId: im.id }) }));
    const tot = { encaisse: sum(origin, (x) => x.b.encaisse), verse: sum(origin, (x) => x.b.verse), depenses: sum(origin, (x) => x.b.depenses), net: sum(origin, (x) => x.b.net), occupants: sum(origin, (x) => x.b.occupants) };
    return html`
      ${pageHead('Statistiques', 'Vue financière annuelle et depuis l’origine', html`<div style="display:flex;gap:8px;flex-wrap:wrap">${yearSelect(y)}<button class="btn" data-action="print-global">${icon('download')} Imprimer</button><button class="btn primary" data-action="open-rapports">🖨️ Statistiques sur mesure</button></div>`)}
      <div class="metrics">
        <div class="metric"><div class="lbl">Loyers encaissés</div><div class="val green">${money(paid)}</div><div class="sub">${pct(collected, due)}% des ${money(due)} échus</div></div>
        <div class="metric"><div class="lbl">Impayés à ce jour</div><div class="val ${manquant > 0.009 ? 'red' : ''}">${money(manquant)}</div></div>
        <div class="metric"><div class="lbl">Versé bailleurs</div><div class="val">${money(verse)}</div></div>
        <div class="metric"><div class="lbl">Réparations & frais</div><div class="val">${money(depTotal)}</div></div>
        <div class="metric"><div class="lbl">Frais fixes</div><div class="val">${money(frais)}</div><div class="sub">${monthsElapsed(y)} mois</div></div>
        <div class="metric"><div class="lbl">Gain des immeubles</div><div class="val">${money(paid - depTotal - verse)}</div><div class="sub">avant frais fixes</div></div>
        <div class="metric hero"><div class="lbl">Résultat net ${y}</div><div class="val ${netReel < 0 ? 'red' : 'accent'}">${money(netReel)}</div><div class="sub">encaissé − bailleurs − dépenses − frais fixes</div></div>
      </div>
      ${parts.length ? html`<div class="section-label">Répartition entre associés — ${y}</div>
      <div class="list">${parts.map((a) => html`<div class="row"><span class="avatar">${a.nom.slice(0, 2).toUpperCase()}</span><span class="grow"><span class="title" style="display:block">${a.nom}</span><span class="meta">${a.part} % · ${money((netReel * a.part) / 100 / Math.max(1, monthsElapsed(y)))} / mois en moyenne</span></span><span class="amount ${netReel < 0 ? 'red' : 'accent'}">${money((netReel * a.part) / 100)}</span></div>`)}</div>` : html`<p class="small muted" style="margin-top:10px"><a href="#" data-action="open-societe">Ajouter les associés</a> pour calculer la part de chacun.</p>`}
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
      ${hist.length ? html`<div class="list">${hist.slice(0, ui.histShown).map((h) => html`<div class="row"><span class="grow"><span class="title" style="display:block;white-space:normal">${h.action}</span><span class="meta" style="white-space:normal">${h.detail}</span>${h.by ? html`<span class="meta" style="display:block">👤 ${h.by}</span>` : ''}</span><span class="tiny muted" style="white-space:nowrap">${fmtDateTime(h.t)}</span></div>`)}</div>
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
        
        
    <button class="row" data-action="esp-list">${icon('users')}<span class="grow"><span class="title" style="display:block">App des locataires</span><span class="meta">${vault.list('locataires').filter((x) => x.espace && x.espace.on).length} accès actifs — donner ou retirer l'accès</span></span></button>
  </div>

  <div class="section-label">Gestion</div>
  <div class="list settings">
    ${html`<button class="row" data-action="tpay-conf"><span class="avatar">💳</span><span class="grow"><span class="title" style="display:block">Paiements</span><span class="meta">${(vault.get('reglages', 'tpayConf') || {}).payMode === 'month' ? 'Factures des interventions : une par mois' : 'Factures des interventions : à chaque intervention'}</span></span>${icon('chevron')}</button>`}
        
        
        <button class="row" data-action="open-societe">${icon('building')}<span class="grow"><span class="title" style="display:block">${"Société & associés"}</span><span class="meta">${!societe().logo ? html`<b style="color:var(--amber,#b45309)">🖼️ Mettez votre logo : vos locataires le voient dans leur app</b><br>` : ''}${societe().nom || 'Nom de la société pour les quittances'} · ${associes().length ? associes().map((a) => `${a.nom} ${a.part}%`).join(', ') : 'aucun associé'}</span></span></button>
  </div>

  ${!standalone ? html`<div class="section-label">Application</div>
  <div class="list settings"><div class="row">${icon('phoneApp')}<span class="grow"><span class="title" style="display:block">Installer sur ce téléphone</span>
    <span class="meta" style="white-space:normal">${isIOS ? 'Safari : bouton Partager → « Sur l’écran d’accueil ».' : 'Ajoute l’icône CENTRAL-OGL sur l’écran d’accueil, fonctionne hors ligne.'}</span></span>
    ${installPrompt ? html`<button class="btn sm primary" data-action="install">Installer</button>` : ''}<button class="btn sm" data-action="install-anim">▶ Voir comment</button></div></div>` : ''}

  ${centraleSection()}
  <div class="section-label">Apps</div>
  <div class="list settings"><button class="row" data-action="apps-refresh-all"><span class="avatar">🔄</span><span class="grow"><span class="title" style="display:block">Mettre à jour toutes les apps maintenant</span><span class="meta">Apps des locataires : après une grosse mise à jour ou si une app ne montre pas une nouveauté</span></span></button></div>
  <div class="section-label">Sécurité</div>
  <div class="list settings">
    <div class="row">${icon('lock')}<span class="grow title">Verrouillage automatique</span>
      <select data-input="lockmin" style="width:auto">${[5, 15, 30, 60].map((n) => html`<option value="${n}" ${lockMinutes() === n ? new Raw('selected') : ''}>${n} min</option>`)}</select></div>
    <div class="row">${icon('phoneApp')}<span class="grow"><span class="title" style="display:block">Un seul appareil connecté à la fois</span><span class="meta">Cet appareil : ${deviceLabel()}. Une connexion ailleurs déconnecte celui-ci.</span></span></div>
    <button class="row" data-action="make-recovery">${icon('shield')}<span class="grow"><span class="title" style="display:block">Clé de secours ${vault.hasRecovery ? html`<span class="badge ok">active</span>` : vault.hasRecovery === false ? html`<span class="badge warn">à créer</span>` : ''}</span><span class="meta">Pour retrouver l'accès si la clé d'accès est oubliée</span></span></button>
    <button class="row" data-action="change-key">${icon('key')}<span class="grow"><span class="title" style="display:block">Changer la clé d'accès</span><span class="meta">Les autres appareils devront utiliser la nouvelle clé</span></span></button>
    <button class="row" data-action="lock">${icon('lock')}<span class="grow title">Verrouiller maintenant</span></button>
    ${vault.op ? '' : html`<button class="row" data-action="arch-start">${icon('archive')}<span class="grow"><span class="title" style="display:block">🗄️ Archiver</span><span class="meta">Ranger les interventions, devis et activité terminés ou de test : gardés, plus affichés (vous choisissez quoi et jusqu’à quelle date)</span></span></button>`}
    ${((vault.get('reglages', 'archives') || {}).list || []).length ? html`<button class="row" data-action="arch-toggle">${icon('eye')}<span class="grow"><span class="title" style="display:block">${showArch ? '🙈 Cacher les archives' : '👁 Voir les archives'}</span><span class="meta">${(() => { const l = vault.get('reglages', 'archives').list, a = l[l.length - 1]; return `${l.length} archivage${l.length > 1 ? 's' : ''} · dernier : ${fmtDateTime(a.at)} · ${a.by || ''}`; })()}${showArch ? ' · affichées en ce moment' : ''}</span></span></button>` : ''}
    ${vault.op ? '' : html`<button class="row" data-action="test-clean">${icon('trash')}<span class="grow"><span class="title" style="display:block">🧹 Supprimer les données de test</span><span class="meta">Garde tout ce qui est marqué ⭐ « Vrai » (et ce qui en dépend) ; sauvegarde chiffrée automatique avant</span></span></button>`}
    <button class="row" data-action="wipe-all">${icon('trash')}<span class="grow"><span class="title red" style="display:block">Effacer toutes les données</span><span class="meta">Immeubles, locataires, paiements, documents — sur tous les appareils</span></span></button>
    <button class="row" data-action="forget">${icon('trash')}<span class="grow"><span class="title red" style="display:block">Oublier cet appareil</span><span class="meta">Efface la copie chiffrée locale (les données restent sur le serveur)</span></span></button>
  </div>

  <div class="section-label">Données</div>
  <div class="list settings">
    <button class="row" data-action="export-enc">${icon('shield')}<span class="grow"><span class="title" style="display:block">Sauvegarde chiffrée <span class="pill" style="font-size:11px;background:#E7F4EC;color:#2E7D52;border-radius:999px;padding:1px 7px;vertical-align:middle">(recommandé)</span></span><span class="meta">Fichier .ares, lisible uniquement avec la clé</span></span></button>
    <button class="row" data-action="export-json">${icon('download')}<span class="grow"><span class="title" style="display:block">Export lisible (JSON)</span><span class="meta">Non chiffré — à conserver en lieu sûr</span></span></button>
        
        
        
        <button class="row" data-action="my-data">${icon('download')}<span class="grow"><span class="title" style="display:block">📦 Récupérer toutes mes données <span class="pill" style="font-size:11px;background:#E7F4EC;color:#2E7D52;border-radius:999px;padding:1px 7px;vertical-align:middle">(recommandé)</span></span><span class="meta">Un fichier complet avec les documents (réimportable) + tableaux CSV des locataires et des paiements</span></span></button>
    <button class="row" data-action="import">${icon('upload')}<span class="grow"><span class="title" style="display:block">Importer</span><span class="meta">Sauvegarde .ares, 📦 transfert reçu ou export JSON (ancienne version incluse)</span></span></button>
    <button class="row" data-action="print">${icon('file')}<span class="grow title">Imprimer la page Paiements</span></button>
  </div>

  ${legacy ? html`<div class="section-label">Ancienne version</div>
  <div class="alert warn" style="margin-bottom:10px">${icon('alert')}<div>Une copie <b>non chiffrée</b> de l'ancienne version est encore présente dans ce navigateur (${legacy.immeubles.length} immeubles, ${legacy.locataires.length} locataires).</div></div>
  <div class="actions"><button class="btn" data-action="legacy-import">Importer</button><button class="btn danger" data-action="legacy-wipe">Effacer la copie</button></div>` : ''}

  <div class="section-label">Notifications</div>
  <p class="small muted" style="margin:0 0 8px">Un avis et le numéro sur l’icône quand un locataire ou l’équipe vous écrit (signalement, virement, photos, problème…). Le serveur ne lit rien : il dit seulement « nouveau message ».</p>
  ${pushSt === 'off' || !pushSt ? html`<button class="btn" data-action="push-on">🔔 Activer les notifications sur ce téléphone</button>` : html`<p class="small" style="margin:0">${PUSH_MSG[pushSt] || ''}</p>`}

  <div class="section-label">Apparence</div>
  <div class="chips">${[['auto', 'Automatique'], ['light', 'Clair'], ['dark', 'Sombre']].map(([k, l]) => html`<button class="chip" data-action="theme" data-id="${k}" aria-pressed="${theme === k}">${l}</button>`)}</div>
  <div class="section-label">Langue</div>
  <div class="lang-mini" data-notr="1" role="group" aria-label="Langue">${['fr', 'de', 'en', 'it', 'pt', 'es'].filter((k) => LANGS[k]).map((k) => html`<button type="button" data-action="set-lang" data-id="${k}" title="${LANGS[k]}" aria-pressed="${LANG === k}">${k.toUpperCase()}</button>`)}</div>
  <p class="tiny muted" style="margin-top:4px">Les quittances, reçus et relances aux locataires restent en français (documents officiels).</p>
  <p class="tiny muted" style="margin-top:28px;text-align:center"><span data-notr="1">CENTRAL-OGL · ${legalLine()}</span> · v${VERSION} · données chiffrées AES-256-GCM de bout en bout</p>`;
  }
};

// ───────────────────────── Feuilles (détails & formulaires) ─────────────────────────
const sheetEl = $('#sheet');
// jour de la semaine écrit dans la case de chaque date (« lundi »), dans la langue de l'app
const dowOfIso = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(v || '') ? new Date(v + 'T12:00:00').toLocaleDateString(LOCALES[getLang()] || 'fr-FR', { weekday: 'long' }) : '');
function dowTags(root) {
  for (const inp of root.querySelectorAll('input[type=date]:not([data-dow])')) {
    inp.dataset.dow = '1';
    const w = document.createElement('span'); w.className = 'dwrap'; inp.replaceWith(w); w.appendChild(inp);
    const t = document.createElement('span'); t.className = 'dow'; t.setAttribute('aria-hidden', 'true'); t.textContent = dowOfIso(inp.value); w.appendChild(t);
  }
}
document.addEventListener('input', (e) => { if (e.target.matches && e.target.matches('input[type=date][data-dow]')) { const t = e.target.parentNode.querySelector('.dow'); if (t) t.textContent = dowOfIso(e.target.value); } });
new MutationObserver(() => dowTags(document.body)).observe(document.body, { childList: true, subtree: true });
// Saisie pas encore enregistrée dans la fenêtre : on demande avant de la fermer (sinon tout est perdu)
let sheetDirty = false;
sheetEl.addEventListener('input', (e) => { const el = e.target; if (el.closest('form') && !el.dataset.input && !['hidden', 'search'].includes(el.type)) sheetDirty = true; });
// fermer une fenêtre où l'on a écrit : proposer directement d'enregistrer (le bouton du bas peut être caché ou loin)
// photo des champs de la fenêtre à l'ouverture : écrire puis effacer n'est pas une modification
let sheetSnap = '';
const sheetSig = () => [...sheetEl.querySelectorAll('form')].map((f) => { try { return [...new FormData(f)].map(([k, v]) => k + '=' + (typeof v === 'string' ? v : v.name)).join('&'); } catch { return ''; } }).join('|');
const leaveSheetOk = async () => {
  if (!sheetDirty) return true;
  if (sheetSig() === sheetSnap) return true;
  const subs = [...sheetEl.querySelectorAll('button[type=submit]')].filter((b) => !b.disabled);
  const save = subs.find((b) => b.closest('.sheet-foot')) || subs[subs.length - 1];
  if (!save) return true; // rien à enregistrer dans cette fenêtre
  const lbl = save.textContent.replace(/\s+/g, ' ').trim() || 'Enregistrer';
  const v = await choiceBox('Fermer sans enregistrer ?', 'Ce que vous avez écrit n’est pas encore enregistré.', [{ value: 'drop', label: 'Fermer sans enregistrer', cls: 'ghost danger' }, { value: 'save', label: /^💾/.test(lbl) ? lbl : '💾 ' + lbl, cls: 'primary' }]);
  if (v === 'save') { save.click(); return false; }
  return v === 'drop';
};
function openSheet(kind, id, tab, preset) {
  sheetDirty = false;
  ui.sheet = { kind, id, tab: tab || null, preset };
  renderSheet();
  if (!sheetEl.open) sheetEl.showModal();
}
// Ouvre une feuille « par-dessus » la feuille actuelle : Fermer/Enregistrer y revient.
function openOver(kind, id, tab, preset) {
  const back = ui.sheet && sheetEl.open ? { kind: ui.sheet.kind, id: ui.sheet.id, tab: ui.sheet.tab, preset: ui.sheet.preset } : null;
  openSheet(kind, id, tab, preset);
  ui.sheet.back = back;
}
function goBack() {
  const b = ui.sheet && ui.sheet.back;
  if (b) openSheet(b.kind, b.id, b.tab, b.preset);
  else closeSheet();
}
function closeSheet() {
  ui.sheet = null;
  if (sheetEl.open) sheetEl.close();
}
sheetEl.addEventListener('close', () => { ui.sheet = null; delete sheetEl.dataset.key; });
sheetEl.addEventListener('click', async (e) => { if (e.target === sheetEl && (await leaveSheetOk())) closeSheet(); });
sheetEl.addEventListener('cancel', (e) => { if (!sheetDirty) return; e.preventDefault(); leaveSheetOk().then((ok) => ok && closeSheet()); });

// brouillons des chats : gardés en mémoire si on ferme la fiche et qu'on revient (jusqu'au verrouillage)
document.addEventListener('input', (e) => { const t = e.target; if (t && t.dataset && t.dataset.draft) ui.drafts = { ...(ui.drafts || {}), [t.dataset.draft]: t.value }; });
// cases de réponse des chats : le texte en cours est gardé quand la fiche se redessine
const DRAFT_TA = '.chat-form textarea, .eq-chat-f textarea';
function renderSheet() {
  if (!ui.sheet || (!sheetEl.open && ui.sheet.rendered)) return;
  const s = ui.sheet;
  const r = SHEETS[s.kind](s);
  if (!r) return closeSheet();
  // Ne pas écraser une saisie en cours lors d'une mise à jour en arrière-plan.
  const focused = document.activeElement;
  if (s.rendered && (s.kind.endsWith('-form') || s.kind === 'relance' || (sheetEl.contains(focused) && focused.matches('input, textarea, select')))) return;
  // même fiche redessinée (messages qui arrivent…) : on garde la position de lecture et le texte en cours de saisie
  const key = [s.kind, s.id, s.tab].join('|'), same = sheetEl.open && sheetEl.dataset.key === key;
  const keep = same ? { top: [...sheetEl.querySelectorAll('.sheet-body, .chat, .eq-chat')].map((e) => e.scrollTop), outer: sheetEl.scrollTop, vals: [...sheetEl.querySelectorAll(DRAFT_TA)].map((t) => t.value), sel: [...sheetEl.querySelectorAll('select')].map((x) => x.value), foc: [...sheetEl.querySelectorAll(DRAFT_TA)].indexOf(focused), pos: focused && focused.selectionStart } : null;
  sheetEl.className = 'sheet' + (r.narrow ? ' narrow' : '');
  const popups = [...sheetEl.querySelectorAll(':scope > .tr-bg, :scope > .psoc-bg, :scope > .emo-pop')]; // 🌐 liste des langues ouverte : elle reste
  setHtml(sheetEl, html`
    <div class="sheet-head"><h2>${r.title}</h2><button class="btn icon ghost" data-action="close-sheet" aria-label="Fermer">${icon('x')}</button></div>
    <div class="sheet-body">${r.body}</div>
    ${r.foot ? html`<div class="sheet-foot">${r.foot}</div>` : ''}`);
  s.rendered = true;
  if (popups.length) sheetEl.append(...popups);
  sheetEl.dataset.key = key;
  if (keep) {
    const tas = [...sheetEl.querySelectorAll(DRAFT_TA)], sels = [...sheetEl.querySelectorAll('select')];
    if (tas.length === keep.vals.length) tas.forEach((t, i) => { if (keep.vals[i] && !t.value) t.value = keep.vals[i]; });
    if (sels.length === keep.sel.length) sels.forEach((x, i) => { if (keep.sel[i] !== undefined) x.value = keep.sel[i]; });
    const scs = [...sheetEl.querySelectorAll('.sheet-body, .chat, .eq-chat')];
    if (scs.length === keep.top.length) scs.forEach((e, i) => { e.scrollTop = keep.top[i]; });
    sheetEl.scrollTop = keep.outer;
    if (keep.foc >= 0 && tas[keep.foc]) { tas[keep.foc].focus({ preventScroll: true }); try { tas[keep.foc].setSelectionRange(keep.pos, keep.pos); } catch { /* champ sans curseur */ } }
  }
  if (!sheetDirty) sheetSnap = sheetSig();
  // dans les fiches : mêmes sections repliables, ouvertes par défaut
  enhanceFolds(sheetEl.querySelector('.sheet-body'), 'sheet:' + s.kind + ':' + (s.tab || ''), true);
  hydrateEdl();
}

// Déchiffre les vignettes d'état des lieux après l'affichage (gardées en mémoire jusqu'au verrouillage)
const edlUrls = new Map();
function hydrateEdl() {
  sheetEl.querySelectorAll('img[data-edl]').forEach(async (img) => {
    const id = img.dataset.edl;
    try {
      if (!edlUrls.has(id)) edlUrls.set(id, URL.createObjectURL(new Blob([await vault.readFile(id)], { type: 'image/jpeg' })));
      img.src = edlUrls.get(id);
    } catch { img.closest('figure')?.classList.add('missing'); }
  });
}

// Photo → JPEG ≤ 1600 px (fond blanc), pour garder des fichiers légers
async function compressPhoto(file) {
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) return new Uint8Array(await file.arrayBuffer());
  const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  const x = c.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
  x.drawImage(bmp, 0, 0, c.width, c.height);
  const blob = await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.8));
  return new Uint8Array(await blob.arrayBuffer());
}

async function setEdlPhoto(logId, room, file) {
  if (!EDL_ROOM[room] || !file || !file.type.startsWith('image/')) return toast('Choisissez une photo', { bad: true });
  const g = vault.get('logements', logId), old = edlIn(logId, room);
  toast('Chiffrement de la photo…');
  const bytes = await compressPhoto(file);
  const doc = await vault.mutate((tx) => { if (old) tx.remove('documents', old.id); return tx.put('documents', { logId, room, kind: 'edl', label: `État des lieux — ${EDL_ROOM[room].replace(/^\S+ /, '')}`, date: today(), size: bytes.length, mime: 'image/jpeg' }); }, 'Photo état des lieux', `${EDL_ROOM[room]} · ${g ? g.nom + ' · ' + immName(g.immId) : ''}`, logId);
  await vault.saveFile(doc.id, bytes);
  if (old) { await vault.deleteFile(old.id).catch(() => {}); dropEdlUrl(old.id); }
  toast(`${EDL_ROOM[room]} : photo enregistrée`);
  renderSheet();
}
const dropEdlUrl = (id) => { if (edlUrls.has(id)) { URL.revokeObjectURL(edlUrls.get(id)); edlUrls.delete(id); } };

const PAY_VIA = { vir: 'virement', pp: 'PayPal', card: 'carte', crypto: 'crypto' };
// Adresses de réception : format selon le réseau (jamais de clé privée !)
function badAddr(kind, a, net) {
  if (!a) return '';
  if (/\s/.test(a) || a.split(' ').length > 1) return 'une adresse ne contient pas d’espaces';
  if (kind === 'btc') return /^(bc1[a-z0-9]{20,90}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/.test(a) ? '' : 'adresse Bitcoin invalide (commence par bc1, 1 ou 3)';
  if (kind === 'eth' || ['erc20', 'polygon', 'bep20'].includes(net)) return /^0x[0-9a-fA-F]{40}$/.test(a) ? '' : 'adresse invalide (0x + 40 caractères)';
  if (net === 'trc20') return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(a) ? '' : 'adresse Tron invalide (commence par T)';
  if (net === 'sol') return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a) ? '' : 'adresse Solana invalide';
  return '';
}
const field = (label, name, value, opts = {}) => html`<label class="field ${opts.full ? 'full' : ''}">${label}
  <input name="${name}" type="${opts.type || 'text'}" value="${value ?? ''}" ${opts.required ? new Raw('required') : ''} ${opts.attrs ? new Raw(opts.attrs) : ''} placeholder="${opts.placeholder || ''}"></label>`;
const money$ = 'inputmode="decimal" step="0.01" min="0"';
const tabsBar = (tabs, cur) => html`<div class="tabs tabs-wrap" role="tablist">${tabs.map(([k, label]) => html`<button class="tab" role="tab" aria-selected="${cur === k}" data-action="sheet-tab" data-id="${k}">${label}</button>`)}</div>`;
const kvRow = (k, v) => html`<dt>${k}</dt><dd>${v}</dd>`;
const DEP_CATS = { reparation: '🔧 Réparation', assurance: '🛡️ Assurance', taxe: '🏛️ Taxe / impôt', entretien: '🧹 Entretien', autre: '📦 Autre' };

function tenantFields(l, prefix = '') {
  return html`
    ${field('Prénom', prefix + 'prenom', l.prenom, { attrs: 'autocomplete="off"' })}
    ${field('Nom', prefix + 'nom', l.nom, { required: true, attrs: 'autocomplete="off"' })}
    ${field('Loyer mensuel (€)', prefix + 'loyer', l.loyer, { type: 'number', required: true, attrs: money$ })}
    ${field('Téléphone', prefix + 'tel', l.tel, { type: 'tel', placeholder: '+352 …', attrs: 'autocomplete="off"' })}
    ${field('Email', prefix + 'mail', l.mail, { type: 'email', attrs: 'autocomplete="off"' })}
    ${field('Caution reçue (€)', prefix + 'caution', l.caution, { type: 'number', attrs: money$ })}
    ${field('Caution reçue le', prefix + 'cautionDate', l.cautionDate, { type: 'date' })}
    <label class="field">Caution reçue par<select name="${prefix}cautionMode"><option value="">—</option>${Object.entries(CAUTION_MODES).map(([k, v]) => html`<option value="${k}" ${l.cautionMode === k ? new Raw('selected') : ''}>${v}</option>`)}</select></label>
    ${field('Note caution', prefix + 'cautionNote', l.cautionNote, { placeholder: 'ex. banque, n° de garantie…' })}
    ${field("Début du contrat (entrée)", prefix + 'debut', l.debut, { type: 'date', required: !!prefix })}
    ${field('Fin du contrat', prefix + 'fin', l.fin, { type: 'date' })}
    ${field('Prochaine révision du loyer', prefix + 'revision', l.revision, { type: 'date' })}`;
}

function logementSelect(selLog, selImm) {
  const imms = vault.list('immeubles').filter((im) => !immGone(im) || im.id === selImm || logsOf(im.id).some((g) => g.id === selLog)).sort(byAddr);
  return html`<label class="field full">Logement / local (appartement, n° de chambre, garage…)
    <select name="place" data-input="place" required>
      <option value="">— Choisir —</option>
      ${imms.map((im) => html`<optgroup label="${im.adresse}">
        ${logsOf(im.id).map((g) => {
          const occ = occupantsNow(g.id);
          return html`<option value="log:${g.id}" ${g.id === selLog ? new Raw('selected') : ''}>${logLabel(g)}${logWhere(g) ? ' (' + logWhere(g) + ')' : ''}${occ.length ? ' — occupé (' + occ.map(fullName).join(', ') + ')' : ' — vacant'}</option>`;
        })}
        <option value="new:${im.id}">➕ Nouveau logement / local ici (chambre, appartement, garage…)</option>
        <option value="imm:${im.id}" ${!selLog && selImm === im.id ? new Raw('selected') : ''}>Toute la structure (pas de chambre / logement précis)</option>
      </optgroup>`)}
    </select></label>
    <div class="fields full" id="newLogWrap" hidden>
      ${field('Nom / numéro', 'newLogNom', '', { placeholder: 'ex. Chambre 3, Appartement 2B, Garage 12' })}
      ${logTypeSelect('newLogType', 'chambre')}
      ${field('Étage', 'newLogEtage', '', { placeholder: 'ex. RDC, 1er' })}
      <label class="field">Fait partie de l’appartement (colocation)<input name="newLogPartie" list="colocListAll" autocomplete="off" placeholder="ex. Appartement 1er étage">
        <datalist id="colocListAll">${[...new Set(vault.list('logements').map((g) => (g.partie || '').trim()).filter(Boolean))].map((x) => html`<option value="${x}">`)}</datalist></label>
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
      ${field('Montant TTC (€)', 'montant', '', { type: 'number', required: true, attrs: 'inputmode="decimal" step="0.01" min="0.01"' })}
      <label class="field">TVA<select name="tva"><option value="0">Sans TVA / non déductible</option>${tvaRates().map((r) => html`<option value="${r}">${String(r).replace('.', ',')} %</option>`)}</select></label>
      ${field('Date', 'date', today(), { type: 'date', required: true })}
      ${field('Fournisseur', 'fournisseur', '', { placeholder: 'ex. Électricité Schmit' })}
      ${field('N° de facture', 'numFacture', '', { placeholder: 'ex. F-2026-118' })}
      <label class="field full">Facture (photo ou PDF)<input type="file" name="file" accept="image/*,application/pdf"></label>
      <label class="field">Catégorie<select name="cat">${Object.entries(DEP_CATS).map(([k, v]) => html`<option value="${k}">${v}</option>`)}</select></label>
      <label class="field">Concerne<select name="logId"><option value="">Tout l'immeuble</option>${logs.map((g) => html`<option value="${g.id}">${logLabel(g)}</option>`)}</select></label>
      <button class="btn primary full" type="submit">${icon('plus')} Dépense</button>
    </form>
    ${deps.length ? html`<div class="list">${deps.map((d) => html`<div class="row"><span class="grow"><span class="title" style="display:block">${d.desc}</span><span class="meta">${d.fournisseur ? d.fournisseur + ' · ' : ''}${d.numFacture ? 'n° ' + d.numFacture + ' · ' : ''}${d.tva ? 'TVA ' + String(d.tva).replace('.', ',') + ' % (' + money(d.montant - htOf(d.montant, d.tva)) + ') · ' : ''}${fmtDate(d.date)} · ${DEP_CATS[d.cat] || d.cat}${d.logId ? ' · ' + logName(d.logId) : ''}</span></span>
      ${d.docId && vault.get('documents', d.docId) ? html`<button class="btn sm" data-action="open-doc" data-id="${d.docId}" title="Voir la facture">📎</button>` : html`<label class="btn sm ghost" title="Joindre la facture" style="cursor:pointer">📎+<input type="file" accept="image/*,application/pdf" data-input="dep-file" data-id="${d.id}" hidden></label>`}
      <span class="amount red">−${money(d.montant)}</span><button class="btn icon sm ghost danger" data-action="del-dep" data-id="${d.id}" aria-label="Supprimer">${icon('trash')}</button></div>`)}</div>
      <div class="totals"><span>Total depuis l'origine</span><b class="red">−${money(sum(deps, (d) => d.montant))}</b></div>` : html`<p class="muted small">Aucune dépense.</p>`}`;
}

function bilanTable(rows) {
  return html`<div class="scroll-x"><table class="tbl"><thead><tr><th>Année</th><th class="r">Encaissé</th>${rows.some((r) => r.verse) ? html`<th class="r">Propriét.</th>` : ''}<th class="r">Dépenses</th><th class="r">Net</th></tr></thead><tbody>
    ${rows.map((r) => html`<tr><td>${r.y}</td><td class="r green">${money(r.encaisse)}</td>${rows.some((x) => x.verse) ? html`<td class="r">${r.verse ? '−' + money(r.verse) : '—'}</td>` : ''}<td class="r">${r.depenses ? '−' + money(r.depenses) : '—'}</td><td class="r ${r.net < 0 ? 'red' : 'accent'}">${money(r.net)}</td></tr>`)}
  </tbody></table></div>`;
}
const yearsWithData = (f) => dataYears().filter((y) => y <= new Date().getFullYear()).map((y) => ({ y, ...f(y) })).filter((r) => r.encaisse || r.depenses || r.verse).reverse();

// Texte de relance : mois échus impayés (+ mois en cours après le 5)
// les 6 langues des apps
const RELANG = [['fr', '🇫🇷 Français'], ['it', '🇮🇹 Italiano'], ['de', '🇩🇪 Deutsch'], ['pt', '🇵🇹 Português'], ['en', '🇬🇧 English'], ['es', '🇪🇸 Español']];
function relanceText(l, lang) {
  const d = new Date();
  const y = d.getFullYear(), cm = d.getMonth() + 1;
  const months = lateMonths(l, d).map((m) => ({ y, m }));
  if (d.getDate() > 5 && isDue(l, y, cm) && payState(l, y, cm).rest > 0.009) months.push({ y, m: cm });
  const total = sum(months, (x) => payState(l, x.y, x.m).rest);
  const st = societe();
  const NAMES = {
    fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
    it: ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'],
    en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    pt: ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'],
  };
  const mName = (m) => (NAMES[lang] ? NAMES[lang][m - 1] : new Date(2026, m - 1, 15).toLocaleDateString(lang, { month: 'long' }));
  const list = months.map((x) => `${mName(x.m)} ${x.y} (${money(payState(l, x.y, x.m).rest)})`).join(', ') || '—';
  const where = [logName(l.logId), immName(l.immId)].filter(Boolean).join(', ');
  const sign = st.nom || brandName();
  const iban = st.iban ? (lang === 'fr' ? `\nIBAN : ${st.iban}` : `\nIBAN: ${st.iban}`) : '';
  const T = {
    fr: `Bonjour ${fullName(l)},\n\nSauf erreur de notre part, nous n'avons pas encore reçu le loyer de ${list} pour ${where}, soit ${money(total)} au total.\n\nMerci de procéder au règlement dès que possible, ou de nous contacter si le paiement a déjà été effectué.${iban}\n\nCordialement,\n${sign}`,
    it: `Buongiorno ${fullName(l)},\n\nsalvo errori, non abbiamo ancora ricevuto l'affitto di ${list} per ${where}, per un totale di ${money(total)}.\n\nLa preghiamo di effettuare il pagamento al più presto, o di contattarci se ha già pagato.${iban}\n\nCordiali saluti,\n${sign}`,
    en: `Hello ${fullName(l)},\n\nUnless we are mistaken, we have not yet received the rent for ${list} for ${where}, i.e. ${money(total)} in total.\n\nPlease make the payment as soon as possible, or contact us if it has already been made.${iban}\n\nKind regards,\n${sign}`,
    pt: `Olá ${fullName(l)},\n\nSalvo erro, ainda não recebemos a renda de ${list} referente a ${where}, num total de ${money(total)}.\n\nPedimos que efetue o pagamento o mais rapidamente possível, ou que nos contacte se já o fez.${iban}\n\nCom os melhores cumprimentos,\n${sign}`,
    de: `Guten Tag ${fullName(l)},\n\nsofern wir uns nicht irren, haben wir die Miete für ${list} für ${where} noch nicht erhalten, insgesamt ${money(total)}.\n\nBitte überweisen Sie den Betrag so bald wie möglich oder melden Sie sich bei uns, falls die Zahlung bereits erfolgt ist.${iban}\n\nMit freundlichen Grüßen\n${sign}`,
    es: `Hola ${fullName(l)},\n\nsalvo error por nuestra parte, aún no hemos recibido el alquiler de ${list} para ${where}, es decir ${money(total)} en total.\n\nLe rogamos que efectúe el pago lo antes posible, o que se ponga en contacto con nosotros si ya lo ha realizado.${iban}\n\nAtentamente,\n${sign}`,
  };
  return { body: T[lang] || T.fr, total };
}

const SHEETS = {
  'test-clean'() {
    const p = testPlan(), lab = { immeubles: '🏢 Immeubles', logements: '🚪 Logements', locataires: '👤 Locataires', intervenants: '👷 Ouvriers', hotes: '🛎️ Clients hôtel / Airbnb', paiements: '💶 Paiements', documents: '📎 Documents', taches: '🔧 Travaux', collectes: '🗑️ Collectes', depenses: '🧾 Dépenses' };
    const nm = (c, r) => (c === 'locataires' ? fullName(r) : c === 'intervenants' ? [r.prenom, r.nom].filter(Boolean).join(' ') : c === 'immeubles' ? r.adresse : c === 'logements' ? logName(r.id) : c === 'hotes' ? [r.prenom, r.nom].filter(Boolean).join(' ') + (r.chambre ? ' — ' + r.chambre : '') : r.id);
    return {
      title: '🧹 Supprimer les données de test', narrow: true,
      body: html`<div class="warn-box"><b class="warn-t">⚠️ ATTENTION</b><p>Tout ce qui n’est pas marqué ⭐ « Vrai » (et n’est pas lié à une fiche ⭐) sera effacé. Avant, une sauvegarde chiffrée est téléchargée automatiquement.</p><p>Pour protéger une fiche : ouvrez-la et touchez « ☆ Test ? » à côté du nom → « ⭐ Vrai ».</p></div>
        <div class="section-label">⭐ Gardé (${p.keep.total})</div>
        ${p.keep.total ? html`<div class="list small">${['immeubles', 'locataires', 'intervenants', 'hotes'].flatMap((c) => p.keep[c].map((r) => html`<div class="row"><span class="grow">⭐ ${nm(c, r)}</span><span class="muted tiny">${lab[c]}</span></div>`))}</div>` : html`<p class="small" style="color:#b91c1c"><b>Aucune fiche ⭐ :</b> tout serait effacé. Marquez d’abord vos vraies fiches.</p>`}
        <div class="section-label">🧹 À effacer (${p.del.total})</div>
        <div class="list small">${Object.entries(lab).filter(([c]) => p.del[c].length).map(([c, l]) => html`<div class="row"><span class="grow">${l}</span><b>${p.del[c].length}</b></div>`)}</div>
        ${['locataires', 'intervenants', 'immeubles', 'hotes'].some((c) => p.del[c].length) ? html`<details class="bub-old" style="margin-top:8px"><summary>voir les noms</summary>${['immeubles', 'locataires', 'intervenants', 'hotes'].flatMap((c) => p.del[c].map((r) => html`<div class="tiny">${lab[c]} — ${nm(c, r)}</div>`))}</details>` : ''}`,
      foot: html`<button class="btn" data-action="close-sheet">Annuler</button><button class="btn danger solid" data-action="test-clean-do" ${p.del.total && p.keep.total ? '' : new Raw('disabled')}>🧹 Sauvegarder puis supprimer</button>`,
    };
  },

  'ann-new'({ preset }) {
    const imms = vault.list('immeubles').filter((im) => !immGone(im) && !im.xfer && Object.keys(im.chats || {}).length).sort(byAddr);
    return {
      title: '📣 Nouvelle annonce', narrow: true,
      body: html`<form id="f" data-form="annsend" class="stack">
        <label class="field">Message<textarea name="x" required maxlength="1500" style="min-height:120px" placeholder="ex. Mardi de 9 h à 12 h : coupure d’eau dans tout le quartier.">${preset || ''}</textarea></label>
        <div class="section-label" style="margin:4px 0">À qui ?</div>
        <label class="field">🏠 Habitants<select name="loc"><option value="">— personne —</option>${imms.length ? html`<option value="all">Tous les habitants de tous les immeubles</option>` : ''}${imms.map((im) => html`<option value="i:${im.id}">${im.adresse} — tous</option>${Object.entries(im.chats || {}).length > 1 ? Object.entries(im.chats || {}).map(([gk, g]) => html`<option value="g:${g.id}">&nbsp;&nbsp;${im.adresse} — ${chatLabel(gk)}</option>`) : ''}`)}</select></label>
        <p class="tiny muted" style="margin:0">Chacun le reçoit dans sa chat avec vous, avec « 📣 » devant et une notification ; chacun peut le traduire avec 🌐.</p>
      </form>`,
      foot: html`<button class="btn" data-action="close-sheet">Annuler</button><button class="btn primary" type="submit" form="f">📣 Envoyer</button>`,
    };
  },

  'ann-log'() {
    return { title: '🗂️ Annonces envoyées', narrow: true, body: html`<div class="list">${annLog().slice().reverse().map((a) => html`<div class="row" style="align-items:flex-start"><span class="grow"><span class="title" style="display:block;white-space:pre-wrap">${a.x}</span><span class="meta">${fmtDateTime(a.at)} · ${a.to} · 👤 ${a.by || '—'}</span></span></div>`)}</div>` };
  },

  'centrale-form'() {
    const c = centraleConf();
    return {
      title: '⭐ Responsable de la centrale', narrow: true,
      body: html`<form id="f" data-form="centrale-resp" class="fields">
        <label class="field">Prénom<input name="prenom" value="${c.prenom || ''}" required></label>
        <label class="field">Nom<input name="nom" value="${c.nom || ''}" required></label>
        <label class="field">Téléphone<input type="tel" name="tel" value="${c.tel || ''}" placeholder="+352…"></label>
        <label class="field">Email<input type="email" name="email" value="${c.email || ''}"></label>
        <p class="tiny muted full" style="margin:0">Affiché sur vos documents.</p></form>`,
      foot: html`<button class="btn" data-action="close-sheet">Annuler</button><button class="btn primary" type="submit" form="f">Enregistrer</button>`,
    };
  },

  'share-coll'({ id }) {
    const im = vault.get('immeubles', id);
    if (!im) return null;
    if (!im.pubToken) return {
      title: 'Partager avec les locataires',
      narrow: true,
      body: html`<p style="margin-top:0">Créez une page <b>en lecture seule</b> pour les locataires de <b>${im.adresse}</b> : prochaines collectes, « ce soir, sortez le verre », et un bouton pour ajouter le calendrier à leur téléphone (rappel la veille). En français, allemand, portugais et anglais.</p>
        <div class="alert info">${icon('shield')}<div>La page contient seulement l'adresse de l'immeuble et les dates de collecte : <b>aucun nom, aucune donnée des locataires</b>. Le lien est secret (impossible à deviner) et peut être désactivé à tout moment.</div></div>`,
      foot: html`<button class="btn" data-action="close-sheet">Annuler</button><button class="btn primary" data-action="share-on" data-id="${id}">Créer le lien</button>`,
    };
    const url = pubUrl(im);
    return {
      title: 'Page des locataires',
      narrow: true,
      body: html`<p style="margin-top:0">Donnez ce lien ou ce QR code aux locataires de <b>${im.adresse}</b>. La page se met à jour toute seule quand vous changez les collectes.</p>
        <div class="qr" style="max-width:220px;margin:0 auto 12px">${qrSvg(url, 6)}</div>
        <input readonly value="${url}" style="font-size:13px;width:100%;min-width:0">
        <div class="actions" style="margin-top:10px;flex-direction:column">
          <button class="btn" data-action="share-copy" data-id="${id}">${icon('file')} Copier le lien</button>
          <a class="btn" href="${url}" target="_blank" rel="noopener">${icon('eye')} Voir la page</a>
          <button class="btn" data-action="print-collectes" data-id="${id}" data-y="${new Date().getFullYear()}">${icon('download')} Affiche avec QR</button>
        </div>
        <p class="tiny muted">Astuce : envoyez le lien par WhatsApp ou SMS, ou affichez l'affiche dans l'entrée.</p>`,
      foot: html`<button class="btn ghost danger" data-action="share-off" data-id="${id}">Désactiver le lien</button><button class="btn primary" data-action="close-sheet">OK</button>`,
    };
  },

  'tache-form'({ id, preset }) {
    const t = id ? vault.get('taches', id) : { type: 'reparation', immId: preset || '', statut: 'afaire', date: today(), recur: '' };
    if (id && !t) return null;
    const imms = vault.list('immeubles').filter((im) => !immGone(im) || im.id === t.immId).sort(byAddr);
    if (!imms.length) return { title: 'Nouvelle intervention', body: empty('building', "Ajoutez d'abord un immeuble.") };
    const docs = t.id ? vault.list('documents').filter((x) => x.tacheId === t.id) : [];
    const hist = (ui.lieuH = lieuxHist());
    return {
      title: id ? (t.locId && t.sentAt ? 'Signalement du locataire' : "Modifier l'intervention") : 'Nouvelle intervention',
      body: html`<form id="f" data-form="tache" class="fields">
  <input type="hidden" name="id" value="${id || ''}">
  ${t.locId ? html`<p class="full" style="margin:0">📨 Signalé par <a href="#" data-action="open-loc" data-id="${t.locId}">${fullName(vault.get('locataires', t.locId) || { nom: '?' })}</a>${t.sentAt ? ' le ' + fmtDateTime(t.sentAt) : ''} — il voit l'avancement dans son app.</p>` : ''}
  <label class="field">Type<select name="type">${Object.entries(TACHE_TYPES).map(([k, v]) => html`<option value="${k}" ${(t.type === 'entretien' ? 'reparation' : t.type) === k ? new Raw('selected') : ''}>${v}</option>`)}</select></label>
  ${field('Quoi ?', 'titre', t.titre, { required: true, placeholder: 'ex. Fuite robinet cuisine, nettoyage des communs' })}
  <div class="full lieu-pick">
    <input type="hidden" name="immId" value="${t.lieu ? '' : t.immId || ''}"><input type="hidden" name="lieu" value="${t.lieu ? JSON.stringify(t.lieu) : ''}">
    <div class="section-label" style="margin:0 0 6px">📍 Où ?</div>
    <div class="search">${icon('search')}<input type="search" data-input="lieu-q" placeholder="Rechercher une rue, un immeuble…" autocomplete="off"></div>
    <p class="small lieu-sel" id="lieuSel">${lieuSelHtml(t)}</p>
    <div class="list small lieu-list" id="lieuList">
      ${imms.map((im) => html`<button type="button" class="row" data-action="lieu-set" data-k="i:${im.id}" data-q="${lieuQ(im.adresse, im.nom, im.ville)}" aria-pressed="${!t.lieu && im.id === t.immId}"><span class="avatar">🏠</span><span class="grow"><span class="title" style="display:block">${im.adresse}</span><span class="meta">Nos immeubles</span></span></button>`)}
      ${hist.map((h, n) => html`<button type="button" class="row" data-action="lieu-set" data-k="h:${n}" data-q="${lieuQ(h.nom, h.adr, h.contact)}" aria-pressed="${!!t.lieu && (t.lieu.adr || t.lieu.nom) === (h.adr || h.nom)}"><span class="avatar">🕘</span><span class="grow"><span class="title" style="display:block">${h.nom || h.adr}</span><span class="meta">${h.nom && h.adr ? h.adr : 'Déjà utilisé'}</span></span></button>`)}
      <p class="small muted lieu-none" hidden>Rien trouvé : ajoutez l’adresse ci-dessous.</p>
    </div>
    <button type="button" class="btn sm" data-action="lieu-new" style="margin-top:8px">✏️ Autre adresse (nouveau lieu)</button>
    <div class="fields" id="lieuNew" hidden style="margin-top:8px">
      ${field('Nom du lieu', 'lieuNom', '', { placeholder: 'ex. Résidence Les Tilleuls' })}
      ${field('Adresse', 'lieuAdr', '', { placeholder: 'ex. 12 rue de Hollerich, L-1740 Luxembourg' })}
      ${field('Contact sur place', 'lieuContact', '')}
      ${field('Téléphone', 'lieuTel', '', { type: 'tel' })}
    </div>
  </div>
  <label class="field" id="tacheLogF" ${t.immId && !t.lieu ? '' : new Raw('hidden')}>Logement / partie<select name="logId" id="tacheLog">${t.immId && !t.lieu ? logOptions(t.immId, t.logId) : ''}</select></label>
  ${field('Date', 'date', t.date, { type: 'date' })}
  <label class="field t-hours">Heure<span class="t-hrow"><span class="tph${t.heure ? ' v' : ''}"><input type="time" name="heure" value="${t.heure || ''}" aria-label="De"><i>--:--</i></span><span class="muted">→</span><span class="tph${t.heureFin ? ' v' : ''}"><input type="time" name="heureFin" value="${t.heureFin || ''}" aria-label="À"><i>--:--</i></span></span></label>
  <label class="full t-urg"><input type="checkbox" name="urgent" value="1" ${t.urgent ? new Raw('checked') : ''}> <span>🔴 <b>Urgent</b></span></label>
  <label class="field">Répétition<select name="recur">${Object.entries(RECURS).map(([k, v]) => html`<option value="${k}" ${(t.recur || '') === k ? new Raw('selected') : ''}>${v}</option>`)}</select></label>
  ${field("Jusqu'au (si répétition)", 'fin', t.fin, { type: 'date' })}
  ${field('Coût (€)', 'cout', t.cout, { type: 'number', attrs: money$ })}
  ${!t.recur ? html`<fieldset class="full st-radios"><legend>Statut</legend><div class="st-row">${Object.entries(STATUTS).map(([k, v]) => html`<label class="st-opt st-${k}"><input type="radio" name="statut" value="${k}" ${(t.statut || 'afaire') === k ? new Raw('checked') : ''}><span>${ST_DOT[k]} ${v}</span></label>`)}</div>
    <p class="tiny muted" style="margin:6px 0 0">🔴 <b>À faire</b> · 🟡 <b>Planifiée</b> : jour fixé · 🟢 <b>Terminée</b> : le locataire voit « Terminé » dans son app</p></fieldset>` : ''}
  <label class="field full">Notes<textarea name="note" placeholder="Accès, clés, artisan appelé, ce qui a été fait…">${t.note || ''}</textarea></label>
  <label class="field full">📷 Ajouter des photos<input type="file" name="pbphotos" accept="image/*" multiple></label>
  ${t.depId ? html`<p class="tiny muted full" style="margin:0">✓ Coût enregistré dans les dépenses de l'immeuble.</p>` : ''}
  ${docs.length ? html`<div class="full" style="display:flex;gap:6px;flex-wrap:wrap">${docs.map((x) => html`<button class="btn sm" type="button" data-action="open-doc" data-id="${x.id}">📷 ${String(x.label || '').replace('Signalement — ', '')}</button>`)}</div>` : ''}
</form>`,
      foot: html`${id ? html`<button class="btn ghost danger" data-action="del-tache" data-id="${id}" aria-label="Supprimer">${icon('trash')}</button>` : ''}
        ${id && t.locId && !t.recur && t.statut !== 'fait' ? html`<button class="btn" style="background:var(--green-soft);color:var(--green)" data-action="tache-done" data-id="${id}">${icon('check')} Réparé</button>` : html`<button class="btn" data-action="close-sheet">Annuler</button>`}
        <button class="btn primary" type="submit" form="f">Enregistrer</button>`,
    };
  },

  'esp-list'() {
    const ls = currentLocs().sort((a, b) => immName(a.immId).localeCompare(immName(b.immId)) || byName(a, b));
    const on = ls.filter((l) => l.espace && l.espace.on).length;
    return {
      title: 'App des locataires',
      body: html`<p style="margin-top:0">Les locataires entrent dans leur app avec le <b>lien</b> ou le <b>code personnel</b> que vous leur donnez ici (📲 dans la fiche de chaque locataire). Sans code, personne n'entre.</p>
        <div class="search" style="margin-bottom:8px">${icon('search')}<input type="search" data-input="esp-search" placeholder="Rechercher un nom, un logement, un immeuble, un code…" autocomplete="off"></div>
        <div class="chips" style="margin-bottom:10px">
          <button class="chip" data-action="esp-filter" data-id="" aria-pressed="true">Tous (${ls.length})</button>
          <button class="chip" data-action="esp-filter" data-id="on" aria-pressed="false">Avec accès (${on})</button>
          <button class="chip" data-action="esp-filter" data-id="off" aria-pressed="false">Sans accès (${ls.length - on})</button></div>
        <p class="small muted" id="espCount" style="margin:0 0 6px"></p>
        <div class="list">${ls.map((l) => html`<button class="row" data-action="esp-open" data-id="${l.id}" data-on="${l.espace && l.espace.on ? 'on' : 'off'}" data-q="${[fullName(l), logName(l.logId), immName(l.immId), l.espace && l.espace.code ? l.espace.code : ''].join(' ').toLowerCase()}">
          <span class="grow"><span class="title" style="display:block">${fullName(l)}</span><span class="meta">${[logName(l.logId), immName(l.immId)].filter(Boolean).join(' · ')}</span></span>
          ${l.espace && l.espace.on ? html`<span class="badge ok">✓ ${l.espace.code || 'actif'}</span>` : html`<span class="badge">Pas d'accès</span>`}</button>`)}</div>`,
    };
  },

  'door-form'({ id }) {
    const g = vault.get('logements', id);
    if (!g) return null;
    const pt = g.porte || {};
    const rnd = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, '0');
    return {
      title: 'Code de la porte — ' + logLabel(g),
      narrow: true,
      body: html`<form id="f" data-form="door" class="fields">
        <input type="hidden" name="id" value="${id}">
        ${field('Nouveau code', 'code', rnd, { full: true, required: true, attrs: 'inputmode="numeric" autocomplete="off" style="font-family:var(--mono);font-size:22px;letter-spacing:.1em"' })}
        <p class="tiny muted full" style="margin:0">Code proposé au hasard — vous pouvez le changer. Programmez-le d'abord dans la serrure (app du fabricant), puis enregistrez-le ici.</p>
        <label class="field full">Raison<select name="raison" data-input="door-reason">${['Nouvel occupant', 'Code oublié', 'Sécurité (code diffusé)', 'Fin de séjour / départ', 'Impayé', 'Autre'].map((r) => html`<option value="${r}">${r}</option>`)}</select></label>
        <div class="alert warn full" id="doorWarn" hidden>${icon('alert')}<div><b>Attention :</b> pour un <b>bail d'habitation</b>, bloquer l'accès d'un locataire parce qu'il n'a pas payé est en principe interdit au Luxembourg (seul un juge peut ordonner l'expulsion). Réservé aux séjours courts / chambres d'hôtel selon vos conditions — vérifiez avec votre avocat.</div></div>
        ${field('Serrure (marque / modèle)', 'serrure', pt.serrure, { full: true, placeholder: 'ex. Nuki, TTLock, igloohome…' })}
        ${field("Info pour l'occupant (facultatif)", 'info', pt.info, { full: true, placeholder: 'ex. Tapez le code puis ✓ ; porte d’entrée de l’immeuble : 2580' })}
        ${field('Valable jusqu’au (facultatif)', 'fin', pt.fin && pt.fin >= today() ? pt.fin : '', { type: 'date', full: true })}
        <p class="tiny muted full" style="margin:0">Après cette date, le code disparaît de l’app de l’occupant (il voit le compte à rebours avant). Vide = sans fin.</p>
        ${field('Note (visible seulement par vous)', 'note', '', { full: true })}
      </form>`,
      foot: html`<button class="btn" data-action="close-sheet">Annuler</button><button class="btn primary" type="submit" form="f">Enregistrer le code</button>`,
    };
  },

  'tpay-conf'() {
    const c = vault.get('reglages', 'tpayConf') || {};
    return {
      title: '💳 Paiements',
      narrow: true,
      body: html`<form id="f" data-form="tpay-conf" class="fields">
        <div class="full section-label" style="margin:0">Factures des interventions</div>
        <label class="row full"><input type="radio" name="payMode" value="each" ${c.payMode !== 'month' ? new Raw('checked') : ''}><span class="grow">À chaque intervention</span></label>
        <label class="row full"><input type="radio" name="payMode" value="month" ${c.payMode === 'month' ? new Raw('checked') : ''}><span class="grow">Une facture par mois (récapitulatif)</span></label>
      </form>`,
      foot: html`<button class="btn" data-action="close-sheet">Annuler</button><button class="btn primary" type="submit" form="f">Enregistrer</button>`,
    };
  },

  'ics-all'({ id }) {
    const im = vault.get('immeubles', id);
    if (!im) return null;
    const st = ui.icsAll && ui.icsAll.immId === id ? ui.icsAll : (ui.icsAll = { immId: id, url: '', groups: null });
    const existing = vault.list('collectes').filter((c) => c.immId === id);
    return {
      title: 'Calendrier de la commune',
      body: html`<form id="f" data-form="icsall" class="fields">
        <p class="small full" style="margin:0">Importez le calendrier <b>complet</b> de la commune pour <b>${im.adresse}</b> : CENTRAL-OGL le sépare tout seul par type de déchets (verre, papier, résiduels…) et crée une collecte pour chacun.</p>
        ${field('Lien du calendrier (.ics / webcal) — se met à jour tout seul', 'url', st.url, { full: true, type: 'url', placeholder: 'https://… .ics ou webcal://…' })}
        <div class="full" style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn sm" type="button" data-action="ics-analyze">${icon('sync')} Lire le lien</button>
          <label class="btn sm">${icon('upload')} ou choisir le fichier .ics téléchargé<input type="file" accept=".ics,text/calendar" hidden data-input="icsall-file"></label>
        </div>
        ${st.err ? html`<div class="alert bad full">${icon('alert')}<div>${st.err}</div></div>` : ''}
        ${st.groups ? (st.groups.length ? html`<div class="section-label full" style="margin:6px 0 0">Trouvé dans le calendrier${st.url ? '' : ' (fichier)'}</div>
          <div class="list full">${st.groups.map((g) => html`<label class="row" style="cursor:pointer">
            <input type="checkbox" name="use_${g.cat}" checked style="width:22px;min-height:22px">
            <span class="dot" style="background:${DECHETS[g.cat].color}"></span>
            <span class="grow"><span class="title" style="display:block;white-space:normal">${DECHETS[g.cat].label} — ${plural(g.dates.length, 'passage')}</span>
              <span class="meta" style="white-space:normal">du ${fmtDate(g.dates[0])} au ${fmtDate(g.dates[g.dates.length - 1])}${g.names.length ? ' · « ' + g.names.join(' », « ') + ' »' : ''}${existing.some((c) => c.cat === g.cat) ? ' · remplace la collecte actuelle' : ''}</span></span>
          </label>`)}</div>
          <label class="field">Quand sortir<select name="sortie">${Object.entries(SORTIES).map(([k, v]) => html`<option value="${k}">${v}</option>`)}</select></label>
          ${field('Heure', 'heure', 'après 18 h')}
          <label class="field full">Où sortir les poubelles<select name="lieu">${Object.entries(LIEUX).map(([k, v]) => html`<option value="${k}">${v}</option>`)}</select></label>`
          : html`<div class="alert warn full">${icon('alert')}<div>Aucune date trouvée dans ce calendrier.</div></div>`) : ''}
      </form>`,
      foot: html`<button class="btn" data-action="close-sheet">Annuler</button>${st.groups && st.groups.length ? html`<button class="btn primary" type="submit" form="f">Créer les collectes</button>` : ''}`,
    };
  },

  'collecte-form'({ id, preset }) {
    const c = id ? vault.get('collectes', id) : { immId: preset || '', cat: 'residuel', mode: 'hebdo', jour: 2, lieu: 'rue', debut: today(), sortie: 'veille', heure: 'après 18 h' };
    if (id && !c) return null;
    const imms = vault.list('immeubles').filter((im) => !immGone(im) || im.id === c.immId).sort(byAddr);
    if (!imms.length) return { title: 'Nouvelle collecte', body: empty('building', "Ajoutez d'abord un immeuble.") };
    const y = new Date().getFullYear();
    return {
      title: id ? 'Modifier la collecte' : 'Nouvelle collecte',
      body: html`<form id="f" data-form="collecte" class="fields">
        <input type="hidden" name="id" value="${id || ''}">
        <label class="field full">Immeuble<select name="immId" required>${imms.map((im) => html`<option value="${im.id}" ${im.id === c.immId ? new Raw('selected') : ''}>${im.adresse}</option>`)}</select></label>
        <label class="field full">Déchets<select name="cat">${Object.entries(DECHETS).map(([k, v]) => html`<option value="${k}" ${c.cat === k ? new Raw('selected') : ''}>${v.label}</option>`)}</select></label>
        <label class="field full">Passage<select name="mode" data-input="col-mode">
          <option value="hebdo" ${c.mode === 'hebdo' ? new Raw('selected') : ''}>Chaque semaine, le même jour</option>
          <option value="2sem" ${c.mode === '2sem' ? new Raw('selected') : ''}>Toutes les 2 semaines</option>
          <option value="dates" ${c.mode === 'dates' ? new Raw('selected') : ''}>Dates précises (calendrier de la commune)</option></select></label>
        <div class="fields full" data-mode="hebdo" ${c.mode === 'hebdo' ? '' : new Raw('hidden')}>
          <label class="field">Jour<select name="jour">${[1, 2, 3, 4, 5, 6, 0].map((d) => html`<option value="${d}" ${+c.jour === d ? new Raw('selected') : ''}>${JOURS[d]}</option>`)}</select></label></div>
        <div class="fields full" data-mode="2sem" ${c.mode === '2sem' ? '' : new Raw('hidden')}>
          ${field('Premier passage', 'debut', c.debut || today(), { type: 'date' })}</div>
        <div class="fields full" data-mode="dates" ${c.mode === 'dates' ? '' : new Raw('hidden')}>
          ${field('Lien du calendrier de la commune (mise à jour automatique)', 'icsUrl', c.icsUrl, { full: true, type: 'url', placeholder: 'https://… ou webcal://… (lien .ics copié du site ou de l’app de la commune)' })}
          ${c.icsUrl ? html`<p class="tiny muted full" style="margin:0">${c.icsErr ? html`<span class="red">⚠ Dernier essai : ${c.icsErr}</span>` : c.icsAt ? `✓ Dates reprises du calendrier en ligne le ${fmtDate(c.icsAt)} — vérification automatique chaque jour.` : 'Vérification automatique chaque jour.'} <a href="#" data-action="ics-now" data-id="${c.id}">Mettre à jour maintenant</a></p>` : ''}
          <label class="field full">Dates de passage<textarea name="dates" style="min-height:110px" placeholder="ex. 07/01, 21/01, 04/02 … (année ${y} par défaut) — ou collez le contenu d'un calendrier .ics">${(c.dates || []).map((d) => d.split('-').reverse().join('/')).join(', ')}</textarea></label>
          <label class="btn sm full" style="justify-self:start">${icon('upload')} Importer un fichier .ics<input type="file" accept=".ics,text/calendar" hidden data-input="col-ics"></label>
          <p class="tiny muted full" style="margin:0">Chaque année : remplacez les dates par celles du nouveau calendrier de la commune.</p></div>
        <label class="field">Quand sortir<select name="sortie">${Object.entries(SORTIES).map(([k, v]) => html`<option value="${k}" ${(c.sortie || 'veille') === k ? new Raw('selected') : ''}>${v}</option>`)}</select></label>
        ${field('Heure (facultatif)', 'heure', c.heure, { placeholder: 'ex. après 18 h, avant 6 h' })}
        <p class="tiny muted full" style="margin:0">Les dates ci-dessus sont les jours de <b>passage</b> du camion (comme sur le calendrier de la commune). CENTRAL-OGL calcule quand sortir les poubelles.</p>
        <label class="field full">Où sortir les poubelles<select name="lieu">${Object.entries(LIEUX).map(([k, v]) => html`<option value="${k}" ${c.lieu === k ? new Raw('selected') : ''}>${v}</option>`)}</select></label>
        ${field('Remarque', 'note', c.note, { full: true, placeholder: 'ex. sortir la veille après 18 h, conteneur au garage n°2' })}
      </form>`,
      foot: html`${id ? html`<button class="btn ghost danger" data-action="del-collecte" data-id="${id}" aria-label="Supprimer">${icon('trash')}</button>` : ''}
        <button class="btn" data-action="close-sheet">Annuler</button><button class="btn primary" type="submit" form="f">Enregistrer</button>`,
    };
  },

  'imm-form'({ id }) {
    const im = id ? vault.get('immeubles', id) : {};
    if (id && !im) return null;
    return {
      title: id ? "Modifier l'immeuble" : 'Nouvel immeuble',
      body: html`<form id="f" data-form="imm" class="fields">
        <input type="hidden" name="id" value="${id || ''}">
        ${field('Adresse complète', 'adresse', im.adresse, { full: true, required: true, placeholder: 'ex. 34, rue Josy Haendel' })}
        ${field('Code postal et localité', 'ville', im.ville, { full: true, placeholder: 'ex. L-1840 Luxembourg' })}
        <label class="field full">Pays<select name="pays">${paysOptions(im.pays || societe().pays || 'LU')}</select></label>
        <label class="field full">Type de structure<select name="type">${Object.entries(IMM_TYPES).map(([k, v]) => html`<option value="${k}" ${(im.type || 'immeuble') === k ? new Raw('selected') : ''}>${v}</option>`)}</select></label>
        <div class="section-label full" style="margin:6px 0 0">Bail principal — vous êtes locataire principal, le bailleur est le propriétaire</div>
        ${field('Bailleur (propriétaire)', 'proprietaire', im.proprietaire, { full: true, placeholder: 'Nom du bailleur / propriétaire (vide si l’immeuble vous appartient)' })}
        ${field('Loyer au bailleur (€ / mois)', 'loyer', im.loyer, { type: 'number', attrs: money$ })}
        ${field('Charges (€ / mois)', 'charges', im.charges, { type: 'number', attrs: money$ })}
        ${field('Début du bail principal', 'bailDebut', im.bailDebut, { type: 'date' })}
        ${field('Fin du bail principal', 'bailFin', im.bailFin, { type: 'date' })}
        ${field('Révision du loyer au bailleur', 'bailRev', im.bailRev, { type: 'date' })}
        ${field('Préavis du contrat (mois)', 'preavis', im.preavis, { type: 'number', placeholder: 'ex. 3 — voir le contrat', attrs: 'inputmode="numeric" min="0" max="24" step="1"' })}
        <label class="field">Renouvellement<select name="bailDec">${Object.entries(BAIL_DEC).map(([k, v]) => html`<option value="${k}" ${(im.bailDec || '') === k ? new Raw('selected') : ''}>${v}</option>`)}</select></label>
        <p class="tiny muted full" style="margin:0">📅 Alerte sur l’Accueil 6 mois avant la fin du bail principal, avec la date limite du préavis (les mois écrits dans votre contrat) et une lettre A4 « renouvellement oui / non » à faire signer au bailleur.</p>
        <label class="field full">Notes<textarea name="note" placeholder="Travaux, assurance, syndic…">${im.note || ''}</textarea></label>
        <div class="section-label full" style="margin:6px 0 0">📍 Position du lieu — contrôle de l’arrivée et du départ de l’équipe</div>
        <input type="hidden" name="geoLa" value="${Array.isArray(im.geo) ? im.geo[0] : ''}"><input type="hidden" name="geoLo" value="${Array.isArray(im.geo) ? im.geo[1] : ''}">
        <p class="small full" id="geoNow" style="margin:0">${Array.isArray(im.geo) ? `✓ ${im.geo[0]}, ${im.geo[1]}${im.geoSrc === 'ici' ? ' (enregistrée sur place)' : ' (OpenStreetMap)'}` : 'Pas encore de position.'}</p>
        <div class="full actions" style="margin:0;flex-wrap:wrap"><button type="button" class="btn sm" data-action="imm-geo-osm">🔎 Chercher l’adresse (OpenStreetMap)</button><button type="button" class="btn sm" data-action="imm-geo-here">📍 Je suis sur place : enregistrer</button></div>
        <p class="tiny muted full" style="margin:0">Quand un ouvrier touche Arrivée / Départ, son app envoie sa position (seulement à ce moment) : vous voyez « ✅ sur place » (moins de 150 m) ou « ⚠️ à … km ». OpenStreetMap ne reçoit que l’adresse de l’immeuble.</p>
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
          <div class="list" style="margin-bottom:16px">${unassigned.map((l) => html`<div class="row"><span class="avatar">${avIn(l)}</span><span class="grow title">${fullName(l)}</span><button class="btn sm" data-action="edit-loc" data-id="${l.id}">Attribuer</button></div>`)}</div>` : ''}
        ${logs.length ? html`${(() => {
          const row = (g, inside) => {
          const occ = occupantsNow(g.id);
          const next = tenantsOfLog(g.id).filter((l) => isFuture(l));
          const leaving = occ.filter((l) => l.sortie);
          return html`<button class="row" data-action="open-log" data-id="${g.id}">
            <span class="avatar" style="${occ.length ? '' : 'background:var(--amber-soft);color:var(--amber)'}">${icon(logIcon(g.type))}</span>
            <span class="grow"><span class="title" style="display:block">${logLabel(g)} <span class="muted small">${inside ? '' : [logKind(g), logWhere(g)].filter(Boolean).join(' · ')}</span></span>
              <span class="meta" style="display:flex;gap:6px;flex-wrap:wrap">${occ.length ? occ.map(fullName).join(', ') : html`<span class="badge warn">Vacant</span>`}
              ${leaving.map((l) => html`<span class="badge warn">départ ${fmtDate(l.sortie)}</span>`)}${next.map((l) => html`<span class="badge acc">arrivée ${fmtDate(l.debut)}</span>`)}</span></span>
            <span class="tiny muted">${plural(tenantsOfLog(g.id).length, 'occupant')}</span>
          </button>`;
          };
          const colocs = colocsOf(id), inColoc = new Set(colocs.flatMap((c) => c.logs.map((g) => g.id)));
          const alone = logs.filter((g) => !inColoc.has(g.id)), orphanRooms = alone.filter((g) => g.type === 'chambre');
          return html`${colocs.map((c) => {
            const busy = c.logs.filter((g) => occupantsNow(g.id).length).length;
            return html`<div class="coloc card" style="padding:10px 12px;margin-bottom:12px">
              <b style="display:block;font-size:16px">🏠 ${c.nom}</b>
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:4px 0 8px"><span class="badge">${plural(c.logs.length, 'chambre')} · ${busy} occupée${busy > 1 ? 's' : ''}</span>${c.logs[0].etage ? html`<span class="tiny muted">étage ${c.logs[0].etage}</span>` : ''}
                <span style="flex:1"></span><button class="btn sm" data-action="coloc-add" data-imm="${id}" data-p="${c.nom}">${icon('plus')} Chambre</button></div>
              <div class="list">${c.logs.map((g) => row(g, true))}</div></div>`;
          })}
          ${alone.length ? html`<div class="list">${alone.map(row)}</div>` : ''}
          ${orphanRooms.length > 1 ? html`<p class="tiny muted" style="margin:6px 2px 0">ℹ️ ${plural(orphanRooms.length, 'chambre')} sans appartement indiqué : leurs habitants discutent ensemble. S’il y a plusieurs appartements, indiquez-le dans chaque chambre (« Fait partie de l’appartement »).</p>` : ''}`;
        })()}` : html`<p class="muted small">Aucun logement. Ajoutez les appartements, chambres, garages, bureaux ou locaux de cette structure pour suivre leurs occupants successifs.</p>`}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px">
          <button class="btn primary" data-action="new-log" data-imm="${id}" style="white-space:normal;line-height:1.2">＋ Logement / local</button>
          <button class="btn primary" data-action="coloc-new" data-imm="${id}" style="white-space:normal;line-height:1.2">＋ Colocation<span style="display:block;font-size:11px;font-weight:500;opacity:.85">2 à 10 chambres</span></button></div>`;
    } else if (tab === 'chat') {
      const on = chatOn(im);
      const groups = Object.entries(im.chats || {});
      if (on) setTimeout(() => chatLoad(id), 0); // relit le fil s'il date de plus de 15 s
      body = html`
        <label class="row" style="cursor:pointer;margin-bottom:10px"><input type="checkbox" data-input="chat-on" data-id="${id}" ${on ? new Raw('checked') : ''} style="width:22px;min-height:22px">
          <span class="grow"><b>Messages de la maison</b><span class="meta" style="display:block">Mini-chat entre les habitants, dans leur app — actif par défaut entre colocataires d’un même appartement. Vous lisez tout, vous pouvez répondre et supprimer un message.</span></span></label>
        ${on ? html`<label class="field" style="margin-bottom:6px">Qui discute ensemble ?<select data-input="chat-scope" data-id="${id}">${Object.entries(CHAT_SCOPES).map(([k, v]) => html`<option value="${k}" ${chatScope(im) === k ? new Raw('selected') : ''}>${v}</option>`)}</select></label>
          <label class="row" style="cursor:pointer;margin:6px 0"><input type="checkbox" data-input="bins-on" data-id="${id}" ${binsOn(im) ? new Raw('checked') : ''} style="width:22px;min-height:22px">
            <span class="grow"><b>🗑️ Tour des poubelles</b><span class="meta" style="display:block">À tour de rôle entre les habitants de chaque fil, automatiquement (le nouveau locataire prend la place de celui qui part). Dans leur app : « Ce soir c’est ton tour », ✅ Fait, 🔁 Je ne peux pas.</span></span></label>
          ${groups.length ? html`<p style="margin:4px 0;display:flex">${new Raw(trButton())}</p>` : ''}${groups.length ? groups.map(([gk, g]) => html`<div class="section-label" data-nofold="1">👥 ${g.members.map((m) => shortName(vault.get('locataires', m) || {})).join(', ')}${g.members.length < 2 ? html` <span class="badge">✉️ seul·e — écrit au gestionnaire</span>` : html` <span class="muted small">· vivent ensemble (${chatLabel(gk)})</span>`}</div>
            ${binsTable(im, g) ? html`<details class="card dfold gfold" data-gk="chatfold|bins|${g.id}" ${foldIsOpen('chatfold|bins|' + g.id) ? new Raw('open') : ''}><summary><h3>🗑️ Poubelles : qui les sort et quand</h3></summary><div class="dfold-body">${binsTable(im, g)}</div></details>` : ''}
            <details class="card dfold gfold" data-gk="chatfold|msg|${g.id}" ${foldIsOpen('chatfold|msg|' + g.id) ? new Raw('open') : ''}><summary><h3>💬 Messages entre eux et avec vous</h3></summary><div class="dfold-body">
            <div class="chat">${chatBubbles((ui.chatView || {})[g.id], g.id)}</div>
            <form data-form="chatpost" class="chat-form"><input type="hidden" name="imm" value="${id}"><input type="hidden" name="gk" value="${gk}">
              <textarea name="x" required maxlength="1500" placeholder="Écrire aux habitants (en tant que gestionnaire)…" data-draft="h:${g.id}">${(ui.drafts || {})['h:' + g.id] || ''}</textarea><button class="btn primary" type="submit">${icon('msg')} Envoyer</button>
              ${g.members.length > 1 ? html`<label class="field chat-to">À<select name="to" data-gid="${g.id}"><option value="">👥 Tous les habitants du fil</option>${g.members.map((mid) => html`<option value="${mid}" ${(ui.chatTo || {})[g.id] === mid ? new Raw('selected') : ''}>✋ Privé — ${shortName(vault.get('locataires', mid) || {})}</option>`)}</select></label>` : ''}</form>
            <p class="tiny muted" style="margin:2px 0 6px">✋ = message privé entre un habitant et vous (les autres ne le voient pas). Dans leur app : ✓ envoyé · ✓✓ arrivé ici · ✓✓ bleu lu par vous. Chacun peut modifier, rendre privé / public ou supprimer son message pendant 15 minutes ; vous voyez le texte d’avant.</p></div></details>`)
          : html`<p class="muted small">Aucun fil pour le moment : un fil se crée tout seul dès que 2 personnes habitent le même appartement (ou le même groupe choisi ci-dessus).</p>`}` : ''}
        <div class="section-label">📜 Règles propres à cet immeuble</div>
        <form data-form="regles" class="stack"><input type="hidden" name="id" value="${id}">
          <textarea name="regles" style="min-height:90px" placeholder="ex. Machine à laver jusqu'à 21 h. Vélos dans la cour, pas dans le couloir.">${im.regles || ''}</textarea>
          <button class="btn" type="submit">Enregistrer les règles</button></form>
        <p class="tiny muted">Elles s'ajoutent au règlement général (calme, propreté, évacuations, déchets, tabac, visiteurs, sécurité, énergie, respect) affiché dans l'app de chaque locataire, dans sa langue. À sa première ouverture de l'app, chaque locataire doit toucher « J'ai lu et j'accepte » avant de voir le reste ; la date apparaît dans sa fiche. Si vous modifiez ces règles, tous les locataires de l'immeuble doivent les accepter à nouveau.</p>`;
    } else if (tab === 'dechets') {
      body = html`<p class="small muted" style="margin:0 0 10px">Jours de collecte (jours fixes ou calendrier de la commune) : vos locataires les voient dans leur app (« Collectes des déchets » coché dans leur Espace).</p>${collCard(im)}`;
    } else if (tab === 'proprio') {
      const rent = ownerRent(im);
      const cy = y, cm = new Date().getMonth() + 1;
      body = html`
        <dl class="kv" style="margin-bottom:16px">
          ${kvRow('Structure', IMM_TYPES[im.type] || IMM_TYPES.immeuble)}
          ${kvRow('Bailleur (propriétaire)', im.proprietaire || '—')}
          ${kvRow('Locataire principal', html`${societe().nom || DEF_SOC()} (vous)`)}
          ${kvRow('Loyer + charges', rent ? money(rent) + ' / mois' : '—')}
          ${kvRow('Bail principal', html`${im.bailDebut ? fmtDate(im.bailDebut) : '?'} → ${im.bailFin ? fmtDate(im.bailFin) : 'indéterminé'}${im.preavis ? html` · préavis ${im.preavis} mois${im.bailFin ? html` (avant le <b>${fmtDate(addMonths(im.bailFin, -num(im.preavis)))}</b>)` : ''}` : ''}${im.bailDec ? html` · ${BAIL_DEC[im.bailDec] || ''}` : ''}`)}
          ${rent ? kvRow('Rentabilité ce mois', html`${rentaLine(rentaMois(im))}<div class="tiny muted"><span>loyers des locataires − bailleur (loyer + charges)</span>${rentaMois(im).dep ? html`<span> − dépenses (moyenne du mois)</span>` : ''}${rentaMois(im).vides ? html` · <span>${rentaMois(im).vides} logement(s) vide(s)</span>` : ''}</div>`) : ''}
          ${kvRow('Total versé', html`<span class="num">${money(sum(versementsOf(id), (v) => v.montant))}</span>`)}
        </dl>
        ${isBailPrincipal(im) ? html`<div class="actions" style="margin:-6px 0 14px;flex-wrap:wrap"><button class="btn sm" data-action="bail-letter" data-id="${id}">📄 Lettre A4 — renouvellement oui / non</button></div>` : ''}
        ${rent ? [cy, cy - 1].map((yy) => html`<div class="section-label" style="margin-top:4px">${yy} · versé ${money(sum(versementsOf(id, yy), (v) => v.montant))}</div>
          ${monthGrid(yy, MONTHS.map((mn, i) => {
            const m = i + 1;
            const v = versement(id, yy, m);
            const dueM = isOwnerDue(im, yy, m);
            const past = ym(yy, m) < ym(cy, cm);
            return html`<button class="mcell ${v ? 'paid' : !dueM ? 'off' : past ? 'late' : ''}" data-action="toggle-vers" data-imm="${id}" data-y="${yy}" data-m="${m}">${mn}<small>${v ? '✓' : dueM ? (past ? '!' : '·') : '–'}</small></button>`;
          }))}`) : html`<div class="alert info">${icon('key')}<div>Aucun loyer au bailleur renseigné. Si vous louez cet immeuble à un bailleur, indiquez le montant dans « Modifier ».</div></div>`}
        <p class="tiny muted">Touchez un mois pour enregistrer le versement au bailleur.</p>`;
    } else if (tab === 'deps') {
      body = depensesPanel(id);
    } else {
      const b = bilan({ immId: id });
      const logs = logsOf(id);
      body = html`
        <div class="metrics" style="margin-bottom:16px">
          <div class="metric hero"><div class="lbl">Gain net depuis l'origine</div><div class="val ${b.net < 0 ? 'red' : 'accent'}">${money(b.net)}</div><div class="sub">loyers encaissés − bailleur − dépenses</div></div>
          <div class="metric"><div class="lbl">Loyers encaissés</div><div class="val green">${money(b.encaisse)}</div></div>
          <div class="metric"><div class="lbl">Versé bailleur</div><div class="val">${money(b.verse)}</div></div>
          <div class="metric"><div class="lbl">Réparations & frais</div><div class="val">${money(b.depenses)}</div></div>
          <div class="metric"><div class="lbl">Occupants</div><div class="val">${b.occupants}</div><div class="sub">depuis l'origine</div></div>
        </div>
        <div class="section-label">Par année</div>
        ${bilanTable(yearsWithData((yy) => bilan({ immId: id, y: yy })))}
        ${logs.length ? html`<div class="section-label">Par logement</div>
        <div class="list">${logs.map((g) => {
          const bb = bilan({ logId: g.id });
          const occ = occupancy(g.id);
          return html`<button class="row" data-action="open-log" data-id="${g.id}" data-tab="bilan"><span class="grow"><span class="title" style="display:block">${logLabel(g)}</span>
            <span class="meta">${plural(bb.occupants, 'occupant')}${occ ? ` · occupé ${pct(occ.occupied, occ.total)}% du temps` : ''}${bb.depenses ? ' · dépenses ' + money(bb.depenses) : ''}</span></span>
            <span class="amount green">${money(bb.encaisse)}</span></button>`;
        })}</div>` : ''}`;
    }
    return {
      title: html`${im.adresse} ${vraiBtn('immeubles', im)}`,
      body: html`${immGone(im) ? html`<div class="alert info" style="margin-bottom:12px">${icon('history')}<div><b>Plus en gestion</b> depuis le ${fmtDate(im.finGestion)}${im.finNote ? ' — ' + im.finNote : ''}. Tout l'historique reste consultable et compte dans les statistiques.</div></div>` : ''}${tabsBar([['logs', 'Logements'], ['chat', `💬 Messages${(ui.chatNew || {})[id] ? ' (' + ui.chatNew[id] + ')' : ''}`], ['proprio', 'Bailleur'], ['dechets', '🗑️ Déchets'], ['deps', 'Dépenses'], ['bilan', 'Bilan']], tab)}${body}`,
      foot: html`${immGone(im) ? html`<button class="btn" data-action="reopen-imm" data-id="${id}">${icon('sync')} Réactiver</button>` : html`<button class="btn" data-action="end-imm" data-id="${id}">${icon('history')} Fin de gestion</button>`}<button class="btn icon" data-action="print-imm" data-id="${id}" aria-label="Imprimer">${icon('download')}</button><button class="btn" data-action="edit-imm" data-id="${id}">${icon('edit')} Modifier</button>`,
    };
  },

  'endimm-form'({ id }) {
    const im = vault.get('immeubles', id);
    if (!im) return null;
    const cur = tenantsOfImm(id).filter((l) => isCurrent(l) && !isFuture(l));
    return {
      title: 'Fin de gestion',
      narrow: true,
      body: html`<form id="f" data-form="endimm" class="fields">
        <input type="hidden" name="id" value="${id}">
        <div class="alert info full">${icon('history')}<div><b>${im.adresse}</b> n'est plus en votre possession ou en gestion ? L'immeuble passe dans « Plus en gestion ». <b>Rien n'est effacé</b> : logements, anciens locataires, loyers, versements et dépenses restent dans l'historique et les statistiques.</div></div>
        ${field('Date de fin de gestion', 'fin', today(), { type: 'date', required: true, full: true })}
        ${cur.length ? html`<div class="alert warn full">${icon('users')}<div>${plural(cur.length, 'locataire')} encore en place (${cur.map(fullName).join(', ')}) : leur sortie sera enregistrée à cette date et ils passeront dans les anciens locataires.</div></div>` : ''}
        <label class="field full">Remarque<textarea name="note" style="min-height:70px" placeholder="Vendu, bail principal résilié, rendu au bailleur…"></textarea></label>
      </form>`,
      foot: html`<button class="btn" data-action="close-sheet">Annuler</button><button class="btn primary" type="submit" form="f">Confirmer la fin de gestion</button>`,
    };
  },

  'coloc-form'({ preset }) {
    const im = vault.get('immeubles', preset);
    if (!im) return null;
    return {
      title: 'Appartement en colocation',
      narrow: true,
      body: html`<p class="small" style="margin-top:0">Un appartement avec plusieurs chambres louées séparément : chaque chambre a son locataire, ses loyers et ses quittances ; les habitants de l’appartement ont leurs messages en commun (💬 messagerie).</p>
        <form id="fColoc" data-form="coloc" class="fields">
          <input type="hidden" name="immId" value="${im.id}">
          ${field('Nom ou indication', 'nom', '', { full: true, required: true, placeholder: 'ex. Résidence Les Lilas ; Escalier A ; Porte C' })}
          ${field('Étage', 'etage', '', { placeholder: 'ex. RDC, 1er' })}
          <label class="field" style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" name="mans" style="width:22px;min-height:22px"> + une mansarde (chambre sous les toits)</label>
          <label class="field" style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" name="cave" style="width:22px;min-height:22px"> 🍷 Cave commune</label>
          <label class="field">🚗 Garage<select name="garage"><option value="">—</option>${Object.entries(ANNEX_OPT.garage).map(([o, v]) => html`<option value="${o}">${v}</option>`)}</select></label>
          <label class="field">Nombre de chambres<select name="n">${[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => html`<option value="${n}" ${n === 4 ? new Raw('selected') : ''}>${n}</option>`)}</select></label>
          ${field('Loyer indicatif par chambre (€)', 'loyer', '', { type: 'number', attrs: money$ })}
          ${field('Surface d’une chambre (m²)', 'surface', '', { type: 'number', attrs: 'inputmode="decimal" min="0" step="0.5"' })}
        </form>
        <p class="tiny muted">Les chambres sont créées « Chambre 1 », « Chambre 2 »… : vous pouvez ensuite les renommer et corriger la surface de chacune. Une chambre de plus ? Bouton « + Chambre » sur l’appartement.</p>`,
      foot: html`<button class="btn" data-action="close-sheet">Annuler</button><button class="btn primary" type="submit" form="fColoc">Créer l’appartement et ses chambres</button>`,
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
        ${field('Nom / numéro', 'nom', g.nom, { full: true, required: true, placeholder: 'ex. Appartement 2B, Chambre 3, Garage 12, Bureau 1' })}
        <label class="field full">Immeuble<select name="immId" required>${vault.list('immeubles').filter((im) => !immGone(im) || im.id === g.immId).sort(byAddr).map((im) => html`<option value="${im.id}" ${im.id === g.immId ? new Raw('selected') : ''}>${im.adresse}</option>`)}</select></label>
        ${logTypeSelect('type', g.type)}
        <fieldset class="field full park-set" ${PARK_TYPES.includes(g.type) ? '' : new Raw('hidden')} style="border:1px solid var(--border);border-radius:12px;padding:10px 12px;margin:0">
          <legend class="small" style="padding:0 6px;font-weight:700">🅿️ Place : pour quel véhicule</legend>
          <label class="field">Taille<select name="pk_taille"><option value="">—</option>${Object.entries(PARK_SIZE).map(([k, v]) => html`<option value="${k}" ${(g.park || {}).taille === k ? new Raw('selected') : ''}>${v}</option>`)}</select></label>
          <label class="field">Ouvert ou fermé<select name="pk_genre"><option value="">—</option>${Object.entries(PARK_KIND).map(([k, v]) => html`<option value="${k}" ${(g.park || {}).genre === k ? new Raw('selected') : ''}>${v}</option>`)}</select></label>
          <label class="field">Hauteur maximale (m, facultatif)<input type="number" name="pk_h" value="${(g.park || {}).h || ''}" min="1" max="6" step="0.05" inputmode="decimal" placeholder="ex. 2,10"></label>
          <p class="tiny muted" style="margin:4px 0 0">Mesures indicatives (elles varient selon la commune). La surface en m² reste facultative.</p>
        </fieldset>
        <label class="field">Chambres (appartement, maison)<select name="ch"><option value="">—</option>${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => html`<option value="${n}" ${+g.ch === n ? new Raw('selected') : ''}>${n}</option>`)}</select></label>
        <label class="field">Type de maison<select name="maison"><option value="">—</option>${Object.entries(MAISON_T).map(([k, v]) => html`<option value="${k}" ${g.maison === k ? new Raw('selected') : ''}>${v}</option>`)}</select></label>
        <fieldset class="field full annex-set" style="border:1px solid var(--border);border-radius:12px;padding:10px 12px;margin:0">
          <legend class="small" style="padding:0 6px;font-weight:700">Compris avec le logement</legend>
          ${(() => { const a = annexOf(g), m2 = g.annexM2 || {};
            const sq = (k) => html`<input type="number" name="m2_${k}" value="${m2[k] || ''}" min="0" step="0.5" inputmode="decimal" placeholder="m²" aria-label="m²" style="width:76px;min-height:36px;padding:4px 8px">`;
            return html`<div style="display:grid;gap:8px">${['cave', 'parking', 'jardin', 'balcon'].map((k) => html`<div style="display:flex;align-items:center;gap:8px"><label style="display:flex;align-items:center;gap:6px;flex:1"><input type="checkbox" name="ax_${k}" ${a[k] ? new Raw('checked') : ''} style="width:20px;min-height:20px"> ${ANNEX[k]}</label>${sq(k)}<span class="tiny muted">m²</span></div>`)}
            ${['mans', 'garage'].map((k) => html`<div style="display:flex;align-items:flex-end;gap:8px"><label class="small" style="flex:1">${ANNEX[k]}<select name="ax_${k}"><option value="">—</option>${Object.entries(ANNEX_OPT[k]).map(([o, v]) => html`<option value="${o}" ${a[k] === o ? new Raw('selected') : ''}>${v}</option>`)}</select></label>${sq(k)}<span class="tiny muted" style="padding-bottom:10px">m²</span></div>`)}</div>`; })()}
          <p class="tiny muted" style="margin:8px 0 0">Compris dans le loyer. Une cave ou un garage loué à part (ou gardé pour vous) : créez-le comme logement « Cave » ou « Garage » — son locataire a son app, ses loyers, son état des lieux et écrit au gestionnaire.</p>
        </fieldset>
        ${field('Surface (m²)', 'surface', g.surface, { type: 'number', attrs: 'inputmode="decimal" min="0" step="0.1"' })}
        ${field('Étage', 'etage', g.etage, { placeholder: 'ex. RDC, 1er, sous-sol' })}
        <fieldset class="field full" style="border:1px solid var(--border);border-radius:12px;padding:10px 12px;margin:0">
          <legend class="small" style="padding:0 6px;font-weight:700">Comment se loue-t-il ?</legend>
          <label class="row" style="cursor:pointer;padding:6px 0"><input type="radio" name="louemode" value="entier" ${g.partie ? '' : new Raw('checked')} style="width:20px;height:20px;flex:none"><span class="grow">🏠 <b>Entier</b> — famille, couple ou personne seule</span></label>
          <label class="row" style="cursor:pointer;padding:6px 0"><input type="radio" name="louemode" value="chambre" ${g.partie ? new Raw('checked') : ''} style="width:20px;height:20px;flex:none"><span class="grow">🛏️ <b>Chambre en colocation</b> — dans un appartement partagé</span></label>
          <div class="coloc-pick" ${g.partie ? '' : new Raw('hidden')}>
            <label class="field">Dans quel appartement ?<select name="partieSel">${colocsOf(g.immId).map((c) => html`<option value="${c.nom}" ${c.nom === g.partie ? new Raw('selected') : ''}>${c.nom}</option>`)}<option value="__new" ${colocsOf(g.immId).length ? '' : new Raw('selected')}>➕ Nouvel appartement partagé</option></select></label>
            <label class="field coloc-new" ${colocsOf(g.immId).length ? new Raw('hidden') : ''}>Nom du nouvel appartement<input name="partieNew" autocomplete="off" placeholder="ex. Appartement 2e étage"></label>
            <p class="tiny muted" style="margin:4px 0 0">Les chambres d’un même appartement sont reliées : chat des colocataires, tour des poubelles, loyers chambre par chambre, entrées et sorties, pannes des parties communes.</p>
          </div>
        </fieldset>
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
          ${kvRow('Type', logKind(g) || '—')}
          ${g.type === 'maison' && g.maison ? kvRow('Maison', MAISON_T[g.maison]) : ''}
          ${annexText(g) ? kvRow('Compris', annexText(g)) : ''}
          ${PARK_TYPES.includes(g.type) && parkTxt(g) ? kvRow('🅿️ Place', parkHtml(g)) : ''}
          ${g.surface ? kvRow('Surface', g.surface + ' m²') : ''}
          ${g.etage ? kvRow('Étage', g.etage) : ''}
          ${g.partie ? kvRow('Situé dans', g.partie) : ''}
          ${g.loyer ? kvRow('Loyer indicatif', money(g.loyer)) : ''}
        </dl>
        ${g.note ? html`<div class="note" style="margin-bottom:16px">${g.note}</div>` : ''}
        <div class="section-label" style="margin-top:0">Occupant${occ.length > 1 ? 's' : ''} actuel${occ.length > 1 ? 's' : ''}</div>
        ${occ.length ? html`<div class="list" style="margin-bottom:12px">${occ.map((l) => html`<div class="row">
          <button class="avatar" style="border:0;cursor:pointer" data-action="open-loc" data-id="${l.id}">${avIn(l)}</button>
          <button class="grow" style="background:none;border:0;font:inherit;color:inherit;text-align:left;cursor:pointer;min-width:0" data-action="open-loc" data-id="${l.id}"><span class="title" style="display:block">${fullName(l)}</span><span class="meta">depuis ${fmtDate(l.debut) || '?'}${l.sortie ? ' · départ le ' + fmtDate(l.sortie) : ''}</span></button>
          <button class="btn sm" data-action="open-esp" data-id="${l.id}" title="App du locataire : code et lien">📲 ${l.espace && l.espace.on ? '✓' : 'App'}</button><button class="btn sm" data-action="replace" data-id="${l.id}">${icon('sync')} Changer</button>
        </div>`)}</div>` : html`<div class="alert warn" style="margin-bottom:12px">${icon('home')}<div><b>Logement vacant</b>${last ? html` depuis le départ de ${fullName(last)} (${fmtDate(last.sortie)})` : ''}.</div></div>`}
        ${future.length ? html`<div class="section-label">Arrivée prévue</div><div class="list" style="margin-bottom:12px">${future.map((l) => html`<button class="row" data-action="open-loc" data-id="${l.id}"><span class="avatar">${avIn(l)}</span><span class="grow"><span class="title" style="display:block">${fullName(l)}</span><span class="meta">le ${fmtDate(l.debut)}</span></span></button>`)}</div>` : ''}
        <button class="btn block ${occ.length ? '' : 'primary'}" data-action="new-loc" data-log="${id}">${icon('plus')} ${occ.length ? '2ᵉ personne (couple, ami…)' : 'Locataire'}</button>`;
    } else if (tab === 'porte') {
      const pt = g.porte || {};
      const shownTo = occ.filter((l) => l.espace && l.espace.on && (l.espace.show || {}).porte);
      body = html`
        <div class="card" style="text-align:center;margin-bottom:12px"><div class="tiny muted">Code actuel de la porte</div>
          <div style="font-family:var(--mono);font-size:30px;font-weight:800;letter-spacing:.12em">${pt.code ? (ui.showDoor === id ? pt.code : '•'.repeat(pt.code.length)) : '—'}</div>
          ${pt.code ? html`<button class="btn sm ghost" data-action="door-show" data-id="${id}">${icon('eye')} ${ui.showDoor === id ? 'Masquer' : 'Afficher'}</button>` : ''}
          <div class="tiny muted">${pt.maj ? 'depuis le ' + fmtDate(pt.maj) : ''}${pt.serrure ? ' · ' + pt.serrure : ''}</div>
          ${pt.code ? html`<div style="margin-top:8px">${pt.off ? html`<span class="badge bad">⏸️ <span>Désactivé</span></span>` : pt.fin && pt.fin < today() ? html`<span class="badge bad">⌛ <span>Expiré le</span> ${fmtDate(pt.fin)}</span>` : html`<span class="badge ok">🟢 <span>Actif</span>${pt.fin ? html` · <span>jusqu’au</span> ${fmtDate(pt.fin)}` : ''}</span>`}</div>
            <button class="btn sm" style="margin-top:8px" data-action="door-toggle" data-id="${id}">${pt.off ? '▶️ Réactiver le code' : '⏸️ Désactiver le code'}</button>` : ''}</div>
        <button class="btn primary block" data-action="door-change" data-id="${id}">${icon('key')} ${pt.code ? 'Changer le code' : 'Enregistrer le code de la porte'}</button>
        <p class="tiny muted">${shownTo.length ? `Visible dans l'espace de ${shownTo.map(fullName).join(', ')} : il voit le nouveau code dès que vous le changez.` : "Pour que l'occupant voie le code dans son app : fiche locataire → Espace → cochez « Code de la porte »."}</p>
        ${(pt.hist || []).length ? html`<div class="section-label">Historique des codes</div><div class="list">${[...pt.hist].reverse().map((h) => html`<div class="row"><span class="grow"><span class="title" style="display:block">${fmtDate(h.d)} — ${h.raison}</span><span class="meta">${'•'.repeat(Math.max(0, (h.code || '').length - 2))}${(h.code || '').slice(-2)}${h.note ? ' · ' + h.note : ''}</span></span></div>`)}</div>` : ''}`;
    } else if (tab === 'edl') {
      const outs = edlOf(id, 'edl-out'), old = edlOf(id).filter((d) => !EDL_ROOM[d.room]);
      const who = outs.length ? vault.get('locataires', outs[outs.length - 1].locId) : null;
      const fig = (ph, cls, cap) => ph ? html`<figure class="edl ${cls}">
          <button class="edl-img" data-action="open-doc" data-id="${ph.id}" aria-label="Agrandir"><img alt="" data-edl="${ph.id}"></button>
          <figcaption><span>${cap} · ${fmtDate(ph.date)}</span><button class="btn icon sm ghost danger" data-action="del-edl" data-id="${ph.id}" aria-label="Retirer la photo">${icon('trash')}</button></figcaption>
        </figure>` : html`<figure class="edl empty ${cls}"><div class="edl-img">${cls === 'out' ? 'pas de photo de sortie' : 'pas encore de photo'}</div><figcaption><span>${cap}</span></figcaption></figure>`;
      body = html`
        <p class="small muted" style="margin:0 0 12px">Une photo par pièce, prise par vous : le locataire la voit dans son app. À son départ, il envoie ses photos de sortie : elles apparaissent ici à côté des vôtres (12 photos). Effacez-les après contrôle ou remise à neuf.</p>
        ${outs.length ? html`<div class="alert info" style="margin-bottom:12px">${icon('camera')}<div>📷 <b>${plural(outs.length, 'photo')} de sortie</b>${who ? html` envoyée${outs.length > 1 ? 's' : ''} par <b>${fullName(who)}</b>` : ''} — le ${fmtDate(outs[outs.length - 1].date)}
          <div style="margin-top:8px"><button class="btn sm" data-action="edl-out-clear" data-id="${id}">${icon('check')} Contrôlées — effacer les photos de sortie</button></div></div></div>` : ''}
        <div class="edl-rooms">${EDL_ROOMS.map(([k, label]) => {
          const ph = edlIn(id, k), out = outs.filter((d) => d.room === k).pop();
          return html`<div class="edl-room"><div class="edl-room-h"><b>${label}</b>
            <span class="edl-acts"><label class="btn sm ${ph ? '' : 'primary'}" title="Photo (appareil ou galerie)">${icon('camera')}<input type="file" accept="image/*" hidden data-input="edl-slot" data-log="${id}" data-room="${k}"></label></span></div>
            <div class="edl-pair ${outs.length ? 'two' : ''}">${fig(ph, 'in', 'Entrée')}${outs.length ? fig(out, 'out', 'Sortie') : ''}</div></div>`;
        })}</div>
        <p class="tiny muted" style="margin:8px 0 0;text-align:center"><b>${edlOf(id).filter((d) => EDL_ROOM[d.room]).length} / ${EDL_ROOMS.length}</b> · <span>📷 appareil photo ou 🖼️ galerie</span> · <span>chiffrées avant l'envoi</span> · <span>une nouvelle photo remplace l'ancienne</span></p>
        ${old.length ? html`<div class="section-label">Anciennes photos (sans pièce)</div><div class="edl-grid">${old.map((ph) => fig(ph, 'in', ''))}</div>` : ''}`;
    } else if (tab === 'hist') {
      body = all.length ? html`<div class="list">${[...all].reverse().map((l) => {
        const months = stayMonths(l);
        return html`<button class="row" data-action="open-loc" data-id="${l.id}">
          <span class="avatar" style="${isGone(l) ? 'background:var(--surface-2);color:var(--text-3)' : ''}">${avIn(l)}</span>
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
      title: logLabel(g),
      body: html`${tabsBar([['now', 'Actuel'], ['hist', `Occupants (${all.length})`], ['edl', `État des lieux${edlOf(id, 'edl-out').length ? ' 📷' : ''}`], ['porte', g.porte && g.porte.code ? '🔑 Porte' : 'Porte'], ['bilan', 'Bilan']], tab)}${body}`,
      foot: html`<button class="btn icon" data-action="print-log" data-id="${id}" aria-label="Imprimer">${icon('download')}</button><button class="btn" data-action="open-imm" data-id="${g.immId}">${icon('building')} Immeuble</button><button class="btn" data-action="edit-log" data-id="${id}">${icon('edit')} Modifier</button>`,
    };
  },

  'loc-form'({ id, preset }) {
    const l = id ? vault.get('locataires', id) : { immId: ui.immFilter || '', debut: today() };
    if (id && !l) return null;
    if (!id && preset) {
      const g = vault.get('logements', preset);
      if (g) Object.assign(l, { logId: g.id, immId: g.immId, loyer: g.loyer || '' });
    }
    if (!vault.list('immeubles').length) return { title: 'Nouveau locataire', body: empty('building', "Ajoutez d'abord un immeuble.", html`<button class="btn primary" data-action="new-imm">${icon('plus')} Immeuble</button>`) };
    return {
      title: id ? 'Modifier le locataire' : 'Nouveau locataire',
      body: html`<form id="f" data-form="loc" class="fields">
        <input type="hidden" name="id" value="${id || ''}">
        ${photoField(l, id ? initials(l) : '👤')}
        ${id ? '' : html`<p class="tiny muted full" style="margin:0">Bailleur (propriétaire) → <b>${societe().nom || 'vous'}</b> (locataire principal) → <b>sous-locataire</b> que vous ajoutez ici.</p>`}
        ${logementSelect(l.logId, l.immId)}
        ${tenantFields(l)}
        ${id ? field('Date de sortie', 'sortie', l.sortie, { type: 'date' }) : ''}
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
        ${old.logId ? html`<p class="tiny muted full" style="margin:0">📷 Pensez à mettre à jour les photos d'état des lieux du logement (onglet « Photos »).</p>` : ''}
        <label class="field full">Remarques de sortie<textarea name="sortieNote" style="min-height:70px" placeholder="État des lieux, retenues éventuelles sur la caution, nouvelle adresse…">${old.sortieNote || ''}</textarea></label>
        <label class="full" style="display:flex;gap:10px;align-items:center;font-size:15px;margin-top:4px"><input type="checkbox" name="vacant" data-input="vacant" style="width:22px;min-height:22px"> Pas encore de nouveau locataire (le logement devient vacant)</label>
        <fieldset id="newTenant" class="fields full" style="border:0">
          <div class="section-label full" style="margin:8px 0 0">Nouveau locataire</div>
          ${tenantFields({ loyer: old.loyer, type: old.type, debut: addDays(sortie, 1) }, 'n_')}
        </fieldset>
      </form>`,
      foot: html`<button class="btn" data-action="close-sheet">Annuler</button><button class="btn primary" type="submit" form="f">Confirmer le changement</button>`,
    };
  },

  loc({ id, tab, preset }) {
    const l = vault.get('locataires', id);
    if (!l) return null;
    tab = tab || 'infos';
    const y = new Date().getFullYear();
    const docs = vault.list('documents').filter((d) => d.locId === id && d.kind !== 'recu' && d.kind !== 'refus').sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const recus = vault.list('documents').filter((d) => d.locId === id && d.kind === 'recu');
    const docOf = (k) => docs.find((d) => d.dtype === k);
    const hasDoc = (k) => !!docOf(k);
    const msgs = vault.list('taches').filter((t) => t.locId === id && t.sentAt).sort((a, b) => (b.sentAt || '').localeCompare(a.sentAt || ''));
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
        ${!gone ? html`<div class="actions loc-acts">
          <button class="btn sm" data-action="relance" data-id="${id}">${icon('msg')} Relancer</button>
          <button class="btn sm" data-action="index" data-id="${id}">${icon('chart')} Réviser le loyer</button>
          <button class="btn sm" data-action="renew" data-id="${id}">${icon('calendar')} Prolonger</button>
        </div>` : ''}
        ${late.length ? html`<div class="alert ${late.length >= 2 ? 'bad' : 'warn'}" style="margin-bottom:14px">${icon('alert')}<div>${late.length} mois impayé${late.length > 1 ? 's' : ''} : ${late.map((m) => MONTHS_FULL[m - 1]).join(', ')}</div></div>` : ''}
        <dl class="kv">
          ${kvRow('Statut', 'Sous-locataire')}
          ${kvRow('Immeuble', immName(l.immId))}
          ${kvRow('Logement', l.logId ? html`<a href="#" data-action="open-log" data-id="${l.logId}">${logName(l.logId)}</a>` : '—')}
          ${kvRow('Loyer', html`<span class="num">${money(l.loyer)} / mois</span>${(l.loyerHist || []).length ? html`<div class="tiny muted">révisé le ${fmtDate([...l.loyerHist].sort((a, b) => b.from.localeCompare(a.from))[0].from)}</div>` : ''}`)}
          ${l.revision ? kvRow('Prochaine révision', fmtDate(l.revision)) : ''}
          ${revNext(l) ? kvRow('🔄 Révision annoncée', html`${money(revNext(l).ancien)} → <b>${money(revNext(l).nouveau)}</b> à partir du ${fmtDate(revNext(l).from)} <button class="btn sm" type="button" data-action="rev-letter" data-id="${l.id}">📄 Lettre A4</button>`) : ''}
          ${kvRow('Téléphone', l.tel || '—')}
          ${kvRow('Email', l.mail || '—')}
          ${kvRow('Caution', html`<span class="num">${l.caution ? money(l.caution) : '—'}</span>${l.cautionDate || l.cautionMode ? html`<div class="tiny muted">reçue${l.cautionDate ? ' le ' + fmtDate(l.cautionDate) : ''}${l.cautionMode ? ' · ' + (CAUTION_MODES[l.cautionMode] || l.cautionMode).toLowerCase() : ''}</div>` : ''}${l.cautionNote ? html`<div class="tiny muted">${l.cautionNote}</div>` : ''}
            ${l.caution ? html`<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px"><button class="btn sm" data-action="caution-recu" data-id="${id}">${icon('receipt')} Reçu de caution</button>${hasDoc('caution') ? html`<button class="btn sm" data-action="open-doc" data-id="${docOf('caution').id}">✓ Preuve jointe 👁</button>` : html`<button class="btn sm primary" data-action="doc-type" data-id="${id}" data-k="caution">📎 Joindre la preuve</button>`}</div>` : ''}`)}
          ${kvRow('Dossier', dossierChips(id, docOf))}
          ${l.espace && l.espace.on ? kvRow('Règlement', rulesAccepted(l) ? html`<span class="green">✓ accepté le ${fmtDate(l.reglesLu)}</span>` : l.reglesLu ? html`<span class="amber">à accepter de nouveau (règlement modifié)</span>` : html`<span class="amber">pas encore accepté</span>`) : ''}
          ${kvRow('Entrée', l.debut ? fmtDate(l.debut) : '?')}
          ${kvRow('Fin du contrat', html`${l.fin ? fmtDate(l.fin) : 'indéterminée'}${d != null && d >= 0 && d <= 60 && !gone ? html`<div class="tiny amber">dans ${plural(d, 'jour')}</div>` : ''}`)}
          ${l.sortie ? kvRow('Sortie', fmtDate(l.sortie)) : ''}
          ${kvRow('Total encaissé', html`<span class="num green">${money(totalPaid(l))}</span>`)}
        </dl>
        ${l.sortieNote ? html`<div class="section-label">Remarques de sortie</div><div class="note">${l.sortieNote}</div>` : ''}
        ${msgs.length ? html`<div class="section-label">Messages envoyés depuis son app</div><div class="list">${msgs.map((t) => html`<button class="row" data-action="open-signal" data-id="${t.id}"><span class="light light-${t.statut === 'fait' ? 'green' : t.statut === 'planifie' ? 'yellow' : 'red'}"></span><span class="grow"><span class="title" style="display:block">${t.vu ? '' : '🆕 '}${t.titre.replace(/^Signalement : /, '')}</span><span class="meta">${fmtDateTime(t.sentAt)}${signalPhotos(t) ? ' · 📷 ' + signalPhotos(t) : ''}</span></span></button>`)}</div>` : ''}`;
    } else if (tab === 'pay') {
      const years = [...new Set([y, y - 1, ...paysOf(id).map((p) => p.y)])].filter((yy) => yy === y || MONTHS.some((_, i) => isDue(l, yy, i + 1) || payment(id, yy, i + 1))).sort((a, b) => b - a);
      body = html`${years.map((yy) => {
        const s = yearStats(l, yy);
        return html`<div class="section-label" style="margin-top:4px">${yy} · payé <span class="green">${money(s.paid)}</span>${s.rest > 0.009 ? html` · impayé <span class="red">${money(s.rest)}</span>` : ''}${s.upcoming > 0.009 ? ` · à venir ${money(s.upcoming)}` : ''}</div>
          ${monthGrid(yy, MONTHS.map((_, i) => payCell(l, yy, i + 1, true)))}`;
      })}<p class="tiny muted">Touchez un mois vide pour l'enregistrer payé. Touchez un mois payé pour modifier le montant (paiement partiel), imprimer la quittance ou annuler.</p>`;
    } else if (tab === 'docs') {
      body = html`
        ${recus.length ? html`<div class="alert info" style="display:block;margin-bottom:14px"><b>📥 ${plural(recus.length, 'document')} reçu${recus.length > 1 ? 's' : ''} de ${l.prenom || fullName(l)} — à vérifier</b>
          ${recus.map((doc) => html`<div class="recu-row"><div class="recu-top"><button class="btn sm" data-action="open-doc" data-id="${doc.id}">${icon('eye')} Voir</button><span class="grow small">${doc.name || doc.label} · ${fmtDate(doc.date)} · ${Math.max(1, Math.round((doc.size || 0) / 1024))} Ko</span></div>
            <div class="recu-act"><select data-recu-type="${doc.id}" aria-label="Ranger comme">${Object.entries(DOC_TYPES).map(([k, v]) => html`<option value="${k}" ${doc.dtype === k ? new Raw('selected') : ''}>${v}</option>`)}</select>
            <button class="btn sm primary" data-action="recu-ok" data-id="${doc.id}">✅ Accepter</button></div>
            <div class="recu-act"><input data-recu-why="${doc.id}" placeholder="Motif du refus (le locataire le lit) — ex. photo floue, merci de la refaire" maxlength="140"><button class="btn sm danger" data-action="recu-ko" data-id="${doc.id}">❌ Refuser</button></div></div>`)}</div>` : ''}
        <form data-form="doc" class="stack" style="margin-bottom:16px">
          <input type="hidden" name="locId" value="${id}">
          <div class="small">Dossier : ${dossierChips(id, docOf)}</div>
          <select name="dtype" aria-label="Type de document">${Object.entries(DOC_TYPES).map(([k, v]) => html`<option value="${k}" ${(String(preset || '').split('|')[0] || 'bail') === k ? new Raw('selected') : ''}>${v}</option>`)}</select>
          <input type="hidden" name="pay" value="${String(preset || '').split('|')[1] || ''}">
          <input name="label" value="${payLabel(preset)}" placeholder="Votre titre du document (facultatif) — ex. signé le 01/12/2025, recto / verso">
          <input name="file" type="file" accept="application/pdf,image/*" required>
          <button class="btn primary block" type="submit">${icon('upload')} Ajouter le document</button>
          <p class="tiny muted">PDF ou photo · 10 Mo maximum · chiffré avant l'envoi. Reçu par WhatsApp ou par mail ? Enregistrez la photo ou le PDF sur le téléphone / l'ordinateur, puis choisissez-le ici.</p>
        </form>
        ${docs.length ? html`<div class="list">${docs.map((doc) => html`<div class="row">${icon('file')}
          <span class="grow"><span class="title" style="display:block;white-space:normal;overflow-wrap:anywhere">${doc.label}</span><span class="meta" style="white-space:normal">${doc.dtype && doc.dtype !== 'autre' && !doc.label.startsWith(DOC_TYPES[doc.dtype].replace(/ \(.*\)$/, '')) ? DOC_TYPES[doc.dtype] + ' · ' : ''}${fmtDate(doc.date)} · ${Math.max(1, Math.round((doc.size || 0) / 1024))} Ko</span></span>
          <button class="btn icon sm" data-action="open-doc" data-id="${doc.id}" aria-label="Ouvrir">${icon('eye')}</button>
          <button class="btn icon sm ghost danger" data-action="del-doc" data-id="${doc.id}" aria-label="Supprimer">${icon('trash')}</button></div>`)}</div>` : html`<p class="muted small">Aucun document.</p>`}`;
    } else if (tab === 'espace') {
      const e = l.espace || {};
      const show = { ...ESP_ALL, ...(e.show || {}) };
      const boxes = html`<div class="list" style="margin-bottom:12px">${Object.entries(ESP_SHOW).map(([k, v]) => html`<label class="row" style="cursor:pointer">
        <input type="checkbox" data-input="esp-show" data-loc="${id}" data-k="${k}" ${show[k] ? new Raw('checked') : ''} style="width:22px;min-height:22px"><span class="grow">${v}${k === 'chat' && e.on ? chatWhy(l, show) : ''}</span></label>`)}</div>`;
      if (l.xfer) {
        body = html`<div class="alert info">📦<div><b>Transféré à ${l.xfer.nom || 'une autre centrale'}</b> le ${fmtDate(l.xfer.at)}. Son app est maintenant gérée par cette centrale ; ici la fiche reste en archive.</div></div>`;
      } else if (!e.on) {
        body = html`<p style="margin-top:0">Donnez à <b>${fullName(l)}</b> un <b>espace personnel</b> (lien ou QR code, sans mot de passe à retenir) où il voit <b>seulement</b> ce que vous cochez :</p>
          ${boxes}
          <div class="alert info">${icon('shield')}<div>Ses données sont chiffrées : seule la clé contenue dans son lien peut les ouvrir. Il ne voit jamais les autres locataires, les bailleurs, vos dépenses ni vos notes. Vous pouvez désactiver le lien à tout moment.</div></div>
          <button class="btn primary block" data-action="esp-on" data-id="${id}">${icon('users')} Créer l'espace locataire</button>`;
      } else {
        const url = espUrl(l);
        const tel = (l.tel || '').replace(/[^\d+]/g, '');
        const inv = inviteMsg('loc', e.lang, l.prenom || '', appUrl(), e.code || '—', url, socName());
        const msg = encodeURIComponent(inv.txt);
        body = html`<p style="margin-top:0">Espace actif. Donnez à <b>${fullName(l)}</b> son <b>code d'accès</b> ou envoyez-lui le lien direct.</p>
          <div class="card" style="text-align:center;margin-bottom:12px"><div class="tiny muted">Code d'accès personnel</div>
            <div style="font-family:var(--mono);font-size:26px;font-weight:800;letter-spacing:.08em">${e.code || '—'}</div>
            <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><button class="btn sm" data-action="esp-copy" data-id="${id}">🔗 Copier le lien</button>${e.code ? html`<button class="btn sm" data-action="code-copy" data-code="${e.code}">📋 Copier le code</button>` : ''}<button class="btn sm ${e.code ? 'danger' : ''}" data-action="esp-code" data-id="${id}">${e.code ? 'Nouveau code' : 'Créer le code'}</button></div></div>
          <div class="qr" style="max-width:190px;margin:0 auto 10px">${qrSvg(url, 5)}</div>
          <label class="field" style="margin:0 0 4px">Langue par défaut de son espace<select data-input="esp-lang" data-loc="${id}">${[['', 'Celle de son téléphone'], ['fr', 'Français'], ['it', 'Italiano'], ['de', 'Deutsch'], ['pt', 'Português'], ['en', 'English'], ['es', 'Español']].map(([k, v2]) => html`<option value="${k}" ${(e.lang || '') === k ? new Raw('selected') : ''}>${v2}</option>`)}</select></label>
          <p class="tiny muted" style="margin:0 0 10px">Le message d’invitation part dans cette langue (en français si « Celle de son téléphone »).</p>
          <div class="actions" style="flex-direction:column">
            ${tel ? html`<a class="btn" href="https://wa.me/${tel.replace(/^\+/, '')}?text=${msg}" target="_blank" rel="noopener">${icon('msg')} Envoyer par WhatsApp</a><a class="btn" href="sms:${tel}?&body=${msg}">${icon('msg')} Envoyer par SMS</a>` : ''}
            ${l.mail ? html`<a class="btn" href="mailto:${l.mail}?subject=${encodeURIComponent(inv.subj)}&body=${msg}">${icon('mail')} Envoyer par email</a>` : ''}
            <a class="btn" href="${url}" target="_blank" rel="noopener">${icon('eye')} Voir son espace</a>
            <button class="btn" data-action="esp-refresh" data-id="${id}">🔄 Mettre à jour son app maintenant</button>
          </div>
          <div class="section-label">Ce qu'il voit</div>${boxes}
          <p class="tiny muted">Documents : tout ce que vous ajoutez dans Docs est visible dans son app (avec aperçu), pour qu'il vérifie que vous avez bien reçu ses papiers et ses paiements — touchez « 👁 Visible » pour le rendre privé. Ses messages et photos arrivent sur l'Accueil (📩) et dans Maintenance → Réclamations.</p>
          <button class="btn ghost danger block" data-action="esp-off" data-id="${id}">Désactiver l'espace</button>`;
      }
    } else if (tab === 'notes') {
      body = html`<form data-form="notes" class="stack"><input type="hidden" name="id" value="${id}">
        <textarea name="notes" style="min-height:220px" placeholder="Problèmes signalés, échanges, réparations demandées…">${l.notes || ''}</textarea>
        <button class="btn primary block" type="submit">Enregistrer les notes</button></form>`;
    } else {
      const name = fullName(l);
      const alt = [l.nom, l.prenom].filter(Boolean).join(' ');
      const hist = Object.values(vault.state.historique).filter((h) => !h.del && (h.ref === id || (!h.ref && (h.detail || '').includes(alt || name)))).sort((a, b) => b.t - a.t).slice(0, 100);
      body = hist.length ? html`<div class="list">${hist.map((h) => html`<div class="row"><span class="grow"><span class="title" style="display:block;white-space:normal">${h.action}</span><span class="meta" style="white-space:normal">${h.detail}</span>${h.by ? html`<span class="meta" style="display:block">👤 ${h.by}</span>` : ''}</span><span class="tiny muted">${fmtDateTime(h.t)}</span></div>`)}</div>` : html`<p class="muted small">Aucun historique.</p>`;
    }
    return {
      title: html`${fullName(l)} ${vraiBtn('locataires', l)}`,
      body: html`${tabsBar([['infos', 'Infos'], ['pay', 'Loyers'], ['docs', 'Docs'], ['espace', l.espace && l.espace.on ? 'Espace ✓' : 'Espace'], ['notes', 'Notes'], ['hist', 'Journal']], tab)}${body}`,
      foot: tab === 'infos' ? html`<button class="btn ghost danger" data-action="del-loc" data-id="${id}" aria-label="Supprimer">${icon('trash')}</button>
        ${!gone ? html`<button class="btn" data-action="replace" data-id="${id}">${icon('sync')} Départ</button>` : ''}
        <button class="btn primary" data-action="edit-loc" data-id="${id}">${icon('edit')} Modifier</button>` : null,
    };
  },

  'rec-split'({ preset }) {
    const { a, b } = typeof preset === 'string' ? { a: preset, b: '' } : preset || {};
    const mail = societe().email || '';
    const txt = (h, c) => `Kit de récupération — centrale ${socName()}\n\nMoitié ${h} de la clé de secours :\n${c}\n\nSi la clé d'accès est oubliée : ${centralUrl(TENANT).replace(/^https?:\/\//, '')} → « Clé d'accès oubliée ? » → moitié A + moitié B.`;
    const half = (h, c, who) => html`<div class="tiny muted" style="margin-top:10px">Moitié ${h} — ${who}</div>
        <div style="font-family:var(--mono);font-size:21px;font-weight:700;letter-spacing:.05em;text-align:center;padding:16px 8px;background:var(--surface-2);border-radius:var(--radius);word-break:break-all">${c}</div>
        <div class="actions" style="flex-wrap:wrap;margin-top:6px">
          <a class="btn sm" href="mailto:${mail}?subject=${encodeURIComponent('Kit de récupération ' + h + ' — ' + socName())}&body=${encodeURIComponent(txt(h, c))}">📧 E-mail</a>
          <button class="btn sm" data-action="print-reckit" data-id="${c}" data-h="${h}">🖨️ Imprimer</button>
          <a class="btn sm" href="https://wa.me/?text=${encodeURIComponent(txt(h, c))}" target="_blank" rel="noopener">📲 WhatsApp</a>
        </div>`;
    return {
      title: '🧩 Votre kit de récupération',
      narrow: true,
      body: html`<div class="alert info" style="margin-bottom:12px">${icon('shield')}<div>Votre clé de secours est coupée en <b>deux moitiés</b>. Gardez-les à <b>deux endroits différents</b> (par exemple : moitié A chez le directeur, moitié B chez l'associé ou au coffre). Aucune moitié seule n'ouvre vos données ; personne d'autre ne peut les lire.</div></div>
        ${half('A', a, 'chez le directeur')}
        ${b ? half('B', b, 'à un autre endroit (associé, coffre)') : ''}
        <p class="tiny muted" style="margin-top:12px">✓ Cet appareil se souvient de la moitié A. Ne donnez jamais les deux moitiés à la même personne.</p>`,
      foot: html`<button class="btn primary" data-action="close-sheet">J'ai gardé les deux moitiés</button>`,
    };
  },

  recovery({ preset: code }) {
    const body = encodeURIComponent(`Clé de secours CENTRAL-OGL :\n\n${code}\n\nEn cas d'oubli de la clé d'accès : ${centralUrl(TENANT)} → « Clé d'accès oubliée ? ».\nNe transférez pas cet email.`);
    return {
      title: 'Votre clé de secours',
      narrow: true,
      body: html`
        <div class="alert warn" style="margin-bottom:16px">${icon('alert')}<div><b>Notez-la maintenant :</b> elle ne sera plus jamais affichée. Avec elle, on peut ouvrir le coffre et choisir une nouvelle clé d'accès. Gardez-la hors ligne (papier dans un coffre, gestionnaire de mots de passe).</div></div>
        <div style="font-family:var(--mono);font-size:22px;font-weight:700;letter-spacing:.06em;text-align:center;padding:18px 8px;background:var(--surface-2);border-radius:var(--radius);word-break:break-all" id="rcode">${code}</div>
        <div class="actions" style="margin-top:14px">
          <button class="btn" data-action="copy-recovery">${icon('file')} Copier</button>
          <button class="btn" data-action="print-recovery">${icon('download')} Imprimer</button>
          <a class="btn" href="mailto:${societe().email || ''}?subject=${encodeURIComponent('CENTRAL-OGL — clé de secours')}&body=${body}">${icon('mail')} Email</a>
        </div>
        <p class="tiny muted">Le bouton Email prépare un message vers votre propre adresse. Pratique, mais toute personne qui accède à cette messagerie pourrait ouvrir le coffre : le papier reste plus sûr.</p>`,
      foot: html`<button class="btn primary" data-action="close-sheet">J'ai noté ma clé de secours</button>`,
    };
  },

  'pay-form'({ preset }) {
    const { locId, y, m } = preset;
    const l = vault.get('locataires', locId);
    if (!l) return null;
    const st = payState(l, y, m);
    const p = st.p || {};
    const modes = { virement: 'Virement', especes: 'Espèces', cheque: 'Chèque', autre: 'Autre' };
    return {
      title: `${MONTHS_FULL[m - 1]} ${y}`,
      narrow: true,
      body: html`<form id="f" data-form="pay" class="fields">
        <input type="hidden" name="locId" value="${locId}"><input type="hidden" name="y" value="${y}"><input type="hidden" name="m" value="${m}">
        <div class="full"><b>${fullName(l)}</b> <span class="muted small">· ${whereOf(l)}</span><div class="small muted" style="margin-top:4px">Loyer dû : <b>${money(st.due)}</b>${st.state === 'part' ? html` · <span class="amber">reste ${money(st.rest)}</span>` : ''}</div></div>
        ${field('Montant reçu (€)', 'montant', st.p ? paidAmount(st.p, l) : st.due, { type: 'number', required: true, attrs: 'inputmode="decimal" step="0.01" min="0"' })}
        ${field('Date du paiement', 'date', p.date || today(), { type: 'date' })}
        <label class="field">Mode<select name="mode">${Object.entries(modes).map(([k, v]) => html`<option value="${k}" ${p.mode === k ? new Raw('selected') : ''}>${v}</option>`)}</select></label>
        ${field('Note', 'note', p.note, { placeholder: 'ex. acompte, reste en fin de mois' })}
        <p class="tiny muted full">Un montant inférieur au loyer est enregistré comme paiement partiel (case orange) et le reste reste dû.</p>
      </form>`,
      foot: html`${st.p ? html`<button class="btn ghost danger" data-action="del-pay" data-loc="${locId}" data-y="${y}" data-m="${m}" aria-label="Annuler le paiement">${icon('trash')}</button>
        <button class="btn" data-action="quittance" data-loc="${locId}" data-y="${y}" data-m="${m}">${icon('receipt')} Quittance</button>
        <button class="btn" type="button" data-action="pay-proof" data-loc="${locId}" data-y="${y}" data-m="${m}">📎 Preuve${vault.list('documents').some((x) => x.locId === locId && x.pay === y + '-' + m) ? ' ✓' : ''}</button>` : ''}
        <button class="btn primary" type="submit" form="f">Enregistrer</button>`,
    };
  },

  relance({ id }) {
    const l = vault.get('locataires', id);
    if (!l) return null;
    const lang = ui.relLang || (RELANG.some(([k]) => k === ((l.espace || {}).lang || '')) ? l.espace.lang : 'fr'); // langue de son app par défaut
    const text = relanceText(l, lang);
    const tel = (l.tel || '').replace(/[^\d+]/g, '');
    return {
      title: 'Relancer ' + fullName(l),
      body: html`
        <div class="chips" style="margin-bottom:12px">${RELANG.map(([k, v]) => html`<button class="chip" data-action="rel-lang" data-id="${k}" aria-pressed="${lang === k}">${v}</button>`)}</div>
        ${text.total ? '' : html`<div class="alert info" style="margin-bottom:12px">${icon('check')}<div>Aucun impayé pour ce locataire : le message reste modifiable.</div></div>`}
        <textarea id="relText" style="min-height:230px">${text.body}</textarea>
        <div class="actions" style="margin-top:12px">
          <button class="btn" data-action="send-relance" data-ch="sms" data-id="${id}" ${tel ? '' : new Raw('disabled')}>${icon('msg')} SMS</button>
          <button class="btn" data-action="send-relance" data-ch="wa" data-id="${id}" ${tel ? '' : new Raw('disabled')}>${icon('phone')} WhatsApp</button>
          <button class="btn" data-action="send-relance" data-ch="mail" data-id="${id}" ${l.mail ? '' : new Raw('disabled')}>${icon('mail')} Email</button>
        </div>
        ${!tel || !l.mail ? html`<p class="tiny muted">${!tel ? 'Pas de téléphone' : ''}${!tel && !l.mail ? ' ni ' : ''}${!l.mail ? (tel ? 'Pas d’email' : 'd’email') : ''} enregistré : ajoutez-le dans « Modifier ». Vous pouvez aussi copier le texte.</p>` : ''}`,
      foot: html`<button class="btn" data-action="copy-relance">${icon('file')} Copier le texte</button>`,
    };
  },

  'societe-form'() {
    const st = societe();
    const pays = st.pays || 'LU';
    const rows = [...(st.associes || []), {}, {}, {}, {}].slice(0, Math.max(4, (st.associes || []).length + 1));
    return {
      title: 'Société & associés',
      body: html`<form id="f" data-form="societe" class="fields">
        <div class="section-label full" style="margin:0">${SOC_FICHE[socRole()]}</div>
        <div class="full" style="display:flex;align-items:center;gap:12px">${socLogo() ? html`<img src="${socLogo()}" alt="" style="height:48px;max-width:140px;object-fit:contain;background:#fff;border-radius:8px;padding:4px;border:1px solid var(--border)">` : html`<span style="width:48px;height:48px;border-radius:50%;background:var(--accent,#4f46e5);color:#fff;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:20px;flex:none">${String(societe().nom || DEF_SOC()).trim().charAt(0).toUpperCase()}</span>`}
          <label class="btn sm" style="cursor:pointer">🖼️ ${st.logo ? 'Changer le logo' : 'Mettre votre logo'}<input type="file" accept="image/*" data-input="soc-logo" hidden></label>
          ${st.logo ? html`<button class="btn sm ghost" type="button" data-action="soc-logo-del">Retirer</button>` : ''}
          ${html`<label class="btn sm ghost" style="cursor:pointer" title="Couleur de vos apps (prise du logo)">🎨 Couleur <input type="color" data-input="soc-color" value="${/^#[0-9a-f]{6}$/i.test(st.color || '') ? st.color : '#4f46e5'}" style="width:28px;height:22px;border:0;padding:0;background:none"></label>`}</div>
        <p class="tiny muted full" style="margin:0">Le logo apparaît dans l’app, les apps des locataires et de l’équipe, les quittances et les impressions.</p>
        <div class="section-label full" style="margin:8px 0 0">✍️ Signature + timbre (récapitulatif des loyers des locataires)</div>
        <div class="full" id="signWrap">${signBlock(st)}</div>
        ${field('Nom / société', 'nom', st.nom, { full: true, placeholder: 'ex. ' + DEF_SOC() })}
        ${field('Adresse', 'adresse', st.adresse, { full: true })}
        ${field('Code postal et ville', 'ville', st.ville, { placeholder: 'L-1234 Luxembourg' })}
        ${field('Téléphone', 'tel', st.tel, { type: 'tel' })}
        ${field('Email', 'email', st.email, { type: 'email' })}
        <label class="field">Pays<select name="pays">${Object.entries(PAYS).map(([k, v]) => html`<option value="${k}" ${pays === k ? new Raw('selected') : ''}>${v[0]}</option>`)}</select></label>
        ${field('Site web', 'web', st.web, { placeholder: 'ex. www.nobis.lu' })}
        ${field('RCS', 'rcs', st.rcs, { placeholder: 'ex. B225665' })}
        ${field('N° TVA', 'tvaNum', st.tvaNum, { placeholder: 'ex. LU30599412' })}
        ${field('IBAN (relances + app des locataires)', 'iban', st.iban, { placeholder: 'LU28 0099 7800 0139 1929' })}
        ${field('BIC / SWIFT', 'bic', st.bic, { placeholder: 'CCRALULLXXX' })}
        ${field('Banque', 'banque', st.banque, { placeholder: 'Banque Raiffeisen' })}
        <label class="check full"><input type="checkbox" name="toutCompris" value="1" ${st.toutCompris !== false ? new Raw('checked') : ''}> <span><b>Loyer tout compris</b> : électricité, chauffage, internet et déchets inclus — écrit sur le récapitulatif des loyers des locataires (demandé par les services sociaux et les ministères)</span></label>
        <div class="section-label full" style="margin:10px 0 0">Comptabilité et TVA</div>
        <label class="field">Assujetti à la TVA<select name="assujetti"><option value="1" ${st.assujetti !== false ? new Raw('selected') : ''}>Oui</option><option value="0" ${st.assujetti === false ? new Raw('selected') : ''}>Non</option></select></label>
        <label class="field">Déclaration de TVA<select name="periode">${[['m', 'Mensuelle'], ['t', 'Trimestrielle'], ['a', 'Annuelle']].map(([k, v]) => html`<option value="${k}" ${(st.periode || 't') === k ? new Raw('selected') : ''}>${v}</option>`)}</select></label>
        ${field('Taux de TVA (%)', 'taux', st.taux || '', { full: true, placeholder: (PAYS[pays] || PAYS.LU)[1].join(', ') + ' (taux du pays si vide)' })}
        <div class="section-label full" style="margin:10px 0 0">Associés — partage du résultat net</div>
        ${rows.map((a, i) => html`${field('Associé ' + (i + 1), 'an' + i, a.nom)}${field('Part (%)', 'ap' + i, a.part, { type: 'number', attrs: 'inputmode="decimal" min="0" max="100" step="0.01"' })}`)}
        <p class="tiny muted full">Le total des parts doit faire 100 %. Laissez vide les lignes inutiles.</p>
        <div class="lock-err full" role="alert"></div>
      </form>`,
      foot: html`<button class="btn" data-action="close-sheet">Annuler</button><button class="btn primary" type="submit" form="f">Enregistrer</button>`,
    };
  },

  couleurs() {
    return {
      title: '🎨 Couleurs de nos activités',
      body: html`<p class="small muted" style="margin:0 0 8px">Les mêmes couleurs dans toutes les apps (locataires, équipe, app Gérances) : sur ordinateur, passez la souris sur les points de couleur sous « Réglages » ; dans les apps, touchez les petites lignes colorées en bas.</p>
        <div class="list settings">${legList().map(([c, t]) => html`<div class="row"><span class="leg-sw" style="background:${c}"></span><span class="grow">${t}</span></div>`)}</div>
        <p class="small" style="margin:8px 0 0">Points qui clignotent = feu tricolore : 🟢 aujourd’hui / tout va bien · 🟡 bientôt / demain · 🔴 urgent / problème</p>`,
    };
  },

  frais() {
    const list = vault.list('frais').sort((a, b) => (a.libelle || '').localeCompare(b.libelle || ''));
    const cats = { salaires: 'Salaires & cotisations', bureau: 'Bureau', provision: 'Provision charges', autre: 'Autre' };
    const d = new Date();
    const first = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    return {
      title: 'Frais fixes mensuels',
      body: html`<p class="small muted" style="margin-bottom:12px">Coûts de gestion qui ne dépendent pas d'un immeuble (salaires, provisions…). Le loyer du bureau peut aussi être suivi comme « immeuble » sans locataires. Ils sont déduits du résultat net et de la part des associés.</p>
        <form data-form="frais" class="fields" style="margin-bottom:16px">
          ${field('Libellé', 'libelle', '', { full: true, required: true, placeholder: 'ex. Salaires + cotisations' })}
          ${field('Montant par mois (€)', 'montant', '', { type: 'number', required: true, attrs: 'inputmode="decimal" step="0.01" min="0.01"' })}
          <label class="field">Catégorie<select name="cat">${Object.entries(cats).map(([k, v]) => html`<option value="${k}">${v}</option>`)}</select></label>
          ${field('Depuis', 'debut', first, { type: 'date' })}
          ${field("Jusqu'à (facultatif)", 'fin', '', { type: 'date' })}
          <button class="btn primary full" type="submit">${icon('plus')} Ajouter</button>
        </form>
        ${list.length ? html`<div class="list">${list.map((f) => html`<div class="row"><span class="grow"><span class="title" style="display:block">${f.libelle}</span><span class="meta">${cats[f.cat] || ''} · ${f.debut ? 'depuis ' + fmtDate(f.debut) : ''}${f.fin ? ' jusqu’au ' + fmtDate(f.fin) : ''}</span></span>
          <span class="amount">${money(f.montant)}/mois</span><button class="btn icon sm ghost danger" data-action="del-frais" data-id="${f.id}" aria-label="Supprimer">${icon('trash')}</button></div>`)}</div>
          <div class="totals"><span>Ce mois-ci</span><b>${money(fraisOfMonth(d.getFullYear(), d.getMonth() + 1))}</b></div>` : html`<p class="muted small">Aucun frais fixe.</p>`}`,
    };
  },

  'index-form'({ id }) {
    const l = vault.get('locataires', id);
    if (!l) return null;
    const d = new Date();
    const nextMonth = isoDate(new Date(d.getFullYear(), d.getMonth() + 1, 1));
    const from = l.revision && l.revision >= today() ? l.revision : nextMonth;
    const hist = [...(l.loyerHist || [])].sort((a, b) => b.from.localeCompare(a.from));
    return {
      title: 'Réviser le loyer',
      narrow: true,
      body: html`<form id="f" data-form="index" class="fields">
        <input type="hidden" name="id" value="${id}">
        <div class="full"><b>${fullName(l)}</b> <span class="muted small">· ${whereOf(l)}</span><div class="small" style="margin-top:4px">Loyer actuel : <b>${money(l.loyer)}</b></div></div>
        ${field('Hausse (%)', 'pct', '', { type: 'number', attrs: 'inputmode="decimal" step="0.01" data-input="idx-pct"', placeholder: 'ex. 2,5' })}
        ${field('Nouveau loyer (€)', 'loyer', l.loyer, { type: 'number', required: true, attrs: 'inputmode="decimal" step="0.01" min="0" data-input="idx-amount"' })}
        ${field("À partir du", 'from', from, { type: 'date', required: true })}
        ${field('Prochaine révision', 'next', addDays(from, 365), { type: 'date' })}
        <p class="tiny muted full">Les mois précédents gardent l'ancien loyer dans les statistiques. Vérifiez les règles légales applicables avant toute hausse.</p>
        ${hist.length ? html`<div class="full"><div class="section-label" style="margin:6px 0">Historique</div>${hist.map((h) => html`<div class="small">${fmtDate(h.from)} : ${money(h.prev)} → <b>${money(h.loyer)}</b></div>`)}</div>` : ''}
      </form>`,
      foot: html`<button class="btn" data-action="close-sheet">Annuler</button><button class="btn primary" type="submit" form="f">Appliquer</button>`,
    };
  },

  'renew-form'({ id }) {
    const l = vault.get('locataires', id);
    if (!l) return null;
    const base = l.fin || today();
    const plusYears = (n) => { const d = new Date(base + 'T00:00:00'); d.setFullYear(d.getFullYear() + n); return isoDate(d); };
    return {
      title: 'Prolonger le contrat',
      narrow: true,
      body: html`<form id="f" data-form="renew" class="fields">
        <input type="hidden" name="id" value="${id}">
        <div class="full"><b>${fullName(l)}</b> <span class="muted small">· ${whereOf(l)}</span><div class="small" style="margin-top:4px">Fin actuelle : <b>${l.fin ? fmtDate(l.fin) : 'indéterminée'}</b></div></div>
        <div class="chips full">${[1, 2, 3].map((n) => html`<button class="chip" type="button" data-action="renew-plus" data-id="${plusYears(n)}">+ ${n} an${n > 1 ? 's' : ''}</button>`)}</div>
        ${field('Nouvelle fin du contrat', 'fin', plusYears(1), { type: 'date', full: true })}
        <p class="tiny muted full">Laissez vide pour un contrat à durée indéterminée. Pour un départ, utilisez plutôt « Départ » dans la fiche du locataire.</p>
      </form>`,
      foot: html`<button class="btn" data-action="open-loc" data-id="${id}">Voir la fiche</button><button class="btn primary" type="submit" form="f">Enregistrer</button>`,
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
  }
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

// Enregistre le mois comme payé en entier (ou complète un paiement partiel)
async function payFull(locId, y, m) {
  const l = vault.get('locataires', locId);
  if (!l) return;
  const k = payKey(locId, y, m);
  const prev = vault.get('paiements', k);
  const due = loyerAt(l, y, m);
  const label = `${fullName(l)} — ${MONTHS_FULL[m - 1]} ${y}`;
  await vault.mutate((tx) => tx.put('paiements', { ...(prev || {}), id: k, locId, y, m, date: (prev && prev.date) || today(), montant: due }), prev ? 'Paiement complété' : 'Paiement enregistré', label + ' · ' + money(due), locId);
  toast('Payé · ' + fullName(l) + ' · ' + money(due), {
    undo: () => vault.mutate((tx) => (prev ? tx.put('paiements', prev) : tx.remove('paiements', k)), 'Paiement annulé', label, locId),
  });
}

async function toggleVers(immId, y, m) {
  const im = vault.get('immeubles', immId);
  if (!im) return;
  const k = payKey(immId, y, m);
  const label = `${im.adresse} — ${MONTHS_FULL[m - 1]} ${y}`;
  const prev = vault.get('versements', k);
  if (prev) {
    await vault.mutate((tx) => tx.remove('versements', k), 'Versement bailleur annulé', label, immId);
    toast('Versement annulé · ' + MONTHS_FULL[m - 1], { undo: () => vault.mutate((tx) => tx.put('versements', { ...prev, id: k }), 'Versement bailleur rétabli', label, immId) });
  } else {
    const montant = ownerRent(im);
    await vault.mutate((tx) => tx.put('versements', { id: k, immId, y, m, date: today(), montant }), 'Versement au bailleur', label + ' · ' + money(montant), immId);
    toast('Versé au bailleur · ' + money(montant), { undo: () => vault.mutate((tx) => tx.remove('versements', k), 'Versement bailleur annulé', label, immId) });
  }
}

// Lit le champ « Logement » : logement existant, nouveau logement, ou immeuble seul.
function readPlace(fd) {
  const [kind, ref] = String(fd.get('place') || '').split(':');
  if (kind === 'log') { const g = vault.get('logements', ref); return { logId: ref, immId: g ? g.immId : '' }; }
  if (kind === 'new') return { newLog: { immId: ref, nom: String(fd.get('newLogNom') || '').trim() || 'Nouveau logement', type: fd.get('newLogType') || 'appartement', etage: String(fd.get('newLogEtage') || '').trim(), partie: String(fd.get('newLogPartie') || '').trim() }, immId: ref };
  return { logId: '', immId: ref || '' };
}
const tenantFromForm = (fd, p = '') => ({
  nom: fd.get(p + 'nom').trim(), prenom: fd.get(p + 'prenom').trim(), loyer: num(fd.get(p + 'loyer')),
  tel: fd.get(p + 'tel').trim(), mail: fd.get(p + 'mail').trim(), caution: num(fd.get(p + 'caution')), cautionNote: fd.get(p + 'cautionNote').trim(),
  cautionDate: fd.get(p + 'cautionDate') || '', cautionMode: fd.get(p + 'cautionMode') || '',
  debut: fd.get(p + 'debut'), fin: fd.get(p + 'fin'), revision: fd.get(p + 'revision') || '',
});

// ───────────────────────── Rapports imprimables ─────────────────────────
// Impressions de l'app : en-tête CENTRAL-OGL by ARES INVEST S.A. ; client = true seulement pour les quittances
// et reçus de caution, qui restent au nom de la société cliente (bailleur, son timbre)
function printDoc(title, body, client) {
  const el = $('#print'), so = societe();
  setHtml(el, html`<div class="pr-head"><div style="display:flex;align-items:center;gap:10px"><img src="${socLogo() || APP_BRAND.logo}" alt="" style="height:34px;max-width:120px;object-fit:contain"><span><b>${socName()}</b> · ${title}${so.rcs || so.tvaNum ? html`<br><small>${[so.rcs ? 'RCS ' + so.rcs : '', so.tvaNum ? 'TVA ' + so.tvaNum : ''].filter(Boolean).join(' · ')}</small>` : ''}</span></div><div>Imprimé le ${fmtDate(today())}</div></div>${body}`);
  document.body.classList.add('printing');
  const done = () => { document.body.classList.remove('printing'); setHtml(el, ''); removeEventListener('afterprint', done); };
  addEventListener('afterprint', done);
  setTimeout(() => print(), 60);
}
function printQuittance(locId, y, m) {
  const l = vault.get('locataires', locId);
  const st = payState(l, y, m);
  if (!st.p) return toast('Aucun paiement pour ce mois', { bad: true });
  const soc = societe();
  const im = vault.get('immeubles', l.immId) || {};
  const last = new Date(y, m, 0).getDate();
  const full = st.state === 'paid';
  const modes = { virement: 'virement', especes: 'espèces', cheque: 'chèque', autre: 'autre' };
  if (!soc.nom) toast('Astuce : renseignez la société dans Réglages → Société & associés', {});
  printDoc(full ? 'Quittance de loyer' : 'Reçu de paiement partiel', html`
    <div class="pr-cols" style="margin-bottom:22px">
      <div><h2>Locataire principal (bailleur)</h2><div><b>${soc.nom || '—'}</b></div><div>${soc.adresse || ''}</div><div>${soc.ville || ''}</div><div>${soc.tel || ''}${soc.tel && soc.email ? ' · ' : ''}${soc.email || ''}</div></div>
      <div><h2>Sous-locataire</h2><div><b>${fullName(l)}</b></div><div>${logName(l.logId) || ''}</div><div>${im.adresse || ''}</div></div>
    </div>
    <h1 style="text-align:center;margin:10px 0 4px">${full ? 'Quittance de loyer' : 'Reçu de paiement partiel'}</h1>
    <p style="text-align:center" class="pr-sub">Période du 1er au ${last} ${MONTHS_FULL[m - 1].toLowerCase()} ${y}</p>
    <table class="tbl" style="margin:18px 0"><tbody>
      <tr><td>Loyer et charges du mois</td><td class="r">${money(st.due)}</td></tr>
      <tr><td><b>Montant reçu</b>${st.p.date ? ` le ${fmtDate(st.p.date)}` : ''}${st.p.mode ? ` (${modes[st.p.mode] || st.p.mode})` : ''}</td><td class="r"><b>${money(st.paid)}</b></td></tr>
      ${!full ? html`<tr><td>Reste dû</td><td class="r">${money(st.rest)}</td></tr>` : ''}
    </tbody></table>
    <p style="font-size:12px;line-height:1.6">${full
      ? `Je soussigné(e), ${soc.nom || '……………………'}, ${SOC_QUAL[socRole()]}, déclare avoir reçu de ${fullName(l)} la somme de ${money(st.paid)} au titre du loyer et des charges du logement ${[logName(l.logId), im.adresse].filter(Boolean).join(', ')}, pour la période du 1er au ${last} ${MONTHS_FULL[m - 1].toLowerCase()} ${y}, et lui en donne quittance, sous réserve de tous mes droits.`
      : `Je soussigné(e), ${soc.nom || '……………………'}, ${SOC_QUAL[socRole()]}, déclare avoir reçu de ${fullName(l)} la somme de ${money(st.paid)} à titre d'acompte sur le loyer et les charges du logement ${[logName(l.logId), im.adresse].filter(Boolean).join(', ')} pour ${MONTHS_FULL[m - 1].toLowerCase()} ${y}. Il reste dû ${money(st.rest)}. Ce reçu ne vaut pas quittance.`}</p>
    <div style="margin-top:36px;display:flex;justify-content:space-between"><div>Fait à Luxembourg, le ${fmtDate(today())}</div><div style="text-align:center;min-width:200px">Signature<div style="border-bottom:1px solid #999;height:60px"></div></div></div>`, true);
  vault.mutate(() => {}, full ? 'Quittance imprimée' : 'Reçu imprimé', `${fullName(l)} — ${MONTHS_FULL[m - 1]} ${y}`, l.id);
}

function printCaution(locId) {
  const l = vault.get('locataires', locId);
  if (!l || !l.caution) return toast('Indiquez d’abord le montant de la caution', { bad: true });
  const soc = societe();
  const im = vault.get('immeubles', l.immId) || {};
  const where = [logName(l.logId), im.adresse].filter(Boolean).join(', ');
  const mode = CAUTION_MODES[l.cautionMode] ? CAUTION_MODES[l.cautionMode].toLowerCase() : '';
  if (!soc.nom) toast('Astuce : renseignez la société dans Réglages → Société & associés', {});
  printDoc('Reçu de caution', html`
    <div class="pr-cols" style="margin-bottom:22px">
      <div><h2>Locataire principal (bailleur)</h2><div><b>${soc.nom || '—'}</b></div><div>${soc.adresse || ''}</div><div>${soc.ville || ''}</div><div>${soc.tel || ''}${soc.tel && soc.email ? ' · ' : ''}${soc.email || ''}</div></div>
      <div><h2>Sous-locataire</h2><div><b>${fullName(l)}</b></div><div>${logName(l.logId) || ''}</div><div>${im.adresse || ''}</div></div>
    </div>
    <h1 style="text-align:center;margin:10px 0 4px">Reçu de caution</h1>
    <p style="text-align:center" class="pr-sub">Garantie locative</p>
    <table class="tbl" style="margin:18px 0"><tbody>
      <tr><td>Logement / local</td><td class="r">${where || '—'}</td></tr>
      <tr><td>Entrée dans les lieux</td><td class="r">${l.debut ? fmtDate(l.debut) : '—'}</td></tr>
      <tr><td><b>Caution reçue</b>${l.cautionDate ? ` le ${fmtDate(l.cautionDate)}` : ''}${mode ? ` (${mode})` : ''}</td><td class="r"><b>${money(l.caution)}</b></td></tr>
    </tbody></table>
    <p style="font-size:12px;line-height:1.6">Je soussigné(e), ${soc.nom || '……………………'}, ${SOC_QUAL[socRole()]}, déclare avoir reçu de ${fullName(l)} la somme de ${money(l.caution)} à titre de garantie locative (caution) pour ${where || 'le logement loué'}${l.cautionDate ? ', le ' + fmtDate(l.cautionDate) : ''}${mode ? ', ' + mode : ''}. Cette somme sera restituée à la fin du contrat, après l'état des lieux de sortie, déduction faite des sommes éventuellement dues (loyers, charges, dégâts constatés).</p>
    <div style="margin-top:36px;display:flex;justify-content:space-between;gap:24px"><div>Fait à Luxembourg, le ${fmtDate(today())}</div></div>
    <div style="margin-top:18px;display:flex;justify-content:space-between;gap:24px">
      <div style="text-align:center;min-width:200px">Le bailleur<div style="border-bottom:1px solid #999;height:60px"></div></div>
      <div style="text-align:center;min-width:200px">Le sous-locataire<div style="border-bottom:1px solid #999;height:60px"></div></div>
    </div>`, true);
  vault.mutate(() => {}, 'Reçu de caution imprimé', `${fullName(l)} — ${money(l.caution)}`, l.id);
}
// Pièces du dossier d'entrée : ✓ présente / ✗ manquante (cliquable pour l'ajouter)
const payLabel = (preset) => { const [k, ym] = String(preset || '').split('|'); if (k !== 'loyer' || !ym) return ''; const [y, m] = ym.split('-').map(Number); return `Preuve de paiement — ${MONTHS_FULL[m - 1]} ${y}`; };
const dossierChips = (locId, docOf) => html`<span style="display:inline-flex;gap:6px;flex-wrap:wrap">${DOSSIER.map(([k, v]) => { const d = docOf(k); return d
  ? html`<button type="button" class="badge ok" style="border:0;cursor:pointer;font:inherit;font-size:12px" data-action="open-doc" data-id="${d.id}" title="Voir : ${d.label}">✓ ${v} 👁</button>`
  : html`<button type="button" class="badge warn" style="border:0;cursor:pointer;font:inherit;font-size:12px" data-action="doc-type" data-id="${locId}" data-k="${k}" title="Ajouter : ${DOC_TYPES[k]}">✗ ${v}</button>`; })}</span>`;

const prBilan = (b, withOcc) => html`<table class="tbl"><tbody>
  <tr><td>Loyers encaissés</td><td class="r green">${money(b.encaisse)}</td></tr>
  ${b.verse != null ? html`<tr><td>Versé au bailleur</td><td class="r">${neg(b.verse)}</td></tr>` : ''}
  <tr><td>Réparations & frais</td><td class="r">${neg(b.depenses)}</td></tr>
  <tr><td><b>Gain net</b></td><td class="r"><b>${money(b.net ?? b.encaisse - b.depenses)}</b></td></tr>
  ${withOcc ? html`<tr><td>Occupants</td><td class="r">${b.occupants}</td></tr>` : ''}
</tbody></table>`;
const neg = (v) => (v ? '−' + money(v) : '—');
const mark = (ok, due) => (ok ? '✓' : due ? '✗' : '–');
const markPay = (l, y, m) => { const st = payState(l, y, m); return st.state === 'paid' ? '✓' : st.state === 'part' ? Math.round(st.paid) + '€' : isDue(l, y, m) ? '✗' : '–'; };

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
    <p class="pr-sub">${im.proprietaire ? 'Bailleur : ' + im.proprietaire + ' · ' : ''}${ownerRent(im) ? 'Bail principal : ' + money(ownerRent(im)) + ' / mois' : ''}${im.bailDebut ? ' · depuis le ' + fmtDate(im.bailDebut) : ''}</p>
    <div class="pr-cols"><div><h2>Bilan ${y}</h2>${prBilan(bilan({ immId, y }))}</div><div><h2>Depuis l'origine</h2>${prBilan(bilan({ immId }), true)}</div></div>
    ${years.length > 1 ? html`<h2>Par année</h2>${bilanTable(years)}` : ''}
    ${logs.length ? html`<h2>Logements</h2><table class="tbl"><thead><tr><th>Logement</th><th>Type</th><th>Occupant actuel</th><th class="r">Occupants</th><th class="r">Occupation</th><th class="r">Encaissé total</th></tr></thead><tbody>
      ${logs.map((g) => { const o = occupancy(g.id); const bb = bilan({ logId: g.id }); return html`<tr><td>${logLabel(g)}</td><td>${logKind(g)}</td><td>${occupantsNow(g.id).map(fullName).join(', ') || 'Vacant'}</td><td class="r">${bb.occupants}</td><td class="r">${o ? pct(o.occupied, o.total) + '%' : '—'}</td><td class="r">${money(bb.encaisse)}</td></tr>`; })}
    </tbody></table>` : ''}
    ${active.length ? html`<h2>Loyers ${y}</h2><table class="tbl pr-grid"><thead><tr><th>Locataire</th><th>Logement</th><th class="r">Loyer</th>${MONTHS.map((m) => html`<th>${m}</th>`)}<th class="r">Payé</th><th class="r">Impayé</th></tr></thead><tbody>
      ${active.map((l) => { const st = yearStats(l, y); return html`<tr><td>${fullName(l)}</td><td>${logName(l.logId)}</td><td class="r">${money(l.loyer)}</td>${MONTHS.map((_, i) => html`<td class="c">${markPay(l, y, i + 1)}</td>`)}<td class="r">${money(st.paid)}</td><td class="r">${money(st.rest)}</td></tr>`; })}
    </tbody></table>` : ''}
    ${ownerRent(im) ? html`<h2>Versements au bailleur ${y}</h2><table class="tbl pr-grid"><thead><tr>${MONTHS.map((m) => html`<th>${m}</th>`)}<th class="r">Total versé</th></tr></thead><tbody><tr>${MONTHS.map((_, i) => html`<td class="c">${mark(versement(immId, y, i + 1), isOwnerDue(im, y, i + 1))}</td>`)}<td class="r">${money(sum(versementsOf(immId, y), (v) => v.montant))}</td></tr></tbody></table>` : ''}
    ${deps.length ? html`<h2>Dépenses ${y}</h2><table class="tbl"><thead><tr><th>Date</th><th>Description</th><th>Concerne</th><th class="r">Montant</th></tr></thead><tbody>${deps.map((d) => html`<tr><td>${fmtDate(d.date)}</td><td>${d.desc}</td><td>${logName(d.logId) || 'Immeuble'}</td><td class="r">${money(d.montant)}</td></tr>`)}</tbody></table>` : ''}
    ${ls.length ? html`<h2>Historique des occupants</h2>${occupantsTable([...ls].sort(byDebut))}` : ''}`;
}

function reportLogement(logId) {
  const g = vault.get('logements', logId);
  const b = bilan({ logId });
  const o = occupancy(logId);
  return html`
    <h1>${logLabel(g)} — ${immName(g.immId)}</h1>
    <p class="pr-sub">${logKind(g)}${PARK_TYPES.includes(g.type) && parkTxt(g) ? html` · ${parkHtml(g)}` : ''}${g.surface ? ' · ' + g.surface + ' m²' : ''}${o ? ` · occupé ${pct(o.occupied, o.total)}% du temps, ${duree(o.vacant)} de vacance` : ''}</p>
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
    <table class="tbl"><thead><tr><th>Immeuble</th><th class="r">Encaissé</th><th class="r">Bailleur</th><th class="r">Dépenses</th><th class="r">Gain net</th></tr></thead><tbody>
      ${rows.map(({ im, a }) => html`<tr><td>${im.adresse}</td><td class="r">${money(a.encaisse)}</td><td class="r">${neg(a.verse)}</td><td class="r">${neg(a.depenses)}</td><td class="r">${money(a.net)}</td></tr>`)}
      <tr><td><b>Total</b></td><td class="r"><b>${money(T('a', 'encaisse'))}</b></td><td class="r"><b>${neg(T('a', 'verse'))}</b></td><td class="r"><b>${neg(T('a', 'depenses'))}</b></td><td class="r"><b>${money(T('a', 'net'))}</b></td></tr>
    </tbody></table>
    <h2>Depuis l'origine</h2>
    <table class="tbl"><thead><tr><th>Immeuble</th><th class="r">Occupants</th><th class="r">Encaissé</th><th class="r">Bailleur</th><th class="r">Dépenses</th><th class="r">Gain net</th></tr></thead><tbody>
      ${rows.map(({ im, o }) => html`<tr><td>${im.adresse}</td><td class="r">${o.occupants}</td><td class="r">${money(o.encaisse)}</td><td class="r">${neg(o.verse)}</td><td class="r">${neg(o.depenses)}</td><td class="r">${money(o.net)}</td></tr>`)}
      <tr><td><b>Total</b></td><td class="r"><b>${T('o', 'occupants')}</b></td><td class="r"><b>${money(T('o', 'encaisse'))}</b></td><td class="r"><b>${neg(T('o', 'verse'))}</b></td><td class="r"><b>${neg(T('o', 'depenses'))}</b></td><td class="r"><b>${money(T('o', 'net'))}</b></td></tr>
    </tbody></table>
    <h2>Résultat ${y}</h2>
    <table class="tbl"><tbody>
      <tr><td>Gain des immeubles</td><td class="r">${money(T('a', 'net'))}</td></tr>
      <tr><td>Frais fixes (${monthsElapsed(y)} mois)</td><td class="r">${neg(fraisOfYear(y))}</td></tr>
      <tr><td><b>Résultat net</b></td><td class="r"><b>${money(T('a', 'net') - fraisOfYear(y))}</b></td></tr>
      ${associes().map((p) => html`<tr><td>Part de ${p.nom} (${p.part} %)</td><td class="r">${money(((T('a', 'net') - fraisOfYear(y)) * p.part) / 100)}</td></tr>`)}
    </tbody></table>
    ${details ? imms.map((im) => html`<section class="pr-page">${reportImmeuble(im.id, y)}</section>`) : ''}`;
}

let installPrompt = null;
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installPrompt = e; if (ui.route === 'reglages') renderView(); });

const ACTIONS = {
  'cent-tog': (d, el) => { const dt = el.closest('details'); dt.open = !dt.open; ui.centOpen = dt.open; },
  'tpay-conf': () => openOver('tpay-conf'),
  'imm-map': (d) => { ui.mapImm = d.id || ''; renderView(); if (d.id) scrollTo({ top: 0, behavior: 'smooth' }); },
  'cp-tab': (d) => { ui.cpTab = d.id; ui.cpLim = 10; renderView(); },
  'cp-sec': (d) => { ui.cpSec = d.id; go('compta', true); },
  'cp-more': () => { ui.cpLim = (ui.cpLim || 10) + 10; renderView(); },
  'cp-clear': () => { ui.cpQ = ''; ui.cpFrom = ''; ui.cpTo = ''; ui.cpLim = 10; renderView(); },
  'soc-sign-del': async () => { if (!(await confirmBox('Supprimer la signature ?', { ok: 'Supprimer', danger: true, detail: 'Elle n’apparaîtra plus sur les quittances et documents. Ensuite, dessinez ou importez la nouvelle signature.' }))) return; await vault.mutate((tx) => tx.put('reglages', { id: 'main', signature: '', signPx: 0 }), 'Signature retirée', socName()); signRefresh(); },
  'soc-logo-del': async () => { await vault.mutate((tx) => tx.put('reglages', { id: 'main', logo: '' }), 'Logo retiré', socName()); applyBrand(); if (ui.sheet) { ui.sheet.rendered = false; renderSheet(); } },

  'cp-csv': () => {
    const y = ui.year, per = ui.cpPer || 'y';
    const [from, to] = cpRange(y, per);
    const url = URL.createObjectURL(new Blob([journalCsv(journal(from, to))], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = `journal-${cpLabel(y, per).toLowerCase().replace(/\s+/g, '-')}.csv`; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    toast('Journal téléchargé');
  },

  'cp-print': () => {
    const y = ui.year, per = ui.cpPer || 'y';
    const [from, to] = cpRange(y, per);
    const rows = journal(from, to);
    const R = rows.filter((r) => r.sens === 'R'), D = rows.filter((r) => r.sens === 'D');
    printDoc('Journal ' + cpLabel(y, per), html`<table class="pr-tbl"><thead><tr><th>Date</th><th>Libellé</th><th>Immeuble</th><th style="text-align:right">HT</th><th style="text-align:right">TVA</th><th style="text-align:right">TTC</th></tr></thead><tbody>
      ${rows.map((r) => html`<tr><td>${fmtDate(r.d)}</td><td>${r.cat} · ${r.lib}</td><td>${r.imm}</td><td style="text-align:right">${money(r.ttc - r.tva)}</td><td style="text-align:right">${r.tva ? money(r.tva) : ''}</td><td style="text-align:right">${r.sens === 'R' ? '' : '−'}${money(r.ttc)}</td></tr>`)}
      </tbody></table>
      <p><b>Recettes :</b> ${money(sum(R, (r) => r.ttc))} · <b>Dépenses :</b> ${money(sum(D, (r) => r.ttc))} · <b>Résultat :</b> ${money(sum(R, (r) => r.ttc) - sum(D, (r) => r.ttc))} · <b>TVA collectée :</b> ${money(sum(R, (r) => r.tva))} · <b>TVA déductible :</b> ${money(sum(D, (r) => r.tva))}</p>`);
  },

  'photo-del': (d, el) => { const box = el.closest('.photo-pick'); box.querySelector('[name=photo]').value = ''; setHtml(box.querySelector('.pp-circle'), '👤'); el.remove(); },

  // ▶ le même petit dessin animé que dans les autres apps (iPhone / Android / Samsung)
  'install-anim': () => import('/ares/install-anim.js').then((m) => m.showInstallAnim({ name: 'CENTRAL-OGL', icon: '/ares/icons/ares-192.png', lang: (() => { try { return localStorage.getItem('aresLang') || 'fr'; } catch { return 'fr'; } })() })),

  'open-rapports': () => { ui.cpSec = 'stats'; go('rapports'); },
  'rpt-back': () => { ui.cpSec = 'stats'; go('compta'); },
  'rpt-src': (d) => { rptCfg().src = d.id; renderView(); },
  'rpt-per': (d) => { const c = rptCfg(); c.from = d.f; c.to = d.t; renderView(); },
  'rpt-xlsx': () => { const c = rptCfg(), tb = rptTable(c); download(`${rptTitle(c).replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase()}.xlsx`, xlsxBlob(tb.head, tb.rows, RPT_SRC[c.src][0].replace(/^\S+\s/, '')), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); },
  'rpt-print': () => { const c = rptCfg(), tb = rptTable(c); printDoc(rptTitle(c), html`<table class="pr-tbl"><thead><tr>${tb.head.map((h) => html`<th>${h}</th>`)}</tr></thead><tbody>${tb.rows.map((r) => html`<tr>${r.map((v) => html`<td>${v}</td>`)}</tr>`)}</tbody></table><p class="tiny">${plural(tb.n, 'ligne')}</p>`); },

  async 'rpt-save'() {
    const nom = ($('#rptName')?.value || '').trim();
    if (!nom) return toast('Donnez un nom à la liste', { bad: true });
    const r = vault.get('reglages', 'rapports') || {}, list = (r.list || []).filter((x) => x.nom !== nom);
    await vault.mutate((tx) => tx.put('reglages', { id: 'rapports', list: [...list, { id: uid(), nom: nom.slice(0, 60), cfg: JSON.parse(JSON.stringify(rptCfg())) }].slice(-30) }), 'Rapports : liste enregistrée', nom);
    toast('Liste enregistrée'); renderView();
  },

  'rpt-load': (d) => { const s = (((vault.get('reglages', 'rapports') || {}).list) || []).find((x) => x.id === d.id); if (s) { ui.rpt = { ...rptDef(), ...JSON.parse(JSON.stringify(s.cfg)) }; if (ui.rpt.person) { ui.rpt.persons = [ui.rpt.person]; delete ui.rpt.person; } renderView(); } },

  async 'rpt-del'(d) {
    const r = vault.get('reglages', 'rapports') || {}, s = (r.list || []).find((x) => x.id === d.id);
    if (!s || !(await confirmBox('Supprimer la liste « ' + s.nom + ' » ?', { ok: 'Supprimer', danger: true }))) return;
    await vault.mutate((tx) => tx.put('reglages', { id: 'rapports', list: r.list.filter((x) => x.id !== d.id) }), 'Rapports : liste supprimée', s.nom);
    renderView();
  },

  // toucher un point de couleur (téléphone / tablette) : sa bulle reste ouverte ; toucher ailleurs la ferme
  'leg-dot': (d, el) => { const on = !el.classList.contains('on'); document.querySelectorAll('.leg-dot.on').forEach((x) => x.classList.remove('on')); el.classList.toggle('on', on); },

  'lieu-set': (d, el) => {
    const f = el.form || $('#f'), [kind, v] = [d.k.slice(0, 1), d.k.slice(2)], lf = $('#tacheLogF');
    el.parentNode.querySelectorAll('[aria-pressed]').forEach((r) => r.setAttribute('aria-pressed', String(r === el)));
    $('#lieuNew').hidden = true;
    if (kind === 'i') { f.immId.value = v; f.lieu.value = ''; $('#tacheLog').innerHTML = val(logOptions(v, '')); lf.hidden = false; setHtml($('#lieuSel'), lieuSelHtml({ immId: v })); }
    else { const h = (ui.lieuH || [])[+v]; if (!h) return; const p = { nom: h.nom, adr: h.adr, contact: h.contact, tel: h.tel }; f.immId.value = ''; f.lieu.value = JSON.stringify(p); $('#tacheLog').innerHTML = ''; lf.hidden = true; setHtml($('#lieuSel'), lieuSelHtml({ lieu: p })); }
    sheetDirty = true;
  },

  'lieu-new': (d, el) => {
    const f = el.form || $('#f'); f.immId.value = ''; f.lieu.value = ''; $('#tacheLog').innerHTML = ''; $('#tacheLogF').hidden = true;
    $('#lieuList').querySelectorAll('[aria-pressed]').forEach((r) => r.setAttribute('aria-pressed', 'false'));
    setHtml($('#lieuSel'), html`✏️ <span>Nouveau lieu : remplissez le nom ou l’adresse.</span>`);
    $('#lieuNew').hidden = false; f.lieuNom.focus();
  },

  'open-signal': (d) => { const t = vault.get('taches', d.id); if (t && !t.vu) vault.mutate((tx) => tx.put('taches', { id: t.id, vu: true }), 'Message du locataire lu', t.titre, t.locId); openOver('tache-form', d.id); },
  'ics-all': (d) => { ui.icsAll = null; openOver('ics-all', d.id); },

  async 'ics-analyze'() {
    const st = ui.icsAll;
    const input = sheetEl.querySelector('[name=url]');
    const url = (input ? input.value : '').trim();
    if (!/^(https|webcals?):\/\//i.test(url)) { st.err = 'Collez d’abord le lien du calendrier (il commence par https:// ou webcal://).'; st.groups = null; }
    else {
      toast('Lecture du calendrier de la commune…');
      try { st.url = url; st.groups = icsGroups(await vault.fetchIcs(url.replace(/^webcals?:\/\//i, 'https://'))); st.err = ''; }
      catch (e) { st.err = (e.message || 'Calendrier indisponible') + (/gros|volumineux|calendrier \(\.ics\)/i.test(e.message || '') ? ' — ce lien est sans doute la page web de la commune, pas le calendrier : utilisez le fichier .ics téléchargé.' : ''); st.groups = null; }
    }
    if (ui.sheet) { ui.sheet.rendered = false; renderSheet(); }
  },

  'new-collecte': (d) => openOver('collecte-form', null, null, d.imm || ui.immFilter || ''),
  'edit-collecte': (d) => openOver('collecte-form', d.id),

  async 'ics-now'(d) {
    toast('Lecture du calendrier de la commune…');
    const n = await refreshIcs(true, d.id);
    const c = vault.get('collectes', d.id);
    if (c && !c.icsErr) toast(n ? 'Nouvelles dates enregistrées' : 'Déjà à jour');
    if (ui.sheet) { ui.sheet.rendered = false; renderSheet(); }
  },

  async 'esp-on'(d) {
    const l = vault.get('locataires', d.id);
    if (!l) return;
    const show = { ...ESP_ALL };
    sheetEl.querySelectorAll('[data-input=esp-show]').forEach((c) => { show[c.dataset.k] = c.checked; });
    await ownerKeys();
    await vault.mutate((tx) => tx.put('locataires', { id: l.id, espace: { on: true, id: newEspaceId(), key: newEspaceKey(), show, lang: '', docs: [], since: today() } }), 'Espace locataire créé', fullName(l), l.id);
    toast('Création de l’espace…');
    if (await espaceSync(l.id, true)) {
      try { await setAccessCode(vault.get('locataires', l.id)); toast('Espace locataire prêt'); } catch (e) { toast(e.message || 'Code impossible (connexion ?)', { bad: true }); }
    }
    if (ui.sheet) { ui.sheet.rendered = false; renderSheet(); }
  },

  async 'apps-refresh-all'() { toast('Mise à jour de toutes les apps…'); try { await appsRefreshAll(); } catch (e) { toast('Mise à jour impossible : ' + (e.message || e), { bad: true }); } if (['dashboard', 'reglages'].includes(ui.route)) renderView(); },

  async 'esp-refresh'(d) {
    const l = vault.get('locataires', d.id);
    if (!l || !l.espace || !l.espace.on) return;
    toast('Mise à jour de l’app…');
    try { localStorage.removeItem('aresEsp:' + l.espace.id); } catch { /* rien */ }
    try {
      if (await espaceSync(l.id, true)) toast(`App de ${fullName(l)} à jour ✓ · ${(espaceData(l).pubs || []).length} annonce(s)`);
    } catch (e) { toast('Mise à jour impossible : ' + (e.message || e), { bad: true }); }
  },

  async 'esp-off'(d) {
    const l = vault.get('locataires', d.id);
    if (!l || !l.espace || !(await confirmBox('Désactiver l’espace locataire ?', { ok: 'Désactiver', danger: true, detail: 'Son lien ne fonctionnera plus. Vous pourrez créer un nouvel espace (nouveau lien) plus tard.' }))) return;
    try { await vault.espaceDel(l.espace.id); if (l.espace.codeHash) await vault.espCodeDel(l.espace.codeHash); } catch (e) { if (e.status !== 403) return toast(e.message || 'Impossible (connexion ?)', { bad: true }); } // 403 : l'espace appartient encore à une autre centrale → on le lâche ici, un nouveau lien est possible
    try { localStorage.removeItem('aresEsp:' + l.espace.id); } catch {}
    espHashes.delete(l.id);
    await vault.mutate((tx) => tx.put('locataires', { id: l.id, espace: { on: false, show: l.espace.show } }), 'Espace locataire désactivé', fullName(l), l.id);
    toast('Espace désactivé');
  },

  async 'esp-code'(d) {
    const l = vault.get('locataires', d.id);
    if (!l || !l.espace || !l.espace.on) return;
    if (l.espace.code && !(await confirmBox('Nouveau code d’accès ?', { ok: 'Nouveau code', detail: 'L’ancien code ne fonctionnera plus pour une nouvelle installation (les téléphones déjà connectés restent connectés).' }))) return;
    try { await setAccessCode(l); toast('Nouveau code créé'); } catch (e) { toast(e.message || 'Impossible (connexion ?)', { bad: true }); }
  },

  async 'code-copy'(d) { try { await navigator.clipboard.writeText(d.code); toast('Code copié : ' + d.code); } catch { toast('Copie impossible', { bad: true }); } },

  async 'esp-copy'(d) {
    const l = vault.get('locataires', d.id);
    try { await navigator.clipboard.writeText(espUrl(l)); toast('Lien copié'); } catch { toast('Copie impossible', { bad: true }); }
  },

  'bail-letter': (d) => bailLetter(d.id),
  'bail-open': (d) => openSheet('imm', d.id, 'proprio'),
  'esp-list': () => openOver('esp-list'),

  async 'push-on'() {
    try {
      if (await pushEnable({ api: API.replace(/\/$/, ''), swUrl: '/locataires-sw.js', scope: '/locataires', post: pushPost })) { pushSt = 'on'; toast('🔔 Notifications activées'); } else pushSt = await pushStatus('/locataires');
    } catch { toast('Notifications impossibles sur ce téléphone', { bad: true }); }
    renderView();
  },

  'door-change': (d) => openOver('door-form', d.id),

  // désactiver / réactiver le code sans le changer (il disparaît / revient dans l'app de l'occupant)
  'door-toggle': async (d) => {
    const g = vault.get('logements', d.id);
    if (!g || !g.porte) return;
    const off = !g.porte.off;
    await vault.mutate((tx) => tx.put('logements', { id: g.id, porte: { ...g.porte, off } }), off ? 'Code de porte désactivé' : 'Code de porte réactivé', `${g.nom} (${immName(g.immId)})`, g.id);
    toast(off ? 'Code désactivé : il n’apparaît plus chez l’occupant' : 'Code réactivé');
  },

  'door-show': (d) => { ui.showDoor = ui.showDoor === d.id ? '' : d.id; ui.sheet.rendered = false; renderSheet(); },
  'esp-filter': (d, el) => { sheetEl.querySelectorAll('[data-action=esp-filter]').forEach((b) => b.setAttribute('aria-pressed', b === el)); filterEspList(); },
  'esp-open': (d) => openOver('loc', d.id, 'espace'),
  'share-coll': (d) => openOver('share-coll', d.id),

  async 'share-on'(d) {
    const im = vault.get('immeubles', d.id);
    const token = [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('');
    try { await vault.publishPublic(token, pubData({ ...im, pubToken: token })); } catch (e) { return toast(e.message || 'Publication impossible (connexion ?)', { bad: true }); }
    await vault.mutate((tx) => tx.put('immeubles', { id: im.id, pubToken: token }), 'Page locataires créée', im.adresse, im.id);
    toast('Lien créé');
    if (ui.sheet) { ui.sheet.rendered = false; renderSheet(); }
  },

  async 'share-off'(d) {
    const im = vault.get('immeubles', d.id);
    if (!im || !(await confirmBox('Désactiver le lien ?', { ok: 'Désactiver', danger: true, detail: 'La page et le calendrier des locataires ne fonctionneront plus. Vous pourrez créer un nouveau lien (différent) plus tard.' }))) return;
    try { await vault.publishPublic(im.pubToken, null); } catch (e) { return toast(e.message || 'Impossible (connexion ?)', { bad: true }); }
    await vault.mutate((tx) => tx.put('immeubles', { id: im.id, pubToken: '' }), 'Page locataires désactivée', im.adresse, im.id);
    toast('Lien désactivé');
    goBack();
  },

  async 'share-copy'(d) {
    const im = vault.get('immeubles', d.id);
    try { await navigator.clipboard.writeText(pubUrl(im)); toast('Lien copié'); } catch { toast('Copie impossible : sélectionnez le lien', { bad: true }); }
  },

  'print-collectes': (d) => printDoc('Collectes des déchets', reportCollectes(d.id, +d.y || new Date().getFullYear())),

  async 'tache-done'(d) {
    const t = vault.get('taches', d.id);
    if (!t) return;
    const fromSheet = ui.sheet && ui.sheet.kind === 'tache-form';
    const saved = await vault.mutate((tx) => tx.put('taches', { id: t.id, statut: 'fait', doneDate: today(), vu: true }), 'Chantier clôturé', `${t.titre} — ${placeName(t)}`, t.immId);
    toast(t.locId ? '✓ Réparé · le locataire voit « Terminé » dans son app' : '🟢 Intervention terminée');
    if (fromSheet) goBack();
    await offerDepense(saved);
  },

  async 'del-tache'(d) {
    const t = vault.get('taches', d.id);
    const photos = t ? vault.list('documents').filter((x) => x.tacheId === t.id) : [];
    const detail = [t && t.locId ? 'Le signalement disparaît aussi de l’app du locataire' + (photos.length ? ', avec ses photos' : '') + '. Pour garder une trace, touchez plutôt « Réparé ».' : '', t && t.depId ? 'La dépense déjà enregistrée reste dans les dépenses de l’immeuble.' : ''].filter(Boolean).join(' ');
    if (!t || !(await confirmBox(`Supprimer « ${t.titre} » ?`, { ok: 'Supprimer', danger: true, detail }))) return;
    await vault.mutate((tx) => { tx.remove('taches', d.id); for (const ph of photos) tx.remove('documents', ph.id); }, 'Intervention supprimée', t.titre, t.immId);
    for (const ph of photos) await vault.deleteFile(ph.id).catch(() => {});
    goBack();
  },

  async 'del-collecte'(d) {
    const c = vault.get('collectes', d.id);
    if (!c || !(await confirmBox(`Supprimer la collecte « ${DECHETS[c.cat].short} » ?`, { ok: 'Supprimer', danger: true, detail: immName(c.immId) }))) return;
    await vault.mutate((tx) => tx.remove('collectes', d.id), 'Collecte supprimée', `${DECHETS[c.cat].short} — ${immName(c.immId)}`, c.immId);
    publishPub(c.immId);
    goBack();
  },

  go: (d) => { closeSheet(); if (d.sec) ui.cpSec = d.sec; go(d.to); },
  lock: async () => { if (await confirmBox('Se déconnecter ?', { ok: '🚪 Se déconnecter', detail: 'La centrale se ferme : il faudra la clé pour rouvrir' })) lockNow(); },
  'sync-now': () => vault.sync().then(() => vault.status === 'synced' && toast('Synchronisé')),

  'toggle-pw': (_, el) => {
    const inp = el.parentElement.querySelector('input');
    inp.type = inp.type === 'password' ? 'text' : 'password';
    setHtml(el, icon(inp.type === 'password' ? 'eye' : 'eyeOff'));
  },

  'new-imm': () => openSheet('imm-form'),

  async 'imm-geo-osm'() {
    const f = document.getElementById('f');
    if (!f) return;
    const adr = [f.adresse.value, f.ville.value].map((x) => String(x || '').trim()).filter(Boolean).join(', ');
    if (!adr) return toast('Écrivez d’abord l’adresse', { bad: true });
    let g = null;
    try { g = await osmGeo(adr, f.pays && f.pays.value); } catch { /* hors ligne */ }
    if (!g) return toast('Adresse introuvable sur OpenStreetMap : vérifiez-la, ou enregistrez la position sur place', { bad: true });
    geoFill(f, g, 'osm');
  },

  'imm-geo-here'() {
    const f = document.getElementById('f');
    if (!f || !navigator.geolocation) return toast('Position non disponible sur cet appareil', { bad: true });
    navigator.geolocation.getCurrentPosition((p) => geoFill(f, [Math.round(p.coords.latitude * 1e6) / 1e6, Math.round(p.coords.longitude * 1e6) / 1e6], 'ici', Math.round(p.coords.accuracy)),
      () => toast('Position refusée ou introuvable : autorisez la localisation pour ce site', { bad: true }), { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  },

  'edit-imm': (d) => openSheet('imm-form', d.id),
  'new-loc': (d) => openSheet('loc-form', null, null, d.log),
  'edit-loc': (d) => openSheet('loc-form', d.id),
  'open-loc': (d) => openSheet('loc', d.id),
  'open-esp': (d) => openSheet('loc', d.id, 'espace'),
  'rev-letter': (d) => revLetter(d.id),
  'open-loc-docs': (d) => openSheet('loc', d.id, 'docs'),

  // ✅ document du locataire rangé dans son dossier (type choisi) ; ❌ refusé avec le motif, le fichier est effacé
  async 'recu-ok'(d) {
    const doc = vault.get('documents', d.id); if (!doc) return;
    const sel = sheetEl.querySelector(`[data-recu-type="${d.id}"]`), dtype = sel && DOC_TYPES[sel.value] ? sel.value : doc.dtype;
    await vault.mutate((tx) => tx.put('documents', { id: doc.id, kind: '', st: 'ok', dtype, label: DOC_TYPES[dtype].replace(/ \(.*\)$/, '') }), 'Document du locataire accepté', `${DOC_TYPES[dtype]} — ${fullName(vault.get('locataires', doc.locId) || {})}`, doc.locId);
    toast('Rangé dans le dossier du locataire ✓');
  },

  async 'recu-ko'(d) {
    const doc = vault.get('documents', d.id); if (!doc) return;
    const inp = sheetEl.querySelector(`[data-recu-why="${d.id}"]`), why = String((inp && inp.value) || '').trim().slice(0, 140);
    if (!why) { if (inp) inp.focus(); return toast('Écrivez le motif du refus : le locataire le lira', { bad: true }); }
    await vault.mutate((tx) => tx.put('documents', { id: doc.id, kind: 'refus', st: 'ko', why, size: 0 }), 'Document du locataire refusé', `${DOC_TYPES[doc.dtype] || ''} — ${why}`, doc.locId);
    await vault.deleteFile(doc.id).catch(() => {});
    toast('Refusé — le locataire voit le motif');
  },

  async 'open-vir'(d) {
    const l = vault.get('locataires', d.id);
    if (l && l.virSignal) await vault.mutate((tx) => tx.put('locataires', { id: l.id, virSignal: { ...l.virSignal, vu: true } }), 'Virement signalé : vu', fullName(l), l.id);
    openSheet('loc', d.id);
  },

  'sheet-tab': (d) => { ui.sheet.tab = d.id; ui.sheet.rendered = false; renderSheet(); sheetEl.querySelector('.sheet-body').scrollTop = 0; },
  'open-imm': (d) => openSheet('imm', d.id, d.tab),
  'open-log': (d) => openSheet('log', d.id, d.tab),
  'new-log': (d) => openSheet('log-form', null, null, d.imm),
  'coloc-new': (d) => openOver('coloc-form', null, null, d.imm),

  async 'coloc-add'(d) {
    const rooms = logsOf(d.imm).filter((g) => (g.partie || '').trim().toLowerCase() === d.p.trim().toLowerCase());
    if (rooms.length >= 30) return;
    let n = rooms.length + 1;
    while (rooms.some((g) => g.nom === 'Chambre ' + n)) n++;
    const first = rooms[0] || {};
    await vault.mutate((tx) => tx.put('logements', { nom: 'Chambre ' + n, immId: d.imm, type: 'chambre', etage: first.etage || '', partie: d.p, loyer: first.loyer || '', surface: '', note: '' }), 'Chambre ajoutée', `Chambre ${n} — ${d.p} (${immName(d.imm)})`, d.imm);
    toast(`Chambre ${n} ajoutée`);
    if (ui.sheet) { ui.sheet.rendered = false; renderSheet(); }
  },

  'edit-log': (d) => openSheet('log-form', d.id),
  replace: (d) => openSheet('replace-form', d.id),
  'toggle-vers': (d) => toggleVers(d.imm, +d.y, +d.m),
  'loc-seg': (d) => { ui.locSeg = d.id; if (ui.route === 'locataires') renderView(); else go('locataires'); },
  'imm-seg': (d) => { ui.immSeg = d.id; renderView(); },
  'end-imm': (d) => openSheet('endimm-form', d.id),
  'close-sheet': async () => { if (await leaveSheetOk()) { sheetDirty = false; goBack(); } },
  pay: (d) => payFull(d.loc, +d.y, +d.m),

  async 'toggle-pay'(d) {
    const l = vault.get('locataires', d.loc);
    const y = +d.y, m = +d.m;
    if (!l) return;
    if (payment(l.id, y, m)) return openOver('pay-form', null, null, { locId: d.loc, y, m });
    if (!isDue(l, y, m)) {
      // Mois hors contrat : on corrige d'abord les dates, sinon le paiement fausserait les totaux
      const { fix, afterExit } = datesFix(l, [{ y, m }]);
      if (afterExit.length) return toast(`${fullName(l)} est parti le ${fmtDate(l.sortie)} : ce mois n'est plus dû.`, { bad: true });
      const what = fix.debut ? `avancer l'entrée au ${fmtDate(fix.debut)}` : `prolonger le contrat jusqu'au ${fmtDate(fix.fin)}`;
      if (!(await confirmBox(`${MONTHS_FULL[m - 1]} ${y} est hors du contrat`, { ok: fix.debut ? "Avancer l'entrée et payer" : 'Prolonger et payer', detail: `Le contrat de ${fullName(l)} ${fix.debut ? 'commence le ' + fmtDate(l.debut) : 'finit le ' + fmtDate(l.fin)}. Pour que les totaux restent justes, CENTRAL-OGL va ${what}, puis enregistrer le paiement.` }))) return;
      await vault.mutate((tx) => tx.put('locataires', { id: l.id, ...fix }), 'Dates du contrat corrigées', `${fullName(l)} — ${what}`, l.id);
    }
    payFull(d.loc, y, m);
  },

  async 'fix-dates'(d) {
    const l = vault.get('locataires', d.id);
    if (!l) return;
    const pays = outsidePays(l);
    const { fix, afterExit } = datesFix(l, pays);
    const lines = [];
    if (fix.debut) lines.push(`Entrée : ${fmtDate(l.debut)} → ${fmtDate(fix.debut)}`);
    if (fix.fin) lines.push(`Fin du contrat : ${fmtDate(l.fin)} → ${fmtDate(fix.fin)}`);
    const list = pays.map((p) => `${MONTHS_FULL[p.m - 1].toLowerCase()} ${p.y}`).join(', ');
    if (!lines.length) {
      await confirmBox(`${fullName(l)} : paiements après la sortie`, { ok: 'Voir les loyers', detail: `Payé(s) après la sortie du ${fmtDate(l.sortie)} : ${afterExit.map((p) => MONTHS_FULL[p.m - 1].toLowerCase() + ' ' + p.y).join(', ')}. Vérifiez la date de sortie (Modifier) ou annulez ces paiements.` });
      return openSheet('loc', l.id, 'pay');
    }
    if (!(await confirmBox(`Corriger les dates de ${fullName(l)} ?`, { ok: 'Corriger', detail: `Loyers payés hors des dates du contrat : ${list}. ${lines.join(' · ')}.${afterExit.length ? ' (Les mois après la sortie restent à vérifier.)' : ''}` }))) return;
    await vault.mutate((tx) => tx.put('locataires', { id: l.id, ...fix }), 'Dates du contrat corrigées', `${fullName(l)} — ${lines.join(', ')}`, l.id);
    toast('Dates corrigées · totaux recalculés');
  },

  async 'del-pay'(d) {
    const l = vault.get('locataires', d.loc);
    const k = payKey(d.loc, +d.y, +d.m);
    if (!(await confirmBox(`Annuler le paiement de ${fullName(l)} — ${MONTHS_FULL[+d.m - 1]} ${d.y} ?`, { ok: 'Annuler le paiement', danger: true, detail: 'Le mois redevient « à payer ». Ce paiement enregistré est supprimé.' }))) return;
    await vault.mutate((tx) => tx.remove('paiements', k), 'Paiement annulé', `${fullName(l)} — ${MONTHS_FULL[+d.m - 1]} ${d.y}`, d.loc);
    toast('Paiement annulé');
    goBack();
  },

  quittance: (d) => printQuittance(d.loc, +d.y, +d.m),
  'caution-recu': (d) => printCaution(d.id),
  'open-chat': (d) => { openSheet('imm', d.id, 'chat'); chatLoad(d.id, true); },

  'chat-reply-priv': (d) => {
    ui.chatTo = { ...(ui.chatTo || {}), [d.id]: d.loc };
    const sel = document.querySelector(`select[name="to"][data-gid="${d.id}"]`);
    if (sel) { sel.value = d.loc; const ta = sel.closest('form').querySelector('textarea'); if (ta) ta.focus(); }
  },

  async 'vrai-tog'(d, el) {
    const r = vault.get(d.c, d.id);
    if (!r) return;
    const on = !r.vrai;
    await vault.mutate((tx) => tx.put(d.c, { id: r.id, vrai: on }), on ? '⭐ Marqué « vrai — à conserver »' : '☆ Plus marqué « vrai »', d.c + ' ' + r.id, r.id);
    if (el) { el.classList.toggle('on', on); el.textContent = on ? '⭐ Vrai' : '☆ Test ?'; }
    toast(on ? '⭐ Gardé pour toujours : « Supprimer les données de test » n’y touchera pas' : '☆ Plus protégé');
  },

  'test-clean': () => openSheet('test-clean'),

  async 'test-clean-do'() {
    const plan = testPlan();
    if (!plan.del.total) return toast('Rien à supprimer');
    // 1) sauvegarde chiffrée automatique d'abord (au cas où)
    const backup = await vault.exportEncrypted();
    download(`ares_sauvegarde_avant_nettoyage_${today()}.ares`, JSON.stringify(backup), 'application/octet-stream');
    const k = await promptKey('🧹 Supprimer les données de test', `${plan.del.total} fiches de test seront effacées. ${plan.keep.total} fiches ⭐ (et tout ce qui en dépend) restent. Une sauvegarde chiffrée vient d’être téléchargée. Saisissez votre clé d’accès pour confirmer.`, ['Seules les fiches ⭐ « Vrai » et ce qui leur est lié restent. Vérifiez la liste avant de confirmer : cette suppression ne se défait qu’en réimportant la sauvegarde.']);
    if (!k) return;
    if (!(await vault.verifyPassphrase(k))) return toast("Clé d'accès incorrecte", { bad: true });
    const espaces = [...plan.del.locataires, ...plan.del.intervenants, ...plan.del.hotes].map((r) => r.espace && r.espace.id).filter(Boolean);
    await vault.mutate((tx) => { for (const [c, rows] of Object.entries(plan.del)) if (Array.isArray(rows)) for (const r of rows) tx.remove(c, r.id); }, '🧹 Données de test supprimées', Object.entries(plan.del).filter(([, v]) => Array.isArray(v) && v.length).map(([c, v]) => `${c} ${v.length}`).join(' · '));
    for (const d of plan.del.documents) await vault.deleteFile(d.id).catch(() => {});
    for (const e of espaces) await vault.espaceDel(e).catch(() => {});
    closeSheet();
    toast(`🧹 ${plan.del.total} fiches de test supprimées · ${plan.keep.total} ⭐ gardées`);
    go('dashboard', true);
  },

  'ann-new': () => {
    openSheet('ann-new');
  },

  'ann-log': () => openSheet('ann-log'),
  'ann-vu': (d) => vault.mutate((tx) => tx.put('reglages', { id: d.id, vu: true }), '📣 Annonce lue', ''),
  'chat-mn': (d) => { ui.chatMn = ui.chatMn === d.id ? '' : d.id; if (ui.sheet) { ui.sheet.rendered = false; renderSheet(); } },

  async 'chat-edit'(d) {
    ui.chatMn = '';
    const im = vault.list('immeubles').find((x) => Object.values(x.chats || {}).some((g) => g.id === d.id));
    const g = im && Object.values(im.chats || {}).find((x) => x.id === d.id), rs = (ui.chatView || {})[d.id];
    const m = rs && rs.list.find((x) => x.id === d.mid);
    if (!g || !m) return;
    if (!editable(m)) return toast('Plus possible : 15 minutes sont passées.', { bad: true });
    const x = await promptEdit('✏️ Modifier le message', m.x || '');
    if (x == null || x === m.x) return;
    const op = { k: 'ed', r: m.id, m: 'mgr', t: new Date().toISOString() };
    try {
      if (m.p) {
        const l = vault.get('locataires', m.p), k = vault.get('reglages', 'signal');
        if (!l || !l.espace || !l.espace.key || !k || !k.pub) throw new Error('Message privé : l’app de cet habitant n’est pas active.');
        await vault.boardPost(g.id, await sealJson(g.key, { ...op, p: l.id, o: b64u(await sealForOwner(k.pub, { x })), e: b64u(await sealJson(l.espace.key, { x })) }), 'none');
      } else await vault.boardPost(g.id, await sealJson(g.key, { ...op, x }), 'none');
    } catch (e) { return toast(e.message || 'Modification impossible', { bad: true }); }
    toast('Message modifié');
    chatLoad(im.id, true);
  },

  async 'chat-del'(d) {
    if (!(await confirmBox('Supprimer ce message ?', { ok: 'Supprimer', danger: true, detail: 'Il disparaît pour tous les habitants.' }))) return;
    const im = vault.list('immeubles').find((x) => Object.values(x.chats || {}).some((g) => g.id === d.id));
    try { for (const n of String(d.n).split(',').filter(Boolean)) await vault.boardDelMsg(d.id, n); } catch (e) { return toast(e.message || 'Suppression impossible', { bad: true }); }
    vault.mutate(() => {}, 'Message supprimé (modération)', im ? im.adresse : '', im ? im.id : '');
    toast('Message supprimé');
    if (im) chatLoad(im.id, true);
  },

  'pay-proof': (d) => openSheet('loc', d.loc, 'docs', `loyer|${d.y}-${d.m}`),
  'doc-type': (d) => { ui.sheet.tab = 'docs'; ui.sheet.preset = d.k; ui.sheet.rendered = false; renderSheet(); },
  relance: (d) => openOver('relance', d.id),
  'rel-lang': (d) => { ui.relLang = d.id; ui.sheet.rendered = false; renderSheet(); },

  async 'send-relance'(d) {
    const l = vault.get('locataires', d.id);
    const text = $('#relText').value;
    const tel = (l.tel || '').replace(/[^\d+]/g, '');
    const url = d.ch === 'sms' ? `sms:${tel}?&body=${encodeURIComponent(text)}`
      : d.ch === 'wa' ? `https://wa.me/${tel.replace(/^\+/, '').replace(/^00/, '')}?text=${encodeURIComponent(text)}`
      : `mailto:${l.mail}?subject=${encodeURIComponent(({ fr: 'Rappel de loyer', it: 'Promemoria affitto', en: 'Rent reminder', pt: 'Lembrete de renda', de: 'Mietzahlungserinnerung', es: 'Recordatorio de alquiler' }[ui.relLang || 'fr'] || 'Rappel de loyer'))}&body=${encodeURIComponent(text)}`;
    if (d.ch === 'wa') open(url, '_blank'); else location.href = url;
    await vault.mutate(() => {}, 'Relance envoyée', `${fullName(l)} (${{ sms: 'SMS', wa: 'WhatsApp', mail: 'email' }[d.ch]})`, l.id);
  },

  'copy-relance': async () => {
    try { await navigator.clipboard.writeText($('#relText').value); toast('Texte copié'); } catch { toast('Copie impossible', { bad: true }); }
  },

  'open-societe': () => openSheet('societe-form'),
  'open-frais': () => openSheet('frais'),

  async 'del-frais'(d) {
    const f = vault.get('frais', d.id);
    if (!(await confirmBox(`Supprimer « ${f.libelle} » ?`, { ok: 'Supprimer', danger: true, detail: 'Pour un frais qui s’arrête, préférez une date de fin en le recréant : les mois passés restent alors comptés.' }))) return;
    await vault.mutate((tx) => tx.remove('frais', d.id), 'Frais fixe supprimé', f.libelle);
  },

  index: (d) => openOver('index-form', d.id),
  renew: (d) => openOver('renew-form', d.id),
  'renew-plus': (d) => { sheetEl.querySelector('[name=fin]').value = d.id; },
  'lock-mode': (d) => renderLock(d.id),
  'centrale-edit': () => openSheet('centrale-form'),

  async 'make-recovery'() {
    if (!navigator.onLine) return toast('Connexion requise', { bad: true });
    const k = await promptKey('Clé de secours', (vault.hasRecovery ? 'Une nouvelle clé de secours remplacera l’ancienne, qui ne fonctionnera plus. ' : '') + 'Saisissez votre clé d’accès actuelle pour continuer.');
    if (!k) return;
    if (!(await vault.verifyPassphrase(k))) return toast("Clé d'accès incorrecte", { bad: true });
    try {
      await recActivate();
      if (ui.route === 'reglages' || ui.route === 'dashboard') renderView();
    } catch (e) {
      toast(e.message || 'Erreur', { bad: true });
    }
  },

  'copy-recovery': async () => {
    try { await navigator.clipboard.writeText($('#rcode').textContent.trim()); toast('Clé copiée'); } catch { toast('Copie impossible : notez-la à la main', { bad: true }); }
  },

  'print-recovery': () => printDoc('Clé de secours', html`<h1>Clé de secours</h1><p class="pr-sub">À conserver en lieu sûr. En cas d'oubli de la clé d'accès : ${centralUrl(TENANT).replace(/^https?:\/\//, '')} → « Clé d'accès oubliée ? »</p><div style="font:700 26px/1.4 monospace;letter-spacing:.08em;border:2px solid #000;padding:24px;text-align:center;margin-top:24px">${ui.sheet && ui.sheet.preset}</div>`),
  'print-reckit': (d) => printDoc('Kit de récupération', html`<h1>🧩 Kit de récupération — moitié ${d.h || 'A'}</h1><p class="pr-sub">Centrale ${socName()} — à garder avec les documents de la société.</p><p>Moitié ${d.h || 'A'} de votre clé de secours :</p><div style="font-family:monospace;font-size:20pt;font-weight:700;letter-spacing:.06em;border:2px solid #333;border-radius:10px;padding:16px;text-align:center">${d.id}</div><h3>Clé d'accès oubliée ?</h3><ol><li>Ouvrez ${centralUrl(TENANT)} → « Clé d'accès oubliée ? ».</li><li>Écrivez la <b>moitié A</b> et la <b>moitié B</b> (gardées à deux endroits différents).</li><li>Choisissez une nouvelle clé d'accès : vos données sont à nouveau ouvertes.</li></ol><p class="tiny">Ne gardez jamais les deux moitiés au même endroit.</p>`),
  'print-imm': (d) => printDoc('Rapport immeuble', reportImmeuble(d.id, ui.year)),
  'print-log': (d) => printDoc('Rapport logement', reportLogement(d.id)),

  async 'print-global'() {
    const c = await choiceBox('Imprimer le rapport ' + ui.year, 'Le résumé tient sur une page. Le rapport complet ajoute le détail de chaque immeuble (loyers mois par mois, dépenses, occupants).', [{ value: 'short', label: 'Résumé' }, { value: 'full', label: 'Complet', cls: 'primary' }]);
    if (c) printDoc('Rapport ' + ui.year, reportGlobal(ui.year, c === 'full'));
  },

  'imm-filter': (d) => { ui.immFilter = d.id; renderView(); },
  'more-hist': () => { ui.histShown += 30; renderView(); },
  'set-lang': (d) => { if (d.id === LANG) return; setLang(d.id); location.reload(); },
  theme: (d) => { localStorage.setItem('aresTheme', d.id); applyTheme(); renderView(); },
  'change-key': () => openSheet('key-form'),
  print: () => { go('paiements'); setTimeout(() => print(), 300); },
  install: async () => { if (!installPrompt) return; installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; renderView(); },

  async 'reopen-imm'(d) {
    const im = vault.get('immeubles', d.id);
    if (!im || !(await confirmBox(`Réactiver « ${im.adresse} » ?`, { ok: 'Réactiver', detail: "L'immeuble revient dans « En gestion ». Les anciens locataires restent archivés. Vérifiez la fin du bail principal avec « Modifier »." }))) return;
    await vault.mutate((tx) => tx.put('immeubles', { id: im.id, finGestion: '', finNote: '' }), 'Immeuble réactivé', im.adresse, im.id);
    toast('Immeuble réactivé');
    openSheet('imm', im.id);
  },

  async 'del-imm'(d) {
    const im = vault.get('immeubles', d.id);
    const ls = vault.list('locataires').filter((l) => l.immId === d.id);
    if (!(await confirmBox(`Supprimer « ${im.adresse} » ?`, { ok: 'Supprimer', danger: true, detail: `Si l'immeuble n'est simplement plus à vous, utilisez plutôt « Fin de gestion » : il sera archivé et son historique restera dans les statistiques. Ici, tout sera effacé définitivement, y compris l'historique : ${plural(ls.length, 'locataire')}, logements, paiements, versements, dépenses et documents. Les statistiques de cet immeuble seront perdues.` }))) return;
    const docs = vault.list('documents').filter((doc) => ls.some((l) => l.id === doc.locId) || logsOf(d.id).some((g) => g.id === doc.logId));
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
    if (!(await confirmBox(`Supprimer « ${logLabel(g)} » ?`, { ok: 'Supprimer', danger: true }))) return;
    const photos = [...edlOf(d.id), ...edlOf(d.id, 'edl-out')];
    await vault.mutate((tx) => { tx.remove('logements', d.id); for (const ph of photos) tx.remove('documents', ph.id); }, 'Logement supprimé', g.nom, g.immId);
    for (const ph of photos) await vault.deleteFile(ph.id);
    openSheet('imm', g.immId);
  },

  async 'del-dep'(d) {
    const dep = vault.get('depenses', d.id);
    if (!(await confirmBox('Supprimer cette dépense ?', { ok: 'Supprimer', danger: true, detail: `${dep.desc} — ${money(dep.montant)}` }))) return;
    const t = dep.tacheId ? vault.get('taches', dep.tacheId) : null;
    await vault.mutate((tx) => { tx.remove('depenses', d.id); if (dep.docId) tx.remove('documents', dep.docId); if (t) tx.put('taches', { id: t.id, depId: '', depSkip: true }); }, 'Dépense supprimée', `${dep.desc} ${money(dep.montant)}`, dep.immId);
    if (dep.docId) vault.deleteFile(dep.docId).catch(() => {});
  },

  async 'open-doc'(d) {
    const doc = vault.get('documents', d.id);
    try {
      const bytes = await vault.readFile(d.id);
      const url = URL.createObjectURL(new Blob([bytes], { type: doc.mime || 'application/pdf' }));
      const dlg = document.createElement('dialog');
      dlg.className = 'pv';
      const img = /^image\//.test(doc.mime || '');
      setHtml(dlg, html`<div class="pv-bar"><b>${doc.label}</b><span class="tiny">${fmtDate(doc.date)}</span>
        <a class="btn sm" href="${url}" download="${doc.label + (doc.mime === 'application/pdf' ? '.pdf' : '')}">${icon('download')}</a>
        <button class="btn sm" type="button" data-pv-close="1">${icon('x')} Fermer</button></div>
        ${img ? html`<img src="${url}" alt="">` : /^video\//.test(doc.mime || '') ? html`<video src="${url}" controls playsinline style="max-width:100%;max-height:80vh;display:block;margin:auto;background:#000"></video>` : html`<iframe src="${url}" title="${doc.label}"></iframe>`}`);
      const done = () => { dlg.remove(); URL.revokeObjectURL(url); };
      dlg.addEventListener('click', (e) => { if (e.target.closest('[data-pv-close]')) dlg.close(); });
      dlg.addEventListener('close', done);
      document.body.append(dlg);
      dlg.showModal();
    } catch (e) {
      toast(e.message || 'Document indisponible', { bad: true });
    }
  },

  async 'del-edl'(d) {
    const doc = vault.get('documents', d.id);
    if (!doc || !(await confirmBox('Retirer cette photo ?', { ok: 'Retirer', danger: true, detail: `${EDL_ROOM[doc.room] ? EDL_ROOM[doc.room] + ' · ' : ''}photo du ${fmtDate(doc.date)}` }))) return;
    const g = vault.get('logements', doc.logId);
    await vault.mutate((tx) => tx.remove('documents', d.id), 'Photo état des lieux retirée', g ? g.nom + ' · ' + immName(g.immId) : '', doc.logId);
    await vault.deleteFile(d.id);
    dropEdlUrl(d.id);
    renderSheet();
  },

  async 'edl-out-clear'(d) {
    const outs = edlOf(d.id, 'edl-out'), g = vault.get('logements', d.id);
    if (!outs.length || !(await confirmBox(`Effacer les ${plural(outs.length, 'photo')} de sortie ?`, { ok: 'Effacer', danger: true, detail: 'Après contrôle ou remise à neuf. Vos photos d’entrée restent.' }))) return;
    await vault.mutate((tx) => { for (const ph of outs) tx.remove('documents', ph.id); }, 'Photos de sortie effacées', g ? g.nom + ' · ' + immName(g.immId) : '', d.id);
    for (const ph of outs) { await vault.deleteFile(ph.id).catch(() => {}); dropEdlUrl(ph.id); }
    renderSheet();
  },

  async 'open-edl-out'(d) {
    const outs = edlOf(d.id, 'edl-out').filter((x) => !x.seen);
    if (outs.length) await vault.mutate((tx) => { for (const ph of outs) tx.put('documents', { id: ph.id, seen: true }); }, 'Photos de sortie vues', logName(d.id), d.id);
    openSheet('log', d.id, 'edl');
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

  // 📦 portabilité : toutes les données du client, lisibles et réimportables (avec les documents)
  async 'my-data'() {
    if (!(await confirmBox('Récupérer toutes vos données ?', { ok: '📦 Télécharger', detail: 'Fichiers NON chiffrés (noms, adresses, paiements, documents) : gardez-les en lieu sûr. Le grand fichier se réimporte dans n’importe quelle centrale (Réglages → Importer).' }))) return;
    toast('Préparation…');
    const { u, ...st } = vault.state, files = {};
    let miss = 0;
    for (const d of vault.list('documents')) { try { files[d.id] = bytesUrl(await vault.readFile(d.id), d.mime); } catch { miss++; } }
    const at = today(), q = (v) => `"${csvSafe(v).replace(/"/g, '""')}"`, csv = (rows) => '﻿' + rows.map((r) => r.map(q).join(';')).join('\r\n');
    download(`mes_donnees_${at}.json`, JSON.stringify({ ...st, v: 2, files }), 'application/json');
    download(`locataires_${at}.csv`, csv([['Nom', 'Prénom', 'Immeuble', 'Logement', 'Entrée', 'Sortie', 'Loyer', 'Charges', 'Téléphone', 'Email'], ...vault.list('locataires').map((l) => [l.nom, l.prenom, immName(l.immId), logName(l.logId), l.debut, l.sortie, l.loyer, l.charges, l.tel, l.mail || l.email])]), 'text/csv;charset=utf-8');
    download(`paiements_${at}.csv`, csv([['Locataire', 'Année', 'Mois', 'Montant', 'Date', 'Mode'], ...vault.list('paiements').map((p) => { const l = vault.get('locataires', p.locId) || {}; return [fullName(l), p.y, p.m, p.montant ?? p.amount, p.date, p.mode]; })]), 'text/csv;charset=utf-8');
    toast(`📦 3 fichiers téléchargés · ${Object.keys(files).length} document(s)${miss ? ` · ${miss} illisible(s)` : ''}`);
  },

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
  }
};

const FORMS = {
  async radio(fd) {
    let url = String(fd.get('url') || '').trim(); if (url && !/^https?:\/\//i.test(url)) url = 'https://' + url;
    await vault.mutate((tx) => tx.put('reglages', { id: 'radio', nom: String(fd.get('nom') || '').trim().slice(0, 60), url: url.slice(0, 500) }), 'Radio de l’app des locataires', url);
    toast('Radio enregistrée'); scheduleEspaceSync();
  },

  async tache(fd) {
    const id = fd.get('id');
    const prev = id ? vault.get('taches', id) : null;
    const recur = fd.get('recur') || '';
    const rec = {
      type: fd.get('type'), titre: fd.get('titre').trim(), immId: fd.get('immId'), logId: fd.get('logId') || '',
      date: fd.get('date'), recur, fin: fd.get('fin') || '', cout: fd.get('cout') === '' ? null : num(fd.get('cout')), note: fd.get('note').trim(),
      statut: recur ? 'planifie' : fd.get('statut') || 'afaire',
    };
    try { const lj = fd.get('lieu'); if (lj && !rec.immId) rec.lieu = JSON.parse(lj); } catch { /* lieu illisible */ }
    const nl = { nom: String(fd.get('lieuNom') || '').trim(), adr: String(fd.get('lieuAdr') || '').trim(), contact: String(fd.get('lieuContact') || '').trim(), tel: String(fd.get('lieuTel') || '').trim() };
    if (!rec.immId && !rec.lieu && (nl.nom || nl.adr)) rec.lieu = nl;
    if (rec.lieu) { rec.lieu = { nom: String(rec.lieu.nom || '').slice(0, 120), adr: String(rec.lieu.adr || '').slice(0, 200), contact: String(rec.lieu.contact || '').slice(0, 80), tel: String(rec.lieu.tel || '').slice(0, 40) }; rec.immId = ''; rec.logId = ''; }
    else if (prev && prev.lieu && !rec.immId) rec.lieu = prev.lieu;
    const hh = (k) => (/^\d\d:\d\d$/.test(fd.get(k) || '') ? fd.get(k) : '');
    rec.heure = hh('heure'); rec.heureFin = rec.heure ? hh('heureFin') : ''; rec.urgent = fd.get('urgent') === '1';
    if (!rec.titre) return;
    if (!rec.immId && !rec.lieu) return toast('Choisissez le lieu', { bad: true });
    if (recur && !rec.date) return toast('Indiquez la date de la première fois', { bad: true });
    if (id) rec.id = id;
    if (!recur && rec.statut === 'fait' && !(prev && prev.statut === 'fait')) rec.doneDate = today();
    const saved = await vault.mutate((tx) => tx.put('taches', rec), id ? 'Intervention modifiée' : 'Intervention ajoutée', `${rec.titre} — ${placeName(rec)}`, rec.immId);
    toast(id ? 'Intervention enregistrée' : 'Intervention ajoutée');
    if (!recur && !saved.lieu) await syncDepense(saved);
    // photos jointes à l'intervention (6 au plus)
    const pics = [];
    for (const f of fd.getAll('pbphotos').filter((f) => f && f.size)) pics.push(await compressPhoto(f));
    if (pics.length) {
      const nb = vault.list('documents').filter((x) => x.tacheId === saved.id).length, docs = [];
      await vault.mutate((tx) => pics.slice(0, Math.max(0, 6 - nb)).forEach((b, n) => docs.push([tx.put('documents', { tacheId: saved.id, kind: 'tache', label: `Photo ${nb + n + 1} — ${saved.titre}`, date: today(), mime: 'image/jpeg', size: b.length }).id, b])), 'Photos ajoutées', saved.titre, saved.immId);
      for (const [did, b] of docs) await vault.saveFile(did, b);
    }
    goBack();
  },

  async door(fd) {
    const g = vault.get('logements', fd.get('id'));
    const code = String(fd.get('code') || '').trim();
    if (!g || !/^[0-9A-Za-z#*]{3,16}$/.test(code)) return toast('Code invalide (3 à 16 chiffres ou lettres)', { bad: true });
    const pt = g.porte || {};
    const h = { d: today(), code, raison: fd.get('raison'), note: String(fd.get('note') || '').trim() };
    await vault.mutate((tx) => tx.put('logements', { id: g.id, porte: { code, maj: today(), off: false, fin: /^\d{4}-\d{2}-\d{2}$/.test(fd.get('fin') || '') ? fd.get('fin') : '', serrure: String(fd.get('serrure') || '').trim(), info: String(fd.get('info') || '').trim(), hist: [...(pt.hist || []), h].slice(-30) } }), 'Code de porte changé', `${g.nom} (${immName(g.immId)}) — ${h.raison}`, g.immId);
    toast('Code enregistré');
    goBack();
  },

  async avis(fd) {
    const id = fd.get('id');
    const rec = { immId: fd.get('immId') || '', texte: fd.get('texte').trim(), debut: fd.get('debut') || '', fin: fd.get('fin') || '' };
    if (!rec.texte) return;
    if (id) rec.id = id;
    await vault.mutate((tx) => tx.put('avis', rec), id ? 'Avis modifié' : 'Avis publié', `${rec.immId ? immName(rec.immId) : 'Tous les immeubles'} — ${rec.texte.slice(0, 60)}`, rec.immId);
    toast('Avis enregistré');
    goBack();
  },

  async icsall(fd) {
    const st = ui.icsAll;
    if (!st || !st.groups) return;
    const im = vault.get('immeubles', st.immId);
    const chosen = st.groups.filter((g) => fd.get('use_' + g.cat));
    if (!chosen.length) return toast('Cochez au moins un type de déchets', { bad: true });
    const common = { sortie: fd.get('sortie') || 'veille', heure: String(fd.get('heure') || '').trim(), lieu: fd.get('lieu') };
    const url = String(st.url || '').replace(/^webcals?:\/\//i, 'https://');
    await vault.mutate((tx) => {
      for (const g of chosen) {
        const old = vault.list('collectes').find((c) => c.immId === im.id && c.cat === g.cat);
        tx.put('collectes', { ...(old ? { id: old.id, note: old.note } : { note: '' }), immId: im.id, cat: g.cat, mode: 'dates', dates: g.dates, dnames: g.dnames || {}, icsUrl: url, icsAt: today(), icsErr: '', ...common });
      }
    }, 'Calendrier de la commune importé', `${im.adresse} — ${chosen.map((g) => DECHETS[g.cat].short + ' (' + g.dates.length + ')').join(', ')}`, im.id);
    ui.icsAll = null;
    toast(`${plural(chosen.length, 'collecte')} enregistrée${chosen.length > 1 ? 's' : ''}${url ? ' · mise à jour automatique' : ''}`);
    publishPub(im.id);
    goBack();
  },

  async collecte(fd) {
    const id = fd.get('id');
    const mode = fd.get('mode');
    const rec = { immId: fd.get('immId'), cat: fd.get('cat'), mode, jour: +fd.get('jour'), debut: fd.get('debut') || '', lieu: fd.get('lieu'), sortie: fd.get('sortie') || 'veille', heure: String(fd.get('heure') || '').trim(), note: fd.get('note').trim() };
    if (mode === 'dates') {
      rec.icsUrl = String(fd.get('icsUrl') || '').trim().replace(/^webcals?:\/\//i, 'https://');
      if (rec.icsUrl && !/^https:\/\/\S+$/i.test(rec.icsUrl)) return toast('Le lien doit commencer par https:// ou webcal://', { bad: true });
      rec.dates = parseDates(fd.get('dates'), new Date().getFullYear());
      if (rec.icsUrl && !rec.dates.length) {
        try {
          toast('Lecture du calendrier de la commune…');
          const txt = await vault.fetchIcs(rec.icsUrl);
          rec.dates = parseDates(txt, new Date().getFullYear(), rec.cat);
          rec.dnames = icsNames(txt, rec.cat);
          rec.icsAt = today(); rec.icsErr = '';
        } catch (e) { return toast(e.message || 'Calendrier indisponible', { bad: true }); }
      }
      if (!rec.dates.length) return toast(rec.icsUrl ? `Le calendrier de la commune ne contient aucune date pour « ${DECHETS[rec.cat].short} »` : 'Aucune date reconnue (ex. 07/01, 21/01…)', { bad: true });
    } else rec.icsUrl = '';
    if (mode === '2sem' && !rec.debut) return toast('Indiquez le premier passage', { bad: true });
    if (id) rec.id = id;
    await vault.mutate((tx) => tx.put('collectes', rec), id ? 'Collecte modifiée' : 'Collecte ajoutée', `${DECHETS[rec.cat].short} — ${immName(rec.immId)}`, rec.immId);
    toast(mode === 'dates' ? `${plural(rec.dates.length, 'date')} enregistrée${rec.dates.length > 1 ? 's' : ''}` : 'Collecte enregistrée');
    publishPub(rec.immId);
    goBack();
  },

  unlock: onUnlock,
  setup: onSetup,
  recover: onRecover,
  newkey: onNewKey,

  async imm(fd) {
    const id = fd.get('id');
    const rec = {
      adresse: fd.get('adresse').trim(), ville: String(fd.get('ville') || '').trim(), pays: WORLD.includes(String(fd.get('pays') || '')) ? String(fd.get('pays')) : societe().pays || 'LU', type: fd.get('type') || 'immeuble', proprietaire: fd.get('proprietaire').trim(), loyer: num(fd.get('loyer')), charges: num(fd.get('charges')),
      bailDebut: fd.get('bailDebut'), bailFin: fd.get('bailFin'), bailRev: fd.get('bailRev') || '', preavis: fd.get('preavis') === '' ? '' : Math.max(0, Math.min(24, num(fd.get('preavis')))), bailDec: String(fd.get('bailDec') || ''), note: fd.get('note').trim(),
    };
    { const g = geoIn({ la: fd.get('geoLa'), lo: fd.get('geoLo') }); const old = id ? (vault.get('immeubles', id) || {}).geo : null; if (g && fd.get('geoLa') !== '' && (!Array.isArray(old) || old[0] !== g.la || old[1] !== g.lo)) { rec.geo = [g.la, g.lo]; rec.geoSrc = fd.get('geoSrc') || 'osm'; } }
    if (id) rec.id = id;
    const saved = await vault.mutate((tx) => tx.put('immeubles', rec), id ? 'Immeuble modifié' : 'Immeuble ajouté', rec.adresse);
    toast(id ? 'Immeuble enregistré' : 'Immeuble ajouté');
    if (saved.pubToken) publishPub(saved.id);
    openSheet('imm', saved.id);
  },

  async coloc(fd) {
    const immId = fd.get('immId'), nom = String(fd.get('nom') || '').trim(), n = Math.max(2, Math.min(10, +fd.get('n') || 2));
    if (!nom) return;
    if (colocsOf(immId).some((c) => c.nom.toLowerCase() === nom.toLowerCase())) return toast('Cet appartement existe déjà dans cette structure', { bad: true });
    const etage = String(fd.get('etage') || '').trim(), loyer = num(fd.get('loyer'));
    const mans = fd.get('mans') === 'on';
    const annex = Object.fromEntries([['cave', fd.get('cave') === 'on' ? 1 : ''], ['garage', fd.get('garage') || '']].filter(([, v]) => v));
    await vault.mutate((tx) => {
      const surface = num(fd.get('surface')) || '';
      for (let i = 1; i <= n; i++) tx.put('logements', { nom: 'Chambre ' + i, immId, type: 'chambre', etage, partie: nom, loyer, surface, note: '', annex });
      if (mans) tx.put('logements', { nom: 'Mansarde', immId, type: 'chambre', etage: 'combles', partie: nom, loyer, surface: '', note: '', annex });
    }, 'Appartement en colocation ajouté', `${nom} · ${n} chambres${mans ? ' + mansarde' : ''} (${immName(immId)})`, immId);
    toast(`${nom} : ${n + (mans ? 1 : 0)} chambres créées`);
    goBack();
  },

  async log(fd) {
    const id = fd.get('id');
    const rec = {
      nom: fd.get('nom').trim(), immId: fd.get('immId'), type: fd.get('type'), surface: fd.get('surface') ? num(fd.get('surface')) : '',
      etage: fd.get('etage').trim(), partie: fd.get('louemode') === 'chambre' ? (fd.get('partieSel') === '__new' || !fd.get('partieSel') ? String(fd.get('partieNew') || '').trim() : fd.get('partieSel')) : '', loyer: num(fd.get('loyer')), note: fd.get('note').trim(),
      ch: LOG_ROOMS.includes(fd.get('type')) ? +fd.get('ch') || '' : '', mans: false, maison: fd.get('type') === 'maison' ? fd.get('maison') || '' : '',
      annex: Object.fromEntries(Object.keys(ANNEX).map((k) => [k, ANNEX_OPT[k] ? fd.get('ax_' + k) || '' : fd.get('ax_' + k) === 'on' ? 1 : '']).filter(([, v]) => v)),
      park: PARK_TYPES.includes(fd.get('type')) ? { taille: PARK_SIZE[fd.get('pk_taille')] ? fd.get('pk_taille') : '', genre: PARK_KIND[fd.get('pk_genre')] ? fd.get('pk_genre') : '', h: fd.get('pk_h') ? num(fd.get('pk_h')) : '' } : null,
    };
    if (fd.get('louemode') === 'chambre' && !rec.partie) return toast('Indiquez dans quel appartement se trouve la chambre (ou choisissez « Entier »)', { bad: true });
    rec.annexM2 = Object.fromEntries(Object.keys(rec.annex).map((k) => [k, num(fd.get('m2_' + k))]).filter(([, v]) => v > 0));
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
    rec.photo = photoOk(String(fd.get('photo') || '')) ? String(fd.get('photo')) : '';
    if (id) {
      rec.sortie = fd.get('sortie') || '';
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

  async endimm(fd) {
    const im = vault.get('immeubles', fd.get('id'));
    if (!im) return;
    const fin = fd.get('fin');
    const note = fd.get('note').trim();
    const cur = tenantsOfImm(im.id).filter((l) => (!l.sortie || l.sortie > fin) && (!l.debut || l.debut <= fin));
    await vault.mutate((tx) => {
      tx.put('immeubles', { id: im.id, finGestion: fin, finNote: note, bailFin: im.bailFin && im.bailFin < fin ? im.bailFin : fin });
      for (const l of cur) tx.put('locataires', { id: l.id, sortie: fin, sortieNote: [l.sortieNote, "Fin de gestion de l'immeuble"].filter(Boolean).join(' · ') });
    }, 'Fin de gestion', `${im.adresse} — ${fmtDate(fin)}${cur.length ? ' · ' + plural(cur.length, 'locataire') + ' archivé' + (cur.length > 1 ? 's' : '') : ''}${note ? ' · ' + note : ''}`, im.id);
    toast('Immeuble archivé · historique conservé');
    openSheet('imm', im.id);
  },

  async replace(fd) {
    const old = vault.get('locataires', fd.get('id'));
    if (!old) return;
    const sortie = fd.get('sortie');
    const where = logName(old.logId) || immName(old.immId);
    const upd = { id: old.id, sortie, sortieNote: fd.get('sortieNote').trim() };
    const nu = fd.get('vacant') ? null : { ...tenantFromForm(fd, 'n_'), id: uid(), immId: old.immId, logId: old.logId || '' };
    if (nu && nu.debut && nu.debut <= sortie && !(await confirmBox('Dates qui se chevauchent', { ok: 'Continuer', detail: `Le nouveau locataire entre le ${fmtDate(nu.debut)}, avant ou le jour de la sortie de ${fullName(old)} (${fmtDate(sortie)}).` }))) return;
    await vault.mutate((tx) => {
      tx.put('locataires', upd);
      if (nu) tx.put('locataires', nu);
    }, nu ? 'Locataire remplacé' : 'Départ enregistré', nu ? `${fullName(old)} → ${fullName(nu)} (${where}), sortie le ${fmtDate(sortie)}` : `${fullName(old)} quitte ${where} le ${fmtDate(sortie)}`, old.id);
    toast(nu ? `${fullName(nu)} enregistré · ${fullName(old)} archivé` : 'Départ enregistré · logement vacant');
    if (old.logId) openSheet('log', old.logId); else openSheet('loc', nu ? nu.id : old.id);
  },

  async pay(fd) {
    const locId = fd.get('locId'), y = +fd.get('y'), m = +fd.get('m');
    const l = vault.get('locataires', locId);
    const k = payKey(locId, y, m);
    const montant = num(fd.get('montant'));
    const rec = { id: k, locId, y, m, montant, date: fd.get('date'), mode: fd.get('mode'), note: fd.get('note').trim() };
    const due = dueAmount(l, y, m) || loyerAt(l, y, m);
    await vault.mutate((tx) => (montant > 0 ? tx.put('paiements', rec) : tx.remove('paiements', k)),
      montant <= 0 ? 'Paiement annulé' : montant < due ? 'Paiement partiel' : 'Paiement modifié',
      `${fullName(l)} — ${MONTHS_FULL[m - 1]} ${y} · ${money(montant)}${montant < due ? ' sur ' + money(due) : ''}`, locId);
    toast(montant <= 0 ? 'Paiement annulé' : montant < due ? `Paiement partiel · reste ${money(due - montant)}` : 'Paiement enregistré');
    goBack();
  },

  async societe(fd, form) {
    const associes = [];
    for (let i = 0; i < 12; i++) {
      if (!fd.has('an' + i)) break;
      const nom = fd.get('an' + i).trim(), part = num(fd.get('ap' + i));
      if (nom || part) associes.push({ nom, part });
    }
    const total = sum(associes, (a) => a.part);
    if (associes.length && Math.abs(total - 100) > 0.01) return (form.querySelector('.lock-err').textContent = `Le total des parts fait ${total} % au lieu de 100 %.`);
    const g = (k) => String(fd.get(k) || '').trim();
    const pay = { paypal: g('paypal').replace(/^(https?:\/\/)?(www\.)?paypal\.(me|com\/paypalme)\//i, '').replace(/\/.*$/, ''), cardLink: g('cardLink'), btc: g('btc'), eth: g('eth'), usdt: g('usdt'), usdtNet: g('usdtNet') || 'erc20', usdc: g('usdc'), usdcNet: g('usdcNet') || 'erc20' };
    const nomS = g('nom');
    const idErr = WRONG_ID.test([nomS, g('rcs'), g('tvaNum')].join(' ')) ? 'Ces apps appartiennent à NOBIS s.a.r.l. (RCS B225665, TVA LU30599412) : Ares Invest S.A. / B225245 ne peut pas être mis ici.'
      : /\b(RCS|TVA|B\d{5,6}|LU\d{8})\b/i.test(nomS) ? 'Le nom de la société ne doit contenir que le nom (ex. NOBIS s.a.r.l.) : mettez le RCS et le n° TVA dans leurs cases.'
      : g('rcs') && !/^[A-Z]\s?\d{3,7}$/i.test(g('rcs')) ? 'RCS invalide (ex. B225665).'
      : g('tvaNum') && !/^[A-Z]{2}[0-9A-Z]{8,12}$/i.test(g('tvaNum').replace(/\s/g, '')) ? 'N° TVA invalide (ex. LU30599412).'
      : g('iban') && (WRONG_ID.test(g('iban')) || !ibanOk(g('iban'))) ? 'IBAN invalide : vérifiez-le (ex. LU28 0099 7800 0139 1929). Un n° de TVA n’est pas un IBAN.'
      : g('bic') && !/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/i.test(g('bic').replace(/\s/g, '')) ? 'BIC invalide (ex. CCRALULLXXX).' : '';
    if (idErr) return (form.querySelector('.lock-err').textContent = idErr);
    const err = (pay.paypal && !/^[A-Za-z0-9]{1,30}$/.test(pay.paypal) ? 'PayPal.me : seulement le nom (lettres et chiffres)' : '')
      || (pay.cardLink && !/^https:\/\/\S+$/.test(pay.cardLink) ? 'Le lien de paiement par carte doit commencer par https://' : '')
      || (/^[a-z]+( [a-z]+){11,23}$/i.test([pay.btc, pay.eth, pay.usdt, pay.usdc].join(' ').trim()) ? 'Ceci ressemble à des mots de récupération : ne les mettez JAMAIS ici !' : '')
      || [['btc', 'BTC'], ['eth', 'ETH'], ['usdt', 'USDT'], ['usdc', 'USDC']].map(([k, n]) => { const m = badAddr(k, pay[k], pay[k + 'Net']); return m ? `${n} : ${m}` : ''; }).find(Boolean) || '';
    if (err) return (form.querySelector('.lock-err').textContent = err);
    const rec = { id: 'main', nom: fd.get('nom').trim(), adresse: fd.get('adresse').trim(), ville: fd.get('ville').trim(), tel: fd.get('tel').trim(), email: fd.get('email').trim(), iban: fd.get('iban').trim(), ...pay, associes,
      bic: g('bic').replace(/\s/g, '').toUpperCase(), banque: g('banque'),
      pays: g('pays') || 'LU', toutCompris: fd.get('toutCompris') === '1', web: g('web'), rcs: g('rcs'), tvaNum: g('tvaNum'), assujetti: g('assujetti') !== '0', periode: g('periode') || 't', taux: g('taux') };
    await vault.mutate((tx) => tx.put('reglages', rec), 'Société & associés modifiés', rec.nom);
    applyBrand();
    toast('Enregistré');
    closeSheet();
  },

  async frais(fd, form) {
    const rec = { libelle: fd.get('libelle').trim(), montant: num(fd.get('montant')), cat: fd.get('cat'), debut: fd.get('debut'), fin: fd.get('fin') };
    if (!rec.libelle || !rec.montant) return;
    await vault.mutate((tx) => tx.put('frais', rec), 'Frais fixe ajouté', `${rec.libelle} ${money(rec.montant)}/mois`);
    form.reset();
    toast('Frais ajouté');
  },

  async index(fd) {
    const l = vault.get('locataires', fd.get('id'));
    const loyer = num(fd.get('loyer'));
    const from = fd.get('from');
    if (!loyer || loyer === l.loyer) return toast('Indiquez un nouveau loyer différent', { bad: true });
    const hist = [...(l.loyerHist || []).filter((h) => h.from !== from), { from, loyer, prev: loyerAt(l, +from.slice(0, 4), +from.slice(5, 7)) }];
    await vault.mutate((tx) => tx.put('locataires', { id: l.id, loyer, loyerHist: hist, revision: fd.get('next') || '' }),
      'Loyer révisé', `${fullName(l)} : ${money(l.loyer)} → ${money(loyer)} à partir du ${fmtDate(from)}`, l.id);
    toast('Loyer révisé');
    goBack();
  },

  async renew(fd) {
    const l = vault.get('locataires', fd.get('id'));
    const fin = fd.get('fin');
    await vault.mutate((tx) => tx.put('locataires', { id: l.id, fin }), 'Contrat prolongé', `${fullName(l)} : fin ${fin ? 'le ' + fmtDate(fin) : 'indéterminée'}`, l.id);
    toast('Contrat prolongé');
    goBack();
  },

  async notes(fd) {
    const l = vault.get('locataires', fd.get('id'));
    await vault.mutate((tx) => tx.put('locataires', { id: l.id, notes: fd.get('notes') }), 'Notes modifiées', fullName(l), l.id);
    toast('Notes enregistrées');
  },

  async dep(fd, form) {
    const rec = { immId: fd.get('immId'), logId: fd.get('logId') || '', desc: fd.get('desc').trim(), montant: num(fd.get('montant')), date: fd.get('date'), cat: fd.get('cat'),
      tva: parseFloat(fd.get('tva')) || 0, fournisseur: String(fd.get('fournisseur') || '').trim(), numFacture: String(fd.get('numFacture') || '').trim() };
    if (!rec.desc || !rec.montant) return;
    const file = fd.get('file');
    const d = await vault.mutate((tx) => tx.put('depenses', rec), 'Dépense ajoutée', `${rec.desc} ${money(rec.montant)}`, rec.immId);
    if (file && file.size) await attachFacture(d, file);
    form.reset();
    toast('Dépense ajoutée');
  },

  async chatpost(fd, form) {
    const im = vault.get('immeubles', fd.get('imm'));
    const g = im && (im.chats || {})[fd.get('gk')];
    const x = String(fd.get('x') || '').trim().slice(0, 1500);
    if (!g || !x) return;
    setBusy(form, true, 'Envoi…');
    try {
      const to = String(fd.get('to') || '');
      ui.chatTo = { ...(ui.chatTo || {}), [g.id]: to };
      const l = to && g.members.includes(to) ? vault.get('locataires', to) : null, k = vault.get('reglages', 'signal');
      const msg = { id: newMsgId(), a: brandName(), m: 'mgr', t: new Date().toISOString() };
      if (to) {
        // réponse privée : scellée pour l'habitant (clé de son espace) et pour vous ; notification à lui seul
        if (!l || !l.espace || !l.espace.key || !k || !k.pub) throw new Error('Message privé impossible : l’app de cet habitant n’est pas active.');
        await vault.boardPost(g.id, await sealJson(g.key, { ...msg, p: l.id, o: b64u(await sealForOwner(k.pub, { x })), e: b64u(await sealJson(l.espace.key, { x })) }), l.espace.id);
      } else await vault.boardPost(g.id, await sealJson(g.key, { ...msg, x }));
      form.x.value = '';
      if (ui.drafts) delete ui.drafts['h:' + g.id];
      await chatLoad(im.id, true);
    } catch (e) {
      setBusy(form, false);
      toast(e.message || 'Envoi impossible', { bad: true });
    }
  },

  async annsend(fd, form) {
    const x0 = String(fd.get('x') || '').trim().slice(0, 1480), loc = String(fd.get('loc') || '');
    if (!x0) return;
    if (!loc) return toast('Choisissez au moins un destinataire', { bad: true });
    const x = '📣 ' + x0, at = new Date().toISOString(), done = [];
    setBusy(form, true, 'Envoi…');
    try {
      if (loc) {
        const gs = [];
        for (const im of vault.list('immeubles').filter((z) => !immGone(z) && !z.xfer)) for (const g of Object.values(im.chats || {})) if (loc === 'all' || loc === 'i:' + im.id || loc === 'g:' + g.id) gs.push(g);
        for (const g of gs) await vault.boardPost(g.id, await sealJson(g.key, { id: newMsgId(), a: brandName(), m: 'mgr', x, t: at, an: 1 }));
        done.push(`🏠 ${plural(gs.length, 'fil')}`);
      }
      const log = [...annLog(), { at, x: x0, to: done.join(' · '), by: whoLabel() || '⭐ Directeur' }].slice(-100);
      await vault.mutate((tx) => tx.put('reglages', { id: 'annLog', list: log }), '📣 Annonce envoyée', done.join(' · '));
      closeSheet();
      toast('📣 Annonce envoyée : ' + done.join(' · '));
      for (const im of vault.list('immeubles')) if ((ui.chatAt || {})[im.id]) chatLoad(im.id, true);
    } catch (e) { setBusy(form, false); toast(e.message || 'Envoi impossible (connexion ?)', { bad: true }); }
  },

  async 'tpay-conf'(fd) {
    const g = (k) => String(fd.get(k) || '').trim(), payMode = fd.get('payMode') === 'month' ? 'month' : 'each';
    try { await tenantSend({ type: 'conf', payMode }); } catch (e) { return toast(e.message || 'Envoi impossible (connexion ?)', { bad: true }); }
    await vault.mutate((tx) => tx.put('reglages', { id: 'tpayConf', payMode, iban: g('iban').toUpperCase(), lien: g('lien') }), '💳 Paiements', payMode === 'month' ? 'facture mensuelle' : 'chaque intervention');
    toast('Enregistré'); goBack();
  },

  async regles(fd) {
    const id = fd.get('id');
    await vault.mutate((tx) => tx.put('immeubles', { id, regles: String(fd.get('regles') || '').trim().slice(0, 4000) }), 'Règles de l’immeuble modifiées', immName(id), id);
    toast('Règles enregistrées · visibles dans l’app des locataires');
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
      const dtype = fd.get('dtype') || 'autre';
      const label = String(fd.get('label') || '').trim() || (DOC_TYPES[dtype] || 'Document').replace(/ \(.*\)$/, '');
      const doc = await vault.mutate((tx) => tx.put('documents', { locId, dtype, label, pay: fd.get('pay') || '', date: today(), size: file.size, mime: file.type || 'application/octet-stream' }), 'Document ajouté', `${label} → ${fullName(l)}`, locId);
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
  }
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
// réservé au responsable (clé principale) ; le comptable n'affecte pas les travaux
const RESP_ONLY = new Set(['brand-reset', 'xfer-do', 'xfer-arch', 'angar', 'pack-del', 'change-key', 'make-recovery', 'wipe-all', 'arch-start', 'arch-do', 'net-del', 'net-reset', 'test-clean', 'test-clean-do']);
const DEL_ACTION = /^del-|-del$|wipe/; // toute suppression
const NO_COMPTA = new Set(['eq-swap', 'eq-swap-do', 'interv-aff', 'aff-pick', 'ger-to-mt', 'ger-aff', 'interv-job', 'op-del', 'op-new']);
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el || !ACTIONS[el.dataset.action]) return;
  e.preventDefault();
  if (vault.op && RESP_ONLY.has(el.dataset.action)) return toast('Réservé au directeur (clé d’accès principale)', { bad: true });
  if (isCompta() && DEL_ACTION.test(el.dataset.action)) return toast('Le comptable ne supprime rien : voyez avec le directeur ou le centraliste', { bad: true });
  if (isCompta() && NO_COMPTA.has(el.dataset.action)) return toast(['op-del', 'op-new'].includes(el.dataset.action) ? 'Le comptable ne gère pas les accès' : 'Le comptable n’affecte pas les travaux (directeur ou centraliste)', { bad: true });
  ACTIONS[el.dataset.action](el.dataset, el, e);
});
document.addEventListener('submit', (e) => {
  const f = e.target;
  if (!FORMS[f.dataset.form]) return;
  e.preventDefault();
  // un seul envoi à la fois : un double clic (ou Entrée + clic) ne crée pas deux demandes, deux paiements…
  if (f.dataset.busy) return;
  f.dataset.busy = '1';
  const subs = [...f.querySelectorAll('button[type=submit]'), ...(f.id ? document.querySelectorAll(`button[type=submit][form="${f.id}"]`) : [])].filter((b) => !b.disabled);
  subs.forEach((b) => { b.disabled = true; });
  const done = () => { delete f.dataset.busy; subs.forEach((b) => { b.disabled = false; }); };
  if (sheetEl.contains(f)) sheetDirty = false;
  let r;
  try { r = FORMS[f.dataset.form](new FormData(f), f); } catch (err) { done(); throw err; }
  Promise.resolve(r).finally(done);
});
// Filtre de la liste « App des locataires » : recherche + avec / sans accès, sans recharger la fenêtre
function filterEspList() {
  const q = (sheetEl.querySelector('[data-input=esp-search]')?.value || '').toLowerCase().trim();
  const f = sheetEl.querySelector('[data-action=esp-filter][aria-pressed=true]')?.dataset.id || '';
  let n = 0;
  sheetEl.querySelectorAll('[data-q]').forEach((r) => { const ok = (!q || q.split(/\s+/).every((w) => r.dataset.q.includes(w))) && (!f || r.dataset.on === f); r.hidden = !ok; if (ok) n++; });
  const c = sheetEl.querySelector('#espCount');
  if (c) c.textContent = q || f ? `${n} résultat${n > 1 ? 's' : ''}` : '';
}
document.addEventListener('pointerdown', (e) => {
  const inp = e.target.closest && e.target.closest('.hor-row input[type=time]');
  if (!inp || inp.value) return;
  inp.closest('.tph') && inp.closest('.tph').classList.add('v');
  const row = inp.closest('.hor-row'), p = row.dataset.p, isEnd = /a$/.test(inp.name);
  const plus1 = (t) => { const m = Math.min(23 * 60 + 59, Math.round(((hm(t) || 0) + 1) * 60)); return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
  if (isEnd) { const de = row.querySelector('input[name$="d"]').value; inp.value = plus1(de || HOR_START[p]); return; }
  let prev = row.previousElementSibling;
  while (prev && !(prev.dataset.p === p && prev.querySelector('input[name$="a"]').value)) prev = prev.dataset.p === p ? prev.previousElementSibling : null;
  inp.value = prev ? prev.querySelector('input[name$="a"]').value : HOR_START[p];
}, true);

document.addEventListener('change', (e) => {
  const k = e.target.dataset.input;
  if (k === 'tva-on') { const m = e.target.form && e.target.form.querySelector('.tva-mention'); if (m) m.hidden = e.target.checked; }
  if (e.target.form && e.target.form.dataset.form === 'tdem' && e.target.name === 'kind') { const rs = e.target.form.querySelector('.reg-set'); if (rs) rs.hidden = e.target.value !== 'reg'; }
  if (e.target.form && e.target.form.dataset.form === 'log' && e.target.name === 'louemode') { const cp = e.target.form.querySelector('.coloc-pick'); if (cp) cp.hidden = e.target.value !== 'chambre'; }
  if (e.target.form && e.target.form.dataset.form === 'log' && e.target.name === 'partieSel') { const cn = e.target.form.querySelector('.coloc-new'); if (cn) cn.hidden = e.target.value !== '__new'; }
  if (e.target.name === 'type' && e.target.form && e.target.form.dataset.form === 'log') { const ps = e.target.form.querySelector('.park-set'); if (ps) ps.hidden = !PARK_TYPES.includes(e.target.value); }
  if (k === 'lg-pick') { const d = e.target.closest('details'), box = d && d.querySelector('.lgchips'); if (box) setHtml(box, lgChips([...d.querySelectorAll('input[name=langues]:checked')].map((x) => x.value))); }
  if (k === 'tfwd-acc') { const b = document.getElementById('tfwdAcc'); if (b) b.hidden = !e.target.checked; }
  // fiche d'une personne : horaire seulement pour le personnel régulier ; engagement pour occasionnels et sociétés
  if (k === 'photo-pick' && e.target.files[0]) {
    const box = e.target.closest('.photo-pick'), f = e.target.files[0]; e.target.value = '';
    import('./photo-crop.js').then((m) => m.cropPhoto(f, getLang())).then((u) => { if (!u) return; box.querySelector('[name=photo]').value = u; setHtml(box.querySelector('.pp-circle'), html`<img src="${u}" alt="">`); sheetDirty = true; }).catch(() => toast('Photo illisible', { bad: true }));
  }
  if (k === 'interv-kind') {
    const f = e.target.form, g = f.genre.value, c = f.cat.value;
    const hw = f.querySelector('.hor-wrap'); if (hw) hw.hidden = !horFixed({ genre: g, cat: c, metier: f.metier.value });
    const ew = f.querySelector('.eng-wrap'); if (ew) ew.hidden = g === 'interne';
    f.querySelectorAll('.eng-occ').forEach((x) => { x.hidden = g !== 'prive'; });
    f.querySelectorAll('.soc-only').forEach((x) => { x.hidden = g !== 'societe'; });
  }
  if (k === 'bank-chk') { if (e.target.name === 'iban') e.target.value = ibanFmt(e.target.value); bankMsgs(e.target.form); }
  // semaine choisie (date du téléphone par défaut) : les jours affichent leur date
  if (k === 'hor-wk' && /^\d{4}-\d{2}-\d{2}$/.test(e.target.value)) {
    const mon = mondayOf(e.target.value);
    e.target.form.querySelectorAll('.hor-blk > summary > b').forEach((b, j) => { b.textContent = `${SEMAINE[j]} ${frD(addDays(mon, j))}`; });
  }
  if (k === 'year') { ui.year = +e.target.value; ui.cpLim = 10; renderView(); }
  if (k === 'dep-file' && e.target.files[0]) { const dep = vault.get('depenses', e.target.dataset.id); if (dep) attachFacture(dep, e.target.files[0]); }
  if (k === 'soc-color' && /^#[0-9a-f]{6}$/i.test(e.target.value)) { vault.mutate((tx) => tx.put('reglages', { id: 'main', color: e.target.value }), 'Couleur de la société', socName()).then(() => { applyBrand(); toast('Couleur enregistrée'); }); return; }
  if (k === 'soc-logo' && e.target.files[0]) { setLogo(e.target.files[0]).then(() => {
    renderShell();go(ui.route, true);
  }); e.target.value = ''; }
  if (k === 'brand-ico' && e.target.files[0] && false && !vault.op) { brandSet(e.target.files[0]); e.target.value = ''; }

  if (k === 'soc-sign' && e.target.files[0]) setLogo(e.target.files[0], 'signature');
  if (k === 'soc-sign-w') vault.mutate((tx) => tx.put('reglages', { id: 'main', signW: [6, 8, 10, 12].includes(+e.target.value) ? +e.target.value : 8 }), 'Taille de la signature', `${e.target.value} cm`).then(signRefresh);
  if (k === 'cp-per') { ui.cpPer = e.target.value; ui.cpLim = 10; renderView(); }
  if (k === 'cp-from' || k === 'cp-to') { ui[k === 'cp-from' ? 'cpFrom' : 'cpTo'] = e.target.value; ui.cpLim = 10; renderView(); }
  if (k === 'tva-loyer-off') { const im = vault.get('immeubles', e.target.dataset.id); if (im) vault.mutate((tx) => tx.put('immeubles', { id: im.id, tvaLoyer: parseFloat(e.target.value) || 0 }), 'TVA sur les loyers', `${im.adresse} : ${e.target.value || 0} %`, im.id); }
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
  // « 🕓 Compléter plus tard » : IBAN / BIC / banque ne sont plus obligatoires
  if (k === 'bank-later') e.target.form.querySelectorAll('[data-bank]').forEach((x) => { x.required = !e.target.checked; });
  // 📊 Rapports : filtres, cases à cocher, colonnes
  if (k === 'rpt-set') {
    const c = rptCfg(), box = e.target.closest('.rpt-pick'), cbs = [...box.querySelectorAll('[data-input=rpt-set]')], on = cbs.filter((x) => x.checked).map((x) => x.value);
    c[e.target.dataset.k] = on.length === cbs.length ? null : on; ui.rptOpen = e.target.dataset.k; renderView();
  }
  if (k === 'rpt' || k === 'rpt-arr' || k === 'rpt-col') {
    const c = rptCfg(), t = e.target, key = t.dataset.k;
    if (k === 'rpt') c[key] = t.value;
    else if (k === 'rpt-col') { const all = RPT_SRC[c.src][1].map(([x]) => x); c.cols[c.src] = all.filter((x) => document.querySelector(`[data-input=rpt-col][value="${x}"]`)?.checked); }
    else if (key === 'withMail' || key === 'withTel') c[key] = t.checked;
    else c[key] = t.checked ? [...new Set([...c[key], t.value])] : c[key].filter((x) => x !== t.value);
    if (c.from > c.to) [c.from, c.to] = [c.to, c.from];
    renderView();
  }
  if (k === 'lockmin') { localStorage.setItem('aresLockMin', e.target.value); toast('Verrouillage après ' + e.target.value + ' min'); }
  if (e.target.id === 'importFile' && e.target.files[0]) { importFile(e.target.files[0]); e.target.value = ''; }
  if (k === 'tache-imm') $('#tacheLog').innerHTML = val(logOptions(e.target.value, ''));
  if (k === 'col-mode') sheetEl.querySelectorAll('[data-mode]').forEach((el) => { el.hidden = el.dataset.mode !== e.target.value; });
  if (k === 'door-reason') { const w = $('#doorWarn'); if (w) w.hidden = e.target.value !== 'Impayé'; }
  if (k === 'bien-loueur') { const f = e.target.form; if (f) f.querySelectorAll('.bien-sous').forEach((x) => { x.hidden = e.target.value !== 'sous'; }); }
  if (k === 'bins-on') {
    const im = vault.get('immeubles', e.target.dataset.id);
    if (im) vault.mutate((tx) => tx.put('immeubles', { id: im.id, bins: e.target.checked }), e.target.checked ? 'Tour des poubelles activé' : 'Tour des poubelles désactivé', im.adresse, im.id);
  }
  if (k === 'chat-on' || k === 'chat-scope') {
    const im = vault.get('immeubles', e.target.dataset.id);
    if (im) {
      const chat = { scope: chatScope(im), ...(im.chat || {}), ...(k === 'chat-on' ? { on: e.target.checked } : { scope: e.target.value }) };
      vault.mutate((tx) => tx.put('immeubles', { id: im.id, chat }), k === 'chat-scope' ? 'Messages de la maison : groupes modifiés' : chat.on ? 'Messages de la maison activés' : 'Messages de la maison désactivés', im.adresse, im.id)
        .then(() => chatSync()).then(() => chatLoad(im.id, true));
    }
  }
  if (k === 'esp-show' || k === 'esp-lang') {
    const l = vault.get('locataires', e.target.dataset.loc);
    if (l && l.espace && l.espace.on) {
      const upd = k === 'esp-lang' ? { ...l.espace, lang: e.target.value } : { ...l.espace, show: { ...ESP_ALL, ...(l.espace.show || {}), [e.target.dataset.k]: e.target.checked } };
      Promise.resolve(vault.mutate((tx) => tx.put('locataires', { id: l.id, espace: upd }), 'Espace locataire modifié', fullName(l), l.id))
        .then(() => { if (k === 'esp-lang' && ui.sheet) { ui.sheet.rendered = false; renderSheet(); } });
    }
  }
  if (k === 'icsall-file' && e.target.files[0]) {
    e.target.files[0].text().then((txt) => {
      const st = ui.icsAll;
      st.url = ''; st.groups = icsGroups(txt); st.err = st.groups.length ? '' : 'Ce fichier ne contient aucune date.';
      if (ui.sheet) { ui.sheet.rendered = false; renderSheet(); }
    });
    e.target.value = '';
  }
  if (k === 'col-ics' && e.target.files[0]) {
    e.target.files[0].text().then((txt) => {
      const ds = parseDates(txt, new Date().getFullYear(), sheetEl.querySelector('[name=cat]')?.value);
      if (!ds.length) return toast('Aucune date trouvée dans ce fichier', { bad: true });
      sheetEl.querySelector('[name=dates]').value = ds.map((d) => d.split('-').reverse().join('/')).join(', ');
      toast(`${plural(ds.length, 'date')} importée${ds.length > 1 ? 's' : ''} — vérifiez puis Enregistrer`);
    });
    e.target.value = '';
  }
  if (k === 'edl-slot' && e.target.files.length) { const f = e.target.files[0]; e.target.value = ''; setEdlPhoto(e.target.dataset.log, e.target.dataset.room, f); }
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
  navigator.serviceWorker.register('/locataires-sw.js', { scope: location.pathname.startsWith('/central-ogl') ? '/central-ogl' : location.pathname.startsWith('/centralgerances') ? '/centralgerances' : location.pathname.startsWith('/centralluxinterventions') ? '/centralluxinterventions' : location.pathname.startsWith('/centralluxintervention') ? '/centralluxintervention' : location.pathname.startsWith('/centraldomier') ? '/centraldomier' : '/locataires' }).catch(() => {}); // CENTRAL-DOMIER : sa propre adresse
}
boot();
