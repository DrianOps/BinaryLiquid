# 🌊 BinaryLiquid Protocol
### Institutional Non-Custodial Cross-Chain Liquidity Gateway & AMM for Bitcoin Cash CashTokens

[![BCH Blaze Hackathon](https://img.shields.io/badge/BCH%20BLAZE-Stablecoin%20Track%20%24750%20PUSD-00b894.svg)](https://bliquid.xyz)
[![Paytaca Bounty](https://img.shields.io/badge/Paytaca%20Bounty-UserLink%20%24500%20PUSD-8c7ae6.svg)](https://bliquid.xyz)
[![Live Demo](https://img.shields.io/badge/Live%20Production-bliquid.xyz-0984e3.svg)](https://bliquid.xyz)
[![Chains](https://img.shields.io/badge/5%20Chains-BCH%20%7C%20EVM%20%7C%20SOL%20%7C%20TON%20%7C%20LTC-6c5ce7.svg)](https://bliquid.xyz)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **Live Production Deployment**: [https://bliquid.xyz](https://bliquid.xyz)  
> **Engineering & Research**: **Drian Stack Labs** ([@drianops](https://t.me/drianops))  
> **Target DoraHacks Tracks**:
> 1. **BLAZE BCH Hackathon** — `$750 PUSD (ParyonUSD) Stablecoin Ecosystem Track`
> 2. **Paytaca Bounty** — `$500 PUSD Sovereign Identity (UserLink BCH ↔ Nostr NIP-05)`  
> **Total Hackathon Focus**: **$1,250 PUSD**  
> **Smart Contract Security Audits**: [`SECURITY_AUDIT.md`](./SECURITY_AUDIT.md) | [`contracts/README.md`](./contracts/README.md)

---

## 📌 Executive Summary

**BinaryLiquid Protocol** is a high-speed, 100% non-custodial cross-chain bridge and liquidity protocol that seamlessly connects **Bitcoin Cash (BCH CashTokens & native BCH)** with the world's leading high-throughput blockchains:
- **Bitcoin Cash (BCH & CashTokens)**: Native `PUSD` (ParyonUSD), `MUSD` (MonetizeUSD), and `BCH`
- **EVM Networks**: **Polygon PoS** (`USDC`, `USDT`, `POL`) and **BNB Smart Chain** (`USDT BEP-20`, `BNB`)
- **Solana (SVM)**: Native `SOL` and `USDT (SPL)`
- **TON Blockchain (The Open Network)**: Native `TON` and `USDT (Jetton)`
- **Litecoin (LTC)**: Native SegWit UTXO vaults

Specifically built for the **DoraHacks BLAZE BCH Hackathon**, BinaryLiquid establishes immediate, deep liquidity conduits for native Bitcoin Cash stablecoins without relying on centralized, custodial swap brokers with invasive KYC or arbitrary fund freezing risks.

---

## ⚡ Core Technical Innovations & 5-Chain Architecture

### 1. Deterministic BIP-44 HD Wallet Derivation (Zero Collision Architecture)
Traditional custodial or centralized bridges route all incoming user deposits into a single hot address, causing transaction collisions, UTXO contention, and reconciliation errors.

BinaryLiquid implements **per-order isolated BIP-44 HD wallet derivation**:
- **Bitcoin Cash**: `m/44'/145'/0'/0/{orderIndex}`
- **EVM (Polygon & BSC)**: `m/44'/60'/0'/0/{orderIndex}`
- **Solana (SVM)**: `m/44'/501'/{orderIndex}'/0'`
- **TON (TVM)**: Isolated smart-contract message payloads with autonomous refunds
- **Litecoin**: `m/44'/2'/0'/0/{orderIndex}`

Every single swap order automatically derives a cryptographically unique deposit sub-address. The relayer monitors incoming UTXOs/events specifically mapped to that isolated derivation index, providing:
- **100% Deterministic Tracking**: No order mixing or overlapping.
- **Enhanced User Privacy**: No public reuse of the primary hot wallet address.
- **Automated Sweeping**: Background engine sweeps funds from derived child addresses directly to cold treasury storage.

### 2. Multi-Chain Smart Contract Security Matrix
BinaryLiquid enforces non-custodial guarantees using tailored smart contracts native to each ecosystem:
- **Bitcoin Cash (`contracts/bch/BinaryLiquidVault.cash`)**: CashScript P2SH32 smart covenant with deterministic 24-hour autonomous user refund timelocks.
- **EVM (`contracts/evm/BinaryLiquidVault.sol`)**: Solidity ERC-20 vault with circuit breakers, replay prevention, and signature attestation.
- **Solana (`contracts/solana/programs/binaryliquid-vault/src/lib.rs`)**: Rust/Anchor zero-custody program with PDA (Program Derived Address) vaults.
- **TON (`contracts/ton/BinaryLiquidVault.tact`)**: 100% non-custodial TVM contract in Tact with native Ed25519 `checkSignature`, Jetton wallet routing, and $50,000 circuit breaker.

### 3. UserLink: Sovereign Identity (Paytaca $500 PUSD Bounty PoC)
Integrated directly into the protocol, **UserLink** bridges Bitcoin Cash CashAddress identity with the decentralized Nostr social protocol:
- Encodes verifiable Nostr NIP-05 human-readable handles (`alice@bliquid.xyz`).
- Cryptographically binds Bitcoin Cash addresses to Nostr `npub` public keys.
- Allows 1-click tipping and microtransactions in CashTokens `PUSD`.

### 4. Institutional 5-Chain Wallet & Portfolio Terminal
- **Connect Wallet Modal**: Segmented 5-chain connector supporting EIP-6963 (MetaMask, Rabby, Coinbase, Binance Web3), Paytaca (Extension & WizardConnect QR), Cashonize / WC2, Phantom, Solflare, Tonkeeper, Telegram @wallet, and Litewallet.
- **Connected Portfolio Modal**: Real-time aggregated USD net worth calculated from our Oracle Pool, block explorer links per chain, inline address editing, and categorized asset breakdown.

---

## 📂 Project Structure

```
BinaryLiquid_swap/
├── backend/
│   ├── config.js                 # 5-chain RPCs, contract addresses, token decimals
│   ├── server.js                 # Express API (swaps, pools, stats, faucet, orders)
│   ├── services/
│   │   ├── bchService.js         # Bitcoin Cash CashTokens UTXO & token management
│   │   ├── evmService.js         # Polygon & BSC EVM contract interactions
│   │   ├── solanaService.js      # Solana SVM token transfers & balance verification
│   │   ├── tonService.js         # TON TVM Jetton balance queries & payout dispatch
│   │   ├── ltcService.js         # Litecoin SegWit UTXO balance tracking & relayer
│   │   ├── relayerEngine.js      # Multi-chain state machine & autonomous execution
│   │   ├── oraclePool.js         # Multi-source live price feeds (Binance, CoinGecko, Kraken)
│   │   └── poolService.js        # Constant product AMM, custom pool factory
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx               # Main terminal, multi-chain wallet state & routing
│   │   ├── components/
│   │   │   ├── BridgeSwap.tsx    # 5-Chain Bridge swap with live quotes & verification
│   │   │   ├── IdentityView.tsx  # UserLink (BCH ↔ Nostr NIP-05 Paytaca Bounty)
│   │   │   ├── PortfolioView.tsx # Multi-chain portfolio dashboard & analytics
│   │   │   ├── PoolsView.tsx     # Liquidity pools list & Custom Pair Creator Modal
│   │   │   ├── SdkView.tsx       # Interactive SDK playground & code generators
│   │   │   ├── DocsView.tsx      # Comprehensive developer documentation
│   │   │   └── WhitepaperView.tsx # BinaryLiquid Protocol Whitepaper
│
├── contracts/
│   ├── bch/BinaryLiquidVault.cash     # CashScript P2SH32 timelock contract
│   ├── evm/BinaryLiquidVault.sol      # Solidity EVM non-custodial vault
│   ├── solana/                        # Solana Anchor Rust program
│   └── ton/BinaryLiquidVault.tact     # TON Blockchain Tact TVM contract
│
└── README.md
```

---

## 🏆 DoraHacks Hackathon Submission Alignment

- **Event**: DoraHacks BLAZE BCH Hackathon
- **Target Tracks**:
  1. **BLAZE Stablecoin Track ($750 PUSD)**: Instant on-chain liquidity & swapping for ParyonUSD (`PUSD`) and MonetizeUSD (`MUSD`).
  2. **Paytaca Bounty Track ($500 PUSD)**: Sovereign Identity (UserLink BCH ↔ Nostr NIP-05).
- **Total Prize Focus**: **$1,250 PUSD**
- **Production URL**: [https://bliquid.xyz](https://bliquid.xyz)
- **GitHub Repository**: [https://github.com/DrianOps/BinaryLiquid](https://github.com/DrianOps/BinaryLiquid)

---

## 👥 Engineering & Authorship

Developed by **Drian Stack Labs**  
- **Lead Architect & Developer**: Adrian ([@drianops](https://t.me/drianops))  
- **Telegram Contact**: [@drianops](https://t.me/drianops)  
- **Live dApp**: [https://bliquid.xyz](https://bliquid.xyz)  

---

## 📄 License
Copyright © 2026 **Drian Stack Labs**. Open-source under the [MIT License](LICENSE).
