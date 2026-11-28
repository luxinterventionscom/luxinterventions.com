// LGR · Lux Gestion Résidences — essai complet : WORKER_MJS=<copie de hit-counter.js en .mjs> node lgr-test.mjs
// Prova completa di LGR : iMac (crea il coffre, syndic, residenze, documenti, ricerca, dossier, riepiloghi, sync) + iPhone (stesso coffre dal server)
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
const { env, store, routeCtx } = await import('./harness.mjs');
const { makePdf } = await import('../../ares/pdfmini.js');
env.LGR_SETUP_CODE = 'code-lgr-prova';
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, ''), D = (await import('node:fs')).mkdtempSync((await import('node:os')).tmpdir() + '/lgr-') + '/', U = 'http://localhost:8765/LGR-residences/';
const MIME = { html: 'text/html', js: 'text/javascript', mjs: 'text/javascript', css: 'text/css', json: 'application/json', webmanifest: 'application/manifest+json', png: 'image/png', woff2: 'font/woff2' };
// fichiers d'essai (inventés)
{ const { writeFileSync, mkdirSync, copyFileSync } = await import('node:fs'); mkdirSync(D + 'shots', { recursive: true });
  const mk = (lines, name) => { const p = makePdf(); let y = 60; for (const l of lines) { p.text(50, y, l, { size: l.startsWith('#') ? 16 : 11, bold: l.startsWith('#') }); y += 22; } writeFileSync(D + name, p.bytes()); };
  mk(['# FACTURE', 'Facture n° F-2026-118', 'Date : 14/11/2026', 'Client : Gérance Alpha', 'Chantier : Résidence Les Tilleuls, 12 rue des Prés, Luxembourg', 'Remplacement du cylindre de la porte d’entrée', 'Total à payer : 1 240,00 €'], 'facture-F-2026-118.pdf');
  mk(['# DEVIS', 'Devis n° D-2026-090', 'Date : 28/10/2026', 'Résidence Les Tilleuls', 'Remplacement du cylindre', 'Montant total : 1 240,00 €'], 'devis-D-2026-090.pdf');
  mk(['# RAPPORT D’INTERVENTION', 'Rapport n° R-2026-077', 'Date : 10/11/2026', 'Résidence Les Tilleuls', 'Travaux terminés, cylindre remplacé.'], 'rapport-R-2026-077.pdf');
  mk(['# FACTURE', 'Facture n° F-2026-117', 'Date : 08/11/2026', 'Le Belvédère', 'Débouchage colonne', 'Total : 685,50 €'], 'facture-F-2026-117.pdf');
  writeFileSync(D + 'devis-excel.xlsx', Buffer.from('PK essai')); copyFileSync(R + '/LGR-residences/icons/lgr-192.png', D + 'logo.png'); console.log('captures :', D + 'shots'); }
const PASS = 'Une phrase assez longue 2026';
let fails = 0; const ok = (c, m) => { console.log((c ? '✔ ' : '✘ ') + m); if (!c) fails++; };
const b = await chromium.launch();
async function ctx(vp, extra = {}) {
  const c = await b.newContext({ viewport: vp, acceptDownloads: true, locale: 'fr-FR', ...extra });
  await routeCtx(c);
  await c.route('http://localhost:8765/**', async (r) => { let f = decodeURIComponent(new URL(r.request().url()).pathname); if (f.endsWith('/')) f += 'index.html'; try { r.fulfill({ status: 200, contentType: MIME[f.split('.').pop()] || 'application/octet-stream', body: await readFile(R + f) }); } catch { r.fulfill({ status: 404, body: '' }); } });
  const p = await c.newPage(); p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) p.errs.push('console: ' + m.text()); });
  return { c, p };
}
const N = (x) => String(x).replace(/[\u00a0\u202f]/g, ' ');
const shot = (p, n) => p.screenshot({ path: D + 'shots/' + n + '.png' });
const W = (p, ms = 400) => p.waitForTimeout(ms);

// ── iMac ──
const { c: mac, p } = await ctx({ width: 1440, height: 900 });
await p.goto(U); await p.waitForSelector('[data-a=new]');
await shot(p, '01-welcome');
await p.click('[data-a=new]'); await p.fill('[name=p1]', PASS); await p.fill('[name=p2]', PASS); await p.click('form button:not([type=button])');
await p.waitForSelector('.rcode', { timeout: 30000 }); const code = (await p.textContent('.rcode')).trim();
ok(/^[A-Z0-9]{4}(-[A-Z0-9]{4}){5}$/.test(code), 'clé de secours : ' + code);
await shot(p, '02-code');
await p.check('[name=noted]'); await p.click('[data-a=codeok]'); await p.waitForSelector('.welcome');
ok(/appareil|activer/.test(await p.textContent('.syncb')), 'sync : pas encore activée (' + (await p.textContent('.syncb')).trim() + ')');
await shot(p, '02b-empty');
// syndics + résidences
await p.click('.welcome [data-a=newsyn]'); await p.fill('.sheet [name=nom]', 'Gérance Alpha'); await p.click('.sheet label.chip:has-text("Gérance")'); await p.fill('.sheet [name=email]', 'compta@alpha.example'); await p.click('.sheet button:not([type=button])'); await W(p);
await p.click('[href="#/syndics"]'); await p.click('[data-a=newsyn]'); await p.fill('.sheet [name=nom]', 'Syndic Horizon'); await p.click('.sheet button:not([type=button])'); await W(p);
await p.click('.card:has-text("Gérance Alpha") [data-a=newres]'); await p.fill('.sheet [name=nom]', 'Résidence Les Tilleuls'); await p.fill('.sheet [name=rue]', 'rue des Prés'); await p.fill('.sheet [name=num]', '12'); await p.fill('.sheet [name=cp]', 'L-1234'); await p.fill('.sheet [name=ville]', 'Luxembourg'); await p.click('.sheet button:not([type=button])'); await W(p);
await p.click('.card:has-text("Syndic Horizon") [data-a=newres]'); await p.fill('.sheet [name=nom]', 'Le Belvédère'); await p.fill('.sheet [name=ville]', 'Strassen'); await p.click('.sheet button:not([type=button])'); await W(p);
ok((await p.$$('.card')).length === 2 && (await p.textContent('.main')).includes('Les Tilleuls'), 'syndics et résidences créés');
await shot(p, '03-syndics');
// documents
await p.click('[href="#/docs"]'); await p.click('.bar [data-a=add]');
await p.setInputFiles('.sheet input[type=file]', ['facture-F-2026-118.pdf', 'devis-D-2026-090.pdf', 'rapport-R-2026-077.pdf', 'facture-F-2026-117.pdf', 'devis-excel.xlsx'].map((f) => D + f));
await p.waitForSelector('.sheet form[data-f=doc]', { timeout: 20000 }); await W(p, 800);
const v = async (n) => p.$eval(`.sheet [name=${n}]`, (e) => e.value);
ok(await v('no') === 'F-2026-118' && await v('date') === '2026-11-14' && await v('montant') === '1240' && (await p.$eval('.sheet [name=type]:checked', (e) => e.value)) === 'fac', 'suggestions facture : n°, date, montant, type');
ok((await p.$eval('.sheet [name=res]', (e) => e.selectedOptions[0].text)) === 'Résidence Les Tilleuls' && (await p.$eval('.sheet [name=syn]', (e) => e.selectedOptions[0].text)) === 'Gérance Alpha', 'suggestions : résidence et syndic trouvés dans le PDF');
await shot(p, '04-form');
await p.fill('.sheet [name=objet]', 'Remplacement du cylindre'); await p.click('.sheet button:not([type=button])');
await p.waitForFunction(() => document.querySelector('.sheet [name=no]')?.value === 'D-2026-090', null, { timeout: 15000 });
ok((await p.$eval('.sheet [name=type]:checked', (e) => e.value)) === 'dev', 'suggestion devis : type Dev.');
await p.selectOption('.sheet [name=st]', 'accepte'); await p.click('.sheet button:not([type=button])');
await p.waitForFunction(() => document.querySelector('.sheet [name=no]')?.value === 'R-2026-077', null, { timeout: 15000 });
ok((await p.$eval('.sheet [name=type]:checked', (e) => e.value)) === 'rap', 'suggestion rapport : type Rap.');
await p.click('.sheet button:not([type=button])');
await p.waitForFunction(() => document.querySelector('.sheet [name=no]')?.value === 'F-2026-117', null, { timeout: 15000 });
ok(await v('montant') === '685,5' || await v('montant') === '685.5' || await v('montant') === '685,50', 'montant 685,50 suggéré (' + await v('montant') + ')');
await p.selectOption('.sheet [name=syn]', { label: 'Syndic Horizon' }); await W(p, 200); await p.selectOption('.sheet [name=res]', { label: 'Le Belvédère' });
await p.selectOption('.sheet [name=st]', 'payee'); await p.click('.sheet button:not([type=button])');
await p.waitForSelector('.sheet .thumb.file', { timeout: 15000 });
await p.click('.sheet label.chip:has-text("Dev.")'); await p.fill('.sheet [name=no]', 'D-2026-131'); await p.selectOption('.sheet [name=syn]', { label: 'Syndic Horizon' }); await W(p, 200); await p.selectOption('.sheet [name=res]', { label: 'Le Belvédère' }); await p.fill('.sheet [name=montant]', '3 860,00');
await p.click('.sheet button:not([type=button])'); await W(p, 1200);
ok((await p.$$('table.docs tbody tr')).length === 5, '5 documents dans la liste');
ok(N(await p.textContent('.bar')).includes('1 240,00'), 'total à payer 1 240,00 €');
// recherche
await p.fill('#q', 'tilleuls 118'); await W(p, 600);
ok((await p.$$('table.docs tbody tr')).length === 1, 'recherche « tilleuls 118 » → 1 document');
await p.fill('#q', 'cylindre'); await W(p, 600);
ok((await p.$$('table.docs tbody tr')).length === 3, 'recherche plein texte « cylindre » → 3 (objet + texte des PDF)');
await p.fill('#q', ''); await W(p, 600);
// aperçu
await p.click('table.docs tbody tr:has-text("F-2026-118")'); await p.waitForSelector('#prev .paper.img img', { timeout: 20000 }); await W(p, 800);
const nat = await p.$eval('#prev .paper.img img', (i) => [i.naturalWidth, i.naturalHeight]);
ok(Math.max(...nat) === 3000, 'aperçu PDF rendu à 3000 px (' + nat.join('×') + ')');
await p.hover('#prev .paper.img img'); await p.mouse.move(1200, 260); await W(p, 200);
ok(await p.$eval('.lens', (l) => getComputedStyle(l).display === 'block').catch(() => false), 'loupe au survol');
await shot(p, '05-docs-preview');
await p.dblclick('#prev .paper.img img'); await p.waitForSelector('.zoomov'); await W(p, 500); await p.click('.zoomov [data-z=in]'); await W(p, 300);
await shot(p, '06-zoom'); await p.click('.zoomov [data-z=close]');
// dossier : relier la facture au devis et au rapport
await p.click('#prev [data-a=link]'); await p.click('.sheet .pick:has-text("D-2026-090")'); await W(p, 500);
await p.click('#prev [data-a=link]'); await p.click('.sheet .pick:has-text("R-2026-077")'); await W(p, 500);
const ch = await p.textContent('#prev .chain');
ok(/D-2026-090.*R-2026-077.*F-2026-118/.test(ch), 'dossier Dev. → Rap. → Fac. : ' + ch.replace(/\s+/g, ' '));
// filtres
await p.selectOption('.chips [name=syn]', { label: 'Syndic Horizon' }); await W(p, 400);
ok((await p.$$('table.docs tbody tr')).length === 2, 'filtre syndic Horizon → 2');
await p.click('[data-a=fclear]'); await W(p, 300);
// ✏️ société + thème
await p.click('.side .soc'); await p.setInputFiles('.sheet input[name=logo]', D + 'logo.png'); await W(p, 600);
await p.fill('.sheet [name=nom]', 'Société Démo s.a.'); await p.fill('.sheet [name=adresse]', '1, rue Exemple, L-0000 Luxembourg'); await p.fill('.sheet [name=email]', 'info@demo.example');
await p.click('.sheet [data-v=ivoire]'); ok(await p.evaluate(() => document.documentElement.dataset.theme) === 'ivoire', 'thème Ivoire en un clic');
await shot(p, '07-personnaliser'); await p.click('.sheet [data-v=verre]'); await p.click('.sheet button:not([type=button])'); await W(p, 500);
ok((await p.textContent('.side .soc')).includes('Société Démo'), 'nom de la société dans la barre');
// récapitulatif
await p.click('[href="#/recap"]'); await p.selectOption('.chips [name=per]', 'q4'); await W(p, 300); await p.selectOption('.chips [name=syn]', { label: 'Gérance Alpha' }); await W(p, 400);
ok((await p.$$('.recapbox tbody tr')).length === 1 && N(await p.textContent('.recapbox tfoot')).includes('1 240,00'), 'récap Gérance Alpha T4 2026 : 1 facture, 1 240,00 €');
await shot(p, '08-recap');
let dl = await Promise.all([p.waitForEvent('download'), p.click('[data-a=rpdf]')]).then(([d]) => d);
const pdf = await readFile(await dl.path()); ok(pdf.slice(0, 5).toString() === '%PDF-' && pdf.length > 1500, 'PDF du récap (' + dl.suggestedFilename() + ', ' + pdf.length + ' o)');
await (async () => { const { writeFileSync } = await import('node:fs'); writeFileSync(D + 'shots/recap.pdf', pdf); })();
dl = await Promise.all([p.waitForEvent('download'), p.click('[data-a=rxls]')]).then(([d]) => d);
const xl = await readFile(await dl.path()); ok(xl.slice(0, 2).toString() === 'PK', 'Excel du récap (' + dl.suggestedFilename() + ')');
// sync
await p.click('[href="#/reglages"]'); await p.click('[data-a=enablesync]'); await p.fill('.sheet [name=code]', 'faux'); await p.click('.sheet button:not([type=button])'); await W(p, 800);
ok((await p.textContent('.sheet .err')).includes('incorrect'), 'mauvais code refusé');
await p.fill('.sheet [name=code]', 'code-lgr-prova'); await p.click('.sheet button:not([type=button])'); await p.waitForSelector('.sheet', { state: 'detached', timeout: 30000 }); await W(p, 1500);
const keys = [...store.keys()].filter((k) => k.startsWith('lgr/'));
ok(keys.includes('lgr/meta.json') && keys.includes('lgr/data.bin') && keys.filter((k) => k.startsWith('lgr/f/')).length === 5, 'serveur : méta + données + 5 fichiers (' + keys.length + ')');
const raw = Buffer.from(store.get('lgr/data.bin').b).toString('latin1');
ok(!/Tilleuls|Alpha|F-2026/.test(raw), 'données illisibles sur le serveur (chiffrées)');
ok((await p.textContent('.syncb')).includes('Synchronisé'), 'badge : Synchronisé');
await shot(p, '09-reglages');
ok(!p.errs.length, 'iMac : aucune erreur JS ' + p.errs.slice(0, 3).join(' | '));

// ── iPhone : même coffre depuis le serveur ──
const { c: ph, p: q } = await ctx({ width: 390, height: 844 }, { deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await q.goto(U); await q.waitForSelector('[data-a=have]'); await q.click('[data-a=have]'); await q.fill('[name=p]', 'mauvaise clé longue'); await q.click('form button'); await W(q, 3000);
ok((await q.textContent('.err')).includes('incorrecte'), 'iPhone : mauvaise clé refusée');
await q.fill('[name=p]', PASS); await q.click('form button'); await q.waitForSelector('#tabs a', { timeout: 30000 }); await W(q, 2500);
ok((await q.$$('table.docs tbody tr')).length === 5, 'iPhone : 5 documents arrivés du serveur');
await shot(q, '10-iphone-docs');
await q.fill('#q', 'Tilleuls'); await W(q, 600); await shot(q, '11-iphone-search');
await q.click('table.docs tbody tr:has-text("F-2026-118")'); await q.waitForSelector('.docpage .paper.img img', { timeout: 20000 }); await W(q, 600);
ok(true, 'iPhone : facture ouverte, PDF téléchargé du serveur et déchiffré');
await shot(q, '12-iphone-doc');
await q.click('.stbtns [data-v=payee]'); await W(q, 2500);
await p.click('[data-a=syncnow]'); await W(p, 2000); await p.click('[href="#/docs"]'); await W(p, 400);
ok((await p.textContent('table.docs tr:has-text("F-2026-118")')).includes('Payée'), 'iMac : la facture payée sur l’iPhone est « Payée »');
ok(!q.errs.length, 'iPhone : aucune erreur JS ' + q.errs.slice(0, 3).join(' | '));
// clé de secours sur un 3e appareil
const { c: c3, p: r } = await ctx({ width: 1100, height: 800 });
await r.goto(U); await r.click('[data-a=have]'); await r.click('[data-a=rec]'); await r.fill('[name=p]', code.toLowerCase()); await r.click('form button'); await r.waitForSelector('.side', { timeout: 30000 }); await W(r, 2000);
ok((await r.$$('table.docs tbody tr')).length === 5, '3e appareil : ouvert avec la clé de secours');
// langues
for (const l of ['en', 'de', 'it']) { await r.click('[href="#/reglages"]'); await r.click(`[data-lang=${l}]`); await W(r, 300); await r.click('[href="#/docs"]'); await W(r, 300); }
await shot(r, '13-it');
ok((await r.textContent('.side')).includes('Impostazioni') && (await r.textContent('.main')).includes('Documenti'), 'langue IT');
// verrouiller / déverrouiller
await p.click('[href="#/reglages"]'); await p.click('[data-a=lock]'); await p.waitForSelector('[data-f=unlock]'); await p.fill('[name=p]', PASS); await p.click('form button'); await p.waitForSelector('.side', { timeout: 30000 }); await W(p, 800);
ok((await p.$$('table.docs tbody tr')).length === 5, 'verrouiller puis rouvrir');
// corbeille
await p.click('table.docs tbody tr:has-text("D-2026-131")'); await p.click('#prev [data-a=del]'); await p.click('.sheet [data-a=yes]'); await W(p, 500);
ok((await p.$$('table.docs tbody tr')).length === 4, 'mis à la corbeille');
await p.goto(U + '#/corbeille'); await W(p, 1500); await p.click('[data-a=restore]'); await W(p, 400); await p.click('[href="#/reglages"]'); await p.click('[href="#/docs"]').catch(() => {}); await p.goto(U + '#/docs'); await W(p, 800);
ok((await p.$$('table.docs tbody tr')).length === 5, 'restauré depuis la corbeille');
ok(!p.errs.length && !r.errs.length, 'aucune erreur JS à la fin ' + [...p.errs, ...r.errs].slice(0, 3).join(' | '));
await b.close();
console.log(fails ? `\n${fails} ÉCHEC(S)` : '\nTOUT OK');
process.exit(fails ? 1 : 0);
