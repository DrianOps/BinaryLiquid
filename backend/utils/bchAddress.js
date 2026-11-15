import {
  cashAddressToLockingBytecode,
  lockingBytecodeToCashAddress,
  binToHex
} from '@bitauth/libauth';

function stripWcNamespace(raw) {
  const s = String(raw || '').trim();
  if (/^bch:(bitcoincash|bchtest):/i.test(s)) {
    return s.slice(4);
  }
  return s;
}

/**
 * Decodes any BCH CashAddress (lowercase, uppercase, token-aware z.../r...,
 * base q.../p..., or prefixless CashAddr) into canonical forms + locking bytecode.
 */
export function parseCashAddress(rawAddr, defaultTestnet = null) {
  const cleaned = stripWcNamespace(rawAddr);
  if (!cleaned) return null;

  const lower = cleaned.toLowerCase();
  const candidates = [];

  if (lower.includes(':')) {
    const [prefix, payload] = lower.split(':');
    if (prefix === 'bitcoincash' || prefix === 'bchtest') {
      candidates.push({ prefix, addr: `${prefix}:${payload}` });
    }
  } else if (/^[qpzr][a-z0-9]{40,80}$/.test(lower)) {
    if (defaultTestnet === true) {
      candidates.push({ prefix: 'bchtest', addr: `bchtest:${lower}` });
    } else if (defaultTestnet === false) {
      candidates.push({ prefix: 'bitcoincash', addr: `bitcoincash:${lower}` });
    } else {
      candidates.push({ prefix: 'bchtest', addr: `bchtest:${lower}` });
      candidates.push({ prefix: 'bitcoincash', addr: `bitcoincash:${lower}` });
    }
  }

  for (const cand of candidates) {
    const decoded = cashAddressToLockingBytecode(cand.addr);
    if (typeof decoded === 'string') continue;

    const baseEnc = lockingBytecodeToCashAddress({
      bytecode: decoded.bytecode,
      prefix: cand.prefix,
      tokenSupport: false
    });
    const tokEnc = lockingBytecodeToCashAddress({
      bytecode: decoded.bytecode,
      prefix: cand.prefix,
      tokenSupport: true
    });

    if (typeof baseEnc === 'string' || typeof tokEnc === 'string') continue;

    return {
      prefix: cand.prefix,
      isTestnet: cand.prefix === 'bchtest',
      bytecode: decoded.bytecode,
      bytecodeHex: binToHex(decoded.bytecode),
      baseAddress: baseEnc.address.toLowerCase(),
      tokenAddress: tokEnc.address.toLowerCase()
    };
  }

  return null;
}

export function isValidBchAddress(rawAddr, defaultTestnet = null) {
  return Boolean(parseCashAddress(rawAddr, defaultTestnet));
}

export function splitCashAddresses(rawInput) {
  if (!rawInput || typeof rawInput !== 'string') return [];
  return rawInput
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

/**
 * Expands a BCH address (or comma-separated HD address list) to all canonical
 * base (q.../p...) and token-aware (z.../r...) forms on the matching network.
 */
export function expandBchAddressVariants(rawInput, defaultTestnet = null) {
  const variants = new Set();
  for (const part of splitCashAddresses(rawInput)) {
    const parsed = parseCashAddress(part, defaultTestnet);
    if (parsed) {
      variants.add(parsed.baseAddress);
      variants.add(parsed.tokenAddress);
    } else {
      const low = String(part).trim().toLowerCase();
      if (low) variants.add(low);
    }
  }
  return Array.from(variants);
}

export function isSameBchAddress(addrA, addrB) {
  if (!addrA || !addrB) return false;
  const parsedA = parseCashAddress(addrA);
  const parsedB = parseCashAddress(addrB);
  if (parsedA && parsedB) {
    return parsedA.prefix === parsedB.prefix && parsedA.bytecodeHex === parsedB.bytecodeHex;
  }
  return String(addrA).trim().toLowerCase() === String(addrB).trim().toLowerCase();
}
