"""Локальный сервер игры: раздаёт файлы папки и принимает сохранение каталога из редактора магазина.

Запуск: python dev-server.py  →  http://127.0.0.1:8765
"""
import json
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
CATALOG_FILE = os.path.join(ROOT, "shop-catalog.js")
HEADER = "// Каталог магазина. Этот файл перезаписывает редактор магазина (F3 или кнопка в админ-панели).\n"
MAX_BODY = 1_000_000


class GameHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        # Без кэша, чтобы после сохранения игра сразу подхватывала новый каталог.
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_POST(self):
        if self.path != "/api/shop-catalog":
            self.send_error(404)
            return
        length = int(self.headers.get("Content-Length") or 0)
        if not 0 < length <= MAX_BODY:
            self.send_error(413)
            return
        try:
            catalog = json.loads(self.rfile.read(length).decode("utf-8"))
            if not isinstance(catalog, dict) or not isinstance(catalog.get("tabs"), list):
                raise ValueError("tabs")
        except (ValueError, UnicodeDecodeError):
            self.send_error(400, "Bad catalog")
            return
        text = HEADER + "window.SHOP_CATALOG=" + json.dumps(catalog, ensure_ascii=False, indent=1) + ";\n"
        temp = CATALOG_FILE + ".tmp"
        with open(temp, "w", encoding="utf-8") as file:
            file.write(text)
        os.replace(temp, CATALOG_FILE)
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
