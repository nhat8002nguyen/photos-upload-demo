#!/bin/bash
#
# Backup PostgreSQL (logical dump + data volume tarball) and uploads volume.
# Requires the stack to be running. Backups go to /opt/photo-upload-app/backups/<timestamp>/
#

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(dirname "$SCRIPT_DIR")"
cd "$DEPLOY_DIR"
# shellcheck source=deploy/scripts/lib.sh
source "$SCRIPT_DIR/lib.sh"

BACKUP_ROOT="/opt/photo-upload-app/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$BACKUP_ROOT/$TIMESTAMP"

echo "=========================================="
echo "   Photo Upload App — backup"
echo "=========================================="
echo ""

photo_require_env_file

set -a
# shellcheck disable=SC1091
source .env
set +a

mkdir -p "$BACKUP_DIR"

if ! docker ps --filter "name=photo_upload_postgres" --format '{{.Names}}' | grep -q .; then
  print_error "PostgreSQL container is not running. Start the stack first (./scripts/deploy.sh)."
  exit 1
fi

PG_USER="${POSTGRES_USER:-postgres}"
PG_DB="${POSTGRES_DB:-photoupload}"

print_info "Backup directory: $BACKUP_DIR"

print_info "pg_dump ($PG_DB)..."
photo_compose exec -T postgres pg_dump -U "$PG_USER" "$PG_DB" | gzip >"$BACKUP_DIR/postgres_dump.sql.gz"

print_info "Archive postgres_data volume..."
docker run --rm -v "$(photo_volume_postgres)":/data -v "$BACKUP_DIR":/backup alpine tar czf /backup/postgres_data.tar.gz -C /data .

print_info "Archive uploads_data volume..."
docker run --rm -v "$(photo_volume_uploads)":/data -v "$BACKUP_DIR":/backup alpine tar czf /backup/uploads_data.tar.gz -C /data .

print_info "Copying .env (secrets) — store backups securely..."
cp .env "$BACKUP_DIR/env.backup"

BACKUP_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
print_info "Done. Size: $BACKUP_SIZE"
print_info "Path: $BACKUP_DIR"

print_info "Removing backups older than 7 days under $BACKUP_ROOT..."
find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -mtime +7 -exec rm -rf {} \; 2>/dev/null || true

echo ""
ls -lh "$BACKUP_DIR"
echo ""
print_info "Restore: ./scripts/restore.sh $TIMESTAMP"
echo ""
