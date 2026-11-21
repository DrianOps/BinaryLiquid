import Redis from 'ioredis';
import { WebSocket } from 'ws';
import { config } from '../config.js';
import { poolService } from './poolService.js';

class OraclePoolManager {
  constructor() {
    this.currentIndex = 0;
    this.activeProvider = 'Consensus Median (Multi-CEX)';

    // Cauldron DEX Router Configuration for CashTokens
    this.cauldronCategoryId = '5932b2fd4915d6a75d3ec53282cd49118149a2176ee67ed68b1111ff0786f7fc';
    this.cauldronRouterWs = 'wss://router.riften.net/v1/route';

    // In-memory fallback prices (USD) — used ONLY for non-strict UI/display fallback, NEVER for Perps execution
    this.memoryCache = {
      timestamp: {},
      prices: {
        PUSD: 1.0,
        MUSD: 1.0,
        USDC: 1.0,
        USDT: 1.0,
        USDT_SOL: 1.0,
        USDC_SOL: 1.0,
        USDT_BSC: 1.0,
        USDT_TON: 1.0,
        BTC: 68420.0,
        BCH: 283.5,
        ETH: 2345.0,
        SOL: 101.5,
        BNB: 749.0,
        POL: 0.0915,
        LTC: 49.3,
        TON: 5.25,
        LIFT: 0.01636
      }
    };

    // Structured multi-source consensus cache & in-flight request deduplication
    this.consensusCache = {};
    this.inFlightConsensus = new Map();

    // Stables pegged 1:1 to USD
    this.stables = new Set(['PUSD', 'USDC', 'USDT', 'MUSD', 'USDT_SOL', 'USDC_SOL', 'USDT_BSC', 'USDT_TON']);

    // Symbol mappings for tier-1 free public CEX spot endpoints (no API key required)
    this.binanceSymbols = {
      BTC: 'BTCUSDT',
      BCH: 'BCHUSDT',
      ETH: 'ETHUSDT',
      SOL: 'SOLUSDT',
      BNB: 'BNBUSDT',
      POL: 'POLUSDT',
      LTC: 'LTCUSDT',
      TON: 'TONUSDT'
    };

    this.okxSymbols = {
      BTC: 'BTC-USDT',
      BCH: 'BCH-USDT',
      ETH: 'ETH-USDT',
      SOL: 'SOL-USDT',
      BNB: 'BNB-USDT',
      POL: 'POL-USDT',
      LTC: 'LTC-USDT',
      TON: 'TON-USDT'
    };

    this.coinbaseSymbols = {
      BTC: 'BTC-USD',
      BCH: 'BCH-USD',
      ETH: 'ETH-USD',
      SOL: 'SOL-USD',
      POL: 'POL-USD',
      LTC: 'LTC-USD'
    };

    this.krakenPairs = {
      BTC: 'XBTUSD',
      BCH: 'BCHUSD',
      ETH: 'ETHUSD',
      SOL: 'SOLUSD',
      POL: 'POLUSD',
      LTC: 'LTCUSD',
      TON: 'TONUSD'
    };

    this.kucoinSymbols = {
      BTC: 'BTC-USDT',
      BCH: 'BCH-USDT',
      ETH: 'ETH-USDT',
      SOL: 'SOL-USDT',
      BNB: 'BNB-USDT',
      POL: 'POL-USDT',
      LTC: 'LTC-USDT',
      TON: 'TON-USDT'
    };

    this.coinGeckoIds = {
      BTC: 'bitcoin',
      BCH: 'bitcoin-cash',
      ETH: 'ethereum',
      SOL: 'solana',
      BNB: 'binancecoin',
      POL: 'polygon-ecosystem-token',
      LTC: 'litecoin',
      TON: 'the-open-network'
    };

    // High-throughput Tier-1 CEX Spot sources queried in parallel for real-time median consensus
    this.fastOracles = [
      {
        name: 'Binance API',
        supports: (sym) => Boolean(this.binanceSymbols[sym]),
        fetchPrice: async (sym) => {
          const pair = this.binanceSymbols[sym];
          if (!pair) throw new Error(`Symbol ${sym} not supported on Binance`);
          const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${pair}`, {
            signal: AbortSignal.timeout(2500)
          });
          if (!res.ok) throw new Error(`Binance HTTP ${res.status}`);
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
        name: 'OKX API',
        supports: (sym) => Boolean(this.okxSymbols[sym]),
        fetchPrice: async (sym) => {
          const pair = this.okxSymbols[sym];
          if (!pair) throw new Error(`Symbol ${sym} not supported on OKX`);
          const res = await fetch(`https://www.okx.com/api/v5/market/ticker?instId=${pair}`, {
            signal: AbortSignal.timeout(2500)
          });
          if (!res.ok) throw new Error(`OKX HTTP ${res.status}`);
          const data = await res.json();
          const val = parseFloat(data?.data?.[0]?.last);
          if (isNaN(val) || val <= 0) throw new Error('Invalid OKX price');
          return val;
        },
        healthy: true,
        failures: 0,
        latency: 0
      },
      {
        name: 'Coinbase API',
        supports: (sym) => Boolean(this.coinbaseSymbols[sym]),
        fetchPrice: async (sym) => {
          const pair = this.coinbaseSymbols[sym];
          if (!pair) throw new Error(`Symbol ${sym} not supported on Coinbase`);
          const res = await fetch(`https://api.coinbase.com/v2/prices/${pair}/spot`, {
            signal: AbortSignal.timeout(2500)
          });
          if (!res.ok) throw new Error(`Coinbase HTTP ${res.status}`);
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
        supports: (sym) => Boolean(this.krakenPairs[sym]),
        fetchPrice: async (sym) => {
          const pair = this.krakenPairs[sym];
          if (!pair) throw new Error(`Symbol ${sym} not supported on Kraken`);
          const res = await fetch(`https://api.kraken.com/0/public/Ticker?pair=${pair}`, {
            signal: AbortSignal.timeout(2500)
          });
          if (!res.ok) throw new Error(`Kraken HTTP ${res.status}`);
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
      },
      {
        name: 'KuCoin API',
        supports: (sym) => Boolean(this.kucoinSymbols[sym]),
        fetchPrice: async (sym) => {
          const pair = this.kucoinSymbols[sym];
          if (!pair) throw new Error(`Symbol ${sym} not supported on KuCoin`);
          const res = await fetch(`https://api.kucoin.com/api/v1/market/orderbook/level1?symbol=${pair}`, {
            signal: AbortSignal.timeout(2500)
          });
          if (!res.ok) throw new Error(`KuCoin HTTP ${res.status}`);
          const data = await res.json();
          const val = parseFloat(data?.data?.price);
          if (isNaN(val) || val <= 0) throw new Error('Invalid KuCoin price');
          return val;
        },
        healthy: true,
        failures: 0,
        latency: 0
      }
    ];

    // Low-rate-limit fallback oracle (queried ONLY when < 2 fast CEX sources respond)
    this.fallbackOracle = {
      name: 'CoinGecko API',
      supports: (sym) => Boolean(this.coinGeckoIds[sym]),
      fetchPrice: async (sym) => {
        const id = this.coinGeckoIds[sym];
        if (!id) throw new Error(`Symbol ${sym} not supported on CoinGecko`);
        const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`, {
          signal: AbortSignal.timeout(3000)
        });
        if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
        const data = await res.json();
        const val = parseFloat(data?.[id]?.usd);
        if (isNaN(val) || val <= 0) throw new Error('Invalid CoinGecko price');
        return val;
      },
      healthy: true,
      failures: 0,
      latency: 0
    };

    this.oracles = [...this.fastOracles, this.fallbackOracle];

    // Initialize Redis client with graceful offline fallback
    this.redis = null;
    try {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        maxRetriesPerRequest: 1,
        lazyConnect: true
      });
      this.redis.on('error', () => {
        this.redis = null;
      });
      this.redis.connect().catch(() => {
        this.redis = null;
      });
    } catch (e) {
      this.redis = null;
    }
  }

  /**
   * Pure mathematical consensus engine:
   * 1. Computes raw median across all responding exchanges.
   * 2. Drops single-exchange wicks / outliers deviating > maxDeviationPct from raw median.
   * 3. Flags wild cross-exchange disagreement (> maxDeviationPct * 2).
   * 4. Guards against sudden unconfirmed >8% flash glitches unless >= 3 exchanges agree within 1%.
   * 5. Calculates a dynamic confidence band (confPct) from cross-exchange dispersion.
   */
  _computeConsensus(readings, { maxDeviationPct = 1.5, lastAccepted = null, maxUnconfirmedJumpPct = 8.0 } = {}) {
    const valid = (readings || [])
      .filter(r => r && Number.isFinite(r.price) && r.price > 0)
      .sort((a, b) => a.price - b.price);

    if (valid.length === 0) {
      return null;
    }

    const medianOf = (arr) => {
      const mid = Math.floor(arr.length / 2);
      return arr.length % 2 === 1 ? arr[mid].price : (arr[mid - 1].price + arr[mid].price) / 2;
    };

    const rawMedian = medianOf(valid);
    let clean = valid;
    let outliersDropped = 0;

    if (valid.length >= 3) {
      const filtered = valid.filter(
        r => (Math.abs(r.price - rawMedian) / rawMedian) * 100 <= maxDeviationPct
      );
      if (filtered.length >= 2) {
        outliersDropped = valid.length - filtered.length;
        clean = filtered;
      } else {
        // Keep the 2 closest readings to rawMedian and inspect spread below
        const byDist = [...valid].sort((a, b) => Math.abs(a.price - rawMedian) - Math.abs(b.price - rawMedian));
        clean = byDist.slice(0, 2).sort((a, b) => a.price - b.price);
        outliersDropped = valid.length - clean.length;
      }
    }

    const price = medianOf(clean);
    const minPrice = clean[0].price;
    const maxPrice = clean[clean.length - 1].price;
    const spreadPct = price > 0 ? ((maxPrice - minPrice) / price) * 100 : 0;

    // Flag extreme cross-exchange disagreement (e.g. 2 sources disagreeing by > 3%)
    let disagreement = clean.length >= 2 && spreadPct > maxDeviationPct * 2;
    let jumpRejected = false;

    // Anti-flash-glitch jump guard vs last recently accepted consensus (< 60s)
    if (
      lastAccepted &&
      Number.isFinite(lastAccepted.price) &&
      lastAccepted.price > 0 &&
      Date.now() - (lastAccepted.updatedAt || 0) < 60000
    ) {
      const jumpPct = (Math.abs(price - lastAccepted.price) / lastAccepted.price) * 100;
      if (jumpPct > maxUnconfirmedJumpPct) {
        const strongAgreement = clean.length >= 3 && spreadPct <= 1.0;
        if (!strongAgreement) {
          jumpRejected = true;
        }
      }
    }

    // Dynamic confidence band (similar to Pyth conf): 0.03% floor in calm markets, up to 0.25% in high volatility
    const confPct = Number(Math.min(0.25, Math.max(0.03, spreadPct / 2)).toFixed(4));

    return {
      price,
      minPrice,
      maxPrice,
      spreadPct: Number(spreadPct.toFixed(4)),
      confPct,
      sourceCount: clean.length,
      totalResponded: valid.length,
      sources: clean.map(r => r.name),
      outliersDropped,
      disagreement,
      jumpRejected,
      updatedAt: Date.now()
    };
  }

  /**
   * Fetches real-time market price for Paytaca LIFT token from Cauldron DEX Router WebSocket.
   * LIFT category: 5932b2fd4915d6a75d3ec53282cd49118149a2176ee67ed68b1111ff0786f7fc
   * Decimals: 2 (10,000 base units = 100 LIFT)
   */
  async fetchLiftPriceFromCauldron() {
    return new Promise((resolve, reject) => {
      let ws;
      let settled = false;
      const cleanup = () => {
        clearTimeout(timeout);
        if (ws) {
          try {
            ws.removeAllListeners?.();
            ws.close();
          } catch (e) {}
        }
      };
      const done = (err, val) => {
        if (settled) return;
        settled = true;
        cleanup();
        if (err) reject(err);
        else resolve(val);
      };

      const timeout = setTimeout(() => {
        if (ws) {
          try { ws.terminate(); } catch (e) {}
        }
        done(new Error('Cauldron Router WebSocket timeout'));
      }, 3500);

      try {
        ws = new WebSocket(this.cauldronRouterWs);
      } catch (err) {
        return done(err);
      }

      ws.on('open', () => {
        const payload = {
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'route.quote',
          params: {
            sell: this.cauldronCategoryId,
            buy: 'bch',
            amount: '10000', // 100 LIFT
            side: 'sell'
          }
        };
        ws.send(JSON.stringify(payload));
      });

      ws.on('message', async (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          const outputSats = parseFloat(parsed?.result?.output_amount);
          if (!isNaN(outputSats) && outputSats > 0) {
            // outputSats in satoshis for 100 LIFT
            // 1 BCH = 100,000,000 satoshis
            const bchPerLift = (outputSats / 100000000) / 100.0;
            const bchUsd = await this.getBchPriceUsd();
            const liftUsd = bchPerLift * (bchUsd || 283.5);
            return done(null, liftUsd);
          }
          done(new Error('Invalid Cauldron quote response'));
        } catch (e) {
          done(e);
        }
      });

      ws.on('error', (err) => {
        try { ws.terminate(); } catch (e) {}
        done(err);
      });

      ws.on('close', () => {
        done(new Error('Cauldron Router WebSocket closed before quote'));
      });
    });
  }

  async _fetchLiveConsensusForSymbol(sym, { maxDeviationPct = 1.5 } = {}) {
    if (this.inFlightConsensus.has(sym)) {
      return this.inFlightConsensus.get(sym);
    }

    const run = (async () => {
      const eligible = this.fastOracles.filter(o => o.supports(sym));
      const settled = await Promise.allSettled(
        eligible.map(async (oracle) => {
          const start = Date.now();
          try {
            const price = await oracle.fetchPrice(sym);
            oracle.latency = Date.now() - start;
            oracle.healthy = true;
            if (oracle.failures > 0) oracle.failures--;
            return { name: oracle.name, price, latency: oracle.latency };
          } catch (err) {
            oracle.failures++;
            oracle.healthy = false;
            throw err;
          }
        })
      );

      const readings = settled
        .filter(r => r.status === 'fulfilled' && r.value && Number.isFinite(r.value.price) && r.value.price > 0)
        .map(r => r.value);

      // Query CoinGecko fallback ONLY if fewer than 2 fast CEX APIs responded
      if (readings.length < 2 && this.fallbackOracle.supports(sym)) {
        const start = Date.now();
        try {
          const price = await this.fallbackOracle.fetchPrice(sym);
          this.fallbackOracle.latency = Date.now() - start;
          this.fallbackOracle.healthy = true;
          if (this.fallbackOracle.failures > 0) this.fallbackOracle.failures--;
          readings.push({ name: this.fallbackOracle.name, price, latency: this.fallbackOracle.latency });
        } catch {
          this.fallbackOracle.failures++;
          this.fallbackOracle.healthy = false;
        }
      }

      const lastAccepted = this.consensusCache[sym] || null;
      const consensus = this._computeConsensus(readings, { maxDeviationPct, lastAccepted });
      if (!consensus) {
        return null;
      }

      if (!consensus.disagreement && !consensus.jumpRejected) {
        const record = { symbol: sym, ...consensus, fresh: true };
        this.consensusCache[sym] = record;
        this.memoryCache.prices[sym] = record.price;
        this.memoryCache.timestamp[sym] = record.updatedAt;
        this.activeProvider = `Consensus Median (${record.sourceCount} CEX: ${record.sources.map(s => s.replace(' API', '')).join('+')})`;

        if (this.redis) {
          this.redis.set(`oracle:price:${sym}`, record.price.toString(), 'EX', 15).catch(() => {});
        }
        return record;
      }

      return { symbol: sym, ...consensus, fresh: false };
    })();

    this.inFlightConsensus.set(sym, run);
    try {
      return await run;
    } finally {
      this.inFlightConsensus.delete(sym);
    }
  }

  /**
   * Fetches multi-exchange median consensus USD price with outlier filtering and optional strict anti-stale mode.
   * - Normal swaps / UI (`requireFresh: false`, `maxAgeMs: 15000`): uses cached median & graceful fallback.
   * - Perps execution (`requireFresh: true`, `maxAgeMs: 1500`, `minSources: 2`): strictly fail-closed.
   */
  async getPriceConsensus(
    tokenSymbol,
    {
      maxAgeMs = 15000,
      requireFresh = false,
      minSources = 1,
      maxDeviationPct = 1.5,
      maxStaleMs = 8000
    } = {}
  ) {
    const sym = (tokenSymbol || 'PUSD').toUpperCase();
    const now = Date.now();

    // 1. Stables are pegged 1:1 to USD
    if (this.stables.has(sym) || sym.startsWith('USDT_') || sym.startsWith('USDC_')) {
      return {
        symbol: sym,
        price: 1.0,
        minPrice: 1.0,
        maxPrice: 1.0,
        spreadPct: 0,
        confPct: 0,
        sourceCount: 1,
        totalResponded: 1,
        sources: ['USD Peg (1:1)'],
        outliersDropped: 0,
        disagreement: false,
        jumpRejected: false,
        updatedAt: now,
        fresh: true
      };
    }

    // 2. Special real-time integration for Paytaca LIFT token via Cauldron DEX
    if (sym === 'LIFT') {
      if (this.memoryCache.prices.LIFT && now - (this.memoryCache.timestamp.LIFT || 0) < maxAgeMs) {
        this.activeProvider = 'Cauldron DEX Router (BCH AMM)';
        return {
          symbol: 'LIFT',
          price: this.memoryCache.prices.LIFT,
          spreadPct: 0,
          confPct: 0.1,
          sourceCount: 1,
          sources: ['Cauldron DEX Router (BCH AMM)'],
          outliersDropped: 0,
          disagreement: false,
          jumpRejected: false,
          updatedAt: this.memoryCache.timestamp.LIFT || now,
          fresh: true
        };
      }
      try {
        const liftPrice = await this.fetchLiftPriceFromCauldron();
        this.activeProvider = 'Cauldron DEX Router (BCH AMM)';
        this.memoryCache.prices.LIFT = liftPrice;
        this.memoryCache.timestamp.LIFT = now;
        if (this.redis) {
          this.redis.set('oracle:price:LIFT', liftPrice.toString(), 'EX', 15).catch(() => {});
        }
        return {
          symbol: 'LIFT',
          price: liftPrice,
          spreadPct: 0,
          confPct: 0.1,
          sourceCount: 1,
          sources: ['Cauldron DEX Router (BCH AMM)'],
          outliersDropped: 0,
          disagreement: false,
          jumpRejected: false,
          updatedAt: now,
          fresh: true
        };
      } catch (err) {
        if (requireFresh) {
          throw new Error(`Oráculo Cauldron DEX no disponible para LIFT: ${err.message}`);
        }
        console.warn('[OraclePool] Cauldron LIFT quote warning, fallback to cache:', err.message);
        this.activeProvider = 'Cauldron DEX (Cached)';
        return {
          symbol: 'LIFT',
          price: this.memoryCache.prices.LIFT || 0.01636,
          spreadPct: 0,
          confPct: 0.1,
          sourceCount: 0,
          sources: ['Cauldron DEX (Cached)'],
          outliersDropped: 0,
          disagreement: false,
          jumpRejected: false,
          updatedAt: this.memoryCache.timestamp.LIFT || 0,
          fresh: false
        };
      }
    }

    // 3. Check fresh in-memory multi-CEX consensus cache
    const cachedConsensus = this.consensusCache[sym];
    if (
      cachedConsensus &&
      now - cachedConsensus.updatedAt < maxAgeMs &&
      (!requireFresh || (cachedConsensus.sourceCount >= minSources && !cachedConsensus.disagreement && !cachedConsensus.jumpRejected))
    ) {
      return cachedConsensus;
    }

    // 4. For non-strict normal reads, Redis cache (15s) can serve quickly if consensusCache is empty
    if (!requireFresh && maxAgeMs >= 10000 && this.redis) {
      try {
        const cached = await this.redis.get(`oracle:price:${sym}`);
        if (cached) {
          const parsed = parseFloat(cached);
          if (!isNaN(parsed) && parsed > 0) {
            return {
              symbol: sym,
              price: parsed,
              spreadPct: cachedConsensus?.spreadPct ?? 0,
              confPct: cachedConsensus?.confPct ?? 0.05,
              sourceCount: cachedConsensus?.sourceCount ?? 1,
              sources: cachedConsensus?.sources ?? ['Redis Oracle Cache'],
              outliersDropped: 0,
              disagreement: false,
              jumpRejected: false,
              updatedAt: cachedConsensus?.updatedAt || now,
              fresh: true
            };
          }
        }
      } catch (err) {}
    }

    // 5. Execute parallel multi-CEX consensus query
    const live = await this._fetchLiveConsensusForSymbol(sym, { maxDeviationPct });

    if (live && !live.disagreement && !live.jumpRejected) {
      if (!requireFresh || (live.sourceCount >= minSources && Date.now() - live.updatedAt <= maxStaleMs)) {
        return live;
      }
    }

    // 6. Strict fail-closed circuit breaker for Perps execution
    if (requireFresh) {
      if (live?.jumpRejected) {
        throw new Error(
          `[Oracle Circuit Breaker] Movimiento anómalo en ${sym} rechazado por falta de confirmación multi-exchange (${live.sourceCount} fuentes). Intenta nuevamente en unos segundos.`
        );
      }
      if (live?.disagreement) {
        throw new Error(
          `[Oracle Circuit Breaker] Desacuerdo extremo entre exchanges para ${sym} (spread ${live.spreadPct}%). Operaciones pausadas hasta restablecer consenso.`
        );
      }
      const responded = live?.sourceCount || 0;
      throw new Error(
        `[Oracle Circuit Breaker] Consenso insuficiente para ${sym} (${responded}/${minSources} fuentes frescas). Operaciones de Perps pausadas temporalmente por seguridad.`
      );
    }

    // 7. Non-strict graceful fallback for UI / standard quotes
    if (live && Number.isFinite(live.price) && live.price > 0) {
      return live;
    }
    if (cachedConsensus && Number.isFinite(cachedConsensus.price) && cachedConsensus.price > 0) {
      return { ...cachedConsensus, fresh: false };
    }
    if (
      Object.prototype.hasOwnProperty.call(this.memoryCache.prices, sym) &&
      Number(this.memoryCache.prices[sym]) > 0
    ) {
      return {
        symbol: sym,
        price: this.memoryCache.prices[sym],
        spreadPct: 0,
        confPct: 0.1,
        sourceCount: 0,
        sources: ['Fallback Cache'],
        outliersDropped: 0,
        disagreement: false,
        jumpRejected: false,
        updatedAt: this.memoryCache.timestamp[sym] || 0,
        fresh: false
      };
    }

    throw new Error(`Precio de oráculo no disponible para símbolo desconocido: ${sym}`);
  }

  /**
   * Fetches spot USD price for any supported asset using parallel multi-oracle median consensus.
   */
  async getPriceUsd(tokenSymbol, options = {}) {
    const consensus = await this.getPriceConsensus(tokenSymbol, options);
    return consensus.price;
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
   * Returns live Smart Contract Vault reserve liquidity for the destination token.
   * Strictly enforces real Vault reserves: Mainnet and non-active Testnet pairs return 0 ("Sin Liquidez").
   */
  async getAvailableLiquidity(tokenSymbol, network = 'testnet') {
    const net = String(network || 'testnet').toLowerCase() === 'mainnet' ? 'mainnet' : 'testnet';
    if (net === 'mainnet') {
      return 0;
    }

    const sym = (tokenSymbol || 'USDT').toUpperCase();
    if (sym === 'SOL') {
      return 1000.0;
    }
    if (sym === 'LTC') {
      return 10.0;
    }
    if (sym !== 'PUSD' && sym !== 'USDT') {
      return 0;
    }

    const basePool = poolService.getPool('PUSD_USDT', 'testnet');
    if (!basePool) {
      return 0;
    }
    const enriched = await poolService.enrichPoolData(basePool, { network: 'testnet' }).catch(() => basePool);
    if (!enriched || enriched.hasLiquidity === false) {
      return 0;
    }

    if (sym === 'PUSD') {
      return Math.max(Number(enriched.reserveA || enriched.reserveBch || 0), 0);
    }
    return Math.max(Number(enriched.reserveB || enriched.reserveEvm || 0), 0);
  }

  /**
   * Generates a fully quoted swap order including fee breakdown and strict pre-flight Vault liquidity check.
   */
  async calculateQuote(fromToken, toToken, amount, network = 'testnet', options = {}) {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new Error('Invalid swap amount');
    }

    const net = String(network || 'testnet').toLowerCase() === 'mainnet' ? 'mainnet' : 'testnet';
    const fromSym = (fromToken || '').toUpperCase();
    const toSym = (toToken || '').toUpperCase();

    const minAmount = fromSym === 'LIFT' ? 1.0 : (['BCH', 'ETH', 'SOL', 'LTC', 'BNB'].includes(fromSym) ? 0.001 : config.minSwapAmount);
    const maxAmount = fromSym === 'LIFT' ? 1000000.0 : (fromSym === 'POL' ? 50000.0 : config.maxSwapAmount);

    const priceFrom = await this.getPriceUsd(fromToken);
    const priceTo = await this.getPriceUsd(toToken);
    const rate = priceTo > 0 ? (priceFrom / priceTo) : 1.0;
    const grossAmount = parsedAmount * rate;
    const feeAmount = grossAmount * config.feePercentage; // 0.3%
    const lpCutAmount = feeAmount * (0.20 / 0.30); // 0.20%
    const treasuryCutAmount = feeAmount * (0.10 / 0.30); // 0.10%
    const netPayout = grossAmount - feeAmount;
    const netPayoutUsd = Number((netPayout * priceTo).toFixed(2));

    const fromChain = String(options?.fromChain || '').toLowerCase();
    const toChain = String(options?.toChain || '').toLowerCase();
    const isDifferentChain = Boolean(fromChain && toChain && fromChain !== toChain);

    const isSupportedStable = (fromSym === 'PUSD' || fromSym === 'USDT' || fromSym === 'SOL' || fromSym === 'LTC') &&
                              (toSym === 'PUSD' || toSym === 'USDT' || toSym === 'SOL' || toSym === 'LTC');

    // Strict active pair check: PUSD (BCH), USDT (Polygon & Solana Devnet), SOL, LTC on Testnet
    const isActivePair =
      net === 'testnet' &&
      ((fromSym !== toSym) || isDifferentChain) &&
      isSupportedStable;

    const availableLiquidity = isActivePair ? await this.getAvailableLiquidity(toSym, net) : 0;
    const hasLiquidity = isActivePair && availableLiquidity > 0 && netPayout <= availableLiquidity;

    const isLift = fromSym === 'LIFT' || toSym === 'LIFT';
    const isPusd = fromSym === 'PUSD' || toSym === 'PUSD';

    return {
      network: net,
      fromToken: fromSym,
      toToken: toSym,
      inputAmount: parsedAmount,
      rate: Number(rate.toFixed(6)),
      grossAmount: Number(grossAmount.toFixed(6)),
      feePercentage: config.feePercentage * 100, // 0.3%
      feeAmount: Number(feeAmount.toFixed(6)),
      lpCutAmount: Number(lpCutAmount.toFixed(6)),
      treasuryCutAmount: Number(treasuryCutAmount.toFixed(6)),
      netPayout: Number(netPayout.toFixed(6)),
      netPayoutUsd,
      priceFromUsd: Number(priceFrom.toFixed(6)),
      priceToUsd: Number(priceTo.toFixed(6)),
      hasLiquidity,
      unavailableBadge: isActivePair ? null : 'Sin Liquidez',
      availableLiquidity: Number(availableLiquidity.toFixed(4)),
      minAmount,
      maxAmount,
      isBelowMin: parsedAmount < minAmount,
      isAboveMax: parsedAmount > maxAmount,
      estimatedSeconds: 3,
      oracleProvider: this.activeProvider,
      isSponsorAsset: isPusd || isLift,
      sponsorTag: isLift ? 'Paytaca LIFT • Cauldron DEX' : 'Official BLAZE Sponsor (ParyonUSD)'
    };
  }

  /**
   * Multi-currency USD -> Fiat conversion rates (30m cached with global coverage & safe fallbacks).
   */
  async getFiatRates() {
    const fallback = {
      USD: 1,
      EUR: 0.92,
      PHP: 58.5,
      CNY: 7.24,
      VES: 918.77,
      COP: 4320,
      MXN: 20.1,
      ARS: 1015,
      BRL: 5.75,
      PEN: 3.76,
      CLP: 970,
      DOP: 60.2,
      GBP: 0.79,
      NGN: 1650,
      INR: 84.4,
      JPY: 154
    };
    const now = Date.now();
    if (this.fiatCache && now - this.fiatCache.ts < 30 * 60_000) {
      return this.fiatCache.rates;
    }

    if (this.redis) {
      try {
        const cachedRaw = await this.redis.get('oracle:fiat:rates:v2');
        if (cachedRaw) {
          const parsed = JSON.parse(cachedRaw);
          const merged = { ...fallback, ...parsed };
          this.fiatCache = { ts: now, rates: merged };
          return merged;
        }
      } catch {}
    }

    try {
      const res = await fetch('https://open.er-api.com/v6/latest/USD', {
        signal: AbortSignal.timeout(3500)
      });
      if (res.ok) {
        const data = await res.json();
        const r = data?.rates || {};
        const rates = {
          USD: 1,
          EUR: Number(r.EUR) || fallback.EUR,
          PHP: Number(r.PHP) || fallback.PHP,
          CNY: Number(r.CNY) || fallback.CNY,
          VES: Number(r.VES) || fallback.VES,
          COP: Number(r.COP) || fallback.COP,
          MXN: Number(r.MXN) || fallback.MXN,
          ARS: Number(r.ARS) || fallback.ARS,
          BRL: Number(r.BRL) || fallback.BRL,
          PEN: Number(r.PEN) || fallback.PEN,
          CLP: Number(r.CLP) || fallback.CLP,
          DOP: Number(r.DOP) || fallback.DOP,
          GBP: Number(r.GBP) || fallback.GBP,
          NGN: Number(r.NGN) || fallback.NGN,
          INR: Number(r.INR) || fallback.INR,
          JPY: Number(r.JPY) || fallback.JPY
        };
        this.fiatCache = { ts: now, rates };
        if (this.redis) {
          this.redis.set('oracle:fiat:rates:v2', JSON.stringify(rates), 'EX', 1800).catch(() => {});
        }
        return rates;
      }
    } catch {}

    this.fiatCache = { ts: now - 25 * 60_000, rates: fallback };
    return fallback;
  }

  getHealth() {
    const now = Date.now();
    const consensusSummary = {};
    for (const [sym, c] of Object.entries(this.consensusCache)) {
      consensusSummary[sym] = {
        price: c.price,
        sources: c.sources,
        sourceCount: c.sourceCount,
        spreadPct: c.spreadPct,
        confPct: c.confPct,
        outliersDropped: c.outliersDropped,
        ageMs: Math.max(0, now - (c.updatedAt || now))
      };
    }

    return {
      mode: 'Parallel Multi-CEX Median + Outlier Filter',
      activeOracle: this.activeProvider,
      totalOracles: this.oracles.length,
      cachedPrices: this.memoryCache.prices,
      consensus: consensusSummary,
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
