# UserLink Sovereign Identity Protocol (`bch-nostr-userlink-id-v1`)

Cryptographic, non-custodial identity protocol linking **Bitcoin Cash (secp256k1 CashAddresses & CashTokens)** with **Nostr (BIP-340 Schnorr `npub` keys)** without centralized databases or custodial intermediaries.

---

## 1. Architecture & Key Separation

UserLink strictly enforces **separate keys** for Bitcoin Cash and Nostr (never reusing the same private key across protocols):
- **Bitcoin Cash Key:** Held by a self-custodial BCH wallet via WalletConnect v2 (`bch_signMessage` — Paytaca, Cashonize, BinaryLiquid Wallet) or an isolated session-scoped secp256k1 keypair.
- **Nostr Key:** Held by a NIP-07 browser signer (`window.nostr.signEvent`) or an ephemeral BIP-340 Schnorr keypair (`sessionStorage`).

Both keys sign **mutually referencing proofs**:
1. The **BCH key** signs a canonical JSON statement committing to `nostrPubkey` and `bchAddress` using **Bitcoin Signed Message (`\x18Bitcoin Signed Message:\n` double-SHA256 compact recoverable ECDSA)**.
2. The **Nostr key** signs a parameterized replaceable **NIP-78 (`kind: 30078`, `#d: bch-identity-binding`)** event wrapping that statement and `bch_sig`.

---

## 2. Cryptographic Verification Process

Independent clients and verifiers (`frontend/src/utils/userlinkCrypto.ts`) execute 4 deterministic checks with zero trusted backend:
1. **Nostr Event Proof:** Strip cached flags and recompute SHA-256 event ID + **BIP-340 Schnorr** signature (`verifyEvent`).
2. **Bitcoin Signed Message Recovery:** Recover the 33-byte compressed public key from `bch_sig` over `doubleSha256("\x18Bitcoin Signed Message:\n" + varint(len) + content)` and verify the compact ECDSA signature.
3. **Address Ownership Check:** Assert `HASH160(recoveredPubkey) === decodedCashAddress.payload` (`isAddressOwned`).
4. **Bidirectional Consistency:** Assert `JSON.parse(content).nostrPubkey === event.pubkey` and `JSON.parse(content).bchAddress === bchTag`.

Altering any byte of the JSON statement causes key recovery to produce a mismatched `HASH160` (failing step 3) or invalidates the Schnorr signature (failing step 1).

---

## 3. Decentralized Discovery & Open Standards

- **Primary Discovery (Nostr Relays):** Queries parameterized `kind: 30078` events via indexed NIP-01 filters (`#d: bch-identity-binding`, `#i: bch:<cashaddr>`, `#t: <handle>`, `authors: [<pubkey>]`) across public relays (`wss://relay.primal.net`, `wss://relay.snort.social`, `wss://nostr.oxtr.dev`, `wss://offchain.pub`).
- **Optional NIP-05 Accelerator:** Supports `/.well-known/nostr.json?name=<handle>` for `handle@domain` aliases without making DNS authoritative over cryptographic signatures.
- **W3C DID Document Resolution (`buildUserLinkDidDocument`):**
  - Resolves any verified identity into a W3C DID Core document mapping `did:nostr:<pubkeyHex>` ↔ `did:pkh:bch:<mainnet|chipnet>:<hash>` with `#nostr-key` and `#bch-key` verification methods.
- **Challenge-Response Authentication:** Clients generate a random nonce challenge signed via NIP-42 (`kind: 22242`) or BIP-340 Schnorr and validate live relay membership for the bound `CashAddress`.

---

## 4. Stretch Goals Implemented

1. **Pay BCH & CashTokens by `@handle`:** Implemented natively in **BinaryLiquid Wallet** (`/dashboard/send`, `resolveUserLinkOrAddress` in `bch-crypto.ts`) and launched directly from `bliquid.xyz/identity`.
2. **Third-Party W3C Verifiable Credentials & Portable Reputation (`Kind 1985` NIP-32):** Issuers publish BIP-340 Schnorr-signed `kind: 1985` events labeled `userlink.vc.v1` containing a W3C VC v2 JSON payload (`MerchantVerified`, `TradeReputation`, `HumanVerified`, etc.) discoverable across Nostr apps.
3. **Privacy-Preserving Selective Disclosure (`saltedCommitments`):** Private attributes (e.g., jurisdiction tier or age status) are committed via `sha256("ul_sd_v1:" + salt + ":" + attribute + ":" + value)` so holders prove single claims off-relay without publishing PII.
4. **BCH-Authorized Key Rotation:** The BCH wallet signs a rotation attestation (`action: "bch-authorized-key-rotation"`, `previousNostrPubkey`, `nostrPubkey`) allowing replacement of lost/compromised Nostr keys with independently verifiable BCH ownership proof.
5. **Optional On-Chain BCH `OP_RETURN` Anchor (`UL1`):** Computes `sha256("UL1:" + canonicalStatement)` (`6a24554c313a<32-byte-hash>`) and verifies on-chain confirmations via Electrum (`GET /api/bch/tx/:txid`).

---

## 5. Standalone SDK, Setup & Verification

A framework-agnostic TypeScript/JavaScript library (**`@binaryliquid/userlink-sdk`**) is packaged in [`packages/userlink-sdk/`](../packages/userlink-sdk/README.md) with ESM (`dist/index.mjs`), CommonJS (`dist/index.cjs`), and TypeScript declaration (`dist/index.d.ts`) outputs ready for adoption by Paytaca, Cashonize, Zapit, Nostr clients, and dApps.

```bash
# Build & test the standalone @binaryliquid/userlink-sdk (ESM + CJS cryptographic tests)
cd packages/userlink-sdk && npm install && npm run build && npm test

# Run automated backend cryptographic, key-rotation, W3C VC & security test suite
cd ../../backend && npm install && node test-api.js

# Build & run interactive UserLink Identity & Inspector UI
cd ../frontend && npm install && npm run build
```

Live endpoints:
- **UserLink UI & Inspector:** `https://bliquid.xyz/identity`
- **Interactive SDK & Live Verifier:** `https://bliquid.xyz/sdk`
- **Send BCH/CashTokens by `@handle`:** `https://wallet.bliquid.xyz/dashboard/send`
