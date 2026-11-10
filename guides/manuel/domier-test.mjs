// 🔧 DOMIER : bandeau + demande dall'app taxi → Maintenance della centrale → stato che torna — WORKER_MJS=… node domier-test.mjs
import { chromium } from 'playwright';
import { phone, centralSetup, assert, log } from './harness.mjs';
const b = await chromium.launch(), errs = [];
const act = (p, a, d = {}) => p.evaluate(([a, d]) => { const el = document.createElement('button'); el.dataset.action = a; Object.assign(el.dataset, d); el.hidden = true; document.body.append(el); el.click(); el.remove(); }, [a, d]);
const body = (p) => p.evaluate(() => document.body.innerText);
const PASS = 'Tr3s-l0ngue-cle!';
const relog = async (p) => { await p.reload(); await p.waitForTimeout(2500); await p.fill('[data-form=unlock] [name=pass]', PASS); await p.click('[data-form=unlock] button[type=submit]'); await p.waitForTimeout(4000); for (let i = 0; i < 3; i++) { const btn = await p.$('dialog[open] .btn.primary, #confirm .btn.primary'); if (!btn) break; await btn.click().catch(() => {}); await p.waitForTimeout(1500); } await p.waitForTimeout(2500); };
const c1 = await phone(b, 'it'), p = await c1.newPage(); p.on('pageerror', (e) => errs.push('central: ' + e.message));
await centralSetup(p);
await p.evaluate(() => { location.hash = '#/taxis'; }); await p.waitForTimeout(900);
await act(p, 'new-txco'); await p.waitForTimeout(500); await p.fill('#f [name=nom]', 'Taxi Démo'); await p.fill('#f [name=tel]', '+352 691 000 040');
const txCode = await p.$eval('#f [name=appCode]', (e) => e.value); await p.click('button[type=submit][form=f]'); await p.waitForTimeout(3000); await p.keyboard.press('Escape');
const ct = await phone(b, 'it'), x = await ct.newPage(); x.on('pageerror', (e) => errs.push('taxi: ' + e.message));
await x.goto('http://localhost:8765/taxi.html'); await x.waitForTimeout(1200); await x.fill('input[name=code]', txCode); await x.click('form button[type=submit]'); await x.waitForTimeout(3500);
const bn = await x.$eval('[data-domier]', (e) => e.innerText).catch(() => '');
assert(/DOMIER/.test(bn) && /riparazioni urgenti/.test(bn) && /LUXINTERVENTION/.test(bn), 'banner DOMIER nell’app taxi: ' + bn.slice(0, 120).replace(/\n/g, ' / '));
assert(await x.$('[data-domier] a[href="tel:+352691423943"]'), '📞 numero LUXINTERVENTION');
await x.click('[data-domier-open]'); await x.waitForTimeout(400);
await x.fill('[data-domier-form] [name=texte]', 'Perdita d’acqua nel garage'); await x.check('[data-domier-form] [name=urg][value=plan]'); await x.waitForTimeout(200);
assert(await x.isVisible('[data-domier-form] [name=date]'), '📅 da programmare → data visibile');
await x.fill('[data-domier-form] [name=date]', new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10)); await x.fill('[data-domier-form] [name=heure]', '09:30');
await x.check('[data-domier-form] [name=kind][value=reg]'); await x.waitForTimeout(200); await x.selectOption('[data-domier-form] [name=svc]', 'menage'); await x.check('[data-domier-form] [name=jours][value="2"]');
await x.fill('[data-domier-form] [name=adresse]', '1, rue du Taxi'); await x.fill('[data-domier-form] [name=acces]', 'chiave alla reception');
await x.click('[data-domier-form] button[type=submit]'); await x.waitForTimeout(2500);
assert(/Grazie, richiesta inviata/.test(await x.$eval('[data-domier]', (e) => e.innerText)), 'taxi: richiesta inviata');
await relog(p); await p.waitForTimeout(3000);
await p.evaluate(() => { location.hash = '#/maintenance'; }); await p.waitForTimeout(1500);
const mb = await body(p);
assert(/DOMIER 📅 🔁 — Taxi Démo : Perdita/.test(mb), 'centrale: intervento DOMIER in Maintenance');
await p.waitForTimeout(4000);
await x.reload(); await x.waitForTimeout(4000);
const bn2 = await x.$eval('[data-domier]', (e) => e.innerText).catch(() => '');
assert(/Le mie richieste/.test(bn2) && /presa in carico/.test(bn2), 'taxi: stato della richiesta tornato: ' + bn2.slice(-120).replace(/\n/g, ' / '));
// 🧾 intervento fatto → fattura DOMIER → nell'app taxi con QR → «Ho pagato» → la centrale lo vede
await act(p, 'fact-set'); await p.waitForTimeout(700);
for (const [k, v] of [['nom', 'ARES INVEST S.A.'], ['adresse', '1, rue Démo'], ['ville', 'L-1000 Luxembourg'], ['rcs', 'B999999'], ['tva', 'LU99999999'], ['iban', 'LU28 0019 4006 4475 0000'], ['bic', 'BCEELULL']]) { if (await p.$(`#f [name=${k}]`)) await p.fill(`#f [name=${k}]`, v); }
await p.click('button[type=submit][form=f]'); await p.waitForTimeout(1500);
await p.evaluate(() => { location.hash = '#/maintenance'; }); await p.waitForTimeout(1200);
const tid2 = await p.$$eval('[data-action=edit-tache]', (els) => { const e = els.find((x) => /DOMIER/.test(x.textContent)); return e ? e.dataset.id : ''; });
assert(tid2, 'id intervento DOMIER');
await act(p, 'tache-done', { id: tid2 }); await p.waitForTimeout(1500); for (let k = 0; k < 2; k++) { const c = await p.$('#confirm[open] .btn.primary'); if (c) { await c.click(); await p.waitForTimeout(1200); } }
await p.keyboard.press('Escape'); await p.waitForTimeout(400);
await act(p, 'fact-open', { id: tid2 }); await p.waitForTimeout(900);
await p.fill('#f [name=h]', '2'); await p.fill('#f [name=taux]', '50');
await act(p, 'fact-emit', { id: tid2 }); await p.waitForTimeout(700); await p.click('#confirm .btn.primary'); await p.waitForTimeout(4000);
const fs = await p.$eval('.sheet', (e) => e.innerText).catch(() => '');
assert(/(Facture|Fattura) \d{8}-INT/.test(fs), 'fattura DOMIER emessa: ' + fs.slice(0, 80).replace(/\n/g, ' / '));
await p.keyboard.press('Escape'); await p.waitForTimeout(5000);
await x.reload(); await x.waitForTimeout(4500);
const bn3 = await x.$eval('[data-domier]', (e) => e.innerText).catch(() => '');
assert(/Fattura \d{8}-INT/.test(bn3) && await x.$('[data-domier] svg') && await x.$('[data-domier-paid]'), 'taxi: fattura con QR e «Ho pagato»: ' + bn3.slice(-200).replace(/\n/g, ' / '));
await x.click('[data-domier-paid]'); await x.waitForTimeout(2000);
assert(/pagamento segnalato/.test(await x.$eval('[data-domier]', (e) => e.innerText)), 'taxi: pagamento segnalato');
await relog(p); await p.waitForTimeout(3000);
await act(p, 'fact-open', { id: tid2 }); await p.waitForTimeout(900);
assert(/dit avoir payé|dice di aver pagato|avoir payé/i.test(await p.$eval('.sheet', (e) => e.innerText)), 'centrale: «il cliente dice di aver pagato»');
// app operai: niente banner (sono loro i DOMIER)
log('errs ' + errs.join(' | ')); await b.close();
