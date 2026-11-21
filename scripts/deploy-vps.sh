#!/bin/bash
# ==============================================================================
# BinaryLiquid Bridge — 1-Click Remote Deployment to VPS
# ==============================================================================

set -e

VPS_IP="${1:-${VPS_IP:-}}"
VPS_USER="${2:-root}"
DEST_DIR="/var/www/binaryliquid-bridge"

if [ -z "$VPS_IP" ]; then
  echo "Usage: ./scripts/deploy-vps.sh <VPS_IP> [VPS_USER]"
  exit 1
fi

echo "=========================================================="
echo "🚀 1-Click VPS Deployer for BinaryLiquid Bridge"
echo "🌐 Destination: $VPS_USER@$VPS_IP:$DEST_DIR"
echo "=========================================================="

# 1. Build Frontend
echo ""
echo "📦 Step 1: Building production frontend..."
cd frontend
npm run build
cd ..

# 2. Package Bundles
echo ""
echo "🗜️ Step 2: Packaging backend, watchman, contracts, and frontend bundles..."
tar -czf /tmp/backend.tar.gz -C backend \
  --exclude=node_modules \
  --exclude='.env' \
  --exclude='.env.*' \
  --exclude='data' \
  --exclude='secure_vault' \
  --exclude='config/*.json' \
  --exclude='*credentials*' \
  --exclude='*treasury*' \
  --exclude='*vault*.json' \
  --exclude='solana-authority.json' \
  --exclude='*.pem' \
  --exclude='*.key' \
  --exclude='*.wif' \
  --exclude='*.secret.json' \
  .
tar -czf /tmp/watchman-contracts.tar.gz \
  --exclude=node_modules \
  --exclude='.env*' \
  --exclude='*.key' \
  --exclude='*.pem' \
  --exclude='*.secret.json' \
  --exclude='solana/target' \
  watchman contracts
tar -czf /tmp/frontend-dist.tar.gz -C frontend/dist .

# 3. Upload to VPS
echo ""
echo "📡 Step 3: Uploading packages to remote VPS..."
scp /tmp/backend.tar.gz "$VPS_USER@$VPS_IP:/root/"
scp /tmp/watchman-contracts.tar.gz "$VPS_USER@$VPS_IP:/root/"
scp /tmp/frontend-dist.tar.gz "$VPS_USER@$VPS_IP:/root/"

# 4. Extract and Reload on VPS
echo ""
echo "⚙️ Step 4: Extracting and restarting services on VPS..."
ssh "$VPS_USER@$VPS_IP" << 'EOF'
  mkdir -p /var/www/binaryliquid-bridge/backend /var/www/binaryliquid-bridge/frontend /var/www/binaryliquid-bridge/watchman /var/www/binaryliquid-bridge/contracts
  tar -xzf /root/backend.tar.gz -C /var/www/binaryliquid-bridge/backend
  tar -xzf /root/watchman-contracts.tar.gz -C /var/www/binaryliquid-bridge
  tar -xzf /root/frontend-dist.tar.gz -C /var/www/binaryliquid-bridge/frontend
  [ -f /var/www/binaryliquid-bridge/backend/.env ] && chmod 600 /var/www/binaryliquid-bridge/backend/.env
  cd /var/www/binaryliquid-bridge/backend
  npm install --omit=dev
  pm2 reload all || pm2 start ecosystem.config.cjs
  pm2 save
  systemctl reload nginx
EOF

# 5. Cleanup
rm -f /tmp/backend.tar.gz /tmp/watchman-contracts.tar.gz /tmp/frontend-dist.tar.gz

echo ""
echo "=========================================================="
echo "🎉 Deployment completed successfully!"
echo "🌐 Live URL: https://bliquid.xyz"
echo "=========================================================="
