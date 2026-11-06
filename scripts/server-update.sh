#!/usr/bin/env bash
# Pull origin/main on the VPS and rebuild. Safe to run from cron or GitHub Actions.
# Pass --force to rebuild even when main has not moved.
set -euo pipefail

APP_DIR=/var/www/lendloop.ahmedrameezaka.com
LOCK=/var/lock/lendloop-deploy.lock
FORCE=0
if [[ "${1:-}" == "--force" ]]; then
  FORCE=1
fi

exec 9>"$LOCK"
if ! flock -n 9; then
  echo "deploy already running"
  exit 0
fi

cd "$APP_DIR"
git fetch --prune origin main
LOCAL="$(git rev-parse HEAD)"
REMOTE="$(git rev-parse origin/main)"
if [[ "$FORCE" -eq 0 && "$LOCAL" == "$REMOTE" && -d .next ]]; then
  echo "already at $LOCAL"
  exit 0
fi

git reset --hard origin/main
exec bash "$APP_DIR/scripts/rebuild.sh"
