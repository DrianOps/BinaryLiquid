/**
 * @file deploy_usdt_amoy.js
 * @description Deploys TestnetUSDT.sol on Polygon Amoy (Chain ID 80002), pre-funding 500,000 USDT
 * directly into the live Non-Custodial BinaryLiquidVault.sol contract, and whitelists USDT via
 * BinaryLiquidVault.setTokenSupport(usdtAddress, true).
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { ethers } from 'ethers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });

const AMOY_RPC = process.env.EVM_AMOY_RPC_URL || 'https://polygon-amoy-bor-rpc.publicnode.com';
const VAULT_ADDRESS = process.env.EVM_AMOY_VAULT_ADDRESS || '0xc830c7cB16cd05bdEd8CA9d0c73E9038ed25Aa4A';
const WATCHMAN_EVM_KEY = process.env.EVM_HOT_WALLET_KEY || '';

if (!WATCHMAN_EVM_KEY) {
  console.error('❌ Missing EVM_HOT_WALLET_KEY in ../backend/.env');
  process.exit(1);
}

async function main() {
  console.log('======================================================================');
  console.log('🚀 DEPLOYING TestnetUSDT.sol + WHITELISTING IN BinaryLiquidVault.sol');
  console.log('======================================================================\n');

  const provider = new ethers.JsonRpcProvider(AMOY_RPC);
  const wallet = new ethers.Wallet(WATCHMAN_EVM_KEY, provider);
  const startBal = await provider.getBalance(wallet.address);

  console.log(`   • Owner / Watchman Signer:    ${wallet.address}`);
  console.log(`   • Target Non-Custodial Vault: ${VAULT_ADDRESS}`);
  console.log(`   • Initial POL Balance:        ${ethers.formatEther(startBal)} POL`);

  const usdtArtifact = JSON.parse(fs.readFileSync(path.join(__dirname, 'evm/artifacts/TestnetUSDT.json'), 'utf8'));
  const vaultArtifact = JSON.parse(fs.readFileSync(path.join(__dirname, 'evm/artifacts/BinaryLiquidVault.json'), 'utf8'));

  // 1. Deploy TestnetUSDT(VAULT_ADDRESS) -> Mints 500,000 USDT into BinaryLiquidVault.sol at genesis
  const usdtFactory = new ethers.ContractFactory(usdtArtifact.abi, usdtArtifact.bytecode, wallet);
  console.log('\n   ⏳ [1/2] Broadcasting TestnetUSDT.sol deployment on Polygon Amoy...');
  const usdtContract = await usdtFactory.deploy(VAULT_ADDRESS);
  const deployTx = usdtContract.deploymentTransaction();
  const deployReceipt = await deployTx.wait(1);
  const usdtAddress = await usdtContract.getAddress();
  console.log(`   ✅ TestnetUSDT deployed at:   ${usdtAddress}`);
  console.log(`   🔗 Deploy TX Hash:            ${deployReceipt.hash} (Block ${deployReceipt.blockNumber})`);

  // 2. Whitelist TestnetUSDT inside BinaryLiquidVault.sol
  const vaultContract = new ethers.Contract(VAULT_ADDRESS, vaultArtifact.abi, wallet);
  console.log('\n   ⏳ [2/2] Calling BinaryLiquidVault.setTokenSupport(usdtAddress, true)...');
  const supportTx = await vaultContract.setTokenSupport(usdtAddress, true);
  const supportReceipt = await supportTx.wait(1);
  console.log(`   ✅ Whitelist TX Confirmed:    ${supportReceipt.hash} (Block ${supportReceipt.blockNumber})`);

  // 3. On-Chain Verification
  const usdtRead = new ethers.Contract(usdtAddress, usdtArtifact.abi, provider);
  const vaultUsdtRaw = await usdtRead.balanceOf(VAULT_ADDRESS);
  const isWhitelisted = await vaultContract.supportedTokens(usdtAddress);
  const endBal = await provider.getBalance(wallet.address);

  console.log(`\n   🔒 Vault USDT Balance:        ${ethers.formatUnits(vaultUsdtRaw, 6)} USDT`);
  console.log(`   🛡️ Vault supportedTokens:     ${isWhitelisted}`);
  console.log(`   ⛽ Remaining Watchman Gas:    ${ethers.formatEther(endBal)} POL`);

  // 4. Update contracts/deployments/testnet.json manifest
  const manifestPath = path.join(__dirname, 'deployments/testnet.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.updatedAt = new Date().toISOString();
  manifest.evmAmoy.testnetUsdtAddress = usdtAddress;
  manifest.evmAmoy.testnetUsdtDeployTxHash = deployReceipt.hash;
  manifest.evmAmoy.whitelistUsdtTxHash = supportReceipt.hash;
  manifest.evmAmoy.initialVaultLiquidityUsdt = 500000;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\n📄 Updated manifest: ${manifestPath}`);
}

main().catch(err => {
  console.error('❌ TestnetUSDT Deployment Error:', err);
  process.exit(1);
});
