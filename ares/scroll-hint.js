// Bandes qui défilent de côté (menu du bas, onglets, filtres, tableaux) : sur téléphone rien ne montre qu'il y a la suite.
// Indice discret : une petite flèche ‹ › collée au bord tant qu'il reste du contenu de ce côté (tableaux : un fondu),
// et la première fois une légère « poussée » de la bande (pas si l'appareil demande moins d'animations).
const FLEX = '.bottomnav, .chips, .tabs';
const BLOCK = '.scroll-x, [style*="overflow-x:auto"], [style*="overflow:auto"]';
const CSS = `
:is(${FLEX}).hs-r::after, :is(${FLEX}).hs-l::before {
  position: sticky; z-index: 2; flex: 0 0 22px; width: 22px; height: 22px; align-self: center; pointer-events: none;
  display: grid; place-items: center; border-radius: 50%; font: 700 16px/1 system-ui, sans-serif;
  background: var(--surface-3, #e7e4dc); color: var(--text-2, #69655c); box-shadow: 0 0 8px 4px var(--surface, #fff); opacity: .92;
}
:is(${FLEX}).hs-r::after { content: '›'; right: 2px; margin-left: -22px; }
:is(${FLEX}).hs-l::before { content: '‹'; left: 2px; margin-right: -22px; }
:is(${BLOCK}).hs-r { -webkit-mask-image: linear-gradient(to right, #000 calc(100% - 28px), transparent); mask-image: linear-gradient(to right, #000 calc(100% - 28px), transparent); }
:is(${BLOCK}).hs-l { -webkit-mask-image: linear-gradient(to left, #000 calc(100% - 28px), transparent); mask-image: linear-gradient(to left, #000 calc(100% - 28px), transparent); }
:is(${BLOCK}).hs-l.hs-r { -webkit-mask-image: linear-gradient(to right, transparent, #000 28px, #000 calc(100% - 28px), transparent); mask-image: linear-gradient(to right, transparent, #000 28px, #000 calc(100% - 28px), transparent); }`;

const peeked = new Set();
const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
function mark(el) {
  const max = el.scrollWidth - el.clientWidth;
  if (max <= 4) { el.classList.remove('hs-l', 'hs-r'); return; }
  el.classList.toggle('hs-l', el.scrollLeft > 4);
  el.classList.toggle('hs-r', el.scrollLeft < max - 4);
  // une seule « poussée » par sorte de bande et par session, pour montrer que ça glisse
  const kind = el.className.split(' ')[0] || 'x';
  let seen = false; try { seen = sessionStorage.getItem('hsPeek:' + kind) === '1'; } catch {}
  if (el.scrollLeft < 2 && !seen && !peeked.has(kind) && !calm() && el.offsetParent !== null) {
    peeked.add(kind); try { sessionStorage.setItem('hsPeek:' + kind, '1'); } catch {}
    setTimeout(() => { el.scrollBy({ left: 36, behavior: 'smooth' }); setTimeout(() => el.scrollBy({ left: -36, behavior: 'smooth' }), 450); }, 600);
  }
}
const all = () => document.querySelectorAll(`${FLEX}, ${BLOCK}`);
let raf = 0;
const scan = () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; all().forEach(mark); }); };

export function scrollHintInit() {
  const st = document.createElement('style'); st.textContent = CSS; document.head.append(st);
  document.addEventListener('scroll', (e) => { const el = e.target; if (el && el.nodeType === 1 && el.matches(`${FLEX}, ${BLOCK}`)) mark(el); }, true);
  addEventListener('resize', scan);
  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
  scan();
}
