// App de l'équipe : planning personnel (quoi, où, quand), « commencé / fini / pas fini » avec note et photos,
// horaire, absences, coordonnées. Le lien contient l'identifiant et la clé (#id.clé) ; la clé ne quitte jamais le téléphone.
import '/ares/reqmark.js';
import { openJson, openBytes, sealForOwner, codeHash, unwrapWithCode } from '/ares/espace-crypto.js';

import { videoEmbed } from '/ares/video-embed.js';
import { pubStatInit, pubSeen, pubTap } from '/ares/pubstat.js';
import { wxRadioCard, wxRadioInit } from '/ares/wxradio.js';
import { pushStatus, pushEnable, pushRefresh, setBadge } from '/ares/push-client.js';
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
const ICONS = { nettoyage: '🧹', reparation: '🔧', gros: '🚚', autre: '📌', entretien: '🔧' };
let data = null, lang = 'fr', loadErr = '', form = null, flash = '';
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
const QK = () => 'eqQueue:' + id, LK = () => 'eqLocal:' + id;
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
  return `<div class="tline${x.urgent && !done ? ' urgent' : ''}">${done ? '✅' : ICONS[x.type] || '📌'} <b>${esc(x.titre)}</b>${whenTag(x)}<div class="meta"><button class="linkb" data-place="${esc(x.adresse)}">📍 ${esc(x.adresse)}</button></div></div>`;
}
function taskCard(it, withBtns) {
  const t = T(), x = data.tasks[it.tid];
  if (!x) return '';
  const st = stateOf(it.tid, it.d);
  const tel = x.contact && x.contact.tel ? x.contact.tel.replace(/[^\d+]/g, '') : '';
  const done = st && st.st === 'fait';
  const f = form && form.tid === it.tid && form.d === it.d ? form : null;
  const btns = withBtns && !done && !f ? `<div class="btns">${!st || st.st !== 'encours' ? `<button class="btn sec" data-act="encours" data-tid="${it.tid}" data-d="${it.d}">${esc(t.start)}</button>` : ''}
      <button class="btn ok" data-act="fait" data-tid="${it.tid}" data-d="${it.d}">${esc(t.done)}</button>
      <button class="btn warn" data-act="incomplet" data-tid="${it.tid}" data-d="${it.d}">${esc(t.inc)}</button></div>` : '';
  const fh = f ? `<form class="act" data-tid="${it.tid}" data-d="${it.d}" data-st="${f.st}"><b>${esc(t.st[f.st])}</b>
      <label>${esc(f.st === 'incomplet' ? t.why : t.note)}</label><textarea name="note" placeholder="${esc(f.st === 'incomplet' ? t.whyPh : t.notePh)}" ${f.st === 'incomplet' ? 'required' : ''}></textarea>
      <div class="btns"><button class="btn" type="submit">${esc(t.send)}</button><button class="btn sec" type="button" data-cancel="1">${esc(t.cancel)}</button></div></form>` : '';
  return `<div class="task ${done ? 'done' : ''}${x.urgent && !done ? ' urgent' : ''}">
    <div class="tt">${ICONS[x.type] || '📌'} <b>${esc(x.titre)}</b>${whenTag(x)}${it.late ? ` <span class="tag bad">${esc(t.late)}</span>` : ''}</div>
    <div class="meta"><button class="linkb" data-place="${esc(x.adresse)}">📍 ${esc(x.adresse)}</button> · ${esc(x.lieu || t.commons)}${x.recur ? ' · 🔁 ' + esc(x.recur) : ''}</div>
    ${infoHtml(x, t)}
    ${st ? `<div class="stline ${st.st}">${esc(t.st[st.st])} · ${esc(fmt(st.at))} ${esc(t.at)} ${esc(st.h || (st.at || '').slice(11, 16))}${st.note ? ' — ' + esc(st.note) : ''}</div>` : ''}
    ${btns}${fh}${withBtns ? phBlock(it, x) : ''}</div>`;
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
  const ended = !!tm.end;
  let act = '';
  if (!tm.arr && !ended) act = `<form class="pres" data-stop="encours" data-tid="${it.tid}" data-d="${it.d}"><input type="time" name="h" value="${nowHM()}" required><button class="btn sm" type="submit">${esc(t.s.arrBtn)}</button></form>`;
  else if (!ended) act = `${phBlock(it, x)}${f ? `<form class="act" data-tid="${it.tid}" data-d="${it.d}" data-st="${f.st}"><b>${esc(t.st[f.st])}</b>
      <label>${esc(t.why)}</label><textarea name="note" placeholder="${esc(t.whyPh)}" required></textarea>
      <div class="btns"><button class="btn" type="submit">${esc(t.send)}</button><button class="btn sec" type="button" data-cancel="1">${esc(t.cancel)}</button></div></form>`
      : `<form class="pres" data-stop="fait" data-tid="${it.tid}" data-d="${it.d}"><input type="time" name="h" value="${nowHM()}" required><button class="btn sm ok" type="submit">${esc(t.s.depBtn)}</button></form>
      <button class="btn sm warn" style="margin-top:6px" data-act="incomplet" data-tid="${it.tid}" data-d="${it.d}">${esc(t.inc)}</button>`}`;
  return `<div class="stop${cur ? ' cur' : ''}${ended ? ' done' : ''}${x.urgent && !ended ? ' urgent' : ''}">
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
    return `<div class="phcol"><div class="phh">${esc(xx[ph])} <span class="meta">${n} / 6</span></div>${full ? `<div class="meta">${esc(xx.full)}</div>` : `<div class="btns"><label class="btn sm">${esc(xx.cam)}<input type="file" accept="image/*" capture="environment" hidden data-ph="${ph}" data-tid="${it.tid}" data-d="${it.d}"></label><label class="btn sm sec">${esc(xx.gal)}<input type="file" accept="image/*" multiple hidden data-ph="${ph}" data-tid="${it.tid}" data-d="${it.d}"></label></div>`}</div>`;
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
  return `<details class="card pub-box" data-pid="${esc(x.id)}"${pubShut.has(x.id) ? '' : ' open'}><summary><div class="meta"><b class="pub-lbl">📣 ${esc(t.ad.lbl)}</b> · ${esc(t.ad.cats[x.cat] || t.ad.cats.autre)}</div><b style="display:block;font-size:18px">${esc(x.nom)}</b></summary>${x.texte ? `<div>${esc(x.texte)}</div>` : ''}
    ${v ? `<div class="vid${v.tall ? ' tall' : ''}${v.audio ? ' audio' : ''}"${v.audio ? ` style="height:${v.audio}px"` : ''} data-vsrc="${esc(v.src)}"></div>` : ''}<div class="meta" style="margin-top:6px">📍 ${esc(x.adresse)}</div>
    <div class="btns"><button class="btn sm" data-place="${esc(x.adresse)}" data-pev="map">${esc(t.ad.see)}</button>${x.tel ? `<a class="btn sm sec" href="tel:${esc(x.tel.replace(/[^\d+]/g, ''))}" data-pev="call">${esc(t.ad.call)}</a>` : ''}${x.web ? `<a class="btn sm sec" href="${esc(x.web)}" target="_blank" rel="noopener" data-pev="web">${esc(t.ad.web)}</a>` : ''}${x.video && !v ? `<a class="btn sm sec" href="${esc(x.video)}" target="_blank" rel="noopener" data-pev="video">▶ Video</a>` : ''}</div></details>`;
}
// Lieux de travail (adresses du planning et de l'horaire) ; la carte du lieu choisi s'affiche sous « Bonjour »
let place = '';
const mapQ = (a) => (/luxemb|lëtzebuerg|deutschland|germany|france|belgi|portugal|espa|ital/i.test(a) ? a : a + ', Luxembourg');
function placesOf(d) {
  const seen = new Set(), outp = [];
  const add = (a) => { const k = (a || '').trim(); if (k && k !== 'Sans immeuble' && !seen.has(k.toLowerCase())) { seen.add(k.toLowerCase()); outp.push(k); } };
  for (const x of d.items.filter((z) => z.d >= today || z.late)) add((d.tasks[x.tid] || {}).adresse);
  for (const h of d.horaires || []) add(h.lieu);
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
  const top = (name, logo) => `<div class="top"><span class="brandx"><img class="top-logo" src="${esc(logo || '/ares/icons/nobis-logo.png')}" alt="" width="76" height="32"><b>${esc(name)}</b></span>${langs}</div>`;
  if (!data) {
    app.innerHTML = `${top('NOBIS s.a.r.l.')}
      <h1 style="text-align:center;margin-top:18px">👷 ${esc(t.app)}</h1><p class="sub" style="text-align:center">${esc(t.welcome)}</p>
      ${loadErr ? `<div class="card warnc"><p style="margin:0">${esc(loadErr)}</p></div>` : ''}
      <div class="card"><form id="codeForm"><label>${esc(t.code)}</label>
        <input type="text" name="code" autocomplete="one-time-code" autocapitalize="characters" spellcheck="false" placeholder="${esc(t.codePh)}" style="font-size:22px;letter-spacing:.08em;text-align:center" required>
        <button class="btn block" style="margin-top:12px" type="submit">${esc(t.enter)}</button></form>
        <p class="meta" style="text-align:center;margin:10px 0 0">${esc(t.noCode)}</p></div>
      <p class="meta" style="text-align:center">${esc(t.install)}</p>`;
    return;
  }
  const d = data, out = [];
  document.title = `${t.app} — ${d.societe.nom}`;
  out.push(`${top(d.societe.nom, d.societe.logo)}<h1>${esc(t.hello)} ${esc(d.prenom || d.nom)} 👋</h1><p class="sub">${esc([d.metier, d.societe.nom].filter(Boolean).join(' · '))}</p>`);
  const pls = placesOf(d);
  if (place && !pls.includes(place)) place = '';
  const pubs = (d.pubs || []).filter((x) => !x.fin || x.fin >= today);
  const slot = (k) => pickPub(pubs.filter((x) => (x.slot || 'milieu') === k));
  if (place) out.push(`<div class="card"><p style="margin:0 0 8px"><b>🗺️ ${esc(t.ad.mapT)}</b> · <span class="meta">📍 ${esc(place)}</span></p><div id="mapBox" class="map" data-q="${esc(mapQ(place))}"></div><a class="btn sec block" style="margin-top:8px" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapQ(place))}" target="_blank" rel="noopener">${esc(t.x.route)}</a>${slot('haut') ? `<button class="btn sec block" style="margin-top:8px" data-pubback="1">${esc(t.ad.back)}</button>` : ''}</div>`);
  else { const top = slot('haut'); if (top) out.push(adBox(top, t)); }
  if (pushSt && pushSt !== 'on') out.push(notifCard(t)); // notifications coupées : rappel en haut (sous la carte)
  // météo de la semaine + radio (comme dans l'app des locataires)
  out.push(wxRadioCard());
  const q = getJ(QK());
  if (q.length) out.push(`<div class="card warnc"><p style="margin:0 0 8px">${esc(t.pending(q.length))}</p><button class="btn sec sm" data-retry="1">${esc(t.retry)}</button></div>`);
  if (flash) out.push(`<div class="card okc"><p style="margin:0">${esc(flash)}</p></div>`);
  const absNow = (d.absences || []).find((a) => a.debut <= today && (!a.fin || a.fin >= today));
  if (absNow) out.push(`<div class="card warnc"><p style="margin:0"><b>${esc(t.absNow(t.types[absNow.type] || absNow.type, fmt(absNow.fin)))}</b></p></div>`);
  const todays = d.items.filter((x) => x.d <= today && (x.d === today || x.late)).sort(byHour);
  const dow = (new Date().getDay() + 6) % 7;
  const hsToday = (d.horaires || []).filter((h) => h.j === dow).sort((a, b) => (a.de || '').localeCompare(b.de || ''));
  const hrow = (h) => `<div class="hday"><b>${esc(t.days[h.j])}</b><span class="hh">🕒 ${esc(t.w.arr)} <b>${esc(h.de)}</b> · ${esc(t.w.dep)} <b>${esc(h.a)}</b></span>${h.lieu ? `<button class="place" data-place="${esc(h.lieu)}" aria-pressed="${h.lieu === place}">📍 ${esc(h.lieu)}</button>` : ''}</div>`;
  const todayAt = out.length;
  out.push(`<div class="card" id="todayCard"><h2>📅 ${esc(t.w.today)} · ${esc(fmtDay(today))}</h2>${hsToday.map(hrow).join('')}${todays.length ? todays.map(taskLine).join('') : hsToday.length ? '' : `<p class="meta" style="margin:0">${esc(t.none)}</p>`}${hsToday.some((h) => h.lieu) || todays.length ? `<p class="meta" style="margin:8px 0 0">${esc(t.x.placesHint)}</p>` : ''}</div>`);
  { const mid = slot('milieu'); if (mid) out.push(adBox(mid, t)); }
  const nexts = d.items.filter((x) => x.d > today).sort(byHour);
  const byDay = {};
  for (const x of nexts) (byDay[x.d] ||= []).push(x);
  const hOf = (dd) => (d.horaires || []).filter((h) => h.j === (new Date(dd + 'T12:00:00').getDay() + 6) % 7).sort((a, b) => (a.de || '').localeCompare(b.de || ''));
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
  // Mon horaire : la personne écrit son arrivée / son départ, et signale ce qui ne va pas (3 photos minimum)
  const pr = presOf(today), pp = t.p;
  const presH = (`<div id="presCard" class="pres-in"><h2>🕒 ${esc(pp.me)} · ${esc(fmtDay(today))}</h2><p class="meta" style="margin:0 0 8px">${esc(todays.length ? t.s.hint : pp.hint)}</p>
    ${hsToday.length ? `<p class="meta" style="margin:0 0 8px">${esc(pp.planned)} : ${hsToday.map((h) => `${esc(h.de)}–${esc(h.a)}`).join(' · ')}</p>` : ''}
    ${todays.length ? (() => { const ci = todays.findIndex((x) => !stopTimes(x.tid, x.d).end); return todays.map((x, i) => stopCard(x, i === ci)).join(''); })() : `<p style="margin:0"><b>${esc(t.s.day)}</b></p>` + ['arr', 'dep'].map((k) => `<form class="pres" data-pres="${k}"><span class="pres-l">${k === 'arr' ? '🟢' : '🔴'} ${esc(pp[k])}</span><input type="time" name="h" value="${esc(pr[k] || (k === 'dep' && !pr.arr ? '' : nowHM()))}" required><button class="btn sm${pr[k] ? ' sec' : ''}" type="submit">${esc(pp.send)}</button>${pr[k] ? `<span class="pres-ok">✓ ${esc(pr[k])}</span>` : ''}</form>`).join('')}
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
  out.push(`<div class="card"><details class="more"><summary>👤 ${esc(t.info)}</summary>
      ${[[t.tel, d.me.tel], [t.mail, d.me.mail], [t.adr, d.me.adresse], [t.ville, d.me.ville]].map(([k, v]) => `<div class="row"><span class="meta" style="width:130px">${esc(k)}</span><b class="grow">${esc(v || '—')}</b></div>`).join('')}
      <p class="meta" style="margin:8px 0 0">${esc(t.x.infoRO)}</p></details></div>`);
  if (pushSt === 'on') out.push(notifCard(t));
  out.push(`<p class="meta" style="text-align:center">${esc(t.install)}</p>
    <div class="card notice"><p class="meta" style="margin:0">🔒 ${esc(t.rgpd)}</p><p class="meta" style="margin:8px 0 0"><a href="#" data-logout="1">${esc(t.logout)}</a> · ${esc(t.personal)}${d.societe.tel ? ` · ${esc(d.societe.nom)} <a href="tel:${esc(d.societe.tel.replace(/[^\d+]/g, ''))}">${esc(d.societe.tel)}</a>` : ''}</p></div>`);
  { const low = slot('bas'); if (low) out.push(adBox(low, t)); }
  out.push(`<div class="ticker" data-vsrc="${API}/ticker"></div>`);
  const keepMap = document.querySelector('#mapBox iframe');
  const keepVid = new Map([...document.querySelectorAll('.vid iframe, .ticker iframe')].map((f) => [f.dataset.src, f]));
  app.innerHTML = out.join('');
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
  const lb = e.target.closest('[data-lang]');
  if (lb) { lang = lb.dataset.lang; try { localStorage.setItem('eqLang', lang); } catch {} if (pushSt === 'on') pushRefresh('/equipe', pushPost); return render(); }
  if (e.target.closest('[data-logout]')) { e.preventDefault(); try { localStorage.removeItem(ACC); } catch {} id = key = ''; data = null; loadErr = ''; return render(); }
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
    const ta = app.querySelector('form.act textarea'); if (ta) ta.focus();
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
    await queue({ k: 'task', tid: f.dataset.tid, d: f.dataset.d, st: f.dataset.stop, note: '', h: v, photos: [], at: new Date().toISOString() });
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
  if (f.id === 'pbForm') {
    const note = f.note.value.trim();
    if (!note || pbPhotos.length < 3) return;
    btn.disabled = true; btn.textContent = '…';
    const dow0 = (new Date().getDay() + 6) % 7, h0 = (data.horaires || []).find((h) => h.j === dow0 && h.lieu);
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
      const note = f.note.value.trim();
      if (f.dataset.st === 'incomplet' && !note) { alert(t.need); btn.disabled = false; btn.textContent = t.send; return; }
      form = null;
      await queue({ k: 'task', tid: f.dataset.tid, d: f.dataset.d, st: f.dataset.st, note, photos: [], at: new Date().toISOString() });
      flash = t.sent;
    } else if (f.id === 'absForm') {
      const photos = f.photo.files[0] ? [await compress(f.photo.files[0])] : [];
      await queue({ k: 'abs', type: f.type.value, debut: f.debut.value, fin: f.fin.value, note: f.note.value.trim(), photos, at: new Date().toISOString() });
      flash = t.sickOk;
    } else if (f.id === 'infoForm') {
      await queue({ k: 'info', tel: f.tel.value, mail: f.mail.value, adresse: f.adresse.value, ville: f.ville.value, at: new Date().toISOString() });
      flash = t.infoOk;
    }
  } catch (err) { alert('⚠ ' + (err.message || err)); }
  render();
  scrollTo(0, 0);
});

app.addEventListener('input', (e) => { if (e.target.form && e.target.form.id === 'pbForm' && e.target.name === 'note') pbNote = e.target.value; });
app.addEventListener('change', async (e) => {
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
  render();
  flush();
  if (data) pushInit();
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && id && key && !form) load(); });
addEventListener('online', () => flush());
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('/equipe-sw.js', { scope: '/equipe' }).catch(() => {});
lang = (() => { try { return localStorage.getItem('eqLang') || pick(null); } catch { return pick(null); } })();
load();
