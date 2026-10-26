// 🏨 App des clients (Hotel / Airbnb) : séjour, chambre ou logement, code de la porte, menu, arrivée (taxi ou soi-même),
// état des lieux de sortie. Données chiffrées par l'établissement ; la clé ne quitte pas le téléphone.
// L'app se remet à zéro le lendemain du départ (l'établissement efface les données et le code).
import '/ares/reqmark.js';
import { openJson, openBytes, sealForOwner, codeHash, unwrapWithCode, b64u } from '/ares/espace-crypto.js';
import { videoEmbed } from '/ares/video-embed.js';
import { pubStatInit, pubSeen, pubTap } from '/ares/pubstat.js';
import { pushStatus, pushEnable, pushRefresh, setBadge } from '/ares/push-client.js';
import { infoBox } from '/ares/nbien.js';
import { wxRadioCard, wxRadioInit } from '/ares/wxradio.js';
import { tripView, tripFetch } from '/ares/trip.js';
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
    pref: 'Vos préférences / allergies', menu: '🍽️ Voir le menu', close: 'Fermer', call: '📞 Appeler', wa: '💬 WhatsApp', way: '🧭 Itinéraire',
    arrT: 'Comment arrivez-vous ?', self: '🚗 Je viens par mes propres moyens', taxi: '🚕 Envoyez-moi un taxi', pick: 'Où vous prendre ?', aero: '✈️ Aéroport de Luxembourg', gare: '🚉 Gare de Luxembourg', other: '📍 Autre adresse / ville',
    otherPh: 'ex. Trier, Hauptbahnhof', when: 'Quand ?', vol: 'N° de vol / train (facultatif)', est: 'Estimation', calc: 'Calcul…', send: 'Confirmer', change: 'Changer', chosenSelf: 'Vous venez par vos propres moyens.', chosenTaxi: 'Taxi demandé',
    wait: 'L’établissement vous envoie un chauffeur — vous serez prévenu ici.', driver: 'Votre chauffeur', go: '🚗 Je suis en route', here: '✅ Je suis arrivé', mins: 'Arrivée dans combien de minutes ?', gpsNo: 'Position non disponible : choisissez les minutes.',
    trackOn: 'L’établissement voit votre heure d’arrivée (pas votre position exacte). Le partage s’arrête à votre arrivée.', sent: 'Envoyé ✓',
    edlT: '📋 État des lieux de sortie', edlP: 'Avant de partir, prenez les photos (une par case) : elles protègent votre caution et vous.', edlSend: 'Envoyer les photos', edlOk: 'photo(s) reçue(s) par l’établissement',
    safe: '🔒 Vos données sont chiffrées : seul l’établissement peut les lire.', notif: 'Notifications', notifHint: 'Code de la porte, taxi, rappels : recevez-les sur ce téléphone.', notifOn: 'Activer', notifOk: 'Notifications activées ✓',
    ad: { lbl: 'Publicité', see: '🗺️ Voir', call: '📞 Appeler', web: '🌐 Site' }, thanks: 'Merci pour votre séjour !', lang: 'Langue', reset: 'Changer de code' },
  en: { app: 'My stay', welcome: 'Enter the code you received from your hotel or host.', code: 'Your personal code', enter: 'Enter', bad: 'Unknown code or stay ended.', off: 'Your stay has ended. Thank you and see you soon!',
    hi: 'Hello', stay: 'Your stay', from: 'Arrival', to: 'Departure', after: 'from', before: 'before', pers: 'guests', room: 'Your room', home: 'Your home', floor: 'Floor', rooms: 'rooms', max: 'max.',
    door: 'Door code', doorSoon: 'Shown on your arrival day', key: 'Badge / key', formule: 'Board', F: { seul: 'Room only', pdj: 'Breakfast', demi: 'Half board', complete: 'Full board' },
    pref: 'Your preferences / allergies', menu: '🍽️ See the menu', close: 'Close', call: '📞 Call', wa: '💬 WhatsApp', way: '🧭 Directions',
    arrT: 'How are you arriving?', self: '🚗 I’m coming on my own', taxi: '🚕 Send me a taxi', pick: 'Where should we pick you up?', aero: '✈️ Luxembourg Airport', gare: '🚉 Luxembourg Station', other: '📍 Other address / city',
    otherPh: 'e.g. Trier, Hauptbahnhof', when: 'When?', vol: 'Flight / train no. (optional)', est: 'Estimate', calc: 'Calculating…', send: 'Confirm', change: 'Change', chosenSelf: 'You are coming on your own.', chosenTaxi: 'Taxi requested',
    wait: 'The property is sending you a driver — you will be notified here.', driver: 'Your driver', go: '🚗 I’m on my way', here: '✅ I have arrived', mins: 'Arriving in how many minutes?', gpsNo: 'Location unavailable: choose the minutes.',
    trackOn: 'The property sees your arrival time (not your exact position). Sharing stops when you arrive.', sent: 'Sent ✓',
    edlT: '📋 Check-out inventory', edlP: 'Before leaving, take the photos (one per box): they protect your deposit and you.', edlSend: 'Send the photos', edlOk: 'photo(s) received by the property',
    safe: '🔒 Your data is encrypted: only the property can read it.', notif: 'Notifications', notifHint: 'Door code, taxi, reminders: get them on this phone.', notifOn: 'Turn on', notifOk: 'Notifications on ✓',
    ad: { lbl: 'Advertising', see: '🗺️ See', call: '📞 Call', web: '🌐 Website' }, thanks: 'Thank you for your stay!', lang: 'Language', reset: 'Change code' },
  de: { app: 'Mein Aufenthalt', welcome: 'Geben Sie den Code ein, den Sie von Ihrem Hotel oder Gastgeber erhalten haben.', code: 'Ihr persönlicher Code', enter: 'Öffnen', bad: 'Unbekannter Code oder Aufenthalt beendet.', off: 'Ihr Aufenthalt ist beendet. Danke und bis bald!',
    hi: 'Guten Tag', stay: 'Ihr Aufenthalt', from: 'Ankunft', to: 'Abreise', after: 'ab', before: 'bis', pers: 'Personen', room: 'Ihr Zimmer', home: 'Ihre Unterkunft', floor: 'Etage', rooms: 'Zimmer', max: 'max.',
    door: 'Türcode', doorSoon: 'Sichtbar am Anreisetag', key: 'Badge / Schlüssel', formule: 'Verpflegung', F: { seul: 'Nur Übernachtung', pdj: 'Frühstück', demi: 'Halbpension', complete: 'Vollpension' },
    pref: 'Ihre Vorlieben / Allergien', menu: '🍽️ Speisekarte ansehen', close: 'Schließen', call: '📞 Anrufen', wa: '💬 WhatsApp', way: '🧭 Route',
    arrT: 'Wie reisen Sie an?', self: '🚗 Ich komme selbst', taxi: '🚕 Schicken Sie mir ein Taxi', pick: 'Wo sollen wir Sie abholen?', aero: '✈️ Flughafen Luxemburg', gare: '🚉 Bahnhof Luxemburg', other: '📍 Andere Adresse / Stadt',
    otherPh: 'z. B. Trier, Hauptbahnhof', when: 'Wann?', vol: 'Flug- / Zugnr. (optional)', est: 'Schätzung', calc: 'Berechnung…', send: 'Bestätigen', change: 'Ändern', chosenSelf: 'Sie kommen selbst.', chosenTaxi: 'Taxi angefragt',
    wait: 'Das Haus schickt Ihnen einen Fahrer — Sie werden hier benachrichtigt.', driver: 'Ihr Fahrer', go: '🚗 Ich bin unterwegs', here: '✅ Ich bin angekommen', mins: 'Ankunft in wie vielen Minuten?', gpsNo: 'Standort nicht verfügbar: Minuten wählen.',
    trackOn: 'Das Haus sieht Ihre Ankunftszeit (nicht Ihren genauen Standort). Das Teilen endet bei Ihrer Ankunft.', sent: 'Gesendet ✓',
    edlT: '📋 Auszugsprotokoll', edlP: 'Machen Sie vor der Abreise die Fotos (eines pro Feld): sie schützen Ihre Kaution und Sie.', edlSend: 'Fotos senden', edlOk: 'Foto(s) vom Haus erhalten',
    safe: '🔒 Ihre Daten sind verschlüsselt: nur das Haus kann sie lesen.', notif: 'Benachrichtigungen', notifHint: 'Türcode, Taxi, Erinnerungen: auf diesem Telefon erhalten.', notifOn: 'Aktivieren', notifOk: 'Benachrichtigungen aktiv ✓',
    ad: { lbl: 'Werbung', see: '🗺️ Ansehen', call: '📞 Anrufen', web: '🌐 Website' }, thanks: 'Danke für Ihren Aufenthalt!', lang: 'Sprache', reset: 'Code ändern' },
  it: { app: 'Il mio soggiorno', welcome: 'Inserisca il codice ricevuto dal suo hotel o dal suo host.', code: 'Il suo codice personale', enter: 'Entra', bad: 'Codice sconosciuto o soggiorno terminato.', off: 'Il suo soggiorno è terminato. Grazie e a presto!',
    hi: 'Buongiorno', stay: 'Il suo soggiorno', from: 'Arrivo', to: 'Partenza', after: 'dalle', before: 'entro le', pers: 'persone', room: 'La sua camera', home: 'Il suo alloggio', floor: 'Piano', rooms: 'locali', max: 'max.',
    door: 'Codice della porta', doorSoon: 'Visibile il giorno del suo arrivo', key: 'Badge / chiave', formule: 'Formula', F: { seul: 'Solo pernottamento', pdj: 'Colazione', demi: 'Mezza pensione', complete: 'Pensione completa' },
    pref: 'Le sue preferenze / allergie', menu: '🍽️ Vedi il menù', close: 'Chiudi', call: '📞 Chiama', wa: '💬 WhatsApp', way: '🧭 Percorso',
    arrT: 'Come arriva?', self: '🚗 Vengo con i miei mezzi', taxi: '🚕 Mandatemi un taxi', pick: 'Dove la veniamo a prendere?', aero: '✈️ Aeroporto di Lussemburgo', gare: '🚉 Stazione di Lussemburgo', other: '📍 Altro indirizzo / città',
    otherPh: 'es. Trier, Hauptbahnhof', when: 'Quando?', vol: 'N° volo / treno (facoltativo)', est: 'Stima', calc: 'Calcolo…', send: 'Conferma', change: 'Cambia', chosenSelf: 'Viene con i suoi mezzi.', chosenTaxi: 'Taxi richiesto',
    wait: 'La struttura le manda un autista — sarà avvisato qui.', driver: 'Il suo autista', go: '🚗 Sono in viaggio', here: '✅ Sono arrivato', mins: 'Arrivo tra quanti minuti?', gpsNo: 'Posizione non disponibile: scelga i minuti.',
    trackOn: 'La struttura vede l’ora del suo arrivo (non la posizione esatta). La condivisione si ferma al suo arrivo.', sent: 'Inviato ✓',
    edlT: '📋 Stato dei luoghi d’uscita', edlP: 'Prima di partire, faccia le foto (una per casella): proteggono la sua cauzione e lei.', edlSend: 'Invia le foto', edlOk: 'foto ricevute dalla struttura',
    safe: '🔒 I suoi dati sono cifrati: solo la struttura può leggerli.', notif: 'Notifiche', notifHint: 'Codice porta, taxi, promemoria: li riceva su questo telefono.', notifOn: 'Attiva', notifOk: 'Notifiche attive ✓',
    ad: { lbl: 'Pubblicità', see: '🗺️ Vedi', call: '📞 Chiama', web: '🌐 Sito' }, thanks: 'Grazie per il suo soggiorno!', lang: 'Lingua', reset: 'Cambia codice' },
  pt: { app: 'A minha estadia', welcome: 'Introduza o código recebido do seu hotel ou anfitrião.', code: 'O seu código pessoal', enter: 'Entrar', bad: 'Código desconhecido ou estadia terminada.', off: 'A sua estadia terminou. Obrigado e até breve!',
    hi: 'Olá', stay: 'A sua estadia', from: 'Chegada', to: 'Partida', after: 'a partir das', before: 'até às', pers: 'pessoas', room: 'O seu quarto', home: 'O seu alojamento', floor: 'Andar', rooms: 'divisões', max: 'máx.',
    door: 'Código da porta', doorSoon: 'Visível no dia da chegada', key: 'Cartão / chave', formule: 'Regime', F: { seul: 'Só alojamento', pdj: 'Pequeno-almoço', demi: 'Meia pensão', complete: 'Pensão completa' },
    pref: 'As suas preferências / alergias', menu: '🍽️ Ver o menu', close: 'Fechar', call: '📞 Ligar', wa: '💬 WhatsApp', way: '🧭 Itinerário',
    arrT: 'Como vai chegar?', self: '🚗 Vou pelos meus meios', taxi: '🚕 Enviem-me um táxi', pick: 'Onde o vamos buscar?', aero: '✈️ Aeroporto do Luxemburgo', gare: '🚉 Estação do Luxemburgo', other: '📍 Outra morada / cidade',
    otherPh: 'ex. Trier, Hauptbahnhof', when: 'Quando?', vol: 'N.º voo / comboio (opcional)', est: 'Estimativa', calc: 'A calcular…', send: 'Confirmar', change: 'Alterar', chosenSelf: 'Vem pelos seus meios.', chosenTaxi: 'Táxi pedido',
    wait: 'O estabelecimento envia-lhe um motorista — será avisado aqui.', driver: 'O seu motorista', go: '🚗 Estou a caminho', here: '✅ Cheguei', mins: 'Chegada dentro de quantos minutos?', gpsNo: 'Localização indisponível: escolha os minutos.',
    trackOn: 'O estabelecimento vê a hora de chegada (não a posição exata). A partilha para quando chegar.', sent: 'Enviado ✓',
    edlT: '📋 Vistoria de saída', edlP: 'Antes de sair, tire as fotos (uma por casa): protegem a sua caução e a si.', edlSend: 'Enviar as fotos', edlOk: 'foto(s) recebida(s) pelo estabelecimento',
    safe: '🔒 Os seus dados estão cifrados: só o estabelecimento os pode ler.', notif: 'Notificações', notifHint: 'Código da porta, táxi, lembretes: receba-os neste telemóvel.', notifOn: 'Ativar', notifOk: 'Notificações ativas ✓',
    ad: { lbl: 'Publicidade', see: '🗺️ Ver', call: '📞 Ligar', web: '🌐 Site' }, thanks: 'Obrigado pela sua estadia!', lang: 'Idioma', reset: 'Mudar de código' },
  es: { app: 'Mi estancia', welcome: 'Introduzca el código recibido de su hotel o anfitrión.', code: 'Su código personal', enter: 'Entrar', bad: 'Código desconocido o estancia terminada.', off: 'Su estancia ha terminado. ¡Gracias y hasta pronto!',
    hi: 'Hola', stay: 'Su estancia', from: 'Llegada', to: 'Salida', after: 'desde las', before: 'antes de las', pers: 'personas', room: 'Su habitación', home: 'Su alojamiento', floor: 'Planta', rooms: 'habitaciones', max: 'máx.',
    door: 'Código de la puerta', doorSoon: 'Visible el día de su llegada', key: 'Tarjeta / llave', formule: 'Régimen', F: { seul: 'Solo alojamiento', pdj: 'Desayuno', demi: 'Media pensión', complete: 'Pensión completa' },
    pref: 'Sus preferencias / alergias', menu: '🍽️ Ver el menú', close: 'Cerrar', call: '📞 Llamar', wa: '💬 WhatsApp', way: '🧭 Ruta',
    arrT: '¿Cómo llega?', self: '🚗 Voy por mis medios', taxi: '🚕 Envíenme un taxi', pick: '¿Dónde le recogemos?', aero: '✈️ Aeropuerto de Luxemburgo', gare: '🚉 Estación de Luxemburgo', other: '📍 Otra dirección / ciudad',
    otherPh: 'p. ej. Trier, Hauptbahnhof', when: '¿Cuándo?', vol: 'N.º de vuelo / tren (opcional)', est: 'Estimación', calc: 'Calculando…', send: 'Confirmar', change: 'Cambiar', chosenSelf: 'Viene por sus medios.', chosenTaxi: 'Taxi solicitado',
    wait: 'El establecimiento le envía un conductor — se le avisará aquí.', driver: 'Su conductor', go: '🚗 Estoy en camino', here: '✅ He llegado', mins: '¿Llega en cuántos minutos?', gpsNo: 'Ubicación no disponible: elija los minutos.',
    trackOn: 'El establecimiento ve su hora de llegada (no su posición exacta). Se deja de compartir al llegar.', sent: 'Enviado ✓',
    edlT: '📋 Inventario de salida', edlP: 'Antes de irse, haga las fotos (una por casilla): protegen su fianza y a usted.', edlSend: 'Enviar las fotos', edlOk: 'foto(s) recibida(s) por el establecimiento',
    safe: '🔒 Sus datos están cifrados: solo el establecimiento puede leerlos.', notif: 'Notificaciones', notifHint: 'Código de la puerta, taxi, recordatorios: recíbalos en este teléfono.', notifOn: 'Activar', notifOk: 'Notificaciones activadas ✓',
    ad: { lbl: 'Publicidad', see: '🗺️ Ver', call: '📞 Llamar', web: '🌐 Web' }, thanks: '¡Gracias por su estancia!', lang: 'Idioma', reset: 'Cambiar de código' },
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
const CAT = { eco: 'Économique / Economy', standard: 'Standard', sup: 'Supérieure / Superior', deluxe: 'Deluxe', suite: 'Suite' };
const TYP = { single: 'Single', double: 'Double', twin: 'Twin', triple: 'Triple', famille: 'Family', studio: 'Studio', appartement: 'Apartment', maison: 'House', colocation: 'Flatshare' };
// lieux connus (prise en charge du taxi)
const SPOTS = { aero: [49.6233, 6.2044], gare: [49.5998, 6.134] };

let data = null, loadErr = '', lang = 'fr';
try { lang = localStorage.getItem('hoteLang') || ''; } catch { /* stockage bloqué */ }
const T = () => L[lang] || L.fr;
const pick = (d) => { if (d && LANGS.includes(d.lang)) return d.lang; const n = (navigator.language || 'fr').slice(0, 2); return LANGS.includes(n) ? n : 'en'; };
const ls = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* stockage plein */ } } };
async function sendOwner(o) {
  if (!data || !data.signalKey) throw new Error('signal');
  const r = await fetch(`${API}/api/esp/${id}/signal`, { method: 'POST', body: await sealForOwner(data.signalKey, { espace: id, t: new Date().toISOString(), ...o }) });
  if (!r.ok) throw new Error(r.status);
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
const pickPub = (list) => (list.length ? list[pubTurn % list.length] : null);
const pubNow = (x) => { const n = new Date(), hm = String(n.getHours()).padStart(2, '0') + ':' + String(n.getMinutes()).padStart(2, '0'); return (!x.jours || !x.jours.length || x.jours.includes(n.getDay())) && (!x.h1 || !x.h2 || (x.h1 <= x.h2 ? hm >= x.h1 && hm < x.h2 : hm >= x.h1 || hm < x.h2)); };
function adBox(x, t) {
  const v = x.video ? videoEmbed(x.video) : null;
  return `<details class="card pub-box" data-pid="${esc(x.id)}" open><summary><div class="meta"><b class="pub-lbl">📣 ${esc(t.ad.lbl)}</b></div><b style="display:block;font-size:17px">${esc(x.nom)}</b><p style="margin:4px 0 0;white-space:pre-wrap">${esc(x.texte)}</p></summary>
    ${v ? `<div class="vid${v.tall ? ' tall' : ''}" data-vsrc="${esc(v.src)}"></div>` : ''}${x.adresse ? `<div class="meta" style="margin-top:6px">📍 ${esc(x.adresse)}</div>` : ''}
    <div class="btns">${x.adresse ? `<a class="btn sm" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(x.adresse)}" target="_blank" rel="noopener" data-pev="map">${esc(t.ad.see)}</a>` : ''}${x.tel ? `<a class="btn sm sec" href="tel:${esc(x.tel.replace(/[^\d+]/g, ''))}" data-pev="call">${esc(t.ad.call)}</a>` : ''}${x.web ? `<a class="btn sm sec" href="${esc(/^https?:/.test(x.web) ? x.web : 'https://' + x.web)}" target="_blank" rel="noopener" data-pev="web">${esc(t.ad.web)}</a>` : ''}</div></details>`;
}

function render() {
  const t = T();
  document.documentElement.lang = lang;
  const langs = `<div class="langs">${LANGS.map((k) => `<button data-lang="${k}" aria-pressed="${k === lang}">${k.toUpperCase()}</button>`).join('')}</div>`;
  if (!data) {
    app.innerHTML = `<div class="top"><span class="brandx"><b>🏨 ${esc(t.app)}</b></span>${langs}</div>
      <p class="sub" style="text-align:center;margin-top:18px">${esc(t.welcome)}</p>
      ${loadErr ? `<div class="card warnc"><p style="margin:0">${esc(loadErr)}</p></div>` : ''}
      <div class="card"><form id="codeForm"><label>${esc(t.code)}</label>
        <input type="text" name="code" inputmode="numeric" autocomplete="one-time-code" autocapitalize="characters" spellcheck="false" style="font-size:24px;letter-spacing:.1em;text-align:center">
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
  const pubs = (d.pubs || []).filter((x) => (!x.fin || x.fin >= today) && pubNow(x)), slot = (k) => pickPub(pubs.filter((x) => (x.slot || 'milieu') === k));
  // 2 · publicité (haut)
  { const p = slot('haut'); if (p) out.push(adBox(p, t)); }
  // 3 · notifications
  if (pushSt && pushSt !== 'unsupported' && (pushSt !== 'on' || pushJust)) out.push(`<div class="card notif"><h2>🔔 ${esc(t.notif)}</h2><p class="meta" style="margin:0 0 8px">${esc(t.notifHint)}</p>${pushSt === 'on' ? `<p class="ok" style="margin:0">${esc(t.notifOk)}</p>` : `<button class="btn sm" data-push="1">${esc(t.notifOn)}</button>`}</div>`);
  // 4 · météo + radio
  out.push(wxRadioCard());
  // 5 · cœur : ma chambre / mon logement
  const phs = Object.keys(PH).filter((k) => (ch.ph || {})[k]);
  const inStay = today >= d.arrivee && today <= d.depart;
  out.push(`<div class="card"><h2>${bnb ? '🏠' : '🛏️'} ${esc(bnb ? t.home : t.room)} ${esc(ch.num)}</h2>
    ${phs.length ? `<div class="car">${phs.map((k) => `<figure><img data-f="${esc(ch.ph[k])}" alt="" data-lb="1"><figcaption>${PH[k][0]} ${esc(PH[k][1][lang] || PH[k][1].fr)}</figcaption></figure>`).join('')}</div>` : ''}
    <p style="margin:8px 0 0"><b>${esc([CAT[ch.cat], TYP[ch.typ]].filter(Boolean).join(' · '))}</b></p>
    <p class="meta" style="margin:2px 0 0">${[ch.etage ? `${t.floor} ${ch.etage}` : '', ch.m2 ? ch.m2 + ' m²' : '', ch.npieces ? ch.npieces + ' ' + t.rooms : '', ch.persMax ? `👥 ${t.max} ${ch.persMax}` : ''].filter(Boolean).map(esc).join(' · ')}</p>
    ${ch.desc ? `<p style="margin:8px 0 0;white-space:pre-wrap">${esc(ch.desc)}</p>` : ''}
    ${d.porte ? `<div class="door">🔑 ${esc(t.door)} : ${inStay ? `<b>${esc(d.porte)}</b> <span class="meta">(${esc(t.after)} ${esc(d.hdeb)} · ${esc(t.before)} ${esc(d.hfin)})</span>` : `<span class="meta">${esc(t.doorSoon)}</span>`}</div>` : ''}
    ${d.cle ? `<p class="meta" style="margin:6px 0 0">🪪 ${esc(t.key)} : ${esc(d.cle)}</p>` : ''}
    ${st.adresse ? `<p class="meta" style="margin:8px 0 0">📍 ${esc(st.adresse)}</p><div class="btns"><a class="btn sm sec" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(st.adresse)}" target="_blank" rel="noopener">${esc(t.way)}</a></div>` : ''}</div>`);
  // 6 · publicité (milieu)
  { const p = slot('milieu'); if (p) out.push(adBox(p, t)); }
  // 7 · cœur : mon séjour (formule, menu, préférences, contact) + arrivée (taxi ou soi-même)
  out.push(`<div class="card"><h2>🧳 ${esc(t.stay)}</h2>
    <p style="margin:0">🛬 ${esc(t.from)} : <b>${esc(fmt(d.arrivee))}</b> ${esc(t.after)} ${esc(d.hdeb)}<br>🛫 ${esc(t.to)} : <b>${esc(fmt(d.depart))}</b> ${esc(t.before)} ${esc(d.hfin)}</p>
    ${d.formule ? `<p style="margin:8px 0 0">🍽️ ${esc(t.formule)} : <b>${esc(t.F[d.formule] || d.formule)}</b></p>` : ''}
    ${d.pref ? `<p class="meta" style="margin:6px 0 0">📝 ${esc(t.pref)} : ${esc(d.pref)}</p>` : ''}
    <div class="btns">${d.menu ? `<button class="btn sm" data-menu="1">${esc(t.menu)}</button>` : ''}${tel ? `<a class="btn sm sec" href="tel:${esc(tel)}">${esc(t.call)}</a>` : ''}${wa ? `<a class="btn sm sec" href="https://wa.me/${esc(wa)}" target="_blank" rel="noopener">${esc(t.wa)}</a>` : ''}</div></div>`);
  if (today <= d.arrivee) out.push(arrCard(t));
  if (d.taxi && d.taxi.on && today >= d.arrivee && today <= d.depart) out.push(rideCard());
  // 8 · état des lieux de sortie (pendant le séjour)
  if (inStay || today === d.depart) {
    const done = new Set([...(d.edlSent || []), ...edlDone()]);
    out.push(`<div class="card"><h2>${esc(t.edlT)}</h2><p class="meta" style="margin:0 0 8px">${esc(t.edlP)}</p>
      <div class="phs">${Object.entries(PH).map(([k, [ic, nm]]) => `<label class="ph${done.has(k) ? ' done' : ''}${edl[k] ? ' pick' : ''}">${edl[k] ? `<img src="${esc(edl[k].u)}" alt="">` : `<span>${done.has(k) ? '✅' : '＋'}</span>`}<small>${ic} ${esc(nm[lang] || nm.fr)}</small><input type="file" accept="image/*" capture="environment" data-edl="${k}"></label>`).join('')}</div>
      ${Object.keys(edl).length ? `<button class="btn block" style="margin-top:10px" data-edl-send="1">${esc(t.edlSend)} (${Object.keys(edl).length})</button>` : ''}
      ${edlMsg ? `<p class="ok" style="margin:8px 0 0">${esc(edlMsg)}</p>` : done.size ? `<p class="meta" style="margin:8px 0 0">✅ ${done.size} ${esc(t.edlOk)}</p>` : ''}</div>`);
  }
  // 9 · données chiffrées
  out.push(`<p class="meta safe">${esc(t.safe)}</p>`);
  // 10 · publicité (bas)
  { const p = slot('bas'); if (p) out.push(adBox(p, t)); }
  // 11 · infos
  out.push(infoBox({ lang }));
  // 12 · barre des cours (servie par le Worker)
  out.push(`<div class="ticker" data-vsrc="${API}/ticker"></div>`);
  out.push(`<p class="meta" style="text-align:center;margin-top:14px"><button class="linkb" data-reset="1">${esc(t.reset)}</button></p>`);
  const keep = new Map([...document.querySelectorAll('.vid iframe, .ticker iframe')].map((f) => [f.dataset.src, f]));
  app.innerHTML = out.join('');
  document.querySelectorAll('.vid[data-vsrc], .ticker[data-vsrc]').forEach((v) => {
    const src = v.dataset.vsrc, old = keep.get(src);
    if (old) return v.append(old);
    const f = document.createElement('iframe');
    f.src = src; f.dataset.src = src; f.loading = 'lazy'; f.title = 'Video'; f.allow = 'encrypted-media; picture-in-picture; fullscreen'; f.allowFullscreen = true;
    v.append(f);
  });
  hydrate();
  pubSeen(app);
  if (arrForm.mode === 'taxi' && !arrForm.est) estimate();
  else paintEst();
  tripPoll();
}
// 🚘 réserver un chauffeur pendant le séjour (course, à l'heure, journée…) + mes réservations
function rideCard() {
  const w = TXT(), d = data, f = ride, mine = d.rides || [];
  const p = price({ ...f, spot: 'other' }, 0);
  return `<div class="card arr"><h2>${esc(w.book)}</h2>
    ${mine.length ? `<p class="meta" style="margin:0 0 6px"><b>${esc(w.mine)}</b></p>${mine.map((r) => `<div class="drv" style="margin:0 0 6px;${r.st === 'wait' ? 'background:#fff7ed;border-color:#fed7aa' : r.st === 'no' ? 'background:#fef2f2;border-color:#fecaca' : ''}">${esc(w.S[r.service] || '')}${r.gamme ? ' · ' + esc(w.G[r.gamme]) : ''}${r.quand ? ' · 🕒 ' + esc(String(r.quand).replace('T', ' ')) : ''}${r.to ? ' → ' + esc(r.to) : ''}<br><b>${esc(r.st === 'wait' ? w.W : r.st === 'no' ? w.N : w.O)}</b>${r.drv ? ` · ${esc(r.drv.nom)} · 🚘 ${esc([r.drv.auto, r.drv.plaque].filter(Boolean).join(' '))}${r.drv.tel ? ` <a href="tel:${esc(String(r.drv.tel).replace(/[^\d+]/g, ''))}">📞</a>` : ''}` : ''}</div>`).join('')}` : ''}
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
        <button class="btn sm sec" style="margin-top:8px" data-arr-edit="1">${esc(t.change)}</button></div>`;
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
      ${svcHtml(f, 'a')}
      <p class="est" id="estBox"></p>` : ''}
    ${f.mode ? `<button class="btn block" style="margin-top:10px" data-arr-send="1">${esc(t.send)}</button>` : ''}</div>`;
}

async function load() {
  data = null;
  if (id && key) {
    try {
      const r = await fetch(`${API}/api/esp/${id}`, { cache: 'no-store' });
      if (r.ok) {
        const x = await openJson(key, await r.arrayBuffer());
        if (x && x.kind === 'hote') data = x;
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
  if (b.dataset.arrEdit) { arrEdit = true; arrForm.mode = ''; return render(); }
  if (b.dataset.arrSend) {
    b.disabled = true;
    const f = arrForm, from = f.spot === 'other' ? f.other : t[f.spot].replace(/^\S+\s/, '');
    if (f.mode === 'taxi' && !f.est) await estimate();
    const e2 = f.est || {};
    const msg = f.mode === 'taxi'
      ? { type: 'hote-arr', mode: 'taxi', from, quand: f.quand || `${data.arrivee}T${data.hdeb || '15:00'}`, vol: f.vol, km: e2.km || 0, prix: price(f, e2.km) || 0, service: f.service, gamme: f.gamme, extras: f.extras, heures: f.service === 'heures' ? f.heures : 0, fg: e2.fg ? { lat: e2.fg[0], lon: e2.fg[1] } : null, sg: e2.sg ? { lat: e2.sg[0], lon: e2.sg[1] } : null }
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
