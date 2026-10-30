// Banc d’essai du manuel : le vrai Worker (copie .mjs passée dans WORKER_MJS) avec un stockage R2 / KV simulé en mémoire
import { chromium } from 'playwright';
import { readFile, mkdir } from 'node:fs/promises';
const Worker = (await import(process.env.WORKER_MJS)).default;
const ROOT = new URL("../..", import.meta.url).pathname.replace(/\/$/, "");
const MIME = { html: 'text/html', js: 'text/javascript', css: 'text/css', json: 'application/json', webmanifest: 'application/manifest+json', png: 'image/png', webp: 'image/webp', svg: 'image/svg+xml', ico: 'image/x-icon', woff2: 'font/woff2' };
export const store = new Map(); let en = 0;
const obj = (k, v) => ({ key: k, size: v.b.length, httpEtag: '"' + v.e + '"', body: v.b, json: async () => JSON.parse(Buffer.from(v.b).toString()), text: async () => Buffer.from(v.b).toString(), arrayBuffer: async () => v.b });
const PHOTOS = {
  async get(k, o = {}) { const v = store.get(k); if (!v) return null; const inm = o.onlyIf && typeof o.onlyIf.get === 'function' ? o.onlyIf.get('If-None-Match') : null; if (inm && inm.replace(/"/g, '') === v.e) { const x = obj(k, v); delete x.body; return x; } return obj(k, v); },
  async head(k) { const v = store.get(k); return v ? obj(k, v) : null; },
  async put(k, b, o = {}) { const c = store.get(k), oi = o.onlyIf || {}; if (oi.etagDoesNotMatch === '*' && c) return null; if (oi.etagMatches && (!c || c.e !== oi.etagMatches)) return null; const buf = typeof b === 'string' ? Buffer.from(b) : Buffer.from(b instanceof ArrayBuffer ? new Uint8Array(b) : b); const v = { b: buf, e: String(++en) }; store.set(k, v); return obj(k, v); },
  async delete(k) { for (const x of [].concat(k)) store.delete(x); },
  async list({ prefix = '', limit = 1000 } = {}) { return { objects: [...store.keys()].filter((k) => k.startsWith(prefix)).sort().slice(0, limit).map((k) => obj(k, store.get(k))), truncated: false }; },
};
const kv = new Map();
export const env = { PHOTOS, HITS: { async get(k) { return kv.get(k) ?? null; }, async put(k, v) { kv.set(k, v); } }, ARES_SETUP_CODE: 'x' };
export async function start(vp = { width: 1100, height: 900 }) {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: vp });
  await routeCtx(ctx);
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return { b, ctx, page, errors };
}
export async function routeCtx(ctx) {
  await ctx.route('https://luxinterventions-hitcounter.weathered-tree-cfd3.workers.dev/**', async (r) => {
    const q = r.request(), body = q.postDataBuffer();
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': 'ETag' };
    if (q.method() === 'OPTIONS') return r.fulfill({ status: 204, headers: cors });
    const res = await Worker.fetch(new Request(q.url(), { method: q.method(), headers: q.headers(), body: body && !['GET', 'HEAD'].includes(q.method()) ? body : undefined }), env, { waitUntil() {} });
    const h = { ...cors }; res.headers.forEach((v, k) => { if (!k.startsWith('access-control')) h[k] = v; });
    r.fulfill({ status: res.status, headers: h, body: Buffer.from(await res.arrayBuffer()) });
  });
  await ctx.route('http://localhost:8765/**', async (r) => { const f = decodeURIComponent(new URL(r.request().url()).pathname); try { r.fulfill({ status: 200, contentType: MIME[f.split('.').pop()] || 'application/octet-stream', body: await readFile(ROOT + f) }); } catch { r.fulfill({ status: 404, body: '' }); } });
  await ctx.route('https://geocoding-api.open-meteo.com/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results: [{ latitude: 49.61, longitude: 6.13 }] }) }));
  await ctx.route('https://api.open-meteo.com/**', (r) => r.fulfill({ status: 404, body: '' }));
}
export async function centralSetup(page, path = '/locataires.html', code = 'x', pass = 'Tr3s-l0ngue-cle!') {
  await page.goto('http://localhost:8765' + path); await page.waitForSelector('[data-form=setup]', { timeout: 15000 });
  await page.fill('[name=code]', code); await page.fill('[name=pass]', pass); await page.fill('[name=pass2]', pass);
  await page.click('[data-form=setup] button[type=submit]'); await page.waitForTimeout(5000);
  for (let i = 0; i < 4; i++) { const btn = await page.$('.sheet .btn.primary, dialog .btn.primary'); if (!btn) break; await btn.click().catch(() => {}); await page.waitForTimeout(600); }
}
// LANG_M=xx : mêmes scénarios, captures du manuel dans cette langue (les contrôles de texte ne bloquent plus)
export const SL = process.env.LANG_M || '';
export const lg = (d) => SL || d;
export const assert = (c, m) => { if (!c) { console.log(SL ? '⚠' : '✘', m); if (!SL) process.exit(1); } };
// manuel sans noms de société : noms et logos neutralisés sur la capture seulement
export const neutral = (p) => p.evaluate(() => {
  const fix = (t) => t.replace(/NOBIS\s*s\.?\s*a\.?\s*r\.?\s*l\.?/gi, 'Société Démo').replace(/ARES\s+INVEST\s+S\.?\s*A\.?/gi, 'Société Démo').replace(/LuxInterventions/gi, 'INTERVENTIONS').replace(/NOBIS|ALJADY\s*R?\.?/g, 'Démo');
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
  while ((n = w.nextNode())) { const v = fix(n.nodeValue); if (v !== n.nodeValue) n.nodeValue = v; }
  document.querySelectorAll('input,textarea').forEach((i) => { const v = fix(i.value || ''); if (v !== i.value) i.value = v; });
  document.querySelectorAll('img').forEach((i) => { if (!i.src.startsWith('data:') && /icon|logo|nobis|ares|lux|aljady/i.test(i.src)) i.style.visibility = 'hidden'; });
}).catch(() => {});
// capture : shots/<nom>.png (essai) ou shots/<LANG_M>/<nom>.jpg (manuel)
export async function snap(p, name, opts = {}) {
  if (!SL) return p.screenshot({ path: new URL(`./shots/${name}.png`, import.meta.url).pathname, fullPage: !!opts.full });
  const dir = new URL(`./shots/${SL}/`, import.meta.url).pathname;
  await mkdir(dir, { recursive: true });
  await p.waitForTimeout(500); await p.addStyleTag({ content: '#toasts{display:none!important}' }).catch(() => {}); await neutral(p);
  await p.screenshot({ path: dir + name + '.jpg', type: 'jpeg', quality: 78, fullPage: !!opts.full }); console.log('📸', name);
}
export const log = (m) => console.log('✔', m);
// contexte d'un « téléphone » dans une langue donnée (central + apps)
export async function phone(b, lang, vp = { width: 400, height: 860 }) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 2, locale: { fr: 'fr-LU', en: 'en-GB', de: 'de-LU', it: 'it-IT', pt: 'pt-PT', es: 'es-ES' }[lang] });
  await routeCtx(ctx);
  await ctx.addInitScript((l) => { try { for (const k of ['aresLang', 'hoteLang', 'taxiLang', 'annLang', 'espLang', 'eqLang', 'ptlLang']) localStorage.setItem(k, l); } catch { /* */ } }, lang);
  return ctx;
}
