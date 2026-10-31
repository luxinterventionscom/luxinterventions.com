// 👍 👎 👉 sous chaque annonce : emoji jaunes, 🏾 une fois touchées. Un avis par téléphone et par annonce (gardé sur le téléphone),
// compteurs anonymes au Worker (comme les vues). 👉 : feuille de partage du téléphone, sinon notre fenêtre (lien, WhatsApp, e-mail…).
// Le lien partagé : la vidéo / musique de l'annonce, sinon son site, sinon la carte de son adresse.
import { pubEv } from '/ares/pubstat.js';

const T = {
  fr: { share: 'Partager', copy: 'Copier le lien', copied: 'Lien copié ✓', close: 'Fermer', more: 'Autres apps…', sms: 'SMS' },
  it: { share: 'Condividi', copy: 'Copia il link', copied: 'Link copiato ✓', close: 'Chiudi', more: 'Altre app…', sms: 'SMS' },
  de: { share: 'Teilen', copy: 'Link kopieren', copied: 'Link kopiert ✓', close: 'Schließen', more: 'Weitere Apps…', sms: 'SMS' },
  en: { share: 'Share', copy: 'Copy link', copied: 'Link copied ✓', close: 'Close', more: 'Other apps…', sms: 'SMS' },
  pt: { share: 'Partilhar', copy: 'Copiar o link', copied: 'Link copiado ✓', close: 'Fechar', more: 'Outras apps…', sms: 'SMS' },
  es: { share: 'Compartir', copy: 'Copiar el enlace', copied: 'Enlace copiado ✓', close: 'Cerrar', more: 'Otras apps…', sms: 'SMS' },
};
let base = '', getLang = () => 'fr';
const counts = new Map();
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const tx = () => T[getLang()] || T.fr;
const stOf = (id) => { try { return localStorage.getItem('pubSoc:' + id) || ''; } catch { return ''; } };
const stSet = (id, v) => { try { if (v) localStorage.setItem('pubSoc:' + id, v); else localStorage.removeItem('pubSoc:' + id); } catch { /* stockage plein */ } };
const DARK = '\u{1F3FE}';

export function pubSocialInit(apiBase, lang) {
  base = String(apiBase || '').replace(/\/$/, '');
  getLang = lang;
  if (document.getElementById('pubSocCss')) return;
  const st = document.createElement('style');
  st.id = 'pubSocCss';
  st.textContent = `.psoc{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0 0}
.psoc .pp{display:inline-flex;align-items:center;background:rgba(127,127,127,.13);border-radius:999px;min-height:36px;padding:0 4px}
.psoc button{display:inline-flex;align-items:center;gap:6px;border:0;background:none;padding:0 10px;min-height:36px;font:600 14px system-ui,sans-serif;color:inherit;border-radius:999px;cursor:pointer}
.psoc .em{font-size:19px;line-height:1}.psoc .sp{width:1px;height:20px;background:currentColor;opacity:.2}
.psoc-bg{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:flex-end;justify-content:center}
.psoc-sh{background:#fff;color:#111;width:100%;max-width:440px;border-radius:18px 18px 0 0;padding:16px 16px 20px;font:15px system-ui,sans-serif}
@media(min-width:600px){.psoc-bg{align-items:center}.psoc-sh{border-radius:18px}}
.psoc-sh h3{margin:0 0 4px;font-size:17px}.psoc-sh p{margin:0 0 12px;color:#555;font-size:13px;word-break:break-all}
.psoc-g{display:grid;grid-template-columns:repeat(4,1fr);gap:12px 6px;margin:0 0 12px}
.psoc-g a,.psoc-g button{display:flex;flex-direction:column;align-items:center;gap:6px;font-size:12px;color:#111;text-decoration:none;background:none;border:0;cursor:pointer;padding:0}
.psoc-g i{width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-style:normal;font-size:22px;color:#fff}
.psoc-x{width:100%;min-height:42px;border:0;border-radius:12px;background:#f1f1f1;font:600 15px system-ui,sans-serif;cursor:pointer}`;
  document.head.append(st);
}

// la barre, à mettre dans la carte de l'annonce (qui porte data-pid)
export function pubSocialBar(ad) {
  const s = stOf(ad.id), n = counts.get(ad.id);
  return `<div class="psoc" data-psoc="${esc(ad.id)}"><span class="pp"><button type="button" data-soc="like" aria-pressed="${s === 'l'}"><span class="em">👍${s === 'l' ? DARK : ''}</span><b data-lk>${n == null ? '' : n}</b></button><span class="sp"></span><button type="button" data-soc="dis" aria-pressed="${s === 'd'}" aria-label="👎"><span class="em">👎${s === 'd' ? DARK : ''}</span></button></span>`
    + `<span class="pp"><button type="button" data-soc="share" data-url="${esc(shareUrl(ad))}" data-title="${esc(ad.nom || '')}" data-text="${esc(shareText(ad))}"><span class="em">👉${stOf('sh:' + ad.id) ? DARK : ''}</span>${esc(tx().share)}</button></span></div>`;
}
function shareUrl(ad) {
  const ok = (u) => /^https?:\/\//i.test(String(u || '').trim());
  if (ok(ad.video)) return String(ad.video).trim();
  if (ok(ad.web)) return String(ad.web).trim();
  return ad.adresse ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(ad.adresse) : '';
}
const shareText = (ad) => [ad.nom, ad.texte, ad.adresse ? '📍 ' + ad.adresse : '', ad.tel ? '📞 ' + ad.tel : ''].filter(Boolean).join('\n');

// 👍 de toutes les annonces affichées (une requête) ; puis on remet les nombres dans les barres
export async function pubSocialLoad(root) {
  const ids = [...(root || document).querySelectorAll('[data-psoc]')].map((x) => x.dataset.psoc).filter((v, i, a) => a.indexOf(v) === i);
  if (!ids.length || !base) return;
  try {
    const r = await fetch(`${base}/api/publikes?ids=${ids.slice(0, 30).join(',')}`);
    const j = r.ok ? await r.json() : {};
    for (const id of ids) counts.set(id, Math.max(0, +j[id] || 0));
  } catch { return; }
  paint(root);
}
function paint(root) {
  for (const b of (root || document).querySelectorAll('[data-psoc]')) { const n = counts.get(b.dataset.psoc), el = b.querySelector('[data-lk]'); if (el) el.textContent = n == null ? '' : String(n); }
}
function setEm(bar, soc, on) { const b = bar.querySelector(`[data-soc="${soc}"]`); if (!b) return; b.setAttribute('aria-pressed', on ? 'true' : 'false'); const e = b.querySelector('.em'); if (e) e.textContent = { like: '👍', dis: '👎', share: '👉' }[soc] + (on ? DARK : ''); }

// à brancher sur l'écouteur de clic de l'app ; true si le clic était pour la barre
export function pubSocialClick(e) {
  const b = e.target.closest('[data-soc]');
  if (!b) return false;
  const bar = b.closest('[data-psoc]'), id = bar && bar.dataset.psoc;
  if (!id) return false;
  e.preventDefault();
  const s = stOf(id), n = counts.get(id) || 0;
  if (b.dataset.soc === 'like') {
    if (s === 'l') { stSet(id, ''); pubEv(id, 'unl'); counts.set(id, Math.max(0, n - 1)); setEm(bar, 'like', false); }
    else { if (s === 'd') { pubEv(id, 'und'); setEm(bar, 'dis', false); } stSet(id, 'l'); pubEv(id, 'like'); counts.set(id, n + 1); setEm(bar, 'like', true); }
    paint(document);
  } else if (b.dataset.soc === 'dis') {
    if (s === 'd') { stSet(id, ''); pubEv(id, 'und'); setEm(bar, 'dis', false); }
    else { if (s === 'l') { pubEv(id, 'unl'); counts.set(id, Math.max(0, n - 1)); setEm(bar, 'like', false); paint(document); } stSet(id, 'd'); pubEv(id, 'dis'); setEm(bar, 'dis', true); }
  } else if (b.dataset.soc === 'share') share(id, bar, b.dataset.title, b.dataset.text, b.dataset.url);
  return true;
}
function shared(id, bar) { pubEv(id, 'share'); stSet('sh:' + id, '1'); setEm(bar, 'share', true); }
async function share(id, bar, title, text, url) {
  const phone = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
  if (phone && navigator.share) {
    try { await navigator.share({ title, text, url }); shared(id, bar); } catch { /* annulé */ }
    return;
  }
  sheet(id, bar, title, text, url);
}
function sheet(id, bar, title, text, url) {
  const t = tx(), msg = text + (url ? '\n' + url : ''), enc = encodeURIComponent;
  const items = [
    ['🔗', '#6b7280', t.copy, 'copy'],
    ['💬', '#25d366', 'WhatsApp', 'https://wa.me/?text=' + enc(msg)],
    ['✉️', '#64748b', 'E-mail', `mailto:?subject=${enc(title)}&body=${enc(msg)}`],
    ['✈️', '#229ed9', 'Telegram', `https://t.me/share/url?url=${enc(url)}&text=${enc(text)}`],
    ['f', '#1877f2', 'Facebook', 'https://www.facebook.com/sharer/sharer.php?u=' + enc(url)],
    ['𝕏', '#000', 'X', `https://twitter.com/intent/tweet?text=${enc(title)}&url=${enc(url)}`],
    ['📱', '#34c759', t.sms, 'sms:?&body=' + enc(msg)],
  ];
  if (navigator.share) items.push(['⋯', '#9ca3af', t.more, 'native']);
  const bg = document.createElement('div');
  bg.className = 'psoc-bg';
  bg.innerHTML = `<div class="psoc-sh" role="dialog" aria-label="${esc(t.share)}"><h3>👉 ${esc(t.share)}</h3><p>${esc(title)}${url ? ' — ' + esc(url) : ''}</p><div class="psoc-g">${items.map(([ic, col, lab, href]) => (/^(copy|native)$/.test(href)
    ? `<button type="button" data-go="${href}"><i style="background:${col}">${ic}</i>${esc(lab)}</button>`
    : `<a href="${esc(href)}" target="_blank" rel="noopener" data-go="link"><i style="background:${col}">${ic === 'f' ? '<b style="font:700 26px Arial">f</b>' : ic}</i>${esc(lab)}</a>`)).join('')}</div><button type="button" class="psoc-x" data-go="close">${esc(t.close)}</button></div>`;
  const close = () => bg.remove();
  bg.addEventListener('click', async (ev) => {
    const g = ev.target.closest('[data-go]');
    if (!g) { if (ev.target === bg) close(); return; }
    if (g.dataset.go === 'close') return close();
    if (g.dataset.go === 'copy') {
      ev.preventDefault();
      try { await navigator.clipboard.writeText(url || msg); } catch { const ta = document.createElement('textarea'); ta.value = url || msg; document.body.append(ta); ta.select(); try { document.execCommand('copy'); } catch { /* pas de presse-papiers */ } ta.remove(); }
      g.lastChild.textContent = t.copied; shared(id, bar); setTimeout(close, 900); return;
    }
    if (g.dataset.go === 'native') { try { await navigator.share({ title, text, url }); shared(id, bar); } catch { /* annulé */ } return close(); }
    shared(id, bar); setTimeout(close, 300);
  });
  document.body.append(bg);
}
