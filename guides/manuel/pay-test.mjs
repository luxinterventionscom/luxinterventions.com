// Prova delle fatture CENTRAL-APP → UTENTI-APP (vrai Worker simulé) : WORKER_MJS=… node pay-test.mjs
import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { phone, centralSetup, store, assert, log, lg, snap } from './harness.mjs';
const L = lg('fr'), D = { fr: ['Fuite chambre 12', 'Eau sous le lavabo.'], it: ['Perdita camera 12', 'Acqua sotto il lavandino.'], de: ['Leck Zimmer 12', 'Wasser unter dem Waschbecken.'], en: ['Leak room 12', 'Water under the sink.'], pt: ['Fuga quarto 12', 'Água debaixo do lavatório.'], es: ['Fuga habitación 12', 'Agua bajo el lavabo.'] }[L];
const b = await chromium.launch(), errs = [];
const act = (p, a, d = {}) => p.evaluate(([a, d]) => { const el = document.createElement('button'); el.dataset.action = a; Object.assign(el.dataset, d); el.hidden = true; document.body.append(el); el.click(); el.remove(); }, [a, d]);
const sync = async (p, n = 1) => { for (let k = 0; k < n; k++) { await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); await p.waitForTimeout(2500); } };
const ok = async (p) => { await p.waitForTimeout(500); const c = await p.$('#confirm button[type=submit]:not([disabled]), #confirm .btn.primary:not([disabled])'); if (c) await c.click(); await p.waitForTimeout(3000); };
const body = (p) => p.evaluate(() => document.body.innerText);
// recharger + déverrouiller : la centrale relit tout (casella, demandes) à l'ouverture
const relog = async (p, pass) => { await p.reload(); await p.waitForTimeout(2500); await p.fill('[data-form=unlock] [name=pass]', pass); await p.click('[data-form=unlock] button[type=submit]'); await p.waitForTimeout(4000); for (let i = 0; i < 3; i++) { const btn = await p.$('dialog[open] .btn.primary, #confirm .btn.primary'); if (!btn) break; await btn.click().catch(() => {}); await p.waitForTimeout(1500); } await p.waitForTimeout(2500); };
const demo = new URL('./shots/demo.json', import.meta.url).pathname;
await writeFile(demo, execFileSync('node', [new URL('./demo-data.mjs', import.meta.url).pathname]));
const PASS = 'Tr3s-l0ngue-cle!';
const c1 = await phone(b, L), p = await c1.newPage(); p.on('pageerror', (e) => errs.push('central: ' + e.message));
await centralSetup(p);
await p.evaluate(() => { location.hash = '#/reglages'; }); await p.waitForTimeout(900);
const [fc] = await Promise.all([p.waitForEvent('filechooser'), act(p, 'import')]);
await fc.setFiles(demo); await p.waitForTimeout(800); await p.click('#confirm button[type=submit], #confirm .btn.primary'); await p.waitForTimeout(2500);
// 🧾 Facturation : IBAN, BIC, délais
await act(p, 'fact-set'); await p.waitForTimeout(700);
await p.fill('#f [name=iban]', 'LU28 0019 4006 4475 0000'); await p.fill('#f [name=bic]', 'BCEELULL');
await p.fill('#f [name=avv]', '7'); await p.fill('#f [name=rog]', '30');
await p.click('button[type=submit][form=f]'); await p.waitForTimeout(1500);
log('facturation');
// client hôtel sous licence
await p.evaluate(() => { location.hash = '#/reseau'; }); await p.waitForTimeout(1500);
await act(p, 'net-new'); await p.waitForTimeout(600);
await p.selectOption('#f [name=fil]', 'hotel'); await p.fill('#f [name=nom]', 'Hôtel Démo'); await p.fill('#f [name=tel]', '+352 691 000 050');
await p.click('button[type=submit][form=f]'); await p.waitForTimeout(3000);
const tCode = await p.$eval('.sheet [style*="mono"]', (e) => e.textContent.trim());
const tid = [...store.keys()].find((k) => k.startsWith('ares/tenants/')).split('/')[2].replace('.json', '');
await p.keyboard.press('Escape'); await p.waitForTimeout(400);
log('client ' + tid);
// la centrale du client : sa clé, mode de paiement, une demande
const c2 = await phone(b, L), q = await c2.newPage(); q.on('pageerror', (e) => errs.push('client: ' + e.message));
await centralSetup(q, '/locataires.html?t=' + tid, tCode, 'Cle-Demo-Client-2026!');
await q.waitForTimeout(3000);
assert((JSON.parse(Buffer.from(store.get('ares/tenants/' + tid + '.json').b).toString())).pub, 'clé publique du client publiée');
log('clé publiée');
await act(q, 'tpay-conf'); await q.waitForTimeout(600); await q.check('#f input[name=payMode][value=each]'); await snap(q, 'pay-conf'); await q.click('button[type=submit][form=f]'); await q.waitForTimeout(2000);
await q.evaluate(() => { location.hash = '#/demandes'; }); await q.waitForTimeout(800);
await act(q, 'tdem-new'); await q.waitForTimeout(600);
await q.fill('#f [name=titre]', D[0]); await q.fill('#f [name=texte]', D[1]);
await q.click('button[type=submit][form=f]'); await q.waitForTimeout(2500);
log('demande envoyée');
// la centrale reçoit, termine, facture
let tk = '';
for (let k = 0; k < 4 && !tk; k++) { await act(p, 'net-reload'); await p.waitForTimeout(3000); await p.evaluate(() => { location.hash = '#/maintenance'; }); await p.waitForTimeout(800); tk = await p.evaluate((d0) => { const el = [...document.querySelectorAll('[data-action=edit-tache]')].find((x) => x.textContent.includes(d0)); return el ? el.dataset.id : ''; }, D[0]); }
if (!tk) console.log('DEBUG', [...store.keys()].filter((k) => k.includes('tdem') || k.includes('network')), errs, (await body(p)).slice(0, 400));
assert(tk, 'demande arrivée dans Maintenance');
await act(p, 'tache-done', { id: tk }); await p.waitForTimeout(1500);
const sheetN = await p.$('.sheet'); if (sheetN) { await p.keyboard.press('Escape'); await p.waitForTimeout(400); }
// la facture à 0 € est refusée, puis on indique 2 h × 50 €
await act(p, 'net-open', { id: tid }); await p.waitForTimeout(1000); await snap(p, 'pay-central-bill'); await act(p, 'nfact-bill', { id: tid }); await ok(p);
assert(!(await p.evaluate(() => /\d{8}-INT\d{4}/.test(document.body.innerText))), 'facture à 0 € refusée');
await p.keyboard.press('Escape'); await p.waitForTimeout(400);
await act(p, 'fact-open', { id: tk }); await p.waitForTimeout(800);
await p.fill('#f [name=h]', '2'); await p.fill('#f [name=taux]', '50'); await p.click('button[type=submit][form=f]'); await p.waitForTimeout(1500);
await act(p, 'net-open', { id: tid }); await p.waitForTimeout(1000);
assert((await body(p)).includes('Facturer 1 intervention'), 'bouton « Facturer » dans la fiche du client');
await snap(p, 'pay-central-bill'); await act(p, 'nfact-bill', { id: tid }); await ok(p);
const no = await p.evaluate(() => (document.body.innerText.match(/\d{8}-INT\d{4}/) || [''])[0]);
assert(no, 'facture émise : ' + no);
log('facture ' + no);
// le client la reçoit et voit le virement
await relog(q, 'Cle-Demo-Client-2026!'); await q.evaluate(() => { location.hash = '#/demandes'; }); await q.waitForTimeout(1000);
assert((await body(q)).includes(no), 'facture visible chez le client');
await act(q, 'tfact-open', { id: no }); await q.waitForTimeout(800);
const sh = await q.$eval('.sheet', (e) => e.innerText);
assert(sh.includes('LU28') && (await q.$('.sheet .qr svg')), 'virement avec IBAN et QR code');
assert(sh.includes('117,00'), 'montant 2 h × 50 € + TVA 17 % = 117,00 €');
assert(sh.includes('non connecté') || sh.includes('pas encore connecté'), 'carte : non connecté');
await snap(q, 'pay-client');
await q.keyboard.press('Escape'); await q.waitForTimeout(400);
log('client : facture + QR');
// 40 jours plus tard, rien payé : avis puis sola lettura
const c3 = await phone(b, L), p2 = await c3.newPage(); p2.on('pageerror', (e) => errs.push('central+40: ' + e.message));
await p2.clock.install({ time: new Date(Date.now() + 75 * 864e5) });
await p2.goto('http://localhost:8765/locataires.html'); await p2.waitForTimeout(2500);
await p2.fill('[data-form=unlock] [name=pass]', PASS); await p2.click('[data-form=unlock] button[type=submit]'); await p2.waitForTimeout(4000);
for (let i = 0; i < 3; i++) { const btn = await p2.$('dialog[open] .btn.primary, #confirm .btn.primary'); if (!btn) break; await btn.click().catch(() => {}); await p2.waitForTimeout(1500); }
await p2.evaluate(() => { location.hash = '#/reseau'; }); await p2.waitForTimeout(2000); await act(p2, 'net-reload'); await p2.waitForTimeout(4000);
const reg = JSON.parse(Buffer.from(store.get('ares/tenants/' + tid + '.json').b).toString());
assert(reg.hold === 'ro', 'sola lettura pour impayé (hold=' + reg.hold + ')');
log('sola lettura activée après le délai');
await relog(q, 'Cle-Demo-Client-2026!');
await q.evaluate(() => { location.hash = '#/demandes'; }); await q.waitForTimeout(1500);
const qb = await body(q);
assert(/facture non payée/.test(qb), 'bandeau « lecture seule — facture non payée » chez le client');
await snap(q, 'pay-client-ro');
log('client en lecture seule');
// le client dit « j'ai payé » (permis même en lecture seule), la centrale confirme → débloqué
await act(q, 'tfact-open', { id: no }); await q.waitForTimeout(700); await act(q, 'tfact-claim', { id: no }); await ok(q);
await act(p2, 'net-reload'); await p2.waitForTimeout(4000); await p2.evaluate(() => { location.hash = '#/dashboard'; }); await p2.waitForTimeout(1200);
assert((await body(p2)).includes('dit avoir payé'), 'avis « dit avoir payé » à l’accueil de la centrale');
await snap(p2, 'pay-central-claim');
await act(p2, 'nfact-paid', { id: no }); await ok(p2);
const reg2 = JSON.parse(Buffer.from(store.get('ares/tenants/' + tid + '.json').b).toString());
assert(!reg2.hold, 'lecture seule levée après paiement');
await relog(q, 'Cle-Demo-Client-2026!'); await q.evaluate(() => { location.hash = '#/demandes'; }); await q.waitForTimeout(1200);
assert((await body(q)).includes('payée'), 'facture « payée » chez le client');
log('payée, client débloqué');
console.log('ERRORS', errs.length ? errs : 'none');
await b.close();
