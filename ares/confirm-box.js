// Petite fenêtre de confirmation dans la page (window.confirm est ignoré par certains navigateurs intégrés : WhatsApp, Messenger…)
const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export function confirmBox(msg, yes, no, onYes) {
  const d = document.createElement('div');
  d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.className = 'cbox';
  d.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:16px';
  d.innerHTML = `<div style="background:#fff;color:#1a1a1a;border-radius:16px;padding:20px;max-width:360px;width:100%;box-shadow:0 20px 50px rgba(0,0,0,.35);font:inherit">
    <p style="margin:0 0 16px;font-weight:700;font-size:17px;line-height:1.4">${esc(msg)}</p>
    <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap"><button class="btn sec" data-cb="0">${esc(no)}</button><button class="btn" data-cb="1" style="background:#b91c1c;border-color:#b91c1c;color:#fff">${esc(yes)}</button></div></div>`;
  d.addEventListener('click', (e) => { const b = e.target.closest('[data-cb]'); if (!b && e.target !== d) return; d.remove(); if (b && b.dataset.cb === '1') onYes(); });
  document.body.append(d);
  d.querySelector('[data-cb="0"]').focus();
}
