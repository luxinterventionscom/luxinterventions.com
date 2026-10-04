// Carte « Météo · Radio » partagée (app de l'équipe, Portail gérance) — même principe que l'app des locataires :
// météo de 7 jours (Open-Meteo : gratuit, sans clé, sans cookie), choix d'une capitale, radio par défaut (Seven Radio)
// ou celle que la personne colle (gardée sur son téléphone). Carte pliable, état mémorisé.
const TX = {
  fr: { t: 'Météo', r: 'Radio', now: 'Maintenant', change: 'Changer de radio', ph: 'Collez le lien de votre radio (site ou flux audio)', save: 'Enregistrer', back: 'Revenir à', on: 'en écoute', ext: 's’ouvre sur son site', pl: 'lecteur officiel', none: 'Météo indisponible pour le moment.' },
  it: { t: 'Meteo', r: 'Radio', now: 'Adesso', change: 'Cambia radio', ph: 'Incolla il link della tua radio (sito o flusso audio)', save: 'Salva', back: 'Torna a', on: 'in ascolto', ext: 'si apre sul suo sito', pl: 'lettore ufficiale', none: 'Meteo non disponibile al momento.' },
  de: { t: 'Wetter', r: 'Radio', now: 'Jetzt', change: 'Radio wechseln', ph: 'Link Ihres Radios einfügen (Website oder Audiostream)', save: 'Speichern', back: 'Zurück zu', on: 'läuft', ext: 'öffnet sich auf seiner Website', pl: 'offizieller Player', none: 'Wetter derzeit nicht verfügbar.' },
  pt: { t: 'Meteorologia', r: 'Rádio', now: 'Agora', change: 'Mudar de rádio', ph: 'Cole o link da sua rádio (site ou fluxo áudio)', save: 'Guardar', back: 'Voltar a', on: 'a tocar', ext: 'abre no seu site', pl: 'leitor oficial', none: 'Meteorologia indisponível de momento.' },
  en: { t: 'Weather', r: 'Radio', now: 'Now', change: 'Change radio', ph: 'Paste your radio link (website or audio stream)', save: 'Save', back: 'Back to', on: 'playing', ext: 'opens on its website', pl: 'official player', none: 'Weather not available right now.' },
  es: { t: 'Tiempo', r: 'Radio', now: 'Ahora', change: 'Cambiar de radio', ph: 'Pega el enlace de tu radio (web o flujo de audio)', save: 'Guardar', back: 'Volver a', on: 'sonando', ext: 'se abre en su web', pl: 'reproductor oficial', none: 'Tiempo no disponible por ahora.' },
};
const LOCS = { fr: 'fr-LU', it: 'it-IT', de: 'de-LU', pt: 'pt-PT', en: 'en-GB', es: 'es-ES' };
const CITIES = { lu: ['🇱🇺', 'Luxembourg', 49.61, 6.13], fr: ['🇫🇷', 'Paris', 48.86, 2.35], de: ['🇩🇪', 'Berlin', 52.52, 13.41], gb: ['🇬🇧', 'London', 51.51, -0.13], it: ['🇮🇹', 'Roma', 41.9, 12.5], pt: ['🇵🇹', 'Lisboa', 38.72, -9.14], es: ['🇪🇸', 'Madrid', 40.42, -3.7] };
export const RADIO_DEFAULT = { nom: 'Seven Radio', url: 'https://sevenradio.lu/?proradio-popup=1' };
const ICON = (c) => (c === 0 ? '☀️' : c <= 2 ? '🌤️' : c === 3 ? '☁️' : c <= 48 ? '🌫️' : c <= 57 ? '🌦️' : c <= 67 ? '🌧️' : c <= 77 ? '❄️' : c <= 82 ? '🌧️' : c <= 86 ? '🌨️' : '⛈️');
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const ls = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* stockage indisponible */ } } };


const CSS = `.wxr-card{background:var(--card,var(--surface,#fff));border:1px solid var(--line,var(--border,#e5e2da));border-radius:16px;padding:12px 14px;margin:12px 0}
.wxr-card>summary{list-style:none;cursor:pointer;display:flex;flex-wrap:wrap;align-items:center;gap:4px 10px;position:relative;padding-right:24px}
.wxr-card>summary::-webkit-details-marker{display:none}
.wxr-card>summary::after{content:"›";position:absolute;right:2px;top:-2px;font-size:22px;color:var(--muted,var(--text-3,#888));transition:transform .25s}
.wxr-card[open]>summary::after{transform:rotate(90deg)}
.wxr-h{font-weight:800;font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted,var(--text-2,#555))}
.wxr-sum{font-size:13px;color:var(--muted,var(--text-3,#888))}
.wxr-card[open] .wxr-sum{display:none}
.wxr-wx{margin-top:10px}
.wxr-now{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}
.wxr-big{font-size:26px;font-weight:800;white-space:nowrap}
.wxr-city{font:inherit;font-size:14px;padding:4px 8px;border:1px solid var(--line,var(--border,#ddd));border-radius:999px;background:var(--card,var(--surface,#fff));color:inherit;max-width:min(62%,260px);min-width:0}
.wxr-days{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px}
.wxr-d{display:flex;flex-direction:column;align-items:center;gap:1px;padding:6px 2px;border-radius:10px;background:var(--bg,#f5f4f0);font-size:13px}
.wxr-d span{font-size:20px;line-height:1.2}.wxr-d small{color:var(--muted,var(--text-3,#888));font-size:11px}
.wxr-d.today{outline:1.5px solid color-mix(in srgb,var(--accent,#4f46e5) 45%,transparent);background:color-mix(in srgb,var(--accent,#4f46e5) 12%,transparent)}
.wxr-rain{color:#2563eb!important}.wxr-meta{color:var(--muted,var(--text-3,#888));font-size:13px;margin:0}
.wxr-radio{display:flex;align-items:center;gap:12px;margin-top:12px;padding-top:12px;border-top:1px solid var(--line,var(--border,#e5e2da))}
.wxr-grow{flex:1;min-width:0}
.wxr-play{width:48px;height:48px;flex:none;border-radius:50%;border:0;background:var(--accent,#4f46e5);color:#fff;font-size:20px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.15)}
.wxr-play.on{background:#16a34a;animation:wxrp 1.6s ease-in-out infinite}@keyframes wxrp{50%{box-shadow:0 0 0 7px rgba(22,163,74,.18)}}
.wxr-more{margin-top:10px}.wxr-more>summary{cursor:pointer;color:var(--accent,#4f46e5);font-weight:700;font-size:14px}
.wxr-form{display:flex;gap:6px;margin-top:8px}.wxr-form input{flex:1;min-width:0;font:inherit;padding:8px 10px;border:1px solid var(--line,var(--border,#ddd));border-radius:10px}
.wxr-form button,.wxr-reset{font:inherit;font-weight:700;padding:8px 12px;border-radius:10px;border:1px solid var(--line,var(--border,#ddd));background:var(--card,var(--surface,#fff));cursor:pointer}
.wxr-reset{margin-top:8px}`;
let cfg = { app: 'x', lang: () => 'fr', home: () => 'Luxembourg', radio: () => RADIO_DEFAULT };
let wx = null, loading = false, audio = null;
const tx = () => TX[cfg.lang()] || TX.fr;
const city = () => { const c = ls.get(cfg.app + 'WxCity'); return CITIES[c] ? c : ''; };
const homeName = () => String(cfg.home() || '').replace(/^\s*(L-)?\d{4,5}\s*/i, '').trim() || 'Luxembourg';
const mine = () => { try { return JSON.parse(ls.get(cfg.app + 'Radio') || 'null'); } catch { return null; } };
const radio = () => mine() || (cfg.radio() && cfg.radio().url ? cfg.radio() : RADIO_DEFAULT);
const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };
const isStream = (u) => /\.(mp3|aac|ogg|opus|m4a)(\?|$)|\/(stream|live|listen|radio)[^/]*$|;stream|icecast|shoutcast|radioking|infomaniak|zeno\.fm|streamtheworld|ice\d*\./i.test(u);
const playing = () => audio && !audio.paused && audio.dataset.u === radio().url;
const isOpen = () => ls.get(cfg.app + 'WxShut') !== '1';

async function load() {
  if (loading) return;
  const c = CITIES[city()], place = c ? c[1] : homeName(), k = cfg.app + 'Wx:' + (c ? 'c:' : '') + place;
  try { const x = JSON.parse(ls.get(k) || 'null'); if (x && Date.now() - x.at < 3600e3) { wx = x; return paint(); } } catch { /* cache illisible */ }
  loading = true;
  try {
    const p = c ? { name: c[1], latitude: c[2], longitude: c[3] } : ((await (await fetch('https://geocoding-api.open-meteo.com/v1/search?count=1&language=fr&name=' + encodeURIComponent(place))).json()).results || [])[0] || { name: 'Luxembourg', latitude: 49.61, longitude: 6.13 };
    const f = await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.latitude}&longitude=${p.longitude}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=7&timezone=auto`)).json();
    wx = { at: Date.now(), name: p.name, now: f.current, days: f.daily };
    ls.set(k, JSON.stringify(wx));
  } catch { wx = { err: 1 }; }
  loading = false;
  paint();
}
function wxHtml() {
  const w = tx();
  if (!wx) return '<p class="wxr-meta">…</p>';
  if (wx.err || !wx.days) return `<p class="wxr-meta">${esc(w.none)}</p>`;
  const d = wx.days, cur = city(), home = homeName();
  const sel = `<select class="wxr-city" data-wxr-city="1" aria-label="${esc(w.t)}"><option value="">🏠 ${esc(home)}</option>${Object.entries(CITIES).filter(([k]) => !(k === 'lu' && /^luxembourg$/i.test(home)) || cur === k).map(([k, c]) => `<option value="${k}"${cur === k ? ' selected' : ''}>${c[0]} ${esc(c[1])}</option>`).join('')}</select>`;
  return `<div class="wxr-now"><span class="wxr-big" title="${esc(w.now)}">${ICON(wx.now.weather_code)} ${Math.round(wx.now.temperature_2m)}°</span>${sel}</div>
    <div class="wxr-days">${d.time.map((t, i) => `<div class="wxr-d${i === 0 ? ' today' : ''}"><small>${esc(new Date(t + 'T12:00:00').toLocaleDateString(LOCS[cfg.lang()] || 'fr-LU', { weekday: 'short' }).replace('.', '').slice(0, 3))}</small><span>${ICON(d.weather_code[i])}</span><b>${Math.round(d.temperature_2m_max[i])}°</b><small>${Math.round(d.temperature_2m_min[i])}°</small>${d.precipitation_probability_max && d.precipitation_probability_max[i] >= 40 ? `<small class="wxr-rain">💧${d.precipitation_probability_max[i]}%</small>` : ''}</div>`).join('')}</div>`;
}
function radioHtml() {
  const w = tx(), r = radio(), m = mine(), def = cfg.radio() && cfg.radio().url ? cfg.radio() : RADIO_DEFAULT, on = playing();
  return `<div class="wxr-radio"><button type="button" class="wxr-play${on ? ' on' : ''}" data-wxr-play="1" aria-label="▶">${on ? '⏸' : '▶'}</button>
      <span class="wxr-grow"><b>📻 ${esc(r.nom || host(r.url))}</b><br><span class="wxr-meta">${esc(host(r.url))}${on ? ' · ● ' + esc(w.on) : isStream(r.url) ? '' : ' · ' + esc(/popup/i.test(r.url) ? w.pl : w.ext)}</span></span></div>
    <details class="wxr-more"><summary>${esc(w.change)}</summary>
      <div class="wxr-form"><input data-wxr-url="1" type="url" inputmode="url" placeholder="${esc(w.ph)}" value="${esc(m ? m.url : '')}"><button type="button" data-wxr-save="1">${esc(w.save)}</button></div>
      ${m ? `<button type="button" class="wxr-reset" data-wxr-reset="1">📻 ${esc(w.back)} ${esc(def.nom || host(def.url))}</button>` : ''}</details>`;
}
const sumHtml = () => `${wx && wx.now ? `${ICON(wx.now.weather_code)} ${Math.round(wx.now.temperature_2m)}° · ` : ''}📻 ${esc(radio().nom || host(radio().url))}${playing() ? ' ▶' : ''}`;
function paint() {
  document.querySelectorAll('.wxr-card').forEach((c) => {
    const a = c.querySelector('.wxr-wx'); if (a) a.innerHTML = wxHtml();
    const b = c.querySelector('.wxr-rbox'); if (b) { const op = b.querySelector('details[open]'); b.innerHTML = radioHtml(); if (op) b.querySelector('details').open = true; }
    const s = c.querySelector('.wxr-sum'); if (s) s.innerHTML = sumHtml();
  });
}
function toggle() {
  const r = radio();
  if (!isStream(r.url)) { window.open(r.url, 'radio', /popup/i.test(r.url) ? 'popup,width=420,height=640' : ''); return; }
  if (!audio) { audio = document.createElement('audio'); audio.preload = 'none'; document.body.appendChild(audio); ['play', 'pause'].forEach((ev) => audio.addEventListener(ev, paint)); audio.addEventListener('error', () => { paint(); window.open(radio().url, '_blank', 'noopener'); }); }
  if (playing()) { audio.pause(); return; }
  if (audio.dataset.u !== r.url) { audio.src = r.url; audio.dataset.u = r.url; }
  audio.play().catch(() => {});
}

// La carte (HTML) — à placer où l'on veut ; elle se remplit toute seule.
export function wxRadioCard() {
  setTimeout(load, 0);
  const w = tx();
  return `<details class="wxr-card"${isOpen() ? ' open' : ''}><summary><span class="wxr-h">🌤️ ${esc(w.t)} · 📻 ${esc(w.r)}</span><span class="wxr-sum">${sumHtml()}</span></summary>
    <div class="wxr-wx">${wxHtml()}</div><div class="wxr-rbox">${radioHtml()}</div></details>`;
}
// app : préfixe de stockage ('eq', 'ptl') ; lang, home (commune), radio (radio par défaut) : fonctions
export function wxRadioInit(opts) {
  cfg = { ...cfg, ...opts };
  if (wxRadioInit.done) return;
  wxRadioInit.done = true;
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-wxr-play]')) return toggle();
    if (e.target.closest('[data-wxr-save]')) {
      const inp = e.target.closest('.wxr-card').querySelector('[data-wxr-url]');
      let u = (inp && inp.value || '').trim(); if (u && !/^https?:\/\//i.test(u)) u = 'https://' + u;
      try { new URL(u); } catch { return; }
      ls.set(cfg.app + 'Radio', JSON.stringify({ nom: host(u), url: u }));
      if (audio) audio.pause();
      return paint();
    }
    if (e.target.closest('[data-wxr-reset]')) { ls.set(cfg.app + 'Radio', null); if (audio) audio.pause(); return paint(); }
  });
  document.addEventListener('change', (e) => {
    if (!e.target.dataset || !e.target.dataset.wxrCity) return;
    ls.set(cfg.app + 'WxCity', e.target.value || null);
    wx = null; paint(); load();
  });
  document.addEventListener('toggle', (e) => { if (e.target.classList && e.target.classList.contains('wxr-card')) ls.set(cfg.app + 'WxShut', e.target.open ? null : '1'); }, true);
}
