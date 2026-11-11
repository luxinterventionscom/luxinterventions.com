// 📰 Barre « News » (titres de L'essentiel, lus par le Worker) : chiude di base, si apre al tocco, schede Luxembourg / Monde / Sport / Tout.
// Solo titolo, ora e link verso l'articolo sul sito del giornale. Se il Worker non ha ancora /api/news, la barra non compare.
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
    <b style="flex:none;color:#DC2626">📰 News</b><span style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:14px">${st.open ? 'L’essentiel' : `<span data-nwx="${esc(first.t)}">${esc(first.t)}</span>`}</span><span style="flex:none;opacity:.6">${st.open ? '✕' : '▾'}</span></button>
  ${st.open ? `<div style="padding:0 12px 10px"><div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">${tabs.map(([k, v]) => `<button type="button" data-news-f="${k}" style="border:1px solid ${k === st.f ? '#DC2626' : 'rgba(127,127,127,.35)'};background:${k === st.f ? '#DC2626' : 'transparent'};color:${k === st.f ? '#fff' : 'inherit'};border-radius:999px;padding:4px 10px;font:inherit;font-size:13px;cursor:pointer">${v}</button>`).join('')}</div>
    ${!list ? '<p style="margin:6px 0;opacity:.6;font-size:13px">…</p>' : list.length ? list.slice(0, 10).map((a) => `<a href="${esc(a.u)}" target="_blank" rel="noopener" style="display:flex;gap:8px;padding:7px 0;border-top:1px solid rgba(127,127,127,.2);color:inherit;text-decoration:none;font-size:14px;line-height:1.3"><span style="flex:none;opacity:.6;font-size:12px;min-width:38px">${esc(hm(a.d))}</span><span data-nwx="${esc(a.t)}">${esc(a.t)}</span></a>`).join('') : '<p style="margin:6px 0;opacity:.6;font-size:13px">—</p>'}
    <p style="margin:6px 0 0;font-size:11px;opacity:.55">Source : L’essentiel (lessentiel.lu)</p>
    <p style="margin:10px 0 4px;font-size:13px;font-weight:700">📈 Bourses européennes</p><div class="ticker-eu" style="height:76px;overflow:hidden;border-radius:10px"><iframe src="${esc(st.api)}/ticker?m=eu" title="Bourses" loading="lazy" referrerpolicy="no-referrer" scrolling="no" style="width:100%;height:100%;border:0;display:block"></iframe></div></div>` : ''}`;
}
// 🌐 les titres suivent la langue de l'app (pas le 🌐 des chats) : traduits une fois, gardés sur le téléphone
const NL = ['fr', 'it', 'de', 'pt', 'en', 'es'], nwBusy = {};
const nwLang = () => { const l = String(document.documentElement.lang || 'fr').slice(0, 2); return NL.includes(l) ? l : 'fr'; };
const nwGet = (l) => { try { return JSON.parse(localStorage.getItem('newsTr:' + l) || '{}'); } catch { return {}; } };
const nwSet = (l, c) => { const ks = Object.keys(c); if (ks.length > 300) for (const k of ks.slice(0, ks.length - 300)) delete c[k]; try { localStorage.setItem('newsTr:' + l, JSON.stringify(c)); } catch { /* plein */ } };
function nwPaint() {
  const l = nwLang(), c = l === 'fr' ? {} : nwGet(l);
  for (const el of document.querySelectorAll('[data-nwx]')) { const x = el.dataset.nwx, v = c[x] || x; if (el.textContent !== v) el.textContent = v; }
}
async function nwTr() {
  nwPaint();
  const l = nwLang();
  if (l === 'fr' || nwBusy[l] || !st.api) return;
  const c = nwGet(l), miss = [...new Set([...document.querySelectorAll('[data-nwx]')].map((el) => el.dataset.nwx).filter((x) => x && !c[x]))].slice(0, 8);
  if (!miss.length) return;
  nwBusy[l] = true;
  try {
    const r = await fetch(st.api + '/api/tr', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ q: miss, to: l }) });
    if (r.ok) { const j = await r.json(), c2 = nwGet(l); miss.forEach((x, i) => { const v = (j.t || [])[i]; if (v && v.t) c2[x] = String(v.t); }); nwSet(l, c2); nwBusy[l] = false; nwPaint(); if (miss.length === 8) setTimeout(nwTr, 1500); return; }
  } catch { /* hors ligne */ }
  nwBusy[l] = false;
}
function paint() {
  const h = inner();
  // la barre des bourses n'est pas rechargée à chaque changement d'onglet
  document.querySelectorAll('.newsbar').forEach((el) => { const keep = el.querySelector('.ticker-eu iframe'); el.innerHTML = h; el.hidden = !h; const box = el.querySelector('.ticker-eu'); if (keep && box) box.replaceChildren(keep); });
  nwTr();
}
let bound = false;
// HTML de la barre à placer dans la page (au-dessus de la barre crypto) ; api = adresse du Worker
export function newsHtml(api) {
  st.api = String(api || '').replace(/\/$/, '');
  if (!bound) {
    bound = true;
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
  return `<div class="newsbar card" style="padding:0;margin:0 0 14px;overflow:hidden;border-left:4px solid #DC2626"${h ? '' : ' hidden'}>${h}</div>`;
}
