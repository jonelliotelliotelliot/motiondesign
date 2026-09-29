#!/bin/bash
# Double-click to edit the homepage layout.
#
# Starts the layout server (tools/layout-server.py) for this folder and opens
# the homepage in your browser with the layout editor on. Arrange the cards,
# press "apply all" to save them into index.html. Close this window (or press
# Ctrl+C) when you're done, and the server stops.
#
# If you'd rather keep using VS Code's Live Server, that works too: leave this
# window open and press E on the Live Server page.

cd "$(dirname "$0")" || exit 1
PORT="${PORT:-8765}"
URL="http://localhost:$PORT/?edit"

pause() { echo; read -n 1 -s -r -p "Press any key to close this window."; echo; }

# Already running? Reuse it if it's serving this folder.
if lsof -ti "tcp:$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  info="$(curl -s "http://localhost:$PORT/__layout")"
  if [[ "$info" == *"\"root\": \"$PWD\""* ]]; then
    echo "The layout server is already running for this folder; opening the editor."
    open "$URL"
    exit 0
  fi
  echo "Port $PORT is already in use by something else, so the layout server can't start."
  echo "Close whatever is using it, or run:  PORT=8766 \"$0\""
  pause
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 isn't installed. Install Apple's command line tools with:"
  echo "    xcode-select --install"
  pause
  exit 1
fi

echo "Starting the layout editor for:"
echo "    $PWD"
echo
echo "Editing at $URL"
echo "Leave this window open while you edit. Close it (or press Ctrl+C) when you're done."
echo

# open the browser once the server answers
(
  for _ in $(seq 1 50); do
    curl -s "http://localhost:$PORT/__layout" >/dev/null 2>&1 && break
    sleep 0.1
  done
  open "$URL"
) &

exec python3 tools/layout-server.py "$PORT"
