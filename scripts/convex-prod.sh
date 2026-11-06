#!/usr/bin/env bash
# Run the Convex CLI against the self-hosted production backend on the VPS.
#   bash scripts/convex-prod.sh deploy -y
#   bash scripts/convex-prod.sh env list
#   bash scripts/convex-prod.sh run seed:demo
# Reads only the admin key from /opt/lendloop-stack/.env so the other stack
# secrets never reach the CLI process.
set -euo pipefail

STACK_ENV=/opt/lendloop-stack/.env
APP_DIR=/var/www/lendloop.ahmedrameezaka.com

key="$(sed -n "s/^CONVEX_SELF_HOSTED_ADMIN_KEY=//p" "$STACK_ENV" | tr -d "'\"")"
if [[ -z "$key" ]]; then
  echo "no CONVEX_SELF_HOSTED_ADMIN_KEY in $STACK_ENV" >&2
  exit 1
fi

cd "$APP_DIR"
CONVEX_SELF_HOSTED_URL=http://127.0.0.1:3210 \
CONVEX_SELF_HOSTED_ADMIN_KEY="$key" \
  exec npx --no-install convex "$@"
