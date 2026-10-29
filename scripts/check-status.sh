#!/bin/bash
# ==============================================================================
# BinaryLiquid Bridge — Health & Status Inspector
# ==============================================================================

TARGET_HOST="${1:-http://localhost:3001}"

echo "=========================================================="
echo "🔍 BinaryLiquid Bridge Health Check"
echo "🌐 Target: $TARGET_HOST"
echo "=========================================================="

echo ""
echo "--- 1. API Status Endpoint ---"
STATUS_JSON=$(curl -s "$TARGET_HOST/api/status")
if [ -z "$STATUS_JSON" ]; then
    # Try public domain
    TARGET_HOST="https://bsprotocol.xyz"
    echo "⚠️ Local host not responding, trying https://bsprotocol.xyz..."
    STATUS_JSON=$(curl -s "$TARGET_HOST/api/status")
fi

echo "$STATUS_JSON" | grep -o '"status":"[^"]*"' || echo "Response: $STATUS_JSON"
echo ""

echo "--- 2. Hot Wallets & Liquidity ---"
echo "$STATUS_JSON" | python3 -m json.tool 2>/dev/null || echo "$STATUS_JSON"
echo ""

echo "--- 3. PM2 Process Status (if on server) ---"
if command -v pm2 &> /dev/null; then
    pm2 status
fi

echo ""
echo "--- 4. Active Listening Ports ---"
if command -v ss &> /dev/null; then
    ss -tulpn | grep -E "3001|80|443"
fi

echo "=========================================================="
