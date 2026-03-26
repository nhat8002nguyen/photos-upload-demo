#!/bin/bash
#
# Install systemd unit so the stack starts on boot (docker compose up -d).
# Run with: sudo ./scripts/setup-systemd.sh
#

set -e

GREEN='\033[0;32m'
NC='\033[0m'
print_info() { echo -e "${GREEN}[INFO]${NC} $1"; }

if [ "${EUID:-0}" -ne 0 ]; then
  echo "Run with sudo"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(dirname "$SCRIPT_DIR")"
SERVICE_SRC="$DEPLOY_DIR/systemd/photo-upload-app.service"

if [ ! -f "$SERVICE_SRC" ]; then
  echo "Missing $SERVICE_SRC"
  exit 1
fi

cp "$SERVICE_SRC" /etc/systemd/system/photo-upload-app.service
systemctl daemon-reload
systemctl enable photo-upload-app.service

print_info "Installed /etc/systemd/system/photo-upload-app.service"
echo ""
echo "  sudo systemctl start photo-upload-app"
echo "  sudo systemctl status photo-upload-app"
echo ""
