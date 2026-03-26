#!/bin/bash
#
# One-time setup for Ubuntu EC2: Docker, Compose, UFW, /opt/photo-upload-app, sysctl, logrotate.
# Run with: sudo ./scripts/setup-ec2.sh
#

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

if [ "${EUID:-0}" -ne 0 ]; then
  print_error "Run as root: sudo $0"
  exit 1
fi

echo "=========================================="
echo "Photo Upload App — EC2 bootstrap (Ubuntu)"
echo "=========================================="

APP_USER="${SUDO_USER:-ubuntu}"
APP_ROOT="/opt/photo-upload-app"

print_info "Updating packages..."
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get upgrade -y

print_info "Installing packages..."
apt-get install -y \
  apt-transport-https \
  ca-certificates \
  curl \
  gnupg \
  lsb-release \
  software-properties-common \
  ufw \
  git \
  htop \
  vim

print_info "Installing Docker Engine..."
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" >/etc/apt/sources.list.d/docker.list

apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

systemctl start docker
systemctl enable docker

print_info "Configuring UFW..."
ufw --force enable
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw status

print_info "Creating $APP_ROOT..."
mkdir -p "$APP_ROOT/backups"
chown -R "$APP_USER:$APP_USER" "$APP_ROOT"

print_info "Docker log rotation..."
cat >/etc/docker/daemon.json <<'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF
systemctl restart docker

print_info "Unattended security updates..."
DEBIAN_FRONTEND=noninteractive apt-get install -y unattended-upgrades
dpkg-reconfigure -f noninteractive -plow unattended-upgrades || true

print_info "File limits and sysctl..."
grep -q 'nofile 65536' /etc/security/limits.conf 2>/dev/null || cat >>/etc/security/limits.conf <<'EOF'
* soft nofile 65536
* hard nofile 65536
EOF

grep -q 'somaxconn = 65536' /etc/sysctl.conf 2>/dev/null || cat >>/etc/sysctl.conf <<'EOF'
net.core.somaxconn = 65536
net.ipv4.tcp_max_syn_backlog = 8192
net.ipv4.ip_local_port_range = 1024 65535
EOF
sysctl -p 2>/dev/null || true

print_info "Docker group for $APP_USER..."
groupadd -f docker
usermod -aG docker "$APP_USER" || true

print_info "Logrotate stub for app logs under $APP_ROOT..."
cat >/etc/logrotate.d/photo-upload-app <<EOF
$APP_ROOT/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 $APP_USER $APP_USER
    sharedscripts
}
EOF

echo ""
echo "=========================================="
print_info "EC2 setup complete."
echo "=========================================="
echo ""
print_info "Next:"
echo "  1. Deploy code to $APP_ROOT (git clone or rsync)"
echo "  2. cd $APP_ROOT/deploy && cp env.example .env && edit .env"
echo "  3. ./scripts/deploy.sh"
echo "  4. Optional: sudo ./scripts/setup-systemd.sh"
echo ""
print_warning "Log out and back in (or: newgrp docker) so Docker works without sudo."
echo ""
