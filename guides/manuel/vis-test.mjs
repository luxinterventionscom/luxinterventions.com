// Annunci: indirizzo a caselle + «Qui la voit ?» (paese) — WORKER_MJS=… node vis-test.mjs
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
// annuncio della centrale principale: N° sbagliato → errore; Allemagne + «Même pays»
const toastTxt = () => p.evaluate(() => [...document.querySelectorAll('.toast, #toast, [role=status]')].map((e) => e.textContent).join(' | '));
await act(p, 'new-pub'); await p.waitForTimeout(800);
await p.fill('#f [name=nom]', 'Bäckerei Trier'); await p.fill('#f [name=adr_n]', '12b'); await p.fill('#f [name=adr_rue]', 'Simeonstraße');
await p.fill('#f [name=adr_cp]', '54290'); await p.fill('#f [name=adr_ville]', 'Trier'); await p.selectOption('#f [name=adr_pays]', 'DE');
await p.selectOption('#f [name=vis]', 'pays');
await p.evaluate(() => document.querySelectorAll('#f input[name^=aud_]').forEach((x) => { x.checked = true; }));
await p.click('button[type=submit][form=f]'); await p.waitForTimeout(800);
assert(await p.$eval('#f [name=adr_n]', (e) => !e.checkValidity()) || /chiffres|cifre/i.test(await toastTxt()), 'N° 12b rifiutato');
await p.fill('#f [name=adr_n]', '12'); await p.click('button[type=submit][form=f]'); await p.waitForTimeout(1500);
await act(p, 'netpubs-now'); await p.waitForTimeout(2500);
const np = await p.evaluate(() => fetch('https://luxinterventions-hitcounter.weathered-tree-cfd3.workers.dev/api/netpubs').then((r) => r.json()));
const it = (np.items || []).find((x) => x.nom === 'Bäckerei Trier');
assert(it && /^vis:pays;p:DE;c:Trier/.test(it.zone) && it.adresse === '12 Simeonstraße, 54290 Trier, Allemagne', 'netpubs: ' + JSON.stringify(it && { z: it.zone, a: it.adresse }));
// app dell'inquilino lc1 (Lussemburgo): non la vede
const c3 = await phone(b, 'it'), a = await c3.newPage(); a.on('pageerror', (e) => errs.push('inquilino: ' + e.message));
await a.goto('http://localhost:8765/espace.html'); await a.waitForTimeout(1200);
await a.fill('input[name=code]', lCode); await a.click('form button[type=submit]'); await a.waitForTimeout(4500);
if (await a.$('[data-rules-ok]')) { await a.click('[data-rules-ok]'); await a.waitForTimeout(1500); }
assert(!(await body(a)).includes('Bäckerei Trier'), 'inquilino in LU: annuncio DE «Même pays» nascosto');
// → Partout: la vede
await p.evaluate(() => { location.hash = '#/abonnements'; }); await p.waitForTimeout(1200);
await act(p, 'edit-pub', { id: it.id }); await p.waitForTimeout(800);
assert(await p.$eval('#f [name=adr_ville]', (e) => e.value) === 'Trier', 'modifica: caselle ricaricate');
await p.selectOption('#f [name=vis]', ''); await p.click('button[type=submit][form=f]'); await p.waitForTimeout(1500);
await act(p, 'netpubs-now'); await p.waitForTimeout(2500);
const c4 = await phone(b, 'it'), a2 = await c4.newPage();
await a2.goto('http://localhost:8765/espace.html'); await a2.waitForTimeout(1200);
await a2.fill('input[name=code]', lCode); await a2.click('form button[type=submit]'); await a2.waitForTimeout(4500);
if (await a2.$('[data-rules-ok]')) { await a2.click('[data-rules-ok]'); await a2.waitForTimeout(1500); }
assert((await body(a2)).includes('Bäckerei Trier'), 'inquilino: annuncio «Partout» visibile');
await relog(q, CPASS); await q.evaluate(() => { location.hash = '#/dashboard'; }); await q.waitForTimeout(2500);
const na = await q.evaluate(() => { const e = document.querySelector('.net-ad'); return e ? { t: e.innerText.slice(0, 60), soc: !!e.querySelector('.psoc') } : null; });
assert(na && na.soc && /Bäckerei/.test(na.t), 'centrale del cliente: annuncio come nelle app ' + JSON.stringify(na));
assert(!errs.length, 'nessun errore JS: ' + errs.join(' / '));
log('OK'); await b.close();
