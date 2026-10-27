// Manuale — italiano
export default {
  title: 'Manuale LuxInterventions',
  sub: 'La centrale e le sue applicazioni — guida illustrata',
  toc: 'Indice',
  shotsNote: 'Le schermate mostrano dati di esempio fittizi.',
  sec: {
    intro: ['Panoramica', `
<p>LuxInterventions riunisce in una sola <b>centrale</b> tutto ciò che serve per gestire immobili: interventi tecnici, inquilini, affitti, hotel, Airbnb, taxi, agenzie, proprietari e contabilità. Intorno alla centrale ogni persona riceve la propria applicazione, senza password da ricordare: basta un <b>codice di accesso</b>.</p>
<table><tr><th>Applicazione</th><th>Per chi</th><th>Cosa fa</th></tr>
<tr><td>🏢 Centrale</td><td>Voi (gestore)</td><td>Gestire tutto, creare gli accessi delle altre applicazioni</td></tr>
<tr><td>🏠 Spazio inquilino</td><td>Inquilini</td><td>Richieste di intervento, documenti, affitti, messaggi</td></tr>
<tr><td>🛠️ Squadra</td><td>Tecnici</td><td>Interventi del giorno, foto, firma, fine lavoro</td></tr>
<tr><td>🛎️ Il mio soggiorno</td><td>Clienti hotel / Airbnb</td><td>Arrivo, taxi, camera, servizi, messaggi</td></tr>
<tr><td>🚕 Taxi</td><td>Società di taxi</td><td>Autisti, auto, tariffe, corse da accettare</td></tr>
<tr><td>📣 Annunci</td><td>Ristoranti, bar (HORECA)</td><td>Pubblicità, menu, eventi nelle applicazioni</td></tr>
<tr><td>🔑 Centrale cliente</td><td>Amministrazioni, agenzie, hotel clienti</td><td>La loro centrale, in licenza</td></tr></table>
<p>Tutti i dati sono <b>cifrati sul dispositivo</b> prima di essere inviati: il server conserva solo casseforti illeggibili.</p>`],
    start: ['Primi passi', `
<ol><li>Aprite la centrale sul telefono o sul computer e scegliete la vostra <b>chiave di accesso</b> (una frase lunga che conoscete solo voi). Annotatela in un posto sicuro: senza di essa nessuno — nemmeno noi — può rileggere i dati.</li>
<li>Sul telefono aggiungete la centrale alla schermata Home: si apre come un’applicazione.</li>
<li>La centrale si apre su <b>un solo dispositivo alla volta</b>. Se la aprite altrove, toccate <b>«Prendi il controllo»</b>: l’altro dispositivo si chiude.</li>
<li>La lingua si sceglie in <b>Impostazioni</b> (francese, italiano, tedesco, inglese, portoghese, spagnolo).</li></ol>
<p>Sul telefono il menu è una barra in basso che scorre col dito; sul computer è a sinistra. I pulsanti <b>＋</b> creano subito una scheda.</p>`],
    accueil: ['Home', `
<p>La home riassume la giornata: interventi aperti e urgenti, affitti in attesa, arrivi in hotel, messaggi non letti. Toccate un numero per andare direttamente all’elenco corrispondente.</p>`],
    maintenance: ['Manutenzione e interventi', `
<p><b>Manutenzione</b> raccoglie tutti gli interventi: quelli creati da voi, quelli richiesti dagli inquilini e quelli inviati dai vostri clienti in licenza.</p>
<ol><li>Toccate <b>＋</b> per creare un intervento: immobile, alloggio, descrizione, urgenza, foto.</li>
<li>Scegliete il <b>tecnico</b>: lo riceve subito nella sua applicazione Squadra.</li>
<li>Seguite lo stato: da fare, in corso, terminato. Il tecnico aggiunge foto e firma; voi convalidate.</li></ol>
<p>La scheda di un tecnico contiene recapiti, mestiere e la scheda <b>App</b> che crea il suo codice di accesso. La <b>Classifica</b> premia gli inquilini più attivi («inquilino dell’anno»).</p>`],
    proprietes: ['Le mie proprietà', `
<p>Qui registrate i vostri immobili e i loro alloggi (appartamenti, monolocali, uffici, garage…). Ogni alloggio può ricevere un inquilino. Le schede <b>Inquilini</b> e <b>Gestione inq.</b> si trovano in questa sezione.</p>`],
    locataires: ['Inquilini e la loro applicazione', `
<ol><li>In <b>Inquilini</b> toccate <b>＋</b> e compilate la scheda: nome, telefono, alloggio, affitto, spese, inizio del contratto.</li>
<li>Aprite la scheda, scheda <b>Spazio</b>, e attivate lo <b>spazio inquilino</b>: appare un codice di accesso.</li>
<li>Inviate link e codice all’inquilino (WhatsApp, SMS, e-mail). Apre l’applicazione, digita il codice, ed è fatto.</li>
<li>Se l’inquilino perde il codice, riaprite la scheda <b>Spazio</b> e create un <b>nuovo codice</b>: il vecchio non funziona più.</li></ol>`],
    loyers: ['Affitti', `
<p><b>Gestione inq.</b> mostra mese per mese gli affitti attesi, pagati e in ritardo. Registrate un pagamento con un tocco; l’inquilino ritrova le ricevute nella sua applicazione.</p>`],
    hotel: ['Hotel', `
<p>La sezione <b>Hotel</b> gestisce camere e clienti.</p>
<ol><li><b>Impostazioni dell’hotel</b>: nome, indirizzo, servizi, menu in PDF.</li>
<li><b>Camere</b>: numero, piano, categoria, tipo, numero di persone, m², descrizione e <b>stato dei luoghi d’ingresso</b> con foto.</li>
<li><b>Cliente</b>: nome, paese (con bandiera), date, camera, formula pasti, preferenze e allergie, fino a 7 foto. Salvando si crea un <b>codice</b> per l’applicazione <b>Il mio soggiorno</b>.</li>
<li>Alla partenza fate lo <b>stato dei luoghi d’uscita</b> del cliente.</li></ol>`],
    airbnb: ['Airbnb', `
<p>La sezione <b>Airbnb</b> funziona come l’hotel, per alloggi affittati a notte: alloggi, ospiti, stato dei luoghi, codice dell’applicazione Il mio soggiorno.</p>`],
    taxis: ['Taxi', `
<p>Registrate le società di taxi partner. Ogni società riceve un codice per la sua applicazione <b>Taxi</b>, dove gestisce autisti, auto e tariffe. Quando un cliente chiede un taxi in Il mio soggiorno, la società riceve la corsa, la accetta o la rifiuta, e il cliente segue l’arrivo.</p>`],
    agences: ['Agenzie, proprietari e patrimonio', `
<p><b>Agenzie</b>: le agenzie immobiliari partner. Un’agenzia può lavorare <b>in proprio</b>, per <b>proprietari</b> o per <b>fondi d’investimento</b>.</p>
<p><b>Proprietari</b>: i proprietari degli immobili che gestite.</p>
<p><b>Patrimonio</b>: in ogni scheda indicate per tipo di bene (appartamenti, monolocali, garage, parcheggi, uffici, ristoranti…) la quantità con il menu 1…10 / 10+, poi il numero esatto.</p>`],
    gerances: ['Gérance (amministrazioni)', `
<p>Le amministrazioni (gérances) con cui lavorate: recapiti, immobili seguiti, patrimonio. Possono anche ricevere la propria centrale in licenza.</p>`],
    compta: ['Contabilità, abbonamenti e inserzionisti', `
<p><b>Contabilità</b>: entrate e uscite, fatture degli interventi, totali mensili.</p>
<p><b>Abbonamenti</b>: gli abbonamenti dei clienti e la scheda <b>Inserzionisti</b> (HORECA). Create un inserzionista: riceve un codice per l’applicazione <b>Annunci</b>. Le sue pubblicità arrivano qui per l’<b>approvazione</b> prima di comparire nelle applicazioni.</p>
<p>Il pagamento online non è ancora collegato: il pulsante è visibile ma indica «non connesso».</p>`],
    reglages: ['Impostazioni', `
<p>Lingua, dati della società, salvataggio: <b>Backup cifrato</b> crea un file .ares leggibile solo con la vostra chiave, <b>Export leggibile</b> un file JSON non cifrato, <b>Importa</b> ricarica l’uno o l’altro. Fate un backup regolare e conservatelo fuori dal telefono. Qui si trovano anche le <b>Licenze</b>.</p>`],
    licences: ['Licenze', `
<p>Potete dare ai vostri clienti (amministrazioni, agenzie, proprietari, hotel, Airbnb) <b>una centrale propria</b>, separata e cifrata.</p>
<ol><li><b>Tariffe</b>: per ogni filiera, il prezzo di un anno e lo sconto per 2 e 3 anni.</li>
<li><b>＋ Cliente</b>: filiera, nome, telefono. Il cliente parte con una <b>prova fissa di 15 giorni</b> e riceve un codice di accesso.</li>
<li>Nella scheda del cliente scegliete il pacchetto <b>1, 2 o 3 anni</b>: il prezzo cambia secondo il pacchetto. Viene creata una fattura PDF, segnata pagata o da pagare.</li>
<li>Alla scadenza la centrale del cliente passa in <b>sola lettura</b>; potete <b>bloccarla</b>, creare un nuovo accesso o <b>cancellarla</b> (viene rilasciato un certificato di cancellazione).</li></ol>
<p>La pagina Licenze mostra anche statistiche, registro ed export CSV.</p>`],
    client: ['La centrale del cliente', `
<p>Il cliente apre la sua centrale con il codice e sceglie la propria chiave. Vede solo le sezioni della sua filiera, con un banner di prova o di scadenza. Gestisce da sé i suoi beni; gli <b>interventi</b> restano fatti da LuxInterventions: le sue <b>richieste</b> arrivano cifrate direttamente nella vostra <b>Manutenzione</b>.</p>`],
    appLoc: ['Applicazione Spazio inquilino', `
<p>L’inquilino vede il suo alloggio, gli affitti e i documenti. Invia una <b>richiesta di intervento</b> con foto e ne segue l’avanzamento. Riceve i vostri messaggi e avvisi.</p>`],
    appEq: ['Applicazione Squadra', `
<p>Il tecnico vede gli interventi del giorno con indirizzo e percorso. Aggiunge foto prima/dopo, fa firmare e chiude l’intervento: lo vedete subito nella centrale.</p>`],
    appSejour: ['Applicazione Il mio soggiorno e pagina autista', `
<p>Il cliente dell’hotel o dell’Airbnb apre <b>Il mio soggiorno</b> con il suo codice: soggiorno, camera, servizi, menu, messaggi.</p>
<p><b>Arrivo</b>: sceglie «da solo» o <b>taxi</b>. Con il taxi vede la distanza in km e il prezzo in €, e segue l’ora di arrivo dell’autista. Durante il soggiorno può prenotare un autista.</p>
<p>L’autista riceve un <b>link</b> (niente da installare): «parto», «sono sul posto», «cliente a bordo», «arrivato». Viene trasmessa solo l’ora di arrivo, mai la posizione.</p>`],
    appTaxi: ['Applicazione Taxi', `
<p>La società di taxi registra i suoi <b>autisti</b> e le sue <b>auto</b> in tre classi: <b>lusso</b>, <b>comfort</b> ed <b>eco</b>, con tariffe (partenza, km, ora, giornata) ed extra (accoglienza, bevande, guardia del corpo…). Riceve le corse, le accetta o le rifiuta e assegna l’autista.</p>`],
    appAnn: ['Applicazione Annunci (HORECA)', `
<p>Il ristorante o il bar crea i suoi <b>annunci</b>, menu ed eventi: testo, immagine, giorni e orari, fascia, applicazioni mirate e prezzo. Ogni annuncio è inviato per approvazione alla centrale prima della diffusione.</p>`],
    secu: ['Sicurezza e buone pratiche', `
<ul><li>I dati sono cifrati sul dispositivo; la vostra chiave non viene mai inviata.</li>
<li>Non comunicate mai la vostra chiave; le altre applicazioni usano i loro codici, che potete sostituire in qualsiasi momento.</li>
<li>Fate dei backup (Impostazioni → Backup cifrato) e conservateli fuori dal telefono; l’export leggibile non è cifrato.</li>
<li>Un solo dispositivo alla volta apre la centrale: «Prendi il controllo» chiude l’altro.</li></ul>`],
  },
};
