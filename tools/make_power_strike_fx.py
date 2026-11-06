"""Готовит текстуры для «Мощного удара» из наборов Kenney (assets/effects, CC0).

Берёт белые PNG с прозрачностью, перекрашивает в цвета навыка, уменьшает
и складывает в assets/effects/power-strike/<имя>-<цвет>.png.
Запуск из корня проекта: python tools/make_power_strike_fx.py
"""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets' / 'effects' / 'power-strike'
COLORS = {'ice': (159, 220, 255), 'white': (236, 248, 255), 'violet': (185, 150, 255)}
# Имя текстуры → цвета и наибольшая сторона в пикселях.
WANT = {
    'magic_02': (['ice'], 256), 'twirl_01': (['ice', 'white'], 256), 'spark_05': (['white'], 192),
    'star_08': (['white'], 192), 'star_06': (['white', 'ice'], 96), 'slash_04': (['ice', 'white'], 256),
    'trace_03': (['white'], 160), 'trace_06': (['ice'], 160), 'flash03': (['white'], 256),
    'explosion02': (['ice'], 256), 'whitePuff05': (['ice'], 192), 'circle_rings_b': (['ice'], 256),
    'ring_a_streaks': (['white', 'violet'], 256), 'spark_01': (['white'], 256), 'scratch_01': (['white'], 192),
    'light_01': (['ice'], 256),
}


def tinted(src: Path, rgb, size):
    im = Image.open(src).convert('RGBA')
    im.thumbnail((size, size), Image.LANCZOS)
    # Яркость исходника умножается на прозрачность: тёмные места тоже становятся прозрачнее.
    lum = im.convert('L')
    mask = Image.composite(lum, Image.new('L', im.size, 0), im.getchannel('A'))
    out = Image.new('RGBA', im.size, rgb + (0,))
    out.putalpha(mask)
    return out


def main():
    cat = json.loads((ROOT / 'assets' / 'effects' / 'catalog.json').read_text(encoding='utf-8'))
    by_name = {}
    for it in cat['items']:
        by_name.setdefault(it['name'], it)
    OUT.mkdir(parents=True, exist_ok=True)
    made = 0
    for name, (colors, size) in WANT.items():
        src = ROOT / by_name[name]['url']
        for color in colors:
            tinted(src, COLORS[color], size).save(OUT / f'{name}-{color}.png', optimize=True)
            made += 1
    print(f'Готово: {made} текстур в {OUT.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
