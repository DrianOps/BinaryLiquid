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
const VAULT_DIR = path.join(ROOT_DIR, '..', 'secure_vault');

async function generateColdTreasuryWallet() {
  if (!fs.existsSync(VAULT_DIR)) {
    fs.mkdirSync(VAULT_DIR, { recursive: true, mode: 0o700 });
  }

  // Generate 1 unified master mnemonic phrase (12 words / 128-bit entropy)
  const masterMnemonic = bip39.generateMnemonic(128);
  const masterSeed = await bip39.mnemonicToSeed(masterMnemonic);

  // 1. EVM COLD TREASURY (Polygon / Ethereum / Base / Arbitrum / BSC)
  // Derivation: m/44'/60'/0'/0/0
  const evmWallet = ethers.Wallet.fromPhrase(masterMnemonic);
  const evmData = {
    chain: 'EVM (Polygon, Ethereum, Base, BSC, Arbitrum)',
    address: evmWallet.address,
    privateKey: evmWallet.privateKey,
    derivationPath: "m/44'/60'/0'/0/0"
  };

  // 2. BITCOIN CASH COLD TREASURY (CashTokens & BCH Native)
  // Derivation: m/44'/145'/0'/0/0
  const bchTestWallet = await TestNetWallet.fromSeed(masterMnemonic);
  const bchMainWallet = await Wallet.fromSeed(masterMnemonic);
  const bchData = {
    chain: 'Bitcoin Cash (BCH Native & CashTokens)',
    mainnetCashAddr: bchMainWallet.cashaddr,
    chipnetCashAddr: bchTestWallet.cashaddr,
    wifMainnet: bchMainWallet.privateKeyWif,
    wifChipnet: bchTestWallet.privateKeyWif,
    derivationPath: "m/44'/145'/0'/0/0"
  };

  // 3. SOLANA COLD TREASURY (SOL & SPL Tokens)
  // Derivation: m/44'/501'/0'/0'
  const solDerived = derivePath("m/44'/501'/0'/0'", masterSeed.toString('hex')).key;
  const solKeypair = await Keypair.fromSeed(solDerived);
  const solData = {
    chain: 'Solana (SOL & SPL Tokens)',
    publicKey: solKeypair.address,
    secretKeyBase58: bs58.encode(solDerived),
    derivationPath: "m/44'/501'/0'/0'"
  };

  const vaultData = {
    vaultType: "COLD_WALLET_TREASURY_MASTER",
    generatedAt: new Date().toISOString(),
    ownerNotice: "CONFIDENTIAL • BINARYLIQUID PROTOCOL OWNER COLD WALLET • REVENUE & TREASURY VAULT",
    masterMnemonic: masterMnemonic,
    treasuryAddresses: {
      bchMainnet: bchData.mainnetCashAddr,
      bchChipnet: bchData.chipnetCashAddr,
      evm: evmData.address,
      solana: solData.publicKey
    },
    wallets: {
      evm: evmData,
      bitcoinCash: bchData,
      solana: solData
    }
  };

  // Write JSON
  const jsonPath = path.join(VAULT_DIR, 'COLD_WALLET_TREASURY_MASTER.json');
  fs.writeFileSync(jsonPath, JSON.stringify(vaultData, null, 2), { mode: 0o600 });

  // Write readable text backup
  const txtPath = path.join(VAULT_DIR, 'COLD_WALLET_TREASURY_BACKUP.txt');
  const txtContent = `======================================================================
  BINARYLIQUID PROTOCOL - OWNER COLD TREASURY VAULT (BILLETERA FRÍA)
  Generated on: ${vaultData.generatedAt}
  Security: REVENUE & PROTOCOL FEE COLLECTION VAULT (KEEP OFFLINE!)
======================================================================

[🔑 MASTER SEED PHRASE - 12 PALABRAS BIP-39 UNIFICADAS]
----------------------------------------------------------------------
${masterMnemonic}
----------------------------------------------------------------------
(Con esta única semilla puedes restaurar todas tus billeteras en Paytaca,
Electron Cash, MetaMask, Rabby, Phantom o cualquier hardware wallet Ledger/Trezor).

======================================================================
[1] BITCOIN CASH COLD TREASURY (PUSD, MUSD, BLIQ & BCH NATIVO)
----------------------------------------------------------------------
Dirección Mainnet:   ${bchData.mainnetCashAddr}
Dirección Chipnet:   ${bchData.chipnetCashAddr}
WIF Mainnet:         ${bchData.wifMainnet}
WIF Chipnet:         ${bchData.wifChipnet}
Ruta de Derivación:  ${bchData.derivationPath}
-> Aquí caen las comisiones de Bitcoin Cash y CashTokens (PUSD / MUSD).

======================================================================
[2] EVM COLD TREASURY (USDC, USDT, ETH, POL, BNB)
----------------------------------------------------------------------
Dirección Pública:   ${evmData.address}
Llave Privada:       ${evmData.privateKey}
Ruta de Derivación:  ${evmData.derivationPath}
Redes Compatibles:   Polygon, Ethereum, Base, BSC, Arbitrum
-> Aquí caen las comisiones de USDC y USDT en Polygon y redes EVM.

======================================================================
[3] SOLANA COLD TREASURY (SOL & SPL TOKENS)
----------------------------------------------------------------------
Dirección Pública:   ${solData.publicKey}
Llave Privada B58:   ${solData.secretKeyBase58}
Ruta de Derivación:  ${solData.derivationPath}
-> Aquí caen las comisiones de swaps en la red Solana.
======================================================================
`;

  fs.writeFileSync(txtPath, txtContent, { mode: 0o600 });

  console.log('✅ Cold Treasury Wallet Generated Successfully!');
  console.log(`Saved JSON: ${jsonPath}`);
  console.log(`Saved Backup: ${txtPath}`);
  console.log('\n--- TREASURY PUBLIC REVENUE ADDRESSES ---');
  console.log(`BCH Mainnet:  ${bchData.mainnetCashAddr}`);
  console.log(`BCH Chipnet:  ${bchData.chipnetCashAddr}`);
  console.log(`EVM (Polygon):${evmData.address}`);
  console.log(`Solana (SOL): ${solData.publicKey}`);
  console.log(`Mnemonic:     ${masterMnemonic}`);
}

generateColdTreasuryWallet().catch(console.error);
