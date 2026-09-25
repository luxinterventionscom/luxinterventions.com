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

## 5. Archivio cifrato "Ares — Gestion locataires" (nuovo)

`locataires.html` salva i dati **cifrati nel browser** (AES-256-GCM) su questo
stesso Worker. Usa i binding già esistenti (`PHOTOS` per i dati, `HITS` per il
blocco dei tentativi): **non serve creare nulla di nuovo**, solo:

1. Aggiorna il codice del Worker: **Edit code** → incolla per intero il nuovo
   `hit-counter.js` → **Deploy**.
2. Sul Worker → **Settings** → **Variables and Secrets** → **Add**:
   - Type: **Secret**
   - Name: `ARES_SETUP_CODE`
   - Value: un codice lungo a tua scelta (serve **una sola volta**, per la
     prima configurazione) → **Deploy**.
3. Apri `https://luxinterventions.com/locataires.html`: la prima volta chiede
   il codice del punto 2 e ti fa scegliere la **chiave di accesso**.
   Da quel momento basta la chiave, su qualsiasi telefono o computer.

Importante:
- La chiave di accesso **non è recuperabile**: se la perdi, i dati restano
  illeggibili. Conservala in un posto sicuro (es. gestore di password).
- Dopo la prima configurazione il codice `ARES_SETUP_CODE` non serve più
  (la configurazione non può essere rifatta sopra dati esistenti).
- Dopo 10 tentativi errati lo stesso indirizzo IP viene bloccato per 15 minuti.
- File su R2: `ares/meta.json`, `ares/data.bin`, `ares/files/<id>` — tutti
  illeggibili senza la chiave.

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
