// Catena gérance (abbonamento): inquilino → centrale della gérance → ↪️ LuxInterventions → stato che torna — WORKER_MJS=… node fwd-test.mjs
import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { phone, centralSetup, store, assert, log } from './harness.mjs';
const b = await chromium.launch(), errs = [];
const act = (p, a, d = {}) => p.evaluate(([a, d]) => { const el = document.createElement('button'); el.dataset.action = a; Object.assign(el.dataset, d); el.hidden = true; document.body.append(el); el.click(); el.remove(); }, [a, d]);
const relog = async (p, pass) => { await p.reload(); await p.waitForTimeout(2500); await p.fill('[data-form=unlock] [name=pass]', pass); await p.click('[data-form=unlock] button[type=submit]'); await p.waitForTimeout(4000); for (let i = 0; i < 3; i++) { const btn = await p.$('dialog[open] .btn.primary, #confirm .btn.primary'); if (!btn) break; await btn.click().catch(() => {}); await p.waitForTimeout(1500); } await p.waitForTimeout(2500); };
const body = (p) => p.evaluate(() => document.body.innerText);
const S = '/tmp/claude-0/-home-user-luxinterventions-com/8ca9f513-906b-59c7-ab95-4bf4a371e616/scratchpad';
const demo = new URL('./shots/demo.json', import.meta.url).pathname;
await writeFile(demo, execFileSync('node', [new URL('./demo-data.mjs', import.meta.url).pathname]));
const PASS = 'Tr3s-l0ngue-cle!', CPASS = 'Cle-Demo-Gerance-2026!';
// 1) centrale principale: un cliente gérance
const c1 = await phone(b, 'it', { width: 1000, height: 900 }), p = await c1.newPage(); p.on('pageerror', (e) => errs.push('central: ' + e.message));
await centralSetup(p);
await p.evaluate(() => { location.hash = '#/reseau'; }); await p.waitForTimeout(1500);
await act(p, 'net-new'); await p.waitForTimeout(600);
await p.selectOption('#f [name=fil]', 'gerance'); await p.fill('#f [name=nom]', 'Gérance Test'); await p.fill('#f [name=tel]', '+352 691 000 070');
await p.click('button[type=submit][form=f]'); await p.waitForTimeout(3000);
const tCode = await p.$eval('.sheet [style*="mono"]', (e) => e.textContent.trim());
const tid = [...store.keys()].find((k) => k.startsWith('ares/tenants/')).split('/')[2].replace('.json', '');
await p.keyboard.press('Escape'); await p.waitForTimeout(400);
// 🎁 6 mesi offerti
await act(p, 'net-open', { id: tid }); await p.waitForTimeout(1000);
const [gift] = await Promise.all([p.waitForEvent('download'), (async () => { await act(p, 'lic-gift', { id: tid }); await p.waitForTimeout(600); await p.click('#confirm .btn.primary, #confirm button[type=submit]'); })()]);
assert(/facture-.*LIC/.test(gift.suggestedFilename()), '🎁 6 mesi offerti: fattura ' + gift.suggestedFilename());
const reg = JSON.parse(Buffer.from(store.get('ares/tenants/' + tid + '.json').b).toString());
assert(reg.until && reg.until > new Date(Date.now() + 150 * 864e5).toISOString().slice(0, 10), '🎁 accesso fino a ' + reg.until);
await p.keyboard.press('Escape'); await p.waitForTimeout(400);
log('cliente gérance + 6 mesi offerti');
// 2) centrale della gérance: i suoi immobili e inquilini, app di un inquilino
const c2 = await phone(b, 'it', { width: 1000, height: 900 }), q = await c2.newPage(); q.on('pageerror', (e) => errs.push('gérance: ' + e.message));
await centralSetup(q, '/locataires.html?t=' + tid, tCode, CPASS); await q.waitForTimeout(3000);
await q.evaluate(() => { location.hash = '#/reglages'; }); await q.waitForTimeout(900);
const [fc] = await Promise.all([q.waitForEvent('filechooser'), act(q, 'import')]);
await fc.setFiles(demo); await q.waitForTimeout(800); await q.click('#confirm button[type=submit], #confirm .btn.primary'); await q.waitForTimeout(2500);
await act(q, 'open-loc', { id: 'lc1' }); await q.waitForTimeout(600); await act(q, 'sheet-tab', { id: 'espace' }); await q.waitForTimeout(400);
await act(q, 'esp-on', { id: 'lc1' }); await q.waitForTimeout(4000);
const lCode = await q.$eval('.sheet [style*="mono"]', (e) => e.textContent.trim());
await q.keyboard.press('Escape'); await q.waitForTimeout(400);
log('inquilino della gérance con la sua app');
// 3) l'inquilino segnala un guasto con una foto
const c3 = await phone(b, 'it'), a = await c3.newPage(); a.on('pageerror', (e) => errs.push('inquilino: ' + e.message));
await a.goto('http://localhost:8765/espace.html'); await a.waitForTimeout(1200);
await a.fill('input[name=code]', lCode); await a.click('form button[type=submit]'); await a.waitForTimeout(3500);
if (await a.$('[data-rules-ok]')) { await a.click('[data-rules-ok]'); await a.waitForTimeout(1200); }
await a.evaluate(() => { const d = document.querySelector('details[data-fold=signal]'); if (d) d.open = true; });
await writeFile(S + '/leak.jpg', await a.screenshot({ type: 'jpeg', quality: 60, clip: { x: 0, y: 0, width: 200, height: 200 } }));
await a.fill('#sig textarea[name=texte]', 'Perdita d’acqua sotto il lavandino del bagno');
await a.setInputFiles('#sig input[name=photos]', S + '/leak.jpg');
await a.click('#sig button[type=submit]'); await a.waitForTimeout(4000);
log('segnalazione inviata dall’inquilino');
// 4) la gérance la riceve e la inoltra a noi con l'accesso autorizzato
await relog(q, CPASS);
await q.evaluate(() => { location.hash = '#/dashboard'; }); await q.waitForTimeout(1500);
const sid = await q.evaluate(() => { const el = document.querySelector('[data-action=open-signal]'); return el ? el.dataset.id : ''; });
assert(sid, 'gérance: segnalazione arrivata');
await act(q, 'open-signal', { id: sid }); await q.waitForTimeout(1000);
assert(await q.$('[data-action=tfwd]'), 'gérance: bottone «↪️ Envoyer à LuxInterventions»');
await act(q, 'tfwd', { id: sid }); await q.waitForTimeout(800);
await q.fill('#f [name=entree]', 'Portone A, codice 1234');
await q.check('#f [name=acces]'); await q.waitForTimeout(200);
await q.fill('#f [name=accesTxt]', 'Cassetta chiavi n. 3, codice 5678');
await q.click('button[type=submit][form=f]'); await q.waitForTimeout(4000);
await act(q, 'open-signal', { id: sid }); await q.waitForTimeout(800);
assert(/Inviato a LuxInterventions|Envoyé à LuxInterventions/.test(await body(q)), 'gérance: «inviato a LuxInterventions»');
await q.keyboard.press('Escape'); await q.waitForTimeout(300);
log('inoltrata con foto, entrata e accesso');
// 5) la centrale la riceve con foto e accessi, la chiude
let tk = '';
for (let k = 0; k < 4 && !tk; k++) { await act(p, 'net-reload'); await p.waitForTimeout(3000); tk = await p.evaluate(() => { const el = [...document.querySelectorAll('[data-action=edit-tache][data-id], [data-action=open-tache][data-id], [data-action=tache-done][data-id]')].find((x) => /Perdita d’acqua/.test((x.closest('.row, .card') || x).textContent || '')); return el ? el.dataset.id : ''; }); if (!tk) { await p.evaluate(() => { location.hash = '#/maintenance'; }); await p.waitForTimeout(1000); } }
assert(tk, 'centrale: richiesta arrivata in Manutenzione');
await act(p, 'edit-tache', { id: tk }); await p.waitForTimeout(1000);
const note = await p.evaluate(() => [...document.querySelectorAll('.sheet textarea, .sheet')].map((e) => e.value || e.innerText).join(' '));
assert(/Cassetta chiavi n\. 3/.test(note) && /Portone A/.test(note) && /Anna/.test(note) && /📷 1 photo/.test(note), 'centrale: nota con inquilino, entrata, accesso autorizzato e 1 foto');
await p.keyboard.press('Escape'); await p.waitForTimeout(400);
await act(p, 'tache-done', { id: tk }); await p.waitForTimeout(1500);
if (await p.$('.sheet[open]')) { await p.keyboard.press('Escape'); await p.waitForTimeout(400); }
await act(p, 'net-reload'); await p.waitForTimeout(4000);
log('centrale: ricevuta e chiusa');
// 6) lo stato torna alla gérance e all'inquilino
await relog(q, CPASS);
await act(q, 'open-signal', { id: sid }); await q.waitForTimeout(800);
await q.evaluate(() => { location.hash = '#/maintenance'; }); await q.waitForTimeout(1200);
assert(/(Inviato a LuxInterventions|Envoyé à LuxInterventions)[^\n]*(Terminato|Terminée)/.test(await body(q)) || /Terminato|Terminée/.test(await body(q)), 'gérance: stato «terminato» tornato da noi');
await q.keyboard.press('Escape'); await q.waitForTimeout(300);
await q.waitForTimeout(4000);
await a.reload(); await a.waitForTimeout(3500);
await a.evaluate(() => { const d = document.querySelector('details[data-fold=signal]'); if (d) d.open = true; });
assert(await a.$('.l-green'), 'inquilino: la sua segnalazione è verde (fatto)');
log('stato tornato alla gérance e all’inquilino');
console.log('ERRORS', errs.length ? errs : 'none');
await b.close();
