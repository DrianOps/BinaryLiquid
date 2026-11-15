import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import { ECPairFactory } from 'ecpair';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config.js';
import { db } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

bitcoin.initEccLib(ecc);
const ECPair = ECPairFactory(ecc);

export const LITECOIN_TESTNET = {
  messagePrefix: '\x19Litecoin Signed Message:\n',
  bech32: 'tltc',
  bip32: {
    public: 0x043587cf,
    private: 0x04358394
  },
  pubKeyHash: 0x6f,
  scriptHash: 0x3a,
  wif: 0xef
};

export const LITECOIN_MAINNET = {
  messagePrefix: '\x19Litecoin Signed Message:\n',
  bech32: 'ltc',
  bip32: {
    public: 0x019da462,
    private: 0x019d9cfe
  },
  pubKeyHash: 0x30,
  scriptHash: 0x32,
  wif: 0xb0
};

const LITECOIN_TESTNET_ALT = { ...LITECOIN_TESTNET, scriptHash: 0xc4 };
const LITECOIN_MAINNET_LEGACY_P2SH = { ...LITECOIN_MAINNET, scriptHash: 0x05 };

export class LitecoinService {
  constructor() {
    this.testnetApiUrl = 'https://litecoinspace.org/testnet/api';
    this.mainnetApiUrl = 'https://litecoinspace.org/api';
    this.testnetExplorer = 'https://litecoinspace.org/testnet';
    this.mainnetExplorer = 'https://litecoinspace.org';

    this.vaultConfig = null;
    this.loadVaultKey();
  }

  loadVaultKey() {
    try {
      const p = path.join(__dirname, '..', 'config', 'ltc-vault.json');
      if (fs.existsSync(p)) {
        this.vaultConfig = JSON.parse(fs.readFileSync(p, 'utf-8'));
      }
    } catch (err) {
      console.warn('[LitecoinService] Warning loading ltc-vault.json:', err.message);
    }
  }

  isLtcChain(chain) {
    if (!chain) return false;
    const c = String(chain).toLowerCase();
    return c.includes('litecoin') || c.includes('ltc');
  }

  getNetwork(isTestnet = true) {
    return isTestnet ? LITECOIN_TESTNET : LITECOIN_MAINNET;
  }

  getApiUrl(isTestnet = true) {
    return isTestnet ? this.testnetApiUrl : this.mainnetApiUrl;
  }

  getExplorerUrl(isTestnet = true) {
    return isTestnet ? this.testnetExplorer : this.mainnetExplorer;
  }

  getVaultAddress(isTestnet = true) {
    if (!isTestnet) {
      return config.litecoin?.mainnetVaultAddress || null;
    }
    if (this.vaultConfig?.segwitAddress) {
      return this.vaultConfig.segwitAddress;
    }
    return config.litecoin?.testnetVaultAddress || 'tltc1qfjhru5y6lmjq542f7wkjn2ra5z0w2trfldj4ls';
  }

  getColdTreasuryAddress() {
    return config.litecoin?.coldTreasuryAddress || 'tltc1q3qxwcdr6pgldmr3vsr0smr6ascarvsnr4c69ay';
  }

  isValidAddress(address, isTestnet = null) {
    if (!address || typeof address !== 'string') return false;
    const clean = address.trim();
    if (!clean || clean.length < 26 || clean.length > 90) return false;

    const candidateNets =
      isTestnet === true
        ? [LITECOIN_TESTNET, LITECOIN_TESTNET_ALT]
        : isTestnet === false
        ? [LITECOIN_MAINNET, LITECOIN_MAINNET_LEGACY_P2SH]
        : [LITECOIN_TESTNET, LITECOIN_TESTNET_ALT, LITECOIN_MAINNET, LITECOIN_MAINNET_LEGACY_P2SH];

    for (const net of candidateNets) {
      try {
        // Normalize lowercase only for Bech32/Bech32m; Base58Check is case-sensitive
        const normalized = /^(t?ltc1)/i.test(clean) ? clean.toLowerCase() : clean;
        bitcoin.address.toOutputScript(normalized, net);
        return true;
      } catch {
        // Try next candidate Litecoin network params
      }
    }
    return false;
  }

  async getBalance(address, isTestnet = true) {
    if (!address || !this.isValidAddress(address, isTestnet)) {
      const oppositeValid = address ? this.isValidAddress(address, !isTestnet) : false;
      return {
        ltc: 0,
        litoshis: 0,
        ...(oppositeValid ? { networkMismatch: true } : { invalid: true })
      };
    }

    const clean = /^(t?ltc1)/i.test(address.trim()) ? address.trim().toLowerCase() : address.trim();
    const api = this.getApiUrl(isTestnet);

    try {
      const res = await fetch(`${api}/address/${encodeURIComponent(clean)}`, {
        signal: AbortSignal.timeout(6000)
      });
      if (res.ok) {
        const data = await res.json();
        const chainFunded = Number(data.chain_stats?.funded_txo_sum || 0);
        const chainSpent = Number(data.chain_stats?.spent_txo_sum || 0);
        const mempoolFunded = Number(data.mempool_stats?.funded_txo_sum || 0);
        const mempoolSpent = Number(data.mempool_stats?.spent_txo_sum || 0);
        const rawTotal = (chainFunded - chainSpent) + (mempoolFunded - mempoolSpent);
        if (Number.isFinite(rawTotal)) {
          const totalLitoshis = Math.max(0, rawTotal);
          return { ltc: Number((totalLitoshis / 1e8).toFixed(8)), litoshis: totalLitoshis };
        }
      }
    } catch (err) {
      console.warn(`[LitecoinService] Primary balance fetch failed (${clean}):`, err.message);
    }

    // Secondary failover for Litecoin Mainnet via BlockCypher
    if (!isTestnet) {
      try {
        const bcRes = await fetch(`https://api.blockcypher.com/v1/ltc/main/addrs/${encodeURIComponent(clean)}/balance`, {
          signal: AbortSignal.timeout(6000)
        });
        if (bcRes.ok) {
          const bcData = await bcRes.json();
          const finalBal = Number(bcData?.final_balance ?? bcData?.balance ?? 0);
          if (Number.isFinite(finalBal)) {
            const totalLitoshis = Math.max(0, finalBal);
            return { ltc: Number((totalLitoshis / 1e8).toFixed(8)), litoshis: totalLitoshis };
          }
        }
      } catch (err) {
        console.warn(`[LitecoinService] BlockCypher fallback failed (${clean}):`, err.message);
      }
    }

    return { ltc: 0, litoshis: 0, rpcDegraded: true };
  }

  async getVaultBalance(isTestnet = true) {
    const addr = this.getVaultAddress(isTestnet);
    if (!addr) {
      return { ltc: 0, litoshis: 0, unconfigured: true };
    }
    return this.getBalance(addr, isTestnet);
  }

  /**
   * Verifies if a user has sent LTC to the deposit/vault address
   */
  async verifyDeposit(depositAddress, expectedAmountLtc, isTestnet = true, excludeSwapId = null) {
    try {
      const expectedNum = Number(expectedAmountLtc);
      if (!depositAddress || !Number.isFinite(expectedNum) || expectedNum <= 0) {
        return { verified: false, txHash: null };
      }
      const api = this.getApiUrl(isTestnet);
      const res = await fetch(`${api}/address/${encodeURIComponent(depositAddress.trim())}/txs`, {
        signal: AbortSignal.timeout(6000)
      });
      if (!res.ok) return { verified: false, txHash: null };
      const txs = await res.json();
      if (!Array.isArray(txs) || txs.length === 0) {
        return { verified: false, txHash: null };
      }

      const expectedLitoshis = Math.round(expectedNum * 1e8);
      const tolerance = 1000; // strict 0.00001 LTC dust rounding band

      for (const tx of txs) {
        if (!tx?.txid) continue;
        if (db.isTxHashConsumed(tx.txid, { ignoreSwapId: excludeSwapId })) {
          continue;
        }
        const reusedSwap = db.findSwapByDepositTxHash(tx.txid);
        if (reusedSwap && reusedSwap.id !== excludeSwapId) {
          continue;
        }
        for (const out of (tx.vout || [])) {
          if (
            out.scriptpubkey_address === depositAddress &&
            Math.abs(Number(out.value) - expectedLitoshis) <= tolerance
          ) {
            return {
              verified: true,
              txHash: tx.txid,
              confirmed: Boolean(tx.status?.confirmed),
              blockHeight: tx.status?.block_height || null,
              amountReceived: out.value / 1e8
            };
          }
        }
      }
      return { verified: false, txHash: null };
    } catch (err) {
      return { verified: false, txHash: null, error: err.message };
    }
  }

  /**
   * Automated Payout from the Bridge Hot Vault
   */
  async sendPayout(recipientAddress, amountLtc, isTestnet = true) {
    const signingWif = isTestnet
      ? (config.litecoin?.testnetWif || this.vaultConfig?.wif)
      : config.litecoin?.mainnetWif;

    if (!signingWif) {
      throw new Error(
        isTestnet
          ? 'Litecoin Testnet Hot Vault key not loaded in ltcService'
          : 'Litecoin Mainnet Hot Vault key (LTC_MAINNET_WIF) not configured — refusing to sign with Testnet key'
      );
    }
    const cleanRecipient = recipientAddress.trim();
    if (!this.isValidAddress(cleanRecipient, isTestnet)) {
      throw new Error(`Dirección de Litecoin no válida: ${cleanRecipient}`);
    }

    const net = this.getNetwork(isTestnet);
    const keyPair = ECPair.fromWIF(signingWif, net);
    const p2wpkh = bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey, network: net });
    const vaultAddr = p2wpkh.address;

    const api = this.getApiUrl(isTestnet);
    const utxoRes = await fetch(`${api}/address/${vaultAddr}/utxo`, { signal: AbortSignal.timeout(6000) });
    if (!utxoRes.ok) {
      throw new Error('Error consultando UTXOs del Vault de Litecoin');
    }
    const utxos = await utxoRes.json();
    if (!Array.isArray(utxos) || utxos.length === 0) {
      throw new Error(`La bóveda de Litecoin no tiene UTXOs disponibles para liquidar (${vaultAddr})`);
    }

    const targetLitoshis = BigInt(Math.round(Number(amountLtc) * 1e8));
    const feeRatePerVbyte = 10n; // 10 litoshis / vB

    let totalInput = 0n;
    let estimatedFee = 1500n;
    const selectedUtxos = [];

    for (const u of utxos) {
      selectedUtxos.push(u);
      totalInput += BigInt(u.value);
      const estVbytes = BigInt(11 + selectedUtxos.length * 68 + 2 * 31);
      estimatedFee = estVbytes * feeRatePerVbyte;
      if (estimatedFee < 1500n) estimatedFee = 1500n;
      if (totalInput >= targetLitoshis + estimatedFee) break;
    }

    if (totalInput < targetLitoshis + estimatedFee) {
      throw new Error(
        `Saldo insuficiente en la bóveda de Litecoin. Requiere: ${Number(targetLitoshis + estimatedFee) / 1e8} LTC, disponible: ${Number(totalInput) / 1e8} LTC`
      );
    }

    const psbt = new bitcoin.Psbt({ network: net });
    for (const u of selectedUtxos) {
      psbt.addInput({
        hash: u.txid,
        index: u.vout,
        witnessUtxo: {
          script: p2wpkh.output,
          value: BigInt(u.value)
        }
      });
    }

    // Payout output to user
    psbt.addOutput({
      address: cleanRecipient,
      value: targetLitoshis
    });

    // Change output back to vault
    const changeAmount = totalInput - targetLitoshis - estimatedFee;
    if (changeAmount > 1000n) { // dust limit
      psbt.addOutput({
        address: vaultAddr,
        value: changeAmount
      });
    }

    // Sign all inputs and cryptographically verify each ECDSA signature
    const verifySchnorrOrEcdsa = (pubkey, msghash, signature) =>
      ECPair.fromPublicKey(pubkey).verify(msghash, signature);

    for (let i = 0; i < selectedUtxos.length; i++) {
      psbt.signInput(i, keyPair);
      const isSigValid = psbt.validateSignaturesOfInput(i, verifySchnorrOrEcdsa);
      if (!isSigValid) {
        throw new Error(`Invalid secp256k1 signature generated for Litecoin PSBT input #${i}`);
      }
    }
    psbt.finalizeAllInputs();

    const txHex = psbt.extractTransaction().toHex();

    // Broadcast to Litecoin network
    const broadcastRes = await fetch(`${api}/tx`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: txHex
    });

    if (!broadcastRes.ok) {
      const errText = await broadcastRes.text();
      throw new Error(`Error transmitiendo transacción a Litecoin: ${errText}`);
    }

    const txHash = await broadcastRes.text();
    const cleanTxHash = txHash.trim();

    return {
      success: true,
      txHash: cleanTxHash,
      explorerUrl: `${this.getExplorerUrl(isTestnet)}/tx/${cleanTxHash}`,
      amount: Number(targetLitoshis) / 1e8,
      recipient: cleanRecipient
    };
  }
}

export const ltcService = new LitecoinService();
