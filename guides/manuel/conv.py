# Extrait le manuel v2.150 (base-v2.150.pdf) en HTML modifiable, une langue par fichier : src/<lang>.html + src/img/
# python3 conv.py base-v2.150.pdf src
# Reconnaît : bandeaux de chapitre, titres, paragraphes, listes, tableaux (filets gris), encadrés (Attention, Conseil…),
# mots en gras, boutons surlignés, captures. Les pages schéma (sitemap, flowmap) et « Qui l'utilise » sont refaites à la main.
import html, os, re, sys
import fitz

SRC, OUT = sys.argv[1], sys.argv[2]
LANGS = [('it', 3, 36), ('fr', 37, 72), ('de', 73, 109), ('en', 110, 143), ('pt', 144, 178), ('es', 179, 214)]
SKIP_REL = {0, 1, 2, 3}  # « Qui l'utilise », sitemap (2 pages), flowmap : refaits à la main
os.makedirs(OUT + '/img', exist_ok=True)
doc = fitz.open(SRC)

def hexc(t):
    return '#%02x%02x%02x' % tuple(int(round(v * 255)) for v in t)

def near(a, b, tol=0.02):
    return all(abs(x - y) <= tol for x, y in zip(a, b))

GRID = (0.85, 0.84, 0.81)
CHIP = (1.0, 0.96, 0.84)

def page_items(pno, lang):
    p = doc[pno]
    drs = [d for d in p.get_drawings() if d.get('fill')]
    thin = [fitz.Rect(d['rect']) for d in drs if near(d['fill'], GRID) and min(d['rect'].width, d['rect'].height) < 2]
    chips = [fitz.Rect(d['rect']) for d in drs if near(d['fill'], CHIP) and d['rect'].height < 18]
    # tableaux : filets gris regroupés
    tables = []
    for r in thin:
        for t in tables:
            if t['bb'].intersects(r + (-3, -3, 3, 3)):
                t['bb'] |= r; t['lines'].append(r); break
        else:
            tables.append({'bb': fitz.Rect(r), 'lines': [r]})
    merged = True
    while merged:
        merged = False
        for i in range(len(tables)):
            for j in range(i + 1, len(tables)):
                if tables[i]['bb'].intersects(tables[j]['bb'] + (-3, -3, 3, 3)):
                    tables[i]['bb'] |= tables[j]['bb']; tables[i]['lines'] += tables[j]['lines']; del tables[j]; merged = True; break
            if merged: break
    tables = [t for t in tables if t['bb'].width > 150 and t['bb'].height > 20]
    # encadrés : grand fond clair + liseré foncé de même rectangle (Attention, Conseil, Important…)
    boxes, bars = [], []
    for d in drs:
        r = fitz.Rect(d['rect']); f = d['fill']
        if r.width > 400 and r.height > 25 and r.y0 < 60 and min(f) < 0.95 and r.x0 < 50:
            bars.append((r, hexc(f)))
        if r.width > 300 and r.height > 25 and min(f) > 0.88 and not any(t['bb'].contains(r) for t in tables):
            dark = [hexc(e['fill']) for e in drs if abs(e['rect'].y0 - r.y0) < 2 and abs(e['rect'].y1 - r.y1) < 2 and min(e['fill']) < 0.75 and e['rect'].x0 < r.x0]
            boxes.append((r, hexc(f), dark[0] if dark else '#94a3b8'))
    bars = [b for b in bars if not any(abs(b[0].y0 - x[0].y0) < 2 and b[0] != x[0] and x[0].contains(b[0]) for x in bars)]
    items = []  # (y, x, kind, data)
    dd = p.get_text('dict', flags=fitz.TEXT_PRESERVE_IMAGES)
    k = 0
    for b in dd['blocks']:
        bb = fitz.Rect(b['bbox'])
        if b['type'] == 1:
            if bb.width < 40 or bb.height < 30: continue
            if bb.y0 > 800: continue
            name = f'{lang}-{pno + 1:03d}-{k}.{b["ext"]}'; k += 1
            open(f'{OUT}/img/{name}', 'wb').write(b['image'])
            items.append((bb.y0, bb.x0, 'img', {'src': 'img/' + name, 'w': bb.width, 'bb': bb}))
            continue
        for l in b['lines']:
            lb = fitz.Rect(l['bbox'])
            if lb.y0 > 805: continue  # pied de page
            spans = []
            for s in l['spans']:
                t = s['text']
                if not t: continue
                sb = fitz.Rect(s['bbox'])
                bold = 'Bold' in s['font']
                ital = 'Italic' in s['font']
                chip = any(c.intersects(sb) and (c & sb).width > sb.width * 0.5 for c in chips)
                spans.append({'t': t, 'b': bold, 'i': ital, 'chip': chip, 'size': s['size'], 'color': '%06x' % s['color']})
            if not spans or not ''.join(s['t'] for s in spans).strip(): continue
            items.append((lb.y0, lb.x0, 'line', {'spans': spans, 'bb': lb}))
    return items, tables, boxes, bars

def spans_html(spans):
    out = []
    for s in spans:
        t = html.escape(s['t'])
        if s['chip']: t = f'<span class="k">{t}</span>'
        elif s['b']: t = f'<b>{t}</b>'
        if s['i']: t = f'<i>{t}</i>'
        out.append(t)
    h = ''.join(out)
    h = re.sub(r'</b><b>', '', h); h = re.sub(r'</span><span class="k">', '', h)
    return h

def main_style(spans):
    s = max(spans, key=lambda x: len(x['t'].strip()))
    return round(s['size'], 1), s['b'], s['color']

def classify(spans):
    size, bold, color = main_style(spans)
    if size >= 21: return 'h1'
    if size >= 14.5 and color in ('4e45e4',): return 'h2'
    if size >= 11.9 and bold: return 'h3'
    if size >= 16 and color == 'ffffff': return 'bar'
    return 'p'

def table_html(t, lines):
    xs = sorted({round(r.x0) for r in t['lines'] if r.width < 2})
    ys = sorted({round(r.y0) for r in t['lines'] if r.height < 2})
    def dedup(v):
        o = []
        for a in v:
            if not o or a - o[-1] > 4: o.append(a)
        return o
    xs, ys = dedup(xs), dedup(ys)
    if len(xs) < 2 or len(ys) < 2: return None
    rows = []
    for yi in range(len(ys) - 1):
        row = []
        for xi in range(len(xs) - 1):
            cell = fitz.Rect(xs[xi], ys[yi], xs[xi + 1], ys[yi + 1])
            ls = [l for l in lines if cell.contains(fitz.Point(l['bb'].x0 + 1, (l['bb'].y0 + l['bb'].y1) / 2))]
            ls.sort(key=lambda l: (round(l['bb'].y0), l['bb'].x0))
            row.append(' '.join(spans_html(l['spans']) for l in ls))
        rows.append(row)
    if not rows: return None
    head = rows[0] if all(re.fullmatch(r'<b>[^<]*</b>', c.strip() or '<b></b>') for c in rows[0]) else None
    h = '<table>'
    if head: h += '<tr>' + ''.join(f'<th>{re.sub("</?b>", "", c)}</th>' for c in head) + '</tr>'; rows = rows[1:]
    for r in rows: h += '<tr>' + ''.join(f'<td>{c}</td>' for c in r) + '</tr>'
    return h + '</table>'

LIST_RE = re.compile(r'^\s*(\d+)\.\s+')
BUL_RE = re.compile(r'^\s*[•·]\s+')

def flow(lines):
    """lignes → blocs html (titres, paragraphes, listes)"""
    out, para, lst, last = [], None, None, None
    def close_para():
        nonlocal para
        if para: out.append(f'<p>{para["h"]}</p>'); para = None
    def close_list():
        nonlocal lst
        if lst: out.append(f'<{lst["tag"]}>' + ''.join(f'<li>{x}</li>' for x in lst['items']) + f'</{lst["tag"]}>'); lst = None
    for l in lines:
        kind = classify(l['spans'])
        txt = ''.join(s['t'] for s in l['spans'])
        h = spans_html(l['spans'])
        gap = l['bb'].y0 - last['bb'].y1 if last else 99
        if kind in ('h1', 'h2', 'h3'):
            close_para(); close_list()
            if out and out[-1].startswith(f'<{kind}>') and gap < 6: out[-1] = out[-1][:-len(f'</{kind}>')] + ' ' + h + f'</{kind}>'
            else: out.append(f'<{kind}>{h}</{kind}>')
        else:
            m = LIST_RE.match(txt); u = BUL_RE.match(txt)
            if m or u:
                close_para()
                tag = 'ol' if m else 'ul'
                h2 = re.sub(r'^(\s*(<[^>]+>)*)\s*(\d+\.|[•·])\s+', r'\1', h, count=1)
                if lst and lst['tag'] == tag: lst['items'].append(h2)
                else: close_list(); lst = {'tag': tag, 'items': [h2], 'x': l['bb'].x0}
            elif lst and gap < 6 and l['bb'].x0 > lst['x'] + 4:
                lst['items'][-1] += ' ' + h
            elif para and gap < 6 and abs(l['bb'].x0 - para['x']) < 3 and classify(l['spans']) == 'p':
                para['h'] += ' ' + h
            else:
                close_para(); close_list(); para = {'h': h, 'x': l['bb'].x0}
        last = l
    close_para(); close_list()
    return '\n'.join(out)

for lang, a, z in LANGS:
    parts = []
    for pno in range(a - 1, z):
        rel = pno - (a - 1)
        if rel in SKIP_REL: continue
        items, tables, boxes, bars = page_items(pno, lang)
        items.sort(key=lambda x: (round(x[0] / 3), x[1]))
        used = set()
        blocks = []  # (y, html)
        for r, col in list(bars):
            ls = [it for it in items if it[2] == 'line' and r.contains(it[3]['bb'].tl + (1, 1))]
            if not ls or not all(s['color'] == 'ffffff' for it in ls for s in it[3]['spans'] if s['t'].strip()):
                continue
            for it in ls: used.add(id(it))
            blocks.append((r.y0, f'<div class="bar" style="background:{col}">{" ".join(spans_html(it[3]["spans"]) for it in ls)}</div>'))
        for t in tables:
            ls = [it[3] for it in items if it[2] == 'line' and t['bb'].contains(it[3]['bb'].tl + (1, 1))]
            for it in items:
                if it[2] == 'line' and t['bb'].contains(it[3]['bb'].tl + (1, 1)): used.add(id(it))
            th = table_html(t, ls)
            if th: blocks.append((t['bb'].y0, th))
        for r, bg, fg in boxes:
            ins = [it for it in items if id(it) not in used and it[2] == 'line' and r.contains(it[3]['bb'].tl + (1, 1))]
            for it in ins: used.add(id(it))
            if ins: blocks.append((r.y0, f'<div class="box" style="background:{bg};border-color:{fg}">{flow([it[3] for it in ins])}</div>'))
        # captures côte à côte
        imgs = [it for it in items if it[2] == 'img']
        rows = []
        for it in imgs:
            for row in rows:
                if abs(row[0][0] - it[0]) < 40: row.append(it); break
            else: rows.append([it])
        for row in rows:
            row.sort(key=lambda x: x[1])
            blocks.append((row[0][0], '<div class="shots">' + ''.join(f'<img src="{x[3]["src"]}" style="width:{x[3]["w"] * 0.3528:.0f}mm">' for x in row) + '</div>'))
        rest = [it for it in items if id(it) not in used and it[2] == 'line']
        # le texte libre, coupé par les blocs (tableaux, encadrés, images) selon la hauteur
        cuts = sorted(blocks, key=lambda x: x[0])
        seg, segs = [], []
        bi = 0
        for it in rest:
            while bi < len(cuts) and cuts[bi][0] <= it[0]:
                segs.append(('t', seg)); seg = []; segs.append(('b', cuts[bi][1])); bi += 1
            seg.append(it[3])
        segs.append(('t', seg))
        while bi < len(cuts): segs.append(('b', cuts[bi][1])); bi += 1
        page_html = '\n'.join(flow(s) if k == 't' else s for k, s in segs if s)
        parts.append(f'<!-- p{pno + 1} -->\n{page_html}')
    h = '\n'.join(parts)
    # suites d'une page à l'autre : tableau (même en-tête), liste, phrase coupée
    h = re.sub(r'</table>\n<!-- p\d+ -->\n(<table>)(<tr><th>.*?</tr>)', lambda m: m.group(0) if False else '\n<!--cont-->', h)
    h = re.sub(r'</table>\n<!--cont-->', '', h)
    h = re.sub(r'</li></ol>\n<!-- p\d+ -->\n<p>([a-zà-ù][^<]*)</p>\n<ol>', r' \1</li>', h)
    h = re.sub(r'</li></ol>\n<!-- p\d+ -->\n<p>([a-zà-ù][^<]*)</p>', r' \1</li></ol>', h)
    h = re.sub(r'([^.:!?»)])</p>\n<!-- p\d+ -->\n<p>([a-zà-ù])', r'\1 \2', h)
    h = re.sub(r'</ol>\n(<!-- p\d+ -->\n)?<ol>', '', h)
    # liste coupée par une capture : la numérotation continue
    pat = re.compile(r'</ol>(\n(?:<!-- p\d+ -->\n)?<div class="shots">[^\n]*</div>\n(?:<!-- p\d+ -->\n)?)<ol>')
    pos = 0
    while True:
        m = pat.search(h, pos)
        if not m: break
        start = h.rfind('<ol', 0, m.start())
        st = re.match(r'<ol(?: start="(\d+)")?>', h[start:]).group(1)
        n = h[start:m.start()].count('<li>') + (int(st) - 1 if st else 0)
        rep = f'</ol>{m.group(1)}<ol start="{n + 1}">'
        h = h[:m.start()] + rep + h[m.end():]
        pos = m.start() + len(rep) - 1
    open(f'{OUT}/{lang}.html', 'w').write(h)
    print(lang, sum(len(x) for x in parts))
