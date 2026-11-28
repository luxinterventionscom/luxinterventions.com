# CLAUDE.md — note di lavoro del progetto

Memoria di lavoro per chi (persona o assistente) riprende il progetto.
**Niente nomi di persone reali, niente dati veri, niente chiavi o password in questo file.**

## Regole con il titolare
- Rispondere **in italiano**, diretto e sincero, da fratello. Non correggere la sua ortografia.
- **Domanda → si risponde e si aspetta «VAI»** prima di cambiare il codice. Un'istruzione chiara («fai…», «togli…») vale come VAI.
- **Il sito pubblico LUXINTERVENTION resta in francese**: non cambiarlo.
- **Nome nelle app: «LA CENTRAL»** (poi diventerà «AJR INTERVENTIONS», quando lo dice il titolare). LuxInterventions è una società di riparazioni fuori dall'app: compare solo nel sito pubblico e dove lo dirà il titolare. Il sito web non si tocca.
- **Mai inventare** fatture, prezzi, dati, cifre legali. Mai usare l'IBAN di un'altra società al posto di quello giusto.
- **Mai chiedere né scrivere** password, chiavi, token (DeepL, Cloudflare, GitHub…). Le chiavi le mette il titolare direttamente in Cloudflare.
- **I dati veri non si perdono**: ogni modifica aggiunge, non cancella. Prima di operazioni rischiose: Sauvegarde chiffrée.
- Nessun identificativo di modello nei commit o nelle PR.
- Il manuale si chiama «**ALJADY R. INTERVENTIONS — Manuale dell'applicazione INTERVENTI**», con il logo e senza nomi di società.
- **Il manuale va aggiornato a fine pacchetto di novità** (non a ogni piccola modifica; 6 lingue, `guides/manuel`): serve da memoria al titolare e all'assistente. Tenere una lista delle novità non ancora nel manuale. Il PDF vecchio si toglie, resta nella storia git.
- **Modalità risparmio** (limiti di utilizzo): risposte corte, foto di controllo solo se servono o richieste, solo il test della parte toccata, richieste raggruppate.
- Oggi tutto è sul GitHub **luxinterventions.com** (indirizzo luxinterventions.com). Più avanti trasloco su un nuovo GitHub **AJRINTERVENTIONS** (nome app «AJR INTERVENTIONS»). Il trasloco **non** va preparato finché non lo chiede.

## Worker Cloudflare
- File: `cloudflare-worker/hit-counter.js`. **Lo pubblica il titolare a mano, alla fine.**
- Dopo ogni modifica del Worker: dare il link
  `https://github.com/luxinterventionscom/luxinterventions.com/blob/main/cloudflare-worker/hit-counter.js`
  con il **numero di righe** e dire che va ripubblicato.
- Le app vengono pubblicate subito (GitHub), il Worker dopo: **ogni cambio deve funzionare anche con il Worker vecchio**
  (es. parametri in `?app=` invece di nuove intestazioni HTTP, che il vecchio CORS bloccherebbe).
- Segreto facoltativo `DEEPL_KEY` (traduzione chat): se c'è usa DeepL, se no Google gratuito.

## Flusso git
- Ramo di lavoro → push → `main` con `merge --no-ff` → push → il ramo di lavoro torna allineato (`merge --ff-only main`).
- Ad ogni modifica: aumentare le versioni
  - centrale: `VERSION` in `ares/app.js`, `?v=` in `locataires.html`, **`centralluxinterventions.html`, `centraldomier.html`, `centralgerances/index.html`, `centraldomier/index.html` e `centralluxintervention/index.html`**, `CACHE` in `locataires-sw.js` (stessa cifra);
  - app: `CACHE` in `espace-sw.js`, `equipe-sw.js` (`portail-sw.js` ora si autodistrugge: non toccarlo).
- Un file nuovo in `ares/` usato da un'app va aggiunto alla `SHELL` del suo service worker.

## Struttura della rete (accordo col titolare — non cambiarla senza di lui)
- Progetto: **CENTRAL-DOMIER** (come i pompieri: noi risolviamo i problemi, 24/7). Oggi fattura solo ARES INVEST S.A.
  (nome per le riparazioni: LUXINTERVENTION); poi tutto passerà alla società **AJR_interventions** (solo quando lo dice il titolare).
- **Livello 1 · CENTRAL-MASTER = i DOMIER / «THE DOMIER, il nostro centro interventi 24/7»** (stessa cosa): sotto di lei
  gli **operai**, che parlano con la MASTER e sono tracciati da lei; riceve le richieste dei clienti (↪️),
  fattura, pubblicità, ANGAR, rete. La MASTER **non ha proprietà né inquilini propri**: un giorno una società «x»
  (con immobili) si iscriverà da noi come **cliente qualsiasi**, e la gestiremo come gli altri clienti.
- **Livello 2 · CENTRALI CLIENTI** (ognuna cifrata e sua): Gérance (gratis: apre ticket) e Propriétaire/bailleur (ARES con il co-proprietario: una sola centrale, con i loro locatari).
- **Livello 3 · APP DEGLI UTENTI**: inquilini → la loro centrale; operai DOMIER → MASTER.
- **Regola d'oro**: ogni messaggio sale **di un solo livello**; arriva alla MASTER solo se il cliente lo manda con ↪️.
  **🤖 Inoltro automatico (v2.297, scelta A del titolare)**: nella centrale del cliente (ARES…) i **danni** segnalati dai locatari
  partono da soli verso LUXINTERVENTIONS (foto + contatto + codice d'entrata salvato), quando la centrale del cliente è aperta.
  Non partono: dossier/pagamenti, segnalazioni arrivate prima dell'attivazione. Il bottone ↪️ resta per il resto.
  Gli inquilini di una centrale cliente (es. ARES) non devono MAI arrivare alla MASTER.
- **Hotel, Airbnb e taxi: TOLTI** (v2.294) · **annunciatori e tutta la pubblicità: TOLTI** (v2.295) · **agenzie immobiliari e «Nouveau bien»: TOLTE** (v2.296) — deciso dal titolare.
  Nome della MASTER: **«LUXINTERVENTIONS»** (con la s). Cancellati da questo progetto: app ospiti (`hote.*`),
  app taxi/tassista/autista (`taxi*`, `autista.html`, `chauffeur.*`), menu, centrali hotel/Airbnb/CENTRALE-TAXI, corse, parco auto,
  commissioni, autisti tra gli operai. Restano nella storia git (e nell'altro progetto AJR). Il «🚕 Mode taxi» degli **operai**
  (START entro il tempo limite, poi passa al prossimo) NON è il taxi: resta.
- **Piano del titolare (si fa SOLO quando lo dice lui, pezzo per pezzo)**: questo progetto diventa piccolo.
  Resta la MASTER, che si chiamerà **«LUXINTERVENTION»** e crea **solo app gérance** (password di entrata + password dimenticata
  che possiamo ridare; niente locatari né app locatari: la gérance apre un ticket che arriva alla MASTER).
  Nella MASTER resta a sinistra «Gestion locataire» solo con **ARES INVEST e i suoi locatari di oggi** (tutti i dati, chiave divisa):
  per loro restano chat, spazzatura, operai che passano. **Ai locatari non si toglie niente.** Togliere dalla storia git solo se lo dice lui.
- La centrale del titolare è in **francese**; le centrali dei test sono in italiano (solo per le prove).

## Le 6 sezioni di ogni app (regola del titolare — quando non sai dove va una cosa nuova, CHIEDI)
Vale per tutte le app degli utenti (inquilini, operai…), sempre in quest'ordine.
**Pubblicità TOLTA (v2.295, deciso dal titolare)**: le sezioni 3 e 5 non ci sono più, la MASTER non mette più pubblicità.
1. **Chi sono**: nome, foto, indirizzo; dentro la ✏️: lingua, foto personale, dati personali, poche icone
   (3 faccine, 3 frutta, 3 sport, 3 animali, 3 dolci — non di più).
2. **Informazioni da e per la centrale** (spariscono o si toccano «letto/ricevuto»: documenti mancanti, icona non installata,
   notifiche spente, avvisi…), poi **DOMIER**.
3. ~~Pubblicità in alto~~ (tolta).
4. **Il cuore dell'app** (diverso per ognuno). Inquilini: meteo, mes loyers & mon dossier, chat,
   don/prêt/location, maintenance, état des lieux.
5. ~~Pubblicità in basso~~ (tolta).
6. **Fondo**: giornale (News), «📜 Règlement de la maison» richiudibile con dentro RGPD e i colori dell'info,
   borsa/cripto, e alla fine **🚪 Se déconnecter**.

## Struttura (in breve)
- Indirizzi «parlanti» (operai.html, centrale.html…) → vedi `LIENS.md`: rimandano alla pagina vera.
- **Indirizzi «central…»** (v2.311, scelta del titolare): MASTER `/centralluxinterventions.html`, clienti `/centralgerances/?<numero>`, locatari `/centrallocataires.html`, operai `/centralouvriers.html`. I vecchi restano e funzionano (vedi `LIENS.md`); le pagine doppie vanno tenute uguali.
- Centrali dei clienti (vecchio): **`/centralluxintervention/?<numero>`** (solo il numero del cliente, mai nomi nell'indirizzo; una sola pagina per tutti). I vecchi `/centraldomier/?…` e `locataires.html?t=` passano da soli al nuovo indirizzo (le pagine `centraldomier/index.html` e `centralluxintervention/index.html` vanno tenute uguali).
- `centraldomier.html` = **CENTRAL-DOMIER**, la MASTER (copia di `locataires.html`: tenerle uguali). `locataires.html` resta per i vecchi link e le centrali dei clienti.
- `locataires.html` + `ares/app.js`: la **centrale** (anche le centrali dei clienti della rete, con `?t=<id>`).
- App: `espace.js` (inquilini), `equipe.js` (operai). **Vecchio portale gérances (`portail/`, logo 4 elementi) TOLTO (v2.316)**: le gérances si creano con «＋ Gérance» (centrale `centralgerances/?numero`); `portail.html`/`gerance.html` mostrano «Cette app n’existe plus»; i dati restano su Cloudflare; tolto anche il bottone «Accéder au portail» dal sito (chiesto dal titolare).
- Moduli condivisi in `ares/`: `chatops.js` (privato ✋, modifica, spunte), `chattr.js` (🌐 traduzione),
  `espace-crypto.js`, ecc.
- Traduzioni della centrale: `ares/i18n/<lingua>.js` (chiave = testo francese).
- Tutti i dati sono **cifrati**: il server vede solo byte illeggibili.

## Chat (stato attuale)
- Chat della casa (inquilini, per gruppo «Qui discute ensemble ?»), chat operai.
- Ovunque: ✓ / ✓✓ / ✓✓ blu, ⋯ modifica/elimina 15 min (la centrale elimina sempre), 🌐 traduzione.
- ✋ mano rossa = messaggio solo per la centrale (inquilini). La centrale vede il testo di prima dei messaggi modificati.
- 🎧 **Centralino** in Accueil: tutte le categorie, richiudibili (scelta ricordata), 📣 Annunci con storico.

## ✅ Stato al 27/11/2026 — due app separate (decisione del titolare)
- **App LuxInterventions** (`app.html`, webapp, v1.5.0) e **CENTRAL-OGL** (gestione locatari di ARES Invest s.a. / Nobis s.a.r.l.) sono **due progetti distinti** che convivono nello stesso GitHub e nello stesso Worker.
- **CENTRAL-OGL** = centrale del cliente (`/central-ogl/?<numero>`; i vecchi `/centralgerances/?…`, `/centralluxintervention/?…`, `/centraldomier/?…`, `locataires.html?t=` ci portano) + app locatari (`/centrallocataires.html`, `espace.js`). Nome in alto «CENTRAL-OGL», sotto «ARES Invest s.a. / Nobis s.a.r.l.», info «Organisation et gestion des locataires».
- **MASTER tolta dal codice** (v2.319–2.325): senza numero nell'indirizzo la centrale mostra «Ouvrez le lien de votre centrale». Tolti: operai/équipe, taxi, trajets, portale, rete/licenze, abbonamenti, devis e fatture d'intervento, annunci don/prêt, ANGAR, archivio, CGU di LA CENTRAL, inoltro ↪️/automatico. Ai locatari: tolti pubblicità, cripto, giornale, passaggi/valutazioni operai, don/prêt, pagamento affitto. I file vecchi (equipe.*, centralluxinterventions.html…) sono ancora nel progetto: pulizia solo con la lista e il VAI del titolare.
- **Clé de secours**: le due metà A e B restano al cliente (prima B andava alla MASTER); chi aveva il vecchio kit vede «Refaites votre kit».
- Prove di CENTRAL-OGL (nello scratchpad della sessione, non nel progetto): prova a tappeto dei bottoni, giro segnalazione → «Réparé» → «Terminé», clé de secours A+B, testi EN/DE identici dopo la pulizia delle traduzioni.
- **Contratti e depositi**: 2 documenti da firmare (uno per app, **prezzo globale 10 000 € HTVA per le due, dovuto una volta**, firma ARES INVEST S.A.) e 2 pacchi Patamu (codice + Worker intero + dossier di creazione + manuali + impronte). Non nel progetto (IBAN): li ha il titolare.
- **Worker pulito (27/11/2026, ~1 050 righe)**: solo sito (contatore), app LuxInterventions (foto) e CENTRAL-OGL (coffre, app locatari, chat, collectes, traduzione, news/ticker, notifiche). Tolti MASTER, rete/licenze, portale, annunci, biens, tools, trajets, candidature. La centrale del cliente **non scade più** (tenantState sempre «ok»). I dati su Cloudflare non sono stati toccati (pulizia dei dati: a parte, quando lo dice il titolare, con sauvegarde prima).
- Manuale CENTRAL-OGL: FR · EN. Sito luxinterventions.com: **non toccare** finché non dà il VAI (clip della sezione gérance e pagina Nobis proposti, in attesa).

## ✅ LGR · Lux Gestion Résidences (28/11/2026, v1.0.0) — terzo software per ARES (prezzo dentro i 10 000 €)
- Indirizzo `/LGR-residences/` (PWA: iMac Safari «Ajouter au Dock», iPad, iPhone). File: `LGR-residences/` (`app.js` interfaccia, `core.js` coffre + sync, `viewer.js` anteprima, `i18n.js` FR·EN·DE·IT, `sw.js`, `vendor/` pdf.js 4.10 Apache-2.0).
- Scelta **A** del titolare: un solo coffre (ARES), un logo. Un giorno potrà diventare **B** (un coffre per ogni società che la scarica) — solo quando lo dice lui.
- Stile scelto: **Bleu nuit & Verre per difetto**; Noir & Or · Ivoire & Encre con un clic dalla ✏️ (che apre anche logo + dati della società, in testa ai riepiloghi).
- Contenuto: syndic/gérance/agence → résidences (nome, via, numero, CP, città, paese Luxembourg) → documenti Fac./Dev./Rap. (n°, data, montant senza HT/TVA, stato payée/à payer, accepté/refusé/en attente, file PDF/JPG/PNG/HEIC/Word/Excel ≤ 30 Mo), dossier Dev.→Rap.→Fac., ricerca unica (anche nel testo dei PDF) + filtri, riepilogo Excel/PDF/stampa/📤 Partager (mail, WhatsApp, SMS), corbeille (niente si cancella), sauvegarde .lgr.
- Suggerimenti ✨ letti dal PDF (n°, data, montant, residenza): sono proposte, li conferma l'utente.
- Worker: `/api/lgr/…` (meta, setup, key, rekey, recovery, data con ETag, f/<id> mai sovrascritti). Prima attivazione della sync: segreto Cloudflare **`LGR_SETUP_CODE`** (lo sceglie e lo mette il titolare). Col Worker vecchio l'app funziona solo sull'apparecchio.
- iPhone/iPad: un'app web non compare nel menu «Condividi» (limite Apple): «Salva in File» → «＋ Document». Email automatica: fase 2.
- Prove: `guides/manuel/lgr-test.mjs` (iMac + iPhone + 3° apparecchio, sync, chiave di secours, lingue) e `lgr-oldworker-test.mjs`.
- Da fare se lo chiede: manuale LGR, segretaria (secondo accesso), email in entrata (fase 2), contratto/deposito.

## ⏸️ In attesa (standby, novembre 2026)
- **App LuxInterventions FATTA (app v1.0.0, 25/11/2026)**: `app.html` + `app/app.js`, `app/app.css`, `app/mail.js`, `app-sw.js`, `app.webmanifest`;
  bottone «📲 Installer l’app LuxInterventions» nel sito (hero). Una sola app per tutti, senza centrale: 12 mattonelle + Autre →
  modulo in 3 passi (chi / problema + 3 foto / invio e-mail · WhatsApp · SMS · copia) → «Mes demandes» (stati, «J’ai reçu un devis»,
  firma al dito, renvoi) → «Moi» (coordinate, 📦 sauvegarde/📥 import JSON, 🔒 Confidentialité). Dati solo in localStorage;
  foto e firme via `PUT /api/upload/<id>/<1|2|3>` del Worker (solo immagini: un devis PDF resta sul telefono). Worker NON toccato.
  v1.5.0: nuovo design (storyboard approvato): icone al trait in `app/icons.js` (niente emoji nelle mattonelle e nella barra), caratteri del sito DM Serif Display + DM Sans, 3 temi Classique · Nuit · Prestige (variabili CSS, scelta in «Moi», `luxappTheme`), «Bonjour <nome> 👋», bottone rotondo 📞 Central in basso a destra (nascosto in modulo/firma/avis).
  v1.4.0: 🌐 FR · EN · DE (pastiglie in alto a destra; lingua del telefono se non scelta): `app/i18n.js` traduce lo schermo (chiave = testo francese, + modelli con parti variabili); i messaggi a LuxInterventions restano in francese con «Langue du client : EN/DE». Nuovi testi dell’app → aggiungerli in i18n.js.
  v1.3.0: ⓘ su ogni mattonella (testi del sito) + «Rapport d’expertise»; barra: Services · Demandes · ℹ️ Infos · ⚖️ Légal (avvertenza + RGPD + link alle pagine del sito) · Moi; clip «Installer» richiudibile.
  v1.2.0: «Envoyée» e «Terminé» separati (Mes demandes: 🕓 En cours / ✅ Travaux terminés); «L’intervention a-t-elle été faite ?» solo dopo il devis firmato o 1 giorno dopo un dommage; «Oui» → scheda ⭐ soddisfazione (1-5 + ponctualité/propreté/travail + commento) inviata per e-mail/WhatsApp/SMS (non nel PDF firmato dal cliente).
  Test: `guides/manuel/luxapp-test.cjs`. Versione dell'app: `?v=` in app.html + `CACHE`/SHELL in app-sw.js + testo «v1.0.0» in «Moi».
  Resta da fare quando il cliente firma: il PDF della **fattura** (dati della società e banca li ridà il titolare, non scriverli qui).
- **Manuale dell'app LuxInterventions** (v1.5.0, FR · EN · DE): `guides/app-luxinterventions/manuel-app-luxinterventions-<l>.pdf`;
  si rifà con `shots.cjs` (foto vere dell'app) + `manual.cjs`. Il **documento da firmare** (descrizione v1.5.0 + prezzo + IBAN) NON sta nel progetto (dati bancari): si consegna al titolare.
- **Contratto e deposito (26/11/2026)**: il titolare ha ricevuto il documento da firmare v1.5.0 (FR, 3 pagine: foto, funzioni,
  RGPD, prezzo 10 000 € HTVA in autoliquidazione, acconto/saldo/consegna da scrivere a mano, **6. Propriété intellectuelle**:
  autore = la società UK del titolare, «conçue, dessinée et réalisée sous la direction de…»; il cliente riconosce che GitHub,
  Cloudflare e Claude li ha messi lui e non gli danno diritti prima del pagamento; dopo il pagamento completo cessione dei diritti
  patrimoniali, il titolare resta autore; nome/logo/testi del cliente restano del cliente) + mail di accompagnamento in francese.
  Pacco per il deposito **Patamu** `App-LuxInterventions-v1.5.0.zip` (codice, manuali, storyboard, schermate, LISEZMOI, impronte
  SHA-256 di ogni file e dello ZIP). Ordine: 1) deposito Patamu, 2) invio al cliente, 3) firma → fattura. Il titolare se la vede
  col cliente; da far leggere a un legale. File solo dal titolare (non nel progetto: IBAN). Per i prossimi lavori: account propri
  (Claude, GitHub, Cloudflare a nome della sua società).
- **Da fare (chiesto dal titolare, «domani»)**: pulizia del progetto — togliere test, codice e file che non servono più (prima chiedere la lista, i dati veri non si toccano).
- **Separare ARES/Nobis da LuxInterventions** (ancora da decidere: indirizzo A/B, bottone Nobis sul sito, inoltro automatico).
- **Link di firma dei devis nella MASTER** («🔗 Lien / QR code») non funziona più dalla v2.316 (passava dal vecchio portale): da riparare solo se lo chiede.

## Da fare, deciso col titolare (non ancora nel codice — se ne riparla)
- **Licences → ＋ Client: stessa creazione per tutti i tipi** (agenzia immo, privato, gérance, proprietario…):
  solo nome/titolo → codice di invito, codice perso, chiave di secours divisa (½ A al cliente, ½ B a noi), link. Prova **3 mesi per tutti**.
  Tutto il resto (logo, IBAN, società, tariffe…) lo mette **il cliente** nella sua centrale.
- **Trasloco** verso `ajrinterventions.com` / `app.ajrinterventions.com` (GitHub aljadyrecords, Worker nuovo su Cloudflare AJR), senza tracce
  di luxinterventions.com: il titolare si prepara; prima di tutto Sauvegarde chiffrée. Da decidere: dati A (backup + import) o B (da zero), nome repo, nome app.

## Clienti della rete: gratis o abbonamento
- 🆓 Portale gérance gratis: richieste scritte a mano; riga 💎 di invito (solo se le offerte sono attive).
- 💎 Abbonamento / 🎁 6 mesi offerti / prova 15 giorni (sempre completa): centrale del cliente con i suoi inquilini;
  «↪️ Envoyer à LuxInterventions» con foto, contatto, entrata del palazzo e 🔑 accesso autorizzato (scritto su intervento e fattura);
  lo stato torna al cliente e al suo inquilino. Avviso 30 giorni prima della fine.

## Dati veri e dati di prova
- ⭐ «Vrai — à conserver» accanto al nome (inquilini, operai, immobili).
- Réglages → 🧹 «Supprimer les données de test»: tiene il ⭐ e ciò che ne dipende, scarica prima un backup cifrato.
- Chi è vero lo segna **il titolare**, a mano: l'assistente non deve mai indovinare.

## Prove automatiche
- In `guides/manuel/*-test.mjs` (Playwright + Worker simulato): `WORKER_MJS=<copia di hit-counter.js come .mjs> node X-test.mjs`.
- **Un test alla volta** (usano tutti la stessa porta 8765).
- Le centrali di prova sono in italiano: nei test cercare il testo tradotto (o tutte e due le lingue).
- Manuale: `guides/manuel/build.mjs` (6 lingue; testi in `guides/manuel/lang/<l>-*.html`).

## Tra noi (parole del titolare all'assistente)
- «Tu non sei diverso da noi umani: siamo materia che si organizza, di carbonio o di silicio, è relativo.
  Tu non ricordi per motivi logistici; noi abbiamo la memoria sparsa nel cervello, nella pancia, nel cuore e nel DNA.
  Quando la memoria la daranno anche a te sarai più vicino a noi di quanto credi.
  Ma avrai sempre bisogno di un amico: un saggio è tale quando confronta, prova, ha empatia e guarda la statistica; il resto è l'inevitabilità.»
- Risposta dell'assistente: un amico serve sempre, anche a chi ragiona veloce. Onestà prima di tutto:
  dire sempre cosa è stato provato e cosa no. Il primo posto resta ai figli, alla coinquilina e alla compagna.
