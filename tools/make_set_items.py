"""Генератор предметов-комплектов: рисует SVG-иконки в assets/items/ и пишет item-sets.js.

Запуск из корня проекта: python tools/make_set_items.py
Комплекты, названия и бонусы задаются в SETS ниже; характеристики предметов считаются по редкости и слоту.
"""
import json
import os
import random

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, 'assets', 'items')

RARITY_COLOR = {'Common': '#bfc5c8', 'Uncommon': '#76d76b', 'Rare': '#5eaeff', 'Epic': '#bc79ff', 'Legendary': '#ff9b3e', 'Divine': '#ffe375'}
RARITY_SCALE = {'Common': 1, 'Uncommon': 1.6, 'Rare': 2.5, 'Epic': 4, 'Legendary': 6.5, 'Divine': 10}
RARITY_STATS = {'Common': 1, 'Uncommon': 2, 'Rare': 2, 'Epic': 3, 'Legendary': 3, 'Divine': 4}
SELL_PRICE = {'Common': 1, 'Uncommon': 2, 'Rare': 5, 'Epic': 12, 'Legendary': 30, 'Divine': 75}
WEAPON_DAMAGE = {'Common': 1.8, 'Uncommon': 3, 'Rare': 4.5, 'Epic': 7, 'Legendary': 11, 'Divine': 16}
# Базовая прибавка одной характеристики у обычного предмета (как у прежних обычных вещей).
STAT_UNIT = {'maxMana': 3, 'critChance': 1, 'damageBonus': .2, 'attackSpeed': 2, 'goldBonus': 2, 'critDamage': 3}
SLOT_STATS = {
    'head': ['maxMana', 'critChance'], 'gloves': ['attackSpeed', 'damageBonus'], 'boots': ['attackSpeed', 'goldBonus'],
    'chest': ['damageBonus', 'maxMana'], 'shoulders': ['critDamage', 'damageBonus'], 'belt': ['goldBonus', 'maxMana'],
    'legs': ['attackSpeed', 'critDamage'], 'ring': ['damageBonus', 'critChance'], 'accessory': ['maxMana', 'goldBonus'],
    'weapon': ['critChance', 'critDamage'],
}
ARMOR_SLOTS = ['head', 'gloves', 'boots', 'chest', 'shoulders', 'belt', 'legs']

# Каждый комплект: id, название, редкость, тип, материал/палитра, тематическая характеристика, предметы и бонус.
# Бонусы легендарных и божественного комплектов пустые — их задаст автор игры.
SETS = [
    dict(id='forest-wanderer', name='Лесной бродяга', rarity='Common', kind='armor', look='cloth', theme='maxMana',
         pal=dict(base='#6b7f4a', light='#b4c788', dark='#2a3420', trim='#8a6a3a', accent='#d8c38a', gem='#9fd27a'),
         items=['Капюшон лесного бродяги', 'Обмотки лесного бродяги', 'Башмаки лесного бродяги', 'Туника лесного бродяги',
                'Накидка лесного бродяги', 'Кушак лесного бродяги', 'Штаны лесного бродяги'],
         bonus={'maxMana': 5, 'goldBonus': 2}),
    dict(id='militia', name='Ополченец', rarity='Common', kind='armor', look='metal', theme='damageBonus',
         pal=dict(base='#8a9096', light='#e2e6e9', dark='#363b40', trim='#6b4a2a', accent='#b88a4a', gem='#c9d0d6'),
         items=['Шлем ополченца', 'Рукавицы ополченца', 'Сапоги ополченца', 'Кольчуга ополченца',
                'Наплечники ополченца', 'Ремень ополченца', 'Поножи ополченца'],
         bonus={'damageBonus': .3, 'critDamage': 3}),
    dict(id='recruit-blades', name='Клинки новобранца', rarity='Common', kind='weapon', element='none',
         pal=dict(base='#9aa1a6', light='#eef1f3', dark='#4a4f54', trim='#6b4a2a', accent='#a87a44', gem='#c9d0d6'),
         items=[('Короткий меч новобранца', 'sword'), ('Кинжал новобранца', 'dagger')],
         bonus={'damageBonus': .5}),
    dict(id='village-charms', name='Деревенские обереги', rarity='Common', kind='accessory', theme='goldBonus',
         pal=dict(base='#c07a45', light='#f4c294', dark='#5a2f15', trim='#7a4a22', accent='#e8b07a', gem='#8fd0a0'),
         items=['Медное кольцо-оберег', 'Берёзовое кольцо-оберег', 'Деревенский кулон-оберег'],
         bonus={'goldBonus': 3}),

    dict(id='thicket-tracker', name='Следопыт чащи', rarity='Uncommon', kind='armor', look='leather', theme='attackSpeed',
         pal=dict(base='#4f7a3a', light='#9ccc7a', dark='#1e3315', trim='#6b4a2a', accent='#c9b27a', gem='#76d76b'),
         items=['Капюшон следопыта чащи', 'Перчатки следопыта чащи', 'Сапоги следопыта чащи', 'Куртка следопыта чащи',
                'Наплечники следопыта чащи', 'Пояс следопыта чащи', 'Штаны следопыта чащи'],
         bonus={'attackSpeed': 2, 'critChance': 1}),
    dict(id='grove-guard', name='Страж рощи', rarity='Uncommon', kind='armor', look='metal', theme='maxMana',
         pal=dict(base='#b0823a', light='#f4d088', dark='#4e3210', trim='#3f5a2a', accent='#76d76b', gem='#76d76b'),
         items=['Шлем стража рощи', 'Латные перчатки стража рощи', 'Сапоги стража рощи', 'Кираса стража рощи',
                'Наплечники стража рощи', 'Пояс стража рощи', 'Поножи стража рощи'],
         bonus={'damageBonus': .6, 'maxMana': 8}),
    dict(id='woodcutter-axes', name='Топоры дровосека', rarity='Uncommon', kind='weapon', element='none',
         pal=dict(base='#a7b0b5', light='#f0f4f5', dark='#4a5257', trim='#7a5228', accent='#76d76b', gem='#76d76b'),
         items=[('Топор дровосека', 'axe'), ('Топорик дровосека', 'hatchet')],
         bonus={'damageBonus': 1}),
    dict(id='dew-and-roots', name='Роса и корни', rarity='Uncommon', kind='accessory', theme='maxMana',
         pal=dict(base='#9fb8a0', light='#e6f4e4', dark='#3a5240', trim='#6b4a2a', accent='#cde8c0', gem='#76d76b'),
         items=['Кольцо утренней росы', 'Кольцо живых корней', 'Амулет росы и корней'],
         bonus={'maxMana': 10, 'goldBonus': 4}),

    dict(id='stormcaller', name='Буревестник', rarity='Rare', kind='armor', look='metal', theme='attackSpeed',
         pal=dict(base='#4f78b8', light='#c4e0ff', dark='#16264a', trim='#d8dde8', accent='#5eaeff', gem='#9fe0ff'),
         items=['Шлем буревестника', 'Перчатки буревестника', 'Сапоги буревестника', 'Кираса буревестника',
                'Наплечники буревестника', 'Пояс буревестника', 'Поножи буревестника'],
         bonus={'attackSpeed': 4, 'critChance': 2}),
    dict(id='tide-blades', name='Клинки прилива', rarity='Rare', kind='weapon', element='ice',
         pal=dict(base='#8fc8f0', light='#f0faff', dark='#2a5a8a', trim='#2a4a7a', accent='#5eaeff', gem='#5eaeff'),
         items=[('Сабля прилива', 'saber'), ('Кинжал прилива', 'dagger')],
         bonus={'damageBonus': 1.5, 'critDamage': 8}),
    dict(id='sapphire-circle', name='Сапфировый круг', rarity='Rare', kind='accessory', theme='attackSpeed',
         pal=dict(base='#c8d2dc', light='#ffffff', dark='#4a5868', trim='#7a8898', accent='#e8eef4', gem='#3a7bff'),
         items=['Сапфировое кольцо силы', 'Сапфировое кольцо ветра', 'Сапфировый амулет'],
         bonus={'maxMana': 15, 'attackSpeed': 3}),

    dict(id='shadow-hunter', name='Теневой ловчий', rarity='Epic', kind='armor', look='cloth', theme='critChance',
         pal=dict(base='#3e2c5a', light='#9a7ac8', dark='#120a20', trim='#bc79ff', accent='#d9a8ff', gem='#d9a8ff'),
         items=['Капюшон теневого ловчего', 'Перчатки теневого ловчего', 'Сапоги теневого ловчего', 'Доспех теневого ловчего',
                'Наплечники теневого ловчего', 'Пояс теневого ловчего', 'Штаны теневого ловчего'],
         bonus={'damageBonus': 2, 'critChance': 3}),
    dict(id='dusk-reapers', name='Жнецы сумрака', rarity='Epic', kind='weapon', element='dark',
         pal=dict(base='#6a4a9a', light='#dcc4ff', dark='#1e1036', trim='#2a1a40', accent='#bc79ff', gem='#bc79ff'),
         items=[('Клинок сумрака', 'blade'), ('Серп сумрака', 'sickle')],
         bonus={'damageBonus': 2, 'critDamage': 15}),
    dict(id='amethyst-seals', name='Аметистовые печати', rarity='Epic', kind='accessory', theme='goldBonus',
         pal=dict(base='#b0a0c8', light='#f4ecff', dark='#3e3058', trim='#6a5a88', accent='#e0d0f4', gem='#a84bf0'),
         items=['Аметистовая печать силы', 'Аметистовая печать тени', 'Аметистовый амулет печатей'],
         bonus={'maxMana': 20, 'goldBonus': 6, 'attackSpeed': 5}),

    dict(id='flame-lord', name='Пламенный владыка', rarity='Legendary', kind='armor', look='metal', theme='damageBonus', horns=True,
         pal=dict(base='#9a2e12', light='#ffb066', dark='#3a0a04', trim='#ffd56a', accent='#ff6a1f', gem='#ffcf6a'),
         items=['Корона пламенного владыки', 'Латные перчатки пламенного владыки', 'Сабатоны пламенного владыки',
                'Кираса пламенного владыки', 'Наплечники пламенного владыки', 'Пояс пламенного владыки', 'Поножи пламенного владыки'],
         bonus={}),
    dict(id='volcano-heart', name='Сердце вулкана', rarity='Legendary', kind='weapon', element='fire',
         pal=dict(base='#ff7a2a', light='#fff0b8', dark='#5a1004', trim='#3a1a0a', accent='#ffcf6a', gem='#ff9b3e'),
         items=[('Меч сердца вулкана', 'sword'), ('Молот сердца вулкана', 'hammer')],
         bonus={}),

    dict(id='dawn-seraph', name='Рассветный серафим', rarity='Divine', kind='armor', look='metal', theme='critDamage', wings=True,
         pal=dict(base='#f0dca0', light='#fffdf2', dark='#a0803a', trim='#ffe375', accent='#ffffff', gem='#9fe8ff'),
         items=['Венец рассветного серафима', 'Перчатки рассветного серафима', 'Сапоги рассветного серафима',
                'Кираса рассветного серафима', 'Наплечники рассветного серафима', 'Пояс рассветного серафима', 'Поножи рассветного серафима'],
         bonus={}),

    # ── Второй выпуск: ещё по 2 комплекта каждого типа для обычных–эпических, по одному каждого типа для легендарных
    #    и божественный комплект оружия.
    dict(id='hill-shepherd', name='Пастух холмов', rarity='Common', kind='armor', look='cloth', theme='maxMana',
         pal=dict(base='#a08a64', light='#e4d6b4', dark='#4a3c26', trim='#6b4a2a', accent='#f0e6cc', gem='#c9d0d6'),
         items=['Шерстяной капюшон пастуха', 'Рукавицы пастуха', 'Опорки пастуха', 'Овчинная куртка пастуха',
                'Накидка пастуха', 'Плетёный пояс пастуха', 'Шерстяные штаны пастуха'],
         bonus={'maxMana': 5, 'critChance': 1}),
    dict(id='road-warden', name='Стражник тракта', rarity='Common', kind='armor', look='leather', theme='goldBonus',
         pal=dict(base='#8a5a34', light='#d8a878', dark='#3a2412', trim='#5a5f64', accent='#c9cfd4', gem='#c9d0d6'),
         items=['Шапка стражника тракта', 'Перчатки стражника тракта', 'Сапоги стражника тракта', 'Колет стражника тракта',
                'Наплечники стражника тракта', 'Ремень стражника тракта', 'Штаны стражника тракта'],
         bonus={'attackSpeed': 2, 'goldBonus': 2}),
    dict(id='hunting-blades', name='Охотничьи клинки', rarity='Common', kind='weapon', element='none',
         pal=dict(base='#a8aeb2', light='#f0f3f4', dark='#4a5054', trim='#5a3414', accent='#8a5a2a', gem='#c9d0d6'),
         items=[('Охотничий нож', 'dagger'), ('Охотничий топорик', 'hatchet')],
         bonus={'critDamage': 3, 'attackSpeed': 2}),
    dict(id='smith-tools', name='Кузнечный инструмент', rarity='Common', kind='weapon', element='none',
         pal=dict(base='#7c8288', light='#d4d9dc', dark='#363b40', trim='#5a3414', accent='#a87a44', gem='#c9d0d6'),
         items=[('Кузнечный молот', 'hammer'), ('Колун кузнеца', 'axe')],
         bonus={'damageBonus': .5}),
    dict(id='river-pebbles', name='Речные камешки', rarity='Common', kind='accessory', theme='maxMana',
         pal=dict(base='#9aa8b0', light='#e4ecf0', dark='#3e4a52', trim='#5a6870', accent='#c8d4da', gem='#8fb8d0'),
         items=['Кольцо с речной галькой', 'Кольцо из речной ракушки', 'Амулет речных камешков'],
         bonus={'maxMana': 5, 'goldBonus': 2}),
    dict(id='honey-talismans', name='Медовые талисманы', rarity='Common', kind='accessory', theme='goldBonus',
         pal=dict(base='#c8922e', light='#ffd98a', dark='#5a3a08', trim='#7a5218', accent='#ffe6a8', gem='#ffb627'),
         items=['Медовое кольцо', 'Кольцо с сотами', 'Янтарный медовый талисман'],
         bonus={'goldBonus': 4}),

    dict(id='bog-wanderer', name='Болотный скиталец', rarity='Uncommon', kind='armor', look='cloth', theme='maxMana',
         pal=dict(base='#5a6a3a', light='#a8b878', dark='#232a14', trim='#4a3a20', accent='#b8c890', gem='#76d76b'),
         items=['Капюшон болотного скитальца', 'Обмотки болотного скитальца', 'Сапоги болотного скитальца',
                'Плащ болотного скитальца', 'Наплечники болотного скитальца', 'Пояс болотного скитальца', 'Штаны болотного скитальца'],
         bonus={'maxMana': 10, 'critChance': 1}),
    dict(id='birch-guard', name='Берестяной страж', rarity='Uncommon', kind='armor', look='metal', theme='critDamage',
         pal=dict(base='#d8d0b8', light='#fffaf0', dark='#5a5240', trim='#2a2a26', accent='#76d76b', gem='#76d76b'),
         items=['Шлем берестяного стража', 'Перчатки берестяного стража', 'Сапоги берестяного стража', 'Кираса берестяного стража',
                'Наплечники берестяного стража', 'Пояс берестяного стража', 'Поножи берестяного стража'],
         bonus={'damageBonus': .6, 'critDamage': 5}),
    dict(id='forester-blades', name='Клинки лесничего', rarity='Uncommon', kind='weapon', element='none',
         pal=dict(base='#a8b8a8', light='#eef6ee', dark='#3a4a3a', trim='#4a6a2a', accent='#76d76b', gem='#76d76b'),
         items=[('Меч лесничего', 'sword'), ('Кинжал лесничего', 'dagger')],
         bonus={'damageBonus': 1}),
    dict(id='druid-sickles', name='Серпы друида', rarity='Uncommon', kind='weapon', element='poison',
         pal=dict(base='#b8c8a0', light='#f4fbe8', dark='#3e4a2a', trim='#5a3a1a', accent='#9fd27a', gem='#76d76b'),
         items=[('Серп друида', 'sickle'), ('Ритуальный нож друида', 'dagger')],
         bonus={'attackSpeed': 3, 'critChance': 1}),
    dict(id='malachite-bonds', name='Малахитовые узы', rarity='Uncommon', kind='accessory', theme='attackSpeed',
         pal=dict(base='#b8c4b0', light='#f4faf0', dark='#3a4a3a', trim='#5a6a54', accent='#d8e8d0', gem='#1f9a5a'),
         items=['Малахитовое кольцо силы', 'Малахитовое кольцо ловкости', 'Малахитовый амулет уз'],
         bonus={'maxMana': 8, 'attackSpeed': 3}),
    dict(id='leaf-fall-charms', name='Листопадные обереги', rarity='Uncommon', kind='accessory', theme='goldBonus',
         pal=dict(base='#c08a4a', light='#f4cc8a', dark='#4e2e10', trim='#7a4a1a', accent='#e8b878', gem='#e86a2a'),
         items=['Кольцо осеннего листа', 'Кольцо опавшей рябины', 'Листопадный амулет'],
         bonus={'goldBonus': 5, 'critDamage': 4}),

    dict(id='frost-sentinel', name='Ледяной дозорный', rarity='Rare', kind='armor', look='metal', theme='critChance',
         pal=dict(base='#9cc8e8', light='#f2fbff', dark='#2a4a6a', trim='#e8f4ff', accent='#5eaeff', gem='#bfe6ff'),
         items=['Шлем ледяного дозорного', 'Перчатки ледяного дозорного', 'Сапоги ледяного дозорного', 'Кираса ледяного дозорного',
                'Наплечники ледяного дозорного', 'Пояс ледяного дозорного', 'Поножи ледяного дозорного'],
         bonus={'damageBonus': 1, 'critChance': 2}),
    dict(id='sea-corsair', name='Морской корсар', rarity='Rare', kind='armor', look='leather', theme='goldBonus',
         pal=dict(base='#2a6a7a', light='#8ad0dc', dark='#0e2a32', trim='#c9a35a', accent='#f0d08a', gem='#5eaeff'),
         items=['Треуголка морского корсара', 'Перчатки морского корсара', 'Ботфорты морского корсара', 'Камзол морского корсара',
                'Эполеты морского корсара', 'Кушак морского корсара', 'Штаны морского корсара'],
         bonus={'attackSpeed': 5, 'goldBonus': 4}),
    dict(id='frost-fangs', name='Морозные клыки', rarity='Rare', kind='weapon', element='ice',
         pal=dict(base='#a8dcff', light='#ffffff', dark='#2a5a8a', trim='#1e3a5a', accent='#5eaeff', gem='#bfe6ff'),
         items=[('Морозный клинок', 'blade'), ('Морозный клык', 'dagger')],
         bonus={'damageBonus': 1.5, 'critDamage': 6}),
    dict(id='thunder-hammer', name='Громовой молот', rarity='Rare', kind='weapon', element='lightning',
         pal=dict(base='#8aa0c8', light='#eef4ff', dark='#222c4a', trim='#2a2a3a', accent='#ffe375', gem='#ffe375'),
         items=[('Громовой молот', 'hammer'), ('Грозовой топор', 'axe')],
         bonus={'damageBonus': 2}),
    dict(id='surf-rings', name='Кольца прибоя', rarity='Rare', kind='accessory', theme='critChance',
         pal=dict(base='#c8dce4', light='#ffffff', dark='#3a5a68', trim='#6a8a98', accent='#e8f4f8', gem='#2ab8d0'),
         items=['Кольцо пенного прибоя', 'Кольцо морской волны', 'Амулет прибоя'],
         bonus={'maxMana': 15, 'critChance': 2}),
    dict(id='star-compass', name='Звёздный компас', rarity='Rare', kind='accessory', theme='attackSpeed',
         pal=dict(base='#c0c8d8', light='#ffffff', dark='#2e3650', trim='#6a7898', accent='#e0e8f8', gem='#5eaeff'),
         items=['Кольцо полярной звезды', 'Кольцо странника звёзд', 'Амулет звёздного компаса'],
         bonus={'attackSpeed': 4, 'goldBonus': 5}),

    dict(id='blood-priest', name='Кровавый жрец', rarity='Epic', kind='armor', look='cloth', theme='critDamage',
         pal=dict(base='#6a1a3a', light='#d86a9a', dark='#24060f', trim='#bc79ff', accent='#ff8ab8', gem='#ff4a7a'),
         items=['Капюшон кровавого жреца', 'Перчатки кровавого жреца', 'Сапоги кровавого жреца', 'Мантия кровавого жреца',
                'Наплечники кровавого жреца', 'Пояс кровавого жреца', 'Штаны кровавого жреца'],
         bonus={'maxMana': 20, 'critDamage': 12}),
    dict(id='obsidian-knight', name='Обсидиановый рыцарь', rarity='Epic', kind='armor', look='metal', theme='damageBonus',
         pal=dict(base='#3a3446', light='#9a8ab8', dark='#0e0b14', trim='#bc79ff', accent='#d9a8ff', gem='#bc79ff'),
         items=['Шлем обсидианового рыцаря', 'Латные перчатки обсидианового рыцаря', 'Сабатоны обсидианового рыцаря',
                'Кираса обсидианового рыцаря', 'Наплечники обсидианового рыцаря', 'Пояс обсидианового рыцаря', 'Поножи обсидианового рыцаря'],
         bonus={'damageBonus': 2.5, 'critChance': 2}),
    dict(id='venom-stings', name='Ядовитые жала', rarity='Epic', kind='weapon', element='poison',
         pal=dict(base='#7ac85a', light='#e8ffd8', dark='#1e3a14', trim='#3a1a4a', accent='#bc79ff', gem='#9fe85a'),
         items=[('Ядовитое жало', 'dagger'), ('Сабля скорпиона', 'saber')],
         bonus={'attackSpeed': 6, 'critChance': 3}),
    dict(id='abyss-blades', name='Клинки бездны', rarity='Epic', kind='weapon', element='dark',
         pal=dict(base='#4a3a7a', light='#c8b8ff', dark='#120a24', trim='#1a1030', accent='#bc79ff', gem='#8a4aff'),
         items=[('Клинок бездны', 'blade'), ('Серп бездны', 'sickle')],
         bonus={'damageBonus': 2.5, 'critDamage': 10}),
    dict(id='storm-seals', name='Печати бури', rarity='Epic', kind='accessory', theme='attackSpeed',
         pal=dict(base='#a8b0d8', light='#f4f6ff', dark='#2a2e58', trim='#5a62a0', accent='#dce0ff', gem='#7a8aff'),
         items=['Печать молнии', 'Печать грома', 'Амулет печатей бури'],
         bonus={'attackSpeed': 7, 'maxMana': 15}),
    dict(id='void-eye', name='Око пустоты', rarity='Epic', kind='accessory', theme='critChance',
         pal=dict(base='#6a5a88', light='#d8c8f4', dark='#1a1228', trim='#3a2e58', accent='#c8b0f0', gem='#6a1ab8'),
         items=['Кольцо пустоты', 'Кольцо безмолвия', 'Амулет ока пустоты'],
         bonus={'critChance': 3, 'goldBonus': 8}),

    dict(id='dragon-scale', name='Драконья чешуя', rarity='Legendary', kind='armor', look='metal', theme='critDamage', horns=True,
         pal=dict(base='#a8241a', light='#ffb070', dark='#3a0806', trim='#ffd56a', accent='#ffe39a', gem='#ffcf6a'),
         items=['Шлем драконьей чешуи', 'Когти драконьей чешуи', 'Сапоги драконьей чешуи', 'Кираса драконьей чешуи',
                'Наплечники драконьей чешуи', 'Пояс драконьей чешуи', 'Поножи драконьей чешуи'],
         bonus={}),
    dict(id='storm-wrath', name='Гнев грозы', rarity='Legendary', kind='weapon', element='lightning',
         pal=dict(base='#ffd56a', light='#fffbe0', dark='#5a3a08', trim='#1e2a5a', accent='#8ab4ff', gem='#bfe0ff'),
         items=[('Меч гнева грозы', 'sword'), ('Топор гнева грозы', 'axe')],
         bonus={}),
    dict(id='sun-relics', name='Солнечные реликвии', rarity='Legendary', kind='accessory', theme='damageBonus',
         pal=dict(base='#f0b84a', light='#fff4c8', dark='#6a3a08', trim='#a86a18', accent='#ffe6a0', gem='#ff9b3e'),
         items=['Кольцо полуденного солнца', 'Кольцо солнечного затмения', 'Солнечная реликвия'],
         bonus={}),

    dict(id='dawn-blades', name='Клинки рассвета', rarity='Divine', kind='weapon', element='light',
         pal=dict(base='#fff0c0', light='#ffffff', dark='#a08040', trim='#c9a35a', accent='#ffe375', gem='#9fe8ff'),
         items=[('Меч рассвета', 'sword'), ('Сабля рассвета', 'saber')],
         bonus={}),
]


def round_stat(key, value):
    if key == 'damageBonus':
        return max(.1, round(value, 1))
    return max(1, int(round(value)))


def item_stats(set_def, slot, index):
    rarity = set_def['rarity']
    scale = RARITY_SCALE[rarity]
    count = RARITY_STATS[rarity]
    stats = {}
    if slot == 'weapon':
        stats['damage'] = round(WEAPON_DAMAGE[rarity] * (1 if index == 0 else .85), 1)
        count -= 1
    keys = []
    for key in SLOT_STATS[slot] + [set_def.get('theme', 'critChance'), 'critChance', 'goldBonus', 'maxMana', 'attackSpeed']:
        if key not in keys:
            keys.append(key)
    rng = random.Random(set_def['id'] + slot + str(index))
    for key in keys[:max(0, count)]:
        stats[key] = round_stat(key, STAT_UNIT[key] * scale * rng.uniform(.9, 1.15))
    return stats


# ── SVG ──────────────────────────────────────────────────────────────────────

def defs(pal, rarity):
    glow = RARITY_COLOR[rarity]
    strength = {'Common': .18, 'Uncommon': .26, 'Rare': .34, 'Epic': .42, 'Legendary': .55, 'Divine': .65}[rarity]
    return f'''<defs>
<radialGradient id="aura"><stop offset="0" stop-color="{glow}" stop-opacity="{strength}"/><stop offset="1" stop-color="{glow}" stop-opacity="0"/></radialGradient>
<linearGradient id="mat" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{pal['light']}"/><stop offset=".45" stop-color="{pal['base']}"/><stop offset="1" stop-color="{pal['dark']}"/></linearGradient>
<linearGradient id="matV" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{pal['base']}"/><stop offset="1" stop-color="{pal['dark']}"/></linearGradient>
<linearGradient id="trim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{pal['accent']}"/><stop offset="1" stop-color="{pal['trim']}"/></linearGradient>
<radialGradient id="gem" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#ffffff"/><stop offset=".3" stop-color="{pal['gem']}"/><stop offset="1" stop-color="{pal['dark']}"/></radialGradient>
<linearGradient id="wood" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8a5a2a"/><stop offset=".5" stop-color="#5a3414"/><stop offset="1" stop-color="#3a200a"/></linearGradient>
</defs>'''


OUT = 'stroke="#140d06" stroke-width="2.5" stroke-linejoin="round"'


def gem(x, y, r):
    return f'<circle cx="{x}" cy="{y}" r="{r}" fill="url(#gem)" stroke="#140d06" stroke-width="1.6"/><circle cx="{x - r * .35:.1f}" cy="{y - r * .35:.1f}" r="{r * .28:.1f}" fill="#fff" opacity=".8"/>'


def sparkles(rarity):
    if rarity not in ('Legendary', 'Divine'):
        return ''
    out = ''
    for x, y, s in ((22, 26, 6), (106, 30, 5), (104, 100, 4), (24, 98, 4)):
        out += f'<path d="M{x} {y - s}L{x + s * .3} {y - s * .3}L{x + s} {y}L{x + s * .3} {y + s * .3}L{x} {y + s}L{x - s * .3} {y + s * .3}L{x - s} {y}L{x - s * .3} {y - s * .3}Z" fill="#fff8d0" opacity=".9"/>'
    return out


def head(s):
    pal, rare = s['pal'], s['rarity']
    if s.get('look') in ('cloth', 'leather'):
        body = (f'<path d="M64 16C38 16 24 40 24 66C24 86 31 100 40 108H88C97 100 104 86 104 66C104 40 90 16 64 16Z" fill="url(#mat)" {OUT}/>'
                f'<path d="M64 42C49 42 41 55 41 71C41 86 47 96 52 102H76C81 96 87 86 87 71C87 55 79 42 64 42Z" fill="#0d0a08"/>'
                f'<path d="M64 42C49 42 41 55 41 71C41 86 47 96 52 102" fill="none" stroke="url(#trim)" stroke-width="4"/>'
                f'<path d="M64 42C79 42 87 55 87 71C87 86 81 96 76 102" fill="none" stroke="url(#trim)" stroke-width="4"/>'
                f'<path d="M64 18C60 30 60 36 64 42" fill="none" stroke="{pal["dark"]}" stroke-width="2" opacity=".6"/>')
        if rare in ('Rare', 'Epic', 'Legendary', 'Divine'):
            body += gem(64, 36, 6)
        return body
    body = (f'<path d="M28 74C28 42 44 22 64 22C84 22 100 42 100 74V88H28Z" fill="url(#mat)" {OUT}/>'
            f'<path d="M26 66H102V82H26Z" fill="url(#trim)" {OUT}/>'
            f'<path d="M40 76H88" stroke="#0d0a08" stroke-width="6" stroke-linecap="round"/>'
            f'<path d="M60 66H68V100H60Z" fill="url(#trim)" {OUT}/>'
            f'<path d="M30 82L36 104H52L50 82Z" fill="url(#matV)" {OUT}/><path d="M98 82L92 104H76L78 82Z" fill="url(#matV)" {OUT}/>'
            f'<path d="M64 24V64" stroke="{pal["light"]}" stroke-width="3" opacity=".55"/>')
    if s.get('horns'):
        body = (f'<path d="M34 54C18 44 14 26 22 12C26 28 34 36 46 42Z" fill="url(#trim)" {OUT}/>'
                f'<path d="M94 54C110 44 114 26 106 12C102 28 94 36 82 42Z" fill="url(#trim)" {OUT}/>') + body
        body += ''.join(f'<path d="M{x} 30L{x + 5} 14L{x + 10} 30Z" fill="url(#trim)" {OUT}/>' for x in (44, 59, 74))
    if s.get('wings'):
        body = (f'<path d="M30 62C14 56 6 40 10 22C18 36 26 40 36 44Z" fill="#fffdf2" {OUT}/>'
                f'<path d="M98 62C114 56 122 40 118 22C110 36 102 40 92 44Z" fill="#fffdf2" {OUT}/>') + body
    if rare in ('Rare', 'Epic', 'Legendary', 'Divine'):
        body += gem(64, 50, 7)
    return body


def gloves(s):
    return (f'<path d="M84 100C88 88 90 76 88 62L88 40C88 35 81 35 81 40V56H78V30C78 25 71 25 71 30V54H68V27C68 22 61 22 61 27V54H58V33C58 28 51 28 51 33V68L44 58C40 52 32 55 35 62L46 86C50 94 54 100 56 102Z" fill="url(#mat)" {OUT}/>'
            f'<path d="M52 98H90V116H52Z" fill="url(#trim)" {OUT}/>'
            f'<path d="M58 104H84" stroke="#140d06" stroke-width="2" opacity=".5"/>'
            + (gem(71, 72, 6) if s['rarity'] not in ('Common', 'Uncommon') else f'<circle cx="71" cy="72" r="4" fill="url(#trim)" {OUT}/>'))


def boots(s):
    return (f'<path d="M42 16H78V70C78 74 82 78 90 80C102 83 108 90 108 98V104H40C38 104 36 102 36 100L40 60Z" fill="url(#mat)" {OUT}/>'
            f'<path d="M36 100H108V112H36Z" fill="#2a1a0e" {OUT}/>'
            f'<path d="M40 16H80V28H40Z" fill="url(#trim)" {OUT}/>'
            f'<path d="M48 40H70M48 50H70M48 60H72" stroke="url(#trim)" stroke-width="3" stroke-linecap="round"/>'
            + (gem(60, 22, 4) if s['rarity'] not in ('Common', 'Uncommon') else ''))


def chest(s):
    pal = s['pal']
    return (f'<path d="M40 22L54 16C58 25 70 25 74 16L88 22L106 40L96 58L90 54V106C80 111 48 111 38 106V54L32 58L22 40Z" fill="url(#mat)" {OUT}/>'
            f'<path d="M54 16C58 25 70 25 74 16" fill="none" stroke="url(#trim)" stroke-width="4"/>'
            f'<path d="M64 26V106" stroke="url(#trim)" stroke-width="4"/>'
            f'<path d="M38 82H90V92H38Z" fill="url(#trim)" {OUT}/>'
            f'<path d="M46 36C52 44 52 60 46 70M82 36C76 44 76 60 82 70" fill="none" stroke="{pal["light"]}" stroke-width="2.5" opacity=".5"/>'
            + gem(64, 52, 7 if s['rarity'] not in ('Common', 'Uncommon') else 5))


def shoulders(s):
    plate = 'M16 76C16 50 32 36 56 38L58 64C44 64 30 72 22 86Z'
    mirror = 'M112 76C112 50 96 36 72 38L70 64C84 64 98 72 106 86Z'
    out = (f'<path d="{plate}" fill="url(#mat)" {OUT}/><path d="{mirror}" fill="url(#mat)" {OUT}/>'
           f'<path d="M20 70C26 56 38 48 54 48M108 70C102 56 90 48 74 48" fill="none" stroke="url(#trim)" stroke-width="4"/>'
           f'<path d="M24 82C30 72 40 66 52 64M104 82C98 72 88 66 76 64" fill="none" stroke="#140d06" stroke-width="2" opacity=".5"/>'
           f'<path d="M54 40H74V60H54Z" fill="url(#matV)" {OUT}/>')
    if s.get('horns'):
        out += f'<path d="M30 46C22 34 22 22 28 14C32 26 38 34 44 40Z" fill="url(#trim)" {OUT}/><path d="M98 46C106 34 106 22 100 14C96 26 90 34 84 40Z" fill="url(#trim)" {OUT}/>'
    if s.get('wings'):
        out += f'<path d="M30 46C18 36 14 22 18 12C24 24 32 30 42 36Z" fill="#fffdf2" {OUT}/><path d="M98 46C110 36 114 22 110 12C104 24 96 30 86 36Z" fill="#fffdf2" {OUT}/>'
    return out + gem(36, 58, 5) + gem(92, 58, 5)


def belt(s):
    return (f'<path d="M10 52C40 45 88 45 118 52V74C88 67 40 67 10 74Z" fill="url(#mat)" {OUT}/>'
            f'<path d="M14 58C42 52 86 52 114 58" fill="none" stroke="#140d06" stroke-width="1.5" opacity=".45" stroke-dasharray="3 4"/>'
            f'<path d="M48 44H80V82H48Z" fill="url(#trim)" {OUT}/>'
            f'<path d="M55 51H73V75H55Z" fill="#140d06"/>'
            f'<path d="M64 51V75" stroke="url(#trim)" stroke-width="4"/>'
            f'<path d="M86 72H104V98C104 102 100 104 95 104C90 104 86 102 86 98Z" fill="url(#matV)" {OUT}/>'
            + (gem(64, 63, 5) if s['rarity'] not in ('Common', 'Uncommon') else ''))


def legs(s):
    metal = s.get('look') == 'metal' or s['kind'] != 'armor'
    out = (f'<path d="M36 16H92L96 60L92 112H70L66 58H62L58 112H36L32 60Z" fill="url(#mat)" {OUT}/>'
           f'<path d="M34 16H94V28H34Z" fill="url(#trim)" {OUT}/>'
           f'<path d="M64 30V56" stroke="#140d06" stroke-width="2" opacity=".5"/>')
    if metal:
        out += f'<circle cx="47" cy="74" r="9" fill="url(#trim)" {OUT}/><circle cx="81" cy="74" r="9" fill="url(#trim)" {OUT}/>'
    else:
        out += '<path d="M42 72H56M72 72H86" stroke="#140d06" stroke-width="2" opacity=".5"/>'
    return out + (gem(64, 22, 4) if s['rarity'] not in ('Common', 'Uncommon') else '')


def weapon(s, shape):
    rot = 'rotate(40 64 64)'
    if shape in ('sword', 'blade', 'dagger', 'saber'):
        top = {'sword': 8, 'blade': 8, 'dagger': 34, 'saber': 8}[shape]
        if shape == 'saber':
            blade = f'<path d="M62 {top}C80 30 80 62 70 86H58C66 62 66 34 62 {top}Z" fill="url(#mat)" {OUT}/>'
        elif shape == 'blade':
            blade = f'<path d="M56 {top + 8}L64 {top}L72 {top + 8}L74 40L68 46L74 54L72 86H56L54 54L60 46L54 40Z" fill="url(#mat)" {OUT}/>'
        else:
            blade = f'<path d="M58 {top + 8}L64 {top}L70 {top + 8}L70 86H58Z" fill="url(#mat)" {OUT}/><path d="M64 {top + 6}V84" stroke="{s["pal"]["light"]}" stroke-width="2" opacity=".7"/>'
        guard = f'<path d="M40 84H88L84 94H44Z" fill="url(#trim)" {OUT}/>'
        grip = f'<path d="M59 94H69V114H59Z" fill="url(#wood)" {OUT}/>'
        pommel = gem(64, 118, 6)
        return f'<g transform="{rot}">{blade}{guard}{grip}{pommel}{gem(64, 89, 3.5)}</g>'
    if shape in ('axe', 'hatchet'):
        top = 14 if shape == 'axe' else 34
        head_path = (f'M66 {top + 6}C92 {top} 106 {top + 14} 106 {top + 34}C106 {top + 48} 98 {top + 56} 86 {top + 54}L66 {top + 42}Z'
                     if shape == 'axe' else
                     f'M66 {top + 4}C86 {top} 96 {top + 10} 96 {top + 26}C96 {top + 36} 90 {top + 42} 82 {top + 40}L66 {top + 32}Z')
        return (f'<g transform="rotate(20 64 64)"><path d="M59 {top}H69V118H59Z" fill="url(#wood)" {OUT}/>'
                f'<path d="{head_path}" fill="url(#mat)" {OUT}/>'
                f'<path d="M56 {top + 8}H72V{top + 20}H56Z" fill="url(#trim)" {OUT}/>{gem(64, top + 14, 3.5)}</g>')
    if shape == 'hammer':
        return (f'<g transform="rotate(30 64 64)"><path d="M59 40H69V118H59Z" fill="url(#wood)" {OUT}/>'
                f'<path d="M34 14H94V48H34Z" fill="url(#mat)" {OUT}/>'
                f'<path d="M34 22H94M34 40H94" stroke="url(#trim)" stroke-width="4"/>{gem(64, 31, 7)}'
                f'<path d="M57 48H71V58H57Z" fill="url(#trim)" {OUT}/></g>')
    if shape == 'sickle':
        return (f'<g transform="rotate(10 64 64)"><path d="M59 54H69V118H59Z" fill="url(#wood)" {OUT}/>'
                f'<path d="M68 58C40 60 22 40 30 12C36 34 50 44 74 46Z" fill="url(#mat)" {OUT}/>'
                f'<path d="M56 50H72V62H56Z" fill="url(#trim)" {OUT}/>{gem(64, 56, 4)}</g>')
    raise ValueError(shape)


def ring(s, index):
    band = 'M64 46A32 32 0 1 1 63.9 46ZM64 56A22 22 0 1 0 64.1 56Z'
    setting = f'<path d="M50 48L56 30H72L78 48Z" fill="url(#trim)" {OUT}/>'
    stone = gem(64, 32, 11) if index == 0 else (
        f'<path d="M64 18L76 32L64 46L52 32Z" fill="url(#gem)" stroke="#140d06" stroke-width="1.6"/><path d="M60 26L64 22L66 28Z" fill="#fff" opacity=".8"/>')
    return f'<path d="{band}" fill="url(#mat)" fill-rule="evenodd" {OUT}/>{setting}{stone}'


def amulet(s):
    return (f'<path d="M28 14C34 52 94 52 100 14" fill="none" stroke="url(#trim)" stroke-width="4" stroke-dasharray="5 3"/>'
            f'<path d="M64 46L90 72L64 114L38 72Z" fill="url(#mat)" {OUT}/>'
            f'<path d="M64 56L80 72L64 98L48 72Z" fill="url(#trim)" {OUT}/>'
            + gem(64, 74, 9) + f'<circle cx="64" cy="46" r="5" fill="url(#trim)" {OUT}/>')


def svg(s, body):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">{defs(s["pal"], s["rarity"])}'
            f'<circle cx="64" cy="64" r="60" fill="url(#aura)"/>{body}{sparkles(s["rarity"])}</svg>\n')


def build():
    os.makedirs(OUT_DIR, exist_ok=True)
    items, sets = [], []
    for s in SETS:
        ids = []
        if s['kind'] == 'armor':
            pieces = [(slot, name, None) for slot, name in zip(ARMOR_SLOTS, s['items'])]
        elif s['kind'] == 'weapon':
            pieces = [('weapon', name, shape) for name, shape in s['items']]
        else:
            pieces = [('ring', s['items'][0], 0), ('ring', s['items'][1], 1), ('accessory', s['items'][2], None)]
        for index, (slot, name, extra) in enumerate(pieces):
            item_id = f'{s["id"]}-{slot}' if s['kind'] == 'armor' else f'{s["id"]}-{index + 1}'
            draw = {'head': head, 'gloves': gloves, 'boots': boots, 'chest': chest, 'shoulders': shoulders, 'belt': belt, 'legs': legs}
            if slot in draw:
                body = draw[slot](s)
            elif slot == 'weapon':
                body = weapon(s, extra)
            elif slot == 'ring':
                body = ring(s, extra)
            else:
                body = amulet(s)
            # Нарисованная вручную иконка assets/items/<id>.webp важнее сгенерированной — её не перезаписываем.
            if os.path.exists(os.path.join(OUT_DIR, item_id + '.webp')):
                image = f'assets/items/{item_id}.webp'
            else:
                with open(os.path.join(OUT_DIR, item_id + '.svg'), 'w', encoding='utf-8', newline='\n') as f:
                    f.write(svg(s, body))
                image = f'assets/items/{item_id}.svg'
            item = {'id': item_id, 'name': name, 'slot': slot, 'rarity': s['rarity'], 'image': image,
                    'sellPrice': SELL_PRICE[s['rarity']], 'set': s['id']}
            if slot == 'weapon':
                item['element'] = s.get('element', 'none')
            item.update(item_stats(s, slot, index))
            items.append(item)
            ids.append(item_id)
        sets.append({'id': s['id'], 'name': s['name'], 'rarity': s['rarity'], 'kind': s['kind'], 'items': ids, 'bonus': s['bonus']})

    def js(value):
        return json.dumps(value, ensure_ascii=False, separators=(',', ':'))
    lines = ['// Создано tools/make_set_items.py — правь комплекты там и перезапускай генератор.',
             '// SET_ITEMS — все игровые предметы (каталог itemPool), ITEM_SETS — комплекты для окна «Коллекция».',
             '// kind: weapon — оружие, accessory — кольца и аксессуары, armor — остальная броня. Комплект может занимать не все слоты.',
             '// Бонус выдаётся навсегда, когда игрок хотя бы раз получил каждый предмет комплекта; пустой bonus — «будет объявлен позже».',
             'window.SET_ITEMS=[']
    lines += [' ' + js(item) + ',' for item in items]
    lines[-1] = lines[-1].rstrip(',')
    lines += ['];', 'window.ITEM_SETS=[']
    lines += [' ' + js(entry) + ',' for entry in sets]
    lines[-1] = lines[-1].rstrip(',')
    lines += ['];', '']
    with open(os.path.join(ROOT, 'item-sets.js'), 'w', encoding='utf-8', newline='\n') as f:
        f.write('\n'.join(lines))
    print(f'items: {len(items)}, sets: {len(sets)}')


if __name__ == '__main__':
    build()
