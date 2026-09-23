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
: "${APP_URL:=https://app.pacevenues.com}"
: "${API_URL:=https://api.pacevenues.com}"
: "${BACKOFFICE_URL:=https://backoffice.pacevenues.com}"

SSH=(ssh -i "$DEPLOY_KEY" -o BatchMode=yes "$DEPLOY_USER@$DEPLOY_HOST")
RSYNC_SSH="ssh -i $DEPLOY_KEY -o BatchMode=yes"

echo "Building customer app for $API_URL..."
(
  cd "$ROOT/app"
  NEXT_PUBLIC_CONTENT_API_URL="$API_URL" \
  NEXT_PUBLIC_ACCOUNT_WEB_URL="$APP_URL" \
  npm run build
)

echo "Building marketing site for $API_URL..."
(
  cd "$ROOT/marketing"
  NEXT_PUBLIC_BACKEND_URL="$API_URL" \
  SITE_URL="https://pacevenues.com" \
  npm run build
)

echo "Uploading marketing site..."
rsync -az --delete -e "$RSYNC_SSH" "$ROOT/marketing/out/" "$DEPLOY_USER@$DEPLOY_HOST:/var/www/pace/marketing/"

echo "Uploading customer app..."
rsync -az --delete -e "$RSYNC_SSH" "$ROOT/app/out/" "$DEPLOY_USER@$DEPLOY_HOST:/var/www/pace/app/"

echo "Uploading public API..."
rsync -az --delete -e "$RSYNC_SSH" \
  --exclude node_modules --exclude .env --exclude dist --exclude '*.tsbuildinfo' \
  "$ROOT/backend/" "$DEPLOY_USER@$DEPLOY_HOST:/srv/pace/backend/"

echo "Uploading back office..."
rsync -az --delete -e "$RSYNC_SSH" \
  --exclude node_modules --exclude .next --exclude .env --exclude '*.tsbuildinfo' \
  "$ROOT/management/" "$DEPLOY_USER@$DEPLOY_HOST:/srv/pace/management/"

echo "Installing, building and restarting remote services..."
"${SSH[@]}" bash -s <<'REMOTE'
set -euo pipefail
cd /srv/pace/backend
npm ci
npm run typecheck
cd /srv/pace/management
npm ci
npm run build
cd /srv/pace/backend
npm run seed:dish-images
sudo systemctl restart pace-api.service pace-management-api.service pace-backoffice.service
REMOTE

echo "Checking services..."
"${SSH[@]}" bash -s <<'REMOTE'
set -euo pipefail
test -s /var/www/pace/app/dish-images/steak.webp
test -s /srv/pace/management/public/dish-images/steak.webp
curl --fail --silent http://127.0.0.1:4000/health >/dev/null
curl --fail --silent http://127.0.0.1:4100/login >/dev/null
curl --fail --silent http://127.0.0.1:4101/api/development/database-target >/dev/null && exit 1 || true
systemctl --no-pager --quiet is-active pace-api.service pace-management-api.service pace-backoffice.service
REMOTE

echo "Deployment complete:"
echo "  App:         $APP_URL"
echo "  API:         $API_URL"
echo "  Back office: $BACKOFFICE_URL"
