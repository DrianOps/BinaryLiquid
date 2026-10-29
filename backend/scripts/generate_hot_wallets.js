import { ethers } from 'ethers';
import { Wallet, TestNetWallet } from 'mainnet-js';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import * as bip39 from 'bip39';
import { derivePath } from 'ed25519-hd-key';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');
const VAULT_DIR = path.join(ROOT_DIR, 'secure_vault');

async function generateAllWallets() {
  if (!fs.existsSync(VAULT_DIR)) {
    fs.mkdirSync(VAULT_DIR, { recursive: true, mode: 0o700 });
  }

  // ==========================================
  // 1. EVM HOT WALLET (Polygon / Ethereum / Base)
  // ==========================================
  const evmWallet = ethers.Wallet.createRandom();
  const evmData = {
    chain: 'EVM (Polygon, Ethereum, Arbitrum, Base)',
    address: evmWallet.address,
    privateKey: evmWallet.privateKey,
    mnemonic: evmWallet.mnemonic?.phrase,
    derivationPath: evmWallet.path || "m/44'/60'/0'/0/0"
  };

  // ==========================================
  // 2. BITCOIN CASH HOT WALLET (Chipnet & Mainnet)
  // ==========================================
  // Generate random mnemonic for BCH
  const bchMnemonic = bip39.generateMnemonic(128); // 12 words
  const bchTestWallet = await TestNetWallet.fromSeed(bchMnemonic);
  const bchMainWallet = await Wallet.fromSeed(bchMnemonic);

  const bchData = {
    chain: 'Bitcoin Cash (BCH Native & CashTokens)',
    chipnetAddress: bchTestWallet.cashaddr,
    mainnetAddress: bchMainWallet.cashaddr,
    wifChipnet: bchTestWallet.getSeed() ? bchTestWallet.privateKeyWif : '',
    wifMainnet: bchMainWallet.getSeed() ? bchMainWallet.privateKeyWif : '',
    mnemonic: bchMnemonic,
    derivationPath: "m/44'/145'/0'/0/0"
  };

  // ==========================================
  // 3. SOLANA HOT WALLET (SOL & SPL Tokens)
  // ==========================================
  const solMnemonic = bip39.generateMnemonic(128);
  const solSeed = await bip39.mnemonicToSeed(solMnemonic);
  const solDerived = derivePath("m/44'/501'/0'/0'", solSeed.toString('hex')).key;
  const solKeypair = await Keypair.fromSeed(solDerived);

  const solData = {
    chain: 'Solana (SOL & SPL Tokens)',
    publicKey: solKeypair.publicKey.toBase58(),
    secretKeyBase58: bs58.encode(solKeypair.secretKey),
    secretKeyArray: Array.from(solKeypair.secretKey),
    mnemonic: solMnemonic,
    derivationPath: "m/44'/501'/0'/0'"
  };

  const fullVault = {
    createdAt: new Date().toISOString(),
    securityNotice: "CONFIDENTIAL • BINARYLIQUID PROTOCOL HOT WALLETS • KEEP SECURE",
    wallets: {
      evm: evmData,
      bitcoinCash: bchData,
      solana: solData
    }
  };

  // Write JSON
  const jsonPath = path.join(VAULT_DIR, 'wallets_credentials.json');
  fs.writeFileSync(jsonPath, JSON.stringify(fullVault, null, 2), { mode: 0o600 });

  // Write clean Text Backup
  const txtPath = path.join(VAULT_DIR, 'wallets_backup.txt');
  const txtContent = `======================================================================
  BINARYLIQUID PROTOCOL - PRODUCTION HOT WALLETS CREDENTIALS
  Generated on: ${fullVault.createdAt}
======================================================================

[1] EVM HOT WALLET (POLYGON / ETHEREUM / BASE)
----------------------------------------------------------------------
Address:         ${evmData.address}
Private Key:     ${evmData.privateKey}
Mnemonic (12):   ${evmData.mnemonic}
Derivation Path: ${evmData.derivationPath}

[2] BITCOIN CASH HOT WALLET (CASHTOKENS & BCH NATIVE)
----------------------------------------------------------------------
Chipnet CashAddr: ${bchData.chipnetAddress}
Mainnet CashAddr: ${bchData.mainnetAddress}
WIF (Chipnet):    ${bchData.wifChipnet}
WIF (Mainnet):    ${bchData.wifMainnet}
Mnemonic (12):    ${bchData.mnemonic}
Derivation Path:  ${bchData.derivationPath}

[3] SOLANA HOT WALLET (SOL & SPL TOKENS)
----------------------------------------------------------------------
Public Address:   ${solData.publicKey}
Private Key (B58):${solData.secretKeyBase58}
Mnemonic (12):    ${solData.mnemonic}
Derivation Path:  ${solData.derivationPath}

======================================================================
⚠️ NEVER SHARE PRIVATE KEYS OR SEEDS. STORE IN A SAFE COLD BACKUP.
======================================================================
`;
  fs.writeFileSync(txtPath, txtContent, { mode: 0o600 });

  // Ensure .gitignore protects secure_vault
  const gitignorePath = path.join(ROOT_DIR, '.gitignore');
  let gitignoreContent = '';
  if (fs.existsSync(gitignorePath)) {
    gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
  }
  if (!gitignoreContent.includes('secure_vault')) {
    fs.appendFileSync(gitignorePath, '\n# Security Vault\nsecure_vault/\n*.key\n');
  }

  console.log('✅ Generated all hot wallets successfully!');
  console.log(`📁 Saved in: ${VAULT_DIR}`);
  console.log(`🔷 EVM Address:     ${evmData.address}`);
  console.log(`🪙 BCH Chipnet:     ${bchData.chipnetAddress}`);
  console.log(`🪙 BCH Mainnet:     ${bchData.mainnetAddress}`);
  console.log(`🟣 Solana Address:  ${solData.publicKey}`);

  return fullVault;
}

generateAllWallets().catch(console.error);
