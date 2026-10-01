#!/usr/bin/env bash
# Start the TRAVELS assistant and expose it through a Cloudflare quick tunnel.
#
#   ./run.sh [KEY_FILE]        default: ~/.config/travels/openai.key
#
# Ctrl-C stops both. Run it inside tmux to keep it up after you log out.
# The quick-tunnel URL changes every time this starts.
set -euo pipefail
cd "$(dirname "$0")"

KEY=${1:-$HOME/.config/travels/openai.key}
# Needs numpy and the openai SDK; defaults to the qc_bench conda env when present.
DEFAULT_PY=$HOME/miniforge3/envs/qc_bench/bin/python
[ -x "$DEFAULT_PY" ] || DEFAULT_PY=python3
PY=${PYTHON:-$DEFAULT_PY}
CF=${CLOUDFLARED:-$HOME/.local/bin/cloudflared}
PORT=${PORT:-18437}
MIN_SCORE=${MIN_SCORE:-0.35}

[ -f "$KEY" ] || { echo "key file not found: $KEY"; exit 1; }
case "$(stat -c %a "$KEY")" in 600|400) ;; *) echo "refusing to start: $KEY is readable by others; run: chmod 600 $KEY"; exit 1;; esac
case "$(realpath "$KEY")" in */docs/*) echo "refusing to start: the key file is inside docs/, which is published"; exit 1;; esac
[ -x "$CF" ] || { echo "cloudflared not found at $CF"; exit 1; }

SERVER="" TUNNEL=""
trap '[ -n "$TUNNEL" ] && kill $TUNNEL 2>/dev/null; [ -n "$SERVER" ] && kill $SERVER 2>/dev/null; true' EXIT INT TERM

"$PY" server.py --key-file "$KEY" --port "$PORT" --min-score "$MIN_SCORE" &
SERVER=$!
echo "waiting for the server (first start embeds the pages, ~10 s)..."
until curl -sf "http://127.0.0.1:$PORT/api/health" >/dev/null; do
  kill -0 "$SERVER" 2>/dev/null || { echo "server exited; see the error above"; exit 1; }
  sleep 1
done

LOG=data/tunnel.log
"$CF" tunnel --no-autoupdate --url "http://127.0.0.1:$PORT" > "$LOG" 2>&1 &
TUNNEL=$!
URL=""
for _ in $(seq 1 60); do
  URL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' "$LOG" | head -1 || true)
  [ -n "$URL" ] && break
  sleep 1
done
[ -n "$URL" ] || { echo "tunnel did not come up; see assistant/$LOG"; exit 1; }

# Tell the published site where the assistant is. The address changes on every start,
# so this file must be committed and pushed for GitHub Pages to pick it up.
CONFIG=../docs/assistant-config.json
printf '{\n  "endpoint": "%s",\n  "updated": "%s"\n}\n' "$URL" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$CONFIG"

cat <<EOF

  TRAVELS assistant is live.

  Assistant endpoint        $URL
  Written to                docs/assistant-config.json
  >> Push that file so https://cats-lab.github.io/TRAVELS-Data/ uses this address. <<
  Question log              assistant/data/queries.log

  The URL can take ~30 s to resolve. Ctrl-C to stop.

EOF
wait "$SERVER"
