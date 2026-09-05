#!/bin/bash
# Dump the LEVO PostgreSQL database. Run on the VPS as root (systemd timer).
set -euo pipefail

KEEP_DAYS="${KEEP_DAYS:-14}"
DEST="${DEST:-/var/backups/levo-postgres}"
STAMP="$(date -u +%Y-%m-%dT%H%M%SZ)"
FILE="${DEST}/levo-${STAMP}.dump"

install -d -m 750 "$DEST"
chown postgres:postgres "$DEST"
sudo -u postgres pg_dump -Fc --dbname=levo --file="$FILE"
chmod 640 "$FILE"

find "$DEST" -type f -name 'levo-*.dump' -mtime "+${KEEP_DAYS}" -delete

echo "Wrote ${FILE} ($(du -h "$FILE" | awk '{print $1}'))"
ls -lh "$DEST"
