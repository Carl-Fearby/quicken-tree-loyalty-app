#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG="$ROOT/deploy.env"

if [[ ! -f "$CONFIG" ]]; then
  echo "Missing deploy.env. Create it from deploy.env.example." >&2
  exit 1
fi

# shellcheck disable=SC1090
source "$CONFIG"
: "${DEPLOY_HOST:?DEPLOY_HOST is required}"
: "${DEPLOY_USER:=pace}"
: "${DEPLOY_KEY:?DEPLOY_KEY is required}"
: "${API_URL:=https://api.pacevenues.com}"
: "${SITE_URL:=https://pacevenues.com}"

if [[ ! -f "$DEPLOY_KEY" ]]; then
  echo "SSH key not found: $DEPLOY_KEY" >&2
  exit 1
fi

echo "Building marketing site for $SITE_URL..."
(
  cd "$ROOT/marketing"
  SITE_URL="$SITE_URL" NEXT_PUBLIC_BACKEND_URL="$API_URL" npm run build
)

if [[ ! -f "$ROOT/marketing/out/index.html" ]]; then
  echo "Marketing export is missing its homepage." >&2
  exit 1
fi

echo "Uploading marketing site..."
rsync -az --delete -e "ssh -i $DEPLOY_KEY -o BatchMode=yes" \
  "$ROOT/marketing/out/" "$DEPLOY_USER@$DEPLOY_HOST:/var/www/pace/marketing/"

echo "Marketing site deployed: $SITE_URL"
