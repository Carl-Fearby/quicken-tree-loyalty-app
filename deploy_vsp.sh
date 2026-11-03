#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="$ROOT/deploy-marketing-vps.sh"

if [[ ! -f "$TARGET" ]]; then
  echo "Missing canonical deploy script: $TARGET" >&2
  exit 1
fi

echo "Warning: \`deploy_vsp.sh\` is deprecated (typo alias). Forwarding to \`./deploy-marketing-vps.sh\`." >&2
exec "$TARGET" "$@"
