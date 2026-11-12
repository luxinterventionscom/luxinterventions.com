// 🏨 Hôtel : ses chauffeurs (app + GPS), Taxi / Chauffeurs, 💬 Chat, ＋ Demande 🚕 → LA CENTRAL — → la centrale confie à notre chauffeur → l'hôtel voit chauffeur et prix → le chauffeur encaisse — WORKER_MJS=… node hoteltx-test.mjs
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
// 1) LA CENTRAL + client hôtel
const c1 = await phone(b, 'it', { width: 1000, height: 900 }), p = await c1.newPage(); p.on('pageerror', (e) => errs.push('central: ' + e.message));
await centralSetup(p);
await p.evaluate(() => { location.hash = '#/reseau'; }); await p.waitForTimeout(1500);
await act(p, 'net-new'); await p.waitForTimeout(600);
await p.selectOption('#f [name=fil]', 'hotel'); await p.fill('#f [name=nom]', 'Hôtel Démo'); await p.fill('#f [name=tel]', '+352 691 000 050');
await p.click('button[type=submit][form=f]'); await p.waitForTimeout(3000);
const tCode = await p.$eval('.sheet [style*="mono"]', (e) => e.textContent.trim());
const tid = [...store.keys()].find((k) => k.startsWith('ares/tenants/')).split('/')[2].replace('.json', '');
await p.keyboard.press('Escape'); await p.waitForTimeout(400);
// 2) l'hôtel : son chauffeur w3 avec l'app
const c2 = await phone(b, 'it', { width: 1000, height: 900 }), q = await c2.newPage(); q.on('pageerror', (e) => errs.push('hotel: ' + e.message));
await centralSetup(q, '/locataires.html?t=' + tid, tCode, CPASS); await q.waitForTimeout(3000); await imp(q);
await q.evaluate(() => { location.hash = '#/hotel'; }); await q.waitForTimeout(1200);
assert(!(await q.$('#view [data-action=hote-conf]')), 'hotel: plus de bouton ⚙️');
assert(await q.$('[data-action=go][data-to=chat]'), 'hotel: menu 💬 Chat');
await q.evaluate(() => { location.hash = '#/taxis'; }); await q.waitForTimeout(1200);
assert(await q.$('#view [data-action=hote-tarifs]') && await q.$('#view [data-action=new-chauffeur]'), 'hotel: Taxi / Chauffeurs (＋ Chauffeur, 💶 Tarifs)');
await act(q, 'open-interv', { id: 'w3' }); await q.waitForTimeout(600); await act(q, 'sheet-tab', { id: 'app' }); await q.waitForTimeout(400);
await act(q, 'eq-on', { id: 'w3' }); await q.waitForTimeout(3500);
const wCode = await q.$eval('.sheet [style*="mono"]', (e) => e.textContent.trim());
await q.keyboard.press('Escape'); await q.waitForTimeout(400);
// 3) course du client h1 → son chauffeur
await act(q, 'hote-taxi', { id: 'h1' }); await q.waitForTimeout(1000);
assert(await q.$('[data-action=hote-taxi-own][data-w=w3]'), 'hotel: « Vos chauffeurs » dans la course');
await act(q, 'hote-taxi-own', { id: 'h1', r: '', w: 'w3' }); await q.waitForTimeout(2500);
assert(/Nadia/.test(await q.$eval('.sheet', (e) => e.innerText)), 'hotel: chauffeur Nadia sur la course');
await q.keyboard.press('Escape'); await q.waitForTimeout(300);
// 4) l'app du chauffeur de l'hôtel : course, encaissée en espèces
const c3 = await phone(b, 'it'), a = await c3.newPage(); a.on('pageerror', (e) => errs.push('equipe: ' + e.message));
await a.goto('http://localhost:8765/equipe.html'); await a.waitForTimeout(1200);
await a.fill('input[name=code]', wCode); await a.click('form button[type=submit]'); await a.waitForTimeout(3500);
const ab = await body(a);
assert(/Hôtel Démo|HOTEL|Hôtel/i.test(ab) && !/ARES INVEST/.test(ab), 'chauffeur: app au nom de l’hôtel');
const cash = await a.$('[data-cpay][data-mode=cash]');
assert(cash, 'chauffeur: course avec « Payé en espèces »');
await cash.click(); await a.waitForTimeout(3000);
// 5) l'hôtel voit le paiement
await relog(q, CPASS); await q.waitForTimeout(2500);
await act(q, 'hote-taxi', { id: 'h1' }); await q.waitForTimeout(1000);
assert(/Espèces|Contanti/i.test(await q.$eval('.sheet', (e) => e.innerText)), 'hotel: payé en espèces');
await q.keyboard.press('Escape'); await q.waitForTimeout(300);
// 6) 💬 Chat
await q.evaluate(() => { location.hash = '#/chat'; }); await q.waitForTimeout(1200);
const ch = await q.evaluate(() => document.querySelector('#view').innerText);
assert(/Clients|Clienti/.test(ch) && /Nadia/.test(ch), 'hotel: Chat (clients + chauffeurs)');
// 7) ＋ Demande → 🚕 → LA CENTRAL
await act(q, 'tdem-new'); await q.waitForTimeout(600); await act(q, 'tdem-taxi'); await q.waitForTimeout(600);
await q.fill('#f [name=from]', 'Gare centrale'); await q.fill('#f [name=to]', 'Kirchberg'); await q.fill('#f [name=quand]', T + 'T20:00');
await q.click('button[type=submit][form=f]'); await q.waitForTimeout(3000);
let cid = '';
for (let k = 0; k < 4 && !cid; k++) { await act(p, 'net-reload'); await p.waitForTimeout(3000); await p.evaluate(() => { location.hash = '#/taxis'; }); await p.waitForTimeout(1200); cid = await p.evaluate(() => { const el = [...document.querySelectorAll('[data-action=course-open]')].find((x) => /Kirchberg/.test(x.innerText)); return el ? el.dataset.id : ''; }); }
assert(cid, 'centrale: ＋ Demande 🚕 reçue');
log('errs ' + errs.join(' | ')); await b.close();
