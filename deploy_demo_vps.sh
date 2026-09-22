#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$ROOT/deploy.env"
: "${DEPLOY_HOST:?DEPLOY_HOST is required}"
: "${DEPLOY_KEY:?DEPLOY_KEY is required}"

SSH=(ssh -i "$DEPLOY_KEY" -o BatchMode=yes "root@$DEPLOY_HOST")
RSYNC_SSH="ssh -i $DEPLOY_KEY -o BatchMode=yes"

"${SSH[@]}" 'install -d -o pace -g pace -m 755 /srv/pace/management-demo'
rsync -az --delete -e "$RSYNC_SSH" \
  --exclude node_modules --exclude .next --exclude .env --exclude '.env.*' \
  "$ROOT/management/" "root@$DEPLOY_HOST:/srv/pace/management-demo/"

"${SSH[@]}" '
  set -e
  chown -R pace:pace /srv/pace/management-demo
  if [ ! -f /etc/pace/demo.env ]; then
    bash /srv/pace/management-demo/provision-demo-template.sh
  fi
  runuser -u pace -- sh -c "cd /srv/pace/management-demo && npm ci"
  runuser -u pace -- sh -c "cd /srv/pace/management-demo && MANAGEMENT_API_PORT=4201 NEXT_PUBLIC_DEMO_MODE=true npm run build"
  cp /srv/pace/management-demo/pace-demo-gateway.service /etc/systemd/system/
  cp /srv/pace/management-demo/pace-demo-web.service /etc/systemd/system/
  cp /srv/pace/management-demo/pace-demo.nginx /etc/nginx/sites-available/pace-demo
  ln -sfn /etc/nginx/sites-available/pace-demo /etc/nginx/sites-enabled/pace-demo
  systemctl daemon-reload
  systemctl enable --now pace-demo-gateway.service pace-demo-web.service
  systemctl restart pace-demo-gateway.service pace-demo-web.service
  nginx -t
  systemctl reload nginx
  certbot --nginx --non-interactive --agree-tos --redirect -d backoffice-demo.pacevenues.com
'

echo 'Demo deployed at https://backoffice-demo.pacevenues.com'
