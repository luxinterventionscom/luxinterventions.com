// « Tirer pour actualiser » (comme dans les apps des stores) : en haut de la page, on tire vers le bas avec le doigt,
// un rond ↻ se remplit ; au-delà du seuil on lâche → l'app recharge ses données (refresh), puis « ✓ ».
// Ne se déclenche pas au milieu de la page, dans une fenêtre ouverte, une carte ou une bande qui défile de côté.
const T = {
  fr: ['Tirez pour actualiser', 'Relâchez pour actualiser', 'À jour'],
  it: ['Tira per aggiornare', 'Rilascia per aggiornare', 'Aggiornato'],
  de: ['Ziehen zum Aktualisieren', 'Loslassen zum Aktualisieren', 'Aktuell'],
  en: ['Pull to refresh', 'Release to refresh', 'Up to date'],
  pt: ['Puxe para atualizar', 'Solte para atualizar', 'Atualizado'],
  es: ['Desliza para actualizar', 'Suelta para actualizar', 'Actualizado'],
};
const MAX = 90, GO = 64;
const CSS = `.ptr{position:fixed;left:50%;top:calc(env(safe-area-inset-top) + 6px);z-index:9000;display:flex;align-items:center;gap:8px;padding:6px 12px 6px 6px;border-radius:999px;
  background:#fff;color:#1d1b16;box-shadow:0 4px 14px rgba(0,0,0,.18);font:600 13px/1 system-ui,sans-serif;transform:translate(-50%,-70px);opacity:0;pointer-events:none;transition:opacity .15s}
.ptr.on{opacity:1}.ptr.back{transition:transform .25s,opacity .25s}
.ptr i{display:grid;place-items:center;width:28px;height:28px;border-radius:50%;font-style:normal;font-size:17px;color:#fff;background:#8a8478}
.ptr.go i{background:#4f46e5}.ptr.spin i{animation:ptrSpin .8s linear infinite;background:#4f46e5}.ptr.ok i{background:#15803d}
@keyframes ptrSpin{to{transform:rotate(360deg)}}`;

const blocked = (el) => !el || !!el.closest('dialog, [role=dialog], .sheet, #sheet, iframe, input, textarea, select, .chips, .tabs, .bottomnav, .scroll-x, .map, [data-no-ptr]');
const anyOpen = () => !!document.querySelector('dialog[open], #sheet.open, .sheet-open');

export function pullRefreshInit({ refresh, lang = () => 'fr' }) {
  const st = document.createElement('style'); st.textContent = CSS; document.head.append(st);
  const box = document.createElement('div'); box.className = 'ptr'; box.setAttribute('aria-live', 'polite'); box.innerHTML = '<i>↻</i><span></span>';
  document.body.append(box);
  const txt = box.querySelector('span'), ico = box.querySelector('i');
  let y0 = null, x0 = 0, d = 0, busy = false;
  const tx = () => T[lang()] || T.fr;
  const show = (dist) => {
    const p = Math.min(dist, MAX);
    box.classList.remove('back'); box.classList.toggle('on', p > 8); box.classList.toggle('go', p >= GO);
    box.style.transform = `translate(-50%, ${p - 60}px)`; ico.style.transform = `rotate(${p * 4}deg)`;
    txt.textContent = tx()[p >= GO ? 1 : 0];
  };
  const hide = () => { box.classList.add('back'); box.classList.remove('on', 'go', 'spin', 'ok'); box.style.transform = 'translate(-50%,-70px)'; };
  addEventListener('touchstart', (e) => {
    if (busy || e.touches.length !== 1 || (document.scrollingElement || document.documentElement).scrollTop > 0 || anyOpen() || blocked(e.target)) { y0 = null; return; }
    y0 = e.touches[0].clientY; x0 = e.touches[0].clientX; d = 0;
  }, { passive: true });
  addEventListener('touchmove', (e) => {
    if (y0 == null) return;
    const dy = e.touches[0].clientY - y0, dx = Math.abs(e.touches[0].clientX - x0);
    if (dy <= 0 || dx > dy) { if (d) hide(); y0 = d > 0 ? y0 : null; d = 0; return; }
    d = dy * 0.5; show(d);
    if (e.cancelable) e.preventDefault(); // pas de rebond de la page pendant qu'on tire
  }, { passive: false });
  addEventListener('touchend', async () => {
    if (y0 == null) return;
    y0 = null;
    if (d < GO) { hide(); d = 0; return; }
    d = 0; busy = true;
    box.classList.add('spin'); box.style.transform = 'translate(-50%, 4px)'; txt.textContent = '…'; ico.style.transform = '';
    try { await refresh(); } catch { /* hors ligne : on garde ce qu'on a */ }
    box.classList.remove('spin'); box.classList.add('ok'); ico.textContent = '✓'; txt.textContent = tx()[2];
    setTimeout(() => { hide(); ico.textContent = '↻'; busy = false; }, 900);
  });
}
