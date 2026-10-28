// Prova della chat ouvrier ↔ centrale (vrai Worker simulé) : WORKER_MJS=… node chat-test.mjs
import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { phone, centralSetup, assert, log } from './harness.mjs';
const b = await chromium.launch(), errs = [];
const W = (p) => p.waitForTimeout(p === undefined ? 600 : 600);
const act = (p, a, d = {}) => p.evaluate(([a, d]) => { const el = document.createElement('button'); el.dataset.action = a; Object.assign(el.dataset, d); el.hidden = true; document.body.append(el); el.click(); el.remove(); }, [a, d]);
const demo = new URL('./shots/demo.json', import.meta.url).pathname;
await writeFile(demo, execFileSync('node', [new URL('./demo-data.mjs', import.meta.url).pathname]));
const c = await phone(b, 'it'), p = await c.newPage(); p.on('pageerror', (e) => errs.push('central: ' + e.message));
await centralSetup(p);
await p.evaluate(() => { location.hash = '#/reglages'; }); await p.waitForTimeout(900);
const [fc] = await Promise.all([p.waitForEvent('filechooser'), act(p, 'import')]);
await fc.setFiles(demo); await p.waitForTimeout(800);
await p.click('#confirm button[type=submit], #confirm .btn.primary'); await p.waitForTimeout(2500);
// app di Luc (w1) e Sofia (w2)
const codes = {};
for (const w of ['w1', 'w2']) {
  await act(p, 'open-interv', { id: w }); await p.waitForTimeout(600); await act(p, 'sheet-tab', { id: 'app' }); await p.waitForTimeout(400);
  await act(p, 'eq-on', { id: w }); await p.waitForTimeout(3500);
  codes[w] = await p.$eval('.sheet [style*="mono"]', (e) => e.textContent.trim());
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);
}
log('codici ' + JSON.stringify(codes));
const eqApp = async (code) => { const cc = await phone(b, 'it'), q = await cc.newPage(); q.on('pageerror', (e) => errs.push('equipe: ' + e.message)); await q.goto('http://localhost:8765/equipe.html'); await q.waitForTimeout(1200); if (!(await q.$('input[name=code]'))) { console.log('ERR', errs, (await q.textContent('body')).slice(0, 300)); } await q.fill('input[name=code]', code); await q.click('form button[type=submit]'); await q.waitForTimeout(3500); return q; };
const q1 = await eqApp(codes.w1);
assert(await q1.$('#chatCard'), 'card chat nell’app squadra');
log('card: ' + (await q1.$eval('#chatCard h2', (e) => e.textContent)));
await q1.fill('#chatForm textarea', 'Ciao centrale, la chiave del 12 non funziona');
await q1.click('#chatForm button[type=submit]'); await q1.waitForTimeout(2500);
assert((await q1.$eval('#chatCard', (e) => e.textContent)).includes('la chiave del 12'), 'messaggio visibile (in invio) nell’app');
// la centrale riceve
for (let k = 0; k < 6; k++) {
  await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); await p.waitForTimeout(2500);
  if (await p.evaluate(() => document.body.textContent.includes('nuovo messaggio') || document.body.textContent.includes('nouveau message'))) break;
}
await p.evaluate(() => { location.hash = '#/dashboard'; }); await p.waitForTimeout(1200);
const home = await p.evaluate(() => document.body.textContent);
assert(/messaggio|message/.test(home) && home.includes('Luc'), 'avviso in Home');
log('avviso Home ok');
await act(p, 'open-eq-chat', { id: 'w1' }); await p.waitForTimeout(900);
assert((await p.$eval('.sheet', (e) => e.textContent)).includes('la chiave del 12'), 'messaggio letto in centrale');
await p.fill('.sheet form[data-form=eq-chat] textarea', 'Ok Luc, passo io con la chiave alle 14');
await p.click('.sheet form[data-form=eq-chat] button[type=submit]'); await p.waitForTimeout(3500);
log('risposta inviata');
// gruppo: solo Sofia (w2), poi messaggio speciale
await act(p, 'eq-group'); await p.waitForTimeout(700);
await p.check('#f input[name=w][value=w2]'); await p.click('button[type=submit][form=f]'); await p.waitForTimeout(1500);
await act(p, 'eq-special'); await p.waitForTimeout(700);
assert(await p.$eval('#f input[value=w2]', (e) => e.checked) && !(await p.$eval('#f input[value=w1]', (e) => e.checked)), 'gruppo pre-spuntato (solo Sofia)');
await p.fill('#f textarea[name=x]', 'Riunione domani alle 8 in ufficio');
await p.click('button[type=submit][form=f]'); await p.waitForTimeout(4000);
log('messaggio speciale inviato');
// Luc vede la risposta, non il messaggio speciale
await q1.reload(); await q1.waitForTimeout(3500);
const t1 = await q1.$eval('#chatCard', (e) => e.textContent);
assert(t1.includes('passo io con la chiave') && t1.includes('la chiave del 12'), 'Luc vede risposta e suo messaggio');
assert(!t1.includes('Riunione domani'), 'Luc NON vede il messaggio speciale');
assert(!t1.includes('invio…'), 'il messaggio di Luc non è più «in invio»');
log('Luc ok');
const q2 = await eqApp(codes.w2);
const t2 = await q2.$eval('#chatCard', (e) => e.textContent);
assert(t2.includes('Riunione domani') && t2.includes('Messaggio speciale'), 'Sofia vede il messaggio speciale');
assert(!t2.includes('passo io con la chiave'), 'Sofia NON vede la chat di Luc');
log('Sofia ok');
await q1.screenshot({ path: new URL('./shots/chat-eq.png', import.meta.url).pathname, fullPage: false });
await q1.evaluate(() => document.getElementById('chatCard').scrollIntoView()); await q1.screenshot({ path: new URL('./shots/chat-eq.png', import.meta.url).pathname });
await p.screenshot({ path: new URL('./shots/chat-central.png', import.meta.url).pathname });
console.log('ERRORS', errs.length ? errs : 'none');
await b.close();
