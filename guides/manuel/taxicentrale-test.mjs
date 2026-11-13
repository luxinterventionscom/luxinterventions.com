// 🚕 CENTRALE-TAXI : menu, Accueil, ＋ Course, chauffeur avec app (course + chat), parc auto, ✏️ logo — (app + GPS), Taxi / Chauffeurs, 💬 Chat, ＋ Demande 🚕 → LA CENTRAL — → la centrale confie à notre chauffeur → l'hôtel voit chauffeur et prix → le chauffeur encaisse — WORKER_MJS=… node taxicentrale-test.mjs
import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { phone, centralSetup, store, assert, log } from './harness.mjs';
const b = await chromium.launch(), errs = [];
const act = (p, a, d = {}) => p.evaluate(([a, d]) => { const el = document.createElement('button'); el.dataset.action = a; Object.assign(el.dataset, d); el.hidden = true; document.body.append(el); el.click(); el.remove(); }, [a, d]);
const relog = async (p, pass) => { await p.reload(); await p.waitForTimeout(2500); await p.fill('[data-form=unlock] [name=pass]', pass); await p.click('[data-form=unlock] button[type=submit]'); await p.waitForTimeout(4000); for (let i = 0; i < 3; i++) { const btn = await p.$('dialog[open] .btn.primary, #confirm .btn.primary'); if (!btn) break; await btn.click().catch(() => {}); await p.waitForTimeout(1500); } await p.waitForTimeout(2500); };
const body = (p) => p.evaluate(() => document.body.innerText);
const PASS = 'Tr3s-l0ngue-cle!', CPASS = 'Cle-Demo-Taxi-2026!';
const st = JSON.parse(execFileSync('node', [new URL('./demo-data.mjs', import.meta.url).pathname]).toString());
st.intervenants.w3.metier = 'chauffeur';
const T = st.hotes.h1.arrivee;
st.hotes.h1.arr = { mode: 'taxi', from: 'Aéroport Findel', quand: T + 'T18:30', vol: 'LG123', km: 8, prix: 35 };
const demo = new URL('./shots/demo-tx.json', import.meta.url).pathname;
await writeFile(demo, JSON.stringify(st));
const imp = async (x) => { await x.evaluate(() => { location.hash = '#/reglages'; }); await x.waitForTimeout(900); const [fc] = await Promise.all([x.waitForEvent('filechooser'), act(x, 'import')]); await fc.setFiles(demo); await x.waitForTimeout(800); await x.click('#confirm button[type=submit], #confirm .btn.primary'); await x.waitForTimeout(2500); };
const c1 = await phone(b, 'it', { width: 1000, height: 900 }), p = await c1.newPage(); p.on('pageerror', (e) => errs.push('central: ' + e.message));
await centralSetup(p);
await p.evaluate(() => { location.hash = '#/reseau'; }); await p.waitForTimeout(1500);
await act(p, 'net-new'); await p.waitForTimeout(600);
await p.selectOption('#f [name=fil]', 'taxi'); await p.fill('#f [name=nom]', 'Taxi Lux Centrale'); await p.fill('#f [name=tel]', '+352 691 000 060');
await p.click('button[type=submit][form=f]'); await p.waitForTimeout(3000);
const tCode = await p.$eval('.sheet [style*="mono"]', (e) => e.textContent.trim());
const tid = [...store.keys()].find((k) => k.startsWith('ares/tenants/')).split('/')[2].replace('.json', '');
const c2 = await phone(b, 'it', { width: 1000, height: 900 }), q = await c2.newPage(); q.on('pageerror', (e) => errs.push('taxi: ' + e.message));
await centralSetup(q, '/locataires.html?t=' + tid, tCode, CPASS); await q.waitForTimeout(3000); await imp(q);
const nav = await q.evaluate(() => [...document.querySelectorAll('.sidenav .navbtn span')].map((e) => e.textContent.trim()).join('|'));
log('menu: ' + nav);
assert(/Autisti|Chauffeurs/.test(nav) && /Parco auto|Parc auto/.test(nav) && /statisti/i.test(nav), 'menu centrale taxi');
assert(await q.$('.brand-pen input[data-input=soc-logo]'), '✏️ logo');
await q.evaluate(() => { location.hash = '#/dashboard'; }); await q.waitForTimeout(1200);
assert(/Centrale taxi/.test(await body(q)), 'Accueil centrale taxi');
// chauffeur w3 avec son app
await act(q, 'open-interv', { id: 'w3' }); await q.waitForTimeout(600); await act(q, 'sheet-tab', { id: 'app' }); await q.waitForTimeout(400);
await act(q, 'eq-on', { id: 'w3' }); await q.waitForTimeout(3500);
const wCode = await q.$eval('.sheet [style*="mono"]', (e) => e.textContent.trim());
await q.keyboard.press('Escape'); await q.waitForTimeout(400);
// ＋ Course confiée à w3
await act(q, 'course-new'); await q.waitForTimeout(700);
await q.fill('#f [name=from]', 'Gare centrale'); await q.fill('#f [name=to]', 'Kirchberg'); await q.fill('#f [name=nom]', 'Mario Rossi'); await q.fill('#f [name=prix]', '25');
await q.selectOption('#f [name=w]', 'w3'); await q.click('button[type=submit][form=f]'); await q.waitForTimeout(3000);
await q.evaluate(() => { location.hash = '#/taxis'; }); await q.waitForTimeout(1200);
assert(/Kirchberg/.test(await body(q)), 'Chauffeurs : la course');
// parc auto
const png = await q.screenshot({ clip: { x: 0, y: 0, width: 160, height: 120 } });
await q.evaluate(() => { location.hash = '#/parc'; }); await q.waitForTimeout(900);
await act(q, 'fleet-edit'); await q.waitForTimeout(600);
await q.fill('#f [name=fl_suv]', '3'); await q.setInputFiles('#f [name=flp_suv_e]', { name: 'e.png', mimeType: 'image/png', buffer: png });
await q.click('button[type=submit][form=f]'); await q.waitForTimeout(2000);
assert(/SUV × 3/.test(await body(q)) && await q.$('#view img[data-bph]'), 'Parc auto : SUV × 3 + photo');
// app du chauffeur
const a = await (await phone(b, 'it')).newPage(); a.on('pageerror', (e) => errs.push('equipe: ' + e.message));
await a.goto('http://localhost:8765/equipe.html'); await a.waitForTimeout(1200);
await a.fill('input[name=code]', wCode); await a.click('form button[type=submit]'); await a.waitForTimeout(3500);
const ab = await body(a);
assert(/Kirchberg/.test(ab) && /Taxi Lux Centrale/.test(ab), 'app chauffeur : course + nom de la centrale');
log('cpay ' + !!(await a.$('[data-cpay]')) + ' chat ' + /Messaggi con la centrale|Messages avec la centrale/i.test(ab) + ' · ' + (ab.match(/.*Kirchberg.*/g) || []).join(' | ')); assert(await a.$('[data-cpay]') && /Messaggi con la centrale|Messages avec la centrale/i.test(ab), 'app chauffeur : encaisser + chat');
log('errs ' + errs.join(' | ')); await b.close();
