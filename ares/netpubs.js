// 📣 Annonces du réseau : validées par la centrale LuxInterventions, publiées sur une liste publique (publicité, rien de personnel).
// Lues par les apps des locataires et clients des centrales des clients, et par l'app des annonceurs (les annonces des autres).
let cache = null, at = 0, busy = null;
export function netPubsGet(api) {
  if (cache && Date.now() - at < 10 * 60000) return Promise.resolve(cache);
  if (!busy) {
    busy = fetch(String(api || '').replace(/\/$/, '') + '/api/netpubs')
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((j) => { cache = Array.isArray(j.items) ? j.items : []; at = Date.now(); return cache; })
      .catch(() => cache || [])
      .finally(() => { busy = null; });
  }
  return busy;
}
// 📍 Qui voit l'annonce : zone = « vis:<mode>;p:<pays>;c:<ville>;k:<km>;g:<lat>,<lon> » (mode : vide = partout, pays, ville, km).
// Une zone d'avant (texte libre) = partout. Lieu du lecteur : { ville, pays, geo:[lat,lon], txt } ou simple texte d'adresse.
// Pays, ville ou position inconnus du côté du lecteur → il voit l'annonce.
const nrm = (x) => String(x || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
export function visParse(zone) {
  const z = String(zone || '');
  if (!z.startsWith('vis:')) return { m: '' };
  const o = {};
  for (const kv of z.split(';')) { const i = kv.indexOf(':'); if (i > 0) o[kv.slice(0, i)] = kv.slice(i + 1); }
  const g = String(o.g || '').split(',').map(Number);
  return { m: ['pays', 'ville', 'km'].includes(o.vis) ? o.vis : '', p: String(o.p || '').toUpperCase(), c: o.c || '', k: +o.k || 0, g: g.length === 2 && g.every(Number.isFinite) ? g : null };
}
export const visZone = (m, p, c, k, g) => (m ? `vis:${m};p:${String(p || '').toUpperCase()};c:${String(c || '').replace(/[;:]/g, ' ').trim()};k:${+k || 0}${g ? `;g:${g[0]},${g[1]}` : ''}`.slice(0, 200) : '');
export const kmBetween = (a, b) => { const r = Math.PI / 180, x = Math.sin(((b[0] - a[0]) * r) / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(((b[1] - a[1]) * r) / 2) ** 2; return 12742 * Math.asin(Math.sqrt(x)); };
export const zoneOk = (a, where) => {
  const v = visParse(a.zone);
  if (!v.m) return true;
  const w = where && typeof where === 'object' ? where : { txt: String(where || '') };
  if (v.m === 'pays') return !v.p || !w.pays || String(w.pays).toUpperCase() === v.p;
  if (v.m === 'ville') { if (w.pays && v.p && String(w.pays).toUpperCase() !== v.p) return false; const t = nrm(`${w.ville || ''} ${w.txt || ''}`), c = nrm(v.c); return !c || !t || (' ' + t + ' ').includes(' ' + c + ' '); }
  const g = Array.isArray(w.geo) && w.geo.length === 2 && w.geo.every(Number.isFinite) ? w.geo : null;
  return !v.g || !g || !v.k || kmBetween(v.g, g) <= v.k;
};
// aud : 'loc' (locataires), 'hote' (clients hôtel / Airbnb)… ou '' (toutes) ; skip : identifiants à ne pas montrer (ses propres annonces)
export const netPubsFor = (items, aud, where, skip = []) => (items || []).filter((a) => (!aud || (a.aud || []).includes(aud)) && !skip.includes(a.id) && zoneOk(a, where));
