import { SimplePool, finalizeEvent, verifyEvent, nip19, type Event as NostrEvent } from 'nostr-tools';
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
export const USERLINK_ATTESTATION_LABEL = 'userlink.vc.v1';

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
  previousNostrPubkey?: string;
  rotationAuthorized?: boolean;
  anchorTxId?: string;
  commitmentHashHex?: string;
  verificationNote?: string;
}

export interface UserLinkAttestationResult {
  eventId: string;
  issuerPubkeyHex: string;
  issuerNpub: string;
  subjectPubkeyHex: string;
  claimType: string;
  claimSummary: string;
  rating?: number;
  saltedCommitments: Record<string, string>;
  issuedAt: number;
  isSigValid: boolean;
  isOverallValid: boolean;
  rawCredential: Record<string, unknown>;
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
  const prevNostrTag = foundEvent.tags.find((t: string[]) => t[0] === 'prev_nostr')?.[1] || '';
  const anchorTxTag = foundEvent.tags.find((t: string[]) => t[0] === 'anchor_tx')?.[1] || '';
  const sigSchemeTag =
    foundEvent.tags.find((t: string[]) => t[0] === 'sig_scheme')?.[1] ||
    (/^[0-9a-fA-F]{128,144}$/.test(bchSigTag) ? 'ecdsa-secp256k1-sha256' : 'bitcoin-signed-message');

  let parsedStatement: any = null;
  try {
    parsedStatement = JSON.parse(foundEvent.content);
  } catch {}

  const previousNostrPubkey = (
    prevNostrTag ||
    (typeof parsedStatement?.previousNostrPubkey === 'string' ? parsedStatement.previousNostrPubkey : '')
  )
    .trim()
    .toLowerCase();

  const isMutualBindingValid = Boolean(
    parsedStatement &&
      typeof parsedStatement === 'object' &&
      parsedStatement.nostrPubkey === foundEvent.pubkey &&
      (!bchAddressTag || parsedStatement.bchAddress === bchAddressTag) &&
      (!prevNostrTag || parsedStatement.previousNostrPubkey === prevNostrTag)
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

  const rotationAuthorized = Boolean(
    isOverallValid && /^[0-9a-f]{64}$/.test(previousNostrPubkey) && previousNostrPubkey !== foundEvent.pubkey
  );

  const commitmentHashHex = computeUserLinkCommitmentHash(foundEvent.content);

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
    ...(previousNostrPubkey ? { previousNostrPubkey } : {}),
    rotationAuthorized,
    ...(anchorTxTag ? { anchorTxId: anchorTxTag.trim().toLowerCase() } : {}),
    commitmentHashHex,
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
    let expectedNip05 = '';
    let requireHttpNip05 = false;

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
      const hasExplicitDomain = noAt.includes('@');
      const [userPart, domainPart] = hasExplicitDomain ? noAt.split('@') : [noAt, 'bliquid.xyz'];
      expectedHandle = (userPart || '').toLowerCase().replace(/[^a-z0-9_-]/g, '');
      const cleanDomain = (domainPart || '').trim().toLowerCase();

      if (hasExplicitDomain) {
        if (!cleanDomain || !cleanDomain.includes('.') || !expectedHandle) {
          return { verified: null };
        }
        expectedNip05 = `${expectedHandle}@${cleanDomain}`;
        requireHttpNip05 = true;
      }

      if (expectedHandle && !requireHttpNip05) {
        filters.push({ kinds: [30078], '#d': [USERLINK_D_TAG], '#t': [expectedHandle] });
      }

      // Query NIP-05 endpoint when a domain is specified or implied (`handle@domain` or `@handle`)
      if (cleanDomain && cleanDomain.includes('.') && expectedHandle) {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 3500);
          const res = await fetch(
            `https://${cleanDomain}/.well-known/nostr.json?name=${encodeURIComponent(expectedHandle)}`,
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
                  nip05: `${expectedHandle}@${cleanDomain}`,
                  bchAddress: bchAddr,
                  pubkeyHex: expectedPubkey
                };
              }
            }
          }
        } catch {
          // NIP-05 HTTP lookup is best-effort unless an explicit domain was queried
        }
      }

      if (requireHttpNip05 && !expectedPubkey) {
        return { verified: null };
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
      if (!checked.isOverallValid) {
        continue;
      }
      if (expectedHandle && checked.handle.replace(/^@/, '').toLowerCase() !== expectedHandle) {
        continue;
      }
      if (expectedNip05 && (checked.nip05 || '').trim().toLowerCase() !== expectedNip05) {
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

/**
 * Computes the deterministic SHA-256 commitment hash prefixed with `UL1:`
 * used for optional Bitcoin Cash `OP_RETURN` on-chain anchoring.
 */
export function computeUserLinkCommitmentHash(statementContent: string): string {
  const prefixed = new TextEncoder().encode(`UL1:${statementContent}`);
  return bytesToHex(sha256(prefixed));
}

/**
 * Builds the raw Bitcoin Cash script hex (`OP_RETURN <"UL1:" + 32-byte sha256>`)
 * for anchoring a UserLink cryptographic binding directly on Bitcoin Cash.
 */
export function buildBchOpReturnScriptHex(statementContent: string): string {
  const hashHex = computeUserLinkCommitmentHash(statementContent);
  // 0x6a = OP_RETURN, 0x24 = push 36 bytes ("UL1:" 4 bytes + sha256 32 bytes)
  return `6a24554c313a${hashHex}`;
}

/**
 * Generates a standard W3C DID Core Document (`did:nostr` + `did:pkh:bch`)
 * directly from a verified UserLink Kind 30078 proof without central servers.
 */
export function buildUserLinkDidDocument(verified: VerifiedUserLinkResult): Record<string, unknown> {
  const didId = `did:nostr:${verified.pubkeyHex}`;
  const isChipnet = verified.bchAddress.startsWith('bchtest:');
  const bchRaw = verified.bchAddress.includes(':')
    ? verified.bchAddress.split(':')[1]
    : verified.bchAddress;
  const didBch = `did:pkh:bch:${isChipnet ? 'chipnet' : 'mainnet'}:${bchRaw}`;

  return {
    '@context': [
      'https://www.w3.org/ns/did/v1',
      'https://w3id.org/security/suites/secp256k1-2019/v1'
    ],
    id: didId,
    alsoKnownAs: [
      didBch,
      `acct:${verified.nip05}`,
      verified.npub,
      ...(verified.previousNostrPubkey ? [`did:nostr:${verified.previousNostrPubkey}`] : [])
    ],
    verificationMethod: [
      {
        id: `${didId}#nostr-key`,
        type: 'SchnorrSecp256k1VerificationKey2019',
        controller: didId,
        publicKeyHex: verified.pubkeyHex
      },
      {
        id: `${didId}#bch-key`,
        type: 'EcdsaSecp256k1RecoveryMethod2020',
        controller: didId,
        ...(verified.bchPubkey ? { publicKeyHex: verified.bchPubkey } : {}),
        blockchainAccountId: `bch:${isChipnet ? 'chipnet' : 'mainnet'}:${verified.bchAddress}`
      }
    ],
    authentication: [`${didId}#nostr-key`, `${didId}#bch-key`],
    assertionMethod: [`${didId}#nostr-key`],
    service: [
      {
        id: `${didId}#nostr-relays`,
        type: 'NostrRelayRegistry',
        serviceEndpoint: USERLINK_RELAYS
      },
      {
        id: `${didId}#nip05`,
        type: 'LinkedDomains',
        serviceEndpoint: `https://bliquid.xyz/.well-known/nostr.json?name=${encodeURIComponent(
          verified.handle.replace(/^@/, '')
        )}`
      }
    ]
  };
}

/**
 * Privacy-preserving salted commitment helper for Selective Disclosure.
 */
export function createSaltedDisclosureCommitment(
  salt: string,
  attribute: string,
  value: string
): string {
  const payload = `ul_sd_v1:${salt}:${attribute.trim().toLowerCase()}:${value.trim()}`;
  return bytesToHex(sha256(new TextEncoder().encode(payload)));
}

export function verifySelectiveDisclosure(params: {
  salt: string;
  attribute: string;
  value: string;
  commitmentHex: string;
}): boolean {
  if (!params.salt || !params.attribute || !params.commitmentHex) return false;
  const computed = createSaltedDisclosureCommitment(params.salt, params.attribute, params.value);
  return computed === params.commitmentHex.trim().toLowerCase();
}

/**
 * Builds & signs a Nostr Kind 1985 (NIP-32) Verifiable Credential / Portable Reputation attestation.
 */
export function createSignedAttestationEvent(params: {
  subjectPubkeyHex: string;
  subjectBchAddress: string;
  subjectHandle?: string;
  claimType: string;
  claimSummary: string;
  rating?: number;
  saltedCommitments?: Record<string, string>;
  issuerSkBytes: Uint8Array;
}): NostrEvent {
  const now = Math.floor(Date.now() / 1000);
  const credential = {
    '@context': ['https://www.w3.org/ns/credentials/v2'],
    type: ['VerifiableCredential', 'UserLinkAttestation'],
    issuer: '', // populated after pubkey derivation below
    validFrom: new Date(now * 1000).toISOString(),
    credentialSubject: {
      id: `did:nostr:${params.subjectPubkeyHex.toLowerCase()}`,
      bchAddress: params.subjectBchAddress,
      ...(params.subjectHandle ? { handle: params.subjectHandle } : {}),
      claimType: params.claimType,
      summary: params.claimSummary,
      ...(params.rating !== undefined ? { rating: params.rating } : {}),
      ...(params.saltedCommitments && Object.keys(params.saltedCommitments).length > 0
        ? { saltedCommitments: params.saltedCommitments }
        : {})
    }
  };

  // Sign provisional to get issuer pubkey deterministically via finalizeEvent
  const tempSigned = finalizeEvent(
    {
      kind: 1985,
      created_at: now,
      tags: [
        ['L', USERLINK_ATTESTATION_LABEL],
        ['l', params.claimType, USERLINK_ATTESTATION_LABEL],
        ['p', params.subjectPubkeyHex.toLowerCase()],
        ['i', `bch:${params.subjectBchAddress}`]
      ],
      content: ''
    },
    params.issuerSkBytes
  );

  credential.issuer = `did:nostr:${tempSigned.pubkey}`;
  return finalizeEvent(
    {
      kind: 1985,
      created_at: now,
      tags: tempSigned.tags,
      content: JSON.stringify(credential)
    },
    params.issuerSkBytes
  );
}

/**
 * Cryptographically validates a Kind 1985 (NIP-32) W3C Verifiable Credential attestation event.
 */
export function verifyAttestationEvent(event: NostrEvent): UserLinkAttestationResult {
  const clean: NostrEvent = {
    id: event.id,
    pubkey: event.pubkey,
    created_at: event.created_at,
    kind: event.kind,
    tags: Array.isArray(event.tags) ? event.tags.map((t) => [...t]) : [],
    content: event.content,
    sig: event.sig
  };
  const isSigValid = Boolean(verifyEvent(clean));

  let parsed: any = {};
  try {
    parsed = JSON.parse(event.content);
  } catch {}

  const pTag = clean.tags.find((t) => t[0] === 'p')?.[1]?.toLowerCase() || '';
  const lTag = clean.tags.find((t) => t[0] === 'l')?.[1] || '';
  const subj = parsed?.credentialSubject || {};
  const matchesSubject = Boolean(pTag && subj.id === `did:nostr:${pTag}`);
  const matchesIssuer = !parsed?.issuer || parsed.issuer === `did:nostr:${event.pubkey}`;

  let issuerNpub = event.pubkey;
  try {
    issuerNpub = nip19.npubEncode(event.pubkey);
  } catch {}

  const isOverallValid =
    isSigValid &&
    clean.kind === 1985 &&
    matchesSubject &&
    matchesIssuer &&
    Boolean(subj.claimType || lTag);

  return {
    eventId: event.id,
    issuerPubkeyHex: event.pubkey,
    issuerNpub,
    subjectPubkeyHex: pTag,
    claimType: String(subj.claimType || lTag || 'Attestation'),
    claimSummary: String(subj.summary || ''),
    ...(typeof subj.rating === 'number' ? { rating: subj.rating } : {}),
    saltedCommitments:
      subj.saltedCommitments && typeof subj.saltedCommitments === 'object'
        ? subj.saltedCommitments
        : {},
    issuedAt: event.created_at,
    isSigValid,
    isOverallValid,
    rawCredential: parsed
  };
}

/**
 * Fetches and verifies Kind 1985 portable W3C attestations from Nostr relays for a subject pubkey.
 */
export async function fetchAttestationsFromRelays(
  subjectPubkeyHex: string,
  relays: string[] = USERLINK_RELAYS,
  timeoutMs = 4500
): Promise<UserLinkAttestationResult[]> {
  const cleanPk = (subjectPubkeyHex || '').trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(cleanPk)) return [];

  const pool = new SimplePool();
  try {
    const events = await Promise.race([
      pool.querySync(relays, {
        kinds: [1985],
        '#p': [cleanPk],
        '#L': [USERLINK_ATTESTATION_LABEL]
      }).catch(() => [] as NostrEvent[]),
      new Promise<NostrEvent[]>(resolve => setTimeout(() => resolve([]), timeoutMs))
    ]);

    const seen = new Set<string>();
    const results: UserLinkAttestationResult[] = [];
    for (const ev of events.sort((a, b) => b.created_at - a.created_at)) {
      if (seen.has(ev.id)) continue;
      seen.add(ev.id);
      const checked = verifyAttestationEvent(ev);
      if (checked.isOverallValid) results.push(checked);
    }
    return results;
  } finally {
    try {
      pool.close(relays);
    } catch {}
  }
}

/**
 * Verifies an optional on-chain Bitcoin Cash OP_RETURN commitment (`UL1:<sha256>`)
 * against the Electrum transaction inspection API.
 */
export async function verifyBchOnChainAnchor(params: {
  txid: string;
  statementContent: string;
  network: 'mainnet' | 'testnet';
  apiBase?: string;
}): Promise<{
  verifiedOnChain: boolean;
  confirmations: number;
  commitmentHex: string;
  matchedScriptHex?: string;
  reason?: string;
}> {
  const expectedHex = computeUserLinkCommitmentHash(params.statementContent);
  const cleanTxid = (params.txid || '').trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(cleanTxid)) {
    return { verifiedOnChain: false, confirmations: 0, commitmentHex: expectedHex, reason: 'Invalid txid format' };
  }

  const base = (params.apiBase || '').replace(/\/+$/, '');
  const res = await fetch(
    `${base}/api/bch/tx/${encodeURIComponent(cleanTxid)}?network=${params.network}`
  );
  const data = await res.json();
  if (!res.ok || !data?.success) {
    return {
      verifiedOnChain: false,
      confirmations: 0,
      commitmentHex: expectedHex,
      reason: data?.error || 'Transaction not found on BCH Electrum'
    };
  }

  const opReturns: Array<{ scriptHex: string; payloadHex: string }> = data.opReturns || [];
  const matched = opReturns.find(
    (o) =>
      String(o.payloadHex || '').toLowerCase().includes(expectedHex) ||
      String(o.scriptHex || '').toLowerCase().includes(expectedHex)
  );

  return {
    verifiedOnChain: Boolean(matched),
    confirmations: Number(data.confirmations || 0),
    commitmentHex: expectedHex,
    ...(matched ? { matchedScriptHex: matched.scriptHex } : {}),
    ...(matched ? {} : { reason: 'No matching UL1 SHA-256 OP_RETURN commitment found in transaction outputs' })
  };
}
