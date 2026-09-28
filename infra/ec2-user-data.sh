#!/bin/bash
# MegaMart EC2 bootstrap — paste vào ô "User data" lúc Launch Instance
# (Ubuntu 24.04 LTS x86_64, t3.micro/small — khớp image amd64 build trên CI).
# Chạy 1 lần duy nhất lúc tạo máy.
# Verify sau khi SSH: docker --version && docker compose version && free -h
set -euxo pipefail

export DEBIAN_FRONTEND=noninteractive

# 1. Swap 2GB — bắt buộc vì Node (Next+Nest) dễ bị OOM kill trên máy nhỏ.
if ! swapon --show | grep -q swapfile; then
  fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# 2. Docker CE + Compose plugin
apt-get update -y
apt-get install -y ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 3. AWS CLI v2 (để EC2 tự login ECR lúc deploy)
if ! command -v aws >/dev/null 2>&1; then
  curl -sS "https://awscli.amazonaws.com/awscli-exe-linux-$(uname -m).zip" -o /tmp/awscliv2.zip
  apt-get install -y unzip
  unzip -q /tmp/awscliv2.zip -d /tmp
  /tmp/aws/install
  rm -rf /tmp/aws /tmp/awscliv2.zip
fi

# 4. User ubuntu chạy docker không cần sudo + firewall cơ bản
usermod -aG docker ubuntu || true
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable || true

# 5. Thư mục deploy + certbot webroot (nginx mount vào)
mkdir -p /home/ubuntu/megamart /var/www/certbot
chown -R ubuntu:ubuntu /home/ubuntu/megamart

systemctl enable --now docker
docker --version
docker compose version
free -h
echo "EC2 BOOTSTRAP DONE"
