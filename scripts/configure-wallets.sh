#!/bin/bash
# ==============================================================================
# BinaryLiquid Bridge — Hot Wallets & Protocol Configuration Utility
# ==============================================================================

ENV_FILE="./backend/.env"
if [ ! -f "$ENV_FILE" ]; then
    ENV_FILE="/var/www/binaryliquid-bridge/backend/.env"
fi

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Error: Could not locate .env file in ./backend/.env or /var/www/binaryliquid-bridge/backend/.env"
    exit 1
fi

echo "=========================================================="
echo "🪙 BinaryLiquid Hot Wallet & Protocol Configuration"
echo "📂 Target config: $ENV_FILE"
echo "=========================================================="

show_current() {
    echo ""
    echo "📋 Current Configuration:"
    echo "----------------------------------------------------------"
    grep -E "NETWORK|FEE_PERCENTAGE|BCH_NETWORK|BCH_HOT_WALLET|EVM_CHAIN|EVM_HOT_WALLET|SIMULATE" "$ENV_FILE"
    echo "----------------------------------------------------------"
    echo ""
}

show_current

echo "Select an option:"
echo "1) Update BCH Hot Wallet WIF (Private Key)"
echo "2) Update BCH Hot Wallet Public Address"
echo "3) Update EVM Hot Wallet Private Key (Hex)"
echo "4) Update EVM Hot Wallet Public Address"
echo "5) Update Bridge Fee Percentage (e.g. 0.003 = 0.3%)"
echo "6) Switch Network Mode (chipnet vs mainnet)"
echo "7) Toggle Sandbox Simulation (true / false)"
echo "8) Reload Backend PM2 Process"
echo "9) Exit"
echo ""

read -p "Option [1-9]: " opt

case $opt in
    1)
        read -p "Enter new BCH WIF Private Key: " new_wif
        sed -i "s|^BCH_HOT_WALLET_WIF=.*|BCH_HOT_WALLET_WIF=${new_wif}|" "$ENV_FILE"
        echo "✅ Updated BCH_HOT_WALLET_WIF"
        ;;
    2)
        read -p "Enter new BCH CashAddr (e.g. bchtest:qq...): " new_addr
        sed -i "s|^BCH_HOT_WALLET_ADDRESS=.*|BCH_HOT_WALLET_ADDRESS=${new_addr}|" "$ENV_FILE"
        echo "✅ Updated BCH_HOT_WALLET_ADDRESS"
        ;;
    3)
        read -p "Enter new EVM Private Key (0x...): " new_evm_key
        sed -i "s|^EVM_HOT_WALLET_KEY=.*|EVM_HOT_WALLET_KEY=${new_evm_key}|" "$ENV_FILE"
        echo "✅ Updated EVM_HOT_WALLET_KEY"
        ;;
    4)
        read -p "Enter new EVM Public Address (0x...): " new_evm_addr
        sed -i "s|^EVM_HOT_WALLET_ADDRESS=.*|EVM_HOT_WALLET_ADDRESS=${new_evm_addr}|" "$ENV_FILE"
        echo "✅ Updated EVM_HOT_WALLET_ADDRESS"
        ;;
    5)
        read -p "Enter fee fraction (e.g. 0.003 for 0.3%, 0.005 for 0.5%): " new_fee
        sed -i "s|^FEE_PERCENTAGE=.*|FEE_PERCENTAGE=${new_fee}|" "$ENV_FILE"
        echo "✅ Updated FEE_PERCENTAGE to ${new_fee}"
        ;;
    6)
        read -p "Enter network (chipnet or mainnet): " new_net
        sed -i "s|^NETWORK=.*|NETWORK=${new_net}|" "$ENV_FILE"
        sed -i "s|^BCH_NETWORK=.*|BCH_NETWORK=${new_net}|" "$ENV_FILE"
        echo "✅ Updated NETWORK to ${new_net}"
        ;;
    7)
        read -p "Enable simulated fallback if no faucet funds? (true / false): " new_sim
        sed -i "s|^SIMULATE_IF_NO_FUNDS=.*|SIMULATE_IF_NO_FUNDS=${new_sim}|" "$ENV_FILE"
        echo "✅ Updated SIMULATE_IF_NO_FUNDS to ${new_sim}"
        ;;
    8)
        echo "🔄 Reloading PM2..."
        pm2 reload all
        echo "✅ PM2 reloaded!"
        exit 0
        ;;
    *)
        echo "Exiting without changes."
        exit 0
        ;;
esac

echo ""
read -p "Do you want to reload the PM2 backend now to apply changes? (y/n): " reload_pm2
if [ "$reload_pm2" = "y" ] || [ "$reload_pm2" = "Y" ]; then
    pm2 reload all
    echo "✅ PM2 process reloaded with new settings!"
fi

echo "🎉 Done!"
