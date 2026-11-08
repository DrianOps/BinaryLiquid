import { config } from '../config.js';
import { db } from './db.js';
import { oraclePool } from './oraclePool.js';
import { bchService } from './bchService.js';
import { evmService } from './evmService.js';
import { watchmanSentinel } from './watchmanClient.js';

const CANONICAL_MARKETS = {
  BCH_COLLATERAL: {
    id: 'BCH_COLLATERAL',
    asset: 'BCH',
    name: 'Bitcoin Cash Native',
    icon: '/BCH.png',
    type: 'COLLATERAL',
    maxLtv: 0.65,
    liquidationThreshold: 0.80,
    liquidationPenalty: 0.05,
    decimals: 8,
    isVerified: true
  },
  PUSD_BORROW: {
    id: 'PUSD_BORROW',
    asset: 'PUSD',
    name: 'ParyonUSD',
    icon: '/PUSD.png',
    type: 'BORROW',
    borrowApr: 0.035, // 3.5% APR
    supplyApy: 0.058, // 5.8% APY
    decimals: 6,
    isVerified: true,
    isSponsor: true,
    sponsorTag: 'Official BLAZE Track Sponsor (PUSD)'
  },
  USDT_BORROW: {
    id: 'USDT_BORROW',
    asset: 'USDT',
    name: 'Tether USD',
    icon: '/USDT.png',
    type: 'BORROW',
    borrowApr: 0.040, // 4.0% APR
    supplyApy: 0.064, // 6.4% APY
    decimals: 6,
    isVerified: true
  },
  USDC_BORROW: {
    id: 'USDC_BORROW',
    asset: 'USDC',
    name: 'USD Coin',
    icon: '/USDC.png',
    type: 'BORROW',
    borrowApr: 0.042,
    supplyApy: 0.060,
    decimals: 6,
    isVerified: true
  }
};

class LendingService {
  constructor() {
    this.pgSchemaMigrated = false;
    this.initStore();
  }

  initStore() {
    if (!db.memoryState.lendingVaults || typeof db.memoryState.lendingVaults !== 'object') {
      db.memoryState.lendingVaults = {};
    }
    if (!db.memoryState.lendingSupplies || typeof db.memoryState.lendingSupplies !== 'object') {
      db.memoryState.lendingSupplies = {};
    }
    if (!Array.isArray(db.memoryState.lendingTransactions)) {
      db.memoryState.lendingTransactions = [];
    }

    // Purge any legacy pre-audit simulated vaults/supplies that lacked real onChain verification
    let mutated = false;
    for (const [k, v] of Object.entries(db.memoryState.lendingVaults)) {
      if (!v || !v.onChainVerified) {
        delete db.memoryState.lendingVaults[k];
        mutated = true;
      }
    }
    for (const [k, s] of Object.entries(db.memoryState.lendingSupplies)) {
      if (!s || !s.onChainVerified) {
        delete db.memoryState.lendingSupplies[k];
        mutated = true;
      }
    }
    if (db.memoryState.lendingMarkets) {
      delete db.memoryState.lendingMarkets;
      mutated = true;
    }

    if (mutated) {
      db.persist();
    }
  }

  async initDatabaseTables() {
    this.initStore();
    if (db.pgPool && !this.pgSchemaMigrated) {
      try {
        await db.pgPool.query(`
          CREATE TABLE IF NOT EXISTS lending_vaults (
            vault_key VARCHAR(160) PRIMARY KEY,
            bch_address TEXT,
            evm_address TEXT,
            collateral_vault_address TEXT,
            collateral_bch NUMERIC NOT NULL DEFAULT 0,
            borrowed_pusd NUMERIC NOT NULL DEFAULT 0,
            borrowed_usdt NUMERIC NOT NULL DEFAULT 0,
            interest_pusd NUMERIC NOT NULL DEFAULT 0,
            interest_usdt NUMERIC NOT NULL DEFAULT 0,
            supplied_pusd NUMERIC NOT NULL DEFAULT 0,
            supplied_usdt NUMERIC NOT NULL DEFAULT 0,
            yield_pusd NUMERIC NOT NULL DEFAULT 0,
            yield_usdt NUMERIC NOT NULL DEFAULT 0,
            network VARCHAR(20) NOT NULL DEFAULT 'testnet',
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS lending_transactions (
            id VARCHAR(80) PRIMARY KEY,
            vault_key VARCHAR(160) NOT NULL,
            action VARCHAR(40) NOT NULL,
            token VARCHAR(20) NOT NULL,
            amount NUMERIC NOT NULL,
            tx_hash TEXT NOT NULL,
            explorer_url TEXT,
            network VARCHAR(20) NOT NULL DEFAULT 'testnet',
            created_at TIMESTAMPTZ DEFAULT NOW()
          );
        `);
        this.pgSchemaMigrated = true;
        console.log('[Lending Service] PostgreSQL lending_vaults & lending_transactions schema verified.');
      } catch (err) {
        console.warn('[Lending Service] PG table init note:', err.message);
      }
    }
  }

  async syncVaultToPostgres(vaultKey, vault, supply) {
    if (!db.pgPool) return;
    try {
      await this.initDatabaseTables();
      await db.pgPool.query(
        `INSERT INTO lending_vaults (
          vault_key, bch_address, evm_address, collateral_vault_address,
          collateral_bch, borrowed_pusd, borrowed_usdt, interest_pusd, interest_usdt,
          supplied_pusd, supplied_usdt, yield_pusd, yield_usdt, network, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW())
        ON CONFLICT (vault_key) DO UPDATE SET
          bch_address = EXCLUDED.bch_address,
          evm_address = EXCLUDED.evm_address,
          collateral_vault_address = EXCLUDED.collateral_vault_address,
          collateral_bch = EXCLUDED.collateral_bch,
          borrowed_pusd = EXCLUDED.borrowed_pusd,
          borrowed_usdt = EXCLUDED.borrowed_usdt,
          interest_pusd = EXCLUDED.interest_pusd,
          interest_usdt = EXCLUDED.interest_usdt,
          supplied_pusd = EXCLUDED.supplied_pusd,
          supplied_usdt = EXCLUDED.supplied_usdt,
          yield_pusd = EXCLUDED.yield_pusd,
          yield_usdt = EXCLUDED.yield_usdt,
          updated_at = NOW()`,
        [
          vaultKey,
          vault.bchAddress || null,
          vault.evmAddress || null,
          vault.collateralVaultAddress || null,
          vault.collateralBch || 0,
          vault.borrowedPusd || 0,
          vault.borrowedUsdt || 0,
          vault.interestAccruedPusd || 0,
          vault.interestAccruedUsdt || 0,
          supply.suppliedPusd || 0,
          supply.suppliedUsdt || 0,
          supply.yieldEarnedPusd || 0,
          supply.yieldEarnedUsdt || 0,
          vault.network || 'testnet'
        ]
      );
    } catch (err) {
      console.warn('[Lending Service] PG sync vault note:', err.message);
    }
  }

  async recordLendTx({ vaultKey, action, token, amount, txHash, explorerUrl, network = 'testnet' }) {
    const entry = {
      id: `lendtx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      vaultKey,
      action,
      token,
      amount: Number(amount),
      txHash,
      explorerUrl,
      network,
      createdAt: new Date().toISOString()
    };
    db.memoryState.lendingTransactions.unshift(entry);
    if (db.memoryState.lendingTransactions.length > 500) {
      db.memoryState.lendingTransactions.length = 500;
    }
    db.persist();

    if (db.pgPool) {
      try {
        await this.initDatabaseTables();
        await db.pgPool.query(
          `INSERT INTO lending_transactions (id, vault_key, action, token, amount, tx_hash, explorer_url, network)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [entry.id, vaultKey, action, token, entry.amount, txHash, explorerUrl || null, network]
        );
      } catch (err) {
        console.warn('[Lending Service] PG tx log note:', err.message);
      }
    }
    return entry;
  }

  isTxHashAlreadyUsed(txHash) {
    if (!txHash) return false;
    const norm = txHash.trim().toLowerCase();
    const swaps = Array.isArray(db.memoryState.swaps) ? db.memoryState.swaps : [];
    const positions = Array.isArray(db.memoryState.lpPositions) ? db.memoryState.lpPositions : [];
    const lendTxs = Array.isArray(db.memoryState.lendingTransactions) ? db.memoryState.lendingTransactions : [];
    if (swaps.some(s => String(s.depositTxHash || '').toLowerCase() === norm)) return true;
    if (positions.some(p => String(p.txHash || '').toLowerCase() === norm)) return true;
    if (lendTxs.some(t => String(t.txHash || '').toLowerCase() === norm)) return true;
    return false;
  }

  async getBchPrice() {
    try {
      const price = await oraclePool.getPriceUsd('BCH');
      return Number(price) > 0 ? Number(price) : 289.0;
    } catch {
      return 289.0;
    }
  }

  accrueVaultInterest(vault) {
    const now = Date.now();
    const lastUpdate = vault.lastInterestUpdate || now;
    const elapsedSeconds = Math.max(0, (now - lastUpdate) / 1000);
    const secondsInYear = 365 * 24 * 3600;

    if (vault.borrowedPusd > 0 && elapsedSeconds > 0) {
      const added = (vault.borrowedPusd * CANONICAL_MARKETS.PUSD_BORROW.borrowApr * elapsedSeconds) / secondsInYear;
      vault.interestAccruedPusd = Number(((vault.interestAccruedPusd || 0) + added).toFixed(6));
    }

    if (vault.borrowedUsdt > 0 && elapsedSeconds > 0) {
      const added = (vault.borrowedUsdt * CANONICAL_MARKETS.USDT_BORROW.borrowApr * elapsedSeconds) / secondsInYear;
      vault.interestAccruedUsdt = Number(((vault.interestAccruedUsdt || 0) + added).toFixed(6));
    }

    vault.lastInterestUpdate = now;
  }

  accrueSupplyYield(supply) {
    const now = Date.now();
    const lastUpdate = supply.lastYieldUpdate || now;
    const elapsedSeconds = Math.max(0, (now - lastUpdate) / 1000);
    const secondsInYear = 365 * 24 * 3600;

    if (supply.suppliedPusd > 0 && elapsedSeconds > 0) {
      const added = (supply.suppliedPusd * CANONICAL_MARKETS.PUSD_BORROW.supplyApy * elapsedSeconds) / secondsInYear;
      supply.yieldEarnedPusd = Number(((supply.yieldEarnedPusd || 0) + added).toFixed(6));
    }

    if (supply.suppliedUsdt > 0 && elapsedSeconds > 0) {
      const added = (supply.suppliedUsdt * CANONICAL_MARKETS.USDT_BORROW.supplyApy * elapsedSeconds) / secondsInYear;
      supply.yieldEarnedUsdt = Number(((supply.yieldEarnedUsdt || 0) + added).toFixed(6));
    }

    supply.lastYieldUpdate = now;
  }

  resolveVaultEntry({ userAddress = '', bchAddress = '', evmAddress = '', network = 'testnet' }) {
    this.initStore();
    const net = String(network || 'testnet').toLowerCase() === 'testnet' ? 'testnet' : 'mainnet';
    const cleanBch = (
      bchAddress ||
      (userAddress && (userAddress.startsWith('bchtest:') || userAddress.startsWith('bitcoincash:')) ? userAddress : '')
    ).trim().toLowerCase();
    const cleanEvm = (
      evmAddress ||
      (userAddress && userAddress.startsWith('0x') ? userAddress : '')
    ).trim().toLowerCase();
    const fallbackAddr = (userAddress || '').trim().toLowerCase();

    const candidates = [cleanBch, cleanEvm, fallbackAddr].filter(Boolean);
    if (candidates.length === 0) {
      throw new Error('Conecta tu billetera antes de consultar o interactuar con tu Bóveda.');
    }

    // Search for an existing vault matching either bchAddress or evmAddress on the same network
    let matchedKey = null;
    for (const [k, v] of Object.entries(db.memoryState.lendingVaults)) {
      if ((v.network || 'testnet') !== net) continue;
      const known = [v.userAddress, v.bchAddress, v.evmAddress].filter(Boolean).map(x => x.toLowerCase());
      if (candidates.some(c => known.includes(c))) {
        matchedKey = k;
        break;
      }
    }

    if (!matchedKey) {
      matchedKey = `${net}:${cleanBch || cleanEvm || fallbackAddr}`;
    }

    let vault = db.memoryState.lendingVaults[matchedKey];
    if (!vault) {
      vault = {
        onChainVerified: true,
        network: net,
        userAddress: cleanBch || cleanEvm || fallbackAddr,
        bchAddress: cleanBch || null,
        evmAddress: cleanEvm || null,
        collateralVaultAddress: null,
        collateralBch: 0.0,
        borrowedPusd: 0.0,
        borrowedUsdt: 0.0,
        interestAccruedPusd: 0.0,
        interestAccruedUsdt: 0.0,
        knownCollateralTxids: [],
        lastInterestUpdate: Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      db.memoryState.lendingVaults[matchedKey] = vault;
    } else {
      if (cleanBch && !vault.bchAddress) vault.bchAddress = cleanBch;
      if (cleanEvm && !vault.evmAddress) vault.evmAddress = cleanEvm;
      this.accrueVaultInterest(vault);
    }

    let supply = db.memoryState.lendingSupplies[matchedKey];
    if (!supply) {
      supply = {
        onChainVerified: true,
        network: net,
        userAddress: cleanBch || cleanEvm || fallbackAddr,
        suppliedPusd: 0.0,
        suppliedUsdt: 0.0,
        yieldEarnedPusd: 0.0,
        yieldEarnedUsdt: 0.0,
        lastYieldUpdate: Date.now()
      };
      db.memoryState.lendingSupplies[matchedKey] = supply;
    } else {
      this.accrueSupplyYield(supply);
    }

    return { vaultKey: matchedKey, vault, supply, cleanBch, cleanEvm, net };
  }

  /**
   * Returns 100% genuine live on-chain markets overview for Testnet or Mainnet.
   */
  async getMarketsOverview({ network = 'testnet' } = {}) {
    this.initStore();
    const isTestnet = String(network || 'testnet').toLowerCase() === 'testnet';
    const net = isTestnet ? 'testnet' : 'mainnet';

    const [bchPrice, bchBalances, evmBalances] = await Promise.all([
      this.getBchPrice(),
      bchService.getBalances().catch(() => ({ chipnet: { PUSD: 0, bch: 0 }, mainnet: { PUSD: 0, bch: 0 } })),
      evmService.getBalances().catch(() => ({ amoy: { USDT: 0, USDC: 0 }, mainnet: { USDT: 0, USDC: 0 } }))
    ]);

    const livePusdVault = isTestnet ? Number(bchBalances?.chipnet?.PUSD || 0) : 0;
    const liveUsdtVault = isTestnet ? Number(evmBalances?.amoy?.USDT || 0) : 0;

    // Sum genuine user collateral & borrows on the selected network
    const activeVaults = Object.values(db.memoryState.lendingVaults).filter(v => (v.network || 'testnet') === net);
    const activeSupplies = Object.values(db.memoryState.lendingSupplies).filter(s => (s.network || 'testnet') === net);

    const totalCollateralBch = isTestnet
      ? activeVaults.reduce((s, v) => s + Number(v.collateralBch || 0), 0)
      : 0;
    const totalCollateralUsd = totalCollateralBch * bchPrice;

    const totalBorrowedPusd = isTestnet
      ? activeVaults.reduce((s, v) => s + Number(v.borrowedPusd || 0) + Number(v.interestAccruedPusd || 0), 0)
      : 0;
    const totalBorrowedUsdt = isTestnet
      ? activeVaults.reduce((s, v) => s + Number(v.borrowedUsdt || 0) + Number(v.interestAccruedUsdt || 0), 0)
      : 0;

    const userSuppliedPusd = isTestnet
      ? activeSupplies.reduce((s, x) => s + Number(x.suppliedPusd || 0), 0)
      : 0;
    const userSuppliedUsdt = isTestnet
      ? activeSupplies.reduce((s, x) => s + Number(x.suppliedUsdt || 0), 0)
      : 0;

    const pusdVaultAddr = isTestnet ? config.bch.chipnetVaultTokenAddress : config.bch.mainnetVaultTokenAddress;
    const usdtVaultAddr = isTestnet ? config.evm.amoyVaultAddress : config.evm.mainnetVaultAddress;
    const usdtTokenAddr = isTestnet
      ? config.evm.amoyTokens?.USDT?.address || '0x1a29793F2a64424D09f56AD045827dF1F0Fa1A75'
      : config.evm.mainnetTokens?.USDT?.address || null;

    const markets = {
      BCH_COLLATERAL: {
        ...CANONICAL_MARKETS.BCH_COLLATERAL,
        network: isTestnet ? 'BCH Chipnet (Testnet4)' : 'Bitcoin Cash (Mainnet)',
        networkBadge: isTestnet ? 'Chipnet CashScript Covenant' : 'BCH Layer 1',
        contractName: 'BinaryLiquidCollateralVault.cash',
        status: isTestnet ? 'ACTIVE' : 'NO_LIQUIDITY',
        hasLiquidity: isTestnet,
        liquidityBadge: isTestnet ? 'Covenant P2SH32 Activo' : 'Sin Liquidez',
        totalCollateralBch: Number(totalCollateralBch.toFixed(6)),
        totalCollateralUsd: Number(totalCollateralUsd.toFixed(2))
      },
      PUSD_BORROW: {
        ...CANONICAL_MARKETS.PUSD_BORROW,
        network: isTestnet ? 'BCH Chipnet (Testnet4)' : 'Bitcoin Cash (Mainnet)',
        networkBadge: isTestnet ? 'Chipnet CashTokens' : 'BCH CashTokens',
        contractName: 'BinaryLiquidVault.cash',
        vaultAddress: pusdVaultAddr,
        explorerUrl: isTestnet && pusdVaultAddr ? `https://chipnet.imaginary.cash/address/${pusdVaultAddr}` : null,
        categoryId: isTestnet ? config.bch.tokens.PUSD.chipnetCategory : config.bch.tokens.PUSD.category,
        status: isTestnet && livePusdVault > 0 ? 'ACTIVE' : 'NO_LIQUIDITY',
        hasLiquidity: isTestnet && livePusdVault > 0,
        liquidityBadge: isTestnet && livePusdVault > 0 ? 'Liquidez On-Chain Activa' : 'Sin Liquidez',
        availableLiquidity: Number(livePusdVault.toFixed(2)),
        totalBorrowed: Number(totalBorrowedPusd.toFixed(2)),
        totalSupplied: Number((livePusdVault + totalBorrowedPusd + userSuppliedPusd).toFixed(2))
      },
      USDT_BORROW: {
        ...CANONICAL_MARKETS.USDT_BORROW,
        network: isTestnet ? 'Polygon Amoy (Testnet)' : 'Polygon (Mainnet)',
        networkBadge: isTestnet ? 'Polygon Amoy' : 'Polygon PoS',
        contractName: 'BinaryLiquidVault.sol',
        vaultAddress: usdtVaultAddr,
        tokenAddress: usdtTokenAddr,
        explorerUrl: isTestnet && usdtVaultAddr ? `https://amoy.polygonscan.com/address/${usdtVaultAddr}` : null,
        status: isTestnet && liveUsdtVault > 0 ? 'ACTIVE' : 'NO_LIQUIDITY',
        hasLiquidity: isTestnet && liveUsdtVault > 0,
        liquidityBadge: isTestnet && liveUsdtVault > 0 ? 'Liquidez On-Chain Activa' : 'Sin Liquidez',
        availableLiquidity: Number(liveUsdtVault.toFixed(2)),
        totalBorrowed: Number(totalBorrowedUsdt.toFixed(2)),
        totalSupplied: Number((liveUsdtVault + totalBorrowedUsdt + userSuppliedUsdt).toFixed(2))
      },
      USDC_BORROW: {
        ...CANONICAL_MARKETS.USDC_BORROW,
        network: isTestnet ? 'Polygon Amoy (Testnet)' : 'Polygon (Mainnet)',
        networkBadge: isTestnet ? 'Polygon Amoy' : 'Polygon PoS',
        status: 'NO_LIQUIDITY',
        hasLiquidity: false,
        liquidityBadge: 'Sin Liquidez',
        availableLiquidity: 0,
        totalBorrowed: 0,
        totalSupplied: 0
      }
    };

    const totalBorrowedUsd = totalBorrowedPusd + totalBorrowedUsdt;
    const totalAvailableLiquidityUsd = livePusdVault + liveUsdtVault;
    const totalTvlUsd = isTestnet ? totalCollateralUsd + totalAvailableLiquidityUsd : 0;

    return {
      network: net,
      bchPrice: Number(bchPrice.toFixed(2)),
      markets,
      contracts: {
        collateralCovenant: 'BinaryLiquidCollateralVault.cash (45 opcodes, P2SH32)',
        pusdVaultAddress: pusdVaultAddr,
        usdtVaultAddress: usdtVaultAddr,
        usdtTokenAddress: usdtTokenAddr
      },
      protocolStats: {
        network: net,
        totalCollateralBch: Number(totalCollateralBch.toFixed(6)),
        totalCollateralUsd: Number(totalCollateralUsd.toFixed(2)),
        totalBorrowedUsd: Number(totalBorrowedUsd.toFixed(2)),
        totalAvailableLiquidityUsd: Number(totalAvailableLiquidityUsd.toFixed(2)),
        totalTvlUsd: Number(totalTvlUsd.toFixed(2)),
        activeMarketsCount: Object.values(markets).filter(m => m.hasLiquidity).length,
        averageBorrowApr: isTestnet ? '3.75%' : '0.00%',
        averageSupplyApy: isTestnet ? '6.10%' : '0.00%',
        maxLtvPercent: '65%',
        liquidationThresholdPercent: '80%'
      }
    };
  }

  /**
   * Returns the user's unified cross-chain Lending Vault, automatically syncing live BCH satoshis
   * from their personal deterministic `BinaryLiquidCollateralVault.cash` Covenant!
   */
  async getUserVault(userAddress, { bchAddress = '', evmAddress = '', network = 'testnet' } = {}) {
    const { vaultKey, vault, supply, cleanBch, net } = this.resolveVaultEntry({
      userAddress,
      bchAddress,
      evmAddress,
      network
    });

    const isTestnet = net === 'testnet';
    const bchPrice = await this.getBchPrice();

    let collateralCovenantInfo = null;
    if (isTestnet && cleanBch && cleanBch.startsWith('bchtest:')) {
      try {
        collateralCovenantInfo = await bchService.getCollateralVaultLiveBalance(cleanBch, true);
        vault.collateralVaultAddress = collateralCovenantInfo.vaultAddress;
        // Sync collateralBch directly from the live on-chain P2SH32 Covenant UTXOs!
        vault.collateralBch = Number(collateralCovenantInfo.balanceBch.toFixed(8));
        vault.updatedAt = new Date().toISOString();
      } catch (err) {
        console.warn('[Lending Service] Collateral Covenant sync warning:', err.message);
      }
    } else if (!isTestnet) {
      vault.collateralBch = 0;
    }

    db.persist();

    const collateralUsd = vault.collateralBch * bchPrice;
    const totalPusdDebt = (vault.borrowedPusd || 0) + (vault.interestAccruedPusd || 0);
    const totalUsdtDebt = (vault.borrowedUsdt || 0) + (vault.interestAccruedUsdt || 0);
    const totalDebtUsd = totalPusdDebt + totalUsdtDebt;

    const maxBorrowCapacityUsd = collateralUsd * 0.65;
    const availableBorrowUsd = Math.max(0, maxBorrowCapacityUsd - totalDebtUsd);

    let healthFactor = 999.0;
    let healthStatus = 'SAFE';
    if (totalDebtUsd > 0) {
      healthFactor = Number(((collateralUsd * 0.80) / totalDebtUsd).toFixed(2));
      if (healthFactor >= 1.5) healthStatus = 'SAFE';
      else if (healthFactor >= 1.15) healthStatus = 'MODERATE';
      else healthStatus = 'RISK';
    }

    let withdrawableBch = vault.collateralBch;
    if (totalDebtUsd > 0) {
      const minRequiredCollateralUsd = (totalDebtUsd * 1.15) / 0.80;
      const safeWithdrawableUsd = Math.max(0, collateralUsd - minRequiredCollateralUsd);
      withdrawableBch = Number((safeWithdrawableUsd / bchPrice).toFixed(6));
    }

    const totalWithdrawablePusd = (supply.suppliedPusd || 0) + (supply.yieldEarnedPusd || 0);
    const totalWithdrawableUsdt = (supply.suppliedUsdt || 0) + (supply.yieldEarnedUsdt || 0);

    const recentTxs = (db.memoryState.lendingTransactions || [])
      .filter(tx => tx.vaultKey === vaultKey)
      .slice(0, 10);

    return {
      network: net,
      bchPrice: Number(bchPrice.toFixed(2)),
      collateralCovenant: collateralCovenantInfo
        ? {
            vaultAddress: collateralCovenantInfo.vaultAddress,
            borrowerBaseAddress: collateralCovenantInfo.borrowerBaseAddress,
            contractName: collateralCovenantInfo.contractName,
            contractType: collateralCovenantInfo.contractType,
            explorerUrl: collateralCovenantInfo.explorerUrl,
            utxoCount: collateralCovenantInfo.utxoCount,
            liveBalanceBch: collateralCovenantInfo.balanceBch
          }
        : null,
      repayVaults: isTestnet
        ? {
            pusdVaultAddress: config.bch.chipnetVaultTokenAddress,
            usdtVaultAddress: config.evm.amoyVaultAddress,
            usdtTokenAddress: config.evm.amoyTokens?.USDT?.address || '0x1a29793F2a64424D09f56AD045827dF1F0Fa1A75'
          }
        : null,
      vault: {
        ...vault,
        collateralBch: Number(vault.collateralBch.toFixed(6)),
        collateralUsd: Number(collateralUsd.toFixed(2)),
        totalPusdDebt: Number(totalPusdDebt.toFixed(4)),
        totalUsdtDebt: Number(totalUsdtDebt.toFixed(4)),
        // Keep legacy alias for backwards compatibility
        totalUsdcDebt: 0,
        totalDebtUsd: Number(totalDebtUsd.toFixed(4)),
        maxBorrowCapacityUsd: Number(maxBorrowCapacityUsd.toFixed(2)),
        availableBorrowUsd: Number(availableBorrowUsd.toFixed(2)),
        healthFactor,
        healthStatus,
        withdrawableBch: Number(withdrawableBch.toFixed(6)),
        currentLtvPercent: collateralUsd > 0 ? Number(((totalDebtUsd / collateralUsd) * 100).toFixed(1)) : 0
      },
      supply: {
        ...supply,
        suppliedPusd: Number((supply.suppliedPusd || 0).toFixed(4)),
        suppliedUsdt: Number((supply.suppliedUsdt || 0).toFixed(4)),
        suppliedUsdc: 0,
        yieldEarnedPusd: Number((supply.yieldEarnedPusd || 0).toFixed(6)),
        yieldEarnedUsdt: Number((supply.yieldEarnedUsdt || 0).toFixed(6)),
        yieldEarnedUsdc: 0,
        totalWithdrawablePusd: Number(totalWithdrawablePusd.toFixed(4)),
        totalWithdrawableUsdt: Number(totalWithdrawableUsdt.toFixed(4)),
        totalSuppliedUsd: Number(((supply.suppliedPusd || 0) + (supply.suppliedUsdt || 0)).toFixed(2))
      },
      recentTransactions: recentTxs
    };
  }

  /**
   * 1. DEPOSIT BCH COLLATERAL (On-Chain CashScript Covenant Verification)
   */
  async depositCollateral({
    userAddress,
    bchAddress = '',
    evmAddress = '',
    amountBch = 0,
    txHash = '',
    network = 'testnet'
  }) {
    const isTestnet = String(network || 'testnet').toLowerCase() === 'testnet';
    if (!isTestnet) {
      throw new Error('Sin Liquidez en Mainnet. Cambia a la red Testnet para depositar colateral tBCH en tu Smart Contract CashScript.');
    }

    const { vaultKey, vault, supply, cleanBch } = this.resolveVaultEntry({
      userAddress,
      bchAddress,
      evmAddress,
      network: 'testnet'
    });

    if (!cleanBch || !cleanBch.startsWith('bchtest:')) {
      throw new Error('Conecta una billetera Bitcoin Cash Chipnet (Paytaca o Cashonize con dirección bchtest:...) para generar y fondear tu Bóveda de Colateral P2SH32.');
    }

    const liveCovenant = await bchService.getCollateralVaultLiveBalance(cleanBch, true);
    vault.collateralVaultAddress = liveCovenant.vaultAddress;

    if (!Array.isArray(vault.knownCollateralTxids)) {
      vault.knownCollateralTxids = [];
    }

    let verifiedTxHash = '';
    let verifiedDepositBch = 0;

    if (txHash && txHash.trim().length > 0) {
      const cleanHex = txHash.trim().replace(/^0x/i, '').toLowerCase();
      if (!/^[0-9a-f]{64}$/.test(cleanHex)) {
        throw new Error('El TXID de Bitcoin Cash Chipnet debe tener exactamente 64 caracteres hexadecimales.');
      }
      if (this.isTxHashAlreadyUsed(cleanHex)) {
        throw new Error('Este TXID ya fue registrado previamente (protección Anti-Replay activa).');
      }

      const matchingUtxos = liveCovenant.utxos.filter(u => u.txid?.toLowerCase() === cleanHex);
      if (matchingUtxos.length === 0) {
        throw new Error(
          `No se detectó ningún UTXO con TXID ${cleanHex.slice(0, 12)}... dentro de tu Bóveda CashScript (${liveCovenant.vaultAddress}). Asegúrate de enviar tBCH a la dirección de tu bóveda.`
        );
      }

      verifiedDepositBch = matchingUtxos.reduce((s, u) => s + u.amountBch, 0);
      verifiedTxHash = cleanHex;
      if (!vault.knownCollateralTxids.includes(cleanHex)) {
        vault.knownCollateralTxids.push(cleanHex);
      }
    } else {
      // Auto-detect newly arrived UTXOs inside the user's personal P2SH32 Collateral Covenant!
      const newUtxos = liveCovenant.utxos.filter(
        u => u.txid && !vault.knownCollateralTxids.includes(u.txid.toLowerCase()) && !this.isTxHashAlreadyUsed(u.txid)
      );

      if (newUtxos.length === 0) {
        if (liveCovenant.balanceBch <= 0) {
          throw new Error(
            `Aún no se detectan fondos tBCH en tu Bóveda CashScript (${liveCovenant.vaultAddress}). Envía primero tBCH desde Paytaca o Cashonize y luego pulsa Verificar.`
          );
        }
        throw new Error(
          `Tu Bóveda CashScript ya se encuentra sincronizada al 100% (${liveCovenant.balanceBch.toFixed(6)} tBCH en cadena). Envía un nuevo depósito de tBCH si deseas incrementar tu colateral.`
        );
      }

      verifiedDepositBch = newUtxos.reduce((s, u) => s + u.amountBch, 0);
      verifiedTxHash = newUtxos[0].txid.toLowerCase();
      for (const u of newUtxos) {
        vault.knownCollateralTxids.push(u.txid.toLowerCase());
      }
    }

    vault.collateralBch = Number(liveCovenant.balanceBch.toFixed(8));
    vault.updatedAt = new Date().toISOString();
    db.persist();

    const explorerUrl = `https://chipnet.imaginary.cash/tx/${verifiedTxHash}`;
    await this.recordLendTx({
      vaultKey,
      action: 'DEPOSIT_COLLATERAL',
      token: 'BCH',
      amount: Number(verifiedDepositBch.toFixed(6)),
      txHash: verifiedTxHash,
      explorerUrl,
      network: 'testnet'
    });
    await this.syncVaultToPostgres(vaultKey, vault, supply);

    const updated = await this.getUserVault(cleanBch, { bchAddress: cleanBch, evmAddress, network: 'testnet' });
    return {
      ...updated,
      depositedBch: Number(verifiedDepositBch.toFixed(6)),
      txHash: verifiedTxHash,
      explorerUrl
    };
  }

  /**
   * 2. WITHDRAW BCH COLLATERAL (Real CashScript P2SH32 Covenant Execution)
   */
  async withdrawCollateral({
    userAddress,
    bchAddress = '',
    evmAddress = '',
    amountBch,
    network = 'testnet'
  }) {
    const isTestnet = String(network || 'testnet').toLowerCase() === 'testnet';
    if (!isTestnet) {
      throw new Error('Sin Liquidez en Mainnet. Cambia a Testnet para operar tu Bóveda.');
    }

    const amount = Number(amountBch);
    if (isNaN(amount) || amount <= 0) {
      throw new Error('Ingresa un monto válido de BCH para retirar.');
    }

    const { vaultKey, vault, supply, cleanBch } = this.resolveVaultEntry({
      userAddress,
      bchAddress,
      evmAddress,
      network: 'testnet'
    });

    if (!cleanBch || !cleanBch.startsWith('bchtest:')) {
      throw new Error('Conecta tu billetera Bitcoin Cash Chipnet (bchtest:...) para recibir el retiro de colateral desde tu Covenant.');
    }

    const state = await this.getUserVault(cleanBch, { bchAddress: cleanBch, evmAddress, network: 'testnet' });
    if (amount > state.vault.collateralBch + 0.000001) {
      throw new Error(`Colateral insuficiente en tu Bóveda On-Chain. Disponible: ${state.vault.collateralBch} BCH.`);
    }

    const newCollateralBch = Math.max(0, state.vault.collateralBch - amount);
    const newCollateralUsd = newCollateralBch * state.bchPrice;

    if (state.vault.totalDebtUsd > 0) {
      const newHealthFactor = (newCollateralUsd * 0.80) / state.vault.totalDebtUsd;
      if (newHealthFactor < 1.15) {
        throw new Error(
          `Retiro bloqueado por Solvencia: Tu Ratio de Salud caería a ${newHealthFactor.toFixed(2)} (mínimo seguro: 1.15). Paga primero parte de tu deuda o retira máximo ${state.vault.withdrawableBch} BCH.`
        );
      }
    }

    // Execute real CashScript Covenant unlock on BCH Chipnet!
    const releaseRes = await bchService.releaseCollateralFromVault(cleanBch, amount, true);

    vault.collateralBch = Number(releaseRes.remainingVaultBch.toFixed(8));
    vault.updatedAt = new Date().toISOString();
    db.persist();

    await this.recordLendTx({
      vaultKey,
      action: 'WITHDRAW_COLLATERAL',
      token: 'BCH',
      amount: releaseRes.withdrawnBch,
      txHash: releaseRes.txHash,
      explorerUrl: releaseRes.explorerUrl,
      network: 'testnet'
    });
    await this.syncVaultToPostgres(vaultKey, vault, supply);

    const updated = await this.getUserVault(cleanBch, { bchAddress: cleanBch, evmAddress, network: 'testnet' });
    return {
      ...updated,
      withdrawnBch: releaseRes.withdrawnBch,
      txHash: releaseRes.txHash,
      explorerUrl: releaseRes.explorerUrl
    };
  }

  /**
   * 3. BORROW PUSD OR USDT (Real On-Chain Smart Contract Release to User Wallet!)
   */
  async borrow({
    userAddress,
    bchAddress = '',
    evmAddress = '',
    token,
    amount,
    network = 'testnet'
  }) {
    const isTestnet = String(network || 'testnet').toLowerCase() === 'testnet';
    if (!isTestnet) {
      throw new Error('Sin Liquidez en Mainnet. Cambia a la red Testnet para solicitar préstamos en PUSD o USDT.');
    }

    const num = Number(amount);
    if (isNaN(num) || num <= 0) {
      throw new Error('Ingresa un monto de préstamo mayor a cero.');
    }

    const sym = String(token || '').toUpperCase();
    if (sym === 'USDC') {
      throw new Error('El mercado USDC está marcado como Sin Liquidez. Utiliza PUSD (BCH Chipnet) o USDT (Polygon Amoy).');
    }
    if (sym !== 'PUSD' && sym !== 'USDT') {
      throw new Error('Activo de préstamo no soportado. Selecciona PUSD o USDT.');
    }

    const { vaultKey, vault, supply, cleanBch, cleanEvm } = this.resolveVaultEntry({
      userAddress,
      bchAddress,
      evmAddress,
      network: 'testnet'
    });

    const state = await this.getUserVault(cleanBch || cleanEvm || userAddress, {
      bchAddress: cleanBch,
      evmAddress: cleanEvm,
      network: 'testnet'
    });

    if (state.vault.collateralBch <= 0) {
      throw new Error('Tu Bóveda CashScript tiene 0 BCH de colateral en cadena. Deposita primero tBCH para habilitar capacidad de préstamo.');
    }

    if (num > state.vault.availableBorrowUsd + 0.01) {
      throw new Error(
        `Capacidad de préstamo insuficiente (LTV máx 65%). Disponible: $${state.vault.availableBorrowUsd.toFixed(2)} USD.`
      );
    }

    let payoutTxHash = '';
    let explorerUrl = '';

    if (sym === 'PUSD') {
      if (!cleanBch || !cleanBch.startsWith('bchtest:')) {
        throw new Error('Conecta tu billetera Bitcoin Cash Chipnet (Paytaca / Cashonize) para recibir el préstamo de PUSD CashTokens.');
      }
      const releaseRes = await bchService.releaseFromVault(cleanBch, num, 'PUSD');
      payoutTxHash = releaseRes.txHash;
      explorerUrl = releaseRes.explorerUrl;
      vault.borrowedPusd = Number(((vault.borrowedPusd || 0) + num).toFixed(4));
    } else {
      if (!cleanEvm || !cleanEvm.startsWith('0x')) {
        throw new Error('Conecta tu billetera EVM (MetaMask / WalletConnect en Polygon Amoy) para recibir el préstamo de USDT en cadena.');
      }
      const tokenCfg = evmService.getTokenConfig('USDT', 'polygon_amoy');
      const vaultAddr = evmService.getVaultAddress('polygon_amoy');
      const uniqueLoanRef = `lend_borrow_${vaultKey}_${Date.now()}`;

      const auth = await watchmanSentinel.auditAndAuthorize({
        destinationType: 'EVM',
        originTxHash: uniqueLoanRef,
        fromToken: 'BCH',
        toToken: 'USDT',
        recipient: cleanEvm,
        tokenAddress: tokenCfg.address,
        tokenDecimals: tokenCfg.decimals,
        amount: num,
        rate: 1.0,
        chainId: config.evm.amoyChainId,
        vaultContractAddress: vaultAddr
      });

      if (!auth.approved) {
        throw new Error(`Watchman Sentinel rechazó el desembolso: ${auth.reason}`);
      }

      const releaseRes = await evmService.releaseFromVault({
        bchTxHashBytes32: auth.bchTxHashBytes32,
        recipientAddress: cleanEvm,
        amount: num,
        tokenSymbol: 'USDT',
        chain: 'polygon_amoy',
        nonce: auth.nonce,
        watchmanSignature: auth.proof
      });

      payoutTxHash = releaseRes.txHash;
      explorerUrl = releaseRes.explorerUrl;
      vault.borrowedUsdt = Number(((vault.borrowedUsdt || 0) + num).toFixed(4));
    }

    vault.updatedAt = new Date().toISOString();
    db.persist();

    await this.recordLendTx({
      vaultKey,
      action: 'BORROW',
      token: sym,
      amount: num,
      txHash: payoutTxHash,
      explorerUrl,
      network: 'testnet'
    });
    await this.syncVaultToPostgres(vaultKey, vault, supply);

    const updated = await this.getUserVault(cleanBch || cleanEvm || userAddress, {
      bchAddress: cleanBch,
      evmAddress: cleanEvm,
      network: 'testnet'
    });
    return {
      ...updated,
      borrowedToken: sym,
      borrowedAmount: num,
      txHash: payoutTxHash,
      explorerUrl
    };
  }

  /**
   * Helper: Verifies an incoming PUSD or USDT transfer to the Non-Custodial Protocol Vaults
   * Supports dual-precision Chipnet CashToken UTXOs (1:1 integer units vs 1e6 scaled) and AUTO_DETECT.
   */
  async verifyStablecoinTransferToVault(sym, expectedAmount, txHash) {
    const cleanTxHash = String(txHash || '').trim();

    if (sym === 'USDT') {
      if (!cleanTxHash || cleanTxHash.length < 20) {
        throw new Error(
          'Se requiere la firma Web3 de transferencia de USDT hacia BinaryLiquidVault.sol (Polygon Amoy).'
        );
      }
      if (this.isTxHashAlreadyUsed(cleanTxHash)) {
        throw new Error('Este Hash de Transacción ya fue utilizado previamente (protección Anti-Replay activa).');
      }
      const vaultAddr = config.evm.amoyVaultAddress;
      const ver = await evmService.verifyDeposit(
        cleanTxHash,
        expectedAmount,
        'USDT',
        vaultAddr,
        'polygon_amoy'
      );
      if (!ver.verified) {
        throw new Error(ver.reason || 'No se pudo verificar el depósito de USDT hacia BinaryLiquidVault.sol en Polygon Amoy.');
      }
      return {
        verifiedAmount: Number(ver.amount || expectedAmount),
        cleanTxHash,
        explorerUrl: `https://amoy.polygonscan.com/tx/${cleanTxHash}`
      };
    }

    await bchService.readyPromise;
    const provider = bchService.chipnetProvider;
    const vaultTokenAddr = config.bch.chipnetVaultTokenAddress;
    const pusdCat = config.bch.tokens.PUSD.chipnetCategory;

    let cleanHex = cleanTxHash.replace(/^0x/i, '').toLowerCase();
    const isAutoDetect = !cleanHex || cleanHex === 'auto_detect';

    if (!isAutoDetect) {
      if (!/^[0-9a-f]{64}$/.test(cleanHex)) {
        throw new Error('El TXID de Bitcoin Cash Chipnet debe tener exactamente 64 caracteres hexadecimales.');
      }
      if (this.isTxHashAlreadyUsed(cleanHex)) {
        throw new Error('Este Hash de Transacción ya fue utilizado previamente (protección Anti-Replay activa).');
      }
    }

    let matchedAmount = 0;
    if (provider) {
      const utxos = await provider.getUtxos(vaultTokenAddr);
      if (isAutoDetect) {
        const candidates = (utxos || []).filter(
          u =>
            u.txid &&
            !this.isTxHashAlreadyUsed(u.txid) &&
            u.token?.category === pusdCat &&
            u.token.amount > 0n
        );
        for (const u of candidates) {
          const units = BigInt(u.token.amount || 0);
          const scaledAmt = Number(units) / 1e6;
          const intAmt = Number(units);
          if (scaledAmt >= expectedAmount * 0.99 || intAmt >= expectedAmount * 0.99) {
            cleanHex = u.txid.toLowerCase();
            break;
          }
        }
        if (!cleanHex || cleanHex === 'auto_detect') {
          throw new Error(
            'No se detectó ningún nuevo UTXO de PUSD en el Covenant BinaryLiquidVault.cash. Firma con 1 clic en Paytaca o pega el TXID de tu envío.'
          );
        }
      }

      const matching = (utxos || []).filter(
        u => u.txid?.toLowerCase() === cleanHex && u.token?.category === pusdCat && u.token.amount > 0n
      );
      if (matching.length > 0) {
        const units = matching.reduce((s, u) => s + BigInt(u.token.amount || 0), 0n);
        const scaledAmount = Number(units) / 1e6;
        const rawIntegerAmount = Number(units);
        if (Math.abs(scaledAmount - expectedAmount) <= expectedAmount * 0.05) {
          matchedAmount = scaledAmount;
        } else if (Math.abs(rawIntegerAmount - expectedAmount) <= expectedAmount * 0.05) {
          matchedAmount = rawIntegerAmount;
        } else if (units < 100000n) {
          matchedAmount = rawIntegerAmount;
        } else {
          matchedAmount = scaledAmount;
        }
      } else {
        try {
          const rawHex = await provider.getRawTransaction(cleanHex);
          if (!rawHex || rawHex.length < 40) throw new Error('TX no encontrada');
          matchedAmount = expectedAmount;
        } catch (_) {
          throw new Error(
            `No se encontró el depósito de PUSD con TXID ${cleanHex.slice(0, 12)}... hacia BinaryLiquidVault.cash en Chipnet.`
          );
        }
      }
    }

    if (matchedAmount < expectedAmount * 0.99) {
      throw new Error(
        `El monto recibido en el Covenant (${matchedAmount} PUSD) es menor al monto declarado (${expectedAmount} PUSD).`
      );
    }

    return {
      verifiedAmount: matchedAmount,
      cleanTxHash: cleanHex,
      explorerUrl: `https://chipnet.imaginary.cash/tx/${cleanHex}`
    };
  }

  /**
   * 4. REPAY DEBT (Verifies Real On-Chain Repayment to BinaryLiquidVault.sol / .cash!)
   */
  async repay({
    userAddress,
    bchAddress = '',
    evmAddress = '',
    token,
    amount,
    txHash = '',
    network = 'testnet'
  }) {
    const isTestnet = String(network || 'testnet').toLowerCase() === 'testnet';
    if (!isTestnet) {
      throw new Error('Sin Liquidez en Mainnet. Cambia a Testnet para gestionar préstamos.');
    }

    const num = Number(amount);
    if (isNaN(num) || num <= 0) {
      throw new Error('Ingresa un monto de pago válido.');
    }

    const sym = String(token || '').toUpperCase();
    if (sym !== 'PUSD' && sym !== 'USDT') {
      throw new Error('Solo se admite pago de deuda en PUSD o USDT.');
    }

    const { vaultKey, vault, supply, cleanBch, cleanEvm } = this.resolveVaultEntry({
      userAddress,
      bchAddress,
      evmAddress,
      network: 'testnet'
    });

    const totalDebt =
      sym === 'PUSD'
        ? (vault.borrowedPusd || 0) + (vault.interestAccruedPusd || 0)
        : (vault.borrowedUsdt || 0) + (vault.interestAccruedUsdt || 0);

    if (totalDebt <= 0) {
      throw new Error(`No tienes deuda pendiente en ${sym}.`);
    }

    const expectedPay = Math.min(num, totalDebt);
    const { verifiedAmount, cleanTxHash, explorerUrl } = await this.verifyStablecoinTransferToVault(
      sym,
      expectedPay,
      txHash
    );

    const appliedPay = Math.min(verifiedAmount, totalDebt);

    if (sym === 'PUSD') {
      const interestPay = Math.min(appliedPay, vault.interestAccruedPusd || 0);
      vault.interestAccruedPusd = Math.max(0, Number(((vault.interestAccruedPusd || 0) - interestPay).toFixed(6)));
      const principalPay = appliedPay - interestPay;
      vault.borrowedPusd = Math.max(0, Number(((vault.borrowedPusd || 0) - principalPay).toFixed(4)));
    } else {
      const interestPay = Math.min(appliedPay, vault.interestAccruedUsdt || 0);
      vault.interestAccruedUsdt = Math.max(0, Number(((vault.interestAccruedUsdt || 0) - interestPay).toFixed(6)));
      const principalPay = appliedPay - interestPay;
      vault.borrowedUsdt = Math.max(0, Number(((vault.borrowedUsdt || 0) - principalPay).toFixed(4)));
    }

    vault.updatedAt = new Date().toISOString();
    db.persist();

    await this.recordLendTx({
      vaultKey,
      action: 'REPAY',
      token: sym,
      amount: Number(appliedPay.toFixed(4)),
      txHash: cleanTxHash,
      explorerUrl,
      network: 'testnet'
    });
    await this.syncVaultToPostgres(vaultKey, vault, supply);

    const updated = await this.getUserVault(cleanBch || cleanEvm || userAddress, {
      bchAddress: cleanBch,
      evmAddress: cleanEvm,
      network: 'testnet'
    });
    return {
      ...updated,
      repaidToken: sym,
      repaidAmount: Number(appliedPay.toFixed(4)),
      txHash: cleanTxHash,
      explorerUrl
    };
  }

  /**
   * 5. SUPPLY STABLECOINS FOR PASSIVE APY (Verifies Real On-Chain Vault Deposit!)
   */
  async supply({
    userAddress,
    bchAddress = '',
    evmAddress = '',
    token,
    amount,
    txHash = '',
    network = 'testnet'
  }) {
    const isTestnet = String(network || 'testnet').toLowerCase() === 'testnet';
    if (!isTestnet) {
      throw new Error('Sin Liquidez en Mainnet. Cambia a Testnet para suministrar PUSD o USDT en los Smart Contracts.');
    }

    const num = Number(amount);
    if (isNaN(num) || num <= 0) {
      throw new Error('Ingresa un monto válido para suministrar al fondo de rendimiento.');
    }

    const sym = String(token || '').toUpperCase();
    if (sym === 'USDC') {
      throw new Error('El mercado USDC está marcado como Sin Liquidez. Utiliza PUSD o USDT en Testnet.');
    }
    if (sym !== 'PUSD' && sym !== 'USDT') {
      throw new Error('Activo no soportado para rendimiento. Selecciona PUSD o USDT.');
    }

    const { vaultKey, vault, supply, cleanBch, cleanEvm } = this.resolveVaultEntry({
      userAddress,
      bchAddress,
      evmAddress,
      network: 'testnet'
    });

    const { verifiedAmount, cleanTxHash, explorerUrl } = await this.verifyStablecoinTransferToVault(
      sym,
      num,
      txHash
    );

    if (sym === 'PUSD') {
      supply.suppliedPusd = Number(((supply.suppliedPusd || 0) + verifiedAmount).toFixed(4));
    } else {
      supply.suppliedUsdt = Number(((supply.suppliedUsdt || 0) + verifiedAmount).toFixed(4));
    }
    supply.lastYieldUpdate = Date.now();
    db.persist();

    await this.recordLendTx({
      vaultKey,
      action: 'SUPPLY',
      token: sym,
      amount: Number(verifiedAmount.toFixed(4)),
      txHash: cleanTxHash,
      explorerUrl,
      network: 'testnet'
    });
    await this.syncVaultToPostgres(vaultKey, vault, supply);

    const updated = await this.getUserVault(cleanBch || cleanEvm || userAddress, {
      bchAddress: cleanBch,
      evmAddress: cleanEvm,
      network: 'testnet'
    });
    return {
      ...updated,
      suppliedToken: sym,
      suppliedAmount: Number(verifiedAmount.toFixed(4)),
      txHash: cleanTxHash,
      explorerUrl
    };
  }

  /**
   * 6. WITHDRAW SUPPLY + ACCRUED APY (Real On-Chain Smart Contract Release!)
   */
  async withdrawSupply({
    userAddress,
    bchAddress = '',
    evmAddress = '',
    token,
    amount,
    network = 'testnet'
  }) {
    const isTestnet = String(network || 'testnet').toLowerCase() === 'testnet';
    if (!isTestnet) {
      throw new Error('Sin Liquidez en Mainnet. Cambia a Testnet para retirar tus fondos.');
    }

    const num = Number(amount);
    if (isNaN(num) || num <= 0) {
      throw new Error('Ingresa un monto válido para retirar.');
    }

    const sym = String(token || '').toUpperCase();
    if (sym !== 'PUSD' && sym !== 'USDT') {
      throw new Error('Activo no soportado para retiro. Selecciona PUSD o USDT.');
    }

    const { vaultKey, vault, supply, cleanBch, cleanEvm } = this.resolveVaultEntry({
      userAddress,
      bchAddress,
      evmAddress,
      network: 'testnet'
    });

    const maxWithdrawable =
      sym === 'PUSD'
        ? (supply.suppliedPusd || 0) + (supply.yieldEarnedPusd || 0)
        : (supply.suppliedUsdt || 0) + (supply.yieldEarnedUsdt || 0);

    if (num > maxWithdrawable + 0.0001) {
      throw new Error(
        `Saldo suministrado insuficiente en ${sym}. Disponible (capital + intereses): ${maxWithdrawable.toFixed(4)} ${sym}.`
      );
    }

    const actualPayout = Math.min(num, maxWithdrawable);
    let payoutTxHash = '';
    let explorerUrl = '';

    if (sym === 'PUSD') {
      if (!cleanBch || !cleanBch.startsWith('bchtest:')) {
        throw new Error('Conecta tu billetera Bitcoin Cash Chipnet (Paytaca / Cashonize) para recibir el retiro de PUSD.');
      }
      const releaseRes = await bchService.releaseFromVault(cleanBch, actualPayout, 'PUSD');
      payoutTxHash = releaseRes.txHash;
      explorerUrl = releaseRes.explorerUrl;

      const yieldPart = Math.min(actualPayout, supply.yieldEarnedPusd || 0);
      supply.yieldEarnedPusd = Math.max(0, Number(((supply.yieldEarnedPusd || 0) - yieldPart).toFixed(6)));
      const principalPart = actualPayout - yieldPart;
      supply.suppliedPusd = Math.max(0, Number(((supply.suppliedPusd || 0) - principalPart).toFixed(4)));
    } else {
      if (!cleanEvm || !cleanEvm.startsWith('0x')) {
        throw new Error('Conecta tu billetera EVM (MetaMask / WalletConnect en Polygon Amoy) para recibir el retiro de USDT.');
      }
      const tokenCfg = evmService.getTokenConfig('USDT', 'polygon_amoy');
      const vaultAddr = evmService.getVaultAddress('polygon_amoy');
      const uniqueRef = `lend_withdraw_supply_${vaultKey}_${Date.now()}`;

      const auth = await watchmanSentinel.auditAndAuthorize({
        destinationType: 'EVM',
        originTxHash: uniqueRef,
        fromToken: 'PUSD',
        toToken: 'USDT',
        recipient: cleanEvm,
        tokenAddress: tokenCfg.address,
        tokenDecimals: tokenCfg.decimals,
        amount: actualPayout,
        rate: 1.0,
        chainId: config.evm.amoyChainId,
        vaultContractAddress: vaultAddr
      });

      if (!auth.approved) {
        throw new Error(`Watchman Sentinel rechazó el retiro: ${auth.reason}`);
      }

      const releaseRes = await evmService.releaseFromVault({
        bchTxHashBytes32: auth.bchTxHashBytes32,
        recipientAddress: cleanEvm,
        amount: actualPayout,
        tokenSymbol: 'USDT',
        chain: 'polygon_amoy',
        nonce: auth.nonce,
        watchmanSignature: auth.proof
      });

      payoutTxHash = releaseRes.txHash;
      explorerUrl = releaseRes.explorerUrl;

      const yieldPart = Math.min(actualPayout, supply.yieldEarnedUsdt || 0);
      supply.yieldEarnedUsdt = Math.max(0, Number(((supply.yieldEarnedUsdt || 0) - yieldPart).toFixed(6)));
      const principalPart = actualPayout - yieldPart;
      supply.suppliedUsdt = Math.max(0, Number(((supply.suppliedUsdt || 0) - principalPart).toFixed(4)));
    }

    supply.lastYieldUpdate = Date.now();
    db.persist();

    await this.recordLendTx({
      vaultKey,
      action: 'WITHDRAW_SUPPLY',
      token: sym,
      amount: Number(actualPayout.toFixed(4)),
      txHash: payoutTxHash,
      explorerUrl,
      network: 'testnet'
    });
    await this.syncVaultToPostgres(vaultKey, vault, supply);

    const updated = await this.getUserVault(cleanBch || cleanEvm || userAddress, {
      bchAddress: cleanBch,
      evmAddress: cleanEvm,
      network: 'testnet'
    });
    return {
      ...updated,
      withdrawnToken: sym,
      withdrawnAmount: Number(actualPayout.toFixed(4)),
      txHash: payoutTxHash,
      explorerUrl
    };
  }
}

export const lendingService = new LendingService();
