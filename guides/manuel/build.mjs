// Manuel complet, 6 langues dans un seul PDF : base v2.150 (base-v2.150.pdf, sans noms) + chapitre « Nouveautés » par langue.
// node build.mjs → guides/Manuel_INTERVENTIONS_6_langues_v<VER>.pdf
// 1) chaque chapitre « Nouveautés » en PDF (textes texts-<lang>.mjs + news.mjs, captures shots/<lang>/)
// 2) couverture + sommaire (numéros de page calculés)  3) assemble.py : pages de la base nettoyées + chapitres + pieds de page
import { chromium } from 'playwright';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import NEWS, { VER } from './news.mjs';
const HERE = new URL('./', import.meta.url).pathname, TMP = HERE + 'shots/build/';
await mkdir(TMP, { recursive: true });
const LANGS = ['it', 'fr', 'de', 'en', 'pt', 'es'];
// base v2.150 : pages de chaque langue et ses chapitres (titre, 1re page)
const BASE = {
  it: [3, 36, [['Chi lo usa e perché', 3], ['Mappa delle app (sitemap)', 4], ['Come gira il lavoro (flowmap)', 6], ['App di gestione, app inquilini, app squadra', 7], ['Interventi: gérances, devis e fatture', 25], ['Portale gérance', 31], ['🆕 Novità (v2.150)', 34]]],
  fr: [37, 72, [['Qui l’utilise et pourquoi', 37], ['Carte des apps (sitemap)', 38], ['Comment tourne le travail (flowmap)', 40], ['App de gestion, app des locataires, app de l’équipe', 41], ['Interventions : gérances, devis et factures', 60], ['Portail gérance', 67], ['🆕 Nouveautés (v2.150)', 70]]],
  de: [73, 109, [['Wer sie nutzt und warum', 73], ['Karte der Apps (Sitemap)', 74], ['So läuft die Arbeit (Flowmap)', 76], ['Verwaltungs-App, Mieter-App, Team-App', 77], ['Einsätze: Verwaltungen, Angebote und Rechnungen', 97], ['Verwaltungsportal', 104], ['🆕 Neuerungen (v2.150)', 107]]],
  en: [110, 143, [['Who uses it and why', 110], ['Map of the apps (sitemap)', 111], ['How the work flows (flowmap)', 113], ['Management app, tenants’ app, team app', 114], ['Interventions: agencies, quotes and invoices', 132], ['Agency portal', 138], ['🆕 What’s new (v2.150)', 141]]],
  pt: [144, 178, [['Quem a usa e porquê', 144], ['Mapa das apps (sitemap)', 145], ['Como corre o trabalho (flowmap)', 147], ['App de gestão, app dos inquilinos, app da equipa', 148], ['Intervenções: gestoras, orçamentos e faturas', 167], ['Portal das gestoras', 173], ['🆕 Novidades (v2.150)', 176]]],
  es: [179, 214, [['Quién la usa y por qué', 179], ['Mapa de las apps (sitemap)', 180], ['Cómo fluye el trabajo (flowmap)', 182], ['App de gestión, app de los inquilinos, app del equipo', 183], ['Intervenciones: administradoras, presupuestos y facturas', 202], ['Portal de administradoras', 209], ['🆕 Novedades (v2.150)', 212]]],
};
// sous-chapitres des nouveautés (clés de texts-<lang>.mjs) et leurs captures
const PLAN = [
  ['proprietes', ['c-proprietes']], ['agences', ['c-agences', 'c-proprietaires', 'c-patrimoine']], ['gerances', ['c-gerances']],
  ['hotel', ['c-hotel', 'c-hotel-reglages', 'c-chambre', 'c-hotel-client']], ['airbnb', ['c-airbnb']], ['appSejour', ['a-sejour', 'a-sejour-taxi']],
  ['taxis', ['c-taxis']], ['appTaxi', ['a-taxi', 'a-taxi-2']], ['compta', ['c-compta', 'c-annonces']], ['appAnn', ['a-annonce']],
  ['licences', ['c-reglages', 'c-lic-tarifs', 'c-lic-nouveau', 'c-lic-client', 'c-licences']], ['client', ['t-centrale', 't-demande']],
  ['locataires', ['c-locataire', 'c-locataire-app', 'a-locataire']], ['appEq', ['a-equipe', 'a-equipe-2']],
];
const CSS = `@page{size:A4;margin:14mm 15mm 18mm}
body{font:10pt/1.5 'Liberation Sans',Arial,sans-serif;color:#1f2937;margin:0}
.bar{background:#4f46e5;color:#fff;font-weight:700;font-size:13pt;padding:3mm 5mm;border-radius:2.5mm;margin-bottom:5mm}
h1{font-size:18pt;color:#1e293b;margin:0 0 3mm}h2{font-size:13pt;color:#1e293b;margin:6mm 0 2mm;break-after:avoid}h3{font-size:11pt;color:#4338ca;margin:5mm 0 1.5mm;break-after:avoid}
p{margin:1.5mm 0}ol,ul{margin:1.5mm 0;padding-left:6mm}li{margin:1mm 0}
table{border-collapse:collapse;width:100%;font-size:9pt;margin:2mm 0}td,th{border:1px solid #dbe2ea;padding:1.2mm 2mm;text-align:left;vertical-align:top}th{background:#eef2ff}
.shots{display:flex;flex-wrap:wrap;gap:4mm;justify-content:center;margin:3mm 0;break-inside:avoid}
.shots img{width:40mm;border:2.5px solid #1e293b;border-radius:4mm}
.note{font-size:8.5pt;color:#64748b}`;
const b = await chromium.launch();
const pg = await b.newPage();
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
const pdf = async (html, out) => {
  const p = await b.newPage();
  await p.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>${html}</body></html>`, { waitUntil: 'load' });
  await p.pdf({ path: out, format: 'A4', printBackground: true });
  await p.close();
  return +String(execFileSync('pdfinfo', [out])).match(/Pages:\s+(\d+)/)[1];
};
// 1) chapitres « Nouveautés »
const count = {};
for (const lang of LANGS) {
  const N = NEWS[lang], T = (await import(`./texts-${lang}.mjs`)).default;
  let h = `<div class="bar">7 · ${N.chap}</div><h1>${N.chap}</h1><p>${N.intro}</p><h2>${N.dailyH}</h2><ul>${N.daily.map((x) => `<li>${x}</li>`).join('')}</ul><h2>${N.newH}</h2>`;
  for (const [id, shots] of PLAN) {
    const imgs = [];
    for (const s of shots) { const d = await small(`${HERE}shots/${lang}/${s}.jpg`); if (d) imgs.push(`<img src="${d}" alt="">`); }
    h += `<h3>${T.sec[id][0]}</h3>${T.sec[id][1]}${imgs.length ? `<div class="shots">${imgs.join('')}</div>` : ''}`;
  }
  h += `<p class="note">${T.shotsNote}</p>`;
  count[lang] = await pdf(h, `${TMP}news-${lang}.pdf`);
}
// 2) numéros de page : couverture + sommaire (2 pages), puis pour chaque langue la base puis ses nouveautés
let at = 3;
const toc = {};
for (const lang of LANGS) {
  const [s, e, ch] = BASE[lang];
  toc[lang] = ch.map(([t, p]) => [t, at + p - s]);
  at += e - s + 1;
  toc[lang].push([NEWS[lang].chap, at]);
  at += count[lang];
}
const total = at - 1;
const cover = `<div style="height:262mm;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center">
  <div style="background:#0f172a;border-radius:4mm;padding:10mm 16mm;width:150mm"><div style="color:#d4a017;font-size:30pt;font-weight:700;letter-spacing:6pt">INTERVENTIONS</div>
  <div style="color:#f1e7c6;font-size:10pt;margin-top:2mm">Gérances · Immobilières · Hôtels · Airbnb · Taxi</div></div>
  <div style="font-size:20pt;font-weight:700;color:#1e293b;margin-top:14mm">GESTION LOCATIVE &amp; INTERVENTIONS</div>
  <div style="font-size:15pt;color:#4338ca;margin-top:4mm">${NEWS.it.manual}</div>
  <div style="font-size:10.5pt;color:#64748b;margin-top:4mm">${LANGS.map((l) => NEWS[l].manual).filter((m, i) => i).join(' · ')}</div>
  <div style="font-size:10pt;color:#334155;margin-top:8mm">Gestione · Inquilini · Squadra · Gérance · Preventivi · Hotel · Airbnb · Taxi · Annunci · Licenze</div>
  <div style="font-size:9.5pt;color:#64748b;margin-top:6mm">Italiano · Français · Deutsch · English · Português · Español</div>
  <div style="font-size:9.5pt;color:#64748b;margin-top:2mm">v${VER}.0 · 10/2026 · ${total} pagine</div></div>`;
const tocHtml = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:6mm 8mm;font-size:8.6pt;line-height:1.35">${LANGS.map((l) => `<div><div style="font-weight:700;font-size:10.5pt;color:#4338ca;border-bottom:1.5px solid #c7d2fe;margin-bottom:1.5mm">${NEWS[l].lang}</div>${toc[l].map(([t, p]) => `<div style="display:flex;justify-content:space-between;gap:3mm;margin:1mm 0"><span>${t}</span><span>${p}</span></div>`).join('')}</div>`).join('')}</div>`;
await pdf(`${cover}<div style="break-before:page"></div>${tocHtml}`, `${TMP}front.pdf`);
await b.close();
await writeFile(`${TMP}plan.json`, JSON.stringify({ ver: VER, total, langs: LANGS.map((l) => ({ l, lang: NEWS[l].lang, manual: NEWS[l].manual, s: BASE[l][0], e: BASE[l][1], news: `${TMP}news-${l}.pdf` })) }));
const out = new URL(`../Manuel_INTERVENTIONS_6_langues_v${VER}.pdf`, import.meta.url).pathname;
execFileSync('/usr/bin/python3', [HERE + 'assemble.py', HERE + 'base-v2.150.pdf', `${TMP}front.pdf`, `${TMP}plan.json`, out], { stdio: 'inherit' });
console.log('📄', out, total, 'pages');
