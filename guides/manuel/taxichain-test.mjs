// 🚕 Chaîne : client → hôtel → LA CENTRAL → CENTRALE-TAXI → son chauffeur → retour ; ▶️ départ / 🏁 arrivée des deux côtés — → la centrale confie à notre chauffeur → l'hôtel voit chauffeur et prix → le chauffeur encaisse — WORKER_MJS=… node taxichain-test.mjs
import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { phone, centralSetup, store, assert, log } from './harness.mjs';
const b = await chromium.launch(), errs = [];
const act = (p, a, d = {}) => p.evaluate(([a, d]) => { const el = document.createElement('button'); el.dataset.action = a; Object.assign(el.dataset, d); el.hidden = true; document.body.append(el); el.click(); el.remove(); }, [a, d]);
const relog = async (p, pass) => { await p.reload(); await p.waitForTimeout(2500); await p.fill('[data-form=unlock] [name=pass]', pass); await p.click('[data-form=unlock] button[type=submit]'); await p.waitForTimeout(4000); for (let i = 0; i < 3; i++) { const btn = await p.$('dialog[open] .btn.primary, #confirm .btn.primary'); if (!btn) break; await btn.click().catch(() => {}); await p.waitForTimeout(1500); } await p.waitForTimeout(2500); };
const body = (p) => p.evaluate(() => document.body.innerText);
const PASS = 'Tr3s-l0ngue-cle!', CPASS = 'Cle-Demo-Hotel-2026!';
const st = JSON.parse(execFileSync('node', [new URL('./demo-data.mjs', import.meta.url).pathname]).toString());
st.intervenants.w3.metier = 'chauffeur';
const T = st.hotes.h1.arrivee;
st.hotes.h1.arr = { mode: 'taxi', from: 'Aéroport Findel', quand: T + 'T18:30', vol: 'LG123', km: 8, prix: 35 };
const demo = new URL('./shots/demo-tx.json', import.meta.url).pathname;
await writeFile(demo, JSON.stringify(st));
const imp = async (x) => { await x.evaluate(() => { location.hash = '#/reglages'; }); await x.waitForTimeout(900); const [fc] = await Promise.all([x.waitForEvent('filechooser'), act(x, 'import')]); await fc.setFiles(demo); await x.waitForTimeout(800); await x.click('#confirm button[type=submit], #confirm .btn.primary'); await x.waitForTimeout(2500); };
const T0 = Date.now();
const KPASS = 'Cle-Demo-Taxi-2026!';
const c1 = await phone(b, 'it', { width: 1000, height: 900 }), p = await c1.newPage(); p.on('pageerror', (e) => errs.push('central: ' + e.message));
await centralSetup(p);
const mk = async (fil, nom, tel) => { await p.evaluate(() => { location.hash = '#/reseau'; }); await p.waitForTimeout(1200); const before = [...store.keys()].filter((k) => k.startsWith('ares/tenants/')); await act(p, 'net-new'); await p.waitForTimeout(600); await p.selectOption('#f [name=fil]', fil); await p.fill('#f [name=nom]', nom); await p.fill('#f [name=tel]', tel); await p.click('button[type=submit][form=f]'); await p.waitForTimeout(3000); const code = await p.$eval('.sheet [style*="mono"]', (e) => e.textContent.trim()); await p.keyboard.press('Escape'); await p.waitForTimeout(300); const id = [...store.keys()].find((k) => k.startsWith('ares/tenants/') && !before.includes(k)).split('/')[2].replace('.json', ''); return [id, code]; };
const [hid, hCode] = await mk('hotel', 'Hôtel Démo', '+352 691 000 050');
const [kid, kCode] = await mk('taxi', 'Taxi Lux Centrale', '+352 691 000 060');
console.log('⏱ '+((Date.now()-T0)/1000|0)+'s centrale taxi : son chauffe');
// centrale taxi : son chauffeur w3 avec l'app
const ck = await phone(b, 'it', { width: 1000, height: 900 }), k = await ck.newPage(); k.on('pageerror', (e) => errs.push('taxi: ' + e.message));
await centralSetup(k, '/locataires.html?t=' + kid, kCode, KPASS); await k.waitForTimeout(3000); await imp(k);
await act(k, 'open-interv', { id: 'w3' }); await k.waitForTimeout(600); await act(k, 'sheet-tab', { id: 'app' }); await k.waitForTimeout(400);
await act(k, 'eq-on', { id: 'w3' }); await k.waitForTimeout(3500);
const wCode = await k.$eval('.sheet [style*="mono"]', (e) => e.textContent.trim());
await k.keyboard.press('Escape'); await k.waitForTimeout(300);
console.log('⏱ '+((Date.now()-T0)/1000|0)+'s hôtel : ↪️ LA CENTRAL');
// hôtel : ↪️ LA CENTRAL
const c2 = await phone(b, 'it', { width: 1000, height: 900 }), q = await c2.newPage(); q.on('pageerror', (e) => errs.push('hotel: ' + e.message));
await centralSetup(q, '/locataires.html?t=' + hid, hCode, CPASS); await q.waitForTimeout(3000); await imp(q);
await act(q, 'hote-taxi', { id: 'h1' }); await q.waitForTimeout(900); await act(q, 'hote-taxi-lc', { id: 'h1', r: '' }); await q.waitForTimeout(2500);
await q.keyboard.press('Escape'); await q.waitForTimeout(300);
console.log('⏱ '+((Date.now()-T0)/1000|0)+'s LA CENTRAL → la centrale ta');
// LA CENTRAL → la centrale taxi
let cid = '';
for (let i = 0; i < 4 && !cid; i++) { await act(p, 'net-reload'); await p.waitForTimeout(3000); await p.evaluate(() => { location.hash = '#/taxis'; }); await p.waitForTimeout(1200); cid = await p.evaluate(() => { const el = document.querySelector('[data-action=course-open]'); return el ? el.dataset.id : ''; }); }
assert(cid, 'LA CENTRAL : course reçue');
await act(p, 'course-open', { id: cid }); await p.waitForTimeout(800);
assert(await p.$('#f [name=ct]'), 'LA CENTRAL : choix CENTRALE-TAXI');
await p.selectOption('#f [name=ct]', kid); await p.click('button[type=submit][form=f]'); await p.waitForTimeout(3000);
console.log('⏱ '+((Date.now()-T0)/1000|0)+'s centrale taxi : reçoit');
// centrale taxi : reçoit, confie à w3
await relog(k, KPASS); await k.waitForTimeout(3000);
const tk = await k.evaluate(() => { const el = document.querySelector('[data-action=course-open]'); return el ? el.dataset.id : ''; });
assert(tk, 'centrale taxi : course reçue de LA CENTRAL');
await act(k, 'course-open', { id: tk }); await k.waitForTimeout(800);
await k.selectOption('#f [name=w]', 'w3'); await k.click('button[type=submit][form=f]'); await k.waitForTimeout(2500);
await relog(k, KPASS); await k.waitForTimeout(3000);
console.log('⏱ '+((Date.now()-T0)/1000|0)+'s LA CENTRAL voit le chauffeu');
// LA CENTRAL voit le chauffeur, puis l'hôtel
await act(p, 'net-reload'); await p.waitForTimeout(4000);
await act(p, 'course-open', { id: cid }); await p.waitForTimeout(800);
assert(/Nadia/.test(await p.$eval('.sheet', (e) => e.innerText)), 'LA CENTRAL : 🚙 Nadia (de la centrale taxi)');
await p.keyboard.press('Escape'); await p.waitForTimeout(300); await act(p, 'net-reload'); await p.waitForTimeout(3000);
await relog(q, CPASS); await q.waitForTimeout(2500);
await act(q, 'hote-taxi', { id: 'h1' }); await q.waitForTimeout(900);
assert(/Nadia/.test(await q.$eval('.sheet', (e) => e.innerText)), 'hôtel : 🚙 Nadia');
await q.keyboard.press('Escape'); await q.waitForTimeout(300);
console.log('⏱ '+((Date.now()-T0)/1000|0)+'s chauffeur : ▶️ départ');
// chauffeur : ▶️ départ, 🏁 arrivée ; client : 🚗 à bord, 🏁 arrivé
const a = await (await phone(b, 'it')).newPage(); a.on('pageerror', (e) => errs.push('equipe: ' + e.message));
await a.goto('http://localhost:8765/equipe.html'); await a.waitForTimeout(1200); await a.fill('input[name=code]', wCode); await a.click('form button[type=submit]'); await a.waitForTimeout(3500);
await a.click('[data-ctl][data-ev=dep]'); await a.waitForTimeout(9500);
await a.click('[data-ctl][data-ev=arr]'); await a.waitForTimeout(9500);
await relog(q, CPASS); await q.waitForTimeout(4000);
console.log('⏱ '+((Date.now()-T0)/1000|0)+'s client');
const g = await (await phone(b, 'it')).newPage(); g.on('pageerror', (e) => errs.push('hote: ' + e.message));
await g.goto('http://localhost:8765/hote.html'); await g.waitForTimeout(1200); await g.fill('input[name=code]', '731204'); await g.click('form button[type=submit]'); await g.waitForTimeout(3500);
await writeFile('/tmp/claude-0/-home-user-luxinterventions-com/8ca9f513-906b-59c7-ab95-4bf4a371e616/scratchpad/g.txt', await body(g)); assert(await g.$('[data-gtl][data-ev=dep]'), 'client : 🚗 À bord');
await g.click('[data-gtl][data-ev=dep]'); await g.waitForTimeout(1500); await g.click('[data-gtl][data-ev=arr]'); await g.waitForTimeout(2000);
await relog(k, KPASS); await k.waitForTimeout(3500);
await act(p, 'net-reload'); await p.waitForTimeout(4000); await act(p, 'net-reload'); await p.waitForTimeout(3000);
await relog(q, CPASS); await q.waitForTimeout(3000);
await act(q, 'hote-taxi', { id: 'h1' }); await q.waitForTimeout(900);
const hs = await q.$eval('.sheet', (e) => e.innerText); log(hs.replace(/\n/g, ' / ').slice(0, 300));
assert(/Chauffeur/.test(hs) && /Départ|Partenza/.test(hs) && /Client|Cliente/.test(hs), 'hôtel : horaires chauffeur + client');
log('errs ' + errs.join(' | ')); await b.close();
