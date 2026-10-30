# 👁️ The Watchman — Autonomous Cross-Chain Sentinel

> **"Who watches the watchers? The Mathematics of the Blockchain."**

**The Watchman** is the off-chain autonomous security and attestation engine of the **BinaryLiquid Protocol**. It acts as the bridge verifier between **Bitcoin Cash (CashTokens)** and **Polygon PoS / Amoy**, enforcing zero-custody guarantees and preventing bridge exploits.

---

## 🛡️ Why The Watchman is 100% Non-Custodial

In traditional bridges (or centralized exchanges), the server holds user funds in a central hot wallet. If the server is compromised, funds are stolen.

**Under The Watchman architecture:**
1. **Zero Fund Custody:** The Watchman never holds user deposit funds. All funds reside in on-chain smart contracts (`BinaryLiquidVault.sol` & `BinaryLiquidVault.cash`).
2. **Attestation-Only Signing:** The Watchman's private key is strictly an **Oracle / Attestation Signer**. It cannot withdraw or steal funds; it can only sign cryptographic proofs that match the immutable rules of the destination contract.
3. **Target Address Invariance:** Even if an attacker compromises the server, the on-chain smart contracts only release funds to the designated recipient specified by the original depositor.
4. **Server Sabotage Resilience:** If the server is destroyed or wiped, user funds remain safely locked in the smart contracts, and depositors can unilaterally withdraw 100% of their money via the **24-hour Timelock Refund**.

---

## ⚙️ Architecture & Modules

```
watchman/
├── index.js             # Daemon entry point & ASCII monitor
├── SentinelService.js   # Core listener, event parser & ECDSA proof signer
├── oracleAuditor.js     # Real-time Pyth/Hermes/Cauldron price verification
├── circuitBreaker.js    # Autonomous volume limiter & emergency stop valve
└── README.md            # Architectural documentation
```

### 1. `SentinelService.js`
- Monitors blockchain events on origin chains (`BridgeDepositInitiated` on Polygon, UTXO movements on Bitcoin Cash).
- Validates transaction finality (block depth and confirmation count).
- Generates EIP-191 / ECDSA cryptographic proofs to authorize destination releases.
- Maintains an in-memory Anti-Replay Registry to thwart double-spending.

### 2. `oracleAuditor.js`
- Compares cross-chain swap requests against decentralized oracle benchmarks (Pyth Hermes, Cauldron DEX).
- Halts execution if slippage exceeds 1.0%, protecting liquidity providers and users from front-running or stale prices.

### 3. `circuitBreaker.js`
- Enforces velocity checks ($50,000 max single transaction size, $250,000 hourly rolling threshold).
- Automatically triggers a protocol-level pause if anomalous volatility, deep chain reorgs, or flash-loan attacks are detected.

---

## 🚀 Execution & Verification

Run The Watchman standalone or inside PM2:

```bash
# Direct execution
node watchman/index.js

# Production PM2 deployment
pm2 start watchman/index.js --name "binaryliquid-watchman"
```
