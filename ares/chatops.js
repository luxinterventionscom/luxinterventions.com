// Messages de la maison : messages privés 🔒, modification / suppression (15 min), accusés ✓ ✓✓ ✓✓ bleu.
// Tout reste dans le fil chiffré du logement :
//   message      { id, a, m, t, x }                       m = identifiant de l'habitant, ou 'mgr'
//   privé 🔒     { id, a, m, t, p, o, e }                 p = l'habitant concerné ; o = scellé pour le gestionnaire ; e = scellé avec la clé de l'espace de l'habitant
//   modifier     { k:'ed', r:id, m, t, x | p,o,e }        par l'auteur, dans les 15 min (aussi : rendre privé / public)
//   supprimer    { k:'del', r:id, m, t }                  par l'auteur dans les 15 min, ou par le gestionnaire
//   accusé       { k:'rd', m:'mgr', dl, rd, t }           dl = reçu par la centrale jusqu'au n° ; rd = lu jusqu'au n°
export const EDIT_MS = 15 * 60000;
const GRACE = 2 * 60000; // horloges de téléphones un peu décalées
export const editable = (m, now = Date.now()) => !m.del && now - Date.parse(m.t) < EDIT_MS;
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

// raw : messages déchiffrés, chacun avec son n° (n) ; rend { list, dl, rd, raw: records par message }
export function chatResolve(raw) {
  const base = [], ops = [];
  let mark = null;
  for (const m of raw) {
    if (m.k === 'rd') { if (m.m === 'mgr' && (!mark || cmp(m.n, mark.n) > 0)) mark = m; } else if (m.k === 'ed' || m.k === 'del') ops.push(m);
    else base.push({ ...m, id: m.id || m.n, recs: [m.n] });
  }
  const by = new Map();
  for (const m of base) if (!by.has(m.id)) by.set(m.id, m);
  for (const o of ops.sort((a, b) => cmp(a.n, b.n))) {
    const m = by.get(o.r);
    if (!m) continue;
    const mine = o.m === m.m && Date.parse(o.t) - Date.parse(m.t) < EDIT_MS + GRACE;
    if (o.k === 'del') { if (mine || o.m === 'mgr') { m.del = o.t; m.recs.push(o.n); } continue; }
    if (!mine || m.del) continue;
    (m.hist || (m.hist = [])).push({ x: m.x, p: m.p, o: m.o, e: m.e, t: m.et || m.t });
    m.x = o.x; m.p = o.p; m.o = o.o; m.e = o.e; m.et = o.t; m.recs.push(o.n);
  }
  const list = [...by.values()].sort((a, b) => cmp(a.t || '', b.t || '') || cmp(a.n, b.n));
  return { list, dl: mark ? mark.dl || '' : '', rd: mark ? mark.rd || '' : '', mark };
}

// Déchiffre les textes privés (message et anciennes versions) ; open(rec) → texte, ou null si ce n'est pas pour moi
export async function chatOpen(list, open) {
  const one = async (r) => { if (r.p && r.x == null) { try { r.x = await open(r); } catch { r.x = null; } } };
  for (const m of list) { await one(m); for (const h of m.hist || []) await one(h); }
  return list;
}

// ✓ envoyé · ✓✓ gris arrivé à la centrale · ✓✓ bleu lu par la centrale
export function tick(m, dl, rd) {
  if (rd && cmp(m.n, rd) <= 0) return '<span class="tk rd" aria-label="✓✓">✓✓</span>';
  if (dl && cmp(m.n, dl) <= 0) return '<span class="tk" aria-label="✓✓">✓✓</span>';
  return '<span class="tk" aria-label="✓">✓</span>';
}
export const newMsgId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
