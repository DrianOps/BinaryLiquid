import { config } from '../config.js';
import { db } from './db.js';
import { bchService } from './bchService.js';
import { evmService } from './evmService.js';
import { solanaService } from './solanaService.js';
import { ltcService } from './ltcService.js';
import { tonService } from './tonService.js';
import { oraclePool } from './oraclePool.js';
import { poolService } from './poolService.js';
import { perpsService } from './perpsService.js';
import { watchmanSentinel } from './watchmanClient.js';

class RelayerEngine {
  constructor() {
    this.timer = null;
    this.isProcessing = false;
    this.activeSwapLocks = new Map();
    this.lastPerpsTriggerCheck = 0;
  }

  start(intervalMs = 4000) {
    if (this.timer) clearInterval(this.timer);
    console.log(`[Watchman Relayer] 🛡️ Non-Custodial Settlement Monitor active (polling every ${intervalMs}ms)`);
    this.timer = setInterval(() => this.tick(), intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  isTestnetChainId(chainStr) {
    const c = String(chainStr || '').toLowerCase().trim();
    if (!c) return false;
    if (c.includes('mainnet')) return false;
    return (
      c.includes('testnet') ||
      c.includes('chipnet') ||
      c.includes('amoy') ||
      c.includes('devnet') ||
      c.includes('sepolia') ||
      c === '80002' ||
      c === '97' ||
      c === '11155111' ||
      c === 'solana_devnet' ||
      c === 'ltc_testnet' ||
      c === 'litecoin_testnet' ||
      c === 'bsc_testnet' ||
      c === 'ton_testnet'
    );
  }

  async tick() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const pending = db.getPendingSwaps();
      const cutoffMs = Date.now() - 24 * 60 * 60 * 1000;
      const retryTxCutoffMs = Date.now() - 30 * 60 * 1000;

      for (const swap of pending) {
        const createdMs = swap.createdAt ? new Date(swap.createdAt).getTime() : 0;

        if (swap.depositTxHash && (swap.status === 'PENDING_DEPOSIT' || swap.status === 'DEPOSIT_DETECTED')) {
          if (createdMs >= retryTxCutoffMs) {
            await this.executeRelay(swap.id);
          }
          continue;
        }

        // Autonomous UTXO detection on isolated per-swap P2SH32 Covenants (`BinaryLiquidEscrow.cash`)
        const fromChainLower = String(swap.fromChain || '').toLowerCase();
        const toChainLower = String(swap.toChain || '').toLowerCase();
        const swapNetLower = String(swap.network || '').toLowerCase();
        const isOriginTestnet = this.isTestnetChainId(fromChainLower) || swapNetLower === 'testnet';
        const isDestTestnet = this.isTestnetChainId(toChainLower) || swapNetLower === 'testnet';
        if (this.isTestnetChainId(fromChainLower) !== this.isTestnetChainId(toChainLower)) {
          db.updateSwap(swap.id, {
            status: 'FAILED',
            error: 'Security Alert: Cross-network Testnet/Mainnet mismatch blocked.'
          });
          continue;
        }
        const isTestnetSwap = isOriginTestnet && isDestTestnet;
        const isBchOrigin = fromChainLower.includes('bch') || fromChainLower.includes('chipnet');
        const isLtcOrigin = ltcService.isLtcChain(swap.fromChain);

        if (
          !swap.depositTxHash &&
          swap.status === 'PENDING_DEPOSIT' &&
          isLtcOrigin &&
          swap.depositAddress &&
          createdMs >= cutoffMs
        ) {
          const check = await ltcService.verifyDeposit(
            swap.depositAddress,
            swap.fromAmount,
            isTestnetSwap,
            swap.id
          );
          if (check.verified && check.txHash) {
            if (db.isTxHashConsumed(check.txHash, { ignoreSwapId: swap.id })) {
              console.warn(`[Watchman Relayer] Duplicate deposit txHash ${check.txHash} ignored for ${swap.id}`);
              continue;
            }
            db.updateSwap(swap.id, {
              depositTxHash: check.txHash,
              status: 'DEPOSIT_DETECTED',
              error: null
            });
            await this.executeRelay(swap.id);
          }
        }

        if (
          !swap.depositTxHash &&
          swap.status === 'PENDING_DEPOSIT' &&
          isBchOrigin &&
          (swap.contractName === 'BinaryLiquidEscrow.cash' || swap.contractName === 'BinaryLiquidEscrowV2.cash') &&
          swap.depositAddress &&
          createdMs >= cutoffMs
        ) {
          const check = await bchService.verifyDeposit(
            null,
            swap.fromAmount,
            swap.fromToken,
            swap.depositAddress
          );
          if (check.verified && check.txHash) {
            if (db.isTxHashConsumed(check.txHash, { ignoreSwapId: swap.id })) {
              console.warn(`[Watchman Relayer] Duplicate deposit txHash ${check.txHash} ignored for ${swap.id}`);
              continue;
            }
            db.updateSwap(swap.id, {
              depositTxHash: check.txHash,
              status: 'DEPOSIT_DETECTED',
              error: null
            });
            await this.executeRelay(swap.id);
          }
        }
      }

      await this.checkLimitOrders();

      const nowMs = Date.now();
      if (nowMs - this.lastPerpsTriggerCheck >= 10000) {
        this.lastPerpsTriggerCheck = nowMs;
        await perpsService.processPositionTriggers().catch((err) => {
          console.warn('[Watchman Relayer] Perps trigger scan warning:', err.message);
        });
      }
    } catch (err) {
      console.error('[Watchman Relayer] Polling cycle error:', err.message);
    } finally {
      this.isProcessing = false;
    }
  }

  async checkLimitOrders() {
    const openOrders = db.listLimitOrders({ status: 'OPEN' });
    if (openOrders.length === 0) return;

    const cutoffMs = Date.now() - 24 * 60 * 60 * 1000;

    for (const order of openOrders) {
      try {
        const isBchOrigin =
          String(order.fromChain || '').toLowerCase().includes('bch') ||
          String(order.fromChain || '').toLowerCase().includes('chipnet');

        if (!order.depositTxHash && isBchOrigin && order.depositAddress) {
          const createdMs = order.createdAt ? new Date(order.createdAt).getTime() : 0;
          if (createdMs >= cutoffMs) {
            const check = await bchService.verifyDeposit(
              null,
              order.fromAmount,
              order.fromToken,
              order.depositAddress
            );
            if (check.verified && check.txHash) {
              db.updateLimitOrder(order.id, { depositTxHash: check.txHash });
              order.depositTxHash = check.txHash;
            }
          }
        }

        if (!order.depositTxHash) continue;
        if (db.isTxHashConsumed(order.depositTxHash, { ignoreOrderId: order.id })) {
          db.updateLimitOrder(order.id, {
            status: 'CANCELLED',
            error: 'Duplicate depositTxHash blocked by Anti-Replay registry'
          });
          continue;
        }
        const isOriginTestnet = this.isTestnetChainId(order.fromChain);
        const isDestTestnet = this.isTestnetChainId(order.toChain);
        if (isOriginTestnet !== isDestTestnet) {
          db.updateLimitOrder(order.id, {
            status: 'CANCELLED',
            error: 'Cross-network Testnet/Mainnet limit order blocked'
          });
          continue;
        }
        const isTestnetOrder = isOriginTestnet && isDestTestnet;
        const currentRate = await oraclePool.getRate(order.fromToken, order.toToken);

        if (currentRate >= order.targetRate) {
          await db.withLock(`limit_order:${order.id}`, async () => {
            const freshOrder = db.getLimitOrder(order.id);
            if (!freshOrder || freshOrder.status !== 'OPEN' || freshOrder.payoutTxHash) return;
            db.updateLimitOrder(order.id, { status: 'EXECUTING' });
            console.log(`[Watchman Relayer] 🎯 Limit Order ${order.id} triggered at rate ${currentRate}`);
            const expectedOutput = Number(order.expectedOutput);

            let payoutResult;
            const isBchDest =
              String(order.toChain || '').toLowerCase().includes('bch') ||
              String(order.toChain || '').toLowerCase().includes('chipnet');
            const isSolanaDest = solanaService.isSolanaChain(order.toChain);
            const isLtcDest = ltcService.isLtcChain(order.toChain);
            const isTonDest = tonService.isTonChain(order.toChain);

            if (isTonDest || isLtcDest) {
              throw new Error(`Limit order destination ${order.toChain} requires manual settlement`);
            } else if (isSolanaDest) {
              const tokenCfg = solanaService.getTokenConfig(order.toToken, order.toChain);

              const auth = await watchmanSentinel.auditAndAuthorize({
                destinationType: 'SOLANA',
                originTxHash: order.depositTxHash,
                fromToken: order.fromToken,
                toToken: order.toToken,
                recipient: order.recipientAddress,
                tokenAddress: tokenCfg.mint,
                tokenDecimals: tokenCfg.decimals || 6,
                amount: expectedOutput,
                rate: order.targetRate || currentRate,
                vaultContractAddress: solanaService.programId
              });
              if (!auth.approved) throw new Error(auth.reason);

              payoutResult = await solanaService.releaseFromVault({
                bchTxHashBytes32: auth.bchTxHashBytes32,
                recipientAddress: order.recipientAddress,
                amount: expectedOutput,
                tokenSymbol: order.toToken,
                chain: order.toChain,
                nonce: auth.nonce,
                watchmanSignature: auth.proof
              });
            } else if (!isBchDest) {
              const isAmoy = evmService.isAmoyChain(order.toChain);
              const chainId = isAmoy ? config.evm.amoyChainId : config.evm.chainId;
              const vaultAddress = evmService.getVaultAddress(order.toChain);
              const tokenCfg = evmService.getTokenConfig(order.toToken, order.toChain);

              const auth = await watchmanSentinel.auditAndAuthorize({
                destinationType: 'EVM',
                originTxHash: order.depositTxHash,
                fromToken: order.fromToken,
                toToken: order.toToken,
                recipient: order.recipientAddress,
                tokenAddress: tokenCfg.address,
                tokenDecimals: tokenCfg.decimals,
                amount: expectedOutput,
                rate: order.targetRate || currentRate,
                chainId,
                vaultContractAddress: vaultAddress
              });
              if (!auth.approved) throw new Error(auth.reason);

              payoutResult = await evmService.releaseFromVault({
                bchTxHashBytes32: auth.bchTxHashBytes32,
                recipientAddress: order.recipientAddress,
                amount: expectedOutput,
                tokenSymbol: order.toToken,
                chain: order.toChain,
                nonce: auth.nonce,
                watchmanSignature: auth.proof
              });
            } else {
              const auth = await watchmanSentinel.auditAndAuthorize({
                destinationType: 'BCH',
                originTxHash: order.depositTxHash,
                fromToken: order.fromToken,
                toToken: order.toToken,
                recipient: order.recipientAddress,
                amount: expectedOutput,
                rate: order.targetRate || currentRate
              });
              if (!auth.approved) throw new Error(auth.reason);

              payoutResult = await bchService.releaseFromVault(
                order.recipientAddress,
                expectedOutput,
                order.toToken,
                null,
                null,
                isTestnetOrder
              );
            }

            db.updateLimitOrder(order.id, {
              status: 'FILLED',
              payoutTxHash: payoutResult.txHash
            });

            const feeAmount = Number(order.fromAmount) * config.feePercentage;
            poolService.accrueSwapFee(order.fromToken, order.fromAmount, feeAmount, order.toToken);

            db.logEvent('LIMIT_ORDER_FILLED', `Filled Non-Custodial limit order ${order.id}`, {
              orderId: order.id,
              payoutTx: payoutResult.txHash
            });
          });
        }
      } catch (err) {
        console.warn(`[Watchman Relayer] Limit order warning for ${order.id}:`, err.message);
      }
    }
  }

  async executeRelay(swapId) {
    if (this.activeSwapLocks.has(swapId)) {
      return await this.activeSwapLocks.get(swapId);
    }

    const relayPromise = this._executeRelayInternal(swapId);
    this.activeSwapLocks.set(swapId, relayPromise);
    try {
      return await relayPromise;
    } finally {
      this.activeSwapLocks.delete(swapId);
    }
  }

  async _executeRelayInternal(swapId) {
    const swap = db.getSwap(swapId);
    if (!swap) return { success: false, error: 'Swap not found' };

    if (swap.status === 'COMPLETED' || swap.payoutTxHash || swap.status === 'EXECUTING_PAYOUT') {
      return { success: true, swap };
    }

    let watchmanOriginRef = null;

    try {
      db.updateSwap(swapId, { status: 'CONFIRMING' });
      db.logEvent('SWAP_CONFIRMING', `Verifying Smart Contract deposit for swap ${swapId}`, {
        swapId,
        depositTx: swap.depositTxHash,
        depositContract: swap.depositAddress
      });

      const fromChainLower = String(swap.fromChain || '').toLowerCase();
      const toChainLower = String(swap.toChain || '').toLowerCase();
      const isOriginTestnet = this.isTestnetChainId(fromChainLower);
      const isDestTestnet = this.isTestnetChainId(toChainLower);
      if (isOriginTestnet !== isDestTestnet) {
        const msg = `Security Alert: Cross-network Testnet/Mainnet routing blocked (${swap.fromChain} -> ${swap.toChain}).`;
        db.updateSwap(swapId, { status: 'FAILED', error: msg });
        return { success: false, reason: msg };
      }
      const isTestnetSwap = isOriginTestnet && isDestTestnet;
      const isBchOrigin = fromChainLower.includes('bch') || fromChainLower.includes('chipnet');
      const isBchDestination = toChainLower.includes('bch') || toChainLower.includes('chipnet');
      const isSolanaOrigin = solanaService.isSolanaChain(swap.fromChain);
      const isSolanaDestination = solanaService.isSolanaChain(swap.toChain);
      const isLtcOrigin = ltcService.isLtcChain(swap.fromChain);
      const isLtcDestination = ltcService.isLtcChain(swap.toChain);
      const isTonOrigin = tonService.isTonChain(swap.fromChain);
      const isTonDestination = tonService.isTonChain(swap.toChain);

      let verifyResult;

      // 1. Verify deposit inside Non-Custodial Smart Contract / Covenant
      if (isLtcOrigin) {
        verifyResult = await ltcService.verifyDeposit(
          swap.depositAddress,
          swap.fromAmount,
          isTestnetSwap,
          swapId
        );
      } else if (isTonOrigin) {
        verifyResult = await tonService.verifyDeposit(
          swap.depositTxHash,
          swap.fromAmount,
          swap.depositAddress,
          isTestnetSwap
        );
      } else if (isSolanaOrigin) {
        verifyResult = await solanaService.verifyDeposit(
          swap.depositTxHash,
          swap.fromAmount,
          swap.fromToken,
          swap.depositAddress,
          swap.fromChain
        );
      } else if (isBchOrigin) {
        verifyResult = await bchService.verifyDeposit(
          swap.depositTxHash,
          swap.fromAmount,
          swap.fromToken,
          swap.depositAddress
        );
      } else {
        verifyResult = await evmService.verifyDeposit(
          swap.depositTxHash,
          swap.fromAmount,
          swap.fromToken,
          swap.depositAddress,
          swap.fromChain
        );
      }

      if (!verifyResult.verified) {
        db.updateSwap(swapId, {
          status: 'PENDING_DEPOSIT',
          error: verifyResult.reason || 'Deposit not confirmed in Smart Contract yet'
        });
        return { success: false, reason: verifyResult.reason };
      }

      // Normalize canonical deposit txHash from on-chain receipt/UTXO
      const canonicalOriginHash = verifyResult.txHash || swap.depositTxHash;
      if (!canonicalOriginHash) {
        db.updateSwap(swapId, { status: 'PENDING_DEPOSIT', error: 'Missing verified deposit transaction hash' });
        return { success: false, reason: 'Missing verified deposit transaction hash' };
      }
      if (db.isTxHashConsumed(canonicalOriginHash, { ignoreSwapId: swapId })) {
        const msg = 'Security Alert: Deposit transaction hash has already been redeemed (Replay Attack blocked).';
        db.updateSwap(swapId, { status: 'FAILED', error: msg });
        return { success: false, reason: msg };
      }
      watchmanOriginRef = canonicalOriginHash;

      // Proportional payout cap if user deposited slightly less than quoted (99%-100% tolerance window)
      const verifiedIn = Number(verifyResult.amount || swap.fromAmount);
      const ratio = verifiedIn > 0 && verifiedIn < Number(swap.fromAmount)
        ? verifiedIn / Number(swap.fromAmount)
        : 1.0;
      const effectivePayoutAmount = Number((Number(swap.toAmount) * ratio).toFixed(6));

      // 2. Slippage Protection Check
      if (swap.minPayoutAmount && effectivePayoutAmount < swap.minPayoutAmount * ratio) {
        const msg = `Slippage tolerance exceeded: Minimum guaranteed was ${swap.minPayoutAmount} ${swap.toToken}, payout is ${effectivePayoutAmount}.`;
        db.updateSwap(swapId, { status: 'FAILED', error: msg });
        return { success: false, reason: msg };
      }

      // 3. The Watchman Sentinel Cryptographic Audit & Authorization
      db.updateSwap(swapId, { status: 'EXECUTING_PAYOUT', depositTxHash: canonicalOriginHash, toAmount: effectivePayoutAmount });
      db.logEvent(
        'WATCHMAN_AUDIT',
        `The Watchman auditing swap ${swapId} (${verifiedIn} ${swap.fromToken} ➔ ${effectivePayoutAmount} ${swap.toToken})`,
        { swapId, originTx: canonicalOriginHash }
      );

      let payoutResult;
      let watchmanAttestation = null;

      if (isTonDestination) {
        const auth = await watchmanSentinel.auditAndAuthorize({
          destinationType: 'TON',
          originTxHash: canonicalOriginHash,
          fromToken: swap.fromToken,
          toToken: swap.toToken,
          recipient: swap.recipientAddress,
          amount: effectivePayoutAmount,
          rate: swap.oracleRate || 1.0
        });
        if (!auth.approved) {
          watchmanOriginRef = null;
          throw new Error(`Watchman Sentinel rejected TON swap: ${auth.reason}`);
        }
        watchmanAttestation = auth.proof;
        payoutResult = await tonService.sendPayout(
          swap.recipientAddress,
          effectivePayoutAmount,
          swap.toToken,
          isTestnetSwap
        );
      } else if (isLtcDestination) {
        const auth = await watchmanSentinel.auditAndAuthorize({
          destinationType: 'LTC',
          originTxHash: canonicalOriginHash,
          fromToken: swap.fromToken,
          toToken: swap.toToken,
          recipient: swap.recipientAddress,
          amount: effectivePayoutAmount,
          rate: swap.oracleRate || 1.0
        });
        if (!auth.approved) {
          watchmanOriginRef = null;
          throw new Error(`Watchman Sentinel rejected LTC swap: ${auth.reason}`);
        }
        watchmanAttestation = auth.proof;
        payoutResult = await ltcService.sendPayout(
          swap.recipientAddress,
          effectivePayoutAmount,
          isTestnetSwap
        );
      } else if (isSolanaDestination) {
        // Inbound to Solana SVM Anchor Vault -> Ed25519 Attestation
        const tokenCfg = solanaService.getTokenConfig(swap.toToken, swap.toChain);

        const auth = await watchmanSentinel.auditAndAuthorize({
          destinationType: 'SOLANA',
          originTxHash: canonicalOriginHash,
          fromToken: swap.fromToken,
          toToken: swap.toToken,
          recipient: swap.recipientAddress,
          tokenAddress: tokenCfg.mint,
          tokenDecimals: tokenCfg.decimals || 6,
          amount: effectivePayoutAmount,
          rate: swap.oracleRate || 1.0,
          vaultContractAddress: solanaService.programId
        });

        if (!auth.approved) {
          watchmanOriginRef = null;
          throw new Error(`Watchman Sentinel rejected swap: ${auth.reason}`);
        }
        watchmanAttestation = auth.proof;

        payoutResult = await solanaService.releaseFromVault({
          bchTxHashBytes32: auth.bchTxHashBytes32,
          recipientAddress: swap.recipientAddress,
          amount: effectivePayoutAmount,
          tokenSymbol: swap.toToken,
          chain: swap.toChain,
          nonce: auth.nonce,
          watchmanSignature: auth.proof
        });
      } else if (!isBchDestination) {
        // Inbound to EVM (from BCH CashTokens or Solana SVM) -> ECDSA EIP-191 Attestation
        const isAmoy = evmService.isAmoyChain(swap.toChain);
        const chainId = isAmoy ? config.evm.amoyChainId : config.evm.chainId;
        const vaultAddress = evmService.getVaultAddress(swap.toChain);
        const tokenCfg = evmService.getTokenConfig(swap.toToken, swap.toChain);

        const auth = await watchmanSentinel.auditAndAuthorize({
          destinationType: 'EVM',
          originTxHash: canonicalOriginHash,
          fromToken: swap.fromToken,
          toToken: swap.toToken,
          recipient: swap.recipientAddress,
          tokenAddress: tokenCfg.address,
          tokenDecimals: tokenCfg.decimals,
          amount: effectivePayoutAmount,
          rate: swap.oracleRate || 1.0,
          chainId,
          vaultContractAddress: vaultAddress
        });

        if (!auth.approved) {
          watchmanOriginRef = null;
          throw new Error(`Watchman Sentinel rejected swap: ${auth.reason}`);
        }
        watchmanAttestation = auth.proof;

        payoutResult = await evmService.releaseFromVault({
          bchTxHashBytes32: auth.bchTxHashBytes32,
          recipientAddress: swap.recipientAddress,
          amount: effectivePayoutAmount,
          tokenSymbol: swap.toToken,
          chain: swap.toChain,
          nonce: auth.nonce,
          watchmanSignature: auth.proof
        });
      } else {
        // Inbound to Bitcoin Cash L1 (from EVM OR from Solana SVM) -> Schnorr Covenant Continuation
        const auth = await watchmanSentinel.auditAndAuthorize({
          destinationType: 'BCH',
          originTxHash: canonicalOriginHash,
          fromToken: swap.fromToken,
          toToken: swap.toToken,
          recipient: swap.recipientAddress,
          amount: effectivePayoutAmount,
          rate: swap.oracleRate || 1.0
        });

        if (!auth.approved) {
          watchmanOriginRef = null;
          throw new Error(`Watchman Sentinel rejected swap: ${auth.reason}`);
        }
        watchmanAttestation = auth.proof;

        payoutResult = await bchService.releaseFromVault(
          swap.recipientAddress,
          effectivePayoutAmount,
          swap.toToken,
          null,
          null,
          isTestnetSwap
        );
      }

      if (!payoutResult.success) {
        throw new Error(payoutResult.error || 'Destination Smart Contract release failed');
      }

      const syncPatch = {};
      if (isBchOrigin) {
        try {
          const sweepTxId = await bchService.sweepEscrowToVault(swap);
          if (sweepTxId) syncPatch.escrowSweepTxHash = sweepTxId;
        } catch (sweepErr) {
          console.error(`[Watchman Relayer] Escrow sweep failed for ${swapId}:`, sweepErr.message);
          syncPatch.sweepPending = true;
          syncPatch.sweepError = sweepErr.message;
        }
      } else if (isSolanaOrigin) {
        try {
          await solanaService.markDepositSettled(verifyResult.depositId, payoutResult.txHash, swap.fromChain);
        } catch (markErr) {
          console.error(`[Watchman Relayer] Solana settlement sync failed for ${swapId}:`, markErr.message);
          syncPatch.settlementSyncPending = true;
          syncPatch.settlementSyncError = markErr.message;
        }
      } else if (verifyResult.depositId) {
        try {
          await evmService.markDepositSettled(verifyResult.depositId, payoutResult.txHash, swap.fromChain);
        } catch (markErr) {
          console.error(`[Watchman Relayer] EVM settlement sync failed for ${swapId}:`, markErr.message);
          syncPatch.settlementSyncPending = true;
          syncPatch.settlementSyncError = markErr.message;
        }
      }

      // 4. Finalize Swap as COMPLETED
      const completedSwap = db.updateSwap(swapId, {
        status: 'COMPLETED',
        payoutTxHash: payoutResult.txHash,
        payoutExplorerUrl: payoutResult.explorerUrl,
        watchmanProof: watchmanAttestation ? `${watchmanAttestation.slice(0, 24)}...` : 'VERIFIED',
        ...syncPatch,
        error: null
      });

      // 5. Accrue 0.25% LP fee into Liquidity Pool accounting
      poolService.accrueSwapFee(swap.fromToken, swap.fromAmount, swap.feeAmount);

      db.logEvent(
        'SWAP_COMPLETED',
        `Non-Custodial Vault settled ${swap.fromAmount} ${swap.fromToken} ➔ ${swap.toAmount} ${swap.toToken}`,
        {
          swapId,
          depositTx: canonicalOriginHash,
          payoutTx: payoutResult.txHash,
          feeCollected: swap.feeAmount
        }
      );

      return { success: true, swap: completedSwap };
    } catch (err) {
      const latestSwap = db.getSwap(swapId);
      if (latestSwap && (latestSwap.status === 'COMPLETED' || latestSwap.payoutTxHash)) {
        return { success: true, swap: latestSwap };
      }
      if (watchmanOriginRef) {
        watchmanSentinel.rollbackAuthorization(watchmanOriginRef);
      }
      console.error(`[Watchman Relayer] Error completing swap ${swapId}:`, err.message);
      db.updateSwap(swapId, { status: 'FAILED', error: err.message });
      return { success: false, error: err.message };
    }
  }
}

export const relayerEngine = new RelayerEngine();
