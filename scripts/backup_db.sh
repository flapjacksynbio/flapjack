#!/usr/bin/env bash
#
# Back up the Flapjack Postgres database from the running Docker stack.
#
# Usage:
#   ./scripts/backup_db.sh              # writes to ./backups/
#   FLAPJACK_BACKUP_DIR=/some/path ./scripts/backup_db.sh
#
# Produces a gzipped plain-SQL dump. Plain SQL is used rather than the custom
# format so the file can be inspected, diffed, and restored with psql alone,
# without needing a matching pg_restore version.
#
# Restore with ./scripts/restore_db.sh <file>.
#
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${FLAPJACK_BACKUP_DIR:-$PROJECT_DIR/backups}"
DB_USER="${SQL_USER:-guillermo}"
DB_NAME="${SQL_DATABASE:-registry}"

cd "$PROJECT_DIR"

if ! docker compose ps --status running db 2>/dev/null | grep -q db; then
  echo "error: the 'db' service is not running. Start it with: docker compose up -d db" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$BACKUP_DIR/flapjack-${DB_NAME}-${STAMP}.sql.gz"

echo "Backing up database '${DB_NAME}' ..."

# --clean --if-exists makes the dump idempotent: restoring over an existing
# database drops each object first instead of failing on duplicates.
docker compose exec -T db \
  pg_dump -U "$DB_USER" -d "$DB_NAME" --clean --if-exists \
  | gzip > "$OUT"

if [ ! -s "$OUT" ]; then
  echo "error: backup file is empty, removing it" >&2
  rm -f "$OUT"
  exit 1
fi

# Verify the gzip stream is intact and the dump reached its end marker, so a
# truncated or partial dump is caught now rather than at restore time.
if ! gzip -t "$OUT" 2>/dev/null; then
  echo "error: backup file failed gzip integrity check" >&2
  exit 1
fi
if ! gunzip -c "$OUT" | tail -5 | grep -q "PostgreSQL database dump complete"; then
  echo "error: dump does not end with the expected completion marker" >&2
  exit 1
fi

TABLES="$(gunzip -c "$OUT" | grep -c '^CREATE TABLE' || true)"
echo "  wrote:  $OUT"
echo "  size:   $(du -h "$OUT" | cut -f1)"
echo "  tables: $TABLES"
echo "  verified: gzip intact, dump complete"
