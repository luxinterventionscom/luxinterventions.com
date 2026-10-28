# Assemble le manuel (PyMuPDF) : python3 assemble.py base.pdf front.pdf plan.json sortie.pdf
# Base v2.150 sans noms : bandeau « Qui l'utilise » remplacé par « INTERVENTIONS », petits logos retirés (texte et image
# vraiment supprimés, pas seulement cachés), pied de page refait ; puis chapitres « Nouveautés » et numérotation.
import json, sys
import fitz

base_path, front_path, plan_path, out_path = sys.argv[1:5]
plan = json.load(open(plan_path))
base = fitz.open(base_path)
FONT = '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf'
FONTB = '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'
NAVY = (0x10 / 255, 0x1a / 255, 0x2b / 255)

for page in base:
    w, h = page.rect.width, page.rect.height
    banner = False
    # bandeau sombre avec logo et nom (1re page de chaque langue)
    for b in page.get_text('blocks'):
        if b[1] < 130 and 'A L J A D Y' in b[4]:
            banner = True
    if banner:
        page.add_redact_annot(fitz.Rect(50, 46, 545, 118), fill=NAVY)
    # petit logo devant les titres des chapitres
    for x in page.get_images(full=True):
        if (x[2], x[3]) == (640, 234):
            for r in page.get_image_rects(x[0]):
                if not banner:
                    page.add_redact_annot(r, fill=(1, 1, 1))
    # pied de page
    page.add_redact_annot(fitz.Rect(0, h - 34, w, h), fill=(1, 1, 1))
    page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_REMOVE, graphics=fitz.PDF_REDACT_LINE_ART_NONE)
    if banner:
        page.insert_text((70, 86), 'I N T E R V E N T I O N S', fontsize=22, fontname='LSB', fontfile=FONTB, color=(0.83, 0.63, 0.09))
        page.insert_text((70, 106), 'Gérances · Immobilières · Hôtels · Airbnb · Taxi', fontsize=9.5, fontname='LS', fontfile=FONT, color=(0.95, 0.9, 0.78))

out = fitz.open()
out.insert_pdf(fitz.open(front_path))
marks = []  # (première page, dernière page, langue, titre du manuel)
for L in plan['langs']:
    first = out.page_count
    out.insert_pdf(base, from_page=L['s'] - 1, to_page=L['e'] - 1)
    out.insert_pdf(fitz.open(L['news']))
    marks.append((first, out.page_count - 1, L['lang'], L['manual']))
total = out.page_count
assert total == plan['total'], (total, plan['total'])
for i in range(1, total):
    page = out[i]
    lang, manual = '', 'Manuale dell’applicazione INTERVENTI'
    for a, z, l, m in marks:
        if a <= i <= z:
            lang, manual = l, m
    txt = f'{manual} — {lang} — {i + 1} / {total}' if lang else f'{manual} — {i + 1} / {total}'
    tw = fitz.get_text_length(txt, fontname='helv', fontsize=7.5)
    page.insert_text(((page.rect.width - tw) / 2, page.rect.height - 18), txt, fontsize=7.5, fontname='LS', fontfile=FONT, color=(0.55, 0.58, 0.63))
out.set_metadata({'title': 'INTERVENTIONS — Manuale dell’applicazione', 'author': '', 'creator': '', 'producer': ''})
out.save(out_path, garbage=3, deflate=True)
print('ok', total)
