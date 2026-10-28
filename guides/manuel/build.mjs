// Manuel ALJADY R. INTERVENTIONS — toutes les langues dans un seul PDF (A4), comme la v2.150.
// node build.mjs [it fr de en pt es]   (par défaut : les langues qui ont lang/<l>-head.html)
// Sources par langue : lang/<l>-head.html (qui l'utilise, sitemap, flowmap), lang/<l>-base.html (chapitres 3–6, venus de la
// v2.150 et mis à jour), lang/<l>-new.html (chapitres 7–12). Style : manuel.css. Captures : shots/<l>/ (shots.mjs).
// 1) une langue = un PDF  2) pages des chapitres (pages.py)  3) couverture + sommaire  4) assemble.py : tout + pieds de page
import { chromium } from 'playwright';
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const HERE = new URL('./', import.meta.url).pathname, TMP = HERE + 'shots/build/';
await mkdir(TMP, { recursive: true });
const VER = '2.200';
const META = {
  it: ['Italiano', 'Manuale dell’applicazione INTERVENTI', 'Chi lo usa e perché', 'pagine'],
  fr: ['Français', 'Manuel de l’application INTERVENTIONS', 'Qui l’utilise et pourquoi', 'pages'],
  de: ['Deutsch', 'Handbuch der Anwendung INTERVENTIONS', 'Wer sie nutzt und warum', 'Seiten'],
  en: ['English', 'INTERVENTIONS application manual', 'Who uses it and why', 'pages'],
  pt: ['Português', 'Manual da aplicação INTERVENTIONS', 'Quem a usa e porquê', 'páginas'],
  es: ['Español', 'Manual de la aplicación INTERVENTIONS', 'Quién la usa y por qué', 'páginas'],
};
const all = ['it', 'fr', 'de', 'en', 'pt', 'es'];
const exists = (f) => access(f).then(() => true, () => false);
let langs = process.argv.slice(2);
if (!langs.length) { langs = []; for (const l of all) if (await exists(`${HERE}lang/${l}-head.html`)) langs.push(l); }
const CSS = await readFile(HERE + 'manuel.css', 'utf8');
const b = await chromium.launch();
const toPdf = async (body, out) => {
  const p = await b.newPage(), f = `${HERE}_page.html`;
  await writeFile(f, `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>${body}</body></html>`);
  await p.goto('file://' + f, { waitUntil: 'load' });
  await p.pdf({ path: out, format: 'A4', printBackground: true });
  await p.close();
};
// 1) chaque langue
const chapters = {};
for (const l of langs) {
  const read = (k) => readFile(`${HERE}lang/${l}-${k}.html`, 'utf8');
  let base = await read('base');
  base = base.replace(/<div class="shots"><img src="img\/[a-z]{2}-\d+-\d+\.png"[^>]*><\/div>/g, '<div class="h1logo"><img src="assets/logo-small.png" alt=""></div>')
    .replace(/src="img\//g, 'src="src/img/');
  const body = `${await read('head')}<section>${base}</section><section>${(await read('new')).replace(/(<div class="bar")/g, '</section><section>$1').replace(/^<\/section><section>/, '')}</section>`;
  await toPdf(body, `${TMP}${l}.pdf`);
  // titres des chapitres : « Qui l'utilise » puis chaque bandeau
  chapters[l] = [META[l][2], ...[...body.matchAll(/<div class="bar"[^>]*>(.*?)<\/div>/g)].map((m) => m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim())];
}
// 2) page de chaque chapitre dans le PDF de sa langue
await writeFile(`${TMP}chap.json`, JSON.stringify(Object.fromEntries(langs.map((l) => [l, { pdf: `${TMP}${l}.pdf`, titles: chapters[l] }]))));
const pages = JSON.parse(execFileSync('/usr/bin/python3', [HERE + 'pages.py', `${TMP}chap.json`]));
let at = 3;
const toc = {};
for (const l of langs) { toc[l] = chapters[l].map((t, i) => [t, at + pages[l].starts[i]]); at += pages[l].count; }
const total = at - 1;
// 3) couverture + sommaire
const cover = `<div style="height:265mm;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center">
  <img src="assets/logo-cover.jpg" style="width:150mm;border-radius:3mm">
  <div style="color:#b7791f;font-weight:700;font-size:20pt;letter-spacing:4pt;margin-top:7mm">ALJADY R.</div>
  <div style="font-weight:700;font-size:13pt;letter-spacing:5pt;color:#1b2e4a">I N T E R V E N T I O N S</div>
  <div style="font-size:9.5pt;color:#64748b;margin-top:1.5mm">Gérance · Immobiliari · Hotel · Airbnb · Taxi</div>
  <div style="font-size:21pt;font-weight:700;color:#1b2e4a;margin-top:12mm">GESTIONE LOCATIVA &amp; INTERVENTI</div>
  <div style="font-size:15pt;color:#4e45e4;margin-top:3mm">${META.it[1]}</div>
  <div style="font-size:10pt;color:#334155;margin-top:5mm">Gestione · Inquilini · Squadra · Gérance · Preventivi · Hotel · Airbnb · Taxi · Annunci · Licenze</div>
  <div style="font-size:10pt;color:#b7791f;margin-top:4mm">${langs.map((l) => META[l][0]).join(' · ')}</div>
  <div style="font-size:9.5pt;color:#64748b;margin-top:2mm">v${VER}.0 · 10/2026 · ${total} ${META.it[3]}</div></div>`;
const tocHtml = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:7mm 9mm;font-size:8.8pt;line-height:1.35">${langs.map((l) => `<div><div style="font-weight:700;font-size:11pt;color:#4338ca;border-bottom:1.5px solid #c7d2fe;margin-bottom:1.5mm">${META[l][0]}</div>${toc[l].map(([t, p]) => `<div style="display:flex;justify-content:space-between;gap:3mm;margin:1.2mm 0"><span>${t}</span><span>${p}</span></div>`).join('')}</div>`).join('')}</div>`;
await toPdf(`${cover}<div style="break-before:page"></div>${tocHtml}`, `${TMP}front.pdf`);
await b.close();
// 4) assemblage + pieds de page
const out = new URL(`../ALJADY_R_INTERVENTIONS_Manuale_${langs.length === 6 ? '6_lingue' : langs.join('-')}_v${VER}.pdf`, import.meta.url).pathname;
await writeFile(`${TMP}plan.json`, JSON.stringify({ total, front: `${TMP}front.pdf`, langs: langs.map((l) => ({ pdf: `${TMP}${l}.pdf`, lang: META[l][0], manual: META[l][1] })) }));
execFileSync('/usr/bin/python3', [HERE + 'assemble.py', `${TMP}plan.json`, out], { stdio: 'inherit' });
console.log('📄', out, total);
