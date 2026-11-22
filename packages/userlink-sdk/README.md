# `@binaryliquid/userlink-sdk`

Standalone, framework-agnostic TypeScript/JavaScript SDK for **UserLink (`bch-nostr-userlink-id-v1`)** — cryptographically binding **Bitcoin Cash** (`secp256k1` CashAddresses & CashTokens) with **Nostr** (`BIP-340 Schnorr`) with zero centralized databases.

Designed for direct adoption by **Paytaca**, **Cashonize**, **Zapit**, Nostr clients, exchanges, and dApps.

---

## Features

- **Zero-Trust Dual Verification (`verifyUserLinkEvent`)**: Recomputes SHA-256 event hash + BIP-340 Schnorr signature, recovers the BCH compressed public key from Bitcoin Signed Message (`bch_sig`), verifies `HASH160(pubkey) === CashAddress`, and enforces bidirectional JSON statement matching.
- **Pay-by-`@handle` Resolution (`resolveUserLinkFromRelays`)**: Resolves `@handle`, `user@domain`, `npub1...`, or CashAddresses across public Nostr relays (`Kind 30078`) with optional NIP-05 acceleration.
- **Paytaca / WalletConnect v2 Friendly Binding (`createUserLinkStatement` + `buildUserLinkEventTemplate`)**: Pair directly with `bch_signMessage` and NIP-07 (`window.nostr.signEvent`).
- **BCH-Authorized Key Rotation**: Rotate a lost/compromised Nostr key by signing `previousNostrPubkey` with the BCH wallet.
- **W3C DID Core (`buildUserLinkDidDocument`)**: Resolves any verified identity to `did:nostr:<pubkeyHex>` ↔ `did:pkh:bch:<mainnet|chipnet>:<hash>`.
- **Challenge-Response Login (`createAuthChallenge` + `verifyAuthChallengeEvent`)**: Passwordless NIP-42 (`kind: 22242`) domain + nonce authentication.
- **Portable W3C Verifiable Credentials & Selective Disclosure (`Kind 1985`)**: Issue/verify NIP-32 `userlink.vc.v1` credentials and prove private attributes via salted SHA-256 commitments (`saltedCommitments`).
- **Optional On-Chain BCH `OP_RETURN UL1` Anchor (`buildBchOpReturnScriptHex` + `verifyBchOnChainAnchor`)**: Commit & verify `6a24554c313a<sha256>` directly on Bitcoin Cash.

---

## Quick Integration for BCH Wallets (e.g. Paytaca)

### 1. Resolve & Cryptographically Verify `@handle` Before Sending BCH / CashTokens

```ts
import { resolveUserLinkFromRelays, convertCashAddressNetwork } from '@binaryliquid/userlink-sdk';

export async function resolvePayee(input: string, tokenAware = true) {
  const { verified } = await resolveUserLinkFromRelays(input);
  if (!verified || !verified.isOverallValid) {
    throw new Error('Cryptographic BCH <-> Nostr binding could not be verified');
  }

  // Automatically convert to token-aware CashAddress (`z...`) when sending CashTokens
  const payAddress = convertCashAddressNetwork(verified.bchAddress, false, tokenAware);
  return {
    handle: verified.handle,
    npub: verified.npub,
    payAddress,
    rotationAuthorized: verified.rotationAuthorized
  };
}
```

### 2. Bind a Paytaca Wallet with Nostr (`bch_signMessage` + NIP-07)

```ts
import {
  createUserLinkStatement,
  buildUserLinkEventTemplate,
  publishUserLinkToRelay,
  USERLINK_RELAYS
} from '@binaryliquid/userlink-sdk';

// 1) Build canonical binding statement (strictly separate BCH & Nostr keys)
const statement = createUserLinkStatement({
  handle: 'alice',
  bchAddress: walletCashAddress,
  nostrPubkeyHex: await window.nostr.getPublicKey(),
  network: 'mainnet'
});

// 2) Sign statement inside Paytaca via WalletConnect v2 `bch_signMessage`
const bchSigBase64 = await walletConnectSignMessage({
  address: walletCashAddress,
  message: statement
});

// 3) Sign NIP-78 Kind 30078 event with Nostr signer & broadcast to relays
const template = buildUserLinkEventTemplate({
  handle: 'alice',
  bchAddress: walletCashAddress,
  nostrPubkeyHex: await window.nostr.getPublicKey(),
  bchSigBase64,
  statementContent: statement
});
const signedEvent = await window.nostr.signEvent(template);
await Promise.all(USERLINK_RELAYS.map((r) => publishUserLinkToRelay(r, signedEvent)));
```

### 3. Resolve W3C DID, Portable Credentials (`Kind 1985`) & On-Chain `OP_RETURN UL1`

```ts
import {
  buildUserLinkDidDocument,
  fetchAttestationsFromRelays,
  verifySelectiveDisclosure,
  verifyBchOnChainAnchor
} from '@binaryliquid/userlink-sdk';

const didDocument = buildUserLinkDidDocument(verified);
const credentials = await fetchAttestationsFromRelays(verified.pubkeyHex);

// Selective disclosure check without exposing PII on relays
const ok = verifySelectiveDisclosure({
  salt: 'user_provided_salt',
  attribute: 'tier',
  value: 'verified_merchant',
  commitmentHex: credentials[0].saltedCommitments.tier
});

// Optional on-chain OP_RETURN UL1 verification
if (verified.anchorTxId) {
  const anchor = await verifyBchOnChainAnchor({
    txid: verified.anchorTxId,
    statementContent: verified.event.content,
    network: 'mainnet'
  });
}
```

---

## Build & Test

```bash
cd packages/userlink-sdk
npm install
npm run build
npm test
```
