// 🌐 Traduction des messages des chats (inquilini, operai, centrale).
// Le 🌐 (bouton data-trpick) choisit la langue, gardée sur ce téléphone jusqu'au prochain choix.
// Les messages des AUTRES portent data-trx="texte original" : ils s'affichent traduits, avec « 🌐 traduit · voir l'original ».
// Chaque texte n'est traduit qu'une fois (mémoire du téléphone). Ses propres messages ne sont jamais traduits.
const L = {
  fr: { pick: 'Traduire les messages en', off: 'Ne pas traduire', tr: '🌐 traduit · voir l’original', orig: '🌐 original · voir la traduction', note: 'Les textes à traduire passent par un service de traduction en ligne.', close: 'Fermer' },
  it: { pick: 'Traduci i messaggi in', off: 'Non tradurre', tr: '🌐 tradotto · vedi originale', orig: '🌐 originale · vedi traduzione', note: 'I testi da tradurre passano da un servizio di traduzione online.', close: 'Chiudi' },
  de: { pick: 'Nachrichten übersetzen in', off: 'Nicht übersetzen', tr: '🌐 übersetzt · Original ansehen', orig: '🌐 Original · Übersetzung ansehen', note: 'Die zu übersetzenden Texte gehen über einen Online-Übersetzungsdienst.', close: 'Schließen' },
  pt: { pick: 'Traduzir as mensagens para', off: 'Não traduzir', tr: '🌐 traduzido · ver original', orig: '🌐 original · ver tradução', note: 'Os textos a traduzir passam por um serviço de tradução online.', close: 'Fechar' },
  en: { pick: 'Translate messages into', off: 'Don’t translate', tr: '🌐 translated · see original', orig: '🌐 original · see translation', note: 'Texts to translate go through an online translation service.', close: 'Close' },
  es: { pick: 'Traducir los mensajes al', off: 'No traducir', tr: '🌐 traducido · ver original', orig: '🌐 original · ver traducción', note: 'Los textos a traducir pasan por un servicio de traducción en línea.', close: 'Cerrar' },
};
const LANGS = [['it', '🇮🇹 Italiano'], ['fr', '🇫🇷 Français'], ['de', '🇩🇪 Deutsch'], ['pt', '🇵🇹 Português'], ['en', '🇬🇧 English'], ['es', '🇪🇸 Español']];
const K = 'chatTrLang', CK = (l) => 'chatTrC:' + l;
let api = '', ui = () => 'fr', busy = false, timer = null, failAt = 0;
const showOrig = new Set();
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const tx = () => L[ui()] || L.fr;
export const trLang = () => { try { return localStorage.getItem(K) || ''; } catch { return ''; } };
const cacheGet = (l) => { try { return JSON.parse(localStorage.getItem(CK(l)) || '{}'); } catch { return {}; } };
const cacheSet = (l, c) => { const ks = Object.keys(c); if (ks.length > 400) for (const k of ks.slice(0, ks.length - 400)) delete c[k]; try { localStorage.setItem(CK(l), JSON.stringify(c)); } catch { /* plein */ } };
// le bouton 🌐 à mettre en haut de chaque chat
export const trButton = () => { const l = trLang(); return `<button type="button" class="trpick" data-trpick="1" aria-label="🌐">🌐${l ? ' ' + l.toUpperCase() : ''}</button>`; };

let inited = false;
export const trReady = () => inited;
export function trInit(apiBase, uiLang) {
  api = String(apiBase || '').replace(/\/$/, '');
  ui = uiLang;
  if (inited) return; // déjà en route (ex. barre News puis chat) : on ne garde que la nouvelle adresse et langue
  inited = true;
  if (!document.getElementById('trCss')) {
    const st = document.createElement('style');
    st.id = 'trCss';
    st.textContent = `.trpick{border:0;border-radius:999px;padding:4px 10px;font:600 13px system-ui,sans-serif;background:rgba(127,127,127,.15);color:inherit;cursor:pointer;margin-left:auto}
.tr-o{display:block;border:0;background:none;padding:2px 0 0;font:11px system-ui,sans-serif;color:#2563eb;cursor:pointer;text-align:left}
.tr-bg{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:flex-end;justify-content:center}
.tr-sh{background:#fff;color:#111;width:100%;max-width:420px;border-radius:18px 18px 0 0;padding:16px;font:15px system-ui,sans-serif}
@media(min-width:600px){.tr-bg{align-items:center}.tr-sh{border-radius:18px}}
.tr-sh h3{margin:0 0 10px;font-size:17px}.tr-sh p{margin:10px 0;color:#555;font-size:12px}
.tr-sh button{display:block;width:100%;text-align:left;border:0;border-radius:12px;padding:12px;margin:0 0 6px;font:600 15px system-ui,sans-serif;background:#f3f4f6;cursor:pointer;color:#111}
.tr-sh button.on{background:#e0e7ff;color:#3730a3}`;
    document.head.append(st);
  }
  document.addEventListener('click', onClick, true);
  new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(trApply, 120); }).observe(document.body, { childList: true, subtree: true });
  setTimeout(trApply, 300);
}

function onClick(e) {
  const o = e.target.closest && e.target.closest('.tr-o');
  if (o) { e.preventDefault(); e.stopPropagation(); const k = o.dataset.k; if (showOrig.has(k)) showOrig.delete(k); else showOrig.add(k); paintAll(); return; }
  const p = e.target.closest && e.target.closest('[data-trpick]');
  if (!p) return;
  e.preventDefault(); e.stopPropagation();
  const t = tx(), cur = trLang(), bg = document.createElement('div');
  bg.className = 'tr-bg';
  bg.innerHTML = `<div class="tr-sh" role="dialog"><h3>🌐 ${esc(t.pick)}</h3>${LANGS.map(([k, n]) => `<button type="button" data-l="${k}" class="${cur === k ? 'on' : ''}">${esc(n)}${cur === k ? ' ✓' : ''}</button>`).join('')}<button type="button" data-l="" class="${cur ? '' : 'on'}">🚫 ${esc(t.off)}${cur ? '' : ' ✓'}</button><p>${esc(t.note)}</p></div>`;
  bg.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-l]');
    if (!b) { if (ev.target === bg) bg.remove(); return; }
    try { if (b.dataset.l) localStorage.setItem(K, b.dataset.l); else localStorage.removeItem(K); } catch { /* stockage indisponible */ }
    bg.remove();
    for (const x of document.querySelectorAll('[data-trpick]')) x.outerHTML = trButton();
    paintAll(); trApply();
  });
  document.body.append(bg);
}

// remet chaque message dans la bonne version (traduit / original) sans requête
function paintAll() {
  const l = trLang(), c = l ? cacheGet(l) : {}, t = tx();
  for (const el of document.querySelectorAll('[data-trx]')) {
    const x = el.dataset.trx, r = c[x];
    const want = l && r && r.t && r.t !== x && r.s !== l ? (showOrig.has(x) ? 'o' : 't') : '';
    if (el.dataset.trd === want + l) continue;
    el.dataset.trd = want + l;
    if (!want) { el.textContent = x; continue; }
    el.innerHTML = `${esc(want === 't' ? r.t : x)}<button type="button" class="tr-o" data-k="${esc(x)}">${esc(want === 't' ? t.tr : t.orig)}</button>`;
  }
}
export async function trApply() {
  paintAll();
  const l = trLang();
  if (!l || busy || !api || Date.now() - failAt < 60000) return;
  const c = cacheGet(l);
  const miss = [...new Set([...document.querySelectorAll('[data-trx]')].map((el) => el.dataset.trx).filter((x) => x && x.trim() && !c[x]))].slice(0, 20);
  if (!miss.length) return;
  busy = true;
  try {
    const r = await fetch(api + '/api/tr', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ q: miss, to: l }) });
    if (r.ok) {
      const j = await r.json(), c2 = cacheGet(l);
      miss.forEach((x, i) => { const v = (j.t || [])[i]; if (v) c2[x] = { t: String(v.t || ''), s: String(v.s || '') }; });
      cacheSet(l, c2);
    } else failAt = Date.now();
  } catch { failAt = Date.now(); /* hors ligne : on réessaiera dans 1 min */ }
  busy = false;
  paintAll();
}
