// 🏨 App des clients (Hotel / Airbnb) : séjour, chambre ou logement, code de la porte, menu, arrivée (taxi ou soi-même),
// état des lieux de sortie. Données chiffrées par l'établissement ; la clé ne quitte pas le téléphone.
// L'app se remet à zéro le lendemain du départ (l'établissement efface les données et le code).
import { jobHtml, jobInit } from '/ares/jobform.js';
import { pubLive, pubSlotNow, pubPickNow } from '/ares/pubsched.js';
import { emojiInit } from '/ares/emoji.js';
import { domierHtml, domierInit } from '/ares/domier.js';
import { newsHtml } from '/ares/news.js';
import '/ares/reqmark.js';
import { openJson, openBytes, sealForOwner, codeHash, unwrapWithCode, b64u } from '/ares/espace-crypto.js';
import { videoEmbed } from '/ares/video-embed.js';
import { pubStatInit, pubSeen, pubTap } from '/ares/pubstat.js';
import { pubSocialInit, pubSocialBar, pubSocialLoad, pubSocialClick } from '/ares/pubsocial.js';
import { pushStatus, pushEnable, pushRefresh, setBadge } from '/ares/push-client.js';
import { infoBox } from '/ares/nbien.js';
import { wxRadioCard, wxRadioInit } from '/ares/wxradio.js';
import { tripView, tripFetch } from '/ares/trip.js';
import { pchatInit, pchatCard } from '/ares/pchat.js';
import { trInit } from '/ares/chattr.js';
import { netPubsGet, netPubsFor } from '/ares/netpubs.js';
const API = document.querySelector('meta[name="esp-api"]').content.replace(/\/$/, '');
const ACC = 'hoteAccess';
let [id, key] = (location.hash.slice(1).match(/^([0-9a-f]{32})\.([A-Za-z0-9_-]{40,})$/) || []).slice(1);
if (id) { try { localStorage.setItem(ACC, id + '.' + key); } catch {} history.replaceState(null, '', location.pathname); }
else { try { [id, key] = ((localStorage.getItem(ACC) || '').match(/^([0-9a-f]{32})\.([A-Za-z0-9_-]{40,})$/) || []).slice(1); } catch {} }
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('/hote-sw.js', { scope: '/hote' }).catch(() => {});
const app = document.getElementById('app');
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const today = iso(new Date());
const LANGS = ['fr', 'en', 'de', 'it', 'pt', 'es'];
const LOC = { fr: 'fr-LU', it: 'it-IT', de: 'de-LU', en: 'en-GB', pt: 'pt-PT', es: 'es-ES' };
const fmt = (d) => (d ? new Date(d + 'T12:00').toLocaleDateString(LOC[lang] || 'fr-LU', { weekday: 'short', day: 'numeric', month: 'short' }) : '');

const L = {
  fr: { app: 'Mon séjour', welcome: 'Entrez le code reçu de votre hôtel ou de votre hôte.', code: 'Votre code personnel', enter: 'Entrer', bad: 'Code inconnu ou séjour terminé.', off: 'Votre séjour est terminé. Merci et à bientôt !',
    hi: 'Bonjour', stay: 'Votre séjour', from: 'Arrivée', to: 'Départ', after: 'à partir de', before: 'avant', pers: 'personnes', room: 'Votre chambre', home: 'Votre logement', floor: 'Étage', rooms: 'pièces', max: 'max.',
    door: 'Code de la porte', doorSoon: 'Visible le jour de votre arrivée', key: 'Badge / clé', formule: 'Formule', F: { seul: 'Logement seul', pdj: 'Petit-déjeuner', demi: 'Demi-pension', complete: 'Pension complète' },
    pref: 'Vos préférences', menu: '🍽️ Voir le menu', close: 'Fermer', call: '📞 Appeler', wa: '💬 WhatsApp', way: '🧭 Itinéraire',
    arrT: 'Comment arrivez-vous ?', self: '🚗 Je viens par mes propres moyens', taxi: '🚕 Envoyez-moi un taxi', pick: 'Où vous prendre ?', aero: '✈️ Aéroport de Luxembourg', gare: '🚉 Gare de Luxembourg', other: '📍 Autre adresse / ville',
    otherPh: 'ex. Trier, Hauptbahnhof', when: 'Quand ?', vol: 'N° de vol / train (facultatif)', est: 'Estimation', calc: 'Calcul…', send: 'Confirmer', change: 'Changer', chBack: '↩️ Annuler — garder mon choix', chQ: 'Le chauffeur est déjà prévu : l’hôtel sera prévenu. Changer quand même ?', chY: 'Oui, changer', chN: 'Non', accQ: 'Accepter les modifications ?', accY: 'Oui, envoyer', accN: 'Revoir', chosenSelf: 'Vous venez par vos propres moyens.', chosenTaxi: 'Taxi demandé',
    wait: 'L’établissement vous envoie un chauffeur — vous serez prévenu ici.', driver: 'Votre chauffeur', go: '🚗 Je suis en route', here: '✅ Je suis arrivé', mins: 'Arrivée dans combien de minutes ?', gpsNo: 'Position non disponible : choisissez les minutes.',
    trackOn: 'L’établissement voit votre heure d’arrivée (pas votre position exacte). Le partage s’arrête à votre arrivée.', sent: 'Envoyé ✓',
    edlT: '📋 État des lieux de sortie', edlP: 'Avant de partir, prenez les photos (une par case) : elles protègent votre caution et vous.', edlSend: 'Envoyer les photos', edlOk: 'photo(s) reçue(s) par l’établissement',
    safe: '🔒 Vos données sont chiffrées : seul l’établissement peut les lire.', notif: 'Notifications', notifHint: 'Code de la porte, taxi, rappels : recevez-les sur ce téléphone.', notifOn: 'Activer', notifOk: 'Notifications activées ✓',
    ad: { back: '📣 Publicité', mapT: '🗺️ Carte', home: '🏨 L’hôtel', lbl: 'Publicité', see: '🗺️ Voir', call: '📞 Appeler', web: '🌐 Site' }, thanks: 'Merci pour votre séjour !', lang: 'Langue', reset: 'Changer de code' },
  en: { app: 'My stay', welcome: 'Enter the code you received from your hotel or host.', code: 'Your personal code', enter: 'Enter', bad: 'Unknown code or stay ended.', off: 'Your stay has ended. Thank you and see you soon!',
    hi: 'Hello', stay: 'Your stay', from: 'Arrival', to: 'Departure', after: 'from', before: 'before', pers: 'guests', room: 'Your room', home: 'Your home', floor: 'Floor', rooms: 'rooms', max: 'max.',
    door: 'Door code', doorSoon: 'Shown on your arrival day', key: 'Badge / key', formule: 'Board', F: { seul: 'Room only', pdj: 'Breakfast', demi: 'Half board', complete: 'Full board' },
    pref: 'Your preferences', menu: '🍽️ See the menu', close: 'Close', call: '📞 Call', wa: '💬 WhatsApp', way: '🧭 Directions',
    arrT: 'How are you arriving?', self: '🚗 I’m coming on my own', taxi: '🚕 Send me a taxi', pick: 'Where should we pick you up?', aero: '✈️ Luxembourg Airport', gare: '🚉 Luxembourg Station', other: '📍 Other address / city',
    otherPh: 'e.g. Trier, Hauptbahnhof', when: 'When?', vol: 'Flight / train no. (optional)', est: 'Estimate', calc: 'Calculating…', send: 'Confirm', change: 'Change', chBack: '↩️ Cancel — keep my choice', chQ: 'Your driver is already booked: the hotel will be told. Change anyway?', chY: 'Yes, change', chN: 'No', accQ: 'Accept the changes?', accY: 'Yes, send', accN: 'Review', chosenSelf: 'You are coming on your own.', chosenTaxi: 'Taxi requested',
    wait: 'The property is sending you a driver — you will be notified here.', driver: 'Your driver', go: '🚗 I’m on my way', here: '✅ I have arrived', mins: 'Arriving in how many minutes?', gpsNo: 'Location unavailable: choose the minutes.',
    trackOn: 'The property sees your arrival time (not your exact position). Sharing stops when you arrive.', sent: 'Sent ✓',
    edlT: '📋 Check-out inventory', edlP: 'Before leaving, take the photos (one per box): they protect your deposit and you.', edlSend: 'Send the photos', edlOk: 'photo(s) received by the property',
    safe: '🔒 Your data is encrypted: only the property can read it.', notif: 'Notifications', notifHint: 'Door code, taxi, reminders: get them on this phone.', notifOn: 'Turn on', notifOk: 'Notifications on ✓',
    ad: { back: '📣 Advertising', mapT: '🗺️ Map', home: '🏨 The hotel', lbl: 'Advertising', see: '🗺️ See', call: '📞 Call', web: '🌐 Website' }, thanks: 'Thank you for your stay!', lang: 'Language', reset: 'Change code' },
  de: { app: 'Mein Aufenthalt', welcome: 'Geben Sie den Code ein, den Sie von Ihrem Hotel oder Gastgeber erhalten haben.', code: 'Ihr persönlicher Code', enter: 'Öffnen', bad: 'Unbekannter Code oder Aufenthalt beendet.', off: 'Ihr Aufenthalt ist beendet. Danke und bis bald!',
    hi: 'Guten Tag', stay: 'Ihr Aufenthalt', from: 'Ankunft', to: 'Abreise', after: 'ab', before: 'bis', pers: 'Personen', room: 'Ihr Zimmer', home: 'Ihre Unterkunft', floor: 'Etage', rooms: 'Zimmer', max: 'max.',
    door: 'Türcode', doorSoon: 'Sichtbar am Anreisetag', key: 'Badge / Schlüssel', formule: 'Verpflegung', F: { seul: 'Nur Übernachtung', pdj: 'Frühstück', demi: 'Halbpension', complete: 'Vollpension' },
    pref: 'Ihre Vorlieben', menu: '🍽️ Speisekarte ansehen', close: 'Schließen', call: '📞 Anrufen', wa: '💬 WhatsApp', way: '🧭 Route',
    arrT: 'Wie reisen Sie an?', self: '🚗 Ich komme selbst', taxi: '🚕 Schicken Sie mir ein Taxi', pick: 'Wo sollen wir Sie abholen?', aero: '✈️ Flughafen Luxemburg', gare: '🚉 Bahnhof Luxemburg', other: '📍 Andere Adresse / Stadt',
    otherPh: 'z. B. Trier, Hauptbahnhof', when: 'Wann?', vol: 'Flug- / Zugnr. (optional)', est: 'Schätzung', calc: 'Berechnung…', send: 'Bestätigen', change: 'Ändern', chBack: '↩️ Abbrechen — meine Wahl behalten', chQ: 'Ihr Fahrer ist schon eingeplant: das Hotel wird informiert. Trotzdem ändern?', chY: 'Ja, ändern', chN: 'Nein', accQ: 'Änderungen übernehmen?', accY: 'Ja, senden', accN: 'Prüfen', chosenSelf: 'Sie kommen selbst.', chosenTaxi: 'Taxi angefragt',
    wait: 'Das Haus schickt Ihnen einen Fahrer — Sie werden hier benachrichtigt.', driver: 'Ihr Fahrer', go: '🚗 Ich bin unterwegs', here: '✅ Ich bin angekommen', mins: 'Ankunft in wie vielen Minuten?', gpsNo: 'Standort nicht verfügbar: Minuten wählen.',
    trackOn: 'Das Haus sieht Ihre Ankunftszeit (nicht Ihren genauen Standort). Das Teilen endet bei Ihrer Ankunft.', sent: 'Gesendet ✓',
    edlT: '📋 Auszugsprotokoll', edlP: 'Machen Sie vor der Abreise die Fotos (eines pro Feld): sie schützen Ihre Kaution und Sie.', edlSend: 'Fotos senden', edlOk: 'Foto(s) vom Haus erhalten',
    safe: '🔒 Ihre Daten sind verschlüsselt: nur das Haus kann sie lesen.', notif: 'Benachrichtigungen', notifHint: 'Türcode, Taxi, Erinnerungen: auf diesem Telefon erhalten.', notifOn: 'Aktivieren', notifOk: 'Benachrichtigungen aktiv ✓',
    ad: { back: '📣 Werbung', mapT: '🗺️ Karte', home: '🏨 Das Hotel', lbl: 'Werbung', see: '🗺️ Ansehen', call: '📞 Anrufen', web: '🌐 Website' }, thanks: 'Danke für Ihren Aufenthalt!', lang: 'Sprache', reset: 'Code ändern' },
  it: { app: 'Il mio soggiorno', welcome: 'Inserisca il codice ricevuto dal suo hotel o dal suo host.', code: 'Il suo codice personale', enter: 'Entra', bad: 'Codice sconosciuto o soggiorno terminato.', off: 'Il suo soggiorno è terminato. Grazie e a presto!',
    hi: 'Buongiorno', stay: 'Il suo soggiorno', from: 'Arrivo', to: 'Partenza', after: 'dalle', before: 'entro le', pers: 'persone', room: 'La sua camera', home: 'Il suo alloggio', floor: 'Piano', rooms: 'locali', max: 'max.',
    door: 'Codice della porta', doorSoon: 'Visibile il giorno del suo arrivo', key: 'Badge / chiave', formule: 'Formula', F: { seul: 'Solo pernottamento', pdj: 'Colazione', demi: 'Mezza pensione', complete: 'Pensione completa' },
    pref: 'Le sue preferenze', menu: '🍽️ Vedi il menù', close: 'Chiudi', call: '📞 Chiama', wa: '💬 WhatsApp', way: '🧭 Percorso',
    arrT: 'Come arriva?', self: '🚗 Vengo con i miei mezzi', taxi: '🚕 Mandatemi un taxi', pick: 'Dove la veniamo a prendere?', aero: '✈️ Aeroporto di Lussemburgo', gare: '🚉 Stazione di Lussemburgo', other: '📍 Altro indirizzo / città',
    otherPh: 'es. Trier, Hauptbahnhof', when: 'Quando?', vol: 'N° volo / treno (facoltativo)', est: 'Stima', calc: 'Calcolo…', send: 'Conferma', change: 'Cambia', chBack: '↩️ Annulla — tengo la mia scelta', chQ: 'L’autista è già previsto: l’hotel verrà avvisato. Cambiare lo stesso?', chY: 'Sì, cambia', chN: 'No', accQ: 'Accetti le modifiche?', accY: 'Sì, invia', accN: 'Rivedi', chosenSelf: 'Viene con i suoi mezzi.', chosenTaxi: 'Taxi richiesto',
    wait: 'La struttura le manda un autista — sarà avvisato qui.', driver: 'Il suo autista', go: '🚗 Sono in viaggio', here: '✅ Sono arrivato', mins: 'Arrivo tra quanti minuti?', gpsNo: 'Posizione non disponibile: scelga i minuti.',
    trackOn: 'La struttura vede l’ora del suo arrivo (non la posizione esatta). La condivisione si ferma al suo arrivo.', sent: 'Inviato ✓',
    edlT: '📋 Stato dei luoghi d’uscita', edlP: 'Prima di partire, faccia le foto (una per casella): proteggono la sua cauzione e lei.', edlSend: 'Invia le foto', edlOk: 'foto ricevute dalla struttura',
    safe: '🔒 I suoi dati sono cifrati: solo la struttura può leggerli.', notif: 'Notifiche', notifHint: 'Codice porta, taxi, promemoria: li riceva su questo telefono.', notifOn: 'Attiva', notifOk: 'Notifiche attive ✓',
    ad: { back: '📣 Pubblicità', mapT: '🗺️ Mappa', home: '🏨 L’hotel', lbl: 'Pubblicità', see: '🗺️ Vedi', call: '📞 Chiama', web: '🌐 Sito' }, thanks: 'Grazie per il suo soggiorno!', lang: 'Lingua', reset: 'Cambia codice' },
  pt: { app: 'A minha estadia', welcome: 'Introduza o código recebido do seu hotel ou anfitrião.', code: 'O seu código pessoal', enter: 'Entrar', bad: 'Código desconhecido ou estadia terminada.', off: 'A sua estadia terminou. Obrigado e até breve!',
    hi: 'Olá', stay: 'A sua estadia', from: 'Chegada', to: 'Partida', after: 'a partir das', before: 'até às', pers: 'pessoas', room: 'O seu quarto', home: 'O seu alojamento', floor: 'Andar', rooms: 'divisões', max: 'máx.',
    door: 'Código da porta', doorSoon: 'Visível no dia da chegada', key: 'Cartão / chave', formule: 'Regime', F: { seul: 'Só alojamento', pdj: 'Pequeno-almoço', demi: 'Meia pensão', complete: 'Pensão completa' },
    pref: 'As suas preferências', menu: '🍽️ Ver o menu', close: 'Fechar', call: '📞 Ligar', wa: '💬 WhatsApp', way: '🧭 Itinerário',
    arrT: 'Como vai chegar?', self: '🚗 Vou pelos meus meios', taxi: '🚕 Enviem-me um táxi', pick: 'Onde o vamos buscar?', aero: '✈️ Aeroporto do Luxemburgo', gare: '🚉 Estação do Luxemburgo', other: '📍 Outra morada / cidade',
    otherPh: 'ex. Trier, Hauptbahnhof', when: 'Quando?', vol: 'N.º voo / comboio (opcional)', est: 'Estimativa', calc: 'A calcular…', send: 'Confirmar', change: 'Alterar', chBack: '↩️ Cancelar — manter a minha escolha', chQ: 'O motorista já está previsto: o hotel será avisado. Alterar mesmo assim?', chY: 'Sim, alterar', chN: 'Não', accQ: 'Aceita as alterações?', accY: 'Sim, enviar', accN: 'Rever', chosenSelf: 'Vem pelos seus meios.', chosenTaxi: 'Táxi pedido',
    wait: 'O estabelecimento envia-lhe um motorista — será avisado aqui.', driver: 'O seu motorista', go: '🚗 Estou a caminho', here: '✅ Cheguei', mins: 'Chegada dentro de quantos minutos?', gpsNo: 'Localização indisponível: escolha os minutos.',
    trackOn: 'O estabelecimento vê a hora de chegada (não a posição exata). A partilha para quando chegar.', sent: 'Enviado ✓',
    edlT: '📋 Vistoria de saída', edlP: 'Antes de sair, tire as fotos (uma por casa): protegem a sua caução e a si.', edlSend: 'Enviar as fotos', edlOk: 'foto(s) recebida(s) pelo estabelecimento',
    safe: '🔒 Os seus dados estão cifrados: só o estabelecimento os pode ler.', notif: 'Notificações', notifHint: 'Código da porta, táxi, lembretes: receba-os neste telemóvel.', notifOn: 'Ativar', notifOk: 'Notificações ativas ✓',
    ad: { back: '📣 Publicidade', mapT: '🗺️ Mapa', home: '🏨 O hotel', lbl: 'Publicidade', see: '🗺️ Ver', call: '📞 Ligar', web: '🌐 Site' }, thanks: 'Obrigado pela sua estadia!', lang: 'Idioma', reset: 'Mudar de código' },
  es: { app: 'Mi estancia', welcome: 'Introduzca el código recibido de su hotel o anfitrión.', code: 'Su código personal', enter: 'Entrar', bad: 'Código desconocido o estancia terminada.', off: 'Su estancia ha terminado. ¡Gracias y hasta pronto!',
    hi: 'Hola', stay: 'Su estancia', from: 'Llegada', to: 'Salida', after: 'desde las', before: 'antes de las', pers: 'personas', room: 'Su habitación', home: 'Su alojamiento', floor: 'Planta', rooms: 'habitaciones', max: 'máx.',
    door: 'Código de la puerta', doorSoon: 'Visible el día de su llegada', key: 'Tarjeta / llave', formule: 'Régimen', F: { seul: 'Solo alojamiento', pdj: 'Desayuno', demi: 'Media pensión', complete: 'Pensión completa' },
    pref: 'Sus preferencias', menu: '🍽️ Ver el menú', close: 'Cerrar', call: '📞 Llamar', wa: '💬 WhatsApp', way: '🧭 Ruta',
    arrT: '¿Cómo llega?', self: '🚗 Voy por mis medios', taxi: '🚕 Envíenme un taxi', pick: '¿Dónde le recogemos?', aero: '✈️ Aeropuerto de Luxemburgo', gare: '🚉 Estación de Luxemburgo', other: '📍 Otra dirección / ciudad',
    otherPh: 'p. ej. Trier, Hauptbahnhof', when: '¿Cuándo?', vol: 'N.º de vuelo / tren (opcional)', est: 'Estimación', calc: 'Calculando…', send: 'Confirmar', change: 'Cambiar', chBack: '↩️ Cancelar — mantener mi elección', chQ: 'El conductor ya está previsto: se avisará al hotel. ¿Cambiar de todos modos?', chY: 'Sí, cambiar', chN: 'No', accQ: '¿Acepta los cambios?', accY: 'Sí, enviar', accN: 'Revisar', chosenSelf: 'Viene por sus medios.', chosenTaxi: 'Taxi solicitado',
    wait: 'El establecimiento le envía un conductor — se le avisará aquí.', driver: 'Su conductor', go: '🚗 Estoy en camino', here: '✅ He llegado', mins: '¿Llega en cuántos minutos?', gpsNo: 'Ubicación no disponible: elija los minutos.',
    trackOn: 'El establecimiento ve su hora de llegada (no su posición exacta). Se deja de compartir al llegar.', sent: 'Enviado ✓',
    edlT: '📋 Inventario de salida', edlP: 'Antes de irse, haga las fotos (una por casilla): protegen su fianza y a usted.', edlSend: 'Enviar las fotos', edlOk: 'foto(s) recibida(s) por el establecimiento',
    safe: '🔒 Sus datos están cifrados: solo el establecimiento puede leerlos.', notif: 'Notificaciones', notifHint: 'Código de la puerta, taxi, recordatorios: recíbalos en este teléfono.', notifOn: 'Activar', notifOk: 'Notificaciones activadas ✓',
    ad: { back: '📣 Publicidad', mapT: '🗺️ Mapa', home: '🏨 El hotel', lbl: 'Publicidad', see: '🗺️ Ver', call: '📞 Llamar', web: '🌐 Web' }, thanks: '¡Gracias por su estancia!', lang: 'Idioma', reset: 'Cambiar de código' },
};
// 🚘 services, gammes et extras des chauffeurs du réseau
const TX = {
  fr: { srv: 'Service', S: { course: '🛣️ Une course', heures: '⏱️ À l’heure', demi: '🌗 Demi-journée', jour: '☀️ Journée', sejour: '📅 Tout le séjour' }, gam: 'Voiture', G: { luxe: '💎 Luxe', confort: '🚘 Confort', eco: '🚕 Économique' }, ext: 'Extras', E: { garde: '🛡️ Garde du corps', boissons: '🍾 Boissons', friandises: '🍫 Friandises', siege: '🍼 Siège enfant', pancarte: '🪧 Pancarte à votre nom', bagages: '🧳 Aide bagages' }, free: 'offert', hours: 'Combien d’heures ?', total: 'Total estimé', ask: 'prix sur demande', book: '🚘 Réserver un chauffeur', dest: 'Pour aller où ?', destPh: 'ex. Centre-ville, restaurant, Trier…', fromL: 'Départ', mine: 'Mes réservations', W: '⏳ en attente', O: '✅ confirmé', N: '❌ pas disponible' },
  en: { srv: 'Service', S: { course: '🛣️ One ride', heures: '⏱️ By the hour', demi: '🌗 Half day', jour: '☀️ Full day', sejour: '📅 Whole stay' }, gam: 'Car', G: { luxe: '💎 Luxury', confort: '🚘 Comfort', eco: '🚕 Economy' }, ext: 'Extras', E: { garde: '🛡️ Bodyguard', boissons: '🍾 Drinks', friandises: '🍫 Sweets', siege: '🍼 Child seat', pancarte: '🪧 Name sign', bagages: '🧳 Luggage help' }, free: 'free', hours: 'How many hours?', total: 'Estimated total', ask: 'price on request', book: '🚘 Book a driver', dest: 'Where to?', destPh: 'e.g. City centre, restaurant, Trier…', fromL: 'From', mine: 'My bookings', W: '⏳ pending', O: '✅ confirmed', N: '❌ not available' },
  de: { srv: 'Leistung', S: { course: '🛣️ Eine Fahrt', heures: '⏱️ Pro Stunde', demi: '🌗 Halber Tag', jour: '☀️ Ganzer Tag', sejour: '📅 Ganzer Aufenthalt' }, gam: 'Auto', G: { luxe: '💎 Luxus', confort: '🚘 Komfort', eco: '🚕 Economy' }, ext: 'Extras', E: { garde: '🛡️ Leibwächter', boissons: '🍾 Getränke', friandises: '🍫 Süßigkeiten', siege: '🍼 Kindersitz', pancarte: '🪧 Namensschild', bagages: '🧳 Gepäckhilfe' }, free: 'gratis', hours: 'Wie viele Stunden?', total: 'Geschätzter Gesamtpreis', ask: 'Preis auf Anfrage', book: '🚘 Fahrer buchen', dest: 'Wohin?', destPh: 'z. B. Zentrum, Restaurant, Trier…', fromL: 'Abfahrt', mine: 'Meine Buchungen', W: '⏳ wartet', O: '✅ bestätigt', N: '❌ nicht verfügbar' },
  it: { srv: 'Servizio', S: { course: '🛣️ Una corsa', heures: '⏱️ A ore', demi: '🌗 Mezza giornata', jour: '☀️ Giornata intera', sejour: '📅 Tutto il soggiorno' }, gam: 'Auto', G: { luxe: '💎 Lusso', confort: '🚘 Comfort', eco: '🚕 Economica' }, ext: 'Extra', E: { garde: '🛡️ Guardia del corpo', boissons: '🍾 Bevande', friandises: '🍫 Dolcetti', siege: '🍼 Seggiolino bimbo', pancarte: '🪧 Cartello col suo nome', bagages: '🧳 Aiuto bagagli' }, free: 'offerto', hours: 'Quante ore?', total: 'Totale stimato', ask: 'prezzo su richiesta', book: '🚘 Prenota un autista', dest: 'Per andare dove?', destPh: 'es. Centro, ristorante, Trier…', fromL: 'Partenza', mine: 'Le mie prenotazioni', W: '⏳ in attesa', O: '✅ confermato', N: '❌ non disponibile' },
  pt: { srv: 'Serviço', S: { course: '🛣️ Uma corrida', heures: '⏱️ À hora', demi: '🌗 Meio dia', jour: '☀️ Dia inteiro', sejour: '📅 Toda a estadia' }, gam: 'Carro', G: { luxe: '💎 Luxo', confort: '🚘 Conforto', eco: '🚕 Económico' }, ext: 'Extras', E: { garde: '🛡️ Guarda-costas', boissons: '🍾 Bebidas', friandises: '🍫 Guloseimas', siege: '🍼 Cadeira de criança', pancarte: '🪧 Placa com o nome', bagages: '🧳 Ajuda com bagagens' }, free: 'oferta', hours: 'Quantas horas?', total: 'Total estimado', ask: 'preço sob consulta', book: '🚘 Reservar um motorista', dest: 'Para onde?', destPh: 'ex. Centro, restaurante, Trier…', fromL: 'Partida', mine: 'As minhas reservas', W: '⏳ em espera', O: '✅ confirmado', N: '❌ indisponível' },
  es: { srv: 'Servicio', S: { course: '🛣️ Un trayecto', heures: '⏱️ Por horas', demi: '🌗 Medio día', jour: '☀️ Día completo', sejour: '📅 Toda la estancia' }, gam: 'Coche', G: { luxe: '💎 Lujo', confort: '🚘 Confort', eco: '🚕 Económico' }, ext: 'Extras', E: { garde: '🛡️ Guardaespaldas', boissons: '🍾 Bebidas', friandises: '🍫 Golosinas', siege: '🍼 Silla infantil', pancarte: '🪧 Cartel con su nombre', bagages: '🧳 Ayuda con equipaje' }, free: 'gratis', hours: '¿Cuántas horas?', total: 'Total estimado', ask: 'precio a consultar', book: '🚘 Reservar un conductor', dest: '¿Adónde?', destPh: 'p. ej. Centro, restaurante, Trier…', fromL: 'Salida', mine: 'Mis reservas', W: '⏳ pendiente', O: '✅ confirmado', N: '❌ no disponible' },
};
const TXT = () => TX[lang] || TX.fr;
// les 7 photos (mêmes cases que dans l'app de l'établissement)
const PH = { immeuble: ['🏢', { fr: 'Bâtiment', en: 'Building', de: 'Gebäude', it: 'Edificio', pt: 'Edifício', es: 'Edificio' }], porte: ['🚪', { fr: 'Porte', en: 'Door', de: 'Tür', it: 'Porta', pt: 'Porta', es: 'Puerta' }],
  sdb: ['🛁', { fr: 'Salle de bain', en: 'Bathroom', de: 'Bad', it: 'Bagno', pt: 'Casa de banho', es: 'Baño' }], chambre: ['🛏️', { fr: 'Chambre', en: 'Room', de: 'Zimmer', it: 'Camera', pt: 'Quarto', es: 'Habitación' }],
  cuisine: ['🍳', { fr: 'Cuisine', en: 'Kitchen', de: 'Küche', it: 'Cucina', pt: 'Cozinha', es: 'Cocina' }], parking: ['🅿️', { fr: 'Parking', en: 'Parking', de: 'Parkplatz', it: 'Parcheggio', pt: 'Estacionamento', es: 'Aparcamiento' }],
  autre: ['📷', { fr: 'Autre', en: 'Other', de: 'Andere', it: 'Altro', pt: 'Outro', es: 'Otro' }] };
const CAT = { eco: 'Économique / Economy', standard: 'Standard', sup: 'Supérieure / Superior', deluxe: 'Deluxe', suite: 'Suite', vip: '⭐ Suite présidentielle / Presidential suite' };
const TYP = { single: 'Single', double: 'Double', twin: 'Twin', triple: 'Triple', famille: 'Family', studio: 'Studio', appartement: 'Apartment', maison: 'House', colocation: 'Flatshare' };
// lieux connus (prise en charge du taxi)
const SPOTS = { aero: [49.6233, 6.2044], gare: [49.5998, 6.134] };

let data = null, loadErr = '', lang = 'fr', hMap = null; // 🗺️ carte en haut (à la place de la publicité)
// ▦ QR / lien de l'hôtel : ?c=<code> → le code est déjà écrit
const QC = (() => { try { return (new URLSearchParams(location.search).get('c') || '').replace(/[^0-9A-Za-z]/g, '').slice(0, 16); } catch { return ''; } })();
try { lang = localStorage.getItem('hoteLang') || ''; } catch { /* stockage bloqué */ }
const T = () => L[lang] || L.fr;
const pick = (d) => { if (d && LANGS.includes(d.lang)) return d.lang; const n = (navigator.language || 'fr').slice(0, 2); return LANGS.includes(n) ? n : 'en'; };
const ls = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* stockage plein */ } } };
async function sendOwner(o) {
  if (!data || !data.signalKey) throw new Error('signal');
  const r = await fetch(`${API}/api/esp/${id}/signal?app=hote`, { method: 'POST', body: await sealForOwner(data.signalKey, { espace: id, t: new Date().toISOString(), ...o }) });
  if (!r.ok) throw new Error(r.status);
}
// 🚗 voitures des taxis, souhait libre, 🔑 location de voiture (6 langues)
const CARS = {
  fr: { T: { berline: '🚘 Berline', suv: '🚙 SUV', van: '🚐 Van (6-8 places)', luxe: '💎 Luxe / limousine', sport: '🏎️ Sportive', minibus: '🚌 Minibus' }, veh: 'Type de voiture', any: 'Peu importe', wish: '📝 Un souhait ? (eau, champagne, siège bébé…)', fleet: '🚗 Nos voitures', out: 'dehors', in: 'dedans',
    rent: '🔑 Louer une voiture (sans chauffeur)', du: 'Du', au: 'Au', boite: 'Boîte de vitesses', auto: 'Automatique', man: 'Manuelle', livr: 'Livrée à l’hôtel', rsend: 'Envoyer la demande', rok: '✅ Demande envoyée : l’hôtel vous répond ici ou dans la chat.', rnote: 'Permis de conduire et caution : demandés par le loueur.' },
  en: { T: { berline: '🚘 Sedan', suv: '🚙 SUV', van: '🚐 Van (6-8 seats)', luxe: '💎 Luxury / limousine', sport: '🏎️ Sports car', minibus: '🚌 Minibus' }, veh: 'Type of car', any: 'Any', wish: '📝 A wish? (water, champagne, baby seat…)', fleet: '🚗 Our cars', out: 'outside', in: 'inside',
    rent: '🔑 Rent a car (no driver)', du: 'From', au: 'To', boite: 'Gearbox', auto: 'Automatic', man: 'Manual', livr: 'Delivered to the hotel', rsend: 'Send the request', rok: '✅ Request sent: the hotel will answer here or in the chat.', rnote: 'Driving licence and deposit: asked by the rental company.' },
  de: { T: { berline: '🚘 Limousine', suv: '🚙 SUV', van: '🚐 Van (6-8 Plätze)', luxe: '💎 Luxus / Stretch', sport: '🏎️ Sportwagen', minibus: '🚌 Kleinbus' }, veh: 'Fahrzeugtyp', any: 'Egal', wish: '📝 Ein Wunsch? (Wasser, Champagner, Kindersitz…)', fleet: '🚗 Unsere Fahrzeuge', out: 'außen', in: 'innen',
    rent: '🔑 Auto mieten (ohne Fahrer)', du: 'Von', au: 'Bis', boite: 'Getriebe', auto: 'Automatik', man: 'Schaltung', livr: 'Lieferung ans Hotel', rsend: 'Anfrage senden', rok: '✅ Anfrage gesendet: das Hotel antwortet hier oder im Chat.', rnote: 'Führerschein und Kaution: vom Vermieter verlangt.' },
  it: { T: { berline: '🚘 Berlina', suv: '🚙 SUV', van: '🚐 Van (6-8 posti)', luxe: '💎 Lusso / limousine', sport: '🏎️ Sportiva', minibus: '🚌 Minibus' }, veh: 'Tipo di auto', any: 'Indifferente', wish: '📝 Un desiderio? (acqua, champagne, seggiolino…)', fleet: '🚗 Le nostre auto', out: 'fuori', in: 'dentro',
    rent: '🔑 Noleggiare un’auto (senza autista)', du: 'Dal', au: 'Al', boite: 'Cambio', auto: 'Automatico', man: 'Manuale', livr: 'Consegnata in hotel', rsend: 'Invia la richiesta', rok: '✅ Richiesta inviata: l’hotel risponde qui o in chat.', rnote: 'Patente e cauzione: chieste dal noleggiatore.' },
  pt: { T: { berline: '🚘 Berlina', suv: '🚙 SUV', van: '🚐 Carrinha (6-8 lugares)', luxe: '💎 Luxo / limusina', sport: '🏎️ Desportivo', minibus: '🚌 Minibus' }, veh: 'Tipo de carro', any: 'Tanto faz', wish: '📝 Um desejo? (água, champanhe, cadeira de bebé…)', fleet: '🚗 Os nossos carros', out: 'fora', in: 'dentro',
    rent: '🔑 Alugar um carro (sem motorista)', du: 'De', au: 'Até', boite: 'Caixa', auto: 'Automática', man: 'Manual', livr: 'Entregue no hotel', rsend: 'Enviar o pedido', rok: '✅ Pedido enviado: o hotel responde aqui ou no chat.', rnote: 'Carta de condução e caução: pedidas pela empresa de aluguer.' },
  es: { T: { berline: '🚘 Berlina', suv: '🚙 SUV', van: '🚐 Furgoneta (6-8 plazas)', luxe: '💎 Lujo / limusina', sport: '🏎️ Deportivo', minibus: '🚌 Minibús' }, veh: 'Tipo de coche', any: 'Da igual', wish: '📝 ¿Un deseo? (agua, champán, silla de bebé…)', fleet: '🚗 Nuestros coches', out: 'fuera', in: 'dentro',
    rent: '🔑 Alquilar un coche (sin conductor)', du: 'Del', au: 'Al', boite: 'Cambio', auto: 'Automático', man: 'Manual', livr: 'Entregado en el hotel', rsend: 'Enviar la solicitud', rok: '✅ Solicitud enviada: el hotel responde aquí o en el chat.', rnote: 'Permiso de conducir y fianza: los pide la empresa de alquiler.' },
};
const CK2 = () => CARS[lang] || CARS.fr;
let rent = { du: '', au: '', veh: '', boite: 'auto', livr: true, note: '', sent: '' };
function fleetCard() {
  const F = (data.fleet || []);
  if (!F.length) return '';
  const k = CK2();
  return `<details class="card hfold" data-fk="fleet"${hFoldShut().has('fleet') ? '' : ' open'}><summary><h2 style="margin:0">${esc(k.fleet)}</h2></summary>${F.map((x) => `<div style="margin:8px 0"><b>${esc(k.T[x.t] || x.t)}</b> <span class="meta">× ${x.n} · ${esc(x.co)}</span><div class="car">${['e', 'i'].filter((w) => x.ph[w]).map((w) => `<figure><img data-f="${esc(x.ph[w])}" alt="" data-lb="1"><figcaption>${esc(w === 'e' ? k.out : k.in)}</figcaption></figure>`).join('')}</div></div>`).join('')}</details>`;
}
const vehOpts = (cur) => { const k = CK2(), ts = [...new Set((data.fleet || []).map((x) => x.t))]; const list = ts.length ? ts : Object.keys(k.T); return `<option value="">${esc(k.any)}</option>${list.map((x) => `<option value="${x}" ${cur === x ? 'selected' : ''}>${esc(k.T[x] || x)}</option>`).join('')}`; };
function rentCard() {
  const k = CK2(), r = rent;
  return `<details class="card hfold" data-fk="rent"${hFoldShut().has('rent') || !r.open ? '' : ' open'}><summary><h2 style="margin:0">${esc(k.rent)}</h2></summary>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><div><label>${esc(k.du)}</label><input type="date" data-rent="du" value="${esc(r.du || data.arrivee)}"></div><div><label>${esc(k.au)}</label><input type="date" data-rent="au" value="${esc(r.au || data.depart)}"></div></div>
    <label>${esc(k.veh)}</label><select data-rent="veh">${vehOpts(r.veh)}</select>
    <label>${esc(k.boite)}</label><select data-rent="boite"><option value="auto" ${r.boite === 'auto' ? 'selected' : ''}>${esc(k.auto)}</option><option value="man" ${r.boite === 'man' ? 'selected' : ''}>${esc(k.man)}</option></select>
    <label class="chk" style="margin-top:8px"><input type="checkbox" data-rent="livr" ${r.livr ? 'checked' : ''}> ${esc(k.livr)}</label>
    <label>${esc(k.wish)}</label><input data-rent="note" value="${esc(r.note)}">
    <p class="meta" style="margin:6px 0 0">${esc(k.rnote)}</p>
    <button class="btn block" style="margin-top:10px" data-rent-send="1">${esc(k.rsend)}</button>${r.sent ? `<p class="ok" style="margin:8px 0 0">${esc(k.rok)}</p>` : ''}</details>`;
}
// ⚠️ allergies, 🍽️ régime et repas, 🛎️ service en chambre : ce que l'hôtel a noté (traduit)
const MEAL = {
  fr: { alc: '⚠️ Chambre', C: { acariens: 'Acariens', plumes: 'Plumes', laine: 'Laine', poils: 'Poils d’animaux', latex: 'Latex', parfums: 'Parfums / produits ménagers', pollen: 'Pollen' }, al: '⚠️ Vos allergies', reg: '🍽️ Régime', dej: '🥗 Déjeuner', din: '🍷 Dîner', resto: 'au restaurant', chambre: 'en chambre', room: '🛎️ Service en chambre', jour: 'aux heures du restaurant', h24: '24 h/24', nuit: '24 h/24 (la nuit : carte réduite, voir le menu)', sup: 'supplément', deliv: '🛵 Livraison de l’extérieur acceptée',
    A: { gluten: 'Gluten', lait: 'Lait / lactose', oeufs: 'Œufs', arachides: 'Arachides', noix: 'Fruits à coque', poisson: 'Poisson', crustaces: 'Crustacés', mollusques: 'Mollusques', soja: 'Soja', celeri: 'Céleri', moutarde: 'Moutarde', sesame: 'Sésame', sulfites: 'Sulfites', lupin: 'Lupin' },
    R: { vege: 'Végétarien', vegan: 'Vegan', halal: 'Halal', casher: 'Casher', sansporc: 'Sans porc', sansalcool: 'Sans alcool' } },
  en: { alc: '⚠️ Room', C: { acariens: 'Dust mites', plumes: 'Feathers', laine: 'Wool', poils: 'Animal hair', latex: 'Latex', parfums: 'Perfumes / cleaning products', pollen: 'Pollen' }, al: '⚠️ Your allergies', reg: '🍽️ Diet', dej: '🥗 Lunch', din: '🍷 Dinner', resto: 'at the restaurant', chambre: 'in your room', room: '🛎️ Room service', jour: 'during restaurant hours', h24: '24/7', nuit: '24/7 (at night: reduced menu, see the menu)', sup: 'surcharge', deliv: '🛵 Outside delivery accepted',
    A: { gluten: 'Gluten', lait: 'Milk / lactose', oeufs: 'Eggs', arachides: 'Peanuts', noix: 'Tree nuts', poisson: 'Fish', crustaces: 'Crustaceans', mollusques: 'Molluscs', soja: 'Soy', celeri: 'Celery', moutarde: 'Mustard', sesame: 'Sesame', sulfites: 'Sulphites', lupin: 'Lupin' },
    R: { vege: 'Vegetarian', vegan: 'Vegan', halal: 'Halal', casher: 'Kosher', sansporc: 'No pork', sansalcool: 'No alcohol' } },
  de: { alc: '⚠️ Zimmer', C: { acariens: 'Hausstaubmilben', plumes: 'Federn', laine: 'Wolle', poils: 'Tierhaare', latex: 'Latex', parfums: 'Duftstoffe / Reinigungsmittel', pollen: 'Pollen' }, al: '⚠️ Ihre Allergien', reg: '🍽️ Ernährung', dej: '🥗 Mittagessen', din: '🍷 Abendessen', resto: 'im Restaurant', chambre: 'im Zimmer', room: '🛎️ Zimmerservice', jour: 'zu den Restaurantzeiten', h24: 'rund um die Uhr', nuit: 'rund um die Uhr (nachts: kleine Karte, siehe Speisekarte)', sup: 'Zuschlag', deliv: '🛵 Lieferdienste von außen erlaubt',
    A: { gluten: 'Gluten', lait: 'Milch / Laktose', oeufs: 'Eier', arachides: 'Erdnüsse', noix: 'Schalenfrüchte', poisson: 'Fisch', crustaces: 'Krebstiere', mollusques: 'Weichtiere', soja: 'Soja', celeri: 'Sellerie', moutarde: 'Senf', sesame: 'Sesam', sulfites: 'Sulfite', lupin: 'Lupinen' },
    R: { vege: 'Vegetarisch', vegan: 'Vegan', halal: 'Halal', casher: 'Koscher', sansporc: 'Ohne Schwein', sansalcool: 'Ohne Alkohol' } },
  it: { alc: '⚠️ Camera', C: { acariens: 'Acari', plumes: 'Piume', laine: 'Lana', poils: 'Peli di animali', latex: 'Lattice', parfums: 'Profumi / detersivi', pollen: 'Polline' }, al: '⚠️ Le sue allergie', reg: '🍽️ Regime', dej: '🥗 Pranzo', din: '🍷 Cena', resto: 'al ristorante', chambre: 'in camera', room: '🛎️ Servizio in camera', jour: 'negli orari del ristorante', h24: '24 ore su 24', nuit: '24 ore su 24 (di notte: menù ridotto, vedi il menù)', sup: 'supplemento', deliv: '🛵 Consegne dall’esterno accettate',
    A: { gluten: 'Glutine', lait: 'Latte / lattosio', oeufs: 'Uova', arachides: 'Arachidi', noix: 'Frutta a guscio', poisson: 'Pesce', crustaces: 'Crostacei', mollusques: 'Molluschi', soja: 'Soia', celeri: 'Sedano', moutarde: 'Senape', sesame: 'Sesamo', sulfites: 'Solfiti', lupin: 'Lupini' },
    R: { vege: 'Vegetariano', vegan: 'Vegano', halal: 'Halal', casher: 'Kosher', sansporc: 'Senza maiale', sansalcool: 'Senza alcol' } },
  pt: { alc: '⚠️ Quarto', C: { acariens: 'Ácaros', plumes: 'Penas', laine: 'Lã', poils: 'Pelos de animais', latex: 'Látex', parfums: 'Perfumes / produtos de limpeza', pollen: 'Pólen' }, al: '⚠️ As suas alergias', reg: '🍽️ Regime', dej: '🥗 Almoço', din: '🍷 Jantar', resto: 'no restaurante', chambre: 'no quarto', room: '🛎️ Serviço de quarto', jour: 'no horário do restaurante', h24: '24 h/24', nuit: '24 h/24 (à noite: carta reduzida, ver o menu)', sup: 'suplemento', deliv: '🛵 Entregas do exterior aceites',
    A: { gluten: 'Glúten', lait: 'Leite / lactose', oeufs: 'Ovos', arachides: 'Amendoins', noix: 'Frutos de casca rija', poisson: 'Peixe', crustaces: 'Crustáceos', mollusques: 'Moluscos', soja: 'Soja', celeri: 'Aipo', moutarde: 'Mostarda', sesame: 'Sésamo', sulfites: 'Sulfitos', lupin: 'Tremoço' },
    R: { vege: 'Vegetariano', vegan: 'Vegano', halal: 'Halal', casher: 'Kosher', sansporc: 'Sem porco', sansalcool: 'Sem álcool' } },
  es: { alc: '⚠️ Habitación', C: { acariens: 'Ácaros', plumes: 'Plumas', laine: 'Lana', poils: 'Pelo de animales', latex: 'Látex', parfums: 'Perfumes / productos de limpieza', pollen: 'Polen' }, al: '⚠️ Sus alergias', reg: '🍽️ Dieta', dej: '🥗 Almuerzo', din: '🍷 Cena', resto: 'en el restaurante', chambre: 'en la habitación', room: '🛎️ Servicio de habitaciones', jour: 'en el horario del restaurante', h24: '24 h', nuit: '24 h (de noche: carta reducida, ver el menú)', sup: 'suplemento', deliv: '🛵 Se aceptan entregas del exterior',
    A: { gluten: 'Gluten', lait: 'Leche / lactosa', oeufs: 'Huevos', arachides: 'Cacahuetes', noix: 'Frutos de cáscara', poisson: 'Pescado', crustaces: 'Crustáceos', mollusques: 'Moluscos', soja: 'Soja', celeri: 'Apio', moutarde: 'Mostaza', sesame: 'Sésamo', sulfites: 'Sulfitos', lupin: 'Altramuces' },
    R: { vege: 'Vegetariano', vegan: 'Vegano', halal: 'Halal', casher: 'Kosher', sansporc: 'Sin cerdo', sansalcool: 'Sin alcohol' } },
};
function mealHtml(m) {
  if (!m) return '';
  const k = MEAL[lang] || MEAL.fr, row = (x) => `<p class="meta" style="margin:6px 0 0">${x}</p>`, out = [];
  const al = [...(m.allerg || []).map((a) => k.A[a] || a), m.allergAutre].filter(Boolean);
  if (al.length) out.push(`<p style="margin:8px 0 0;color:#b91c1c"><b>${esc(k.al)}</b> : ${esc(al.join(', '))}</p>`);
  const alc = [...(m.allergCh || []).map((a) => k.C[a] || a), m.allergChAutre].filter(Boolean);
  if (alc.length) out.push(`<p style="margin:6px 0 0;color:#b91c1c"><b>${esc(k.alc)}</b> : ${esc(alc.join(', '))}</p>`);
  if ((m.regime || []).length) out.push(row(`${esc(k.reg)} : ${esc(m.regime.map((r) => k.R[r] || r).join(', '))}`));
  if (m.dej) out.push(row(`${esc(k.dej)} (${esc(k[m.dejOu] || k.resto)}) : ${esc(m.dej)}`));
  if (m.din) out.push(row(`${esc(k.din)} (${esc(k[m.dinOu] || k.resto)}) : ${esc(m.din)}`));
  if (m.room) out.push(row(`${esc(k.room)} : ${esc(k[m.room.svc] || '')}${+m.room.pct ? ` · ${esc(k.sup)} ${+m.room.pct} %` : ''}${m.room.deliv ? ' · ' + esc(k.deliv) : ''}`));
  return out.join('');
}
// fichiers chiffrés (photos de la chambre, menu)
const fileUrls = new Map();
async function fileUrl(fid, mime = 'image/jpeg') {
  if (fileUrls.has(fid)) return fileUrls.get(fid);
  const r = await fetch(`${API}/api/esp/${id}/f/${fid}`, { cache: 'no-store' });
  if (!r.ok) throw new Error(r.status);
  const u = URL.createObjectURL(new Blob([await openBytes(key, await r.arrayBuffer())], { type: mime }));
  fileUrls.set(fid, u);
  return u;
}
function hydrate() {
  app.querySelectorAll('img[data-f]').forEach(async (im) => { try { im.src = await fileUrl(im.dataset.f); } catch { im.remove(); } });
}

// ── 🚗 / 🚕 distance et prix (vol d'oiseau × 1,25 ≈ route) ──
const hav = (a, b) => { const R = 6371, r = (x) => (x * Math.PI) / 180, dl = r(b[0] - a[0]), dn = r(b[1] - a[1]); const h = Math.sin(dl / 2) ** 2 + Math.cos(r(a[0])) * Math.cos(r(b[0])) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
const roadKm = (a, b) => Math.max(1, Math.round(hav(a, b) * 1.25));
const geoCache = {};
async function geocode(q) {
  const k = String(q || '').trim().toLowerCase();
  if (!k) return null;
  if (geoCache[k] !== undefined) return geoCache[k];
  try {
    const j = await (await fetch('https://geocoding-api.open-meteo.com/v1/search?count=1&language=fr&name=' + encodeURIComponent(q))).json();
    const p = (j.results || [])[0];
    geoCache[k] = p ? [p.latitude, p.longitude] : null;
  } catch { geoCache[k] = null; }
  return geoCache[k];
}
// commune de l'établissement : ce qui suit le code postal (« 12 rue X, L-1234 Luxembourg » → « Luxembourg »)
const cityOf = (a) => { const m = String(a || '').match(/(?:L-|\b)\d{4,5}\s+([^,\d]+)/i); return (m ? m[1] : String(a || '').split(',').pop()).trim() || 'Luxembourg'; };
let stG = null;
const stGeo = async () => stG || (stG = await geocode(cityOf(data.st.adresse)));
let arrForm = { mode: '', spot: 'aero', other: '', quand: '', vol: '', est: null, service: 'course', gamme: '', extras: [], heures: 3 }, arrEdit = false;
let ride = { open: false, service: 'course', gamme: '', extras: [], heures: 3, quand: '', to: '', sent: '' };
const nights = () => Math.max(1, Math.round((new Date(data.depart) - new Date(data.arrivee)) / 864e5));
// prix : gamme choisie (tarifs du réseau) ou tarifs de l'établissement ; + extras
function price(f, km) {
  const tx = data.taxi || {}, g = (tx.gam || []).find((x) => x.k === f.gamme) || null;
  let p = 0;
  if (f.service === 'course') p = g ? (g.pc || 0) + (km || 0) * (g.km || 0) : (f.spot === 'aero' && tx.aero) || (f.spot === 'gare' && tx.gare) || (tx.km ? (tx.pc || 0) + (km || 0) * tx.km : 0);
  else if (g) p = f.service === 'heures' ? Math.max(2, +f.heures || 2) * (g.h || 0) : f.service === 'demi' ? g.demi || 0 : f.service === 'jour' ? g.jour || 0 : (g.jour || 0) * nights();
  if (!p) return 0;
  for (const k of f.extras || []) p += +((tx.ext || []).find((x) => x.k === k) || {}).p || 0;
  return Math.round(p);
}
// choix du service, de la gamme et des extras (taxi à l'arrivée et chauffeur pendant le séjour)
function svcHtml(f, pfx) {
  const tx = data.taxi || {}, w = TXT(), gam = tx.gam || [], ext = tx.ext || [];
  return `${gam.length ? `<label>${esc(w.srv)}</label><select data-${pfx}-srv="1">${Object.entries(w.S).map(([k, l]) => `<option value="${k}" ${f.service === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>
    ${f.service === 'heures' ? `<label>${esc(w.hours)}</label><input type="number" min="2" max="24" data-${pfx}-h="1" value="${esc(f.heures)}">` : ''}
    <label>${esc(w.gam)}</label>${gam.map((g) => `<label class="radio"><input type="radio" name="${pfx}Gam" value="${g.k}" ${f.gamme === g.k ? 'checked' : ''}> ${esc(w.G[g.k])}</label>`).join('')}` : ''}
    ${ext.length ? `<label>${esc(w.ext)}</label><div class="exts">${ext.map((x) => `<label class="chk"><input type="checkbox" data-${pfx}-ext="${x.k}" ${(f.extras || []).includes(x.k) ? 'checked' : ''}> ${esc(w.E[x.k])} <span class="meta">${x.p ? '+' + x.p + ' €' : esc(w.free)}</span></label>`).join('')}</div>` : ''}`;
}
async function estimate() {
  const s = await stGeo(), f = arrForm.spot === 'other' ? await geocode(arrForm.other) : SPOTS[arrForm.spot];
  if (!s || !f) { arrForm.est = null; return paintEst(); }
  const km = roadKm(f, s), prix = price(arrForm, km);
  arrForm.est = { km, min: Math.round(km / 0.75) + 5, prix, fg: f, sg: s };
  paintEst();
}
function paintEst() {
  const el = document.getElementById('estBox'), t = T(), e = arrForm.est;
  if (e) e.prix = price(arrForm, e.km);
  if (el) el.innerHTML = e ? `<b>${esc(t.est)} :</b> ${e.km} km · ~${e.min} min · <b>${e.prix ? '~' + e.prix + ' €' : esc(TXT().ask)}</b>` : esc(t.calc);
}
const arrSent = () => { try { return JSON.parse(ls.get('hoteArr:' + id) || 'null'); } catch { return null; } };
// mon trajet (je viens moi-même) : heure d'arrivée envoyée au plus toutes les minutes ; position jamais envoyée
let myTrip = null, watchId = null, lastPost = 0;
async function tripPost(st, eta) {
  try { await fetch(`${API}/api/trip/${data.tin}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ st, eta, n: data.prenom || data.nom }) }); } catch { /* hors ligne : on réessaiera */ }
}
function tripStart() {
  const s0 = Date.now();
  myTrip = { st: 'go', at: s0 };
  ls.set('hoteTrip:' + id, JSON.stringify(myTrip));
  if (!navigator.geolocation) { myTrip.noGps = true; return render(); }
  watchId = navigator.geolocation.watchPosition(async (p) => {
    const s = await stGeo();
    if (!s) return;
    const km = roadKm([p.coords.latitude, p.coords.longitude], s), eta = Date.now() + (Math.round(km / 0.75) + 2) * 60000;
    if (Date.now() - lastPost > 60000) { lastPost = Date.now(); tripPost('go', eta); }
  }, () => { myTrip.noGps = true; render(); }, { enableHighAccuracy: false, maximumAge: 60000, timeout: 20000 });
  render();
}
function tripStop() {
  if (watchId != null) navigator.geolocation.clearWatch(watchId);
  watchId = null; myTrip = { st: 'here' }; ls.set('hoteTrip:' + id, JSON.stringify(myTrip));
  tripPost('here'); render();
}
let trips = {};
async function tripPoll() {
  if (!data || document.visibilityState !== 'visible' || data.arrivee !== today) return;
  try { trips = await tripFetch(API + '/api/', [data.t1].filter(Boolean)); } catch { /* hors ligne */ }
  const el = document.getElementById('taxiTrip'), h = data.t1 ? tripView(trips[data.t1], { lang }) : '';
  if (el && el.innerHTML !== h) el.innerHTML = h;
}
setInterval(tripPoll, 30000);

// ── 📋 photos de sortie : réduites (1600 px) puis chiffrées pour l'établissement ──
let edl = {}, edlMsg = '';
async function jpeg(file) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height)), c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return new Uint8Array(await (await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.82))).arrayBuffer());
}
const edlDone = () => { try { return JSON.parse(ls.get('hoteEdl:' + id) || '[]'); } catch { return []; } };

// ── notifications ──
let pushSt = '', pushJust = false;
const pushPost = (b) => fetch(`${API}/api/esp/${id}/push`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...b, app: 'hote', lang, boards: [] }) }).then((r) => { if (!r.ok) throw new Error(r.status); });
async function pushInit() {
  pushSt = await pushStatus('/hote');
  if (pushSt === 'on') pushRefresh('/hote', pushPost);
  setBadge(0, '/hote');
  render();
}

// ── publicités (3 emplacements, comme les autres apps) ──
let pubTurn = 0;
try { pubTurn = (+ls.get('hotePubTurn') || 0) + 1; ls.set('hotePubTurn', String(pubTurn)); } catch { /* stockage indisponible */ }
const pickPub = (list) => pubPickNow(list); // tour de 3 minutes chacune
const pubNow = (x) => { const n = new Date(), hm = String(n.getHours()).padStart(2, '0') + ':' + String(n.getMinutes()).padStart(2, '0'); return (!x.jours || !x.jours.length || x.jours.includes(n.getDay())) && (!x.h1 || !x.h2 || (x.h1 <= x.h2 ? hm >= x.h1 && hm < x.h2 : hm >= x.h1 || hm < x.h2)); };
const pubLogo = (x) => (/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(x.logo || '') && x.logo.length < 60000 ? `<img src="${x.logo}" alt="" style="float:right;max-height:44px;max-width:90px;object-fit:contain;border-radius:8px;margin:0 0 4px 8px;background:#fff">` : ''); // logo de l'annonceur
// 🔽 annonces repliables : celles fermées restent fermées sur ce téléphone
// cartes repliables (🛏️ la chambre…) : le choix reste sur le téléphone
const hFoldShut = () => { try { return new Set(JSON.parse(localStorage.getItem('hFold') || '[]')); } catch { return new Set(); } };
document.addEventListener('toggle', (e) => { const d = e.target; if (!d.classList || !d.classList.contains('hfold')) return; const s = hFoldShut(); if (d.open) s.delete(d.dataset.fk); else s.add(d.dataset.fk); try { localStorage.setItem('hFold', JSON.stringify([...s])); } catch { /* plein */ } }, true);
const adShut = () => { try { return new Set(JSON.parse(localStorage.getItem('adShut') || '[]')); } catch { return new Set(); } };
document.addEventListener('toggle', (e) => { const d = e.target; if (!d.classList || !d.classList.contains('pub-box')) return; const s = adShut(); if (d.open) s.delete(d.dataset.pid); else s.add(d.dataset.pid); try { localStorage.setItem('adShut', JSON.stringify([...s].slice(-60))); } catch { /* stockage plein */ } }, true);
function adBox(x, t) {
  const v = x.video ? videoEmbed(x.video) : null;
  return `<details class="card pub-box" data-pid="${esc(x.id)}"${adShut().has(x.id) ? '' : ' open'}><summary><div class="meta"><b class="pub-lbl">📣 ${esc(t.ad.lbl)}</b></div>${pubLogo(x)}<b style="display:block;font-size:17px">${esc(x.nom)}</b></summary>${x.texte ? `<p class="pub-txt" style="margin:4px 0 0;white-space:pre-wrap">${esc(x.texte)}</p>` : ''}
    ${v ? `<div class="vid${v.tall ? ' tall' : ''}" data-vsrc="${esc(v.src)}"></div>` : ''}${x.adresse ? `<div class="meta" style="margin-top:6px">📍 ${esc(x.adresse)}</div>` : ''}
    <div class="btns">${x.adresse ? `<button class="btn sm" data-hmap="${esc(x.adresse)}" data-hnom="${esc(x.nom || x.titre || '')}" data-pev="map">${esc(t.ad.see)}</button>` : ''}${x.tel ? `<a class="btn sm sec" href="tel:${esc(x.tel.replace(/[^\d+]/g, ''))}" data-pev="call">${esc(t.ad.call)}</a>` : ''}${x.web ? `<a class="btn sm sec" href="${esc(/^https?:/.test(x.web) ? x.web : 'https://' + x.web)}" target="_blank" rel="noopener" data-pev="web">${esc(t.ad.web)}</a>` : ''}</div>${pubSocialBar(x)}</details>`;
}

// 🛎️ icône de l'app (onglet, iPhone, Android) : le logo de l'hôtel / de l'hôte (✏️ dans sa centrale), sinon 🛎️ hôtel · 🏠 Airbnb — jamais celle de LA CENTRAL
let iconSig = '';
function hIcons(d) {
  const bnb = d.lieu === 'airbnb', st = d.st || {}, logo = st.logo || '', sig = (bnb ? 'b' : 'h') + logo.length + (st.nom || '');
  if (sig === iconSig) return;
  iconSig = sig;
  const def = location.origin + (bnb ? '/ares/icons/bnb-' : '/ares/icons/hote-'), nom = st.nom || (bnb ? 'Airbnb' : 'Mon séjour');
  const apply = (u180, u192, u512) => {
    document.querySelectorAll('link[rel="icon"]').forEach((l) => { l.href = u192; });
    document.querySelectorAll('link[rel="apple-touch-icon"]').forEach((l) => { l.href = u180; });
    let t = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (!t) { t = document.createElement('meta'); t.name = 'apple-mobile-web-app-title'; document.head.append(t); }
    t.content = nom.slice(0, 20);
    const m = { name: nom, short_name: nom.slice(0, 12), start_url: location.origin + '/hote.html', scope: location.origin + '/hote', display: 'standalone', background_color: '#f3f5f4', theme_color: '#92400E', icons: [{ src: u192, sizes: '192x192', type: 'image/png' }, { src: u512, sizes: '512x512', type: 'image/png' }] };
    const l = document.querySelector('link[rel="manifest"]');
    if (l) { try { const old = l.dataset.blob; l.href = URL.createObjectURL(new Blob([JSON.stringify(m)], { type: 'application/manifest+json' })); l.dataset.blob = l.href; if (old) URL.revokeObjectURL(old); } catch { /* le manifeste fixe reste */ } }
  };
  const plain = () => apply(def + '180.png', def + '192.png', def + '512.png');
  if (!logo) return plain();
  const img = new Image();
  img.onload = () => {
    const mk = (n) => { const c = document.createElement('canvas'); c.width = c.height = n; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, n, n); const k = Math.min((n * 0.86) / img.width, (n * 0.86) / img.height); x.drawImage(img, (n - img.width * k) / 2, (n - img.height * k) / 2, img.width * k, img.height * k); return c.toDataURL('image/png'); };
    try { apply(mk(180), mk(192), mk(512)); } catch { plain(); }
  };
  img.onerror = plain;
  img.src = logo;
}
function hMapFill() {
  const mb = document.getElementById('hMapBox');
  if (!mb || mb.querySelector('iframe')) return;
  const f = document.createElement('iframe');
  f.src = `https://maps.google.com/maps?q=${encodeURIComponent(mb.dataset.q)}&hl=${lang}&z=16&output=embed`; f.title = 'Google Maps'; f.loading = 'lazy'; f.referrerPolicy = 'no-referrer-when-downgrade';
  mb.append(f);
}
function render() {
  setTimeout(hMapFill, 0);
  if (data) hIcons(data);
  const t = T();
  document.documentElement.lang = lang;
  const langs = `<div class="langs">${LANGS.map((k) => `<button data-lang="${k}" aria-pressed="${k === lang}">${k.toUpperCase()}</button>`).join('')}</div>`;
  if (!data) {
    app.innerHTML = `<div class="top"><span class="brandx"><b>🏨 ${esc(t.app)}</b></span>${langs}</div>
      <p class="sub" style="text-align:center;margin-top:18px">${esc(t.welcome)}</p>
      ${loadErr ? `<div class="card warnc"><p style="margin:0">${esc(loadErr)}</p></div>` : ''}
      <div class="card"><form id="codeForm"><label>${esc(t.code)}</label>
        <input type="text" name="code" inputmode="numeric" autocomplete="one-time-code" autocapitalize="characters" spellcheck="false" value="${esc(QC)}" style="font-size:24px;letter-spacing:.1em;text-align:center">
        <button class="btn block" style="margin-top:12px" type="submit">${esc(t.enter)}</button></form></div>`;
    return;
  }
  const d = data, out = [], bnb = d.lieu === 'airbnb', ch = d.ch || {}, st = d.st || {};
  document.title = `${t.app} — ${st.nom}`;
  const tel = String(st.tel || '').replace(/[^\d+]/g, ''), wa = String(st.wa || '').replace(/[^\d]/g, '').replace(/^00/, '');
  // 1 · en-tête : logo et nom de l'établissement, langues ; bonjour + dates
  out.push(`<div class="top"><span class="brandx">${st.logo ? `<img class="top-logo" src="${esc(st.logo)}" alt="">` : ''}<b>${esc(st.nom)}</b></span>${langs}</div>
    <h1>${bnb ? '🏠' : '🏨'} ${esc(t.hi)} ${esc(d.prenom || d.nom)}</h1>
    <p class="sub">${esc(t.from)} ${esc(fmt(d.arrivee))} · ${esc(t.to)} ${esc(fmt(d.depart))}${d.pers > 1 ? ` · 👥 ${d.pers} ${esc(t.pers)}` : ''}</p>`);
  if (today > d.depart) out.push(`<div class="card okc"><p style="margin:0">🙏 ${esc(t.thanks)}</p></div>`);
  const pubs = (d.pubs || []).filter((x) => (!x.fin || x.fin >= today) && pubNow(x) && pubLive(x)), slot = (k) => pickPub(pubs.filter((x) => pubSlotNow(x) === k));
  // 2 · publicité (haut)
  out.push(domierHtml({ tel: st.tel, form: 'room', list: d.doms || [], lang })); // 🔧 DOMIER : un problème dans la chambre → l'hôtel / l'hôte
  { const p = slot('haut'), hq = hMap && (hMap.q === 'hotel' ? st.adresse : hMap.q);
    if (hq) out.push(`<div class="card mapcard" id="hMapCard"><p style="margin:0 0 8px"><b>${esc(t.ad.mapT)} · ${esc(hMap.q === 'hotel' ? st.nom || '' : hMap.nom || '')}</b><br><span class="meta">📍 ${esc(hq)}</span></p><div id="hMapBox" class="map" data-q="${esc(hq)}"></div>
      <div class="btns"><a class="btn sm" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(hq)}" target="_blank" rel="noopener">${esc(t.way)}</a>${hMap.q !== 'hotel' && st.adresse ? `<button class="btn sm sec" data-hmap="hotel">${esc(t.ad.home)}</button>` : ''}${p ? `<button class="btn sm sec" data-hpubback="1">${esc(t.ad.back)}</button>` : ''}</div></div>`);
    else if (p) out.push(adBox(p, t)); }
  // 3 · notifications
  if (pushSt && pushSt !== 'unsupported' && (pushSt !== 'on' || pushJust)) out.push(`<div class="card notif"><h2>🔔 ${esc(t.notif)}</h2><p class="meta" style="margin:0 0 8px">${esc(t.notifHint)}</p>${pushSt === 'on' ? `<p class="ok" style="margin:0">${esc(t.notifOk)}</p>` : `<button class="btn sm" data-push="1">${esc(t.notifOn)}</button>`}</div>`);
  // 4 · météo + radio
  out.push(wxRadioCard());
  // 5 · cœur : ma chambre / mon logement
  const phs = Object.keys(PH).filter((k) => (ch.ph || {})[k]);
  const inStay = today >= d.arrivee && today <= d.depart;
  out.push(`<details class="card hfold" data-fk="room"${hFoldShut().has('room') ? '' : ' open'}><summary><h2 style="margin:0">${bnb ? '🏠' : '🛏️'} ${esc(bnb ? t.home : t.room)} ${esc(ch.num)}</h2></summary>
    ${phs.length ? `<div class="car">${phs.map((k) => `<figure><img data-f="${esc(ch.ph[k])}" alt="" data-lb="1"><figcaption>${PH[k][0]} ${esc(PH[k][1][lang] || PH[k][1].fr)}</figcaption></figure>`).join('')}</div>` : ''}
    <p style="margin:8px 0 0"><b>${esc([CAT[ch.cat], TYP[ch.typ]].filter(Boolean).join(' · '))}</b></p>
    <p class="meta" style="margin:2px 0 0">${[ch.etage ? `${t.floor} ${ch.etage}` : '', ch.m2 ? ch.m2 + ' m²' : '', ch.npieces ? ch.npieces + ' ' + t.rooms : '', ch.persMax ? `👥 ${t.max} ${ch.persMax}` : ''].filter(Boolean).map(esc).join(' · ')}</p>
    ${ch.desc ? `<p style="margin:8px 0 0;white-space:pre-wrap">${esc(ch.desc)}</p>` : ''}
    ${d.porte ? `<div class="door">🔑 ${esc(t.door)} : ${inStay ? `<b>${esc(d.porte)}</b> <span class="meta">(${esc(t.after)} ${esc(d.hdeb)} · ${esc(t.before)} ${esc(d.hfin)})</span>` : `<span class="meta">${esc(t.doorSoon)}</span>`}</div>` : ''}
    ${d.cle ? `<p class="meta" style="margin:6px 0 0">🪪 ${esc(t.key)} : ${esc(d.cle)}</p>` : ''}
    ${st.adresse ? `<p class="meta" style="margin:8px 0 0">📍 ${esc(st.adresse)}</p><div class="btns"><button class="btn sm sec" data-hmap="hotel">${esc(t.ad.mapT)}</button><a class="btn sm sec" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(st.adresse)}" target="_blank" rel="noopener">${esc(t.way)}</a></div>` : ''}</details>`);
  // 6 · publicité (milieu)
  { const p = slot('milieu'); if (p) out.push(adBox(p, t)); }
  // 6b · prix du séjour (Airbnb)
  if (bnb && today <= d.depart) out.push(sejourHtml(d.sejour));
  // 7 · cœur : mon séjour (formule, menu, préférences, contact) + arrivée (taxi ou soi-même)
  const ml = mealHtml(d.meal);
  out.push(`<div class="card"><h2>🧳 ${esc(t.stay)}</h2>
    <p style="margin:0">🛬 ${esc(t.from)} : <b>${esc(fmt(d.arrivee))}</b> ${esc(t.after)} ${esc(d.hdeb)}<br>🛫 ${esc(t.to)} : <b>${esc(fmt(d.depart))}</b> ${esc(t.before)} ${esc(d.hfin)}</p>
    ${d.formule ? `<p style="margin:8px 0 0">🍽️ ${esc(t.formule)} : <b>${esc(t.F[d.formule] || d.formule)}</b></p>` : ''}
    ${d.pref ? `<p class="meta" style="margin:6px 0 0">📝 ${esc(t.pref)} : ${esc(d.pref)}</p>` : ''}${ml}
    <div class="btns">${d.menu ? `<button class="btn sm" data-menu="1">${esc(t.menu)}</button>` : ''}${tel ? `<a class="btn sm sec" href="tel:${esc(tel)}">${esc(t.call)}</a>` : ''}${wa ? `<a class="btn sm sec" href="https://wa.me/${esc(wa)}" target="_blank" rel="noopener">${esc(t.wa)}</a>` : ''}</div></div>`);
  if (today <= d.arrivee) out.push(arrCard(t));
  if (d.taxi && d.taxi.on && today >= d.arrivee && today <= d.depart) out.push(rideCard());
  if (d.taxi && d.taxi.on && today <= d.depart) { out.push(fleetCard()); out.push(rentCard()); }
  // 8 · état des lieux de sortie (pendant le séjour)
  if (inStay || today === d.depart) {
    const done = new Set([...(d.edlSent || []), ...edlDone()]);
    out.push(`<div class="card"><h2>${esc(t.edlT)}</h2><p class="meta" style="margin:0 0 8px">${esc(t.edlP)}</p>
      <div class="phs">${Object.entries(PH).map(([k, [ic, nm]]) => `<label class="ph${done.has(k) ? ' done' : ''}${edl[k] ? ' pick' : ''}">${edl[k] ? `<img src="${esc(edl[k].u)}" alt="">` : `<span>${done.has(k) ? '✅' : '＋'}</span>`}<small>${ic} ${esc(nm[lang] || nm.fr)}</small><input type="file" accept="image/*" capture="environment" data-edl="${k}"></label>`).join('')}</div>
      ${Object.keys(edl).length ? `<button class="btn block" style="margin-top:10px" data-edl-send="1">${esc(t.edlSend)} (${Object.keys(edl).length})</button>` : ''}
      ${edlMsg ? `<p class="ok" style="margin:8px 0 0">${esc(edlMsg)}</p>` : done.size ? `<p class="meta" style="margin:8px 0 0">✅ ${done.size} ${esc(t.edlOk)}</p>` : ''}</div>`);
  }
  // 💬 messages avec la réception (hôtel) ou l'hôte (Airbnb), pendant tout le séjour
  out.push(pchatCard());
  // 9 · données chiffrées
  out.push(`<p class="meta safe">${esc(t.safe)}</p>`);
  // 10 · publicité (bas)
  { const p = slot('bas'); if (p) out.push(adBox(p, t)); }
  out.push(`<div class="card">${jobHtml()}</div>`); // 🙋‍♀️🙋🏾 « Je cherche du travail » → candidature chiffrée pour LA CENTRAL
  out.push(newsHtml(API)); // 📰 News : sous l'annonce du bas, au-dessus de « icône sur l'écran » / se déconnecter
  // 11 · infos
  out.push(infoBox({ lang }));
  // 12 · barre des cours (servie par le Worker)
  out.push(`<div class="ticker" data-vsrc="${API}/ticker"></div>`);
  out.push(`<p class="meta" style="text-align:center;font-size:11px;margin:8px 0 0;color:#9a968c">${esc(data && data.gv ? 'v' + data.gv : '')}</p><p style="text-align:center;margin:10px 0 6px"><button class="btn sec" data-reset="1">🚪 ${esc(({ fr: 'Se déconnecter', it: 'Esci', de: 'Abmelden', pt: 'Terminar sessão', en: 'Log out', es: 'Cerrar sesión' })[lang] || 'Se déconnecter')}</button></p>`); // ── fin : version (grise) + 🚪 Se déconnecter ──
  const keep = new Map([...document.querySelectorAll('.vid iframe, .ticker iframe')].map((f) => [f.dataset.src, f]));
  app.innerHTML = out.join('');
  document.querySelectorAll('.vid[data-vsrc], .ticker[data-vsrc]').forEach((v) => {
    const src = v.dataset.vsrc, old = keep.get(src);
    if (old) return v.append(old);
    const f = document.createElement('iframe');
    f.src = src; f.dataset.src = src; f.loading = 'lazy'; f.title = 'Video'; f.allow = 'encrypted-media; picture-in-picture; fullscreen; clipboard-write; web-share'; f.allowFullscreen = true; f.referrerPolicy = 'strict-origin-when-cross-origin';
    v.append(f);
  });
  hydrate();
  pubSeen(app);
  pubSocialLoad(app);
  if (arrForm.mode === 'taxi' && !arrForm.est) estimate();
  else paintEst();
  tripPoll();
}
// ⭐ note de la course (une fois terminée) : vue par l'établissement et par la société de taxi
const RT = {
  fr: { q: '⭐ Comment était la course ?', ph: 'Un commentaire (facultatif)', send: 'Envoyer', thanks: 'Merci pour votre note !' },
  en: { q: '⭐ How was the ride?', ph: 'A comment (optional)', send: 'Send', thanks: 'Thank you for your rating!' },
  de: { q: '⭐ Wie war die Fahrt?', ph: 'Ein Kommentar (optional)', send: 'Senden', thanks: 'Danke für Ihre Bewertung!' },
  it: { q: '⭐ Com’è andata la corsa?', ph: 'Un commento (facoltativo)', send: 'Invia', thanks: 'Grazie per il suo voto!' },
  pt: { q: '⭐ Como foi a corrida?', ph: 'Um comentário (opcional)', send: 'Enviar', thanks: 'Obrigado pela sua avaliação!' },
  es: { q: '⭐ ¿Qué tal la carrera?', ph: 'Un comentario (opcional)', send: 'Enviar', thanks: '¡Gracias por su nota!' },
};
// 💶 prix du séjour (Airbnb) : détail + bouton « Payer » affiché mais pas encore connecté
const PJ = {
  fr: { h: '💶 Prix du séjour', nights: 'nuits', clean: 'Ménage', tax: 'Taxe de séjour', pp: 'pers.', tot: 'Total', pay: '💳 Payer le séjour', info: 'Paiement en ligne pas encore connecté : réglez selon les indications de votre hôte.' },
  en: { h: '💶 Price of your stay', nights: 'nights', clean: 'Cleaning', tax: 'Tourist tax', pp: 'pers.', tot: 'Total', pay: '💳 Pay for the stay', info: 'Online payment not connected yet: pay as your host tells you.' },
  de: { h: '💶 Preis des Aufenthalts', nights: 'Nächte', clean: 'Reinigung', tax: 'Kurtaxe', pp: 'Pers.', tot: 'Gesamt', pay: '💳 Aufenthalt bezahlen', info: 'Online-Zahlung noch nicht verbunden: zahlen Sie nach Angabe Ihres Gastgebers.' },
  it: { h: '💶 Prezzo del soggiorno', nights: 'notti', clean: 'Pulizia', tax: 'Tassa di soggiorno', pp: 'pers.', tot: 'Totale', pay: '💳 Paga il pernottamento', info: 'Pagamento online non ancora collegato: paghi secondo le indicazioni del suo host.' },
  pt: { h: '💶 Preço da estadia', nights: 'noites', clean: 'Limpeza', tax: 'Taxa turística', pp: 'pess.', tot: 'Total', pay: '💳 Pagar a estadia', info: 'Pagamento online ainda não ligado: pague segundo as indicações do seu anfitrião.' },
  es: { h: '💶 Precio de la estancia', nights: 'noches', clean: 'Limpieza', tax: 'Tasa turística', pp: 'pers.', tot: 'Total', pay: '💳 Pagar la estancia', info: 'Pago en línea aún no conectado: pague según las indicaciones de su anfitrión.' },
};
const eur2 = (n) => (Math.round((+n || 0) * 100) / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
let sejInfo = false;
function sejourHtml(x) {
  if (!x) return '';
  const w = PJ[lang] || PJ.fr;
  const rows = x.mode === 'detail' ? [[`${x.n} ${w.nights} × ${eur2(x.nuit)}`, x.nuits], x.menage ? [w.clean, x.menage] : null, x.taxe ? [`${w.tax} (${x.p} ${w.pp} × ${x.n} × ${eur2(x.taxeU)})`, x.taxe] : null].filter(Boolean) : [];
  return `<div class="card"><h2>${esc(w.h)}</h2>${rows.map(([l, v]) => `<p style="margin:0 0 4px;display:flex;justify-content:space-between;gap:8px"><span>${esc(l)}</span><span>${esc(eur2(v))}</span></p>`).join('')}
    <p style="margin:6px 0 0;display:flex;justify-content:space-between;gap:8px"><b>${esc(w.tot)}</b><b>${esc(eur2(x.tot))}</b></p>
    <div class="btns"><button class="btn sm" disabled aria-disabled="true" style="opacity:.45;cursor:not-allowed">${esc(w.pay)}</button><button class="btn sm sec" data-sejinfo="1" aria-label="Info">ℹ️</button></div>
    ${sejInfo ? `<p class="meta" style="margin:8px 0 0">ℹ️ ${esc(w.info)}</p>` : ''}</div>`;
}
const rated = (rid, v) => { const k = 'hoteRate:' + id + ':' + rid; if (v) ls.set(k, String(v)); return +(ls.get(k) || 0); };
const rateSel = {};
function rateHtml(rid, done, already) {
  if (!done) return '';
  const w = RT[lang] || RT.fr, s0 = already || rated(rid);
  if (s0) return `<p class="meta" style="margin:6px 0 0">${'⭐'.repeat(s0)} · ${esc(w.thanks)}</p>`;
  const cur = rateSel[rid] || 0;
  return `<div class="rate" style="margin-top:8px"><p class="meta" style="margin:0 0 4px"><b>${esc(w.q)}</b></p><div class="btns">${[1, 2, 3, 4, 5].map((n) => `<button class="btn sm ${n <= cur ? '' : 'sec'}" data-rate="${esc(rid)}" data-s="${n}">${n <= cur ? '⭐' : '☆'}</button>`).join('')}</div>
    ${cur ? `<input data-rate-txt="${esc(rid)}" placeholder="${esc(w.ph)}" maxlength="500"><button class="btn block" style="margin-top:6px" data-rate-send="${esc(rid)}">${esc(w.send)}</button>` : ''}</div>`;
}
// 🚘 réserver un chauffeur pendant le séjour (course, à l'heure, journée…) + mes réservations
function rideCard() {
  const w = TXT(), d = data, f = ride, mine = d.rides || [];
  const p = price({ ...f, spot: 'other' }, 0);
  return `<div class="card arr"><h2>${esc(w.book)}</h2>
    ${mine.length ? `<p class="meta" style="margin:0 0 6px"><b>${esc(w.mine)}</b></p>${mine.map((r) => `<div class="drv" style="margin:0 0 6px;${r.st === 'wait' ? 'background:#fff7ed;border-color:#fed7aa' : r.st === 'no' ? 'background:#fef2f2;border-color:#fecaca' : ''}">${esc(w.S[r.service] || '')}${r.gamme ? ' · ' + esc(w.G[r.gamme]) : ''}${r.quand ? ' · 🕒 ' + esc(String(r.quand).replace('T', ' ')) : ''}${r.to ? ' → ' + esc(r.to) : ''}<br><b>${esc(r.st === 'wait' ? w.W : r.st === 'no' ? w.N : w.O)}</b>${r.drv ? ` · ${esc(r.drv.nom)} · 🚘 ${esc([r.drv.auto, r.drv.plaque].filter(Boolean).join(' '))}${r.drv.tel ? ` <a href="tel:${esc(String(r.drv.tel).replace(/[^\d+]/g, ''))}">📞</a>` : ''}` : ''}${rateHtml(r.id, r.done, r.rated)}</div>`).join('')}` : ''}
    ${f.open ? `${svcHtml(f, 'r')}
      <label>${esc(T().when)}</label><input type="datetime-local" data-r-quand="1" value="${esc(f.quand || today + 'T10:00')}">
      <label>${esc(w.dest)}</label><input data-r-to="1" value="${esc(f.to)}" placeholder="${esc(w.destPh)}">
      <p class="est">${esc(w.total)} : <b>${p ? '~' + p + ' €' : esc(w.ask)}</b></p>
      <button class="btn block" style="margin-top:10px" data-ride-send="1">${esc(T().send)}</button>`
      : `<button class="btn block" data-ride-open="1">${esc(w.book)}</button>`}
    ${f.sent ? `<p class="ok" style="margin:8px 0 0">${esc(f.sent)}</p>` : ''}</div>`;
}
// carte « Comment arrivez-vous ? » : choix → taxi (où, quand, km, prix) ou soi-même (« Je suis en route »)
function arrCard(t) {
  const d = data, sent = d.arr || arrSent();
  if (sent && !arrEdit) {
    if (sent.mode === 'taxi') {
      const tx = d.taxiOk;
      return `<div class="card arr"><h2>🚕 ${esc(t.chosenTaxi)}</h2><p style="margin:0">📍 ${esc(sent.from)}${sent.quand ? ' · 🕒 ' + esc(String(sent.quand).replace('T', ' ')) : ''}${sent.vol ? ' · ✈️ ' + esc(sent.vol) : ''}</p>
        <p class="meta" style="margin:4px 0 0">${[sent.service && sent.service !== 'course' ? TXT().S[sent.service] : '', sent.gamme ? TXT().G[sent.gamme] : '', ...(sent.extras || []).map((k) => TXT().E[k]), sent.km ? sent.km + ' km' : '', sent.prix ? '~' + sent.prix + ' €' : ''].filter(Boolean).map(esc).join(' · ')}</p>
        ${tx ? `<div class="drv"><b>${esc(t.driver)} : ${esc(tx.nom)}</b><br>🚘 ${esc([tx.auto, tx.plaque].filter(Boolean).join(' · '))}${tx.tel ? `<div class="btns"><a class="btn sm" href="tel:${esc(String(tx.tel).replace(/[^\d+]/g, ''))}">${esc(t.call)}</a></div>` : ''}</div><div id="taxiTrip"></div>` : `<p class="meta" style="margin:8px 0 0">⏳ ${esc(t.wait)}</p>`}
        ${rateHtml('arr', d.arrDone, d.arrRated)}
        ${d.arrDone ? '' : `<button class="btn sm sec" style="margin-top:8px" data-arr-edit="1">${esc(t.change)}</button>`}</div>`;
    }
    const tr = myTrip || (() => { try { return JSON.parse(ls.get('hoteTrip:' + id) || 'null'); } catch { return null; } })();
    const isDay = d.arrivee === today;
    return `<div class="card arr"><h2>🚗 ${esc(t.chosenSelf)}</h2>
      ${isDay ? (tr && tr.st === 'here' ? `<p class="ok" style="margin:0">${esc(t.here)}</p>` : tr && tr.st === 'go'
        ? `<p class="meta" style="margin:0 0 8px">${esc(t.trackOn)}</p>${tr.noGps ? `<p class="meta">${esc(t.gpsNo)}</p><div class="btns">${[10, 20, 30, 45, 60].map((m) => `<button class="btn sm sec" data-eta="${m}">${m} min</button>`).join('')}</div>` : ''}<button class="btn block" style="margin-top:8px" data-trip-here="1">${esc(t.here)}</button>`
        : `<button class="btn block go" data-trip-go="1">${esc(t.go)}</button><p class="meta" style="margin:6px 0 0">${esc(t.trackOn)}</p>`) : ''}
      <button class="btn sm sec" style="margin-top:8px" data-arr-edit="1">${esc(t.change)}</button></div>`;
  }
  const f = arrForm, dq = f.quand || `${d.arrivee}T${d.hdeb || '15:00'}`;
  return `<div class="card arr"><h2>${esc(t.arrT)}</h2>
    <label class="radio"><input type="radio" name="arrMode" value="self" ${f.mode === 'self' ? 'checked' : ''}> ${esc(t.self)}</label>
    ${d.taxi && d.taxi.on ? `<label class="radio"><input type="radio" name="arrMode" value="taxi" ${f.mode === 'taxi' ? 'checked' : ''}> ${esc(t.taxi)}</label>` : ''}
    ${f.mode === 'taxi' ? `<label>${esc(t.pick)}</label><select data-spot="1">${['aero', 'gare', 'other'].map((k) => `<option value="${k}" ${f.spot === k ? 'selected' : ''}>${esc(t[k])}</option>`).join('')}</select>
      ${f.spot === 'other' ? `<input data-other="1" value="${esc(f.other)}" placeholder="${esc(t.otherPh)}" style="margin-top:6px">` : ''}
      <label>${esc(t.when)}</label><input type="datetime-local" data-quand="1" value="${esc(dq)}">
      <label>${esc(t.vol)}</label><input data-vol="1" value="${esc(f.vol)}">
      <label>${esc(CK2().veh)}</label><select data-veh="1">${vehOpts(f.veh)}</select>
      <label>${esc(CK2().wish)}</label><input data-wish="1" value="${esc(f.note || '')}" maxlength="300">
      ${svcHtml(f, 'a')}
      <p class="est" id="estBox"></p>` : ''}
    ${f.mode ? `<button class="btn block" style="margin-top:10px" data-arr-send="1">${esc(t.send)}</button>` : ''}${arrEdit ? `<button class="btn block sec" style="margin-top:8px" data-arr-back="1">${esc(t.chBack)}</button>` : ''}</div>`;
}

async function load() {
  data = null;
  if (id && key) {
    try {
      const r = await fetch(`${API}/api/esp/${id}`, { cache: 'no-store' });
      if (r.ok) {
        const x = await openJson(key, await r.arrayBuffer());
        if (x && x.kind === 'hote') { data = x; if (x.netPubs) netPubsGet(API).then((it) => { if (data === x) { x.pubs = netPubsFor(it, 'hote', { txt: (x.ch && x.ch.adresse) || (x.st && x.st.adresse) || '', pays: (x.st && x.st.pays) || '' }); render(); } }); }
        else { ls.set(ACC, null); location.replace(`/espace.html#${id}.${key}`); return; }
      } else if (r.status === 404) { ls.set(ACC, null); id = key = ''; loadErr = T().off; }
    } catch { loadErr = '⚠ offline'; }
  }
  if (!ls.get('hoteLang')) lang = pick(data);
  if (!L[lang]) lang = 'en';
  render();
  if (data) { pushInit(); }
}
wxRadioInit({ app: 'hote', lang: () => lang, home: () => (data ? cityOf(data.st.adresse) : 'Luxembourg'), radio: () => (data && data.radio) || null });
pubStatInit(API, 'hote', () => lang);
const GUEST_CHAT = {
  hotel: { fr: ['💬 Messages avec la réception', 'Réception', 'Seule la réception lit vos messages.', 'Écrire à la réception…'], it: ['💬 Messaggi con la reception', 'Reception', 'Solo la reception legge i tuoi messaggi.', 'Scrivi alla reception…'], de: ['💬 Nachrichten an die Rezeption', 'Rezeption', 'Nur die Rezeption liest Ihre Nachrichten.', 'An die Rezeption schreiben…'], pt: ['💬 Mensagens com a receção', 'Receção', 'Só a receção lê as suas mensagens.', 'Escrever à receção…'], en: ['💬 Messages with reception', 'Reception', 'Only reception reads your messages.', 'Write to reception…'], es: ['💬 Mensajes con la recepción', 'Recepción', 'Solo la recepción lee sus mensajes.', 'Escribir a la recepción…'] },
  airbnb: { fr: ['💬 Messages avec votre hôte', 'Hôte', 'Seul votre hôte lit vos messages.', 'Écrire à votre hôte…'], it: ['💬 Messaggi con il tuo host', 'Host', 'Solo il tuo host legge i tuoi messaggi.', 'Scrivi al tuo host…'], de: ['💬 Nachrichten an Ihren Gastgeber', 'Gastgeber', 'Nur Ihr Gastgeber liest Ihre Nachrichten.', 'An Ihren Gastgeber schreiben…'], pt: ['💬 Mensagens com o seu anfitrião', 'Anfitrião', 'Só o seu anfitrião lê as suas mensagens.', 'Escrever ao seu anfitrião…'], en: ['💬 Messages with your host', 'Host', 'Only your host reads your messages.', 'Write to your host…'], es: ['💬 Mensajes con su anfitrión', 'Anfitrión', 'Solo su anfitrión lee sus mensajes.', 'Escribir a su anfitrión…'] },
};
const guestLabels = (l) => { const g = GUEST_CHAT[(data && data.lieu) === 'airbnb' ? 'airbnb' : 'hotel'], v = g[l] || g.en; return { t: v[0], ctr: v[1], hint: v[2], ph: v[3], none: v[3] }; };
trInit(API, () => lang);
jobInit({ api: API, app: 'hote', lang: () => lang, who: () => (data ? { nom: [data.prenom, data.nom].filter(Boolean).join(' ') } : {}) });
const quietData = async () => { const r = await fetch(`${API}/api/esp/${id}`, { cache: 'no-store' }); if (!r.ok) return null; const x = await openJson(key, await r.arrayBuffer()); return x && x.kind === 'hote' ? x : null; };
pchatInit({ id: () => id, data: () => data, send: (o) => sendOwner(o), lang: () => lang || 'en', refresh: quietData, quick: null, labels: guestLabels });
pubSocialInit(API, () => lang);
document.addEventListener('click', (e) => { if (pubSocialClick(e)) e.stopPropagation(); }, true);
document.addEventListener('click', (e) => {
  const m = e.target.closest && e.target.closest('[data-hmap]'), bk = e.target.closest && e.target.closest('[data-hpubback]');
  if (!m && !bk) return;
  e.preventDefault();
  hMap = m ? { q: m.dataset.hmap, nom: m.dataset.hnom || '' } : null;
  render();
  if (m) { const c = document.getElementById('hMapCard'); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
});

app.addEventListener('submit', async (e) => {
  if (e.target.id !== 'codeForm') return;
  e.preventDefault();
  const code = String(new FormData(e.target).get('code') || '').trim();
  if (!code) return;
  try {
    const r = await fetch(`${API}/api/esp-code`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ h: await codeHash(code) }) });
    if (!r.ok) { loadErr = T().bad; return render(); }
    const j = await r.json();
    id = j.id; key = await unwrapWithCode(code, j.salt, j.wk);
    ls.set(ACC, id + '.' + key);
    loadErr = '';
    load();
  } catch { loadErr = T().bad; render(); }
});
app.addEventListener('change', async (e) => {
  const el = e.target;
  if (el.name === 'arrMode') { arrForm.mode = el.value; arrForm.est = null; return render(); }
  if (el.dataset.spot) { arrForm.spot = el.value; arrForm.est = null; return render(); }
  if (el.dataset.other) { arrForm.other = el.value; arrForm.est = null; paintEst(); return estimate(); }
  if (el.dataset.quand) { arrForm.quand = el.value; return; }
  if (el.dataset.aSrv) { arrForm.service = el.value; return render(); }
  if (el.dataset.aH) { arrForm.heures = el.value; return paintEst(); }
  if (el.name === 'aGam') { arrForm.gamme = el.value; return paintEst(); }
  if (el.dataset.aExt) { arrForm.extras = el.checked ? [...arrForm.extras, el.dataset.aExt] : arrForm.extras.filter((k) => k !== el.dataset.aExt); return paintEst(); }
  if (el.dataset.rSrv) { ride.service = el.value; return render(); }
  if (el.dataset.rH) { ride.heures = el.value; return render(); }
  if (el.name === 'rGam') { ride.gamme = el.value; return render(); }
  if (el.dataset.rExt) { ride.extras = el.checked ? [...ride.extras, el.dataset.rExt] : ride.extras.filter((k) => k !== el.dataset.rExt); return render(); }
  if (el.dataset.rQuand) { ride.quand = el.value; return; }
  if (el.dataset.rTo) { ride.to = el.value; return; }
  if (el.dataset.vol) { arrForm.vol = el.value; return; }
  if (el.dataset.veh) { arrForm.veh = el.value; return; }
  if (el.dataset.wish) { arrForm.note = el.value; return; }
  if (el.dataset.rent) { rent[el.dataset.rent] = el.type === 'checkbox' ? el.checked : el.value; return; }
  if (el.dataset.edl && el.files && el.files[0]) {
    const f = el.files[0];
    edl[el.dataset.edl] = { f, u: URL.createObjectURL(f) };
    edlMsg = '';
    return render();
  }
});
app.addEventListener('click', async (e) => {
  pubTap(e);
  const b = e.target.closest('button, [data-lb]');
  if (!b) return;
  const t = T();
  if (b.dataset.sejinfo) { sejInfo = !sejInfo; return render(); }
  if (b.dataset.lang) { lang = b.dataset.lang; ls.set('hoteLang', lang); if (pushSt === 'on') pushRefresh('/hote', pushPost); return render(); }
  if (b.dataset.push) { if (await pushEnable({ api: API, swUrl: '/hote-sw.js', scope: '/hote', post: pushPost })) { pushSt = 'on'; pushJust = true; } else pushSt = await pushStatus('/hote'); return render(); }
  if (b.dataset.reset) { ls.set(ACC, null); id = key = ''; data = null; return render(); }
  if (b.dataset.lb) { const lb = document.createElement('div'); lb.className = 'lbx'; lb.innerHTML = `<img src="${esc(b.src)}" alt=""><span>✕</span>`; lb.onclick = () => lb.remove(); document.body.append(lb); return; }
  if (b.dataset.menu) {
    try {
      const u = await fileUrl(data.menu, 'application/pdf');
      const dlg = document.createElement('div'); dlg.className = 'pv';
      dlg.innerHTML = `<div class="pv-bar"><b>🍽️ Menu</b><a class="btn sm sec" href="${u}" download="menu.pdf">⬇</a><button class="btn sm" data-pv-x="1">${esc(t.close)}</button></div><iframe src="${u}" title="Menu"></iframe>`;
      dlg.addEventListener('click', (ev) => { if (ev.target.closest('[data-pv-x]')) dlg.remove(); });
      document.body.append(dlg);
    } catch { /* hors ligne */ }
    return;
  }
  if (b.dataset.arrEdit) {
    const open = () => {
      const s0 = data.arr || arrSent() || {}, spot = s0.from === t.aero.replace(/^\S+\s/, '') ? 'aero' : s0.from === t.gare.replace(/^\S+\s/, '') ? 'gare' : 'other';
      arrForm = { ...arrForm, mode: s0.mode || '', spot: s0.mode === 'taxi' ? spot : arrForm.spot, other: s0.mode === 'taxi' && spot === 'other' ? s0.from || '' : arrForm.other, quand: s0.quand || arrForm.quand, vol: s0.vol || '', service: s0.service || 'course', gamme: s0.gamme || '', extras: [...(s0.extras || [])], heures: s0.heures || 3, veh: s0.veh || '', note: s0.note || '', est: null };
      arrEdit = true; render(); if (arrForm.mode === 'taxi') estimate().then(() => render()).catch(() => {});
    };
    if (data.taxiOk) return import('/ares/confirm-box.js').then((m) => m.confirmBox(t.chQ, t.chY, t.chN, open));
    return open();
  }
  if (b.dataset.arrBack) { arrEdit = false; return render(); }
  if (b.dataset.rentSend) {
    b.disabled = true;
    try { await sendOwner({ type: 'hote-rent', du: rent.du || data.arrivee, au: rent.au || data.depart, veh: rent.veh || '', boite: rent.boite === 'man' ? 'man' : 'auto', livr: !!rent.livr, note: String(rent.note || '').slice(0, 300) }); rent = { ...rent, sent: '1', open: true }; } catch { b.disabled = false; return; }
    return render();
  }
  if (b.dataset.arrSend && arrEdit && !b.dataset.ok) return import('/ares/confirm-box.js').then((m) => m.confirmBox(t.accQ, t.accY, t.accN, () => { b.dataset.ok = '1'; b.click(); }));
  if (b.dataset.arrSend) {
    b.disabled = true;
    const f = arrForm, from = f.spot === 'other' ? f.other : t[f.spot].replace(/^\S+\s/, '');
    if (f.mode === 'taxi' && !f.est) await estimate();
    const e2 = f.est || {};
    const msg = f.mode === 'taxi'
      ? { type: 'hote-arr', mode: 'taxi', from, quand: f.quand || `${data.arrivee}T${data.hdeb || '15:00'}`, vol: f.vol, km: e2.km || 0, prix: price(f, e2.km) || 0, service: f.service, gamme: f.gamme, extras: f.extras, heures: f.service === 'heures' ? f.heures : 0, veh: f.veh || '', note: (f.note || '').slice(0, 300), fg: e2.fg ? { lat: e2.fg[0], lon: e2.fg[1] } : null, sg: e2.sg ? { lat: e2.sg[0], lon: e2.sg[1] } : null }
      : { type: 'hote-arr', mode: 'self' };
    try {
      await sendOwner(msg);
      ls.set('hoteArr:' + id, JSON.stringify({ ...msg, at: Date.now() }));
      data.arr = null; arrEdit = false;
    } catch { b.disabled = false; return; }
    return render();
  }
  if (b.dataset.rideOpen) { ride.open = true; ride.sent = ''; return render(); }
  if (b.dataset.rideSend) {
    b.disabled = true;
    const f = ride, prix = price({ ...f, spot: 'other' }, 0);
    try {
      await sendOwner({ type: 'hote-ride', rid: Date.now().toString(36), service: f.service, gamme: f.gamme, extras: f.extras, heures: f.service === 'heures' ? f.heures : 0, from: data.st.nom, to: f.to, quand: f.quand || today + 'T10:00', prix });
      ride = { open: false, service: 'course', gamme: '', extras: [], heures: 3, quand: '', to: '', sent: TXT().W };
    } catch { b.disabled = false; return; }
    return render();
  }
  if (b.dataset.rate) { rateSel[b.dataset.rate] = +b.dataset.s; return render(); }
  if (b.dataset.rateSend) {
    const rid = b.dataset.rateSend, s0 = rateSel[rid] || 0, inp = app.querySelector(`[data-rate-txt="${CSS.escape(rid)}"]`);
    if (!s0) return;
    b.disabled = true;
    try { await sendOwner({ type: 'hote-rate', r: rid, s: s0, txt: inp ? inp.value.trim().slice(0, 500) : '' }); rated(rid, s0); } catch { b.disabled = false; return; }
    return render();
  }
  if (b.dataset.tripGo) return tripStart();
  if (b.dataset.tripHere) return tripStop();
  if (b.dataset.eta) { tripPost('go', Date.now() + +b.dataset.eta * 60000); b.textContent = t.sent; return; }
  if (b.dataset.edlSend) {
    b.disabled = true;
    const done = edlDone();
    for (const [k, x] of Object.entries(edl)) {
      try { await sendOwner({ type: 'hote-edl', photos: [{ k, b: b64u(await jpeg(x.f)) }] }); done.push(k); delete edl[k]; } catch { break; }
    }
    ls.set('hoteEdl:' + id, JSON.stringify([...new Set(done)]));
    edlMsg = Object.keys(edl).length ? '' : t.sent;
    return render();
  }
});
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && data) { setBadge(0, '/hote'); tripPoll(); } });
lang = lang || pick(null);
load();
emojiInit(); // 😊 bouton émojis dans les chats
domierInit({ api: API, lang: () => lang, send: (o) => sendOwner(o), rerender: () => render() });
