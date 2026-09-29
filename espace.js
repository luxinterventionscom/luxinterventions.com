// Espace locataire : page personnelle, en lecture seule (+ signaler un problème).
// Le lien contient l'identifiant et la clé (#id.clé) ; la clé ne quitte jamais le téléphone.
import { openJson, sealJson, openBytes, sealForOwner, codeHash, unwrapWithCode } from '/ares/espace-crypto.js';

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

const L = {
  fr: {
    ins: {"iosS": ["Dans la barre de Safari tout en bas de l’écran (pas dans cette page), touchez Partager {S}. Sur iPhone récent (iOS 26), touchez d’abord les trois points ⋯ en bas à droite, puis « Partager ». Pas de barre ? Faites défiler la page un peu vers le haut.", "Dans la liste qui s’ouvre, descendez et touchez « Sur l’écran d’accueil » ➕.", "Touchez « Ajouter » en haut à droite : l’icône ARES apparaît sur votre écran."], "iosC": ["Touchez l’icône Partager {S} en haut à droite, dans la barre d’adresse.", "Touchez « Ajouter à l’écran d’accueil », puis « Ajouter »."], "and": ["Touchez le menu ⋮ en haut à droite de Chrome.", "Touchez « Installer l’application » ou « Ajouter à l’écran d’accueil », puis « Installer »."], "app": "Vous êtes dans le navigateur d’une autre app (Facebook, Instagram…). Ouvrez d’abord ce lien dans Safari ou Chrome : menu ⋯ → « Ouvrir dans le navigateur ».", "tip": "« Sur l’écran d’accueil » n’apparaît pas ? Tout en bas de la liste, touchez « Modifier les actions » et ajoutez-le. En navigation privée, ouvrez un onglet normal.", "copy": "Copier le lien"},
    g: {"sub": "puis ouvrez l’app en touchant l’icône ARES", "i1": "Tout en bas de l’écran, dans la barre de Safari, touchez les trois points ⋯ (ou directement l’icône Partager).", "i2": "Touchez « Partager ».", "i3": "Faites défiler et touchez « Sur l’écran d’accueil ».", "i4": "Touchez « Ajouter » en haut à droite.", "done": "C’est fait ! Pour aller dans l’app, touchez l’icône ARES sur votre écran.", "a1": "En haut à droite de Chrome, touchez les trois points ⋮.", "a2": "Touchez « Installer l’application » (ou « Ajouter à l’écran d’accueil »).", "a3": "Touchez « Installer ».", "safari": "Sur iPhone, ouvrez cette page avec Safari."},
    ui: {"share": "Partager", "a2hs": "Sur l’écran d’accueil", "add": "Ajouter", "cancel": "Annuler", "fav": "Ajouter aux favoris", "find": "Rechercher dans la page", "newTab": "Nouvel onglet", "hist": "Historique", "ainstall": "Installer l’application", "ainstallBtn": "Installer"},
    hr: {"R": ["Calme : pas de bruit entre 22 h et 7 h, ni le dimanche et les jours fériés ; musique et appels à volume modéré.", "Propreté : cuisine, salle de bain et parties communes propres après chaque utilisation ; vaisselle lavée et rangée le jour même.", "Évacuations : pas de cheveux, restes de nourriture, huile ou lingettes dans les éviers, douches et WC.", "Déchets : trier selon les consignes et sortir les poubelles le bon jour (voir « Collectes des déchets »).", "Tabac : il est interdit de fumer ou de vapoter à l’intérieur.", "Visiteurs : pas d’hébergement d’une autre personne ni de sous-location sans accord écrit du gestionnaire.", "Sécurité : fermer la porte d’entrée, ne jamais donner clés ou codes, ne rien laisser dans les couloirs, pas de chauffage d’appoint ni de bouteille de gaz.", "Énergie : fermer les fenêtres quand le chauffage est allumé, éteindre lumières et appareils inutiles.", "Problèmes : signaler tout de suite un dégât ou une panne, depuis l’app.", "Respect : pas d’insultes, de menaces ni de discriminations. Les messages de la maison sont lus par le gestionnaire, qui peut intervenir."], "rulesT": "Règlement de la maison", "rulesExtra": "Règles propres à votre immeuble", "rulesAccept": "✓ J’ai lu et j’accepte le règlement", "rulesOk": "Règlement accepté le", "board": "Messages de la maison", "boardHint": "Mini-chat entre les habitants de votre logement. Le gestionnaire lit aussi les messages pour éviter les conflits : restez courtois.", "boardPh": "Votre message…", "boardEmpty": "Aucun message pour le moment. Écrivez le premier !", "boardFirst": "Pour écrire, acceptez d’abord le règlement de la maison.", "mgr": "Gestionnaire", "refresh": "↻ Actualiser", "rgpd2": "Si les messages de la maison sont activés, ce que vous y écrivez est visible par les autres habitants de votre logement et par votre gestionnaire (prévention des conflits, intérêt légitime) ; ces messages sont chiffrés et effacés automatiquement après 90 jours. Votre acceptation du règlement est enregistrée avec sa date."},
    rc: { btn: '📄 Récapitulatif de tous mes loyers payés', title: 'Récapitulatif des loyers payés', cols: ['Mois', 'Loyer', 'Payé', 'Date du paiement'], total: 'Total', partial: 'paiement partiel', paidN: (n) => `${n} mois payé${n > 1 ? 's' : ''}`,
      text: (s, n, a, f, to) => `Je soussigné(e), ${s}, locataire principal et bailleur, déclare avoir reçu de ${n} les sommes détaillées ci-dessus, soit un total de ${a}, au titre des loyers de ${f} à ${to}, et lui en donne quittance.` },
    more: (n) => `Voir les ${n} suivantes`,
    loc: 'fr-LU', door: 'Code de ma porte', since: 'depuis le', app: 'App des locataires ARES S.A.', welcome: 'Vos loyers, quittances, documents et collectes — et signaler un problème, depuis votre téléphone.', code: 'Votre code d’accès personnel', codePh: 'ex. K7PM2-QXA4H', enter: 'Entrer', noCode: 'Pas de code ? Demandez-le à votre gestionnaire.', badCode: 'Code inconnu. Vérifiez-le ou demandez un nouveau code.', install: "Installer l’icône sur mon téléphone", iosHow: 'iPhone : touchez Partager puis « Sur l’écran d’accueil ».', andHow: 'Android : menu ⋮ puis « Installer l’application ».', logout: 'Se déconnecter de ce téléphone', title: 'Mon espace locataire', hello: 'Bonjour', avis: 'Avis de l’immeuble', pay: 'Mes loyers', restNow: 'Impayé à ce jour', upcoming: 'à venir', allPaid: 'Tout est payé à ce jour ✓',
    iban: 'Pour payer', ref: 'Communication', quit: 'Mes quittances', quitBtn: 'Quittance', partial: 'Reçu partiel', contrat: 'Mon contrat', entry: 'Entrée', end: 'Fin du contrat', rent: 'Loyer', revision: 'Prochaine révision', caution: 'Garantie',
    docs: 'Mon dossier', dossierHint: 'Documents et preuves que nous avons enregistrés pour vous (touchez 👁 pour voir). Une erreur ou un document manquant ? Dites-le-nous.', errBtn: '⚠️ Signaler une erreur', recv: 'reçue le', proof: 'Preuve', modes: { especes: 'en main propre', virement: 'par virement', cheque: 'par chèque', garantie: 'garantie bancaire', autre: '' }, dt: { bail: 'Contrat de bail', identite: 'Pièce d’identité', cns: 'Carte CNS', caution: 'Preuve de la caution', loyer: 'Preuve de paiement du loyer', assurance: 'Assurance habitation', revenus: 'Revenus', titre: 'Titre de séjour', autre: 'Document' }, coll: 'Collectes des déchets', putOut: 'sortir', truck: 'passage du camion le', calAdd: '📅 Ajouter les collectes à mon calendrier', signal: 'Signaler un problème', what: 'Quel problème ?', whatPh: 'ex. Fuite sous l’évier de la cuisine depuis ce matin', type: 'Type', types: { rep: '🔧 Réparation / panne', menage: '🧹 Propreté / nettoyage', dossier: '📄 Erreur dans mon dossier / mes paiements', autre: '📌 Autre' },
    photos: 'Photos (3 maximum)', tel: 'Téléphone pour vous joindre (facultatif)', dispo: 'Quand êtes-vous disponible ? (facultatif)', send: 'Envoyer', sent: 'Merci, votre message a été envoyé. Vous verrez ici quand il sera pris en charge.', mine: 'Mes signalements',
    st: { afaire: 'Reçu', planifie: 'Planifié', fait: 'Terminé' }, lights: ['Il y a le temps', 'Attention : demain ou après-demain', 'Aujourd’hui'], legend: 'Légende',
    months: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'], monthsFull: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
    off: 'Cet espace n’est plus actif. Contactez votre gestionnaire.', bad: 'Lien incomplet. Ouvrez le lien exactement comme vous l’avez reçu.', personal: 'Ce lien est personnel : ne le partagez pas.', updated: 'Mis à jour le',
    rgpdT: 'Protection de vos données (RGPD)',
    rgpd: (s) => `Cet espace est géré par ${s.nom}${s.adresse ? ', ' + s.adresse + ' ' + s.ville : ''}, votre bailleur (locataire principal). Il affiche uniquement vos propres informations de location (loyers, contrat, documents partagés) pour vous permettre de les consulter ; base légale : l'exécution de votre contrat de location. Vos données sont chiffrées : la clé se trouve seulement dans votre lien personnel, ni l'hébergeur (Cloudflare) ni personne d'autre ne peut les lire. Les messages que vous envoyez ne sont lisibles que par votre gestionnaire et servent uniquement à traiter votre demande. L'espace est désactivé à la fin de votre location ; les données de location sont conservées la durée du bail plus 10 ans (obligations comptables). Vous pouvez demander l'accès, la rectification ou l'effacement de vos données${s.email ? ' à ' + s.email : ' à votre gestionnaire'}, et introduire une réclamation auprès de la CNPD (cnpd.public.lu). Aucun cookie publicitaire, aucun suivi.`,
    quitTitle: 'Quittance de loyer', quitPart: 'Reçu de paiement partiel', landlord: 'Locataire principal (bailleur)', tenant: 'Sous-locataire', period: (m, y) => `Période : ${m} ${y}`,
    quitText: (s, n, a, m, y) => `Je soussigné(e), ${s}, locataire principal et bailleur, déclare avoir reçu de ${n} la somme de ${a} au titre du loyer de ${m} ${y}, et lui en donne quittance.`, print: 'Imprimer / enregistrer en PDF', close: 'Fermer',
  },
  it: {
    ins: {"iosS": ["Nella barra di Safari in fondo allo schermo (non in questa pagina) tocca Condividi {S}. Su iPhone recenti (iOS 26) tocca prima i tre puntini ⋯ in basso a destra, poi « Condividi ». Non vedi la barra? Scorri un po’ la pagina verso l’alto.", "Nell’elenco che si apre scorri in basso e tocca « Aggiungi alla schermata Home » ➕.", "Tocca « Aggiungi » in alto a destra: l’icona ARES compare sul tuo schermo."], "iosC": ["Tocca l’icona Condividi {S} in alto a destra, nella barra dell’indirizzo.", "Tocca « Aggiungi alla schermata Home », poi « Aggiungi »."], "and": ["Tocca il menu ⋮ in alto a destra di Chrome.", "Tocca « Installa app » o « Aggiungi a schermata Home », poi « Installa »."], "app": "Sei nel browser di un’altra app (Facebook, Instagram…). Apri prima questo link in Safari o Chrome: menu ⋯ → « Apri nel browser ».", "tip": "Non trovi « Aggiungi alla schermata Home »? In fondo all’elenco tocca « Modifica azioni » e aggiungilo. In navigazione privata apri una scheda normale.", "copy": "Copia il link"},
    g: {"sub": "poi apri l’app toccando l’icona ARES", "i1": "In fondo allo schermo, nella barra di Safari, tocca i tre puntini ⋯ (o direttamente l’icona Condividi).", "i2": "Tocca « Condividi ».", "i3": "Scorri e tocca « Aggiungi alla schermata Home ».", "i4": "Tocca « Aggiungi » in alto a destra.", "done": "Fatto! Per entrare nell’app tocca l’icona ARES sul tuo schermo.", "a1": "In alto a destra di Chrome tocca i tre puntini ⋮.", "a2": "Tocca « Installa app » (o « Aggiungi a schermata Home »).", "a3": "Tocca « Installa ».", "safari": "Su iPhone apri questa pagina con Safari."},
    ui: {"share": "Condividi", "a2hs": "Aggiungi alla schermata Home", "add": "Aggiungi", "cancel": "Annulla", "fav": "Aggiungi ai preferiti", "find": "Trova nella pagina", "newTab": "Nuova scheda", "hist": "Cronologia", "ainstall": "Installa app", "ainstallBtn": "Installa"},
    hr: {"R": ["Silenzio: niente rumori tra le 22 e le 7, né la domenica e i festivi; musica e telefonate a volume moderato.", "Pulizia: cucina, bagno e spazi comuni puliti dopo ogni uso; piatti lavati e riposti in giornata.", "Scarichi: niente capelli, avanzi di cibo, olio o salviette in lavandini, docce e WC.", "Rifiuti: fare la differenziata e portare fuori i bidoni il giorno giusto (vedi « Raccolta rifiuti »).", "Fumo: è vietato fumare o svapare all’interno.", "Ospiti: non si può ospitare un’altra persona né subaffittare senza accordo scritto del gestore.", "Sicurezza: chiudere il portone, non dare mai chiavi o codici, non lasciare nulla nei corridoi, niente stufette né bombole di gas.", "Energia: chiudere le finestre con il riscaldamento acceso, spegnere luci e apparecchi inutili.", "Problemi: segnalare subito ogni danno o guasto dall’app.", "Rispetto: niente insulti, minacce o discriminazioni. I messaggi della casa sono letti dal gestore, che può intervenire."], "rulesT": "Regolamento della casa", "rulesExtra": "Regole particolari del tuo stabile", "rulesAccept": "✓ Ho letto e accetto il regolamento", "rulesOk": "Regolamento accettato il", "board": "Bacheca della casa", "boardHint": "Mini-chat tra gli abitanti del tuo alloggio. Anche il gestore legge i messaggi per evitare litigi: resta cortese.", "boardPh": "Il tuo messaggio…", "boardEmpty": "Ancora nessun messaggio. Scrivi il primo!", "boardFirst": "Per scrivere, accetta prima il regolamento della casa.", "mgr": "Gestore", "refresh": "↻ Aggiorna", "rgpd2": "Se la bacheca della casa è attiva, ciò che vi scrivi è visibile agli altri abitanti del tuo alloggio e al gestore (prevenzione dei conflitti, interesse legittimo); i messaggi sono cifrati e cancellati automaticamente dopo 90 giorni. L’accettazione del regolamento viene registrata con la data."},
    rc: { btn: '📄 Riepilogo di tutti i miei affitti pagati', title: 'Riepilogo degli affitti pagati', cols: ['Mese', 'Affitto', 'Pagato', 'Data del pagamento'], total: 'Totale', partial: 'pagamento parziale', paidN: (n) => `${n} mes${n > 1 ? 'i' : 'e'} pagat${n > 1 ? 'i' : 'o'}`,
      text: (s, n, a, f, to) => `Il/la sottoscritto/a, ${s}, locatario principale e locatore, dichiara di aver ricevuto da ${n} le somme dettagliate sopra, per un totale di ${a}, a titolo di affitto da ${f} a ${to}, e ne rilascia quietanza.` },
    more: (n) => `Vedi le altre ${n}`,
    loc: 'it-IT', door: 'Codice della mia porta', since: 'dal', app: 'App degli inquilini ARES S.A.', welcome: 'I tuoi affitti, ricevute, documenti e raccolte dei rifiuti — e segnalare un problema, dal telefono.', code: 'Il tuo codice d’accesso personale', codePh: 'es. K7PM2-QXA4H', enter: 'Entra', noCode: 'Non hai il codice? Chiedilo al tuo gestore.', badCode: 'Codice sconosciuto. Controllalo o chiedi un nuovo codice.', install: "Installa l’icona sul mio telefono", iosHow: 'iPhone: tocca Condividi e poi « Aggiungi alla schermata Home ».', andHow: 'Android: menu ⋮ e poi « Installa app ».', logout: 'Esci da questo telefono', title: 'Il mio spazio inquilino', hello: 'Ciao', avis: 'Avvisi del palazzo', pay: 'I miei affitti', restNow: 'Da pagare a oggi', upcoming: 'in scadenza', allPaid: 'Tutto pagato a oggi ✓',
    iban: 'Per pagare', ref: 'Causale', quit: 'Le mie ricevute', quitBtn: 'Ricevuta', partial: 'Ricevuta parziale', contrat: 'Il mio contratto', entry: 'Entrata', end: 'Fine del contratto', rent: 'Affitto', revision: 'Prossima revisione', caution: 'Cauzione',
    docs: 'La mia pratica', dossierHint: 'Documenti e prove che abbiamo registrato per te (tocca 👁 per vederli). Un errore o un documento mancante? Diccelo.', errBtn: '⚠️ Segnala un errore', recv: 'ricevuta il', proof: 'Prova', modes: { especes: 'a mano (contanti)', virement: 'con bonifico', cheque: 'con assegno', garantie: 'garanzia bancaria', autre: '' }, dt: { bail: 'Contratto di locazione', identite: 'Documento d’identità', cns: 'Tessera sanitaria (CNS)', caution: 'Prova della cauzione', loyer: 'Prova di pagamento dell’affitto', assurance: 'Assicurazione casa', revenus: 'Redditi', titre: 'Permesso di soggiorno', autre: 'Documento' }, coll: 'Raccolta rifiuti', putOut: 'mettere fuori', truck: 'passaggio del camion il', calAdd: '📅 Aggiungi le raccolte al mio calendario', signal: 'Segnala un problema', what: 'Quale problema?', whatPh: 'es. Perdita d’acqua sotto il lavello della cucina da stamattina', type: 'Tipo', types: { rep: '🔧 Riparazione / guasto', menage: '🧹 Pulizia', dossier: '📄 Errore nella mia pratica / nei pagamenti', autre: '📌 Altro' },
    photos: 'Foto (massimo 3)', tel: 'Telefono per contattarti (facoltativo)', dispo: 'Quando sei disponibile? (facoltativo)', send: 'Invia', sent: 'Grazie, il tuo messaggio è stato inviato. Qui vedrai quando verrà preso in carico.', mine: 'Le mie segnalazioni',
    st: { afaire: 'Ricevuta', planifie: 'Pianificata', fait: 'Conclusa' }, lights: ['C’è tempo', 'Attenzione: domani o dopodomani', 'Oggi'], legend: 'Legenda',
    months: ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'], monthsFull: ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'],
    off: 'Questo spazio non è più attivo. Contatta il tuo gestore.', bad: 'Link incompleto. Apri il link esattamente come l’hai ricevuto.', personal: 'Questo link è personale: non condividerlo.', updated: 'Aggiornato il',
    rgpdT: 'Protezione dei tuoi dati (GDPR)',
    rgpd: (s) => `Questo spazio è gestito da ${s.nom}${s.adresse ? ', ' + s.adresse + ' ' + s.ville : ''}, il tuo locatore (locatario principale). Mostra solo le tue informazioni di locazione (affitti, contratto, documenti condivisi) per permetterti di consultarle; base giuridica: l'esecuzione del tuo contratto di locazione. I tuoi dati sono cifrati: la chiave si trova solo nel tuo link personale, né l'hosting (Cloudflare) né nessun altro può leggerli. I messaggi che invii possono essere letti solo dal tuo gestore e servono solo a trattare la tua richiesta. Lo spazio viene disattivato alla fine della locazione; i dati sono conservati per la durata del contratto più 10 anni (obblighi contabili). Puoi chiedere l'accesso, la rettifica o la cancellazione dei tuoi dati${s.email ? ' a ' + s.email : ' al tuo gestore'} e presentare reclamo alla CNPD (cnpd.public.lu). Nessun cookie pubblicitario, nessun tracciamento.`,
    quitTitle: 'Ricevuta d’affitto (Quittance de loyer)', quitPart: 'Ricevuta di pagamento parziale', landlord: 'Locatario principale (locatore)', tenant: 'Sublocatario', period: (m, y) => `Periodo: ${m} ${y}`,
    quitText: (s, n, a, m, y) => `Il/La sottoscritto/a ${s}, locatario principale e locatore, dichiara di aver ricevuto da ${n} la somma di ${a} a titolo di affitto per ${m} ${y}, e ne rilascia quietanza.`, print: 'Stampa / salva in PDF', close: 'Chiudi',
  },
  de: {
    ins: {"iosS": ["Tippen Sie in der Safari-Leiste ganz unten am Bildschirm (nicht auf dieser Seite) auf Teilen {S}. Auf neueren iPhones (iOS 26) zuerst unten rechts auf die drei Punkte ⋯, dann auf „Teilen“. Keine Leiste? Scrollen Sie die Seite etwas nach oben.", "Scrollen Sie in der Liste nach unten und tippen Sie auf „Zum Home-Bildschirm“ ➕.", "Tippen Sie oben rechts auf „Hinzufügen“: das ARES-Symbol erscheint auf Ihrem Bildschirm."], "iosC": ["Tippen Sie oben rechts in der Adressleiste auf das Teilen-Symbol {S}.", "Tippen Sie auf „Zum Home-Bildschirm“, dann auf „Hinzufügen“."], "and": ["Tippen Sie oben rechts in Chrome auf das Menü ⋮.", "Tippen Sie auf „App installieren“ oder „Zum Startbildschirm hinzufügen“, dann auf „Installieren“."], "app": "Sie sind im Browser einer anderen App (Facebook, Instagram…). Öffnen Sie diesen Link zuerst in Safari oder Chrome: Menü ⋯ → „Im Browser öffnen“.", "tip": "„Zum Home-Bildschirm“ fehlt? Ganz unten in der Liste auf „Aktionen bearbeiten“ tippen und hinzufügen. Im privaten Modus einen normalen Tab öffnen.", "copy": "Link kopieren"},
    g: {"sub": "dann die App über das ARES-Symbol öffnen", "i1": "Ganz unten in der Safari-Leiste auf die drei Punkte ⋯ tippen (oder direkt auf das Teilen-Symbol).", "i2": "Auf „Teilen“ tippen.", "i3": "Nach unten scrollen und auf „Zum Home-Bildschirm“ tippen.", "i4": "Oben rechts auf „Hinzufügen“ tippen.", "done": "Fertig! Um die App zu öffnen, tippen Sie auf das ARES-Symbol auf Ihrem Bildschirm.", "a1": "Oben rechts in Chrome auf die drei Punkte ⋮ tippen.", "a2": "Auf „App installieren“ (oder „Zum Startbildschirm hinzufügen“) tippen.", "a3": "Auf „Installieren“ tippen.", "safari": "Auf dem iPhone diese Seite mit Safari öffnen."},
    ui: {"share": "Teilen", "a2hs": "Zum Home-Bildschirm", "add": "Hinzufügen", "cancel": "Abbrechen", "fav": "Zu Favoriten hinzufügen", "find": "Auf der Seite suchen", "newTab": "Neuer Tab", "hist": "Verlauf", "ainstall": "App installieren", "ainstallBtn": "Installieren"},
    hr: {"R": ["Ruhe: kein Lärm zwischen 22 und 7 Uhr sowie an Sonn- und Feiertagen; Musik und Telefonate in angemessener Lautstärke.", "Sauberkeit: Küche, Bad und Gemeinschaftsräume nach jeder Benutzung sauber hinterlassen; Geschirr am selben Tag spülen und wegräumen.", "Abflüsse: keine Haare, Essensreste, Öl oder Feuchttücher in Spülen, Duschen und WC.", "Abfall: nach Vorschrift trennen und die Tonnen am richtigen Tag rausstellen (siehe „Müllabfuhr“).", "Rauchen: Rauchen und Dampfen ist in den Räumen verboten.", "Besuch: keine weitere Person beherbergen und keine Untervermietung ohne schriftliche Zustimmung der Verwaltung.", "Sicherheit: Haustür schließen, nie Schlüssel oder Codes weitergeben, nichts in den Fluren abstellen, keine Heizlüfter oder Gasflaschen.", "Energie: Fenster schließen, wenn geheizt wird; unnötiges Licht und Geräte ausschalten.", "Probleme: Schäden oder Defekte sofort über die App melden.", "Respekt: keine Beleidigungen, Drohungen oder Diskriminierung. Die Nachrichten des Hauses liest die Verwaltung mit und kann eingreifen."], "rulesT": "Hausordnung", "rulesExtra": "Besondere Regeln Ihres Hauses", "rulesAccept": "✓ Ich habe die Hausordnung gelesen und akzeptiere sie", "rulesOk": "Hausordnung akzeptiert am", "board": "Pinnwand des Hauses", "boardHint": "Mini-Chat zwischen den Bewohnern Ihrer Wohnung. Die Verwaltung liest mit, um Streit zu vermeiden: Bitte bleiben Sie höflich.", "boardPh": "Ihre Nachricht…", "boardEmpty": "Noch keine Nachrichten. Schreiben Sie die erste!", "boardFirst": "Um zu schreiben, akzeptieren Sie bitte zuerst die Hausordnung.", "mgr": "Verwaltung", "refresh": "↻ Aktualisieren", "rgpd2": "Ist die Pinnwand des Hauses aktiv, sehen die anderen Bewohner Ihrer Wohnung und die Verwaltung, was Sie dort schreiben (Streitvermeidung, berechtigtes Interesse); die Nachrichten sind verschlüsselt und werden nach 90 Tagen automatisch gelöscht. Ihre Annahme der Hausordnung wird mit Datum gespeichert."},
    rc: { btn: '📄 Übersicht aller bezahlten Mieten', title: 'Übersicht der bezahlten Mieten', cols: ['Monat', 'Miete', 'Bezahlt', 'Zahlungsdatum'], total: 'Summe', partial: 'Teilzahlung', paidN: (n) => `${n} Monat${n > 1 ? 'e' : ''} bezahlt`,
      text: (s, n, a, f, to) => `Der/die Unterzeichnende, ${s}, Hauptmieter und Vermieter, bestätigt, von ${n} die oben aufgeführten Beträge, insgesamt ${a}, als Miete von ${f} bis ${to} erhalten zu haben, und erteilt hierüber Quittung.` },
    more: (n) => `Die nächsten ${n} anzeigen`,
    loc: 'de-LU', door: 'Mein Türcode', since: 'seit', app: 'Mieter-App ARES S.A.', welcome: 'Ihre Mieten, Quittungen, Dokumente und Abfuhrtermine — und Probleme melden, auf Ihrem Telefon.', code: 'Ihr persönlicher Zugangscode', codePh: 'z. B. K7PM2-QXA4H', enter: 'Anmelden', noCode: 'Kein Code? Fragen Sie Ihre Verwaltung.', badCode: 'Unbekannter Code. Bitte prüfen oder einen neuen Code anfordern.', install: "Symbol auf meinem Handy installieren", iosHow: 'iPhone: Teilen tippen, dann „Zum Home-Bildschirm“.', andHow: 'Android: Menü ⋮, dann „App installieren“.', logout: 'Auf diesem Telefon abmelden', title: 'Mein Mieterbereich', hello: 'Guten Tag', avis: 'Mitteilungen zum Haus', pay: 'Meine Mieten', restNow: 'Heute offen', upcoming: 'noch fällig', allPaid: 'Bis heute alles bezahlt ✓',
    iban: 'Zahlung', ref: 'Verwendungszweck', quit: 'Meine Quittungen', quitBtn: 'Quittung', partial: 'Teilzahlung', contrat: 'Mein Vertrag', entry: 'Einzug', end: 'Vertragsende', rent: 'Miete', revision: 'Nächste Anpassung', caution: 'Kaution',
    docs: 'Meine Unterlagen', dossierHint: 'Dokumente und Nachweise, die wir für Sie erfasst haben (👁 zum Ansehen). Ein Fehler oder fehlt etwas? Sagen Sie es uns.', errBtn: '⚠️ Einen Fehler melden', recv: 'erhalten am', proof: 'Nachweis', modes: { especes: 'bar', virement: 'per Überweisung', cheque: 'per Scheck', garantie: 'Bankgarantie', autre: '' }, dt: { bail: 'Mietvertrag', identite: 'Ausweis', cns: 'Krankenversicherungskarte (CNS)', caution: 'Kautionsnachweis', loyer: 'Zahlungsnachweis Miete', assurance: 'Hausratversicherung', revenus: 'Einkommen', titre: 'Aufenthaltstitel', autre: 'Dokument' }, coll: 'Müllabfuhr', putOut: 'rausstellen', truck: 'Abholung am', calAdd: '📅 Abfuhrtermine in meinen Kalender', signal: 'Ein Problem melden', what: 'Welches Problem?', whatPh: 'z. B. Wasser tropft seit heute Morgen unter der Küchenspüle', type: 'Art', types: { rep: '🔧 Reparatur / Defekt', menage: '🧹 Sauberkeit / Reinigung', dossier: '📄 Fehler in meinen Unterlagen / Zahlungen', autre: '📌 Sonstiges' },
    photos: 'Fotos (max. 3)', tel: 'Telefon für Rückfragen (optional)', dispo: 'Wann sind Sie erreichbar? (optional)', send: 'Senden', sent: 'Danke, Ihre Meldung wurde gesendet. Hier sehen Sie, wenn sie bearbeitet wird.', mine: 'Meine Meldungen',
    st: { afaire: 'Eingegangen', planifie: 'Geplant', fait: 'Erledigt' }, lights: ['Noch Zeit', 'Achtung: morgen oder übermorgen', 'Heute'], legend: 'Legende',
    months: ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'], monthsFull: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
    off: 'Dieser Bereich ist nicht mehr aktiv. Bitte wenden Sie sich an Ihre Verwaltung.', bad: 'Unvollständiger Link. Öffnen Sie den Link genau so, wie Sie ihn erhalten haben.', personal: 'Dieser Link ist persönlich: bitte nicht weitergeben.', updated: 'Aktualisiert am',
    rgpdT: 'Schutz Ihrer Daten (DSGVO)',
    rgpd: (s) => `Dieser Bereich wird von ${s.nom}${s.adresse ? ', ' + s.adresse + ' ' + s.ville : ''} verwaltet, Ihrem Vermieter (Hauptmieter). Er zeigt nur Ihre eigenen Mietdaten (Mieten, Vertrag, freigegebene Dokumente), damit Sie diese einsehen können; Rechtsgrundlage: die Erfüllung Ihres Mietvertrags. Ihre Daten sind verschlüsselt: Der Schlüssel befindet sich nur in Ihrem persönlichen Link, weder der Hoster (Cloudflare) noch sonst jemand kann sie lesen. Ihre Nachrichten kann nur Ihre Verwaltung lesen; sie dienen nur der Bearbeitung Ihres Anliegens. Der Bereich wird am Ende des Mietverhältnisses deaktiviert; Mietdaten werden für die Dauer des Vertrags plus 10 Jahre aufbewahrt (Buchhaltungspflichten). Sie können Auskunft, Berichtigung oder Löschung Ihrer Daten verlangen${s.email ? ' bei ' + s.email : ' bei Ihrer Verwaltung'} und Beschwerde bei der CNPD (cnpd.public.lu) einlegen. Keine Werbe-Cookies, kein Tracking.`,
    quitTitle: 'Mietquittung (Quittance de loyer)', quitPart: 'Quittung Teilzahlung', landlord: 'Hauptmieter (Vermieter)', tenant: 'Untermieter', period: (m, y) => `Zeitraum: ${m} ${y}`,
    quitText: (s, n, a, m, y) => `Ich, ${s}, Hauptmieter und Vermieter, bestätige, von ${n} den Betrag von ${a} als Miete für ${m} ${y} erhalten zu haben.`, print: 'Drucken / als PDF speichern', close: 'Schließen',
  },
  pt: {
    ins: {"iosS": ["Na barra do Safari no fundo do ecrã (não nesta página), toque em Partilhar {S}. Nos iPhone recentes (iOS 26), toque primeiro nos três pontos ⋯ em baixo à direita e depois em « Partilhar ». Não vê a barra? Deslize a página um pouco para cima.", "Na lista que abre, desça e toque em « Adicionar ao ecrã principal » ➕.", "Toque em « Adicionar » em cima à direita: o ícone ARES aparece no seu ecrã."], "iosC": ["Toque no ícone Partilhar {S} em cima à direita, na barra de endereço.", "Toque em « Adicionar ao ecrã principal » e depois em « Adicionar »."], "and": ["Toque no menu ⋮ em cima à direita do Chrome.", "Toque em « Instalar aplicação » ou « Adicionar ao ecrã principal » e depois em « Instalar »."], "app": "Está no navegador de outra app (Facebook, Instagram…). Abra primeiro este link no Safari ou no Chrome: menu ⋯ → « Abrir no navegador ».", "tip": "Não aparece « Adicionar ao ecrã principal »? No fim da lista, toque em « Editar ações » e adicione-o. Em navegação privada, abra um separador normal.", "copy": "Copiar o link"},
    g: {"sub": "depois abra a app tocando no ícone ARES", "i1": "No fundo do ecrã, na barra do Safari, toque nos três pontos ⋯ (ou diretamente no ícone Partilhar).", "i2": "Toque em « Partilhar ».", "i3": "Deslize e toque em « Adicionar ao ecrã principal ».", "i4": "Toque em « Adicionar » em cima à direita.", "done": "Pronto! Para entrar na app, toque no ícone ARES no seu ecrã.", "a1": "Em cima à direita do Chrome, toque nos três pontos ⋮.", "a2": "Toque em « Instalar aplicação » (ou « Adicionar ao ecrã principal »).", "a3": "Toque em « Instalar ».", "safari": "No iPhone, abra esta página no Safari."},
    ui: {"share": "Partilhar", "a2hs": "Adicionar ao ecrã principal", "add": "Adicionar", "cancel": "Cancelar", "fav": "Adicionar aos favoritos", "find": "Procurar na página", "newTab": "Novo separador", "hist": "Histórico", "ainstall": "Instalar aplicação", "ainstallBtn": "Instalar"},
    hr: {"R": ["Silêncio: sem barulho entre as 22h e as 7h, nem ao domingo e feriados; música e chamadas em volume moderado.", "Limpeza: cozinha, casa de banho e espaços comuns limpos após cada utilização; loiça lavada e arrumada no mesmo dia.", "Canos: nada de cabelos, restos de comida, óleo ou toalhitas nos lava-loiças, chuveiros e sanitas.", "Lixo: separar conforme as regras e pôr os contentores fora no dia certo (ver « Recolha do lixo »).", "Tabaco: é proibido fumar ou vaporizar no interior.", "Visitas: não alojar outra pessoa nem subarrendar sem acordo escrito do gestor.", "Segurança: fechar a porta de entrada, nunca dar chaves ou códigos, não deixar nada nos corredores, sem aquecedores portáteis nem botijas de gás.", "Energia: fechar as janelas com o aquecimento ligado, apagar luzes e aparelhos desnecessários.", "Problemas: comunicar logo qualquer estrago ou avaria pela app.", "Respeito: sem insultos, ameaças ou discriminação. As mensagens da casa são lidas pelo gestor, que pode intervir."], "rulesT": "Regulamento da casa", "rulesExtra": "Regras próprias do seu prédio", "rulesAccept": "✓ Li e aceito o regulamento", "rulesOk": "Regulamento aceite em", "board": "Mural da casa", "boardHint": "Mini-chat entre os moradores do seu alojamento. O gestor também lê as mensagens para evitar conflitos: seja cordial.", "boardPh": "A sua mensagem…", "boardEmpty": "Ainda não há mensagens. Escreva a primeira!", "boardFirst": "Para escrever, aceite primeiro o regulamento da casa.", "mgr": "Gestor", "refresh": "↻ Atualizar", "rgpd2": "Se o mural da casa estiver ativo, o que lá escreve é visível para os outros moradores do seu alojamento e para o gestor (prevenção de conflitos, interesse legítimo); as mensagens são cifradas e apagadas automaticamente após 90 dias. A sua aceitação do regulamento é registada com a data."},
    rc: { btn: '📄 Resumo de todas as rendas pagas', title: 'Resumo das rendas pagas', cols: ['Mês', 'Renda', 'Pago', 'Data do pagamento'], total: 'Total', partial: 'pagamento parcial', paidN: (n) => `${n} ${n > 1 ? 'meses pagos' : 'mês pago'}`,
      text: (s, n, a, f, to) => `O/A abaixo assinado/a, ${s}, arrendatário principal e senhorio, declara ter recebido de ${n} as quantias detalhadas acima, num total de ${a}, a título de renda de ${f} a ${to}, e dá a respetiva quitação.` },
    more: (n) => `Ver as próximas ${n}`,
    loc: 'pt-PT', door: 'Código da minha porta', since: 'desde', app: 'App dos inquilinos ARES S.A.', welcome: 'As suas rendas, recibos, documentos e recolhas — e comunicar um problema, no seu telemóvel.', code: 'O seu código de acesso pessoal', codePh: 'ex. K7PM2-QXA4H', enter: 'Entrar', noCode: 'Não tem código? Peça-o ao seu gestor.', badCode: 'Código desconhecido. Verifique-o ou peça um novo código.', install: "Instalar o ícone no meu telemóvel", iosHow: 'iPhone: toque em Partilhar e depois « Adicionar ao ecrã principal ».', andHow: 'Android: menu ⋮ e depois « Instalar aplicação ».', logout: 'Terminar sessão neste telemóvel', title: 'O meu espaço de inquilino', hello: 'Olá', avis: 'Avisos do prédio', pay: 'As minhas rendas', restNow: 'Em falta hoje', upcoming: 'por vencer', allPaid: 'Tudo pago até hoje ✓',
    iban: 'Para pagar', ref: 'Referência', quit: 'Os meus recibos', quitBtn: 'Recibo', partial: 'Recibo parcial', contrat: 'O meu contrato', entry: 'Entrada', end: 'Fim do contrato', rent: 'Renda', revision: 'Próxima revisão', caution: 'Caução',
    docs: 'O meu processo', dossierHint: 'Documentos e comprovativos que registámos para si (toque em 👁 para ver). Um erro ou falta algum documento? Diga-nos.', errBtn: '⚠️ Comunicar um erro', recv: 'recebida em', proof: 'Comprovativo', modes: { especes: 'em mão (dinheiro)', virement: 'por transferência', cheque: 'por cheque', garantie: 'garantia bancária', autre: '' }, dt: { bail: 'Contrato de arrendamento', identite: 'Documento de identificação', cns: 'Cartão da CNS (seguro de saúde)', caution: 'Comprovativo da caução', loyer: 'Comprovativo de pagamento da renda', assurance: 'Seguro da habitação', revenus: 'Rendimentos', titre: 'Autorização de residência', autre: 'Documento' }, coll: 'Recolha do lixo', putOut: 'pôr fora', truck: 'recolha no dia', calAdd: '📅 Adicionar as recolhas ao meu calendário', signal: 'Comunicar um problema', what: 'Qual é o problema?', whatPh: 'ex. Fuga de água debaixo do lava-loiça desde esta manhã', type: 'Tipo', types: { rep: '🔧 Reparação / avaria', menage: '🧹 Limpeza', dossier: '📄 Erro no meu processo / pagamentos', autre: '📌 Outro' },
    photos: 'Fotos (máximo 3)', tel: 'Telefone para o contactar (opcional)', dispo: 'Quando está disponível? (opcional)', send: 'Enviar', sent: 'Obrigado, a sua mensagem foi enviada. Verá aqui quando for tratada.', mine: 'As minhas comunicações',
    st: { afaire: 'Recebido', planifie: 'Planeado', fait: 'Concluído' }, lights: ['Há tempo', 'Atenção: amanhã ou depois de amanhã', 'Hoje'], legend: 'Legenda',
    months: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'], monthsFull: ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'],
    off: 'Este espaço já não está ativo. Contacte o seu gestor.', bad: 'Link incompleto. Abra o link exatamente como o recebeu.', personal: 'Este link é pessoal: não o partilhe.', updated: 'Atualizado em',
    rgpdT: 'Proteção dos seus dados (RGPD)',
    rgpd: (s) => `Este espaço é gerido por ${s.nom}${s.adresse ? ', ' + s.adresse + ' ' + s.ville : ''}, o seu senhorio (arrendatário principal). Mostra apenas as suas próprias informações de arrendamento (rendas, contrato, documentos partilhados) para que as possa consultar; base legal: a execução do seu contrato de arrendamento. Os seus dados estão cifrados: a chave está apenas no seu link pessoal, nem o alojamento (Cloudflare) nem mais ninguém os pode ler. As mensagens que envia só podem ser lidas pelo seu gestor e servem apenas para tratar o seu pedido. O espaço é desativado no fim do arrendamento; os dados são conservados durante o contrato mais 10 anos (obrigações contabilísticas). Pode pedir o acesso, a retificação ou o apagamento dos seus dados${s.email ? ' a ' + s.email : ' ao seu gestor'} e apresentar reclamação à CNPD (cnpd.public.lu). Sem cookies publicitários, sem rastreamento.`,
    quitTitle: 'Recibo de renda (Quittance de loyer)', quitPart: 'Recibo de pagamento parcial', landlord: 'Arrendatário principal (senhorio)', tenant: 'Subarrendatário', period: (m, y) => `Período: ${m} ${y}`,
    quitText: (s, n, a, m, y) => `Eu, ${s}, arrendatário principal e senhorio, declaro ter recebido de ${n} a quantia de ${a} referente à renda de ${m} ${y}.`, print: 'Imprimir / guardar em PDF', close: 'Fechar',
  },
  en: {
    ins: {"iosS": ["In Safari’s bar at the very bottom of the screen (not on this page), tap Share {S}. On recent iPhones (iOS 26), first tap the three dots ⋯ at the bottom right, then “Share”. No bar? Scroll the page up a little.", "In the list that opens, scroll down and tap “Add to Home Screen” ➕.", "Tap “Add” at the top right: the ARES icon appears on your screen."], "iosC": ["Tap the Share icon {S} at the top right, in the address bar.", "Tap “Add to Home Screen”, then “Add”."], "and": ["Tap the ⋮ menu at the top right of Chrome.", "Tap “Install app” or “Add to Home screen”, then “Install”."], "app": "You are in another app’s browser (Facebook, Instagram…). First open this link in Safari or Chrome: menu ⋯ → “Open in browser”.", "tip": "No “Add to Home Screen”? At the bottom of the list tap “Edit Actions” and add it. In private browsing, open a normal tab.", "copy": "Copy link"},
    g: {"sub": "then open the app by tapping the ARES icon", "i1": "At the very bottom of the screen, in Safari’s bar, tap the three dots ⋯ (or the Share icon directly).", "i2": "Tap “Share”.", "i3": "Scroll down and tap “Add to Home Screen”.", "i4": "Tap “Add” at the top right.", "done": "Done! To go to the app, tap the ARES icon on your screen.", "a1": "At the top right of Chrome, tap the three dots ⋮.", "a2": "Tap “Install app” (or “Add to Home screen”).", "a3": "Tap “Install”.", "safari": "On iPhone, open this page in Safari."},
    ui: {"share": "Share", "a2hs": "Add to Home Screen", "add": "Add", "cancel": "Cancel", "fav": "Add to Favorites", "find": "Find on Page", "newTab": "New tab", "hist": "History", "ainstall": "Install app", "ainstallBtn": "Install"},
    hr: {"R": ["Quiet: no noise between 10 pm and 7 am, nor on Sundays and public holidays; music and calls at a moderate volume.", "Cleanliness: kitchen, bathroom and shared areas clean after each use; dishes washed and put away the same day.", "Drains: no hair, food scraps, oil or wipes in sinks, showers and toilets.", "Waste: sort as instructed and put the bins out on the right day (see “Waste collection”).", "Smoking: smoking and vaping indoors are forbidden.", "Guests: no hosting another person and no subletting without the manager’s written consent.", "Safety: close the front door, never give out keys or codes, leave nothing in the corridors, no portable heaters or gas bottles.", "Energy: close windows while the heating is on, switch off unneeded lights and appliances.", "Problems: report any damage or breakdown straight away in the app.", "Respect: no insults, threats or discrimination. House messages are read by the manager, who may step in."], "rulesT": "House rules", "rulesExtra": "Specific rules for your building", "rulesAccept": "✓ I have read and accept the house rules", "rulesOk": "House rules accepted on", "board": "House chat", "boardHint": "Mini-chat between the people living in your home. The manager reads the messages too, to prevent disputes: please stay polite.", "boardPh": "Your message…", "boardEmpty": "No messages yet. Write the first one!", "boardFirst": "To write, please accept the house rules first.", "mgr": "Manager", "refresh": "↻ Refresh", "rgpd2": "If the house chat is on, what you write there is visible to the other people living in your home and to your manager (preventing disputes, legitimate interest); messages are encrypted and deleted automatically after 90 days. Your acceptance of the house rules is recorded with its date."},
    rc: { btn: '📄 Summary of all my paid rent', title: 'Summary of rent paid', cols: ['Month', 'Rent', 'Paid', 'Payment date'], total: 'Total', partial: 'partial payment', paidN: (n) => `${n} month${n > 1 ? 's' : ''} paid`,
      text: (s, n, a, f, to) => `I, the undersigned, ${s}, head tenant and landlord, confirm that I have received from ${n} the amounts detailed above, a total of ${a}, as rent from ${f} to ${to}, and hereby give receipt for them.` },
    more: (n) => `Show the next ${n}`,
    loc: 'en-GB', door: 'My door code', since: 'since', app: 'ARES S.A. tenant app', welcome: 'Your rent, receipts, documents and waste collections — and report a problem, on your phone.', code: 'Your personal access code', codePh: 'e.g. K7PM2-QXA4H', enter: 'Enter', noCode: 'No code? Ask your property manager.', badCode: 'Unknown code. Check it or ask for a new code.', install: "Install the icon on my phone", iosHow: 'iPhone: tap Share, then “Add to Home Screen”.', andHow: 'Android: menu ⋮, then “Install app”.', logout: 'Sign out on this phone', title: 'My tenant space', hello: 'Hello', avis: 'Building notices', pay: 'My rent', restNow: 'Unpaid to date', upcoming: 'upcoming', allPaid: 'All paid to date ✓',
    iban: 'How to pay', ref: 'Reference', quit: 'My rent receipts', quitBtn: 'Receipt', partial: 'Partial receipt', contrat: 'My lease', entry: 'Move-in', end: 'Lease end', rent: 'Rent', revision: 'Next rent review', caution: 'Deposit',
    docs: 'My file', dossierHint: 'Documents and proofs we have recorded for you (tap 👁 to view). A mistake or a missing document? Let us know.', errBtn: '⚠️ Report a mistake', recv: 'received on', proof: 'Proof', modes: { especes: 'in cash', virement: 'by bank transfer', cheque: 'by cheque', garantie: 'bank guarantee', autre: '' }, dt: { bail: 'Lease', identite: 'ID document', cns: 'Health insurance card (CNS)', caution: 'Deposit proof', loyer: 'Rent payment proof', assurance: 'Home insurance', revenus: 'Income', titre: 'Residence permit', autre: 'Document' }, coll: 'Waste collection', putOut: 'put out', truck: 'truck comes on', calAdd: '📅 Add collections to my calendar', signal: 'Report a problem', what: 'What is the problem?', whatPh: 'e.g. Water leaking under the kitchen sink since this morning', type: 'Type', types: { rep: '🔧 Repair / breakdown', menage: '🧹 Cleanliness', dossier: '📄 Mistake in my file / payments', autre: '📌 Other' },
    photos: 'Photos (up to 3)', tel: 'Phone to reach you (optional)', dispo: 'When are you available? (optional)', send: 'Send', sent: 'Thank you, your message has been sent. You will see here when it is handled.', mine: 'My reports',
    st: { afaire: 'Received', planifie: 'Scheduled', fait: 'Done' }, lights: ['Plenty of time', 'Attention: tomorrow or the day after', 'Today'], legend: 'Legend',
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], monthsFull: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    off: 'This space is no longer active. Please contact your property manager.', bad: 'Incomplete link. Open the link exactly as you received it.', personal: 'This link is personal: do not share it.', updated: 'Updated on',
    rgpdT: 'Your data protection (GDPR)',
    rgpd: (s) => `This space is managed by ${s.nom}${s.adresse ? ', ' + s.adresse + ' ' + s.ville : ''}, your landlord (main tenant). It only shows your own tenancy information (rent, lease, shared documents) so that you can consult it; legal basis: the performance of your tenancy agreement. Your data is encrypted: the key is only in your personal link, neither the host (Cloudflare) nor anyone else can read it. Messages you send can only be read by your property manager and are used only to handle your request. The space is deactivated at the end of your tenancy; tenancy data is kept for the lease period plus 10 years (accounting obligations). You can ask for access, correction or deletion of your data${s.email ? ' at ' + s.email : ' from your property manager'} and lodge a complaint with the CNPD (cnpd.public.lu). No advertising cookies, no tracking.`,
    quitTitle: 'Rent receipt (Quittance de loyer)', quitPart: 'Partial payment receipt', landlord: 'Main tenant (landlord)', tenant: 'Subtenant', period: (m, y) => `Period: ${m} ${y}`,
    quitText: (s, n, a, m, y) => `I, ${s}, main tenant and landlord, confirm having received from ${n} the sum of ${a} for the rent of ${m} ${y}.`, print: 'Print / save as PDF', close: 'Close',
  },
  es: {
    g: {"sub": "luego abre la app tocando el icono ARES", "i1": "Abajo del todo, en la barra de Safari, toca los tres puntos ⋯ (o directamente el icono Compartir).", "i2": "Toca « Compartir ».", "i3": "Desplázate y toca « Añadir a pantalla de inicio ».", "i4": "Toca « Añadir » arriba a la derecha.", "done": "¡Listo! Para entrar en la app, toca el icono ARES en tu pantalla.", "a1": "Arriba a la derecha de Chrome, toca los tres puntos ⋮.", "a2": "Toca « Instalar aplicación » (o « Añadir a pantalla de inicio »).", "a3": "Toca « Instalar ».", "safari": "En iPhone, abre esta página con Safari."},
    ui: {"share": "Compartir", "a2hs": "Añadir a pantalla de inicio", "add": "Añadir", "cancel": "Cancelar", "fav": "Añadir a favoritos", "find": "Buscar en la página", "newTab": "Nueva pestaña", "hist": "Historial", "ainstall": "Instalar aplicación", "ainstallBtn": "Instalar"},
    ins: {"iosS": ["En la barra de Safari abajo del todo (no en esta página), toca Compartir {S}. En iPhone recientes (iOS 26), toca primero los tres puntos ⋯ abajo a la derecha y luego « Compartir ».", "En la lista que se abre, desplázate y toca « Añadir a pantalla de inicio » ➕.", "Toca « Añadir » arriba a la derecha: el icono ARES aparece en tu pantalla."], "iosC": ["Toca el icono Compartir {S} arriba a la derecha, en la barra de direcciones.", "Toca « Añadir a pantalla de inicio » y luego « Añadir »."], "and": ["Toca el menú ⋮ arriba a la derecha de Chrome.", "Toca « Instalar aplicación » o « Añadir a pantalla de inicio » y luego « Instalar »."], "app": "Estás en el navegador de otra app (Facebook, Instagram…). Abre primero este enlace en Safari o Chrome: menú ⋯ → « Abrir en el navegador ».", "tip": "¿No aparece « Añadir a pantalla de inicio »? Al final de la lista toca « Editar acciones » y añádelo. En navegación privada, abre una pestaña normal.", "copy": "Copiar el enlace"},
    hr: {"R": ["Silencio: nada de ruido entre las 22 h y las 7 h, ni los domingos y festivos; música y llamadas a volumen moderado.", "Limpieza: cocina, baño y zonas comunes limpias después de cada uso; platos lavados y guardados el mismo día.", "Desagües: nada de pelos, restos de comida, aceite ni toallitas en fregaderos, duchas e inodoros.", "Basura: separar según las normas y sacar los contenedores el día correcto (ver « Recogida de basura »).", "Tabaco: está prohibido fumar o vapear en el interior.", "Visitas: no alojar a otra persona ni subarrendar sin acuerdo escrito del administrador.", "Seguridad: cerrar la puerta de entrada, no dar nunca llaves ni códigos, no dejar nada en los pasillos, nada de estufas portátiles ni bombonas de gas.", "Energía: cerrar las ventanas con la calefacción encendida, apagar luces y aparatos innecesarios.", "Problemas: avisar enseguida de cualquier daño o avería desde la app.", "Respeto: nada de insultos, amenazas ni discriminación. Los mensajes de la casa los lee el administrador, que puede intervenir."], "rulesT": "Normas de la casa", "rulesExtra": "Normas propias de tu edificio", "rulesAccept": "✓ He leído y acepto las normas", "rulesOk": "Normas aceptadas el", "board": "Chat de la casa", "boardHint": "Mini-chat entre los habitantes de tu vivienda. El administrador también lee los mensajes para evitar conflictos: sé cortés.", "boardPh": "Tu mensaje…", "boardEmpty": "Todavía no hay mensajes. ¡Escribe el primero!", "boardFirst": "Para escribir, acepta primero las normas de la casa.", "mgr": "Administrador", "refresh": "↻ Actualizar", "rgpd2": "Si el chat de la casa está activado, lo que escribes es visible para los demás habitantes de tu vivienda y para el administrador (prevención de conflictos, interés legítimo); los mensajes están cifrados y se borran automáticamente a los 90 días. Tu aceptación de las normas se registra con su fecha."},
    rc: { btn: '📄 Resumen de todos mis alquileres pagados', title: 'Resumen de alquileres pagados', cols: ['Mes', 'Alquiler', 'Pagado', 'Fecha de pago'], total: 'Total', partial: 'pago parcial', paidN: (n) => `${n} ${n > 1 ? 'meses pagados' : 'mes pagado'}`,
      text: (s, n, a, f, to) => `El/la abajo firmante, ${s}, arrendatario principal y arrendador, declara haber recibido de ${n} las cantidades detalladas arriba, por un total de ${a}, en concepto de alquiler de ${f} a ${to}, y otorga el presente recibo.` },
    more: (n) => `Ver las ${n} siguientes`,
    loc: 'es-ES', door: 'Código de mi puerta', since: 'desde el', app: 'App de inquilinos ARES S.A.', welcome: 'Tus alquileres, recibos, documentos y recogida de basura — y avisar de un problema, desde tu móvil.', code: 'Tu código de acceso personal', codePh: 'ej. K7PM2-QXA4H', enter: 'Entrar', noCode: '¿No tienes código? Pídeselo a tu administrador.', badCode: 'Código desconocido. Compruébalo o pide un código nuevo.', install: 'Instalar el icono en mi móvil', iosHow: 'iPhone: toca Compartir y luego « Añadir a pantalla de inicio ».', andHow: 'Android: menú ⋮ y luego « Instalar aplicación ».', logout: 'Cerrar sesión en este móvil', title: 'Mi espacio de inquilino', hello: 'Hola', avis: 'Avisos del edificio', pay: 'Mis alquileres', restNow: 'Pendiente a día de hoy', upcoming: 'por vencer', allPaid: 'Todo pagado a día de hoy ✓',
    iban: 'Para pagar', ref: 'Concepto', quit: 'Mis recibos', quitBtn: 'Recibo', partial: 'Recibo parcial', contrat: 'Mi contrato', entry: 'Entrada', end: 'Fin del contrato', rent: 'Alquiler', revision: 'Próxima revisión', caution: 'Fianza',
    docs: 'Mi expediente', dossierHint: 'Documentos y justificantes que hemos registrado para ti (toca 👁 para verlos). ¿Un error o falta un documento? Dínoslo.', errBtn: '⚠️ Avisar de un error', recv: 'recibida el', proof: 'Justificante', modes: { especes: 'en mano (efectivo)', virement: 'por transferencia', cheque: 'con cheque', garantie: 'aval bancario', autre: '' }, dt: { bail: 'Contrato de alquiler', identite: 'Documento de identidad', cns: 'Tarjeta sanitaria (CNS)', caution: 'Justificante de la fianza', loyer: 'Justificante de pago del alquiler', assurance: 'Seguro de hogar', revenus: 'Ingresos', titre: 'Permiso de residencia', autre: 'Documento' }, coll: 'Recogida de basura', putOut: 'sacar', truck: 'pasa el camión el', calAdd: '📅 Añadir las recogidas a mi calendario', signal: 'Avisar de un problema', what: '¿Qué problema hay?', whatPh: 'ej. Fuga de agua bajo el fregadero de la cocina desde esta mañana', type: 'Tipo', types: { rep: '🔧 Reparación / avería', menage: '🧹 Limpieza', dossier: '📄 Error en mi expediente / mis pagos', autre: '📌 Otro' },
    photos: 'Fotos (máximo 3)', tel: 'Teléfono de contacto (opcional)', dispo: '¿Cuándo estás disponible? (opcional)', send: 'Enviar', sent: 'Gracias, tu mensaje se ha enviado. Aquí verás cuándo se atiende.', mine: 'Mis avisos',
    st: { afaire: 'Recibido', planifie: 'Programado', fait: 'Terminado' }, lights: ['Hay tiempo', 'Atención: mañana o pasado mañana', 'Hoy'], legend: 'Leyenda',
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
const lightOf = (d) => (d <= today ? 'red' : d <= addDays(today, 2) ? 'yellow' : 'green');
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
function preview(doc, url) {
  const t = T();
  const el = document.createElement('div');
  el.className = 'pv';
  el.innerHTML = `<div class="pv-bar"><b>${esc(t.dt[doc.dtype] || doc.label)}</b><a class="btn sm sec" href="${url}" download="${esc(doc.label || 'document')}">⬇</a><button class="btn sm" data-pv-close="1">✕ ${esc(t.close)}</button></div>${/^image\//.test(doc.mime || '') ? `<img src="${url}" alt="">` : `<iframe src="${url}" title="${esc(doc.label)}"></iframe>`}`;
  el.addEventListener('click', (e) => { if (e.target.closest('[data-pv-close]')) { el.remove(); URL.revokeObjectURL(url); } });
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
  dlg: (u) => `<div class="mk"><div class="mk-top"><span>${esc(u.cancel)}</span>${HI(esc(u.add))}</div><div class="mk-dlg">${ICON}<div><b>ARES Locataires</b><small>luxinterventions.com</small></div></div></div>`,
  home: () => `<div class="mk mk-home">${'<i></i>'.repeat(6)}<span class="hi-app">${ICON}<small>ARES</small></span><i></i></div>`,
  chrome: () => `<div class="mk"><div class="mk-bar"><span class="mk-url">luxinterventions.com</span>${HI('⋮')}</div><div class="mk-page"></div></div>`,
  adlg: (u) => `<div class="mk mk-adlg">${ICON}<b>ARES Locataires</b><div class="mk-btns"><span>${esc(u.cancel)}</span>${HI(esc(u.ainstallBtn))}</div></div>`,
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
    <div class="langs g-langs">${Object.keys(L).map((k) => `<button data-glang="${k}" aria-pressed="${k === lang}">${k.toUpperCase()}</button>`).join('')}</div>
    <div class="g-tabs"><button data-gtab="ios" aria-pressed="${guideTab === 'ios'}">🍎 iPhone</button><button data-gtab="and" aria-pressed="${guideTab === 'and'}">🤖 Android</button></div>
    ${IN_APP ? `<div class="card avis"><p style="margin:0">${esc(t.ins.app)}</p><button class="btn sec block" style="margin-top:10px" data-copylink="1">${esc(t.ins.copy)}</button></div>` : ''}
    ${guideTab === 'ios' ? `<p class="meta" style="margin:0 0 10px">${esc(g.safari)}</p>` : ''}
    <ol class="g-steps">${steps.map(([txt, mk], i) => `<li><div class="g-txt"><span class="n">${i === steps.length - 1 ? '✓' : i + 1}</span>${esc(txt)}</div>${mk}</li>`).join('')}</ol>
    ${guideTab === 'ios' ? `<p class="meta">${esc(t.ins.tip)}</p>` : ''}
    <button class="btn block" data-gclose="1">${esc(t.close)}</button>`;
  el.scrollTop = 0;
}
// ── Messages de la maison : lecture (déchiffrée sur le téléphone), envoi, rafraîchissement ──
let chatMsgs = null, chatTimer = null, chatLoading = false;
const b64d = (x) => Uint8Array.from(atob(x), (c) => c.charCodeAt(0));
function chatHtml() {
  const t = T();
  if (chatMsgs == null) return '<p class="meta" style="margin:0">…</p>';
  if (!chatMsgs.length) return `<p class="meta" style="margin:0">${esc(t.hr.boardEmpty)}</p>`;
  return chatMsgs.map((m) => {
    const mine = m.m === data.chat.mid, mgr = m.m === 'mgr';
    const when = new Date(m.t).toLocaleString(t.loc, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    return `<div class="bub${mine ? ' me' : ''}${mgr ? ' mgr' : ''}"><div class="bub-h"><b>${esc(mgr ? '🛡️ ' + t.hr.mgr : m.a)}</b> ${esc(when)}</div><div class="bub-x">${esc(m.x)}</div></div>`;
  }).join('');
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
      const box = document.getElementById('chat');
      if (box) { const atEnd = box.scrollTop + box.clientHeight >= box.scrollHeight - 30; box.innerHTML = chatHtml(); if (atEnd || box.dataset.first !== '1') { box.scrollTop = box.scrollHeight; box.dataset.first = '1'; } }
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
const rulesKey = () => 'espRules:' + id;
const rulesAck = () => { try { return localStorage.getItem(rulesKey()) || ''; } catch { return ''; } };
function render() {
  const t = T();
  document.documentElement.lang = lang;
  const langs = `<div class="langs">${Object.keys(L).map((k) => `<button data-lang="${k}" aria-pressed="${k === lang}">${k.toUpperCase()}</button>`).join('')}</div>`;
  if (!data) {
    app.innerHTML = `<div class="top"><b>ARES S.A.</b>${langs}</div>
      <div style="text-align:center;margin:18px 0"><img src="/ares/icons/ares-192.png" alt="" width="84" height="84" style="border-radius:20px"></div>
      <h1 style="text-align:center">${esc(t.app)}</h1><p class="sub" style="text-align:center">${esc(t.welcome)}</p>
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
  const out = [];
  out.push(`<div class="top"><b>${esc(d.societe.nom)}</b>${langs}</div><h1>${esc(t.hello)} ${esc(d.prenom || d.nom)}</h1><p class="sub">${esc([d.logement, d.adresse].filter(Boolean).join(' · '))}</p>`);
  if (s.avis && (d.avis || []).length) out.push(`<div class="card avis"><h2>📢 ${esc(t.avis)}</h2>${d.avis.map((a) => `<p style="margin:6px 0;white-space:pre-wrap">${esc(a.texte)}${a.debut || a.fin ? `<br><span class="meta">${esc([fmt(a.debut), fmt(a.fin)].filter(Boolean).join(' → '))}</span>` : ''}</p>`).join('')}</div>`);
  if (s.porte && d.porte) out.push(`<div class="card" style="text-align:center"><h2>🔑 ${esc(t.door)}</h2><div style="font-size:34px;font-weight:800;letter-spacing:.14em;font-family:ui-monospace,Menlo,monospace">${esc(d.porte.code)}</div>${d.porte.depuis ? `<div class="meta">${esc(t.since)} ${esc(fmt(d.porte.depuis))}</div>` : ''}${d.porte.info ? `<p class="meta" style="margin:6px 0 0">${esc(d.porte.info)}</p>` : ''}</div>`);
  if (s.pay && (d.years || []).length) {
    const cur = d.years[0];
    const rest = d.years.reduce((n, y) => n + y.rest, 0);
    const cm = new Date().getMonth(), cy = new Date().getFullYear();
    out.push(`<div class="card"><h2>💶 ${esc(t.pay)}</h2>
      <p style="margin:0">${rest > 0.009 ? `<span class="big bad">${esc(money(rest))}</span> <span class="meta">${esc(t.restNow)}</span>` : `<span class="big ok">${esc(t.allPaid)}</span>`}${cur.upcoming > 0.009 ? ` <span class="meta">· ${esc(t.upcoming)} ${esc(money(cur.upcoming))}</span>` : ''}</p>
      ${d.years.map((y) => `<div class="meta" style="margin-top:10px;font-weight:700">${y.y}</div><div class="months">${y.months.map(([due, paid], i) => {
        const past = y.y < cy || (y.y === cy && i < cm), now = y.y === cy && i === cm;
        const cls = paid >= due - 0.009 && paid > 0 ? 'paid' : paid > 0 ? 'part' : !due ? 'off' : past ? 'late' : '';
        return `<div class="m ${cls}" ${now ? 'style="outline:2px solid var(--accent)"' : ''}>${esc(t.months[i])}<small>${paid > 0 && paid < due - 0.009 ? esc(Math.round(paid) + '€') : cls === 'paid' ? '✓' : cls === 'late' ? '!' : due ? '·' : '–'}</small></div>`;
      }).join('')}</div>`).join('')}
      ${d.iban ? `<div class="meta" style="margin-top:8px"><b>${esc(t.iban)} :</b> ${esc(d.societe.nom)} · IBAN <b style="color:var(--text)">${esc(d.iban)}</b><br>${esc(t.ref)} : ${esc(t.rent)} ${esc(t.monthsFull[cm])} ${cy} — ${esc(d.nom)}</div>` : ''}</div>`);
  }
  if (s.quit && (d.years || []).length) {
    const rows = [];
    for (const y of d.years) y.months.forEach(([due, paid, date], i) => { if (paid > 0) rows.push({ y: y.y, m: i, due, paid, date }); });
    rows.sort((a, b) => b.y - a.y || b.m - a.m);
    if (rows.length) {
      const tot = rows.reduce((x, r) => x + r.paid, 0), first = rows[rows.length - 1], last = rows[0];
      out.push(`<div class="card"><h2>🧾 ${esc(t.quit)}</h2><div class="row"><div class="grow"><b>${esc(t.rc.paidN(rows.length))}</b><div class="meta">${esc(t.monthsFull[first.m])} ${first.y} → ${esc(t.monthsFull[last.m])} ${last.y}</div></div><b>${esc(money(tot))}</b></div>
        <button class="btn block" style="margin-top:10px" data-recap="1">${esc(t.rc.btn)}</button></div>`);
    }
  }
  if (s.contrat && d.contrat) {
    const c = d.contrat;
    out.push(`<div class="card"><h2>📄 ${esc(t.contrat)}</h2>${[[t.entry, fmt(c.debut)], [t.end, c.fin ? fmt(c.fin) : '—'], [t.rent, money(d.loyer)], [t.revision, c.revision ? fmt(c.revision) : ''], [t.caution, c.caution ? [money(c.caution), c.cautionDate ? t.recv + ' ' + fmt(c.cautionDate) : '', t.modes[c.cautionMode] || ''].filter(Boolean).join(' · ') + (proofOf('caution') ? ' ✓' : '') : '']].filter(([, v]) => v).map(([k, v]) => `<div class="row"><div class="grow meta">${esc(k)}</div><b>${esc(v)}</b></div>`).join('')}</div>`);
  }
  if (s.docs && (d.docs || []).length) out.push(`<div class="card"><h2>📁 ${esc(t.docs)}</h2><p class="meta" style="margin:0 0 8px">${esc(t.dossierHint)}</p><div class="chips">${['bail', 'identite', 'cns', 'caution'].map((k) => { const x = proofOf(k); return x ? `<button class="chip ok" data-doc="${esc(x.id)}">✓ ${esc(t.dt[k])} 👁</button>` : `<button class="chip no"${s.signal && d.signalKey ? ' data-err="1"' : ''}>✗ ${esc(t.dt[k])}</button>`; }).join('')}</div>${d.docs.map((x) => `<div class="row"><div class="grow"><b>${esc(t.dt[x.dtype] || x.label)}</b><div class="meta">${esc(docSub(x))}</div></div><button class="btn sm sec" data-doc="${esc(x.id)}" aria-label="👁">👁</button></div>`).join('')}
    ${s.signal && d.signalKey ? `<button class="btn sec block" style="margin-top:10px" data-err="1">${esc(t.errBtn)}</button>` : ''}</div>`);
  if (d.chat) {
    const can = !d.regles || d.regles.lu || rulesAck();
    out.push(`<div class="card" id="chatCard"><h2>💬 ${esc(t.hr.board)}</h2><p class="meta" style="margin:0 0 8px">${esc(t.hr.boardHint)}</p>
      <div class="chat" id="chat">${chatHtml()}</div>
      ${can ? `<form id="chatf" class="chat-form"><textarea name="x" required maxlength="1500" placeholder="${esc(t.hr.boardPh)}"></textarea><button class="btn" type="submit">➤</button></form>`
        : `<p class="meta"><a href="#rules" data-goto-rules="1">${esc(t.hr.boardFirst)}</a></p>`}
      <button class="btn sm sec" style="margin-top:8px" data-chat-refresh="1">${esc(t.hr.refresh)}</button></div>`);
  }
  if (s.coll && (d.coll || []).length) {
    const ev = [];
    for (const it of d.coll) for (const dd of it.dates || []) { const p = it.sortie === 'jour' ? dd : addDays(dd, -1); if (p >= today) ev.push({ it, dd, p }); }
    ev.sort((a, b) => a.p.localeCompare(b.p));
    const cats = CATS[lang];
    const row = (x) => `<div class="row"><span class="light l-${lightOf(x.p)}" style="margin-top:6px"></span><div class="grow"><b>${esc(day(x.p))} — ${esc(t.putOut)} ${esc(cats[x.it.cat] || x.it.cat)}</b><div class="meta">${esc(t.truck)} ${esc(day(x.dd))}${x.it.heure ? ' · ' + esc(x.it.heure) : ''}</div></div></div>`;
    const rest = ev.slice(3, 24);
    out.push(`<div class="card"><h2>🗑️ ${esc(t.coll)}</h2>${ev.slice(0, 3).map(row).join('')}${rest.length ? `<details class="more"><summary>${esc(t.more(rest.length))}</summary>${rest.map(row).join('')}</details>` : ''}
      ${d.collLink ? `<a class="btn sec block" style="margin-top:10px" href="${esc(d.collLink)}">${esc(t.calAdd)}</a>` : ''}</div>`);
  }
  if (s.signal && d.signalKey) {
    out.push(`<div class="card"><h2>🛠️ ${esc(t.signal)}</h2>${sentOk ? `<p class="ok" style="margin:0 0 8px"><b>${esc(t.sent)}</b></p>` : ''}
      <form id="sig"><label>${esc(t.type)}</label><select name="type">${Object.entries(t.types).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}</select>
      <label>${esc(t.what)}</label><textarea name="texte" required maxlength="3000" placeholder="${esc(t.whatPh)}"></textarea>
      <label>${esc(t.photos)}</label><input type="file" name="photos" accept="image/*" multiple>
      <label>${esc(t.tel)}</label><input type="tel" name="tel" maxlength="30">
      <label>${esc(t.dispo)}</label><input type="text" name="dispo" maxlength="200">
      <button class="btn block" style="margin-top:12px" type="submit">${esc(t.send)}</button></form>
      ${(d.signals || []).length ? `<h2 style="margin-top:16px">${esc(t.mine)}</h2>${d.signals.map((x) => `<div class="row"><span class="light l-${x.statut === 'fait' ? 'green' : x.statut === 'planifie' ? 'yellow' : 'red'}" style="margin-top:6px"></span><div class="grow"><b>${esc(x.titre)}</b><div class="meta">${esc(fmt(x.sent || x.date))} · ${esc(t.st[x.statut] || x.statut)}${x.done ? ' · ' + esc(fmt(x.done)) : ''}</div></div></div>`).join('')}` : ''}</div>`);
  }
  if (s.coll || s.signal) out.push(`<div class="card meta"><b>${esc(t.legend)}</b> — <span class="light l-green"></span> ${esc(t.lights[0])} · <span class="light l-yellow"></span> ${esc(t.lights[1])} · <span class="light l-red"></span> ${esc(t.lights[2])}${s.signal ? `<br>🔧 ${esc(t.types.rep.slice(3))} · 🧹 ${esc(t.types.menage.slice(3))} · 🗑️ ${esc(t.coll)}` : ''}</div>`);
  if (d.regles) {
    const lu = d.regles.lu || rulesAck();
    out.push(`<div class="card" id="rules"><details${lu ? '' : ' open'}><summary><h2 style="display:inline">📜 ${esc(t.hr.rulesT)}</h2>${lu ? ` <span class="meta">✓ ${esc(fmt(lu))}</span>` : ''}</summary>
      <ol class="steps" style="margin-top:10px">${t.hr.R.map((r) => `<li>${esc(r)}</li>`).join('')}</ol>
      ${d.regles.extra ? `<p style="margin:8px 0 4px"><b>${esc(t.hr.rulesExtra)}</b></p><p class="pre" style="margin:0">${esc(d.regles.extra)}</p>` : ''}
      ${lu ? `<p class="ok" style="margin:10px 0 0">✓ ${esc(t.hr.rulesOk)} ${esc(fmt(lu))}</p>` : `<button class="btn block" style="margin-top:12px" data-rules-ok="1">${esc(t.hr.rulesAccept)}</button>`}</details></div>`);
  }
  out.push(installCard(t));
  out.push(`<div class="card notice"><details><summary>🔒 ${esc(t.rgpdT)}</summary><p>${esc(t.rgpd(d.societe))}</p>${d.chat || d.regles ? `<p>${esc(t.hr.rgpd2)}</p>` : ''}</details><p style="margin:8px 0 0"><a href="#" data-logout="1">${esc(t.logout)}</a> · ${esc(t.personal)}${d.societe.tel ? ` · ${esc(d.societe.nom)} <a href="tel:${esc(d.societe.tel.replace(/[^\d+]/g, ''))}">${esc(d.societe.tel)}</a>` : ''}</p></div>`);
  app.innerHTML = out.join('');
  if (d.chat) { const box = document.getElementById('chat'); if (box) box.scrollTop = box.scrollHeight; if (!chatTimer) chatStart(); }
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
    <p style="margin-top:18px">${esc(t.rc.text(s.nom, name, money(tot), per(rows[0]), per(rows[rows.length - 1])))}</p>
    <p style="margin-top:30px">${esc(fmt(today))}</p><p><i>${esc(s.nom)}</i></p></div>`;
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

app.addEventListener('click', async (e) => {
  if (e.target.closest('[data-chat-refresh]')) return chatFetch();
  if (e.target.closest('[data-goto-rules]')) { e.preventDefault(); const r = document.getElementById('rules'); if (r) { r.querySelector('details').open = true; r.scrollIntoView({ behavior: 'smooth' }); } return; }
  const ro = e.target.closest('[data-rules-ok]');
  if (ro) {
    ro.disabled = true;
    const now = new Date().toISOString();
    try { localStorage.setItem(rulesKey(), now.slice(0, 10)); } catch {}
    if (data.signalKey) { try { await fetch(`${API}/api/esp/${id}/signal`, { method: 'POST', body: await sealForOwner(data.signalKey, { espace: id, t: now, type: 'regles' }) }); } catch { /* le gestionnaire le verra plus tard */ } }
    render();
    return;
  }
  if (e.target.closest('[data-guide]')) { if (installEvt && !IS_IOS) { installEvt.prompt(); installEvt = null; return; } return renderGuide(); }
  const cl = e.target.closest('[data-copylink]');
  if (cl) { try { await navigator.clipboard.writeText(location.origin + '/espace.html'); cl.textContent = '✓'; } catch { prompt('', location.origin + '/espace.html'); } return; }
  if (e.target.closest('[data-logout]')) { e.preventDefault(); try { localStorage.removeItem(ACC); } catch {} id = key = ''; data = null; loadErr = ''; return render(); }
  const lb = e.target.closest('[data-lang]');
  if (lb) { lang = lb.dataset.lang; try { localStorage.setItem('espLang', lang); } catch {} return render(); }
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
    if (f) { f.type.value = 'dossier'; f.scrollIntoView({ behavior: 'smooth', block: 'start' }); f.texte.focus({ preventScroll: true }); }
  }
});
app.addEventListener('submit', async (e) => {
  if (e.target.id === 'chatf') {
    e.preventDefault();
    const f = e.target, x = f.x.value.trim().slice(0, 1500);
    if (!x) return;
    const btn = f.querySelector('button'); btn.disabled = true;
    try {
      const r = await fetch(`${API}/api/board/${data.chat.id}`, { method: 'POST', body: await sealJson(data.chat.key, { a: data.chat.me, m: data.chat.mid, x, t: new Date().toISOString() }) });
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
      else if (r.status === 404) { try { localStorage.removeItem(ACC); } catch {} id = key = ''; loadErr = T().off; }
    } catch { loadErr = '⚠ offline'; }
  }
  if (!localStorage.getItem('espLang')) lang = pick(data);
  render();
}
lang = pick(null);
load();
