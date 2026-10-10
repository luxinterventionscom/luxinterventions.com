// LuxInterventions — Gestion locative (interface). L'app est à LuxInterventions (Ares Invest S.A.) ;
// les données de la société cliente (Réglages → Société, ici NOBIS s.a.r.l.) servent aux quittances et aux apps des locataires.
import './reqmark.js';
import { Vault, payKey, isLegacy, ApiError, uid, deviceLabel } from './store.js';
import { passphraseStrength } from './crypto.js';
import qrcode from './qrcode.js';
import { getLang, setLang, startI18n, LANGS, LOCALES } from './i18n.js';
import { videoEmbed } from './video-embed.js';
import { PTL_INVITE } from './ptl-invite.js';
import { pushStatus, pushEnable, pushRefresh, setBadge } from './push-client.js';
import { makePdf } from './pdfmini.js';
import { newEspaceId, newEspaceKey, sealJson, openJson, sealBytes, newOwnerKeys, openFromTenant, unb64u, b64u, newAccessCode, codeHash, wrapWithCode } from './espace-crypto.js';

const VERSION = '2.110.0';
const MAIL = ['info', 'luxinterventions.com'].join('@'); // pas en clair dans le code (robots)
const API = document.querySelector('meta[name="ares-api"]').content;
let firstOpen = true;
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
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18M10 13v2h4v-2"/>',
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
// mini-pastille (photo ou icône du métier) devant un nom
const miniW = (i) => html`<span class="mini-av">${i && photoOk(i.photo) ? html`<img src="${i.photo}" alt="">` : metIcon(i)}</span>`;
const avW = (i) => (i && photoOk(i.photo) ? html`<img class="av-ph" src="${i.photo}" alt="">` : metIcon(i));
const photoField = (rec, fallback) => html`<div class="full photo-pick"><span class="pp-circle">${photoOk(rec.photo) ? html`<img src="${rec.photo}" alt="">` : fallback}</span>
  <input type="hidden" name="photo" value="${photoOk(rec.photo) ? rec.photo : ''}">
  <label class="btn sm" style="cursor:pointer">📷 ${photoOk(rec.photo) ? 'Changer la photo' : 'Ajouter une photo'}<input type="file" accept="image/*" data-input="photo-pick" hidden></label>
  ${photoOk(rec.photo) ? html`<button type="button" class="btn sm ghost" data-action="photo-del">Retirer</button>` : ''}
  <span class="tiny muted">Facultatif — la personne peut aussi la mettre elle-même dans son app (⚙️).</span></div>`;
// photo choisie → carré 256 px (centre de l'image), JPEG léger
async function photoSquare(file, size = 256) {
  const bmp = await createImageBitmap(file);
  const m = Math.min(bmp.width, bmp.height), c = document.createElement('canvas'); c.width = c.height = size;
  c.getContext('2d').drawImage(bmp, (bmp.width - m) / 2, (bmp.height - m) / 2, m, m, 0, 0, size, size);
  return c.toDataURL('image/jpeg', 0.82);
}
const initials = (l) => (l && emojiOk(l.avatar) ? l.avatar : (((l.prenom || '')[0] || '') + ((l.nom || '')[0] || '')).toUpperCase() || '?');
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

// ───────────────────────── Maintenance : intervenants, interventions, collectes des déchets ─────────────────────────
// icône du métier (comme dans l'app des locataires) : à la place des initiales dans les listes de l'équipe
const MET_ICON = { menage: '🧹', homme: '🧰', menuisier: '🔨', electricien: '⚡', plombier: '🔧', chauffagiste: '🔥', macon: '🧱', peintre: '🖌️', serrurier: '🔑', jardinier: '🌿', autre: '🛠️' };
// icône choisie par la personne dans son app (sinon celle de son métier)
const emojiOk = (v) => typeof v === 'string' && v.length <= 16 && /^\p{Extended_Pictographic}/u.test(v);
const metIcon = (i) => (i && emojiOk(i.icon) ? i.icon : MET_ICON[i && i.metier] || '👷');
const METIERS = { menage: 'F. de ménage', homme: 'H. à tout faire', menuisier: 'Menuisier', electricien: 'Électricien', plombier: 'Plombier / sanitaire', chauffagiste: 'Chauffagiste', macon: 'Maçon', peintre: 'Peintre', serrurier: 'Serrurier', jardinier: 'Jardinier', autre: 'Autre' };
const TACHE_TYPES = { nettoyage: '🧹 Nettoyage', reparation: '🔧 Réparation', gros: '🚚 Gros travaux', autre: '📌 Autre' };
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
// Créneaux d'une journée de travail : matin, après-midi, soir (+ suppléments / dépannages ajoutés avec « + »)
const HOR_P = { matin: '🌅 Matin', aprem: '☀️ Après-midi', soir: '🌙 Soir', extra: '➕ Supplément' };
const HOR_MIN = { matin: 3, aprem: 3, soir: 1 };
// heure proposée quand on touche une case vide : début du créneau, ou la fin de la maison précédente
const HOR_START = { matin: '08:00', aprem: '14:00', soir: '18:00', extra: '08:00' };
const horP = (h) => (HOR_P[h.p] ? h.p : (hm(h.de) || 0) < 12 ? 'matin' : (hm(h.de) || 0) < 17 ? 'aprem' : 'soir');
const SEMAINE = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const hm = (s) => { const m = /^(\d{1,2}):(\d{2})$/.exec(s || ''); return m ? +m[1] + +m[2] / 60 : null; };
// Heures prévues par jour de la semaine (0 = lundi)
// une ligne d'horaire sans durée (ex. 00:00–00:00) ne compte pas
document.addEventListener('input', (e) => { const w = e.target.closest && e.target.closest('.tph'); if (w) w.classList.toggle('v', !!e.target.value); }, true);
document.addEventListener('change', (e) => { const w = e.target.closest && e.target.closest('.tph'); if (w) w.classList.toggle('v', !!e.target.value); }, true);
const hors = (i) => (i.horaires || []).filter((h) => h.de && h.a && h.de !== h.a);
const dowOf = (iso) => (new Date(iso + 'T12:00:00').getDay() + 6) % 7;
const okSlot = (h) => h && h.de && h.a && h.de !== h.a;
const horsOn = (i, iso) => (i.plan && Array.isArray(i.plan[iso]) ? i.plan[iso].filter(okSlot) : hors(i).filter((h) => h.j === dowOf(iso))).slice().sort((a, b) => a.de.localeCompare(b.de));
const slotsHours = (hs) => hs.reduce((n, h) => { const a = hm(h.de), b = hm(h.a); return n + (a != null && b != null && b > a ? b - a : 0); }, 0);
const mondayOf = (iso) => addDays(iso, -dowOf(iso));
const dayHours = (i, dow) => hors(i).filter((h) => h.j === dow).reduce((n, h) => { const a = hm(h.de), b = hm(h.a); return n + (a != null && b != null && b > a ? b - a : 0); }, 0);
const absOn = (i, d) => (i.absences || []).find((a) => a.debut <= d && (!a.fin || a.fin >= d));
// Heures du mois : prévues selon l'horaire, moins les jours d'absence (par type)
function intervMonth(i, y, m) {
  const out = { prevu: 0, maladie: 0, conges: 0, autre: 0, jm: 0, jc: 0, ja: 0 };
  const n = new Date(y, m, 0).getDate();
  for (let d = 1; d <= n; d++) {
    const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const h = slotsHours(horsOn(i, iso));
    out.prevu += h;
    const a = absOn(i, iso);
    if (a && h) { out[a.type in out ? a.type : 'autre'] += h; out[{ maladie: 'jm', conges: 'jc' }[a.type] || 'ja']++; }
  }
  out.net = out.prevu - out.maladie - out.conges - out.autre;
  return out;
}
const fmtH = (h) => { const r = Math.round(h * 60); return `${Math.floor(r / 60)} h${r % 60 ? String(r % 60).padStart(2, '0') : ''}`; };
const placeName = (t) => (t.dev ? `📝 ${[t.dev.client, t.dev.adr].filter(Boolean).join(' — ')}` : t.ptl ? `🏢 ${t.ptl.res}${t.ptl.adr ? ' — ' + t.ptl.adr : ''}` : [t.logId ? logName(t.logId) : 'Parties communes', immName(t.immId)].join(' · '));

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

// ───────────────────────── App de l'équipe (lien / code personnel, chiffré) ─────────────────────────
// Chaque personne voit seulement SON planning (lieu, jour, consignes), son horaire et ses absences ;
// elle renvoie « commencé / fini / pas fini » avec note et photos, ses coordonnées, ses arrêts maladie.
const eqUrl = (i) => `${location.origin}/equipe.html#${i.espace.id}.${i.espace.key}`;
const eqAppUrl = () => `${location.origin}/equipe.html`;
const MEN_TAGS = { ok: '⏰ À l’heure', late: '⏰ En retard', nice: '😊 Aimable', rude: '😠 Désagréable', clean: '✨ Bien nettoyé', dirty: '🧹 Oublis / mal nettoyé' };
const MEN_EVAL = { 1: '😞 Insuffisant', 2: '😐 Suffisant', 3: '🙂 Bien', 4: '⭐ Excellent' };
const EQ_ST = { encours: '▶️ Commencé', fait: '✅ Fini', incomplet: '⚠️ Pas fini', refus: '✋ Refusé' };
// Dernier état donné par l'équipe pour une intervention un jour donné
// Photos « avant » / « après » envoyées par l'équipe pour une intervention (6 + 6 maximum)
const EQ_PH = { av: 'Avant', ap: 'Après' }, EQ_PH_MAX = 6;
const eqPhotos = (tid, phase) => vault.list('documents').filter((x) => x.tacheId === tid && x.phase === phase).sort((a, b) => (a.u || 0) - (b.u || 0));
const eqState = (t, d) => { const j = (t.journal || []).filter((x) => x.d === d); return j.length ? j[j.length - 1] : null; };
function equipeData(i) {
  const soc = societe();
  // jusqu'à la fin du mois suivant au plus tard : l'app de l'équipe montre le planning du mois, semaine par semaine
  const from = addDays(today(), -7), to = addDays(today(), 45);
  const tasks = {}, items = [];
  const out1 = (t) => {
    const l = t.locId ? vault.get('locataires', t.locId) : null;
    return {
      titre: t.titre, type: t.type, recur: t.recur ? RECURS[t.recur] : '', note: t.note || '', heure: t.heure || '', heureFin: t.heureFin || '', urgent: !!t.urgent,
      adresse: t.dev ? [t.dev.client, t.dev.adr].filter(Boolean).join(' — ') : t.ptl ? [t.ptl.res, t.ptl.adr].filter(Boolean).join(' — ') : immName(t.immId), lieu: t.dev ? '' : t.ptl ? [t.ptl.lieu, t.ptl.interior].filter(Boolean).join(' · ') : t.logId ? logName(t.logId) : '', statut: t.statut,
      contact: l ? { nom: l.prenom || fullName(l), tel: l.tel || '' } : t.dev && (t.dev.contact || t.dev.tel) ? { nom: t.dev.contact || '', tel: t.dev.tel || '' } : t.ptl && (t.ptl.contact || t.ptl.tel) ? { nom: t.ptl.contact || '', tel: t.ptl.tel || '' } : null,
      // demande d'une gérance : codes, disponibilités, heure, gérance
      ...(t.ptl ? { ger: { org: t.ptl.org, ref: t.ptl.ref, acces: t.ptl.acces || t.ptl.codes || '', dispo: t.ptl.dispo || '', heure: t.heure || '' } } : {}),
      journal: (t.journal || []).slice(-20).map((x) => ({ d: x.d, st: x.st, note: x.note || '', at: x.at, h: x.h || '' })),
      ph: { av: eqPhotos(t.id, 'av').length, ap: eqPhotos(t.id, 'ap').length },
      pb: eqPhotos(t.id, 'pb').slice(0, 6).map((x) => x.id),
    };
  };
  const imIds = new Set(hors(i).map((h) => h.immId).filter(Boolean));
  const jours = {};
  for (const [iso, hs] of Object.entries(i.plan || {})) if (iso >= addDays(today(), -7) && iso <= to) { jours[iso] = hs.filter(okSlot).map((h) => ({ de: h.de, a: h.a, lieu: h.immId ? immName(h.immId) : '' })); hs.forEach((h) => h.immId && imIds.add(h.immId)); }
  for (const x of agenda(from, to).filter((x) => x.kind === 'tache' && x.t.intervenantId === i.id)) {
    if (x.t.immId) imIds.add(x.t.immId);
    tasks[x.t.id] ||= out1(x.t);
    items.push({ d: x.d, tid: x.t.id, late: !!x.late });
  }
  for (const t of vault.list('taches').filter((t) => t.intervenantId === i.id && !t.recur && t.statut === 'fait' && (t.doneDate || '') >= from)) {
    tasks[t.id] ||= out1(t);
    if (!items.some((x) => x.tid === t.id)) items.push({ d: t.doneDate, tid: t.id });
  }
  const k = vault.get('reglages', 'signal');
  return {
    v: 1, kind: 'equipe', lang: i.espace.lang || '', prenom: i.prenom || '', nom: i.nom || '', metier: METIERS[i.metier] || '', icon: metIcon(i), photo: photoOk(i.photo) ? i.photo : '',
    // l'équipe travaille pour ARES INVEST S.A. (LuxInterventions) : son nom et son logo (casque) dans l'app des ouvriers
    societe: { nom: factConf().nom || 'ARES INVEST S.A.', tel: factConf().tel || soc.tel || '', logo: '/ares/icons/lux-192.png' },
    me: { tel: i.tel || '', mail: i.mail || '', adresse: i.adresse || '', ville: i.ville || '' },
    // intervenant occasionnel : il lit et signe sa fiche d'engagement dans son app
    eng: i.genre === 'prive' ? { assur: i.assur || '', police: i.police || '', assurTodo: !!i.assurTodo, signed: !!i.sign, signAt: i.signAt || '' } : null,
    radio: (() => { const r = vault.get('reglages', 'radio'); return r && r.url ? { nom: r.nom || '', url: r.url } : null; })(),
    horaires: hors(i).map((h) => ({ j: h.j, de: h.de, a: h.a, lieu: h.immId ? immName(h.immId) : '' })), jours,
    absences: (i.absences || []).filter((a) => !a.fin || a.fin >= addDays(today(), -30)).map((a) => ({ type: a.type, debut: a.debut, fin: a.fin || '' })),
    pres: Object.fromEntries(Object.entries(i.pres || {}).filter(([d]) => d >= addDays(today(), -7))),
    pubs: pubsActives([...imIds], 'eq').map(pubOut),
    rank: (() => { const y = new Date().getFullYear(), r = eqScores(y), n = r.findIndex(([wid]) => wid === i.id), v = n >= 0 ? r[n][1] : null; return v ? { y, pos: n + 1, of: r.length, pts: v.pts, fait: v.fait, ph: v.ph, urg: v.urg, good: v.good } : null; })(),
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
      const up = new Set(i.espace.files || []);
      const files = Object.values(data.tasks).flatMap((x) => x.pb || []);
      let filesChanged = false;
      for (const did of files) if (!up.has(did)) { const b = await vault.readFile(did).catch(() => null); if (b) { await vault.espacePut(i.espace.id, await sealBytes(i.espace.key, b), did); up.add(did); filesChanged = true; } }
      for (const did of [...up]) if (!files.includes(did)) { await vault.espaceDel(i.espace.id, did).catch(() => {}); up.delete(did); filesChanged = true; }
      await vault.espacePut(i.espace.id, await sealJson(i.espace.key, data));
      eqHashes.set(i.id, h);
      if (filesChanged) await vault.mutate((tx) => { const cur = vault.get('intervenants', i.id); if (cur && cur.espace) tx.put('intervenants', { id: i.id, espace: { ...cur.espace, files: [...up] } }); }, 'App de l’équipe : photos', intervFull(i), i.id);
      await notifyNews(i.espace.id, [...data.items.filter((x) => x.d >= today()).map((x) => 'i:' + x.tid + ':' + x.d), ...(i.assurTodo ? ['assur'] : [])]); // 🛡️ assurance « à faire » → notification sur son téléphone
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
  // fiche actuelle (la langue ou les rubriques ont pu changer pendant l'envoi du code)
  await vault.mutate((tx) => { const cur = vault.get('intervenants', i.id); tx.put('intervenants', { id: i.id, espace: { ...((cur && cur.espace) || e), code, codeHash: h } }); }, 'Code d’accès équipe créé', intervFull(i), i.id);
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
        // l'ouvrier a fini : c'est le bureau qui clôture le chantier (après contrôle des photos)
        if (!t.recur && it.st === 'fait') Object.assign(upd, { fini: { d, by: w.id, h: entry.h || at.slice(11, 16), note } });
        if (!t.recur && it.st === 'incomplet') upd.fini = null;
        // ✋ « Je ne peux pas » (malade, pas disponible…) : le travail revient sans ouvrier, à réaffecter
        if (it.st === 'refus') {
          if (t.fini || t.statut === 'fait' || (t.journal || []).some((x) => x.d === d && x.by === w.id && x.st !== 'refus')) continue;
          upd.refus = { by: w.id, at, d, note };
          upd.refusBy = [...new Set([...(t.refusBy || []), w.id])];
          if (!t.recur) Object.assign(upd, { intervenantId: '', statut: 'afaire' });
        }
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
      } else if (it.k === 'photo') {
        if (photoOk(it.d) || it.d === '') { tx.put('intervenants', { id: w.id, photo: it.d }); feed.push({ at, k: 'info', note: it.d ? '📷 Photo de profil mise à jour' : 'Photo de profil retirée' }); fresh++; }
      } else if (it.k === 'icon') {
        if (emojiOk(it.e)) { tx.put('intervenants', { id: w.id, icon: it.e }); feed.push({ at, k: 'info', note: `Icône choisie : ${it.e}` }); }
      } else if (it.k === 'assur') {
        // 🛡️ l'occasionnel écrit lui-même son assurance RC (elle était « à faire »)
        const co = String(it.assur || '').trim().slice(0, 80), pol = String(it.police || '').trim().slice(0, 40);
        if (w.genre === 'prive' && co && pol) {
          tx.put('intervenants', { id: w.id, assur: co, police: pol, assurTodo: false });
          feed.push({ at, k: 'info', note: `🛡️ Assurance RC reçue : ${co} — police n° ${pol}` });
          fresh++;
        }
      } else if (it.k === 'sign') {
        // signature de la fiche d'engagement, faite par l'intervenant occasionnel dans son app
        if (w.genre === 'prive' && /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(it.png || '') && it.png.length < 400000) {
          tx.put('intervenants', { id: w.id, sign: it.png, signAt: /^\d{4}-\d\d-\d\dT/.test(it.at || '') ? it.at : new Date().toISOString() });
          feed.push({ at, k: 'info', note: '✍️ Fiche d’engagement signée dans son app' });
          fresh++;
        }
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
  for (const it of (Array.isArray(msg.items) ? msg.items : [])) if (it.k === 'task' && it.st === 'fait' && !(vault.get('taches', String(it.tid || '')) || {}).ptl) await syncDepense({ id: String(it.tid || '') }, true);
  await ptlFromTeam(w, msg).catch(() => { /* portail injoignable : la gérance verra au prochain changement */ });
}
// Ouvrier sur une demande de gérance : ▶️ commencé → « en cours », ✅ fini → « terminée » (+ photos après), ⚠️ pas fini → message
async function ptlFromTeam(w, msg) {
  if (!ptlConf()) return;
  const items = Array.isArray(msg.items) ? msg.items : [];
  const after = {};
  for (const it of items) {
    const t = vault.get('taches', String(it.tid || ''));
    if (!t || !t.ptl) continue;
    if (it.k === 'ph' && it.phase === 'ap') { const b = (Array.isArray(it.photos) ? it.photos[0] : '') || it.photo; if (b) (after[t.id] ||= { t, ph: [] }).ph.push(b); }
    if (it.k !== 'task') continue;
    const who = intervFull(w), note = String(it.note || '').slice(0, 1000);
    if (it.st === 'encours') await ptlApi(`tickets/${t.ptl.tid}/status`, { method: 'POST', body: { status: 'encours', technicien: who, text: `🚚 ${who} est sur place${note ? ' — ' + note : ''}` } });
    else if (it.st === 'fait') await ptlApi(`tickets/${t.ptl.tid}/comments`, { method: 'POST', body: { text: `✅ ${who} a fini le travail${note ? ' — ' + note : ''}. Clôture après contrôle par LuxInterventions.` } });
    else if (it.st === 'incomplet') await ptlApi(`tickets/${t.ptl.tid}/comments`, { method: 'POST', body: { text: `⚠️ ${who} : pas terminé${note ? ' — ' + note : ''}` } });
    else if (it.st === 'refus' && !t.intervenantId && t.refus && t.refus.by === w.id) await ptlStatus(t.ptl.tid, 'prise', { technicien: '', planned_at: '', text: '🔄 L’ouvrier prévu n’est pas disponible — LuxInterventions envoie un autre ouvrier.' });
  }
  // photos « après » de l'ouvrier → visibles par la gérance (avant / après)
  for (const { t, ph } of Object.values(after)) {
    const ev = await ptlApi(`tickets/${t.ptl.tid}/comments`, { method: 'POST', body: { text: `📷 Photos après les travaux (${intervFull(w)})` } });
    for (const b of ph.slice(0, 6)) {
      try { await fetch(PTL_API + `tickets/${t.ptl.tid}/photos`, { method: 'PUT', headers: { Authorization: 'Bearer ' + ptlConf().token, 'Content-Type': 'image/jpeg', ...(ev.event_id ? { 'X-Event-Id': ev.event_id } : {}) }, body: new Blob([unb64u(b)], { type: 'image/jpeg' }) }); } catch { /* hors ligne */ }
    }
  }
  if (ui.ptl) ui.ptl.data = null;
}
// Journal de l'équipe (toutes les personnes, ou une seule), le plus récent d'abord
function eqFeedHtml(onlyId, max = 80) {
  const rows = [];
  for (const i of vault.list('intervenants')) if (!onlyId || i.id === onlyId) for (const f of i.feed || []) rows.push([i, f]);
  rows.sort((a, b) => (b[1].at || '').localeCompare(a[1].at || ''));
  if (!rows.length) return html`<p class="small muted">Rien pour le moment. Ce que l’équipe envoie depuis son app (commencé, fini, pas fini, notes, photos, maladie) arrive ici.</p>`;
  return html`<div class="list small">${rows.slice(0, max).map(([i, f]) => {
    const t = f.tid ? vault.get('taches', f.tid) : null;
    const what = f.k === 'eval' ? html`<b>${f.note}</b>` : f.k === 'pres' ? html`<b>${f.note}</b>` : f.k === 'pb' ? html`<b>${f.note}</b>` : f.k === 'task' || f.k === 'ph' ? html`<b>${f.k === 'ph' ? '📷 ' + EQ_PH[f.phase] : EQ_ST[f.st] || f.st}${f.h ? ' 🕒 ' + f.h : ''}</b> · ${t ? t.titre : '(intervention supprimée)'}${t ? html`<span class="meta" style="display:block">📍 ${placeName(t)} · ${fmtDate(f.d)}</span>` : ''}` : f.k === 'abs' ? html`<b>${f.note}</b>` : html`<b>✏️ ${f.note}</b>`;
    return html`<button class="row" ${t ? html`data-action="edit-tache" data-id="${t.id}"` : html`data-action="open-interv" data-id="${i.id}"`} style="text-align:left">
      <span class="grow" style="white-space:normal"><span class="meta" style="display:block">${fmtDateTime(f.at)} · ${miniW(i)}${intervFull(i)}</span>${what}${f.k === 'task' && f.note ? html`<span class="small" style="display:block;margin-top:2px">📝 ${f.note}</span>` : ''}</span>
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
      return html`<button class="row" data-action="edit-tache" data-id="${t.id}" style="text-align:left"><span class="grow" style="white-space:normal">${miniW(i)}<b>${intervFull(i)}</b> — ${tacheIcon(t.type)} ${t.titre}<span class="meta" style="display:block">📍 ${placeName(t)}${st && st.note ? ' · 📝 ' + st.note : ''}</span></span>
        <span class="badge ${st ? (st.st === 'fait' ? 'ok' : st.st === 'incomplet' ? 'bad' : 'warn') : ''}">${st ? EQ_ST[st.st] + ' ' + (st.h || (st.at || '').slice(11, 16)) : absOn(i, d0) ? '🤒 absent' : '⏳ pas encore'}</span></button>`;
    })}
    ${pointes.map((i) => { const p = i.pres[d0]; return html`<div class="row"><span class="grow">${miniW(i)}<b>${intervFull(i)}</b> — 🕒 <span>Arrivée</span> <b>${p.arr || '—'}</b> · <span>Départ</span> <b>${p.dep || '—'}</b></span></div>`; })}
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
  menage: 'Maintenance : passages de la femme de ménage et des ouvriers (aujourd’hui, demain, heure prévue) + avis sur le ménage 😞 → ⭐',
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
const PUB_CATS = { social: '📱 Annonce réseaux sociaux (TikTok, Instagram, Facebook…)', musique: '🎵 Musique (nouveautés, clips)', resto: '🍕 Pizzeria / restaurant', bar: '🍺 Bar / pub', horeca: '☕ Café / snack (Horeca)', courses: '🛒 Supermarché', proxi: '🏪 Commerce de proximité (boulangerie, épicerie, pharmacie…)', bricolage: '🔨 Bricolage / jardinage', meubles: '🛋️ Meubles / décoration', bureau: '🏢 Bureaux (agence, cabinet, fiduciaire…)', services: '🧰 Services', autre: '📌 Autre' };
const PUB_TTL = [7, 14, 30, 60, 90, 180, 365];
const isPub = (a) => a.kind === 'pub';
// À qui s'adresse l'annonce : locataires (par défaut), équipe, portail gérance
const PUB_AUD = { loc: '🏠 Locataires', eq: '👷 Équipe', ptl: '🏢 Portail gérance' };
// Trois emplacements payants dans les apps (locataires, équipe, portail) — du plus cher au moins cher
const PUB_SLOTS = { haut: '🔝 Haut — sous « Bonjour », visible à l’ouverture (prix élevé)', milieu: '⏺ Milieu — au centre de l’app (prix moyen)', bas: '🔽 Bas — en fin de page, au-dessus de la barre crypto (prix bas)' };
const pubSlot = (a) => (PUB_SLOTS[a.slot] ? a.slot : 'milieu');
const pubAud = (a) => (Array.isArray(a.aud) && a.aud.length ? a.aud : ['loc']);
// Statistiques anonymes des annonces (vues : une fois par jour et par téléphone ; clics : carte, appel, site, vidéo)
const PUB_EV = { map: '🗺️ Carte / itinéraire', call: '📞 Appels', web: '🌐 Site web', video: '▶ Vidéo' };
const PUB_LANGS = { fr: 'Français', it: 'Italiano', de: 'Deutsch', pt: 'Português', en: 'English', es: 'Español' };
function pubStatsBlock(a) {
  const st = pubStatsFor(a.id, a.debut || '0000'), last = pubStatsFor(a.id, addDays(today(), -29));
  const days = Array.from({ length: 30 }, (_, i) => addDays(today(), i - 29)), max = Math.max(1, ...days.map((d) => (last.day[d] || {}).v || 0));
  return html`<div class="full pub-stats"><div class="section-label" style="margin:6px 0">📊 Statistiques (anonymes)</div>
    <div class="metrics">
      <div class="metric"><div class="lbl">Vues</div><div class="val">${st.v}</div><div class="sub">depuis le ${fmtDate(a.debut)}</div></div>
      <div class="metric"><div class="lbl">Clics</div><div class="val">${st.taps}</div><div class="sub">taux de clic ${String(st.ctr).replace('.', ',')} %</div></div>
    </div>
    <p class="small" style="margin:8px 0 0">${Object.entries(PUB_EV).map(([k, v]) => html`<span>${v}</span> <b>${st.ev[k] || 0}</b>`).reduce((x, y) => html`${x} · ${y}`)}</p>
    <p class="small muted" style="margin:4px 0 0">${Object.entries(PUB_AUD).filter(([k]) => st.app[k]).map(([k, v]) => html`<span>${v}</span> ${st.app[k].v}/${st.app[k].t}`).reduce((x, y) => html`${x} · ${y}`, '')}</p>
    <div class="pub-bars" title="Vues par jour (30 jours)">${days.map((d) => html`<i style="height:${Math.round((((last.day[d] || {}).v || 0) / max) * 100)}%" title="${fmtDate(d)} : ${(last.day[d] || {}).v || 0}"></i>`)}</div>
    <p class="tiny muted" style="margin:2px 0 0">Vues par jour — 30 derniers jours${ui.pubStats && ui.pubStats.err ? ' · ⚠ statistiques indisponibles (connexion ?)' : ''}</p>
    <button class="btn sm" type="button" data-action="pub-report" data-id="${a.id}" style="margin-top:8px">📄 Rapport pour l’annonceur (A4)</button>
  </div>`;
}
// Rapport A4 à remettre à l'annonceur (diffusion, clics, publics) — en français, comme les autres documents officiels
function pubReport(id) {
  const a = vault.get('avis', id);
  if (!a) return;
  const to = a.fin && a.fin < today() ? a.fin : today();
  const st = pubStatsFor(id, a.debut || '0000', to);
  const weeks = {};
  for (const [d, x] of Object.entries(st.day)) { const w = addDays(d, -((new Date(d + 'T12:00:00').getDay() + 6) % 7)); (weeks[w] ||= { v: 0, t: 0 }); weeks[w].v += x.v; weeks[w].t += x.t; }
  const pct = (n, tot) => (tot ? Math.round((n / tot) * 100) + ' %' : '—');
  const totLang = Object.values(st.lang).reduce((x, y) => x + y, 0);
  printDoc('Rapport de diffusion publicitaire', html`
    <h1 style="margin:6px 0 2px">${a.nom}</h1>
    <p style="margin:0 0 10px">${PUB_CATS[a.cat] || PUB_CATS.autre} · 📍 ${a.adresse}</p>
    <table class="pr-table"><tr><td>Emplacement</td><td><b>${PUB_SLOTS[pubSlot(a)]}</b></td></tr>
      <tr><td>Visible pour</td><td>${pubAud(a).map((k) => PUB_AUD[k]).join(' · ')}</td></tr>
      <tr><td>Période</td><td>du ${fmtDate(a.debut)} au ${fmtDate(to)}${a.fin && a.fin > today() ? ` (diffusion jusqu’au ${fmtDate(a.fin)})` : ''}</td></tr></table>
    <h3>Résultats</h3>
    <table class="pr-table"><tr><td>Vues (téléphones, une fois par jour)</td><td><b>${st.v}</b></td></tr>
      <tr><td>Clics au total</td><td><b>${st.taps}</b> — taux de clic ${String(st.ctr).replace('.', ',')} %</td></tr>
      ${Object.entries(PUB_EV).map(([k, v]) => html`<tr><td>${v}</td><td>${st.ev[k] || 0}</td></tr>`)}</table>
    ${Object.keys(st.app).length ? html`<h3>Par public</h3><table class="pr-table"><tr><th>Public</th><th>Vues</th><th>Clics</th></tr>${Object.entries(PUB_AUD).filter(([k]) => st.app[k]).map(([k, v]) => html`<tr><td>${v}</td><td>${st.app[k].v}</td><td>${st.app[k].t}</td></tr>`)}</table>` : ''}
    ${totLang ? html`<h3>Langue des personnes touchées</h3><table class="pr-table">${Object.entries(st.lang).sort((x, y) => y[1] - x[1]).map(([k, n]) => html`<tr><td>${PUB_LANGS[k] || k}</td><td>${pct(n, totLang)}</td></tr>`)}</table>` : ''}
    ${Object.keys(weeks).length ? html`<h3>Semaine par semaine</h3><table class="pr-table"><tr><th>Semaine du</th><th>Vues</th><th>Clics</th></tr>${Object.keys(weeks).sort().map((w) => html`<tr><td>${fmtDate(w)}</td><td>${weeks[w].v}</td><td>${weeks[w].t}</td></tr>`)}</table>` : ''}
    <p style="font-size:10pt;color:#555;margin-top:14px">Vues : nombre de téléphones qui ont affiché l’annonce, comptés une seule fois par jour. Clics : touchers sur les boutons de l’annonce (carte / itinéraire, appel, site web, vidéo). Statistiques entièrement anonymes : aucune donnée personnelle n’est collectée ni transmise (RGPD).</p>`);
}
async function pubStatsLoad(force) {
  const st = ui.pubStats;
  if (!force && st && (st.loading || Date.now() - st.at < 15000)) return;
  ui.pubStats = { ...(st || { rows: [] }), loading: true, at: Date.now() };
  try { ui.pubStats = { rows: await vault.pubStats(400), at: Date.now() }; } catch { ui.pubStats = { rows: (st && st.rows) || [], at: Date.now(), err: true }; }
  if (ui.route === 'maintenance') renderView();
  if (ui.sheet && ui.sheet.kind === 'pub-form') { ui.sheet.rendered = false; renderSheet(); }
}
function pubStatsFor(id, from = '0000', to = '9999') {
  const r = { v: 0, taps: 0, ev: {}, app: {}, lang: {}, day: {} };
  for (const x of (ui.pubStats && ui.pubStats.rows) || []) {
    if (x.ad !== id || x.day < from || x.day > to) continue;
    const d = (r.day[x.day] ||= { v: 0, t: 0 });
    if (x.ev === 'v') { r.v += x.n; d.v += x.n; (r.app[x.app] ||= { v: 0, t: 0 }).v += x.n; r.lang[x.lang] = (r.lang[x.lang] || 0) + x.n; }
    else { r.taps += x.n; d.t += x.n; r.ev[x.ev] = (r.ev[x.ev] || 0) + x.n; (r.app[x.app] ||= { v: 0, t: 0 }).t += x.n; }
  }
  r.ctr = r.v ? Math.round((r.taps / r.v) * 1000) / 10 : 0;
  return r;
}
const pubOut = (a) => ({ id: a.id, slot: pubSlot(a), cat: a.cat || 'autre', nom: a.nom || '', adresse: a.adresse || '', texte: a.texte || '', tel: a.tel || '', web: a.web || '', video: a.video || '', fin: a.fin || '' });
const pubsActives = (immId, aud = 'loc') => vault.list('avis').filter((a) => isPub(a) && pubAud(a).includes(aud) && (aud === 'ptl' || !immId || !a.immId || (Array.isArray(immId) ? immId.includes(a.immId) : a.immId === immId)) && (!a.debut || a.debut <= today()) && (!a.fin || a.fin >= today()));
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
// Contrôle « Maintenance » : ce que le locataire reçoit (7 jours), et sinon pourquoi rien n'apparaît
function mtPreview(l) {
  const show = { ...ESP_ALL, ...((l.espace || {}).show || {}) };
  if (!show.menage) return html`<div class="alert warn" style="margin:0 0 12px">${icon('alert')}<div>« Maintenance » est décoché : le locataire ne voit pas les passages.</div></div>`;
  const vis = espaceData(l).visits || [];
  const im = immName(l.immId), d0 = today(), dN = addDays(d0, 7);
  // pour chaque personne de l'équipe absente de la liste : pourquoi
  const why = vault.list('intervenants').filter((i) => !i.archive && !vis.some((v) => v.w === i.id)).map((i) => {
    const r = [];
    const hs = hors(i);
    const noPlace = hs.filter((h) => !h.immId).length;
    const other = [...new Set(hs.filter((h) => h.immId && h.immId !== l.immId).map((h) => immName(h.immId)))];
    if (noPlace) r.push(`${noPlace} créneau(x) d’horaire sans lieu`);
    if (other.length) r.push(`horaire à ${other.join(', ')}`);
    // même adresse mais autre fiche immeuble (doublon) : la cause la plus difficile à voir
    const norm = (x) => String(x || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
    if (hs.some((h) => h.immId && h.immId !== l.immId && norm(immName(h.immId)) === norm(im))) r.push('⚠️ son horaire pointe vers une AUTRE fiche immeuble qui a la même adresse (doublon dans Immeubles) : choisissez le bon immeuble dans son horaire');
    const ts = vault.list('taches').filter((t) => t.intervenantId === i.id && (t.recur || t.statut !== 'fait'));
    const here = ts.filter((t) => t.immId === l.immId);
    for (const t of here) {
      const nx = agenda(d0, addDays(d0, 400)).find((x) => x.kind === 'tache' && x.t.id === t.id);
      if (t.logId && t.logId !== l.logId) r.push(`« ${t.titre} » : dans un autre logement (${logName(t.logId)}), seul son locataire le voit`);
      else if (!nx) r.push(`« ${t.titre} » : pas de date prévue`);
      else if (nx.d > dN) r.push(`« ${t.titre} » : prévu le ${fmtDate(nx.d)} (au-delà de 7 jours)`);
    }
    const elsewhere = [...new Set(ts.filter((t) => t.immId !== l.immId).map((t) => immName(t.immId)))];
    if (elsewhere.length) r.push(`interventions à ${elsewhere.join(', ')}`);
    if (!hs.length && !ts.length) r.push('aucun horaire ni intervention');
    return `${intervFull(i)} — ${r.join(' · ') || 'rien de prévu ici'}`;
  });
  const list = vis.length ? html`<div class="list small" style="margin-top:6px">${vis.map((v) => html`<div class="row"><span class="grow">${v.off ? '⚫' : v.d === d0 ? '🔴' : v.d === addDays(d0, 1) ? '🟡' : '🟢'} <b>${fmtDate(v.d)}</b> · ${METIERS[v.m] || v.m} ${v.nom ? '(' + v.nom + ')' : ''}${v.t ? ' · ' + v.t : ''}</span><span class="meta">${v.de}${v.a ? '–' + v.a : ''}${v.off ? ' · absent' : ''}</span></div>`)}</div>`
    : html`<p class="small" style="margin:6px 0 0"><b>🛠️ Maintenance : aucun passage prévu dans les 7 prochains jours pour cet immeuble.</b> <span data-notr="1">(${im})</span></p>`;
  return html`<div class="card" style="margin:0 0 12px;padding:12px"><b>🛠️ Maintenance — ce que voit le locataire (7 jours)</b>${list}
    ${why.length ? html`<div class="section-label" style="margin-top:10px">Pas affichés chez ce locataire</div><ul class="small" style="margin:4px 0 0;padding-left:18px">${why.map((w) => html`<li>${w}</li>`)}</ul>
    <p class="tiny muted" style="margin:6px 0 0">Pour qu’une personne de l’équipe apparaisse ici, son horaire doit avoir comme lieu l’adresse de cet immeuble (Maintenance → Équipe → la personne → Modifier → le jour → « — lieu — »).</p>` : ''}</div>`;
}
const appUrl = () => `${location.origin}/espace.html`;
// Ce que le locataire voit — uniquement les rubriques cochées, uniquement ses propres données
function espaceData(l) {
  const e = l.espace, show = { ...ESP_ALL, ...(e.show || {}) };
  const g = vault.get('logements', l.logId), im = vault.get('immeubles', l.immId);
  const soc = societe();
  const out = {
    v: 1, gv: VERSION, lang: e.lang || '', prenom: l.prenom || '', nom: l.nom || '', avatar: emojiOk(l.avatar) ? l.avatar : '', photo: photoOk(l.photo) ? l.photo : '', logement: g ? logLabel(g) : '', adresse: im ? im.adresse : '', ville: im ? im.ville || '' : '', show,
    societe: { nom: soc.nom && !WRONG_ID.test(soc.nom) ? soc.nom : 'NOBIS s.a.r.l.', adresse: soc.adresse || '', ville: soc.ville || '', tel: soc.tel || '', email: soc.email || '', logo: soc.logo || '', sign: soc.signature || '', signW: soc.signW || 8 },
    loyer: l.loyer || 0, parti: isGone(l) ? l.sortie : '', mail: l.mail || '',
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
    out.years = [cy, cy - 1].filter((y) => MONTHS.some((_, i) => isDue(l, y, i + 1) || payment(l.id, y, i + 1))).map((y) => {
      const s = yearStats(l, y);
      return { y, rest: s.rest, upcoming: s.upcoming, paid: s.paid, months: MONTHS.map((_, i) => { const st = payState(l, y, i + 1); return [st.due, st.paid, st.p ? st.p.date || '' : '']; }) };
    });
  }
  // code de la porte : seulement s'il est actif et pas expiré (date de fin choisie dans l'app de gestion)
  if (show.porte && g && g.porte && g.porte.code && !g.porte.off && (!g.porte.fin || g.porte.fin >= today())) out.porte = { code: g.porte.code, depuis: g.porte.maj || '', info: g.porte.info || '', fin: g.porte.fin || '' };
  if (show.contrat) out.contrat = { debut: l.debut || '', fin: l.fin || '', revision: l.revision || '', caution: l.caution || 0, cautionDate: l.cautionDate || '', cautionMode: l.cautionMode || '' };
  if (show.docs) out.docs = vault.list('documents').filter((d) => d.locId === l.id && d.shared).sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .map((d) => ({ id: d.id, label: d.label, dtype: d.dtype || '', pay: d.pay || '', date: d.date, mime: d.mime, size: d.size }));
  if (show.edl && g) {
    out.edl = EDL_ROOMS.map(([k]) => edlIn(g.id, k)).filter(Boolean).map((d) => ({ id: d.id, room: d.room, date: d.date }));
    out.edlOut = edlOf(g.id, 'edl-out').filter((d) => d.locId === l.id).map((d) => ({ room: d.room, date: d.date }));
  }
  if (show.coll && im) { out.coll = pubData(im).items; if (im.pubToken) out.collLink = pubUrl(im); }
  if (show.menage) {
    // horaires réguliers des femmes de ménage dans cet immeuble + nettoyages datés (14 jours) ; l'app du locataire affiche celui du jour
    const men = vault.list('intervenants').filter((i) => i.metier === 'menage' && !i.archive);
    const week = [], dates = [];
    for (const i of men) {
      const off = (i.absences || []).filter((a) => !a.fin || a.fin >= today()).map((a) => [a.debut, a.fin || '9999-12-31']);
      for (const h of hors(i)) if (h.immId === l.immId) week.push({ w: i.id, nom: i.prenom || '', j: h.j, de: h.de, a: h.a, off });
    }
    for (const x of agenda(today(), addDays(today(), 14)).filter((x) => x.kind === 'tache' && x.t.type === 'nettoyage' && x.t.intervenantId && x.t.immId === l.immId && (!x.t.logId || x.t.logId === l.logId))) {
      const i = vault.get('intervenants', x.t.intervenantId);
      if (!i) continue;
      const h = horsOn(i, x.d).find((hh) => hh.immId === l.immId);
      dates.push({ w: i.id, nom: i.prenom || '', d: x.d, de: h ? h.de : '', a: h ? h.a : '', off: !!absOn(i, x.d) });
    }
    out.menage = { week, dates };
    // Maintenance : passages des 7 prochains jours dans cet immeuble — femme de ménage ET ouvriers (horaire habituel + interventions datées)
    // le titre d'une intervention : parties communes ou son propre logement (rien sur les logements des voisins)
    const visits = [], d0 = today(), dN = addDays(d0, 7);
    for (const i of vault.list('intervenants').filter((x) => !x.archive)) {
      for (let d = d0; d <= dN; d = addDays(d, 1)) for (const h of horsOn(i, d)) if (h.immId === l.immId) visits.push({ d, w: i.id, nom: i.prenom || '', m: i.metier || 'autre', de: h.de, a: h.a || '', off: !!absOn(i, d) });
    }
    for (const x of agenda(d0, dN).filter((x) => x.kind === 'tache' && x.t.intervenantId && x.t.immId === l.immId && (!x.t.logId || x.t.logId === l.logId) && x.t.statut !== 'fait')) {
      const i = vault.get('intervenants', x.t.intervenantId);
      if (!i || i.archive) continue;
      const own = !x.t.logId || x.t.logId === l.logId ? x.t.titre : '';
      const same = visits.find((v) => v.w === i.id && v.d === x.d);
      if (same) { if (own) same.t = own; same.ty = x.t.type || ''; continue; }
      const h = horsOn(i, x.d).find((hh) => hh.immId === l.immId);
      visits.push({ d: x.d, w: i.id, nom: i.prenom || '', m: i.metier || 'autre', de: h ? h.de : '', a: h ? h.a : '', off: !!absOn(i, x.d), ty: x.t.type || '', t: own });
    }
    out.visits = visits.sort((a, b) => a.d.localeCompare(b.d) || (a.de || '99').localeCompare(b.de || '99'));
  }
  if (show.pub) out.pubs = pubsActives(l.immId).sort((a, b) => (b.debut || '').localeCompare(a.debut || '')).map(pubOut);
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
  partie: 'Même appartement (par défaut) : les chambres d’un même appartement en colocation discutent ensemble',
  logement: 'Même logement uniquement',
  structure: 'Toute la structure : tous les habitants ensemble (appartements différents)',
};
const chatScope = (im) => (im.chat && im.chat.scope) || 'partie';
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
  for (const im of vault.list('immeubles').filter(binsOn)) {
    for (const [gk, g] of Object.entries(im.chats || {})) { try { await binRecord(vault.get('immeubles', im.id), gk, g, await chatRead(g)); } catch { /* hors ligne */ } }
  }
  try { localStorage.setItem('aresBinDay', today()); } catch {}
}
// 📣 annonces publicitaires des partenaires (vendues) : dans Comptabilité → Abonnements
function pubSection(f = '') {
      pubStatsLoad();
      const all = vault.list('avis').filter((a) => isPub(a) && (!f || !a.immId || a.immId === f)).sort((a, b) => (b.debut || '').localeCompare(a.debut || ''));
      const on = all.filter((a) => !a.fin || a.fin >= today()), off = all.filter((a) => a.fin && a.fin < today()).slice(0, 20);
      const left = (a) => { if (!a.fin) return 'sans fin'; const n = Math.round((new Date(a.fin + 'T12:00:00') - new Date(today() + 'T12:00:00')) / 864e5); return a.debut > today() ? `à partir du ${fmtDate(a.debut)}` : n <= 0 ? 'dernier jour' : `encore ${plural(n, 'jour')}`; };
      const row = (a) => html`<button class="row" data-action="edit-pub" data-id="${a.id}"><span class="grow"><span class="title" style="display:block;white-space:normal">${(PUB_CATS[a.cat] || PUB_CATS.autre).split(' ')[0]} <b>${a.nom}</b></span>
        <span class="meta" style="display:block;white-space:normal">📍 ${a.adresse}${a.texte ? ' · ' + a.texte.slice(0, 90) : ''}${a.video ? ' · ▶ ' + (videoEmbed(a.video) ? videoEmbed(a.video).name : 'vidéo') : ''}</span>
        <span class="meta" style="display:block"><b>${PUB_SLOTS[pubSlot(a)].split(' — ')[0]}</b> · ${pubAud(a).map((k) => html`<span>${PUB_AUD[k]}</span>`).reduce((x, y) => html`${x} · ${y}`)}</span>
        <span class="meta"><span>${a.immId ? immName(a.immId) : 'Tous les immeubles'}</span>${a.fin ? html` · <span>${fmtDate(a.debut)} → ${fmtDate(a.fin)}</span>` : ''}</span>
        ${(() => { const st = pubStatsFor(a.id, a.debut || '0000'); return st.v || st.taps ? html`<span class="meta" style="display:block">📊 <b>${st.v}</b> <span>vues</span> · <b>${st.taps}</b> <span>clics</span>${st.v ? html` · <span>${String(st.ctr).replace('.', ',')} %</span>` : ''}</span>` : ''; })()}</span>
        <span class="badge ${a.fin && a.fin < today() ? '' : a.fin && a.fin <= addDays(today(), 3) ? 'warn' : 'ok'}">${a.fin && a.fin < today() ? 'expirée' : left(a)}</span></button>`;
      return html`<p class="small muted" style="margin:0 0 10px">Annonces de partenaires (pizzerias, bars / pubs, bricolage, meubles…) dans l'app des locataires, avec la carte sous « Bonjour ». Chaque annonce disparaît seule à la fin de sa durée.</p>
        ${all.length ? html`<p class="tiny muted" style="margin:-4px 0 8px">📊 Statistiques anonymes : vues (une fois par jour et par téléphone) et clics. <a href="#" data-action="pub-stats-refresh">↻ Actualiser les statistiques</a></p>` : ''}
        ${on.length ? html`<div class="list" style="margin-bottom:14px">${on.map(row)}</div>` : empty('msg', 'Aucune annonce en cours.', html`<button class="btn primary" data-action="new-pub" data-imm="${f}">${icon('plus')} Nouvelle annonce</button>`)}
        ${off.length ? html`<div class="section-label">Expirées (touchez pour republier)</div><div class="list">${off.map(row)}</div>` : ''}
        ${radioCard()}`;
}
// 💼 abonnements des gérances (offre « Gérez aussi vos propres locataires ») : formule, prix, payé jusqu'au…
const ABO_PLANS = { decouverte: ['Découverte', 0], pro: ['Pro', 29], agence: ['Agence', 79], mesure: ['Sur devis', 0] };
const aboAll = () => (vault.get('reglages', 'abos') || {}).list || {};
const aboOf = (orgId) => aboAll()[orgId] || null;
const aboState = (a) => (!a ? 'none' : a.plan === 'decouverte' ? 'free' : a.paidUntil && a.paidUntil >= today() ? 'ok' : 'due');
const aboOffersOn = () => (vault.get('reglages', 'abos') || {}).offers !== false;
function aboSection() {
  const sub = ui.aboTab || 'ger';
  const tabs = html`<div class="tabs" role="tablist" style="max-width:560px;margin-bottom:14px">${[['ger', html`💼 <span class="tab-long">Abonnements </span>gérances`], ['pub', html`📣 Annonces<span class="tab-long"> publicitaires</span>`]].map(([k, l]) => html`<button class="tab" role="tab" aria-selected="${sub === k}" data-action="abo-tab" data-id="${k}">${l}</button>`)}</div>`;
  if (sub === 'pub') return html`${tabs}<p style="margin:0 0 10px"><button class="btn primary" data-action="new-pub" data-imm="">${icon('plus')} Annonce</button></p>${pubSection('')}`;
  const on = aboOffersOn();
  const sw = html`<div class="card" style="margin-bottom:14px;display:flex;gap:12px;align-items:center;flex-wrap:wrap"><span class="grow"><b>Offres d’abonnement dans le portail des gérances</b><span class="meta" style="display:block">${on ? 'Les gérances voient « 💼 Nos abonnements » et « Voir les offres ».' : 'Masquées : les gérances ne voient aucune offre d’abonnement.'}</span></span>
    <button class="btn ${on ? 'primary' : ''}" data-action="abo-offers" aria-pressed="${on}">${on ? '🟢 Activé' : '⚪ Désactivé'}</button></div>`;
  return html`${tabs}${sw}${aboGer()}`;
}
function aboGer() {
  const d = ui.ptl.data;
  if (!d && ptlConf()) ptlLoad();
  const orgs = d ? d.orgs : [];
  const rows = orgs.map((o) => ({ o, a: aboOf(o.id) }));
  const subs = rows.filter((x) => x.a), none = rows.filter((x) => !x.a);
  const due = subs.filter((x) => aboState(x.a) === 'due'), ok = subs.filter((x) => aboState(x.a) === 'ok');
  const mrr = sum(subs.filter((x) => x.a.plan !== 'decouverte'), (x) => (x.a.periode === 'an' ? (+x.a.prix || 0) / 12 : +x.a.prix || 0));
  const st = (a) => { const k = aboState(a); return k === 'free' ? html`<span class="badge">🎁 gratuit</span>` : k === 'ok' ? html`<span class="badge ok">✅ payé jusqu’au ${fmtDate(a.paidUntil)}</span>` : html`<span class="badge cont-blink">⏳ à payer</span>`; };
  const row = ({ o, a }) => html`<button class="row" data-action="abo-edit" data-id="${o.id}"><span class="grow"><span class="title" style="display:block">🏢 ${o.name}</span>
      <span class="meta">${a ? html`<b>${(ABO_PLANS[a.plan] || ABO_PLANS.pro)[0]}</b> · ${a.prix ? eur(+a.prix) + (a.periode === 'an' ? ' / an' : ' / mois') : 'gratuit'}${a.debut ? ' · depuis le ' + fmtDate(a.debut) : ''}` : 'pas d’abonnement'}</span></span>${a ? st(a) : html`<span class="badge">＋ Abonnement</span>`}</button>`;
  return html`<div class="metrics" style="margin-bottom:14px">
      <div class="metric"><div class="lbl">Abonnements</div><div class="val">${subs.length}</div><div class="sub">${ok.length} payé(s) · ${subs.filter((x) => x.a.plan === 'decouverte').length} gratuit(s)</div></div>
      <div class="metric ${due.length ? 'cont-blink-box' : ''}"><div class="lbl">À payer</div><div class="val ${due.length ? 'red' : ''}">${due.length}</div><div class="sub">${eur(sum(due, (x) => +x.a.prix || 0))}</div></div>
      <div class="metric hero"><div class="lbl">Revenu mensuel</div><div class="val accent">${eur(mrr)}</div><div class="sub">abonnements payants</div></div></div>
    <div class="section-label">💼 Abonnements des gérances</div>
    ${!ptlConf() ? html`<p class="muted small">Connectez d’abord le Portail gérance (menu Gérances).</p>` : !d ? html`<p class="muted small">Chargement…</p>` : html`
      ${due.length ? html`<div class="list" style="margin-bottom:10px">${due.map(row)}</div>` : ''}
      ${ok.length || subs.length - due.length ? html`<div class="list" style="margin-bottom:10px">${subs.filter((x) => aboState(x.a) !== 'due').map(row)}</div>` : ''}
      ${none.length ? html`<details style="margin-bottom:14px"><summary class="small" style="cursor:pointer">Gérances sans abonnement (${none.length})</summary><div class="list" style="margin-top:8px">${none.map(row)}</div></details>` : ''}
      <p class="tiny muted" style="margin:0 0 18px">Quand une gérance touche « Je suis intéressé » dans son portail, vous recevez une notification. Touchez une gérance pour choisir sa formule et noter ses paiements.</p>`}
`;
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
          for (const m of await chatRead(old).catch(() => [])) { const { n, ...msg } = m; last = (await (await vault.boardPost(g.id, await sealJson(g.key, msg))).json()).n || last; }
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
          for (const m of msgs) { const { n, ...msg } = m; await vault.boardPost(dest.n.id, await sealJson(dest.n.key, msg)).catch(() => {}); }
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

// « Du nouveau » pour un locataire ou l'équipe (avis, document, réponse à un signalement, nouveau travail…) :
// on compare avec la dernière publication et on envoie une notification (sans contenu) si quelque chose s'ajoute
const espNews = (d) => [
  ...(d.avis || []).map((a) => 'a:' + a.texte.slice(0, 40)), ...(d.docs || []).map((x) => 'd:' + x.id), ...(d.edl || []).map((x) => 'e:' + x.id),
  ...(d.signals || []).map((x) => 's:' + x.titre.slice(0, 30) + ':' + x.statut), ...(d.pubs || []).map((x) => 'p:' + x.id), ...(d.porte ? ['k:' + d.porte.code] : []),
];
async function notifyNews(espId, keys) {
  const k = 'aresNews:' + espId;
  let prev = null;
  try { prev = JSON.parse(localStorage.getItem(k) || 'null'); } catch { /* stockage indisponible */ }
  try { localStorage.setItem(k, JSON.stringify(keys)); } catch { /* stockage plein */ }
  if (Array.isArray(prev) && keys.some((x) => !prev.includes(x))) await vault.espNotify(espId).catch(() => {});
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
      await notifyNews(l.espace.id, espNews(data));
      try { localStorage.setItem('aresEsp:' + l.espace.id, h); } catch {}
      // on repart de la fiche actuelle : la langue, le code ou les rubriques ont pu changer pendant la publication
      if (docsChanged) await vault.mutate((tx) => { const cur = vault.get('locataires', l.id); if (cur && cur.espace) tx.put('locataires', { id: l.id, espace: { ...cur.espace, docs: [...up] } }); }, 'Espace locataire : documents', fullName(l), l.id);
    } catch (e) {
      if (loud) { toast(e.message || 'Publication impossible (connexion ?)', { bad: true }); return false; }
    }
  }
  if (!onlyId) { await equipeSync(); await portailPubsSync(); }
  return true;
}
// Annonces pour le portail gérance : publiées en clair (publicité, aucune donnée personnelle), relues par le portail
async function portailPubsSync() {
  const list = pubsActives('', 'ptl').map(pubOut), offers = aboOffersOn();
  const h = await sha256Hex(JSON.stringify([list, offers]));
  let prev = '';
  try { prev = localStorage.getItem('aresPubPtl') || ''; } catch { /* stockage indisponible */ }
  if (h === prev) return;
  try { await vault.pubsPortail(list, offers); localStorage.setItem('aresPubPtl', h); } catch { /* Worker pas encore à jour ou hors ligne : on réessaiera */ }
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
      if (msg.type === 'menage-eval') {
        // avis du locataire sur le passage de la femme de ménage (1 = 😞 … 4 = ⭐)
        const w = vault.get('intervenants', String(msg.w || ''));
        const v = Math.round(+msg.v), d = /^\d{4}-\d{2}-\d{2}$/.test(msg.d || '') ? msg.d : today();
        if (w && v >= 1 && v <= 4) {
          // cases rapides (à l'heure, aimable…) + commentaire libre, s'il y en a
          const tags = (Array.isArray(msg.tags) ? msg.tags : []).filter((k) => MEN_TAGS[k]).slice(0, 6);
          const note = String(msg.note || '').trim().slice(0, 500);
          const prevE = (w.evals || []).find((e) => e.locId === l.id && e.d === d);
          const evals = (w.evals || []).filter((e) => !(e.locId === l.id && e.d === d));
          evals.push({ d, v, locId: l.id, at: String(msg.t || new Date().toISOString()).slice(0, 30), ...(tags.length || note ? { tags, note } : prevE && (prevE.tags || prevE.note) ? { tags: prevE.tags || [], note: prevE.note || '' } : {}) });
          const extra = [tags.map((k) => MEN_TAGS[k]).join(' · '), note ? `« ${note} »` : ''].filter(Boolean).join(' — ');
          const feed = [...(w.feed || []), { at: String(msg.t || new Date().toISOString()).slice(0, 30), k: 'eval', note: `${MEN_EVAL[v]} — avis de ${fullName(l)} (${fmtDate(d)})${extra ? ' — ' + extra : ''}` }];
          await vault.mutate((tx) => tx.put('intervenants', { id: w.id, evals: evals.slice(-300), feed: feed.slice(-200), feedNew: (w.feedNew || 0) + 1 }), 'Avis sur le ménage', `${intervFull(w)} — ${MEN_EVAL[v]}`, w.id);
          n++;
        }
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

// ───────────────────────── Branche « gérances » : le Portail gérance piloté depuis l'app de gestion ─────────────────────────
// Les gérances (sociétés externes) utilisent le Portail gérance ; ici, LuxInterventions les crée, invite leurs responsables,
// gère leurs résidences et peut les supprimer. La session du portail (compte LuxInterventions) est gardée dans le coffre chiffré.
const PTL_API = API.replace(/\/$/, '') + '/api/portail/';
const PTL_ROLES = { gerance_admin: 'Responsable', gerance_user: 'Collaborateur' };
const ptlConf = () => { const c = vault.get('reglages', 'portail'); return c && c.token ? c : null; };
class PtlError extends Error { constructor(status, message) { super(message); this.status = status; } }
async function ptlApi(path, opts = {}) {
  const c = ptlConf();
  const headers = {};
  if (c && !opts.anon) headers.Authorization = 'Bearer ' + c.token;
  if (opts.body) headers['Content-Type'] = 'application/json';
  let r;
  try { r = await fetch(PTL_API + path, { method: opts.method || 'GET', headers, body: opts.body ? JSON.stringify(opts.body) : undefined, cache: 'no-store' }); } catch { throw new PtlError(0, 'Pas de connexion internet'); }
  const j = await r.json().catch(() => ({}));
  if (r.status === 401 && c && !opts.anon) {
    await vault.mutate((tx) => tx.put('reglages', { id: 'portail', token: '' }), 'Portail gérance : session expirée', c.email || '');
    ui.ptl.data = null;
    throw new PtlError(401, 'Session du portail expirée : reconnectez-vous.');
  }
  if (!r.ok) throw new PtlError(r.status, j.error || 'Erreur ' + r.status);
  return j;
}
// toutes les demandes d'une gérance (ouvertes, en cours, fermées) pour l'onglet Facturation de sa fiche
async function ptlOrgTickets(id) {
  if (ui.ptl.orgTLoading === id) return;
  ui.ptl.orgTLoading = id;
  try { const r = await ptlApi(`tickets?scope=all&org=${id}`); ui.ptl.orgT = { id, list: r.tickets || [] }; } catch (e) { ui.ptl.orgT = { id, list: [] }; toast(e.message, { bad: true }); }
  ui.ptl.orgTLoading = '';
  if (ui.sheet && ui.sheet.kind === 'ger') { ui.sheet.rendered = false; renderSheet(); }
}
async function ptlLoad() {
  if (ui.ptl.loading || !ptlConf()) return;
  ui.ptl.loading = true; ui.ptl.err = '';
  try {
    const [o, u, r, t] = await Promise.all([ptlApi('orgs'), ptlApi('users'), ptlApi('residences'), ptlApi('tickets?scope=' + (ui.ptl.done ? 'done' : 'active'))]);
    ui.ptl.data = { orgs: o.orgs || [], users: u.users || [], residences: r.residences || [], tickets: t.tickets || [], at: Date.now() };
    if (!ui.ptl.done) ptlBadge(ui.ptl.data.tickets);
  } catch (e) { ui.ptl.err = e.message; }
  ui.ptl.loading = false;
  if (ui.route === 'gerances') renderView();
  const typing = sheetEl.contains(document.activeElement) && document.activeElement.matches('input, textarea, select') && document.activeElement.value;
  if (ui.sheet && ui.sheet.kind.startsWith('ger') && !typing) { ui.sheet.rendered = false; renderSheet(); }
}
// messages des gérances déjà lus, par demande (sur cet appareil)
const ptlSeenGet = () => { try { return JSON.parse(localStorage.getItem('aresPtlSeen') || 'null'); } catch { return null; } };
const ptlSeenPut = (o) => { try { localStorage.setItem('aresPtlSeen', JSON.stringify(o)); } catch { /* stockage indisponible */ } };
const ptlUnread = (t) => Math.max(0, (t.msgs_ger || 0) - ((ptlSeenGet() || {})[t.id] || 0));
// Veille 24 h/24 : les nouvelles demandes s'affichent sur le bouton « Gérances » (pastille) et en message
function ptlBadge(tickets) {
  ui.ptl.lastTickets = tickets;
  // première fois sur cet appareil : les anciens messages comptent comme lus
  if (!ptlSeenGet()) ptlSeenPut(Object.fromEntries(tickets.map((t) => [t.id, t.msgs_ger || 0])));
  const unread = tickets.filter((t) => ptlUnread(t) > 0), nMsg = unread.reduce((n, t) => n + ptlUnread(t), 0);
  const prevMsg = ui.ptl.msgSeen;
  ui.ptl.msgSeen = Object.fromEntries(tickets.map((t) => [t.id, t.msgs_ger || 0]));
  if (prevMsg) {
    const nw = tickets.filter((t) => (t.msgs_ger || 0) > (prevMsg[t.id] || 0) && prevMsg[t.id] != null);
    if (nw.length) toast(`💬 Nouveau message de la gérance : ${nw.map((t) => '#' + t.ref).join(', ')}`);
  }
  ui.ptl.nMsg = nMsg;
  const fresh = tickets.filter((t) => t.status === 'recue');
  const seen = ui.ptl.seen;
  ui.ptl.nNew = fresh.length;
  ui.ptl.seen = new Set(fresh.map((t) => t.id));
  if (seen) {
    const nw = fresh.filter((t) => !seen.has(t.id));
    if (nw.length) {
      const urg = nw.some((t) => t.urgence === 'urgent');
      toast(`📥 ${nw.length > 1 ? nw.length + ' nouvelles demandes' : 'Nouvelle demande'} d'intervention : ${nw.map((t) => '#' + t.ref).join(', ')}${urg ? ' · 🔴 URGENT' : ''}`, { bad: urg });
      try { navigator.vibrate && navigator.vibrate(urg ? [300, 150, 300] : 200); } catch {}
    }
  }
  document.querySelectorAll('.navbtn[data-to="gerances"], .bottomnav .navbtn[data-to="reglages"]').forEach((b) => {
    let n = b.querySelector('.nav-n');
    const tot = fresh.length + nMsg;
    if (!tot) return n && n.remove();
    if (!n) { n = document.createElement('i'); n.className = 'nav-n'; b.appendChild(n); }
    n.textContent = tot;
    n.title = `${fresh.length} nouvelle(s) demande(s) · ${nMsg} message(s) non lu(s) des gérances`;
    n.classList.toggle('u-urgent', fresh.some((t) => t.urgence === 'urgent'));
  });
}
async function ptlWatch() {
  if (!ptlConf() || ui.ptl.loading) return;
  const typing = sheetEl.contains(document.activeElement) && document.activeElement.matches('input, textarea, select');
  if (ui.route === 'gerances' && !typing) return ptlLoad();
  try { const t = await ptlApi('tickets?scope=active'); ptlBadge(t.tickets || []); } catch { /* hors ligne : on réessaiera */ }
  devSync();
}
// Demandes d'intervention des gérances (Portail gérance) — affichage dans l'app de gestion
const PTL_URG = { urgent: ['🔴', 'Urgent', 'red'], '24h': ['🟠', 'Sous 24 h', 'amber'], planifie: ['🟢', 'Planifiable', 'green'] };
const PTL_ST = { recue: 'Reçue', prise: 'Prise en charge', planifiee: 'Planifiée', encours: 'En cours', terminee: 'Terminée', annulee: 'Annulée' };
const ptlTime = (ms) => (ms ? fmtDateTime(ms) : '');
async function ptlTicketOpen(id) {
  try { ui.ptl.cur = await ptlApi('tickets/' + id); } catch (e) { return toast(e.message, { bad: true }); }
  if (ui.sheet && ui.sheet.kind === 'ger-ticket' && ui.sheet.id === id) { ui.sheet.rendered = false; renderSheet(); } else openSheet('ger-ticket', id);
  ptlPhotos();
  const nIn = (ui.ptl.cur.events || []).filter((e) => e.kind === 'comment' && e.user_role !== 'admin').length;
  const seen = ptlSeenGet() || {};
  if ((seen[id] || 0) !== nIn) { seen[id] = nIn; ptlSeenPut(seen); if (ui.ptl.lastTickets) ptlBadge(ui.ptl.lastTickets); if (ui.route === 'gerances') renderView(); }
}
// photos du portail : lues avec la session, affichées en local
async function ptlPhotos() {
  ui.ptl.blobs ||= {};
  for (const img of sheetEl.querySelectorAll('img[data-ptl-photo]')) {
    const pid = img.dataset.ptlPhoto;
    if (!ui.ptl.blobs[pid]) {
      try { const r = await fetch(PTL_API + 'photos/' + pid, { headers: { Authorization: 'Bearer ' + ptlConf().token } }); if (r.ok) ui.ptl.blobs[pid] = URL.createObjectURL(await r.blob()); } catch { /* hors ligne */ }
    }
    if (ui.ptl.blobs[pid]) { img.src = ui.ptl.blobs[pid]; img.closest('a') && (img.closest('a').href = ui.ptl.blobs[pid]); }
  }
}
// liens d'invitation déjà créés (dans le coffre chiffré) : rouvrir l'invitation renvoie le même lien au lieu de l'annuler
const ptlInvSaved = (uid) => { const x = ((vault.get('reglages', 'ptlinv') || {}).links || {})[uid]; return x && x.exp > Date.now() ? x : null; };
async function ptlInvSave(uid, url) {
  const links = Object.fromEntries(Object.entries((vault.get('reglages', 'ptlinv') || {}).links || {}).filter(([, x]) => x.exp > Date.now()));
  links[uid] = { url, exp: Date.now() + 14 * 864e5 };
  await vault.mutate((tx) => tx.put('reglages', { id: 'ptlinv', links }), 'Lien d’invitation au portail');
}
async function ptlStatus(id, status, extra = {}) {
  await ptlApi(`tickets/${id}/status`, { method: 'POST', body: { status, ...extra } });
  ui.ptl.data = null; ptlLoad();
  if (ui.sheet && ui.sheet.kind === 'ger-ticket') ptlTicketOpen(id);
}
// métier conseillé pour une demande (catégorie + mots de la description)
const MET_HINT = [[/plomb|sanitaire|fuite|wc|toilette|cesso|robinet|évier|douche|égout|canalis/i, 'plombier'], [/électri|electri|courant|prise|disjonct|lumière|lampe|voltage|tension|solaire|panneaux solaires/i, 'electricien'],
  [/chauff|chaudière|radiateur|eau chaude/i, 'chauffagiste'], [/maçon|carrel|toit|façade|fissure|mur/i, 'macon'], [/peint/i, 'peintre'], [/serrur|clé|cle |porte bloqu|vitr/i, 'serrurier'],
  [/menuis|bois|fenêtre|parquet|meuble/i, 'menuisier'], [/nettoy|ménage|propreté|sale/i, 'menage'], [/jardin|espaces verts|haie|pelouse|arbre/i, 'jardinier']];
const metHints = (txt) => MET_HINT.filter(([rx]) => rx.test(txt || '')).map(([, m]) => m);
// lien demande ↔ intervention : infos utiles à l'ouvrier (adresse, lieu, codes, disponibilités, contact)
const ptlLink = (d) => { const t = d.ticket, r = d.residence || {}; return { tid: t.id, ref: t.ref, orgId: t.org_id || '', org: r.org_name || '', res: r.name || '', adr: r.address || '', lieu: t.lieu || '', acces: t.acces || '', dispo: t.dispo || '', contact: t.contact_name || r.contact_name || '', tel: t.contact_phone || r.contact_phone || '', interior: r.interior || '', floors: r.floors || '', codes: ptlResCodes(r).join(' · ') }; };
// fiche du lieu d'intervention (demande d'une gérance) : où, à quel étage, qui contacter, codes, disponibilités
const ptlPlace = (p) => {
  const parts = (x) => String(x || '').split(' · ').filter(Boolean);
  const codes = parts(p.acces).length ? parts(p.acces) : parts(p.codes);
  const tel = String(p.tel || '').replace(/[^\d+]/g, '');
  const q = encodeURIComponent([p.adr || p.res, 'Luxembourg'].join(', '));
  return html`<b>🏢 ${p.org} · Demande #${p.ref}</b>
    <dl class="kv small ptl-place">
      <dt>📍 Adresse</dt><dd>${p.res}${p.adr ? html`<br>${p.adr}` : ''}${p.adr ? html` <a href="https://www.google.com/maps/search/?api=1&query=${q}" target="_blank" rel="noopener">🗺️ Plan</a>` : ''}</dd>
      ${p.lieu ? html`<dt>🚪 Où exactement</dt><dd>${parts(p.lieu).join(' · ')}</dd>` : ''}
      ${p.interior || p.floors ? html`<dt>🏠 Intérieur</dt><dd>${[p.interior, p.floors ? 'étage(s) ' + p.floors : ''].filter(Boolean).join(' · ')}</dd>` : ''}
      ${p.contact || tel ? html`<dt>👤 Contact sur place</dt><dd>${p.contact || ''}${tel ? html` · <a href="tel:${tel}">${p.tel}</a>` : ''}</dd>` : ''}
      ${codes.length ? html`<dt>🔐 Accès / codes</dt><dd>${codes.map((x) => html`<div>${x}</div>`)}</dd>` : ''}
      ${p.dispo ? html`<dt>📅 Disponibilités</dt><dd>${parts(p.dispo).map((x) => html`<div>${x}</div>`)}</dd>` : ''}
    </dl>`;
};
// codes d'une résidence du portail : boîte à clés, portes / portails, alarme, locaux techniques, puis les autres codes nommés
const ptlResCodes = (r) => { let named = []; try { named = JSON.parse(r.codes || '[]'); } catch { /* illisible */ } if (!Array.isArray(named)) named = []; const kb = named.find((c) => c.l === 'Boîte à clés'); return [kb && kb.c ? 'Boîte à clés : ' + kb.c : '', r.access ? 'Porte : ' + r.access : '', r.alarm ? 'Alarme : ' + r.alarm : '', r.code_other ? 'Locaux techniques : ' + r.code_other : '', ...named.filter((c) => c.c && c !== kb).map((c) => `${c.l || 'Code'} : ${c.c}`)].filter(Boolean); };
// affectation : l'équipe triée (métier conseillé d'abord ⭐), absents signalés
const affTeam = (hints) => vault.list('intervenants').filter((i) => !i.archive).sort((a, b) => hints.includes(b.metier) - hints.includes(a.metier) || intervFull(a).localeCompare(intervFull(b)));
const affRow = (i, hints, attrs) => { const ab = absOn(i, today()); return html`<button class="row" ${new Raw(attrs)}><span class="avatar met-ic">${avW(i)}</span><span class="grow"><span class="title" style="display:block">${hints.includes(i.metier) ? '⭐ ' : ''}${intervFull(i)}</span><span class="meta">${METIERS[i.metier] || i.metier || '—'} · ${INT_GENRES[i.genre || 'interne']}${ab ? html` · <b class="red">${ABS_TYPES[ab.type]}</b>` : ''}</span></span><span class="badge">Affecter →</span></button>`; };
const ptlOrg = (id) => ((ui.ptl.data && ui.ptl.data.orgs) || []).find((o) => o.id === id);
// logo de l'agence (ajouté par la gérance dans son portail, ou ici dans « Modifier ») : on la reconnaît d'un coup d'œil
const orgLogo = (id, big) => { const o = ptlOrg(id || ''); return o && o.logo ? html`<img class="org-logo${big ? ' big' : ''}" src="${o.logo}" alt="">` : '🏢'; };
const ptlInviteUrl = (tok) => `${location.origin}/portail.html#invite=${tok}`;
// mot de passe → clé dérivée sur l'appareil (comme dans le portail) : le serveur ne voit jamais le mot de passe
async function ptlDerive(password, saltB64, iter) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password.normalize('NFC')), 'PBKDF2', false, ['deriveBits']);
  const salt = Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0));
  return [...new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, base, 256))].map((b) => b.toString(16).padStart(2, '0')).join('');
}
// Petite boîte de saisie (texte) : renvoie la valeur ou null
function promptText(title, detail, placeholder) {
  const dlg = $('#confirm');
  setHtml(dlg, html`
    <form class="sheet-body stack" method="dialog">
      <h2 style="font-size:18px">${title}</h2>
      ${detail ? html`<p class="muted small">${detail}</p>` : ''}
      <input name="t" autocomplete="off" required placeholder="${placeholder || ''}">
      <div class="sheet-foot" style="padding:0;border:0;margin-top:16px">
        <button class="btn" value="no" type="button">Annuler</button>
        <button class="btn danger solid" type="submit">Confirmer</button>
      </div>
    </form>`);
  return new Promise((resolve) => {
    const f = dlg.querySelector('form');
    dlg.querySelector('button[value=no]').onclick = () => { dlg.close(); resolve(null); };
    f.onsubmit = (e) => { e.preventDefault(); const v = f.t.value; dlg.close(); resolve(v); };
    dlg.onclose = () => resolve(null);
    dlg.showModal();
    f.t.focus();
  });
}
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
  ptl: { data: null, loading: false, err: '', inv: {} }, // branche gérances (Portail gérance)
};

const NAV = [
  ['dashboard', 'Accueil', 'home'],
  ['immeubles', 'Immeubles', 'building'],
  ['gerances', 'Gérances', 'briefcase'],
  ['locataires', 'Locataires', 'users'],
  ['paiements', 'Paiements', 'wallet'],
  ['maintenance', 'Maintenance', 'tool'],
  ['champions', 'Classements', 'trophy'],
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
    else if (document.visibilityState === 'visible') { vault.sync(); ptlWatch(); if (Date.now() - lastInbox > 180000) { lastInbox = Date.now(); inboxSync(); chatPoll(); toolsLoad(true); } }
  }, 30000);
  renderShell();
  applyBrand();
  fixIdentity().catch(() => {});
  // à l'ouverture de l'app : toujours l'Accueil ; après un verrouillage automatique : la page où l'on était
  go(firstOpen ? 'dashboard' : location.hash.slice(2) || 'dashboard', true);
  firstOpen = false;
  vault.sync();
  setTimeout(ptlWatch, 1500);
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
// Menu de gauche (ordinateur) : sections avec sous-rubriques et raccourcis « + »
const NAV_TREE = [
  ['dashboard', 'Accueil', 'home'],
  { group: 'Gérance', items: [['immeubles', 'Immeubles', 'building'], ['locataires', 'Locataires', 'users'], ['gerances', 'Gérances', 'briefcase'], ['maintenance', 'Maintenance', 'tool']] },
  ['champions', 'Classement', 'trophy'],
  { group: 'Comptabilité', items: [['paiements', 'Gestion locataire', 'wallet'], ['compta', 'Comptabilité', 'chart', null, 'compta'], ['compta', 'Abonnements', 'receipt', null, 'abo']] },
];
function sideNavHtml() {
  const btn = ([id, label, ic, plus, sec], sub) => html`<button class="navbtn${sub ? ' nav-sub' : ''}" data-action="go" data-to="${id}" ${sec ? new Raw(`data-sec="${sec}"`) : ''}>${icon(ic)}<span>${label}</span></button>${plus ? html`<button class="navbtn nav-plus" data-action="${plus[0]}">＋ <span>${plus[1]}</span></button>` : ''}`;
  return NAV_TREE.map((x) => (x.group ? html`<div class="nav-group">${x.group}</div>${x.items.map((it) => btn(it, true))}` : btn(x)));
}
function renderShell() {
  const navBtn = ([id, label, ic]) => html`<button class="navbtn" data-action="go" data-to="${id}">${icon(ic)}<span>${label}</span></button>`;
  setHtml(appEl, html`
    <nav class="sidenav" aria-label="Navigation">
      <div class="brand"><img class="brand-mark" src="${APP_BRAND.logo}" alt="" width="36" height="36"><span>LuxInterventions<small>Gestion locative</small></span></div>
      ${sideNavHtml()}
      ${navBtn(['reglages', 'Réglages', 'more'])}
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
    <nav class="bottomnav" aria-label="Navigation">${NAV.filter(([id]) => MOBILE_NAV.includes(id)).map(([id, label, ic]) => navBtn([id, id === 'reglages' ? 'Plus' : id === 'paiements' ? 'Gestion loc.' : label, ic]))}</nav>
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
  const navRoute = route === 'champeq' ? 'champions' : route;
  document.querySelectorAll('.navbtn[data-to]').forEach((b) => (b.dataset.to === navRoute && (!b.dataset.sec || b.dataset.sec === (ui.cpSec === 'abo' ? 'abo' : 'compta')) ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current')));
  const fab = $('#fab');
  if (fab) fab.hidden = !['immeubles', 'locataires'].includes(route);
  renderView();
  scrollTo(0, 0);
  if (route === 'gerances' && ui.ptl.data) setTimeout(ptlLoad, 0); // toujours les demandes du moment
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
  updateBadge();
  if (keepSearch != null) {
    const s = view.querySelector('[name=search]');
    if (s) { s.focus(); s.setSelectionRange(keepSearch, keepSearch); }
  }
}

// Numéro sur l'icône de l'app : tout ce qui attend une action (messages, virements signalés, photos de sortie, équipe, annonces…)
function pendingCount() {
  const chat = Object.entries(ui.chatNew || {}).filter(([imId, n]) => n && vault.get('immeubles', imId)).reduce((a, [, n]) => a + n, 0);
  return newSignals().length + vault.list('locataires').filter((l) => l.virSignal && !l.virSignal.vu).length + new Set(edlOutNew().map((d) => d.logId)).size
    + sum(vault.list('intervenants'), (i) => i.feedNew || 0) + chat + (ui.toolsPending || 0);
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
      ${t.fini && t.statut !== 'fait' ? html`<span class="badge ok" style="display:table;margin-bottom:4px">✅ Fini — à clôturer</span>` : ''}<span class="title" style="display:block">${t.urgent && t.statut !== 'fait' && !t.fini ? html`<span class="badge bad">🔴 Urgent</span> ` : ''}${tacheIcon(t.type)} ${t.titre}</span>
      <span class="meta" style="white-space:normal">${placeName(t)}${who ? ' · ' + who : ' · intervenant à choisir'} · ${when}${t.heure ? ` · 🕒 ${t.heure}${t.heureFin ? '–' + t.heureFin : ''}` : ''}${t.cout ? ' · ' + money(t.cout) : ''}</span>
    </button>
    ${!t.recur && t.statut !== 'fait' ? html`<button class="btn sm${t.fini ? ' cloture' : ''}" data-action="tache-done" data-id="${t.id}">${t.fini ? '🟢 Clôturer' : html`${icon('check')} Fait`}</button>` : t.statut === 'fait' ? html`<span class="badge ok">✓</span>` : ''}
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
    await vault.mutate((tx) => tx.put('reglages', { id: 'main', [field]: logo }), field === 'logo' ? 'Logo de la société' : 'Signature + timbre de la société', socName());
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
      if (g.members.length < 2) continue; // fil d'une seule personne : pas de tour de poubelles
      const days = new Set();
      for (const e of binGroupPlan(im, gk, g, (ui.chatCache || {})[g.id], year + '-12-31').filter((x) => x.p.startsWith(year + '-'))) {
        days.add(e.p);
        if (e.done) add(e.done, 'done', im.id);
        if (e.forgot) add(e.who, 'forgot', im.id);
      }
      // tours du même groupe enregistrés avant ce fil (fil recréé quand les habitants ont changé)
      for (const [pDate, x] of Object.entries(logs[gk] || {})) if (pDate.startsWith(year + '-') && !days.has(pDate)) { if (x.d) add(x.d, 'done', im.id); if (x.f) add(x.w, 'forgot', im.id); }
    }
    // fils disparus (habitants partis, groupes changés) : leur journal compte encore
    for (const [gk, log] of Object.entries(logs)) {
      if (seen.has(gk)) continue;
      for (const [pDate, x] of Object.entries(log)) if (pDate.startsWith(year + '-')) { if (x.d) add(x.d, 'done', im.id); if (x.f) add(x.w, 'forgot', im.id); }
    }
  }
  return Object.entries(sc).filter(([id]) => vault.get('locataires', id)).sort((a, b) => b[1].done - a[1].done || a[1].forgot - b[1].forgot);
}

// Ouvrier de l'année : travail fini, photos après, urgences du jour, avis des locataires
const EQ_PTS = { fait: 1, inc: -1, ph: 1, urg: 2, ev: { 4: 3, 3: 2, 2: 0, 1: -2 }, tagGood: 1, tagBad: -1 };
const EQ_GOOD = ['ok', 'nice', 'clean'], EQ_BAD = ['late', 'rude', 'dirty'];
function eqScores(year) {
  const sc = {};
  const get = (id) => sc[id] || (sc[id] = { pts: 0, fait: 0, inc: 0, ph: 0, urg: 0, ev: 0, good: 0, bad: 0 });
  for (const t of vault.list('taches')) {
    // une fois par jour et par intervention (dernier état du jour)
    const last = {};
    for (const j of t.journal || []) if ((j.by || t.intervenantId) && String(j.d || '').startsWith(year + '-') && j.st !== 'encours') last[(j.by || t.intervenantId) + '|' + j.d] = j;
    for (const [k, j] of Object.entries(last)) {
      const x = get(k.split('|')[0]);
      if (j.st === 'fait') { x.fait++; if (t.urgent && !t.recur && j.d <= t.date) x.urg++; }
      if (j.st === 'incomplet') x.inc++;
    }
    if (t.intervenantId) {
      const days = new Set(eqPhotos(t.id, 'ap').filter((d) => String(d.date || '').startsWith(year + '-')).map((d) => d.date));
      if (days.size) get(t.intervenantId).ph += days.size;
    }
  }
  for (const i of vault.list('intervenants')) for (const e of i.evals || []) {
    if (!String(e.d || '').startsWith(year + '-')) continue;
    const x = get(i.id);
    x.ev += EQ_PTS.ev[e.v] || 0; if (e.v >= 3) x.good++; if (e.v <= 1) x.bad++;
    for (const k of e.tags || []) { if (EQ_GOOD.includes(k)) { x.ev += EQ_PTS.tagGood; x.good++; } if (EQ_BAD.includes(k)) { x.ev += EQ_PTS.tagBad; x.bad++; } }
  }
  for (const x of Object.values(sc)) x.pts = x.fait * EQ_PTS.fait + x.inc * EQ_PTS.inc + x.ph * EQ_PTS.ph + x.urg * EQ_PTS.urg + x.ev;
  return Object.entries(sc).filter(([id]) => { const i = vault.get('intervenants', id); return i && !i.archive; }).sort((a, b) => b[1].pts - a[1].pts || a[1].bad - b[1].bad || b[1].fait - a[1].fait);
}

const champTabs = (cur) => html`<div class="tabs" role="tablist" style="max-width:520px;margin-bottom:16px">${[['champions', '🏆 Locataire de l’année'], ['champeq', '👷 Ouvrier de l’année']].map(([r, l]) => html`<button class="tab" role="tab" aria-selected="${cur === r}" data-action="go" data-to="${r}">${l}</button>`)}</div>`;
// Éditeur d'horaire sur 7 jours : 3 lignes le matin et l'après-midi (plusieurs maisons), 1 le soir, puis les suppléments ; « + » en ajoute.
// slotsOf(j) : créneaux du jour j (0 = lundi) ; title(j) : nom du jour (avec la date pour une semaine précise)
function horWeekEditor(slotsOf, title) {
  const imms = vault.list('immeubles').filter((im) => !immGone(im)).sort(byAddr);
  const dayRows = (j) => {
    const g = { matin: [], aprem: [], soir: [], extra: [] };
    for (const h of slotsOf(j).slice().sort((a, b) => (a.de || '').localeCompare(b.de || ''))) g[horP(h)].push(h);
    for (const [p, n] of Object.entries(HOR_MIN)) while (g[p].length < n) g[p].push({});
    return Object.entries(g).flatMap(([p, arr]) => arr.map((h, n) => ({ p, h, n: n + 1 })));
  };
  const imOpts = (cur) => imms.map((im) => html`<option value="${im.id}" ${cur === im.id ? new Raw('selected') : ''}>${im.adresse}</option>`);
  const horRow = (j, k, p, h, n) => html`<div class="hor-row" data-p="${p}"><span class="hor-p">${HOR_P[p]}${p !== 'extra' && p !== 'soir' ? html`<span class="hor-n"> ${n}</span>` : ''}</span><input type="hidden" name="h${j}_${k}p" value="${p}">
          <span class="hor-t"><span class="hor-tl">de</span><span class="tph${h.de ? ' v' : ''}"><input name="h${j}_${k}d" type="time" value="${h.de || ''}" aria-label="${SEMAINE[j] || ''} ${HOR_P[p]} de"><i>--:--</i></span></span>
          <span class="hor-t"><span class="hor-tl">à</span><span class="tph${h.a ? ' v' : ''}"><input name="h${j}_${k}a" type="time" value="${h.a || ''}" aria-label="${SEMAINE[j] || ''} ${HOR_P[p]} à"><i>--:--</i></span></span>
          <select name="h${j}_${k}i" aria-label="${SEMAINE[j] || ''} ${HOR_P[p]} lieu"><option value="">— lieu —</option>${imOpts(h.immId)}</select></div>`;
  return html`<div class="full hor-week">${SEMAINE.map((jn, j) => { const rows = dayRows(j), used = rows.filter((r) => r.h.de); return html`<details class="hor-blk" ${used.length ? new Raw('open') : ''}>
          <summary><b>${title(j)}</b> <span class="meta">${used.length ? used.map((r) => `${r.h.de}–${r.h.a}${r.h.immId ? ' · ' + immName(r.h.immId) : ''}`).join(' / ') : '—'}</span></summary>
          <div class="hor-grid" data-n="${rows.length}">${rows.map((r, k) => horRow(j, k, r.p, r.h, r.n))}</div>
          <div class="hor-adds"><button type="button" class="btn sm" data-action="hor-add" data-j="${j}" data-p="matin">${icon('plus')} <span>🌅 Matin</span></button><button type="button" class="btn sm" data-action="hor-add" data-j="${j}" data-p="aprem">${icon('plus')} <span>☀️ Après-midi</span></button><button type="button" class="btn sm" data-action="hor-add" data-j="${j}" data-p="extra">${icon('plus')} <span>Dépannage / supplément</span></button></div></details>`; })}</div>
        ${Object.keys(HOR_P).map((p) => html`<template data-hor-tpl="${p}">${horRow('__J__', '__K__', p, {}, '__N__')}</template>`)}`;
}
// Lecture de l'éditeur : [{ j, de, a, immId, p }]
function horFromForm(fd) {
  const g = (k) => String(fd.get(k) || '').trim(), out = [];
  for (let j = 0; j < 7; j++) for (let k = 0; k < 60; k++) {
    if (!fd.has(`h${j}_${k}d`)) continue;
    const de = g(`h${j}_${k}d`), a = g(`h${j}_${k}a`), p = g(`h${j}_${k}p`);
    if (de && a && de !== a) out.push({ j, de, a, immId: g(`h${j}_${k}i`), p: HOR_P[p] ? p : '' });
  }
  return out.sort((x, y) => x.j - y.j || x.de.localeCompare(y.de));
}
// ── Fiche d'engagement (ouvriers occasionnels, sociétés) : assurance, paiement, obligations, signature digitale ──
// horaire fixe : ménage régulier, ou personnel interne de gestion quotidienne ; les ouvriers reçoivent jour/heure/lieu à chaque travail
const horFixed = (i) => i.metier === 'menage' || ((i.genre || 'interne') === 'interne' && (i.cat || 'quotidien') === 'quotidien');
const ENG_OBL = (i) => [
  ['Obligation de résultat', 'L’intervenant s’engage à exécuter le travail confié dans les règles de l’art, aux jour, heure et lieu convenus, et à le reprendre à ses frais s’il n’est pas conforme.'],
  ['Dommages', `Tout dommage causé aux biens ou aux personnes pendant l’intervention est à la charge de l’intervenant et de son assurance responsabilité civile${i.assur ? ` (${i.assur}${i.police ? ', police n° ' + i.police : ''})` : ''}.`],
  ['Indépendance', 'Intervention ponctuelle, sans lien de subordination : l’intervenant déclare lui-même ses revenus et s’acquitte de ses obligations fiscales et sociales.'],
  ['Confidentialité', 'Codes, clés et informations des lieux et des occupants restent confidentiels et ne servent qu’à l’intervention.'],
];
const ENG_RGPD = (c) => `Protection des données (RGPD — règlement (UE) 2016/679) : ${c.nom} traite les données de l’intervenant (identité, coordonnées, assurance, IBAN, signature, heures de travail) uniquement pour la gestion des missions, les paiements et ses obligations légales. Conservation : durée légale (10 ans pour les pièces comptables). Droits d’accès, de rectification, d’effacement et d’opposition : ${c.email || c.tel || c.nom}. Réclamation possible auprès de la CNPD (Luxembourg).`;
// Tarifs d'une personne : ce qu'on lui paie (accord) et ce qu'on facture à la gérance (avec notre marge)
const sfx = (label, name, val, unit, attrs = money$) => html`<label class="field mini">${label}<span class="sfx"><input name="${name}" type="number" ${new Raw(attrs)} value="${val ?? ''}"><i>${unit}</i></span></label>`;
function tarifBox(i) {
  const m = num(factConf().marge);
  const cell = (name, val, unit, lbl) => html`<span class="sfx"><input name="${name}" type="number" ${new Raw(money$)} value="${val ?? ''}" aria-label="${lbl}"><i>${unit}</i></span>`;
  return html`<div class="full tarif-box"><div class="section-label" style="margin:6px 0 6px">💶 Tarifs</div>
    <div class="tarif-grid">
      <span></span><span class="tg-h">€ / heure</span><span class="tg-h">Déplacement</span>
      <span class="tg-r">Payé à l’ouvrier</span>${cell('payeH', i.payeH, '€/h', 'Payé à l’ouvrier € / heure')}${cell('payeDepl', i.payeDepl, '€', 'Déplacement payé')}
      <span class="tg-r">Facturé à la gérance</span>${cell('tauxH', i.tauxH, '€/h HT', 'Facturé à la gérance € / heure')}${cell('depl', i.depl, '€ HT', 'Déplacement facturé')}
    </div>
    <p class="tiny muted" style="margin:4px 0 8px">Facturé vide = payé + marge ${m ? String(m).replace('.', ',') + ' %' : '(Réglages → 🧾 Facturation)'}</p>
    <label class="field">Accord / forfait (facultatif)<input name="tarif" value="${i.tarif || ''}" placeholder="ex. forfait 80 € le chantier"></label></div>`;
}
function engForm(i) {
  const on = (i.genre || 'interne') !== 'interne', occ = (i.genre || '') === 'prive';
  return html`<div class="full eng-wrap" ${on ? '' : new Raw('hidden')}>
    <div class="section-label" style="margin:10px 0 0">📝 Engagement<span class="eng-occ" ${occ ? '' : new Raw('hidden')}> — intervention occasionnelle</span></div>
    <div class="fields" style="margin-top:6px">
      ${field('Assurance RC (compagnie)', 'assur', i.assur, { placeholder: 'ex. Foyer, La Luxembourgeoise, AXA…' })}
      ${field('N° de police', 'police', i.police, { attrs: 'autocomplete="off"' })}
    </div>
    <label class="check eng-occ" style="margin:8px 0 0" ${occ ? '' : new Raw('hidden')}><input type="checkbox" name="assurTodo" value="1" ${i.assurTodo ? new Raw('checked') : ''}> 🛡️ <b>Assurance à faire</b> — il n’a pas encore les données : un rappel reste dans son app (il pourra l’écrire lui-même)</label>
    <label class="check eng-occ" style="margin:8px 0 0" ${occ ? '' : new Raw('hidden')}><input type="checkbox" name="cash" value="1" ${i.cash ? new Raw('checked') : ''}> 💵 <b>Paiement cash</b> (en espèces) — il le demande : la banque n’est alors pas obligatoire</label>
    <div class="section-label" style="margin:8px 0 0">🏦 Compte bancaire (pour le payer) — même fiche pour tous les pays</div>
    <div class="fields bank-box" style="margin-top:6px">
      ${field('Nom de la banque', 'banque', i.banque, { placeholder: 'ex. BNP Paribas, Spuerkeess, Intesa Sanpaolo…', attrs: 'autocomplete="off"' })}
      <label class="field">Code BIC / SWIFT<input name="bic" value="${i.bic || ''}" placeholder="ex. BNPAFRPPXXX" autocomplete="off" autocapitalize="characters" maxlength="14" data-input="bank-chk"><span class="bank-msg tiny" data-for="bic"></span></label>
      <label class="field full">IBAN<input name="iban" value="${ibanFmt(i.iban || '')}" placeholder="ex. FR76 3000 4028 3700 0123 4567 845 · LU28 0019 4006 4475 0000" autocomplete="off" autocapitalize="characters" maxlength="42" data-input="bank-chk"><span class="bank-msg tiny" data-for="iban"></span></label>
      <p class="tiny muted full" style="margin:0">L’IBAN contient déjà code banque, guichet, compte et clé (RIB en France, ABI/CAB en Italie, BLZ en Allemagne…) : pas besoin de les écrire à part. Le pays du BIC doit être celui de l’IBAN.</p>
    </div>
    <div class="note small" style="margin:8px 0">${ENG_OBL(i).map(([t, x]) => html`<div style="margin-bottom:4px"><b>${t} :</b> ${x}</div>`)}<div class="tiny muted" style="margin-top:6px">${ENG_RGPD(factConf())}</div></div>
    <div class="alert ${i.sign ? 'info' : 'warn'} eng-occ" ${occ ? '' : new Raw('hidden')}>✍️<div>${i.sign ? html`Signée par l’intervenant dans son app le <b>${fmtDateTime(Date.parse(i.signAt) || 0)}</b>` : html`<b>Signature :</b> l’intervenant la fait lui-même dans son app (📱 App → lien à lui envoyer), rubrique « ✍️ Ma fiche d’engagement ».`}</div></div>
  </div>`;
}
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
// PNG (signature) → JPEG sur fond blanc pour le PDF
async function sigJpeg(url) {
  if (!url) return null;
  const im = new Image(); im.src = url; await im.decode();
  const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
  const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0);
  const b = atob(c.toDataURL('image/jpeg', 0.9).split(',')[1]);
  return { bytes: Uint8Array.from(b, (ch) => ch.charCodeAt(0)), w: c.width, h: c.height };
}
const frD = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
// pied de page : obligations + RGPD (sur la fiche d'engagement et sur chaque note « intervention occasionnelle »)
function engFoot(p, i, c, y, X, R) {
  p.line(X, y, R, y, { w: 0.6 }); y += 14;
  for (const [t, x] of ENG_OBL(i)) y += p.wrap(X, y, `${t} : ${x}`, R - X, { size: 7.5 }) + 2;
  y += 2; y += p.wrap(X, y, ENG_RGPD(c), R - X, { size: 7, color: [0.35, 0.35, 0.35] });
  return y;
}
async function engPdf(i) {
  const c = factConf(), p = makePdf(), X = 48, R = 547;
  p.text(X, 64, c.nom, { size: 15, bold: true }).text(X, 80, [c.adresse, c.ville].filter(Boolean).join(', '), { size: 9 }).text(X, 92, `RCS ${c.rcs} · TVA ${c.tva}${c.tel ? ' · ' + c.tel : ''}`, { size: 9 });
  p.text(R, 64, 'FICHE D’ENGAGEMENT', { size: 13, bold: true, align: 'right' }).text(R, 80, INT_GENRES[i.genre || 'prive'] || '', { size: 9.5, align: 'right' });
  let y = 124;
  const kv = (k, v) => { if (!v && v !== 0) return; p.text(X, y, k, { size: 9, color: [0.4, 0.4, 0.4] }); y += p.wrap(X + 150, y, String(v), R - X - 150, { size: 10, bold: true }) + 4; };
  p.rect(X, y - 12, R - X, 18, { fill: [0.15, 0.2, 0.35] }).text(X + 6, y, 'Intervenant', { size: 10, bold: true, color: [1, 1, 1] }); y += 22;
  kv('Nom', intervFull(i)); kv('Métier', METIERS[i.metier] || i.metier || ''); kv('Adresse', [i.adresse, i.ville].filter(Boolean).join(', '));
  kv('Téléphone / email', [i.tel, i.mail].filter(Boolean).join(' · ')); kv('RCS / N° TVA', [i.rcs, i.tva].filter(Boolean).join(' · '));
  kv('Assurance RC', [i.assur, i.police ? 'police n° ' + i.police : ''].filter(Boolean).join(' — ')); kv('Banque', [i.banque, i.bic ? 'BIC / SWIFT ' + i.bic : ''].filter(Boolean).join(' — ')); kv('IBAN', ibanFmt(i.iban));
  if (i.genre === 'prive') kv('Paiement', i.cash ? 'en espèces (cash), à sa demande' : 'par virement');
  kv('Rémunération', [i.payeH ? eur(i.payeH) + ' / heure' : i.tarif || '', i.payeDepl ? 'déplacement ' + eur(i.payeDepl) : ''].filter(Boolean).join(' · '));
  y += 8; p.rect(X, y - 12, R - X, 18, { fill: [0.15, 0.2, 0.35] }).text(X + 6, y, 'Obligations de l’intervenant', { size: 10, bold: true, color: [1, 1, 1] }); y += 22;
  for (const [t, x] of ENG_OBL(i)) { p.text(X, y, t, { size: 9.5, bold: true }); y += 13; y += p.wrap(X, y, x, R - X, { size: 9.5 }) + 6; }
  y += 6; y += p.wrap(X, y, ENG_RGPD(c), R - X, { size: 8.5, color: [0.3, 0.3, 0.3] }) + 14;
  p.text(R, y, `Pour ${c.nom}`, { size: 9, bold: true, align: 'right' });
  if (i.genre !== 'prive') return p.bytes();
  p.text(X, y, 'Lu et approuvé — signature de l’intervenant', { size: 9, bold: true }); y += 8;
  const sg = await sigJpeg(i.sign);
  if (sg) { const w = 180, h = (w * sg.h) / sg.w; p.image(X, y, w, h, sg.bytes, sg.w, sg.h); y += h + 4; p.text(X, y + 8, `Signé électroniquement le ${new Date(Date.parse(i.signAt) || Date.now()).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, { size: 8, color: [0.4, 0.4, 0.4] }); } else p.text(X, y + 30, '(pas encore signée)', { size: 9, color: [0.6, 0.1, 0.1] });
  return p.bytes();
}
// note de l'intervenant occasionnel à ARES : « INTERVENTION OCCASIONNELLE » (une par travail terminé)
async function occPdf(t, i, o) {
  const c = factConf(), p = makePdf(), X = 48, R = 547, G = [0.42, 0.42, 0.42];
  const L = intervLedger('0000', '9999').find((x) => x.t.id === t.id) || {};
  // émetteur : l'intervenant
  p.text(X, 52, intervFull(i), { size: 11, bold: true }).text(X, 66, METIERS[i.metier] || '', { size: 9, color: G });
  let ey = 80;
  for (const ln of [i.adresse, i.ville, [i.tel, i.mail].filter(Boolean).join(' · '), [i.rcs ? 'RCS ' + i.rcs : '', i.tva ? 'TVA ' + i.tva : ''].filter(Boolean).join(' · ')]) if (ln) { p.text(X, ey, ln, { size: 9 }); ey += 12; }
  // client : ARES INVEST S.A.
  const CX = 330;
  p.text(CX, 150, c.nom, { size: 11, bold: true }).text(CX, 164, c.adresse, { size: 9.5 }).text(CX, 176, c.ville, { size: 9.5 }).text(CX, 192, 'TVA : ' + c.tva, { size: 9.5 });
  let y = 236;
  p.text(X, y, 'INTERVENTION OCCASIONNELLE', { size: 15, bold: true, color: [0.2, 0.2, 0.2] }).text(X, y + 18, `N° ${o.no}`, { size: 11, bold: true }); y += 44;
  const info = [['Date', frD(o.d)], ['Date d’intervention', frD(L.d || t.doneDate || t.date || o.d)], ['Horaire', L.arr ? `${L.arr}–${L.dep || ''}` : '—'], ['Référence', t.ptl ? 'Demande #' + t.ptl.ref : o.no]];
  info.forEach(([l, v], k) => { const xx = X + k * 125; p.text(xx, y, l, { size: 8.5, color: G }).text(xx, y + 13, v, { size: 10 }); });
  y += 40;
  const CQ = 400, CP = 470;
  p.text(X + 6, y, 'Description', { size: 9.5, bold: true }).text(CQ, y, 'Quantité', { size: 9.5, bold: true, align: 'right' }).text(CP, y, 'Prix unitaire', { size: 9.5, bold: true, align: 'right' }).text(R - 6, y, 'Montant', { size: 9.5, bold: true, align: 'right' });
  y += 8; p.line(X, y, R, y, { w: 1, color: [0.55, 0.55, 0.55] }); y += 15;
  const n2 = (v) => (Math.round(v * 100) / 100).toFixed(2).replace('.', ',');
  const row = (lib, sub, q, pu, tot) => {
    p.text(CQ, y, q, { size: 9.5, align: 'right' }).text(CP, y, pu, { size: 9.5, align: 'right' }).text(R - 6, y, tot, { size: 9.5, align: 'right' });
    let hh = p.wrap(X + 6, y, lib, 300, { size: 9.5 });
    if (sub) hh += p.wrap(X + 6, y + hh, sub, 300, { size: 8.5, color: G });
    y += Math.max(hh, 13) + 9; p.line(X, y - 12, R, y - 12, { w: 0.4, color: [0.85, 0.85, 0.85] });
  };
  row(`Main-d'œuvre — ${t.titre || METIERS[i.metier] || 'travail'}`, t.ptl ? [t.ptl.res, t.ptl.adr, t.ptl.lieu].filter(Boolean).join(' — ') : placeName(t), n2(o.h) + ' h', n2(o.taux), eur(r2(o.h * o.taux)));
  if (o.depl) row('Déplacement', '', '1,00', n2(o.depl), eur(o.depl));
  if (o.mat) row(`Matériel avancé${o.matLib ? ' : ' + o.matLib : ''}`, '', '1,00', n2(o.mat), eur(o.mat));
  y += 10;
  const TX = 330, ty = y;
  p.rect(TX, y - 12, R - TX, 20, { fill: [0.94, 0.94, 0.94] }).text(TX + 8, y, 'Total à payer', { size: 11, bold: true }).text(R - 8, y, eur(o.tot), { size: 11, bold: true, align: 'right' }); y += 22;
  p.text(TX + 8, y, i.tva ? 'TVA : selon le régime de l’intervenant' : 'TVA non applicable (non assujetti)', { size: 8.5, color: G }); y += 16;
  let py = ty;
  if (o.cash) { p.text(X, py, 'Paiement en espèces (cash)', { size: 9.5, bold: true }); py += 13; p.text(X, py, `Référence : ${o.no}`, { size: 9.5 }); py += 14; }
  else if (i.iban) {
    p.text(X, py, `Communication de paiement : ${o.no}`, { size: 9.5, bold: true }); py += 13;
    p.text(X, py, `sur ce compte : ${ibanFmt(i.iban)}${i.banque ? ' - ' + i.banque : ''}`, { size: 9.5 }); py += 12;
    if (i.bic) { p.text(X, py, 'BIC : ' + i.bic, { size: 9, color: G }); py += 12; }
    qrPdf(p, X, py + 6, 86, epcText(intervFull(i), i.iban, i.bic, o.tot, o.no)); p.text(X + 96, py + 30, 'Scanner le code QR avec', { size: 8.5, color: G }).text(X + 96, py + 42, 'votre application bancaire', { size: 8.5, color: G }); py += 100;
  }
  y = Math.max(y, py) + 8;
  if (o.note) y += p.wrap(X, y, 'Note : ' + o.note, R - X, { size: 9 }) + 6;
  p.text(X, y + 6, 'Signature de l’intervenant', { size: 9, bold: true }); y += 12;
  const sg = await sigJpeg(i.sign);
  if (sg) { const w = 150, h = (w * sg.h) / sg.w; p.image(X, y, w, h, sg.bytes, sg.w, sg.h); y += h; }
  y = Math.max(y + 16, 640);
  engFoot(p, i, c, y, X, R);
  return p.bytes();
}
// ── Factures des interventions (ARES INVEST S.A. — marque LuxInterventions) → la gérance la télécharge dans le portail ──
const FACT_DEF = { nom: 'ARES INVEST S.A.', marque: 'LuxInterventions', adresse: '37, Val Saint André', ville: 'L-1128 Luxembourg', rcs: 'B225245', tva: 'LU30440727', tel: '+352 691 423 943', email: '', iban: '', bic: '', banque: '', taux: 17, delai: 30, seq: 0, marge: 0 };
// Régime de TVA d'un client (gérance) : taux normal, taux particulier, autoliquidation (client assujetti d'un autre pays de l'UE), non applicable
const TVA_REG = {
  normal: ['TVA normale (taux des réglages)', ''],
  taux: ['Taux particulier', ''],
  autoliq: ['Autoliquidation — client assujetti UE (0 %)', 'Autoliquidation : TVA due par le preneur (art. 196 de la directive 2006/112/CE).'],
  exo: ['TVA non applicable / exonérée (0 %)', 'TVA non applicable.'],
};
// données de facturation d'une gérance : régime TVA (coffre) + société (portail : adresse, RCS, TVA, banque — la gérance peut les compléter elle-même)
const factClient = (orgId, name) => {
  const all = (vault.get('reglages', 'factClients') || {}).list || {};
  const o = (ui.ptl && ui.ptl.data && ui.ptl.data.orgs.find((x) => x.id === orgId)) || {};
  const fromPtl = Object.fromEntries([['adresse', o.address], ['rcs', o.rcs], ['tvaNum', o.tva], ['banque', o.banque], ['bic', o.bic], ['iban', o.iban]].filter(([, v]) => v));
  return { regime: 'normal', taux: '', tvaNum: '', adresse: '', pays: 'LU', mention: '', ...(all[orgId] || all['n:' + (name || '')] || {}), ...fromPtl };
};
const orgMissing = (cl) => [!cl.adresse && 'adresse', !cl.rcs && 'RCS (B…)', !cl.tvaNum && 'n° TVA (LU…)', !cl.banque && 'banque', !cl.bic && 'BIC', !cl.iban && 'IBAN'].filter(Boolean);
const regTaux = (reg, c) => (reg.regime === 'autoliq' || reg.regime === 'exo' ? 0 : reg.regime === 'taux' ? num(reg.taux) : num(c.taux));
const regMention = (reg) => (reg.regime === 'autoliq' || reg.regime === 'exo' ? reg.mention || TVA_REG[reg.regime][1] : reg.mention || '');
const factConf = () => ({ ...FACT_DEF, ...(vault.get('reglages', 'facturation') || {}) });
const factMissing = (c) => [['nom', 'raison sociale'], ['adresse', 'adresse'], ['rcs', 'RCS'], ['tva', 'n° TVA'], ['iban', 'IBAN']].filter(([k]) => !String(c[k] || '').trim()).map(([, l]) => l);
const ymd = (iso) => iso.replace(/-/g, '');
// brouillon d'une facture à partir de l'intervention clôturée : heures réelles × tarif, déplacement, matériel, remise / majoration
function factDraft(t) {
  if (t.factDraft) return t.factDraft;
  const w = vault.get('intervenants', t.intervenantId) || {};
  const L = intervLedger('0000', '9999').find((x) => x.t.id === t.id);
  const h = L && L.min ? Math.ceil(L.min / 15) / 4 : 1;
  const cl = factClient(t.ptl && t.ptl.orgId, t.ptl && t.ptl.org);
  const m = 1 + num(factConf().marge) / 100;
  return { h, taux: w.tauxH || (w.payeH ? r2(w.payeH * m) : 0), depl: w.depl || (w.payeDepl ? r2(w.payeDepl * m) : 0), mat: [], adj: { type: 'remise', mode: '%', val: 0, lib: '' }, reg: { regime: cl.regime, taux: cl.taux, mention: cl.mention } };
}
// taux effectif d'une facture : régime choisi pour cette facture (sinon celui du client), sinon les réglages
const factTaux = (f, c) => regTaux(f.reg || { regime: 'normal' }, c);
function factCalc(f, taux) {
  const mo = r2(num(f.h) * num(f.taux)), dep = r2(num(f.depl)), mat = r2(sum(f.mat || [], (m) => num(m.ht)));
  const sub = r2(mo + dep + mat);
  const a = f.adj || {}, raw = a.mode === '%' ? r2((sub * num(a.val)) / 100) : r2(num(a.val));
  const adj = a.type === 'remise' ? -raw : raw;
  const ht = r2(sub + adj), tva = r2((ht * num(taux)) / 100);
  return { mo, dep, mat, sub, adj, ht, tva, ttc: r2(ht + tva) };
}
const eur = (n) => (Math.round(n * 100) / 100).toFixed(2).replace('.', ',') + ' €';
// QR « EPC » (virement SEPA) : scanné avec l'app de la banque, il remplit bénéficiaire, IBAN, montant et référence
const ascii = (v) => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7e]/g, ' ');
const epcText = (name, iban, bic, amount, ref) => ['BCD', '002', '1', 'SCT', ascii(bic).replace(/\s/g, ''), ascii(name).slice(0, 70), ascii(iban).replace(/\s/g, ''), 'EUR' + (Math.round(amount * 100) / 100).toFixed(2), '', '', ascii(ref).slice(0, 140)].join('\n');
function qrPdf(p, x, y, size, text) {
  const q = qrcode(0, 'M'); q.addData(text); q.make();
  const n = q.getModuleCount(), m = size / (n + 2);
  p.rect(x, y, size, size, { fill: [1, 1, 1] });
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) p.rect(x + (c + 1) * m, y + (r + 1) * m, m + 0.05, m + 0.05, { fill: [0, 0, 0] });
}
// Facture LuxInterventions (ARES INVEST S.A.) → gérance, mise en page « facture classique » :
// émetteur + logo, client à droite, n°, dates, tableau Description / Quantité / Prix unitaire / TVA / Montant, totaux, paiement + QR
async function factPdf(t, f, no, dateIso, c) {
  const k = factCalc(f, factTaux(f, c)), w = vault.get('intervenants', t.intervenantId) || {}, tx = factTaux(f, c);
  const L = intervLedger('0000', '9999').find((x) => x.t.id === t.id) || {};
  const org = ptlOrg((t.ptl && t.ptl.orgId) || '') || ((ui.ptl.data && ui.ptl.data.orgs) || []).find((o) => t.ptl && o.name === t.ptl.org) || {};
  const cl = factClient(t.ptl && t.ptl.orgId, t.ptl && t.ptl.org);
  const p = makePdf(), X = 48, R = 547, G = [0.42, 0.42, 0.42];
  const due = addDays(dateIso, +c.delai || 30);
  // émetteur + logo
  const logo = await sigJpeg('/ares/icons/lux-192.png').catch(() => null);
  if (logo) p.image(X, 40, 62, 62, logo.bytes, logo.w, logo.h);
  const ex = logo ? X + 78 : X;
  p.text(ex, 52, c.nom, { size: 11, bold: true }).text(ex, 66, c.marque || '', { size: 9, color: G });
  p.text(ex, 80, c.adresse, { size: 9 }).text(ex, 92, c.ville, { size: 9 }).text(ex, 104, `RCS ${c.rcs} · TVA ${c.tva}`, { size: 8.5, color: G });
  if (c.tel || c.email) p.text(ex, 116, [c.tel, c.email].filter(Boolean).join(' · '), { size: 8.5, color: G });
  // client
  const CX = 330;
  let cy = 150;
  p.text(CX, cy, (t.ptl && t.ptl.org) || org.name || '', { size: 11, bold: true }); cy += 14;
  for (const ln of String(cl.adresse || '').split(/\n|,\s*(?=L-|\d{4})/).filter(Boolean).slice(0, 3)) { p.text(CX, cy, ln.trim(), { size: 9.5 }); cy += 12; }
  if (!cl.adresse) { const ct = [org.email, org.phone].filter(Boolean).join(' · '); if (ct) { p.text(CX, cy, ct, { size: 9.5 }); cy += 12; } }
  if (cl.pays && cl.pays !== 'LU') { p.text(CX, cy, cl.pays, { size: 9.5 }); cy += 12; }
  if (cl.tvaNum) { cy += 4; p.text(CX, cy, 'TVA : ' + cl.tvaNum, { size: 9.5 }); }
  // titre + dates
  let y = 236;
  p.text(X, y, `Facture ${no}`, { size: 20, bold: true, color: [0.2, 0.2, 0.2] }); y += 26;
  const fr = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const info = [['Date de facturation', fr(dateIso)], ['Date d’échéance', fr(due)], ['Date d’intervention', fr(L.d || t.doneDate || dateIso)], ['Référence', t.ptl ? 'Demande #' + t.ptl.ref : no]];
  info.forEach(([l, v], i) => { const xx = X + i * 125; p.text(xx, y, l, { size: 8.5, color: G }).text(xx, y + 13, v, { size: 10 }); });
  y += 40;
  // tableau
  const CQ = 352, CP = 430, CT = 482;
  p.text(X + 6, y, 'Description', { size: 9.5, bold: true }).text(CQ, y, 'Quantité', { size: 9.5, bold: true, align: 'right' }).text(CP, y, 'Prix unitaire', { size: 9.5, bold: true, align: 'right' }).text(CT, y, 'TVA', { size: 9.5, bold: true, align: 'right' }).text(R - 6, y, 'Montant', { size: 9.5, bold: true, align: 'right' });
  y += 8; p.line(X, y, R, y, { w: 1, color: [0.55, 0.55, 0.55] }); y += 15;
  const txt = String(tx).replace('.', ',') + '%';
  const row = (lib, sub, q, pu, tot) => {
    if (q !== '') p.text(CQ, y, q, { size: 9.5, align: 'right' });
    if (pu !== '') p.text(CP, y, pu, { size: 9.5, align: 'right' });
    p.text(CT, y, txt, { size: 9.5, align: 'right' }).text(R - 6, y, tot, { size: 9.5, align: 'right' });
    let hh = p.wrap(X + 6, y, lib, 240, { size: 9.5 });
    if (sub) hh += p.wrap(X + 6, y + hh, sub, 240, { size: 8.5, color: G });
    y += Math.max(hh, 13) + 9; p.line(X, y - 12, R, y - 12, { w: 0.4, color: [0.85, 0.85, 0.85] });
  };
  const n2 = (v) => (Math.round(v * 100) / 100).toFixed(2).replace('.', ',');
  const lieu = t.ptl ? [t.ptl.res, t.ptl.adr, t.ptl.lieu].filter(Boolean).join(' — ') : placeName(t);
  row(`Main-d'œuvre — ${String(t.titre || 'Intervention').replace(/^#\d+\s*/, '')}`, `${intervFull(w)}${L.arr ? ` · ${L.arr}–${L.dep || ''}` : ''} · ${lieu}`, n2(num(f.h)) + ' h', n2(num(f.taux)), eur(k.mo));
  if (k.dep) row('Déplacement', '', '1,00', n2(k.dep), eur(k.dep));
  for (const m of f.mat || []) if (num(m.ht)) row(`Matériel : ${m.lib || 'fourniture'}`, '', '1,00', n2(num(m.ht)), eur(num(m.ht)));
  if (k.adj) row(`${f.adj.type === 'remise' ? 'Remise' : 'Majoration'}${f.adj.mode === '%' ? ' ' + String(num(f.adj.val)).replace('.', ',') + ' %' : ''}${f.adj.lib ? ' — ' + f.adj.lib : ''}`, '', '', '', (k.adj < 0 ? '− ' : '') + eur(Math.abs(k.adj)));
  // totaux (encadré à droite)
  y += 10;
  const TX = 330, ty = y;
  const trow = (l, v, b, bg) => { if (bg) p.rect(TX, y - 12, R - TX, 20, { fill: [0.94, 0.94, 0.94] }); p.text(TX + 8, y, l, { size: b ? 11 : 9.5, bold: b }).text(R - 8, y, v, { size: b ? 11 : 9.5, bold: b, align: 'right' }); y += 22; };
  trow('Montant hors taxes', eur(k.ht), false, true); trow(`TVA ${txt}`, eur(k.tva), false, false); trow('Total', eur(k.ttc), true, true);
  // paiement + QR (à gauche des totaux)
  let py = ty;
  p.text(X, py, `Communication de paiement : ${no}`, { size: 9.5, bold: true }); py += 13;
  p.text(X, py, `sur ce compte : ${c.iban}${c.banque ? ' - ' + c.banque : ''}`, { size: 9.5 }); py += 12;
  if (c.bic) { p.text(X, py, 'BIC : ' + c.bic, { size: 9, color: G }); py += 12; }
  if (c.iban) { qrPdf(p, X, py + 6, 92, epcText(c.nom, c.iban, c.bic, k.ttc, no)); p.text(X + 102, py + 30, 'Scanner le code QR avec', { size: 8.5, color: G }).text(X + 102, py + 42, 'votre application bancaire', { size: 8.5, color: G }); py += 106; }
  y = Math.max(y, py) + 10;
  const mention = regMention(f.reg || {});
  if (mention) y += p.wrap(X, y, mention, R - X, { size: 9, bold: true }) + 4;
  p.text(X, y, `Paiement à ${+c.delai || 30} jours, avant le ${fr(due)}.`, { size: 9, color: G });
  p.text((X + R) / 2, 800, `${c.nom}${c.marque ? ' — ' + c.marque : ''} · ${c.adresse}, ${c.ville} · RCS Luxembourg ${c.rcs} · TVA ${c.tva}`, { size: 7.5, color: G, align: 'center' });
  return { bytes: p.bytes(), k };
}
const factRead = (fm) => {
  const fd = new FormData(fm), mat = [];
  for (let n = 0; n < 30; n++) if (fd.has(`ml${n}`)) { const lib = String(fd.get(`ml${n}`) || '').trim(), ht = num(fd.get(`mh${n}`)); if (lib || ht) mat.push({ lib, ht }); }
  const cost = fd.has('cost_h') ? { h: num(fd.get('cost_h')), d: num(fd.get('cost_d')) } : null;
  return { cost, reg: { regime: TVA_REG[fd.get('reg')] ? fd.get('reg') : 'normal', taux: String(fd.get('reg_taux') || ''), mention: String(fd.get('reg_mention') || '').trim() }, h: num(fd.get('h')), taux: num(fd.get('taux')), depl: num(fd.get('depl')), mat, adj: { type: fd.get('adj_type') === 'maj' ? 'maj' : 'remise', mode: fd.get('adj_mode') === '€' ? '€' : '%', val: num(fd.get('adj_val')), lib: String(fd.get('adj_lib') || '').trim() } };
};
const matRow = (n, m = {}) => html`<div class="fact-mat"><input name="ml${n}" value="${m.lib || ''}" placeholder="Matériel acheté (ex. disjoncteur 16 A)"><input name="mh${n}" type="number" ${new Raw(money$)} value="${m.ht ?? ''}" placeholder="€ HT" aria-label="Montant HT"></div>`;
function factTotHtml(f) {
  const c = factConf(), tx = factTaux(f, c), k = factCalc(f, tx);
  return html`<div class="kv-tot"><span>Main-d’œuvre</span><b>${eur(k.mo)}</b><span>Déplacement</span><b>${eur(k.dep)}</b><span>Matériel</span><b>${eur(k.mat)}</b>${k.adj ? html`<span>${k.adj < 0 ? 'Remise' : 'Majoration'}</span><b>${k.adj < 0 ? '− ' : '+ '}${eur(Math.abs(k.adj))}</b>` : ''}
    <span>Total HT</span><b>${eur(k.ht)}</b>${f.cost ? (() => { const co = r2(num(f.h) * f.cost.h + (num(f.depl) ? f.cost.d : 0) + k.mat), mg = r2(k.ht - co); return html`<span class="muted">Coût (ouvrier + matériel)</span><b class="muted">${eur(co)}</b><span class="${mg < 0 ? 'red' : 'green'}">Ma marge</span><b class="${mg < 0 ? 'red' : 'green'}">${eur(mg)}${co ? ` (${Math.round((mg / co) * 100)} %)` : ''}</b>`; })() : ''}<span>TVA ${String(tx).replace('.', ',')} %${f.reg && (f.reg.regime === 'autoliq' || f.reg.regime === 'exo') ? ' — ' + TVA_REG[f.reg.regime][0].split(' (')[0] : ''}</span><b>${eur(k.tva)}</b><span class="big">Total TTC</span><b class="big">${eur(k.ttc)}</b></div>`;
}
// « Voir plus » : 10 lignes de plus à chaque toucher
const moreBtn = (total, lim) => (total > lim ? html`<button class="btn block" style="margin-top:12px" data-action="cp-more">⬇ Voir plus (${Math.min(10, total - lim)} sur ${total - lim} restantes)</button><p class="tiny muted" style="text-align:center;margin:6px 0 0">${lim} sur ${total} affichées</p>` : total > 10 ? html`<p class="tiny muted" style="text-align:center;margin:10px 0 0">Tout est affiché (${total})</p>` : '');
// Radio de l'app des locataires (Maintenance → Publicité, sous les annonces)
const radioCard = () => html`<div class="section-label">📻 Radio de l’app des locataires</div>
      ${(() => { const r = vault.get('reglages', 'radio') || {}; return html`<form data-form="radio" class="fields card" style="margin:0 0 6px">
        <label class="field">Nom<input name="nom" value="${r.nom || 'Seven Radio'}" placeholder="ex. Seven Radio"></label>
        <label class="field">Lien (site ou flux audio)<input name="url" type="url" value="${r.url || 'https://sevenradio.lu/?proradio-popup=1'}" placeholder="https://…"></label>
        <button class="btn primary full" type="submit">Enregistrer</button>
        <p class="tiny muted full" style="margin:0">Proposée sous la météo dans l’app des locataires et l’app de l’équipe (bouton ▶). Avec le lien du <b>flux audio</b> (demandé à la radio), elle joue directement dans l’app ; avec le lien du site, l’app ouvre le site. Chaque locataire peut coller sa propre radio.</p>
      </form>`; })()}`;
// Registre des interventions terminées (ou finies par l'ouvrier) : où, quoi, qui, heures réelles, avis, coût
function intervLedger(from, to) {
  const out = [];
  for (const t of vault.list('taches')) {
    if (t.recur) continue;
    const d = t.statut === 'fait' ? t.doneDate || t.date : t.fini ? t.fini.d : '';
    if (!d || d < from || d > to) continue;
    const j = (t.journal || []).filter((x) => x.d === d).sort((a, b) => (a.at || '').localeCompare(b.at || ''));
    const hOf = (x) => (x ? x.h || (x.at || '').slice(11, 16) : '');
    const arr = hOf(j.find((x) => x.st === 'encours')), dep = hOf([...j].reverse().find((x) => x.st === 'fait'));
    const min = arr && dep ? Math.max(0, (hm(dep) - hm(arr)) * 60) : 0;
    const w = vault.get('intervenants', t.intervenantId);
    const ev = w ? (w.evals || []).filter((e) => e.d === d) : [];
    const avis = ev.length ? MEN_EVAL[Math.round(sum(ev, (e) => e.v) / ev.length)] : '';
    out.push({ t, d, arr, dep, min, who: w ? intervFull(w) : '', lieu: placeName(t), ger: t.ptl ? `${t.ptl.org} #${t.ptl.ref}` : '', avis, cout: t.cout || 0, state: t.statut === 'fait' ? 'fait' : 'fini' });
  }
  return out.sort((a, b) => b.d.localeCompare(a.d));
}
const dayShort = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

const VIEWS = {
  champeq() {
    const cy = new Date().getFullYear();
    const y = ui.champEqYear || cy;
    const rows = eqScores(y);
    const prizes = ((vault.get('reglages', 'champions') || {}).eq || {})[y] || {};
    const medal = ['🥇', '🥈', '🥉'];
    const w = (id) => vault.get('intervenants', id) || {};
    const detail = (v) => [v.fait ? `✅ ${v.fait}` : '', v.ph ? `📷 ${v.ph}` : '', v.urg ? `🔴 ${v.urg}` : '', v.good ? `⭐ ${v.good}` : '', v.inc ? `⚠️ ${v.inc}` : '', v.bad ? `👎 ${v.bad}` : ''].filter(Boolean).join(' · ');
    const podium = rows.filter(([, v]) => v.pts > 0).slice(0, 3);
    return html`
      ${champTabs('champeq')}${pageHead('👷 Ouvrier de l’année', 'Classement de l’équipe : travail fini, photos après, urgences, avis des locataires. Les 3 premiers sont récompensés 🎁')}
      <div class="chips" style="margin-bottom:14px">${[cy, cy - 1].map((yy) => html`<button class="chip" data-action="champeq-year" data-id="${yy}" aria-pressed="${yy === y}">${yy}</button>`)}
</div>
      ${podium.length ? html`<div class="metrics" style="margin-bottom:14px">${podium.map(([id, v], i) => html`<div class="metric" style="text-align:center;border:2px solid ${['#d4a017', '#9ca3af', '#b45309'][i]}">
          <div style="font-size:40px;line-height:1.1">${medal[i]}</div>
          <div class="val" style="font-size:20px">${intervFull(w(id))}</div>
          <div class="sub">${METIERS[w(id).metier] || ''}</div>
          <div style="margin:8px 0;font-size:18px;font-weight:700">${v.pts} pts</div>
          <div class="tiny muted" style="margin-bottom:8px">${detail(v)}</div>
          ${prizes[id] ? html`<button class="btn sm" style="max-width:100%;white-space:normal" data-action="champeq-prize" data-id="${id}">🎁 Remise le ${fmtDate(prizes[id])}</button>` : html`<button class="btn sm primary" style="max-width:100%;white-space:normal" data-action="champeq-prize" data-id="${id}">🎁 Récompense remise</button>`}
        </div>`)}</div>` : html`<div class="alert info" style="margin-bottom:14px">${icon('trophy')}<div>Pas encore de points en ${y}. Le classement se remplit tout seul : travail fini dans l’app de l’équipe, photos après, avis des locataires.</div></div>`}
      ${rows.length ? html`<div class="section-label">Classement ${y}</div>
        <div class="list">${rows.map(([id, v], i) => html`<button class="row" data-action="open-interv" data-id="${id}">
          <span class="avatar">${v.pts > 0 && i < 3 ? medal[i] : i + 1}</span>
          <span class="grow"><span class="title" style="display:block">${intervFull(w(id))}</span><span class="meta">${detail(v) || '—'}</span></span>
          <b>${v.pts} pts</b></button>`)}</div>` : ''}
      <p class="tiny muted" style="margin-top:12px">✅ travail fini = 1 point · 📷 photos après = 1 · 🔴 urgence faite le jour prévu = 2 · avis des locataires : ⭐ Excellent 3, 🙂 Bien 2, 😞 Insuffisant −2 ; « à l’heure », « aimable », « bien nettoyé » +1 ; « en retard », « désagréable », « mal nettoyé » −1 · ⚠️ pas fini −1. Chacun voit sa place dans son app. Le classement repart de zéro chaque 1er janvier.</p>`;
  },
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
      ${champTabs('champions')}${pageHead('🏆 Locataire de l’année', 'Classement des tours des poubelles faits, dans tous les immeubles. Les 3 premiers gagnent… une pizza 🍕')}
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
    if (ui.mtTab === 'pub') { ui.mtTab = 'planning'; ui.cpSec = 'abo'; go('compta', true); return ''; } // les annonces sont dans Comptabilité → Abonnements
    const tab = ui.mtTab || 'planning';
    const imms = vault.list('immeubles').filter((im) => !immGone(im)).sort(byAddr);
    const f = ui.immFilter && imms.some((im) => im.id === ui.immFilter) ? ui.immFilter : '';
    const chips = imms.length > 1 ? html`<div class="chips" style="margin-bottom:14px">
      <button class="chip" data-action="imm-filter" data-id="" aria-pressed="${!f}">Tous</button>
      ${imms.map((im) => html`<button class="chip" data-action="imm-filter" data-id="${im.id}" aria-pressed="${f === im.id}">${im.adresse}</button>`)}</div>` : '';
    const add = tab === 'pub' ? html`<button class="btn primary" data-action="new-pub" data-imm="${f}">${icon('plus')} Annonce</button>` : tab === 'avis' ? html`<button class="btn primary" data-action="new-avis" data-imm="${f}">${icon('plus')} Avis</button>` : tab === 'intervenants' ? html`<div class="actions" style="margin:0"><button class="btn" data-action="go" data-to="champeq">🏆 Classement</button><button class="btn primary" data-action="new-interv">${icon('plus')} Nouvel ouvrier</button></div>`
      : tab === 'dechets' ? html`<button class="btn primary" data-action="new-collecte" data-imm="${f}">${icon('plus')} Collecte</button>`
      : tab === 'devis' ? html`<button class="btn primary" data-action="dev-new">${icon('plus')} Nouveau devis</button>`
      : html`<button class="btn primary" data-action="new-tache" data-imm="${f}">${icon('plus')} Intervention</button>`;
    const tabs = html`<div class="tabs" role="tablist" style="max-width:560px">${[['planning', 'Planning'], ['taches', html`<span>Réclamations</span> (${tacheToDo().length})`], ['dechets', 'Déchets'], ['avis', 'Avis'], ['intervenants', 'Équipe'], ['devis', html`📝 Devis${devOpen().length ? html` <b class="dev-n">${devOpen().length}</b>` : ''}`]].map(([k, l]) => html`<button class="tab" role="tab" aria-selected="${tab === k}" data-action="mt-tab" data-id="${k}">${l}</button>`)}</div>`;
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
        <div class="section-label"><span>À faire + travaux</span> (${open.length})</div>${open.length ? list(open) : html`<p class="muted small">Rien à faire. 👍</p>`}
        ${recur.length ? html`<div class="section-label">Récurrentes (${recur.length})</div>${list(recur)}` : ''}
        ${done.length ? html`<div class="section-label">Terminées récemment</div>${list(done)}` : ''}${mtLegend()}`
        : empty('tool', 'Aucune intervention.', html`<button class="btn primary" data-action="new-tache" data-imm="${f}">${icon('plus')} Nouvelle intervention</button>`);
      body = html`<p class="small muted" style="margin:0 0 10px">Ce que les locataires signalent depuis leur app (pannes, défauts, propreté, avertissements…) et les travaux à faire dans les logements et les parties communes.</p>${body}`;
    } else if (tab === 'avis') {
      const all = vault.list('avis').filter((a) => !isPub(a) && (!f || !a.immId || a.immId === f)).sort((a, b) => (b.debut || '').localeCompare(a.debut || ''));
      const actifs = all.filter((a) => !a.fin || a.fin >= today()), passes = all.filter((a) => a.fin && a.fin < today()).slice(0, 10);
      const row = (a) => html`<button class="row" data-action="edit-avis" data-id="${a.id}"><span class="grow"><span class="title" style="display:block;white-space:normal">📢 ${a.texte.slice(0, 140)}</span>
        <span class="meta">${a.immId ? immName(a.immId) : 'Tous les immeubles'} · ${a.debut ? 'du ' + fmtDate(a.debut) : ''}${a.fin ? ' au ' + fmtDate(a.fin) : ''}</span></span></button>`;
      body = html`<p class="small muted" style="margin:0 0 10px">Messages affichés dans l'espace des locataires (coupure d'eau, travaux, nettoyage de la cave…).</p>
        ${actifs.length ? html`<div class="list" style="margin-bottom:14px">${actifs.map(row)}</div>` : empty('msg', 'Aucun avis en cours.', html`<button class="btn primary" data-action="new-avis" data-imm="${f}">${icon('plus')} Nouvel avis</button>`)}
        ${passes.length ? html`<div class="section-label">Terminés</div><div class="list">${passes.map(row)}</div>` : ''}`;
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
    } else if (tab === 'devis') {
      body = devTab();
    } else {
      const ints = vault.list('intervenants').sort((a, b) => (a.cat === 'specialise') - (b.cat === 'specialise') || Object.keys(METIERS).indexOf(a.metier) - Object.keys(METIERS).indexOf(b.metier) || intervFull(a).localeCompare(intervFull(b)));
      const nNew = sum(ints, (i) => i.feedNew || 0);
      body = ints.length ? html`${eqTodayHtml()}<button class="btn block" style="margin-bottom:12px" data-action="eq-feed">📋 Activité de l’équipe${nNew ? html` <span class="badge bad">${nNew} nouveau${nNew > 1 ? 'x' : ''}</span>` : ''}</button><div class="list">${ints.map((i) => {
        const n = vault.list('taches').filter((t) => t.intervenantId === i.id && (t.recur || t.statut !== 'fait')).length;
        const tel = (i.tel || '').replace(/[^\d+]/g, '');
        const ab = absOn(i, today());
        return html`<div class="row"><span class="avatar met-ic" title="${METIERS[i.metier] || ''}">${avW(i)}</span>
          <button class="grow" style="background:none;border:0;font:inherit;color:inherit;text-align:left;cursor:pointer;min-width:0" data-action="open-interv" data-id="${i.id}"><span class="title" style="display:block">${intervFull(i)}${i.espace && i.espace.on ? ' 📱' : ''}${ab ? html` <span class="badge ${ab.type === 'maladie' ? 'bad' : 'warn'}">${ABS_TYPES[ab.type]}${ab.fin ? ' → ' + fmtDate(ab.fin) : ''}</span>` : ''}</span><span class="meta">${METIERS[i.metier] || i.metier} · ${{ interne: 'interne', societe: 'société', prive: 'privé' }[i.genre || 'interne']} · ${(i.cat || 'quotidien') === 'specialise' ? 'spécialisé' : 'quotidien'}${i.tarif ? ' · ' + i.tarif : ''}${n ? ' · ' + plural(n, 'intervention') + ' en cours' : ''}</span></button>
          ${tel ? html`<a class="btn icon sm" href="tel:${tel}" aria-label="Appeler">${icon('phone')}</a>` : ''}
        </div>`;
      })}</div>` : empty('users', 'Aucun intervenant. Ajoutez la femme de ménage et les artisans (menuisier, électricien, plombier, chauffagiste, maçon…).', html`<button class="btn primary" data-action="new-interv">${icon('plus')} Ajouter un intervenant</button>`);
    }
    return html`${pageHead('Maintenance', 'Nettoyage, réparations et collecte des déchets', add)}${tabs}${tab !== 'intervenants' && tab !== 'devis' ? chips : ''}${body}`;
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
      return html`${pushNudge()}${pageHead('Bienvenue', 'Commencez par ajouter un immeuble, puis ses logements et locataires.')}
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
    const assurTodo = vault.list('intervenants').filter((i) => i.genre === 'prive' && i.assurTodo && !i.archive);
    const assurBox = assurTodo.length ? html`<div class="stack" style="margin-bottom:14px">${assurTodo.map((i) => alertBtn('warn', 'alert', 'open-interv', i.id, html`🛡️ <b>Assurance RC à faire</b> : ${intervFull(i)} (occasionnel) n’a pas encore donné son assurance<div class="tiny">rappel affiché dans son app · touchez pour ouvrir sa fiche</div>`))}</div>` : '';
    const absNow = vault.list('intervenants').map((i) => [i, absOn(i, today())]).filter(([, a]) => a);
    const absSoon = vault.list('intervenants').map((i) => [i, (i.absences || []).find((a) => a.debut > today() && a.debut <= addDays(today(), 7))]).filter(([, a]) => a);
    const absBox = absNow.length || absSoon.length ? html`<div class="stack" style="margin-bottom:14px">${absNow.map(([i, a]) => { const n = vault.list('taches').filter((t) => t.intervenantId === i.id && (t.recur || t.statut !== 'fait')).length; return alertBtn(a.type === 'maladie' ? 'bad' : 'warn', 'calendar', 'open-interv', i.id, html`${ABS_TYPES[a.type]} : <b>${intervFull(i)}</b> absent${a.fin ? ' jusqu’au ' + fmtDate(a.fin) : ' (fin non connue)'}${n ? html` — <b>${plural(n, 'intervention')}</b> à vérifier` : ''}<div class="tiny">touchez pour la fiche</div>`); })}
      ${absSoon.map(([i, a]) => alertBtn('info', 'calendar', 'open-interv', i.id, html`${ABS_TYPES[a.type]} prévu : <b>${intervFull(i)}</b> du ${fmtDate(a.debut)}${a.fin ? ' au ' + fmtDate(a.fin) : ''}`))}</div>` : '';
    const toolsBox = ui.toolsPending ? html`<div class="stack" style="margin-bottom:14px">${alertBtn('warn', 'check', 'open-tools', '', html`🧰 <b>${ui.toolsPending} annonce${ui.toolsPending > 1 ? 's' : ''} à approuver</b> (don · prêt · location)<div class="tiny">touchez pour voir et approuver</div>`)}</div>` : '';
    // travaux finis par l'équipe, en attente de clôture par le bureau
    const fins = vault.list('taches').filter((t) => t.fini && !t.recur && t.statut !== 'fait').sort((a, b) => (a.fini.d + a.fini.h).localeCompare(b.fini.d + b.fini.h));
    const finBox = fins.length ? html`<div class="section-label" style="margin-top:0">🟢 ${plural(fins.length, 'chantier')} fini${fins.length > 1 ? 's' : ''} par l’équipe — à clôturer</div><div class="list fin-list" style="margin-bottom:14px">${fins.map((t) => tacheRow(t))}</div>` : '';
    // ✋ travaux refusés par l'ouvrier (malade, pas disponible…) : à donner à quelqu'un d'autre
    const refs = vault.list('taches').filter((t) => t.refus && !t.intervenantId && !t.recur && t.statut !== 'fait').sort((a, b) => (a.date || '9').localeCompare(b.date || '9'));
    const refBox = refs.length ? html`<div class="section-label" style="margin-top:0;color:var(--bad,#c0392b)">✋ ${refs.length} ${refs.length > 1 ? 'travaux' : 'travail'} refusé${refs.length > 1 ? 's' : ''} par l’ouvrier — à réaffecter</div><div class="list ref-list" style="margin-bottom:14px">${refs.map((t) => html`<div>${tacheRow(t)}<div class="tiny" style="padding:2px 12px 8px">✋ ${intervName(t.refus.by)} · ${fmtDateTime(t.refus.at)}${t.refus.note ? ' — ' + t.refus.note : ''}</div></div>`)}</div>` : '';
    return html`
      ${pushNudge()}
      ${nudge}
      ${devBanner()}
      ${refBox}
      ${assurBox}
      ${finBox}
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
      })}</div>`, 'margin-top:14px')}`;
  },

  immeubles() {
    const y = new Date().getFullYear();
    const every = vault.list('immeubles').sort(byAddr);
    const nGone = every.filter(immGone).length;
    const anciens = ui.immSeg === 'anciens' && nGone > 0;
    const imms = every.filter((im) => immGone(im) === anciens);
    return html`
      ${pageHead('Immeubles', `${plural(every.length - nGone, 'immeuble')} en gestion${nGone ? ' · ' + nGone + ' archivé' + (nGone > 1 ? 's' : '') : ''}`, html`<div class="actions" style="margin:0"><button class="btn primary desk-only" data-action="new-imm">${icon('plus')} Ajouter immo.</button></div>`)}
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

  gerances() {
    const c = ptlConf();
    const portal = html`<a class="btn sm" href="/portail.html" target="_blank" rel="noopener">${icon('eye')} Ouvrir le portail</a>`;
    if (!c) {
      return html`${pageHead('Gérances', 'Le Portail gérance, piloté d’ici')}
        <div class="card" style="max-width:560px">
          <img src="/portail/icons/ptl-banner.webp" alt="" width="1100" height="283" style="display:block;width:100%;max-width:320px;height:auto;margin:0 auto 12px">
          <p style="margin-top:0">Les <b>gérances</b> sont les sociétés externes qui vous confient leurs réparations. Elles utilisent leur app, le <b>Portail gérance</b> : demandes avec photos, suivi, chat, photos avant / après, satisfaction, statistiques.</p>
          <p class="small">Ici vous créez les gérances, invitez leurs responsables, gérez leurs résidences et pouvez les supprimer — comme pour l’app de l’équipe.</p>
          <div class="alert info" style="margin:12px 0">${icon('shield')}<div>Connectez une seule fois cette app au portail avec votre <b>compte LuxInterventions du portail</b>. Le mot de passe ne quitte pas l’appareil ; la session est gardée dans vos données chiffrées.</div></div>
          ${ui.ptl.err ? html`<div class="alert warn" style="margin-bottom:12px">${icon('alert')}<div>${ui.ptl.err}</div></div>` : ''}
          <form data-form="ptl-login" class="fields">
            <label class="field full">Email du compte LuxInterventions<input type="email" name="email" autocomplete="username" required value="${ui.ptl.email || (vault.get('reglages', 'portail') || {}).email || ''}"></label>
            <label class="field full">Mot de passe du portail<input type="password" name="pass" autocomplete="current-password" required></label>
            <button class="btn primary full" type="submit">${icon('key')} Connecter au portail</button>
          </form>
          <p class="tiny muted" style="margin-bottom:0"><span>Pas encore de compte ? Ouvrez le portail : la « Première configuration » crée le compte LuxInterventions.</span> ${portal}</p>
        </div>`;
    }
    const d = ui.ptl.data;
    if ((!d && !ui.ptl.err) || (d && Date.now() - d.at > 60000)) !ui.ptl.loading && setTimeout(ptlLoad, 0);
    const head = pageHead('Gérances', d ? `${plural(d.orgs.length, 'gérance')} · Portail gérance` : 'Portail gérance', html`<button class="btn primary" data-action="ger-new">${icon('plus')} Ajouter gérance</button>`);
    const foot = html`<p class="tiny muted" style="margin-top:22px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">Connecté au portail : <b>${c.email || ''}</b> ${portal}
      <button class="btn sm ghost" data-action="ger-reload">${icon('sync')} Actualiser</button><button class="btn sm ghost" data-action="ptl-self-reset">🔑 Nouveau mot de passe du portail</button><button class="btn sm ghost danger" data-action="ptl-logout">Déconnecter</button></p>`;
    if (!d) return html`${head}${ui.ptl.err ? html`<div class="alert warn">${icon('alert')}<div>${ui.ptl.err} <button class="btn sm" data-action="ger-reload">Réessayer</button></div></div>` : html`<p class="muted">Chargement…</p>`}${foot}`;
    const of = ui.ptl.org || '', oSel = of && ptlOrg(of);
    const tks = d.tickets.filter((t) => !of || t.org_id === of);
    const nRecue = d.tickets.filter((t) => t.status === 'recue').length;
    const chips = html`<div class="chips ger-chips" style="margin-bottom:10px">
      <button class="chip" data-action="ger-filter" data-id="" aria-pressed="${!of}">Toutes les gérances</button>
      ${d.orgs.map((o) => html`<button class="chip" data-action="ger-filter" data-id="${o.id}" aria-pressed="${of === o.id}">${orgLogo(o.id)} ${o.name}${o.open ? html` <b class="ger-n">${o.open}</b>` : ''}</button>`)}</div>
      ${oSel ? html`<div class="actions" style="margin:0 0 12px"><button class="btn sm" data-action="ger-open" data-id="${of}">${icon('users')} Accès</button><button class="btn sm" data-action="ger-open" data-id="${of}" data-tab="fact">🧾 Facturation</button><button class="btn sm ghost" data-action="ger-edit" data-id="${of}">${icon('edit')} Modifier</button></div>` : ''}`;
    const row = (t) => { const u = PTL_URG[t.urgence] || PTL_URG.planifie; return html`<button class="row ger-req ${t.status === 'recue' ? 'is-new' : ''} u-${t.urgence}" data-action="ger-ticket" data-id="${t.id}">
        <span class="avatar" style="background:var(--${u[2]}-soft, var(--surface-2))">${u[0]}</span>
        <span class="grow"><span class="title" style="display:block;white-space:normal">#${t.ref} · ${t.categorie || 'Intervention'}${t.lieu ? html` <span class="muted small">— ${t.lieu}</span>` : ''}</span>
          <span class="meta" style="white-space:normal">${orgLogo(t.org_id)} ${t.org_name} · ${t.residence_name}${t.residence_address ? ' — ' + t.residence_address : ''}</span>
          <span class="meta" style="display:block;white-space:normal">${t.technicien ? html`👷 ${t.technicien} · ` : ''}${t.planned_at ? html`📅 ${String(t.planned_at).replace('T', ' ')} · ` : ''}${ptlTime(t.created_at)}${t.photos ? html` · 📷 ${t.photos}` : ''}</span></span>
        <span style="display:flex;flex-direction:column;align-items:flex-end;gap:4px"><span class="badge ${t.status === 'recue' ? 'warn' : ''}">${PTL_ST[t.status] || t.status}</span>${!['terminee', 'annulee'].includes(t.status) && !vault.list('taches').some((x) => x.ptl && x.ptl.tid === t.id && x.intervenantId) ? html`<span class="tiny amber">⏸ à affecter</span>` : ''}
          ${t.msgs ? html`<span class="tiny ${ptlUnread(t) ? 'ger-unread' : 'muted'}">💬 ${t.msgs} message${t.msgs > 1 ? 's' : ''}${ptlUnread(t) ? html` · <b>${ptlUnread(t)} nouveau${ptlUnread(t) > 1 ? 'x' : ''}</b>` : ''}</span>` : ''}</span></button>`; };
    // demandes « mot de passe oublié » venues du portail : un nouveau lien en un toucher
    const forgot = d.users.filter((u) => u.forgot_at && u.active);
    const forgotBox = forgot.length ? html`<div class="alert warn" style="margin-bottom:14px">🔑<div><b>Mot de passe oublié</b>${forgot.map((u) => html`<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:6px"><span class="grow">${u.name} · ${u.email}${ptlOrg(u.org_id) ? ' · 🏢 ' + ptlOrg(u.org_id).name : ''} <span class="tiny muted">(${ptlTime(u.forgot_at)})</span></span><button class="btn sm primary" data-action="ger-inv" data-id="${u.id}" data-org="${u.org_id || ''}">🔗 Envoyer un nouveau lien</button></div>`)}</div></div>` : '';
    return html`${head}
      ${forgotBox}
      ${chips}
      <div class="section-label">📥 Demandes d’intervention ${nRecue ? html`<span class="badge warn">${nRecue} nouvelle(s)</span>` : ''}</div>
      <p style="margin:0 0 8px;text-align:right"><button class="btn sm ghost" data-action="ger-done" aria-pressed="${!!ui.ptl.done}">${ui.ptl.done ? 'Voir les demandes en cours' : 'Voir les terminées'}</button></p>
      ${tks.length ? html`<div class="list" style="margin-bottom:18px">${tks.map(row)}</div>` : html`<p class="muted small" style="margin-bottom:18px">${ui.ptl.done ? 'Aucune demande terminée.' : 'Aucune demande en cours.'}</p>`}
      <details class="ger-orgs"${d.orgs.length ? '' : ' open'}><summary class="section-label" style="cursor:pointer">🏢 Fiches des gérances (${d.orgs.length})</summary>
      ${d.orgs.length ? html`<div class="grid cols-auto">${d.orgs.map((o) => {
        const us = d.users.filter((u) => u.org_id === o.id);
        const wait = us.filter((u) => u.active && !u.has_password).length;
        return html`<div class="card">
          <div class="card-title"><h3>${o.logo ? html`<img class="org-logo big" src="${o.logo}" alt="">` : html`<img src="/portail/icons/ptl-32.png" alt="" width="22" height="22" style="vertical-align:-4px;margin-right:6px;border-radius:5px">`}${o.name}</h3><button class="btn icon ghost sm" data-action="ger-edit" data-id="${o.id}" aria-label="Modifier">${icon('edit')}</button></div>
          <dl class="kv small">
            <dt>Accès</dt><dd>${us.filter((u) => u.active).length}${wait ? html` · <span class="amber">${wait} invitation(s) en attente</span>` : ''}</dd>
            <dt>Résidences</dt><dd>${o.residences || 0}</dd>
            <dt>Demandes en cours</dt><dd class="${o.open ? 'accent' : ''}">${o.open || 0}</dd>
            ${o.email ? html`<dt>Email</dt><dd>${o.email}</dd>` : ''}
            ${o.phone ? html`<dt>Téléphone</dt><dd>${o.phone}</dd>` : ''}
          </dl>
          <div class="actions" style="margin:14px 0 0">
            <button class="btn sm primary" data-action="ger-open" data-id="${o.id}">${icon('users')} Accès</button>
            <button class="btn sm" data-action="ger-open" data-id="${o.id}" data-tab="fact">🧾 Facturation</button>
          </div>
        </div>`;
      })}</div>` : empty('briefcase', 'Aucune gérance pour l’instant.', html`<button class="btn primary" data-action="ger-new">${icon('plus')} Ajouter une gérance</button>`)}
      </details>
      ${foot}`;
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
      ${pageHead('Locataires', `${all.length - nGone} actuels · ${nGone} anciens`, html`<button class="btn primary desk-only" data-action="new-loc">${icon('plus')} Ajouter loc.</button>`)}
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
            <span class="avatar" ${anciens ? new Raw('style="background:var(--surface-2);color:var(--text-3)"') : ''}>${avIn(l)}</span>
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
      return html`<div class="card"><div class="card-title"><h3>${im.adresse}</h3><span style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;justify-content:flex-end"><span class="tiny muted"><b class="green">${money(collected)}</b> reçus</span><span class="badge ${level(pct(collected, due)) || 'ok'}">${pct(collected, due)}%</span></span></div>${rows}
        <div class="totals"><span>Échu à ce jour <b>${money(due)}</b></span><span>Reçu <b class="green">${money(paid)}</b></span><span>Impayé <b class="${rest > 0.009 ? 'red' : 'green'}">${money(rest)}</b></span></div></div>`;
    }).filter(Boolean);
    return html`
      ${pageHead('Gestion locataire', 'Paiements des loyers — touchez un mois vide pour le marquer payé ; touchez un mois payé pour le montant, la quittance ou l’annulation.')}
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
    // deux espaces séparés : Comptabilité (pour l'État) | Statistiques
    const sec = ui.cpSec || 'compta';
    const secTabs = html`<div class="tabs" role="tablist" style="max-width:640px;margin-bottom:16px">${[['compta', html`📒 <span class="tab-long">Comptabilité</span><span class="tab-short">Compta</span>`], ['stats', html`📊 <span class="tab-long">Statistiques</span><span class="tab-short">Stats</span>`], ['abo', '💳 Abonnements']].map(([k, l]) => html`<button class="tab" role="tab" aria-selected="${sec === k}" data-action="cp-sec" data-id="${k}">${l}</button>`)}</div>`;
    if (sec === 'abo') return html`${secTabs}${pageHead('💳 Abonnements', 'Abonnements des gérances et annonces publicitaires vendues')}${aboSection()}`;
    if (sec === 'stats') return html`${secTabs}${pageHead('📊 Statistiques', 'Loyers, occupation, dépenses, interventions, devis')}${VIEWS.stats()}${devStatsHtml(ui.year)}`;
    const tabs = html`<div class="tabs" role="tablist" style="max-width:620px">${[['journal', 'Journal'], ['tva', 'TVA'], ['interv', '🔧 Interventions'], ['fact', '🧾 Factures'], ['export', 'Export']].map(([k, l]) => html`<button class="tab" role="tab" aria-selected="${tab === k}" data-action="cp-tab" data-id="${k}">${l}</button>`)}</div>`;
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
    } else if (tab === 'tva') {
      const perT = soc.periode || 't';
      const periods = perT === 'm' ? MONTHS_FULL.map((_, i) => 'm' + (i + 1)) : perT === 'a' ? ['y'] : ['q1', 'q2', 'q3', 'q4'];
      const imms = vault.list('immeubles').filter((im) => !immGone(im)).sort(byAddr);
      // TVA des factures d'interventions (ARES INVEST S.A. — LuxInterventions) : pas de TVA sur les loyers
      const inv = (a, b) => vault.list('taches').filter((t) => t.facture && t.facture.date >= a && t.facture.date <= b);
      const c0 = factConf();
      body = html`<p class="small muted" style="margin-top:0">TVA des <b>factures d’interventions</b> émises par ${c0.nom} (LuxInterventions). Les loyers ne sont pas soumis à la TVA.</p>
        <div class="card" style="padding:0;overflow:auto;margin-bottom:14px"><table class="tbl"><thead><tr><th>Période</th><th class="r">Factures</th><th class="r">HT</th><th class="r">TVA collectée</th><th class="r">TTC</th></tr></thead><tbody>
          ${periods.map((pp) => { const [a, b] = cpRange(y, pp), F = inv(a, b); return html`<tr><td>${cpLabel(y, pp)}</td><td class="r">${F.length}</td><td class="r">${money(sum(F, (t) => t.facture.ht))}</td><td class="r"><b>${money(sum(F, (t) => t.facture.tva))}</b></td><td class="r">${money(sum(F, (t) => t.facture.ttc))}</td></tr>`; })}
          ${(() => { const [a, b] = cpRange(y, 'y'), F = inv(a, b); return html`<tr class="cp-month"><td><b>Année ${y}</b></td><td class="r"><b>${F.length}</b></td><td class="r"><b>${money(sum(F, (t) => t.facture.ht))}</b></td><td class="r"><b>${money(sum(F, (t) => t.facture.tva))}</b></td><td class="r"><b>${money(sum(F, (t) => t.facture.ttc))}</b></td></tr>`; })()}
        </tbody></table></div>
        <p class="tiny muted">Taux normal : ${String(c0.taux).replace('.', ',')} % (Réglages → 🧾 Facturation) ; régime par client (autoliquidation, non applicable…) dans Gérances → la gérance → 🧾 Facturation. Détail facture par facture : onglet 🧾 Factures. Aide à la déclaration, à faire vérifier par votre comptable.</p>`;
    } else if (tab === 'fact') {
      const F = vault.list('taches').filter((t) => t.facture && t.facture.date >= from && t.facture.date <= to).sort((a, b) => b.facture.no.localeCompare(a.facture.no));
      const todo = vault.list('taches').filter((t) => t.ptl && t.statut === 'fait' && !t.facture);
      const c = factConf();
      body = html`<div class="metrics" style="margin-bottom:14px">
          <div class="metric"><div class="lbl">Factures</div><div class="val">${F.length}</div><div class="sub">${cpLabel(y, per)}</div></div>
          <div class="metric"><div class="lbl">À encaisser</div><div class="val red">${eur(sum(F.filter((t) => !t.facture.paid), (t) => t.facture.ttc))}</div><div class="sub">${plural(F.filter((t) => !t.facture.paid).length, 'facture')}</div></div>
          ${(() => { const C = vault.list('taches').filter((t) => t.facture && t.facture.cont && !t.facture.paid); return C.length ? html`<div class="metric cont-blink-box"><div class="lbl">⚠️ Contentieux</div><div class="val red">${eur(sum(C, (t) => t.facture.ttc))}</div><div class="sub">${plural(C.length, 'facture')} impayée${C.length > 1 ? 's' : ''} en litige</div></div>` : ''; })()}
          <div class="metric hero"><div class="lbl">Facturé TTC</div><div class="val accent">${eur(sum(F, (t) => t.facture.ttc))}</div><div class="sub">HT ${eur(sum(F, (t) => t.facture.ht))} · TVA ${eur(sum(F, (t) => t.facture.tva))}</div></div></div>
        <div class="toolbar" style="margin-bottom:10px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-action="cp-fact-csv">${icon('download')} Factures (Excel / CSV)</button><button class="btn ghost" data-action="fact-set">⚙️ Émetteur : ${c.nom}</button></div>
        ${todo.length ? html`<div class="section-label">🟡 À facturer (${todo.length})</div><div class="list" style="margin-bottom:14px">${todo.map((t) => html`<button class="row" data-action="fact-open" data-id="${t.id}"><span class="grow"><span class="title" style="display:block">${t.ptl ? '#' + t.ptl.ref + ' · ' : ''}${t.titre}</span><span class="meta">🏢 ${t.ptl ? t.ptl.org : ''} · clôturée le ${fmtDate(t.doneDate || t.date)}</span></span><span class="badge warn">🧾 Faire la facture</span></button>`)}</div>` : ''}
        ${F.length ? html`<div class="section-label">Factures émises</div><div class="list">${F.slice(0, ui.cpLim || 10).map((t) => html`<button class="row" data-action="fact-open" data-id="${t.id}"><span class="grow"><span class="title" style="display:block">${t.facture.no}</span><span class="meta">🏢 ${t.ptl ? t.ptl.org : ''} · ${fmtDate(t.facture.date)} · ${t.titre}</span></span><span style="text-align:right"><b>${eur(t.facture.ttc)}</b>${t.facture.cont && !t.facture.paid ? html`<span class="badge cont-blink" style="display:block">⚠️ CONTENTIEUX</span>` : html`<span class="tiny ${t.facture.paid ? '' : 'red'}" style="display:block">${t.facture.paid ? '✅ payée' : '⏳ à payer'}</span>`}</span></button>`)}</div>${moreBtn(F.length, ui.cpLim || 10)}` : html`<p class="muted">Aucune facture émise sur cette période.</p>`}`;
    } else if (tab === 'interv') {
      const L = intervLedger(from, to);
      const hTot = sum(L, (x) => x.min) / 60, cTot = sum(L, (x) => x.cout || 0);
      body = html`<div class="metrics" style="margin-bottom:14px">
          <div class="metric"><div class="lbl">Interventions</div><div class="val">${L.length}</div><div class="sub">${cpLabel(y, per)}</div></div>
          <div class="metric"><div class="lbl">Heures réelles</div><div class="val">${fmtH(hTot)}</div><div class="sub">arrivée → départ (app de l’équipe)</div></div>
          <div class="metric hero"><div class="lbl">Montant</div><div class="val accent">${money(cTot)}</div><div class="sub">coûts indiqués sur les interventions</div></div></div>
        <div class="toolbar" style="margin-bottom:10px"><button class="btn" data-action="cp-int-csv">${icon('download')} Interventions (Excel / CSV)</button></div>
        ${L.length ? html`<div class="list">${L.slice(0, ui.cpLim || 10).map((x) => html`<button class="row" data-action="edit-tache" data-id="${x.t.id}"><span style="min-width:74px"><b>${dayShort(x.d)}</b><span class="meta" style="display:block">${x.arr ? `${x.arr}–${x.dep || '…'}` : '—'}</span></span>
            <span class="grow"><span class="title" style="display:block;white-space:normal">${tacheIcon(x.t.type)} ${x.t.titre}${x.ger ? html` <span class="badge">🏢 ${x.ger}</span>` : ''}</span>
              <span class="meta" style="white-space:normal">📍 ${x.lieu} · 👷 ${x.who || '—'}${x.min ? ' · 🕒 ' + fmtH(x.min / 60) : ''}${x.avis ? ' · ' + x.avis : ''}${x.state === 'fini' ? ' · ✅ à clôturer' : ''}</span></span>
            <b>${x.cout ? money(x.cout) : ''}</b></button>`)}</div>${moreBtn(L.length, ui.cpLim || 10)}` : html`<p class="muted">Aucune intervention terminée sur cette période.</p>`}
        <p class="tiny muted" style="margin-top:10px">Chaque ligne : où, quoi, qui, heures réelles (l’ouvrier note son arrivée et son départ), avis des locataires et coût. Les factures par intervention arrivent à l’étape suivante.</p>`;
    } else {
      body = html`<div class="card"><p style="margin-top:0">Téléchargez le <b>journal ${cpLabel(y, per)}</b> (recettes, dépenses, bailleurs, frais fixes, avec HT / TVA / TTC) pour votre comptable. Le fichier s’ouvre dans Excel, Numbers ou LibreOffice.</p>
        <button class="btn primary" data-action="cp-csv">${icon('download')} Télécharger le journal (Excel / CSV)</button>
        <button class="btn" data-action="cp-print">${icon('file')} Imprimer / PDF</button>
        <p class="tiny muted" style="margin-bottom:0">Les factures restent dans l’app (chiffrées) : ouvrez-les avec 📎 dans le Journal pour les télécharger une par une.</p></div>`;
    }
    return html`${secTabs}${pageHead('📒 Comptabilité', 'Journal, TVA, interventions et export pour le comptable (déclarations)')}${tabs}${tools}${body}`;
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
      ${ui.ptl.nMsg ? html`<button class="alert info" data-action="go" data-to="gerances" style="width:100%;text-align:left;cursor:pointer;margin-bottom:10px">💬<div><b>${ui.ptl.nMsg > 1 ? ui.ptl.nMsg + ' messages non lus' : '1 message non lu'}</b> des gérances<br><span class="small">Toucher pour les voir →</span></div></button>` : ''}
      ${ui.ptl.nNew ? html`<button class="alert warn ger-alert" data-action="go" data-to="gerances" style="width:100%;text-align:left;cursor:pointer;margin-bottom:14px">📥<div><b>${ui.ptl.nNew > 1 ? ui.ptl.nNew + ' nouvelles demandes d’intervention' : '1 nouvelle demande d’intervention'}</b> des gérances, pas encore prises en charge<br><span class="small">Toucher pour les voir →</span></div></button>` : ''}
      <div class="section-label">Synchronisation</div>
      <div class="list settings">
        <div class="row"><span class="grow"><span class="title" style="display:block">${labels[vault.status]}</span><span class="meta">${vault.lastSync ? 'Dernière synchro : ' + fmtDateTime(vault.lastSync) : 'Pas encore synchronisé'}</span></span>
          <button class="btn sm" data-action="sync-now">${icon('sync')} Synchroniser</button></div>
        <button class="row" data-action="go" data-to="champions"><span class="avatar">🏆</span><span class="grow"><span class="title" style="display:block">Classements de l’année</span><span class="meta">Locataire de l’année (poubelles · pizza 🍕) · Ouvrier de l’année (équipe · récompense 🎁)</span></span></button>
        <button class="row" data-action="fact-set"><span class="avatar">🧾</span><span class="grow"><span class="title" style="display:block">Facturation des interventions</span><span class="meta">${factConf().nom} — LuxInterventions · TVA ${factConf().taux} % · IBAN ${factConf().iban || 'à compléter'}</span></span></button>
        <button class="row" data-action="esp-list">${icon('users')}<span class="grow"><span class="title" style="display:block">App des locataires</span><span class="meta">${vault.list('locataires').filter((x) => x.espace && x.espace.on).length} accès actifs — donner ou retirer l'accès</span></span></button>
        <button class="row" data-action="go" data-to="maintenance">${icon('tool')}<span class="grow title">Maintenance — nettoyage, réparations, déchets</span></button>
        <button class="row" data-action="go" data-to="gerances">${icon('briefcase')}<span class="grow"><span class="title" style="display:block">Gérances — Portail gérance${ui.ptl.nNew ? html` <span class="badge warn">📥 ${ui.ptl.nNew}</span>` : ''}</span><span class="meta">Gérances externes : accès, résidences, demandes d’intervention</span></span></button>
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

      <div class="section-label">Notifications</div>
      <p class="small muted" style="margin:0 0 8px">Un avis et le numéro sur l’icône quand un locataire ou l’équipe vous écrit (signalement, virement, photos, problème…). Le serveur ne lit rien : il dit seulement « nouveau message ».</p>
      ${pushSt === 'off' || !pushSt ? html`<button class="btn" data-action="push-on">🔔 Activer les notifications sur ce téléphone</button>` : html`<p class="small" style="margin:0">${PUSH_MSG[pushSt] || ''}</p>`}

      <div class="section-label">Apparence</div>
      <div class="chips">${[['auto', 'Automatique'], ['light', 'Clair'], ['dark', 'Sombre']].map(([k, l]) => html`<button class="chip" data-action="theme" data-id="${k}" aria-pressed="${theme === k}">${l}</button>`)}</div>
      <div class="section-label">Langue</div>
      <div class="lang-mini" data-notr="1" role="group" aria-label="Langue">${['fr', 'de', 'en', 'it', 'pt', 'es'].filter((k) => LANGS[k]).map((k) => html`<button type="button" data-action="set-lang" data-id="${k}" title="${LANGS[k]}" aria-pressed="${LANG === k}">${k.toUpperCase()}</button>`)}</div>
      <p class="tiny muted" style="margin-top:4px">Les quittances, reçus et relances aux locataires restent en français (documents officiels).</p>
      <p class="tiny muted" style="margin-top:28px;text-align:center"><span data-notr="1">LuxInterventions · ${APP_BRAND.legal}</span> · v${VERSION} · données chiffrées AES-256-GCM de bout en bout</p>`;
  },
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
const leaveSheetOk = async () => {
  if (!sheetDirty) return true;
  const subs = [...sheetEl.querySelectorAll('button[type=submit]')].filter((b) => !b.disabled);
  const save = subs.find((b) => b.closest('.sheet-foot')) || subs[subs.length - 1];
  if (!save) return true; // rien à enregistrer dans cette fenêtre
  const lbl = save.textContent.replace(/\s+/g, ' ').trim() || 'Enregistrer';
  const v = await choiceBox('Fermer sans enregistrer ?', 'Ce que vous avez écrit n’est pas encore enregistré.', [{ value: 'drop', label: 'Fermer sans enregistrer', cls: 'ghost danger' }, { value: 'save', label: '💾 ' + lbl, cls: 'primary' }]);
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
sheetEl.addEventListener('close', () => (ui.sheet = null));
sheetEl.addEventListener('click', async (e) => { if (e.target === sheetEl && (await leaveSheetOk())) closeSheet(); });
sheetEl.addEventListener('cancel', (e) => { if (!sheetDirty) return; e.preventDefault(); leaveSheetOk().then((ok) => ok && closeSheet()); });

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
  if (s.kind === 'ger-ticket') setTimeout(ptlPhotos, 0);
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
// Lien vidéo de l'annonce : ce que verront les locataires (vérifié pendant la saisie)
const ttShort = (v) => /^https:\/\/((vm|vt)\.tiktok\.com\/|(www\.)?tiktok\.com\/t\/)[\w-]{4,30}\/?/.test(String(v || '').trim());
const vidHint = (v) => { v = String(v || '').trim(); if (!v) return ''; const e = videoEmbed(v); return e ? (e.audio ? '✓ Lien reconnu : petit lecteur audio dans l’annonce.' : '✓ Lien reconnu : mini écran dans l’annonce.') : ttShort(v) ? '🔗 Lien court TikTok : il sera converti en lien complet à l’enregistrement (mini écran).' : '⚠ Lien non reconnu : il s’affichera comme un simple bouton « ▶ Vidéo ».'; };
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
  // 💼 abonnement d'une gérance : formule, prix, période, payé jusqu'au, paiements reçus
  abo({ id }) {
    const o = ptlOrg(id);
    if (!o) return null;
    const a = aboOf(id) || { plan: 'pro', prix: 29, periode: 'mois', debut: today(), paidUntil: '', pays: [] };
    const pays = (a.pays || []).slice().reverse();
    return {
      title: '💼 Abonnement — ' + o.name,
      narrow: true,
      body: html`<form id="f" data-form="abo" class="fields"><input type="hidden" name="id" value="${id}">
        <label class="field full">Formule<select name="plan" data-input="abo-plan">${Object.entries(ABO_PLANS).map(([k, [l, pr]]) => html`<option value="${k}" data-prix="${pr}" ${a.plan === k ? new Raw('selected') : ''}>${l}${pr ? ` — ${pr} € / mois` : k === 'decouverte' ? ' — gratuit (1 immeuble)' : ''}</option>`)}</select></label>
        <label class="field">Prix HT (€)<input name="prix" type="number" step="0.01" min="0" inputmode="decimal" value="${a.prix ?? ''}"></label>
        <label class="field">Période<select name="periode"><option value="mois" ${a.periode !== 'an' ? new Raw('selected') : ''}>par mois</option><option value="an" ${a.periode === 'an' ? new Raw('selected') : ''}>par an (2 mois offerts)</option></select></label>
        <label class="field">Début<input type="date" name="debut" value="${a.debut || today()}"></label>
        <label class="field">Payé jusqu’au<input type="date" name="paidUntil" value="${a.paidUntil || ''}"></label>
      </form>
      ${aboOf(id) && a.plan !== 'decouverte' ? html`<div class="alert ${aboState(a) === 'ok' ? 'ok' : 'warn'}" style="margin:12px 0">${aboState(a) === 'ok' ? '✅' : '⏳'}<div>${aboState(a) === 'ok' ? html`Payé jusqu’au <b>${fmtDate(a.paidUntil)}</b>` : html`<b>À payer</b>${a.paidUntil ? html` depuis le ${fmtDate(a.paidUntil)}` : ''}`}
        <div style="margin-top:8px"><button class="btn sm primary" data-action="abo-paid" data-id="${id}">✅ Paiement reçu (${eur(+a.prix || 0)} · ${a.periode === 'an' ? '1 an' : '1 mois'})</button></div></div></div>` : ''}
      ${pays.length ? html`<div class="section-label">Paiements reçus</div><div class="list small">${pays.slice(0, 24).map((p) => html`<div class="row"><span class="grow">${fmtDate(p.d)} · <b>${eur(p.m)}</b></span><span class="meta">jusqu’au ${fmtDate(p.to)}</span></div>`)}</div>` : ''}`,
      foot: html`${aboOf(id) ? html`<button class="btn ghost danger" data-action="abo-del" data-id="${id}">${icon('trash')} Supprimer</button>` : ''}<button class="btn primary" type="submit" form="f">Enregistrer</button>`,
    };
  },
  'ger-ticket'({ id }) {
    const d = ui.ptl.cur;
    if (!d || !d.ticket || d.ticket.id !== id) return { title: 'Demande', body: html`<p class="muted">Chargement…</p>` };
    const t = d.ticket, r = d.residence || {}, u = PTL_URG[t.urgence] || PTL_URG.planifie, open = !['terminee', 'annulee'].includes(t.status);
    const parts = (x) => String(x || '').split(' · ').filter(Boolean);
    const linked = vault.list('taches').filter((x) => x.ptl && x.ptl.tid === t.id);
    const tel = (t.contact_phone || r.contact_phone || '').replace(/[^\d+]/g, '');
    const evLbl = (e) => (e.kind === 'create' ? 'Demande créée' : e.kind === 'edit' ? '✏️ Demande modifiée' : e.kind === 'status' ? PTL_ST[e.status] || e.status : e.kind === 'invoice' ? '🧾 Facture' : 'Message');
    return {
      title: `#${t.ref} · ${r.name || ''}`,
      body: html`<div class="chips" style="margin-bottom:10px"><span class="badge ${u[2] === 'red' ? 'danger' : u[2] === 'amber' ? 'warn' : ''}">${u[0]} ${u[1]}</span><span class="badge">${PTL_ST[t.status]}</span><span class="badge">${orgLogo(t.org_id)} ${r.org_name || ''}</span></div>
        <div class="note" style="margin-bottom:12px;white-space:pre-wrap"><b>${t.categorie || 'Intervention'}</b>\n${t.description}</div>
        <dl class="kv small" style="margin-bottom:12px">
          ${kvRow('Résidence', `${r.name || ''}${r.address ? ' — ' + r.address : ''}`)}
          ${t.lieu ? kvRow('Où', t.lieu) : ''}${r.interior ? kvRow('Intérieur', r.interior) : ''}${r.floors ? kvRow('Étage(s)', r.floors) : ''}
          ${t.acces ? html`<dt>Accès / codes</dt><dd>${parts(t.acces).map((x) => html`<div>${x}</div>`)}</dd>` : ''}
          ${!/(Boîte à clés|Porte|Alarme|Panneaux|Locaux techniques) : /.test(t.acces || '') && ptlResCodes(r).length ? html`<dt>Codes de la résidence</dt><dd>${ptlResCodes(r).map((x) => html`<div>${x}</div>`)}</dd>` : ''}
          ${t.dispo ? html`<dt>Disponibilités</dt><dd>${parts(t.dispo).map((x) => html`<div>${x}</div>`)}</dd>` : ''}
          ${t.contact_name || r.contact_name ? html`<dt>Contact sur place</dt><dd>${t.contact_name || r.contact_name}${tel ? html` · <a href="tel:${tel}">${t.contact_phone || r.contact_phone}</a>` : ''}</dd>` : ''}
          ${t.technicien ? kvRow('Technicien', t.technicien) : ''}${t.planned_at ? kvRow('Planifiée', String(t.planned_at).replace('T', ' ')) : ''}
          ${kvRow('Demandée', ptlTime(t.created_at))}
        </dl>
        ${d.photos.length ? html`<div class="section-label">📷 Photos</div><div class="photos" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">${d.photos.map((p) => html`<a target="_blank" rel="noopener"><img data-ptl-photo="${p.id}" alt="Photo" style="width:96px;height:96px;object-fit:cover;border-radius:10px;background:var(--surface-2)"></a>`)}</div>` : ''}
        ${linked.length ? html`<div class="alert info" style="margin-bottom:12px">${icon('tool')}<div>Dans Maintenance : ${linked.map((x) => html`<a href="#" data-action="edit-tache" data-id="${x.id}">${x.titre}${x.intervenantId ? ' — 👷 ' + intervFull(vault.get('intervenants', x.intervenantId) || {}) : ''}${x.date ? ' · ' + fmtDate(x.date) : ''}</a>${x.statut === 'fait' ? html` <button class="btn sm" data-action="fact-open" data-id="${x.id}">🧾 ${x.facture ? x.facture.no : 'Faire la facture'}</button>` : ''} `)}</div></div>` : ''}
        ${open ? (() => {
          const hints = metHints(`${t.categorie || ''} ${t.description || ''}`), team = affTeam(hints), fit = team.filter((i) => hints.includes(i.metier));
          const newBtn = html`<button class="btn sm" data-action="new-interv">${icon('plus')} Nouvel ouvrier</button>`;
          return html`<div class="section-label">👷 Affectation${linked.length ? ' — envoyer un autre ouvrier' : ' — qui envoyer ?'}</div>
          ${!team.length || (hints.length && !fit.length && !linked.length) ? html`<div class="alert warn" style="margin-bottom:10px">⏸<div><b>Stand-by</b> — ${team.length ? html`aucun ${hints.map((m) => METIERS[m]).join(' / ')} dans votre équipe` : 'aucun ouvrier dans votre équipe'}.<br><span class="small">Trouvez quelqu’un (ouvrier à engager, société externe ou privé occasionnel), créez-le avec « Nouvel ouvrier », puis affectez-le ici.</span></div></div>` : ''}
          ${team.length ? html`<div class="list small" style="margin-bottom:8px">${team.map((i) => affRow(i, hints, `data-action="ger-to-mt" data-id="${t.id}" data-iid="${i.id}"`))}</div>` : ''}
          <p style="margin:0 0 12px">${newBtn}</p>`;
        })() : ''}
        ${open ? html`<div class="actions" style="flex-wrap:wrap;margin-bottom:14px">
          ${t.status === 'recue' ? html`<button class="btn" data-action="ger-st" data-id="${t.id}" data-st="prise">✅ Prendre en charge</button>` : ''}
          ${t.status === 'planifiee' ? html`<button class="btn" data-action="ger-st" data-id="${t.id}" data-st="encours">🚚 En route</button>` : ''}
          ${['prise', 'planifiee', 'encours'].includes(t.status) ? html`<button class="btn" data-action="ger-st" data-id="${t.id}" data-st="terminee">${icon('check')} Terminée</button>` : ''}
          <button class="btn ghost danger" data-action="ger-st" data-id="${t.id}" data-st="annulee">Annuler la demande</button></div>` : ''}
        <div class="section-label">Suivi</div>
        <div class="list small" style="margin-bottom:10px">${d.events.map((e) => html`<div class="row" style="display:block"><b>${evLbl(e)}</b> <span class="muted">· ${e.user_name || ''} · ${ptlTime(e.created_at)}</span>${e.text && e.kind !== 'create' ? html`<div style="white-space:pre-wrap;margin-top:4px">${e.text}</div>` : ''}</div>`)}</div>
        <form data-form="ger-msg" class="chat-form"><input type="hidden" name="id" value="${t.id}"><textarea name="x" required maxlength="2000" placeholder="Message à la gérance…"></textarea><button class="btn primary" type="submit">${icon('msg')} Envoyer</button></form>
        <button class="btn sm" style="margin-top:8px" data-action="ger-ticket" data-id="${t.id}">${icon('sync')} Actualiser les messages</button>`,
      foot: html`<a class="btn" href="/portail.html#/t/${t.id}" target="_blank" rel="noopener">${icon('eye')} Ouvrir dans le portail</a><button class="btn primary" data-action="close-sheet">Fermer</button>`,
    };
  },
  // note « INTERVENTION OCCASIONNELLE » d'un travail terminé (heures réelles × tarif payé)
  'occ-fact'({ id }) {
    const t = vault.get('taches', id), i = t && vault.get('intervenants', t.intervenantId);
    if (!t || !i) return null;
    const L = intervLedger('0000', '9999').find((x) => x.t.id === t.id) || {};
    const o = t.occ || { h: L.min ? r2(L.min / 60) : '', taux: i.payeH ?? '', depl: i.payeDepl ?? '', mat: '', matLib: '', note: '', cash: !!i.cash || !i.iban };
    return {
      title: `🧾 Intervention occasionnelle${t.occ ? ' · ' + t.occ.no : ''}`,
      narrow: true,
      body: html`<form id="f" data-form="occ" class="fields"><input type="hidden" name="id" value="${id}">
        <p class="small full" style="margin:0"><b>${intervFull(i)}</b> → ${factConf().nom}<br>${t.titre} · ${placeName(t)}${L.arr ? html` · 🕒 ${L.arr}–${L.dep || ''}` : ''}</p>
        ${field('Heures travaillées', 'h', o.h, { type: 'number', attrs: 'step="0.25" min="0" inputmode="decimal" required' })}
        ${field('€ / heure', 'taux', o.taux, { type: 'number', attrs: money$ + ' required' })}
        ${field('Déplacement (€)', 'depl', o.depl, { type: 'number', attrs: money$ })}
        ${field('Matériel avancé (€)', 'mat', o.mat, { type: 'number', attrs: money$ })}
        ${field('Matériel : quoi ?', 'matLib', o.matLib, { full: true })}
        <div class="field full">Paiement<div class="st-radios" style="margin-top:4px"><label><input type="radio" name="pay" value="vir" ${o.cash ? '' : new Raw('checked')} ${i.iban ? '' : new Raw('disabled')}> 🏦 Virement${i.iban ? '' : ' (pas d’IBAN)'}</label><label><input type="radio" name="pay" value="cash" ${o.cash ? new Raw('checked') : ''}> 💵 Cash</label></div></div>
        <label class="field full">Note<textarea name="note">${o.note || ''}</textarea></label>
        ${i.sign ? '' : html`<div class="alert warn full">⚠️<div>La fiche de ${intervFull(i)} n’est pas signée : la note sortira sans signature.</div></div>`}
      </form>`,
      foot: html`<button class="btn" data-action="close-sheet">Annuler</button><button class="btn primary" type="submit" form="f">🧾 Enregistrer + PDF</button>`,
    };
  },
  // affectation depuis la fiche d'un ouvrier : les demandes d'intervention en cours
  'ger-aff'({ id }) {
    const i = vault.get('intervenants', id);
    if (!i) return null;
    const foot = html`<button class="btn" data-action="ger-aff-reload" data-id="${id}">${icon('sync')} Actualiser</button><button class="btn primary" data-action="close-sheet">Fermer</button>`;
    const title = `📌 Affecter ${intervFull(i)}`;
    if (!ptlConf()) return { title, body: html`<p class="muted">Portail gérance non connecté (menu Gérances).</p>`, foot };
    const d = ui.ptl.data;
    if (!d && ui.ptl.err) return { title, body: html`<p class="red">${ui.ptl.err}</p>`, foot };
    if (!d || ui.ptl.done) { if (ui.ptl.done) { ui.ptl.done = false; ui.ptl.data = null; } ptlLoad(); return { title, body: html`<p class="muted">Chargement des demandes…</p>`, foot }; }
    const tks = d.tickets.filter((t) => !['terminee', 'annulee'].includes(t.status));
    const fitT = (t) => metHints(`${t.categorie || ''} ${t.description || ''}`).includes(i.metier);
    tks.sort((a, b) => fitT(b) - fitT(a) || (a.urgence === 'urgent' ? -1 : 0) - (b.urgence === 'urgent' ? -1 : 0));
    return {
      title,
      body: html`<p class="small muted" style="margin:0 0 10px">${METIERS[i.metier] || ''} · touchez la demande à confier : il reste à choisir le jour et l’heure. ⭐ = correspond au métier.</p>
        ${tks.length ? html`<div class="list small">${tks.map((t) => {
          const u = PTL_URG[t.urgence] || PTL_URG.planifie, who = vault.list('taches').filter((x) => x.ptl && x.ptl.tid === t.id && x.intervenantId).map((x) => intervFull(vault.get('intervenants', x.intervenantId) || {}));
          return html`<button class="row" data-action="ger-to-mt" data-id="${t.id}" data-iid="${id}"><span class="avatar">${fitT(t) ? '⭐' : u[0]}</span><span class="grow"><span class="title" style="display:block;white-space:normal">${u[0]} #${t.ref} · ${t.categorie || 'Intervention'}${t.lieu ? html` <span class="muted">— ${t.lieu}</span>` : ''}</span><span class="meta" style="white-space:normal">${orgLogo(t.org_id)} ${t.org_name} · ${t.residence_name}</span>${who.length ? html`<span class="meta" style="display:block">👷 déjà : ${who.join(', ')}</span>` : html`<span class="meta amber" style="display:block">⏸ pas encore affectée</span>`}</span><span class="badge">Affecter →</span></button>`;
        })}</div>` : html`<p class="muted">Aucune demande d’intervention en cours.</p>`}`,
      foot,
    };
  },
  'ger-form'({ id }) {
    const o = id ? ptlOrg(id) : {};
    if (id && !o) return null;
    return {
      title: id ? 'Modifier la gérance' : 'Nouvelle gérance',
      narrow: true,
      body: html`<form id="gerForm" data-form="ger" class="fields">
        <input type="hidden" name="id" value="${id || ''}">
        ${(() => { const cl = factClient(id || '', o.name); return html`<div class="section-label full" style="margin:0">🏢 Société de gestion</div>
        <label class="field full">Nom de la société<input name="name" required value="${o.name || ''}" placeholder="ex. Gérance du Centre S.A."></label>
        ${o.logo ? html`<div class="field full" style="display:flex;gap:10px;align-items:center"><img class="org-logo xl" src="${o.logo}" alt=""><span class="tiny muted">Logo ajouté par la gérance dans son portail (Ma société).</span></div>` : ''}
        <label class="field full">Adresse<textarea name="adresse" style="min-height:56px" placeholder="rue, n°, code postal, ville">${cl.adresse}</textarea></label>
        <label class="field">RCS<input name="rcs" value="${cl.rcs || ''}" placeholder="B123456" autocapitalize="characters"></label>
        <label class="field">N° TVA<input name="tvaNum" value="${cl.tvaNum}" placeholder="LU12345678" autocapitalize="characters"></label>
        <div class="section-label full" style="margin:4px 0 0">🏦 Banque de la gérance</div>
        <label class="field">Nom de la banque<input name="banque" required value="${cl.banque || ''}" placeholder="ex. POST Luxembourg, Spuerkeess…"></label>
        <label class="field">Code BIC / SWIFT<input name="bic" required value="${cl.bic || ''}" placeholder="ex. CCPLLULL" autocomplete="off" autocapitalize="characters" maxlength="14" data-input="bank-chk"><span class="bank-msg tiny" data-for="bic"></span></label>
        <label class="field full">IBAN<input name="iban" required value="${ibanFmt(cl.iban || '')}" placeholder="LU.. .... .... .... ...." autocomplete="off" autocapitalize="characters" maxlength="42" data-input="bank-chk"><span class="bank-msg tiny" data-for="iban"></span></label>`; })()}
        <label class="field">Email<input type="email" name="email" value="${o.email || ''}"></label>
        <label class="field">Téléphone<input type="tel" name="phone" value="${o.phone || ''}"></label>
        ${id ? '' : html`<div class="section-label full" style="margin:6px 0 0">⭐ Responsable de la gérance</div>
        <label class="field">Prénom<input name="rprenom" required autocomplete="off"></label>
        <label class="field">Nom<input name="rnom" required autocomplete="off"></label>
        <label class="field">Email<input type="email" name="remail" required></label>
        <label class="field">Téléphone (WhatsApp)<input type="tel" name="rphone" placeholder="+352…"></label>
        <p class="tiny muted full" style="margin:-4px 0 0">Il reçoit un lien d’invitation (14 jours), choisit son mot de passe et ajoute lui-même ses collaborateurs dans son portail.</p>`}
        ${(() => { const cl = factClient(id || '', o.name), c = factConf(); return html`<details class="full"><summary class="section-label" style="cursor:pointer">🧾 TVA sur vos factures (régime, pays)</summary><div class="fields" style="margin-top:8px">
        <label class="field">Pays (code)<input name="pays" value="${cl.pays}" maxlength="2" placeholder="LU" style="text-transform:uppercase"></label>
        <label class="field full">Régime de TVA<select name="regime">${Object.entries(TVA_REG).map(([k, v]) => html`<option value="${k}" ${cl.regime === k ? new Raw('selected') : ''}>${k === 'normal' ? `TVA normale (${String(c.taux).replace('.', ',')} %)` : v[0]}</option>`)}</select></label>
        <label class="field">Taux particulier (%)<input name="taux" type="number" step="0.01" min="0" max="100" inputmode="decimal" value="${cl.taux}" placeholder="si « Taux particulier »"></label>
        <label class="field">Mention sur la facture<input name="mention" value="${cl.mention}" placeholder="sinon la mention par défaut"></label>
        <p class="tiny muted full" style="margin:0">Autoliquidation : client assujetti d’un autre pays de l’UE, avec son n° TVA (0 %, mention art. 196). Travaux sur un immeuble au Luxembourg : en principe TVA luxembourgeoise. Vérifiez avec votre comptable.</p></div></details>`; })()}
      </form>`,
      foot: html`<button class="btn" data-action="close-sheet">Annuler</button><button class="btn primary" type="submit" form="gerForm">${id ? 'Enregistrer' : 'Créer la gérance'}</button>`,
    };
  },
  ger({ id, tab }) {
    const d = ui.ptl.data, o = ptlOrg(id);
    if (!d || !o) return null;
    tab = tab || 'acces';
    const tabs = html`<div class="tabs" role="tablist" style="margin-bottom:12px">
      <button class="tab" role="tab" aria-selected="${tab === 'acces'}" data-action="ger-open" data-id="${id}" data-tab="acces">${icon('users')} Accès</button>
      <button class="tab" role="tab" aria-selected="${tab === 'fact'}" data-action="ger-open" data-id="${id}" data-tab="fact">🧾 Facturation</button></div>`;
    if (tab === 'res') tab = 'acces'; // les résidences sont créées par la gérance dans son portail
    let body;
    if (tab === 'fact') {
      // liste des chantiers de la gérance : ouverts, en cours, fermés, contentieux (les montants, remises, TVA : Réglages + Comptabilité)
      const all = (ui.ptl.orgT && ui.ptl.orgT.id === id ? ui.ptl.orgT.list : null);
      if (!all) { ptlOrgTickets(id); body = html`<p class="muted">Chargement…</p>`; }
      else {
        const tache = (t) => vault.list('taches').find((x) => x.ptl && x.ptl.tid === t.id);
        const fOf = (t) => { const x = tache(t); return x && x.facture ? x.facture : null; };
        const cont = all.filter((t) => t.inv_cont && !t.inv_paid);
        const open = all.filter((t) => ['recue', 'prise', 'planifiee'].includes(t.status));
        const cours = all.filter((t) => t.status === 'encours');
        const done = all.filter((t) => t.status === 'terminee' && !(t.inv_cont && !t.inv_paid));
        const st = (t) => { const f = fOf(t); return t.inv_no ? (t.inv_paid ? html`<span class="badge ok">✅ payée</span>` : t.inv_cont ? html`<span class="badge cont-blink">⚠️ CONTENTIEUX</span>` : html`<span class="badge warn">⏳ à payer</span>`) : t.status === 'terminee' ? html`<span class="badge">${f ? 'facturée' : '🟡 à facturer'}</span>` : html`<span class="badge">${PTL_ST[t.status] || t.status}</span>`; };
        const line = (t) => { const x = tache(t); return html`<button class="row" data-action="${x && (x.facture || t.status === 'terminee') ? 'fact-open' : 'ger-ticket'}" data-id="${x && (x.facture || t.status === 'terminee') ? x.id : t.id}">
          <span class="grow"><span class="title" style="display:block;white-space:normal">#${t.ref} · ${t.categorie || 'Intervention'}${t.inv_no ? html` <span class="muted small">· ${t.inv_no}</span>` : ''}</span>
          <span class="meta" style="white-space:normal">📍 ${t.residence_name}${t.lieu ? ' — ' + t.lieu : ''} · ${ptlTime(t.done_at || t.created_at)}</span></span>
          <span style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">${t.inv_ttc ? html`<b>${eur(t.inv_ttc)}</b>` : ''}${st(t)}</span></button>`; };
        const grp = (title, list, cls = '') => list.length ? html`<div class="section-label ${cls}">${title} (${list.length})</div><div class="list" style="margin-bottom:14px">${list.map(line)}</div>` : '';
        const due = sum(all.filter((t) => t.inv_no && !t.inv_paid), (t) => +t.inv_ttc || 0), dueC = sum(cont, (t) => +t.inv_ttc || 0);
        body = html`<div class="metrics" style="margin-bottom:14px">
            <div class="metric"><div class="lbl">Ouverts / en cours</div><div class="val">${open.length + cours.length}</div></div>
            <div class="metric"><div class="lbl">À encaisser</div><div class="val red">${eur(due)}</div></div>
            <div class="metric ${cont.length ? 'cont-blink-box' : ''}"><div class="lbl">⚠️ Contentieux</div><div class="val ${cont.length ? 'red' : ''}">${cont.length ? eur(dueC) : '—'}</div></div></div>
          ${grp('⚠️ CONTENTIEUX — impayés en litige', cont, 'cont-blink')}
          ${grp('🟠 Ouverts', open)}
          ${grp('🔵 En cours', cours)}
          ${grp('✅ Fermés', done)}
          ${all.length ? '' : html`<p class="muted small">Aucune demande de cette gérance pour l’instant.</p>`}
          <p class="tiny muted" style="margin-top:6px">Montants, TVA, remises, acomptes : réglés dans <b>Réglages → 🧾 Facturation</b> et dans chaque facture (<b>Comptabilité → Factures</b>). Données de facturation de la gérance : <a href="#" data-action="ger-edit" data-id="${id}">✏️ Modifier la gérance</a>.</p>`;
      }
    } else
    if (tab === 'res') {
      const rs = d.residences.filter((r) => r.org_id === id);
      body = html`${rs.length ? html`<div class="list" style="margin-bottom:14px">${rs.map((r) => html`<div class="row"><span class="avatar">🏠</span>
          <span class="grow"><span class="title" style="display:block">${r.name}</span><span class="meta" style="white-space:normal">${r.address || ''}${r.apartments ? html` · <span>${r.apartments} appartements</span>` : ''}${r.open ? html` · <span>${r.open} demande(s) en cours</span>` : ''}</span></span>
          <button class="btn sm ghost danger" data-action="ger-res-off" data-id="${r.id}" data-org="${id}">Retirer</button></div>`)}</div>` : html`<p class="muted small">Aucune résidence. La gérance peut aussi les ajouter elle-même dans son portail.</p>`}
        <div class="section-label">Ajouter une résidence</div>
        <form data-form="ger-res" class="fields">
          <input type="hidden" name="org" value="${id}">
          <label class="field full">Nom de la résidence<input name="name" required placeholder="ex. Résidence Les Tilleuls"></label>
          <label class="field full">Adresse<input name="address" required placeholder="rue, n°, code postal, localité"></label>
          <label class="field">Appartements<input type="number" name="apartments" min="0" inputmode="numeric"></label>
          <label class="field">Contact sur place<input name="contact_name" placeholder="concierge…"></label>
          <button class="btn primary full" type="submit">${icon('plus')} Ajouter la résidence</button>
        </form>`;
    } else {
      // le responsable (créé par LuxInterventions) en premier, puis les collègues qu'il a ajoutés dans son portail
      const us = d.users.filter((u) => u.org_id === id).sort((a, b) => (a.role === 'gerance_admin' ? 0 : 1) - (b.role === 'gerance_admin' ? 0 : 1) || a.name.localeCompare(b.name));
      const hasResp = us.some((u) => u.role === 'gerance_admin' && u.active);
      const cl = factClient(id, o.name);
      const uRow = (u) => html`<div class="card ger-u${u.active ? '' : ' off'}" style="margin-bottom:10px;padding:12px">
          <div style="display:flex;gap:10px;align-items:flex-start"><span class="avatar">${(u.name || '?').split(/\s+/).map((x) => x[0]).join('').slice(0, 2).toUpperCase()}</span>
          <span class="grow"><b style="display:block">${u.name} <span class="badge ${u.role === 'gerance_admin' ? 'accent' : ''}">${u.role === 'gerance_admin' ? '⭐ Responsable' : 'Collaborateur'}</span></b>
            ${u.title ? html`<span class="meta" style="display:block">${u.title}</span>` : ''}
            <span class="meta" style="display:block">✉️ <a href="mailto:${u.email}">${u.email}</a>${u.phone ? html` · 📞 <a href="tel:${u.phone.replace(/[^\d+]/g, '')}">${u.phone}</a>` : ''}</span>
            <span class="meta" style="display:block;white-space:normal">${!u.active ? html`<span class="red">⛔ désactivé</span>` : !u.has_password ? html`<span>${u.invite_expires > Date.now() ? `✉️ invitation envoyée, valable jusqu’au ${fmtDate(new Date(u.invite_expires).toISOString().slice(0, 10))}` : '⚠️ invitation expirée : créez un nouveau lien'}</span>` : u.last_login ? html`✅ <span>dernière connexion</span> ${fmtDateTime(u.last_login)}` : '✅ accès activé'}</span></span></div>
          <div class="actions" style="margin:10px 0 0;flex-wrap:wrap">
            ${u.active ? html`<button class="btn sm" data-action="ger-inv" data-id="${u.id}" data-org="${id}">${u.has_password ? '🔑 Nouvel accès' : '🔗 Lien d’invitation'}</button>` : ''}
            <button class="btn sm ghost ${u.active ? 'danger' : ''}" data-action="ger-user-toggle" data-id="${u.id}" data-org="${id}" data-on="${u.active ? 1 : 0}">${u.active ? 'Désactiver' : 'Réactiver'}</button></div></div>`;
      body = html`<div class="card" style="margin-bottom:12px;padding:12px">
          <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><b>${o.logo ? html`<img class="org-logo xl" src="${o.logo}" alt="">` : '🏢 '}${o.name}</b><button class="btn sm ghost" data-action="ger-edit" data-id="${id}">${icon('edit')} Modifier</button></div>
          <dl class="kv small" style="margin:6px 0 0">${cl.adresse ? html`<dt>Adresse</dt><dd style="white-space:pre-line">${cl.adresse}</dd>` : ''}${cl.rcs ? html`<dt>RCS</dt><dd>${cl.rcs}</dd>` : ''}${cl.tvaNum ? html`<dt>N° TVA</dt><dd>${cl.tvaNum}</dd>` : ''}${cl.iban ? html`<dt>Banque</dt><dd>${[cl.banque, cl.bic ? 'BIC ' + cl.bic : '', ibanFmt(cl.iban)].filter(Boolean).join(' · ')}</dd>` : ''}${o.email ? html`<dt>Email</dt><dd>${o.email}</dd>` : ''}${o.phone ? html`<dt>Téléphone</dt><dd>${o.phone}</dd>` : ''}</dl>
          ${orgMissing(cl).length ? html`<p class="tiny amber" style="margin:6px 0 0">⚠️ À compléter : ${orgMissing(cl).join(', ')} → ✏️ Modifier <span class="muted">(la gérance peut aussi les compléter dans son portail)</span></p>` : ''}</div>
        ${us.length ? html`<div class="section-label">Responsable et collaborateurs (${us.length})</div>${us.map(uRow)}<p class="tiny muted" style="margin:0 0 12px">Les collaborateurs sont ajoutés par le responsable dans son portail (Équipe). 🔑 Nouvel accès = nouveau lien si quelqu’un a oublié son mot de passe.</p>` : ''}
        ${hasResp ? '' : html`<div class="section-label">⭐ Responsable de la gérance</div>
        <p class="small muted" style="margin:0 0 8px">Il reçoit un lien personnel, choisit son mot de passe, puis ajoute lui-même ses collaborateurs.</p>
        <form data-form="ger-user" class="fields">
          <input type="hidden" name="org" value="${id}"><input type="hidden" name="role" value="gerance_admin">
          <label class="field">Prénom<input name="prenom" required autocomplete="off"></label>
          <label class="field">Nom<input name="nom" required autocomplete="off"></label>
          <label class="field">Email<input type="email" name="email" required></label>
          <label class="field">Téléphone (WhatsApp)<input type="tel" name="phone" placeholder="+352…"></label>
          <button class="btn primary full" type="submit">${icon('plus')} Créer l’accès du responsable et le lien</button>
        </form>`}`;
    }
    return {
      title: '🏢 ' + o.name,
      body: html`${tabs}${body}`,
      foot: html`<button class="btn ghost danger" data-action="ger-del" data-id="${id}">${icon('trash')} Supprimer la gérance</button><button class="btn primary" data-action="close-sheet">Fermer</button>`,
    };
  },
  'ger-invite'({ id, preset }) {
    const d = ui.ptl.data, u = d && d.users.find((x) => x.id === id), link = ui.ptl.inv[id];
    if (!u || !link) return null;
    const lang = preset && preset.lang || 'fr';
    const t = PTL_INVITE[lang] || PTL_INVITE.fr, first = u.name.split(' ')[0], msg = t.text(first, link), enc = encodeURIComponent(msg), encWa = encodeURIComponent(t.wa(first, link));
    const tel = (u.phone || '').replace(/[^\d+]/g, '').replace(/^00/, '+');
    return {
      title: 'Invitation au Portail gérance',
      narrow: true,
      body: html`<p style="margin-top:0">Lien personnel pour <b>${u.name}</b> (${u.email}) : il/elle ouvre le lien et choisit son mot de passe. <b>Valable 14 jours</b>, une seule fois.</p>
        <p class="tiny muted" style="margin:-6px 0 10px">Rouvrir cette fenêtre redonne <b>le même lien</b> (aperçu, autre langue…) : celui déjà envoyé reste bon.</p>
        <div class="qr" style="max-width:190px;margin:0 auto 10px">${qrSvg(link, 5)}</div>
        <div class="lang-mini" data-notr="1" role="group" aria-label="Langue">${['fr', 'de', 'en', 'it', 'pt', 'es'].map((k) => html`<button type="button" data-action="ger-inv-lang" data-id="${id}" data-l="${k}" aria-pressed="${lang === k}">${k.toUpperCase()}</button>`)}</div>
        <p class="tiny muted" style="margin:0 0 10px">Langue du message d’invitation.</p>
        <details class="inv-prev" style="margin:0 0 12px"><summary class="small"><b>👁 Aperçu de l’invitation</b></summary><div class="inv-card" data-notr="1">${new Raw(t.html(first, link))}</div></details>
        <div class="actions" style="flex-direction:column">
          <button class="btn primary" data-action="ger-inv-html" data-id="${id}" data-l="${lang}">✨ Copier l’invitation mise en forme</button>
          <p class="tiny muted" style="margin:-4px 0 4px;text-align:center">Puis « Envoyer par email » et collez (⌘V / Ctrl+V) à la place du texte : couleurs, gras et bouton orange.</p>
          ${tel ? html`<a class="btn" href="https://wa.me/${tel.replace(/^\+/, '')}?text=${encWa}" target="_blank" rel="noopener">${icon('msg')} Envoyer par WhatsApp</a><a class="btn" href="sms:${tel}?&body=${enc}">${icon('msg')} Envoyer par SMS</a>` : ''}
          <a class="btn" href="mailto:${u.email}?subject=${encodeURIComponent(t.subject)}&body=${enc}">${icon('mail')} Envoyer par email</a>
          <button class="btn" data-action="ger-inv-copy" data-id="${id}">${icon('file')} Copier le lien</button>
        </div>`,
      foot: html`<button class="btn primary" data-action="ger-open" data-id="${u.org_id}">OK</button>`,
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
  'interv-form'({ id }) {
    const i = id ? vault.get('intervenants', id) : { metier: '', genre: 'interne', cat: 'quotidien' };
    if (id && !i) return null;
    const sel = (name, opts, cur) => html`<select name="${name}">${Object.entries(opts).map(([k, v]) => html`<option value="${k}" ${cur === k ? new Raw('selected') : ''}>${v}</option>`)}</select>`;
    return {
      title: id ? 'Modifier la fiche' : 'Nouvelle personne',
      body: html`<form id="f" data-form="interv" class="fields">
        <input type="hidden" name="id" value="${id || ''}">
        ${photoField(i, metIcon(i))}
        <label class="field">Type<select name="genre" data-input="interv-kind">${Object.entries(INT_GENRES).map(([k, v]) => html`<option value="${k}" ${(i.genre || 'interne') === k ? new Raw('selected') : ''}>${v}</option>`)}</select></label>
        <label class="field">Catégorie<select name="cat" data-input="interv-kind">${Object.entries(INT_CATS).map(([k, v]) => html`<option value="${k}" ${(i.cat || 'quotidien') === k ? new Raw('selected') : ''}>${v}</option>`)}</select></label>
        ${field('Prénom', 'prenom', i.prenom, { attrs: 'autocomplete="off"' })}
        ${field('Nom (ou nom de la société)', 'nom', i.nom, { required: true, placeholder: 'ex. Rossi, Électricité Schmit…', attrs: 'autocomplete="off"' })}
        <label class="field">Métier / mansion<select name="metier" required data-input="interv-kind"><option value="">— à choisir —</option>${Object.entries(METIERS).map(([k, v]) => html`<option value="${k}" ${i.metier === k ? new Raw('selected') : ''}>${v}</option>`)}</select></label>
        ${tarifBox(i)}
        ${field('Adresse', 'adresse', i.adresse, { full: true, attrs: 'autocomplete="off"' })}
        ${field('Code postal et ville', 'ville', i.ville, { placeholder: 'L-1234 Luxembourg' })}
        ${field('Téléphone', 'tel', i.tel, { type: 'tel', placeholder: '+352 …' })}
        ${field('Email', 'mail', i.mail, { type: 'email', full: true })}
        <label class="field soc-only" ${(i.genre || 'interne') === 'societe' ? '' : new Raw('hidden')}>RCS (société)<input name="rcs" value="${i.rcs || ''}" placeholder="ex. B123456"></label>
        <label class="field soc-only" ${(i.genre || 'interne') === 'societe' ? '' : new Raw('hidden')}>N° TVA (société)<input name="tva" value="${i.tva || ''}" placeholder="ex. LU12345678"></label>
        ${engForm(i)}
        <label class="field full">Notes<textarea name="note" placeholder="Clés confiées, disponibilités…">${i.note || ''}</textarea></label>
      </form>`,
      foot: html`${id ? html`<button class="btn ghost danger" data-action="del-interv" data-id="${id}" aria-label="Supprimer">${icon('trash')}</button>` : ''}
        <button class="btn" data-action="close-sheet">Annuler</button><button class="btn primary" type="submit" form="f">Enregistrer</button>`,
    };
  },
  'fact-set'() {
    const c = factConf();
    return {
      title: '🧾 Facturation des interventions',
      body: html`<form id="f" data-form="fact-set" class="fields">
        <p class="small muted full" style="margin:0">Émetteur des factures envoyées aux gérances (marque LuxInterventions). Les factures des loyers (NOBIS s.a.r.l.) ne changent pas.</p>
        ${field('Raison sociale', 'nom', c.nom, { required: true })}${field('Marque', 'marque', c.marque)}
        ${field('Adresse', 'adresse', c.adresse, { required: true })}${field('Code postal et ville', 'ville', c.ville, { required: true })}
        ${field('RCS', 'rcs', c.rcs, { required: true })}${field('N° TVA', 'tva', c.tva, { required: true })}
        ${field('Téléphone', 'tel', c.tel)}${field('Email', 'email', c.email, { type: 'email' })}
        ${field('N° d’autorisation d’établissement', 'autorisation', c.autorisation || '', { placeholder: 'imprimé sur les devis et factures' })}
        <label class="field full">IBAN (compte d’ARES INVEST S.A.)<input name="iban" value="${c.iban}" required placeholder="LU.. .... .... .... ...." autocomplete="off" autocapitalize="characters" maxlength="42" data-input="bank-chk"><span class="bank-msg tiny" data-for="iban"></span></label>
        <label class="field">Code BIC / SWIFT<input name="bic" value="${c.bic}" required placeholder="ex. CCPLLULL (POST Luxembourg)" autocomplete="off" autocapitalize="characters" maxlength="14" data-input="bank-chk"><span class="bank-msg tiny" data-for="bic"></span></label>
        ${field('Banque', 'banque', c.banque, { placeholder: 'ex. POST Luxembourg' })}
        <p class="tiny muted full" style="margin:-6px 0 0">Le BIC (8 ou 11 caractères) est proposé tout seul pour un IBAN luxembourgeois connu (POST : CCPLLULL, Spuerkeess : BCEELULL…). Il est imprimé sur la facture et dans le QR code de paiement.</p>
        <label class="field">TVA normale (%)<input name="taux" type="number" step="0.01" min="0" max="100" inputmode="decimal" value="${c.taux}" list="tvaRates" required></label>
        <datalist id="tvaRates">${[17, 16, 14, 8, 3, 0, 20, 21, 19, 22, 10, 5.5].map((r) => html`<option value="${r}"></option>`)}</datalist>
        <p class="tiny muted full" style="margin:-6px 0 0">Taux appliqué par défaut (17 % = taux normal au Luxembourg ; tout autre taux possible). Chaque client peut avoir son propre régime : Gérances → la gérance → 🧾 Facturation.</p>
        ${field('Paiement à (jours)', 'delai', c.delai, { type: 'number', attrs: 'min="0" max="120" inputmode="numeric"' })}
        ${sfx('Ma marge par défaut sur les ouvriers', 'marge', c.marge, '%', 'step="1" min="0" max="500" inputmode="decimal"')}
        <p class="tiny muted full" style="margin:-6px 0 0">Ex. 25 % : ouvrier payé 40 €/h → facturé 50 €/h à la gérance (si la fiche de l’ouvrier n’a pas de tarif « facturé à la gérance »). Modifiable dans chaque facture, avec remise ou majoration.</p>
        <p class="tiny muted full" style="margin:0">Taux de TVA à confirmer avec votre comptable. Prochain numéro : ${ymd(today())}-INT${String((+c.seq || 0) + 1).padStart(4, '0')} · prochain devis n° …-${String((+c.devSeq || 0) + 1).padStart(4, '0')}</p>
      </form>`,
      foot: html`<button class="btn" data-action="close-sheet">Annuler</button><button class="btn primary" type="submit" form="f">Enregistrer</button>`,
    };
  },
  facture({ id }) {
    const t = vault.get('taches', id);
    if (!t) return null;
    const c = factConf();
    if (t.facture) {
      const F = t.facture;
      return {
        title: `🧾 Facture ${F.no}`,
        body: html`${F.cont && !F.paid ? html`<div class="alert bad cont-blink-box" style="margin-bottom:10px">⚠️<div><b>CONTENTIEUX</b> depuis le ${fmtDate(F.cont)} — facture impayée en litige. La gérance le voit en rouge dans son portail.</div></div>` : ''}<dl class="kv">${kvRow('Intervention', `${t.ptl ? '#' + t.ptl.ref + ' · ' : ''}${t.titre}`)}${kvRow('Gérance', t.ptl ? t.ptl.org : '—')}${kvRow('Date', fmtDate(F.date))}${kvRow('Total HT', eur(F.ht))}${kvRow('TVA', eur(F.tva))}${kvRow('Total TTC', html`<b>${eur(F.ttc)}</b>`)}${kvRow('Paiement', F.paid ? `✅ payée le ${fmtDate(F.paid)}` : '⏳ à payer')}</dl>
          <p class="small muted">La gérance la voit et la télécharge dans son portail (Comptabilité et fiche de la demande).</p>`,
        foot: html`${F.docId ? html`<button class="btn" data-action="open-doc" data-id="${F.docId}">⬇️ PDF</button>` : ''}${F.paid ? '' : html`<button class="btn ${F.cont ? '' : 'danger'}" data-action="fact-cont" data-id="${id}">${F.cont ? '↩️ Sortir du contentieux' : '⚠️ Contentieux'}</button>`}<button class="btn ${F.paid ? '' : 'primary'}" data-action="fact-paid" data-id="${id}">${F.paid ? '↩️ Marquer à payer' : '✅ Marquer payée'}</button>`,
      };
    }
    const f = factDraft(t), miss = factMissing(c);
    const mats = [...(f.mat || [])]; while (mats.length < 3) mats.push({});
    return {
      title: `🧾 Facture — ${t.ptl ? '#' + t.ptl.ref + ' · ' : ''}${t.titre}`,
      body: html`<form id="f" data-form="facture" class="fields"><input type="hidden" name="id" value="${id}">
        ${miss.length ? html`<div class="full alert warn" style="margin:0">⚠️<div>Avant d’émettre : complétez ${miss.join(', ')} dans <a href="#" data-action="fact-set">🧾 Facturation</a>.</div></div>` : ''}
        <p class="small muted full" style="margin:0">Client : <b>${t.ptl ? t.ptl.org : '—'}</b> · émise par ${c.nom} (${c.marque}). Rien n’est envoyé avant « Émettre ».</p>
        ${field('Heures (réelles, arrondies au ¼ h)', 'h', f.h, { type: 'number', attrs: 'step="0.25" min="0" inputmode="decimal"' })}
        ${(() => { const w = vault.get('intervenants', t.intervenantId) || {}; return w.payeH || w.payeDepl ? html`<div class="full note small" style="margin:0"><input type="hidden" name="cost_h" value="${w.payeH || 0}"><input type="hidden" name="cost_d" value="${w.payeDepl || 0}">
          👷 Coût ${intervFull(w)} : <b>${eur(w.payeH || 0)}/h</b>${w.payeDepl ? html` · déplacement <b>${eur(w.payeDepl)}</b>` : ''}
          <div class="fact-adj" style="grid-template-columns:auto 90px auto;align-items:center;margin-top:6px"><span>Ma marge sur ses tarifs</span><span class="sfx"><input name="marge" type="number" step="1" min="-90" max="500" inputmode="decimal" value="${w.payeH && f.taux ? Math.round((num(f.taux) / w.payeH - 1) * 100) : num(factConf().marge)}" data-input="fact-marge"><i>%</i></span><span class="tiny muted">→ recalcule tarif et déplacement</span></div></div>` : ''; })()}
        ${sfx('Tarif facturé', 'taux', f.taux, '€/h HT')}
        ${sfx('Déplacement facturé', 'depl', f.depl, '€ HT')}
        <div class="full"><div class="section-label" style="margin:4px 0 6px">Matériel acheté en plus (HT)</div><div id="factMats">${mats.map((m, n) => matRow(n, m))}</div>
          <button type="button" class="btn sm" data-action="fact-mat-add">${icon('plus')} Ligne</button></div>
        <div class="full"><div class="section-label" style="margin:4px 0 6px">Remise / majoration (avant émission)</div>
          <div class="fact-adj"><select name="adj_type"><option value="remise" ${f.adj.type === 'remise' ? new Raw('selected') : ''}>Remise −</option><option value="maj" ${f.adj.type === 'maj' ? new Raw('selected') : ''}>Majoration +</option></select>
            <input name="adj_val" type="number" ${new Raw(money$)} value="${f.adj.val || ''}" placeholder="0" aria-label="Valeur"><select name="adj_mode"><option value="%" ${f.adj.mode === '%' ? new Raw('selected') : ''}>%</option><option value="€" ${f.adj.mode === '€' ? new Raw('selected') : ''}>€</option></select></div>
          <input name="adj_lib" value="${f.adj.lib || ''}" placeholder="Motif (ex. client fidèle, urgence de nuit)" style="margin-top:6px"></div>
        <div class="full"><div class="section-label" style="margin:4px 0 6px">TVA de cette facture</div>
          <select name="reg">${Object.entries(TVA_REG).map(([k, v]) => html`<option value="${k}" ${(f.reg || {}).regime === k ? new Raw('selected') : ''}>${k === 'normal' ? `TVA normale (${String(c.taux).replace('.', ',')} %)` : v[0]}</option>`)}</select>
          <div class="fact-adj" style="grid-template-columns:110px minmax(0,1fr);margin-top:6px"><input name="reg_taux" type="number" step="0.01" min="0" max="100" inputmode="decimal" value="${(f.reg || {}).taux || ''}" placeholder="% particulier" aria-label="Taux particulier"><input name="reg_mention" value="${(f.reg || {}).mention || ''}" placeholder="Mention légale sur la facture (sinon celle par défaut)"></div>
          <p class="tiny muted" style="margin:4px 0 0">Par défaut : le régime du client (Gérances → la gérance → 🧾 Facturation). Travaux sur un immeuble situé au Luxembourg : la TVA luxembourgeoise s’applique en principe, même pour un client étranger — à confirmer avec votre comptable.</p></div>
        <div class="full" id="factTot">${factTotHtml(f)}</div>
      </form>`,
      foot: html`<button class="btn" type="submit" form="f">Enregistrer le brouillon</button><button class="btn primary" data-action="fact-emit" data-id="${id}" ${miss.length ? new Raw('disabled') : ''}>🧾 Émettre et envoyer</button>`,
    };
  },
  // routine de chaque semaine (salariés : ménage, contrôles), avec la semaine en dates
  'hor-std'({ id }) {
    const i = vault.get('intervenants', id);
    if (!i) return null;
    const wk = mondayOf(today());
    return {
      title: `🔁 Routine · ${intervFull(i)}`,
      body: html`<form id="f" data-form="hor-std" class="fields"><input type="hidden" name="id" value="${id}">
        <p class="small muted full" style="margin:0">Se répète chaque semaine (ménage, contrôles…). Une semaine différente : 📅 Planning par semaine. Un dégât signalé : 📌 Affectation.</p>
        <label class="field">Semaine du (date)<input type="date" name="hwk" value="${today()}" data-input="hor-wk"></label>
        ${horWeekEditor((j) => hors(i).filter((h) => h.j === j), (j) => `${SEMAINE[j]} ${frD(addDays(wk, j))}`)}
      </form>`,
      foot: html`<button class="btn" data-action="close-sheet">Annuler</button><button class="btn primary" type="submit" form="f">Enregistrer la routine</button>`,
    };
  },
  'plan-week'({ id, preset }) {
    const i = vault.get('intervenants', id);
    if (!i) return null;
    const mon = preset;
    return {
      title: `📅 ${intervFull(i)} · semaine du ${dayShort(mon)}`,
      body: html`<form id="f" data-form="plan-week" class="fields"><input type="hidden" name="id" value="${id}"><input type="hidden" name="mon" value="${mon}">
        <p class="small muted full" style="margin:0">Chaque jour avec sa date. Ce qui est déjà rempli vient de l’horaire habituel : changez, ajoutez ou videz (jour non travaillé).</p>
        ${horWeekEditor((j) => horsOn(i, addDays(mon, j)), (j) => `${SEMAINE[j]} ${dayShort(addDays(mon, j))}`)}
        <label class="field full">Recopier ce planning aussi sur<select name="copy"><option value="0">cette semaine seulement</option>${[1, 2, 3, 4, 6, 8, 12].map((n) => html`<option value="${n}">+ ${n} semaine${n > 1 ? 's' : ''} suivante${n > 1 ? 's' : ''} (jusqu’au ${dayShort(addDays(mon, n * 7 + 6))})</option>`)}</select></label>
      </form>`,
      foot: html`<button class="btn" data-action="close-sheet">Annuler</button><button class="btn primary" type="submit" form="f">Enregistrer la semaine</button>`,
    };
  },
  'eq-feed'() {
    return { title: 'Activité de l’équipe', body: html`${eqTodayHtml()}${eqFeedHtml('', 150)}`, foot: html`<button class="btn primary" data-action="close-sheet">OK</button>` };
  },
  // Travail daté d'une personne (hors horaire habituel) : en retard, aujourd'hui, à venir
  // Fiche d'une personne : infos · horaire et heures du mois · absences (maladie avec certificat, congés…)
  interv({ id, tab }) {
    const i = vault.get('intervenants', id);
    if (!i) return null;
    const jobs = vault.list('taches').filter((t) => t.intervenantId === id && !t.recur && t.statut !== 'fait' && t.date).sort((a, b) => (a.date + (a.heure || '')).localeCompare(b.date + (b.heure || '')));
    const jobBtn = html`<button class="btn primary block" data-action="interv-aff" data-id="${id}" style="margin-bottom:8px">📌 Affectation (demandes d’intervention)</button><button class="btn block" data-action="interv-job" data-id="${id}" style="margin-bottom:12px">📅 Autre travail (sans demande)</button>`;
    const jobList = html`<div class="section-label">📅 Travail prévu (avec date)</div>
      ${jobs.length ? html`<div class="list small">${jobs.map((t) => html`<button class="row${t.urgent ? ' u-urgent' : ''}" data-action="edit-tache" data-id="${t.id}"><span class="grow"><span class="title" style="display:block">${t.urgent ? '🔴 ' : ''}${t.titre}</span><span class="meta">${placeName(t)}</span></span><span class="meta" style="text-align:right">${t.date < today() ? html`<b style="color:var(--red)">${fmtDate(t.date)}</b>` : fmtDate(t.date)}${t.heure ? html`<br>🕒 ${t.heure}${t.heureFin ? '–' + t.heureFin : ''}` : ''}</span></button>`)}</div>` : html`<p class="small muted">Rien de prévu en plus de l’horaire habituel.</p>`}`;
    tab = tab || 'fiche';
    const t0 = today();
    const cur = absOn(i, t0);
    const tel = (i.tel || '').replace(/[^\d+]/g, '');
    let body;
    if (tab === 'fiche') {
      const tasks = vault.list('taches').filter((t) => t.intervenantId === id && (t.recur || t.statut !== 'fait'));
      body = html`${jobBtn}${cur ? html`<div class="alert ${cur.type === 'maladie' ? 'bad' : 'warn'}" style="margin-bottom:12px">${icon('calendar')}<div><b>${ABS_TYPES[cur.type]}</b> ${cur.fin ? 'jusqu’au ' + fmtDate(cur.fin) : '(fin non connue)'}${tasks.length ? html` · <b>${plural(tasks.length, 'intervention')}</b> à réassigner si besoin` : ''}</div></div>` : ''}
        <dl class="kv">
          ${kvRow('Type', INT_GENRES[i.genre || 'interne'])}
          ${kvRow('Catégorie', INT_CATS[i.cat || 'quotidien'])}
          ${kvRow('Métier', METIERS[i.metier] || i.metier || '—')}
          ${(i.evals || []).length ? kvRow('Avis des locataires', `${MEN_EVAL[Math.round(sum(i.evals, (e) => e.v) / i.evals.length)]} · ${(sum(i.evals, (e) => e.v) / i.evals.length).toFixed(1).replace('.', ',')} / 4 (${plural(i.evals.length, 'avis')})`) : ''}
          ${i.tarif ? kvRow('Tarif', i.tarif) : ''}
          ${i.adresse || i.ville ? kvRow('Adresse', [i.adresse, i.ville].filter(Boolean).join(', ')) : ''}
          ${i.tel ? kvRow('Téléphone', html`<a href="tel:${tel}">${i.tel}</a>`) : ''}
          ${i.mail ? kvRow('Email', html`<a href="mailto:${i.mail}">${i.mail}</a>`) : ''}
          ${i.rcs ? kvRow('RCS', i.rcs) : ''}${i.tva ? kvRow('N° TVA', i.tva) : ''}
          ${i.assurTodo ? kvRow('Assurance RC', html`<span class="badge warn">🛡️ à faire</span> pas encore fournie${i.assur || i.police ? ' — ' + [i.assur, i.police].filter(Boolean).join(' · ') : ''} (rappel dans son app)`) : i.assur || i.police ? kvRow('Assurance RC', [i.assur, i.police ? 'police n° ' + i.police : ''].filter(Boolean).join(' — ')) : ''}${i.iban ? kvRow('Banque', [i.banque, i.bic ? 'BIC ' + i.bic : '', ibanFmt(i.iban)].filter(Boolean).join(' · ')) : ''}
          ${i.cash ? kvRow('Paiement', '💵 cash (en espèces)') : ''}
          ${i.payeH ? kvRow('Payé', `${eur(i.payeH)} / heure${i.payeDepl ? ' · déplacement ' + eur(i.payeDepl) : ''}`) : ''}
        </dl>
        ${(i.genre || 'interne') !== 'interne' ? (() => {
          const done = vault.list('taches').filter((t) => t.intervenantId === id && !t.recur && (t.statut === 'fait' || t.fini)).sort((a, b) => (b.doneDate || b.date || '').localeCompare(a.doneDate || a.date || ''));
          return html`<div class="section-label">📝 Engagement</div>
          ${i.genre === 'prive' ? html`<div class="alert ${i.sign ? 'info' : 'warn'}" style="margin-bottom:8px">${i.sign ? '✍️' : '⚠️'}<div>${i.sign ? html`Fiche signée le <b>${fmtDateTime(Date.parse(i.signAt) || 0)}</b>` : html`<b>Pas encore signée</b> — il la signe dans son app (onglet 📱 App → lui envoyer le lien), rubrique « ✍️ Ma fiche d’engagement »`}</div></div>` : ''}
          <button class="btn block" data-action="eng-pdf" data-id="${id}" style="margin-bottom:12px">📄 Fiche d’engagement (PDF)</button>
          ${i.genre === 'prive' ? html`<div class="section-label">🧾 Interventions occasionnelles (ses notes à payer)</div>
          ${done.length ? html`<div class="list small">${done.map((t) => html`<div class="row"><span class="grow"><span class="title" style="display:block">${t.titre}</span><span class="meta">${placeName(t)} · ${fmtDate(t.doneDate || (t.fini && t.fini.d) || t.date)}${t.occ ? html` · <b>${t.occ.no}</b> · ${eur(t.occ.tot)}${t.occ.cash ? ' · 💵 cash' : ''}` : ''}</span></span>
            ${t.occ ? html`<button class="btn sm" data-action="occ-dl" data-id="${t.id}">⬇️ PDF</button>` : ''}<button class="btn sm ${t.occ ? 'ghost' : 'primary'}" data-action="occ-open" data-id="${t.id}">${t.occ ? '✏️' : '🧾 Faire la note'}</button></div>`)}</div>` : html`<p class="small muted">Aucun travail terminé pour l’instant.</p>`}` : ''}`;
        })() : ''}
        ${(() => { const cm = (i.evals || []).filter((e) => (e.tags || []).length || e.note).slice(-8).reverse(); return cm.length ? html`<div class="section-label">Commentaires des locataires</div><div class="list small">${cm.map((e) => html`<div class="row"><span class="grow" style="white-space:normal"><span class="meta" style="display:block">${fmtDate(e.d)} · ${(vault.get('locataires', e.locId) && fullName(vault.get('locataires', e.locId))) || '—'}</span><b>${MEN_EVAL[e.v] || ''}</b>${(e.tags || []).map((k) => html` · <span>${MEN_TAGS[k] || k}</span>`)}${e.note ? html`<span style="display:block">« ${e.note} »</span>` : ''}</span></div>`)}</div>` : ''; })()}
        ${i.note ? html`<p class="small" style="white-space:pre-wrap">${i.note}</p>` : ''}
        ${tasks.length ? html`<div class="section-label">Interventions en cours</div><div class="list small">${tasks.map((t) => html`<button class="row" data-action="edit-tache" data-id="${t.id}"><span class="grow"><span class="title" style="display:block">${t.titre}</span><span class="meta">${placeName(t)} · ${t.recur ? 'récurrent' : fmtDate(t.date)}</span></span></button>`)}</div>` : ''}`;
    } else if (tab === 'heures') {
      const d = new Date();
      const months = [0, 1, 2].map((k) => { const x = new Date(d.getFullYear(), d.getMonth() - k, 1); return [x.getFullYear(), x.getMonth() + 1]; });
      const hs = hors(i).slice().sort((a, b) => a.j - b.j || (a.de || '').localeCompare(b.de || ''));
      const mon = ui.planWk && ui.planWk[id] ? ui.planWk[id] : mondayOf(today());
      const wkDays = [0, 1, 2, 3, 4, 5, 6].map((j) => addDays(mon, j));
      const planHtml = html`<div class="section-label">📅 Planning par semaine (avec les dates)</div>
        <div class="card" style="padding:10px 12px;margin-bottom:12px">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px"><button class="btn sm" data-action="plan-wk" data-id="${id}" data-d="-7" aria-label="Semaine précédente">◀</button>
            <b class="grow" style="text-align:center">Semaine du ${dayShort(wkDays[0])} au ${dayShort(wkDays[6])}${mon === mondayOf(today()) ? ' · cette semaine' : ''}</b>
            <button class="btn sm" data-action="plan-wk" data-id="${id}" data-d="7" aria-label="Semaine suivante">▶</button></div>
          <div class="list small">${wkDays.map((iso, j) => { const hs = horsOn(i, iso), mod = i.plan && Array.isArray(i.plan[iso]), ab = absOn(i, iso), jb = vault.list('taches').filter((t) => t.intervenantId === id && !t.recur && t.date === iso && t.statut !== 'fait');
            return html`<div class="row${iso === today() ? ' is-today' : ''}"><span style="min-width:92px"><b>${SEMAINE[j]}</b><span class="meta" style="display:block">${dayShort(iso)}</span></span>
              <span class="grow">${ab ? html`<span class="badge ${ab.type === 'maladie' ? 'bad' : 'warn'}">${ABS_TYPES[ab.type] || ab.type}</span> ` : ''}${hs.length ? hs.map((h) => html`<span style="display:block">${HOR_P[horP(h)].split(' ')[0]} ${h.de}–${h.a}${h.immId ? ' · ' + immName(h.immId) : ''}</span>`) : html`<span class="muted">—</span>`}${jb.map((t) => html`<span style="display:block">🔧 ${t.titre}${t.heure ? ' · ' + t.heure : ''}</span>`)}</span>
              ${mod ? html`<span class="badge">modifié</span>` : ''}</div>`; })}</div>
          <div class="actions" style="margin-top:8px"><button class="btn primary" data-action="plan-edit" data-id="${id}" data-d="${mon}">✏️ Planifier cette semaine</button>
            ${wkDays.some((iso) => i.plan && i.plan[iso]) ? html`<button class="btn ghost" data-action="plan-reset" data-id="${id}" data-d="${mon}">↩️ Revenir à l’horaire habituel</button>` : ''}</div>
          <p class="tiny muted" style="margin:6px 0 0">Les jours sans modification suivent l’horaire habituel (plus bas). La personne voit ce planning, avec les dates, dans son app.</p></div>`;
      body = html`${jobBtn}${jobList}${horFixed(i) || hs.length ? html`${planHtml}<div class="section-label">🔁 Routine chaque semaine</div>
        <button class="btn block" data-action="hor-std" data-id="${id}" style="margin-bottom:8px">✏️ ${hs.length ? 'Modifier la routine' : 'Créer la routine (ménage, contrôles…)'}</button>
        ${hs.length ? html`<div class="list small">${hs.map((h) => html`<div class="row"><span class="grow"><b>${SEMAINE[h.j]}</b> <span>${HOR_P[horP(h)]}</span> ${h.de}–${h.a}${h.immId ? ' · ' + immName(h.immId) : ''}</span><span class="meta">${fmtH(dayHours({ horaires: [h] }, h.j))}</span></div>`)}</div>
          <p class="tiny muted">Total par semaine : <b>${fmtH([0, 1, 2, 3, 4, 5, 6].reduce((n, j) => n + dayHours(i, j), 0))}</b></p>` : html`<p class="small muted">Pas encore de routine.</p>`}` : html`<p class="small muted">Pas de routine pour cette personne : le jour, l’heure et le lieu se donnent à chaque travail (📌 Affectation / 📅 Autre travail).</p>`}
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
        const inv = inviteMsg('eq', e.lang, i.prenom || '', eqAppUrl(), e.code || '—', url, factConf().nom || 'ARES INVEST S.A.');
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
    // preset : immeuble (texte) ou demande d'une gérance ({ ptl, titre, note })
    const pz = preset && typeof preset === 'object' ? preset : null;
    const t = id ? vault.get('taches', id) : { type: 'reparation', immId: pz ? '' : preset || '', statut: 'afaire', date: today(), recur: '', ...(pz || {}) };
    // depuis la fiche d'une personne : elle est déjà choisie, il reste quoi, où, quel jour et à quelle heure
    if (id && !t) return null;
    const imms = vault.list('immeubles').filter((im) => !immGone(im) || im.id === t.immId).sort(byAddr);
    if (!imms.length && !t.ptl && !t.dev) return { title: 'Nouvelle intervention', body: empty('building', "Ajoutez d'abord un immeuble.") };
    const hint = t.metiers || [], fits = (i) => hint.includes(i.metier);
    const ints = vault.list('intervenants').filter((i) => !i.archive || i.id === t.intervenantId).sort((a, b) => fits(b) - fits(a) || intervFull(a).localeCompare(intervFull(b)));
    return {
      title: id ? "Modifier l'intervention" : 'Nouvelle intervention',
      body: html`<form id="f" data-form="tache" class="fields">
        <input type="hidden" name="id" value="${id || ''}">
        <label class="field">Type<select name="type">${Object.entries(TACHE_TYPES).map(([k, v]) => html`<option value="${k}" ${(t.type === 'entretien' ? 'reparation' : t.type) === k ? new Raw('selected') : ''}>${v}</option>`)}</select></label>
        ${field('Quoi ?', 'titre', t.titre, { required: true, placeholder: 'ex. Fuite robinet cuisine, nettoyage des communs' })}
        ${t.dev ? html`<div class="full ptl-box">📝 <b>Devis ${t.dev.no}</b> — ${t.dev.client}${t.dev.adr ? html`<br>📍 ${t.dev.adr}` : ''}${t.dev.contact ? html`<br>👤 ${t.dev.contact}${t.dev.tel ? ' · ' + t.dev.tel : ''}` : ''}
            <input type="hidden" name="dev" value="${JSON.stringify(t.dev)}"><input type="hidden" name="immId" value=""></div>`
          : t.ptl ? html`<div class="full ptl-box">${ptlPlace(t.ptl)}
            <input type="hidden" name="ptl" value="${JSON.stringify(t.ptl)}"><input type="hidden" name="immId" value=""></div>`
          : html`<label class="field">Immeuble<select name="immId" data-input="tache-imm" required>${imms.map((im) => html`<option value="${im.id}" ${im.id === t.immId ? new Raw('selected') : ''}>${im.adresse}</option>`)}</select></label>
        <label class="field">Où ?<select name="logId" id="tacheLog">${logOptions(t.immId || imms[0].id, t.logId)}</select></label>`}
        <label class="field full">Qui ?<select name="intervenantId"><option value="">— à choisir —</option>${Object.entries(INT_GENRES).map(([g, gl]) => { const grp = ints.filter((i) => (i.genre || 'interne') === g); return grp.length ? html`<optgroup label="${{ interne: '👷 ', societe: '🏢 ', prive: '🤝 ' }[g]}${gl}">${grp.map((i) => html`<option value="${i.id}" ${i.id === t.intervenantId ? new Raw('selected') : ''}>${fits(i) ? '⭐ ' : ''}${metIcon(i)} ${intervFull(i)} · ${METIERS[i.metier] || '?'}${absOn(i, t.date || today()) ? ' (absent)' : ''}${(t.refusBy || []).includes(i.id) ? ' (✋ a refusé)' : ''}</option>`)}</optgroup>` : ''; })}</select></label>
        ${hint.length ? html`<p class="tiny muted full" style="margin:-6px 0 0">⭐ = métier conseillé pour cette demande : ${[...new Set(hint)].map((m) => METIERS[m]).join(', ')}${ints.some(fits) ? '' : ' (personne de ce métier dans l’équipe)'}</p>` : ''}
        ${!ints.length ? html`<p class="tiny muted full" style="margin:0">Ajoutez vos intervenants dans Maintenance → Intervenants.</p>` : ''}
        ${field('Date', 'date', t.date, { type: 'date' })}
        <label class="field t-hours">Heure<span class="t-hrow"><span class="tph${t.heure ? ' v' : ''}"><input type="time" name="heure" value="${t.heure || ''}" aria-label="De"><i>--:--</i></span><span class="muted">→</span><span class="tph${t.heureFin ? ' v' : ''}"><input type="time" name="heureFin" value="${t.heureFin || ''}" aria-label="À"><i>--:--</i></span></span></label>
        <label class="full t-urg"><input type="checkbox" name="urgent" value="1" ${t.urgent ? new Raw('checked') : ''}> <span>🔴 <b>Urgent</b> — clignote en rouge dans l’app de la personne</span></label>
        <label class="field">Répétition<select name="recur">${Object.entries(RECURS).map(([k, v]) => html`<option value="${k}" ${(t.recur || '') === k ? new Raw('selected') : ''}>${v}</option>`)}</select></label>
        ${field("Jusqu'au (si répétition)", 'fin', t.fin, { type: 'date' })}
        ${field('Coût (€)', 'cout', t.cout, { type: 'number', attrs: money$ })}
        ${t.fini && t.statut !== 'fait' ? html`<div class="full alert ok" style="margin:0">✅<div><b>${intervFull(vault.get('intervenants', t.fini.by) || {})} a fini le travail</b> le ${fmtDate(t.fini.d)}${t.fini.h ? ' à ' + t.fini.h : ''}${t.fini.note ? html` — « ${t.fini.note} »` : ''}<br><span class="small">Vérifiez (photos après, travail fait), puis choisissez 🟢 <b>Terminée</b> pour clôturer le chantier.</span></div></div>` : ''}
        ${!t.recur ? html`<fieldset class="full st-radios"><legend>Statut</legend><div class="st-row">${Object.entries(STATUTS).map(([k, v]) => html`<label class="st-opt st-${k}"><input type="radio" name="statut" value="${k}" ${(t.statut || 'afaire') === k ? new Raw('checked') : ''}><span>${ST_DOT[k]} ${v}</span></label>`)}</div>
          <p class="tiny muted" style="margin:6px 0 0">🔴 <b>À faire</b> : pas encore organisé · 🟡 <b>Planifiée</b> : jour et personne fixés · 🟢 <b>Terminée</b> : chantier clôturé par le bureau</p></fieldset>` : ''}
        <label class="field full">Notes<textarea name="note" placeholder="Accès, clés, pièces à acheter, ce qui a été fait…">${t.note || ''}</textarea></label>
        ${(() => { const pb = t.id ? eqPhotos(t.id, 'pb') : [], np = (t.ptlPhotos || []).length; return html`<label class="field full">📷 Photos du problème (envoyées dans l’app de la personne)<input type="file" name="pbphotos" accept="image/*" multiple></label>
        ${pb.length || np ? html`<p class="tiny muted full" style="margin:-4px 0 0">✓ ${pb.length + np} photo(s) déjà jointe(s)${np ? ' (photos de la gérance)' : ''}</p>` : ''}
        ${np ? html`<input type="hidden" name="ptlPhotos" value="${t.ptlPhotos.join(',')}">` : ''}`; })()}
        ${t.depId ? html`<p class="tiny muted full" style="margin:0">✓ Coût enregistré dans les dépenses de l'immeuble.</p>` : ''}
        ${(t.journal || []).length ? html`<div class="full"><div class="section-label" style="margin:4px 0 6px">👷 Suivi de l’équipe</div><div class="list small">${t.journal.slice().reverse().slice(0, 30).map((x) => html`<div class="row"><span class="grow" style="white-space:normal"><b>${EQ_ST[x.st] || x.st}${x.h ? ' 🕒 ' + x.h : ''}</b> · ${fmtDate(x.d)}${x.by ? ' · ' + intervName(x.by) : ''}<span class="meta" style="display:block">${fmtDateTime(x.at)}</span>${x.note ? html`<span class="small" style="display:block">📝 ${x.note}</span>` : ''}</span>${(x.ph || []).filter((pid) => vault.get('documents', pid)).map((pid) => html`<button class="btn sm" type="button" data-action="open-doc" data-id="${pid}">📷</button>`)}</div>`)}</div></div>` : ''}
        ${t.locId ? html`<p class="tiny full" style="margin:0">📨 Signalé par <a href="#" data-action="open-loc" data-id="${t.locId}">${fullName(vault.get('locataires', t.locId) || { nom: '?' })}</a> — il voit l'avancement dans son espace.</p>` : ''}
        ${t.id && (eqPhotos(t.id, 'av').length || eqPhotos(t.id, 'ap').length) ? html`<div class="full"><div class="section-label" style="margin:4px 0 6px">📷 Avant / après les travaux</div><div class="edl-pair two">${Object.entries(EQ_PH).map(([ph, lb]) => html`<div><div class="tiny muted" style="margin-bottom:4px"><b>${lb}</b> · ${eqPhotos(t.id, ph).length} / ${EQ_PH_MAX}</div><div class="edl-grid sm">${eqPhotos(t.id, ph).map((x) => html`<figure class="edl"><button type="button" class="edl-img" data-action="open-doc" data-id="${x.id}" aria-label="Agrandir"><img alt="" data-edl="${x.id}"></button><figcaption><span>${fmtDate(x.date)}</span><button type="button" class="btn icon sm ghost danger" data-action="del-edl" data-id="${x.id}" aria-label="Retirer la photo">${icon('trash')}</button></figcaption></figure>`)}</div></div>`)}</div></div>` : ''}
        ${vault.list('documents').filter((x) => x.tacheId === t.id && t.id && !x.phase).length ? html`<div class="full" style="display:flex;gap:6px;flex-wrap:wrap">${vault.list('documents').filter((x) => x.tacheId === t.id && !x.phase).map((x) => html`<button class="btn sm" type="button" data-action="open-doc" data-id="${x.id}">📷 ${x.label.replace('Signalement — ', '')}</button>`)}</div>` : ''}
      </form>`,
      foot: html`${id ? html`<button class="btn ghost danger" data-action="del-tache" data-id="${id}" aria-label="Supprimer">${icon('trash')}</button>` : ''}
        ${id && t.ptl && t.statut === 'fait' ? html`<button class="btn" data-action="fact-open" data-id="${id}">🧾 ${t.facture ? 'Facture ' + t.facture.no : 'Facture'}</button>` : ''}
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

  'pub-form'({ id, preset }) {
    if (id) pubStatsLoad();
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
        ${field('Vidéo ou musique (YouTube, TikTok, Instagram, Facebook, Vimeo, Spotify, Deezer, Apple Music, SoundCloud)', 'video', a.video, { full: true, type: 'url', placeholder: 'https://www.youtube.com/watch?v=… · https://www.tiktok.com/@…/video/…', attrs: 'data-input="vid-link"' })}
        <p class="tiny muted full" style="margin:0">Collez le lien de la vidéo ou du morceau : il s’affiche dans l’annonce comme un petit écran ou un petit lecteur audio, on le regarde ou l’écoute sans quitter l’app. <b id="vidHint">${vidHint(a.video)}</b></p>
        <label class="field full">Emplacement<select name="slot">${Object.entries(PUB_SLOTS).map(([k, v]) => html`<option value="${k}" ${(a.slot ? pubSlot(a) : 'haut') === k ? new Raw('selected') : ''}>${v}</option>`)}</select></label>
        <div class="field full">Visible pour<div class="chips" style="margin-top:6px">${Object.entries(PUB_AUD).map(([k, v]) => html`<label class="chip" style="display:inline-flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" name="aud_${k}" ${pubAud(a).includes(k) ? new Raw('checked') : ''} style="width:18px;min-height:18px;margin:0">${v}</label>`)}</div></div>
        <label class="field full">Immeuble (locataires et équipe)<select name="immId"><option value="">Tous les immeubles</option>${imms.map((im) => html`<option value="${im.id}" ${im.id === a.immId ? new Raw('selected') : ''}>${im.adresse}</option>`)}</select></label>
        ${field('Publier à partir du', 'debut', exp ? today() : a.debut, { type: 'date', required: true })}
        <label class="field">Durée (TTL)<select name="ttl">${PUB_TTL.map((n) => html`<option value="${n}" ${+(a.ttl || 30) === n ? new Raw('selected') : ''}>${n} jours</option>`)}</select></label>
        ${id ? pubStatsBlock(a) : ''}
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
        ${field('Code postal et localité', 'ville', im.ville, { full: true, placeholder: 'ex. L-1840 Luxembourg' })}
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
        <div class="actions" style="margin-top:12px;flex-direction:column">
          <button class="btn primary block" data-action="coloc-new" data-imm="${id}">🏠 Ajouter un appartement en colocation (2 à 10 chambres)</button>
          <button class="btn block" data-action="new-log" data-imm="${id}">${icon('plus')} Ajouter un logement / local</button></div>`;
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
          ${groups.length ? groups.map(([gk, g]) => html`<div class="section-label">💬 ${chatLabel(gk)}${g.members.length < 2 ? html` <span class="badge">✉️ seul·e — écrit au gestionnaire</span>` : ''} <span class="muted small">· ${g.members.map((m) => shortName(vault.get('locataires', m) || {})).join(', ')}</span></div>
            ${binsTable(im, g)}
            <div class="chat">${chatBubbles((ui.chatCache || {})[g.id], g.id)}</div>
            <form data-form="chatpost" class="chat-form"><input type="hidden" name="imm" value="${id}"><input type="hidden" name="gk" value="${gk}">
              <textarea name="x" required maxlength="1500" placeholder="Écrire aux habitants (en tant que gestionnaire)…"></textarea><button class="btn primary" type="submit">${icon('msg')} Envoyer</button></form>
            <button class="btn sm" style="margin:6px 0 4px" data-action="chat-refresh" data-id="${id}">${icon('sync')} Actualiser</button>`)
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
          return html`<button class="row" data-action="open-log" data-id="${g.id}" data-tab="bilan"><span class="grow"><span class="title" style="display:block">${logLabel(g)}</span>
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

  'coloc-form'({ preset }) {
    const im = vault.get('immeubles', preset);
    if (!im) return null;
    return {
      title: 'Appartement en colocation',
      narrow: true,
      body: html`<p class="small" style="margin-top:0">Un appartement avec plusieurs chambres louées séparément : chaque chambre a son locataire, ses loyers et ses quittances ; les habitants de l’appartement ont leur chat ensemble.</p>
        <form id="fColoc" data-form="coloc" class="fields">
          <input type="hidden" name="immId" value="${im.id}">
          ${field('Nom de l’appartement', 'nom', '', { full: true, required: true, placeholder: 'ex. Appartement 1er étage, Appartement A' })}
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
        <label class="field full">Fait partie de l’appartement (colocation)<input name="partie" value="${g.partie || ''}" list="colocList" autocomplete="off" placeholder="ex. Appartement 1er étage — vide si logement indépendant">
          <datalist id="colocList">${colocsOf(g.immId).map((c) => html`<option value="${c.nom}">`)}</datalist>
          <span class="tiny muted">Pour une chambre : l’appartement où elle se trouve. Les habitants des chambres d’un même appartement ont leur chat ensemble.</span></label>
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
          <button class="btn sm" data-action="replace" data-id="${l.id}">${icon('sync')} Changer</button>
        </div>`)}</div>` : html`<div class="alert warn" style="margin-bottom:12px">${icon('home')}<div><b>Logement vacant</b>${last ? html` depuis le départ de ${fullName(last)} (${fmtDate(last.sortie)})` : ''}.</div></div>`}
        ${future.length ? html`<div class="section-label">Arrivée prévue</div><div class="list" style="margin-bottom:12px">${future.map((l) => html`<button class="row" data-action="open-loc" data-id="${l.id}"><span class="avatar">${avIn(l)}</span><span class="grow"><span class="title" style="display:block">${fullName(l)}</span><span class="meta">le ${fmtDate(l.debut)}</span></span></button>`)}</div>` : ''}
        <button class="btn block ${occ.length ? '' : 'primary'}" data-action="new-loc" data-log="${id}">${icon('plus')} ${occ.length ? 'Ajouter une 2ᵉ personne dans ce logement (couple, colocataire)' : 'Ajouter un locataire'}</button>`;
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
    if (!vault.list('immeubles').length) return { title: 'Nouveau locataire', body: empty('building', "Ajoutez d'abord un immeuble.", html`<button class="btn primary" data-action="new-imm">${icon('plus')} Ajouter un immeuble</button>`) };
    return {
      title: id ? 'Modifier le locataire' : 'Nouveau locataire',
      body: html`<form id="f" data-form="loc" class="fields">
        <input type="hidden" name="id" value="${id || ''}">
        ${photoField(l, id ? initials(l) : '👤')}
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
          <div class="section-label">Ce qu'il voit</div>${boxes}${mtPreview(l)}
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
        <div class="section-label full" style="margin:8px 0 0">✍️ Signature + timbre (récapitulatif des loyers des locataires)</div>
        <div class="full" id="signWrap">${signBlock(st)}</div>
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
    <p class="pr-sub">${logKind(g)}${g.surface ? ' · ' + g.surface + ' m²' : ''}${o ? ` · occupé ${pct(o.occupied, o.total)}% du temps, ${duree(o.vacant)} de vacance` : ''}</p>
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
  'abo-edit': (d) => openSheet('abo', d.id),
  'abo-tab': (d) => { ui.aboTab = d.id; renderView(); },
  async 'abo-offers'() {
    const on = !aboOffersOn();
    await vault.mutate((tx) => tx.put('reglages', { id: 'abos', offers: on }), on ? 'Offres d’abonnement activées' : 'Offres d’abonnement désactivées', 'Portail gérance');
    toast(on ? '🟢 Offres visibles dans le portail des gérances' : '⚪ Offres masquées dans le portail des gérances');
    portailPubsSync().catch(() => {});
  },
  async 'abo-paid'(d) {
    const a = aboOf(d.id), o = ptlOrg(d.id);
    if (!a) return;
    const from = a.paidUntil && a.paidUntil >= today() ? a.paidUntil : today();
    const x = new Date(from + 'T12:00:00'); if (a.periode === 'an') x.setFullYear(x.getFullYear() + 1); else x.setMonth(x.getMonth() + 1);
    const to = x.toISOString().slice(0, 10);
    if (!(await confirmBox(`Paiement reçu : ${eur(+a.prix || 0)} ?`, { ok: '✅ Paiement reçu', detail: `${o ? o.name : ''} — abonnement payé jusqu’au ${fmtDate(to)}.` }))) return;
    const list = { ...aboAll(), [d.id]: { ...a, paidUntil: to, pays: [...(a.pays || []), { d: today(), m: +a.prix || 0, to }].slice(-60) } };
    await vault.mutate((tx) => tx.put('reglages', { id: 'abos', list }), 'Abonnement payé', o ? o.name : d.id);
    toast('✅ Paiement enregistré'); ui.sheet.rendered = false; renderSheet();
  },
  async 'abo-del'(d) {
    const o = ptlOrg(d.id);
    if (!(await confirmBox(`Supprimer l’abonnement de ${o ? o.name : 'cette gérance'} ?`, { ok: 'Supprimer', danger: true, detail: 'La formule et l’historique des paiements de cet abonnement sont effacés. La gérance et ses demandes ne changent pas.' }))) return;
    const list = { ...aboAll() }; delete list[d.id];
    await vault.mutate((tx) => tx.put('reglages', { id: 'abos', list }), 'Abonnement supprimé', o ? o.name : d.id);
    closeSheet(); toast('Abonnement supprimé');
  },
  'ger-new': () => openSheet('ger-form'),
  'ger-filter': (d) => { ui.ptl.org = d.id; renderView(); },
  'ger-done': () => { ui.ptl.done = !ui.ptl.done; ui.ptl.data = null; renderView(); },
  'ger-ticket': (d) => ptlTicketOpen(d.id),
  async 'ger-st'(d) {
    if (d.st === 'annulee' && !(await confirmBox('Annuler cette demande ?', { ok: 'Annuler la demande', danger: true }))) return;
    try { await ptlStatus(d.id, d.st, d.st === 'terminee' ? { rapport: 'Intervention terminée' } : {}); toast(PTL_ST[d.st] + ' — la gérance est prévenue'); } catch (e) { toast(e.message, { bad: true }); }
  },
  async 'ger-to-mt'(a) {
    if (a.id && (!ui.ptl.cur || !ui.ptl.cur.ticket || ui.ptl.cur.ticket.id !== a.id)) { try { ui.ptl.cur = await ptlApi('tickets/' + a.id); } catch (e) { return toast(e.message, { bad: true }); } }
    const d = ui.ptl.cur; if (!d) return;
    const L = ptlLink(d), w = a.iid ? vault.get('intervenants', a.iid) : null;
    openOver('tache-form', null, null, { ...(w ? { intervenantId: w.id, type: w.metier === 'menage' ? 'nettoyage' : 'reparation' } : {}), metiers: metHints(`${d.ticket.categorie || ''} ${d.ticket.description || ''}`), ptlPhotos: (d.photos || []).map((p) => p.id).slice(0, 6), ptl: L, titre: `#${L.ref} ${d.ticket.categorie || 'Intervention'}`.slice(0, 80), note: d.ticket.description || '' });
  },
  'ger-edit': (d) => openSheet('ger-form', d.id),
  'ger-open': (d) => { if (d.tab === 'fact') ui.ptl.orgT = null; openSheet('ger', d.id, d.tab); ptlLoad(); }, // les données du portail sont rafraîchies à chaque ouverture
  'ger-reload': () => { ui.ptl.data = null; ui.ptl.err = ''; renderView(); },
  async 'ptl-logout'() {
    if (!(await confirmBox('Déconnecter l’app du portail ?', { ok: 'Déconnecter', detail: 'Les gérances restent dans le portail ; vous pourrez vous reconnecter.' }))) return;
    try { await ptlApi('logout', { method: 'POST' }); } catch { /* déjà expirée */ }
    await vault.mutate((tx) => tx.put('reglages', { id: 'portail', token: '' }), 'Portail gérance déconnecté', '');
    ui.ptl.data = null; renderView();
  },
  async 'ger-del'(d) {
    const o = ptlOrg(d.id);
    if (!o) return;
    const v = await promptText(`Supprimer « ${o.name} » ?`, 'Ses accès, ses résidences, ses demandes et leurs photos sont supprimés du portail. Irréversible. Tapez le nom de la gérance pour confirmer.', o.name);
    if (v == null) return;
    if (v.trim() !== o.name) return toast('Nom différent : rien n’a été supprimé.', { bad: true });
    try { await ptlApi('orgs/' + o.id, { method: 'DELETE', body: { confirm: v.trim() } }); } catch (e) { return toast(e.message, { bad: true }); }
    await vault.mutate((tx) => tx.put('reglages', { id: 'portail', lastDel: o.name }), 'Gérance supprimée du portail', o.name);
    closeSheet(); toast('Gérance supprimée'); ui.ptl.data = null; renderView();
  },
  // mot de passe du portail oublié : l'app de gestion (encore connectée) crée un lien pour en choisir un nouveau
  async 'ptl-self-reset'() {
    if (!(await confirmBox('Choisir un nouveau mot de passe du portail ?', { ok: 'Créer le lien', detail: `Compte ${(ptlConf() || {}).email || ''} : le portail s’ouvre et vous choisissez un nouveau mot de passe (l’ancien reste valable tant que vous ne l’avez pas changé).` }))) return;
    const win = window.open('', '_blank');
    try {
      const me = await ptlApi('me');
      const r = await ptlApi(`users/${me.user.id}/invite`, { method: 'POST' });
      const url = ptlInviteUrl(r.invite);
      if (win) win.location.href = url; else location.href = url;
    } catch (e) { if (win) win.close(); toast(e.message, { bad: true }); }
  },
  async 'ger-inv'(d) {
    // un nouveau lien annule le précédent : on renvoie le même tant qu'il est valable (gardé chiffré dans le coffre)
    const u = ui.ptl.data && ui.ptl.data.users.find((x) => x.id === d.id);
    const pending = u && !u.has_password && u.invite_expires > Date.now();
    const saved = ptlInvSaved(d.id);
    if (pending && saved && Math.abs(saved.exp - u.invite_expires) < 5 * 60000) { ui.ptl.inv[d.id] = saved.url; return openSheet('ger-invite', d.id); }
    if (pending && !(await confirmBox('Créer un nouveau lien ?', { ok: 'Nouveau lien', danger: true, detail: `Un lien a déjà été envoyé à ${u.name} (valable jusqu’au ${fmtDate(new Date(u.invite_expires).toISOString().slice(0, 10))}). Avec un nouveau lien, l’ancien ne marchera plus : envoyez bien le nouveau.` }))) return;
    try { const r = await ptlApi(`users/${d.id}/invite`, { method: 'POST' }); ui.ptl.inv[d.id] = ptlInviteUrl(r.invite); await ptlInvSave(d.id, ui.ptl.inv[d.id]); } catch (e) { return toast(e.message, { bad: true }); }
    openSheet('ger-invite', d.id);
    ptlLoad(); // la demande « mot de passe oublié » disparaît
  },
  'ger-inv-lang': (d) => { ui.sheet = null; openSheet('ger-invite', d.id, null, { lang: d.l }); },
  // invitation en HTML (couleurs, gras, bouton orange) : à coller dans le corps de l'email
  async 'ger-inv-html'(d) {
    const dd = ui.ptl.data, u = dd && dd.users.find((x) => x.id === d.id), link = ui.ptl.inv[d.id];
    if (!u || !link) return;
    const t = PTL_INVITE[d.l] || PTL_INVITE.fr, first = u.name.split(' ')[0], h = t.html(first, link), txt = t.text(first, link);
    try {
      if (window.ClipboardItem) await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([h], { type: 'text/html' }), 'text/plain': new Blob([txt], { type: 'text/plain' }) })]);
      else await navigator.clipboard.writeText(txt);
      toast('Invitation copiée — collez-la dans votre email');
    } catch { toast('Copie impossible', { bad: true }); }
  },
  async 'ger-inv-copy'(d) {
    try { await navigator.clipboard.writeText(ui.ptl.inv[d.id]); toast('Lien copié'); } catch { toast('Copie impossible', { bad: true }); }
  },
  async 'ger-user-toggle'(d) {
    const on = d.on === '1';
    // désactiver : seulement à la demande du responsable de la gérance (on le demande avant)
    if (on) {
      const u = ui.ptl.data && ui.ptl.data.users.find((x) => x.id === d.id);
      const resp = ui.ptl.data && ui.ptl.data.users.find((x) => x.org_id === d.org && x.role === 'gerance_admin' && x.id !== d.id);
      const v = await choiceBox(`Désactiver l’accès de ${u ? u.name : 'cette personne'} ?`, `⚠️ Le responsable de la gérance${resp ? ' (' + resp.name + ')' : ''} vous l’a-t-il demandé ? Sans sa demande, ne désactivez pas. La personne est déconnectée tout de suite ; vous pourrez réactiver l’accès.`, [{ value: 'yes', label: '✅ Oui, il l’a demandé — désactiver', cls: 'danger' }]);
      if (v !== 'yes') return;
    }
    try { await ptlApi('users/' + d.id, { method: 'PATCH', body: { active: !on } }); } catch (e) { return toast(e.message, { bad: true }); }
    toast(on ? 'Accès désactivé' : 'Accès réactivé'); await ptlLoad();
  },
  async 'ger-res-off'(d) {
    if (!(await confirmBox('Retirer cette résidence ?', { ok: 'Retirer', danger: true, detail: 'Elle disparaît des choix de la gérance ; l’historique des demandes est gardé.' }))) return;
    try { await ptlApi('residences/' + d.id, { method: 'PATCH', body: { active: false } }); } catch (e) { return toast(e.message, { bad: true }); }
    toast('Résidence retirée'); await ptlLoad();
  },
  'mt-tab': (d) => { ui.mtTab = d.id; renderView(); },
  'new-interv': () => openOver('interv-form'),
  // « + » : ajoute une ligne « Supplément » (dépannage, nettoyage en plus) à ce jour
  'hor-add': (d, el) => {
    const grid = el.closest('.hor-blk').querySelector('.hor-grid'), p = HOR_P[d.p] ? d.p : 'extra';
    const tpl = document.querySelector(`template[data-hor-tpl="${p}"]`);
    const k = +grid.dataset.n || 0, same = grid.querySelectorAll(`.hor-row[data-p="${p}"]`);
    grid.dataset.n = k + 1;
    const row = tpl.innerHTML.replaceAll('__J__', d.j).replaceAll('__K__', k).replaceAll('__N__', same.length + 1);
    // la nouvelle ligne se place à la suite de son créneau (matin sous le matin…), les suppléments à la fin
    if (same.length && p !== 'extra') same[same.length - 1].insertAdjacentHTML('afterend', row);
    else grid.insertAdjacentHTML('beforeend', row);
    grid.querySelector(`[name="h${d.j}_${k}d"]`).focus();
  },
  'edit-interv': (d) => openOver('interv-form', d.id),
  'plan-wk': (d) => { ui.planWk ||= {}; const cur = ui.planWk[d.id] || mondayOf(today()); ui.planWk[d.id] = addDays(cur, +d.d); ui.sheet.rendered = false; renderSheet(); },
  'hor-std': (d) => openOver('hor-std', d.id),
  'plan-edit': (d) => openOver('plan-week', d.id, null, d.d),
  'fact-set': () => openOver('fact-set'),
  'fact-open': (d) => openOver('facture', d.id),
  'fact-mat-add': () => { const box = $('#factMats'); if (box) box.insertAdjacentHTML('beforeend', String(matRow(box.children.length))); },
  async 'fact-emit'(d) {
    const t = vault.get('taches', d.id), fm = sheetEl.querySelector('form[data-form=facture]');
    if (!t || !fm || t.facture) return;
    if (!t.ptl || !ptlConf()) return toast('Facture : intervention liée à une gérance et portail connecté nécessaires', { bad: true });
    const f = factRead(fm), c = factConf(), miss = factMissing(c);
    if (miss.length) return toast('Complétez : ' + miss.join(', '), { bad: true });
    const k = factCalc(f, factTaux(f, c));
    const cl = factClient(t.ptl.orgId, t.ptl.org);
    if (f.reg.regime === 'autoliq' && !cl.tvaNum) return toast('Autoliquidation : indiquez d’abord le n° TVA du client (Gérances → la gérance → 🧾 Facturation)', { bad: true });
    const seq = (+c.seq || 0) + 1, date = today(), no = `${ymd(date)}-INT${String(seq).padStart(4, '0')}`;
    if (!(await confirmBox(`Émettre la facture ${no} ?`, { ok: 'Émettre et envoyer', detail: `${t.ptl.org} · ${eur(k.ttc)} TTC. Le numéro ne peut plus changer ; la gérance la reçoit dans son portail.` }))) return;
    const { bytes } = await factPdf(t, f, no, date, c);
    try {
      const r = await fetch(PTL_API + `tickets/${t.ptl.tid}/invoice`, { method: 'PUT', headers: { Authorization: 'Bearer ' + ptlConf().token, 'Content-Type': 'application/pdf', 'X-Invoice': encodeURIComponent(JSON.stringify({ no, ht: k.ht, tva: k.tva, ttc: k.ttc })) }, body: bytes });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Erreur ' + r.status);
    } catch (e) { return toast('Envoi impossible : ' + (e.message || 'connexion'), { bad: true }); }
    let docId = '';
    await vault.mutate((tx) => {
      tx.put('reglages', { id: 'facturation', seq });
      docId = tx.put('documents', { tacheId: t.id, kind: 'facture-int', label: `Facture ${no} — ${t.ptl.org}`, date, mime: 'application/pdf', size: bytes.length }).id;
      tx.put('taches', { id: t.id, factDraft: f, facture: { no, date, ht: k.ht, tva: k.tva, ttc: k.ttc, paid: '', docId } });
    }, 'Facture émise', `${no} — ${t.ptl.org} · ${eur(k.ttc)}`, t.immId);
    await vault.saveFile(docId, bytes);
    sheetDirty = false;
    toast(`🧾 Facture ${no} envoyée à ${t.ptl.org}`);
    ui.sheet.rendered = false; renderSheet();
  },
  // ⚠️ contentieux : facture impayée en litige — rouge clignotant dans la master et dans le portail de la gérance
  async 'fact-cont'(d) {
    const t = vault.get('taches', d.id);
    if (!t || !t.facture || t.facture.paid) return;
    const on = !t.facture.cont;
    if (on && !(await confirmBox('Mettre cette facture en contentieux ?', { ok: '⚠️ Contentieux', danger: true, detail: `${t.facture.no} · ${eur(t.facture.ttc)} — la gérance reçoit un message et voit la facture en rouge dans son portail.` }))) return;
    try { await ptlApi(`tickets/${t.ptl.tid}/invoice-paid`, { method: 'POST', body: { cont: on } }); } catch (e) { return toast(e.message, { bad: true }); }
    await vault.mutate((tx) => tx.put('taches', { id: t.id, facture: { ...t.facture, cont: on ? today() : '' } }), on ? 'Facture en contentieux' : 'Contentieux levé', t.facture.no, t.immId);
    toast(on ? '⚠️ Facture en contentieux' : 'Contentieux levé');
  },
  async 'fact-paid'(d) {
    const t = vault.get('taches', d.id);
    if (!t || !t.facture) return;
    const paid = t.facture.paid ? '' : today();
    try { await ptlApi(`tickets/${t.ptl.tid}/invoice-paid`, { method: 'POST', body: { paid: !!paid } }); } catch (e) { return toast(e.message, { bad: true }); }
    await vault.mutate((tx) => tx.put('taches', { id: t.id, facture: { ...t.facture, paid, ...(paid ? { cont: '' } : {}) } }), paid ? 'Facture payée' : 'Facture à payer', t.facture.no, t.immId);
    toast(paid ? '✅ Facture payée' : 'Facture remise « à payer »');
  },
  async 'plan-reset'(d) {
    const i = vault.get('intervenants', d.id);
    if (!i || !(await confirmBox('Revenir à l’horaire habituel pour cette semaine ?', { ok: 'Revenir à l’habituel', detail: `Semaine du ${dayShort(d.d)} : les changements de cette semaine sont effacés.` }))) return;
    const plan = { ...(i.plan || {}) };
    for (let j = 0; j < 7; j++) delete plan[addDays(d.d, j)];
    await vault.mutate((tx) => tx.put('intervenants', { id: i.id, plan }), 'Planning : retour à l’horaire habituel', `${intervFull(i)} — semaine du ${dayShort(d.d)}`, i.id);
    toast('Semaine remise à l’horaire habituel');
  },
  'open-interv': (d) => openSheet('interv', d.id),
  'imm-map': (d) => { ui.mapImm = d.id || ''; renderView(); if (d.id) scrollTo({ top: 0, behavior: 'smooth' }); },
  'cp-tab': (d) => { ui.cpTab = d.id; ui.cpLim = 10; renderView(); },
  'cp-sec': (d) => { ui.cpSec = d.id; go('compta', true); },
  'cp-fact-csv': () => {
    const [from, to] = cpRange(ui.year, ui.cpPer || 'y');
    const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`, n2 = (v) => String(r2(v || 0)).replace('.', ',');
    const rows = [['N° facture', 'Date', 'Client (gérance)', 'Demande', 'Intervention', 'HT', 'TVA', 'TTC', 'Payée le'].map(q).join(';')];
    for (const t of vault.list('taches').filter((t) => t.facture && t.facture.date >= from && t.facture.date <= to).sort((a, b) => a.facture.no.localeCompare(b.facture.no))) rows.push([t.facture.no, t.facture.date, t.ptl ? t.ptl.org : '', t.ptl ? '#' + t.ptl.ref : '', t.titre, n2(t.facture.ht), n2(t.facture.tva), n2(t.facture.ttc), t.facture.paid || ''].map(q).join(';'));
    download(`factures-${from}-${to}.csv`, '\ufeff' + rows.join('\r\n'), 'text/csv;charset=utf-8');
  },
  'cp-int-csv': () => {
    const [from, to] = cpRange(ui.year, ui.cpPer || 'y');
    const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [['Date', 'Arrivée', 'Départ', 'Heures', 'Lieu', 'Travail', 'Type', 'Intervenant', 'Gérance / réf.', 'Avis', 'Coût (€)', 'État'].map(q).join(';')];
    for (const x of intervLedger(from, to)) rows.push([x.d, x.arr, x.dep, x.min ? (x.min / 60).toFixed(2).replace('.', ',') : '', x.lieu, x.t.titre, TACHE_TYPES[x.t.type] || x.t.type, x.who, x.ger, x.avis, x.cout ? String(x.cout).replace('.', ',') : '', x.state === 'fait' ? 'clôturée' : 'à clôturer'].map(q).join(';'));
    download(`interventions-${from}-${to}.csv`, '\ufeff' + rows.join('\r\n'), 'text/csv;charset=utf-8');
  },
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
  async 'eng-pdf'(d) { const i = vault.get('intervenants', d.id); if (!i) return; download(`Fiche engagement ${intervFull(i)}.pdf`, await engPdf(i), 'application/pdf'); },
  'occ-open': (d) => openOver('occ-fact', d.id),
  async 'occ-dl'(d) { const t = vault.get('taches', d.id), i = t && vault.get('intervenants', t.intervenantId); if (!t || !t.occ || !i) return; download(`Intervention occasionnelle ${t.occ.no}.pdf`, await occPdf(t, i, t.occ), 'application/pdf'); },
  'photo-del': (d, el) => { const box = el.closest('.photo-pick'); box.querySelector('[name=photo]').value = ''; setHtml(box.querySelector('.pp-circle'), '👤'); el.remove(); },
  'interv-aff': (d) => { ui.ptl.data = null; ui.ptl.err = ''; openOver('ger-aff', d.id); },
  'ger-aff-reload': () => { ui.ptl.data = null; ui.ptl.err = ''; ptlLoad(); },
  'interv-job': (d) => { const i = vault.get('intervenants', d.id); openOver('tache-form', null, null, { intervenantId: d.id, type: i && i.metier === 'menage' ? 'nettoyage' : 'reparation' }); },
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
  'pub-report': (d) => pubReport(d.id),
  'pub-stats-refresh': () => pubStatsLoad(true),
  'new-pub': () => openOver('pub-form', null, null, ''), // par défaut : tous les immeubles
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
    const saved = await vault.mutate((tx) => tx.put('taches', { id: t.id, statut: 'fait', doneDate: t.fini ? t.fini.d : today(), vu: true }), 'Chantier clôturé', `${t.titre} — ${placeName(t)}`, t.immId);
    toast(t.locId ? '✓ Réparé · le locataire voit « Terminé » dans son app' : '🟢 Chantier clôturé');
    if (saved.ptl && ptlConf()) { const w = vault.get('intervenants', saved.intervenantId); ptlStatus(saved.ptl.tid, 'terminee', { technicien: w ? intervFull(w) : '', rapport: (saved.fini && saved.fini.note) || saved.note || 'Intervention terminée' }).then(() => toast('Portail gérance mis à jour : Terminée')).catch((e) => toast('Portail gérance : ' + e.message, { bad: true })); }
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
  go: (d) => { closeSheet(); if (d.sec) ui.cpSec = d.sec; go(d.to); },
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
  'ger-new-go': () => { go('gerances'); if (ptlConf()) openSheet('ger-form'); },
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
  'loc-seg': (d) => { ui.locSeg = d.id; renderView(); },
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
    if (!(await confirmBox(`Annuler le paiement de ${fullName(l)} — ${MONTHS_FULL[+d.m - 1]} ${d.y} ?`, { ok: 'Annuler le paiement', danger: true, detail: 'Le mois redevient « à payer ». Ce paiement enregistré est supprimé.' }))) return;
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
  'champeq-year': (d) => { ui.champEqYear = +d.id; renderView(); },
  async 'champeq-prize'(d) {
    const y = ui.champEqYear || new Date().getFullYear();
    const cur = vault.get('reglages', 'champions') || {};
    const eq = { ...(cur.eq || {}) }, yp = { ...(eq[y] || {}) };
    const w = vault.get('intervenants', d.id) || {};
    if (yp[d.id]) {
      if (!(await confirmBox('Annuler « récompense remise » ?', { ok: 'Annuler', detail: intervFull(w) }))) return;
      delete yp[d.id];
    } else yp[d.id] = today();
    eq[y] = yp;
    await vault.mutate((tx) => tx.put('reglages', { ...cur, id: 'champions', eq }), yp[d.id] ? 'Récompense remise 🎁' : 'Récompense annulée', `${intervFull(w)} — ouvrier de l’année ${y}`, d.id);
    if (yp[d.id]) toast('🎁 Bravo, ' + (w.prenom || intervFull(w)) + ' !');
  },
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
    await vault.mutate((tx) => tx.put('reglages', { ...cur, id: 'champions', prizes }), yp[d.id] ? 'Pizza offerte 🍕' : 'Pizza annulée', `${fullName(l)} — locataire de l’année ${y}`, d.id);
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
  async abo(fd) {
    const id = fd.get('id'), g = (k) => String(fd.get(k) || '').trim(), cur = aboOf(id) || {};
    const plan = ABO_PLANS[g('plan')] ? g('plan') : 'pro';
    const rec = { ...cur, plan, prix: plan === 'decouverte' ? 0 : Math.max(0, num(g('prix'))), periode: g('periode') === 'an' ? 'an' : 'mois', debut: g('debut') || today(), paidUntil: g('paidUntil') };
    await vault.mutate((tx) => tx.put('reglages', { id: 'abos', list: { ...aboAll(), [id]: rec } }), 'Abonnement', (ptlOrg(id) || {}).name || id);
    closeSheet(); toast('Abonnement enregistré');
  },
  async 'ger-msg'(fd, f) {
    const id = fd.get('id'), x = String(fd.get('x') || '').trim(); if (!x) return;
    try { await ptlApi(`tickets/${id}/comments`, { method: 'POST', body: { text: x } }); } catch (e) { return toast(e.message, { bad: true }); }
    f.reset(); toast('Message envoyé à la gérance'); ptlTicketOpen(id);
  },
  async radio(fd) {
    let url = String(fd.get('url') || '').trim(); if (url && !/^https?:\/\//i.test(url)) url = 'https://' + url;
    await vault.mutate((tx) => tx.put('reglages', { id: 'radio', nom: String(fd.get('nom') || '').trim().slice(0, 60), url: url.slice(0, 500) }), 'Radio de l’app des locataires', url);
    toast('Radio enregistrée'); scheduleEspaceSync();
  },
  async 'ptl-login'(fd, f) {
    const email = String(fd.get('email') || '').trim().toLowerCase(), pass = String(fd.get('pass') || '');
    const btn = f.querySelector('[type=submit]'); btn.disabled = true;
    ui.ptl.email = email;
    try {
      const pre = await ptlApi('prelogin', { method: 'POST', body: { email }, anon: true });
      const authKey = await ptlDerive(pass, pre.salt, pre.iter);
      const { token } = await ptlApi('login', { method: 'POST', body: { email, authKey }, anon: true });
      const me = await fetch(PTL_API + 'me', { headers: { Authorization: 'Bearer ' + token }, cache: 'no-store' }).then((r) => r.json());
      if (!me.user || me.user.role !== 'admin') {
        fetch(PTL_API + 'logout', { method: 'POST', headers: { Authorization: 'Bearer ' + token } }).catch(() => {});
        throw new PtlError(403, 'Ce compte est celui d’une gérance : connectez le compte LuxInterventions.');
      }
      await vault.mutate((tx) => tx.put('reglages', { id: 'portail', token, email, name: me.user.name || '' }), 'Portail gérance connecté', email);
      ui.ptl = { data: null, loading: false, err: '', inv: {} };
      toast('Connecté au Portail gérance'); renderView();
    } catch (e) { ui.ptl.err = e.message; btn.disabled = false; renderView(); }
  },
  async ger(fd) {
    const id = fd.get('id'), b = { name: String(fd.get('name') || '').trim(), email: String(fd.get('email') || '').trim(), phone: String(fd.get('phone') || '').trim() };
    if (!b.name) return;
    { const ib = ibanCheck(fd.get('iban')), bc = bicCheck(fd.get('bic'), ib.ok ? ib.cc : ''); if (!ib.ok) return toast('IBAN de la gérance : ' + ib.msg, { bad: true }); if (!bc.ok) return toast('BIC de la gérance : ' + bc.msg, { bad: true }); }
    const gv = (k) => String(fd.get(k) || '').trim();
    Object.assign(b, { address: gv('adresse'), rcs: gv('rcs').toUpperCase().replace(/\s+/g, ''), tva: gv('tvaNum').toUpperCase().replace(/\s+/g, ''), banque: gv('banque'), bic: gv('bic').toUpperCase().replace(/\s+/g, ''), iban: ibanClean(gv('iban')) });
    let nid = id;
    try { if (id) await ptlApi('orgs/' + id, { method: 'PATCH', body: b }); else nid = (await ptlApi('orgs', { method: 'POST', body: b })).id; } catch (e) { return toast(e.message, { bad: true }); }
    const g = (k) => String(fd.get(k) || '').trim();
    const cur = (vault.get('reglages', 'factClients') || {}).list || {};
    const list = { ...cur, [nid]: { regime: TVA_REG[g('regime')] ? g('regime') : 'normal', taux: g('taux'), tvaNum: g('tvaNum').toUpperCase().replace(/\s+/g, ''), rcs: g('rcs').toUpperCase().replace(/\s+/g, ''), banque: g('banque'), bic: g('bic').toUpperCase().replace(/\s+/g, ''), iban: ibanClean(g('iban')), adresse: g('adresse'), pays: (g('pays') || 'LU').toUpperCase().slice(0, 2), mention: g('mention') } };
    await vault.mutate((tx) => { tx.put('reglages', { id: 'portail', lastOrg: b.name }); tx.put('reglages', { id: 'factClients', list }); }, id ? 'Gérance modifiée' : 'Gérance créée', b.name);
    toast(id ? 'Gérance enregistrée' : 'Gérance créée');
    // nouvelle gérance : on crée aussi l'accès du responsable et on montre son lien d'invitation
    if (!id && g('remail')) {
      const rb = { org_id: nid, name: `${g('rprenom')} ${g('rnom')}`.trim(), email: g('remail'), phone: g('rphone'), role: 'gerance_admin' };
      try { const r = await ptlApi('users', { method: 'POST', body: rb }); ui.ptl.inv[r.id] = ptlInviteUrl(r.invite); await ptlInvSave(r.id, ui.ptl.inv[r.id]); await ptlLoad(); return openSheet('ger-invite', r.id); } catch (e) { toast(e.message, { bad: true }); }
    }
    await ptlLoad();
    openSheet('ger', nid, id ? null : 'acces');
  },
  async 'ger-user'(fd, f) {
    const nm = fd.get('prenom') != null ? `${String(fd.get('prenom') || '').trim()} ${String(fd.get('nom') || '').trim()}`.trim() : String(fd.get('name') || '').trim();
    const org = fd.get('org'), b = { org_id: org, name: nm, email: String(fd.get('email') || '').trim(), phone: String(fd.get('phone') || '').trim(), role: fd.get('role') };
    let r;
    try { r = await ptlApi('users', { method: 'POST', body: b }); } catch (e) { return toast(e.message, { bad: true }); }
    f.reset();
    ui.ptl.inv[r.id] = ptlInviteUrl(r.invite);
    await ptlInvSave(r.id, ui.ptl.inv[r.id]);
    await ptlLoad();
    openSheet('ger-invite', r.id);
  },
  async 'ger-res'(fd, f) {
    const b = { org_id: fd.get('org'), name: String(fd.get('name') || '').trim(), address: String(fd.get('address') || '').trim(), apartments: fd.get('apartments'), contact_name: String(fd.get('contact_name') || '').trim() };
    try { await ptlApi('residences', { method: 'POST', body: b }); } catch (e) { return toast(e.message, { bad: true }); }
    f.reset(); toast('Résidence ajoutée'); await ptlLoad();
  },
  async 'fact-client'(fd) {
    const g = (k) => String(fd.get(k) || '').trim(), org = g('org');
    const cur = (vault.get('reglages', 'factClients') || {}).list || {};
    const list = { ...cur, [org]: { regime: TVA_REG[g('regime')] ? g('regime') : 'normal', taux: g('taux'), tvaNum: g('tvaNum').toUpperCase().replace(/\s+/g, ''), adresse: g('adresse'), pays: (g('pays') || 'LU').toUpperCase().slice(0, 2), mention: g('mention') } };
    await vault.mutate((tx) => tx.put('reglages', { id: 'factClients', list }), 'Facturation du client', (ptlOrg(org) || {}).name || org);
    toast('Facturation du client enregistrée');
  },
  async 'fact-set'(fd) {
    const g = (k) => String(fd.get(k) || '').trim();
    { const ib = ibanCheck(g('iban')), bc = bicCheck(g('bic'), ib.ok ? ib.cc : ''); if (!ib.ok) return toast('IBAN : ' + ib.msg, { bad: true }); if (!bc.ok) return toast('BIC : ' + bc.msg, { bad: true }); }
    const iban = g('iban').toUpperCase().replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim();
    await vault.mutate((tx) => tx.put('reglages', { id: 'facturation', nom: g('nom'), marque: g('marque'), adresse: g('adresse'), ville: g('ville'), rcs: g('rcs'), tva: g('tva'), tel: g('tel'), email: g('email'), autorisation: g('autorisation'), iban, bic: g('bic').toUpperCase(), banque: g('banque'), taux: num(fd.get('taux')), delai: Math.max(0, Math.round(num(fd.get('delai')))) || 30, marge: num(fd.get('marge')) }), 'Facturation des interventions', g('nom'));
    toast('Facturation enregistrée'); goBack();
  },
  async facture(fd, fm) {
    const t = vault.get('taches', fd.get('id'));
    if (!t || t.facture) return;
    await vault.mutate((tx) => tx.put('taches', { id: t.id, factDraft: factRead(fm) }), 'Brouillon de facture', t.titre, t.immId);
    toast('Brouillon enregistré'); goBack();
  },
  async 'hor-std'(fd) {
    const i = vault.get('intervenants', fd.get('id'));
    if (!i) return;
    const horaires = horFromForm(fd);
    await vault.mutate((tx) => tx.put('intervenants', { id: i.id, horaires }), 'Routine de la semaine', `${intervFull(i)} — ${horaires.length} créneau(x)`, i.id);
    toast('Routine enregistrée'); goBack();
  },
  async 'plan-week'(fd) {
    const i = vault.get('intervenants', fd.get('id'));
    const mon = String(fd.get('mon') || '');
    if (!i || !/^\d{4}-\d{2}-\d{2}$/.test(mon)) return;
    const slots = horFromForm(fd), copy = Math.max(0, Math.min(12, +fd.get('copy') || 0));
    const plan = { ...(i.plan || {}) };
    const same = (a, b) => JSON.stringify(a.map((h) => [h.de, h.a, h.immId || ''])) === JSON.stringify(b.map((h) => [h.de, h.a, h.immId || '']));
    for (let w = 0; w <= copy; w++) for (let j = 0; j < 7; j++) {
      const iso = addDays(mon, w * 7 + j), day = slots.filter((h) => h.j === j).map(({ de, a, immId, p }) => ({ de, a, immId, p }));
      // identique à l'horaire habituel : pas besoin de le garder
      if (same(day, hors(i).filter((h) => h.j === j).sort((x, y) => x.de.localeCompare(y.de)))) delete plan[iso]; else plan[iso] = day;
    }
    // on ne garde pas les semaines passées depuis plus de 3 mois
    for (const iso of Object.keys(plan)) if (iso < addDays(today(), -92)) delete plan[iso];
    await vault.mutate((tx) => tx.put('intervenants', { id: i.id, plan }), 'Planning de la semaine', `${intervFull(i)} — semaine du ${dayShort(mon)}${copy ? ` (+${copy})` : ''}`, i.id);
    toast(copy ? `Planning enregistré sur ${copy + 1} semaines` : 'Planning de la semaine enregistré');
    goBack();
  },
  async occ(fd) {
    const t = vault.get('taches', fd.get('id')), i = t && vault.get('intervenants', t.intervenantId);
    if (!t || !i) return;
    const o = { cash: fd.get('pay') === 'cash' || !i.iban, h: num(fd.get('h')), taux: num(fd.get('taux')), depl: num(fd.get('depl')), mat: num(fd.get('mat')), matLib: String(fd.get('matLib') || '').trim(), note: String(fd.get('note') || '').trim() };
    if (!(o.h > 0) || !(o.taux > 0)) return toast('Indiquez les heures et le tarif', { bad: true });
    o.tot = r2(o.h * o.taux + o.depl + o.mat);
    // numéro : OCC-AAAA-0001 (suite par année, toutes personnes)
    const y = today().slice(0, 4), cf = vault.get('reglages', 'occ') || {};
    if (t.occ && t.occ.no) { o.no = t.occ.no; o.d = t.occ.d; } else { const n = (cf.y === y ? cf.n || 0 : 0) + 1; o.no = `OCC-${y}-${String(n).padStart(4, '0')}`; o.d = today(); await vault.mutate((tx) => tx.put('reglages', { id: 'occ', y, n }), 'Numérotation', o.no); }
    await vault.mutate((tx) => tx.put('taches', { id: t.id, occ: o }), 'Intervention occasionnelle', `${o.no} — ${intervFull(i)} — ${eur(o.tot)}`, t.immId);
    download(`Intervention occasionnelle ${o.no}.pdf`, await occPdf(t, i, o), 'application/pdf');
    toast(`🧾 ${o.no} — ${eur(o.tot)}`);
    goBack();
  },
  async interv(fd) {
    const id = fd.get('id');
    const g = (k) => String(fd.get(k) || '').trim();
    const prev = id ? vault.get('intervenants', id) || {} : {};
    const rec = { genre: g('genre') || 'interne', cat: g('cat') || 'quotidien', prenom: g('prenom'), nom: g('nom'), metier: fd.get('metier'), tel: g('tel'), mail: g('mail'), tarif: g('tarif'), tauxH: g('tauxH') === '' ? null : num(g('tauxH')), depl: g('depl') === '' ? null : num(g('depl')), payeH: g('payeH') === '' ? null : num(g('payeH')), payeDepl: g('payeDepl') === '' ? null : num(g('payeDepl')), adresse: g('adresse'), ville: g('ville'), rcs: g('rcs'), tva: g('tva'), note: g('note') };
    rec.photo = photoOk(g('photo')) ? g('photo') : '';
    if (rec.genre === 'prive') { rec.rcs = ''; rec.tva = ''; } // occasionnel : ni RCS ni TVA
    // l'horaire ne se fait plus ici : fiche de la personne → Horaires (routine et planning par semaine)
    // engagement : assurance, paiement, obligations acceptées, signature digitale
    if (rec.genre !== 'interne') {
      Object.assign(rec, { cash: rec.genre === 'prive' && fd.get('cash') === '1', assurTodo: rec.genre === 'prive' && fd.get('assurTodo') === '1' && !(g('assur') && g('police')), assur: g('assur'), police: g('police'), banque: g('banque'), bic: g('bic').toUpperCase().replace(/\s/g, ''), iban: ibanClean(g('iban')) });
      const ib = ibanCheck(rec.iban), bc = bicCheck(rec.bic, ib.ok ? ib.cc : '');
      if (rec.genre === 'prive') {
        const bank = !rec.cash || rec.iban || rec.bic || rec.banque; // cash : banque facultative (contrôlée si remplie)
        const miss = [!rec.assurTodo && !rec.assur && 'assurance (ou cochez « Assurance à faire »)', !rec.assurTodo && !rec.police && 'n° de police', bank && !rec.banque && 'nom de la banque', bank && !bc.ok && 'BIC (' + bc.msg + ')', bank && !ib.ok && 'IBAN (' + ib.msg + ')'].filter(Boolean);
        if (miss.length) return toast('Intervention occasionnelle — il manque : ' + miss.join(', '), { bad: true });
      } else if ((rec.iban && !ib.ok) || (rec.bic && !bc.ok)) return toast(!ib.ok && rec.iban ? 'IBAN : ' + ib.msg : 'BIC : ' + bc.msg, { bad: true });
      // la signature vient de l'app de l'intervenant occasionnel : on la garde telle quelle
    }
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
    try { const pj = fd.get('ptl'); if (pj) rec.ptl = JSON.parse(pj); } catch { /* lien illisible */ }
    if (prev && prev.ptl && !rec.ptl) rec.ptl = prev.ptl;
    try { const dj = fd.get('dev'); if (dj) rec.dev = JSON.parse(dj); } catch { /* lien illisible */ }
    if (prev && prev.dev && !rec.dev) rec.dev = prev.dev;
    const hh = (k) => (/^\d\d:\d\d$/.test(fd.get(k) || '') ? fd.get(k) : '');
    rec.heure = hh('heure'); rec.heureFin = rec.heure ? hh('heureFin') : ''; rec.urgent = fd.get('urgent') === '1';
    if (rec.ptl) rec.recur = '';
    if (!rec.titre || (!rec.immId && !rec.ptl && !rec.dev)) return;
    if (recur && !rec.date) return toast('Indiquez la date de la première fois', { bad: true });
    if (id) rec.id = id;
    if (!recur && rec.statut === 'fait' && !(prev && prev.statut === 'fait')) rec.doneDate = today();
    const saved = await vault.mutate((tx) => tx.put('taches', rec), id ? 'Intervention modifiée' : 'Intervention ajoutée', `${rec.titre} — ${placeName(rec)}`, rec.immId);
    toast(id ? 'Intervention enregistrée' : 'Intervention ajoutée');
    // demande d'une gérance : le portail suit (planifiée avec l'ouvrier, ou terminée)
    if (saved.ptl && ptlConf()) {
      const w = vault.get('intervenants', saved.intervenantId), key = [saved.intervenantId, saved.date, saved.heure, saved.statut].join('|');
      const was = prev ? [prev.intervenantId, prev.date, prev.heure, prev.statut].join('|') : '';
      if (key !== was) {
        const st = saved.statut === 'fait' ? 'terminee' : w && saved.date ? 'planifiee' : 'prise';
        ptlStatus(saved.ptl.tid, st, { technicien: w ? intervFull(w) : '', planned_at: saved.date ? `${saved.date}T${saved.heure || '08:00'}` : '', text: w ? `👷 ${intervFull(w)}${saved.date ? ' — ' + fmtDate(saved.date) + (saved.heure ? ' ' + saved.heure : '') : ''}` : '', ...(st === 'terminee' ? { rapport: saved.note || 'Intervention terminée' } : {}) })
          .then(() => toast('Portail gérance mis à jour : ' + PTL_ST[st])).catch((e) => toast('Portail gérance : ' + e.message, { bad: true }));
      }
    }
    if (!recur && !saved.ptl && !saved.dev) await syncDepense(saved);
    // intervention née d'un devis : le devis la connaît, les photos du chantier vont dans l'app de l'ouvrier
    if (saved.dev && !prev) {
      const v = vault.get('devis', saved.dev.id), ph = v ? devPhotos(v.id).slice(0, 6) : [], docs = [];
      if (v) {
        const bytes = []; for (const x of ph) { try { bytes.push(await vault.readFile(x.id)); } catch { /* photo absente */ } }
        await vault.mutate((tx) => { tx.put('devis', { id: v.id, tacheId: saved.id }); bytes.forEach((b, n) => docs.push([tx.put('documents', { tacheId: saved.id, kind: 'equipe', phase: 'pb', label: `Chantier ${n + 1} — ${saved.titre}`, date: today(), mime: 'image/jpeg', size: b.length }).id, b])); }, 'Intervention créée depuis le devis', devNo(v));
        for (const [did, b] of docs) await vault.saveFile(did, b);
      }
    }
    // photos du problème : jointes à l'intervention, publiées dans l'app de la personne
    const pics = [];
    for (const f of fd.getAll('pbphotos').filter((f) => f && f.size)) pics.push(await compressPhoto(f));
    if (!id && ptlConf()) for (const pid of String(fd.get('ptlPhotos') || '').split(',').filter(Boolean)) {
      try { const r = await fetch(PTL_API + 'photos/' + pid, { headers: { Authorization: 'Bearer ' + ptlConf().token } }); if (r.ok) pics.push(new Uint8Array(await r.arrayBuffer())); } catch { /* hors ligne */ }
    }
    if (pics.length) {
      const nb = eqPhotos(saved.id, 'pb').length, docs = [];
      await vault.mutate((tx) => pics.slice(0, Math.max(0, 6 - nb)).forEach((b, n) => docs.push([tx.put('documents', { tacheId: saved.id, kind: 'equipe', phase: 'pb', label: `Problème ${nb + n + 1} — ${saved.titre}`, date: today(), mime: 'image/jpeg', size: b.length }).id, b])), 'Photos du problème', saved.titre, saved.immId);
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
  async pub(fd) {
    const id = fd.get('id');
    const ttl = PUB_TTL.includes(+fd.get('ttl')) ? +fd.get('ttl') : 30;
    const debut = fd.get('debut') || today();
    const rec = { kind: 'pub', cat: PUB_CATS[fd.get('cat')] ? fd.get('cat') : 'autre', nom: fd.get('nom').trim(), adresse: fd.get('adresse').trim(), texte: fd.get('texte').trim(), tel: fd.get('tel').trim(), web: /^https?:\/\//.test(fd.get('web').trim()) ? fd.get('web').trim() : '', video: /^https?:\/\//.test(String(fd.get('video') || '').trim()) ? String(fd.get('video')).trim().slice(0, 500) : '', aud: Object.keys(PUB_AUD).filter((k) => fd.get('aud_' + k)), slot: PUB_SLOTS[fd.get('slot')] ? fd.get('slot') : 'haut', immId: fd.get('immId') || '', debut, ttl, fin: addDays(debut, ttl - 1) };
    if (!rec.nom || !rec.adresse) return;
    if (!rec.aud.length) rec.aud = ['loc'];
    if (id) rec.id = id;
    // lien court TikTok (bouton « Partager » du téléphone) → lien complet, sinon pas de mini écran
    if (rec.video && !videoEmbed(rec.video) && ttShort(rec.video)) { const full = await vault.videoLink(rec.video.trim()); if (full) rec.video = full; }
    await vault.mutate((tx) => tx.put('avis', rec), id ? 'Annonce modifiée' : 'Annonce publiée', `${rec.nom} — jusqu'au ${fmtDate(rec.fin)}`, rec.immId);
    toast(rec.video && !videoEmbed(rec.video) ? (ttShort(rec.video) ? 'Annonce publiée — lien court TikTok non converti (hors ligne ?) : ouvrez la vidéo dans le navigateur et copiez le lien complet' : 'Annonce publiée — lien vidéo non reconnu : il s’affiche comme un bouton') : `Annonce publiée jusqu'au ${fmtDate(rec.fin)}`, rec.video && !videoEmbed(rec.video) ? { bad: true } : undefined);
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
      adresse: fd.get('adresse').trim(), ville: String(fd.get('ville') || '').trim(), type: fd.get('type') || 'immeuble', proprietaire: fd.get('proprietaire').trim(), loyer: num(fd.get('loyer')), charges: num(fd.get('charges')),
      bailDebut: fd.get('bailDebut'), bailFin: fd.get('bailFin'), note: fd.get('note').trim(),
    };
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
      etage: fd.get('etage').trim(), partie: fd.get('partie').trim(), loyer: num(fd.get('loyer')), note: fd.get('note').trim(),
      ch: LOG_ROOMS.includes(fd.get('type')) ? +fd.get('ch') || '' : '', mans: false, maison: fd.get('type') === 'maison' ? fd.get('maison') || '' : '',
      annex: Object.fromEntries(Object.keys(ANNEX).map((k) => [k, ANNEX_OPT[k] ? fd.get('ax_' + k) || '' : fd.get('ax_' + k) === 'on' ? 1 : '']).filter(([, v]) => v)),
    };
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
  if (sheetEl.contains(f)) sheetDirty = false;
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
// ───────────────────────── Devis (ARES INVEST S.A. — LuxInterventions) ─────────────────────────
// Sur place : le chef de chantier prend les photos, écrit son rapport et prévoit les ouvriers et les heures (sans prix).
// Ensuite : le directeur choisit les ouvriers (tarifs des réglages), déplacement, matériel, remise, acompte, validité.
// Le client signe avec le doigt (« Bon pour accord ») ; PDF à imprimer ou à envoyer par WhatsApp / email ;
// une gérance du portail accepte, refuse ou demande une révision depuis son portail.
const DEV_TYPES = { part: '👤 Particulier', pro: '🏢 Société', ger: '💼 Gérance du portail' };
const DEV_ACOMPTE = [40, 30, 20, 10, 0];
const DEV_RETRACT = 14; // jours de rétractation d'un particulier (contrat signé hors établissement)
const devAcompteConseil = (ttc) => (ttc <= 2000 ? 40 : ttc <= 10000 ? 30 : ttc <= 50000 ? 20 : 10);
// initiales du client : « Agigest » → AG, « Mario Rossi » → MR, « Gérance du Centre S.A. » → GC
function devInitials(nom) {
  const w = ascii(nom).toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').split(/\s+/).filter((x) => x && !['DU', 'DE', 'DES', 'LA', 'LE', 'LES', 'ET', 'SA', 'SARL', 'SAS', 'SC', 'S', 'A', 'R', 'L', 'ASBL', 'SPRL', 'GMBH', 'CO'].includes(x));
  if (!w.length) return 'XX';
  return w.length === 1 ? w[0].slice(0, 2) : w.slice(0, 3).map((x) => x[0]).join('');
}
const devNo = (d) => (d.no || '—') + (d.rev ? '-R' + d.rev : '');
const devPhotos = (id) => vault.list('documents').filter((x) => x.devisId === id && x.kind === 'devis').sort((a, b) => (a.n || 0) - (b.n || 0));
// main-d'œuvre : lignes du chef (métier, nombre, heures) + choix du directeur (ouvrier, tarif)
// Catalogue des prestations (chef de chantier) : [catégorie, [[type, prestation, unité, détails à préciser]]]
const DEV_CAT = [["🏗️ Installation de chantier", [["diag", "Visite technique et métré sur place", "fft", ""], ["pose", "Installation de chantier : amenée et repli du matériel, mise en sécurité", "fft", ""], ["pose", "Protection des sols et des meubles (bâches, cartons, rubans)", "m²", "surface"], ["pose", "Location et montage d’échafaudage", "m²", "hauteur (m)"], ["reno", "Évacuation des gravats vers une décharge agréée", "m³", "type de déchets"], ["reno", "Location de conteneur / benne", "pc", "volume (m³)"], ["ent", "Nettoyage de fin de chantier", "fft", ""]]], ["📊 Rapport d’expert / Diagnostic", [["diag", "Détection de fuite non destructive", "fft", "lieu de la fuite"], ["diag", "Mesure d’humidité et recherche d’infiltration", "fft", "pièces concernées"], ["diag", "Thermographie infrarouge", "fft", "surface / pièces"], ["diag", "Inspection vidéo de canalisation", "ml", "diamètre (mm)"], ["diag", "Traçage de conduites", "fft", ""], ["diag", "Rapport écrit avec photos (dossier assurance / litige)", "fft", "objectif du rapport"]]], ["🏠 Toiture", [["rep", "Réparation d’urgence après intempéries (bâchage)", "fft", "surface bâchée (m²)"], ["rep", "Remplacement de tuiles / ardoises cassées", "pc", "modèle de tuile"], ["rep", "Réparation de gouttière / descente d’eau", "ml", "diamètre (cm)"], ["pose", "Fourniture et pose de gouttière", "ml", "matière, diamètre (cm)"], ["pose", "Fourniture et pose de fenêtre de toit", "pc", "dimensions (cm)"], ["ent", "Nettoyage et démoussage de toiture", "m²", ""], ["ent", "Nettoyage des gouttières", "ml", ""], ["diag", "Inspection de toiture (photos / drone)", "fft", ""]]], ["🛡️ Étanchéité", [["rep", "Réparation ponctuelle d’étanchéité de terrasse", "m²", ""], ["pose", "Étanchéité de toiture-terrasse (membrane)", "m²", "type de membrane"], ["pose", "Étanchéité de balcon / terrasse carrelée", "m²", ""], ["pose", "Cuvelage / traitement de sous-sol contre les infiltrations", "m²", ""], ["reno", "Reprise des joints de façade", "ml", ""], ["pose", "Traitement hydrofuge de façade", "m²", ""]]], ["🎨 Peinture & revêtements muraux", [["reno", "Plafonds : enduisage complet et mise en peinture", "m²", "couleur, finition (mat / satin)"], ["reno", "Murs : enduisage complet et mise en peinture", "m²", "couleur, finition"], ["reno", "Enlèvement de l’ancien papier peint", "m²", ""], ["pose", "Fourniture et pose de toile de rénovation (variovlies)", "m²", ""], ["reno", "Mise en peinture des portes et encadrements", "pc", "dimensions (cm)"], ["reno", "Mise en peinture des radiateurs (démontage, montage, purge)", "pc", ""], ["reno", "Peinture de cage d’escalier", "m²", "nombre d’étages"], ["reno", "Peinture de façade", "m²", "hauteur (m), couleur"], ["reno", "Peinture de sol (garage, cave)", "m²", "type de peinture"], ["rep", "Retouches et réparation de fissures", "fft", ""]]], ["🧱 Maçonnerie / gros œuvre", [["reno", "Démolition de cloison (bloc béton, plâtre)", "m²", "épaisseur (cm)"], ["pose", "Construction de cloison (bloc, plaques de plâtre)", "m²", "épaisseur (cm)"], ["pose", "Confection de chape armée", "m²", "épaisseur (cm)"], ["reno", "Ragréage de sol", "m²", "épaisseur (mm)"], ["reno", "Ragréage / enduit de murs", "m²", ""], ["rep", "Rebouchage de saignées et fermeture de trous", "fft", ""], ["pose", "Création d’ouverture dans un mur (avec linteau)", "pc", "dimensions (cm)"], ["pose", "Pose de faux plafond (plaques de plâtre)", "m²", ""]]], ["🔲 Carrelage & sols", [["reno", "Décapage de carrelage au sol (chape et plinthes incluses), évacuation", "m²", ""], ["reno", "Décapage de revêtement mural et évacuation", "m²", ""], ["pose", "Fourniture et mise en place d’un fond d’accrochage", "m²", ""], ["pose", "Fourniture de carrelage de sol", "m²", "format (cm), ex. 60×60"], ["pose", "Fourniture de carrelage mural", "m²", "format (cm), ex. 60×30"], ["pose", "Pose de carrelage de sol, jointement en mortier", "m²", "format (cm)"], ["pose", "Pose de carrelage mural, jointement", "m²", "format (cm)"], ["pose", "Fourniture et pose de plinthes, joints silicone", "ml", "hauteur (cm)"], ["pose", "Découpes autour des cadres de porte", "pc", ""], ["pose", "Joints silicone sur angles verticaux et horizontaux", "ml", ""], ["pose", "Fourniture et pose de baguettes d’angle", "ml", "matière"], ["pose", "Fourniture et pose de parquet / sol stratifié / vinyle", "m²", "type, épaisseur (mm)"], ["rep", "Remplacement de carreaux cassés", "pc", "format (cm)"]]], ["💧 Plomberie & sanitaire", [["rep", "Recherche et réparation de fuite", "fft", "lieu"], ["rep", "Débouchage de canalisation / WC / évier", "fft", ""], ["rep", "Débouchage haute pression (colonne d’immeuble)", "h", ""], ["rep", "Remplacement de robinet / mitigeur", "pc", "marque, modèle"], ["rep", "Remplacement de mécanisme de chasse d’eau", "pc", ""], ["pose", "Démontage et évacuation du mobilier de salle de bain, WC, baignoire", "fft", ""], ["pose", "Fourniture et pose de conduites eau froide, eau chaude et écoulements", "fft", "appareils raccordés"], ["pose", "Réalisation d’une douche à l’italienne (chape en pente, isolation, caniveau, paroi)", "fft", "caniveau (cm), paroi (cm)"], ["pose", "Fourniture de bloc WC suspendu (bâti, cuvette, plaque) et habillage", "fft", "marque, modèle"], ["pose", "Fourniture de meuble de salle de bain (vasque, mitigeur, miroir)", "fft", "largeur (cm), modèle"], ["pose", "Fourniture de sèche-serviettes", "pc", "dimensions (mm)"], ["pose", "Fourniture de mitigeur de douche avec douchette", "pc", "modèle"], ["pose", "Montage de l’ensemble sanitaire et joints silicone", "fft", ""], ["pose", "Remplacement de chauffe-eau / boiler", "pc", "capacité (litres)"], ["ent", "Entretien de chaudière", "pc", "marque, modèle"], ["ent", "Purge et équilibrage des radiateurs", "pc", ""]]], ["⚡ Électricité", [["rep", "Dépannage électrique (recherche de panne)", "h", ""], ["rep", "Remplacement de prise / interrupteur", "pc", ""], ["pose", "Création d’un point lumineux ou d’une prise", "pc", ""], ["pose", "Remplacement de tableau électrique", "pc", "nombre de circuits"], ["pose", "Mise en conformité de l’installation", "fft", ""], ["pose", "Fourniture et pose de luminaire", "pc", "modèle"], ["pose", "Fourniture et pose de ventilateur d’aération (câblage inclus)", "pc", "diamètre (mm)"], ["pose", "Installation d’éclairage extérieur / potelets", "pc", ""], ["reno", "Enlèvement de luminaires existants et évacuation", "pc", ""], ["rep", "Vérification du câblage, offre si nécessaire", "fft", ""]]], ["🔐 Serrurerie", [["rep", "Ouverture de porte (claquée / fermée à clé)", "fft", "jour / nuit"], ["rep", "Remplacement de cylindre", "pc", "dimensions (mm), nombre de clés"], ["rep", "Réparation de serrure / gâche", "pc", ""], ["pose", "Pose de serrure multipoints / blindage", "pc", "modèle"], ["pose", "Pose de ferme-porte", "pc", ""], ["pose", "Reproduction de clés / badges", "pc", ""]]], ["🚪 Menuiserie & portes", [["pose", "Fourniture et pose de porte intérieure avec chambranle et poignée", "pc", "dimensions (mm), modèle"], ["pose", "Fourniture et pose de porte d’appartement coupe-feu", "pc", "dimensions (mm), classe (T30…)"], ["reno", "Démontage et évacuation d’anciennes portes", "pc", ""], ["rep", "Réglage / réparation de porte ou fenêtre", "pc", ""], ["pose", "Remplacement de vitrage", "pc", "dimensions (cm), type de verre"], ["pose", "Pose de cuisine / meubles", "fft", "longueur (cm)"], ["reno", "Dépose et évacuation de l’ancienne cuisine", "fft", ""], ["pose", "Pose de plinthes bois", "ml", ""]]], ["🔧 Bricolage & petits travaux", [["pose", "Montage de meubles", "pc", ""], ["pose", "Fixations murales (étagères, tringles, TV, miroirs)", "pc", ""], ["rep", "Petites réparations diverses", "h", ""], ["pose", "Pose de boîtes aux lettres / sonnettes", "pc", ""], ["pose", "Pose de stores / rideaux", "pc", "largeur (cm)"], ["rep", "Remplacement de joints silicone (cuisine, salle de bain)", "ml", ""]]], ["🌿 Jardinage & extérieurs", [["ent", "Tonte de pelouse", "m²", ""], ["ent", "Taille de haies", "ml", "hauteur (m)"], ["ent", "Taille d’arbres et d’arbustes", "pc", ""], ["ent", "Désherbage des allées et massifs", "m²", ""], ["ent", "Ramassage des feuilles et évacuation des déchets verts", "fft", ""], ["ent", "Déneigement et salage", "exécution", "surface (m²)"], ["ent", "Nettoyage haute pression de cour / terrasse (brosse rotative)", "m²", ""], ["pose", "Plantations et aménagement", "fft", ""]]], ["🧹 Nettoyage", [["ent", "Nettoyage des parties communes (forfait)", "mois", "fréquence par semaine"], ["ent", "Nettoyage du garage à l’autolaveuse", "exécution", "surface (m²)"], ["ent", "Nettoyage approfondi et détachage des escaliers", "exécution", "nombre d’étages"], ["ent", "Nettoyage des passerelles extérieures", "exécution", ""], ["ent", "Nettoyage des vitres", "m²", "hauteur (m)"], ["ent", "Nettoyage de fin de chantier / remise en état", "m²", ""], ["ent", "Nettoyage après déménagement / état des lieux", "fft", "surface (m²)"], ["ent", "Nettoyage des caves et greniers", "fft", ""]]], ["🗑️ Déchets & débarras", [["ent", "Sortie et rentrée des poubelles (contrat)", "mois", "jours de collecte"], ["ent", "Nettoyage et désinfection des conteneurs", "exécution", "nombre de conteneurs"], ["reno", "Débarras de cave / grenier / appartement", "m³", ""], ["reno", "Évacuation d’encombrants", "m³", ""], ["reno", "Collecte de déchets spéciaux (partenaire Arcolux)", "fft", "type de déchets"]]], ["🚚 Déménagement", [["pose", "Déménagement (main-d’œuvre)", "h", "nombre de déménageurs"], ["pose", "Camion avec chauffeur", "h", "volume (m³)"], ["pose", "Fourniture de cartons et protections", "fft", ""], ["pose", "Démontage et remontage de meubles", "fft", ""], ["pose", "Monte-meubles", "h", "étage"]]], ["⏱️ Régie", [["rep", "Travaux en régie (par heure et par personne, hors déplacement)", "h", "nombre de personnes"], ["rep", "Déplacement", "fft", ""]]]];
// Protocole d'entretien (contrat) : [fréquence par défaut h/m/t/a, prestation]
const DEV_PROTO = [["h", "Balayage / aspiration et lavage des sols des entrées, paliers et escaliers"], ["h", "Nettoyage des ascenseurs : sols, miroirs, boutons, portes et rails"], ["h", "Nettoyage des mains courantes et garde-corps"], ["h", "Enlèvement des traces sur les portes communes et portes d’entrée"], ["h", "Nettoyage des vitrages des portes d’entrée"], ["h", "Nettoyage humide des boîtes aux lettres et interphones"], ["h", "Entretien courant du local poubelles"], ["h", "Ramassage des feuilles, papiers et déchets dans les zones extérieures, rampe de garage comprise"], ["m", "Nettoyage des couloirs de caves"], ["m", "Nettoyage des buanderies : sols et surfaces communes accessibles"], ["m", "Enlèvement des toiles d’araignées visibles"], ["m", "Nettoyage des plinthes"], ["t", "Nettoyage complet des portes communes et encadrements"], ["t", "Dépoussiérage des luminaires accessibles"], ["t", "Nettoyage des traces sur les surfaces murales lavables"], ["t", "Nettoyage des locaux techniques accessibles"], ["t", "Dépoussiérage des équipements communs accessibles"], ["t", "Nettoyage des vitrages communs hors portes d’entrée"], ["t", "Dépoussiérage des grilles de ventilation accessibles"], ["t", "Dépoussiérage des conduites et installations techniques accessibles"], ["t", "Dépoussiérage en hauteur et enlèvement des toiles d’araignées accessibles"], ["a", "Nettoyage du garage à l’autolaveuse (facturé à part)"], ["a", "Nettoyage des passerelles extérieures"]];
const DEV_UNITS = ['fft', 'm²', 'ml', 'm³', 'pc', 'h', 'kg', 'exécution', 'mois'];
const DEV_PTYPE = { rep: '🚨 dépannage', pose: '🔩 installation', reno: '🏠 rénovation', ent: '🧽 entretien', diag: '🔎 diagnostic' };
const devCatItem = (key) => { const m = /^c(\d+)i(\d+)$/.exec(key || ''); return m && DEV_CAT[+m[1]] ? DEV_CAT[+m[1]][1][+m[2]] || null : null; };
const devPrestTot = (p) => r2((p.q === '' || p.q == null ? 1 : num(p.q)) * num(p.pu));
const devQty = (p) => String(p.q === '' || p.q == null ? 1 : num(p.q)).replace('.', ',');
function devCalc(d) {
  const rows = (d.chef && d.chef.rows) || [], dir = (d.dir && d.dir.rows) || [];
  const lines = rows.map((r, n) => { const t = num((dir[n] || {}).taux), hh = num(r.nb || 1) * num(r.h); return { ...r, w: (dir[n] || {}).w || '', taux: t, hh, mt: r2(hh * t) }; });
  const ct = d.kind === 'contrat', prest = (d.prest || []).map((p) => ({ ...p, mt: devPrestTot(p) }));
  const mo = ct ? 0 : r2(sum(lines, (l) => l.mt)), dep = ct ? 0 : r2(num(d.dir && d.dir.depl)), mat = ct ? 0 : r2(sum((d.dir && d.dir.mat) || [], (m) => num(m.ht)));
  const pr = ct ? 0 : r2(sum(prest, (p) => p.mt)), forfait = ct ? r2(num(d.ct && d.ct.forfait)) : 0;
  const sub = ct ? forfait : r2(mo + dep + mat + pr), rem = r2((sub * num(d.dir && d.dir.remise)) / 100), ht = r2(sub - rem);
  const taux = d.dir && d.dir.tva !== '' && d.dir.tva != null ? num(d.dir.tva) : num(factConf().taux);
  const tva = r2((ht * taux) / 100), ttc = r2(ht + tva);
  const pct = ct ? 0 : d.dir && d.dir.acompte != null && d.dir.acompte !== '' ? +d.dir.acompte : devAcompteConseil(ttc);
  return { ct, prest, lines, mo, dep, mat, pr, forfait, sub, rem, ht, taux, tva, ttc, pct, acompte: r2((ttc * pct) / 100) };
}
// état et pastille : 🟢 en attente · 🟡 3 derniers jours · 🔴 expiré (à 00:00) · 🟣 particulier dans les 14 jours de rétractation
function devState(d) {
  const t = today();
  if (d.st === 'refuse') return { k: 'refuse', lbl: '❌ Refusé', open: false };
  if (d.st === 'accepte') {
    const acc = (d.acc || '').slice(0, 10) || t, end = addDays(acc, DEV_RETRACT);
    if (d.tacheId) return { k: 'done', lbl: '➡️ Intervention créée', open: false };
    if (d.client && d.client.type === 'part' && t <= end) return { k: 'purple', lbl: `🟣 Rétractation possible jusqu’au ${fmtDate(end)}${d.sign && d.sign.early ? ' · début anticipé demandé' : ''}`, open: true, end };
    return { k: 'ok', lbl: '✅ Accepté — libre de commencer', open: true };
  }
  if (d.st === 'brouillon' || !d.st) return { k: 'draft', lbl: '📝 Brouillon', open: false };
  const until = addDays(d.date || t, num((d.dir || {}).valid) || 30);
  const left = Math.round((Date.parse(until + 'T12:00:00') - Date.parse(t + 'T12:00:00')) / 864e5);
  const rv = d.st === 'revision' ? '🔄 Révision demandée · ' : '';
  if (left < 0) return { k: 'red', lbl: `${rv}🔴 Expiré le ${fmtDate(until)} à minuit`, open: true, until };
  if (left <= 3) return { k: 'yellow', lbl: `${rv}🟡 Expire ${left === 0 ? 'ce soir à minuit' : `dans ${left} jour${left > 1 ? 's' : ''}`} (${fmtDate(until)})`, open: true, until };
  return { k: 'green', lbl: `${rv}🟢 En attente — valable jusqu’au ${fmtDate(until)}`, open: true, until };
}
// cronologie du devis (envoi, révision, nouvelle version, accord, refus) : pour les temps de réponse des statistiques
const devH = (d, st, at = Date.now()) => ({ hist: [...((d && d.hist) || []), { st, at }] });
const devSentAt = (d) => { const h = (d.hist || []).find((x) => x.st === 'envoye'); return h ? h.at : Date.parse(d.sentAt || '') || 0; };
const devDecAt = (d) => (d.st === 'accepte' ? Date.parse(d.acc || '') || (d.decision && d.decision.at) || 0 : d.st === 'refuse' ? (d.decision && d.decision.at) || 0 : 0);
const durTxt = (ms) => { if (ms == null || ms < 0) return '—'; const m = Math.round(ms / 60000); if (m < 60) return `${Math.max(1, m)} min`; const h = Math.round(m / 60); if (h < 48) return `${h} h`; return `${Math.round(h / 24)} jours`; };
// Statistiques → 📝 Devis : émis, acceptés, refusés, rediscutés, expirés ; taux, montants, temps de réponse
function devStatsHtml(y) {
  const all = vault.list('devis').filter((d) => d.st !== 'brouillon' && (d.date || '').startsWith(String(y)));
  if (!all.length) return html`<div class="section-label">📝 Devis ${y}</div><p class="muted small">Aucun devis envoyé en ${y}.</p>`;
  const acc = all.filter((d) => d.st === 'accepte'), ref = all.filter((d) => d.st === 'refuse'), rev = all.filter((d) => (d.rev || 0) > 0 || d.st === 'revision');
  const exp = all.filter((d) => devState(d).k === 'red'), open = all.filter((d) => ['green', 'yellow', 'purple'].includes(devState(d).k) || d.st === 'revision');
  const decided = [...acc, ...ref].filter((d) => devSentAt(d) && devDecAt(d) >= devSentAt(d)).map((d) => ({ d, ms: devDecAt(d) - devSentAt(d) }));
  const avg = decided.length ? decided.reduce((n, x) => n + x.ms, 0) / decided.length : null;
  const fast = decided.slice().sort((a, b) => a.ms - b.ms)[0], slow = decided.slice().sort((a, b) => b.ms - a.ms)[0];
  const tot = (L) => L.reduce((n, d) => n + devCalc(d).ttc, 0);
  const rate = acc.length + ref.length ? Math.round((acc.length / (acc.length + ref.length)) * 100) : null;
  const byType = Object.entries(DEV_TYPES).map(([k, l]) => { const L = all.filter((d) => (d.client || {}).type === k), a = L.filter((d) => d.st === 'accepte').length; return [l, L.length, a]; }).filter((x) => x[1]);
  const lbl = { accepte: '✅ accepté', refuse: '❌ refusé' };
  const rows = decided.sort((a, b) => devDecAt(b.d) - devDecAt(a.d)).slice(0, 30);
  return html`<div class="section-label">📝 Devis ${y}</div>
    <div class="metrics">
      <div class="metric"><div class="lbl">Envoyés</div><div class="val">${all.length}</div><div class="sub">${eur(tot(all))} TTC</div></div>
      <div class="metric"><div class="lbl">✅ Acceptés</div><div class="val green">${acc.length}</div><div class="sub">${eur(tot(acc))} TTC</div></div>
      <div class="metric"><div class="lbl">❌ Refusés</div><div class="val ${ref.length ? 'red' : ''}">${ref.length}</div><div class="sub">${rate == null ? '' : rate + ' % acceptés'}</div></div>
      <div class="metric"><div class="lbl">🔄 Rediscutés</div><div class="val">${rev.length}</div><div class="sub">au moins une révision</div></div>
      <div class="metric"><div class="lbl">⏱️ Réponse</div><div class="val">${durTxt(avg)}</div><div class="sub">délai moyen</div></div>
      <div class="metric"><div class="lbl">En cours / expirés</div><div class="val">${open.length} / <span class="${exp.length ? 'red' : ''}">${exp.length}</span></div><div class="sub">${acc.filter((d) => d.tacheId).length} devenus interventions</div></div>
    </div>
    ${fast ? html`<p class="small" style="margin:8px 0">⚡ Le plus rapide : <b>${devClient(fast.d)}</b> en ${durTxt(fast.ms)} · 🐢 le plus lent : <b>${devClient(slow.d)}</b> en ${durTxt(slow.ms)}</p>` : ''}
    ${byType.length > 1 ? html`<p class="small muted" style="margin:0 0 8px">${byType.map(([l, n, a]) => html`${l} : ${a}/${n} acceptés · `)}</p>` : ''}
    ${rows.length ? html`<div class="list">${rows.map(({ d, ms }) => html`<button class="row" data-action="dev-open" data-id="${d.id}">${devBall(d)}<span class="grow"><span class="title" style="display:block;white-space:normal">${devNo(d)}</span><span class="meta">${devClient(d)} · ${lbl[d.st]} en <b>${durTxt(ms)}</b>${d.rev ? ` · après ${d.rev} révision${d.rev > 1 ? 's' : ''}` : ''}</span></span><b style="white-space:nowrap">${eur(devCalc(d).ttc)}</b></button>`)}</div>` : ''}
    <p style="margin:10px 0 0"><button class="btn sm" data-action="dev-csv" data-y="${y}">${icon('download')} Export CSV des devis ${y}</button></p>
    <p class="tiny muted">Temps de réponse : du premier envoi (PDF, WhatsApp, email ou portail) à la signature, à « Accepté / Refusé » ou à la réponse de la gérance.</p>`;
}
const devBall = (d) => html`<span class="dball dball-${devState(d).k}" aria-hidden="true"></span>`;
const devClient = (d) => (d.client && d.client.nom) || '—';
const devOpen = () => vault.list('devis').filter((d) => devState(d).open).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
function devRow(d) {
  const s = devState(d), k = devCalc(d);
  return html`<button class="row dev-row" data-action="dev-open" data-id="${d.id}">${devBall(d)}
    <span class="grow"><span class="title" style="display:block;white-space:normal">${devNo(d)}${d.titre ? html` <span class="muted small">— ${d.titre}</span>` : ''}</span>
      <span class="meta" style="white-space:normal">${d.client && d.client.type === 'ger' ? orgLogo(d.client.orgId) : d.client && d.client.type === 'pro' ? '🏢' : '👤'} ${devClient(d)}${d.chantier ? ' · ' + d.chantier : ''}</span>
      <span class="meta" style="display:block;white-space:normal">${s.lbl}${d.ptlSt === 'envoye' && d.st !== 'accepte' ? ' · 📤 dans son portail' : ''}</span></span>
    <b style="white-space:nowrap">${eur(k.ttc)}${k.ct ? html`<span class="tiny muted"> / mois</span>` : ''}</b></button>`;
}
// bandeau de l'accueil : « DEVIS EN COURS », violet qui clignote
// réponses des gérances : relues en ouvrant l'Accueil ou l'onglet Devis (au plus toutes les 15 s), sinon toutes les 30 s
let devSyncAt = 0;
const devSyncSoon = () => { if (Date.now() - devSyncAt > 15000) { devSyncAt = Date.now(); setTimeout(devSync, 0); } };
function devBanner() {
  devSyncSoon();
  const L = devOpen();
  if (!L.length) return '';
  return html`<div class="dev-banner" style="margin-bottom:14px"><div class="section-label" style="margin:0 0 8px;color:#7c3aed">📝 Devis en cours (${L.length})</div>
    <div class="list">${L.map((d) => { const s = devState(d); return html`<div class="dev-bline">${devRow(d)}
      <div class="dev-bact">${s.k === 'ok' ? html`<button class="btn sm primary" data-action="dev-tache" data-id="${d.id}">➡️ Créer l’intervention</button>`
        : s.k === 'purple' ? html`<span class="tiny" style="color:#7c3aed">Le client peut encore se rétracter. Ensuite : « ➡️ Créer l’intervention ».</span>`
        : html`<button class="btn sm" data-action="dev-acc" data-id="${d.id}">✅ Accepté</button><button class="btn sm ghost danger" data-action="dev-ref" data-id="${d.id}">❌ Refusé</button>`}</div></div>`; })}</div></div>`;
}
// onglet Maintenance → Devis
function devTab() {
  devSyncSoon();
  const all = vault.list('devis').sort((a, b) => (b.created || '').localeCompare(a.created || ''));
  const open = all.filter((d) => devState(d).open), drafts = all.filter((d) => devState(d).k === 'draft'), done = all.filter((d) => !devState(d).open && devState(d).k !== 'draft').slice(0, ui.cpLim || 10);
  const c = factConf();
  return html`<p class="small muted" style="margin:0 0 10px">Sur place : photos, rapport et ouvriers prévus (🦺 chef de chantier). Ensuite les prix (👔 directeur), la signature du client et l’envoi (PDF, WhatsApp, email ou portail de la gérance).</p>
    ${c.autorisation ? '' : html`<div class="alert warn" style="margin-bottom:12px">⚠️<div>Ajoutez le <b>n° d’autorisation d’établissement</b> dans <a href="#" data-action="fact-set">🧾 Facturation</a> : il est imprimé sur chaque devis.</div></div>`}
    <p style="margin:0 0 6px"><span class="tiny muted">🟢 en attente · 🟡 expire bientôt (3 derniers jours) · 🔴 expiré à minuit · 🟣 particulier : délai de rétractation de 14 jours · ✅ accepté</span></p>
    ${open.length ? html`<div class="section-label">En cours (${open.length})</div><div class="list" style="margin-bottom:14px">${open.map(devRow)}</div>` : ''}
    ${drafts.length ? html`<div class="section-label">Brouillons (${drafts.length})</div><div class="list" style="margin-bottom:14px">${drafts.map(devRow)}</div>` : ''}
    ${done.length ? html`<div class="section-label">Terminés</div><div class="list">${done.map(devRow)}</div>` : ''}
    ${!all.length ? empty('file', 'Aucun devis pour l’instant.', html`<button class="btn primary" data-action="dev-new">${icon('plus')} Nouveau devis</button>`) : ''}`;
}
// formulaire : lignes du chef (métier · nombre d'ouvriers · heures par ouvrier)
const devChefRow = (n, r = {}) => html`<div class="dev-crow" data-n="${n}"><select name="met${n}" data-input="dev-chef" aria-label="Métier"><option value="">— métier —</option>${Object.entries(METIERS).map(([k, v]) => html`<option value="${k}" ${r.met === k ? new Raw('selected') : ''}>${MET_ICON[k] || '👷'} ${v}</option>`)}</select>
  <span class="sfx"><input name="nb${n}" type="number" min="1" max="99" inputmode="numeric" value="${r.nb || ''}" placeholder="1" data-input="dev-chef" aria-label="Nombre d’ouvriers"><i>ouvr.</i></span>
  <span class="sfx"><input name="h${n}" type="number" step="0.5" min="0" inputmode="decimal" value="${r.h || ''}" placeholder="0" data-input="dev-chef" aria-label="Heures par ouvrier"><i>h</i></span></div>`;
const devRate = (w) => { if (!w) return 0; const m = 1 + num(factConf().marge) / 100; return w.tauxH || (w.payeH ? r2(w.payeH * m) : 0); };
// cadre du directeur : un ouvrier et un tarif pour chaque ligne du chef
function devDirHtml(chefRows, dirRows) {
  const rows = chefRows.map((r, n) => [r, n]).filter(([r]) => r.met || num(r.h));
  if (!rows.length) return html`<p class="tiny muted" style="margin:0">Les lignes du chef de chantier (métier, ouvriers, heures) apparaissent ici pour choisir l’ouvrier et le tarif.</p>`;
  const ints = vault.list('intervenants').filter((i) => !i.archive);
  return rows.map(([r, n]) => {
    const dr = dirRows[n] || {}, cand = ints.filter((i) => !r.met || i.metier === r.met).concat(ints.filter((i) => r.met && i.metier !== r.met));
    return html`<div class="dev-drow"><span class="small"><b>${num(r.nb || 1)} × ${METIERS[r.met] || 'ouvrier'}</b> × ${String(num(r.h)).replace('.', ',')} h = <b>${String(num(r.nb || 1) * num(r.h)).replace('.', ',')} h</b></span>
      <select name="dw${n}" data-input="dev-w" aria-label="Ouvrier"><option value="">— tarif libre —</option>${cand.map((i) => html`<option value="${i.id}" data-rate="${devRate(i)}" ${dr.w === i.id ? new Raw('selected') : ''}>${metIcon(i)} ${intervFull(i)}${devRate(i) ? ' · ' + eur(devRate(i)) + '/h' : ''}</option>`)}</select>
      <span class="sfx"><input name="dt${n}" type="number" ${new Raw(money$)} value="${dr.taux ?? ''}" placeholder="€/h" aria-label="Tarif horaire HT"><i>€/h HT</i></span></div>`;
  });
}
function devRead(fm) {
  const fd = new FormData(fm), g = (k) => String(fd.get(k) || '').trim();
  const rows = [], dir = [], mat = [];
  for (let n = 0; n < 40; n++) {
    if (!fd.has(`met${n}`)) continue;
    rows[n] = { met: g(`met${n}`), nb: num(fd.get(`nb${n}`)) || (g(`met${n}`) || num(fd.get(`h${n}`)) ? 1 : 0), h: num(fd.get(`h${n}`)) };
    dir[n] = { w: g(`dw${n}`), taux: fd.has(`dt${n}`) && g(`dt${n}`) !== '' ? num(fd.get(`dt${n}`)) : '' };
  }
  for (let n = 0; n < 30; n++) if (fd.has(`ml${n}`)) { const lib = g(`ml${n}`), ht = num(fd.get(`mh${n}`)); if (lib || ht) mat.push({ lib, ht }); }
  const keep = rows.map((r, n) => [r, dir[n] || {}]).filter(([r]) => r && (r.met || r.h));
  // prestations cochées (catalogue) + lignes libres : quantité, unité, détails ; prix unitaire (directeur)
  const prest = [];
  const pq = (key, l) => prest.push({ k: key, l, q: g('pq_' + key) === '' ? '' : num(fd.get('pq_' + key)), u: g('pu_' + key) || 'fft', det: g('pd_' + key), pu: g('pp_' + key) === '' ? '' : num(fd.get('pp_' + key)) });
  for (const key of fd.getAll('pk')) { const it = devCatItem(key); if (it) pq(key, it[1]); }
  for (let n = 0; n < 80; n++) if (fd.has('pl_f' + n) && g('pl_f' + n)) pq('f' + n, g('pl_f' + n));
  const kind = g('dkind') === 'contrat' ? 'contrat' : 'travaux', proto = [];
  for (let n = 0; n < 200; n++) {
    if (!fd.has('frl' + n)) continue;
    const f = {}; for (const x of ['h', 'm', 't', 'a']) if (fd.get(`fr${n}_${x}`)) f[x] = 1;
    if (g('frl' + n) && Object.keys(f).length) proto.push({ l: g('frl' + n), f });
  }
  return {
    kind, prest, proto: kind === 'contrat' ? proto : undefined,
    ct: { forfait: g('cforfait') === '' ? '' : num(fd.get('cforfait')), pass: g('cpass'), agents: g('cagents'), duree: num(fd.get('cduree')) || 12, preavis: num(fd.get('cpreavis')) || 3, cote: g('ccote'), pay: num(fd.get('cpay')) || 15 },
    titre: g('titre'), chantier: g('chantier'), interloc: g('interloc'),
    client: { type: DEV_TYPES[g('ctype')] ? g('ctype') : 'part', orgId: g('org'), nom: g('cnom'), rcs: g('crcs').toUpperCase().replace(/\s+/g, ''), tva: g('ctva').toUpperCase().replace(/\s+/g, ''), adresse: g('cadr'), tel: g('ctel'), email: g('cmail') },
    chef: { rapport: String(fd.get('rapport') || '').trim(), jours: g('jours'), rows: keep.map(([r]) => r) },
    dir: { rows: keep.map(([, d]) => d), depl: g('depl') === '' ? '' : num(fd.get('depl')), mat, remise: num(fd.get('remise')), tva: g('tva') === '' ? '' : num(fd.get('tva')), acompte: g('acompte') === '' ? '' : +g('acompte'), valid: Math.max(1, Math.round(num(fd.get('valid')))) || 30, delai: g('delai') },
  };
}
// cadre « Prestations » : catalogue par catégorie, cases à cocher, quantité + unité + détails (mesures en cm / mm…)
const devPq = (key, p, ph) => html`<div class="dev-pq"><input name="pq_${key}" type="number" step="0.01" min="0" inputmode="decimal" value="${p.q ?? ''}" placeholder="Qté" aria-label="Quantité"><select name="pu_${key}" aria-label="Unité">${DEV_UNITS.map((u) => html`<option ${u === p.u ? new Raw('selected') : ''}>${u}</option>`)}</select><input name="pd_${key}" value="${p.det || ''}" placeholder="${ph || 'détails : mesures (cm), format, couleur, modèle…'}" aria-label="Détails"></div>`;
const devFreeRow = (n, p = {}) => html`<div class="dev-pi dev-free"><input name="pl_f${n}" value="${p.l || ''}" placeholder="Autre prestation (ex. Pose d’une crédence en verre)" aria-label="Prestation">${devPq('f' + n, { q: p.q, u: p.u || 'fft', det: p.det }, '')}</div>`;
const devProtoRow = (n, r = { f: {} }) => html`<div class="dev-proto-r">${r.base ? html`<span class="small">${r.l}</span><input type="hidden" name="frl${n}" value="${r.l}">` : html`<input name="frl${n}" value="${r.l || ''}" placeholder="Autre prestation d’entretien">`}${['h', 'm', 't', 'a'].map((x) => html`<input type="checkbox" name="fr${n}_${x}" value="1" ${r.f && r.f[x] ? new Raw('checked') : ''} aria-label="${({ h: 'Hebdomadaire', m: 'Mensuel', t: 'Trimestriel', a: 'Annuel' })[x]}">`)}</div>`;
function devPrestBox(d) {
  const sel = Object.fromEntries((d.prest || []).filter((p) => /^c\d+i\d+$/.test(p.k)).map((p) => [p.k, p]));
  const free = (d.prest || []).filter((p) => /^f\d+$/.test(p.k)).map((p) => [+p.k.slice(1), p]);
  let nx = free.reduce((m, [n]) => Math.max(m, n + 1), 0);
  while (free.length < 2) free.push([nx++, {}]);
  const saved = d.kind === 'contrat' && Array.isArray(d.proto) ? d.proto : null;
  const prows = DEV_PROTO.map(([f, l]) => { const s0 = saved && saved.find((x) => x.l === l); return { l, base: 1, f: s0 ? s0.f : saved ? {} : { [f]: 1 } }; });
  for (const s0 of saved || []) if (!DEV_PROTO.some(([, l]) => l === s0.l)) prows.push({ l: s0.l, f: s0.f });
  return html`<fieldset class="full dev-box dev-prest"><legend>📋 Prestations / description des travaux</legend>
    <p class="tiny muted full" style="margin:0">Le chef de chantier coche les travaux et note la quantité, l’unité et les détails (mesures en cm / mm, format, couleur, modèle). Le directeur met les prix plus bas.</p>
    <div class="search full" style="margin:0">${icon('search')}<input type="search" data-input="dev-psearch" placeholder="Rechercher : carrelage, fuite, peinture, porte…" autocomplete="off"></div>
    <div class="full dev-pcats">${DEV_CAT.map(([cat, items], ci) => { const n = items.filter((_, ii) => sel[`c${ci}i${ii}`]).length; return html`<details class="dev-pg"${n ? new Raw(' open') : ''}><summary>${cat} <b class="dev-pn"${n ? '' : new Raw(' hidden')}>${n}</b></summary>
      ${items.map(([t, l, u, det], ii) => { const key = `c${ci}i${ii}`, p = sel[key]; return html`<div class="dev-pi" data-l="${(l + ' ' + cat).toLowerCase()}"><label><input type="checkbox" name="pk" value="${key}"${p ? new Raw(' checked') : ''}> <span>${l}</span> <span class="tiny muted">· ${DEV_PTYPE[t] || ''}</span></label>${devPq(key, p || { q: '', u, det: '' }, det ? 'détails : ' + det : '')}</div>`; })}</details>`; })}</div>
    <div class="full"><div class="section-label" style="margin:4px 0 6px">Autres travaux (texte libre)</div><div id="devFree">${free.map(([n, p]) => devFreeRow(n, p))}</div>
      <button type="button" class="btn sm" data-action="dev-free-add">${icon('plus')} Ligne libre</button></div>
    <div class="full dev-k-ct"><div class="section-label" style="margin:6px 0 6px">Protocole d’entretien (parties communes)</div>
      <div class="dev-proto" id="devProto"><div class="dev-proto-r dev-proto-h"><span></span><b>Hebdo.</b><b>Mens.</b><b>Trim.</b><b>Annuel</b></div>${prows.map((r, n) => devProtoRow(n, r))}</div>
      <button type="button" class="btn sm" data-action="dev-proto-add">${icon('plus')} Ligne</button>
      <p class="tiny muted" style="margin:4px 0 0">Une ligne sans case cochée n’apparaît pas dans le contrat. Les prestations cochées plus haut deviennent les prestations ponctuelles (prix par exécution).</p></div>
  </fieldset>`;
}
// prix des prestations (directeur) : prix unitaire HT par ligne
function devPDirHtml(d) {
  const L = d.prest || [];
  if (!L.length) return html`<p class="tiny muted" style="margin:0">Les prestations cochées dans « 📋 Prestations » apparaissent ici pour mettre le prix unitaire.</p>`;
  return html`<div class="section-label" style="margin:0 0 6px">${d.kind === 'contrat' ? 'Prestations ponctuelles — prix par exécution' : 'Prix des prestations'}</div>
    ${L.map((p) => html`<div class="dev-drow"><span class="small"><b>${p.l}</b>${p.det ? html` <span class="muted">— ${p.det}</span>` : ''}<span class="muted" style="display:block">${devQty(p)} ${p.u || ''}</span></span>
      <span class="sfx"><input name="pp_${p.k}" type="number" ${new Raw(money$)} value="${p.pu ?? ''}" placeholder="Prix unitaire" aria-label="Prix unitaire HT"><i>€ HT / ${p.u || 'u.'}</i></span>
      <b class="small" style="text-align:right">${p.pu !== '' && p.pu != null ? eur(devPrestTot(p)) : ''}</b></div>`)}`;
}
function devTotHtml(d) {
  const k = devCalc(d);
  if (k.ct) return html`<div class="kv-tot"><span>Forfait mensuel HT</span><b>${eur(k.forfait)}</b>${k.rem ? html`<span>Remise ${String(num(d.dir.remise)).replace('.', ',')} %</span><b>− ${eur(k.rem)}</b>` : ''}<span>TVA ${String(k.taux).replace('.', ',')} %</span><b>${eur(k.tva)}</b><span class="big">Total TTC / mois</span><b class="big">${eur(k.ttc)}</b></div>${k.prest.length ? html`<p class="tiny muted" style="margin:4px 0 0">+ ${k.prest.length} prestation(s) ponctuelle(s), facturée(s) à chaque exécution.</p>` : ''}`;
  return html`${k.pr ? html`<div class="kv-tot" style="margin-bottom:0"><span>Prestations</span><b>${eur(k.pr)}</b></div>` : ''}<div class="kv-tot"><div class="kv-tot"><span>Main-d’œuvre</span><b>${eur(k.mo)}</b><span>Déplacement</span><b>${eur(k.dep)}</b><span>Matériel</span><b>${eur(k.mat)}</b>${k.rem ? html`<span>Remise ${String(num(d.dir.remise)).replace('.', ',')} %</span><b>− ${eur(k.rem)}</b>` : ''}
    <span>Total HT</span><b>${eur(k.ht)}</b><span>TVA ${String(k.taux).replace('.', ',')} %</span><b>${eur(k.tva)}</b><span class="big">Total TTC</span><b class="big">${eur(k.ttc)}</b>
    <span>Acompte ${k.pct} %</span><b>${eur(k.acompte)}</b></div>${k.pct !== devAcompteConseil(k.ttc) ? html`<p class="tiny muted" style="margin:4px 0 0">Acompte conseillé pour ce montant : ${devAcompteConseil(k.ttc)} %</p>` : ''}`;
}
Object.assign(SHEETS, {
  devis({ id }) {
    const d = id ? vault.get('devis', id) : { st: 'brouillon', client: { type: 'part' }, chef: { rows: [] }, dir: { rows: [], valid: 30 } };
    if (id && !d) return null;
    const c = factConf(), cl = d.client || {}, chef = d.chef || {}, dir = d.dir || {};
    const crows = [...(chef.rows || [])]; while (crows.length < 3) crows.push({});
    const mats = [...(dir.mat || [])]; while (mats.length < 2) mats.push({});
    const orgs = (ui.ptl.data && ui.ptl.data.orgs) || [];
    const ph = id ? devPhotos(id) : [], s = devState(d), k = devCalc(d);
    const acts = id ? html`<div class="card dev-acts" style="margin-bottom:12px;padding:12px">
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">${devBall(d)}<b class="grow">${s.lbl}</b></div>
        ${d.decision && d.decision.note ? html`<p class="small" style="margin:0 0 8px">💬 <b>${d.decision.by || 'La gérance'}</b> : ${d.decision.note}</p>` : ''}
        ${d.sign ? html`<p class="tiny muted" style="margin:0 0 8px">✍️ Signé par ${d.sign.nom || 'le client'} le ${fmtDateTime(Date.parse(d.sign.at) || 0)}${d.sign.early ? ' · début des travaux avant la fin du délai de rétractation demandé' : ''}</p>` : ''}
        <div class="dev-btns">
          <button class="btn sm" data-action="dev-pdf" data-id="${id}">📄 PDF / imprimer</button>
          <button class="btn sm" data-action="dev-share" data-id="${id}" data-via="wa">💬 WhatsApp</button>
          <button class="btn sm" data-action="dev-share" data-id="${id}" data-via="mail">✉️ Email</button>
          ${cl.type !== 'ger' && d.st !== 'accepte' && d.st !== 'refuse' ? html`<button class="btn sm" data-action="dev-link" data-id="${id}">🔗 Lien / QR code${d.pubId ? ' ✓' : ''}</button>` : ''}
          ${cl.type === 'ger' && cl.orgId && d.st !== 'accepte' && d.st !== 'refuse' ? html`<button class="btn sm" data-action="dev-ptl" data-id="${id}">📤 ${d.ptlSt ? 'Renvoyer' : 'Envoyer'} au portail de la gérance</button>` : ''}
          ${d.st !== 'accepte' && d.st !== 'refuse' ? html`<button class="btn sm primary" data-action="dev-sign" data-id="${id}">✍️ Faire signer le client</button><button class="btn sm" data-action="dev-acc" data-id="${id}">✅ Accepté</button><button class="btn sm ghost danger" data-action="dev-ref" data-id="${id}">❌ Refusé</button>` : ''}
          ${s.k === 'ok' ? html`<button class="btn sm primary" data-action="dev-tache" data-id="${id}">➡️ Créer l’intervention</button>` : ''}
          ${d.st !== 'brouillon' && !d.tacheId ? html`<button class="btn sm ghost" data-action="dev-rev" data-id="${id}">🔄 Nouvelle version (R${(d.rev || 0) + 1})</button>` : ''}
          ${d.tacheId && vault.get('taches', d.tacheId) ? html`<button class="btn sm ghost" data-action="edit-tache" data-id="${d.tacheId}">🛠️ Voir l’intervention</button>` : ''}
          <button class="btn sm ghost danger" data-action="dev-del" data-id="${id}">Supprimer</button></div></div>` : '';
    return {
      title: id ? `📝 Devis ${devNo(d)}` : '📝 Nouveau devis',
      body: html`${acts}<form id="f" data-form="devis" class="fields" data-kind="${d.kind === 'contrat' ? 'contrat' : 'travaux'}"><input type="hidden" name="id" value="${id || ''}">
        <label class="field full">Type de devis<select name="dkind" data-input="dev-kind"><option value="travaux">🛠️ Travaux — prix par prestation</option><option value="contrat" ${d.kind === 'contrat' ? new Raw('selected') : ''}>🧹 Contrat d’entretien — forfait mensuel + protocole</option></select></label>
        <div class="section-label full" style="margin:0">Client</div>
        <label class="field">Type de client<select name="ctype" data-input="dev-ctype">${Object.entries(DEV_TYPES).filter(([kk]) => kk !== 'ger' || orgs.length || cl.type === 'ger').map(([kk, v]) => html`<option value="${kk}" ${cl.type === kk ? new Raw('selected') : ''}>${v}</option>`)}</select></label>
        <label class="field dev-ger" ${cl.type === 'ger' ? '' : new Raw('hidden')}>Gérance<select name="org" data-input="dev-org"><option value="">— choisir —</option>${orgs.map((o) => html`<option value="${o.id}" ${cl.orgId === o.id ? new Raw('selected') : ''}>${o.name}</option>`)}</select></label>
        <label class="field">Nom / raison sociale<input name="cnom" required value="${cl.nom || ''}" placeholder="ex. Mario Rossi, Gérance du Centre S.A."></label>
        <label class="field dev-soc" ${cl.type === 'part' ? new Raw('hidden') : ''}>RCS <span class="red">*</span><input name="crcs" value="${cl.rcs || ''}" placeholder="B123456" autocapitalize="characters"></label>
        <label class="field dev-soc" ${cl.type === 'part' ? new Raw('hidden') : ''}>N° TVA<input name="ctva" value="${cl.tva || ''}" placeholder="LU12345678" autocapitalize="characters"></label>
        <label class="field full">Adresse du client<textarea name="cadr" style="min-height:52px" placeholder="rue, n°, code postal, ville">${cl.adresse || ''}</textarea></label>
        <label class="field">Téléphone (WhatsApp)<input type="tel" name="ctel" value="${cl.tel || ''}" placeholder="+352…"></label>
        <label class="field">Email<input type="email" name="cmail" value="${cl.email || ''}"></label>
        <label class="field full">Objet du devis<input name="titre" value="${d.titre || ''}" placeholder="ex. Remise en état des appartements et du commerce"></label>
        <label class="field">Adresse du chantier<input name="chantier" value="${d.chantier || ''}" placeholder="si différente de celle du client"></label>
        <label class="field">Interlocuteur sur place<input name="interloc" value="${d.interloc || ''}" placeholder="ex. M. Pierre Loan"></label>
        <fieldset class="full dev-box dev-chef"><legend>🦺 À remplir par le chef de chantier</legend>
          <label class="field full">📷 Photos (2 à 20)<input type="file" name="photos" accept="image/*" multiple></label>
          ${ph.length ? html`<div class="dev-ph full">${ph.map((p) => html`<figure><img data-edl="${p.id}" alt=""><button type="button" class="btn icon sm ghost" data-action="dev-ph-del" data-id="${p.id}" aria-label="Retirer la photo">${icon('x')}</button></figure>`)}</div><p class="tiny muted full" style="margin:-4px 0 0">${ph.length} / 20 photo(s)</p>` : ''}
          <label class="field full">Rapport du chantier (ce qu’il faut faire)<textarea name="rapport" style="min-height:110px" placeholder="Constats, travaux à prévoir, accès, remarques…">${chef.rapport || ''}</textarea></label>
          <div class="full"><div class="section-label" style="margin:0 0 6px">Ouvriers prévus (métier · nombre · heures par ouvrier)</div><div id="devRows">${crows.map((r, n) => devChefRow(n, r))}</div>
            <button type="button" class="btn sm" data-action="dev-row-add">${icon('plus')} Ligne</button></div>
          <label class="field">Durée prévue<input name="jours" value="${chef.jours || ''}" placeholder="ex. 3 jours, 2 semaines"></label>
        </fieldset>
        ${devPrestBox(d)}
        <fieldset class="full dev-box dev-dir"><legend>👔 À remplir par le directeur</legend>
          <div class="full" id="devPDir">${devPDirHtml(d)}</div>
          <div class="dev-k-ct" style="display:contents">${(() => { const t = d.ct || {}; return html`
          ${sfx('Forfait mensuel', 'cforfait', t.forfait ?? '', '€ HT / mois')}
          <label class="field">Passages par semaine<input name="cpass" value="${t.pass || '1'}" inputmode="numeric"></label>
          <label class="field">Agents par passage<input name="cagents" value="${t.agents || '2'}" inputmode="numeric"></label>
          ${sfx('Durée du contrat', 'cduree', t.duree || 12, 'mois', 'inputmode="numeric" step="1" min="1" max="120"')}
          ${sfx('Préavis de résiliation', 'cpreavis', t.preavis || 3, 'mois', 'inputmode="numeric" step="1" min="0" max="24"')}
          ${sfx('Paiement', 'cpay', t.pay || 15, 'jours', 'inputmode="numeric" step="1" min="0" max="90"')}
          <label class="field">Indice (cote d’application)<input name="ccote" value="${t.cote || ''}" placeholder="ex. 992,24"></label>`; })()}</div>
          <div class="dev-k-tr" style="display:contents">
          <div class="full" id="devDir">${devDirHtml(crows, dir.rows || [])}</div>
          ${sfx('Déplacement', 'depl', dir.depl ?? '', '€ HT')}
          ${sfx('Remise', 'remise', dir.remise || '', '%', 'inputmode="decimal" step="0.5" min="0" max="100"')}
          <div class="full"><div class="section-label" style="margin:4px 0 6px">Matériel (HT)</div><div id="factMats">${mats.map((m, n) => matRow(n, m))}</div>
            <button type="button" class="btn sm" data-action="fact-mat-add">${icon('plus')} Ligne</button></div></div>
          ${sfx('TVA', 'tva', dir.tva ?? c.taux, '%', 'inputmode="decimal" step="0.01" min="0" max="100"')}
          <label class="field mini dev-k-tr">Acompte<select name="acompte" data-input="dev-tot"><option value="" ${dir.acompte === '' || dir.acompte == null ? new Raw('selected') : ''}>Conseillé (${devAcompteConseil(k.ttc)} %)</option>${DEV_ACOMPTE.map((p) => html`<option value="${p}" ${dir.acompte !== '' && dir.acompte != null && +dir.acompte === p ? new Raw('selected') : ''}>${p ? p + ' %' : 'Sans acompte'}</option>`)}</select></label>
          ${sfx('Devis valable', 'valid', dir.valid || 30, 'jours', 'inputmode="numeric" step="1" min="1" max="365"')}
          <label class="field">Délai / début des travaux<input name="delai" value="${dir.delai || ''}" placeholder="ex. début sous 2 semaines, durée 3 jours"></label>
          <p class="tiny muted full dev-k-tr" style="margin:0">Acompte conseillé : jusqu’à 2 000 € TTC 40 % · jusqu’à 10 000 € 30 % · jusqu’à 50 000 € 20 % · au-delà 10 %.</p>
          <div class="full" id="devTot">${devTotHtml(d)}</div>
        </fieldset>
        ${!id ? html`<p class="tiny muted full" style="margin:0">Le numéro est donné à l’enregistrement : DEV-initiales-RCS (sociétés)-date-heure-numéro suivi (ex. DEV-AG-B123456-${ymd(today())}-0930-${String((+c.devSeq || 0) + 1).padStart(4, '0')}).</p>` : ''}
      </form>`,
      foot: html`<button class="btn" data-action="close-sheet">Fermer</button><button class="btn primary" type="submit" form="f">💾 Enregistrer</button>`,
    };
  },
  // lien web + QR code du devis (client externe)
  'dev-link'({ id }) {
    const d = vault.get('devis', id);
    if (!d || !d.pubToken) return null;
    const url = `${location.origin}/devis.html#t=${d.pubToken}`, cl = d.client || {}, k = devCalc(d);
    const msg = `Bonjour ${d.interloc || devClient(d)},\n\nVoici votre ${k.ct ? 'offre de service' : 'devis'} LuxInterventions n° ${devNo(d)}${d.titre ? ' — ' + d.titre : ''} : ${eur(k.ttc)} TTC${k.ct ? ' / mois' : ''}.\nVous pouvez le lire, l’imprimer et le signer sur votre téléphone :\n${url}\n\nBien à vous,\n${factConf().marque || 'LuxInterventions'}`;
    const tel = String(cl.tel || '').replace(/[^\d+]/g, ''), wa = tel.replace(/^\+/, '').replace(/^00/, '');
    return {
      title: `🔗 Lien du devis — ${devNo(d)}`,
      narrow: true,
      body: html`<p class="small" style="margin:0 0 10px">Le client ouvre ce lien (ou scanne le QR code) : il voit le devis, l’imprime et le <b>signe avec le doigt sur son téléphone</b>. La signature revient ici toute seule.</p>
        <div style="text-align:center;margin:6px 0 10px"><div class="qr-box" style="display:inline-block;background:#fff;padding:10px;border-radius:12px">${qrSvg(url, 5)}</div></div>
        <p class="tiny" style="word-break:break-all;margin:0 0 12px"><a href="${url}" target="_blank" rel="noopener">${url}</a></p>
        <div class="dev-btns">
          <a class="btn sm" href="https://wa.me/${wa}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">💬 WhatsApp</a>
          <a class="btn sm" href="sms:${tel}${/iPhone|iPad/.test(navigator.userAgent) ? '&' : '?'}body=${encodeURIComponent(msg)}">📱 SMS</a>
          <a class="btn sm" href="mailto:${encodeURIComponent(cl.email || '')}?subject=${encodeURIComponent('Devis ' + devNo(d))}&body=${encodeURIComponent(msg)}">✉️ Email</a>
          <button class="btn sm" data-action="dev-link-copy" data-url="${url}">📋 Copier le lien</button></div>
        <p class="tiny muted" style="margin:10px 0 0">Après une nouvelle version (R1, R2…), touchez à nouveau « 🔗 Lien / QR code » : le même lien montre la nouvelle version.</p>`,
      foot: html`<button class="btn" data-action="close-sheet">Fermer</button>`,
    };
  },
  // signature du client avec le doigt : « Bon pour accord »
  'devis-sign'({ id }) {
    const d = vault.get('devis', id);
    if (!d) return null;
    const k = devCalc(d), part = d.client && d.client.type === 'part';
    return {
      title: `✍️ Bon pour accord — ${devNo(d)}`,
      narrow: true,
      body: html`<form id="fs" data-form="devis-sign" class="fields"><input type="hidden" name="id" value="${id}">
        <div class="full card" style="padding:10px;margin:0"><b>${d.titre || 'Devis'}</b><div class="small">${devClient(d)}${d.chantier ? ' · ' + d.chantier : ''}</div>
          <div style="margin-top:6px">Total : <b>${eur(k.ttc)} TTC</b>${k.pct ? html` · acompte ${k.pct} % : <b>${eur(k.acompte)}</b>` : ''}</div></div>
        <label class="field full">Nom du signataire<input name="nom" required value="${d.interloc || devClient(d)}"></label>
        ${part ? html`<p class="small full" style="margin:0">Vous disposez de <b>14 jours</b> pour vous rétracter, sans motif et sans frais (formulaire joint au devis).</p>
          <label class="full" style="display:flex;gap:8px;align-items:flex-start"><input type="checkbox" name="early" value="1" style="width:22px;height:22px;flex:none"> <span class="small">Je demande expressément que les travaux commencent avant la fin du délai de rétractation. Si je me rétracte ensuite, je paierai les travaux déjà réalisés.</span></label>` : ''}
        <p class="small full" style="margin:0"><b>Bon pour accord</b> — signez avec le doigt :</p>
        <canvas class="sig-pad full" width="600" height="220" style="display:block;width:100%;aspect-ratio:30/11;background:#fff;border:1.5px dashed #9aa5a0;border-radius:12px;touch-action:none"></canvas>
        <div class="full" style="display:flex;gap:8px"><button type="button" class="btn sm" data-action="dev-sig-clear">Effacer</button></div>
      </form>`,
      foot: html`<button class="btn" data-action="close-sheet">Annuler</button><button class="btn primary" type="submit" form="fs">✍️ Valider la signature</button>`,
    };
  },
});
// pavé de signature (doigt / souris)
let devSig = null, devSigUrl = '';
document.addEventListener('pointerdown', (ev) => {
  const c = ev.target.closest && ev.target.closest('canvas.sig-pad'); if (!c || !sheetEl.contains(c)) return;
  ev.preventDefault(); c.setPointerCapture(ev.pointerId);
  const r = c.getBoundingClientRect(), x = c.getContext('2d');
  const pt = (q) => [(q.clientX - r.left) * (c.width / r.width), (q.clientY - r.top) * (c.height / r.height)];
  x.lineWidth = 3.2; x.lineCap = 'round'; x.lineJoin = 'round'; x.strokeStyle = '#0b1f4d';
  const [a, b] = pt(ev); x.beginPath(); x.moveTo(a, b); x.lineTo(a + 0.1, b + 0.1); x.stroke();
  devSig = { c, x, pt };
});
document.addEventListener('pointermove', (ev) => { if (!devSig) return; const [a, b] = devSig.pt(ev); devSig.x.lineTo(a, b); devSig.x.stroke(); });
const devSigUp = () => { if (!devSig) return; devSigUrl = devSig.c.toDataURL('image/png'); devSig = null; };
document.addEventListener('pointerup', devSigUp); document.addEventListener('pointercancel', devSigUp);
// la signature est-elle vide ? (aucun pixel dessiné)
const devSigEmpty = (c) => !c || !c.getContext('2d').getImageData(0, 0, c.width, c.height).data.some((v, i) => i % 4 === 3 && v > 0);
Object.assign(FORMS, {
  async devis(fd, fm) {
    const id = fd.get('id'), prev = id ? vault.get('devis', id) : null, rec = devRead(fm);
    if (!rec.client.nom) return toast('Indiquez le nom du client', { bad: true });
    if (rec.client.type !== 'part' && !rec.client.rcs) return toast('RCS obligatoire pour une société (ex. B123456)', { bad: true });
    if (rec.client.type === 'ger' && !rec.client.orgId) return toast('Choisissez la gérance', { bad: true });
    const files = fd.getAll('photos').filter((f) => f && f.size), nb = id ? devPhotos(id).length : 0;
    if (nb + files.length > 20) toast(`20 photos maximum : ${Math.max(0, 20 - nb)} ajoutée(s)`, { bad: true });
    const pics = [];
    for (const f of files.slice(0, Math.max(0, 20 - nb))) pics.push(await compressPhoto(f));
    let saved, seq = 0;
    if (!prev) {
      const c = factConf(), now = new Date(), hhmm = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');
      seq = (+c.devSeq || 0) + 1;
      rec.no = ['DEV', devInitials(rec.client.nom), rec.client.type !== 'part' ? rec.client.rcs : '', ymd(today()), hhmm, String(seq).padStart(4, '0')].filter(Boolean).join('-');
      Object.assign(rec, { seq, st: 'brouillon', date: today(), created: now.toISOString(), rev: 0 });
    } else rec.id = id;
    const docs = [];
    await vault.mutate((tx) => {
      if (seq) tx.put('reglages', { id: 'facturation', devSeq: seq });
      saved = tx.put('devis', rec);
      pics.forEach((b, n) => docs.push([tx.put('documents', { devisId: saved.id, kind: 'devis', n: nb + n + 1, label: `${devNo(saved)} — photo ${nb + n + 1}`, date: today(), mime: 'image/jpeg', size: b.length }).id, b]));
    }, prev ? 'Devis modifié' : 'Devis créé', `${devNo(prev || rec)} — ${rec.client.nom}`);
    for (const [did, b] of docs) await vault.saveFile(did, b);
    sheetDirty = false;
    toast(prev ? 'Devis enregistré' : `📝 Devis ${devNo(saved)} créé`);
    openSheet('devis', saved.id);
  },
  async 'devis-sign'(fd) {
    const d = vault.get('devis', fd.get('id')), c = sheetEl.querySelector('canvas.sig-pad');
    if (!d) return;
    if (devSigEmpty(c)) return toast('Le client doit signer dans le cadre blanc', { bad: true });
    const png = c.toDataURL('image/png'), at = new Date().toISOString();
    await vault.mutate((tx) => tx.put('devis', { id: d.id, st: 'accepte', acc: at, sign: { png, at, nom: String(fd.get('nom') || '').trim(), early: fd.get('early') === '1' }, ...devH(d, 'accepte') }), 'Devis signé par le client', `${devNo(d)} — ${devClient(d)}`);
    devSigUrl = ''; sheetDirty = false;
    toast('✍️ Devis signé — bon pour accord');
    goBack();
  },
});
// PDF du devis : en-tête ARES, client, rapport, lignes, totaux, acompte, signatures, mentions légales, photos (4 par page), « N° … x/N »
async function devPdf(d) {
  const c = factConf(), k = devCalc(d), cl = d.client || {}, part = cl.type === 'part';
  const p = makePdf(), X = 48, R = 547, G = [0.42, 0.42, 0.42], BOT = 795, VIO = [0.36, 0.2, 0.62];
  const no = devNo(d);
  const logo = await sigJpeg('/ares/icons/lux-192.png').catch(() => null);
  const head = () => {
    if (logo) p.image(X, 36, 56, 56, logo.bytes, logo.w, logo.h);
    const ex = logo ? X + 70 : X;
    p.text(ex, 48, c.nom, { size: 11, bold: true }).text(ex, 61, c.marque || '', { size: 9, color: G });
    p.text(ex, 74, `${c.adresse}, ${c.ville}`, { size: 8.5 }).text(ex, 86, [c.tel ? 'Tél. ' + c.tel : '', c.email].filter(Boolean).join(' · '), { size: 8.5, color: G });
    p.text(ex, 98, `RCS ${c.rcs} · TVA ${c.tva}`, { size: 8, color: G });
    if (c.autorisation) p.text(ex, 110, `Autorisation d’établissement n° ${c.autorisation}`, { size: 8, color: G });
  };
  let y = 0;
  const newPage = () => { p.page(); head(); y = 124; };
  const need = (h) => { if (y + h > BOT) newPage(); };
  head();
  // client (en haut à droite, à côté de l'émetteur)
  const CX = 330;
  let cy = 48;
  p.text(CX, cy, cl.nom || '', { size: 11, bold: true }); cy += 14;
  for (const ln of String(cl.adresse || '').split(/\n|,\s*(?=L-|\d{4})/).filter(Boolean).slice(0, 3)) { p.text(CX, cy, ln.trim(), { size: 9.5 }); cy += 12; }
  if (cl.rcs) { p.text(CX, cy, `RCS ${cl.rcs}${cl.tva ? ' · TVA ' + cl.tva : ''}`, { size: 9 }); cy += 12; }
  if (cl.tel || cl.email) { p.text(CX, cy, [cl.tel, cl.email].filter(Boolean).join(' · '), { size: 9, color: G }); cy += 12; }
  y = Math.max(cy + 20, 150);
  p.text(X, y, k.ct ? 'OFFRE DE SERVICE' : 'DEVIS', { size: 22, bold: true, color: [0.2, 0.2, 0.2] }); if (k.ct) p.text(X + 230, y, 'Contrat d’entretien', { size: 11, color: G }); y += 18;
  p.text(X, y, `N° ${no}`, { size: 10.5, bold: true }); y += 20;
  const until = addDays(d.date || today(), num((d.dir || {}).valid) || 30);
  const info = [['Date', frD(d.date || today())], ['Valable jusqu’au', frD(until)], k.ct ? ['Durée du contrat', `${(d.ct && d.ct.duree) || 12} mois`] : ['Durée prévue', (d.chef && d.chef.jours) || '—'], ['Devis gratuit', 'sans engagement']];
  info.forEach(([l, v], i) => { const xx = X + i * 125; p.text(xx, y, l, { size: 8.5, color: G }).text(xx, y + 13, v, { size: 10 }); });
  y += 36;
  const kv = (l, v) => { if (!v) return; need(16); p.text(X, y, l, { size: 9, color: G }); y += p.wrap(X + 130, y, v, R - X - 130, { size: 10, bold: true }) + 3; };
  kv('Objet', d.titre); kv('Lieu d’intervention', d.chantier || cl.adresse); kv('Interlocuteur', d.interloc); kv('Délai / début', (d.dir || {}).delai);
  // rapport du chantier
  const rap = String((d.chef && d.chef.rapport) || '').trim();
  if (rap) {
    y += 8; need(40);
    p.rect(X, y - 12, R - X, 18, { fill: [0.93, 0.91, 0.97] }).text(X + 6, y, 'DESCRIPTION DES TRAVAUX', { size: 9.5, bold: true, color: VIO }); y += 20;
    for (const para of rap.split(/\n+/)) { const h = p.wrap(X, -1000, para, R - X, { size: 9.5 }); need(Math.min(h, 200) + 4); y += p.wrap(X, y, para, R - X, { size: 9.5 }) + 4; }
  }
  const n2 = (v) => (Math.round(v * 100) / 100).toFixed(2).replace('.', ',');
  const txt = String(k.taux).replace('.', ',') + '%';
  const TX = 330;
  if (!k.ct) {
  // tableau des prix
  y += 10; need(60);
  const CQ = 352, CP = 430, CT = 482;
  p.text(X + 6, y, 'Description', { size: 9.5, bold: true }).text(CQ, y, 'Quantité', { size: 9.5, bold: true, align: 'right' }).text(CP, y, 'Prix unitaire', { size: 9.5, bold: true, align: 'right' }).text(CT, y, 'TVA', { size: 9.5, bold: true, align: 'right' }).text(R - 6, y, 'Montant', { size: 9.5, bold: true, align: 'right' });
  y += 8; p.line(X, y, R, y, { w: 1, color: [0.55, 0.55, 0.55] }); y += 15;
  const row = (lib, sub, q, pu, tot) => {
    need(30);
    if (q !== '') p.text(CQ, y, q, { size: 9.5, align: 'right' });
    if (pu !== '') p.text(CP, y, pu, { size: 9.5, align: 'right' });
    p.text(CT, y, txt, { size: 9.5, align: 'right' }).text(R - 6, y, tot, { size: 9.5, align: 'right' });
    let hh = p.wrap(X + 6, y, lib, 240, { size: 9.5 });
    if (sub) hh += p.wrap(X + 6, y + hh, sub, 240, { size: 8.5, color: G });
    y += Math.max(hh, 13) + 9; p.line(X, y - 12, R, y - 12, { w: 0.4, color: [0.85, 0.85, 0.85] });
  };
  for (const pp of k.prest) { const has = pp.pu !== '' && pp.pu != null; row(pp.l, pp.det, `${devQty(pp)} ${pp.u || ''}`, has ? n2(num(pp.pu)) : '', has ? eur(pp.mt) : ''); }
  for (const l of k.lines) row(`Main-d'œuvre — ${METIERS[l.met] || 'ouvrier'}`, `${num(l.nb || 1)} ouvrier(s) × ${n2(num(l.h))} h`, n2(l.hh) + ' h', n2(l.taux), eur(l.mt));
  if (k.dep) row('Déplacement', '', '1,00', n2(k.dep), eur(k.dep));
  for (const m of (d.dir && d.dir.mat) || []) if (num(m.ht)) row(`Matériel : ${m.lib || 'fourniture'}`, '', '1,00', n2(num(m.ht)), eur(num(m.ht)));
  if (k.rem) row(`Remise ${String(num(d.dir.remise)).replace('.', ',')} %`, '', '', '', '− ' + eur(k.rem));
  y += 10; need(110);
  const trow = (l, v, b, bg) => { if (bg) p.rect(TX, y - 12, R - TX, 20, { fill: [0.94, 0.94, 0.94] }); p.text(TX + 8, y, l, { size: b ? 11 : 9.5, bold: b }).text(R - 8, y, v, { size: b ? 11 : 9.5, bold: b, align: 'right' }); y += 22; };
  const ty = y;
  trow('Montant hors taxes', eur(k.ht), false, true); trow(`TVA ${txt}`, eur(k.tva), false, false); trow('Total TTC', eur(k.ttc), true, true);
  if (k.pct) trow(`Acompte (${k.pct} %)`, eur(k.acompte), true, false);
  let py = ty;
  if (c.iban) { p.text(X, py, 'Paiement par virement :', { size: 9, bold: true }); py += 12; p.text(X, py, `${c.iban}${c.bic ? ' · BIC ' + c.bic : ''}`, { size: 9 }); py += 12; p.text(X, py, `Communication : ${no}`, { size: 9, color: G }); py += 12; }
  y = Math.max(y, py) + 14;
  } else {
    // contrat d'entretien : offre financière, organisation, durée et conditions, protocole d'entretien
    const t = d.ct || {};
    const sec = (s0) => { y += 8; need(44); p.rect(X, y - 12, R - X, 18, { fill: [0.93, 0.91, 0.97] }).text(X + 6, y, s0, { size: 9.5, bold: true, color: VIO }); y += 20; };
    const bl = (s0) => { need(20); y += p.wrap(X + 10, y, '• ' + s0, R - X - 10, { size: 9.5 }) + 3; };
    sec('1. OFFRE FINANCIÈRE');
    const C1 = 350, C2 = 440;
    p.text(X + 6, y, 'Prestation', { size: 9, bold: true }).text(C1, y, 'HTVA', { size: 9, bold: true, align: 'right' }).text(C2, y, `TVA ${txt}`, { size: 9, bold: true, align: 'right' }).text(R - 6, y, 'Total TTC', { size: 9, bold: true, align: 'right' });
    y += 8; p.line(X, y, R, y, { w: 1, color: [0.55, 0.55, 0.55] }); y += 15;
    const frow = (lib, ht, unit) => { need(30); const tv = r2((ht * k.taux) / 100); p.text(C1, y, eur(ht) + unit, { size: 9, align: 'right' }).text(C2, y, eur(tv), { size: 9, align: 'right' }).text(R - 6, y, eur(r2(ht + tv)) + unit, { size: 9, bold: true, align: 'right' }); const hh = p.wrap(X + 6, y, lib, 205, { size: 9.5 }); y += Math.max(hh, 13) + 8; p.line(X, y - 11, R, y - 11, { w: 0.4, color: [0.85, 0.85, 0.85] }); };
    frow('Forfait mensuel — entretien des parties communes', k.ht, ' / mois');
    for (const pp of k.prest) frow(pp.l + (pp.det ? ' — ' + pp.det : '') + (pp.q !== '' && pp.q != null && num(pp.q) !== 1 ? ` (${devQty(pp)} ${pp.u})` : ''), pp.mt, ' / exéc.');
    y += 2; y += p.wrap(X, y, 'Le forfait mensuel comprend les prestations hebdomadaires, mensuelles et trimestrielles du protocole d’entretien ci-après. Les prestations annuelles et ponctuelles sont facturées séparément, à chaque exécution.', R - X, { size: 8.5, color: G }) + 4;
    sec('2. ORGANISATION DE LA PRESTATION');
    bl(`Fréquence : ${t.pass || 1} intervention(s) par semaine, réalisée(s) par ${t.agents || 1} agent(s) d’entretien.`);
    bl('Matériel : produits de nettoyage et matériel courant nécessaires inclus dans le forfait.');
    bl(`Remplacement : organisé par ${c.marque || c.nom} en cas de congé ou d’absence de l’agent habituellement affecté au site.`);
    bl('Jours fériés : lorsqu’une intervention coïncide avec un jour férié, elle est replanifiée en concertation avec le client.');
    bl('Déchets : les déchets collectés lors de l’entretien sont évacués dans les conteneurs prévus sur le site.');
    bl(`Contrôle qualité : suivi du chantier par la responsable de ${c.marque || c.nom}, contrôle régulier et à chaque signalement du client.`);
    sec('3. DURÉE, RÉSILIATION ET CONDITIONS');
    bl(`Durée : ${t.duree || 12} mois à compter de la date de démarrage, renouvelable tacitement.`);
    bl(`Résiliation : préavis de ${t.preavis || 3} mois, par écrit.`);
    bl('Facturation : mensuelle pour le forfait d’entretien ; après exécution pour les prestations ponctuelles.');
    bl(`Délai de paiement : ${t.pay || 15} jours à compter de la date de facture.`);
    if (t.cote) bl(`Indexation : prix établis à la cote d’application ${t.cote}. En cas de modification légale de l’échelle mobile des salaires, les prix pourront être adaptés proportionnellement à l’évolution des coûts salariaux.`);
    const pr0 = d.proto || [];
    if (pr0.length) {
      sec('PROTOCOLE D’ENTRETIEN');
      const cols = [['h', 'Hebdo.'], ['m', 'Mensuel'], ['t', 'Trim.'], ['a', 'Annuel']], cx = (i) => 382 + i * 46;
      need(30); p.text(X + 6, y, 'Prestations', { size: 8.5, bold: true }); cols.forEach(([, l], i) => p.text(cx(i), y, l, { size: 8.5, bold: true, align: 'center' })); y += 6; p.line(X, y, R, y, { w: 0.8, color: [0.55, 0.55, 0.55] }); y += 13;
      for (const r of pr0) { need(24); const hh = p.wrap(X + 6, y, r.l, 310, { size: 9 }); cols.forEach(([x], i) => { if (r.f && r.f[x]) p.text(cx(i), y, 'X', { size: 9.5, bold: true, align: 'center' }); }); y += Math.max(hh, 12) + 6; p.line(X, y - 10, R, y - 10, { w: 0.3, color: [0.88, 0.88, 0.88] }); }
      y += 2; y += p.wrap(X, y, 'Le protocole pourra être ajusté d’un commun accord selon les besoins constatés sur site. Les travaux non repris au présent protocole feront l’objet d’un accord préalable.', R - X, { size: 8.5, color: G }) + 4;
    }
    y += 10;
  }
  // mentions légales
  y += 2; need(60);
  const legal = part
    ? [`Devis gratuit et sans engagement, valable ${num((d.dir || {}).valid) || 30} jours (jusqu’au ${frD(until)}). Il n’engage le client qu’après sa signature « Bon pour accord ».`,
      'Droit de rétractation (contrat conclu hors établissement, Code de la consommation) : vous disposez de 14 jours à compter de la signature pour vous rétracter, sans donner de motif et sans frais, en nous envoyant le formulaire ci-joint ou une déclaration claire (courrier ou email). L’acompte éventuellement versé est alors remboursé sous 14 jours.',
      'Les travaux ne commencent pas avant la fin de ce délai, sauf demande expresse du client ; s’il se rétracte ensuite, il paie la part des travaux déjà réalisés. Pas de droit de rétractation pour une réparation urgente demandée par le client.']
    : [`Devis gratuit et sans engagement, valable ${num((d.dir || {}).valid) || 30} jours (jusqu’au ${frD(until)}). Pour un professionnel, l’acceptation (signature « Bon pour accord » ou accord dans le portail) est ferme et définitive.`];
  legal.push(k.ct ? 'Toute prestation supplémentaire fera l’objet d’un accord préalable ou d’un avenant au contrat.' : `Paiement du solde à réception de la facture (${+c.delai || 30} jours). Tout travail supplémentaire fera l’objet d’un avenant ou d’un nouveau devis.`);
  p.line(X, y, R, y, { w: 0.6 }); y += 14;
  for (const t of legal) { need(30); y += p.wrap(X, y, t, R - X, { size: 7.5 }) + 3; }
  y += 12;
  // signatures
  need(116);
  p.text(X, y, 'Bon pour accord — le client', { size: 10, bold: true }).text(TX, y, `Pour ${c.nom}`, { size: 10, bold: true }); y += 6;
  p.rect(X, y, 250, 66, { fill: [0.97, 0.97, 0.97] }).rect(TX, y, R - TX, 66, { fill: [0.97, 0.97, 0.97] });
  const sg = d.sign ? await sigJpeg(d.sign.png).catch(() => null) : null;
  if (sg) { const w = 170, h = Math.min(56, (w * sg.h) / sg.w); p.image(X + 8, y + 6, (h * sg.w) / sg.h, h, sg.bytes, sg.w, sg.h); }
  y += 78;
  if (d.sign) { p.text(X, y, `${d.sign.nom || ''} — signé le ${new Date(Date.parse(d.sign.at) || Date.now()).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, { size: 8.5, color: G }); y += 12; }
  else { p.text(X, y, 'Nom, date, mention « Bon pour accord » et signature', { size: 8.5, color: G }); y += 12; }
  if (d.sign && d.sign.early) { y += p.wrap(X, y, 'Le client a demandé expressément que les travaux commencent avant la fin du délai de rétractation ; en cas de rétractation, il paie les travaux déjà réalisés.', R - X, { size: 8.5, color: G }) + 2; }
  // formulaire de rétractation (particulier)
  if (part) {
    newPage();
    p.text(X, y, 'FORMULAIRE DE RÉTRACTATION', { size: 14, bold: true }); y += 20;
    y += p.wrap(X, y, '(Veuillez compléter et renvoyer le présent formulaire uniquement si vous souhaitez vous rétracter du contrat.)', R - X, { size: 9, color: G }) + 10;
    y += p.wrap(X, y, `À l’attention de ${c.nom}${c.marque ? ' (' + c.marque + ')' : ''}, ${c.adresse}, ${c.ville}${c.email ? ', ' + c.email : ''} :`, R - X, { size: 10 }) + 10;
    for (const t of [`Je vous notifie par la présente ma rétractation du contrat portant sur la prestation de services ci-dessous : devis n° ${no}${d.titre ? ' — ' + d.titre : ''}.`, 'Signé le (date) : ……………………………………', 'Nom du client : ……………………………………………………………', 'Adresse du client : ……………………………………………………………………………………………', 'Signature du client (uniquement en cas de notification sur papier) :', 'Date : ……………………………']) y += p.wrap(X, y, t, R - X, { size: 10 }) + 14;
  }
  // photos : 4 par page (2 × 2)
  const ph = devPhotos(d.id);
  if (ph.length) {
    const W2 = (R - X - 14) / 2, H2 = 300;
    for (let i = 0; i < ph.length; i++) {
      if (i % 4 === 0) { newPage(); p.text(X, y, `PHOTO(S) — ${i + 1} à ${Math.min(ph.length, i + 4)} sur ${ph.length}`, { size: 11, bold: true }); y += 14; }
      try {
        const b = await vault.readFile(ph[i].id), bmp = await createImageBitmap(new Blob([b], { type: 'image/jpeg' }));
        const k2 = Math.min(W2 / bmp.width, H2 / bmp.height), w = bmp.width * k2, h = bmp.height * k2, cx = X + (i % 2) * (W2 + 14), cyy = y + Math.floor((i % 4) / 2) * (H2 + 14);
        p.image(cx + (W2 - w) / 2, cyy + (H2 - h) / 2, w, h, b, bmp.width, bmp.height);
      } catch { /* photo illisible */ }
    }
  }
  // pied de page : « N° … x/N »
  const N = p.count();
  for (let i = 0; i < N; i++) p.onPage(i).text((X + R) / 2, 812, `${c.nom}${c.marque ? ' — ' + c.marque : ''} · Devis N° ${no} · ${i + 1}/${N}`, { size: 7.5, color: G, align: 'center' });
  return p.bytes();
}
// aperçu du PDF (imprimer / télécharger), comme les autres documents
function pdfView(bytes, label) {
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  const dlg = document.createElement('dialog');
  dlg.className = 'pv';
  setHtml(dlg, html`<div class="pv-bar"><b>${label}</b>
    <a class="btn sm" href="${url}" download="${label}.pdf">${icon('download')}</a>
    <button class="btn sm" type="button" data-pv-print="1">🖨️ Imprimer</button>
    <button class="btn sm" type="button" data-pv-close="1">${icon('x')} Fermer</button></div>
    <iframe src="${url}" title="${label}"></iframe>`);
  dlg.addEventListener('click', (e) => {
    if (e.target.closest('[data-pv-close]')) dlg.close();
    if (e.target.closest('[data-pv-print]')) { try { dlg.querySelector('iframe').contentWindow.print(); } catch { window.open(url, '_blank'); } }
  });
  dlg.addEventListener('close', () => { dlg.remove(); URL.revokeObjectURL(url); });
  document.body.appendChild(dlg); dlg.showModal();
}
// premier envoi : le brouillon devient « envoyé » (la validité court depuis la date du devis)
const devSent = (d, extra = {}) => vault.mutate((tx) => tx.put('devis', { id: d.id, ...(d.st === 'brouillon' ? { st: 'envoye', sentAt: new Date().toISOString(), ...devH(d, 'envoye') } : {}), ...extra }), 'Devis envoyé', `${devNo(d)} — ${devClient(d)}`);
const devMsg = (d) => { const k = devCalc(d), c = factConf(); return `Bonjour ${d.interloc || devClient(d)},\n\nVoici notre ${k.ct ? 'offre de service (contrat d’entretien)' : 'devis'} n° ${devNo(d)}${d.titre ? ' — ' + d.titre : ''} : ${k.ct ? `forfait mensuel ${eur(k.ttc)} TTC` : `${eur(k.ttc)} TTC`}${k.pct ? ` (acompte ${k.pct} % : ${eur(k.acompte)})` : ''}, valable jusqu’au ${fmtDate(addDays(d.date || today(), num((d.dir || {}).valid) || 30))}.\nDevis gratuit et sans engagement.\n\nBien à vous,\n${c.marque || c.nom}${c.tel ? '\n📞 ' + c.tel : ''}${c.email ? '\n✉️ ' + c.email : ''}`; };
// synchronisation avec le portail : la gérance accepte, refuse ou demande une révision
// signatures faites par le client sur son téléphone (lien / QR code) : reprises dans le devis (signature sur le PDF)
async function devPubSync() {
  if (!ptlConf() || !vault.list('devis').some((d) => d.pubId && d.st !== 'accepte' && d.st !== 'refuse')) return;
  let list;
  try { list = (await ptlApi('devis-pub')).devis || []; } catch { return; }
  const upd = list.map((r) => [vault.list('devis').find((x) => x.pubId === r.id), r]).filter(([d, r]) => d && d.st !== 'accepte' && d.st !== 'refuse' && r.decided_at && !(d.decision && d.decision.at >= r.decided_at));
  if (!upd.length) return;
  await vault.mutate((tx) => { for (const [d, r] of upd) { const at = new Date(r.decided_at).toISOString(); tx.put('devis', { id: d.id, st: r.status, decision: { st: r.status, at: r.decided_at, by: r.sign_name || 'le client', note: '' }, ...(r.status === 'accepte' ? { acc: at, sign: { png: r.sign_png, at, nom: r.sign_name || '', early: !!r.sign_early, remote: true } } : {}), ...devH(d, r.status, r.decided_at) }); } }, 'Réponse du client au devis (lien)', upd.map(([d, r]) => `${devNo(d)} : ${r.status === 'accepte' ? 'signé' : 'refusé'}`).join(' · '));
  for (const [d, r] of upd) toast(`📝 ${devClient(d)} : devis ${devNo(d)} ${r.status === 'accepte' ? '✍️ signé sur son téléphone' : '❌ refusé'}`);
  if (['dashboard', 'maintenance'].includes(ui.route)) renderView();
  if (ui.sheet && ui.sheet.kind === 'devis') { ui.sheet.rendered = false; renderSheet(); }
}
async function devSync() {
  devPubSync();
  if (!ptlConf() || !vault.list('devis').some((d) => d.ptlId)) return;
  let list;
  try { list = (await ptlApi('devis')).devis || []; } catch { return; }
  const upd = [];
  for (const r of list) {
    const d = vault.list('devis').find((x) => x.ptlId === r.id);
    if (!d || !r.decided_at || (d.decision && d.decision.at >= r.decided_at)) continue;
    if (!['accepte', 'refuse', 'revision'].includes(r.status)) continue;
    upd.push([d, r]);
  }
  if (!upd.length) return;
  await vault.mutate((tx) => { for (const [d, r] of upd) tx.put('devis', { id: d.id, st: r.status, ptlSt: r.status, decision: { st: r.status, at: r.decided_at, by: r.decided_by_name || '', note: r.note || '' }, ...(r.status === 'accepte' ? { acc: new Date(r.decided_at).toISOString() } : {}), ...devH(d, r.status, r.decided_at) }); }, 'Réponse de la gérance au devis', upd.map(([d, r]) => `${devNo(d)} : ${({ accepte: 'accepté', refuse: 'refusé', revision: 'révision demandée' })[r.status]}`).join(' · '));
  for (const [d, r] of upd) toast(`📝 ${devClient(d)} : devis ${devNo(d)} ${({ accepte: '✅ accepté', refuse: '❌ refusé', revision: '🔄 révision demandée' })[r.status]}`);
  if (['dashboard', 'maintenance'].includes(ui.route)) renderView();
  if (ui.sheet && ui.sheet.kind === 'devis') { ui.sheet.rendered = false; renderSheet(); }
}
Object.assign(ACTIONS, {
  'dev-new': () => openSheet('devis'),
  'dev-csv': (d) => {
    const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`, n2 = (v) => (Math.round(v * 100) / 100).toFixed(2).replace('.', ',');
    const L = vault.list('devis').filter((x) => x.st !== 'brouillon' && (x.date || '').startsWith(String(d.y))).sort((a, b) => (a.seq || 0) - (b.seq || 0));
    const rows = [['Numéro', 'Date', 'Client', 'Type', 'Objet', 'HT', 'TVA', 'TTC', 'Acompte', 'Statut', 'Envoyé le', 'Réponse le', 'Temps de réponse', 'Révisions'].map(q).join(';')];
    for (const x of L) { const k = devCalc(x), s0 = devSentAt(x), s1 = devDecAt(x); rows.push([devNo(x), x.date, devClient(x), DEV_TYPES[(x.client || {}).type] || '', x.titre || '', n2(k.ht), n2(k.tva), n2(k.ttc), n2(k.acompte), devState(x).lbl, s0 ? new Date(s0).toLocaleString('fr-FR') : '', s1 ? new Date(s1).toLocaleString('fr-FR') : '', s0 && s1 >= s0 ? durTxt(s1 - s0) : '', x.rev || 0].map(q).join(';')); }
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + rows.join('\n')], { type: 'text/csv' })); a.download = `devis-${d.y}.csv`; document.body.appendChild(a); a.click(); a.remove();
  },
  'dev-open': (d) => openSheet('devis', d.id),
  // lien web + QR code pour un client externe : il voit, imprime et signe le devis sur son téléphone
  async 'dev-link'(d) {
    const v = vault.get('devis', d.id); if (!v) return;
    if (!ptlConf()) return toast('Connectez d’abord le portail gérance (Gérances) : il héberge les liens des devis', { bad: true });
    if (sheetDirty) return toast('Enregistrez d’abord le devis (💾)', { bad: true });
    const k = devCalc(v), bytes = await devPdf(v);
    const meta = { id: v.pubId || '', no: devNo(v), title: v.titre || '', client: devClient(v), ttc: k.ttc, acompte: k.acompte, pct: k.pct, valid_until: addDays(v.date || today(), num((v.dir || {}).valid) || 30), part: (v.client || {}).type === 'part', kind: v.kind || 'travaux' };
    let j;
    try {
      const r = await fetch(PTL_API + 'devis-pub', { method: 'PUT', headers: { Authorization: 'Bearer ' + ptlConf().token, 'Content-Type': 'application/pdf', 'X-Devis': encodeURIComponent(JSON.stringify(meta)) }, body: bytes });
      j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'Erreur ' + r.status);
    } catch (e) { return toast('Lien impossible : ' + (e.message || 'connexion'), { bad: true }); }
    await devSent(v, { pubId: j.id, ...(j.token ? { pubToken: j.token } : {}) });
    openOver('dev-link', v.id);
  },
  'dev-link-copy': async (d) => { try { await navigator.clipboard.writeText(d.url); toast('Lien copié'); } catch { toast('Copie impossible : sélectionnez le lien', { bad: true }); } },
  'dev-free-add': () => { const box = $('#devFree'); if (!box) return; const n = 1 + Math.max(-1, ...[...box.querySelectorAll('[name^=pl_f]')].map((x) => +x.name.slice(4))); box.insertAdjacentHTML('beforeend', String(devFreeRow(n))); box.lastElementChild.querySelector('input').focus(); },
  'dev-proto-add': () => { const box = $('#devProto'); if (!box) return; const n = 1 + Math.max(-1, ...[...box.querySelectorAll('[name^=frl]')].map((x) => +x.name.slice(3))); box.insertAdjacentHTML('beforeend', String(devProtoRow(n, { f: { m: 1 } }))); box.lastElementChild.querySelector('input').focus(); },
  'dev-row-add': () => { const box = $('#devRows'); if (box) box.insertAdjacentHTML('beforeend', String(devChefRow(box.children.length))); },
  'dev-sig-clear': () => { const c = sheetEl.querySelector('canvas.sig-pad'); if (c) c.getContext('2d').clearRect(0, 0, c.width, c.height); devSigUrl = ''; },
  'dev-sign': (d) => { if (sheetDirty) return toast('Enregistrez d’abord le devis (💾)', { bad: true }); openOver('devis-sign', d.id); },
  async 'dev-ph-del'(d) {
    const doc = vault.get('documents', d.id);
    if (!doc || !(await confirmBox('Retirer cette photo du devis ?', { ok: 'Retirer', danger: true }))) return;
    await vault.mutate((tx) => tx.remove('documents', doc.id), 'Photo du devis retirée', doc.label);
    await vault.deleteFile(doc.id).catch(() => {});
    ui.sheet.rendered = false; renderSheet();
  },
  async 'dev-pdf'(d) {
    const v = vault.get('devis', d.id); if (!v) return;
    if (sheetDirty) return toast('Enregistrez d’abord le devis (💾)', { bad: true });
    try { pdfView(await devPdf(v), 'Devis ' + devNo(v)); } catch (e) { return toast('PDF impossible : ' + (e.message || e), { bad: true }); }
    if (v.st === 'brouillon') await devSent(v);
  },
  async 'dev-share'(d) {
    const v = vault.get('devis', d.id); if (!v) return;
    if (sheetDirty) return toast('Enregistrez d’abord le devis (💾)', { bad: true });
    const bytes = await devPdf(v), name = `Devis-${devNo(v)}.pdf`, msg = devMsg(v), cl = v.client || {};
    const file = new File([bytes], name, { type: 'application/pdf' });
    let shared = false;
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'Devis ' + devNo(v), text: msg }); shared = true; } catch (e) { if (e && e.name === 'AbortError') return; }
    }
    if (!shared) {
      // ordinateur : le PDF est téléchargé, puis WhatsApp ou l'email s'ouvre avec le message (joindre le PDF)
      const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name; document.body.appendChild(a); a.click(); a.remove();
      const tel = String(cl.tel || '').replace(/[^\d]/g, '').replace(/^00/, '');
      if (d.via === 'wa') window.open(`https://wa.me/${tel}?text=${encodeURIComponent(msg)}`, '_blank');
      else location.href = `mailto:${encodeURIComponent(cl.email || '')}?subject=${encodeURIComponent('Devis ' + devNo(v) + (v.titre ? ' — ' + v.titre : ''))}&body=${encodeURIComponent(msg + '\n\n(PDF du devis en pièce jointe)')}`;
      toast('PDF téléchargé : joignez-le au message');
    }
    await devSent(v);
    if (ui.sheet) { ui.sheet.rendered = false; renderSheet(); }
  },
  async 'dev-ptl'(d) {
    const v = vault.get('devis', d.id); if (!v || !ptlConf()) return toast('Portail gérance non connecté', { bad: true });
    if (sheetDirty) return toast('Enregistrez d’abord le devis (💾)', { bad: true });
    const k = devCalc(v), bytes = await devPdf(v);
    const meta = { id: v.ptlId || '', org: v.client.orgId, no: devNo(v), title: v.titre || '', ttc: k.ttc, acompte: k.acompte, pct: k.pct, valid_until: addDays(v.date || today(), num((v.dir || {}).valid) || 30) };
    try {
      const r = await fetch(PTL_API + 'devis', { method: 'PUT', headers: { Authorization: 'Bearer ' + ptlConf().token, 'Content-Type': 'application/pdf', 'X-Devis': encodeURIComponent(JSON.stringify(meta)) }, body: bytes });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'Erreur ' + r.status);
      await devSent(v, { ptlId: j.id, ptlSt: 'envoye', ...(v.st === 'revision' ? { st: 'envoye' } : {}) });
    } catch (e) { return toast('Envoi impossible : ' + (e.message || 'connexion'), { bad: true }); }
    toast(`📤 Devis ${devNo(v)} envoyé dans le portail de ${devClient(v)}`);
    ui.sheet.rendered = false; renderSheet();
  },
  async 'dev-acc'(d) {
    const v = vault.get('devis', d.id); if (!v) return;
    const part = v.client && v.client.type === 'part';
    if (!(await confirmBox(`Devis ${devNo(v)} accepté ?`, { ok: '✅ Accepté', detail: `${devClient(v)} a donné son accord (signature papier, email…).${part ? ' Particulier : il garde 14 jours pour se rétracter (pastille violette).' : ''} Pour une signature sur le téléphone : « ✍️ Faire signer le client ».` }))) return;
    const at = new Date().toISOString();
    await vault.mutate((tx) => tx.put('devis', { id: v.id, st: 'accepte', acc: at, decision: { st: 'accepte', at: Date.now(), by: 'LuxInterventions', note: '' }, ...devH(v, 'accepte') }), 'Devis accepté', `${devNo(v)} — ${devClient(v)}`);
    toast('✅ Devis accepté'); renderView(); if (ui.sheet) { ui.sheet.rendered = false; renderSheet(); }
  },
  async 'dev-ref'(d) {
    const v = vault.get('devis', d.id); if (!v) return;
    if (!(await confirmBox(`Devis ${devNo(v)} refusé ?`, { ok: '❌ Refusé', danger: true, detail: devClient(v) }))) return;
    await vault.mutate((tx) => tx.put('devis', { id: v.id, st: 'refuse', decision: { st: 'refuse', at: Date.now(), by: 'LuxInterventions', note: '' }, ...devH(v, 'refuse') }), 'Devis refusé', `${devNo(v)} — ${devClient(v)}`);
    toast('Devis refusé'); renderView(); if (ui.sheet) { ui.sheet.rendered = false; renderSheet(); }
  },
  async 'dev-rev'(d) {
    const v = vault.get('devis', d.id); if (!v) return;
    if (!(await confirmBox(`Nouvelle version R${(v.rev || 0) + 1} ?`, { ok: '🔄 Nouvelle version', detail: 'Même numéro + R1, R2… Modifiez les travaux ou faites une remise, puis renvoyez-le. La signature éventuelle est retirée.' }))) return;
    await vault.mutate((tx) => tx.put('devis', { id: v.id, rev: (v.rev || 0) + 1, st: 'brouillon', date: today(), sign: null, acc: '', ...devH(v, 'R' + ((v.rev || 0) + 1)) }), 'Nouvelle version du devis', `${v.no}-R${(v.rev || 0) + 1}`);
    toast(`Version R${(v.rev || 0) + 1} : modifiez puis renvoyez`); ui.sheet.rendered = false; renderSheet();
  },
  async 'dev-del'(d) {
    const v = vault.get('devis', d.id); if (!v) return;
    if (!(await confirmBox(`Supprimer le devis ${devNo(v)} ?`, { ok: 'Supprimer', danger: true, detail: 'Le devis et ses photos sont effacés. Le numéro n’est pas réutilisé.' }))) return;
    const ph = devPhotos(v.id);
    await vault.mutate((tx) => { tx.remove('devis', v.id); ph.forEach((x) => tx.remove('documents', x.id)); }, 'Devis supprimé', `${devNo(v)} — ${devClient(v)}`);
    for (const x of ph) await vault.deleteFile(x.id).catch(() => {});
    if (v.ptlId && ptlConf()) ptlApi('devis/' + v.ptlId, { method: 'DELETE' }).catch(() => {});
    if (v.pubId && ptlConf()) ptlApi('devis-pub/' + v.pubId, { method: 'DELETE' }).catch(() => {});
    sheetDirty = false; closeSheet(); toast('Devis supprimé'); renderView();
  },
  // devis accepté → intervention au planning (chantier, rapport, ouvriers prévus, photos du chantier)
  'dev-tache': (d) => {
    const v = vault.get('devis', d.id); if (!v) return;
    const k = devCalc(v), first = k.lines.find((l) => l.w) || {};
    const note = [`Devis ${devNo(v)} accepté — ${eur(k.ttc)} TTC`, v.interloc ? 'Interlocuteur : ' + v.interloc : '', v.client.tel ? 'Tél. ' + v.client.tel : '', ...k.lines.map((l) => `• ${num(l.nb || 1)} × ${METIERS[l.met] || 'ouvrier'} × ${String(num(l.h)).replace('.', ',')} h${l.w ? ' (' + intervName(l.w) + ')' : ''}`), v.chef && v.chef.jours ? 'Durée prévue : ' + v.chef.jours : '', v.chef && v.chef.rapport ? '\n' + v.chef.rapport : ''].filter(Boolean).join('\n');
    openOver('tache-form', null, null, { titre: v.titre || 'Devis ' + devNo(v), note, intervenantId: first.w || '', metiers: k.lines.map((l) => l.met).filter(Boolean), dev: { id: v.id, no: devNo(v), client: devClient(v), adr: v.chantier || v.client.adresse || '', contact: v.interloc || '', tel: v.client.tel || '' } });
  },
});

document.addEventListener('input', (e) => {
  const ff = e.target.closest && e.target.closest('form[data-form=facture]');
  if (ff && e.target.name === 'marge') { const m = 1 + num(e.target.value) / 100; ff.taux.value = r2(num(ff.cost_h.value) * m) || ''; if (num(ff.cost_d.value)) ff.depl.value = r2(num(ff.cost_d.value) * m); }
  if (ff) { const box = $('#factTot'); if (box) setHtml(box, factTotHtml(factRead(ff))); }
  const fdv = e.target.closest && e.target.closest('form[data-form=devis]');
  if (fdv) {
    if (e.target.dataset.input === 'dev-chef') { const box = $('#devDir'), raw = [], dir = []; fdv.querySelectorAll('.dev-crow').forEach((row) => { const n = +row.dataset.n; raw[n] = { met: fdv[`met${n}`].value, nb: num(fdv[`nb${n}`].value), h: num(fdv[`h${n}`].value) }; dir[n] = { w: fdv[`dw${n}`] ? fdv[`dw${n}`].value : '', taux: fdv[`dt${n}`] ? fdv[`dt${n}`].value : '' }; }); if (box) setHtml(box, devDirHtml(raw.map((x) => x || {}), dir)); }
    if (e.target.dataset.input === 'dev-psearch') {
      const q = e.target.value.trim().toLowerCase();
      fdv.querySelectorAll('.dev-pg').forEach((g) => { let hit = 0; g.querySelectorAll('.dev-pi').forEach((it) => { const ok = !q || it.dataset.l.includes(q); it.hidden = !ok; hit += ok; }); g.hidden = !hit; if (q) g.open = !!hit; });
      return;
    }
    if (e.target.closest('.dev-prest')) {
      const g = e.target.closest('.dev-pg');
      if (g) { const n = g.querySelectorAll('input[name=pk]:checked').length, b = g.querySelector('.dev-pn'); b.textContent = n; b.hidden = !n; }
      const pd = $('#devPDir'); if (pd) setHtml(pd, devPDirHtml(devRead(fdv)));
    }
    const box = $('#devTot'); if (box) setHtml(box, devTotHtml(devRead(fdv)));
  }
  const k = e.target.dataset.input;
  if (k === 'esp-search') filterEspList();
  if (k === 'vid-link') { const h = document.getElementById('vidHint'); if (h) h.textContent = vidHint(e.target.value); }
  if (k === 'bank-chk') bankMsgs(e.target.form);
  if (k === 'search') { ui.search = e.target.value; renderView(); }
  if (k === 'cp-q') { ui.cpQ = e.target.value; ui.cpLim = 10; clearTimeout(ui.cpT); ui.cpT = setTimeout(renderView, 200); }
  if (k === 'idx-pct' || k === 'idx-amount') {
    const f = e.target.form;
    const l = vault.get('locataires', f.querySelector('[name=id]').value);
    if (k === 'idx-pct' && e.target.value !== '') f.loyer.value = Math.round(l.loyer * (1 + num(e.target.value) / 100) * 100) / 100;
    if (k === 'idx-amount') f.pct.value = l.loyer ? Math.round(((num(e.target.value) / l.loyer - 1) * 100) * 100) / 100 : '';
  }
});
document.addEventListener('change', (e) => {
  const k = e.target.dataset.input;
  // fiche d'une personne : horaire seulement pour le personnel régulier ; engagement pour occasionnels et sociétés
  if (k === 'photo-pick' && e.target.files[0]) {
    const box = e.target.closest('.photo-pick');
    photoSquare(e.target.files[0]).then((u) => { box.querySelector('[name=photo]').value = u; setHtml(box.querySelector('.pp-circle'), html`<img src="${u}" alt="">`); sheetDirty = true; }).catch(() => toast('Photo illisible', { bad: true }));
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
  if (k === 'soc-logo' && e.target.files[0]) setLogo(e.target.files[0]);
  if (k === 'dev-w') { const o = e.target.selectedOptions[0], t = e.target.form[e.target.name.replace('dw', 'dt')]; if (t && o && num(o.dataset.rate)) t.value = o.dataset.rate; const box = $('#devTot'); if (box) setHtml(box, devTotHtml(devRead(e.target.form))); }
  if (k === 'dev-kind') { const f = e.target.form; f.dataset.kind = e.target.value; const pd = $('#devPDir'); if (pd) setHtml(pd, devPDirHtml(devRead(f))); const tb = $('#devTot'); if (tb) setHtml(tb, devTotHtml(devRead(f))); }
  if (k === 'dev-tot') { const box = $('#devTot'); if (box) setHtml(box, devTotHtml(devRead(e.target.form))); }
  if (k === 'dev-ctype') { const f = e.target.form, v = e.target.value; f.querySelectorAll('.dev-ger').forEach((x) => { x.hidden = v !== 'ger'; }); f.querySelectorAll('.dev-soc').forEach((x) => { x.hidden = v === 'part'; }); }
  if (k === 'dev-org') {
    const f = e.target.form, o = ptlOrg(e.target.value);
    if (o) { const cl = factClient(o.id, o.name); f.cnom.value = o.name; f.crcs.value = cl.rcs || ''; f.ctva.value = cl.tvaNum || ''; f.cadr.value = cl.adresse || ''; if (o.phone && !f.ctel.value) f.ctel.value = o.phone; if (o.email && !f.cmail.value) f.cmail.value = o.email; }
  }

  if (k === 'soc-sign' && e.target.files[0]) setLogo(e.target.files[0], 'signature');
  if (k === 'soc-sign-w') vault.mutate((tx) => tx.put('reglages', { id: 'main', signW: [6, 8, 10, 12].includes(+e.target.value) ? +e.target.value : 8 }), 'Taille de la signature', `${e.target.value} cm`).then(signRefresh);
  if (k === 'cp-per') { ui.cpPer = e.target.value; ui.cpLim = 10; renderView(); }
  if (k === 'abo-plan') { const o = e.target.selectedOptions[0], f = e.target.form; if (f && o) f.prix.value = o.dataset.prix || 0; }
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
