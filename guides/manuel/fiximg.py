# Immagini v2.150 nei capitoli 3–6: la n-esima immagine di src/it.html → la n-esima di src/<lingua>.html
import re, sys
for l in sys.argv[1:]:
    it = re.findall(r'src="(img/[^"]+)"', open('src/it.html').read())
    tg = re.findall(r'src="(img/[^"]+)"', open(f'src/{l}.html').read())
    assert len(it) == len(tg)
    p = f'lang/{l}-base.html'; s = open(p).read(); k = iter(tg)
    s = re.sub(r'src="img/it-[^"]+"', lambda m: f'src="{next(k)}"', s)
    open(p, 'w').write(s); print(l, 'ok')
