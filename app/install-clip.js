// 🎬 Clip « Comment installer l'app » (iPhone et Android), en dessins animés (pas de vidéo) :
// utilisée sur le site (sous le bouton « Installer l'app ») et dans l'app. Montre l'iPhone ou l'Android selon le téléphone, les deux sur ordinateur.
// Usage : <div data-install-clip></div> + <script src="/app/install-clip.js"></script>   (ou import dans un module)
(function () {
  if (window.luxInstallClip) return;
  const CSS = `
.lic{display:flex;gap:18px;flex-wrap:wrap;justify-content:center;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;margin:14px 0}
.lic-c{width:170px;text-align:center}
.lic-t{font-size:13px;font-weight:700;color:#1B2E4B;margin-bottom:6px}
.lic-p{position:relative;width:150px;height:270px;margin:0 auto;border-radius:24px;background:#141312;padding:7px;box-shadow:0 8px 22px rgba(0,0,0,.18)}
.lic-s{position:relative;width:100%;height:100%;border-radius:18px;background:#F7F5F0;overflow:hidden}
.lic-f{position:absolute;inset:0;opacity:0;animation:licF 9s infinite}
.lic-f.f2{animation-delay:3s}.lic-f.f3{animation-delay:6s}
@keyframes licF{0%{opacity:0}3%{opacity:1}31%{opacity:1}34%{opacity:0}100%{opacity:0}}
.lic-cap{height:34px;font-size:11.5px;line-height:1.35;color:#444;margin-top:7px;position:relative}
.lic-cap span{position:absolute;left:0;right:0;opacity:0;animation:licF 9s infinite}
.lic-cap .f2{animation-delay:3s}.lic-cap .f3{animation-delay:6s}
.lic-web{position:absolute;left:0;right:0;top:0;height:30px;background:#1B2E4B}
.lic-web i{position:absolute;left:8px;top:7px;width:16px;height:16px;border-radius:50%;background:#fff}
.lic-web b{position:absolute;left:30px;top:11px;width:70px;height:7px;border-radius:4px;background:rgba(255,255,255,.7)}
.lic-tiles{position:absolute;left:8px;right:8px;top:40px;display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.lic-tiles i{height:34px;border-radius:8px;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.08)}
.lic-bar{position:absolute;left:0;right:0;bottom:0;height:30px;background:#ECEAE6;border-top:1px solid #ddd;display:flex;align-items:center;justify-content:space-around;font-size:13px;color:#2E6DA4}
.lic-top{position:absolute;left:0;right:0;top:0;height:26px;background:#ECEAE6;display:flex;align-items:center;padding:0 6px;gap:5px}
.lic-top .u{flex:1;height:14px;border-radius:7px;background:#fff}
.lic-top .m{width:14px;text-align:center;font-weight:900;color:#333;font-size:14px;line-height:14px}
.lic-hl{position:relative;border-radius:8px;animation:licP 1s infinite}
@keyframes licP{0%,100%{box-shadow:0 0 0 0 rgba(232,114,58,.0)}50%{box-shadow:0 0 0 5px rgba(232,114,58,.55)}}
.lic-fg{position:absolute;font-size:20px;animation:licT 1s infinite;pointer-events:none}
@keyframes licT{0%,100%{transform:translate(0,0)}50%{transform:translate(-3px,-4px)}}
.lic-sheet{position:absolute;left:5px;right:5px;bottom:5px;background:#fff;border-radius:12px;padding:6px;box-shadow:0 -2px 10px rgba(0,0,0,.15)}
.lic-row{display:flex;align-items:center;gap:6px;font-size:10.5px;color:#222;padding:6px 6px;border-bottom:1px solid #eee;text-align:left}
.lic-row:last-child{border-bottom:0}
.lic-menu{position:absolute;right:4px;top:24px;width:128px;background:#fff;border-radius:8px;padding:4px 0;box-shadow:0 3px 12px rgba(0,0,0,.2)}
.lic-home{position:absolute;inset:0;background:linear-gradient(160deg,#2E6DA4,#1B2E4B)}
.lic-apps{position:absolute;left:12px;right:12px;top:22px;display:grid;grid-template-columns:repeat(4,1fr);gap:12px 8px}
.lic-apps i{height:26px;border-radius:7px;background:rgba(255,255,255,.35)}
.lic-apps .lux{background:#fff center/86% no-repeat;animation:licN 3s infinite}
@keyframes licN{0%{transform:scale(.2);opacity:0}25%{transform:scale(1.15);opacity:1}35%,100%{transform:scale(1)}}
.lic-lbl{position:absolute;left:0;right:0;top:122px;text-align:center;color:#fff;font-size:10px;font-weight:700}
.lic-ok{position:absolute;left:10px;right:10px;bottom:16px;background:rgba(0,0,0,.35);color:#fff;font-size:10.5px;border-radius:8px;padding:6px;text-align:center}
@media (prefers-reduced-motion:reduce){.lic-f,.lic-cap span{animation:none}.lic-f.f3,.lic-cap .f3{opacity:1}}`;
  const LOGO = '/assets/luxinterventions-logo.png';
  const site = '<div class="lic-web"><i></i><b></b></div><div class="lic-tiles">' + '<i></i>'.repeat(9) + '</div>';
  const home = '<div class="lic-home"><div class="lic-apps">' + '<i></i>'.repeat(6) + `<i class="lux" style="background-image:url(${LOGO})"></i>` + '<i></i>'.repeat(5) + '</div><div class="lic-lbl">LuxInterventions</div><div class="lic-ok">✓ L’icône est sur votre écran</div></div>';
  const ios = `<div class="lic-c"><div class="lic-t">📱 iPhone (Safari)</div><div class="lic-p"><div class="lic-s">
    <div class="lic-f f1">${site}<div class="lic-bar"><span>‹</span><span>›</span><span class="lic-hl" style="padding:1px 5px">⬆️</span><span>📖</span><span>⧉</span></div><span class="lic-fg" style="left:76px;bottom:6px">👆</span></div>
    <div class="lic-f f2">${site}<div class="lic-sheet"><div class="lic-row">📋 Copier</div><div class="lic-row">🔖 Ajouter un signet</div><div class="lic-row lic-hl">➕ <b>Sur l’écran d’accueil</b></div></div><span class="lic-fg" style="right:14px;bottom:4px">👆</span></div>
    <div class="lic-f f3">${home}</div></div></div>
    <div class="lic-cap"><span class="f1">1 · Touchez <b>Partager</b> ⬆️ en bas</span><span class="f2">2 · <b>« Sur l’écran d’accueil »</b> puis Ajouter</span><span class="f3">3 · L’app est installée ✓</span></div></div>`;
  const android = `<div class="lic-c"><div class="lic-t">🤖 Android (Chrome)</div><div class="lic-p"><div class="lic-s">
    <div class="lic-f f1"><div style="position:absolute;inset:26px 0 0">${site}</div><div class="lic-top"><span class="u"></span><span class="m lic-hl">⋮</span></div><span class="lic-fg" style="right:0;top:18px">👆</span></div>
    <div class="lic-f f2"><div style="position:absolute;inset:26px 0 0">${site}</div><div class="lic-top"><span class="u"></span><span class="m">⋮</span></div>
      <div class="lic-menu"><div class="lic-row">🔖 Favoris</div><div class="lic-row">🕘 Historique</div><div class="lic-row lic-hl">📲 <b>Installer l’application</b></div></div><span class="lic-fg" style="right:20px;top:92px">👆</span></div>
    <div class="lic-f f3">${home}</div></div></div>
    <div class="lic-cap"><span class="f1">1 · Touchez le menu <b>⋮</b> en haut</span><span class="f2">2 · <b>« Installer l’application »</b></span><span class="f3">3 · L’app est installée ✓</span></div></div>`;
  function render(el) {
    if (!document.getElementById('lic-css')) { const s = document.createElement('style'); s.id = 'lic-css'; s.textContent = CSS; document.head.append(s); }
    const ua = navigator.userAgent, isIos = /iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1), isAnd = /android/i.test(ua);
    el.innerHTML = '<div class="lic">' + (isIos ? ios : isAnd ? android : ios + android) + '</div>';
  }
  window.luxInstallClip = render;
  const go = () => document.querySelectorAll('[data-install-clip]').forEach(render);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
