// 🚗 L'ouvrier est en route : le même cadre (et la même petite étiquette) dans l'app du locataire, le portail et la central.
// Compte à rebours jusqu'à l'heure d'arrivée estimée sur son téléphone ; barre qui se remplit ; « petit retard » si l'heure recule.
const T = {
  fr: { go: '{n} est en route', who: 'L’intervenant', inm: 'arrivée dans {m} min', at: 'vers {h}', late: 'petit retard', soon: 'arrive dans un instant', here: '{n} est arrivé' },
  it: { go: '{n} è in arrivo', who: 'Il tecnico', inm: 'arriva tra {m} min', at: 'verso le {h}', late: 'piccolo ritardo', soon: 'arriva a momenti', here: '{n} è arrivato' },
  de: { go: '{n} ist unterwegs', who: 'Der Techniker', inm: 'Ankunft in {m} Min.', at: 'gegen {h}', late: 'kleine Verspätung', soon: 'kommt gleich an', here: '{n} ist angekommen' },
  en: { go: '{n} is on the way', who: 'The technician', inm: 'arriving in {m} min', at: 'around {h}', late: 'slight delay', soon: 'arriving any moment', here: '{n} has arrived' },
  pt: { go: '{n} está a caminho', who: 'O técnico', inm: 'chega dentro de {m} min', at: 'por volta das {h}', late: 'pequeno atraso', soon: 'está quase a chegar', here: '{n} chegou' },
  es: { go: '{n} está en camino', who: 'El técnico', inm: 'llega en {m} min', at: 'hacia las {h}', late: 'pequeño retraso', soon: 'llega en un momento', here: '{n} ha llegado' },
};
const LOC = { fr: 'fr-LU', it: 'it-IT', de: 'de-LU', en: 'en-GB', pt: 'pt-PT', es: 'es-ES' };
const CSS = `.trip-box{margin:0 0 12px;padding:12px 14px;border-radius:14px;border:2px solid #F97316;background:#FFF4EC;color:#1d1b16;animation:tripGlow 2.4s ease-in-out infinite}
.trip-box.here{border-color:#15803d;background:#ECFDF3;animation:none}
.trip-box b{font-weight:800}.trip-box .tm{display:block;margin-top:2px;font-size:14px}
.trip-line{position:relative;height:22px;margin:10px 14px 2px 8px}
.trip-line::before{content:'';position:absolute;left:0;right:0;top:9px;border-top:4px dotted rgba(249,115,22,.45)}
.trip-line .fill{position:absolute;left:0;top:9px;height:4px;border-radius:4px;background:#F97316;transition:width .6s}
.trip-line .s{position:absolute;left:-6px;top:5px;width:12px;height:12px;border-radius:50%;background:#F97316}
.trip-line .dot{position:absolute;top:2px;width:18px;height:18px;margin-left:-9px;border-radius:50%;background:#dc2626;border:3px solid #fff;box-shadow:0 0 0 2px #dc2626;transition:left .6s}
.trip-line .end{position:absolute;right:-14px;top:-1px;font-size:18px;line-height:1}
.trip-late{color:#b45309;font-weight:700}
.trip-tag{display:inline-block;padding:1px 8px;border-radius:999px;background:#FFF4EC;color:#c2410c;border:1px solid #F97316;font-size:12px;font-weight:700;white-space:nowrap}
.trip-tag.here{background:#ECFDF3;color:#15803d;border-color:#15803d}
@keyframes tripGlow{0%,100%{box-shadow:0 0 0 0 rgba(249,115,22,.35)}50%{box-shadow:0 0 0 6px rgba(249,115,22,0)}}
@media (prefers-reduced-motion:reduce){.trip-box{animation:none}}`;
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
let cssDone = false;
const HERE_MIN = 20; // « est arrivé » reste affiché 20 minutes

// rec : { st: 'go' | 'here' | 'stop', eta, e0, start, upd, n } (réponse du serveur) ; kind : 'box' (cadre) ou 'tag' (étiquette)
export function tripView(rec, { lang = 'fr', kind = 'box', now = Date.now() } = {}) {
  if (!rec || !['go', 'here'].includes(rec.st)) return '';
  if (rec.st === 'here' && now - (rec.upd || 0) > HERE_MIN * 60000) return '';
  if (rec.st === 'go' && now - (rec.eta || 0) > 90 * 60000) return ''; // trajet oublié : on n'affiche plus rien
  if (!cssDone && typeof document !== 'undefined') { const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st); cssDone = true; }
  const t = T[lang] || T.fr, n = rec.n || t.who;
  if (rec.st === 'here') return kind === 'tag' ? `<span class="trip-tag here">✅ ${esc(t.here.replace('{n}', n))}</span>` : `<div class="trip-box here" data-notr>✅ <b>${esc(t.here.replace('{n}', n))}</b></div>`;
  const m = Math.max(0, Math.ceil((rec.eta - now) / 60000)), late = rec.e0 && rec.eta > rec.e0 + 3 * 60000;
  const h = new Date(rec.eta).toLocaleTimeString(LOC[lang] || 'fr-LU', { hour: '2-digit', minute: '2-digit' });
  if (kind === 'tag') return `<span class="trip-tag">🚗 ${esc(n)} · ${m ? esc(m + ' min') : '…'}${late ? ' ⏳' : ''}</span>`;
  return `<div class="trip-box" data-notr>🚗 <b>${esc(t.go.replace('{n}', n))}</b>
    <span class="tm">${m ? esc(t.inm.replace('{m}', m)) + ' (' + esc(t.at.replace('{h}', h)) + ')' : esc(t.soon)}${late ? ` · <span class="trip-late">${esc(t.late)}</span>` : ''}</span>
    ${tripLine(rec, now)}</div>`;
}
// ●━━━━🔴┈┈┈┈✅ : départ, le point rouge « il est ici » avance avec le temps (pas le GPS), arrivée ;
// en retard, il s'arrête avant la fin
export function tripLine(rec, now = Date.now()) {
  if (!cssDone && typeof document !== 'undefined') { const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st); cssDone = true; }
  const pct = rec.start && rec.eta > rec.start ? Math.min(94, Math.max(3, Math.round(((now - rec.start) / (rec.eta - rec.start)) * 100))) : 50;
  return `<div class="trip-line" aria-hidden="true"><i class="s"></i><i class="fill" style="width:${pct}%"></i><i class="dot" style="left:${pct}%"></i><span class="end">✅</span></div>`;
}
// adresse du Worker : https://…/api/ares/ → https://…/api/
export async function tripFetch(api, tks) {
  if (!tks.length) return {};
  const r = await fetch(api + 'trips', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tks }), cache: 'no-store' });
  return r.ok ? (await r.json()).items || {} : {};
}
