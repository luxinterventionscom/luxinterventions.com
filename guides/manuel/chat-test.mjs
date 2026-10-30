// Prova della chat ouvrier ↔ centrale (vrai Worker simulé) : WORKER_MJS=… node chat-test.mjs
import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { phone, centralSetup, assert, log, lg, snap } from './harness.mjs';
const L = lg('it'), M = {
  it: ['Ciao centrale, la chiave del 12 non funziona', 'la chiave del 12', 'Ok Luc, passo io con la chiave alle 14', 'passo io con la chiave', 'Riunione domani alle 8 in ufficio', 'Riunione domani'],
  fr: ['Bonjour la centrale, la clé du 12 ne marche pas', 'la clé du 12', 'Ok Luc, je passe avec la clé à 14 h', 'je passe avec la clé', 'Réunion demain à 8 h au bureau', 'Réunion demain'],
  de: ['Hallo Zentrale, der Schlüssel von Nr. 12 geht nicht', 'Schlüssel von Nr. 12', 'Ok Luc, ich komme um 14 Uhr mit dem Schlüssel', 'komme um 14 Uhr', 'Besprechung morgen um 8 Uhr im Büro', 'Besprechung morgen'],
  en: ['Hello central, the key for no. 12 doesn’t work', 'the key for no. 12', 'Ok Luc, I’ll bring the key at 2 pm', 'bring the key', 'Meeting tomorrow at 8 at the office', 'Meeting tomorrow'],
  pt: ['Olá central, a chave do 12 não funciona', 'a chave do 12', 'Ok Luc, passo com a chave às 14h', 'passo com a chave', 'Reunião amanhã às 8h no escritório', 'Reunião amanhã'],
  es: ['Hola central, la llave del 12 no funciona', 'la llave del 12', 'Ok Luc, paso con la llave a las 14', 'paso con la llave', 'Reunión mañana a las 8 en la oficina', 'Reunión mañana'],
}[L];
const b = await chromium.launch(), errs = [];
const W = (p) => p.waitForTimeout(p === undefined ? 600 : 600);
const act = (p, a, d = {}) => p.evaluate(([a, d]) => { const el = document.createElement('button'); el.dataset.action = a; Object.assign(el.dataset, d); el.hidden = true; document.body.append(el); el.click(); el.remove(); }, [a, d]);
const demo = new URL('./shots/demo.json', import.meta.url).pathname;
await writeFile(demo, execFileSync('node', [new URL('./demo-data.mjs', import.meta.url).pathname]));
const c = await phone(b, L), p = await c.newPage(); p.on('pageerror', (e) => errs.push('central: ' + e.message));
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
const eqApp = async (code) => { const cc = await phone(b, L), q = await cc.newPage(); q.on('pageerror', (e) => errs.push('equipe: ' + e.message)); await q.goto('http://localhost:8765/equipe.html'); await q.waitForTimeout(1200); if (!(await q.$('input[name=code]'))) { console.log('ERR', errs, (await q.textContent('body')).slice(0, 300)); } await q.fill('input[name=code]', code); await q.click('form button[type=submit]'); await q.waitForTimeout(3500); return q; };
const q1 = await eqApp(codes.w1);
assert(await q1.$('#chatCard'), 'card chat nell’app squadra');
log('card: ' + (await q1.$eval('#chatCard h2', (e) => e.textContent)));
await q1.fill('#chatForm textarea', M[0]);
await q1.click('#chatForm button[type=submit]'); await q1.waitForTimeout(2500);
assert((await q1.$eval('#chatCard', (e) => e.textContent)).includes(M[1]), 'messaggio visibile (in invio) nell’app');
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
assert((await p.$eval('.sheet', (e) => e.textContent)).includes(M[1]), 'messaggio letto in centrale');
await p.fill('.sheet form[data-form=eq-chat] textarea', M[2]);
await p.click('.sheet form[data-form=eq-chat] button[type=submit]'); await p.waitForTimeout(3500);
log('risposta inviata');
// gruppo: solo Sofia (w2), poi messaggio speciale
await act(p, 'eq-group'); await p.waitForTimeout(700);
await p.check('#f input[name=w][value=w2]'); await p.click('button[type=submit][form=f]'); await p.waitForTimeout(1500);
await act(p, 'eq-special'); await p.waitForTimeout(700);
assert(await p.$eval('#f input[value=w2]', (e) => e.checked) && !(await p.$eval('#f input[value=w1]', (e) => e.checked)), 'gruppo pre-spuntato (solo Sofia)');
await p.fill('#f textarea[name=x]', M[4]);
await p.click('button[type=submit][form=f]'); await p.waitForTimeout(4000);
log('messaggio speciale inviato');
// Luc vede la risposta, non il messaggio speciale
await q1.reload(); await q1.waitForTimeout(3500);
const t1 = await q1.$eval('#chatCard', (e) => e.textContent);
assert(t1.includes(M[3]) && t1.includes(M[1]), 'Luc vede risposta e suo messaggio');
assert(!t1.includes(M[5]), 'Luc NON vede il messaggio speciale');
assert(!t1.includes('invio…'), 'il messaggio di Luc non è più «in invio»');
log('Luc ok');
const q2 = await eqApp(codes.w2);
const t2 = await q2.$eval('#chatCard', (e) => e.textContent);
assert(t2.includes(M[5]) && t2.includes('Messaggio speciale'), 'Sofia vede il messaggio speciale');
assert(!t2.includes(M[3]), 'Sofia NON vede la chat di Luc');
log('Sofia ok');
await q1.evaluate(() => document.getElementById('chatCard').scrollIntoView()); await snap(q1, 'chat-eq');
await q2.evaluate(() => document.getElementById('chatCard').scrollIntoView()); await snap(q2, 'chat-eq-special');
await p.keyboard.press('Escape'); await p.waitForTimeout(400); await act(p, 'open-eq-chat', { id: 'w1' }); await p.waitForTimeout(900); await snap(p, 'chat-central');
await p.keyboard.press('Escape'); await p.waitForTimeout(400); await act(p, 'eq-special'); await p.waitForTimeout(700); await snap(p, 'chat-special');
console.log('ERRORS', errs.length ? errs : 'none');
await b.close();
