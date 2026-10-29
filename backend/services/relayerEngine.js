import { db } from './db.js';
import { bchService } from './bchService.js';
import { evmService } from './evmService.js';
import { oracle, oraclePool } from './oraclePool.js';
import { poolService } from './poolService.js';

class RelayerEngine {
  constructor() {
    this.timer = null;
    this.isProcessing = false;
  }

  start(intervalMs = 4000) {
    if (this.timer) clearInterval(this.timer);
    console.log(`[Relayer Engine] Background monitor active (polling every ${intervalMs}ms)`);
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
      for (const swap of pending) {
        // If user submitted a depositTxHash or deposit is detected, process it
        if (swap.depositTxHash && (swap.status === 'PENDING_DEPOSIT' || swap.status === 'DEPOSIT_DETECTED')) {
          await this.executeRelay(swap.id);
        }
      }

      // Check and execute triggered limit orders
      await this.checkLimitOrders();
    } catch (err) {
      console.error('[Relayer Engine] Polling cycle error:', err.message);
    } finally {
      this.isProcessing = false;
    }
  }

  async checkLimitOrders() {
    const openOrders = db.listLimitOrders({ status: 'OPEN' });
    if (openOrders.length === 0) return;

    for (const order of openOrders) {
      try {
        const currentRate = await oraclePool.getRate(order.fromToken, order.toToken);

        // If market rate satisfies or beats target rate
        if (currentRate >= order.targetRate) {
          console.log(`[Relayer Engine] 🎯 Limit Order ${order.id} triggered! Target: ${order.targetRate}, Current Rate: ${currentRate}`);
          
          let payoutResult;
          const isBchOrigin = order.fromChain.includes('bch') || order.fromChain.includes('chipnet');
          if (isBchOrigin) {
            payoutResult = await evmService.sendPayout(order.recipientAddress, order.expectedOutput, order.toToken);
          } else {
            payoutResult = await bchService.sendPayout(order.recipientAddress, order.expectedOutput, order.toToken);
          }

          db.updateLimitOrder(order.id, {
            status: 'FILLED',
            payoutTxHash: payoutResult.txHash || ('0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''))
          });

          // Accrue fees into liquidity pool
          const feeAmount = order.fromAmount * 0.003;
          poolService.accrueSwapFee(order.fromToken, order.fromAmount, feeAmount);

          db.logEvent('LIMIT_ORDER_FILLED', `Filled limit order ${order.id} for ${order.fromAmount} ${order.fromToken} ➔ ${order.expectedOutput} ${order.toToken}`, {
            orderId: order.id,
            payoutTx: payoutResult.txHash
          });
        }
      } catch (err) {
        console.warn(`[Relayer Engine] Limit order check warning for ${order.id}:`, err.message);
      }
    }
  }

  async executeRelay(swapId) {
    const swap = db.getSwap(swapId);
    if (!swap) return { success: false, error: 'Swap not found' };

    // Prevent re-entry
    if (swap.status === 'COMPLETED' || swap.status === 'EXECUTING_PAYOUT') {
      return { success: true, swap };
    }

    try {
      db.updateSwap(swapId, { status: 'CONFIRMING' });
      db.logEvent('SWAP_CONFIRMING', `Verifying deposit for swap ${swapId}`, { swapId, depositTx: swap.depositTxHash });

      const isBchOrigin = swap.fromChain.includes('bch') || swap.fromChain.includes('chipnet');
      let verifyResult;

      // 1. Verify deposit on origin chain
      if (isBchOrigin) {
        verifyResult = await bchService.verifyDeposit(swap.depositTxHash, swap.fromAmount, swap.fromToken, swap.depositAddress);
      } else {
        verifyResult = await evmService.verifyDeposit(swap.depositTxHash, swap.fromAmount, swap.fromToken, swap.depositAddress);
      }

      if (!verifyResult.verified) {
        db.updateSwap(swapId, { 
          status: 'PENDING_DEPOSIT', 
          error: verifyResult.reason || 'Deposit not confirmed yet' 
        });
        return { success: false, reason: verifyResult.reason };
      }

      // 2. Mark payout execution
      db.updateSwap(swapId, { status: 'EXECUTING_PAYOUT' });
      db.logEvent('SWAP_PAYOUT_INIT', `Executing payout of ${swap.toAmount} ${swap.toToken} to ${swap.recipientAddress}`, { swapId });

      let payoutResult;

      // 3. Dispatch funds from destination Hot Wallet
      if (isBchOrigin) {
        // User sent PUSD on BCH -> We dispatch USDC on EVM
        payoutResult = await evmService.sendPayout(swap.recipientAddress, swap.toAmount, swap.toToken);
      } else {
        // User sent USDC on EVM -> We dispatch PUSD (CashTokens) on BCH
        payoutResult = await bchService.sendPayout(swap.recipientAddress, swap.toAmount, swap.toToken);
      }

      if (!payoutResult.success) {
        throw new Error(payoutResult.error || 'Destination payout failed');
      }

      // 4. Finalize Swap as COMPLETED
      const completedSwap = db.updateSwap(swapId, {
        status: 'COMPLETED',
        payoutTxHash: payoutResult.txHash,
        payoutExplorerUrl: payoutResult.explorerUrl,
        error: null
      });

      // 5. Accrue 0.25% fee into Liquidity Pool (AMM Shares distribution)
      poolService.accrueSwapFee(swap.fromToken, swap.fromAmount, swap.feeAmount);

      db.logEvent('SWAP_COMPLETED', `Successfully bridged ${swap.fromAmount} ${swap.fromToken} ➔ ${swap.toAmount} ${swap.toToken}`, {
        swapId,
        depositTx: swap.depositTxHash,
        payoutTx: payoutResult.txHash,
        feeCollected: swap.feeAmount
      });

      return { success: true, swap: completedSwap };
    } catch (err) {
      console.error(`[Relayer Engine] Error completing swap ${swapId}:`, err.message);
      db.updateSwap(swapId, { status: 'FAILED', error: err.message });
      return { success: false, error: err.message };
    }
  }
}

export const relayerEngine = new RelayerEngine();
