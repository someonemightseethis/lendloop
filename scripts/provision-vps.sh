#!/usr/bin/env bash
# One-time (and repeatable) host setup for lendloop.ahmedrameezaka.com.
# Run on the VPS as root: bash scripts/provision-vps.sh
set -euo pipefail

APP_DIR=/var/www/lendloop.ahmedrameezaka.com
REPO=https://github.com/someonemightseethis/lendloop.git
DOMAIN=lendloop.ahmedrameezaka.com
NGINX_AVAIL=/etc/nginx/sites-available/$DOMAIN
NGINX_ENABLED=/etc/nginx/sites-enabled/$DOMAIN

if [[ ! -d "$APP_DIR/.git" ]]; then
  mkdir -p "$(dirname "$APP_DIR")"
  git clone "$REPO" "$APP_DIR"
fi

# The checkout is owned by www-data (rebuild.sh chowns it) but deploys run as
# root over SSH; trust this one path so root's git does not refuse it.
git config --system --get-all safe.directory | grep -qx "$APP_DIR" ||
  git config --system --add safe.directory "$APP_DIR"

cd "$APP_DIR"
git fetch --prune origin main
git reset --hard origin/main

if [[ ! -f /etc/lendloop.env ]]; then
  install -m 600 deploy/lendloop.env.example /etc/lendloop.env
  echo "created /etc/lendloop.env from example — fill it in before the app will build"
fi

install -m 644 deploy/lendloop.service /etc/systemd/system/lendloop.service
systemctl daemon-reload
systemctl enable lendloop

if [[ ! -f /etc/letsencrypt/live/$DOMAIN/fullchain.pem ]]; then
  install -m 644 deploy/nginx-lendloop.conf "$NGINX_AVAIL"
  ln -sfn "$NGINX_AVAIL" "$NGINX_ENABLED"
  nginx -t
  systemctl reload nginx
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email --redirect
else
  ln -sfn "$NGINX_AVAIL" "$NGINX_ENABLED"
  nginx -t
  systemctl reload nginx
fi

bash "$APP_DIR/scripts/server-update.sh" --force
echo "provision finished → https://$DOMAIN"
