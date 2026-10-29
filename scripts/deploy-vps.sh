#!/bin/bash
# ==============================================================================
# BinaryLiquid Bridge — 1-Click Remote Deployment to VPS
# ==============================================================================

set -e

VPS_IP="${1:-68.168.218.242}"
VPS_USER="${2:-root}"
DEST_DIR="/var/www/binaryliquid-bridge"

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
echo "🗜️ Step 2: Packaging backend and frontend bundles..."
tar -czf /tmp/backend.tar.gz -C backend --exclude=node_modules .
tar -czf /tmp/frontend-dist.tar.gz -C frontend/dist .

# 3. Upload to VPS
echo ""
echo "📡 Step 3: Uploading packages to remote VPS..."
scp /tmp/backend.tar.gz "$VPS_USER@$VPS_IP:/root/"
scp /tmp/frontend-dist.tar.gz "$VPS_USER@$VPS_IP:/root/"

# 4. Extract and Reload on VPS
echo ""
echo "⚙️ Step 4: Extracting and restarting services on VPS..."
ssh "$VPS_USER@$VPS_IP" << 'EOF'
  mkdir -p /var/www/binaryliquid-bridge/backend /var/www/binaryliquid-bridge/frontend
  tar -xzf /root/backend.tar.gz -C /var/www/binaryliquid-bridge/backend
  tar -xzf /root/frontend-dist.tar.gz -C /var/www/binaryliquid-bridge/frontend
  cd /var/www/binaryliquid-bridge/backend
  npm install --omit=dev
  pm2 reload all || pm2 start ecosystem.config.cjs
  pm2 save
  systemctl reload nginx
EOF

# 5. Cleanup
rm -f /tmp/backend.tar.gz /tmp/frontend-dist.tar.gz

echo ""
echo "=========================================================="
echo "🎉 Deployment completed successfully!"
echo "🌐 Live URL: https://bsprotocol.xyz"
echo "=========================================================="
