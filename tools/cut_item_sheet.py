"""Вырезает нарисованные иконки предметов комплекта с листа и кладёт их в assets/items/<id>.webp.

Запуск из корня проекта: python tools/cut_item_sheet.py <лист.png|webp> <id комплекта>
Лист — картинка с прозрачным фоном: предметы рядами слева направо, под каждым может быть подпись.
Порядок предметов: броня — голова, перчатки, обувь, нагрудник, наплечники, пояс, штаны;
оружие — два предмета; аксессуары — два кольца и амулет.
После вырезки запусти python tools/make_set_items.py — генератор возьмёт картинки вместо SVG.
"""
import os
import re
import sys

from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, 'assets', 'items')
ARMOR_SLOTS = ['head', 'gloves', 'boots', 'chest', 'shoulders', 'belt', 'legs']
SIZE, PADDING = 256, 1.08


def segments(flags, gap):
    """Непрерывные участки True, допускающие пропуски не длиннее gap."""
    out, start, last = [], None, None
    for i, flag in enumerate(flags):
        if flag:
            if start is None:
                start = i
            last = i
        elif start is not None and i - last > gap:
            out.append((start, last))
            start = None
    if start is not None:
        out.append((start, last))
    return out


def text_top(image, left, right, top, bottom):
    """Верх подписи, слившейся с низом предмета, или None. Буквы подписей светлые (кремовая заливка),
    поэтому строки текста — это строки с заметным числом почти белых пикселей у самого низа колонки."""
    pixels = image.load()
    def light(y):
        return sum(1 for x in range(left, right + 1) if pixels[x, y][3] > 20 and sum(pixels[x, y][:3]) > 600)
    limit = bottom - int((bottom - top) * .35)
    first = last = None
    gap = 0
    for y in range(bottom, limit, -1):
        if light(y) >= 5:
            if first is None:
                if bottom - y > 12:
                    return None  # светлое не у самого низа — это часть предмета, а не подпись
                first = y
            last, gap = y, 0
        elif first is not None:
            gap += 1
            if gap > 8:
                break
    return None if last is None else last - 4


def find_items(image, column_gap=25):
    """Рамки предметов: ряды → колонки → верхний блок колонки (подпись под предметом отбрасывается).
    column_gap — самый широкий прозрачный промежуток, который ещё считается частью одного предмета."""
    mask = image.getchannel('A').point(lambda v: 255 if v > 20 else 0)
    width, height = mask.size
    px = mask.load()
    boxes = []
    # Ряды разделены сплошной пустой полосой; на тесных листах она бывает всего в несколько пикселей.
    bands = segments([any(px[x, y] for x in range(0, width, 2)) for y in range(height)], 2)
    tallest = max(bottom - top for top, bottom in bands)
    for top, bottom in bands:
        if bottom - top < max(120, tallest * .45):
            continue  # отдельная строка подписей: заметно ниже рядов с картинками
        columns = []
        for left, right in segments([any(px[x, y] for y in range(top, bottom + 1, 2)) for x in range(width)], column_gap):
            parts = segments([any(px[x, y] for x in range(left, right + 1, 2)) for y in range(top, bottom + 1)], 3)
            columns.append((left, right, parts))
        # Подписи одного ряда стоят на одной высоте. Где подпись отделена от предмета пустой полосой, видно, где она
        # начинается; по этой высоте обрезаем колонки, где буквы касаются картинки (отделённые подписи уже отброшены).
        label_tops = [top + parts[1][0] for _, _, parts in columns if len(parts) > 1]
        label_top = min(label_tops) if label_tops else None
        # Если ни одна подпись ряда не отделена, ищем слившиеся подписи по светлым буквам. Настоящие подписи
        # найдутся во всех колонках на одной высоте; светлый металл у низа отдельных предметов — нет.
        text_cuts = None
        if label_top is None:
            cuts = [text_top(image, left, right, top + parts[0][0], top + parts[0][1]) for left, right, parts in columns]
            if all(cut is not None for cut in cuts) and max(cuts) - min(cuts) <= 12:
                text_cuts = cuts
        for index, (left, right, parts) in enumerate(columns):
            item_bottom = top + parts[0][1]
            if label_top is not None and len(parts) == 1:
                item_bottom = min(item_bottom, label_top - 2)
            elif text_cuts is not None:
                item_bottom = text_cuts[index]
            boxes.append((left, top + parts[0][0], right, item_bottom))
    return boxes


def find_shapes(image, expected):
    """Запасной способ, когда предметы перекрываются по горизонтали: ищем связные фигуры.
    Мелкие фигуры (буквы подписей, искры) отбрасываются; фигуры раскладываются по рядам слева направо.
    Возвращает рамки и маски фигур, чтобы при вырезке не захватить кусок соседа."""
    mask = image.getchannel('A').point(lambda v: 255 if v > 20 else 0)
    width, height = mask.size
    solid = bytearray(1 if v else 0 for v in mask.tobytes())
    seen = bytearray(width * height)
    shapes = []
    for start in range(width * height):
        if not solid[start] or seen[start]:
            continue
        seen[start] = 1
        stack, pixels = [start], []
        while stack:
            i = stack.pop()
            pixels.append(i)
            x, y = i % width, i // width
            for j in (i - 1 if x else -1, i + 1 if x < width - 1 else -1, i - width, i + width):
                if 0 <= j < width * height and solid[j] and not seen[j]:
                    seen[j] = 1
                    stack.append(j)
        shapes.append(pixels)
    largest = max(len(pixels) for pixels in shapes)
    shapes = [pixels for pixels in shapes if len(pixels) >= largest * .06]
    if len(shapes) != expected:
        return []
    found = []
    for pixels in shapes:
        xs, ys = [i % width for i in pixels], [i // width for i in pixels]
        box = (min(xs), min(ys), max(xs), max(ys))
        shape_mask = Image.new('L', (box[2] - box[0] + 1, box[3] - box[1] + 1), 0)
        canvas = shape_mask.load()
        for x, y in zip(xs, ys):
            canvas[x - box[0], y - box[1]] = 255
        # Маска чуть шире фигуры, чтобы не срезать полупрозрачный край контура.
        found.append((box, shape_mask.filter(ImageFilter.MaxFilter(3))))
    # Ряд — по пересечению по высоте с первой фигурой ряда, внутри ряда — слева направо.
    found.sort(key=lambda item: item[0][1])
    rows = []
    for item in found:
        row = next((row for row in rows if item[0][1] < row[0][0][3] and item[0][3] > row[0][0][1]), None)
        if row is None:
            rows.append([item])
        else:
            row.append(item)
    return [item for row in rows for item in sorted(row, key=lambda item: item[0][0])]


def drop_bottom_crumbs(part):
    """Убирает у нижнего края вырезки мелкие оторванные кусочки — верхушки букв срезанной подписи."""
    width, height = part.size
    alpha = part.getchannel('A')
    solid = bytearray(1 if v > 20 else 0 for v in alpha.tobytes())
    seen = bytearray(width * height)
    pieces = []
    for start in range(width * height):
        if not solid[start] or seen[start]:
            continue
        seen[start] = 1
        stack, pixels = [start], []
        while stack:
            i = stack.pop()
            pixels.append(i)
            x = i % width
            for j in (i - 1 if x else -1, i + 1 if x < width - 1 else -1, i - width, i + width):
                if 0 <= j < width * height and solid[j] and not seen[j]:
                    seen[j] = 1
                    stack.append(j)
        pieces.append(pixels)
    if len(pieces) < 2:
        return part
    largest = max(len(pixels) for pixels in pieces)
    data = bytearray(alpha.tobytes())
    for pixels in pieces:
        rows = [i // width for i in pixels]
        if len(pixels) < largest * .02 and max(rows) >= height - 2 and min(rows) >= height - 14:
            for i in pixels:
                data[i] = 0
    part.putalpha(Image.frombytes('L', part.size, bytes(data)))
    return part


def set_slots(set_id):
    """Id предметов комплекта в порядке листа — берутся из item-sets.js."""
    with open(os.path.join(ROOT, 'item-sets.js'), encoding='utf-8') as f:
        text = f.read()
    match = re.search(r'\{"id":"' + re.escape(set_id) + r'","name":"[^"]*","rarity":"[^"]*","kind":"[^"]*","items":\[([^\]]*)\]', text)
    if not match:
        sys.exit(f'Комплект {set_id} не найден в item-sets.js')
    return re.findall(r'"([^"]+)"', match.group(1))


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    sheet, set_id = sys.argv[1], sys.argv[2]
    ids = set_slots(set_id)
    image = Image.open(sheet).convert('RGBA')
    # Предмет может состоять из разнесённых частей (пара эполет), а соседние предметы — стоять почти вплотную:
    # перебираем допустимый промежуток от широкого к узкому, пока число предметов не совпадёт с комплектом.
    for gap in (60, 45, 35, 25, 18, 12, 8, 5, 3):
        boxes = find_items(image, gap)
        if len(boxes) == len(ids):
            items = [(box, None) for box in boxes]
            break
    else:
        # Колонками не разделить (предметы заходят друг за друга) — пробуем связные фигуры.
        items = find_shapes(image, len(ids))
        if not items:
            sys.exit(f'На листе найдено предметов: {len(boxes)}, а в комплекте {set_id}: {len(ids)}')
    for item_id, ((left, top, right, bottom), shape_mask) in zip(ids, items):
        part = image.crop((left, top, right + 1, bottom + 1))
        if shape_mask is not None:
            part.putalpha(Image.composite(part.getchannel('A'), Image.new('L', part.size, 0), shape_mask))
        part = drop_bottom_crumbs(part)
        part = part.crop(part.getchannel('A').point(lambda v: 255 if v > 10 else 0).getbbox())
        side = int(max(part.size) * PADDING)
        canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
        canvas.paste(part, ((side - part.width) // 2, (side - part.height) // 2))
        canvas.resize((SIZE, SIZE), Image.LANCZOS).save(os.path.join(OUT_DIR, item_id + '.webp'), 'WEBP', quality=88, method=6)
        print(f'{item_id}: {part.size[0]}×{part.size[1]}')


if __name__ == '__main__':
    main()
