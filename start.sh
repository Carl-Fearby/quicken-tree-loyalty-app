#!/usr/bin/env bash

# Starts the complete local Quicken Tree stack:
#   App:        http://localhost:3000
#   API:        http://localhost:4000
#   Swagger:    http://localhost:4000/docs
#   Back office: http://localhost:4100

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PIDS=()

cleanup() {
  echo
  echo "Stopping Quicken Tree services…"
  for pid in "${PIDS[@]:-}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
}

trap cleanup EXIT INT TERM

require_port() {
  local port="$1"
  # Only a listening socket blocks a dev server. Browser connections in
  # CLOSE_WAIT must not be treated as a service already using the port.
  if lsof -tiTCP:"${port}" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Port ${port} is already in use. Stop that service before running ./start.sh." >&2
    exit 1
  fi
}

for port in 3000 4000 4100; do require_port "$port"; done

start_service() {
  local name="$1"
  local directory="$2"
  shift 2
  echo "Starting ${name}…"
  (
    cd "$directory"
    exec "$@"
  ) &
  PIDS+=("$!")
}

start_service "API and Swagger" "$ROOT_DIR/backend" npm run dev
start_service "back office" "$ROOT_DIR/management" npm run dev
start_service "app" "$ROOT_DIR/app" npm run dev -- --port 3000

echo
echo "Quicken Tree is running:"
echo "  App:         http://localhost:3000"
echo "  API:         http://localhost:4000"
echo "  Swagger:     http://localhost:4000/docs"
echo "  Back office: http://localhost:4100"
echo
echo "Press Ctrl+C to stop all services."

wait
