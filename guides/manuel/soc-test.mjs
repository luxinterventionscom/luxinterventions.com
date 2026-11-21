// MASTER : «Associés & TVA» senza firma + timbro; identità = 🧾 Facturation — WORKER_MJS=… node soc-test.mjs
import { chromium } from 'playwright';
import { phone, centralSetup, assert, log } from './harness.mjs';
const b = await chromium.launch(), errs = [];
const c1 = await phone(b, 'it', { width: 1000, height: 900 }), p = await c1.newPage(); p.on('pageerror', (e) => errs.push('central: ' + e.message));
await centralSetup(p);
await p.evaluate(() => { location.hash = '#/reglages'; }); await p.waitForTimeout(1500);
await p.click('[data-action=open-societe]'); await p.waitForTimeout(800);
const t = await p.evaluate(() => document.querySelector('.sheet, [role=dialog]')?.innerText || document.body.innerText);
assert(!(await p.$('#signWrap')) && !/Signature \+ timbre|Firma \+ timbro/i.test(t), 'niente firma + timbro nella MASTER');
assert(!(await p.$('#f [name=nom]')) && !(await p.$('#f [name=iban]')), 'niente nome/IBAN da riempire: vengono da 🧾 Facturation');
assert(await p.$('#f [data-action=fact-set]'), 'bottone 🧾 Facturation');
await p.fill('#f [name=an0]', 'A'); await p.fill('#f [name=ap0]', '60'); await p.fill('#f [name=an1]', 'B'); await p.fill('#f [name=ap1]', '40');
await p.click('button[type=submit][form=f]'); await p.waitForTimeout(1200);
const m = await p.evaluate(() => document.body.innerText);
assert(/A 60%, B 40%/.test(m), 'associés salvati');
log('MASTER: scheda semplice, identità dalla Facturation');
console.log('ERRORS', errs.length ? errs : 'none');
await b.close();
