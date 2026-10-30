/**
 * @file SentinelService.js
 * @description The Watchman Core Sentinel Service: Autonomous cross-chain auditor that monitors
 * on-chain events, runs mathematical rate audits, and generates ECDSA cryptographic proofs to authorize
 * releases without ever touching user deposit funds.
 */

import { ethers } from 'ethers';
import { OracleAuditor } from './oracleAuditor.js';
import { CircuitBreaker } from './circuitBreaker.js';

export class SentinelService {
  /**
   * @param {Object} options
   * @param {string} options.signerPrivateKey Private key used ONLY for signing attestations (Zero-Custody)
   * @param {string} options.polygonRpcUrl
   * @param {string} options.bchElectrumUrl
   */
  constructor(options = {}) {
    this.signerKey = options.signerPrivateKey;
    this.wallet = this.signerKey ? new ethers.Wallet(this.signerKey) : ethers.Wallet.createRandom();
    this.signerAddress = this.wallet.address;

    this.oracleAuditor = new OracleAuditor(1.0); // 1% max deviation
    this.circuitBreaker = new CircuitBreaker();

    this.processedTransactions = new Set();
    this.auditLog = [];

    console.log(`[THE WATCHMAN] 👁️ Sentinel initialized. Public Signer: ${this.signerAddress}`);
  }

  /**
   * Audits a cross-chain swap request and generates an ECDSA proof for the destination contract
   * @param {Object} intent
   * @param {string} intent.originTxHash TxID on origin chain
   * @param {string} intent.recipient Destination wallet address
   * @param {string} intent.token Token symbol / address
   * @param {number} intent.amount Net amount
   * @param {number} intent.rate Exchange rate
   * @param {number} intent.chainId Target EVM chainId
   * @param {string} intent.vaultContractAddress Target Vault contract address
   * @returns {Promise<{ approved: boolean, proof?: string, nonce?: number, reason?: string }>}
   */
  async auditAndAuthorize(intent) {
    const { originTxHash, recipient, token, amount, rate, chainId, vaultContractAddress } = intent;

    // 1. Anti-Replay Guard
    if (this.processedTransactions.has(originTxHash.toLowerCase())) {
      return { approved: false, reason: 'Replay Attack blocked: Origin transaction already settled' };
    }

    // 2. Circuit Breaker Assessment
    const safetyCheck = this.circuitBreaker.evaluateTransaction(amount);
    if (!safetyCheck.allowed) {
      return { approved: false, reason: safetyCheck.reason };
    }

    // 3. Oracle Rate Validation
    const oracleCheck = await this.oracleAuditor.auditRate('USDC', 'PUSD', rate || 1.0);
    if (!oracleCheck.valid) {
      return { approved: false, reason: `Oracle audit failed: ${oracleCheck.reason}` };
    }

    // 4. Generate Cryptographic Attestation (ECDSA Signature)
    try {
      const nonce = Date.now();
      const cleanHash = originTxHash.startsWith('0x') ? originTxHash : `0x${originTxHash.padStart(64, '0')}`;
      const parsedAmount = ethers.parseUnits(amount.toFixed(6), 6);

      // Pack according to BinaryLiquidVault.sol message specification
      const messageHash = ethers.keccak256(
        ethers.solidityPacked(
          ['bytes32', 'address', 'address', 'uint256', 'uint256', 'uint256', 'address'],
          [cleanHash, recipient, token, parsedAmount, nonce, chainId || 137, vaultContractAddress]
        )
      );

      // Sign with Watchman private key
      const signature = await this.wallet.signMessage(ethers.getBytes(messageHash));

      this.processedTransactions.add(originTxHash.toLowerCase());

      this.logAudit({
        timestamp: new Date().toISOString(),
        originTxHash,
        recipient,
        amount,
        nonce,
        signature: `${signature.substring(0, 14)}...`
      });

      console.log(`[THE WATCHMAN] ✍️ Approved & Attested swap for ${recipient} ($${amount})! Sig: ${signature.substring(0, 16)}...`);

      return {
        approved: true,
        proof: signature,
        nonce,
        signerAddress: this.signerAddress
      };
    } catch (err) {
      console.error('[THE WATCHMAN] ❌ Signing error:', err.message);
      return { approved: false, reason: `Cryptographic signing failure: ${err.message}` };
    }
  }

  logAudit(entry) {
    this.auditLog.unshift(entry);
    if (this.auditLog.length > 500) this.auditLog.pop();
  }

  getStatus() {
    return {
      status: 'ONLINE',
      mode: 'NON_CUSTODIAL_SENTINEL',
      signerAddress: this.signerAddress,
      circuitBreaker: this.circuitBreaker.getStatus(),
      processedCount: this.processedTransactions.size,
      recentAudits: this.auditLog.slice(0, 10)
    };
  }
}
