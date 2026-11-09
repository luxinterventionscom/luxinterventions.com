// 📦 Trasferimento: centrale → centrale del cliente (proprio) con immobili, inquilini, pagamenti, documenti e app — WORKER_MJS=… node xfer-test.mjs
import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { phone, centralSetup, store, assert, log } from './harness.mjs';
const b = await chromium.launch(), errs = [];
const act = (p, a, d = {}) => p.evaluate(([a, d]) => { const el = document.createElement('button'); el.dataset.action = a; Object.assign(el.dataset, d); el.hidden = true; document.body.append(el); el.click(); el.remove(); }, [a, d]);
const body = (p) => p.evaluate(() => document.body.innerText);
const S = '/tmp/claude-0/-home-user-luxinterventions-com/8ca9f513-906b-59c7-ab95-4bf4a371e616/scratchpad';
const demo = new URL('./shots/demo.json', import.meta.url).pathname;
await writeFile(demo, execFileSync('node', [new URL('./demo-data.mjs', import.meta.url).pathname]));
const CPASS = 'Cle-Demo-Ares-Invest-2026!';
// 1) centrale principale con i dati e l'app di Anna
const c1 = await phone(b, 'it', { width: 1000, height: 900 }), p = await c1.newPage(); p.on('pageerror', (e) => errs.push('central: ' + e.message));
p.on('dialog', (d) => d.accept());
await centralSetup(p);
await p.evaluate(() => { location.hash = '#/reglages'; }); await p.waitForTimeout(900);
const [fc0] = await Promise.all([p.waitForEvent('filechooser'), act(p, 'import')]);
await fc0.setFiles(demo); await p.waitForTimeout(800); await p.click('#confirm button[type=submit], #confirm .btn.primary'); await p.waitForTimeout(2500);
await act(p, 'open-loc', { id: 'lc1' }); await p.waitForTimeout(500); await act(p, 'sheet-tab', { id: 'espace' }); await p.waitForTimeout(400);
await act(p, 'esp-on', { id: 'lc1' }); await p.waitForTimeout(4000);
const lCode = await p.$eval('.sheet [style*="mono"]', (e) => e.textContent.trim());
await p.keyboard.press('Escape'); await p.waitForTimeout(400);
log('app di Anna ' + lCode);
// 2) cliente «ARES INVEST» (proprio) + la sua centrale
await p.evaluate(() => { location.hash = '#/reseau'; }); await p.waitForTimeout(1500);
await act(p, 'net-new'); await p.waitForTimeout(600);
await p.selectOption('#f [name=fil]', 'proprio'); await p.fill('#f [name=nom]', 'ARES INVEST S.A.'); await p.fill('#f [name=tel]', '+352 691 000 071');
await p.click('button[type=submit][form=f]'); await p.waitForTimeout(3000);
const tCode = await p.$eval('.sheet [style*="mono"]', (e) => e.textContent.trim());
const tid = [...store.keys()].find((k) => k.startsWith('ares/tenants/')).split('/')[2].replace('.json', '');
await p.keyboard.press('Escape'); await p.waitForTimeout(400);
const c2 = await phone(b, 'it', { width: 1000, height: 900 }), q = await c2.newPage(); q.on('pageerror', (e) => errs.push('ares: ' + e.message));
await centralSetup(q, '/locataires.html?t=' + tid, tCode, CPASS); await q.waitForTimeout(3000);
// 3) trasferimento dalla centrale
await act(p, 'net-reload').catch(() => {}); await p.evaluate(() => { location.hash = '#/reseau'; }); await p.waitForTimeout(2500);
await act(p, 'xfer-open', { id: tid }); await p.waitForTimeout(800);
assert(/12, rue des Exemples/.test(await p.$eval('.sheet', (e) => e.innerText)), 'lista immobili nel transfert');
const dls = []; p.on('download', (d) => dls.push(d));
await p.check('[name=xdest][value=dl]'); await act(p, 'xfer-do', { id: tid }); await p.waitForTimeout(600); await p.click('#confirm .btn.primary'); await p.waitForTimeout(9000);
const sheet = await p.$eval('.sheet', (e) => e.innerText);
log('sheet: ' + sheet.slice(0, 260).replace(/\n/g, ' / '));
const xCode = await p.$eval('.sheet [style*="mono"]', (e) => e.textContent.trim());
const xf = dls.find((d) => /^transfert_/.test(d.suggestedFilename()));
assert(xf && dls.some((d) => /\.ares$/.test(d.suggestedFilename()) && /sauvegarde/.test(d.suggestedFilename())), 'sauvegarde + paquet scaricati: ' + dls.map((d) => d.suggestedFilename()).join(', '));
const xPath = S + '/' + xf.suggestedFilename(); await xf.saveAs(xPath);
const pk = JSON.parse(execFileSync('cat', [xPath]).toString());
assert(pk.format === 'ares-transfer' && !/Anna|Martin/.test(pk.data), 'paquet cifrato (nessun nome in chiaro)');
const own = [...store.keys()].filter((k) => k.startsWith('ares/own/')).map((k) => Buffer.from(store.get(k).b).toString());
assert(own.includes(tid), '🌐 app di Anna adottata dalla centrale ARES: ' + own.join(','));
await p.keyboard.press('Escape'); await p.waitForTimeout(400);
// 4) la centrale ARES riceve
await q.evaluate(() => { location.hash = '#/reglages'; }); await q.waitForTimeout(900);
const [fc] = await Promise.all([q.waitForEvent('filechooser'), act(q, 'import')]);
await fc.setFiles(xPath); await q.waitForTimeout(800);
await q.fill('#confirm [name=k]', 'zzzz-' + xCode.toLowerCase().slice(5)); await q.click('#confirm button[type=submit]'); await q.waitForTimeout(3500);
assert(/incorrect/i.test(await body(q)) || /errato|sbagliato/i.test(await body(q)), 'codice sbagliato → rifiutato');
const [fc2] = await Promise.all([q.waitForEvent('filechooser'), act(q, 'import')]);
await fc2.setFiles(xPath); await q.waitForTimeout(800);
await q.fill('#confirm [name=k]', xCode.toLowerCase()); await q.click('#confirm button[type=submit]'); await q.waitForTimeout(3500);
const cf = await q.$eval('#confirm', (e) => e.innerText); log('conferma: ' + cf.replace(/\n/g, ' / '));
assert(/4 (locataires|inquilini)/.test(cf), 'conferma con i conteggi');
await q.click('#confirm .btn.primary'); await q.waitForTimeout(9000);
await q.evaluate(() => { location.hash = '#/immeubles'; }); await q.waitForTimeout(1500);
const qb = await body(q);
assert(/12, rue des Exemples/.test(qb) && /8, avenue du Modèle/.test(qb), 'ARES: immobili arrivati');
await q.evaluate(() => { location.hash = '#/locataires'; }); await q.waitForTimeout(1500);
assert(/Martin/.test(await body(q)), 'ARES: inquilini arrivati');
await act(q, 'open-loc', { id: 'lc1' }); await q.waitForTimeout(600); await act(q, 'sheet-tab', { id: 'espace' }); await q.waitForTimeout(500);
assert((await q.$eval('.sheet', (e) => e.innerText)).includes(lCode), 'ARES: stesso codice dell’app di Anna');
await q.keyboard.press('Escape'); await q.waitForTimeout(400);
await q.evaluate(() => { location.hash = '#/champions'; }); await q.waitForTimeout(1500);
assert(/Locataire de l|Inquilino dell/.test(await body(q)), '🏆 classifica nella centrale ARES');
// 5) l'app di Anna funziona (pubblicata da ARES)
const c3 = await phone(b, 'it'), a = await c3.newPage(); a.on('pageerror', (e) => errs.push('anna: ' + e.message));
await a.goto('http://localhost:8765/espace.html'); await a.waitForTimeout(1200);
await a.fill('input[name=code]', lCode); await a.click('form button[type=submit]'); await a.waitForTimeout(4500);
if (await a.$('[data-rules-ok]')) { await a.click('[data-rules-ok]'); await a.waitForTimeout(1500); }
assert(/Anna/.test(await body(a)), 'app di Anna aperta dopo il trasferimento');
// 6) la centrale principale tiene tutto in archivio
await act(p, 'open-loc', { id: 'lc1' }); await p.waitForTimeout(600); await act(p, 'sheet-tab', { id: 'espace' }); await p.waitForTimeout(500);
assert(/Transféré|Trasferit/.test(await p.$eval('.sheet', (e) => e.innerText)), 'centrale: Anna in archivio «Transféré»');
await p.keyboard.press('Escape'); await p.waitForTimeout(400);
// 📦 Récupérer toutes mes données (ARES)
const dl2 = []; q.on('download', (d) => dl2.push(d.suggestedFilename()));
await act(q, 'my-data'); await q.waitForTimeout(600); await q.click('#confirm .btn.primary'); await q.waitForTimeout(5000);
assert(dl2.length === 3 && dl2.some((n) => /^mes_donnees_/.test(n)), '📦 Récupérer: ' + dl2.join(', '));
// 🏗️ ANGAR → container: il pacco arriva nell'Accueil di ARES
await p.evaluate(() => { location.hash = '#/reglages'; }); await p.waitForTimeout(900);
await act(p, 'angar'); await p.waitForTimeout(3500);
assert(/ARES INVEST/.test(await p.$eval('.sheet', (e) => e.innerText)), 'ANGAR: container ARES in lista');
await act(p, 'xfer-open', { id: tid }); await p.waitForTimeout(800);
await act(p, 'xfer-all', { on: '1' }); await p.waitForTimeout(200);
await act(p, 'xfer-do', { id: tid }); await p.waitForTimeout(600); await p.click('#confirm .btn.primary'); await p.waitForTimeout(9000);
assert(/container de ARES/.test(await p.$eval('.sheet', (e) => e.innerText)), 'pacco depositato nel container');
const yCode = await p.$eval('.sheet [style*="mono"]', (e) => e.textContent.trim());
assert([...store.keys()].some((k) => k.startsWith('ares/t/' + tid + '/pack/')), 'pacco sul server (cifrato)');
await p.keyboard.press('Escape'); await p.waitForTimeout(400);
await q.reload(); await q.waitForTimeout(2500); await q.fill('[data-form=unlock] [name=pass]', CPASS); await q.click('[data-form=unlock] button[type=submit]'); await q.waitForTimeout(6000);
for (let i = 0; i < 3; i++) { const bt = await q.$('dialog[open] .btn.primary'); if (!bt) break; await bt.click().catch(() => {}); await q.waitForTimeout(1200); }
await q.evaluate(() => { location.hash = '#/dashboard'; }); await q.waitForTimeout(2000);
assert(/paquet de LA CENTRAL|pacchetto/i.test(await body(q)), 'Accueil ARES: «Un paquet vous attend»');
await q.click('[data-action=pack-open]'); await q.waitForTimeout(2500);
await q.fill('#confirm [name=k]', yCode); await q.click('#confirm button[type=submit]'); await q.waitForTimeout(3500);
await q.click('#confirm .btn.primary'); await q.waitForTimeout(8000);
const pm = [...store.keys()].filter((k) => k.startsWith('ares/t/' + tid + '/packm/')).map((k) => JSON.parse(Buffer.from(store.get(k).b).toString()));
assert(pm.length && pm[0].opened && ![...store.keys()].some((k) => k.startsWith('ares/t/' + tid + '/pack/')), 'pacco aperto → segnato «ouvert», tolto dal server');
log('errs ' + errs.join(' | ')); await b.close();
