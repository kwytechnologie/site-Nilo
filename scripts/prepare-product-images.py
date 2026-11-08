"""Resize the approved Blender renders for the product section. Requires Pillow."""
import sys
from pathlib import Path
from PIL import Image

source = Path(sys.argv[1])
target = Path(__file__).resolve().parents[1] / 'src/assets/produto'
renders = {
    'nilo-perspectiva': '01-nilo-perspectiva.png',
    'nilo-pes': '02-nilo-quatro-pes.png',
    'nilo-frente': '03-nilo-frente.png',
    'nilo-led': '04-nilo-led-close.png',
}
assert all((source / name).is_file() for name in renders.values()), 'Missing approved render'
target.mkdir(parents=True, exist_ok=True)
for name, original in renders.items():
    with Image.open(source / original) as image:
        for width in (640, 1280):
            resized = image.convert('RGB').resize((width, round(image.height * width / image.width)), Image.Resampling.LANCZOS)
            path = target / f'{name}-{width}.webp'
            resized.save(path, 'WEBP', quality=88, method=6)
            with Image.open(path) as check:
                assert check.width == width and check.format == 'WEBP'
            print(f'{path.name}: {path.stat().st_size} bytes')
