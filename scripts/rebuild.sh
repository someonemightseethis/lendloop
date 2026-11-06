#!/usr/bin/env bash
# Build and restart LendLoop. Called after git reset so it always runs the
# version that was just checked out.
set -euo pipefail

APP_DIR=/var/www/lendloop.ahmedrameezaka.com
cd "$APP_DIR"

if [[ ! -f /etc/lendloop.env ]]; then
  echo "missing /etc/lendloop.env — copy deploy/lendloop.env.example and fill it in" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source /etc/lendloop.env
set +a

for key in NEXT_PUBLIC_CONVEX_URL NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY CLERK_SECRET_KEY; do
  if [[ -z "${!key:-}" ]]; then
    echo "warning: empty $key in /etc/lendloop.env — public page still builds" >&2
  fi
done

LOCK_HASH="$(git rev-parse HEAD:package-lock.json)"
PREV="$(cat .deploy-lock-hash 2>/dev/null || true)"
if [[ "$LOCK_HASH" != "$PREV" || ! -d node_modules ]]; then
  npm ci
  echo "$LOCK_HASH" > .deploy-lock-hash
fi

export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=1536}"
npm run build
chown -R www-data:www-data "$APP_DIR"
systemctl restart lendloop
systemctl --no-pager --full status lendloop | head -20
