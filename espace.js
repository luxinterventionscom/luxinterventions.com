// Espace locataire : page personnelle, en lecture seule (+ signaler un problème).
// Le lien contient l'identifiant et la clé (#id.clé) ; la clé ne quitte jamais le téléphone.
import qrcode from '/ares/qrcode.js';
import { openJson, sealJson, openBytes, sealForOwner, codeHash, unwrapWithCode } from '/ares/espace-crypto.js';

import { videoEmbed } from '/ares/video-embed.js';
import { pubStatInit, pubSeen, pubTap } from '/ares/pubstat.js';
import { pushStatus, pushEnable, pushRefresh, setBadge } from '/ares/push-client.js';
const API = document.querySelector('meta[name="esp-api"]').content.replace(/\/$/, '');
// Accès : lien direct (#id.clé) ou code personnel saisi une fois ; mémorisé sur ce téléphone
const ACC = 'espAccess';
let [id, key] = (location.hash.slice(1).match(/^([0-9a-f]{32})\.([A-Za-z0-9_-]{40,})$/) || []).slice(1);
if (id) { try { localStorage.setItem(ACC, id + '.' + key); } catch {} history.replaceState(null, '', location.pathname); }
else { try { [id, key] = ((localStorage.getItem(ACC) || '').match(/^([0-9a-f]{32})\.([A-Za-z0-9_-]{40,})$/) || []).slice(1); } catch {} }
let installEvt = null;
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; if (!/INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || "")) render(); });
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('/espace-sw.js', { scope: '/espace' }).catch(() => {});
const app = document.getElementById('app');

// Annexes comprises avec le logement, type de maison, fil avec le gestionnaire (personne seule)
const AX = {
  fr: { wx: { pl: 'lecteur officiel', t: 'Météo', r: 'Radio', now: 'Maintenant', change: 'Changer de radio', ph: 'Collez le lien de votre radio (site ou flux audio)', save: 'Enregistrer', back: 'Revenir à', on: 'en écoute', site: 'Ouvrir le site de la radio', none: 'Météo indisponible pour le moment.', ext: 'Cette radio s’ouvre sur son site.' }, newMsg: (n) => n > 1 ? n + ' nouveaux messages' : '1 nouveau message', surf: 'Surface', inc: 'Compris', house: 'Maison', cave: '🍷 Cave', mans: { hab: '🏠 Mansarde habitable', non: '🏠 Grenier (rangement)' }, garage: { semi: '🚗 Garage au sous-sol', ext: '🚗 Garage extérieur', box: '🚗 Box' }, parking: '🅿️ Place de parking', jardin: '🌿 Jardin', balcon: '🌇 Balcon / terrasse', maison: { isolee: 'individuelle', jumelee: 'jumelée', rangee: 'mitoyenne' }, solo: 'Messages avec votre gestionnaire', soloHint: 'Écrivez ici à votre gestionnaire : il vous répond dans l’app.' },
  it: { wx: { pl: 'lettore ufficiale', t: 'Meteo', r: 'Radio', now: 'Adesso', change: 'Cambia radio', ph: 'Incolla il link della tua radio (sito o flusso audio)', save: 'Salva', back: 'Torna a', on: 'in ascolto', site: 'Apri il sito della radio', none: 'Meteo non disponibile al momento.', ext: 'Questa radio si apre sul suo sito.' }, newMsg: (n) => n > 1 ? n + ' messaggi nuovi' : '1 messaggio nuovo', surf: 'Superficie', inc: 'Compreso', house: 'Casa', cave: '🍷 Cantina', mans: { hab: '🏠 Mansarda abitabile', non: '🏠 Soffitta (deposito)' }, garage: { semi: '🚗 Garage nel seminterrato', ext: '🚗 Garage esterno', box: '🚗 Box' }, parking: '🅿️ Posto auto', jardin: '🌿 Giardino', balcon: '🌇 Balcone / terrazza', maison: { isolee: 'indipendente', jumelee: 'bifamiliare', rangee: 'a schiera' }, solo: 'Messaggi con il tuo gestore', soloHint: 'Scrivi qui al tuo gestore: ti risponde nell’app.' },
  de: { wx: { pl: 'offizieller Player', t: 'Wetter', r: 'Radio', now: 'Jetzt', change: 'Radio wechseln', ph: 'Link Ihres Radios einfügen (Website oder Audiostream)', save: 'Speichern', back: 'Zurück zu', on: 'läuft', site: 'Website des Radios öffnen', none: 'Wetter derzeit nicht verfügbar.', ext: 'Dieses Radio öffnet sich auf seiner Website.' }, newMsg: (n) => n > 1 ? n + ' neue Nachrichten' : '1 neue Nachricht', surf: 'Fläche', inc: 'Inklusive', house: 'Haus', cave: '🍷 Keller', mans: { hab: '🏠 Bewohnbares Dachzimmer', non: '🏠 Dachboden (Abstellraum)' }, garage: { semi: '🚗 Garage im Untergeschoss', ext: '🚗 Außengarage', box: '🚗 Box' }, parking: '🅿️ Stellplatz', jardin: '🌿 Garten', balcon: '🌇 Balkon / Terrasse', maison: { isolee: 'freistehend', jumelee: 'Doppelhaushälfte', rangee: 'Reihenhaus' }, solo: 'Nachrichten mit Ihrer Verwaltung', soloHint: 'Schreiben Sie hier Ihrer Verwaltung: Sie antwortet in der App.' },
  pt: { wx: { pl: 'leitor oficial', t: 'Meteorologia', r: 'Rádio', now: 'Agora', change: 'Mudar de rádio', ph: 'Cole o link da sua rádio (site ou fluxo áudio)', save: 'Guardar', back: 'Voltar a', on: 'a tocar', site: 'Abrir o site da rádio', none: 'Meteorologia indisponível de momento.', ext: 'Esta rádio abre no seu site.' }, newMsg: (n) => n > 1 ? n + ' mensagens novas' : '1 mensagem nova', surf: 'Área', inc: 'Incluído', house: 'Casa', cave: '🍷 Arrecadação / cave', mans: { hab: '🏠 Águas-furtadas habitáveis', non: '🏠 Sótão (arrumação)' }, garage: { semi: '🚗 Garagem na cave', ext: '🚗 Garagem exterior', box: '🚗 Box' }, parking: '🅿️ Lugar de estacionamento', jardin: '🌿 Jardim', balcon: '🌇 Varanda / terraço', maison: { isolee: 'isolada', jumelee: 'geminada', rangee: 'em banda' }, solo: 'Mensagens com o seu gestor', soloHint: 'Escreva aqui ao seu gestor: ele responde na app.' },
  en: { wx: { pl: 'official player', t: 'Weather', r: 'Radio', now: 'Now', change: 'Change radio', ph: 'Paste your radio link (website or audio stream)', save: 'Save', back: 'Back to', on: 'playing', site: 'Open the radio website', none: 'Weather not available right now.', ext: 'This radio opens on its website.' }, newMsg: (n) => n > 1 ? n + ' new messages' : '1 new message', surf: 'Floor area', inc: 'Included', house: 'House', cave: '🍷 Cellar', mans: { hab: '🏠 Habitable attic room', non: '🏠 Loft (storage)' }, garage: { semi: '🚗 Basement garage', ext: '🚗 Outdoor garage', box: '🚗 Lock-up' }, parking: '🅿️ Parking space', jardin: '🌿 Garden', balcon: '🌇 Balcony / terrace', maison: { isolee: 'detached', jumelee: 'semi-detached', rangee: 'terraced' }, solo: 'Messages with your manager', soloHint: 'Write to your manager here: they reply in the app.' },
  es: { wx: { pl: 'reproductor oficial', t: 'Tiempo', r: 'Radio', now: 'Ahora', change: 'Cambiar de radio', ph: 'Pega el enlace de tu radio (web o flujo de audio)', save: 'Guardar', back: 'Volver a', on: 'sonando', site: 'Abrir la web de la radio', none: 'Tiempo no disponible por ahora.', ext: 'Esta radio se abre en su web.' }, newMsg: (n) => n > 1 ? n + ' mensajes nuevos' : '1 mensaje nuevo', surf: 'Superficie', inc: 'Incluido', house: 'Casa', cave: '🍷 Trastero', mans: { hab: '🏠 Buhardilla habitable', non: '🏠 Desván (almacén)' }, garage: { semi: '🚗 Garaje en el sótano', ext: '🚗 Garaje exterior', box: '🚗 Box' }, parking: '🅿️ Plaza de aparcamiento', jardin: '🌿 Jardín', balcon: '🌇 Balcón / terraza', maison: { isolee: 'independiente', jumelee: 'pareada', rangee: 'adosada' }, solo: 'Mensajes con tu administrador', soloHint: 'Escribe aquí a tu administrador: te responde en la app.' },
};
// ── Météo (7 jours, Open-Meteo : gratuit, sans clé, sans cookie) et radio ──
const WX_ICON = (c) => (c === 0 ? '☀️' : c <= 2 ? '🌤️' : c === 3 ? '☁️' : c <= 48 ? '🌫️' : c <= 57 ? '🌦️' : c <= 67 ? '🌧️' : c <= 77 ? '❄️' : c <= 82 ? '🌧️' : c <= 86 ? '🌨️' : '⛈️');
let wx = null, wxLoading = false;
const wxPlace = (d) => String(d.ville || '').replace(/^\s*(L-)?\d{4,5}\s*/i, '').trim() || 'Luxembourg';
// capitales des langues de l'app (le locataire choisit ; sinon la commune de son logement)
const WX_CITIES = { lu: ['🇱🇺', 'Luxembourg', 49.61, 6.13], fr: ['🇫🇷', 'Paris', 48.86, 2.35], de: ['🇩🇪', 'Berlin', 52.52, 13.41], gb: ['🇬🇧', 'London', 51.51, -0.13], it: ['🇮🇹', 'Roma', 41.9, 12.5], pt: ['🇵🇹', 'Lisboa', 38.72, -9.14], es: ['🇪🇸', 'Madrid', 40.42, -3.7] };
const wxCity = () => { try { const c = localStorage.getItem('espWxCity'); return WX_CITIES[c] ? c : ''; } catch { return ''; } };
async function wxLoad(d) {
  if (wxLoading) return;
  const city = WX_CITIES[wxCity()];
  const place = city ? city[1] : wxPlace(d), k = 'espWx:' + (city ? 'c:' : '') + place;
  try { const c = JSON.parse(localStorage.getItem(k) || 'null'); if (c && Date.now() - c.at < 3600e3) { wx = c; return wxPaint(); } } catch { /* stockage indisponible */ }
  wxLoading = true;
  try {
    const g = city ? { results: [{ name: city[1], latitude: city[2], longitude: city[3] }] } : await (await fetch('https://geocoding-api.open-meteo.com/v1/search?count=1&language=fr&name=' + encodeURIComponent(place))).json();
    const p = (g.results || [])[0] || { latitude: 49.61, longitude: 6.13, name: 'Luxembourg' };
    const f = await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.latitude}&longitude=${p.longitude}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=7&timezone=auto`)).json();
    wx = { at: Date.now(), name: p.name, now: f.current, days: f.daily };
    try { localStorage.setItem(k, JSON.stringify(wx)); } catch { /* stockage plein */ }
  } catch { wx = { err: 1 }; }
  wxLoading = false;
  wxPaint();
}
function wxHtml() {
  const w = (AX[lang] || AX.fr).wx;
  if (!wx) return '<p class="meta" style="margin:0">…</p>';
  if (wx.err || !wx.days) return `<p class="meta" style="margin:0">${esc(w.none)}</p>`;
  const dd = wx.days;
  const cur = wxCity(), home = data ? wxPlace(data) : 'Luxembourg';
  const sel = `<select class="wx-city" data-wx-city="1" aria-label="${esc(w.t)}"><option value="">🏠 ${esc(home)}</option>${Object.entries(WX_CITIES).filter(([k, c]) => !(k === 'lu' && /^luxembourg$/i.test(home)) || cur === k).map(([k, c]) => `<option value="${k}"${cur === k ? ' selected' : ''}>${c[0]} ${esc(c[1])}</option>`).join('')}</select>`;
  return `<div class="wx-now"><span class="wx-big" title="${esc(w.now)}">${WX_ICON(wx.now.weather_code)} ${Math.round(wx.now.temperature_2m)}°</span>${sel}</div>
    <div class="wx-days">${dd.time.map((t, i) => `<div class="wx-d${i === 0 ? ' today' : ''}"><small>${esc(new Date(t + 'T12:00:00').toLocaleDateString(T().loc, { weekday: 'short' }))}</small><span>${WX_ICON(dd.weather_code[i])}</span><b>${Math.round(dd.temperature_2m_max[i])}°</b><small>${Math.round(dd.temperature_2m_min[i])}°</small>${dd.precipitation_probability_max && dd.precipitation_probability_max[i] >= 40 ? `<small class="wx-rain">💧${dd.precipitation_probability_max[i]}%</small>` : ''}</div>`).join('')}</div>`;
}
function wxPaint() {
  const b = document.getElementById('wxBox'); if (b) b.innerHTML = wxHtml();
  const sm = document.getElementById('wxSum'); if (sm) sm.innerHTML = wxSumHtml();
}
// radio : celle du gestionnaire par défaut ; le locataire peut coller la sienne (gardée sur son téléphone)
const RADIO_DEF = { nom: 'Seven Radio', url: 'https://sevenradio.lu/?proradio-popup=1' };
const radioDef = () => (data && data.radio && data.radio.url ? data.radio : RADIO_DEF);
const radioMine = () => { try { return JSON.parse(localStorage.getItem('espRadio') || 'null'); } catch { return null; } };
const radioNow = () => radioMine() || radioDef();
const radioHost = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };
const isStream = (u) => /\.(mp3|aac|ogg|opus|m4a)(\?|$)|\/(stream|live|listen|radio)[^/]*$|;stream|icecast|shoutcast|radioking|infomaniak|zeno\.fm|streamtheworld|ice\d*\./i.test(u);
let radioEl = null;
function radioPlaying() { return radioEl && !radioEl.paused && radioEl.dataset.u === radioNow().url; }
function radioToggle() {
  const r = radioNow();
  // lien d'un site / lecteur web (ex. lecteur « popup » de la radio) : petite fenêtre du lecteur officiel
  if (!isStream(r.url)) { window.open(r.url, 'radio', /popup/i.test(r.url) ? 'popup,width=420,height=640' : ''); return; }
  if (!radioEl) { radioEl = document.createElement('audio'); radioEl.preload = 'none'; document.body.appendChild(radioEl); radioEl.addEventListener('play', radioPaint); radioEl.addEventListener('pause', radioPaint); radioEl.addEventListener('error', () => { radioPaint(); window.open(radioNow().url, '_blank', 'noopener'); }); }
  if (radioPlaying()) { radioEl.pause(); return; }
  if (radioEl.dataset.u !== r.url) { radioEl.src = r.url; radioEl.dataset.u = r.url; }
  radioEl.play().catch(() => {});
}
function radioHtml() {
  const w = (AX[lang] || AX.fr).wx, r = radioNow(), mine = radioMine(), def = radioDef(), on = radioPlaying();
  return `<div class="radio-row"><button class="radio-play${on ? ' on' : ''}" data-radio-play="1" aria-label="▶">${on ? '⏸' : '▶'}</button>
      <span class="grow"><b>📻 ${esc(r.nom || radioHost(r.url))}</b><br><span class="meta">${esc(radioHost(r.url))}${on ? ' · <span class="ok">● ' + esc(w.on) + '</span>' : isStream(r.url) ? '' : ' · ' + esc(/popup/i.test(r.url) ? w.pl : w.ext)}</span></span></div>
    <details class="more"><summary>${esc(w.change)}</summary>
      <div class="radio-form"><input id="radioUrl" type="url" inputmode="url" placeholder="${esc(w.ph)}" value="${esc(mine ? mine.url : '')}"><button class="btn sm" data-radio-save="1">${esc(w.save)}</button></div>
      ${mine ? `<button class="btn sm sec" style="margin-top:8px" data-radio-reset="1">📻 ${esc(w.back)} ${esc(def.nom || radioHost(def.url))}</button>` : ''}</details>`;
}
function radioPaint() {
  const b = document.getElementById('radioBox'); if (b) { const op = b.querySelector('details.more[open]'); b.innerHTML = radioHtml(); if (op) b.querySelector('details.more').open = true; }
  const sm = document.getElementById('wxSum'); if (sm) sm.innerHTML = wxSumHtml();
}
const wxSumHtml = () => `${wx && wx.now ? `${WX_ICON(wx.now.weather_code)} ${Math.round(wx.now.temperature_2m)}° · ` : ''}📻 ${esc(radioNow().nom || radioHost(radioNow().url))}${radioPlaying() ? ' ▶' : ''}`;
const axList = (d, a) => Object.entries(d.annex || {}).filter(([, v]) => v).map(([k, v]) => { const n = typeof a[k] === 'object' ? a[k][v] || '' : a[k] || ''; const m = (d.annexM2 || {})[k]; return n && m ? `${n} ${m} m²` : n; }).filter(Boolean);
const L = {
  fr: {
    ins: {"iosS": ["Dans la barre de Safari tout en bas de l’écran (pas dans cette page), touchez Partager {S}. Sur iPhone récent (iOS 26), touchez d’abord les trois points ⋯ en bas à droite, puis « Partager ». Pas de barre ? Faites défiler la page un peu vers le haut.", "Dans la liste qui s’ouvre, descendez et touchez « Sur l’écran d’accueil » ➕.", "Touchez « Ajouter » en haut à droite : l’icône NOBIS apparaît sur votre écran."], "iosC": ["Touchez l’icône Partager {S} en haut à droite, dans la barre d’adresse.", "Touchez « Ajouter à l’écran d’accueil », puis « Ajouter »."], "and": ["Touchez le menu ⋮ en haut à droite de Chrome.", "Touchez « Installer l’application » ou « Ajouter à l’écran d’accueil », puis « Installer »."], "app": "Vous êtes dans le navigateur d’une autre app (Facebook, Instagram…). Ouvrez d’abord ce lien dans Safari ou Chrome : menu ⋯ → « Ouvrir dans le navigateur ».", "tip": "« Sur l’écran d’accueil » n’apparaît pas ? Tout en bas de la liste, touchez « Modifier les actions » et ajoutez-le. En navigation privée, ouvrez un onglet normal.", "copy": "Copier le lien"},
    g: {"sub": "puis ouvrez l’app en touchant l’icône NOBIS", "i1": "Tout en bas de l’écran, dans la barre de Safari, touchez les trois points ⋯ (ou directement l’icône Partager).", "i2": "Touchez « Partager ».", "i3": "Faites défiler et touchez « Sur l’écran d’accueil ».", "i4": "Touchez « Ajouter » en haut à droite.", "done": "C’est fait ! Pour aller dans l’app, touchez l’icône NOBIS sur votre écran.", "a1": "En haut à droite de Chrome, touchez les trois points ⋮.", "a2": "Touchez « Installer l’application » (ou « Ajouter à l’écran d’accueil »).", "a3": "Touchez « Installer ».", "safari": "Sur iPhone, ouvrez cette page avec Safari."},
    ui: {"share": "Partager", "a2hs": "Sur l’écran d’accueil", "add": "Ajouter", "cancel": "Annuler", "fav": "Ajouter aux favoris", "find": "Rechercher dans la page", "newTab": "Nouvel onglet", "hist": "Historique", "ainstall": "Installer l’application", "ainstallBtn": "Installer"},
    hr: {"gate": "Avant d’utiliser l’app, lisez le règlement de la maison et acceptez-le. C’est obligatoire, une seule fois (et à nouveau si le règlement change).", "changed": "Le règlement a changé : merci de le relire et de l’accepter à nouveau.", "R": ["Calme : pas de bruit entre 22 h et 7 h, ni le dimanche et les jours fériés ; musique et appels à volume modéré.", "Propreté : cuisine, salle de bain et parties communes propres après chaque utilisation ; vaisselle lavée et rangée le jour même.", "Évacuations : pas de cheveux, restes de nourriture, huile ou lingettes dans les éviers, douches et WC.", "Déchets : trier selon les consignes et sortir les poubelles le bon jour (voir « Collectes des déchets »).", "Tabac : il est interdit de fumer ou de vapoter à l’intérieur.", "Visiteurs : pas d’hébergement d’une autre personne ni de sous-location sans accord écrit du gestionnaire.", "Sécurité : fermer la porte d’entrée, ne jamais donner clés ou codes, ne rien laisser dans les couloirs, pas de chauffage d’appoint ni de bouteille de gaz.", "Énergie : fermer les fenêtres quand le chauffage est allumé, éteindre lumières et appareils inutiles.", "Problèmes : signaler tout de suite un dégât ou une panne, depuis l’app.", "Respect : pas d’insultes, de menaces ni de discriminations. Les messages de la maison sont lus par le gestionnaire, qui peut intervenir."], "rulesT": "Règlement de la maison", "rulesExtra": "Règles propres à votre immeuble", "rulesAccept": "✓ J’ai lu et j’accepte le règlement", "rulesOk": "Règlement accepté le", "board": "Messages de la maison", "boardHint": "Mini-chat entre les habitants de votre logement. Le gestionnaire lit aussi les messages pour éviter les conflits : restez courtois.", "boardPh": "Votre message…", "boardEmpty": "Aucun message pour le moment. Écrivez le premier !", "boardFirst": "Pour écrire, acceptez d’abord le règlement de la maison.", "mgr": "Gestionnaire", "refresh": "↻ Actualiser", "rgpd2": "Si les messages de la maison sont activés, ce que vous y écrivez est visible par les autres habitants de votre logement et par votre gestionnaire (prévention des conflits, intérêt légitime) ; ces messages sont chiffrés et effacés automatiquement après 90 jours. Votre acceptation du règlement est enregistrée avec sa date."},
    rc: { btn: '📄 Récapitulatif de tous mes loyers payés', title: 'Récapitulatif des loyers payés', cols: ['Mois', 'Loyer', 'Payé', 'Date du paiement'], total: 'Total', partial: 'paiement partiel', paidN: (n) => `${n} mois payé${n > 1 ? 's' : ''}`,
      text: (s, n, a, f, to) => `Je soussigné(e), ${s}, locataire principal et bailleur, déclare avoir reçu de ${n} les sommes détaillées ci-dessus, soit un total de ${a}, au titre des loyers de ${f} à ${to}, et lui en donne quittance.` },
    more: (n) => `Voir les ${n} suivantes`,
    tl: {"title": "Don · prêt · location d’objets", "hint": "Donnez, prêtez ou louez vos objets (outils, électroménager, meubles…). Les intéressés vous écrivent par email ; l’argent s’échange entre vous, en espèces à la remise.", "see": "🌐 Voir toutes les annonces", "mine": "Mes annonces", "add": "➕ Publier un objet", "photos": "Photos (1 à 3)", "t": "Titre (ex. Perceuse Bosch)", "kind": "Type", "kinds": {"don": "🎁 Don (gratuit)", "pret": "🤝 Prêt gratuit", "loc": "💶 Location"}, "price": "Prix (€)", "unit": "Par", "units": {"h": "heure", "j": "jour", "we": "week-end", "s": "semaine", "u": "prix unique"}, "desc": "Description (état, marque, accessoires…)", "rules": "Vos conditions (caution, retour…)", "lieu": "Lieu de remise (ex. Luxembourg-Gare)", "mail": "Votre email (donné seulement à ceux qui touchent « Je suis intéressé »)", "ok": "J’accepte les règles d’utilisation : mon annonce et mes photos sont publiées sur luxinterventions.com (sans mon nom ni mon adresse) ; mon prénom et mon email sont donnés aux personnes intéressées.", "send": "Envoyer pour approbation", "sent": "Merci ! Votre annonce sera en ligne dès que le gestionnaire l’aura approuvée.", "st": {"pending": "⏳ En attente d’approbation", "ok": "✅ En ligne", "exp": "⌛ Expirée"}, "del": "Retirer", "delQ": "Retirer cette annonce ?", "rulesLink": "Règles d’utilisation", "need": "Ajoutez au moins une photo.", "inter": (n) => `📩 ${n} personne${n > 1 ? 's' : ''} intéressée${n > 1 ? 's' : ''} — regardez vos emails`},
    bn: { meObj: 'toi', insteadMe: (w, c) => `🙋 Tu l’as fait à la place de ${w} : ${c}`, forgotMsg: (n, c) => `⚠️ Tour oublié : ${n} (${c})`, insteadMsg: (n, w, c) => `🙋 ${n} l’a fait à la place de ${w} : ${c}`, instead: '🙋 Je l’ai fait à sa place', catch: 'rattrapage', board: '🏆 Classement de l’année', owe: (n) => `🔁 ${n} à rattraper`, you: 'C’est ton tour', tonight: 'Ce soir', morning: 'Ce matin', done: '✅ Fait', cant: '🔁 Je ne peux pas', take: '🙋 Je le fais', me: 'toi', turn: 'tour de', doneBy: 'fait par',
      doneMsg: (n, c) => `✅ ${n} a sorti : ${c}`, cantMsg: (n, c) => `🔁 ${n} ne peut pas sortir : ${c} — qui le fait ?`, takeMsg: (n, c) => `🙋 ${n} s’en occupe : ${c}`, ask: (n, c) => `${n} ne peut pas (${c}). Tu peux le faire ?` },
    ed: {"t": "État des lieux", "hint": "Les photos de votre logement à votre arrivée, pièce par pièce (touchez pour agrandir).", "none": "pas encore de photo", "rooms": {"sdb": "🛁 Salle de bain", "cuisine": "🍳 Cuisine", "chambre": "🛏️ Chambre", "cave": "📦 Cave", "buanderie": "🧺 Buanderie", "parking": "🚗 Parking"}, "out": "🚪 À mon départ : mes photos de sortie", "outHint": "Le jour de votre départ, prenez une photo de chaque pièce et envoyez-les : nous les comparons avec celles de votre arrivée.", "cam": "📷 Photo", "gal": "🖼️ Galerie", "send": "Envoyer mes photos de sortie", "sent": "✓ envoyée le", "ok": "Merci ! Vos photos de sortie sont envoyées.", "pick": "Prenez au moins une photo.", "map": "🗺️ Ouvrir dans Google Maps", "mapHint": "Itinéraire, taxi : montrez cette adresse au chauffeur."},
    ad: {"back": "📣 Publicité", "t": "Bons plans du quartier", "hint": "Nos partenaires près de chez vous. Touchez une annonce : la carte s’affiche en haut.", "see": "🗺️ Voir sur la carte", "route": "🧭 Itinéraire", "home": "🏠 Mon logement", "call": "📞 Appeler", "web": "🌐 Site web", "cats": {"musique": "🎵 Musique", "resto": "🍕 Pizzeria / restaurant", "bar": "🍺 Bar / pub", "horeca": "☕ Café / snack", "bricolage": "🔨 Bricolage / jardinage", "meubles": "🛋️ Meubles / décoration", "courses": "🛒 Supermarché", "proxi": "🏪 Commerce de proximité", "bureau": "🏢 Bureaux", "social": "📱 Réseaux sociaux", "services": "🧰 Services", "autre": "📌 Autre"}, "lbl": "Publicité", "mapT": "Carte"},
    nt: {"t": "🔔 Notifications", "hint": "Recevez un avis et le numéro sur l’icône quand il y a un message ou du nouveau.", "on": "🔔 Activer les notifications", "ok": "✓ Notifications activées sur ce téléphone", "install": "iPhone : installez d’abord l’app sur l’écran d’accueil, ouvrez-la depuis l’icône, puis activez ici les notifications.", "denied": "Les notifications sont bloquées : réactivez-les dans les réglages du téléphone (Notifications → cette app).", "err": "Impossible d’activer les notifications sur ce téléphone."},
    men: {"today": "Aujourd’hui, la femme de ménage passe", "at": "arrivée prévue à", "q": "Êtes-vous satisfait du ménage ?", "crit": "Critère", "opts": ["😞 Insuffisant", "😐 Suffisant", "🙂 Bien", "⭐ Excellent"], "thanks": "Merci pour votre avis !", "dl": "⬇️ Télécharger mon contrat", "tomorrow": "Demain, la femme de ménage passe", "noToday": "Aujourd’hui, la femme de ménage ne passe pas", "noTomorrow": "Demain, la femme de ménage ne passe pas", "noWhy": "Problème technique ou absence : le passage sera reprogrammé."},
    mt: {"offL": "Ne passe pas", "t": "Maintenance", "today": "Aujourd’hui", "tomorrow": "Demain", "off": "ne passe pas (problème technique ou absence)", "none": "Aucun passage prévu dans les 7 prochains jours.", "rate": "Le ménage d’aujourd’hui", "m": {"menage": "🧹 Femme de ménage", "menuisier": "🪚 Menuisier", "electricien": "💡 Électricien", "plombier": "🚰 Plombier", "chauffagiste": "🔥 Chauffagiste", "macon": "🧱 Maçon", "peintre": "🎨 Peintre", "serrurier": "🔑 Serrurier", "jardinier": "🌿 Jardinier", "autre": "🔧 Ouvrier"}},
    mc: {"add": "✍️ Ajouter un commentaire", "tags": {"ok": "⏰ À l’heure", "late": "⏰ En retard", "nice": "😊 Aimable", "rude": "😠 Désagréable", "clean": "✨ Bien nettoyé", "dirty": "🧹 Oublis / mal nettoyé"}, "ph": "ex. Venue à l’heure, très aimable, le palier n’a pas été lavé…", "send": "Envoyer", "ok": "✓ Commentaire envoyé, merci !"},
    dk: { t: '🔑 Ma clé digitale', on: 'Actif', until: 'valable jusqu’au', noEnd: 'sans date de fin', left: (n) => (n <= 0 ? 'dernier jour' : n === 1 ? 'encore 1 jour' : `encore ${n} jours`) },
    cr: {"t": "Règles de votre immeuble", "eve": "La veille au soir", "day": "Le jour même, tôt le matin", "after": "après {h} h", "before": "avant {h} h", "lieux": {"rue": "sur le trottoir", "soussol": "au sous-sol (local poubelles)", "garage": "au garage", "autre": "voir la remarque"}, "today": "Aujourd’hui", "tomorrow": "Demain"},
    loc: 'fr-LU', door: 'Code de ma porte', since: 'depuis le', app: 'App des locataires NOBIS s.a.r.l.', welcome: 'Vos loyers, quittances, documents et collectes — et signaler un problème, depuis votre téléphone.', code: 'Votre code d’accès personnel', codePh: 'ex. K7PM2-QXA4H', enter: 'Entrer', noCode: 'Pas de code ? Demandez-le à votre gestionnaire.', badCode: 'Code inconnu. Vérifiez-le ou demandez un nouveau code.', install: "Installer l’icône sur mon téléphone", iosHow: 'iPhone : touchez Partager puis « Sur l’écran d’accueil ».', andHow: 'Android : menu ⋮ puis « Installer l’application ».', logout: 'Se déconnecter de ce téléphone', title: 'Mon espace locataire', hello: 'Bonjour', avis: 'Avis de l’immeuble', pay: 'Mes loyers', restNow: 'Impayé à ce jour', upcoming: 'à venir', allPaid: 'Tout est payé à ce jour ✓',
    pv: { btn: '💳 Payer maintenant', tabs: { vir: '🏦 Virement', pp: '🅿️ PayPal', card: '💳 Carte', crypto: '₿ Crypto' }, ppGo: 'Ouvrir PayPal', cardGo: 'Payer par carte', toType: (a, r) => `Montant : ${a} · Communication : ${r}`, net: 'Réseau', cryAmt: (a) => `Envoyez l’équivalent de ${a} au cours du jour.`, cryNet: 'Vérifiez bien le réseau : un envoi sur un mauvais réseau est perdu.', done2: '✅ J’ai payé', thanks: (d) => `Merci ! Paiement signalé le ${d}. Le mois sera coché dès réception.`, title: 'Régler par virement', who: 'Bénéficiaire', amt: 'Montant', copy: 'Copier', copied: '✓ Copié', how: 'Ouvrez l’app de votre banque → Virement, puis collez ces informations (touchez « Copier »).', qr: 'Ou scannez ce QR code avec l’app de votre banque (depuis un autre écran).', done: '✅ J’ai fait le virement', doneQ: 'Confirmez-vous avoir payé ?', note: (n) => `Aucun paiement ne passe par cette app : l’argent va directement à ${n}.` }, iban: 'Pour payer', ref: 'Communication', quit: 'Mes quittances', quitBtn: 'Quittance', partial: 'Reçu partiel', contrat: 'Mon contrat', entry: 'Entrée', end: 'Fin du contrat', rent: 'Loyer', revision: 'Prochaine révision', caution: 'Garantie',
    docs: 'Mon dossier', dossierHint: 'Documents et preuves que nous avons enregistrés pour vous (touchez 👁 pour voir). Une erreur ou un document manquant ? Dites-le-nous.', errBtn: '⚠️ Signaler une erreur', recv: 'reçue le', proof: 'Preuve', modes: { especes: 'en main propre', virement: 'par virement', cheque: 'par chèque', garantie: 'garantie bancaire', autre: '' }, dt: { bail: 'Contrat de bail', identite: 'Pièce d’identité', cns: 'Carte CNS', caution: 'Preuve de la caution', loyer: 'Preuve de paiement du loyer', assurance: 'Assurance habitation', revenus: 'Revenus', titre: 'Titre de séjour', autre: 'Document' }, coll: 'Collectes des déchets', putOut: 'sortir', truck: 'passage du camion le', calAdd: '📅 Ajouter les collectes à mon calendrier', signal: 'Signaler un problème', what: 'Quel problème ?', whatPh: 'ex. Fuite sous l’évier de la cuisine depuis ce matin', type: 'Type', types: { rep: '🔧 Réparation / panne', menage: '🧹 Propreté / nettoyage', dossier: '📄 Erreur dans mon dossier / mes paiements', autre: '📌 Autre' },
    photos: 'Photos (3 maximum)', tel: 'Téléphone pour vous joindre (facultatif)', dispo: 'Quand êtes-vous disponible ? (facultatif)', send: 'Envoyer', sent: 'Merci, votre message a été envoyé. Vous verrez ici quand il sera pris en charge.', mine: 'Mes signalements',
    st: { afaire: 'Reçu', planifie: 'Planifié', fait: 'Terminé' }, lights: ['Prochainement', 'Demain', 'Aujourd’hui — urgent'], legend: 'Légende',
    months: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'], monthsFull: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
    off: 'Cet espace n’est plus actif. Contactez votre gestionnaire.', bad: 'Lien incomplet. Ouvrez le lien exactement comme vous l’avez reçu.', personal: 'Ce lien est personnel : ne le partagez pas.', updated: 'Mis à jour le',
    rgpdT: 'Protection de vos données (RGPD)',
    rgpd: (s) => `Cet espace est géré par ${s.nom}${s.adresse ? ', ' + s.adresse + ' ' + s.ville : ''}, votre bailleur (locataire principal). Il affiche uniquement vos propres informations de location (loyers, contrat, documents partagés) pour vous permettre de les consulter ; base légale : l'exécution de votre contrat de location. Vos données sont chiffrées : la clé se trouve seulement dans votre lien personnel, ni l'hébergeur (Cloudflare) ni personne d'autre ne peut les lire. Les messages que vous envoyez ne sont lisibles que par votre gestionnaire et servent uniquement à traiter votre demande. L'espace est désactivé à la fin de votre location ; les données de location sont conservées la durée du bail plus 10 ans (obligations comptables). Vous pouvez demander l'accès, la rectification ou l'effacement de vos données${s.email ? ' à ' + s.email : ' à votre gestionnaire'}, et introduire une réclamation auprès de la CNPD (cnpd.public.lu). Aucun cookie publicitaire, aucun suivi.`,
    quitTitle: 'Quittance de loyer', quitPart: 'Reçu de paiement partiel', landlord: 'Locataire principal (bailleur)', tenant: 'Sous-locataire', period: (m, y) => `Période : ${m} ${y}`,
    quitText: (s, n, a, m, y) => `Je soussigné(e), ${s}, locataire principal et bailleur, déclare avoir reçu de ${n} la somme de ${a} au titre du loyer de ${m} ${y}, et lui en donne quittance.`, print: 'Imprimer / enregistrer en PDF', close: 'Fermer',
  },
  it: {
    ins: {"iosS": ["Nella barra di Safari in fondo allo schermo (non in questa pagina) tocca Condividi {S}. Su iPhone recenti (iOS 26) tocca prima i tre puntini ⋯ in basso a destra, poi « Condividi ». Non vedi la barra? Scorri un po’ la pagina verso l’alto.", "Nell’elenco che si apre scorri in basso e tocca « Aggiungi alla schermata Home » ➕.", "Tocca « Aggiungi » in alto a destra: l’icona NOBIS compare sul tuo schermo."], "iosC": ["Tocca l’icona Condividi {S} in alto a destra, nella barra dell’indirizzo.", "Tocca « Aggiungi alla schermata Home », poi « Aggiungi »."], "and": ["Tocca il menu ⋮ in alto a destra di Chrome.", "Tocca « Installa app » o « Aggiungi a schermata Home », poi « Installa »."], "app": "Sei nel browser di un’altra app (Facebook, Instagram…). Apri prima questo link in Safari o Chrome: menu ⋯ → « Apri nel browser ».", "tip": "Non trovi « Aggiungi alla schermata Home »? In fondo all’elenco tocca « Modifica azioni » e aggiungilo. In navigazione privata apri una scheda normale.", "copy": "Copia il link"},
    g: {"sub": "poi apri l’app toccando l’icona NOBIS", "i1": "In fondo allo schermo, nella barra di Safari, tocca i tre puntini ⋯ (o direttamente l’icona Condividi).", "i2": "Tocca « Condividi ».", "i3": "Scorri e tocca « Aggiungi alla schermata Home ».", "i4": "Tocca « Aggiungi » in alto a destra.", "done": "Fatto! Per entrare nell’app tocca l’icona NOBIS sul tuo schermo.", "a1": "In alto a destra di Chrome tocca i tre puntini ⋮.", "a2": "Tocca « Installa app » (o « Aggiungi a schermata Home »).", "a3": "Tocca « Installa ».", "safari": "Su iPhone apri questa pagina con Safari."},
    ui: {"share": "Condividi", "a2hs": "Aggiungi alla schermata Home", "add": "Aggiungi", "cancel": "Annulla", "fav": "Aggiungi ai preferiti", "find": "Trova nella pagina", "newTab": "Nuova scheda", "hist": "Cronologia", "ainstall": "Installa app", "ainstallBtn": "Installa"},
    hr: {"gate": "Prima di usare l’app, leggi il regolamento della casa e accettalo. È obbligatorio, una volta sola (e di nuovo se il regolamento cambia).", "changed": "Il regolamento è cambiato: rileggilo e accettalo di nuovo.", "R": ["Silenzio: niente rumori tra le 22 e le 7, né la domenica e i festivi; musica e telefonate a volume moderato.", "Pulizia: cucina, bagno e spazi comuni puliti dopo ogni uso; piatti lavati e riposti in giornata.", "Scarichi: niente capelli, avanzi di cibo, olio o salviette in lavandini, docce e WC.", "Rifiuti: fare la differenziata e portare fuori i bidoni il giorno giusto (vedi « Raccolta rifiuti »).", "Fumo: è vietato fumare o svapare all’interno.", "Ospiti: non si può ospitare un’altra persona né subaffittare senza accordo scritto del gestore.", "Sicurezza: chiudere il portone, non dare mai chiavi o codici, non lasciare nulla nei corridoi, niente stufette né bombole di gas.", "Energia: chiudere le finestre con il riscaldamento acceso, spegnere luci e apparecchi inutili.", "Problemi: segnalare subito ogni danno o guasto dall’app.", "Rispetto: niente insulti, minacce o discriminazioni. I messaggi della casa sono letti dal gestore, che può intervenire."], "rulesT": "Regolamento della casa", "rulesExtra": "Regole particolari del tuo stabile", "rulesAccept": "✓ Ho letto e accetto il regolamento", "rulesOk": "Regolamento accettato il", "board": "Bacheca della casa", "boardHint": "Mini-chat tra gli abitanti del tuo alloggio. Anche il gestore legge i messaggi per evitare litigi: resta cortese.", "boardPh": "Il tuo messaggio…", "boardEmpty": "Ancora nessun messaggio. Scrivi il primo!", "boardFirst": "Per scrivere, accetta prima il regolamento della casa.", "mgr": "Gestore", "refresh": "↻ Aggiorna", "rgpd2": "Se la bacheca della casa è attiva, ciò che vi scrivi è visibile agli altri abitanti del tuo alloggio e al gestore (prevenzione dei conflitti, interesse legittimo); i messaggi sono cifrati e cancellati automaticamente dopo 90 giorni. L’accettazione del regolamento viene registrata con la data."},
    rc: { btn: '📄 Riepilogo di tutti i miei affitti pagati', title: 'Riepilogo degli affitti pagati', cols: ['Mese', 'Affitto', 'Pagato', 'Data del pagamento'], total: 'Totale', partial: 'pagamento parziale', paidN: (n) => `${n} mes${n > 1 ? 'i' : 'e'} pagat${n > 1 ? 'i' : 'o'}`,
      text: (s, n, a, f, to) => `Il/la sottoscritto/a, ${s}, locatario principale e locatore, dichiara di aver ricevuto da ${n} le somme dettagliate sopra, per un totale di ${a}, a titolo di affitto da ${f} a ${to}, e ne rilascia quietanza.` },
    more: (n) => `Vedi le altre ${n}`,
    tl: {"title": "Regalo · prestito · noleggio di oggetti", "hint": "Regala, presta o noleggia i tuoi oggetti (attrezzi, elettrodomestici, mobili…). Gli interessati ti scrivono per email; i soldi si scambiano tra voi, in contanti alla consegna.", "see": "🌐 Vedi tutti gli annunci", "mine": "I miei annunci", "add": "➕ Pubblica un oggetto", "photos": "Foto (da 1 a 3)", "t": "Titolo (es. Trapano Bosch)", "kind": "Tipo", "kinds": {"don": "🎁 Regalo (gratis)", "pret": "🤝 Prestito gratuito", "loc": "💶 Noleggio"}, "price": "Prezzo (€)", "unit": "Per", "units": {"h": "ora", "j": "giorno", "we": "weekend", "s": "settimana", "u": "prezzo unico"}, "desc": "Descrizione (stato, marca, accessori…)", "rules": "Le tue condizioni (cauzione, restituzione…)", "lieu": "Luogo di consegna (es. Luxembourg-Gare)", "mail": "La tua email (data solo a chi tocca « Sono interessato »)", "ok": "Accetto le regole d’uso: il mio annuncio e le mie foto sono pubblicati su luxinterventions.com (senza nome né indirizzo); il mio nome e la mia email sono dati alle persone interessate.", "send": "Invia per l’approvazione", "sent": "Grazie! Il tuo annuncio sarà online appena il gestore l’avrà approvato.", "st": {"pending": "⏳ In attesa di approvazione", "ok": "✅ Online", "exp": "⌛ Scaduto"}, "del": "Ritira", "delQ": "Ritirare questo annuncio?", "rulesLink": "Regole d’uso", "need": "Aggiungi almeno una foto.", "inter": (n) => `📩 ${n} person${n > 1 ? 'e interessate' : 'a interessata'} — guarda la tua email`},
    bn: { meObj: 'te', insteadMe: (w, c) => `🙋 L’hai fatto tu al posto di ${w}: ${c}`, forgotMsg: (n, c) => `⚠️ Turno dimenticato: ${n} (${c})`, insteadMsg: (n, w, c) => `🙋 ${n} l’ha fatto al posto di ${w}: ${c}`, instead: '🙋 L’ho fatto io al suo posto', catch: 'recupero', board: '🏆 Classifica dell’anno', owe: (n) => `🔁 ${n} da recuperare`, you: 'Tocca a te', tonight: 'Stasera', morning: 'Stamattina', done: '✅ Fatto', cant: '🔁 Non posso', take: '🙋 Lo faccio io', me: 'tu', turn: 'turno di', doneBy: 'fatto da',
      doneMsg: (n, c) => `✅ ${n} ha messo fuori: ${c}`, cantMsg: (n, c) => `🔁 ${n} non può mettere fuori: ${c} — chi lo fa?`, takeMsg: (n, c) => `🙋 ${n} se ne occupa: ${c}`, ask: (n, c) => `${n} non può (${c}). Puoi farlo tu?` },
    ed: {"t": "Stato dei luoghi", "hint": "Le foto del tuo alloggio al tuo arrivo, stanza per stanza (tocca per ingrandire).", "none": "ancora nessuna foto", "rooms": {"sdb": "🛁 Bagno", "cuisine": "🍳 Cucina", "chambre": "🛏️ Camera", "cave": "📦 Cantina", "buanderie": "🧺 Lavanderia", "parking": "🚗 Parcheggio"}, "out": "🚪 Alla mia partenza: le mie foto di uscita", "outHint": "Il giorno della partenza, fai una foto di ogni stanza e inviale: le confrontiamo con quelle del tuo arrivo.", "cam": "📷 Foto", "gal": "🖼️ Galleria", "send": "Invia le mie foto di uscita", "sent": "✓ inviata il", "ok": "Grazie! Le tue foto di uscita sono state inviate.", "pick": "Fai almeno una foto.", "map": "🗺️ Apri in Google Maps", "mapHint": "Percorso, taxi: mostra questo indirizzo al tassista."},
    ad: {"back": "📣 Pubblicità", "t": "Offerte del quartiere", "hint": "I nostri partner vicino a te. Tocca un annuncio: la mappa appare in alto.", "see": "🗺️ Vedi sulla mappa", "route": "🧭 Itinerario", "home": "🏠 Il mio alloggio", "call": "📞 Chiama", "web": "🌐 Sito web", "cats": {"musique": "🎵 Musica", "resto": "🍕 Pizzeria / ristorante", "bar": "🍺 Bar / pub", "horeca": "☕ Caffè / snack", "bricolage": "🔨 Fai da te / giardinaggio", "meubles": "🛋️ Mobili / arredamento", "courses": "🛒 Supermercato", "proxi": "🏪 Negozio di prossimità", "bureau": "🏢 Uffici", "social": "📱 Social media", "services": "🧰 Servizi", "autre": "📌 Altro"}, "lbl": "Pubblicità", "mapT": "Mappa"},
    nt: {"t": "🔔 Notifiche", "hint": "Ricevi un avviso e il numerino sull’icona quando c’è un messaggio o una novità.", "on": "🔔 Attiva le notifiche", "ok": "✓ Notifiche attive su questo telefono", "install": "iPhone: prima installa l’app sulla schermata Home, aprila dall’icona, poi attiva qui le notifiche.", "denied": "Le notifiche sono bloccate: riattivale nelle impostazioni del telefono (Notifiche → questa app).", "err": "Impossibile attivare le notifiche su questo telefono."},
    men: {"today": "Oggi passa la donna delle pulizie", "at": "arrivo previsto alle", "q": "Sei soddisfatto della pulizia?", "crit": "Criterio", "opts": ["😞 Scarso", "😐 Sufficiente", "🙂 Buono", "⭐ Eccellente"], "thanks": "Grazie per il tuo voto!", "dl": "⬇️ Scarica il mio contratto", "tomorrow": "Domani passa la donna delle pulizie", "noToday": "Oggi la donna delle pulizie non passa", "noTomorrow": "Domani la donna delle pulizie non passa", "noWhy": "Problema tecnico o assenza: il passaggio sarà riprogrammato."},
    mt: {"offL": "Non passa", "t": "Manutenzione", "today": "Oggi", "tomorrow": "Domani", "off": "non passa (problema tecnico o assenza)", "none": "Nessun passaggio previsto nei prossimi 7 giorni.", "rate": "Le pulizie di oggi", "m": {"menage": "🧹 Donna delle pulizie", "menuisier": "🪚 Falegname", "electricien": "💡 Elettricista", "plombier": "🚰 Idraulico", "chauffagiste": "🔥 Tecnico caldaie", "macon": "🧱 Muratore", "peintre": "🎨 Imbianchino", "serrurier": "🔑 Fabbro", "jardinier": "🌿 Giardiniere", "autre": "🔧 Operaio"}},
    mc: {"add": "✍️ Aggiungi un commento", "tags": {"ok": "⏰ In orario", "late": "⏰ In ritardo", "nice": "😊 Gentile", "rude": "😠 Scortese", "clean": "✨ Pulito bene", "dirty": "🧹 Dimenticanze / pulito male"}, "ph": "es. Arrivata in orario, molto gentile, il pianerottolo non è stato lavato…", "send": "Invia", "ok": "✓ Commento inviato, grazie!"},
    dk: { t: '🔑 La mia chiave digitale', on: 'Attiva', until: 'valida fino al', noEnd: 'senza data di fine', left: (n) => (n <= 0 ? 'ultimo giorno' : n === 1 ? 'ancora 1 giorno' : `ancora ${n} giorni`) },
    cr: {"t": "Regole del tuo palazzo", "eve": "La sera prima", "day": "Il giorno stesso, di mattina presto", "after": "dopo le {h}", "before": "prima delle {h}", "lieux": {"rue": "sul marciapiede", "soussol": "in cantina (locale rifiuti)", "garage": "in garage", "autre": "vedi la nota"}, "today": "Oggi", "tomorrow": "Domani"},
    loc: 'it-IT', door: 'Codice della mia porta', since: 'dal', app: 'App degli inquilini NOBIS s.a.r.l.', welcome: 'I tuoi affitti, ricevute, documenti e raccolte dei rifiuti — e segnalare un problema, dal telefono.', code: 'Il tuo codice d’accesso personale', codePh: 'es. K7PM2-QXA4H', enter: 'Entra', noCode: 'Non hai il codice? Chiedilo al tuo gestore.', badCode: 'Codice sconosciuto. Controllalo o chiedi un nuovo codice.', install: "Installa l’icona sul mio telefono", iosHow: 'iPhone: tocca Condividi e poi « Aggiungi alla schermata Home ».', andHow: 'Android: menu ⋮ e poi « Installa app ».', logout: 'Esci da questo telefono', title: 'Il mio spazio inquilino', hello: 'Ciao', avis: 'Avvisi del palazzo', pay: 'I miei affitti', restNow: 'Da pagare a oggi', upcoming: 'in scadenza', allPaid: 'Tutto pagato a oggi ✓',
    pv: { btn: '💳 Paga ora', tabs: { vir: '🏦 Bonifico', pp: '🅿️ PayPal', card: '💳 Carta', crypto: '₿ Crypto' }, ppGo: 'Apri PayPal', cardGo: 'Paga con carta', toType: (a, r) => `Importo: ${a} · Causale: ${r}`, net: 'Rete', cryAmt: (a) => `Invia l’equivalente di ${a} al cambio del giorno.`, cryNet: 'Controlla bene la rete: un invio sulla rete sbagliata va perso.', done2: '✅ Ho pagato', thanks: (d) => `Grazie! Pagamento segnalato il ${d}. Il mese sarà spuntato appena arriva.`, title: 'Pagare con bonifico', who: 'Beneficiario', amt: 'Importo', copy: 'Copia', copied: '✓ Copiato', how: 'Apri l’app della tua banca → Bonifico, poi incolla questi dati (tocca « Copia »).', qr: 'Oppure inquadra questo QR code con l’app della tua banca (da un altro schermo).', done: '✅ Ho fatto il bonifico', doneQ: 'Confermi di aver pagato?', note: (n) => `Nessun pagamento passa da questa app: i soldi vanno direttamente a ${n}.` }, iban: 'Per pagare', ref: 'Causale', quit: 'Le mie ricevute', quitBtn: 'Ricevuta', partial: 'Ricevuta parziale', contrat: 'Il mio contratto', entry: 'Entrata', end: 'Fine del contratto', rent: 'Affitto', revision: 'Prossima revisione', caution: 'Cauzione',
    docs: 'La mia pratica', dossierHint: 'Documenti e prove che abbiamo registrato per te (tocca 👁 per vederli). Un errore o un documento mancante? Diccelo.', errBtn: '⚠️ Segnala un errore', recv: 'ricevuta il', proof: 'Prova', modes: { especes: 'a mano (contanti)', virement: 'con bonifico', cheque: 'con assegno', garantie: 'garanzia bancaria', autre: '' }, dt: { bail: 'Contratto di locazione', identite: 'Documento d’identità', cns: 'Tessera sanitaria (CNS)', caution: 'Prova della cauzione', loyer: 'Prova di pagamento dell’affitto', assurance: 'Assicurazione casa', revenus: 'Redditi', titre: 'Permesso di soggiorno', autre: 'Documento' }, coll: 'Raccolta rifiuti', putOut: 'mettere fuori', truck: 'passaggio del camion il', calAdd: '📅 Aggiungi le raccolte al mio calendario', signal: 'Segnala un problema', what: 'Quale problema?', whatPh: 'es. Perdita d’acqua sotto il lavello della cucina da stamattina', type: 'Tipo', types: { rep: '🔧 Riparazione / guasto', menage: '🧹 Pulizia', dossier: '📄 Errore nella mia pratica / nei pagamenti', autre: '📌 Altro' },
    photos: 'Foto (massimo 3)', tel: 'Telefono per contattarti (facoltativo)', dispo: 'Quando sei disponibile? (facoltativo)', send: 'Invia', sent: 'Grazie, il tuo messaggio è stato inviato. Qui vedrai quando verrà preso in carico.', mine: 'Le mie segnalazioni',
    st: { afaire: 'Ricevuta', planifie: 'Pianificata', fait: 'Conclusa' }, lights: ['Prossimamente', 'Domani', 'Oggi — urgente'], legend: 'Legenda',
    months: ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'], monthsFull: ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'],
    off: 'Questo spazio non è più attivo. Contatta il tuo gestore.', bad: 'Link incompleto. Apri il link esattamente come l’hai ricevuto.', personal: 'Questo link è personale: non condividerlo.', updated: 'Aggiornato il',
    rgpdT: 'Protezione dei tuoi dati (GDPR)',
    rgpd: (s) => `Questo spazio è gestito da ${s.nom}${s.adresse ? ', ' + s.adresse + ' ' + s.ville : ''}, il tuo locatore (locatario principale). Mostra solo le tue informazioni di locazione (affitti, contratto, documenti condivisi) per permetterti di consultarle; base giuridica: l'esecuzione del tuo contratto di locazione. I tuoi dati sono cifrati: la chiave si trova solo nel tuo link personale, né l'hosting (Cloudflare) né nessun altro può leggerli. I messaggi che invii possono essere letti solo dal tuo gestore e servono solo a trattare la tua richiesta. Lo spazio viene disattivato alla fine della locazione; i dati sono conservati per la durata del contratto più 10 anni (obblighi contabili). Puoi chiedere l'accesso, la rettifica o la cancellazione dei tuoi dati${s.email ? ' a ' + s.email : ' al tuo gestore'} e presentare reclamo alla CNPD (cnpd.public.lu). Nessun cookie pubblicitario, nessun tracciamento.`,
    quitTitle: 'Ricevuta d’affitto (Quittance de loyer)', quitPart: 'Ricevuta di pagamento parziale', landlord: 'Locatario principale (locatore)', tenant: 'Sublocatario', period: (m, y) => `Periodo: ${m} ${y}`,
    quitText: (s, n, a, m, y) => `Il/La sottoscritto/a ${s}, locatario principale e locatore, dichiara di aver ricevuto da ${n} la somma di ${a} a titolo di affitto per ${m} ${y}, e ne rilascia quietanza.`, print: 'Stampa / salva in PDF', close: 'Chiudi',
  },
  de: {
    ins: {"iosS": ["Tippen Sie in der Safari-Leiste ganz unten am Bildschirm (nicht auf dieser Seite) auf Teilen {S}. Auf neueren iPhones (iOS 26) zuerst unten rechts auf die drei Punkte ⋯, dann auf „Teilen“. Keine Leiste? Scrollen Sie die Seite etwas nach oben.", "Scrollen Sie in der Liste nach unten und tippen Sie auf „Zum Home-Bildschirm“ ➕.", "Tippen Sie oben rechts auf „Hinzufügen“: das NOBIS-Symbol erscheint auf Ihrem Bildschirm."], "iosC": ["Tippen Sie oben rechts in der Adressleiste auf das Teilen-Symbol {S}.", "Tippen Sie auf „Zum Home-Bildschirm“, dann auf „Hinzufügen“."], "and": ["Tippen Sie oben rechts in Chrome auf das Menü ⋮.", "Tippen Sie auf „App installieren“ oder „Zum Startbildschirm hinzufügen“, dann auf „Installieren“."], "app": "Sie sind im Browser einer anderen App (Facebook, Instagram…). Öffnen Sie diesen Link zuerst in Safari oder Chrome: Menü ⋯ → „Im Browser öffnen“.", "tip": "„Zum Home-Bildschirm“ fehlt? Ganz unten in der Liste auf „Aktionen bearbeiten“ tippen und hinzufügen. Im privaten Modus einen normalen Tab öffnen.", "copy": "Link kopieren"},
    g: {"sub": "dann die App über das NOBIS-Symbol öffnen", "i1": "Ganz unten in der Safari-Leiste auf die drei Punkte ⋯ tippen (oder direkt auf das Teilen-Symbol).", "i2": "Auf „Teilen“ tippen.", "i3": "Nach unten scrollen und auf „Zum Home-Bildschirm“ tippen.", "i4": "Oben rechts auf „Hinzufügen“ tippen.", "done": "Fertig! Um die App zu öffnen, tippen Sie auf das NOBIS-Symbol auf Ihrem Bildschirm.", "a1": "Oben rechts in Chrome auf die drei Punkte ⋮ tippen.", "a2": "Auf „App installieren“ (oder „Zum Startbildschirm hinzufügen“) tippen.", "a3": "Auf „Installieren“ tippen.", "safari": "Auf dem iPhone diese Seite mit Safari öffnen."},
    ui: {"share": "Teilen", "a2hs": "Zum Home-Bildschirm", "add": "Hinzufügen", "cancel": "Abbrechen", "fav": "Zu Favoriten hinzufügen", "find": "Auf der Seite suchen", "newTab": "Neuer Tab", "hist": "Verlauf", "ainstall": "App installieren", "ainstallBtn": "Installieren"},
    hr: {"gate": "Bevor Sie die App nutzen, lesen und akzeptieren Sie bitte die Hausordnung. Das ist Pflicht, einmalig (und erneut, wenn sie sich ändert).", "changed": "Die Hausordnung wurde geändert: Bitte lesen und akzeptieren Sie sie erneut.", "R": ["Ruhe: kein Lärm zwischen 22 und 7 Uhr sowie an Sonn- und Feiertagen; Musik und Telefonate in angemessener Lautstärke.", "Sauberkeit: Küche, Bad und Gemeinschaftsräume nach jeder Benutzung sauber hinterlassen; Geschirr am selben Tag spülen und wegräumen.", "Abflüsse: keine Haare, Essensreste, Öl oder Feuchttücher in Spülen, Duschen und WC.", "Abfall: nach Vorschrift trennen und die Tonnen am richtigen Tag rausstellen (siehe „Müllabfuhr“).", "Rauchen: Rauchen und Dampfen ist in den Räumen verboten.", "Besuch: keine weitere Person beherbergen und keine Untervermietung ohne schriftliche Zustimmung der Verwaltung.", "Sicherheit: Haustür schließen, nie Schlüssel oder Codes weitergeben, nichts in den Fluren abstellen, keine Heizlüfter oder Gasflaschen.", "Energie: Fenster schließen, wenn geheizt wird; unnötiges Licht und Geräte ausschalten.", "Probleme: Schäden oder Defekte sofort über die App melden.", "Respekt: keine Beleidigungen, Drohungen oder Diskriminierung. Die Nachrichten des Hauses liest die Verwaltung mit und kann eingreifen."], "rulesT": "Hausordnung", "rulesExtra": "Besondere Regeln Ihres Hauses", "rulesAccept": "✓ Ich habe die Hausordnung gelesen und akzeptiere sie", "rulesOk": "Hausordnung akzeptiert am", "board": "Pinnwand des Hauses", "boardHint": "Mini-Chat zwischen den Bewohnern Ihrer Wohnung. Die Verwaltung liest mit, um Streit zu vermeiden: Bitte bleiben Sie höflich.", "boardPh": "Ihre Nachricht…", "boardEmpty": "Noch keine Nachrichten. Schreiben Sie die erste!", "boardFirst": "Um zu schreiben, akzeptieren Sie bitte zuerst die Hausordnung.", "mgr": "Verwaltung", "refresh": "↻ Aktualisieren", "rgpd2": "Ist die Pinnwand des Hauses aktiv, sehen die anderen Bewohner Ihrer Wohnung und die Verwaltung, was Sie dort schreiben (Streitvermeidung, berechtigtes Interesse); die Nachrichten sind verschlüsselt und werden nach 90 Tagen automatisch gelöscht. Ihre Annahme der Hausordnung wird mit Datum gespeichert."},
    rc: { btn: '📄 Übersicht aller bezahlten Mieten', title: 'Übersicht der bezahlten Mieten', cols: ['Monat', 'Miete', 'Bezahlt', 'Zahlungsdatum'], total: 'Summe', partial: 'Teilzahlung', paidN: (n) => `${n} Monat${n > 1 ? 'e' : ''} bezahlt`,
      text: (s, n, a, f, to) => `Der/die Unterzeichnende, ${s}, Hauptmieter und Vermieter, bestätigt, von ${n} die oben aufgeführten Beträge, insgesamt ${a}, als Miete von ${f} bis ${to} erhalten zu haben, und erteilt hierüber Quittung.` },
    more: (n) => `Die nächsten ${n} anzeigen`,
    tl: {"title": "Verschenken · verleihen · vermieten", "hint": "Verschenken, verleihen oder vermieten Sie Ihre Sachen (Werkzeug, Haushaltsgeräte, Möbel…). Interessenten schreiben Ihnen per E-Mail; bezahlt wird unter Ihnen, bar bei der Übergabe.", "see": "🌐 Alle Anzeigen ansehen", "mine": "Meine Anzeigen", "add": "➕ Gegenstand anbieten", "photos": "Fotos (1 bis 3)", "t": "Titel (z. B. Bohrmaschine Bosch)", "kind": "Art", "kinds": {"don": "🎁 Geschenkt", "pret": "🤝 Kostenlos leihen", "loc": "💶 Vermietung"}, "price": "Preis (€)", "unit": "Pro", "units": {"h": "Stunde", "j": "Tag", "we": "Wochenende", "s": "Woche", "u": "Festpreis"}, "desc": "Beschreibung (Zustand, Marke, Zubehör…)", "rules": "Ihre Bedingungen (Kaution, Rückgabe…)", "lieu": "Übergabeort (z. B. Luxembourg-Gare)", "mail": "Ihre E-Mail (nur für Personen, die „Ich bin interessiert“ tippen)", "ok": "Ich akzeptiere die Nutzungsregeln: Meine Anzeige und Fotos werden auf luxinterventions.com veröffentlicht (ohne Namen und Adresse); mein Vorname und meine E-Mail werden an Interessenten weitergegeben.", "send": "Zur Freigabe senden", "sent": "Danke! Ihre Anzeige ist online, sobald die Verwaltung sie freigegeben hat.", "st": {"pending": "⏳ Wartet auf Freigabe", "ok": "✅ Online", "exp": "⌛ Abgelaufen"}, "del": "Zurückziehen", "delQ": "Diese Anzeige zurückziehen?", "rulesLink": "Nutzungsregeln", "need": "Bitte mindestens ein Foto hinzufügen.", "inter": (n) => `📩 ${n} Interessent${n > 1 ? 'en' : ''} — sehen Sie in Ihre E-Mails`},
    bn: { meObj: 'dir', insteadMe: (w, c) => `🙋 Du hast es statt ${w} gemacht: ${c}`, forgotMsg: (n, c) => `⚠️ Vergessen: ${n} (${c})`, insteadMsg: (n, w, c) => `🙋 ${n} hat es statt ${w} gemacht: ${c}`, instead: '🙋 Ich habe es stattdessen gemacht', catch: 'Nachholen', board: '🏆 Rangliste des Jahres', owe: (n) => `🔁 ${n} nachzuholen`, you: 'Du bist dran', tonight: 'Heute Abend', morning: 'Heute Morgen', done: '✅ Erledigt', cant: '🔁 Ich kann nicht', take: '🙋 Ich mache es', me: 'du', turn: 'dran:', doneBy: 'erledigt von',
      doneMsg: (n, c) => `✅ ${n} hat rausgestellt: ${c}`, cantMsg: (n, c) => `🔁 ${n} kann nicht rausstellen: ${c} — wer übernimmt?`, takeMsg: (n, c) => `🙋 ${n} übernimmt: ${c}`, ask: (n, c) => `${n} kann nicht (${c}). Kannst du es machen?` },
    ed: {"t": "Zustand der Wohnung", "hint": "Die Fotos Ihrer Wohnung bei Ihrem Einzug, Raum für Raum (zum Vergrößern antippen).", "none": "noch kein Foto", "rooms": {"sdb": "🛁 Badezimmer", "cuisine": "🍳 Küche", "chambre": "🛏️ Zimmer", "cave": "📦 Keller", "buanderie": "🧺 Waschküche", "parking": "🚗 Parkplatz"}, "out": "🚪 Bei meinem Auszug: meine Auszugsfotos", "outHint": "Machen Sie am Tag Ihres Auszugs ein Foto von jedem Raum und senden Sie sie: Wir vergleichen sie mit denen bei Ihrem Einzug.", "cam": "📷 Foto", "gal": "🖼️ Galerie", "send": "Meine Auszugsfotos senden", "sent": "✓ gesendet am", "ok": "Danke! Ihre Auszugsfotos wurden gesendet.", "pick": "Machen Sie mindestens ein Foto.", "map": "🗺️ In Google Maps öffnen", "mapHint": "Route, Taxi: Zeigen Sie diese Adresse dem Fahrer."},
    ad: {"back": "📣 Werbung", "t": "Tipps aus der Nachbarschaft", "hint": "Unsere Partner in Ihrer Nähe. Tippen Sie auf eine Anzeige: Die Karte erscheint oben.", "see": "🗺️ Auf der Karte zeigen", "route": "🧭 Route", "home": "🏠 Meine Wohnung", "call": "📞 Anrufen", "web": "🌐 Webseite", "cats": {"musique": "🎵 Musik", "resto": "🍕 Pizzeria / Restaurant", "bar": "🍺 Bar / Pub", "horeca": "☕ Café / Imbiss", "bricolage": "🔨 Baumarkt / Garten", "meubles": "🛋️ Möbel / Deko", "courses": "🛒 Supermarkt", "proxi": "🏪 Laden in der Nähe", "bureau": "🏢 Büros", "social": "📱 Soziale Medien", "services": "🧰 Dienstleistungen", "autre": "📌 Sonstiges"}, "lbl": "Werbung", "mapT": "Karte"},
    nt: {"t": "🔔 Benachrichtigungen", "hint": "Erhalten Sie einen Hinweis und die Zahl auf dem Symbol, wenn es eine Nachricht oder Neues gibt.", "on": "🔔 Benachrichtigungen aktivieren", "ok": "✓ Benachrichtigungen auf diesem Telefon aktiv", "install": "iPhone: Installieren Sie die App zuerst auf dem Home-Bildschirm, öffnen Sie sie über das Symbol und aktivieren Sie dann hier die Benachrichtigungen.", "denied": "Benachrichtigungen sind blockiert: Aktivieren Sie sie in den Telefoneinstellungen (Mitteilungen → diese App).", "err": "Benachrichtigungen können auf diesem Telefon nicht aktiviert werden."},
    men: {"today": "Heute kommt die Reinigungskraft", "at": "Ankunft geplant um", "q": "Sind Sie mit der Reinigung zufrieden?", "crit": "Kriterium", "opts": ["😞 Schlecht", "😐 Ausreichend", "🙂 Gut", "⭐ Ausgezeichnet"], "thanks": "Danke für Ihre Bewertung!", "dl": "⬇️ Meinen Mietvertrag herunterladen", "tomorrow": "Morgen kommt die Reinigungskraft", "noToday": "Heute kommt die Reinigungskraft nicht", "noTomorrow": "Morgen kommt die Reinigungskraft nicht", "noWhy": "Technisches Problem oder Abwesenheit: Der Termin wird neu geplant."},
    mt: {"offL": "Kommt nicht", "t": "Wartung", "today": "Heute", "tomorrow": "Morgen", "off": "kommt nicht (technisches Problem oder Abwesenheit)", "none": "Keine Besuche in den nächsten 7 Tagen geplant.", "rate": "Die Reinigung von heute", "m": {"menage": "🧹 Reinigungskraft", "menuisier": "🪚 Schreiner", "electricien": "💡 Elektriker", "plombier": "🚰 Installateur", "chauffagiste": "🔥 Heizungstechniker", "macon": "🧱 Maurer", "peintre": "🎨 Maler", "serrurier": "🔑 Schlosser", "jardinier": "🌿 Gärtner", "autre": "🔧 Handwerker"}},
    mc: {"add": "✍️ Kommentar hinzufügen", "tags": {"ok": "⏰ Pünktlich", "late": "⏰ Verspätet", "nice": "😊 Freundlich", "rude": "😠 Unfreundlich", "clean": "✨ Gut gereinigt", "dirty": "🧹 Vergessen / schlecht gereinigt"}, "ph": "z. B. Pünktlich, sehr freundlich, der Flur wurde nicht gewischt…", "send": "Senden", "ok": "✓ Kommentar gesendet, danke!"},
    dk: { t: '🔑 Mein digitaler Schlüssel', on: 'Aktiv', until: 'gültig bis', noEnd: 'ohne Enddatum', left: (n) => (n <= 0 ? 'letzter Tag' : n === 1 ? 'noch 1 Tag' : `noch ${n} Tage`) },
    cr: {"t": "Regeln für Ihr Haus", "eve": "Am Vorabend", "day": "Am Abholtag, früh morgens", "after": "ab {h} Uhr", "before": "vor {h} Uhr", "lieux": {"rue": "auf dem Bürgersteig", "soussol": "im Keller (Müllraum)", "garage": "in der Garage", "autre": "siehe Hinweis"}, "today": "Heute", "tomorrow": "Morgen"},
    loc: 'de-LU', door: 'Mein Türcode', since: 'seit', app: 'Mieter-App NOBIS s.a.r.l.', welcome: 'Ihre Mieten, Quittungen, Dokumente und Abfuhrtermine — und Probleme melden, auf Ihrem Telefon.', code: 'Ihr persönlicher Zugangscode', codePh: 'z. B. K7PM2-QXA4H', enter: 'Anmelden', noCode: 'Kein Code? Fragen Sie Ihre Verwaltung.', badCode: 'Unbekannter Code. Bitte prüfen oder einen neuen Code anfordern.', install: "Symbol auf meinem Handy installieren", iosHow: 'iPhone: Teilen tippen, dann „Zum Home-Bildschirm“.', andHow: 'Android: Menü ⋮, dann „App installieren“.', logout: 'Auf diesem Telefon abmelden', title: 'Mein Mieterbereich', hello: 'Guten Tag', avis: 'Mitteilungen zum Haus', pay: 'Meine Mieten', restNow: 'Heute offen', upcoming: 'noch fällig', allPaid: 'Bis heute alles bezahlt ✓',
    pv: { btn: '💳 Jetzt bezahlen', tabs: { vir: '🏦 Überweisung', pp: '🅿️ PayPal', card: '💳 Karte', crypto: '₿ Krypto' }, ppGo: 'PayPal öffnen', cardGo: 'Mit Karte zahlen', toType: (a, r) => `Betrag: ${a} · Verwendungszweck: ${r}`, net: 'Netzwerk', cryAmt: (a) => `Senden Sie den Gegenwert von ${a} zum Tageskurs.`, cryNet: 'Prüfen Sie das Netzwerk: Eine Zahlung über ein falsches Netzwerk geht verloren.', done2: '✅ Ich habe bezahlt', thanks: (d) => `Danke! Zahlung gemeldet am ${d}. Der Monat wird abgehakt, sobald sie eingeht.`, title: 'Per Überweisung zahlen', who: 'Empfänger', amt: 'Betrag', copy: 'Kopieren', copied: '✓ Kopiert', how: 'Öffnen Sie Ihre Banking-App → Überweisung und fügen Sie diese Angaben ein (auf „Kopieren“ tippen).', qr: 'Oder scannen Sie diesen QR-Code mit Ihrer Banking-App (von einem anderen Bildschirm).', done: '✅ Ich habe überwiesen', doneQ: 'Bestätigen Sie, dass Sie bezahlt haben?', note: (n) => `Über diese App läuft keine Zahlung: Das Geld geht direkt an ${n}.` }, iban: 'Zahlung', ref: 'Verwendungszweck', quit: 'Meine Quittungen', quitBtn: 'Quittung', partial: 'Teilzahlung', contrat: 'Mein Vertrag', entry: 'Einzug', end: 'Vertragsende', rent: 'Miete', revision: 'Nächste Anpassung', caution: 'Kaution',
    docs: 'Meine Unterlagen', dossierHint: 'Dokumente und Nachweise, die wir für Sie erfasst haben (👁 zum Ansehen). Ein Fehler oder fehlt etwas? Sagen Sie es uns.', errBtn: '⚠️ Einen Fehler melden', recv: 'erhalten am', proof: 'Nachweis', modes: { especes: 'bar', virement: 'per Überweisung', cheque: 'per Scheck', garantie: 'Bankgarantie', autre: '' }, dt: { bail: 'Mietvertrag', identite: 'Ausweis', cns: 'Krankenversicherungskarte (CNS)', caution: 'Kautionsnachweis', loyer: 'Zahlungsnachweis Miete', assurance: 'Hausratversicherung', revenus: 'Einkommen', titre: 'Aufenthaltstitel', autre: 'Dokument' }, coll: 'Müllabfuhr', putOut: 'rausstellen', truck: 'Abholung am', calAdd: '📅 Abfuhrtermine in meinen Kalender', signal: 'Ein Problem melden', what: 'Welches Problem?', whatPh: 'z. B. Wasser tropft seit heute Morgen unter der Küchenspüle', type: 'Art', types: { rep: '🔧 Reparatur / Defekt', menage: '🧹 Sauberkeit / Reinigung', dossier: '📄 Fehler in meinen Unterlagen / Zahlungen', autre: '📌 Sonstiges' },
    photos: 'Fotos (max. 3)', tel: 'Telefon für Rückfragen (optional)', dispo: 'Wann sind Sie erreichbar? (optional)', send: 'Senden', sent: 'Danke, Ihre Meldung wurde gesendet. Hier sehen Sie, wenn sie bearbeitet wird.', mine: 'Meine Meldungen',
    st: { afaire: 'Eingegangen', planifie: 'Geplant', fait: 'Erledigt' }, lights: ['Demnächst', 'Morgen', 'Heute — dringend'], legend: 'Legende',
    months: ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'], monthsFull: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
    off: 'Dieser Bereich ist nicht mehr aktiv. Bitte wenden Sie sich an Ihre Verwaltung.', bad: 'Unvollständiger Link. Öffnen Sie den Link genau so, wie Sie ihn erhalten haben.', personal: 'Dieser Link ist persönlich: bitte nicht weitergeben.', updated: 'Aktualisiert am',
    rgpdT: 'Schutz Ihrer Daten (DSGVO)',
    rgpd: (s) => `Dieser Bereich wird von ${s.nom}${s.adresse ? ', ' + s.adresse + ' ' + s.ville : ''} verwaltet, Ihrem Vermieter (Hauptmieter). Er zeigt nur Ihre eigenen Mietdaten (Mieten, Vertrag, freigegebene Dokumente), damit Sie diese einsehen können; Rechtsgrundlage: die Erfüllung Ihres Mietvertrags. Ihre Daten sind verschlüsselt: Der Schlüssel befindet sich nur in Ihrem persönlichen Link, weder der Hoster (Cloudflare) noch sonst jemand kann sie lesen. Ihre Nachrichten kann nur Ihre Verwaltung lesen; sie dienen nur der Bearbeitung Ihres Anliegens. Der Bereich wird am Ende des Mietverhältnisses deaktiviert; Mietdaten werden für die Dauer des Vertrags plus 10 Jahre aufbewahrt (Buchhaltungspflichten). Sie können Auskunft, Berichtigung oder Löschung Ihrer Daten verlangen${s.email ? ' bei ' + s.email : ' bei Ihrer Verwaltung'} und Beschwerde bei der CNPD (cnpd.public.lu) einlegen. Keine Werbe-Cookies, kein Tracking.`,
    quitTitle: 'Mietquittung (Quittance de loyer)', quitPart: 'Quittung Teilzahlung', landlord: 'Hauptmieter (Vermieter)', tenant: 'Untermieter', period: (m, y) => `Zeitraum: ${m} ${y}`,
    quitText: (s, n, a, m, y) => `Ich, ${s}, Hauptmieter und Vermieter, bestätige, von ${n} den Betrag von ${a} als Miete für ${m} ${y} erhalten zu haben.`, print: 'Drucken / als PDF speichern', close: 'Schließen',
  },
  pt: {
    ins: {"iosS": ["Na barra do Safari no fundo do ecrã (não nesta página), toque em Partilhar {S}. Nos iPhone recentes (iOS 26), toque primeiro nos três pontos ⋯ em baixo à direita e depois em « Partilhar ». Não vê a barra? Deslize a página um pouco para cima.", "Na lista que abre, desça e toque em « Adicionar ao ecrã principal » ➕.", "Toque em « Adicionar » em cima à direita: o ícone NOBIS aparece no seu ecrã."], "iosC": ["Toque no ícone Partilhar {S} em cima à direita, na barra de endereço.", "Toque em « Adicionar ao ecrã principal » e depois em « Adicionar »."], "and": ["Toque no menu ⋮ em cima à direita do Chrome.", "Toque em « Instalar aplicação » ou « Adicionar ao ecrã principal » e depois em « Instalar »."], "app": "Está no navegador de outra app (Facebook, Instagram…). Abra primeiro este link no Safari ou no Chrome: menu ⋯ → « Abrir no navegador ».", "tip": "Não aparece « Adicionar ao ecrã principal »? No fim da lista, toque em « Editar ações » e adicione-o. Em navegação privada, abra um separador normal.", "copy": "Copiar o link"},
    g: {"sub": "depois abra a app tocando no ícone NOBIS", "i1": "No fundo do ecrã, na barra do Safari, toque nos três pontos ⋯ (ou diretamente no ícone Partilhar).", "i2": "Toque em « Partilhar ».", "i3": "Deslize e toque em « Adicionar ao ecrã principal ».", "i4": "Toque em « Adicionar » em cima à direita.", "done": "Pronto! Para entrar na app, toque no ícone NOBIS no seu ecrã.", "a1": "Em cima à direita do Chrome, toque nos três pontos ⋮.", "a2": "Toque em « Instalar aplicação » (ou « Adicionar ao ecrã principal »).", "a3": "Toque em « Instalar ».", "safari": "No iPhone, abra esta página no Safari."},
    ui: {"share": "Partilhar", "a2hs": "Adicionar ao ecrã principal", "add": "Adicionar", "cancel": "Cancelar", "fav": "Adicionar aos favoritos", "find": "Procurar na página", "newTab": "Novo separador", "hist": "Histórico", "ainstall": "Instalar aplicação", "ainstallBtn": "Instalar"},
    hr: {"gate": "Antes de usar a app, leia o regulamento da casa e aceite-o. É obrigatório, uma só vez (e de novo se o regulamento mudar).", "changed": "O regulamento mudou: leia-o e aceite-o de novo.", "R": ["Silêncio: sem barulho entre as 22h e as 7h, nem ao domingo e feriados; música e chamadas em volume moderado.", "Limpeza: cozinha, casa de banho e espaços comuns limpos após cada utilização; loiça lavada e arrumada no mesmo dia.", "Canos: nada de cabelos, restos de comida, óleo ou toalhitas nos lava-loiças, chuveiros e sanitas.", "Lixo: separar conforme as regras e pôr os contentores fora no dia certo (ver « Recolha do lixo »).", "Tabaco: é proibido fumar ou vaporizar no interior.", "Visitas: não alojar outra pessoa nem subarrendar sem acordo escrito do gestor.", "Segurança: fechar a porta de entrada, nunca dar chaves ou códigos, não deixar nada nos corredores, sem aquecedores portáteis nem botijas de gás.", "Energia: fechar as janelas com o aquecimento ligado, apagar luzes e aparelhos desnecessários.", "Problemas: comunicar logo qualquer estrago ou avaria pela app.", "Respeito: sem insultos, ameaças ou discriminação. As mensagens da casa são lidas pelo gestor, que pode intervir."], "rulesT": "Regulamento da casa", "rulesExtra": "Regras próprias do seu prédio", "rulesAccept": "✓ Li e aceito o regulamento", "rulesOk": "Regulamento aceite em", "board": "Mural da casa", "boardHint": "Mini-chat entre os moradores do seu alojamento. O gestor também lê as mensagens para evitar conflitos: seja cordial.", "boardPh": "A sua mensagem…", "boardEmpty": "Ainda não há mensagens. Escreva a primeira!", "boardFirst": "Para escrever, aceite primeiro o regulamento da casa.", "mgr": "Gestor", "refresh": "↻ Atualizar", "rgpd2": "Se o mural da casa estiver ativo, o que lá escreve é visível para os outros moradores do seu alojamento e para o gestor (prevenção de conflitos, interesse legítimo); as mensagens são cifradas e apagadas automaticamente após 90 dias. A sua aceitação do regulamento é registada com a data."},
    rc: { btn: '📄 Resumo de todas as rendas pagas', title: 'Resumo das rendas pagas', cols: ['Mês', 'Renda', 'Pago', 'Data do pagamento'], total: 'Total', partial: 'pagamento parcial', paidN: (n) => `${n} ${n > 1 ? 'meses pagos' : 'mês pago'}`,
      text: (s, n, a, f, to) => `O/A abaixo assinado/a, ${s}, arrendatário principal e senhorio, declara ter recebido de ${n} as quantias detalhadas acima, num total de ${a}, a título de renda de ${f} a ${to}, e dá a respetiva quitação.` },
    more: (n) => `Ver as próximas ${n}`,
    tl: {"title": "Doar · emprestar · alugar objetos", "hint": "Doe, empreste ou alugue os seus objetos (ferramentas, eletrodomésticos, móveis…). Os interessados escrevem-lhe por email; o dinheiro troca-se entre vocês, em numerário na entrega.", "see": "🌐 Ver todos os anúncios", "mine": "Os meus anúncios", "add": "➕ Publicar um objeto", "photos": "Fotos (1 a 3)", "t": "Título (ex. Berbequim Bosch)", "kind": "Tipo", "kinds": {"don": "🎁 Doação (grátis)", "pret": "🤝 Empréstimo grátis", "loc": "💶 Aluguer"}, "price": "Preço (€)", "unit": "Por", "units": {"h": "hora", "j": "dia", "we": "fim de semana", "s": "semana", "u": "preço único"}, "desc": "Descrição (estado, marca, acessórios…)", "rules": "As suas condições (caução, devolução…)", "lieu": "Local de entrega (ex. Luxembourg-Gare)", "mail": "O seu email (dado só a quem tocar « Estou interessado »)", "ok": "Aceito as regras de utilização: o meu anúncio e as minhas fotos são publicados em luxinterventions.com (sem nome nem morada); o meu nome próprio e o meu email são dados às pessoas interessadas.", "send": "Enviar para aprovação", "sent": "Obrigado! O seu anúncio fica online assim que o gestor o aprovar.", "st": {"pending": "⏳ À espera de aprovação", "ok": "✅ Online", "exp": "⌛ Expirado"}, "del": "Retirar", "delQ": "Retirar este anúncio?", "rulesLink": "Regras de utilização", "need": "Adicione pelo menos uma foto.", "inter": (n) => `📩 ${n} pessoa${n > 1 ? 's interessadas' : ' interessada'} — veja o seu email`},
    bn: { meObj: 'ti', insteadMe: (w, c) => `🙋 Fizeste tu no lugar de ${w}: ${c}`, forgotMsg: (n, c) => `⚠️ Vez esquecida: ${n} (${c})`, insteadMsg: (n, w, c) => `🙋 ${n} fez no lugar de ${w}: ${c}`, instead: '🙋 Fiz eu no lugar', catch: 'recuperação', board: '🏆 Classificação do ano', owe: (n) => `🔁 ${n} por recuperar`, you: 'É a tua vez', tonight: 'Esta noite', morning: 'Esta manhã', done: '✅ Feito', cant: '🔁 Não posso', take: '🙋 Eu faço', me: 'tu', turn: 'vez de', doneBy: 'feito por',
      doneMsg: (n, c) => `✅ ${n} pôs fora: ${c}`, cantMsg: (n, c) => `🔁 ${n} não pode pôr fora: ${c} — quem faz?`, takeMsg: (n, c) => `🙋 ${n} trata disso: ${c}`, ask: (n, c) => `${n} não pode (${c}). Podes fazer tu?` },
    ed: {"t": "Estado do alojamento", "hint": "As fotos do seu alojamento à sua chegada, divisão a divisão (toque para ampliar).", "none": "ainda sem foto", "rooms": {"sdb": "🛁 Casa de banho", "cuisine": "🍳 Cozinha", "chambre": "🛏️ Quarto", "cave": "📦 Cave", "buanderie": "🧺 Lavandaria", "parking": "🚗 Estacionamento"}, "out": "🚪 Na minha saída: as minhas fotos de saída", "outHint": "No dia da sua saída, tire uma foto de cada divisão e envie-as: comparamo-las com as da sua chegada.", "cam": "📷 Foto", "gal": "🖼️ Galeria", "send": "Enviar as minhas fotos de saída", "sent": "✓ enviada a", "ok": "Obrigado! As suas fotos de saída foram enviadas.", "pick": "Tire pelo menos uma foto.", "map": "🗺️ Abrir no Google Maps", "mapHint": "Itinerário, táxi: mostre este endereço ao motorista."},
    ad: {"back": "📣 Publicidade", "t": "Boas ofertas do bairro", "hint": "Os nossos parceiros perto de si. Toque num anúncio: o mapa aparece em cima.", "see": "🗺️ Ver no mapa", "route": "🧭 Itinerário", "home": "🏠 O meu alojamento", "call": "📞 Ligar", "web": "🌐 Site", "cats": {"musique": "🎵 Música", "resto": "🍕 Pizzaria / restaurante", "bar": "🍺 Bar / pub", "horeca": "☕ Café / snack", "bricolage": "🔨 Bricolage / jardinagem", "meubles": "🛋️ Móveis / decoração", "courses": "🛒 Supermercado", "proxi": "🏪 Comércio de proximidade", "bureau": "🏢 Escritórios", "social": "📱 Redes sociais", "services": "🧰 Serviços", "autre": "📌 Outro"}, "lbl": "Publicidade", "mapT": "Mapa"},
    nt: {"t": "🔔 Notificações", "hint": "Receba um aviso e o número no ícone quando houver uma mensagem ou novidade.", "on": "🔔 Ativar as notificações", "ok": "✓ Notificações ativas neste telemóvel", "install": "iPhone: instale primeiro a app no ecrã principal, abra-a pelo ícone e depois ative aqui as notificações.", "denied": "As notificações estão bloqueadas: reative-as nas definições do telemóvel (Notificações → esta app).", "err": "Não é possível ativar as notificações neste telemóvel."},
    men: {"today": "Hoje passa a senhora da limpeza", "at": "chegada prevista às", "q": "Está satisfeito com a limpeza?", "crit": "Critério", "opts": ["😞 Fraco", "😐 Suficiente", "🙂 Bom", "⭐ Excelente"], "thanks": "Obrigado pela sua avaliação!", "dl": "⬇️ Descarregar o meu contrato", "tomorrow": "Amanhã passa a senhora da limpeza", "noToday": "Hoje a senhora da limpeza não passa", "noTomorrow": "Amanhã a senhora da limpeza não passa", "noWhy": "Problema técnico ou ausência: a passagem será reprogramada."},
    mt: {"offL": "Não passa", "t": "Manutenção", "today": "Hoje", "tomorrow": "Amanhã", "off": "não passa (problema técnico ou ausência)", "none": "Nenhuma visita prevista nos próximos 7 dias.", "rate": "A limpeza de hoje", "m": {"menage": "🧹 Empregada de limpeza", "menuisier": "🪚 Carpinteiro", "electricien": "💡 Eletricista", "plombier": "🚰 Canalizador", "chauffagiste": "🔥 Técnico de aquecimento", "macon": "🧱 Pedreiro", "peintre": "🎨 Pintor", "serrurier": "🔑 Serralheiro", "jardinier": "🌿 Jardineiro", "autre": "🔧 Operário"}},
    mc: {"add": "✍️ Adicionar um comentário", "tags": {"ok": "⏰ A horas", "late": "⏰ Atrasada", "nice": "😊 Simpática", "rude": "😠 Antipática", "clean": "✨ Bem limpo", "dirty": "🧹 Esquecimentos / mal limpo"}, "ph": "ex. Chegou a horas, muito simpática, o patamar não foi lavado…", "send": "Enviar", "ok": "✓ Comentário enviado, obrigado!"},
    dk: { t: '🔑 A minha chave digital', on: 'Ativa', until: 'válida até', noEnd: 'sem data de fim', left: (n) => (n <= 0 ? 'último dia' : n === 1 ? 'mais 1 dia' : `mais ${n} dias`) },
    cr: {"t": "Regras do seu prédio", "eve": "Na véspera à noite", "day": "No próprio dia, de manhã cedo", "after": "depois das {h}h", "before": "antes das {h}h", "lieux": {"rue": "no passeio", "soussol": "na cave (local do lixo)", "garage": "na garagem", "autre": "ver a nota"}, "today": "Hoje", "tomorrow": "Amanhã"},
    loc: 'pt-PT', door: 'Código da minha porta', since: 'desde', app: 'App dos inquilinos NOBIS s.a.r.l.', welcome: 'As suas rendas, recibos, documentos e recolhas — e comunicar um problema, no seu telemóvel.', code: 'O seu código de acesso pessoal', codePh: 'ex. K7PM2-QXA4H', enter: 'Entrar', noCode: 'Não tem código? Peça-o ao seu gestor.', badCode: 'Código desconhecido. Verifique-o ou peça um novo código.', install: "Instalar o ícone no meu telemóvel", iosHow: 'iPhone: toque em Partilhar e depois « Adicionar ao ecrã principal ».', andHow: 'Android: menu ⋮ e depois « Instalar aplicação ».', logout: 'Terminar sessão neste telemóvel', title: 'O meu espaço de inquilino', hello: 'Olá', avis: 'Avisos do prédio', pay: 'As minhas rendas', restNow: 'Em falta hoje', upcoming: 'por vencer', allPaid: 'Tudo pago até hoje ✓',
    pv: { btn: '💳 Pagar agora', tabs: { vir: '🏦 Transferência', pp: '🅿️ PayPal', card: '💳 Cartão', crypto: '₿ Cripto' }, ppGo: 'Abrir o PayPal', cardGo: 'Pagar com cartão', toType: (a, r) => `Montante: ${a} · Referência: ${r}`, net: 'Rede', cryAmt: (a) => `Envie o equivalente a ${a} ao câmbio do dia.`, cryNet: 'Verifique bem a rede: um envio na rede errada perde-se.', done2: '✅ Já paguei', thanks: (d) => `Obrigado! Pagamento comunicado a ${d}. O mês será assinalado assim que chegar.`, title: 'Pagar por transferência', who: 'Beneficiário', amt: 'Montante', copy: 'Copiar', copied: '✓ Copiado', how: 'Abra a app do seu banco → Transferência e cole estes dados (toque em « Copiar »).', qr: 'Ou leia este QR code com a app do seu banco (a partir de outro ecrã).', done: '✅ Fiz a transferência', doneQ: 'Confirma que já pagou?', note: (n) => `Nenhum pagamento passa por esta app: o dinheiro vai diretamente para ${n}.` }, iban: 'Para pagar', ref: 'Referência', quit: 'Os meus recibos', quitBtn: 'Recibo', partial: 'Recibo parcial', contrat: 'O meu contrato', entry: 'Entrada', end: 'Fim do contrato', rent: 'Renda', revision: 'Próxima revisão', caution: 'Caução',
    docs: 'O meu processo', dossierHint: 'Documentos e comprovativos que registámos para si (toque em 👁 para ver). Um erro ou falta algum documento? Diga-nos.', errBtn: '⚠️ Comunicar um erro', recv: 'recebida em', proof: 'Comprovativo', modes: { especes: 'em mão (dinheiro)', virement: 'por transferência', cheque: 'por cheque', garantie: 'garantia bancária', autre: '' }, dt: { bail: 'Contrato de arrendamento', identite: 'Documento de identificação', cns: 'Cartão da CNS (seguro de saúde)', caution: 'Comprovativo da caução', loyer: 'Comprovativo de pagamento da renda', assurance: 'Seguro da habitação', revenus: 'Rendimentos', titre: 'Autorização de residência', autre: 'Documento' }, coll: 'Recolha do lixo', putOut: 'pôr fora', truck: 'recolha no dia', calAdd: '📅 Adicionar as recolhas ao meu calendário', signal: 'Comunicar um problema', what: 'Qual é o problema?', whatPh: 'ex. Fuga de água debaixo do lava-loiça desde esta manhã', type: 'Tipo', types: { rep: '🔧 Reparação / avaria', menage: '🧹 Limpeza', dossier: '📄 Erro no meu processo / pagamentos', autre: '📌 Outro' },
    photos: 'Fotos (máximo 3)', tel: 'Telefone para o contactar (opcional)', dispo: 'Quando está disponível? (opcional)', send: 'Enviar', sent: 'Obrigado, a sua mensagem foi enviada. Verá aqui quando for tratada.', mine: 'As minhas comunicações',
    st: { afaire: 'Recebido', planifie: 'Planeado', fait: 'Concluído' }, lights: ['Brevemente', 'Amanhã', 'Hoje — urgente'], legend: 'Legenda',
    months: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'], monthsFull: ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'],
    off: 'Este espaço já não está ativo. Contacte o seu gestor.', bad: 'Link incompleto. Abra o link exatamente como o recebeu.', personal: 'Este link é pessoal: não o partilhe.', updated: 'Atualizado em',
    rgpdT: 'Proteção dos seus dados (RGPD)',
    rgpd: (s) => `Este espaço é gerido por ${s.nom}${s.adresse ? ', ' + s.adresse + ' ' + s.ville : ''}, o seu senhorio (arrendatário principal). Mostra apenas as suas próprias informações de arrendamento (rendas, contrato, documentos partilhados) para que as possa consultar; base legal: a execução do seu contrato de arrendamento. Os seus dados estão cifrados: a chave está apenas no seu link pessoal, nem o alojamento (Cloudflare) nem mais ninguém os pode ler. As mensagens que envia só podem ser lidas pelo seu gestor e servem apenas para tratar o seu pedido. O espaço é desativado no fim do arrendamento; os dados são conservados durante o contrato mais 10 anos (obrigações contabilísticas). Pode pedir o acesso, a retificação ou o apagamento dos seus dados${s.email ? ' a ' + s.email : ' ao seu gestor'} e apresentar reclamação à CNPD (cnpd.public.lu). Sem cookies publicitários, sem rastreamento.`,
    quitTitle: 'Recibo de renda (Quittance de loyer)', quitPart: 'Recibo de pagamento parcial', landlord: 'Arrendatário principal (senhorio)', tenant: 'Subarrendatário', period: (m, y) => `Período: ${m} ${y}`,
    quitText: (s, n, a, m, y) => `Eu, ${s}, arrendatário principal e senhorio, declaro ter recebido de ${n} a quantia de ${a} referente à renda de ${m} ${y}.`, print: 'Imprimir / guardar em PDF', close: 'Fechar',
  },
  en: {
    ins: {"iosS": ["In Safari’s bar at the very bottom of the screen (not on this page), tap Share {S}. On recent iPhones (iOS 26), first tap the three dots ⋯ at the bottom right, then “Share”. No bar? Scroll the page up a little.", "In the list that opens, scroll down and tap “Add to Home Screen” ➕.", "Tap “Add” at the top right: the NOBIS icon appears on your screen."], "iosC": ["Tap the Share icon {S} at the top right, in the address bar.", "Tap “Add to Home Screen”, then “Add”."], "and": ["Tap the ⋮ menu at the top right of Chrome.", "Tap “Install app” or “Add to Home screen”, then “Install”."], "app": "You are in another app’s browser (Facebook, Instagram…). First open this link in Safari or Chrome: menu ⋯ → “Open in browser”.", "tip": "No “Add to Home Screen”? At the bottom of the list tap “Edit Actions” and add it. In private browsing, open a normal tab.", "copy": "Copy link"},
    g: {"sub": "then open the app by tapping the NOBIS icon", "i1": "At the very bottom of the screen, in Safari’s bar, tap the three dots ⋯ (or the Share icon directly).", "i2": "Tap “Share”.", "i3": "Scroll down and tap “Add to Home Screen”.", "i4": "Tap “Add” at the top right.", "done": "Done! To go to the app, tap the NOBIS icon on your screen.", "a1": "At the top right of Chrome, tap the three dots ⋮.", "a2": "Tap “Install app” (or “Add to Home screen”).", "a3": "Tap “Install”.", "safari": "On iPhone, open this page in Safari."},
    ui: {"share": "Share", "a2hs": "Add to Home Screen", "add": "Add", "cancel": "Cancel", "fav": "Add to Favorites", "find": "Find on Page", "newTab": "New tab", "hist": "History", "ainstall": "Install app", "ainstallBtn": "Install"},
    hr: {"gate": "Before using the app, please read and accept the house rules. This is required, once only (and again if the rules change).", "changed": "The house rules have changed: please read and accept them again.", "R": ["Quiet: no noise between 10 pm and 7 am, nor on Sundays and public holidays; music and calls at a moderate volume.", "Cleanliness: kitchen, bathroom and shared areas clean after each use; dishes washed and put away the same day.", "Drains: no hair, food scraps, oil or wipes in sinks, showers and toilets.", "Waste: sort as instructed and put the bins out on the right day (see “Waste collection”).", "Smoking: smoking and vaping indoors are forbidden.", "Guests: no hosting another person and no subletting without the manager’s written consent.", "Safety: close the front door, never give out keys or codes, leave nothing in the corridors, no portable heaters or gas bottles.", "Energy: close windows while the heating is on, switch off unneeded lights and appliances.", "Problems: report any damage or breakdown straight away in the app.", "Respect: no insults, threats or discrimination. House messages are read by the manager, who may step in."], "rulesT": "House rules", "rulesExtra": "Specific rules for your building", "rulesAccept": "✓ I have read and accept the house rules", "rulesOk": "House rules accepted on", "board": "House chat", "boardHint": "Mini-chat between the people living in your home. The manager reads the messages too, to prevent disputes: please stay polite.", "boardPh": "Your message…", "boardEmpty": "No messages yet. Write the first one!", "boardFirst": "To write, please accept the house rules first.", "mgr": "Manager", "refresh": "↻ Refresh", "rgpd2": "If the house chat is on, what you write there is visible to the other people living in your home and to your manager (preventing disputes, legitimate interest); messages are encrypted and deleted automatically after 90 days. Your acceptance of the house rules is recorded with its date."},
    rc: { btn: '📄 Summary of all my paid rent', title: 'Summary of rent paid', cols: ['Month', 'Rent', 'Paid', 'Payment date'], total: 'Total', partial: 'partial payment', paidN: (n) => `${n} month${n > 1 ? 's' : ''} paid`,
      text: (s, n, a, f, to) => `I, the undersigned, ${s}, head tenant and landlord, confirm that I have received from ${n} the amounts detailed above, a total of ${a}, as rent from ${f} to ${to}, and hereby give receipt for them.` },
    more: (n) => `Show the next ${n}`,
    tl: {"title": "Give · lend · rent items", "hint": "Give away, lend or rent out your things (tools, appliances, furniture…). Interested people email you; money changes hands between you, in cash on handover.", "see": "🌐 See all listings", "mine": "My listings", "add": "➕ Post an item", "photos": "Photos (1 to 3)", "t": "Title (e.g. Bosch drill)", "kind": "Type", "kinds": {"don": "🎁 Free (gift)", "pret": "🤝 Free loan", "loc": "💶 Rental"}, "price": "Price (€)", "unit": "Per", "units": {"h": "hour", "j": "day", "we": "weekend", "s": "week", "u": "one-off price"}, "desc": "Description (condition, brand, accessories…)", "rules": "Your conditions (deposit, return…)", "lieu": "Handover place (e.g. Luxembourg-Gare)", "mail": "Your email (only given to people who tap “I’m interested”)", "ok": "I accept the terms of use: my listing and photos are published on luxinterventions.com (without my name or address); my first name and email are given to interested people.", "send": "Send for approval", "sent": "Thanks! Your listing will be online as soon as the manager approves it.", "st": {"pending": "⏳ Waiting for approval", "ok": "✅ Online", "exp": "⌛ Expired"}, "del": "Remove", "delQ": "Remove this listing?", "rulesLink": "Terms of use", "need": "Please add at least one photo.", "inter": (n) => `📩 ${n} interested — check your email`},
    bn: { meObj: 'you', insteadMe: (w, c) => `🙋 You did it instead of ${w}: ${c}`, forgotMsg: (n, c) => `⚠️ Turn forgotten: ${n} (${c})`, insteadMsg: (n, w, c) => `🙋 ${n} did it instead of ${w}: ${c}`, instead: '🙋 I did it instead', catch: 'make-up', board: '🏆 This year’s ranking', owe: (n) => `🔁 ${n} to make up`, you: 'It’s your turn', tonight: 'Tonight', morning: 'This morning', done: '✅ Done', cant: '🔁 I can’t', take: '🙋 I’ll do it', me: 'you', turn: 'turn:', doneBy: 'done by',
      doneMsg: (n, c) => `✅ ${n} put out: ${c}`, cantMsg: (n, c) => `🔁 ${n} can’t put out: ${c} — who can?`, takeMsg: (n, c) => `🙋 ${n} is on it: ${c}`, ask: (n, c) => `${n} can’t (${c}). Can you do it?` },
    ed: {"t": "Check-in / check-out photos", "hint": "Photos of your home when you moved in, room by room (tap to enlarge).", "none": "no photo yet", "rooms": {"sdb": "🛁 Bathroom", "cuisine": "🍳 Kitchen", "chambre": "🛏️ Bedroom", "cave": "📦 Cellar", "buanderie": "🧺 Laundry room", "parking": "🚗 Parking"}, "out": "🚪 When I leave: my check-out photos", "outHint": "On the day you leave, take a photo of each room and send them: we compare them with those from your arrival.", "cam": "📷 Photo", "gal": "🖼️ Gallery", "send": "Send my check-out photos", "sent": "✓ sent on", "ok": "Thank you! Your check-out photos have been sent.", "pick": "Take at least one photo.", "map": "🗺️ Open in Google Maps", "mapHint": "Directions, taxi: show this address to the driver."},
    ad: {"back": "📣 Ad", "t": "Local deals", "hint": "Our partners near you. Tap an ad: the map appears at the top.", "see": "🗺️ Show on map", "route": "🧭 Directions", "home": "🏠 My home", "call": "📞 Call", "web": "🌐 Website", "cats": {"musique": "🎵 Music", "resto": "🍕 Pizzeria / restaurant", "bar": "🍺 Bar / pub", "horeca": "☕ Café / snack bar", "bricolage": "🔨 DIY / garden", "meubles": "🛋️ Furniture / decor", "courses": "🛒 Supermarket", "proxi": "🏪 Local shop", "bureau": "🏢 Offices", "social": "📱 Social media", "services": "🧰 Services", "autre": "📌 Other"}, "lbl": "Advertising", "mapT": "Map"},
    nt: {"t": "🔔 Notifications", "hint": "Get an alert and the number on the icon when there is a message or something new.", "on": "🔔 Turn on notifications", "ok": "✓ Notifications on for this phone", "install": "iPhone: first add the app to your Home Screen, open it from the icon, then turn on notifications here.", "denied": "Notifications are blocked: turn them back on in your phone settings (Notifications → this app).", "err": "Notifications cannot be turned on on this phone."},
    men: {"today": "The cleaner comes today", "at": "expected arrival at", "q": "Are you happy with the cleaning?", "crit": "Criterion", "opts": ["😞 Poor", "😐 Fair", "🙂 Good", "⭐ Excellent"], "thanks": "Thank you for your rating!", "dl": "⬇️ Download my contract", "tomorrow": "The cleaner comes tomorrow", "noToday": "The cleaner is not coming today", "noTomorrow": "The cleaner is not coming tomorrow", "noWhy": "Technical problem or absence: the visit will be rescheduled."},
    mt: {"offL": "Not coming", "t": "Maintenance", "today": "Today", "tomorrow": "Tomorrow", "off": "not coming (technical problem or absence)", "none": "No visits planned in the next 7 days.", "rate": "Today’s cleaning", "m": {"menage": "🧹 Cleaner", "menuisier": "🪚 Carpenter", "electricien": "💡 Electrician", "plombier": "🚰 Plumber", "chauffagiste": "🔥 Heating engineer", "macon": "🧱 Mason", "peintre": "🎨 Painter", "serrurier": "🔑 Locksmith", "jardinier": "🌿 Gardener", "autre": "🔧 Worker"}},
    mc: {"add": "✍️ Add a comment", "tags": {"ok": "⏰ On time", "late": "⏰ Late", "nice": "😊 Friendly", "rude": "😠 Rude", "clean": "✨ Well cleaned", "dirty": "🧹 Missed spots / poorly cleaned"}, "ph": "e.g. On time, very friendly, the landing was not mopped…", "send": "Send", "ok": "✓ Comment sent, thank you!"},
    dk: { t: '🔑 My digital key', on: 'Active', until: 'valid until', noEnd: 'no end date', left: (n) => (n <= 0 ? 'last day' : n === 1 ? '1 day left' : `${n} days left`) },
    cr: {"t": "Rules for your building", "eve": "The evening before", "day": "On the day, early in the morning", "after": "after {h}", "before": "before {h}", "lieux": {"rue": "on the pavement", "soussol": "in the basement (bin room)", "garage": "in the garage", "autre": "see note"}, "today": "Today", "tomorrow": "Tomorrow"},
    loc: 'en-GB', door: 'My door code', since: 'since', app: 'NOBIS s.a.r.l. tenant app', welcome: 'Your rent, receipts, documents and waste collections — and report a problem, on your phone.', code: 'Your personal access code', codePh: 'e.g. K7PM2-QXA4H', enter: 'Enter', noCode: 'No code? Ask your property manager.', badCode: 'Unknown code. Check it or ask for a new code.', install: "Install the icon on my phone", iosHow: 'iPhone: tap Share, then “Add to Home Screen”.', andHow: 'Android: menu ⋮, then “Install app”.', logout: 'Sign out on this phone', title: 'My tenant space', hello: 'Hello', avis: 'Building notices', pay: 'My rent', restNow: 'Unpaid to date', upcoming: 'upcoming', allPaid: 'All paid to date ✓',
    pv: { btn: '💳 Pay now', tabs: { vir: '🏦 Bank transfer', pp: '🅿️ PayPal', card: '💳 Card', crypto: '₿ Crypto' }, ppGo: 'Open PayPal', cardGo: 'Pay by card', toType: (a, r) => `Amount: ${a} · Reference: ${r}`, net: 'Network', cryAmt: (a) => `Send the equivalent of ${a} at today’s rate.`, cryNet: 'Double-check the network: a transfer on the wrong network is lost.', done2: '✅ I have paid', thanks: (d) => `Thank you! Payment reported on ${d}. The month will be ticked once it arrives.`, title: 'Pay by bank transfer', who: 'Beneficiary', amt: 'Amount', copy: 'Copy', copied: '✓ Copied', how: 'Open your banking app → Transfer, then paste these details (tap “Copy”).', qr: 'Or scan this QR code with your banking app (from another screen).', done: '✅ I have made the transfer', doneQ: 'Do you confirm you have paid?', note: (n) => `No payment goes through this app: the money goes straight to ${n}.` }, iban: 'How to pay', ref: 'Reference', quit: 'My rent receipts', quitBtn: 'Receipt', partial: 'Partial receipt', contrat: 'My lease', entry: 'Move-in', end: 'Lease end', rent: 'Rent', revision: 'Next rent review', caution: 'Deposit',
    docs: 'My file', dossierHint: 'Documents and proofs we have recorded for you (tap 👁 to view). A mistake or a missing document? Let us know.', errBtn: '⚠️ Report a mistake', recv: 'received on', proof: 'Proof', modes: { especes: 'in cash', virement: 'by bank transfer', cheque: 'by cheque', garantie: 'bank guarantee', autre: '' }, dt: { bail: 'Lease', identite: 'ID document', cns: 'Health insurance card (CNS)', caution: 'Deposit proof', loyer: 'Rent payment proof', assurance: 'Home insurance', revenus: 'Income', titre: 'Residence permit', autre: 'Document' }, coll: 'Waste collection', putOut: 'put out', truck: 'truck comes on', calAdd: '📅 Add collections to my calendar', signal: 'Report a problem', what: 'What is the problem?', whatPh: 'e.g. Water leaking under the kitchen sink since this morning', type: 'Type', types: { rep: '🔧 Repair / breakdown', menage: '🧹 Cleanliness', dossier: '📄 Mistake in my file / payments', autre: '📌 Other' },
    photos: 'Photos (up to 3)', tel: 'Phone to reach you (optional)', dispo: 'When are you available? (optional)', send: 'Send', sent: 'Thank you, your message has been sent. You will see here when it is handled.', mine: 'My reports',
    st: { afaire: 'Received', planifie: 'Scheduled', fait: 'Done' }, lights: ['Coming up', 'Tomorrow', 'Today — urgent'], legend: 'Legend',
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], monthsFull: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    off: 'This space is no longer active. Please contact your property manager.', bad: 'Incomplete link. Open the link exactly as you received it.', personal: 'This link is personal: do not share it.', updated: 'Updated on',
    rgpdT: 'Your data protection (GDPR)',
    rgpd: (s) => `This space is managed by ${s.nom}${s.adresse ? ', ' + s.adresse + ' ' + s.ville : ''}, your landlord (main tenant). It only shows your own tenancy information (rent, lease, shared documents) so that you can consult it; legal basis: the performance of your tenancy agreement. Your data is encrypted: the key is only in your personal link, neither the host (Cloudflare) nor anyone else can read it. Messages you send can only be read by your property manager and are used only to handle your request. The space is deactivated at the end of your tenancy; tenancy data is kept for the lease period plus 10 years (accounting obligations). You can ask for access, correction or deletion of your data${s.email ? ' at ' + s.email : ' from your property manager'} and lodge a complaint with the CNPD (cnpd.public.lu). No advertising cookies, no tracking.`,
    quitTitle: 'Rent receipt (Quittance de loyer)', quitPart: 'Partial payment receipt', landlord: 'Main tenant (landlord)', tenant: 'Subtenant', period: (m, y) => `Period: ${m} ${y}`,
    quitText: (s, n, a, m, y) => `I, ${s}, main tenant and landlord, confirm having received from ${n} the sum of ${a} for the rent of ${m} ${y}.`, print: 'Print / save as PDF', close: 'Close',
  },
  es: {
    g: {"sub": "luego abre la app tocando el icono NOBIS", "i1": "Abajo del todo, en la barra de Safari, toca los tres puntos ⋯ (o directamente el icono Compartir).", "i2": "Toca « Compartir ».", "i3": "Desplázate y toca « Añadir a pantalla de inicio ».", "i4": "Toca « Añadir » arriba a la derecha.", "done": "¡Listo! Para entrar en la app, toca el icono NOBIS en tu pantalla.", "a1": "Arriba a la derecha de Chrome, toca los tres puntos ⋮.", "a2": "Toca « Instalar aplicación » (o « Añadir a pantalla de inicio »).", "a3": "Toca « Instalar ».", "safari": "En iPhone, abre esta página con Safari."},
    ui: {"share": "Compartir", "a2hs": "Añadir a pantalla de inicio", "add": "Añadir", "cancel": "Cancelar", "fav": "Añadir a favoritos", "find": "Buscar en la página", "newTab": "Nueva pestaña", "hist": "Historial", "ainstall": "Instalar aplicación", "ainstallBtn": "Instalar"},
    ins: {"iosS": ["En la barra de Safari abajo del todo (no en esta página), toca Compartir {S}. En iPhone recientes (iOS 26), toca primero los tres puntos ⋯ abajo a la derecha y luego « Compartir ».", "En la lista que se abre, desplázate y toca « Añadir a pantalla de inicio » ➕.", "Toca « Añadir » arriba a la derecha: el icono NOBIS aparece en tu pantalla."], "iosC": ["Toca el icono Compartir {S} arriba a la derecha, en la barra de direcciones.", "Toca « Añadir a pantalla de inicio » y luego « Añadir »."], "and": ["Toca el menú ⋮ arriba a la derecha de Chrome.", "Toca « Instalar aplicación » o « Añadir a pantalla de inicio » y luego « Instalar »."], "app": "Estás en el navegador de otra app (Facebook, Instagram…). Abre primero este enlace en Safari o Chrome: menú ⋯ → « Abrir en el navegador ».", "tip": "¿No aparece « Añadir a pantalla de inicio »? Al final de la lista toca « Editar acciones » y añádelo. En navegación privada, abre una pestaña normal.", "copy": "Copiar el enlace"},
    hr: {"gate": "Antes de usar la app, lee las normas de la casa y acéptalas. Es obligatorio, una sola vez (y de nuevo si las normas cambian).", "changed": "Las normas han cambiado: léelas y acéptalas de nuevo.", "R": ["Silencio: nada de ruido entre las 22 h y las 7 h, ni los domingos y festivos; música y llamadas a volumen moderado.", "Limpieza: cocina, baño y zonas comunes limpias después de cada uso; platos lavados y guardados el mismo día.", "Desagües: nada de pelos, restos de comida, aceite ni toallitas en fregaderos, duchas e inodoros.", "Basura: separar según las normas y sacar los contenedores el día correcto (ver « Recogida de basura »).", "Tabaco: está prohibido fumar o vapear en el interior.", "Visitas: no alojar a otra persona ni subarrendar sin acuerdo escrito del administrador.", "Seguridad: cerrar la puerta de entrada, no dar nunca llaves ni códigos, no dejar nada en los pasillos, nada de estufas portátiles ni bombonas de gas.", "Energía: cerrar las ventanas con la calefacción encendida, apagar luces y aparatos innecesarios.", "Problemas: avisar enseguida de cualquier daño o avería desde la app.", "Respeto: nada de insultos, amenazas ni discriminación. Los mensajes de la casa los lee el administrador, que puede intervenir."], "rulesT": "Normas de la casa", "rulesExtra": "Normas propias de tu edificio", "rulesAccept": "✓ He leído y acepto las normas", "rulesOk": "Normas aceptadas el", "board": "Chat de la casa", "boardHint": "Mini-chat entre los habitantes de tu vivienda. El administrador también lee los mensajes para evitar conflictos: sé cortés.", "boardPh": "Tu mensaje…", "boardEmpty": "Todavía no hay mensajes. ¡Escribe el primero!", "boardFirst": "Para escribir, acepta primero las normas de la casa.", "mgr": "Administrador", "refresh": "↻ Actualizar", "rgpd2": "Si el chat de la casa está activado, lo que escribes es visible para los demás habitantes de tu vivienda y para el administrador (prevención de conflictos, interés legítimo); los mensajes están cifrados y se borran automáticamente a los 90 días. Tu aceptación de las normas se registra con su fecha."},
    rc: { btn: '📄 Resumen de todos mis alquileres pagados', title: 'Resumen de alquileres pagados', cols: ['Mes', 'Alquiler', 'Pagado', 'Fecha de pago'], total: 'Total', partial: 'pago parcial', paidN: (n) => `${n} ${n > 1 ? 'meses pagados' : 'mes pagado'}`,
      text: (s, n, a, f, to) => `El/la abajo firmante, ${s}, arrendatario principal y arrendador, declara haber recibido de ${n} las cantidades detalladas arriba, por un total de ${a}, en concepto de alquiler de ${f} a ${to}, y otorga el presente recibo.` },
    more: (n) => `Ver las ${n} siguientes`,
    tl: {"title": "Regalar · prestar · alquilar objetos", "hint": "Regala, presta o alquila tus cosas (herramientas, electrodomésticos, muebles…). Los interesados te escriben por email; el dinero se intercambia entre vosotros, en efectivo en la entrega.", "see": "🌐 Ver todos los anuncios", "mine": "Mis anuncios", "add": "➕ Publicar un objeto", "photos": "Fotos (de 1 a 3)", "t": "Título (ej. Taladro Bosch)", "kind": "Tipo", "kinds": {"don": "🎁 Regalo (gratis)", "pret": "🤝 Préstamo gratis", "loc": "💶 Alquiler"}, "price": "Precio (€)", "unit": "Por", "units": {"h": "hora", "j": "día", "we": "fin de semana", "s": "semana", "u": "precio único"}, "desc": "Descripción (estado, marca, accesorios…)", "rules": "Tus condiciones (fianza, devolución…)", "lieu": "Lugar de entrega (ej. Luxembourg-Gare)", "mail": "Tu email (solo se da a quien toque « Me interesa »)", "ok": "Acepto las normas de uso: mi anuncio y mis fotos se publican en luxinterventions.com (sin mi nombre ni mi dirección); mi nombre de pila y mi email se dan a las personas interesadas.", "send": "Enviar para aprobación", "sent": "¡Gracias! Tu anuncio estará en línea en cuanto el administrador lo apruebe.", "st": {"pending": "⏳ Pendiente de aprobación", "ok": "✅ En línea", "exp": "⌛ Caducado"}, "del": "Retirar", "delQ": "¿Retirar este anuncio?", "rulesLink": "Normas de uso", "need": "Añade al menos una foto.", "inter": (n) => `📩 ${n} persona${n > 1 ? 's interesadas' : ' interesada'} — mira tu email`},
    bn: { meObj: 'ti', insteadMe: (w, c) => `🙋 Lo hiciste tú en lugar de ${w}: ${c}`, forgotMsg: (n, c) => `⚠️ Turno olvidado: ${n} (${c})`, insteadMsg: (n, w, c) => `🙋 ${n} lo hizo en lugar de ${w}: ${c}`, instead: '🙋 Lo hice yo en su lugar', catch: 'recuperación', board: '🏆 Clasificación del año', owe: (n) => `🔁 ${n} por recuperar`, you: 'Te toca a ti', tonight: 'Esta noche', morning: 'Esta mañana', done: '✅ Hecho', cant: '🔁 No puedo', take: '🙋 Lo hago yo', me: 'tú', turn: 'turno de', doneBy: 'hecho por',
      doneMsg: (n, c) => `✅ ${n} ha sacado: ${c}`, cantMsg: (n, c) => `🔁 ${n} no puede sacar: ${c} — ¿quién lo hace?`, takeMsg: (n, c) => `🙋 ${n} se encarga: ${c}`, ask: (n, c) => `${n} no puede (${c}). ¿Puedes hacerlo?` },
    ed: {"t": "Estado de la vivienda", "hint": "Las fotos de tu vivienda a tu llegada, estancia por estancia (toca para ampliar).", "none": "aún sin foto", "rooms": {"sdb": "🛁 Baño", "cuisine": "🍳 Cocina", "chambre": "🛏️ Habitación", "cave": "📦 Trastero", "buanderie": "🧺 Lavandería", "parking": "🚗 Aparcamiento"}, "out": "🚪 Cuando me vaya: mis fotos de salida", "outHint": "El día de tu salida, haz una foto de cada estancia y envíalas: las comparamos con las de tu llegada.", "cam": "📷 Foto", "gal": "🖼️ Galería", "send": "Enviar mis fotos de salida", "sent": "✓ enviada el", "ok": "¡Gracias! Tus fotos de salida se han enviado.", "pick": "Haz al menos una foto.", "map": "🗺️ Abrir en Google Maps", "mapHint": "Ruta, taxi: enséñale esta dirección al conductor."},
    ad: {"back": "📣 Publicidad", "t": "Ofertas del barrio", "hint": "Nuestros socios cerca de ti. Toca un anuncio: el mapa aparece arriba.", "see": "🗺️ Ver en el mapa", "route": "🧭 Ruta", "home": "🏠 Mi vivienda", "call": "📞 Llamar", "web": "🌐 Web", "cats": {"musique": "🎵 Música", "resto": "🍕 Pizzería / restaurante", "bar": "🍺 Bar / pub", "horeca": "☕ Cafetería / snack", "bricolage": "🔨 Bricolaje / jardín", "meubles": "🛋️ Muebles / decoración", "courses": "🛒 Supermercado", "proxi": "🏪 Comercio de proximidad", "bureau": "🏢 Oficinas", "social": "📱 Redes sociales", "services": "🧰 Servicios", "autre": "📌 Otro"}, "lbl": "Publicidad", "mapT": "Mapa"},
    nt: {"t": "🔔 Notificaciones", "hint": "Recibe un aviso y el número en el icono cuando haya un mensaje o una novedad.", "on": "🔔 Activar las notificaciones", "ok": "✓ Notificaciones activas en este móvil", "install": "iPhone: primero añade la app a la pantalla de inicio, ábrela desde el icono y activa aquí las notificaciones.", "denied": "Las notificaciones están bloqueadas: vuelve a activarlas en los ajustes del móvil (Notificaciones → esta app).", "err": "No se pueden activar las notificaciones en este móvil."},
    men: {"today": "Hoy pasa la señora de la limpieza", "at": "llegada prevista a las", "q": "¿Estás satisfecho con la limpieza?", "crit": "Criterio", "opts": ["😞 Deficiente", "😐 Suficiente", "🙂 Bueno", "⭐ Excelente"], "thanks": "¡Gracias por tu valoración!", "dl": "⬇️ Descargar mi contrato", "tomorrow": "Mañana pasa la señora de la limpieza", "noToday": "Hoy la señora de la limpieza no pasa", "noTomorrow": "Mañana la señora de la limpieza no pasa", "noWhy": "Problema técnico o ausencia: la visita se reprogramará."},
    mt: {"offL": "No pasa", "t": "Mantenimiento", "today": "Hoy", "tomorrow": "Mañana", "off": "no pasa (problema técnico o ausencia)", "none": "Ninguna visita prevista en los próximos 7 días.", "rate": "La limpieza de hoy", "m": {"menage": "🧹 Limpiadora", "menuisier": "🪚 Carpintero", "electricien": "💡 Electricista", "plombier": "🚰 Fontanero", "chauffagiste": "🔥 Técnico de calefacción", "macon": "🧱 Albañil", "peintre": "🎨 Pintor", "serrurier": "🔑 Cerrajero", "jardinier": "🌿 Jardinero", "autre": "🔧 Operario"}},
    mc: {"add": "✍️ Añadir un comentario", "tags": {"ok": "⏰ Puntual", "late": "⏰ Con retraso", "nice": "😊 Amable", "rude": "😠 Desagradable", "clean": "✨ Bien limpio", "dirty": "🧹 Olvidos / mal limpio"}, "ph": "ej. Llegó puntual, muy amable, el rellano no se fregó…", "send": "Enviar", "ok": "✓ Comentario enviado, ¡gracias!"},
    dk: { t: '🔑 Mi llave digital', on: 'Activa', until: 'válida hasta el', noEnd: 'sin fecha de fin', left: (n) => (n <= 0 ? 'último día' : n === 1 ? 'queda 1 día' : `quedan ${n} días`) },
    cr: {"t": "Normas de tu edificio", "eve": "La noche anterior", "day": "El mismo día, temprano por la mañana", "after": "después de las {h}", "before": "antes de las {h}", "lieux": {"rue": "en la acera", "soussol": "en el sótano (cuarto de basuras)", "garage": "en el garaje", "autre": "ver la nota"}, "today": "Hoy", "tomorrow": "Mañana"},
    loc: 'es-ES', door: 'Código de mi puerta', since: 'desde el', app: 'App de inquilinos NOBIS s.a.r.l.', welcome: 'Tus alquileres, recibos, documentos y recogida de basura — y avisar de un problema, desde tu móvil.', code: 'Tu código de acceso personal', codePh: 'ej. K7PM2-QXA4H', enter: 'Entrar', noCode: '¿No tienes código? Pídeselo a tu administrador.', badCode: 'Código desconocido. Compruébalo o pide un código nuevo.', install: 'Instalar el icono en mi móvil', iosHow: 'iPhone: toca Compartir y luego « Añadir a pantalla de inicio ».', andHow: 'Android: menú ⋮ y luego « Instalar aplicación ».', logout: 'Cerrar sesión en este móvil', title: 'Mi espacio de inquilino', hello: 'Hola', avis: 'Avisos del edificio', pay: 'Mis alquileres', restNow: 'Pendiente a día de hoy', upcoming: 'por vencer', allPaid: 'Todo pagado a día de hoy ✓',
    pv: { btn: '💳 Pagar ahora', tabs: { vir: '🏦 Transferencia', pp: '🅿️ PayPal', card: '💳 Tarjeta', crypto: '₿ Cripto' }, ppGo: 'Abrir PayPal', cardGo: 'Pagar con tarjeta', toType: (a, r) => `Importe: ${a} · Concepto: ${r}`, net: 'Red', cryAmt: (a) => `Envía el equivalente de ${a} al cambio del día.`, cryNet: 'Comprueba bien la red: un envío por la red equivocada se pierde.', done2: '✅ He pagado', thanks: (d) => `¡Gracias! Pago avisado el ${d}. El mes se marcará en cuanto llegue.`, title: 'Pagar por transferencia', who: 'Beneficiario', amt: 'Importe', copy: 'Copiar', copied: '✓ Copiado', how: 'Abre la app de tu banco → Transferencia y pega estos datos (toca « Copiar »).', qr: 'O escanea este código QR con la app de tu banco (desde otra pantalla).', done: '✅ He hecho la transferencia', doneQ: '¿Confirmas que has pagado?', note: (n) => `Ningún pago pasa por esta app: el dinero va directamente a ${n}.` }, iban: 'Para pagar', ref: 'Concepto', quit: 'Mis recibos', quitBtn: 'Recibo', partial: 'Recibo parcial', contrat: 'Mi contrato', entry: 'Entrada', end: 'Fin del contrato', rent: 'Alquiler', revision: 'Próxima revisión', caution: 'Fianza',
    docs: 'Mi expediente', dossierHint: 'Documentos y justificantes que hemos registrado para ti (toca 👁 para verlos). ¿Un error o falta un documento? Dínoslo.', errBtn: '⚠️ Avisar de un error', recv: 'recibida el', proof: 'Justificante', modes: { especes: 'en mano (efectivo)', virement: 'por transferencia', cheque: 'con cheque', garantie: 'aval bancario', autre: '' }, dt: { bail: 'Contrato de alquiler', identite: 'Documento de identidad', cns: 'Tarjeta sanitaria (CNS)', caution: 'Justificante de la fianza', loyer: 'Justificante de pago del alquiler', assurance: 'Seguro de hogar', revenus: 'Ingresos', titre: 'Permiso de residencia', autre: 'Documento' }, coll: 'Recogida de basura', putOut: 'sacar', truck: 'pasa el camión el', calAdd: '📅 Añadir las recogidas a mi calendario', signal: 'Avisar de un problema', what: '¿Qué problema hay?', whatPh: 'ej. Fuga de agua bajo el fregadero de la cocina desde esta mañana', type: 'Tipo', types: { rep: '🔧 Reparación / avería', menage: '🧹 Limpieza', dossier: '📄 Error en mi expediente / mis pagos', autre: '📌 Otro' },
    photos: 'Fotos (máximo 3)', tel: 'Teléfono de contacto (opcional)', dispo: '¿Cuándo estás disponible? (opcional)', send: 'Enviar', sent: 'Gracias, tu mensaje se ha enviado. Aquí verás cuándo se atiende.', mine: 'Mis avisos',
    st: { afaire: 'Recibido', planifie: 'Programado', fait: 'Terminado' }, lights: ['Próximamente', 'Mañana', 'Hoy — urgente'], legend: 'Leyenda',
    months: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'], monthsFull: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
    off: 'Este espacio ya no está activo. Contacta con tu administrador.', bad: 'Enlace incompleto. Ábrelo exactamente como lo recibiste.', personal: 'Este enlace es personal: no lo compartas.', updated: 'Actualizado el',
    rgpdT: 'Protección de tus datos (RGPD)',
    rgpd: (s) => `Este espacio lo gestiona ${s.nom}${s.adresse ? ', ' + s.adresse + ' ' + s.ville : ''}, tu arrendador (arrendatario principal). Solo muestra tu propia información de alquiler (alquileres, contrato, documentos compartidos) para que puedas consultarla; base jurídica: la ejecución de tu contrato de alquiler. Tus datos están cifrados: la clave solo está en tu enlace personal; ni el proveedor de alojamiento (Cloudflare) ni nadie más puede leerlos. Los mensajes que envías solo los puede leer tu administrador y sirven únicamente para tramitar tu solicitud. El espacio se desactiva al final del alquiler; los datos del alquiler se conservan durante el contrato más 10 años (obligaciones contables). Puedes solicitar el acceso, la rectificación o la supresión de tus datos${s.email ? ' a ' + s.email : ' a tu administrador'} y presentar una reclamación ante la CNPD (cnpd.public.lu). Sin cookies publicitarias ni seguimiento.`,
    quitTitle: 'Recibo de alquiler', quitPart: 'Recibo de pago parcial', landlord: 'Arrendatario principal (arrendador)', tenant: 'Subarrendatario', period: (m, y) => `Periodo: ${m} ${y}`,
    quitText: (s, n, a, m, y) => `El/la abajo firmante, ${s}, arrendatario principal y arrendador, declara haber recibido de ${n} la cantidad de ${a} en concepto del alquiler de ${m} ${y}, y le otorga el presente recibo.`, print: 'Imprimir / guardar en PDF', close: 'Cerrar',
  },
};
const pick = (d) => { try { const s = localStorage.getItem('espLang'); if (L[s]) return s; } catch {} if (d && L[d.lang]) return d.lang; const n = (navigator.language || 'fr').slice(0, 2); return L[n] ? n : 'fr'; };
let data = null, lang = 'fr', sentOk = false;
const T = () => L[lang];
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const today = iso(new Date());
const addDays = (s, n) => { const d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + n); return iso(d); };
const fmt = (s) => (s ? new Date(s.slice(0, 10) + 'T00:00:00').toLocaleDateString(T().loc, { day: 'numeric', month: 'long', year: 'numeric' }) : '');
const day = (s) => new Date(s + 'T00:00:00').toLocaleDateString(T().loc, { weekday: 'long', day: 'numeric', month: 'long' });
const money = (n) => new Intl.NumberFormat(T().loc, { style: 'currency', currency: 'EUR' }).format(n || 0);
// 🟢 fixe : plus tard · 🟡 clignote : demain · 🔴 clignote : aujourd'hui (urgent)
const lightOf = (d) => (d <= today ? 'red' : d <= addDays(today, 1) ? 'yellow' : 'green');
const lightCls = (c) => `light l-${c}${c === 'green' ? '' : ' blink'}`;
const BIN_COLORS = { residuel: '#6b7280', organique: '#92400e', papier: '#2563eb', verre: '#15803d', valorlux: '#0891b2', encombrants: '#7c3aed', autre: '#9a958a' };
const CATS = {
  fr: { residuel: 'Déchets résiduels', organique: 'Biodéchets', papier: 'Papier / carton', verre: 'Verre', valorlux: 'Valorlux', encombrants: 'Encombrants', autre: 'Autre' },
  it: { residuel: 'Indifferenziato', organique: 'Organico / umido', papier: 'Carta / cartone', verre: 'Vetro', valorlux: 'Valorlux', encombrants: 'Ingombranti', autre: 'Altro' },
  de: { residuel: 'Restmüll', organique: 'Biomüll', papier: 'Papier & Karton', verre: 'Glas', valorlux: 'Valorlux', encombrants: 'Sperrmüll', autre: 'Sonstiges' },
  pt: { residuel: 'Lixo indiferenciado', organique: 'Orgânicos', papier: 'Papel / cartão', verre: 'Vidro', valorlux: 'Valorlux', encombrants: 'Monstros', autre: 'Outro' },
  es: { residuel: 'Resto / no reciclable', organique: 'Orgánico', papier: 'Papel / cartón', verre: 'Vidrio', valorlux: 'Valorlux', encombrants: 'Voluminosos', autre: 'Otro' },
  en: { residuel: 'Residual waste', organique: 'Organic waste', papier: 'Paper / cardboard', verre: 'Glass', valorlux: 'Valorlux', encombrants: 'Bulky waste', autre: 'Other' },
};

// Dossier : documents enregistrés par le gestionnaire (libellé traduit selon le type) + aperçu
const FR_DEF = new Set(['Contrat de bail', "Pièce d'identité", 'Carte CNS', 'Preuve de la caution', 'Preuve de paiement du loyer', 'Attestation assurance habitation', 'Fiches de salaire / revenus', 'Titre de séjour', 'Autre document']);
const proofOf = (k, pay) => ((data && data.docs) || []).find((x) => x.dtype === k && (!pay || x.pay === pay));
function docSub(x) {
  const t = T(), parts = [];
  if (x.pay) { const [y, m] = x.pay.split('-').map(Number); parts.push(t.monthsFull[m - 1] + ' ' + y); } else if (t.dt[x.dtype] && x.label && !FR_DEF.has(x.label)) parts.push(x.label);
  parts.push(fmt(x.date));
  return parts.join(' · ');
}
function preview(doc, url, keep) {
  const t = T();
  const el = document.createElement('div');
  el.className = 'pv';
  el.innerHTML = `<div class="pv-bar"><b>${esc(t.dt[doc.dtype] || doc.label)}</b><a class="btn sm sec" href="${url}" download="${esc(doc.label || 'document')}">⬇</a><button class="btn sm" data-pv-close="1">✕ ${esc(t.close)}</button></div>${/^image\//.test(doc.mime || '') ? `<img src="${url}" alt="">` : `<iframe src="${url}" title="${esc(doc.label)}"></iframe>`}`;
  el.addEventListener('click', (e) => { if (e.target.closest('[data-pv-close]')) { el.remove(); if (!keep) URL.revokeObjectURL(url); } });
  document.body.append(el);
}
// Guide d'installation selon le téléphone et le navigateur (Apple/Google exigent un geste de l'utilisateur)
const SHARE_ICON = '<svg class="share-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M8 7l4-4 4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 10H5v11h14V10h-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone;
const UA = navigator.userAgent;
const IS_IOS = /iPhone|iPad|iPod/.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const IN_APP = /FBAN|FBAV|FB_IAB|Instagram|Line\/|Snapchat|musical_ly|TikTok|LinkedInApp|GSA\//.test(UA);
function installCard(t) {
  if (isStandalone()) return '';
  return `<button class="install-big" data-guide="1"><span class="ph">📱</span><span class="tx"><b>${esc(t.install)}</b><small>${esc(t.g.sub)}</small></span><span class="go">›</span></button>`;
}
// Maquettes simplifiées de l'écran (libellés dans la langue du téléphone), l'endroit à toucher en surbrillance
const HI = (x) => `<span class="hi">${x}</span>`;
const ICON = '<img src="/ares/icons/ares-192.png" alt="">';
const MK = {
  bar: () => `<div class="mk"><div class="mk-page"></div><div class="mk-bar"><span>‹</span><span class="mk-url">luxinterventions.com</span>${HI('⋯')}</div></div>`,
  menu: (items, h) => `<div class="mk mk-sheet">${items.map((x, i) => `<div class="mk-row${i === h ? ' hi-row' : ''}">${esc(x)}</div>`).join('')}</div>`,
  dlg: (u) => `<div class="mk"><div class="mk-top"><span>${esc(u.cancel)}</span>${HI(esc(u.add))}</div><div class="mk-dlg">${ICON}<div><b>NOBIS Locataires</b><small>luxinterventions.com</small></div></div></div>`,
  home: () => `<div class="mk mk-home">${'<i></i>'.repeat(6)}<span class="hi-app">${ICON}<small>NOBIS</small></span><i></i></div>`,
  chrome: () => `<div class="mk"><div class="mk-bar"><span class="mk-url">luxinterventions.com</span>${HI('⋮')}</div><div class="mk-page"></div></div>`,
  adlg: (u) => `<div class="mk mk-adlg">${ICON}<b>NOBIS Locataires</b><div class="mk-btns"><span>${esc(u.cancel)}</span>${HI(esc(u.ainstallBtn))}</div></div>`,
};
let guideTab = IS_IOS ? 'ios' : 'and';
function renderGuide() {
  let el = document.getElementById('guide');
  if (!el) {
    el = document.createElement('div');
    el.id = 'guide';
    el.addEventListener('click', async (e) => {
      if (e.target.closest('[data-gclose]')) { el.remove(); return; }
      const lb = e.target.closest('[data-glang]');
      if (lb) { lang = lb.dataset.glang; try { localStorage.setItem('espLang', lang); } catch {} render(); return renderGuide(); }
      const tb = e.target.closest('[data-gtab]');
      if (tb) { guideTab = tb.dataset.gtab; return renderGuide(); }
      const cl = e.target.closest('[data-copylink]');
      if (cl) { try { await navigator.clipboard.writeText(location.origin + '/espace.html'); cl.textContent = '✓'; } catch { prompt('', location.origin + '/espace.html'); } }
    });
    document.body.append(el);
  }
  const t = T(), g = t.g, u = t.ui;
  const steps = guideTab === 'ios'
    ? [[g.i1, MK.bar()], [g.i2, MK.menu(['⬆  ' + u.share, '☆  ' + u.fav, '＋  ' + u.newTab], 0)], [g.i3, MK.menu(['☆  ' + u.fav, '🔍  ' + u.find, '⊕  ' + u.a2hs], 2)], [g.i4, MK.dlg(u)], [g.done, MK.home()]]
    : [[g.a1, MK.chrome()], [g.a2, MK.menu(['＋  ' + u.newTab, '🕘  ' + u.hist, '📲  ' + u.ainstall], 2)], [g.a3, MK.adlg(u)], [g.done, MK.home()]];
  el.innerHTML = `<div class="g-head"><b>📱 ${esc(t.install)}</b><button class="btn sm sec" data-gclose="1">✕ ${esc(t.close)}</button></div>
    <div class="langs g-langs">${['fr', 'de', 'en', 'it', 'pt', 'es'].map((k) => `<button data-glang="${k}" aria-pressed="${k === lang}">${k.toUpperCase()}</button>`).join('')}</div>
    <div class="g-tabs"><button data-gtab="ios" aria-pressed="${guideTab === 'ios'}">🍎 iPhone</button><button data-gtab="and" aria-pressed="${guideTab === 'and'}">🤖 Android</button></div>
    ${IN_APP ? `<div class="card avis"><p style="margin:0">${esc(t.ins.app)}</p><button class="btn sec block" style="margin-top:10px" data-copylink="1">${esc(t.ins.copy)}</button></div>` : ''}
    ${guideTab === 'ios' ? `<p class="meta" style="margin:0 0 10px">${esc(g.safari)}</p>` : ''}
    <ol class="g-steps">${steps.map(([txt, mk], i) => `<li><div class="g-txt"><span class="n">${i === steps.length - 1 ? '✓' : i + 1}</span>${esc(txt)}</div>${mk}</li>`).join('')}</ol>
    ${guideTab === 'ios' ? `<p class="meta">${esc(t.ins.tip)}</p>` : ''}
    <button class="btn block" data-gclose="1">${esc(t.close)}</button>`;
  el.scrollTop = 0;
}
// ── Tour des poubelles (à tour de rôle entre les habitants du fil ; actions publiées dans le fil) ──
const binCats = (e) => e.cats.map((c) => CATS[lang][c] || c).join(' + ');
const binName = (id) => (data.chat && id === data.chat.mid ? T().bn.me : (data.bins.names || {})[id] || '?');
// après « fait par », « au tour de », « à la place de » : forme complément (te, dir, ti…)
const binObj = (id) => (data.chat && id === data.chat.mid ? T().bn.meObj || T().bn.me : binName(id));
// Même calcul que dans Ares (app.js → binPlan) : oubli → tour de rattrapage ; fait par un autre → service rendu
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
const binPlanNow = () => binPlan(data.bins.order || [], data.bins.ev || [], chatMsgs, data.bins.log || {}, addDays(today, -60), today);
const binState = (e) => binPlanNow().find((x) => x.p === e.p) || { who: e.who, done: '', cant: '' };
// Carte « Ce soir c'est ton tour » (ou demande d'aide d'un colocataire), seulement pour le jour même
function binHtml() {
  const d = data;
  if (!d || !d.bins || !d.chat) return '';
  const t = T(), b = t.bn, plan = binPlanNow();
  const e = plan.find((x) => x.p === today);
  if (!e) return '';
  const st = e, mine = st.who === d.chat.mid;
  const tag = e.extra ? ` (${b.catch})` : '';
  const when = (d.coll || []).some((it) => (it.sortie || 'veille') === 'jour' && (it.dates || []).includes(e.p)) ? b.morning : b.tonight;
  if (st.done) return `<div class="card bin ok"><b><span class="light l-green"></span> 🗑️ ${esc(when)} · ${esc(binCats(e))}</b><div class="meta">✅ ${esc(b.doneBy)} ${esc(binObj(st.done))}</div></div>`;
  if (mine && !st.cant) return `<div class="card bin now"><b><span class="light l-red blink"></span> 🗑️ ${esc(when)} — ${esc(b.you)}${esc(tag)} : ${esc(binCats(e))}</b>
    <div class="bin-btns"><button class="btn" data-bin="done" data-d="${e.p}">${esc(b.done)}</button><button class="btn sec" data-bin="cant" data-d="${e.p}">${esc(b.cant)}</button></div></div>`;
  if (st.cant && st.cant !== d.chat.mid) return `<div class="card bin help"><b>🗑️ ${esc(when)} · ${esc(binCats(e))}</b><p style="margin:4px 0 8px">${esc(b.ask(binName(st.cant), binCats(e)))}</p>
    <div class="bin-btns"><button class="btn" data-bin="take" data-d="${e.p}">${esc(b.take)}</button></div></div>`;
  return `<div class="card bin"><b>🗑️ ${esc(when)} · ${esc(binCats(e))}</b><div class="meta">${st.who === d.chat.mid ? esc(b.you) : esc(b.turn) + ' ' + esc(binName(st.who))}${esc(tag)}${st.cant ? ' · 🔁' : ''}</div>
    <div class="bin-btns"><button class="btn sec" data-bin="instead" data-d="${e.p}">${esc(b.instead)}</button></div></div>`;
}
// Classement de l'année : 🏆🥈🥉 pour ceux qui sortent le plus les poubelles ; un simple « à rattraper » pour les oublis
function binBoard(plan) {
  const b = T().bn, y = today.slice(0, 4), sc = {};
  for (const e of plan.filter((x) => x.p.startsWith(y + '-'))) {
    if (e.done) (sc[e.done] ||= { done: 0, forgot: 0 }).done++;
    if (e.forgot) (sc[e.who] ||= { done: 0, forgot: 0 }).forgot++;
  }
  const rows = Object.entries(sc).filter(([id]) => (data.bins.names || {})[id]).sort((a, c) => c[1].done - a[1].done || a[1].forgot - c[1].forgot);
  if (!rows.length) return '';
  const medal = ['🏆', '🥈', '🥉'];
  return `<div class="coll-board"><p class="coll-board-t"><b>${esc(b.board)} ${y}</b></p>${rows.map(([id, v], i) => `<div class="row"><span style="width:26px">${v.done ? medal[i] || '·' : '·'}</span><div class="grow"><b>${esc(binName(id))}</b>${v.forgot ? ` <span class="meta">${esc(b.owe(v.forgot))}</span>` : ''}</div><b>${v.done} ✅</b></div>`).join('')}</div>`;
}
async function binAct(act, dte) {
  const e = data.bins.ev.find((x) => x.p === dte);
  if (!e) return;
  const fr = L.fr.bn, cats = e.cats.map((c) => CATS.fr[c] || c).join(' + ');
  const w = act === 'instead' ? (binPlanNow().find((z) => z.p === dte) || {}).who || '' : '';
  const x = act === 'done' ? fr.doneMsg(data.chat.me, cats) : act === 'cant' ? fr.cantMsg(data.chat.me, cats) : act === 'instead' ? fr.insteadMsg(data.chat.me, (data.bins.names || {})[w] || '?', cats) : fr.takeMsg(data.chat.me, cats);
  await fetch(`${API}/api/board/${data.chat.id}`, { method: 'POST', body: await sealJson(data.chat.key, { a: data.chat.me, m: data.chat.mid, x, t: new Date().toISOString(), k: 'bin', act, d: dte, cats: e.cats, ...(w ? { w } : {}) }) });
  await chatFetch();
}

// ── Messages de la maison : lecture (déchiffrée sur le téléphone), envoi, rafraîchissement ──
let chatMsgs = null, chatTimer = null, chatLoading = false;
const b64d = (x) => Uint8Array.from(atob(x), (c) => c.charCodeAt(0));
function chatHtml() {
  const t = T();
  if (chatMsgs == null) return '<p class="meta" style="margin:0">…</p>';
  const forgot = data.bins ? binPlanNow().filter((e) => e.forgot && e.p >= addDays(today, -60)).map((e) => ({ k: 'bin', act: 'forgot', m: e.who, a: data.bins.names[e.who] || '?', d: e.p, cats: e.cats, t: e.d + 'T23:59:00' })) : [];
  if (!chatMsgs.length && !forgot.length) return `<p class="meta" style="margin:0">${esc(t.hr.boardEmpty)}</p>`;
  return [...chatMsgs, ...forgot].sort((a, b) => (a.t || '').localeCompare(b.t || '')).map((m) => {
    if (m.k === 'bin') {
      const c = (m.cats || []).map((k) => CATS[lang][k] || k).join(' + '), n = m.m === data.chat.mid ? t.bn.me : m.a;
      if (m.act === 'instead') { const w = m.w === data.chat.mid ? t.bn.meObj || t.bn.me : (data.bins && data.bins.names[m.w]) || '?'; return `<div class="bub sys">${esc(m.m === data.chat.mid && t.bn.insteadMe ? t.bn.insteadMe(w, c) : t.bn.insteadMsg(n, w, c))}</div>`; }
      if (m.act === 'forgot') return `<div class="bub sys">${esc(t.bn.forgotMsg(n, c))}</div>`;
      return `<div class="bub sys">${esc((m.act === 'done' ? t.bn.doneMsg : m.act === 'cant' ? t.bn.cantMsg : t.bn.takeMsg)(n, c))}</div>`;
    }
    const mine = m.m === data.chat.mid, mgr = m.m === 'mgr';
    const when = new Date(m.t).toLocaleString(t.loc, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    return `<div class="bub${mine ? ' me' : ''}${mgr ? ' mgr' : ''}"><div class="bub-h"><b>${esc(mgr ? '🛡️ ' + t.hr.mgr : m.a)}</b> ${esc(when)}</div><div class="bub-x">${esc(m.x)}</div></div>`;
  }).join('');
}
const seenKey = () => 'espChatSeen:' + id;
const chatUnread = () => { let seen = ''; try { seen = localStorage.getItem(seenKey()) || ''; } catch {} return (chatMsgs || []).filter((m) => m.t > seen && m.m !== data.chat.mid && m.k !== 'bin').length; };
function chatSeen() {
  const c = document.querySelector('details[data-fold=chat]');
  if (!c || !c.open || document.visibilityState !== 'visible' || !chatMsgs || !chatMsgs.length) return chatBadge();
  try { localStorage.setItem(seenKey(), chatMsgs[chatMsgs.length - 1].t || ''); } catch { /* stockage indisponible */ }
  chatBadge();
}
function chatBadge() {
  const el = document.getElementById('chatNew');
  if (!el) return;
  const n = chatUnread(), ax = AX[lang] || AX.fr;
  el.innerHTML = n ? `<span class="light l-red blink"></span> <b class="bad">${esc(ax.newMsg(n))}</b>` : '';
}
async function chatFetch() {
  if (!data || !data.chat || chatLoading) return;
  chatLoading = true;
  try {
    const r = await fetch(`${API}/api/board/${data.chat.id}`, { cache: 'no-store' });
    if (r.ok) {
      const out = [];
      for (const it of (await r.json()).items || []) { try { out.push(await openJson(data.chat.key, b64d(it.d))); } catch { /* illisible */ } }
      chatMsgs = out.sort((a, b) => (a.t || '').localeCompare(b.t || ''));
      const bb = document.getElementById('binBox');
      if (bb) bb.innerHTML = binHtml();
      const bd = document.getElementById('binBoardBox');
      if (bd) bd.innerHTML = binBoard(binPlanNow());
      const box = document.getElementById('chat');
      if (box) { const atEnd = box.scrollTop + box.clientHeight >= box.scrollHeight - 30; box.innerHTML = chatHtml(); if (atEnd || box.dataset.first !== '1') { box.scrollTop = box.scrollHeight; box.dataset.first = '1'; } }
      chatSeen();
    }
  } catch { /* hors ligne */ }
  chatLoading = false;
}
function chatStart() {
  clearInterval(chatTimer);
  if (!data || !data.chat) return;
  chatFetch();
  chatTimer = setInterval(() => { if (document.visibilityState === 'visible') chatFetch(); }, 20000);
}
// ── Mes annonces « Don · prêt · location » ──
let myTools = null, toolMsg = '';
const toolSeen = (tid) => { try { return +localStorage.getItem('espToolSeen:' + tid) || 0; } catch { return 0; } };
function toolsHtml() {
  const tl = T().tl;
  if (!myTools || !myTools.length) return '';
  return `<p style="margin:12px 0 4px"><b>${esc(tl.mine)}</b></p>` + myTools.map((it) => {
    const st = it.exp < Date.now() ? tl.st.exp : tl.st[it.status] || it.status;
    const n = it.clicks || 0, fresh = n > toolSeen(it.id);
    return `<div class="row"><img src="${API}/api/tools/${esc(it.id)}/p0.jpg" alt="" style="width:52px;height:52px;object-fit:cover;border-radius:10px;flex:0 0 52px">
      <div class="grow"><b>${esc(it.title)}</b><div class="meta">${esc(st)}</div>${n ? `<button class="pill${fresh ? ' new' : ''}" data-tool-seen="${esc(it.id)}" data-n="${n}">${esc(tl.inter(n))}</button>` : ''}</div>
      <button class="btn sm sec" data-tool-del="${esc(it.id)}">${esc(tl.del)}</button></div>`;
  }).join('');
}
async function toolsFetch() {
  try {
    const r = await fetch(`${API}/api/esp/${id}/tools`, { cache: 'no-store' });
    if (r.ok) myTools = (await r.json()).items || [];
  } catch { /* hors ligne */ }
  myTools = myTools || [];
  const box = document.getElementById('myTools');
  if (box) box.innerHTML = toolsHtml();
}
// Cartes repliables : fermées au départ, on les ouvre d'un toucher ; celles qui sont ouvertes brillent doucement
let openFolds = new Set();
// Payer le loyer : virement vers le compte du gestionnaire (rien ne passe par l'app)
let payOpen = false, payVia = '';
const paidKey = () => 'espPaid:' + id;
function payInfo() {
  const d = data, t = T();
  const rest = d.years.reduce((n, y) => n + y.rest, 0);
  const cm = new Date().getMonth(), cy = new Date().getFullYear();
  const y0 = d.years.find((y) => y.y === cy);
  const [due, paid] = (y0 && y0.months[cm]) || [0, 0];
  const amt = rest > 0.009 ? rest : Math.max(0, due - paid);
  return { amt: Math.round(amt * 100) / 100, ref: `${t.rent} ${t.monthsFull[cm]} ${cy} — ${d.nom}`.slice(0, 140) };
}
const COINS = { btc: 'Bitcoin (BTC)', eth: 'Ethereum (ETH)', usdt: 'Tether (USDT)', usdc: 'USD Coin (USDC)' };
const NETS = { erc20: 'Ethereum (ERC-20)', trc20: 'Tron (TRC-20)', polygon: 'Polygon', bep20: 'BNB Chain (BEP-20)', sol: 'Solana' };
function qrSvg(text) {
  try { const q = qrcode(0, 'M'); q.addData(unescape(encodeURIComponent(text))); q.make(); return `<div class="pay-qr">${q.createSvgTag(4, 2)}</div>`; } catch { return ''; }
}
function payHtml() {
  const d = data, t = T(), pv = t.pv, { amt, ref } = payInfo(), x = d.payx || {};
  let sent = '';
  try { sent = localStorage.getItem(paidKey()) || ''; } catch {}
  const recent = sent && Date.now() - new Date(sent).getTime() < 10 * 864e5;
  const btn = `<button class="btn block" style="margin-top:12px" data-pay="1" aria-expanded="${payOpen}">${esc(pv.btn)}</button>`;
  const thanks = recent ? `<div class="pay-ok">${esc(pv.thanks(fmt(sent.slice(0, 10))))}</div>` : '';
  if (!payOpen) return btn + thanks;
  const coins = Object.keys(COINS).filter((c) => x[c]);
  const vias = [d.iban && 'vir', x.paypal && 'pp', x.card && 'card', coins.length && 'crypto'].filter(Boolean);
  const via = vias.includes(payVia) ? payVia : vias[0];
  const row = (lbl, val, copy) => `<div class="row pay-row"><div class="grow"><span class="meta">${esc(lbl)}</span><br><b>${esc(val)}</b></div>${copy ? `<button class="btn sec sm" data-copy="${esc(copy)}">${esc(pv.copy)}</button>` : ''}</div>`;
  const tabs = vias.length > 1 ? `<div class="pay-tabs">${vias.map((v) => `<button class="chip" data-payvia="${v}" aria-pressed="${v === via}">${esc(pv.tabs[v])}</button>`).join('')}</div>` : '';
  const amtTxt = amt > 0 ? money(amt) : '';
  let body = '';
  if (via === 'vir') {
    const iban = d.iban.replace(/\s+/g, '').toUpperCase();
    // QR « virement SEPA » (norme EPC) : lu par la plupart des apps bancaires
    const epc = ['BCD', '002', '1', 'SCT', (d.bic || '').replace(/\s/g, ''), d.societe.nom.slice(0, 70), iban, amt > 0 ? 'EUR' + amt.toFixed(2) : '', '', '', ref].join('\n');
    const qr = qrSvg(epc);
    body = `<h2 style="margin:0 0 6px">${esc(pv.title)}</h2>
    ${row(pv.who, d.societe.nom, d.societe.nom)}
    ${row('IBAN', d.iban, iban)}
    ${d.bic ? row('BIC / SWIFT' + (d.banque ? ' · ' + d.banque : ''), d.bic, d.bic) : ''}
    ${amt > 0 ? row(pv.amt, amtTxt, amt.toFixed(2)) : ''}
    ${row(t.ref, ref, ref)}
    <p class="meta" style="margin:10px 0 6px">${esc(pv.how)}</p>
    ${qr ? `${qr}<p class="meta" style="margin:4px 0 10px;text-align:center">${esc(pv.qr)}</p>` : ''}`;
  } else if (via === 'pp') {
    const url = `https://www.paypal.com/paypalme/${encodeURIComponent(x.paypal)}${amt > 0 ? '/' + amt.toFixed(2) + 'EUR' : ''}`;
    body = `<p class="meta" style="margin:0 0 10px">${esc(pv.toType(amtTxt || '—', ref))}</p>
    <a class="btn block" href="${esc(url)}" target="_blank" rel="noopener">${esc(pv.ppGo)}</a>`;
  } else if (via === 'card') {
    body = `<p class="meta" style="margin:0 0 10px">${esc(pv.toType(amtTxt || '—', ref))}</p>
    <a class="btn block" href="${esc(x.card)}" target="_blank" rel="noopener">${esc(pv.cardGo)}</a>`;
  } else if (via === 'crypto') {
    body = `${amt > 0 ? `<p style="margin:0 0 6px"><b>${esc(pv.cryAmt(amtTxt))}</b></p>` : ''}<p class="meta" style="margin:0 0 8px">⚠️ ${esc(pv.cryNet)}</p>
    ${coins.map((c) => {
      const a = x[c].a, n = x[c].n;
      const uri = c === 'btc' ? 'bitcoin:' + a : c === 'eth' ? 'ethereum:' + a : a;
      return `<div class="pay-coin"><b>${esc(COINS[c])}</b>${n ? ` <span class="meta">· ${esc(pv.net)} : ${esc(NETS[n] || n)}</span>` : ''}${row('', a, a)}${qrSvg(uri)}</div>`;
    }).join('')}`;
  }
  return `${btn}<div class="pay-box">${tabs}${body}
    <button class="btn block" style="margin-top:12px" data-paydone="${via}">${esc(via === 'vir' ? pv.done : pv.done2)}</button>
    <p class="meta" style="margin:8px 0 0">${esc(pv.note(d.societe.nom))}</p></div>${thanks}`;
}
try { openFolds = new Set(JSON.parse(localStorage.getItem('espFolds') || '[]')); } catch { /* stockage indisponible */ }
const DEF_OPEN = new Set(['mt', 'chat', 'meteo']);
const foldIsOpen = (k) => (DEF_OPEN.has(k) ? !openFolds.has('-' + k) : openFolds.has(k));
function foldSet(k, open) {
  if (DEF_OPEN.has(k)) { if (open) openFolds.delete('-' + k); else openFolds.add('-' + k); } else if (open) openFolds.add(k); else openFolds.delete(k);
  try { localStorage.setItem('espFolds', JSON.stringify([...openFolds])); } catch { /* stockage indisponible */ }
}
function foldCard(h, key, sum) {
  const m = h.match(/^<div class="card"([^>]*)><h2>([\s\S]*?)<\/h2>([\s\S]*)<\/div>$/);
  if (!m) return h;
  return `<details class="card fold"${m[1]} data-fold="${key}"${foldIsOpen(key) ? ' open' : ''}><summary><h2>${m[2]}</h2>${sum ? `<span class="sum">${sum}</span>` : ''}</summary><div class="fold-body">${m[3]}</div></details>`;
}
const rulesKey = () => 'espRules:' + id;
const rulesLocal = () => { try { return JSON.parse(localStorage.getItem(rulesKey()) || 'null') || {}; } catch { return {}; } };
// Date d'acceptation du règlement EN VIGUEUR (vide si jamais accepté ou si le règlement a changé depuis)
function rulesDate(d) {
  if (!d.regles) return '';
  if (d.regles.lu && d.regles.lv === d.regles.v) return d.regles.lu;
  const r = rulesLocal();
  return r.v === d.regles.v ? r.d : '';
}
// Femme de ménage : passage d'aujourd'hui (date prévue ou horaire de la semaine, hors absences) et avis du locataire
// passage prévu un jour donné : { ...passage, off } (off = absente : elle ne passe pas) ou null
function menOn(d, day) {
  const m = d.menage;
  if (!m) return null;
  const dow = (new Date(day + 'T12:00:00').getDay() + 6) % 7;
  const all = [...(m.dates || []).filter((z) => z.d === day), ...(m.week || []).filter((h) => h.j === dow).map((h) => ({ ...h, off: (h.off || []).some(([a, b]) => a <= day && day <= b) }))]
    .sort((a, b) => (a.off ? 1 : 0) - (b.off ? 1 : 0) || (a.de || '').localeCompare(b.de || ''));
  return all[0] || null;
}
// une seule pastille : 🟢 aujourd'hui · 🟡 demain · 🔴 ne passe pas (problème technique)
function menState(d) {
  const a = menOn(d, today);
  if (a) return { ...a, when: 'today', c: a.off ? 'red' : 'green' };
  const b = menOn(d, addDays(today, 1));
  if (b) return { ...b, when: 'tomorrow', c: b.off ? 'red' : 'yellow' };
  return null;
}
// Passages des 7 prochains jours (femme de ménage + ouvriers) ; plusieurs créneaux le même jour = une ligne
function visitsOf(d) {
  let list = d.visits;
  // données publiées par une app de gestion pas encore à jour : on reprend le passage du ménage (horaire + dates)
  if (!Array.isArray(list)) {
    const m = d.menage;
    if (!m) return null;
    list = [];
    for (let i = 0; i <= 7; i++) {
      const dd = addDays(today, i), dow = (new Date(dd + 'T12:00:00').getDay() + 6) % 7;
      for (const h of m.week || []) if (h.j === dow) list.push({ d: dd, w: h.w, nom: h.nom, m: 'menage', de: h.de, a: h.a, off: (h.off || []).some(([x, y]) => x <= dd && dd <= y) });
      for (const z of (m.dates || []).filter((z) => z.d === dd)) list.push({ ...z, m: 'menage' });
    }
    list.sort((a, b) => a.d.localeCompare(b.d) || (a.de || '99').localeCompare(b.de || '99'));
  }
  const out = [];
  for (const v of list) {
    if (v.d < today) continue;
    const same = out.find((x) => x.w === v.w && x.d === v.d);
    const hr = v.de ? v.de + (v.a ? '–' + v.a : '') : '';
    if (same) { if (hr) same.hrs.push(hr); same.off = same.off || v.off; same.t = same.t || v.t; continue; }
    out.push({ ...v, hrs: hr ? [hr] : [] });
  }
  return out;
}
// même code que les collectes : 🔴 aujourd'hui · 🟡 demain · 🟢 plus tard ; ⚫ gris = ne passe pas
const visColor = (v) => (v.off ? 'grey' : v.d === today ? 'red' : v.d === addDays(today, 1) ? 'yellow' : 'green');
function visLine(v, t, short) {
  const mt = t.mt, who = (mt.m[v.m] || mt.m.autre) + (v.nom ? ' (' + v.nom + ')' : '');
  const when = v.d === today ? mt.today : v.d === addDays(today, 1) ? mt.tomorrow : day(v.d);
  const soon = v.d <= addDays(today, 1);
  return `<div class="row vis"><span class="light l-${visColor(v)}${soon && !v.off ? ' blink' : ''}" style="margin-top:6px"></span><div class="grow"><b>${esc(short ? when + ' · ' + who : who)}</b><div class="${v.off ? 'bad' : 'meta'}">${short ? '' : esc(when) + ' · '}${v.off ? esc(mt.off) : esc(v.hrs.join(' · '))}${v.t ? ' · ' + esc(v.t) : ''}</div></div></div>`;
}
const menKey = () => 'espMen:' + id;
// commentaire sur le ménage du jour : cases rapides (à l'heure, aimable…) + texte libre, envoyés avec la note
const menTags = new Set();
let menNote = '';
const menNoteSent = () => { try { return (JSON.parse(localStorage.getItem('espMenC:' + id) || '{}'))[today]; } catch { return false; } };
const menVote = () => { try { return (JSON.parse(localStorage.getItem(menKey()) || '{}'))[today] || 0; } catch { return 0; } };
// Annonces : une par emplacement ; s'il y en a plusieurs au même endroit, une autre à chaque ouverture de l'app
let homeMap = false, pubTurn = 0, topPubId = '';
try { pubTurn = (+localStorage.getItem('espPubTurn') || 0) + 1; localStorage.setItem('espPubTurn', String(pubTurn)); } catch { /* stockage indisponible */ }
// annonce repliée d'un toucher sur son titre (mémorisé sur l'appareil), rouverte de la même façon
const pubShut = new Set((() => { try { return JSON.parse(localStorage.getItem('espPubShut') || '[]'); } catch { return []; } })());
const pickPub = (list) => (list.length ? list[pubTurn % list.length] : null);
function adBox(x, t, d, top) {
  const v = x.video ? videoEmbed(x.video) : null;
  return `<details class="card pub-box${top ? ' pub-top' : ''}" data-pid="${esc(x.id)}"${pubShut.has(x.id) ? '' : ' open'}><summary><div class="meta"><b class="pub-lbl">📣 ${esc(t.ad.lbl)}</b> · ${esc(t.ad.cats[x.cat] || t.ad.cats.autre)}</div><b class="pub-name">${esc(x.nom)}</b></summary>${x.texte ? `<div class="pub-txt">${esc(x.texte)}</div>` : ''}
    ${v ? `<div class="vid${v.tall ? ' tall' : ''}${v.audio ? ' audio' : ''}"${v.audio ? ` style="height:${v.audio}px"` : ''} data-vsrc="${esc(v.src)}"></div>` : ''}<div class="meta" style="margin-top:6px">📍 ${esc(x.adresse)}</div>
    <div class="pub-acts"><button class="btn sm" data-ad="${esc(x.id)}" data-pev="map">${esc(t.ad.see)}</button>${x.tel ? `<a class="btn sm sec" href="tel:${esc(x.tel.replace(/[^\d+]/g, ''))}" data-pev="call">${esc(t.ad.call)}</a>` : ''}${x.web ? `<a class="btn sm sec" href="${esc(x.web)}" target="_blank" rel="noopener" data-pev="web">${esc(t.ad.web)}</a>` : ''}${x.video && !v ? `<a class="btn sm sec" href="${esc(x.video)}" target="_blank" rel="noopener" data-pev="video">▶ Video</a>` : ''}${top && d.adresse ? `<button class="btn sm sec" data-home="1">${esc(t.ad.home)}</button>` : ''}</div></details>`;
}
// Barre des cours crypto (TradingView), servie par le Worker sur un autre domaine : elle ne voit rien de l'app
const TICKER = `<div class="ticker" data-vsrc="${API}/ticker"></div>`;
// Adresse pour Google Maps (on ajoute le pays s'il manque)
const mapQ = (a) => (/luxemb|lëtzebuerg|deutschland|germany|france|belgi|portugal|espa|ital/i.test(a) ? a : a + ', Luxembourg');
// État des lieux : photos d'entrée (déchiffrées à l'affichage) et photos de sortie choisies par le locataire
const EDL_ROOMS = ['sdb', 'cuisine', 'chambre', 'cave', 'buanderie', 'parking'];
const edlUrls = new Map();
let edlPick = {}, edlMsg = '', adSel = '';
const edlKey = () => 'espEdlOut:' + id;
function edlSent() {
  const o = {};
  for (const x of (data && data.edlOut) || []) o[x.room] = x.date;
  try { Object.assign(o, JSON.parse(localStorage.getItem(edlKey()) || '{}')); } catch { /* stockage indisponible */ }
  return o;
}
async function edlBytes(docId) {
  if (!edlUrls.has(docId)) {
    const r = await fetch(`${API}/api/esp/${id}/f/${docId}`, { cache: 'no-store' });
    if (!r.ok) throw new Error(r.status);
    edlUrls.set(docId, URL.createObjectURL(new Blob([await openBytes(key, await r.arrayBuffer())], { type: 'image/jpeg' })));
  }
  return edlUrls.get(docId);
}
function hydrateEdl() {
  document.querySelectorAll('img[data-edl-img]').forEach((img) => { edlBytes(img.dataset.edlImg).then((u) => { img.src = u; }).catch(() => {}); });
}
// Notifications : abonnement de ce téléphone (avec la langue et, pour les locataires, le fil de la maison)
let pushSt = '', pushJust = false;
const pushPost = (b) => fetch(`${API}/api/esp/${id}/push`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...b, app: 'esp', lang, boards: data.chat ? [data.chat.id] : [] }) }).then((r) => { if (!r.ok) throw new Error(r.status); });
async function pushInit() {
  pushSt = await pushStatus('/espace');
  if (pushSt === 'on') pushRefresh('/espace', pushPost);
  setBadge(0, '/espace');
  render();
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && data) { setBadge(0, '/espace'); if (data.chat) chatSeen(); } });
function notifCard(t) {
  if (!pushSt || pushSt === 'unsupported' || (pushSt === 'on' && !pushJust)) return '';
  const n = t.nt;
  return `<div class="card notif"><h2>${esc(n.t)}</h2><p class="meta" style="margin:0 0 8px">${esc(n.hint)}</p>${pushSt === 'on' ? `<p class="ok" style="margin:0"><b>${esc(n.ok)}</b></p>` : pushSt === 'install' ? `<p class="meta" style="margin:0">📱 ${esc(n.install)}</p>` : pushSt === 'denied' ? `<p class="meta" style="margin:0">⚠️ ${esc(n.denied)}</p>` : `<button class="btn block" data-push-on="1">${esc(n.on)}</button>`}</div>`;
}
const TICKER_BASE = API;
// la barra crypto (servie par le Worker) annonce sa hauteur réelle : le cadre s'adapte (PC, téléphone)
addEventListener('message', (e) => {
  if (e.origin !== new URL(TICKER_BASE).origin || !e.data || typeof e.data.tickerH !== 'number') return;
  const h = Math.max(30, Math.min(160, Math.round(e.data.tickerH)));
  document.querySelectorAll('.ticker').forEach((t) => { t.style.height = h + 'px'; });
});
function render() {
  const t = T();
  document.documentElement.lang = lang;
  const langs = `<div class="langs">${['fr', 'de', 'en', 'it', 'pt', 'es'].map((k) => `<button data-lang="${k}" aria-pressed="${k === lang}">${k.toUpperCase()}</button>`).join('')}</div>`;
  if (!data) {
    app.innerHTML = `<div class="top"><span class="brandx"><img class="top-logo" src="/ares/icons/nobis-logo.png" alt="NOBIS s.a.r.l." width="76" height="32"><b>NOBIS s.a.r.l.</b></span>${langs}</div>
      <h1 style="text-align:center;margin-top:18px">${esc(t.app)}</h1><p class="sub" style="text-align:center">${esc(t.welcome)}</p>
      ${loadErr ? `<div class="card avis"><p style="margin:0">${esc(loadErr)}</p></div>` : ''}
      ${installCard(t)}
      <div class="card"><form id="codeForm"><label>${esc(t.code)}</label>
        <input type="text" name="code" autocomplete="one-time-code" autocapitalize="characters" spellcheck="false" placeholder="${esc(t.codePh)}" style="font-size:22px;letter-spacing:.08em;text-align:center" required>
        <button class="btn block" style="margin-top:12px" type="submit">${esc(t.enter)}</button></form>
        <p class="meta" style="text-align:center;margin:10px 0 0">${esc(t.noCode)}</p></div>`;
    return;
  }
  const d = data, s = d.show || {};
  document.title = `${t.title} — ${d.societe.nom}`;
  if (d.regles && !rulesDate(d)) {
    const changed = d.regles.lu && d.regles.lv !== d.regles.v;
    app.innerHTML = `<div class="top"><span class="brandx"><img class="top-logo" src="${esc(d.societe.logo || '/ares/icons/nobis-logo.png')}" alt="" width="76" height="32"><b>${esc(d.societe.nom)}</b></span>${langs}</div><h1>${esc(t.hello)} ${esc(d.prenom || d.nom)}</h1>
      <div class="card" id="rules"><h2>📜 ${esc(t.hr.rulesT)}</h2><p class="${changed ? 'ok' : 'meta'}" style="margin:0 0 10px">${esc(changed ? t.hr.changed : t.hr.gate)}</p>
        <ol class="steps">${t.hr.R.map((r) => `<li>${esc(r)}</li>`).join('')}</ol>
        ${d.regles.extra ? `<p style="margin:8px 0 4px"><b>${esc(t.hr.rulesExtra)}</b></p><p class="pre" style="margin:0">${esc(d.regles.extra)}</p>` : ''}
        <details style="margin-top:12px"><summary>🔒 ${esc(t.rgpdT)}</summary><p>${esc(t.rgpd(d.societe))}</p><p>${esc(t.hr.rgpd2)}</p></details>
        <button class="btn block" style="margin-top:14px" data-rules-ok="1">${esc(t.hr.rulesAccept)}</button></div>
      <p class="meta" style="text-align:center"><a href="#" data-logout="1">${esc(t.logout)}</a></p>`;
    return;
  }
  const out = [];
  // adresse complète : rue + code postal et localité (si renseignés dans l'app de gestion)
  const addrFull = [d.adresse, d.ville].filter(Boolean).join(', ');
  out.push(`<div class="top"><span class="brandx"><img class="top-logo" src="${esc(d.societe.logo || '/ares/icons/nobis-logo.png')}" alt="" width="76" height="32"><b>${esc(d.societe.nom)}</b></span>${langs}</div><h1>${esc(t.hello)} ${esc(d.prenom || d.nom)}</h1><p class="sub"><span class="marq"><span>${esc([d.logement, addrFull].filter(Boolean).join(' · '))}</span></span></p>`);
  const pubs = s.pub ? (d.pubs || []).filter((x) => !x.fin || x.fin >= today) : [];
  const ad = pubs.find((x) => x.id === adSel);
  if (!ad) adSel = '';
  // trois emplacements payants : haut (à la place de la carte, à l'ouverture), milieu, bas (au-dessus de la barre crypto)
  const slot = (k) => pickPub(pubs.filter((x) => (x.slot || 'milieu') === k));
  const topAd = !ad && !homeMap ? slot('haut') : null;
  topPubId = (slot('haut') || {}).id || '';
  if (topAd) out.push(adBox(topAd, t, d, true));
  else if (ad) out.push(`<div class="card mapcard"><p style="margin:0 0 8px"><b>🗺️ ${esc(t.ad.mapT)} · ${esc((t.ad.cats[ad.cat] || t.ad.cats.autre).split(' ')[0])} ${esc(ad.nom)}</b><br><span class="meta">📍 ${esc(ad.adresse)}</span></p><div id="mapBox" class="map" data-q="${esc(mapQ(ad.adresse))}"></div>
    <div class="btn-row"><a class="btn" href="https://www.google.com/maps/dir/?api=1${d.adresse ? '&origin=' + encodeURIComponent(mapQ(addrFull)) : ''}&destination=${encodeURIComponent(mapQ(ad.adresse))}" target="_blank" rel="noopener">${esc(t.ad.route)}</a>${d.adresse ? `<button class="btn sec" data-home="1">${esc(t.ad.home)}</button>` : ''}${slot('haut') ? `<button class="btn sec" data-pubback="1">${esc(t.ad.back)}</button>` : ''}</div></div>`);
  else if (d.adresse) out.push(`<div class="card mapcard"><p style="margin:0 0 8px"><b>🗺️ ${esc(t.ad.mapT)}</b> · <span class="meta">🏠 ${esc(addrFull)}</span></p><div id="mapBox" class="map" data-q="${esc(mapQ(addrFull))}"></div><a class="btn sec block" style="margin-top:8px" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQ(addrFull))}" target="_blank" rel="noopener">${esc(t.ed.map)}</a><p class="meta" style="margin:6px 0 0;text-align:center">${esc(t.ed.mapHint)}</p>${slot('haut') ? `<button class="btn sec block" style="margin-top:8px" data-pubback="1">${esc(t.ad.back)}</button>` : ''}</div>`);
  // Météo de la semaine + radio (carte pliable, ouverte par défaut)
  { const w = (AX[lang] || AX.fr).wx; out.push(foldCard(`<div class="card" id="wxCard"><h2>🌤️ ${esc(w.t)} · 📻 ${esc(w.r)}</h2><div id="wxBox">${wxHtml()}</div><div id="radioBox">${radioHtml()}</div></div>`, 'meteo', `<span id="wxSum">${wxSumHtml()}</span>`)); setTimeout(() => wxLoad(d), 0); }
  if (d.bins && d.chat) out.push(`<div id="binBox">${binHtml()}</div>`);
  if (s.coll && (d.coll || []).length) {
    const soon = [];
    for (const it of d.coll) for (const dd of it.dates || []) { const p = it.sortie === 'jour' ? dd : addDays(dd, -1); if (p === today || p === addDays(today, 1)) soon.push({ it, dd, p }); }
    const shown = soon.filter((x) => !(x.p === today && d.bins && d.chat && d.bins.ev.some((z) => z.p === today)));
    if (shown.length) {
      const cats = CATS[lang], c = shown.some((x) => x.p === today) ? 'red' : 'yellow';
      const what = (x) => ((x.it.cat === 'autre' || !cats[x.it.cat]) && x.it.names && x.it.names[x.dd]) || cats[x.it.cat] || x.it.cat;
      out.push(`<div class="card avis bin-soon bin-${c}"><b><span class="light l-${c} blink"></span> 🗑️ ${shown.sort((a, b) => a.p.localeCompare(b.p)).map((x) => `${esc(x.p === today ? t.cr.today : t.cr.tomorrow)} — ${esc(t.putOut)} <span class="bin" style="--c:${BIN_COLORS[x.it.cat] || '#9a958a'}">${esc(what(x))}</span>`).join(' · ')}</b></div>`);
    }
  }
  // Maintenance : avec les nouvelles données (femme de ménage + ouvriers), alerte en haut pour aujourd'hui / demain
  // et la carte « Maintenance » au-dessus des collectes ; sinon (ancienne app de gestion) l'ancien encadré du ménage
  const vis = s.menage ? visitsOf(d) : null;
  let mtCard = '', mtLight = '';
  if (vis) {
    // pastille dans le titre « Maintenance » : verte = passage aujourd'hui, jaune = demain, rouge = ne passe pas
    const soon = vis.filter((v) => v.d <= addDays(today, 1));
    mtLight = !soon.length ? '' : soon.some((v) => v.off) ? 'red' : soon.some((v) => v.d === today) ? 'green' : 'yellow';
    const menToday = vis.find((v) => v.m === 'menage' && v.d === today && !v.off);
    const mv = menVote();
    mtCard = `${vis.length ? vis.map((v) => visLine(v, t)).join('') : `<p class="meta" style="margin:0">${esc(t.mt.none)}</p>`}
      ${menToday ? `<div class="men-rate"><p style="margin:0 0 6px"><b>🧹 ${esc(t.mt.rate)}</b> — <span class="meta">${esc(t.men.q)}</span></p><div class="men-opts" role="radiogroup" aria-label="${esc(t.men.crit)}">${t.men.opts.map((o, i) => `<button role="radio" aria-checked="${mv === i + 1}" data-men="${i + 1}" data-w="${esc(menToday.w)}">${esc(o)}</button>`).join('')}</div>
      ${mv ? `<p class="ok" style="margin:8px 0 0"><b>✓ ${esc(t.men.thanks)}</b></p>${menNoteSent() ? `<p class="ok" style="margin:4px 0 0">${esc(t.mc.ok)}</p>` : `<details class="more"${menTags.size || menNote ? ' open' : ''}><summary>${esc(t.mc.add)}</summary>
        <div class="men-tags">${Object.entries(t.mc.tags).map(([k, v]) => `<button type="button" aria-pressed="${menTags.has(k)}" data-mtag="${k}">${esc(v)}</button>`).join('')}</div>
        <textarea id="menNote" maxlength="500" placeholder="${esc(t.mc.ph)}">${esc(menNote)}</textarea>
        <button class="btn block" style="margin-top:8px" data-men-send="${esc(menToday.w)}">${esc(t.mc.send)}</button></details>`}` : ''}</div>` : ''}`;
  }
  const mt = s.menage && !vis ? menState(d) : null;
  if (mt && mt.c !== 'green') out.push(`<div class="card avis men men-${mt.c}"><h2><span class="light l-${mt.c} blink"></span> 🧹 ${esc(mt.c === 'red' ? (mt.when === 'today' ? t.men.noToday : t.men.noTomorrow) : t.men.tomorrow)}${mt.nom && mt.c !== 'red' ? ' (' + esc(mt.nom) + ')' : ''}</h2>${mt.c === 'red' ? `<p class="meta" style="margin:0">${esc(t.men.noWhy)}</p>` : mt.de ? `<p style="margin:0"><b>${esc(t.men.at)} ${esc(mt.de)}</b>${mt.a ? ` – ${esc(mt.a)}` : ''}</p>` : ''}</div>`);
  if (mt && mt.c === 'green') {
    const mv = menVote();
    out.push(`<div class="card avis men"><h2><span class="light l-green blink"></span> 🧹 ${esc(t.men.today)}${mt.nom ? ' (' + esc(mt.nom) + ')' : ''}</h2>${mt.de ? `<p style="margin:0 0 8px"><b>${esc(t.men.at)} ${esc(mt.de)}</b>${mt.a ? ` – ${esc(mt.a)}` : ''}</p>` : ''}
      <p class="meta" style="margin:0 0 6px">${esc(t.men.q)}</p><div class="men-opts" role="radiogroup" aria-label="${esc(t.men.crit)}">${t.men.opts.map((o, i) => `<button role="radio" aria-checked="${mv === i + 1}" data-men="${i + 1}" data-w="${esc(mt.w)}">${esc(o)}</button>`).join('')}</div>
      ${mv ? `<p class="ok" style="margin:8px 0 0"><b>✓ ${esc(t.men.thanks)}</b></p>` : ''}</div>`);
  }
  if (s.avis && (d.avis || []).length) out.push(`<div class="card avis"><h2>📢 ${esc(t.avis)}</h2>${d.avis.map((a) => `<p style="margin:6px 0;white-space:pre-wrap">${esc(a.texte)}${a.debut || a.fin ? `<br><span class="meta">${esc([fmt(a.debut), fmt(a.fin)].filter(Boolean).join(' → '))}</span>` : ''}</p>`).join('')}</div>`);
  // Clé digitale (code de la porte) : dans « Mes loyers », entre les loyers et le contrat ; contour vert qui « respire » tant qu'elle est active
  const door = s.porte && d.porte && (!d.porte.fin || d.porte.fin >= today) ? (() => {
    const p = d.porte, n = p.fin ? Math.round((new Date(p.fin + 'T12:00:00') - new Date(today + 'T12:00:00')) / 864e5) : null;
    return `<div class="door-sec"><h3>${esc(t.dk.t)}${d.logement ? ' · ' + esc(d.logement) : ''}</h3><div class="door-code">${esc(p.code)}</div>
      <p class="meta" style="margin:4px 0 0"><span class="light l-green blink"></span> <b>${esc(t.dk.on)}</b>${p.depuis ? ' · ' + esc(t.since) + ' ' + esc(fmt(p.depuis)) : ''}</p>
      <p style="margin:4px 0 0">${p.fin ? `${esc(t.dk.until)} <b>${esc(fmt(p.fin))}</b> — <b class="${n <= 7 ? 'warn' : ''}">⏳ ${esc(t.dk.left(n))}</b>` : `<span class="meta">${esc(t.dk.noEnd)}</span>`}</p>
      ${p.info ? `<p class="meta" style="margin:6px 0 0">${esc(p.info)}</p>` : ''}</div>`;
  })() : '';
  let payAt = -1, payH = '', paySum = '';
  if (s.pay && (d.years || []).length) {
    const cur = d.years[0];
    const rest = d.years.reduce((n, y) => n + y.rest, 0);
    const cm = new Date().getMonth(), cy = new Date().getFullYear();
    // « Mes loyers » : une seule carte avec, en dessous, « Mon contrat » et « Mes quittances » (complétée plus bas)
    payAt = out.length;
    payH = `<div class="card"${rest > 0.009 ? ' data-due="1"' : ''}><h2>${rest > 0.009 ? '<span class="light l-red blink"></span> ' : ''}💶 ${esc(t.pay)}</h2>
      <p style="margin:0">${rest > 0.009 ? `<span class="big bad">${esc(money(rest))}</span> <span class="meta">${esc(t.restNow)}</span>` : `<span class="big ok">${esc(t.allPaid)}</span>`}${cur.upcoming > 0.009 ? ` <span class="meta">· ${esc(t.upcoming)} ${esc(money(cur.upcoming))}</span>` : ''}</p>
      ${d.years.map((y) => `<div class="meta" style="margin-top:10px;font-weight:700">${y.y}</div><div class="months">${y.months.map(([due, paid], i) => {
        const past = y.y < cy || (y.y === cy && i < cm), now = y.y === cy && i === cm;
        const cls = paid >= due - 0.009 && paid > 0 ? 'paid' : paid > 0 ? 'part' : !due ? 'off' : past ? 'late' : '';
        return `<div class="m ${cls}" ${now ? 'style="outline:2px solid var(--accent)"' : ''}>${esc(t.months[i])}<small>${paid > 0 && paid < due - 0.009 ? esc(Math.round(paid) + '€') : cls === 'paid' ? '✓' : cls === 'late' ? '!' : due ? '·' : '–'}</small></div>`;
      }).join('')}</div>`).join('')}
      ${d.iban || d.payx ? payHtml() : ''}`;
    paySum = rest > 0.009 ? `<span class="bad">${esc(money(rest))}</span> ${esc(t.restNow)}` : `<span class="ok">${esc(t.allPaid)}</span>`;
    if (door) paySum += ' · 🔑';
    out.push(foldCard(payH + door + '</div>', 'pay', paySum));
  }
  // Quittances : une section de la carte « Mon contrat » (carte seule s'il n'y a pas de contrat)
  let quitIn = '', quitSum = '';
  if (s.quit && (d.years || []).length) {
    const rows = [];
    for (const y of d.years) y.months.forEach(([due, paid, date], i) => { if (paid > 0) rows.push({ y: y.y, m: i, due, paid, date }); });
    rows.sort((a, b) => b.y - a.y || b.m - a.m);
    if (rows.length) {
      const tot = rows.reduce((x, r) => x + r.paid, 0), first = rows[rows.length - 1], last = rows[0];
      quitIn = `<div class="row"><div class="grow"><b>${esc(t.rc.paidN(rows.length))}</b><div class="meta">${esc(t.monthsFull[first.m])} ${first.y} → ${esc(t.monthsFull[last.m])} ${last.y}</div></div><b>${esc(money(tot))}</b></div>
        <button class="btn block" style="margin-top:10px" data-recap="1">${esc(t.rc.btn)}</button>`;
      quitSum = t.rc.paidN(rows.length) + ' · ' + money(tot);
      if (!(s.contrat && d.contrat)) {
        if (payAt >= 0) out[payAt] = foldCard(`${payH}${door}<div class="ctr-quit"><h3>🧾 ${esc(t.quit)}</h3>${quitIn}</div></div>`, 'pay', paySum);
        else out.push(foldCard(`<div class="card"><h2>🧾 ${esc(t.quit)}</h2>${quitIn}</div>`, 'quit', esc(quitSum)));
      }
    }
  }
  if (payAt < 0 && door) out.push(`<div class="card">${door}</div>`);
  if (s.contrat && d.contrat) {
    const c = d.contrat;
    const ax = AX[lang] || AX.fr;
    const ctr = `${[[t.entry, fmt(c.debut)], [t.end, c.fin ? fmt(c.fin) : '—'], [t.rent, money(d.loyer)], [ax.house, d.maison ? ax.maison[d.maison] || '' : ''], [ax.surf, d.surface ? d.surface + ' m²' : ''], [ax.inc, axList(d, ax).join(' · ')], [t.revision, c.revision ? fmt(c.revision) : ''], [t.caution, c.caution ? [money(c.caution), c.cautionDate ? t.recv + ' ' + fmt(c.cautionDate) : '', t.modes[c.cautionMode] || ''].filter(Boolean).join(' · ') + (proofOf('caution') ? ' ✓' : '') : '']].filter(([, v]) => v).map(([k, v]) => `<div class="row"><div class="grow meta">${esc(k)}</div><b>${esc(v)}</b></div>`).join('')}${(d.docs || []).filter((x) => x.dtype === 'bail').map((x) => `<button class="btn block" style="margin-top:10px" data-docdl="${esc(x.id)}">${esc(t.men.dl)}${x.date ? ' · ' + esc(fmt(x.date)) : ''}</button>`).join('')}`;
    const qs = quitIn ? `<div class="ctr-quit"><h3>🧾 ${esc(t.quit)}</h3>${quitIn}</div>` : '';
    const csum = t.rent + ' ' + money(d.loyer) + (c.fin ? ' · ' + t.end + ' ' + fmt(c.fin) : '') + (quitSum ? ' · 🧾 ' + quitSum : '');
    if (payAt >= 0) out[payAt] = foldCard(`${payH}${door}<div class="ctr-quit"><h3>📄 ${esc(t.contrat)}</h3>${ctr}</div>${qs}</div>`, 'pay', paySum);
    else out.push(foldCard(`<div class="card"><h2>📄 ${esc(t.contrat)}</h2>${ctr}${qs}</div>`, 'contrat', esc(csum)));
  }
  { const mid = slot('milieu'); if (mid) out.push(adBox(mid, t, d)); }
  if (s.docs && (d.docs || []).length) out.push(foldCard(`<div class="card"><h2>📁 ${esc(t.docs)}</h2><p class="meta" style="margin:0 0 8px">${esc(t.dossierHint)}</p><div class="chips">${['bail', 'identite', 'cns', 'caution'].map((k) => { const x = proofOf(k); return x ? `<button class="chip ok" data-doc="${esc(x.id)}">✓ ${esc(t.dt[k])} 👁</button>` : `<button class="chip no"${s.signal && d.signalKey ? ' data-err="1"' : ''}>✗ ${esc(t.dt[k])}</button>`; }).join('')}</div>${d.docs.map((x) => `<div class="row"><div class="grow"><b>${esc(t.dt[x.dtype] || x.label)}</b><div class="meta">${esc(docSub(x))}</div></div><button class="btn sm sec" data-doc="${esc(x.id)}" aria-label="👁">👁</button></div>`).join('')}
    ${s.signal && d.signalKey ? `<button class="btn sec block" style="margin-top:10px" data-err="1">${esc(t.errBtn)}</button>` : ''}</div>`, 'docs', esc(['bail', 'identite', 'cns', 'caution'].map((k) => (proofOf(k) ? '✓ ' : '✗ ') + t.dt[k].split(' (')[0]).join(' · '))));
  if (d.chat) {
    const can = !d.regles || rulesDate(d);
    const solo = d.chat.solo, ax = AX[lang] || AX.fr;
    out.push(foldCard(`<div class="card" id="chatCard"><h2>${solo ? '✉️' : '💬'} ${esc(solo ? ax.solo : t.hr.board)}</h2><p class="meta" style="margin:0 0 8px">${esc(solo ? ax.soloHint : t.hr.boardHint)}</p>
      <div class="chat" id="chat">${chatHtml()}</div>
      ${can ? `<form id="chatf" class="chat-form"><textarea name="x" required maxlength="1500" placeholder="${esc(t.hr.boardPh)}"></textarea><button class="btn" type="submit">➤</button></form>`
        : `<p class="meta"><a href="#rules" data-goto-rules="1">${esc(t.hr.boardFirst)}</a></p>`}
      <button class="btn sm sec" style="margin-top:8px" data-chat-refresh="1">${esc(t.hr.refresh)}</button></div>`, 'chat', '<span id="chatNew"></span>'));
  }
  if (s.tools) {
    const tl = t.tl;
    out.push(foldCard(`<div class="card" id="toolsCard"><h2>🧰 ${esc(tl.title)}</h2><p class="meta" style="margin:0 0 8px">${esc(tl.hint)}</p>
      <a class="btn sec block" href="/outils.html" target="_blank" rel="noopener">${esc(tl.see)}</a>
      ${toolMsg ? `<p class="ok" style="margin:10px 0 0"><b>${esc(toolMsg)}</b></p>` : ''}
      <div id="myTools">${toolsHtml()}</div>
      <details class="more"><summary>${esc(tl.add)}</summary><form id="toolf">
        <label>${esc(tl.photos)}</label><input type="file" name="photos" accept="image/*" multiple required>
        <label>${esc(tl.t)}</label><input name="title" required maxlength="80">
        <label>${esc(tl.kind)}</label><select name="kind">${Object.entries(tl.kinds).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}</select>
        <div id="toolPrice" hidden><label>${esc(tl.price)}</label><input name="price" type="number" inputmode="decimal" min="0" step="0.5">
          <label>${esc(tl.unit)}</label><select name="unit">${Object.entries(tl.units).map(([k, v]) => `<option value="${k}"${k === 'j' ? ' selected' : ''}>${esc(v)}</option>`).join('')}</select></div>
        <label>${esc(tl.desc)}</label><textarea name="desc" maxlength="800"></textarea>
        <label>${esc(tl.rules)}</label><textarea name="rules" maxlength="400"></textarea>
        <label>${esc(tl.lieu)}</label><input name="lieu" maxlength="60">
        <label>${esc(tl.mail)}</label><input name="mail" type="email" required maxlength="120" value="${esc(d.mail || '')}">
        <label class="chk"><input type="checkbox" name="ok" required> <span>${esc(tl.ok)} <a href="/outils.html#regles" target="_blank" rel="noopener">${esc(tl.rulesLink)}</a></span></label>
        <button class="btn block" type="submit" style="margin-top:12px">${esc(tl.send)}</button></form></details></div>`, 'tools', myTools && myTools.length ? esc(tl.mine + ' : ' + myTools.length) : ''));
  }
  // la carte « Maintenance » est complétée plus bas (signaler un problème + légende), à cette place
  const mtAt = out.length;
  out.push('');
  let collHtml = '';
  if (s.coll && (d.coll || []).length) {
    const ev = [];
    for (const it of d.coll) for (const dd of it.dates || []) { const p = it.sortie === 'jour' ? dd : addDays(dd, -1); if (p >= today) ev.push({ it, dd, p }); }
    ev.sort((a, b) => a.p.localeCompare(b.p));
    const cats = CATS[lang];
    // Type de déchets : nom traduit, ou nom exact du calendrier de la commune si le type n'est pas reconnu
    const what = (x) => ((x.it.cat === 'autre' || !cats[x.it.cat]) && x.it.names && x.it.names[x.dd]) || cats[x.it.cat] || x.it.cat;
    const row = (x) => `<div class="row"><span class="light l-${lightOf(x.p)}" style="margin-top:6px"></span><div class="grow"><b>${esc(day(x.p))} — ${esc(t.putOut)} <span class="bin" style="--c:${BIN_COLORS[x.it.cat] || '#9a958a'}">${esc(what(x))}</span></b><div class="meta">${esc(t.truck)} ${esc(day(x.dd))}${x.it.heure ? ' · ' + esc(hourTxt(x.it)) : ''}${turnOf(x.p)}</div></div></div>`;
    const turnOf = (pd) => { const e = d.bins && d.chat && d.bins.ev.find((z) => z.p === pd); if (!e) return ''; const w = binState(e).who; return ` · 👤 <b>${esc(w === d.chat.mid ? t.bn.me : binName(w))}</b>`; };
    // une seule collecte visible ; à l'ouverture de la suite : d'abord les règles de l'immeuble, puis le reste de l'année
    const rest = ev.slice(1, 400), cr = t.cr;
    const hourTxt = (it) => { const m = String(it.heure || '').match(/(\d{1,2})/); return m ? (/avant|vor|antes|before|prima/i.test(it.heure) ? cr.before : cr.after).replace('{h}', m[1]) : it.heure || ''; };
    const rules = `<div class="coll-rules"><b>📋 ${esc(cr.t)}</b>${d.coll.map((it) => `<div class="row"><span class="bin" style="--c:${BIN_COLORS[it.cat] || '#9a958a'}">${esc(cats[it.cat] || it.cat)}</span><div class="grow meta">${esc([it.sortie === 'jour' ? cr.day : cr.eve, hourTxt(it)].filter(Boolean).join(', '))}${cr.lieux[it.lieu] ? ' · ' + esc(cr.lieux[it.lieu]) : ''}${it.note ? ' · ' + esc(it.note) : ''}</div></div>`).join('')}</div>`;
    collHtml = (`<div class="mt-sec mt-coll"><h2>🗑️ ${esc(t.coll)}</h2>${d.bins && d.chat ? `<div id="binBoardBox">${binBoard(binPlanNow())}</div>` : ''}${ev.slice(0, 1).map(row).join('')}${rest.length ? `<details class="more"><summary>${esc(t.more(rest.length))}</summary>${rules}${rest.map(row).join('')}</details>` : rules}</div>`);
  }
  if (s.edl && ((d.edl || []).length || d.signalKey)) {
    const ed = t.ed, sentL = edlSent(), done = Object.keys(sentL).length;
    out.push(foldCard(`<div class="card" id="edlCard"><h2>📷 ${esc(ed.t)}</h2><p class="meta" style="margin:0 0 8px">${esc(ed.hint)}</p>
      <div class="edl-grid">${EDL_ROOMS.map((r) => { const ph = (d.edl || []).find((x) => x.room === r); return `<figure class="edl">${ph ? `<button class="edl-img" data-edl-view="${esc(ph.id)}"><img alt="" data-edl-img="${esc(ph.id)}"></button>` : `<div class="edl-img none">${esc(ed.none)}</div>`}<figcaption>${esc(ed.rooms[r])}${ph ? ` · <span class="meta">${esc(fmt(ph.date))}</span>` : ''}</figcaption></figure>`; }).join('')}</div>
      ${d.signalKey ? `<details class="more" style="margin-top:12px"${Object.keys(edlPick).length || edlMsg ? ' open' : ''}><summary><b>${esc(ed.out)}</b></summary><p class="meta" style="margin:8px 0">${esc(ed.outHint)}</p>${edlMsg ? `<p class="ok" style="margin:0 0 8px"><b>${esc(edlMsg)}</b></p>` : ''}
        <div class="edl-grid">${EDL_ROOMS.map((r) => `<figure class="edl">${edlPick[r] ? `<div class="edl-img"><img alt="" src="${edlPick[r].url}"></div>` : `<div class="edl-img none">${sentL[r] ? esc(ed.sent + ' ' + fmt(sentL[r])) : '—'}</div>`}<figcaption>${esc(ed.rooms[r])}</figcaption>
          <div class="edl-btns"><label class="btn sm">${esc(ed.cam)}<input type="file" accept="image/*" capture="environment" hidden data-edl-pick="${r}"></label><label class="btn sm sec">${esc(ed.gal)}<input type="file" accept="image/*" hidden data-edl-pick="${r}"></label></div></figure>`).join('')}</div>
        <button class="btn block" style="margin-top:12px" data-edl-send="1"${Object.keys(edlPick).length ? '' : ' disabled'}>${esc(ed.send)} (${Object.keys(edlPick).length})</button></details>` : ''}</div>`, 'edl', esc(`${(d.edl || []).length} / 6${done ? ' · 🚪 ' + done + ' / 6' : ''}`)));
  }
  let sigHtml = '';
  if (s.signal && d.signalKey) {
    const sum = (d.signals || []).length ? ` <span class="sum">${esc(t.mine + ' : ' + d.signals.length)}</span>` : '';
    sigHtml = `<details class="more mt-sec" data-fold="signal"${openFolds.has('signal') || sentOk ? ' open' : ''}><summary><b>🛠️ ${esc(t.signal)}</b>${sum}</summary>${sentOk ? `<p class="ok" style="margin:0 0 8px"><b>${esc(t.sent)}</b></p>` : ''}
      <form id="sig"><label>${esc(t.type)}</label><select name="type">${Object.entries(t.types).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}</select>
      <label>${esc(t.what)}</label><textarea name="texte" required maxlength="3000" placeholder="${esc(t.whatPh)}"></textarea>
      <label>${esc(t.photos)}</label><input type="file" name="photos" accept="image/*" multiple>
      <label>${esc(t.tel)}</label><input type="tel" name="tel" maxlength="30">
      <label>${esc(t.dispo)}</label><input type="text" name="dispo" maxlength="200">
      <button class="btn block" style="margin-top:12px" type="submit">${esc(t.send)}</button></form>
      ${(d.signals || []).length ? `<h2 style="margin-top:16px">${esc(t.mine)}</h2>${d.signals.map((x) => `<div class="row"><span class="light l-${x.statut === 'fait' ? 'green' : x.statut === 'planifie' ? 'yellow' : 'red'}" style="margin-top:6px"></span><div class="grow"><b>${esc(x.titre)}</b><div class="meta">${esc(fmt(x.sent || x.date))} · ${esc(t.st[x.statut] || x.statut)}${x.done ? ' · ' + esc(fmt(x.done)) : ''}</div></div></div>`).join('')}` : ''}</details>`;
  }
  const legHtml = s.coll || s.signal ? `<p class="meta mt-leg"><b>${esc(t.legend)}</b> — <span class="light l-green"></span> ${esc(t.lights[0])} · <span class="light l-yellow"></span> ${esc(t.lights[1])} · <span class="light l-red"></span> ${esc(t.lights[2])}${vis ? ` · <span class="light l-grey"></span> ${esc(t.mt.offL)}` : ''}${s.signal ? `<br>🔧 ${esc(t.types.rep.slice(3))} · 🧹 ${esc(t.types.menage.slice(3))} · 🗑️ ${esc(t.coll)}` : ''}</p>` : '';
  if (mtCard || collHtml || sigHtml || legHtml) out[mtAt] = foldCard(`<div class="card" id="mtCard"><h2>${mtLight ? `<span class="light l-${mtLight} blink"></span> ` : ''}🛠️ ${esc(t.mt.t)}</h2>${mtCard}${collHtml}${sigHtml}${legHtml}</div>`, 'mt', '');
  if (d.regles) {
    const lu = rulesDate(d);
    out.push(`<div class="card" id="rules"><details${lu ? '' : ' open'}><summary><h2 style="display:inline">📜 ${esc(t.hr.rulesT)}</h2>${lu ? ` <span class="meta">✓ ${esc(fmt(lu))}</span>` : ''}</summary>
      <ol class="steps" style="margin-top:10px">${t.hr.R.map((r) => `<li>${esc(r)}</li>`).join('')}</ol>
      ${d.regles.extra ? `<p style="margin:8px 0 4px"><b>${esc(t.hr.rulesExtra)}</b></p><p class="pre" style="margin:0">${esc(d.regles.extra)}</p>` : ''}
      ${lu ? `<p class="ok" style="margin:10px 0 0">✓ ${esc(t.hr.rulesOk)} ${esc(fmt(lu))}</p>` : `<button class="btn block" style="margin-top:12px" data-rules-ok="1">${esc(t.hr.rulesAccept)}</button>`}</details></div>`);
  }
  out.push(notifCard(t));
  out.push(installCard(t));
  out.push(`<div class="card notice"><details><summary>🔒 ${esc(t.rgpdT)}</summary><p>${esc(t.rgpd(d.societe))}</p>${d.chat || d.regles ? `<p>${esc(t.hr.rgpd2)}</p>` : ''}</details><p style="margin:8px 0 0"><a href="#" data-logout="1">${esc(t.logout)}</a> · ${esc(t.personal)}${d.societe.tel ? ` · ${esc(d.societe.nom)} <a href="tel:${esc(d.societe.tel.replace(/[^\d+]/g, ''))}">${esc(d.societe.tel)}</a>` : ''}</p></div>`);
  { const low = slot('bas'); if (low) out.push(adBox(low, t, d)); }
  // version de l'app de gestion qui a publié ces données (aide au dépannage)
  out.push(`<p class="meta" style="text-align:center;font-size:11px;margin:8px 0 0">NOBIS · ${esc(d.gv ? 'v' + d.gv : 'v < 2.57')}</p>`);
  out.push(TICKER);
  const keepMap = document.querySelector('#mapBox iframe');
  const keepVid = new Map([...document.querySelectorAll('.vid iframe, .ticker iframe')].map((f) => [f.dataset.src, f]));
  app.innerHTML = out.join('');
  // adresse trop longue pour l'écran : elle défile doucement (aller-retour)
  for (const m of app.querySelectorAll('.marq')) {
    const dx = m.firstElementChild.scrollWidth - m.clientWidth;
    if (dx > 4) { m.style.setProperty('--dx', -dx + 'px'); m.style.setProperty('--dur', Math.max(6, dx / 25 + 4) + 's'); m.classList.add('run'); }
  }
  // lecteurs vidéo des annonces : gardés d'un affichage à l'autre (la vidéo ne recommence pas)
  document.querySelectorAll('.vid[data-vsrc], .ticker[data-vsrc]').forEach((v) => {
    const src = v.dataset.vsrc, old = keepVid.get(src);
    if (old) return v.append(old);
    const f = document.createElement('iframe');
    f.src = src; f.dataset.src = src; f.loading = 'lazy'; f.title = 'Video';
    f.allow = 'encrypted-media; picture-in-picture; fullscreen'; f.allowFullscreen = true; f.referrerPolicy = 'strict-origin-when-cross-origin';
    v.append(f);
  });
  const mb = document.getElementById('mapBox');
  if (mb) {
    const src = `https://maps.google.com/maps?q=${encodeURIComponent(mb.dataset.q)}&hl=${lang}&z=16&output=embed`;
    if (keepMap && keepMap.dataset.src === src) mb.append(keepMap);
    else { const f = document.createElement('iframe'); f.src = src; f.dataset.src = src; f.title = 'Google Maps'; f.loading = 'lazy'; f.referrerPolicy = 'no-referrer-when-downgrade'; mb.append(f); }
  }
  hydrateEdl();
  pubSeen(app);
  if (s.tools && myTools == null) toolsFetch();
  if (d.chat) { const box = document.getElementById('chat'); if (box) box.scrollTop = box.scrollHeight; if (!chatTimer) chatStart(); chatSeen(); }
}

// Récapitulatif imprimable de tous les loyers payés (un seul document au lieu d'une quittance par mois)
function recap() {
  const t = T(), d = data, s = d.societe, name = [d.prenom, d.nom].filter(Boolean).join(' ');
  const rows = [];
  for (const y of d.years) y.months.forEach(([due, paid, date], i) => { if (paid > 0) rows.push({ y: y.y, m: i, due, paid, date }); });
  rows.sort((a, b) => a.y - b.y || a.m - b.m);
  if (!rows.length) return;
  const tot = rows.reduce((x, r) => x + r.paid, 0);
  const per = (r) => `${t.monthsFull[r.m]} ${r.y}`;
  const q = document.getElementById('quit');
  q.innerHTML = `<div style="max-width:700px;margin:0 auto">
    <div style="display:flex;justify-content:space-between;gap:20px;margin-bottom:24px"><div><b>${esc(t.landlord)}</b><br>${esc(s.nom)}<br>${esc(s.adresse)}<br>${esc(s.ville)}<br>${esc(s.tel)}</div>
    <div style="text-align:right"><b>${esc(t.tenant)}</b><br>${esc(name)}<br>${esc(d.logement)}<br>${esc(d.adresse)}</div></div>
    <h1 style="text-align:center">${esc(t.rc.title)}</h1><p style="text-align:center">${esc(per(rows[0]))} → ${esc(per(rows[rows.length - 1]))}</p>
    <table style="width:100%;border-collapse:collapse;margin:18px 0;font-size:13px"><thead><tr>${t.rc.cols.map((c, i) => `<th style="text-align:${i ? 'right' : 'left'};border-bottom:2px solid #333;padding:5px">${esc(c)}</th>`).join('')}</tr></thead><tbody>
    ${rows.map((r) => `<tr><td style="padding:5px;border-bottom:1px solid #ddd">${esc(per(r))}${r.paid < r.due - 0.009 ? ` <i>(${esc(t.rc.partial)})</i>` : ''}</td><td style="text-align:right;padding:5px;border-bottom:1px solid #ddd">${esc(money(r.due))}</td><td style="text-align:right;padding:5px;border-bottom:1px solid #ddd">${esc(money(r.paid))}</td><td style="text-align:right;padding:5px;border-bottom:1px solid #ddd">${esc(r.date ? fmt(r.date) : '—')}</td></tr>`).join('')}
    <tr><td style="padding:6px"><b>${esc(t.rc.total)}</b></td><td></td><td style="text-align:right;padding:6px"><b>${esc(money(tot))}</b></td><td></td></tr></tbody></table>
    <div class="rc-end"><p style="margin-top:18px">${esc(t.rc.text(s.nom, name, money(tot), per(rows[0]), per(rows[rows.length - 1])))}</p>
    <p style="margin-top:24px">${esc(fmt(today))}</p>${s.sign ? `<img src="${esc(s.sign)}" alt="" style="display:block;width:${[6, 8, 10, 12].includes(+s.signW) ? +s.signW : 8}cm;max-width:100%;height:auto;margin:4mm 0 2mm">` : ''}<p><i>${esc(s.nom)}</i></p></div></div>`;
  document.body.classList.add('printing');
  const done = () => { document.body.classList.remove('printing'); removeEventListener('afterprint', done); };
  addEventListener('afterprint', done);
  setTimeout(() => print(), 50);
}

async function compress(file) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 1400 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(bmp, 0, 0, c.width, c.height);
  const b = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.75));
  const u = new Uint8Array(await b.arrayBuffer());
  let s = ''; for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode(...u.subarray(i, i + 32768));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

pubStatInit(API, 'loc', () => lang);
app.addEventListener('click', pubTap, true);
app.addEventListener('click', async (e) => {
  if (e.target.closest('[data-chat-refresh]')) return chatFetch();
  if (e.target.closest('[data-radio-play]')) return radioToggle();
  if (e.target.closest('[data-radio-save]')) {
    const v = (document.getElementById('radioUrl') || {}).value || '';
    let u = v.trim(); if (u && !/^https?:\/\//i.test(u)) u = 'https://' + u;
    try { new URL(u); } catch { return; }
    try { localStorage.setItem('espRadio', JSON.stringify({ nom: radioHost(u), url: u })); } catch { /* stockage indisponible */ }
    if (radioEl) radioEl.pause();
    return radioPaint();
  }
  if (e.target.closest('[data-radio-reset]')) { try { localStorage.removeItem('espRadio'); } catch {} if (radioEl) radioEl.pause(); return radioPaint(); }
  const pon = e.target.closest('[data-push-on]');
  if (pon) {
    pon.disabled = true;
    try {
      if (await pushEnable({ api: API, swUrl: '/espace-sw.js', scope: '/espace', post: pushPost })) { pushSt = 'on'; pushJust = true; } else pushSt = await pushStatus('/espace');
    } catch { alert(T().nt.err); }
    return render();
  }

  const mtg = e.target.closest('[data-mtag]');
  if (mtg) {
    const k = mtg.dataset.mtag, opp = { ok: 'late', late: 'ok', nice: 'rude', rude: 'nice', clean: 'dirty', dirty: 'clean' };
    const nt = document.getElementById('menNote'); if (nt) menNote = nt.value;
    if (menTags.has(k)) menTags.delete(k); else { menTags.add(k); menTags.delete(opp[k]); }
    return render();
  }
  const ms = e.target.closest('[data-men-send]');
  if (ms) {
    const nt = document.getElementById('menNote'); if (nt) menNote = nt.value.trim().slice(0, 500);
    if (!menTags.size && !menNote) return;
    ms.disabled = true;
    try {
      const r = await fetch(`${API}/api/esp/${id}/signal`, { method: 'POST', body: await sealForOwner(data.signalKey, { espace: id, t: new Date().toISOString(), type: 'menage-eval', w: ms.dataset.menSend, d: today, v: menVote(), tags: [...menTags], note: menNote }) });
      if (!r.ok) throw new Error();
      let c = {}; try { c = JSON.parse(localStorage.getItem('espMenC:' + id) || '{}'); } catch { /* stockage indisponible */ }
      c[today] = true;
      for (const k of Object.keys(c).sort().slice(0, -30)) delete c[k];
      try { localStorage.setItem('espMenC:' + id, JSON.stringify(c)); } catch { /* stockage plein */ }
      menTags.clear(); menNote = '';
    } catch { alert('⚠'); }
    return render();
  }
  const mb = e.target.closest('[data-men]');
  if (mb) {
    const v = +mb.dataset.men;
    let m = {}; try { m = JSON.parse(localStorage.getItem(menKey()) || '{}'); } catch { /* stockage indisponible */ }
    m[today] = v;
    for (const k of Object.keys(m).sort().slice(0, -30)) delete m[k];
    try { localStorage.setItem(menKey(), JSON.stringify(m)); } catch { /* stockage plein */ }
    render();
    if (data.signalKey) { try { await fetch(`${API}/api/esp/${id}/signal`, { method: 'POST', body: await sealForOwner(data.signalKey, { espace: id, t: new Date().toISOString(), type: 'menage-eval', w: mb.dataset.w, d: today, v }) }); } catch { /* hors ligne */ } }
    return;
  }
  const dl = e.target.closest('[data-docdl]');
  if (dl) {
    const doc = data.docs.find((x) => x.id === dl.dataset.docdl);
    dl.disabled = true;
    try {
      const r = await fetch(`${API}/api/esp/${id}/f/${doc.id}`, { cache: 'no-store' });
      if (!r.ok) throw new Error(r.status);
      const u = URL.createObjectURL(new Blob([await openBytes(key, await r.arrayBuffer())], { type: doc.mime || 'application/pdf' }));
      const a = document.createElement('a');
      a.href = u; a.download = (doc.label || 'contrat').replace(/[\\/:*?"<>|]+/g, ' ') + (doc.mime === 'application/pdf' || !doc.mime ? '.pdf' : /^image\/jpe?g/.test(doc.mime) ? '.jpg' : '');
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(u), 30000);
    } catch { alert('⚠'); }
    dl.disabled = false;
    return;
  }
  const adb = e.target.closest('[data-ad]');
  if (adb) { adSel = adb.dataset.ad; homeMap = false; render(); scrollTo({ top: 0, behavior: 'smooth' }); return; }
  if (e.target.closest('[data-pubback]')) { adSel = ''; homeMap = false; if (topPubId) pubShut.delete(topPubId); try { localStorage.setItem('espPubShut', JSON.stringify([...pubShut])); } catch { /* stockage indisponible */ } render(); scrollTo({ top: 0, behavior: 'smooth' }); return; }
  if (e.target.closest('[data-home]')) { adSel = ''; homeMap = true; render(); scrollTo({ top: 0, behavior: 'smooth' }); return; }
  const ev = e.target.closest('[data-edl-view]');
  if (ev) {
    const ph = data.edl.find((x) => x.id === ev.dataset.edlView);
    try { preview({ label: T().ed.rooms[ph.room], mime: 'image/jpeg' }, await edlBytes(ph.id), true); } catch { alert('⚠'); }
    return;
  }
  const es = e.target.closest('[data-edl-send]');
  if (es) {
    const ed = T().ed, rooms = Object.keys(edlPick);
    if (!rooms.length) return alert(ed.pick);
    es.disabled = true; es.textContent = '…';
    try {
      const now = new Date().toISOString(), sentL = edlSent();
      for (let i = 0; i < rooms.length; i += 3) {
        const part = rooms.slice(i, i + 3);
        const body = await sealForOwner(data.signalKey, { espace: id, t: now, type: 'edl-out', photos: part.map((r) => ({ room: r, b: edlPick[r].b })) });
        const r = await fetch(`${API}/api/esp/${id}/signal`, { method: 'POST', body });
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.status);
        for (const rm of part) { sentL[rm] = now.slice(0, 10); URL.revokeObjectURL(edlPick[rm].url); delete edlPick[rm]; }
        try { localStorage.setItem(edlKey(), JSON.stringify(sentL)); } catch { /* stockage indisponible */ }
      }
      edlMsg = ed.ok;
    } catch (err) { alert('⚠ ' + (err.message || err)); }
    render();
    document.getElementById('edlCard')?.scrollIntoView({ block: 'start' });
    return;
  }
  const bn = e.target.closest('[data-bin]');
  if (bn) { bn.disabled = true; try { await binAct(bn.dataset.bin, bn.dataset.d); } catch { alert('⚠'); } return; }
  const ts = e.target.closest('[data-tool-seen]');
  if (ts) { try { localStorage.setItem('espToolSeen:' + ts.dataset.toolSeen, ts.dataset.n); } catch {} ts.classList.remove('new'); return; }
  const td = e.target.closest('[data-tool-del]');
  if (td) {
    if (!confirm(T().tl.delQ)) return;
    td.disabled = true;
    try { await fetch(`${API}/api/esp/${id}/tools/${td.dataset.toolDel}`, { method: 'DELETE' }); } catch { /* hors ligne */ }
    return toolsFetch();
  }
  if (e.target.closest('[data-goto-rules]')) { e.preventDefault(); const r = document.getElementById('rules'); if (r) { r.querySelector('details').open = true; r.scrollIntoView({ behavior: 'smooth' }); } return; }
  const ro = e.target.closest('[data-rules-ok]');
  if (ro) {
    ro.disabled = true;
    const now = new Date().toISOString();
    try { localStorage.setItem(rulesKey(), JSON.stringify({ v: data.regles.v, d: now.slice(0, 10) })); } catch {}
    if (data.signalKey) { try { await fetch(`${API}/api/esp/${id}/signal`, { method: 'POST', body: await sealForOwner(data.signalKey, { espace: id, t: now, type: 'regles', v: data.regles.v }) }); } catch { /* le gestionnaire le verra plus tard */ } }
    scrollTo(0, 0);
    render();
    return;
  }
  if (e.target.closest('[data-guide]')) { if (installEvt && !IS_IOS) { installEvt.prompt(); installEvt = null; return; } return renderGuide(); }
  const cl = e.target.closest('[data-copylink]');
  if (cl) { try { await navigator.clipboard.writeText(location.origin + '/espace.html'); cl.textContent = '✓'; } catch { prompt('', location.origin + '/espace.html'); } return; }
  if (e.target.closest('[data-pay]')) { payOpen = !payOpen; return render(); }
  const pvb = e.target.closest('[data-payvia]');
  if (pvb) { payVia = pvb.dataset.payvia; return render(); }
  const cp = e.target.closest('[data-copy]');
  if (cp) { try { await navigator.clipboard.writeText(cp.dataset.copy); cp.textContent = T().pv.copied; } catch { prompt('', cp.dataset.copy); } return; }
  const pdb = e.target.closest('[data-paydone]');
  if (pdb) {
    if (!confirm(T().pv.doneQ)) return;
    const now = new Date().toISOString(), { amt, ref } = payInfo();
    if (data.signalKey) { try { await fetch(`${API}/api/esp/${id}/signal`, { method: 'POST', body: await sealForOwner(data.signalKey, { espace: id, t: now, type: 'paye', montant: amt, ref, via: pdb.dataset.paydone }) }); } catch { /* hors ligne */ } }
    try { localStorage.setItem(paidKey(), now); } catch {}
    payOpen = false;
    return render();
  }
  if (e.target.closest('[data-logout]')) { e.preventDefault(); try { localStorage.removeItem(ACC); } catch {} id = key = ''; data = null; loadErr = ''; return render(); }
  const lb = e.target.closest('[data-lang]');
  if (lb) { lang = lb.dataset.lang; try { localStorage.setItem('espLang', lang); } catch {} if (pushSt === 'on') pushRefresh('/espace', pushPost); return render(); }
  if (e.target.closest('[data-recap]')) return recap();
  const db = e.target.closest('[data-doc]');
  if (db) {
    const doc = data.docs.find((x) => x.id === db.dataset.doc);
    db.disabled = true;
    try {
      const r = await fetch(`${API}/api/esp/${id}/f/${doc.id}`, { cache: 'no-store' });
      if (!r.ok) throw new Error(r.status);
      const bytes = await openBytes(key, await r.arrayBuffer());
      preview(doc, URL.createObjectURL(new Blob([bytes], { type: doc.mime || 'application/pdf' })));
    } catch { alert('⚠'); }
    db.disabled = false;
    return;
  }
  if (e.target.closest('[data-err]')) {
    const f = document.getElementById('sig');
    if (f) { const fd = f.closest('details'); if (fd) fd.open = true; f.type.value = 'dossier'; f.scrollIntoView({ behavior: 'smooth', block: 'start' }); f.texte.focus({ preventScroll: true }); }
  }
});
// on mémorise tout de suite au toucher (l'événement « toggle » arrive un peu après)
app.addEventListener('click', (e) => {
  const sm = e.target.closest('details.fold > summary');
  if (!sm) return;
  const d = sm.parentElement, k = d.dataset.fold;
  if (!k) return;
  foldSet(k, !d.open);
  if (k === 'chat' && !d.open) setTimeout(chatSeen, 50);
}, true);
app.addEventListener('toggle', (e) => {
  const pid = e.target.classList && e.target.classList.contains('pub-box') && e.target.dataset.pid;
  if (pid) {
    if (e.target.open) pubShut.delete(pid); else pubShut.add(pid);
    try { localStorage.setItem('espPubShut', JSON.stringify([...pubShut])); } catch { /* stockage indisponible */ }
    return;
  }
  const k = e.target.dataset && e.target.dataset.fold;
  if (!k) return;
  foldSet(k, e.target.open);
  if (k === 'chat' && e.target.open) { chatSeen(); const box = document.getElementById('chat'); if (box) box.scrollTop = box.scrollHeight; }
}, true);
app.addEventListener('change', async (e) => {
  if (e.target.dataset && e.target.dataset.wxCity) {
    try { if (e.target.value) localStorage.setItem('espWxCity', e.target.value); else localStorage.removeItem('espWxCity'); } catch { /* stockage indisponible */ }
    wx = null; wxPaint(); return wxLoad(data);
  }
  const pk = e.target.dataset && e.target.dataset.edlPick;
  if (pk && e.target.files.length) {
    const file = e.target.files[0];
    e.target.value = '';
    try {
      const b = await compress(file);
      if (edlPick[pk]) URL.revokeObjectURL(edlPick[pk].url);
      const bin = atob(b.replace(/-/g, '+').replace(/_/g, '/'));
      edlPick[pk] = { b, url: URL.createObjectURL(new Blob([Uint8Array.from(bin, (c) => c.charCodeAt(0))], { type: 'image/jpeg' })) };
      edlMsg = '';
      render();
    } catch { alert('⚠'); }
    return;
  }
  if (e.target.name === 'kind' && e.target.form && e.target.form.id === 'toolf') document.getElementById('toolPrice').hidden = e.target.value !== 'loc';
});
app.addEventListener('submit', async (e) => {
  if (e.target.id === 'toolf') {
    e.preventDefault();
    const f = e.target.elements, tl = T().tl;
    const files = [...f.photos.files].slice(0, 3);
    if (!files.length) return alert(tl.need);
    const btn = e.target.querySelector('button[type=submit]'); btn.disabled = true; btn.textContent = '…';
    try {
      const photos = [];
      for (const file of files) photos.push(await compress(file));
      const body = { kind: f.kind.value, title: f.title.value, price: f.price.value, unit: f.unit.value, desc: f.desc.value, rules: f.rules.value, lieu: f.lieu.value, mail: f.mail.value, name: data.prenom || data.nom || '', photos };
      const r = await fetch(`${API}/api/esp/${id}/tools`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.status);
      toolMsg = tl.sent;
      myTools = null;
      render();
      document.getElementById('toolsCard')?.scrollIntoView({ block: 'start' });
    } catch (err) {
      btn.disabled = false; btn.textContent = tl.send;
      alert('⚠ ' + (err.message || err));
    }
    return;
  }
  if (e.target.id === 'chatf') {
    e.preventDefault();
    const f = e.target, x = f.x.value.trim().slice(0, 1500);
    if (!x) return;
    const btn = f.querySelector('button'); btn.disabled = true;
    try {
      const r = await fetch(`${API}/api/board/${data.chat.id}`, { method: 'POST', headers: { 'X-Esp': id }, body: await sealJson(data.chat.key, { a: data.chat.me, m: data.chat.mid, x, t: new Date().toISOString() }) });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.status);
      f.x.value = '';
      await chatFetch();
      const box = document.getElementById('chat'); if (box) box.scrollTop = box.scrollHeight;
    } catch (err) { alert('⚠ ' + (err.message || err)); }
    btn.disabled = false;
    return;
  }
  if (e.target.id === 'codeForm') {
    e.preventDefault();
    const btn = e.target.querySelector('button'); btn.disabled = true; btn.textContent = '…';
    try {
      const code = e.target.code.value;
      const r = await fetch(`${API}/api/esp-code`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ h: await codeHash(code) }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(r.status === 404 ? T().badCode : j.error || r.status);
      id = j.id; key = await unwrapWithCode(code, j.salt, j.wk);
      try { localStorage.setItem(ACC, id + '.' + key); } catch {}
      loadErr = '';
      await load();
    } catch (err) { loadErr = err.message || String(err); render(); }
    return;
  }
  if (e.target.id !== 'sig') return;
  e.preventDefault();
  const f = e.target, btn = f.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = '…';
  try {
    const photos = [];
    for (const file of [...f.photos.files].slice(0, 3)) photos.push(await compress(file));
    const texte = f.texte.value.trim();
    const msg = { espace: id, t: new Date().toISOString(), type: f.type.value, titre: texte.split('\n')[0].slice(0, 80), texte, tel: f.tel.value.trim(), dispo: f.dispo.value.trim(), photos };
    const body = await sealForOwner(data.signalKey, msg);
    const r = await fetch(`${API}/api/esp/${id}/signal`, { method: 'POST', body });
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.status);
    sentOk = true;
    data.signals = [{ titre: msg.titre, sent: msg.t, statut: 'afaire' }, ...(data.signals || [])];
    render();
  } catch (err) {
    btn.disabled = false; btn.textContent = T().send;
    alert('⚠ ' + (err.message || err));
  }
});

let loadErr = '';
async function load() {
  data = null;
  if (id && key) {
    try {
      const r = await fetch(`${API}/api/esp/${id}`, { cache: 'no-store' });
      if (r.ok) data = await openJson(key, await r.arrayBuffer());
      // code de l'app de l'équipe tapé ici par erreur : on ouvre la bonne app
      if (data && data.kind === 'equipe') { try { localStorage.removeItem(ACC); } catch {} location.replace(`/equipe.html#${id}.${key}`); return; }
      else if (r.status === 404) { try { localStorage.removeItem(ACC); } catch {} id = key = ''; loadErr = T().off; }
    } catch { loadErr = '⚠ offline'; }
  }
  if (!localStorage.getItem('espLang')) lang = pick(data);
  render();
  if (data) pushInit();
}
lang = pick(null);
load();
