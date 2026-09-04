#!/bin/bash
# Pull LEVO from GitHub and restart production services.
# Run on the VPS as root: /usr/local/sbin/levo-deploy
set -euo pipefail

APP=/var/www/levo
BRANCH="${1:-main}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root: sudo /usr/local/sbin/levo-deploy"
  exit 1
fi

export GIT_SSH_COMMAND="ssh -i ${APP}/.ssh/github_deploy -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new"

cd "$APP"
git config --global --add safe.directory "$APP" >/dev/null 2>&1 || true
sudo -u levo git config --global --add safe.directory "$APP" >/dev/null 2>&1 || true

echo "==> fetching ${BRANCH}"
sudo -u levo -H git fetch origin "$BRANCH"
sudo -u levo -H git checkout "$BRANCH"
sudo -u levo -H git reset --hard "origin/${BRANCH}"

echo "==> installing and building API"
cd "$APP/backend-server"
sudo -u levo npm install
sudo -u levo npx tsc

echo "==> installing and building site"
cd "$APP/frontend"
sudo -u levo npm install
sudo -u levo npm run build

echo "==> restarting services"
systemctl restart levo-api
systemctl restart levo-web
systemctl is-active levo-api levo-web nginx postgresql

echo "==> deploy complete"
sudo -u levo -H git -C "$APP" log -1 --oneline
