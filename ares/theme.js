// 🎨 Thème des apps (locataires, équipe / chauffeurs, clients d'hôtel, taxis, annonceurs) :
// ☀️ clair · 🌙 sombre · 🌗 auto (suit le téléphone ; pour les chauffeurs : sombre aussi la nuit, 19 h – 7 h)
// + la couleur du client (celle de son logo) + les couleurs communes (vert = fait, gris = attente, rouge = urgent,
// jaune = porte / clés, bleu = app / codes, violet = paiements). Choix gardé sur ce téléphone.
const K = 'appTheme';
let night = false, inited = false;
const get = () => { try { return localStorage.getItem(K) || 'auto'; } catch { return 'auto'; } };
const set = (v) => { try { localStorage.setItem(K, v); } catch { /* stockage indisponible */ } };
const ICON = { auto: '🌗', light: '☀️', dark: '🌙' };
export const themeBtn = () => `<button type="button" class="thbtn" data-theme-btn="1" aria-label="☀️ / 🌙">${ICON[get()] || '🌗'}</button>`;
function apply() {
  const t = get(), h = new Date().getHours();
  const dark = t === 'dark' || (t === 'auto' && ((window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches) || (night && (h >= 19 || h < 7))));
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}
export function themeInit(opts = {}) {
  night = !!opts.night;
  if (inited) return apply();
  inited = true;
  const st = document.createElement('style');
  st.textContent = `:root{--c-ok:#16a34a;--c-wait:#9ca3af;--c-urg:#dc2626;--c-door:#f59e0b;--c-app:#3b82f6;--c-pay:#8b5cf6}
.thbtn{border:0;background:rgba(127,127,127,.14);border-radius:999px;padding:4px 9px;font-size:15px;cursor:pointer;line-height:1.2}
html[data-theme=dark]{filter:invert(.92) hue-rotate(180deg);background:#111}
html[data-theme=dark] img,html[data-theme=dark] video,html[data-theme=dark] iframe,html[data-theme=dark] canvas,html[data-theme=dark] svg,html[data-theme=dark] .map,html[data-theme=dark] .no-inv{filter:invert(1) hue-rotate(180deg)}`;
  document.head.append(st);
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('[data-theme-btn]');
    if (!b) return;
    const t = get(), n = t === 'auto' ? 'light' : t === 'light' ? 'dark' : 'auto';
    set(n); apply();
    document.querySelectorAll('[data-theme-btn]').forEach((x) => { x.textContent = ICON[n]; });
  });
  if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', apply);
  setInterval(apply, 10 * 60000);
  apply();
}
export const themeNight = (v) => { night = !!v; apply(); };
// couleur du client (« #rrggbb ») : boutons, titres, liens de l'app
export function themeAccent(c) {
  if (!/^#[0-9a-f]{6}$/i.test(c || '')) return;
  document.documentElement.style.setProperty('--accent', c);
}
