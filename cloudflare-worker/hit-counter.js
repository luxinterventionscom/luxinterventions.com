/**
 * LuxInterventions — Worker Cloudflare (contatore + upload foto rapport d'expert)
 *
 * Account dedicato, slegato dal dominio luxinterventions.com — DNS e posta
 * restano su Gandi, invariati. Questo Worker gestisce due funzioni:
 *
 * 1) Contatore aperture pagina (reale, cumulativo)
 *    GET /api/hits  ->  { "count": 1234 }
 *    Incrementa e legge un numero intero in KV (binding "HITS").
 *
 * 2) Upload foto per le richieste "Rapport d'expert"
 *    PUT  /api/upload/<requestId>/<1|2|3>   -> { "url": "https://.../photos/..." }
 *      Riceve il file immagine grezzo nel body della richiesta, lo salva in
 *      R2 (binding "PHOTOS") sotto una cartella identificata da requestId
 *      (generato dal browser, es. crypto.randomUUID()).
 *    GET  /photos/<requestId>/<1|2|3>.<ext>
 *      Restituisce la foto salvata — link incluso nell'email inviata via
 *      mailto, cliccabile dal personale per vedere le foto reali.
 *
 * Nessun dato personale è coinvolto oltre alle foto stesse, caricate
 * volontariamente dal cliente per la sua richiesta.
 *
 * 4) Portail Gérance / Syndic (portail.html) — database D1 (binding "DB"):
 *    account personali, residenze, richieste d'intervento, foto, notifiche push.
 *
 * 3) Archivio cifrato "Ares Invest — Gestion locataires" (locataires.html)
 *    /api/ares/*  — vedi la sezione ARES più sotto. Il Worker conserva solo
 *    dati già cifrati nel browser (AES-256-GCM): senza la chiave di accesso
 *    sono illeggibili, anche per Cloudflare.
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
    "Access-Control-Allow-Headers": "Content-Type, Authorization, If-Match, If-None-Match, X-Ares-Session, X-Ares-Device, X-Esp, X-Event-Id, X-Invoice",
    "Access-Control-Expose-Headers": "ETag",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "no-store",
    "Vary": "Origin",
  };
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const headers = corsHeaders(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers });
    }

    // ── Barre des cours crypto (TradingView) pour le bas des apps : servie ici, sur un autre domaine que le site,
    // pour que le script de TradingView ne puisse rien lire des apps (données chiffrées, clés) ──
    if (url.pathname === "/ticker" && request.method === "GET") return tickerPage();

    // Statistiques anonymes des annonces (vues / clics) envoyées par les apps : aucun nom, aucune donnée personnelle
    if (url.pathname === "/api/pubstat" && request.method === "POST") return pubStatPost(request, env, headers);

    // ── Archivio cifrato Ares (gestion locataires) ──
    if (url.pathname.startsWith("/api/ares/")) {
      return handleAres(request, env, url, headers);
    }

    // ── Calendrier public des collectes (locataires) : /api/pub/<token>.json | .ics ──
    // ── Espace locataire (public, contenu chiffré de bout en bout) ──
    // Code d'accès saisi dans l'app des locataires (empreinte du code seulement ; essais limités)
    if (url.pathname === "/api/esp-code" && request.method === "POST") return espaceCode(request, env, headers);

    const tl = url.pathname.match(/^\/api\/tools(?:\/([0-9a-f]{16})(?:\/(p[0-2]\.jpg|contact))?)?$/);
    if (tl) return toolsPublic(request, env, tl[1], tl[2], headers);

    // Clé publique des notifications (badge sur l'icône) des apps locataires / équipe / gestion
    if (url.pathname === "/api/esp-push/key" && request.method === "GET") {
      if (!(await espPushInit(env))) return aresJson({ error: "Notifications indisponibles" }, 503, headers);
      return aresJson({ key: (await vapidKeys(env)).publicKey }, 200, headers);
    }

    const esp = url.pathname.match(/^\/api\/esp\/([0-9a-f]{32})(?:\/(f\/[a-z0-9]{1,40}|signal|push|tools(?:\/[0-9a-f]{16})?))?$/);
    if (esp) return espacePublic(request, env, esp[1], esp[2] || "", headers);

    const board = url.pathname.match(/^\/api\/board\/([0-9a-f]{32})$/);
    if (board) return boardPublic(request, env, board[1], headers);

    const pub = url.pathname.match(/^\/api\/pub\/([0-9a-f]{32})\.(json|ics)$/);
    if (pub && request.method === "GET") return publicCollectes(env, pub[1], pub[2], url, headers);

    // ── Portail Gérance / Syndic (vedi la sezione PORTAIL più sotto) ──
    if (url.pathname.startsWith("/api/portail/")) {
      return handlePortail(request, env, url, headers, ctx);
    }

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
  },
};

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
 *   (la chiave di secours apre il coffre come la chiave di accesso e permette
 *    di sceglierne una nuova se è stata dimenticata)
 *   GET    /api/ares/data          database cifrato + ETag             [auth]
 *   PUT    /api/ares/data          If-Match / If-None-Match: *         [auth]
 *   GET|PUT|DELETE /api/ares/files/<id>                               [auth]
 *   POST   /api/ares/session       apre la sessione esclusiva (force: prende la mano) [auth]
 *   DELETE /api/ares/session       chiude la sessione                  [auth]
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
const ARES_PUBS = "ares/pubs-portail.json"; // annonces des partenaires pour le portail gérance (publicité, en clair)
const ARES_BOARD = "ares/board/"; // mini-chat de chaque logement : messages chiffrés avec une clé que seuls les habitants et le gestionnaire ont
const BOARD_TTL_MS = 90 * 24 * 3600 * 1000; // messages effacés après 90 jours
const BOARD_MAX = 150;
// Annonces « Don · prêt · location » publiées par les locataires (approuvées par le gestionnaire)
const TOOLS = "tools/items/";
const TOOL_DAYS = 90;
const TOOL_KINDS = ["don", "pret", "loc"];
const TOOL_UNITS = ["h", "j", "we", "s", "u"];
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
  return aresJson(data, 200, headers);
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
  if (sub === "tools" || sub.startsWith("tools/")) {
    const owner = "e:" + id;
    if (request.method === "GET" && sub === "tools") {
      const mine = (await toolList(env)).filter((it) => it.owner === owner);
      return aresJson({ items: mine.map((it) => ({ ...toolPublic(it), status: it.status, clicks: it.clicks || 0, mail: it.mail })) }, 200, headers, { "Cache-Control": "no-store" });
    }
    if (request.method === "POST" && sub === "tools") {
      const mine = (await toolList(env)).filter((it) => it.owner === owner && it.exp > Date.now());
      if (mine.length >= 10) return aresJson({ error: "10 annonces maximum" }, 429, headers);
      const len = parseInt(request.headers.get("content-length") || "0", 10);
      if (len > 3 * 1024 * 1024) return aresJson({ error: "Photos trop lourdes" }, 413, headers);
      let b;
      try { b = await request.json(); } catch { b = null; }
      const it = await toolCreate(env, b, owner, "pending");
      return it ? aresJson({ ok: true, id: it.id }, 200, headers) : aresJson({ error: "Annonce incomplète" }, 400, headers);
    }
    if (request.method === "DELETE" && sub.startsWith("tools/")) {
      const it = await toolGet(env, sub.slice(6));
      if (!it || it.owner !== owner) return aresJson({ error: "Introuvable" }, 404, headers);
      await toolDel(env, it.id);
      return aresJson({ ok: true }, 200, headers);
    }
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
  if (request.method === "POST" && sub === "signal") {
    // Limites : 30 envois / heure par adresse IP, 80 / jour par espace (l'équipe envoie arrivée, départ, photos…)
    const ip = clientIp(request);
    const kIp = "sig-rl:" + ip, kId = "sig-id:" + id;
    const nIp = parseInt((await env.HITS.get(kIp)) || "0", 10), nId = parseInt((await env.HITS.get(kId)) || "0", 10);
    if (nIp >= 30 || nId >= 80) return aresJson({ error: "Trop d'envois, réessayez plus tard" }, 429, headers);
    const body = await request.arrayBuffer();
    if (body.byteLength < 100 || body.byteLength > 5 * 1024 * 1024) return aresJson({ error: "Taille invalide" }, 413, headers);
    const name = `${Date.now().toString(36)}-${id.slice(0, 12)}-${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`;
    await env.PHOTOS.put(ARES_INBOX + name, body, { httpMetadata: { contentType: "application/octet-stream" } });
    try {
      await env.HITS.put(kIp, String(nIp + 1), { expirationTtl: 3600 });
      await env.HITS.put(kId, String(nId + 1), { expirationTtl: 86400 });
    } catch { /* quota KV */ }
    // le gestionnaire voit le numéro sur l'icône de son app (le contenu reste chiffré, la notification ne dit rien)
    await espPushSend(env, "owner", "inbox");
    return aresJson({ ok: true }, 200, headers);
  }
  return aresJson({ error: "Not found" }, 404, headers);
}

// ── Mini-chat du logement : lecture (messages chiffrés, les plus récents) et envoi ──
// Le serveur ne voit que des octets illisibles ; il efface les messages de plus de 90 jours.
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
    const from = String(request.headers.get("X-Esp") || "");
    await espPushSend(env, "board:" + id, "msg", /^[0-9a-f]{32}$/.test(from) ? from : "");
    return aresJson({ ok: true, n: name }, 200, headers);
  }
  return aresJson({ error: "Not found" }, 404, headers);
}

// ── Annonces : stockage, liste publique, contact (email révélé seulement au clic, essais limités) ──
const toolPublic = (it) => ({ id: it.id, kind: it.kind, title: it.title, desc: it.desc, price: it.price, unit: it.unit, rules: it.rules, lieu: it.lieu, photos: it.photos, created: it.created, exp: it.exp });
async function toolGet(env, id) { const o = await env.PHOTOS.get(TOOLS + id + ".json"); return o ? o.json() : null; }
async function toolPut(env, it) { await env.PHOTOS.put(TOOLS + it.id + ".json", JSON.stringify(it), { httpMetadata: { contentType: "application/json" } }); }
async function toolDel(env, id) {
  const l = await env.PHOTOS.list({ prefix: TOOLS + id });
  await Promise.all(l.objects.map((o) => env.PHOTOS.delete(o.key)));
}
async function toolList(env) {
  const listed = await env.PHOTOS.list({ prefix: TOOLS });
  const items = [];
  for (const o of listed.objects) {
    if (!o.key.endsWith(".json")) continue;
    const obj = await env.PHOTOS.get(o.key);
    if (!obj) continue;
    const it = await obj.json();
    if (it.exp < Date.now() - 30 * 86400000) { await toolDel(env, it.id); continue; } // expirée depuis 30 jours : effacée
    items.push(it);
  }
  return items.sort((a, b) => b.created - a.created);
}
const str = (v, max) => String(v == null ? "" : v).trim().slice(0, max);
async function toolCreate(env, b, owner, status) {
  if (!b || !TOOL_KINDS.includes(b.kind)) return null;
  const title = str(b.title, 80), mail = str(b.mail, 120);
  if (title.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) return null;
  const photos = Array.isArray(b.photos) ? b.photos.filter((x) => typeof x === "string" && x.length < 900000).slice(0, 3) : [];
  if (!photos.length) return null;
  const price = b.kind === "loc" ? Math.max(0, Math.min(100000, Number(b.price) || 0)) : 0;
  const id = [...crypto.getRandomValues(new Uint8Array(8))].map((x) => x.toString(16).padStart(2, "0")).join("");
  for (let i = 0; i < photos.length; i++) {
    const bin = atob(photos[i].replace(/-/g, "+").replace(/_/g, "/"));
    const u = new Uint8Array(bin.length);
    for (let j = 0; j < bin.length; j++) u[j] = bin.charCodeAt(j);
    await env.PHOTOS.put(TOOLS + id + "/p" + i + ".jpg", u, { httpMetadata: { contentType: "image/jpeg" } });
  }
  const it = {
    id, owner, status, kind: b.kind, title, desc: str(b.desc, 800), rules: str(b.rules, 400), lieu: str(b.lieu, 60),
    price, unit: TOOL_UNITS.includes(b.unit) ? b.unit : "j", mail, name: str(b.name, 40), photos: photos.length,
    created: Date.now(), exp: Date.now() + TOOL_DAYS * 86400000, clicks: 0,
  };
  await toolPut(env, it);
  return it;
}
async function toolsPublic(request, env, id, sub, headers) {
  if (!id && request.method === "GET") {
    const items = (await toolList(env)).filter((it) => it.status === "ok" && it.exp > Date.now()).map(toolPublic);
    return aresJson({ items }, 200, headers, { "Cache-Control": "public, max-age=60" });
  }
  if (id && sub && sub.endsWith(".jpg") && request.method === "GET") {
    const obj = await env.PHOTOS.get(TOOLS + id + "/" + sub);
    if (!obj) return aresJson({ error: "Introuvable" }, 404, headers);
    return new Response(obj.body, { headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=86400", ...headers } });
  }
  if (id && sub === "contact" && request.method === "POST") {
    const ip = clientIp(request);
    const k = "tool-rl:" + ip;
    const n = parseInt((await env.HITS.get(k)) || "0", 10);
    if (n >= 20) return aresJson({ error: "Trop de demandes, réessayez plus tard" }, 429, headers);
    const it = await toolGet(env, id);
    if (!it || it.status !== "ok" || it.exp < Date.now()) return aresJson({ error: "Annonce indisponible" }, 404, headers);
    it.clicks = (it.clicks || 0) + 1;
    await toolPut(env, it);
    try { await env.HITS.put(k, String(n + 1), { expirationTtl: 3600 }); } catch { /* quota KV */ }
    return aresJson({ mail: it.mail, name: it.name }, 200, headers);
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

async function aresMeta(env) {
  const obj = await env.PHOTOS.get(ARES_META);
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

async function handleAres(request, env, url, headers) {
  if (!env.PHOTOS || !env.HITS) {
    return aresJson({ error: "Worker non configuré (bindings PHOTOS / HITS)" }, 503, headers);
  }
  const path = url.pathname.slice("/api/ares/".length);
  const method = request.method;
  const ip = clientIp(request);

  if (path === "meta" && method === "GET") {
    const meta = await aresMeta(env);
    if (!meta) return aresJson({ configured: false }, 404, headers);
    const recovery = meta.recovery ? { salt: meta.recovery.salt, iter: meta.recovery.iter } : null;
    return aresJson({ configured: true, salt: meta.salt, iter: meta.iter, recovery }, 200, headers);
  }

  if ((await aresFails(env, ip)) >= ARES_MAX_FAILS) {
    return aresJson({ error: "Trop de tentatives. Réessayez dans 15 minutes." }, 429, headers);
  }

  if (path === "setup" && method === "POST") {
    if (!env.ARES_SETUP_CODE) {
      return aresJson({ error: "ARES_SETUP_CODE manquant dans le Worker" }, 503, headers);
    }
    let body;
    try { body = await request.json(); } catch { body = null; }
    if (!body || !safeEqual(await sha256Hex(String(body.setupCode || "")), await sha256Hex(env.ARES_SETUP_CODE))) {
      await aresRecordFail(env, ip);
      return aresJson({ error: "Code de configuration incorrect" }, 403, headers);
    }
    if (!validKeyMaterial(body)) return aresJson({ error: "Données invalides" }, 400, headers);
    const meta = { v: 1, salt: body.salt, iter: body.iter, wrappedKey: body.wrappedKey, authHash: body.authHash, createdAt: new Date().toISOString() };
    const res = await env.PHOTOS.put(ARES_META, JSON.stringify(meta), { onlyIf: { etagDoesNotMatch: "*" } });
    if (!res) return aresJson({ error: "Déjà configuré" }, 409, headers);
    return aresJson({ ok: true }, 200, headers);
  }

  // ── Tutto il resto richiede il token derivato dalla chiave di accesso ──
  const meta = await aresMeta(env);
  if (!meta) return aresJson({ error: "Non configuré" }, 404, headers);
  const auth = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  // Due "serrature" possibili: la chiave di accesso (main) o la chiave di secours (recovery).
  const tokenHash = isHex64(token) ? await sha256Hex(token) : "";
  const slot = safeEqual(tokenHash, meta.authHash) ? "main"
    : meta.recovery && safeEqual(tokenHash, meta.recovery.authHash) ? "recovery" : null;
  if (!slot) {
    await aresRecordFail(env, ip);
    return aresJson({ error: "Clé d'accès incorrecte" }, 401, headers);
  }

  if (path === "key" && method === "GET") {
    return aresJson({ wrappedKey: slot === "main" ? meta.wrappedKey : meta.recovery.wrappedKey, slot }, 200, headers);
  }

  // ── Sessione esclusiva (un solo dispositivo connesso) ──
  const sid = request.headers.get("X-Ares-Session") || "";
  if (!/^[a-zA-Z0-9-]{16,64}$/.test(sid)) return aresJson({ error: "Session manquante" }, 400, headers);
  const leaseObj = await env.PHOTOS.get(ARES_SESSION);
  const lease = leaseObj ? await leaseObj.json() : null;
  const now = Date.now();
  const otherActive = lease && lease.sid !== sid && now - lease.lastSeen < ARES_LEASE_MS;
  const device = String(request.headers.get("X-Ares-Device") || "").slice(0, 80);
  const writeLease = () => env.PHOTOS.put(ARES_SESSION, JSON.stringify({
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
    if (lease && lease.sid === sid) await env.PHOTOS.delete(ARES_SESSION);
    return aresJson({ ok: true }, 200, headers);
  }
  if (otherActive) {
    return aresJson({ error: "session-taken", device: lease.device }, 409, headers);
  }
  // Rinnova la sessione (al massimo ogni 20 s, per limitare le scritture)
  if (!lease || lease.sid !== sid || now - lease.lastSeen > ARES_RENEW_MS) await writeLease();

  // Crea o sostituisce la chiave di secours (solo con la chiave di accesso principale)
  if (path === "recovery" && method === "POST") {
    if (slot !== "main") return aresJson({ error: "Clé d'accès principale requise" }, 403, headers);
    let body;
    try { body = await request.json(); } catch { body = null; }
    if (!validKeyMaterial(body)) return aresJson({ error: "Données invalides" }, 400, headers);
    const next = { ...meta, recovery: { salt: body.salt, iter: body.iter, wrappedKey: body.wrappedKey, authHash: body.authHash, createdAt: new Date().toISOString() } };
    await env.PHOTOS.put(ARES_META, JSON.stringify(next));
    return aresJson({ ok: true }, 200, headers);
  }

  if (path === "rekey" && method === "POST") {
    let body;
    try { body = await request.json(); } catch { body = null; }
    if (!validKeyMaterial(body)) return aresJson({ error: "Données invalides" }, 400, headers);
    const next = { ...meta, salt: body.salt, iter: body.iter, wrappedKey: body.wrappedKey, authHash: body.authHash, rekeyedAt: new Date().toISOString() };
    await env.PHOTOS.put(ARES_META, JSON.stringify(next));
    return aresJson({ ok: true }, 200, headers);
  }

  if (path === "data" && method === "GET") {
    // If-None-Match: <etag> → 304 senza corpo se nulla è cambiato (sincronizzazione leggera)
    const obj = await env.PHOTOS.get(ARES_DATA, { onlyIf: request.headers });
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
    const res = await env.PHOTOS.put(ARES_DATA, body, { onlyIf, httpMetadata: { contentType: "application/octet-stream" } });
    if (!res) return aresJson({ error: "Conflit de version" }, 412, headers);
    return aresJson({ ok: true }, 200, headers, { ETag: res.httpEtag });
  }

  // Page publique « collectes » d'un immeuble pour les locataires : l'app publie ici une copie NON
  // chiffrée contenant seulement l'adresse et les dates de collecte (aucun nom, aucune donnée personnelle).
  // Espace locataire : le gestionnaire publie le contenu chiffré et les documents partagés
  const espMatch = path.match(/^espace\/([0-9a-f]{32})(?:\/f\/([a-z0-9]{1,40}))?$/);
  if (espMatch && (method === "PUT" || method === "DELETE")) {
    const key = ARES_ESPACE + espMatch[1] + (espMatch[2] ? "/f/" + espMatch[2] : ".bin");
    if (method === "DELETE") {
      if (!espMatch[2]) {
        const listed = await env.PHOTOS.list({ prefix: ARES_ESPACE + espMatch[1] + "/" });
        await Promise.all(listed.objects.map((o) => env.PHOTOS.delete(o.key)));
      }
      await env.PHOTOS.delete(key);
      return aresJson({ ok: true }, 200, headers);
    }
    const body = await request.arrayBuffer();
    if (!body.byteLength || body.byteLength > (espMatch[2] ? ARES_MAX_FILE : 2 * 1024 * 1024)) return aresJson({ error: "Taille invalide" }, 413, headers);
    await env.PHOTOS.put(key, body, { httpMetadata: { contentType: "application/octet-stream" } });
    return aresJson({ ok: true }, 200, headers);
  }
  const codeMatch = path.match(/^espcode\/([0-9a-f]{64})$/);
  if (codeMatch && method === "PUT") {
    let b;
    try { b = await request.json(); } catch { b = null; }
    if (!b || !/^[0-9a-f]{32}$/.test(b.id || "") || !isB64u(b.salt, 40) || !isB64u(b.wk, 200)) return aresJson({ error: "Données invalides" }, 400, headers);
    await env.PHOTOS.put(ARES_ESPCODE + codeMatch[1] + ".json", JSON.stringify({ id: b.id, salt: b.salt, wk: b.wk }), { httpMetadata: { contentType: "application/json" } });
    return aresJson({ ok: true }, 200, headers);
  }
  if (codeMatch && method === "DELETE") {
    await env.PHOTOS.delete(ARES_ESPCODE + codeMatch[1] + ".json");
    return aresJson({ ok: true }, 200, headers);
  }
  // Notifications de l'app de gestion (badge sur l'icône) et des apps locataires / équipe
  if (path === "push" && (method === "POST" || method === "DELETE")) {
    if (!(await espPushInit(env))) return aresJson({ error: "Notifications indisponibles" }, 503, headers);
    let b;
    try { b = await request.json(); } catch { b = null; }
    if (method === "DELETE") {
      if (b && b.endpoint) await env.DB.prepare("DELETE FROM esp_push WHERE endpoint = ? AND target = 'owner'").bind(String(b.endpoint).slice(0, 1000)).run();
      return aresJson({ ok: true }, 200, headers);
    }
    return (await espPushSave(env, "owner", b)) ? aresJson({ ok: true }, 200, headers) : aresJson({ error: "Abonnement invalide" }, 400, headers);
  }
  if (path === "pubs" && method === "PUT") {
    let b;
    try { b = await request.json(); } catch { b = null; }
    const s = (v, n) => String(v || "").slice(0, n);
    const url = (v) => (/^https?:\/\//.test(String(v || "")) ? s(v, 500) : "");
    const items = (b && Array.isArray(b.items) ? b.items : []).slice(0, 50).map((a) => ({
      id: s(a.id, 40), slot: ["haut", "milieu", "bas"].includes(a.slot) ? a.slot : "milieu", cat: s(a.cat, 20), nom: s(a.nom, 120), adresse: s(a.adresse, 200), texte: s(a.texte, 1000),
      tel: s(a.tel, 40), web: url(a.web), video: url(a.video), fin: /^\d{4}-\d{2}-\d{2}$/.test(a.fin || "") ? a.fin : "",
    })).filter((a) => a.nom);
    await env.PHOTOS.put(ARES_PUBS, JSON.stringify({ items, at: Date.now() }), { httpMetadata: { contentType: "application/json" } });
    return aresJson({ ok: true, n: items.length }, 200, headers);
  }
  // Lien court TikTok (vm.tiktok.com/…, tiktok.com/t/…) → lien complet de la vidéo (pour le mini lecteur des annonces)
  if (path === "video-link" && method === "GET") {
    let u;
    try { u = new URL(url.searchParams.get("u") || ""); } catch { return aresJson({ error: "bad url" }, 400, headers); }
    const short = u.protocol === "https:" && (/^(vm|vt)\.tiktok\.com$/.test(u.hostname) || (/^(www\.)?tiktok\.com$/.test(u.hostname) && /^\/t\/[\w-]{4,30}\/?$/.test(u.pathname)));
    if (!short) return aresJson({ error: "not a short link" }, 400, headers);
    let next = u.href;
    for (let i = 0; i < 4; i++) {
      const r = await fetch(next, { method: "GET", redirect: "manual", headers: { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148" } });
      const loc = r.headers.get("Location");
      if (!loc) break;
      next = new URL(loc, next).href;
      const m = next.match(/^https:\/\/(?:www\.|m\.)?tiktok\.com\/(@[\w.-]{1,40})\/video\/(\d{8,25})/);
      if (m) return aresJson({ url: `https://www.tiktok.com/${m[1]}/video/${m[2]}` }, 200, headers);
      if (!/^https:\/\/([\w-]+\.)?tiktok\.com\//.test(next)) break;
    }
    return aresJson({ error: "not found" }, 404, headers);
  }
  if (path === "pubstats" && method === "GET") {
    if (!(await pubStatInit(env))) return aresJson({ rows: [] }, 200, headers);
    const days = Math.min(400, Math.max(1, parseInt(url.searchParams.get("days") || "90", 10) || 90));
    const from = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
    await env.DB.prepare("DELETE FROM pub_stats WHERE day < ?").bind(new Date(Date.now() - 400 * 86400000).toISOString().slice(0, 10)).run();
    const r = await env.DB.prepare("SELECT day, ad, app, lang, ev, n FROM pub_stats WHERE day >= ?").bind(from).all();
    return aresJson({ rows: r.results || [] }, 200, headers);
  }
  const notifMatch = path.match(/^espace\/([0-9a-f]{32})\/notify$/);
  if (notifMatch && method === "POST") {
    await espPushSend(env, notifMatch[1], "news");
    return aresJson({ ok: true }, 200, headers);
  }
  // Annonces « Don · prêt · location » (gestionnaire) : tout voir, approuver, publier les siennes, retirer
  if (path === "tools" && method === "GET") return aresJson({ items: await toolList(env) }, 200, headers);
  if (path === "tools" && method === "POST") {
    let b;
    try { b = await request.json(); } catch { b = null; }
    const it = await toolCreate(env, b, "mgr", "ok");
    return it ? aresJson({ ok: true, id: it.id }, 200, headers) : aresJson({ error: "Annonce incomplète" }, 400, headers);
  }
  const toolMatch = path.match(/^tools\/([0-9a-f]{16})$/);
  if (toolMatch && method === "PUT") {
    const it = await toolGet(env, toolMatch[1]);
    if (!it) return aresJson({ error: "Introuvable" }, 404, headers);
    let b;
    try { b = await request.json(); } catch { b = {}; }
    if (b.status === "ok") it.status = "ok";
    if (b.renew) it.exp = Date.now() + TOOL_DAYS * 86400000;
    await toolPut(env, it);
    return aresJson({ ok: true }, 200, headers);
  }
  if (toolMatch && method === "DELETE") { await toolDel(env, toolMatch[1]); return aresJson({ ok: true }, 200, headers); }
  // Mini-chat d'un logement (gestionnaire) : activer, lire, écrire, modérer, supprimer
  const brdMatch = path.match(/^board\/([0-9a-f]{32})(?:\/([a-z0-9-]{3,40}))?$/);
  if (brdMatch) {
    const base = ARES_BOARD + brdMatch[1];
    if (!brdMatch[2] && method === "PUT") { await env.PHOTOS.put(base + "/on", "1"); return aresJson({ ok: true }, 200, headers); }
    if (!brdMatch[2] && method === "GET") return aresJson({ items: await boardList(env, brdMatch[1]) }, 200, headers);
    if (!brdMatch[2] && method === "POST") { const n = await boardSave(env, brdMatch[1], request); if (n) await espPushSend(env, "board:" + brdMatch[1], "msg"); return n ? aresJson({ ok: true, n }, 200, headers) : aresJson({ error: "Taille invalide" }, 413, headers); }
    if (!brdMatch[2] && method === "DELETE") {
      const listed = await env.PHOTOS.list({ prefix: base + "/" });
      await Promise.all(listed.objects.map((o) => env.PHOTOS.delete(o.key)));
      return aresJson({ ok: true }, 200, headers);
    }
    if (brdMatch[2] && method === "DELETE") { await env.PHOTOS.delete(base + "/m/" + brdMatch[2]); return aresJson({ ok: true }, 200, headers); }
  }
  // Boîte de réception des signalements (chiffrés) : liste, lecture, suppression après import
  if (path === "inbox" && method === "GET") {
    const listed = await env.PHOTOS.list({ prefix: ARES_INBOX, limit: 100 });
    return aresJson({ items: listed.objects.map((o) => ({ name: o.key.slice(ARES_INBOX.length), size: o.size })) }, 200, headers);
  }
  const inboxMatch = path.match(/^inbox\/([a-z0-9-]{10,80})$/);
  if (inboxMatch && method === "GET") {
    const obj = await env.PHOTOS.get(ARES_INBOX + inboxMatch[1]);
    if (!obj) return aresJson({ error: "Introuvable" }, 404, headers);
    return new Response(obj.body, { headers: { "Content-Type": "application/octet-stream", ...headers } });
  }
  if (inboxMatch && method === "DELETE") {
    await env.PHOTOS.delete(ARES_INBOX + inboxMatch[1]);
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
    const key = ARES_FILES + fileMatch[1];
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

/* ════════════════════════════════════════════════════════════════════════
 * PORTAIL GÉRANCE / SYNDIC — portail.html
 *
 * Più utenti, più gérance: ognuno vede solo i dati della propria gérance,
 * lo staff LuxInterventions (ruolo "admin") vede tutto.
 *
 * Binding: D1 "DB" (database luxinterventions-geranceportail), R2 "PHOTOS"
 *          (foto in portail/photos/…), KV "HITS" (limite tentativi).
 * Secret:  PORTAIL_SETUP_CODE — serve solo per creare il primo amministratore.
 *
 * Password: il browser calcola PBKDF2 (sale personale) e invia solo il
 * risultato; il Worker ne conserva l'hash SHA-256 (nessuna password in chiaro,
 * calcolo leggero per il Worker).
 * Sessioni: token casuale (header Authorization: Bearer), hash in D1, 30 giorni.
 * Notifiche: Web Push (VAPID, chiavi generate e salvate in D1 al primo uso).
 * ════════════════════════════════════════════════════════════════════════ */

const PTL_ITER = 310000;
const PTL_SESSION_MS = 30 * 24 * 3600 * 1000;
const PTL_INVITE_MS = 14 * 24 * 3600 * 1000;
const PTL_MAX_PHOTO = 6 * 1024 * 1024;
const PTL_MAX_FAILS = 10;
const PTL_STATUSES = ["recue", "prise", "planifiee", "encours", "terminee", "annulee"];
const PTL_OPEN = ["recue", "prise", "planifiee", "encours"];
const PTL_URGENCES = ["urgent", "24h", "planifie"];
const PTL_ROLES = ["admin", "gerance_admin", "gerance_user"];

const PTL_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS orgs (id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT, email TEXT, created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, org_id TEXT, role TEXT NOT NULL, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, phone TEXT,
     salt TEXT, iter INTEGER, auth_hash TEXT, invite_hash TEXT, invite_expires INTEGER, active INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL, last_login INTEGER)`,
  `CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires INTEGER NOT NULL, created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS residences (id TEXT PRIMARY KEY, org_id TEXT NOT NULL, name TEXT NOT NULL, address TEXT, access TEXT, keys_info TEXT,
     contact_name TEXT, contact_phone TEXT, notes TEXT, apartments INTEGER, active INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS tickets (id TEXT PRIMARY KEY, ref INTEGER NOT NULL, org_id TEXT NOT NULL, residence_id TEXT NOT NULL, lieu TEXT, categorie TEXT,
     urgence TEXT NOT NULL, description TEXT NOT NULL, contact_name TEXT, contact_phone TEXT, acces TEXT, dispo TEXT, status TEXT NOT NULL,
     planned_at TEXT, technicien TEXT, rapport TEXT, created_by TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
     taken_at INTEGER, done_at INTEGER)`,
  `CREATE INDEX IF NOT EXISTS idx_tickets_org ON tickets(org_id, updated_at)`,
  `CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status)`,
  `CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, ticket_id TEXT NOT NULL, user_id TEXT, kind TEXT NOT NULL, status TEXT, text TEXT, created_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_events_ticket ON events(ticket_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS photos (id TEXT PRIMARY KEY, ticket_id TEXT NOT NULL, event_id TEXT, r2_key TEXT NOT NULL, mime TEXT, size INTEGER, created_by TEXT, created_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_photos_ticket ON photos(ticket_id)`,
  `CREATE TABLE IF NOT EXISTS push_subs (endpoint TEXT PRIMARY KEY, user_id TEXT NOT NULL, p256dh TEXT NOT NULL, auth TEXT NOT NULL, created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL)`,
];
// Colonnes ajoutées après coup (résidences : codes à 6 chiffres, intérieur, étages) — ignorées si déjà là
const PTL_ALTER = ["ALTER TABLE residences ADD COLUMN alarm TEXT", "ALTER TABLE residences ADD COLUMN code_other TEXT", "ALTER TABLE residences ADD COLUMN interior TEXT", "ALTER TABLE residences ADD COLUMN floors TEXT", "ALTER TABLE users ADD COLUMN forgot_at INTEGER", "ALTER TABLE tickets ADD COLUMN inv_no TEXT", "ALTER TABLE tickets ADD COLUMN inv_date INTEGER", "ALTER TABLE tickets ADD COLUMN inv_ht REAL", "ALTER TABLE tickets ADD COLUMN inv_tva REAL", "ALTER TABLE tickets ADD COLUMN inv_ttc REAL", "ALTER TABLE tickets ADD COLUMN inv_key TEXT", "ALTER TABLE tickets ADD COLUMN inv_paid INTEGER"];
let ptlSchemaReady = false;

// ── Utilità ──
const te = new TextEncoder();
const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
const randHex = (n) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, "0")).join("");
const ptlId = () => Date.now().toString(36) + randHex(6);
const clean = (v, max = 2000) => (v == null ? "" : String(v).trim().slice(0, max));
const concatBytes = (...arrs) => { const out = new Uint8Array(arrs.reduce((a, x) => a + x.length, 0)); let o = 0; for (const x of arrs) { out.set(x, o); o += x.length; } return out; };

class PtlError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const fail = (status, message) => { throw new PtlError(status, message); };

async function ptlFailures(env, key) { return parseInt((await env.HITS.get("ptl-rl:" + key)) || "0", 10); }
async function ptlRecordFailure(env, key) {
  try { await env.HITS.put("ptl-rl:" + key, String((await ptlFailures(env, key)) + 1), { expirationTtl: 900 }); } catch { /* quota KV */ }
}

// Sale fittizio e stabile per le email sconosciute (non rivela quali account esistono)
async function fakeSalt(env, email) {
  const k = await crypto.subtle.importKey("raw", te.encode(env.PORTAIL_SETUP_CODE || "ptl"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", k, te.encode("salt:" + email)));
  return btoa(String.fromCharCode(...sig.slice(0, 16)));
}

// ── Accesso ai dati secondo il ruolo ──
const isAdmin = (u) => u.role === "admin";
function orgScope(u, requestedOrg) {
  if (isAdmin(u)) return requestedOrg || null; // null = tutte le gérance
  return u.org_id;
}
async function loadTicketFor(env, u, id) {
  const t = await env.DB.prepare("SELECT * FROM tickets WHERE id = ?").bind(id).first();
  if (!t || (!isAdmin(u) && t.org_id !== u.org_id)) fail(404, "Demande introuvable");
  return t;
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

// Invia una notifica agli utenti scelti (where: clausola SQL su users "u")
async function ptlNotify(env, where, binds, message, urgent) {
  const subs = await env.DB.prepare(
    `SELECT s.endpoint, s.p256dh, s.auth FROM push_subs s JOIN users u ON u.id = s.user_id WHERE u.active = 1 AND (${where})`
  ).bind(...binds).all();
  const payload = JSON.stringify(message);
  await Promise.all((subs.results || []).map(async (s) => {
    if (!ptlPushHostOk(s.endpoint)) return;
    try {
      const body = await encryptPush(payload, s.p256dh, s.auth);
      const r = await fetch(s.endpoint, {
        method: "POST",
        headers: { Authorization: await vapidAuth(env, s.endpoint), "Content-Encoding": "aes128gcm", "Content-Type": "application/octet-stream", TTL: "86400", Urgency: urgent ? "high" : "normal" },
        body,
      });
      if (r.status === 404 || r.status === 410) await env.DB.prepare("DELETE FROM push_subs WHERE endpoint = ?").bind(s.endpoint).run();
    } catch { /* un abbonamento difettoso non blocca gli altri */ }
  }));
}

// ── Statistiques des annonces : compteurs par jour, annonce, app, langue et type (vue, carte, appel, site, vidéo) ──
const PUBSTAT_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS pub_stats (day TEXT NOT NULL, ad TEXT NOT NULL, app TEXT NOT NULL, lang TEXT NOT NULL, ev TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (day, ad, app, lang, ev))`,
  `CREATE TABLE IF NOT EXISTS pub_rl (k TEXT PRIMARY KEY, n INTEGER NOT NULL DEFAULT 0)`,
];
let pubStatReady = false;
async function pubStatInit(env) {
  if (!env.DB) return false;
  if (!pubStatReady) { await env.DB.batch(PUBSTAT_SCHEMA.map((q) => env.DB.prepare(q))); pubStatReady = true; }
  return true;
}
const PUBSTAT_EV = ["v", "map", "call", "web", "video"];
async function pubStatPost(request, env, headers) {
  try {
    if (!(await pubStatInit(env))) return new Response(null, { status: 204, headers });
    const len = parseInt(request.headers.get("content-length") || "0", 10);
    if (len > 4000) return new Response(null, { status: 413, headers });
    let b;
    try { b = JSON.parse(await request.text()); } catch { b = null; }
    const app = ["loc", "eq", "ptl"].includes(b && b.app) ? b.app : "";
    const lang = ["fr", "it", "de", "pt", "en", "es"].includes(b && b.lang) ? b.lang : "fr";
    const items = (b && Array.isArray(b.items) ? b.items : []).filter((x) => x && /^[a-z0-9]{6,40}$/i.test(x.id || "") && PUBSTAT_EV.includes(x.ev)).slice(0, 10);
    if (!app || !items.length) return new Response(null, { status: 204, headers });
    // limite anti-abus : 300 compteurs par heure et par adresse IP
    const hour = new Date().toISOString().slice(0, 13);
    const rlKey = hour + ":" + (await sha256Hex("pubrl:" + clientIp(request))).slice(0, 24);
    const rl = await env.DB.prepare("INSERT INTO pub_rl (k, n) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET n = n + excluded.n RETURNING n").bind(rlKey, items.length).first();
    if (rl && rl.n > 300) return new Response(null, { status: 429, headers });
    const day = new Date().toISOString().slice(0, 10);
    await env.DB.batch(items.map((x) => env.DB.prepare("INSERT INTO pub_stats (day, ad, app, lang, ev, n) VALUES (?, ?, ?, ?, ?, 1) ON CONFLICT(day, ad, app, lang, ev) DO UPDATE SET n = n + 1").bind(day, x.id, app, lang, x.ev)));
    if (Math.random() < 0.02) await env.DB.prepare("DELETE FROM pub_rl WHERE k < ?").bind(hour).run().catch(() => {}); // heures passées
    return new Response(null, { status: 204, headers });
  } catch { return new Response(null, { status: 204, headers }); }
}

const TICKER_SYMBOLS = "BITSTAMP:BTCUSD,BITSTAMP:ETHUSD,BINANCE:USDTUSD,BINANCE:BNBUSD,BINANCE:SOLUSD,BITSTAMP:XRPUSD,BINANCE:USDCUSD,BINANCE:ADAUSD,BINANCE:AVAXUSD,BINANCE:DOGEUSD,BINANCE:TRXUSD,BINANCE:DOTUSD,BINANCE:LINKUSD,BINANCE:SUIUSD,BINANCE:NEARUSD,BINANCE:LTCUSD,BINANCE:BCHUSD,BINANCE:PEPEUSD,BINANCE:UNIUSD,BINANCE:APTUSD";
function tickerPage() {
  const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ticker</title>
<style>html,body{margin:0;padding:0;background:transparent;overflow-x:hidden}</style>
<script type="module" src="https://widgets.tradingview-widget.com/w/en/tv-ticker-tape.js"></script></head>
<body><tv-ticker-tape symbols="${TICKER_SYMBOLS}"></tv-ticker-tape><script>new ResizeObserver(function(){var h=Math.ceil(document.body.scrollHeight);if(h>10)parent.postMessage({tickerH:h},'*')}).observe(document.body);</script></body></html>`;
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
  news: { fr: "Du nouveau dans votre app", it: "Novità nella tua app", de: "Neues in Ihrer App", pt: "Novidades na sua app", en: "Something new in your app", es: "Novedades en tu app" },
};
async function espPushSave(env, target, b) {
  if (!b || !ptlPushHostOk(b.endpoint) || !isB64u(b.p256dh, 120) || !isB64u(b.auth, 40)) return false;
  const boards = (Array.isArray(b.boards) ? b.boards : []).filter((x) => /^[0-9a-f]{32}$/.test(x)).slice(0, 5).join(",");
  const app = target === "owner" ? "ares" : b.app === "eq" ? "eq" : "esp";
  const lang = PUSH_LANGS.includes(b.lang) ? b.lang : "fr";
  if (target !== "owner") {
    const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM esp_push WHERE target = ?").bind(target).first();
    if (n && n.n >= 10) await env.DB.prepare("DELETE FROM esp_push WHERE endpoint IN (SELECT endpoint FROM esp_push WHERE target = ? ORDER BY created_at LIMIT 1)").bind(target).run();
  }
  await env.DB.prepare("INSERT OR REPLACE INTO esp_push (endpoint, target, boards, app, lang, p256dh, auth, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(String(b.endpoint), target, boards, app, lang, b.p256dh, b.auth, Date.now()).run();
  return true;
}
// target : "owner", un identifiant d'espace, ou "board:<id>" (habitants inscrits à ce fil, sauf l'expéditeur)
async function espPushSend(env, target, kind, except = "") {
  try {
    if (!(await espPushInit(env))) return;
    const subs = target.startsWith("board:")
      ? await env.DB.prepare("SELECT * FROM esp_push WHERE instr(boards, ?) > 0 AND target != ?").bind(target.slice(6), except || "-").all()
      : await env.DB.prepare("SELECT * FROM esp_push WHERE target = ?").bind(target).all();
    await Promise.all((subs.results || []).map(async (s) => {
      if (!ptlPushHostOk(s.endpoint)) return;
      const url = s.app === "ares" ? "/locataires.html" : s.app === "eq" ? "/equipe.html" : "/espace.html";
      const msg = { title: s.app === "ares" ? "LuxInterventions" : "NOBIS s.a.r.l.", body: (PUSH_TXT[kind] || PUSH_TXT.news)[s.lang] || PUSH_TXT.news.fr, url, tag: kind };
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

const URG_LABEL = { urgent: "🔴 URGENT", "24h": "🟠 Sous 24 h", planifie: "🟢 Planifié" };
const STATUS_LABEL = { recue: "Reçue", prise: "Prise en charge", planifiee: "Planifiée", encours: "En cours", terminee: "Terminée", annulee: "Annulée" };

// ── Router ──
async function handlePortail(request, env, url, headers, ctx) {
  const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", ...headers } });
  try {
    if (!env.DB) fail(503, "Base de données non reliée (binding DB manquant)");
    if (!ptlSchemaReady) {
      await env.DB.batch(PTL_SCHEMA.map((q) => env.DB.prepare(q)));
      for (const q of PTL_ALTER) { try { await env.DB.prepare(q).run(); } catch { /* colonne déjà présente */ } }
      ptlSchemaReady = true;
    }
    const path = url.pathname.slice("/api/portail/".length).replace(/\/$/, "");
    const method = request.method;
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const body = async () => { try { return await request.json(); } catch { return {}; } };
    const now = Date.now();

    // ── Rotte pubbliche ──
    if (path === "status" && method === "GET") {
      const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM users").first();
      return json({ configured: n.n > 0, iter: PTL_ITER });
    }

    // Limite des tentatives : seulement sur les routes sans session (connexion, invitation, configuration),
    // pour ne pas bloquer les collègues déjà connectés derrière la même adresse IP.
    const guard = async () => { if ((await ptlFailures(env, ip)) >= PTL_MAX_FAILS) fail(429, "Trop de tentatives. Réessayez dans 15 minutes."); };

    if (path === "setup" && method === "POST") {
      await guard();
      const b = await body();
      if (!env.PORTAIL_SETUP_CODE) fail(503, "PORTAIL_SETUP_CODE manquant dans le Worker");
      if (!safeEqual(await sha256Hex(clean(b.setupCode)), await sha256Hex(env.PORTAIL_SETUP_CODE))) { await ptlRecordFailure(env, ip); fail(403, "Code de configuration incorrect"); }
      const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM users").first();
      if (n.n > 0) fail(409, "Déjà configuré");
      const email = clean(b.email, 200).toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !clean(b.name) || !/^[0-9a-f]{64}$/.test(b.authHash || "") || !b.salt) fail(400, "Données invalides");
      await env.DB.prepare("INSERT INTO users (id, org_id, role, name, email, salt, iter, auth_hash, created_at) VALUES (?, NULL, 'admin', ?, ?, ?, ?, ?, ?)")
        .bind(ptlId(), clean(b.name, 120), email, clean(b.salt, 64), PTL_ITER, b.authHash, now).run();
      return json({ ok: true });
    }

    if (path === "prelogin" && method === "POST") {
      const email = clean((await body()).email, 200).toLowerCase();
      const u = await env.DB.prepare("SELECT salt, iter FROM users WHERE email = ? AND auth_hash IS NOT NULL").bind(email).first();
      return json(u ? { salt: u.salt, iter: u.iter } : { salt: await fakeSalt(env, email), iter: PTL_ITER });
    }

    // Mot de passe oublié : la demande arrive à LuxInterventions (et au responsable de la gérance), qui envoie un nouveau lien.
    // Réponse toujours identique : on ne révèle pas quels emails ont un compte.
    if (path === "forgot" && method === "POST") {
      await guard();
      const email = clean((await body()).email, 200).toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail(400, "Email invalide");
      const kIp = "forgot-ip:" + ip, kMail = "forgot:" + email;
      if ((await ptlFailures(env, kIp)) >= 10 || (await ptlFailures(env, kMail)) >= 3) return json({ ok: true });
      await ptlRecordFailure(env, kIp); await ptlRecordFailure(env, kMail);
      const u = await env.DB.prepare("SELECT id, name, org_id FROM users WHERE email = ? AND active = 1").bind(email).first();
      if (u) {
        await env.DB.prepare("UPDATE users SET forgot_at = ? WHERE id = ?").bind(now, u.id).run();
        const msg = { title: "🔑 Mot de passe oublié", body: `${u.name} (${email}) demande un nouveau lien d'accès`, url: "/portail.html", tag: "pwd-" + u.id };
        ctx && ctx.waitUntil(ptlNotify(env, "u.role = 'admin' OR (u.role = 'gerance_admin' AND u.org_id = ? AND u.id != ?)", [u.org_id || "", u.id], msg, false));
        ctx && ctx.waitUntil(espPushSend(env, "owner", "pwd"));
      }
      return json({ ok: true });
    }

    if (path === "login" && method === "POST") {
      await guard();
      const b = await body();
      const email = clean(b.email, 200).toLowerCase();
      if ((await ptlFailures(env, "mail:" + email)) >= PTL_MAX_FAILS) fail(429, "Compte temporairement bloqué. Réessayez dans 15 minutes.");
      const u = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
      const ok = u && u.auth_hash && u.active && typeof b.authKey === "string" && safeEqual(await sha256Hex(b.authKey), u.auth_hash);
      if (!ok) {
        await ptlRecordFailure(env, ip);
        await ptlRecordFailure(env, "mail:" + email);
        fail(401, u && !u.active ? "Compte désactivé" : "Email ou mot de passe incorrect");
      }
      const token = randHex(32);
      await env.DB.batch([
        env.DB.prepare("INSERT INTO sessions (token_hash, user_id, expires, created_at) VALUES (?, ?, ?, ?)").bind(await sha256Hex(token), u.id, now + PTL_SESSION_MS, now),
        env.DB.prepare("UPDATE users SET last_login = ? WHERE id = ?").bind(now, u.id),
        env.DB.prepare("DELETE FROM sessions WHERE expires < ?").bind(now),
      ]);
      return json({ token });
    }

    const inviteMatch = path.match(/^invite\/([0-9a-f]{64})$/);
    if (inviteMatch) {
      await guard();
      const u = await env.DB.prepare("SELECT u.*, o.name AS org_name FROM users u LEFT JOIN orgs o ON o.id = u.org_id WHERE invite_hash = ?").bind(await sha256Hex(inviteMatch[1])).first();
      if (!u || u.invite_expires < now) { await ptlRecordFailure(env, ip); fail(404, "Lien d'invitation invalide ou expiré. Demandez un nouveau lien."); }
      if (method === "GET") return json({ name: u.name, email: u.email, org: u.org_name || "LuxInterventions", iter: PTL_ITER });
      if (method === "POST") {
        const b = await body();
        if (!/^[0-9a-f]{64}$/.test(b.authHash || "") || !b.salt) fail(400, "Données invalides");
        const token = randHex(32);
        await env.DB.batch([
          env.DB.prepare("UPDATE users SET salt = ?, iter = ?, auth_hash = ?, invite_hash = NULL, invite_expires = NULL, active = 1, last_login = ? WHERE id = ?")
            .bind(clean(b.salt, 64), PTL_ITER, b.authHash, now, u.id),
          env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(u.id),
          env.DB.prepare("INSERT INTO sessions (token_hash, user_id, expires, created_at) VALUES (?, ?, ?, ?)").bind(await sha256Hex(token), u.id, now + PTL_SESSION_MS, now),
        ]);
        return json({ token });
      }
    }

    // ── Da qui serve una sessione ──
    const auth = request.headers.get("Authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!/^[0-9a-f]{64}$/.test(token)) fail(401, "Session expirée");
    const tokenHash = await sha256Hex(token);
    const me = await env.DB.prepare(
      "SELECT u.*, o.name AS org_name FROM sessions s JOIN users u ON u.id = s.user_id LEFT JOIN orgs o ON o.id = u.org_id WHERE s.token_hash = ? AND s.expires > ? AND u.active = 1"
    ).bind(tokenHash, now).first();
    if (!me) fail(401, "Session expirée");
    const publicUser = (u) => ({ id: u.id, org_id: u.org_id, org_name: u.org_name || null, role: u.role, name: u.name, email: u.email, phone: u.phone || "" });

    if (path === "logout" && method === "POST") {
      await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(tokenHash).run();
      return json({ ok: true });
    }

    if (path === "me" && method === "GET") {
      return json({ user: publicUser(me), vapidKey: (await vapidKeys(env)).publicKey });
    }

    // Annonces des partenaires (publiées par l'app de gestion), seulement celles encore en cours
    if (path === "pubs" && method === "GET") {
      const obj = await env.PHOTOS.get(ARES_PUBS);
      const day = new Date().toISOString().slice(0, 10);
      const items = obj ? ((await obj.json()).items || []).filter((a) => !a.fin || a.fin >= day) : [];
      return json({ items });
    }

    if (path === "me/password" && method === "POST") {
      const b = await body();
      if (!safeEqual(await sha256Hex(clean(b.oldKey, 64)), me.auth_hash || "")) fail(403, "Mot de passe actuel incorrect");
      if (!/^[0-9a-f]{64}$/.test(b.authHash || "") || !b.salt) fail(400, "Données invalides");
      await env.DB.batch([
        env.DB.prepare("UPDATE users SET salt = ?, auth_hash = ? WHERE id = ?").bind(clean(b.salt, 64), b.authHash, me.id),
        env.DB.prepare("DELETE FROM sessions WHERE user_id = ? AND token_hash != ?").bind(me.id, tokenHash),
      ]);
      return json({ ok: true });
    }

    // ── Notifiche push ──
    if (path === "push" && method === "POST") {
      const b = await body();
      if (!ptlPushHostOk(b.endpoint) || !b.keys || !b.keys.p256dh || !b.keys.auth) fail(400, "Abonnement invalide");
      await env.DB.prepare("INSERT OR REPLACE INTO push_subs (endpoint, user_id, p256dh, auth, created_at) VALUES (?, ?, ?, ?, ?)")
        .bind(clean(b.endpoint, 1000), me.id, clean(b.keys.p256dh, 200), clean(b.keys.auth, 100), now).run();
      return json({ ok: true });
    }
    if (path === "push" && method === "DELETE") {
      const b = await body();
      await env.DB.prepare("DELETE FROM push_subs WHERE endpoint = ? AND user_id = ?").bind(clean(b.endpoint, 1000), me.id).run();
      return json({ ok: true });
    }
    if (path === "push/test" && method === "POST") {
      ctx && ctx.waitUntil(ptlNotify(env, "u.id = ?", [me.id], { title: "LuxInterventions", body: "Les notifications fonctionnent ✓", url: "/portail.html" }, false));
      return json({ ok: true });
    }

    // ── Gérance (organizzazioni) ──
    if (path === "orgs" && method === "GET") {
      const rows = isAdmin(me)
        ? await env.DB.prepare(`SELECT o.*, (SELECT COUNT(*) FROM residences r WHERE r.org_id = o.id AND r.active = 1) AS residences,
            (SELECT COUNT(*) FROM users u WHERE u.org_id = o.id AND u.active = 1) AS users,
            (SELECT COUNT(*) FROM tickets t WHERE t.org_id = o.id AND t.status IN ('recue','prise','planifiee','encours')) AS open
            FROM orgs o ORDER BY o.name`).all()
        : await env.DB.prepare("SELECT * FROM orgs WHERE id = ?").bind(me.org_id).all();
      return json({ orgs: rows.results || [] });
    }
    if (path === "orgs" && method === "POST") {
      if (!isAdmin(me)) fail(403, "Réservé à LuxInterventions");
      const b = await body();
      if (!clean(b.name)) fail(400, "Nom obligatoire");
      const id = ptlId();
      await env.DB.prepare("INSERT INTO orgs (id, name, phone, email, created_at) VALUES (?, ?, ?, ?, ?)").bind(id, clean(b.name, 120), clean(b.phone, 40), clean(b.email, 200), now).run();
      return json({ id });
    }
    const orgMatch = path.match(/^orgs\/([a-z0-9]+)$/);
    if (orgMatch && method === "PATCH") {
      if (!isAdmin(me)) fail(403, "Réservé à LuxInterventions");
      const b = await body();
      await env.DB.prepare("UPDATE orgs SET name = COALESCE(?, name), phone = COALESCE(?, phone), email = COALESCE(?, email) WHERE id = ?")
        .bind(b.name != null ? clean(b.name, 120) : null, b.phone != null ? clean(b.phone, 40) : null, b.email != null ? clean(b.email, 200) : null, orgMatch[1]).run();
      return json({ ok: true });
    }

    // Supprimer une gérance (réservé à LuxInterventions) : utilisateurs, résidences, demandes, suivi et photos — irréversible
    if (orgMatch && method === "DELETE") {
      if (!isAdmin(me)) fail(403, "Réservé à LuxInterventions");
      const o = await env.DB.prepare("SELECT * FROM orgs WHERE id = ?").bind(orgMatch[1]).first();
      if (!o) fail(404, "Gérance introuvable");
      const b = await body();
      if (clean(b.confirm, 120) !== o.name) fail(400, "Tapez exactement le nom de la gérance pour confirmer");
      const ph = (await env.DB.prepare("SELECT p.r2_key FROM photos p JOIN tickets t ON t.id = p.ticket_id WHERE t.org_id = ?").bind(o.id).all()).results || [];
      for (let i = 0; i < ph.length; i += 500) await env.PHOTOS.delete(ph.slice(i, i + 500).map((x) => x.r2_key));
      const inv = ((await env.DB.prepare("SELECT inv_key FROM tickets WHERE org_id = ? AND inv_key IS NOT NULL").bind(o.id).all()).results || []).map((x) => x.inv_key);
      for (let i = 0; i < inv.length; i += 500) await env.PHOTOS.delete(inv.slice(i, i + 500));
      await env.DB.batch([
        env.DB.prepare("DELETE FROM photos WHERE ticket_id IN (SELECT id FROM tickets WHERE org_id = ?)").bind(o.id),
        env.DB.prepare("DELETE FROM events WHERE ticket_id IN (SELECT id FROM tickets WHERE org_id = ?)").bind(o.id),
        env.DB.prepare("DELETE FROM tickets WHERE org_id = ?").bind(o.id),
        env.DB.prepare("DELETE FROM residences WHERE org_id = ?").bind(o.id),
        env.DB.prepare("DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE org_id = ?)").bind(o.id),
        env.DB.prepare("DELETE FROM push_subs WHERE user_id IN (SELECT id FROM users WHERE org_id = ?)").bind(o.id),
        env.DB.prepare("DELETE FROM users WHERE org_id = ?").bind(o.id),
        env.DB.prepare("DELETE FROM orgs WHERE id = ?").bind(o.id),
      ]);
      return json({ ok: true, photos: ph.length });
    }

    // ── Utenti ──
    if (path === "users" && method === "GET") {
      if (me.role === "gerance_user") fail(403, "Réservé aux responsables");
      const org = orgScope(me, url.searchParams.get("org"));
      const q = org
        ? env.DB.prepare("SELECT id, org_id, role, name, email, phone, active, last_login, invite_expires, forgot_at, auth_hash IS NOT NULL AS has_password FROM users WHERE org_id = ? ORDER BY name").bind(org)
        : env.DB.prepare("SELECT id, org_id, role, name, email, phone, active, last_login, invite_expires, forgot_at, auth_hash IS NOT NULL AS has_password FROM users ORDER BY role, name");
      return json({ users: (await q.all()).results || [] });
    }
    const inviteFor = async (userId) => {
      const tok = randHex(32);
      await env.DB.prepare("UPDATE users SET invite_hash = ?, invite_expires = ?, forgot_at = NULL WHERE id = ?").bind(await sha256Hex(tok), now + PTL_INVITE_MS, userId).run();
      return tok;
    };
    if (path === "users" && method === "POST") {
      if (me.role === "gerance_user") fail(403, "Réservé aux responsables");
      const b = await body();
      const role = PTL_ROLES.includes(b.role) ? b.role : "gerance_user";
      if (role === "admin" && !isAdmin(me)) fail(403, "Rôle non autorisé");
      const org = role === "admin" ? null : isAdmin(me) ? clean(b.org_id, 40) : me.org_id;
      if (role !== "admin" && !(await env.DB.prepare("SELECT id FROM orgs WHERE id = ?").bind(org).first())) fail(400, "Gérance inconnue");
      const email = clean(b.email, 200).toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !clean(b.name)) fail(400, "Nom et email valides obligatoires");
      if (await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first()) fail(409, "Cet email a déjà un compte");
      const id = ptlId();
      await env.DB.prepare("INSERT INTO users (id, org_id, role, name, email, phone, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .bind(id, org, role, clean(b.name, 120), email, clean(b.phone, 40), now).run();
      return json({ id, invite: await inviteFor(id) });
    }
    const userMatch = path.match(/^users\/([a-z0-9]+)(\/invite)?$/);
    if (userMatch) {
      const target = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(userMatch[1]).first();
      if (!target || (!isAdmin(me) && (me.role !== "gerance_admin" || target.org_id !== me.org_id))) fail(404, "Utilisateur introuvable");
      if (target.role === "admin" && !isAdmin(me)) fail(403, "Non autorisé");
      if (userMatch[2] && method === "POST") return json({ invite: await inviteFor(target.id) });
      if (!userMatch[2] && method === "PATCH") {
        const b = await body();
        if (target.id === me.id && b.active === false) fail(400, "Vous ne pouvez pas désactiver votre propre compte");
        const role = b.role && PTL_ROLES.includes(b.role) && (isAdmin(me) || b.role !== "admin") ? b.role : target.role;
        const ops = [env.DB.prepare("UPDATE users SET name = ?, phone = ?, role = ?, active = ? WHERE id = ?")
          .bind(b.name != null ? clean(b.name, 120) : target.name, b.phone != null ? clean(b.phone, 40) : target.phone, role, b.active === false ? 0 : b.active === true ? 1 : target.active, target.id)];
        if (b.active === false) ops.push(env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(target.id), env.DB.prepare("DELETE FROM push_subs WHERE user_id = ?").bind(target.id));
        await env.DB.batch(ops);
        return json({ ok: true });
      }
    }

    // ── Residenze ──
    if (path === "residences" && method === "GET") {
      const org = orgScope(me, url.searchParams.get("org"));
      const sql = `SELECT r.*, o.name AS org_name,
          (SELECT COUNT(*) FROM tickets t WHERE t.residence_id = r.id) AS tickets,
          (SELECT COUNT(*) FROM tickets t WHERE t.residence_id = r.id AND t.status IN ('recue','prise','planifiee','encours')) AS open
        FROM residences r JOIN orgs o ON o.id = r.org_id WHERE r.active = 1 ${org ? "AND r.org_id = ?" : ""} ORDER BY r.name`;
      const rows = await (org ? env.DB.prepare(sql).bind(org) : env.DB.prepare(sql)).all();
      return json({ residences: rows.results || [] });
    }
    const code6 = (v) => String(v ?? "").replace(/\D/g, "").slice(0, 6);
    const resFields = (b) => [clean(b.name, 160), clean(b.address, 300), clean(b.access, 500), clean(b.keys_info, 500), clean(b.contact_name, 120), clean(b.contact_phone, 40), clean(b.notes, 2000), parseInt(b.apartments, 10) || null,
      code6(b.alarm), code6(b.code_other), clean(b.interior, 120), clean(b.floors, 120)];
    if (path === "residences" && method === "POST") {
      const b = await body();
      const org = isAdmin(me) ? clean(b.org_id, 40) : me.org_id;
      if (!(await env.DB.prepare("SELECT id FROM orgs WHERE id = ?").bind(org).first())) fail(400, "Gérance inconnue");
      if (!clean(b.name)) fail(400, "Nom de la résidence obligatoire");
      const id = ptlId();
      await env.DB.prepare("INSERT INTO residences (id, org_id, name, address, access, keys_info, contact_name, contact_phone, notes, apartments, alarm, code_other, interior, floors, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(id, org, ...resFields(b), now).run();
      return json({ id });
    }
    const resMatch = path.match(/^residences\/([a-z0-9]+)$/);
    if (resMatch && method === "PATCH") {
      const r = await env.DB.prepare("SELECT * FROM residences WHERE id = ?").bind(resMatch[1]).first();
      if (!r || (!isAdmin(me) && r.org_id !== me.org_id)) fail(404, "Résidence introuvable");
      const b = await body();
      if (b.active === false) {
        await env.DB.prepare("UPDATE residences SET active = 0 WHERE id = ?").bind(r.id).run();
      } else {
        if (!clean(b.name)) fail(400, "Nom de la résidence obligatoire");
        await env.DB.prepare("UPDATE residences SET name = ?, address = ?, access = ?, keys_info = ?, contact_name = ?, contact_phone = ?, notes = ?, apartments = ?, alarm = ?, code_other = ?, interior = ?, floors = ? WHERE id = ?")
          .bind(...resFields(b), r.id).run();
      }
      return json({ ok: true });
    }

    // ── Richieste d'intervento ──
    if (path === "tickets" && method === "GET") {
      const org = orgScope(me, url.searchParams.get("org"));
      const scope = url.searchParams.get("scope") || "active";
      const where = [];
      const binds = [];
      if (org) { where.push("t.org_id = ?"); binds.push(org); }
      if (scope === "active") where.push("t.status IN ('recue','prise','planifiee','encours')");
      if (scope === "done") where.push("t.status IN ('terminee','annulee')");
      const res = url.searchParams.get("residence");
      if (res) { where.push("t.residence_id = ?"); binds.push(res); }
      const month = url.searchParams.get("month"); // AAAA-MM
      if (/^\d{4}-\d{2}$/.test(month || "")) {
        const [y, m] = month.split("-").map(Number);
        where.push("t.created_at >= ? AND t.created_at < ?");
        binds.push(Date.UTC(y, m - 1, 1), Date.UTC(y, m, 1));
      }
      const sql = `SELECT t.id, t.ref, t.org_id, t.residence_id, t.lieu, t.categorie, t.urgence, t.description, t.status, t.planned_at, t.technicien,
          t.created_at, t.updated_at, t.taken_at, t.done_at, r.name AS residence_name, r.address AS residence_address, o.name AS org_name, u.name AS created_by_name,
          (SELECT COUNT(*) FROM photos p WHERE p.ticket_id = t.id) AS photos, t.inv_no, t.inv_date, t.inv_ht, t.inv_tva, t.inv_ttc, t.inv_paid,
          (SELECT COUNT(*) FROM events e WHERE e.ticket_id = t.id AND e.kind = 'comment') AS msgs,
          (SELECT COUNT(*) FROM events e JOIN users ue ON ue.id = e.user_id WHERE e.ticket_id = t.id AND e.kind = 'comment' AND ue.role != 'admin') AS msgs_ger
        FROM tickets t JOIN residences r ON r.id = t.residence_id JOIN orgs o ON o.id = t.org_id LEFT JOIN users u ON u.id = t.created_by
        ${where.length ? "WHERE " + where.join(" AND ") : ""}
        ORDER BY CASE t.status WHEN 'recue' THEN 0 ELSE 1 END, CASE t.urgence WHEN 'urgent' THEN 0 WHEN '24h' THEN 1 ELSE 2 END, t.updated_at DESC
        LIMIT ${scope === "active" ? 500 : 300}`;
      return json({ tickets: (await env.DB.prepare(sql).bind(...binds).all()).results || [] });
    }

    if (path === "tickets" && method === "POST") {
      const b = await body();
      const r = await env.DB.prepare("SELECT * FROM residences WHERE id = ? AND active = 1").bind(clean(b.residence_id, 40)).first();
      if (!r || (!isAdmin(me) && r.org_id !== me.org_id)) fail(400, "Résidence inconnue");
      if (!PTL_URGENCES.includes(b.urgence)) fail(400, "Urgence obligatoire");
      if (!clean(b.description)) fail(400, "Description obligatoire");
      const id = ptlId();
      const refRow = await env.DB.prepare("SELECT COALESCE(MAX(ref), 1000) + 1 AS ref FROM tickets").first();
      await env.DB.batch([
        env.DB.prepare(`INSERT INTO tickets (id, ref, org_id, residence_id, lieu, categorie, urgence, description, contact_name, contact_phone, acces, dispo, status, created_by, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'recue', ?, ?, ?)`)
          .bind(id, refRow.ref, r.org_id, r.id, clean(b.lieu, 200), clean(b.categorie, 60), b.urgence, clean(b.description, 4000), clean(b.contact_name, 120),
            clean(b.contact_phone, 40), clean(b.acces, 500), clean(b.dispo, 300), me.id, now, now),
        env.DB.prepare("INSERT INTO events (id, ticket_id, user_id, kind, status, text, created_at) VALUES (?, ?, ?, 'create', 'recue', NULL, ?)").bind(ptlId(), id, me.id, now),
      ]);
      const msg = { title: `${URG_LABEL[b.urgence]} · #${refRow.ref} ${r.name}`, body: `${clean(b.categorie, 60) || "Intervention"}${b.lieu ? " — " + clean(b.lieu, 80) : ""} : ${clean(b.description, 140)}`, url: `/portail.html#/t/${id}`, tag: id };
      ctx && ctx.waitUntil(ptlNotify(env, "u.role = 'admin' AND u.id != ?", [me.id], msg, b.urgence === "urgent"));
      // l'app de gestion (LuxInterventions) : pastille sur l'icône + notification
      if (!isAdmin(me)) ctx && ctx.waitUntil(espPushSend(env, "owner", "ptl"));
      return json({ id, ref: refRow.ref });
    }

    const tMatch = path.match(/^tickets\/([a-z0-9]+)(?:\/(status|comments|photos|invoice|invoice-paid))?$/);
    if (tMatch) {
      const t = await loadTicketFor(env, me, tMatch[1]);
      const sub = tMatch[2];
      if (!sub && method === "GET") {
        const [ev, ph, res] = await Promise.all([
          env.DB.prepare("SELECT e.*, u.name AS user_name, u.role AS user_role FROM events e LEFT JOIN users u ON u.id = e.user_id WHERE e.ticket_id = ? ORDER BY e.created_at").bind(t.id).all(),
          env.DB.prepare("SELECT id, event_id, mime, size, created_at, created_by FROM photos WHERE ticket_id = ? ORDER BY created_at").bind(t.id).all(),
          env.DB.prepare("SELECT r.*, o.name AS org_name FROM residences r JOIN orgs o ON o.id = r.org_id WHERE r.id = ?").bind(t.residence_id).first(),
        ]);
        return json({ ticket: t, events: ev.results || [], photos: ph.results || [], residence: res });
      }
      // Modifier la demande : la gérance tant qu'elle n'est pas prise en charge, LuxInterventions toujours (sauf terminée / annulée)
      if (!sub && method === "PATCH") {
        if (["terminee", "annulee"].includes(t.status)) fail(400, "Demande terminée ou annulée : elle ne peut plus être modifiée");
        if (!isAdmin(me) && t.status !== "recue") fail(403, "Demande déjà prise en charge : écrivez la correction dans un message");
        const b = await body();
        let resId = t.residence_id;
        if (b.residence_id && b.residence_id !== t.residence_id) {
          const r = await env.DB.prepare("SELECT * FROM residences WHERE id = ? AND active = 1").bind(clean(b.residence_id, 40)).first();
          if (!r || r.org_id !== t.org_id) fail(400, "Résidence inconnue");
          resId = r.id;
        }
        if (b.urgence && !PTL_URGENCES.includes(b.urgence)) fail(400, "Urgence invalide");
        const next = { residence_id: resId, lieu: clean(b.lieu, 200), categorie: clean(b.categorie, 60), urgence: b.urgence || t.urgence, description: clean(b.description, 4000) || t.description,
          contact_name: clean(b.contact_name, 120), contact_phone: clean(b.contact_phone, 40), acces: clean(b.acces, 500), dispo: clean(b.dispo, 300) };
        const LBL = { residence_id: "Résidence", lieu: "Lieu", categorie: "Type de travaux", urgence: "Urgence", description: "Description", contact_name: "Contact", contact_phone: "Téléphone", acces: "Accès / codes", dispo: "Disponibilités" };
        const changed = Object.keys(next).filter((k) => String(next[k] ?? "") !== String(t[k] ?? ""));
        if (!changed.length) return json({ ok: true, changed: [] });
        await env.DB.batch([
          env.DB.prepare("UPDATE tickets SET residence_id = ?, lieu = ?, categorie = ?, urgence = ?, description = ?, contact_name = ?, contact_phone = ?, acces = ?, dispo = ?, updated_at = ? WHERE id = ?")
            .bind(next.residence_id, next.lieu, next.categorie, next.urgence, next.description, next.contact_name, next.contact_phone, next.acces, next.dispo, now, t.id),
          env.DB.prepare("INSERT INTO events (id, ticket_id, user_id, kind, status, text, created_at) VALUES (?, ?, ?, 'edit', NULL, ?, ?)")
            .bind(ptlId(), t.id, me.id, changed.map((k) => LBL[k]).join(", "), now),
        ]);
        const msg = { title: `#${t.ref} · Demande modifiée`, body: changed.map((k) => LBL[k]).join(", "), url: `/portail.html#/t/${t.id}`, tag: t.id };
        ctx && ctx.waitUntil(isAdmin(me) ? ptlNotify(env, "u.org_id = ?", [t.org_id], msg, false) : ptlNotify(env, "u.role = 'admin'", [], msg, next.urgence === "urgent"));
        return json({ ok: true, changed });
      }
      const notifyOther = (msg, urgent) => {
        // Messaggio dello staff → la gérance; messaggio della gérance → lo staff
        if (isAdmin(me)) return ptlNotify(env, "u.org_id = ? AND u.id != ?", [t.org_id, me.id], msg, urgent);
        return ptlNotify(env, "u.role = 'admin'", [], msg, urgent);
      };
      if (sub === "status" && method === "POST") {
        const b = await body();
        if (!PTL_STATUSES.includes(b.status)) fail(400, "Statut invalide");
        if (!isAdmin(me) && !(b.status === "annulee" && t.status === "recue")) fail(403, "Seul LuxInterventions peut changer le statut (vous pouvez annuler une demande pas encore prise en charge)");
        const upd = {
          planned_at: b.planned_at != null ? clean(b.planned_at, 40) : t.planned_at,
          technicien: b.technicien != null ? clean(b.technicien, 120) : t.technicien,
          rapport: b.rapport != null ? clean(b.rapport, 4000) : t.rapport,
          taken_at: t.taken_at || (b.status !== "recue" && b.status !== "annulee" ? now : null),
          done_at: b.status === "terminee" ? now : b.status === "annulee" ? t.done_at : null,
        };
        const evId = ptlId();
        await env.DB.batch([
          env.DB.prepare("UPDATE tickets SET status = ?, planned_at = ?, technicien = ?, rapport = ?, taken_at = ?, done_at = ?, updated_at = ? WHERE id = ?")
            .bind(b.status, upd.planned_at, upd.technicien, upd.rapport, upd.taken_at, upd.done_at, now, t.id),
          env.DB.prepare("INSERT INTO events (id, ticket_id, user_id, kind, status, text, created_at) VALUES (?, ?, ?, 'status', ?, ?, ?)")
            .bind(evId, t.id, me.id, b.status, clean(b.text || (b.status === "terminee" ? b.rapport : ""), 4000) || null, now),
        ]);
        const extra = b.status === "planifiee" && upd.planned_at ? ` — ${upd.planned_at.replace("T", " ")}` : "";
        ctx && ctx.waitUntil(notifyOther({ title: `#${t.ref} · ${STATUS_LABEL[b.status]}${extra}`, body: clean(b.text || t.description, 140), url: `/portail.html#/t/${t.id}`, tag: t.id }, false));
        return json({ ok: true, event_id: evId });
      }
      if (sub === "comments" && method === "POST") {
        const b = await body();
        const text = clean(b.text, 4000);
        if (!text && !b.photoOnly) fail(400, "Message vide");
        const evId = ptlId();
        await env.DB.batch([
          env.DB.prepare("INSERT INTO events (id, ticket_id, user_id, kind, status, text, created_at) VALUES (?, ?, ?, 'comment', NULL, ?, ?)").bind(evId, t.id, me.id, text || null, now),
          env.DB.prepare("UPDATE tickets SET updated_at = ? WHERE id = ?").bind(now, t.id),
        ]);
        if (text) ctx && ctx.waitUntil(notifyOther({ title: `#${t.ref} · Message de ${me.name}`, body: text.slice(0, 140), url: `/portail.html#/t/${t.id}`, tag: t.id }, false));
        if (!isAdmin(me)) ctx && ctx.waitUntil(espPushSend(env, "owner", "ptlmsg"));
        return json({ ok: true, event_id: evId });
      }
      // Facture (PDF émis par l'app de gestion de LuxInterventions) : la gérance la télécharge
      if (sub === "invoice" && method === "PUT") {
        if (!isAdmin(me)) fail(403, "Réservé à LuxInterventions");
        if ((request.headers.get("Content-Type") || "") !== "application/pdf") fail(415, "PDF attendu");
        let meta = {};
        try { meta = JSON.parse(decodeURIComponent(request.headers.get("X-Invoice") || "{}")); } catch { fail(400, "Facture illisible"); }
        const no = clean(meta.no, 40);
        if (!/^\d{8}-INT\d{4,}$/.test(no)) fail(400, "Numéro de facture invalide");
        const data = await request.arrayBuffer();
        if (!data.byteLength || data.byteLength > 3 * 1024 * 1024) fail(413, "PDF vide ou trop lourd");
        const key = `portail/invoices/${t.id}.pdf`;
        await env.PHOTOS.put(key, data, { httpMetadata: { contentType: "application/pdf" } });
        const n = (x) => (Number.isFinite(+x) ? Math.round(+x * 100) / 100 : 0);
        const ttc = n(meta.ttc);
        await env.DB.batch([
          env.DB.prepare("UPDATE tickets SET inv_no = ?, inv_date = ?, inv_ht = ?, inv_tva = ?, inv_ttc = ?, inv_key = ?, inv_paid = 0, updated_at = ? WHERE id = ?").bind(no, now, n(meta.ht), n(meta.tva), ttc, key, now, t.id),
          env.DB.prepare("INSERT INTO events (id, ticket_id, user_id, kind, status, text, created_at) VALUES (?, ?, ?, 'invoice', NULL, ?, ?)").bind(ptlId(), t.id, me.id, `🧾 Facture ${no} · ${ttc.toFixed(2).replace(".", ",")} € TTC`, now),
        ]);
        ctx && ctx.waitUntil(notifyOther({ title: `#${t.ref} · 🧾 Facture ${no}`, body: `${ttc.toFixed(2).replace(".", ",")} € TTC — à télécharger dans le portail`, url: `/portail.html#/t/${t.id}`, tag: t.id }, false));
        return json({ ok: true });
      }
      if (sub === "invoice" && method === "GET") {
        if (!t.inv_key) fail(404, "Pas encore de facture");
        const obj = await env.PHOTOS.get(t.inv_key);
        if (!obj) fail(404, "Facture introuvable");
        return new Response(obj.body, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="Facture-${t.inv_no}.pdf"`, "Cache-Control": "private, no-store", ...headers } });
      }
      if (sub === "invoice-paid" && method === "POST") {
        if (!isAdmin(me)) fail(403, "Réservé à LuxInterventions");
        const b = await body();
        await env.DB.prepare("UPDATE tickets SET inv_paid = ?, updated_at = ? WHERE id = ?").bind(b.paid ? now : 0, now, t.id).run();
        return json({ ok: true });
      }
      if (sub === "photos" && method === "PUT") {
        const type = request.headers.get("Content-Type") || "";
        if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(type)) fail(415, "Format d'image non accepté");
        const data = await request.arrayBuffer();
        if (!data.byteLength || data.byteLength > PTL_MAX_PHOTO) fail(413, "Photo vide ou trop lourde (6 Mo max)");
        const count = await env.DB.prepare("SELECT COUNT(*) AS n FROM photos WHERE ticket_id = ?").bind(t.id).first();
        if (count.n >= 30) fail(400, "Trop de photos pour cette demande");
        const id = ptlId();
        const key = `portail/photos/${t.id}/${id}`;
        await env.PHOTOS.put(key, data, { httpMetadata: { contentType: type } });
        const eventId = clean(request.headers.get("X-Event-Id"), 40) || null;
        await env.DB.prepare("INSERT INTO photos (id, ticket_id, event_id, r2_key, mime, size, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
          .bind(id, t.id, eventId, key, type, data.byteLength, me.id, now).run();
        return json({ id });
      }
    }

    const photoMatch = path.match(/^photos\/([a-z0-9]+)$/);
    if (photoMatch && method === "GET") {
      const p = await env.DB.prepare("SELECT p.*, t.org_id FROM photos p JOIN tickets t ON t.id = p.ticket_id WHERE p.id = ?").bind(photoMatch[1]).first();
      if (!p || (!isAdmin(me) && p.org_id !== me.org_id)) fail(404, "Photo introuvable");
      const obj = await env.PHOTOS.get(p.r2_key);
      if (!obj) fail(404, "Photo introuvable");
      return new Response(obj.body, { headers: { "Content-Type": p.mime || "image/jpeg", "Cache-Control": "private, max-age=86400", ...headers } });
    }

    // ── Statistiche ──
    // Évaluations des interventions (12 derniers mois) pour les statistiques de satisfaction
    if (path === "evals" && method === "GET") {
      const org = orgScope(me, url.searchParams.get("org"));
      const rows = await env.DB.prepare(`SELECT e.text, e.created_at, e.ticket_id, t.categorie, t.residence_id FROM events e JOIN tickets t ON t.id = e.ticket_id
          WHERE e.kind = 'comment' AND e.text LIKE '⭐ %' AND e.created_at >= ? ${org ? "AND t.org_id = ?" : ""} ORDER BY e.created_at DESC LIMIT 1000`)
        .bind(now - 365 * 24 * 3600 * 1000, ...(org ? [org] : [])).all();
      return json({ evals: rows.results || [] });
    }
    if (path === "stats" && method === "GET") {
      const org = orgScope(me, url.searchParams.get("org"));
      const f = org ? "AND org_id = ?" : "";
      const b = org ? [org] : [];
      const d = new Date();
      const monthStart = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
      const since = now - 90 * 24 * 3600 * 1000;
      const [open, urgent, recue, doneMonth, created, delays, residences] = await Promise.all([
        env.DB.prepare(`SELECT COUNT(*) AS n FROM tickets WHERE status IN ('recue','prise','planifiee','encours') ${f}`).bind(...b).first(),
        env.DB.prepare(`SELECT COUNT(*) AS n FROM tickets WHERE status IN ('recue','prise','planifiee','encours') AND urgence = 'urgent' ${f}`).bind(...b).first(),
        env.DB.prepare(`SELECT COUNT(*) AS n FROM tickets WHERE status = 'recue' ${f}`).bind(...b).first(),
        env.DB.prepare(`SELECT COUNT(*) AS n FROM tickets WHERE status = 'terminee' AND done_at >= ? ${f}`).bind(monthStart, ...b).first(),
        env.DB.prepare(`SELECT COUNT(*) AS n FROM tickets WHERE created_at >= ? ${f}`).bind(monthStart, ...b).first(),
        env.DB.prepare(`SELECT AVG(taken_at - created_at) AS take, AVG(CASE WHEN done_at IS NOT NULL AND status = 'terminee' THEN done_at - created_at END) AS done,
            AVG(CASE WHEN urgence = 'urgent' THEN taken_at - created_at END) AS take_urgent
          FROM tickets WHERE created_at >= ? AND taken_at IS NOT NULL ${f}`).bind(since, ...b).first(),
        env.DB.prepare(`SELECT COUNT(*) AS n, COALESCE(SUM(apartments), 0) AS apartments FROM residences WHERE active = 1 ${f}`).bind(...b).first(),
      ]);
      return json({
        open: open.n, urgent: urgent.n, recue: recue.n, doneMonth: doneMonth.n, createdMonth: created.n,
        avgTakeMs: delays.take, avgDoneMs: delays.done, avgTakeUrgentMs: delays.take_urgent,
        residences: residences.n, apartments: residences.apartments,
      });
    }

    fail(404, "Not found");
  } catch (e) {
    const status = e instanceof PtlError ? e.status : 500;
    return json({ error: e instanceof PtlError ? e.message : "Erreur serveur" }, status);
  }
}
