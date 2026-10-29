import { db } from './db.js';
import { oraclePool } from './oraclePool.js';

const INITIAL_MARKETS = {
  BCH_COLLATERAL: {
    id: 'BCH_COLLATERAL',
    asset: 'BCH',
    name: 'Bitcoin Cash Native',
    network: 'Bitcoin Cash (Mainnet)',
    networkBadge: 'BCH Layer 1',
    icon: '/BCH.png',
    type: 'COLLATERAL',
    maxLtv: 0.65, // 65% LTV
    liquidationThreshold: 0.80, // 80% LTV
    liquidationPenalty: 0.05, // 5% penalty
    totalCollateralBch: 2150.0,
    isVerified: true
  },
  PUSD_BORROW: {
    id: 'PUSD_BORROW',
    asset: 'PUSD',
    name: 'ParyonUSD',
    network: 'Bitcoin Cash (Mainnet)',
    networkBadge: 'BCH CashTokens',
    icon: '/PUSD.png',
    type: 'BORROW',
    borrowApr: 0.035, // 3.5% APR
    supplyApy: 0.058, // 5.8% APY
    totalSupplied: 250000.0,
    totalBorrowed: 74200.0,
    availableLiquidity: 175800.0,
    decimals: 6,
    isVerified: true,
    sponsorTag: 'Official BLAZE Track Sponsor (PUSD)'
  },
  USDC_BORROW: {
    id: 'USDC_BORROW',
    asset: 'USDC',
    name: 'USD Coin',
    network: 'Polygon (Mainnet)',
    networkBadge: 'Polygon PoS',
    icon: '/USDC.png',
    type: 'BORROW',
    borrowApr: 0.042, // 4.2% APR
    supplyApy: 0.064, // 6.4% APY
    totalSupplied: 200000.0,
    totalBorrowed: 62500.0,
    availableLiquidity: 137500.0,
    decimals: 6,
    isVerified: true
  }
};

class LendingService {
  constructor() {
    this.initStore();
  }

  initStore() {
    if (!db.memoryState.lendingMarkets) {
      db.memoryState.lendingMarkets = JSON.parse(JSON.stringify(INITIAL_MARKETS));
    } else {
      // Ensure canonical markets exist
      for (const [id, m] of Object.entries(INITIAL_MARKETS)) {
        if (!db.memoryState.lendingMarkets[id]) {
          db.memoryState.lendingMarkets[id] = JSON.parse(JSON.stringify(m));
        }
      }
    }

    if (!db.memoryState.lendingVaults) {
      db.memoryState.lendingVaults = {};
    }

    if (!db.memoryState.lendingSupplies) {
      db.memoryState.lendingSupplies = {};
    }

    db.persist();
  }

  async getBchPrice() {
    try {
      const price = await oraclePool.getPriceUsd('BCH');
      return Number(price) > 0 ? Number(price) : 285.0;
    } catch {
      return 285.0;
    }
  }

  accrueVaultInterest(vault) {
    const now = Date.now();
    const lastUpdate = vault.lastInterestUpdate || now;
    const elapsedSeconds = Math.max(0, (now - lastUpdate) / 1000);
    const secondsInYear = 365 * 24 * 3600;

    const pusdApr = db.memoryState.lendingMarkets.PUSD_BORROW?.borrowApr || 0.035;
    const usdcApr = db.memoryState.lendingMarkets.USDC_BORROW?.borrowApr || 0.042;

    if (vault.borrowedPusd > 0 && elapsedSeconds > 0) {
      const addedInterest = (vault.borrowedPusd * pusdApr * elapsedSeconds) / secondsInYear;
      vault.interestAccruedPusd = Number(((vault.interestAccruedPusd || 0) + addedInterest).toFixed(6));
    }

    if (vault.borrowedUsdc > 0 && elapsedSeconds > 0) {
      const addedInterest = (vault.borrowedUsdc * usdcApr * elapsedSeconds) / secondsInYear;
      vault.interestAccruedUsdc = Number(((vault.interestAccruedUsdc || 0) + addedInterest).toFixed(6));
    }

    vault.lastInterestUpdate = now;
  }

  accrueSupplyYield(supplyRecord) {
    const now = Date.now();
    const lastUpdate = supplyRecord.lastYieldUpdate || now;
    const elapsedSeconds = Math.max(0, (now - lastUpdate) / 1000);
    const secondsInYear = 365 * 24 * 3600;

    const pusdApy = db.memoryState.lendingMarkets.PUSD_BORROW?.supplyApy || 0.058;
    const usdcApy = db.memoryState.lendingMarkets.USDC_BORROW?.supplyApy || 0.064;

    if (supplyRecord.suppliedPusd > 0 && elapsedSeconds > 0) {
      const addedYield = (supplyRecord.suppliedPusd * pusdApy * elapsedSeconds) / secondsInYear;
      supplyRecord.yieldEarnedPusd = Number(((supplyRecord.yieldEarnedPusd || 0) + addedYield).toFixed(6));
    }

    if (supplyRecord.suppliedUsdc > 0 && elapsedSeconds > 0) {
      const addedYield = (supplyRecord.suppliedUsdc * usdcApy * elapsedSeconds) / secondsInYear;
      supplyRecord.yieldEarnedUsdc = Number(((supplyRecord.yieldEarnedUsdc || 0) + addedYield).toFixed(6));
    }

    supplyRecord.lastYieldUpdate = now;
  }

  async getMarketsOverview() {
    this.initStore();
    const bchPrice = await this.getBchPrice();
    const markets = db.memoryState.lendingMarkets;

    const totalCollateralBch = Object.values(db.memoryState.lendingVaults).reduce((acc, v) => acc + (v.collateralBch || 0), markets.BCH_COLLATERAL.totalCollateralBch);
    const totalCollateralUsd = totalCollateralBch * bchPrice;

    const totalBorrowedUsd = markets.PUSD_BORROW.totalBorrowed + markets.USDC_BORROW.totalBorrowed;
    const totalSuppliedUsd = markets.PUSD_BORROW.totalSupplied + markets.USDC_BORROW.totalSupplied;

    return {
      bchPrice,
      markets,
      protocolStats: {
        totalCollateralBch: Number(totalCollateralBch.toFixed(4)),
        totalCollateralUsd: Number(totalCollateralUsd.toFixed(2)),
        totalBorrowedUsd: Number(totalBorrowedUsd.toFixed(2)),
        totalSuppliedUsd: Number(totalSuppliedUsd.toFixed(2)),
        totalTvlUsd: Number((totalCollateralUsd + totalSuppliedUsd).toFixed(2)),
        averageBorrowApr: '3.85%',
        averageSupplyApy: '6.10%',
        maxLtvPercent: '65%',
        liquidationThresholdPercent: '80%'
      }
    };
  }

  async getUserVault(userAddress) {
    if (!userAddress) throw new Error('User address is required');
    this.initStore();

    const norm = userAddress.toLowerCase();
    const bchPrice = await this.getBchPrice();

    let vault = db.memoryState.lendingVaults[norm];
    if (!vault) {
      vault = {
        userAddress: norm,
        collateralBch: 0.0,
        borrowedPusd: 0.0,
        borrowedUsdc: 0.0,
        interestAccruedPusd: 0.0,
        interestAccruedUsdc: 0.0,
        lastInterestUpdate: Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      db.memoryState.lendingVaults[norm] = vault;
      db.persist();
    } else {
      this.accrueVaultInterest(vault);
    }

    let supply = db.memoryState.lendingSupplies[norm];
    if (!supply) {
      supply = {
        userAddress: norm,
        suppliedPusd: 0.0,
        suppliedUsdc: 0.0,
        yieldEarnedPusd: 0.0,
        yieldEarnedUsdc: 0.0,
        lastYieldUpdate: Date.now()
      };
      db.memoryState.lendingSupplies[norm] = supply;
      db.persist();
    } else {
      this.accrueSupplyYield(supply);
    }

    // Calculations
    const collateralUsd = vault.collateralBch * bchPrice;
    const totalPusdDebt = vault.borrowedPusd + vault.interestAccruedPusd;
    const totalUsdcDebt = vault.borrowedUsdc + vault.interestAccruedUsdc;
    const totalDebtUsd = totalPusdDebt + totalUsdcDebt;

    const maxBorrowCapacityUsd = collateralUsd * 0.65;
    const availableBorrowUsd = Math.max(0, maxBorrowCapacityUsd - totalDebtUsd);

    let healthFactor = 999.0;
    let healthStatus = 'SAFE';

    if (totalDebtUsd > 0) {
      healthFactor = Number(((collateralUsd * 0.80) / totalDebtUsd).toFixed(2));
      if (healthFactor >= 1.5) healthStatus = 'SAFE';
      else if (healthFactor >= 1.1) healthStatus = 'MODERATE';
      else healthStatus = 'RISK';
    }

    // Amount of BCH that can be withdrawn safely without falling below Health Factor 1.25
    let withdrawableBch = vault.collateralBch;
    if (totalDebtUsd > 0) {
      const minRequiredCollateralUsd = (totalDebtUsd * 1.25) / 0.80;
      const safeWithdrawableUsd = Math.max(0, collateralUsd - minRequiredCollateralUsd);
      withdrawableBch = Number((safeWithdrawableUsd / bchPrice).toFixed(4));
    }

    return {
      bchPrice,
      vault: {
        ...vault,
        collateralBch: Number(vault.collateralBch.toFixed(4)),
        collateralUsd: Number(collateralUsd.toFixed(2)),
        totalPusdDebt: Number(totalPusdDebt.toFixed(2)),
        totalUsdcDebt: Number(totalUsdcDebt.toFixed(2)),
        totalDebtUsd: Number(totalDebtUsd.toFixed(2)),
        maxBorrowCapacityUsd: Number(maxBorrowCapacityUsd.toFixed(2)),
        availableBorrowUsd: Number(availableBorrowUsd.toFixed(2)),
        healthFactor,
        healthStatus,
        withdrawableBch,
        currentLtvPercent: collateralUsd > 0 ? Number(((totalDebtUsd / collateralUsd) * 100).toFixed(1)) : 0
      },
      supply: {
        ...supply,
        suppliedPusd: Number(supply.suppliedPusd.toFixed(2)),
        suppliedUsdc: Number(supply.suppliedUsdc.toFixed(2)),
        yieldEarnedPusd: Number(supply.yieldEarnedPusd.toFixed(4)),
        yieldEarnedUsdc: Number(supply.yieldEarnedUsdc.toFixed(4)),
        totalSuppliedUsd: Number((supply.suppliedPusd + supply.suppliedUsdc).toFixed(2))
      }
    };
  }

  async depositCollateral(userAddress, amountBch) {
    if (!userAddress) throw new Error('Se requiere dirección de billetera');
    const amount = Number(amountBch);
    if (isNaN(amount) || amount <= 0) throw new Error('Monto inválido para depositar colateral');

    this.initStore();
    const norm = userAddress.toLowerCase();
    const data = await this.getUserVault(norm);
    const vault = db.memoryState.lendingVaults[norm];

    vault.collateralBch = Number((vault.collateralBch + amount).toFixed(4));
    vault.updatedAt = new Date().toISOString();
    db.persist();

    return this.getUserVault(norm);
  }

  async withdrawCollateral(userAddress, amountBch) {
    if (!userAddress) throw new Error('Se requiere dirección de billetera');
    const amount = Number(amountBch);
    if (isNaN(amount) || amount <= 0) throw new Error('Monto inválido para retirar colateral');

    this.initStore();
    const norm = userAddress.toLowerCase();
    const { vault, bchPrice } = await this.getUserVault(norm);

    if (amount > vault.collateralBch) {
      throw new Error(`Saldo de colateral insuficiente. Tienes ${vault.collateralBch} BCH.`);
    }

    const newCollateralBch = vault.collateralBch - amount;
    const newCollateralUsd = newCollateralBch * bchPrice;

    if (vault.totalDebtUsd > 0) {
      const newHealthFactor = (newCollateralUsd * 0.80) / vault.totalDebtUsd;
      if (newHealthFactor < 1.15) {
        throw new Error(`Retiro rechazado por riesgo de liquidación. Tu Ratio de Salud caería a ${newHealthFactor.toFixed(2)} (Mínimo seguro: 1.15). Reduce tu deuda o retira menor cantidad.`);
      }
    }

    const rawVault = db.memoryState.lendingVaults[norm];
    rawVault.collateralBch = Number(newCollateralBch.toFixed(4));
    rawVault.updatedAt = new Date().toISOString();
    db.persist();

    return this.getUserVault(norm);
  }

  async borrow(userAddress, token, amount) {
    if (!userAddress) throw new Error('Se requiere dirección de billetera');
    const num = Number(amount);
    if (isNaN(num) || num <= 0) throw new Error('Monto de préstamo inválido');

    const sym = token.toUpperCase();
    if (sym !== 'PUSD' && sym !== 'USDC') {
      throw new Error('Activo de préstamo no soportado. Debe ser PUSD o USDC.');
    }

    this.initStore();
    const norm = userAddress.toLowerCase();
    const { vault } = await this.getUserVault(norm);

    if (num > vault.availableBorrowUsd) {
      throw new Error(`Capacidad de préstamo insuficiente. Capacidad máxima disponible: $${vault.availableBorrowUsd} USD. Deposita más BCH de colateral para aumentar tu límite.`);
    }

    const marketKey = sym === 'PUSD' ? 'PUSD_BORROW' : 'USDC_BORROW';
    const market = db.memoryState.lendingMarkets[marketKey];

    if (num > market.availableLiquidity) {
      throw new Error(`Liquidez temporalmente agotada en el mercado ${sym}. Disponible: ${market.availableLiquidity} ${sym}.`);
    }

    const rawVault = db.memoryState.lendingVaults[norm];
    if (sym === 'PUSD') {
      rawVault.borrowedPusd = Number((rawVault.borrowedPusd + num).toFixed(2));
    } else {
      rawVault.borrowedUsdc = Number((rawVault.borrowedUsdc + num).toFixed(2));
    }
    rawVault.updatedAt = new Date().toISOString();

    // Update market metrics
    market.totalBorrowed = Number((market.totalBorrowed + num).toFixed(2));
    market.availableLiquidity = Math.max(0, Number((market.availableLiquidity - num).toFixed(2)));

    // Credit user balance
    db.updateUserBalance(norm, sym, num);
    db.persist();

    return this.getUserVault(norm);
  }

  async repay(userAddress, token, amount) {
    if (!userAddress) throw new Error('Se requiere dirección de billetera');
    const num = Number(amount);
    if (isNaN(num) || num <= 0) throw new Error('Monto de pago inválido');

    const sym = token.toUpperCase();
    if (sym !== 'PUSD' && sym !== 'USDC') {
      throw new Error('Activo no soportado para pago de deuda.');
    }

    this.initStore();
    const norm = userAddress.toLowerCase();
    const { vault } = await this.getUserVault(norm);

    const totalDebt = sym === 'PUSD' ? vault.totalPusdDebt : vault.totalUsdcDebt;
    if (totalDebt <= 0) {
      throw new Error(`No tienes deuda activa en ${sym}.`);
    }

    const payAmount = Math.min(num, totalDebt);
    const rawVault = db.memoryState.lendingVaults[norm];

    if (sym === 'PUSD') {
      // First pay interest, then principal
      const interestPay = Math.min(payAmount, rawVault.interestAccruedPusd || 0);
      rawVault.interestAccruedPusd = Math.max(0, Number(((rawVault.interestAccruedPusd || 0) - interestPay).toFixed(6)));
      const principalPay = payAmount - interestPay;
      rawVault.borrowedPusd = Math.max(0, Number((rawVault.borrowedPusd - principalPay).toFixed(2)));
    } else {
      const interestPay = Math.min(payAmount, rawVault.interestAccruedUsdc || 0);
      rawVault.interestAccruedUsdc = Math.max(0, Number(((rawVault.interestAccruedUsdc || 0) - interestPay).toFixed(6)));
      const principalPay = payAmount - interestPay;
      rawVault.borrowedUsdc = Math.max(0, Number((rawVault.borrowedUsdc - principalPay).toFixed(2)));
    }
    rawVault.updatedAt = new Date().toISOString();

    // Update market metrics
    const marketKey = sym === 'PUSD' ? 'PUSD_BORROW' : 'USDC_BORROW';
    const market = db.memoryState.lendingMarkets[marketKey];
    market.totalBorrowed = Math.max(0, Number((market.totalBorrowed - payAmount).toFixed(2)));
    market.availableLiquidity = Number((market.availableLiquidity + payAmount).toFixed(2));

    db.persist();
    return this.getUserVault(norm);
  }

  async supply(userAddress, token, amount) {
    if (!userAddress) throw new Error('Se requiere dirección de billetera');
    const num = Number(amount);
    if (isNaN(num) || num <= 0) throw new Error('Monto de depósito de rendimiento inválido');

    const sym = token.toUpperCase();
    if (sym !== 'PUSD' && sym !== 'USDC') {
      throw new Error('Activo no soportado para suministro. Debe ser PUSD o USDC.');
    }

    this.initStore();
    const norm = userAddress.toLowerCase();
    await this.getUserVault(norm);

    const rawSupply = db.memoryState.lendingSupplies[norm];
    if (sym === 'PUSD') {
      rawSupply.suppliedPusd = Number((rawSupply.suppliedPusd + num).toFixed(2));
    } else {
      rawSupply.suppliedUsdc = Number((rawSupply.suppliedUsdc + num).toFixed(2));
    }
    rawSupply.lastYieldUpdate = Date.now();

    const marketKey = sym === 'PUSD' ? 'PUSD_BORROW' : 'USDC_BORROW';
    const market = db.memoryState.lendingMarkets[marketKey];
    market.totalSupplied = Number((market.totalSupplied + num).toFixed(2));
    market.availableLiquidity = Number((market.availableLiquidity + num).toFixed(2));

    db.persist();
    return this.getUserVault(norm);
  }

  async withdrawSupply(userAddress, token, amount) {
    if (!userAddress) throw new Error('Se requiere dirección de billetera');
    const num = Number(amount);
    if (isNaN(num) || num <= 0) throw new Error('Monto de retiro inválido');

    const sym = token.toUpperCase();
    this.initStore();
    const norm = userAddress.toLowerCase();
    const { supply } = await this.getUserVault(norm);

    const totalSupplied = sym === 'PUSD' ? supply.suppliedPusd : supply.suppliedUsdc;
    if (num > totalSupplied) {
      throw new Error(`Saldo suministrado insuficiente. Tienes ${totalSupplied} ${sym}.`);
    }

    const rawSupply = db.memoryState.lendingSupplies[norm];
    if (sym === 'PUSD') {
      rawSupply.suppliedPusd = Number((rawSupply.suppliedPusd - num).toFixed(2));
    } else {
      rawSupply.suppliedUsdc = Number((rawSupply.suppliedUsdc - num).toFixed(2));
    }
    rawSupply.lastYieldUpdate = Date.now();

    const marketKey = sym === 'PUSD' ? 'PUSD_BORROW' : 'USDC_BORROW';
    const market = db.memoryState.lendingMarkets[marketKey];
    market.totalSupplied = Math.max(0, Number((market.totalSupplied - num).toFixed(2)));
    market.availableLiquidity = Math.max(0, Number((market.availableLiquidity - num).toFixed(2)));

    // Credit user balance
    db.updateUserBalance(norm, sym, num);
    db.persist();

    return this.getUserVault(norm);
  }
}

export const lendingService = new LendingService();
