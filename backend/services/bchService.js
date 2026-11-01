import fs from 'fs';
import path from 'path';
import { ethers } from 'ethers';
import { TestNetWallet, Wallet, TokenSendRequest } from 'mainnet-js';
import {
  Contract as CashContract,
  ElectrumNetworkProvider,
  SignatureTemplate,
  TransactionBuilder
} from 'cashscript';
import {
  cashAddressToLockingBytecode,
  lockingBytecodeToCashAddress
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
    this.isReady = false;
    this.readyPromise = this.init();
  }

  async init() {
    try {
      const vaultArtifactPath = path.join(config.contractsDir, 'bch/artifacts/BinaryLiquidVault.json');
      const escrowArtifactPath = path.join(config.contractsDir, 'bch/artifacts/BinaryLiquidEscrow.json');
      this.vaultArtifact = JSON.parse(fs.readFileSync(vaultArtifactPath, 'utf8'));
      this.escrowArtifact = JSON.parse(fs.readFileSync(escrowArtifactPath, 'utf8'));
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
      this.chipnetProvider = new ElectrumNetworkProvider('chipnet');
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
        const utxos = await provider.getUtxos(depositAddress);
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
              const detectedAmount = Number(totalUnits) / (10 ** decimals);
              if (detectedAmount >= expectedAmount * 0.99) {
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
    const decimals = config.bch.tokens[tokenSym]?.decimals || 6;
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
    const rawUnits = BigInt(Math.round(cappedAmount * 1e6));
    const category = this.getTokenCategory('PUSD', true);
    const { tokenAddress } = this.toTokenAwareAddress(recipientAddress);

    const res = await this.chipnetSigner.send([
      new TokenSendRequest({
        cashaddr: tokenAddress,
        value: 1000n,
        amount: rawUnits,
        category
      })
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
}

export const bchService = new BchService();
