#!/bin/bash
#
# After deploy overwrites nginx/conf.d/default.conf, re-apply HTTPS config if certs already exist.
# Requires DOMAIN_NAME in .env and default-ssl.conf template.
#

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

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

if [ -z "${DOMAIN_NAME:-}" ]; then
  echo -e "${RED}[ERROR]${NC} DOMAIN_NAME not set in .env"
  exit 1
fi

CERT="nginx/conf.d/default-ssl.conf.template"
if [ ! -f "$CERT" ]; then
  echo -e "${RED}[ERROR]${NC} Missing $CERT"
  exit 1
fi

if ! photo_compose exec -T nginx test -f "/etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem" 2>/dev/null; then
  echo -e "${RED}[ERROR]${NC} No cert at /etc/letsencrypt/live/$DOMAIN_NAME/"
  echo "Run: ./scripts/setup-ssl.sh"
  exit 1
fi

cp ./nginx/conf.d/default-ssl.conf.template ./nginx/conf.d/default.conf
sed -i.bak "s/your-domain.com/$DOMAIN_NAME/g" ./nginx/conf.d/default.conf

photo_compose restart nginx
echo -e "${GREEN}[OK]${NC} nginx switched to TLS for $DOMAIN_NAME"
