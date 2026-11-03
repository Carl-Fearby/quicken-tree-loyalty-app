#!/usr/bin/env bash
set -euo pipefail

if [[ $(id -u) -ne 0 ]]; then
  echo 'Run this on the VPS as root.' >&2
  exit 1
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DB="${SOURCE_DB:-pace}"
TEMPLATE_DB=pace_demo_template
ROLE=pace_demo
REFRESH=false
if [[ "${1:-}" == "--refresh" ]]; then
  REFRESH=true
elif [[ $# -gt 0 ]]; then
  echo 'Usage: provision-demo-template.sh [--refresh]' >&2
  exit 1
fi
if [[ ! "$SOURCE_DB" =~ ^[a-z][a-z0-9_]*$ || "$SOURCE_DB" == "$TEMPLATE_DB" ]]; then
  echo 'Invalid source database.' >&2
  exit 1
fi
if [[ -e /etc/pace/demo.env && "$REFRESH" != true ]]; then
  echo 'Demo credentials already exist; refusing to replace them.' >&2
  exit 1
fi
if runuser -u postgres -- psql -Atc "select 1 from pg_database where datname='$TEMPLATE_DB'" | grep -q 1 && [[ "$REFRESH" != true ]]; then
  echo 'Demo template already exists; refusing to overwrite it.' >&2
  exit 1
fi

PASSWORD=''
if [[ "$REFRESH" == true ]]; then
  if [[ ! -e /etc/pace/demo.env ]]; then
    echo 'Demo credentials are missing; run without --refresh first.' >&2
    exit 1
  fi
  if ! runuser -u postgres -- psql -Atc "select 1 from pg_roles where rolname='$ROLE'" | grep -q 1; then
    echo 'Demo database role is missing; restore it before refreshing.' >&2
    exit 1
  fi
else
  PASSWORD="$(openssl rand -hex 24)"
fi
if ! runuser -u postgres -- psql -Atc "select 1 from pg_roles where rolname='$ROLE'" | grep -q 1; then
  runuser -u postgres -- psql -v ON_ERROR_STOP=1 -c "create role $ROLE login createdb password '$PASSWORD'"
elif [[ "$REFRESH" != true ]]; then
  runuser -u postgres -- psql -v ON_ERROR_STOP=1 -c "alter role $ROLE password '$PASSWORD'"
fi

DUMP="$(mktemp /tmp/pace-demo-template.XXXXXX.dump)"
trap 'rm -f "$DUMP"' EXIT
chown postgres:postgres "$DUMP"
runuser -u postgres -- pg_dump --format=custom --no-owner --no-privileges --dbname="$SOURCE_DB" --file="$DUMP"
if [[ "$REFRESH" == true ]]; then
  runuser -u postgres -- dropdb --if-exists --force "$TEMPLATE_DB"
fi
runuser -u postgres -- createdb --owner="$ROLE" "$TEMPLATE_DB"
runuser -u postgres -- pg_restore --exit-on-error --no-owner --no-privileges --role="$ROLE" --dbname="$TEMPLATE_DB" "$DUMP"
runuser -u postgres -- psql -v ON_ERROR_STOP=1 --dbname="$TEMPLATE_DB" --file="$ROOT/demo-sanitize.sql"
runuser -u postgres -- psql -v ON_ERROR_STOP=1 --dbname="$TEMPLATE_DB" -c "alter table demo_template_marker owner to $ROLE"
runuser -u postgres -- psql -v ON_ERROR_STOP=1 -c "revoke connect on database $TEMPLATE_DB from public"
runuser -u postgres -- psql -v ON_ERROR_STOP=1 -c "grant connect on database $TEMPLATE_DB to $ROLE"

if [[ "$REFRESH" != true ]]; then
  install -d -o root -g pace -m 750 /etc/pace
  umask 077
  printf 'DEMO_DB_ADMIN_URL=postgresql://%s:%s@127.0.0.1:5432/postgres\nDEMO_TEMPLATE_DATABASE=%s\nPORT=4201\n' \
    "$ROLE" "$PASSWORD" "$TEMPLATE_DB" > /etc/pace/demo.env
  chown root:pace /etc/pace/demo.env
  chmod 640 /etc/pace/demo.env
fi
echo 'Sanitised demo template and private credentials are ready.'
