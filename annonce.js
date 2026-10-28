// 📣 App des annonceurs HORECA (restaurants, bistrots, bars, discothèques…) : annonces, menus du jour et événements,
// avec dates, jours, heures, emplacement et apps visées ; prix affiché ; validation par LuxInterventions ; statistiques.
// 💳 Paiement en ligne : pas encore connecté (bouton affiché, désactivé, avec une info).
import '/ares/reqmark.js';
import { openJson, sealForOwner, codeHash, unwrapWithCode } from '/ares/espace-crypto.js';
import { pushStatus, pushEnable, pushRefresh, setBadge } from '/ares/push-client.js';
import { infoBox } from '/ares/nbien.js';
const API = document.querySelector('meta[name="esp-api"]').content.replace(/\/$/, '');
const ACC = 'annAccess';
let [id, key] = (location.hash.slice(1).match(/^([0-9a-f]{32})\.([A-Za-z0-9_-]{40,})$/) || []).slice(1);
if (id) { try { localStorage.setItem(ACC, id + '.' + key); } catch {} history.replaceState(null, '', location.pathname); }
else { try { [id, key] = ((localStorage.getItem(ACC) || '').match(/^([0-9a-f]{32})\.([A-Za-z0-9_-]{40,})$/) || []).slice(1); } catch {} }
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('/annonce-sw.js', { scope: '/annonce' }).catch(() => {});
const app = document.getElementById('app');
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const ls = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* stockage plein */ } } };
const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const today = iso(new Date());
const plusDays = (d, n) => { const x = new Date(d + 'T12:00'); x.setDate(x.getDate() + n); return iso(x); };
const LANGS = ['fr', 'en', 'de', 'it', 'pt', 'es'];
const AUD = ['loc', 'eq', 'ptl', 'hote', 'taxi'], SLOTS = ['haut', 'milieu', 'bas'], TYPES = ['annonce', 'evenement', 'menu'];
const L = {
  fr: { app: 'Mes annonces', welcome: 'Entrez le code reçu de LuxInterventions.', code: 'Code d’accès', enter: 'Entrer', bad: 'Code inconnu.', off: 'Accès désactivé.',
    newA: '＋ Annonce, menu ou événement', mine: '📣 Mes annonces', none: 'Aucune annonce pour le moment.', type: 'Type', Ty: { annonce: '📣 Annonce', evenement: '🎉 Événement', menu: '🍽️ Menu du jour' },
    title: 'Titre', text: 'Message / offre', addr: 'Adresse (pour la carte)', tel: 'Téléphone', web: 'Site web', video: 'Vidéo ou musique (lien YouTube, TikTok, Instagram…)',
    slot: 'Emplacement', Sl: { haut: '🔝 Haut (le plus vu)', milieu: '⏺ Milieu', bas: '🔽 Bas' }, aud: 'Dans quelles apps ?', Au: { loc: '🏠 Locataires', eq: '👷 Équipes', ptl: '🏢 Gérances', hote: '🏨 Clients hôtel / Airbnb', taxi: '🚕 Taxis' },
    from: 'Du', to: 'Au', days: 'Jours (aucun = tous les jours)', D: ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'], hours: 'Heures (vide = toute la journée)', h1: 'de', h2: 'à',
    price: 'Prix', perDay: '/ jour', quote: 'sur devis', send: 'Envoyer pour validation', sent: 'Envoyé ✓ — en attente de validation', edit: '✏️ Modifier', stop: '⏹ Arrêter', cancel: 'Annuler',
    St: { wait: '⏳ En attente de validation', ok: '✅ En ligne', no: '❌ Refusée', end: '⌛ Terminée' }, motif: 'Motif', views: 'vues', clicks: 'clics',
    pay: '💳 Payer en ligne', payInfo: 'Paiement en ligne pas encore connecté : LuxInterventions vous contacte pour le règlement.', safe: '🔒 Vos données sont chiffrées.', notif: '🔔 Notifications', notifHint: 'Soyez prévenu quand votre annonce est validée.', notifOn: 'Activer', notifOk: 'Notifications activées ✓', reset: 'Changer de code', need: 'Titre et message obligatoires' },
  en: { app: 'My ads', welcome: 'Enter the code you received from LuxInterventions.', code: 'Access code', enter: 'Enter', bad: 'Unknown code.', off: 'Access disabled.',
    newA: '＋ Ad, menu or event', mine: '📣 My ads', none: 'No ad for now.', type: 'Type', Ty: { annonce: '📣 Ad', evenement: '🎉 Event', menu: '🍽️ Daily menu' },
    title: 'Title', text: 'Message / offer', addr: 'Address (for the map)', tel: 'Phone', web: 'Website', video: 'Video or music (YouTube, TikTok, Instagram link…)',
    slot: 'Position', Sl: { haut: '🔝 Top (most seen)', milieu: '⏺ Middle', bas: '🔽 Bottom' }, aud: 'In which apps?', Au: { loc: '🏠 Tenants', eq: '👷 Teams', ptl: '🏢 Property managers', hote: '🏨 Hotel / Airbnb guests', taxi: '🚕 Taxis' },
    from: 'From', to: 'To', days: 'Days (none = every day)', D: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'], hours: 'Hours (empty = all day)', h1: 'from', h2: 'to',
    price: 'Price', perDay: '/ day', quote: 'on quote', send: 'Send for approval', sent: 'Sent ✓ — waiting for approval', edit: '✏️ Edit', stop: '⏹ Stop', cancel: 'Cancel',
    St: { wait: '⏳ Waiting for approval', ok: '✅ Online', no: '❌ Declined', end: '⌛ Ended' }, motif: 'Reason', views: 'views', clicks: 'clicks',
    pay: '💳 Pay online', payInfo: 'Online payment not connected yet: LuxInterventions will contact you for payment.', safe: '🔒 Your data is encrypted.', notif: '🔔 Notifications', notifHint: 'Be alerted when your ad is approved.', notifOn: 'Turn on', notifOk: 'Notifications on ✓', reset: 'Change code', need: 'Title and message are required' },
  de: { app: 'Meine Anzeigen', welcome: 'Geben Sie den Code von LuxInterventions ein.', code: 'Zugangscode', enter: 'Öffnen', bad: 'Unbekannter Code.', off: 'Zugang deaktiviert.',
    newA: '＋ Anzeige, Menü oder Event', mine: '📣 Meine Anzeigen', none: 'Noch keine Anzeige.', type: 'Art', Ty: { annonce: '📣 Anzeige', evenement: '🎉 Event', menu: '🍽️ Tagesmenü' },
    title: 'Titel', text: 'Nachricht / Angebot', addr: 'Adresse (für die Karte)', tel: 'Telefon', web: 'Website', video: 'Video oder Musik (Link YouTube, TikTok, Instagram…)',
    slot: 'Platz', Sl: { haut: '🔝 Oben (meist gesehen)', milieu: '⏺ Mitte', bas: '🔽 Unten' }, aud: 'In welchen Apps?', Au: { loc: '🏠 Mieter', eq: '👷 Teams', ptl: '🏢 Hausverwaltungen', hote: '🏨 Hotel- / Airbnb-Gäste', taxi: '🚕 Taxis' },
    from: 'Vom', to: 'Bis', days: 'Tage (keiner = jeden Tag)', D: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'], hours: 'Uhrzeit (leer = ganzer Tag)', h1: 'von', h2: 'bis',
    price: 'Preis', perDay: '/ Tag', quote: 'auf Anfrage', send: 'Zur Freigabe senden', sent: 'Gesendet ✓ — wartet auf Freigabe', edit: '✏️ Ändern', stop: '⏹ Beenden', cancel: 'Abbrechen',
    St: { wait: '⏳ Wartet auf Freigabe', ok: '✅ Online', no: '❌ Abgelehnt', end: '⌛ Beendet' }, motif: 'Grund', views: 'Aufrufe', clicks: 'Klicks',
    pay: '💳 Online bezahlen', payInfo: 'Online-Zahlung noch nicht verbunden: LuxInterventions kontaktiert Sie für die Zahlung.', safe: '🔒 Ihre Daten sind verschlüsselt.', notif: '🔔 Benachrichtigungen', notifHint: 'Benachrichtigt werden, wenn Ihre Anzeige freigegeben ist.', notifOn: 'Aktivieren', notifOk: 'Benachrichtigungen aktiv ✓', reset: 'Code ändern', need: 'Titel und Nachricht sind Pflicht' },
  it: { app: 'I miei annunci', welcome: 'Inserisca il codice ricevuto da LuxInterventions.', code: 'Codice di accesso', enter: 'Entra', bad: 'Codice sconosciuto.', off: 'Accesso disattivato.',
    newA: '＋ Annuncio, menù o evento', mine: '📣 I miei annunci', none: 'Nessun annuncio per ora.', type: 'Tipo', Ty: { annonce: '📣 Annuncio', evenement: '🎉 Evento', menu: '🍽️ Menù del giorno' },
    title: 'Titolo', text: 'Messaggio / offerta', addr: 'Indirizzo (per la mappa)', tel: 'Telefono', web: 'Sito web', video: 'Video o musica (link YouTube, TikTok, Instagram…)',
    slot: 'Posizione', Sl: { haut: '🔝 Alto (il più visto)', milieu: '⏺ Centro', bas: '🔽 Basso' }, aud: 'In quali app?', Au: { loc: '🏠 Inquilini', eq: '👷 Squadre', ptl: '🏢 Gérance', hote: '🏨 Clienti hotel / Airbnb', taxi: '🚕 Taxi' },
    from: 'Dal', to: 'Al', days: 'Giorni (nessuno = tutti i giorni)', D: ['Do', 'Lu', 'Ma', 'Me', 'Gi', 'Ve', 'Sa'], hours: 'Orari (vuoto = tutto il giorno)', h1: 'dalle', h2: 'alle',
    price: 'Prezzo', perDay: '/ giorno', quote: 'su preventivo', send: 'Invia per approvazione', sent: 'Inviato ✓ — in attesa di approvazione', edit: '✏️ Modifica', stop: '⏹ Ferma', cancel: 'Annulla',
    St: { wait: '⏳ In attesa di approvazione', ok: '✅ Online', no: '❌ Rifiutato', end: '⌛ Terminato' }, motif: 'Motivo', views: 'viste', clicks: 'clic',
    pay: '💳 Paga online', payInfo: 'Pagamento online non ancora collegato: LuxInterventions la contatta per il pagamento.', safe: '🔒 I suoi dati sono cifrati.', notif: '🔔 Notifiche', notifHint: 'Avvisato quando il suo annuncio è approvato.', notifOn: 'Attiva', notifOk: 'Notifiche attive ✓', reset: 'Cambia codice', need: 'Titolo e messaggio obbligatori' },
  pt: { app: 'Os meus anúncios', welcome: 'Introduza o código recebido da LuxInterventions.', code: 'Código de acesso', enter: 'Entrar', bad: 'Código desconhecido.', off: 'Acesso desativado.',
    newA: '＋ Anúncio, menu ou evento', mine: '📣 Os meus anúncios', none: 'Nenhum anúncio por agora.', type: 'Tipo', Ty: { annonce: '📣 Anúncio', evenement: '🎉 Evento', menu: '🍽️ Menu do dia' },
    title: 'Título', text: 'Mensagem / oferta', addr: 'Morada (para o mapa)', tel: 'Telefone', web: 'Site', video: 'Vídeo ou música (link YouTube, TikTok, Instagram…)',
    slot: 'Posição', Sl: { haut: '🔝 Topo (o mais visto)', milieu: '⏺ Meio', bas: '🔽 Fundo' }, aud: 'Em que apps?', Au: { loc: '🏠 Inquilinos', eq: '👷 Equipas', ptl: '🏢 Gestoras', hote: '🏨 Clientes hotel / Airbnb', taxi: '🚕 Táxis' },
    from: 'De', to: 'Até', days: 'Dias (nenhum = todos os dias)', D: ['Do', 'Se', 'Te', 'Qa', 'Qi', 'Sx', 'Sá'], hours: 'Horas (vazio = o dia todo)', h1: 'das', h2: 'às',
    price: 'Preço', perDay: '/ dia', quote: 'sob orçamento', send: 'Enviar para aprovação', sent: 'Enviado ✓ — à espera de aprovação', edit: '✏️ Alterar', stop: '⏹ Parar', cancel: 'Cancelar',
    St: { wait: '⏳ À espera de aprovação', ok: '✅ Online', no: '❌ Recusado', end: '⌛ Terminado' }, motif: 'Motivo', views: 'vistas', clicks: 'cliques',
    pay: '💳 Pagar online', payInfo: 'Pagamento online ainda não ligado: a LuxInterventions contacta-o para o pagamento.', safe: '🔒 Os seus dados estão cifrados.', notif: '🔔 Notificações', notifHint: 'Avisado quando o anúncio for aprovado.', notifOn: 'Ativar', notifOk: 'Notificações ativas ✓', reset: 'Mudar de código', need: 'Título e mensagem obrigatórios' },
  es: { app: 'Mis anuncios', welcome: 'Introduzca el código recibido de LuxInterventions.', code: 'Código de acceso', enter: 'Entrar', bad: 'Código desconocido.', off: 'Acceso desactivado.',
    newA: '＋ Anuncio, menú o evento', mine: '📣 Mis anuncios', none: 'Ningún anuncio por ahora.', type: 'Tipo', Ty: { annonce: '📣 Anuncio', evenement: '🎉 Evento', menu: '🍽️ Menú del día' },
    title: 'Título', text: 'Mensaje / oferta', addr: 'Dirección (para el mapa)', tel: 'Teléfono', web: 'Web', video: 'Vídeo o música (enlace YouTube, TikTok, Instagram…)',
    slot: 'Posición', Sl: { haut: '🔝 Arriba (el más visto)', milieu: '⏺ Centro', bas: '🔽 Abajo' }, aud: '¿En qué apps?', Au: { loc: '🏠 Inquilinos', eq: '👷 Equipos', ptl: '🏢 Administraciones', hote: '🏨 Clientes hotel / Airbnb', taxi: '🚕 Taxis' },
    from: 'Del', to: 'Al', days: 'Días (ninguno = todos los días)', D: ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'], hours: 'Horas (vacío = todo el día)', h1: 'de', h2: 'a',
    price: 'Precio', perDay: '/ día', quote: 'a presupuesto', send: 'Enviar para aprobación', sent: 'Enviado ✓ — esperando aprobación', edit: '✏️ Modificar', stop: '⏹ Parar', cancel: 'Cancelar',
    St: { wait: '⏳ Esperando aprobación', ok: '✅ En línea', no: '❌ Rechazado', end: '⌛ Terminado' }, motif: 'Motivo', views: 'vistas', clicks: 'clics',
    pay: '💳 Pagar en línea', payInfo: 'Pago en línea aún no conectado: LuxInterventions le contactará para el pago.', safe: '🔒 Sus datos están cifrados.', notif: '🔔 Notificaciones', notifHint: 'Avisado cuando su anuncio sea aprobado.', notifOn: 'Activar', notifOk: 'Notificaciones activadas ✓', reset: 'Cambiar de código', need: 'Título y mensaje obligatorios' },
};
let data = null, loadErr = '', lang = ls.get('annLang') || '', form = null, msg = '', payOpen = '';
const T = () => L[lang] || L.fr;
const blank = () => ({ id: '', type: 'annonce', nom: data ? data.nom : '', texte: '', adresse: data ? data.adresse : '', tel: data ? data.tel : '', web: '', video: '', slot: 'milieu', aud: ['loc', 'hote'], debut: today, fin: plusDays(today, 13), jours: [], h1: '', h2: '' });
const days = (f) => Math.max(1, Math.round((new Date(f.fin) - new Date(f.debut)) / 864e5) + 1);
const priceOf = (f) => { const r = +((data && data.tarifs) || {})[f.slot] || 0; return r ? Math.round(r * days(f)) : 0; };
async function sendOwner(o) {
  const r = await fetch(`${API}/api/esp/${id}/signal`, { method: 'POST', body: await sealForOwner(data.signalKey, { espace: id, t: new Date().toISOString(), ...o }) });
  if (!r.ok) throw new Error(r.status);
}
let pushSt = '', pushJust = false;
const pushPost = (b) => fetch(`${API}/api/esp/${id}/push`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...b, app: 'ann', lang, boards: [] }) }).then((r) => { if (!r.ok) throw new Error(r.status); });
async function pushInit() { pushSt = await pushStatus('/annonce'); if (pushSt === 'on') pushRefresh('/annonce', pushPost); setBadge(0, '/annonce'); render(); }
function formHtml(t) {
  const f = form, tr = (data && data.tarifs) || {}, p = priceOf(f);
  return `<div class="card frm"><h2>${esc(f.id ? t.edit : t.newA)}</h2>
    <label>${esc(t.type)}</label><select data-k="type">${TYPES.map((k) => `<option value="${k}" ${f.type === k ? 'selected' : ''}>${esc(t.Ty[k])}</option>`).join('')}</select>
    <label>${esc(t.title)}</label><input data-k="nom" value="${esc(f.nom)}">
    <label>${esc(t.text)}</label><textarea data-k="texte" rows="4">${esc(f.texte)}</textarea>
    <label>${esc(t.addr)}</label><input data-k="adresse" value="${esc(f.adresse)}">
    <div class="two"><div><label>${esc(t.tel)}</label><input data-k="tel" type="tel" value="${esc(f.tel)}"></div><div><label>${esc(t.web)}</label><input data-k="web" type="url" value="${esc(f.web)}" placeholder="https://…"></div></div>
    <label>${esc(t.video)}</label><input data-k="video" type="url" value="${esc(f.video)}" placeholder="https://…">
    <label>${esc(t.slot)}</label>${SLOTS.map((k) => `<label class="radio"><input type="radio" name="slot" value="${k}" ${f.slot === k ? 'checked' : ''}> ${esc(t.Sl[k])}<span class="meta">${tr[k] ? tr[k] + ' € ' + esc(t.perDay) : esc(t.quote)}</span></label>`).join('')}
    <label>${esc(t.aud)}</label><div class="chips">${AUD.map((k) => `<label class="chip"><input type="checkbox" data-aud="${k}" ${f.aud.includes(k) ? 'checked' : ''}> ${esc(t.Au[k])}</label>`).join('')}</div>
    <div class="two"><div><label>${esc(t.from)}</label><input type="date" data-k="debut" value="${esc(f.debut)}"></div><div><label>${esc(t.to)}</label><input type="date" data-k="fin" value="${esc(f.fin)}"></div></div>
    <label>${esc(t.days)}</label><div class="chips">${t.D.map((d, i) => `<label class="chip"><input type="checkbox" data-day="${i}" ${f.jours.includes(i) ? 'checked' : ''}> ${esc(d)}</label>`).join('')}</div>
    <label>${esc(t.hours)}</label><div class="two"><div><span class="meta">${esc(t.h1)}</span><input type="time" data-k="h1" value="${esc(f.h1)}"></div><div><span class="meta">${esc(t.h2)}</span><input type="time" data-k="h2" value="${esc(f.h2)}"></div></div>
    <p class="est">${esc(t.price)} : <b>${p ? p + ' €' : esc(t.quote)}</b> <span class="meta">(${days(f)} j)</span>${tr.note ? `<br><span class="meta">${esc(tr.note)}</span>` : ''}</p>
    <div class="duo"><button class="btn sec" data-cancel="1">${esc(t.cancel)}</button><button class="btn" data-send="1">${esc(t.send)}</button></div></div>`;
}
function adHtml(a, t) {
  const st = a.st === 'ok' && a.fin && a.fin < today ? 'end' : a.st;
  return `<div class="ad ${st}"><div style="display:flex;justify-content:space-between;gap:8px"><b>${esc(t.Ty[a.type] || '')} · ${esc(a.nom)}</b><span class="tag">${esc(t.St[st] || '')}</span></div>
    <p style="margin:4px 0 0;white-space:pre-wrap">${esc(a.texte)}</p>
    <p class="meta" style="margin:4px 0 0">${esc(t.Sl[a.slot] || '')} · ${(a.aud || []).map((k) => esc(t.Au[k] || '')).join(' · ')}<br>📅 ${esc(a.debut)} → ${esc(a.fin)}${a.jours && a.jours.length ? ' · ' + a.jours.map((j) => esc(t.D[j])).join(' ') : ''}${a.h1 ? ` · ${esc(a.h1)}–${esc(a.h2)}` : ''}${a.prix ? ' · ' + esc(a.prix) + ' €' : ''}</p>
    ${a.st === 'no' && a.motif ? `<p class="warnt">${esc(t.motif)} : ${esc(a.motif)}</p>` : ''}
    ${a.st === 'ok' ? `<p class="meta" style="margin:4px 0 0">📊 <b>${esc(a.v || 0)}</b> ${esc(t.views)} · <b>${esc(a.taps || 0)}</b> ${esc(t.clicks)}</p>` : ''}
    <div class="btns">${st !== 'end' ? `<button class="btn sm sec" data-edit="${esc(a.id)}">${esc(t.edit)}</button><button class="btn sm sec" data-stop="${esc(a.id)}">${esc(t.stop)}</button>` : ''}
      ${a.prix && st !== 'no' ? `<span class="paywrap"><button class="btn sm" disabled aria-disabled="true">${esc(t.pay)}</button><button class="info-dot" data-payinfo="${esc(a.id)}" aria-label="Info">ℹ️</button></span>` : ''}</div>
    ${payOpen === a.id ? `<p class="bubble">ℹ️ ${esc(t.payInfo)}</p>` : ''}</div>`;
}
function render() {
  const t = T();
  document.documentElement.lang = lang;
  const langs = `<div class="langs">${LANGS.map((k) => `<button data-lang="${k}" aria-pressed="${k === lang}">${k.toUpperCase()}</button>`).join('')}</div>`;
  if (!data) {
    app.innerHTML = `<div class="top"><span class="brandx"><b>📣 ${esc(t.app)}</b></span>${langs}</div><p class="sub" style="text-align:center;margin-top:18px">${esc(t.welcome)}</p>
      ${loadErr ? `<div class="card warnc"><p style="margin:0">${esc(loadErr)}</p></div>` : ''}
      <div class="card"><form id="codeForm"><label>${esc(t.code)}</label><input type="text" name="code" inputmode="numeric" autocomplete="one-time-code" style="font-size:24px;letter-spacing:.1em;text-align:center"><button class="btn block" style="margin-top:12px" type="submit">${esc(t.enter)}</button></form></div>`;
    return;
  }
  const d = data, out = [];
  document.title = `📣 ${d.nom}`;
  out.push(`<div class="top"><span class="brandx"><b>📣 ${esc(d.nom)}</b></span>${langs}</div><p class="sub">${esc(t.app)} · ${esc(d.reseau)}</p>`);
  if (pushSt && pushSt !== 'unsupported' && (pushSt !== 'on' || pushJust)) out.push(`<div class="card"><h2>${esc(t.notif)}</h2><p class="meta" style="margin:0 0 8px">${esc(t.notifHint)}</p>${pushSt === 'on' ? `<p class="ok" style="margin:0">${esc(t.notifOk)}</p>` : `<button class="btn sm" data-push="1">${esc(t.notifOn)}</button>`}</div>`);
  if (msg) out.push(`<div class="card okc"><p style="margin:0">${esc(msg)}</p></div>`);
  out.push(form ? formHtml(t) : `<button class="btn block big" data-new="1">${esc(t.newA)}</button>`);
  const pend = (() => { try { return JSON.parse(ls.get('annPend:' + id) || '[]'); } catch { return []; } })();
  const ads = [...pend.filter((p) => !(d.ads || []).some((a) => a.id === p.id && p.id)), ...(d.ads || [])];
  out.push(`<div class="card"><h2>${esc(t.mine)}</h2>${ads.length ? ads.map((a) => adHtml(a, t)).join('') : `<p class="meta" style="margin:0">${esc(t.none)}</p>`}</div>`);
  out.push(`<p class="meta safe">${esc(t.safe)}</p>`);
  out.push(infoBox({ lang }));
  out.push(`<p class="meta" style="text-align:center;margin-top:14px"><button class="linkb" data-reset="1">${esc(t.reset)}</button></p>`);
  app.innerHTML = out.join('');
}
async function load() {
  data = null;
  if (id && key) {
    try {
      const r = await fetch(`${API}/api/esp/${id}`, { cache: 'no-store' });
      if (r.ok) { const x = await openJson(key, await r.arrayBuffer()); if (x && x.kind === 'annonce') data = x; else { ls.set(ACC, null); location.replace(`/espace.html#${id}.${key}`); return; } }
      else if (r.status === 404) { ls.set(ACC, null); id = key = ''; loadErr = T().off; }
    } catch { loadErr = '⚠ offline'; }
  }
  if (!lang) { const n = (navigator.language || 'fr').slice(0, 2); lang = LANGS.includes(n) ? n : 'fr'; }
  // envois déjà reçus par LuxInterventions : on oublie la copie locale
  if (data) { try { const p = JSON.parse(ls.get('annPend:' + id) || '[]').filter((x) => Date.now() - x.at < 864e5 * 3 && !(data.ads || []).some((a) => a.nom === x.nom && a.debut === x.debut)); ls.set('annPend:' + id, JSON.stringify(p)); } catch { /* stockage indisponible */ } }
  render();
  if (data) pushInit();
}
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
app.addEventListener('input', (e) => { const el = e.target; if (form && el.dataset.k) { form[el.dataset.k] = el.value; if (['debut', 'fin'].includes(el.dataset.k)) render(); } });
app.addEventListener('change', (e) => {
  const el = e.target;
  if (!form) return;
  if (el.name === 'slot') { form.slot = el.value; return render(); }
  if (el.dataset.aud) { form.aud = el.checked ? [...form.aud, el.dataset.aud] : form.aud.filter((k) => k !== el.dataset.aud); return; }
  if (el.dataset.day) { const n = +el.dataset.day; form.jours = el.checked ? [...form.jours, n].sort() : form.jours.filter((x) => x !== n); return; }
});
app.addEventListener('click', async (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  const t = T();
  if (b.dataset.lang) { lang = b.dataset.lang; ls.set('annLang', lang); return render(); }
  if (b.dataset.push) { if (await pushEnable({ api: API, swUrl: '/annonce-sw.js', scope: '/annonce', post: pushPost })) { pushSt = 'on'; pushJust = true; } else pushSt = await pushStatus('/annonce'); return render(); }
  if (b.dataset.reset) { ls.set(ACC, null); id = key = ''; data = null; return render(); }
  if (b.dataset.new) { form = blank(); msg = ''; return render(); }
  if (b.dataset.cancel) { form = null; return render(); }
  if (b.dataset.payinfo) { payOpen = payOpen === b.dataset.payinfo ? '' : b.dataset.payinfo; return render(); }
  if (b.dataset.edit) { const a = (data.ads || []).find((x) => x.id === b.dataset.edit); if (a) { form = { ...blank(), ...a, jours: [...(a.jours || [])], aud: [...(a.aud || [])] }; msg = ''; render(); scrollTo(0, 0); } return; }
  if (b.dataset.stop) { b.disabled = true; try { await sendOwner({ type: 'an-stop', id: b.dataset.stop }); const a = (data.ads || []).find((x) => x.id === b.dataset.stop); if (a) a.fin = plusDays(today, -1); } catch { b.disabled = false; return; } return render(); }
  if (b.dataset.send) {
    const f = form;
    if (!f.nom.trim() || !f.texte.trim()) { msg = t.need; return render(); }
    b.disabled = true;
    try {
      await sendOwner({ type: 'an-ad', ad: f });
      const pend = (() => { try { return JSON.parse(ls.get('annPend:' + id) || '[]'); } catch { return []; } })();
      if (!f.id) { pend.push({ ...f, id: '', st: 'wait', prix: priceOf(f), at: Date.now() }); ls.set('annPend:' + id, JSON.stringify(pend)); }
      else { const a = (data.ads || []).find((x) => x.id === f.id); if (a) Object.assign(a, f, { st: 'wait', prix: priceOf(f) }); }
      form = null; msg = t.sent;
    } catch { b.disabled = false; return; }
    return render();
  }
});
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && data && !form) { setBadge(0, '/annonce'); load(); } });
load();
