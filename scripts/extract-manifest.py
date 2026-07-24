from pathlib import Path
import json
import sys
from pypdf import PdfReader

PDF = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('source/dayanaklar.pdf')
OUT = Path('public/manifest.json')
SECTIONS_OUT = Path('public/sections')

reader = PdfReader(str(PDF))
items = []
for entry in reader.outline:
    if not isinstance(entry, dict) or '/Title' not in entry:
        continue
    title = str(entry['/Title']).strip()
    start = reader.get_destination_page_number(entry) + 1
    items.append({'id': f'mevzuat-{len(items) + 1}', 'title': title, 'startPage': start})

for index, item in enumerate(items):
    end = items[index + 1]['startPage'] - 1 if index + 1 < len(items) else len(reader.pages)
    item['endPage'] = end
    item['pageCount'] = end - item['startPage'] + 1
    item['data'] = f"sections/{item['id']}.json"

SECTIONS_OUT.mkdir(parents=True, exist_ok=True)
for item in items:
    pages = []
    for page_number in range(item['startPage'], item['endPage'] + 1):
        text = reader.pages[page_number - 1].extract_text() or ''
        pages.append({'page': page_number, 'text': text})
    (SECTIONS_OUT / f"{item['id']}.json").write_text(
        json.dumps({'id': item['id'], 'title': item['title'], 'pages': pages}, ensure_ascii=False),
        encoding='utf-8'
    )

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps({'pdf': 'dayanaklar.pdf', 'pageCount': len(reader.pages), 'sections': items}, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'{len(items)} mevzuat kaydı yazıldı: {OUT}')
