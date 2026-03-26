#!/bin/bash
#
# Production deployment: build images and start Postgres, Next.js app, nginx, certbot.
# Run on the EC2 host from the repository (e.g. after git pull). Cwd must be deploy/.
#

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_step() { echo -e "${BLUE}[STEP]${NC} $1"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(dirname "$SCRIPT_DIR")"
cd "$DEPLOY_DIR"
# shellcheck source=deploy/scripts/lib.sh
source "$SCRIPT_DIR/lib.sh"

echo "=========================================="
echo "   Photo Upload App — production deploy"
echo "=========================================="
echo ""

photo_require_env_file

set -a
# shellcheck disable=SC1091
source .env
set +a

if [ -z "${POSTGRES_PASSWORD:-}" ] || [ -z "${AUTH_SECRET:-}" ] || [ -z "${DATABASE_URL:-}" ]; then
  print_error "POSTGRES_PASSWORD, AUTH_SECRET, and DATABASE_URL must be set in .env"
  exit 1
fi

if ! command -v docker &>/dev/null; then
  print_error "Docker is not installed. Run ./scripts/setup-ec2.sh first."
  exit 1
fi

if ! docker compose version &>/dev/null; then
  print_error "Docker Compose plugin is not available. Run ./scripts/setup-ec2.sh first."
  exit 1
fi

print_step "1/7 — Optional backup of existing volumes..."
if docker ps -q --filter "name=photo_upload_" | grep -q .; then
  BACKUP_DIR="/opt/photo-upload-app/backups/$(date +%Y%m%d_%H%M%S)"
  mkdir -p "$BACKUP_DIR"
  PG_VOL="$(photo_volume_postgres)"
  UP_VOL="$(photo_volume_uploads)"
  if docker volume inspect "$PG_VOL" &>/dev/null; then
    print_info "Backing up volume $PG_VOL..."
    docker run --rm -v "$PG_VOL":/data -v "$BACKUP_DIR":/backup alpine tar czf /backup/postgres_data.tar.gz -C /data . || true
  fi
  if docker volume inspect "$UP_VOL" &>/dev/null; then
    print_info "Backing up volume $UP_VOL..."
    docker run --rm -v "$UP_VOL":/data -v "$BACKUP_DIR":/backup alpine tar czf /backup/uploads_data.tar.gz -C /data . || true
  fi
  print_info "Backup directory: $BACKUP_DIR"
else
  print_info "No existing photo_upload_* containers; skipping volume backup."
fi

print_step "2/7 — Stopping stack..."
photo_compose down || true

print_step "3/7 — Pruning unused Docker data (keeps volumes)..."
docker system prune -f --volumes=false || true

print_step "4/7 — Building images..."
photo_compose build --no-cache

print_step "5/7 — Starting services..."
photo_compose up -d

print_step "6/7 — Waiting for containers to become healthy..."
sleep 15

print_step "7/7 — Verifying containers..."
container_ok() {
  local name="$1"
  if docker ps --filter "name=$name" --format "{{.Status}}" | head -1 | grep -q "^Up"; then
    print_info "✓ $name is up"
  else
    print_error "✗ $name is not running"
    return 1
  fi
}

container_ok "photo_upload_nginx" || true
container_ok "photo_upload_app" || true
container_ok "photo_upload_postgres" || true

echo ""
print_info "HTTP check (via nginx → Next.js)..."
sleep 3
if curl -fsS -o /dev/null --max-time 15 http://127.0.0.1/api/health; then
  print_info "✓ http://127.0.0.1/api/health responded"
else
  print_warning "Health URL check failed — services may still be warming up. Check: photo_compose logs -f app"
fi

echo ""
echo "=========================================="
print_info "Deploy finished."
echo "=========================================="
echo ""
photo_compose ps
echo ""
print_info "Logs: photo_compose logs -f"
print_info "Or:   docker compose --env-file .env -f docker-compose.prod.yml logs -f app"
echo ""

if [ -z "${DOMAIN_NAME:-}" ] || [ "$DOMAIN_NAME" = "your-domain.com" ]; then
  print_warning "TLS not configured. Set DOMAIN_NAME and EMAIL_FOR_SSL in .env, then run ./scripts/setup-ssl.sh"
  print_info "HTTP access: http://$(curl -fsS ifconfig.me 2>/dev/null || echo 'YOUR_PUBLIC_IP')"
else
  print_info "Domain configured as: $DOMAIN_NAME — use https://$DOMAIN_NAME after SSL"
fi
echo ""
