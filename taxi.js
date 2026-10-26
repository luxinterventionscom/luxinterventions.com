// 🚕 App des sociétés de taxi / chauffeurs privés du réseau : courses reçues (accepter avec un chauffeur et une voiture, ou refuser),
// chauffeurs, voitures (Luxe / Confort / Économique), tarifs (course, heure, demi-journée, journée) et extras.
// Données chiffrées ; la clé ne quitte pas le téléphone. Les réponses partent chiffrées pour l'établissement.
import '/ares/reqmark.js';
import { openJson, sealForOwner, codeHash, unwrapWithCode } from '/ares/espace-crypto.js';
import { pubStatInit, pubSeen, pubTap } from '/ares/pubstat.js';
import { pushStatus, pushEnable, pushRefresh, setBadge } from '/ares/push-client.js';
import { infoBox } from '/ares/nbien.js';
import { wxRadioCard, wxRadioInit } from '/ares/wxradio.js';
import { videoEmbed } from '/ares/video-embed.js';
const API = document.querySelector('meta[name="esp-api"]').content.replace(/\/$/, '');
const ACC = 'taxiAccess';
let [id, key] = (location.hash.slice(1).match(/^([0-9a-f]{32})\.([A-Za-z0-9_-]{40,})$/) || []).slice(1);
if (id) { try { localStorage.setItem(ACC, id + '.' + key); } catch {} history.replaceState(null, '', location.pathname); }
else { try { [id, key] = ((localStorage.getItem(ACC) || '').match(/^([0-9a-f]{32})\.([A-Za-z0-9_-]{40,})$/) || []).slice(1); } catch {} }
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('/taxi-sw.js', { scope: '/taxi' }).catch(() => {});
const app = document.getElementById('app');
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const ls = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* stockage plein */ } } };
const LANGS = ['fr', 'en', 'de', 'it', 'pt', 'es'];
const GK = ['luxe', 'confort', 'eco'], EK = ['garde', 'boissons', 'friandises', 'siege', 'pancarte', 'bagages'], SK = ['course', 'heures', 'demi', 'jour', 'sejour'];
const L = {
  fr: { app: 'Courses', welcome: 'Entrez le code reçu de l’établissement.', code: 'Code d’accès', enter: 'Entrer', bad: 'Code inconnu.', off: 'Accès désactivé.',
    rides: '🛣️ Courses', none: 'Aucune course pour le moment.', newR: 'Nouvelle course', accept: '✅ Accepter', refuse: '❌ Refuser', drv: 'Chauffeur', car: 'Voiture', send: 'Envoyer', W: '⏳ À répondre', O: '✅ Acceptée', N: '❌ Refusée',
    open: '🧭 Ouvrir la course (suivi)', toDrv: '💬 Envoyer au chauffeur', guest: 'Client', from: 'Prise en charge', to: 'Destination', flight: 'Vol / train', price: 'Prix annoncé au client', hours: 'heures',
    team: '🚘 Chauffeurs et voitures', name: 'Nom', tel: 'Téléphone', lg: 'Langues parlées', model: 'Modèle', plate: 'Plaque', seats: 'Places', addD: '＋ Chauffeur', addC: '＋ Voiture',
    tarifs: '💶 Tarifs et extras', on: 'Proposée', pc: 'Prise en charge €', km: '€ / km', h: '€ / heure', demi: 'Demi-journée €', jour: 'Journée €', extras: 'Extras (prix en €, vide = pas proposé, 0 = offert)', save: 'Enregistrer et envoyer', saved: 'Envoyé ✓ — visible après la synchro de l’établissement',
    G: { luxe: '💎 Luxe', confort: '🚘 Confort', eco: '🚕 Économique' }, E: { garde: '🛡️ Garde du corps', boissons: '🍾 Boissons', friandises: '🍫 Friandises', siege: '🍼 Siège enfant', pancarte: '🪧 Pancarte', bagages: '🧳 Aide bagages' },
    S: { course: '🛣️ Course', heures: '⏱️ À l’heure', demi: '🌗 Demi-journée', jour: '☀️ Journée', sejour: '📅 Séjour' },
    safe: '🔒 Données chiffrées : seuls vous et l’établissement les lisez.', notif: '🔔 Notifications', notifHint: 'Soyez prévenu à chaque nouvelle course.', notifOn: 'Activer', notifOk: 'Notifications activées ✓', ad: { lbl: 'Publicité', see: '🗺️ Voir', call: '📞 Appeler' }, reset: 'Changer de code' },
  en: { app: 'Rides', welcome: 'Enter the code you received from the property.', code: 'Access code', enter: 'Enter', bad: 'Unknown code.', off: 'Access disabled.',
    rides: '🛣️ Rides', none: 'No ride for now.', newR: 'New ride', accept: '✅ Accept', refuse: '❌ Decline', drv: 'Driver', car: 'Car', send: 'Send', W: '⏳ To answer', O: '✅ Accepted', N: '❌ Declined',
    open: '🧭 Open the ride (tracking)', toDrv: '💬 Send to the driver', guest: 'Guest', from: 'Pickup', to: 'Destination', flight: 'Flight / train', price: 'Price shown to the guest', hours: 'hours',
    team: '🚘 Drivers and cars', name: 'Name', tel: 'Phone', lg: 'Languages', model: 'Model', plate: 'Plate', seats: 'Seats', addD: '＋ Driver', addC: '＋ Car',
    tarifs: '💶 Fares and extras', on: 'Offered', pc: 'Pickup fee €', km: '€ / km', h: '€ / hour', demi: 'Half day €', jour: 'Full day €', extras: 'Extras (price in €, empty = not offered, 0 = free)', save: 'Save and send', saved: 'Sent ✓ — visible after the property syncs',
    G: { luxe: '💎 Luxury', confort: '🚘 Comfort', eco: '🚕 Economy' }, E: { garde: '🛡️ Bodyguard', boissons: '🍾 Drinks', friandises: '🍫 Sweets', siege: '🍼 Child seat', pancarte: '🪧 Name sign', bagages: '🧳 Luggage help' },
    S: { course: '🛣️ Ride', heures: '⏱️ By the hour', demi: '🌗 Half day', jour: '☀️ Full day', sejour: '📅 Whole stay' },
    safe: '🔒 Encrypted data: only you and the property can read it.', notif: '🔔 Notifications', notifHint: 'Be alerted for each new ride.', notifOn: 'Turn on', notifOk: 'Notifications on ✓', ad: { lbl: 'Advertising', see: '🗺️ See', call: '📞 Call' }, reset: 'Change code' },
  de: { app: 'Fahrten', welcome: 'Geben Sie den Code des Hauses ein.', code: 'Zugangscode', enter: 'Öffnen', bad: 'Unbekannter Code.', off: 'Zugang deaktiviert.',
    rides: '🛣️ Fahrten', none: 'Im Moment keine Fahrt.', newR: 'Neue Fahrt', accept: '✅ Annehmen', refuse: '❌ Ablehnen', drv: 'Fahrer', car: 'Auto', send: 'Senden', W: '⏳ Antwort offen', O: '✅ Angenommen', N: '❌ Abgelehnt',
    open: '🧭 Fahrt öffnen (Verfolgung)', toDrv: '💬 An den Fahrer senden', guest: 'Gast', from: 'Abholung', to: 'Ziel', flight: 'Flug / Zug', price: 'Dem Gast angezeigter Preis', hours: 'Stunden',
    team: '🚘 Fahrer und Autos', name: 'Name', tel: 'Telefon', lg: 'Sprachen', model: 'Modell', plate: 'Kennzeichen', seats: 'Plätze', addD: '＋ Fahrer', addC: '＋ Auto',
    tarifs: '💶 Tarife und Extras', on: 'Angeboten', pc: 'Grundgebühr €', km: '€ / km', h: '€ / Stunde', demi: 'Halber Tag €', jour: 'Ganzer Tag €', extras: 'Extras (Preis in €, leer = nicht angeboten, 0 = gratis)', save: 'Speichern und senden', saved: 'Gesendet ✓ — sichtbar nach der Synchronisierung des Hauses',
    G: { luxe: '💎 Luxus', confort: '🚘 Komfort', eco: '🚕 Economy' }, E: { garde: '🛡️ Leibwächter', boissons: '🍾 Getränke', friandises: '🍫 Süßigkeiten', siege: '🍼 Kindersitz', pancarte: '🪧 Namensschild', bagages: '🧳 Gepäckhilfe' },
    S: { course: '🛣️ Fahrt', heures: '⏱️ Pro Stunde', demi: '🌗 Halber Tag', jour: '☀️ Ganzer Tag', sejour: '📅 Aufenthalt' },
    safe: '🔒 Verschlüsselte Daten: nur Sie und das Haus können sie lesen.', notif: '🔔 Benachrichtigungen', notifHint: 'Bei jeder neuen Fahrt benachrichtigt werden.', notifOn: 'Aktivieren', notifOk: 'Benachrichtigungen aktiv ✓', ad: { lbl: 'Werbung', see: '🗺️ Ansehen', call: '📞 Anrufen' }, reset: 'Code ändern' },
  it: { app: 'Corse', welcome: 'Inserisca il codice ricevuto dalla struttura.', code: 'Codice di accesso', enter: 'Entra', bad: 'Codice sconosciuto.', off: 'Accesso disattivato.',
    rides: '🛣️ Corse', none: 'Nessuna corsa per ora.', newR: 'Nuova corsa', accept: '✅ Accetta', refuse: '❌ Rifiuta', drv: 'Autista', car: 'Auto', send: 'Invia', W: '⏳ Da rispondere', O: '✅ Accettata', N: '❌ Rifiutata',
    open: '🧭 Apri la corsa (tracking)', toDrv: '💬 Manda all’autista', guest: 'Cliente', from: 'Presa', to: 'Destinazione', flight: 'Volo / treno', price: 'Prezzo indicato al cliente', hours: 'ore',
    team: '🚘 Autisti e auto', name: 'Nome', tel: 'Telefono', lg: 'Lingue parlate', model: 'Modello', plate: 'Targa', seats: 'Posti', addD: '＋ Autista', addC: '＋ Auto',
    tarifs: '💶 Tariffe ed extra', on: 'Proposta', pc: 'Presa in carico €', km: '€ / km', h: '€ / ora', demi: 'Mezza giornata €', jour: 'Giornata €', extras: 'Extra (prezzo in €, vuoto = non proposto, 0 = offerto)', save: 'Salva e invia', saved: 'Inviato ✓ — visibile dopo la sincronizzazione della struttura',
    G: { luxe: '💎 Lusso', confort: '🚘 Comfort', eco: '🚕 Economica' }, E: { garde: '🛡️ Guardia del corpo', boissons: '🍾 Bevande', friandises: '🍫 Dolcetti', siege: '🍼 Seggiolino', pancarte: '🪧 Cartello', bagages: '🧳 Aiuto bagagli' },
    S: { course: '🛣️ Corsa', heures: '⏱️ A ore', demi: '🌗 Mezza giornata', jour: '☀️ Giornata', sejour: '📅 Soggiorno' },
    safe: '🔒 Dati cifrati: solo lei e la struttura possono leggerli.', notif: '🔔 Notifiche', notifHint: 'Avvisato a ogni nuova corsa.', notifOn: 'Attiva', notifOk: 'Notifiche attive ✓', ad: { lbl: 'Pubblicità', see: '🗺️ Vedi', call: '📞 Chiama' }, reset: 'Cambia codice' },
  pt: { app: 'Corridas', welcome: 'Introduza o código recebido do estabelecimento.', code: 'Código de acesso', enter: 'Entrar', bad: 'Código desconhecido.', off: 'Acesso desativado.',
    rides: '🛣️ Corridas', none: 'Nenhuma corrida por agora.', newR: 'Nova corrida', accept: '✅ Aceitar', refuse: '❌ Recusar', drv: 'Motorista', car: 'Carro', send: 'Enviar', W: '⏳ Por responder', O: '✅ Aceite', N: '❌ Recusada',
    open: '🧭 Abrir a corrida (seguimento)', toDrv: '💬 Enviar ao motorista', guest: 'Cliente', from: 'Recolha', to: 'Destino', flight: 'Voo / comboio', price: 'Preço indicado ao cliente', hours: 'horas',
    team: '🚘 Motoristas e carros', name: 'Nome', tel: 'Telefone', lg: 'Línguas', model: 'Modelo', plate: 'Matrícula', seats: 'Lugares', addD: '＋ Motorista', addC: '＋ Carro',
    tarifs: '💶 Tarifas e extras', on: 'Proposta', pc: 'Bandeirada €', km: '€ / km', h: '€ / hora', demi: 'Meio dia €', jour: 'Dia inteiro €', extras: 'Extras (preço em €, vazio = não proposto, 0 = oferta)', save: 'Guardar e enviar', saved: 'Enviado ✓ — visível após a sincronização do estabelecimento',
    G: { luxe: '💎 Luxo', confort: '🚘 Conforto', eco: '🚕 Económico' }, E: { garde: '🛡️ Guarda-costas', boissons: '🍾 Bebidas', friandises: '🍫 Guloseimas', siege: '🍼 Cadeira de criança', pancarte: '🪧 Placa', bagages: '🧳 Ajuda bagagens' },
    S: { course: '🛣️ Corrida', heures: '⏱️ À hora', demi: '🌗 Meio dia', jour: '☀️ Dia inteiro', sejour: '📅 Estadia' },
    safe: '🔒 Dados cifrados: só o senhor e o estabelecimento os leem.', notif: '🔔 Notificações', notifHint: 'Avisado a cada nova corrida.', notifOn: 'Ativar', notifOk: 'Notificações ativas ✓', ad: { lbl: 'Publicidade', see: '🗺️ Ver', call: '📞 Ligar' }, reset: 'Mudar de código' },
  es: { app: 'Carreras', welcome: 'Introduzca el código recibido del establecimiento.', code: 'Código de acceso', enter: 'Entrar', bad: 'Código desconocido.', off: 'Acceso desactivado.',
    rides: '🛣️ Carreras', none: 'Ninguna carrera por ahora.', newR: 'Nueva carrera', accept: '✅ Aceptar', refuse: '❌ Rechazar', drv: 'Conductor', car: 'Coche', send: 'Enviar', W: '⏳ Por responder', O: '✅ Aceptada', N: '❌ Rechazada',
    open: '🧭 Abrir la carrera (seguimiento)', toDrv: '💬 Enviar al conductor', guest: 'Cliente', from: 'Recogida', to: 'Destino', flight: 'Vuelo / tren', price: 'Precio indicado al cliente', hours: 'horas',
    team: '🚘 Conductores y coches', name: 'Nombre', tel: 'Teléfono', lg: 'Idiomas', model: 'Modelo', plate: 'Matrícula', seats: 'Plazas', addD: '＋ Conductor', addC: '＋ Coche',
    tarifs: '💶 Tarifas y extras', on: 'Ofrecida', pc: 'Bajada de bandera €', km: '€ / km', h: '€ / hora', demi: 'Medio día €', jour: 'Día completo €', extras: 'Extras (precio en €, vacío = no ofrecido, 0 = gratis)', save: 'Guardar y enviar', saved: 'Enviado ✓ — visible tras la sincronización del establecimiento',
    G: { luxe: '💎 Lujo', confort: '🚘 Confort', eco: '🚕 Económico' }, E: { garde: '🛡️ Guardaespaldas', boissons: '🍾 Bebidas', friandises: '🍫 Golosinas', siege: '🍼 Silla infantil', pancarte: '🪧 Cartel', bagages: '🧳 Ayuda equipaje' },
    S: { course: '🛣️ Carrera', heures: '⏱️ Por horas', demi: '🌗 Medio día', jour: '☀️ Día completo', sejour: '📅 Estancia' },
    safe: '🔒 Datos cifrados: solo usted y el establecimiento los leen.', notif: '🔔 Notificaciones', notifHint: 'Avisado en cada nueva carrera.', notifOn: 'Activar', notifOk: 'Notificaciones activadas ✓', ad: { lbl: 'Publicidad', see: '🗺️ Ver', call: '📞 Llamar' }, reset: 'Cambiar de código' },
};
let data = null, loadErr = '', lang = ls.get('taxiLang') || '';
const T = () => L[lang] || L.fr;
// réponses déjà envoyées (visibles tout de suite, avant la synchro de l'établissement)
const sentK = () => 'taxiSent:' + id;
const sent = () => { try { return JSON.parse(ls.get(sentK()) || '{}'); } catch { return {}; } };
let cat = null, catMsg = '', acc = '';
async function sendOwner(o) {
  const r = await fetch(`${API}/api/esp/${id}/signal`, { method: 'POST', body: await sealForOwner(data.signalKey, { espace: id, t: new Date().toISOString(), ...o }) });
  if (!r.ok) throw new Error(r.status);
}
let pushSt = '', pushJust = false;
const pushPost = (b) => fetch(`${API}/api/esp/${id}/push`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...b, app: 'taxi', lang, boards: [] }) }).then((r) => { if (!r.ok) throw new Error(r.status); });
async function pushInit() { pushSt = await pushStatus('/taxi'); if (pushSt === 'on') pushRefresh('/taxi', pushPost); setBadge(0, '/taxi'); render(); }
const pubNow = (x) => { const n = new Date(), hm = String(n.getHours()).padStart(2, '0') + ':' + String(n.getMinutes()).padStart(2, '0'); return (!x.jours || !x.jours.length || x.jours.includes(n.getDay())) && (!x.h1 || !x.h2 || (x.h1 <= x.h2 ? hm >= x.h1 && hm < x.h2 : hm >= x.h1 || hm < x.h2)); };
function adBox(x, t) {
  const v = x.video ? videoEmbed(x.video) : null;
  return `<div class="card pub-box" data-pid="${esc(x.id)}"><div class="meta"><b>📣 ${esc(t.ad.lbl)}</b></div><b style="display:block">${esc(x.nom)}</b><p style="margin:4px 0 0;white-space:pre-wrap">${esc(x.texte)}</p>${v ? `<div class="vid" data-vsrc="${esc(v.src)}"></div>` : ''}
    <div class="btns">${x.adresse ? `<a class="btn sm" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(x.adresse)}" target="_blank" rel="noopener" data-pev="map">${esc(t.ad.see)}</a>` : ''}${x.tel ? `<a class="btn sm sec" href="tel:${esc(x.tel.replace(/[^\d+]/g, ''))}" data-pev="call">${esc(t.ad.call)}</a>` : ''}</div></div>`;
}
const blankCat = () => ({ gammes: Object.fromEntries(GK.map((k) => [k, { on: false, pc: '', km: '', h: '', demi: '', jour: '' }])), extras: {}, drivers: [], cars: [] });
function rideHtml(r, t) {
  const k = r.h + ':' + r.r, s0 = sent()[k], st = s0 ? s0.act === 'ok' ? 'ok' : 'no' : r.st;
  const c = data.cat || {}, drivers = (cat || c).drivers || [], cars = (cat || c).cars || [];
  const svc = [t.S[r.service], r.gamme ? t.G[r.gamme] : '', r.heures ? r.heures + ' ' + t.hours : '', ...(r.extras || []).map((x) => t.E[x])].filter(Boolean).join(' · ');
  const drvTel = r.drv && String(r.drv.tel || '').replace(/[^\d+]/g, '');
  return `<div class="ride ${st}"><div style="display:flex;justify-content:space-between;gap:8px"><b>${esc(t.guest)} : ${esc(r.n)}</b><span class="tag">${esc(st === 'ok' ? t.O : st === 'no' ? t.N : t.W)}</span></div>
    <p class="meta" style="margin:4px 0 0">${esc(svc)}</p>
    <p style="margin:6px 0 0">${r.quand ? '🕒 ' + esc(String(r.quand).replace('T', ' ')) + '<br>' : ''}📍 ${esc(t.from)} : ${esc(r.from || r.s)}${r.vol ? ` · ✈️ ${esc(r.vol)}` : ''}<br>🏁 ${esc(t.to)} : ${esc(r.to || [r.s, r.sa].filter(Boolean).join(' — '))}</p>
    ${r.km || r.prix ? `<p class="meta" style="margin:4px 0 0">${r.km ? esc(r.km + ' km') + ' · ' : ''}${esc(t.price)} : ${r.prix ? '~' + esc(r.prix) + ' €' : '—'}</p>` : ''}
    ${st === 'wait' ? (acc === k ? `<div class="acc"><label>${esc(t.drv)}</label><select data-acc-d="1">${drivers.map((d, i) => `<option value="${i}">${esc(d.nom)}</option>`).join('')}</select>
        <label>${esc(t.car)}</label><select data-acc-c="1">${cars.filter((x) => !r.gamme || x.gamme === r.gamme).concat(r.gamme ? cars.filter((x) => x.gamme !== r.gamme) : []).map((x) => `<option value="${esc(x.plaque)}">${esc(x.modele)} · ${esc(x.plaque)} · ${esc(t.G[x.gamme] || '')}</option>`).join('')}</select>
        <button class="btn block" style="margin-top:8px" data-acc-send="${esc(k)}" ${drivers.length && cars.length ? '' : 'disabled'}>${esc(t.send)}</button></div>`
      : `<div class="duo"><button class="btn" data-acc="${esc(k)}">${esc(t.accept)}</button><button class="btn sec" data-ref="${esc(k)}">${esc(t.refuse)}</button></div>`) : ''}
    ${st === 'ok' && r.drv ? `<p style="margin:8px 0 0">👤 ${esc(r.drv.nom)} · 🚘 ${esc([r.drv.auto, r.drv.plaque].filter(Boolean).join(' '))}</p>` : ''}
    ${st === 'ok' && r.link ? `<div class="btns"><a class="btn sm" href="${esc(r.link)}">${esc(t.open)}</a>${drvTel ? `<a class="btn sm sec" href="https://wa.me/${esc(drvTel.replace(/^\+/, '').replace(/^00/, ''))}?text=${encodeURIComponent('🚕 ' + r.n + '\n' + r.link)}" target="_blank" rel="noopener">${esc(t.toDrv)}</a>` : ''}</div>` : ''}</div>`;
}
function catHtml(t) {
  const c = cat || JSON.parse(JSON.stringify(data.cat && data.cat.gammes ? data.cat : blankCat()));
  cat = c;
  const g = (k) => c.gammes[k] || (c.gammes[k] = { on: false });
  return `<div class="card"><h2>${esc(t.team)}</h2>
    ${c.drivers.map((d, i) => `<div class="line"><input data-cd="${i}" data-f="nom" value="${esc(d.nom)}" placeholder="${esc(t.name)}"><input data-cd="${i}" data-f="tel" value="${esc(d.tel)}" placeholder="${esc(t.tel)}" type="tel"><input data-cd="${i}" data-f="lg" value="${esc(d.lg)}" placeholder="${esc(t.lg)}"></div>`).join('')}
    <button class="btn sm sec" data-add-d="1">${esc(t.addD)}</button>
    ${c.cars.map((x, i) => `<div class="line"><input data-cc="${i}" data-f="modele" value="${esc(x.modele)}" placeholder="${esc(t.model)}"><input data-cc="${i}" data-f="plaque" value="${esc(x.plaque)}" placeholder="${esc(t.plate)}"><select data-cc="${i}" data-f="gamme">${GK.map((k) => `<option value="${k}" ${x.gamme === k ? 'selected' : ''}>${esc(t.G[k])}</option>`).join('')}</select></div>`).join('')}
    <button class="btn sm sec" data-add-c="1">${esc(t.addC)}</button></div>
    <div class="card"><h2>${esc(t.tarifs)}</h2>
    ${GK.map((k) => `<div class="gam"><label class="chk"><input type="checkbox" data-g="${k}" data-f="on" ${g(k).on ? 'checked' : ''}> <b>${esc(t.G[k])}</b> · ${esc(t.on)}</label>
      ${g(k).on ? `<div class="grid">${['pc', 'km', 'h', 'demi', 'jour'].map((f) => `<label>${esc(t[f])}<input inputmode="decimal" data-g="${k}" data-f="${f}" value="${esc(g(k)[f] ?? '')}"></label>`).join('')}</div>` : ''}</div>`).join('')}
    <p class="meta" style="margin:10px 0 4px">${esc(t.extras)}</p>
    <div class="grid">${EK.map((k) => `<label>${esc(t.E[k])}<input inputmode="decimal" data-e="${k}" value="${esc(c.extras[k] ?? '')}"></label>`).join('')}</div>
    <button class="btn block" style="margin-top:12px" data-cat-save="1">${esc(t.save)}</button>
    ${catMsg ? `<p class="ok" style="margin:8px 0 0">${esc(catMsg)}</p>` : ''}</div>`;
}
function render() {
  const t = T();
  document.documentElement.lang = lang;
  const langs = `<div class="langs">${LANGS.map((k) => `<button data-lang="${k}" aria-pressed="${k === lang}">${k.toUpperCase()}</button>`).join('')}</div>`;
  if (!data) {
    app.innerHTML = `<div class="top"><span class="brandx"><b>🚕 ${esc(t.app)}</b></span>${langs}</div><p class="sub" style="text-align:center;margin-top:18px">${esc(t.welcome)}</p>
      ${loadErr ? `<div class="card warnc"><p style="margin:0">${esc(loadErr)}</p></div>` : ''}
      <div class="card"><form id="codeForm"><label>${esc(t.code)}</label><input type="text" name="code" inputmode="numeric" autocomplete="one-time-code" style="font-size:24px;letter-spacing:.1em;text-align:center"><button class="btn block" style="margin-top:12px" type="submit">${esc(t.enter)}</button></form></div>`;
    return;
  }
  const d = data, out = [], pubs = (d.pubs || []).filter((x) => (!x.fin || x.fin >= new Date().toISOString().slice(0, 10)) && pubNow(x));
  const slot = (k) => pubs.find((x) => (x.slot || 'milieu') === k);
  document.title = `🚕 ${d.nom}`;
  // 1 en-tête · 2 pub · 3 notifications · 4 météo/radio · 5 courses · 6 pub · 7 chauffeurs, voitures, tarifs · 8 🔒 · 9 pub · 10 infos · 11 cours
  out.push(`<div class="top"><span class="brandx"><b>🚕 ${esc(d.nom)}</b></span>${langs}</div><p class="sub">${esc(t.app)} · ${esc(d.reseau)}</p>`);
  { const p = slot('haut'); if (p) out.push(adBox(p, t)); }
  if (pushSt && pushSt !== 'unsupported' && (pushSt !== 'on' || pushJust)) out.push(`<div class="card"><h2>${esc(t.notif)}</h2><p class="meta" style="margin:0 0 8px">${esc(t.notifHint)}</p>${pushSt === 'on' ? `<p class="ok" style="margin:0">${esc(t.notifOk)}</p>` : `<button class="btn sm" data-push="1">${esc(t.notifOn)}</button>`}</div>`);
  out.push(wxRadioCard());
  const rides = d.rides || [];
  out.push(`<div class="card"><h2>${esc(t.rides)}</h2>${rides.length ? rides.map((r) => rideHtml(r, t)).join('') : `<p class="meta" style="margin:0">${esc(t.none)}</p>`}</div>`);
  { const p = slot('milieu'); if (p) out.push(adBox(p, t)); }
  out.push(catHtml(t));
  out.push(`<p class="meta safe">${esc(t.safe)}</p>`);
  { const p = slot('bas'); if (p) out.push(adBox(p, t)); }
  out.push(infoBox({ lang }));
  out.push(`<div class="ticker" data-vsrc="${API}/ticker"></div><p class="meta" style="text-align:center;margin-top:14px"><button class="linkb" data-reset="1">${esc(t.reset)}</button></p>`);
  const keep = new Map([...document.querySelectorAll('.vid iframe, .ticker iframe')].map((f) => [f.dataset.src, f]));
  app.innerHTML = out.join('');
  document.querySelectorAll('.vid[data-vsrc], .ticker[data-vsrc]').forEach((v) => { const src = v.dataset.vsrc, old = keep.get(src); if (old) return v.append(old); const f = document.createElement('iframe'); f.src = src; f.dataset.src = src; f.loading = 'lazy'; f.title = 'Video'; v.append(f); });
  pubSeen(app);
}
async function load() {
  data = null;
  if (id && key) {
    try {
      const r = await fetch(`${API}/api/esp/${id}`, { cache: 'no-store' });
      if (r.ok) { const x = await openJson(key, await r.arrayBuffer()); if (x && x.kind === 'taxi') data = x; else { ls.set(ACC, null); location.replace(`/espace.html#${id}.${key}`); return; } }
      else if (r.status === 404) { ls.set(ACC, null); id = key = ''; loadErr = T().off; }
    } catch { loadErr = '⚠ offline'; }
  }
  if (!lang) { const n = (navigator.language || 'fr').slice(0, 2); lang = LANGS.includes(n) ? n : 'fr'; }
  // réponses déjà prises en compte par l'établissement : on oublie la copie locale
  if (data) { const s0 = sent(); for (const r of data.rides || []) if (r.st !== 'wait') delete s0[r.h + ':' + r.r]; ls.set(sentK(), JSON.stringify(s0)); }
  render();
  if (data) pushInit();
}
wxRadioInit({ app: 'taxi', lang: () => lang, home: () => 'Luxembourg', radio: () => null });
pubStatInit(API, 'taxi', () => lang);
app.addEventListener('submit', async (e) => {
  if (e.target.id !== 'codeForm') return;
  e.preventDefault();
  const code = String(new FormData(e.target).get('code') || '').trim();
  try {
    const r = await fetch(`${API}/api/esp-code`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ h: await codeHash(code) }) });
    if (!r.ok) { loadErr = T().bad; return render(); }
    const j = await r.json(); id = j.id; key = await unwrapWithCode(code, j.salt, j.wk); ls.set(ACC, id + '.' + key); loadErr = ''; load();
  } catch { loadErr = T().bad; render(); }
});
app.addEventListener('input', (e) => {
  const el = e.target;
  if (!cat) return;
  if (el.dataset.cd) cat.drivers[+el.dataset.cd][el.dataset.f] = el.value;
  else if (el.dataset.cc) cat.cars[+el.dataset.cc][el.dataset.f] = el.value;
  else if (el.dataset.g && el.dataset.f !== 'on') cat.gammes[el.dataset.g][el.dataset.f] = el.value;
  else if (el.dataset.e) { if (el.value === '') delete cat.extras[el.dataset.e]; else cat.extras[el.dataset.e] = el.value; }
});
app.addEventListener('change', (e) => {
  const el = e.target;
  if (cat && el.dataset.g && el.dataset.f === 'on') { cat.gammes[el.dataset.g].on = el.checked; catMsg = ''; return render(); }
  if (cat && el.dataset.cc && el.dataset.f === 'gamme') cat.cars[+el.dataset.cc].gamme = el.value;
});
app.addEventListener('click', async (e) => {
  pubTap(e);
  const b = e.target.closest('button');
  if (!b) return;
  const t = T();
  if (b.dataset.lang) { lang = b.dataset.lang; ls.set('taxiLang', lang); return render(); }
  if (b.dataset.push) { if (await pushEnable({ api: API, swUrl: '/taxi-sw.js', scope: '/taxi', post: pushPost })) { pushSt = 'on'; pushJust = true; } else pushSt = await pushStatus('/taxi'); return render(); }
  if (b.dataset.reset) { ls.set(ACC, null); id = key = ''; data = null; return render(); }
  if (b.dataset.addD) { cat.drivers.push({ nom: '', tel: '', lg: '' }); return render(); }
  if (b.dataset.addC) { cat.cars.push({ modele: '', plaque: '', gamme: 'confort' }); return render(); }
  if (b.dataset.catSave) {
    b.disabled = true;
    try { await sendOwner({ type: 'tx-cat', cat }); catMsg = t.saved; data.cat = JSON.parse(JSON.stringify(cat)); } catch { b.disabled = false; return; }
    return render();
  }
  if (b.dataset.acc) { acc = b.dataset.acc; return render(); }
  const reply = async (k, act, extra = {}) => {
    const [h, r] = k.split(':');
    await sendOwner({ type: 'tx-ride', h, r, act, ...extra });
    const s0 = sent(); s0[k] = { act }; ls.set(sentK(), JSON.stringify(s0));
    if (act === 'ok') { const x = (data.rides || []).find((y) => y.h + ':' + y.r === k); if (x) x.drv = { nom: extra.drv.nom, tel: extra.drv.tel, auto: extra.car.modele, plaque: extra.car.plaque }; }
    acc = ''; render();
  };
  if (b.dataset.ref) { b.disabled = true; try { await reply(b.dataset.ref, 'no'); } catch { b.disabled = false; } return; }
  if (b.dataset.accSend) {
    const box = b.closest('.acc'), c = cat || data.cat || {}, drv = (c.drivers || [])[+box.querySelector('[data-acc-d]').value], car = (c.cars || []).find((x) => x.plaque === box.querySelector('[data-acc-c]').value);
    if (!drv || !car) return;
    b.disabled = true;
    try { await reply(b.dataset.accSend, 'ok', { drv: { nom: drv.nom, tel: drv.tel }, car: { modele: car.modele, plaque: car.plaque } }); } catch { b.disabled = false; }
  }
});
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && data) { setBadge(0, '/taxi'); load(); } });
load();
