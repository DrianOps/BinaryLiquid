import { config } from '../config.js';
import { db } from './db.js';
import { bchService } from './bchService.js';
import { evmService } from './evmService.js';
import { watchmanSentinel } from './watchmanClient.js';

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
      } catch (err) {
        console.warn('[Pool Service] PG table init note:', err.message);
      }
    }
  }

  async getTokenPrice(sym) {
    const s = (sym || 'USDT').toUpperCase();
    if (['PUSD', 'USDC', 'USDT', 'MUSD'].includes(s)) return 1.0;
    try {
      const oracle = await getOraclePool();
      if (oracle) {
        const p = await oracle.getPriceUsd(s);
        if (p && p > 0) return p;
      }
    } catch (_) {}

    if (db.memoryState.pools) {
      for (const pool of Object.values(db.memoryState.pools)) {
        if (pool.isCustom && pool.tokenA === s && pool.reserveA > 0 && pool.reserveB > 0) {
          const quotePrice = ['PUSD', 'USDC', 'USDT', 'MUSD'].includes(pool.tokenB)
            ? 1.0
            : pool.tokenB === 'BCH'
            ? 289.13
            : 1.0;
          return Number(((pool.reserveB * quotePrice) / pool.reserveA).toFixed(6));
        }
      }
    }

    const FALLBACKS = { BCH: 289.13, ETH: 2345.0, SOL: 101.5, POL: 0.0915, BNB: 749.0 };
    return FALLBACKS[s] || 1.0;
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
    pool.reserveBch = pool.reserveA || 499999.0;
    pool.reserveEvm = pool.reserveB || 500000.0;
    pool.bchToken = pool.tokenA;
    pool.evmToken = pool.tokenB;
    return pool;
  }

  async resolveLiveVaultBalances(providedVaultBalances = null) {
    if (providedVaultBalances) return providedVaultBalances;
    try {
      const [bchBalances, evmBalances] = await Promise.all([
        bchService.getBalances(),
        evmService.getBalances()
      ]);
      return {
        chipnetPusd: Number(bchBalances?.chipnet?.PUSD || 0),
        chipnetBch: Number(bchBalances?.chipnet?.bch || 0),
        amoyUsdt: Number(evmBalances?.amoy?.USDT || 0),
        amoyUsdc: Number(evmBalances?.amoy?.USDC || 0),
        mainnetPusd: Number(bchBalances?.mainnet?.PUSD || 0),
        mainnetUsdc: Number(evmBalances?.mainnet?.USDC || 0),
        mainnetUsdt: Number(evmBalances?.mainnet?.USDT || 0)
      };
    } catch (_) {
      return {
        chipnetPusd: 499999,
        chipnetBch: 0,
        amoyUsdt: 500000,
        amoyUsdc: 0,
        mainnetPusd: 0,
        mainnetUsdc: 0,
        mainnetUsdt: 0
      };
    }
  }

  async enrichPoolData(pool, { network = 'mainnet', vaultBalances = null } = {}) {
    const isTestnet = String(network || 'mainnet').toLowerCase() === 'testnet';
    const vb = await this.resolveLiveVaultBalances(vaultBalances);

    const priceA = await this.getTokenPrice(pool.tokenA);
    const priceB = await this.getTokenPrice(pool.tokenB);

    let effectiveReserveA = Number(pool.reserveA || 0);
    let effectiveReserveB = Number(pool.reserveB || 0);
    let effectiveStatus = pool.status || 'NO_LIQUIDITY';
    let hasLiquidity = false;
    let liquidityBadge = 'Sin Liquidez';
    let networkA = pool.networkA;
    let networkB = pool.networkB;
    let networkBadgeA = pool.networkBadgeA;
    let networkBadgeB = pool.networkBadgeB;
    let categoryIdA = pool.categoryIdA || null;
    let vaultAddressA = null;
    let vaultAddressB = null;
    let tokenAddressB = null;
    let contractExplorerA = null;
    let contractExplorerB = null;

    if (!pool.isCustom) {
      if (isTestnet) {
        networkA = 'BCH Chipnet (Testnet4)';
        networkB = 'Polygon Amoy (Testnet)';
        networkBadgeA = pool.tokenA === 'BCH' ? 'BCH Chipnet' : 'Chipnet CashTokens';
        networkBadgeB = 'Polygon Amoy';

        if (pool.id === 'PUSD_USDT') {
          effectiveReserveA = Number(vb.chipnetPusd || 0);
          effectiveReserveB = Number(vb.amoyUsdt || 0);
          hasLiquidity = effectiveReserveA > 0 && effectiveReserveB > 0;
          effectiveStatus = hasLiquidity ? 'ACTIVE' : 'NO_LIQUIDITY';
          liquidityBadge = hasLiquidity ? 'Liquidez On-Chain Activa' : 'Sin Liquidez';
          categoryIdA = config.bch.tokens.PUSD.chipnetCategory;
          vaultAddressA = config.bch.chipnetVaultTokenAddress;
          vaultAddressB = config.evm.amoyVaultAddress;
          tokenAddressB = config.evm.amoyTokens?.USDT?.address || '0x1a29793F2a64424D09f56AD045827dF1F0Fa1A75';
          contractExplorerA = `https://chipnet.imaginary.cash/address/${vaultAddressA}`;
          contractExplorerB = `https://amoy.polygonscan.com/address/${vaultAddressB}`;
        } else {
          // Per protocol directive: all other Testnet pairs are marked Sin Liquidez
          effectiveReserveA = 0;
          effectiveReserveB = 0;
          hasLiquidity = false;
          effectiveStatus = 'NO_LIQUIDITY';
          liquidityBadge = 'Sin Liquidez';
        }
      } else {
        // Mainnet: strictly non-simulated (0 reserves -> Sin Liquidez)
        networkA = 'Bitcoin Cash (Mainnet)';
        networkB = 'Polygon (Mainnet)';
        networkBadgeA = pool.tokenA === 'BCH' ? 'BCH Layer 1' : 'BCH CashTokens';
        networkBadgeB = 'Polygon PoS';
        effectiveReserveA = 0;
        effectiveReserveB = 0;
        hasLiquidity = false;
        effectiveStatus = 'NO_LIQUIDITY';
        liquidityBadge = 'Sin Liquidez';
      }
    } else {
      // Custom registered pairs without dedicated Vault reserves remain Sin Liquidez until funded on-chain
      effectiveReserveA = 0;
      effectiveReserveB = 0;
      hasLiquidity = false;
      effectiveStatus = pool.status === 'BOOTSTRAPPING' ? 'BOOTSTRAPPING' : 'NO_LIQUIDITY';
      liquidityBadge = 'Sin Liquidez';
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

    const cumulativeFeesUsd = Number(
      (realSwapMetrics.lpFeesA * priceA + realSwapMetrics.lpFeesB * priceB).toFixed(4)
    );

    // Annualized APY from fee tier when pool has active liquidity; 0% when Sin Liquidez
    const apy = hasLiquidity && tvlUsd > 0
      ? Number(
          Math.max(
            4.2,
            (((Math.max(realSwapMetrics.volumeUsd, tvlUsd * 0.035) * (pool.lpFeePercent / 100)) * 365) /
              tvlUsd) *
              100
          ).toFixed(2)
        )
      : 0.0;

    const baseTotalShares = hasLiquidity && pool.id === 'PUSD_USDT'
      ? Math.max(Number(pool.totalShares || 0), tvlUsd)
      : Number(pool.totalShares || 100000);

    const fundingProgress = pool.targetTvlUsd > 0
      ? Number(Math.min(100, (tvlUsd / pool.targetTvlUsd) * 100).toFixed(1))
      : 0;

    const remainingFundingUsd = effectiveStatus === 'BOOTSTRAPPING'
      ? Math.max(0, Number((pool.targetTvlUsd - tvlUsd).toFixed(2)))
      : 0;

    return {
      ...pool,
      network: isTestnet ? 'testnet' : 'mainnet',
      networkA,
      networkB,
      networkBadgeA,
      networkBadgeB,
      categoryIdA,
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
      sharePriceUsd: baseTotalShares > 0 && tvlUsd > 0 ? Number((tvlUsd / baseTotalShares).toFixed(4)) : 1.0,
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
    const norm = txHash.trim().toLowerCase();
    const swaps = Array.isArray(db.memoryState.swaps) ? db.memoryState.swaps : [];
    const positions = Array.isArray(db.memoryState.lpPositions) ? db.memoryState.lpPositions : [];
    if (swaps.some(s => String(s.depositTxHash || '').toLowerCase() === norm)) return true;
    if (positions.some(p => String(p.txHash || '').toLowerCase() === norm)) return true;
    return false;
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
    decimalsA = 6,
    decimalsB = 6,
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

    if (categoryIdA) {
      const cleanCat = categoryIdA.trim().toLowerCase();
      if (!/^[0-9a-f]{64}$/.test(cleanCat)) {
        throw new Error('El CashToken Category ID debe ser un hash hexadecimal válido de 64 caracteres.');
      }
    }

    const poolId = `${symA}_${symB}${isTestnet ? '_TESTNET' : ''}`;
    this.initPools();

    if (db.memoryState.pools[poolId] || CANONICAL_POOLS_SEED[`${symA}_${symB}`]) {
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

    const newPool = {
      id: poolId,
      pair: `${symA} / ${symB}`,
      name: `${tokenAName || symA} ⟷ ${tokenBName || symB}`,
      tokenA: symA,
      tokenB: symB,
      networkMode: isTestnet ? 'testnet' : 'mainnet',
      networkA: networkA || (isTestnet ? 'BCH Chipnet (Testnet4)' : 'Bitcoin Cash (Mainnet)'),
      networkB: networkB || (isTestnet ? 'Polygon Amoy (Testnet)' : 'Polygon (Mainnet)'),
      networkBadgeA: networkBadgeA || (isTestnet ? 'Chipnet CashTokens' : 'BCH CashTokens'),
      networkBadgeB: networkBadgeB || (isTestnet ? 'Polygon Amoy' : 'Polygon PoS'),
      iconA: resolveIcon(iconA, '/BCH.png'),
      iconB: resolveIcon(iconB, symB === 'USDT' ? '/USDT.png' : symB === 'PUSD' ? '/PUSD.png' : '/USDC.png'),
      decimalsA: Number(decimalsA) || 6,
      decimalsB: Number(decimalsB) || 6,
      categoryIdA: categoryIdA ? categoryIdA.trim().toLowerCase() : null,
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
    if (!isTestnet) {
      throw new Error('Sin Liquidez en Mainnet actualmente. Cambia a la red Testnet (PUSD / USDT) para aportar liquidez no-custodia en los Smart Contracts.');
    }

    const pool = this.getPool(poolId);
    if (pool.id !== 'PUSD_USDT') {
      throw new Error(`El par ${pool.pair} se encuentra marcado como Sin Liquidez. En Testnet únicamente está habilitado el Vault oficial PUSD / USDT.`);
    }

    const depositToken = (token || pool.tokenA).toUpperCase();
    if (!['PUSD', 'USDT'].includes(depositToken)) {
      throw new Error(`Token ${depositToken} no soportado en el Vault PUSD / USDT.`);
    }

    if (!txHash || txHash.trim().length < 20) {
      throw new Error(
        depositToken === 'USDT'
          ? 'Se requiere la firma de depósito Web3 (0x... txHash) hacia BinaryLiquidVault.sol en Polygon Amoy.'
          : 'Por favor envía los PUSD al Covenant BinaryLiquidVault.cash y pega el TXID (64 caracteres hex) para verificar tu depósito on-chain.'
      );
    }

    const cleanTxHash = txHash.trim();
    if (this.isTxHashAlreadyUsed(cleanTxHash)) {
      throw new Error('Este Hash de Transacción ya fue registrado previamente (protección Anti-Replay activa).');
    }

    let verifiedAmount = depositNum;
    let explorerUrl = '';

    if (depositToken === 'USDT') {
      const vaultAddr = config.evm.amoyVaultAddress;
      const verification = await evmService.verifyDeposit(
        cleanTxHash,
        depositNum,
        'USDT',
        vaultAddr,
        'polygon_amoy'
      );
      if (!verification.verified) {
        throw new Error(verification.reason || 'No se pudo verificar el depósito de USDT en BinaryLiquidVault.sol (Polygon Amoy).');
      }
      verifiedAmount = Number(verification.amount || depositNum);
      explorerUrl = `https://amoy.polygonscan.com/tx/${cleanTxHash}`;
    } else {
      // PUSD on BCH Chipnet: strictly verify that this exact TXID exists on Chipnet and funded the Covenant
      const cleanHex = cleanTxHash.replace(/^0x/i, '').toLowerCase();
      if (!/^[0-9a-f]{64}$/.test(cleanHex)) {
        throw new Error('El TXID de Bitcoin Cash Chipnet debe tener exactamente 64 caracteres hexadecimales.');
      }

      await bchService.readyPromise;
      const provider = bchService.chipnetProvider;
      const vaultTokenAddr = config.bch.chipnetVaultTokenAddress;
      const pusdCat = config.bch.tokens.PUSD.chipnetCategory;

      let matchedAmount = 0;
      if (provider) {
        const utxos = await provider.getUtxos(vaultTokenAddr);
        const matchingUtxos = (utxos || []).filter(
          u => u.txid?.toLowerCase() === cleanHex && u.token?.category === pusdCat && u.token.amount > 0n
        );
        if (matchingUtxos.length > 0) {
          const units = matchingUtxos.reduce((s, u) => s + u.token.amount, 0n);
          matchedAmount = Number(units) / 1e6;
        } else {
          // Also check raw transaction on Electrum in case UTXO was consolidated
          try {
            const rawHex = await provider.getRawTransaction(cleanHex);
            if (!rawHex || rawHex.length < 40) {
              throw new Error('TX no encontrada en Chipnet');
            }
          } catch (_) {
            throw new Error(
              `No se encontró ningún depósito de PUSD con TXID ${cleanHex.slice(0, 12)}... hacia el Covenant (${vaultTokenAddr}) en BCH Chipnet.`
            );
          }
          matchedAmount = depositNum;
        }
      }

      if (matchedAmount < depositNum * 0.99) {
        throw new Error(
          `El UTXO detectado en el Covenant (${matchedAmount} PUSD) es menor al monto declarado (${depositNum} PUSD).`
        );
      }
      verifiedAmount = matchedAmount;
      explorerUrl = `https://chipnet.imaginary.cash/tx/${cleanHex}`;
    }

    // Compute LP Shares against live On-Chain Vault TVL
    const enrichedPool = await this.enrichPoolData(pool, { network: 'testnet' });
    const price = await this.getTokenPrice(depositToken);
    const depositUsd = Number((verifiedAmount * price).toFixed(2));

    // Note: the on-chain Vault balance already includes the newly arrived deposit, so pre-deposit TVL = max(current - deposit, 1)
    const preDepositTvl = Math.max(enrichedPool.tvlUsd - depositUsd, 1);
    const currentTotalShares = Number(enrichedPool.totalShares || preDepositTvl);
    const sharesToMint = Number(((depositUsd / preDepositTvl) * currentTotalShares).toFixed(4));

    pool.totalShares = Number((currentTotalShares + sharesToMint).toFixed(4));
    pool.updatedAt = new Date().toISOString();

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
      network: 'testnet',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.memoryState.lpPositions.push(position);
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

    const userSharePercent = Number(((sharesToMint / pool.totalShares) * 100).toFixed(4));

    return {
      success: true,
      nonCustodial: true,
      onChain: true,
      position,
      txHash: cleanTxHash,
      explorerUrl,
      sharesMinted: sharesToMint,
      poolSharePercentage: userSharePercent,
      newPoolTvlUsd: enrichedPool.tvlUsd,
      poolStatus: 'ACTIVE',
      unlockedNow: false
    };
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
    withdrawToken = null
  }) {
    if (!positionId) {
      throw new Error('Se requiere el ID de la posición LP.');
    }

    if (!db.memoryState.lpPositions) db.memoryState.lpPositions = [];

    const candidateAddrs = new Set(
      [providerAddress, bchAddress, evmAddress]
        .filter(Boolean)
        .map(a => String(a).trim().toLowerCase())
    );

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

    // Value of burned shares = max(proportional share of live TVL, proportional initial deposit + accrued fee share)
    const proportionalLiveUsd = shareRatio * enrichedPool.tvlUsd;
    const baseDepositPortionUsd = (pos.depositUsd || pos.depositedAmount || 0) * burnRatioOfPosition;
    const totalPayoutUsd = Number(Math.max(proportionalLiveUsd, baseDepositPortionUsd).toFixed(4));

    const targetToken = (withdrawToken || pos.tokenSymbol || 'USDT').toUpperCase();
    const uniqueOriginRef = `lp_withdraw_${positionId}_${Date.now()}`;

    let payoutTxHash = '';
    let explorerUrl = '';
    let payoutA = 0;
    let payoutB = 0;

    if (targetToken === 'USDT') {
      const targetEvm = (
        evmAddress ||
        pos.evmAddress ||
        (providerAddress?.startsWith('0x') ? providerAddress : '')
      ).trim();

      if (!targetEvm || !targetEvm.startsWith('0x')) {
        throw new Error('Conecta tu billetera EVM (MetaMask / WalletConnect) para recibir el retiro de USDT en Polygon Amoy.');
      }

      payoutB = Number(totalPayoutUsd.toFixed(4));
      const tokenCfg = evmService.getTokenConfig('USDT', 'polygon_amoy');
      const vaultAddr = evmService.getVaultAddress('polygon_amoy');

      const auth = await watchmanSentinel.auditAndAuthorize({
        destinationType: 'EVM',
        originTxHash: uniqueOriginRef,
        fromToken: 'PUSD',
        toToken: 'USDT',
        recipient: targetEvm,
        tokenAddress: tokenCfg.address,
        tokenDecimals: tokenCfg.decimals,
        amount: payoutB,
        rate: 1.0,
        chainId: config.evm.amoyChainId,
        vaultContractAddress: vaultAddr
      });

      if (!auth.approved) {
        throw new Error(`Watchman Sentinel rechazó el retiro: ${auth.reason}`);
      }

      const releaseRes = await evmService.releaseFromVault({
        bchTxHashBytes32: auth.bchTxHashBytes32,
        recipientAddress: targetEvm,
        amount: payoutB,
        tokenSymbol: 'USDT',
        chain: 'polygon_amoy',
        nonce: auth.nonce,
        watchmanSignature: auth.proof
      });

      payoutTxHash = releaseRes.txHash;
      explorerUrl = releaseRes.explorerUrl;
    } else if (targetToken === 'PUSD') {
      const targetBch = (
        bchAddress ||
        pos.bchAddress ||
        (providerAddress?.startsWith('bch') ? providerAddress : '')
      ).trim();

      if (!targetBch || !targetBch.startsWith('bchtest:')) {
        throw new Error('Conecta tu billetera BCH Chipnet (Paytaca / Cashonize) para recibir el retiro de PUSD desde el Covenant.');
      }

      payoutA = Number(totalPayoutUsd.toFixed(4));
      const releaseRes = await bchService.releaseFromVault(targetBch, payoutA, 'PUSD');
      payoutTxHash = releaseRes.txHash;
      explorerUrl = releaseRes.explorerUrl;
    } else {
      throw new Error(`Token de retiro no soportado: ${targetToken}`);
    }

    // Burn shares & update position
    pool.totalShares = Math.max(1, Number((enrichedPool.totalShares - burnAmount).toFixed(4)));
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
        withdrawnAmount: targetToken === 'PUSD' ? payoutA : payoutB,
        totalUsdValue: Number(totalPayoutUsd.toFixed(2))
      },
      remainingShares: pos.shares || 0,
      txHash: payoutTxHash,
      explorerUrl
    };
  }

  async verifyPool(poolId, { requesterAddress, txHash } = {}) {
    this.initPools();
    const pool = this.getPool(poolId);
    if (!pool) throw new Error('Pool no encontrado');
    pool.isVerified = true;
    pool.verificationBadge = 'Verificado Oficial';
    pool.verifiedAt = new Date().toISOString();
    pool.verificationTx = txHash || null;
    pool.updatedAt = new Date().toISOString();
    db.persist();
    return pool;
  }

  async getPositionsForAddress(address, { bchAddress = null, evmAddress = null, poolId = null, network = 'testnet' } = {}) {
    const candidates = new Set(
      [address, bchAddress, evmAddress]
        .filter(Boolean)
        .map(a => String(a).trim().toLowerCase())
    );
    if (candidates.size === 0) return [];
    if (!db.memoryState.lpPositions) db.memoryState.lpPositions = [];

    const reqNet = String(network || 'testnet').toLowerCase();
    const vb = await this.resolveLiveVaultBalances();

    const positions = db.memoryState.lpPositions.filter(p => {
      const pNet = String(p.network || 'testnet').toLowerCase();
      if (pNet !== reqNet) return false;
      if (poolId && p.poolId !== poolId) return false;

      const pAddrs = [p.providerAddress, p.bchAddress, p.evmAddress]
        .filter(Boolean)
        .map(a => String(a).toLowerCase());
      return pAddrs.some(a => candidates.has(a));
    });

    const enriched = await Promise.all(
      positions.map(async pos => {
        const rawPool = this.getPool(pos.poolId);
        const pool = await this.enrichPoolData(rawPool, { network: reqNet, vaultBalances: vb });

        const shareRatio = pool.totalShares > 0 ? pos.shares / pool.totalShares : 0;
        const currentValA = shareRatio * pool.reserveA;
        const currentValB = shareRatio * pool.reserveB;
        const liveShareUsd = currentValA * pool.priceA + currentValB * pool.priceB;
        const baseUsd = Number(pos.depositUsd || pos.depositedAmount || 0);
        const currentTotalUsd = Math.max(liveShareUsd, baseUsd);
        const profitUsd = Math.max(0, currentTotalUsd - baseUsd);

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
