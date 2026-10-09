// Petit dessin animé « Mettre l'icône sur l'écran du téléphone » (iPhone / Android), en boucle.
// Chargé seulement quand on touche le bouton (import dynamique) : rien à télécharger sinon.
// iPhone : dessin animé copié fidèlement sur une vraie installation (Safari iOS 26) ; Android : petit dessin animé (CSS). Aucune vidéo.
const TXT = {
  fr: { t: 'Mettre l’icône sur l’écran', ios: 'iPhone', and: 'Android', close: 'Fermer', s: { ios: ['Dans Safari, touchez « ••• » en bas à droite', 'Touchez « Partager » ⬆︎', 'Touchez « En voir plus » ⌄', 'Touchez « Sur l’écran d’accueil » ⊞', '« Ouvrir comme app web » activé → « Ajouter »', 'L’icône est sur votre écran 🎉 Ouvrez l’app depuis l’icône'], and: ['Ouvrez le lien dans Chrome, touchez « ⋮ »', 'Touchez « Installer l’application »', 'Touchez « Installer »', 'L’icône est sur votre écran 🎉 Ouvrez l’app depuis l’icône'] }, w: { sig: 'Ajouter à Signets', sigto: 'Ajouter un signet à…', priv: 'Nouvel onglet privé', bms: 'Signets', tabs: 'Tous les onglets', read: 'Ajouter à la liste de lecture', fav2: 'Ajouter aux favoris', note: 'Ajouter à une note rapide', find: 'Rechercher dans la page', less: 'En voir moins', opts: 'Options', hint: 'Une icône sera ajoutée à l’écran d’accueil pour un accès immédiat à ce site web.', partager: 'Partager', more: 'En voir plus', webapp: 'Ouvrir comme app web', old: 'Ancien iPhone : touchez directement ⬆︎ « Partager ».', share: 'Sur l’écran d’accueil', copy: 'Copier', fav: 'Favoris', add: 'Ajouter', cancel: 'Annuler', inst: 'Installer l’application', install: 'Installer', newtab: 'Nouvel onglet' } },
  it: { t: 'Mettere l’icona sullo schermo', ios: 'iPhone', and: 'Android', close: 'Chiudi', s: { ios: ['In Safari, tocca «•••» in basso a destra', 'Tocca «Condividi» ⬆︎', 'Tocca «Mostra altro» ⌄', 'Tocca «Aggiungi alla schermata Home» ⊞', '«Apri come web app» attivo → «Aggiungi»', 'L’icona è sul tuo schermo 🎉 Apri l’app dall’icona'], and: ['Apri il link in Chrome, tocca «⋮»', 'Tocca «Installa app»', 'Tocca «Installa»', 'L’icona è sul tuo schermo 🎉 Apri l’app dall’icona'] }, w: { sig: 'Aggiungi segnalibro', sigto: 'Aggiungi segnalibro a…', priv: 'Nuovo pannello privato', bms: 'Segnalibri', tabs: 'Tutti i pannelli', read: 'Aggiungi a Elenco lettura', fav2: 'Aggiungi ai Preferiti', note: 'Aggiungi a Nota rapida', find: 'Trova nella pagina', less: 'Mostra meno', opts: 'Opzioni', hint: 'Un’icona verrà aggiunta alla schermata Home per accedere subito a questo sito web.', partager: 'Condividi', more: 'Mostra altro', webapp: 'Apri come web app', old: 'iPhone meno recente: tocca subito ⬆︎ «Condividi».', share: 'Aggiungi a Home', copy: 'Copia', fav: 'Preferiti', add: 'Aggiungi', cancel: 'Annulla', inst: 'Installa app', install: 'Installa', newtab: 'Nuova scheda' } },
  de: { t: 'Symbol auf den Bildschirm legen', ios: 'iPhone', and: 'Android', close: 'Schließen', s: { ios: ['In Safari unten rechts „•••“ tippen', '„Teilen“ ⬆︎ tippen', '„Mehr anzeigen“ ⌄ tippen', '„Zum Home-Bildschirm“ ⊞ tippen', '„Als Web-App öffnen“ an → „Hinzufügen“', 'Das Symbol ist auf dem Bildschirm 🎉 App über das Symbol öffnen'], and: ['Link in Chrome öffnen, „⋮“ tippen', '„App installieren“ tippen', '„Installieren“ tippen', 'Das Symbol ist auf dem Bildschirm 🎉 App über das Symbol öffnen'] }, w: { sig: 'Lesezeichen hinzufügen', sigto: 'Lesezeichen hinzufügen zu …', priv: 'Neuer privater Tab', bms: 'Lesezeichen', tabs: 'Alle Tabs', read: 'Zur Leseliste hinzufügen', fav2: 'Zu Favoriten hinzufügen', note: 'Zur Notiz hinzufügen', find: 'Auf der Seite suchen', less: 'Weniger anzeigen', opts: 'Optionen', hint: 'Ein Symbol wird zum Home-Bildschirm hinzugefügt, damit du schnell auf diese Website zugreifen kannst.', partager: 'Teilen', more: 'Mehr anzeigen', webapp: 'Als Web-App öffnen', old: 'Älteres iPhone: direkt ⬆︎ „Teilen“ tippen.', share: 'Zum Home-Bildschirm', copy: 'Kopieren', fav: 'Favoriten', add: 'Hinzufügen', cancel: 'Abbrechen', inst: 'App installieren', install: 'Installieren', newtab: 'Neuer Tab' } },
  pt: { t: 'Pôr o ícone no ecrã', ios: 'iPhone', and: 'Android', close: 'Fechar', s: { ios: ['No Safari, toque em «•••» em baixo à direita', 'Toque em «Partilhar» ⬆︎', 'Toque em «Ver mais» ⌄', 'Toque em «Adicionar ao ecrã principal» ⊞', '«Abrir como app web» ativado → «Adicionar»', 'O ícone está no seu ecrã 🎉 Abra a app pelo ícone'], and: ['Abra o link no Chrome, toque em «⋮»', 'Toque em «Instalar app»', 'Toque em «Instalar»', 'O ícone está no seu ecrã 🎉 Abra a app pelo ícone'] }, w: { sig: 'Adicionar marcador', sigto: 'Adicionar marcador a…', priv: 'Novo separador privado', bms: 'Marcadores', tabs: 'Todos os separadores', read: 'Adicionar à lista de leitura', fav2: 'Adicionar aos favoritos', note: 'Adicionar a nota rápida', find: 'Procurar na página', less: 'Ver menos', opts: 'Opções', hint: 'Será adicionado um ícone ao ecrã principal para aceder rapidamente a este site.', partager: 'Partilhar', more: 'Ver mais', webapp: 'Abrir como app web', old: 'iPhone mais antigo: toque logo em ⬆︎ «Partilhar».', share: 'Ecrã principal', copy: 'Copiar', fav: 'Favoritos', add: 'Adicionar', cancel: 'Cancelar', inst: 'Instalar app', install: 'Instalar', newtab: 'Novo separador' } },
  en: { t: 'Put the icon on your screen', ios: 'iPhone', and: 'Android', close: 'Close', s: { ios: ['In Safari, tap “•••” at the bottom right', 'Tap “Share” ⬆︎', 'Tap “View more” ⌄', 'Tap “Add to Home Screen” ⊞', '“Open as Web App” on → “Add”', 'The icon is on your screen 🎉 Open the app from the icon'], and: ['Open the link in Chrome, tap “⋮”', 'Tap “Install app”', 'Tap “Install”', 'The icon is on your screen 🎉 Open the app from the icon'] }, w: { sig: 'Add Bookmark', sigto: 'Add Bookmark to…', priv: 'New Private Tab', bms: 'Bookmarks', tabs: 'All Tabs', read: 'Add to Reading List', fav2: 'Add to Favorites', note: 'Add to Quick Note', find: 'Find on Page', less: 'View Less', opts: 'Options', hint: 'An icon will be added to your Home Screen so you can quickly access this website.', partager: 'Share', more: 'View more', webapp: 'Open as Web App', old: 'Older iPhone: tap ⬆︎ “Share” directly.', share: 'Add to Home Screen', copy: 'Copy', fav: 'Bookmarks', add: 'Add', cancel: 'Cancel', inst: 'Install app', install: 'Install', newtab: 'New tab' } },
  es: { t: 'Poner el icono en la pantalla', ios: 'iPhone', and: 'Android', close: 'Cerrar', s: { ios: ['En Safari, toque «•••» abajo a la derecha', 'Toque «Compartir» ⬆︎', 'Toque «Ver más» ⌄', 'Toque «Añadir a pantalla de inicio» ⊞', '«Abrir como app web» activado → «Añadir»', 'El icono está en su pantalla 🎉 Abra la app desde el icono'], and: ['Abra el enlace en Chrome, toque «⋮»', 'Toque «Instalar aplicación»', 'Toque «Instalar»', 'El icono está en su pantalla 🎉 Abra la app desde el icono'] }, w: { sig: 'Añadir marcador', sigto: 'Añadir marcador a…', priv: 'Nueva pestaña privada', bms: 'Marcadores', tabs: 'Todas las pestañas', read: 'Añadir a la lista de lectura', fav2: 'Añadir a favoritos', note: 'Añadir a nota rápida', find: 'Buscar en la página', less: 'Ver menos', opts: 'Opciones', hint: 'Se añadirá un icono a la pantalla de inicio para acceder rápidamente a este sitio web.', partager: 'Compartir', more: 'Ver más', webapp: 'Abrir como app web', old: 'iPhone más antiguo: toque directamente ⬆︎ «Compartir».', share: 'Pantalla de inicio', copy: 'Copiar', fav: 'Marcadores', add: 'Añadir', cancel: 'Cancelar', inst: 'Instalar aplicación', install: 'Instalar', newtab: 'Nueva pestaña' } },
};
const CSS = `
.ia-back{position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:16px;font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif}
.ia-box{background:#fff;color:#1f1f1f;border-radius:22px;width:100%;max-width:380px;padding:16px;box-shadow:0 20px 60px rgba(0,0,0,.35)}
.ia-h{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px}.ia-h b{font-size:17px}
.ia-x{border:0;background:#eee;border-radius:50%;width:34px;height:34px;font-size:18px;cursor:pointer}
.ia-tabs{display:flex;gap:6px;background:#f1f1f1;border-radius:12px;padding:4px;margin-bottom:10px}.ia-tabs button{flex:1;border:0;background:none;padding:7px;border-radius:9px;font:inherit;font-weight:700;cursor:pointer;color:#555}.ia-tabs button[aria-pressed=true]{background:#fff;color:#111;box-shadow:0 1px 3px rgba(0,0,0,.12)}
.ia-ph{position:relative;height:380px;width:206px;margin:0 auto;border:8px solid #222;border-radius:30px;background:#f6f6f6;overflow:hidden}
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
.ia-ph.ios{height:400px}
.r-pg{position:absolute;inset:0;background:#fbf7f4}.r-hd{display:flex;align-items:center;gap:5px;padding:8px 8px 6px;background:#fff;border-bottom:1px solid #eee;font-size:8px;font-weight:700}.r-hd img{width:16px;height:16px;border-radius:50%}
.r-hd .sp{flex:1}.r-hd .o{width:14px;height:14px;border-radius:50%;background:#e8723a}
.r-bn{display:flex;justify-content:center;gap:3px;padding:6px 0;background:#fff}.r-bn img{width:40px;height:40px;border-radius:50%}
.r-tag{margin:14px 10px 6px;display:inline-block;font-size:6.5px;font-weight:800;color:#c2531f;background:#fdebe1;border-radius:9px;padding:3px 7px;letter-spacing:.04em}
.r-h1{margin:6px 10px;font:700 16px/1.12 Georgia,serif;color:#1a1a1a}.r-h1 i{color:#e8723a}.r-tx{margin:6px 10px;font-size:7px;color:#666;line-height:1.5}
.r-pop{position:absolute;right:8px;bottom:46px;width:132px;background:rgba(252,252,252,.97);border-radius:18px;box-shadow:0 10px 30px rgba(0,0,0,.25);padding:5px 0;font-size:10px;animation:iaPop .3s ease-out both}
.r-pop .it{display:flex;gap:8px;align-items:center;padding:6px 11px}.r-pop .it i{font-style:normal;width:14px;text-align:center}.r-pop .ft{display:flex;justify-content:space-around;border-top:1px solid #e5e5e5;margin-top:3px;padding-top:6px;font-size:8px;text-align:center}
.r-sh{position:absolute;left:0;right:0;bottom:0;background:#f2f2f7;border-radius:18px 18px 0 0;box-shadow:0 -6px 20px rgba(0,0,0,.12);padding:10px 8px 8px;font-size:8px;animation:iaUp .4s ease-out both}
.r-sh.full{top:24px;animation:none}.r-sh .hd{display:flex;gap:7px;align-items:center;margin-bottom:6px;font-size:9px}.r-sh .hd img{width:30px;height:30px;border-radius:7px}.r-sh .hd small{color:#888;display:block}
.r-sh .op{display:inline-block;background:#fff;border-radius:10px;padding:2px 8px;font-size:8px;margin:0 0 8px 37px}
.r-sh .x{position:absolute;right:10px;top:10px;width:18px;height:18px;border-radius:50%;background:#e3e3e8;display:flex;align-items:center;justify-content:center;font-size:9px}
.r-ap{display:flex;justify-content:space-around;text-align:center;margin-bottom:8px}.r-ap i{display:block;width:30px;height:30px;border-radius:8px;margin:0 auto 2px;font-style:normal;font-size:15px;line-height:30px;color:#fff}
.r-ac{display:flex;justify-content:space-around;text-align:center;font-size:7px;line-height:1.15}.r-ac span{width:42px}.r-ac i{display:block;width:30px;height:30px;border-radius:50%;background:#fff;margin:0 auto 2px;font-style:normal;font-size:13px;line-height:30px;color:#333}
.r-ls{background:#fff;border-radius:11px;margin-top:8px}.r-ls .it{display:flex;gap:8px;align-items:center;padding:7px 10px;border-bottom:1px solid #eee;font-size:9.5px}.r-ls .it:last-child{border:0}.r-ls i{font-style:normal;width:14px;text-align:center}
.r-ad{position:absolute;inset:0;background:#f2f2f7;font-size:9px;animation:iaUp .4s ease-out both}.r-ad .top{display:flex;align-items:center;gap:6px;padding:9px 8px}.r-ad .top b{flex:1;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.r-ad .cx{width:24px;height:24px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;flex:none}.r-ad .ok{background:#0a84ff;color:#fff;border-radius:14px;padding:5px 10px;font-weight:700;flex:none}
.r-ad .cd{background:#fff;margin:4px 8px;border-radius:10px;padding:8px;display:flex;gap:8px;align-items:center}.r-ad .cd img{width:30px;height:30px;border-radius:50%}.r-ad .cd small{color:#aaa;display:block;margin-top:3px}
.r-ad .tg{background:#fff;margin:8px 8px 3px;border-radius:10px;padding:8px;display:flex;justify-content:space-between;align-items:center;font-size:10px}.r-ad .sw{width:32px;height:19px;border-radius:10px;background:#34c759;position:relative;flex:none}.r-ad .sw::after{content:'';position:absolute;right:2px;top:2px;width:15px;height:15px;border-radius:50%;background:#fff}
.r-ad .hn{margin:0 12px;color:#888;font-size:8px;line-height:1.35}
.r-hm{position:absolute;inset:0;background:radial-gradient(circle at 30% 20%,#7aa0d8,#2c3e66 55%,#1b2238);display:grid;grid-template-columns:repeat(4,1fr);gap:12px 4px;padding:26px 10px;align-content:start}
.r-hm .a{text-align:center;color:#fff;font-size:7px}.r-hm .a i{display:block;width:36px;height:36px;margin:0 auto 3px;border-radius:9px;filter:blur(1.5px);opacity:.85}
.r-hm .a img{width:36px;height:36px;border-radius:9px;display:block;margin:0 auto 3px;animation:iaIcon .9s cubic-bezier(.3,1.6,.5,1) both;box-shadow:0 0 0 2px #fff}
.ia-dots{display:flex;justify-content:center;gap:6px}.ia-dots i{width:8px;height:8px;border-radius:50%;background:#ddd}.ia-dots i.on{background:#d9622b}
.ia-fing{position:absolute;font-size:30px;margin:2px 0 0 4px;pointer-events:none;animation:iaFing 1.1s ease-in-out .3s infinite;filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))}
@keyframes iaFing{0%,100%{transform:translate(8px,10px)}45%{transform:translate(0,0)}55%{transform:translate(0,0) scale(.92)}}
.ia-on{animation:iaPress 1.1s ease-in-out .3s infinite;border-radius:9px}
@keyframes iaPress{0%,40%,100%{background:transparent}50%,70%{background:rgba(229,57,53,.18)}}
.i-pill{position:absolute;left:8px;right:8px;bottom:8px;display:flex;gap:6px;align-items:center}
.i-pill .b{width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,.92);box-shadow:0 2px 8px rgba(0,0,0,.18);display:flex;align-items:center;justify-content:center;font-size:13px;color:#222;flex:none}
.i-pill .u{flex:1;height:30px;border-radius:16px;background:rgba(255,255,255,.92);box-shadow:0 2px 8px rgba(0,0,0,.18);display:flex;align-items:center;justify-content:center;gap:5px;font-size:10px;color:#222}
.i-pop{position:absolute;right:8px;bottom:46px;width:128px;background:rgba(250,250,250,.97);border-radius:16px;box-shadow:0 8px 24px rgba(0,0,0,.22);padding:4px 0;font-size:11px;animation:iaPop .3s ease-out both}
.i-pop .it{display:flex;gap:7px;align-items:center;padding:7px 10px}.i-bar{height:6px;border-radius:3px;background:#d8d8dc;flex:1}
.i-sh{position:absolute;left:0;right:0;bottom:0;background:#f2f2f7;border-radius:16px 16px 0 0;padding:10px 8px 8px;animation:iaUp .4s ease-out both;font-size:9px}
.i-hd{display:flex;gap:6px;align-items:center;margin-bottom:8px}.i-hd img{width:28px;height:28px;border-radius:7px}
.i-apps{display:flex;justify-content:space-around;margin-bottom:8px;text-align:center}.i-apps i{display:block;width:30px;height:30px;border-radius:9px;margin:0 auto 2px;font-style:normal;font-size:16px;line-height:30px}
.i-acts{display:flex;justify-content:space-around;text-align:center}.i-acts span{width:44px}.i-acts i{display:block;width:30px;height:30px;border-radius:50%;background:#fff;margin:0 auto 2px;font-style:normal;font-size:13px;line-height:30px}
.i-list{background:#fff;border-radius:10px;margin-top:8px}.i-list .it{display:flex;gap:7px;align-items:center;padding:7px 9px;border-bottom:1px solid #eee;font-size:10px}.i-list .it:last-child{border:0}
.i-add{position:absolute;inset:0;background:#f2f2f7;font-size:10px;animation:iaUp .4s ease-out both}
.i-add .top{display:flex;justify-content:space-between;align-items:center;padding:10px 8px;background:#f9f9f9}.i-add .x{width:24px;height:24px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center}
.i-add .ok{background:#0a84ff;color:#fff;border-radius:14px;padding:5px 10px;font-weight:700}
.i-add .card{background:#fff;margin:8px;border-radius:10px;padding:8px;display:flex;gap:8px;align-items:center}.i-add .card img{width:34px;height:34px;border-radius:8px}
.i-add .tg{background:#fff;margin:8px;border-radius:10px;padding:9px;display:flex;justify-content:space-between;align-items:center}.i-add .sw{width:30px;height:18px;border-radius:9px;background:#34c759;position:relative}.i-add .sw::after{content:'';position:absolute;right:2px;top:2px;width:14px;height:14px;border-radius:50%;background:#fff}
.i-kb{position:absolute;left:0;right:0;bottom:0;height:120px;background:#d1d3d9;display:grid;grid-template-columns:repeat(10,1fr);gap:4px;padding:8px 4px}.i-kb i{background:#fff;border-radius:4px;height:22px}
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
  const tap = (x, y) => `<span class="ia-tap" style="left:${x}%;top:${y}px"></span><span class="ia-fing" style="left:${x}%;top:${y}px">👆</span>`;
  const page = `<div class="ia-site" style="top:40px">${ico}${esc(name)}</div><div style="position:absolute;left:14px;right:14px;top:150px;display:grid;gap:7px"><div class="i-bar" style="height:10px;width:80%"></div><div class="i-bar" style="height:10px;width:60%"></div><div class="i-bar"></div><div class="i-bar" style="width:90%"></div><div class="i-bar" style="width:70%"></div></div>`;
  const pill = `<div class="i-pill"><span class="b">‹</span><span class="u">≡ ${esc(host.replace(/^www\./, ''))} ⟳</span><span class="b">•••</span></div>`;
  const home = `<div class="ia-home">${Array.from({ length: 7 }, () => '<div class="ia-app"><i></i></div>').join('')}<div class="ia-app">${ico}${esc(name).slice(0, 12)}</div></div>`;
  const short = host.replace(/^www\./, '').slice(-14);
  const rpage = `<div class="r-pg"><div class="r-hd">${ico.replace('<img', '<img class="lg"')}<span>${esc(name)}</span><span class="sp"></span><span class="o"></span></div><div class="r-bn">${ico}</div><span class="r-tag">• DISPONIBLE 7J/7 · 24H/24</span><div class="r-h1">“${esc(name)}”<br><i>24h/24</i></div><div class="r-tx">${'▬ '.repeat(18)}</div></div>`;
  const rpill = `<div class="i-pill"><span class="b">‹</span><span class="u">≡ ${esc(short)} ⟳</span><span class="b">•••</span></div>`;
  const rhead = `<div class="hd">${ico}<span><b>${esc(name)}</b><small>${esc(host)}</small></span></div><span class="op">${esc(w.opts)} ›</span>`;
  const rapps = `<div class="r-ap"><span><i style="background:linear-gradient(#5ac8fa,#007aff)">◎</i>AirDrop</span><span><i style="background:#34c759">💬</i>Messages</span><span><i style="background:linear-gradient(#5ac8fa,#1a73e8)">✉</i>Mail</span><span><i style="background:#fff;color:#c9a400;border-top:6px solid #ffd60a">≡</i>Notes</span></div>`;
  const racts = (last, on) => `<div class="r-ac"><span><i>⧉</i>${esc(w.copy)}</span><span><i>📖</i>${esc(w.sig)}</span><span><i>👓</i>${esc(w.read)}</span><span class="${on ? 'ia-on' : ''}"><i>${last[0]}</i>${on ? '<b>' : ''}${esc(last[1])}${on ? '</b>' : ''}</span></div>`;
  const rhome = `<div class="r-hm">${Array.from({ length: 19 }, (_, i) => `<div class="a"><i style="background:hsl(${(i * 47) % 360} 70% 55%)"></i></div>`).join('')}<div class="a">${ico}${esc(name).slice(0, 13)}</div></div>`;
  const scenes = {
    ios: [ // copie fidèle de la vraie vidéo (Safari iOS 26) : ••• → Partager → En voir plus → Sur l'écran d'accueil → Ajouter
      `${rpage}${rpill}${tap(88, 365)}`,
      `${rpage}<div class="r-pop"><div class="it ia-on"><i>⬆︎</i><b>${esc(w.partager)}</b></div><div class="it"><i>📖</i>${esc(w.sig)}</div><div class="it"><i>📚</i>${esc(w.sigto)}</div><div class="it"><i>＋</i>${esc(w.newtab)}</div><div class="it"><i>✋</i>${esc(w.priv)}</div><div class="ft"><span>📖<br>${esc(w.bms)}</span><span>⧉<br>${esc(w.tabs)}</span></div></div>${rpill}${tap(60, 157)}`,
      `${rpage}<div class="r-sh">${rhead}<span class="x">✕</span>${rapps}${racts(['⌄', w.more], true)}</div>${tap(86, 370)}`,
      `<div class="r-sh full">${rhead}<span class="x">✕</span>${rapps}${racts(['⌃', w.less], false)}<div class="r-ls"><div class="it"><i>📖</i>${esc(w.sigto)}</div><div class="it"><i>☆</i>${esc(w.fav2)}</div><div class="it"><i>📝</i>${esc(w.note)}</div><div class="it"><i>🔍</i>${esc(w.find)}</div><div class="it ia-on"><i>⊞</i><b>${esc(w.share)}</b></div></div></div>${tap(32, 342)}`,
      `<div class="r-ad"><div class="top"><span class="cx">✕</span><b>${esc(w.share)}</b><span class="ok">${esc(w.add)}</span></div><div class="cd">${ico}<span><b>${esc(name)}</b><small>https://${esc(host)}/</small></span></div><div class="tg"><span>${esc(w.webapp)}</span><span class="sw"></span></div><div class="hn">${esc(w.hint)}</div><div class="i-kb">${'<i></i>'.repeat(30)}</div></div>${tap(86, 24)}`,
      rhome,
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
      <div class="ia-ph${os === 'ios' ? ' ios' : ''}">${scenes[os][step]}</div>
      <div class="ia-cap"><span>${step + 1}.</span> ${esc(t.s[os][step])}</div>
      <div class="ia-dots">${scenes[os].map((_, i) => `<i class="${i === step ? 'on' : ''}"></i>`).join('')}</div>
      ${os === 'ios' ? `<p style="text-align:center;font-size:12px;color:#777;margin:8px 0 0">${esc(w.old)}</p>` : ''}</div>`;
  };
  const tick = () => { const n = scenes[os].length; step = (step + 1) % n; draw(); timer = setTimeout(tick, step === n - 1 ? 3200 : 2600); };
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
