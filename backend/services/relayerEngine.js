import { config } from '../config.js';
import { db } from './db.js';
import { bchService } from './bchService.js';
import { evmService } from './evmService.js';
import { solanaService } from './solanaService.js';
import { ltcService } from './ltcService.js';
import { oraclePool } from './oraclePool.js';
import { poolService } from './poolService.js';
import { watchmanSentinel } from './watchmanClient.js';

class RelayerEngine {
  constructor() {
    this.timer = null;
    this.isProcessing = false;
    this.activeSwapLocks = new Map();
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
        const isBchOrigin =
          String(swap.fromChain || '').toLowerCase().includes('bch') ||
          String(swap.fromChain || '').toLowerCase().includes('chipnet');
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
            true
          );
          if (check.verified && check.txHash) {
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
          swap.contractName === 'BinaryLiquidEscrow.cash' &&
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
        const currentRate = await oraclePool.getRate(order.fromToken, order.toToken);

        if (currentRate >= order.targetRate) {
          console.log(`[Watchman Relayer] 🎯 Limit Order ${order.id} triggered at rate ${currentRate}`);
          const expectedOutput = Number(order.expectedOutput);

          let payoutResult;
          const isBchDest =
            String(order.toChain || '').toLowerCase().includes('bch') ||
            String(order.toChain || '').toLowerCase().includes('chipnet');
          const isSolanaDest = solanaService.isSolanaChain(order.toChain);

          if (isSolanaDest) {
            const tokenCfg = solanaService.getTokenConfig(order.toToken, order.toChain);
            const vaultAddress = solanaService.getVaultAddress(order.toChain);

            const auth = await watchmanSentinel.auditAndAuthorize({
              destinationType: 'SOLANA',
              originTxHash: order.depositTxHash,
              fromToken: order.fromToken,
              toToken: order.toToken,
              recipient: order.recipientAddress,
              tokenAddress: tokenCfg.mint,
              tokenDecimals: tokenCfg.decimals || 6,
              amount: expectedOutput,
              rate: currentRate,
              vaultContractAddress: vaultAddress
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
              rate: currentRate,
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
              rate: currentRate
            });
            if (!auth.approved) throw new Error(auth.reason);

            payoutResult = await bchService.releaseFromVault(
              order.recipientAddress,
              expectedOutput,
              order.toToken
            );
          }

          db.updateLimitOrder(order.id, {
            status: 'FILLED',
            payoutTxHash: payoutResult.txHash
          });

          const feeAmount = Number(order.fromAmount) * config.feePercentage;
          poolService.accrueSwapFee(order.fromToken, order.fromAmount, feeAmount);

          db.logEvent('LIMIT_ORDER_FILLED', `Filled Non-Custodial limit order ${order.id}`, {
            orderId: order.id,
            payoutTx: payoutResult.txHash
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
      const isBchOrigin = fromChainLower.includes('bch') || fromChainLower.includes('chipnet');
      const isBchDestination = toChainLower.includes('bch') || toChainLower.includes('chipnet');
      const isSolanaOrigin = solanaService.isSolanaChain(swap.fromChain);
      const isSolanaDestination = solanaService.isSolanaChain(swap.toChain);
      const isLtcOrigin = ltcService.isLtcChain(swap.fromChain);
      const isLtcDestination = ltcService.isLtcChain(swap.toChain);

      let verifyResult;

      // 1. Verify deposit inside Non-Custodial Smart Contract / Covenant
      if (isLtcOrigin) {
        verifyResult = await ltcService.verifyDeposit(
          swap.depositAddress,
          swap.fromAmount,
          true
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
      watchmanOriginRef = canonicalOriginHash;

      // 2. Slippage Protection Check
      if (swap.minPayoutAmount && swap.toAmount < swap.minPayoutAmount) {
        const msg = `Slippage tolerance exceeded: Minimum guaranteed was ${swap.minPayoutAmount} ${swap.toToken}, payout is ${swap.toAmount}.`;
        db.updateSwap(swapId, { status: 'FAILED', error: msg });
        return { success: false, reason: msg };
      }

      // 3. The Watchman Sentinel Cryptographic Audit & Authorization
      db.updateSwap(swapId, { status: 'EXECUTING_PAYOUT', depositTxHash: canonicalOriginHash });
      db.logEvent(
        'WATCHMAN_AUDIT',
        `The Watchman auditing swap ${swapId} (${swap.fromAmount} ${swap.fromToken} ➔ ${swap.toAmount} ${swap.toToken})`,
        { swapId, originTx: canonicalOriginHash }
      );

      let payoutResult;
      let watchmanAttestation = null;

      if (isLtcDestination) {
        payoutResult = await ltcService.sendPayout(
          swap.recipientAddress,
          swap.toAmount,
          true
        );
      } else if (isSolanaDestination) {
        // Inbound to Solana SVM Anchor Vault -> Ed25519 Attestation
        const tokenCfg = solanaService.getTokenConfig(swap.toToken, swap.toChain);
        const vaultAddress = solanaService.getVaultAddress(swap.toChain);

        const auth = await watchmanSentinel.auditAndAuthorize({
          destinationType: 'SOLANA',
          originTxHash: canonicalOriginHash,
          fromToken: swap.fromToken,
          toToken: swap.toToken,
          recipient: swap.recipientAddress,
          tokenAddress: tokenCfg.mint,
          tokenDecimals: tokenCfg.decimals || 6,
          amount: swap.toAmount,
          rate: swap.oracleRate || 1.0,
          vaultContractAddress: vaultAddress
        });

        if (!auth.approved) {
          watchmanOriginRef = null;
          throw new Error(`Watchman Sentinel rejected swap: ${auth.reason}`);
        }
        watchmanAttestation = auth.proof;

        payoutResult = await solanaService.releaseFromVault({
          bchTxHashBytes32: auth.bchTxHashBytes32,
          recipientAddress: swap.recipientAddress,
          amount: swap.toAmount,
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
          amount: swap.toAmount,
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
          amount: swap.toAmount,
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
          amount: swap.toAmount,
          rate: swap.oracleRate || 1.0
        });

        if (!auth.approved) {
          watchmanOriginRef = null;
          throw new Error(`Watchman Sentinel rejected swap: ${auth.reason}`);
        }
        watchmanAttestation = auth.proof;

        payoutResult = await bchService.releaseFromVault(
          swap.recipientAddress,
          swap.toAmount,
          swap.toToken
        );
      }

      if (payoutResult.success) {
        if (isBchOrigin) {
          bchService.sweepEscrowToVault(swap).catch(() => {});
        } else if (isSolanaOrigin) {
          solanaService.markDepositSettled(verifyResult.depositId, payoutResult.txHash, swap.fromChain).catch(() => {});
        } else if (verifyResult.depositId) {
          evmService.markDepositSettled(verifyResult.depositId, payoutResult.txHash, swap.fromChain).catch(() => {});
        }
      }

      if (!payoutResult.success) {
        throw new Error(payoutResult.error || 'Destination Smart Contract release failed');
      }

      // 4. Finalize Swap as COMPLETED
      const completedSwap = db.updateSwap(swapId, {
        status: 'COMPLETED',
        payoutTxHash: payoutResult.txHash,
        payoutExplorerUrl: payoutResult.explorerUrl,
        watchmanProof: watchmanAttestation ? `${watchmanAttestation.slice(0, 24)}...` : 'VERIFIED',
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
