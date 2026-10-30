"""Локальный сервер игры: раздаёт файлы папки и принимает сохранения из редакторов магазина и древа героя.

Запуск: python dev-server.py  →  http://127.0.0.1:8765
"""
import json
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
MAX_BODY = 1_000_000
# Куда редакторы сохраняют данные: путь API → (файл, глобальная переменная, обязательный список, заголовок).
TARGETS = {
    "/api/shop-catalog": ("shop-catalog.js", "SHOP_CATALOG", "tabs",
                          "// Каталог магазина. Этот файл перезаписывает редактор магазина (F3 или кнопка в админ-панели).\n"),
    "/api/hero-tree": ("hero-tree-data.js", "HERO_TREE", "nodes",
                       "// Древо прокачки героя. Этот файл перезаписывает редактор древа (кнопка ✎ в окне героя или F4).\n"),
}


class GameHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        # Без кэша, чтобы после сохранения игра сразу подхватывала новые данные.
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_POST(self):
        target = TARGETS.get(self.path)
        if not target:
            self.send_error(404)
            return
        file_name, variable, required, header = target
        length = int(self.headers.get("Content-Length") or 0)
        if not 0 < length <= MAX_BODY:
            self.send_error(413)
            return
        try:
            data = json.loads(self.rfile.read(length).decode("utf-8"))
            if not isinstance(data, dict) or not isinstance(data.get(required), list):
                raise ValueError(required)
        except (ValueError, UnicodeDecodeError):
            self.send_error(400, "Bad data")
            return
        text = header + "window." + variable + "=" + json.dumps(data, ensure_ascii=False, indent=1) + ";\n"
        path = os.path.join(ROOT, file_name)
        temp = path + ".tmp"
        with open(temp, "w", encoding="utf-8") as file:
            file.write(text)
        os.replace(temp, path)
        body = b'{"ok":true}'
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", 8765), GameHandler)
    print("Игра: http://127.0.0.1:8765")
    server.serve_forever()
