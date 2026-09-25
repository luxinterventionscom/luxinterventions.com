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
 * 3) Archivio cifrato "Ares Invest — Gestion locataires" (locataires.html)
 *    /api/ares/*  — vedi la sezione ARES più sotto. Il Worker conserva solo
 *    dati già cifrati nel browser (AES-256-GCM): senza la chiave di accesso
 *    sono illeggibili, anche per Cloudflare.
 */

const ALLOWED_ORIGIN = "https://luxinterventions.com";
const ALLOWED_ORIGINS = [ALLOWED_ORIGIN, "https://www.luxinterventions.com"];
const KV_KEY = "total_views";
const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8MB — il browser comprime prima di inviare

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, PUT, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, If-Match, If-None-Match",
    "Access-Control-Expose-Headers": "ETag",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "no-store",
    "Vary": "Origin",
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const headers = corsHeaders(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers });
    }

    // ── Archivio cifrato Ares (gestion locataires) ──
    if (url.pathname.startsWith("/api/ares/")) {
      return handleAres(request, env, url, headers);
    }

    // ── Contatore aperture pagina ──
    if (url.pathname === "/api/hits" && request.method === "GET") {
      const current = parseInt((await env.HITS.get(KV_KEY)) || "0", 10);
      const next = current + 1;
      await env.HITS.put(KV_KEY, String(next));
      return new Response(JSON.stringify({ count: next }), {
        headers: { "Content-Type": "application/json", ...headers },
      });
    }

    // ── Upload foto (rapport d'expert) ──
    const uploadMatch = url.pathname.match(/^\/api\/upload\/([a-zA-Z0-9-]{8,64})\/([1-3])$/);
    if (uploadMatch && request.method === "PUT") {
      const [, requestId, index] = uploadMatch;
      const contentType = request.headers.get("Content-Type") || "";
      if (!contentType.startsWith("image/")) {
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
      const ext = (contentType.split("/")[1] || "jpg").replace("jpeg", "jpg");
      const key = `reports/${requestId}/${index}.${ext}`;
      await env.PHOTOS.put(key, body, { httpMetadata: { contentType } });
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
          "Cache-Control": "public, max-age=31536000, immutable",
          ...headers,
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
 *   GET    /api/ares/data          database cifrato + ETag             [auth]
 *   PUT    /api/ares/data          If-Match / If-None-Match: *         [auth]
 *   GET|PUT|DELETE /api/ares/files/<id>                               [auth]
 * ════════════════════════════════════════════════════════════════════════ */

const ARES_META = "ares/meta.json";
const ARES_DATA = "ares/data.bin";
const ARES_FILES = "ares/files/";
const ARES_MAX_DATA = 20 * 1024 * 1024;
const ARES_MAX_FILE = 12 * 1024 * 1024;
const ARES_MAX_FAILS = 10;
const ARES_LOCK_SECONDS = 900;

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
  await env.HITS.put("ares-rl:" + ip, String(n), { expirationTtl: ARES_LOCK_SECONDS });
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
    return aresJson({ configured: true, salt: meta.salt, iter: meta.iter }, 200, headers);
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
  if (!isHex64(token) || !safeEqual(await sha256Hex(token), meta.authHash)) {
    await aresRecordFail(env, ip);
    return aresJson({ error: "Clé d'accès incorrecte" }, 401, headers);
  }

  if (path === "key" && method === "GET") {
    return aresJson({ wrappedKey: meta.wrappedKey }, 200, headers);
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
