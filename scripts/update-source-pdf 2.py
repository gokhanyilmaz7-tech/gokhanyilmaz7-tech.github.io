from pathlib import Path
import shutil
import subprocess
import sys
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parent.parent
SOURCE_DIR = ROOT / 'source'
SOURCE_PDF = SOURCE_DIR / 'dayanaklar.pdf'
PUBLIC_PDF = ROOT / 'public' / 'dayanaklar.pdf'
GENERATED_DIRS = {
    ROOT / 'public' / 'sections': {'.json'},
    ROOT / 'public' / 'layout': {'.json'},
    ROOT / 'public' / 'figures': {'.png'},
}


def main():
    if len(sys.argv) != 2:
        raise SystemExit('Kullanım: npm run update-source -- "/tam/yol/yeni-kaynak.pdf"')

    input_pdf = Path(sys.argv[1]).expanduser().resolve()
    if not input_pdf.is_file() or input_pdf.suffix.lower() != '.pdf':
        raise SystemExit(f'PDF bulunamadı: {input_pdf}')

    reader = PdfReader(str(input_pdf), strict=False)
    if not reader.pages:
        raise SystemExit('PDF boş görünüyor.')

    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    PUBLIC_PDF.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(input_pdf, SOURCE_PDF)
    shutil.copy2(input_pdf, PUBLIC_PDF)

    for directory, suffixes in GENERATED_DIRS.items():
        directory.mkdir(parents=True, exist_ok=True)
        for path in directory.iterdir():
            if path.is_file() and path.suffix.lower() in suffixes:
                path.unlink()

    scripts = [ROOT / 'scripts' / 'extract-manifest.py', ROOT / 'scripts' / 'extract-layout.py']
    for script in scripts:
        subprocess.run([sys.executable, str(script), str(SOURCE_PDF)], cwd=ROOT, check=True)

    print(f'Kaynak PDF güncellendi: {SOURCE_PDF}')
    print(f'Sayfa sayısı: {len(reader.pages)}')


if __name__ == '__main__':
    main()
