# Contatore aperture pagina — deploy su Cloudflare

Account dedicato, slegato dal dominio `luxinterventions.com`: DNS e posta
restano su Gandi, invariati. Circa 5 minuti, nessun costo nei limiti di
traffico normali di questo sito.

## 1. Crea il Worker

1. Vai su [dash.cloudflare.com](https://dash.cloudflare.com), account
   appena creato.
2. Menu laterale → **Workers & Pages** → **Create** → **Create Worker**.
3. Dai un nome, ad esempio `luxinterventions-hitcounter` → **Deploy**
   (va bene anche il codice di default per ora, lo sostituiamo subito).
4. Apri **Edit code**, cancella tutto e incolla il contenuto del file
   `hit-counter.js` di questa cartella → **Deploy**.

## 2. Crea lo storage (KV) per il numero

1. Nel dashboard: **Workers & Pages** → **KV** → **Create namespace**.
2. Nome, ad esempio: `luxinterventions-counter` → **Add**.
3. Torna sul tuo Worker → **Settings** → **Variables** → sezione
   **KV Namespace Bindings** → **Add binding**:
   - Variable name: `HITS` (esattamente così, il codice lo richiede)
   - KV namespace: `luxinterventions-counter` (quello appena creato)
4. Salva/Deploy.

## 3. Recupera l'indirizzo del Worker

Nella pagina del Worker, sotto il nome, trovi l'URL pubblico, del tipo:

```
https://luxinterventions-hitcounter.<tuo-account>.workers.dev
```

L'endpoint del contatore sarà: `<quello-sopra>/api/hits`

**Comunicami questo indirizzo** per completare il collegamento sul sito —
sostituirà il numero casuale attuale con quello reale.

## Note

- Il Worker accetta chiamate solo dall'origine `https://luxinterventions.com`
  (CORS). Se in futuro cambiate dominio, aggiornate `ALLOWED_ORIGIN` nel
  file `hit-counter.js`.
- Nessun dato personale è coinvolto: si incrementa e legge un solo numero
  intero in KV.
- Piano gratuito Cloudflare Workers: 100.000 richieste/giorno — ampiamente
  sufficiente per un contatore di aperture pagina di questo sito.
- Questo account Cloudflare non è collegato in alcun modo a DNS o email
  di luxinterventions.com: resta uno strumento a parte, che ospita solo
  questa piccola funzione.
