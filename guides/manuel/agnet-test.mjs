// Fiche Agence / Propriétaire ↔ sa centrale du réseau : lien automatique, « Activer sa centrale » — WORKER_MJS=… node agnet-test.mjs
import { chromium } from 'playwright';
import { phone, centralSetup, assert, log, store } from './harness.mjs';
const b = await chromium.launch(), errs = [];
const act = (p, a, d = {}) => p.evaluate(([a, d]) => { const el = document.createElement('button'); el.dataset.action = a; Object.assign(el.dataset, d); el.hidden = true; document.body.append(el); el.click(); el.remove(); }, [a, d]);
const c = await phone(b, 'fr', { width: 1100, height: 900 }), p = await c.newPage(); p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
await centralSetup(p);
assert(await p.$('[data-to=reseau]'), 'Réseau nel menu');
// centrale déjà créée côté réseau
await p.evaluate(() => { location.hash = '#/reseau'; }); await p.waitForTimeout(1200);
await act(p, 'net-new'); await p.waitForTimeout(600);
await p.selectOption('#f [name=fil]', 'proprio'); await p.fill('#f [name=nom]', 'Ares Invest S.A.');
assert(!(await p.$eval('#f .net-proprio', (e) => e.hidden)), 'proprietario: «Qui est-ce ?» visibile');
await p.click('#f [name=loueur][value=sous]'); await p.waitForTimeout(200);
await p.fill('#f [name=realOwner]', 'Jean Dupont');
await p.click('button[type=submit][form=f]'); await p.waitForTimeout(3000);
const tid0 = await p.evaluate(() => { const el = document.querySelector('.sheet [data-input=net-bail]'); return el ? el.dataset.id : ''; });
const sh0 = await p.$eval('.sheet', (e) => e.innerText);
assert(/Jean Dupont/.test(sh0) && /bail manquant/.test(sh0) && tid0, 'scheda: proprietario reale + ⚠️ bail manquant');
await p.setInputFiles(`.sheet [data-input=net-bail][data-id="${tid0}"]`, '/tmp/claude-0/-home-user-luxinterventions-com/8ca9f513-906b-59c7-ab95-4bf4a371e616/scratchpad/leak.jpg'); await p.waitForTimeout(4500);
log('toasts: ' + (await p.evaluate(() => [...document.querySelectorAll('.toast')].map((x) => x.textContent).join(' | '))) + ' apres: ' + (await p.$eval('.sheet', (e) => e.innerText)).slice(0, 300).replace(/\n/g, ' / ') + ' errs ' + errs.join(' | '));
assert(/📎 Bail/.test(await p.$eval('.sheet', (e) => e.innerText)) && !/bail manquant/.test(await p.$eval('.sheet', (e) => e.innerText)), 'bail aggiunto dalla scheda');
await p.keyboard.press('Escape'); await p.waitForTimeout(400); await p.keyboard.press('Escape');
// fiche propriétaire du même nom → reliée toute seule
const mk = async (nom) => { await p.evaluate(() => { location.hash = '#/proprios'; }); await p.waitForTimeout(800); await act(p, 'new-agence'); await p.waitForTimeout(600); await p.fill('#f [name=nom]', nom); await p.fill('#f [name=tel]', '+352 691 000 222'); const bl = await p.$('#f [name=bankLater]'); if (bl) await bl.check(); await p.click('button[type=submit][form=f]'); await p.waitForTimeout(1500); };
await mk('ARES INVEST S.A.'); await mk('PIETRO');
await act(p, 'net-reload'); await p.waitForTimeout(3000);
{ const reg = JSON.parse(Buffer.from(store.get('ares/tenants/' + tid0 + '.json').b).toString());
  assert(reg.sous === true, '🔑 registro: bailleur principal (sottotitolo della sua centrale)');
  const cq = await (await phone(b, 'fr')).newPage(); await cq.goto('http://localhost:8765/centraldomier/?' + tid0); await cq.waitForTimeout(2500);
  const lk = await cq.$eval('#lock', (e) => e.innerText).catch(() => '');
  log('lock cliente: ' + lk.slice(0, 120).replace(/\n/g, ' / ')); }
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
const inv = await p.evaluate(() => decodeURIComponent([...document.querySelectorAll('.sheet a[href*="wa.me"], .sheet a[href^="sms:"], .sheet a[href^="mailto:"]')].map((x) => x.getAttribute('href')).join(' ')));
assert(/centraldomier\/\?[a-z0-9]{12,24}/.test(inv) && /moitié A/.test(inv), 'invito: indirizzo /centraldomier/?numero + spiegazione chiave di soccorso');
const r = await (await c.newPage()).goto('http://localhost:8765/proprietaire.html?t=abc123').then((x) => x.url());
log('redirect → ' + r);
await p.keyboard.press('Escape'); await p.waitForTimeout(400); await p.keyboard.press('Escape'); await p.waitForTimeout(400);
await p.evaluate(() => { location.hash = '#/proprios'; }); await p.waitForTimeout(1000);
await p.evaluate(() => document.querySelectorAll('#view details').forEach((d) => { d.open = true; }));
v = await p.evaluate(() => document.querySelector('#view').innerText);
assert(/PIETRO[\s\S]*?🌐 centrale/.test(v), 'PIETRO: centrale attivata dalla scheda');
log('errs ' + errs.join(' | ')); await b.close();
