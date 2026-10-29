import { 
  decodeHdPublicKey, 
  deriveHdPublicNodeChild, 
  encodeCashAddress, 
  hash160 
} from '@bitauth/libauth';

/**
 * Derives a standard Bitcoin Cash CashAddress (P2PKH) from an xpub.
 * If the xpub is at receive chain level (depth 4, m/44'/145'/0'/0), it derives child index 0.
 * If at account level (depth 3, m/44'/145'/0'), it derives receive chain 0, then index 0.
 * If the input is already a CashAddr or 0x address, it returns it as-is.
 */
export function deriveCashAddressFromXpub(xpub: string): string {
  if (!xpub || typeof xpub !== 'string') return '';
  if (!xpub.startsWith('xpub')) return xpub;

  try {
    const decoded = decodeHdPublicKey(xpub);
    if (typeof decoded === 'string') {
      console.warn('Failed to decode xpub:', decoded);
      return xpub;
    }

    let node = decoded.node;
    // If account-level xpub (depth 3, e.g. m/44'/145'/0') -> derive receive chain (0)
    if (node.depth === 3) {
      const receiveChain = deriveHdPublicNodeChild(node, 0);
      if (typeof receiveChain === 'string') {
        console.warn('Failed to derive receive chain:', receiveChain);
        return xpub;
      }
      node = receiveChain;
    }

    // Derive first address index 0 (m/44'/145'/0'/0/0)
    const child0 = deriveHdPublicNodeChild(node, 0);
    if (typeof child0 === 'string') {
      console.warn('Failed to derive child 0:', child0);
      return xpub;
    }

    const res = encodeCashAddress({
      prefix: 'bitcoincash',
      type: 'p2pkh',
      payload: hash160(child0.publicKey)
    });

    if (typeof res !== 'string' && res.address) {
      return res.address;
    }
  } catch (err) {
    console.warn('Error deriving CashAddress from xpub:', err);
  }

  return xpub;
}

/**
 * Converts a raw 33-byte compressed public key to a bitcoincash: address.
 */
export function pubkeyToCashAddress(pubkey: Uint8Array): string {
  try {
    const res = encodeCashAddress({
      prefix: 'bitcoincash',
      type: 'p2pkh',
      payload: hash160(pubkey)
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
 * Cleanly formats an address for compact UI display.
 */
export function formatAddress(address: string): string {
  if (!address) return '';
  if (address.startsWith('bitcoincash:')) {
    const clean = address.replace('bitcoincash:', '');
    return `${clean.slice(0, 6)}...${clean.slice(-4)}`;
  }
  if (address.startsWith('0x')) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }
  if (address.startsWith('xpub')) {
    const derived = deriveCashAddressFromXpub(address);
    if (derived !== address) return formatAddress(derived);
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
