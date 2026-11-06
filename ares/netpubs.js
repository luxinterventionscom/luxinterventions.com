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
// zone vide = tout le Luxembourg ; sinon une des localités doit se trouver dans l'adresse
export const zoneOk = (a, where) => {
  const z = String(a.zone || '').toLowerCase().split(',').map((x) => x.trim()).filter(Boolean);
  if (!z.length) return true;
  const w = String(where || '').toLowerCase();
  return z.some((x) => w.includes(x));
};
// aud : 'loc' (locataires), 'hote' (clients hôtel / Airbnb)… ou '' (toutes) ; skip : identifiants à ne pas montrer (ses propres annonces)
export const netPubsFor = (items, aud, where, skip = []) => (items || []).filter((a) => (!aud || (a.aud || []).includes(aud)) && !skip.includes(a.id) && zoneOk(a, where));
