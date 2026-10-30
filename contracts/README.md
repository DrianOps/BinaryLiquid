# 🛡️ BinaryLiquid Protocol — Non-Custodial Smart Contracts

This directory contains the core smart contracts powering the **100% Non-Custodial Cross-Chain Bridge** between **Bitcoin Cash (CashTokens)** and **EVM (Polygon PoS & Polygon Amoy)**.

---

## 🏛️ Architecture Overview

```
                      ┌─────────────────────────────────────────┐
                      │          The Watchman Sentinel          │
                      │    (Autonomous Relayer & Oracle)        │
                      └─────────────┬─────────────┬─────────────┘
                                    │             │
                    Cryptographic   │             │  Cryptographic
                    Attestation     │             │  Attestation
                                    ▼             ▼
       ┌──────────────────────────────┐         ┌──────────────────────────────┐
       │   Polygon PoS / Amoy Vault   │         │    Bitcoin Cash Covenant     │
       │  (BinaryLiquidVault.sol)     │         │   (BinaryLiquidVault.cash)   │
       ├──────────────────────────────┤         ├──────────────────────────────┤
       │ • Holds ERC-20 (USDC, USDT)  │         │ • Holds CashTokens (PUSD)    │
       │ • Verifies Watchman ECDSA sig│         │ • Introspection Covenants    │
       │ • 24h Autonomous Timelock    │         │ • 144-block Timelock Refund  │
       │ • Anti-Replay Protection     │         │ • Output category validation │
       └──────────────────────────────┘         └──────────────────────────────┘
```

---

## 📜 Contract Implementations

### 1. [`contracts/evm/BinaryLiquidVault.sol`](./evm/BinaryLiquidVault.sol) (Solidity ^0.8.20)
- **Deployment Chains:** Polygon Mainnet (137) & Polygon Amoy Testnet (80002).
- **Core Guarantees:**
  - **Zero Liability / Zero Custody:** User deposits go directly into the smart contract, not an admin address.
  - **Cryptographic Payout Release:** Payouts can only be unlocked with a valid ECDSA signature from `The Watchman` (`watchmanSigner`).
  - **Anti-Replay Protection:** Keeps a registry of `executedPayouts[bchTxHash]` to ensure each cross-chain transaction is credited exactly once.
  - **Autonomous Refund:** If for any reason the bridge fails to fulfill on Bitcoin Cash within 24 hours (`REFUND_TIMELOCK`), the user can call `refund(depositId)` to retrieve 100% of their deposited principal without admin intervention.

### 2. [`contracts/bch/BinaryLiquidVault.cash`](./bch/BinaryLiquidVault.cash) (CashScript ^0.9.0)
- **Deployment Network:** Bitcoin Cash Mainnet & BCH Chipnet (Testnet4).
- **Core Guarantees:**
  - **UTXO Introspection Covenants:** Uses native BCH CashTokens opcodes (`tx.outputs[0].tokenCategory`, `tx.outputs[0].tokenAmount`).
  - **Direct Settlement:** Enforces output #0 locking bytecode matches the intended recipient.
  - **Timelock Recovery:** If unspent after `timeoutBlocks` (~144 blocks), the depositor can spend the UTXO back to their original address.

---

## 🔒 Security Principles

1. **Self-Custody Always:** Nobody, including BinaryLiquid developers, can seize or redirect user funds.
2. **Server Failure Tolerance:** If the server or The Watchman crashes, user funds remain safely locked in the contract until the service resumes or the timelock expires for refund.
3. **No Centralized Hot Wallet:** The private keys in the backend belong to an authorized **Signer / Oracle**, not a fund custodian.
