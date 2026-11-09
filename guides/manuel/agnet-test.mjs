// Fiche Agence / Propriétaire ↔ sa centrale du réseau : lien automatique, « Activer sa centrale » — WORKER_MJS=… node agnet-test.mjs
import { chromium } from 'playwright';
import { phone, centralSetup, assert, log } from './harness.mjs';
const b = await chromium.launch(), errs = [];
const act = (p, a, d = {}) => p.evaluate(([a, d]) => { const el = document.createElement('button'); el.dataset.action = a; Object.assign(el.dataset, d); el.hidden = true; document.body.append(el); el.click(); el.remove(); }, [a, d]);
const c = await phone(b, 'fr', { width: 1100, height: 900 }), p = await c.newPage(); p.on('pageerror', (e) => errs.push(e.message));
await centralSetup(p);
assert(await p.$('[data-to=reseau]'), 'Réseau nel menu');
// centrale déjà créée côté réseau
await p.evaluate(() => { location.hash = '#/reseau'; }); await p.waitForTimeout(1200);
await act(p, 'net-new'); await p.waitForTimeout(600);
await p.selectOption('#f [name=fil]', 'proprio'); await p.fill('#f [name=nom]', 'Ares Invest S.A.');
await p.click('button[type=submit][form=f]'); await p.waitForTimeout(3000); await p.keyboard.press('Escape'); await p.waitForTimeout(400); await p.keyboard.press('Escape');
// fiche propriétaire du même nom → reliée toute seule
const mk = async (nom) => { await p.evaluate(() => { location.hash = '#/proprios'; }); await p.waitForTimeout(800); await act(p, 'new-agence'); await p.waitForTimeout(600); await p.fill('#f [name=nom]', nom); const bl = await p.$('#f [name=bankLater]'); if (bl) await bl.check(); await p.click('button[type=submit][form=f]'); await p.waitForTimeout(1500); };
await mk('ARES INVEST S.A.'); await mk('PIETRO');
await act(p, 'net-reload'); await p.waitForTimeout(3000);
await p.evaluate(() => { location.hash = '#/proprios'; }); await p.waitForTimeout(1000);
await p.evaluate(() => document.querySelectorAll('#view details').forEach((d) => { d.open = true; }));
let v = await p.evaluate(() => document.querySelector('#view').innerText);
assert(/ARES INVEST S\.A\.[\s\S]*?🌐 centrale/.test(v), 'ARES collegata da sola (stesso nome)');
assert(/PIETRO[\s\S]*?pas de centrale/.test(v), 'PIETRO senza centrale');
// activer depuis la fiche de PIETRO
const pid = await p.evaluate(() => [...document.querySelectorAll('[data-action=edit-agence]')].find((e) => /PIETRO/.test(e.textContent)).dataset.id);
await act(p, 'edit-agence', { id: pid }); await p.waitForTimeout(1000);
assert(/Sa centrale/.test(await p.$eval('#f', (e) => e.innerText)), 'scheda: sezione 🌐 Sa centrale');
await p.click('[data-action=ag-net-on]'); await p.waitForTimeout(600); await p.click('#confirm button[type=submit], #confirm .btn.primary'); await p.waitForTimeout(4000);
const sheet = await p.$eval('.sheet', (e) => e.innerText).catch(() => '');
log('dopo attivazione: ' + sheet.slice(0, 160).replace(/\n/g, ' / '));
await p.keyboard.press('Escape'); await p.waitForTimeout(400); await p.keyboard.press('Escape'); await p.waitForTimeout(400);
await p.evaluate(() => { location.hash = '#/proprios'; }); await p.waitForTimeout(1000);
await p.evaluate(() => document.querySelectorAll('#view details').forEach((d) => { d.open = true; }));
v = await p.evaluate(() => document.querySelector('#view').innerText);
assert(/PIETRO[\s\S]*?🌐 centrale/.test(v), 'PIETRO: centrale attivata dalla scheda');
log('errs ' + errs.join(' | ')); await b.close();
