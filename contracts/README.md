# 🛡️ BinaryLiquid Protocol — Non-Custodial Triangular Smart Contracts

This directory contains the core smart contracts powering the **100% Non-Custodial Triangular Cross-Chain Bridge & AMM** connecting:
1. **Bitcoin Cash L1 (CashTokens — PUSD, MUSD, LIFT)**
2. **EVM Networks (Polygon PoS, Ethereum, Arbitrum, Base, Optimism, BNB Chain)**
3. **Solana SVM (SPL Tokens — USDC, USDT, SOL)**

---

## 🏛️ Triangular Architecture Overview

```
                               ┌─────────────────────────────────────────┐
                               │          The Watchman Sentinel          │
                               │    (Autonomous Relayer & Multi-Oracle)  │
                               └──────┬─────────────┬─────────────┬──────┘
                                      │             │             │
                      ECDSA EIP-191   │   Schnorr   │   Ed25519   │
                       Attestation    │ Attestation │ Attestation │
                                      ▼             ▼             ▼
        ┌──────────────────────────────┐  ┌──────────────────────────────┐  ┌──────────────────────────────┐
        │   Universal EVM Vault        │  │    Bitcoin Cash Covenant     │  │   Solana SVM Anchor Vault    │
        │  (BinaryLiquidVault.sol)     │  │   (BinaryLiquidVault.cash)   │  │      (lib.rs / Anchor)       │
        ├──────────────────────────────┤  ├──────────────────────────────┤  ├──────────────────────────────┤
        │ • Polygon, ETH, Arb, Base,BSC│  │ • Holds CashTokens (PUSD)    │  │ • Holds SPL (USDC,USDT,SOL)  │
        │ • Verifies Watchman ECDSA sig│  │ • P2SH-32 UTXO Introspection │  │ • Verifies Ed25519 Precompile│
        │ • 24h Autonomous Timelock    │  │ • 144-block Timelock Refund  │  │ • Atomic PDA Anti-Replay     │
        │ • Anti-Replay Registry       │  │ • Covenant Continuation      │  │ • 24h Autonomous Timelock    │
        └──────────────────────────────┘  └──────────────────────────────┘  └──────────────────────────────┘
```

### Supported Cross-Chain Corridors (All 6 Directions)
- **BCH ➔ EVM** (`CashTokens P2SH-32 Covenant` ➔ `BinaryLiquidVault.sol`)
- **EVM ➔ BCH** (`BinaryLiquidVault.sol` ➔ `CashTokens P2SH-32 Covenant`)
- **BCH ➔ Solana** (`CashTokens P2SH-32 Covenant` ➔ `binary_liquid_vault` Anchor PDA)
- **Solana ➔ BCH** (`binary_liquid_vault` Anchor PDA ➔ `CashTokens P2SH-32 Covenant`)
- **Solana ➔ EVM** (`binary_liquid_vault` Anchor PDA ➔ `BinaryLiquidVault.sol`)
- **EVM ➔ Solana** (`BinaryLiquidVault.sol` ➔ `binary_liquid_vault` Anchor PDA)

---

## 📜 Contract Implementations

### 1. [`contracts/evm/BinaryLiquidVault.sol`](./evm/BinaryLiquidVault.sol) (Solidity ^0.8.20)
- **Deployment Chains:** Universal EVM bytecode — Polygon Mainnet (137), Polygon Amoy (80002), Ethereum (1), Arbitrum One (42161), Base (8453), Optimism (10), BNB Smart Chain (56).
- **Core Guarantees:**
  - **Zero Liability / Zero Custody:** User deposits go directly into the smart contract (`deposit` / `depositToChain`), never an EOA admin wallet.
  - **Cryptographic Payout Release:** Payouts can only be unlocked with a valid EIP-191 ECDSA signature from `The Watchman` (`watchmanSigner`).
  - **Anti-Replay Protection:** Keeps a registry of `executedPayouts[originTxHash]` to ensure each BCH or Solana transaction is credited at most once.
  - **Autonomous Refund:** If unfulfilled within 24 hours (`REFUND_TIMELOCK`), the user can call `refund(depositId)` to retrieve 100% of their deposited principal unilaterally.

### 2. [`contracts/bch/BinaryLiquidVault.cash`](./bch/BinaryLiquidVault.cash) & [`BinaryLiquidEscrow.cash`](./bch/BinaryLiquidEscrow.cash) (CashScript ^0.14.0)
- **Deployment Network:** Bitcoin Cash Mainnet & BCH Chipnet (Testnet4).
- **Core Guarantees:**
  - **P2SH-32 UTXO Introspection Covenants:** Uses native BCH CashTokens opcodes (`tx.outputs[0].tokenCategory`, `tx.outputs[0].tokenAmount`, `tx.inputs[this.activeInputIndex].lockingBytecode`).
  - **Covenant State Continuation:** Forces 100% of remaining pool liquidity back into the exact same Covenant bytecode on every partial release.
  - **Timelock Recovery:** If unspent after `timeoutBlocks` (~144 blocks), the depositor can reclaim the UTXO directly back to their wallet.

### 3. [`contracts/solana/programs/binary_liquid_vault/src/lib.rs`](./solana/programs/binary_liquid_vault/src/lib.rs) (Rust / Anchor ^0.30.1)
- **Deployment Network:** Solana Mainnet-Beta & Solana Devnet (`BLiqVau1tSo1anaCrossChainBridge111111111111`).
- **Core Guarantees:**
  - **Zero-Custody PDA Vault:** Liquidity is held inside Program Derived Addresses (`seeds = [b"vault_state"]`). No administrative withdraw instruction exists.
  - **Ed25519 Precompile Introspection:** `release` inspects Solana's native `ed25519_program` via `sysvar::instructions` to verify The Watchman Sentinel's 64-byte signature over the canonical payout digest.
  - **Atomic Anti-Replay PDA:** Initializes `ExecutedPayout` PDA (`seeds = [b"payout", origin_tx_hash.as_ref()]`), preventing any BCH or EVM transaction from being settled twice.
  - **Autonomous 24h Timelock Refund:** `refund` returns 100% of deposited SPL Tokens from the Vault PDA back to the depositor after `86,400` seconds if unsettled.

---

## 🔒 Security Principles & Formal Audit

> 📄 **Full Cryptographic Security Report:** See [`../SECURITY_AUDIT.md`](../SECURITY_AUDIT.md) for the complete Attack Surface Mitigation Matrix, EIP-2/SafeERC20/Ed25519 Precompile verification details, and Institutional HSM/MPC roadmap.

1. **Self-Custody Always:** Nobody, including BinaryLiquid developers, can seize or redirect user funds across Bitcoin Cash, EVM, or Solana.
2. **Server Failure Tolerance:** If the relayer or The Watchman goes offline, user funds remain safely locked in the on-chain Covenant/Vault until the service resumes or the 24h timelock expires for unilateral refund.
3. **No Centralized Hot Wallet:** Private keys in the Watchman Sentinel belong strictly to an **Attestation Signer / Oracle**, never a fund custodian.
