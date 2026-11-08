// 😊 Bouton émojis à côté de chaque case de message (chats des locataires, ouvriers, hôtes, taxis, annonceurs, centrale).
// Il se pose tout seul devant chaque <textarea name="x"> ; un toucher ouvre la grille, un émoji s'insère là où se trouve le curseur.
const EMO = '😀 😃 😄 😁 😆 😅 😂 🤣 😊 🙂 😉 😍 🥰 😘 😋 😎 🤗 🤔 😐 🙄 😏 😴 😌 😢 😭 😤 😠 😡 🤯 😳 😱 🥺 😇 🤩 🥳 😬 🤐 🤞 👍 👎 👌 ✌️ 👏 🙌 🙏 💪 👋 🤝 ❤️ 🧡 💛 💚 💙 💜 🖤 💔 💕 💯 🔥 ✨ 🎉 🎂 🎁 🌹 🌞 🌙 ⭐ ☕ 🍕 🍷 🍺 🏠 🔑 🚗 🧹 🗑️ 🔧 💡 ⚠️ ✅ ❌ ❓ ⏰ 📞 📷'.split(' ');
let pop = null, target = null, started = false;
function close() { if (pop) { pop.remove(); pop = null; } target = null; }
function open(btn) {
  const ta = btn.parentNode && btn.parentNode.querySelector('textarea[name=x]');
  if (!ta) return;
  if (pop && target === ta) return close();
  close();
  target = ta;
  pop = document.createElement('div');
  pop.className = 'emo-pop';
  pop.innerHTML = EMO.map((e) => `<button type="button" data-emo="${e}">${e}</button>`).join('');
  (btn.closest('dialog[open]') || document.body).append(pop);
  const r = btn.getBoundingClientRect(), w = Math.min(320, innerWidth - 16), h = 236;
  pop.style.width = w + 'px';
  pop.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left)) + 'px';
  pop.style.top = (r.top - h - 6 > 8 ? r.top - h - 6 : Math.min(innerHeight - h - 8, r.bottom + 6)) + 'px';
}
function insert(e) {
  const ta = target;
  if (!ta || !ta.isConnected) return close();
  const a = ta.selectionStart ?? ta.value.length, b = ta.selectionEnd ?? a;
  ta.value = ta.value.slice(0, a) + e + ta.value.slice(b);
  const p = a + e.length;
  try { ta.setSelectionRange(p, p); } catch { /* pas de curseur */ }
  ta.dispatchEvent(new Event('input', { bubbles: true }));
}
function place(root) {
  for (const ta of root.querySelectorAll('textarea[name=x]:not([data-emo-on])')) {
    ta.dataset.emoOn = '1';
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'emo-btn'; b.textContent = '😊'; b.setAttribute('aria-label', 'Émojis');
    ta.before(b);
  }
}
export function emojiInit() {
  if (started) return;
  started = true;
  const st = document.createElement('style');
  st.textContent = `.emo-btn{flex:none;align-self:flex-end;width:42px;height:42px;min-height:42px;border:0;border-radius:50%;background:rgba(127,127,127,.15);font-size:22px;line-height:1;cursor:pointer;padding:0;margin:0}
.emo-pop{position:fixed;z-index:10000;height:236px;overflow-y:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(38px,1fr));gap:2px;padding:8px;background:#fff;border-radius:14px;box-shadow:0 8px 30px rgba(0,0,0,.25)}
.emo-pop button{border:0;background:none;font-size:24px;height:38px;cursor:pointer;border-radius:8px;padding:0}.emo-pop button:hover{background:#f1f1f1}
@media (prefers-color-scheme: dark){.emo-pop{background:#1f2023}.emo-pop button:hover{background:#2c2d31}}`;
  document.head.append(st);
  // pointerdown : la case de texte garde le curseur (le clavier du téléphone ne se ferme pas)
  document.addEventListener('pointerdown', (e) => { if (e.target.closest && (e.target.closest('.emo-btn') || e.target.closest('.emo-pop'))) e.preventDefault(); }, true);
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('.emo-btn');
    if (b) { e.preventDefault(); e.stopPropagation(); open(b); return; }
    const x = e.target.closest && e.target.closest('[data-emo]');
    if (x && pop && pop.contains(x)) { e.preventDefault(); e.stopPropagation(); insert(x.dataset.emo); return; }
    if (pop && !pop.contains(e.target)) close();
  }, true);
  place(document.body);
  new MutationObserver(() => { place(document.body); if (target && !target.isConnected) close(); }).observe(document.body, { childList: true, subtree: true });
}
