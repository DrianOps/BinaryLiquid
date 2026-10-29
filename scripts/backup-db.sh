#!/bin/bash
# ==============================================================================
# BinaryLiquid Bridge — Database & State Backup Utility
# ==============================================================================

BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_FILE="./backend/data/bridge_db.json"

if [ ! -f "$DB_FILE" ]; then
    DB_FILE="/var/www/binaryliquid-bridge/backend/data/bridge_db.json"
fi

if [ ! -f "$DB_FILE" ]; then
    echo "❌ Error: bridge_db.json not found."
    exit 1
fi

mkdir -p "$BACKUP_DIR"
BACKUP_TARGET="$BACKUP_DIR/bridge_db_backup_${TIMESTAMP}.json"

cp "$DB_FILE" "$BACKUP_TARGET"
echo "✅ Database successfully backed up to:"
echo "   $BACKUP_TARGET"
ls -lh "$BACKUP_TARGET"
