#!/bin/bash
# ==============================================================================
# BinaryLiquid Bridge — SSL / HTTPS Setup via Let's Encrypt
# ==============================================================================

set -e

DOMAIN="${1:-bsprotocol.xyz}"
EMAIL="${2:-admin@$DOMAIN}"

echo "=========================================================="
echo "🔒 Let's Encrypt SSL Automated Installer"
echo "🌐 Domain: $DOMAIN"
echo "📧 Email:  $EMAIL"
echo "=========================================================="

if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run this script as root (sudo ./setup-ssl.sh)"
    exit 1
fi

echo "📦 1. Verifying Certbot installation..."
which certbot || apt-get update && apt-get install -y certbot python3-certbot-nginx

echo "⚙️ 2. Updating Nginx configuration..."
VHOST_CONF="/etc/nginx/sites-available/binaryliquid-bridge"

if [ -f "$VHOST_CONF" ]; then
    sed -i "s/server_name .*/server_name $DOMAIN www.$DOMAIN;/" "$VHOST_CONF"
    nginx -t
    systemctl reload nginx
fi

echo "📜 3. Requesting Certificate from Let's Encrypt..."
certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" --redirect

echo ""
echo "✅ SSL Certificate successfully installed and active!"
echo "🌐 Visit: https://$DOMAIN"
