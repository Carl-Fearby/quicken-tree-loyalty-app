#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
CONFIG="$ROOT/.env.deploy"

if [ ! -f "$CONFIG" ]; then
  printf '%s\n' "Missing marketing/.env.deploy. Copy .env.deploy.example, fill in the password, and retry." >&2
  exit 1
fi

# shellcheck disable=SC1090
. "$CONFIG"

: "${FTP_HOST:=ftp.fasthosts.co.uk}"
: "${FTP_USER:?FTP_USER is required in .env.deploy}"
: "${FTP_PASSWORD:?FTP_PASSWORD is required in .env.deploy}"
: "${FTP_REMOTE_DIR:=}"
: "${FTP_PROTOCOL:=ftp}"
: "${FTP_PORT:=}"
: "${FTP_TIMEOUT:=30}"

case "$FTP_PROTOCOL" in
  ftp) URL_SCHEME="ftp"; CURL_SECURITY="" ;;
  ftps) URL_SCHEME="ftp"; CURL_SECURITY="--ftp-ssl-reqd" ;;
  sftp) URL_SCHEME="sftp"; CURL_SECURITY="" ;;
  *) printf '%s\n' "FTP_PROTOCOL must be ftp, ftps, or sftp." >&2; exit 1 ;;
esac

command -v curl >/dev/null 2>&1 || {
  printf '%s\n' "curl is required to deploy to Fasthosts." >&2
  exit 1
}

cd "$ROOT"
npm run build:static

if [ ! -f out/index.html ]; then
  printf '%s\n' "Static build did not produce out/index.html." >&2
  exit 1
fi

upload() {
  file=$1
  remote="${FTP_REMOTE_DIR:+$FTP_REMOTE_DIR/}$2"
  curl --fail --silent --show-error $CURL_SECURITY \
    --connect-timeout "$FTP_TIMEOUT" \
    --max-time 120 \
    --ftp-pasv \
    --user "$FTP_USER:$FTP_PASSWORD" \
    --ftp-create-dirs \
    --upload-file "$file" \
    ${FTP_PORT:+--port "$FTP_PORT"} \
    "$URL_SCHEME://$FTP_HOST/$remote"
}

find out -type f -print | while IFS= read -r file; do
  upload "$file" "${file#out/}"
  printf 'Uploaded %s\n' "${file#out/}"
done

upload "$ROOT/.htaccess" ".htaccess"
printf '%s\n' "Uploaded .htaccess"
printf '%s\n' "Fasthosts deployment complete."
