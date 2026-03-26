#!/bin/bash
#
# One-shot status: compose ps, docker stats, quick HTTP/DB checks, recent logs.
#

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(dirname "$SCRIPT_DIR")"
cd "$DEPLOY_DIR"
# shellcheck source=deploy/scripts/lib.sh
source "$SCRIPT_DIR/lib.sh"

photo_require_env_file

clear 2>/dev/null || true
echo "=========================================="
echo "   Photo Upload App — monitor"
echo "=========================================="
echo ""

echo -e "${BLUE}=== docker compose ps ===${NC}"
photo_compose ps
echo ""

echo -e "${BLUE}=== docker stats (one sample) ===${NC}"
IDS=$(docker ps --filter "name=photo_upload_" -q)
if [ -n "$IDS" ]; then
  docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" $IDS
else
  echo "(no matching containers)"
fi
echo ""

echo -e "${BLUE}=== Checks ===${NC}"
if curl -fsS -o /dev/null --max-time 5 http://127.0.0.1/; then
  echo -e "${GREEN}✓${NC} HTTP / (via nginx)"
else
  echo -e "${RED}✗${NC} HTTP / failed"
fi

if docker exec photo_upload_postgres pg_isready -U postgres &>/dev/null; then
  echo -e "${GREEN}✓${NC} PostgreSQL"
else
  echo -e "${RED}✗${NC} PostgreSQL"
fi
echo ""

echo -e "${BLUE}=== app logs (last 15 lines) ===${NC}"
photo_compose logs --tail=15 app 2>/dev/null || true
echo ""

echo -e "${BLUE}=== nginx access (last 5) ===${NC}"
docker exec photo_upload_nginx tail -n 5 /var/log/nginx/access.log 2>/dev/null || echo "(no log)"
echo ""

echo "Useful:"
echo "  photo_compose logs -f app"
echo "  photo_compose logs -f nginx"
echo "=========================================="
