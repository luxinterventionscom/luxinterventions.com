// 🚕 2b : pays / ville / licence / commission (centrale taxi, société), identifiant du chauffeur, commissions du mois, 🏆 chauffeur & taxi, pas de 🌐 — WORKER_MJS=… node taxi2b-test.mjs
import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { phone, centralSetup, assert, log } from './harness.mjs';
const b = await chromium.launch(), errs = [];
const act = (p, a, d = {}) => p.evaluate(([a, d]) => { const el = document.createElement('button'); el.dataset.action = a; Object.assign(el.dataset, d); el.hidden = true; document.body.append(el); el.click(); el.remove(); }, [a, d]);
const body = (p) => p.evaluate(() => document.querySelector('#view').innerText);
const st = JSON.parse(execFileSync('node', [new URL('./demo-data.mjs', import.meta.url).pathname]).toString());
st.intervenants.w3.metier = 'chauffeur'; st.hotes = {};
const demo = new URL('./shots/demo-2b.json', import.meta.url).pathname; await writeFile(demo, JSON.stringify(st));
const p = await (await phone(b, 'fr', { width: 1000, height: 900 })).newPage(); p.on('pageerror', (e) => errs.push(e.message));
await centralSetup(p);
await p.evaluate(() => { location.hash = '#/reglages'; }); await p.waitForTimeout(900);
const [fc] = await Promise.all([p.waitForEvent('filechooser'), act(p, 'import')]); await fc.setFiles(demo); await p.waitForTimeout(800); await p.click('#confirm button[type=submit], #confirm .btn.primary'); await p.waitForTimeout(2500);
// centrale taxi du réseau : pays, ville, licence, commission
await p.evaluate(() => { location.hash = '#/reseau'; }); await p.waitForTimeout(1200);
await act(p, 'net-new'); await p.waitForTimeout(600);
await p.selectOption('#f [name=fil]', 'taxi'); await p.waitForTimeout(200);
assert(await p.$eval('#f .net-taxi', (e) => !e.hidden), 'bloc taxi visible');
await p.fill('#f [name=nom]', 'Taxi Milano'); await p.fill('#f [name=tel]', '+39 333 000 000'); await p.fill('#f [name=pays]', 'IT'); await p.fill('#f [name=ville]', 'Milano'); await p.fill('#f [name=licence]', 'MI-12345');
await p.click('button[type=submit][form=f]'); await p.waitForTimeout(3000); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
await p.evaluate(() => { location.hash = '#/reseau'; }); await p.waitForTimeout(1500);
assert(/🌍 Milano/.test(await body(p)), 'Licences : 🌍 Milano');
// chauffeur : identifiant
await act(p, 'edit-interv', { id: 'w3' }); await p.waitForTimeout(800);
if (!(await p.$('#f [name=ident]'))) { await act(p, 'open-interv', { id: 'w3' }); await p.waitForTimeout(600); await act(p, 'sheet-tab', { id: 'fiche' }); await p.waitForTimeout(500); }
const hasIdent = await p.$('#f [name=ident]'); log('ident field ' + !!hasIdent);
if (hasIdent) { await p.fill('#f [name=ident]', 'CH-777'); await p.click('button[type=submit][form=f]'); await p.waitForTimeout(1500); }
await p.keyboard.press('Escape'); await p.waitForTimeout(300);
// société + course donnée par nous → commission
await act(p, 'new-txco'); await p.waitForTimeout(600); await p.fill('#f [name=nom]', 'Taxi Démo'); await p.fill('#f [name=tel]', '+352 40 40 40');
assert(await p.$('#f [name=comV]'), 'société : commission'); await p.click('button[type=submit][form=f]'); await p.waitForTimeout(2500); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
await act(p, 'course-new'); await p.waitForTimeout(600); await p.fill('#f [name=from]', 'Gare'); await p.fill('#f [name=to]', 'Findel'); await p.fill('#f [name=prix]', '30');
await p.click('button[type=submit][form=f]'); await p.waitForTimeout(2000);
await p.evaluate(() => { location.hash = '#/taxis'; }); await p.waitForTimeout(1200);
const cid = await p.evaluate(() => document.querySelector('[data-action=course-open]').dataset.id);
await act(p, 'course-open', { id: cid }); await p.waitForTimeout(700); await p.selectOption('#f [name=co]', 'Taxi Démo'); await p.click('button[type=submit][form=f]'); await p.waitForTimeout(2000);
await act(p, 'tache-done', { id: cid }); await p.waitForTimeout(1500); if (await p.$('.sheet[open]')) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
await p.evaluate(() => { location.hash = '#/taxis'; }); await p.waitForTimeout(1200);
const v = await body(p); log(v.match(/Commissions[\s\S]{0,120}/)?.[0]?.replace(/\n/g, ' / '));
assert(/Taxi Démo/.test(v) && /3,00 €/.test(v), 'commissions : Taxi Démo 3,00 €');
await act(p, 'fact-set'); await p.waitForTimeout(700); await p.fill('#f [name=iban]', 'LU28 0019 4006 4475 0000'); await p.click('button[type=submit][form=f]'); await p.waitForTimeout(1500); if (await p.$('.sheet[open]')) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 15000 }), (async () => { await act(p, 'com-bill', { k: 'co:Taxi Démo' }); await p.waitForTimeout(700); await p.click('#confirm .btn.primary, #confirm button[type=submit]'); })()]);
log('pdf ' + dl.suggestedFilename()); assert(/COM/.test(dl.suggestedFilename()), 'facture de commissions');
await p.evaluate(() => { location.hash = '#/champdrv'; }); await p.waitForTimeout(1200);
assert(/Taxi Démo/.test(await body(p)), '🏆 Taxi de l’année');
await act(p, 'open-eq-chat', { id: 'w3' }); await p.waitForTimeout(900);
assert(!(await p.$('[data-trpick]')), 'chat : pas de 🌐 à part');
log('errs ' + errs.join(' | ')); await b.close();
