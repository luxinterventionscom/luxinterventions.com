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
  - centrale: `VERSION` in `ares/app.js`, `?v=` in `locataires.html`, `CACHE` in `locataires-sw.js` (stessa cifra);
  - app: `CACHE` in `espace-sw.js`, `equipe-sw.js`, `hote-sw.js`, `taxi-sw.js`, `annonce-sw.js`, `portail-sw.js`.
- Un file nuovo in `ares/` usato da un'app va aggiunto alla `SHELL` del suo service worker.

## Struttura della rete (accordo col titolare — non cambiarla senza di lui)
- Progetto: **CENTRAL-DOMIER** (come i pompieri: noi risolviamo i problemi, 24/7). Oggi fattura solo ARES INVEST S.A.
  (nome per le riparazioni: LUXINTERVENTION); poi tutto passerà alla società **AJR_interventions** (solo quando lo dice il titolare).
- **Livello 1 · CENTRAL-MASTER = i DOMIER / «THE DOMIER, il nostro centro interventi 24/7»** (stessa cosa): sotto di lei
  gli **operai**, che parlano con la MASTER e sono tracciati da lei; riceve le richieste dei clienti (↪️) e degli annunciatori,
  fattura, pubblicità, ANGAR, rete. La MASTER **non ha proprietà né inquilini propri**: un giorno una società «x»
  (con immobili) si iscriverà da noi come **cliente qualsiasi**, e la gestiremo come gli altri clienti.
- **Livello 2 · CENTRALI CLIENTI** (ognuna cifrata e sua): Gérance, Agence immobilière, Propriétaire/bailleur → inquilini;
  Hotel, Airbnb → ospiti.
- **Livello 3 · APP DEGLI UTENTI**: inquilini → la loro centrale; ospiti → il loro hotel/Airbnb; operai DOMIER → MASTER;
  **annunciatori → chat diretta con la MASTER** (non hanno clienti sotto).
- **Regola d'oro**: ogni messaggio sale **di un solo livello**; arriva alla MASTER solo se il cliente lo manda con ↪️.
  Gli inquilini di una centrale cliente (es. ARES) non devono MAI arrivare alla MASTER.
- **Taxi — in sospeso, ne riparliamo ai test TAXI**: idea logica = CENTRAL-TAXI con sotto gli **operai-tassisti** (GPS, chat di gruppo);
  forse siamo noi a dare il servizio (paghiamo la corsa, il cliente paga a noi con il rincaro) e le richieste dei sotto-clienti
  salgono a noi; per hotel/Airbnb non è chiaro (forse carta di credito obbligatoria). **Non costruire niente finché non lo decide.**
- La centrale del titolare è in **francese**; le centrali dei test sono in italiano (solo per le prove).

## Struttura (in breve)
- Indirizzi «parlanti» (operai.html, ospiti.html, centrale.html…) → vedi `LIENS.md`: rimandano alla pagina vera.
- `locataires.html` + `ares/app.js`: la **centrale** (anche le centrali dei clienti della rete, con `?t=<id>`).
- App: `espace.js` (inquilini), `equipe.js` (operai), `hote.js` (ospiti hotel/Airbnb), `taxi.js` (ditte taxi),
  `annonce.js` (annunciatori HORECA), `portail/` (gérances).
- Moduli condivisi in `ares/`: `chatops.js` (privato ✋, modifica, spunte), `chattr.js` (🌐 traduzione),
  `pchat.js` (chat partner/ospiti), `pubsocial.js` (👍👎👉), `espace-crypto.js`, ecc.
- Traduzioni della centrale: `ares/i18n/<lingua>.js` (chiave = testo francese).
- Tutti i dati sono **cifrati**: il server vede solo byte illeggibili.

## Chat (stato attuale)
- Chat della casa (inquilini, per gruppo «Qui discute ensemble ?»), chat operai, chat taxi, chat annunciatori, chat ospiti.
- Ovunque: ✓ / ✓✓ / ✓✓ blu, ⋯ modifica/elimina 15 min (la centrale elimina sempre), 🌐 traduzione.
- ✋ mano rossa = messaggio solo per la centrale (inquilini). La centrale vede il testo di prima dei messaggi modificati.
- 🎧 **Centralino** in Accueil: tutte le categorie, richiudibili (scelta ricordata), 📣 Annunci con storico.

## Clienti della rete: gratis o abbonamento
- 🆓 Portale gérance gratis: richieste scritte a mano; riga 💎 di invito (solo se le offerte sono attive).
- 💎 Abbonamento / 🎁 6 mesi offerti / prova 15 giorni (sempre completa): centrale del cliente con i suoi inquilini;
  «↪️ Envoyer à LuxInterventions» con foto, contatto, entrata del palazzo e 🔑 accesso autorizzato (scritto su intervento e fattura);
  lo stato torna al cliente e al suo inquilino. Avviso 30 giorni prima della fine.

## Dati veri e dati di prova
- ⭐ «Vrai — à conserver» accanto al nome (inquilini, operai, immobili, ospiti).
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
