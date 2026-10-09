// Petit dessin animé « Mettre l'icône sur l'écran du téléphone » (iPhone / Android), en boucle.
// Chargé seulement quand on touche le bouton (import dynamique) : rien à télécharger sinon. Pas de vidéo, juste du dessin (CSS).
const TXT = {
  fr: { t: 'Mettre l’icône sur l’écran', ios: 'iPhone', and: 'Android', close: 'Fermer', s: { ios: ['Ouvrez le lien dans Safari, touchez « Partager » ⬆︎', 'Touchez « Sur l’écran d’accueil » ➕', 'Touchez « Ajouter »', 'L’icône est sur votre écran 🎉 Ouvrez l’app depuis l’icône'], and: ['Ouvrez le lien dans Chrome, touchez « ⋮ »', 'Touchez « Installer l’application »', 'Touchez « Installer »', 'L’icône est sur votre écran 🎉 Ouvrez l’app depuis l’icône'] }, w: { share: 'Sur l’écran d’accueil', copy: 'Copier', fav: 'Favoris', add: 'Ajouter', cancel: 'Annuler', inst: 'Installer l’application', install: 'Installer', newtab: 'Nouvel onglet' } },
  it: { t: 'Mettere l’icona sullo schermo', ios: 'iPhone', and: 'Android', close: 'Chiudi', s: { ios: ['Apri il link in Safari, tocca «Condividi» ⬆︎', 'Tocca «Aggiungi alla schermata Home» ➕', 'Tocca «Aggiungi»', 'L’icona è sul tuo schermo 🎉 Apri l’app dall’icona'], and: ['Apri il link in Chrome, tocca «⋮»', 'Tocca «Installa app»', 'Tocca «Installa»', 'L’icona è sul tuo schermo 🎉 Apri l’app dall’icona'] }, w: { share: 'Aggiungi a Home', copy: 'Copia', fav: 'Preferiti', add: 'Aggiungi', cancel: 'Annulla', inst: 'Installa app', install: 'Installa', newtab: 'Nuova scheda' } },
  de: { t: 'Symbol auf den Bildschirm legen', ios: 'iPhone', and: 'Android', close: 'Schließen', s: { ios: ['Link in Safari öffnen, „Teilen“ ⬆︎ tippen', '„Zum Home-Bildschirm“ ➕ tippen', '„Hinzufügen“ tippen', 'Das Symbol ist auf dem Bildschirm 🎉 App über das Symbol öffnen'], and: ['Link in Chrome öffnen, „⋮“ tippen', '„App installieren“ tippen', '„Installieren“ tippen', 'Das Symbol ist auf dem Bildschirm 🎉 App über das Symbol öffnen'] }, w: { share: 'Zum Home-Bildschirm', copy: 'Kopieren', fav: 'Favoriten', add: 'Hinzufügen', cancel: 'Abbrechen', inst: 'App installieren', install: 'Installieren', newtab: 'Neuer Tab' } },
  pt: { t: 'Pôr o ícone no ecrã', ios: 'iPhone', and: 'Android', close: 'Fechar', s: { ios: ['Abra o link no Safari, toque em «Partilhar» ⬆︎', 'Toque em «Adicionar ao ecrã principal» ➕', 'Toque em «Adicionar»', 'O ícone está no seu ecrã 🎉 Abra a app pelo ícone'], and: ['Abra o link no Chrome, toque em «⋮»', 'Toque em «Instalar app»', 'Toque em «Instalar»', 'O ícone está no seu ecrã 🎉 Abra a app pelo ícone'] }, w: { share: 'Ecrã principal', copy: 'Copiar', fav: 'Favoritos', add: 'Adicionar', cancel: 'Cancelar', inst: 'Instalar app', install: 'Instalar', newtab: 'Novo separador' } },
  en: { t: 'Put the icon on your screen', ios: 'iPhone', and: 'Android', close: 'Close', s: { ios: ['Open the link in Safari, tap “Share” ⬆︎', 'Tap “Add to Home Screen” ➕', 'Tap “Add”', 'The icon is on your screen 🎉 Open the app from the icon'], and: ['Open the link in Chrome, tap “⋮”', 'Tap “Install app”', 'Tap “Install”', 'The icon is on your screen 🎉 Open the app from the icon'] }, w: { share: 'Add to Home Screen', copy: 'Copy', fav: 'Bookmarks', add: 'Add', cancel: 'Cancel', inst: 'Install app', install: 'Install', newtab: 'New tab' } },
  es: { t: 'Poner el icono en la pantalla', ios: 'iPhone', and: 'Android', close: 'Cerrar', s: { ios: ['Abra el enlace en Safari, toque «Compartir» ⬆︎', 'Toque «Añadir a pantalla de inicio» ➕', 'Toque «Añadir»', 'El icono está en su pantalla 🎉 Abra la app desde el icono'], and: ['Abra el enlace en Chrome, toque «⋮»', 'Toque «Instalar aplicación»', 'Toque «Instalar»', 'El icono está en su pantalla 🎉 Abra la app desde el icono'] }, w: { share: 'Pantalla de inicio', copy: 'Copiar', fav: 'Marcadores', add: 'Añadir', cancel: 'Cancelar', inst: 'Instalar aplicación', install: 'Instalar', newtab: 'Nueva pestaña' } },
};
const CSS = `
.ia-back{position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:16px;font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif}
.ia-box{background:#fff;color:#1f1f1f;border-radius:22px;width:100%;max-width:380px;padding:16px;box-shadow:0 20px 60px rgba(0,0,0,.35)}
.ia-h{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px}.ia-h b{font-size:17px}
.ia-x{border:0;background:#eee;border-radius:50%;width:34px;height:34px;font-size:18px;cursor:pointer}
.ia-tabs{display:flex;gap:6px;background:#f1f1f1;border-radius:12px;padding:4px;margin-bottom:10px}.ia-tabs button{flex:1;border:0;background:none;padding:7px;border-radius:9px;font:inherit;font-weight:700;cursor:pointer;color:#555}.ia-tabs button[aria-pressed=true]{background:#fff;color:#111;box-shadow:0 1px 3px rgba(0,0,0,.12)}
.ia-ph{position:relative;height:330px;width:190px;margin:0 auto;border:8px solid #222;border-radius:30px;background:#f6f6f6;overflow:hidden}
.ia-top,.ia-bot{position:absolute;left:0;right:0;height:34px;background:#fafafa;display:flex;align-items:center;justify-content:space-around;font-size:15px;color:#2f6fd8}
.ia-top{top:0;border-bottom:1px solid #ddd;justify-content:space-between;padding:0 6px;color:#666}.ia-bot{bottom:0;border-top:1px solid #ddd}
.ia-url{flex:1;margin:0 5px;background:#e9e9ee;border-radius:8px;font-size:10px;padding:4px 6px;color:#333;white-space:nowrap;overflow:hidden}
.ia-site{position:absolute;top:58px;left:0;right:0;text-align:center;font-size:12px;font-weight:700}.ia-site img{width:64px;height:64px;border-radius:15px;display:block;margin:0 auto 6px}
.ia-sheet{position:absolute;left:6px;right:6px;bottom:40px;background:#fff;border-radius:12px;box-shadow:0 6px 20px rgba(0,0,0,.25);font-size:11px;animation:iaUp .45s ease-out both}
.ia-sheet div{padding:8px 10px;border-bottom:1px solid #eee;display:flex;justify-content:space-between}.ia-sheet div:last-child{border:0}
.ia-menu{position:absolute;right:6px;top:38px;width:74%;background:#fff;border-radius:10px;box-shadow:0 6px 20px rgba(0,0,0,.25);font-size:11px;animation:iaDrop .4s ease-out both}
.ia-menu div{padding:8px 10px;border-bottom:1px solid #eee}.ia-menu div:last-child{border:0}
.ia-dlg{position:absolute;left:8px;right:8px;top:70px;background:#fff;border-radius:12px;box-shadow:0 6px 20px rgba(0,0,0,.25);padding:10px;font-size:11px;animation:iaPop .35s ease-out both}
.ia-dlg .r{display:flex;gap:8px;align-items:center;margin:8px 0}.ia-dlg img{width:36px;height:36px;border-radius:9px}.ia-btns{display:flex;justify-content:space-between;color:#2f6fd8;font-weight:700}
.ia-home{position:absolute;inset:0;background:linear-gradient(160deg,#6a8bd8,#c06ad8);display:grid;grid-template-columns:repeat(4,1fr);gap:14px 4px;padding:22px 10px;align-content:start}
.ia-app{text-align:center;color:#fff;font-size:8px}.ia-app i{display:block;width:34px;height:34px;margin:0 auto 3px;border-radius:9px;background:rgba(255,255,255,.35)}
.ia-app img{width:34px;height:34px;border-radius:9px;display:block;margin:0 auto 3px;animation:iaIcon .9s cubic-bezier(.3,1.6,.5,1) both}
.ia-tap{position:absolute;width:30px;height:30px;margin:-15px 0 0 -15px;border-radius:50%;background:rgba(229,57,53,.35);border:3px solid #e53935;animation:iaTap 1.1s ease-out .5s infinite;pointer-events:none}
.ia-cap{min-height:44px;margin:12px 4px 4px;font-size:15px;font-weight:700;text-align:center;line-height:1.3}.ia-cap span{color:#d9622b}
.ia-dots{display:flex;justify-content:center;gap:6px}.ia-dots i{width:8px;height:8px;border-radius:50%;background:#ddd}.ia-dots i.on{background:#d9622b}
@keyframes iaTap{0%{transform:scale(.4);opacity:0}30%{opacity:1}100%{transform:scale(1.5);opacity:0}}
@keyframes iaUp{from{transform:translateY(120%)}to{transform:none}}@keyframes iaDrop{from{transform:scale(.6);opacity:0;transform-origin:top right}to{transform:none;opacity:1}}
@keyframes iaPop{from{transform:scale(.8);opacity:0}to{transform:none;opacity:1}}@keyframes iaIcon{0%{transform:scale(0)}100%{transform:scale(1)}}
@media (prefers-reduced-motion:reduce){.ia-tap,.ia-sheet,.ia-menu,.ia-dlg,.ia-app img{animation:none}}`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function showInstallAnim({ name = 'App', icon = '', lang = 'fr', host = location.host } = {}) {
  const t = TXT[lang] || TXT.fr, w = t.w;
  if (!document.getElementById('ia-css')) { const st = document.createElement('style'); st.id = 'ia-css'; st.textContent = CSS; document.head.appendChild(st); }
  let os = /android/i.test(navigator.userAgent) ? 'and' : 'ios', step = 0, timer = 0;
  const back = document.createElement('div');
  back.className = 'ia-back'; back.setAttribute('role', 'dialog'); back.setAttribute('aria-modal', 'true');
  const ico = `<img src="${esc(icon)}" alt="">`;
  const site = `<div class="ia-site">${ico}${esc(name)}</div>`;
  const tap = (x, y) => `<span class="ia-tap" style="left:${x}%;top:${y}px"></span>`;
  const home = `<div class="ia-home">${Array.from({ length: 7 }, () => '<div class="ia-app"><i></i></div>').join('')}<div class="ia-app">${ico}${esc(name).slice(0, 12)}</div></div>`;
  const scenes = {
    ios: [
      `<div class="ia-top"><span>‹</span><span class="ia-url">🔒 ${esc(host)}</span><span>⟳</span></div>${site}<div class="ia-bot"><span>‹</span><span>›</span><span>⬆︎</span><span>📖</span><span>⧉</span></div>${tap(50, 297)}`,
      `<div class="ia-top"><span>‹</span><span class="ia-url">🔒 ${esc(host)}</span><span>⟳</span></div>${site}<div class="ia-sheet"><div><span>${esc(w.copy)}</span><span>⧉</span></div><div><span>${esc(w.fav)}</span><span>☆</span></div><div><b>${esc(w.share)}</b><span>➕</span></div></div><div class="ia-bot"><span>‹</span><span>›</span><span>⬆︎</span><span>📖</span><span>⧉</span></div>${tap(45, 263)}`,
      `<div class="ia-dlg"><div class="ia-btns"><span>${esc(w.cancel)}</span><span>${esc(w.add)}</span></div><div class="r">${ico}<b>${esc(name)}</b></div></div>${tap(83, 80)}`,
      home,
    ],
    and: [
      `<div class="ia-top"><span>⌂</span><span class="ia-url">🔒 ${esc(host)}</span><span>⋮</span></div>${site}${tap(93, 17)}`,
      `<div class="ia-top"><span>⌂</span><span class="ia-url">🔒 ${esc(host)}</span><span>⋮</span></div>${site}<div class="ia-menu"><div>${esc(w.newtab)}</div><div>${esc(w.fav)}</div><div><b>${esc(w.inst)}</b> 📲</div></div>${tap(70, 130)}`,
      `<div class="ia-dlg"><b>${esc(w.inst)} ?</b><div class="r">${ico}<b>${esc(name)}</b></div><div class="ia-btns" style="justify-content:flex-end;gap:16px"><span>${esc(w.cancel)}</span><span>${esc(w.install)}</span></div></div>${tap(84, 152)}`,
      home,
    ],
  };
  const draw = () => {
    back.innerHTML = `<div class="ia-box"><div class="ia-h"><b>📲 ${esc(t.t)}</b><button class="ia-x" data-ia="x" aria-label="${esc(t.close)}">✕</button></div>
      <div class="ia-tabs"><button data-ia="ios" aria-pressed="${os === 'ios'}">🍎 ${esc(t.ios)}</button><button data-ia="and" aria-pressed="${os === 'and'}">🤖 ${esc(t.and)}</button></div>
      <div class="ia-ph">${scenes[os][step]}</div>
      <div class="ia-cap"><span>${step + 1}.</span> ${esc(t.s[os][step])}</div>
      <div class="ia-dots">${scenes[os].map((_, i) => `<i class="${i === step ? 'on' : ''}"></i>`).join('')}</div></div>`;
  };
  const tick = () => { step = (step + 1) % 4; draw(); timer = setTimeout(tick, step === 3 ? 3200 : 2600); };
  const close = () => { clearTimeout(timer); back.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  back.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ia]');
    if (e.target === back || (b && b.dataset.ia === 'x')) return close();
    if (b && b.dataset.ia !== os) { os = b.dataset.ia; step = 0; clearTimeout(timer); draw(); timer = setTimeout(tick, 2600); }
  });
  document.addEventListener('keydown', onKey);
  document.body.appendChild(back);
  draw(); timer = setTimeout(tick, 2600);
  return close;
}
