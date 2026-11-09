// Annunci: pacchetto, fasce, week-end, posizione, durata → prezzo uguale app/centrale, planning — WORKER_MJS=… node plan-test.mjs
// invio → validazione → bonifico QR + « J'ai payé » → « Paiement reçu » : fattura e messa online
import { chromium } from 'playwright';
import { phone, centralSetup, assert, log, lg, snap } from './harness.mjs';
const L = lg('it'), A = { fr: ['Menu du jour', 'Pâtes fraîches 14 €'], it: ['Menu del giorno', 'Pasta fresca 14 €'], de: ['Tagesmenü', 'Frische Pasta 14 €'], en: ['Menu of the day', 'Fresh pasta 14 €'], pt: ['Menu do dia', 'Massa fresca 14 €'], es: ['Menú del día', 'Pasta fresca 14 €'] }[L];
const b = await chromium.launch(), errs = [];
const act = (p, a, d = {}) => p.evaluate(([a, d]) => { const el = document.createElement('button'); el.dataset.action = a; Object.assign(el.dataset, d); el.hidden = true; document.body.append(el); el.click(); el.remove(); }, [a, d]);
const ok = async (p) => { await p.waitForTimeout(500); const c = await p.$('#confirm button[type=submit]:not([disabled]), #confirm .btn.primary:not([disabled])'); if (c) await c.click(); await p.waitForTimeout(3000); };
const body = (p) => p.evaluate(() => document.body.innerText);
const relog = async (p, pass) => { await p.reload(); await p.waitForTimeout(2500); await p.fill('[data-form=unlock] [name=pass]', pass); await p.click('[data-form=unlock] button[type=submit]'); await p.waitForTimeout(4000); for (let i = 0; i < 3; i++) { const btn = await p.$('dialog[open] .btn.primary, #confirm .btn.primary'); if (!btn) break; await btn.click().catch(() => {}); await p.waitForTimeout(1500); } await p.waitForTimeout(2500); };
const pubTab = async (p) => { await p.evaluate(() => { location.hash = '#/compta'; }); await p.waitForTimeout(900); await p.evaluate(() => { const el = document.querySelector('[data-sec=abo]'); if (el) el.click(); }); await p.waitForTimeout(600); await act(p, 'abo-tab', { id: 'pub' }); await p.waitForTimeout(800); };
const PASS = 'Tr3s-l0ngue-cle!';
const c1 = await phone(b, L), p = await c1.newPage(); p.on('pageerror', (e) => errs.push('central: ' + e.message));
await centralSetup(p);
await act(p, 'fact-set'); await p.waitForTimeout(700);
await p.fill('#f [name=iban]', 'LU28 0019 4006 4475 0000'); await p.fill('#f [name=bic]', 'BCEELULL');
await p.click('button[type=submit][form=f]'); await p.waitForTimeout(1500);
await act(p, 'ann-tarifs'); await p.waitForTimeout(600); await p.fill('#f [name=pk_start]', '19'); await p.click('button[type=submit][form=f]'); await p.waitForTimeout(1500);
await pubTab(p);
await act(p, 'new-annc'); await p.waitForTimeout(500); await p.fill('#f [name=nom]', 'Restaurant Démo');
const code = await p.$eval('#f [name=appCode]', (e) => e.value); await p.click('button[type=submit][form=f]'); await p.waitForTimeout(3500); await p.keyboard.press('Escape'); await p.waitForTimeout(400);
log('annonceur ' + code);
const c2 = await phone(b, L), q = await c2.newPage(); q.on('pageerror', (e) => errs.push('annonce: ' + e.message));
await q.goto('http://localhost:8765/annonce.html'); await q.waitForTimeout(1500);
await q.fill('input[name=code]', code); await q.click('#codeForm button'); await q.waitForTimeout(3500);
// tarifs de lancement par défaut : Plus 29 €/mois ; Haut +33 % ; week-end 3/7 ; 1 mois −23 % → 12,73 € HT
await q.click('[data-new]'); await q.waitForTimeout(400);
await q.fill('[data-k=nom]', A[0]); await q.fill('[data-k=texte]', A[1]);
await q.click('input[name=pack][value=plus]'); await q.waitForTimeout(200);
for (const k of ['a2', 's', 'n']) { await q.check(`[data-band="${k}"]`); await q.waitForTimeout(150); }
await q.click('input[name=per][value=we]'); await q.waitForTimeout(150);
await q.click('input[name=pslot][value=haut]'); await q.waitForTimeout(150);
await q.check('[data-down]');
const est = await q.$eval('.est', (e) => e.innerText);
log('prezzo app: ' + est);
assert(/12[.,]73/.test(est), 'prezzo nell’app = 12,73 € HT');
await q.click('[data-send]'); await q.waitForTimeout(2500);
await relog(p, PASS); await pubTab(p);
const aid = await p.evaluate(() => { const el = document.querySelector('[data-action=pub-ok]'); return el ? el.dataset.id : ''; });
assert(aid, 'annuncio da validare');
const pb = await body(p);
assert(/Planning/.test(pb), 'planning visibile');
assert(/12[.,]73/.test(pb), 'stesso prezzo in centrale');
await act(p, 'pub-ok', { id: aid }); await p.waitForTimeout(2500);
assert(/À encaisser|Da incassare/.test(await body(p)), 'validato → da pagare');
log('errs ' + errs.join(' | ')); await b.close();
