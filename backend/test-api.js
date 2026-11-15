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
  console.log('✅ [1/7] Cross-Network Parity (Testnet <-> Mainnet isolation) verified');

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
  console.log('✅ [2/7] Global Anti-Replay Registry verified');

  // 3. P0: Watchman CircuitBreaker USD Normalization
  const cb = new CircuitBreaker({ maxSingleTxUsd: 50000, hourlyVolumeCapUsd: 250000 });
  const okEval = cb.evaluateTransaction(10000); // $10,000 USD
  assert.strictEqual(okEval.allowed, true, 'CircuitBreaker must allow valid $10,000 USD outflow');
  assert.strictEqual(cb.rollingVolume, 10000, 'CircuitBreaker must track rollingVolume in USD');
  const blockedSingle = cb.evaluateTransaction(60000); // $60,000 USD > $50,000 single tx cap
  assert.strictEqual(blockedSingle.allowed, false, 'CircuitBreaker must reject single tx > $50,000 USD');
  console.log('✅ [3/7] Watchman Sentinel USD CircuitBreaker verified');

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
  console.log(`✅ [4/7] Compiled V2 Smart Contract Artifacts verified (EVM V2: ${bytecodeBytes} bytes)`);

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
  console.log('✅ [5/7] BCMR Anti-SSRF Protection verified');

  // 6. P2: Mandatory Refund Address on BCH Escrow Creation
  await assert.rejects(
    async () => bchService.createSwapEscrowCovenant('swap_missing_sender', 0.1, 'BCH', ''),
    /Valid BCH senderAddress .* is required to derive the non-custodial 24h refund covenant/,
    'createSwapEscrowCovenant must reject missing refundAddress'
  );
  console.log('✅ [6/7] Mandatory BCH Refund Address on Escrow Covenant verified');

  // 7. P2: Frontend Secret Hygiene (No Private Keys in localStorage)
  const identityViewSrc = fs.readFileSync(path.join(ROOT_DIR, 'frontend/src/components/IdentityView.tsx'), 'utf8');
  assert.ok(!identityViewSrc.includes("localStorage.setItem('sovereign_nostr_sk'"), 'sovereign_nostr_sk must not be stored in localStorage');
  assert.ok(!identityViewSrc.includes("localStorage.setItem('sovereign_demo_bch_sk'"), 'sovereign_demo_bch_sk must not be stored in localStorage');
  console.log('✅ [7/7] Frontend Ephemeral Key Storage Hygiene verified');

  console.log('\n🎉 ALL_SECURITY_REGRESSION_TESTS_PASSED');
  process.exit(0);
}

runSecuritySuite().catch((err) => {
  console.error('❌ Security regression suite failed:', err);
  process.exit(1);
});
