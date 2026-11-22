import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
export { bytesToHex as binToHex, hexToBytes as hexToBin };
export type CashAddressType = 'p2pkh' | 'p2sh' | 'p2pkhWithTokens' | 'p2shWithTokens';
export interface DecodedCashAddress {
    prefix: string;
    type: CashAddressType;
    payload: Uint8Array;
}
/**
 * Pure synchronous HASH160 = RIPEMD-160(SHA-256(data)) with zero WASM / top-level await.
 */
export declare function hash160(data: Uint8Array): Uint8Array;
/**
 * Decodes and checksum-verifies a Bitcoin Cash CashAddress (`bitcoincash:` or `bchtest:`).
 */
export declare function decodeCashAddress(address: string): DecodedCashAddress | string;
/**
 * Encodes a payload into a valid Bitcoin Cash CashAddress with 40-bit polymod checksum.
 */
export declare function encodeCashAddress(params: {
    prefix: 'bitcoincash' | 'bchtest' | string;
    type: CashAddressType;
    payload: Uint8Array;
}): {
    address: string;
} | string;
/**
 * Converts a 33-byte compressed public key (Uint8Array or hex string) to a Bitcoin Cash CashAddress.
 */
export declare function pubkeyToCashAddress(pubkey: Uint8Array | string, isTestnet?: boolean, tokenAware?: boolean): string;
/**
 * Converts any valid CashAddress (`bitcoincash:` or `bchtest:`, `q...` or `z...`, `p...` or `r...`)
 * to the target network (`bchtest` vs `bitcoincash`) and token-awareness (`z...`/`r...` vs `q...`/`p...`).
 */
export declare function convertCashAddressNetwork(address: string, isTestnet: boolean, tokenAware?: boolean): string;
/**
 * Validates whether a string is a valid Bitcoin Cash CashAddress (`bitcoincash:` or `bchtest:`).
 */
export declare function isValidCashAddress(address: string, requireTestnet?: boolean): boolean;
