import { type Event as NostrEvent, type EventTemplate } from 'nostr-tools';
import { convertCashAddressNetwork, decodeCashAddress, encodeCashAddress, hash160, isValidCashAddress, pubkeyToCashAddress } from './bchAddress';
export { convertCashAddressNetwork, decodeCashAddress, encodeCashAddress, hash160, isValidCashAddress, pubkeyToCashAddress };
export declare const USERLINK_PROTOCOL_ID = "bch-nostr-userlink-id-v1";
export declare const USERLINK_RELAYS: string[];
export declare const USERLINK_D_TAG = "bch-identity-binding";
export declare const USERLINK_ATTESTATION_LABEL = "userlink.vc.v1";
export interface UserLinkStatement {
    protocol: string;
    action?: 'identity-binding' | 'bch-authorized-key-rotation';
    username: string;
    bchAddress: string;
    nostrPubkey: string;
    previousNostrPubkey?: string;
    network?: 'mainnet' | 'testnet';
    timestamp: number;
}
export interface UserLinkBuildParams {
    handle: string;
    bchAddress: string;
    nostrPubkeyHex: string;
    bchSigBase64: string;
    statementContent: string;
    nip05Domain?: string;
    network?: 'mainnet' | 'testnet';
    sigScheme?: string;
    bchPubkeyHex?: string;
    previousNostrPubkey?: string;
    anchorTxId?: string;
    clientName?: string;
    createdAt?: number;
}
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
export interface UserLinkAuthChallenge {
    domain: string;
    nonce: string;
    issuedAt: number;
    expiresAt: number;
    message: string;
}
export interface UserLinkAnchorVerification {
    verifiedOnChain: boolean;
    confirmations: number;
    commitmentHex: string;
    matchedScriptHex?: string;
    reason?: string;
}
export declare function bitcoinMessageHash(message: string): Uint8Array;
export declare function bytesToBase64(bytes: Uint8Array): string;
export declare function base64ToBytes(b64: string): Uint8Array;
/**
 * Produces a standard Base64 Bitcoin Signed Message (65-byte compact recoverable ECDSA)
 * compatible with Paytaca, Cashonize, Zapit and Electron Cash (`bch_signMessage`).
 */
export declare function signBitcoinMessage(message: string, skBytes: Uint8Array): string;
/**
 * Creates the canonical JSON statement that the Bitcoin Cash wallet signs via `bch_signMessage`.
 * Supports both initial binding and BCH-authorized Nostr key rotation (`previousNostrPubkey`).
 */
export declare function createUserLinkStatement(params: {
    handle: string;
    bchAddress: string;
    nostrPubkeyHex: string;
    network?: 'mainnet' | 'testnet';
    previousNostrPubkey?: string;
    timestamp?: number;
}): string;
/**
 * Constructs an unsigned Nostr NIP-78 (`kind: 30078`) UserLink event template ready to be signed
 * via NIP-07 (`window.nostr.signEvent`) or `finalizeEvent(template, nostrSkBytes)`.
 */
export declare function buildUserLinkEventTemplate(params: UserLinkBuildParams): EventTemplate;
/**
 * Cryptographically verifies either:
 * 1) Standard Bitcoin Signed Message (Base64 65-byte recoverable sig), OR
 * 2) Legacy hex ECDSA signature (`secp256k1` over `sha256(message)`),
 * AND proves that the signing public key owns `expectedAddress` (`hash160(pubkey) === CashAddress payload`).
 */
export declare function verifyBitcoinMessageAndAddress(params: {
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
};
/**
 * Full mutual cryptographic validation of a UserLink Kind 30078 Nostr binding event:
 * 1) Recomputes SHA-256 event hash & validates BIP-340 Schnorr signature (`verifyEvent`)
 * 2) Recovers BCH pubkey from Bitcoin Signed Message & checks `hash160(pubkey) === CashAddress`
 * 3) Enforces bidirectional JSON statement consistency (`statement.nostrPubkey === event.pubkey` & `statement.bchAddress === tag.bch`)
 * 4) Evaluates BCH-authorized key rotation (`prev_nostr`) & UL1 commitment hash
 */
export declare function verifyUserLinkEvent(foundEvent: NostrEvent): VerifiedUserLinkResult;
/**
 * Resolves `@handle`, `user@domain` (NIP-05), `npub1...`, 64-hex pubkey, or `bitcoincash:` / `bchtest:`
 * address directly against decentralized Nostr relays and cryptographically verifies the binding.
 */
export declare function resolveUserLinkFromRelays(rawInput: string, relays?: string[], timeoutMs?: number): Promise<{
    verified: VerifiedUserLinkResult | null;
    nip05Fallback?: {
        handle: string;
        nip05: string;
        bchAddress: string;
        pubkeyHex: string;
    };
}>;
export declare function publishUserLinkToRelay(relayUrl: string, signedEvent: NostrEvent, timeoutMs?: number): Promise<{
    ok: boolean;
    latency: number;
    error?: string;
}>;
/**
 * Generates a fresh domain-bound nonce challenge for passwordless NIP-42 (`kind: 22242`) login.
 */
export declare function createAuthChallenge(domain: string, ttlSeconds?: number): UserLinkAuthChallenge;
/**
 * Verifies a signed NIP-42 (`kind: 22242`) challenge-response event against an expected challenge.
 */
export declare function verifyAuthChallengeEvent(signedEvent: NostrEvent, expected: UserLinkAuthChallenge, nowUnix?: number): {
    valid: boolean;
    pubkeyHex: string;
    reason?: string;
};
/**
 * Computes the deterministic SHA-256 commitment hash prefixed with `UL1:`
 * used for optional Bitcoin Cash `OP_RETURN` on-chain anchoring.
 */
export declare function computeUserLinkCommitmentHash(statementContent: string): string;
/**
 * Builds the raw Bitcoin Cash script hex (`OP_RETURN <"UL1:" + 32-byte sha256>`)
 * for anchoring a UserLink cryptographic binding directly on Bitcoin Cash.
 */
export declare function buildBchOpReturnScriptHex(statementContent: string): string;
/**
 * Generates a standard W3C DID Core Document (`did:nostr` + `did:pkh:bch`)
 * directly from a verified UserLink Kind 30078 proof without central servers.
 */
export declare function buildUserLinkDidDocument(verified: VerifiedUserLinkResult): Record<string, unknown>;
/**
 * Privacy-preserving salted commitment helper for Selective Disclosure.
 */
export declare function createSaltedDisclosureCommitment(salt: string, attribute: string, value: string): string;
export declare function verifySelectiveDisclosure(params: {
    salt: string;
    attribute: string;
    value: string;
    commitmentHex: string;
}): boolean;
/**
 * Builds & signs a Nostr Kind 1985 (NIP-32) Verifiable Credential / Portable Reputation attestation.
 */
export declare function createSignedAttestationEvent(params: {
    subjectPubkeyHex: string;
    subjectBchAddress: string;
    subjectHandle?: string;
    claimType: string;
    claimSummary: string;
    rating?: number;
    saltedCommitments?: Record<string, string>;
    issuerSkBytes: Uint8Array;
}): NostrEvent;
/**
 * Cryptographically validates a Kind 1985 (NIP-32) W3C Verifiable Credential attestation event.
 */
export declare function verifyAttestationEvent(event: NostrEvent): UserLinkAttestationResult;
/**
 * Fetches and verifies Kind 1985 portable W3C attestations from Nostr relays for a subject pubkey.
 */
export declare function fetchAttestationsFromRelays(subjectPubkeyHex: string, relays?: string[], timeoutMs?: number): Promise<UserLinkAttestationResult[]>;
/**
 * Verifies an optional on-chain Bitcoin Cash OP_RETURN commitment (`UL1:<sha256>`)
 * against the Electrum transaction inspection API (`GET /api/bch/tx/:txid`).
 */
export declare function verifyBchOnChainAnchor(params: {
    txid: string;
    statementContent: string;
    network: 'mainnet' | 'testnet';
    apiBase?: string;
}): Promise<UserLinkAnchorVerification>;
