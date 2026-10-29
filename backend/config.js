import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  host: process.env.HOST || '0.0.0.0',
  network: process.env.NETWORK || 'mainnet', // 'mainnet' | 'chipnet'
  
  // Protocol Economics
  feePercentage: parseFloat(process.env.FEE_PERCENTAGE || '0.003'), // 0.3%
  minSwapAmount: parseFloat(process.env.MIN_SWAP_AMOUNT || '1.0'),
  maxSwapAmount: parseFloat(process.env.MAX_SWAP_AMOUNT || '500.0'),
  
  // Bitcoin Cash (Mainnet)
  bch: {
    network: process.env.BCH_NETWORK || 'mainnet', // 'mainnet' | 'chipnet'
    hotWalletWif: process.env.BCH_HOT_WALLET_WIF || 'L52fdbUtBbPs3goKoz8gfKWUKfyYZR6uiPajgobSNCLWDQHejhkJ',
    hotWalletAddress: process.env.BCH_HOT_WALLET_ADDRESS || 'bitcoincash:qpnfz2nh7uy8a2ythr2z7am5vcxr28g43qkl20t4xm',
    treasuryAddress: process.env.BCH_TREASURY_ADDRESS || 'bitcoincash:qqgm9rel5xlyhwt3r6n8uq9fxk5zzxrcavaal6aw8v',
    mainnetTreasuryAddress: process.env.BCH_MAINNET_TREASURY_ADDRESS || 'bitcoincash:qqgm9rel5xlyhwt3r6n8uq9fxk5zzxrcavaal6aw8v',
    tokens: {
      PUSD: {
        name: 'ParyonUSD',
        symbol: 'PUSD',
        category: process.env.PUSD_CATEGORY || 'a5c0b1f900000000000000000000000000000000000000000000000000000000',
        decimals: 6,
        isSponsor: true
      },
      MUSD: {
        name: 'MoriaUSD',
        symbol: 'MUSD',
        category: process.env.MUSD_CATEGORY || 'b7d0c2e800000000000000000000000000000000000000000000000000000000',
        decimals: 6,
        isSponsor: false
      },
      LIFT: {
        name: 'Paytaca LIFT',
        symbol: 'LIFT',
        category: process.env.LIFT_CATEGORY || '5932b2fd4915d6a75d3ec53282cd49118149a2176ee67ed68b1111ff0786f7fc',
        decimals: 2,
        isSponsor: false
      }
    }
  },

  // EVM (Polygon Mainnet)
  evm: {
    chainName: process.env.EVM_CHAIN_NAME || 'Polygon Mainnet',
    chainId: parseInt(process.env.EVM_CHAIN_ID || '137', 10),
    rpcUrl: process.env.EVM_RPC_URL || 'https://polygon-bor-rpc.publicnode.com',
    explorerUrl: process.env.EVM_EXPLORER_URL || 'https://polygonscan.com',
    hotWalletPrivateKey: process.env.EVM_HOT_WALLET_KEY || '',
    hotWalletAddress: process.env.EVM_HOT_WALLET_ADDRESS || '0x143cA3A5116835d94573C700320B9FEdFf846eF9',
    treasuryAddress: process.env.EVM_TREASURY_ADDRESS || '0x31ED1e684BD45a8724Ec11E873bA3F63fcf19f3f',
    tokens: {
      USDC: {
        name: 'USD Coin',
        symbol: 'USDC',
        address: process.env.EVM_USDC_ADDRESS || '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
        decimals: 6
      },
      USDT: {
        name: 'Tether USD',
        symbol: 'USDT',
        address: process.env.EVM_USDT_ADDRESS || '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
        decimals: 6
      }
    }
  },

  // Solana
  solana: {
    coldTreasuryAddress: process.env.SOLANA_COLD_TREASURY_ADDRESS || '7QRhmj6TeGXbPKDD4otBJ23kTv6F2wydkuvtRQ6RRWfT'
  },

  // Simulation mode: allows flawless demo even when live faucets are dry
  simulateIfNoFunds: process.env.SIMULATE_IF_NO_FUNDS !== 'false',
  
  // Storage
  dbFilePath: path.join(__dirname, 'data', 'bridge_db.json')
};
