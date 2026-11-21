import { db } from './db.js';
import { bchService } from './bchService.js';
import { evmService } from './evmService.js';
import { solanaService } from './solanaService.js';
import { ltcService } from './ltcService.js';
import { tonService } from './tonService.js';

/**
 * High-traffic balance & portfolio cache backed by bounded L1 memory + L2 Redis,
 * with single-flight request coalescing, short negative/degraded cooldowns,
 * manual refresh flood protection, and stale-while-rpc-degraded fallback.
 */
class BalanceCacheManager {
  constructor() {
    this.l1Cache = new Map();
    this.staleCache = new Map();
    this.inFlight = new Map();
    this.lastManualFreshAt = new Map();

    this.maxL1Entries = 2000;
    this.chainTtlMs = 20_000;
    this.portfolioTtlMs = 15_000;
    this.degradedCooldownMs = 3_000;
    this.staleFallbackTtlMs = 5 * 60_000;
    this.manualFreshCooldownMs = 2_500;
    this.chainTimeoutMs = 5_500;
    this.redisTimeoutMs = 400;
  }

  _setBounded(map, key, entry) {
    if (map.has(key)) map.delete(key);
    map.set(key, entry);
    if (map.size > this.maxL1Entries) {
      const oldestKey = map.keys().next().value;
      if (oldestKey !== undefined) map.delete(oldestKey);
    }
  }

  async _redisGetJson(key) {
    if (!db.redisReady || !db.redis) return null;
    try {
      const raw = await Promise.race([
        db.redis.get(key),
        new Promise(resolve => setTimeout(() => resolve(null), this.redisTimeoutMs))
      ]);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  _redisSetJson(key, value, ttlMs) {
    if (!db.redisReady || !db.redis) return;
    const ttlSec = Math.max(1, Math.ceil(ttlMs / 1000));
    try {
      db.redis.set(key, JSON.stringify(value), 'EX', ttlSec).catch(() => {});
    } catch {
      // Non-fatal: L1 memory cache remains authoritative for this instance
    }
  }

  async _withTimeout(promise, ms, label) {
    let timer;
    try {
      return await Promise.race([
        promise,
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error(`${label} timeout (> ${ms}ms)`)), ms);
        })
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  _normalizeChainAddress(chain, rawAddress) {
    const clean = String(rawAddress || '').trim();
    if (!clean) return '';
    return chain === 'sol' || chain === 'ton' ? clean : clean.toLowerCase();
  }

  /**
   * Resolves a single chain balance through L1 memory -> L2 Redis -> single-flight RPC.
   */
  async resolveChainBalance({ chain, address, isTestnet, fetcher, emptyValue, fresh = false }) {
    if (!address) return emptyValue;

    const net = isTestnet ? 'testnet' : 'mainnet';
    const normAddr = this._normalizeChainAddress(chain, address);
    const cacheKey = `bal:v1:${chain}:${net}:${normAddr}`;
    const staleKey = `bal_stale:v1:${chain}:${net}:${normAddr}`;
    const now = Date.now();

    // Prevent manual `?fresh=1` loops from flooding upstream public RPC nodes
    let allowBypass = Boolean(fresh);
    if (allowBypass) {
      const lastFresh = this.lastManualFreshAt.get(cacheKey) || 0;
      if (now - lastFresh < this.manualFreshCooldownMs) {
        allowBypass = false;
      } else {
        this.lastManualFreshAt.set(cacheKey, now);
        if (this.lastManualFreshAt.size > this.maxL1Entries) {
          const oldest = this.lastManualFreshAt.keys().next().value;
          if (oldest !== undefined) this.lastManualFreshAt.delete(oldest);
        }
      }
    }

    if (!allowBypass) {
      const l1 = this.l1Cache.get(cacheKey);
      if (l1 && now < l1.expiresAt) {
        return l1.data;
      }

      const l2 = await this._redisGetJson(cacheKey);
      if (l2 && typeof l2 === 'object' && l2.data && now < Number(l2.expiresAt || 0)) {
        this._setBounded(this.l1Cache, cacheKey, { data: l2.data, expiresAt: Number(l2.expiresAt) });
        return l2.data;
      }
    }

    if (this.inFlight.has(cacheKey)) {
      return this.inFlight.get(cacheKey);
    }

    const job = (async () => {
      try {
        const result = await this._withTimeout(
          fetcher(),
          this.chainTimeoutMs,
          `${chain.toUpperCase()} balance RPC`
        );
        const isDegraded = Boolean(
          !result ||
            result.electrumError ||
            result.rpcDegraded ||
            result.networkMismatch ||
            result.invalid
        );

        const doneAt = Date.now();
        if (!isDegraded) {
          const expiresAt = doneAt + this.chainTtlMs;
          this._setBounded(this.l1Cache, cacheKey, { data: result, expiresAt });
          this._setBounded(this.staleCache, staleKey, { data: result, savedAt: doneAt });
          this._redisSetJson(cacheKey, { data: result, expiresAt }, this.chainTtlMs);
          this._redisSetJson(staleKey, { data: result, savedAt: doneAt }, this.staleFallbackTtlMs);
          return result;
        }

        // If upstream RPC returned degraded status, fall back to a recent healthy snapshot when valid
        if (result?.electrumError || result?.rpcDegraded) {
          const staleL1 = this.staleCache.get(staleKey);
          const staleEntry =
            staleL1 && doneAt - staleL1.savedAt <= this.staleFallbackTtlMs
              ? staleL1
              : await this._redisGetJson(staleKey);

          if (staleEntry?.data && doneAt - Number(staleEntry.savedAt || 0) <= this.staleFallbackTtlMs) {
            const rescued = { ...staleEntry.data, rpcDegraded: true, stale: true };
            this._setBounded(this.l1Cache, cacheKey, {
              data: rescued,
              expiresAt: doneAt + this.degradedCooldownMs
            });
            return rescued;
          }
        }

        const shortExpires = doneAt + this.degradedCooldownMs;
        this._setBounded(this.l1Cache, cacheKey, { data: result || emptyValue, expiresAt: shortExpires });
        return result || emptyValue;
      } catch (err) {
        const doneAt = Date.now();
        const staleL1 = this.staleCache.get(staleKey);
        const staleEntry =
          staleL1 && doneAt - staleL1.savedAt <= this.staleFallbackTtlMs
            ? staleL1
            : await this._redisGetJson(staleKey);

        if (staleEntry?.data && doneAt - Number(staleEntry.savedAt || 0) <= this.staleFallbackTtlMs) {
          const rescued = { ...staleEntry.data, rpcDegraded: true, stale: true };
          this._setBounded(this.l1Cache, cacheKey, {
            data: rescued,
            expiresAt: doneAt + this.degradedCooldownMs
          });
          return rescued;
        }

        const fallback = { ...emptyValue, rpcDegraded: true, error: err?.message || 'RPC unavailable' };
        this._setBounded(this.l1Cache, cacheKey, {
          data: fallback,
          expiresAt: doneAt + this.degradedCooldownMs
        });
        return fallback;
      } finally {
        this.inFlight.delete(cacheKey);
      }
    })();

    this.inFlight.set(cacheKey, job);
    return job;
  }

  /**
   * Fetches all requested chains in parallel with shared L1/Redis per-chain caching.
   */
  async getMultiChainBalances(resolved, isTestnet, { fresh = false, chains = ['bch', 'evm', 'sol', 'ltc', 'ton'] } = {}) {
    const chainSpecs = {
      bch: {
        address: resolved.targetBch,
        empty: { BCH: 0, PUSD: 0 },
        fetch: () => bchService.getAddressBalances(resolved.targetBch, isTestnet)
      },
      evm: {
        address: resolved.targetEvm,
        empty: { POL: 0, USDT: 0, USDC: 0, BNB: 0, USDT_BSC: 0 },
        fetch: () => evmService.getAddressBalances(resolved.targetEvm, isTestnet)
      },
      sol: {
        address: resolved.targetSol,
        empty: { SOL: 0, USDT: 0, USDC: 0 },
        fetch: () => solanaService.getAddressBalances(resolved.targetSol, isTestnet)
      },
      ltc: {
        address: resolved.targetLtc,
        empty: { ltc: 0, litoshis: 0 },
        fetch: () => ltcService.getBalance(resolved.targetLtc, isTestnet)
      },
      ton: {
        address: resolved.targetTon,
        empty: { TON: 0, USDT: 0 },
        fetch: () => tonService.getAddressBalances(resolved.targetTon, isTestnet)
      }
    };

    const selected = chains.filter(c => Boolean(chainSpecs[c]));
    const settled = await Promise.all(
      selected.map(chain => {
        const spec = chainSpecs[chain];
        return this.resolveChainBalance({
          chain,
          address: spec.address,
          isTestnet,
          fetcher: spec.fetch,
          emptyValue: spec.empty,
          fresh
        });
      })
    );

    const out = {};
    selected.forEach((chain, idx) => {
      out[chain] = settled[idx];
    });
    return out;
  }

  buildPortfolioKey(resolved, isTestnet) {
    const net = isTestnet ? 'testnet' : 'mainnet';
    const parts = [
      this._normalizeChainAddress('bch', resolved.targetBch),
      this._normalizeChainAddress('evm', resolved.targetEvm),
      this._normalizeChainAddress('sol', resolved.targetSol),
      this._normalizeChainAddress('ltc', resolved.targetLtc),
      this._normalizeChainAddress('ton', resolved.targetTon)
    ];
    return `portfolio:v1:${net}:${parts.join('|')}`;
  }

  /**
   * Caches and coalesces full `/api/portfolio/:address` payloads across concurrent requests.
   */
  async getOrComputePortfolio(cacheKey, computeFn, { fresh = false } = {}) {
    const now = Date.now();
    let allowBypass = Boolean(fresh);
    if (allowBypass) {
      const lastFresh = this.lastManualFreshAt.get(cacheKey) || 0;
      if (now - lastFresh < this.manualFreshCooldownMs) {
        allowBypass = false;
      } else {
        this.lastManualFreshAt.set(cacheKey, now);
      }
    }

    if (!allowBypass) {
      const l1 = this.l1Cache.get(cacheKey);
      if (l1 && now < l1.expiresAt) {
        return { ...l1.data, cached: true, cacheAgeMs: Math.max(0, now - (l1.savedAt || now)) };
      }

      const l2 = await this._redisGetJson(cacheKey);
      if (l2 && l2.data && now < Number(l2.expiresAt || 0)) {
        this._setBounded(this.l1Cache, cacheKey, {
          data: l2.data,
          expiresAt: Number(l2.expiresAt),
          savedAt: Number(l2.savedAt || now)
        });
        return {
          ...l2.data,
          cached: true,
          cacheAgeMs: Math.max(0, now - Number(l2.savedAt || now))
        };
      }
    }

    if (this.inFlight.has(cacheKey)) {
      return this.inFlight.get(cacheKey);
    }

    const job = (async () => {
      try {
        const payload = await computeFn();
        const doneAt = Date.now();
        const anyChainDegraded = Boolean(
          payload?.degradedChains &&
            Object.values(payload.degradedChains).some(Boolean)
        );
        const ttl = anyChainDegraded ? this.degradedCooldownMs : this.portfolioTtlMs;
        const expiresAt = doneAt + ttl;

        this._setBounded(this.l1Cache, cacheKey, { data: payload, expiresAt, savedAt: doneAt });
        this._redisSetJson(cacheKey, { data: payload, expiresAt, savedAt: doneAt }, ttl);

        if (!anyChainDegraded) {
          this._setBounded(this.staleCache, `${cacheKey}:stale`, { data: payload, savedAt: doneAt });
        }

        return { ...payload, cached: false, cacheAgeMs: 0 };
      } catch (err) {
        const staleEntry = this.staleCache.get(`${cacheKey}:stale`);
        const doneAt = Date.now();
        if (staleEntry && doneAt - staleEntry.savedAt <= this.staleFallbackTtlMs) {
          return {
            ...staleEntry.data,
            cached: true,
            stale: true,
            cacheAgeMs: doneAt - staleEntry.savedAt
          };
        }
        throw err;
      } finally {
        this.inFlight.delete(cacheKey);
      }
    })();

    this.inFlight.set(cacheKey, job);
    return job;
  }
}

export const balanceCache = new BalanceCacheManager();
