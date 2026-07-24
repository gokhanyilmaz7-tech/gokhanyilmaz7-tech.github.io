from pathlib import Path
import json
import sys
import pdfplumber
from pypdf import PdfReader
from PIL import Image

PDF = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('source/dayanaklar.pdf')
OUT = Path('public/layout')
FIGURES = Path('public/figures')
OUT.mkdir(parents=True, exist_ok=True)
FIGURES.mkdir(parents=True, exist_ok=True)

reader = PdfReader(str(PDF))
with pdfplumber.open(str(PDF)) as pdf:
    for index, page in enumerate(pdf.pages, start=1):
        words = []
        for word in page.extract_words(extra_attrs=['fontname', 'size', 'non_stroking_color']):
            color = word.get('non_stroking_color') or (0, 0, 0)
            if isinstance(color, (int, float)):
                color = (color, color, color)
            color = tuple(round(float(value), 4) for value in color[:3])
            font = word.get('fontname') or ''
            words.append({
                'text': word['text'],
                'x': round(word['x0'], 3),
                'y': round(word['top'], 3),
                'w': round(word['x1'] - word['x0'], 3),
                'h': round(word['bottom'] - word['top'], 3),
                'size': round(float(word.get('size') or word['height']), 3),
                'color': color,
                'bold': 'Bold' in font or 'bold' in font,
                'italic': 'Italic' in font or 'Oblique' in font,
                'family': 'Times New Roman' if 'Times' in font else ('Helvetica Neue' if 'Helvetica' in font else ('Courier New' if 'Courier' in font else 'serif')),
            })
        figures = []
        for image_index, image in enumerate(page.images, start=1):
            source_size = image['srcsize']
            raw = image['stream'].get_data()
            if len(raw) != source_size[0] * source_size[1] * 3:
                continue
            figure_name = f'page-{index:03d}-{image_index}.png'
            figure_path = FIGURES / figure_name
            Image.frombytes('RGB', source_size, raw).save(figure_path, optimize=True)
            figures.append({
                'src': f'figures/{figure_name}',
                'x': round(image['x0'], 3),
                'y': round(image['top'], 3),
                'w': round(image['width'], 3),
                'h': round(image['height'], 3),
            })
        lines = []
        for line in page.lines:
            # PDF tablo çizgilerini de taşıyoruz. Çizgiler metnin arkasında
            # gösterilecek; böylece Ek-1/Ek-2'nin hücre sınırları korunur.
            if not line.get('stroke'):
                continue
            stroke = line.get('stroking_color') or (0.65, 0.65, 0.65)
            if isinstance(stroke, (int, float)):
                stroke = (stroke, stroke, stroke)
            lines.append({
                'x': round(line['x0'], 3),
                'y': round(line['top'], 3),
                'w': round(line['x1'] - line['x0'], 3),
                'h': round(line['bottom'] - line['top'], 3),
                'width': round(float(line.get('linewidth') or 0.35), 3),
                'color': tuple(round(float(value), 4) for value in stroke[:3]),
            })
        OUT.joinpath(f'page-{index:03d}.json').write_text(json.dumps({
            'page': index,
            'width': round(page.width, 3),
            'height': round(page.height, 3),
            'text': reader.pages[index - 1].extract_text() or '',
            'words': words,
            'figures': figures,
            'lines': lines,
        }, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print(f'{len(reader.pages)} sayfanın HTML yerleşim verisi üretildi: {OUT}')
