// 🧵 Fil de la course : hôtel ↔ LA CENTRAL ↔ notre chauffeur, ↪️ au client, 💬 au chauffeur — → la centrale confie à notre chauffeur → l'hôtel voit chauffeur et prix → le chauffeur encaisse — WORKER_MJS=… node fil-test.mjs
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
// 1) LA CENTRAL : notre chauffeur + un client hôtel
const c1 = await phone(b, 'it', { width: 1000, height: 900 }), p = await c1.newPage(); p.on('pageerror', (e) => errs.push('central: ' + e.message));
const demoM = new URL('./shots/demo-fm.json', import.meta.url).pathname; { const s2 = JSON.parse(JSON.stringify(st)); s2.hotes = {}; await writeFile(demoM, JSON.stringify(s2)); }
await centralSetup(p); { await p.evaluate(() => { location.hash = '#/reglages'; }); await p.waitForTimeout(900); const [fc] = await Promise.all([p.waitForEvent('filechooser'), act(p, 'import')]); await fc.setFiles(demoM); await p.waitForTimeout(800); await p.click('#confirm button[type=submit], #confirm .btn.primary'); await p.waitForTimeout(2500); }
await act(p, 'open-interv', { id: 'w3' }); await p.waitForTimeout(600); await act(p, 'sheet-tab', { id: 'app' }); await p.waitForTimeout(400);
await act(p, 'eq-on', { id: 'w3' }); await p.waitForTimeout(3500);
const wCode = await p.$eval('.sheet [style*="mono"]', (e) => e.textContent.trim());
await p.keyboard.press('Escape'); await p.waitForTimeout(400);
await p.evaluate(() => { location.hash = '#/reseau'; }); await p.waitForTimeout(1500);
await act(p, 'net-new'); await p.waitForTimeout(600);
await p.selectOption('#f [name=fil]', 'hotel'); await p.fill('#f [name=nom]', 'Hôtel Démo'); await p.fill('#f [name=tel]', '+352 691 000 050');
await p.click('button[type=submit][form=f]'); await p.waitForTimeout(3000);
const tCode = await p.$eval('.sheet [style*="mono"]', (e) => e.textContent.trim());
const tid = [...store.keys()].find((k) => k.startsWith('ares/tenants/')).split('/')[2].replace('.json', '');
await p.keyboard.press('Escape'); await p.waitForTimeout(400);
// 2) centrale de l'hôtel : Accueil par secteurs, menu Taxis, ↪️ LA CENTRAL
const c2 = await phone(b, 'it', { width: 1000, height: 900 }), q = await c2.newPage(); q.on('pageerror', (e) => errs.push('hotel: ' + e.message));
await centralSetup(q, '/locataires.html?t=' + tid, tCode, CPASS); await q.waitForTimeout(3000); await imp(q);
await q.evaluate(() => { location.hash = '#/dashboard'; }); await q.waitForTimeout(1500);
const nav = await q.evaluate(() => [...document.querySelectorAll('.sidenav .navbtn span, nav .navbtn span')].map((e) => e.textContent.trim()).join('|'));
log('menu: ' + nav);
assert(/Accueil|Home/.test(nav) && /Maintenance|Manutenzione/.test(nav) && /Clients|Clienti/.test(nav) && /Taxi/.test(nav), 'hotel: menu Accueil · Maintenance · Clients · Taxi');
const acc = await body(q);
assert(/ARRIVÉES & DÉPARTS|ARRIVI/i.test(acc) && /TAXIS/i.test(acc) && /MÉNAGE|PULIZIA/i.test(acc) && /FACTURES|FATTURE/i.test(acc), 'hotel: Accueil par secteurs');
assert(await q.$('[data-action=go][data-to=taxis]'), 'hotel: menu 🚕 Taxis');
await act(q, 'hote-taxi', { id: 'h1' }); await q.waitForTimeout(1000);
assert(await q.$('#txPayer'), 'hotel: «Qui paie ?»');
await act(q, 'hote-taxi-lc', { id: 'h1', r: '' }); await q.waitForTimeout(3000);
assert(/LA CENTRAL/.test(await q.$eval('.sheet', (e) => e.innerText)), 'hotel: envoyé à LA CENTRAL');
await q.keyboard.press('Escape'); await q.waitForTimeout(300);
log('hotel → LA CENTRAL');
// 3) LA CENTRAL : la course arrive, on la confie au chauffeur w3 (40 € HT)
let cid = '';
for (let k = 0; k < 4 && !cid; k++) { await act(p, 'net-reload'); await p.waitForTimeout(3000); await p.evaluate(() => { location.hash = '#/taxis'; }); await p.waitForTimeout(1200); cid = await p.evaluate(() => { const el = document.querySelector('[data-action=course-open]'); return el ? el.dataset.id : ''; }); }
assert(cid, 'centrale: course reçue (Taxis & chauffeurs)');
await act(p, 'course-open', { id: cid }); await p.waitForTimeout(800);
assert(/Findel/.test(await p.$eval('.sheet', (e) => e.innerText)), 'centrale: trajet Findel');
await p.selectOption('#f [name=w]', 'w3'); await p.fill('#f [name=prix]', '40'); await p.click('button[type=submit][form=f]'); await p.waitForTimeout(2500);
await act(p, 'net-reload'); await p.waitForTimeout(4000);
log('taxis: ' + (await p.evaluate(() => document.querySelector('#view').innerText)).slice(0, 300).replace(/\n/g, ' / '));
// 4) l'hôtel voit le chauffeur
await relog(q, CPASS); await q.waitForTimeout(2000);
await act(q, 'hote-taxi', { id: 'h1' }); await q.waitForTimeout(1000);
const sh = await q.$eval('.sheet', (e) => e.innerText);
assert(/Nadia/.test(sh), 'hotel: chauffeur Nadia visible · ' + sh.slice(0, 160).replace(/\n/g, ' / '));
await q.keyboard.press('Escape'); await q.waitForTimeout(300);
// 5) 🧵 l'hôtel écrit sur la course
await act(q, 'hote-taxi', { id: 'h1' }); await q.waitForTimeout(900);
await q.fill('.sheet form[data-form=fil] textarea[name=x]', 'Il cliente ha 3 valigie'); await q.click('.sheet form[data-form=fil] button[type=submit]'); await q.waitForTimeout(2500);
await q.keyboard.press('Escape'); await q.waitForTimeout(300);
for (let i = 0; i < 2; i++) { await act(p, 'net-reload'); await p.waitForTimeout(3500); }
await act(p, 'course-open', { id: cid }); await p.waitForTimeout(800);
assert(/3 valigie/.test(await p.$eval('.sheet', (e) => e.innerText)), 'LA CENTRAL : fil reçu de l’hôtel');
await p.keyboard.press('Escape'); await p.waitForTimeout(300);
// 6) le chauffeur le voit et répond
const a = await (await phone(b, 'it')).newPage(); a.on('pageerror', (e) => errs.push('equipe: ' + e.message));
await a.goto('http://localhost:8765/equipe.html'); await a.waitForTimeout(1200); await a.fill('input[name=code]', wCode); await a.click('form button[type=submit]'); await a.waitForTimeout(3500);
assert(/3 valigie/.test(await body(a)), 'chauffeur : voit le fil');
await a.fill('[data-cfil-x]', 'Sono all’uscita B'); await a.click('[data-cfil]'); await a.waitForTimeout(4000);
await relog(p, PASS); await p.waitForTimeout(3500); await act(p, 'net-reload'); await p.waitForTimeout(3000);
await relog(q, CPASS); await q.waitForTimeout(3500);
await act(q, 'hote-taxi', { id: 'h1' }); await q.waitForTimeout(900);
const sh2 = await q.$eval('.sheet', (e) => e.innerText); log(sh2.match(/.*uscita B.*/)?.[0]);
assert(/uscita B/.test(sh2), 'hôtel : réponse du chauffeur');
await q.click('.sheet [data-action=fil-client]'); await q.waitForTimeout(3000);
const g = await (await phone(b, 'it')).newPage(); g.on('pageerror', (e) => errs.push('hote: ' + e.message));
await g.goto('http://localhost:8765/hote.html'); await g.waitForTimeout(1200); await g.fill('input[name=code]', '731204'); await g.click('form button[type=submit]'); await g.waitForTimeout(3500);
assert(/uscita B/.test(await body(g)), 'client : ↪️ reçu dans sa chat');
log('errs ' + errs.join(' | ')); await b.close();
