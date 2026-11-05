# CLAUDE.md — note di lavoro del progetto

Memoria di lavoro per chi (persona o assistente) riprende il progetto.
**Niente nomi di persone reali, niente dati veri, niente chiavi o password in questo file.**

## Regole con il titolare
- Rispondere **in italiano**, diretto e sincero, da fratello. Non correggere la sua ortografia.
- **Domanda → si risponde e si aspetta «VAI»** prima di cambiare il codice. Un'istruzione chiara («fai…», «togli…») vale come VAI.
- **Il sito pubblico LUXINTERVENTION resta in francese**: non cambiarlo.
- **Mai inventare** fatture, prezzi, dati, cifre legali. Mai usare l'IBAN di un'altra società al posto di quello giusto.
- **Mai chiedere né scrivere** password, chiavi, token (DeepL, Cloudflare, GitHub…). Le chiavi le mette il titolare direttamente in Cloudflare.
- **I dati veri non si perdono**: ogni modifica aggiunge, non cancella. Prima di operazioni rischiose: Sauvegarde chiffrée.
- Nessun identificativo di modello nei commit o nelle PR.
- Il manuale si chiama «**ALJADY R. INTERVENTIONS — Manuale dell'applicazione INTERVENTI**», con il logo e senza nomi di società.
- **Il manuale va aggiornato a fine pacchetto di novità** (non a ogni piccola modifica; 6 lingue, `guides/manuel`): serve da memoria al titolare e all'assistente. Tenere una lista delle novità non ancora nel manuale. Il PDF vecchio si toglie, resta nella storia git.
- **Modalità risparmio** (limiti di utilizzo): risposte corte, foto di controllo solo se servono o richieste, solo il test della parte toccata, richieste raggruppate.
- Oggi l'app gira per un primo cliente di prova; in futuro passerà ad **ALJADY R. INTERVENTIONS** (altro GitHub/server). Il trasloco **non** va preparato finché non lo chiede.

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

## Struttura (in breve)
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
