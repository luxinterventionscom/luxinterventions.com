# Pages des chapitres dans le PDF de chaque langue : python3 pages.py chap.json → {lang: {count, starts: [index 0-based]}}
import json, sys
import fitz

d = json.load(open(sys.argv[1]))
out = {}
for l, v in d.items():
    doc = fitz.open(v['pdf'])
    starts, cur = [], 0
    for t in v['titles']:
        key = t[:40]
        for i in range(cur, doc.page_count):
            if doc[i].search_for(key):
                starts.append(i); cur = i; break
        else:
            starts.append(cur)
    out[l] = {'count': doc.page_count, 'starts': starts}
print(json.dumps(out))
