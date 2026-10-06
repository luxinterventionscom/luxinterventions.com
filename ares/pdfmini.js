// Petit générateur PDF (A4, texte Helvetica, traits, rectangles) — sans dépendance.
// Les accents français / allemands et le signe € passent par l'encodage WinAnsi.
const WIN = { '−': 0x2d, '€': 0x80, '‚': 0x82, '„': 0x84, '…': 0x85, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97, 'Œ': 0x8c, 'œ': 0x9c, 'Š': 0x8a, 'š': 0x9a, 'Ž': 0x8e, 'ž': 0x9e, 'Ÿ': 0x9f };
const enc = (s) => {
  let out = '';
  for (const ch of String(s ?? '')) {
    let c = WIN[ch] ?? ch.codePointAt(0);
    if (ch === ' ' || ch === ' ') c = 0x20;
    if (c > 255) c = 0x3f; // caractère hors WinAnsi : « ? »
    const b = String.fromCharCode(c);
    out += b === '(' || b === ')' || b === '\\' ? '\\' + b : b;
  }
  return out;
};
// largeur approximative (Helvetica) pour aligner à droite
const W_N = 0.556, W_B = 0.6;
export const textWidth = (s, size, bold) => String(s ?? '').length * size * (bold ? W_B : W_N) * 0.92;

export function makePdf() {
  const pages = [];
  let cur = null;
  const api = {
    W: 595.28, H: 841.89,
    page() { cur = []; pages.push(cur); return api; },
    // y mesuré depuis le haut de la page
    text(x, y, s, { size = 10, bold = false, color = [0, 0, 0], align = 'left' } = {}) {
      const w = textWidth(s, size, bold);
      const xx = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
      cur.push(`BT ${color.map((c) => c.toFixed(3)).join(' ')} rg /${bold ? 'F2' : 'F1'} ${size} Tf ${xx.toFixed(2)} ${(api.H - y).toFixed(2)} Td (${enc(s)}) Tj ET`);
      return api;
    },
    line(x1, y1, x2, y2, { w = 0.6, color = [0.75, 0.75, 0.75] } = {}) {
      cur.push(`${color.map((c) => c.toFixed(3)).join(' ')} RG ${w} w ${x1.toFixed(2)} ${(api.H - y1).toFixed(2)} m ${x2.toFixed(2)} ${(api.H - y2).toFixed(2)} l S`);
      return api;
    },
    rect(x, y, w, h, { fill = [0.95, 0.95, 0.95] } = {}) {
      cur.push(`${fill.map((c) => c.toFixed(3)).join(' ')} rg ${x.toFixed(2)} ${(api.H - y - h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
      return api;
    },
    // texte sur plusieurs lignes (coupe aux espaces) ; renvoie la hauteur utilisée
    wrap(x, y, s, maxW, opts = {}) {
      const size = opts.size || 10, lh = size * 1.3;
      const words = String(s ?? '').split(/\s+/);
      let line = '', n = 0;
      for (const w of words) {
        const t = line ? line + ' ' + w : w;
        if (textWidth(t, size, opts.bold) > maxW && line) { api.text(x, y + n * lh, line, opts); n++; line = w; } else line = t;
      }
      if (line) { api.text(x, y + n * lh, line, opts); n++; }
      return n * lh;
    },
    bytes() {
      const objs = [];
      const add = (s) => { objs.push(s); return objs.length; };
      const font1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
      const font2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
      const pagesId = objs.length + 1 + pages.length * 2;
      const kids = [];
      for (const p of pages) {
        const stream = p.join('\n');
        const c = add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
        kids.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${api.W} ${api.H}] /Resources << /Font << /F1 ${font1} 0 R /F2 ${font2} 0 R >> >> /Contents ${c} 0 R >>`));
      }
      add(`<< /Type /Pages /Kids [${kids.map((k) => k + ' 0 R').join(' ')}] /Count ${kids.length} >>`);
      const cat = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
      let out = '%PDF-1.4\n%\xe2\xe3\xcf\xd3\n';
      const offs = [];
      objs.forEach((o, i) => { offs.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
      const xref = out.length;
      out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('')}`;
      out += `trailer\n<< /Size ${objs.length + 1} /Root ${cat} 0 R >>\nstartxref\n${xref}\n%%EOF`;
      const b = new Uint8Array(out.length);
      for (let i = 0; i < out.length; i++) b[i] = out.charCodeAt(i) & 255;
      return b;
    },
  };
  return api.page();
}
