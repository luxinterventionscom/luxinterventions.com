// Assemble le manuel en PDF (A4) : node build.mjs [fr it de en pt es] → guides/manuel-luxinterventions-<lang>.pdf
// Textes : texts-<lang>.mjs ; captures : shots/<lang>/ (créées par shots.mjs), réduites ici pour un PDF léger.
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
const HERE = new URL('./', import.meta.url).pathname;
const langs = process.argv.slice(2).length ? process.argv.slice(2) : ['fr', 'it', 'de', 'en', 'pt', 'es'];
// ordre des chapitres et captures de chacun
const PLAN = [
  ['intro', []], ['start', []], ['accueil', ['c-accueil']],
  ['maintenance', ['c-maintenance', 'c-intervention']], ['proprietes', ['c-proprietes']],
  ['locataires', ['c-locataires', 'c-locataire', 'c-locataire-app']], ['loyers', ['c-loyers']],
  ['hotel', ['c-hotel', 'c-hotel-reglages', 'c-chambre', 'c-hotel-client']], ['airbnb', ['c-airbnb']], ['taxis', ['c-taxis']],
  ['agences', ['c-agences', 'c-proprietaires', 'c-patrimoine']], ['gerances', ['c-gerances']],
  ['compta', ['c-compta', 'c-annonces']], ['reglages', ['c-reglages']],
  ['licences', ['c-lic-tarifs', 'c-lic-nouveau', 'c-lic-client', 'c-licences']], ['client', ['t-centrale', 't-demande']],
  ['appLoc', ['a-locataire', 'a-locataire-2']], ['appEq', ['a-equipe', 'a-equipe-2']], ['appSejour', ['a-sejour', 'a-sejour-taxi']],
  ['appTaxi', ['a-taxi', 'a-taxi-2']], ['appAnn', ['a-annonce']], ['secu', []],
];
const CSS = `@page{size:A4;margin:16mm 15mm 18mm}
body{font:10.5pt/1.5 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#1f2430;margin:0}
.cover{height:250mm;display:flex;flex-direction:column;justify-content:center;page-break-after:always}
.cover h1{font-size:30pt;margin:0 0 6mm;color:#0f3d5e}.cover p{font-size:14pt;color:#555;margin:0}.cover .note{font-size:9pt;margin-top:20mm;color:#888}
.toc{page-break-after:always}.toc h2{color:#0f3d5e}.toc ol{columns:2;column-gap:10mm;padding-left:6mm}.toc li{margin:1.5mm 0}
section{margin-top:9mm}h2{break-after:avoid}
h2{font-size:17pt;color:#0f3d5e;border-bottom:2px solid #d8e3ec;padding-bottom:2mm;margin:0 0 4mm}
table{border-collapse:collapse;width:100%;font-size:9.5pt;margin:3mm 0}td,th{border:1px solid #d8e3ec;padding:1.5mm 2mm;text-align:left;vertical-align:top}th{background:#eef4f8}
.shots{display:flex;flex-wrap:wrap;gap:4mm;margin-top:4mm;break-inside:avoid}
.shots img{width:41mm;border:1px solid #ccd;border-radius:3mm;break-inside:avoid}
li{margin:1mm 0}`;
const b = await chromium.launch();
const pg = await b.newPage();
// réduit une capture à 480 px de large (JPEG) pour garder le PDF léger
const small = async (file) => {
  const buf = await readFile(file).catch(() => null);
  if (!buf) return '';
  return pg.evaluate(async (src) => {
    const im = new Image(); im.src = src; await im.decode();
    const w = 480, h = Math.round((im.height * w) / im.width), c = document.createElement('canvas');
    c.width = w; c.height = h; c.getContext('2d').drawImage(im, 0, 0, w, h);
    return c.toDataURL('image/jpeg', 0.72);
  }, 'data:image/jpeg;base64,' + buf.toString('base64'));
};
for (const lang of langs) {
  const T = (await import(`./texts-${lang}.mjs`)).default;
  let body = `<div class="cover"><h1>${T.title}</h1><p>${T.sub}</p><p class="note">luxinterventions.com · ${T.shotsNote}</p></div>`;
  body += `<div class="toc"><h2>${T.toc}</h2><ol>${PLAN.map(([id]) => `<li>${T.sec[id][0]}</li>`).join('')}</ol></div>`;
  for (const [i, [id, shots]] of PLAN.entries()) {
    const imgs = [];
    for (const s of shots) { const d = await small(`${HERE}shots/${lang}/${s}.jpg`); if (d) imgs.push(`<img src="${d}" alt="">`); }
    body += `<section><h2>${i + 1}. ${T.sec[id][0]}</h2>${T.sec[id][1]}${imgs.length ? `<div class="shots">${imgs.join('')}</div>` : ''}</section>`;
  }
  const p = await b.newPage();
  await p.setContent(`<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><title>${T.title}</title><style>${CSS}</style></head><body>${body}</body></html>`, { waitUntil: 'load' });
  const out = new URL(`../manuel-luxinterventions-${lang}.pdf`, import.meta.url).pathname;
  await p.pdf({ path: out, format: 'A4', printBackground: true, displayHeaderFooter: true, headerTemplate: '<span></span>',
    footerTemplate: `<div style="font-size:8px;color:#888;width:100%;text-align:center">${T.title} · <span class="pageNumber"></span>/<span class="totalPages"></span></div>` });
  await p.close();
  console.log('📄', out);
}
await b.close();
