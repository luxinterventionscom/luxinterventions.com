// 📜 Conditions d'utilisation: obbligatorie alla configurazione della centrale cliente; la MASTER vede data e versione — WORKER_MJS=… node cgu-test.mjs
import { chromium } from 'playwright';
import { phone, centralSetup, store, assert, log } from './harness.mjs';
const b = await chromium.launch(), errs = [];
const act = (p, a, d = {}) => p.evaluate(([a, d]) => { const el = document.createElement('button'); el.dataset.action = a; Object.assign(el.dataset, d); el.hidden = true; document.body.append(el); el.click(); el.remove(); }, [a, d]);
const body = (p) => p.evaluate(() => document.body.innerText);
const c1 = await phone(b, 'it', { width: 1000, height: 900 }), p = await c1.newPage(); p.on('pageerror', (e) => errs.push('central: ' + e.message));
await centralSetup(p);
assert(!(await p.$('[data-form=setup] [name=cgu]')), 'MASTER: niente casella condizioni');
await p.evaluate(() => { location.hash = '#/reseau'; }); await p.waitForTimeout(1500);
await act(p, 'net-new'); await p.waitForTimeout(600);
await p.fill('#f [name=nom]', 'Gérance Prova'); await p.fill('#f [name=tel]', '+352 691 000 090');
await p.click('button[type=submit][form=f]'); await p.waitForTimeout(3000);
const tCode = await p.$eval('.sheet [style*="mono"]', (e) => e.textContent.trim());
const tid = [...store.keys()].find((k) => k.startsWith('ares/tenants/')).split('/')[2].replace('.json', '');
await p.keyboard.press('Escape'); await p.waitForTimeout(400);
// centrale del cliente: senza spunta → rifiutata
const c2 = await phone(b, 'it', { width: 1000, height: 900 }), q = await c2.newPage(); q.on('pageerror', (e) => errs.push('cliente: ' + e.message));
await q.goto('http://localhost:8765/locataires.html?t=' + tid); await q.waitForSelector('[data-form=setup]', { timeout: 15000 });
assert(await q.$('[data-form=setup] [name=cgu]'), 'cliente: casella «J’ai lu et j’accepte» nella configurazione');
await q.fill('[name=code]', tCode); await q.fill('[name=pass]', 'Cle-Demo-Gerance-2026!'); await q.fill('[name=pass2]', 'Cle-Demo-Gerance-2026!');
await q.click('[data-form=setup] button[type=submit]'); await q.waitForTimeout(1500);
assert(/conditions|condizioni/i.test(await q.$eval('[data-form=setup] .lock-err', (e) => e.textContent)), 'cliente: senza spunta la centrale non si crea');
log('senza spunta: rifiutata');
await q.check('[data-form=setup] [name=cgu]'); await q.click('[data-form=setup] button[type=submit]'); await q.waitForTimeout(6000);
for (let i = 0; i < 4; i++) { const btn = await q.$('.sheet .btn.primary, dialog .btn.primary'); if (!btn) break; await btn.click().catch(() => {}); await q.waitForTimeout(600); }
await q.waitForTimeout(3000);
assert(!(await q.$('[data-action=cgu-accept]')), 'cliente: nessun avviso «Conditions à accepter» dopo la configurazione');
log('con la spunta: centrale creata');
// la MASTER riceve data e versione
let ok = false;
for (let k = 0; k < 4 && !ok; k++) { await act(p, 'net-reload'); await p.waitForTimeout(3500); await act(p, 'net-open', { id: tid }); await p.waitForTimeout(1200); ok = /Conditions acceptées le|Condizioni accettate il/.test(await body(p)); if (!ok) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); } }
assert(ok, 'MASTER: «📜 Conditions acceptées le …» nella scheda del cliente');
log('MASTER: data e versione ricevute');
console.log('ERRORS', errs.length ? errs : 'none');
await b.close();
