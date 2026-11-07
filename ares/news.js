// 📰 Barre « News » (titres de L'essentiel, lus par le Worker) : chiude di base, si apre al tocco, schede Luxembourg / Monde / Sport / Tout.
// Solo titolo, ora e link verso l'articolo sul sito del giornale. Se il Worker non ha ancora /api/news, la barra non compare.
import { trInit, trReady, trButton } from '/ares/chattr.js';
const TABS = [['lux', '🇱🇺 Luxembourg'], ['monde', '🌍 Monde'], ['sport', '⚽ Sport'], ['all', '📰 Tout']];
const st = { api: '', open: false, f: 'lux', data: {}, at: {}, busy: {} };
const esc = (x) => String(x ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const hm = (d) => { const t = Date.parse(d); if (!Number.isFinite(t)) return ''; const x = new Date(t), same = x.toDateString() === new Date().toDateString(); return same ? x.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : x.toLocaleDateString([], { day: '2-digit', month: '2-digit' }); };
function load(f) {
  if (!st.api || st.busy[f] || (st.data[f] && Date.now() - (st.at[f] || 0) < 10 * 60000)) return;
  st.busy[f] = true;
  fetch(st.api + '/api/news?f=' + f).then((r) => (r.ok ? r.json() : { items: [] })).then((j) => { st.data[f] = Array.isArray(j.items) ? j.items : []; })
    .catch(() => { st.data[f] = st.data[f] || []; })
    .finally(() => { st.at[f] = Date.now(); st.busy[f] = false; paint(); });
}
function inner() {
  const lux = st.data.lux || [], all = st.data.all || [], first = (lux[0] || all[0]);
  if (!first) return '';
  const tabs = TABS.filter(([k]) => k === st.f || (st.data[k] ? st.data[k].length : true));
  const list = st.data[st.f];
  return `<button type="button" data-news-t="1" style="all:unset;box-sizing:border-box;display:flex;align-items:center;gap:8px;width:100%;cursor:pointer;padding:10px 12px">
    <b style="flex:none;color:#DC2626">📰 News</b><span style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:14px">${st.open ? 'L’essentiel' : `<span data-trx="${esc(first.t)}">${esc(first.t)}</span>`}</span><span style="flex:none;opacity:.6">${st.open ? '✕' : '▾'}</span></button>
  ${st.open ? `<div style="padding:0 12px 10px"><div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">${tabs.map(([k, v]) => `<button type="button" data-news-f="${k}" style="border:1px solid ${k === st.f ? '#DC2626' : 'rgba(127,127,127,.35)'};background:${k === st.f ? '#DC2626' : 'transparent'};color:${k === st.f ? '#fff' : 'inherit'};border-radius:999px;padding:4px 10px;font:inherit;font-size:13px;cursor:pointer">${v}</button>`).join('')}${trButton()}</div>
    ${!list ? '<p style="margin:6px 0;opacity:.6;font-size:13px">…</p>' : list.length ? list.slice(0, 10).map((a) => `<a href="${esc(a.u)}" target="_blank" rel="noopener" style="display:flex;gap:8px;padding:7px 0;border-top:1px solid rgba(127,127,127,.2);color:inherit;text-decoration:none;font-size:14px;line-height:1.3"><span style="flex:none;opacity:.6;font-size:12px;min-width:38px">${esc(hm(a.d))}</span><span data-trx="${esc(a.t)}">${esc(a.t)}</span></a>`).join('') : '<p style="margin:6px 0;opacity:.6;font-size:13px">—</p>'}
    <p style="margin:6px 0 0;font-size:11px;opacity:.55">Source : L’essentiel (lessentiel.lu)</p></div>` : ''}`;
}
function paint() {
  const h = inner();
  document.querySelectorAll('.newsbar').forEach((el) => { el.innerHTML = h; el.hidden = !h; });
}
let bound = false;
// HTML de la barre à placer dans la page (au-dessus de la barre crypto) ; api = adresse du Worker
export function newsHtml(api) {
  st.api = String(api || '').replace(/\/$/, '');
  if (!bound) {
    bound = true;
    const css = document.createElement('style'); css.textContent = '.newsbar [data-news-t] .tr-o{display:none}.newsbar .tr-o{font-size:11px}'; document.head.append(css);
    if (!trReady()) trInit(st.api, () => String(document.documentElement.lang || 'fr').slice(0, 2));
    document.addEventListener('click', (e) => {
      const t = e.target.closest && e.target.closest('[data-news-t]'), f = e.target.closest && e.target.closest('[data-news-f]');
      if (t) { e.preventDefault(); e.stopPropagation(); st.open = !st.open; if (st.open) load(st.f); paint(); }
      else if (f) { e.preventDefault(); e.stopPropagation(); st.f = f.dataset.newsF; load(st.f); paint(); }
    }, true);
    for (const [k] of TABS) if (k !== 'lux') setTimeout(() => load(k), 4000);
  }
  load('lux'); load('all');
  setTimeout(paint, 0);
  const h = inner();
  return `<div class="newsbar card" style="padding:0;margin:14px 0 0;overflow:hidden;border-left:4px solid #DC2626"${h ? '' : ' hidden'}>${h}</div>`;
}
