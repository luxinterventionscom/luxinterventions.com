// 📅 Pubblicità : fasce orarie, week-end, posizione fissa o a rotazione, prezzo (pacchetti di lancio o prezzo al giorno per fascia).
// Usato dalla centrale e da tutte le app : stesso calcolo ovunque.
export const BANDS = [
  ['m', '06:00', '09:00'], ['m2', '09:01', '12:30'], ['a', '12:31', '17:00'],
  ['a2', '17:01', '20:30'], ['s', '20:31', '23:00'], ['n', '23:01', '05:59'],
];
export const BAND_KEYS = BANDS.map((b) => b[0]);
export const WE_DAYS = [4, 5, 6]; // jeudi, vendredi, samedi
export const SLOTS3 = ['haut', 'milieu', 'bas'];
// valeurs de départ (lancement) : modifiables dans la centrale (Annonces → Tarifs)
export const TARIF_DEF = {
  mode: 'pack', // 'pack' (lancement) ou 'band' (prix au jour par fascia, plus tard)
  pk_start: 19, pk_plus: 29, pk_max: 49, // € HT / mois
  pos_h: 33, pos_b: 33, // Haut +33 %, Bas −33 % ; Milieu et rotation = prix de base
  d_w: 13, d_m: 23, d_y: 33, // remises : en semaines, en mois, en années
  b_m: 0.99, b_m2: 1.99, b_a: 2.99, b_a2: 3.99, b_s: 4.99, b_n: 4.99, // € HT / jour par fascia (mode 'band')
  cap: 10, // annonces par position et par fascia (tours de 3 min dans un cycle de 30 min)
};
export const PACK_N = { start: 1, plus: 3, max: 6 };
const toMin = (hm) => { const [h, m] = String(hm).split(':').map(Number); return h * 60 + m; };
// fascia de cette minute (la nuit va de 23:01 à 05:59)
export function bandNow(d = new Date()) {
  const m = d.getHours() * 60 + d.getMinutes();
  for (const [k, a, b] of BANDS) { const x = toMin(a), y = toMin(b); if (x <= y ? m >= x && m <= y : m >= x || m <= y) return k; }
  return 'n';
}
// jour « de la fascia » : après minuit, la nuit appartient encore à la veille (samedi soir → dimanche 3 h = samedi)
const bandDay = (d) => { const k = bandNow(d); return k === 'n' && d.getHours() < 6 ? (d.getDay() + 6) % 7 : d.getDay(); };
// l'annonce a-t-elle le droit d'être montrée maintenant (fasce choisies, week-end) ?
export function pubLive(x, d = new Date()) {
  const bs = Array.isArray(x.bands) ? x.bands.filter((k) => BAND_KEYS.includes(k)) : [];
  if (bs.length && !bs.includes(bandNow(d))) return false;
  if (x.we && !WE_DAYS.includes(bandDay(d))) return false;
  return true;
}
// position de l'annonce maintenant : fixe, ou à rotation (change toutes les 30 min : haut → milieu → bas)
export const pubSlotNow = (x, d = new Date()) => (x.slot === 'rot' ? SLOTS3[Math.floor(d.getTime() / 1800000) % 3] : SLOTS3.includes(x.slot) ? x.slot : 'milieu');
// plusieurs annonces au même endroit : tour de 3 minutes chacune
export const pubPickNow = (list, d = new Date()) => (list.length ? list[Math.floor(d.getTime() / 180000) % list.length] : null);
// durée → jours et mois
export const durDays = (n, u) => { n = Math.max(1, Math.round(+n || 1)); return u === 'w' ? n * 7 : u === 'm' ? n * 30 : u === 'y' ? n * 365 : n; };
// prix HT d'une annonce (sans la création) : base × position × (week-end 3/7) × durée − remise
export function adPrice(f, tIn) {
  const t = { ...TARIF_DEF, ...(tIn || {}) }, u = ['d', 'w', 'm', 'y'].includes(f.du) ? f.du : 'm', n = Math.max(1, Math.round(+f.dn || 1));
  const bs = (f.bands || []).filter((k) => BAND_KEYS.includes(k));
  const monthBase = t.mode === 'band' ? bs.reduce((s, k) => s + (+t['b_' + k] || 0), 0) * 30 : +t['pk_' + (PACK_N[f.pack] ? f.pack : 'start')] || 0;
  const pos = f.slot === 'haut' ? 1 + (+t.pos_h || 0) / 100 : f.slot === 'bas' ? 1 - (+t.pos_b || 0) / 100 : 1;
  const months = durDays(n, u) / 30, disc = u === 'w' ? +t.d_w || 0 : u === 'm' ? +t.d_m || 0 : u === 'y' ? +t.d_y || 0 : 0;
  return Math.round(monthBase * pos * (f.we ? 3 / 7 : 1) * months * (1 - disc / 100) * 100) / 100;
}
