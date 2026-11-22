import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Contract, MockNetworkProvider } from 'cashscript';
import { lockingBytecodeToCashAddress } from '@bitauth/libauth';
import { config } from '../config.js';
import { db } from './db.js';
import { oraclePool } from './oraclePool.js';
import { parseCashAddress, isSameBchAddress } from '../utils/bchAddress.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MARKET_ARTIFACT_PATH = path.resolve(__dirname, '../../contracts/bch/artifacts/UserLinkHandleMarket.json');
const MINT_ARTIFACT_PATH = path.resolve(__dirname, '../../contracts/bch/artifacts/UserLinkHandleMint.json');

const marketArtifact = JSON.parse(fs.readFileSync(MARKET_ARTIFACT_PATH, 'utf8'));
const mintArtifact = JSON.parse(fs.readFileSync(MINT_ARTIFACT_PATH, 'utf8'));

// Deterministic offline address derivation provider (zero stray Electrum sockets)
const deterministicProvider = new MockNetworkProvider();

const TIER_USD = {
  ultraRare: { minLen: 1, maxLen: 3, usd: 5, label: '1–3 chars' },
  premium: { minLen: 4, maxLen: 4, usd: 2, label: '4 chars' },
  short: { minLen: 5, maxLen: 5, usd: 0.5, label: '5 chars' },
  standard: { minLen: 6, maxLen: 32, usd: 0.1, label: '6+ chars' }
};

function sanitizeHandle(raw) {
  const clean = String(raw || '')
    .trim()
    .replace(/^@+/, '')
    .split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '');
  if (!clean || clean.length < 1 || clean.length > 32) {
    throw new Error('Handle must be 1–32 characters (a-z, 0-9, _, -).');
  }
  return clean;
}

function sha256d(buf) {
  return crypto.createHash('sha256').update(crypto.createHash('sha256').update(buf).digest()).digest();
}

function encodeContractAddresses(contract, isTestnet) {
  const parsed = parseCashAddress(contract.address, true);
  if (!parsed) {
    throw new Error('Failed deriving P2SH-32 covenant address');
  }
  const prefix = isTestnet ? 'bchtest' : 'bitcoincash';
  const baseEnc = lockingBytecodeToCashAddress({
    bytecode: parsed.bytecode,
    prefix,
    tokenSupport: false
  });
  const tokenEnc = lockingBytecodeToCashAddress({
    bytecode: parsed.bytecode,
    prefix,
    tokenSupport: true
  });
  if (typeof baseEnc === 'string' || typeof tokenEnc === 'string') {
    throw new Error('Failed encoding P2SH-32 CashAddress');
  }
  return {
    covenantBaseAddress: baseEnc.address.toLowerCase(),
    covenantTokenAddress: tokenEnc.address.toLowerCase(),
    lockingBytecodeHex: parsed.bytecodeHex
  };
}

function getTreasuryParsed(isTestnet) {
  const rawTreasury = isTestnet
    ? config.bch.watchmanChipnetAddress || 'bchtest:qpnfz2nh7uy8a2ythr2z7am5vcxr28g43qjdwgfzp8'
    : config.bch.mainnetTreasuryAddress || config.bch.treasuryAddress || 'bitcoincash:qqgm9rel5xlyhwt3r6n8uq9fxk5zzxrcavaal6aw8v';
  const parsed = parseCashAddress(rawTreasury, isTestnet);
  if (!parsed) {
    throw new Error('Invalid protocol treasury BCH address configuration');
  }
  return parsed;
}

function extractP2pkhHash(bytecode) {
  // Standard P2PKH locking bytecode: OP_DUP(76) OP_HASH160(a9) PUSH20(14) <20-byte-pkh> OP_EQUALVERIFY(88) OP_CHECKSIG(ac)
  if (
    !bytecode ||
    bytecode.length !== 25 ||
    bytecode[0] !== 0x76 ||
    bytecode[1] !== 0xa9 ||
    bytecode[2] !== 0x14 ||
    bytecode[23] !== 0x88 ||
    bytecode[24] !== 0xac
  ) {
    throw new Error('Seller address must be a standard Bitcoin Cash P2PKH address (q... or z...).');
  }
  return bytecode.slice(3, 23);
}

async function getBchPriceUsd() {
  try {
    const quote = await oraclePool.getPrice('BCH');
    const p = Number(quote?.price || quote || 0);
    if (Number.isFinite(p) && p > 10) return p;
  } catch {}
  return 450;
}

function ensureListingsStore() {
  if (!Array.isArray(db.memoryState.handleListings)) {
    db.memoryState.handleListings = [];
  }
  return db.memoryState.handleListings;
}

export const handleMarketService = {
  /**
   * Computes anti-spam tiered pricing for a @handle and derives a deterministic
   * commit-reveal P2SH-32 `UserLinkHandleMint` covenant preview.
   */
  async quoteHandleMint({ handle, recipientAddress = '', network = 'testnet' }) {
    const cleanHandle = sanitizeHandle(handle);
    const isTestnet = String(network).toLowerCase() !== 'mainnet';
    const bchPriceUsd = await getBchPriceUsd();

    const toSats = (usd) => Math.max(1000, Math.round((usd / bchPriceUsd) * 1e8));
    const tier13Sats = toSats(TIER_USD.ultraRare.usd);
    const tier4Sats = toSats(TIER_USD.premium.usd);
    const tier5Sats = toSats(TIER_USD.short.usd);
    const tier6PlusSats = toSats(TIER_USD.standard.usd);

    let activeTier = { key: 'standard', ...TIER_USD.standard, sats: tier6PlusSats };
    if (cleanHandle.length <= 3) {
      activeTier = { key: 'ultraRare', ...TIER_USD.ultraRare, sats: tier13Sats };
    } else if (cleanHandle.length === 4) {
      activeTier = { key: 'premium', ...TIER_USD.premium, sats: tier4Sats };
    } else if (cleanHandle.length === 5) {
      activeTier = { key: 'short', ...TIER_USD.short, sats: tier5Sats };
    }

    const treasury = getTreasuryParsed(isTestnet);
    const recipientParsed = recipientAddress
      ? parseCashAddress(recipientAddress, isTestnet)
      : treasury;
    if (!recipientParsed) {
      throw new Error('Invalid recipient CashAddress for commit-reveal hash.');
    }

    const handleBytes = Buffer.from(cleanHandle, 'utf8');
    const nftCommitmentHex = Buffer.concat([Buffer.from('UL1:', 'utf8'), handleBytes]).toString('hex');
    const commitSalt = crypto.randomBytes(32);
    const commitHash = sha256d(Buffer.concat([commitSalt, handleBytes, Buffer.from(recipientParsed.bytecode)]));
    const minRevealTime = Math.floor(Date.now() / 1000) + 600; // ~1 BCH block anti-frontrunning window

    const mintContract = new Contract(
      mintArtifact,
      [
        treasury.bytecode,
        BigInt(tier13Sats),
        BigInt(tier4Sats),
        BigInt(tier5Sats),
        BigInt(tier6PlusSats),
        commitHash,
        BigInt(minRevealTime)
      ],
      { provider: deterministicProvider, addressType: 'p2sh32' }
    );
    const addrs = encodeContractAddresses(mintContract, isTestnet);

    return {
      handle: `@${cleanHandle}`,
      cleanHandle,
      length: cleanHandle.length,
      network: isTestnet ? 'testnet' : 'mainnet',
      bchPriceUsd: Number(bchPriceUsd.toFixed(2)),
      nostrIdentityCostUsd: 0,
      tier: {
        key: activeTier.key,
        label: activeTier.label,
        usd: activeTier.usd,
        sats: activeTier.sats,
        bch: Number((activeTier.sats / 1e8).toFixed(8))
      },
      allTiers: [
        { key: 'ultraRare', ...TIER_USD.ultraRare, sats: tier13Sats, bch: Number((tier13Sats / 1e8).toFixed(6)) },
        { key: 'premium', ...TIER_USD.premium, sats: tier4Sats, bch: Number((tier4Sats / 1e8).toFixed(6)) },
        { key: 'short', ...TIER_USD.short, sats: tier5Sats, bch: Number((tier5Sats / 1e8).toFixed(6)) },
        { key: 'standard', ...TIER_USD.standard, sats: tier6PlusSats, bch: Number((tier6PlusSats / 1e8).toFixed(6)) }
      ],
      nftCommitmentHex,
      commitReveal: {
        commitSaltHex: commitSalt.toString('hex'),
        commitHashHex: commitHash.toString('hex'),
        minRevealTime,
        recipientAddress: recipientParsed.tokenAddress
      },
      covenant: {
        contractName: 'UserLinkHandleMint',
        opcodes: mintArtifact.bytecode.split(' ').length,
        treasuryAddress: treasury.baseAddress,
        ...addrs
      }
    };
  },

  /**
   * Instantiates a non-custodial P2SH-32 `UserLinkHandleMarket` covenant for selling
   * a UserLink @handle CashToken NFT atomically on Bitcoin Cash L1.
   */
  async createMarketListing({
    handle,
    sellerAddress,
    priceBch,
    priceSats: rawPriceSats,
    protocolFeeBps = 200,
    expiryHours = 168,
    network = 'testnet',
    nostrPubkeyHex = ''
  }) {
    const cleanHandle = sanitizeHandle(handle);
    const isTestnet = String(network).toLowerCase() !== 'mainnet';
    const sellerParsed = parseCashAddress(sellerAddress, isTestnet);
    if (!sellerParsed) {
      throw new Error('Invalid seller Bitcoin Cash address.');
    }
    const sellerPkh = extractP2pkhHash(sellerParsed.bytecode);
    const treasury = getTreasuryParsed(isTestnet);

    const parsedPriceSats =
      rawPriceSats !== undefined && rawPriceSats !== null && rawPriceSats !== ''
        ? Math.round(Number(rawPriceSats))
        : Math.round(Number(priceBch) * 1e8);
    if (!Number.isFinite(parsedPriceSats) || parsedPriceSats < 1000 || parsedPriceSats > 100_000_000_000) {
      throw new Error('Price must be between 0.00001 BCH (1,000 sats) and 1,000 BCH.');
    }

    const feeBps = Math.max(0, Math.min(1000, Math.round(Number(protocolFeeBps) || 0)));
    const safeExpiryHours = Math.max(1, Math.min(24 * 90, Math.round(Number(expiryHours) || 168)));
    const expiryTimestamp = Math.floor(Date.now() / 1000) + safeExpiryHours * 3600;

    let feeSats = Math.floor((parsedPriceSats * feeBps) / 10000);
    if (feeSats < 546) feeSats = 0;
    const sellerNetSats = parsedPriceSats - feeSats;
    if (sellerNetSats < 546) {
      throw new Error('Seller net payout must be at least 546 satoshis.');
    }

    const commitmentBytes = Buffer.concat([Buffer.from('UL1:', 'utf8'), Buffer.from(cleanHandle, 'utf8')]);
    const marketContract = new Contract(
      marketArtifact,
      [
        sellerPkh,
        sellerParsed.bytecode,
        treasury.bytecode,
        BigInt(parsedPriceSats),
        BigInt(feeBps),
        commitmentBytes,
        BigInt(expiryTimestamp)
      ],
      { provider: deterministicProvider, addressType: 'p2sh32' }
    );

    const addrs = encodeContractAddresses(marketContract, isTestnet);
    const bchPriceUsd = await getBchPriceUsd();
    const id = `ulm_${crypto.randomBytes(6).toString('hex')}`;

    const listing = {
      id,
      handle: `@${cleanHandle}`,
      cleanHandle,
      network: isTestnet ? 'testnet' : 'mainnet',
      status: 'AWAITING_NFT_LOCK',
      sellerAddress: sellerParsed.baseAddress,
      sellerTokenAddress: sellerParsed.tokenAddress,
      treasuryAddress: treasury.baseAddress,
      priceSats: parsedPriceSats,
      priceBch: Number((parsedPriceSats / 1e8).toFixed(8)),
      priceUsdEst: Number(((parsedPriceSats / 1e8) * bchPriceUsd).toFixed(2)),
      protocolFeeBps: feeBps,
      feeSats,
      sellerNetSats,
      nftCommitmentHex: commitmentBytes.toString('hex'),
      expiryTimestamp,
      nostrPubkeyHex: /^[0-9a-fA-F]{64}$/.test(String(nostrPubkeyHex || '').trim())
        ? String(nostrPubkeyHex).trim().toLowerCase()
        : '',
      covenant: {
        contractName: 'UserLinkHandleMarket',
        opcodes: marketArtifact.bytecode.split(' ').length,
        ...addrs
      },
      createdAt: Date.now()
    };

    const listings = ensureListingsStore();
    listings.unshift(listing);
    if (listings.length > 200) {
      listings.length = 200;
    }
    db.persist();
    return listing;
  },

  listMarketListings(network = 'testnet') {
    const targetNet = String(network).toLowerCase() === 'mainnet' ? 'mainnet' : 'testnet';
    const nowSec = Math.floor(Date.now() / 1000);
    return ensureListingsStore()
      .filter((l) => l.network === targetNet && l.status !== 'CANCELLED' && l.expiryTimestamp > nowSec)
      .sort((a, b) => b.createdAt - a.createdAt);
  },

  cancelMarketListing(id, sellerAddress) {
    const listings = ensureListingsStore();
    const idx = listings.findIndex((l) => l.id === id);
    if (idx === -1) {
      throw new Error('Handle listing not found.');
    }
    const target = listings[idx];
    if (!sellerAddress || !isSameBchAddress(target.sellerAddress, sellerAddress)) {
      throw new Error('Only the listing seller address can remove this listing.');
    }
    listings.splice(idx, 1);
    db.persist();
    return { removed: true, id };
  }
};
