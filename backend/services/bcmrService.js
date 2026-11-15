import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import net from 'net';
import dns from 'dns';
import { fileURLToPath } from 'url';
import { decodeTransaction, binToHex, hexToBin } from '@bitauth/libauth';
import { config } from '../config.js';
import { bchService } from './bchService.js';

const MAX_BCMR_RESPONSE_BYTES = 2 * 1024 * 1024; // 2 MB cap

export function isPrivateOrReservedIp(ipStr) {
  const clean = String(ipStr || '').trim().toLowerCase().replace(/^\[|\]$/g, '');
  if (!clean) return true;
  if (clean === 'localhost' || clean.endsWith('.local') || clean.endsWith('.internal')) return true;

  // Handle IPv4-mapped IPv6 addresses like ::ffff:127.0.0.1 or ::ffff:169.254.169.254
  const v4Mapped = clean.startsWith('::ffff:') ? clean.slice(7) : clean;
  const ipVersion = net.isIP(v4Mapped);

  if (ipVersion === 4) {
    const parts = v4Mapped.split('.').map(Number);
    if (parts.length !== 4 || parts.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return true;
    const [a, b] = parts;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true; // AWS/Cloud link-local metadata 169.254.169.254
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a >= 224) return true; // Multicast / Reserved
    return false;
  }

  if (ipVersion === 6) {
    if (
      clean === '::' ||
      clean === '::1' ||
      clean.startsWith('fe80:') ||
      clean.startsWith('fc') ||
      clean.startsWith('fd') ||
      clean.startsWith('ff')
    ) {
      return true;
    }
    return false;
  }

  return false;
}

export async function validateSafePublicUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(String(rawUrl || '').trim());
  } catch {
    return { safe: false, reason: 'Invalid URL syntax' };
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { safe: false, reason: 'Unsupported URL protocol' };
  }
  if (parsed.username || parsed.password) {
    return { safe: false, reason: 'Credentials in URL are forbidden' };
  }

  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!host || isPrivateOrReservedIp(host)) {
    return { safe: false, reason: `Blocked private or reserved host: ${host}` };
  }

  if (net.isIP(host)) {
    return { safe: true, url: parsed.toString() };
  }

  try {
    const records = await dns.promises.lookup(host, { all: true });
    if (!Array.isArray(records) || records.length === 0) {
      return { safe: false, reason: 'Host failed DNS resolution' };
    }
    for (const rec of records) {
      if (isPrivateOrReservedIp(rec.address)) {
        return { safe: false, reason: `Host ${host} resolved to private/reserved IP ${rec.address}` };
      }
    }
  } catch {
    // Allow caller fetch to handle offline/DNS error after passing static host checks
  }

  return { safe: true, url: parsed.toString() };
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CATEGORY_HEX_RE = /^[0-9a-f]{64}$/;
const OTR_WELL_KNOWN_URL = 'https://otr.cash/.well-known/bitcoin-cash-metadata-registry.json';
const PAYTACA_TESTNET_API = 'https://bcmr-chipnet.paytaca.com/api/tokens';
const PAYTACA_MAINNET_API = 'https://bcmr.paytaca.com/api/tokens';
const IPFS_GATEWAYS = [
  'https://ipfs.io/ipfs/',
  'https://dweb.link/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://w3s.link/ipfs/'
];

const CACHE_TTL_FOUND_MS = 5 * 60 * 1000;
const CACHE_TTL_MISS_MS = 30 * 1000;
const OTR_CACHE_TTL_MS = 15 * 60 * 1000;
const REMOTE_FETCH_TIMEOUT_MS = 2800;
const ELECTRUM_TIMEOUT_MS = 3200;
const AUTHCHAIN_DEADLINE_MS = 2600;
const MAX_AUTHCHAIN_HOPS = 6;
const MAX_CANDIDATE_TX_CHECKS = 12;

function normalizeNetwork(network) {
  const raw = String(network || 'testnet').trim().toLowerCase();
  if (raw === 'mainnet' || raw === 'bch' || raw === 'livenet') return 'mainnet';
  return 'testnet';
}

export function normalizeCategoryId(rawCategoryId) {
  const clean = String(rawCategoryId || '').trim().toLowerCase();
  return CATEGORY_HEX_RE.test(clean) ? clean : '';
}

export function normalizeBcmrIconUrl(rawUrl) {
  const val = String(rawUrl || '').trim();
  if (!val) return '';
  const lower = val.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('data:text/html')) return '';
  if (lower.startsWith('ipfs://')) {
    const rest = val.slice(7).replace(/^ipfs\//i, '').replace(/^\/+/, '');
    return rest ? `${IPFS_GATEWAYS[0]}${rest}` : '';
  }
  if (lower.startsWith('https://') || lower.startsWith('http://')) {
    try {
      const parsed = new URL(val);
      if (isPrivateOrReservedIp(parsed.hostname)) return '';
      return parsed.toString();
    } catch {
      return '';
    }
  }
  if (lower.startsWith('/') && !lower.startsWith('//')) {
    return `https://bliquid.xyz${val}`;
  }
  return '';
}

export function ipfsUriToHttpUrls(rawUri) {
  const val = String(rawUri || '').trim();
  if (!val) return [];
  const lower = val.toLowerCase();
  if (lower.startsWith('ipfs://')) {
    const rest = val.slice(7).replace(/^ipfs\//i, '').replace(/^\/+/, '');
    if (!rest) return [];
    return IPFS_GATEWAYS.map(gw => `${gw}${rest}`);
  }
  if (lower.startsWith('https://') || lower.startsWith('http://')) {
    try {
      const parsed = new URL(val);
      if (isPrivateOrReservedIp(parsed.hostname)) return [];
      return [parsed.toString()];
    } catch {
      return [];
    }
  }
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i.test(val)) {
    const candidate = `https://${val}`;
    try {
      const parsed = new URL(candidate);
      if (isPrivateOrReservedIp(parsed.hostname)) return [];
      return [parsed.toString()];
    } catch {
      return [];
    }
  }
  return [];
}

function readScriptPushes(scriptBytes) {
  if (!scriptBytes || scriptBytes.length < 2 || scriptBytes[0] !== 0x6a) return null;
  const pushes = [];
  let offset = 1;
  while (offset < scriptBytes.length) {
    const op = scriptBytes[offset++];
    if (op >= 0x01 && op <= 0x4b) {
      if (offset + op > scriptBytes.length) break;
      pushes.push(scriptBytes.slice(offset, offset + op));
      offset += op;
    } else if (op === 0x4c) {
      if (offset >= scriptBytes.length) break;
      const len = scriptBytes[offset++];
      if (offset + len > scriptBytes.length) break;
      pushes.push(scriptBytes.slice(offset, offset + len));
      offset += len;
    } else if (op === 0x4d) {
      if (offset + 1 >= scriptBytes.length) break;
      const len = scriptBytes[offset] | (scriptBytes[offset + 1] << 8);
      offset += 2;
      if (offset + len > scriptBytes.length) break;
      pushes.push(scriptBytes.slice(offset, offset + len));
      offset += len;
    } else if (op === 0x4e) {
      if (offset + 3 >= scriptBytes.length) break;
      const len = (
        scriptBytes[offset] |
        (scriptBytes[offset + 1] << 8) |
        (scriptBytes[offset + 2] << 16) |
        (scriptBytes[offset + 3] << 24)
      ) >>> 0;
      offset += 4;
      if (offset + len > scriptBytes.length) break;
      pushes.push(scriptBytes.slice(offset, offset + len));
      offset += len;
    } else if (op === 0x00) {
      pushes.push(new Uint8Array(0));
    } else {
      break;
    }
  }
  return pushes;
}

export function parseBcmrOpReturn(lockingBytecode) {
  const bytes = lockingBytecode instanceof Uint8Array
    ? lockingBytecode
    : (typeof lockingBytecode === 'string' ? hexToBin(lockingBytecode) : null);
  const pushes = readScriptPushes(bytes);
  if (!pushes || pushes.length < 2) return null;

  const prefix = Buffer.from(pushes[0]).toString('utf8').toUpperCase();
  if (prefix !== 'BCMR') return null;

  const uris = [];
  let contentHash = null;
  for (let i = 1; i < pushes.length; i++) {
    const buf = Buffer.from(pushes[i]);
    if (!contentHash && i === 1 && buf.length === 32) {
      contentHash = buf.toString('hex');
      continue;
    }
    const text = buf.toString('utf8').trim();
    if (
      text &&
      (text.startsWith('https://') ||
        text.startsWith('http://') ||
        text.startsWith('ipfs://') ||
        /^[a-z0-9.-]+\.[a-z]{2,}\//i.test(text) ||
        text.endsWith('.json'))
    ) {
      uris.push(text);
    }
  }
  if (!uris.length) return null;
  return { contentHash, uris };
}

function txHashMatches(outpointTxHashBytes, targetTxidLower) {
  if (!outpointTxHashBytes) return false;
  const direct = binToHex(outpointTxHashBytes).toLowerCase();
  if (direct === targetTxidLower) return true;
  const reversed = binToHex(Uint8Array.from(outpointTxHashBytes).reverse()).toLowerCase();
  return reversed === targetTxidLower;
}

function clampDecimals(val, fallback = 0) {
  const num = Number(val);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.min(18, Math.trunc(num)));
}

function buildNormalizedToken(raw) {
  if (!raw) return null;
  const symbol = String(raw.symbol || '').trim().slice(0, 16);
  const name = String(raw.name || symbol || '').trim().slice(0, 64);
  if (!symbol && !name) return null;
  return {
    symbol: symbol || name.slice(0, 8).toUpperCase(),
    name: name || symbol,
    decimals: clampDecimals(raw.decimals, 0),
    icon: normalizeBcmrIconUrl(raw.icon || ''),
    description: String(raw.description || '').trim().slice(0, 240)
  };
}

export function extractLatestIdentitySnapshot(identityHistory) {
  if (!identityHistory || typeof identityHistory !== 'object') return null;
  const timestamps = Object.keys(identityHistory).filter(k => identityHistory[k] && typeof identityHistory[k] === 'object');
  if (!timestamps.length) return null;
  timestamps.sort((a, b) => {
    const ta = Date.parse(a);
    const tb = Date.parse(b);
    if (Number.isFinite(ta) && Number.isFinite(tb)) return tb - ta;
    return String(b).localeCompare(String(a));
  });
  return identityHistory[timestamps[0]] || null;
}

export function extractMetadataFromRegistry(registryJson, categoryId) {
  if (!registryJson || typeof registryJson !== 'object') return null;
  const catLower = String(categoryId || '').toLowerCase();
  const identities = registryJson.identities;
  if (!identities || typeof identities !== 'object') return null;

  let matchedSnapshot = null;
  if (identities[catLower]) {
    matchedSnapshot = extractLatestIdentitySnapshot(identities[catLower]);
  }

  if (!matchedSnapshot) {
    for (const authKey of Object.keys(identities)) {
      const snap = extractLatestIdentitySnapshot(identities[authKey]);
      const snapCat = String(snap?.token?.category || '').trim().toLowerCase();
      if (snapCat === catLower) {
        matchedSnapshot = snap;
        break;
      }
    }
  }

  if (!matchedSnapshot) return null;
  const tokenInfo = matchedSnapshot.token || {};
  return buildNormalizedToken({
    symbol: tokenInfo.symbol || matchedSnapshot.symbol,
    name: matchedSnapshot.name || tokenInfo.symbol,
    decimals: tokenInfo.decimals ?? 0,
    icon: matchedSnapshot.uris?.icon || tokenInfo.icon || '',
    description: matchedSnapshot.description || ''
  });
}

export function extractMetadataFromPaytaca(data) {
  if (!data || typeof data !== 'object' || data.error) return null;
  const tm = data.type_metadata || data.token || {};
  const uris = data.uris || tm.uris || {};
  return buildNormalizedToken({
    symbol: tm.symbol || data.symbol || data.ticker,
    name: data.name || tm.name || tm.symbol || data.symbol,
    decimals: tm.decimals ?? data.decimals ?? 0,
    icon: uris.icon || data.icon || tm.icon || '',
    description: data.description || tm.description || ''
  });
}

function buildOtrIndex(registryJson) {
  const byCategory = new Map();
  const identities = registryJson?.identities;
  if (!identities || typeof identities !== 'object') return byCategory;

  for (const [authbaseKey, history] of Object.entries(identities)) {
    const snap = extractLatestIdentitySnapshot(history);
    if (!snap) continue;
    const cat = String(snap?.token?.category || authbaseKey || '').trim().toLowerCase();
    if (!CATEGORY_HEX_RE.test(cat)) continue;
    const token = buildNormalizedToken({
      symbol: snap?.token?.symbol || snap?.symbol,
      name: snap?.name || snap?.token?.symbol,
      decimals: snap?.token?.decimals ?? 0,
      icon: snap?.uris?.icon || '',
      description: snap?.description || ''
    });
    if (token && !byCategory.has(cat)) {
      byCategory.set(cat, token);
    }
  }
  return byCategory;
}

async function fetchJsonSafe(url, timeoutMs = REMOTE_FETCH_TIMEOUT_MS) {
  const safety = await validateSafePublicUrl(url);
  if (!safety.safe) {
    return null;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(safety.url, {
      signal: controller.signal,
      redirect: 'error',
      headers: { Accept: 'application/json' }
    });
    if (!res.ok) return null;
    const contentLength = Number(res.headers?.get?.('content-length') || 0);
    if (contentLength > MAX_BCMR_RESPONSE_BYTES) return null;
    const text = await res.text();
    if (Buffer.byteLength(text, 'utf8') > MAX_BCMR_RESPONSE_BYTES) return null;
    const trimmed = text.trimStart();
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null;
    return JSON.parse(text);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function withTimeout(promise, ms) {
  let timer = null;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('timeout')), ms);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function scripthashFromLockingBytecode(lockingBytecode) {
  const digest = crypto.createHash('sha256').update(Buffer.from(lockingBytecode)).digest();
  return Buffer.from(digest).reverse().toString('hex');
}

export class BcmrService {
  constructor(deps = {}) {
    this.bch = deps.bchService || bchService;
    this.tokenConfig = deps.tokenConfig || config?.bch?.tokens || {};
    this.fetchJson = deps.fetchJson || fetchJsonSafe;
    this.lookupCache = new Map();
    this.otrCache = { loadedAt: 0, byCategory: new Map(), pending: null };
    this.localRegistryCache = null;
  }

  _loadLocalRegistry() {
    if (this.localRegistryCache) return this.localRegistryCache;
    const byKey = new Map();
    const configNetworksByCat = new Map();

    // 1. From config.bch.tokens (authoritative network assignment per protocol token)
    for (const [key, entry] of Object.entries(this.tokenConfig)) {
      if (!entry || typeof entry !== 'object') continue;
      if (entry.category) {
        const cat = String(entry.category).toLowerCase();
        if (!configNetworksByCat.has(cat)) configNetworksByCat.set(cat, new Set());
        configNetworksByCat.get(cat).add('mainnet');
        byKey.set(`mainnet:${cat}`, {
          token: buildNormalizedToken({
            symbol: entry.symbol || key,
            name: entry.name || key,
            decimals: entry.decimals ?? 6,
            icon: entry.icon || `/${entry.symbol || key}.png`
          }),
          network: 'mainnet',
          networkExplicit: true,
          source: 'protocol-config'
        });
      }
      if (entry.chipnetCategory) {
        const cat = String(entry.chipnetCategory).toLowerCase();
        if (!configNetworksByCat.has(cat)) configNetworksByCat.set(cat, new Set());
        configNetworksByCat.get(cat).add('testnet');
        byKey.set(`testnet:${cat}`, {
          token: buildNormalizedToken({
            symbol: entry.symbol || key,
            name: entry.name || key,
            decimals: entry.decimals ?? 6,
            icon: entry.icon || `/${entry.symbol || key}.png`
          }),
          network: 'testnet',
          networkExplicit: true,
          source: 'protocol-config'
        });
      }
    }

    // 2. From local bcmr.json if present alongside repo or deployed frontend
    const candidatePaths = [
      path.resolve(__dirname, '../../frontend/public/bcmr.json'),
      path.resolve(__dirname, '../../frontend/bcmr.json'),
      '/var/www/binaryliquid-bridge/frontend/bcmr.json',
      '/var/www/binaryliquid-bridge/frontend/public/bcmr.json'
    ];
    for (const p of candidatePaths) {
      try {
        if (!fs.existsSync(p)) continue;
        const parsed = JSON.parse(fs.readFileSync(p, 'utf8'));
        const identities = parsed?.identities || {};
        for (const [idKey, history] of Object.entries(identities)) {
          const snap = extractLatestIdentitySnapshot(history);
          if (!snap) continue;
          const cat = String(snap?.token?.category || idKey || '').toLowerCase();
          if (!CATEGORY_HEX_RE.test(cat)) continue;
          const descLower = `${snap.name || ''} ${snap.description || ''}`.toLowerCase();
          const cfgNets = configNetworksByCat.get(cat);
          let hintedNet = descLower.includes('chipnet') || descLower.includes('testnet')
            ? 'testnet'
            : (descLower.includes('mainnet') ? 'mainnet' : null);
          if (!hintedNet && cfgNets && cfgNets.size === 1) {
            hintedNet = Array.from(cfgNets)[0];
          }

          const token = buildNormalizedToken({
            symbol: snap?.token?.symbol || snap?.symbol,
            name: snap?.name || snap?.token?.symbol,
            decimals: snap?.token?.decimals ?? 0,
            icon: snap?.uris?.icon || '',
            description: snap?.description || ''
          });
          if (!token) continue;

          if (hintedNet) {
            if (!byKey.has(`${hintedNet}:${cat}`)) {
              byKey.set(`${hintedNet}:${cat}`, {
                token,
                network: hintedNet,
                networkExplicit: true,
                source: 'local-bcmr'
              });
            }
          } else {
            for (const net of ['mainnet', 'testnet']) {
              if (!byKey.has(`${net}:${cat}`)) {
                byKey.set(`${net}:${cat}`, {
                  token,
                  network: net,
                  networkExplicit: false,
                  source: 'local-bcmr'
                });
              }
            }
          }
        }
        break;
      } catch {
        // Ignore missing/malformed optional local bcmr.json
      }
    }

    this.localRegistryCache = byKey;
    return byKey;
  }

  _lookupLocal(categoryId, network) {
    const map = this._loadLocalRegistry();
    return map.get(`${network}:${categoryId}`) || null;
  }

  async _getOtrToken(categoryId) {
    const now = Date.now();
    if (this.otrCache.loadedAt > 0 && now - this.otrCache.loadedAt < OTR_CACHE_TTL_MS) {
      return this.otrCache.byCategory.get(categoryId) || null;
    }
    if (!this.otrCache.pending) {
      this.otrCache.pending = this.fetchJson(OTR_WELL_KNOWN_URL, REMOTE_FETCH_TIMEOUT_MS + 1200)
        .then(json => {
          if (json && json.identities) {
            this.otrCache.byCategory = buildOtrIndex(json);
            this.otrCache.loadedAt = Date.now();
          }
          return this.otrCache.byCategory;
        })
        .catch(() => this.otrCache.byCategory)
        .finally(() => {
          this.otrCache.pending = null;
        });
    }
    const index = await this.otrCache.pending;
    return index?.get(categoryId) || null;
  }

  async _fetchPaytacaToken(categoryId, network) {
    const base = network === 'mainnet' ? PAYTACA_MAINNET_API : PAYTACA_TESTNET_API;
    const data = await this.fetchJson(`${base}/${categoryId}/`, REMOTE_FETCH_TIMEOUT_MS);
    return extractMetadataFromPaytaca(data);
  }

  _getProvider(network) {
    return network === 'mainnet' ? this.bch?.mainnetProvider : this.bch?.chipnetProvider;
  }

  async _inspectElectrumChain(categoryId, network) {
    try {
      await withTimeout(this.bch.readyPromise, 1500).catch(() => {});
      const provider = this._getProvider(network);
      if (!provider) {
        return { available: false, onChain: false, genesisTxid: null, mintTxid: null, authchainUrl: null, tokenFromAuthchain: null };
      }

      const rawGenesis = await withTimeout(provider.getRawTransaction(categoryId), ELECTRUM_TIMEOUT_MS).catch(() => null);
      if (!rawGenesis || typeof rawGenesis !== 'string') {
        return { available: true, onChain: false, genesisTxid: null, mintTxid: null, authchainUrl: null, tokenFromAuthchain: null };
      }

      // Pre-genesis TX exists on this chain. Verify hop 0 CashToken mint output (category === categoryId)
      // and walk authchain (max MAX_AUTHCHAIN_HOPS) for OP_RETURN BCMR metadata.
      const authchainUris = [];
      let tokenFromAuthchain = null;
      let mintTxid = null;
      let confirmedNonToken = false;
      const deadline = Date.now() + AUTHCHAIN_DEADLINE_MS;

      try {
        let curTxid = categoryId;
        let curDec = decodeTransaction(hexToBin(rawGenesis));

        const inspectTxBcmr = (dec) => {
          if (!dec || !Array.isArray(dec.outputs)) return;
          for (const out of dec.outputs) {
            const parsed = parseBcmrOpReturn(out.lockingBytecode);
            if (parsed?.uris?.length) {
              for (const u of parsed.uris) {
                if (!authchainUris.includes(u)) authchainUris.push(u);
              }
            }
          }
        };

        inspectTxBcmr(curDec);

        for (let hop = 0; hop < MAX_AUTHCHAIN_HOPS && Date.now() < deadline; hop++) {
          const out0 = curDec?.outputs?.[0];
          if (!out0?.lockingBytecode) break;
          if (out0.lockingBytecode[0] === 0x6a) break; // OP_RETURN is unspendable end of authchain

          const scripthash = scripthashFromLockingBytecode(out0.lockingBytecode);
          const remaining = Math.max(400, deadline - Date.now());
          const history = await withTimeout(
            provider.performRequest('blockchain.scripthash.get_history', scripthash),
            remaining
          ).catch(() => null);
          if (!Array.isArray(history) || !history.length) break;

          const curIdx = history.findIndex(item => String(item?.tx_hash || '').toLowerCase() === curTxid);
          const startIdx = curIdx >= 0 ? curIdx + 1 : 0;
          const maxChecks = hop === 0 ? MAX_CANDIDATE_TX_CHECKS * 2 : MAX_CANDIDATE_TX_CHECKS;
          const candidates = history
            .slice(startIdx, startIdx + maxChecks)
            .map(h => String(h?.tx_hash || '').toLowerCase())
            .filter(txh => txh && txh !== curTxid);

          if (hop === 0 && candidates.length === 0) {
            // Pre-genesis output 0 has never been spent -> cannot have minted any CashToken
            confirmedNonToken = true;
            break;
          }

          let nextTxid = null;
          let nextDec = null;

          // Fetch candidate raw txs in small batches to stay responsive
          for (let i = 0; i < candidates.length && !nextTxid && Date.now() < deadline; i += 4) {
            const slice = candidates.slice(i, i + 4);
            const rawList = await Promise.all(
              slice.map(txh => withTimeout(provider.getRawTransaction(txh), Math.max(400, deadline - Date.now())).catch(() => null))
            );
            for (let j = 0; j < slice.length; j++) {
              const rawCandidate = rawList[j];
              if (!rawCandidate) continue;
              const dec = decodeTransaction(hexToBin(rawCandidate));
              if (!dec || !Array.isArray(dec.inputs)) continue;
              const spendsOut0 = dec.inputs.some(inp => inp.outpointIndex === 0 && txHashMatches(inp.outpointTransactionHash, curTxid));
              if (spendsOut0) {
                nextTxid = slice[j];
                nextDec = dec;
                break;
              }
            }
          }

          if (!nextTxid || !nextDec) break;

          if (hop === 0) {
            const mintedCategory = nextDec.outputs?.some(out => out?.token && txHashMatches(out.token.category, categoryId));
            if (mintedCategory) {
              mintTxid = nextTxid;
            } else {
              // Spent pre-genesis vout 0 without minting any CashToken of this category
              confirmedNonToken = true;
              break;
            }
          }

          inspectTxBcmr(nextDec);
          curTxid = nextTxid;
          curDec = nextDec;
        }

        // Fetch discovered authchain BCMR URIs newest-first (last discovered = authhead)
        for (let i = authchainUris.length - 1; i >= 0 && !tokenFromAuthchain; i--) {
          const httpCandidates = ipfsUriToHttpUrls(authchainUris[i]);
          for (const url of httpCandidates) {
            const json = await this.fetchJson(url, 1800);
            const extracted = extractMetadataFromRegistry(json, categoryId);
            if (extracted) {
              tokenFromAuthchain = extracted;
              break;
            }
          }
        }
      } catch {
        // Ignore non-fatal authchain traversal issues; raw TX check remains valid
      }

      const onChain = confirmedNonToken ? false : Boolean(mintTxid || authchainUris.length > 0 || rawGenesis);

      return {
        available: true,
        onChain,
        mintTxid,
        genesisTxid: onChain ? categoryId : null,
        authchainUrl: authchainUris.length ? authchainUris[authchainUris.length - 1] : null,
        tokenFromAuthchain
      };
    } catch {
      return { available: false, onChain: false, mintTxid: null, genesisTxid: null, authchainUrl: null, tokenFromAuthchain: null };
    }
  }

  async lookupCashTokenMetadata(rawCategoryId, { network = 'testnet' } = {}) {
    const categoryId = normalizeCategoryId(rawCategoryId);
    if (!categoryId) {
      throw new Error('Category ID inválida: debe ser una cadena hexadecimal de 64 caracteres.');
    }

    const targetNet = normalizeNetwork(network);
    const oppositeNet = targetNet === 'mainnet' ? 'testnet' : 'mainnet';
    const cacheKey = `${targetNet}:${categoryId}`;

    const hit = this.lookupCache.get(cacheKey);
    if (hit && Date.now() < hit.expiresAt) {
      return { ...hit.value, cached: true };
    }

    const sourcesChecked = [];
    const localTarget = this._lookupLocal(categoryId, targetNet);
    if (localTarget) sourcesChecked.push(localTarget.source);

    // Query target network Electrum + Paytaca + OTR in parallel
    const [electrumTarget, paytacaTarget, otrToken] = await Promise.all([
      this._inspectElectrumChain(categoryId, targetNet),
      this._fetchPaytacaToken(categoryId, targetNet),
      this._getOtrToken(categoryId)
    ]);

    if (electrumTarget.available) sourcesChecked.push(`electrum-${targetNet}`);
    sourcesChecked.push(targetNet === 'mainnet' ? 'paytaca-mainnet' : 'paytaca-chipnet');
    sourcesChecked.push('otr-cash');

    // Pick best BCMR metadata for target network
    let targetToken = null;
    let bcmrSource = null;

    if (localTarget?.token && (localTarget.networkExplicit || electrumTarget.onChain)) {
      targetToken = localTarget.token;
      bcmrSource = localTarget.source;
    } else if (paytacaTarget) {
      targetToken = paytacaTarget;
      bcmrSource = targetNet === 'mainnet' ? 'paytaca-mainnet' : 'paytaca-chipnet';
    } else if (electrumTarget.tokenFromAuthchain) {
      targetToken = electrumTarget.tokenFromAuthchain;
      bcmrSource = 'onchain-authchain';
    } else if (otrToken && electrumTarget.onChain) {
      targetToken = otrToken;
      bcmrSource = 'otr-cash';
    }

    // Check opposite network only if not confirmed on target chain
    let onOppositeNetwork = false;
    let oppositeToken = null;

    if (!electrumTarget.onChain && !targetToken) {
      const localOpp = this._lookupLocal(categoryId, oppositeNet);
      const [electrumOpp, paytacaOpp] = await Promise.all([
        this._inspectElectrumChain(categoryId, oppositeNet),
        this._fetchPaytacaToken(categoryId, oppositeNet)
      ]);
      if (electrumOpp.available) sourcesChecked.push(`electrum-${oppositeNet}`);

      if (electrumOpp.onChain || localOpp?.token || paytacaOpp) {
        onOppositeNetwork = true;
        oppositeToken =
          localOpp?.token ||
          paytacaOpp ||
          electrumOpp.tokenFromAuthchain ||
          (electrumOpp.onChain ? otrToken : null) ||
          null;
      }
    }

    const onChain = Boolean(electrumTarget.onChain);
    const bcmrVerified = Boolean(targetToken);
    const found = Boolean(onChain || bcmrVerified);

    const result = {
      categoryId,
      network: targetNet,
      found,
      onChain,
      bcmrVerified,
      onOppositeNetwork: !found && onOppositeNetwork,
      oppositeNetwork: oppositeNet,
      source: bcmrSource || (onChain ? `electrum-${targetNet}` : null),
      sourcesChecked,
      token: targetToken,
      oppositeToken: !found && onOppositeNetwork ? oppositeToken : null,
      genesis: onChain
        ? {
            txid: electrumTarget.genesisTxid || categoryId,
            mintTxid: electrumTarget.mintTxid || null,
            network: targetNet
          }
        : null,
      authchainUrl: electrumTarget.authchainUrl || null,
      cached: false
    };

    const ttl = found || onOppositeNetwork ? CACHE_TTL_FOUND_MS : CACHE_TTL_MISS_MS;
    this.lookupCache.set(cacheKey, { value: result, expiresAt: Date.now() + ttl });
    return result;
  }
}

export const bcmrService = new BcmrService();
