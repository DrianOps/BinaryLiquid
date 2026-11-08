import { ethers } from 'ethers';
import { config } from '../config.js';
import { db } from './db.js';
import { oraclePool } from './oraclePool.js';
import { bchService } from './bchService.js';
import { evmService } from './evmService.js';
import { watchmanSentinel } from './watchmanClient.js';

const PERP_MARKETS = {
  BCHUSDT: {
    symbol: 'BCHUSDT',
    name: 'BCH-PERP',
    base: 'BCH',
    quote: 'USD',
    fullName: 'Bitcoin Cash',
    maxLeverage: 50,
    minMarginUsd: 1,
    tickDecimals: 2,
    assetDecimals: 4,
    mmr: 0.01,
    takerFeeRate: 0.0005
  },
  BTCUSDT: {
    symbol: 'BTCUSDT',
    name: 'BTC-PERP',
    base: 'BTC',
    quote: 'USD',
    fullName: 'Bitcoin',
    maxLeverage: 50,
    minMarginUsd: 2,
    tickDecimals: 1,
    assetDecimals: 5,
    mmr: 0.01,
    takerFeeRate: 0.0005
  },
  ETHUSDT: {
    symbol: 'ETHUSDT',
    name: 'ETH-PERP',
    base: 'ETH',
    quote: 'USD',
    fullName: 'Ethereum',
    maxLeverage: 50,
    minMarginUsd: 2,
    tickDecimals: 2,
    assetDecimals: 4,
    mmr: 0.01,
    takerFeeRate: 0.0005
  },
  SOLUSDT: {
    symbol: 'SOLUSDT',
    name: 'SOL-PERP',
    base: 'SOL',
    quote: 'USD',
    fullName: 'Solana',
    maxLeverage: 20,
    minMarginUsd: 1,
    tickDecimals: 2,
    assetDecimals: 3,
    mmr: 0.025,
    takerFeeRate: 0.0005
  }
};

class PerpsService {
  constructor() {
    this.pgSchemaMigrated = false;
    this.initStore();
  }

  initStore() {
    if (!Array.isArray(db.memoryState.perpPositions)) {
      db.memoryState.perpPositions = [];
    }
    if (!Array.isArray(db.memoryState.perpHistory)) {
      db.memoryState.perpHistory = [];
    }

    // Purge any legacy unverified/simulated positions
    const beforePos = db.memoryState.perpPositions.length;
    const beforeHist = db.memoryState.perpHistory.length;
    db.memoryState.perpPositions = db.memoryState.perpPositions.filter(p => p && p.onChainVerified === true);
    db.memoryState.perpHistory = db.memoryState.perpHistory.filter(h => h && h.onChainVerified === true);
    if (db.memoryState.perpPositions.length !== beforePos || db.memoryState.perpHistory.length !== beforeHist) {
      db.persist();
    }
  }

  async initDatabaseTables() {
    this.initStore();
    if (db.pgPool && !this.pgSchemaMigrated) {
      try {
        await db.pgPool.query(`
          CREATE TABLE IF NOT EXISTS perp_positions (
            id VARCHAR(80) PRIMARY KEY,
            trader_key VARCHAR(160) NOT NULL,
            bch_address TEXT,
            evm_address TEXT,
            symbol VARCHAR(24) NOT NULL,
            market VARCHAR(24) NOT NULL,
            base_asset VARCHAR(12) NOT NULL,
            side VARCHAR(10) NOT NULL,
            order_type VARCHAR(12) NOT NULL DEFAULT 'market',
            leverage INTEGER NOT NULL,
            collateral_token VARCHAR(16) NOT NULL,
            margin_amount NUMERIC NOT NULL,
            margin_usd NUMERIC NOT NULL,
            size_usd NUMERIC NOT NULL,
            size_asset NUMERIC NOT NULL,
            entry_price NUMERIC NOT NULL,
            liquidation_price NUMERIC NOT NULL,
            take_profit NUMERIC,
            stop_loss NUMERIC,
            open_tx_hash TEXT NOT NULL,
            open_explorer_url TEXT,
            network VARCHAR(20) NOT NULL DEFAULT 'testnet',
            open_time BIGINT NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS perp_history (
            id VARCHAR(80) PRIMARY KEY,
            position_id VARCHAR(80) NOT NULL,
            trader_key VARCHAR(160) NOT NULL,
            bch_address TEXT,
            evm_address TEXT,
            symbol VARCHAR(24) NOT NULL,
            market VARCHAR(24) NOT NULL,
            side VARCHAR(10) NOT NULL,
            leverage INTEGER NOT NULL,
            collateral_token VARCHAR(16) NOT NULL,
            margin_amount NUMERIC NOT NULL,
            margin_usd NUMERIC NOT NULL,
            size_usd NUMERIC NOT NULL,
            size_asset NUMERIC NOT NULL,
            entry_price NUMERIC NOT NULL,
            exit_price NUMERIC NOT NULL,
            pnl_usd NUMERIC NOT NULL,
            pnl_percent NUMERIC NOT NULL,
            payout_amount NUMERIC NOT NULL DEFAULT 0,
            open_tx_hash TEXT,
            close_tx_hash TEXT,
            close_explorer_url TEXT,
            close_reason VARCHAR(24) NOT NULL DEFAULT 'USER_CLOSE',
            network VARCHAR(20) NOT NULL DEFAULT 'testnet',
            closed_at BIGINT NOT NULL
          );
        `);
        this.pgSchemaMigrated = true;
        console.log('[Perps Service] PostgreSQL perp_positions & perp_history schema verified.');
      } catch (err) {
        console.warn('[Perps Service] PG schema init note:', err.message);
      }
    }
  }

  isTxHashAlreadyUsed(txHash) {
    if (!txHash) return false;
    const norm = txHash.trim().toLowerCase();
    const swaps = Array.isArray(db.memoryState.swaps) ? db.memoryState.swaps : [];
    const lpPositions = Array.isArray(db.memoryState.lpPositions) ? db.memoryState.lpPositions : [];
    const lendTxs = Array.isArray(db.memoryState.lendingTransactions) ? db.memoryState.lendingTransactions : [];
    const perpPos = Array.isArray(db.memoryState.perpPositions) ? db.memoryState.perpPositions : [];
    const perpHist = Array.isArray(db.memoryState.perpHistory) ? db.memoryState.perpHistory : [];

    if (swaps.some(s => String(s.depositTxHash || '').toLowerCase() === norm)) return true;
    if (lpPositions.some(p => String(p.txHash || '').toLowerCase() === norm)) return true;
    if (lendTxs.some(t => String(t.txHash || '').toLowerCase() === norm)) return true;
    if (perpPos.some(p => String(p.openTxHash || '').toLowerCase() === norm)) return true;
    if (perpHist.some(h => String(h.openTxHash || '').toLowerCase() === norm || String(h.closeTxHash || '').toLowerCase() === norm)) return true;
    return false;
  }

  async getMarketPrice(baseSymbol) {
    const sym = String(baseSymbol || 'BCH').toUpperCase();
    const fallbacks = {
      BCH: 275.4,
      BTC: 68420.0,
      ETH: 2540.0,
      SOL: 178.5,
      PUSD: 1.0,
      USDT: 1.0,
      USDC: 1.0
    };
    try {
      const price = await oraclePool.getPriceUsd(sym);
      return Number(price) > 0 ? Number(price) : (fallbacks[sym] || 1.0);
    } catch {
      return fallbacks[sym] || 1.0;
    }
  }

  async getAllMarketPrices() {
    const [bch, btc, eth, sol] = await Promise.all([
      this.getMarketPrice('BCH'),
      this.getMarketPrice('BTC'),
      this.getMarketPrice('ETH'),
      this.getMarketPrice('SOL')
    ]);
    return {
      BCH: bch,
      BTC: btc,
      ETH: eth,
      SOL: sol,
      BCHUSDT: bch,
      BTCUSDT: btc,
      ETHUSDT: eth,
      SOLUSDT: sol,
      PUSD: 1.0,
      USDT: 1.0
    };
  }

  normalizeAddresses({ userAddress = '', bchAddress = '', evmAddress = '' }) {
    const cleanBch = (
      bchAddress ||
      (userAddress && (userAddress.startsWith('bchtest:') || userAddress.startsWith('bitcoincash:')) ? userAddress : '')
    ).trim().toLowerCase();
    const cleanEvm = (
      evmAddress ||
      (userAddress && userAddress.startsWith('0x') ? userAddress : '')
    ).trim().toLowerCase();
    const fallback = (userAddress || '').trim().toLowerCase();
    const traderKey = cleanBch || cleanEvm || fallback;
    return { cleanBch, cleanEvm, traderKey };
  }

  matchesTrader(item, { cleanBch, cleanEvm, traderKey }) {
    if (!item) return false;
    const itemBch = String(item.bchAddress || '').toLowerCase();
    const itemEvm = String(item.evmAddress || '').toLowerCase();
    const itemKey = String(item.traderKey || '').toLowerCase();
    if (cleanBch && (itemBch === cleanBch || itemKey === cleanBch)) return true;
    if (cleanEvm && (itemEvm === cleanEvm || itemKey === cleanEvm)) return true;
    if (traderKey && itemKey === traderKey) return true;
    return false;
  }

  /**
   * Returns 100% live on-chain Perpetual Markets overview, Oracle prices, Open Interest, and Vault Backing.
   */
  async getMarketsOverview({ network = 'testnet' } = {}) {
    this.initStore();
    const isTestnet = String(network || 'testnet').toLowerCase() === 'testnet';
    const net = isTestnet ? 'testnet' : 'mainnet';

    const [prices, bchBalances, evmBalances] = await Promise.all([
      this.getAllMarketPrices(),
      bchService.getBalances().catch(() => ({ chipnet: { PUSD: 0, bch: 0 }, mainnet: { PUSD: 0, bch: 0 } })),
      evmService.getBalances().catch(() => ({ amoy: { USDT: 0, USDC: 0 }, mainnet: { USDT: 0, USDC: 0 } }))
    ]);

    const vaultPusd = isTestnet ? Number(bchBalances?.chipnet?.PUSD || 0) : 0;
    const vaultBch = isTestnet ? Number(bchBalances?.chipnet?.bch || 0) : 0;
    const vaultUsdt = isTestnet ? Number(evmBalances?.amoy?.USDT || 0) : 0;
    const totalVaultLiquidityUsd = vaultPusd + vaultUsdt + vaultBch * prices.BCH;

    const activePositions = db.memoryState.perpPositions.filter(p => (p.network || 'testnet') === net);

    const marketsData = {};
    let totalLongOiUsd = 0;
    let totalShortOiUsd = 0;

    for (const [symbol, m] of Object.entries(PERP_MARKETS)) {
      const mPos = activePositions.filter(p => p.symbol === symbol);
      const longOi = mPos.filter(p => p.side === 'long').reduce((s, p) => s + Number(p.sizeUsd || 0), 0);
      const shortOi = mPos.filter(p => p.side === 'short').reduce((s, p) => s + Number(p.sizeUsd || 0), 0);
      totalLongOiUsd += longOi;
      totalShortOiUsd += shortOi;

      const totalOi = longOi + shortOi;
      const imbalance = totalOi > 0 ? (longOi - shortOi) / totalOi : 0;
      const fundingRatePct = Number((0.01 + imbalance * 0.015).toFixed(4));

      marketsData[symbol] = {
        ...m,
        markPrice: Number(prices[m.base].toFixed(m.tickDecimals)),
        longOpenInterestUsd: Number(longOi.toFixed(2)),
        shortOpenInterestUsd: Number(shortOi.toFixed(2)),
        totalOpenInterestUsd: Number(totalOi.toFixed(2)),
        fundingRatePct,
        hasLiquidity: isTestnet && totalVaultLiquidityUsd > 0,
        status: isTestnet && totalVaultLiquidityUsd > 0 ? 'ACTIVE' : 'NO_LIQUIDITY'
      };
    }

    return {
      network: net,
      prices: {
        BCH: prices.BCH,
        BTC: prices.BTC,
        ETH: prices.ETH,
        SOL: prices.SOL,
        PUSD: 1.0,
        USDT: 1.0
      },
      markets: marketsData,
      vaults: {
        pusdVaultAddress: isTestnet ? config.bch.chipnetVaultTokenAddress : config.bch.mainnetVaultTokenAddress,
        bchVaultAddress: isTestnet ? config.bch.chipnetVaultAddress : config.bch.mainnetVaultAddress,
        usdtVaultAddress: isTestnet ? config.evm.amoyVaultAddress : config.evm.mainnetVaultAddress,
        usdtTokenAddress: isTestnet
          ? config.evm.amoyTokens?.USDT?.address || '0x1a29793F2a64424D09f56AD045827dF1F0Fa1A75'
          : config.evm.mainnetTokens?.USDT?.address || null,
        availablePusd: Number(vaultPusd.toFixed(2)),
        availableBch: Number(vaultBch.toFixed(6)),
        availableUsdt: Number(vaultUsdt.toFixed(2)),
        totalLiquidityUsd: Number(totalVaultLiquidityUsd.toFixed(2))
      },
      protocolStats: {
        totalLongOiUsd: Number(totalLongOiUsd.toFixed(2)),
        totalShortOiUsd: Number(totalShortOiUsd.toFixed(2)),
        totalOpenInterestUsd: Number((totalLongOiUsd + totalShortOiUsd).toFixed(2)),
        openPositionsCount: activePositions.length,
        totalTradesClosed: db.memoryState.perpHistory.filter(h => (h.network || 'testnet') === net).length
      }
    };
  }

  /**
   * Returns the trader's live open positions & closed trade history with real-time Oracle uPnL.
   */
  async getUserPositions({ userAddress = '', bchAddress = '', evmAddress = '', network = 'testnet' } = {}) {
    this.initStore();
    const isTestnet = String(network || 'testnet').toLowerCase() === 'testnet';
    const net = isTestnet ? 'testnet' : 'mainnet';
    const addrs = this.normalizeAddresses({ userAddress, bchAddress, evmAddress });
    const prices = await this.getAllMarketPrices();

    if (!addrs.traderKey) {
      return {
        network: net,
        prices,
        positions: [],
        history: []
      };
    }

    const userPositions = db.memoryState.perpPositions
      .filter(p => (p.network || 'testnet') === net && this.matchesTrader(p, addrs))
      .map(pos => {
        const currentPrice = prices[pos.base] || prices[pos.symbol] || pos.entryPrice;
        const priceDelta = pos.side === 'long'
          ? currentPrice - pos.entryPrice
          : pos.entryPrice - currentPrice;
        const unrealizedPnlUsd = Number((pos.sizeAsset * priceDelta).toFixed(4));
        const unrealizedPnlPercent = pos.marginUsd > 0
          ? Number(((unrealizedPnlUsd / pos.marginUsd) * 100).toFixed(2))
          : 0;

        return {
          ...pos,
          markPrice: currentPrice,
          unrealizedPnlUsd,
          unrealizedPnlPercent
        };
      });

    const userHistory = db.memoryState.perpHistory
      .filter(h => (h.network || 'testnet') === net && this.matchesTrader(h, addrs))
      .slice(0, 50);

    return {
      network: net,
      prices,
      positions: userPositions,
      history: userHistory
    };
  }

  /**
   * Verifies a genuine on-chain collateral margin deposit into `BinaryLiquidVault.cash` (PUSD / BCH)
   * or `BinaryLiquidVault.sol` (USDT on Polygon Amoy).
   * Supports dual-precision CashToken amounts on Chipnet + AUTO_DETECT UTXO discovery.
   */
  async verifyMarginDeposit({ collateralToken, expectedAmount, txHash, network = 'testnet' }) {
    const sym = String(collateralToken || 'PUSD').toUpperCase();
    const amt = Number(expectedAmount);
    const isTestnet = String(network || 'testnet').toLowerCase() === 'testnet';
    if (!isTestnet) {
      throw new Error('Los mercados de Futuros Perpetuos en Mainnet aún no tienen liquidez activa. Cambia a Testnet (Chipnet / Amoy).');
    }
    if (isNaN(amt) || amt <= 0) {
      throw new Error(`Monto de margen ${sym} inválido.`);
    }

    const cleanHash = String(txHash || '').trim();
    const isAutoDetect = !cleanHash || cleanHash.toUpperCase() === 'AUTO_DETECT';

    if (!isAutoDetect) {
      if (!/^(0x)?[0-9a-fA-F]{64}$/.test(cleanHash)) {
        throw new Error(`El TXID / Hash de margen ${sym} debe tener 64 caracteres hexadecimales.`);
      }
      if (this.isTxHashAlreadyUsed(cleanHash)) {
        throw new Error(`La transacción ${cleanHash.slice(0, 14)}... ya fue utilizada anteriormente.`);
      }
    }

    // 1. PUSD CashTokens on BCH Chipnet -> BinaryLiquidVault.cash
    if (sym === 'PUSD') {
      await bchService.readyPromise;
      const provider = bchService.chipnetProvider;
      const vaultTokenAddr = config.bch.chipnetVaultTokenAddress;
      const vaultBaseAddr = config.bch.chipnetVaultAddress;
      const pusdCategory = config.bch.tokens.PUSD.chipnetCategory.toLowerCase();

      if (!provider || !vaultTokenAddr) {
        throw new Error('Proveedor Electrum de BCH Chipnet no disponible.');
      }

      const [utxosToken, utxosBase] = await Promise.all([
        provider.getUtxos(vaultTokenAddr).catch(() => []),
        vaultBaseAddr ? provider.getUtxos(vaultBaseAddr).catch(() => []) : Promise.resolve([])
      ]);
      const allUtxos = [...(utxosToken || []), ...(utxosBase || [])];

      if (!isAutoDetect) {
        const cleanTxId = cleanHash.replace(/^0x/i, '').toLowerCase();
        const matching = allUtxos.filter(
          u =>
            u.txid?.toLowerCase() === cleanTxId &&
            u.token?.category?.toLowerCase() === pusdCategory &&
            BigInt(u.token?.amount || 0) > 0n
        );

        if (matching.length > 0) {
          const totalUnits = matching.reduce((s, u) => s + BigInt(u.token.amount), 0n);
          const scaledAmount = Number(totalUnits) / 1e6;
          const rawIntegerAmount = Number(totalUnits);
          const detectedAmt =
            scaledAmount >= amt * 0.95 ? scaledAmount : rawIntegerAmount >= amt * 0.95 ? rawIntegerAmount : scaledAmount;

          if (detectedAmt < amt * 0.95) {
            throw new Error(
              `El UTXO en ${cleanTxId.slice(0, 12)}... contiene ${detectedAmt} PUSD, menor al margen solicitado (${amt} PUSD).`
            );
          }

          return {
            verified: true,
            amount: detectedAmt,
            txHash: cleanTxId,
            explorerUrl: `https://chipnet.imaginary.cash/tx/${cleanTxId}`
          };
        }

        const fallback = await bchService.verifyDeposit(cleanTxId, amt, 'PUSD', vaultTokenAddr);
        if (fallback?.verified) {
          return {
            verified: true,
            amount: Number(fallback.amount || amt),
            txHash: cleanTxId,
            explorerUrl: `https://chipnet.imaginary.cash/tx/${cleanTxId}`
          };
        }

        throw new Error(
          `No se encontró un depósito de ${amt} PUSD en BinaryLiquidVault.cash (${vaultTokenAddr}) con el TXID ${cleanTxId.slice(0, 12)}...`
        );
      }

      // AUTO_DETECT unused PUSD UTXO at BinaryLiquidVault.cash
      for (const u of allUtxos) {
        if (!u.txid || this.isTxHashAlreadyUsed(u.txid)) continue;
        if (u.token?.category?.toLowerCase() !== pusdCategory) continue;
        const units = BigInt(u.token?.amount || 0);
        if (units <= 0n) continue;
        const scaledAmount = Number(units) / 1e6;
        const rawIntegerAmount = Number(units);
        const matchesScaled = scaledAmount >= amt * 0.95 && scaledAmount <= amt * 5 + 100;
        const matchesRaw = rawIntegerAmount >= amt * 0.95 && rawIntegerAmount <= amt * 5 + 100;
        if (matchesScaled || matchesRaw) {
          const detectedAmt = matchesScaled ? scaledAmount : rawIntegerAmount;
          const cleanTxId = u.txid.toLowerCase();
          return {
            verified: true,
            amount: detectedAmt,
            txHash: cleanTxId,
            explorerUrl: `https://chipnet.imaginary.cash/tx/${cleanTxId}`
          };
        }
      }

      throw new Error(
        `No se detectó un nuevo UTXO de ${amt} PUSD en BinaryLiquidVault.cash (${vaultTokenAddr}). Envía los PUSD o usa la firma 1-Clic con Paytaca.`
      );
    }

    // 2. Native tBCH on BCH Chipnet -> BinaryLiquidVault.cash
    if (sym === 'BCH') {
      await bchService.readyPromise;
      const provider = bchService.chipnetProvider;
      const vaultBaseAddr = config.bch.chipnetVaultAddress;
      const vaultTokenAddr = config.bch.chipnetVaultTokenAddress;
      const [utxosBase, utxosToken] = await Promise.all([
        provider.getUtxos(vaultBaseAddr).catch(() => []),
        vaultTokenAddr ? provider.getUtxos(vaultTokenAddr).catch(() => []) : Promise.resolve([])
      ]);
      const pureBchUtxos = [...(utxosBase || []), ...(utxosToken || [])].filter(
        u => !u.token && BigInt(u.satoshis || 0) >= 546n
      );

      if (!isAutoDetect) {
        const cleanTxId = cleanHash.replace(/^0x/i, '').toLowerCase();
        const matching = pureBchUtxos.filter(u => u.txid?.toLowerCase() === cleanTxId);
        if (matching.length > 0) {
          const sats = matching.reduce((s, u) => s + BigInt(u.satoshis), 0n);
          const bchAmt = Number(sats) / 1e8;
          if (bchAmt < amt * 0.95) {
            throw new Error(`El UTXO en ${cleanTxId.slice(0, 12)}... contiene ${bchAmt} BCH, menor a ${amt} BCH.`);
          }
          return {
            verified: true,
            amount: bchAmt,
            txHash: cleanTxId,
            explorerUrl: `https://chipnet.imaginary.cash/tx/${cleanTxId}`
          };
        }
        throw new Error(`No se encontró un depósito de ${amt} tBCH en BinaryLiquidVault.cash con el TXID ${cleanTxId.slice(0, 12)}...`);
      }

      for (const u of pureBchUtxos) {
        if (!u.txid || this.isTxHashAlreadyUsed(u.txid)) continue;
        const bchAmt = Number(u.satoshis) / 1e8;
        if (bchAmt >= amt * 0.95 && bchAmt <= amt * 5 + 1) {
          const cleanTxId = u.txid.toLowerCase();
          return {
            verified: true,
            amount: bchAmt,
            txHash: cleanTxId,
            explorerUrl: `https://chipnet.imaginary.cash/tx/${cleanTxId}`
          };
        }
      }

      throw new Error(`No se detectó un nuevo UTXO de ${amt} tBCH en BinaryLiquidVault.cash (${vaultBaseAddr}).`);
    }

    // 3. USDT ERC-20 on Polygon Amoy -> BinaryLiquidVault.sol
    if (sym === 'USDT') {
      if (isAutoDetect) {
        throw new Error('Se requiere el hash de transacción (0x...) de Polygon Amoy para verificar el margen en USDT.');
      }
      const normTx = cleanHash.startsWith('0x') ? cleanHash : `0x${cleanHash}`;
      const provider = evmService.amoyProvider;
      if (!provider) {
        throw new Error('Proveedor RPC de Polygon Amoy no disponible.');
      }

      const receipt = await provider.getTransactionReceipt(normTx);
      if (!receipt || receipt.status !== 1) {
        throw new Error(`La transacción ${normTx.slice(0, 12)}... no está confirmada o falló en Polygon Amoy.`);
      }

      const vaultAddr = (config.evm.amoyVaultAddress || '').toLowerCase();
      const tokenCfg = config.evm.amoyTokens?.USDT;
      const expectedTokenAddr = (tokenCfg?.address || '').toLowerCase();
      const decimals = tokenCfg?.decimals || 6;
      const transferTopic = ethers.id('Transfer(address,address,uint256)');

      let transferredUnits = 0n;
      for (const log of receipt.logs || []) {
        if (expectedTokenAddr && log.address.toLowerCase() !== expectedTokenAddr) continue;
        if (log.topics[0] !== transferTopic || log.topics.length < 3) continue;
        const toAddr = ('0x' + log.topics[2].slice(26)).toLowerCase();
        if (toAddr === vaultAddr) {
          transferredUnits += BigInt(log.data);
        }
      }

      const transferredFloat = Number(ethers.formatUnits(transferredUnits, decimals));
      if (transferredFloat < amt * 0.98) {
        throw new Error(
          `El recibo en Polygon Amoy muestra ${transferredFloat} USDT transferidos a BinaryLiquidVault.sol, pero se esperaban ${amt} USDT.`
        );
      }

      return {
        verified: true,
        amount: transferredFloat,
        txHash: normTx,
        explorerUrl: `https://amoy.polygonscan.com/tx/${normTx}`
      };
    }

    throw new Error(`Colateral ${sym} no soportado. Usa PUSD, USDT o BCH.`);
  }

  /**
   * Opens a new leveraged Perpetual Futures position backed 100% by on-chain collateral in BinaryLiquidVault.
   */
  async openPosition({
    userAddress = '',
    bchAddress = '',
    evmAddress = '',
    symbol = 'BCHUSDT',
    side = 'long',
    orderType = 'market',
    limitPrice = null,
    leverage = 10,
    collateralToken = 'PUSD',
    marginAmount = 0,
    takeProfit = null,
    stopLoss = null,
    txHash = '',
    network = 'testnet'
  }) {
    this.initStore();
    const isTestnet = String(network || 'testnet').toLowerCase() === 'testnet';
    if (!isTestnet) {
      throw new Error('Los mercados de Futuros Perpetuos en Mainnet aún no tienen liquidez activa. Cambia a Testnet (Chipnet / Amoy).');
    }

    const market = PERP_MARKETS[String(symbol || 'BCHUSDT').toUpperCase()];
    if (!market) {
      throw new Error(`Mercado perpetuo ${symbol} no soportado.`);
    }

    const cleanSide = String(side || 'long').toLowerCase() === 'short' ? 'short' : 'long';
    const cleanLev = Math.max(1, Math.min(market.maxLeverage, Math.round(Number(leverage) || 1)));
    const colToken = String(collateralToken || 'PUSD').toUpperCase();
    const reqMargin = Number(marginAmount);

    const addrs = this.normalizeAddresses({ userAddress, bchAddress, evmAddress });
    if (!addrs.traderKey) {
      throw new Error('Conecta tu billetera antes de abrir una posición perpetua.');
    }

    if ((colToken === 'PUSD' || colToken === 'BCH') && !addrs.cleanBch) {
      throw new Error(`Conecta tu billetera Bitcoin Cash Chipnet (Paytaca / Cashonize) para operar con colateral ${colToken}.`);
    }
    if (colToken === 'USDT' && !addrs.cleanEvm) {
      throw new Error('Conecta tu billetera EVM (MetaMask) en Polygon Amoy para operar con colateral USDT.');
    }

    // 1. Verify genuine on-chain collateral deposit into BinaryLiquidVault
    const verification = await this.verifyMarginDeposit({
      collateralToken: colToken,
      expectedAmount: reqMargin,
      txHash,
      network: 'testnet'
    });

    // 2. Fetch live Oracle mark price & collateral USD valuation
    const [markPrice, bchUsdPrice] = await Promise.all([
      this.getMarketPrice(market.base),
      colToken === 'BCH' ? this.getMarketPrice('BCH') : Promise.resolve(1.0)
    ]);

    const verifiedMarginAmt = Number(verification.amount);
    const marginUsd = Number((verifiedMarginAmt * (colToken === 'BCH' ? bchUsdPrice : 1.0)).toFixed(4));
    const entryPrice =
      orderType === 'limit' && Number(limitPrice) > 0
        ? Number(Number(limitPrice).toFixed(market.tickDecimals))
        : Number(markPrice.toFixed(market.tickDecimals));

    const sizeUsd = Number((marginUsd * cleanLev).toFixed(4));
    const sizeAsset = Number((sizeUsd / entryPrice).toFixed(market.assetDecimals));

    const liqRaw =
      cleanSide === 'long'
        ? entryPrice * (1 - 1 / cleanLev + market.mmr)
        : entryPrice * (1 + 1 / cleanLev - market.mmr);
    const liquidationPrice = Number(Math.max(0.01, liqRaw).toFixed(market.tickDecimals));

    const parsedTp = Number(takeProfit) > 0 ? Number(Number(takeProfit).toFixed(market.tickDecimals)) : null;
    const parsedSl = Number(stopLoss) > 0 ? Number(Number(stopLoss).toFixed(market.tickDecimals)) : null;

    const newPosition = {
      id: `perp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      traderKey: addrs.traderKey,
      bchAddress: addrs.cleanBch || null,
      evmAddress: addrs.cleanEvm || null,
      symbol: market.symbol,
      market: market.name,
      base: market.base,
      side: cleanSide,
      orderType: orderType === 'limit' ? 'limit' : 'market',
      leverage: cleanLev,
      collateralToken: colToken,
      margin: verifiedMarginAmt,
      marginAmount: verifiedMarginAmt,
      marginUsd,
      sizeUsd,
      sizeAsset,
      entryPrice,
      markPrice,
      liquidationPrice,
      takeProfit: parsedTp,
      stopLoss: parsedSl,
      openTxHash: verification.txHash,
      openExplorerUrl: verification.explorerUrl,
      onChainVerified: true,
      network: 'testnet',
      openTime: Date.now()
    };

    db.memoryState.perpPositions.unshift(newPosition);
    db.persist();

    if (db.pgPool) {
      try {
        await this.initDatabaseTables();
        await db.pgPool.query(
          `INSERT INTO perp_positions (
            id, trader_key, bch_address, evm_address, symbol, market, base_asset,
            side, order_type, leverage, collateral_token, margin_amount, margin_usd,
            size_usd, size_asset, entry_price, liquidation_price, take_profit, stop_loss,
            open_tx_hash, open_explorer_url, network, open_time
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)`,
          [
            newPosition.id,
            newPosition.traderKey,
            newPosition.bchAddress,
            newPosition.evmAddress,
            newPosition.symbol,
            newPosition.market,
            newPosition.base,
            newPosition.side,
            newPosition.orderType,
            newPosition.leverage,
            newPosition.collateralToken,
            newPosition.marginAmount,
            newPosition.marginUsd,
            newPosition.sizeUsd,
            newPosition.sizeAsset,
            newPosition.entryPrice,
            newPosition.liquidationPrice,
            newPosition.takeProfit,
            newPosition.stopLoss,
            newPosition.openTxHash,
            newPosition.openExplorerUrl,
            newPosition.network,
            newPosition.openTime
          ]
        );
      } catch (err) {
        console.warn('[Perps Service] PG insert position note:', err.message);
      }
    }

    return {
      position: newPosition,
      txHash: verification.txHash,
      explorerUrl: verification.explorerUrl
    };
  }

  /**
   * Updates Take-Profit and Stop-Loss levels for an active on-chain Perpetual Position.
   */
  async updatePositionTpSl({ positionId, userAddress = '', bchAddress = '', evmAddress = '', takeProfit = null, stopLoss = null }) {
    this.initStore();
    const pos = db.memoryState.perpPositions.find(p => p.id === positionId);
    if (!pos) {
      throw new Error('Posición perpetua no encontrada o ya cerrada.');
    }

    const addrs = this.normalizeAddresses({ userAddress, bchAddress, evmAddress });
    if (addrs.traderKey && !this.matchesTrader(pos, addrs)) {
      throw new Error('No tienes permisos para modificar esta posición.');
    }

    const market = PERP_MARKETS[pos.symbol] || PERP_MARKETS.BCHUSDT;
    pos.takeProfit = Number(takeProfit) > 0 ? Number(Number(takeProfit).toFixed(market.tickDecimals)) : null;
    pos.stopLoss = Number(stopLoss) > 0 ? Number(Number(stopLoss).toFixed(market.tickDecimals)) : null;
    db.persist();

    if (db.pgPool) {
      try {
        await this.initDatabaseTables();
        await db.pgPool.query(
          `UPDATE perp_positions SET take_profit = $1, stop_loss = $2, updated_at = NOW() WHERE id = $3`,
          [pos.takeProfit, pos.stopLoss, pos.id]
        );
      } catch (err) {
        console.warn('[Perps Service] PG update TP/SL note:', err.message);
      }
    }

    return pos;
  }

  /**
   * Closes an open Perpetual Position against the live Oracle mark price and executes a 100% real
   * on-chain settlement transfer (margin +/- realized PnL) from BinaryLiquidVault back to the trader!
   */
  async closePosition({ positionId, userAddress = '', bchAddress = '', evmAddress = '', closeReason = 'USER_CLOSE' }) {
    this.initStore();
    const posIndex = db.memoryState.perpPositions.findIndex(p => p.id === positionId);
    if (posIndex === -1) {
      throw new Error('La posición perpetua no existe o ya fue liquidada.');
    }

    const pos = db.memoryState.perpPositions[posIndex];
    const addrs = this.normalizeAddresses({ userAddress, bchAddress, evmAddress });
    if (addrs.traderKey && !this.matchesTrader(pos, addrs)) {
      throw new Error('Esta posición pertenece a otra billetera.');
    }

    const market = PERP_MARKETS[pos.symbol] || PERP_MARKETS.BCHUSDT;
    const [exitPriceRaw, bchUsdPrice] = await Promise.all([
      this.getMarketPrice(pos.base || market.base),
      pos.collateralToken === 'BCH' ? this.getMarketPrice('BCH') : Promise.resolve(1.0)
    ]);

    const exitPrice = Number(exitPriceRaw.toFixed(market.tickDecimals));
    const priceDelta = pos.side === 'long' ? exitPrice - pos.entryPrice : pos.entryPrice - exitPrice;
    const grossPnlUsd = pos.sizeAsset * priceDelta;
    const closingFeeUsd = pos.sizeUsd * (market.takerFeeRate || 0.0005);
    const netPnlUsd = Number((grossPnlUsd - closingFeeUsd).toFixed(4));
    const pnlPercent = pos.marginUsd > 0 ? Number(((netPnlUsd / pos.marginUsd) * 100).toFixed(2)) : 0;

    const colToken = String(pos.collateralToken || 'PUSD').toUpperCase();
    const colPriceUsd = colToken === 'BCH' ? bchUsdPrice : 1.0;
    const pnlInCollateral = netPnlUsd / (colPriceUsd > 0 ? colPriceUsd : 1.0);
    const rawPayout = Number(pos.marginAmount || pos.margin || 0) + pnlInCollateral;
    const decimals = colToken === 'BCH' ? 6 : 4;
    let payoutAmount = Math.max(0, Number(rawPayout.toFixed(decimals)));

    let closeTxHash = null;
    let closeExplorerUrl = null;

    // Execute real on-chain settlement from BinaryLiquidVault if payoutAmount > dust threshold
    if (payoutAmount > (colToken === 'BCH' ? 0.00001 : 0.01)) {
      if (colToken === 'PUSD' || colToken === 'BCH') {
        const targetBch = addrs.cleanBch || pos.bchAddress;
        if (!targetBch || !targetBch.startsWith('bchtest:')) {
          throw new Error(`Conecta tu billetera BCH Chipnet para recibir la liquidación de ${payoutAmount} ${colToken}.`);
        }

        // Cap payout to available vault liquidity so profitable trades never revert if testnet vault has limited balance
        const balances = await bchService.getBalances().catch(() => null);
        const availInVault = colToken === 'PUSD'
          ? Number(balances?.chipnet?.PUSD || payoutAmount)
          : Number(balances?.chipnet?.bch || payoutAmount);
        if (availInVault > 0 && payoutAmount > availInVault * 0.98) {
          payoutAmount = Number((availInVault * 0.95).toFixed(decimals));
        }

        const releaseRes = await bchService.releaseFromVault(targetBch, payoutAmount, colToken);
        closeTxHash = releaseRes.txHash;
        closeExplorerUrl = releaseRes.explorerUrl;
      } else if (colToken === 'USDT') {
        const targetEvm = addrs.cleanEvm || pos.evmAddress;
        if (!targetEvm || !targetEvm.startsWith('0x')) {
          throw new Error(`Conecta tu billetera Polygon Amoy (0x...) para recibir la liquidación de ${payoutAmount} USDT.`);
        }

        const evmBals = await evmService.getBalances().catch(() => null);
        const availUsdt = Number(evmBals?.amoy?.USDT || payoutAmount);
        if (availUsdt > 0 && payoutAmount > availUsdt * 0.98) {
          payoutAmount = Number((availUsdt * 0.95).toFixed(4));
        }

        const tokenCfg = config.evm.amoyTokens?.USDT;
        const vaultAddr = config.evm.amoyVaultAddress;
        const uniqueSettleRef = ethers.id(`PERP_CLOSE:${pos.id}:${targetEvm}:${Date.now()}`);

        const auth = await watchmanSentinel.authorizeTransaction({
          destinationType: 'EVM',
          originTxHash: uniqueSettleRef,
          fromToken: 'PUSD',
          toToken: 'USDT',
          recipient: targetEvm,
          tokenAddress: tokenCfg.address,
          tokenDecimals: tokenCfg.decimals,
          amount: payoutAmount,
          rate: 1.0,
          chainId: config.evm.amoyChainId,
          vaultContractAddress: vaultAddr
        });

        if (!auth.approved) {
          throw new Error(`Watchman Sentinel rechazó la liquidación del perpetuo: ${auth.reason}`);
        }

        const releaseRes = await evmService.releaseFromVault({
          bchTxHashBytes32: auth.bchTxHashBytes32,
          recipientAddress: targetEvm,
          amount: payoutAmount,
          tokenSymbol: 'USDT',
          chain: 'polygon_amoy',
          nonce: auth.nonce,
          watchmanSignature: auth.proof
        });

        closeTxHash = releaseRes.txHash;
        closeExplorerUrl = releaseRes.explorerUrl;
      }
    }

    // Remove from active positions and append to history
    db.memoryState.perpPositions.splice(posIndex, 1);

    const historyRecord = {
      id: `perphist_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      positionId: pos.id,
      traderKey: pos.traderKey,
      bchAddress: pos.bchAddress,
      evmAddress: pos.evmAddress,
      symbol: pos.symbol,
      market: pos.market,
      side: pos.side,
      leverage: pos.leverage,
      collateralToken: colToken,
      margin: pos.marginAmount,
      marginAmount: pos.marginAmount,
      marginUsd: pos.marginUsd,
      sizeUsd: pos.sizeUsd,
      sizeAsset: pos.sizeAsset,
      entryPrice: pos.entryPrice,
      exitPrice,
      pnlUsd: netPnlUsd,
      pnlPercent,
      payoutAmount,
      openTxHash: pos.openTxHash,
      openExplorerUrl: pos.openExplorerUrl,
      closeTxHash,
      closeExplorerUrl,
      closeReason,
      onChainVerified: true,
      network: pos.network || 'testnet',
      closedAt: Date.now()
    };

    db.memoryState.perpHistory.unshift(historyRecord);
    if (db.memoryState.perpHistory.length > 500) {
      db.memoryState.perpHistory.length = 500;
    }
    db.persist();

    if (db.pgPool) {
      try {
        await this.initDatabaseTables();
        await db.pgPool.query(`DELETE FROM perp_positions WHERE id = $1`, [pos.id]);
        await db.pgPool.query(
          `INSERT INTO perp_history (
            id, position_id, trader_key, bch_address, evm_address, symbol, market,
            side, leverage, collateral_token, margin_amount, margin_usd, size_usd,
            size_asset, entry_price, exit_price, pnl_usd, pnl_percent, payout_amount,
            open_tx_hash, close_tx_hash, close_explorer_url, close_reason, network, closed_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)`,
          [
            historyRecord.id,
            historyRecord.positionId,
            historyRecord.traderKey,
            historyRecord.bchAddress,
            historyRecord.evmAddress,
            historyRecord.symbol,
            historyRecord.market,
            historyRecord.side,
            historyRecord.leverage,
            historyRecord.collateralToken,
            historyRecord.marginAmount,
            historyRecord.marginUsd,
            historyRecord.sizeUsd,
            historyRecord.sizeAsset,
            historyRecord.entryPrice,
            historyRecord.exitPrice,
            historyRecord.pnlUsd,
            historyRecord.pnlPercent,
            historyRecord.payoutAmount,
            historyRecord.openTxHash,
            historyRecord.closeTxHash,
            historyRecord.closeExplorerUrl,
            historyRecord.closeReason,
            historyRecord.network,
            historyRecord.closedAt
          ]
        );
      } catch (err) {
        console.warn('[Perps Service] PG archive history note:', err.message);
      }
    }

    return {
      closedPosition: historyRecord,
      txHash: closeTxHash,
      explorerUrl: closeExplorerUrl
    };
  }
}

export const perpsService = new PerpsService();
