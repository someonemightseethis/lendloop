#!/usr/bin/env bash
# Push is separate. This copies the provision script and runs it on the VPS.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST="${DEPLOY_HOST:-hostingervps-rrr}"

echo "==> provision $HOST"
scp "$ROOT/scripts/provision-vps.sh" "$HOST:/tmp/provision-lendloop.sh"
ssh "$HOST" "bash /tmp/provision-lendloop.sh"
echo "==> done → https://lendloop.ahmedrameezaka.com"
