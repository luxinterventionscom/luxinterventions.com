# Assemble le manuel (PyMuPDF) : python3 assemble.py plan.json sortie.pdf
# couverture + sommaire, puis chaque langue ; pied de page « ALJADY R. INTERVENTIONS — <titre> — <langue> — n / N »
import json, sys
import fitz

plan = json.load(open(sys.argv[1]))
FONT = '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf'
out = fitz.open()
out.insert_pdf(fitz.open(plan['front']))
marks = []
for L in plan['langs']:
    a = out.page_count
    out.insert_pdf(fitz.open(L['pdf']))
    marks.append((a, out.page_count - 1, L['lang'], L['manual']))
total = out.page_count
assert total == plan['total'], (total, plan['total'])
font = fitz.Font(fontfile=FONT)
for i in range(1, total):
    lang, manual = '', marks[0][3] if marks else ''
    for a, z, l, m in marks:
        if a <= i <= z:
            lang, manual = l, m
    txt = f'ALJADY R. INTERVENTIONS — {manual}' + (f' — {lang}' if lang else '') + f' — {i + 1} / {total}'
    page = out[i]
    w = font.text_length(txt, fontsize=7.5)
    page.insert_text(((page.rect.width - w) / 2, page.rect.height - 20), txt, fontsize=7.5, fontname='LS', fontfile=FONT, color=(0.6, 0.58, 0.54))
out.set_metadata({'title': 'ALJADY R. INTERVENTIONS — Manuale dell’applicazione INTERVENTI', 'author': 'ALJADY R.', 'creator': '', 'producer': ''})
out.save(sys.argv[2], garbage=3, deflate=True)
print('ok', total)
