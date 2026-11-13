import { SimplePool, verifyEvent, nip19, type Event as NostrEvent } from 'nostr-tools';
import { secp256k1 } from '@noble/curves/secp256k1.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import { decodeCashAddress, hash160 } from '@bitauth/libauth';
import { convertCashAddressNetwork, isValidCashAddress } from './bchAddress';

export const USERLINK_RELAYS = [
  'wss://relay.primal.net',
  'wss://relay.snort.social',
  'wss://nostr.oxtr.dev',
  'wss://offchain.pub'
];

export const USERLINK_D_TAG = 'bch-identity-binding';

export interface VerifiedUserLinkResult {
  npub: string;
  pubkeyHex: string;
  bchAddress: string;
  bchPubkey: string;
  nip05: string;
  handle: string;
  sigScheme: string;
  event: NostrEvent;
  timestamp: number;
  isNostrSigValid: boolean;
  isBchSigValid: boolean;
  isAddressOwned: boolean;
  isMutualBindingValid: boolean;
  isOverallValid: boolean;
  verificationNote?: string;
}

function encodeVarInt(n: number): Uint8Array {
  if (n < 0xfd) return new Uint8Array([n]);
  if (n <= 0xffff) return new Uint8Array([0xfd, n & 0xff, (n >> 8) & 0xff]);
  return new Uint8Array([
    0xfe,
    n & 0xff,
    (n >> 8) & 0xff,
    (n >> 16) & 0xff,
    (n >>> 24) & 0xff
  ]);
}

export function bitcoinMessageHash(message: string): Uint8Array {
  const prefix = new TextEncoder().encode('\x18Bitcoin Signed Message:\n');
  const body = new TextEncoder().encode(message);
  const lenBytes = encodeVarInt(body.length);
  const full = new Uint8Array(prefix.length + lenBytes.length + body.length);
  full.set(prefix, 0);
  full.set(lenBytes, prefix.length);
  full.set(body, prefix.length + lenBytes.length);
  return sha256(sha256(full));
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64.trim());
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Produces a standard Base64 Bitcoin Signed Message (65-byte compact recoverable ECDSA)
 * compatible with Paytaca, Cashonize, Zapit and Electron Cash.
 */
export function signBitcoinMessage(message: string, skBytes: Uint8Array): string {
  const digest = bitcoinMessageHash(message);
  const sigRec = secp256k1.sign(digest, skBytes, { prehash: false, format: 'recovered' });
  const recId = sigRec[0];
  const bsmBytes = new Uint8Array(65);
  bsmBytes[0] = 31 + recId; // 31..34 indicates compressed P2PKH key recovery
  bsmBytes.set(sigRec.slice(1, 65), 1);
  return bytesToBase64(bsmBytes);
}

function getCashAddressHash160(address: string): Uint8Array | null {
  if (!address) return null;
  let clean = address.trim().toLowerCase();
  if (clean.includes(',')) {
    clean = clean.split(',')[0].trim();
  }
  if (!clean.includes(':')) {
    const main = convertCashAddressNetwork(clean, false, false);
    if (main.includes(':')) clean = main;
  }
  const decoded = decodeCashAddress(clean);
  if (typeof decoded === 'string') return null;
  if (decoded.type !== 'p2pkh' && decoded.type !== 'p2pkhWithTokens') {
    return null;
  }
  return decoded.payload;
}

function checkPubkeyMatchesAddress(pubkeyBytes: Uint8Array, address: string): boolean {
  const expectedPayload = getCashAddressHash160(address);
  if (!expectedPayload) return false;
  const actualPayload = hash160(pubkeyBytes);
  return bytesToHex(actualPayload) === bytesToHex(expectedPayload);
}

/**
 * Cryptographically verifies either:
 * 1) Standard Bitcoin Signed Message (Base64 65-byte recoverable sig), OR
 * 2) Legacy hex ECDSA signature (`secp256k1` over `sha256(message)`),
 * AND proves that the signing public key owns `expectedAddress` (`hash160(pubkey) === CashAddress payload`).
 */
export function verifyBitcoinMessageAndAddress(params: {
  message: string;
  bchSig: string;
  expectedAddress?: string;
  expectedPubkeyHex?: string;
  sigScheme?: string;
}): {
  isBchSigValid: boolean;
  isAddressOwned: boolean;
  recoveredPubkeyHex: string;
  reason?: string;
} {
  const { message, bchSig, expectedAddress = '', expectedPubkeyHex = '', sigScheme = '' } = params;
  const sigTrimmed = (bchSig || '').trim();
  if (!sigTrimmed || !message) {
    return {
      isBchSigValid: false,
      isAddressOwned: false,
      recoveredPubkeyHex: '',
      reason: 'Missing BCH signature or attestation payload'
    };
  }

  const looksLikeHex = /^[0-9a-fA-F]{128,144}$/.test(sigTrimmed);
  const tryBsmFirst = sigScheme === 'bitcoin-signed-message' || !looksLikeHex;

  if (tryBsmFirst) {
    try {
      const raw = base64ToBytes(sigTrimmed);
      if (raw.length === 65 && raw[0] >= 27 && raw[0] <= 34) {
        const hdr = raw[0];
        const isCompressed = hdr >= 31;
        const recId = (hdr - 27) & 3;
        const nobleRec = new Uint8Array(65);
        nobleRec[0] = recId;
        nobleRec.set(raw.slice(1, 65), 1);

        const digest = bitcoinMessageHash(message);
        const compressedPk = secp256k1.recoverPublicKey(nobleRec, digest, { prehash: false });
        const compactSig = raw.slice(1, 65);
        const isSigValid = secp256k1.verify(compactSig, digest, compressedPk, { prehash: false });
        if (!isSigValid) {
          return {
            isBchSigValid: false,
            isAddressOwned: false,
            recoveredPubkeyHex: '',
            reason: 'Recovered key failed ECDSA verification'
          };
        }

        const keyForHash = isCompressed
          ? compressedPk
          : secp256k1.Point.fromBytes(compressedPk).toBytes(false);
        const recoveredHex = bytesToHex(compressedPk);
        const isAddressOwned = expectedAddress ? checkPubkeyMatchesAddress(keyForHash, expectedAddress) : false;
        const matchesPubkey =
          !expectedPubkeyHex || recoveredHex === expectedPubkeyHex.trim().toLowerCase();
        // Because ECDSA recovery almost always yields *some* curve point for arbitrary messages,
        // a BSM signature is only cryptographically valid for the claimed identity when the
        // recovered key matches the claimed CashAddress (and explicit pubkey, if present).
        const validForClaim = expectedAddress ? isAddressOwned && matchesPubkey : matchesPubkey;

        return {
          isBchSigValid: validForClaim,
          isAddressOwned,
          recoveredPubkeyHex: validForClaim ? recoveredHex : '',
          reason: validForClaim
            ? undefined
            : !isAddressOwned
            ? 'Recovered BSM key does not own the claimed CashAddress (message altered or wrong key)'
            : 'Recovered BSM key does not match claimed bch_pubkey'
        };
      }
    } catch {
      // Fall through to legacy hex path if applicable
    }
  }

  // Legacy raw ECDSA hex fallback (properly decoded as Uint8Array for @noble/curves v2)
  if (looksLikeHex && expectedPubkeyHex) {
    try {
      const sigBytes = hexToBytes(sigTrimmed);
      const pkBytes = hexToBytes(expectedPubkeyHex.trim());
      const statementHash = sha256(new TextEncoder().encode(message));
      const sigFormat = sigBytes.length === 64 ? 'compact' : 'der';
      const isSigValid =
        secp256k1.verify(sigBytes, statementHash, pkBytes, { prehash: false, format: sigFormat }) ||
        secp256k1.verify(sigBytes, statementHash, pkBytes, { prehash: true, format: sigFormat });
      const isAddressOwned = expectedAddress ? checkPubkeyMatchesAddress(pkBytes, expectedAddress) : false;
      return {
        isBchSigValid: isSigValid,
        isAddressOwned,
        recoveredPubkeyHex: isSigValid ? bytesToHex(pkBytes) : '',
        reason: !isSigValid
          ? 'ECDSA secp256k1 signature invalid'
          : isAddressOwned
          ? undefined
          : 'Public key hash160 does not match CashAddress'
      };
    } catch {
      return {
        isBchSigValid: false,
        isAddressOwned: false,
        recoveredPubkeyHex: '',
        reason: 'Malformed hex signature or public key'
      };
    }
  }

  return {
    isBchSigValid: false,
    isAddressOwned: false,
    recoveredPubkeyHex: '',
    reason: 'Unsupported or malformed BCH signature'
  };
}

/**
 * Full mutual cryptographic validation of a UserLink Kind 30078 Nostr binding event:
 * 1) Validates BIP-340 Schnorr signature (`verifyEvent`)
 * 2) Validates BCH signature + `hash160(pubkey) === CashAddress`
 * 3) Validates bidirectional JSON statement consistency (`statement.nostrPubkey === event.pubkey` & `statement.bchAddress === tag.bch`)
 */
export function verifyUserLinkEvent(foundEvent: NostrEvent): VerifiedUserLinkResult {
  // Strip any cached Symbol(verified) attached by nostr-tools finalizeEvent/verifyEvent
  // so every verification genuinely recomputes the SHA-256 event hash and BIP-340 Schnorr signature.
  const cleanEventForVerify: NostrEvent = {
    id: foundEvent.id,
    pubkey: foundEvent.pubkey,
    created_at: foundEvent.created_at,
    kind: foundEvent.kind,
    tags: Array.isArray(foundEvent.tags) ? foundEvent.tags.map((t) => [...t]) : [],
    content: foundEvent.content,
    sig: foundEvent.sig
  };
  const isNostrSigValid = Boolean(verifyEvent(cleanEventForVerify));
  const bchAddressTag = foundEvent.tags.find((t: string[]) => t[0] === 'bch')?.[1] || '';
  const bchPubkeyTag = foundEvent.tags.find((t: string[]) => t[0] === 'bch_pubkey')?.[1] || '';
  const bchSigTag = foundEvent.tags.find((t: string[]) => t[0] === 'bch_sig')?.[1] || '';
  const handleTag = foundEvent.tags.find((t: string[]) => t[0] === 'handle')?.[1] || '';
  const nip05Tag = foundEvent.tags.find((t: string[]) => t[0] === 'nip05')?.[1] || '';
  const sigSchemeTag =
    foundEvent.tags.find((t: string[]) => t[0] === 'sig_scheme')?.[1] ||
    (/^[0-9a-fA-F]{128,144}$/.test(bchSigTag) ? 'ecdsa-secp256k1-sha256' : 'bitcoin-signed-message');

  let parsedStatement: any = null;
  try {
    parsedStatement = JSON.parse(foundEvent.content);
  } catch {}

  const isMutualBindingValid = Boolean(
    parsedStatement &&
      typeof parsedStatement === 'object' &&
      parsedStatement.nostrPubkey === foundEvent.pubkey &&
      (!bchAddressTag || parsedStatement.bchAddress === bchAddressTag)
  );

  const bchCheck = verifyBitcoinMessageAndAddress({
    message: foundEvent.content,
    bchSig: bchSigTag,
    expectedAddress: bchAddressTag || parsedStatement?.bchAddress || '',
    expectedPubkeyHex: bchPubkeyTag || parsedStatement?.bchPubkeyHex || '',
    sigScheme: sigSchemeTag
  });

  const resolvedAddress = bchAddressTag || parsedStatement?.bchAddress || '';
  const resolvedHandle =
    handleTag || String(parsedStatement?.username || '').replace(/^@/, '') || 'user';

  let npub = '';
  try {
    npub = nip19.npubEncode(foundEvent.pubkey);
  } catch {
    npub = foundEvent.pubkey;
  }

  const isOverallValid =
    isNostrSigValid && bchCheck.isBchSigValid && bchCheck.isAddressOwned && isMutualBindingValid;

  let verificationNote = bchCheck.reason;
  if (!isNostrSigValid) verificationNote = 'Invalid Nostr BIP-340 Schnorr signature';
  else if (!isMutualBindingValid) verificationNote = 'Signed statement does not bind event pubkey and BCH address';

  return {
    npub,
    pubkeyHex: foundEvent.pubkey,
    bchAddress: resolvedAddress,
    bchPubkey: bchCheck.recoveredPubkeyHex || bchPubkeyTag,
    nip05: nip05Tag || `${resolvedHandle}@bliquid.xyz`,
    handle: `@${resolvedHandle}`,
    sigScheme: sigSchemeTag,
    event: foundEvent,
    timestamp: foundEvent.created_at,
    isNostrSigValid,
    isBchSigValid: bchCheck.isBchSigValid,
    isAddressOwned: bchCheck.isAddressOwned,
    isMutualBindingValid,
    isOverallValid,
    verificationNote
  };
}

function getAddressLookupVariants(raw: string): string[] {
  const variants = new Set<string>();
  const trimmed = raw.trim();
  if (!trimmed) return [];
  variants.add(trimmed);
  try {
    const mainBase = convertCashAddressNetwork(trimmed, false, false);
    const mainToken = convertCashAddressNetwork(trimmed, false, true);
    const testBase = convertCashAddressNetwork(trimmed, true, false);
    const testToken = convertCashAddressNetwork(trimmed, true, true);
    for (const v of [mainBase, mainToken, testBase, testToken]) {
      if (v && isValidCashAddress(v)) {
        variants.add(v);
        variants.add(`bch:${v}`);
      }
    }
  } catch {}
  return Array.from(variants);
}

/**
 * Resolves @handle, user@domain (NIP-05), npub1..., hex pubkey, or bitcoincash:/bchtest: address
 * directly against public Nostr relays using indexed single-letter NIP-01 tags (`#t`, `#i`, `authors`).
 */
export async function resolveUserLinkFromRelays(
  rawInput: string,
  relays: string[] = USERLINK_RELAYS,
  timeoutMs = 5500
): Promise<{
  verified: VerifiedUserLinkResult | null;
  nip05Fallback?: { handle: string; nip05: string; bchAddress: string; pubkeyHex: string };
}> {
  const rawTarget = rawInput.trim();
  if (!rawTarget) return { verified: null };

  const pool = new SimplePool();
  let nip05Fallback: { handle: string; nip05: string; bchAddress: string; pubkeyHex: string } | undefined;

  try {
    const filters: any[] = [];
    let expectedHandle = '';
    let expectedAddressVariants: string[] = [];
    let expectedPubkey = '';

    if (rawTarget.startsWith('npub1')) {
      const decoded = nip19.decode(rawTarget);
      if (decoded.type !== 'npub' || typeof decoded.data !== 'string') {
        throw new Error('INVALID_NPUB');
      }
      expectedPubkey = decoded.data;
      filters.push({ kinds: [30078], '#d': [USERLINK_D_TAG], authors: [expectedPubkey] });
    } else if (/^[0-9a-fA-F]{64}$/.test(rawTarget)) {
      expectedPubkey = rawTarget.toLowerCase();
      filters.push({ kinds: [30078], '#d': [USERLINK_D_TAG], authors: [expectedPubkey] });
    } else if (
      rawTarget.startsWith('bitcoincash:') ||
      rawTarget.startsWith('bchtest:') ||
      isValidCashAddress(convertCashAddressNetwork(rawTarget, false, false))
    ) {
      expectedAddressVariants = getAddressLookupVariants(rawTarget);
      const iTags = expectedAddressVariants.filter(v => v.startsWith('bch:'));
      const bareAddrs = expectedAddressVariants.filter(v => !v.startsWith('bch:'));
      if (iTags.length > 0) {
        filters.push({ kinds: [30078], '#d': [USERLINK_D_TAG], '#i': iTags });
      }
      if (bareAddrs.length > 0) {
        filters.push({ kinds: [30078], '#d': [USERLINK_D_TAG], '#t': bareAddrs });
      }
    } else {
      const noAt = rawTarget.replace(/^@/, '').trim();
      const [userPart, domainPart] = noAt.includes('@') ? noAt.split('@') : [noAt, 'bliquid.xyz'];
      expectedHandle = (userPart || '').toLowerCase().replace(/[^a-z0-9_-]/g, '');

      if (expectedHandle) {
        filters.push({ kinds: [30078], '#d': [USERLINK_D_TAG], '#t': [expectedHandle] });
      }

      // Query NIP-05 endpoint when a domain is specified or implied (`handle@domain` or `@handle`)
      if (domainPart && domainPart.includes('.') && expectedHandle) {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 3500);
          const res = await fetch(
            `https://${domainPart}/.well-known/nostr.json?name=${encodeURIComponent(expectedHandle)}`,
            { signal: controller.signal }
          );
          clearTimeout(timer);
          if (res.ok) {
            const json = await res.json();
            const pk = json?.names?.[expectedHandle];
            const bchAddr = json?.bch_addresses?.[expectedHandle];
            if (pk && /^[0-9a-fA-F]{64}$/.test(pk)) {
              expectedPubkey = pk.toLowerCase();
              filters.push({ kinds: [30078], '#d': [USERLINK_D_TAG], authors: [expectedPubkey] });
              if (bchAddr) {
                nip05Fallback = {
                  handle: `@${expectedHandle}`,
                  nip05: `${expectedHandle}@${domainPart}`,
                  bchAddress: bchAddr,
                  pubkeyHex: expectedPubkey
                };
              }
            }
          }
        } catch {
          // NIP-05 HTTP lookup is best-effort alongside relay search
        }
      }
    }

    if (filters.length === 0) {
      return { verified: null, nip05Fallback };
    }

    const queryPromise = Promise.all(
      filters.map(f =>
        pool.querySync(relays, f).catch(() => [] as NostrEvent[])
      )
    );

    const batches = await Promise.race([
      queryPromise,
      new Promise<NostrEvent[][]>(resolve => setTimeout(() => resolve([]), timeoutMs))
    ]);

    const eventsMap = new Map<string, NostrEvent>();
    for (const batch of batches) {
      for (const ev of batch) {
        if (!eventsMap.has(ev.id)) {
          eventsMap.set(ev.id, ev);
        }
      }
    }

    const candidates = Array.from(eventsMap.values()).sort((a, b) => b.created_at - a.created_at);
    for (const ev of candidates) {
      const checked = verifyUserLinkEvent(ev);
      if (expectedHandle && checked.handle.replace(/^@/, '').toLowerCase() !== expectedHandle) {
        continue;
      }
      if (expectedAddressVariants.length > 0) {
        const addrVariants = getAddressLookupVariants(checked.bchAddress);
        const hasIntersection = addrVariants.some(v => expectedAddressVariants.includes(v));
        if (!hasIntersection) continue;
      }
      if (expectedPubkey && checked.pubkeyHex.toLowerCase() !== expectedPubkey.toLowerCase()) {
        continue;
      }
      return { verified: checked, nip05Fallback };
    }

    return { verified: null, nip05Fallback };
  } finally {
    try {
      pool.close(relays);
    } catch {}
  }
}

export async function publishUserLinkToRelay(
  relayUrl: string,
  signedEvent: NostrEvent,
  timeoutMs = 5500
): Promise<{ ok: boolean; latency: number; error?: string }> {
  const pool = new SimplePool();
  const start = Date.now();
  try {
    await Promise.race([
      Promise.all(pool.publish([relayUrl], signedEvent)),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeoutMs))
    ]);
    return { ok: true, latency: Date.now() - start };
  } catch (err: any) {
    return {
      ok: false,
      latency: Date.now() - start,
      error: err?.message || 'Relay publish failed'
    };
  } finally {
    try {
      pool.close([relayUrl]);
    } catch {}
  }
}
