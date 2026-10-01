// LuxInterventions — Gestion locative (interface). L'app est à LuxInterventions (Ares Invest S.A.) ;
// les données de la société cliente (Réglages → Société, ici NOBIS s.a.r.l.) servent aux quittances et aux apps des locataires.
import { Vault, payKey, isLegacy, ApiError, uid, deviceLabel } from './store.js';
import { passphraseStrength } from './crypto.js';
import qrcode from './qrcode.js';
import { getLang, setLang, startI18n, LANGS, LOCALES } from './i18n.js';
import { newEspaceId, newEspaceKey, sealJson, openJson, sealBytes, newOwnerKeys, openFromTenant, unb64u, b64u, newAccessCode, codeHash, wrapWithCode } from './espace-crypto.js';

const VERSION = '2.38.0';
const MAIL = ['info', 'luxinterventions.com'].join('@'); // pas en clair dans le code (robots)
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
  tool: '<path d="M14.7 6.3a4 4 0 0 0 5 5l-8.5 8.5a2.1 2.1 0 0 1-3-3l8.5-8.5z"/><path d="M14.7 6.3 17 4a4 4 0 0 1 3 3l-2.3 2.3"/>',
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
const initials = (l) => (((l.prenom || '')[0] || '') + ((l.nom || '')[0] || '')).toUpperCase() || '?';
const immName = (id) => (vault.get('immeubles', id) || {}).adresse || 'Sans immeuble';
// Type de structure (immeuble) et type d'unité louée (logement / local)
const IMM_TYPES = {
  immeuble: 'Immeuble à plusieurs étages', maison: 'Maison / propriété avec chambres', local: 'Ancien café / local transformé en chambres',
  residence: 'Résidence / foyer / colocation', commercial: 'Bâtiment commercial / bureaux', mixte: 'Mixte (habitation + commerce)', parking: 'Parking / garages', autre: 'Autre structure',
};
const LOG_GROUPS = [
  ['Habitation', { appartement: 'Appartement', studio: 'Studio', chambre: 'Chambre', duplex: 'Duplex / penthouse', maison: 'Maison' }],
  ['Professionnel', { bureau: 'Bureau', commercial: 'Local commercial / magasin', restauration: 'Local de restauration (café, restaurant)', cabinet: 'Cabinet (médical, profession libérale)', atelier: 'Atelier / entrepôt' }],
  ['Annexes', { box: 'Espace box', garage: 'Garage / box', parking: 'Emplacement de parking', cave: 'Cave / débarras', autre: 'Autre' }],
];
const LOG_TYPES = Object.assign({}, ...LOG_GROUPS.map(([, t]) => t));
const logTypeSelect = (name, cur) => html`<label class="field">Type<select name="${name}">${LOG_GROUPS.map(([g, t]) => html`<optgroup label="${g}">${Object.entries(t).map(([k, v]) => html`<option value="${k}" ${cur === k ? new Raw('selected') : ''}>${v}</option>`)}</optgroup>`)}</select></label>`;
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
const logName = (id) => (vault.get('logements', id) || {}).nom || '';
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

// ───────────────────────── Maintenance : intervenants, interventions, collectes des déchets ─────────────────────────
const METIERS = { menage: 'Femme de ménage / nettoyage', menuisier: 'Menuisier', electricien: 'Électricien', plombier: 'Plombier / sanitaire', chauffagiste: 'Chauffagiste', macon: 'Maçon', peintre: 'Peintre', serrurier: 'Serrurier', jardinier: 'Jardinier', autre: 'Autre' };
const TACHE_TYPES = { nettoyage: '🧹 Nettoyage (ménage)', reparation: '🔧 Maintenance courante / réparation', gros: '🚚 Gros travaux (chaudière, toiture…)', autre: '📌 Autre' };
const tacheIcon = (type) => (type === 'entretien' ? '🔧' : (TACHE_TYPES[type] || '📌').split(' ')[0]);
// Feu tricolore : rouge = aujourd'hui ou en retard, jaune = demain / après-demain, vert = il y a le temps
const LIGHTS = { red: 'Urgent : aujourd’hui ou en retard', yellow: 'Attention : demain ou après-demain', green: 'Il y a le temps' };
function light(d) {
  if (!d) return '';
  const lvl = d <= today() ? 'red' : d <= addDays(today(), 2) ? 'yellow' : 'green';
  return new Raw(`<span class="light light-${lvl}" title="${LIGHTS[lvl]}" aria-label="${LIGHTS[lvl]}"></span>`);
}
const RECURS = { '': 'Une seule fois', hebdo: 'Chaque semaine', '2sem': 'Toutes les 2 semaines', mois: 'Chaque mois' };
const STATUTS = { afaire: 'À faire', planifie: 'Planifiée', fait: 'Terminée' };
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
const sortieDay = (c, d) => (c.sortie === 'jour' ? d : addDays(d, -1));
const shortDay = (s) => new Date(s + 'T00:00:00').toLocaleDateString(LOC, { weekday: 'long', day: 'numeric', month: 'short' });
const sortieText = (c, d) => c.sortie === 'jour'
  ? `à sortir le jour même${c.heure ? ' ' + c.heure : ' tôt le matin'}`
  : `à sortir la veille au soir${d ? ' (' + shortDay(addDays(d, -1)) + ')' : ''}${c.heure ? ' ' + c.heure : ''}`;
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
const intervFull = (i) => [i.prenom, i.nom].filter(Boolean).join(' ');
const intervName = (id) => { const i = vault.get('intervenants', id); return i ? intervFull(i) : ''; };
const INT_GENRES = { interne: 'Ouvrier interne (salarié)', societe: 'Société externe', prive: 'Privé (travail occasionnel)' };
const INT_CATS = { quotidien: 'Gestion quotidienne (ménage, petits travaux)', specialise: 'Professionnel spécialisé' };
const ABS_TYPES = { maladie: '🤒 Maladie', conges: '🏖️ Congé', autre: '📌 Autre absence' };
const SEMAINE = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const hm = (s) => { const m = /^(\d{1,2}):(\d{2})$/.exec(s || ''); return m ? +m[1] + +m[2] / 60 : null; };
// Heures prévues par jour de la semaine (0 = lundi)
const dayHours = (i, dow) => (i.horaires || []).filter((h) => h.j === dow).reduce((n, h) => { const a = hm(h.de), b = hm(h.a); return n + (a != null && b != null && b > a ? b - a : 0); }, 0);
const absOn = (i, d) => (i.absences || []).find((a) => a.debut <= d && (!a.fin || a.fin >= d));
// Heures du mois : prévues selon l'horaire, moins les jours d'absence (par type)
function intervMonth(i, y, m) {
  const out = { prevu: 0, maladie: 0, conges: 0, autre: 0, jm: 0, jc: 0, ja: 0 };
  const n = new Date(y, m, 0).getDate();
  for (let d = 1; d <= n; d++) {
    const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const h = dayHours(i, (new Date(y, m - 1, d).getDay() + 6) % 7);
    out.prevu += h;
    const a = absOn(i, iso);
    if (a && h) { out[a.type in out ? a.type : 'autre'] += h; out[{ maladie: 'jm', conges: 'jc' }[a.type] || 'ja']++; }
  }
  out.net = out.prevu - out.maladie - out.conges - out.autre;
  return out;
}
const fmtH = (h) => { const r = Math.round(h * 60); return `${Math.floor(r / 60)} h${r % 60 ? String(r % 60).padStart(2, '0') : ''}`; };
const placeName = (t) => [t.logId ? logName(t.logId) : 'Parties communes', immName(t.immId)].join(' · ');

// Agenda : tout ce qui se passe entre from et to (interventions + collectes), trié par jour
function agenda(from, to, immId) {
  const items = [];
  for (const t of vault.list('taches')) {
    if (immId && t.immId !== immId) continue;
    if (immGone(vault.get('immeubles', t.immId))) continue;
    if (t.recur) { for (const d of recurDates(t.date, t.recur, from, to, t.fin)) items.push({ d, kind: 'tache', t }); }
    else if (t.statut !== 'fait' && t.date) items.push({ d: t.date < from ? from : t.date, late: t.date < today(), kind: 'tache', t });
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

// ───────────────────────── App de l'équipe (lien / code personnel, chiffré) ─────────────────────────
// Chaque personne voit seulement SON planning (lieu, jour, consignes), son horaire et ses absences ;
// elle renvoie « commencé / fini / pas fini » avec note et photos, ses coordonnées, ses arrêts maladie.
const eqUrl = (i) => `${location.origin}/equipe.html#${i.espace.id}.${i.espace.key}`;
const eqAppUrl = () => `${location.origin}/equipe.html`;
const EQ_ST = { encours: '▶️ Commencé', fait: '✅ Fini', incomplet: '⚠️ Pas fini' };
// Dernier état donné par l'équipe pour une intervention un jour donné
// Photos « avant » / « après » envoyées par l'équipe pour une intervention (6 + 6 maximum)
const EQ_PH = { av: 'Avant', ap: 'Après' }, EQ_PH_MAX = 6;
const eqPhotos = (tid, phase) => vault.list('documents').filter((x) => x.tacheId === tid && x.phase === phase).sort((a, b) => (a.u || 0) - (b.u || 0));
const eqState = (t, d) => { const j = (t.journal || []).filter((x) => x.d === d); return j.length ? j[j.length - 1] : null; };
function equipeData(i) {
  const soc = societe();
  const from = addDays(today(), -7), to = addDays(today(), 21);
  const tasks = {}, items = [];
  const out1 = (t) => {
    const l = t.locId ? vault.get('locataires', t.locId) : null;
    return {
      titre: t.titre, type: t.type, recur: t.recur ? RECURS[t.recur] : '', note: t.note || '',
      adresse: immName(t.immId), lieu: t.logId ? logName(t.logId) : '', statut: t.statut,
      contact: l ? { nom: l.prenom || fullName(l), tel: l.tel || '' } : null,
      journal: (t.journal || []).slice(-20).map((x) => ({ d: x.d, st: x.st, note: x.note || '', at: x.at, h: x.h || '' })),
      ph: { av: eqPhotos(t.id, 'av').length, ap: eqPhotos(t.id, 'ap').length },
    };
  };
  for (const x of agenda(from, to).filter((x) => x.kind === 'tache' && x.t.intervenantId === i.id)) {
    tasks[x.t.id] ||= out1(x.t);
    items.push({ d: x.d, tid: x.t.id, late: !!x.late });
  }
  for (const t of vault.list('taches').filter((t) => t.intervenantId === i.id && !t.recur && t.statut === 'fait' && (t.doneDate || '') >= from)) {
    tasks[t.id] ||= out1(t);
    if (!items.some((x) => x.tid === t.id)) items.push({ d: t.doneDate, tid: t.id });
  }
  const k = vault.get('reglages', 'signal');
  return {
    v: 1, kind: 'equipe', lang: i.espace.lang || '', prenom: i.prenom || '', nom: i.nom || '', metier: METIERS[i.metier] || '',
    societe: { nom: soc.nom || 'NOBIS s.a.r.l.', tel: soc.tel || '', logo: soc.logo || '' },
    me: { tel: i.tel || '', mail: i.mail || '', adresse: i.adresse || '', ville: i.ville || '' },
    horaires: (i.horaires || []).map((h) => ({ j: h.j, de: h.de, a: h.a, lieu: h.immId ? immName(h.immId) : '' })),
    absences: (i.absences || []).filter((a) => !a.fin || a.fin >= addDays(today(), -30)).map((a) => ({ type: a.type, debut: a.debut, fin: a.fin || '' })),
    pres: Object.fromEntries(Object.entries(i.pres || {}).filter(([d]) => d >= addDays(today(), -7))),
    tasks, items: items.sort((a, b) => a.d.localeCompare(b.d)), signalKey: k ? k.pub : '',
  };
}
const eqHashes = new Map();
async function equipeSync(onlyId, loud) {
  if (!vault.unlocked) return true;
  for (const i of vault.list('intervenants').filter((x) => x.espace && x.espace.on && x.espace.id && (!onlyId || x.id === onlyId))) {
    try {
      const data = equipeData(i);
      const h = await sha256Hex(JSON.stringify(data));
      let stored = eqHashes.get(i.id);
      try { stored = stored || localStorage.getItem('aresEq:' + i.espace.id); } catch {}
      if (h === stored && !loud) continue;
      await vault.espacePut(i.espace.id, await sealJson(i.espace.key, data));
      eqHashes.set(i.id, h);
      try { localStorage.setItem('aresEq:' + i.espace.id, h); } catch {}
    } catch (e) {
      if (loud) { toast(e.message || 'Publication impossible (connexion ?)', { bad: true }); return false; }
    }
  }
  return true;
}
async function eqSetCode(i) {
  const e = i.espace;
  if (e.codeHash) await vault.espCodeDel(e.codeHash).catch(() => {});
  const code = newAccessCode();
  const h = await codeHash(code);
  await vault.espCodePut(h, { id: e.id, ...(await wrapWithCode(code, e.key)) });
  await vault.mutate((tx) => tx.put('intervenants', { id: i.id, espace: { ...e, code, codeHash: h } }), 'Code d’accès équipe créé', intervFull(i), i.id);
  return code;
}
// Messages de l'équipe → suivi des interventions (journal + photos), coordonnées, absences
async function equipeInbox(w, msg) {
  const files = [];
  const at0 = String(msg.t || new Date().toISOString()).slice(0, 30);
  await vault.mutate((tx) => {
    let cur = vault.get('intervenants', w.id);
    const feed = [...(cur.feed || [])];
    let fresh = 0;
    for (const it of (Array.isArray(msg.items) ? msg.items : []).slice(0, 30)) {
      const at = String(it.at || at0).slice(0, 30);
      const note = String(it.note || '').slice(0, 1000);
      const photos = (Array.isArray(it.photos) ? it.photos : []).slice(0, 3);
      if (it.k === 'task') {
        const t = vault.get('taches', String(it.tid || ''));
        if (!t || t.intervenantId !== w.id || !EQ_ST[it.st]) continue;
        const d = /^\d{4}-\d{2}-\d{2}$/.test(it.d || '') ? it.d : at.slice(0, 10);
        const ph = photos.map((b, n) => { const doc = tx.put('documents', { tacheId: t.id, kind: 'equipe', label: `${intervFull(w)} — ${t.titre} (${n + 1})`, date: d, mime: 'image/jpeg', size: Math.round(String(b).length * 0.75) }); files.push([doc.id, b]); return doc.id; });
        const entry = { d, st: it.st, note, at, by: w.id, ph };
        if (/^\d{2}:\d{2}$/.test(it.h || '')) entry.h = it.h;
        const upd = { id: t.id, journal: [...(t.journal || []), entry].slice(-80) };
        if (!t.recur && it.st === 'fait') Object.assign(upd, { statut: 'fait', doneDate: d });
        tx.put('taches', upd);
        feed.push({ at, k: 'task', tid: t.id, d, st: it.st, note, ph: ph.length, h: entry.h || '' });
        fresh++;
      } else if (it.k === 'ph') {
        const t = vault.get('taches', String(it.tid || ''));
        const b = photos[0] || (typeof it.photo === 'string' ? it.photo : '');
        if (!t || t.intervenantId !== w.id || !EQ_PH[it.phase] || !b) continue;
        const nb = eqPhotos(t.id, it.phase).length;
        if (nb >= EQ_PH_MAX) continue;
        const d = /^\d{4}-\d{2}-\d{2}$/.test(it.d || '') ? it.d : at.slice(0, 10);
        const doc = tx.put('documents', { tacheId: t.id, kind: 'equipe', phase: it.phase, label: `${EQ_PH[it.phase]} ${nb + 1} — ${t.titre} (${intervFull(w)})`, date: d, mime: 'image/jpeg', size: Math.round(b.length * 0.75) });
        files.push([doc.id, b]);
        const last = feed[feed.length - 1];
        if (last && last.k === 'ph' && last.tid === t.id && last.phase === it.phase && last.d === d) { last.ph = (last.ph || 0) + 1; last.at = at; } else feed.push({ at, k: 'ph', tid: t.id, d, phase: it.phase, ph: 1 });
        fresh++;
      } else if (it.k === 'pres') {
        // pointage : heure d'arrivée / de départ écrite par la personne
        const d = /^\d{4}-\d{2}-\d{2}$/.test(it.d || '') ? it.d : at.slice(0, 10);
        const hm = (v) => (/^\d{2}:\d{2}$/.test(v || '') ? v : '');
        const arr = hm(it.arr), dep = hm(it.dep);
        if (!arr && !dep) continue;
        cur = vault.get('intervenants', w.id);
        const pres = { ...(cur.pres || {}) };
        pres[d] = { ...(pres[d] || {}), ...(arr ? { arr } : {}), ...(dep ? { dep } : {}) };
        for (const k of Object.keys(pres).sort().slice(0, -60)) delete pres[k];
        tx.put('intervenants', { id: w.id, pres });
        feed.push({ at, k: 'pres', d, note: arr ? `🟢 Arrivée ${arr}` : `🔴 Départ ${dep}` });
        fresh++;
      } else if (it.k === 'pb') {
        // « Quelque chose ne va pas » : devient une intervention à faire, avec les photos
        const ph = (Array.isArray(it.photos) ? it.photos : []).filter((b) => typeof b === 'string').slice(0, 6);
        const d = /^\d{4}-\d{2}-\d{2}$/.test(it.d || '') ? it.d : at.slice(0, 10);
        const lieu = String(it.lieu || '').trim().toLowerCase();
        const im = lieu ? vault.list('immeubles').find((x) => (x.adresse || '').trim().toLowerCase() === lieu) : null;
        const titre = (note.split('\n')[0] || 'Problème').slice(0, 80);
        const t = tx.put('taches', { type: 'reparation', titre: `Problème signalé par ${intervFull(w)} : ${titre}`, immId: im ? im.id : '', logId: '', locId: '', intervenantId: '', byInterv: w.id, date: d, recur: '', statut: 'afaire', sentAt: at, note: `${note}\n\n— Envoyé par ${intervFull(w)} (équipe) le ${fmtDateTime(at)}${it.lieu ? ' · lieu : ' + String(it.lieu).slice(0, 120) : ''}` });
        ph.forEach((b, n) => { const doc = tx.put('documents', { tacheId: t.id, kind: 'signal', label: `Problème — photo ${n + 1}`, date: d, mime: 'image/jpeg', size: Math.round(b.length * 0.75) }); files.push([doc.id, b]); });
        feed.push({ at, k: 'pb', tid: t.id, d, note: '⚠️ ' + titre, ph: ph.length });
        fresh++;
      } else if (it.k === 'info') {
        const clean = (v, n) => String(v || '').trim().slice(0, n);
        const upd = { id: w.id };
        for (const [f, n] of [['tel', 40], ['mail', 120], ['adresse', 160], ['ville', 80]]) if (clean(it[f], n)) upd[f] = clean(it[f], n);
        tx.put('intervenants', upd);
        feed.push({ at, k: 'info', note: 'Coordonnées mises à jour' });
        fresh++;
      } else if (it.k === 'abs') {
        const debut = /^\d{4}-\d{2}-\d{2}$/.test(it.debut || '') ? it.debut : at.slice(0, 10);
        const fin = /^\d{4}-\d{2}-\d{2}$/.test(it.fin || '') && it.fin >= debut ? it.fin : '';
        const type = ABS_TYPES[it.type] ? it.type : 'maladie';
        const a = { id: 'a' + Date.now().toString(36) + fresh, type, debut, fin, note: note || 'Envoyé depuis l’app', fromApp: true };
        if (photos[0]) { const doc = tx.put('documents', { intervId: w.id, kind: 'absence', label: `${ABS_TYPES[type].replace(/^\S+ /, '')} — ${intervFull(w)}`, date: debut, mime: 'image/jpeg', size: Math.round(String(photos[0]).length * 0.75) }); files.push([doc.id, photos[0]]); a.docId = doc.id; }
        cur = vault.get('intervenants', w.id);
        tx.put('intervenants', { id: w.id, absences: [...(cur.absences || []), a] });
        feed.push({ at, k: 'abs', note: `${ABS_TYPES[type]} du ${fmtDate(debut)}${fin ? ' au ' + fmtDate(fin) : ''}${note ? ' — ' + note : ''}`, ph: photos[0] ? 1 : 0 });
        fresh++;
      }
    }
    tx.put('intervenants', { id: w.id, feed: feed.slice(-200), feedNew: (cur.feedNew || 0) + fresh });
  }, 'Nouvelles de l’équipe', intervFull(w), w.id);
  for (const [id, b] of files) await vault.saveFile(id, unb64u(b));
  for (const it of (Array.isArray(msg.items) ? msg.items : [])) if (it.k === 'task' && it.st === 'fait') await syncDepense({ id: String(it.tid || '') }, true);
}
// Journal de l'équipe (toutes les personnes, ou une seule), le plus récent d'abord
function eqFeedHtml(onlyId, max = 80) {
  const rows = [];
  for (const i of vault.list('intervenants')) if (!onlyId || i.id === onlyId) for (const f of i.feed || []) rows.push([i, f]);
  rows.sort((a, b) => (b[1].at || '').localeCompare(a[1].at || ''));
  if (!rows.length) return html`<p class="small muted">Rien pour le moment. Ce que l’équipe envoie depuis son app (commencé, fini, pas fini, notes, photos, maladie) arrive ici.</p>`;
  return html`<div class="list small">${rows.slice(0, max).map(([i, f]) => {
    const t = f.tid ? vault.get('taches', f.tid) : null;
    const what = f.k === 'pres' ? html`<b>${f.note}</b>` : f.k === 'pb' ? html`<b>${f.note}</b>` : f.k === 'task' || f.k === 'ph' ? html`<b>${f.k === 'ph' ? '📷 ' + EQ_PH[f.phase] : EQ_ST[f.st] || f.st}${f.h ? ' 🕒 ' + f.h : ''}</b> · ${t ? t.titre : '(intervention supprimée)'}${t ? html`<span class="meta" style="display:block">📍 ${placeName(t)} · ${fmtDate(f.d)}</span>` : ''}` : f.k === 'abs' ? html`<b>${f.note}</b>` : html`<b>✏️ ${f.note}</b>`;
    return html`<button class="row" ${t ? html`data-action="edit-tache" data-id="${t.id}"` : html`data-action="open-interv" data-id="${i.id}"`} style="text-align:left">
      <span class="grow" style="white-space:normal"><span class="meta" style="display:block">${fmtDateTime(f.at)} · ${intervFull(i)}</span>${what}${f.k === 'task' && f.note ? html`<span class="small" style="display:block;margin-top:2px">📝 ${f.note}</span>` : ''}</span>
      ${f.ph ? html`<span class="badge">📷 ${f.ph}</span>` : ''}</button>`;
  })}</div>`;
}
// Aujourd'hui : qui fait quoi, où, et où il en est
function eqTodayHtml() {
  const d0 = today();
  const its = agenda(d0, d0).filter((x) => x.kind === 'tache' && x.t.intervenantId);
  // terminées aujourd'hui (elles ne sont plus dans l'agenda) : on les garde, avec ✅
  for (const t of vault.list('taches')) if (t.intervenantId && !t.recur && t.statut === 'fait' && t.doneDate === d0 && !its.some((x) => x.t.id === t.id)) its.push({ d: d0, kind: 'tache', t });
  const absent = vault.list('intervenants').filter((i) => absOn(i, d0));
  const pointes = vault.list('intervenants').filter((i) => (i.pres || {})[d0]);
  if (!its.length && !absent.length && !pointes.length) return '';
  return html`<div class="card" style="margin-bottom:14px"><div class="card-title" style="margin-bottom:6px"><h3>👷 Aujourd’hui</h3></div>
    <div class="list small">${its.map((x) => {
      const t = x.t, i = vault.get('intervenants', t.intervenantId) || {}, st = eqState(t, x.d);
      return html`<button class="row" data-action="edit-tache" data-id="${t.id}" style="text-align:left"><span class="grow" style="white-space:normal"><b>${intervFull(i)}</b> — ${tacheIcon(t.type)} ${t.titre}<span class="meta" style="display:block">📍 ${placeName(t)}${st && st.note ? ' · 📝 ' + st.note : ''}</span></span>
        <span class="badge ${st ? (st.st === 'fait' ? 'ok' : st.st === 'incomplet' ? 'bad' : 'warn') : ''}">${st ? EQ_ST[st.st] + ' ' + (st.h || (st.at || '').slice(11, 16)) : absOn(i, d0) ? '🤒 absent' : '⏳ pas encore'}</span></button>`;
    })}
    ${pointes.map((i) => { const p = i.pres[d0]; return html`<div class="row"><span class="grow"><b>${intervFull(i)}</b> — 🕒 <span>Arrivée</span> <b>${p.arr || '—'}</b> · <span>Départ</span> <b>${p.dep || '—'}</b></span></div>`; })}
    ${absent.filter((i) => !its.some((x) => x.t.intervenantId === i.id)).map((i) => html`<div class="row"><span class="grow"><b>${intervFull(i)}</b> — ${ABS_TYPES[absOn(i, d0).type]}</span></div>`)}</div></div>`;
}

// ───────────────────────── Espace locataire (lien personnel, contenu choisi, chiffré) ─────────────────────────
const ESP_SHOW = {
  pay: 'Paiements (mois payés / à payer, IBAN)',
  quit: 'Quittances à télécharger',
  contrat: 'Contrat (entrée, fin, loyer, révision)',
  docs: 'Son dossier : documents enregistrés (identité, CNS, caution, preuves de paiement…) avec aperçu — 👁 Privé pour en cacher un',
  coll: 'Collectes des déchets de l’immeuble',
  avis: 'Avis de l’immeuble (travaux, coupures…)',
  pub: 'Bons plans du quartier (publicité des partenaires, avec carte)',
  signal: 'Signaler un problème (avec photos)',
  edl: 'État des lieux : vos 6 photos (salle de bain, cuisine, chambre, cave, buanderie, parking) + ses photos de sortie à son départ',
  porte: 'Code de la porte (serrure à code / connectée)',
  regles: 'Règlement de la maison (à lire, avec « J’ai lu et j’accepte »)',
  chat: 'Messages de la maison (mini-chat entre habitants, lu par vous)',
  tools: 'Don · prêt · location (publier ses objets sur le site, après votre approbation)',
};
const ESP_ALL = Object.fromEntries(Object.keys(ESP_SHOW).map((k) => [k, k !== 'porte']));
const espUrl = (l) => `${location.origin}/espace.html#${l.espace.id}.${l.espace.key}`;
// Publicité des partenaires du quartier (pizzerias, bars, bricolage, meubles…) : rangée avec les avis (kind « pub »),
// visible dans l'app des locataires jusqu'à sa date de fin (durée choisie à la publication)
const PUB_CATS = { resto: '🍕 Pizzeria / restaurant', bar: '🍺 Bar / pub', horeca: '☕ Café / snack (Horeca)', bricolage: '🔨 Bricolage / jardinage', meubles: '🛋️ Meubles / décoration', courses: '🛒 Supermarché / commerce', services: '🧰 Services', autre: '📌 Autre' };
const PUB_TTL = [7, 14, 30, 60, 90, 180, 365];
const isPub = (a) => a.kind === 'pub';
const pubsActives = (immId) => vault.list('avis').filter((a) => isPub(a) && (!immId || !a.immId || a.immId === immId) && (!a.debut || a.debut <= today()) && (!a.fin || a.fin >= today()));
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
  await vault.mutate((tx) => tx.put('locataires', { id: l.id, espace: { ...e, code, codeHash: h } }), 'Code d’accès locataire créé', fullName(l), l.id);
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
const appUrl = () => `${location.origin}/espace.html`;
// Ce que le locataire voit — uniquement les rubriques cochées, uniquement ses propres données
function espaceData(l) {
  const e = l.espace, show = { ...ESP_ALL, ...(e.show || {}) };
  const g = vault.get('logements', l.logId), im = vault.get('immeubles', l.immId);
  const soc = societe();
  const out = {
    v: 1, lang: e.lang || '', prenom: l.prenom || '', nom: l.nom || '', logement: g ? g.nom : '', adresse: im ? im.adresse : '', show,
    societe: { nom: soc.nom && !WRONG_ID.test(soc.nom) ? soc.nom : 'NOBIS s.a.r.l.', adresse: soc.adresse || '', ville: soc.ville || '', tel: soc.tel || '', email: soc.email || '', logo: soc.logo || '' },
    loyer: l.loyer || 0, parti: isGone(l) ? l.sortie : '', mail: l.mail || '',
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
    out.years = [cy, cy - 1].filter((y) => MONTHS.some((_, i) => isDue(l, y, i + 1) || payment(l.id, y, i + 1))).map((y) => {
      const s = yearStats(l, y);
      return { y, rest: s.rest, upcoming: s.upcoming, paid: s.paid, months: MONTHS.map((_, i) => { const st = payState(l, y, i + 1); return [st.due, st.paid, st.p ? st.p.date || '' : '']; }) };
    });
  }
  if (show.porte && g && g.porte && g.porte.code) out.porte = { code: g.porte.code, depuis: g.porte.maj || '', info: g.porte.info || '' };
  if (show.contrat) out.contrat = { debut: l.debut || '', fin: l.fin || '', revision: l.revision || '', caution: l.caution || 0, cautionDate: l.cautionDate || '', cautionMode: l.cautionMode || '' };
  if (show.docs) out.docs = vault.list('documents').filter((d) => d.locId === l.id && d.shared).sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .map((d) => ({ id: d.id, label: d.label, dtype: d.dtype || '', pay: d.pay || '', date: d.date, mime: d.mime, size: d.size }));
  if (show.edl && g) {
    out.edl = EDL_ROOMS.map(([k]) => edlIn(g.id, k)).filter(Boolean).map((d) => ({ id: d.id, room: d.room, date: d.date }));
    out.edlOut = edlOf(g.id, 'edl-out').filter((d) => d.locId === l.id).map((d) => ({ room: d.room, date: d.date }));
  }
  if (show.coll && im) { out.coll = pubData(im).items; if (im.pubToken) out.collLink = pubUrl(im); }
  if (show.pub) out.pubs = pubsActives(l.immId).sort((a, b) => (b.debut || '').localeCompare(a.debut || '')).map((a) => ({ id: a.id, cat: a.cat || 'autre', nom: a.nom || '', adresse: a.adresse || '', texte: a.texte || '', tel: a.tel || '', web: a.web || '', fin: a.fin || '' }));
  if (show.avis) out.avis = avisActifs(l.immId).map((a) => ({ texte: a.texte, debut: a.debut || '', fin: a.fin || '' }));
  if (show.regles) out.regles = { extra: (im && im.regles) || '', lu: l.reglesLu || '', lv: l.reglesV || '', v: rulesVersion(im) };
  if (show.chat && chatOn(im) && isCurrent(l)) {
    const g = (im.chats || {})[chatGroupKey(im, l)];
    if (g && g.members.includes(l.id)) {
      out.chat = { id: g.id, key: g.key, me: shortName(l), mid: l.id };
      const ev = binRota(im, g, g.since || '2026-09-01', addDays(today(), 120));
      const gk = chatGroupKey(im, l);
      if (ev.length) out.bins = {
        names: Object.fromEntries(g.members.map((m) => [m, shortName(vault.get('locataires', m) || {})])),
        order: (g.order || g.members).filter((id) => id && g.members.includes(id)),
        ev: ev.map((e) => ({ p: e.p, d: e.d, k: e.k, cats: e.cats })), log: ((im.binLog || {})[gk]) || {},
      };
    }
  }
  if (show.signal || show.regles || show.edl) { const k = vault.get('reglages', 'signal'); out.signalKey = k ? k.pub : ''; }
  if (show.signal) {
    out.signals = vault.list('taches').filter((t) => t.locId === l.id).sort((a, b) => (b.sentAt || b.date || '').localeCompare(a.sentAt || a.date || '')).slice(0, 20)
      .map((t) => ({ titre: t.titre.replace(/^(Signalement|Erreur signalée \(dossier \/ paiements\)) : /, ''), sent: t.sentAt || '', date: t.date || '', statut: t.statut, done: t.doneDate || '' }));
  }
  return out;
}
// ───── Messages de la maison : mini-chat des habitants d'un logement (lu et modéré par le gestionnaire) ─────
// Chaque fil a sa propre clé, donnée seulement aux habitants actuels (dans leur espace chiffré) ; quand quelqu'un
// part, on change de clé et on recopie l'historique : l'ancien habitant ne peut plus rien lire.
// Par défaut : seulement les habitants d'un même appartement (même logement, ou même « Situé dans » pour les chambres
// d'un appartement). Mettre en relation des appartements différents, c'est au gestionnaire de le choisir.
const CHAT_SCOPES = {
  partie: 'Même appartement (par défaut) : colocataires du même logement, ou des chambres d’un même « Situé dans »',
  logement: 'Même logement uniquement',
  structure: 'Toute la structure : tous les habitants ensemble (appartements différents)',
};
const chatScope = (im) => (im.chat && im.chat.scope) || 'partie';
const chatOn = (im) => !!im && !(im.chat && im.chat.on === false) && !immGone(im);
function chatGroupKey(im, l) {
  const sc = chatScope(im), g = vault.get('logements', l.logId);
  if (sc === 'structure' || !l.logId) return 'all';
  if (sc === 'partie' && g && g.partie) return 'p:' + g.partie.trim().toLowerCase();
  return 'l:' + l.logId;
}
const chatLabel = (gk) => (gk === 'all' ? 'Toute la structure' : gk.startsWith('p:') ? gk.slice(2) : logName(gk.slice(2)) || 'Logement');
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
// Même calcul dans l'app des locataires (espace.js).
function binPlan(order, events, msgs, log, evalFrom, now) {
  const n = order.length, pen = [], owed = {}, out = [];
  let shift = 0;
  for (const e of events) {
    let who, extra = false;
    if (pen.length) { who = pen.shift(); extra = true; shift++; } else {
      who = order[(((e.k - shift) % n) + n) % n];
      const o = owed[who];
      if (o && o.length) who = o.shift();
    }
    let done = '', cant = '', forgot = false;
    const lg = log && log[e.p];
    if (lg) { who = lg.w || who; done = lg.d || ''; forgot = !!lg.f; } else {
      for (const m of (msgs || []).filter((x) => x.k === 'bin' && x.d === e.p)) {
        if (m.act === 'take') { who = m.m; cant = ''; }
        if (m.act === 'cant') cant = m.m;
        if (m.act === 'done' || m.act === 'instead') done = m.m;
      }
      forgot = !done && e.d < now && msgs != null && e.p >= evalFrom;
    }
    if (forgot) pen.push(who);
    if (done && done !== who) (owed[done] ||= []).push(who);
    out.push({ ...e, who, extra, done, cant, forgot });
  }
  return out;
}
const binGroupPlan = (im, gk, g, msgs, to) => {
  const order = (g.order || g.members).filter((id) => id && g.members.includes(id));
  return binPlan(order, binRota(im, g, g.since || '2026-09-01', to || addDays(today(), 30)), msgs, ((im.binLog || {})[gk]) || {}, addDays(today(), -60), today());
};
// Mémorise chaque tour passé (fait / par qui / oublié) : les messages du fil s'effacent après 90 jours, le classement est annuel
async function binRecord(im, gk, g, msgs) {
  if (!binsOn(im) || msgs == null) return;
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
  for (const im of vault.list('immeubles').filter(binsOn)) {
    for (const [gk, g] of Object.entries(im.chats || {})) { try { await binRecord(vault.get('immeubles', im.id), gk, g, await chatRead(g)); } catch { /* hors ligne */ } }
  }
  try { localStorage.setItem('aresBinDay', today()); } catch {}
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
// État d'un tour d'après les messages du fil (fait, « je ne peux pas », « je le fais »)
function binState(msgs, e) {
  let who = e.who, done = '', cant = '';
  for (const m of (msgs || []).filter((x) => x.k === 'bin' && x.d === e.p)) {
    if (m.act === 'take') { who = m.m; cant = ''; }
    if (m.act === 'cant') cant = m.m;
    if (m.act === 'done') done = m.m;
  }
  return { who, done, cant };
}

let chatBusy = false;
async function chatSync() {
  if (!vault.unlocked || chatBusy) return;
  chatBusy = true;
  try {
    for (const im of vault.list('immeubles')) {
      const cur = im.chats || {};
      const groups = {};
      if (chatOn(im)) for (const l of tenantsOfImm(im.id).filter(isCurrent)) (groups[chatGroupKey(im, l)] ||= []).push(l.id);
      for (const gk of Object.keys(groups)) if (groups[gk].length < 2) delete groups[gk]; // seul dans son appartement : pas de fil
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
          for (const m of await chatRead(old).catch(() => [])) { const { n, ...msg } = m; last = (await (await vault.boardPost(g.id, await sealJson(g.key, msg))).json()).n || last; }
          setSeen(g.id, last);
          await vault.boardDel(old.id).catch(() => {});
        }
        next[gk] = g;
        changed = true;
      }
      for (const [gk, g] of Object.entries(cur)) if (!next[gk]) { await vault.boardDel(g.id).catch(() => {}); changed = true; }
      if (changed) await vault.mutate((tx) => tx.put('immeubles', { id: im.id, chats: next }), 'Messages de la maison : habitants mis à jour', im.adresse, im.id);
    }
  } catch { /* hors ligne : on réessaiera */ }
  chatBusy = false;
}
// Nouveaux messages non lus (pour l'accueil)
async function chatPoll() {
  if (!vault.unlocked) return;
  const res = {};
  for (const im of vault.list('immeubles')) for (const g of Object.values(im.chats || {})) {
    try {
      let seen = '';
      try { seen = localStorage.getItem(chatSeenKey(g.id)) || ''; } catch {}
      const n = (await vault.boardList(g.id)).filter((it) => it.n > seen).length;
      if (n) res[im.id] = (res[im.id] || 0) + n;
    } catch { /* hors ligne */ }
  }
  ui.chatNew = res;
  if (ui.route === 'dashboard') renderView();
}
async function chatLoad(imId, force) {
  const im = vault.get('immeubles', imId);
  if (!im) return;
  ui.chatAt = ui.chatAt || {};
  ui.chatCache = ui.chatCache || {};
  if (!force && ui.chatAt[imId] && Date.now() - ui.chatAt[imId] < 15000) return;
  ui.chatAt[imId] = Date.now();
  for (const g of Object.values(im.chats || {})) {
    try { ui.chatCache[g.id] = await chatRead(g); binRecord(vault.get('immeubles', imId), Object.entries(im.chats || {}).find(([, x]) => x.id === g.id)?.[0], g, ui.chatCache[g.id]).catch(() => {}); } catch { ui.chatCache[g.id] = ui.chatCache[g.id] || []; }
    const c = ui.chatCache[g.id];
    if (c.length) setSeen(g.id, c[c.length - 1].n);
  }
  if (ui.chatNew) delete ui.chatNew[imId];
  if (ui.sheet && ui.sheet.kind === 'imm' && ui.sheet.id === imId && ui.sheet.tab === 'chat') { ui.sheet.rendered = false; renderSheet(); }
}
// Prochains tours des poubelles d'un fil, avec qui et si c'est fait
function binsTable(im, g) {
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
const chatBubbles = (list, gid) => (list == null ? html`<p class="muted small">Chargement…</p>` : !list.length ? html`<p class="muted small">Aucun message pour le moment.</p>`
  : html`${list.map((m) => html`<div class="bub ${m.m === 'mgr' ? 'mgr' : ''}"><div class="bub-h"><b>${m.m === 'mgr' ? '🛡️ Gestionnaire' : m.a}</b><span>${fmtDateTime(m.t)}</span>
    <button class="bub-del" data-action="chat-del" data-id="${gid}" data-n="${m.n}" aria-label="Supprimer ce message">${icon('trash')}</button></div><div class="bub-x">${m.x}</div></div>`)}`);

// ───── Annonces « Don · prêt · location » publiées par les locataires (site public, après approbation) ─────
const TOOL_KINDS = { don: '🎁 Don', pret: '🤝 Prêt gratuit', loc: '💶 Location' };
const TOOL_UNITS = { h: '/ heure', j: '/ jour', we: '/ week-end', s: '/ semaine', u: '(prix unique)' };
const toolPrice = (it) => (it.kind === 'loc' ? money(it.price) + ' ' + (TOOL_UNITS[it.unit] || '') : it.kind === 'don' ? 'gratuit (don)' : 'gratuit (prêt)');
function toolOwner(it) {
  if (it.owner === 'mgr') return societe().nom || 'NOBIS s.a.r.l.';
  const l = vault.list('locataires').find((x) => x.espace && 'e:' + x.espace.id === it.owner);
  return l ? fullName(l) + ' · ' + (logName(l.logId) || immName(l.immId)) : 'Locataire (espace fermé)';
}
async function toolsLoad(force) {
  if (!vault.unlocked) return;
  if (!force && ui.toolsAt && Date.now() - ui.toolsAt < 15000) return;
  ui.toolsAt = Date.now();
  try { ui.tools = await vault.toolsList(); } catch { ui.tools = ui.tools || []; }
  ui.toolsPending = ui.tools.filter((it) => it.status === 'pending').length;
  ui.toolImg = ui.toolImg || {};
  const redraw = () => { if (ui.sheet && ui.sheet.kind === 'tools') { ui.sheet.rendered = false; renderSheet(); } };
  for (const it of ui.tools) {
    if (ui.toolImg[it.id]) continue;
    ui.toolImg[it.id] = 'loading';
    fetch(`${API}/api/tools/${it.id}/p0.jpg`).then((r) => (r.ok ? r.blob() : null)).then((b) => { ui.toolImg[it.id] = b ? URL.createObjectURL(b) : ''; redraw(); }).catch(() => {});
  }
  redraw();
  if (ui.route === 'dashboard') renderView();
}

const espHashes = new Map();
let espTimer = null;
const scheduleEspaceSync = () => { clearTimeout(espTimer); espTimer = setTimeout(() => espaceSync(), 2500); };
async function sha256Hex(s) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map((b) => b.toString(16).padStart(2, '0')).join(''); }
// Publie (chiffré) l'espace de chaque locataire dont le contenu a changé, avec ses documents partagés
async function espaceSync(onlyId, loud) {
  if (!vault.unlocked) return true;
  await chatSync();
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
      try { localStorage.setItem('aresEsp:' + l.espace.id, h); } catch {}
      if (docsChanged) await vault.mutate((tx) => tx.put('locataires', { id: l.id, espace: { ...l.espace, docs: [...up] } }), 'Espace locataire : documents', fullName(l), l.id);
    } catch (e) {
      if (loud) { toast(e.message || 'Publication impossible (connexion ?)', { bad: true }); return false; }
    }
  }
  if (!onlyId) await equipeSync();
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
    for (const it of await vault.inboxList()) {
      let msg;
      try { msg = await openFromTenant(keys.priv, await vault.inboxGet(it.name)); } catch { continue; }
      const w = vault.list('intervenants').find((x) => x.espace && x.espace.id && x.espace.id === msg.espace && x.espace.id.startsWith(it.name.split('-')[1] || '-'));
      if (w) {
        if (w.espace.on && msg.type === 'equipe') { await equipeInbox(w, msg); n++; }
        await vault.inboxDel(it.name);
        continue;
      }
      const l = vault.list('locataires').find((x) => x.espace && x.espace.id && x.espace.id === msg.espace && x.espace.id.startsWith(it.name.split('-')[1] || '-'));
      if (!l || !l.espace.on) { await vault.inboxDel(it.name); continue; }
      if (msg.type === 'paye') {
        const vir = { t: String(msg.t || new Date().toISOString()).slice(0, 30), montant: Math.max(0, +msg.montant || 0), ref: String(msg.ref || '').slice(0, 140), via: PAY_VIA[msg.via] ? msg.via : 'vir' };
        await vault.mutate((tx) => tx.put('locataires', { id: l.id, virSignal: vir }), 'Virement signalé par le locataire', `${fullName(l)} — ${money(vir.montant)}`, l.id);
        await vault.inboxDel(it.name);
        n++;
        continue;
      }
      if (msg.type === 'regles') {
        await vault.mutate((tx) => tx.put('locataires', { id: l.id, reglesLu: String(msg.t || '').slice(0, 10) || today(), reglesV: String(msg.v || '').slice(0, 40) }), 'Règlement de la maison accepté', fullName(l), l.id);
        await vault.inboxDel(it.name);
        continue;
      }
      if (msg.type === 'edl-out') {
        // Photos de sortie du locataire (une par pièce ; une nouvelle remplace la précédente de la même pièce)
        const g = vault.get('logements', l.logId);
        const ph = (Array.isArray(msg.photos) ? msg.photos : []).filter((x) => x && EDL_ROOM[x.room] && typeof x.b === 'string' && x.b.length < 4e6).slice(0, EDL_ROOMS.length);
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
    }
  } catch { /* hors ligne : on réessaiera */ }
  inboxBusy = false;
  if (n) toast(`📩 ${plural(n, 'message')} de locataire reçu${n > 1 ? 's' : ''} — voir l'accueil`);
}

// Messages envoyés par les locataires depuis leur app, pas encore ouverts dans Ares
const newSignals = () => vault.list('taches').filter((t) => t.sentAt && !t.vu).sort((a, b) => (b.sentAt || '').localeCompare(a.sentAt || ''));
const signalPhotos = (t) => vault.list('documents').filter((x) => x.tacheId === t.id).length;
const tacheToDo = () => vault.list('taches').filter((t) => !t.recur && t.statut !== 'fait');
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
function loyerAt(l, y, m) {
  const hist = [...(l.loyerHist || [])].sort((a, b) => a.from.localeCompare(b.from));
  if (!hist.length) return l.loyer || 0;
  let v = hist[0].prev != null ? hist[0].prev : l.loyer;
  for (const h of hist) if (ym(y, m) >= ymOf(h.from)) v = h.loyer;
  return v || 0;
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
const paysOf = (locId) => vault.list('paiements').filter((p) => p.locId === locId);
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
const societe = () => vault.get('reglages', 'main') || {};
// Pays et taux de TVA (modifiables dans Réglages → Société) — aide à la comptabilité, pas un conseil fiscal
const PAYS = { LU: ['Luxembourg', [17, 14, 8, 3]], FR: ['France', [20, 10, 5.5, 2.1]], BE: ['Belgique', [21, 12, 6]], DE: ['Deutschland', [19, 7]], IT: ['Italia', [22, 10, 5, 4]], PT: ['Portugal', [23, 13, 6]], ES: ['España', [21, 10, 4]], NL: ['Nederland', [21, 9]], AT: ['Österreich', [20, 13, 10]], CH: ['Suisse', [8.1, 3.8, 2.6]] };
const tvaRates = () => { const s0 = societe(); const own = String(s0.taux || '').split(/[;, ]+/).map((x) => parseFloat(x.replace(',', '.'))).filter((x) => x > 0 && x < 100); return own.length ? own : (PAYS[s0.pays || 'LU'] || PAYS.LU)[1]; };
// Marque de l'app de gestion (fixe, indépendante de la société cliente)
const APP_BRAND = { nom: 'LuxInterventions', legal: 'Ares Invest S.A. · RCS B225245', logo: '/assets/luxinterventions-logo.png' };
const socName = () => societe().nom || 'NOBIS s.a.r.l.';
const socLogo = () => societe().logo || '/ares/icons/nobis-logo.png';
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
  const so = societe();
  const badIban = so.iban && (WRONG_ID.test(so.iban) || !ibanOk(so.iban));
  if (![so.nom, so.rcs, so.tvaNum].some((v) => WRONG_ID.test(v || '')) && !badIban) return;
  await vault.mutate((tx) => tx.put('reglages', { id: 'main', ...NOBIS_ID }), 'Société corrigée : NOBIS s.a.r.l.', `${so.nom || ''} → NOBIS s.a.r.l. · RCS B225665`);
  applyBrand();
  toast('Société corrigée : NOBIS s.a.r.l. · RCS B225665 · TVA LU30599412');
}
// L'en-tête de l'app montre la marque LuxInterventions ; le logo de la société (Réglages) sert aux quittances et à l'app des locataires
function applyBrand() {
  document.querySelectorAll('.brand-mark').forEach((img) => { img.src = APP_BRAND.logo; });
}
const brandCache = () => { try { return JSON.parse(localStorage.getItem('aresBrand') || '{}'); } catch { return {}; } };
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
  route: 'dashboard',
  year: new Date().getFullYear(),
  immFilter: '',
  search: '',
  locSeg: 'actuels',
  immSeg: 'actuels',
  histShown: 20,
  sheet: null, // { kind, id, tab }
};

const NAV = [
  ['dashboard', 'Accueil', 'home'],
  ['immeubles', 'Immeubles', 'building'],
  ['locataires', 'Locataires', 'users'],
  ['paiements', 'Paiements', 'wallet'],
  ['maintenance', 'Maintenance', 'tool'],
  ['champions', 'Locataire de l’année', 'trophy'],
  ['compta', 'Comptabilité', 'chart'],
  ['reglages', 'Réglages', 'more'],
];
const MOBILE_NAV = ['dashboard', 'immeubles', 'locataires', 'paiements', 'reglages'];
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
    const ttc = paidAmount(p, l), r = im.tvaLoyer || 0;
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
  const q = (x) => '"' + String(x ?? '').replace(/"/g, '""') + '"';
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
    <img class="lock-logo" src="${APP_BRAND.logo}" alt="" width="96" height="96">
    <div class="lock-head"><h1>${APP_BRAND.nom}</h1><p>Gestion locative · Luxembourg</p><p class="tiny" data-notr="1">${APP_BRAND.legal}</p></div>`;
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
    <input type="text" name="username" value="LuxInterventions" autocomplete="username" hidden>
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
      'LuxInterventions est ouvert sur un autre appareil',
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
    const r = await vault.unlockWithRecovery(fd.get('code'));
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
      return renderLock('unlock', 'Connexion annulée : LuxInterventions reste ouvert sur l’autre appareil.');
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
function startSession() {
  lockEl.hidden = true;
  setHtml(lockEl, '');
  appEl.hidden = false;
  lastActive = Date.now();
  clearInterval(idleTimer);
  idleTimer = setInterval(() => {
    if (!vault.unlocked) return;
    if (Date.now() - lastActive > lockMinutes() * 60000) lockNow('Verrouillé après inactivité.');
    else if (document.visibilityState === 'visible') { vault.sync(); if (Date.now() - lastInbox > 180000) { lastInbox = Date.now(); inboxSync(); chatPoll(); toolsLoad(true); } }
  }, 30000);
  renderShell();
  applyBrand();
  fixIdentity().catch(() => {});
  go(location.hash.slice(2) || 'dashboard', true);
  vault.sync();
  setTimeout(async () => {
    await refreshIcs(false);
    // Une fois par jour : republier les pages locataires (dates glissantes sur 13 mois)
    let d = '';
    try { d = localStorage.getItem('aresPubDay') || ''; } catch {}
    if (d !== today() && (await publishPub())) try { localStorage.setItem('aresPubDay', today()); } catch {}
    await espaceSync();
    await inboxSync();
    await chatPoll();
    await toolsLoad(true);
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
  if (kind === 'session-lost') lockNow(`LuxInterventions a été ouvert sur ${vault.sessionLostBy || 'un autre appareil'} : cet appareil a été déconnecté.`);
});

// ───────────────────────── Coquille ─────────────────────────
function renderShell() {
  const navBtn = ([id, label, ic]) => html`<button class="navbtn" data-action="go" data-to="${id}">${icon(ic)}<span>${label}</span></button>`;
  setHtml(appEl, html`
    <nav class="sidenav" aria-label="Navigation">
      <div class="brand"><img class="brand-mark" src="${APP_BRAND.logo}" alt="" width="36" height="36"><span>LuxInterventions<small>Gestion locative</small></span></div>
      ${NAV.map(navBtn)}
      <div class="spacer"></div>
      <button class="navbtn" data-action="lock">${icon('lock')}<span>Verrouiller</span></button>
    </nav>
    <div>
      <header class="topbar">
        <div class="brand"><img class="brand-mark" src="${APP_BRAND.logo}" alt="" width="36" height="36"><span>LuxInterventions</span></div>
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

// ── Toutes les sections de l'app : un clic ouvre / ferme, ouvertes elles brillent (lumière chaude) ──
// Un titre de section (.section-label) + son bloc, ou une carte avec titre (.card-title), deviennent repliables.
// Les longues listes démarrent fermées (avec le nombre de lignes) ; le choix est mémorisé sur cet appareil.
const foldPref = (() => { try { return JSON.parse(localStorage.getItem('aresFolds2') || '{}'); } catch { return {}; } })();
let foldScope = '', foldAllOpen = false;
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
function renderView() {
  const view = $('#view');
  if (!view || !vault.unlocked) return;
  const active = document.activeElement;
  const keepSearch = active && active.name === 'search' ? active.selectionStart : null;
  setHtml(view, VIEWS[ui.route]());
  enhanceFolds(view, '', false);
  if (keepSearch != null) {
    const s = view.querySelector('[name=search]');
    if (s) { s.focus(); s.setSelectionRange(keepSearch, keepSearch); }
  }
}

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
const dfold = (key, title, sumTxt, body, style = '') => html`<details class="card dfold" data-dfold="${key}" style="${style}" ${foldOpen.has(key) ? new Raw('open') : ''}><summary><h3>${title}</h3><span class="sum">${sumTxt}</span></summary><div class="dfold-body">${body}</div></details>`;
function mtCard() {
  const t0 = today(), t1 = addDays(t0, 1);
  const items = agenda(t0, t1);
  const lateN = tacheToDo().filter((t) => t.date && t.date < t0).length;
  if (!items.length && !lateN) return '';
  // « À sortir » selon la règle de chaque collecte : ce soir (passage demain) ou ce matin (passage aujourd'hui)
  const tonight = items.filter((x) => x.kind === 'collecte' && x.d === t1 && x.c.sortie !== 'jour');
  const thisMorning = items.filter((x) => x.kind === 'collecte' && x.d === t0 && x.c.sortie === 'jour');
  const binList = (arr) => arr.map((x) => DECHETS[x.c.cat].short + ' (' + immName(x.c.immId) + (x.c.heure ? ', ' + x.c.heure : '') + ')').join(', ');
  const nT = items.filter((x) => x.kind === 'tache').length;
  const sumTxt = [nT ? plural(nT, 'intervention') + ' (aujourd’hui / demain)' : '', lateN ? `${lateN} en retard` : '', thisMorning.length ? '🗑️ poubelles ce matin' : tonight.length ? '🗑️ poubelles ce soir' : ''].filter(Boolean).join(' · ') || 'rien de prévu';
  return dfold('mt', 'Maintenance', sumTxt, html`
    ${thisMorning.length ? html`<div class="alert warn" style="margin-bottom:8px">${icon('alert')}<div><b>Ce matin : sortir les poubelles</b> (passage aujourd'hui) — ${binList(thisMorning)}</div></div>` : ''}
    ${tonight.length ? html`<div class="alert warn" style="margin-bottom:8px">${icon('alert')}<div><b>Ce soir : sortir les poubelles</b> (passage demain) — ${binList(tonight)}</div></div>` : ''}
    ${lateN ? html`<div class="alert bad" style="margin-bottom:8px">${icon('alert')}<div>${plural(lateN, 'intervention')} en retard</div></div>` : ''}
    ${items.length ? html`<div class="list">${items.map((x) => html`${agendaRow(x)}`)}</div>` : ''}
    <button class="btn sm ghost" style="margin-top:8px" data-action="go" data-to="maintenance">${icon('tool')} Ouvrir la maintenance</button>`, 'margin-top:10px');
}
// Légende sous le planning et les travaux : feu tricolore + icônes des types
const mtLegend = () => html`<div class="card legend" style="margin-top:14px">
  <div class="legend-row">${['green', 'yellow', 'red'].map((k) => html`<span class="lg"><span class="light light-${k}"></span>${LIGHTS[k]}</span>`)}</div>
  <div class="legend-row">${Object.values(TACHE_TYPES).map((t) => html`<span>${t}</span>`)}<span>🗑️ Collecte des déchets</span></div>
</div>`;
function agendaRow(x) {
  if (x.kind === 'collecte') {
    const c = x.c, k = DECHETS[c.cat];
    return html`<button class="row" data-action="edit-collecte" data-id="${c.id}">${light(sortieDay(c, x.d))}
      <span class="grow"><span class="title" style="display:block;white-space:normal">🗑️ <span class="dot inline" style="background:${k.color}"></span> ${k.short} — ${immName(c.immId)}</span><span class="meta" style="white-space:normal"><b>Passage ce jour</b> · ${sortieText(c, x.d)} · ${LIEUX[c.lieu] || ''}${c.note ? ' · ' + c.note : ''}</span></span></button>`;
  }
  return tacheRow(x.t, x);
}
function tacheRow(t, x = {}) {
  const who = intervName(t.intervenantId);
  const when = t.recur ? `${RECURS[t.recur].toLowerCase()} depuis le ${fmtDate(t.date)}` : t.statut === 'fait' ? `terminée le ${fmtDate(t.doneDate)}` : t.date ? (x.late || t.date < today() ? `prévue le ${fmtDate(t.date)} — en retard` : `prévue le ${fmtDate(t.date)}`) : 'date à fixer';
  const due = t.statut === 'fait' ? '' : x.d || (t.recur ? recurDates(t.date, t.recur, today(), addDays(today(), 62), t.fin)[0] : t.date);
  return html`<div class="row">${t.statut === 'fait' ? '' : light(due)}
    <button class="grow" style="background:none;border:0;font:inherit;color:inherit;text-align:left;cursor:pointer;min-width:0" data-action="edit-tache" data-id="${t.id}">
      <span class="title" style="display:block">${tacheIcon(t.type)} ${t.titre}</span>
      <span class="meta" style="white-space:normal">${placeName(t)}${who ? ' · ' + who : ' · intervenant à choisir'} · ${when}${t.cout ? ' · ' + money(t.cout) : ''}</span>
    </button>
    ${!t.recur && t.statut !== 'fait' ? html`<button class="btn sm" data-action="tache-done" data-id="${t.id}">${icon('check')} Fait</button>` : t.statut === 'fait' ? html`<span class="badge ok">✓</span>` : ''}
  </div>`;
}
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
    <p class="pr-sub" style="margin-top:14px">Une question ? ${societe().nom || 'NOBIS s.a.r.l.'}${societe().tel ? ' · ' + societe().tel : ''}</p>`;
}
const logOptions = (immId, sel) => html`<option value="">Parties communes / tout l'immeuble</option>${logsOf(immId).map((g) => html`<option value="${g.id}" ${g.id === sel ? new Raw('selected') : ''}>${g.nom}</option>`)}`;
// Intervention terminée avec un coût : proposer de l'ajouter aux dépenses de l'immeuble (une seule fois)
// Coût d'une intervention terminée → dépense de l'appartement (ou des parties communes), automatiquement.
// Coût changé → dépense corrigée ; coût effacé ou intervention ré-ouverte → dépense retirée.
const depCat = (t) => (t.type === 'nettoyage' || t.type === 'entretien' ? 'entretien' : t.type === 'reparation' || t.type === 'gros' ? 'reparation' : 'autre');
async function syncDepense(t, quiet) {
  t = t && vault.get('taches', t.id);
  if (!t || t.recur) return;
  const dep = t.depId ? vault.get('depenses', t.depId) : null;
  const want = t.statut === 'fait' && t.cout > 0;
  const who = intervName(t.intervenantId);
  const rec = { immId: t.immId, logId: t.logId || '', desc: t.titre + (who ? ' — ' + who : ''), montant: t.cout, date: t.doneDate || today(), cat: depCat(t), tacheId: t.id };
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
async function setLogo(file) {
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, 400 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const url = c.toDataURL('image/png');
    const logo = url.length < 180000 ? url : c.toDataURL('image/jpeg', 0.85);
    await vault.mutate((tx) => tx.put('reglages', { id: 'main', logo }), 'Logo de la société', socName());
    applyBrand();
    toast('Logo enregistré');
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
// Interventions terminées avant ce changement, avec un coût jamais compté
const depMissing = () => vault.list('taches').filter((t) => !t.recur && !t.depSkip && t.statut === 'fait' && t.cout > 0 && !(t.depId && vault.get('depenses', t.depId)));

// ───────────────────────── Vues ─────────────────────────
// ───── Locataire de l'année : tours des poubelles faits, tous immeubles confondus ─────
async function champLoad(force) {
  if (!vault.unlocked || (ui.champBusy && !force)) return;
  if (!force && ui.champAt && Date.now() - ui.champAt < 60000) return;
  ui.champBusy = true;
  ui.chatCache = ui.chatCache || {};
  for (const im of vault.list('immeubles').filter(binsOn)) {
    for (const [gk, g] of Object.entries(im.chats || {})) {
      try { ui.chatCache[g.id] = await chatRead(g); await binRecord(vault.get('immeubles', im.id), gk, g, ui.chatCache[g.id]); } catch { /* hors ligne */ }
    }
  }
  ui.champAt = Date.now();
  ui.champBusy = false;
  if (ui.route === 'champions') renderView();
}
function champScores(year) {
  const sc = {};
  const add = (id, k, imId) => { const x = sc[id] || (sc[id] = { done: 0, forgot: 0, imId }); x[k]++; };
  for (const im of vault.list('immeubles')) {
    const logs = im.binLog || {};
    const seen = new Set();
    for (const [gk, g] of Object.entries(im.chats || {})) {
      seen.add(gk);
      for (const e of binGroupPlan(im, gk, g, (ui.chatCache || {})[g.id], year + '-12-31').filter((x) => x.p.startsWith(year + '-'))) {
        if (e.done) add(e.done, 'done', im.id);
        if (e.forgot) add(e.who, 'forgot', im.id);
      }
    }
    // fils disparus (habitants partis, groupes changés) : leur journal compte encore
    for (const [gk, log] of Object.entries(logs)) {
      if (seen.has(gk)) continue;
      for (const [pDate, x] of Object.entries(log)) if (pDate.startsWith(year + '-')) { if (x.d) add(x.d, 'done', im.id); if (x.f) add(x.w, 'forgot', im.id); }
    }
  }
  return Object.entries(sc).filter(([id]) => vault.get('locataires', id)).sort((a, b) => b[1].done - a[1].done || a[1].forgot - b[1].forgot);
}

const VIEWS = {
  champions() {
    setTimeout(() => champLoad(), 0);
    const cy = new Date().getFullYear();
    const y = ui.champYear || cy;
    const rows = champScores(y);
    const prizes = (vault.get('reglages', 'champions') || {}).prizes || {};
    const medal = ['🥇', '🥈', '🥉'];
    const who = (id) => vault.get('locataires', id) || {};
    const place = (id, imId) => [logName(who(id).logId), immName(who(id).immId || imId)].filter(Boolean).join(' · ');
    const podium = rows.filter(([, v]) => v.done > 0).slice(0, 3);
    return html`
      ${pageHead('🏆 Locataire de l’année', 'Classement des tours des poubelles faits, dans tous les immeubles. Les 3 premiers gagnent… une pizza 🍕')}
      <div class="chips" style="margin-bottom:14px">${[cy, cy - 1].map((yy) => html`<button class="chip" data-action="champ-year" data-id="${yy}" aria-pressed="${yy === y}">${yy}</button>`)}
        <button class="chip" data-action="champ-refresh">${icon('sync')} Actualiser</button></div>
      ${podium.length ? html`<div class="metrics" style="margin-bottom:14px">${podium.map(([id, v], i) => {
        const pz = (prizes[y] || {})[id];
        return html`<div class="metric" style="text-align:center;border:2px solid ${['#d4a017', '#9ca3af', '#b45309'][i]}">
          <div style="font-size:40px;line-height:1.1">${medal[i]}</div>
          <div class="val" style="font-size:20px">${fullName(who(id))}</div>
          <div class="sub">${place(id, v.imId)}${isGone(who(id)) ? ' · parti' : ''}</div>
          <div style="margin:8px 0;font-size:18px;font-weight:700">${v.done} ✅</div>
          ${pz ? html`<button class="btn sm" data-action="champ-pizza" data-id="${id}">🍕 Offerte le ${fmtDate(pz)}</button>` : html`<button class="btn sm primary" data-action="champ-pizza" data-id="${id}">🍕 Pizza offerte</button>`}
        </div>`;
      })}</div>` : html`<div class="alert info" style="margin-bottom:14px">${icon('trophy')}<div>Pas encore de tours faits en ${y}. Le classement se remplit tout seul quand les locataires touchent « ✅ Fait » dans leur app (tour des poubelles, dans chaque immeuble → 💬 Messages).</div></div>`}
      ${rows.length ? html`<div class="section-label">Classement ${y}</div>
        <div class="list">${rows.map(([id, v], i) => html`<button class="row" data-action="open-loc" data-id="${id}">
          <span class="avatar">${v.done > 0 && i < 3 ? medal[i] : i + 1}</span>
          <span class="grow"><span class="title" style="display:block">${fullName(who(id))}</span><span class="meta">${place(id, v.imId)}${isGone(who(id)) ? ' · parti' : ''}</span></span>
          <span style="text-align:right"><b>${v.done} ✅</b>${v.forgot ? html`<span class="tiny muted" style="display:block">${v.forgot} oubli${v.forgot > 1 ? 's' : ''}</span>` : ''}</span></button>`)}</div>` : ''}
      <p class="tiny muted" style="margin-top:12px">1 tour fait = 1 point (« ✅ Fait » ou « 🙋 Je l’ai fait à sa place »). À égalité, celui qui a le moins d’oublis passe devant. Le classement repart de zéro chaque 1er janvier ; l’année précédente reste consultable.</p>`;
  },

  maintenance() {
    const tab = ui.mtTab || 'planning';
    const imms = vault.list('immeubles').filter((im) => !immGone(im)).sort(byAddr);
    const f = ui.immFilter && imms.some((im) => im.id === ui.immFilter) ? ui.immFilter : '';
    const chips = imms.length > 1 ? html`<div class="chips" style="margin-bottom:14px">
      <button class="chip" data-action="imm-filter" data-id="" aria-pressed="${!f}">Tous</button>
      ${imms.map((im) => html`<button class="chip" data-action="imm-filter" data-id="${im.id}" aria-pressed="${f === im.id}">${im.adresse}</button>`)}</div>` : '';
    const add = tab === 'pub' ? html`<button class="btn primary" data-action="new-pub" data-imm="${f}">${icon('plus')} Annonce</button>` : tab === 'avis' ? html`<button class="btn primary" data-action="new-avis" data-imm="${f}">${icon('plus')} Avis</button>` : tab === 'intervenants' ? html`<button class="btn primary" data-action="new-interv">${icon('plus')} Intervenant</button>`
      : tab === 'dechets' ? html`<button class="btn primary" data-action="new-collecte" data-imm="${f}">${icon('plus')} Collecte</button>`
      : html`<button class="btn primary" data-action="new-tache" data-imm="${f}">${icon('plus')} Intervention</button>`;
    const tabs = html`<div class="tabs" role="tablist" style="max-width:560px">${[['planning', 'Planning'], ['taches', `Travaux (${tacheToDo().length})`], ['dechets', 'Déchets'], ['avis', 'Avis'], ['pub', '📣 Publicité'], ['intervenants', 'Équipe']].map(([k, l]) => html`<button class="tab" role="tab" aria-selected="${tab === k}" data-action="mt-tab" data-id="${k}">${l}</button>`)}</div>`;
    let body;
    if (tab === 'planning') {
      const from = today(), to = addDays(from, 13);
      const items = agenda(from, to, f);
      const days = [...new Set(items.map((x) => x.d))];
      body = days.length ? days.map((d) => html`<div class="section-label">${d === from ? "Aujourd'hui" : d === addDays(from, 1) ? 'Demain' : ''} ${fmtDay(d)}</div>
        <div class="list" style="margin-bottom:10px">${items.filter((x) => x.d === d).map(agendaRow)}</div>`)
        : empty('calendar', 'Rien de prévu dans les 14 prochains jours.', html`<button class="btn primary" data-action="new-tache" data-imm="${f}">${icon('plus')} Planifier une intervention</button>`);
      body = html`<p class="small muted" style="margin:0 0 6px">Les 14 prochains jours : nettoyages, réparations et jours de collecte des déchets.</p>${body}${mtLegend()}`;
    } else if (tab === 'taches') {
      const all = vault.list('taches').filter((t) => (!f || t.immId === f) && !immGone(vault.get('immeubles', t.immId)));
      const open = all.filter((t) => !t.recur && t.statut !== 'fait').sort((a, b) => (a.date || '9').localeCompare(b.date || '9'));
      const recur = all.filter((t) => t.recur).sort((a, b) => immName(a.immId).localeCompare(immName(b.immId)));
      const done = all.filter((t) => !t.recur && t.statut === 'fait').sort((a, b) => (b.doneDate || '').localeCompare(a.doneDate || '')).slice(0, 30);
      const list = (arr) => html`<div class="list" style="margin-bottom:14px">${arr.map(tacheRow)}</div>`;
      body = all.length ? html`
        <div class="section-label">À faire (${open.length})</div>${open.length ? list(open) : html`<p class="muted small">Rien à faire. 👍</p>`}
        ${recur.length ? html`<div class="section-label">Récurrentes (${recur.length})</div>${list(recur)}` : ''}
        ${done.length ? html`<div class="section-label">Terminées récemment</div>${list(done)}` : ''}${mtLegend()}`
        : empty('tool', 'Aucune intervention.', html`<button class="btn primary" data-action="new-tache" data-imm="${f}">${icon('plus')} Nouvelle intervention</button>`);
    } else if (tab === 'avis') {
      const all = vault.list('avis').filter((a) => !isPub(a) && (!f || !a.immId || a.immId === f)).sort((a, b) => (b.debut || '').localeCompare(a.debut || ''));
      const actifs = all.filter((a) => !a.fin || a.fin >= today()), passes = all.filter((a) => a.fin && a.fin < today()).slice(0, 10);
      const row = (a) => html`<button class="row" data-action="edit-avis" data-id="${a.id}"><span class="grow"><span class="title" style="display:block;white-space:normal">📢 ${a.texte.slice(0, 140)}</span>
        <span class="meta">${a.immId ? immName(a.immId) : 'Tous les immeubles'} · ${a.debut ? 'du ' + fmtDate(a.debut) : ''}${a.fin ? ' au ' + fmtDate(a.fin) : ''}</span></span></button>`;
      body = html`<p class="small muted" style="margin:0 0 10px">Messages affichés dans l'espace des locataires (coupure d'eau, travaux, nettoyage de la cave…).</p>
        ${actifs.length ? html`<div class="list" style="margin-bottom:14px">${actifs.map(row)}</div>` : empty('msg', 'Aucun avis en cours.', html`<button class="btn primary" data-action="new-avis" data-imm="${f}">${icon('plus')} Nouvel avis</button>`)}
        ${passes.length ? html`<div class="section-label">Terminés</div><div class="list">${passes.map(row)}</div>` : ''}`;
    } else if (tab === 'pub') {
      const all = vault.list('avis').filter((a) => isPub(a) && (!f || !a.immId || a.immId === f)).sort((a, b) => (b.debut || '').localeCompare(a.debut || ''));
      const on = all.filter((a) => !a.fin || a.fin >= today()), off = all.filter((a) => a.fin && a.fin < today()).slice(0, 20);
      const left = (a) => { if (!a.fin) return 'sans fin'; const n = Math.round((new Date(a.fin + 'T12:00:00') - new Date(today() + 'T12:00:00')) / 864e5); return a.debut > today() ? `à partir du ${fmtDate(a.debut)}` : n <= 0 ? 'dernier jour' : `encore ${plural(n, 'jour')}`; };
      const row = (a) => html`<button class="row" data-action="edit-pub" data-id="${a.id}"><span class="grow"><span class="title" style="display:block;white-space:normal">${(PUB_CATS[a.cat] || PUB_CATS.autre).split(' ')[0]} <b>${a.nom}</b></span>
        <span class="meta" style="display:block;white-space:normal">📍 ${a.adresse}${a.texte ? ' · ' + a.texte.slice(0, 90) : ''}</span>
        <span class="meta"><span>${a.immId ? immName(a.immId) : 'Tous les immeubles'}</span>${a.fin ? html` · <span>${fmtDate(a.debut)} → ${fmtDate(a.fin)}</span>` : ''}</span></span>
        <span class="badge ${a.fin && a.fin < today() ? '' : a.fin && a.fin <= addDays(today(), 3) ? 'warn' : 'ok'}">${a.fin && a.fin < today() ? 'expirée' : left(a)}</span></button>`;
      body = html`<p class="small muted" style="margin:0 0 10px">Annonces de partenaires (pizzerias, bars / pubs, bricolage, meubles…) dans l'app des locataires, avec la carte sous « Bonjour ». Chaque annonce disparaît seule à la fin de sa durée.</p>
        ${on.length ? html`<div class="list" style="margin-bottom:14px">${on.map(row)}</div>` : empty('msg', 'Aucune annonce en cours.', html`<button class="btn primary" data-action="new-pub" data-imm="${f}">${icon('plus')} Nouvelle annonce</button>`)}
        ${off.length ? html`<div class="section-label">Expirées (touchez pour republier)</div><div class="list">${off.map(row)}</div>` : ''}`;
    } else if (tab === 'dechets') {
      const shown = f ? imms.filter((im) => im.id === f) : imms;
      const y = new Date().getFullYear();
      body = html`<p class="small muted" style="margin:0 0 10px">Jours de collecte de chaque immeuble (à mettre à jour chaque année avec le calendrier de la commune). Imprimez l'affiche pour les locataires.</p>
        ${shown.map((im) => {
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
        })}`;
      if (!shown.length) body = empty('building', 'Ajoutez d’abord un immeuble.');
    } else {
      const ints = vault.list('intervenants').sort((a, b) => (a.cat === 'specialise') - (b.cat === 'specialise') || Object.keys(METIERS).indexOf(a.metier) - Object.keys(METIERS).indexOf(b.metier) || intervFull(a).localeCompare(intervFull(b)));
      const nNew = sum(ints, (i) => i.feedNew || 0);
      body = ints.length ? html`${eqTodayHtml()}<button class="btn block" style="margin-bottom:12px" data-action="eq-feed">📋 Activité de l’équipe${nNew ? html` <span class="badge bad">${nNew} nouveau${nNew > 1 ? 'x' : ''}</span>` : ''}</button><div class="list">${ints.map((i) => {
        const n = vault.list('taches').filter((t) => t.intervenantId === i.id && (t.recur || t.statut !== 'fait')).length;
        const tel = (i.tel || '').replace(/[^\d+]/g, '');
        const ab = absOn(i, today());
        return html`<div class="row"><span class="avatar">${(i.prenom || i.nom).slice(0, 2).toUpperCase()}</span>
          <button class="grow" style="background:none;border:0;font:inherit;color:inherit;text-align:left;cursor:pointer;min-width:0" data-action="open-interv" data-id="${i.id}"><span class="title" style="display:block">${intervFull(i)}${i.espace && i.espace.on ? ' 📱' : ''}${ab ? html` <span class="badge ${ab.type === 'maladie' ? 'bad' : 'warn'}">${ABS_TYPES[ab.type]}${ab.fin ? ' → ' + fmtDate(ab.fin) : ''}</span>` : ''}</span><span class="meta">${METIERS[i.metier] || i.metier} · ${{ interne: 'interne', societe: 'société', prive: 'privé' }[i.genre || 'interne']} · ${(i.cat || 'quotidien') === 'specialise' ? 'spécialisé' : 'quotidien'}${i.tarif ? ' · ' + i.tarif : ''}${n ? ' · ' + plural(n, 'intervention') + ' en cours' : ''}</span></button>
          ${tel ? html`<a class="btn icon sm" href="tel:${tel}" aria-label="Appeler">${icon('phone')}</a>` : ''}
        </div>`;
      })}</div>` : empty('users', 'Aucun intervenant. Ajoutez la femme de ménage et les artisans (menuisier, électricien, plombier, chauffagiste, maçon…).', html`<button class="btn primary" data-action="new-interv">${icon('plus')} Ajouter un intervenant</button>`);
    }
    return html`${pageHead('Maintenance', 'Nettoyage, réparations et collecte des déchets', add)}${tabs}${tab !== 'intervenants' ? chips : ''}${body}`;
  },

dashboard() {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const locs = currentLocs().sort(byName);
    const due = locs.filter((l) => isDue(l, y, m));
    const expected = sum(due, (l) => dueAmount(l, y, m));
    const received = sum(vault.list('locataires'), (l) => { const p = payment(l.id, y, m); return p ? paidAmount(p, l) : 0; });
    const todo = due.filter((l) => payState(l, y, m).rest > 0.009);
    const revisions = locs.filter((l) => l.revision && daysUntil(l.revision) <= 30).sort((a, b) => a.revision.localeCompare(b.revision));
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
      return html`${pageHead('Bienvenue', 'Commencez par ajouter un immeuble, puis ses logements et locataires.')}
        ${empty('building', 'Aucun immeuble pour le moment.', html`<button class="btn primary" data-action="new-imm">${icon('plus')} Ajouter un immeuble</button>`)}`;
    }

    const nudge = vault.hasRecovery === false ? html`<div class="alert warn" style="margin-bottom:14px;align-items:center">${icon('shield')}<div style="flex:1"><b>Pas encore de clé de secours.</b> Sans elle, une clé d'accès oubliée rend les données irrécupérables.</div><button class="btn sm" data-action="make-recovery">Créer</button></div>` : '';
    const sig = newSignals();
    const sigBox = sig.length ? html`<div class="card" style="margin-bottom:14px;border:2px solid var(--red)">
        <div class="card-title" style="margin-bottom:8px"><h3>📩 <span>${sig.length > 1 ? sig.length + " nouveaux messages" : "1 nouveau message"}${sig.every((t) => !t.byInterv) ? (sig.length > 1 ? ' de locataires' : ' de locataire') : ''}</span></h3></div>
        <div class="stack">${sig.slice(0, 8).map((t) => { const l = vault.get('locataires', t.locId) || {}, w = t.byInterv ? vault.get('intervenants', t.byInterv) : null; const n = signalPhotos(t); return alertBtn('bad', 'msg', 'open-signal', t.id, html`<b>${w ? '👷 ' + intervFull(w) : fullName(l)}</b> · ${logName(l.logId) || immName(t.immId)} — ${t.titre.replace(/^Signalement : /, '').replace(/^Problème signalé par [^:]+ : /, '⚠️ ')}<div class="tiny">${fmtDateTime(t.sentAt)}${n ? ` · 📷 ${n} photo${n > 1 ? 's' : ''}` : ''} · touchez pour lire</div>`); })}</div>
      </div>` : '';
    const chatNew = Object.entries(ui.chatNew || {}).filter(([imId, n]) => n && vault.get('immeubles', imId));
    const chatBox = chatNew.length ? html`<div class="stack" style="margin-bottom:14px">${chatNew.map(([imId, n]) => alertBtn('info', 'msg', 'open-chat', imId, html`💬 <b>${n} nouveau${n > 1 ? 'x' : ''} message${n > 1 ? 's' : ''}</b> entre les habitants — ${immName(imId)}<div class="tiny">touchez pour lire</div>`))}</div>` : '';
    const virs = vault.list('locataires').filter((l) => l.virSignal && !l.virSignal.vu);
    const edlNew = [...new Set(edlOutNew().map((d) => d.logId))].filter((id) => vault.get('logements', id));
    const edlBox = edlNew.length ? html`<div class="stack" style="margin-bottom:14px">${edlNew.map((id) => { const ph = edlOutNew().filter((d) => d.logId === id), w = vault.get('locataires', ph[0].locId); return alertBtn('info', 'camera', 'open-edl-out', id, html`📷 <b>${plural(ph.length, 'photo')} de sortie</b> à contrôler — ${logName(id)}${w ? ' · ' + fullName(w) : ''}<div class="tiny">touchez pour comparer avec vos photos d’entrée</div>`); })}</div>` : '';
    const virBox = virs.length ? html`<div class="stack" style="margin-bottom:14px">${virs.map((l) => alertBtn('info', 'wallet', 'open-vir', l.id, html`💳 <b>${fullName(l)}</b> dit avoir payé${l.virSignal.montant ? html` <b>${money(l.virSignal.montant)}</b>` : ''} par ${PAY_VIA[l.virSignal.via || 'vir']} — ${l.virSignal.ref}<div class="tiny">${fmtDateTime(l.virSignal.t)} · vérifiez la réception, puis cochez le mois payé</div>`))}</div>` : '';
    const eqNew = sum(vault.list('intervenants'), (i) => i.feedNew || 0);
    const eqBox = eqNew ? html`<div class="stack" style="margin-bottom:14px">${alertBtn('info', 'users', 'eq-feed', '', html`👷 <b>${eqNew} nouvelle${eqNew > 1 ? 's' : ''} de l’équipe</b> (commencé, fini, pas fini, notes, photos…)<div class="tiny">touchez pour voir qui fait quoi, où et quand</div>`)}</div>` : '';
    const absNow = vault.list('intervenants').map((i) => [i, absOn(i, today())]).filter(([, a]) => a);
    const absSoon = vault.list('intervenants').map((i) => [i, (i.absences || []).find((a) => a.debut > today() && a.debut <= addDays(today(), 7))]).filter(([, a]) => a);
    const absBox = absNow.length || absSoon.length ? html`<div class="stack" style="margin-bottom:14px">${absNow.map(([i, a]) => { const n = vault.list('taches').filter((t) => t.intervenantId === i.id && (t.recur || t.statut !== 'fait')).length; return alertBtn(a.type === 'maladie' ? 'bad' : 'warn', 'calendar', 'open-interv', i.id, html`${ABS_TYPES[a.type]} : <b>${intervFull(i)}</b> absent${a.fin ? ' jusqu’au ' + fmtDate(a.fin) : ' (fin non connue)'}${n ? html` — <b>${plural(n, 'intervention')}</b> à vérifier` : ''}<div class="tiny">touchez pour la fiche</div>`); })}
      ${absSoon.map(([i, a]) => alertBtn('info', 'calendar', 'open-interv', i.id, html`${ABS_TYPES[a.type]} prévu : <b>${intervFull(i)}</b> du ${fmtDate(a.debut)}${a.fin ? ' au ' + fmtDate(a.fin) : ''}`))}</div>` : '';
    const toolsBox = ui.toolsPending ? html`<div class="stack" style="margin-bottom:14px">${alertBtn('warn', 'check', 'open-tools', '', html`🧰 <b>${ui.toolsPending} annonce${ui.toolsPending > 1 ? 's' : ''} à approuver</b> (don · prêt · location)<div class="tiny">touchez pour voir et approuver</div>`)}</div>` : '';
    return html`
      ${nudge}
      ${sigBox}
      ${chatBox}
      ${virBox}
      ${edlBox}
      ${eqBox}
      ${absBox}
      ${toolsBox}
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
        <button class="btn sm ghost" style="margin-top:8px" data-action="open-frais">${icon('edit')} Frais fixes</button>`, 'margin-top:10px')}

      ${mtCard()}
      ${late.length || expiring.length || leaving.length || arriving.length || vacants.length || revisions.length || outside.length || depMissing().length ? html`<div class="section-label">À surveiller</div><div class="stack">
        ${depMissing().length ? alertBtn('warn', 'wallet', 'dep-catchup', '', html`<b>${plural(depMissing().length, 'intervention')} terminée${depMissing().length > 1 ? 's' : ''} avec un coût</b> pas encore dans les dépenses (${money(sum(depMissing(), (t) => t.cout))}) — touchez pour vérifier et ajouter`) : ''}
        ${outside.map((l) => alertBtn('warn', 'calendar', 'fix-dates', l.id, html`<b>${fullName(l)}</b> — ${plural(outsidePays(l).length, 'loyer')} payé${outsidePays(l).length > 1 ? 's' : ''} hors des dates du contrat : touchez pour corriger`))}
        ${late.slice(0, 6).map(({ l, months }) => alertBtn(months.length >= 2 ? 'bad' : 'warn', 'alert', 'open-loc', l.id, html`<b>${fullName(l)}</b> — ${months.length} mois impayé${months.length > 1 ? 's' : ''} (${months.map((x) => MONTHS[x - 1]).join(', ')})`))}
        ${leaving.map((l) => alertBtn('warn', 'calendar', 'open-loc', l.id, html`<b>${fullName(l)}</b> quitte ${logName(l.logId) || 'le logement'} le ${fmtDate(l.sortie)}`))}
        ${arriving.map((l) => alertBtn('info', 'users', 'open-loc', l.id, html`<b>${fullName(l)}</b> arrive dans ${logName(l.logId) || immName(l.immId)} le ${fmtDate(l.debut)}`))}
        ${expiring.map(({ l, d }) => alertBtn('warn', 'calendar', 'renew', l.id, html`<b>${fullName(l)}</b> — fin de contrat ${d === 0 ? "aujourd'hui" : `dans ${plural(d, 'jour')}`} (${fmtDate(l.fin)}). Toucher pour prolonger.`))}
        ${revisions.map((l) => alertBtn('info', 'chart', 'index', l.id, html`<b>${fullName(l)}</b> — révision du loyer ${daysUntil(l.revision) < 0 ? 'prévue depuis le' : 'prévue le'} ${fmtDate(l.revision)} (${money(l.loyer)}). Toucher pour réviser.`))}
        ${vacants.slice(0, 6).map((g) => alertBtn('info', 'home', 'open-log', g.id, html`<b>${g.nom}</b> (${immName(g.immId)}) est vacant`))}
      </div>` : ''}

      <div class="section-label">À encaisser — ${MONTHS_FULL[m - 1]}</div>
      ${todo.length ? html`<div class="list">${todo.map((l) => html`
        <div class="row">
          <button class="avatar" style="border:0;cursor:pointer" data-action="open-loc" data-id="${l.id}">${initials(l)}</button>
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
      })}</div>`, 'margin-top:14px')}`;
  },

  immeubles() {
    const y = new Date().getFullYear();
    const every = vault.list('immeubles').sort(byAddr);
    const nGone = every.filter(immGone).length;
    const anciens = ui.immSeg === 'anciens' && nGone > 0;
    const imms = every.filter((im) => immGone(im) === anciens);
    return html`
      ${pageHead('Immeubles', `${plural(every.length - nGone, 'immeuble')} en gestion${nGone ? ' · ' + nGone + ' archivé' + (nGone > 1 ? 's' : '') : ''}`, html`<button class="btn primary desk-only" data-action="new-imm">${icon('plus')} Ajouter</button>`)}
      ${nGone ? html`<div class="tabs" role="tablist" style="max-width:380px">
        <button class="tab" role="tab" aria-selected="${!anciens}" data-action="imm-seg" data-id="actuels">En gestion</button>
        <button class="tab" role="tab" aria-selected="${anciens}" data-action="imm-seg" data-id="anciens">Plus en gestion (${nGone})</button>
      </div>` : ''}
      ${ui.mapImm && vault.get('immeubles', ui.mapImm) ? (() => { const mi = vault.get('immeubles', ui.mapImm); const qq = encodeURIComponent(mi.adresse + ', Luxembourg'); return html`<div class="card map-card" style="margin-bottom:14px;padding:0;overflow:hidden">
        <div style="display:flex;align-items:center;gap:8px;padding:10px 14px"><b style="flex:1">📍 ${mi.adresse}</b><a class="btn sm" href="https://www.google.com/maps/search/?api=1&query=${qq}" target="_blank" rel="noopener">Ouvrir dans Google Maps</a><button class="btn sm ghost" data-action="imm-map" data-id="">✕</button></div>
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
            ${ownerRent(im) ? html`<dt>Bail principal</dt><dd class="num">${money(ownerRent(im))} / mois</dd>` : ''}
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
      return html`<div class="card"><div class="card-title"><h3>${im.adresse}</h3><span class="badge ${level(pct(collected, due)) || 'ok'}">${pct(collected, due)}%</span></div>${rows}
        <div class="totals"><span>Échu à ce jour <b>${money(due)}</b></span><span>Reçu <b class="green">${money(paid)}</b></span><span>Impayé <b class="${rest > 0.009 ? 'red' : 'green'}">${money(rest)}</b></span></div></div>`;
    }).filter(Boolean);
    return html`
      ${pageHead('Paiements', 'Touchez un mois vide pour le marquer payé ; touchez un mois payé pour le montant, la quittance ou l’annulation.')}
      <div class="toolbar">
        ${yearSelect(y)}
        ${all.length > 1 ? html`<div class="chips pay-chips">
          <button class="chip" data-action="imm-filter" data-id="" aria-pressed="${!ui.immFilter}">Tous</button>
          ${all.map((im) => html`<button class="chip" data-action="imm-filter" data-id="${im.id}" aria-pressed="${ui.immFilter === im.id}">${im.adresse}</button>`)}
        </div>` : ''}
      </div>
      ${cards.length ? html`<div class="stack">${cards}</div>
        <div class="card" style="margin-top:12px;border-color:var(--accent)"><div class="card-title" style="margin:0"><h3>Total ${y}</h3></div>
        <div class="totals" style="background:none;padding:8px 0 0;margin:0"><span>Échu à ce jour <b>${money(gDue)}</b></span><span>Reçu <b class="green">${money(gPaid)}</b></span><span>Impayé <b class="${gRest > 0.009 ? 'red' : 'green'}">${money(gRest)}</b></span><span>Taux <b>${pct(gColl, gDue)}%</b></span></div></div>`
        : empty('wallet', 'Aucun locataire à afficher pour ' + y + '.')}`;
  },

  compta() {
    const y = ui.year, tab = ui.cpTab || 'journal';
    const per = ui.cpPer || (ui.cpPer = 'y');
    const soc = societe();
    const tabs = html`<div class="tabs" role="tablist" style="max-width:620px">${[['journal', 'Journal'], ['tva', 'TVA'], ['stats', 'Statistiques'], ['export', 'Export']].map(([k, l]) => html`<button class="tab" role="tab" aria-selected="${tab === k}" data-action="cp-tab" data-id="${k}">${l}</button>`)}</div>`;
    if (tab === 'stats') return html`${pageHead('Comptabilité', 'Journal, TVA, statistiques et export pour le comptable')}${tabs}${VIEWS.stats()}`;
    const perSel = html`<select data-input="cp-per" style="width:auto" aria-label="Période"><option value="y" ${per === 'y' ? new Raw('selected') : ''}>Toute l’année</option>${[1, 2, 3, 4].map((q) => html`<option value="q${q}" ${per === 'q' + q ? new Raw('selected') : ''}>Trimestre ${q}</option>`)}${MONTHS_FULL.map((mn, i) => html`<option value="m${i + 1}" ${per === 'm' + (i + 1) ? new Raw('selected') : ''}>${mn}</option>`)}</select>`;
    const [from, to] = cpRange(y, per);
    const all = journal(from, to);
    // Recherche (nom, libellé, immeuble, montant, date) et dates du / au
    const q = (ui.cpQ || '').trim().toLowerCase();
    const rows = all.filter((r) => (!ui.cpFrom || r.d >= ui.cpFrom) && (!ui.cpTo || r.d <= ui.cpTo)
      && (!q || [r.lib, r.cat, r.imm, r.d, fmtDate(r.d), money(r.ttc), String(r2(r.ttc))].join(' ').toLowerCase().includes(q)));
    const R = rows.filter((r) => r.sens === 'R'), D = rows.filter((r) => r.sens === 'D');
    const tR = sum(R, (r) => r.ttc), tD = sum(D, (r) => r.ttc);
    const tvaC = sum(R, (r) => r.tva), tvaD = sum(D, (r) => r.tva);
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
          <div class="search" style="flex:1 1 220px">${icon('search')}<input type="search" name="search" data-input="cp-q" value="${ui.cpQ || ''}" placeholder="Rechercher : nom, libellé, immeuble, montant, date…" autocomplete="off"></div>
          <label class="field" style="margin:0">Du<input type="date" data-input="cp-from" value="${ui.cpFrom || ''}"></label>
          <label class="field" style="margin:0">Au<input type="date" data-input="cp-to" value="${ui.cpTo || ''}"></label>
          ${q || ui.cpFrom || ui.cpTo ? html`<button class="btn sm ghost" data-action="cp-clear">✕ Effacer</button>` : ''}
        </div>
        ${q || ui.cpFrom || ui.cpTo ? html`<p class="small muted" style="margin:0 0 8px">${plural(rows.length, 'résultat')}</p>` : ''}
        ${(() => {
          if (!rows.length) return empty('file', q || ui.cpFrom || ui.cpTo ? 'Rien trouvé.' : 'Aucune écriture sur cette période.');
          // mois par mois, le plus récent d'abord ; « mois précédent » ajoute un mois à chaque fois
          const sorted = rows.slice().sort((a, b) => b.d.localeCompare(a.d) || a.sens.localeCompare(b.sens));
          const months = [...new Set(sorted.map((r) => r.d.slice(0, 7)))];
          // on part du mois en cours (les éventuels mois futurs restent visibles au-dessus)
          const cur = today().slice(0, 7);
          const start = Math.max(0, months.findIndex((k) => k <= cur));
          const n = (months.findIndex((k) => k <= cur) < 0 ? 0 : start) + Math.max(1, ui.cpMonths || 1);
          // en recherche (ou avec des dates) : tous les résultats d'un coup
          const all2 = q || ui.cpFrom || ui.cpTo;
          const shown = all2 ? months : months.slice(0, n);
          const next = all2 ? null : months[n];
          const mLabel = (k) => `${MONTHS_FULL[+k.slice(5, 7) - 1]} ${k.slice(0, 4)}`;
          return html`<div class="card" style="padding:0;overflow:auto"><table class="tbl cp-tbl"><thead><tr><th>Date</th><th>Libellé</th><th class="r">HT</th><th class="r">TVA</th><th class="r">TTC</th><th></th></tr></thead><tbody>
          ${shown.map((mk) => { const mr = sorted.filter((r) => r.d.startsWith(mk)); const rr = sum(mr.filter((r) => r.sens === 'R'), (r) => r.ttc), dd = sum(mr.filter((r) => r.sens === 'D'), (r) => r.ttc); return html`<tr class="cp-month"><td colspan="6"><b>${mLabel(mk)}</b> <span class="tiny muted">· recettes ${money(rr)} · dépenses ${money(dd)} · ${plural(mr.length, 'écriture')}</span></td></tr>
            ${mr.map((r) => html`<tr><td class="nowrap">${fmtDate(r.d)}</td><td><b>${r.cat}</b> · ${r.lib}${r.imm ? html`<div class="tiny muted">${r.imm}</div>` : ''}</td>
            <td class="r">${money(r.ttc - r.tva)}</td><td class="r">${r.tva ? money(r.tva) : '—'}</td><td class="r ${r.sens === 'R' ? 'green' : 'red'}">${r.sens === 'R' ? '' : '−'}${money(r.ttc)}</td>
            <td>${r.piece ? html`<button class="btn sm" data-action="open-doc" data-id="${r.piece}">📎</button>` : ''}</td></tr>`)}`; })}
          </tbody></table></div>
          ${next ? html`<button class="btn block" style="margin-top:12px" data-action="cp-more">⬇ Afficher le mois précédent (${mLabel(next)})</button><p class="tiny muted" style="text-align:center;margin:6px 0 0">${plural(shown.length, 'mois affiché')} sur ${months.length}</p>` : months.length > 1 ? html`<p class="tiny muted" style="text-align:center;margin:10px 0 0">Tous les mois sont affichés (${months.length}).</p>` : ''}`;
        })()}`;
    } else if (tab === 'tva') {
      const perT = soc.periode || 't';
      const periods = perT === 'm' ? MONTHS_FULL.map((_, i) => 'm' + (i + 1)) : perT === 'a' ? ['y'] : ['q1', 'q2', 'q3', 'q4'];
      const imms = vault.list('immeubles').filter((im) => !immGone(im)).sort(byAddr);
      body = html`${soc.assujetti === false ? html`<div class="alert info" style="margin-bottom:12px">${icon('alert')}<div>Votre société est indiquée comme <b>non assujettie</b> à la TVA (Réglages → Société). Les montants ci-dessous sont seulement indicatifs.</div></div>` : ''}
        <div class="card" style="padding:0;overflow:auto;margin-bottom:14px"><table class="tbl"><thead><tr><th>Période</th><th class="r">Collectée<br><small>loyers</small></th><th class="r">Déductible<br><small>factures</small></th><th class="r">Solde</th></tr></thead><tbody>
          ${periods.map((pp) => { const [a, b] = cpRange(y, pp); const rr = journal(a, b); const c = sum(rr.filter((r) => r.sens === 'R'), (r) => r.tva), dd = sum(rr.filter((r) => r.sens === 'D'), (r) => r.tva); return html`<tr><td>${cpLabel(y, pp)}</td><td class="r">${money(c)}</td><td class="r">${money(dd)}</td><td class="r"><b class="${c - dd < 0 ? 'green' : ''}">${c - dd < 0 ? '+' + money(dd - c) : money(c - dd)}</b><div class="tiny muted">${c - dd < 0 ? 'à récupérer' : c - dd > 0 ? 'à payer' : ''}</div></td></tr>`; })}
        </tbody></table></div>
        <div class="section-label">TVA sur les loyers, par structure</div>
        <p class="small muted" style="margin-top:0">Au Luxembourg, la location d’habitation est en principe <b>exonérée</b> de TVA ; les locaux commerciaux, bureaux ou garages peuvent y être soumis (option). Votre comptable vous confirme le bon taux.</p>
        <div class="list">${imms.map((im) => html`<div class="row"><span class="grow"><span class="title" style="display:block">${im.adresse}</span><span class="meta">${IMM_TYPES[im.type] || IMM_TYPES.immeuble}</span></span>
          <select data-input="tva-loyer" data-id="${im.id}" style="width:auto"><option value="0">Exonéré (0 %)</option>${tvaRates().map((r) => html`<option value="${r}" ${(im.tvaLoyer || 0) === r ? new Raw('selected') : ''}>${String(r).replace('.', ',')} %</option>`)}</select></div>`)}</div>
        <p class="tiny muted" style="margin-top:10px">Taux de ${(PAYS[soc.pays || 'LU'] || PAYS.LU)[0]} : ${tvaRates().map((r) => String(r).replace('.', ',') + ' %').join(' · ')} — modifiables dans Réglages → Société & associés. Aide à la préparation, à faire vérifier par votre comptable.</p>`;
    } else {
      body = html`<div class="card"><p style="margin-top:0">Téléchargez le <b>journal ${cpLabel(y, per)}</b> (recettes, dépenses, bailleurs, frais fixes, avec HT / TVA / TTC) pour votre comptable. Le fichier s’ouvre dans Excel, Numbers ou LibreOffice.</p>
        <button class="btn primary" data-action="cp-csv">${icon('download')} Télécharger le journal (Excel / CSV)</button>
        <button class="btn" data-action="cp-print">${icon('file')} Imprimer / PDF</button>
        <p class="tiny muted" style="margin-bottom:0">Les factures restent dans l’app (chiffrées) : ouvrez-les avec 📎 dans le Journal pour les télécharger une par une.</p></div>`;
    }
    return html`${pageHead('Comptabilité', 'Journal, TVA, statistiques et export pour le comptable')}${tabs}${tools}${body}`;
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
      ${pageHead('Statistiques', 'Vue financière annuelle et depuis l’origine', html`<div style="display:flex;gap:8px">${yearSelect(y)}<button class="btn" data-action="print-global">${icon('download')} Imprimer</button></div>`)}
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
        <button class="row" data-action="go" data-to="champions"><span class="avatar">🏆</span><span class="grow"><span class="title" style="display:block">Locataire de l’année</span><span class="meta">Classement des tours des poubelles · podium · pizza 🍕</span></span></button>
        <button class="row" data-action="esp-list">${icon('users')}<span class="grow"><span class="title" style="display:block">App des locataires</span><span class="meta">${vault.list('locataires').filter((x) => x.espace && x.espace.on).length} accès actifs — donner ou retirer l'accès</span></span></button>
        <button class="row" data-action="go" data-to="maintenance">${icon('tool')}<span class="grow title">Maintenance — nettoyage, réparations, déchets</span></button>
        <button class="row" data-action="go" data-to="compta">${icon('chart')}<span class="grow title">Comptabilité — journal, TVA, statistiques, export</span></button>
      </div>

      <div class="section-label">Gestion</div>
      <div class="list settings">
        <button class="row" data-action="open-tools"><span class="avatar">🧰</span><span class="grow"><span class="title" style="display:block">Don · prêt · location</span><span class="meta">Annonces des locataires sur le site${ui.toolsPending ? ` · ${ui.toolsPending} à approuver` : ''}</span></span></button>
        <button class="row" data-action="open-societe">${icon('building')}<span class="grow"><span class="title" style="display:block">Société & associés</span><span class="meta">${societe().nom || 'Nom de la société pour les quittances'} · ${associes().length ? associes().map((a) => `${a.nom} ${a.part}%`).join(', ') : 'aucun associé'}</span></span></button>
        <button class="row" data-action="open-frais">${icon('receipt')}<span class="grow"><span class="title" style="display:block">Frais fixes mensuels</span><span class="meta">Salaires, provisions… · ${money(fraisOfMonth(new Date().getFullYear(), new Date().getMonth() + 1))} / mois</span></span></button>
      </div>

      ${!standalone ? html`<div class="section-label">Application</div>
      <div class="list settings"><div class="row">${icon('phoneApp')}<span class="grow"><span class="title" style="display:block">Installer sur ce téléphone</span>
        <span class="meta" style="white-space:normal">${isIOS ? 'Safari : bouton Partager → « Sur l’écran d’accueil ».' : 'Ajoute l’icône LuxInterventions sur l’écran d’accueil, fonctionne hors ligne.'}</span></span>
        ${installPrompt ? html`<button class="btn sm primary" data-action="install">Installer</button>` : ''}</div></div>` : ''}

      <div class="section-label">Sécurité</div>
      <div class="list settings">
        <div class="row">${icon('lock')}<span class="grow title">Verrouillage automatique</span>
          <select data-input="lockmin" style="width:auto">${[5, 15, 30, 60].map((n) => html`<option value="${n}" ${lockMinutes() === n ? new Raw('selected') : ''}>${n} min</option>`)}</select></div>
        <div class="row">${icon('phoneApp')}<span class="grow"><span class="title" style="display:block">Un seul appareil connecté à la fois</span><span class="meta">Cet appareil : ${deviceLabel()}. Une connexion ailleurs déconnecte celui-ci.</span></span></div>
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
      <div class="section-label">Langue · Lingua · Sprache · Língua · Language · Idioma</div>
      <div class="chips" data-notr="1">${Object.entries(LANGS).map(([k, l]) => html`<button class="chip" data-action="set-lang" data-id="${k}" aria-pressed="${LANG === k}">${l}</button>`)}</div>
      <p class="tiny muted" style="margin-top:4px">Les quittances, reçus et relances aux locataires restent en français (documents officiels).</p>
      <p class="tiny muted" style="margin-top:28px;text-align:center"><span data-notr="1">LuxInterventions · ${APP_BRAND.legal}</span> · v${VERSION} · données chiffrées AES-256-GCM de bout en bout</p>`;
  },
};

// ───────────────────────── Feuilles (détails & formulaires) ─────────────────────────
const sheetEl = $('#sheet');
function openSheet(kind, id, tab, preset) {
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
sheetEl.addEventListener('close', () => (ui.sheet = null));
sheetEl.addEventListener('click', (e) => { if (e.target === sheetEl) closeSheet(); });

function renderSheet() {
  if (!ui.sheet || (!sheetEl.open && ui.sheet.rendered)) return;
  const s = ui.sheet;
  const r = SHEETS[s.kind](s);
  if (!r) return closeSheet();
  // Ne pas écraser une saisie en cours lors d'une mise à jour en arrière-plan.
  const focused = document.activeElement;
  if (s.rendered && (s.kind.endsWith('-form') || s.kind === 'relance' || (sheetEl.contains(focused) && focused.matches('input, textarea, select')))) return;
  sheetEl.className = 'sheet' + (r.narrow ? ' narrow' : '');
  setHtml(sheetEl, html`
    <div class="sheet-head"><h2>${r.title}</h2><button class="btn icon ghost" data-action="close-sheet" aria-label="Fermer">${icon('x')}</button></div>
    <div class="sheet-body">${r.body}</div>
    ${r.foot ? html`<div class="sheet-foot">${r.foot}</div>` : ''}`);
  s.rendered = true;
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

const PAY_NETS = { erc20: 'Ethereum (ERC-20)', trc20: 'Tron (TRC-20)', polygon: 'Polygon', bep20: 'BNB Chain (BEP-20)', sol: 'Solana' };
const netSelect = (name, cur) => html`<label class="field">Réseau<select name="${name}">${Object.entries(PAY_NETS).map(([k, v]) => html`<option value="${k}" ${cur === k ? new Raw('selected') : ''}>${v}</option>`)}</select></label>`;
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
const tabsBar = (tabs, cur) => html`<div class="tabs" role="tablist">${tabs.map(([k, label]) => html`<button class="tab" role="tab" aria-selected="${cur === k}" data-action="sheet-tab" data-id="${k}">${label}</button>`)}</div>`;
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
          return html`<option value="log:${g.id}" ${g.id === selLog ? new Raw('selected') : ''}>${g.nom}${logWhere(g) ? ' (' + logWhere(g) + ')' : ''}${occ.length ? ' — occupé (' + occ.map(fullName).join(', ') + ')' : ' — vacant'}</option>`;
        })}
        <option value="new:${im.id}">➕ Nouveau logement / local ici (chambre, appartement, garage…)</option>
        <option value="imm:${im.id}" ${!selLog && selImm === im.id ? new Raw('selected') : ''}>Toute la structure (pas de chambre / logement précis)</option>
      </optgroup>`)}
    </select></label>
    <div class="fields full" id="newLogWrap" hidden>
      ${field('Nom / numéro', 'newLogNom', '', { placeholder: 'ex. Chambre 3, Appartement 2B, Garage 12' })}
      ${logTypeSelect('newLogType', 'chambre')}
      ${field('Étage', 'newLogEtage', '', { placeholder: 'ex. RDC, 1er' })}
      ${field('Situé dans (facultatif)', 'newLogPartie', '', { placeholder: 'ex. ancien bar, appartement du 1er' })}
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
      <label class="field">Concerne<select name="logId"><option value="">Tout l'immeuble</option>${logs.map((g) => html`<option value="${g.id}">${g.nom}</option>`)}</select></label>
      <button class="btn primary full" type="submit">${icon('plus')} Ajouter la dépense</button>
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
  const list = months.map((x) => `${NAMES[lang][x.m - 1]} ${x.y} (${money(payState(l, x.y, x.m).rest)})`).join(', ') || '—';
  const where = [logName(l.logId), immName(l.immId)].filter(Boolean).join(', ');
  const sign = st.nom || 'NOBIS s.a.r.l.';
  const iban = st.iban ? { fr: `\nIBAN : ${st.iban}`, it: `\nIBAN: ${st.iban}`, en: `\nIBAN: ${st.iban}`, pt: `\nIBAN: ${st.iban}` }[lang] : '';
  const T = {
    fr: `Bonjour ${fullName(l)},\n\nSauf erreur de notre part, nous n'avons pas encore reçu le loyer de ${list} pour ${where}, soit ${money(total)} au total.\n\nMerci de procéder au règlement dès que possible, ou de nous contacter si le paiement a déjà été effectué.${iban}\n\nCordialement,\n${sign}`,
    it: `Buongiorno ${fullName(l)},\n\nsalvo errori, non abbiamo ancora ricevuto l'affitto di ${list} per ${where}, per un totale di ${money(total)}.\n\nLa preghiamo di effettuare il pagamento al più presto, o di contattarci se ha già pagato.${iban}\n\nCordiali saluti,\n${sign}`,
    en: `Hello ${fullName(l)},\n\nUnless we are mistaken, we have not yet received the rent for ${list} for ${where}, i.e. ${money(total)} in total.\n\nPlease make the payment as soon as possible, or contact us if it has already been made.${iban}\n\nKind regards,\n${sign}`,
    pt: `Olá ${fullName(l)},\n\nSalvo erro, ainda não recebemos a renda de ${list} referente a ${where}, num total de ${money(total)}.\n\nPedimos que efetue o pagamento o mais rapidamente possível, ou que nos contacte se já o fez.${iban}\n\nCom os melhores cumprimentos,\n${sign}`,
  };
  return { body: T[lang], total };
}

const SHEETS = {
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
  'interv-form'({ id }) {
    const i = id ? vault.get('intervenants', id) : { metier: 'menage', genre: 'interne', cat: 'quotidien' };
    if (id && !i) return null;
    const imms = vault.list('immeubles').filter((im) => !immGone(im)).sort(byAddr);
    const hOf = (j, k) => ((i.horaires || []).find((h) => h.j === j) || {})[k] || '';
    const sel = (name, opts, cur) => html`<select name="${name}">${Object.entries(opts).map(([k, v]) => html`<option value="${k}" ${cur === k ? new Raw('selected') : ''}>${v}</option>`)}</select>`;
    return {
      title: id ? 'Modifier la fiche' : 'Nouvelle personne',
      body: html`<form id="f" data-form="interv" class="fields">
        <input type="hidden" name="id" value="${id || ''}">
        <label class="field">Type${sel('genre', INT_GENRES, i.genre || 'interne')}</label>
        <label class="field">Catégorie${sel('cat', INT_CATS, i.cat || 'quotidien')}</label>
        ${field('Prénom', 'prenom', i.prenom, { attrs: 'autocomplete="off"' })}
        ${field('Nom (ou nom de la société)', 'nom', i.nom, { required: true, placeholder: 'ex. Rossi, Électricité Schmit…', attrs: 'autocomplete="off"' })}
        <label class="field">Métier / mansion${sel('metier', METIERS, i.metier)}</label>
        ${field('Tarif', 'tarif', i.tarif, { placeholder: 'ex. 25 €/h, forfait 80 €…' })}
        ${field('Adresse', 'adresse', i.adresse, { full: true, attrs: 'autocomplete="off"' })}
        ${field('Code postal et ville', 'ville', i.ville, { placeholder: 'L-1234 Luxembourg' })}
        ${field('Téléphone', 'tel', i.tel, { type: 'tel', placeholder: '+352 …' })}
        ${field('Email', 'mail', i.mail, { type: 'email', full: true })}
        ${field('RCS (société)', 'rcs', i.rcs, { placeholder: 'ex. B123456' })}
        ${field('N° TVA (société)', 'tva', i.tva, { placeholder: 'ex. LU12345678' })}
        <div class="section-label full" style="margin:10px 0 0">Horaire habituel (laisser vide les jours sans travail)</div>
        <div class="full hor-grid">${SEMAINE.map((jn, j) => html`<span class="hor-day">${jn}</span>
          <input name="h${j}d" type="time" value="${hOf(j, 'de')}" aria-label="${jn} de">
          <input name="h${j}a" type="time" value="${hOf(j, 'a')}" aria-label="${jn} à">
          <select name="h${j}i" aria-label="${jn} lieu"><option value="">— lieu —</option>${imms.map((im) => html`<option value="${im.id}" ${hOf(j, 'immId') === im.id ? new Raw('selected') : ''}>${im.adresse}</option>`)}</select>`)}</div>
        <label class="field full">Notes<textarea name="note" placeholder="Clés confiées, disponibilités…">${i.note || ''}</textarea></label>
      </form>`,
      foot: html`${id ? html`<button class="btn ghost danger" data-action="del-interv" data-id="${id}" aria-label="Supprimer">${icon('trash')}</button>` : ''}
        <button class="btn" data-action="close-sheet">Annuler</button><button class="btn primary" type="submit" form="f">Enregistrer</button>`,
    };
  },
  'eq-feed'() {
    return { title: 'Activité de l’équipe', body: html`${eqTodayHtml()}${eqFeedHtml('', 150)}`, foot: html`<button class="btn primary" data-action="close-sheet">OK</button>` };
  },
  // Fiche d'une personne : infos · horaire et heures du mois · absences (maladie avec certificat, congés…)
  interv({ id, tab }) {
    const i = vault.get('intervenants', id);
    if (!i) return null;
    tab = tab || 'fiche';
    const t0 = today();
    const cur = absOn(i, t0);
    const tel = (i.tel || '').replace(/[^\d+]/g, '');
    let body;
    if (tab === 'fiche') {
      const tasks = vault.list('taches').filter((t) => t.intervenantId === id && (t.recur || t.statut !== 'fait'));
      body = html`${cur ? html`<div class="alert ${cur.type === 'maladie' ? 'bad' : 'warn'}" style="margin-bottom:12px">${icon('calendar')}<div><b>${ABS_TYPES[cur.type]}</b> ${cur.fin ? 'jusqu’au ' + fmtDate(cur.fin) : '(fin non connue)'}${tasks.length ? html` · <b>${plural(tasks.length, 'intervention')}</b> à réassigner si besoin` : ''}</div></div>` : ''}
        <dl class="kv">
          ${kvRow('Type', INT_GENRES[i.genre || 'interne'])}
          ${kvRow('Catégorie', INT_CATS[i.cat || 'quotidien'])}
          ${kvRow('Métier', METIERS[i.metier] || i.metier || '—')}
          ${i.tarif ? kvRow('Tarif', i.tarif) : ''}
          ${i.adresse || i.ville ? kvRow('Adresse', [i.adresse, i.ville].filter(Boolean).join(', ')) : ''}
          ${i.tel ? kvRow('Téléphone', html`<a href="tel:${tel}">${i.tel}</a>`) : ''}
          ${i.mail ? kvRow('Email', html`<a href="mailto:${i.mail}">${i.mail}</a>`) : ''}
          ${i.rcs ? kvRow('RCS', i.rcs) : ''}${i.tva ? kvRow('N° TVA', i.tva) : ''}
        </dl>
        ${i.note ? html`<p class="small" style="white-space:pre-wrap">${i.note}</p>` : ''}
        ${tasks.length ? html`<div class="section-label">Interventions en cours</div><div class="list small">${tasks.map((t) => html`<button class="row" data-action="edit-tache" data-id="${t.id}"><span class="grow"><span class="title" style="display:block">${t.titre}</span><span class="meta">${placeName(t)} · ${t.recur ? 'récurrent' : fmtDate(t.date)}</span></span></button>`)}</div>` : ''}`;
    } else if (tab === 'heures') {
      const d = new Date();
      const months = [0, 1, 2].map((k) => { const x = new Date(d.getFullYear(), d.getMonth() - k, 1); return [x.getFullYear(), x.getMonth() + 1]; });
      const hs = (i.horaires || []).slice().sort((a, b) => a.j - b.j);
      body = html`<div class="section-label" style="margin-top:0">Horaire habituel</div>
        ${hs.length ? html`<div class="list small">${hs.map((h) => html`<div class="row"><span class="grow"><b>${SEMAINE[h.j]}</b> ${h.de}–${h.a}${h.immId ? ' · ' + immName(h.immId) : ''}</span><span class="meta">${fmtH(dayHours({ horaires: [h] }, h.j))}</span></div>`)}</div>
          <p class="tiny muted">Total par semaine : <b>${fmtH([0, 1, 2, 3, 4, 5, 6].reduce((n, j) => n + dayHours(i, j), 0))}</b></p>` : html`<p class="small muted">Pas d’horaire enregistré. Touchez « Modifier » pour l’ajouter.</p>`}
        <div class="section-label">Heures par mois (horaire − absences)</div>
        <div class="list small">${months.map(([yy, mm]) => { const r = intervMonth(i, yy, mm); return html`<div class="row"><span class="grow"><b>${MONTHS_FULL[mm - 1]} ${yy}</b><span class="meta" style="display:block">prévu ${fmtH(r.prevu)}${r.jm ? ` · 🤒 ${r.jm} j (−${fmtH(r.maladie)})` : ''}${r.jc ? ` · 🏖️ ${r.jc} j (−${fmtH(r.conges)})` : ''}${r.ja ? ` · 📌 ${r.ja} j (−${fmtH(r.autre)})` : ''}</span></span><b>${fmtH(r.net)}</b></div>`; })}</div>
        <p class="tiny muted">Calcul sur l’horaire habituel : pour les heures en plus ou en moins, ajoutez une note.</p>`;
    } else if (tab === 'act') {
      if (i.feedNew) setTimeout(() => vault.mutate((tx) => tx.put('intervenants', { id: i.id, feedNew: 0 }), 'Activité lue', intervFull(i), i.id), 0);
      body = eqFeedHtml(id, 120);
    } else if (tab === 'app') {
      const e = i.espace || {};
      if (!e.on) {
        body = html`<p style="margin-top:0">Donnez à <b>${intervFull(i)}</b> son <b>app de l’équipe</b> avec un code personnel (comme pour les locataires). Il/elle y voit <b>seulement</b> :</p>
          <ul class="small" style="margin:0 0 12px;padding-left:20px"><li>son planning : quoi, où, quand (3 semaines), avec vos consignes</li><li>son horaire et ses absences</li></ul>
          <p class="small" style="margin:0 0 12px">Et il/elle peut vous envoyer : <b>▶️ commencé · ✅ fini · ⚠️ pas fini</b> (avec la raison et des photos), ses coordonnées, un <b>arrêt maladie</b> avec le certificat. Tout arrive ici (Activité) et sur l’Accueil.</p>
          <div class="alert info" style="margin-bottom:12px">${icon('shield')}<div>Données chiffrées : il/elle ne voit ni les loyers, ni les locataires (sauf le prénom et le téléphone de celui qui a signalé une panne), ni vos comptes.</div></div>
          <button class="btn primary block" data-action="eq-on" data-id="${id}">📱 Créer l’accès à l’app</button>`;
      } else {
        const url = eqUrl(i);
        const inv = inviteMsg('eq', e.lang, i.prenom || '', eqAppUrl(), e.code || '—', url, societe().nom || 'NOBIS s.a.r.l.');
        const msgTxt = encodeURIComponent(inv.txt);
        body = html`<div class="card" style="text-align:center;margin-bottom:12px"><div class="tiny muted">Code personnel</div>
            <div style="font-family:var(--mono);font-size:26px;font-weight:800;letter-spacing:.08em">${e.code || '—'}</div>
            <button class="btn sm" data-action="eq-code" data-id="${id}">${e.code ? 'Nouveau code' : 'Créer le code'}</button></div>
          <div class="qr" style="max-width:190px;margin:0 auto 10px">${qrSvg(url, 5)}</div>
          <label class="field" style="margin:0 0 4px">Langue de son app<select data-input="eq-lang" data-id="${id}">${[['', 'Celle de son téléphone'], ['fr', 'Français'], ['it', 'Italiano'], ['pt', 'Português'], ['de', 'Deutsch'], ['en', 'English'], ['es', 'Español']].map(([k, v2]) => html`<option value="${k}" ${(e.lang || '') === k ? new Raw('selected') : ''}>${v2}</option>`)}</select></label>
          <p class="tiny muted" style="margin:0 0 10px">Le message d’invitation part dans cette langue (en français si « Celle de son téléphone »).</p>
          <div class="actions" style="flex-direction:column">
            ${tel ? html`<a class="btn" href="https://wa.me/${tel.replace(/^\+/, '')}?text=${msgTxt}" target="_blank" rel="noopener">${icon('msg')} Envoyer par WhatsApp</a><a class="btn" href="sms:${tel}?&body=${msgTxt}">${icon('msg')} Envoyer par SMS</a>` : ''}
            ${i.mail ? html`<a class="btn" href="mailto:${i.mail}?subject=${encodeURIComponent(inv.subj)}&body=${msgTxt}">${icon('mail')} Envoyer par email</a>` : ''}
            <button class="btn" data-action="eq-copy" data-id="${id}">${icon('file')} Copier le lien</button>
            <a class="btn" href="${url}" target="_blank" rel="noopener">${icon('eye')} Voir son app</a>
          </div>
          <p class="tiny muted">L’app se met à jour toute seule quand vous changez son planning ou ses interventions.</p>
          <button class="btn ghost danger block" data-action="eq-off" data-id="${id}">Désactiver l’accès</button>`;
      }
    } else {
      const abs = (i.absences || []).slice().sort((a, b) => b.debut.localeCompare(a.debut));
      body = html`<form data-form="absence" class="fields" style="margin-bottom:14px">
          <input type="hidden" name="id" value="${id}">
          <label class="field">Type<select name="type">${Object.entries(ABS_TYPES).map(([k, v]) => html`<option value="${k}">${v}</option>`)}</select></label>
          ${field('Du', 'debut', t0, { type: 'date', required: true })}
          ${field('Au (inclus)', 'fin', '', { type: 'date' })}
          ${field('Note', 'note', '', { placeholder: 'ex. certificat reçu par WhatsApp' })}
          <label class="field full">Certificat / justificatif (photo ou PDF)<input type="file" name="file" accept="image/*,application/pdf"></label>
          <button class="btn primary full" type="submit">${icon('plus')} Ajouter l’absence</button>
        </form>
        ${abs.length ? html`<div class="list small">${abs.map((a) => html`<div class="row"><span class="grow"><b>${ABS_TYPES[a.type] || a.type}</b> — ${fmtDate(a.debut)}${a.fin ? ' → ' + fmtDate(a.fin) : ' → ?'}${a.note ? html`<span class="meta" style="display:block">${a.note}</span>` : ''}</span>
          ${a.docId && vault.get('documents', a.docId) ? html`<button class="btn sm" data-action="open-doc" data-id="${a.docId}">👁 Certificat</button>` : ''}
          <button class="btn icon sm ghost" data-action="del-absence" data-id="${id}" data-aid="${a.id}" aria-label="Supprimer">${icon('trash')}</button></div>`)}</div>` : html`<p class="small muted">Aucune absence enregistrée.</p>`}`;
    }
    return {
      title: intervFull(i),
      body: html`<p class="small muted" style="margin:0 0 10px">${METIERS[i.metier] || ''} · ${INT_GENRES[i.genre || 'interne']}${i.espace && i.espace.on ? ' · 📱 app active' : ''}</p>${tabsBar([['fiche', 'Fiche'], ['heures', 'Horaires'], ['abs', `Absences${cur ? ' 🔴' : ''}`], ['act', `Activité${i.feedNew ? ' (' + i.feedNew + ')' : ''}`], ['app', '📱 App']], tab)}${body}`,
      foot: html`${tel ? html`<a class="btn" href="tel:${tel}">${icon('phone')} Appeler</a>` : ''}<button class="btn primary" data-action="edit-interv" data-id="${id}">Modifier</button>`,
    };
  },

  'tache-form'({ id, preset }) {
    const t = id ? vault.get('taches', id) : { type: 'reparation', immId: preset || '', statut: 'afaire', date: today(), recur: '' };
    if (id && !t) return null;
    const imms = vault.list('immeubles').filter((im) => !immGone(im) || im.id === t.immId).sort(byAddr);
    if (!imms.length) return { title: 'Nouvelle intervention', body: empty('building', "Ajoutez d'abord un immeuble.") };
    const ints = vault.list('intervenants').sort((a, b) => intervFull(a).localeCompare(intervFull(b)));
    return {
      title: id ? "Modifier l'intervention" : 'Nouvelle intervention',
      body: html`<form id="f" data-form="tache" class="fields">
        <input type="hidden" name="id" value="${id || ''}">
        <label class="field">Type<select name="type">${Object.entries(TACHE_TYPES).map(([k, v]) => html`<option value="${k}" ${(t.type === 'entretien' ? 'reparation' : t.type) === k ? new Raw('selected') : ''}>${v}</option>`)}</select></label>
        ${field('Quoi ?', 'titre', t.titre, { required: true, placeholder: 'ex. Fuite robinet cuisine, nettoyage des communs' })}
        <label class="field">Immeuble<select name="immId" data-input="tache-imm" required>${imms.map((im) => html`<option value="${im.id}" ${im.id === t.immId ? new Raw('selected') : ''}>${im.adresse}</option>`)}</select></label>
        <label class="field">Où ?<select name="logId" id="tacheLog">${logOptions(t.immId || imms[0].id, t.logId)}</select></label>
        <label class="field full">Qui ?<select name="intervenantId"><option value="">— à choisir —</option>${ints.map((i) => html`<option value="${i.id}" ${i.id === t.intervenantId ? new Raw('selected') : ''}>${intervFull(i)} — ${METIERS[i.metier] || ''}${absOn(i, t.date || today()) ? ' (absent)' : ''}</option>`)}</select></label>
        ${!ints.length ? html`<p class="tiny muted full" style="margin:0">Ajoutez vos intervenants dans Maintenance → Intervenants.</p>` : ''}
        ${field('Date', 'date', t.date, { type: 'date' })}
        <label class="field">Répétition<select name="recur">${Object.entries(RECURS).map(([k, v]) => html`<option value="${k}" ${(t.recur || '') === k ? new Raw('selected') : ''}>${v}</option>`)}</select></label>
        ${field("Jusqu'au (si répétition)", 'fin', t.fin, { type: 'date' })}
        ${field('Coût (€)', 'cout', t.cout, { type: 'number', attrs: money$ })}
        ${!t.recur ? html`<label class="field">Statut<select name="statut">${Object.entries(STATUTS).map(([k, v]) => html`<option value="${k}" ${t.statut === k ? new Raw('selected') : ''}>${v}</option>`)}</select></label>` : ''}
        <label class="field full">Notes<textarea name="note" placeholder="Accès, clés, pièces à acheter, ce qui a été fait…">${t.note || ''}</textarea></label>
        ${t.depId ? html`<p class="tiny muted full" style="margin:0">✓ Coût enregistré dans les dépenses de l'immeuble.</p>` : ''}
        ${(t.journal || []).length ? html`<div class="full"><div class="section-label" style="margin:4px 0 6px">👷 Suivi de l’équipe</div><div class="list small">${t.journal.slice().reverse().slice(0, 30).map((x) => html`<div class="row"><span class="grow" style="white-space:normal"><b>${EQ_ST[x.st] || x.st}${x.h ? ' 🕒 ' + x.h : ''}</b> · ${fmtDate(x.d)}${x.by ? ' · ' + intervName(x.by) : ''}<span class="meta" style="display:block">${fmtDateTime(x.at)}</span>${x.note ? html`<span class="small" style="display:block">📝 ${x.note}</span>` : ''}</span>${(x.ph || []).filter((pid) => vault.get('documents', pid)).map((pid) => html`<button class="btn sm" type="button" data-action="open-doc" data-id="${pid}">📷</button>`)}</div>`)}</div></div>` : ''}
        ${t.locId ? html`<p class="tiny full" style="margin:0">📨 Signalé par <a href="#" data-action="open-loc" data-id="${t.locId}">${fullName(vault.get('locataires', t.locId) || { nom: '?' })}</a> — il voit l'avancement dans son espace.</p>` : ''}
        ${t.id && (eqPhotos(t.id, 'av').length || eqPhotos(t.id, 'ap').length) ? html`<div class="full"><div class="section-label" style="margin:4px 0 6px">📷 Avant / après les travaux</div><div class="edl-pair two">${Object.entries(EQ_PH).map(([ph, lb]) => html`<div><div class="tiny muted" style="margin-bottom:4px"><b>${lb}</b> · ${eqPhotos(t.id, ph).length} / ${EQ_PH_MAX}</div><div class="edl-grid sm">${eqPhotos(t.id, ph).map((x) => html`<figure class="edl"><button type="button" class="edl-img" data-action="open-doc" data-id="${x.id}" aria-label="Agrandir"><img alt="" data-edl="${x.id}"></button><figcaption><span>${fmtDate(x.date)}</span><button type="button" class="btn icon sm ghost danger" data-action="del-edl" data-id="${x.id}" aria-label="Retirer la photo">${icon('trash')}</button></figcaption></figure>`)}</div></div>`)}</div></div>` : ''}
        ${vault.list('documents').filter((x) => x.tacheId === t.id && t.id && !x.phase).length ? html`<div class="full" style="display:flex;gap:6px;flex-wrap:wrap">${vault.list('documents').filter((x) => x.tacheId === t.id && !x.phase).map((x) => html`<button class="btn sm" type="button" data-action="open-doc" data-id="${x.id}">📷 ${x.label.replace('Signalement — ', '')}</button>`)}</div>` : ''}
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
      body: html`<p style="margin-top:0">Les locataires téléchargent l'app depuis <b>luxinterventions.com</b> (« Télécharger l'app des locataires NOBIS s.a.r.l. ») et entrent avec le <b>code personnel</b> que vous leur donnez ici. Sans code, personne n'entre.</p>
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
      title: 'Code de la porte — ' + g.nom,
      narrow: true,
      body: html`<form id="f" data-form="door" class="fields">
        <input type="hidden" name="id" value="${id}">
        ${field('Nouveau code', 'code', rnd, { full: true, required: true, attrs: 'inputmode="numeric" autocomplete="off" style="font-family:var(--mono);font-size:22px;letter-spacing:.1em"' })}
        <p class="tiny muted full" style="margin:0">Code proposé au hasard — vous pouvez le changer. Programmez-le d'abord dans la serrure (app du fabricant), puis enregistrez-le ici.</p>
        <label class="field full">Raison<select name="raison" data-input="door-reason">${['Nouvel occupant', 'Code oublié', 'Sécurité (code diffusé)', 'Fin de séjour / départ', 'Impayé', 'Autre'].map((r) => html`<option value="${r}">${r}</option>`)}</select></label>
        <div class="alert warn full" id="doorWarn" hidden>${icon('alert')}<div><b>Attention :</b> pour un <b>bail d'habitation</b>, bloquer l'accès d'un locataire parce qu'il n'a pas payé est en principe interdit au Luxembourg (seul un juge peut ordonner l'expulsion). Réservé aux séjours courts / chambres d'hôtel selon vos conditions — vérifiez avec votre avocat.</div></div>
        ${field('Serrure (marque / modèle)', 'serrure', pt.serrure, { full: true, placeholder: 'ex. Nuki, TTLock, igloohome…' })}
        ${field("Info pour l'occupant (facultatif)", 'info', pt.info, { full: true, placeholder: 'ex. Tapez le code puis ✓ ; porte d’entrée de l’immeuble : 2580' })}
        ${field('Note (visible seulement par vous)', 'note', '', { full: true })}
      </form>`,
      foot: html`<button class="btn" data-action="close-sheet">Annuler</button><button class="btn primary" type="submit" form="f">Enregistrer le code</button>`,
    };
  },

  'pub-form'({ id, preset }) {
    const a = id ? vault.get('avis', id) : { immId: preset || '', debut: today(), ttl: 30, cat: 'resto' };
    if (id && !a) return null;
    const imms = vault.list('immeubles').filter((im) => !immGone(im) || im.id === a.immId).sort(byAddr);
    const exp = a.fin && a.fin < today();
    return {
      title: id ? "Modifier l'annonce" : 'Nouvelle annonce (publicité)',
      narrow: true,
      body: html`<form id="f" data-form="pub" class="fields">
        <input type="hidden" name="id" value="${id || ''}">
        <label class="field full">Catégorie<select name="cat">${Object.entries(PUB_CATS).map(([k, v]) => html`<option value="${k}" ${a.cat === k ? new Raw('selected') : ''}>${v}</option>`)}</select></label>
        ${field('Nom du commerce', 'nom', a.nom, { full: true, required: true, placeholder: 'ex. Pizzeria Da Mario' })}
        ${field('Adresse (pour la carte)', 'adresse', a.adresse, { full: true, required: true, placeholder: 'ex. 12, rue de Hollerich, Luxembourg' })}
        <label class="field full">Message / offre<textarea name="texte" style="min-height:80px" placeholder="ex. −10 % pour les locataires sur présentation de l'app">${a.texte || ''}</textarea></label>
        ${field('Téléphone', 'tel', a.tel, { type: 'tel' })}
        ${field('Site web', 'web', a.web, { type: 'url', placeholder: 'https://…' })}
        <label class="field full">Pour<select name="immId"><option value="">Tous les immeubles</option>${imms.map((im) => html`<option value="${im.id}" ${im.id === a.immId ? new Raw('selected') : ''}>${im.adresse}</option>`)}</select></label>
        ${field('Publier à partir du', 'debut', exp ? today() : a.debut, { type: 'date', required: true })}
        <label class="field">Durée (TTL)<select name="ttl">${PUB_TTL.map((n) => html`<option value="${n}" ${+(a.ttl || 30) === n ? new Raw('selected') : ''}>${n} jours</option>`)}</select></label>
        <p class="tiny muted full" style="margin:0">${exp ? `Expirée le ${fmtDate(a.fin)} : enregistrez pour la republier.` : a.fin ? `Visible jusqu'au ${fmtDate(a.fin)} inclus, puis retirée automatiquement de l'app des locataires.` : "Retirée automatiquement de l'app des locataires à la fin de la durée."}</p>
      </form>`,
      foot: html`${id ? html`<button class="btn ghost danger" data-action="del-pub" data-id="${id}" aria-label="Supprimer">${icon('trash')}</button>` : ''}
        <button class="btn" data-action="close-sheet">Annuler</button><button class="btn primary" type="submit" form="f">${exp ? 'Republier' : 'Publier'}</button>`,
    };
  },
  'avis-form'({ id, preset }) {
    const a = id ? vault.get('avis', id) : { immId: preset || '', debut: today() };
    if (id && !a) return null;
    const imms = vault.list('immeubles').filter((im) => !immGone(im) || im.id === a.immId).sort(byAddr);
    return {
      title: id ? "Modifier l'avis" : 'Nouvel avis aux locataires',
      narrow: true,
      body: html`<form id="f" data-form="avis" class="fields">
        <input type="hidden" name="id" value="${id || ''}">
        <label class="field full">Pour<select name="immId"><option value="">Tous les immeubles</option>${imms.map((im) => html`<option value="${im.id}" ${im.id === a.immId ? new Raw('selected') : ''}>${im.adresse}</option>`)}</select></label>
        <label class="field full">Message<textarea name="texte" required style="min-height:110px" placeholder="ex. Mardi 6 octobre de 9 h à 12 h : coupure d'eau pour travaux. Merci de votre compréhension.">${a.texte || ''}</textarea></label>
        ${field('Visible à partir du', 'debut', a.debut, { type: 'date' })}
        ${field("Jusqu'au (facultatif)", 'fin', a.fin, { type: 'date' })}
        <p class="tiny muted full" style="margin:0">L'avis apparaît dans l'espace des locataires qui ont un espace actif. Écrivez-le en français ; ajoutez une autre langue dans le même message si besoin.</p>
      </form>`,
      foot: html`${id ? html`<button class="btn ghost danger" data-action="del-avis" data-id="${id}" aria-label="Supprimer">${icon('trash')}</button>` : ''}
        <button class="btn" data-action="close-sheet">Annuler</button><button class="btn primary" type="submit" form="f">Enregistrer</button>`,
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
        <p class="small full" style="margin:0">Importez le calendrier <b>complet</b> de la commune pour <b>${im.adresse}</b> : LuxInterventions le sépare tout seul par type de déchets (verre, papier, résiduels…) et crée une collecte pour chacun.</p>
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
        <p class="tiny muted full" style="margin:0">Les dates ci-dessus sont les jours de <b>passage</b> du camion (comme sur le calendrier de la commune). LuxInterventions calcule quand sortir les poubelles.</p>
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
        <label class="field full">Type de structure<select name="type">${Object.entries(IMM_TYPES).map(([k, v]) => html`<option value="${k}" ${(im.type || 'immeuble') === k ? new Raw('selected') : ''}>${v}</option>`)}</select></label>
        <div class="section-label full" style="margin:6px 0 0">Bail principal — vous êtes locataire principal, le bailleur est le propriétaire</div>
        ${field('Bailleur (propriétaire)', 'proprietaire', im.proprietaire, { full: true, placeholder: 'Nom du bailleur / propriétaire (vide si l’immeuble vous appartient)' })}
        ${field('Loyer au bailleur (€ / mois)', 'loyer', im.loyer, { type: 'number', attrs: money$ })}
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
            <span class="avatar" style="${occ.length ? '' : 'background:var(--amber-soft);color:var(--amber)'}">${icon(logIcon(g.type))}</span>
            <span class="grow"><span class="title" style="display:block">${g.nom} <span class="muted small">${[LOG_TYPES[g.type], logWhere(g)].filter(Boolean).join(' · ')}</span></span>
              <span class="meta" style="display:flex;gap:6px;flex-wrap:wrap">${occ.length ? occ.map(fullName).join(', ') : html`<span class="badge warn">Vacant</span>`}
              ${leaving.map((l) => html`<span class="badge warn">départ ${fmtDate(l.sortie)}</span>`)}${next.map((l) => html`<span class="badge acc">arrivée ${fmtDate(l.debut)}</span>`)}</span></span>
            <span class="tiny muted">${plural(tenantsOfLog(g.id).length, 'occupant')}</span>
          </button>`;
        })}</div>` : html`<p class="muted small">Aucun logement. Ajoutez les appartements, chambres, garages, bureaux ou locaux de cette structure pour suivre leurs occupants successifs.</p>`}
        <button class="btn block" style="margin-top:12px" data-action="new-log" data-imm="${id}">${icon('plus')} Ajouter un logement / local</button>`;
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
          ${groups.length ? groups.map(([gk, g]) => html`<div class="section-label">💬 ${chatLabel(gk)} <span class="muted small">· ${g.members.map((m) => shortName(vault.get('locataires', m) || {})).join(', ')}</span></div>
            ${binsTable(im, g)}
            <div class="chat">${chatBubbles((ui.chatCache || {})[g.id], g.id)}</div>
            <form data-form="chatpost" class="chat-form"><input type="hidden" name="imm" value="${id}"><input type="hidden" name="gk" value="${gk}">
              <textarea name="x" required maxlength="1500" placeholder="Écrire aux habitants (en tant que gestionnaire)…"></textarea><button class="btn primary" type="submit">${icon('msg')} Envoyer</button></form>`)
          : html`<p class="muted small">Aucun fil pour le moment : un fil se crée tout seul dès que 2 personnes habitent le même appartement (ou le même groupe choisi ci-dessus).</p>`}
          <button class="btn sm" style="margin-top:8px" data-action="chat-refresh" data-id="${id}">${icon('sync')} Actualiser</button>` : ''}
        <div class="section-label">📜 Règles propres à cet immeuble</div>
        <form data-form="regles" class="stack"><input type="hidden" name="id" value="${id}">
          <textarea name="regles" style="min-height:90px" placeholder="ex. Machine à laver jusqu'à 21 h. Vélos dans la cour, pas dans le couloir.">${im.regles || ''}</textarea>
          <button class="btn" type="submit">Enregistrer les règles</button></form>
        <p class="tiny muted">Elles s'ajoutent au règlement général (calme, propreté, évacuations, déchets, tabac, visiteurs, sécurité, énergie, respect) affiché dans l'app de chaque locataire, dans sa langue. À sa première ouverture de l'app, chaque locataire doit toucher « J'ai lu et j'accepte » avant de voir le reste ; la date apparaît dans sa fiche. Si vous modifiez ces règles, tous les locataires de l'immeuble doivent les accepter à nouveau.</p>`;
    } else if (tab === 'proprio') {
      const rent = ownerRent(im);
      const cy = y, cm = new Date().getMonth() + 1;
      body = html`
        <dl class="kv" style="margin-bottom:16px">
          ${kvRow('Structure', IMM_TYPES[im.type] || IMM_TYPES.immeuble)}
          ${kvRow('Bailleur (propriétaire)', im.proprietaire || '—')}
          ${kvRow('Locataire principal', html`${societe().nom || 'NOBIS s.a.r.l.'} (vous)`)}
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
          return html`<button class="row" data-action="open-log" data-id="${g.id}" data-tab="bilan"><span class="grow"><span class="title" style="display:block">${g.nom}</span>
            <span class="meta">${plural(bb.occupants, 'occupant')}${occ ? ` · occupé ${pct(occ.occupied, occ.total)}% du temps` : ''}${bb.depenses ? ' · dépenses ' + money(bb.depenses) : ''}</span></span>
            <span class="amount green">${money(bb.encaisse)}</span></button>`;
        })}</div>` : ''}`;
    }
    return {
      title: im.adresse,
      body: html`${immGone(im) ? html`<div class="alert info" style="margin-bottom:12px">${icon('history')}<div><b>Plus en gestion</b> depuis le ${fmtDate(im.finGestion)}${im.finNote ? ' — ' + im.finNote : ''}. Tout l'historique reste consultable et compte dans les statistiques.</div></div>` : ''}${tabsBar([['logs', 'Logements'], ['chat', `💬 Messages${(ui.chatNew || {})[id] ? ' (' + ui.chatNew[id] + ')' : ''}`], ['proprio', 'Bailleur'], ['deps', 'Dépenses'], ['bilan', 'Bilan']], tab)}${body}`,
      foot: html`${immGone(im) ? html`<button class="btn" data-action="reopen-imm" data-id="${id}">${icon('sync')} Réactiver</button>` : html`<button class="btn" data-action="end-imm" data-id="${id}">${icon('history')} Fin de gestion</button>`}<button class="btn icon" data-action="print-imm" data-id="${id}" aria-label="Imprimer">${icon('download')}</button><button class="btn" data-action="edit-imm" data-id="${id}">${icon('edit')} Modifier</button>`,
    };
  },

  tools() {
    setTimeout(() => toolsLoad(), 0);
    const all = ui.tools, now = Date.now();
    const img = (it) => (ui.toolImg || {})[it.id];
    const card = (it) => html`<div class="row" style="align-items:flex-start">
      ${img(it) && img(it) !== 'loading' ? html`<img src="${img(it)}" alt="" style="width:64px;height:64px;object-fit:cover;border-radius:10px;flex:0 0 64px">` : html`<span class="avatar">🧰</span>`}
      <span class="grow" style="min-width:0"><span class="title" style="display:block">${it.title}</span>
        <span class="meta" style="display:block">${TOOL_KINDS[it.kind] || it.kind} · ${toolPrice(it)}${it.lieu ? ' · ' + it.lieu : ''}</span>
        <span class="meta" style="display:block">${toolOwner(it)} · ${it.mail}</span>
        <span class="tiny muted" style="display:block">publiée le ${fmtDate(isoDate(new Date(it.created)))} · ${it.exp < now ? 'expirée' : 'en ligne jusqu’au ' + fmtDate(isoDate(new Date(it.exp)))} · 📩 ${it.clicks || 0} intéressé${(it.clicks || 0) > 1 ? 's' : ''}</span>
        ${it.desc ? html`<span class="small" style="display:block;margin-top:4px">${it.desc}</span>` : ''}
        ${it.rules ? html`<span class="tiny muted" style="display:block;margin-top:2px">Conditions : ${it.rules}</span>` : ''}
        <span style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">
          ${it.status === 'pending' ? html`<button class="btn sm primary" data-action="tool-ok" data-id="${it.id}">${icon('check')} Approuver</button>` : ''}
          <button class="btn sm ghost danger" data-action="tool-del" data-id="${it.id}">${icon('trash')} Retirer</button></span></span></div>`;
    const list = all || [];
    const pend = list.filter((it) => it.status === 'pending'), live = list.filter((it) => it.status === 'ok' && it.exp > now), old = list.filter((it) => it.status === 'ok' && it.exp <= now);
    return {
      title: '🧰 Don · prêt · location',
      body: html`<p class="small muted" style="margin-top:0">Annonces publiées par les locataires depuis leur app : elles apparaissent sur le site après votre approbation. Les intéressés écrivent directement à l’email de l’annonceur et l’argent s’échange entre eux, en espèces à la remise : vous n’intervenez pas. Retirez tout objet illicite ou compromettant.</p>
        <a class="btn sm" href="/outils.html" target="_blank" rel="noopener">${icon('eye')} Voir la page publique</a>
        ${all == null ? html`<p class="muted">Chargement…</p>` : html`
          <div class="section-label">À approuver (${pend.length})</div>${pend.length ? html`<div class="list">${pend.map(card)}</div>` : html`<p class="muted small">Aucune annonce en attente.</p>`}
          <div class="section-label">En ligne (${live.length})</div>${live.length ? html`<div class="list">${live.map(card)}</div>` : html`<p class="muted small">Aucune annonce en ligne.</p>`}
          ${old.length ? html`<div class="section-label">Expirées (${old.length})</div><div class="list">${old.map(card)}</div>` : ''}`}`,
      foot: html`<button class="btn" data-action="close-sheet">Fermer</button><button class="btn primary" data-action="tool-new">${icon('plus')} Publier un objet (NOBIS)</button>`,
    };
  },

  'tool-form'() {
    return {
      title: 'Publier un objet (NOBIS)',
      narrow: true,
      body: html`<form id="f" data-form="tool" class="fields">
        <label class="field full">Photos (1 à 3)<input type="file" name="photos" accept="image/*" multiple required></label>
        ${field('Titre', 'title', '', { full: true, required: true, placeholder: 'ex. Nettoyeur haute pression Kärcher' })}
        <label class="field">Type<select name="kind">${Object.entries(TOOL_KINDS).map(([k, v]) => html`<option value="${k}" ${k === 'loc' ? new Raw('selected') : ''}>${v}</option>`)}</select></label>
        ${field('Prix (€)', 'price', '', { type: 'number', attrs: money$ })}
        <label class="field">Par<select name="unit">${Object.entries(TOOL_UNITS).map(([k, v]) => html`<option value="${k}" ${k === 'j' ? new Raw('selected') : ''}>${v}</option>`)}</select></label>
        ${field('Lieu de remise', 'lieu', '', { placeholder: 'ex. Luxembourg-Gare' })}
        ${field('Email de contact', 'mail', societe().email || '', { type: 'email', required: true, full: true })}
        <label class="field full">Description<textarea name="desc" maxlength="800" placeholder="État, marque, accessoires…"></textarea></label>
        <label class="field full">Conditions<textarea name="rules" maxlength="400" placeholder="Caution, retour, paiement en espèces à la remise…"></textarea></label>
      </form>`,
      foot: html`<button class="btn" data-action="close-sheet">Annuler</button><button class="btn primary" type="submit" form="f">Publier</button>`,
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
        ${field('Surface (m²)', 'surface', g.surface, { type: 'number', attrs: 'inputmode="decimal" min="0" step="0.1"' })}
        ${field('Étage', 'etage', g.etage, { placeholder: 'ex. RDC, 1er, sous-sol' })}
        ${field('Situé dans (facultatif)', 'partie', g.partie, { full: true, placeholder: 'ex. appartement du 1er, ancien bar, aile gauche, cour arrière' })}
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
          ${g.partie ? kvRow('Situé dans', g.partie) : ''}
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
    } else if (tab === 'porte') {
      const pt = g.porte || {};
      const shownTo = occ.filter((l) => l.espace && l.espace.on && (l.espace.show || {}).porte);
      body = html`
        <div class="card" style="text-align:center;margin-bottom:12px"><div class="tiny muted">Code actuel de la porte</div>
          <div style="font-family:var(--mono);font-size:30px;font-weight:800;letter-spacing:.12em">${pt.code ? (ui.showDoor === id ? pt.code : '•'.repeat(pt.code.length)) : '—'}</div>
          ${pt.code ? html`<button class="btn sm ghost" data-action="door-show" data-id="${id}">${icon('eye')} ${ui.showDoor === id ? 'Masquer' : 'Afficher'}</button>` : ''}
          <div class="tiny muted">${pt.maj ? 'depuis le ' + fmtDate(pt.maj) : ''}${pt.serrure ? ' · ' + pt.serrure : ''}</div></div>
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
            <span class="edl-acts"><label class="btn sm ${ph ? '' : 'primary'}" title="Prendre une photo">${icon('camera')}<input type="file" accept="image/*" capture="environment" hidden data-input="edl-slot" data-log="${id}" data-room="${k}"></label>
            <label class="btn sm" title="Choisir dans la galerie">${icon('image')}<input type="file" accept="image/*" hidden data-input="edl-slot" data-log="${id}" data-room="${k}"></label></span></div>
            <div class="edl-pair ${outs.length ? 'two' : ''}">${fig(ph, 'in', 'Entrée')}${outs.length ? fig(out, 'out', 'Sortie') : ''}</div></div>`;
        })}</div>
        <p class="tiny muted" style="margin:8px 0 0;text-align:center"><b>${edlOf(id).filter((d) => EDL_ROOM[d.room]).length} / ${EDL_ROOMS.length}</b> · <span>📷 appareil photo ou 🖼️ galerie</span> · <span>chiffrées avant l'envoi</span> · <span>une nouvelle photo remplace l'ancienne</span></p>
        ${old.length ? html`<div class="section-label">Anciennes photos (sans pièce)</div><div class="edl-grid">${old.map((ph) => fig(ph, 'in', ''))}</div>` : ''}`;
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
    if (!vault.list('immeubles').length) return { title: 'Nouveau locataire', body: empty('building', "Ajoutez d'abord un immeuble.", html`<button class="btn primary" data-action="new-imm">${icon('plus')} Ajouter un immeuble</button>`) };
    return {
      title: id ? 'Modifier le locataire' : 'Nouveau locataire',
      body: html`<form id="f" data-form="loc" class="fields">
        <input type="hidden" name="id" value="${id || ''}">
        ${id ? '' : html`<p class="tiny muted full" style="margin:0">Bailleur (propriétaire) → <b>${societe().nom || 'NOBIS s.a.r.l.'}</b> (locataire principal) → <b>sous-locataire</b> que vous ajoutez ici.</p>`}
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
    const docs = vault.list('documents').filter((d) => d.locId === id).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
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
        ${!gone ? html`<div class="actions">
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
        <form data-form="doc" class="stack" style="margin-bottom:16px">
          <input type="hidden" name="locId" value="${id}">
          <div class="small">Dossier : ${dossierChips(id, docOf)}</div>
          <select name="dtype" aria-label="Type de document">${Object.entries(DOC_TYPES).map(([k, v]) => html`<option value="${k}" ${(String(preset || '').split('|')[0] || 'bail') === k ? new Raw('selected') : ''}>${v}</option>`)}</select>
          <input type="hidden" name="pay" value="${String(preset || '').split('|')[1] || ''}">
          <input name="label" value="${payLabel(preset)}" placeholder="Précision (facultatif, ex. recto-verso, WhatsApp du 12/09)">
          <input name="file" type="file" accept="application/pdf,image/*" required>
          <button class="btn primary block" type="submit">${icon('upload')} Ajouter le document</button>
          <p class="tiny muted">PDF ou photo · 10 Mo maximum · chiffré avant l'envoi. Reçu par WhatsApp ou par mail ? Enregistrez la photo ou le PDF sur le téléphone / l'ordinateur, puis choisissez-le ici.</p>
        </form>
        ${docs.length ? html`<div class="list">${docs.map((doc) => html`<div class="row">${icon('file')}
          <span class="grow"><span class="title" style="display:block">${doc.label}</span><span class="meta">${doc.dtype && doc.dtype !== 'autre' && !doc.label.startsWith(DOC_TYPES[doc.dtype].replace(/ \(.*\)$/, '')) ? DOC_TYPES[doc.dtype] + ' · ' : ''}${fmtDate(doc.date)} · ${Math.max(1, Math.round((doc.size || 0) / 1024))} Ko</span></span>
          ${l.espace && l.espace.on ? html`<button class="btn sm ${doc.shared ? 'primary' : ''}" data-action="doc-share" data-id="${doc.id}" title="Visible dans l'espace du locataire">👁 ${doc.shared ? 'Visible' : 'Privé'}</button>` : ''}
          <button class="btn icon sm" data-action="open-doc" data-id="${doc.id}" aria-label="Ouvrir">${icon('eye')}</button>
          <button class="btn icon sm ghost danger" data-action="del-doc" data-id="${doc.id}" aria-label="Supprimer">${icon('trash')}</button></div>`)}</div>` : html`<p class="muted small">Aucun document.</p>`}`;
    } else if (tab === 'espace') {
      const e = l.espace || {};
      const show = { ...ESP_ALL, ...(e.show || {}) };
      const boxes = html`<div class="list" style="margin-bottom:12px">${Object.entries(ESP_SHOW).map(([k, v]) => html`<label class="row" style="cursor:pointer">
        <input type="checkbox" data-input="esp-show" data-loc="${id}" data-k="${k}" ${show[k] ? new Raw('checked') : ''} style="width:22px;min-height:22px"><span class="grow">${v}</span></label>`)}</div>`;
      if (!e.on) {
        body = html`<p style="margin-top:0">Donnez à <b>${fullName(l)}</b> un <b>espace personnel</b> (lien ou QR code, sans mot de passe à retenir) où il voit <b>seulement</b> ce que vous cochez :</p>
          ${boxes}
          <div class="alert info">${icon('shield')}<div>Ses données sont chiffrées : seule la clé contenue dans son lien peut les ouvrir. Il ne voit jamais les autres locataires, les bailleurs, vos dépenses ni vos notes. Vous pouvez désactiver le lien à tout moment.</div></div>
          <button class="btn primary block" data-action="esp-on" data-id="${id}">${icon('users')} Créer l'espace locataire</button>`;
      } else {
        const url = espUrl(l);
        const tel = (l.tel || '').replace(/[^\d+]/g, '');
        const inv = inviteMsg('loc', e.lang, l.prenom || '', appUrl(), e.code || '—', url, 'NOBIS s.a.r.l.');
        const msg = encodeURIComponent(inv.txt);
        body = html`<p style="margin-top:0">Espace actif. Donnez à <b>${fullName(l)}</b> son <b>code d'accès</b> (pour l'app installée depuis luxinterventions.com) ou envoyez-lui le lien direct.</p>
          <div class="card" style="text-align:center;margin-bottom:12px"><div class="tiny muted">Code d'accès personnel</div>
            <div style="font-family:var(--mono);font-size:26px;font-weight:800;letter-spacing:.08em">${e.code || '—'}</div>
            <button class="btn sm" data-action="esp-code" data-id="${id}">${e.code ? 'Nouveau code' : 'Créer le code'}</button></div>
          <div class="qr" style="max-width:190px;margin:0 auto 10px">${qrSvg(url, 5)}</div>
          <label class="field" style="margin:0 0 4px">Langue par défaut de son espace<select data-input="esp-lang" data-loc="${id}">${[['', 'Celle de son téléphone'], ['fr', 'Français'], ['it', 'Italiano'], ['de', 'Deutsch'], ['pt', 'Português'], ['en', 'English'], ['es', 'Español']].map(([k, v2]) => html`<option value="${k}" ${(e.lang || '') === k ? new Raw('selected') : ''}>${v2}</option>`)}</select></label>
          <p class="tiny muted" style="margin:0 0 10px">Le message d’invitation part dans cette langue (en français si « Celle de son téléphone »).</p>
          <div class="actions" style="flex-direction:column">
            ${tel ? html`<a class="btn" href="https://wa.me/${tel.replace(/^\+/, '')}?text=${msg}" target="_blank" rel="noopener">${icon('msg')} Envoyer par WhatsApp</a><a class="btn" href="sms:${tel}?&body=${msg}">${icon('msg')} Envoyer par SMS</a>` : ''}
            ${l.mail ? html`<a class="btn" href="mailto:${l.mail}?subject=${encodeURIComponent(inv.subj)}&body=${msg}">${icon('mail')} Envoyer par email</a>` : ''}
            <button class="btn" data-action="esp-copy" data-id="${id}">${icon('file')} Copier le lien</button>
            <a class="btn" href="${url}" target="_blank" rel="noopener">${icon('eye')} Voir son espace</a>
          </div>
          <div class="section-label">Ce qu'il voit</div>${boxes}
          <p class="tiny muted">Documents : tout ce que vous ajoutez dans Docs est visible dans son app (avec aperçu), pour qu'il vérifie que vous avez bien reçu ses papiers et ses paiements — touchez « 👁 Visible » pour le rendre privé. Ses messages et photos arrivent sur l'Accueil (📩) et dans Maintenance → Travaux.</p>
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
      body = hist.length ? html`<div class="list">${hist.map((h) => html`<div class="row"><span class="grow"><span class="title" style="display:block;white-space:normal">${h.action}</span><span class="meta" style="white-space:normal">${h.detail}</span></span><span class="tiny muted">${fmtDateTime(h.t)}</span></div>`)}</div>` : html`<p class="muted small">Aucun historique.</p>`;
    }
    return {
      title: fullName(l),
      body: html`${tabsBar([['infos', 'Infos'], ['pay', 'Loyers'], ['docs', 'Docs'], ['espace', l.espace && l.espace.on ? 'Espace ✓' : 'Espace'], ['notes', 'Notes'], ['hist', 'Journal']], tab)}${body}`,
      foot: tab === 'infos' ? html`<button class="btn ghost danger" data-action="del-loc" data-id="${id}" aria-label="Supprimer">${icon('trash')}</button>
        ${!gone ? html`<button class="btn" data-action="replace" data-id="${id}">${icon('sync')} Départ</button>` : ''}
        <button class="btn primary" data-action="edit-loc" data-id="${id}">${icon('edit')} Modifier</button>` : null,
    };
  },

  recovery({ preset: code }) {
    const body = encodeURIComponent(`Clé de secours LuxInterventions :\n\n${code}\n\nEn cas d'oubli de la clé d'accès : https://luxinterventions.com/locataires.html → « Clé d'accès oubliée ? ».\nNe transférez pas cet email.`);
    return {
      title: 'Votre clé de secours',
      narrow: true,
      body: html`
        <div class="alert warn" style="margin-bottom:16px">${icon('alert')}<div><b>Notez-la maintenant :</b> elle ne sera plus jamais affichée. Avec elle, on peut ouvrir le coffre et choisir une nouvelle clé d'accès. Gardez-la hors ligne (papier dans un coffre, gestionnaire de mots de passe).</div></div>
        <div style="font-family:var(--mono);font-size:22px;font-weight:700;letter-spacing:.06em;text-align:center;padding:18px 8px;background:var(--surface-2);border-radius:var(--radius);word-break:break-all" id="rcode">${code}</div>
        <div class="actions" style="margin-top:14px">
          <button class="btn" data-action="copy-recovery">${icon('file')} Copier</button>
          <button class="btn" data-action="print-recovery">${icon('download')} Imprimer</button>
          <a class="btn" href="mailto:${MAIL}?subject=${encodeURIComponent('LuxInterventions — clé de secours')}&body=${body}">${icon('mail')} Email</a>
        </div>
        <p class="tiny muted">Le bouton Email prépare un message vers ${MAIL}. Pratique, mais toute personne qui accède à cette messagerie pourrait ouvrir le coffre : le papier reste plus sûr.</p>`,
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
    const lang = ui.relLang || 'fr';
    const text = relanceText(l, lang);
    const tel = (l.tel || '').replace(/[^\d+]/g, '');
    return {
      title: 'Relancer ' + fullName(l),
      body: html`
        <div class="chips" style="margin-bottom:12px">${[['fr', 'Français'], ['it', 'Italiano'], ['en', 'English'], ['pt', 'Português']].map(([k, v]) => html`<button class="chip" data-action="rel-lang" data-id="${k}" aria-pressed="${lang === k}">${v}</button>`)}</div>
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
        <div class="section-label full" style="margin:0">Votre société — locataire principal (apparaît sur les quittances et les relances)</div>
        <div class="full" style="display:flex;align-items:center;gap:12px"><img src="${socLogo()}" alt="" style="height:48px;max-width:140px;object-fit:contain;background:#fff;border-radius:8px;padding:4px;border:1px solid var(--border)">
          <label class="btn sm" style="cursor:pointer">🖼️ ${st.logo ? 'Changer le logo' : 'Mettre votre logo'}<input type="file" accept="image/*" data-input="soc-logo" hidden></label>
          ${st.logo ? html`<button class="btn sm ghost" type="button" data-action="soc-logo-del">Retirer</button>` : ''}</div>
        <p class="tiny muted full" style="margin:0">Le logo apparaît dans l’app, les apps des locataires et de l’équipe, les quittances et les impressions.</p>
        ${field('Nom / société', 'nom', st.nom, { full: true, placeholder: 'ex. NOBIS s.a.r.l.' })}
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
        <div class="section-label full" style="margin:10px 0 0">Comptabilité et TVA</div>
        <label class="field">Assujetti à la TVA<select name="assujetti"><option value="1" ${st.assujetti !== false ? new Raw('selected') : ''}>Oui</option><option value="0" ${st.assujetti === false ? new Raw('selected') : ''}>Non</option></select></label>
        <label class="field">Déclaration de TVA<select name="periode">${[['m', 'Mensuelle'], ['t', 'Trimestrielle'], ['a', 'Annuelle']].map(([k, v]) => html`<option value="${k}" ${(st.periode || 't') === k ? new Raw('selected') : ''}>${v}</option>`)}</select></label>
        ${field('Taux de TVA (%)', 'taux', st.taux || '', { full: true, placeholder: (PAYS[pays] || PAYS.LU)[1].join(', ') + ' (taux du pays si vide)' })}
        <div class="section-label full" style="margin:10px 0 0">Autres moyens de paiement (bouton « Payer maintenant » des locataires)</div>
        ${field('PayPal.me (votre nom PayPal.me)', 'paypal', st.paypal, { placeholder: 'ex. NobisSarl' })}
        ${field('Lien de paiement par carte (Stripe, SumUp…)', 'cardLink', st.cardLink, { type: 'url', placeholder: 'https://…' })}
        ${field('Adresse Bitcoin (BTC)', 'btc', st.btc, { full: true, placeholder: 'bc1…', attrs: 'autocomplete="off" spellcheck="false"' })}
        ${field('Adresse Ethereum (ETH)', 'eth', st.eth, { full: true, placeholder: '0x…', attrs: 'autocomplete="off" spellcheck="false"' })}
        ${field('Adresse USDT', 'usdt', st.usdt, { placeholder: '0x… ou T…', attrs: 'autocomplete="off" spellcheck="false"' })}${netSelect('usdtNet', st.usdtNet)}
        ${field('Adresse USDC', 'usdc', st.usdc, { placeholder: '0x…', attrs: 'autocomplete="off" spellcheck="false"' })}${netSelect('usdcNet', st.usdcNet)}
        <p class="tiny muted full" style="margin:0">🔐 Mettez seulement l’<b>adresse de réception</b> (publique) de votre wallet. <b>Jamais</b> la clé privée ni les 12/24 mots de récupération. Laissez vide ce que vous n’utilisez pas : le bouton n’apparaît pas.</p>
        <div class="section-label full" style="margin:10px 0 0">Associés — partage du résultat net</div>
        ${rows.map((a, i) => html`${field('Associé ' + (i + 1), 'an' + i, a.nom)}${field('Part (%)', 'ap' + i, a.part, { type: 'number', attrs: 'inputmode="decimal" min="0" max="100" step="0.01"' })}`)}
        <p class="tiny muted full">Le total des parts doit faire 100 %. Laissez vide les lignes inutiles.</p>
        <div class="lock-err full" role="alert"></div>
      </form>`,
      foot: html`<button class="btn" data-action="close-sheet">Annuler</button><button class="btn primary" type="submit" form="f">Enregistrer</button>`,
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
function printDoc(title, body) {
  const el = $('#print');
  const so = societe();
  setHtml(el, html`<div class="pr-head"><div style="display:flex;align-items:center;gap:10px"><img src="${socLogo()}" alt="" style="height:34px;max-width:120px;object-fit:contain"><span><b>${socName()}</b> · ${title}${so.rcs || so.tvaNum ? html`<br><small>${[so.rcs ? 'RCS ' + so.rcs : '', so.tvaNum ? 'TVA ' + so.tvaNum : ''].filter(Boolean).join(' · ')}</small>` : ''}</span></div><div>Imprimé le ${fmtDate(today())}</div></div>${body}`);
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
      ? `Je soussigné(e), ${soc.nom || '……………………'}, locataire principal et bailleur, déclare avoir reçu de ${fullName(l)} la somme de ${money(st.paid)} au titre du loyer et des charges du logement ${[logName(l.logId), im.adresse].filter(Boolean).join(', ')}, pour la période du 1er au ${last} ${MONTHS_FULL[m - 1].toLowerCase()} ${y}, et lui en donne quittance, sous réserve de tous mes droits.`
      : `Je soussigné(e), ${soc.nom || '……………………'}, locataire principal et bailleur, déclare avoir reçu de ${fullName(l)} la somme de ${money(st.paid)} à titre d'acompte sur le loyer et les charges du logement ${[logName(l.logId), im.adresse].filter(Boolean).join(', ')} pour ${MONTHS_FULL[m - 1].toLowerCase()} ${y}. Il reste dû ${money(st.rest)}. Ce reçu ne vaut pas quittance.`}</p>
    <div style="margin-top:36px;display:flex;justify-content:space-between"><div>Fait à Luxembourg, le ${fmtDate(today())}</div><div style="text-align:center;min-width:200px">Signature<div style="border-bottom:1px solid #999;height:60px"></div></div></div>`);
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
    <p style="font-size:12px;line-height:1.6">Je soussigné(e), ${soc.nom || '……………………'}, locataire principal et bailleur, déclare avoir reçu de ${fullName(l)} la somme de ${money(l.caution)} à titre de garantie locative (caution) pour ${where || 'le logement loué'}${l.cautionDate ? ', le ' + fmtDate(l.cautionDate) : ''}${mode ? ', ' + mode : ''}. Cette somme sera restituée à la fin du contrat, après l'état des lieux de sortie, déduction faite des sommes éventuellement dues (loyers, charges, dégâts constatés).</p>
    <div style="margin-top:36px;display:flex;justify-content:space-between;gap:24px"><div>Fait à Luxembourg, le ${fmtDate(today())}</div></div>
    <div style="margin-top:18px;display:flex;justify-content:space-between;gap:24px">
      <div style="text-align:center;min-width:200px">Le bailleur<div style="border-bottom:1px solid #999;height:60px"></div></div>
      <div style="text-align:center;min-width:200px">Le sous-locataire<div style="border-bottom:1px solid #999;height:60px"></div></div>
    </div>`);
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
      ${logs.map((g) => { const o = occupancy(g.id); const bb = bilan({ logId: g.id }); return html`<tr><td>${g.nom}</td><td>${LOG_TYPES[g.type] || ''}</td><td>${occupantsNow(g.id).map(fullName).join(', ') || 'Vacant'}</td><td class="r">${bb.occupants}</td><td class="r">${o ? pct(o.occupied, o.total) + '%' : '—'}</td><td class="r">${money(bb.encaisse)}</td></tr>`; })}
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
  'mt-tab': (d) => { ui.mtTab = d.id; renderView(); },
  'new-interv': () => openOver('interv-form'),
  'edit-interv': (d) => openOver('interv-form', d.id),
  'open-interv': (d) => openSheet('interv', d.id),
  'imm-map': (d) => { ui.mapImm = d.id || ''; renderView(); if (d.id) scrollTo({ top: 0, behavior: 'smooth' }); },
  'cp-tab': (d) => { ui.cpTab = d.id; renderView(); },
  'cp-more': () => { ui.cpMonths = (ui.cpMonths || 1) + 1; renderView(); },
  'cp-clear': () => { ui.cpQ = ''; ui.cpFrom = ''; ui.cpTo = ''; ui.cpMonths = 1; renderView(); },
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
  async 'dep-catchup'() {
    const list = depMissing();
    if (!list.length) return;
    if (!(await confirmBox(`Ajouter ${plural(list.length, 'coût')} aux dépenses ?`, { ok: 'Ajouter', detail: list.slice(0, 8).map((t) => `${fmtDate(t.doneDate)} · ${t.titre} (${placeName(t)}) : ${money(t.cout)}`).join('\n') + (list.length > 8 ? '\n…' : '') + '\n\nSi vous les avez déjà saisis à la main dans Dépenses, annulez pour ne pas les compter deux fois.' }))) return;
    for (const t of list) await syncDepense(t, true);
    toast(`${plural(list.length, 'dépense')} ajoutée${list.length > 1 ? 's' : ''}`);
  },
  'eq-feed': async () => {
    openSheet('eq-feed');
    const fresh = vault.list('intervenants').filter((i) => i.feedNew);
    if (fresh.length) await vault.mutate((tx) => fresh.forEach((i) => tx.put('intervenants', { id: i.id, feedNew: 0 })), 'Activité de l’équipe lue', '');
  },
  async 'eq-on'(d) {
    const i = vault.get('intervenants', d.id);
    if (!i) return;
    await ownerKeys();
    await vault.mutate((tx) => tx.put('intervenants', { id: i.id, espace: { on: true, id: newEspaceId(), key: newEspaceKey(), lang: '', since: today() } }), 'App de l’équipe : accès créé', intervFull(i), i.id);
    toast('Création de l’accès…');
    if (await equipeSync(i.id, true)) {
      try { await eqSetCode(vault.get('intervenants', i.id)); toast('App de l’équipe prête'); } catch (e) { toast(e.message || 'Code impossible (connexion ?)', { bad: true }); }
    }
    if (ui.sheet) { ui.sheet.rendered = false; renderSheet(); }
  },
  async 'eq-off'(d) {
    const i = vault.get('intervenants', d.id);
    if (!i || !i.espace || !(await confirmBox('Désactiver l’app de ' + intervFull(i) + ' ?', { ok: 'Désactiver', danger: true, detail: 'Son code et son lien ne fonctionneront plus. Vous pourrez créer un nouvel accès plus tard.' }))) return;
    try { await vault.espaceDel(i.espace.id); if (i.espace.codeHash) await vault.espCodeDel(i.espace.codeHash); } catch (e) { return toast(e.message || 'Impossible (connexion ?)', { bad: true }); }
    try { localStorage.removeItem('aresEq:' + i.espace.id); } catch {}
    eqHashes.delete(i.id);
    await vault.mutate((tx) => tx.put('intervenants', { id: i.id, espace: { on: false } }), 'App de l’équipe désactivée', intervFull(i), i.id);
    toast('Accès désactivé');
  },
  async 'eq-code'(d) {
    const i = vault.get('intervenants', d.id);
    if (!i || !i.espace || !i.espace.on) return;
    if (i.espace.code && !(await confirmBox('Nouveau code ?', { ok: 'Nouveau code', detail: 'L’ancien code ne fonctionnera plus pour une nouvelle installation.' }))) return;
    try { await eqSetCode(i); toast('Nouveau code créé'); } catch (e) { toast(e.message || 'Impossible (connexion ?)', { bad: true }); }
  },
  async 'eq-copy'(d) {
    const i = vault.get('intervenants', d.id);
    try { await navigator.clipboard.writeText(eqUrl(i)); toast('Lien copié'); } catch { toast('Copie impossible', { bad: true }); }
  },
  async 'del-absence'(d) {
    const i = vault.get('intervenants', d.id);
    const a = (i.absences || []).find((x) => x.id === d.aid);
    if (!a || !(await confirmBox('Supprimer cette absence ?', { ok: 'Supprimer', danger: true, detail: `${ABS_TYPES[a.type]} — ${fmtDate(a.debut)}${a.fin ? ' → ' + fmtDate(a.fin) : ''}` }))) return;
    await vault.mutate((tx) => { tx.put('intervenants', { id: i.id, absences: (i.absences || []).filter((x) => x.id !== a.id) }); if (a.docId) tx.remove('documents', a.docId); }, 'Absence supprimée', intervFull(i), i.id);
    if (a.docId) vault.deleteFile(a.docId).catch(() => {});
  },
  'new-tache': (d) => openOver('tache-form', null, null, d.imm || ui.immFilter || ''),
  'edit-tache': (d) => openOver('tache-form', d.id),
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
  async 'esp-off'(d) {
    const l = vault.get('locataires', d.id);
    if (!l || !l.espace || !(await confirmBox('Désactiver l’espace locataire ?', { ok: 'Désactiver', danger: true, detail: 'Son lien ne fonctionnera plus. Vous pourrez créer un nouvel espace (nouveau lien) plus tard.' }))) return;
    try { await vault.espaceDel(l.espace.id); if (l.espace.codeHash) await vault.espCodeDel(l.espace.codeHash); } catch (e) { return toast(e.message || 'Impossible (connexion ?)', { bad: true }); }
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
  async 'esp-copy'(d) {
    const l = vault.get('locataires', d.id);
    try { await navigator.clipboard.writeText(espUrl(l)); toast('Lien copié'); } catch { toast('Copie impossible', { bad: true }); }
  },
  async 'doc-share'(d) {
    const doc = vault.get('documents', d.id);
    if (!doc) return;
    await vault.mutate((tx) => tx.put('documents', { id: doc.id, shared: !doc.shared }), doc.shared ? 'Document retiré de l’espace locataire' : 'Document visible par le locataire', doc.label, doc.locId);
    toast(doc.shared ? 'Document privé' : 'Visible dans l’espace du locataire');
  },
  'new-pub': (d) => openOver('pub-form', null, null, d.imm || ui.immFilter || ''),
  'edit-pub': (d) => openOver('pub-form', d.id),
  async 'del-pub'(d) {
    const a = vault.get('avis', d.id);
    if (!a || !(await confirmBox('Supprimer cette annonce ?', { ok: 'Supprimer', danger: true, detail: a.nom }))) return;
    await vault.mutate((tx) => tx.remove('avis', d.id), 'Annonce supprimée', a.nom, a.immId);
    goBack();
  },
  'new-avis': (d) => openOver('avis-form', null, null, d.imm || ui.immFilter || ''),
  'edit-avis': (d) => openOver('avis-form', d.id),
  async 'del-avis'(d) {
    const a = vault.get('avis', d.id);
    if (!a || !(await confirmBox('Supprimer cet avis ?', { ok: 'Supprimer', danger: true, detail: a.texte.slice(0, 120) }))) return;
    await vault.mutate((tx) => tx.remove('avis', d.id), 'Avis supprimé', a.texte.slice(0, 60), a.immId);
    goBack();
  },
  'esp-list': () => openOver('esp-list'),
  'door-change': (d) => openOver('door-form', d.id),
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
    const saved = await vault.mutate((tx) => tx.put('taches', { id: t.id, statut: 'fait', doneDate: today(), vu: true }), 'Intervention terminée', `${t.titre} — ${placeName(t)}`, t.immId);
    toast(t.locId ? '✓ Réparé · le locataire voit « Terminé » dans son app' : 'Intervention terminée');
    if (fromSheet) goBack();
    await offerDepense(saved);
  },
  async 'del-interv'(d) {
    const i = vault.get('intervenants', d.id);
    const n = vault.list('taches').filter((t) => t.intervenantId === d.id).length;
    if (!i || !(await confirmBox(`Supprimer ${intervFull(i)} ?`, { ok: 'Supprimer', danger: true, detail: n ? `${plural(n, 'intervention')} restent enregistrées, sans intervenant.` : '' }))) return;
    await vault.mutate((tx) => tx.remove('intervenants', d.id), 'Intervenant supprimé', intervFull(i));
    goBack();
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
  async 'open-vir'(d) {
    const l = vault.get('locataires', d.id);
    if (l && l.virSignal) await vault.mutate((tx) => tx.put('locataires', { id: l.id, virSignal: { ...l.virSignal, vu: true } }), 'Virement signalé : vu', fullName(l), l.id);
    openSheet('loc', d.id);
  },
  'sheet-tab': (d) => { ui.sheet.tab = d.id; ui.sheet.rendered = false; renderSheet(); sheetEl.querySelector('.sheet-body').scrollTop = 0; },
  'open-imm': (d) => openSheet('imm', d.id, d.tab),
  'open-log': (d) => openSheet('log', d.id, d.tab),
  'new-log': (d) => openSheet('log-form', null, null, d.imm),
  'edit-log': (d) => openSheet('log-form', d.id),
  replace: (d) => openSheet('replace-form', d.id),
  'toggle-vers': (d) => toggleVers(d.imm, +d.y, +d.m),
  'loc-seg': (d) => { ui.locSeg = d.id; renderView(); },
  'imm-seg': (d) => { ui.immSeg = d.id; renderView(); },
  'end-imm': (d) => openSheet('endimm-form', d.id),
  'close-sheet': () => goBack(),
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
      if (!(await confirmBox(`${MONTHS_FULL[m - 1]} ${y} est hors du contrat`, { ok: fix.debut ? "Avancer l'entrée et payer" : 'Prolonger et payer', detail: `Le contrat de ${fullName(l)} ${fix.debut ? 'commence le ' + fmtDate(l.debut) : 'finit le ' + fmtDate(l.fin)}. Pour que les totaux restent justes, LuxInterventions va ${what}, puis enregistrer le paiement.` }))) return;
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
    await vault.mutate((tx) => tx.remove('paiements', k), 'Paiement annulé', `${fullName(l)} — ${MONTHS_FULL[+d.m - 1]} ${d.y}`, d.loc);
    toast('Paiement annulé');
    goBack();
  },
  quittance: (d) => printQuittance(d.loc, +d.y, +d.m),
  'caution-recu': (d) => printCaution(d.id),
  'open-tools': () => { openSheet('tools'); toolsLoad(true); },
  'tool-new': () => openOver('tool-form'),
  async 'tool-ok'(d) {
    const it = (ui.tools || []).find((x) => x.id === d.id);
    try { await vault.toolsUpdate(d.id, { status: 'ok' }); toast('Annonce approuvée · en ligne sur le site'); } catch (e) { return toast(e.message || 'Impossible', { bad: true }); }
    vault.mutate(() => {}, 'Annonce approuvée', it ? it.title : '', '');
    toolsLoad(true);
  },
  async 'tool-del'(d) {
    const it = (ui.tools || []).find((x) => x.id === d.id);
    if (!(await confirmBox(`Retirer « ${it ? it.title : 'cette annonce'} » ?`, { ok: 'Retirer', danger: true, detail: 'L’annonce et ses photos disparaissent du site et de l’app du locataire.' }))) return;
    try { await vault.toolsDel(d.id); toast('Annonce retirée'); } catch (e) { return toast(e.message || 'Impossible', { bad: true }); }
    vault.mutate(() => {}, 'Annonce retirée', it ? it.title : '', '');
    toolsLoad(true);
  },
  'champ-year': (d) => { ui.champYear = +d.id; renderView(); },
  'champ-refresh': () => champLoad(true),
  async 'champ-pizza'(d) {
    const y = ui.champYear || new Date().getFullYear();
    const cur = vault.get('reglages', 'champions') || {};
    const prizes = { ...(cur.prizes || {}) };
    const yp = { ...(prizes[y] || {}) };
    const l = vault.get('locataires', d.id) || {};
    if (yp[d.id]) {
      if (!(await confirmBox('Annuler « pizza offerte » ?', { ok: 'Annuler la pizza', detail: fullName(l) }))) return;
      delete yp[d.id];
    } else yp[d.id] = today();
    prizes[y] = yp;
    await vault.mutate((tx) => tx.put('reglages', { id: 'champions', prizes }), yp[d.id] ? 'Pizza offerte 🍕' : 'Pizza annulée', `${fullName(l)} — locataire de l’année ${y}`, d.id);
    if (yp[d.id]) toast('🍕 Bon appétit, ' + (l.prenom || fullName(l)) + ' !');
  },
  'open-chat': (d) => { openSheet('imm', d.id, 'chat'); chatLoad(d.id, true); },
  'chat-refresh': (d) => chatLoad(d.id, true),
  async 'chat-del'(d) {
    if (!(await confirmBox('Supprimer ce message ?', { ok: 'Supprimer', danger: true, detail: 'Il disparaît pour tous les habitants.' }))) return;
    const im = vault.list('immeubles').find((x) => Object.values(x.chats || {}).some((g) => g.id === d.id));
    try { await vault.boardDelMsg(d.id, d.n); } catch (e) { return toast(e.message || 'Suppression impossible', { bad: true }); }
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
      : `mailto:${l.mail}?subject=${encodeURIComponent({ fr: 'Rappel de loyer', it: 'Promemoria affitto', en: 'Rent reminder', pt: 'Lembrete de renda' }[ui.relLang || 'fr'])}&body=${encodeURIComponent(text)}`;
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
    if (!(await confirmBox(`Supprimer « ${g.nom} » ?`, { ok: 'Supprimer', danger: true }))) return;
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
        ${img ? html`<img src="${url}" alt="">` : html`<iframe src="${url}" title="${doc.label}"></iframe>`}`);
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
  async interv(fd) {
    const id = fd.get('id');
    const g = (k) => String(fd.get(k) || '').trim();
    const horaires = [];
    for (let j = 0; j < 7; j++) { const de = g(`h${j}d`), a = g(`h${j}a`); if (de && a) horaires.push({ j, de, a, immId: g(`h${j}i`) }); }
    const rec = { genre: g('genre') || 'interne', cat: g('cat') || 'quotidien', prenom: g('prenom'), nom: g('nom'), metier: fd.get('metier'), tel: g('tel'), mail: g('mail'), tarif: g('tarif'), adresse: g('adresse'), ville: g('ville'), rcs: g('rcs'), tva: g('tva'), horaires, note: g('note') };
    if (!rec.nom) return;
    if (id) rec.id = id;
    await vault.mutate((tx) => tx.put('intervenants', rec), id ? 'Intervenant modifié' : 'Intervenant ajouté', `${intervFull(rec)} (${METIERS[rec.metier]})`);
    toast(id ? 'Intervenant enregistré' : 'Intervenant ajouté');
    goBack();
  },
  async tache(fd) {
    const id = fd.get('id');
    const prev = id ? vault.get('taches', id) : null;
    const recur = fd.get('recur') || '';
    const rec = {
      type: fd.get('type'), titre: fd.get('titre').trim(), immId: fd.get('immId'), logId: fd.get('logId') || '', intervenantId: fd.get('intervenantId') || '',
      date: fd.get('date'), recur, fin: fd.get('fin') || '', cout: fd.get('cout') === '' ? null : num(fd.get('cout')), note: fd.get('note').trim(),
      statut: recur ? 'planifie' : fd.get('statut') || 'afaire',
    };
    if (!rec.titre || !rec.immId) return;
    if (recur && !rec.date) return toast('Indiquez la date de la première fois', { bad: true });
    if (id) rec.id = id;
    if (!recur && rec.statut === 'fait' && !(prev && prev.statut === 'fait')) rec.doneDate = today();
    const saved = await vault.mutate((tx) => tx.put('taches', rec), id ? 'Intervention modifiée' : 'Intervention ajoutée', `${rec.titre} — ${placeName(rec)}`, rec.immId);
    toast(id ? 'Intervention enregistrée' : 'Intervention ajoutée');
    if (!recur) await syncDepense(saved);
    goBack();
  },
  async door(fd) {
    const g = vault.get('logements', fd.get('id'));
    const code = String(fd.get('code') || '').trim();
    if (!g || !/^[0-9A-Za-z#*]{3,16}$/.test(code)) return toast('Code invalide (3 à 16 chiffres ou lettres)', { bad: true });
    const pt = g.porte || {};
    const h = { d: today(), code, raison: fd.get('raison'), note: String(fd.get('note') || '').trim() };
    await vault.mutate((tx) => tx.put('logements', { id: g.id, porte: { code, maj: today(), serrure: String(fd.get('serrure') || '').trim(), info: String(fd.get('info') || '').trim(), hist: [...(pt.hist || []), h].slice(-30) } }), 'Code de porte changé', `${g.nom} (${immName(g.immId)}) — ${h.raison}`, g.immId);
    toast('Code enregistré');
    goBack();
  },
  async pub(fd) {
    const id = fd.get('id');
    const ttl = PUB_TTL.includes(+fd.get('ttl')) ? +fd.get('ttl') : 30;
    const debut = fd.get('debut') || today();
    const rec = { kind: 'pub', cat: PUB_CATS[fd.get('cat')] ? fd.get('cat') : 'autre', nom: fd.get('nom').trim(), adresse: fd.get('adresse').trim(), texte: fd.get('texte').trim(), tel: fd.get('tel').trim(), web: /^https?:\/\//.test(fd.get('web').trim()) ? fd.get('web').trim() : '', immId: fd.get('immId') || '', debut, ttl, fin: addDays(debut, ttl - 1) };
    if (!rec.nom || !rec.adresse) return;
    if (id) rec.id = id;
    await vault.mutate((tx) => tx.put('avis', rec), id ? 'Annonce modifiée' : 'Annonce publiée', `${rec.nom} — jusqu'au ${fmtDate(rec.fin)}`, rec.immId);
    toast(`Annonce publiée jusqu'au ${fmtDate(rec.fin)}`);
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
      adresse: fd.get('adresse').trim(), type: fd.get('type') || 'immeuble', proprietaire: fd.get('proprietaire').trim(), loyer: num(fd.get('loyer')), charges: num(fd.get('charges')),
      bailDebut: fd.get('bailDebut'), bailFin: fd.get('bailFin'), note: fd.get('note').trim(),
    };
    if (id) rec.id = id;
    const saved = await vault.mutate((tx) => tx.put('immeubles', rec), id ? 'Immeuble modifié' : 'Immeuble ajouté', rec.adresse);
    toast(id ? 'Immeuble enregistré' : 'Immeuble ajouté');
    if (saved.pubToken) publishPub(saved.id);
    openSheet('imm', saved.id);
  },
  async log(fd) {
    const id = fd.get('id');
    const rec = {
      nom: fd.get('nom').trim(), immId: fd.get('immId'), type: fd.get('type'), surface: fd.get('surface') ? num(fd.get('surface')) : '',
      etage: fd.get('etage').trim(), partie: fd.get('partie').trim(), loyer: num(fd.get('loyer')), note: fd.get('note').trim(),
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
      pays: g('pays') || 'LU', web: g('web'), rcs: g('rcs'), tvaNum: g('tvaNum'), assujetti: g('assujetti') !== '0', periode: g('periode') || 't', taux: g('taux') };
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
  async tool(fd, form) {
    const files = [...form.querySelector('[name=photos]').files].slice(0, 3);
    if (!files.length) return toast('Ajoutez au moins une photo', { bad: true });
    setBusy(form, true, 'Publication…');
    try {
      const photos = [];
      for (const f of files) photos.push(b64u(await compressPhoto(f)));
      await vault.toolsCreate({ kind: fd.get('kind'), title: fd.get('title'), price: num(fd.get('price')), unit: fd.get('unit'), lieu: fd.get('lieu'), mail: fd.get('mail'), name: societe().nom || 'NOBIS s.a.r.l.', desc: fd.get('desc'), rules: fd.get('rules'), photos });
      vault.mutate(() => {}, 'Annonce publiée (NOBIS)', fd.get('title'), '');
      toast('Annonce publiée sur le site');
      await toolsLoad(true);
      goBack();
    } catch (e) {
      setBusy(form, false);
      toast(e.message || 'Publication impossible', { bad: true });
    }
  },
  async chatpost(fd, form) {
    const im = vault.get('immeubles', fd.get('imm'));
    const g = im && (im.chats || {})[fd.get('gk')];
    const x = String(fd.get('x') || '').trim().slice(0, 1500);
    if (!g || !x) return;
    setBusy(form, true, 'Envoi…');
    try {
      await vault.boardPost(g.id, await sealJson(g.key, { a: societe().nom || 'Gestionnaire', m: 'mgr', x, t: new Date().toISOString() }));
      await chatLoad(im.id, true);
    } catch (e) {
      setBusy(form, false);
      toast(e.message || 'Envoi impossible', { bad: true });
    }
  },
  async absence(fd, form) {
    const id = fd.get('id');
    const i = vault.get('intervenants', id);
    const rec = { id: 'a' + Date.now().toString(36), type: fd.get('type'), debut: fd.get('debut'), fin: fd.get('fin') || '', note: String(fd.get('note') || '').trim() };
    if (!i || !rec.debut) return;
    if (rec.fin && rec.fin < rec.debut) return toast('La date de fin est avant le début', { bad: true });
    const file = fd.get('file');
    if (file && file.size > 10 * 1024 * 1024) return toast('Fichier trop lourd (10 Mo maximum)', { bad: true });
    setBusy(form, true, 'Enregistrement…');
    try {
      let bytes = null;
      if (file && file.size) bytes = /^image\//.test(file.type) ? await compressPhoto(file) : new Uint8Array(await file.arrayBuffer());
      await vault.mutate((tx) => {
        if (bytes) rec.docId = tx.put('documents', { intervId: id, kind: 'absence', label: `${ABS_TYPES[rec.type].replace(/^\S+ /, '')} — ${intervFull(i)}`, date: rec.debut, size: bytes.length, mime: /^image\//.test(file.type) ? 'image/jpeg' : file.type || 'application/pdf' }).id;
        tx.put('intervenants', { id, absences: [...(i.absences || []), rec] });
      }, 'Absence ajoutée', `${intervFull(i)} — ${ABS_TYPES[rec.type]} ${fmtDate(rec.debut)}${rec.fin ? ' → ' + fmtDate(rec.fin) : ''}`, id);
      if (bytes) await vault.saveFile(rec.docId, bytes);
      toast('Absence enregistrée');
    } catch (e) {
      setBusy(form, false);
      toast(e.message || 'Erreur', { bad: true });
    }
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
      const doc = await vault.mutate((tx) => tx.put('documents', { locId, dtype, label, pay: fd.get('pay') || '', shared: true, date: today(), size: file.size, mime: file.type || 'application/octet-stream' }), 'Document ajouté', `${label} → ${fullName(l)}`, locId);
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
// Filtre de la liste « App des locataires » : recherche + avec / sans accès, sans recharger la fenêtre
function filterEspList() {
  const q = (sheetEl.querySelector('[data-input=esp-search]')?.value || '').toLowerCase().trim();
  const f = sheetEl.querySelector('[data-action=esp-filter][aria-pressed=true]')?.dataset.id || '';
  let n = 0;
  sheetEl.querySelectorAll('[data-q]').forEach((r) => { const ok = (!q || q.split(/\s+/).every((w) => r.dataset.q.includes(w))) && (!f || r.dataset.on === f); r.hidden = !ok; if (ok) n++; });
  const c = sheetEl.querySelector('#espCount');
  if (c) c.textContent = q || f ? `${n} résultat${n > 1 ? 's' : ''}` : '';
}
document.addEventListener('input', (e) => {
  const k = e.target.dataset.input;
  if (k === 'esp-search') filterEspList();
  if (k === 'search') { ui.search = e.target.value; renderView(); }
  if (k === 'cp-q') { ui.cpQ = e.target.value; ui.cpMonths = 1; clearTimeout(ui.cpT); ui.cpT = setTimeout(renderView, 200); }
  if (k === 'idx-pct' || k === 'idx-amount') {
    const f = e.target.form;
    const l = vault.get('locataires', f.querySelector('[name=id]').value);
    if (k === 'idx-pct' && e.target.value !== '') f.loyer.value = Math.round(l.loyer * (1 + num(e.target.value) / 100) * 100) / 100;
    if (k === 'idx-amount') f.pct.value = l.loyer ? Math.round(((num(e.target.value) / l.loyer - 1) * 100) * 100) / 100 : '';
  }
});
document.addEventListener('change', (e) => {
  const k = e.target.dataset.input;
  if (k === 'year') { ui.year = +e.target.value; renderView(); }
  if (k === 'dep-file' && e.target.files[0]) { const dep = vault.get('depenses', e.target.dataset.id); if (dep) attachFacture(dep, e.target.files[0]); }
  if (k === 'soc-logo' && e.target.files[0]) setLogo(e.target.files[0]);
  if (k === 'cp-per') { ui.cpPer = e.target.value; ui.cpMonths = 1; renderView(); }
  if (k === 'cp-from' || k === 'cp-to') { ui[k === 'cp-from' ? 'cpFrom' : 'cpTo'] = e.target.value; ui.cpMonths = 1; renderView(); }
  if (k === 'tva-loyer') { const im = vault.get('immeubles', e.target.dataset.id); if (im) vault.mutate((tx) => tx.put('immeubles', { id: im.id, tvaLoyer: parseFloat(e.target.value) || 0 }), 'TVA sur les loyers', `${im.adresse} : ${e.target.value || 0} %`, im.id); }
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
  if (k === 'tache-imm') $('#tacheLog').innerHTML = val(logOptions(e.target.value, ''));
  if (k === 'col-mode') sheetEl.querySelectorAll('[data-mode]').forEach((el) => { el.hidden = el.dataset.mode !== e.target.value; });
  if (k === 'door-reason') { const w = $('#doorWarn'); if (w) w.hidden = e.target.value !== 'Impayé'; }
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
  if (k === 'eq-lang') {
    const i = vault.get('intervenants', e.target.dataset.id);
    if (i && i.espace && i.espace.on) {
      // le message d'invitation suit la nouvelle langue
      Promise.resolve(vault.mutate((tx) => tx.put('intervenants', { id: i.id, espace: { ...i.espace, lang: e.target.value } }), 'App de l’équipe : langue', intervFull(i), i.id))
        .then(() => { if (ui.sheet) { ui.sheet.rendered = false; renderSheet(); } });
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
  navigator.serviceWorker.register('/locataires-sw.js', { scope: '/locataires' }).catch(() => {});
}
boot();
