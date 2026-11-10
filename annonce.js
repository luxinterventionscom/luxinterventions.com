// 📣 App des annonceurs HORECA (restaurants, bistrots, bars, discothèques…) : annonces, menus du jour et événements,
// avec dates, jours, heures, emplacement et apps visées ; prix affiché ; validation par LA CENTRAL ; statistiques.
// 💳 Paiement en ligne : pas encore connecté (bouton affiché, désactivé, avec une info).
import { pubLive, pubSlotNow, pubPickNow, BANDS, BAND_KEYS, PACK_N, adPrice, durDays } from '/ares/pubsched.js';
import { emojiInit } from '/ares/emoji.js';
import { domierHtml, domierInit, DOM_TEL } from '/ares/domier.js';
import { newsHtml } from '/ares/news.js';
import '/ares/reqmark.js';
import { openJson, sealForOwner, codeHash, unwrapWithCode } from '/ares/espace-crypto.js';
import { pushStatus, pushEnable, pushRefresh, setBadge } from '/ares/push-client.js';
import { infoBox } from '/ares/nbien.js';
import qrcode from '/ares/qrcode.js';
import { pchatInit, pchatCard } from '/ares/pchat.js';
import { trInit } from '/ares/chattr.js';
import { videoEmbed } from '/ares/video-embed.js';
import { pubStatInit, pubSeen, pubTap } from '/ares/pubstat.js';
import { pubSocialInit, pubSocialBar, pubSocialLoad, pubSocialClick } from '/ares/pubsocial.js';
import { netPubsGet, netPubsFor } from '/ares/netpubs.js';
const API = document.querySelector('meta[name="esp-api"]').content.replace(/\/$/, '');
const ACC = 'annAccess';
let [id, key] = (location.hash.slice(1).match(/^([0-9a-f]{32})\.([A-Za-z0-9_-]{40,})$/) || []).slice(1);
if (id) { try { localStorage.setItem(ACC, id + '.' + key); } catch {} history.replaceState(null, '', location.pathname); }
else { try { [id, key] = ((localStorage.getItem(ACC) || '').match(/^([0-9a-f]{32})\.([A-Za-z0-9_-]{40,})$/) || []).slice(1); } catch {} }
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('/annonce-sw.js', { scope: '/annonce' }).catch(() => {});
const app = document.getElementById('app');
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const ls = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* stockage plein */ } } };
document.addEventListener('toggle', (e) => { if (e.target.dataset && e.target.dataset.mineFold) ls.set('annMineShut', e.target.open ? null : '1'); }, true);
const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const today = iso(new Date());
const plusDays = (d, n) => { const x = new Date(d + 'T12:00'); x.setDate(x.getDate() + n); return iso(x); };
const LANGS = ['fr', 'en', 'de', 'it', 'pt', 'es'];
const AUD = ['loc', 'eq', 'ptl', 'hote', 'taxi'], SLOTS = ['haut', 'milieu', 'bas'], TYPES = ['annonce', 'evenement', 'menu'];
const L = {
  fr: { app: 'Mes annonces', welcome: 'Entrez le code reçu de LA CENTRAL.', code: 'Code d’accès', enter: 'Entrer', bad: 'Code inconnu.', off: 'Accès désactivé.',
    newA: '＋ Annonce, menu ou événement', mine: '📣 Mes annonces', none: 'Aucune annonce pour le moment.', type: 'Type', Ty: { annonce: '📣 Annonce', evenement: '🎉 Événement', menu: '🍽️ Menu du jour' },
    title: 'Titre', text: 'Message / offre', addr: 'Adresse (pour la carte)', tel: 'Téléphone', web: 'Site web', video: 'Vidéo ou musique (lien YouTube, TikTok, Instagram…)',
    slot: 'Emplacement', Sl: { haut: '🔝 Haut (le plus vu)', milieu: '⏺ Milieu', bas: '🔽 Bas' }, aud: 'Dans quelles apps ?', Au: { loc: '🏠 Locataires', eq: '👷 Équipes', ptl: '🏢 Gérances', hote: '🏨 Clients hôtel / Airbnb', taxi: '🚕 Taxis' },
    from: 'Du', to: 'Au', days: 'Jours (aucun = tous les jours)', D: ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'], hours: 'Heures (vide = toute la journée)', h1: 'de', h2: 'à',
    price: 'Prix', perDay: '/ jour', quote: 'sur devis', send: 'Envoyer pour validation', sent: 'Envoyé ✓ — en attente de validation', edit: '✏️ Modifier', stop: '⏹ Arrêter', cancel: 'Annuler',
    St: { wait: '⏳ En attente de validation', ok: '✅ En ligne', no: '❌ Refusée', end: '⌛ Terminée' }, motif: 'Motif', views: 'vues', clicks: 'clics',
    pay: '💳 Payer en ligne', payInfo: 'Paiement en ligne pas encore connecté : LA CENTRAL vous contacte pour le règlement.', safe: '🔒 Vos données sont chiffrées.', notif: '🔔 Notifications', notifHint: 'Soyez prévenu quand votre annonce est validée.', notifOn: 'Activer', notifOk: 'Notifications activées ✓', reset: 'Changer de code', need: 'Titre et message obligatoires' },
  en: { app: 'My ads', welcome: 'Enter the code you received from LA CENTRAL.', code: 'Access code', enter: 'Enter', bad: 'Unknown code.', off: 'Access disabled.',
    newA: '＋ Ad, menu or event', mine: '📣 My ads', none: 'No ad for now.', type: 'Type', Ty: { annonce: '📣 Ad', evenement: '🎉 Event', menu: '🍽️ Daily menu' },
    title: 'Title', text: 'Message / offer', addr: 'Address (for the map)', tel: 'Phone', web: 'Website', video: 'Video or music (YouTube, TikTok, Instagram link…)',
    slot: 'Position', Sl: { haut: '🔝 Top (most seen)', milieu: '⏺ Middle', bas: '🔽 Bottom' }, aud: 'In which apps?', Au: { loc: '🏠 Tenants', eq: '👷 Teams', ptl: '🏢 Property managers', hote: '🏨 Hotel / Airbnb guests', taxi: '🚕 Taxis' },
    from: 'From', to: 'To', days: 'Days (none = every day)', D: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'], hours: 'Hours (empty = all day)', h1: 'from', h2: 'to',
    price: 'Price', perDay: '/ day', quote: 'on quote', send: 'Send for approval', sent: 'Sent ✓ — waiting for approval', edit: '✏️ Edit', stop: '⏹ Stop', cancel: 'Cancel',
    St: { wait: '⏳ Waiting for approval', ok: '✅ Online', no: '❌ Declined', end: '⌛ Ended' }, motif: 'Reason', views: 'views', clicks: 'clicks',
    pay: '💳 Pay online', payInfo: 'Online payment not connected yet: LA CENTRAL will contact you for payment.', safe: '🔒 Your data is encrypted.', notif: '🔔 Notifications', notifHint: 'Be alerted when your ad is approved.', notifOn: 'Turn on', notifOk: 'Notifications on ✓', reset: 'Change code', need: 'Title and message are required' },
  de: { app: 'Meine Anzeigen', welcome: 'Geben Sie den Code von LA CENTRAL ein.', code: 'Zugangscode', enter: 'Öffnen', bad: 'Unbekannter Code.', off: 'Zugang deaktiviert.',
    newA: '＋ Anzeige, Menü oder Event', mine: '📣 Meine Anzeigen', none: 'Noch keine Anzeige.', type: 'Art', Ty: { annonce: '📣 Anzeige', evenement: '🎉 Event', menu: '🍽️ Tagesmenü' },
    title: 'Titel', text: 'Nachricht / Angebot', addr: 'Adresse (für die Karte)', tel: 'Telefon', web: 'Website', video: 'Video oder Musik (Link YouTube, TikTok, Instagram…)',
    slot: 'Platz', Sl: { haut: '🔝 Oben (meist gesehen)', milieu: '⏺ Mitte', bas: '🔽 Unten' }, aud: 'In welchen Apps?', Au: { loc: '🏠 Mieter', eq: '👷 Teams', ptl: '🏢 Hausverwaltungen', hote: '🏨 Hotel- / Airbnb-Gäste', taxi: '🚕 Taxis' },
    from: 'Vom', to: 'Bis', days: 'Tage (keiner = jeden Tag)', D: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'], hours: 'Uhrzeit (leer = ganzer Tag)', h1: 'von', h2: 'bis',
    price: 'Preis', perDay: '/ Tag', quote: 'auf Anfrage', send: 'Zur Freigabe senden', sent: 'Gesendet ✓ — wartet auf Freigabe', edit: '✏️ Ändern', stop: '⏹ Beenden', cancel: 'Abbrechen',
    St: { wait: '⏳ Wartet auf Freigabe', ok: '✅ Online', no: '❌ Abgelehnt', end: '⌛ Beendet' }, motif: 'Grund', views: 'Aufrufe', clicks: 'Klicks',
    pay: '💳 Online bezahlen', payInfo: 'Online-Zahlung noch nicht verbunden: LA CENTRAL kontaktiert Sie für die Zahlung.', safe: '🔒 Ihre Daten sind verschlüsselt.', notif: '🔔 Benachrichtigungen', notifHint: 'Benachrichtigt werden, wenn Ihre Anzeige freigegeben ist.', notifOn: 'Aktivieren', notifOk: 'Benachrichtigungen aktiv ✓', reset: 'Code ändern', need: 'Titel und Nachricht sind Pflicht' },
  it: { app: 'I miei annunci', welcome: 'Inserisca il codice ricevuto da LA CENTRAL.', code: 'Codice di accesso', enter: 'Entra', bad: 'Codice sconosciuto.', off: 'Accesso disattivato.',
    newA: '＋ Annuncio, menù o evento', mine: '📣 I miei annunci', none: 'Nessun annuncio per ora.', type: 'Tipo', Ty: { annonce: '📣 Annuncio', evenement: '🎉 Evento', menu: '🍽️ Menù del giorno' },
    title: 'Titolo', text: 'Messaggio / offerta', addr: 'Indirizzo (per la mappa)', tel: 'Telefono', web: 'Sito web', video: 'Video o musica (link YouTube, TikTok, Instagram…)',
    slot: 'Posizione', Sl: { haut: '🔝 Alto (il più visto)', milieu: '⏺ Centro', bas: '🔽 Basso' }, aud: 'In quali app?', Au: { loc: '🏠 Inquilini', eq: '👷 Squadre', ptl: '🏢 Gérance', hote: '🏨 Clienti hotel / Airbnb', taxi: '🚕 Taxi' },
    from: 'Dal', to: 'Al', days: 'Giorni (nessuno = tutti i giorni)', D: ['Do', 'Lu', 'Ma', 'Me', 'Gi', 'Ve', 'Sa'], hours: 'Orari (vuoto = tutto il giorno)', h1: 'dalle', h2: 'alle',
    price: 'Prezzo', perDay: '/ giorno', quote: 'su preventivo', send: 'Invia per approvazione', sent: 'Inviato ✓ — in attesa di approvazione', edit: '✏️ Modifica', stop: '⏹ Ferma', cancel: 'Annulla',
    St: { wait: '⏳ In attesa di approvazione', ok: '✅ Online', no: '❌ Rifiutato', end: '⌛ Terminato' }, motif: 'Motivo', views: 'viste', clicks: 'clic',
    pay: '💳 Paga online', payInfo: 'Pagamento online non ancora collegato: LA CENTRAL la contatta per il pagamento.', safe: '🔒 I suoi dati sono cifrati.', notif: '🔔 Notifiche', notifHint: 'Avvisato quando il suo annuncio è approvato.', notifOn: 'Attiva', notifOk: 'Notifiche attive ✓', reset: 'Cambia codice', need: 'Titolo e messaggio obbligatori' },
  pt: { app: 'Os meus anúncios', welcome: 'Introduza o código recebido da LA CENTRAL.', code: 'Código de acesso', enter: 'Entrar', bad: 'Código desconhecido.', off: 'Acesso desativado.',
    newA: '＋ Anúncio, menu ou evento', mine: '📣 Os meus anúncios', none: 'Nenhum anúncio por agora.', type: 'Tipo', Ty: { annonce: '📣 Anúncio', evenement: '🎉 Evento', menu: '🍽️ Menu do dia' },
    title: 'Título', text: 'Mensagem / oferta', addr: 'Morada (para o mapa)', tel: 'Telefone', web: 'Site', video: 'Vídeo ou música (link YouTube, TikTok, Instagram…)',
    slot: 'Posição', Sl: { haut: '🔝 Topo (o mais visto)', milieu: '⏺ Meio', bas: '🔽 Fundo' }, aud: 'Em que apps?', Au: { loc: '🏠 Inquilinos', eq: '👷 Equipas', ptl: '🏢 Gestoras', hote: '🏨 Clientes hotel / Airbnb', taxi: '🚕 Táxis' },
    from: 'De', to: 'Até', days: 'Dias (nenhum = todos os dias)', D: ['Do', 'Se', 'Te', 'Qa', 'Qi', 'Sx', 'Sá'], hours: 'Horas (vazio = o dia todo)', h1: 'das', h2: 'às',
    price: 'Preço', perDay: '/ dia', quote: 'sob orçamento', send: 'Enviar para aprovação', sent: 'Enviado ✓ — à espera de aprovação', edit: '✏️ Alterar', stop: '⏹ Parar', cancel: 'Cancelar',
    St: { wait: '⏳ À espera de aprovação', ok: '✅ Online', no: '❌ Recusado', end: '⌛ Terminado' }, motif: 'Motivo', views: 'vistas', clicks: 'cliques',
    pay: '💳 Pagar online', payInfo: 'Pagamento online ainda não ligado: a LA CENTRAL contacta-o para o pagamento.', safe: '🔒 Os seus dados estão cifrados.', notif: '🔔 Notificações', notifHint: 'Avisado quando o anúncio for aprovado.', notifOn: 'Ativar', notifOk: 'Notificações ativas ✓', reset: 'Mudar de código', need: 'Título e mensagem obrigatórios' },
  es: { app: 'Mis anuncios', welcome: 'Introduzca el código recibido de LA CENTRAL.', code: 'Código de acceso', enter: 'Entrar', bad: 'Código desconocido.', off: 'Acceso desactivado.',
    newA: '＋ Anuncio, menú o evento', mine: '📣 Mis anuncios', none: 'Ningún anuncio por ahora.', type: 'Tipo', Ty: { annonce: '📣 Anuncio', evenement: '🎉 Evento', menu: '🍽️ Menú del día' },
    title: 'Título', text: 'Mensaje / oferta', addr: 'Dirección (para el mapa)', tel: 'Teléfono', web: 'Web', video: 'Vídeo o música (enlace YouTube, TikTok, Instagram…)',
    slot: 'Posición', Sl: { haut: '🔝 Arriba (el más visto)', milieu: '⏺ Centro', bas: '🔽 Abajo' }, aud: '¿En qué apps?', Au: { loc: '🏠 Inquilinos', eq: '👷 Equipos', ptl: '🏢 Administraciones', hote: '🏨 Clientes hotel / Airbnb', taxi: '🚕 Taxis' },
    from: 'Del', to: 'Al', days: 'Días (ninguno = todos los días)', D: ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'], hours: 'Horas (vacío = todo el día)', h1: 'de', h2: 'a',
    price: 'Precio', perDay: '/ día', quote: 'a presupuesto', send: 'Enviar para aprobación', sent: 'Enviado ✓ — esperando aprobación', edit: '✏️ Modificar', stop: '⏹ Parar', cancel: 'Cancelar',
    St: { wait: '⏳ Esperando aprobación', ok: '✅ En línea', no: '❌ Rechazado', end: '⌛ Terminado' }, motif: 'Motivo', views: 'vistas', clicks: 'clics',
    pay: '💳 Pagar en línea', payInfo: 'Pago en línea aún no conectado: LA CENTRAL le contactará para el pago.', safe: '🔒 Sus datos están cifrados.', notif: '🔔 Notificaciones', notifHint: 'Avisado cuando su anuncio sea aprobado.', notifOn: 'Activar', notifOk: 'Notificaciones activadas ✓', reset: 'Cambiar de código', need: 'Título y mensaje obligatorios' },
};
let data = null, loadErr = '', lang = ls.get('annLang') || '', form = null, msg = '', payOpen = '';
const T = () => L[lang] || L.fr;
// 💶 paiement d'une annonce validée : virement (QR EPC) + « J'ai payé » ; facture de la centrale après réception
const P = {
  fr: { st: '💶 Validée — à payer', due: 'À payer', ht: 'HT', vat: 'TVA', ttc: 'TTC', how: 'Virement : scannez le code QR avec votre application bancaire.', ref: 'Communication', paid: '✅ J’ai payé', claimed: 'Paiement signalé ✓ — en ligne dès sa réception.', noIban: 'Coordonnées bancaires bientôt disponibles : nous vous contactons.', inv: '🧾 Facture', card: 'Paiement par carte pas encore connecté : payez par virement (QR).', paidOn: 'Payée le', total: 'Total' },
  en: { st: '💶 Approved — to pay', due: 'To pay', ht: 'excl. VAT', vat: 'VAT', ttc: 'incl. VAT', how: 'Bank transfer: scan the QR code with your banking app.', ref: 'Reference', paid: '✅ I have paid', claimed: 'Payment reported ✓ — online as soon as it is received.', noIban: 'Bank details coming soon: we will contact you.', inv: '🧾 Invoice', card: 'Card payment not connected yet: pay by bank transfer (QR).', paidOn: 'Paid on', total: 'Total' },
  de: { st: '💶 Genehmigt — zu bezahlen', due: 'Zu bezahlen', ht: 'netto', vat: 'MwSt.', ttc: 'brutto', how: 'Überweisung: QR-Code mit Ihrer Banking-App scannen.', ref: 'Verwendungszweck', paid: '✅ Ich habe bezahlt', claimed: 'Zahlung gemeldet ✓ — online, sobald sie eingegangen ist.', noIban: 'Bankverbindung folgt: wir kontaktieren Sie.', inv: '🧾 Rechnung', card: 'Kartenzahlung noch nicht verbunden: bitte per Überweisung (QR).', paidOn: 'Bezahlt am', total: 'Gesamt' },
  it: { st: '💶 Approvato — da pagare', due: 'Da pagare', ht: 'IVA esclusa', vat: 'IVA', ttc: 'IVA inclusa', how: 'Bonifico: scansioni il codice QR con l’app della sua banca.', ref: 'Causale', paid: '✅ Ho pagato', claimed: 'Pagamento segnalato ✓ — online appena ricevuto.', noIban: 'Coordinate bancarie in arrivo: la contattiamo noi.', inv: '🧾 Fattura', card: 'Pagamento con carta non ancora collegato: paghi con bonifico (QR).', paidOn: 'Pagata il', total: 'Totale' },
  pt: { st: '💶 Aprovado — a pagar', due: 'A pagar', ht: 's/ IVA', vat: 'IVA', ttc: 'c/ IVA', how: 'Transferência: leia o código QR com a app do seu banco.', ref: 'Referência', paid: '✅ Já paguei', claimed: 'Pagamento assinalado ✓ — online assim que for recebido.', noIban: 'Dados bancários em breve: nós contactamo-lo.', inv: '🧾 Fatura', card: 'Pagamento com cartão ainda não ligado: pague por transferência (QR).', paidOn: 'Paga em', total: 'Total' },
  es: { st: '💶 Aprobado — a pagar', due: 'A pagar', ht: 'sin IVA', vat: 'IVA', ttc: 'IVA incl.', how: 'Transferencia: escanee el código QR con la app de su banco.', ref: 'Concepto', paid: '✅ He pagado', claimed: 'Pago comunicado ✓ — en línea en cuanto se reciba.', noIban: 'Datos bancarios próximamente: le contactamos.', inv: '🧾 Factura', card: 'Pago con tarjeta aún no conectado: pague por transferencia (QR).', paidOn: 'Pagada el', total: 'Total' },
};
const TP = () => P[lang] || P.fr;
const eur = (n) => (Math.round((+n || 0) * 100) / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
const qr = (text) => { const q = qrcode(0, 'M'); q.addData(text); q.make(); return q.createSvgTag(4, 2); };
function payHtml(a) {
  const u = TP(), f = (data && data.from) || {};
  return `<div class="bubble"><b>${esc(u.due)} : ${esc(eur(a.ttc))} ${esc(u.ttc)}</b> <span class="meta">(${esc(eur(a.ht))} ${esc(u.ht)} + ${esc(u.vat)} ${esc(a.tx)} % ${esc(eur(a.tva))})</span>
    ${a.epc && f.iban ? `<div style="text-align:center;margin:8px 0">${qr(a.epc)}</div><p class="meta" style="margin:0">${esc(u.how)}<br>${esc(f.nom || '')} · IBAN <b>${esc(f.iban)}</b>${f.bic ? ' · BIC ' + esc(f.bic) : ''}<br>${esc(u.ref)} : <b>${esc('Annonce ' + String(a.id).slice(0, 8))}</b></p>` : `<p class="meta" style="margin:6px 0 0">${esc(u.noIban)}</p>`}
    ${a.claim ? `<p class="ok" style="margin:8px 0 0">${esc(u.claimed)}</p>` : `<button class="btn sm" style="margin-top:8px" data-paid="${esc(a.id)}">${esc(u.paid)}</button>`}</div>`;
}
function printInv(id) {
  const u = TP(), a = (data.ads || []).find((x) => x.id === id), f = data.from || {}, x = a && a.fact;
  if (!x) return;
  const w = window.open('', '_blank');
  if (!w) return;
  const t = T();
  w.document.write(`<!doctype html><meta charset="utf-8"><title>${esc(u.inv)} ${esc(x.no)}</title><style>body{font:14px system-ui,sans-serif;margin:32px;color:#1d1b16}td,th{padding:6px 8px;border-bottom:1px solid #ddd;text-align:left}th:last-child,td:last-child{text-align:right}table{width:100%;border-collapse:collapse;margin:16px 0}h1{font-size:22px}</style>
    <div style="display:flex;justify-content:space-between;gap:24px"><div><b>${esc(f.marque || f.nom || '')}</b>${f.marque ? '<br>by ' + esc(f.nom || '') : ''}<br>${esc(f.adresse || '')}<br>${esc(f.ville || '')}<br>${esc(['RCS ' + (f.rcs || ''), 'TVA ' + (f.tva || '')].join(' · '))}</div><div><b>${esc(data.nom)}</b><br>${esc(data.adresse || '')}</div></div>
    <h1>${esc(u.inv.replace('🧾 ', ''))} ${esc(x.no)}</h1><p>${esc(x.date)}</p>
    <table><tr><th></th><th>€ ${esc(u.ht)}</th></tr><tr><td>${esc(t.Ty[a.type] || '')} — ${esc(a.nom)}<br><small>${esc(t.Sl[a.slot] || '')} · ${esc(a.debut)} → ${esc(a.fin)}</small></td><td>${esc(eur(x.ht))}</td></tr></table>
    <p style="text-align:right">${esc(u.ht)} ${esc(eur(x.ht))}<br>${esc(u.vat)} ${esc(String(x.tx))} % ${esc(eur(x.tva))}<br><b>${esc(u.total)} ${esc(eur(x.ttc))}</b></p><p>${esc(u.paidOn)} ${esc(x.date)}</p>`);
  w.document.close();
  w.print();
}
const blank = () => ({ logo: ls.get('annLogo:' + id) || '', id: '', type: 'annonce', nom: data ? data.nom : '', texte: '', adresse: data ? data.adresse : '', tel: data ? data.tel : '', web: '', video: '', slot: 'rot', aud: ['loc', 'hote'], debut: today, fin: plusDays(today, 29), jours: [], h1: '', h2: '', pack: 'start', bands: [], we: false, dn: 1, du: 'm', down: false });
// 📅 pacchetto, fasce, semaine / week-end, position (fixe ou rotation), durée — prix calculé comme dans la centrale
const PST = {
  fr: { pack: 'Formule', pk: { start: '🟢 Start — 1 fascia', plus: '🟡 Plus — 3 fasce', max: '🔴 Max — toutes les fasce' }, bands: 'Fasce horaires', bt: { m: '🌅 Matin', m2: '☀️ Matin +', a: '🌤️ Après-midi', a2: '🌇 Après-midi +', s: '🌆 Soir', n: '🌙 Nuit' }, choose: (n) => `choisissez ${n}`, per: 'Période', week: '📅 Toute la semaine (7 jours)', we: '🎉 Week-end (jeudi, vendredi, samedi)', pos: 'Position dans les apps', ps: { rot: '🔄 Rotation — Haut, Milieu, Bas à tour de rôle (prix de base)', haut: '🔝 Haut fixe — vue dès l’ouverture (+33 %)', milieu: '⏺ Milieu fixe (prix de base)', bas: '🔽 Bas fixe (−33 %)' }, down: 'Si Haut est complet, j’accepte Milieu (au prix de Milieu)', dur: 'Durée', du: { d: 'jours', w: 'semaines', m: 'mois', y: 'années' }, disc: 'Remises : semaines −13 %, mois −23 %, années −33 %', month: '/ mois', need: (n) => `Choisissez ${n} fascia(s)` },
  it: { pack: 'Formula', pk: { start: '🟢 Start — 1 fascia', plus: '🟡 Plus — 3 fasce', max: '🔴 Max — tutte le fasce' }, bands: 'Fasce orarie', bt: { m: '🌅 Mattina', m2: '☀️ Mattina +', a: '🌤️ Pomeriggio', a2: '🌇 Pomeriggio +', s: '🌆 Sera', n: '🌙 Notte' }, choose: (n) => `scegline ${n}`, per: 'Periodo', week: '📅 Tutta la settimana (7 giorni)', we: '🎉 Week-end (giovedì, venerdì, sabato)', pos: 'Posizione nelle app', ps: { rot: '🔄 Rotazione — Alto, Centro, Basso a turno (prezzo base)', haut: '🔝 Alto fisso — visto all’apertura (+33 %)', milieu: '⏺ Centro fisso (prezzo base)', bas: '🔽 Basso fisso (−33 %)' }, down: 'Se Alto è pieno, accetto Centro (al prezzo di Centro)', dur: 'Durata', du: { d: 'giorni', w: 'settimane', m: 'mesi', y: 'anni' }, disc: 'Sconti: settimane −13 %, mesi −23 %, anni −33 %', month: '/ mese', need: (n) => `Scegli ${n} fascia/e` },
  de: { pack: 'Paket', pk: { start: '🟢 Start — 1 Zeitfenster', plus: '🟡 Plus — 3 Zeitfenster', max: '🔴 Max — alle Zeitfenster' }, bands: 'Zeitfenster', bt: { m: '🌅 Morgen', m2: '☀️ Vormittag', a: '🌤️ Nachmittag', a2: '🌇 Spätnachmittag', s: '🌆 Abend', n: '🌙 Nacht' }, choose: (n) => `${n} wählen`, per: 'Zeitraum', week: '📅 Ganze Woche (7 Tage)', we: '🎉 Wochenende (Do, Fr, Sa)', pos: 'Position in den Apps', ps: { rot: '🔄 Rotation — Oben, Mitte, Unten abwechselnd (Grundpreis)', haut: '🔝 Oben fest — beim Öffnen sichtbar (+33 %)', milieu: '⏺ Mitte fest (Grundpreis)', bas: '🔽 Unten fest (−33 %)' }, down: 'Wenn Oben voll ist, nehme ich Mitte (zum Preis von Mitte)', dur: 'Dauer', du: { d: 'Tage', w: 'Wochen', m: 'Monate', y: 'Jahre' }, disc: 'Rabatte: Wochen −13 %, Monate −23 %, Jahre −33 %', month: '/ Monat', need: (n) => `${n} Zeitfenster wählen` },
  pt: { pack: 'Fórmula', pk: { start: '🟢 Start — 1 faixa', plus: '🟡 Plus — 3 faixas', max: '🔴 Max — todas as faixas' }, bands: 'Faixas horárias', bt: { m: '🌅 Manhã', m2: '☀️ Manhã +', a: '🌤️ Tarde', a2: '🌇 Tarde +', s: '🌆 Noite (serão)', n: '🌙 Madrugada' }, choose: (n) => `escolha ${n}`, per: 'Período', week: '📅 Semana inteira (7 dias)', we: '🎉 Fim de semana (quinta, sexta, sábado)', pos: 'Posição nas apps', ps: { rot: '🔄 Rotação — Cima, Meio, Baixo à vez (preço base)', haut: '🔝 Cima fixo — visto ao abrir (+33 %)', milieu: '⏺ Meio fixo (preço base)', bas: '🔽 Baixo fixo (−33 %)' }, down: 'Se Cima estiver cheio, aceito Meio (ao preço de Meio)', dur: 'Duração', du: { d: 'dias', w: 'semanas', m: 'meses', y: 'anos' }, disc: 'Descontos: semanas −13 %, meses −23 %, anos −33 %', month: '/ mês', need: (n) => `Escolha ${n} faixa(s)` },
  en: { pack: 'Package', pk: { start: '🟢 Start — 1 time slot', plus: '🟡 Plus — 3 time slots', max: '🔴 Max — all time slots' }, bands: 'Time slots', bt: { m: '🌅 Morning', m2: '☀️ Late morning', a: '🌤️ Afternoon', a2: '🌇 Late afternoon', s: '🌆 Evening', n: '🌙 Night' }, choose: (n) => `pick ${n}`, per: 'Period', week: '📅 Whole week (7 days)', we: '🎉 Weekend (Thu, Fri, Sat)', pos: 'Position in the apps', ps: { rot: '🔄 Rotation — Top, Middle, Bottom in turn (base price)', haut: '🔝 Fixed top — seen on opening (+33 %)', milieu: '⏺ Fixed middle (base price)', bas: '🔽 Fixed bottom (−33 %)' }, down: 'If Top is full, I accept Middle (at the Middle price)', dur: 'Duration', du: { d: 'days', w: 'weeks', m: 'months', y: 'years' }, disc: 'Discounts: weeks −13 %, months −23 %, years −33 %', month: '/ month', need: (n) => `Pick ${n} time slot(s)` },
  es: { pack: 'Fórmula', pk: { start: '🟢 Start — 1 franja', plus: '🟡 Plus — 3 franjas', max: '🔴 Max — todas las franjas' }, bands: 'Franjas horarias', bt: { m: '🌅 Mañana', m2: '☀️ Media mañana', a: '🌤️ Tarde', a2: '🌇 Última tarde', s: '🌆 Noche (cena)', n: '🌙 Madrugada' }, choose: (n) => `elija ${n}`, per: 'Periodo', week: '📅 Toda la semana (7 días)', we: '🎉 Fin de semana (jueves, viernes, sábado)', pos: 'Posición en las apps', ps: { rot: '🔄 Rotación — Arriba, Medio, Abajo por turnos (precio base)', haut: '🔝 Arriba fijo — visto al abrir (+33 %)', milieu: '⏺ Medio fijo (precio base)', bas: '🔽 Abajo fijo (−33 %)' }, down: 'Si Arriba está lleno, acepto Medio (al precio de Medio)', dur: 'Duración', du: { d: 'días', w: 'semanas', m: 'meses', y: 'años' }, disc: 'Descuentos: semanas −13 %, meses −23 %, años −33 %', month: '/ mes', need: (n) => `Elija ${n} franja(s)` },
};
const PS = () => PST[lang] || PST.fr;
const fBands = (f) => (f.pack === 'max' ? [...BAND_KEYS] : (f.bands || []).filter((k) => BAND_KEYS.includes(k)));
const days = (f) => (f.du ? durDays(f.dn, f.du) : Math.max(1, Math.round((new Date(f.fin) - new Date(f.debut)) / 864e5) + 1));
const priceOf = (f) => { const tr = (data && data.tarifs) || {}, c = f.crea ? +tr['crea_' + f.crea] || 0 : 0; if (f.du) { const p = adPrice({ ...f, bands: fBands(f) }, tr); return p && (!f.crea || c) ? Math.round((p + c) * 100) / 100 : 0; } const r = +tr[f.slot] || 0; return r && (!f.crea || c) ? Math.round(r * days(f)) + c : 0; };
async function sendOwner(o) {
  const r = await fetch(`${API}/api/esp/${id}/signal?app=ann`, { method: 'POST', body: await sealForOwner(data.signalKey, { espace: id, t: new Date().toISOString(), ...o }) });
  if (!r.ok) throw new Error(r.status);
}
let pushSt = '', pushJust = false;
const pushPost = (b) => fetch(`${API}/api/esp/${id}/push`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...b, app: 'ann', lang, boards: [] }) }).then((r) => { if (!r.ok) throw new Error(r.status); });
async function pushInit() { pushSt = await pushStatus('/annonce'); if (pushSt === 'on') pushRefresh('/annonce', pushPost); setBadge(0, '/annonce'); render(); }
// 📎 images / clip envoyés à LA CENTRAL (pub à publier telle quelle, ou exemple pour la création) + ☑️ droits sur la vidéo / musique
const MDT = {
  fr: { t: '📎 Images ou clip pour LA CENTRAL', h: 'Jusqu’à 5 images et 1 clip vidéo (30 Mo au plus). Chiffrés : seule LA CENTRAL les voit.', use: 'À quoi servent-ils ?', pub: 'C’est ma pub : à publier telle quelle', ex: 'C’est un exemple pour la création (SIMPLE / MOYEN / MAX)', rights: 'Je certifie que la vidéo / musique / les images sont à moi ou que j’ai le droit de les utiliser', need: 'Cochez la case des droits pour la vidéo ou la musique', jingle: '🎬 Pas de vidéo ? Demandez-nous un clip ou un jingle : choisissez une création ci-dessous (sur devis).', big: 'Clip trop lourd (30 Mo au plus)', sending: 'Envoi des fichiers…' },
  it: { t: '📎 Immagini o clip per LA CENTRAL', h: 'Fino a 5 immagini e 1 clip video (massimo 30 MB). Cifrati: solo LA CENTRAL li vede.', use: 'A cosa servono?', pub: 'È la mia pubblicità: da pubblicare così', ex: 'È un esempio per la creazione (SEMPLICE / MEDIO / MAX)', rights: 'Certifico che il video / la musica / le immagini sono miei o che ho il diritto di usarli', need: 'Spunta la casella dei diritti per il video o la musica', jingle: '🎬 Niente video? Chiedici un clip o un jingle: scegli una creazione qui sotto (su preventivo).', big: 'Clip troppo pesante (massimo 30 MB)', sending: 'Invio dei file…' },
  de: { t: '📎 Bilder oder Clip für LA CENTRAL', h: 'Bis zu 5 Bilder und 1 Videoclip (höchstens 30 MB). Verschlüsselt: nur LA CENTRAL sieht sie.', use: 'Wofür?', pub: 'Das ist meine Werbung: so veröffentlichen', ex: 'Das ist ein Beispiel für die Gestaltung (EINFACH / MITTEL / MAX)', rights: 'Ich bestätige, dass Video / Musik / Bilder mir gehören oder ich sie nutzen darf', need: 'Bitte das Kästchen zu den Rechten für Video oder Musik anhaken', jingle: '🎬 Kein Video? Fragen Sie uns nach einem Clip oder Jingle: wählen Sie unten eine Gestaltung (auf Angebot).', big: 'Clip zu groß (höchstens 30 MB)', sending: 'Dateien werden gesendet…' },
  pt: { t: '📎 Imagens ou clip para a LA CENTRAL', h: 'Até 5 imagens e 1 clip de vídeo (30 MB no máximo). Cifrados: só a LA CENTRAL os vê.', use: 'Para que servem?', pub: 'É a minha publicidade: publicar tal como está', ex: 'É um exemplo para a criação (SIMPLES / MÉDIO / MAX)', rights: 'Certifico que o vídeo / a música / as imagens são meus ou que tenho o direito de os usar', need: 'Marque a caixa dos direitos para o vídeo ou a música', jingle: '🎬 Sem vídeo? Peça-nos um clip ou um jingle: escolha uma criação abaixo (sob orçamento).', big: 'Clip demasiado pesado (30 MB no máximo)', sending: 'A enviar os ficheiros…' },
  en: { t: '📎 Images or clip for LA CENTRAL', h: 'Up to 5 images and 1 video clip (30 MB max). Encrypted: only LA CENTRAL sees them.', use: 'What are they for?', pub: 'This is my ad: publish it as is', ex: 'This is an example for the design (SIMPLE / MEDIUM / MAX)', rights: 'I certify that the video / music / images are mine or that I have the right to use them', need: 'Tick the rights box for the video or music', jingle: '🎬 No video? Ask us for a clip or a jingle: pick a design option below (on quote).', big: 'Clip too large (30 MB max)', sending: 'Sending files…' },
  es: { t: '📎 Imágenes o clip para LA CENTRAL', h: 'Hasta 5 imágenes y 1 clip de vídeo (30 MB como máximo). Cifrados: solo LA CENTRAL los ve.', use: '¿Para qué sirven?', pub: 'Es mi publicidad: publicar tal cual', ex: 'Es un ejemplo para la creación (SIMPLE / MEDIO / MAX)', rights: 'Certifico que el vídeo / la música / las imágenes son míos o que tengo derecho a usarlos', need: 'Marque la casilla de derechos para el vídeo o la música', jingle: '🎬 ¿Sin vídeo? Pídanos un clip o un jingle: elija una creación abajo (bajo presupuesto).', big: 'Clip demasiado pesado (30 MB como máximo)', sending: 'Enviando archivos…' },
};
const MD = () => MDT[lang] || MDT.fr;
let mFiles = []; // fichiers choisis (gardés ici : le formulaire se redessine)
const CLIP_MAX = 30 * 1024 * 1024, PART = 6 * 1024 * 1024;
const b64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(s); };
async function shrinkImg(file) {
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) return new Uint8Array(await file.arrayBuffer());
  const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height)), c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(bmp, 0, 0, c.width, c.height);
  return new Uint8Array(await (await new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.82))).arrayBuffer());
}
// chaque fichier part à part (un clip en morceaux de 6 Mo) ; la centrale les rassemble avec la référence de l'annonce
async function sendMedia(ref) {
  for (const f of mFiles) {
    const img = /^image\//.test(f.type), u8 = img ? await shrinkImg(f) : new Uint8Array(await f.arrayBuffer());
    const parts = Math.max(1, Math.ceil(u8.length / PART)), fid = Math.random().toString(36).slice(2, 10);
    for (let i = 0; i < parts; i++) await sendOwner({ type: 'an-media', ref, fid, name: String(f.name || '').slice(0, 80), mime: img ? 'image/jpeg' : f.type || 'video/mp4', i, parts, b: b64(u8.subarray(i * PART, (i + 1) * PART)) });
  }
}
function mediaHtml(f) {
  const u = MD();
  return `<label>${esc(u.t)}</label><p class="meta" style="margin:0 0 6px">${esc(u.h)}</p>
    <input type="file" data-media="1" accept="image/*,video/*" multiple>
    ${mFiles.length ? `<div class="chips" style="margin:6px 0">${mFiles.map((x, i) => `<span class="chip">${/^video\//.test(x.type) ? '🎬' : '🖼️'} ${esc(String(x.name || '').slice(0, 24))} · ${Math.max(1, Math.round(x.size / 1048576))} Mo <button type="button" class="linkb" data-mdel="${i}" aria-label="✖">✖</button></span>`).join('')}</div>
      <label>${esc(u.use)}</label><label class="radio"><input type="radio" name="muse" value="pub" ${f.muse !== 'ex' ? 'checked' : ''}> ${esc(u.pub)}</label><label class="radio"><input type="radio" name="muse" value="ex" ${f.muse === 'ex' ? 'checked' : ''}> ${esc(u.ex)}</label>` : ''}
    <label class="radio" style="margin-top:8px"><input type="checkbox" data-rights="1" ${f.droits ? 'checked' : ''}> ☑️ ${esc(u.rights)}</label>`;
}
function planHtml(f) {
  const u = PS(), tr = (data && data.tarifs) || {}, nB = PACK_N[f.pack] || 1, bs = fBands(f);
  const r = (name, val, cur, txt, extra = '') => `<label class="radio"><input type="radio" name="${name}" value="${val}" ${cur === val ? 'checked' : ''}> ${esc(txt)}${extra}</label>`;
  return `<label>${esc(u.pack)}</label>${['start', 'plus', 'max'].map((k) => r('pack', k, f.pack, u.pk[k], tr['pk_' + k] && tr.mode !== 'band' ? `<span class="meta">${esc(String(tr['pk_' + k]))} € ${esc(TP().ht)} ${esc(u.month)}</span>` : '')).join('')}
    <label>${esc(u.bands)} <span class="meta">(${esc(f.pack === 'max' ? u.pk.max : u.choose(nB))})</span></label><div class="chips">${BANDS.map(([k, a, b]) => `<label class="chip"><input type="checkbox" data-band="${k}" ${bs.includes(k) ? 'checked' : ''} ${f.pack === 'max' ? 'disabled' : ''}> ${esc(u.bt[k])} <span class="meta">${a}–${b}</span></label>`).join('')}</div>
    <label>${esc(u.per)}</label>${r('per', 'week', f.we ? 'we' : 'week', u.week)}${r('per', 'we', f.we ? 'we' : 'week', u.we)}
    <label>${esc(u.pos)}</label>${['rot', 'haut', 'milieu', 'bas'].map((k) => r('pslot', k, f.slot, u.ps[k])).join('')}
    ${f.slot === 'haut' ? `<label class="radio"><input type="checkbox" data-down="1" ${f.down ? 'checked' : ''}> ${esc(u.down)}</label>` : ''}
    <div class="two"><div><label>${esc(T().from || 'Début')}</label><input type="date" data-k="debut" value="${esc(f.debut)}"></div><div><label>${esc(u.dur)}</label><div style="display:flex;gap:6px"><input type="number" min="1" max="365" data-k="dn" value="${esc(String(f.dn || 1))}" style="width:80px"><select data-k="du">${['d', 'w', 'm', 'y'].map((k) => `<option value="${k}" ${(f.du || 'm') === k ? 'selected' : ''}>${esc(u.du[k])}</option>`).join('')}</select></div></div></div>
    <p class="meta" style="margin:4px 0 0">${esc(u.disc)}</p>`;
}
function formHtml(t) {
  const f = form, tr = (data && data.tarifs) || {}, p = priceOf(f);
  return `<div class="card frm"><h2>${esc(f.id ? t.edit : t.newA)}</h2>
    <label>${esc(t.type)}</label><select data-k="type">${TYPES.map((k) => `<option value="${k}" ${f.type === k ? 'selected' : ''}>${esc(t.Ty[k])}</option>`).join('')}</select>
    <label>${esc(t.title)}</label><input data-k="nom" value="${esc(f.nom)}">
    <label>${esc(t.text)}</label><textarea data-k="texte" rows="4">${esc(f.texte)}</textarea>
    <label>${esc(t.addr)}</label><input data-k="adresse" value="${esc(f.adresse)}">
    <div class="two"><div><label>${esc(t.tel)}</label><input data-k="tel" type="tel" value="${esc(f.tel)}"></div><div><label>${esc(t.web)}</label><input data-k="web" type="url" value="${esc(f.web)}" placeholder="https://…"></div></div>
    <label>${esc(t.video)}</label><input data-k="video" type="url" value="${esc(f.video)}" placeholder="https://…">
    ${mediaHtml(f)}
    ${planHtml(f)}
    <label>✍️ ${esc(SPX[lang] ? SPX[lang][0] : SPX.fr[0])}</label><textarea data-k="special" rows="2" placeholder="${esc(SPX[lang] ? SPX[lang][1] : SPX.fr[1])}">${esc(f.special || '')}</textarea>
    <p class="meta" style="margin:10px 0 0">${esc(MD().jingle)}</p>
    <label>🎬 ${esc((CRT[lang] || CRT.fr).t)}</label><select data-k="crea">${['', 'simple', 'moyen', 'max'].map((k) => `<option value="${k}" ${(f.crea || '') === k ? 'selected' : ''}>${esc((CRT[lang] || CRT.fr)[k || 'none'])}${k ? ' — ' + (+tr['crea_' + k] ? esc(eur(+tr['crea_' + k])) + ' ' + esc(TP().ht) : esc(t.quote)) : ''}</option>`).join('')}</select>
    <p class="est">${esc(t.price)} : <b>${p ? p + ' € ' + esc(TP().ht) : esc(t.quote) + ' — ' + esc((CRT[lang] || CRT.fr).q3)}</b>${tr.note ? `<br><span class="meta">${esc(tr.note)}</span>` : ''}</p>
    <div class="duo"><button class="btn sec" data-cancel="1">${esc(t.cancel)}</button><button class="btn" data-send="1">${esc(t.send)}</button></div></div>`;
}
function adHtml(a, t) {
  const st = a.st === 'ok' && a.fin && a.fin < today ? 'end' : a.st, u = TP();
  return `<div class="ad ${st === 'pay' ? 'wait' : st}"><div style="display:flex;justify-content:space-between;gap:8px"><b>${esc(t.Ty[a.type] || '')} · ${esc(a.nom)}</b><span class="tag">${esc(st === 'pay' ? u.st : t.St[st] || '')}</span></div>
    <p style="margin:4px 0 0;white-space:pre-wrap">${esc(a.texte)}</p>${a.crea ? `<p class="meta" style="margin:4px 0 0">🎬 ${esc((CRT[lang] || CRT.fr)[a.crea] || '')}</p>` : ''}
    <p class="meta" style="margin:4px 0 0">${esc(t.Sl[a.slot] || (PS().ps[a.slot] || '').split(' — ')[0])}${a.bands && a.bands.length ? ' · ' + a.bands.map((k) => esc(PS().bt[k] || k)).join(', ') : ''}${a.we ? ' · 🎉' : ''} · ${(a.aud || []).map((k) => esc(t.Au[k] || '')).join(' · ')}<br>📅 ${esc(a.debut)} → ${esc(a.fin)}${a.jours && a.jours.length ? ' · ' + a.jours.map((j) => esc(t.D[j])).join(' ') : ''}${a.h1 ? ` · ${esc(a.h1)}–${esc(a.h2)}` : ''}${a.prix ? ' · ' + esc(a.prix) + ' € ' + esc(u.ht) : ''}</p>
    ${st === 'pay' ? payHtml(a) : ''}
    ${a.st === 'no' && a.motif ? `<p class="warnt">${esc(t.motif)} : ${esc(a.motif)}</p>` : ''}
    ${a.st === 'ok' ? `<p class="meta" style="margin:4px 0 0">📊 <b>${esc(a.v || 0)}</b> ${esc(t.views)} · <b>${esc(a.taps || 0)}</b> ${esc(t.clicks)}</p>` : ''}
    <div class="btns">${st !== 'end' ? `<button class="btn sm sec" data-edit="${esc(a.id)}">${esc(t.edit)}</button><button class="btn sm sec" data-stop="${esc(a.id)}">${esc(t.stop)}</button>` : ''}
      ${a.fact ? `<button class="btn sm sec" data-inv="${esc(a.id)}">${esc(u.inv)}</button>` : ''}
      ${st === 'pay' ? `<span class="paywrap"><button class="btn sm" disabled aria-disabled="true">${esc(t.pay)}</button><button class="info-dot" data-payinfo="${esc(a.id)}" aria-label="Info">ℹ️</button></span>` : ''}</div>
    ${payOpen === a.id ? `<p class="bubble">ℹ️ ${esc(u.card)}</p>` : ''}</div>`;
}
// 📬 Réponses de LA CENTRAL sur mes annonces (acceptée / à payer / refusée), en haut de l'app jusqu'à « Vu »
const RPT = { fr: { t: '📬 Réponse de LA CENTRAL', pay: 'acceptée — à payer', ok: 'acceptée et en ligne', no: 'non retenue', seen: '👍 Vu' }, it: { t: '📬 Risposta di LA CENTRAL', pay: 'accettato — da pagare', ok: 'accettato e online', no: 'non idoneo', seen: '👍 Visto' }, de: { t: '📬 Antwort von LA CENTRAL', pay: 'angenommen — zu bezahlen', ok: 'angenommen und online', no: 'nicht angenommen', seen: '👍 Gesehen' }, pt: { t: '📬 Resposta da LA CENTRAL', pay: 'aceite — a pagar', ok: 'aceite e online', no: 'não aceite', seen: '👍 Visto' }, en: { t: '📬 Reply from LA CENTRAL', pay: 'accepted — to pay', ok: 'accepted and online', no: 'not accepted', seen: '👍 Seen' }, es: { t: '📬 Respuesta de LA CENTRAL', pay: 'aceptado — a pagar', ok: 'aceptado y en línea', no: 'no aceptado', seen: '👍 Visto' } };
const seenGet = () => { try { return JSON.parse(ls.get('annSeen:' + id) || '{}'); } catch { return {}; } };
function repliesCard() {
  const r = RPT[lang] || RPT.fr, seen = seenGet();
  const news = (data.ads || []).filter((a) => ['pay', 'ok', 'no'].includes(a.st) && seen[a.id] !== a.st && !(a.st === 'ok' && a.fin && a.fin < today));
  if (!news.length) return '';
  return `<div class="card" style="border-left:5px solid #2563eb"><h2 style="margin-top:0">${esc(r.t)}</h2>${news.map((a) => `<p style="margin:6px 0">${a.st === 'no' ? '❌' : '✅'} <b>«&nbsp;${esc(a.nom)}&nbsp;»</b> ${esc(r[a.st])}${a.st === 'pay' && a.ttc ? ` : <b>${esc(eur(a.ttc))}</b>` : ''}${a.st === 'no' && a.motif ? ` — ${esc(a.motif)}` : ''}</p>`).join('')}<button class="btn sm sec" data-seen="1">${esc(r.seen)}</button></div>`;
}
// 🧾 Récapitulatif de mes annonces (n°, aperçu, dates, horaires, emplacement, état, prix) + solde, imprimable en A4
const RCT = {
  fr: { t: '🧾 Récapitulatif de mes annonces', n: 'annonce(s)', paid: 'Payé', due: 'Reste à payer', wait: 'En attente de prix', print: '🖨️ Imprimer (A4)', cols: ['N°', 'Aperçu', 'Annonce', 'Emplacement', 'Dates', 'Jours / heures', 'État', 'Prix TTC'], every: 'tous les jours', tot: 'Total facturé', saldo: 'Solde', on: 'Imprimé le' },
  it: { t: '🧾 Riepilogo dei miei annunci', n: 'annuncio/i', paid: 'Pagato', due: 'Da pagare', wait: 'In attesa di prezzo', print: '🖨️ Stampa (A4)', cols: ['N°', 'Anteprima', 'Annuncio', 'Posizione', 'Date', 'Giorni / ore', 'Stato', 'Prezzo IVA incl.'], every: 'tutti i giorni', tot: 'Totale fatturato', saldo: 'Saldo', on: 'Stampato il' },
  de: { t: '🧾 Übersicht meiner Anzeigen', n: 'Anzeige(n)', paid: 'Bezahlt', due: 'Offen', wait: 'Preis ausstehend', print: '🖨️ Drucken (A4)', cols: ['Nr.', 'Vorschau', 'Anzeige', 'Platz', 'Daten', 'Tage / Uhrzeit', 'Status', 'Preis brutto'], every: 'jeden Tag', tot: 'Gesamt berechnet', saldo: 'Saldo', on: 'Gedruckt am' },
  pt: { t: '🧾 Resumo dos meus anúncios', n: 'anúncio(s)', paid: 'Pago', due: 'Por pagar', wait: 'A aguardar preço', print: '🖨️ Imprimir (A4)', cols: ['N.º', 'Pré-visualização', 'Anúncio', 'Posição', 'Datas', 'Dias / horas', 'Estado', 'Preço c/ IVA'], every: 'todos os dias', tot: 'Total faturado', saldo: 'Saldo', on: 'Impresso em' },
  en: { t: '🧾 Summary of my ads', n: 'ad(s)', paid: 'Paid', due: 'To pay', wait: 'Awaiting price', print: '🖨️ Print (A4)', cols: ['No.', 'Preview', 'Ad', 'Position', 'Dates', 'Days / hours', 'Status', 'Price incl. VAT'], every: 'every day', tot: 'Total invoiced', saldo: 'Balance', on: 'Printed on' },
  es: { t: '🧾 Resumen de mis anuncios', n: 'anuncio(s)', paid: 'Pagado', due: 'Por pagar', wait: 'Esperando precio', print: '🖨️ Imprimir (A4)', cols: ['N.º', 'Vista', 'Anuncio', 'Posición', 'Fechas', 'Días / horas', 'Estado', 'Precio IVA incl.'], every: 'todos los días', tot: 'Total facturado', saldo: 'Saldo', on: 'Impreso el' },
};
function recapRows() {
  const t = T(), r = RCT[lang] || RCT.fr, logo = ls.get('annLogo:' + id) || '';
  const ads = [...(data.ads || [])].sort((a, b) => String(a.debut || '').localeCompare(String(b.debut || '')));
  return ads.map((a, i) => {
    const st = a.st === 'ok' && a.fin && a.fin < today ? 'end' : a.st;
    const amt = a.fact ? +a.fact.ttc || 0 : a.st === 'pay' ? +a.ttc || 0 : 0;
    return { n: i + 1, a, st, logo, amt, paid: a.fact ? amt : 0, due: a.st === 'pay' ? amt : 0, when: `${a.debut || ''} → ${a.fin || ''}`, hrs: `${a.jours && a.jours.length ? a.jours.map((j) => t.D[j]).join(' ') : r.every}${a.h1 && a.h2 ? ' · ' + a.h1 + '–' + a.h2 : ''}`, stLbl: st === 'pay' ? TP().st : t.St[st] || '' };
  });
}
function recapCard() {
  const r = RCT[lang] || RCT.fr, rows = recapRows();
  if (!rows.length) return '';
  const paid = rows.reduce((x, y) => x + y.paid, 0), due = rows.reduce((x, y) => x + y.due, 0), nw = rows.filter((y) => y.st === 'wait').length;
  return `<div class="card"><h2>${esc(r.t)}</h2><p style="margin:0 0 6px"><b>${rows.length}</b> ${esc(r.n)} · ${esc(r.paid)} <b>${esc(eur(paid))}</b> · ${esc(r.due)} <b style="color:${due ? '#b91c1c' : 'inherit'}">${esc(eur(due))}</b>${nw ? ` · ${esc(r.wait)} : ${nw}` : ''}</p>
    <button class="btn block sec" data-recap-print="1">${esc(r.print)}</button></div>`;
}
function recapPrint() {
  const t = T(), r = RCT[lang] || RCT.fr, rows = recapRows(), d = data;
  const paid = rows.reduce((x, y) => x + y.paid, 0), due = rows.reduce((x, y) => x + y.due, 0), tot = paid + due;
  const thumb = (y) => `<div style="width:64px;height:48px;border:1px solid #ccc;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:22px;background:#fafafa">${y.logo ? `<img src="${esc(y.logo)}" style="max-width:60px;max-height:44px;object-fit:contain">` : esc((t.Ty[y.a.type] || '📣').split(' ')[0])}</div>`;
  const html = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><title>${esc(r.t)}</title><style>@page{size:A4;margin:14mm}body{font:11pt system-ui,sans-serif;color:#111}h1{font-size:16pt;margin:0 0 4px}table{width:100%;border-collapse:collapse;margin-top:10px}th,td{border-bottom:1px solid #ddd;padding:6px 5px;text-align:left;vertical-align:top;font-size:9.5pt}th{background:#f3f4f6}td.r,th.r{text-align:right}.tot td{border:0;font-weight:700}</style></head><body>
    <h1>${esc(r.t.replace('🧾 ', ''))}</h1><div>${esc(d.nom || '')}${d.adresse ? ' · ' + esc(d.adresse) : ''} — ${esc(d.reseau || '')}</div><div style="color:#666;font-size:9pt">${esc(r.on)} ${esc(new Date().toLocaleDateString(lang))}</div>
    <table><tr>${r.cols.map((c, i) => `<th${i === 7 ? ' class="r"' : ''}>${esc(c)}</th>`).join('')}</tr>
    ${rows.map((y) => `<tr><td>${y.n}</td><td>${thumb(y)}</td><td><b>${esc(t.Ty[y.a.type] || '')}</b><br>${esc(y.a.nom)}${y.a.fact ? `<br><span style="color:#666">🧾 ${esc(y.a.fact.no || '')}</span>` : ''}</td><td>${esc(t.Sl[y.a.slot] || '')}</td><td>${esc(y.when)}</td><td>${esc(y.hrs)}</td><td>${esc(y.stLbl)}</td><td class="r">${y.amt ? esc(eur(y.amt)) : '—'}</td></tr>`).join('')}
    <tr class="tot"><td colspan="7" class="r">${esc(r.tot)}</td><td class="r">${esc(eur(tot))}</td></tr>
    <tr class="tot"><td colspan="7" class="r">${esc(r.paid)}</td><td class="r">${esc(eur(paid))}</td></tr>
    <tr class="tot"><td colspan="7" class="r">${esc(r.saldo)} (${esc(r.due)})</td><td class="r" style="color:${due ? '#b91c1c' : '#111'}">${esc(eur(due))}</td></tr></table>
    <script>onload=()=>setTimeout(()=>print(),300)<\/script></body></html>`;
  const w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); }
}
// 📣 les annonces des AUTRES annonceurs, aux 3 emplacements (comme les locataires les voient)
const ADT = { fr: { lbl: 'Annonce', see: '📍 Voir', call: '📞 Appeler', why: 'Votre annonce peut être ici aussi : elle passe dans les apps des locataires, des clients et de tous les annonceurs.' }, it: { lbl: 'Annuncio', see: '📍 Vedi', call: '📞 Chiama', why: 'Il vostro annuncio può stare qui: passa nelle app di inquilini, clienti e di tutti gli annunciatori.' }, de: { lbl: 'Anzeige', see: '📍 Ansehen', call: '📞 Anrufen', why: 'Ihre Anzeige kann auch hier stehen: in den Apps der Mieter, Kunden und aller Inserenten.' }, pt: { lbl: 'Anúncio', see: '📍 Ver', call: '📞 Ligar', why: 'O seu anúncio pode estar aqui: aparece nas apps dos inquilinos, clientes e de todos os anunciantes.' }, en: { lbl: 'Ad', see: '📍 See', call: '📞 Call', why: 'Your ad can be here too: it shows in the apps of tenants, clients and all advertisers.' }, es: { lbl: 'Anuncio', see: '📍 Ver', call: '📞 Llamar', why: 'Su anuncio puede estar aquí: aparece en las apps de inquilinos, clientes y todos los anunciantes.' } };
let others = [];
const pubNow = (x) => { const n = new Date(), hm = String(n.getHours()).padStart(2, '0') + ':' + String(n.getMinutes()).padStart(2, '0'); return (!x.jours || !x.jours.length || x.jours.includes(n.getDay())) && (!x.h1 || !x.h2 || (x.h1 <= x.h2 ? hm >= x.h1 && hm < x.h2 : hm >= x.h1 || hm < x.h2)); };
const pubLogo = (x) => (/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(x.logo || '') && x.logo.length < 60000 ? `<img src="${x.logo}" alt="" style="float:right;max-height:44px;max-width:90px;object-fit:contain;border-radius:8px;margin:0 0 4px 8px;background:#fff">` : ''); // logo de l'annonceur
// 🔽 annonces repliables : celles fermées restent fermées sur ce téléphone
const adShut = () => { try { return new Set(JSON.parse(localStorage.getItem('adShut') || '[]')); } catch { return new Set(); } };
document.addEventListener('toggle', (e) => { const d = e.target; if (!d.classList || !d.classList.contains('pub-box')) return; const s = adShut(); if (d.open) s.delete(d.dataset.pid); else s.add(d.dataset.pid); try { localStorage.setItem('adShut', JSON.stringify([...s].slice(-60))); } catch { /* stockage plein */ } }, true);
function adBox(x) {
  const t = ADT[lang] || ADT.fr, v = x.video ? videoEmbed(x.video) : null;
  return `<details class="card pub-box" data-pid="${esc(x.id)}"${adShut().has(x.id) ? '' : ' open'}><summary style="cursor:pointer;list-style:none"><div class="meta"><b>📣 ${esc(t.lbl)}</b> <span style="float:right" aria-hidden="true">▾</span></div>${pubLogo(x)}<b style="display:block">${esc(x.nom)}</b></summary><p style="margin:4px 0 0;white-space:pre-wrap">${esc(x.texte)}</p>${v ? `<div class="vid" data-vsrc="${esc(v.src)}"></div>` : ''}
    <div class="btns">${x.adresse ? `<a class="btn sm" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(x.adresse)}" target="_blank" rel="noopener" data-pev="map">${esc(t.see)}</a>` : ''}${x.tel ? `<a class="btn sm sec" href="tel:${esc(x.tel.replace(/[^\d+]/g, ''))}" data-pev="call">${esc(t.call)}</a>` : ''}</div>${pubSocialBar(x)}</details>`;
}
// ✍️ demande spéciale (hors des prix affichés) : LA CENTRAL répond, avec un prix sur devis si besoin
const SPX = { fr: ['Demande spéciale (facultatif)', 'ex. plusieurs emplacements, une semaine précise, un prix pour 3 mois…'], it: ['Richiesta speciale (facoltativa)', 'es. più posizioni, una settimana precisa, un prezzo per 3 mesi…'], de: ['Sonderwunsch (freiwillig)', 'z. B. mehrere Plätze, eine bestimmte Woche, ein Preis für 3 Monate…'], pt: ['Pedido especial (facultativo)', 'ex. várias posições, uma semana precisa, um preço para 3 meses…'], en: ['Special request (optional)', 'e.g. several positions, a given week, a price for 3 months…'], es: ['Petición especial (opcional)', 'ej. varias posiciones, una semana concreta, un precio para 3 meses…'] };
let logoOpen = false, profMsg = '', recMsg = '';
// ✏️ profil (société, mail, site, TVA, IBAN + banque pour les remboursements) et ⚠️ réclamations
const PFT = {
  fr: { p: '🏢 Ma société', nom: 'Nom de la société', mail: 'E-mail', web: 'Site web', tva: 'N° TVA', iban: 'IBAN (pour un remboursement)', bq: 'Banque', save: '💾 Enregistrer', ok: 'Enregistré ✓ — envoyé à LA CENTRAL', r: '⚠️ Réclamation', why: 'Pourquoi ?', M: ['Mon annonce ne se voit pas', 'Erreur dans mon annonce', 'Facture / paiement', 'Demande de remboursement', 'Autre'], txt: 'Expliquez le problème', send: 'Envoyer la réclamation', sent: 'Réclamation envoyée ✓ — réponse sous 3 jours max', rep: 'Réponse' },
  it: { p: '🏢 La mia società', nom: 'Nome della società', mail: 'E-mail', web: 'Sito web', tva: 'N° IVA', iban: 'IBAN (per un rimborso)', bq: 'Banca', save: '💾 Salva', ok: 'Salvato ✓ — inviato a LA CENTRAL', r: '⚠️ Reclamo', why: 'Perché?', M: ['Il mio annuncio non si vede', 'Errore nel mio annuncio', 'Fattura / pagamento', 'Richiesta di rimborso', 'Altro'], txt: 'Spiegate il problema', send: 'Invia il reclamo', sent: 'Reclamo inviato ✓ — risposta entro 3 giorni max', rep: 'Risposta' },
  de: { p: '🏢 Meine Firma', nom: 'Firmenname', mail: 'E-Mail', web: 'Website', tva: 'USt-IdNr.', iban: 'IBAN (für eine Rückerstattung)', bq: 'Bank', save: '💾 Speichern', ok: 'Gespeichert ✓ — an LA CENTRAL gesendet', r: '⚠️ Reklamation', why: 'Warum?', M: ['Meine Anzeige ist nicht sichtbar', 'Fehler in meiner Anzeige', 'Rechnung / Zahlung', 'Rückerstattung', 'Sonstiges'], txt: 'Beschreiben Sie das Problem', send: 'Reklamation senden', sent: 'Reklamation gesendet ✓ — Antwort in max. 3 Tagen', rep: 'Antwort' },
  pt: { p: '🏢 A minha empresa', nom: 'Nome da empresa', mail: 'E-mail', web: 'Site', tva: 'N.º IVA', iban: 'IBAN (para um reembolso)', bq: 'Banco', save: '💾 Guardar', ok: 'Guardado ✓ — enviado à LA CENTRAL', r: '⚠️ Reclamação', why: 'Porquê?', M: ['O meu anúncio não aparece', 'Erro no meu anúncio', 'Fatura / pagamento', 'Pedido de reembolso', 'Outro'], txt: 'Explique o problema', send: 'Enviar a reclamação', sent: 'Reclamação enviada ✓ — resposta em 3 dias no máx.', rep: 'Resposta' },
  en: { p: '🏢 My company', nom: 'Company name', mail: 'E-mail', web: 'Website', tva: 'VAT no.', iban: 'IBAN (for a refund)', bq: 'Bank', save: '💾 Save', ok: 'Saved ✓ — sent to LA CENTRAL', r: '⚠️ Complaint', why: 'Why?', M: ['My ad is not showing', 'Mistake in my ad', 'Invoice / payment', 'Refund request', 'Other'], txt: 'Explain the problem', send: 'Send the complaint', sent: 'Complaint sent ✓ — reply within 3 days max', rep: 'Reply' },
  es: { p: '🏢 Mi empresa', nom: 'Nombre de la empresa', mail: 'E-mail', web: 'Sitio web', tva: 'N.º IVA', iban: 'IBAN (para un reembolso)', bq: 'Banco', save: '💾 Guardar', ok: 'Guardado ✓ — enviado a LA CENTRAL', r: '⚠️ Reclamación', why: '¿Por qué?', M: ['Mi anuncio no se ve', 'Error en mi anuncio', 'Factura / pago', 'Solicitud de reembolso', 'Otro'], txt: 'Explique el problema', send: 'Enviar la reclamación', sent: 'Reclamación enviada ✓ — respuesta en 3 días máx.', rep: 'Respuesta' },
};
function profCard() {
  const u = PFT[lang] || PFT.fr, pr = { nom: data.nom || '', ...(data.prof || {}) };
  const inp = (k, lbl, type = 'text') => `<label>${esc(lbl)}</label><input data-pf="${k}" type="${type}" value="${esc(pr[k] || '')}">`;
  return `<div class="card"><h2 style="margin-top:0">${esc(u.p)}</h2>${inp('nom', u.nom)}${inp('email', u.mail, 'email')}${inp('web', u.web, 'url')}${inp('tva', u.tva)}${inp('iban', u.iban)}${inp('banque', u.bq)}
    <button class="btn block" style="margin-top:10px" data-pf-save="1">${esc(u.save)}</button>${profMsg ? `<p class="ok" style="margin:8px 0 0">${esc(profMsg)}</p>` : ''}</div>`;
}
function recCard() {
  const u = PFT[lang] || PFT.fr;
  return `<div class="card"><h2 style="margin-top:0">${esc(u.r)}</h2><label>${esc(u.why)}</label><select data-rc-m="1">${u.M.map((m) => `<option>${esc(m)}</option>`).join('')}</select>
    <label>${esc(u.txt)}</label><textarea data-rc-t="1" rows="3"></textarea><button class="btn block" style="margin-top:10px" data-rc-send="1">${esc(u.send)}</button>${recMsg ? `<p class="ok" style="margin:8px 0 0">${esc(recMsg)}</p>` : ''}
    ${(data.recs || []).slice().reverse().map((r) => `<div class="ad" style="margin-top:10px"><b>${esc(r.motif)}</b> <span class="meta">${esc(String(r.t || '').slice(0, 10))}</span><p style="margin:4px 0 0;white-space:pre-wrap">${esc(r.texte)}</p>${r.rep ? `<p class="ok" style="margin:6px 0 0">💬 ${esc(u.rep)} : ${esc(r.rep)}</p>` : ''}</div>`).join('')}</div>`;
}
// 🎬 création de l'annonce par LA CENTRAL (prix fixés par la centrale, ou sur devis en 3 jours max)
const CRT = {
  fr: { t: 'Création de votre annonce par nous', none: 'Non merci — j’envoie mon texte tel quel', simple: 'SIMPLE — page fixe avec votre texte, graphisme surprise', moyen: 'MOYEN — clip animé avec votre texte, surprise', max: 'MAX — vidéo-clip, surprise', q3: 'réponse sous 3 jours max', d: 'jours de diffusion' },
  it: { t: 'Creazione del vostro annuncio da parte nostra', none: 'No grazie — mando il mio testo così com’è', simple: 'SEMPLICE — pagina fissa con il vostro testo, grafica a sorpresa', moyen: 'MEDIO — clip animata con il vostro testo, a sorpresa', max: 'MAX — video-clip, a sorpresa', q3: 'risposta entro 3 giorni max', d: 'giorni di diffusione' },
  de: { t: 'Gestaltung Ihrer Anzeige durch uns', none: 'Nein danke — ich sende meinen Text so', simple: 'EINFACH — feste Seite mit Ihrem Text, Überraschungsgrafik', moyen: 'MITTEL — animierter Clip mit Ihrem Text, Überraschung', max: 'MAX — Videoclip, Überraschung', q3: 'Antwort in max. 3 Tagen', d: 'Tage Ausstrahlung' },
  pt: { t: 'Criação do seu anúncio por nós', none: 'Não, obrigado — envio o meu texto assim', simple: 'SIMPLES — página fixa com o seu texto, grafismo surpresa', moyen: 'MÉDIO — clip animado com o seu texto, surpresa', max: 'MAX — videoclip, surpresa', q3: 'resposta em 3 dias no máx.', d: 'dias de difusão' },
  en: { t: 'We create your ad', none: 'No thanks — I send my text as is', simple: 'SIMPLE — static page with your text, surprise design', moyen: 'MEDIUM — animated clip with your text, surprise', max: 'MAX — video clip, surprise', q3: 'reply within 3 days max', d: 'days on air' },
  es: { t: 'Creación de su anuncio por nosotros', none: 'No gracias — envío mi texto tal cual', simple: 'SIMPLE — página fija con su texto, diseño sorpresa', moyen: 'MEDIO — clip animado con su texto, sorpresa', max: 'MAX — videoclip, sorpresa', q3: 'respuesta en 3 días máx.', d: 'días de difusión' },
};
const LGT = { fr: 'Votre logo apparaît dans vos annonces, dans toutes les apps (locataires, clients, équipes…).', it: 'Il vostro logo compare nei vostri annunci, in tutte le app (inquilini, clienti, squadre…).', de: 'Ihr Logo erscheint in Ihren Anzeigen, in allen Apps (Mieter, Kunden, Teams…).', pt: 'O seu logótipo aparece nos seus anúncios, em todas as apps (inquilinos, clientes, equipas…).', en: 'Your logo appears in your ads, in every app (tenants, clients, teams…).', es: 'Su logo aparece en sus anuncios, en todas las apps (inquilinos, clientes, equipos…).' };
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
  const d = data, out = [], today = new Date().toISOString().slice(0, 10);
  const pubs = others.filter((x) => (!x.fin || x.fin >= today) && (!x.debut || x.debut <= today) && pubNow(x) && pubLive(x)), slot = (k) => { const l = pubs.filter((x) => pubSlotNow(x) === k); return pubPickNow(l); };
  document.title = `📣 ${d.nom}`;
  const lg = ls.get('annLogo:' + id) || '';
  out.push(`<div class="top"><span class="brandx" style="display:flex;align-items:center;gap:10px"><button class="av-wrap" data-logo-open="1" aria-label="Logo"><span class="av-btn">${lg ? `<img src="${esc(lg)}" alt="" style="object-fit:contain;background:#fff">` : '📣'}</span><span class="av-pen" aria-hidden="true">✏️</span></button><b>${esc(d.nom)}</b></span>${langs}</div><p class="sub">${esc(t.app)} · ${esc(d.reseau)}</p>`);
  if (logoOpen) out.push(`<div class="card"><h2 style="margin-top:0">🖼️ Logo</h2><p class="meta" style="margin:0 0 10px">${esc((LGT[lang] || LGT.fr))}</p><div style="display:flex;gap:8px;flex-wrap:wrap"><label class="btn sec sm" style="cursor:pointer;margin:0">${lg ? '🔄' : '➕'} Logo<input type="file" accept="image/*" data-logo="1" hidden></label>${lg ? '<button class="btn sec sm" data-logo-del="1">✖</button>' : ''}<button class="btn sm" data-logo-open="1">OK</button></div></div>${profCard()}${recCard()}<div class="card"><button class="btn sec block" data-reset="1">🔑 ${esc(t.reset)}</button></div>`);
  out.push(domierHtml({ tel: DOM_TEL, form: true, list: d.doms || [], lang })); // 🔧 DOMIER : directement à LUXINTERVENTION
  { const p = slot('haut'); if (p) out.push(adBox(p) + `<p class="meta" style="margin:-4px 0 12px">💡 ${esc((ADT[lang] || ADT.fr).why)}</p>`); }
  if (pushSt && pushSt !== 'unsupported' && (pushSt !== 'on' || pushJust)) out.push(`<div class="card"><h2>${esc(t.notif)}</h2><p class="meta" style="margin:0 0 8px">${esc(t.notifHint)}</p>${pushSt === 'on' ? `<p class="ok" style="margin:0">${esc(t.notifOk)}</p>` : `<button class="btn sm" data-push="1">${esc(t.notifOn)}</button>`}</div>`);
  out.push(repliesCard());
  if (msg) out.push(`<div class="card okc"><p style="margin:0">${esc(msg)}</p></div>`);
  out.push(form ? formHtml(t) : `<button class="btn block big" data-new="1">${esc(t.newA)}</button>`);
  const pend = (() => { try { return JSON.parse(ls.get('annPend:' + id) || '[]'); } catch { return []; } })();
  const ads = [...pend.filter((p) => !(d.ads || []).some((a) => a.id === p.id && p.id)), ...(d.ads || [])];
  // 🔽 « Mes annonces » repliable (choix gardé sur ce téléphone)
  out.push(`<details class="card" data-mine-fold="1"${ls.get('annMineShut') ? '' : ' open'}><summary style="cursor:pointer;list-style:none;display:flex;align-items:center;gap:8px"><h2 style="margin:0;flex:1">${esc(t.mine)}${ads.length ? ` <span class="meta">(${ads.length})</span>` : ''}</h2><span class="meta" aria-hidden="true">▾</span></summary><div style="margin-top:10px">${ads.length ? ads.map((a) => adHtml(a, t)).join('') : `<p class="meta" style="margin:0">${esc(t.none)}</p>`}</div></details>`);
  { const p = slot('milieu'); if (p) out.push(adBox(p)); }
  out.push(pchatCard()); // 💬 service après-vente 24 h / 24 : messages avec la centrale
  out.push(`<p class="meta safe">${esc(t.safe)}</p>`);
  out.push(recapCard());
  { const p = slot('bas'); if (p) out.push(adBox(p)); }
  out.push(newsHtml(API));
  out.push(infoBox({ lang }));
  const keep = new Map([...document.querySelectorAll('.vid iframe')].map((f) => [f.dataset.src, f]));
  app.innerHTML = out.join('');
  document.querySelectorAll('.vid[data-vsrc]').forEach((v) => { const src = v.dataset.vsrc, old = keep.get(src); if (old) return v.append(old); const f = document.createElement('iframe'); f.src = src; f.dataset.src = src; f.loading = 'lazy'; f.allow = 'autoplay; encrypted-media; picture-in-picture'; f.setAttribute('allowfullscreen', ''); f.referrerPolicy = 'strict-origin-when-cross-origin'; v.append(f); });
  pubSeen(app);
  pubSocialLoad(app);
}
async function load() {
  data = null;
  if (id && key) {
    try {
      const r = await fetch(`${API}/api/esp/${id}`, { cache: 'no-store' });
      if (r.ok) { const x = await openJson(key, await r.arrayBuffer()); if (x && x.kind === 'annonce') { data = x; netPubsGet(API).then((it) => { others = netPubsFor(it, 'ann', x.adresse || '', (x.ads || []).map((a) => a.id)); if (data === x) render(); }); } else { ls.set(ACC, null); location.replace(`/espace.html#${id}.${key}`); return; } }
      else if (r.status === 404) { ls.set(ACC, null); id = key = ''; loadErr = T().off; }
    } catch { loadErr = '⚠ offline'; }
  }
  if (!lang) { const n = (navigator.language || 'fr').slice(0, 2); lang = LANGS.includes(n) ? n : 'fr'; }
  // envois déjà reçus par LA CENTRAL : on oublie la copie locale
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
// 🖼️ logo : réduit à 160 px (petit, il voyage avec l'annonce dans toutes les apps) et gardé pour les annonces suivantes
app.addEventListener('change', async (e) => {
  const el = e.target;
  if (!el.dataset.logo || !el.files[0]) return;
  try {
    const bmp = await createImageBitmap(el.files[0]), k = Math.min(1, 160 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    let u = c.toDataURL('image/png'); if (u.length > 40000) u = c.toDataURL('image/jpeg', 0.8);
    if (u.length > 55000) return;
    if (form) form.logo = u; ls.set('annLogo:' + id, u); render();
  } catch { /* image illisible */ }
});
app.addEventListener('input', (e) => { const el = e.target; if (form && el.dataset.k) { form[el.dataset.k] = el.value; if (['debut', 'fin', 'crea', 'du'].includes(el.dataset.k)) render(); else if (el.dataset.k === 'dn') { const p = app.querySelector('.est b'); if (p) { const v = priceOf(form); p.textContent = v ? v + ' € ' + TP().ht : p.textContent; } } } });
app.addEventListener('change', (e) => {
  const el = e.target;
  if (!form) return;
  if (el.name === 'slot') { form.slot = el.value; return render(); }
  if (el.name === 'pack') { form.pack = el.value; form.bands = fBands(form).slice(0, PACK_N[el.value] || 1); return render(); }
  if (el.name === 'per') { form.we = el.value === 'we'; return render(); }
  if (el.name === 'pslot') { form.slot = el.value; if (el.value !== 'haut') form.down = false; return render(); }
  if (el.dataset.down) { form.down = el.checked; return; }
  if (el.dataset.band) { const k = el.dataset.band, n = PACK_N[form.pack] || 1; let b = (form.bands || []).filter((x) => x !== k); if (el.checked) b = [...b, k].slice(-n); form.bands = b; return render(); }
  if (el.name === 'muse') { form.muse = el.value; return; }
  if (el.dataset.rights) { form.droits = el.checked; return; }
  if (el.dataset.media) {
    const add = [...(el.files || [])].filter((x) => /^(image|video)\//.test(x.type));
    const imgs = [...mFiles, ...add].filter((x) => /^image\//.test(x.type)).slice(0, 5), clip = [...mFiles, ...add].filter((x) => /^video\//.test(x.type)).slice(-1);
    if (clip[0] && clip[0].size > CLIP_MAX) { msg = MD().big; mFiles = imgs; return render(); }
    mFiles = [...imgs, ...clip]; return render();
  }
  if (el.dataset.aud) { form.aud = el.checked ? [...form.aud, el.dataset.aud] : form.aud.filter((k) => k !== el.dataset.aud); return; }
  if (el.dataset.day) { const n = +el.dataset.day; form.jours = el.checked ? [...form.jours, n].sort() : form.jours.filter((x) => x !== n); return; }
});
pubStatInit(API, 'ann', () => lang);
pubSocialInit(API, () => lang);
document.addEventListener('click', (e) => { if (pubSocialClick(e)) e.stopPropagation(); }, true);
app.addEventListener('click', async (e) => {
  pubTap(e);
  const b = e.target.closest('button');
  if (!b) return;
  const t = T();
  if (b.dataset.lang) { lang = b.dataset.lang; ls.set('annLang', lang); return render(); }
  if (b.dataset.push) { if (await pushEnable({ api: API, swUrl: '/annonce-sw.js', scope: '/annonce', post: pushPost })) { pushSt = 'on'; pushJust = true; } else pushSt = await pushStatus('/annonce'); return render(); }
  if (b.dataset.reset) { ls.set(ACC, null); id = key = ''; data = null; return render(); }
  if (b.dataset.new) { form = blank(); msg = ''; return render(); }
  if (b.dataset.recapPrint) return recapPrint();
  if (b.dataset.seen) { const m = seenGet(); for (const a of data.ads || []) m[a.id] = a.st; ls.set('annSeen:' + id, JSON.stringify(m)); return render(); }
  if (b.dataset.cancel) { form = null; mFiles = []; return render(); }
  if (b.dataset.logoDel) { e.preventDefault(); if (form) form.logo = ''; ls.set('annLogo:' + id, ''); return render(); }
  if (b.dataset.logoOpen) { logoOpen = !logoOpen; profMsg = recMsg = ''; return render(); }
  if (b.dataset.pfSave) {
    const g = (k) => (app.querySelector(`[data-pf="${k}"]`) || {}).value || '';
    const prof = { nom: g('nom').trim(), email: g('email').trim(), web: g('web').trim(), tva: g('tva').trim(), iban: g('iban').trim(), banque: g('banque').trim() };
    b.disabled = true;
    try { await sendOwner({ type: 'an-prof', prof }); data.nom = prof.nom || data.nom; data.prof = { ...prof, iban: prof.iban.replace(/\s/g, '').toUpperCase() }; profMsg = (PFT[lang] || PFT.fr).ok; } catch { b.disabled = false; return; }
    return render();
  }
  if (b.dataset.rcSend) {
    const m = (app.querySelector('[data-rc-m]') || {}).value || '', tx = ((app.querySelector('[data-rc-t]') || {}).value || '').trim();
    if (!tx) return;
    b.disabled = true;
    try { await sendOwner({ type: 'an-rec', motif: m, texte: tx }); recMsg = (PFT[lang] || PFT.fr).sent; data.recs = [...(data.recs || []), { t: new Date().toISOString(), motif: m, texte: tx, rep: '' }]; } catch { b.disabled = false; return; }
    return render();
  }
  if (b.dataset.inv) return printInv(b.dataset.inv);
  if (b.dataset.paid) { b.disabled = true; try { await sendOwner({ type: 'an-paid', id: b.dataset.paid }); const a = (data.ads || []).find((x) => x.id === b.dataset.paid); if (a) a.claim = today; } catch { b.disabled = false; return; } return render(); }
  if (b.dataset.payinfo) { payOpen = payOpen === b.dataset.payinfo ? '' : b.dataset.payinfo; return render(); }
  if (b.dataset.edit) { const a = (data.ads || []).find((x) => x.id === b.dataset.edit); if (a) { form = { ...blank(), ...a, jours: [...(a.jours || [])], aud: [...(a.aud || [])] }; msg = ''; render(); scrollTo(0, 0); } return; }
  if (b.dataset.stop) { b.disabled = true; try { await sendOwner({ type: 'an-stop', id: b.dataset.stop }); const a = (data.ads || []).find((x) => x.id === b.dataset.stop); if (a) a.fin = plusDays(today, -1); } catch { b.disabled = false; return; } return render(); }
  if (b.dataset.mdel) { mFiles.splice(+b.dataset.mdel, 1); return render(); }
  if (b.dataset.send) {
    const f = form;
    if (!f.nom.trim() || !f.texte.trim()) { msg = t.need; return render(); }
    if ((f.video || mFiles.length) && !f.droits) { msg = MD().need; return render(); }
    if (f.du && f.pack !== 'max' && fBands(f).length !== (PACK_N[f.pack] || 1)) { msg = PS().need(PACK_N[f.pack] || 1); return render(); }
    b.disabled = true;
    try {
      const mref = Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
      await sendOwner({ type: 'an-ad', ad: { ...f, mref: mFiles.length ? mref : f.mref || '', mn: mFiles.length, logo: ls.get('annLogo:' + id) || '' } });
      if (mFiles.length) { b.textContent = MD().sending; await sendMedia(mref); mFiles = []; }
      const pend = (() => { try { return JSON.parse(ls.get('annPend:' + id) || '[]'); } catch { return []; } })();
      if (!f.id) { pend.push({ ...f, id: '', st: 'wait', prix: priceOf(f), at: Date.now() }); ls.set('annPend:' + id, JSON.stringify(pend)); }
      else { const a = (data.ads || []).find((x) => x.id === f.id); if (a) Object.assign(a, f, { st: 'wait', prix: priceOf(f) }); }
      form = null; msg = t.sent;
    } catch { b.disabled = false; return; }
    return render();
  }
});
trInit(API, () => lang || 'fr');
const quietData = async () => { const r = await fetch(`${API}/api/esp/${id}`, { cache: 'no-store' }); if (!r.ok) return null; const x = await openJson(key, await r.arrayBuffer()); return x && x.kind === 'annonce' ? x : null; };
pchatInit({ id: () => id, data: () => data, send: (o) => sendOwner(o), lang: () => lang || 'fr', refresh: quietData, quick: null });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && data && !form) { setBadge(0, '/annonce'); load(); } });
load();
emojiInit(); // 😊 bouton émojis dans les chats
domierInit({ lang: () => lang, send: (o) => sendOwner(o), rerender: () => render() });
