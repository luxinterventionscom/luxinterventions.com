// Captures d'écran du manuel, dans une langue : LANG=fr WORKER_MJS=/chemin/worker.mjs node shots.mjs
// Données d'exemple neutres (demo-data.mjs), vrai Worker avec un stockage simulé (harness.mjs), téléphone 400 × 860.
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { phone, centralSetup, store, neutral } from './harness.mjs';
const lang = process.env.LANG_M || 'fr';
// petits textes saisis pendant les captures, dans la langue du manuel
const TX = {
  fr: ['Menu du jour', 'Entrée + plat 18 €', 'Fuite d’eau, salle de bain', 'Eau sous la baignoire depuis ce matin.'],
  it: ['Menu del giorno', 'Antipasto + piatto 18 €', 'Perdita d’acqua, bagno', 'Acqua sotto la vasca da stamattina.'],
  de: ['Tagesmenü', 'Vorspeise + Hauptgericht 18 €', 'Wasserleck, Badezimmer', 'Wasser unter der Badewanne seit heute Morgen.'],
  en: ['Menu of the day', 'Starter + main 18 €', 'Water leak, bathroom', 'Water under the bathtub since this morning.'],
  pt: ['Menu do dia', 'Entrada + prato 18 €', 'Fuga de água, casa de banho', 'Água debaixo da banheira desde esta manhã.'],
  es: ['Menú del día', 'Entrante + plato 18 €', 'Fuga de agua, baño', 'Agua bajo la bañera desde esta mañana.'],
}[lang];
const OUT = new URL(`./shots/${lang}/`, import.meta.url).pathname;
await mkdir(OUT, { recursive: true });
const demo = new URL('./shots/demo.json', import.meta.url).pathname;
await writeFile(demo, execFileSync('node', [new URL('./demo-data.mjs', import.meta.url).pathname]));
const b = await chromium.launch();
const errors = [];
const watch = (p, who) => p.on('pageerror', (e) => errors.push(`${who}: ${e.message}`));
const wait = (p, ms = 700) => p.waitForTimeout(ms);
const shot = async (p, name, opts = {}) => { await wait(p, opts.wait || 500); await p.addStyleTag({ content: '#toasts{display:none!important}' }).catch(() => {}); await neutral(p); await p.screenshot({ path: OUT + name + '.jpg', type: 'jpeg', quality: 78, fullPage: !!opts.full }); console.log('📸', name); };
const go = async (p, route) => { await p.evaluate((r) => { location.hash = '#/' + r; }, route); await wait(p, 900); await p.evaluate(() => scrollTo(0, 0)); };
// déclenche une action de la central comme un toucher sur un bouton
const act = (p, action, data = {}) => p.evaluate(([a, d]) => { const el = document.createElement('button'); el.dataset.action = a; Object.assign(el.dataset, d); el.hidden = true; document.body.append(el); el.click(); el.remove(); }, [action, data]);
const closeSheet = async (p) => { await p.keyboard.press('Escape'); await wait(p, 400); };
const sheetScroll = (p, sel) => p.evaluate((s) => { const el = document.querySelector(s); if (el) el.scrollIntoView({ block: 'start' }); }, sel);

// ── central principale ──
const ctx = await phone(b, lang), p = await ctx.newPage(); watch(p, 'central');
await centralSetup(p);
await go(p, 'reglages');
const [fc] = await Promise.all([p.waitForEvent('filechooser'), act(p, 'import')]);
await fc.setFiles(demo); await wait(p, 800);
await p.click('#confirm button[type=submit], #confirm .btn.primary'); await wait(p, 2500);
await go(p, 'dashboard'); await shot(p, 'c-accueil');
await go(p, 'maintenance'); await shot(p, 'c-maintenance');
await act(p, 'edit-tache', { id: 't1' }); await shot(p, 'c-intervention'); await closeSheet(p);
await go(p, 'immeubles'); await shot(p, 'c-proprietes');
await go(p, 'locataires'); await shot(p, 'c-locataires');
await act(p, 'open-loc', { id: 'lc1' }); await shot(p, 'c-locataire');
await act(p, 'sheet-tab', { id: 'espace' }); await wait(p, 500);
await act(p, 'esp-on', { id: 'lc1' }); await wait(p, 3500); await shot(p, 'c-locataire-app');
const locCode = await p.$eval('.sheet [style*="mono"]', (e) => e.textContent.trim()).catch(() => '');
await closeSheet(p);
await go(p, 'paiements'); await shot(p, 'c-loyers');
// hôtel / Airbnb : publier l'app du client (enregistrer sa fiche)
await go(p, 'hotel'); await act(p, 'edit-hote', { id: 'h1' }); await wait(p, 900); await shot(p, 'c-hotel-client');
await p.click('button[type=submit][form=f]'); await wait(p, 3000);
await go(p, 'hotel'); await shot(p, 'c-hotel');
await act(p, 'edit-chambre', { id: 'ch-hotel-101' }); await shot(p, 'c-chambre'); await closeSheet(p);
await act(p, 'hote-conf'); await shot(p, 'c-hotel-reglages'); await closeSheet(p);
await go(p, 'airbnb'); await shot(p, 'c-airbnb');
// société de taxi
await go(p, 'taxis'); await act(p, 'new-txco'); await wait(p, 500); await p.fill('#f [name=nom]', 'Taxi Démo'); await p.fill('#f [name=tel]', '+352 691 000 040');
const txCode = await p.$eval('#f [name=appCode]', (e) => e.value); await p.click('button[type=submit][form=f]'); await wait(p, 3000); await closeSheet(p);
await go(p, 'taxis'); await shot(p, 'c-taxis');
await go(p, 'agences'); await shot(p, 'c-agences');
await go(p, 'proprios'); await shot(p, 'c-proprietaires');
await act(p, 'edit-agence', { id: 'pr1' }); await wait(p, 600); await sheetScroll(p, '.sheet .section-label:last-of-type'); await p.evaluate(() => { const s = [...document.querySelectorAll('.sheet .section-label')].find((x) => x.textContent.includes('🏠')); if (s) s.scrollIntoView({ block: 'start' }); }); await shot(p, 'c-patrimoine'); await closeSheet(p);
await go(p, 'gerances'); await shot(p, 'c-gerances');
await go(p, 'compta'); await shot(p, 'c-compta');
await p.evaluate(() => { const el = document.querySelector('[data-sec=abo]'); if (el) el.click(); }); await wait(p, 700);
await act(p, 'abo-tab', { id: 'pub' }); await wait(p, 600);
await act(p, 'new-annc'); await wait(p, 500); await p.fill('#f [name=nom]', 'Restaurant Démo');
const anCode = await p.$eval('#f [name=appCode]', (e) => e.value); await p.click('button[type=submit][form=f]'); await wait(p, 3000); await closeSheet(p);
await act(p, 'abo-tab', { id: 'pub' }); await shot(p, 'c-annonces');
await go(p, 'reglages'); await shot(p, 'c-reglages');
// licences : tarifs, un client hôtel en essai, fiche avec les 3 forfaits
await go(p, 'reseau'); await wait(p, 1500);
await act(p, 'lic-tarifs'); await wait(p, 500);
for (const [f, a, r2, r3] of [['hotel', '1200', '10', '20'], ['gerance', '900', '10', '15'], ['agence', '1500', '10', '20']]) { await p.fill(`#f [name=an1_${f}]`, a); await p.fill(`#f [name=r2_${f}]`, r2); await p.fill(`#f [name=r3_${f}]`, r3); }
await shot(p, 'c-lic-tarifs'); await p.click('button[type=submit][form=f]'); await wait(p, 1200);
await act(p, 'net-new'); await wait(p, 500); await p.selectOption('#f [name=fil]', 'gerance'); await p.fill('#f [name=nom]', 'Gérance Démo'); await p.fill('#f [name=tel]', '+352 691 000 030');
await shot(p, 'c-lic-nouveau'); await p.click('button[type=submit][form=f]'); await wait(p, 3000);
const tCode = await p.$eval('.sheet [style*="mono"]', (e) => e.textContent.trim()).catch(() => '');
await shot(p, 'c-lic-client'); await closeSheet(p);
await go(p, 'reseau'); await wait(p, 1500); await shot(p, 'c-licences');
// app de l'équipe : accès pour Luc
await go(p, 'maintenance'); await act(p, 'open-interv', { id: 'w1' }); await wait(p, 700); await act(p, 'sheet-tab', { id: 'app' }); await wait(p, 500);
await act(p, 'eq-on', { id: 'w1' }); await wait(p, 3500);
const eqCode = await p.$eval('.sheet [style*="mono"]', (e) => e.textContent.trim()).catch(() => '');
await closeSheet(p);

// ── apps ──
const app = async (url, code, who, fill) => {
  const c = await phone(b, lang), q = await c.newPage(); watch(q, who);
  await q.goto('http://localhost:8765' + url); await wait(q, 1500);
  if (code) { await q.fill(fill || 'input[name=code]', code); await q.click('form button[type=submit], #codeForm button'); await wait(q, 3500); }
  return q;
};
if (locCode) { const q = await app('/espace.html', locCode, 'locataire'); await shot(q, 'a-locataire'); await q.evaluate(() => scrollTo(0, 900)); await shot(q, 'a-locataire-2'); }
if (eqCode) { const q = await app('/equipe.html', eqCode, 'equipe'); await shot(q, 'a-equipe'); await q.evaluate(() => scrollTo(0, 800)); await shot(q, 'a-equipe-2'); }
{ const q = await app('/hote.html', '731204', 'hote'); await shot(q, 'a-sejour'); await q.evaluate(() => { const el = document.querySelector('.arr'); if (el) el.scrollIntoView({ block: 'start' }); }); await q.check('input[name=arrMode][value=taxi]').catch(() => {}); await wait(q, 1200); await q.evaluate(() => { const el = document.querySelector('.arr'); if (el) el.scrollIntoView({ block: 'start' }); }); await shot(q, 'a-sejour-taxi'); }
{ const q = await app('/taxi.html', txCode, 'taxi'); await q.click('[data-add-d]').catch(() => {}); await q.fill('[data-cd="0"][data-f=nom]', 'Marc').catch(() => {}); await q.click('[data-add-c]').catch(() => {}); await q.fill('[data-cc="0"][data-f=modele]', 'Berline').catch(() => {}); await q.fill('[data-cc="0"][data-f=plaque]', 'LU-0002').catch(() => {});
  await q.check('[data-g=confort][data-f=on]').catch(() => {}); await wait(q, 400); await shot(q, 'a-taxi'); await q.evaluate(() => scrollTo(0, 1400)); await shot(q, 'a-taxi-2'); }
{ const q = await app('/annonce.html', anCode, 'annonce'); await q.click('[data-new]').catch(() => {}); await wait(q, 500); await q.fill('[data-k=nom]', TX[0]).catch(() => {}); await q.fill('[data-k=texte]', TX[1]).catch(() => {}); await shot(q, 'a-annonce'); }
// centrale du client (gérance) : son menu, son bandeau d'essai, une demande d'intervention
if (tCode) {
  const tid = ([...store.keys()].find((k) => k.startsWith('ares/tenants/')) || '').split('/')[2].replace('.json', '');
  const c = await phone(b, lang), q = await c.newPage(); watch(q, 'client');
  await centralSetup(q, '/locataires.html?t=' + tid, tCode, 'Cle-Demo-Client-2026!');
  await shot(q, 't-centrale');
  await q.evaluate(() => { location.hash = '#/demandes'; }); await wait(q, 800);
  await q.evaluate(() => { const el = document.querySelector('[data-action=tdem-new]'); if (el) el.click(); }); await wait(q, 600);
  await q.fill('#f [name=titre]', TX[2]).catch(() => {}); await q.fill('#f [name=texte]', TX[3]).catch(() => {});
  await shot(q, 't-demande');
}
console.log('ERRORS', errors.length ? errors : 'none');
await b.close();
