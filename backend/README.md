# BinaryLiquid Protocol — Backend API & Relayer Engine

Node.js / Express backend powering the **BinaryLiquid Protocol** across Bitcoin Cash (Mainnet & Chipnet CashTokens), Polygon PoS/Amoy, BNB Smart Chain, Solana, TON, and Litecoin.

---

## Architecture Overview

```text
 [ FRONTEND / WEB WALLET / SDK ]
                │
                ▼  Express REST API (helmet, CORS, rate limiting, HMAC auth)
     [ backend/server.js ]
                │
                ├──► Cross-Chain Swaps & AMM (relayerEngine.js, poolService.js)
                ├──► Non-Custodial P2P Escrow (p2pService.js -> BinaryLiquidP2PEscrow.cash)
                ├──► Multi-CEX Median Oracle (oraclePool.js: Binance, OKX, Coinbase, Kraken, KuCoin + Cauldron)
                ├──► BCH Wallet Read/HD/FX API (bchService.js: Electrum UTXO, CashTokens, FX rates)
                ├──► Testnet Perps & Lending (perpsService.js, lendingService.js)
                └──► Watchman Sentinel Client (watchmanClient.js + global anti-replay in db.js)
```

---

## Key Capabilities

1. **Multi-Chain Verification & Settlement:** Connects Bitcoin Cash CashTokens (`PUSD`, `MUSD`, `LIFT`) and `BCH` with EVM (`Polygon`, `BSC`), `Solana`, `TON`, and `Litecoin`, enforcing strict Mainnet/Testnet cross-network parity.
2. **Non-Custodial P2P Fiat Escrow API:** Generates per-trade `BinaryLiquidP2PEscrow.cash` P2SH-32 covenant addresses, enforces mandatory UserLink `@handle` identity, protects seller banking details until on-chain escrow funding is confirmed, tracks `1–5 ★` verified merchant reviews, and credits `+0.25%` `$LIFT` cashback on settled trades.
3. **Constant Product AMM & Custom Pools:** Supports `0.30%` swap fee (`0.20%` LP share, `0.10%` protocol share) and permissionless CashToken pool creation.
4. **Multi-CEX Median Price Oracle:** Queries Binance, OKX, Coinbase, Kraken, and KuCoin in parallel with outlier rejection and Cauldron DEX CashToken routing.
5. **Read-Only BCH Wallet & FX Endpoints:** Serves UTXO balances, multi-address HD Electrum history, CashTokens (`PUSD`, `MUSD`, `LIFT`), and fiat FX rates for `wallet.bliquid.xyz`.
6. **Security Controls:** Global cross-module transaction hash anti-replay registry, SSRF-hardened BCMR fetching (`bcmrService.js`), strict `SIMULATE_IF_NO_FUNDS=false` production mode, and automated regression tests (`test-api.js`).

---

## Quickstart (Local)

```bash
# 1. Install dependencies
cd backend
npm install

# 2. Configure environment (never commit .env)
cp .env.example .env

# 3. Run the automated security & regression test suite
node test-api.js

# 4. Start the API server
npm start
# or watch mode:
npm run dev
```

---

## Core API Groups

- **Health & Oracle:** `GET /api/status`, `GET /api/prices`, `GET /api/fx/rates`, `GET /api/treasury`
- **Cross-Chain Swaps:** `GET /api/quote`, `POST /api/swap/create`, `POST /api/swap/:id/verify-tx`, `GET /api/swaps/recent`
- **AMM Liquidity Pools:** `GET /api/pools`, `POST /api/pools/create`, `POST /api/pools/:id/add-liquidity`, `POST /api/pools/:id/remove-liquidity`
- **P2P Fiat Escrow:** `GET /api/p2p/offers`, `POST /api/p2p/offers`, `POST /api/p2p/trades`, `POST /api/p2p/trades/:tradeId/verify-deposit`, `POST /api/p2p/trades/:tradeId/mark-paid`, `POST /api/p2p/trades/:tradeId/release`, `POST /api/p2p/trades/:tradeId/review`, `GET /api/p2p/merchants/:address/reviews`
- **Wallet & Identity:** `GET /api/bch/utxos`, `POST /api/bch/history`, `GET /.well-known/nostr.json`
- **Testnet DeFi:** `/api/perps/*` and `/api/lending/*`

---

## Production Deployment (PM2)

```bash
cd /var/www/binaryliquid-bridge/backend
npm install --omit=dev
chmod 600 .env
pm2 start ecosystem.config.cjs
pm2 save
```
