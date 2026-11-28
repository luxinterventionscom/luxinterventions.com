/**
 * Worker Cloudflare du site luxinterventions.com — commun à deux applications :
 *
 * 1) Le site : compteur d'ouvertures de page (GET /api/hits, KV « HITS »).
 * 2) App LuxInterventions : envoi des photos et signatures
 *      PUT /api/upload/<requestId>/<1|2|3>  -> { "url": "https://.../photos/..." }
 *      GET /photos/<requestId>/<1|2|3>.<ext> (R2 « PHOTOS »)
 * 3) CENTRAL-OGL (organisation et gestion des locataires) :
 *      /api/ares/t/<numéro>/…  coffre chiffré de la centrale (le Worker ne garde que des octets chiffrés, AES-256-GCM)
 *      /api/esp/…, /api/esp-code, /api/board/…, /api/pub/…  apps des locataires (contenu chiffré de bout en bout),
 *      /api/tr (traduction des messages), /api/news et /ticker (actualités de l'accueil), notifications (D1 « DB »).
 * 4) LGR · Lux Gestion Résidences (/LGR-residences/) : /api/lgr/…  coffre chiffré séparé (documents des syndics),
 *      secret « LGR_SETUP_CODE » pour la première configuration.
 */

const ALLOWED_ORIGIN = "https://luxinterventions.com";
const ALLOWED_ORIGINS = [ALLOWED_ORIGIN, "https://www.luxinterventions.com"];
const KV_KEY = "total_views";
const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8MB — il browser comprime prima di inviare
const UPLOAD_TYPES = /^image\/(jpeg|png|webp|heic|heif)$/; // niente SVG/HTML: non devono poter eseguire codice
const UPLOAD_MAX_PER_HOUR = 30; // upload pubblici per indirizzo IP e per ora

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, PUT, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, If-Match, If-None-Match, X-Ares-Session, X-Ares-Device, X-Esp, X-Event-Id, X-Invoice, X-Devis, X-Push",
    "Access-Control-Expose-Headers": "ETag",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "no-store",
    "Vary": "Origin",
    "X-Content-Type-Options": "nosniff",
  };
}

export default {
  async fetch(request, env, ctx) {
    const headers = corsHeaders(request.headers.get("Origin") || "");
    try {
      return await route(request, env, ctx, headers);
    } catch {
      return new Response(JSON.stringify({ error: "Erreur serveur" }), { status: 500, headers: { "Content-Type": "application/json", ...headers } });
    }
  },
};

async function route(request, env, ctx, headers) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers });
    }

    // ── Barre des cours crypto (TradingView) pour le bas des apps : servie ici, sur un autre domaine que le site,
    // pour que le script de TradingView ne puisse rien lire des apps (données chiffrées, clés) ──
    if (url.pathname === "/ticker" && request.method === "GET") return tickerPage(url.searchParams.get("m"));

    // Statistiques anonymes des annonces (vues / clics) envoyées par les apps : aucun nom, aucune donnée personnelle
    // 🙋‍♀️🙋🏾 Candidatures « Je cherche du travail » : clé publique de la centrale principale (publique par nature) et dépôt chiffré
    // (locataires, hôtes, taxis — aussi ceux des centrales des clients : la candidature va directement chez nous)
    // 🔧 logo DOMIER (choisi dans la centrale principale) : public, affiché dans le bandeau DOMIER de toutes les apps
    // 📰 Titres de L'essentiel (flux RSS publics) pour la barre « News » des apps : titre, lien, heure — gardés 15 min
    if (url.pathname === "/api/news" && request.method === "GET") return newsGet(url, ctx, headers);
    // 📣 Annonces du réseau (lecture publique) : apps des locataires et clients des centrales des clients, apps des annonceurs

    // ── Archivio cifrato Ares (gestion locataires) ──
    if (url.pathname.startsWith("/api/ares/")) {
      return handleAres(request, env, url, headers);
    }

    // ── LGR · Lux Gestion Résidences : coffre chiffré à part (documents des syndics et résidences) ──
    if (url.pathname.startsWith("/api/lgr/")) {
      return handleLgr(request, env, url, headers);
    }

    // ── Calendrier public des collectes (locataires) : /api/pub/<token>.json | .ics ──
    // ── Espace locataire (public, contenu chiffré de bout en bout) ──
    // Code d'accès saisi dans l'app des locataires (empreinte du code seulement ; essais limités)
    if (url.pathname === "/api/esp-code" && request.method === "POST") return espaceCode(request, env, headers);



    // Clé publique des notifications (badge sur l'icône) des apps locataires / équipe / gestion
    if (url.pathname === "/api/esp-push/key" && request.method === "GET") {
      if (!(await espPushInit(env))) return aresJson({ error: "Notifications indisponibles" }, 503, headers);
      return aresJson({ key: (await vapidKeys(env)).publicKey }, 200, headers);
    }

    const esp = url.pathname.match(/^\/api\/esp\/([0-9a-f]{32})(?:\/(f\/[a-z0-9]{1,40}|signal|push))?$/);
    if (esp) return espacePublic(request, env, esp[1], esp[2] || "", headers);

    const board = url.pathname.match(/^\/api\/board\/([0-9a-f]{32})$/);
    if (board) return boardPublic(request, env, board[1], headers);

    // 🌐 traduction des messages des chats (textes courts) : DeepL si la clé DEEPL_KEY existe, sinon le traducteur gratuit de Google
    if (url.pathname === "/api/tr" && request.method === "POST") return chatTranslate(request, env, headers);

    const pub = url.pathname.match(/^\/api\/pub\/([0-9a-f]{32})\.(json|ics)$/);
    if (pub && request.method === "GET") return publicCollectes(env, pub[1], pub[2], url, headers);

    // ── 🚗 Trajet de l'ouvrier (« Je pars » → heure d'arrivée) : lu par le locataire, la gérance, la central ──

    // ── Portail Gérance / Syndic (vedi la sezione PORTAIL più sotto) ──

    // ── Contatore aperture pagina ──
    if (url.pathname === "/api/hits" && request.method === "GET") {
      const current = parseInt((await env.HITS.get(KV_KEY)) || "0", 10);
      const next = current + 1;
      // Se la quota giornaliera di scritture KV è esaurita il contatore resta fermo, senza errore
      try { await env.HITS.put(KV_KEY, String(next)); } catch { /* quota KV */ }
      return new Response(JSON.stringify({ count: next }), {
        headers: { "Content-Type": "application/json", ...headers },
      });
    }

    // ── Upload foto (rapport d'expert) ──
    const uploadMatch = url.pathname.match(/^\/api\/upload\/([a-zA-Z0-9-]{8,64})\/([1-3])$/);
    if (uploadMatch && request.method === "PUT") {
      const [, requestId, index] = uploadMatch;
      const contentType = (request.headers.get("Content-Type") || "").toLowerCase();
      if (!UPLOAD_TYPES.test(contentType)) {
        return new Response(JSON.stringify({ error: "Type de fichier non autorisé" }), {
          status: 415,
          headers: { "Content-Type": "application/json", ...headers },
        });
      }
      const body = await request.arrayBuffer();
      if (body.byteLength === 0 || body.byteLength > MAX_FILE_BYTES) {
        return new Response(JSON.stringify({ error: "Fichier vide ou trop volumineux" }), {
          status: 413,
          headers: { "Content-Type": "application/json", ...headers },
        });
      }
      // Limite per IP: evita che qualcuno usi il Worker come deposito di file
      const rlKey = "up-rl:" + clientIp(request);
      const used = parseInt((await env.HITS.get(rlKey)) || "0", 10);
      if (used >= UPLOAD_MAX_PER_HOUR) {
        return new Response(JSON.stringify({ error: "Trop d'envois. Réessayez plus tard." }), {
          status: 429,
          headers: { "Content-Type": "application/json", ...headers },
        });
      }
      try { await env.HITS.put(rlKey, String(used + 1), { expirationTtl: 3600 }); } catch { /* quota KV */ }
      const ext = contentType.split("/")[1].replace("jpeg", "jpg");
      const key = `reports/${requestId}/${index}.${ext}`;
      // Una foto già caricata non può essere sostituita da altri
      const stored = await env.PHOTOS.put(key, body, { httpMetadata: { contentType }, onlyIf: { etagDoesNotMatch: "*" } });
      if (!stored) {
        return new Response(JSON.stringify({ error: "Photo déjà envoyée" }), {
          status: 409,
          headers: { "Content-Type": "application/json", ...headers },
        });
      }
      const photoUrl = `${url.origin}/photos/${requestId}/${index}.${ext}`;
      return new Response(JSON.stringify({ url: photoUrl }), {
        headers: { "Content-Type": "application/json", ...headers },
      });
    }

    // ── Servire le foto caricate ──
    const photoMatch = url.pathname.match(/^\/photos\/([a-zA-Z0-9-]{8,64})\/([1-3]\.\w+)$/);
    if (photoMatch && request.method === "GET") {
      const [, requestId, filename] = photoMatch;
      const object = await env.PHOTOS.get(`reports/${requestId}/${filename}`);
      if (!object) return new Response("Not found", { status: 404, headers });
      return new Response(object.body, {
        headers: {
          "Content-Type": object.httpMetadata?.contentType || "application/octet-stream",
          ...headers,
          "Cache-Control": "public, max-age=31536000, immutable",
          "X-Content-Type-Options": "nosniff",
          "Content-Security-Policy": "default-src 'none'; img-src 'self'; sandbox",
        },
      });
    }

    return new Response("Not found", { status: 404, headers });
}

/* ════════════════════════════════════════════════════════════════════════
 * ARES — archivio cifrato end-to-end per locataires.html
 *
 * Il browser deriva dalla chiave di accesso (PBKDF2 + HKDF):
 *   - un token di autenticazione, di cui il Worker conosce solo l'hash SHA-256;
 *   - una chiave che protegge la chiave dati (AES-256-GCM).
 * Il Worker vede e conserva soltanto byte cifrati.
 *
 * Storage (binding già esistenti, nessuna nuova configurazione):
 *   R2 "PHOTOS"  ares/meta.json      sale, iterazioni, chiave dati cifrata, hash token
 *                ares/data.bin       database cifrato (scrittura condizionale via ETag)
 *                ares/files/<id>     documenti PDF cifrati
 *   KV "HITS"    ares-rl:<ip>        tentativi falliti (blocco 15 min dopo 10 errori)
 *
 * Secret del Worker (una volta sola, vedi README):
 *   ARES_SETUP_CODE  codice richiesto solo per la prima configurazione
 *
 * Rotte:
 *   GET    /api/ares/meta          { salt, iter } pubblici | 404 se non configurato
 *   POST   /api/ares/setup         prima configurazione (richiede ARES_SETUP_CODE)
 *   GET    /api/ares/key           chiave dati cifrata                 [auth]
 *   POST   /api/ares/rekey         cambio della chiave di accesso      [auth]
 *   POST   /api/ares/recovery      crea la chiave di secours           [auth principale]
 *   GET|POST /api/ares/ops, DELETE /api/ares/ops/<id>  operatori della centrale (password personali) [auth principale]
 *   (la chiave di secours apre il coffre come la chiave di accesso e permette
 *    di sceglierne una nuova se è stata dimenticata)
 *   GET    /api/ares/data          database cifrato + ETag             [auth]
 *   PUT    /api/ares/data          If-Match / If-None-Match: *         [auth]
 *   GET|PUT|DELETE /api/ares/files/<id>                               [auth]
 *   POST   /api/ares/session       apre la sessione esclusiva (force: prende la mano) [auth]
 *   DELETE /api/ares/session       chiude la sessione                  [auth]
 *
 * Centrali dei clienti (abbonamento, prova) : stessa API sotto /api/ares/t/<id>/… — cassaforte separata
 * in ares/t/<id>/ (meta, dati, file, sessione, casella), registro in ares/tenants/<id>.json (gestito solo dalla
 * centrale principale : /api/ares/tenants), spazi e codici delle app dei clienti marcati con il proprietario
 * (ares/own/<espId>, ares/tidx/<id>/…) ; cancellazione completa con certificato (ares/tenants-deleted/<id>.json).
 *
 * Sessione esclusiva: un solo dispositivo connesso alla volta. Ogni richiesta
 * porta l'header X-Ares-Session; se un altro dispositivo è attivo (ultima
 * richiesta da meno di 2 minuti) la risposta è 409 e l'app si blocca.
 * ════════════════════════════════════════════════════════════════════════ */

const ARES_META = "ares/meta.json";
const ARES_DATA = "ares/data.bin";
const ARES_FILES = "ares/files/";
const ARES_MAX_DATA = 20 * 1024 * 1024;
const ARES_MAX_FILE = 12 * 1024 * 1024;
const ARES_MAX_FAILS = 10;
const ARES_LOCK_SECONDS = 900;
const ARES_SESSION = "ares/session.json";
const ARES_PUBLIC = "ares/public/";
const ARES_ESPACE = "ares/espace/"; // espaces locataires : données chiffrées avec une clé que seul le lien du locataire contient
const ARES_INBOX = "ares/inbox/";
const ARES_BOARD = "ares/board/"; // mini-chat de chaque logement : messages chiffrés avec une clé que seuls les habitants et le gestionnaire ont
const BOARD_TTL_MS = 90 * 24 * 3600 * 1000; // messages effacés après 90 jours
const BOARD_MAX = 150;
const ARES_ESPCODE = "ares/espcode/"; // code d'accès court → clé de l'espace enveloppée (illisible sans le code) // signalements des locataires, chiffrés pour le gestionnaire (clé publique)
const ARES_LEASE_MS = 120 * 1000; // un dispositivo inattivo da 2 minuti non è più considerato connesso
const ARES_RENEW_MS = 20 * 1000;

// ── Calendrier public des collectes : JSON pour la page locataires, .ics pour les agendas des téléphones ──
const PUB_I18N = {
  fr: { put: "Sortir", truck: "Passage du camion", cal: "Collectes", cats: { residuel: "Déchets résiduels", organique: "Biodéchets", papier: "Papier / carton", verre: "Verre", valorlux: "Valorlux (sacs bleus)", encombrants: "Encombrants", autre: "Autre collecte" }, lieux: { rue: "Sur le trottoir", soussol: "Au sous-sol (local poubelles)", garage: "Au garage" } },
  it: { put: "Mettere fuori", truck: "Raccolta", cal: "Raccolta rifiuti", cats: { residuel: "Indifferenziato", organique: "Organico / umido", papier: "Carta / cartone", verre: "Vetro", valorlux: "Valorlux (sacchi blu)", encombrants: "Ingombranti", autre: "Altra raccolta" }, lieux: { rue: "Sul marciapiede", soussol: "In cantina (locale rifiuti)", garage: "In garage" } },
  de: { put: "Rausstellen", truck: "Abholung", cal: "Müllabfuhr", cats: { residuel: "Restmüll", organique: "Biomüll", papier: "Papier & Karton", verre: "Glas", valorlux: "Valorlux (blaue Säcke)", encombrants: "Sperrmüll", autre: "Sonstige Abfuhr" }, lieux: { rue: "Auf dem Bürgersteig", soussol: "Im Keller (Müllraum)", garage: "In der Garage" } },
  pt: { put: "Pôr fora", truck: "Recolha", cal: "Recolha do lixo", cats: { residuel: "Lixo indiferenciado", organique: "Resíduos orgânicos", papier: "Papel / cartão", verre: "Vidro", valorlux: "Valorlux (sacos azuis)", encombrants: "Monstros", autre: "Outra recolha" }, lieux: { rue: "No passeio", soussol: "Na cave (local do lixo)", garage: "Na garagem" } },
  en: { put: "Put out", truck: "Collection", cal: "Waste collection", cats: { residuel: "Residual waste", organique: "Organic waste", papier: "Paper / cardboard", verre: "Glass", valorlux: "Valorlux (blue bags)", encombrants: "Bulky waste", autre: "Other collection" }, lieux: { rue: "On the pavement", soussol: "In the basement (bin room)", garage: "In the garage" } },
};
const icsEsc = (s) => String(s || "").replace(/\\/g, "\\\\").replace(/[,;]/g, (c) => "\\" + c).replace(/\r?\n/g, "\\n");
const icsDay = (d, delta) => { const t = new Date(d + "T12:00:00Z"); t.setUTCDate(t.getUTCDate() + delta); return t.toISOString().slice(0, 10).replace(/-/g, ""); };
// Heure à laquelle sortir les poubelles : « après 18 h » → 18:00 ; « avant 6 h » → 05:00 ; défaut veille 18:00, jour même 05:00
function putOutTime(item) {
  const m = String(item.heure || "").match(/(\d{1,2})(?:\s*[h:.]\s*(\d{2}))?/);
  let h = m ? Math.min(23, +m[1]) : item.sortie === "jour" ? 6 : 18;
  if (/avant|vor|antes|before|prima/i.test(item.heure || "") || (!m && item.sortie === "jour")) h = Math.max(0, h - 1);
  return String(h).padStart(2, "0") + (m && m[2] ? m[2] : "00") + "00";
}
async function publicCollectes(env, token, fmt, url, headers) {
  const obj = await env.PHOTOS.get(ARES_PUBLIC + token + ".json");
  if (!obj) return new Response(JSON.stringify({ error: "Lien désactivé" }), { status: 404, headers: { "Content-Type": "application/json", ...headers } });
  const data = await obj.json();
  const cache = { "Cache-Control": "public, max-age=900" };
  if (fmt === "json") return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json", ...headers, ...cache } });
  const T = PUB_I18N[url.searchParams.get("lang")] || PUB_I18N.fr;
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Ares Invest//Collectes//FR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    `X-WR-CALNAME:${icsEsc(T.cal + " — " + data.adresse)}`, "X-WR-TIMEZONE:Europe/Luxembourg", "REFRESH-INTERVAL;VALUE=DURATION:PT12H", "X-PUBLISHED-TTL:PT12H"];
  for (const it of data.items || []) {
    const name = T.cats[it.cat] || it.cat;
    for (const d of it.dates || []) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) continue;
      const day = icsDay(d, it.sortie === "jour" ? 0 : -1);
      const nm = (it.cat === "autre" || !T.cats[it.cat]) && it.names && it.names[d] ? it.names[d] : name;
      const tm = putOutTime(it);
      lines.push("BEGIN:VEVENT", `UID:${token}-${it.cat}-${d}@luxinterventions.com`, `DTSTAMP:${stamp}`,
        `DTSTART:${day}T${tm}`, "DURATION:PT30M", `SUMMARY:${icsEsc("🗑️ " + T.put + " : " + nm)}`,
        `DESCRIPTION:${icsEsc(`${T.truck} : ${d.split("-").reverse().join("/")}${T.lieux[it.lieu] ? "\n" + T.lieux[it.lieu] : ""}${it.note ? "\n" + it.note : ""}`)}`,
        `LOCATION:${icsEsc(data.adresse)}`, "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${icsEsc(T.put + " : " + nm)}`, "TRIGGER:PT0M", "END:VALARM", "END:VEVENT");
    }
  }
  lines.push("END:VCALENDAR");
  // Lignes de 75 octets max (RFC 5545) : on replie les longues lignes
  const folded = lines.map((l) => { let out = "", s = l; while (new TextEncoder().encode(s).length > 73) { let n = 73; while (new TextEncoder().encode(s.slice(0, n)).length > 73) n--; out += s.slice(0, n) + "\r\n "; s = s.slice(n); } return out + s; });
  return new Response(folded.join("\r\n") + "\r\n", { headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `inline; filename="collectes.ics"`, ...headers, ...cache } });
}

const isB64u = (v, max) => typeof v === "string" && v.length > 0 && v.length <= max && /^[A-Za-z0-9_-]+$/.test(v);
async function espaceCode(request, env, headers) {
  const ip = clientIp(request);
  const k = "espc-rl:" + ip;
  const fails = parseInt((await env.HITS.get(k)) || "0", 10);
  if (fails >= 10) return aresJson({ error: "Trop d'essais. Réessayez dans 15 minutes." }, 429, headers);
  let b;
  try { b = await request.json(); } catch { b = {}; }
  const obj = /^[0-9a-f]{64}$/.test(b.h || "") ? await env.PHOTOS.get(ARES_ESPCODE + b.h + ".json") : null;
  const data = obj ? await obj.json() : null;
  if (!data || !(await env.PHOTOS.head(ARES_ESPACE + data.id + ".bin"))) {
    try { await env.HITS.put(k, String(fails + 1), { expirationTtl: 900 }); } catch { /* quota KV */ }
    return aresJson({ error: "Code inconnu" }, 404, headers);
  }
  return aresJson({ id: data.id, salt: data.salt, wk: data.wk }, 200, headers);
}

// ── Espace locataire public : lecture du contenu chiffré, documents partagés, envoi d'un signalement ──
async function espacePublic(request, env, id, sub, headers) {
  const bin = (obj) => new Response(obj.body, { headers: { "Content-Type": "application/octet-stream", "Cache-Control": "no-store", ...headers } });
  const exists = await env.PHOTOS.head(ARES_ESPACE + id + ".bin");
  if (!exists) return aresJson({ error: "Espace désactivé" }, 404, headers);
  if (request.method === "GET" && !sub) return bin(await env.PHOTOS.get(ARES_ESPACE + id + ".bin"));
  if (request.method === "GET" && sub.startsWith("f/")) {
    const obj = await env.PHOTOS.get(ARES_ESPACE + id + "/" + sub);
    return obj ? bin(obj) : aresJson({ error: "Introuvable" }, 404, headers);
  }
  if (sub === "push" && (request.method === "POST" || request.method === "DELETE")) {
    if (!(await espPushInit(env))) return aresJson({ error: "Notifications indisponibles" }, 503, headers);
    let b;
    try { b = await request.json(); } catch { b = null; }
    if (request.method === "DELETE") {
      if (b && b.endpoint) await env.DB.prepare("DELETE FROM esp_push WHERE endpoint = ? AND target = ?").bind(String(b.endpoint).slice(0, 1000), id).run();
      return aresJson({ ok: true }, 200, headers);
    }
    return (await espPushSave(env, id, b)) ? aresJson({ ok: true }, 200, headers) : aresJson({ error: "Abonnement invalide" }, 400, headers);
  }
  // 📍 position d'un chauffeur « en service » (chiffrée pour sa centrale, illisible ici) : seulement la dernière, remplacée à chaque envoi
  if (request.method === "POST" && sub === "signal") {
    // Limites : 30 envois / heure par adresse IP, 200 / jour par espace (l'équipe envoie arrivée, départ, photos, messages…)
    const ip = clientIp(request);
    const kIp = "sig-rl:" + ip, kId = "sig-id:" + id;
    const nIp = parseInt((await env.HITS.get(kIp)) || "0", 10), nId = parseInt((await env.HITS.get(kId)) || "0", 10);
    if (nIp >= 30 || nId >= 200) return aresJson({ error: "Trop d'envois, réessayez plus tard" }, 429, headers);
    const body = await request.arrayBuffer();
    if (body.byteLength < 100 || body.byteLength > 12 * 1024 * 1024) return aresJson({ error: "Taille invalide" }, 413, headers);
    const kB = "sig-b:" + id, nB = parseInt((await env.HITS.get(kB)) || "0", 10); // 60 Mo par jour et par espace (documents, photos)
    if (nB + body.byteLength > 60 * 1024 * 1024) return aresJson({ error: "Trop d'envois aujourd'hui, réessayez demain" }, 429, headers);
    const name = `${Date.now().toString(36)}-${id.slice(0, 12)}-${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`;
    // dans la boîte de la centrale à qui appartient l'espace (principale ou client)
    const own = await espOwner(env, id), OV = aresVault(own && own !== "main" ? own : "");
    await env.PHOTOS.put(OV.INBOX + name, body, { httpMetadata: { contentType: "application/octet-stream" } });
    try {
      await env.HITS.put(kIp, String(nIp + 1), { expirationTtl: 3600 });
      await env.HITS.put(kId, String(nId + 1), { expirationTtl: 86400 });
      await env.HITS.put(kB, String(nB + body.byteLength), { expirationTtl: 86400 });
    } catch { /* quota KV */ }
    // le gestionnaire voit le numéro sur l'icône de son app (le contenu reste chiffré, la notification ne dit rien)
    // qui écrit (l'app l'indique, sans rien dire du contenu) : la notification de la centrale dit « un ouvrier », « un client de l'hôtel »…
    const fromApp = new URL(request.url).searchParams.get("app") || "";
    await espPushSend(env, OV.owner, ["esp", "eq", "hote", "taxi", "ann"].includes(fromApp) ? "in_" + fromApp : "inbox");
    return aresJson({ ok: true }, 200, headers);
  }
  return aresJson({ error: "Not found" }, 404, headers);
}

// ── Mini-chat du logement : lecture (messages chiffrés, les plus récents) et envoi ──
// Le serveur ne voit que des octets illisibles ; il efface les messages de plus de 90 jours.
// ── 🌐 Traduction des messages : { q: [textes], to: "it" } → { t: [{ t: traduction, s: langue d'origine }] } ──
// Rien n'est gardé ni journalisé ici ; limite simple par adresse IP (en mémoire, sans écriture KV)
const TR_LANGS = new Set(["fr", "it", "de", "pt", "en", "es"]);
const trHits = new Map();
async function chatTranslate(request, env, headers) {
  let b;
  try { b = await request.json(); } catch { return aresJson({ error: "JSON" }, 400, headers); }
  const to = String((b && b.to) || "");
  const q = (Array.isArray(b && b.q) ? b.q : []).slice(0, 20).map((x) => String(x || "").slice(0, 1500));
  if (!TR_LANGS.has(to) || !q.length) return aresJson({ error: "Requête invalide" }, 400, headers);
  const ip = clientIp(request), hr = Math.floor(Date.now() / 3600000), k = ip + ":" + hr, n = (trHits.get(k) || 0) + q.length;
  if (trHits.size > 5000) trHits.clear();
  trHits.set(k, n);
  if (n > 600) return aresJson({ error: "Trop de traductions, réessayez plus tard" }, 429, headers);
  try {
    if (env.DEEPL_KEY) {
      const host = String(env.DEEPL_KEY).endsWith(":fx") ? "api-free.deepl.com" : "api.deepl.com";
      const tl = to === "en" ? "EN-GB" : to === "pt" ? "PT-PT" : to.toUpperCase();
      const r = await fetch(`https://${host}/v2/translate`, { method: "POST", headers: { Authorization: "DeepL-Auth-Key " + env.DEEPL_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ text: q, target_lang: tl }) });
      if (!r.ok) throw new Error("deepl " + r.status);
      const j = await r.json();
      return aresJson({ t: (j.translations || []).map((x) => ({ t: x.text || "", s: String(x.detected_source_language || "").slice(0, 2).toLowerCase() })) }, 200, headers);
    }
    // 4 textes à la fois ; un texte refusé (trop de demandes) revient vide et sera redemandé, sans faire échouer les autres
    const one = async (x) => {
      if (!x.trim()) return { t: x, s: to };
      try {
        const r = await fetch("https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=auto&tl=" + to + "&q=" + encodeURIComponent(x));
        if (!r.ok) return { t: "", s: "" };
        const j = await r.json();
        return { t: (j[0] || []).map((seg) => seg[0] || "").join(""), s: String(j[2] || "").slice(0, 2) };
      } catch { return { t: "", s: "" }; }
    };
    const out = [];
    for (let i = 0; i < q.length; i += 4) out.push(...(await Promise.all(q.slice(i, i + 4).map(one))));
    if (!out.some((x) => x.t)) throw new Error("tr");
    return aresJson({ t: out }, 200, headers);
  } catch (e) {
    return aresJson({ error: "Traduction indisponible" }, 502, headers);
  }
}
async function boardList(env, id) {
  const listed = await env.PHOTOS.list({ prefix: ARES_BOARD + id + "/m/" });
  const now = Date.now(), keep = [];
  for (const o of listed.objects) {
    const ts = parseInt(o.key.slice((ARES_BOARD + id + "/m/").length).split("-")[0], 36);
    if (!ts || now - ts > BOARD_TTL_MS) await env.PHOTOS.delete(o.key); else keep.push(o.key);
  }
  keep.sort();
  const last = keep.slice(-BOARD_MAX);
  const items = await Promise.all(last.map(async (k) => {
    const obj = await env.PHOTOS.get(k);
    if (!obj) return null;
    const u = new Uint8Array(await obj.arrayBuffer());
    let bin = "";
    for (let i = 0; i < u.length; i++) bin += String.fromCharCode(u[i]);
    return { n: k.slice((ARES_BOARD + id + "/m/").length), d: btoa(bin) };
  }));
  return items.filter(Boolean);
}
async function boardSave(env, id, request) {
  const body = await request.arrayBuffer();
  if (body.byteLength < 30 || body.byteLength > 8 * 1024) return null;
  const name = Date.now().toString(36) + "-" + crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
  await env.PHOTOS.put(ARES_BOARD + id + "/m/" + name, body, { httpMetadata: { contentType: "application/octet-stream" } });
  return name;
}
async function boardPublic(request, env, id, headers) {
  if (!(await env.PHOTOS.head(ARES_BOARD + id + "/on"))) return aresJson({ error: "Messagerie désactivée" }, 404, headers);
  if (request.method === "GET") return aresJson({ items: await boardList(env, id) }, 200, headers, { "Cache-Control": "no-store" });
  if (request.method === "POST") {
    // Limites : 30 messages / heure par adresse IP, 200 / jour par logement
    const ip = clientIp(request);
    const kIp = "brd-rl:" + ip, kId = "brd-id:" + id;
    const nIp = parseInt((await env.HITS.get(kIp)) || "0", 10), nId = parseInt((await env.HITS.get(kId)) || "0", 10);
    if (nIp >= 30 || nId >= 200) return aresJson({ error: "Trop de messages, réessayez plus tard" }, 429, headers);
    const name = await boardSave(env, id, request);
    if (!name) return aresJson({ error: "Taille invalide" }, 413, headers);
    try {
      await env.HITS.put(kIp, String(nIp + 1), { expirationTtl: 3600 });
      await env.HITS.put(kId, String(nId + 1), { expirationTtl: 86400 });
    } catch { /* quota KV */ }
    // X-Push : « none » (modification, suppression, accusé de lecture) ; « owner » (message privé, seulement au gestionnaire)
    const from = String(request.headers.get("X-Esp") || ""), xp = String(request.headers.get("X-Push") || "");
    // message privé : à la centrale qui gère CE locataire (la nôtre ou celle d'un client du réseau)
    if (xp === "owner") { const ow = /^[0-9a-f]{32}$/.test(from) ? await espOwner(env, from).catch(() => "") : ""; await espPushSend(env, ow && ow !== "main" ? "owner:" + ow : "owner", "pmsg"); }
    else if (xp !== "none") await espPushSend(env, "board:" + id, "msg", /^[0-9a-f]{32}$/.test(from) ? from : "");
    return aresJson({ ok: true, n: name }, 200, headers);
  }
  return aresJson({ error: "Not found" }, 404, headers);
}

function aresJson(obj, status, headers, extra = {}) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { "Content-Type": "application/json", ...headers, ...extra },
  });
}

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function clientIp(request) {
  return request.headers.get("CF-Connecting-IP") || "unknown";
}

async function aresFails(env, ip) {
  return parseInt((await env.HITS.get("ares-rl:" + ip)) || "0", 10);
}

async function aresRecordFail(env, ip) {
  const n = (await aresFails(env, ip)) + 1;
  try { await env.HITS.put("ares-rl:" + ip, String(n), { expirationTtl: ARES_LOCK_SECONDS }); } catch { /* quota KV */ }
}

async function aresMeta(env, V) {
  const obj = await env.PHOTOS.get(V ? V.META : ARES_META);
  return obj ? obj.json() : null;
}

const isHex64 = (v) => typeof v === "string" && /^[0-9a-f]{64}$/.test(v);
const isB64 = (v, max) => typeof v === "string" && v.length > 0 && v.length <= max && /^[A-Za-z0-9+/=]+$/.test(v);

function validKeyMaterial(b) {
  return (
    b &&
    isB64(b.salt, 64) &&
    Number.isInteger(b.iter) && b.iter >= 200000 && b.iter <= 5000000 &&
    isB64(b.wrappedKey, 256) &&
    isHex64(b.authHash)
  );
}

const tenantKey = (tid) => "ares/tenants/" + tid + ".json";
async function tenantGet(env, tid) { const o = await env.PHOTOS.get(tenantKey(tid)); return o ? o.json() : null; }
const tenantPut = (env, reg) => env.PHOTOS.put(tenantKey(reg.id), JSON.stringify(reg), { httpMetadata: { contentType: "application/json" } });
const dayIso = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);
// état de la centrale : toujours ouverte (CENTRAL-OGL appartient au client : plus d'essai, d'abonnement ni d'échéance)
function tenantState() {
  return "ok";
}
const tenantPub = (reg) => ({ id: reg.id, fil: reg.fil, nom: reg.nom, st: reg.st, until: reg.until || "", state: tenantState(reg), hold: reg.hold || "", sous: !!reg.sous });
function aresVault(tid) {
  if (!tid) return { META: ARES_META, DATA: ARES_DATA, FILES: ARES_FILES, SESSION: ARES_SESSION, INBOX: ARES_INBOX, owner: "owner", me: "main" };
  const pre = "ares/t/" + tid + "/";
  return { META: pre + "meta.json", DATA: pre + "data.bin", FILES: pre + "files/", SESSION: pre + "session.json", INBOX: pre + "inbox/", owner: "owner:" + tid, me: tid };
}
// propriétaire d'un espace d'app (locataires, clients, taxis…) : "main" ou l'id du client ; absent = ancien espace de la centrale principale
async function espOwner(env, id) {
  const o = await env.PHOTOS.get("ares/own/" + id);
  if (o) return o.text();
  return (await env.PHOTOS.head(ARES_ESPACE + id + ".bin")) ? "main" : "";
}

async function handleAres(request, env, url, headers) {
  if (!env.PHOTOS || !env.HITS) {
    return aresJson({ error: "Worker non configuré (bindings PHOTOS / HITS)" }, 503, headers);
  }
  let path = url.pathname.slice("/api/ares/".length);
  const method = request.method;
  const ip = clientIp(request);
  // centrale d'un client : /api/ares/t/<id>/… (même API, cassaforte séparée)
  let tid = "", reg = null, ro = false;
  const tm = path.match(/^t\/([a-z0-9]{12,24})\/(.*)$/);
  if (tm) {
    tid = tm[1]; path = tm[2];
    reg = await tenantGet(env, tid);
    if (!reg) return aresJson({ error: "Centrale inconnue" }, 404, headers);
    const stt = tenantState(reg);
    if (stt === "blocked") return aresJson({ error: "blocked", tenant: tenantPub(reg) }, 403, headers);
    ro = stt === "ro";
  }
  const V = aresVault(tid);

  if (path === "meta" && method === "GET") {
    const meta = await aresMeta(env, V);
    if (!meta) return aresJson({ configured: false, ...(reg ? { tenant: tenantPub(reg) } : {}) }, 404, headers);
    const recovery = meta.recovery ? { salt: meta.recovery.salt, iter: meta.recovery.iter } : null;
    return aresJson({ configured: true, salt: meta.salt, iter: meta.iter, recovery, ...(reg ? { tenant: tenantPub(reg) } : {}) }, 200, headers);
  }

  if ((await aresFails(env, ip)) >= ARES_MAX_FAILS) {
    return aresJson({ error: "Trop de tentatives. Réessayez dans 15 minutes." }, 429, headers);
  }

  if (path === "setup" && method === "POST") {
    if (!tid && !env.ARES_SETUP_CODE) {
      return aresJson({ error: "ARES_SETUP_CODE manquant dans le Worker" }, 503, headers);
    }
    let body;
    try { body = await request.json(); } catch { body = null; }
    // client : le code d'invitation donné par la centrale principale (une seule fois, avant sa date limite)
    const okCode = !body ? false : tid ? !!reg.setupHash && Date.now() < (reg.setupExp || 0) && safeEqual(await sha256Hex(String(body.setupCode || "")), reg.setupHash)
      : safeEqual(await sha256Hex(String(body.setupCode || "")), await sha256Hex(env.ARES_SETUP_CODE));
    if (!okCode) {
      await aresRecordFail(env, ip);
      return aresJson({ error: "Code de configuration incorrect" }, 403, headers);
    }
    if (!validKeyMaterial(body)) return aresJson({ error: "Données invalides" }, 400, headers);
    const meta = { v: 1, salt: body.salt, iter: body.iter, wrappedKey: body.wrappedKey, authHash: body.authHash, createdAt: new Date().toISOString() };
    const res = await env.PHOTOS.put(V.META, JSON.stringify(meta), { onlyIf: { etagDoesNotMatch: "*" } });
    if (!res) return aresJson({ error: "Déjà configuré" }, 409, headers);
    if (tid) await tenantPut(env, { ...reg, setupHash: "", setupExp: 0, configuredAt: new Date().toISOString() });
    return aresJson({ ok: true }, 200, headers);
  }

  // ── Tutto il resto richiede il token derivato dalla chiave di accesso ──
  const meta = await aresMeta(env, V);
  if (!meta) return aresJson({ error: "Non configuré" }, 404, headers);
  const auth = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  // "Serrature" possibili: la chiave di accesso (main), la chiave di secours (recovery) o la password personale di un operatore (op)
  const tokenHash = isHex64(token) ? await sha256Hex(token) : "";
  const op = (meta.ops || []).find((o) => safeEqual(tokenHash, o.authHash)) || null;
  const slot = safeEqual(tokenHash, meta.authHash) ? "main"
    : meta.recovery && safeEqual(tokenHash, meta.recovery.authHash) ? "recovery" : op ? "op" : null;
  if (!slot) {
    await aresRecordFail(env, ip);
    return aresJson({ error: "Clé d'accès incorrecte" }, 401, headers);
  }

  if (path === "key" && method === "GET") {
    return aresJson({ wrappedKey: slot === "main" ? meta.wrappedKey : slot === "op" ? op.wrappedKey : meta.recovery.wrappedKey, slot, op: op ? { id: op.id, name: op.name, role: op.role } : null }, 200, headers);
  }

  // ── Sessione esclusiva (un solo dispositivo connesso) ──
  const sid = request.headers.get("X-Ares-Session") || "";
  if (!/^[a-zA-Z0-9-]{16,64}$/.test(sid)) return aresJson({ error: "Session manquante" }, 400, headers);
  const leaseObj = await env.PHOTOS.get(V.SESSION);
  const lease = leaseObj ? await leaseObj.json() : null;
  const now = Date.now();
  const otherActive = lease && lease.sid !== sid && now - lease.lastSeen < ARES_LEASE_MS;
  const device = String(request.headers.get("X-Ares-Device") || "").slice(0, 80);
  const writeLease = () => env.PHOTOS.put(V.SESSION, JSON.stringify({
    sid, device: device || (lease && lease.sid === sid ? lease.device : ""), since: lease && lease.sid === sid ? lease.since : now, lastSeen: now,
  }));

  if (path === "session" && method === "POST") {
    let body;
    try { body = await request.json(); } catch { body = {}; }
    if (otherActive && !body.force) {
      return aresJson({ error: "session-busy", device: lease.device, since: lease.since, lastSeen: lease.lastSeen }, 409, headers);
    }
    await writeLease();
    return aresJson({ ok: true, replaced: otherActive ? lease.device : null }, 200, headers);
  }
  if (path === "session" && method === "DELETE") {
    if (lease && lease.sid === sid) await env.PHOTOS.delete(V.SESSION);
    return aresJson({ ok: true }, 200, headers);
  }
  if (otherActive) {
    return aresJson({ error: "session-taken", device: lease.device }, 409, headers);
  }
  // Rinnova la sessione (al massimo ogni 20 s, per limitare le scritture)
  // un rinnovo mancato (due richieste nello stesso istante sullo stesso file) non è un errore: si rinnova alla prossima
  if (!lease || lease.sid !== sid || now - lease.lastSeen > ARES_RENEW_MS) await writeLease().catch(() => {});

  // ── Centrale d'un client : pas de publicité / biens / annonces du réseau / registre ; scaduto = sola lettura ──
  if (tid) {
    // 🧩 moitié B de la clé de secours du client, chiffrée pour la centrale principale (le serveur ne peut pas la lire)
    // 🏗️ ANGAR : paquets (chiffrés) envoyés par la centrale principale — liste, lecture, « ouvert »
    if (ro && method !== "GET") return aresJson({ error: "readonly", tenant: tenantPub(reg) }, 423, headers);
    // demande d'intervention vers la centrale principale (contenu chiffré pour elle)
    if (path === "tenant" && method === "GET") return aresJson({ tenant: tenantPub(reg) }, 200, headers);
  }
  // clé publique de la centrale principale : les centrales des clients chiffrent pour elle leurs demandes
  // ── Registre des clients (centrale principale) : créer + essai, prolonger, suspendre, nouvel accès, supprimer avec certificat ──
  // ── Demandes des centrales des clients (chiffrées pour la centrale principale) ──

  // Crea o sostituisce la chiave di secours (solo con la chiave di accesso principale)
  if (path === "recovery" && method === "POST") {
    if (slot !== "main") return aresJson({ error: "Clé d'accès principale requise" }, 403, headers);
    let body;
    try { body = await request.json(); } catch { body = null; }
    if (!validKeyMaterial(body)) return aresJson({ error: "Données invalides" }, 400, headers);
    const next = { ...meta, recovery: { salt: body.salt, iter: body.iter, wrappedKey: body.wrappedKey, authHash: body.authHash, createdAt: new Date().toISOString() } };
    await env.PHOTOS.put(V.META, JSON.stringify(next));
    return aresJson({ ok: true }, 200, headers);
  }

  // Operatori della centrale (centralinista, contabile) : seconde enveloppe della chiave dati, aperta dalla loro password ;
  // li gestiscono il direttore (chiave principale) e il centralinista ; il contabile no
  if (path === "ops" || path.startsWith("ops/")) {
    if (slot !== "main" && !(slot === "op" && op.role === "centraliste")) return aresJson({ error: "Réservé au directeur ou au centraliste" }, 403, headers);
    const ops = meta.ops || [];
    if (path === "ops" && method === "GET") return aresJson({ ops: ops.map((o) => ({ id: o.id, login: o.login, name: o.name, role: o.role, createdAt: o.createdAt })) }, 200, headers);
    if (path === "ops" && method === "POST") {
      let b;
      try { b = await request.json(); } catch { b = null; }
      const login = String((b && b.login) || "").toLowerCase();
      if (!b || !/^[a-z0-9._-]{3,30}$/.test(login) || !isB64(b.wrappedKey, 256) || !isHex64(b.authHash) || !["centraliste", "comptable"].includes(b.role)) return aresJson({ error: "Données invalides" }, 400, headers);
      const name = String(b.name || "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 60);
      if (!name) return aresJson({ error: "Nom obligatoire" }, 400, headers);
      const keep = ops.filter((o) => o.login !== login);
      if (keep.length >= 10) return aresJson({ error: "10 opérateurs au maximum" }, 400, headers);
      const id = (ops.find((o) => o.login === login) || {}).id || crypto.randomUUID().replace(/-/g, "").slice(0, 16);
      keep.push({ id, login, name, role: b.role, wrappedKey: b.wrappedKey, authHash: b.authHash, createdAt: new Date().toISOString() });
      await env.PHOTOS.put(V.META, JSON.stringify({ ...meta, ops: keep }));
      return aresJson({ ok: true, id }, 200, headers);
    }
    const m = path.match(/^ops\/([a-f0-9]{16})$/);
    if (m && method === "DELETE") {
      if (op && op.id === m[1]) return aresJson({ error: "Vous ne pouvez pas retirer votre propre accès" }, 400, headers);
      await env.PHOTOS.put(V.META, JSON.stringify({ ...meta, ops: ops.filter((o) => o.id !== m[1]) }));
      return aresJson({ ok: true }, 200, headers);
    }
    return aresJson({ error: "Not found" }, 404, headers);
  }

  if (path === "rekey" && method === "POST") {
    if (slot === "op") return aresJson({ error: "Réservé au responsable" }, 403, headers);
    let body;
    try { body = await request.json(); } catch { body = null; }
    if (!validKeyMaterial(body)) return aresJson({ error: "Données invalides" }, 400, headers);
    const next = { ...meta, salt: body.salt, iter: body.iter, wrappedKey: body.wrappedKey, authHash: body.authHash, rekeyedAt: new Date().toISOString() };
    await env.PHOTOS.put(V.META, JSON.stringify(next));
    return aresJson({ ok: true }, 200, headers);
  }

  if (path === "data" && method === "GET") {
    // If-None-Match: <etag> → 304 senza corpo se nulla è cambiato (sincronizzazione leggera)
    const obj = await env.PHOTOS.get(V.DATA, { onlyIf: request.headers });
    if (!obj) return aresJson({ empty: true }, 404, headers);
    if (!("body" in obj)) return new Response(null, { status: 304, headers: { ETag: obj.httpEtag, ...headers } });
    return new Response(obj.body, {
      headers: { "Content-Type": "application/octet-stream", ETag: obj.httpEtag, ...headers },
    });
  }

  if (path === "data" && method === "PUT") {
    const ifMatch = request.headers.get("If-Match");
    const ifNoneMatch = request.headers.get("If-None-Match");
    if (!ifMatch && ifNoneMatch !== "*") {
      return aresJson({ error: "If-Match requis" }, 428, headers);
    }
    const body = await request.arrayBuffer();
    if (body.byteLength === 0 || body.byteLength > ARES_MAX_DATA) {
      return aresJson({ error: "Taille invalide" }, 413, headers);
    }
    const onlyIf = ifMatch ? { etagMatches: ifMatch.replace(/^W\//, "").replace(/"/g, "") } : { etagDoesNotMatch: "*" };
    const res = await env.PHOTOS.put(V.DATA, body, { onlyIf, httpMetadata: { contentType: "application/octet-stream" } });
    if (!res) return aresJson({ error: "Conflit de version" }, 412, headers);
    return aresJson({ ok: true }, 200, headers, { ETag: res.httpEtag });
  }

  // Page publique « collectes » d'un immeuble pour les locataires : l'app publie ici une copie NON
  // chiffrée contenant seulement l'adresse et les dates de collecte (aucun nom, aucune donnée personnelle).
  // Espace locataire : le gestionnaire publie le contenu chiffré et les documents partagés
  const espMatch = path.match(/^espace\/([0-9a-f]{32})(?:\/f\/([a-z0-9]{1,40}))?$/);
  if (espMatch && (method === "PUT" || method === "DELETE")) {
    // chaque espace appartient à une seule centrale (la principale ou un client)
    const own = await espOwner(env, espMatch[1]);
    if (own && own !== V.me) return aresJson({ error: "Espace d'une autre centrale" }, 403, headers);
    if (!own && method === "PUT" && !espMatch[2]) { await env.PHOTOS.put("ares/own/" + espMatch[1], V.me); if (tid) await env.PHOTOS.put("ares/tidx/" + tid + "/" + espMatch[1], "1"); }
    const key = ARES_ESPACE + espMatch[1] + (espMatch[2] ? "/f/" + espMatch[2] : ".bin");
    if (method === "DELETE") {
      if (!espMatch[2]) {
        const listed = await env.PHOTOS.list({ prefix: ARES_ESPACE + espMatch[1] + "/" });
        await Promise.all(listed.objects.map((o) => env.PHOTOS.delete(o.key)));
      }
      await env.PHOTOS.delete(key);
      if (!espMatch[2]) { await env.PHOTOS.delete("ares/own/" + espMatch[1]); if (tid) await env.PHOTOS.delete("ares/tidx/" + tid + "/" + espMatch[1]); }
      return aresJson({ ok: true }, 200, headers);
    }
    const body = await request.arrayBuffer();
    if (!body.byteLength || body.byteLength > (espMatch[2] ? ARES_MAX_FILE : 8 * 1024 * 1024)) return aresJson({ error: "Taille invalide" }, 413, headers);
    await env.PHOTOS.put(key, body, { httpMetadata: { contentType: "application/octet-stream" } });
    return aresJson({ ok: true }, 200, headers);
  }
  // 📍 positions des chauffeurs de cette centrale (chiffrées) : ?ids=a,b,c
  const codeMatch = path.match(/^espcode\/([0-9a-f]{64})$/);
  if (codeMatch && method === "PUT") {
    let b;
    try { b = await request.json(); } catch { b = null; }
    if (!b || !/^[0-9a-f]{32}$/.test(b.id || "") || !isB64u(b.salt, 40) || !isB64u(b.wk, 200)) return aresJson({ error: "Données invalides" }, 400, headers);
    // un code déjà pris par une autre centrale : refusé (l'app en propose un autre)
    const prev = await env.PHOTOS.get(ARES_ESPCODE + codeMatch[1] + ".json");
    if (prev && ((await prev.json()).own || "main") !== V.me) return aresJson({ error: "code-taken" }, 409, headers);
    const eo = await espOwner(env, b.id);
    if (eo && eo !== V.me) return aresJson({ error: "Espace d'une autre centrale" }, 403, headers);
    if (!eo) { await env.PHOTOS.put("ares/own/" + b.id, V.me); if (tid) await env.PHOTOS.put("ares/tidx/" + tid + "/" + b.id, "1"); }
    await env.PHOTOS.put(ARES_ESPCODE + codeMatch[1] + ".json", JSON.stringify({ id: b.id, salt: b.salt, wk: b.wk, own: V.me }), { httpMetadata: { contentType: "application/json" } });
    if (tid) await env.PHOTOS.put("ares/tidx/" + tid + "/c/" + codeMatch[1], "1");
    return aresJson({ ok: true }, 200, headers);
  }
  if (codeMatch && method === "DELETE") {
    const prev = await env.PHOTOS.get(ARES_ESPCODE + codeMatch[1] + ".json");
    if (prev && ((await prev.json()).own || "main") !== V.me) return aresJson({ error: "Code d'une autre centrale" }, 403, headers);
    await env.PHOTOS.delete(ARES_ESPCODE + codeMatch[1] + ".json");
    if (tid) await env.PHOTOS.delete("ares/tidx/" + tid + "/c/" + codeMatch[1]);
    return aresJson({ ok: true }, 200, headers);
  }
  // Notifications de l'app de gestion (badge sur l'icône) et des apps locataires / équipe
  // 🚗 trajets du jour : la central enregistre qui prévenir (apps des locataires) et la demande de la gérance liée
  if (path === "push" && (method === "POST" || method === "DELETE")) {
    if (!(await espPushInit(env))) return aresJson({ error: "Notifications indisponibles" }, 503, headers);
    let b;
    try { b = await request.json(); } catch { b = null; }
    if (method === "DELETE") {
      if (b && b.endpoint) await env.DB.prepare("DELETE FROM esp_push WHERE endpoint = ? AND target = ?").bind(String(b.endpoint).slice(0, 1000), V.owner).run();
      return aresJson({ ok: true }, 200, headers);
    }
    return (await espPushSave(env, V.owner, b)) ? aresJson({ ok: true }, 200, headers) : aresJson({ error: "Abonnement invalide" }, 400, headers);
  }
  // « 🆕 Nouveau bien » : la liste (texte) puis les photos une à une ; les photos des biens retirés sont effacées
  // Lien court TikTok (vm.tiktok.com/…, tiktok.com/t/…) → lien complet de la vidéo (pour le mini lecteur des annonces)
  const notifMatch = path.match(/^espace\/([0-9a-f]{32})\/notify$/);
  if (notifMatch && method === "POST") {
    if ((await espOwner(env, notifMatch[1])) !== V.me) return aresJson({ error: "Espace d'une autre centrale" }, 403, headers);
    await espPushSend(env, notifMatch[1], "news");
    return aresJson({ ok: true }, 200, headers);
  }
  // Annonces « Don · prêt · location » (gestionnaire) : tout voir, approuver, publier les siennes, retirer
  // Mini-chat d'un logement (gestionnaire) : activer, lire, écrire, modérer, supprimer
  const brdMatch = path.match(/^board\/([0-9a-f]{32})(?:\/([a-z0-9-]{3,40}))?$/);
  if (brdMatch) {
    const base = ARES_BOARD + brdMatch[1];
    if (!brdMatch[2] && method === "PUT") { await env.PHOTOS.put(base + "/on", "1"); return aresJson({ ok: true }, 200, headers); }
    if (!brdMatch[2] && method === "GET") return aresJson({ items: await boardList(env, brdMatch[1]) }, 200, headers);
    if (!brdMatch[2] && method === "POST") {
      // X-Push : « none » (accusé de lecture, rangement), ou l'espace d'un seul habitant (réponse privée)
      const n = await boardSave(env, brdMatch[1], request), xp = String(request.headers.get("X-Push") || "");
      if (n && xp !== "none") await espPushSend(env, /^[0-9a-f]{32}$/.test(xp) ? xp : "board:" + brdMatch[1], "msg");
      return n ? aresJson({ ok: true, n }, 200, headers) : aresJson({ error: "Taille invalide" }, 413, headers); }
    if (!brdMatch[2] && method === "DELETE") {
      const listed = await env.PHOTOS.list({ prefix: base + "/" });
      await Promise.all(listed.objects.map((o) => env.PHOTOS.delete(o.key)));
      return aresJson({ ok: true }, 200, headers);
    }
    if (brdMatch[2] && method === "DELETE") { await env.PHOTOS.delete(base + "/m/" + brdMatch[2]); return aresJson({ ok: true }, 200, headers); }
  }
  // Boîte de réception des signalements (chiffrés) : liste, lecture, suppression après import
  if (path === "inbox" && method === "GET") {
    const listed = await env.PHOTOS.list({ prefix: V.INBOX, limit: 100 });
    return aresJson({ items: listed.objects.map((o) => ({ name: o.key.slice(V.INBOX.length), size: o.size })) }, 200, headers);
  }
  const inboxMatch = path.match(/^inbox\/([a-z0-9-]{10,80})$/);
  if (inboxMatch && method === "GET") {
    const obj = await env.PHOTOS.get(V.INBOX + inboxMatch[1]);
    if (!obj) return aresJson({ error: "Introuvable" }, 404, headers);
    return new Response(obj.body, { headers: { "Content-Type": "application/octet-stream", ...headers } });
  }
  if (inboxMatch && method === "DELETE") {
    await env.PHOTOS.delete(V.INBOX + inboxMatch[1]);
    return aresJson({ ok: true }, 200, headers);
  }

  const pubMatch = path.match(/^public\/([0-9a-f]{32})$/);
  if (pubMatch && method === "PUT") {
    const body = await request.text();
    if (body.length > 200000) return aresJson({ error: "Trop volumineux" }, 413, headers);
    let data;
    try { data = JSON.parse(body); } catch { return aresJson({ error: "Données invalides" }, 400, headers); }
    if (!data || typeof data.adresse !== "string" || !Array.isArray(data.items)) return aresJson({ error: "Données invalides" }, 400, headers);
    await env.PHOTOS.put(ARES_PUBLIC + pubMatch[1] + ".json", JSON.stringify({ ...data, updated: new Date().toISOString() }), { httpMetadata: { contentType: "application/json" } });
    return aresJson({ ok: true }, 200, headers);
  }
  if (pubMatch && method === "DELETE") {
    await env.PHOTOS.delete(ARES_PUBLIC + pubMatch[1] + ".json");
    return aresJson({ ok: true }, 200, headers);
  }

  // Calendrier des collectes de la commune (.ics) : le navigateur ne peut pas le lire directement
  // (sites d'autres domaines) ; le Worker le télécharge pour l'app, uniquement avec la clé d'accès.
  if (path === "ics" && method === "GET") {
    let target;
    try { target = new URL((url.searchParams.get("url") || "").replace(/^webcals?:\/\//i, "https://")); } catch { target = null; }
    if (!target || target.protocol !== "https:" || target.port || target.username || target.password) {
      return aresJson({ error: "Lien invalide (https uniquement)" }, 400, headers);
    }
    let r;
    try {
      r = await fetch(target.toString(), { headers: { Accept: "text/calendar, text/plain, */*", "User-Agent": "AresInvest-Calendrier/1.0" }, redirect: "follow", cf: { cacheTtl: 3600 } });
    } catch {
      return aresJson({ error: "Site de la commune injoignable" }, 502, headers);
    }
    if (!r.ok) return aresJson({ error: `Le site de la commune répond ${r.status}` }, 502, headers);
    const buf = await r.arrayBuffer();
    if (buf.byteLength > 2 * 1024 * 1024) return aresJson({ error: "Fichier trop gros" }, 413, headers);
    const text = new TextDecoder().decode(buf);
    if (!/BEGIN:VCALENDAR/i.test(text)) return aresJson({ error: "Ce lien ne donne pas un calendrier (.ics)" }, 422, headers);
    return new Response(text, { headers: { "Content-Type": "text/calendar; charset=utf-8", ...headers } });
  }

  const fileMatch = path.match(/^files\/([a-zA-Z0-9_-]{1,64})$/);
  if (fileMatch) {
    const key = V.FILES + fileMatch[1];
    if (method === "GET") {
      const obj = await env.PHOTOS.get(key);
      if (!obj) return aresJson({ error: "Introuvable" }, 404, headers);
      return new Response(obj.body, { headers: { "Content-Type": "application/octet-stream", ...headers } });
    }
    if (method === "PUT") {
      const body = await request.arrayBuffer();
      if (body.byteLength === 0 || body.byteLength > ARES_MAX_FILE) {
        return aresJson({ error: "Fichier vide ou trop volumineux" }, 413, headers);
      }
      await env.PHOTOS.put(key, body, { httpMetadata: { contentType: "application/octet-stream" } });
      return aresJson({ ok: true }, 200, headers);
    }
    if (method === "DELETE") {
      await env.PHOTOS.delete(key);
      return aresJson({ ok: true }, 200, headers);
    }
  }

  return aresJson({ error: "Not found" }, 404, headers);
}

// ── LGR · Lux Gestion Résidences ──
// Le Worker ne garde que des octets chiffrés dans le navigateur (AES-256-GCM) : lgr/meta.json (clé de données enveloppée),
// lgr/data.bin (fiches : syndics, résidences, documents), lgr/f/<id> (fichiers). Rien n'est effacé ici : la corbeille est dans l'app.
// Première configuration : secret Cloudflare « LGR_SETUP_CODE » (choisi par le titulaire).
const LGR = { META: "lgr/meta.json", DATA: "lgr/data.bin", FILES: "lgr/f/" };
async function handleLgr(request, env, url, headers) {
  if (!env.PHOTOS || !env.HITS) return aresJson({ error: "Worker non configuré (bindings PHOTOS / HITS)" }, 503, headers);
  const path = url.pathname.slice("/api/lgr/".length), method = request.method, ip = clientIp(request);
  const metaObj = await env.PHOTOS.get(LGR.META);
  const meta = metaObj ? await metaObj.json() : null;
  if (path === "meta" && method === "GET") {
    if (!meta) return aresJson({ lgr: 1, configured: false }, 200, headers);
    return aresJson({ lgr: 1, configured: true, salt: meta.salt, iter: meta.iter, recovery: meta.recovery ? { salt: meta.recovery.salt, iter: meta.recovery.iter } : null }, 200, headers);
  }
  if ((await aresFails(env, ip)) >= ARES_MAX_FAILS) return aresJson({ error: "Trop de tentatives. Réessayez dans 15 minutes." }, 429, headers);
  if (path === "setup" && method === "POST") {
    if (!env.LGR_SETUP_CODE) return aresJson({ error: "LGR_SETUP_CODE manquant dans le Worker" }, 503, headers);
    let b;
    try { b = await request.json(); } catch { b = null; }
    if (!b || !safeEqual(await sha256Hex(String(b.setupCode || "")), await sha256Hex(env.LGR_SETUP_CODE))) {
      await aresRecordFail(env, ip);
      return aresJson({ error: "Code de configuration incorrect" }, 403, headers);
    }
    if (!validKeyMaterial(b) || (b.recovery && !validKeyMaterial(b.recovery))) return aresJson({ error: "Données invalides" }, 400, headers);
    const now = new Date().toISOString();
    const m = { v: 1, salt: b.salt, iter: b.iter, wrappedKey: b.wrappedKey, authHash: b.authHash, createdAt: now };
    if (b.recovery) m.recovery = { salt: b.recovery.salt, iter: b.recovery.iter, wrappedKey: b.recovery.wrappedKey, authHash: b.recovery.authHash, createdAt: now };
    const res = await env.PHOTOS.put(LGR.META, JSON.stringify(m), { onlyIf: { etagDoesNotMatch: "*" } });
    if (!res) return aresJson({ error: "Déjà configuré" }, 409, headers);
    return aresJson({ ok: true }, 200, headers);
  }
  if (!meta) return aresJson({ error: "Non configuré" }, 404, headers);
  const auth = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const th = isHex64(token) ? await sha256Hex(token) : "";
  const slot = safeEqual(th, meta.authHash) ? "main" : meta.recovery && safeEqual(th, meta.recovery.authHash) ? "recovery" : null;
  if (!slot) { await aresRecordFail(env, ip); return aresJson({ error: "Clé d'accès incorrecte" }, 401, headers); }
  if (path === "key" && method === "GET") return aresJson({ slot, wrappedKey: slot === "main" ? meta.wrappedKey : meta.recovery.wrappedKey }, 200, headers);
  // nouvelle clé d'accès (avec l'ancienne ou la clé de secours) ou nouvelle clé de secours (avec la clé d'accès)
  if ((path === "rekey" || path === "recovery") && method === "POST") {
    let b;
    try { b = await request.json(); } catch { b = null; }
    if (!validKeyMaterial(b)) return aresJson({ error: "Données invalides" }, 400, headers);
    const k = { salt: b.salt, iter: b.iter, wrappedKey: b.wrappedKey, authHash: b.authHash };
    if (path === "recovery" && slot !== "main") return aresJson({ error: "Clé d'accès principale requise" }, 403, headers);
    const next = path === "rekey" ? { ...meta, ...k, rekeyedAt: new Date().toISOString() } : { ...meta, recovery: { ...k, createdAt: new Date().toISOString() } };
    await env.PHOTOS.put(LGR.META, JSON.stringify(next));
    return aresJson({ ok: true }, 200, headers);
  }
  if (path === "data" && method === "GET") {
    const obj = await env.PHOTOS.get(LGR.DATA, { onlyIf: request.headers });
    if (!obj) return aresJson({ empty: true }, 404, headers);
    if (!("body" in obj)) return new Response(null, { status: 304, headers: { ETag: obj.httpEtag, ...headers } });
    return new Response(obj.body, { headers: { "Content-Type": "application/octet-stream", ETag: obj.httpEtag, ...headers } });
  }
  if (path === "data" && method === "PUT") {
    const ifMatch = request.headers.get("If-Match"), ifNone = request.headers.get("If-None-Match");
    if (!ifMatch && ifNone !== "*") return aresJson({ error: "If-Match requis" }, 428, headers);
    const body = await request.arrayBuffer();
    if (!body.byteLength || body.byteLength > ARES_MAX_DATA) return aresJson({ error: "Taille invalide" }, 413, headers);
    const onlyIf = ifMatch ? { etagMatches: ifMatch.replace(/^W\//, "").replace(/"/g, "") } : { etagDoesNotMatch: "*" };
    const res = await env.PHOTOS.put(LGR.DATA, body, { onlyIf, httpMetadata: { contentType: "application/octet-stream" } });
    if (!res) return aresJson({ error: "Conflit de version" }, 412, headers);
    return aresJson({ ok: true }, 200, headers, { ETag: res.httpEtag });
  }
  const fm = path.match(/^f\/([a-z0-9]{8,40})$/);
  if (fm && method === "GET") {
    const obj = await env.PHOTOS.get(LGR.FILES + fm[1]);
    if (!obj) return aresJson({ error: "Introuvable" }, 404, headers);
    return new Response(obj.body, { headers: { "Content-Type": "application/octet-stream", ...headers } });
  }
  if (fm && method === "PUT") {
    const body = await request.arrayBuffer();
    if (!body.byteLength || body.byteLength > 30 * 1024 * 1024) return aresJson({ error: "Fichier vide ou trop volumineux (30 Mo max.)" }, 413, headers);
    // un fichier ne se remplace jamais (identifiant aléatoire) : un nouvel envoi du même fichier est simplement « déjà là »
    const res = await env.PHOTOS.put(LGR.FILES + fm[1], body, { onlyIf: { etagDoesNotMatch: "*" }, httpMetadata: { contentType: "application/octet-stream" } });
    return aresJson({ ok: true, existed: !res }, 200, headers);
  }
  return aresJson({ error: "Not found" }, 404, headers);
}

// ── Utilità ──
const te = new TextEncoder();
const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
const concatBytes = (...arrs) => { const out = new Uint8Array(arrs.reduce((a, x) => a + x.length, 0)); let o = 0; for (const x of arrs) { out.set(x, o); o += x.length; } return out; };

class PtlError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

// ── Web Push (RFC 8291 aes128gcm + VAPID RFC 8292) ──
async function vapidKeys(env) {
  const row = await env.DB.prepare("SELECT v FROM kv WHERE k = 'vapid'").first();
  if (row) return JSON.parse(row.v);
  const kp = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const keys = { privateJwk: await crypto.subtle.exportKey("jwk", kp.privateKey), publicKey: b64url(await crypto.subtle.exportKey("raw", kp.publicKey)) };
  await env.DB.prepare("INSERT OR IGNORE INTO kv (k, v) VALUES ('vapid', ?)").bind(JSON.stringify(keys)).run();
  const again = await env.DB.prepare("SELECT v FROM kv WHERE k = 'vapid'").first();
  return JSON.parse(again.v);
}

async function hkdf(salt, ikm, info, len) {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, key, len * 8));
}

async function encryptPush(payload, p256dh, authSecret) {
  const uaPublic = fromB64url(p256dh);
  const auth = fromB64url(authSecret);
  const eph = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey("raw", eph.publicKey));
  const uaKey = await crypto.subtle.importKey("raw", uaPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, eph.privateKey, 256));
  const ikm = await hkdf(auth, shared, concatBytes(te.encode("WebPush: info\0"), uaPublic, asPublic), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, te.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, te.encode("Content-Encoding: nonce\0"), 12);
  const key = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, concatBytes(te.encode(payload), new Uint8Array([2]))));
  const header = new Uint8Array(21);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, 4096);
  header[20] = 65;
  return concatBytes(header, asPublic, ct);
}

async function vapidAuth(env, endpoint) {
  const keys = await vapidKeys(env);
  const aud = new URL(endpoint).origin;
  const enc = (o) => b64url(te.encode(JSON.stringify(o)));
  const unsigned = enc({ typ: "JWT", alg: "ES256" }) + "." + enc({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: "mailto:info@luxinterventions.com" });
  const pk = await crypto.subtle.importKey("jwk", keys.privateJwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, pk, te.encode(unsigned));
  return `vapid t=${unsigned}.${b64url(sig)}, k=${keys.publicKey}`;
}

// Solo i servizi push dei browser (Chrome/Android, Firefox, Safari/iPhone, Edge): il Worker non invia nulla altrove
const PTL_PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /^android\.googleapis\.com$/, /(^|\.)push\.services\.mozilla\.com$/, /(^|\.)push\.apple\.com$/, /(^|\.)notify\.windows\.com$/];
function ptlPushHostOk(endpoint) {
  try {
    const u = new URL(String(endpoint || ""));
    return u.protocol === "https:" && !u.port && PTL_PUSH_HOSTS.some((re) => re.test(u.hostname));
  } catch { return false; }
}

const TICKER_SYMBOLS = "BITSTAMP:BTCUSD,BITSTAMP:ETHUSD,BINANCE:USDTUSD,BINANCE:BNBUSD,BINANCE:SOLUSD,BITSTAMP:XRPUSD,BINANCE:USDCUSD,BINANCE:ADAUSD,BINANCE:AVAXUSD,BINANCE:DOGEUSD,BINANCE:TRXUSD,BINANCE:DOTUSD,BINANCE:LINKUSD,BINANCE:SUIUSD,BINANCE:NEARUSD,BINANCE:LTCUSD,BINANCE:BCHUSD,BINANCE:PEPEUSD,BINANCE:UNIUSD,BINANCE:APTUSD";
const NEWS_FEEDS = { all: "", lux: "/luxembourg", monde: "/monde", sport: "/sports", foot: "/sports/football" };
async function newsGet(url, ctx, headers) {
  const f = Object.prototype.hasOwnProperty.call(NEWS_FEEDS, url.searchParams.get("f")) ? url.searchParams.get("f") : "all";
  const key = new Request("https://news-cache.local/" + f), cache = caches.default;
  const hit = await cache.match(key).catch(() => null);
  if (hit) { const j = await hit.json().catch(() => null); if (j) return aresJson(j, 200, headers, { "Cache-Control": "public, max-age=300" }); }
  let items = [];
  try {
    const r = await fetch("https://partner-feeds.lessentiel.lu/rss/lessentiel-fr" + NEWS_FEEDS[f], { headers: { Accept: "application/rss+xml, application/xml, text/xml" }, cf: { cacheTtl: 900 } });
    const xml = r.ok ? await r.text() : "";
    const dec = (x) => String(x || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]+>/g, "").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").trim();
    const tag = (it, t) => { const m = it.match(new RegExp("<" + t + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + t + ">", "i")); return m ? dec(m[1]) : ""; };
    for (const m of xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)) {
      const it = m[0], link = tag(it, "link"), title = tag(it, "title"), d = Date.parse(tag(it, "pubDate"));
      if (!title || !/^https:\/\/([a-z0-9-]+\.)*lessentiel\.lu\//i.test(link)) continue;
      items.push({ t: title.slice(0, 200), u: link.slice(0, 400), d: Number.isFinite(d) ? new Date(d).toISOString() : "" });
      if (items.length >= 15) break;
    }
  } catch { items = []; }
  const out = { src: "L'essentiel", f, items };
  if (items.length) ctx.waitUntil(cache.put(key, new Response(JSON.stringify(out), { headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=900" } })));
  return aresJson(out, 200, headers, { "Cache-Control": "public, max-age=300" });
}
// 📈 Bourses européennes (dans la barre 📰 News) : DAX, CAC 40, Euro Stoxx 50, AEX, IBEX 35, BEL 20, SMI, euro / dollar
const TICKER_EU = "XETR:DAX,EURONEXT:PX1,TVC:SX5E,EURONEXT:AEX,BME:IBC,EURONEXT:BEL20,SIX:SMI,FX:EURUSD";
function tickerPage(m) {
  const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ticker</title>
<style>html,body{margin:0;padding:0;background:transparent;overflow-x:hidden}</style>
<script type="module" src="https://widgets.tradingview-widget.com/w/en/tv-ticker-tape.js"></script></head>
<body><tv-ticker-tape symbols="${m === "eu" ? TICKER_EU : TICKER_SYMBOLS}"></tv-ticker-tape><script>new ResizeObserver(function(){var h=Math.ceil(document.body.scrollHeight);if(h>10)parent.postMessage({tickerH:h},'*')}).observe(document.body);</script></body></html>`;
  return new Response(page, { headers: {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "public, max-age=3600",
    "Content-Security-Policy": "default-src 'none'; script-src 'sha256-H1G/HBRVuISVA+5/HKLwS5uyBCV0PqrzMXSdlPsxjTQ=' https://widgets.tradingview-widget.com https://*.tradingview.com; style-src 'unsafe-inline' https:; img-src https: data:; font-src https: data:; connect-src https: wss:; frame-src https://*.tradingview.com https://*.tradingview-widget.com; frame-ancestors https://luxinterventions.com https://www.luxinterventions.com http://localhost:8787",
    "Referrer-Policy": "no-referrer",
  } });
}

// ── Notifications des apps locataires / équipe / gestion : seulement « il y a du nouveau » ──
// (le serveur ne lit rien : les données restent chiffrées ; la notification fait monter le numéro sur l'icône)
const ESP_PUSH_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS esp_push (endpoint TEXT PRIMARY KEY, target TEXT NOT NULL, boards TEXT NOT NULL DEFAULT '', app TEXT NOT NULL DEFAULT 'esp', lang TEXT NOT NULL DEFAULT 'fr', p256dh TEXT NOT NULL, auth TEXT NOT NULL, created_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS esp_push_target ON esp_push (target)`,
];
let espPushReady = false;
async function espPushInit(env) {
  if (!env.DB) return false;
  if (!espPushReady) { await env.DB.batch(ESP_PUSH_SCHEMA.map((q) => env.DB.prepare(q))); espPushReady = true; }
  return true;
}
const PUSH_LANGS = ["fr", "it", "de", "pt", "en", "es"];
const PUSH_TXT = {
  inbox: { fr: "Nouveau message à lire", it: "Nuovo messaggio da leggere", de: "Neue Nachricht", pt: "Nova mensagem", en: "New message to read", es: "Nuevo mensaje" },
  msg: { fr: "Nouveau message de la maison", it: "Nuovo messaggio della casa", de: "Neue Nachricht im Haus", pt: "Nova mensagem da casa", en: "New house message", es: "Nuevo mensaje de la casa" },
  ptl: { fr: "🏢 Nouvelle demande d'intervention", it: "🏢 Nuova richiesta di intervento", de: "🏢 Neue Einsatzanfrage", pt: "🏢 Novo pedido de intervenção", en: "🏢 New intervention request", es: "🏢 Nueva solicitud de intervención" },
  pwd: { fr: "🔑 Mot de passe oublié : envoyez un nouveau lien", it: "🔑 Password dimenticata: invia un nuovo link", de: "🔑 Passwort vergessen: neuen Link senden", pt: "🔑 Palavra-passe esquecida: envie um novo link", en: "🔑 Forgotten password: send a new link", es: "🔑 Contraseña olvidada: envíe un nuevo enlace" },
  ptlmsg: { fr: "🏢 Nouveau message d'une gérance", it: "🏢 Nuovo messaggio da un'agenzia", de: "🏢 Neue Nachricht einer Verwaltung", pt: "🏢 Nova mensagem de uma gestora", en: "🏢 New message from an agency", es: "🏢 Nuevo mensaje de una administración" },
  devis: { fr: "📝 Réponse d'une gérance à un devis", it: "📝 Risposta di una gérance a un preventivo", de: "📝 Antwort einer Verwaltung auf ein Angebot", pt: "📝 Resposta de uma gestora a um orçamento", en: "📝 A property manager answered a quote", es: "📝 Respuesta de una administradora a un presupuesto" },
  offer: { fr: "💼 Une gérance est intéressée par un abonnement", it: "💼 Una gérance è interessata a un abbonamento", de: "💼 Eine Verwaltung interessiert sich für ein Abo", pt: "💼 Uma gestora está interessada numa assinatura", en: "💼 A property manager is interested in a plan", es: "💼 Una administradora está interesada en una suscripción" },
  trip: { fr: "🚗 Votre intervenant est en route", it: "🚗 Il tecnico è in arrivo", de: "🚗 Ihr Techniker ist unterwegs", pt: "🚗 O seu técnico está a caminho", en: "🚗 Your technician is on the way", es: "🚗 Su técnico está en camino" },
  in_esp: { fr: "🏠 Un locataire vous a écrit (message, signalement, paiement…)", it: "🏠 Un inquilino vi ha scritto (messaggio, segnalazione, pagamento…)", de: "🏠 Ein Mieter hat geschrieben (Nachricht, Meldung, Zahlung…)", pt: "🏠 Um inquilino escreveu (mensagem, ocorrência, pagamento…)", en: "🏠 A tenant wrote to you (message, report, payment…)", es: "🏠 Un inquilino le ha escrito (mensaje, aviso, pago…)" },
  in_eq: { fr: "👷 Nouvelles de l’équipe (message, arrivée, travail fini…)", it: "👷 Novità dalla squadra (messaggio, arrivo, lavoro finito…)", de: "👷 Neues vom Team (Nachricht, Ankunft, Arbeit fertig…)", pt: "👷 Novidades da equipa (mensagem, chegada, trabalho feito…)", en: "👷 News from the team (message, arrival, job done…)", es: "👷 Novedades del equipo (mensaje, llegada, trabajo hecho…)" },
  in_hote: { fr: "🛎️ Un client de l’hôtel / Airbnb vous a écrit", it: "🛎️ Un ospite dell’hotel / Airbnb vi ha scritto", de: "🛎️ Ein Gast (Hotel / Airbnb) hat geschrieben", pt: "🛎️ Um hóspede (hotel / Airbnb) escreveu", en: "🛎️ A hotel / Airbnb guest wrote to you", es: "🛎️ Un huésped (hotel / Airbnb) le ha escrito" },
  in_taxi: { fr: "🚕 Une société de taxi vous a écrit", it: "🚕 Una ditta taxi vi ha scritto", de: "🚕 Ein Taxiunternehmen hat geschrieben", pt: "🚕 Uma empresa de táxi escreveu", en: "🚕 A taxi company wrote to you", es: "🚕 Una empresa de taxi le ha escrito" },
  in_ann: { fr: "📣 Annonceur : nouvelle annonce à valider ou message", it: "📣 Annunciatore: nuovo annuncio da validare o messaggio", de: "📣 Inserent: neue Anzeige zur Prüfung oder Nachricht", pt: "📣 Anunciante: novo anúncio a validar ou mensagem", en: "📣 Advertiser: new ad to approve or a message", es: "📣 Anunciante: nuevo anuncio por validar o mensaje" },
  job: { fr: "🙋 Nouvelle candidature « Je cherche du travail »", it: "🙋 Nuova candidatura «Cerco lavoro»", de: "🙋 Neue Bewerbung „Ich suche Arbeit“", pt: "🙋 Nova candidatura «Procuro trabalho»", en: "🙋 New “I’m looking for work” application", es: "🙋 Nueva candidatura «Busco trabajo»" },
  pmsg: { fr: "✋ Message privé d’un locataire (seulement pour vous)", it: "✋ Messaggio privato di un inquilino (solo per voi)", de: "✋ Private Nachricht eines Mieters (nur für Sie)", pt: "✋ Mensagem privada de um inquilino (só para si)", en: "✋ Private message from a tenant (only for you)", es: "✋ Mensaje privado de un inquilino (solo para usted)" },
  news_eq: { fr: "👷 Nouveau travail ou message de la centrale", it: "👷 Nuovo lavoro o messaggio dalla centrale", de: "👷 Neue Arbeit oder Nachricht der Zentrale", pt: "👷 Novo trabalho ou mensagem da central", en: "👷 New job or message from the office", es: "👷 Nuevo trabajo o mensaje de la central" },
  news_hote: { fr: "🛎️ Nouveau message ou info sur votre séjour", it: "🛎️ Nuovo messaggio o info sul tuo soggiorno", de: "🛎️ Neue Nachricht oder Info zu Ihrem Aufenthalt", pt: "🛎️ Nova mensagem ou info sobre a sua estadia", en: "🛎️ New message or info about your stay", es: "🛎️ Nuevo mensaje o info sobre su estancia" },
  news_taxi: { fr: "🚕 Nouvelle course ou nouveau message", it: "🚕 Nuova corsa o nuovo messaggio", de: "🚕 Neue Fahrt oder neue Nachricht", pt: "🚕 Nova viagem ou nova mensagem", en: "🚕 New ride or new message", es: "🚕 Nuevo viaje o nuevo mensaje" },
  news_ann: { fr: "📣 Réponse sur votre annonce (acceptée, refusée, à payer) ou message", it: "📣 Risposta sul tuo annuncio (accettato, rifiutato, da pagare) o messaggio", de: "📣 Antwort zu Ihrer Anzeige (angenommen, abgelehnt, zu zahlen) oder Nachricht", pt: "📣 Resposta ao seu anúncio (aceite, recusado, a pagar) ou mensagem", en: "📣 Reply on your ad (accepted, refused, to pay) or a message", es: "📣 Respuesta a su anuncio (aceptado, rechazado, a pagar) o mensaje" },
  news: { fr: "Du nouveau dans votre app", it: "Novità nella tua app", de: "Neues in Ihrer App", pt: "Novidades na sua app", en: "Something new in your app", es: "Novedades en tu app" },
};
async function espPushSave(env, target, b) {
  if (!b || !ptlPushHostOk(b.endpoint) || !isB64u(b.p256dh, 120) || !isB64u(b.auth, 40)) return false;
  const boards = (Array.isArray(b.boards) ? b.boards : []).filter((x) => /^[0-9a-f]{32}$/.test(x)).slice(0, 5).join(",");
  const isOwner = target === "owner" || target.startsWith("owner:");
  const app = isOwner ? "ares" : ["eq", "hote", "taxi", "ann"].includes(b.app) ? b.app : "esp";
  const lang = PUSH_LANGS.includes(b.lang) ? b.lang : "fr";
  if (!isOwner) {
    const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM esp_push WHERE target = ?").bind(target).first();
    if (n && n.n >= 10) await env.DB.prepare("DELETE FROM esp_push WHERE endpoint IN (SELECT endpoint FROM esp_push WHERE target = ? ORDER BY created_at LIMIT 1)").bind(target).run();
  }
  // même téléphone / PC que notre centrale principale (même abonnement) : la centrale d'un client ne la remplace jamais,
  // sinon ses messages (locataires, hôtes, taxis… du client) sonneraient chez nous et les nôtres n'arriveraient plus
  if (target.startsWith("owner:")) {
    const cur = await env.DB.prepare("SELECT target FROM esp_push WHERE endpoint = ?").bind(String(b.endpoint)).first();
    if (cur && cur.target === "owner") return true;
  }
  await env.DB.prepare("INSERT OR REPLACE INTO esp_push (endpoint, target, boards, app, lang, p256dh, auth, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(String(b.endpoint), target, boards, app, lang, b.p256dh, b.auth, Date.now()).run();
  return true;
}

async function espPushSend(env, target, kind, except = "") {
  try {
    if (!(await espPushInit(env))) return;
    const subs = target.startsWith("board:")
      ? await env.DB.prepare("SELECT * FROM esp_push WHERE instr(boards, ?) > 0 AND target != ?").bind(target.slice(6), except || "-").all()
      : await env.DB.prepare("SELECT * FROM esp_push WHERE target = ?").bind(target).all();
    await Promise.all((subs.results || []).map(async (s) => {
      if (!ptlPushHostOk(s.endpoint)) return;
      // chaque app ouvre sa propre page ; « du nouveau » dit de quoi il s'agit selon l'app
      // centrale d'un client du réseau (owner:<id>) : le toucher ouvre SA centrale, pas la nôtre
      const tOw = String(s.target || "").startsWith("owner:") ? String(s.target).slice(6) : "";
      const url = s.app === "ares" && /^[a-z0-9]{6,40}$/.test(tOw) ? "/locataires.html?t=" + tOw : { ares: "/locataires.html", eq: "/equipe.html", hote: "/hote.html", taxi: "/taxi.html", ann: "/annonce.html" }[s.app] || "/espace.html";
      const title = { ares: "LA CENTRAL", eq: "ARES Équipe", hote: "🛎️ Séjour", taxi: "🚕 Courses", ann: "📣 Annonces" }[s.app] || "🏠 Locataires";
      const k2 = kind === "news" && PUSH_TXT["news_" + s.app] ? "news_" + s.app : kind;
      const msg = { title, body: (PUSH_TXT[k2] || PUSH_TXT.news)[s.lang] || (PUSH_TXT[k2] || PUSH_TXT.news).fr, url, tag: k2 };
      try {
        const r = await fetch(s.endpoint, {
          method: "POST",
          headers: { Authorization: await vapidAuth(env, s.endpoint), "Content-Encoding": "aes128gcm", "Content-Type": "application/octet-stream", TTL: "86400", Urgency: "normal" },
          body: await encryptPush(JSON.stringify(msg), s.p256dh, s.auth),
        });
        if (r.status === 404 || r.status === 410) await env.DB.prepare("DELETE FROM esp_push WHERE endpoint = ?").bind(s.endpoint).run();
      } catch { /* un abonnement défectueux ne bloque pas les autres */ }
    }));
  } catch { /* notifications indisponibles : l'envoi principal a réussi quand même */ }
}
