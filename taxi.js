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
const GK = ['luxe', 'confort', 'eco'], EK = ['garde', 'boissons', 'friandises', 'siege', 'pancarte', 'bagages'];
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
// 📋 fiche de facturation (remplie à la première ouverture), fin de course, factures, paiement par l'établissement
const L2 = {
  fr: { prof: '📋 Notre société et nos factures', profHint: 'À remplir une fois : l’établissement vous paie directement, avec ces données.', nom: 'Raison sociale', adr: 'Adresse', ville: 'Code postal et ville', rcs: 'RCS', tvaN: 'N° TVA', mail: 'Email', pay: 'Comment être payé ?', P: { iban: '🏦 Virement (IBAN)', lien: '🔗 Lien de paiement (Stripe, PayPal…)', chauffeur: '💵 Au chauffeur (espèces / carte)' }, iban: 'IBAN', bic: 'BIC', lien: 'Lien de paiement', prix: 'Prix de la course', X: { fixe: 'Prix de la grille (estimation)', conf: 'Je confirme le prix en acceptant', corr: 'Je corrige le prix après la course (attente, péages)' }, fact: 'Factures', F: { each: 'Une facture par course', month: 'Un récapitulatif par mois' }, taux: 'TVA (%)', tauxHint: 'Taux à confirmer avec votre comptable.', save: 'Enregistrer et envoyer', saved: 'Envoyé ✓', edit: '✏️ Modifier', need: 'Raison sociale et TVA obligatoires', prixC: 'Prix confirmé (€)', done: '🏁 Course terminée', doneT: 'Fin de course', prixF: 'Prix final (€)', note: 'Note (attente, péages…)', fin: '🏁 terminée', invs: '🧾 Nos factures', invNone: 'Aucune facture.', W: '⏳ à payer', paidBy: '💳 payée par l’établissement le', recv: '✅ Reçu', recvd: '✅ reçue', print: '🖨️ Imprimer', month: '🧾 Récapitulatif de', stats: '📊 90 jours', rate: 'Note du client', code: 'Code', fact2: 'Facture', client: 'Client', total: 'Total TTC', ht: 'HT', payIban: 'Paiement par virement', payDrv: 'Paiement au chauffeur', payLink: 'Paiement en ligne' },
  it: { prof: '📋 La nostra società e le fatture', profHint: 'Da compilare una volta: la struttura vi paga direttamente, con questi dati.', nom: 'Ragione sociale', adr: 'Indirizzo', ville: 'CAP e città', rcs: 'RCS', tvaN: 'Partita IVA', mail: 'Email', pay: 'Come volete essere pagati?', P: { iban: '🏦 Bonifico (IBAN)', lien: '🔗 Link di pagamento (Stripe, PayPal…)', chauffeur: '💵 All’autista (contanti / carta)' }, iban: 'IBAN', bic: 'BIC', lien: 'Link di pagamento', prix: 'Prezzo della corsa', X: { fixe: 'Prezzo del listino (stima)', conf: 'Confermo il prezzo quando accetto', corr: 'Correggo il prezzo dopo la corsa (attese, pedaggi)' }, fact: 'Fatture', F: { each: 'Una fattura per corsa', month: 'Un riepilogo al mese' }, taux: 'IVA (%)', tauxHint: 'Aliquota da confermare con il vostro commercialista.', save: 'Salva e invia', saved: 'Inviato ✓', edit: '✏️ Modifica', need: 'Ragione sociale e IVA obbligatorie', prixC: 'Prezzo confermato (€)', done: '🏁 Corsa terminata', doneT: 'Fine corsa', prixF: 'Prezzo finale (€)', note: 'Nota (attese, pedaggi…)', fin: '🏁 terminata', invs: '🧾 Le nostre fatture', invNone: 'Nessuna fattura.', W: '⏳ da pagare', paidBy: '💳 pagata dalla struttura il', recv: '✅ Ricevuto', recvd: '✅ ricevuta', print: '🖨️ Stampa', month: '🧾 Riepilogo di', stats: '📊 90 giorni', rate: 'Voto del cliente', code: 'Codice', fact2: 'Fattura', client: 'Cliente', total: 'Totale IVA inclusa', ht: 'Imponibile', payIban: 'Pagamento con bonifico', payDrv: 'Pagamento all’autista', payLink: 'Pagamento online' },
  de: { prof: '📋 Unser Unternehmen und Rechnungen', profHint: 'Einmal ausfüllen: Der Betrieb bezahlt Sie direkt mit diesen Daten.', nom: 'Firmenname', adr: 'Adresse', ville: 'PLZ und Ort', rcs: 'RCS', tvaN: 'USt-IdNr.', mail: 'E-Mail', pay: 'Wie möchten Sie bezahlt werden?', P: { iban: '🏦 Überweisung (IBAN)', lien: '🔗 Zahlungslink (Stripe, PayPal…)', chauffeur: '💵 Beim Fahrer (bar / Karte)' }, iban: 'IBAN', bic: 'BIC', lien: 'Zahlungslink', prix: 'Fahrpreis', X: { fixe: 'Preis laut Tarif (Schätzung)', conf: 'Ich bestätige den Preis bei Annahme', corr: 'Ich korrigiere den Preis nach der Fahrt (Wartezeit, Maut)' }, fact: 'Rechnungen', F: { each: 'Eine Rechnung pro Fahrt', month: 'Eine Monatsübersicht' }, taux: 'MwSt. (%)', tauxHint: 'Satz mit Ihrem Steuerberater klären.', save: 'Speichern und senden', saved: 'Gesendet ✓', edit: '✏️ Ändern', need: 'Firmenname und MwSt. erforderlich', prixC: 'Bestätigter Preis (€)', done: '🏁 Fahrt beendet', doneT: 'Fahrtende', prixF: 'Endpreis (€)', note: 'Notiz (Wartezeit, Maut…)', fin: '🏁 beendet', invs: '🧾 Unsere Rechnungen', invNone: 'Keine Rechnung.', W: '⏳ offen', paidBy: '💳 vom Betrieb bezahlt am', recv: '✅ Erhalten', recvd: '✅ erhalten', print: '🖨️ Drucken', month: '🧾 Übersicht', stats: '📊 90 Tage', rate: 'Bewertung des Gastes', code: 'Code', fact2: 'Rechnung', client: 'Kunde', total: 'Gesamt inkl. MwSt.', ht: 'Netto', payIban: 'Zahlung per Überweisung', payDrv: 'Zahlung beim Fahrer', payLink: 'Online-Zahlung' },
  en: { prof: '📋 Our company and invoices', profHint: 'Fill in once: the property pays you directly, with these details.', nom: 'Company name', adr: 'Address', ville: 'Postcode and town', rcs: 'Company reg. no.', tvaN: 'VAT no.', mail: 'Email', pay: 'How do you want to be paid?', P: { iban: '🏦 Bank transfer (IBAN)', lien: '🔗 Payment link (Stripe, PayPal…)', chauffeur: '💵 To the driver (cash / card)' }, iban: 'IBAN', bic: 'BIC', lien: 'Payment link', prix: 'Ride price', X: { fixe: 'Price from the rates (estimate)', conf: 'I confirm the price when accepting', corr: 'I correct the price after the ride (waiting, tolls)' }, fact: 'Invoices', F: { each: 'One invoice per ride', month: 'One monthly summary' }, taux: 'VAT (%)', tauxHint: 'Rate to confirm with your accountant.', save: 'Save and send', saved: 'Sent ✓', edit: '✏️ Edit', need: 'Company name and VAT required', prixC: 'Confirmed price (€)', done: '🏁 Ride finished', doneT: 'End of ride', prixF: 'Final price (€)', note: 'Note (waiting, tolls…)', fin: '🏁 finished', invs: '🧾 Our invoices', invNone: 'No invoices.', W: '⏳ to be paid', paidBy: '💳 paid by the property on', recv: '✅ Received', recvd: '✅ received', print: '🖨️ Print', month: '🧾 Summary for', stats: '📊 90 days', rate: 'Guest rating', code: 'Code', fact2: 'Invoice', client: 'Client', total: 'Total incl. VAT', ht: 'Net', payIban: 'Payment by bank transfer', payDrv: 'Payment to the driver', payLink: 'Online payment' },
  pt: { prof: '📋 A nossa empresa e faturas', profHint: 'A preencher uma vez: o estabelecimento paga-lhe diretamente, com estes dados.', nom: 'Denominação social', adr: 'Morada', ville: 'Código postal e localidade', rcs: 'RCS', tvaN: 'N.º IVA', mail: 'Email', pay: 'Como quer ser pago?', P: { iban: '🏦 Transferência (IBAN)', lien: '🔗 Link de pagamento (Stripe, PayPal…)', chauffeur: '💵 Ao motorista (dinheiro / cartão)' }, iban: 'IBAN', bic: 'BIC', lien: 'Link de pagamento', prix: 'Preço da corrida', X: { fixe: 'Preço da tabela (estimativa)', conf: 'Confirmo o preço ao aceitar', corr: 'Corrijo o preço após a corrida (espera, portagens)' }, fact: 'Faturas', F: { each: 'Uma fatura por corrida', month: 'Um resumo por mês' }, taux: 'IVA (%)', tauxHint: 'Taxa a confirmar com o seu contabilista.', save: 'Guardar e enviar', saved: 'Enviado ✓', edit: '✏️ Alterar', need: 'Denominação e IVA obrigatórios', prixC: 'Preço confirmado (€)', done: '🏁 Corrida terminada', doneT: 'Fim da corrida', prixF: 'Preço final (€)', note: 'Nota (espera, portagens…)', fin: '🏁 terminada', invs: '🧾 As nossas faturas', invNone: 'Nenhuma fatura.', W: '⏳ a pagar', paidBy: '💳 paga pelo estabelecimento em', recv: '✅ Recebido', recvd: '✅ recebida', print: '🖨️ Imprimir', month: '🧾 Resumo de', stats: '📊 90 dias', rate: 'Avaliação do cliente', code: 'Código', fact2: 'Fatura', client: 'Cliente', total: 'Total c/ IVA', ht: 'Sem IVA', payIban: 'Pagamento por transferência', payDrv: 'Pagamento ao motorista', payLink: 'Pagamento online' },
  es: { prof: '📋 Nuestra empresa y facturas', profHint: 'A rellenar una vez: el establecimiento le paga directamente, con estos datos.', nom: 'Razón social', adr: 'Dirección', ville: 'Código postal y ciudad', rcs: 'RCS', tvaN: 'N.º IVA', mail: 'Email', pay: '¿Cómo quiere cobrar?', P: { iban: '🏦 Transferencia (IBAN)', lien: '🔗 Enlace de pago (Stripe, PayPal…)', chauffeur: '💵 Al conductor (efectivo / tarjeta)' }, iban: 'IBAN', bic: 'BIC', lien: 'Enlace de pago', prix: 'Precio de la carrera', X: { fixe: 'Precio de la tarifa (estimación)', conf: 'Confirmo el precio al aceptar', corr: 'Corrijo el precio tras la carrera (espera, peajes)' }, fact: 'Facturas', F: { each: 'Una factura por carrera', month: 'Un resumen al mes' }, taux: 'IVA (%)', tauxHint: 'Tipo a confirmar con su gestor.', save: 'Guardar y enviar', saved: 'Enviado ✓', edit: '✏️ Modificar', need: 'Razón social e IVA obligatorios', prixC: 'Precio confirmado (€)', done: '🏁 Carrera terminada', doneT: 'Fin de la carrera', prixF: 'Precio final (€)', note: 'Nota (espera, peajes…)', fin: '🏁 terminada', invs: '🧾 Nuestras facturas', invNone: 'Ninguna factura.', W: '⏳ por pagar', paidBy: '💳 pagada por el establecimiento el', recv: '✅ Recibido', recvd: '✅ recibida', print: '🖨️ Imprimir', month: '🧾 Resumen de', stats: '📊 90 días', rate: 'Nota del cliente', code: 'Código', fact2: 'Factura', client: 'Cliente', total: 'Total IVA incl.', ht: 'Base', payIban: 'Pago por transferencia', payDrv: 'Pago al conductor', payLink: 'Pago en línea' },
};
const T2 = () => L2[lang] || L2.fr;
const drvCode = () => 'D' + [...crypto.getRandomValues(new Uint8Array(4))].map((x) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[x % 32]).join('');
const eur = (n) => (Math.round((+n || 0) * 100) / 100).toFixed(2).replace('.', ',') + ' €';
const dayFmt = (iso) => (iso ? new Date(String(iso).slice(0, 10) + 'T12:00:00').toLocaleDateString(lang || 'fr', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
// numéro de facture : TX-AAAA-0001, suite des numéros déjà connus (toutes les factures reviennent de l'établissement)
function nextInvNo() {
  const y = String(new Date().getFullYear()), pre = `TX-${y}-`, k = 'taxiInvSeq:' + id;
  const known = (data.invs || []).filter((f) => f.no.startsWith(pre)).map((f) => +f.no.slice(pre.length) || 0);
  const [ly, ln] = String(ls.get(k) || '').split(':');
  const n = Math.max(0, ...known, ly === y ? +ln || 0 : 0) + 1;
  ls.set(k, y + ':' + n);
  return pre + String(n).padStart(4, '0');
}
let prof = null, profOpen = false, profMsg = '', doneK = '';
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
        ${(data.prof || {}).prix === 'conf' ? `<label>${esc(T2().prixC)}</label><input data-acc-p="1" inputmode="decimal" value="${esc(r.prix || '')}">` : ''}
        <button class="btn block" style="margin-top:8px" data-acc-send="${esc(k)}" ${drivers.length && cars.length ? '' : 'disabled'}>${esc(t.send)}</button></div>`
      : `<div class="duo"><button class="btn" data-acc="${esc(k)}">${esc(t.accept)}</button><button class="btn sec" data-ref="${esc(k)}">${esc(t.refuse)}</button></div>`) : ''}
    ${st === 'ok' && r.drv ? `<p style="margin:8px 0 0">👤 ${esc(r.drv.nom)}${r.code ? ' · 🪪 ' + esc(r.code) : ''} · 🚘 ${esc([r.drv.auto, r.drv.plaque].filter(Boolean).join(' '))}${r.prixConf ? ' · ' + esc(eur(r.prixConf)) : ''}</p>` : ''}
    ${r.done || (sent()[k] || {}).done ? `<p class="meta" style="margin:6px 0 0">${esc(T2().fin)} · ${esc(eur((r.done || sent()[k].done).prix))}${r.inv ? ' · 🧾 ' + esc(r.inv) : ''}${r.rate ? ` · ${'⭐'.repeat(r.rate.s)}${r.rate.txt ? ' « ' + esc(r.rate.txt) + ' »' : ''}` : ''}</p>`
      : st === 'ok' && r.st === 'ok' ? (doneK === k ? `<div class="acc">${(data.prof || {}).prix === 'corr' ? `<label>${esc(T2().prixF)}</label><input data-done-p="1" inputmode="decimal" value="${esc(r.prixConf || r.prix || '')}">` : `<p class="meta" style="margin:0">${esc(T2().prixF)} : <b>${esc(eur(r.prixConf || r.prix))}</b></p>`}
          <label>${esc(T2().note)}</label><input data-done-n="1"><button class="btn block" style="margin-top:8px" data-done-send="${esc(k)}">${esc(T2().done)}</button></div>` : `<div class="btns"><button class="btn sm" data-done="${esc(k)}">${esc(T2().done)}</button></div>`) : ''}
    ${st === 'ok' && r.link ? `<div class="btns"><a class="btn sm" href="${esc(r.link)}">${esc(t.open)}</a>${drvTel ? `<a class="btn sm sec" href="https://wa.me/${esc(drvTel.replace(/^\+/, '').replace(/^00/, ''))}?text=${encodeURIComponent('🚕 ' + r.n + '\n' + r.link)}" target="_blank" rel="noopener">${esc(t.toDrv)}</a>` : ''}</div>` : ''}</div>`;
}
function catHtml(t) {
  const c = cat || JSON.parse(JSON.stringify(data.cat && data.cat.gammes ? data.cat : blankCat()));
  cat = c;
  const g = (k) => c.gammes[k] || (c.gammes[k] = { on: false });
  return `<div class="card"><h2>${esc(t.team)}</h2>
    ${c.drivers.map((d, i) => `<div class="line">${d.code || (d.code = drvCode()) ? `<span class="tag" title="${esc(T2().code)}">🪪 ${esc(d.code)}</span>` : ''}<input data-cd="${i}" data-f="nom" value="${esc(d.nom)}" placeholder="${esc(t.name)}"><input data-cd="${i}" data-f="tel" value="${esc(d.tel)}" placeholder="${esc(t.tel)}" type="tel"><input data-cd="${i}" data-f="lg" value="${esc(d.lg)}" placeholder="${esc(t.lg)}"></div>`).join('')}
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
function profHtml() {
  const u = T2(), p0 = data.prof || {}, open = !data.prof || profOpen;
  if (!open) return `<div class="card"><h2>${esc(u.prof)}</h2><p class="meta" style="margin:0">${esc([p0.nom, u.P[p0.pay], u.X[p0.prix], u.F[p0.fact], p0.taux !== '' ? u.taux + ' ' + p0.taux : ''].filter(Boolean).join(' · '))}</p><button class="btn sm sec" style="margin-top:8px" data-prof-edit="1">${esc(u.edit)}</button></div>`;
  const p = prof || (prof = { nom: data.nom || '', adresse: '', ville: '', rcs: '', tva: '', tel: data.tel || '', email: '', pay: 'iban', iban: '', bic: '', lien: '', prix: 'fixe', fact: 'each', taux: '', ...p0 });
  const inp = (k, lbl, type = 'text') => `<label>${esc(lbl)}</label><input data-p="${k}" type="${type}" value="${esc(p[k] ?? '')}">`;
  const radios = (k, opts) => Object.entries(opts).map(([v, l]) => `<label class="chk"><input type="radio" name="p_${k}" data-pr="${k}" value="${v}" ${p[k] === v ? 'checked' : ''}> ${esc(l)}</label>`).join('');
  return `<div class="card" id="profCard"><h2>${esc(u.prof)}</h2><p class="meta" style="margin:0 0 8px">${esc(u.profHint)}</p>
    ${inp('nom', u.nom)}${inp('adresse', u.adr)}${inp('ville', u.ville)}${inp('rcs', u.rcs)}${inp('tva', u.tvaN)}${inp('tel', T().tel, 'tel')}${inp('email', u.mail, 'email')}
    <p class="meta" style="margin:10px 0 4px"><b>${esc(u.pay)}</b></p>${radios('pay', u.P)}
    ${p.pay === 'iban' ? inp('iban', u.iban) + inp('bic', u.bic) : p.pay === 'lien' ? inp('lien', u.lien, 'url') : ''}
    <p class="meta" style="margin:10px 0 4px"><b>${esc(u.prix)}</b></p>${radios('prix', u.X)}
    <p class="meta" style="margin:10px 0 4px"><b>${esc(u.fact)}</b></p>${radios('fact', u.F)}
    ${inp('taux', u.taux)}<p class="meta" style="margin:2px 0 0">${esc(u.tauxHint)}</p>
    <button class="btn block" style="margin-top:12px" data-prof-save="1">${esc(u.save)}</button>${profMsg ? `<p class="ok" style="margin:8px 0 0">${esc(profMsg)}</p>` : ''}</div>`;
}
const rKey = (r) => r.h + ':' + r.r;
function invHtml() {
  const u = T2(), invs = data.invs || [], rides = data.rides || [];
  const since = new Date(Date.now() - 90 * 864e5).toISOString(), R90 = rides.filter((r) => (r.at || r.quand || '') >= since.slice(0, 10) || r.st === 'wait');
  const rates = R90.map((r) => r.rate && r.rate.s).filter(Boolean);
  const stats = `${u.stats} : ${R90.length} · ✅ ${R90.filter((r) => r.st === 'ok').length} · ❌ ${R90.filter((r) => r.st === 'no').length} · ${u.fin} ${R90.filter((r) => r.done).length}${rates.length ? ` · ⭐ ${(rates.reduce((a, b) => a + b, 0) / rates.length).toFixed(1)}` : ''}`;
  // récapitulatif mensuel : les mois passés avec des courses terminées sans facture
  const thisM = new Date().toISOString().slice(0, 7), months = {};
  if ((data.prof || {}).fact === 'month') for (const r of rides) if (r.done && !r.inv && r.done.at.slice(0, 7) < thisM) (months[r.done.at.slice(0, 7)] ||= []).push(rKey(r));
  return `<div class="card"><h2>${esc(u.invs)}</h2><p class="meta" style="margin:0 0 8px">${esc(stats)}</p>
    ${Object.entries(months).map(([m, keys]) => `<button class="btn block sec" style="margin-bottom:8px" data-month="${m}">${esc(u.month)} ${esc(new Date(m + '-15').toLocaleDateString(lang, { month: 'long', year: 'numeric' }))} (${keys.length})</button>`).join('')}
    ${invs.length ? invs.map((f) => `<div class="ride ${f.recv ? 'ok' : ''}"><div style="display:flex;justify-content:space-between;gap:8px"><b>${esc(f.no)} · ${esc(eur(f.ttc))}</b><span class="tag">${esc(f.recv ? u.recvd : f.paid ? '💳' : u.W)}</span></div>
      <p class="meta" style="margin:4px 0 0">${esc([dayFmt(f.date), '🛣️ ' + (f.keys || []).length, f.paid && !f.recv ? u.paidBy + ' ' + dayFmt(f.paid) : ''].filter(Boolean).join(' · '))}</p>
      <div class="btns"><button class="btn sm sec" data-print="${esc(f.no)}">${esc(u.print)}</button>${f.paid && !f.recv ? `<button class="btn sm" data-recv="${esc(f.no)}">${esc(u.recv)}</button>` : ''}</div></div>`).join('') : `<p class="meta" style="margin:0">${esc(u.invNone)}</p>`}</div>`;
}
// facture imprimable (fenêtre à part) : émise par la société, au nom de l'établissement
function printInv(no) {
  const u = T2(), f = (data.invs || []).find((x) => x.no === no), p = data.prof || {}, c = data.cli || {};
  if (!f) return;
  const rows = (f.keys || []).map((k) => (data.rides || []).find((r) => rKey(r) === k)).filter(Boolean);
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(`<!doctype html><meta charset="utf-8"><title>${esc(u.fact2)} ${esc(f.no)}</title><style>body{font:14px system-ui,sans-serif;margin:32px;color:#1d1b16}td,th{padding:6px 8px;border-bottom:1px solid #ddd;text-align:left}th:last-child,td:last-child{text-align:right}table{width:100%;border-collapse:collapse;margin:18px 0}</style>
    <div style="display:flex;justify-content:space-between;gap:24px"><div><b>${esc(p.nom || data.nom)}</b><br>${esc(p.adresse || '')}<br>${esc(p.ville || '')}<br>${esc([p.rcs && 'RCS ' + p.rcs, p.tva && 'TVA ' + p.tva].filter(Boolean).join(' · '))}<br>${esc([p.tel, p.email].filter(Boolean).join(' · '))}</div><div><b>${esc(u.client)}</b><br>${esc(c.nom || '')}<br>${esc(c.adresse || '')}</div></div>
    <h1>${esc(u.fact2)} ${esc(f.no)}</h1><p>${esc(dayFmt(f.date))}</p>
    <table><tr><th></th><th>${esc(u.code)}</th><th>€</th></tr>${rows.map((r) => `<tr><td>${esc(dayFmt(r.done && r.done.at))} · ${esc(r.n)} · ${esc([r.from || r.s, r.to || r.sa].filter(Boolean).join(' → '))}${r.done && r.done.note ? ' · ' + esc(r.done.note) : ''}</td><td>${esc(r.code || '')}</td><td>${esc(eur(r.done && r.done.prix))}</td></tr>`).join('')}</table>
    <p style="text-align:right">${esc(u.ht)} ${esc(eur(f.ht))}<br>TVA ${esc(String(f.taux))} % ${esc(eur(f.tva))}<br><b>${esc(u.total)} ${esc(eur(f.ttc))}</b></p>
    <p>${p.pay === 'iban' ? esc(`${u.payIban} : IBAN ${p.iban || ''}${p.bic ? ' · BIC ' + p.bic : ''} · ${f.no}`) : p.pay === 'lien' ? esc(`${u.payLink} : ${p.lien || ''}`) : esc(u.payDrv)}</p>`);
  w.document.close();
  w.print();
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
  if (!d.prof) out.push(profHtml());
  const rides = d.rides || [];
  out.push(`<div class="card"><h2>${esc(t.rides)}</h2>${rides.length ? rides.map((r) => rideHtml(r, t)).join('') : `<p class="meta" style="margin:0">${esc(t.none)}</p>`}</div>`);
  out.push(invHtml());
  { const p = slot('milieu'); if (p) out.push(adBox(p, t)); }
  if (d.prof) out.push(profHtml());
  out.push(catHtml(t));
  out.push(`<p class="meta safe">${esc(t.safe)}</p>`);
  { const p = slot('bas'); if (p) out.push(adBox(p, t)); }
  out.push(infoBox({ lang }));
  out.push(`<div class="ticker" data-vsrc="${API}/ticker"></div><p class="meta" style="text-align:center;margin-top:14px"><button class="linkb" data-reset="1">${esc(t.reset)}</button></p>`);
  const keep = new Map([...document.querySelectorAll('.vid iframe, .ticker iframe')].map((f) => [f.dataset.src, f]));
  app.innerHTML = out.join('');
  document.querySelectorAll('.vid[data-vsrc], .ticker[data-vsrc]').forEach((v) => { const src = v.dataset.vsrc, old = keep.get(src); if (old) return v.append(old); const f = document.createElement('iframe'); f.src = src; f.dataset.src = src; f.loading = 'lazy'; f.title = 'Video'; f.allow = 'encrypted-media; picture-in-picture; fullscreen; clipboard-write; web-share'; f.allowFullscreen = true; v.append(f); });
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
  if (data) { const s0 = sent(); for (const r of data.rides || []) { const k = r.h + ':' + r.r; if (r.st !== 'wait' && (!s0[k] || !s0[k].done || r.done)) delete s0[k]; } ls.set(sentK(), JSON.stringify(s0)); }
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
  if (el.dataset.p && prof) { prof[el.dataset.p] = el.value; return; }
  if (!cat) return;
  if (el.dataset.cd) cat.drivers[+el.dataset.cd][el.dataset.f] = el.value;
  else if (el.dataset.cc) cat.cars[+el.dataset.cc][el.dataset.f] = el.value;
  else if (el.dataset.g && el.dataset.f !== 'on') cat.gammes[el.dataset.g][el.dataset.f] = el.value;
  else if (el.dataset.e) { if (el.value === '') delete cat.extras[el.dataset.e]; else cat.extras[el.dataset.e] = el.value; }
});
app.addEventListener('change', (e) => {
  const el = e.target;
  if (el.dataset.pr && prof) { prof[el.dataset.pr] = el.value; profMsg = ''; return render(); }
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
  if (b.dataset.addD) { cat.drivers.push({ nom: '', tel: '', lg: '', code: drvCode() }); return render(); }
  if (b.dataset.addC) { cat.cars.push({ modele: '', plaque: '', gamme: 'confort' }); return render(); }
  if (b.dataset.catSave) {
    b.disabled = true;
    try { await sendOwner({ type: 'tx-cat', cat }); catMsg = t.saved; data.cat = JSON.parse(JSON.stringify(cat)); } catch { b.disabled = false; return; }
    return render();
  }
  if (b.dataset.acc) { acc = b.dataset.acc; return render(); }
  const u = T2();
  if (b.dataset.profEdit) { profOpen = true; profMsg = ''; return render(); }
  if (b.dataset.profSave) {
    if (!prof || !String(prof.nom).trim() || String(prof.taux).trim() === '') { profMsg = u.need; return render(); }
    b.disabled = true;
    try { await sendOwner({ type: 'tx-prof', prof }); data.prof = { ...prof }; profMsg = u.saved; profOpen = false; } catch { b.disabled = false; return; }
    return render();
  }
  if (b.dataset.done) { doneK = b.dataset.done; return render(); }
  if (b.dataset.doneSend) {
    const k = b.dataset.doneSend, box = b.closest('.acc'), r = (data.rides || []).find((y) => rKey(y) === k);
    if (!r) return;
    const pi = box.querySelector('[data-done-p]'), prix = pi ? Math.max(0, +String(pi.value).replace(',', '.') || 0) : +(r.prixConf || r.prix || 0), note = String(box.querySelector('[data-done-n]').value || '').trim().slice(0, 300);
    const inv = (data.prof || {}).fact === 'month' ? '' : nextInvNo();
    b.disabled = true;
    try { await sendOwner({ type: 'tx-done', h: r.h, r: r.r, prix, note, inv }); } catch { b.disabled = false; return; }
    const s0 = sent(); s0[k] = { ...(s0[k] || { act: 'ok' }), done: { prix, at: new Date().toISOString() } }; ls.set(sentK(), JSON.stringify(s0));
    doneK = ''; return render();
  }
  if (b.dataset.month) {
    const m = b.dataset.month, keys = (data.rides || []).filter((r) => r.done && !r.inv && r.done.at.slice(0, 7) === m).map(rKey);
    if (!keys.length) return;
    b.disabled = true;
    try { await sendOwner({ type: 'tx-inv', no: nextInvNo(), keys }); } catch { b.disabled = false; return; }
    for (const r of data.rides || []) if (keys.includes(rKey(r))) r.inv = '…';
    return render();
  }
  if (b.dataset.recv) { b.disabled = true; try { await sendOwner({ type: 'tx-recv', no: b.dataset.recv }); const f = (data.invs || []).find((x) => x.no === b.dataset.recv); if (f) f.recv = new Date().toISOString().slice(0, 10); } catch { b.disabled = false; return; } return render(); }
  if (b.dataset.print) return printInv(b.dataset.print);
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
    const pc = box.querySelector('[data-acc-p]'), prix = pc ? Math.max(0, +String(pc.value).replace(',', '.') || 0) : 0;
    try { await reply(b.dataset.accSend, 'ok', { drv: { nom: drv.nom, tel: drv.tel, code: drv.code || '' }, car: { modele: car.modele, plaque: car.plaque }, ...(prix ? { prix } : {}) }); } catch { b.disabled = false; }
  }
});
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && data) { setBadge(0, '/taxi'); load(); } });
load();
