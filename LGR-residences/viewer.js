// Aperçu des documents : PDF (pdf.js, rendu jusqu'à 3000 px), images (JPG, PNG, HEIC sur Safari) ;
// loupe au survol de la souris, double-clic = plein écran avec zoom (molette, pincement, + / −) et déplacement.
let pdfjsP = null;
function pdfjs() {
  if (!pdfjsP) pdfjsP = import('./vendor/pdf.min.mjs').then((m) => { m.GlobalWorkerOptions.workerSrc = new URL('./vendor/pdf.worker.min.mjs', import.meta.url).href; return m; });
  return pdfjsP;
}
export async function openPdf(bytes) {
  const lib = await pdfjs();
  return lib.getDocument({ data: bytes.slice(), isEvalSupported: false }).promise;
}
// image d'une page, côté le plus long = max px
export async function pdfPageUrl(pdf, n, max = 3000) {
  const page = await pdf.getPage(n);
  const v1 = page.getViewport({ scale: 1 });
  const scale = Math.min(6, max / Math.max(v1.width, v1.height));
  const vp = page.getViewport({ scale });
  const c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
  const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
  await page.render({ canvasContext: ctx, viewport: vp }).promise;
  const blob = await new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.9));
  c.width = c.height = 0;
  return URL.createObjectURL(blob);
}
// texte des premières pages (recherche et suggestions : n°, date, montant)
export async function pdfText(bytes, pages = 3) {
  try {
    const pdf = await openPdf(bytes); let out = '';
    for (let i = 1; i <= Math.min(pages, pdf.numPages); i++) {
      const tc = await (await pdf.getPage(i)).getTextContent();
      out += tc.items.map((x) => x.str + (x.hasEOL ? '\n' : ' ')).join('') + '\n';
    }
    pdf.destroy();
    return { text: out.slice(0, 8000), pages: pdf.numPages };
  } catch { return { text: '', pages: 0 }; }
}
export const kindOf = (mime, name) => /pdf/.test(mime) || /\.pdf$/i.test(name) ? 'pdf' : /^image\//.test(mime) || /\.(jpe?g|png|heic|heif|webp|gif)$/i.test(name) ? 'img' : 'file';

// ── Loupe sur une image affichée ──
export function attachLens(img, zoom = 3) {
  const wrap = img.parentElement; let lens = null;
  const move = (e) => {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    const r = img.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    if (x < 0 || y < 0 || x > r.width || y > r.height) { if (lens) lens.style.display = 'none'; return; }
    if (!lens) { lens = document.createElement('div'); lens.className = 'lens'; wrap.appendChild(lens); }
    const size = 170, wr = wrap.getBoundingClientRect();
    lens.style.display = 'block';
    lens.style.left = (r.left - wr.left + x - size / 2) + 'px'; lens.style.top = (r.top - wr.top + y - size / 2) + 'px';
    lens.style.backgroundImage = `url("${img.src}")`;
    lens.style.backgroundSize = `${r.width * zoom}px ${r.height * zoom}px`;
    lens.style.backgroundPosition = `${-(x * zoom - size / 2)}px ${-(y * zoom - size / 2)}px`;
  };
  wrap.addEventListener('pointermove', move);
  wrap.addEventListener('pointerleave', () => { if (lens) lens.style.display = 'none'; });
}

// ── Plein écran : zoom et déplacement (souris, trackpad, doigts) ──
export function zoomView(src, { title = '', pages = 1, page = 1, onPage } = {}) {
  const ov = document.createElement('div'); ov.className = 'zoomov';
  ov.innerHTML = `<div class="zbar"><b class="ztitle"></b><span class="zpg"></span><span class="grow"></span>
    <button data-z="out" aria-label="−">−</button><button data-z="fit">⤢</button><button data-z="in" aria-label="+">＋</button><button data-z="close" aria-label="✕">✕</button></div>
    <div class="zstage"><img alt=""></div>`;
  ov.querySelector('.ztitle').textContent = title;
  document.body.appendChild(ov);
  const stage = ov.querySelector('.zstage'), img = ov.querySelector('img');
  let s = 1, tx = 0, ty = 0, fit = 1, cur = page;
  const apply = () => { img.style.transform = `translate(${tx}px,${ty}px) scale(${s})`; };
  const reset = () => {
    const W = stage.clientWidth, H = stage.clientHeight;
    fit = Math.min(W / img.naturalWidth, H / img.naturalHeight, 1); s = fit;
    tx = (W - img.naturalWidth * s) / 2; ty = (H - img.naturalHeight * s) / 2; apply();
  };
  const zoomAt = (f, cx, cy) => {
    const ns = Math.max(fit * 0.5, Math.min(4, s * f));
    tx = cx - (cx - tx) * (ns / s); ty = cy - (cy - ty) * (ns / s); s = ns; apply();
  };
  const pg = () => { ov.querySelector('.zpg').innerHTML = pages > 1 ? `<button data-z="prev">‹</button> ${cur} / ${pages} <button data-z="next">›</button>` : ''; };
  const load = (u) => { img.onload = reset; img.src = u; };
  load(src); pg();
  stage.addEventListener('wheel', (e) => { e.preventDefault(); const r = stage.getBoundingClientRect(); zoomAt(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0025)), e.clientX - r.left, e.clientY - r.top); }, { passive: false });
  const pts = new Map(); let last = null, lastD = 0;
  stage.addEventListener('pointerdown', (e) => { stage.setPointerCapture?.(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); last = [e.clientX, e.clientY]; lastD = 0; });
  stage.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pts.size === 2) {
      const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]), r = stage.getBoundingClientRect();
      if (lastD) zoomAt(d / lastD, (a[0] + b[0]) / 2 - r.left, (a[1] + b[1]) / 2 - r.top);
      lastD = d; return;
    }
    if (last) { tx += e.clientX - last[0]; ty += e.clientY - last[1]; apply(); }
    last = [e.clientX, e.clientY];
  });
  const up = (e) => { pts.delete(e.pointerId); lastD = 0; last = pts.size === 1 ? [...pts.values()][0] : null; };
  stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
  stage.addEventListener('dblclick', (e) => { const r = stage.getBoundingClientRect(); if (s > fit * 1.05) reset(); else zoomAt(2.5, e.clientX - r.left, e.clientY - r.top); });
  const close = () => { ov.remove(); removeEventListener('keydown', key); };
  const key = (e) => { if (e.key === 'Escape') close(); if (e.key === '+' || e.key === '=') zoomAt(1.4, stage.clientWidth / 2, stage.clientHeight / 2); if (e.key === '-') zoomAt(1 / 1.4, stage.clientWidth / 2, stage.clientHeight / 2); };
  addEventListener('keydown', key);
  ov.addEventListener('click', async (e) => {
    const z = e.target.closest('[data-z]'); if (!z) return;
    const k = z.dataset.z, W = stage.clientWidth / 2, H = stage.clientHeight / 2;
    if (k === 'close') close(); else if (k === 'in') zoomAt(1.5, W, H); else if (k === 'out') zoomAt(1 / 1.5, W, H); else if (k === 'fit') reset();
    else if ((k === 'next' && cur < pages) || (k === 'prev' && cur > 1)) { cur += k === 'next' ? 1 : -1; pg(); if (onPage) load(await onPage(cur)); }
  });
  return close;
}
