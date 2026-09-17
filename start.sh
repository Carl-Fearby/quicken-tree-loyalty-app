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

MANAGED_PORTS=(3000 4000 4100 4101)

stop_listeners() {
  local port pid
  local stale_pids=()

  for port in "${MANAGED_PORTS[@]}"; do
    while IFS= read -r pid; do
      [[ -n "$pid" ]] && stale_pids+=("$pid")
    done < <(lsof -tiTCP:"${port}" -sTCP:LISTEN 2>/dev/null || true)
  done

  if ((${#stale_pids[@]} == 0)); then
    return
  fi

  echo "Stopping previous Quicken Tree services…"
  kill "${stale_pids[@]}" 2>/dev/null || true

  for _ in {1..20}; do
    local remaining=0
    for port in "${MANAGED_PORTS[@]}"; do
      lsof -tiTCP:"${port}" -sTCP:LISTEN >/dev/null 2>&1 && remaining=1
    done
    if ((remaining == 0)); then
      return
    fi
    sleep 0.25
  done

  echo "Force-stopping unresponsive Quicken Tree services…"
  for port in "${MANAGED_PORTS[@]}"; do
    while IFS= read -r pid; do
      [[ -n "$pid" ]] && kill -9 "$pid" 2>/dev/null || true
    done < <(lsof -tiTCP:"${port}" -sTCP:LISTEN 2>/dev/null || true)
  done
}

stop_listeners

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
start_service "back-office API" "$ROOT_DIR/management" npm run api:dev
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
