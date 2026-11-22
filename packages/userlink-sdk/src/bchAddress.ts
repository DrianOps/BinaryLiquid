import { sha256 } from '@noble/hashes/sha2.js';
import { ripemd160 } from '@noble/hashes/legacy.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';

export { bytesToHex as binToHex, hexToBytes as hexToBin };

export type CashAddressType = 'p2pkh' | 'p2sh' | 'p2pkhWithTokens' | 'p2shWithTokens';

export interface DecodedCashAddress {
  prefix: string;
  type: CashAddressType;
  payload: Uint8Array;
}

const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
const CHARSET_MAP: Record<string, number> = Object.fromEntries(
  Array.from(CHARSET).map((ch, idx) => [ch, idx])
);

const SIZE_BITS_TO_BYTES: Record<number, number> = {
  0: 20,
  1: 24,
  2: 28,
  3: 32,
  4: 40,
  5: 48,
  6: 56,
  7: 64
};

const BYTES_TO_SIZE_BITS: Record<number, number> = Object.fromEntries(
  Object.entries(SIZE_BITS_TO_BYTES).map(([bits, bytes]) => [bytes, Number(bits)])
);

const TYPE_CODE_TO_NAME: Record<number, CashAddressType> = {
  0: 'p2pkh',
  1: 'p2sh',
  2: 'p2pkhWithTokens',
  3: 'p2shWithTokens'
};

const TYPE_NAME_TO_CODE: Record<CashAddressType, number> = {
  p2pkh: 0,
  p2sh: 1,
  p2pkhWithTokens: 2,
  p2shWithTokens: 3
};

/**
 * Pure synchronous HASH160 = RIPEMD-160(SHA-256(data)) with zero WASM / top-level await.
 */
export function hash160(data: Uint8Array): Uint8Array {
  return ripemd160(sha256(data));
}

function polymod(values: number[]): bigint {
  let c = 1n;
  for (const d of values) {
    const c0 = c >> 35n;
    c = ((c & 0x07ffffffffn) << 5n) ^ BigInt(d);
    if ((c0 & 1n) !== 0n) c ^= 0x98f2bc8e61n;
    if ((c0 & 2n) !== 0n) c ^= 0x79b76d99e2n;
    if ((c0 & 4n) !== 0n) c ^= 0xf33e5fb3c4n;
    if ((c0 & 8n) !== 0n) c ^= 0xae2eabe2a8n;
    if ((c0 & 16n) !== 0n) c ^= 0x1e4f43e470n;
  }
  return c ^ 1n;
}

function prefixToWords(prefix: string): number[] {
  const words: number[] = [];
  for (let i = 0; i < prefix.length; i++) {
    words.push(prefix.charCodeAt(i) & 0x1f);
  }
  words.push(0);
  return words;
}

function convertBits(data: Uint8Array | number[], fromBits: number, toBits: number, pad: boolean): number[] | null {
  let acc = 0;
  let bits = 0;
  const maxv = (1 << toBits) - 1;
  const ret: number[] = [];
  for (const value of data) {
    if (value < 0 || value >> fromBits !== 0) return null;
    acc = (acc << fromBits) | value;
    bits += fromBits;
    while (bits >= toBits) {
      bits -= toBits;
      ret.push((acc >> bits) & maxv);
    }
  }
  if (pad) {
    if (bits > 0) {
      ret.push((acc << (toBits - bits)) & maxv);
    }
  } else {
    if (bits >= fromBits) return null;
    if (((acc << (toBits - bits)) & maxv) !== 0) return null;
  }
  return ret;
}

/**
 * Decodes and checksum-verifies a Bitcoin Cash CashAddress (`bitcoincash:` or `bchtest:`).
 */
export function decodeCashAddress(address: string): DecodedCashAddress | string {
  if (!address || typeof address !== 'string') return 'Invalid address';
  const trimmed = address.trim();
  const hasLower = trimmed !== trimmed.toUpperCase();
  const hasUpper = trimmed !== trimmed.toLowerCase();
  if (hasLower && hasUpper) return 'Mixed case CashAddress is invalid';

  const lower = trimmed.toLowerCase();
  const colonIdx = lower.indexOf(':');
  if (colonIdx <= 0 || colonIdx !== lower.lastIndexOf(':')) {
    return 'CashAddress must contain prefix:payload';
  }

  const prefix = lower.slice(0, colonIdx);
  const payloadStr = lower.slice(colonIdx + 1);
  if (payloadStr.length < 10) return 'CashAddress payload too short';

  const dataWords: number[] = [];
  for (let i = 0; i < payloadStr.length; i++) {
    const val = CHARSET_MAP[payloadStr[i]];
    if (val === undefined) return 'Invalid CashAddress character';
    dataWords.push(val);
  }

  const checksumInput = [...prefixToWords(prefix), ...dataWords];
  if (polymod(checksumInput) !== 0n) {
    return 'Invalid CashAddress checksum';
  }

  const payloadWords = dataWords.slice(0, -8);
  const bytes = convertBits(payloadWords, 5, 8, false);
  if (!bytes || bytes.length < 21) return 'Invalid CashAddress bit encoding';

  const versionByte = bytes[0];
  if ((versionByte & 0x80) !== 0) return 'Invalid CashAddress version MSB';
  const typeCode = (versionByte >> 3) & 0x0f;
  const sizeBits = versionByte & 0x07;
  const type = TYPE_CODE_TO_NAME[typeCode];
  const expectedLen = SIZE_BITS_TO_BYTES[sizeBits];
  if (!type || !expectedLen) return 'Unsupported CashAddress version or hash size';

  const payload = new Uint8Array(bytes.slice(1));
  if (payload.length !== expectedLen) return 'CashAddress payload length mismatch';

  return { prefix, type, payload };
}

/**
 * Encodes a payload into a valid Bitcoin Cash CashAddress with 40-bit polymod checksum.
 */
export function encodeCashAddress(params: {
  prefix: 'bitcoincash' | 'bchtest' | string;
  type: CashAddressType;
  payload: Uint8Array;
}): { address: string } | string {
  const typeCode = TYPE_NAME_TO_CODE[params.type];
  const sizeBits = BYTES_TO_SIZE_BITS[params.payload.length];
  if (typeCode === undefined || sizeBits === undefined) {
    return 'Unsupported CashAddress type or payload length';
  }

  const versionByte = (typeCode << 3) | sizeBits;
  const raw = new Uint8Array(1 + params.payload.length);
  raw[0] = versionByte;
  raw.set(params.payload, 1);

  const payloadWords = convertBits(raw, 8, 5, true);
  if (!payloadWords) return 'Failed encoding CashAddress words';

  const mod = polymod([...prefixToWords(params.prefix), ...payloadWords, 0, 0, 0, 0, 0, 0, 0, 0]);
  const checksumWords: number[] = [];
  for (let i = 7; i >= 0; i--) {
    checksumWords.push(Number((mod >> BigInt(i * 5)) & 31n));
  }

  const encoded = [...payloadWords, ...checksumWords].map((w) => CHARSET[w]).join('');
  return { address: `${params.prefix}:${encoded}` };
}

/**
 * Converts a 33-byte compressed public key (Uint8Array or hex string) to a Bitcoin Cash CashAddress.
 */
export function pubkeyToCashAddress(
  pubkey: Uint8Array | string,
  isTestnet = false,
  tokenAware = false
): string {
  try {
    const rawBytes = typeof pubkey === 'string' ? hexToBytes(pubkey.replace(/^0x/, '')) : pubkey;
    if (!rawBytes || rawBytes.length < 32) return '';

    const res = encodeCashAddress({
      prefix: isTestnet ? 'bchtest' : 'bitcoincash',
      type: tokenAware ? 'p2pkhWithTokens' : 'p2pkh',
      payload: hash160(rawBytes)
    });
    if (typeof res !== 'string' && res.address) {
      return res.address;
    }
  } catch {}
  return '';
}

/**
 * Converts any valid CashAddress (`bitcoincash:` or `bchtest:`, `q...` or `z...`, `p...` or `r...`)
 * to the target network (`bchtest` vs `bitcoincash`) and token-awareness (`z...`/`r...` vs `q...`/`p...`).
 */
export function convertCashAddressNetwork(
  address: string,
  isTestnet: boolean,
  tokenAware = false
): string {
  if (!address || typeof address !== 'string') return '';
  if (address.includes(',')) {
    return address
      .split(',')
      .map((a) => convertCashAddressNetwork(a.trim(), isTestnet, tokenAware))
      .filter(Boolean)
      .join(',');
  }

  let clean = address.trim();
  if (clean.startsWith('bch:bitcoincash:')) {
    clean = clean.slice(4);
  } else if (clean.startsWith('bch:bchtest:')) {
    clean = clean.slice(4);
  }

  if (!clean.includes(':') && /^[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{40,54}$/i.test(clean)) {
    const tryTest = decodeCashAddress(`bchtest:${clean}`);
    if (typeof tryTest !== 'string') {
      clean = `bchtest:${clean}`;
    } else {
      const tryMain = decodeCashAddress(`bitcoincash:${clean}`);
      if (typeof tryMain !== 'string') {
        clean = `bitcoincash:${clean}`;
      }
    }
  }

  const decoded = decodeCashAddress(clean);
  if (typeof decoded === 'string') return clean;

  const isP2sh = decoded.type === 'p2sh' || decoded.type === 'p2shWithTokens';
  const targetType: CashAddressType = isP2sh
    ? tokenAware
      ? 'p2shWithTokens'
      : 'p2sh'
    : tokenAware
    ? 'p2pkhWithTokens'
    : 'p2pkh';

  const encoded = encodeCashAddress({
    prefix: isTestnet ? 'bchtest' : 'bitcoincash',
    type: targetType,
    payload: decoded.payload
  });
  return typeof encoded !== 'string' ? encoded.address : clean;
}

/**
 * Validates whether a string is a valid Bitcoin Cash CashAddress (`bitcoincash:` or `bchtest:`).
 */
export function isValidCashAddress(address: string, requireTestnet?: boolean): boolean {
  if (!address || typeof address !== 'string') return false;
  if (address.includes(',')) {
    const parts = address
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return false;
    return parts.every((p) => isValidCashAddress(p, requireTestnet));
  }
  const decoded = decodeCashAddress(address.trim());
  if (typeof decoded === 'string') return false;
  if (requireTestnet === true) return decoded.prefix === 'bchtest';
  if (requireTestnet === false) return decoded.prefix === 'bitcoincash';
  return decoded.prefix === 'bchtest' || decoded.prefix === 'bitcoincash';
}
