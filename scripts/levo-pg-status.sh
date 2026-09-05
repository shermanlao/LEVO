#!/bin/bash
# Show LEVO Postgres dump timer and files. Run on the VPS as root.
set -euo pipefail
DEST="${DEST:-/var/backups/levo-postgres}"

echo "==> timer"
systemctl is-active levo-pg-backup.timer postgresql
systemctl list-timers levo-pg-backup.timer --no-pager
echo
echo "==> last dump job"
systemctl status levo-pg-backup.service --no-pager -n 15 || true
echo
echo "==> files in ${DEST}"
if [ -d "$DEST" ]; then
  ls -lh "$DEST"
  echo
  sudo -u postgres psql -d levo -c "SELECT COUNT(*) AS products FROM products;" 2>/dev/null || true
else
  echo "(no dump directory yet)"
fi
