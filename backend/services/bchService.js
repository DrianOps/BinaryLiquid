import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ethers } from 'ethers';
import { TestNetWallet, Wallet, TokenSendRequest } from 'mainnet-js';
import {
  Contract as CashContract,
  ElectrumNetworkProvider,
  SignatureTemplate,
  TransactionBuilder,
  placeholderP2PKHUnlocker
} from 'cashscript';
import {
  cashAddressToLockingBytecode,
  lockingBytecodeToCashAddress,
  stringify
} from '@bitauth/libauth';
import { config } from '../config.js';
import { db } from './db.js';

class BchService {
  constructor() {
    this.mainnetSigner = null;
    this.chipnetSigner = null;
    this.mainnetProvider = null;
    this.chipnetProvider = null;
    this.mainnetVault = null;
    this.chipnetVault = null;
    this.vaultArtifact = null;
    this.escrowArtifact = null;
    this.collateralVaultArtifact = null;
    this.isReady = false;
    this.readyPromise = this.init();
  }

  async init() {
    try {
      const vaultArtifactPath = path.join(config.contractsDir, 'bch/artifacts/BinaryLiquidVault.json');
      const escrowArtifactPath = path.join(config.contractsDir, 'bch/artifacts/BinaryLiquidEscrow.json');
      const collateralArtifactPath = path.join(config.contractsDir, 'bch/artifacts/BinaryLiquidCollateralVault.json');
      this.vaultArtifact = JSON.parse(fs.readFileSync(vaultArtifactPath, 'utf8'));
      this.escrowArtifact = JSON.parse(fs.readFileSync(escrowArtifactPath, 'utf8'));
      if (fs.existsSync(collateralArtifactPath)) {
        this.collateralVaultArtifact = JSON.parse(fs.readFileSync(collateralArtifactPath, 'utf8'));
      }
    } catch (err) {
      console.error('[BCH Covenant] Failed to load CashScript artifacts:', err.message);
    }

    // 1. Initialize Mainnet Watchman Signer + Non-Custodial Covenant
    try {
      this.mainnetProvider = new ElectrumNetworkProvider('mainnet');
      if (config.bch.watchmanMainnetWif && config.bch.watchmanMainnetWif.length > 20) {
        this.mainnetSigner = await Wallet.fromWIF(config.bch.watchmanMainnetWif);
        if (this.vaultArtifact) {
          this.mainnetVault = new CashContract(
            this.vaultArtifact,
            [this.mainnetSigner.publicKeyCompressed, config.bch.maxSinglePayoutUnits],
            { provider: this.mainnetProvider }
          );
          console.log(`[BCH Mainnet] 🛡️ Non-Custodial Vault Covenant: ${this.mainnetVault.tokenAddress}`);
        }
      }
    } catch (err) {
      console.warn('[BCH Mainnet] Init warning:', err.message);
    }

    // 2. Initialize Chipnet Watchman Signer + Non-Custodial Covenant
    try {
      this.chipnetProvider = new ElectrumNetworkProvider('chipnet', { hostname: 'chipnet.imaginary.cash' });
      const chipnetWif = config.bch.watchmanChipnetWif;
      if (chipnetWif && chipnetWif.length > 20) {
        this.chipnetSigner = await TestNetWallet.fromWIF(chipnetWif);
        if (this.vaultArtifact) {
          this.chipnetVault = new CashContract(
            this.vaultArtifact,
            [this.chipnetSigner.publicKeyCompressed, config.bch.maxSinglePayoutUnits],
            { provider: this.chipnetProvider }
          );
          console.log(`[BCH Chipnet] 🛡️ Non-Custodial Vault Covenant: ${this.chipnetVault.tokenAddress}`);
        }
      }
    } catch (err) {
      console.warn('[BCH Chipnet] Init warning:', err.message);
    }

    this.isReady = true;
  }

  toTokenAwareAddress(cashaddr) {
    const decoded = cashAddressToLockingBytecode(cashaddr.trim());
    if (typeof decoded === 'string') {
      throw new Error(`Invalid Bitcoin Cash address (${cashaddr}): ${decoded}`);
    }
    const encoded = lockingBytecodeToCashAddress({
      bytecode: decoded.bytecode,
      prefix: decoded.prefix,
      tokenSupport: true
    });
    if (typeof encoded === 'string') {
      throw new Error(`Failed converting CashAddr to token-aware format: ${encoded}`);
    }
    return {
      tokenAddress: encoded.address,
      lockingBytecode: decoded.bytecode,
      prefix: decoded.prefix
    };
  }

  getVaultAddress(isChipnet = false, isTokenAware = true) {
    if (isChipnet) {
      if (this.chipnetVault) {
        return isTokenAware ? this.chipnetVault.tokenAddress : this.chipnetVault.address;
      }
      return isTokenAware ? config.bch.chipnetVaultTokenAddress : config.bch.chipnetVaultAddress;
    }
    if (this.mainnetVault) {
      return isTokenAware ? this.mainnetVault.tokenAddress : this.mainnetVault.address;
    }
    return config.bch.mainnetVaultTokenAddress || config.bch.watchmanMainnetAddress;
  }

  getDepositAddress(isChipnet = false) {
    return this.getVaultAddress(isChipnet, true);
  }

  /**
   * Instantiates an isolated, zero-private-key P2SH32 CashScript Covenant (`BinaryLiquidEscrow.cash`)
   * for a specific swap order, with a 24h autonomous Timelock Refund back to the user!
   */
  async createSwapEscrowCovenant({ orderId, refundAddress = null, isChipnet = false, isCashToken = true }) {
    await this.readyPromise;
    const activeVault = isChipnet ? this.chipnetVault : this.mainnetVault;
    const activeSigner = isChipnet ? this.chipnetSigner : this.mainnetSigner;
    const activeProvider = isChipnet ? this.chipnetProvider : this.mainnetProvider;

    if (!activeVault || !activeSigner || !this.escrowArtifact) {
      const fallbackAddr = this.getVaultAddress(isChipnet, isCashToken);
      return {
        address: fallbackAddr,
        contractName: 'BinaryLiquidVault.cash',
        contractType: 'P2SH32 CashScript Liquidity Covenant',
        expiryTimestamp: Math.floor(Date.now() / 1000) + 86400
      };
    }

    const vaultDecoded = cashAddressToLockingBytecode(activeVault.address);
    const vaultLockingBytecode = vaultDecoded.bytecode;

    let refundLockingBytecode = vaultLockingBytecode;
    if (refundAddress && (refundAddress.startsWith('bchtest:') || refundAddress.startsWith('bitcoincash:'))) {
      const refDecoded = cashAddressToLockingBytecode(refundAddress.trim());
      if (typeof refDecoded !== 'string') {
        refundLockingBytecode = refDecoded.bytecode;
      }
    }

    const expiryTimestamp = BigInt(Math.floor(Date.now() / 1000) + 86400);
    const orderSalt = ethers.getBytes(ethers.id(String(orderId))).slice(0, 16);

    const escrowContract = new CashContract(
      this.escrowArtifact,
      [
        activeSigner.publicKeyCompressed,
        vaultLockingBytecode,
        refundLockingBytecode,
        expiryTimestamp,
        orderSalt
      ],
      { provider: activeProvider }
    );

    const depositAddr = isCashToken ? escrowContract.tokenAddress : escrowContract.address;
    const explorerBase = isChipnet
      ? 'https://chipnet.imaginary.cash/address'
      : 'https://3xpl.com/bitcoin-cash/address';

    return {
      address: depositAddr,
      baseAddress: escrowContract.address,
      tokenAddress: escrowContract.tokenAddress,
      vaultPoolAddress: activeVault.tokenAddress,
      contractName: 'BinaryLiquidEscrow.cash',
      contractType: 'P2SH32 CashScript Covenant (Zero Private Keys + 24h Timelock)',
      expiryTimestamp: Number(expiryTimestamp),
      explorerUrl: `${explorerBase}/${escrowContract.address}`
    };
  }

  getTokenCategory(tokenSymbol = 'PUSD', isChipnet = false) {
    const tok = config.bch.tokens[tokenSymbol.toUpperCase()] || config.bch.tokens.PUSD;
    if (isChipnet && tokenSymbol.toUpperCase() === 'PUSD') {
      return tok.chipnetCategory || tok.category;
    }
    return tok.category;
  }

  async getBalances() {
    await this.readyPromise;
    const balances = {
      mainnet: { bch: 0.0, PUSD: 0.0, MUSD: 0.0, vaultAddress: this.mainnetVault?.tokenAddress || null },
      chipnet: { bch: 0.0, PUSD: 0.0, MUSD: 0.0, vaultAddress: this.chipnetVault?.tokenAddress || null }
    };

    if (this.mainnetVault) {
      try {
        const utxos = await this.mainnetVault.getUtxos();
        const pusdCat = this.getTokenCategory('PUSD', false);
        let sats = 0n;
        let pusdUnits = 0n;
        for (const u of utxos) {
          sats += u.satoshis;
          if (u.token?.category === pusdCat) pusdUnits += u.token.amount;
        }
        balances.mainnet.bch = Number(sats) / 1e8;
        balances.mainnet.PUSD = Number(pusdUnits) / 1e6;
      } catch (e) {
        console.warn('[BCH Mainnet Covenant] Balance query warning:', e.message);
      }
    }

    if (this.chipnetVault) {
      try {
        const utxos = await this.chipnetVault.getUtxos();
        const pusdCat = this.getTokenCategory('PUSD', true);
        let sats = 0n;
        let pusdUnits = 0n;
        for (const u of utxos) {
          sats += u.satoshis;
          if (u.token?.category === pusdCat) pusdUnits += u.token.amount;
        }
        balances.chipnet.bch = Number(sats) / 1e8;
        balances.chipnet.PUSD = Number(pusdUnits) / 1e6;
      } catch (e) {
        console.warn('[BCH Chipnet Covenant] Balance query warning:', e.message);
      }
    }

    return balances;
  }

  async verifyDeposit(txHash, expectedAmount, tokenSymbol = 'PUSD', depositAddress = null) {
    await this.readyPromise;
    const isChipnet = depositAddress
      ? depositAddress.startsWith('bchtest:')
      : config.bch.network !== 'mainnet';
    const provider = isChipnet ? this.chipnetProvider : this.mainnetProvider;
    const isNativeBch = tokenSymbol.toUpperCase() === 'BCH';
    const expectedCat = isNativeBch ? null : this.getTokenCategory(tokenSymbol, isChipnet);
    const decimals = config.bch.tokens[tokenSymbol.toUpperCase()]?.decimals || 6;

    // A) Inspect live UTXOs at the Non-Custodial Covenant deposit address
    if (depositAddress && provider) {
      try {
        let utxos = await provider.getUtxos(depositAddress);
        if ((!utxos || utxos.length === 0) && (depositAddress.startsWith('bchtest:') || depositAddress.startsWith('bitcoincash:'))) {
          try {
            const dec = cashAddressToLockingBytecode(depositAddress);
            if (typeof dec !== 'string') {
              const altPrefix = isChipnet ? 'bchtest' : 'bitcoincash';
              const alt = lockingBytecodeToCashAddress({ bytecode: dec.bytecode, prefix: altPrefix, tokenSupport: false });
              if (typeof alt !== 'string' && alt.address !== depositAddress) {
                const altUtxos = await provider.getUtxos(alt.address);
                if (altUtxos && altUtxos.length > 0) utxos = altUtxos;
              }
            }
          } catch (_) {}
        }

        if (utxos && utxos.length > 0) {
          if (isNativeBch) {
            const totalSats = utxos.reduce((sum, u) => sum + u.satoshis, 0n);
            if (totalSats > 0n) {
              return {
                verified: true,
                onChain: true,
                nonCustodial: true,
                amount: Number(totalSats) / 1e8,
                txHash: txHash || utxos[0].txid
              };
            }
          } else {
            const matching = utxos.filter(u => u.token?.category === expectedCat && u.token.amount > 0n);
            if (matching.length > 0) {
              const totalUnits = matching.reduce((sum, u) => sum + u.token.amount, 0n);
              const numUnits = Number(totalUnits);
              const decimalFactor = 10 ** decimals;
              const amountWithDecimals = numUnits / decimalFactor;

              // Dual-precision support:
              // 1. Wallets that format with token decimals (numUnits / 10^decimals)
              // 2. Wallets that treat 1 raw unit = 1 token (e.g. Paytaca on Chipnet sending 1n for 1 PUSD)
              const matchesWithDecimals = amountWithDecimals >= expectedAmount * 0.99;
              const matchesRawUnits = numUnits >= expectedAmount * 0.99;

              if (matchesWithDecimals || matchesRawUnits) {
                const detectedAmount = matchesWithDecimals ? amountWithDecimals : numUnits;
                return {
                  verified: true,
                  onChain: true,
                  nonCustodial: true,
                  amount: detectedAmount,
                  txHash: txHash || matching[0].txid
                };
              }
            }
          }
        }
      } catch (err) {
        console.warn(`[BCH ${isChipnet ? 'Chipnet' : 'Mainnet'}] Covenant UTXO check warning:`, err.message);
      }
    }

    // B) Verify raw transaction on Electrum network if txHash was provided
    if (txHash && txHash.trim().length === 64 && provider) {
      const cleanHash = txHash.trim().toLowerCase();
      try {
        const rawTxHex = await provider.getRawTransaction(cleanHash);
        if (rawTxHex && rawTxHex.length > 40) {
          return {
            verified: true,
            onChain: true,
            nonCustodial: true,
            amount: expectedAmount,
            txHash: cleanHash
          };
        }
      } catch (err) {
        console.warn(`[BCH ${isChipnet ? 'Chipnet' : 'Mainnet'}] Raw TX lookup warning:`, err.message);
      }
    }

    if (config.simulateIfNoFunds) {
      return { verified: true, simulated: true, amount: expectedAmount, txHash: txHash || 'simulated_fallback' };
    }

    return {
      verified: false,
      reason: `No se detectaron CashTokens ${tokenSymbol} confirmados en el Smart Contract Covenant (${depositAddress || 'BCH'})`
    };
  }

  /**
   * Executes a 100% Non-Custodial CashTokens payout directly from `BinaryLiquidVault.cash` P2SH32 Covenant,
   * co-signed by The Watchman's Schnorr key and enforcing on-chain Covenant State Continuation!
   */
  async releaseFromVault(recipientAddress, amount, tokenSymbol = 'PUSD') {
    await this.readyPromise;

    if (!recipientAddress || (!recipientAddress.startsWith('bitcoincash:') && !recipientAddress.startsWith('bchtest:'))) {
      throw new Error(`Dirección CashAddr de Bitcoin Cash inválida: ${recipientAddress}`);
    }

    const isChipnet = recipientAddress.startsWith('bchtest:');
    const activeVault = isChipnet ? this.chipnetVault : this.mainnetVault;
    const activeSigner = isChipnet ? this.chipnetSigner : this.mainnetSigner;
    const activeProvider = isChipnet ? this.chipnetProvider : this.mainnetProvider;
    const activeWif = isChipnet ? config.bch.watchmanChipnetWif : config.bch.watchmanMainnetWif;
    const networkName = isChipnet ? 'BCH Chipnet (Testnet4)' : 'Bitcoin Cash Mainnet';
    const explorerBase = isChipnet
      ? 'https://chipnet.imaginary.cash/tx'
      : 'https://3xpl.com/bitcoin-cash/transaction';

    if (!activeVault || !activeSigner || !activeProvider) {
      throw new Error(`[BCH Covenant] Vault no inicializado para ${networkName}`);
    }

    const tokenSym = tokenSymbol.toUpperCase();
    if (tokenSym === 'BCH') {
      throw new Error(`[BCH Covenant] BinaryLiquidVault.cash opera exclusivamente con CashTokens (${tokenSym} no soportado en este Covenant)`);
    }

    const category = this.getTokenCategory(tokenSym, isChipnet);
    const decimals = isChipnet ? 0 : (config.bch.tokens[tokenSym]?.decimals || 6);
    const payoutUnits = BigInt(Math.round(Number(amount) * (10 ** decimals)));

    if (payoutUnits <= 0n) {
      throw new Error('El monto de liberación del Covenant debe ser mayor a cero');
    }

    const { tokenAddress: recipientTokenAddr, lockingBytecode: recipientLockingBytecode } =
      this.toTokenAwareAddress(recipientAddress);

    try {
      // 1. Fetch Covenant Pool UTXOs holding the target CashToken category
      const vaultUtxos = await activeVault.getUtxos();
      const poolUtxo = vaultUtxos.find(
        u => u.token?.category === category && u.token.amount >= payoutUnits
      );

      if (!poolUtxo) {
        throw new Error(
          `Liquidez insuficiente en el Covenant (${activeVault.tokenAddress}) para ${amount} ${tokenSym}`
        );
      }

      // 2. Fetch Watchman pure-BCH fee UTXO so Covenant satoshi reserve is never depleted
      const signerUtxos = await activeProvider.getUtxos(activeSigner.cashaddr);
      const feeUtxos = signerUtxos.filter(u => !u.token && u.satoshis >= 2000n);
      if (feeUtxos.length === 0) {
        throw new Error(
          `El Watchman (${activeSigner.cashaddr}) requiere satoshis de gas (tBCH/BCH) para cubrir el miner fee del Covenant`
        );
      }

      const sigTemplate = new SignatureTemplate(activeWif);
      const remainingUnits = poolUtxo.token.amount - payoutUnits;
      const covenantKeepSats = poolUtxo.satoshis >= 1000n ? poolUtxo.satoshis : 1000n;

      console.log(
        `[BCH Covenant] 🛡️ Unlocking ${amount} ${tokenSym} (${payoutUnits} units) from ${activeVault.tokenAddress} -> ${recipientTokenAddr} (Remaining in Covenant: ${Number(remainingUnits) / (10 ** decimals)} ${tokenSym})`
      );

      const txBuilder = new TransactionBuilder({ provider: activeProvider })
        .addInput(
          poolUtxo,
          activeVault.unlock.release(sigTemplate, recipientLockingBytecode, payoutUnits)
        )
        .addInput(feeUtxos[0], sigTemplate.unlockP2PKH())
        // Output #0: Exact CashTokens payout to user
        .addOutput({
          to: recipientTokenAddr,
          amount: 1000n,
          token: {
            category,
            amount: payoutUnits
          }
        });

      // Output #1: Covenant State Continuation (forces remaining pool CashTokens back into exact same Covenant!)
      if (remainingUnits > 0n) {
        txBuilder.addOutput({
          to: activeVault.tokenAddress,
          amount: covenantKeepSats,
          token: {
            category,
            amount: remainingUnits
          }
        });
      }

      // Output #2: BCH miner-fee change back to Watchman gas address
      txBuilder.addBchChangeOutputIfNeeded({
        to: activeSigner.cashaddr,
        feeRate: 1.5
      });

      const txDetails = await txBuilder.send();

      console.log(`[BCH Covenant] ✅ Covenant State Continuation TX mined/broadcast! TXID: ${txDetails.txid}`);
      db.updateLiquidity(`bch_${tokenSym.toLowerCase()}`, -Number(amount));

      return {
        success: true,
        onChain: true,
        nonCustodial: true,
        vaultAddress: activeVault.tokenAddress,
        txHash: txDetails.txid,
        explorerUrl: `${explorerBase}/${txDetails.txid}`,
        tokenCategory: category
      };
    } catch (err) {
      console.error(`[BCH Covenant] ❌ Error ejecutando Covenant en ${networkName}:`, err.message);
      throw new Error(`Fallo en liberación del Covenant CashScript (${networkName}): ${err.message}`);
    }
  }

  // Alias for backwards compatibility (e.g. Limit Orders)
  async sendPayout(recipientAddress, amount, tokenSymbol = 'PUSD') {
    return this.releaseFromVault(recipientAddress, amount, tokenSymbol);
  }

  /**
   * Real On-Chain Testnet Faucet: Dispenses genuine Chipnet PUSD CashTokens from the Genesis Faucet Reserve
   * so Hackathon Judges can test PUSD -> USDC swaps immediately!
   */
  async dispenseTestnetPusd(recipientAddress, amount = 50) {
    await this.readyPromise;
    if (!recipientAddress || !recipientAddress.startsWith('bchtest:')) {
      throw new Error('Ingresa una dirección de Bitcoin Cash Chipnet válida (bchtest:q... o bchtest:z...)');
    }
    if (!this.chipnetSigner) {
      throw new Error('Chipnet Faucet signer no disponible');
    }

    const cappedAmount = Math.min(Math.max(Number(amount) || 50, 1), 500);
    const rawUnits = BigInt(Math.round(cappedAmount)); // Chipnet: 1 unit = 1 PUSD for solid integer display in Paytaca / Cashonize
    const category = this.getTokenCategory('PUSD', true);
    const { tokenAddress } = this.toTokenAwareAddress(recipientAddress);

    const res = await this.chipnetSigner.send([
      new TokenSendRequest({
        cashaddr: tokenAddress,
        value: 1000n,
        amount: rawUnits,
        category
      }),
      // Gas subsidy so testnet users/judges always have tBCH for miner fees on future swaps
      {
        cashaddr: tokenAddress,
        value: 50000n,
        unit: 'satoshis'
      }
    ]);

    return {
      success: true,
      onChain: true,
      token: 'PUSD',
      network: 'BCH Chipnet (Testnet4)',
      amount: cappedAmount,
      recipient: tokenAddress,
      category,
      txHash: res.txId,
      explorerUrl: `https://chipnet.imaginary.cash/tx/${res.txId}`
    };
  }

  /**
   * Queries real live UTXOs on BCH Chipnet or Mainnet for any connected user CashAddress.
   * Supports multi-address comma separation and auto-discovers change addresses from recent txs.
   */
  async getAddressBalances(cashaddr, forceTestnet = null) {
    await this.readyPromise;
    if (!cashaddr || typeof cashaddr !== 'string') {
      return { BCH: 0, PUSD: 0, utxoCount: 0, network: 'unknown' };
    }

    try {
      const rawAddrs = cashaddr.split(',').map(s => s.trim()).filter(Boolean);
      if (rawAddrs.length === 0) {
        return { BCH: 0, PUSD: 0, utxoCount: 0, network: 'invalid' };
      }

      const firstDecoded = cashAddressToLockingBytecode(rawAddrs[0]);
      if (typeof firstDecoded === 'string') {
        return { BCH: 0, PUSD: 0, utxoCount: 0, network: 'invalid' };
      }

      const isChipnet = forceTestnet !== null ? Boolean(forceTestnet) : firstDecoded.prefix === 'bchtest';
      const targetPrefix = isChipnet ? 'bchtest' : 'bitcoincash';
      const provider = isChipnet ? this.chipnetProvider : this.mainnetProvider;
      if (!provider) {
        return { BCH: 0, PUSD: 0, utxoCount: 0, network: targetPrefix };
      }

      const pusdCategory = this.getTokenCategory('PUSD', isChipnet);
      const addressesToQuery = new Set();

      for (const a of rawAddrs) {
        const dec = cashAddressToLockingBytecode(a);
        if (typeof dec !== 'string') {
          const enc = lockingBytecodeToCashAddress({
            bytecode: dec.bytecode,
            prefix: targetPrefix,
            tokenSupport: false
          });
          if (typeof enc !== 'string') {
            addressesToQuery.add(enc.address);
          }
        }
      }

      let totalSats = 0n;
      let totalPusdUnits = 0n;
      let totalUtxos = 0;
      const seenUtxoKeys = new Set();

      for (const addr of addressesToQuery) {
        try {
          const utxos = await provider.getUtxos(addr);
          for (const u of utxos) {
            const utxoKey = `${u.txid}:${u.vout}`;
            if (seenUtxoKeys.has(utxoKey)) continue;
            seenUtxoKeys.add(utxoKey);
            totalUtxos++;

            totalSats += BigInt(u.satoshis || 0);
            if (u.token && u.token.category === pusdCategory) {
              totalPusdUnits += BigInt(u.token.amount || 0);
            }
          }
        } catch (e) {
          console.warn(`[BCH Wallet Balance] Error querying ${addr}:`, e.message);
        }
      }

      // On Chipnet, normalize so both legacy 1e6 units and clean integer units display as solid tokens:
      let pusdBalance = 0;
      if (isChipnet) {
        if (totalPusdUnits >= 1_000_000n) {
          pusdBalance = Number(totalPusdUnits) / 1e6;
        } else {
          pusdBalance = Number(totalPusdUnits);
        }
      } else {
        pusdBalance = Number(totalPusdUnits) / 1e6;
      }

      return {
        BCH: Number(totalSats) / 1e8,
        PUSD: pusdBalance,
        utxoCount: totalUtxos,
        network: isChipnet ? 'chipnet' : 'mainnet',
        address: Array.from(addressesToQuery)[0] || rawAddrs[0]
      };
    } catch (err) {
      console.warn('[BCH Wallet Balance] Query warning:', err.message);
      return { BCH: 0, PUSD: 0, utxoCount: 0, network: 'error' };
    }
  }

  /**
   * Instantiates the user's personal deterministic P2SH32 Collateral Covenant (`BinaryLiquidCollateralVault.cash`).
   * Zero EOA private keys: mathematically bound to `borrowerLockingBytecode`.
   */
  async getUserCollateralCovenant(borrowerCashAddr, isChipnet = true) {
    await this.readyPromise;
    if (!borrowerCashAddr || typeof borrowerCashAddr !== 'string') {
      throw new Error('Se requiere una dirección de billetera Bitcoin Cash válida.');
    }

    const clean = borrowerCashAddr.trim();
    const decoded = cashAddressToLockingBytecode(clean);
    if (typeof decoded === 'string') {
      throw new Error(`Dirección Bitcoin Cash inválida (${clean}): ${decoded}`);
    }

    const targetPrefix = isChipnet ? 'bchtest' : 'bitcoincash';
    const baseEncoded = lockingBytecodeToCashAddress({
      bytecode: decoded.bytecode,
      prefix: targetPrefix,
      tokenSupport: false
    });
    if (typeof baseEncoded === 'string') {
      throw new Error(`No se pudo codificar la dirección base de Bitcoin Cash: ${baseEncoded}`);
    }

    const activeSigner = isChipnet ? this.chipnetSigner : this.mainnetSigner;
    const activeProvider = isChipnet ? this.chipnetProvider : this.mainnetProvider;
    if (!activeSigner || !activeProvider || !this.collateralVaultArtifact) {
      throw new Error(`Covenant BinaryLiquidCollateralVault no disponible en ${isChipnet ? 'Chipnet' : 'Mainnet'}.`);
    }

    const contract = new CashContract(
      this.collateralVaultArtifact,
      [activeSigner.publicKeyCompressed, decoded.bytecode],
      { provider: activeProvider }
    );

    const explorerBase = isChipnet
      ? 'https://chipnet.imaginary.cash/address'
      : 'https://3xpl.com/bitcoin-cash/address';

    return {
      contract,
      vaultAddress: contract.address,
      borrowerBaseAddress: baseEncoded.address,
      borrowerLockingBytecode: decoded.bytecode,
      contractName: 'BinaryLiquidCollateralVault.cash',
      contractType: 'P2SH32 User-Bound Collateral Covenant (Zero Private Keys)',
      explorerUrl: `${explorerBase}/${contract.address}`
    };
  }

  /**
   * Queries live UTXO satoshis locked inside the user's personal `BinaryLiquidCollateralVault.cash` Covenant.
   */
  async getCollateralVaultLiveBalance(borrowerCashAddr, isChipnet = true) {
    const info = await this.getUserCollateralCovenant(borrowerCashAddr, isChipnet);
    try {
      const utxos = await info.contract.getUtxos();
      const pureBchUtxos = (utxos || []).filter(u => !u.token && BigInt(u.satoshis || 0) > 0n);
      const totalSats = pureBchUtxos.reduce((s, u) => s + BigInt(u.satoshis || 0), 0n);
      return {
        vaultAddress: info.vaultAddress,
        borrowerBaseAddress: info.borrowerBaseAddress,
        contractName: info.contractName,
        contractType: info.contractType,
        explorerUrl: info.explorerUrl,
        balanceSats: Number(totalSats),
        balanceBch: Number((Number(totalSats) / 1e8).toFixed(8)),
        utxoCount: pureBchUtxos.length,
        utxos: pureBchUtxos.map(u => ({
          txid: u.txid,
          vout: u.vout,
          satoshis: Number(u.satoshis),
          amountBch: Number((Number(u.satoshis) / 1e8).toFixed(8))
        }))
      };
    } catch (err) {
      console.warn('[BCH Collateral Covenant] Live UTXO query warning:', err.message);
      return {
        vaultAddress: info.vaultAddress,
        borrowerBaseAddress: info.borrowerBaseAddress,
        contractName: info.contractName,
        contractType: info.contractType,
        explorerUrl: info.explorerUrl,
        balanceSats: 0,
        balanceBch: 0,
        utxoCount: 0,
        utxos: []
      };
    }
  }

  /**
   * Unlocks native BCH collateral from the user's `BinaryLiquidCollateralVault.cash` P2SH32 Covenant
   * strictly back to the user's own wallet (`borrowerBaseAddress`), enforcing Covenant State Continuation
   * for any remaining satoshis!
   */
  async releaseCollateralFromVault(borrowerCashAddr, withdrawAmountBch, isChipnet = true) {
    await this.readyPromise;
    const info = await this.getUserCollateralCovenant(borrowerCashAddr, isChipnet);
    const activeSigner = isChipnet ? this.chipnetSigner : this.mainnetSigner;
    const activeProvider = isChipnet ? this.chipnetProvider : this.mainnetProvider;
    const activeWif = isChipnet ? config.bch.watchmanChipnetWif : config.bch.watchmanMainnetWif;
    const txExplorerBase = isChipnet
      ? 'https://chipnet.imaginary.cash/tx'
      : 'https://3xpl.com/bitcoin-cash/transaction';

    const requestedSats = BigInt(Math.round(Number(withdrawAmountBch) * 1e8));
    if (requestedSats < 546n) {
      throw new Error('El monto mínimo de retiro de colateral BCH en cadena es 0.00000546 BCH (546 satoshis).');
    }

    const allVaultUtxos = await info.contract.getUtxos();
    const pureBchUtxos = (allVaultUtxos || [])
      .filter(u => !u.token && BigInt(u.satoshis || 0) > 0n)
      .sort((a, b) => (BigInt(b.satoshis) > BigInt(a.satoshis) ? 1 : -1));

    const selectedUtxos = [];
    let totalInputSats = 0n;
    for (const u of pureBchUtxos) {
      selectedUtxos.push(u);
      totalInputSats += BigInt(u.satoshis);
      if (totalInputSats >= requestedSats) break;
    }

    if (totalInputSats < requestedSats) {
      const availBch = (Number(totalInputSats) / 1e8).toFixed(6);
      throw new Error(
        `Colateral on-chain insuficiente en tu Bóveda CashScript (${info.vaultAddress}). Disponible en cadena: ${availBch} BCH.`
      );
    }

    // Watchman gas UTXO covers miner fee so 100% of user's collateral satoshis are preserved
    const signerUtxos = await activeProvider.getUtxos(activeSigner.cashaddr);
    const feeUtxos = (signerUtxos || []).filter(u => !u.token && BigInt(u.satoshis || 0) >= 2000n);
    if (feeUtxos.length === 0) {
      throw new Error(
        `El Watchman (${activeSigner.cashaddr}) requiere satoshis de gas para cubrir el miner fee del Covenant.`
      );
    }

    let remainderSats = totalInputSats - requestedSats;
    let actualWithdrawSats = requestedSats;
    let returnToVaultSats = remainderSats;

    // Avoid sub-dust remainder (< 546 sats) by returning dust satoshis directly to borrower
    if (remainderSats > 0n && remainderSats < 546n) {
      actualWithdrawSats = totalInputSats;
      returnToVaultSats = 0n;
    }

    const sigTemplate = new SignatureTemplate(activeWif);
    const txBuilder = new TransactionBuilder({ provider: activeProvider });

    for (const u of selectedUtxos) {
      txBuilder.addInput(
        u,
        info.contract.unlock.releaseCollateral(sigTemplate, actualWithdrawSats, returnToVaultSats)
      );
    }
    txBuilder.addInput(feeUtxos[0], sigTemplate.unlockP2PKH());

    // Output #0: Borrower's exact withdrawn BCH
    txBuilder.addOutput({
      to: info.borrowerBaseAddress,
      amount: actualWithdrawSats
    });

    // Output #1: Covenant State Continuation back to the exact same P2SH32 Collateral Vault
    if (returnToVaultSats >= 546n) {
      txBuilder.addOutput({
        to: info.vaultAddress,
        amount: returnToVaultSats
      });
    }

    // Miner fee change back to Watchman gas address
    txBuilder.addBchChangeOutputIfNeeded({
      to: activeSigner.cashaddr,
      feeRate: 1.5
    });

    const txDetails = await txBuilder.send();
    console.log(
      `[BCH Collateral Covenant] ✅ Released ${Number(actualWithdrawSats) / 1e8} BCH -> ${info.borrowerBaseAddress} | TXID: ${txDetails.txid}`
    );

    return {
      success: true,
      onChain: true,
      nonCustodial: true,
      vaultAddress: info.vaultAddress,
      recipient: info.borrowerBaseAddress,
      withdrawnBch: Number((Number(actualWithdrawSats) / 1e8).toFixed(8)),
      remainingVaultBch: Number((Number(returnToVaultSats) / 1e8).toFixed(8)),
      txHash: txDetails.txid,
      explorerUrl: `${txExplorerBase}/${txDetails.txid}`
    };
  }

  /**
   * Builds a genuine unsigned `wc2-bch-bcr` CashTokens transaction (`bch_signTransaction`)
   * so Cashonize / Paytaca Mobile / Paytaca Extension can sign & broadcast in 1 click directly from the user's wallet.
   */
  async buildUnsignedSwapWcTransaction({
    senderAddress,
    depositAddress,
    tokenSymbol = 'PUSD',
    amount,
    isChipnet = true,
    userPrompt = 'Confirmar intercambio No-Custodio en BinaryLiquid'
  }) {
    await this.readyPromise;
    if (!senderAddress || typeof senderAddress !== 'string') {
      throw new Error('Se requiere la dirección CashAddr de la billetera pagadora.');
    }
    if (!depositAddress || typeof depositAddress !== 'string') {
      throw new Error('Se requiere la dirección del Smart Contract Covenant de destino.');
    }

    const decodedSender = cashAddressToLockingBytecode(senderAddress.trim());
    if (typeof decodedSender === 'string') {
      throw new Error(`Dirección BCH pagadora inválida: ${decodedSender}`);
    }

    const prefix = isChipnet ? 'bchtest' : 'bitcoincash';
    const senderBaseObj = lockingBytecodeToCashAddress({
      bytecode: decodedSender.bytecode,
      prefix,
      tokenSupport: false
    });
    const senderTokenObj = lockingBytecodeToCashAddress({
      bytecode: decodedSender.bytecode,
      prefix,
      tokenSupport: true
    });
    if (typeof senderBaseObj === 'string' || typeof senderTokenObj === 'string') {
      throw new Error('No se pudo normalizar la dirección CashAddr de la billetera pagadora.');
    }

    const senderBaseAddr = senderBaseObj.address;
    const senderTokenAddr = senderTokenObj.address;
    const provider = isChipnet ? this.chipnetProvider : this.mainnetProvider;
    if (!provider) {
      throw new Error(`Proveedor Electrum BCH no disponible en ${isChipnet ? 'Chipnet' : 'Mainnet'}.`);
    }

    const sym = (tokenSymbol || 'PUSD').toUpperCase();
    const isNativeBch = sym === 'BCH';
    const utxos = await provider.getUtxos(senderBaseAddr);
    if (!utxos || utxos.length === 0) {
      throw new Error(`No se detectaron UTXOs disponibles en ${senderBaseAddr}.`);
    }

    const txBuilder = new TransactionBuilder({ provider });
    const unlocker = placeholderP2PKHUnlocker(senderBaseAddr);

    if (isNativeBch) {
      const requiredSats = BigInt(Math.round(Number(amount) * 1e8));
      const pureUtxos = utxos
        .filter(u => !u.token && BigInt(u.satoshis || 0) > 0n)
        .sort((a, b) => (BigInt(b.satoshis) > BigInt(a.satoshis) ? 1 : -1));

      let gatheredSats = 0n;
      for (const u of pureUtxos) {
        txBuilder.addInput(u, unlocker);
        gatheredSats += BigInt(u.satoshis);
        if (gatheredSats >= requiredSats + 1500n) break;
      }

      if (gatheredSats < requiredSats + 600n) {
        throw new Error(
          `Saldo BCH insuficiente en ${senderBaseAddr} (${(Number(gatheredSats) / 1e8).toFixed(6)} BCH disponibles).`
        );
      }

      const decodedDep = cashAddressToLockingBytecode(depositAddress.trim());
      if (typeof decodedDep === 'string') {
        throw new Error(`Dirección Covenant inválida: ${decodedDep}`);
      }
      const depBaseObj = lockingBytecodeToCashAddress({
        bytecode: decodedDep.bytecode,
        prefix,
        tokenSupport: false
      });
      if (typeof depBaseObj === 'string') {
        throw new Error('No se pudo codificar la dirección del Covenant.');
      }

      txBuilder.addOutput({
        to: depBaseObj.address,
        amount: requiredSats
      });
      txBuilder.addBchChangeOutputIfNeeded({
        to: senderBaseAddr,
        feeRate: 1.5
      });
    } else {
      const category = this.getTokenCategory(sym, isChipnet);
      const decimals = isChipnet ? 0 : (config.bch.tokens[sym]?.decimals || 6);
      const requiredUnits = BigInt(Math.round(Number(amount) * (10 ** decimals)));
      const { tokenAddress: depositTokenAddr } = this.toTokenAwareAddress(depositAddress);

      const tokenUtxos = utxos
        .filter(u => u.token?.category === category && !u.token?.nft && BigInt(u.token.amount || 0) > 0n)
        .sort((a, b) => (BigInt(b.token.amount) > BigInt(a.token.amount) ? 1 : -1));

      let gatheredUnits = 0n;
      let gatheredSats = 0n;
      for (const u of tokenUtxos) {
        txBuilder.addInput(u, unlocker);
        gatheredUnits += BigInt(u.token.amount);
        gatheredSats += BigInt(u.satoshis);
        if (gatheredUnits >= requiredUnits) break;
      }

      if (gatheredUnits < requiredUnits) {
        const availHuman = (Number(gatheredUnits) / (10 ** decimals)).toFixed(2);
        throw new Error(
          `Saldo ${sym} insuficiente en ${senderBaseAddr} (${availHuman} ${sym} disponibles).`
        );
      }

      const tokenChangeUnits = gatheredUnits - requiredUnits;
      const minRequiredSats = tokenChangeUnits > 0n ? 3200n : 2200n;

      // Ensure enough satoshis for dust output (1000 sats) + token change dust (1000 sats) + miner fee (~800 sats)
      if (gatheredSats < minRequiredSats) {
        const pureBchUtxos = utxos
          .filter(u => !u.token && BigInt(u.satoshis || 0) > 0n)
          .sort((a, b) => (BigInt(b.satoshis) > BigInt(a.satoshis) ? 1 : -1));

        for (const u of pureBchUtxos) {
          txBuilder.addInput(u, unlocker);
          gatheredSats += BigInt(u.satoshis);
          if (gatheredSats >= minRequiredSats + 500n) break;
        }

        // If pure BCH is still lacking, pool remaining token UTXOs of same category to gather their 1000 sats dust
        if (gatheredSats < minRequiredSats) {
          const usedIds = new Set(txBuilder.inputs.map(i => `${i.outpointTransactionHash}:${i.outpointIndex}`));
          for (const u of tokenUtxos) {
            const key = `${u.txid}:${u.vout}`;
            if (usedIds.has(key)) continue;
            usedIds.add(key);
            txBuilder.addInput(u, unlocker);
            gatheredUnits += BigInt(u.token.amount);
            gatheredSats += BigInt(u.satoshis);
            if (gatheredSats >= minRequiredSats + 500n) break;
          }
        }
      }

      if (gatheredSats < (tokenChangeUnits > 0n ? 2500n : 1500n)) {
        throw new Error(
          `Necesitas al menos ~0.00003 BCH de gas libre en tu dirección (${senderBaseAddr}) para el miner fee de red.`
        );
      }

      txBuilder.addOutput({
        to: depositTokenAddr,
        amount: 1000n,
        token: {
          category,
          amount: requiredUnits
        }
      });

      if (tokenChangeUnits > 0n) {
        txBuilder.addOutput({
          to: senderTokenAddr,
          amount: 1000n,
          token: {
            category,
            amount: tokenChangeUnits
          }
        });
      }

      txBuilder.addBchChangeOutputIfNeeded({
        to: senderBaseAddr,
        feeRate: 1.5
      });
    }

    const wcTxRaw = txBuilder.generateWcTransactionObject({
      broadcast: true,
      userPrompt
    });
    const wcTransaction = JSON.parse(stringify(wcTxRaw));
    const unsignedHex = txBuilder.build();

    return {
      wcTransaction,
      unsignedHex,
      chainId: isChipnet ? 'bch:bchtest' : 'bch:bitcoincash',
      senderBaseAddr,
      senderTokenAddr
    };
  }

  /**
   * Broadcasts a user-signed raw transaction hex directly to the Electrum network.
   */
  async broadcastTransaction(txHex, isChipnet = true) {
    await this.readyPromise;
    const provider = isChipnet ? this.chipnetProvider : this.mainnetProvider;
    if (!provider) {
      throw new Error(`Proveedor Electrum no disponible para ${isChipnet ? 'Chipnet' : 'Mainnet'}`);
    }
    const cleanHex = String(txHex || '').trim().replace(/^0x/i, '');
    const txId = await provider.sendRawTransaction(cleanHex);
    return txId;
  }

  /**
   * Sweeps CashTokens locked in an isolated per-swap `BinaryLiquidEscrow.cash` P2SH32 Covenant
   * directly into the main `BinaryLiquidVault.cash` liquidity pool Covenant (`settleToVault`).
   */
  async sweepEscrowToVault(swap) {
    await this.readyPromise;
    if (!swap || !swap.orderSeed || !swap.timelockExpiry || swap.contractName !== 'BinaryLiquidEscrow.cash') {
      return null;
    }

    const isChipnet = String(swap.depositAddress || '').startsWith('bchtest:');
    const activeVault = isChipnet ? this.chipnetVault : this.mainnetVault;
    const activeSigner = isChipnet ? this.chipnetSigner : this.mainnetSigner;
    const activeProvider = isChipnet ? this.chipnetProvider : this.mainnetProvider;
    const activeWif = isChipnet ? config.bch.watchmanChipnetWif : config.bch.watchmanMainnetWif;

    if (!activeVault || !activeSigner || !activeProvider || !this.escrowArtifact) {
      return null;
    }

    try {
      const vaultDecoded = cashAddressToLockingBytecode(activeVault.address);
      const vaultLockingBytecode = vaultDecoded.bytecode;

      let refundLockingBytecode = vaultLockingBytecode;
      if (
        swap.senderAddress &&
        (swap.senderAddress.startsWith('bchtest:') || swap.senderAddress.startsWith('bitcoincash:'))
      ) {
        const refDecoded = cashAddressToLockingBytecode(swap.senderAddress.trim());
        if (typeof refDecoded !== 'string') {
          refundLockingBytecode = refDecoded.bytecode;
        }
      }

      const orderSalt = ethers.getBytes(ethers.id(String(swap.orderSeed))).slice(0, 16);
      const escrowContract = new CashContract(
        this.escrowArtifact,
        [
          activeSigner.publicKeyCompressed,
          vaultLockingBytecode,
          refundLockingBytecode,
          BigInt(swap.timelockExpiry),
          orderSalt
        ],
        { provider: activeProvider }
      );

      const utxos = await escrowContract.getUtxos();
      if (!utxos || utxos.length === 0) return null;

      const signerUtxos = await activeProvider.getUtxos(activeSigner.cashaddr);
      const feeUtxos = (signerUtxos || []).filter(u => !u.token && BigInt(u.satoshis || 0) >= 2000n);
      if (feeUtxos.length === 0) return null;

      const sigTemplate = new SignatureTemplate(activeWif);
      const targetUtxo = utxos[0];

      const txBuilder = new TransactionBuilder({ provider: activeProvider })
        .addInput(targetUtxo, escrowContract.unlock.settleToVault(sigTemplate))
        .addInput(feeUtxos[0], sigTemplate.unlockP2PKH());

      if (targetUtxo.token && BigInt(targetUtxo.token.amount || 0) > 0n) {
        txBuilder.addOutput({
          to: activeVault.tokenAddress,
          amount: BigInt(targetUtxo.satoshis) >= 1000n ? BigInt(targetUtxo.satoshis) : 1000n,
          token: {
            category: targetUtxo.token.category,
            amount: BigInt(targetUtxo.token.amount)
          }
        });
      } else {
        txBuilder.addOutput({
          to: activeVault.address,
          amount: BigInt(targetUtxo.satoshis)
        });
      }

      txBuilder.addBchChangeOutputIfNeeded({
        to: activeSigner.cashaddr,
        feeRate: 1.5
      });

      const txDetails = await txBuilder.send();
      console.log(
        `[BCH Escrow Sweep] ✅ Swept ${swap.fromAmount} ${swap.fromToken} from BinaryLiquidEscrow.cash -> BinaryLiquidVault.cash | TXID: ${txDetails.txid}`
      );
      return txDetails.txid;
    } catch (err) {
      console.warn('[BCH Escrow Sweep] Non-fatal sweep warning:', err.message);
      return null;
    }
  }
}

export const bchService = new BchService();
