// Prova del pointage con posizione (vrai Worker simulé) : WORKER_MJS=… node geo-test.mjs
// senza posizione il pulsante non parte ; a 60 m « sur place », a 2 km « à … km »
import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { phone, centralSetup, assert, log, lg, snap } from './harness.mjs';
const L = lg('it'), b = await chromium.launch(), errs = [];
const act = (p, a, d = {}) => p.evaluate(([a, d]) => { const el = document.createElement('button'); el.dataset.action = a; Object.assign(el.dataset, d); el.hidden = true; document.body.append(el); el.click(); el.remove(); }, [a, d]);
const relog = async (p) => { await p.reload(); await p.waitForTimeout(2500); await p.fill('[data-form=unlock] [name=pass]', 'Tr3s-l0ngue-cle!'); await p.click('[data-form=unlock] button[type=submit]'); await p.waitForTimeout(4000); for (let i = 0; i < 3; i++) { const btn = await p.$('dialog[open] .btn.primary, #confirm .btn.primary'); if (!btn) break; await btn.click().catch(() => {}); await p.waitForTimeout(1500); } await p.waitForTimeout(2500); };
// dati demo + Nadia (pulizie) ogni giorno 08–12 al 12, rue des Exemples, che ha già la sua posizione
const st = JSON.parse(execFileSync('node', [new URL('./demo-data.mjs', import.meta.url).pathname]).toString());
st.immeubles.im1.geo = [49.6, 6.13]; st.immeubles.im1.geoSrc = 'ici';
st.intervenants.w3.horaires = [0, 1, 2, 3, 4, 5, 6].map((j) => ({ j, de: '08:00', a: '12:00', immId: 'im1' }));
// attività vecchia (prima della posizione), come quella vera : ieri 09:00 → 10:58, 11:15 → 12:20
const ieri = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
st.intervenants.w3.feed = [['09:00', '🟢 Arrivée'], ['10:58', '🔴 Départ'], ['11:15', '🟢 Arrivée'], ['12:20', '🔴 Départ']].map(([h, n]) => ({ at: ieri + 'T' + h + ':00.000Z', k: 'pres', d: ieri, note: n + ' ' + h }));
const demo = new URL('./shots/demo-geo.json', import.meta.url).pathname;
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
log('accesso Nadia ' + code);
// app di Nadia : prima SENZA permesso di posizione
const cc = await phone(b, L), q = await cc.newPage(); q.on('pageerror', (e) => errs.push('equipe: ' + e.message));
await q.goto('http://localhost:8765/equipe.html'); await q.waitForTimeout(1200);
await q.fill('input[name=code]', code); await q.click('form button[type=submit]'); await q.waitForTimeout(3500);
await q.click('form.pres[data-pres=arr] button[type=submit]'); await q.waitForTimeout(2500);
assert(await q.$('#geoWarn'), 'senza posizione: avviso e niente invio');
await snap(q, 'geo-blocco');
// con la posizione a ~60 m dal palazzo
await cc.grantPermissions(['geolocation'], { origin: 'http://localhost:8765' });
await cc.setGeolocation({ latitude: 49.6005, longitude: 6.1303, accuracy: 15 });
await q.click('form.pres[data-pres=arr] button[type=submit]'); await q.waitForTimeout(3000);
assert(!(await q.$('#geoWarn')), 'con posizione: avviso sparito');
// partenza a ~2,2 km
await cc.setGeolocation({ latitude: 49.62, longitude: 6.13, accuracy: 20 });
await q.click('form.pres[data-pres=dep] button[type=submit]'); await q.waitForTimeout(3000);
await cc.setGeolocation({ latitude: 49.6002, longitude: 6.1301, accuracy: 10 });
await q.reload(); await q.waitForTimeout(3000);
await q.click('form.pres[data-pres=arr] button[type=submit]'); await q.waitForTimeout(3000);
log('arrivo e partenza inviati');
await relog(p);
await act(p, 'eq-feed'); await p.waitForTimeout(1200);
const feed = await p.evaluate(() => (document.querySelector('.sheet') || document.body).innerText);
assert(/sur place \(\d+ m\)|sul posto/.test(feed) || /✅/.test(feed), 'arrivo «sul posto»');
assert(/2,2 km/.test(feed) && /✅/.test(feed), "arrivo sul posto e partenza a 2,2 km");
await snap(p, 'geo-centrale');
log('centrale: ✅ sul posto e ⚠️ a 2,2 km');
await p.keyboard.press('Escape'); await p.waitForTimeout(400);
await act(p, 'open-interv', { id: 'w3' }); await p.waitForTimeout(700); await act(p, 'sheet-tab', { id: 'act' }); await p.waitForTimeout(800);
const at = await p.$eval('.sheet', (e) => e.innerText);
assert(/2 giri/.test(at) || /2 visites/.test(at), 'oggi 2 giri raggruppati');
await act(p, 'pres-wk', { id: 'w3', d: '-1' }); await p.waitForTimeout(500); await act(p, 'pres-wk', { id: 'w3', d: '1' }); await p.waitForTimeout(500);
const wtxt = await p.$eval('.sheet', (e) => e.innerText);
const ieriIn = new Date(Date.now() - 864e5).getDay() !== 0;
assert(!ieriIn || /3 h 03|3 h03/.test(wtxt.replace(/\s+/g, ' ')) || /3 h/.test(wtxt), 'ieri ricostruito: 1 h 58 + 1 h 05');
await snap(p, 'pres-giorni', { full: true });
await act(p, 'sheet-tab', { id: 'heures' }); await p.waitForTimeout(800);
const ht = await p.$eval('.sheet', (e) => e.innerText);
assert(ht.indexOf('🔁') > -1 && ht.indexOf('🔁') < ht.indexOf('🧰'), 'Horaires: routine in alto');
await snap(p, 'horaires-nuovo', { full: true });
log('attività raggruppata per giorno, Horaires riordinata');
console.log('ERRORS', errs.length ? errs : 'none');
await b.close();
