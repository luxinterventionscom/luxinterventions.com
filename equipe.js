// App de l'équipe : planning personnel (quoi, où, quand), « commencé / fini / pas fini » avec note et photos,
// horaire, absences, coordonnées. Le lien contient l'identifiant et la clé (#id.clé) ; la clé ne quitte jamais le téléphone.
import '/ares/reqmark.js';
import { openJson, openBytes, sealForOwner, codeHash, unwrapWithCode } from '/ares/espace-crypto.js';

import { videoEmbed } from '/ares/video-embed.js';
import { pubStatInit, pubSeen, pubTap } from '/ares/pubstat.js';
import { wxRadioCard, wxRadioInit } from '/ares/wxradio.js';
import { pushStatus, pushEnable, pushRefresh, setBadge } from '/ares/push-client.js';
import { nbienInit, nbienBanner, colorLegend } from '/ares/nbien.js';
const API = document.querySelector('meta[name="esp-api"]').content.replace(/\/$/, '');
const ACC = 'eqAccess';
const RX = /^([0-9a-f]{32})\.([A-Za-z0-9_-]{40,})$/;
let [id, key] = (location.hash.slice(1).match(RX) || []).slice(1);
if (id) { try { localStorage.setItem(ACC, id + '.' + key); } catch {} history.replaceState(null, '', location.pathname); }
else { try { [id, key] = ((localStorage.getItem(ACC) || '').match(RX) || []).slice(1); } catch {} }

const L = {
  fr: {
    x: {"places": "Mes lieux de travail", "placesHint": "Touchez une adresse : la carte s’affiche en haut.", "route": "🗺️ Itinéraire Google Maps", "phT": "Photos avant / après", "phHint": "Avant de commencer et une fois fini : jusqu’à 6 photos chacune.", "av": "Avant", "ap": "Après", "cam": "📷 Photo", "gal": "🖼️ Galerie", "full": "6 photos maximum", "infoRO": "Ces données sont enregistrées par votre responsable. Une erreur ? Appelez-le."},
    w: {"today": "Planning du jour", "arr": "Arrivée", "dep": "Départ", "mine": "Mon horaire aujourd’hui"},
    p: {"me": "Mon horaire", "hint": "Écrivez votre heure d’arrivée et de départ. Un problème sur place ? Signalez-le avec au moins 3 photos.", "planned": "Prévu", "arr": "Arrivée", "dep": "Départ", "send": "✓ Envoyer", "pb": "⚠️ Quelque chose ne va pas", "what": "Qu’est-ce qui ne va pas ?", "ph": "ex. fuite d’eau dans la cave, porte cassée…", "photos": "Photos (minimum 3, maximum 6)", "more": "Encore {n} photo(s) minimum", "sendPb": "Envoyer le signalement", "pbOk": "Signalement envoyé ✓ Votre responsable est prévenu.", "full": "6 photos maximum"},
    s: {"hint": "Pour chaque logement : écrivez l’heure d’arrivée en arrivant, l’heure de départ en partant (le travail est alors fini), puis passez au suivant.", "arrBtn": "🟢 Je suis arrivé(e)", "depBtn": "🔴 Je pars — travail fini", "now": "en cours", "next": "prochain", "day": "Ma journée (sans logement prévu)"},
    wk: {"t": "Planning du mois", "w": "Semaine", "none": "Rien de prévu.", "days": "jours", "day1": "jour"},
    nt: {"t": "🔔 Notifications", "hint": "Recevez un avis et le numéro sur l’icône quand il y a un message ou du nouveau.", "on": "🔔 Activer les notifications", "ok": "✓ Notifications activées sur ce téléphone", "install": "iPhone : installez d’abord l’app sur l’écran d’accueil, ouvrez-la depuis l’icône, puis activez ici les notifications.", "denied": "Les notifications sont bloquées : réactivez-les dans les réglages du téléphone (Notifications → cette app).", "err": "Impossible d’activer les notifications sur ce téléphone."},
    ad: {"back": "📣 Publicité", "t": "Bons plans du quartier", "route": "🧭 Itinéraire", "call": "📞 Appeler", "web": "🌐 Site web", "cats": {"musique": "🎵 Musique", "resto": "🍕 Pizzeria / restaurant", "bar": "🍺 Bar / pub", "horeca": "☕ Café / snack", "bricolage": "🔨 Bricolage / jardinage", "meubles": "🛋️ Meubles / décoration", "courses": "🛒 Supermarché", "proxi": "🏪 Commerce de proximité", "bureau": "🏢 Bureaux", "social": "📱 Réseaux sociaux", "services": "🧰 Services", "autre": "📌 Autre"}, "see": "🗺️ Voir sur la carte", "lbl": "Publicité", "mapT": "Carte"},
    loc: 'fr-LU', app: 'App de l’équipe', welcome: 'Votre planning, vos interventions et vos absences, sur votre téléphone.', code: 'Votre code personnel', codePh: 'ex. K7PM2-QXA4H', enter: 'Entrer', noCode: 'Pas de code ? Demandez-le à votre responsable.', badCode: 'Code inconnu. Vérifiez-le ou demandez un nouveau code.', off: 'Cet accès a été désactivé. Demandez un nouveau code à votre responsable.', mismatch: 'Ce code est pour l’app des locataires.',
    hello: 'Bonjour', rk: {"t": "🏆 Ouvrier de l’année", "pos": "Vous êtes {p}ᵉ sur {n}", "pts": "{p} points", "fait": "travaux finis", "ph": "photos après", "urg": "urgences", "good": "avis positifs", "hint": "Travail fini, photos après, urgences faites et avis des locataires donnent des points. Les 3 premiers sont récompensés 🎁", "first": "1ᵉʳ sur {n} 🥇"}, pbPh: '📷 Photos du problème', urg: 'URGENT', today: 'Aujourd’hui', next: 'Prochains jours', none: 'Rien de prévu aujourd’hui.', noneNext: 'Rien de prévu.', late: 'en retard', start: '▶️ Je commence', done: '✅ Fini', inc: '⚠️ Pas fini', why: 'Pourquoi ce n’est pas fini ? (obligatoire)', whyPh: 'ex. il manque une pièce, locataire absent…', note: 'Note (facultatif)', notePh: 'ex. robinet changé, escalier lavé', photos: 'Photos (max. 3)', send: 'Envoyer', cancel: 'Annuler',
    st: { encours: '▶️ Commencé', fait: '✅ Fini', incomplet: '⚠️ Pas fini' }, at: 'à', consignes: 'Consignes', contact: 'Contact sur place', call: 'Appeler', commons: 'Parties communes',
    sched: 'Mon horaire', days: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'], noSched: 'Pas d’horaire enregistré.',
    abs: 'Mes absences', absNow: (t, f) => `${t}${f ? ' jusqu’au ' + f : ''}`, sick: 'Je suis malade / absent', types: { maladie: '🤒 Maladie', conges: '🏖️ Demande de congé', autre: '📌 Autre absence' }, from: 'Du', to: 'Au (inclus)', cert: 'Certificat médical (photo)', sickOk: 'Envoyé ✓ Votre responsable est prévenu.',
    info: 'Mes coordonnées', tel: 'Téléphone', mail: 'Email', adr: 'Adresse', ville: 'Code postal et ville', save: 'Envoyer', infoOk: 'Envoyé ✓',
    pending: (n) => `⏳ ${n} envoi${n > 1 ? 's' : ''} en attente : ${n > 1 ? 'ils partiront' : 'il partira'} dès qu’il y aura du réseau.`, retry: 'Réessayer', sent: 'Envoyé ✓',
    install: 'Ajoutez l’app à l’écran d’accueil : iPhone → Partager → « Sur l’écran d’accueil » ; Android → ⋮ → « Installer l’application ».', logout: 'Se déconnecter de ce téléphone', personal: 'Ce lien est personnel.', rgpd: 'Vos données sont chiffrées. Votre responsable voit ce que vous envoyez (statuts, notes, photos, absences, coordonnées).', need: 'Écrivez pourquoi ce n’est pas fini.',
  },
  it: {
    x: {"places": "I miei luoghi di lavoro", "placesHint": "Tocca un indirizzo: la mappa appare in alto.", "route": "🗺️ Percorso Google Maps", "phT": "Foto prima / dopo", "phHint": "Prima di iniziare e a lavoro finito: fino a 6 foto ciascuna.", "av": "Prima", "ap": "Dopo", "cam": "📷 Foto", "gal": "🖼️ Galleria", "full": "6 foto al massimo", "infoRO": "Questi dati sono registrati dal tuo responsabile. Un errore? Chiamalo."},
    w: {"today": "Planning di oggi", "arr": "Arrivo", "dep": "Partenza", "mine": "Il mio orario di oggi"},
    p: {"me": "Il mio orario", "hint": "Scrivi l’ora di arrivo e di partenza. Qualcosa non va sul posto? Segnalalo con almeno 3 foto.", "planned": "Previsto", "arr": "Arrivo", "dep": "Partenza", "send": "✓ Invia", "pb": "⚠️ Qualcosa non va", "what": "Cosa non va?", "ph": "es. perdita d’acqua in cantina, porta rotta…", "photos": "Foto (minimo 3, massimo 6)", "more": "Ancora {n} foto minimo", "sendPb": "Invia la segnalazione", "pbOk": "Segnalazione inviata ✓ Il tuo responsabile è avvisato.", "full": "6 foto al massimo"},
    s: {"hint": "Per ogni appartamento: scrivi l’ora di arrivo quando arrivi e quella di partenza quando vai via (il lavoro è finito), poi passa al successivo.", "arrBtn": "🟢 Sono arrivato/a", "depBtn": "🔴 Parto — lavoro finito", "now": "in corso", "next": "prossimo", "day": "La mia giornata (senza appartamento previsto)"},
    wk: {"t": "Planning del mese", "w": "Settimana", "none": "Niente in programma.", "days": "giorni", "day1": "giorno"},
    nt: {"t": "🔔 Notifiche", "hint": "Ricevi un avviso e il numerino sull’icona quando c’è un messaggio o una novità.", "on": "🔔 Attiva le notifiche", "ok": "✓ Notifiche attive su questo telefono", "install": "iPhone: prima installa l’app sulla schermata Home, aprila dall’icona, poi attiva qui le notifiche.", "denied": "Le notifiche sono bloccate: riattivale nelle impostazioni del telefono (Notifiche → questa app).", "err": "Impossibile attivare le notifiche su questo telefono."},
    ad: {"back": "📣 Pubblicità", "t": "Offerte del quartiere", "route": "🧭 Itinerario", "call": "📞 Chiama", "web": "🌐 Sito web", "cats": {"musique": "🎵 Musica", "resto": "🍕 Pizzeria / ristorante", "bar": "🍺 Bar / pub", "horeca": "☕ Caffè / snack", "bricolage": "🔨 Fai da te / giardinaggio", "meubles": "🛋️ Mobili / arredamento", "courses": "🛒 Supermercato", "proxi": "🏪 Negozio di prossimità", "bureau": "🏢 Uffici", "social": "📱 Social media", "services": "🧰 Servizi", "autre": "📌 Altro"}, "see": "🗺️ Vedi sulla mappa", "lbl": "Pubblicità", "mapT": "Mappa"},
    loc: 'it-IT', app: 'App della squadra', welcome: 'Il tuo planning, i tuoi interventi e le tue assenze, sul telefono.', code: 'Il tuo codice personale', codePh: 'es. K7PM2-QXA4H', enter: 'Entra', noCode: 'Non hai il codice? Chiedilo al tuo responsabile.', badCode: 'Codice sconosciuto. Controllalo o chiedi un nuovo codice.', off: 'Questo accesso è stato disattivato. Chiedi un nuovo codice al responsabile.', mismatch: 'Questo codice è per l’app degli inquilini.',
    hello: 'Ciao', rk: {"t": "🏆 Operaio dell’anno", "pos": "Sei {p}° su {n}", "pts": "{p} punti", "fait": "lavori finiti", "ph": "foto dopo", "urg": "urgenze", "good": "avis positivi", "hint": "Lavori finiti, foto dopo, urgenze fatte e avis degli inquilini danno punti. I primi 3 vengono premiati 🎁", "first": "1° su {n} 🥇"}, pbPh: '📷 Foto del problema', urg: 'URGENTE', today: 'Oggi', next: 'Prossimi giorni', none: 'Niente in programma oggi.', noneNext: 'Niente in programma.', late: 'in ritardo', start: '▶️ Inizio', done: '✅ Finito', inc: '⚠️ Non finito', why: 'Perché non è finito? (obbligatorio)', whyPh: 'es. manca un pezzo, inquilino assente…', note: 'Nota (facoltativa)', notePh: 'es. rubinetto cambiato, scale lavate', photos: 'Foto (max. 3)', send: 'Invia', cancel: 'Annulla',
    st: { encours: '▶️ Iniziato', fait: '✅ Finito', incomplet: '⚠️ Non finito' }, at: 'alle', consignes: 'Istruzioni', contact: 'Contatto sul posto', call: 'Chiama', commons: 'Parti comuni',
    sched: 'Il mio orario', days: ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'], noSched: 'Nessun orario registrato.',
    abs: 'Le mie assenze', absNow: (t, f) => `${t}${f ? ' fino al ' + f : ''}`, sick: 'Sono malato / assente', types: { maladie: '🤒 Malattia', conges: '🏖️ Richiesta di ferie', autre: '📌 Altra assenza' }, from: 'Dal', to: 'Al (incluso)', cert: 'Certificato medico (foto)', sickOk: 'Inviato ✓ Il tuo responsabile è avvisato.',
    info: 'I miei dati', tel: 'Telefono', mail: 'Email', adr: 'Indirizzo', ville: 'CAP e città', save: 'Invia', infoOk: 'Inviato ✓',
    pending: (n) => `⏳ ${n} invi${n > 1 ? 'i' : 'o'} in attesa: parti${n > 1 ? 'ranno' : 'rà'} appena c’è rete.`, retry: 'Riprova', sent: 'Inviato ✓',
    install: 'Aggiungi l’app alla schermata Home: iPhone → Condividi → « Aggiungi alla schermata Home »; Android → ⋮ → « Installa app ».', logout: 'Esci da questo telefono', personal: 'Questo link è personale.', rgpd: 'I tuoi dati sono cifrati. Il tuo responsabile vede ciò che invii (stati, note, foto, assenze, dati).', need: 'Scrivi perché non è finito.',
  },
  pt: {
    x: {"places": "Os meus locais de trabalho", "placesHint": "Toque num endereço: o mapa aparece em cima.", "route": "🗺️ Itinerário Google Maps", "phT": "Fotos antes / depois", "phHint": "Antes de começar e depois de terminar: até 6 fotos cada.", "av": "Antes", "ap": "Depois", "cam": "📷 Foto", "gal": "🖼️ Galeria", "full": "6 fotos no máximo", "infoRO": "Estes dados são registados pelo seu responsável. Um erro? Ligue-lhe."},
    w: {"today": "Planeamento de hoje", "arr": "Chegada", "dep": "Saída", "mine": "O meu horário de hoje"},
    p: {"me": "O meu horário", "hint": "Escreva a hora de chegada e de saída. Algo não está bem no local? Comunique-o com pelo menos 3 fotos.", "planned": "Previsto", "arr": "Chegada", "dep": "Saída", "send": "✓ Enviar", "pb": "⚠️ Algo não está bem", "what": "O que não está bem?", "ph": "ex. fuga de água na cave, porta partida…", "photos": "Fotos (mínimo 3, máximo 6)", "more": "Faltam pelo menos {n} foto(s)", "sendPb": "Enviar o aviso", "pbOk": "Aviso enviado ✓ O seu responsável foi avisado.", "full": "6 fotos no máximo"},
    s: {"hint": "Para cada alojamento: escreva a hora de chegada ao chegar e a de saída ao sair (o trabalho fica terminado), depois passe ao seguinte.", "arrBtn": "🟢 Cheguei", "depBtn": "🔴 Vou embora — trabalho feito", "now": "em curso", "next": "próximo", "day": "O meu dia (sem alojamento previsto)"},
    wk: {"t": "Planeamento do mês", "w": "Semana", "none": "Nada previsto.", "days": "dias", "day1": "dia"},
    nt: {"t": "🔔 Notificações", "hint": "Receba um aviso e o número no ícone quando houver uma mensagem ou novidade.", "on": "🔔 Ativar as notificações", "ok": "✓ Notificações ativas neste telemóvel", "install": "iPhone: instale primeiro a app no ecrã principal, abra-a pelo ícone e depois ative aqui as notificações.", "denied": "As notificações estão bloqueadas: reative-as nas definições do telemóvel (Notificações → esta app).", "err": "Não é possível ativar as notificações neste telemóvel."},
    ad: {"back": "📣 Publicidade", "t": "Boas ofertas do bairro", "route": "🧭 Itinerário", "call": "📞 Ligar", "web": "🌐 Site", "cats": {"musique": "🎵 Música", "resto": "🍕 Pizzaria / restaurante", "bar": "🍺 Bar / pub", "horeca": "☕ Café / snack", "bricolage": "🔨 Bricolage / jardinagem", "meubles": "🛋️ Móveis / decoração", "courses": "🛒 Supermercado", "proxi": "🏪 Comércio de proximidade", "bureau": "🏢 Escritórios", "social": "📱 Redes sociais", "services": "🧰 Serviços", "autre": "📌 Outro"}, "see": "🗺️ Ver no mapa", "lbl": "Publicidade", "mapT": "Mapa"},
    loc: 'pt-PT', app: 'App da equipa', welcome: 'O seu planeamento, as suas intervenções e ausências, no telemóvel.', code: 'O seu código pessoal', codePh: 'ex. K7PM2-QXA4H', enter: 'Entrar', noCode: 'Não tem código? Peça-o ao seu responsável.', badCode: 'Código desconhecido. Verifique-o ou peça um novo código.', off: 'Este acesso foi desativado. Peça um novo código ao responsável.', mismatch: 'Este código é para a app dos inquilinos.',
    hello: 'Olá', rk: {"t": "🏆 Trabalhador do ano", "pos": "Está em {p}.º de {n}", "pts": "{p} pontos", "fait": "trabalhos concluídos", "ph": "fotos depois", "urg": "urgências", "good": "avaliações positivas", "hint": "Trabalho concluído, fotos depois, urgências feitas e avaliações dos inquilinos dão pontos. Os 3 primeiros são recompensados 🎁", "first": "1.º de {n} 🥇"}, pbPh: '📷 Fotos do problema', urg: 'URGENTE', today: 'Hoje', next: 'Próximos dias', none: 'Nada previsto para hoje.', noneNext: 'Nada previsto.', late: 'em atraso', start: '▶️ Começo', done: '✅ Terminado', inc: '⚠️ Não terminado', why: 'Porque não está terminado? (obrigatório)', whyPh: 'ex. falta uma peça, inquilino ausente…', note: 'Nota (opcional)', notePh: 'ex. torneira trocada, escada lavada', photos: 'Fotos (máx. 3)', send: 'Enviar', cancel: 'Cancelar',
    st: { encours: '▶️ Começado', fait: '✅ Terminado', incomplet: '⚠️ Não terminado' }, at: 'às', consignes: 'Instruções', contact: 'Contacto no local', call: 'Ligar', commons: 'Partes comuns',
    sched: 'O meu horário', days: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'], noSched: 'Sem horário registado.',
    abs: 'As minhas ausências', absNow: (t, f) => `${t}${f ? ' até ' + f : ''}`, sick: 'Estou doente / ausente', types: { maladie: '🤒 Doença', conges: '🏖️ Pedido de férias', autre: '📌 Outra ausência' }, from: 'De', to: 'Até (inclusive)', cert: 'Atestado médico (foto)', sickOk: 'Enviado ✓ O seu responsável foi avisado.',
    info: 'Os meus dados', tel: 'Telefone', mail: 'Email', adr: 'Morada', ville: 'Código postal e cidade', save: 'Enviar', infoOk: 'Enviado ✓',
    pending: (n) => `⏳ ${n} envio${n > 1 ? 's' : ''} em espera: ${n > 1 ? 'partirão' : 'partirá'} quando houver rede.`, retry: 'Tentar de novo', sent: 'Enviado ✓',
    install: 'Adicione a app ao ecrã inicial: iPhone → Partilhar → « Adicionar ao ecrã principal »; Android → ⋮ → « Instalar app ».', logout: 'Sair deste telemóvel', personal: 'Este link é pessoal.', rgpd: 'Os seus dados estão cifrados. O seu responsável vê o que envia (estados, notas, fotos, ausências, dados).', need: 'Escreva porque não está terminado.',
  },
  de: {
    x: {"places": "Meine Arbeitsorte", "placesHint": "Tippen Sie auf eine Adresse: Die Karte erscheint oben.", "route": "🗺️ Route in Google Maps", "phT": "Fotos vorher / nachher", "phHint": "Vor Beginn und nach Abschluss: je bis zu 6 Fotos.", "av": "Vorher", "ap": "Nachher", "cam": "📷 Foto", "gal": "🖼️ Galerie", "full": "Höchstens 6 Fotos", "infoRO": "Diese Daten werden von Ihrem Verantwortlichen erfasst. Ein Fehler? Rufen Sie ihn an."},
    w: {"today": "Heutiger Plan", "arr": "Ankunft", "dep": "Ende", "mine": "Meine Zeiten heute"},
    p: {"me": "Meine Arbeitszeit", "hint": "Tragen Sie Ihre Ankunfts- und Endzeit ein. Ein Problem vor Ort? Melden Sie es mit mindestens 3 Fotos.", "planned": "Geplant", "arr": "Ankunft", "dep": "Ende", "send": "✓ Senden", "pb": "⚠️ Etwas stimmt nicht", "what": "Was stimmt nicht?", "ph": "z. B. Wasserleck im Keller, Tür kaputt…", "photos": "Fotos (mindestens 3, höchstens 6)", "more": "Noch mindestens {n} Foto(s)", "sendPb": "Meldung senden", "pbOk": "Meldung gesendet ✓ Ihr Verantwortlicher ist informiert.", "full": "Höchstens 6 Fotos"},
    s: {"hint": "Für jede Wohnung: Tragen Sie bei Ankunft die Ankunftszeit ein, beim Gehen die Endzeit (die Arbeit ist dann fertig), dann zur nächsten.", "arrBtn": "🟢 Ich bin angekommen", "depBtn": "🔴 Ich gehe — Arbeit fertig", "now": "läuft", "next": "nächste", "day": "Mein Tag (ohne geplante Wohnung)"},
    wk: {"t": "Monatsplan", "w": "Woche", "none": "Nichts geplant.", "days": "Tage", "day1": "Tag"},
    nt: {"t": "🔔 Benachrichtigungen", "hint": "Erhalten Sie einen Hinweis und die Zahl auf dem Symbol, wenn es eine Nachricht oder Neues gibt.", "on": "🔔 Benachrichtigungen aktivieren", "ok": "✓ Benachrichtigungen auf diesem Telefon aktiv", "install": "iPhone: Installieren Sie die App zuerst auf dem Home-Bildschirm, öffnen Sie sie über das Symbol und aktivieren Sie dann hier die Benachrichtigungen.", "denied": "Benachrichtigungen sind blockiert: Aktivieren Sie sie in den Telefoneinstellungen (Mitteilungen → diese App).", "err": "Benachrichtigungen können auf diesem Telefon nicht aktiviert werden."},
    ad: {"back": "📣 Werbung", "t": "Tipps aus der Nachbarschaft", "route": "🧭 Route", "call": "📞 Anrufen", "web": "🌐 Webseite", "cats": {"musique": "🎵 Musik", "resto": "🍕 Pizzeria / Restaurant", "bar": "🍺 Bar / Pub", "horeca": "☕ Café / Imbiss", "bricolage": "🔨 Baumarkt / Garten", "meubles": "🛋️ Möbel / Deko", "courses": "🛒 Supermarkt", "proxi": "🏪 Laden in der Nähe", "bureau": "🏢 Büros", "social": "📱 Soziale Medien", "services": "🧰 Dienstleistungen", "autre": "📌 Sonstiges"}, "see": "🗺️ Auf der Karte zeigen", "lbl": "Werbung", "mapT": "Karte"},
    loc: 'de-LU', app: 'Team-App', welcome: 'Ihr Plan, Ihre Einsätze und Abwesenheiten, auf dem Telefon.', code: 'Ihr persönlicher Code', codePh: 'z. B. K7PM2-QXA4H', enter: 'Anmelden', noCode: 'Kein Code? Fragen Sie Ihren Verantwortlichen.', badCode: 'Unbekannter Code. Prüfen Sie ihn oder fragen Sie nach einem neuen.', off: 'Dieser Zugang wurde deaktiviert. Fragen Sie nach einem neuen Code.', mismatch: 'Dieser Code ist für die Mieter-App.',
    hello: 'Hallo', rk: {"t": "🏆 Mitarbeiter des Jahres", "pos": "Sie sind {p}. von {n}", "pts": "{p} Punkte", "fait": "erledigte Arbeiten", "ph": "Fotos danach", "urg": "Notfälle", "good": "positive Bewertungen", "hint": "Erledigte Arbeit, Fotos danach, erledigte Notfälle und Bewertungen der Mieter bringen Punkte. Die ersten 3 werden belohnt 🎁", "first": "1. von {n} 🥇"}, pbPh: '📷 Fotos des Problems', urg: 'DRINGEND', today: 'Heute', next: 'Nächste Tage', none: 'Heute nichts geplant.', noneNext: 'Nichts geplant.', late: 'verspätet', start: '▶️ Ich fange an', done: '✅ Fertig', inc: '⚠️ Nicht fertig', why: 'Warum nicht fertig? (Pflicht)', whyPh: 'z. B. Teil fehlt, Mieter nicht da…', note: 'Notiz (optional)', notePh: 'z. B. Hahn gewechselt, Treppe geputzt', photos: 'Fotos (max. 3)', send: 'Senden', cancel: 'Abbrechen',
    st: { encours: '▶️ Begonnen', fait: '✅ Fertig', incomplet: '⚠️ Nicht fertig' }, at: 'um', consignes: 'Anweisungen', contact: 'Kontakt vor Ort', call: 'Anrufen', commons: 'Gemeinschaftsbereiche',
    sched: 'Meine Arbeitszeiten', days: ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'], noSched: 'Keine Arbeitszeiten erfasst.',
    abs: 'Meine Abwesenheiten', absNow: (t, f) => `${t}${f ? ' bis ' + f : ''}`, sick: 'Ich bin krank / abwesend', types: { maladie: '🤒 Krankheit', conges: '🏖️ Urlaubsantrag', autre: '📌 Andere Abwesenheit' }, from: 'Von', to: 'Bis (einschl.)', cert: 'Ärztliches Attest (Foto)', sickOk: 'Gesendet ✓ Ihr Verantwortlicher ist informiert.',
    info: 'Meine Kontaktdaten', tel: 'Telefon', mail: 'E-Mail', adr: 'Adresse', ville: 'PLZ und Ort', save: 'Senden', infoOk: 'Gesendet ✓',
    pending: (n) => `⏳ ${n} Sendung${n > 1 ? 'en' : ''} wartet: wird gesendet, sobald Netz da ist.`, retry: 'Erneut versuchen', sent: 'Gesendet ✓',
    install: 'App zum Startbildschirm hinzufügen: iPhone → Teilen → „Zum Home-Bildschirm“; Android → ⋮ → „App installieren“.', logout: 'Von diesem Telefon abmelden', personal: 'Dieser Link ist persönlich.', rgpd: 'Ihre Daten sind verschlüsselt. Ihr Verantwortlicher sieht, was Sie senden (Status, Notizen, Fotos, Abwesenheiten, Kontaktdaten).', need: 'Schreiben Sie, warum es nicht fertig ist.',
  },
  en: {
    x: {"places": "My workplaces", "placesHint": "Tap an address: the map appears at the top.", "route": "🗺️ Directions in Google Maps", "phT": "Before / after photos", "phHint": "Before you start and once finished: up to 6 photos each.", "av": "Before", "ap": "After", "cam": "📷 Photo", "gal": "🖼️ Gallery", "full": "6 photos maximum", "infoRO": "These details are recorded by your manager. A mistake? Call them."},
    w: {"today": "Today’s schedule", "arr": "Arrival", "dep": "Departure", "mine": "My hours today"},
    p: {"me": "My hours", "hint": "Write down your arrival and departure time. Something wrong on site? Report it with at least 3 photos.", "planned": "Planned", "arr": "Arrival", "dep": "Departure", "send": "✓ Send", "pb": "⚠️ Something is wrong", "what": "What is wrong?", "ph": "e.g. water leak in the cellar, broken door…", "photos": "Photos (minimum 3, maximum 6)", "more": "{n} more photo(s) needed", "sendPb": "Send the report", "pbOk": "Report sent ✓ Your manager has been told.", "full": "6 photos maximum"},
    s: {"hint": "For each flat: write your arrival time when you arrive and your departure time when you leave (the job is then done), then move on to the next one.", "arrBtn": "🟢 I have arrived", "depBtn": "🔴 Leaving — job done", "now": "in progress", "next": "next", "day": "My day (no flat planned)"},
    wk: {"t": "Month planning", "w": "Week", "none": "Nothing planned.", "days": "days", "day1": "day"},
    nt: {"t": "🔔 Notifications", "hint": "Get an alert and the number on the icon when there is a message or something new.", "on": "🔔 Turn on notifications", "ok": "✓ Notifications on for this phone", "install": "iPhone: first add the app to your Home Screen, open it from the icon, then turn on notifications here.", "denied": "Notifications are blocked: turn them back on in your phone settings (Notifications → this app).", "err": "Notifications cannot be turned on on this phone."},
    ad: {"back": "📣 Ad", "t": "Local deals", "route": "🧭 Directions", "call": "📞 Call", "web": "🌐 Website", "cats": {"musique": "🎵 Music", "resto": "🍕 Pizzeria / restaurant", "bar": "🍺 Bar / pub", "horeca": "☕ Café / snack bar", "bricolage": "🔨 DIY / garden", "meubles": "🛋️ Furniture / decor", "courses": "🛒 Supermarket", "proxi": "🏪 Local shop", "bureau": "🏢 Offices", "social": "📱 Social media", "services": "🧰 Services", "autre": "📌 Other"}, "see": "🗺️ Show on map", "lbl": "Advertising", "mapT": "Map"},
    loc: 'en-GB', app: 'Team app', welcome: 'Your schedule, your jobs and your absences, on your phone.', code: 'Your personal code', codePh: 'e.g. K7PM2-QXA4H', enter: 'Enter', noCode: 'No code? Ask your manager.', badCode: 'Unknown code. Check it or ask for a new one.', off: 'This access has been disabled. Ask your manager for a new code.', mismatch: 'This code is for the tenants app.',
    hello: 'Hello', rk: {"t": "🏆 Worker of the year", "pos": "You are #{p} of {n}", "pts": "{p} points", "fait": "jobs done", "ph": "photos after", "urg": "urgent jobs", "good": "positive reviews", "hint": "Finished work, photos after, urgent jobs done and tenants’ reviews give points. The top 3 are rewarded 🎁", "first": "#1 of {n} 🥇"}, pbPh: '📷 Photos of the problem', urg: 'URGENT', today: 'Today', next: 'Next days', none: 'Nothing planned today.', noneNext: 'Nothing planned.', late: 'late', start: '▶️ I’m starting', done: '✅ Done', inc: '⚠️ Not finished', why: 'Why is it not finished? (required)', whyPh: 'e.g. a part is missing, tenant not home…', note: 'Note (optional)', notePh: 'e.g. tap replaced, stairs cleaned', photos: 'Photos (max. 3)', send: 'Send', cancel: 'Cancel',
    st: { encours: '▶️ Started', fait: '✅ Done', incomplet: '⚠️ Not finished' }, at: 'at', consignes: 'Instructions', contact: 'Contact on site', call: 'Call', commons: 'Common areas',
    sched: 'My hours', days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], noSched: 'No hours recorded.',
    abs: 'My absences', absNow: (t, f) => `${t}${f ? ' until ' + f : ''}`, sick: 'I’m sick / absent', types: { maladie: '🤒 Sick leave', conges: '🏖️ Holiday request', autre: '📌 Other absence' }, from: 'From', to: 'To (included)', cert: 'Medical certificate (photo)', sickOk: 'Sent ✓ Your manager has been told.',
    info: 'My details', tel: 'Phone', mail: 'Email', adr: 'Address', ville: 'Postcode and town', save: 'Send', infoOk: 'Sent ✓',
    pending: (n) => `⏳ ${n} update${n > 1 ? 's' : ''} waiting: will be sent as soon as there is signal.`, retry: 'Retry', sent: 'Sent ✓',
    install: 'Add the app to your home screen: iPhone → Share → “Add to Home Screen”; Android → ⋮ → “Install app”.', logout: 'Log out of this phone', personal: 'This link is personal.', rgpd: 'Your data is encrypted. Your manager sees what you send (statuses, notes, photos, absences, details).', need: 'Write why it is not finished.',
  },
  es: {
    x: {"places": "Mis lugares de trabajo", "placesHint": "Toca una dirección: el mapa aparece arriba.", "route": "🗺️ Ruta en Google Maps", "phT": "Fotos antes / después", "phHint": "Antes de empezar y al terminar: hasta 6 fotos cada una.", "av": "Antes", "ap": "Después", "cam": "📷 Foto", "gal": "🖼️ Galería", "full": "6 fotos como máximo", "infoRO": "Estos datos los registra tu responsable. ¿Un error? Llámale."},
    w: {"today": "Planificación de hoy", "arr": "Llegada", "dep": "Salida", "mine": "Mi horario de hoy"},
    p: {"me": "Mi horario", "hint": "Escribe tu hora de llegada y de salida. ¿Algo va mal en el lugar? Avísalo con al menos 3 fotos.", "planned": "Previsto", "arr": "Llegada", "dep": "Salida", "send": "✓ Enviar", "pb": "⚠️ Algo va mal", "what": "¿Qué va mal?", "ph": "ej. fuga de agua en el trastero, puerta rota…", "photos": "Fotos (mínimo 3, máximo 6)", "more": "Faltan al menos {n} foto(s)", "sendPb": "Enviar el aviso", "pbOk": "Aviso enviado ✓ Tu responsable está avisado.", "full": "6 fotos como máximo"},
    s: {"hint": "Para cada vivienda: escribe la hora de llegada al llegar y la de salida al irte (el trabajo queda terminado), luego pasa a la siguiente.", "arrBtn": "🟢 He llegado", "depBtn": "🔴 Me voy — trabajo terminado", "now": "en curso", "next": "siguiente", "day": "Mi jornada (sin vivienda prevista)"},
    wk: {"t": "Planificación del mes", "w": "Semana", "none": "Nada previsto.", "days": "días", "day1": "día"},
    nt: {"t": "🔔 Notificaciones", "hint": "Recibe un aviso y el número en el icono cuando haya un mensaje o una novedad.", "on": "🔔 Activar las notificaciones", "ok": "✓ Notificaciones activas en este móvil", "install": "iPhone: primero añade la app a la pantalla de inicio, ábrela desde el icono y activa aquí las notificaciones.", "denied": "Las notificaciones están bloqueadas: vuelve a activarlas en los ajustes del móvil (Notificaciones → esta app).", "err": "No se pueden activar las notificaciones en este móvil."},
    ad: {"back": "📣 Publicidad", "t": "Ofertas del barrio", "route": "🧭 Ruta", "call": "📞 Llamar", "web": "🌐 Web", "cats": {"musique": "🎵 Música", "resto": "🍕 Pizzería / restaurante", "bar": "🍺 Bar / pub", "horeca": "☕ Cafetería / snack", "bricolage": "🔨 Bricolaje / jardín", "meubles": "🛋️ Muebles / decoración", "courses": "🛒 Supermercado", "proxi": "🏪 Comercio de proximidad", "bureau": "🏢 Oficinas", "social": "📱 Redes sociales", "services": "🧰 Servicios", "autre": "📌 Otro"}, "see": "🗺️ Ver en el mapa", "lbl": "Publicidad", "mapT": "Mapa"},
    loc: 'es-ES', app: 'App del equipo', welcome: 'Tu planificación, tus intervenciones y tus ausencias, en el móvil.', code: 'Tu código personal', codePh: 'ej. K7PM2-QXA4H', enter: 'Entrar', noCode: '¿No tienes código? Pídeselo a tu responsable.', badCode: 'Código desconocido. Compruébalo o pide uno nuevo.', off: 'Este acceso ha sido desactivado. Pide un nuevo código a tu responsable.', mismatch: 'Este código es para la app de inquilinos.',
    hello: 'Hola', rk: {"t": "🏆 Trabajador del año", "pos": "Eres {p}.º de {n}", "pts": "{p} puntos", "fait": "trabajos terminados", "ph": "fotos después", "urg": "urgencias", "good": "opiniones positivas", "hint": "Trabajo terminado, fotos después, urgencias hechas y opiniones de los inquilinos dan puntos. Los 3 primeros reciben un premio 🎁", "first": "1.º de {n} 🥇"}, pbPh: '📷 Fotos del problema', urg: 'URGENTE', today: 'Hoy', next: 'Próximos días', none: 'Nada previsto hoy.', noneNext: 'Nada previsto.', late: 'con retraso', start: '▶️ Empiezo', done: '✅ Terminado', inc: '⚠️ No terminado', why: '¿Por qué no está terminado? (obligatorio)', whyPh: 'ej. falta una pieza, inquilino ausente…', note: 'Nota (opcional)', notePh: 'ej. grifo cambiado, escalera limpia', photos: 'Fotos (máx. 3)', send: 'Enviar', cancel: 'Cancelar',
    st: { encours: '▶️ Empezado', fait: '✅ Terminado', incomplet: '⚠️ No terminado' }, at: 'a las', consignes: 'Instrucciones', contact: 'Contacto en el lugar', call: 'Llamar', commons: 'Zonas comunes',
    sched: 'Mi horario', days: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'], noSched: 'Sin horario registrado.',
    abs: 'Mis ausencias', absNow: (t, f) => `${t}${f ? ' hasta el ' + f : ''}`, sick: 'Estoy enfermo / ausente', types: { maladie: '🤒 Enfermedad', conges: '🏖️ Solicitud de vacaciones', autre: '📌 Otra ausencia' }, from: 'Desde', to: 'Hasta (incluido)', cert: 'Certificado médico (foto)', sickOk: 'Enviado ✓ Tu responsable está avisado.',
    info: 'Mis datos', tel: 'Teléfono', mail: 'Email', adr: 'Dirección', ville: 'Código postal y ciudad', save: 'Enviar', infoOk: 'Enviado ✓',
    pending: (n) => `⏳ ${n} envío${n > 1 ? 's' : ''} pendiente${n > 1 ? 's' : ''}: saldrá${n > 1 ? 'n' : ''} en cuanto haya cobertura.`, retry: 'Reintentar', sent: 'Enviado ✓',
    install: 'Añade la app a la pantalla de inicio: iPhone → Compartir → « Añadir a pantalla de inicio »; Android → ⋮ → « Instalar app ».', logout: 'Cerrar sesión en este móvil', personal: 'Este enlace es personal.', rgpd: 'Tus datos están cifrados. Tu responsable ve lo que envías (estados, notas, fotos, ausencias, datos).', need: 'Escribe por qué no está terminado.',
  },
};
// Fiche d'engagement (intervenant occasionnel) : il la lit et la signe ici, avec le doigt
// « Je ne peux pas » : l'ouvrier refuse un travail pas encore commencé → le responsable en envoie un autre
// ▶ petit dessin animé « mettre l'icône sur l'écran » (chargé seulement au toucher)
const FT = {
  fr: { info: 'Info supplémentaires', anim: 'Mettre l’icône sur l’écran', lock: 'Vos données sont chiffrées et visibles uniquement par la direction.', out: 'Se déconnecter', sure: 'Voulez-vous vraiment vous déconnecter de l’app ?', call: 'Appeler la centrale' },
  it: { info: 'Info supplementari', anim: 'Mettere l’icona sullo schermo', lock: 'I tuoi dati sono cifrati e visibili solo alla direzione.', out: 'Esci', sure: 'Vuoi davvero uscire dall’app?', call: 'Chiama la centrale' },
  de: { info: 'Weitere Infos', anim: 'Symbol auf den Bildschirm legen', lock: 'Ihre Daten sind verschlüsselt und nur für die Leitung sichtbar.', out: 'Abmelden', sure: 'Möchten Sie sich wirklich von der App abmelden?', call: 'Zentrale anrufen' },
  en: { info: 'More info', anim: 'Put the icon on the screen', lock: 'Your data is encrypted and visible only to management.', out: 'Log out', sure: 'Do you really want to log out of the app?', call: 'Call the office' },
  pt: { info: 'Mais informações', anim: 'Pôr o ícone no ecrã', lock: 'Os seus dados são cifrados e visíveis apenas pela direção.', out: 'Terminar sessão', sure: 'Quer mesmo terminar a sessão da app?', call: 'Ligar para a central' },
  es: { info: 'Más información', anim: 'Poner el icono en la pantalla', lock: 'Tus datos están cifrados y solo los ve la dirección.', out: 'Cerrar sesión', sure: '¿Seguro que quieres cerrar la sesión de la app?', call: 'Llamar a la central' },
};
const IA_BTN = { fr: '▶ Voir comment (animation)', it: '▶ Guarda come (animazione)', de: '▶ So geht’s (Animation)', pt: '▶ Ver como (animação)', en: '▶ See how (animation)', es: '▶ Ver cómo (animación)' };
const iaBtn = () => (matchMedia('(display-mode: standalone)').matches || navigator.standalone ? '' : `<p style="text-align:center;margin:-4px 0 12px"><button class="btn sm sec" data-ianim="1">${esc(IA_BTN[lang] || IA_BTN.fr)}</button></p>`);
const REFT = {
  fr: { needNote: 'Expliquez la raison (obligatoire pour « Autre »)', btn: '✋ Refuser ?', t: '✋ Refuser ce travail', why: 'Pourquoi ? (obligatoire)', r: { malade: '🤒 Je suis malade', dispo: '📅 Pas disponible ce jour-là', loin: '🚗 Trop loin / pas de transport', metier: '🛠️ Ce n’est pas mon métier', autre: '✏️ Autre raison' }, choose: '— choisir —', notePh: 'Un mot pour le responsable (facultatif)', send: '✋ Envoyer le refus', done: '✋ Refusé — le responsable envoie quelqu’un d’autre', ok: 'Refus envoyé. Merci de prévenir : le responsable envoie un autre ouvrier.' },
  it: { needNote: 'Spiega il motivo (obbligatorio per «Altro»)', btn: '✋ Rifiutare?', t: '✋ Rifiutare questo lavoro', why: 'Perché? (obbligatorio)', r: { malade: '🤒 Sono malato', dispo: '📅 Non disponibile quel giorno', loin: '🚗 Troppo lontano / senza trasporto', metier: '🛠️ Non è il mio mestiere', autre: '✏️ Altro motivo' }, choose: '— scegliere —', notePh: 'Una parola per il responsabile (facoltativo)', send: '✋ Invia il rifiuto', done: '✋ Rifiutato — il responsabile manda un altro', ok: 'Rifiuto inviato. Grazie di aver avvisato: il responsabile manda un altro operaio.' },
  pt: { needNote: 'Explique o motivo (obrigatório para «Outro»)', btn: '✋ Recusar?', t: '✋ Recusar este trabalho', why: 'Porquê? (obrigatório)', r: { malade: '🤒 Estou doente', dispo: '📅 Não disponível nesse dia', loin: '🚗 Muito longe / sem transporte', metier: '🛠️ Não é a minha profissão', autre: '✏️ Outro motivo' }, choose: '— escolher —', notePh: 'Uma palavra para o responsável (opcional)', send: '✋ Enviar a recusa', done: '✋ Recusado — o responsável envia outra pessoa', ok: 'Recusa enviada. Obrigado por avisar: o responsável envia outro trabalhador.' },
  de: { needNote: 'Grund erklären (Pflicht bei „Anderer Grund“)', btn: '✋ Ablehnen?', t: '✋ Diesen Auftrag ablehnen', why: 'Warum? (Pflicht)', r: { malade: '🤒 Ich bin krank', dispo: '📅 An diesem Tag nicht verfügbar', loin: '🚗 Zu weit / kein Transport', metier: '🛠️ Nicht mein Beruf', autre: '✏️ Anderer Grund' }, choose: '— wählen —', notePh: 'Ein Wort für den Verantwortlichen (optional)', send: '✋ Ablehnung senden', done: '✋ Abgelehnt — der Verantwortliche schickt jemand anderen', ok: 'Ablehnung gesendet. Danke für die Info: der Verantwortliche schickt einen anderen Mitarbeiter.' },
  en: { needNote: 'Explain the reason (required for “Other”)', btn: '✋ Refuse?', t: '✋ Refuse this job', why: 'Why? (required)', r: { malade: '🤒 I am sick', dispo: '📅 Not available that day', loin: '🚗 Too far / no transport', metier: '🛠️ Not my trade', autre: '✏️ Other reason' }, choose: '— choose —', notePh: 'A word for the manager (optional)', send: '✋ Send refusal', done: '✋ Refused — the manager sends someone else', ok: 'Refusal sent. Thanks for letting us know: the manager will send another worker.' },
  es: { needNote: 'Explique el motivo (obligatorio para «Otro»)', btn: '✋ ¿Rechazar?', t: '✋ Rechazar este trabajo', why: '¿Por qué? (obligatorio)', r: { malade: '🤒 Estoy enfermo', dispo: '📅 No disponible ese día', loin: '🚗 Demasiado lejos / sin transporte', metier: '🛠️ No es mi oficio', autre: '✏️ Otro motivo' }, choose: '— elegir —', notePh: 'Una palabra para el responsable (opcional)', send: '✋ Enviar el rechazo', done: '✋ Rechazado — el responsable envía a otra persona', ok: 'Rechazo enviado. Gracias por avisar: el responsable envía a otro trabajador.' },
};
const isRefused = (tid, d) => { const st = stateOf(tid, d); return !!st && st.st === 'refus'; };
// bouton rouge en haut à droite de la carte du travail (pas encore commencé, pas encore refusé)
function refusTop(it) {
  const r = REFT[lang] || REFT.fr;
  if (isRefused(it.tid, it.d) || (form && form.tid === it.tid && form.d === it.d && form.st === 'refus')) return '';
  return `<button class="refus-top" data-act="refus" data-tid="${esc(it.tid)}" data-d="${esc(it.d)}">${esc(r.btn)}</button>`;
}
// formulaire du motif / confirmation (travail pas encore commencé)
function refusUi(it) {
  const r = REFT[lang] || REFT.fr, t = T();
  if (isRefused(it.tid, it.d)) return `<div class="stline refus">${esc(r.done)}</div>`;
  const f = form && form.tid === it.tid && form.d === it.d && form.st === 'refus';
  if (!f) return '';
  return `<form class="act refus-f" data-tid="${esc(it.tid)}" data-d="${esc(it.d)}" data-st="refus"><b>${esc(r.t)}</b>
      <label>${esc(r.why)}</label><select name="why" required><option value="">${esc(r.choose)}</option>${Object.entries(r.r).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}</select>
      <textarea name="note" placeholder="${esc(r.notePh)}"></textarea>
      <div class="btns"><button class="btn warn" type="submit">${esc(r.send)}</button><button class="btn sec" type="button" data-cancel="1">${esc(t.cancel)}</button></div></form>`;
}

const ENGT = {
  fr: { t: 'Ma fiche d’engagement', top: 'Signez votre fiche d’engagement : obligatoire pour être payé.', open: 'Lire et signer', ob: [['Obligation de résultat', 'Je m’engage à exécuter le travail confié dans les règles de l’art, aux jour, heure et lieu convenus, et à le reprendre à mes frais s’il n’est pas conforme.'], ['Dommages', 'Tout dommage causé aux biens ou aux personnes pendant l’intervention est à ma charge et à celle de mon assurance responsabilité civile{a}.'], ['Indépendance', 'Intervention ponctuelle, sans lien de subordination : je déclare moi-même mes revenus et je m’acquitte de mes obligations fiscales et sociales.'], ['Confidentialité', 'Codes, clés et informations des lieux et des occupants restent confidentiels et ne servent qu’à l’intervention.']], rgpd: 'RGPD : {s} utilise mes données (identité, coordonnées, assurance, banque, signature, heures) seulement pour les missions, les paiements et ses obligations légales. Je peux demander à les voir, les corriger ou les effacer.', acc: 'J’ai lu et j’accepte ces obligations', sig: 'Ma signature (avec le doigt)', clr: 'Effacer', send: '✍️ Signer et envoyer', need: 'Cochez « J’ai lu et j’accepte » et signez dans le cadre.', ok: 'Signée ✓ — envoyée à {s}', done: 'Signée le {d}' },
  it: { t: 'La mia scheda d’ingaggio', top: 'Firma la tua scheda d’ingaggio: obbligatoria per essere pagato.', open: 'Leggi e firma', ob: [['Obbligo di risultato', 'Mi impegno a eseguire il lavoro a regola d’arte, nel giorno, ora e luogo concordati, e a rifarlo a mie spese se non è conforme.'], ['Danni', 'Ogni danno causato a cose o persone durante l’intervento è a mio carico e della mia assicurazione di responsabilità civile{a}.'], ['Indipendenza', 'Intervento occasionale, senza vincolo di subordinazione: dichiaro io i miei redditi e adempio ai miei obblighi fiscali e sociali.'], ['Riservatezza', 'Codici, chiavi e informazioni dei luoghi e degli occupanti restano riservati e servono solo per l’intervento.']], rgpd: 'GDPR: {s} usa i miei dati (identità, contatti, assicurazione, banca, firma, ore) solo per i lavori, i pagamenti e i suoi obblighi di legge. Posso chiedere di vederli, correggerli o cancellarli.', acc: 'Ho letto e accetto questi obblighi', sig: 'La mia firma (con il dito)', clr: 'Cancella', send: '✍️ Firma e invia', need: 'Spunta «Ho letto e accetto» e firma nel riquadro.', ok: 'Firmata ✓ — inviata a {s}', done: 'Firmata il {d}' },
  de: { t: 'Mein Verpflichtungsblatt', top: 'Unterschreiben Sie Ihr Verpflichtungsblatt: nötig, um bezahlt zu werden.', open: 'Lesen und unterschreiben', ob: [['Erfolgspflicht', 'Ich verpflichte mich, die Arbeit fachgerecht am vereinbarten Tag, zur vereinbarten Zeit und am vereinbarten Ort auszuführen und sie auf meine Kosten nachzubessern, wenn sie nicht ordnungsgemäß ist.'], ['Schäden', 'Jeder während des Einsatzes verursachte Sach- oder Personenschaden geht zu meinen Lasten und zu Lasten meiner Haftpflichtversicherung{a}.'], ['Unabhängigkeit', 'Einmaliger Einsatz ohne Weisungsgebundenheit: Ich melde meine Einkünfte selbst und erfülle meine steuerlichen und sozialen Pflichten.'], ['Vertraulichkeit', 'Codes, Schlüssel und Informationen über Orte und Bewohner bleiben vertraulich und dienen nur dem Einsatz.']], rgpd: 'DSGVO: {s} nutzt meine Daten (Identität, Kontakt, Versicherung, Bank, Unterschrift, Stunden) nur für die Einsätze, Zahlungen und gesetzlichen Pflichten. Ich kann Einsicht, Berichtigung oder Löschung verlangen.', acc: 'Ich habe diese Pflichten gelesen und akzeptiere sie', sig: 'Meine Unterschrift (mit dem Finger)', clr: 'Löschen', send: '✍️ Unterschreiben und senden', need: 'Haken Sie „gelesen und akzeptiert“ an und unterschreiben Sie im Rahmen.', ok: 'Unterschrieben ✓ — an {s} gesendet', done: 'Unterschrieben am {d}' },
  en: { t: 'My engagement form', top: 'Sign your engagement form: required to be paid.', open: 'Read and sign', ob: [['Obligation of result', 'I undertake to do the job properly, on the agreed day, time and place, and to redo it at my own cost if it is not compliant.'], ['Damage', 'Any damage to property or people during the job is borne by me and my liability insurance{a}.'], ['Independence', 'One-off job, with no employment relationship: I declare my own income and meet my own tax and social obligations.'], ['Confidentiality', 'Codes, keys and information about the places and occupants stay confidential and are used only for the job.']], rgpd: 'GDPR: {s} uses my data (identity, contact, insurance, bank, signature, hours) only for the jobs, payments and its legal obligations. I can ask to see, correct or delete it.', acc: 'I have read and accept these obligations', sig: 'My signature (with your finger)', clr: 'Clear', send: '✍️ Sign and send', need: 'Tick “I have read and accept” and sign in the box.', ok: 'Signed ✓ — sent to {s}', done: 'Signed on {d}' },
  pt: { t: 'A minha ficha de contratação', top: 'Assine a sua ficha de contratação: obrigatória para receber.', open: 'Ler e assinar', ob: [['Obrigação de resultado', 'Comprometo-me a executar o trabalho segundo as regras da arte, no dia, hora e local combinados, e a refazê-lo à minha custa se não estiver conforme.'], ['Danos', 'Qualquer dano causado a bens ou pessoas durante a intervenção fica a meu cargo e do meu seguro de responsabilidade civil{a}.'], ['Independência', 'Intervenção pontual, sem vínculo de subordinação: declaro eu próprio os meus rendimentos e cumpro as minhas obrigações fiscais e sociais.'], ['Confidencialidade', 'Códigos, chaves e informações dos locais e dos ocupantes permanecem confidenciais e servem apenas para a intervenção.']], rgpd: 'RGPD: {s} usa os meus dados (identidade, contactos, seguro, banco, assinatura, horas) apenas para os trabalhos, pagamentos e obrigações legais. Posso pedir para os ver, corrigir ou apagar.', acc: 'Li e aceito estas obrigações', sig: 'A minha assinatura (com o dedo)', clr: 'Apagar', send: '✍️ Assinar e enviar', need: 'Marque «Li e aceito» e assine no quadro.', ok: 'Assinada ✓ — enviada a {s}', done: 'Assinada em {d}' },
  es: { t: 'Mi ficha de contratación', top: 'Firma tu ficha de contratación: obligatoria para cobrar.', open: 'Leer y firmar', ob: [['Obligación de resultado', 'Me comprometo a realizar el trabajo correctamente, en el día, hora y lugar acordados, y a rehacerlo a mi cargo si no es conforme.'], ['Daños', 'Todo daño causado a bienes o personas durante la intervención corre a mi cargo y al de mi seguro de responsabilidad civil{a}.'], ['Independencia', 'Intervención puntual, sin relación de subordinación: declaro yo mismo mis ingresos y cumplo mis obligaciones fiscales y sociales.'], ['Confidencialidad', 'Códigos, llaves e información de los lugares y ocupantes son confidenciales y solo sirven para la intervención.']], rgpd: 'RGPD: {s} usa mis datos (identidad, contacto, seguro, banco, firma, horas) solo para los trabajos, los pagos y sus obligaciones legales. Puedo pedir verlos, corregirlos o borrarlos.', acc: 'He leído y acepto estas obligaciones', sig: 'Mi firma (con el dedo)', clr: 'Borrar', send: '✍️ Firmar y enviar', need: 'Marca «He leído y acepto» y firma en el recuadro.', ok: 'Firmada ✓ — enviada a {s}', done: 'Firmada el {d}' },
};
let sigUrl = '', sigSent = '', assurSent = false;
// 🛡️ assurance RC « à faire » : rappel en haut tant qu'elle n'est pas donnée, et petit formulaire pour l'envoyer
const ASST = {
  fr: { t: '🛡️ N’oubliez pas : votre assurance RC est à faire !', hint: 'Elle est obligatoire pour travailler avec nous. Écrivez la compagnie et le numéro de police dès que vous l’avez.', co: 'Compagnie d’assurance', coPh: 'ex. Foyer, AXA, Allianz…', pol: 'N° de police', send: '🛡️ Envoyer mon assurance', ok: 'Assurance envoyée ✓ — merci !', need: 'Écrivez la compagnie et le n° de police.' },
  it: { t: '🛡️ Non dimenticare: la tua assicurazione RC è da fare!', hint: 'È obbligatoria per lavorare con noi. Scrivi la compagnia e il numero di polizza appena ce l’hai.', co: 'Compagnia di assicurazione', coPh: 'es. Foyer, AXA, Allianz…', pol: 'N° di polizza', send: '🛡️ Invia la mia assicurazione', ok: 'Assicurazione inviata ✓ — grazie!', need: 'Scrivi la compagnia e il n° di polizza.' },
  de: { t: '🛡️ Nicht vergessen: Ihre Haftpflichtversicherung fehlt noch!', hint: 'Sie ist Pflicht, um mit uns zu arbeiten. Schreiben Sie Versicherung und Policennummer, sobald Sie sie haben.', co: 'Versicherung', coPh: 'z. B. Foyer, AXA, Allianz…', pol: 'Policennummer', send: '🛡️ Versicherung senden', ok: 'Versicherung gesendet ✓ — danke!', need: 'Versicherung und Policennummer eingeben.' },
  pt: { t: '🛡️ Não se esqueça: o seu seguro RC está por fazer!', hint: 'É obrigatório para trabalhar connosco. Escreva a seguradora e o número da apólice assim que o tiver.', co: 'Seguradora', coPh: 'ex. Foyer, AXA, Allianz…', pol: 'N.º da apólice', send: '🛡️ Enviar o meu seguro', ok: 'Seguro enviado ✓ — obrigado!', need: 'Escreva a seguradora e o n.º da apólice.' },
  en: { t: '🛡️ Don’t forget: your liability insurance is still to do!', hint: 'It is required to work with us. Write the company and the policy number as soon as you have it.', co: 'Insurance company', coPh: 'e.g. Foyer, AXA, Allianz…', pol: 'Policy number', send: '🛡️ Send my insurance', ok: 'Insurance sent ✓ — thank you!', need: 'Write the company and the policy number.' },
  es: { t: '🛡️ No lo olvide: ¡su seguro de RC está pendiente!', hint: 'Es obligatorio para trabajar con nosotros. Escriba la aseguradora y el número de póliza en cuanto lo tenga.', co: 'Aseguradora', coPh: 'ej. Foyer, AXA, Allianz…', pol: 'N.º de póliza', send: '🛡️ Enviar mi seguro', ok: 'Seguro enviado ✓ — ¡gracias!', need: 'Escriba la aseguradora y el n.º de póliza.' },
};
function assurCard() {
  const a = ASST[lang] || ASST.fr;
  return `<div class="card warnc" id="assurCard"><p style="margin:0 0 4px"><b>${esc(a.t)}</b></p><p class="meta" style="margin:0 0 8px">${esc(a.hint)}</p>
    <form id="assurForm"><label>${esc(a.co)}</label><input type="text" name="co" maxlength="80" placeholder="${esc(a.coPh)}" required>
    <label>${esc(a.pol)}</label><input type="text" name="pol" maxlength="40" autocomplete="off" required>
    <button class="btn block" style="margin-top:10px" type="submit">${esc(a.send)}</button></form></div>`;
}
// ma photo : choisie en touchant le rond de l'avatar, visible chez le responsable
const SETT = {
  fr: { pick: 'Changer ma photo', ok: 'Photo envoyée ✓' },
  it: { pick: 'Cambia la mia foto', ok: 'Foto inviata ✓' },
  de: { pick: 'Mein Foto ändern', ok: 'Foto gesendet ✓' },
  en: { pick: 'Change my photo', ok: 'Photo sent ✓' },
  pt: { pick: 'Mudar a minha foto', ok: 'Foto enviada ✓' },
  es: { pick: 'Cambiar mi foto', ok: 'Foto enviada ✓' },
};
// « Mon profil » (✏️ sur l'avatar) : l'ouvrier tient lui-même à jour sa photo, son nom et ses coordonnées
const CINFO = {
  fr: { t: 'Mon profil', n: (k) => `${k} à compléter`, go: '✏️ Compléter', first: 'Prénom', last: 'Nom', save: 'Enregistrer', ok: 'Enregistré ✓', hint: 'Vos données vont chez votre responsable. Changez-les ici dès qu’elles changent.', close: 'Fermer' },
  it: { t: 'Il mio profilo', n: (k) => `${k} da completare`, go: '✏️ Completa', first: 'Nome', last: 'Cognome', save: 'Salva', ok: 'Salvato ✓', hint: 'I tuoi dati arrivano al tuo responsabile. Cambiali qui appena cambiano.', close: 'Chiudi' },
  de: { t: 'Mein Profil', n: (k) => `${k} zu ergänzen`, go: '✏️ Ergänzen', first: 'Vorname', last: 'Nachname', save: 'Speichern', ok: 'Gespeichert ✓', hint: 'Ihre Daten gehen an Ihren Verantwortlichen. Ändern Sie sie hier, sobald sie sich ändern.', close: 'Schließen' },
  en: { t: 'My profile', n: (k) => `${k} to fill in`, go: '✏️ Fill in', first: 'First name', last: 'Last name', save: 'Save', ok: 'Saved ✓', hint: 'Your details go to your manager. Change them here as soon as they change.', close: 'Close' },
  pt: { t: 'O meu perfil', n: (k) => `${k} por completar`, go: '✏️ Completar', first: 'Nome próprio', last: 'Apelido', save: 'Guardar', ok: 'Guardado ✓', hint: 'Os seus dados vão para o seu responsável. Altere-os aqui assim que mudarem.', close: 'Fechar' },
  es: { t: 'Mi perfil', n: (k) => `${k} por completar`, go: '✏️ Completar', first: 'Nombre', last: 'Apellidos', save: 'Guardar', ok: 'Guardado ✓', hint: 'Tus datos llegan a tu responsable. Cámbialos aquí en cuanto cambien.', close: 'Cerrar' },
};
let profOpen = false;
const PF = ['prenom', 'nom', 'tel', 'mail', 'adresse', 'ville', 'ccss'];
// n° CCSS (Luxembourg) : 13 chiffres ; l'ouvrier le complète seulement s'il manque
const CCSS = { fr: ['N° CCSS (matricule de sécurité sociale)', '13 chiffres', 'Le n° CCSS doit avoir 13 chiffres.'], it: ['N° CCSS (matricola di sicurezza sociale)', '13 cifre', 'Il n° CCSS deve avere 13 cifre.'], de: ['CCSS-Nr. (Sozialversicherungsnummer)', '13 Ziffern', 'Die CCSS-Nr. hat 13 Ziffern.'], en: ['CCSS no. (social security number)', '13 digits', 'The CCSS number must have 13 digits.'], pt: ['N.º CCSS (número de segurança social)', '13 algarismos', 'O n.º CCSS deve ter 13 algarismos.'], es: ['N.º CCSS (número de seguridad social)', '13 cifras', 'El n.º CCSS debe tener 13 cifras.'] };
let phMine = null;
// photo → carré 256 px (centre), JPEG léger
async function photoSquare(file) {
  const bmp = await createImageBitmap(file), m = Math.min(bmp.width, bmp.height), c = document.createElement('canvas');
  c.width = c.height = 256; c.getContext('2d').drawImage(bmp, (bmp.width - m) / 2, (bmp.height - m) / 2, m, m, 0, 0, 256, 256);
  return c.toDataURL('image/jpeg', 0.82);
}
const ICONS = { nettoyage: '🧹', reparation: '🔧', gros: '🚚', autre: '📌', entretien: '🔧' };
let data = null, lang = 'fr', loadErr = '', form = null, flash = '';
nbienInit({ api: API, app: 'eq', lang: () => lang });
wxRadioInit({ app: 'eq', lang: () => lang, home: () => (data && data.me && data.me.ville) || 'Luxembourg', radio: () => (data && data.radio) || null });
const app = document.getElementById('app');
const T = () => L[lang] || L.fr;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const isoDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = isoDay(new Date());
const fmt = (s) => (s ? new Date(s.slice(0, 10) + 'T12:00:00').toLocaleDateString(T().loc, { day: 'numeric', month: 'long' }) : '');
const fmtDay = (s) => new Date(s + 'T12:00:00').toLocaleDateString(T().loc, { weekday: 'long', day: 'numeric', month: 'long' });
const pick = (d) => { const nav = (navigator.language || 'fr').slice(0, 2); return (d && L[d.lang] && d.lang) || (L[nav] ? nav : 'fr'); };
try { const s = localStorage.getItem('eqLang'); if (s && L[s]) lang = s; } catch {}

// ── File d'attente : les envois partent dès qu'il y a du réseau (et sont regroupés) ──
const QK = () => 'eqQueue:' + id, LK = () => 'eqLocal:' + id, IK = () => 'eqInfo:' + id;
const getJ = (k) => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; } };
const wkMap = () => { const m = getJ('eqWeeks'); return m && !Array.isArray(m) ? m : {}; };
const setJ = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* stockage plein */ } };
async function flush() {
  let q = getJ(QK());
  if (!q.length || !data || !data.signalKey) return;
  while (q.length) {
    // paquets de ~3 Mo maximum (photos comprises)
    const batch = [];
    let size = 0;
    for (const it of q) { const n = JSON.stringify(it).length; if (batch.length && size + n > 3e6) break; batch.push(it); size += n; }
    try {
      const body = await sealForOwner(data.signalKey, { espace: id, t: new Date().toISOString(), type: 'equipe', items: batch });
      const r = await fetch(`${API}/api/esp/${id}/signal`, { method: 'POST', body });
      if (!r.ok) break;
    } catch { break; }
    q = q.slice(batch.length);
    setJ(QK(), q);
  }
  render();
}
function queue(item, later) {
  const q = getJ(QK());
  q.push(item);
  setJ(QK(), q);
  if (item.k === 'task') { const loc = getJ(LK()).filter((x) => x.at > new Date(Date.now() - 30 * 864e5).toISOString()); loc.push({ tid: item.tid, d: item.d, st: item.st, note: item.note, at: item.at, h: item.h || '' }); setJ(LK(), loc); }
  return later ? Promise.resolve() : flush();
}
// Dernier état connu d'une intervention un jour donné (serveur + ce téléphone)
function stateOf(tid, d) {
  const t = data.tasks[tid] || {};
  const all = [...(t.journal || []).filter((x) => x.d === d), ...getJ(LK()).filter((x) => x.tid === tid && x.d === d)];
  all.sort((a, b) => (a.at || '').localeCompare(b.at || ''));
  return all[all.length - 1] || null;
}

async function compress(file) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 1400 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(bmp, 0, 0, c.width, c.height);
  const b = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.72));
  const u = new Uint8Array(await b.arrayBuffer());
  let s = ''; for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode(...u.subarray(i, i + 32768));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// photos du problème jointes par le responsable (chiffrées, lues avec la clé de cette app)
const pbUrls = new Map();
const pbHtml = (x) => ((x.pb || []).length ? `<div class="pbph"><b>${esc(T().pbPh)}</b><div>${x.pb.map((p) => `<a href="#" data-pb="${esc(p)}"><img data-pb-img="${esc(p)}" alt=""></a>`).join('')}</div></div>` : '');
async function pbUrl(docId) {
  if (!pbUrls.has(docId)) {
    const r = await fetch(`${API}/api/esp/${id}/f/${docId}`, { cache: 'no-store' });
    if (!r.ok) throw new Error(r.status);
    pbUrls.set(docId, URL.createObjectURL(new Blob([await openBytes(key, await r.arrayBuffer())], { type: 'image/jpeg' })));
  }
  return pbUrls.get(docId);
}
const hydratePb = () => document.querySelectorAll('img[data-pb-img]').forEach((img) => { pbUrl(img.dataset.pbImg).then((u) => { img.src = u; }).catch(() => {}); });
document.addEventListener('click', (e) => { const a = e.target.closest && e.target.closest('[data-pb]'); if (!a) return; e.preventDefault(); pbUrl(a.dataset.pb).then((u) => window.open(u, '_blank')).catch(() => {}); });
// heure prévue (de → à) et urgence, mises par le responsable
const whenTag = (x) => `${x.urgent ? ` <span class="tag urg">🔴 ${esc(T().urg)}</span>` : ''}${x.heure ? ` <span class="tag hr">🕒 ${esc(x.heure)}${x.heureFin ? '–' + esc(x.heureFin) : ''}</span>` : ''}`;
const byHour = (a, b) => (a.d + ((data.tasks[a.tid] || {}).heure || '99')).localeCompare(b.d + ((data.tasks[b.tid] || {}).heure || '99'));
function infoHtml(x, t) {
  const tel = x.contact && x.contact.tel ? x.contact.tel.replace(/[^\d+]/g, '') : '';
  return `${x.ger ? `<div class="ger-box"><b>🏢 ${esc(x.ger.org)} · #${esc(x.ger.ref)}</b>${x.ger.heure ? ` · 🕒 ${esc(x.ger.heure)}` : ''}${x.ger.acces ? `<div>🔐 ${x.ger.acces.split(' · ').map(esc).join('<br>')}</div>` : ''}${x.ger.dispo ? `<div>📅 ${esc(x.ger.dispo)}</div>` : ''}</div>` : ''}
    ${x.note ? `<div class="cons"><b>${esc(t.consignes)} :</b> ${esc(x.note)}</div>` : ''}${pbHtml(x)}
    ${x.contact ? `<div class="meta">👤 ${esc(t.contact)} : ${esc(x.contact.nom)}${tel ? ` · <a href="tel:${esc(tel)}">📞 ${esc(t.call)}</a>` : ''}</div>` : ''}`;
}
// ligne courte (planning du jour) : le détail et les boutons sont dans « Mon horaire »
function taskLine(it) {
  const x = data.tasks[it.tid];
  if (!x) return '';
  const done = stopTimes(it.tid, it.d).end;
  return `<div class="tline${x.urgent && !done ? ' urgent' : ''}">${!done && !stateOf(it.tid, it.d) ? refusTop(it) : ''}${done ? '✅' : ICONS[x.type] || '📌'} <b>${esc(x.titre)}</b>${whenTag(x)}<div class="meta"><button class="linkb" data-place="${esc(x.adresse)}">📍 ${esc(x.adresse)}</button></div></div>`;
}
// horaire d'un jour précis : le planning daté (fait par le responsable) remplace l'horaire habituel ce jour-là
function hOnDate(d, iso) {
  const j = (new Date(iso + 'T12:00:00').getDay() + 6) % 7;
  const hs = d.jours && d.jours[iso] ? d.jours[iso].map((h) => ({ ...h, j })) : (d.horaires || []).filter((h) => h.j === j);
  return hs.slice().sort((a, b) => (a.de || '').localeCompare(b.de || ''));
}
// « Combien ? » quand le travail est fini (facultatif) : 12 vitres, 3 robinets, 40 m²… → statistiques du bureau
const QT = {
  fr: ['Combien ? (facultatif)', 'ex. vitres, robinets, m²'], it: ['Quanti? (facoltativo)', 'es. vetri, rubinetti, m²'], de: ['Wie viele? (optional)', 'z. B. Fenster, Wasserhähne, m²'],
  pt: ['Quantos? (opcional)', 'ex. vidros, torneiras, m²'], en: ['How many? (optional)', 'e.g. windows, taps, m²'], es: ['¿Cuántos? (opcional)', 'ej. cristales, grifos, m²'],
};
const qtyHtml = () => { const q = QT[lang] || QT.fr; return `<div class="qty"><label>🔢 ${esc(q[0])}</label><div class="qty-r"><input type="number" name="qte" min="0" step="any" inputmode="decimal" placeholder="12"><input name="qu" maxlength="40" placeholder="${esc(q[1])}"></div></div>`; };
const qtyOf = (f) => { const n = parseFloat(String(f.qte ? f.qte.value : '').replace(',', '.')); return n > 0 ? { qte: Math.round(n * 100) / 100, qu: String(f.qu ? f.qu.value : '').trim().slice(0, 40) } : {}; };
function taskCard(it, withBtns) {
  const t = T(), x = data.tasks[it.tid];
  if (!x) return '';
  const st = stateOf(it.tid, it.d);
  const tel = x.contact && x.contact.tel ? x.contact.tel.replace(/[^\d+]/g, '') : '';
  const done = st && st.st === 'fait';
  const f = form && form.tid === it.tid && form.d === it.d ? form : null;
  const notStarted = !st || st.st === 'refus';
  const btns = withBtns && !done && !f && !(st && st.st === 'refus') ? `<div class="btns">${!st || st.st !== 'encours' ? `<button class="btn sec" data-act="encours" data-tid="${esc(it.tid)}" data-d="${esc(it.d)}">${esc(t.start)}</button>` : ''}
      <button class="btn ok" data-act="fait" data-tid="${esc(it.tid)}" data-d="${esc(it.d)}">${esc(t.done)}</button>
      <button class="btn warn" data-act="incomplet" data-tid="${esc(it.tid)}" data-d="${esc(it.d)}">${esc(t.inc)}</button></div>` : '';
  const fh = f && f.st !== 'refus' ? `<form class="act" data-tid="${esc(it.tid)}" data-d="${esc(it.d)}" data-st="${f.st}"><b>${esc(t.st[f.st])}</b>
      ${f.st === 'fait' ? qtyHtml() : ''}<label>${esc(f.st === 'incomplet' ? t.why : t.note)}</label><textarea name="note" placeholder="${esc(f.st === 'incomplet' ? t.whyPh : t.notePh)}" ${f.st === 'incomplet' ? 'required' : ''}></textarea>
      <div class="btns"><button class="btn" type="submit">${esc(t.send)}</button><button class="btn sec" type="button" data-cancel="1">${esc(t.cancel)}</button></div></form>` : '';
  return `<div class="task ${done ? 'done' : ''}${x.urgent && !done ? ' urgent' : ''}">${notStarted && !done ? refusTop(it) : ''}
    <div class="tt">${ICONS[x.type] || '📌'} <b>${esc(x.titre)}</b>${whenTag(x)}${it.late ? ` <span class="tag bad">${esc(t.late)}</span>` : ''}</div>
    <div class="meta"><button class="linkb" data-place="${esc(x.adresse)}">📍 ${esc(x.adresse)}</button> · ${esc(x.lieu || t.commons)}${x.recur ? ' · 🔁 ' + esc(x.recur) : ''}</div>
    ${infoHtml(x, t)}
    ${st && st.st !== 'refus' ? `<div class="stline ${st.st}">${esc(t.st[st.st])} · ${esc(fmt(st.at))} ${esc(t.at)} ${esc(st.h || (st.at || '').slice(11, 16))}${st.note ? ' — ' + esc(st.note) : ''}</div>` : ''}
    ${btns}${fh}${notStarted && !done ? refusUi(it) : ''}${withBtns && !(st && st.st === 'refus') ? phBlock(it, x) : ''}</div>`;
}
// Arrivée / départ d'une intervention (journal du serveur + ce téléphone) ; h = heure écrite par la personne
const hOfE = (e) => (e ? e.h || (e.at || '').slice(11, 16) : '');
function stopTimes(tid, d) {
  const t = data.tasks[tid] || {};
  const all = [...(t.journal || []).filter((x) => x.d === d), ...getJ(LK()).filter((x) => x.tid === tid && x.d === d)].sort((a, b) => (a.at || '').localeCompare(b.at || ''));
  const a = all.find((x) => x.st === 'encours'), z = [...all].reverse().find((x) => x.st === 'fait' || x.st === 'incomplet');
  return { arr: hOfE(a), dep: hOfE(z), end: z || null };
}
const nowHM = () => new Date().toTimeString().slice(0, 5);
function stopCard(it, cur) {
  const t = T(), x = data.tasks[it.tid];
  if (!x) return '';
  const tm = stopTimes(it.tid, it.d), f = form && form.tid === it.tid && form.d === it.d ? form : null;
  const refused = isRefused(it.tid, it.d), ended = !!tm.end || refused;
  let act = '';
  if (refused) act = refusUi(it);
  else if (!tm.arr && !ended) act = `${f && f.st === 'refus' ? '' : `<form class="pres" data-stop="encours" data-tid="${esc(it.tid)}" data-d="${esc(it.d)}"><input type="time" name="h" value="${nowHM()}" required><button class="btn sm" type="submit">${esc(t.s.arrBtn)}</button></form>`}${refusUi(it)}`;
  else if (!ended) act = `${phBlock(it, x)}${f ? `<form class="act" data-tid="${esc(it.tid)}" data-d="${esc(it.d)}" data-st="${f.st}"><b>${esc(t.st[f.st])}</b>
      <label>${esc(t.why)}</label><textarea name="note" placeholder="${esc(t.whyPh)}" required></textarea>
      <div class="btns"><button class="btn" type="submit">${esc(t.send)}</button><button class="btn sec" type="button" data-cancel="1">${esc(t.cancel)}</button></div></form>`
      : `<form class="pres pres-fin" data-stop="fait" data-tid="${esc(it.tid)}" data-d="${esc(it.d)}">${qtyHtml()}<input type="time" name="h" value="${nowHM()}" required><button class="btn sm ok" type="submit">${esc(t.s.depBtn)}</button></form>
      <button class="btn sm warn" style="margin-top:6px" data-act="incomplet" data-tid="${esc(it.tid)}" data-d="${esc(it.d)}">${esc(t.inc)}</button>`}`;
  return `<div class="stop${cur ? ' cur' : ''}${ended ? ' done' : ''}${x.urgent && !ended ? ' urgent' : ''}">${!tm.arr && !ended ? refusTop(it) : ''}
    <div class="tt">${cur ? '<span class="live" aria-hidden="true"></span>' : ''}${ICONS[x.type] || '📌'} <b>${esc(x.titre)}</b>${whenTag(x)}${cur ? ` <span class="tag now">${esc(tm.arr ? t.s.now : t.s.next)}</span>` : ''}</div>
    <div class="meta"><button class="linkb" data-place="${esc(x.adresse)}">📍 ${esc(x.adresse)}</button> · ${esc(x.lieu || t.commons)}</div>
    ${ended ? '' : infoHtml(x, T())}<div class="stline">🟢 ${esc(t.p.arr)} <b>${esc(tm.arr || '—')}</b> · 🔴 ${esc(t.p.dep)} <b>${esc(tm.dep || '—')}</b>${tm.end ? ` · ${esc(t.st[tm.end.st])}` : ''}</div>
    ${act}</div>`;
}
// Photos avant / après une intervention : 6 + 6, avec l'appareil photo ou la galerie
const PK = () => 'eqPh:' + id;
const phCount = (tid, phase) => { let n = 0; try { n = (JSON.parse(localStorage.getItem(PK()) || '{}')[tid] || {})[phase] || 0; } catch { /* stockage indisponible */ } return Math.max(n, ((data.tasks[tid] || {}).ph || {})[phase] || 0); };
function phBlock(it, x) {
  const t = T(), xx = t.x;
  return `<div class="phb"><b>📷 ${esc(xx.phT)}</b><div class="meta">${esc(xx.phHint)}</div><div class="phrow">${['av', 'ap'].map((ph) => {
    const n = phCount(it.tid, ph), full = n >= 6;
    return `<div class="phcol"><div class="phh">${esc(xx[ph])} <span class="meta">${n} / 6</span></div>${full ? `<div class="meta">${esc(xx.full)}</div>` : `<div class="btns"><label class="btn sm">${esc(xx.cam)}<input type="file" accept="image/*" capture="environment" hidden data-ph="${ph}" data-tid="${esc(it.tid)}" data-d="${esc(it.d)}"></label><label class="btn sm sec">${esc(xx.gal)}<input type="file" accept="image/*" multiple hidden data-ph="${ph}" data-tid="${esc(it.tid)}" data-d="${esc(it.d)}"></label></div>`}</div>`;
  }).join('')}</div></div>`;
}
// Pointage : ce que la personne a envoyé (ce téléphone) + ce que le responsable a reçu
const PRK = () => 'eqPres:' + id;
let pbPhotos = [], pbNote = '';
function presOf(dd) {
  let loc = {};
  try { loc = JSON.parse(localStorage.getItem(PRK()) || '{}')[dd] || {}; } catch { /* stockage indisponible */ }
  return { ...((data.pres || {})[dd] || {}), ...loc };
}
// Annonces (3 emplacements payants : haut à la place de la carte, milieu, bas au-dessus de la barre crypto)
let pubTurn = 0;
try { pubTurn = (+localStorage.getItem('eqPubTurn') || 0) + 1; localStorage.setItem('eqPubTurn', String(pubTurn)); } catch { /* stockage indisponible */ }
// annonce repliée / rouverte d'un toucher sur son titre (mémorisé sur ce téléphone)
const pubShut = new Set((() => { try { return JSON.parse(localStorage.getItem('eqPubShut') || '[]'); } catch { return []; } })());
const pickPub = (list) => (list.length ? list[pubTurn % list.length] : null);
function adBox(x, t) {
  const v = x.video ? videoEmbed(x.video) : null;
  return `<details class="card pub-box mk mk-pub mk-on" data-pid="${esc(x.id)}"${pubShut.has(x.id) ? '' : ' open'}><summary><div class="meta"><b class="pub-lbl">📣 ${esc(t.ad.lbl)}</b> · ${esc(t.ad.cats[x.cat] || t.ad.cats.autre)}</div><b style="display:block;font-size:18px">${esc(x.nom)}</b></summary>${x.texte ? `<div>${esc(x.texte)}</div>` : ''}
    ${v ? `<div class="vid${v.tall ? ' tall' : ''}${v.audio ? ' audio' : ''}"${v.audio ? ` style="height:${v.audio}px"` : ''} data-vsrc="${esc(v.src)}"></div>` : ''}<div class="meta" style="margin-top:6px">📍 ${esc(x.adresse)}</div>
    <div class="btns"><button class="btn sm" data-place="${esc(x.adresse)}" data-pev="map">${esc(t.ad.see)}</button>${x.tel ? `<a class="btn sm sec" href="tel:${esc(x.tel.replace(/[^\d+]/g, ''))}" data-pev="call">${esc(t.ad.call)}</a>` : ''}${x.web ? `<a class="btn sm sec" href="${esc(x.web)}" target="_blank" rel="noopener" data-pev="web">${esc(t.ad.web)}</a>` : ''}${x.video && !v ? `<a class="btn sm sec" href="${esc(x.video)}" target="_blank" rel="noopener" data-pev="video">▶ Video</a>` : ''}</div></details>`;
}
// Lieux de travail (adresses du planning et de l'horaire) ; la carte du lieu choisi s'affiche sous « Bonjour »
let place = '';
// itinéraire : Google Maps, Waze ou Plans (iPhone) — le choix est gardé sur ce téléphone
const NAVT = { fr: ['🧭 Itinéraire avec :', 'Plans'], it: ['🧭 Percorso con:', 'Mappe'], de: ['🧭 Route mit:', 'Karten'], en: ['🧭 Directions with:', 'Apple Maps'], pt: ['🧭 Itinerário com:', 'Mapas'], es: ['🧭 Ruta con:', 'Mapas'] };
const NAV_URL = { g: (q) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`, w: (q) => `https://waze.com/ul?q=${encodeURIComponent(q)}&navigate=yes`, a: (q) => `https://maps.apple.com/?daddr=${encodeURIComponent(q)}&dirflg=d` };
const navPref = () => { try { return localStorage.getItem('eqNav') || 'g'; } catch { return 'g'; } };
function navBtns(q) {
  const n = NAVT[lang] || NAVT.fr, me = navPref();
  const b = (k, l) => `<a class="btn sm ${k === me ? '' : 'sec'}" style="flex:1 1 0;justify-content:center" href="${esc(NAV_URL[k](q))}" target="_blank" rel="noopener" data-nav="${k}">${l}</a>`;
  return `<p class="meta" style="margin:10px 0 6px"><b>${esc(n[0])}</b></p><div style="display:flex;gap:6px;flex-wrap:wrap">${b('g', 'Google Maps')}${b('w', 'Waze')}${b('a', '🍎 ' + esc(n[1]))}</div>`;
}
document.addEventListener('click', (e) => { const a = e.target.closest && e.target.closest('a[data-nav]'); if (a) { try { localStorage.setItem('eqNav', a.dataset.nav); } catch { /* stockage indisponible */ } } }, true);
const mapQ = (a) => (/luxemb|lëtzebuerg|deutschland|germany|france|belgi|portugal|espa|ital/i.test(a) ? a : a + ', Luxembourg');
function placesOf(d) {
  const seen = new Set(), outp = [];
  const add = (a) => { const k = (a || '').trim(); if (k && k !== 'Sans immeuble' && !seen.has(k.toLowerCase())) { seen.add(k.toLowerCase()); outp.push(k); } };
  for (const x of d.items.filter((z) => z.d >= today || z.late)) add((d.tasks[x.tid] || {}).adresse);
  for (const h of d.horaires || []) add(h.lieu);
  for (const hs of Object.values(d.jours || {})) for (const h of hs) add(h.lieu);
  for (const x of d.pubs || []) add(x.adresse);
  return outp;
}

// Notifications : abonnement de ce téléphone (avec la langue et, pour les locataires, le fil de la maison)
let pushSt = '', pushJust = false;
const pushPost = (b) => fetch(`${API}/api/esp/${id}/push`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...b, app: 'eq', lang, boards: [] }) }).then((r) => { if (!r.ok) throw new Error(r.status); });
async function pushInit() {
  pushSt = await pushStatus('/equipe');
  if (pushSt === 'on') pushRefresh('/equipe', pushPost);
  setBadge(0, '/equipe');
  render();
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && data) setBadge(0, '/equipe'); });
function engCard(d) {
  const e = ENGT[lang] || ENGT.fr, g = d.eng, s = d.societe.nom || '';
  const a = g.assur ? ` (${g.assur}${g.police ? ', n° ' + g.police : ''})` : '';
  const signed = g.signed || sigSent;
  const when = signed ? new Date(sigSent || g.signAt || Date.now()).toLocaleString(T().loc, { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
  return `<div class="card" id="engCard"><details class="more"${signed ? '' : ' open'}><summary>✍️ ${esc(e.t)}${signed ? ` <span class="ok">✓</span>` : ''}</summary>
    ${e.ob.map(([k, x]) => `<p style="margin:8px 0 0"><b>${esc(k)} :</b> ${esc(x.replace('{a}', a))}</p>`).join('')}
    <p class="meta" style="margin:8px 0 0">${esc(e.rgpd.replace('{s}', s))}</p>
    ${signed ? `<p class="ok" style="margin:10px 0 0"><b>${esc(e.done.replace('{d}', when))}</b></p>` : `<form id="engForm" style="margin-top:10px">
      <label style="display:flex;gap:8px;align-items:center;font-weight:600"><input type="checkbox" name="acc" style="width:22px;height:22px"> ${esc(e.acc)}</label>
      <p class="meta" style="margin:10px 0 4px">${esc(e.sig)}</p>
      <canvas class="sig-pad" width="600" height="200" style="display:block;width:100%;aspect-ratio:3/1;background:#fff;border:1.5px dashed #9aa5a0;border-radius:12px;touch-action:none"></canvas>
      <div style="display:flex;gap:8px;margin-top:8px"><button type="button" class="btn sec sm" data-sig-clear="1">${esc(e.clr)}</button><button class="btn grow" type="submit">${esc(e.send)}</button></div></form>`}
  </details></div>`;
}
// signature avec le doigt : on garde le dessin si l'écran se redessine
let sigD = null;
app.addEventListener('pointerdown', (ev) => {
  const c = ev.target.closest && ev.target.closest('canvas.sig-pad'); if (!c) return;
  ev.preventDefault(); c.setPointerCapture(ev.pointerId);
  const r = c.getBoundingClientRect(), x = c.getContext('2d');
  const pt = (q) => [(q.clientX - r.left) * (c.width / r.width), (q.clientY - r.top) * (c.height / r.height)];
  x.lineWidth = 3; x.lineCap = 'round'; x.lineJoin = 'round'; x.strokeStyle = '#0b1f4d';
  const [a, b] = pt(ev); x.beginPath(); x.moveTo(a, b); x.lineTo(a + 0.1, b + 0.1); x.stroke();
  sigD = { c, x, pt };
});
app.addEventListener('pointermove', (ev) => { if (!sigD) return; const [a, b] = sigD.pt(ev); sigD.x.lineTo(a, b); sigD.x.stroke(); });
const sigUp = () => { if (!sigD) return; sigUrl = sigD.c.toDataURL('image/png'); sigD = null; };
app.addEventListener('pointerup', sigUp); app.addEventListener('pointercancel', sigUp);
function sigRestore() {
  const c = app.querySelector('canvas.sig-pad'); if (!c || !sigUrl) return;
  const im = new Image(); im.onload = () => c.getContext('2d').drawImage(im, 0, 0); im.src = sigUrl;
}
function notifCard(t) {
  if (!pushSt || pushSt === 'unsupported' || (pushSt === 'on' && !pushJust)) return '';
  const n = t.nt;
  return `<div class="card notif${pushSt !== 'on' ? ' notif-off' : ''}"><h2>${esc(n.t)}</h2><p class="meta" style="margin:0 0 8px">${esc(n.hint)}</p>${pushSt === 'on' ? `<p class="ok" style="margin:0"><b>${esc(n.ok)}</b></p>` : pushSt === 'install' ? `<p class="meta" style="margin:0">📱 ${esc(n.install)}</p>` : pushSt === 'denied' ? `<p class="meta" style="margin:0">⚠️ ${esc(n.denied)}</p>` : `<button class="btn block" data-push-on="1">${esc(n.on)}</button>`}</div>`;
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
  const top = (name, logo) => `<div class="top"><span class="brandx"><img class="top-logo" src="${esc(logo || '/ares/icons/lux-192.png')}" alt="" width="76" height="32"><b>${esc(name)}</b></span>${langs}</div>`;
  if (!data) {
    app.innerHTML = `${top('ARES INVEST S.A.')}
      <h1 style="text-align:center;margin-top:18px">👷 ${esc(t.app)}</h1><p class="sub" style="text-align:center">${esc(t.welcome)}</p>
      ${loadErr ? `<div class="card warnc"><p style="margin:0">${esc(loadErr)}</p></div>` : ''}
      <div class="card"><form id="codeForm"><label>${esc(t.code)}</label>
        <input type="text" name="code" autocomplete="one-time-code" autocapitalize="characters" spellcheck="false" placeholder="${esc(t.codePh)}" style="font-size:22px;letter-spacing:.08em;text-align:center" required>
        <button class="btn block" style="margin-top:12px" type="submit">${esc(t.enter)}</button></form>
        <p class="meta" style="text-align:center;margin:10px 0 0">${esc(t.noCode)}</p></div>
      <p class="meta" style="text-align:center">${esc(t.install)}</p>${iaBtn()}`;
    return;
  }
  const d = data, out = [];
  document.title = `${t.app} — ${d.societe.nom}`;
  if (devEd && !d.devis) devEd = null;
  if (devEd) {
    // l'éditeur du devis occupe l'écran ; il n'est redessiné que si sa forme change (le texte tapé reste)
    if (!devRedraw && document.getElementById('devEd')) return;
    devRedraw = false;
    app.innerHTML = top(d.societe.nom, d.societe.logo) + devEditor();
    sigRestore(); hydrateDv();
    return;
  }
  // l'icône (selon le métier) est choisie par le responsable ; ✏️ sur l'avatar : « Mon profil » (photo, nom, coordonnées)
  const myIc = d.icon || '👷', myPh = phMine !== null ? phMine : d.photo || '', st = SETT[lang] || SETT.fr, ci = CINFO[lang] || CINFO.fr;
  const sent = (() => { const x = getJ(IK()); return x && !Array.isArray(x) ? x : {}; })(); // déjà envoyé : visible tout de suite, avant la synchro du responsable
  { const dv = (f) => (f === 'prenom' || f === 'nom' ? d[f] : d.me[f]) || ''; let gone = false; for (const f of Object.keys(sent)) if (sent[f] === dv(f)) { delete sent[f]; gone = true; } if (gone) setJ(IK(), sent); } // reçu par le responsable
  const me = (f) => sent[f] || (f === 'prenom' || f === 'nom' ? d[f] : d.me[f]) || '';
  const miss = PF.filter((f) => !me(f)).length;
  out.push(`${top(d.societe.nom, d.societe.logo)}<h1 style="display:flex;align-items:center;gap:12px"><button class="av-wrap" data-prof="1" aria-label="${esc(ci.t)}"><span class="av-btn">${myPh ? `<img src="${esc(myPh)}" alt="">` : esc(myIc)}</span><span class="av-pen" aria-hidden="true">✏️</span></button><span>${esc(t.hello)} ${esc(me('prenom') || me('nom'))} 👋</span></h1><p class="sub">${esc([d.metier, d.societe.nom].filter(Boolean).join(' · '))}</p>`);
  if (profOpen) {
    const cc = CCSS[lang] || CCSS.fr;
    const L = { prenom: [ci.first, 'text', 'given-name'], nom: [ci.last, 'text', 'family-name'], tel: [t.tel, 'tel', 'tel'], mail: [t.mail, 'email', 'email'], adresse: [t.adr, 'text', 'street-address'], ville: [t.ville, 'text', 'address-level2'], ccss: [cc[0], 'text', 'off'] };
    out.push(`<div class="card" id="profCard"><h2 style="margin:0 0 10px">✏️ ${esc(ci.t)}</h2>
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:8px"><span class="av-btn" style="width:72px;height:72px;font-size:32px">${myPh ? `<img src="${esc(myPh)}" alt="">` : esc(myIc)}</span><label class="btn sec sm" style="cursor:pointer">📷 ${esc(st.pick)}<input type="file" accept="image/*" data-photo-pick="1" hidden></label></div>
      <form id="infoForm">${PF.map((f) => f === 'ccss' && me(f) ? `<label>${esc(L[f][0])}</label><div class="row"><b>${esc(me(f))}</b></div>` : `<label>${esc(L[f][0])}${me(f) ? '' : ' <span class="miss">•</span>'}</label><input name="${f}" type="${L[f][1]}" autocomplete="${L[f][2]}" value="${esc(me(f))}"${f === 'nom' ? ' required' : ''}${f === 'ccss' ? ` inputmode="numeric" placeholder="${esc(cc[1])}"` : ''}${me(f) ? '' : ' class="miss-in"'}>`).join('')}
      <button class="btn block" style="margin-top:12px" type="submit">${esc(ci.save)}</button></form>
      <p class="meta" style="margin:8px 0 0">${esc(ci.hint)}</p><button class="btn sec sm" style="margin-top:8px" data-prof="1">${esc(ci.close)}</button></div>`);
  } else if (miss) out.push(`<div class="card warnc" id="profNag"><p style="margin:0 0 8px"><b>👤 ${esc(t.info)} · ${esc(ci.n(miss))}</b></p><button class="btn sm" data-prof="1">${esc(ci.go)}</button></div>`);
  const pls = placesOf(d);
  if (place && !pls.includes(place)) place = '';
  const pubs = (d.pubs || []).filter((x) => !x.fin || x.fin >= today);
  const slot = (k) => pickPub(pubs.filter((x) => (x.slot || 'milieu') === k));
  if (place) out.push(`<div class="card"><p style="margin:0 0 8px"><b>🗺️ ${esc(t.ad.mapT)}</b> · <span class="meta">📍 ${esc(place)}</span></p><div id="mapBox" class="map" data-q="${esc(mapQ(place))}"></div>${navBtns(mapQ(place))}${slot('haut') ? `<button class="btn sec block" style="margin-top:8px" data-pubback="1">${esc(t.ad.back)}</button>` : ''}</div>`);
  else { const top = slot('haut'); if (top) out.push(adBox(top, t)); }
  if (pushSt && pushSt !== 'on') out.push(notifCard(t)); // notifications coupées : rappel en haut (sous la carte)
  const eg = d.eng && !d.eng.signed && !sigSent ? ENGT[lang] || ENGT.fr : null;
  if (eg) out.push(`<div class="card warnc"><p style="margin:0 0 8px"><b>✍️ ${esc(eg.top)}</b></p><button class="btn sm" data-eng-open="1">${esc(eg.open)} ↓</button></div>`);
  if (d.eng && d.eng.assurTodo && !assurSent) out.push(assurCard());
  out.push(nbienBanner()); // 🆕 Nouveau bien (bleu mer)
  // météo de la semaine + radio (comme dans l'app des locataires)
  out.push(wxRadioCard());
  const q = getJ(QK());
  if (q.length) out.push(`<div class="card warnc"><p style="margin:0 0 8px">${esc(t.pending(q.length))}</p><button class="btn sec sm" data-retry="1">${esc(t.retry)}</button></div>`);
  if (flash) out.push(`<div class="card okc"><p style="margin:0">${esc(flash)}</p></div>`);
  const absNow = (d.absences || []).find((a) => a.debut <= today && (!a.fin || a.fin >= today));
  if (absNow) out.push(`<div class="card warnc"><p style="margin:0"><b>${esc(t.absNow(t.types[absNow.type] || absNow.type, fmt(absNow.fin)))}</b></p></div>`);
  const todays = d.items.filter((x) => x.d <= today && (x.d === today || x.late)).sort(byHour);
  const dow = (new Date().getDay() + 6) % 7;
  const hsToday = hOnDate(d, today);
  const hrow = (h) => `<div class="hday"><b>${esc(t.days[h.j])}</b><span class="hh">🕒 ${esc(t.w.arr)} <b>${esc(h.de)}</b> · ${esc(t.w.dep)} <b>${esc(h.a)}</b></span>${h.lieu ? `<button class="place" data-place="${esc(h.lieu)}" aria-pressed="${h.lieu === place}">📍 ${esc(h.lieu)}</button>` : ''}</div>`;
  const todayAt = out.length;
  out.push(`<div class="card mk mk-plan${todays.length ? ' mk-on' : ''}" id="todayCard"><h2>📅 ${esc(t.w.today)} · ${esc(fmtDay(today))}</h2>${hsToday.map(hrow).join('')}${todays.length ? todays.map(taskLine).join('') : hsToday.length ? '' : `<p class="meta" style="margin:0">${esc(t.none)}</p>`}${hsToday.some((h) => h.lieu) || todays.length ? `<p class="meta" style="margin:8px 0 0">${esc(t.x.placesHint)}</p>` : ''}</div>`);
  { const mid = slot('milieu'); if (mid) out.push(adBox(mid, t)); }
  const nexts = d.items.filter((x) => x.d > today).sort(byHour);
  const byDay = {};
  for (const x of nexts) (byDay[x.d] ||= []).push(x);
  const hOf = (dd) => hOnDate(d, dd);
  // Planning du mois : une bannière par semaine (lundi → dimanche), repliable ; la semaine en cours a le contour qui « respire »
  const addD = (iso, n) => { const x = new Date(iso + 'T12:00:00'); x.setDate(x.getDate() + n); return isoDay(x); };
  const now = new Date(today + 'T12:00:00'), monthEnd = isoDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  const lastDay = monthEnd > addD(today, 7) ? monthEnd : addD(today, 7);
  const sd = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString(T().loc, { day: 'numeric', month: 'short' });
  const weeks = [];
  for (let ws = addD(today, -dow); ws <= lastDay; ws = addD(ws, 7)) {
    const we = addD(ws, 6), thu = new Date(addD(ws, 3) + 'T12:00:00');
    const days = [];
    for (let dd = ws; dd <= we; dd = addD(dd, 1)) if (dd > today && (hOf(dd).length || byDay[dd])) days.push(dd);
    weeks.push({ ws, we, n: Math.floor((thu.getDate() - 1) / 7) + 1, cur: ws <= today && today <= we, days });
  }
  const wkOpen = (w) => { const v = wkMap()[w.ws]; return v === undefined ? w.cur : v; };
  out.push(`<div class="card" id="monthCard"><h2>🗓️ ${esc(t.wk.t)} · ${esc(now.toLocaleDateString(T().loc, { month: 'long', year: 'numeric' }))}</h2>${weeks.map((w) => `<details class="wk${w.cur ? ' cur' : ''}" data-wk="${w.ws}"${wkOpen(w) ? ' open' : ''}><summary><b>${esc(t.wk.w)} ${w.n}</b> <span class="meta">${esc(sd(w.ws))} – ${esc(sd(w.we))}${w.days.length ? ` · ${w.days.length} ${esc(w.days.length === 1 ? t.wk.day1 : t.wk.days)}` : ''}</span></summary>
    ${w.days.length ? w.days.map((dd) => `<div class="day">${esc(fmtDay(dd))}</div>${hOf(dd).map(hrow).join('')}${(byDay[dd] || []).map((x) => taskCard(x, false)).join('')}`).join('') : `<p class="meta" style="margin:6px 0 0">${esc(t.wk.none)}</p>`}</details>`).join('')}</div>`);
  if (d.devis) out.push(devCard());
  // Mon horaire : la personne écrit son arrivée / son départ, et signale ce qui ne va pas (3 photos minimum)
  const pr = presOf(today), pp = t.p;
  const presH = (`<div id="presCard" class="pres-in"><h2>🕒 ${esc(pp.me)} · ${esc(fmtDay(today))}</h2><p class="meta" style="margin:0 0 8px">${esc(todays.length ? t.s.hint : pp.hint)}</p>
    ${hsToday.length ? `<p class="meta" style="margin:0 0 8px">${esc(pp.planned)} : ${hsToday.map((h) => `${esc(h.de)}–${esc(h.a)}`).join(' · ')}</p>` : ''}
    ${todays.length ? (() => { const ci = todays.findIndex((x) => !stopTimes(x.tid, x.d).end && !isRefused(x.tid, x.d)); return todays.map((x, i) => stopCard(x, i === ci)).join(''); })() : `<p style="margin:0"><b>${esc(t.s.day)}</b></p>` + ['arr', 'dep'].map((k) => `<form class="pres" data-pres="${k}"><span class="pres-l">${k === 'arr' ? '🟢' : '🔴'} ${esc(pp[k])}</span><input type="time" name="h" value="${esc(pr[k] || (k === 'dep' && !pr.arr ? '' : nowHM()))}" required><button class="btn sm${pr[k] ? ' sec' : ''}" type="submit">${esc(pp.send)}</button>${pr[k] ? `<span class="pres-ok">✓ ${esc(pr[k])}</span>` : ''}</form>`).join('')}
    <details class="more"${pbPhotos.length ? ' open' : ''}><summary>${esc(pp.pb)}</summary><form id="pbForm">
      <label>${esc(pp.what)}</label><textarea name="note" required placeholder="${esc(pp.ph)}">${esc(pbNote)}</textarea>
      <label>${esc(pp.photos)}</label>
      ${pbPhotos.length ? `<div class="pb-thumbs">${pbPhotos.map((x, i) => `<span class="pb-th"><img src="${x.url}" alt=""><button type="button" data-pb-del="${i}" aria-label="✕">✕</button></span>`).join('')}</div>` : ''}
      ${pbPhotos.length < 6 ? `<div class="btns"><label class="btn sm">${esc(t.x.cam)}<input type="file" accept="image/*" capture="environment" hidden data-pb-pick="1"></label><label class="btn sm sec">${esc(t.x.gal)}<input type="file" accept="image/*" multiple hidden data-pb-pick="1"></label></div>` : `<p class="meta">${esc(pp.full)}</p>`}
      <p class="meta" style="margin:6px 0 0">${pbPhotos.length < 3 ? esc(pp.more.replace('{n}', 3 - pbPhotos.length)) : '✓ ' + pbPhotos.length + ' / 6'}</p>
      <button class="btn block" style="margin-top:10px" type="submit"${pbPhotos.length < 3 ? ' disabled' : ''}>${esc(pp.sendPb)}</button></form></details></div>`);
  // « Mon horaire » se range dans la carte « Planning du jour », juste en dessous
  out[todayAt] = out[todayAt].replace(/<\/div>$/, presH + '</div>');
  const absList = (d.absences || []).filter((a) => !a.fin || a.fin >= today);
  // classement de l'année : sa place et ses points (les autres ne sont pas montrés)
  if (d.rank && d.rank.pts > 0) {
    const r = d.rank, f = (x) => x.replace('{p}', r.pos).replace('{n}', r.of);
    out.push(`<div class="card rk"><h2>${esc(t.rk.t)} · ${r.y}</h2><div class="rk-pos">${r.pos === 1 ? esc(f(t.rk.first)) : esc(f(t.rk.pos))}</div><div class="rk-pts">${esc(t.rk.pts.replace('{p}', r.pts))}</div>
      <div class="meta">✅ ${r.fait} ${esc(t.rk.fait)} · 📷 ${r.ph} ${esc(t.rk.ph)}${r.urg ? ` · 🔴 ${r.urg} ${esc(t.rk.urg)}` : ''}${r.good ? ` · ⭐ ${r.good} ${esc(t.rk.good)}` : ''}</div>
      <p class="meta" style="margin:8px 0 0">${esc(t.rk.hint)}</p></div>`);
  }
  out.push(`<div class="card"><h2>🤒 ${esc(t.abs)}</h2>${absList.map((a) => `<div class="row"><span class="grow">${esc(t.types[a.type] || a.type)} · ${esc(fmt(a.debut))}${a.fin ? ' → ' + esc(fmt(a.fin)) : ''}</span></div>`).join('')}
    <details class="more"><summary>${esc(t.sick)}</summary><form id="absForm">
      <label>${esc(t.abs)}</label><select name="type">${Object.entries(t.types).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}</select>
      <label>${esc(t.from)}</label><input type="date" name="debut" value="${today}" required>
      <label>${esc(t.to)}</label><input type="date" name="fin">
      <label>${esc(t.note)}</label><textarea name="note" style="min-height:70px"></textarea>
      <label>${esc(t.cert)}</label><input type="file" name="photo" accept="image/*">
      <button class="btn block" style="margin-top:12px" type="submit">${esc(t.send)}</button></form></details></div>`);
  if (d.eng) out.push(engCard(d));
  if (pushSt === 'on') out.push(notifCard(t));
  { // bas de page : ℹ️ infos (animation « icône sur l'écran »), 🔒 + Se déconnecter + 📞 la centrale (numéro non affiché : il vient de l'app de gestion)
    const ft = FT[lang] || FT.fr;
    out.push(`<div class="card"><h2>ℹ️ ${esc(ft.info)}</h2><button class="btn sec block" data-ianim="1">▶ ${esc(ft.anim)}</button></div>
    <div class="card notice"><p class="meta" style="margin:0">🔒 ${esc(ft.lock)}</p><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:10px"><button class="btn sec sm" data-logout="1">🚪 ${esc(ft.out)}</button>${d.societe.tel ? `<a class="btn sm" href="tel:${esc(d.societe.tel.replace(/[^\d+]/g, ''))}">📞 ${esc(ft.call)}</a><span class="meta">${esc(d.societe.nom)}</span>` : ''}</div></div>`);
  }
  { const low = slot('bas'); if (low) out.push(adBox(low, t)); }
  out.push(colorLegend());
  out.push(`<div class="ticker" data-vsrc="${API}/ticker"></div>`);
  const keepMap = document.querySelector('#mapBox iframe');
  const keepVid = new Map([...document.querySelectorAll('.vid iframe, .ticker iframe')].map((f) => [f.dataset.src, f]));
  app.innerHTML = out.join('');
  sigRestore();
  hydratePb();
  document.querySelectorAll('.vid[data-vsrc], .ticker[data-vsrc]').forEach((v) => {
    const src = v.dataset.vsrc, old = keepVid.get(src);
    if (old) return v.append(old);
    const f = document.createElement('iframe');
    f.src = src; f.dataset.src = src; f.loading = 'lazy'; f.title = 'Video';
    f.allow = 'encrypted-media; picture-in-picture; fullscreen'; f.allowFullscreen = true; f.referrerPolicy = 'strict-origin-when-cross-origin';
    v.append(f);
  });
  pubSeen(app);
  const mb = document.getElementById('mapBox');
  if (mb) {
    const src = `https://maps.google.com/maps?q=${encodeURIComponent(mb.dataset.q)}&hl=${lang}&z=16&output=embed`;
    if (keepMap && keepMap.dataset.src === src) mb.append(keepMap);
    else { const f = document.createElement('iframe'); f.src = src; f.dataset.src = src; f.title = 'Google Maps'; f.loading = 'lazy'; f.referrerPolicy = 'no-referrer-when-downgrade'; mb.append(f); }
  }
}

pubStatInit(API, 'eq', () => lang);
app.addEventListener('click', pubTap, true);
app.addEventListener('toggle', (e) => {
  const wk = e.target.dataset && e.target.dataset.wk;
  if (wk) { const m = wkMap(); m[wk] = e.target.open; for (const k of Object.keys(m).sort().slice(0, -12)) delete m[k]; setJ('eqWeeks', m); return; }
  const pid = e.target.classList && e.target.classList.contains('pub-box') && e.target.dataset.pid;
  if (!pid) return;
  if (e.target.open) pubShut.delete(pid); else pubShut.add(pid);
  try { localStorage.setItem('eqPubShut', JSON.stringify([...pubShut])); } catch { /* stockage indisponible */ }
}, true);
app.addEventListener('click', async (e) => {
  if (e.target.closest('[data-ianim]')) { import('/ares/install-anim.js').then((m) => m.showInstallAnim({ name: 'ARES Équipe', icon: '/ares/icons/lux-192.png', lang })); return; }
  if (e.target.closest('[data-eng-open]')) { const c = document.getElementById('engCard'); if (c) { c.querySelector('details').open = true; c.scrollIntoView({ block: 'start', behavior: 'smooth' }); } return; }
  if (e.target.closest('[data-prof]')) { profOpen = !profOpen; render(); if (profOpen) document.getElementById('profCard')?.scrollIntoView({ block: 'start', behavior: 'smooth' }); return; }
  if (e.target.closest('[data-sig-clear]')) { const c = app.querySelector('canvas.sig-pad'); if (c) c.getContext('2d').clearRect(0, 0, c.width, c.height); sigUrl = ''; return; }
  const lb = e.target.closest('[data-lang]');
  if (lb) { lang = lb.dataset.lang; try { localStorage.setItem('eqLang', lang); } catch {} if (pushSt === 'on') pushRefresh('/equipe', pushPost); return render(); }
  if (e.target.closest('[data-logout]')) { e.preventDefault(); if (data && !confirm((FT[lang] || FT.fr).sure)) return; try { localStorage.removeItem(IK()); localStorage.removeItem(ACC); } catch {} id = key = ''; data = null; loadErr = ''; return render(); }
  if (e.target.closest('[data-retry]')) return flush();
  const pon = e.target.closest('[data-push-on]');
  if (pon) {
    pon.disabled = true;
    try {
      if (await pushEnable({ api: API, swUrl: '/equipe-sw.js', scope: '/equipe', post: pushPost })) { pushSt = 'on'; pushJust = true; } else pushSt = await pushStatus('/equipe');
    } catch { alert(T().nt.err); }
    return render();
  }

  const pdl = e.target.closest('[data-pb-del]');
  if (pdl) { const [x] = pbPhotos.splice(+pdl.dataset.pbDel, 1); if (x) URL.revokeObjectURL(x.url); return render(); }
  if (e.target.closest('[data-pubback]')) { place = ''; render(); scrollTo({ top: 0, behavior: 'smooth' }); return; }
  const pb = e.target.closest('[data-place]');
  if (pb) { place = place === pb.dataset.place ? '' : pb.dataset.place; render(); if (place) scrollTo({ top: 0, behavior: 'smooth' }); return; }
  if (e.target.closest('[data-cancel]')) { form = null; return render(); }
  const ab = e.target.closest('[data-act]');
  if (ab) {
    flash = '';
    const { act, tid, d } = ab.dataset;
    if (act === 'encours') { await queue({ k: 'task', tid, d, st: 'encours', note: '', at: new Date().toISOString() }); return render(); }
    form = { tid, d, st: act };
    render();
    const ta = app.querySelector('form.act select, form.act textarea'); if (ta) ta.focus();
  }
});
app.addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target, t = T(), btn = f.querySelector('button[type=submit]');
  if (f.id === 'codeForm') {
    btn.disabled = true; btn.textContent = '…';
    try {
      const code = f.code.value;
      const r = await fetch(`${API}/api/esp-code`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ h: await codeHash(code) }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(r.status === 404 ? t.badCode : j.error || r.status);
      id = j.id; key = await unwrapWithCode(code, j.salt, j.wk);
      try { localStorage.setItem(ACC, id + '.' + key); } catch {}
      loadErr = '';
      await load();
    } catch (err) { loadErr = err.message || String(err); render(); }
    return;
  }
  if (f.dataset.stop) {
    const v = f.h.value;
    if (!/^\d{2}:\d{2}$/.test(v)) return;
    flash = '';
    await queue({ k: 'task', tid: f.dataset.tid, d: f.dataset.d, st: f.dataset.stop, note: '', h: v, photos: [], ...(f.dataset.stop === 'fait' ? qtyOf(f) : {}), at: new Date().toISOString() });
    flash = t.sent;
    render();
    if (f.dataset.stop === 'fait') document.getElementById('presCard')?.scrollIntoView({ block: 'start' });
    return;
  }
  if (f.dataset.pres) {
    const v = f.h.value;
    if (!/^\d{2}:\d{2}$/.test(v)) return;
    let m = {}; try { m = JSON.parse(localStorage.getItem(PRK()) || '{}'); } catch { /* stockage indisponible */ }
    m[today] = { ...(m[today] || {}), [f.dataset.pres]: v };
    for (const k of Object.keys(m).sort().slice(0, -10)) delete m[k];
    try { localStorage.setItem(PRK(), JSON.stringify(m)); } catch { /* stockage plein */ }
    await queue({ k: 'pres', d: today, [f.dataset.pres]: v, at: new Date().toISOString() });
    flash = t.sent;
    render();
    return;
  }
  if (f.id === 'engForm') {
    const e2 = ENGT[lang] || ENGT.fr;
    if (!f.acc.checked || !sigUrl) { alert(e2.need); return; }
    btn.disabled = true; btn.textContent = '…';
    try {
      await queue({ k: 'sign', png: sigUrl, lang, at: new Date().toISOString() });
      sigSent = new Date().toISOString(); sigUrl = '';
      flash = e2.ok.replace('{s}', data.societe.nom || '');
    } catch (err) { alert('⚠ ' + (err.message || err)); }
    render(); scrollTo(0, 0);
    return;
  }
  if (f.id === 'assurForm') {
    const a = ASST[lang] || ASST.fr, co = f.co.value.trim(), pol = f.pol.value.trim();
    if (co.length < 2 || pol.length < 2) { alert(a.need); return; }
    btn.disabled = true; btn.textContent = '…';
    try { await queue({ k: 'assur', assur: co.slice(0, 80), police: pol.slice(0, 40), at: new Date().toISOString() }); assurSent = true; flash = a.ok; } catch (err) { alert('⚠ ' + (err.message || err)); }
    render(); scrollTo(0, 0);
    return;
  }
  if (f.id === 'pbForm') {
    const note = f.note.value.trim();
    if (!note || pbPhotos.length < 3) return;
    btn.disabled = true; btn.textContent = '…';
    const h0 = hOnDate(data, isoDay(new Date())).find((h) => h.lieu);
    try {
      await queue({ k: 'pb', d: today, note: note.slice(0, 1000), lieu: place || (h0 ? h0.lieu : ''), photos: pbPhotos.map((x) => x.b), at: new Date().toISOString() });
      pbPhotos.forEach((x) => URL.revokeObjectURL(x.url)); pbPhotos = []; pbNote = '';
      flash = t.p.pbOk;
    } catch (err) { alert('⚠ ' + (err.message || err)); }
    render();
    scrollTo(0, 0);
    return;
  }
  btn.disabled = true; btn.textContent = '…';
  try {
    if (f.classList.contains('act')) {
      if (f.dataset.st === 'refus') {
        const r = REFT[lang] || REFT.fr, why = f.why.value;
        const extra = f.note.value.trim();
        if (!r.r[why] || (why === 'autre' && extra.length < 3)) { alert(r.r[why] ? r.needNote : r.why); btn.disabled = false; btn.textContent = r.send; return; }
        form = null;
        await queue({ k: 'task', tid: f.dataset.tid, d: f.dataset.d, st: 'refus', why, note: (REFT.fr.r[why] + (extra ? ' — ' + extra : '')).slice(0, 1000), at: new Date().toISOString() });
        flash = r.ok;
        render(); scrollTo(0, 0);
        return;
      }
      const note = f.note.value.trim();
      if (f.dataset.st === 'incomplet' && !note) { alert(t.need); btn.disabled = false; btn.textContent = t.send; return; }
      form = null;
      await queue({ k: 'task', tid: f.dataset.tid, d: f.dataset.d, st: f.dataset.st, note, photos: [], ...(f.dataset.st === 'fait' ? qtyOf(f) : {}), at: new Date().toISOString() });
      flash = t.sent;
    } else if (f.id === 'absForm') {
      const photos = f.photo.files[0] ? [await compress(f.photo.files[0])] : [];
      await queue({ k: 'abs', type: f.type.value, debut: f.debut.value, fin: f.fin.value, note: f.note.value.trim(), photos, at: new Date().toISOString() });
      flash = t.sickOk;
    } else if (f.id === 'infoForm') {
      // seulement ce qui a changé ; un champ vidé n'efface rien chez le responsable
      const x = getJ(IK()), keep = x && !Array.isArray(x) ? x : {}, cur = (n) => keep[n] || (n === 'prenom' || n === 'nom' ? data[n] : data.me[n]) || '';
      const ch = {};
      for (const n of PF) { const v = (f[n] ? f[n].value : '').replace(/\s+/g, ' ').trim(); if (v && v !== cur(n)) ch[n] = v; }
      if (ch.ccss) { ch.ccss = ch.ccss.replace(/\s/g, ''); if (!/^\d{13}$/.test(ch.ccss)) { alert('⚠ ' + (CCSS[lang] || CCSS.fr)[2]); btn.disabled = false; btn.textContent = (CINFO[lang] || CINFO.fr).save; return; } }
      if (Object.keys(ch).length) { await queue({ k: 'info', ...ch, at: new Date().toISOString() }); setJ(IK(), { ...keep, ...ch }); }
      profOpen = false;
      flash = (CINFO[lang] || CINFO.fr).ok;
    }
  } catch (err) { alert('⚠ ' + (err.message || err)); }
  render();
  scrollTo(0, 0);
});

app.addEventListener('input', (e) => { if (e.target.form && e.target.form.id === 'pbForm' && e.target.name === 'note') pbNote = e.target.value; });
app.addEventListener('change', async (e) => {
  if (e.target.dataset && e.target.dataset.photoPick && e.target.files[0]) {
    try { phMine = await photoSquare(e.target.files[0]); render(); await queue({ k: 'photo', d: phMine, at: new Date().toISOString() }); flash = (SETT[lang] || SETT.fr).ok; render(); } catch { alert('⚠'); }
    return;
  }
  if (e.target.dataset && e.target.dataset.pbPick) {
    const files = [...e.target.files].slice(0, 6 - pbPhotos.length);
    e.target.value = '';
    for (const file of files) {
      try {
        const b = await compress(file);
        const bin = atob(b.replace(/-/g, '+').replace(/_/g, '/'));
        pbPhotos.push({ b, url: URL.createObjectURL(new Blob([Uint8Array.from(bin, (c) => c.charCodeAt(0))], { type: 'image/jpeg' })) });
      } catch { /* image illisible */ }
    }
    render();
    return;
  }
  const inp = e.target.closest('input[data-ph]');
  if (!inp || !inp.files.length) return;
  const { ph, tid, d } = inp.dataset, files = [...inp.files];
  inp.value = '';
  const room = 6 - phCount(tid, ph);
  if (room <= 0) return alert(T().x.full);
  flash = '';
  try {
    let n = 0;
    for (const file of files.slice(0, room)) { await queue({ k: 'ph', tid, d, phase: ph, photos: [await compress(file)], at: new Date().toISOString() }, true); n++; }
    let m = {}; try { m = JSON.parse(localStorage.getItem(PK()) || '{}'); } catch { /* stockage indisponible */ }
    m[tid] = { ...(m[tid] || {}), [ph]: phCount(tid, ph) + n };
    try { localStorage.setItem(PK(), JSON.stringify(m)); } catch { /* stockage plein */ }
    flash = T().sent;
    if (files.length > room) alert(T().x.full);
  } catch (err) { alert('⚠ ' + (err.message || err)); }
  await flush();
  render();
});

// ── 🦺 Devis du chef de chantier : préparé ici (sans prix), envoyé chiffré au directeur ──
const DVT = {
  fr: { t: '📝 Devis', hint: 'Préparez un devis sur place : client, photos, rapport, travaux à faire. Le directeur met les prix et l’envoie au client.', new: '➕ Nouveau devis', mine: 'Mes devis', none: 'Aucun devis pour l’instant.',
    st: { draft: '📝 Brouillon (pas encore envoyé)', wait: '📨 Envoyé au directeur — en attente', prep: '🟡 En préparation chez le directeur', fini: '✅ Terminé par le directeur', envoye: '📤 Envoyé au client', revision: '🔄 Le client demande une modification', accepte: '✍️ Signé par le client ✅', refuse: '❌ Refusé par le client', done: '➡️ Intervention planifiée' },
    edit: '✏️ Corriger', open: 'Ouvrir', back: '← Retour', client: 'Client', ctype: 'Type de client', part: '👤 Particulier', pro: '🏢 Société', nom: 'Nom / raison sociale', rcs: 'RCS', tva: 'N° TVA', adr: 'Adresse du client', tel: 'Téléphone (WhatsApp)', mail: 'Email',
    titre: 'Objet du devis', titrePh: 'ex. Rénovation de la salle de bain', chantier: 'Adresse du chantier', chantierPh: 'si différente de celle du client', interloc: 'Interlocuteur sur place',
    photos: '📷 Photos (2 à 20)', sentPh: '{n} photo(s) déjà envoyée(s)', pend: '{n} photo(s) en attente d’envoi', max: '20 photos maximum',
    rapport: 'Rapport du chantier (ce qu’il faut faire)', rapportPh: 'Constats, travaux à prévoir, accès, remarques…',
    prest: '📋 Travaux à faire', prestHint: 'Cochez les travaux, puis la quantité, l’unité et les détails (mesures en cm, format, couleur, modèle). Les textes du devis restent en français. Pas de prix : c’est le directeur qui les met.',
    free: 'Autres travaux (texte libre)', freePh: 'Autre travail', addFree: '➕ Ligne libre', q: 'Qté', det: 'détails',
    rows: 'Ouvriers prévus (métier · nombre · heures par ouvrier)', met: '— métier —', addRow: '➕ Ligne', ouvr: 'ouvr.', jours: 'Durée prévue', joursPh: 'ex. 3 jours',
    visaT: '✍️ Vu et correct (facultatif)', visaHint: 'Le client confirme que votre rapport décrit bien les travaux qu’il demande. Ce n’est pas une commande : il n’y a pas encore de prix.', visaNom: 'Nom du client', visaOk: '✓ Signé par {n} le {d}', visaRedo: 'Refaire la signature', visaSign: '✍️ Valider la signature', visaGone: 'Rapport ou travaux modifiés : la signature « Vu et correct » est retirée. Faites-la refaire si besoin.', clear: 'Effacer',
    save: '💾 Enregistrer le brouillon', send: '📤 Envoyer au directeur', resend: '📤 Renvoyer la correction', del: 'Supprimer le brouillon', delQ: 'Supprimer ce brouillon ?',
    needNom: 'Écrivez le nom du client', needWork: 'Écrivez le rapport ou cochez au moins un travail', needSig: 'Le client doit signer dans le cadre blanc', saved: 'Brouillon enregistré sur ce téléphone', sentOk: '📤 Devis envoyé au directeur. Vous pouvez encore le corriger tant qu’il ne l’a pas terminé.', locked: 'Le directeur a terminé ce devis : appelez-le pour une correction.' },
  it: { t: '📝 Preventivi', hint: 'Prepara un preventivo sul posto: cliente, foto, rapporto, lavori da fare. Il direttore mette i prezzi e lo invia al cliente.', new: '➕ Nuovo preventivo', mine: 'I miei preventivi', none: 'Nessun preventivo per ora.',
    st: { draft: '📝 Bozza (non ancora inviata)', wait: '📨 Inviato al direttore — in attesa', prep: '🟡 In preparazione dal direttore', fini: '✅ Completato dal direttore', envoye: '📤 Inviato al cliente', revision: '🔄 Il cliente chiede una modifica', accepte: '✍️ Firmato dal cliente ✅', refuse: '❌ Rifiutato dal cliente', done: '➡️ Intervento pianificato' },
    edit: '✏️ Correggi', open: 'Apri', back: '← Indietro', client: 'Cliente', ctype: 'Tipo di cliente', part: '👤 Privato', pro: '🏢 Società', nom: 'Nome / ragione sociale', rcs: 'RCS', tva: 'Partita IVA', adr: 'Indirizzo del cliente', tel: 'Telefono (WhatsApp)', mail: 'Email',
    titre: 'Oggetto del preventivo', titrePh: 'es. Ristrutturazione del bagno', chantier: 'Indirizzo del cantiere', chantierPh: 'se diverso da quello del cliente', interloc: 'Referente sul posto',
    photos: '📷 Foto (da 2 a 20)', sentPh: '{n} foto già inviate', pend: '{n} foto in attesa di invio', max: '20 foto al massimo',
    rapport: 'Rapporto del cantiere (cosa bisogna fare)', rapportPh: 'Constatazioni, lavori da prevedere, accesso, osservazioni…',
    prest: '📋 Lavori da fare', prestHint: 'Spunta i lavori, poi quantità, unità e dettagli (misure in cm, formato, colore, modello). I testi del preventivo restano in francese. Niente prezzi: li mette il direttore.',
    free: 'Altri lavori (testo libero)', freePh: 'Altro lavoro', addFree: '➕ Riga libera', q: 'Qtà', det: 'dettagli',
    rows: 'Operai previsti (mestiere · numero · ore per operaio)', met: '— mestiere —', addRow: '➕ Riga', ouvr: 'op.', jours: 'Durata prevista', joursPh: 'es. 3 giorni',
    visaT: '✍️ Visto e corretto (facoltativo)', visaHint: 'Il cliente conferma che il tuo rapporto descrive bene i lavori che chiede. Non è un ordine: non ci sono ancora prezzi.', visaNom: 'Nome del cliente', visaOk: '✓ Firmato da {n} il {d}', visaRedo: 'Rifai la firma', visaSign: '✍️ Conferma la firma', visaGone: 'Rapporto o lavori modificati: la firma «Visto e corretto» è stata tolta. Falla rifare se serve.', clear: 'Cancella',
    save: '💾 Salva la bozza', send: '📤 Invia al direttore', resend: '📤 Invia di nuovo la correzione', del: 'Elimina la bozza', delQ: 'Eliminare questa bozza?',
    needNom: 'Scrivi il nome del cliente', needWork: 'Scrivi il rapporto o spunta almeno un lavoro', needSig: 'Il cliente deve firmare nel riquadro bianco', saved: 'Bozza salvata su questo telefono', sentOk: '📤 Preventivo inviato al direttore. Puoi ancora correggerlo finché non lo ha completato.', locked: 'Il direttore ha completato questo preventivo: chiamalo per una correzione.' },
  de: { t: '📝 Kostenvoranschläge', hint: 'Bereiten Sie vor Ort einen Kostenvoranschlag vor: Kunde, Fotos, Bericht, Arbeiten. Der Direktor setzt die Preise ein und schickt ihn dem Kunden.', new: '➕ Neuer Kostenvoranschlag', mine: 'Meine Kostenvoranschläge', none: 'Noch keine Kostenvoranschläge.',
    st: { draft: '📝 Entwurf (noch nicht gesendet)', wait: '📨 An den Direktor gesendet — wartet', prep: '🟡 In Bearbeitung beim Direktor', fini: '✅ Vom Direktor fertiggestellt', envoye: '📤 An den Kunden gesendet', revision: '🔄 Der Kunde wünscht eine Änderung', accepte: '✍️ Vom Kunden unterschrieben ✅', refuse: '❌ Vom Kunden abgelehnt', done: '➡️ Einsatz geplant' },
    edit: '✏️ Korrigieren', open: 'Öffnen', back: '← Zurück', client: 'Kunde', ctype: 'Art des Kunden', part: '👤 Privatperson', pro: '🏢 Firma', nom: 'Name / Firmenname', rcs: 'RCS', tva: 'MwSt.-Nr.', adr: 'Adresse des Kunden', tel: 'Telefon (WhatsApp)', mail: 'E-Mail',
    titre: 'Gegenstand', titrePh: 'z. B. Badsanierung', chantier: 'Adresse der Baustelle', chantierPh: 'falls anders als die des Kunden', interloc: 'Ansprechpartner vor Ort',
    photos: '📷 Fotos (2 bis 20)', sentPh: '{n} Foto(s) bereits gesendet', pend: '{n} Foto(s) warten auf Versand', max: 'Höchstens 20 Fotos',
    rapport: 'Baustellenbericht (was zu tun ist)', rapportPh: 'Feststellungen, geplante Arbeiten, Zugang, Bemerkungen…',
    prest: '📋 Auszuführende Arbeiten', prestHint: 'Arbeiten ankreuzen, dann Menge, Einheit und Details (Maße in cm, Format, Farbe, Modell). Die Texte des Kostenvoranschlags bleiben auf Französisch. Keine Preise: die setzt der Direktor ein.',
    free: 'Weitere Arbeiten (freier Text)', freePh: 'Andere Arbeit', addFree: '➕ Freie Zeile', q: 'Menge', det: 'Details',
    rows: 'Geplante Arbeiter (Beruf · Anzahl · Stunden pro Arbeiter)', met: '— Beruf —', addRow: '➕ Zeile', ouvr: 'Arb.', jours: 'Geplante Dauer', joursPh: 'z. B. 3 Tage',
    visaT: '✍️ Gesehen und richtig (freiwillig)', visaHint: 'Der Kunde bestätigt, dass Ihr Bericht die gewünschten Arbeiten richtig beschreibt. Das ist kein Auftrag: es gibt noch keine Preise.', visaNom: 'Name des Kunden', visaOk: '✓ Unterschrieben von {n} am {d}', visaRedo: 'Neu unterschreiben', visaSign: '✍️ Unterschrift bestätigen', visaGone: 'Bericht oder Arbeiten geändert: die Unterschrift „Gesehen und richtig“ wurde entfernt. Bei Bedarf neu unterschreiben lassen.', clear: 'Löschen',
    save: '💾 Entwurf speichern', send: '📤 An den Direktor senden', resend: '📤 Korrektur erneut senden', del: 'Entwurf löschen', delQ: 'Diesen Entwurf löschen?',
    needNom: 'Schreiben Sie den Namen des Kunden', needWork: 'Schreiben Sie den Bericht oder kreuzen Sie mindestens eine Arbeit an', needSig: 'Der Kunde muss im weißen Feld unterschreiben', saved: 'Entwurf auf diesem Telefon gespeichert', sentOk: '📤 Kostenvoranschlag an den Direktor gesendet. Sie können ihn noch korrigieren, solange er nicht fertiggestellt ist.', locked: 'Der Direktor hat diesen Kostenvoranschlag fertiggestellt: rufen Sie ihn für eine Korrektur an.' },
  pt: { t: '📝 Orçamentos', hint: 'Prepare um orçamento no local: cliente, fotos, relatório, trabalhos a fazer. O diretor põe os preços e envia-o ao cliente.', new: '➕ Novo orçamento', mine: 'Os meus orçamentos', none: 'Ainda não há orçamentos.',
    st: { draft: '📝 Rascunho (ainda não enviado)', wait: '📨 Enviado ao diretor — em espera', prep: '🟡 Em preparação pelo diretor', fini: '✅ Concluído pelo diretor', envoye: '📤 Enviado ao cliente', revision: '🔄 O cliente pede uma alteração', accepte: '✍️ Assinado pelo cliente ✅', refuse: '❌ Recusado pelo cliente', done: '➡️ Intervenção planeada' },
    edit: '✏️ Corrigir', open: 'Abrir', back: '← Voltar', client: 'Cliente', ctype: 'Tipo de cliente', part: '👤 Particular', pro: '🏢 Empresa', nom: 'Nome / denominação social', rcs: 'RCS', tva: 'N.º de IVA', adr: 'Morada do cliente', tel: 'Telefone (WhatsApp)', mail: 'Email',
    titre: 'Objeto do orçamento', titrePh: 'ex. Remodelação da casa de banho', chantier: 'Morada da obra', chantierPh: 'se for diferente da do cliente', interloc: 'Contacto no local',
    photos: '📷 Fotos (2 a 20)', sentPh: '{n} foto(s) já enviada(s)', pend: '{n} foto(s) à espera de envio', max: '20 fotos no máximo',
    rapport: 'Relatório da obra (o que é preciso fazer)', rapportPh: 'Constatações, trabalhos a prever, acesso, observações…',
    prest: '📋 Trabalhos a fazer', prestHint: 'Marque os trabalhos e depois a quantidade, a unidade e os detalhes (medidas em cm, formato, cor, modelo). Os textos do orçamento ficam em francês. Sem preços: é o diretor que os põe.',
    free: 'Outros trabalhos (texto livre)', freePh: 'Outro trabalho', addFree: '➕ Linha livre', q: 'Qtd.', det: 'detalhes',
    rows: 'Trabalhadores previstos (profissão · número · horas por trabalhador)', met: '— profissão —', addRow: '➕ Linha', ouvr: 'trab.', jours: 'Duração prevista', joursPh: 'ex. 3 dias',
    visaT: '✍️ Visto e conforme (facultativo)', visaHint: 'O cliente confirma que o seu relatório descreve bem os trabalhos que pede. Não é uma encomenda: ainda não há preços.', visaNom: 'Nome do cliente', visaOk: '✓ Assinado por {n} em {d}', visaRedo: 'Refazer a assinatura', visaSign: '✍️ Confirmar a assinatura', visaGone: 'Relatório ou trabalhos alterados: a assinatura «Visto e conforme» foi retirada. Peça para refazer se for preciso.', clear: 'Apagar',
    save: '💾 Guardar o rascunho', send: '📤 Enviar ao diretor', resend: '📤 Reenviar a correção', del: 'Eliminar o rascunho', delQ: 'Eliminar este rascunho?',
    needNom: 'Escreva o nome do cliente', needWork: 'Escreva o relatório ou marque pelo menos um trabalho', needSig: 'O cliente tem de assinar no quadro branco', saved: 'Rascunho guardado neste telemóvel', sentOk: '📤 Orçamento enviado ao diretor. Ainda o pode corrigir enquanto ele não o concluir.', locked: 'O diretor concluiu este orçamento: ligue-lhe para uma correção.' },
  en: { t: '📝 Quotes', hint: 'Prepare a quote on site: client, photos, report, work to do. The director adds the prices and sends it to the client.', new: '➕ New quote', mine: 'My quotes', none: 'No quotes yet.',
    st: { draft: '📝 Draft (not sent yet)', wait: '📨 Sent to the director — waiting', prep: '🟡 Being prepared by the director', fini: '✅ Finished by the director', envoye: '📤 Sent to the client', revision: '🔄 The client asks for a change', accepte: '✍️ Signed by the client ✅', refuse: '❌ Refused by the client', done: '➡️ Job scheduled' },
    edit: '✏️ Correct', open: 'Open', back: '← Back', client: 'Client', ctype: 'Type of client', part: '👤 Private person', pro: '🏢 Company', nom: 'Name / company name', rcs: 'RCS', tva: 'VAT no.', adr: 'Client address', tel: 'Phone (WhatsApp)', mail: 'Email',
    titre: 'Subject of the quote', titrePh: 'e.g. Bathroom renovation', chantier: 'Site address', chantierPh: 'if different from the client’s', interloc: 'Contact person on site',
    photos: '📷 Photos (2 to 20)', sentPh: '{n} photo(s) already sent', pend: '{n} photo(s) waiting to be sent', max: '20 photos maximum',
    rapport: 'Site report (what needs to be done)', rapportPh: 'Findings, work to plan, access, remarks…',
    prest: '📋 Work to do', prestHint: 'Tick the work, then the quantity, unit and details (sizes in cm, format, colour, model). The quote texts stay in French. No prices: the director adds them.',
    free: 'Other work (free text)', freePh: 'Other work', addFree: '➕ Free line', q: 'Qty', det: 'details',
    rows: 'Planned workers (trade · number · hours per worker)', met: '— trade —', addRow: '➕ Line', ouvr: 'wkr.', jours: 'Planned duration', joursPh: 'e.g. 3 days',
    visaT: '✍️ Seen and correct (optional)', visaHint: 'The client confirms that your report correctly describes the work they ask for. It is not an order: there are no prices yet.', visaNom: 'Client name', visaOk: '✓ Signed by {n} on {d}', visaRedo: 'Sign again', visaSign: '✍️ Confirm the signature', visaGone: 'Report or work changed: the “Seen and correct” signature was removed. Have it signed again if needed.', clear: 'Clear',
    save: '💾 Save draft', send: '📤 Send to the director', resend: '📤 Send the correction', del: 'Delete draft', delQ: 'Delete this draft?',
    needNom: 'Write the client’s name', needWork: 'Write the report or tick at least one job', needSig: 'The client must sign in the white box', saved: 'Draft saved on this phone', sentOk: '📤 Quote sent to the director. You can still correct it until it is finished.', locked: 'The director has finished this quote: call them for a correction.' },
  es: { t: '📝 Presupuestos', hint: 'Prepara un presupuesto en el lugar: cliente, fotos, informe, trabajos a realizar. El director pone los precios y lo envía al cliente.', new: '➕ Nuevo presupuesto', mine: 'Mis presupuestos', none: 'Todavía no hay presupuestos.',
    st: { draft: '📝 Borrador (aún no enviado)', wait: '📨 Enviado al director — en espera', prep: '🟡 En preparación por el director', fini: '✅ Terminado por el director', envoye: '📤 Enviado al cliente', revision: '🔄 El cliente pide un cambio', accepte: '✍️ Firmado por el cliente ✅', refuse: '❌ Rechazado por el cliente', done: '➡️ Intervención planificada' },
    edit: '✏️ Corregir', open: 'Abrir', back: '← Volver', client: 'Cliente', ctype: 'Tipo de cliente', part: '👤 Particular', pro: '🏢 Empresa', nom: 'Nombre / razón social', rcs: 'RCS', tva: 'N.º de IVA', adr: 'Dirección del cliente', tel: 'Teléfono (WhatsApp)', mail: 'Email',
    titre: 'Objeto del presupuesto', titrePh: 'ej. Reforma del baño', chantier: 'Dirección de la obra', chantierPh: 'si es distinta de la del cliente', interloc: 'Contacto en el lugar',
    photos: '📷 Fotos (de 2 a 20)', sentPh: '{n} foto(s) ya enviada(s)', pend: '{n} foto(s) pendiente(s) de envío', max: '20 fotos como máximo',
    rapport: 'Informe de la obra (lo que hay que hacer)', rapportPh: 'Constataciones, trabajos a prever, acceso, observaciones…',
    prest: '📋 Trabajos a realizar', prestHint: 'Marca los trabajos y luego la cantidad, la unidad y los detalles (medidas en cm, formato, color, modelo). Los textos del presupuesto quedan en francés. Sin precios: los pone el director.',
    free: 'Otros trabajos (texto libre)', freePh: 'Otro trabajo', addFree: '➕ Línea libre', q: 'Cant.', det: 'detalles',
    rows: 'Trabajadores previstos (oficio · número · horas por trabajador)', met: '— oficio —', addRow: '➕ Línea', ouvr: 'trab.', jours: 'Duración prevista', joursPh: 'ej. 3 días',
    visaT: '✍️ Visto y conforme (opcional)', visaHint: 'El cliente confirma que tu informe describe bien los trabajos que pide. No es un pedido: todavía no hay precios.', visaNom: 'Nombre del cliente', visaOk: '✓ Firmado por {n} el {d}', visaRedo: 'Volver a firmar', visaSign: '✍️ Confirmar la firma', visaGone: 'Informe o trabajos modificados: se ha quitado la firma «Visto y conforme». Hazla repetir si hace falta.', clear: 'Borrar',
    save: '💾 Guardar el borrador', send: '📤 Enviar al director', resend: '📤 Reenviar la corrección', del: 'Eliminar el borrador', delQ: '¿Eliminar este borrador?',
    needNom: 'Escribe el nombre del cliente', needWork: 'Escribe el informe o marca al menos un trabajo', needSig: 'El cliente debe firmar en el recuadro blanco', saved: 'Borrador guardado en este teléfono', sentOk: '📤 Presupuesto enviado al director. Todavía puedes corregirlo mientras no lo haya terminado.', locked: 'El director ha terminado este presupuesto: llámalo para una corrección.' },
};
const DV = () => DVT[lang] || DVT.fr;
// brouillons sur ce téléphone (texte) ; les photos attendent dans IndexedDB jusqu'à leur envoi
const DK = () => 'eqDev:' + id;
const dvAll = () => { try { const m = JSON.parse(localStorage.getItem(DK()) || '{}'); return m && typeof m === 'object' && !Array.isArray(m) ? m : {}; } catch { return {}; } };
const dvPut = (dr) => { const m = dvAll(); m[dr.did] = dr; setJ(DK(), m); };
const dvDrop = (did) => { const m = dvAll(); delete m[did]; setJ(DK(), m); };
const dvDb = () => new Promise((res, rej) => { const r = indexedDB.open('eqDevis', 1); r.onupgradeneeded = () => r.result.createObjectStore('ph'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
async function phIdb(mode, fn) { const db = await dvDb(); return new Promise((res, rej) => { const tx = db.transaction('ph', mode); const q = fn(tx.objectStore('ph')); tx.oncomplete = () => { db.close(); res(q && q.result); }; tx.onerror = () => { db.close(); rej(tx.error); }; }); }
const phPut = (k, v) => phIdb('readwrite', (s) => s.put(v, k));
const phGet = (k) => phIdb('readonly', (s) => s.get(k));
const phDel = (k) => phIdb('readwrite', (s) => s.delete(k));
const dvTxt = ['c', 'titre', 'chantier', 'interloc', 'rapport', 'jours', 'rows', 'prest', 'visa'];
const dvHash = (x) => JSON.stringify([String(x.rapport || '').trim(), (x.prest || []).map((p) => [p.k, p.l, p.q === '' || p.q == null ? '' : +p.q, p.u || '', p.det || ''])]);
const dvSrv = (did) => ((data.devis && data.devis.mine) || []).find((x) => x.did === did) || null;
let devEd = null, devRedraw = true, devBusy = false, devMsg = '';
const devCats = new Set();
function dvNew() {
  const r = crypto.getRandomValues(new Uint8Array(8));
  return { did: [...r].map((b) => b.toString(16).padStart(2, '0')).join(''), c: { type: 'part', nom: '', rcs: '', tva: '', adresse: '', tel: '', email: '' }, titre: '', chantier: '', interloc: '', rapport: '', jours: '', rows: [{ met: '', nb: 1, h: '' }], prest: [], visa: null, ph: [], nx: 1, phSent: 0, sent: false, dirty: true };
}
// ouvrir : le brouillon de ce téléphone, sinon la version reçue par le directeur
function dvOpen(did) {
  const loc = did ? dvAll()[did] : null, srv = did ? dvSrv(did) : null;
  if (srv && !['prep'].includes(srv.st) && !(loc && !loc.sent)) return;
  if (loc && (loc.dirty || loc.ph.length || !srv)) devEd = JSON.parse(JSON.stringify(loc));
  else if (srv) {
    const dr = dvNew();
    Object.assign(dr, { did: srv.did, c: { ...dr.c, ...srv.c }, titre: srv.titre, chantier: srv.chantier, interloc: srv.interloc, rapport: srv.rapport, jours: srv.jours, rows: srv.rows.length ? srv.rows : dr.rows, prest: srv.prest, nx: srv.nx || 1, phSent: srv.nph || 0, sent: true, dirty: false });
    if (srv.visa) dr.visa = { nom: srv.visa.nom, at: srv.visa.at, keep: true, h: dvHash(dr) };
    dvPut(dr); devEd = JSON.parse(JSON.stringify(dr));
  } else { devEd = dvNew(); dvPut(devEd); }
  devMsg = ''; devRedraw = true; sigUrl = '';
  render(); scrollTo(0, 0);
}
// enregistre le texte (les photos et l'état d'envoi restent ceux du téléphone)
function dvSave() {
  if (!devEd) return;
  if (devEd.visa && devEd.visa.h !== dvHash(devEd)) { devEd.visa = null; devMsg = DV().visaGone; devRedraw = true; }
  const cur = dvAll()[devEd.did] || {};
  const nx = { ...cur, did: devEd.did, dirty: true };
  for (const k of dvTxt) nx[k] = devEd[k];
  for (const k of ['ph', 'nx', 'phSent', 'sent']) nx[k] = cur[k] ?? devEd[k];
  dvPut(nx);
}
const dvItem = (dr) => ({ k: 'devis', did: dr.did, c: dr.c, titre: dr.titre, chantier: dr.chantier, interloc: dr.interloc, rapport: dr.rapport, jours: dr.jours, rows: dr.rows.filter((r) => r.met || +r.h), prest: dr.prest.filter((p) => p.l), visa: dr.visa && dr.visa.png ? { png: dr.visa.png, nom: dr.visa.nom, at: dr.visa.at } : null, visaKeep: !!(dr.visa && dr.visa.keep), at: new Date().toISOString() });
// envoi au directeur : le devis puis les photos, par paquets de ~2,5 Mo (chiffrés, comme le reste)
async function devFlush() {
  if (!data || !data.signalKey || devBusy) return;
  devBusy = true;
  try {
    for (const did of Object.keys(dvAll())) {
      for (let guard = 0; guard < 30; guard++) {
        const dr = dvAll()[did];
        if (!dr || !dr.out) break;
        const items = [], done = [];
        let size = 0, got = 0;
        if (dr.out.main) { const it = dvItem(dr); items.push(it); size += JSON.stringify(it).length; }
        for (const n of dr.ph) {
          if (items.length >= 25) break;
          const b = await phGet(did + ':' + n).catch(() => null);
          if (!b) { done.push(n); continue; }
          if (items.length && size + b.length > 2.5e6) break;
          items.push({ k: 'devph', did, n, b, at: new Date().toISOString() }); done.push(n); size += b.length; got++;
        }
        if (items.length) {
          const body = await sealForOwner(data.signalKey, { espace: id, t: new Date().toISOString(), type: 'equipe', items });
          const r = await fetch(`${API}/api/esp/${id}/signal`, { method: 'POST', body });
          if (!r.ok) throw new Error(r.status);
        }
        for (const n of done) await phDel(did + ':' + n).catch(() => {});
        const cur = dvAll()[did] || dr;
        cur.ph = (cur.ph || []).filter((n) => !done.includes(n));
        cur.phSent = (cur.phSent || 0) + got;
        cur.out = cur.ph.length ? { main: false } : null;
        if (cur.out === null && devEd && devEd.did === did) devEd.ph = [];
        dvPut(cur);
      }
    }
  } catch { /* pas de réseau : on réessaie plus tard */ } finally { devBusy = false; }
  if (!devEd) render();
}
// brouillons déjà reçus par le directeur, sans changement ni photo en attente : la version du directeur suffit
function dvClean() {
  const m = dvAll();
  let ch = false;
  for (const [did, dr] of Object.entries(m)) { const srv = dvSrv(did); if (srv && dr.sent && !dr.dirty && !dr.out && !(dr.ph || []).length) { delete m[did]; ch = true; } }
  if (ch) setJ(DK(), m);
}
function devCard() {
  const v = DV(), m = dvAll(), srv = (data.devis.mine || []);
  const rows = [];
  for (const dr of Object.values(m)) if (!srv.some((x) => x.did === dr.did)) rows.push({ did: dr.did, no: '', nom: dr.c.nom, titre: dr.titre, st: dr.sent ? 'wait' : 'draft', ed: true, pend: (dr.ph || []).length });
  for (const x of srv) { const loc = m[x.did]; rows.push({ did: x.did, no: x.no, nom: x.c.nom, titre: x.titre, st: x.st, ed: x.st === 'prep', pend: loc ? (loc.ph || []).length : 0, dirty: loc && loc.dirty }); }
  return `<div class="card mk mk-dev" id="devCard"><h2>${esc(v.t)}</h2><p class="meta" style="margin:0 0 10px">${esc(v.hint)}</p>
    <button class="btn block" data-dv-new="1">${esc(v.new)}</button>
    <p style="margin:14px 0 4px"><b>${esc(v.mine)}</b></p>
    ${rows.length ? rows.map((r) => `<div class="row"><span class="grow"><b>${esc(r.nom || '—')}</b>${r.titre ? ` · ${esc(r.titre)}` : ''}${r.no ? `<div class="meta">${esc(r.no)}</div>` : ''}
      <div class="meta">${esc(v.st[r.st] || r.st)}${r.pend ? ' · ' + esc(v.pend.replace('{n}', r.pend)) : ''}</div></span>
      ${r.ed ? `<button class="btn sm sec" data-dv-open="${esc(r.did)}">${esc(r.st === 'draft' ? v.open : v.edit)}</button>` : ''}</div>`).join('') : `<p class="meta" style="margin:0">${esc(v.none)}</p>`}</div>`;
}
const dvIn = (lbl, path, val, extra = '') => `<label>${esc(lbl)}</label><input type="text" data-dv="${path}" value="${esc(val)}" ${extra}>`;
function devEditor() {
  const v = DV(), dr = devEd, D = data.devis, st = dvAll()[dr.did] || dr;
  const sel = Object.fromEntries(dr.prest.filter((p) => /^c\d+i\d+$/.test(p.k)).map((p) => [p.k, p]));
  const free = dr.prest.filter((p) => /^f\d+$/.test(p.k));
  const pend = st.ph || [], nPh = (st.phSent || 0) + pend.length;
  const unitSel = (k, u) => `<select data-dvp="${esc(k)}" data-f="u">${D.units.map((x) => `<option${x === u ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select>`;
  const pq = (k, p, ph) => `<div class="dv-pq"><input type="number" step="0.01" min="0" inputmode="decimal" placeholder="${esc(v.q)}" data-dvp="${esc(k)}" data-f="q" value="${esc(p.q ?? '')}">${unitSel(k, p.u)}<input type="text" placeholder="${esc(ph || v.det)}" data-dvp="${esc(k)}" data-f="det" value="${esc(p.det || '')}"></div>`;
  const srv = dvSrv(dr.did), vs = dr.visa;
  return `<div id="devEd"><p style="margin:0 0 10px"><button class="btn sm sec" data-dv-back="1">${esc(v.back)}</button></p>
    <h1 style="margin:0 0 10px">${esc(v.t)}${srv ? ` <span class="meta">${esc(srv.no)}</span>` : ''}</h1>
    ${devMsg ? `<div class="card warnc"><p style="margin:0">${esc(devMsg)}</p></div>` : ''}
    <div class="card"><h2>👤 ${esc(v.client)}</h2>
      <label>${esc(v.ctype)}</label><select data-dv="c.type" data-redraw="1"><option value="part">${esc(v.part)}</option><option value="pro"${dr.c.type === 'pro' ? ' selected' : ''}>${esc(v.pro)}</option></select>
      ${dvIn(v.nom, 'c.nom', dr.c.nom, 'maxlength="120" required')}
      ${dr.c.type === 'pro' ? dvIn(v.rcs, 'c.rcs', dr.c.rcs, 'maxlength="20" autocapitalize="characters" placeholder="B123456"') + dvIn(v.tva, 'c.tva', dr.c.tva, 'maxlength="20" autocapitalize="characters" placeholder="LU12345678"') : ''}
      <label>${esc(v.adr)}</label><textarea data-dv="c.adresse" maxlength="300" style="min-height:60px">${esc(dr.c.adresse)}</textarea>
      <label>${esc(v.tel)}</label><input type="tel" data-dv="c.tel" maxlength="40" value="${esc(dr.c.tel)}" placeholder="+352…">
      <label>${esc(v.mail)}</label><input type="email" data-dv="c.email" maxlength="120" value="${esc(dr.c.email)}">
      ${dvIn(v.titre, 'titre', dr.titre, `maxlength="200" placeholder="${esc(v.titrePh)}"`)}
      ${dvIn(v.chantier, 'chantier', dr.chantier, `maxlength="300" placeholder="${esc(v.chantierPh)}"`)}
      ${dvIn(v.interloc, 'interloc', dr.interloc, 'maxlength="120"')}</div>
    <div class="card"><h2>${esc(v.photos)}</h2>
      ${st.phSent ? `<p class="meta" style="margin:0 0 6px">✓ ${esc(v.sentPh.replace('{n}', st.phSent))}</p>` : ''}
      ${pend.length ? `<div class="pb-thumbs">${pend.map((n) => `<span class="pb-th"><img data-dvimg="${esc(dr.did + ':' + n)}" alt=""><button type="button" data-dv-phdel="${n}" aria-label="✕">✕</button></span>`).join('')}</div>` : ''}
      ${nPh < 20 ? `<div class="btns"><label class="btn sm">${esc(T().x.cam)}<input type="file" accept="image/*" capture="environment" hidden data-dv-pick="1"></label><label class="btn sm sec">${esc(T().x.gal)}<input type="file" accept="image/*" multiple hidden data-dv-pick="1"></label></div>` : `<p class="meta" style="margin:0">${esc(v.max)}</p>`}
      <p class="meta" style="margin:6px 0 0">${nPh} / 20</p></div>
    <div class="card"><h2>📝 ${esc(v.rapport)}</h2><textarea data-dv="rapport" maxlength="6000" style="min-height:140px" placeholder="${esc(v.rapportPh)}">${esc(dr.rapport)}</textarea></div>
    <div class="card"><h2>${esc(v.prest)}</h2><p class="meta" style="margin:0 0 8px">${esc(v.prestHint)}</p>
      ${D.cat.map(([cat, items], ci) => { const n = items.filter((_, ii) => sel[`c${ci}i${ii}`]).length; return `<details class="dv-cat" data-dvcat="${ci}"${n || devCats.has(ci) ? ' open' : ''}><summary>${esc(cat)}${n ? ` <b class="dv-n">${n}</b>` : ''}</summary>
        ${items.map(([l, u, det], ii) => { const k = `c${ci}i${ii}`, p = sel[k]; return `<div class="dv-pi"><label class="dv-ck"><input type="checkbox" data-dvk="${k}"${p ? ' checked' : ''}> <span>${esc(l)}</span></label>${p ? pq(k, p, det ? v.det + ' : ' + det : '') : ''}</div>`; }).join('')}</details>`; }).join('')}
      <p style="margin:12px 0 4px"><b>${esc(v.free)}</b></p>
      ${free.map((p) => `<div class="dv-pi"><input type="text" placeholder="${esc(v.freePh)}" data-dvp="${esc(p.k)}" data-f="l" value="${esc(p.l)}" maxlength="200">${pq(p.k, p, '')}</div>`).join('')}
      <button class="btn sm sec" data-dv-free="1">${esc(v.addFree)}</button></div>
    <div class="card"><h2>👷 ${esc(v.rows)}</h2>
      ${dr.rows.map((r, n) => `<div class="dv-row"><select data-dvr="${n}" data-f="met"><option value="">${esc(v.met)}</option>${D.metiers.map(([k, l]) => `<option value="${esc(k)}"${r.met === k ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>
        <span class="dv-sfx"><input type="number" min="1" max="99" inputmode="numeric" data-dvr="${n}" data-f="nb" value="${esc(r.nb || '')}" placeholder="1"><i>${esc(v.ouvr)}</i></span>
        <span class="dv-sfx"><input type="number" min="0" step="0.5" inputmode="decimal" data-dvr="${n}" data-f="h" value="${esc(r.h || '')}" placeholder="0"><i>h</i></span></div>`).join('')}
      <button class="btn sm sec" data-dv-row="1">${esc(v.addRow)}</button>
      ${dvIn(v.jours, 'jours', dr.jours, `maxlength="80" placeholder="${esc(v.joursPh)}"`)}</div>
    <div class="card"><h2>${esc(v.visaT)}</h2><p class="meta" style="margin:0 0 8px">${esc(v.visaHint)}</p>
      ${vs ? `<p class="ok" style="margin:0 0 8px"><b>${esc(v.visaOk.replace('{n}', vs.nom || '—').replace('{d}', new Date(vs.at).toLocaleString(T().loc, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })))}</b></p><button class="btn sm sec" data-dv-visa-redo="1">${esc(v.visaRedo)}</button>`
        : `<label>${esc(v.visaNom)}</label><input type="text" id="dvVisaNom" maxlength="120" value="${esc(dr.interloc || dr.c.nom)}">
        <canvas class="sig-pad" width="600" height="220" style="display:block;width:100%;aspect-ratio:30/11;background:#fff;border:1.5px dashed #9aa5a0;border-radius:12px;touch-action:none;margin-top:8px"></canvas>
        <div style="display:flex;gap:8px;margin-top:8px"><button type="button" class="btn sec sm" data-sig-clear="1">${esc(v.clear)}</button><button type="button" class="btn sm grow" data-dv-visa="1">${esc(v.visaSign)}</button></div>`}</div>
    <div class="card"><button class="btn block" data-dv-send="1">${esc(st.sent ? v.resend : v.send)}</button>
      <button class="btn block sec" style="margin-top:8px" data-dv-save="1">${esc(v.save)}</button>
      ${!st.sent ? `<p style="text-align:center;margin:10px 0 0"><button class="linkb" data-dv-del="1">${esc(v.del)}</button></p>` : ''}</div></div>`;
}
const dvUrls = new Map();
function hydrateDv() {
  document.querySelectorAll('img[data-dvimg]').forEach((img) => {
    const k = img.dataset.dvimg;
    if (dvUrls.has(k)) { img.src = dvUrls.get(k); return; }
    phGet(k).then((b) => { if (!b) return; const bin = atob(b.replace(/-/g, '+').replace(/_/g, '/')); const u = URL.createObjectURL(new Blob([Uint8Array.from(bin, (c) => c.charCodeAt(0))], { type: 'image/jpeg' })); dvUrls.set(k, u); img.src = u; }).catch(() => {});
  });
}
const dvSet = (o, path, val) => { const ks = path.split('.'); let x = o; while (ks.length > 1) x = x[ks.shift()]; x[ks[0]] = val; };
app.addEventListener('input', (e) => {
  if (!devEd) return;
  const t = e.target, ds = t.dataset || {};
  if (ds.dv) dvSet(devEd, ds.dv, t.value);
  else if (ds.dvr) { const r = devEd.rows[+ds.dvr]; if (r) r[ds.f] = ds.f === 'met' ? t.value : t.value === '' ? '' : +t.value; }
  else if (ds.dvp) { const p = devEd.prest.find((x) => x.k === ds.dvp); if (p) p[ds.f] = ds.f === 'q' ? (t.value === '' ? '' : +t.value) : t.value; }
  else return;
  dvSave();
});
app.addEventListener('change', async (e) => {
  if (!devEd) return;
  const t = e.target, ds = t.dataset || {};
  if (ds.dvk) {
    const k = ds.dvk;
    if (t.checked) { const m = /^c(\d+)i(\d+)$/.exec(k), it = data.devis.cat[+m[1]][1][+m[2]]; devEd.prest.push({ k, l: it[0], q: '', u: it[1], det: '' }); devCats.add(+m[1]); }
    else devEd.prest = devEd.prest.filter((p) => p.k !== k);
    dvSave(); devRedraw = true; return render();
  }
  if (ds.dvPick && t.files.length) {
    const files = [...t.files];
    t.value = '';
    const cur = dvAll()[devEd.did] || devEd;
    const room = 20 - (cur.phSent || 0) - (cur.ph || []).length;
    if (room <= 0) return alert(DV().max);
    for (const f of files.slice(0, room)) {
      try {
        const b = await compress(f), c2 = dvAll()[devEd.did] || devEd, n = Math.max(c2.nx || 1, devEd.nx || 1);
        await phPut(devEd.did + ':' + n, b);
        c2.ph = [...(c2.ph || []), n]; c2.nx = n + 1; devEd.nx = n + 1; devEd.ph = c2.ph;
        dvPut(c2);
      } catch { /* image illisible */ }
    }
    if (files.length > room) alert(DV().max);
    devRedraw = true; return render();
  }
  if (ds.redraw || devRedraw) { dvSave(); devRedraw = true; render(); }
});
app.addEventListener('toggle', (e) => { const c = e.target.dataset && e.target.dataset.dvcat; if (c === undefined) return; if (e.target.open) devCats.add(+c); else devCats.delete(+c); }, true);
app.addEventListener('click', async (e) => {
  const v = DV();
  if (e.target.closest('[data-dv-new]')) return dvOpen('');
  const op = e.target.closest('[data-dv-open]');
  if (op) return dvOpen(op.dataset.dvOpen);
  if (!devEd) return;
  if (e.target.closest('[data-dv-back]') || e.target.closest('[data-dv-save]')) {
    if (e.target.closest('[data-dv-save]')) dvSave();
    devEd = null; devMsg = ''; flash = e.target.closest('[data-dv-save]') ? v.saved : ''; render(); document.getElementById('devCard')?.scrollIntoView({ block: 'start' }); return;
  }
  if (e.target.closest('[data-dv-row]')) { devEd.rows.push({ met: '', nb: 1, h: '' }); dvSave(); devRedraw = true; return render(); }
  if (e.target.closest('[data-dv-free]')) { const n = 1 + Math.max(-1, ...devEd.prest.filter((p) => /^f\d+$/.test(p.k)).map((p) => +p.k.slice(1))); devEd.prest.push({ k: 'f' + n, l: '', q: '', u: 'fft', det: '' }); dvSave(); devRedraw = true; return render(); }
  const pd = e.target.closest('[data-dv-phdel]');
  if (pd) {
    const n = +pd.dataset.dvPhdel, cur = dvAll()[devEd.did];
    if (cur) { cur.ph = (cur.ph || []).filter((x) => x !== n); dvPut(cur); devEd.ph = cur.ph; }
    await phDel(devEd.did + ':' + n).catch(() => {});
    devRedraw = true; return render();
  }
  if (e.target.closest('[data-dv-visa-redo]')) { devEd.visa = null; dvSave(); devRedraw = true; return render(); }
  if (e.target.closest('[data-dv-visa]')) {
    const c = app.querySelector('canvas.sig-pad'), nom = (document.getElementById('dvVisaNom') || {}).value || '';
    const blank = !c || !c.getContext('2d').getImageData(0, 0, c.width, c.height).data.some((x, i) => i % 4 === 3 && x > 0);
    if (blank) return alert(v.needSig);
    devEd.visa = { png: c.toDataURL('image/png'), nom: nom.trim().slice(0, 120), at: new Date().toISOString(), h: dvHash(devEd) };
    sigUrl = ''; devMsg = ''; dvSave(); devRedraw = true; return render();
  }
  if (e.target.closest('[data-dv-del]')) {
    if (!confirm(v.delQ)) return;
    const cur = dvAll()[devEd.did];
    for (const n of (cur && cur.ph) || []) await phDel(devEd.did + ':' + n).catch(() => {});
    dvDrop(devEd.did); devEd = null; return render();
  }
  if (e.target.closest('[data-dv-send]')) {
    if (!String(devEd.c.nom || '').trim()) return alert(v.needNom);
    if (!String(devEd.rapport || '').trim() && !devEd.prest.some((p) => p.l)) return alert(v.needWork);
    dvSave();
    const cur = dvAll()[devEd.did];
    Object.assign(cur, { sent: true, dirty: false, out: { main: true }, sentAt: new Date().toISOString() });
    dvPut(cur);
    devEd = null; devMsg = ''; flash = v.sentOk;
    render(); scrollTo(0, 0);
    await devFlush();
  }
});

async function load() {
  data = null;
  if (id && key) {
    try {
      const r = await fetch(`${API}/api/esp/${id}`, { cache: 'no-store' });
      if (r.ok) {
        const x = await openJson(key, await r.arrayBuffer());
        if (x && x.kind === 'equipe') data = x;
        else { loadErr = T().mismatch; try { localStorage.removeItem(ACC); } catch {} location.replace(`/espace.html#${id}.${key}`); return; }
      } else if (r.status === 404) { try { localStorage.removeItem(ACC); } catch {} id = key = ''; loadErr = T().off; }
    } catch { loadErr = '⚠ offline'; }
  }
  try { if (!localStorage.getItem('eqLang')) lang = pick(data); } catch { lang = pick(data); }
  if (data && data.devis) dvClean();
  render();
  flush();
  if (data) { pushInit(); devFlush(); }
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && id && key && !form && !devEd) load(); });
addEventListener('online', () => { flush(); devFlush(); });
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('/equipe-sw.js', { scope: '/equipe' }).catch(() => {});
lang = (() => { try { return localStorage.getItem('eqLang') || pick(null); } catch { return pick(null); } })();
load();
