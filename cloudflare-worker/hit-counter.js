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
 */

const ALLOWED_ORIGIN = "https://luxinterventions.com";
const KV_KEY = "total_views";
const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8MB — il browser comprime prima di inviare

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin === ALLOWED_ORIGIN ? origin : ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store",
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
