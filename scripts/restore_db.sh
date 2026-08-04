#!/usr/bin/env bash
#
# Restore a Flapjack Postgres backup produced by ./scripts/backup_db.sh.
#
# Usage:
#   ./scripts/restore_db.sh backups/flapjack-registry-20260713-120000.sql.gz
#   ./scripts/restore_db.sh <file> registry_scratch     # restore to another db
#   FLAPJACK_ASSUME_YES=1 ./scripts/restore_db.sh <file>
#
# THIS OVERWRITES THE TARGET DATABASE. It prompts before doing so unless
# FLAPJACK_ASSUME_YES=1 is set.
#
# Restoring into a scratch database name is the safe way to verify that a
# backup is actually restorable without touching the live one.
#
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB_USER="${SQL_USER:-guillermo}"
DEFAULT_DB="${SQL_DATABASE:-registry}"

FILE="${1:-}"
TARGET_DB="${2:-$DEFAULT_DB}"

if [ -z "$FILE" ]; then
  echo "usage: $0 <backup-file.sql.gz> [target_db]" >&2
  exit 1
fi
if [ ! -f "$FILE" ]; then
  echo "error: no such file: $FILE" >&2
  exit 1
fi

cd "$PROJECT_DIR"

if ! docker compose ps --status running db 2>/dev/null | grep -q db; then
  echo "error: the 'db' service is not running. Start it with: docker compose up -d db" >&2
  exit 1
fi

if ! gzip -t "$FILE" 2>/dev/null; then
  echo "error: $FILE failed gzip integrity check" >&2
  exit 1
fi

if [ "${FLAPJACK_ASSUME_YES:-0}" != "1" ]; then
  echo "About to OVERWRITE database '${TARGET_DB}' with:"
  echo "  $FILE"
  echo
  echo "The api service holds open connections; stop it first for a clean restore:"
  echo "  docker compose stop api"
  echo
  read -r -p "Type 'yes' to continue: " CONFIRM
  [ "$CONFIRM" = "yes" ] || { echo "aborted"; exit 1; }
fi

# Create the target if it does not exist. Restoring into a scratch database is
# the recommended way to test a backup without risking the live one.
docker compose exec -T db psql -U "$DB_USER" -d postgres \
  -c "SELECT 1 FROM pg_database WHERE datname='${TARGET_DB}'" -t 2>/dev/null | grep -q 1 \
  || docker compose exec -T db createdb -U "$DB_USER" "$TARGET_DB"

echo "Restoring into '${TARGET_DB}' ..."
gunzip -c "$FILE" | docker compose exec -T db psql -U "$DB_USER" -d "$TARGET_DB" -v ON_ERROR_STOP=0 >/dev/null

COUNT="$(docker compose exec -T db psql -U "$DB_USER" -d "$TARGET_DB" -t \
  -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null | tr -d ' \r\n')"
echo "  restored into '${TARGET_DB}': ${COUNT} tables"
echo
echo "If you restored the live database, restart the API:"
echo "  docker compose start api"
