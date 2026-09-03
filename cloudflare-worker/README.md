# Worker Cloudflare — deploy

Account dedicato, slegato dal dominio `luxinterventions.com`: DNS e posta
restano su Gandi, invariati. Gestisce due funzioni: il contatore reale
di aperture pagina, e l'upload delle foto per il modulo "Rapport d'expert".

## 1. Crea il Worker (già fatto se hai già impostato il contatore)

1. Vai su [dash.cloudflare.com](https://dash.cloudflare.com), account
   appena creato.
2. **Compute** → **Workers & Pages** → **Create** → **Create Worker**.
3. Nome: `luxinterventions-hitcounter` → **Deploy**.
4. Apri **Edit code**, cancella tutto e incolla il contenuto aggiornato
   del file `hit-counter.js` di questa cartella → **Deploy**.
   (Se avevi già incollato la versione precedente, sostituiscila per
   intero con quella nuova — contiene anche le funzioni foto.)

## 2. Storage KV per il contatore (già fatto se già impostato)

1. **Storage & databases** → **Workers KV** → **Create namespace** →
   nome `luxinterventions-counter`.
2. Sul Worker → tab **Bindings** → **Add binding** → tipo **KV Namespace**:
   - Variable name: `HITS`
   - Namespace: `luxinterventions-counter`

## 3. Storage R2 per le foto (nuovo — da fare ora)

1. **Storage & databases** → **R2 Object Storage** → **Create bucket**.
2. Nome, ad esempio: `luxinterventions-photos` → **Create bucket**
   (lasciare le impostazioni di default va bene).
3. Torna sul Worker `luxinterventions-hitcounter` → tab **Bindings** →
   **Add binding** → tipo **R2 Bucket**:
   - Variable name: `PHOTOS` (esattamente così, il codice lo richiede)
   - Bucket: `luxinterventions-photos` (quello appena creato)
4. Salva.

## 4. Verifica

L'indirizzo del Worker resta lo stesso di prima:

```
https://luxinterventions-hitcounter.<tuo-account>.workers.dev
```

- Contatore: `<quello-sopra>/api/hits`
- Upload foto: `<quello-sopra>/api/upload/<id>/<1|2|3>` (uso automatico dal sito)
- Foto salvate, visibili da link: `<quello-sopra>/photos/<id>/<1|2|3>.<ext>`

Nessuna azione da fare su questi ultimi due — li richiama automaticamente
il modulo del sito una volta collegato.

## Note

- Il Worker accetta chiamate solo dall'origine `https://luxinterventions.com`
  (CORS) per contatore e upload. Le foto stesse, una volta caricate, sono
  raggiungibili solo da chi ha il link esatto (non elencate pubblicamente,
  non indicizzate) — sufficiente per l'uso previsto (il personale le apre
  dal link ricevuto via email).
- Nessun dato personale oltre alle foto caricate volontariamente dal
  cliente per la propria richiesta.
- Piani gratuiti Cloudflare Workers/KV/R2: ampiamente sufficienti per il
  traffico normale di questo sito.
- Questo account Cloudflare non è collegato in alcun modo a DNS o email
  di luxinterventions.com: resta uno strumento a parte.
