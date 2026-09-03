/**
 * LuxInterventions — Contatore aperture pagina (reale)
 *
 * Cosa fa: ad ogni chiamata GET incrementa di 1 un numero salvato in una
 * KV namespace di Cloudflare e lo restituisce in JSON. Nessun dato
 * personale viene letto, salvato o loggato: solo un contatore intero.
 *
 * Questo Worker vive su un account Cloudflare dedicato, slegato dal
 * dominio luxinterventions.com (DNS e posta restano su Gandi, invariati).
 * Viene chiamato dal sito staticamente via fetch(), da browser a browser.
 *
 * Endpoint esposto: GET /api/hits  ->  { "count": 1234 }
 */

// Origine autorizzata a chiamare il contatore (il sito pubblico).
const ALLOWED_ORIGIN = "https://luxinterventions.com";
const KV_KEY = "total_views";

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin === ALLOWED_ORIGIN ? origin : ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store",
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const headers = corsHeaders(origin);

    // Preflight CORS
    if (request.method === "OPTIONS") {
      return new Response(null, { headers });
    }

    if (url.pathname !== "/api/hits" || request.method !== "GET") {
      return new Response("Not found", { status: 404, headers });
    }

    // Incremento atomico best-effort: leggi, incrementa, scrivi.
    const current = parseInt((await env.HITS.get(KV_KEY)) || "0", 10);
    const next = current + 1;
    await env.HITS.put(KV_KEY, String(next));

    return new Response(JSON.stringify({ count: next }), {
      headers: { "Content-Type": "application/json", ...headers },
    });
  },
};
