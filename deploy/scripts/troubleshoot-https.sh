#!/bin/bash
#
# Diagnose why HTTPS hangs or fails (UFW, security group, nginx listening on 443).
#

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_ok() { echo -e "${GREEN}[OK]${NC} $1"; }
print_fail() { echo -e "${RED}[FAIL]${NC} $1"; }
print_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
print_step() { echo -e "${BLUE}[CHECK]${NC} $1"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(dirname "$SCRIPT_DIR")"
cd "$DEPLOY_DIR"
# shellcheck source=deploy/scripts/lib.sh
source "$SCRIPT_DIR/lib.sh"

photo_require_env_file

set -a
# shellcheck disable=SC1091
source .env
set +a

DOMAIN="${DOMAIN_NAME:-localhost}"

echo "=========================================="
echo "   HTTPS troubleshooting"
echo "=========================================="
echo ""

print_step "UFW (443 should be ALLOW)"
if command -v ufw >/dev/null 2>&1; then
  if sudo ufw status 2>/dev/null | grep -qE "443.*ALLOW"; then
    print_ok "UFW allows 443"
  else
    print_fail "Run: sudo ufw allow 443/tcp && sudo ufw reload"
  fi
else
  print_warn "ufw not installed"
fi

print_step "Nginx container"
if photo_compose ps nginx 2>/dev/null | grep -q "Up"; then
  print_ok "nginx running"
  if photo_compose exec -T nginx ss -tlnp 2>/dev/null | grep -q ":443"; then
    print_ok "nginx listening on 443 inside container"
  else
    print_fail "nginx may not have listen 443 — check ssl config (setup-ssl.sh)"
  fi
else
  print_fail "nginx not running"
fi

print_step "Host port 443 published"
if ss -tlnp 2>/dev/null | grep -q ":443 " || netstat -tlnp 2>/dev/null | grep -q ":443 "; then
  print_ok "Something listens on :443 on host"
else
  print_fail "Nothing on host :443 — check docker compose ports mapping"
fi

print_step "Local HTTPS"
if curl -fkfsS -o /dev/null --max-time 5 "https://127.0.0.1/api/health" 2>/dev/null; then
  print_ok "https://127.0.0.1/api/health responds (cert may be wrong for browser — OK for probe)"
else
  print_fail "Local HTTPS failed — TLS not configured or nginx error"
fi

echo ""
echo "If local HTTPS works but external curl hangs:"
echo "  → AWS EC2 → Security Groups → Inbound: HTTPS 443 from 0.0.0.0/0 (or your IP)"
echo "  Domain: $DOMAIN"
echo ""
