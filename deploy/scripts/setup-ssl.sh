#!/bin/bash
#
# Obtain a Let's Encrypt cert (webroot) and switch nginx to SSL config.
# Prerequisites: DOMAIN_NAME and EMAIL_FOR_SSL in deploy/.env, DNS A record → this host, ports 80/443 open.
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
echo "   Let's Encrypt — Photo Upload App"
echo "=========================================="
echo ""

photo_require_env_file

set -a
# shellcheck disable=SC1091
source .env
set +a

if [ -z "${DOMAIN_NAME:-}" ] || [ "$DOMAIN_NAME" = "your-domain.com" ]; then
  print_error "Set DOMAIN_NAME in .env (your real hostname)."
  exit 1
fi

if [ -z "${EMAIL_FOR_SSL:-}" ] || [ "$EMAIL_FOR_SSL" = "your-email@example.com" ]; then
  print_error "Set EMAIL_FOR_SSL in .env for Let's Encrypt."
  exit 1
fi

print_info "Domain: $DOMAIN_NAME"
print_info "Email: $EMAIL_FOR_SSL"
echo ""

print_warning "Confirm:"
echo "  • DNS A record for $DOMAIN_NAME points to this server"
echo "  • Security group allows 80 and 443"
echo "  • UFW allows 80/443 (see setup-ec2.sh)"
echo "  • Stack is up: nginx serving HTTP on port 80"
echo ""
read -r -p "Continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
  print_info "Aborted."
  exit 0
fi

print_step "DNS vs public IP..."
RESOLVED=$(dig +short "$DOMAIN_NAME" | tail -1)
SERVER_IP=$(curl -fsS ifconfig.me 2>/dev/null || true)
print_info "dig $DOMAIN_NAME → ${RESOLVED:-?}"
print_info "this host public IP → ${SERVER_IP:-?}"

if [ -n "$RESOLVED" ] && [ -n "$SERVER_IP" ] && [ "$RESOLVED" != "$SERVER_IP" ]; then
  print_warning "DNS IP does not match server IP — cert may fail. Continue? (yes/no)"
  read -r -p "> " continue_anyway
  [ "$continue_anyway" = "yes" ] || exit 0
fi

print_step "certbot certonly (webroot)..."
photo_compose run --rm --entrypoint certbot certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "$EMAIL_FOR_SSL" \
  --agree-tos \
  --no-eff-email \
  -d "$DOMAIN_NAME"

print_step "Install SSL nginx config (from template; not loaded until copied to default.conf)..."
cp ./nginx/conf.d/default-ssl.conf.template ./nginx/conf.d/default.conf
sed -i.bak "s/your-domain.com/$DOMAIN_NAME/g" ./nginx/conf.d/default.conf

print_step "Reload nginx..."
photo_compose restart nginx
sleep 3

echo ""
if curl -fsS -o /dev/null --max-time 15 "https://$DOMAIN_NAME/"; then
  print_info "HTTPS OK: https://$DOMAIN_NAME/"
else
  print_warning "HTTPS check failed — see ./scripts/troubleshoot-https.sh"
fi

echo ""
photo_compose run --rm --entrypoint certbot certbot certificates 2>/dev/null || true
echo ""
print_info "Certbot sidecar renews on schedule; nginx reloads may be needed after renew."
echo ""
