#!/bin/bash
# Pull LEVO from GitHub and restart production services.
# Run on the VPS as root: /usr/local/sbin/levo-deploy [branch-or-sha]
set -euo pipefail

APP=/var/www/levo
BACKGROUND=0
if [ "${1:-}" = "--background" ]; then
  BACKGROUND=1
  shift
fi
TARGET="${1:-main}"
STATUS_FILE="${TMPDIR:-/tmp}/levo-deploy-status.json"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root: sudo /usr/local/sbin/levo-deploy"
  exit 1
fi

if ! [[ "$TARGET" =~ ^[0-9A-Za-z][0-9A-Za-z._/-]*$ ]] || [[ "$TARGET" == *..* ]]; then
  echo "Invalid git ref: ${TARGET}"
  exit 1
fi

write_status() {
  local status="$1"
  local message="${2:-}"
  cat > "$STATUS_FILE" <<EOF
{"status":"${status}","ref":"${TARGET}","updatedAt":"$(date -u +%Y-%m-%dT%H:%M:%SZ)","message":"${message}"}
EOF
  chmod 644 "$STATUS_FILE" 2>/dev/null || true
}

write_status "running" "starting"

# Admin-page deploys must leave the levo-api cgroup, or restarting the API kills the job.
# SSH / Cursor deploys omit --background and keep running in the foreground.
if [ "$BACKGROUND" = "1" ] && [ "${LEVO_DEPLOY_SCOPED:-}" != "1" ] && command -v systemd-run >/dev/null 2>&1; then
  systemctl reset-failed levo-admin-deploy 2>/dev/null || true
  exec systemd-run --quiet --collect --no-block \
    --unit=levo-admin-deploy \
    --property=Environment=LEVO_DEPLOY_SCOPED=1 \
    /usr/local/sbin/levo-deploy "$TARGET"
fi

export GIT_SSH_COMMAND="ssh -i ${APP}/.ssh/github_deploy -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new"

cd "$APP"
git config --global --add safe.directory "$APP" >/dev/null 2>&1 || true
sudo -u levo git config --global --add safe.directory "$APP" >/dev/null 2>&1 || true

if [[ "$TARGET" =~ ^[0-9a-fA-F]{7,40}$ ]]; then
  echo "==> fetching and checking out ${TARGET}"
  sudo -u levo -H git fetch origin --prune
  sudo -u levo -H git checkout -f "$TARGET"
  sudo -u levo -H git reset --hard "$TARGET"
else
  echo "==> fetching ${TARGET}"
  sudo -u levo -H git fetch origin "$TARGET"
  sudo -u levo -H git checkout "$TARGET"
  sudo -u levo -H git reset --hard "origin/${TARGET}"
fi

if [ -f "$APP/scripts/levo-deploy.sh" ]; then
  install -m 755 "$APP/scripts/levo-deploy.sh" /usr/local/sbin/levo-deploy
fi
if [ -f "$APP/scripts/levo-deploy-sudoers" ]; then
  install -m 440 "$APP/scripts/levo-deploy-sudoers" /etc/sudoers.d/90-levo-deploy
fi

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
write_status "ok" "complete"
