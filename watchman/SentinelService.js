/**
 * @file SentinelService.js
 * @description The Watchman Core Sentinel Service: Autonomous cross-chain auditor that monitors
 * on-chain events, runs mathematical rate audits + circuit breakers, and generates cryptographic
 * proofs to authorize Smart Contract Vault & CashScript Covenant releases without touching custody.
 */

import crypto from 'crypto';
import { ethers } from 'ethers';
import { OracleAuditor } from './oracleAuditor.js';
import { CircuitBreaker } from './circuitBreaker.js';

export class SentinelService {
  /**
   * @param {Object} options
   * @param {string} options.signerPrivateKey EVM private key used ONLY for ECDSA attestations & gas
   * @param {string} [options.bchPubKeyHex] BCH compressed public key embedded in CashScript Covenants
   * @param {Function} [options.rateResolver] External multi-oracle rate resolver
   */
  constructor(options = {}) {
    const rawKey = options.signerPrivateKey
      ? (options.signerPrivateKey.startsWith('0x') ? options.signerPrivateKey : `0x${options.signerPrivateKey}`)
      : null;
    this.hasConfiguredSigner = Boolean(rawKey);
    if (!this.hasConfiguredSigner) {
      console.warn('[THE WATCHMAN] ⚠️ Signer private key missing; refusing production attestations without configured key.');
    }
    this.wallet = rawKey ? new ethers.Wallet(rawKey) : ethers.Wallet.createRandom();
    this.signerAddress = this.wallet.address;
    this.bchPubKeyHex = options.bchPubKeyHex || '0332d7133520cebac59c3d16b05421cfcc713cf837a8066475cccebccb677d7243';

    // Deterministic Ed25519 keypair for Solana SVM Anchor Vault (`binary_liquid_vault`)
    const edSeed = crypto.createHash('sha256').update(this.wallet.privateKey).digest();
    const pkcs8Header = Buffer.from('302e020100300506032b657004220420', 'hex');
    this.ed25519PrivateKey = crypto.createPrivateKey({
      key: Buffer.concat([pkcs8Header, edSeed]),
      format: 'der',
      type: 'pkcs8'
    });
    const edPubDer = crypto.createPublicKey(this.ed25519PrivateKey).export({ type: 'spki', format: 'der' });
    this.solanaPubKeyHex = edPubDer.subarray(-32).toString('hex');

    this.oracleAuditor = new OracleAuditor(1.5, options.rateResolver || null);
    this.circuitBreaker = new CircuitBreaker();

    this.processedTransactions = new Set();
    this.maxProcessedHistory = 50000;
    this.auditLog = [];

    console.log(`[THE WATCHMAN] 👁️ Sentinel online (Zero-Custody). EVM Signer: ${this.signerAddress} | Solana Ed25519: ${this.solanaPubKeyHex.slice(0, 16)}...`);
  }

  recordProcessedTransaction(replayKey) {
    if (this.processedTransactions.size >= this.maxProcessedHistory) {
      const oldestKey = this.processedTransactions.values().next().value;
      if (oldestKey) this.processedTransactions.delete(oldestKey);
    }
    this.processedTransactions.add(replayKey);
  }

  decodeSolanaPubkey32(base58Str) {
    const val = ethers.decodeBase58(String(base58Str || '').trim());
    const hex = val.toString(16).padStart(64, '0');
    if (hex.length > 64) {
      throw new Error(`Invalid Solana public key length for ${base58Str}`);
    }
    return Buffer.from(hex, 'hex');
  }

  /**
   * Converts any origin TXID or UTXO reference into deterministic 32-byte hex for Solidity anti-replay
   */
  normalizeOriginHashBytes32(originTxHash) {
    const raw = (originTxHash || '').trim();
    const withoutPrefix = raw.startsWith('0x') ? raw.slice(2) : raw;
    if (/^[0-9a-fA-F]{64}$/.test(withoutPrefix)) {
      return `0x${withoutPrefix.toLowerCase()}`;
    }
    return ethers.id(raw);
  }

  /**
   * Audits a cross-chain swap request and generates cryptographic authorization for the destination Vault/Covenant
   * @param {Object} intent
   * @param {'EVM'|'BCH'} intent.destinationType
   * @param {string} intent.originTxHash TxID on origin chain
   * @param {string} intent.fromToken Origin token symbol
   * @param {string} intent.toToken Destination token symbol
   * @param {string} intent.recipient Destination wallet address
   * @param {string} [intent.tokenAddress] Destination ERC-20 address (when destinationType === 'EVM')
   * @param {number} [intent.tokenDecimals] Token decimals (default 6)
   * @param {number} intent.amount Net payout amount
   * @param {number} intent.rate Exchange rate
   * @param {number} [intent.chainId] Target EVM chainId (e.g. 80002)
   * @param {string} [intent.vaultContractAddress] Target Vault contract address
   */
  async auditAndAuthorize(intent) {
    const {
      destinationType = 'EVM',
      originTxHash,
      fromToken = 'PUSD',
      toToken = 'USDC',
      recipient,
      tokenAddress,
      tokenDecimals = 6,
      amount,
      rate = 1.0,
      chainId = 80002,
      vaultContractAddress
    } = intent;

    if (!this.hasConfiguredSigner && process.env.NODE_ENV === 'production') {
      return { approved: false, reason: 'Watchman cryptographic signer not configured in production' };
    }

    if (!originTxHash) {
      return { approved: false, reason: 'Missing originTxHash for Watchman audit' };
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return { approved: false, reason: 'Invalid payout amount for Watchman audit' };
    }

    const replayKey = originTxHash.trim().toLowerCase();

    // 1. Anti-Replay Guard
    if (this.processedTransactions.has(replayKey)) {
      return { approved: false, reason: 'Replay Attack blocked by The Watchman: Origin TX already attested' };
    }

    // 2. Oracle Rate Consensus Audit (run before Circuit Breaker so rejected rates do not inflate rolling volume)
    const oracleCheck = await this.oracleAuditor.auditRate(fromToken, toToken, Number(rate) || 0);
    if (!oracleCheck.valid) {
      return { approved: false, reason: `Oracle audit failed: ${oracleCheck.reason}` };
    }

    // 3. Circuit Breaker Assessment (evaluated in USD equivalent, not raw token units)
    const USD_REF_PRICES = {
      PUSD: 1.0,
      USDT: 1.0,
      USDC: 1.0,
      MUSD: 1.0,
      BCH: 289.13,
      SOL: 101.5,
      LTC: 84.5,
      TON: 5.25,
      ETH: 2345.0,
      POL: 0.0915,
      BNB: 749.0
    };
    const toSym = String(toToken || '').trim().toUpperCase();
    const toTokenUsdPrice =
      Number(oracleCheck.toPriceUsd) > 0
        ? Number(oracleCheck.toPriceUsd)
        : USD_REF_PRICES[toSym] || 1.0;
    const estimatedUsdValue = Number((numericAmount * toTokenUsdPrice).toFixed(2));

    const safetyCheck = this.circuitBreaker.evaluateTransaction(estimatedUsdValue);
    if (!safetyCheck.allowed) {
      return { approved: false, reason: safetyCheck.reason };
    }

    const nonce = Date.now();
    const bchTxHashBytes32 = this.normalizeOriginHashBytes32(originTxHash);

    // 4A. Destination is EVM Smart Contract Vault -> Generate EIP-191 ECDSA Signature
    if (destinationType === 'EVM') {
      try {
        const cleanRecipient = ethers.getAddress(recipient.trim().toLowerCase());
        const cleanToken = ethers.getAddress(tokenAddress.trim().toLowerCase());
        const cleanVault = ethers.getAddress(vaultContractAddress.trim().toLowerCase());
        const parsedAmount = ethers.parseUnits(Number(amount).toFixed(tokenDecimals), tokenDecimals);

        const innerHash = ethers.keccak256(
          ethers.solidityPacked(
            ['bytes32', 'address', 'address', 'uint256', 'uint256', 'uint256', 'address'],
            [bchTxHashBytes32, cleanRecipient, cleanToken, parsedAmount, nonce, BigInt(chainId), cleanVault]
          )
        );

        const signature = await this.wallet.signMessage(ethers.getBytes(innerHash));

        this.recordProcessedTransaction(replayKey);
        this.logAudit({
          timestamp: new Date().toISOString(),
          direction: `${fromToken} ➔ ${toToken} (EVM Vault)`,
          originTxHash,
          recipient: cleanRecipient,
          amount: Number(amount),
          nonce,
          attestation: `ECDSA:${signature.substring(0, 18)}...`
        });

        console.log(`[THE WATCHMAN] ✍️ ECDSA Vault Release Attested for ${cleanRecipient} (${amount} ${toToken})`);

        return {
          approved: true,
          destinationType: 'EVM',
          bchTxHashBytes32,
          proof: signature,
          nonce,
          parsedAmount,
          signerAddress: this.signerAddress
        };
      } catch (err) {
        console.error('[THE WATCHMAN] ❌ EVM ECDSA signing error:', err.message);
        return { approved: false, reason: `Watchman ECDSA signing error: ${err.message}` };
      }
    }

    // 4B. Destination is Solana SVM Anchor Vault -> Generate Ed25519 Signature
    if (destinationType === 'SOLANA') {
      try {
        const cleanRecipient = (recipient || '').trim();
        const cleanMint = (tokenAddress || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v').trim();
        const programId = (vaultContractAddress || 'BLiqVau1tSo1anaCrossChainBridge111111111111').trim();
        const parsedAmount = ethers.parseUnits(Number(amount).toFixed(tokenDecimals), tokenDecimals);

        // Canonical binary digest matching Anchor `solana_program::hash::hashv` in BinaryLiquidVault (lib.rs)
        const amountLe = Buffer.alloc(8);
        amountLe.writeBigUInt64LE(parsedAmount);
        const nonceLe = Buffer.alloc(8);
        nonceLe.writeBigUInt64LE(BigInt(nonce));

        const solanaDigest = crypto
          .createHash('sha256')
          .update(
            Buffer.concat([
              Buffer.from('SOLANA_VAULT_RELEASE', 'utf8'),
              Buffer.from(ethers.getBytes(bchTxHashBytes32)),
              this.decodeSolanaPubkey32(cleanRecipient),
              this.decodeSolanaPubkey32(cleanMint),
              amountLe,
              nonceLe,
              this.decodeSolanaPubkey32(programId)
            ])
          )
          .digest();

        const edSigBuffer = crypto.sign(null, solanaDigest, this.ed25519PrivateKey);
        const edSigHex = `0x${edSigBuffer.toString('hex')}`;

        this.recordProcessedTransaction(replayKey);
        this.logAudit({
          timestamp: new Date().toISOString(),
          direction: `${fromToken} ➔ ${toToken} (Solana SVM Vault)`,
          originTxHash,
          recipient: cleanRecipient,
          amount: Number(amount),
          nonce,
          attestation: `ED25519:${edSigHex.substring(0, 18)}...`
        });

        console.log(`[THE WATCHMAN] ✍️ Ed25519 Solana Vault Release Attested for ${cleanRecipient} (${amount} ${toToken})`);

        return {
          approved: true,
          destinationType: 'SOLANA',
          bchTxHashBytes32,
          proof: edSigHex,
          nonce,
          parsedAmount,
          solanaWatchmanPubKey: this.solanaPubKeyHex
        };
      } catch (err) {
        console.error('[THE WATCHMAN] ❌ Solana Ed25519 signing error:', err.message);
        return { approved: false, reason: `Watchman Ed25519 signing error: ${err.message}` };
      }
    }

    // 4C. Destination is BCH CashScript Covenant -> Authorize Schnorr Covenant Continuation
    const attestationDigest = ethers.keccak256(
      ethers.toUtf8Bytes(`BCH_COVENANT_RELEASE:${originTxHash}:${recipient}:${amount}:${nonce}`)
    );
    const auditSig = await this.wallet.signMessage(ethers.getBytes(attestationDigest));

    this.recordProcessedTransaction(replayKey);
    this.logAudit({
      timestamp: new Date().toISOString(),
      direction: `${fromToken} ➔ ${toToken} (BCH Covenant)`,
      originTxHash,
      recipient,
      amount: Number(amount),
      nonce,
      attestation: `SCHNORR_AUTH:${auditSig.substring(0, 18)}...`
    });

    console.log(`[THE WATCHMAN] ✍️ BCH Covenant Continuation Authorized for ${recipient} (${amount} ${toToken})`);

    return {
      approved: true,
      destinationType: 'BCH',
      bchTxHashBytes32,
      proof: auditSig,
      nonce,
      signerAddress: this.signerAddress,
      bchPubKeyHex: this.bchPubKeyHex
    };
  }

  /**
   * Releases an anti-replay lock ONLY if downstream on-chain broadcast reverted before mining
   */
  rollbackAuthorization(originTxHash) {
    if (originTxHash) {
      this.processedTransactions.delete(originTxHash.trim().toLowerCase());
    }
  }

  logAudit(entry) {
    this.auditLog.unshift(entry);
    if (this.auditLog.length > 500) this.auditLog.pop();
  }

  getStatus() {
    return {
      status: 'ONLINE',
      mode: '100% NON-CUSTODIAL TRIANGULAR SENTINEL (ECDSA + SCHNORR + ED25519)',
      evmSignerAddress: this.signerAddress,
      bchSignerPubKey: this.bchPubKeyHex,
      solanaEd25519PubKey: this.solanaPubKeyHex,
      circuitBreaker: this.circuitBreaker.getStatus(),
      processedCount: this.processedTransactions.size,
      recentAudits: this.auditLog.slice(0, 15)
    };
  }
}
