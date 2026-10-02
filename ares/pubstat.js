// Statistiques anonymes des annonces : « vue » (une fois par jour et par téléphone) et toucher (carte, appel, site, vidéo).
// Rien d'autre n'est envoyé : ni nom, ni adresse, ni identifiant du téléphone.
const queue = [];
let timer = null, cfg = null;
const flush = () => {
  timer = null;
  if (!cfg || !queue.length) return;
  const body = JSON.stringify({ app: cfg.app, lang: cfg.lang(), items: queue.splice(0, 10) });
  try {
    const ok = navigator.sendBeacon && navigator.sendBeacon(cfg.base + '/api/pubstat', new Blob([body], { type: 'text/plain' }));
    if (!ok) fetch(cfg.base + '/api/pubstat', { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'text/plain' } }).catch(() => {});
  } catch { /* hors ligne */ }
  if (queue.length) timer = setTimeout(flush, 300);
};
const push = (id, ev) => { if (!cfg || !id) return; queue.push({ id, ev }); if (!timer) timer = setTimeout(flush, ev === 'v' ? 1500 : 0); };
// base : adresse du Worker ; app : 'loc' | 'eq' | 'ptl' ; lang : fonction qui rend la langue affichée
export function pubStatInit(base, app, lang) { cfg = { base: base.replace(/\/$/, ''), app, lang }; }
export function pubSeen(root) {
  const day = new Date().toISOString().slice(0, 10), k = 'pubSeen:' + (cfg ? cfg.app : '');
  let seen = {};
  try { seen = JSON.parse(localStorage.getItem(k) || '{}'); } catch { /* stockage indisponible */ }
  if (seen.d !== day) seen = { d: day, ids: [] };
  for (const el of (root || document).querySelectorAll('[data-pid]')) {
    const id = el.dataset.pid;
    if (!seen.ids.includes(id)) { seen.ids.push(id); push(id, 'v'); }
  }
  try { localStorage.setItem(k, JSON.stringify(seen)); } catch { /* stockage plein */ }
}
// à brancher sur un écouteur de clic (phase de capture) : compte les touchers sur les boutons des annonces
export function pubTap(e) {
  const b = e.target.closest('[data-pev]');
  if (!b) return;
  const box = b.closest('[data-pid]');
  if (box) push(box.dataset.pid, b.dataset.pev);
}
