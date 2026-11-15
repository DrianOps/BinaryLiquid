import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import Redis from 'ioredis';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'bridge_db.json');

const defaultState = {
  swaps: [],
  limitOrders: [],
  pools: {},
  lpPositions: [],
  userBalances: {},
  treasury: {
    PUSD: 0,
    USDC: 0,
    MUSD: 0,
    USDT: 0,
    totalVolumeUsd: 0,
    totalSwapsCount: 0
  },
  liquidity: {
    bch_pusd: 50000.0,
    bch_musd: 15000.0,
    evm_usdc: 50000.0,
    evm_usdt: 25000.0
  },
  consumedTxHashes: {},
  hdCounter: 0,
  systemLogs: []
};

class BridgeDatabase {
  constructor() {
    this.memoryState = null;
    this.pgPool = null;
    this.redis = null;
    this.pgReady = false;
    this.redisReady = false;
    this.locks = new Map();

    this.initFileStore();
    this.initPostgres();
    this.initRedis();
  }

  async withLock(key, fn) {
    const k = String(key || 'global');
    const tail = this.locks.get(k) || Promise.resolve();
    const run = tail.then(() => fn());
    const settled = run.then(() => undefined, () => undefined);
    this.locks.set(k, settled);
    settled.finally(() => {
      if (this.locks.get(k) === settled) {
        this.locks.delete(k);
      }
    });
    return run;
  }

  initFileStore() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
    }

    if (!fs.existsSync(DB_FILE)) {
      this.memoryState = JSON.parse(JSON.stringify(defaultState));
      this.persist();
    } else {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        this.memoryState = { ...defaultState, ...JSON.parse(raw) };
        if (!this.memoryState.consumedTxHashes || typeof this.memoryState.consumedTxHashes !== 'object') {
          this.memoryState.consumedTxHashes = {};
        }
      } catch (err) {
        console.error('[DB] Error loading database file, initializing default:', err.message);
        this.memoryState = JSON.parse(JSON.stringify(defaultState));
        this.persist();
      }
    }
  }

  async initPostgres() {
    try {
      this.pgPool = new Pool({
        host: process.env.PGHOST || '127.0.0.1',
        port: parseInt(process.env.PGPORT || '5432', 10),
        database: process.env.PGDATABASE || 'binaryliquid_db',
        user: process.env.PGUSER || 'binaryliquid_user',
        password: process.env.PGPASSWORD || '',
        max: 10,
        connectionTimeoutMillis: 3000
      });

      // Test connection and auto-create tables
      const client = await this.pgPool.connect();
      await client.query(`
        CREATE TABLE IF NOT EXISTS swaps (
          id VARCHAR(64) PRIMARY KEY,
          from_token VARCHAR(20) NOT NULL,
          to_token VARCHAR(20) NOT NULL,
          from_chain VARCHAR(50) NOT NULL,
          to_chain VARCHAR(50) NOT NULL,
          from_amount NUMERIC NOT NULL,
          to_amount NUMERIC NOT NULL,
          fee_amount NUMERIC NOT NULL,
          fee_percentage NUMERIC DEFAULT 0.003,
          oracle_rate NUMERIC DEFAULT 1.0,
          deposit_address TEXT NOT NULL,
          recipient_address TEXT NOT NULL,
          status VARCHAR(40) NOT NULL,
          deposit_tx_hash TEXT,
          payout_tx_hash TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          completed_at TIMESTAMPTZ,
          raw_data JSONB
        );

        CREATE TABLE IF NOT EXISTS treasury_metrics (
          id SERIAL PRIMARY KEY,
          total_volume_usd NUMERIC DEFAULT 0,
          total_swaps_count INT DEFAULT 0,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS limit_orders (
          id VARCHAR(64) PRIMARY KEY,
          user_address TEXT NOT NULL,
          from_token VARCHAR(20) NOT NULL,
          to_token VARCHAR(20) NOT NULL,
          from_chain VARCHAR(50) NOT NULL,
          to_chain VARCHAR(50) NOT NULL,
          from_amount NUMERIC NOT NULL,
          target_rate NUMERIC NOT NULL,
          expected_output NUMERIC NOT NULL,
          recipient_address TEXT NOT NULL,
          deposit_address TEXT NOT NULL,
          status VARCHAR(40) NOT NULL DEFAULT 'OPEN',
          deposit_tx_hash TEXT,
          payout_tx_hash TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          filled_at TIMESTAMPTZ,
          raw_data JSONB
        );

        CREATE TABLE IF NOT EXISTS consumed_tx_hashes (
          tx_hash TEXT PRIMARY KEY,
          module VARCHAR(40) NOT NULL DEFAULT 'BRIDGE',
          chain VARCHAR(40) DEFAULT '',
          ref_id TEXT DEFAULT '',
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);
      try {
        const res = await client.query(`SELECT tx_hash, module, chain, ref_id, created_at FROM consumed_tx_hashes`);
        if (!this.memoryState.consumedTxHashes) this.memoryState.consumedTxHashes = {};
        for (const r of res.rows) {
          if (r.tx_hash) {
            this.memoryState.consumedTxHashes[String(r.tx_hash).toLowerCase()] = {
              module: r.module,
              chain: r.chain,
              refId: r.ref_id,
              recordedAt: r.created_at
            };
          }
        }
      } catch (_) {}
      client.release();
      this.pgReady = true;
      console.log('[DB] PostgreSQL initialized successfully on binaryliquid_db');
    } catch (err) {
      console.warn('[DB] PostgreSQL connection note (using robust file/memory fallback):', err.message);
      this.pgReady = false;
    }
  }

  async initRedis() {
    try {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        maxRetriesPerRequest: 1,
        lazyConnect: true
      });
      this.redis.on('error', err => {
        if (this.redisReady) {
          console.warn('[DB] Redis runtime error:', err.message);
        }
        this.redisReady = false;
      });
      await this.redis.connect();
      this.redisReady = true;
      console.log('[DB] Redis connected successfully for high-speed swap pub/sub & cache');
    } catch (err) {
      console.warn('[DB] Redis connection note (using memory cache):', err.message);
      this.redisReady = false;
      if (this.redis) {
        try { this.redis.disconnect(); } catch (_) {}
      }
      this.redis = null;
    }
  }

  persist() {
    try {
      const tempPath = `${DB_FILE}.tmp.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
      fs.writeFileSync(tempPath, JSON.stringify(this.memoryState, null, 2), { encoding: 'utf8', mode: 0o600 });
      fs.renameSync(tempPath, DB_FILE);
    } catch (err) {
      console.error('[DB] Failed to persist state:', err.message);
    }
  }

  normalizeTxHash(txHash) {
    if (!txHash || typeof txHash !== 'string') return '';
    const trimmed = txHash.trim();
    if (!trimmed || trimmed.toUpperCase() === 'AUTO_DETECT') return '';
    const lower = trimmed.toLowerCase();
    return lower.startsWith('0x') && lower.length === 66 ? lower.slice(2) : lower;
  }

  markTxHashConsumed(txHash, meta = {}) {
    const norm = this.normalizeTxHash(txHash);
    if (!norm) return false;
    if (!this.memoryState.consumedTxHashes || typeof this.memoryState.consumedTxHashes !== 'object') {
      this.memoryState.consumedTxHashes = {};
    }
    const entry = {
      module: meta.module || 'PROTOCOL',
      chain: meta.chain || '',
      refId: meta.refId || '',
      recordedAt: new Date().toISOString()
    };
    this.memoryState.consumedTxHashes[norm] = entry;
    this.persist();

    if (this.pgReady && this.pgPool) {
      this.pgPool
        .query(
          `INSERT INTO consumed_tx_hashes (tx_hash, module, chain, ref_id)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (tx_hash) DO NOTHING`,
          [norm, entry.module, entry.chain, entry.refId]
        )
        .catch(() => {});
    }
    return true;
  }

  isTxHashConsumed(txHash, { ignoreSwapId = null, ignoreOrderId = null } = {}) {
    const norm = this.normalizeTxHash(txHash);
    if (!norm) return false;

    const consumed = this.memoryState.consumedTxHashes?.[norm] || this.memoryState.consumedTxHashes?.[`0x${norm}`];
    if (consumed) {
      if (ignoreSwapId && consumed.refId === ignoreSwapId && consumed.module === 'SWAP_DEPOSIT') {
        // Same swap re-entering verification
      } else if (ignoreOrderId && consumed.refId === ignoreOrderId && consumed.module === 'LIMIT_ORDER_DEPOSIT') {
        // Same limit order re-entering verification
      } else {
        return true;
      }
    }

    const matchNorm = candidate => this.normalizeTxHash(candidate) === norm;

    const swaps = Array.isArray(this.memoryState.swaps) ? this.memoryState.swaps : [];
    for (const s of swaps) {
      if (matchNorm(s.payoutTxHash) || matchNorm(s.escrowSweepTxHash)) return true;
      if (matchNorm(s.depositTxHash) && s.id !== ignoreSwapId && !['FAILED', 'CANCELLED'].includes(s.status)) {
        return true;
      }
    }

    const orders = Array.isArray(this.memoryState.limitOrders) ? this.memoryState.limitOrders : [];
    for (const o of orders) {
      if (matchNorm(o.payoutTxHash)) return true;
      if (matchNorm(o.depositTxHash) && o.id !== ignoreOrderId && o.status !== 'CANCELLED') {
        return true;
      }
    }

    const lpPositions = Array.isArray(this.memoryState.lpPositions) ? this.memoryState.lpPositions : [];
    if (lpPositions.some(p => matchNorm(p.txHash) || matchNorm(p.withdrawTxHash))) return true;

    const lendTxs = Array.isArray(this.memoryState.lendingTransactions) ? this.memoryState.lendingTransactions : [];
    if (lendTxs.some(t => matchNorm(t.txHash))) return true;

    const lendVaults = this.memoryState.lendingVaults && typeof this.memoryState.lendingVaults === 'object'
      ? Object.values(this.memoryState.lendingVaults)
      : [];
    for (const v of lendVaults) {
      if (Array.isArray(v?.knownCollateralTxids) && v.knownCollateralTxids.some(matchNorm)) return true;
    }

    const perpPositions = Array.isArray(this.memoryState.perpPositions) ? this.memoryState.perpPositions : [];
    if (perpPositions.some(p => matchNorm(p.txHash) || matchNorm(p.payoutTxHash))) return true;

    const perpHistory = Array.isArray(this.memoryState.perpHistory) ? this.memoryState.perpHistory : [];
    if (perpHistory.some(p => matchNorm(p.txHash) || matchNorm(p.payoutTxHash))) return true;

    return false;
  }

  createSwap(swapData) {
    const swap = {
      id: swapData.id || `swap_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      fromToken: swapData.fromToken,
      toToken: swapData.toToken,
      fromChain: swapData.fromChain,
      toChain: swapData.toChain,
      fromAmount: Number(swapData.fromAmount),
      toAmount: Number(swapData.toAmount),
      feeAmount: Number(swapData.feeAmount),
      feePercentage: Number(swapData.feePercentage || 0.003),
      oracleRate: Number(swapData.oracleRate || 1.0),
      slippageTolerance: swapData.slippageTolerance !== undefined ? Number(swapData.slippageTolerance) : 0.5,
      minPayoutAmount: swapData.minPayoutAmount !== undefined ? Number(swapData.minPayoutAmount) : Number((Number(swapData.toAmount) * 0.995).toFixed(6)),
      depositAddress: swapData.depositAddress,
      derivationPath: swapData.derivationPath || null,
      derivationIndex: swapData.derivationIndex !== undefined ? swapData.derivationIndex : null,
      contractName: swapData.contractName || null,
      contractType: swapData.contractType || null,
      contractExplorerUrl: swapData.contractExplorerUrl || null,
      tokenContractAddress: swapData.tokenContractAddress || null,
      timelockExpiry: swapData.timelockExpiry || null,
      orderSeed: swapData.orderSeed || null,
      senderAddress: swapData.senderAddress || null,
      recipientAddress: swapData.recipientAddress,
      status: 'PENDING_DEPOSIT',
      depositTxHash: swapData.depositTxHash || null,
      payoutTxHash: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null,
      error: null
    };

    // 1. Memory and file persistence
    this.memoryState.swaps.unshift(swap);
    this.persist();

    // 2. Redis publish & cache
    if (this.redisReady && this.redis) {
      this.redis.set(`swap:${swap.id}`, JSON.stringify(swap), 'EX', 86400).catch(() => {});
      this.redis.publish('swap_events', JSON.stringify({ type: 'CREATED', swap })).catch(() => {});
    }

    // 3. PostgreSQL async insert
    if (this.pgReady && this.pgPool) {
      this.pgPool.query(`
        INSERT INTO swaps (
          id, from_token, to_token, from_chain, to_chain, from_amount, to_amount,
          fee_amount, fee_percentage, oracle_rate, deposit_address, recipient_address,
          status, deposit_tx_hash, payout_tx_hash, raw_data
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
        ON CONFLICT (id) DO UPDATE SET updated_at = NOW(), status = EXCLUDED.status
      `, [
        swap.id, swap.fromToken, swap.toToken, swap.fromChain, swap.toChain,
        swap.fromAmount, swap.toAmount, swap.feeAmount, swap.feePercentage,
        swap.oracleRate, swap.depositAddress, swap.recipientAddress, swap.status,
        swap.depositTxHash, swap.payoutTxHash, JSON.stringify(swap)
      ]).catch(e => console.warn('[DB] PG insert error:', e.message));
    }

    return swap;
  }

  getSwap(id) {
    return this.memoryState.swaps.find(s => s.id === id) || null;
  }

  getNextDerivationIndex() {
    if (typeof this.memoryState.hdCounter !== 'number') {
      const baseCount = (this.memoryState.swaps?.length || 0) + (this.memoryState.limitOrders?.length || 0);
      this.memoryState.hdCounter = baseCount;
    }
    this.memoryState.hdCounter += 1;
    this.persist();
    return this.memoryState.hdCounter;
  }

  findSwapByDepositAddress(depositAddress) {
    if (!depositAddress) return null;
    const clean = depositAddress.trim().toLowerCase();
    return this.memoryState.swaps.find(s => 
      s.depositAddress && s.depositAddress.trim().toLowerCase() === clean
    ) || null;
  }

  findSwapByDepositTxHash(txHash) {
    const norm = this.normalizeTxHash(txHash);
    if (!norm) return null;
    return this.memoryState.swaps.find(s => 
      s.depositTxHash && this.normalizeTxHash(s.depositTxHash) === norm
    ) || null;
  }

  getRecentSwaps(limit = 20) {
    return this.listSwaps(limit, 'COMPLETED');
  }

  updateSwap(id, updates) {
    const idx = this.memoryState.swaps.findIndex(s => s.id === id);
    if (idx === -1) return null;

    const current = this.memoryState.swaps[idx];
    const updated = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    if (updates.status === 'COMPLETED' && current.status !== 'COMPLETED') {
      updated.completedAt = new Date().toISOString();
      this.memoryState.treasury.totalVolumeUsd += Number(updated.fromAmount || 0);
      this.memoryState.treasury.totalSwapsCount += 1;
      const feeToken = updated.fromToken;
      if (this.memoryState.treasury[feeToken] !== undefined) {
        this.memoryState.treasury[feeToken] += Number(updated.feeAmount || 0);
      }
    }

    this.memoryState.swaps[idx] = updated;
    if (updated.depositTxHash && !['FAILED', 'CANCELLED'].includes(updated.status)) {
      this.markTxHashConsumed(updated.depositTxHash, {
        module: 'SWAP_DEPOSIT',
        chain: updated.fromChain || '',
        refId: updated.id
      });
    }
    if (updated.payoutTxHash) {
      this.markTxHashConsumed(updated.payoutTxHash, {
        module: 'PROTOCOL_PAYOUT',
        chain: updated.toChain || '',
        refId: updated.id
      });
    }
    if (updated.escrowSweepTxHash) {
      this.markTxHashConsumed(updated.escrowSweepTxHash, {
        module: 'PROTOCOL_SWEEP',
        chain: updated.fromChain || '',
        refId: updated.id
      });
    }
    this.persist();

    // Redis update
    if (this.redisReady && this.redis) {
      this.redis.set(`swap:${updated.id}`, JSON.stringify(updated), 'EX', 86400).catch(() => {});
      this.redis.publish('swap_events', JSON.stringify({ type: 'UPDATED', swap: updated })).catch(() => {});
    }

    // PostgreSQL update
    if (this.pgReady && this.pgPool) {
      this.pgPool.query(`
        UPDATE swaps SET
          status = $1::text,
          deposit_tx_hash = COALESCE($2::text, deposit_tx_hash),
          payout_tx_hash = COALESCE($3::text, payout_tx_hash),
          completed_at = CASE WHEN $1::text = 'COMPLETED' THEN NOW() ELSE completed_at END,
          updated_at = NOW(),
          raw_data = $4::jsonb
        WHERE id = $5::text
      `, [updated.status, updated.depositTxHash, updated.payoutTxHash, JSON.stringify(updated), id])
      .catch(e => console.warn('[DB] PG update error:', e.message));
    }

    return updated;
  }

  getPendingSwaps() {
    return this.memoryState.swaps.filter(s => 
      s.status === 'PENDING_DEPOSIT' || 
      s.status === 'DEPOSIT_DETECTED' || 
      s.status === 'CONFIRMING' ||
      s.status === 'EXECUTING_PAYOUT'
    );
  }

  listSwaps(limit = 20, status = null) {
    let list = this.memoryState.swaps;
    if (status) {
      list = list.filter(s => s.status === status);
    }
    return list.slice(0, limit);
  }

  createLimitOrder(orderData) {
    if (!this.memoryState.limitOrders) this.memoryState.limitOrders = [];

    const order = {
      id: orderData.id || `lmt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userAddress: (orderData.userAddress || '').toLowerCase(),
      fromToken: orderData.fromToken,
      toToken: orderData.toToken,
      fromChain: orderData.fromChain,
      toChain: orderData.toChain,
      fromAmount: parseFloat(orderData.fromAmount),
      targetRate: parseFloat(orderData.targetRate),
      expectedOutput: parseFloat(orderData.expectedOutput || (orderData.fromAmount * orderData.targetRate).toFixed(4)),
      recipientAddress: orderData.recipientAddress,
      depositAddress: orderData.depositAddress,
      derivationPath: orderData.derivationPath || null,
      derivationIndex: orderData.derivationIndex !== undefined ? orderData.derivationIndex : null,
      contractName: orderData.contractName || null,
      timelockExpiry: orderData.timelockExpiry || null,
      orderSeed: orderData.orderSeed || null,
      status: 'OPEN',
      depositTxHash: null,
      payoutTxHash: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      filledAt: null
    };

    this.memoryState.limitOrders.unshift(order);
    this.persist();

    // Redis publish
    if (this.redisReady && this.redis) {
      this.redis.set(`limit_order:${order.id}`, JSON.stringify(order), 'EX', 86400 * 7).catch(() => {});
      this.redis.publish('limit_order_events', JSON.stringify({ type: 'CREATED', order })).catch(() => {});
    }

    // PostgreSQL insert
    if (this.pgReady && this.pgPool) {
      this.pgPool.query(`
        INSERT INTO limit_orders (id, user_address, from_token, to_token, from_chain, to_chain, from_amount, target_rate, expected_output, recipient_address, deposit_address, status, raw_data)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `, [
        order.id, order.userAddress, order.fromToken, order.toToken, order.fromChain, order.toChain,
        order.fromAmount, order.targetRate, order.expectedOutput, order.recipientAddress, order.depositAddress,
        order.status, JSON.stringify(order)
      ]).catch(e => console.warn('[DB] PG limit_order insert error:', e.message));
    }

    return order;
  }

  getLimitOrder(id) {
    if (!this.memoryState.limitOrders) return null;
    return this.memoryState.limitOrders.find(o => o.id === id) || null;
  }

  listLimitOrders(filter = {}) {
    if (!this.memoryState.limitOrders) this.memoryState.limitOrders = [];
    let list = this.memoryState.limitOrders;

    if (filter.userAddress) {
      const u = filter.userAddress.toLowerCase();
      list = list.filter(o => o.userAddress === u);
    }
    if (filter.status) {
      list = list.filter(o => o.status === filter.status);
    }
    return list.slice(0, filter.limit || 50);
  }

  updateLimitOrder(id, updates) {
    if (!this.memoryState.limitOrders) return null;
    const idx = this.memoryState.limitOrders.findIndex(o => o.id === id);
    if (idx === -1) return null;

    const current = this.memoryState.limitOrders[idx];
    const updated = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    if (updates.status === 'FILLED' && current.status !== 'FILLED') {
      updated.filledAt = new Date().toISOString();
    }

    this.memoryState.limitOrders[idx] = updated;
    if (updated.depositTxHash && updated.status !== 'CANCELLED') {
      this.markTxHashConsumed(updated.depositTxHash, {
        module: 'LIMIT_ORDER_DEPOSIT',
        chain: updated.fromChain || '',
        refId: updated.id
      });
    }
    if (updated.payoutTxHash) {
      this.markTxHashConsumed(updated.payoutTxHash, {
        module: 'PROTOCOL_PAYOUT',
        chain: updated.toChain || '',
        refId: updated.id
      });
    }
    this.persist();

    // Redis
    if (this.redisReady && this.redis) {
      this.redis.set(`limit_order:${updated.id}`, JSON.stringify(updated), 'EX', 86400 * 7).catch(() => {});
      this.redis.publish('limit_order_events', JSON.stringify({ type: 'UPDATED', order: updated })).catch(() => {});
    }

    // PostgreSQL update
    if (this.pgReady && this.pgPool) {
      this.pgPool.query(`
        UPDATE limit_orders SET
          status = $1::text,
          deposit_tx_hash = COALESCE($2::text, deposit_tx_hash),
          payout_tx_hash = COALESCE($3::text, payout_tx_hash),
          filled_at = CASE WHEN $1::text = 'FILLED' THEN NOW() ELSE filled_at END,
          updated_at = NOW(),
          raw_data = $4::jsonb
        WHERE id = $5::text
      `, [updated.status, updated.depositTxHash, updated.payoutTxHash, JSON.stringify(updated), id])
      .catch(e => console.warn('[DB] PG limit_order update error:', e.message));
    }

    return updated;
  }

  cancelLimitOrder(id, userAddress) {
    const order = this.getLimitOrder(id);
    if (!order) throw new Error('Limit order not found');
    if (order.status !== 'OPEN') throw new Error(`Cannot cancel order in status ${order.status}`);
    if (!userAddress || typeof userAddress !== 'string' || order.userAddress !== userAddress.trim().toLowerCase()) {
      throw new Error('Unauthorized: only authenticated order creator can cancel');
    }

    return this.updateLimitOrder(id, { status: 'CANCELLED' });
  }

  getTreasuryStats() {
    return {
      ...this.memoryState.treasury,
      liquidity: this.memoryState.liquidity
    };
  }

  getUserBalances(address) {
    if (!address) return {};
    const norm = address.toLowerCase();
    if (!this.memoryState.userBalances) {
      this.memoryState.userBalances = {};
    }
    if (!this.memoryState.userBalances[norm]) {
      this.memoryState.userBalances[norm] = {
        PUSD: 0.0,
        USDC: 0.0,
        USDT: 0.0,
        BCH: 0.0,
        MUSD: 0.0,
        ETH: 0.0,
        SOL: 0.0,
        POL: 0.0
      };
      this.persist();
    }
    return this.memoryState.userBalances[norm];
  }

  updateUserBalance(address, token, delta) {
    if (!address || !token) return null;
    const balances = this.getUserBalances(address);
    const sym = token.toUpperCase();
    balances[sym] = Math.max(0, Number(((balances[sym] || 0) + Number(delta)).toFixed(4)));
    this.persist();
    return balances;
  }

  updateLiquidity(key, amountDelta) {
    if (this.memoryState.liquidity[key] !== undefined) {
      this.memoryState.liquidity[key] += Number(amountDelta);
      this.persist();
    }
  }

  logEvent(type, message, meta = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      type,
      message,
      meta
    };
    this.memoryState.systemLogs.unshift(entry);
    if (this.memoryState.systemLogs.length > 200) {
      this.memoryState.systemLogs.pop();
    }
    this.persist();
  }

  getStatus() {
    return {
      postgres: this.pgReady ? 'ONLINE' : 'FALLBACK_FILE',
      redis: this.redisReady ? 'ONLINE' : 'FALLBACK_MEMORY',
      fileStorage: 'OPERATIONAL',
      totalSwapsRecorded: this.memoryState.swaps.length
    };
  }
}

export const db = new BridgeDatabase();
