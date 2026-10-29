import Redis from 'ioredis';
import { config } from '../config.js';
import { poolService } from './poolService.js';

class OraclePoolManager {
  constructor() {
    this.currentIndex = 0;
    this.activeProvider = 'Binance API';

    // In-memory fallback prices (USD)
    this.memoryCache = {
      timestamp: {},
      prices: {
        PUSD: 1.0,
        MUSD: 1.0,
        USDC: 1.0,
        USDT: 1.0,
        BCH: 283.5,
        ETH: 2345.0,
        SOL: 101.5,
        BNB: 749.0,
        POL: 0.0915
      }
    };

    // Stables pegged 1:1 to USD
    this.stables = new Set(['PUSD', 'USDC', 'USDT', 'MUSD']);

    // Symbol mappings for tier-1 oracle providers
    this.binanceSymbols = {
      BCH: 'BCHUSDT',
      ETH: 'ETHUSDT',
      SOL: 'SOLUSDT',
      BNB: 'BNBUSDT',
      POL: 'POLUSDT'
    };

    this.coinGeckoIds = {
      BCH: 'bitcoin-cash',
      ETH: 'ethereum',
      SOL: 'solana',
      BNB: 'binancecoin',
      POL: 'polygon-ecosystem-token'
    };

    this.coinbaseSymbols = {
      BCH: 'BCH-USD',
      ETH: 'ETH-USD',
      SOL: 'SOL-USD'
    };

    this.krakenPairs = {
      BCH: 'BCHUSD',
      ETH: 'ETHUSD',
      SOL: 'SOLUSD'
    };

    this.oracles = [
      {
        name: 'Binance API',
        fetchPrice: async (sym) => {
          const pair = this.binanceSymbols[sym];
          if (!pair) throw new Error(`Symbol ${sym} not supported on Binance`);
          const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${pair}`, {
            signal: AbortSignal.timeout(3000)
          });
          const data = await res.json();
          const val = parseFloat(data?.price);
          if (isNaN(val) || val <= 0) throw new Error('Invalid Binance price');
          return val;
        },
        healthy: true,
        failures: 0,
        latency: 0
      },
      {
        name: 'CoinGecko API',
        fetchPrice: async (sym) => {
          const id = this.coinGeckoIds[sym];
          if (!id) throw new Error(`Symbol ${sym} not supported on CoinGecko`);
          const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`, {
            signal: AbortSignal.timeout(3500)
          });
          const data = await res.json();
          const val = parseFloat(data?.[id]?.usd);
          if (isNaN(val) || val <= 0) throw new Error('Invalid CoinGecko price');
          return val;
        },
        healthy: true,
        failures: 0,
        latency: 0
      },
      {
        name: 'Coinbase API',
        fetchPrice: async (sym) => {
          const pair = this.coinbaseSymbols[sym];
          if (!pair) throw new Error(`Symbol ${sym} not supported on Coinbase`);
          const res = await fetch(`https://api.coinbase.com/v2/prices/${pair}/spot`, {
            signal: AbortSignal.timeout(3500)
          });
          const data = await res.json();
          const val = parseFloat(data?.data?.amount);
          if (isNaN(val) || val <= 0) throw new Error('Invalid Coinbase price');
          return val;
        },
        healthy: true,
        failures: 0,
        latency: 0
      },
      {
        name: 'Kraken API',
        fetchPrice: async (sym) => {
          const pair = this.krakenPairs[sym];
          if (!pair) throw new Error(`Symbol ${sym} not supported on Kraken`);
          const res = await fetch(`https://api.kraken.com/0/public/Ticker?pair=${pair}`, {
            signal: AbortSignal.timeout(3500)
          });
          const data = await res.json();
          const result = data?.result;
          const key = result ? Object.keys(result)[0] : null;
          const val = parseFloat(result?.[key]?.c?.[0]);
          if (isNaN(val) || val <= 0) throw new Error('Invalid Kraken price');
          return val;
        },
        healthy: true,
        failures: 0,
        latency: 0
      }
    ];

    // Initialize Redis client with graceful offline fallback
    this.redis = null;
    try {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        maxRetriesPerRequest: 1,
        lazyConnect: true
      });
      this.redis.connect().catch(() => {
        this.redis = null;
      });
    } catch (e) {
      this.redis = null;
    }
  }

  /**
   * Fetches spot USD price for any supported asset with multi-oracle failover and Redis caching.
   */
  async getPriceUsd(tokenSymbol) {
    const sym = (tokenSymbol || 'PUSD').toUpperCase();

    // 1. Stables are pegged 1:1 to USD
    if (this.stables.has(sym)) {
      return 1.0;
    }

    const now = Date.now();
    const TTL_MS = 15000; // 15 seconds cache

    // 2. Try Redis cache
    if (this.redis) {
      try {
        const cached = await this.redis.get(`oracle:price:${sym}`);
        if (cached) {
          const parsed = parseFloat(cached);
          if (!isNaN(parsed) && parsed > 0) return parsed;
        }
      } catch (err) {}
    }

    // 3. Try In-memory cache
    if (this.memoryCache.prices[sym] && (now - (this.memoryCache.timestamp[sym] || 0) < TTL_MS)) {
      return this.memoryCache.prices[sym];
    }

    // 4. Query Oracle Pool with automatic failover
    let attempts = 0;
    while (attempts < this.oracles.length) {
      const oracle = this.oracles[this.currentIndex];
      const start = Date.now();
      try {
        const price = await oracle.fetchPrice(sym);
        oracle.latency = Date.now() - start;
        oracle.healthy = true;
        if (oracle.failures > 0) oracle.failures--;
        this.activeProvider = oracle.name;

        // Save to in-memory cache
        this.memoryCache.prices[sym] = price;
        this.memoryCache.timestamp[sym] = now;

        // Save to Redis cache
        if (this.redis) {
          this.redis.set(`oracle:price:${sym}`, price.toString(), 'EX', 15).catch(() => {});
        }

        return price;
      } catch (err) {
        oracle.failures++;
        oracle.healthy = false;
        this.currentIndex = (this.currentIndex + 1) % this.oracles.length;
        attempts++;
      }
    }

    // 5. If all oracles fail or symbol unsupported, return safe memory fallback
    return this.memoryCache.prices[sym] || 1.0;
  }

  /**
   * Backward compatible helper for BCH spot price.
   */
  async getBchPriceUsd() {
    return this.getPriceUsd('BCH');
  }

  /**
   * Universal Cross-Rate Calculation:
   * Rate(A -> B) = PriceUSD(A) / PriceUSD(B)
   */
  async getRate(fromToken, toToken) {
    const from = (fromToken || 'PUSD').toUpperCase();
    const to = (toToken || 'USDC').toUpperCase();

    if (from === to) return 1.0;

    // Both stables pegged 1:1
    if (this.stables.has(from) && this.stables.has(to)) {
      return 1.0;
    }

    const priceFrom = await this.getPriceUsd(from);
    const priceTo = await this.getPriceUsd(to);

    if (priceTo <= 0) return 1.0;
    return priceFrom / priceTo;
  }

  /**
   * Returns current pool reserve / float liquidity for the destination token.
   */
  async getAvailableLiquidity(tokenSymbol) {
    const sym = (tokenSymbol || 'USDC').toUpperCase();
    const pool = poolService.getPool('PUSD_USDC');

    switch (sym) {
      case 'PUSD':
        return Number(pool?.reserveBch || 50000.0);
      case 'MUSD':
        return Number((pool?.reserveBch || 50000.0) * 0.6);
      case 'USDC':
        return Number(pool?.reserveEvm || 50000.0);
      case 'USDT':
        return Number((pool?.reserveEvm || 50000.0) * 0.85);
      case 'BCH': {
        const bchPrice = await this.getPriceUsd('BCH');
        return Number(((pool?.reserveBch || 50000.0) / (bchPrice || 283.5)).toFixed(4));
      }
      case 'ETH':
        return 25.0; // ~58,000 USD reserve
      case 'SOL':
        return 500.0; // ~50,000 USD reserve
      case 'BNB':
        return 75.0; // ~56,000 USD reserve
      case 'POL':
        return 300000.0; // ~27,000 USD reserve
      default:
        return 10000.0;
    }
  }

  /**
   * Generates a fully quoted swap order including fee breakdown and pre-flight liquidity check.
   */
  async calculateQuote(fromToken, toToken, amount) {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new Error('Invalid swap amount');
    }

    if (parsedAmount < config.minSwapAmount) {
      throw new Error(`Minimum swap amount is ${config.minSwapAmount} ${fromToken}`);
    }

    if (parsedAmount > config.maxSwapAmount) {
      throw new Error(`Maximum swap amount per transaction is ${config.maxSwapAmount} ${fromToken}`);
    }

    const priceFrom = await this.getPriceUsd(fromToken);
    const priceTo = await this.getPriceUsd(toToken);
    const rate = priceTo > 0 ? (priceFrom / priceTo) : 1.0;
    const grossAmount = parsedAmount * rate;
    const feeAmount = grossAmount * config.feePercentage; // 0.3%
    const lpCutAmount = feeAmount * (0.20 / 0.30); // 0.20%
    const treasuryCutAmount = feeAmount * (0.10 / 0.30); // 0.10%
    const netPayout = grossAmount - feeAmount;
    const netPayoutUsd = Number((netPayout * priceTo).toFixed(2));

    // Pre-flight Liquidity Check against destination pool reserves
    const availableLiquidity = await this.getAvailableLiquidity(toToken);
    const hasLiquidity = netPayout <= availableLiquidity;

    return {
      fromToken: fromToken.toUpperCase(),
      toToken: toToken.toUpperCase(),
      inputAmount: parsedAmount,
      rate: Number(rate.toFixed(6)),
      grossAmount: Number(grossAmount.toFixed(6)),
      feePercentage: config.feePercentage * 100, // 0.3%
      feeAmount: Number(feeAmount.toFixed(6)),
      lpCutAmount: Number(lpCutAmount.toFixed(6)),
      treasuryCutAmount: Number(treasuryCutAmount.toFixed(6)),
      netPayout: Number(netPayout.toFixed(6)),
      netPayoutUsd,
      priceFromUsd: Number(priceFrom.toFixed(4)),
      priceToUsd: Number(priceTo.toFixed(4)),
      hasLiquidity,
      availableLiquidity: Number(availableLiquidity.toFixed(4)),
      minAmount: config.minSwapAmount,
      maxAmount: config.maxSwapAmount,
      estimatedSeconds: 3,
      oracleProvider: this.activeProvider,
      isSponsorAsset: fromToken.toUpperCase() === 'PUSD' || toToken.toUpperCase() === 'PUSD',
      sponsorTag: 'Official BLAZE Sponsor (ParyonUSD)'
    };
  }

  getHealth() {
    return {
      activeOracle: this.activeProvider,
      totalOracles: this.oracles.length,
      cachedPrices: this.memoryCache.prices,
      redisConnected: Boolean(this.redis),
      oracles: this.oracles.map(o => ({
        name: o.name,
        healthy: o.healthy,
        latencyMs: o.latency,
        failures: o.failures
      }))
    };
  }
}

export const oraclePool = new OraclePoolManager();
export const oracle = oraclePool;
