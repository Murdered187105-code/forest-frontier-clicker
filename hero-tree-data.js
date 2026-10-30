// Древо прокачки героя. Этот файл перезаписывает редактор древа (кнопка ✎ в окне героя или F4).
window.HERO_TREE={
 "version": 1,
 "branches": [
  {
   "id": "might",
   "name": "Сила",
   "color": "#ff9b3e"
  },
  {
   "id": "agility",
   "name": "Ловкость",
   "color": "#76d76b"
  },
  {
   "id": "wisdom",
   "name": "Мудрость",
   "color": "#5eaeff"
  }
 ],
 "nodes": [
  {
   "id": "might-1",
   "branch": "might",
   "orbit": 1,
   "angle": -150,
   "name": "Крепкая рука",
   "icon": "⚔",
   "desc": "Удары становятся тяжелее.",
   "maxRank": 5,
   "cost": 1,
   "stats": {
    "damageBonus": 0.2
   },
   "ability": null,
   "requires": [],
   "requireMode": "all",
   "requireLevel": "one"
  },
  {
   "id": "might-2",
   "branch": "might",
   "orbit": 2,
   "angle": -150,
   "name": "Тяжёлый замах",
   "icon": "💥",
   "desc": "Критические удары бьют сильнее.",
   "maxRank": 5,
   "cost": 1,
   "stats": {
    "critDamage": 5
   },
   "ability": null,
   "requires": [
    "might-1"
   ],
   "requireMode": "all",
   "requireLevel": "one"
  },
  {
   "id": "might-3",
   "branch": "might",
   "orbit": 3,
   "angle": -158,
   "name": "Боевой азарт",
   "icon": "🔥",
   "desc": "Ещё больше урона за каждый удар.",
   "maxRank": 3,
   "cost": 1,
   "stats": {
    "damageBonus": 0.5
   },
   "ability": null,
   "requires": [
    "might-2"
   ],
   "requireMode": "all",
   "requireLevel": "one"
  },
  {
   "id": "agility-1",
   "branch": "agility",
   "orbit": 1,
   "angle": -30,
   "name": "Быстрые руки",
   "icon": "🗡",
   "desc": "Атаки следуют чаще.",
   "maxRank": 5,
   "cost": 1,
   "stats": {
    "attackSpeed": 2
   },
   "ability": null,
   "requires": [],
   "requireMode": "all",
   "requireLevel": "one"
  },
  {
   "id": "agility-2",
   "branch": "agility",
   "orbit": 2,
   "angle": -30,
   "name": "Зоркий глаз",
   "icon": "🎯",
   "desc": "Чаще находишь уязвимые места.",
   "maxRank": 5,
   "cost": 1,
   "stats": {
    "critChance": 1
   },
   "ability": null,
   "requires": [
    "agility-1"
   ],
   "requireMode": "all",
   "requireLevel": "one"
  },
  {
   "id": "agility-3",
   "branch": "agility",
   "orbit": 3,
   "angle": -22,
   "name": "Порыв ветра",
   "icon": "🌪",
   "desc": "Ещё быстрее серия атак.",
   "maxRank": 3,
   "cost": 1,
   "stats": {
    "attackSpeed": 4
   },
   "ability": null,
   "requires": [
    "agility-2"
   ],
   "requireMode": "all",
   "requireLevel": "one"
  },
  {
   "id": "wisdom-1",
   "branch": "wisdom",
   "orbit": 1,
   "angle": 90,
   "name": "Внутренний резерв",
   "icon": "💧",
   "desc": "Больше маны для навыков.",
   "maxRank": 5,
   "cost": 1,
   "stats": {
    "maxMana": 5
   },
   "ability": null,
   "requires": [],
   "requireMode": "all",
   "requireLevel": "one"
  },
  {
   "id": "wisdom-2",
   "branch": "wisdom",
   "orbit": 2,
   "angle": 90,
   "name": "Удача торговца",
   "icon": "💰",
   "desc": "Больше золота за каждого врага.",
   "maxRank": 5,
   "cost": 1,
   "stats": {
    "goldBonus": 3
   },
   "ability": null,
   "requires": [
    "wisdom-1"
   ],
   "requireMode": "all",
   "requireLevel": "one"
  },
  {
   "id": "wisdom-3",
   "branch": "wisdom",
   "orbit": 3,
   "angle": 98,
   "name": "Поток маны",
   "icon": "🔮",
   "desc": "Глубокий запас магической силы.",
   "maxRank": 3,
   "cost": 1,
   "stats": {
    "maxMana": 10
   },
   "ability": null,
   "requires": [
    "wisdom-2"
   ],
   "requireMode": "all",
   "requireLevel": "one"
  },
  {
   "id": "master-1",
   "branch": "might",
   "orbit": 4,
   "angle": -90,
   "name": "Мастер клинка",
   "icon": "👑",
   "desc": "Открывается, когда полностью изучены «Боевой азарт» и «Порыв ветра».",
   "maxRank": 1,
   "cost": 2,
   "stats": {
    "damageBonus": 1,
    "critChance": 2
   },
   "ability": {
    "name": "Двойной удар",
    "desc": "Новая способность (механику добавим отдельно)."
   },
   "requires": [
    "might-3",
    "agility-3"
   ],
   "requireMode": "all",
   "requireLevel": "max"
  }
 ]
};
