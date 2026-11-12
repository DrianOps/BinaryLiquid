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
  minSwapAmount: parseFloat(process.env.MIN_SWAP_AMOUNT || '0.01'),
  maxSwapAmount: parseFloat(process.env.MAX_SWAP_AMOUNT || '50000.0'),

  // Bitcoin Cash (Mainnet & Chipnet Non-Custodial CashScript Covenants)
  bch: {
    network: process.env.BCH_NETWORK || 'mainnet',
    watchmanMainnetWif: process.env.BCH_WATCHMAN_WIF || process.env.BCH_HOT_WALLET_WIF || '',
    watchmanMainnetAddress: process.env.BCH_WATCHMAN_ADDRESS || process.env.BCH_HOT_WALLET_ADDRESS || 'bitcoincash:qpnfz2nh7uy8a2ythr2z7am5vcxr28g43qkl20t4xm',
    watchmanChipnetWif: process.env.BCH_CHIPNET_WATCHMAN_WIF || process.env.BCH_CHIPNET_HOT_WALLET_WIF || '',
    watchmanChipnetAddress: process.env.BCH_CHIPNET_WATCHMAN_ADDRESS || process.env.BCH_CHIPNET_HOT_WALLET_ADDRESS || 'bchtest:qpnfz2nh7uy8a2ythr2z7am5vcxr28g43qjdwgfzp8',
    chipnetVaultAddress: process.env.BCH_CHIPNET_VAULT_ADDRESS || 'bchtest:pvqse7cr2ptah2e34sl53r5utqwxl28fk84grvf5ufzd6n5tclme2hmkrmd9e',
    chipnetVaultTokenAddress: process.env.BCH_CHIPNET_VAULT_TOKEN_ADDRESS || 'bchtest:rvqse7cr2ptah2e34sl53r5utqwxl28fk84grvf5ufzd6n5tclme29g2zzvuj',
    mainnetVaultAddress: process.env.BCH_MAINNET_VAULT_ADDRESS || '',
    mainnetVaultTokenAddress: process.env.BCH_MAINNET_VAULT_TOKEN_ADDRESS || '',
    maxSinglePayoutUnits: 50_000_000_000n, // 50,000 PUSD (6 decimals)
    treasuryAddress: process.env.BCH_TREASURY_ADDRESS || 'bitcoincash:qqgm9rel5xlyhwt3r6n8uq9fxk5zzxrcavaal6aw8v',
    mainnetTreasuryAddress: process.env.BCH_MAINNET_TREASURY_ADDRESS || 'bitcoincash:qqgm9rel5xlyhwt3r6n8uq9fxk5zzxrcavaal6aw8v',
    tokens: {
      PUSD: {
        name: 'ParyonUSD',
        symbol: 'PUSD',
        category: process.env.PUSD_CATEGORY || 'a5c0b1f900000000000000000000000000000000000000000000000000000000',
        chipnetCategory: process.env.BCH_CHIPNET_PUSD_CATEGORY || '6b6cf8de5963d67594a4565d49a7bcf3e668a18a7328828de16bd393ac00dcad',
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

  // EVM (Polygon Mainnet & Polygon Amoy Testnet Non-Custodial Vaults)
  evm: {
    chainName: process.env.EVM_CHAIN_NAME || 'Polygon Mainnet',
    chainId: parseInt(process.env.EVM_CHAIN_ID || '137', 10),
    rpcUrl: process.env.EVM_RPC_URL || 'https://polygon-bor.publicnode.com',
    explorerUrl: process.env.EVM_EXPLORER_URL || 'https://polygonscan.com',
    amoyRpcUrl: process.env.EVM_AMOY_RPC_URL || 'https://80002.rpc.thirdweb.com',
    amoyExplorerUrl: process.env.EVM_AMOY_EXPLORER_URL || 'https://amoy.polygonscan.com',
    amoyChainId: 80002,
    watchmanPrivateKey: process.env.EVM_WATCHMAN_KEY || process.env.EVM_HOT_WALLET_KEY || '',
    watchmanAddress: process.env.EVM_WATCHMAN_ADDRESS || process.env.EVM_HOT_WALLET_ADDRESS || '0x143cA3A5116835d94573C700320B9FEdFf846eF9',
    amoyVaultAddress: process.env.EVM_AMOY_VAULT_ADDRESS || '0xc830c7cB16cd05bdEd8CA9d0c73E9038ed25Aa4A',
    mainnetVaultAddress: process.env.EVM_MAINNET_VAULT_ADDRESS || '',
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
    },
    amoyTokens: {
      USDT: {
        name: 'Tether USD (Amoy Testnet)',
        symbol: 'USDT',
        address: process.env.EVM_AMOY_USDT_ADDRESS || '0x1a29793F2a64424D09f56AD045827dF1F0Fa1A75',
        decimals: 6
      },
      USDC: {
        name: 'USD Coin (Amoy Testnet)',
        symbol: 'USDC',
        address: process.env.EVM_AMOY_USDC_ADDRESS || '0x08d7CF325c44af76602922cBA6D37E4b267CDa71',
        circleAddress: process.env.EVM_CIRCLE_AMOY_USDC_ADDRESS || '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582',
        decimals: 6
      }
    }
  },

  // Solana SVM (Mainnet-Beta & Devnet Non-Custodial Anchor PDA Vaults)
  solana: {
    cluster: process.env.SOLANA_CLUSTER || 'mainnet-beta',
    rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
    devnetRpcUrl: process.env.SOLANA_DEVNET_RPC_URL || 'https://api.devnet.solana.com',
    explorerUrl: process.env.SOLANA_EXPLORER_URL || 'https://solscan.io',
    programId: process.env.SOLANA_PROGRAM_ID || 'BLiqVau1tSo1anaCrossChainBridge111111111111',
    vaultAddress: process.env.SOLANA_VAULT_PDA_ADDRESS || '7QRhmj6TeGXbPKDD4otBJ23kTv6F2wydkuvtRQ6RRWfT',
    devnetVaultAddress: process.env.SOLANA_DEVNET_VAULT_PDA_ADDRESS || '2VGPfWsD8KU1mddNCrMsxiqK4eqgZV2cW38dLRYvHzYN',
    coldTreasuryAddress: process.env.SOLANA_COLD_TREASURY_ADDRESS || '5V41TxyvJcuXAqEsUMWuQZVy2zAWGHU4xfq6GCXribY2',
    tokens: {
      USDC: {
        name: 'USD Coin (Solana SPL)',
        symbol: 'USDC',
        mint: process.env.SOLANA_USDC_MINT || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        devnetMint: process.env.SOLANA_DEVNET_USDC_MINT || '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
        decimals: 6
      },
      USDT: {
        name: 'Tether USD (Solana SPL)',
        symbol: 'USDT',
        mint: process.env.SOLANA_USDT_MINT || 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
        devnetMint: process.env.SOLANA_DEVNET_USDT_MINT || 'CMYCfg6aEDAvQCvR7Vb2hjRScfDn76rpiBdrnzPrWVnL',
        decimals: 6
      },
      SOL: {
        name: 'Wrapped SOL (SPL)',
        symbol: 'SOL',
        mint: process.env.SOLANA_WSOL_MINT || 'So11111111111111111111111111111111111111112',
        decimals: 9
      }
    }
  },

  // Strict on-chain mode: false forces genuine Smart Contract & Covenant execution
  simulateIfNoFunds: process.env.SIMULATE_IF_NO_FUNDS === 'true',

  // Artifacts & Storage
  contractsDir: path.resolve(__dirname, '..', 'contracts'),
  dbFilePath: path.join(__dirname, 'data', 'bridge_db.json')
};
