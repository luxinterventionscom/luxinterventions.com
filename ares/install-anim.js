// Petit dessin animé « Mettre l'icône sur l'écran du téléphone » (iPhone / Android), en boucle.
// Chargé seulement quand on touche le bouton (import dynamique) : rien à télécharger sinon. Pas de vidéo, juste du dessin (CSS).
const TXT = {
  fr: { t: 'Mettre l’icône sur l’écran', ios: 'iPhone', and: 'Android', close: 'Fermer', s: { ios: ['Dans Safari, touchez « ••• » en bas à droite', 'Touchez « Partager » ⬆︎', 'Touchez « En voir plus » ⌄', 'Touchez « Sur l’écran d’accueil » ⊞', '« Ouvrir comme app web » activé → « Ajouter »', 'L’icône est sur votre écran 🎉 Ouvrez l’app depuis l’icône'], and: ['Ouvrez le lien dans Chrome, touchez « ⋮ »', 'Touchez « Installer l’application »', 'Touchez « Installer »', 'L’icône est sur votre écran 🎉 Ouvrez l’app depuis l’icône'] }, w: { partager: 'Partager', more: 'En voir plus', webapp: 'Ouvrir comme app web', vid: '🎬 Voir la vraie vidéo', cart: '🎨 Dessin animé', old: 'Ancien iPhone : touchez directement ⬆︎ « Partager ».', share: 'Sur l’écran d’accueil', copy: 'Copier', fav: 'Favoris', add: 'Ajouter', cancel: 'Annuler', inst: 'Installer l’application', install: 'Installer', newtab: 'Nouvel onglet' } },
  it: { t: 'Mettere l’icona sullo schermo', ios: 'iPhone', and: 'Android', close: 'Chiudi', s: { ios: ['In Safari, tocca «•••» in basso a destra', 'Tocca «Condividi» ⬆︎', 'Tocca «Mostra altro» ⌄', 'Tocca «Aggiungi alla schermata Home» ⊞', '«Apri come web app» attivo → «Aggiungi»', 'L’icona è sul tuo schermo 🎉 Apri l’app dall’icona'], and: ['Apri il link in Chrome, tocca «⋮»', 'Tocca «Installa app»', 'Tocca «Installa»', 'L’icona è sul tuo schermo 🎉 Apri l’app dall’icona'] }, w: { partager: 'Condividi', more: 'Mostra altro', webapp: 'Apri come web app', vid: '🎬 Guarda il video vero', cart: '🎨 Cartone animato', old: 'iPhone meno recente: tocca subito ⬆︎ «Condividi».', share: 'Aggiungi a Home', copy: 'Copia', fav: 'Preferiti', add: 'Aggiungi', cancel: 'Annulla', inst: 'Installa app', install: 'Installa', newtab: 'Nuova scheda' } },
  de: { t: 'Symbol auf den Bildschirm legen', ios: 'iPhone', and: 'Android', close: 'Schließen', s: { ios: ['In Safari unten rechts „•••“ tippen', '„Teilen“ ⬆︎ tippen', '„Mehr anzeigen“ ⌄ tippen', '„Zum Home-Bildschirm“ ⊞ tippen', '„Als Web-App öffnen“ an → „Hinzufügen“', 'Das Symbol ist auf dem Bildschirm 🎉 App über das Symbol öffnen'], and: ['Link in Chrome öffnen, „⋮“ tippen', '„App installieren“ tippen', '„Installieren“ tippen', 'Das Symbol ist auf dem Bildschirm 🎉 App über das Symbol öffnen'] }, w: { partager: 'Teilen', more: 'Mehr anzeigen', webapp: 'Als Web-App öffnen', vid: '🎬 Echtes Video ansehen', cart: '🎨 Zeichentrick', old: 'Älteres iPhone: direkt ⬆︎ „Teilen“ tippen.', share: 'Zum Home-Bildschirm', copy: 'Kopieren', fav: 'Favoriten', add: 'Hinzufügen', cancel: 'Abbrechen', inst: 'App installieren', install: 'Installieren', newtab: 'Neuer Tab' } },
  pt: { t: 'Pôr o ícone no ecrã', ios: 'iPhone', and: 'Android', close: 'Fechar', s: { ios: ['No Safari, toque em «•••» em baixo à direita', 'Toque em «Partilhar» ⬆︎', 'Toque em «Ver mais» ⌄', 'Toque em «Adicionar ao ecrã principal» ⊞', '«Abrir como app web» ativado → «Adicionar»', 'O ícone está no seu ecrã 🎉 Abra a app pelo ícone'], and: ['Abra o link no Chrome, toque em «⋮»', 'Toque em «Instalar app»', 'Toque em «Instalar»', 'O ícone está no seu ecrã 🎉 Abra a app pelo ícone'] }, w: { partager: 'Partilhar', more: 'Ver mais', webapp: 'Abrir como app web', vid: '🎬 Ver o vídeo real', cart: '🎨 Desenho animado', old: 'iPhone mais antigo: toque logo em ⬆︎ «Partilhar».', share: 'Ecrã principal', copy: 'Copiar', fav: 'Favoritos', add: 'Adicionar', cancel: 'Cancelar', inst: 'Instalar app', install: 'Instalar', newtab: 'Novo separador' } },
  en: { t: 'Put the icon on your screen', ios: 'iPhone', and: 'Android', close: 'Close', s: { ios: ['In Safari, tap “•••” at the bottom right', 'Tap “Share” ⬆︎', 'Tap “View more” ⌄', 'Tap “Add to Home Screen” ⊞', '“Open as Web App” on → “Add”', 'The icon is on your screen 🎉 Open the app from the icon'], and: ['Open the link in Chrome, tap “⋮”', 'Tap “Install app”', 'Tap “Install”', 'The icon is on your screen 🎉 Open the app from the icon'] }, w: { partager: 'Share', more: 'View more', webapp: 'Open as Web App', vid: '🎬 Watch the real video', cart: '🎨 Cartoon', old: 'Older iPhone: tap ⬆︎ “Share” directly.', share: 'Add to Home Screen', copy: 'Copy', fav: 'Bookmarks', add: 'Add', cancel: 'Cancel', inst: 'Install app', install: 'Install', newtab: 'New tab' } },
  es: { t: 'Poner el icono en la pantalla', ios: 'iPhone', and: 'Android', close: 'Cerrar', s: { ios: ['En Safari, toque «•••» abajo a la derecha', 'Toque «Compartir» ⬆︎', 'Toque «Ver más» ⌄', 'Toque «Añadir a pantalla de inicio» ⊞', '«Abrir como app web» activado → «Añadir»', 'El icono está en su pantalla 🎉 Abra la app desde el icono'], and: ['Abra el enlace en Chrome, toque «⋮»', 'Toque «Instalar aplicación»', 'Toque «Instalar»', 'El icono está en su pantalla 🎉 Abra la app desde el icono'] }, w: { partager: 'Compartir', more: 'Ver más', webapp: 'Abrir como app web', vid: '🎬 Ver el vídeo real', cart: '🎨 Dibujo animado', old: 'iPhone más antiguo: toque directamente ⬆︎ «Compartir».', share: 'Pantalla de inicio', copy: 'Copiar', fav: 'Marcadores', add: 'Añadir', cancel: 'Cancelar', inst: 'Instalar aplicación', install: 'Instalar', newtab: 'Nueva pestaña' } },
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
  let os = /android/i.test(navigator.userAgent) ? 'and' : 'ios', step = 0, timer = 0, video = false;
  const back = document.createElement('div');
  back.className = 'ia-back'; back.setAttribute('role', 'dialog'); back.setAttribute('aria-modal', 'true');
  const ico = `<img src="${esc(icon)}" alt="">`;
  const site = `<div class="ia-site">${ico}${esc(name)}</div>`;
  const tap = (x, y) => `<span class="ia-tap" style="left:${x}%;top:${y}px"></span>`;
  const home = `<div class="ia-home">${Array.from({ length: 7 }, () => '<div class="ia-app"><i></i></div>').join('')}<div class="ia-app">${ico}${esc(name).slice(0, 12)}</div></div>`;
  const scenes = {
    ios: [ // iPhone récent (iOS 26) : ••• → Partager → En voir plus → Sur l'écran d'accueil → Ajouter
      `${site}<div class="ia-bot"><span>‹</span><span class="ia-url" style="flex:1.6">${esc(host)}</span><span>⟳</span><span>•••</span></div>${tap(90, 297)}`,
      `${site}<div class="ia-menu" style="top:auto;bottom:40px"><div><b>⬆︎ ${esc(w.partager)}</b></div><div>☆ ${esc(w.fav)}</div><div>＋ ${esc(w.newtab)}</div></div><div class="ia-bot"><span>‹</span><span class="ia-url" style="flex:1.6">${esc(host)}</span><span>⟳</span><span>•••</span></div>${tap(62, 205)}`,
      `<div class="ia-sheet" style="bottom:6px"><div style="justify-content:space-around"><span>💬</span><span>✉️</span><span>📝</span></div><div style="justify-content:space-around;font-size:9px"><span>⧉<br>${esc(w.copy)}</span><span>☆<br>${esc(w.fav)}</span><span><b>⌄<br>${esc(w.more)}</b></span></div></div>${tap(78, 285)}`,
      `<div class="ia-sheet" style="bottom:6px"><div>☆ ${esc(w.fav)}</div><div>🔍 …</div><div><b>⊞ ${esc(w.share)}</b></div></div>${tap(45, 293)}`,
      `<div class="ia-dlg" style="top:10px"><div class="ia-btns"><span>✕</span><span style="background:#2f6fd8;color:#fff;border-radius:10px;padding:2px 8px">${esc(w.add)}</span></div><div class="r">${ico}<b>${esc(name)}</b></div><div style="display:flex;justify-content:space-between;align-items:center"><span>${esc(w.webapp)}</span><span style="background:#34c759;border-radius:9px;width:26px;height:15px;display:inline-block"></span></div></div>${tap(85, 25)}`,
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
      ${video && os === 'ios' ? `<div class="ia-ph" style="height:420px;width:196px;background:#000"><video src="/assets/install-iphone.mp4" autoplay muted loop playsinline style="width:100%;height:100%;object-fit:cover"></video></div>`
        : `<div class="ia-ph">${scenes[os][step]}</div>
      <div class="ia-cap"><span>${step + 1}.</span> ${esc(t.s[os][step])}</div>
      <div class="ia-dots">${scenes[os].map((_, i) => `<i class="${i === step ? 'on' : ''}"></i>`).join('')}</div>`}
      ${os === 'ios' ? `<p style="text-align:center;margin:10px 0 0"><button data-ia="vid" style="border:0;background:#fff0e8;color:#c2531f;border-radius:999px;padding:8px 14px;font:inherit;font-weight:700;cursor:pointer">${esc(video ? w.cart : w.vid)}</button></p>${video ? '' : `<p style="text-align:center;font-size:12px;color:#777;margin:6px 0 0">${esc(w.old)}</p>`}` : ''}</div>`;
  };
  const tick = () => { if (video) return; const n = scenes[os].length; step = (step + 1) % n; draw(); timer = setTimeout(tick, step === n - 1 ? 3200 : 2600); };
  const close = () => { clearTimeout(timer); back.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  back.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ia]');
    if (e.target === back || (b && b.dataset.ia === 'x')) return close();
    if (b && b.dataset.ia === 'vid') { video = !video; step = 0; clearTimeout(timer); draw(); if (!video) timer = setTimeout(tick, 2600); return; }
    if (b && b.dataset.ia !== os) { os = b.dataset.ia; step = 0; video = false; clearTimeout(timer); draw(); timer = setTimeout(tick, 2600); }
  });
  document.addEventListener('keydown', onKey);
  document.body.appendChild(back);
  draw(); timer = setTimeout(tick, 2600);
  return close;
}
