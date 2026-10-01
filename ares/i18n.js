// Langue de l'app de gestion. Le français est la langue source : l'interface est écrite en français
// et traduite à l'affichage (textes, placeholders, titres), phrase par phrase, depuis ares/i18n/<langue>.js.
// Les données (noms, adresses, montants, notes) ne sont jamais traduites ; les impressions officielles
// (quittances, reçus : #print) restent en français.
export const LANGS = { fr: 'Français', it: 'Italiano', de: 'Deutsch', pt: 'Português', en: 'English', es: 'Español' };
export const LOCALES = { fr: 'fr-LU', it: 'it-IT', de: 'de-LU', pt: 'pt-PT', en: 'en-GB', es: 'es-ES' };
export function getLang() {
  try { const l = localStorage.getItem('aresLang'); if (l && LANGS[l]) return l; } catch { /* stockage indisponible */ }
  return 'fr';
}
export function setLang(l) {
  try { if (LANGS[l]) localStorage.setItem('aresLang', l); } catch { /* stockage indisponible */ }
}

const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
let exact = null, pats = [];
function build(rows) {
  exact = new Map();
  pats = [];
  for (const [fr, tr] of rows) {
    if (!tr || tr === fr) continue;
    if (!/\{\d+\}/.test(fr)) { exact.set(fr, tr); continue; }
    const parts = fr.split(/\{(\d+)\}/);
    let re = '^', key = '';
    const order = [];
    for (let i = 0; i < parts.length; i++) {
      // collé à un mot (ex. « demande{1} » pour le pluriel) : la partie variable peut être vide
      if (i % 2 === 0) { re += escRe(parts[i]); if (parts[i].trim().length > key.length) key = parts[i].trim(); } else { re += /[A-Za-zÀ-ÿ)]$/.test(parts[i - 1]) ? '(.*?)' : '(.+?)'; order.push(+parts[i]); }
    }
    // modèle court d'un seul mot (ex. « {0} mois ») : la partie variable doit contenir un chiffre, sinon on ne traduit pas
    pats.push({ re: new RegExp(re + '$'), order, tr, key, num: key.length < 14 && !/\s/.test(key) });
  }
  // les modèles les plus précis d'abord
  pats.sort((a, b) => b.key.length - a.key.length);
}
function tr1(s) {
  const e = exact.get(s);
  if (e != null) return e;
  for (const p of pats) {
    if (p.key && !s.includes(p.key)) continue;
    const m = p.re.exec(s);
    if (!m) continue;
    if (p.num && !m.slice(1).some((v) => /\d/.test(v))) continue;
    const vals = {};
    p.order.forEach((ph, i) => { const v = m[i + 1]; vals[ph] = (v.trim() && exact.get(v.trim())) ?? v; });
    return p.tr.replace(/\{(\d+)\}/g, (_, k) => vals[k] ?? '');
  }
  return null;
}
const SEPS = [' · ', ' — ', ' : ', ' → '];
function trText(s, depth = 0) {
  const r = tr1(s);
  if (r != null) return r;
  if (depth > 3) return null;
  // symboles autour de la phrase (« 🔴 Urgent », « — Hall d’entrée », « Mme Rossi · »)
  const m = /^([^A-Za-zÀ-ÿ0-9]*)(.*?)([^A-Za-zÀ-ÿ0-9.…?!)]*)$/.exec(s);
  if (m && (m[1] || m[3]) && m[2]) { const t = trText(m[2], depth + 1); if (t != null) return m[1] + t + m[3]; }
  for (const sep of SEPS) {
    if (!s.includes(sep)) continue;
    const parts = s.split(sep);
    let changed = false;
    const out = parts.map((x) => { const t = x.trim() ? trText(x.trim(), depth + 1) : null; if (t != null) { changed = true; return x.replace(x.trim(), t); } return x; });
    if (changed) return out.join(sep);
  }
  return null;
}
export function translate(s) {
  if (!exact || !s) return s;
  const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s);
  const core = m[2].replace(/\s+/g, ' ');
  if (!core || !/[A-Za-zÀ-ÿ]/.test(core)) return s;
  const t = trText(core);
  return t == null ? s : m[1] + t + m[3];
}

const SKIP = '#print, script, style, textarea, [data-notr]';
const ATTRS = ['placeholder', 'title', 'aria-label'];
const done = new WeakMap();
function doText(n) {
  const p = n.parentElement;
  if (!p || p.closest(SKIP)) return;
  const v = n.nodeValue;
  if (done.get(n) === v) return;
  const t = translate(v);
  if (t !== v) n.nodeValue = t;
  done.set(n, n.nodeValue);
}
function doEl(el) {
  // les attributs d'un champ texte (placeholder…) se traduisent, pas son contenu
  if (el.closest('#print, script, style, [data-notr]')) return;
  for (const a of ATTRS) {
    const v = el.getAttribute(a);
    if (!v) continue;
    const t = translate(v);
    if (t !== v) el.setAttribute(a, t);
  }
}
function walk(root) {
  if (root.nodeType === 3) return doText(root);
  if (root.nodeType !== 1) return;
  doEl(root);
  if (root.closest(SKIP)) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let n;
  while ((n = w.nextNode())) { if (n.nodeType === 3) doText(n); else doEl(n); }
}
// load : autre dictionnaire que celui de l'app de gestion (ex. le portail gérance)
export async function startI18n(lang, load) {
  document.documentElement.lang = lang;
  if (lang === 'fr') return;
  try { build((await (load ? load(lang) : import(`./i18n/${lang}.js`))).default); } catch { return; }
  walk(document.body);
  new MutationObserver((ms) => {
    for (const m of ms) {
      if (m.type === 'characterData') doText(m.target);
      else if (m.type === 'attributes') doEl(m.target);
      else m.addedNodes.forEach(walk);
    }
  }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}
