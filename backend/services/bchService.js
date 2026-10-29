import { TestNetWallet, Wallet } from 'mainnet-js';
import { config } from '../config.js';
import { db } from './db.js';

class BchService {
  constructor() {
    this.mainnetWallet = null;
    this.chipnetWallet = null;
    this.mainnetAddress = config.bch.hotWalletAddress || '';
    this.chipnetAddress = config.bch.chipnetHotWalletAddress || '';
    this.isReady = false;
    this.init();
  }

  async init() {
    // 1. Initialize Mainnet Wallet
    try {
      if (config.bch.hotWalletWif && config.bch.hotWalletWif.length > 20) {
        this.mainnetWallet = await Wallet.fromWIF(config.bch.hotWalletWif);
        this.mainnetAddress = this.mainnetWallet.cashaddr;
        console.log(`[BCH] ✅ Loaded Mainnet Hot Wallet: ${this.mainnetAddress}`);
      }
    } catch (err) {
      console.warn('[BCH] Mainnet wallet init warning:', err.message);
    }

    // 2. Initialize Chipnet Wallet
    try {
      const chipnetWif = config.bch.chipnetHotWalletWif || config.bch.hotWalletWif;
      if (chipnetWif && chipnetWif.length > 20) {
        this.chipnetWallet = await TestNetWallet.fromWIF(chipnetWif);
        this.chipnetAddress = this.chipnetWallet.cashaddr;
        console.log(`[BCH] ✅ Loaded Chipnet (Testnet4) Hot Wallet: ${this.chipnetAddress}`);
      }
    } catch (err) {
      console.warn('[BCH] Chipnet wallet init warning:', err.message);
    }

    this.isReady = true;
  }

  get wallet() {
    return this.mainnetWallet || this.chipnetWallet;
  }

  getDepositAddress(isChipnet = false) {
    if (isChipnet) {
      return this.chipnetAddress || (this.chipnetWallet ? this.chipnetWallet.cashaddr : 'bchtest:qpnfz2nh7uy8a2ythr2z7am5vcxr28g43qjdwgfzp8');
    }
    return this.mainnetAddress || (this.mainnetWallet ? this.mainnetWallet.cashaddr : 'bitcoincash:qpnfz2nh7uy8a2ythr2z7am5vcxr28g43qkl20t4xm');
  }

  async getBalances() {
    const balances = {
      mainnet: { bch: 0.0, PUSD: 0.0, MUSD: 0.0 },
      chipnet: { bch: 0.0, PUSD: 0.0, MUSD: 0.0 }
    };

    if (this.mainnetWallet) {
      try {
        const bal = await this.mainnetWallet.getBalance('bch');
        balances.mainnet.bch = Number(bal) || 0.0;
        const tokens = await this.mainnetWallet.getTokenBalance();
        const pusdCat = config.bch.tokens.PUSD?.category;
        if (pusdCat && tokens?.[pusdCat]) {
          balances.mainnet.PUSD = Number(tokens[pusdCat]) / (10 ** config.bch.tokens.PUSD.decimals);
        }
      } catch (e) {
        console.warn('[BCH Mainnet] Balance query warning:', e.message);
      }
    }

    if (this.chipnetWallet) {
      try {
        const bal = await this.chipnetWallet.getBalance('bch');
        balances.chipnet.bch = Number(bal) || 0.0;
      } catch (e) {
        console.warn('[BCH Chipnet] Balance query warning:', e.message);
      }
    }

    return balances;
  }

  async verifyDeposit(txHash, expectedAmount, tokenSymbol = 'PUSD', depositAddress = null) {
    const isChipnet = depositAddress ? depositAddress.startsWith('bchtest:') : config.bch.network !== 'mainnet';
    const activeWallet = isChipnet ? this.chipnetWallet : this.mainnetWallet;

    // A) If dedicated deposit address is known, verify on-chain UTXOs directly
    if (depositAddress) {
      try {
        const WalletClass = isChipnet ? TestNetWallet : Wallet;
        const watcher = await WalletClass.watchOnly(depositAddress);
        const satBalance = await watcher.getBalance('sat');
        if (satBalance && BigInt(satBalance) > 0n) {
          return {
            verified: true,
            onChain: true,
            amount: Number(satBalance) / 1e8,
            txHash: txHash || `onchain_deposit_${depositAddress}`
          };
        }
      } catch (err) {
        console.warn(`[BCH ${isChipnet ? 'Chipnet' : 'Mainnet'}] Watcher check error:`, err.message);
      }
    }

    // B) Verify by clean txHash if supplied
    if (txHash && txHash.trim().length >= 20) {
      const cleanHash = txHash.trim();
      if (activeWallet) {
        try {
          const history = await activeWallet.getHistory();
          const found = history.find(tx => tx.tx_hash === cleanHash);
          if (found) {
            return { verified: true, onChain: true, amount: expectedAmount, txHash: cleanHash };
          }
        } catch (err) {
          console.warn(`[BCH ${isChipnet ? 'Chipnet' : 'Mainnet'}] History query error:`, err.message);
        }
      }

      // If strict mode is disabled, allow fallback
      if (config.simulateIfNoFunds) {
        return { verified: true, simulated: true, amount: expectedAmount, txHash: cleanHash };
      }

      return { verified: false, reason: `Transacción no confirmada en los indexadores de ${isChipnet ? 'Chipnet' : 'BCH Mainnet'}` };
    }

    if (config.simulateIfNoFunds) {
      return { verified: true, simulated: true, amount: expectedAmount, txHash: 'simulated_fallback' };
    }

    return { verified: false, reason: 'No se detectaron fondos recibidos en la dirección de depósito' };
  }

  async sendPayout(recipientAddress, amount, tokenSymbol = 'PUSD') {
    if (!recipientAddress || (!recipientAddress.startsWith('bitcoincash:') && !recipientAddress.startsWith('bchtest:'))) {
      throw new Error(`Dirección CashAddr de Bitcoin Cash inválida: ${recipientAddress}`);
    }

    const isChipnet = recipientAddress.startsWith('bchtest:');
    const activeWallet = isChipnet ? this.chipnetWallet : this.mainnetWallet;
    const networkName = isChipnet ? 'Chipnet (Testnet4)' : 'Bitcoin Cash Mainnet';
    const explorerBase = isChipnet ? 'https://chipnet.imaginary.cash/tx' : 'https://3xpl.com/bitcoin-cash/transaction';

    if (!activeWallet) {
      throw new Error(`[BCH] La Hot Wallet para ${networkName} no está inicializada`);
    }

    try {
      const isNativeBch = tokenSymbol.toUpperCase() === 'BCH';
      let res;

      if (isNativeBch) {
        // Native BCH / tBCH satoshis transfer
        const satoshis = Math.floor(amount * 1e8);
        console.log(`[BCH Payout] Sending ${amount} ${isChipnet ? 'tBCH' : 'BCH'} (${satoshis} sats) to ${recipientAddress} on ${networkName}...`);
        res = await activeWallet.send([
          {
            cashaddr: recipientAddress,
            value: satoshis,
            unit: 'sat'
          }
        ]);
      } else {
        // CashTokens transfer
        const tokenConfig = config.bch.tokens[tokenSymbol.toUpperCase()] || config.bch.tokens.PUSD;
        const rawTokenUnits = BigInt(Math.floor(amount * (10 ** tokenConfig.decimals)));
        console.log(`[BCH Payout] Sending ${amount} ${tokenSymbol} (${rawTokenUnits} units) to ${recipientAddress} on ${networkName}...`);
        res = await activeWallet.send([
          {
            cashaddr: recipientAddress,
            value: 1000, // 1000 satoshis dust limit
            unit: 'sat',
            token: {
              amount: rawTokenUnits,
              category: tokenConfig.category
            }
          }
        ]);
      }

      console.log(`[BCH Payout] ✅ Confirmed on-chain on ${networkName}! TXID: ${res.txid}`);
      db.updateLiquidity(`bch_${tokenSymbol.toLowerCase()}`, -amount);

      return {
        success: true,
        onChain: true,
        txHash: res.txid,
        explorerUrl: `${explorerBase}/${res.txid}`,
        tokenCategory: isNativeBch ? undefined : config.bch.tokens[tokenSymbol.toUpperCase()]?.category
      };
    } catch (err) {
      console.error(`[BCH Payout] ❌ Error on-chain en ${networkName}:`, err.message);

      if (config.simulateIfNoFunds) {
        console.warn('[BCH Payout] Falling back to simulated hash due to SIMULATE_IF_NO_FUNDS=true');
        const mockTxid = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
        db.updateLiquidity(`bch_${tokenSymbol.toLowerCase()}`, -amount);
        return {
          success: true,
          simulated: true,
          txHash: mockTxid,
          explorerUrl: `${explorerBase}/${mockTxid}`
        };
      }

      throw new Error(`Fallo en el pago on-chain de ${networkName}: ${err.message}. Asegúrate de que la Hot Wallet (${activeWallet.cashaddr}) tenga balance suficiente.`);
    }
  }
}

export const bchService = new BchService();
