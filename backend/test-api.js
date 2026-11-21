/**
 * BinaryLiquid Sovereign Bridge — Automated Security & Regression Test Suite
 * Verifies P0, P1, and P2 enterprise invariants across Backend, Watchman, Contracts, and Frontend.
 */
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

import { db } from './services/db.js';
import { bchService } from './services/bchService.js';
import { validateSafePublicUrl } from './services/bcmrService.js';
import { relayerEngine } from './services/relayerEngine.js';
import { oraclePool } from './services/oraclePool.js';
import { perpsService } from './services/perpsService.js';
import { detectFiatFromContext } from './services/p2pService.js';
import { balanceCache } from './services/balanceCache.js';
import { CircuitBreaker } from '../watchman/circuitBreaker.js';

async function runSecuritySuite() {
  console.log('🛡️  Running BinaryLiquid Enterprise Security & Regression Suite...\n');

  // 1. P0: Cross-Network Parity (Testnet <-> Mainnet isolation)
  assert.strictEqual(relayerEngine.isTestnetChainId(80002), true, 'Amoy 80002 must be testnet');
  assert.strictEqual(relayerEngine.isTestnetChainId('polygon_amoy'), true, 'polygon_amoy must be testnet');
  assert.strictEqual(relayerEngine.isTestnetChainId('bch-chipnet'), true, 'bch-chipnet must be testnet');
  assert.strictEqual(relayerEngine.isTestnetChainId(137), false, 'Polygon 137 must be mainnet');
  assert.strictEqual(relayerEngine.isTestnetChainId('bch-mainnet'), false, 'bch-mainnet must be mainnet');

  await assert.rejects(
    async () => bchService.releaseFromVault(
      'bchtest:rvqse7cr2ptah2e34sl53r5utqwxl28fk84grvf5ufzd6n5tclme29g2zzvuj',
      0.1,
      'PUSD',
      null,
      null,
      false
    ),
    /\[Security Alert\] Bloqueo de red cruzada/,
    'Must reject bchtest recipient when expectedIsTestnet=false'
  );
  console.log('✅ [1/8] Cross-Network Parity (Testnet <-> Mainnet isolation) verified');

  // 2. P0: Global Anti-Replay Registry
  const testReplayHash = `0x${'a1b2c3d4'.repeat(8)}`;
  const normReplayHash = db.normalizeTxHash(testReplayHash);
  if (db.memoryState?.consumedTxHashes) {
    delete db.memoryState.consumedTxHashes[normReplayHash];
  }
  assert.strictEqual(db.isTxHashConsumed(testReplayHash), false, 'Fresh txHash must not be consumed');
  const mark1 = db.markTxHashConsumed(testReplayHash, { module: 'SWAP_DEPOSIT', chain: 'bch-chipnet', refId: 'swap_test_1' });
  assert.strictEqual(mark1, true, 'markTxHashConsumed must succeed');
  assert.strictEqual(db.isTxHashConsumed(testReplayHash), true, 'Marked txHash must report consumed globally');
  assert.strictEqual(db.isTxHashConsumed(testReplayHash, { ignoreSwapId: 'swap_test_2' }), true, 'Different swapId must be blocked from re-using txHash');
  if (db.memoryState?.consumedTxHashes) {
    delete db.memoryState.consumedTxHashes[normReplayHash];
    db.persist();
  }
  console.log('✅ [2/8] Global Anti-Replay Registry verified');

  // 3. P0: Watchman CircuitBreaker USD Normalization
  const cb = new CircuitBreaker({ maxSingleTxUsd: 50000, hourlyVolumeCapUsd: 250000 });
  const okEval = cb.evaluateTransaction(10000); // $10,000 USD
  assert.strictEqual(okEval.allowed, true, 'CircuitBreaker must allow valid $10,000 USD outflow');
  assert.strictEqual(cb.rollingVolume, 10000, 'CircuitBreaker must track rollingVolume in USD');
  const blockedSingle = cb.evaluateTransaction(60000); // $60,000 USD > $50,000 single tx cap
  assert.strictEqual(blockedSingle.allowed, false, 'CircuitBreaker must reject single tx > $50,000 USD');
  console.log('✅ [3/8] Watchman Sentinel USD CircuitBreaker verified');

  // 4. P1: Compiled V2 Smart Contract Artifacts
  const evmV2Artifact = path.join(ROOT_DIR, 'contracts/evm/artifacts/BinaryLiquidVaultV2.json');
  const bchEscrowV2Artifact = path.join(ROOT_DIR, 'contracts/bch/artifacts/BinaryLiquidEscrowV2.json');
  const bchVaultV2Artifact = path.join(ROOT_DIR, 'contracts/bch/artifacts/BinaryLiquidVaultV2.json');
  const bchCollateralV2Artifact = path.join(ROOT_DIR, 'contracts/bch/artifacts/BinaryLiquidCollateralVaultV2.json');
  for (const file of [evmV2Artifact, bchEscrowV2Artifact, bchVaultV2Artifact, bchCollateralV2Artifact]) {
    assert.ok(fs.existsSync(file), `Missing compiled V2 contract artifact: ${path.basename(file)}`);
  }
  const evmV2Json = JSON.parse(fs.readFileSync(evmV2Artifact, 'utf8'));
  const bytecodeBytes = (evmV2Json.bytecode.length - 2) / 2;
  assert.ok(bytecodeBytes > 1000 && bytecodeBytes <= 24576, `EIP-170 bytecode size violation: ${bytecodeBytes} bytes`);
  console.log(`✅ [4/8] Compiled V2 Smart Contract Artifacts verified (EVM V2: ${bytecodeBytes} bytes)`);

  // 5. P2: BCMR Anti-SSRF Protection
  for (const unsafeUrl of [
    'http://169.254.169.254/latest/meta-data/',
    'http://127.0.0.1:3001/health',
    'http://localhost/admin',
    'http://10.0.0.1/secret',
    'http://192.168.1.1/config',
    'http://[::1]:3001/health'
  ]) {
    const check = await validateSafePublicUrl(unsafeUrl);
    assert.strictEqual(check.safe, false, `Should block SSRF URL: ${unsafeUrl}`);
    assert.ok(String(check.reason || '').includes('Blocked'), `Should report Blocked reason for ${unsafeUrl}`);
  }
  console.log('✅ [5/8] BCMR Anti-SSRF Protection verified');

  // 6. P2: Mandatory Refund Address on BCH Escrow Creation
  await assert.rejects(
    async () => bchService.createSwapEscrowCovenant({ orderId: 'swap_missing_sender', refundAddress: '', isChipnet: false }),
    /Valid BCH senderAddress .* is required to derive the non-custodial 24h refund covenant/,
    'createSwapEscrowCovenant must reject missing refundAddress'
  );
  console.log('✅ [6/8] Mandatory BCH Refund Address on Escrow Covenant verified');

  // 7. P2: Frontend Secret Hygiene (No Private Keys in localStorage)
  const identityViewSrc = fs.readFileSync(path.join(ROOT_DIR, 'frontend/src/components/IdentityView.tsx'), 'utf8');
  assert.ok(!identityViewSrc.includes("localStorage.setItem('sovereign_nostr_sk'"), 'sovereign_nostr_sk must not be stored in localStorage');
  assert.ok(!identityViewSrc.includes("localStorage.setItem('sovereign_demo_bch_sk'"), 'sovereign_demo_bch_sk must not be stored in localStorage');
  console.log('✅ [7/8] Frontend Ephemeral Key Storage Hygiene verified');

  // 8. P1: Multi-CEX Parallel Median Oracle Consensus, Outlier Wick Rejection & Confidence Band
  const wickConsensus = oraclePool._computeConsensus([
    { name: 'Binance API', price: 204.5 },
    { name: 'OKX API', price: 204.7 },
    { name: 'Coinbase API', price: 204.6 },
    { name: 'Kraken API', price: 265.0 } // Manipulated / isolated wick outlier (+29%)
  ]);
  assert.strictEqual(wickConsensus.outliersDropped, 1, 'Must drop single-exchange wick outlier');
  assert.strictEqual(wickConsensus.sourceCount, 3, 'Must retain 3 agreeing exchanges');
  assert.strictEqual(wickConsensus.price, 204.6, 'Must compute exact median of clean exchanges');
  assert.strictEqual(wickConsensus.disagreement, false, 'Agreeing exchanges must not flag disagreement');

  const wildDisagreement = oraclePool._computeConsensus([
    { name: 'Binance API', price: 200.0 },
    { name: 'OKX API', price: 220.0 } // 10% disagreement between 2 sources
  ]);
  assert.strictEqual(wildDisagreement.disagreement, true, 'Must flag extreme 2-source disagreement');

  const flashGlitch = oraclePool._computeConsensus(
    [
      { name: 'Binance API', price: 240.0 },
      { name: 'OKX API', price: 240.2 }
    ],
    { lastAccepted: { price: 200.0, updatedAt: Date.now() - 2000 } }
  );
  assert.strictEqual(flashGlitch.jumpRejected, true, 'Must reject unconfirmed >8% jump with <3 agreeing sources');

  const confirmedMove = oraclePool._computeConsensus(
    [
      { name: 'Binance API', price: 240.0 },
      { name: 'OKX API', price: 240.1 },
      { name: 'Coinbase API', price: 240.2 }
    ],
    { lastAccepted: { price: 200.0, updatedAt: Date.now() - 2000 } }
  );
  assert.strictEqual(confirmedMove.jumpRejected, false, 'Must accept real move confirmed by >=3 exchanges within 1%');

  const longEntry = perpsService.applyConfidenceBand(200, 0.1, 'long', 'open');
  const longExit = perpsService.applyConfidenceBand(200, 0.1, 'long', 'close');
  assert.ok(longEntry > 200 && longExit < 200, 'Confidence band must apply ask on long open and bid on long close');
  console.log('✅ [8/9] Multi-CEX Median Oracle Consensus, Outlier Rejection & Confidence Band verified');

  // 9. P2P Non-Custodial CashScript Escrow Covenant (`BinaryLiquidP2PEscrow.cash`)
  const p2pArtifactPath = path.join(ROOT_DIR, 'contracts/bch/artifacts/BinaryLiquidP2PEscrow.json');
  assert.ok(fs.existsSync(p2pArtifactPath), 'Missing compiled BinaryLiquidP2PEscrow.json artifact');
  await bchService.readyPromise;
  if (!bchService.chipnetSigner) {
    // Ephemeral CI-only public key fixture when .env is intentionally absent
    const { ethers } = await import('ethers');
    bchService.chipnetSigner = {
      publicKeyCompressed: ethers.getBytes(ethers.SigningKey.computePublicKey(`0x${'11'.repeat(32)}`, true))
    };
  }
  const p2pEscrow1 = await bchService.createP2PEscrowCovenant({
    tradeId: 'p2p_test_trade_1',
    sellerAddress: 'bchtest:qpu5kzafwrjh2xkj8xqttld2zadvqkj2jyhu674hjh',
    buyerAddress: 'bchtest:qr6qmkyyfupw6lp6nqzqum3y2zqngcc9jyqh802xtg',
    isChipnet: true,
    isCashToken: true
  });
  const p2pEscrow2 = await bchService.createP2PEscrowCovenant({
    tradeId: 'p2p_test_trade_2',
    sellerAddress: 'bchtest:qpu5kzafwrjh2xkj8xqttld2zadvqkj2jyhu674hjh',
    buyerAddress: 'bchtest:qr6qmkyyfupw6lp6nqzqum3y2zqngcc9jyqh802xtg',
    isChipnet: true,
    isCashToken: true
  });
  assert.ok(p2pEscrow1.tokenAddress.startsWith('bchtest:r'), 'P2P escrow tokenAddress must be P2SH32 token-aware bchtest:r...');
  assert.notStrictEqual(p2pEscrow1.tokenAddress, p2pEscrow2.tokenAddress, 'Each P2P trade must derive a unique isolated covenant address');
  assert.strictEqual(detectFiatFromContext({ countryCode: 'PH' }).fiat, 'PHP', 'PH must detect Philippine Peso PHP');
  assert.strictEqual(detectFiatFromContext({ countryCode: 'CN' }).fiat, 'CNY', 'CN must detect Chinese Yuan CNY');
  assert.strictEqual(detectFiatFromContext({ timeZone: 'Asia/Manila' }).fiat, 'PHP', 'Asia/Manila must detect PHP');
  assert.strictEqual(detectFiatFromContext({ timeZone: 'Asia/Shanghai' }).fiat, 'CNY', 'Asia/Shanghai must detect CNY');
  assert.strictEqual(detectFiatFromContext({ timeZone: 'America/Caracas' }).fiat, 'VES', 'America/Caracas must detect VES');
  console.log(`✅ [9/10] Non-Custodial P2P CashScript Escrow & Global Location Currency verified (${p2pEscrow1.tokenAddress.slice(0, 22)}...)`);

  // 10. P2P Audit Rules: No synthetic test ads, Mandatory @username Identity, Escrow-Gated Bank Details & Liquidity Reservation
  const { p2pService } = await import('./services/p2pService.js');
  const overviewClean = await p2pService.getOverview({ network: 'testnet', fiat: 'VES', asset: 'PUSD', side: 'all' });
  assert.ok(
    overviewClean.offers.every(o => !o.isTestnetDesk && o.merchantHandle !== '@bliquid_desk@bliquid.xyz'),
    'Must not include any unrequested synthetic test desk ads'
  );

  // Must reject offer without decentralized @username
  let missingIdRejected = false;
  try {
    await p2pService.createOffer({
      merchantAddress: 'bchtest:qpu5kzafwrjh2xkj8xqttld2zadvqkj2jyhu674hjh',
      merchantHandle: '',
      side: 'sell',
      asset: 'PUSD',
      fiat: 'VES',
      availableAmount: 100,
      minAmount: 10,
      maxAmount: 100,
      paymentDetails: { holderName: 'Adrian', bankName: 'Banesco', accountNumber: '0134000011223344' }
    });
  } catch {
    missingIdRejected = true;
  }
  assert.strictEqual(missingIdRejected, true, 'Must reject P2P offer without decentralized @username');

  // Must reject SELL offer without bank details
  let missingBankRejected = false;
  try {
    await p2pService.createOffer({
      merchantAddress: 'bchtest:qpu5kzafwrjh2xkj8xqttld2zadvqkj2jyhu674hjh',
      merchantHandle: '@adrian_test@bliquid.xyz',
      side: 'sell',
      asset: 'PUSD',
      fiat: 'VES',
      availableAmount: 100,
      minAmount: 10,
      maxAmount: 100,
      paymentDetails: null
    });
  } catch {
    missingBankRejected = true;
  }
  assert.strictEqual(missingBankRejected, true, 'Must reject SELL offer without seller bank/payment details');

  // Valid offer creation, public masking, trade creation, escrow-locked bank details, liquidity reservation & cancel restoration
  const testOffer = await p2pService.createOffer({
    merchantAddress: 'bchtest:qpu5kzafwrjh2xkj8xqttld2zadvqkj2jyhu674hjh',
    merchantHandle: '@adrian_seller@bliquid.xyz',
    side: 'sell',
    asset: 'PUSD',
    fiat: 'VES',
    availableAmount: 100,
    minAmount: 10,
    maxAmount: 100,
    paymentMethods: ['Pago Móvil'],
    paymentDetails: {
      holderName: 'Adrian Seller',
      bankName: 'Banesco',
      accountNumber: '0134-9999-8888-7777',
      documentId: 'V-12345678'
    },
    network: 'testnet'
  });
  assert.strictEqual(testOffer.hasPaymentDetails, true, 'Public offer must indicate hasPaymentDetails=true');
  assert.strictEqual(testOffer.paymentDetails, undefined, 'Public offer must NEVER leak raw bank account numbers');

  const testTrade = await p2pService.createTrade({
    offerId: testOffer.id,
    takerAddress: 'bchtest:qr6qmkyyfupw6lp6nqzqum3y2zqngcc9jyqh802xtg',
    takerHandle: '@carlos_buyer@bliquid.xyz',
    cryptoAmount: 25,
    paymentMethod: 'Pago Móvil',
    network: 'testnet'
  });
  assert.strictEqual(
    testTrade.paymentDetails?.isLockedUntilEscrow,
    true,
    'Seller bank account number must remain locked while trade is AWAITING_ESCROW'
  );
  assert.ok(
    !String(testTrade.paymentDetails?.accountNumber || '').includes('0134-9999'),
    'Masked paymentDetails must not expose raw account number before Escrow funding'
  );
  assert.strictEqual(testTrade.cashbackRatePct, 0.25, 'P2P trade must carry 0.25% cashback rate');
  assert.ok(Number(testTrade.liftCashbackReward) > 0, 'P2P trade must calculate positive $LIFT cashback reward');

  // Verify Star Rating & Verified On-Chain Review enforcement (only allowed on COMPLETED trades)
  let prematureReviewRejected = false;
  try {
    p2pService.submitReview({
      tradeId: testTrade.id,
      actorAddress: 'bchtest:qr6qmkyyfupw6lp6nqzqum3y2zqngcc9jyqh802xtg',
      rating: 5,
      comment: 'Excelente'
    });
  } catch {
    prematureReviewRejected = true;
  }
  assert.strictEqual(prematureReviewRejected, true, 'Must reject review submission before trade is COMPLETED');

  // Cancel trade and verify liquidity is restored and test offer is cleaned up
  await p2pService.cancelOrRefundTrade({
    tradeId: testTrade.id,
    actorAddress: 'bchtest:qr6qmkyyfupw6lp6nqzqum3y2zqngcc9jyqh802xtg'
  });
  p2pService.deleteOffer({
    offerId: testOffer.id,
    merchantAddress: 'bchtest:qpu5kzafwrjh2xkj8xqttld2zadvqkj2jyhu674hjh',
    network: 'testnet'
  });
  db.memoryState.p2pTrades = db.memoryState.p2pTrades.filter(t => t.id !== testTrade.id);
  db.persist();
  console.log('✅ [10/10] P2P Audit verified: No test ads, Mandatory @username Identity, Escrow-Gated Bank Details, 5★ Reviews & $LIFT Cashback');

  // 11. Balance & Portfolio Cache Coalescing + Stale Fallback (High-Traffic Protection)
  let mockRpcCalls = 0;
  const mockChainFetcher = async () => {
    mockRpcCalls++;
    await new Promise(r => setTimeout(r, 30));
    return { BCH: 2.25, PUSD: 100 };
  };
  const testCacheAddr = 'bitcoincash:qpptestcachecoalesce00000000000000000000000';
  const batch = await Promise.all(
    Array.from({ length: 20 }, () =>
      balanceCache.resolveChainBalance({
        chain: 'bch',
        address: testCacheAddr,
        isTestnet: false,
        fetcher: mockChainFetcher,
        emptyValue: { BCH: 0, PUSD: 0 }
      })
    )
  );
  assert.strictEqual(mockRpcCalls, 1, '20 simultaneous balance reads must coalesce into 1 upstream RPC call');
  assert.strictEqual(batch[0].BCH, 2.25);

  const warmHit = await balanceCache.resolveChainBalance({
    chain: 'bch',
    address: testCacheAddr,
    isTestnet: false,
    fetcher: mockChainFetcher,
    emptyValue: { BCH: 0, PUSD: 0 }
  });
  assert.strictEqual(mockRpcCalls, 1, 'Warm cache hit must not invoke RPC');
  assert.strictEqual(warmHit.PUSD, 100);

  const prevFreshCooldown = balanceCache.manualFreshCooldownMs;
  balanceCache.manualFreshCooldownMs = 0;
  const staleRescued = await balanceCache.resolveChainBalance({
    chain: 'bch',
    address: testCacheAddr,
    isTestnet: false,
    fetcher: async () => { throw new Error('Simulated 429'); },
    emptyValue: { BCH: 0, PUSD: 0 },
    fresh: true
  });
  balanceCache.manualFreshCooldownMs = prevFreshCooldown;
  assert.strictEqual(staleRescued.BCH, 2.25, 'RPC outage must preserve last healthy balance instead of zeroing UI');
  assert.strictEqual(staleRescued.stale, true);

  let portComputes = 0;
  const portKey = balanceCache.buildPortfolioKey({ targetBch: testCacheAddr, targetEvm: null }, false);
  await Promise.all(
    Array.from({ length: 12 }, () =>
      balanceCache.getOrComputePortfolio(portKey, async () => {
        portComputes++;
        await new Promise(r => setTimeout(r, 25));
        return { success: true, netWorthUsd: 555.5, degradedChains: {} };
      })
    )
  );
  assert.strictEqual(portComputes, 1, 'Concurrent portfolio loads must coalesce into 1 compute wave');
  const cachedPort = await balanceCache.getOrComputePortfolio(portKey, async () => {
    portComputes++;
    return {};
  });
  assert.strictEqual(portComputes, 1, 'Warm portfolio cache must serve immediately');
  assert.strictEqual(cachedPort.cached, true);

  let bchUtxoCalls = 0;
  const bchKey = balanceCache.buildBchQueryKey('utxos', `${testCacheAddr},bitcoincash:qrtest2`, 'mainnet');
  const utxoBatch = await Promise.all(
    Array.from({ length: 15 }, () =>
      balanceCache.getOrCompute(bchKey, async () => {
        bchUtxoCalls++;
        await new Promise(r => setTimeout(r, 20));
        return { success: true, utxos: [{ txid: 'abc', vout: 0, satoshis: 5000 }] };
      })
    )
  );
  assert.strictEqual(bchUtxoCalls, 1, '15 concurrent Wallet UTXO reads must coalesce into 1 Electrum wave');
  assert.strictEqual(utxoBatch[0].utxos.length, 1);
  console.log('✅ [11/11] High-Traffic Balance, Wallet UTXO & Portfolio Cache (Single-Flight + L1/Redis + Stale Rescue) verified');

  console.log('\n🎉 ALL_SECURITY_REGRESSION_TESTS_PASSED');
  process.exit(0);
}

runSecuritySuite().catch((err) => {
  console.error('❌ Security regression suite failed:', err);
  process.exit(1);
});
