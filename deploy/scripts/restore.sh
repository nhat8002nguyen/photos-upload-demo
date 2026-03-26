#!/bin/bash
#
# Restore from a backup created by backup.sh (timestamp folder name under backups/).
# Stops app/nginx, restores volumes and/or SQL dump, starts services again.
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
BACKUP_ROOT="/opt/photo-upload-app/backups"
cd "$DEPLOY_DIR"
# shellcheck source=deploy/scripts/lib.sh
source "$SCRIPT_DIR/lib.sh"

echo "=========================================="
echo "   Photo Upload App — restore"
echo "=========================================="
echo ""

photo_require_env_file

if [ -z "${1:-}" ]; then
  print_error "Usage: $0 <backup_timestamp>"
  print_info "Available:"
  ls -1 "$BACKUP_ROOT" 2>/dev/null || echo "  (none)"
  exit 1
fi

BACKUP_TIMESTAMP="$1"
BACKUP_DIR="$BACKUP_ROOT/$BACKUP_TIMESTAMP"

if [ ! -d "$BACKUP_DIR" ]; then
  print_error "Not found: $BACKUP_DIR"
  ls -1 "$BACKUP_ROOT"
  exit 1
fi

print_warning "This overwrites database and upload files. Type yes to continue."
read -r -p "> " confirm
if [ "$confirm" != "yes" ]; then
  print_info "Cancelled."
  exit 0
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

PG_USER="${POSTGRES_USER:-postgres}"
PG_DB="${POSTGRES_DB:-photoupload}"

print_info "Stopping app, nginx, and postgres..."
photo_compose stop app nginx postgres 2>/dev/null || true

print_info "Restoring PostgreSQL data volume (if present)..."
if [ -f "$BACKUP_DIR/postgres_data.tar.gz" ]; then
  docker run --rm -v "$(photo_volume_postgres)":/data -v "$BACKUP_DIR":/backup alpine \
    sh -c "rm -rf /data/* /data/.[!.]* 2>/dev/null; tar xzf /backup/postgres_data.tar.gz -C /data"
  print_info "✓ postgres volume restored"
fi

print_info "Starting postgres..."
photo_compose start postgres
sleep 5

if [ -f "$BACKUP_DIR/postgres_dump.sql.gz" ]; then
  print_info "Applying SQL dump (overwrites DB contents)..."
  gunzip -c "$BACKUP_DIR/postgres_dump.sql.gz" | photo_compose exec -T postgres psql -U "$PG_USER" -d "$PG_DB"
  print_info "✓ SQL dump applied"
fi

print_info "Restoring uploads volume..."
if [ -f "$BACKUP_DIR/uploads_data.tar.gz" ]; then
  docker run --rm -v "$(photo_volume_uploads)":/data -v "$BACKUP_DIR":/backup alpine \
    sh -c "rm -rf /data/* /data/.[!.]* 2>/dev/null; tar xzf /backup/uploads_data.tar.gz -C /data"
  print_info "✓ uploads restored"
fi

print_info "Starting app and nginx..."
photo_compose start app nginx
sleep 5

print_info "Status:"
photo_compose ps
echo ""
print_info "Restore finished."
echo ""
