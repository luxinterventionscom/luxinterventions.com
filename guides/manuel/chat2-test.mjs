// Prova chat: 🔒 privato, spunte ✓/✓✓/✓✓ blu, modifica / elimina (casa + operai) — WORKER_MJS=… node chat2-test.mjs
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
const app = async (url, code, who) => {
  const cc = await phone(b, 'it'), q = await cc.newPage(); q.on('pageerror', (e) => errs.push(who + ': ' + e.message)); q.on('dialog', (d) => d.accept());
  await q.goto('http://localhost:8765' + url); await q.waitForTimeout(1200);
  await q.fill('input[name=code]', code); await q.click('form button[type=submit]'); await q.waitForTimeout(3500);
  return q;
};
const tenant = async (code, who) => {
  const q = await app('/espace.html', code, who);
  if (await q.$('[data-rules-ok]')) { await q.click('[data-rules-ok]'); await q.waitForTimeout(1200); }
  await q.evaluate(() => { const d = document.querySelector('details[data-fold=chat]'); if (d) d.open = true; });
  return q;
};
const chatTxt = (q) => q.$eval('#chat', (e) => e.textContent);
const refresh = async (q) => { await q.click('[data-chat-refresh]'); await q.waitForTimeout(1500); };
const anna = await tenant(codes.lc1, 'anna'), paulo = await tenant(codes.lc2, 'paulo');
assert(await anna.$('#chatf'), 'chat della casa nell’app di Anna');
assert(await anna.$('#chatf input[name=pv]'), 'interruttore 🔒 Privato');
// 1. messaggio pubblico + messaggio privato
await anna.fill('#chatf textarea', 'Ciao a tutti, stasera lavatrice libera?'); await anna.click('#chatf button[type=submit]'); await anna.waitForTimeout(1500);
await anna.fill('#chatf textarea', 'Segreto: il vicino fa rumore la notte'); await anna.check('#chatf input[name=pv]'); await anna.click('#chatf button[type=submit]'); await anna.waitForTimeout(1500);
let ta = await chatTxt(anna);
assert(ta.includes('lavatrice') && ta.includes('Segreto') && ta.includes('🔒 privato'), 'Anna vede i suoi 2 messaggi, uno 🔒');
assert(!(await anna.$('#chat .tk.rd')), 'nessuna spunta blu prima della lettura');
await refresh(paulo);
let tp = await chatTxt(paulo);
assert(tp.includes('lavatrice') && !tp.includes('Segreto'), 'Paulo vede il pubblico, NON il privato');
log('privato invisibile agli altri');
// 2. la centrale legge (✓✓ blu) e risponde in privato
await act(p, 'open-imm', { id: 'im1' }); await p.waitForTimeout(600); await act(p, 'sheet-tab', { id: 'chat' }); await p.waitForTimeout(800);
await act(p, 'chat-refresh', { id: 'im1' }); await p.waitForTimeout(5000);
const cs = await p.$eval('.sheet', (e) => e.textContent);
if (!cs.includes('Segreto')) console.log('SHEET', cs.slice(0, 1500), errs);
assert(cs.includes('Segreto') && await p.$('.sheet .bub.pv'), 'la centrale legge il privato');
await act(p, 'chat-reply-priv', { id: await p.$eval('select[name=to]', (e) => e.dataset.gid), loc: 'lc1' }); await p.waitForTimeout(300);
await p.fill('.sheet form[data-form=chatpost] textarea', 'Grazie Anna, ne parlo io col vicino');
await p.click('.sheet form[data-form=chatpost] button[type=submit]'); await p.waitForTimeout(5000);
await refresh(anna); ta = await chatTxt(anna);
assert(ta.includes('ne parlo io col vicino'), 'Anna riceve la risposta privata');
assert(await anna.$('#chat .tk.rd'), 'Anna vede ✓✓ blu (letto dalla centrale)');
await refresh(paulo); tp = await chatTxt(paulo);
assert(!tp.includes('vicino'), 'Paulo NON vede la risposta privata');
log('risposta privata + spunte blu');
// 3. Paulo modifica il suo messaggio, poi lo rende privato; Anna elimina il suo pubblico
await paulo.fill('#chatf textarea', 'Domani passa il tecnico'); await paulo.click('#chatf button[type=submit]'); await paulo.waitForTimeout(1500);
const pid = await paulo.$eval('#chat .bub.me:last-of-type [data-cmenu]', (e) => e.dataset.cmenu);
await paulo.click(`[data-cmenu="${pid}"]`); await paulo.waitForTimeout(200);
await paulo.click(`[data-cop=edit][data-id="${pid}"]`); await paulo.waitForTimeout(200);
assert(await paulo.$eval('#chatEd', (e) => !e.hidden), 'barra «stai modificando»');
await paulo.fill('#chatf textarea', 'Domani alle 9 passa il tecnico'); await paulo.click('#chatf button[type=submit]'); await paulo.waitForTimeout(1500);
tp = await chatTxt(paulo);
assert(tp.includes('alle 9') && tp.includes('modificato'), 'messaggio modificato con «modificato»');
await refresh(anna); ta = await chatTxt(anna);
assert(ta.includes('alle 9') && !ta.includes('Domani passa il tecnico'), 'Anna vede solo la nuova versione');
await paulo.click(`[data-cmenu="${pid}"]`); await paulo.waitForTimeout(200);
await paulo.click(`[data-cop=priv][data-id="${pid}"]`); await paulo.waitForTimeout(1500);
await refresh(anna); ta = await chatTxt(anna);
assert(!ta.includes('tecnico'), 'reso privato: sparito per Anna');
const aid = await anna.$$eval('#chat [data-cmenu]', (els) => els[0].dataset.cmenu);
await anna.click(`[data-cmenu="${aid}"]`); await anna.waitForTimeout(200);
await anna.click(`[data-cop=del][data-id="${aid}"]`); await anna.waitForTimeout(1500);
ta = await chatTxt(anna);
assert(!ta.includes('lavatrice'), 'Anna ha eliminato il suo messaggio');
await refresh(paulo); tp = await chatTxt(paulo);
assert(!tp.includes('lavatrice'), 'eliminato anche per Paulo');
// 4. la centrale vede la versione precedente; il fil viene ripulito
await act(p, 'chat-refresh', { id: 'im1' }); await p.waitForTimeout(6000);
const cs2 = await p.$eval('.sheet', (e) => e.textContent);
assert(cs2.includes('alle 9') && (await p.$('.sheet .bub-old')) && cs2.includes('Domani passa il tecnico'), 'la centrale vede il testo di prima');
log('modifica / privato / elimina ok');
// 5. operai: spunte + modifica
await act(p, 'open-interv', { id: 'w1' }); await p.waitForTimeout(600); await act(p, 'sheet-tab', { id: 'app' }); await p.waitForTimeout(400);
await act(p, 'eq-on', { id: 'w1' }); await p.waitForTimeout(3500);
const wcode = await p.$eval('.sheet [style*="mono"]', (e) => e.textContent.trim());
await p.keyboard.press('Escape'); await p.waitForTimeout(400);
const luc = await app('/equipe.html', wcode, 'luc');
await luc.fill('#chatForm textarea', 'La chiave del 12 non va'); await luc.click('#chatForm button[type=submit]'); await luc.waitForTimeout(2500);
assert((await luc.$eval('#chatCard', (e) => e.innerHTML)).includes('class="tk"'), 'operaio: ✓ inviato');
// la centrale rilegge la posta ogni 3 min : avanziamo l'orologio della pagina
const inbox = async () => { await p.evaluate(() => { const o = Date.now; Date.now = () => o() + 181000; }); await p.waitForTimeout(36000); };
await inbox();
await luc.reload(); await luc.waitForTimeout(3500);
let lt = await luc.$eval('#chatCard', (e) => e.innerHTML);
assert(lt.includes('✓✓') && !lt.includes('tk rd'), 'operaio: ✓✓ grigio (arrivato)');
if (!(await luc.$('#chatCard [data-emenu]'))) console.log('LUC', lt);
const mid = await luc.$eval('#chatCard [data-emenu]', (e) => e.dataset.emenu);
await luc.click(`[data-emenu="${mid}"]`); await luc.waitForTimeout(300);
await luc.click(`[data-eop=edit][data-id="${mid}"]`); await luc.waitForTimeout(300);
await luc.fill('#chatForm textarea', 'La chiave del 12 non va, porta quella nuova'); await luc.click('#chatForm button[type=submit]'); await luc.waitForTimeout(2500);
assert((await luc.$eval('#chatCard', (e) => e.textContent)).includes('quella nuova'), 'operaio: modifica visibile subito');
await inbox();
await act(p, 'open-eq-chat', { id: 'w1' }); await p.waitForTimeout(4000);
const ec = await p.$eval('.sheet', (e) => e.textContent);
assert(ec.includes('quella nuova') && await p.$('.sheet .bub-old'), 'centrale: messaggio operaio modificato + versione prima');
await luc.reload(); await luc.waitForTimeout(3500);
lt = await luc.$eval('#chatCard', (e) => e.innerHTML);
assert(lt.includes('tk rd') && lt.includes('modificato'), 'operaio: ✓✓ blu (letto) + «modificato»');
log('chat operai ok');
console.log('ERRORS', errs.length ? errs : 'none');
await b.close();
