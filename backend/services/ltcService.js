import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import { ECPairFactory } from 'ecpair';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    if (this.vaultConfig?.segwitAddress) {
      return this.vaultConfig.segwitAddress;
    }
    return config.litecoin?.testnetVaultAddress || 'tltc1qfjhru5y6lmjq542f7wkjn2ra5z0w2trfldj4ls';
  }

  getColdTreasuryAddress() {
    return config.litecoin?.coldTreasuryAddress || 'tltc1q3qxwcdr6pgldmr3vsr0smr6ascarvsnr4c69ay';
  }

  isValidAddress(address, isTestnet = true) {
    if (!address || typeof address !== 'string') return false;
    const clean = address.trim();
    const net = this.getNetwork(isTestnet);

    // Bech32 format: tltc1... (testnet) or ltc1... (mainnet)
    if (isTestnet && clean.toLowerCase().startsWith('tltc1')) {
      return clean.length >= 42 && clean.length <= 62;
    }
    if (!isTestnet && clean.toLowerCase().startsWith('ltc1')) {
      return clean.length >= 42 && clean.length <= 62;
    }

    // Base58 Legacy / P2SH: starts with m/n/2/Q on testnet, or L/M/3 on mainnet
    if (isTestnet) {
      return /^[mn2Q][a-km-zA-HJ-NP-Z1-9]{26,35}$/.test(clean);
    }
    return /^[LM3][a-km-zA-HJ-NP-Z1-9]{26,35}$/.test(clean);
  }

  async getBalance(address, isTestnet = true) {
    try {
      if (!address || !this.isValidAddress(address, isTestnet)) {
        return { ltc: 0, litoshis: 0 };
      }
      const api = this.getApiUrl(isTestnet);
      const res = await fetch(`${api}/address/${encodeURIComponent(address.trim())}`, {
        signal: AbortSignal.timeout(6000)
      });
      if (!res.ok) return { ltc: 0, litoshis: 0 };
      const data = await res.json();
      const chainSum = (data.chain_stats?.funded_txo_sum || 0) - (data.chain_stats?.spent_txo_sum || 0);
      const mempoolSum = (data.mempool_stats?.funded_txo_sum || 0) - (data.mempool_stats?.spent_txo_sum || 0);
      const totalLitoshis = Math.max(0, chainSum + mempoolSum);
      const ltc = totalLitoshis / 1e8;
      return { ltc, litoshis: totalLitoshis };
    } catch (err) {
      return { ltc: 0, litoshis: 0 };
    }
  }

  async getVaultBalance(isTestnet = true) {
    const addr = this.getVaultAddress(isTestnet);
    return this.getBalance(addr, isTestnet);
  }

  /**
   * Verifies if a user has sent LTC to the deposit/vault address
   */
  async verifyDeposit(depositAddress, expectedAmountLtc, isTestnet = true) {
    try {
      if (!depositAddress) return { verified: false, txHash: null };
      const api = this.getApiUrl(isTestnet);
      const res = await fetch(`${api}/address/${encodeURIComponent(depositAddress.trim())}/txs`, {
        signal: AbortSignal.timeout(6000)
      });
      if (!res.ok) return { verified: false, txHash: null };
      const txs = await res.json();
      if (!Array.isArray(txs) || txs.length === 0) {
        return { verified: false, txHash: null };
      }

      const expectedLitoshis = Math.round(Number(expectedAmountLtc) * 1e8);
      const tolerance = 5000; // 0.00005 LTC tolerance

      for (const tx of txs) {
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
    if (!this.vaultConfig?.wif) {
      throw new Error('Litecoin Hot Vault key not loaded in ltcService');
    }
    const cleanRecipient = recipientAddress.trim();
    if (!this.isValidAddress(cleanRecipient, isTestnet)) {
      throw new Error(`Dirección de Litecoin no válida: ${cleanRecipient}`);
    }

    const net = this.getNetwork(isTestnet);
    const keyPair = ECPair.fromWIF(this.vaultConfig.wif, net);
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
    const estimatedFee = 2000n; // 0.00002 LTC network fee

    let totalInput = 0n;
    const selectedUtxos = [];

    for (const u of utxos) {
      selectedUtxos.push(u);
      totalInput += BigInt(u.value);
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

    // Sign all inputs
    for (let i = 0; i < selectedUtxos.length; i++) {
      psbt.signInput(i, keyPair);
      psbt.validateSignaturesOfInput(i, () => true);
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
