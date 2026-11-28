// LGR avec l'ANCIEN Worker (pas encore republié) : le coffre se crée et marche sur l'appareil, sans erreur
import { chromium } from 'playwright'; import { readFile } from 'node:fs/promises';
const { routeCtx } = await import('./harness.mjs');
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, ''), U = 'http://localhost:8765/LGR-residences/';
const MIME = { html: 'text/html', js: 'text/javascript', mjs: 'text/javascript', css: 'text/css', webmanifest: 'application/manifest+json', png: 'image/png', woff2: 'font/woff2' };
const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 1300, height: 850 }, locale: 'fr-FR' }); await routeCtx(c);
await c.route('http://localhost:8765/**', async (r) => { let f = decodeURIComponent(new URL(r.request().url()).pathname); if (f.endsWith('/')) f += 'index.html'; try { r.fulfill({ status: 200, contentType: MIME[f.split('.').pop()] || 'application/octet-stream', body: await readFile(R + f) }); } catch { r.fulfill({ status: 404, body: '' }); } });
const p = await c.newPage(), errs = []; p.on('pageerror', (e) => errs.push(e.message));
let fails = 0; const ok = (x, m) => { console.log((x ? '✔ ' : '✘ ') + m); if (!x) fails++; };
await p.goto(U); await p.click('[data-a=new]'); await p.fill('[name=p1]', 'Une phrase assez longue'); await p.fill('[name=p2]', 'Une phrase assez longue'); await p.click('form button:not([type=button])');
await p.waitForSelector('.rcode', { timeout: 30000 }); await p.check('[name=noted]'); await p.click('[data-a=codeok]'); await p.waitForSelector('.welcome');
await p.click('.welcome [data-a=newsyn]'); await p.fill('.sheet [name=nom]', 'Syndic Essai'); await p.click('.sheet button:not([type=button])'); await p.waitForTimeout(500);
await p.reload(); await p.waitForSelector('.side', { timeout: 20000 }); await p.waitForTimeout(800);
ok((await p.textContent('.side')).includes('Syndic Essai'), 'données gardées sur l’appareil après rechargement (session gardée)');
await p.click('[href="#/reglages"]'); await p.waitForTimeout(400);
ok((await p.textContent('.main')).includes('pas encore à jour'), 'Réglages : « Le Worker n’est pas encore à jour »');
ok(!errs.length, 'aucune erreur JS ' + errs.join(' | '));
await b.close(); process.exit(fails ? 1 : 0);
