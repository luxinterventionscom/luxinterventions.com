// Candidature « Je cherche du travail » : app locataire → centrale (chiffrée), CV, créer l’ouvrier — WORKER_MJS=… node job-test.mjs
import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { phone, centralSetup, assert, log } from './harness.mjs';
const b = await chromium.launch(), errs = [];
const act = (p, a, d = {}) => p.evaluate(([a, d]) => { const el = document.createElement('button'); el.dataset.action = a; Object.assign(el.dataset, d); el.hidden = true; document.body.append(el); el.click(); el.remove(); }, [a, d]);
const demo = new URL('./shots/demo.json', import.meta.url).pathname;
const db = JSON.parse(execFileSync('node', [new URL('./demo-data.mjs', import.meta.url).pathname]));
db.locataires.lc2.logId = 'lg1'; // Anna e Paulo nello stesso appartamento → un fil comune
await writeFile(demo, JSON.stringify(db));
const c = await phone(b, 'it', { width: 1100, height: 900 }), p = await c.newPage(); p.on('pageerror', (e) => errs.push('central: ' + e.message));
p.on('dialog', (d) => d.accept());
await centralSetup(p);
await p.evaluate(() => { location.hash = '#/reglages'; }); await p.waitForTimeout(900);
const [fc] = await Promise.all([p.waitForEvent('filechooser'), act(p, 'import')]);
await fc.setFiles(demo); await p.waitForTimeout(800);
await p.click('#confirm button[type=submit], #confirm .btn.primary'); await p.waitForTimeout(2500);
const codes = {};
for (const l of ['lc1', 'lc2']) {
  await act(p, 'open-loc', { id: l }); await p.waitForTimeout(500); await act(p, 'sheet-tab', { id: 'espace' }); await p.waitForTimeout(400);
  await act(p, 'esp-on', { id: l }); await p.waitForTimeout(4000);
  codes[l] = await p.$eval('.sheet [style*="mono"]', (e) => e.textContent.trim());
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);
}
await p.waitForTimeout(4000);
log('codici ' + JSON.stringify(codes));
await act(p, 'net-reload'); await p.waitForTimeout(3000); // clé publique de la centrale publiée
const cc = await phone(b, 'it'), q = await cc.newPage(); q.on('pageerror', (e) => errs.push('app: ' + e.message));
await q.goto('http://localhost:8765/espace.html'); await q.waitForTimeout(1200);
await q.fill('input[name=code]', codes.lc1); await q.click('form button[type=submit]'); await q.waitForTimeout(4500);
if (await q.$('[data-rules-ok]')) { await q.click('[data-rules-ok]'); await q.waitForTimeout(1500); }
await q.evaluate(() => { for (const d of document.querySelectorAll('details[data-fold=tools], details[data-job]')) d.open = true; });
assert(await q.$('#jobf'), 'modulo «Cerco lavoro» nell’app');
await q.check('#jobf [name=met][value=plombier]'); await q.check('#jobf [name=disp][value=appel]');
await q.click('#jobf [name=outils][value=non]'); await q.check('#jobf [name=valise]');
await q.fill('#jobf [name=tarif]', '25'); await q.fill('#jobf [name=nom]', 'Mario Rossi'); await q.fill('#jobf [name=tel]', '+352 691 000 111');
await q.setInputFiles('#jobf [name=cv]', '/tmp/claude-0/-home-user-luxinterventions-com/8ca9f513-906b-59c7-ab95-4bf4a371e616/scratchpad/leak.jpg');
await q.check('#jobf [name=age]'); await q.check('#jobf [name=rgpd]');
await q.click('#jobf button[type=submit]'); await q.waitForTimeout(3500);
await q.evaluate(() => { for (const d of document.querySelectorAll('details[data-job]')) d.open = true; });
const jt = await q.$eval('[data-job]', (e) => e.innerText).catch(() => 'NONE'); log('job: ' + jt.slice(0, 300).replace(/\n/g, ' / ') + ' errs ' + errs.join(' | '));
assert(/teniamo al corrente/.test(jt), 'app: «Grazie, ti teniamo al corrente»');
await act(p, 'net-reload'); await p.waitForTimeout(5000);
await act(p, 'cand-list'); await p.waitForTimeout(800);
const t1 = await p.$eval('.sheet', (e) => e.innerText);
assert(/Mario Rossi/.test(t1) && /CV/.test(t1), 'centrale: candidato con CV ' + t1.slice(0, 200));
const cid = await p.$eval('[data-action=cand-open]', (e) => e.dataset.id);
await act(p, 'cand-open', { id: cid }); await p.waitForTimeout(800);
const t2 = await p.$eval('.sheet', (e) => e.innerText);
assert(/valise|valigia/i.test(t2) && /25 € \/ h/.test(t2), 'scheda: valigia + tariffa');
await act(p, 'cand-ouvrier', { id: cid }); await p.waitForTimeout(800);
assert(await p.$eval('#f [name=prenom]', (e) => e.value) === 'Mario' && (await p.$eval('#f [name=tel]', (e) => e.value)).includes('691'), '➕ Créer l’ouvrier: scheda già riempita');
await p.keyboard.press('Escape'); await p.waitForTimeout(400); await p.keyboard.press('Escape'); await p.waitForTimeout(400);
// ritiro dal telefono
q.on('dialog', (d) => d.accept());
await q.click('[data-job-del]'); await q.waitForTimeout(3000);
await act(p, 'net-reload'); await p.waitForTimeout(5000);
await act(p, 'cand-list'); await p.waitForTimeout(800);
assert(!/Mario Rossi/.test(await p.$eval('.sheet', (e) => e.innerText)), 'ritirata dal telefono → cancellata in centrale');
log('errs ' + errs.join(' | ')); await b.close();
