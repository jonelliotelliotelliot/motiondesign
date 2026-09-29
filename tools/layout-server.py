#!/usr/bin/env python3
"""Local server for the homepage layout editor.

Serves the site like `python3 -m http.server`, and also accepts the layout
editor's Apply: a POST to /__layout with every card's placement, which it
writes into the cards' style attributes in index.html (and their
data-autoplay marks). The editor can also
save through it from a page served elsewhere on this machine (VS Code's
Live Server, say), so leave it running alongside.

    python3 tools/layout-server.py          # http://localhost:8765
    python3 tools/layout-server.py 8000     # another port

Only listens on this machine (127.0.0.1) and only ever writes index.html.
"""
import http.server
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX = os.path.join(ROOT, "index.html")
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8765

# pages on this machine may save here, whatever port serves them
LOCAL_ORIGIN = re.compile(r"^https?://(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$")
# the opening tag of each homepage card, up to and including its style value
CARD = re.compile(r'(<div class="grid-item"[^>]*?style=")([^"]*)(")')
WIDE = ("x", "y", "w", "h")
NARROW = ("nx", "ny", "nw", "nh")


def tag_for(opening, card):
    """The card's opening tag up to its style value, with its data-autoplay
    mark added or removed to match the editor (left alone if not sent)."""
    if "autoplay" not in card:
        return opening
    opening = opening.replace(" data-autoplay", "")
    if card["autoplay"]:
        opening = opening[: -len(' style="')] + ' data-autoplay style="'
    return opening


def style_for(card):
    """A card's style attribute: its wide placement, then its narrow one on
    the next line, each followed by its layer when it has one."""
    def line(keys, z):
        parts = [f"--{k}:{int(card[k])}" for k in keys]
        if card.get(z) is not None:
            parts.append(f"--{z}:{int(card[z])}")
        return "; ".join(parts)
    return line(WIDE, "z") + ";\n                 " + line(NARROW, "nz")


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        # always serve fresh files while editing
        self.send_header("Cache-Control", "no-store")
        origin = self.headers.get("Origin", "")
        if self.path.startswith("/__layout") and LOCAL_ORIGIN.match(origin):
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.send_header("Vary", "Origin")
        super().end_headers()

    def do_OPTIONS(self):
        if self.path != "/__layout":
            return self.send_error(404)
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        # the editor asks here whether it can save, and to which folder
        if self.path == "/__layout":
            body = json.dumps({"server": "layout-server", "root": ROOT}).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def do_POST(self):
        if self.path != "/__layout":
            return self.send_error(404)
        try:
            length = int(self.headers.get("Content-Length", 0))
            cards = json.loads(self.rfile.read(length))["cards"]
            with open(INDEX, encoding="utf-8") as f:
                html = f.read()
            found = CARD.findall(html)
            if len(found) != len(cards):
                raise ValueError(f"index.html has {len(found)} cards, the editor sent {len(cards)}")
            for card in cards:
                for k in WIDE + NARROW:
                    if int(card[k]) < 1:
                        raise ValueError(f"card {card.get('name')}: --{k} must be 1 or more")
            it = iter(cards)

            def rewrite(m):
                card = next(it)
                return tag_for(m.group(1), card) + style_for(card) + m.group(3)
            html = CARD.sub(rewrite, html)
            with open(INDEX, "w", encoding="utf-8") as f:
                f.write(html)
        except (ValueError, KeyError, TypeError, json.JSONDecodeError) as e:
            body = str(e).encode()
            self.send_response(400)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        self.send_response(204)
        self.end_headers()
        print(f"saved {len(cards)} card placements to index.html")


if __name__ == "__main__":
    server = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"serving {ROOT} at http://localhost:{PORT}  (layout editor: press E on the homepage)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
