// 🖼️ Icône de la CENTRAL DOMIER choisie dans Réglages : en-tête, onglet, page de la clé — WORKER_MJS=… node brand-test.mjs
import { chromium } from 'playwright';
import { phone, centralSetup, assert, log } from './harness.mjs';
const b = await chromium.launch(), errs = [];
const c = await phone(b, 'fr', { width: 1100, height: 900 }), p = await c.newPage(); p.on('pageerror', (e) => errs.push(e.message));
await centralSetup(p, '/centraldomier.html');
await p.evaluate(() => { location.hash = '#/reglages'; }); await p.waitForTimeout(1200);
await p.setInputFiles('[data-input=brand-ico]', '/tmp/claude-0/-home-user-luxinterventions-com/8ca9f513-906b-59c7-ab95-4bf4a371e616/scratchpad/leak.jpg'); await p.waitForTimeout(2500);
const r = await p.evaluate(() => ({ mark: document.querySelector('.brand-mark').src.slice(0, 22), fav: document.querySelector('link[rel~=icon]').href.slice(0, 22), apple: document.querySelector('link[rel=apple-touch-icon]').href.slice(0, 22) }));
assert(r.mark === 'data:image/png;base64,' && r.fav === r.mark && r.apple === r.mark, 'icona nuova: intestazione, scheda, iPhone ' + JSON.stringify(r));
await p.reload(); await p.waitForTimeout(2500);
assert((await p.$eval('.lock-logo', (e) => e.src)).startsWith('data:image/png'), 'icona nuova anche sulla pagina della chiave');
await p.fill('[data-form=unlock] [name=pass]', 'Tr3s-l0ngue-cle!'); await p.click('[data-form=unlock] button[type=submit]'); await p.waitForTimeout(4000);
for (let i = 0; i < 3; i++) { const bt = await p.$('dialog[open] .btn.primary'); if (!bt) break; await bt.click().catch(() => {}); await p.waitForTimeout(1200); }
assert(await p.$('#view [data-action=lock]') && /Se déconnecter/.test(await p.$eval('.sidenav', (e) => e.innerText)), '🚪 Se déconnecter in fondo alla pagina e nel menu');
await p.click('#view [data-action=lock]'); await p.waitForTimeout(600); await p.click('#confirm .btn.primary'); await p.waitForTimeout(1500);
assert(await p.$('[data-form=unlock] [name=pass]'), '🚪 → torna alla chiave');
log('errs ' + errs.join(' | ')); await b.close();
