import { config } from '../config.js';
import { db } from './db.js';
import { bchService } from './bchService.js';
import { evmService } from './evmService.js';
import { watchmanSentinel } from './watchmanClient.js';
import {
  splitCashAddresses,
  expandBchAddressVariants,
  isSameBchAddress
} from '../utils/bchAddress.js';

let _oraclePool = null;
async function getOraclePool() {
  if (!_oraclePool) {
    try {
      const mod = await import('./oraclePool.js');
      _oraclePool = mod.oraclePool;
    } catch (_) {
      // Graceful fallback
    }
  }
  return _oraclePool;
}

const CANONICAL_POOLS_SEED = {
  PUSD_USDT: {
    id: 'PUSD_USDT',
    pair: 'PUSD / USDT',
    name: 'ParyonUSD ⟷ Tether USD',
    tokenA: 'PUSD',
    tokenB: 'USDT',
    networkA: 'Bitcoin Cash (Mainnet)',
    networkB: 'Polygon (Mainnet)',
    networkBadgeA: 'BCH CashTokens',
    networkBadgeB: 'Polygon PoS',
    iconA: '/PUSD.png',
    iconB: '/USDT.png',
    decimalsA: 6,
    decimalsB: 6,
    reserveA: 0.0,
    reserveB: 0.0,
    totalShares: 1000000.0,
    targetTvlUsd: 50000.0,
    status: 'ACTIVE',
    feePercent: 0.30,
    lpFeePercent: 0.20,
    creatorFeePercent: 0.0,
    protocolFeePercent: 0.10,
    cumulativeFeesA: 0.0,
    cumulativeFeesB: 0.0,
    totalVolumeUsd: 0.0,
    isSponsorPool: true,
    sponsorTag: 'Official BLAZE Track Sponsor (PUSD)',
    isVerified: true,
    verificationBadge: 'Oficial'
  },
  PUSD_USDC: {
    id: 'PUSD_USDC',
    pair: 'PUSD / USDC',
    name: 'ParyonUSD ⟷ USD Coin',
    tokenA: 'PUSD',
    tokenB: 'USDC',
    networkA: 'Bitcoin Cash (Mainnet)',
    networkB: 'Polygon (Mainnet)',
    networkBadgeA: 'BCH CashTokens',
    networkBadgeB: 'Polygon PoS',
    iconA: '/PUSD.png',
    iconB: '/USDC.png',
    decimalsA: 6,
    decimalsB: 6,
    reserveA: 0.0,
    reserveB: 0.0,
    totalShares: 100000.0,
    targetTvlUsd: 50000.0,
    status: 'NO_LIQUIDITY',
    feePercent: 0.30,
    lpFeePercent: 0.20,
    creatorFeePercent: 0.0,
    protocolFeePercent: 0.10,
    cumulativeFeesA: 0.0,
    cumulativeFeesB: 0.0,
    totalVolumeUsd: 0.0,
    isSponsorPool: false,
    isVerified: true,
    verificationBadge: 'Oficial'
  },
  BCH_USDT: {
    id: 'BCH_USDT',
    pair: 'BCH / USDT',
    name: 'Bitcoin Cash ⟷ Tether USD',
    tokenA: 'BCH',
    tokenB: 'USDT',
    networkA: 'Bitcoin Cash (Mainnet)',
    networkB: 'Polygon (Mainnet)',
    networkBadgeA: 'BCH Layer 1',
    networkBadgeB: 'Polygon PoS',
    iconA: '/BCH.png',
    iconB: '/USDT.png',
    decimalsA: 8,
    decimalsB: 6,
    reserveA: 0.0,
    reserveB: 0.0,
    totalShares: 100000.0,
    targetTvlUsd: 50000.0,
    status: 'NO_LIQUIDITY',
    feePercent: 0.30,
    lpFeePercent: 0.20,
    creatorFeePercent: 0.0,
    protocolFeePercent: 0.10,
    cumulativeFeesA: 0.0,
    cumulativeFeesB: 0.0,
    totalVolumeUsd: 0.0,
    isVerified: true,
    verificationBadge: 'Oficial'
  }
};

class PoolService {
  constructor() {
    this.defaultPoolId = 'PUSD_USDT';
    this.initPools();
  }

  initPools() {
    if (!db.memoryState.pools) {
      db.memoryState.pools = {};
    }

    // Purge legacy simulated/filler pools & unbacked pre-audit demo custom pools
    const OBSOLETE_POOLS = ['BCH_USDC', 'BCH_PUSD', 'MUSD_USDC', 'SOL_USDC', 'ETH_USDC', 'POL_USDC', 'LIFT_POL', 'LIFT_USDC'];
    for (const pId of OBSOLETE_POOLS) {
      if (db.memoryState.pools[pId]) {
        delete db.memoryState.pools[pId];
      }
    }
    for (const [pId, pObj] of Object.entries(db.memoryState.pools)) {
      if (pObj?.isCustom && !pObj.networkMode) {
        delete db.memoryState.pools[pId];
      }
    }
    if (Array.isArray(db.memoryState.lpPositions)) {
      db.memoryState.lpPositions = db.memoryState.lpPositions.filter(p => Boolean(p?.txHash));
    }

    for (const [id, seed] of Object.entries(CANONICAL_POOLS_SEED)) {
      const existing = db.memoryState.pools[id] || {};
      db.memoryState.pools[id] = {
        ...seed,
        ...existing,
        id: seed.id,
        pair: seed.pair,
        name: seed.name,
        tokenA: seed.tokenA,
        tokenB: seed.tokenB,
        iconA: seed.iconA,
        iconB: seed.iconB,
        decimalsA: seed.decimalsA,
        decimalsB: seed.decimalsB,
        isSponsorPool: seed.isSponsorPool,
        sponsorTag: seed.sponsorTag,
        isVerified: true,
        verificationBadge: 'Oficial',
        cumulativeFeesA: Number(existing.cumulativeFeesA || 0),
        cumulativeFeesB: Number(existing.cumulativeFeesB || 0),
        totalShares: Number(existing.totalShares || seed.totalShares),
        updatedAt: existing.updatedAt || new Date().toISOString()
      };
    }
    db.persist();
  }

  async initDatabaseTables() {
    this.initPools();
    if (db.pgPool && !this.pgSchemaMigrated) {
      try {
        await db.pgPool.query(`
          CREATE TABLE IF NOT EXISTS liquidity_pools (
            id VARCHAR(64) PRIMARY KEY,
            pair VARCHAR(50) NOT NULL,
            token_a VARCHAR(20) NOT NULL,
            token_b VARCHAR(20) NOT NULL,
            reserve_a NUMERIC NOT NULL,
            reserve_b NUMERIC NOT NULL,
            total_shares NUMERIC NOT NULL,
            status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
            target_tvl_usd NUMERIC NOT NULL DEFAULT 50000.0,
            cumulative_fees_a NUMERIC NOT NULL DEFAULT 0.0,
            cumulative_fees_b NUMERIC NOT NULL DEFAULT 0.0,
            total_volume_usd NUMERIC NOT NULL DEFAULT 0.0,
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS lp_positions (
            id VARCHAR(64) PRIMARY KEY,
            pool_id VARCHAR(64) NOT NULL,
            provider_address TEXT NOT NULL,
            shares NUMERIC NOT NULL,
            deposited_amount NUMERIC NOT NULL,
            token_symbol VARCHAR(20) NOT NULL,
            deposit_usd NUMERIC NOT NULL DEFAULT 0.0,
            tx_hash TEXT,
            network VARCHAR(20) DEFAULT 'testnet',
            bch_address TEXT,
            evm_address TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );

          ALTER TABLE lp_positions ADD COLUMN IF NOT EXISTS deposit_usd NUMERIC NOT NULL DEFAULT 0.0;
          ALTER TABLE lp_positions ADD COLUMN IF NOT EXISTS tx_hash TEXT;
          ALTER TABLE lp_positions ADD COLUMN IF NOT EXISTS network VARCHAR(20) DEFAULT 'testnet';
          ALTER TABLE lp_positions ADD COLUMN IF NOT EXISTS bch_address TEXT;
          ALTER TABLE lp_positions ADD COLUMN IF NOT EXISTS evm_address TEXT;
        `);
        this.pgSchemaMigrated = true;
        console.log('[Pool Service] PostgreSQL liquidity_pools & lp_positions schema verified.');

        // Hydrate LP positions & persisted pool metrics from PG if memory store lacks them
        const [{ rows: poolRows }, { rows: posRows }] = await Promise.all([
          db.pgPool.query('SELECT * FROM liquidity_pools'),
          db.pgPool.query('SELECT * FROM lp_positions ORDER BY created_at DESC LIMIT 1000')
        ]);
        let hydratedCount = 0;
        for (const r of poolRows || []) {
          const existing = db.memoryState.pools[r.id];
          if (existing) {
            if (!existing.cumulativeFeesA && Number(r.cumulative_fees_a || 0) > 0) {
              existing.cumulativeFeesA = Number(r.cumulative_fees_a);
            }
            if (!existing.cumulativeFeesB && Number(r.cumulative_fees_b || 0) > 0) {
              existing.cumulativeFeesB = Number(r.cumulative_fees_b);
            }
            if (!existing.totalVolumeUsd && Number(r.total_volume_usd || 0) > 0) {
              existing.totalVolumeUsd = Number(r.total_volume_usd);
            }
          }
        }
        if (!Array.isArray(db.memoryState.lpPositions)) db.memoryState.lpPositions = [];
        const existingPosIds = new Set(db.memoryState.lpPositions.map(p => p.id));
        for (const row of posRows || []) {
          if (!row.id || !row.tx_hash || existingPosIds.has(row.id)) continue;
          db.memoryState.lpPositions.push({
            id: row.id,
            poolId: row.pool_id,
            providerAddress: row.provider_address,
            bchAddress: row.bch_address || null,
            evmAddress: row.evm_address || null,
            shares: Number(row.shares || 0),
            depositedAmount: Number(row.deposited_amount || 0),
            tokenSymbol: row.token_symbol,
            depositUsd: Number(row.deposit_usd || 0),
            txHash: row.tx_hash,
            network: String(row.network || 'testnet').toLowerCase(),
            createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()
          });
          existingPosIds.add(row.id);
          hydratedCount++;
        }
        if (hydratedCount > 0) {
          db.persist();
          console.log(`[Pool Service] Hydrated ${hydratedCount} LP positions from PostgreSQL.`);
        }
      } catch (err) {
        console.warn('[Pool Service] PG table init note:', err.message);
      }
    }
  }

  async getTokenPrice(sym, poolContext = null) {
    const s = (sym || 'USDT').toUpperCase();
    if (['PUSD', 'USDC', 'USDT', 'MUSD'].includes(s)) return 1.0;
    try {
      const oracle = await getOraclePool();
      if (oracle) {
        const p = await oracle.getPriceUsd(s);
        if (p && p > 0) return p;
      }
    } catch (_) {}

    if (poolContext && poolContext.isCustom && String(poolContext.tokenA || '').toUpperCase() === s) {
      if (poolContext.reserveA > 0 && poolContext.reserveB > 0) {
        const quotePrice = ['PUSD', 'USDC', 'USDT', 'MUSD'].includes(poolContext.tokenB)
          ? 1.0
          : poolContext.tokenB === 'BCH'
          ? 289.13
          : 1.0;
        return Number(((poolContext.reserveB * quotePrice) / poolContext.reserveA).toFixed(6));
      }
      if (Number(poolContext.initialPriceUsd) > 0) {
        return Number(poolContext.initialPriceUsd);
      }
    }

    if (db.memoryState.pools) {
      for (const pool of Object.values(db.memoryState.pools)) {
        if (pool.isCustom && pool.tokenA === s) {
          if (pool.reserveA > 0 && pool.reserveB > 0) {
            const quotePrice = ['PUSD', 'USDC', 'USDT', 'MUSD'].includes(pool.tokenB)
              ? 1.0
              : pool.tokenB === 'BCH'
              ? 289.13
              : 1.0;
            return Number(((pool.reserveB * quotePrice) / pool.reserveA).toFixed(6));
          }
          if (Number(pool.initialPriceUsd) > 0) {
            return Number(pool.initialPriceUsd);
          }
        }
      }
    }

    const FALLBACKS = { BCH: 289.13, ETH: 2345.0, SOL: 101.5, POL: 0.0915, BNB: 749.0, LTC: 84.5, TON: 5.25 };
    return FALLBACKS[s] || 0;
  }

  /**
   * Resolves canonical vault address, chain rail, CashToken categoryId, decimals and explorer
   * for whichever side (`tokenA` or `tokenB`) of a pool is being deposited or released.
   */
  _resolveTokenMeta(pool, tokenSym, isTestnet) {
    const upper = String(tokenSym || '').trim().toUpperCase();
    const symA = String(pool?.tokenA || '').trim().toUpperCase();
    const symB = String(pool?.tokenB || '').trim().toUpperCase();
    const isTokenA = upper === symA;
    const isTokenB = upper === symB;
    const isEvm = upper === 'USDT' || upper === 'USDC';
    const isNativeBch = upper === 'BCH';

    if (isEvm) {
      const vaultAddress = isTestnet
        ? config.evm.amoyVaultAddress
        : evmService.getVaultAddress('polygon_mainnet');
      const tokenAddress = isTestnet
        ? config.evm.amoyTokens?.[upper]?.address ||
          (upper === 'USDC'
            ? '0x08d7CF325c44af76602922cBA6D37E4b267CDa71'
            : '0x1a29793F2a64424D09f56AD045827dF1F0Fa1A75')
        : config.evm.tokens?.[upper]?.address;
      const decimals = Number(isTokenA ? pool?.decimalsA : isTokenB ? pool?.decimalsB : 6) || 6;
      return {
        symbol: upper,
        side: isTokenA ? 'A' : 'B',
        chainType: 'EVM',
        isEvm: true,
        isNativeBch: false,
        categoryId: null,
        decimals,
        vaultAddress,
        tokenAddress,
        explorerUrl: isTestnet
          ? `https://amoy.polygonscan.com/address/${vaultAddress}`
          : `https://polygonscan.com/address/${vaultAddress}`
      };
    }

    const knownTok = config.bch.tokens[upper];
    const knownCat = knownTok
      ? isTestnet && upper === 'PUSD'
        ? knownTok.chipnetCategory || knownTok.category
        : knownTok.category
      : null;

    const explicitCat = isTokenA ? pool?.categoryIdA : isTokenB ? pool?.categoryIdB : null;
    const categoryId = isNativeBch ? null : explicitCat || knownCat || null;
    const explicitDecimals = isTokenA ? pool?.decimalsA : isTokenB ? pool?.decimalsB : undefined;
    const decimals = isNativeBch ? 8 : Number(explicitDecimals ?? knownTok?.decimals ?? 6);

    const vaultAddress = isTestnet
      ? isNativeBch
        ? config.bch.chipnetVaultAddress
        : config.bch.chipnetVaultTokenAddress
      : bchService.getVaultAddress(false, !isNativeBch);

    return {
      symbol: upper,
      side: isTokenB ? 'B' : 'A',
      chainType: 'BCH',
      isEvm: false,
      isNativeBch,
      categoryId,
      decimals,
      vaultAddress,
      tokenAddress: null,
      explorerUrl: isTestnet
        ? `https://chipnet.imaginary.cash/address/${vaultAddress}`
        : `https://3xpl.com/bitcoin-cash/address/${vaultAddress}`
    };
  }

  getPoolTokenMeta(pool, tokenSym, network = 'testnet') {
    const isTestnet = String(network || 'testnet').toLowerCase() === 'testnet';
    return this._resolveTokenMeta(pool, tokenSym, isTestnet);
  }

  /**
   * Computes real completed swap volume & LP fees from genuine settled swaps
   */
  getRealCompletedPairStats(tokenA, tokenB, isTestnet) {
    const swaps = Array.isArray(db.memoryState.swaps) ? db.memoryState.swaps : [];
    const a = (tokenA || '').toUpperCase();
    const b = (tokenB || '').toUpperCase();

    let volumeUsd = 0;
    let lpFeesA = 0;
    let lpFeesB = 0;

    for (const s of swaps) {
      if (s.status !== 'COMPLETED') continue;
      const from = (s.fromToken || '').toUpperCase();
      const to = (s.toToken || '').toUpperCase();
      const pairMatch = (from === a && to === b) || (from === b && to === a);
      if (!pairMatch) continue;

      const swapIsTestnet =
        String(s.fromChain || '').toLowerCase().includes('chipnet') ||
        String(s.fromChain || '').toLowerCase().includes('amoy') ||
        String(s.toChain || '').toLowerCase().includes('chipnet') ||
        String(s.toChain || '').toLowerCase().includes('amoy');

      if (Boolean(isTestnet) !== swapIsTestnet) continue;

      const amt = Number(s.fromAmount || 0);
      const fee = Number(s.feeAmount || amt * 0.003);
      const lpCut = fee * (0.20 / 0.30);

      volumeUsd += amt;
      if (from === a) lpFeesA += lpCut;
      if (from === b) lpFeesB += lpCut;
    }

    return {
      volumeUsd: Number(volumeUsd.toFixed(2)),
      lpFeesA: Number(lpFeesA.toFixed(6)),
      lpFeesB: Number(lpFeesB.toFixed(6))
    };
  }

  getPool(poolId = this.defaultPoolId) {
    this.initPools();
    const pid = poolId || this.defaultPoolId;
    let pool = db.memoryState.pools[pid];
    if (!pool) {
      const normalized = pid.toUpperCase().replace('/', '_').replace('-', '_');
      pool = db.memoryState.pools[normalized] || db.memoryState.pools[this.defaultPoolId];
    }
    pool.reserveBch = Number(pool.reserveA || 0);
    pool.reserveEvm = Number(pool.reserveB || 0);
    pool.bchToken = pool.tokenA;
    pool.evmToken = pool.tokenB;
    return pool;
  }

  async resolveLiveVaultBalances(providedVaultBalances = null) {
    if (providedVaultBalances) return providedVaultBalances;
    if (this._vaultCache && Date.now() - this._vaultCacheTs < 5000) {
      return this._vaultCache;
    }
    try {
      const [bchBalances, evmBalances] = await Promise.all([
        bchService.getBalances(),
        evmService.getBalances()
      ]);
      const live = {
        chipnetPusd: Number(bchBalances?.chipnet?.PUSD || 0),
        chipnetBch: Number(bchBalances?.chipnet?.bch || 0),
        amoyUsdt: Number(evmBalances?.amoy?.USDT || 0),
        amoyUsdc: Number(evmBalances?.amoy?.USDC || 0),
        mainnetPusd: Number(bchBalances?.mainnet?.PUSD || 0),
        mainnetUsdc: Number(evmBalances?.mainnet?.USDC || 0),
        mainnetUsdt: Number(evmBalances?.mainnet?.USDT || 0),
        degraded: false
      };
      this._vaultCache = live;
      this._vaultCacheTs = Date.now();
      return live;
    } catch (err) {
      console.warn('[Pool Service] Live vault balance query failed:', err.message);
      return {
        chipnetPusd: 0,
        chipnetBch: 0,
        amoyUsdt: 0,
        amoyUsdc: 0,
        mainnetPusd: 0,
        mainnetUsdc: 0,
        mainnetUsdt: 0,
        degraded: true
      };
    }
  }

  async enrichPoolData(pool, { network = 'mainnet', vaultBalances = null } = {}) {
    const isTestnet = String(network || 'mainnet').toLowerCase() === 'testnet';
    const reqNet = isTestnet ? 'testnet' : 'mainnet';
    const vb = await this.resolveLiveVaultBalances(vaultBalances);

    const priceA = await this.getTokenPrice(pool.tokenA, pool);
    const priceB = await this.getTokenPrice(pool.tokenB, pool);

    // Sum genuine on-chain verified LP positions for this specific pool and network
    const allPositions = Array.isArray(db.memoryState.lpPositions) ? db.memoryState.lpPositions : [];
    const poolPositions = allPositions.filter(
      p => p.poolId === pool.id && String(p.network || 'testnet').toLowerCase() === reqNet && Boolean(p.txHash)
    );
    const posDepositsA = poolPositions
      .filter(p => String(p.tokenSymbol || '').toUpperCase() === String(pool.tokenA || '').toUpperCase())
      .reduce((s, p) => s + Number(p.depositedAmount || 0), 0);
    const posDepositsB = poolPositions
      .filter(p => String(p.tokenSymbol || '').toUpperCase() === String(pool.tokenB || '').toUpperCase())
      .reduce((s, p) => s + Number(p.depositedAmount || 0), 0);
    const posTotalDepositUsd = poolPositions.reduce((s, p) => s + Number(p.depositUsd || 0), 0);
    const posTotalShares = poolPositions.reduce((s, p) => s + Number(p.shares || 0), 0);

    const metaA = this._resolveTokenMeta(pool, pool.tokenA, isTestnet);
    const metaB = this._resolveTokenMeta(pool, pool.tokenB, isTestnet);

    let effectiveReserveA = 0;
    let effectiveReserveB = 0;
    let effectiveStatus = pool.status || 'NO_LIQUIDITY';
    let hasLiquidity = false;
    let liquidityBadge = 'Sin Liquidez';
    let networkA = isTestnet ? 'BCH Chipnet (Testnet4)' : 'Bitcoin Cash (Mainnet)';
    let networkB = metaB.isEvm
      ? isTestnet
        ? 'Polygon Amoy (Testnet)'
        : 'Polygon (Mainnet)'
      : isTestnet
      ? 'BCH Chipnet (Testnet4)'
      : 'Bitcoin Cash (Mainnet)';
    let networkBadgeA = metaA.isNativeBch
      ? isTestnet
        ? 'BCH Chipnet'
        : 'BCH Layer 1'
      : isTestnet
      ? 'Chipnet CashTokens'
      : 'BCH CashTokens';
    let networkBadgeB = metaB.isEvm
      ? isTestnet
        ? 'Polygon Amoy'
        : 'Polygon PoS'
      : metaB.isNativeBch
      ? isTestnet
        ? 'BCH Chipnet'
        : 'BCH Layer 1'
      : isTestnet
      ? 'Chipnet CashTokens'
      : 'BCH CashTokens';
    const categoryIdA = metaA.categoryId;
    const categoryIdB = metaB.categoryId;
    const vaultAddressA = metaA.vaultAddress;
    const vaultAddressB = metaB.vaultAddress;
    const tokenAddressB = metaB.tokenAddress;
    const contractExplorerA = metaA.explorerUrl;
    const contractExplorerB = metaB.explorerUrl;

    if (!pool.isCustom) {
      if (isTestnet) {
        if (pool.id === 'PUSD_USDT') {
          // On-chain Chipnet Covenant already includes LP PUSD deposits — avoid double counting!
          const livePusd = Number(vb.chipnetPusd || 0);
          effectiveReserveA = livePusd > 0 ? livePusd : posDepositsA;
          effectiveReserveB = Number(vb.amoyUsdt || 0);
          hasLiquidity = effectiveReserveA > 0 && effectiveReserveB > 0;
          effectiveStatus = hasLiquidity ? 'ACTIVE' : 'NO_LIQUIDITY';
          liquidityBadge = hasLiquidity ? 'Liquidez On-Chain Activa' : 'Sin Liquidez';
        } else {
          // Secondary canonical pairs on Testnet reflect genuine user LP deposits into this pair
          effectiveReserveA = posDepositsA;
          effectiveReserveB = posDepositsB;
          hasLiquidity = effectiveReserveA > 0 || effectiveReserveB > 0;
          effectiveStatus = hasLiquidity ? 'ACTIVE' : 'NO_LIQUIDITY';
          liquidityBadge = hasLiquidity ? 'Liquidez On-Chain Activa' : 'Sin Liquidez';
        }
      } else {
        // Mainnet: strictly non-simulated (0 reserves unless funded on-chain)
        const mainPusd = pool.id === 'PUSD_USDT' ? Number(vb.mainnetPusd || 0) : 0;
        const mainUsdt = pool.id === 'PUSD_USDT' ? Number(vb.mainnetUsdt || 0) : 0;
        effectiveReserveA = mainPusd > 0 ? mainPusd : posDepositsA;
        effectiveReserveB = mainUsdt > 0 ? mainUsdt : posDepositsB;
        hasLiquidity = effectiveReserveA > 0 || effectiveReserveB > 0;
        effectiveStatus = hasLiquidity ? 'ACTIVE' : 'NO_LIQUIDITY';
        liquidityBadge = hasLiquidity ? 'Liquidez On-Chain Activa' : 'Sin Liquidez';
      }
    } else {
      // Custom registered pairs reflect genuine verified LP deposits on-chain
      effectiveReserveA = posDepositsA;
      effectiveReserveB = posDepositsB;
      const customTvl = effectiveReserveA * priceA + effectiveReserveB * priceB;
      if (pool.poolMode === 'BOOTSTRAPPING') {
        if (customTvl >= Number(pool.targetTvlUsd || 2500)) {
          hasLiquidity = true;
          effectiveStatus = 'ACTIVE';
          liquidityBadge = 'Liquidez On-Chain Activa';
        } else {
          hasLiquidity = customTvl > 0;
          effectiveStatus = 'BOOTSTRAPPING';
          liquidityBadge = customTvl > 0 ? 'En Fondeo On-Chain' : 'Sin Liquidez';
        }
      } else {
        hasLiquidity = customTvl > 0;
        effectiveStatus = hasLiquidity ? 'ACTIVE' : 'NO_LIQUIDITY';
        liquidityBadge = hasLiquidity ? 'Liquidez On-Chain Activa' : 'Sin Liquidez';
      }
    }

    const valA = effectiveReserveA * priceA;
    const valB = effectiveReserveB * priceB;
    const tvlUsd = Number((valA + valB).toFixed(2));

    const realSwapMetrics = pool.isCustom
      ? {
          volumeUsd: Number(pool.totalVolumeUsd || 0),
          lpFeesA: Number(pool.cumulativeFeesA || 0),
          lpFeesB: Number(pool.cumulativeFeesB || 0)
        }
      : this.getRealCompletedPairStats(pool.tokenA, pool.tokenB, isTestnet);

    const rawCumulativeFeesUsd = Number(
      (realSwapMetrics.lpFeesA * priceA + realSwapMetrics.lpFeesB * priceB).toFixed(4)
    );
    const cumulativeFeesUsd = Math.max(
      0,
      Number((rawCumulativeFeesUsd - Number(pool.claimedFeesUsd || 0)).toFixed(4))
    );

    // Annualized APY strictly derived from real completed swap volume; 0.0% when volume or liquidity is zero
    const apy =
      hasLiquidity && tvlUsd > 0 && realSwapMetrics.volumeUsd > 0
        ? Number(
            ((((realSwapMetrics.volumeUsd * (pool.lpFeePercent / 100)) * 365) / tvlUsd) * 100).toFixed(2)
          )
        : 0.0;

    // Maintain 1 LP Share = $1.00 USD base parity before fee accrual
    const baseProtocolTvl = Math.max(0, tvlUsd - posTotalDepositUsd);
    const baseTotalShares =
      tvlUsd > 0
        ? Math.max(1, Number((baseProtocolTvl + posTotalShares).toFixed(4)))
        : Number(pool.totalShares || 100000);

    const fundingProgress = pool.targetTvlUsd > 0
      ? Number(Math.min(100, (tvlUsd / pool.targetTvlUsd) * 100).toFixed(1))
      : 0;

    const remainingFundingUsd = effectiveStatus === 'BOOTSTRAPPING'
      ? Math.max(0, Number((pool.targetTvlUsd - tvlUsd).toFixed(2)))
      : 0;

    return {
      ...pool,
      network: reqNet,
      networkA,
      networkB,
      networkBadgeA,
      networkBadgeB,
      categoryIdA,
      categoryIdB,
      vaultAddressA,
      vaultAddressB,
      tokenAddressB,
      contractExplorerA,
      contractExplorerB,
      reserveA: Number(effectiveReserveA.toFixed(4)),
      reserveB: Number(effectiveReserveB.toFixed(4)),
      totalShares: Number(baseTotalShares.toFixed(4)),
      status: effectiveStatus,
      hasLiquidity,
      liquidityBadge,
      priceA: Number(priceA.toFixed(4)),
      priceB: Number(priceB.toFixed(4)),
      reserveAValueUsd: Number(valA.toFixed(2)),
      reserveBValueUsd: Number(valB.toFixed(2)),
      tvlUsd,
      totalVolumeUsd: realSwapMetrics.volumeUsd,
      cumulativeFeesA: realSwapMetrics.lpFeesA,
      cumulativeFeesB: realSwapMetrics.lpFeesB,
      cumulativeFeesUsd,
      apyPercentage: apy,
      sharePriceUsd:
        baseTotalShares > 0 && tvlUsd > 0
          ? Number(((tvlUsd + cumulativeFeesUsd) / baseTotalShares).toFixed(4))
          : 1.0,
      fundingProgress,
      remainingFundingUsd,
      feeDistribution: {
        lpCutPercent: pool.lpFeePercent,
        protocolCutPercent: pool.protocolFeePercent,
        totalFeePercent: pool.feePercent
      }
    };
  }

  async getAllPools({ network = 'mainnet', vaultBalances = null } = {}) {
    this.initPools();
    const isTestnet = String(network || 'mainnet').toLowerCase() === 'testnet';
    const vb = await this.resolveLiveVaultBalances(vaultBalances);

    const rawPools = Object.values(db.memoryState.pools).filter(p => {
      if (!p.isCustom) return true;
      const poolNet = p.networkMode || 'testnet';
      return isTestnet ? poolNet === 'testnet' : poolNet === 'mainnet';
    });

    const enriched = await Promise.all(
      rawPools.map(p => this.enrichPoolData(p, { network, vaultBalances: vb }))
    );
    enriched.sort((a, b) => {
      if (Boolean(b.hasLiquidity) !== Boolean(a.hasLiquidity)) {
        return b.hasLiquidity ? 1 : -1;
      }
      if (Boolean(b.isSponsorPool) !== Boolean(a.isSponsorPool)) {
        return b.isSponsorPool ? 1 : -1;
      }
      return (b.tvlUsd || 0) - (a.tvlUsd || 0);
    });
    return enriched;
  }

  async getStats(poolId = this.defaultPoolId, { network = 'mainnet', vaultBalances = null } = {}) {
    const vb = await this.resolveLiveVaultBalances(vaultBalances);
    const all = await this.getAllPools({ network, vaultBalances: vb });
    const defaultPool = all.find(p => p.id === poolId) || all[0];

    const totalTvlUsd = Number(all.reduce((acc, p) => acc + p.tvlUsd, 0).toFixed(2));
    const totalVolumeUsd = Number(all.reduce((acc, p) => acc + p.totalVolumeUsd, 0).toFixed(2));
    const totalCumulativeFeesUsd = Number(all.reduce((acc, p) => acc + p.cumulativeFeesUsd, 0).toFixed(4));
    const activeCount = all.filter(p => p.status === 'ACTIVE' && p.hasLiquidity).length;
    const bootstrappingCount = all.filter(p => p.status === 'BOOTSTRAPPING').length;
    const noLiquidityCount = all.filter(p => !p.hasLiquidity && p.status !== 'BOOTSTRAPPING').length;

    return {
      pool: defaultPool,
      allPools: all,
      protocolStats: {
        network: String(network || 'mainnet').toLowerCase(),
        totalTvlUsd,
        totalVolumeUsd,
        totalCumulativeFeesUsd,
        activePoolsCount: activeCount,
        bootstrappingPoolsCount: bootstrappingCount,
        noLiquidityPoolsCount: noLiquidityCount,
        totalPoolsCount: all.length,
        lpFeeShare: '0.20%',
        protocolTreasuryShare: '0.10%'
      }
    };
  }

  accrueSwapFee(fromToken, swapAmount, feeAmount, toToken = null) {
    this.initPools();
    const from = (fromToken || '').toUpperCase();
    const to = (toToken || '').toUpperCase();

    let targetPool = null;
    for (const p of Object.values(db.memoryState.pools)) {
      if ((p.tokenA === from && p.tokenB === to) || (p.tokenA === to && p.tokenB === from)) {
        targetPool = p;
        break;
      }
    }
    if (!targetPool) {
      targetPool = this.getPool(this.defaultPoolId);
    }

    const lpFeeCut = Number(feeAmount || 0) * (0.20 / 0.30);
    if (from === targetPool.tokenA) {
      targetPool.cumulativeFeesA = Number((targetPool.cumulativeFeesA || 0) + lpFeeCut);
    } else {
      targetPool.cumulativeFeesB = Number((targetPool.cumulativeFeesB || 0) + lpFeeCut);
    }
    targetPool.totalVolumeUsd = Number((targetPool.totalVolumeUsd || 0) + Number(swapAmount || 0));
    targetPool.updatedAt = new Date().toISOString();
    db.persist();

    if (db.redisReady && db.redis) {
      db.redis
        .publish('pool_events', JSON.stringify({ type: 'FEE_ACCRUED', poolId: targetPool.id, lpFeeCut, fromToken }))
        .catch(() => {});
    }
    return targetPool;
  }

  isTxHashAlreadyUsed(txHash) {
    if (!txHash) return false;
    return db.isTxHashConsumed(txHash);
  }

  async createCustomPool({
    creatorAddress,
    tokenA,
    tokenB,
    tokenAName,
    tokenBName,
    network = 'testnet',
    networkA = null,
    networkB = null,
    networkBadgeA = null,
    networkBadgeB = null,
    categoryIdA = null,
    categoryIdB = null,
    decimalsA = null,
    decimalsB = null,
    iconA = null,
    iconB = null,
    poolMode = 'BOOTSTRAPPING',
    targetTvlUsd = 2500,
    initialAmountA = 0,
    initialAmountB = 0,
    initialPriceUsd = 0.01
  }) {
    if (!creatorAddress) throw new Error('Conecta tu billetera antes de registrar un nuevo par.');
    if (!tokenA || !tokenB) throw new Error('Se requieren los símbolos de ambos tokens.');

    const isTestnet = String(network || 'testnet').toLowerCase() === 'testnet';
    const symA = tokenA.trim().toUpperCase();
    const symB = tokenB.trim().toUpperCase();

    if (symA === symB) throw new Error('Los tokens del par deben ser diferentes.');

    if (symA === 'BCH' || symB === 'BCH') {
      throw new Error(
        'Los pools personalizados operan con CashTokens en Bitcoin Cash o USDT/USDC en Polygon. BCH nativo solo opera como colateral en Lend.'
      );
    }
    if (symA === 'USDT' || symA === 'USDC') {
      throw new Error('El Token 1 debe ser un CashToken de Bitcoin Cash (USDT/USDC van en Token 2).');
    }

    const resolveKnownCategory = sym => {
      const tok = config.bch.tokens[sym];
      if (!tok) return null;
      return isTestnet && sym === 'PUSD' ? tok.chipnetCategory || tok.category : tok.category;
    };

    const normalizeCat = (rawCat, label) => {
      if (!rawCat || !String(rawCat).trim()) return null;
      const cleanCat = String(rawCat).trim().toLowerCase();
      if (!/^[0-9a-f]{64}$/.test(cleanCat)) {
        throw new Error(`El CashToken Category ID de ${label} debe ser un hash hexadecimal válido de 64 caracteres.`);
      }
      return cleanCat;
    };

    const isEvmB = symB === 'USDT' || symB === 'USDC';
    const finalCatA = normalizeCat(categoryIdA, symA) || resolveKnownCategory(symA);
    if (!finalCatA) {
      throw new Error(
        `Ingresa un CashToken Category ID válido (64 hex) para ${symA} para poder verificar depósitos on-chain.`
      );
    }

    const finalCatB = isEvmB
      ? null
      : normalizeCat(categoryIdB, symB) || resolveKnownCategory(symB);
    if (!isEvmB && !finalCatB) {
      throw new Error(
        `Ingresa un CashToken Category ID válido (64 hex) para ${symB} o elige PUSD / USDT / USDC.`
      );
    }

    const parsedDecA = decimalsA !== null && decimalsA !== undefined && decimalsA !== ''
      ? Math.min(18, Math.max(0, Number(decimalsA)))
      : config.bch.tokens[symA]?.decimals ?? 6;
    const parsedDecB = decimalsB !== null && decimalsB !== undefined && decimalsB !== ''
      ? Math.min(18, Math.max(0, Number(decimalsB)))
      : isEvmB
      ? 6
      : config.bch.tokens[symB]?.decimals ?? 6;

    const poolId = `${symA}_${symB}${isTestnet ? '_TESTNET' : ''}`;
    const reversePoolId = `${symB}_${symA}${isTestnet ? '_TESTNET' : ''}`;
    this.initPools();

    if (
      db.memoryState.pools[poolId] ||
      db.memoryState.pools[reversePoolId] ||
      CANONICAL_POOLS_SEED[`${symA}_${symB}`] ||
      CANONICAL_POOLS_SEED[`${symB}_${symA}`]
    ) {
      throw new Error(`El par de liquidez ${symA} / ${symB} ya existe en el protocolo.`);
    }

    const isBootstrapping = poolMode === 'BOOTSTRAPPING';
    const targetTvl = Math.max(500, Number(targetTvlUsd) || 2500);

    const resolveIcon = (icon, fallback) => {
      if (!icon || typeof icon !== 'string') return fallback;
      const clean = icon.trim();
      if (clean.startsWith('ipfs://')) {
        return `https://ipfs.io/ipfs/${clean.replace('ipfs://', '')}`;
      }
      return clean;
    };

    const knownIcons = {
      PUSD: '/PUSD.png',
      USDT: '/USDT.png',
      USDC: '/USDC.png',
      MUSD: '/MUSD.png',
      LIFT: '/LIFT.png',
      BCH: '/BCH.png'
    };
    const defaultIconA = knownIcons[symA] || '/BCH.png';
    const defaultIconB = knownIcons[symB] || '/BCH.png';

    const newPool = {
      id: poolId,
      pair: `${symA} / ${symB}`,
      name: `${tokenAName || symA} ⟷ ${tokenBName || symB}`,
      tokenA: symA,
      tokenB: symB,
      networkMode: isTestnet ? 'testnet' : 'mainnet',
      networkA: networkA || (isTestnet ? 'BCH Chipnet (Testnet4)' : 'Bitcoin Cash (Mainnet)'),
      networkB:
        networkB ||
        (isEvmB
          ? isTestnet
            ? 'Polygon Amoy (Testnet)'
            : 'Polygon (Mainnet)'
          : isTestnet
          ? 'BCH Chipnet (Testnet4)'
          : 'Bitcoin Cash (Mainnet)'),
      networkBadgeA: networkBadgeA || (isTestnet ? 'Chipnet CashTokens' : 'BCH CashTokens'),
      networkBadgeB:
        networkBadgeB ||
        (isEvmB
          ? isTestnet
            ? 'Polygon Amoy'
            : 'Polygon PoS'
          : isTestnet
          ? 'Chipnet CashTokens'
          : 'BCH CashTokens'),
      iconA: resolveIcon(iconA, defaultIconA),
      iconB: resolveIcon(iconB, defaultIconB),
      decimalsA: Number.isFinite(parsedDecA) ? parsedDecA : 6,
      decimalsB: Number.isFinite(parsedDecB) ? parsedDecB : 6,
      categoryIdA: finalCatA,
      categoryIdB: finalCatB,
      // Custom pools start at 0 real reserves until funded on-chain (no fake unbacked numbers)
      reserveA: 0,
      reserveB: 0,
      totalShares: 1000.0,
      targetTvlUsd: targetTvl,
      status: isBootstrapping ? 'BOOTSTRAPPING' : 'NO_LIQUIDITY',
      feePercent: 0.30,
      lpFeePercent: 0.20,
      creatorFeePercent: isBootstrapping ? 0.10 : 0.0,
      protocolFeePercent: isBootstrapping ? 0.00 : 0.10,
      cumulativeFeesA: 0,
      cumulativeFeesB: 0,
      totalVolumeUsd: 0,
      isCustom: true,
      creatorAddress: creatorAddress.toLowerCase(),
      poolMode,
      initialPriceUsd: Number(initialPriceUsd) || 0.01,
      liquidityLocked: isBootstrapping,
      isVerified: false,
      verificationBadge: 'Comunitario',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.memoryState.pools[poolId] = newPool;
    db.persist();

    db.logEvent('CUSTOM_POOL_CREATED', `Custom pool registered: ${symA}/${symB} by ${creatorAddress}`, {
      poolId,
      creator: creatorAddress,
      network: newPool.networkMode,
      poolMode
    });

    return await this.enrichPoolData(newPool, { network: newPool.networkMode });
  }

  /**
   * 100% Non-Custodial Liquidity Provision:
   * Verifies the real on-chain deposit into `BinaryLiquidVault.sol` (EVM) or `BinaryLiquidVault.cash` (BCH)
   * before minting LP Shares!
   */
  async addLiquidity({
    providerAddress,
    bchAddress = null,
    evmAddress = null,
    token,
    amount,
    poolId = this.defaultPoolId,
    txHash = null,
    network = 'testnet'
  }) {
    const cleanProvider = (providerAddress || bchAddress || evmAddress || '').trim();
    const depositNum = parseFloat(amount);

    if (!cleanProvider || isNaN(depositNum) || depositNum <= 0) {
      throw new Error('Dirección de billetera y monto válido mayores a cero son obligatorios.');
    }

    const isTestnet = String(network || 'testnet').toLowerCase() === 'testnet';
    const reqNet = isTestnet ? 'testnet' : 'mainnet';
    const pool = this.getPool(poolId);
    const depositToken = (token || pool.tokenA).toUpperCase();
    const allowedTokens = [String(pool.tokenA || '').toUpperCase(), String(pool.tokenB || '').toUpperCase()];

    if (!allowedTokens.includes(depositToken)) {
      throw new Error(`El token ${depositToken} no pertenece al par ${pool.pair}.`);
    }

    const isEvmDeposit = ['USDT', 'USDC'].includes(depositToken);
    let cleanTxHash = txHash ? txHash.trim() : '';

    if (isEvmDeposit && (!cleanTxHash || cleanTxHash.length < 20)) {
      throw new Error(
        `Se requiere la firma de depósito Web3 (0x... txHash) de ${depositToken} hacia BinaryLiquidVault.sol.`
      );
    }

    const lockKey =
      cleanTxHash && cleanTxHash !== 'AUTO_DETECT'
        ? `lp_add_tx:${cleanTxHash.toLowerCase()}`
        : `lp_add_user:${pool.id}:${cleanProvider.toLowerCase()}`;

    return db.withLock(lockKey, async () => {
      if (cleanTxHash && cleanTxHash !== 'AUTO_DETECT' && this.isTxHashAlreadyUsed(cleanTxHash)) {
        throw new Error('Este Hash de Transacción ya fue registrado previamente (protección Anti-Replay activa).');
      }

      // Measure pre-deposit pool state
      const prePoolState = await this.enrichPoolData(pool, { network: reqNet });

    let verifiedAmount = depositNum;
    let explorerUrl = '';

    if (isEvmDeposit) {
      const chainKey = isTestnet ? 'polygon_amoy' : 'polygon_mainnet';
      const vaultAddr = evmService.getVaultAddress(chainKey);
      const verification = await evmService.verifyDeposit(
        cleanTxHash,
        depositNum,
        depositToken,
        vaultAddr,
        chainKey
      );
      if (!verification.verified) {
        throw new Error(
          verification.reason || `No se pudo verificar el depósito de ${depositToken} en BinaryLiquidVault.sol.`
        );
      }
      const expectedEvmSender = (evmAddress || (cleanProvider.startsWith('0x') ? cleanProvider : ''))
        .trim()
        .toLowerCase();
      if (
        verification.sender &&
        expectedEvmSender &&
        verification.sender.toLowerCase() !== expectedEvmSender
      ) {
        throw new Error(
          `El remitente on-chain del depósito (${verification.sender.slice(0, 10)}...) no coincide con tu billetera EVM conectada (${expectedEvmSender.slice(0, 10)}...).`
        );
      }
      verifiedAmount = Number(verification.amount || depositNum);
      explorerUrl = isTestnet
        ? `https://amoy.polygonscan.com/tx/${cleanTxHash}`
        : `https://polygonscan.com/tx/${cleanTxHash}`;
    } else {
      // BCH / CashTokens side: strictly verify on-chain UTXO or transaction on Chipnet / Mainnet
      await bchService.readyPromise;
      const provider = isTestnet ? bchService.chipnetProvider : bchService.mainnetProvider;
      const tokenMeta = this._resolveTokenMeta(pool, depositToken, isTestnet);
      const isNativeBch = tokenMeta.isNativeBch;
      const vaultTargetAddr = tokenMeta.vaultAddress;
      const tokenCat = tokenMeta.categoryId;
      const tokenDecimals = tokenMeta.decimals;

      if (!isNativeBch && !tokenCat) {
        throw new Error(`El CashToken ${depositToken} no tiene un Category ID configurado en este pool.`);
      }

      let cleanHex = cleanTxHash && cleanTxHash !== 'AUTO_DETECT' ? cleanTxHash.replace(/^0x/i, '').toLowerCase() : '';
      const wasAutoDetected = !cleanHex;
      if (cleanHex && !/^[0-9a-f]{64}$/.test(cleanHex)) {
        throw new Error('El TXID de Bitcoin Cash debe tener exactamente 64 caracteres hexadecimales.');
      }

      let matchedAmount = 0;
      if (provider) {
        const utxos = await provider.getUtxos(vaultTargetAddr);

        // If AUTO_DETECT or empty txHash, find an unredeemed UTXO at the Covenant within a tight [0.99, 1.05] band
        if (!cleanHex) {
          const candidates = (utxos || []).filter(u => {
            if (!u.txid || this.isTxHashAlreadyUsed(u.txid)) return false;
            if (isNativeBch) {
              const bchAmt = Number(u.satoshis || 0n) / 1e8;
              return !u.token && bchAmt >= depositNum * 0.99 && bchAmt <= depositNum * 1.05;
            }
            if (u.token?.category !== tokenCat || BigInt(u.token?.amount || 0) <= 0n) return false;
            const rawNum = Number(u.token.amount);
            const decNum = rawNum / (10 ** tokenDecimals);
            return decNum >= depositNum * 0.99 && decNum <= depositNum * 1.05;
          });

          if (candidates.length === 0) {
            throw new Error(
              `No se detectó ningún UTXO nuevo de ${depositNum} ${depositToken} en el Covenant (${vaultTargetAddr}). Firma con tu wallet o pega el TXID.`
            );
          }
          cleanHex = candidates[0].txid.toLowerCase();
          cleanTxHash = cleanHex;
        }

        const matchingUtxos = (utxos || []).filter(u => {
          if (u.txid?.toLowerCase() !== cleanHex) return false;
          if (isNativeBch) return BigInt(u.satoshis || 0) > 0n;
          return u.token?.category === tokenCat && BigInt(u.token?.amount || 0) > 0n;
        });

        if (matchingUtxos.length > 0) {
          if (isNativeBch) {
            const sats = matchingUtxos.reduce((s, u) => s + BigInt(u.satoshis || 0), 0n);
            matchedAmount = Number(sats) / 1e8;
          } else {
            const units = matchingUtxos.reduce((s, u) => s + BigInt(u.token.amount || 0), 0n);
            matchedAmount = Number(units) / (10 ** tokenDecimals);
          }
        } else {
          // Cryptographically inspect raw transaction outputs on Electrum in case UTXO was consolidated
          try {
            const rawHex = await provider.getRawTransaction(cleanHex);
            const parsedCheck = bchService._verifyRawTxHexOutputs(rawHex, {
              depositAddress: vaultTargetAddr,
              isNativeBch,
              expectedCat: tokenCat,
              decimals: tokenDecimals,
              expectedAmountNum: depositNum
            });
            if (!parsedCheck.matched) {
              throw new Error('Outputs no coinciden con el Covenant y monto requerido');
            }
            matchedAmount = parsedCheck.amount;
          } catch (_) {
            throw new Error(
              `No se encontró ningún depósito verificado de ${depositNum} ${depositToken} con TXID ${cleanHex.slice(0, 12)}... hacia el Covenant (${vaultTargetAddr}).`
            );
          }
        }
      }

      if (matchedAmount < depositNum * 0.98) {
        throw new Error(
          `El UTXO detectado en el Covenant (${matchedAmount} ${depositToken}) es menor al monto declarado (${depositNum} ${depositToken}).`
        );
      }
      verifiedAmount = wasAutoDetected ? Math.min(matchedAmount, depositNum) : matchedAmount;
      cleanTxHash = cleanHex;
      explorerUrl = isTestnet
        ? `https://chipnet.imaginary.cash/tx/${cleanHex}`
        : `https://3xpl.com/bitcoin-cash/transaction/${cleanHex}`;
    }

    // Compute LP Shares (1 LP Share = $1.00 USD base parity)
    const price = await this.getTokenPrice(depositToken, pool);
    const depositUsd = Number((verifiedAmount * price).toFixed(2));
    const sharePrice = prePoolState.sharePriceUsd > 0 ? prePoolState.sharePriceUsd : 1.0;
    const sharesToMint = Number((depositUsd / sharePrice).toFixed(4));

    if (!db.memoryState.lpPositions) {
      db.memoryState.lpPositions = [];
    }

    const positionId = `lp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const position = {
      id: positionId,
      poolId: pool.id,
      pair: pool.pair,
      providerAddress: cleanProvider.toLowerCase(),
      bchAddress: bchAddress ? bchAddress.toLowerCase() : (cleanProvider.startsWith('bch') ? cleanProvider.toLowerCase() : null),
      evmAddress: evmAddress ? evmAddress.toLowerCase() : (cleanProvider.startsWith('0x') ? cleanProvider.toLowerCase() : null),
      shares: sharesToMint,
      depositedAmount: verifiedAmount,
      tokenSymbol: depositToken,
      depositUsd,
      txHash: cleanTxHash,
      explorerUrl,
      network: reqNet,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.memoryState.lpPositions.push(position);
    if (cleanTxHash && cleanTxHash !== 'AUTO_DETECT') {
      db.markTxHashConsumed(cleanTxHash, {
        module: 'LP_DEPOSIT',
        poolId: pool.id,
        positionId: position.id,
        tokenSymbol: depositToken,
        amount: verifiedAmount
      });
    }

    // Re-evaluate pool state after recording the new LP position
    const postPoolState = await this.enrichPoolData(pool, { network: reqNet });
    const unlockedNow = prePoolState.status !== 'ACTIVE' && postPoolState.status === 'ACTIVE';
    if (unlockedNow) {
      pool.status = 'ACTIVE';
    }
    pool.totalShares = postPoolState.totalShares;
    pool.updatedAt = new Date().toISOString();
    db.persist();

    if (db.pgReady && db.pgPool) {
      try {
        await db.pgPool.query(
          `INSERT INTO lp_positions (id, pool_id, provider_address, shares, deposited_amount, token_symbol, deposit_usd, tx_hash, network, bch_address, evm_address)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            position.id,
            position.poolId,
            position.providerAddress,
            position.shares,
            position.depositedAmount,
            position.tokenSymbol,
            position.depositUsd,
            position.txHash,
            position.network,
            position.bchAddress,
            position.evmAddress
          ]
        );
      } catch (err) {
        console.warn('[Pool Service] PG addLiquidity note:', err.message);
      }
    }

    const userSharePercent =
      postPoolState.totalShares > 0
        ? Number(((sharesToMint / postPoolState.totalShares) * 100).toFixed(4))
        : 100.0;

    return {
      success: true,
      nonCustodial: true,
      onChain: true,
      position,
      txHash: cleanTxHash,
      explorerUrl,
      sharesMinted: sharesToMint,
      poolSharePercentage: userSharePercent,
      newPoolTvlUsd: postPoolState.tvlUsd,
      poolStatus: postPoolState.status,
      unlockedNow
    };
    });
  }

  /**
   * 100% Non-Custodial LP Share Redemption:
   * Burns LP Shares and executes a genuine Smart Contract Vault release (`BinaryLiquidVault.sol` or `BinaryLiquidVault.cash`)
   * directly to the user's connected wallet!
   */
  async removeLiquidity({
    positionId,
    providerAddress,
    bchAddress = null,
    evmAddress = null,
    sharesToBurn,
    poolId = null,
    withdrawToken = null,
    authenticatedAddresses = null
  }) {
    if (!positionId) {
      throw new Error('Se requiere el ID de la posición LP.');
    }

    return db.withLock(`lp_remove:${positionId}`, async () => {
      if (!db.memoryState.lpPositions) db.memoryState.lpPositions = [];

      const authSet = Array.isArray(authenticatedAddresses)
        ? new Set(authenticatedAddresses.filter(Boolean).map(a => String(a).trim().toLowerCase()))
        : null;

      const candidateAddrs = new Set(
        [providerAddress, bchAddress, evmAddress]
          .filter(Boolean)
          .map(a => String(a).trim().toLowerCase())
          .filter(a => !authSet || authSet.has(a))
      );

      if (candidateAddrs.size === 0) {
        throw new Error('Se requiere autenticación de billetera para retirar liquidez.');
      }

      const posIdx = db.memoryState.lpPositions.findIndex(p => {
        if (p.id !== positionId) return false;
        const pAddrs = [p.providerAddress, p.bchAddress, p.evmAddress]
          .filter(Boolean)
          .map(a => String(a).toLowerCase());
        return pAddrs.some(a => candidateAddrs.has(a));
      });

      if (posIdx === -1) {
        throw new Error('No se encontró esta posición LP asociada a tus billeteras conectadas.');
      }

      const pos = db.memoryState.lpPositions[posIdx];
      const targetPoolId = poolId || pos.poolId || this.defaultPoolId;
      const pool = this.getPool(targetPoolId);
      const isTestnet = String(pos.network || 'testnet').toLowerCase() === 'testnet';

      if (pos.isLocked && pool.liquidityLocked) {
        throw new Error(
          'Anti-Rug Protection Activa: La liquidez inicial de este pool fue bloqueada de forma permanente (Fair Launch).'
        );
      }

      const burnAmount = sharesToBurn ? parseFloat(sharesToBurn) : pos.shares;
      if (burnAmount <= 0 || burnAmount > pos.shares + 0.0001) {
        throw new Error(`Cantidad de acciones inválida para quemar (disponible: ${pos.shares}).`);
      }

      const enrichedPool = await this.enrichPoolData(pool, { network: pos.network || 'testnet' });
      const burnRatioOfPosition = Math.min(1, burnAmount / pos.shares);
      const shareRatio = enrichedPool.totalShares > 0 ? burnAmount / enrichedPool.totalShares : 0;

      // Value of burned shares = initial deposit portion + proportional share of accrued swap fees
      const baseDepositPortionUsd = (pos.depositUsd || pos.depositedAmount || 0) * burnRatioOfPosition;
      const accruedFeeShareUsd = (enrichedPool.cumulativeFeesUsd || 0) * shareRatio;
      const totalPayoutUsd = Number((baseDepositPortionUsd + accruedFeeShareUsd).toFixed(4));

      const targetToken = (withdrawToken || (pos.tokenSymbol === 'BCH' ? 'USDT' : pos.tokenSymbol) || 'USDT').toUpperCase();
      const depositedTokenUpper = String(pos.tokenSymbol || '').trim().toUpperCase();
      const CANONICAL_TOKENS = new Set(['USDT', 'USDC', 'PUSD', 'MUSD', 'BCH', 'ETH', 'SOL', 'LTC', 'TON', 'POL', 'BNB']);

      // Protect shared BinaryLiquidVault reserves against custom pool cross-asset drain
      if (pool.isCustom || !CANONICAL_TOKENS.has(depositedTokenUpper)) {
        if (targetToken !== depositedTokenUpper) {
          throw new Error(
            `Por seguridad del Vault compartido, en pools personalizados el retiro de liquidez debe realizarse en el mismo activo depositado (${depositedTokenUpper}).`
          );
        }
      }

      const uniqueOriginRef = `lp_withdraw_${positionId}_${Date.now()}`;

      let payoutTxHash = '';
      let explorerUrl = '';
      let payoutA = 0;
      let payoutB = 0;

      if (targetToken === 'USDT' || targetToken === 'USDC') {
        const targetEvm = (
          evmAddress ||
          pos.evmAddress ||
          (providerAddress?.startsWith('0x') ? providerAddress : '')
        ).trim();

        if (!targetEvm || !targetEvm.startsWith('0x')) {
          throw new Error(
            `Conecta tu billetera EVM (MetaMask / WalletConnect) para recibir el retiro de ${targetToken}.`
          );
        }
        if (authSet && !authSet.has(targetEvm.toLowerCase()) && pos.evmAddress?.toLowerCase() !== targetEvm.toLowerCase()) {
          throw new Error('No autorizado para retirar hacia esa dirección EVM no autenticada.');
        }

        const chainKey = isTestnet ? 'polygon_amoy' : 'polygon_mainnet';
        // In custom pools, cap stablecoin withdrawal to actual deposited amount + accrued stablecoin fees
        const maxCustomStablePayout = pool.isCustom
          ? Number(((Number(pos.depositedAmount || 0) * burnRatioOfPosition) + accruedFeeShareUsd).toFixed(4))
          : Number(totalPayoutUsd.toFixed(4));
        payoutB = Number(Math.min(totalPayoutUsd, maxCustomStablePayout).toFixed(4));
        const tokenCfg = evmService.getTokenConfig(targetToken, chainKey);
        const vaultAddr = evmService.getVaultAddress(chainKey);

        const auth = await watchmanSentinel.auditAndAuthorize({
          destinationType: 'EVM',
          originTxHash: uniqueOriginRef,
          fromToken: 'PUSD',
          toToken: targetToken,
          recipient: targetEvm,
          tokenAddress: tokenCfg.address,
          tokenDecimals: tokenCfg.decimals,
          amount: payoutB,
          rate: 1.0,
          chainId: isTestnet ? config.evm.amoyChainId : config.evm.chainId,
          vaultContractAddress: vaultAddr
        });

        if (!auth.approved) {
          throw new Error(`Watchman Sentinel rechazó el retiro: ${auth.reason}`);
        }

        const releaseRes = await evmService.releaseFromVault({
          bchTxHashBytes32: auth.bchTxHashBytes32,
          recipientAddress: targetEvm,
          amount: payoutB,
          tokenSymbol: targetToken,
          chain: chainKey,
          nonce: auth.nonce,
          watchmanSignature: auth.proof
        });

        payoutTxHash = releaseRes.txHash;
        explorerUrl = releaseRes.explorerUrl;
      } else if (
        targetToken === 'PUSD' ||
        targetToken === pool.tokenA ||
        targetToken === pool.tokenB
      ) {
        const withdrawMeta = this._resolveTokenMeta(pool, targetToken, isTestnet);
        if (withdrawMeta.isNativeBch) {
          throw new Error(
            'BinaryLiquidVault.cash opera exclusivamente con CashTokens. Selecciona el CashToken del par o USDT/USDC.'
          );
        }

        const targetBch = (
          bchAddress ||
          pos.bchAddress ||
          (providerAddress?.startsWith('bch') ? providerAddress : '')
        ).trim();

        const expectedPrefix = isTestnet ? 'bchtest:' : 'bitcoincash:';
        if (!targetBch || !targetBch.startsWith(expectedPrefix)) {
          throw new Error(
            `Conecta tu billetera BCH (${expectedPrefix}...) para recibir el retiro de ${targetToken} desde el Covenant.`
          );
        }
        if (authSet && !authSet.has(targetBch.toLowerCase()) && pos.bchAddress?.toLowerCase() !== targetBch.toLowerCase()) {
          throw new Error('No autorizado para retirar hacia esa dirección BCH no autenticada.');
        }

        const tokenPrice = await this.getTokenPrice(targetToken, pool);
        // For custom tokens (or custom pools), never inflate withdrawal beyond proportional deposited token units
        if (pool.isCustom && !CANONICAL_TOKENS.has(targetToken)) {
          payoutA = Number((Number(pos.depositedAmount || 0) * burnRatioOfPosition).toFixed(4));
        } else {
          payoutA = Number((totalPayoutUsd / (tokenPrice > 0 ? tokenPrice : 1)).toFixed(4));
          if (pool.isCustom && targetToken === depositedTokenUpper) {
            const maxCustomPayoutA = Number(
              ((Number(pos.depositedAmount || 0) * burnRatioOfPosition) + accruedFeeShareUsd / (tokenPrice > 0 ? tokenPrice : 1)).toFixed(4)
            );
            payoutA = Math.min(payoutA, maxCustomPayoutA);
          }
        }
        const releaseRes = await bchService.releaseFromVault(
          targetBch,
          payoutA,
          targetToken,
          withdrawMeta.categoryId || null,
          withdrawMeta.decimals,
          isTestnet
        );
        payoutTxHash = releaseRes.txHash;
        explorerUrl = releaseRes.explorerUrl;
      } else {
        throw new Error(`Token de retiro no soportado: ${targetToken}`);
      }

      // Burn shares, record claimed fees (preventing fee double-claiming), & update position
      pool.totalShares = Math.max(1, Number((enrichedPool.totalShares - burnAmount).toFixed(4)));
      if (accruedFeeShareUsd > 0) {
        pool.claimedFeesUsd = Number((Number(pool.claimedFeesUsd || 0) + accruedFeeShareUsd).toFixed(4));
      }
      pool.updatedAt = new Date().toISOString();

      pos.shares = Math.max(0, Number((pos.shares - burnAmount).toFixed(4)));
      pos.depositUsd = Math.max(0, Number(((pos.depositUsd || 0) * (1 - burnRatioOfPosition)).toFixed(2)));
      pos.depositedAmount = Math.max(0, Number(((pos.depositedAmount || 0) * (1 - burnRatioOfPosition)).toFixed(4)));
      pos.updatedAt = new Date().toISOString();

      if (pos.shares <= 0.0001) {
        db.memoryState.lpPositions.splice(posIdx, 1);
      }
      db.persist();

      if (db.pgReady && db.pgPool) {
        try {
          if (pos.shares <= 0.0001) {
            await db.pgPool.query(`DELETE FROM lp_positions WHERE id = $1`, [positionId]);
          } else {
            await db.pgPool.query(
              `UPDATE lp_positions SET shares = $1, deposited_amount = $2, deposit_usd = $3, updated_at = NOW() WHERE id = $4`,
              [pos.shares, pos.depositedAmount, pos.depositUsd, positionId]
            );
          }
        } catch (err) {
          console.warn('[Pool Service] PG removeLiquidity note:', err.message);
        }
      }

      return {
        success: true,
        nonCustodial: true,
        onChain: true,
        sharesBurned: Number(burnAmount.toFixed(4)),
        payout: {
          tokenA: pool.tokenA,
          amountA: payoutA,
          tokenB: pool.tokenB,
          amountB: payoutB,
          withdrawnToken: targetToken,
          withdrawnAmount: targetToken === 'USDT' || targetToken === 'USDC' ? payoutB : payoutA,
          totalUsdValue: Number(totalPayoutUsd.toFixed(2))
        },
        remainingShares: pos.shares || 0,
        txHash: payoutTxHash,
        explorerUrl
      };
    });
  }

  async verifyPool(poolId, { requesterAddress, txHash, adminAuthorized = false } = {}) {
    if (!adminAuthorized) {
      throw new Error('Se requiere autorización administrativa para verificar un pool oficialmente.');
    }
    this.initPools();
    const pool = this.getPool(poolId);
    if (!pool) throw new Error('Pool no encontrado');
    pool.isVerified = true;
    pool.verificationBadge = 'Verificado Oficial';
    pool.verifiedAt = new Date().toISOString();
    pool.verificationTx = txHash || null;
    pool.verifiedBy = requesterAddress || 'ADMIN';
    pool.updatedAt = new Date().toISOString();
    db.persist();
    return pool;
  }

  async getPositionsForAddress(address, { bchAddress = null, evmAddress = null, poolId = null, network = 'testnet' } = {}) {
    const isTestnet = String(network || 'testnet').toLowerCase() === 'testnet';
    const rawInputs = [address, bchAddress, evmAddress].filter(Boolean);
    if (rawInputs.length === 0) return [];
    if (!db.memoryState.lpPositions) db.memoryState.lpPositions = [];

    const candidates = new Set();
    const bchList = [];
    for (const raw of rawInputs) {
      const str = String(raw).trim();
      for (const b of splitCashAddresses(str, isTestnet)) {
        bchList.push(b);
        for (const variant of expandBchAddressVariants(b)) {
          candidates.add(variant);
        }
      }
      candidates.add(str.toLowerCase());
    }

    const reqNet = isTestnet ? 'testnet' : 'mainnet';
    const vb = await this.resolveLiveVaultBalances();

    const positions = db.memoryState.lpPositions.filter(p => {
      const pNet = String(p.network || 'testnet').toLowerCase();
      if (pNet !== reqNet) return false;
      if (poolId && p.poolId !== poolId) return false;

      const pAddrs = [p.providerAddress, p.bchAddress, p.evmAddress]
        .filter(Boolean)
        .map(a => String(a).trim());
      return pAddrs.some(a => candidates.has(a.toLowerCase()) || bchList.some(b => isSameBchAddress(b, a)));
    });

    const enriched = await Promise.all(
      positions.map(async pos => {
        const rawPool = this.getPool(pos.poolId);
        const pool = await this.enrichPoolData(rawPool, { network: reqNet, vaultBalances: vb });

        const shareRatio = pool.totalShares > 0 ? pos.shares / pool.totalShares : 0;
        const currentValA = shareRatio * pool.reserveA;
        const currentValB = shareRatio * pool.reserveB;
        const baseUsd = Number(pos.depositUsd || pos.depositedAmount || 0);
        const accruedFeeUsd = Number(((pool.cumulativeFeesUsd || 0) * shareRatio).toFixed(4));
        const liveUnderlyingUsd = currentValA * Number(pool.priceA || 1) + currentValB * Number(pool.priceB || 1);
        const currentTotalUsd = Number(((liveUnderlyingUsd > 0 ? liveUnderlyingUsd : baseUsd) + accruedFeeUsd).toFixed(4));
        const profitUsd = Number((currentTotalUsd - baseUsd).toFixed(4));

        return {
          ...pos,
          pair: pool.pair,
          tokenA: pool.tokenA,
          tokenB: pool.tokenB,
          iconA: pool.iconA,
          iconB: pool.iconB,
          shareRatio: Number(shareRatio.toFixed(6)),
          poolSharePercent: Number((shareRatio * 100).toFixed(4)),
          currentAmountA: Number(currentValA.toFixed(4)),
          currentAmountB: Number(currentValB.toFixed(4)),
          totalValueUsd: Number(currentTotalUsd.toFixed(2)),
          profitUsd: Number(profitUsd.toFixed(4)),
          profitPercentage: baseUsd > 0 ? Number(((profitUsd / baseUsd) * 100).toFixed(2)) : 0
        };
      })
    );

    return enriched;
  }
}

export const poolService = new PoolService();
