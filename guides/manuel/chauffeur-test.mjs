// 🚙 Chauffeur (ouvrier) : en service → position chiffrée → la centrale le voit (Taxis & chauffeurs) ; véhicule + remplaçant — WORKER_MJS=… node chauffeur-test.mjs
import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { phone, centralSetup, assert, log, lg, snap } from './harness.mjs';
const L = lg('it'), b = await chromium.launch(), errs = [];
const act = (p, a, d = {}) => p.evaluate(([a, d]) => { const el = document.createElement('button'); el.dataset.action = a; Object.assign(el.dataset, d); el.hidden = true; document.body.append(el); el.click(); el.remove(); }, [a, d]);
const relog = async (p) => { await p.reload(); await p.waitForTimeout(2500); await p.fill('[data-form=unlock] [name=pass]', 'Tr3s-l0ngue-cle!'); await p.click('[data-form=unlock] button[type=submit]'); await p.waitForTimeout(4000); for (let i = 0; i < 3; i++) { const btn = await p.$('dialog[open] .btn.primary, #confirm .btn.primary'); if (!btn) break; await btn.click().catch(() => {}); await p.waitForTimeout(1500); } await p.waitForTimeout(2500); };
const st = JSON.parse(execFileSync('node', [new URL('./demo-data.mjs', import.meta.url).pathname]).toString());
st.intervenants.w3.metier = 'chauffeur';
const demo = new URL('./shots/demo-chauf.json', import.meta.url).pathname;
await writeFile(demo, JSON.stringify(st));
const c = await phone(b, L), p = await c.newPage(); p.on('pageerror', (e) => errs.push('central: ' + e.message));
await centralSetup(p);
await p.evaluate(() => { location.hash = '#/reglages'; }); await p.waitForTimeout(900);
const [fc] = await Promise.all([p.waitForEvent('filechooser'), act(p, 'import')]);
await fc.setFiles(demo); await p.waitForTimeout(800); await p.click('#confirm button[type=submit], #confirm .btn.primary'); await p.waitForTimeout(2500);
await act(p, 'open-interv', { id: 'w3' }); await p.waitForTimeout(600); await act(p, 'sheet-tab', { id: 'app' }); await p.waitForTimeout(400);
await act(p, 'eq-on', { id: 'w3' }); await p.waitForTimeout(3500);
const code = await p.$eval('.sheet [style*="mono"]', (e) => e.textContent.trim());
await p.keyboard.press('Escape'); await p.waitForTimeout(400);
// véhicule avec remplaçant
await act(p, 'veh-new'); await p.waitForTimeout(600);
await p.fill('#f [name=plaque]', 'lu-1234'); await p.selectOption('#f [name=chauffeur]', 'w3'); await p.click('button[type=submit][form=f]'); await p.waitForTimeout(1500);
// l'app du chauffeur
const cc = await phone(b, L), q = await cc.newPage(); q.on('pageerror', (e) => errs.push('equipe: ' + e.message));
await cc.grantPermissions(['geolocation'], { origin: 'http://localhost:8765' });
await cc.setGeolocation({ latitude: 49.6111, longitude: 6.1299, accuracy: 10 });
await q.goto('http://localhost:8765/equipe.html'); await q.waitForTimeout(1200);
await q.fill('input[name=code]', code); await q.click('form button[type=submit]'); await q.waitForTimeout(3500);
assert(await q.$('#svcCard [data-svc]'), 'app chauffeur: carta 🚙 Servizio');
await q.click('#svcCard [data-svc]'); await q.waitForTimeout(3500);
const sc = await q.$eval('#svcCard', (e) => e.innerText);
assert(/Posizione inviata|Position envoyée/.test(sc), 'in servizio: posizione inviata · ' + sc.slice(0, 80).replace(/\n/g, ' / '));
// la centrale
await p.evaluate(() => { location.hash = '#/taxis'; }); await p.waitForTimeout(3500);
const tb = await p.evaluate(() => document.querySelector('#view').innerText);
log('taxis: ' + tb.slice(0, 400).replace(/\n/g, ' / '));
assert(/en service|in servizio/i.test(tb) && /LU-1234/.test(tb), 'centrale: chauffeur 🟢 en service + véhicule LU-1234');
assert(await p.$('a[href*="openstreetmap.org/?mlat=49.6111"]'), 'centrale: 🗺️ Carte alla posizione');
await q.click('#svcCard [data-svc]'); await q.waitForTimeout(800);
assert(/Sono in servizio|Je suis en service/.test(await q.$eval('#svcCard', (e) => e.innerText)), 'fine servizio');
log('errs ' + errs.join(' | ')); await b.close();
