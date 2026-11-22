# BinaryLiquid Protocol

**Non-Custodial Cross-Chain Liquidity Engine, P2SH-32 P2P Fiat Escrow & UserLink Sovereign Identity Protocol for Bitcoin Cash and Multi-Chain Networks**

[![Live Production](https://img.shields.io/badge/Live_dApp-bliquid.xyz-0f172a?style=flat-square)](https://bliquid.xyz)
[![Web Wallet](https://img.shields.io/badge/Web_Wallet-wallet.bliquid.xyz-F7931A?style=flat-square)](https://wallet.bliquid.xyz)
[![BCH Blaze 2026](https://img.shields.io/badge/BCH_BLAZE_2026-Mainnet_%26_Media_Tracks-00b894?style=flat-square)](https://bliquid.xyz)
[![Chains](https://img.shields.io/badge/Chains-BCH_%7C_Polygon_%7C_BSC_%7C_Solana_%7C_TON_%7C_LTC-1e293b?style=flat-square)](https://bliquid.xyz/swap)
[![License: AGPL-3.0 / MIT](https://img.shields.io/badge/License-AGPL--3.0_%2F_MIT-334155?style=flat-square)](LICENSE)

> **Engineering & Architecture:** **Drian Stack Labs** ([@drianops](https://t.me/drianops))  
> **Hackathon Tracks (BCH BLAZE 2026):** Mainnet Track (`$3,500 PUSD`) + Media Track (`$1,000 PUSD`) — Sponsored by **ParyonUSD (`PUSD`)**  
> **Security Documentation:** [`SECURITY_AUDIT.md`](./SECURITY_AUDIT.md) · [`contracts/README.md`](./contracts/README.md) · [`watchman/README.md`](./watchman/README.md)

---

## Quick Links

| Resource | Live URL |
| :--- | :--- |
| **Live dApp & Landing** | [bliquid.xyz](https://bliquid.xyz) |
| **Cross-Chain Swap & Bridge** | [bliquid.xyz/swap](https://bliquid.xyz/swap) |
| **Non-Custodial P2P Fiat Desk** | [bliquid.xyz/p2p](https://bliquid.xyz/p2p) |
| **Permissionless AMM Pools** | [bliquid.xyz/pools](https://bliquid.xyz/pools) |
| **Multi-Chain Portfolio Terminal** | [bliquid.xyz/portfolio](https://bliquid.xyz/portfolio) |
| **UserLink Sovereign Identity** | [bliquid.xyz/identity](https://bliquid.xyz/identity) |
| **BinaryLiquid Sovereign Web Wallet** | [wallet.bliquid.xyz](https://wallet.bliquid.xyz) |
| **Developer SDK Playground & Docs** | [bliquid.xyz/sdk](https://bliquid.xyz/sdk) · [bliquid.xyz/docs](https://bliquid.xyz/docs) |
| **Interactive Explainer Studio #1 (Swaps & Covenants)** | [bliquid.xyz/explainer](https://bliquid.xyz/explainer) |
| **Interactive Explainer Studio #2 (UserLink Identity)** | [bliquid.xyz/explainer-id](https://bliquid.xyz/explainer-id) |
| **NIP-05 & BCMR Well-Known Endpoints** | [nostr.json](https://bliquid.xyz/.well-known/nostr.json) · [bitcoin-cash-metadata-registry.json](https://bliquid.xyz/.well-known/bitcoin-cash-metadata-registry.json) |

---

## Overview

**BinaryLiquid** connects **Bitcoin Cash Layer 1 (`BCH` and CashTokens: `PUSD`, `MUSD`, `LIFT`)** with external liquidity networks (**Polygon PoS, BNB Smart Chain, Solana, TON, and Litecoin**) without relying on custodial bridge hot wallets.

Instead of pooling deposits inside mutable admin wallets, BinaryLiquid locks funds in **on-chain covenants and smart-contract vaults** backed by deterministic 24-hour autonomous refund timelocks, a multi-exchange median price oracle, and an attestation-only **Watchman Sentinel** relayer.

---

## Core Protocol Modules

### 1. Non-Custodial Cross-Chain Bridge & Constant Product AMM (`/swap`, `/pools`)
- **CashScript P2SH-32 Covenants (`^0.14.0`):** `BinaryLiquidVaultV2.cash` and `BinaryLiquidEscrowV2.cash` enforce UTXO token category preservation, state continuation, single-payout caps, and permissionless 24-hour timestamp refunds.
- **Multi-VM Vault Architecture:** Paired with `BinaryLiquidVaultV2.sol` (Universal EVM — Polygon, BSC, Ethereum, Arbitrum, Base, Optimism), `binary_liquid_vault` (Solana Anchor PDA with Ed25519 precompile verification), and `BinaryLiquidVault.tact` (TON TVM TEP-74 Jetton vault).
- **Constant Product AMM (`x * y = k`):** Permissionless cross-chain pools allowing CashToken issuers and DAOs to bootstrap pairs against external stablecoins (`USDT`, `USDC`).
- **Fee Economics:** `0.30%` total AMM swap fee (`0.20%` accrued to liquidity providers, `0.10%` protocol share).

### 2. Non-Custodial P2P Fiat-to-Crypto Escrow Desk (`/p2p`)
- **Per-Trade CashScript P2SH-32 Escrow (`contracts/bch/BinaryLiquidP2PEscrow.cash`):** Every P2P order creates a unique isolated P2SH-32 covenant address bound by `tradeSalt`, `buyerLockingBytecode`, `sellerLockingBytecode`, `sellerPkh`, and `expiryTimestamp`.
  - **VM-Enforced Destination Lock:** Funds can mathematically only exit to the Buyer or back to the Seller—even the Arbiter key cannot redirect a single satoshi or CashToken.
  - **Trustless `sellerDirectRelease`:** Sellers can release funds directly on Bitcoin Cash L1 using their own key even if the web platform is offline.
  - **Permissionless 24-Hour `timeoutRefund`:** Unclaimed escrows can be refunded strictly to `sellerLockingBytecode` after expiry.
- **Mandatory Sovereign Identity Gate:** Both makers and takers must bind a verified UserLink handle (`@handle@bliquid.xyz`) before publishing offers or opening trades.
- **Escrow-Gated Bank Details:** Seller fiat payment details (bank, account/IBAN, holder name, document ID) are stripped from public orderbooks and unlocked inside the trade room only after the on-chain escrow deposit is confirmed.
- **Verified On-Chain Reputation & Rewards:** `0%` protocol P2P fee, `+0.25%` `$LIFT` cashback credited to both parties on released trades, and post-settlement `1–5 ★` verified merchant reviews.

### 3. UserLink Sovereign Identity Protocol (`/identity`)
- Maps human-readable handles (`@handle@bliquid.xyz`) directly to a Bitcoin Cash CashAddress and Nostr `npub`.
- **Dual Cryptographic Binding:** Signed by both the Bitcoin Cash key (Bitcoin Signed Message ECDSA) and the Nostr key (Schnorr) and published as replaceable Nostr **Kind `30078`** (`#d: bch-identity-binding`), with W3C DID resolution (`did:nostr` ↔ `did:pkh:bch`), BCH-authorized key rotation, NIP-32 (`Kind 1985`) W3C Verifiable Credentials with salted selective disclosure, and optional BCH `OP_RETURN` anchoring. See [docs/USERLINK_PROTOCOL.md](./docs/USERLINK_PROTOCOL.md).
- **Decentralized Relay & DNS Resolution:** Published and resolved across `wss://relay.primal.net`, `wss://relay.snort.social`, `wss://nostr.oxtr.dev`, and `wss://offchain.pub`, alongside static NIP-05 DNS resolution at `/.well-known/nostr.json`.
- **Zero-Gas, Wallet-Ready Payments:** Supports BIP-21 deep-linking and direct resolution inside Paytaca, Cashonize, and BinaryLiquid Wallet.

### 4. Multi-Chain Wallet Connectivity & Portfolio Terminal (`/portfolio`, `wallet.bliquid.xyz`)
- **Native Multi-Chain Connectors:** Supports **WizardConnect** (Paytaca / Cashonize), **WalletConnect v2**, **BL-Connect** (deep-link bridge for BinaryLiquid Sovereign Web Wallet), **EIP-6963** EVM wallets (MetaMask, Rabby, Coinbase, Binance Web3), **Solana** (Phantom, Solflare), **TON Connect** (Tonkeeper, Telegram Wallet), and **Litecoin**.
- **Portfolio & Net Worth Dashboard:** Unified multi-chain balance aggregation, capital allocation breakdown (Spot, AMM Liquidity, Lending Collateral, Perps Margin), live USD valuation via the Multi-CEX Median Oracle, and explorer links.

### 5. Multi-CEX Median Oracle & Watchman Sentinel (`watchman/`, `backend/services/oraclePool.js`)
- **Consensus Median Pricing:** Queries public spot endpoints in parallel across **Binance, OKX, Coinbase, Kraken, and KuCoin** (plus **Cauldron DEX** routing for CashTokens), applying outlier filtering and freshness thresholds.
- **Watchman Sentinel (`watchman/`):** Stateless attestation signer with USD-normalized circuit breaker (`$50,000` single-transaction cap, `$250,000` rolling hourly threshold), global cross-module anti-replay registry, and oracle deviation guard (`1.5%` max deviation).

### 6. Media Track — Interactive Explainer Studios (`/explainer`, `/explainer-id`)
- Two browser-based interactive 16:9 cinema studios explaining BinaryLiquid's cross-chain covenant architecture and UserLink sovereign identity.
- Synchronized dual-language neural narration (**English** and **Spanish**), chapter navigation, interactive simulation triggers, and subtitle tracks.

---

## Mainnet vs. Testnet / Chipnet Status

| Module | Network Status | Details |
| :--- | :--- | :--- |
| **UserLink Sovereign Identity** | **Mainnet Live** | Nostr Kind `30078` + NIP-05 resolution & dual ECDSA/Schnorr verification |
| **BCH Wallet Read/HD/FX API & Web Wallet** | **Mainnet & Chipnet Live** | UTXO queries, Electrum history, CashTokens (`PUSD`, `MUSD`, `LIFT`), FX rates |
| **Cross-Chain Bridge & AMM Pools** | **Mainnet & Multi-Testnet** | BCH Mainnet / Chipnet, Polygon Mainnet / Amoy, BSC, Solana Devnet/Mainnet, TON, LTC |
| **P2P Non-Custodial Fiat Escrow** | **Mainnet & Chipnet Ready** | CashScript `^0.14.0` P2SH-32 `BinaryLiquidP2PEscrow.cash` live at `/p2p` |
| **Perpetual Futures & Lending Vaults** | **Chipnet / Testnet** | Testnet architecture (`BinaryLiquidCollateralVaultV2.cash`, `perpsService.js`, `lendingService.js`) |

---

## Repository Structure

```text
BinaryLiquid/
├── backend/
│   ├── config.js                          # Multi-chain RPCs, vault addresses, CashTokens categories
│   ├── server.js                          # Express REST API (Swaps, Pools, P2P, Perps, Lending, Wallet, NIP-05)
│   ├── test-api.js                        # Automated security & regression test suite
│   ├── .env.example                       # Sanitized environment template (zero secrets)
│   └── services/
│       ├── bchService.js                  # BCH L1 & CashTokens UTXO, Electrum, P2SH-32 vault helpers
│       ├── evmService.js                  # Polygon & BSC EVM vault execution & verification
│       ├── solanaService.js               # Solana SVM SPL & PDA vault verification
│       ├── tonService.js                  # TON TVM Jetton balance & payout service
│       ├── ltcService.js                  # Litecoin SegWit UTXO tracking
│       ├── p2pService.js                  # Non-custodial P2P escrow, identity gate, reviews & $LIFT cashback
│       ├── poolService.js                 # Constant product AMM & permissionless pool factory
│       ├── relayerEngine.js               # Multi-chain swap state machine & network parity guards
│       ├── oraclePool.js                  # Parallel Multi-CEX median oracle & Cauldron DEX routing
│       ├── perpsService.js                # Testnet perpetual futures engine (strict oracle feed)
│       ├── lendingService.js              # Testnet P2SH-32 collateralized lending vaults
│       ├── bcmrService.js                 # CashTokens BCMR resolver with anti-SSRF protection
│       ├── authService.js                 # Cryptographic session & wallet signature authentication
│       ├── watchmanClient.js              # Watchman Sentinel attestation client
│       └── db.js                          # Transactional persistence & global anti-replay registry
│
├── contracts/
│   ├── compile.js                         # Compiles all Solidity (^0.8.20) & CashScript (^0.14.0) contracts
│   ├── README.md                          # Smart contract specifications & corridor overview
│   ├── bch/
│   │   ├── BinaryLiquidVaultV2.cash       # P2SH-32 cross-chain liquidity vault covenant (V2)
│   │   ├── BinaryLiquidEscrowV2.cash      # P2SH-32 atomic bridge escrow with 24h refund (V2)
│   │   ├── BinaryLiquidP2PEscrow.cash     # P2SH-32 destination-locked P2P fiat escrow covenant
│   │   └── BinaryLiquidCollateralVaultV2.cash # P2SH-32 lending collateral covenant (V2)
│   ├── evm/
│   │   ├── BinaryLiquidVaultV2.sol        # Universal EVM non-custodial vault (EIP-191, rolling caps)
│   │   └── BinaryLiquidVault.sol          # EVM vault V1 reference implementation
│   ├── solana/
│   │   └── programs/binary_liquid_vault/  # Rust / Anchor PDA vault with Ed25519 precompile verification
│   └── ton/
│       └── BinaryLiquidVault.tact         # TON TVM TEP-74 Jetton vault in Tact
│
├── frontend/
│   ├── DESIGN.md                          # Swiss Fintech design tokens & layout specifications
│   ├── public/
│   │   ├── .well-known/                   # NIP-05 nostr.json & CashTokens BCMR registry
│   │   ├── explainer/                     # Interactive Explainer Studio #1 (Swaps)
│   │   └── explainer-id/                  # Interactive Explainer Studio #2 (UserLink)
│   └── src/
│       ├── App.tsx                        # Main terminal, clean HTML5 routing & multi-chain wallet hub
│       ├── components/
│       │   ├── LandingPage.tsx            # Protocol overview & entry hub
│       │   ├── BridgeSwap.tsx             # Multi-chain swap terminal with live quotes & verification
│       │   ├── P2PView.tsx                # Non-custodial P2P fiat orderbook, escrow room & reviews
│       │   ├── PoolsView.tsx              # Liquidity pools & permissionless pool creator
│       │   ├── PortfolioView.tsx          # Multi-chain portfolio analytics & allocation ledger
│       │   ├── IdentityView.tsx           # UserLink sovereign handle registration & resolver
│       │   ├── PerpsView.tsx              # Testnet perpetual futures trading terminal
│       │   ├── LendingView.tsx            # Testnet collateralized lending vaults
│       │   ├── SdkView.tsx                # Interactive developer SDK playground
│       │   ├── DocsView.tsx               # Technical protocol documentation
│       │   └── WhitepaperView.tsx         # Protocol whitepaper
│       ├── services/
│       │   ├── walletConnectService.ts    # WizardConnect & WalletConnect v2 manager
│       │   ├── blConnectService.ts        # BinaryLiquid Sovereign Wallet deep-link connector
│       │   └── tonConnectService.ts       # TON Connect v2 integration
│       └── utils/
│           ├── userlinkCrypto.ts          # Dual ECDSA/Schnorr UserLink signing & Nostr Kind 30078 relay client
│           └── bchAddress.ts              # CashAddress validation & network conversion helpers
│
├── watchman/
│   ├── index.js                           # Standalone Sentinel daemon entry point
│   ├── SentinelService.js                 # Cross-chain event verifier & attestation signer
│   ├── oracleAuditor.js                   # Oracle price deviation guard
│   └── circuitBreaker.js                  # USD-normalized outflow caps & emergency stop
│
├── explainer/                             # Source studio assets & MP4 rendering scripts
├── scripts/                               # Deployment, SSL, status check & DB backup scripts
├── SECURITY_AUDIT.md                      # Formal security invariants & attack mitigation matrix
├── TRADEMARK.md                           # Dual-licensing scope & brand/trademark reservation
└── LICENSE                                # GNU AGPL-3.0 (contracts/ under MIT in contracts/LICENSE)
```

---

## Local Development & Verification

### Prerequisites
- **Node.js `>= 20.x`** and `npm`

### 1. Install Dependencies & Compile Smart Contracts
```bash
# Install backend dependencies (includes solc and cashc compilers)
npm --prefix backend install

# Link shared modules for contracts and watchman, then compile all Solidity & CashScript contracts
ln -sfn ../backend/node_modules contracts/node_modules
ln -sfn ../backend/node_modules watchman/node_modules
node contracts/compile.js
```

### 2. Run the Automated Security & Regression Test Suite
```bash
node backend/test-api.js
```
Verifies cross-network parity (Mainnet/Testnet isolation), global anti-replay registry, Watchman USD circuit breaker, compiled V2 & P2P contract artifacts, BCMR anti-SSRF protection, multi-CEX oracle invariants, and P2P escrow/review/cashback flows.

### 3. Run the Backend API Locally
```bash
cp backend/.env.example backend/.env
# Fill in your testnet/mainnet RPC endpoints and Watchman keys in backend/.env
npm --prefix backend start
```

### 4. Run or Build the Frontend
```bash
npm --prefix frontend install
npm --prefix frontend run dev      # Development server (http://localhost:5173)
npm --prefix frontend run build    # TypeScript check (tsc) + Vite production bundle
```

---

## Team & Contact

Developed by **Drian Stack Labs**
- **Lead Developer:** [@drianops](https://t.me/drianops)
- **Live dApp:** [https://bliquid.xyz](https://bliquid.xyz)
- **Web Wallet:** [https://wallet.bliquid.xyz](https://wallet.bliquid.xyz)
- **Repository:** [https://github.com/DrianOps/BinaryLiquid](https://github.com/DrianOps/BinaryLiquid)

---

## License & Trademarks

Copyright © 2026 **Drian Stack Labs**.

- **Application, Backend, Relayer, Watchman & Media (`frontend/`, `backend/`, `watchman/`, `explainer/`):** Licensed under the [**GNU Affero General Public License v3.0 (AGPL-3.0)**](./LICENSE). Any hosted network deployment must preserve attribution and publish complete corresponding source code under AGPL-3.0.
- **Smart Contracts (`contracts/`):** Licensed under the [**MIT License**](./contracts/LICENSE) for frictionless auditability and composability.
- **Trademarks & Brand Assets:** All rights reserved — see [`TRADEMARK.md`](./TRADEMARK.md). Commercial licensing inquiries: [@drianops](https://t.me/drianops).
