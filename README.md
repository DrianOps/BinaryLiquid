# 🌊 BinaryLiquid Protocol
### Next-Gen Non-Custodial Cross-Chain Stablecoin Bridge & AMM Factory for Bitcoin Cash CashTokens

[![BCH Blaze Hackathon](https://img.shields.io/badge/BCH%20BLAZE-Hackathon%20Track%20%24750%20PUSD-00b894.svg)](https://bsprotocol.xyz)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-bsprotocol.xyz-0984e3.svg)](https://bsprotocol.xyz)
[![Network](https://img.shields.io/badge/Networks-BCH%20%7C%20Polygon%20%7C%20Solana-6c5ce7.svg)](https://bsprotocol.xyz)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **Live Production Deployment**: [https://bsprotocol.xyz](https://bsprotocol.xyz)  
> **Target Track**: BLAZE BCH Hackathon — `$750 PUSD (ParyonUSD) Stablecoin Ecosystem`  
> **Smart Contract Security Audit**: [`SECURITY_AUDIT.md`](./SECURITY_AUDIT.md) | [`contracts/README.md`](./contracts/README.md)

---

## 📌 Executive Summary

**BinaryLiquid Protocol** is a high-speed, non-custodial cross-chain bridge and liquidity protocol connecting **Bitcoin Cash (BCH CashTokens)** with **EVM networks (Polygon PoS)** and **Solana**.

Specifically tailored for the **BCH BLAZE Hackathon**, BinaryLiquid establishes direct liquidity conduits for native BCH stablecoins:
- **ParyonUSD (`PUSD`)** — Primary BLAZE Hackathon Sponsor Token
- **MonetizeUSD (`MUSD`)** — CashTokens Stablecoin
- **Cross-chain pairings**: Polygon `USDC`, `USDT`, `POL`, and Solana assets.

---

## ⚡ Core Technical Innovations

### 1. Deterministic BIP-44 HD Wallet Derivation (Zero Collision Architecture)
Traditional custodial or centralized bridges route all incoming user deposits into a single hot address, causing transaction collisions, UTXO contention, and reconciliation errors.

BinaryLiquid implements **per-order isolated BIP-44 HD wallet derivation**:
- **Bitcoin Cash**: `m/44'/145'/0'/0/{orderIndex}`
- **EVM (Polygon)**: `m/44'/60'/0'/0/{orderIndex}`
- **Solana**: `m/44'/501'/{orderIndex}'/0'`

Every single swap order automatically derives a cryptographically unique deposit sub-address. The relayer monitors incoming UTXOs/events specifically mapped to that isolated derivation index, providing:
- **100% Deterministic Tracking**: No order mixing or overlapping.
- **Enhanced User Privacy**: No public reuse of the primary hot wallet address.
- **Automated Sweeping**: Background engine sweeps funds from derived child addresses directly to cold treasury storage.

### 2. Permissionless Cross-Chain Liquidity Pool Factory
BinaryLiquid breaks the isolation of BCH CashTokens by allowing **anyone** to create custom liquidity pairs with CashTokens and cross-chain tokens, offering two distinct AMM architectures:

```
                  ┌────────────────────────────────────────┐
                  │ Permissionless Pool Factory (POST API) │
                  └───────────────────┬────────────────────┘
                                      │
            ┌─────────────────────────┴─────────────────────────┐
            ▼                                                   ▼
┌───────────────────────────────┐               ┌───────────────────────────────┐
│ Option 1: Bootstrapping /     │               │ Option 2: Standard AMM Pair   │
│ Anti-Rug Protection (Fair)    │               │ (Uniswap V2 Style)            │
├───────────────────────────────┤               ├───────────────────────────────┤
│ • Creator deposits Token A    │               │ • Creator provides 100% of    │
│ • Liquidity PERMANENTLY LOCKED│               │   both Token A & Token B      │
│ • Creator earns 0.05% perpetual│              │ • 100% instant ACTIVE trading │
│   swap fees                   │               │ • Standard LP shares minted   │
│ • Community completes TVL     │               │ • Standard 0.20% LP fees      │
└───────────────────────────────┘               └───────────────────────────────┘
```

- **Option 1: Recaudo de Fondo (Bootstrapping / Anti-Rug Lock)**:
  - The creator launches a new CashToken pair by seeding the initial token reserve.
  - Base liquidity is **cryptographically locked** against removal (Anti-Rug Protection), guaranteeing buyers that the creator cannot drain liquidity.
  - The creator earns a **0.05% continuous creator fee** on every swap executed across the lifetime of the pool.
- **Option 2: Par Estándar AMM (Uniswap V2 Style)**:
  - Full two-sided liquidity deposit upfront with instant active AMM trading.
  - Traditional LP shares with 0.20% proportional fee distribution.

### 3. Zero-Simulation Guarantee & Real On-Chain Connection
BinaryLiquid operates with **zero mock balances, zero fake TXIDs, and zero simulated responses**:
- Real-time UTXO balance verification via `mainnet-js` on Bitcoin Cash.
- Native RPC queries on Polygon Bor RPC (`https://polygon-bor-rpc.publicnode.com`, Chain ID 137).
- Real transaction hash broadcasting verified on block explorers ([3xpl.com](https://3xpl.com), [polygonscan.com](https://polygonscan.com)).

### 4. Automated Cold Treasury Sweeper Engine
To minimize hot wallet vulnerability:
- A daemon periodically calculates hot wallet reserves against configurable risk thresholds (`HOT_WALLET_MAX_PUSD`, `HOT_WALLET_MAX_BCH`, `HOT_WALLET_MAX_USDC`).
- Excess funds are swept directly into multi-sig Cold Treasury storage.

---

## 🏗️ Architecture & Flow

```
[User Browser]
      │
      │ 1. Connects Wallet (Paytaca / Electron Cash / MetaMask / WalletConnect)
      │ 2. Initiates Swap: PUSD (BCH) -> USDC (Polygon)
      ▼
[BinaryLiquid Backend API :3001]
      │
      ├─► Generates isolated BIP-44 address (e.g. m/44'/145'/0'/0/42)
      ├─► Persists order state in PostgreSQL + Redis PubSub
      └─► Returns deposit address & QR code to User
      │
      ▼ (User transfers PUSD on Bitcoin Cash)
[Relayer Engine Monitor]
      │
      ├─► Detects confirmed UTXO on child address
      ├─► Computes AMM price via Dynamic Constant Product Pool (x * y = k)
      ├─► Dispatches USDC from EVM Hot Wallet to User's Polygon address
      └─► Sweeper engine queues surplus to Cold Vault
```

---

## 📂 Project Structure

```
BinaryLiquid_swap/
├── backend/
│   ├── config.js                 # Network RPCs, contract addresses, fee economics
│   ├── server.js                 # Express API (swaps, pools, stats, faucet, orders)
│   ├── .env.example              # Sanitized environment template
│   ├── services/
│   │   ├── bchService.js         # Bitcoin Cash CashTokens UTXO & token management
│   │   ├── evmService.js         # Polygon EVM contract interactions (ERC-20 transfers)
│   │   ├── poolService.js        # Constant product AMM, custom pool factory, Anti-Rug
│   │   ├── lendingService.js     # Non-custodial lending vaults & borrow engine
│   │   ├── perpsService.js       # Perpetual Futures & synthetic settlement
│   │   ├── relayerEngine.js      # Autonomous order state machine & executor
│   │   ├── oraclePool.js         # Multi-source live price feeds
│   │   └── db.js                 # PostgreSQL + Redis store with memory fallback
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx               # Main application container, wallet state & routing
│   │   ├── components/
│   │   │   ├── BridgeSwap.tsx    # Swap interface with BIP-44 badge & on-chain verification
│   │   │   ├── PoolsView.tsx     # Liquidity pools list & Custom Pair Creator Modal
│   │   │   ├── TokenSelectModal.tsx # Multi-chain token selector (supports CashTokens)
│   │   │   ├── LiveOrderbook.tsx # Real-time limit orders & trade feed
│   │   │   ├── NativeChart.tsx   # Lightweight TradingView charts
│   │   │   └── FaucetModal.tsx   # Testnet faucet dispenser for testing
│   │   └── services/
│   │       └── walletConnectService.ts # Multi-wallet abstraction (Reown / Web3Modal)
│   ├── vite.config.ts
│   └── tailwind.config.js
│
└── README.md
```

---

## 🚀 Quickstart Guide (Local Development)

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0
- Optional: PostgreSQL & Redis (falls back to memory store if not running)

### 1. Clone & Setup Backend
```bash
cd backend
cp .env.example .env
# Fill in your RPC endpoints or test keys in .env
npm install
npm run dev
# Backend starts on http://localhost:3001
```

### 2. Setup Frontend
```bash
cd ../frontend
npm install
npm run dev
# Frontend starts on http://localhost:5173
```

### 3. Production Build
```bash
cd frontend
npm run build
# Outputs optimized SPA to frontend/dist/
```

---

## 🛡️ Security & Non-Custodial Principles

1. **No Co-Mingled Funds**: BIP-44 isolated derivation paths prevent race conditions, replay attacks, and UTXO contention.
2. **Cold Storage Protection**: Hot wallets maintain only operational liquidity; surplus is automatically swept to multi-signature cold storage.
3. **Anti-Rug Pool Lock**: In Bootstrapping mode, the contract logic enforces permanent locking of initial LP shares, eliminating the risk of sudden liquidity drain while rewarding creators with perpetual swap fee revenue.
4. **Environment Isolation**: Production private keys and seed phrases are stored exclusively in secure server keystores and never exposed to public repositories or client builds.

---

## 🏆 BLAZE Hackathon Alignment

- **Category**: Stablecoin Track — `$750 PUSD (ParyonUSD) Prize Pool`
- **Impact**: Provides instant cross-chain liquidity and accessibility for `PUSD` and `MUSD`, enabling seamless swaps between Bitcoin Cash CashTokens and multi-billion-dollar EVM stablecoin liquidity.
- **Production URL**: [https://bsprotocol.xyz](https://bsprotocol.xyz)

---

## 📄 License
This project is open-source under the [MIT License](LICENSE).
