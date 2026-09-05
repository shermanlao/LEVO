#!/bin/bash
# Restore the LEVO database from a pg_dump -Fc file. Replaces live data.
# Usage: levo-pg-restore /var/backups/levo-postgres/levo-....dump
set -euo pipefail

FILE="${1:-}"
if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
  echo "Usage: sudo /usr/local/sbin/levo-pg-restore /var/backups/levo-postgres/levo-YYYY-MM-DDTHHMMSSZ.dump"
  echo "Available dumps:"
  ls -1 /var/backups/levo-postgres/levo-*.dump 2>/dev/null || true
  exit 1
fi

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root"
  exit 1
fi

echo "This replaces the live levo database with: ${FILE}"
echo "Press Enter to continue or Ctrl+C to abort"
read -r _

systemctl stop levo-api levo-web
sudo -u postgres dropdb --if-exists levo
sudo -u postgres createdb -O levo levo
sudo -u postgres pg_restore --dbname=levo --no-owner --role=levo --exit-on-error "$FILE"
systemctl start levo-api levo-web
systemctl is-active levo-api levo-web postgresql
echo "Restore complete."
