/**
 * @file deploy_testnet.js
 * @description Live On-Chain Deployment of BinaryLiquid Non-Custodial Vaults on:
 *   1. Polygon Amoy Testnet (Chain ID 80002): Deploys TestnetUSDC + BinaryLiquidVault.sol & pre-funds 500,000 USDC
 *   2. Bitcoin Cash Chipnet (Testnet4): Executes real CashToken Genesis (PUSD) & locks 500,000 PUSD in BinaryLiquidVault.cash P2SH32 Covenant
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { ethers } from 'ethers';
import { TestNetWallet, TokenSendRequest, SendRequest } from 'mainnet-js';
import { Contract as CashContract, ElectrumNetworkProvider } from 'cashscript';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });

const AMOY_RPC = process.env.EVM_AMOY_RPC_URL || 'https://polygon-amoy-bor-rpc.publicnode.com';
const CIRCLE_AMOY_USDC = '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582';
const WATCHMAN_EVM_KEY = process.env.EVM_HOT_WALLET_KEY || '';
const WATCHMAN_BCH_WIF = process.env.BCH_CHIPNET_HOT_WALLET_WIF || '';

async function main() {
  console.log('======================================================================');
  console.log('🚀 BINARYLIQUID NON-CUSTODIAL TESTNET DEPLOYMENT (AMOY + CHIPNET)');
  console.log('======================================================================\n');

  const deployDir = path.join(__dirname, 'deployments');
  fs.mkdirSync(deployDir, { recursive: true });
  const manifestPath = path.join(deployDir, 'testnet.json');

  // ---------------------------------------------------------------------------
  // PART 1: POLYGON AMOY (EVM) DEPLOYMENT
  // ---------------------------------------------------------------------------
  console.log('🔷 [1/2] Deploying Solidity Contracts to Polygon Amoy (Chain ID 80002)...');
  const provider = new ethers.JsonRpcProvider(AMOY_RPC);
  const wallet = new ethers.Wallet(WATCHMAN_EVM_KEY, provider);
  const startBal = await provider.getBalance(wallet.address);
  const startNonce = await provider.getTransactionCount(wallet.address);
  console.log(`   • Deployer / Watchman Signer: ${wallet.address}`);
  console.log(`   • Initial POL Balance:        ${ethers.formatEther(startBal)} POL (nonce: ${startNonce})`);

  const usdcArtifact = JSON.parse(fs.readFileSync(path.join(__dirname, 'evm/artifacts/TestnetUSDC.json'), 'utf8'));
  const vaultArtifact = JSON.parse(fs.readFileSync(path.join(__dirname, 'evm/artifacts/BinaryLiquidVault.json'), 'utf8'));

  // Deterministically compute BinaryLiquidVault address at startNonce + 1 so TestnetUSDC pre-funds it in 1 tx
  const predictedVaultAddress = ethers.getCreateAddress({ from: wallet.address, nonce: startNonce + 1 });
  console.log(`   • Deterministic Vault Target: ${predictedVaultAddress}`);

  const usdcFactory = new ethers.ContractFactory(usdcArtifact.abi, usdcArtifact.bytecode, wallet);
  console.log('   ⏳ Broadcasting TestnetUSDC deployment...');
  const usdcContract = await usdcFactory.deploy(predictedVaultAddress);
  const usdcDeployTx = usdcContract.deploymentTransaction();
  const usdcReceipt = await usdcDeployTx.wait(1);
  const usdcAddress = await usdcContract.getAddress();
  console.log(`   ✅ TestnetUSDC deployed at:   ${usdcAddress} (tx: ${usdcReceipt.hash})`);

  const vaultFactory = new ethers.ContractFactory(vaultArtifact.abi, vaultArtifact.bytecode, wallet);
  console.log('   ⏳ Broadcasting BinaryLiquidVault deployment...');
  const vaultContract = await vaultFactory.deploy(wallet.address, [usdcAddress, CIRCLE_AMOY_USDC]);
  const vaultDeployTx = vaultContract.deploymentTransaction();
  const vaultReceipt = await vaultDeployTx.wait(1);
  const vaultAddress = await vaultContract.getAddress();
  console.log(`   ✅ BinaryLiquidVault at:      ${vaultAddress} (tx: ${vaultReceipt.hash})`);

  // Verify on-chain state
  const usdcRead = new ethers.Contract(usdcAddress, usdcArtifact.abi, provider);
  const vaultUsdcBal = await usdcRead.balanceOf(vaultAddress);
  const endPolBal = await provider.getBalance(wallet.address);
  console.log(`   🔒 Verified Vault Liquidity:  ${ethers.formatUnits(vaultUsdcBal, 6)} USDC locked inside Smart Contract!`);
  console.log(`   ⛽ Remaining Watchman Gas:    ${ethers.formatEther(endPolBal)} POL\n`);

  // ---------------------------------------------------------------------------
  // PART 2: BITCOIN CASH CHIPNET (CASHTOKENS + CASHSCRIPT COVENANT)
  // ---------------------------------------------------------------------------
  console.log('🟢 [2/2] Deploying CashTokens Genesis & CashScript Covenant on BCH Chipnet...');
  const bchSignerWallet = await TestNetWallet.fromWIF(WATCHMAN_BCH_WIF);
  const bchSatBal = await bchSignerWallet.getBalance('sat');
  console.log(`   • Watchman Chipnet Signer:    ${bchSignerWallet.cashaddr}`);
  console.log(`   • Initial tBCH Balance:       ${bchSatBal} satoshis`);

  const bchVaultArtifact = JSON.parse(fs.readFileSync(path.join(__dirname, 'bch/artifacts/BinaryLiquidVault.json'), 'utf8'));
  const electrumProvider = new ElectrumNetworkProvider('chipnet');
  const maxSinglePayoutUnits = 50_000_000_000n; // 50,000 PUSD (6 decimals)

  const bchVault = new CashContract(
    bchVaultArtifact,
    [bchSignerWallet.publicKeyCompressed, maxSinglePayoutUnits],
    { provider: electrumProvider }
  );

  console.log(`   • Covenant P2SH32 Address:    ${bchVault.address}`);
  console.log(`   • Covenant Token Address:     ${bchVault.tokenAddress}`);

  // Ensure at least one pure BCH UTXO has vout === 0 (CashTokens consensus requirement)
  let currentUtxos = await bchSignerWallet.getUtxos();
  if (!currentUtxos.some(u => u.vout === 0 && !u.token)) {
    console.log('   ⏳ Creating vout=0 UTXO for CashToken Genesis...');
    await bchSignerWallet.send([new SendRequest({ cashaddr: bchSignerWallet.cashaddr, value: 25000n })]);
    await new Promise(r => setTimeout(r, 2500));
  }

  // 2a. Execute real CashToken Genesis on Chipnet (1,000,000.000000 PUSD)
  console.log('   ⏳ Broadcasting PUSD CashToken Genesis on BCH Chipnet (1,000,000 PUSD)...');
  const genesisSupplyUnits = 1_000_000_000_000n; // 1,000,000 PUSD * 10^6
  const genesisRes = await bchSignerWallet.tokenGenesis({
    cashaddr: bchSignerWallet.tokenaddr,
    amount: genesisSupplyUnits,
    value: 2000n
  });
  const pusdChipnetCategory = genesisRes.categories[0];
  console.log(`   ✅ PUSD CashToken Category:   ${pusdChipnetCategory} (txid: ${genesisRes.txId})`);

  await new Promise(r => setTimeout(r, 2500));

  // 2b. Lock 500,000.000000 PUSD into BinaryLiquidVault.cash P2SH32 Covenant!
  console.log('   ⏳ Locking 500,000 PUSD CashTokens into Non-Custodial BinaryLiquidVault Covenant...');
  const poolSeedUnits = 500_000_000_000n; // 500,000 PUSD * 10^6
  const lockRes = await bchSignerWallet.send([
    new TokenSendRequest({
      cashaddr: bchVault.tokenAddress,
      value: 15000n, // 15,000 sats covenant UTXO dust reserve
      amount: poolSeedUnits,
      category: pusdChipnetCategory
    })
  ]);
  console.log(`   ✅ Covenant Pool Funded TXID: ${lockRes.txId}`);

  await new Promise(r => setTimeout(r, 2500));

  // Verify Covenant UTXOs on Chipnet
  const covenantUtxos = await bchVault.getUtxos();
  const totalCovenantPusd = covenantUtxos.reduce(
    (acc, u) => acc + (u.token?.category === pusdChipnetCategory ? u.token.amount : 0n),
    0n
  );
  const endSats = await bchSignerWallet.getBalance('sat');
  console.log(`   🔒 Verified Covenant Pool:    ${Number(totalCovenantPusd) / 1e6} PUSD locked in P2SH32 Smart Contract!`);
  console.log(`   ⛽ Remaining Watchman Sats:   ${endSats} satoshis\n`);

  const manifest = {
    deployedAt: new Date().toISOString(),
    architecture: '100% Non-Custodial Smart Contract Vaults + The Watchman Sentinel',
    watchman: {
      evmSignerAddress: wallet.address,
      bchPublicKeyHex: Buffer.from(bchSignerWallet.publicKeyCompressed).toString('hex'),
      bchFeeAddress: bchSignerWallet.cashaddr
    },
    evmAmoy: {
      chainId: 80002,
      rpcUrl: AMOY_RPC,
      explorerUrl: 'https://amoy.polygonscan.com',
      vaultContractAddress: vaultAddress,
      vaultDeployTxHash: vaultReceipt.hash,
      vaultExplorerUrl: `https://amoy.polygonscan.com/address/${vaultAddress}`,
      testnetUsdcAddress: usdcAddress,
      testnetUsdcDeployTxHash: usdcReceipt.hash,
      circleAmoyUsdcAddress: CIRCLE_AMOY_USDC,
      initialVaultLiquidityUsdc: 500000
    },
    bchChipnet: {
      network: 'chipnet',
      explorerUrl: 'https://chipnet.imaginary.cash',
      vaultAddress: bchVault.address,
      vaultTokenAddress: bchVault.tokenAddress,
      vaultExplorerUrl: `https://chipnet.imaginary.cash/address/${bchVault.address}`,
      pusdCategory: pusdChipnetCategory,
      pusdGenesisTxId: genesisRes.txId,
      vaultFundingTxId: lockRes.txId,
      maxSinglePayoutUnits: maxSinglePayoutUnits.toString(),
      initialVaultLiquidityPusd: 500000
    }
  };

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`📄 Saved live deployment manifest to: ${manifestPath}`);
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Deployment failed:', err);
  process.exit(1);
});
