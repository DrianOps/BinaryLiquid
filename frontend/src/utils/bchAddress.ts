import {
  decodeHdPublicKey,
  deriveHdPublicNodeChild,
  encodeCashAddress,
  cashAddressToLockingBytecode,
  lockingBytecodeToCashAddress,
  hexToBin,
  binToHex,
  hash160
} from '@bitauth/libauth';
import qrGenerator from 'qrcode-generator';

export { binToHex, hexToBin };

/**
 * Derives a standard or token-aware Bitcoin Cash CashAddress (P2PKH) from an xpub or tpub.
 * Supports both Mainnet (`bitcoincash:`) and Chipnet Testnet (`bchtest:`), plus CashTokens (`z...`).
 */
export function deriveCashAddressFromXpub(
  xpub: string,
  isTestnet = false,
  tokenAware = false
): string {
  if (!xpub || typeof xpub !== 'string') return '';
  const trimmed = xpub.trim();

  if (trimmed.startsWith('bitcoincash:') || trimmed.startsWith('bchtest:')) {
    return convertCashAddressNetwork(trimmed, isTestnet, tokenAware);
  }
  if (!trimmed.startsWith('xpub') && !trimmed.startsWith('tpub')) {
    return trimmed;
  }

  try {
    const decoded = decodeHdPublicKey(trimmed);
    if (typeof decoded === 'string') {
      console.warn('Failed to decode HD public key:', decoded);
      return trimmed;
    }

    let node = decoded.node;
    // Account-level xpub/tpub (depth 3, m/44'/145'/0') -> derive receive chain (0)
    if (node.depth === 3) {
      const receiveChain = deriveHdPublicNodeChild(node, 0);
      if (typeof receiveChain === 'string') {
        console.warn('Failed to derive receive chain:', receiveChain);
        return trimmed;
      }
      node = receiveChain;
    }

    // Derive first address index 0 (m/44'/145'/0'/0/0)
    const child0 = deriveHdPublicNodeChild(node, 0);
    if (typeof child0 === 'string') {
      console.warn('Failed to derive child 0:', child0);
      return trimmed;
    }

    return pubkeyToCashAddress(child0.publicKey, isTestnet, tokenAware) || trimmed;
  } catch (err) {
    console.warn('Error deriving CashAddress from xpub/tpub:', err);
  }

  return trimmed;
}

/**
 * Converts a 33-byte compressed public key (Uint8Array or hex string) to a CashAddress.
 */
export function pubkeyToCashAddress(
  pubkey: Uint8Array | string,
  isTestnet = false,
  tokenAware = false
): string {
  try {
    const rawBytes = typeof pubkey === 'string' ? hexToBin(pubkey.replace(/^0x/, '')) : pubkey;
    if (!rawBytes || rawBytes.length < 32) return '';

    const res = encodeCashAddress({
      prefix: isTestnet ? 'bchtest' : 'bitcoincash',
      type: tokenAware ? 'p2pkhWithTokens' : 'p2pkh',
      payload: hash160(rawBytes)
    });
    if (typeof res !== 'string' && res.address) {
      return res.address;
    }
  } catch (err) {
    console.warn('Error converting pubkey to CashAddress:', err);
  }
  return '';
}

/**
 * Converts any valid CashAddress (`bitcoincash:` or `bchtest:`, `q...` or `z...`)
 * to the target network (`bchtest` vs `bitcoincash`) and token-awareness (`z...` vs `q...`).
 */
export function convertCashAddressNetwork(
  address: string,
  isTestnet: boolean,
  tokenAware = false
): string {
  if (!address || typeof address !== 'string') return '';
  let clean = address.trim();

  // Strip CAIP-10 prefix if present (e.g., "bch:bchtest:qp..." -> "bchtest:qp...")
  if (clean.startsWith('bch:bitcoincash:')) {
    clean = clean.slice(4);
  } else if (clean.startsWith('bch:bchtest:')) {
    clean = clean.slice(4);
  }

  // Add default prefix if bare CashAddr payload was provided
  if (!clean.includes(':') && /^[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{40,54}$/i.test(clean)) {
    const tryTest = cashAddressToLockingBytecode(`bchtest:${clean}`);
    if (typeof tryTest !== 'string') {
      clean = `bchtest:${clean}`;
    } else {
      const tryMain = cashAddressToLockingBytecode(`bitcoincash:${clean}`);
      if (typeof tryMain !== 'string') {
        clean = `bitcoincash:${clean}`;
      }
    }
  }

  try {
    const decoded = cashAddressToLockingBytecode(clean);
    if (typeof decoded === 'string') {
      return clean;
    }

    const encoded = lockingBytecodeToCashAddress({
      bytecode: decoded.bytecode,
      prefix: isTestnet ? 'bchtest' : 'bitcoincash',
      tokenSupport: tokenAware
    });

    if (typeof encoded !== 'string' && encoded.address) {
      return encoded.address;
    }
  } catch (_) {
    // Fallback to original address
  }

  return clean;
}

/**
 * Validates whether a string is a valid Bitcoin Cash CashAddress.
 */
export function isValidCashAddress(address: string, requireTestnet?: boolean): boolean {
  if (!address || typeof address !== 'string') return false;
  const clean = address.trim();
  const decoded = cashAddressToLockingBytecode(clean);
  if (typeof decoded === 'string') return false;
  if (requireTestnet === true) return decoded.prefix === 'bchtest';
  if (requireTestnet === false) return decoded.prefix === 'bitcoincash';
  return decoded.prefix === 'bchtest' || decoded.prefix === 'bitcoincash';
}

/**
 * Generates an offline-capable Data URL QR image for WalletConnect URIs or CashAddresses.
 */
export function generateQrDataUrl(value: string, cellSize = 6, margin = 2): string {
  if (!value) return '';
  try {
    const qr = qrGenerator(0, 'M');
    qr.addData(value);
    qr.make();
    return qr.createDataURL(cellSize, margin);
  } catch (err) {
    console.warn('QR generation error:', err);
    return '';
  }
}

/**
 * Cleanly formats any BCH or EVM address for compact UI pills.
 */
export function formatAddress(address: string): string {
  if (!address) return '';
  if (address.startsWith('bitcoincash:')) {
    const clean = address.replace('bitcoincash:', '');
    return `${clean.slice(0, 6)}...${clean.slice(-4)}`;
  }
  if (address.startsWith('bchtest:')) {
    const clean = address.replace('bchtest:', '');
    return `bchtest:${clean.slice(0, 5)}...${clean.slice(-4)}`;
  }
  if (address.startsWith('0x')) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }
  if (address.startsWith('xpub') || address.startsWith('tpub')) {
    const derived = deriveCashAddressFromXpub(address);
    if (derived !== address) return formatAddress(derived);
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
