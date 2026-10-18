// Cadrage d'une photo de profil : la personne déplace la photo dans le cercle (doigt / souris) et zoome (curseur, deux doigts, molette).
// Au départ, une photo en hauteur est cadrée vers le haut (le visage), pas au centre. Résultat : JPEG carré `size` px, ou null si annulé.
const L = {
  fr: ['Cadrer la photo', 'Glissez la photo pour placer le visage dans le cercle ; zoomez avec le curseur ou deux doigts.', 'Annuler', 'OK', 'Zoom'],
  it: ['Inquadra la foto', 'Trascina la foto per mettere il viso nel cerchio; ingrandisci con il cursore o con due dita.', 'Annulla', 'OK', 'Zoom'],
  de: ['Foto zuschneiden', 'Ziehen Sie das Foto, damit das Gesicht im Kreis ist; zoomen mit dem Regler oder zwei Fingern.', 'Abbrechen', 'OK', 'Zoom'],
  en: ['Frame the photo', 'Drag the photo to place the face in the circle; zoom with the slider or two fingers.', 'Cancel', 'OK', 'Zoom'],
  pt: ['Enquadrar a foto', 'Arraste a foto para colocar o rosto no círculo; amplie com o cursor ou dois dedos.', 'Cancelar', 'OK', 'Zoom'],
  es: ['Encuadrar la foto', 'Arrastra la foto para colocar la cara en el círculo; amplía con el cursor o dos dedos.', 'Cancelar', 'OK', 'Zoom'],
};
const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// cadrage automatique (sans fenêtre) : carré centré en largeur, vers le haut pour une photo en hauteur
export function autoBox(w, h) {
  const m = Math.min(w, h);
  return { x: (w - m) / 2, y: h > w ? (h - m) * 0.2 : (h - m) / 2, m };
}

export async function cropPhoto(file, lang = 'fr', size = 256) {
  const bmp = await createImageBitmap(file);
  const W = bmp.width, H = bmp.height, t = L[lang] || L.fr;
  const out = (x, y, m) => { const c = document.createElement('canvas'); c.width = c.height = size; c.getContext('2d').drawImage(bmp, x, y, m, m, 0, 0, size, size); return c.toDataURL('image/jpeg', 0.82); };
  return new Promise((resolve) => {
    const V = Math.max(200, Math.min(300, innerWidth - 72)), R = devicePixelRatio || 1, base = V / Math.min(W, H);
    const a0 = autoBox(W, H);
    let z = 1, ox = -a0.x * base, oy = -a0.y * base;
    const d = document.createElement('div');
    d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.className = 'cbox pcrop';
    d.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:16px';
    d.innerHTML = `<div style="background:#fff;color:#1a1a1a;border-radius:16px;padding:18px;max-width:360px;width:100%;box-shadow:0 20px 50px rgba(0,0,0,.35);font:inherit;text-align:center">
      <b style="display:block;font-size:17px;margin-bottom:6px">${esc(t[0])}</b>
      <p style="margin:0 0 12px;font-size:13px;line-height:1.4;color:#555">${esc(t[1])}</p>
      <canvas width="${V * R}" height="${V * R}" style="width:${V}px;height:${V}px;touch-action:none;cursor:grab;border-radius:12px;background:#222;display:block;margin:0 auto"></canvas>
      <label style="display:flex;align-items:center;gap:10px;margin:14px 4px 16px;font-size:14px">🔍<input type="range" min="100" max="400" value="100" aria-label="${esc(t[4])}" style="flex:1"></label>
      <div style="display:flex;gap:8px;justify-content:flex-end"><button type="button" class="btn sec" data-pc="0" style="background:#fff;color:#1a1a1a;border:1px solid #ccc">${esc(t[2])}</button><button type="button" class="btn" data-pc="1">${esc(t[3])}</button></div></div>`;
    const cv = d.querySelector('canvas'), g = cv.getContext('2d'), rg = d.querySelector('input[type=range]');
    const clamp = () => { const s = base * z; ox = Math.min(0, Math.max(V - W * s, ox)); oy = Math.min(0, Math.max(V - H * s, oy)); };
    const draw = () => {
      const s = base * z, r = V / 2 - 4;
      g.setTransform(R, 0, 0, R, 0, 0); g.clearRect(0, 0, V, V);
      g.drawImage(bmp, ox, oy, W * s, H * s);
      g.fillStyle = 'rgba(0,0,0,.5)'; g.beginPath(); g.rect(0, 0, V, V); g.arc(V / 2, V / 2, r, 0, Math.PI * 2); g.fill('evenodd');
      g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(V / 2, V / 2, r, 0, Math.PI * 2); g.stroke();
    };
    // zoom en gardant fixe le point (cx, cy) du cadre
    const zoomTo = (nz, cx = V / 2, cy = V / 2) => { nz = Math.min(4, Math.max(1, nz)); const k = nz / z; ox = cx - (cx - ox) * k; oy = cy - (cy - oy) * k; z = nz; clamp(); rg.value = String(Math.round(z * 100)); draw(); };
    const pts = new Map(); let pinch = 0;
    const pos = (e) => { const b = cv.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
    cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, pos(e)); pinch = 0; cv.style.cursor = 'grabbing'; });
    cv.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId)) return;
      const p = pos(e), q = pts.get(e.pointerId);
      if (pts.size === 1) { ox += p[0] - q[0]; oy += p[1] - q[1]; clamp(); draw(); }
      pts.set(e.pointerId, p);
      if (pts.size === 2) {
        const [a, b] = [...pts.values()], dist = Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (pinch) zoomTo(z * dist / pinch, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
        pinch = dist;
      }
    });
    const up = (e) => { pts.delete(e.pointerId); pinch = 0; if (!pts.size) cv.style.cursor = 'grab'; };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', (e) => { e.preventDefault(); const p = pos(e); zoomTo(z * (e.deltaY < 0 ? 1.1 : 1 / 1.1), p[0], p[1]); }, { passive: false });
    rg.addEventListener('input', () => zoomTo(+rg.value / 100));
    const key = (e) => { if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); done(false); } };
    const done = (ok) => {
      removeEventListener('keydown', key, true); d.remove();
      if (!ok) return resolve(null);
      const s = base * z;
      resolve(out(-ox / s, -oy / s, V / s));
    };
    d.addEventListener('click', (e) => { const b = e.target.closest('[data-pc]'); if (b) done(b.dataset.pc === '1'); });
    addEventListener('keydown', key, true);
    clamp(); draw();
    document.body.append(d);
    d.querySelector('[data-pc="1"]').focus();
  });
}
