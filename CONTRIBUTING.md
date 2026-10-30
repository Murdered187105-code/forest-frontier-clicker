# Как работать над игрой (для соавторов)

## 1. Принять приглашение

Открой https://github.com/Murdered187105-code/forest-frontier-clicker/invitations и нажми **Accept invitation**. Приглашение действует 7 дней.

## 2. Установить программы (один раз)

- **Git** — https://git-scm.com/downloads
- **Python 3** — https://www.python.org/downloads (при установке на Windows отметь «Add Python to PATH»)
- **GitHub CLI** (удобно для входа) — https://cli.github.com

Войди в GitHub из терминала:

```bash
gh auth login
```

## 3. Скачать проект

```bash
git clone https://github.com/Murdered187105-code/forest-frontier-clicker.git
cd forest-frontier-clicker
```

Чтобы твоя почта не попала в открытую историю, укажи скрытый адрес GitHub (его видно в Settings → Emails, вида `12345+логин@users.noreply.github.com`):

```bash
git config user.name "ТвойЛогин"
git config user.email "ID+ТвойЛогин@users.noreply.github.com"
```

## 4. Запустить игру с админкой и редакторами

```bash
python dev-server.py
```

Открой http://127.0.0.1:8765. Локально доступно всё, что скрыто от игроков на сайте:

| Инструмент | Как открыть |
|---|---|
| Админ-панель (золото, опыт, предметы, этапы) | кнопка «⌘ Админ» справа |
| Редактор интерфейса | `F2` |
| Редактор магазина | `F3` |
| Редактор древа героя | `F4` или «✎ Редактор» в окне героя (клик по аватару) |

Редакторы магазина и древа сохраняют изменения в файлы `shop-catalog.js` и `hero-tree-data.js` кнопкой «Сохранить в файл» (работает, только когда игра запущена через `dev-server.py`).

## 5. Выложить изменения на сайт

Каждый раз **перед началом работы** забирай свежую версию:

```bash
git pull
```

Когда закончил:

```bash
git add -A
git commit -m "Коротко, что изменил"
git push
```

Примерно через минуту изменения появятся на сайте: https://murdered187105-code.github.io/forest-frontier-clicker/

## Договорённости

- Не правьте один и тот же файл одновременно (особенно `shop-catalog.js`, `hero-tree-data.js`, `index.html`) — договоритесь, кто чем занимается.
- Если `git push` отказал из-за чужих изменений — сделай `git pull`, проверь игру и отправь снова.
- Страницы `*-variants.html` и папка `work/` в репозиторий не попадают — это нормально.
- Прогресс игроков хранится в их браузерах; выкладка новой версии его не стирает.
