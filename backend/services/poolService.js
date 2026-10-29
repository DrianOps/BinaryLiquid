import { db } from './db.js';

let _oraclePool = null;
async function getOraclePool() {
  if (!_oraclePool) {
    try {
      const mod = await import('./oraclePool.js');
      _oraclePool = mod.oraclePool;
    } catch (e) {
      // Graceful fallback
    }
  }
  return _oraclePool;
}

const CANONICAL_POOLS_SEED = {
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
    reserveA: 50000.0,
    reserveB: 50000.0,
    totalShares: 100000.0,
    targetTvlUsd: 50000.0,
    status: 'ACTIVE',
    feePercent: 0.30,
    lpFeePercent: 0.20,
    creatorFeePercent: 0.0,
    protocolFeePercent: 0.10,
    cumulativeFeesA: 135.50,
    cumulativeFeesB: 128.20,
    totalVolumeUsd: 112500.0,
    isSponsorPool: true,
    sponsorTag: 'Official BLAZE Track Sponsor (PUSD)',
    isVerified: true,
    verificationBadge: 'Oficial'
  },
  BCH_USDC: {
    id: 'BCH_USDC',
    pair: 'BCH / USDC',
    name: 'Bitcoin Cash ⟷ USD Coin',
    tokenA: 'BCH',
    tokenB: 'USDC',
    networkA: 'Bitcoin Cash (Mainnet)',
    networkB: 'Polygon (Mainnet)',
    networkBadgeA: 'BCH Layer 1',
    networkBadgeB: 'Polygon PoS',
    iconA: '/BCH.png',
    iconB: '/USDC.png',
    decimalsA: 8,
    decimalsB: 6,
    reserveA: 172.93,
    reserveB: 50000.0,
    totalShares: 100000.0,
    targetTvlUsd: 50000.0,
    status: 'ACTIVE',
    feePercent: 0.30,
    lpFeePercent: 0.20,
    creatorFeePercent: 0.0,
    protocolFeePercent: 0.10,
    cumulativeFeesA: 0.42,
    cumulativeFeesB: 115.00,
    totalVolumeUsd: 84300.0,
    isVerified: true,
    verificationBadge: 'Oficial'
  }
};

class PoolService {
  constructor() {
    this.defaultPoolId = 'PUSD_USDC';
    this.initPools();
  }

  initPools() {
    if (!db.memoryState.pools) {
      db.memoryState.pools = {};
    }

    // Purge obsolete filler/mock pools so only real canonical pools + user-created community pools remain
    const OBSOLETE_POOLS = ['PUSD_USDT', 'BCH_PUSD', 'MUSD_USDC', 'SOL_USDC', 'ETH_USDC', 'POL_USDC'];
    for (const pId of OBSOLETE_POOLS) {
      if (db.memoryState.pools[pId]) {
        delete db.memoryState.pools[pId];
      }
    }

    for (const [id, seed] of Object.entries(CANONICAL_POOLS_SEED)) {
      if (!db.memoryState.pools[id]) {
        db.memoryState.pools[id] = {
          ...seed,
          reserveBch: seed.reserveA,
          reserveEvm: seed.reserveB,
          bchToken: seed.tokenA,
          evmToken: seed.tokenB,
          cumulativeFeesBch: seed.cumulativeFeesA,
          cumulativeFeesEvm: seed.cumulativeFeesB,
          updatedAt: new Date().toISOString()
        };
      } else {
        // Ensure new metadata fields exist
        const p = db.memoryState.pools[id];
        db.memoryState.pools[id] = {
          ...seed,
          ...p,
          reserveA: p.reserveA !== undefined ? p.reserveA : (p.reserveBch || seed.reserveA),
          reserveB: p.reserveB !== undefined ? p.reserveB : (p.reserveEvm || seed.reserveB),
          reserveBch: p.reserveA !== undefined ? p.reserveA : (p.reserveBch || seed.reserveA),
          reserveEvm: p.reserveB !== undefined ? p.reserveB : (p.reserveEvm || seed.reserveB),
          tokenA: seed.tokenA,
          tokenB: seed.tokenB,
          iconA: seed.iconA,
          iconB: seed.iconB,
          networkA: seed.networkA,
          networkB: seed.networkB,
          networkBadgeA: seed.networkBadgeA,
          networkBadgeB: seed.networkBadgeB,
          status: p.status || seed.status,
          targetTvlUsd: seed.targetTvlUsd,
          isVerified: true,
          verificationBadge: 'Oficial'
        };
      }
    }
    db.persist();
  }

  async initDatabaseTables() {
    this.initPools();
    if (db.pgReady && db.pgPool) {
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
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
        `);
      } catch (err) {
        console.warn('[Pool Service] PG table init note:', err.message);
      }
    }
  }

  async getTokenPrice(sym) {
    const s = (sym || 'USDC').toUpperCase();
    if (['PUSD', 'USDC', 'USDT', 'MUSD'].includes(s)) return 1.0;
    try {
      const oracle = await getOraclePool();
      if (oracle) {
        const p = await oracle.getPriceUsd(s);
        if (p && p > 0) return p;
      }
    } catch (e) {}

    // Dynamic AMM ratio price for custom tokens created in pools
    if (db.memoryState.pools) {
      for (const pool of Object.values(db.memoryState.pools)) {
        if (pool.tokenA === s && pool.reserveA > 0 && pool.reserveB > 0) {
          const quotePrice = ['PUSD', 'USDC', 'USDT', 'MUSD'].includes(pool.tokenB) ? 1.0 : (pool.tokenB === 'BCH' ? 289.13 : 1.0);
          return Number(((pool.reserveB * quotePrice) / pool.reserveA).toFixed(6));
        }
        if (pool.tokenB === s && pool.reserveB > 0 && pool.reserveA > 0) {
          const quotePrice = ['PUSD', 'USDC', 'USDT', 'MUSD'].includes(pool.tokenA) ? 1.0 : (pool.tokenA === 'BCH' ? 289.13 : 1.0);
          return Number(((pool.reserveA * quotePrice) / pool.reserveB).toFixed(6));
        }
      }
    }

    const FALLBACKS = { BCH: 289.13, ETH: 2345.0, SOL: 101.5, POL: 0.0915, BNB: 749.0 };
    return FALLBACKS[s] || 1.0;
  }

  getPool(poolId = this.defaultPoolId) {
    this.initPools();
    const pid = poolId || this.defaultPoolId;
    let pool = db.memoryState.pools[pid];
    if (!pool) {
      // Search by pair alias (e.g. 'PUSD/USDC' or 'bch_usdc')
      const normalized = pid.toUpperCase().replace('/', '_').replace('-', '_');
      pool = db.memoryState.pools[normalized] || db.memoryState.pools[this.defaultPoolId];
    }
    // Backward compatibility aliases
    pool.reserveBch = pool.reserveA;
    pool.reserveEvm = pool.reserveB;
    pool.bchToken = pool.tokenA;
    pool.evmToken = pool.tokenB;
    pool.cumulativeFeesBch = pool.cumulativeFeesA;
    pool.cumulativeFeesEvm = pool.cumulativeFeesB;
    return pool;
  }

  async enrichPoolData(pool) {
    const priceA = await this.getTokenPrice(pool.tokenA);
    const priceB = await this.getTokenPrice(pool.tokenB);

    const valA = Number(pool.reserveA) * priceA;
    const valB = Number(pool.reserveB) * priceB;
    const tvlUsd = Number((valA + valB).toFixed(2));

    // Dynamic APY calculated from LP volume & 0.20% share
    const est24hVolume = Math.max(pool.totalVolumeUsd * 0.10, 3500);
    const estAnnualLpFees = est24hVolume * (pool.lpFeePercent / 100) * 365;
    const apy = tvlUsd > 0 ? Number(((estAnnualLpFees / tvlUsd) * 100).toFixed(2)) : 14.5;

    // Bootstrapping progress
    const fundingProgress = pool.targetTvlUsd > 0 
      ? Number(Math.min(100, (tvlUsd / pool.targetTvlUsd) * 100).toFixed(1))
      : 100;

    const remainingFundingUsd = pool.status === 'BOOTSTRAPPING'
      ? Math.max(0, Number((pool.targetTvlUsd - tvlUsd).toFixed(2)))
      : 0;

    return {
      ...pool,
      priceA: Number(priceA.toFixed(4)),
      priceB: Number(priceB.toFixed(4)),
      reserveAValueUsd: Number(valA.toFixed(2)),
      reserveBValueUsd: Number(valB.toFixed(2)),
      tvlUsd,
      apyPercentage: apy,
      sharePriceUsd: pool.totalShares > 0 ? Number((tvlUsd / pool.totalShares).toFixed(4)) : 1.0,
      fundingProgress,
      remainingFundingUsd,
      cumulativeFeesUsd: Number((pool.cumulativeFeesA * priceA + pool.cumulativeFeesB * priceB).toFixed(2)),
      feeDistribution: {
        lpCutPercent: pool.lpFeePercent,
        protocolCutPercent: pool.protocolFeePercent,
        totalFeePercent: pool.feePercent
      }
    };
  }

  async getAllPools() {
    this.initPools();
    const pools = Object.values(db.memoryState.pools);
    const enriched = await Promise.all(pools.map(p => this.enrichPoolData(p)));
    return enriched;
  }

  async getStats(poolId = this.defaultPoolId) {
    const all = await this.getAllPools();
    const defaultPool = all.find(p => p.id === poolId) || all[0];

    const totalTvlUsd = Number(all.reduce((acc, p) => acc + p.tvlUsd, 0).toFixed(2));
    const totalVolumeUsd = Number(all.reduce((acc, p) => acc + p.totalVolumeUsd, 0).toFixed(2));
    const totalCumulativeFeesUsd = Number(all.reduce((acc, p) => acc + p.cumulativeFeesUsd, 0).toFixed(2));
    const activeCount = all.filter(p => p.status === 'ACTIVE').length;
    const bootstrappingCount = all.filter(p => p.status === 'BOOTSTRAPPING').length;

    return {
      pool: defaultPool,
      allPools: all,
      protocolStats: {
        totalTvlUsd,
        totalVolumeUsd,
        totalCumulativeFeesUsd,
        activePoolsCount: activeCount,
        bootstrappingPoolsCount: bootstrappingCount,
        totalPoolsCount: all.length,
        lpFeeShare: '0.20%',
        protocolTreasuryShare: '0.10%'
      }
    };
  }

  /**
   * Automatically accrues LP fees into the pool reserves whenever a swap is completed.
   */
  accrueSwapFee(fromToken, swapAmount, feeAmount, toToken = null) {
    this.initPools();
    const from = (fromToken || '').toUpperCase();
    const to = (toToken || '').toUpperCase();

    // Find the matching pool for this token pair
    let targetPool = null;
    for (const p of Object.values(db.memoryState.pools)) {
      if ((p.tokenA === from && p.tokenB === to) || (p.tokenA === to && p.tokenB === from)) {
        targetPool = p;
        break;
      }
    }

    if (!targetPool) {
      // Fallback by fromToken
      for (const p of Object.values(db.memoryState.pools)) {
        if (p.tokenA === from || p.tokenB === from) {
          targetPool = p;
          break;
        }
      }
    }

    if (!targetPool) {
      targetPool = this.getPool(this.defaultPoolId);
    }

    const isBootstrapping = targetPool.poolMode === 'BOOTSTRAPPING';
    // Fee split: 0.20% to LPs, 0.10% to Creator (if Bootstrapping), or standard 0.20% to LPs
    const lpRatio = isBootstrapping ? (0.20 / 0.30) : (0.20 / 0.30);
    const creatorRatio = isBootstrapping ? (0.10 / 0.30) : 0.0;

    const lpFeeCut = feeAmount * lpRatio;
    const creatorFeeCut = feeAmount * creatorRatio;

    if (from === targetPool.tokenA) {
      targetPool.reserveA += lpFeeCut;
      targetPool.cumulativeFeesA += lpFeeCut;
      if (creatorFeeCut > 0 && targetPool.creatorAddress) {
        targetPool.creatorFeesEarnedA = (targetPool.creatorFeesEarnedA || 0) + creatorFeeCut;
        db.updateUserBalance(targetPool.creatorAddress, from, creatorFeeCut, 'add');
      }
    } else {
      targetPool.reserveB += lpFeeCut;
      targetPool.cumulativeFeesB += lpFeeCut;
      if (creatorFeeCut > 0 && targetPool.creatorAddress) {
        targetPool.creatorFeesEarnedB = (targetPool.creatorFeesEarnedB || 0) + creatorFeeCut;
        db.updateUserBalance(targetPool.creatorAddress, from, creatorFeeCut, 'add');
      }
    }

    targetPool.totalVolumeUsd += Number(swapAmount);
    targetPool.updatedAt = new Date().toISOString();

    // Check if bootstrapping pool reached threshold
    db.persist();

    // Redis broadcast
    if (db.redisReady && db.redis) {
      db.redis.publish('pool_events', JSON.stringify({ type: 'FEE_ACCRUED', poolId: targetPool.id, lpFeeCut, fromToken })).catch(() => {});
    }

    return targetPool;
  }

  /**
   * Permissionless Cross-Chain Pool Factory
   * Allows any creator to list a Bitcoin Cash CashToken against intra-chain or cross-chain liquidity.
   * 
   * Two Launch Modes:
   * 1. 'BOOTSTRAPPING' (Fair Launch / Anti-Rug): Creator sets funding goal. Liquidity is locked permanently.
   *    Creator earns 0.05% Creator Fee on every trade. Unlocks automatically when target TVL is achieved.
   * 2. 'STANDARD' (Uniswap V2 Style): Creator provides balanced initial liquidity upfront. Active immediately.
   */
  async createCustomPool({
    creatorAddress,
    tokenA,
    tokenB,
    tokenAName,
    tokenBName,
    networkA = 'Bitcoin Cash (Mainnet)',
    networkB = 'Polygon (Mainnet)',
    networkBadgeA = 'BCH CashTokens',
    networkBadgeB = 'Polygon PoS',
    categoryIdA = null,
    decimalsA = 6,
    decimalsB = 6,
    iconA = null,
    iconB = null,
    poolMode = 'BOOTSTRAPPING',
    targetTvlUsd = 2500,
    initialAmountA = 100000,
    initialAmountB = 0,
    initialPriceUsd = 0.01
  }) {
    if (!creatorAddress) throw new Error('Se requiere la dirección del creador.');
    if (!tokenA || !tokenB) throw new Error('Se requieren los símbolos de ambos tokens.');

    const symA = tokenA.trim().toUpperCase();
    const symB = tokenB.trim().toUpperCase();

    if (symA === symB) throw new Error('Los tokens del par deben ser diferentes.');

    // Protocol Rule: At least one token MUST be from Bitcoin Cash
    const isA_Bch = (networkA || '').includes('Bitcoin Cash') || symA === 'BCH' || symA === 'PUSD' || symA === 'MUSD' || Boolean(categoryIdA);
    const isB_Bch = (networkB || '').includes('Bitcoin Cash') || symB === 'BCH' || symB === 'PUSD' || symB === 'MUSD';

    if (!isA_Bch && !isB_Bch) {
      throw new Error('Regla de Protocolo BinaryLiquid: Al menos uno de los activos del par debe pertenecer a la red Bitcoin Cash (BCH nativo o CashToken con Category ID).');
    }

    // Category ID validation for CashTokens
    if (categoryIdA) {
      const cleanCat = categoryIdA.trim().toLowerCase();
      if (!/^[0-9a-f]{64}$/.test(cleanCat)) {
        throw new Error('El CashToken Category ID debe ser un hash hexadecimal válido de 64 caracteres.');
      }
    }

    const poolId = `${symA}_${symB}`;
    this.initPools();

    if (db.memoryState.pools[poolId]) {
      throw new Error(`El par de liquidez ${symA} / ${symB} ya existe en el protocolo.`);
    }

    const initA = Math.max(0, Number(initialAmountA) || 0);
    const initB = Math.max(0, Number(initialAmountB) || 0);
    const isBootstrapping = poolMode === 'BOOTSTRAPPING';

    const targetTvl = isBootstrapping 
      ? Math.max(500, Number(targetTvlUsd) || 2500) 
      : Math.max(100, (initA * (Number(initialPriceUsd) || 1)) + (initB * 1));

    const initialTvl = (initA * (Number(initialPriceUsd) || 1)) + (initB * 1);
    const status = isBootstrapping ? (initialTvl >= targetTvl ? 'ACTIVE' : 'BOOTSTRAPPING') : 'ACTIVE';

    // Clean and resolve IPFS URI if supplied
    const resolveIcon = (icon, fallback) => {
      if (!icon || typeof icon !== 'string') return fallback;
      const clean = icon.trim();
      if (clean.startsWith('ipfs://')) {
        return `https://ipfs.io/ipfs/${clean.replace('ipfs://', '')}`;
      }
      return clean;
    };

    const resolvedIconA = resolveIcon(iconA, isA_Bch ? '/BCH.png' : '/USDC.png');
    const resolvedIconB = resolveIcon(iconB, isB_Bch ? '/BCH.png' : '/USDC.png');

    const newPool = {
      id: poolId,
      pair: `${symA} / ${symB}`,
      name: `${tokenAName || symA} ⟷ ${tokenBName || symB}`,
      tokenA: symA,
      tokenB: symB,
      networkA,
      networkB,
      networkBadgeA: networkBadgeA || (isA_Bch ? 'BCH CashTokens' : 'External Chain'),
      networkBadgeB: networkBadgeB || (isB_Bch ? 'BCH CashTokens' : 'External Chain'),
      iconA: resolvedIconA,
      iconB: resolvedIconB,
      decimalsA: Number(decimalsA) || 6,
      decimalsB: Number(decimalsB) || 6,
      categoryIdA: categoryIdA ? categoryIdA.trim().toLowerCase() : null,
      reserveA: initA,
      reserveB: initB,
      reserveBch: isA_Bch ? initA : initB,
      reserveEvm: isA_Bch ? initB : initA,
      bchToken: isA_Bch ? symA : symB,
      evmToken: isA_Bch ? symB : symA,
      totalShares: Math.max(1000, initA > 0 ? initA : 1000),
      targetTvlUsd: targetTvl,
      status,
      feePercent: 0.30,
      lpFeePercent: 0.20,
      creatorFeePercent: isBootstrapping ? 0.10 : 0.0,
      protocolFeePercent: isBootstrapping ? 0.00 : 0.10,
      cumulativeFeesA: 0,
      cumulativeFeesB: 0,
      creatorFeesEarnedA: 0,
      creatorFeesEarnedB: 0,
      totalVolumeUsd: 0,
      isCustom: true,
      creatorAddress: creatorAddress.toLowerCase(),
      poolMode,
      liquidityLocked: isBootstrapping,
      isVerified: false,
      verificationBadge: 'Comunitario',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Store in DB
    db.memoryState.pools[poolId] = newPool;
    db.persist();

    // Register creator initial position
    if (initA > 0 || initB > 0) {
      if (!db.memoryState.lpPositions) db.memoryState.lpPositions = [];
      const positionId = `lp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      db.memoryState.lpPositions.push({
        id: positionId,
        poolId,
        providerAddress: creatorAddress.toLowerCase(),
        shares: newPool.totalShares,
        depositedAmount: initA,
        depositToken: symA,
        depositUsd: initialTvl,
        isCreatorInitial: true,
        isLocked: isBootstrapping,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      db.persist();
    }

    db.logEvent('CUSTOM_POOL_CREATED', `New custom pool created: ${symA}/${symB} by ${creatorAddress} (${poolMode})`, {
      poolId,
      creator: creatorAddress,
      poolMode,
      targetTvlUsd: targetTvl
    });

    return await this.enrichPoolData(newPool);
  }

  /**
   * Adds single-sided or balanced liquidity and mints LP Shares.
   */
  async addLiquidity({ providerAddress, token, amount, poolId = this.defaultPoolId }) {
    if (!providerAddress || !amount || parseFloat(amount) <= 0) {
      throw new Error('Invalid provider address or deposit amount');
    }

    const pool = this.getPool(poolId);
    const depositNum = parseFloat(amount);
    const depositToken = (token || pool.tokenA).toUpperCase();

    // Check user balance in database
    const userBalances = db.getUserBalances(providerAddress);
    const currentBalance = userBalances[depositToken] || 0;
    if (depositNum > currentBalance) {
      throw new Error(`Insufficient wallet balance. You have ${currentBalance} ${depositToken}, cannot deposit ${depositNum}.`);
    }

    const price = await this.getTokenPrice(depositToken);
    const depositUsd = depositNum * price;

    const priceA = await this.getTokenPrice(pool.tokenA);
    const priceB = await this.getTokenPrice(pool.tokenB);
    const currentTvl = (pool.reserveA * priceA) + (pool.reserveB * priceB);

    // Mathematical LP Share Minting Formula:
    // shares = (depositUsd / currentTVL) * totalShares
    const sharesToMint = currentTvl > 0 
      ? (depositUsd / currentTvl) * pool.totalShares 
      : depositUsd;

    // Deduct from wallet balance
    db.updateUserBalance(providerAddress, depositToken, -depositNum);

    // Update pool reserves and total shares
    if (depositToken === pool.tokenA) {
      pool.reserveA += depositNum;
    } else {
      pool.reserveB += depositNum;
    }
    pool.totalShares += sharesToMint;
    pool.updatedAt = new Date().toISOString();

    // Check if Bootstrapping Pool unlocked to ACTIVE
    const newTvl = (pool.reserveA * priceA) + (pool.reserveB * priceB);
    let unlockedNow = false;
    if (pool.status === 'BOOTSTRAPPING' && newTvl >= pool.targetTvlUsd) {
      pool.status = 'ACTIVE';
      pool.unlockedAt = new Date().toISOString();
      unlockedNow = true;
    }

    // Store LP Position
    if (!db.memoryState.lpPositions) {
      db.memoryState.lpPositions = [];
    }

    const positionId = `lp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const position = {
      id: positionId,
      poolId: pool.id,
      pair: pool.pair,
      providerAddress: providerAddress.toLowerCase(),
      shares: Number(sharesToMint.toFixed(4)),
      depositedAmount: depositNum,
      tokenSymbol: depositToken,
      depositUsd: Number(depositUsd.toFixed(2)),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.memoryState.lpPositions.push(position);
    db.persist();

    // PostgreSQL sync
    if (db.pgReady && db.pgPool) {
      try {
        await db.pgPool.query(`
          INSERT INTO lp_positions (id, pool_id, provider_address, shares, deposited_amount, token_symbol, deposit_usd)
          VALUES ($1, $2, $3, $4, $5, $6, $7);
        `, [position.id, position.poolId, position.providerAddress, position.shares, position.depositedAmount, position.tokenSymbol, position.depositUsd]);
      } catch (err) {
        console.warn('[Pool Service] PG addLiquidity note:', err.message);
      }
    }

    const userSharePercent = Number(((sharesToMint / pool.totalShares) * 100).toFixed(4));

    return {
      success: true,
      position,
      sharesMinted: Number(sharesToMint.toFixed(4)),
      poolSharePercentage: userSharePercent,
      newPoolTvlUsd: Number(newTvl.toFixed(2)),
      poolStatus: pool.status,
      unlockedNow,
      updatedUserBalance: db.getUserBalances(providerAddress)[depositToken]
    };
  }

  /**
   * Burns LP Shares and releases proportional capital + accumulated fees directly back to user wallet.
   */
  async removeLiquidity({ positionId, providerAddress, sharesToBurn, poolId = null }) {
    if (!providerAddress || !positionId) {
      throw new Error('Position ID and provider address are required');
    }

    if (!db.memoryState.lpPositions) db.memoryState.lpPositions = [];

    const posIdx = db.memoryState.lpPositions.findIndex(p => 
      p.id === positionId && p.providerAddress.toLowerCase() === providerAddress.toLowerCase()
    );

    if (posIdx === -1) {
      throw new Error('LP Position not found for this wallet');
    }

    const pos = db.memoryState.lpPositions[posIdx];
    const targetPoolId = poolId || pos.poolId || this.defaultPoolId;
    const pool = this.getPool(targetPoolId);

    // Anti-Rug Protection Check for Bootstrapping pools
    if (pos.isLocked && pool.liquidityLocked) {
      throw new Error('Anti-Rug Protection Activa: La liquidez inicial de este pool fue bloqueada de forma permanente para proteger a los compradores (Fair Launch). El creador gana comisiones continuas por cada swap, pero no puede drenar los fondos base.');
    }

    const burnAmount = sharesToBurn ? parseFloat(sharesToBurn) : pos.shares;

    if (burnAmount <= 0 || burnAmount > pos.shares + 0.0001) {
      throw new Error(`Invalid shares to burn (available: ${pos.shares})`);
    }

    // Proportion of total pool owned by burned shares
    const shareRatio = burnAmount / pool.totalShares;
    const payoutA = Number((shareRatio * pool.reserveA).toFixed(4));
    const payoutB = Number((shareRatio * pool.reserveB).toFixed(4));

    const priceA = await this.getTokenPrice(pool.tokenA);
    const priceB = await this.getTokenPrice(pool.tokenB);
    const totalPayoutUsd = Number(((payoutA * priceA) + (payoutB * priceB)).toFixed(2));

    // Deduct from pool reserves
    pool.reserveA = Math.max(0, pool.reserveA - payoutA);
    pool.reserveB = Math.max(0, pool.reserveB - payoutB);
    pool.totalShares = Math.max(1, pool.totalShares - burnAmount);
    pool.updatedAt = new Date().toISOString();

    // Credit tokens back to user's non-custodial wallet balance
    db.updateUserBalance(providerAddress, pool.tokenA, payoutA);
    db.updateUserBalance(providerAddress, pool.tokenB, payoutB);

    // Update position
    pos.shares = Math.max(0, Number((pos.shares - burnAmount).toFixed(4)));
    pos.updatedAt = new Date().toISOString();

    if (pos.shares <= 0.0001) {
      db.memoryState.lpPositions.splice(posIdx, 1);
    }
    db.persist();

    // PostgreSQL sync
    if (db.pgReady && db.pgPool) {
      try {
        if (pos.shares <= 0.0001) {
          await db.pgPool.query(`DELETE FROM lp_positions WHERE id = $1`, [positionId]);
        } else {
          await db.pgPool.query(`UPDATE lp_positions SET shares = $1, updated_at = NOW() WHERE id = $2`, [pos.shares, positionId]);
        }
      } catch (err) {
        console.warn('[Pool Service] PG removeLiquidity note:', err.message);
      }
    }

    return {
      success: true,
      sharesBurned: burnAmount,
      payout: {
        tokenA: pool.tokenA,
        amountA: payoutA,
        tokenB: pool.tokenB,
        amountB: payoutB,
        totalUsdValue: totalPayoutUsd
      },
      remainingShares: pos.shares || 0,
      userBalances: db.getUserBalances(providerAddress),
      txHash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
    };
  }

  async verifyPool(poolId, { requesterAddress, txHash } = {}) {
    this.initPools();
    const pool = this.getPool(poolId);
    if (!pool) throw new Error('Pool not found');
    pool.isVerified = true;
    pool.verificationBadge = 'Verificado Oficial';
    pool.verifiedAt = new Date().toISOString();
    pool.verificationTx = txHash || null;
    pool.updatedAt = new Date().toISOString();
    db.persist();
    return pool;
  }

  async getPositionsForAddress(address, poolId = null) {
    if (!address) return [];
    if (!db.memoryState.lpPositions) db.memoryState.lpPositions = [];

    const norm = address.toLowerCase();
    const positions = db.memoryState.lpPositions.filter(p => {
      const matchAddr = p.providerAddress === norm;
      if (!matchAddr) return false;
      if (poolId) return p.poolId === poolId;
      return true;
    });

    const enriched = await Promise.all(positions.map(async (pos) => {
      const pool = this.getPool(pos.poolId);
      const priceA = await this.getTokenPrice(pool.tokenA);
      const priceB = await this.getTokenPrice(pool.tokenB);

      const shareRatio = pool.totalShares > 0 ? (pos.shares / pool.totalShares) : 0;
      const currentValA = shareRatio * pool.reserveA;
      const currentValB = shareRatio * pool.reserveB;
      const currentTotalUsd = (currentValA * priceA) + (currentValB * priceB);
      const profitUsd = currentTotalUsd - (pos.depositUsd || pos.depositedAmount || 0);

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
        profitPercentage: (pos.depositUsd || pos.depositedAmount) > 0 
          ? Number(((profitUsd / (pos.depositUsd || pos.depositedAmount)) * 100).toFixed(2)) 
          : 0
      };
    }));

    return enriched;
  }
}

export const poolService = new PoolService();
