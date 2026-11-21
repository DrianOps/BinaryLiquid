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
  decodeTransaction,
  stringify,
  hash256,
  binToHex,
  hexToBin
} from '@bitauth/libauth';
import { config } from '../config.js';
import { db } from './db.js';
import { parseCashAddress, splitCashAddresses } from '../utils/bchAddress.js';

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
    this.escrowV2Artifact = null;
    this.collateralVaultArtifact = null;
    this.p2pEscrowArtifact = null;
    this.recentlyBroadcastTxs = new Map();
    this.isReady = false;
    this.readyPromise = this.init();
  }

  async init() {
    try {
      const vaultArtifactPath = path.join(config.contractsDir, 'bch/artifacts/BinaryLiquidVault.json');
      const escrowArtifactPath = path.join(config.contractsDir, 'bch/artifacts/BinaryLiquidEscrow.json');
      const escrowV2ArtifactPath = path.join(config.contractsDir, 'bch/artifacts/BinaryLiquidEscrowV2.json');
      const collateralArtifactPath = path.join(config.contractsDir, 'bch/artifacts/BinaryLiquidCollateralVault.json');
      const p2pEscrowArtifactPath = path.join(config.contractsDir, 'bch/artifacts/BinaryLiquidP2PEscrow.json');
      this.vaultArtifact = JSON.parse(fs.readFileSync(vaultArtifactPath, 'utf8'));
      this.escrowArtifact = JSON.parse(fs.readFileSync(escrowArtifactPath, 'utf8'));
      if (fs.existsSync(escrowV2ArtifactPath)) {
        this.escrowV2Artifact = JSON.parse(fs.readFileSync(escrowV2ArtifactPath, 'utf8'));
      }
      if (fs.existsSync(collateralArtifactPath)) {
        this.collateralVaultArtifact = JSON.parse(fs.readFileSync(collateralArtifactPath, 'utf8'));
      }
      if (fs.existsSync(p2pEscrowArtifactPath)) {
        this.p2pEscrowArtifact = JSON.parse(fs.readFileSync(p2pEscrowArtifactPath, 'utf8'));
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
    return (isTokenAware ? config.bch.mainnetVaultTokenAddress : config.bch.mainnetVaultAddress) || config.bch.watchmanMainnetAddress;
  }

  _withTimeout(promise, ms = 6000, label = 'Electrum') {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms))
    ]);
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
    const primaryRefundAddr = refundAddress ? String(refundAddress).split(',')[0].trim() : null;
    const parsedRefund = parseCashAddress(primaryRefundAddr, isChipnet);
    if (!parsedRefund || !parsedRefund.bytecode) {
      throw new Error(
        `Valid BCH senderAddress (${isChipnet ? 'bchtest:' : 'bitcoincash:'}) is required to derive the non-custodial 24h refund covenant.`
      );
    }
    const refundLockingBytecode = parsedRefund.bytecode;

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

    const expiryTimestamp = BigInt(Math.floor(Date.now() / 1000) + 86400);
    const orderSalt = ethers.getBytes(ethers.id(String(orderId))).slice(0, 16);

    const activeEscrowArtifact = this.escrowV2Artifact || this.escrowArtifact;
    const activeEscrowContractName = this.escrowV2Artifact ? 'BinaryLiquidEscrowV2.cash' : 'BinaryLiquidEscrow.cash';
    const escrowContract = new CashContract(
      activeEscrowArtifact,
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
      contractName: activeEscrowContractName,
      contractType: 'P2SH32 CashScript Covenant (Zero Private Keys + 24h Timelock)',
      expiryTimestamp: Number(expiryTimestamp),
      explorerUrl: `${explorerBase}/${escrowContract.address}`
    };
  }

  /**
   * Instantiates an isolated, destination-locked P2SH32 P2P Escrow Covenant (`BinaryLiquidP2PEscrow.cash`)
   * bound strictly to (seller, buyer, arbiter) with 24h permissionless timelock refund.
   */
  async createP2PEscrowCovenant({
    tradeId,
    sellerAddress,
    buyerAddress,
    isChipnet = true,
    isCashToken = true,
    expiryTimestamp = null
  }) {
    await this.readyPromise;
    const activeSigner = isChipnet ? this.chipnetSigner : this.mainnetSigner;
    const activeProvider = isChipnet ? this.chipnetProvider : this.mainnetProvider;

    if (!activeSigner || !activeProvider || !this.p2pEscrowArtifact) {
      throw new Error(`Contrato BinaryLiquidP2PEscrow.cash no inicializado para ${isChipnet ? 'Chipnet' : 'Mainnet'}.`);
    }

    const cleanSeller = String(sellerAddress || '').split(',')[0].trim();
    const cleanBuyer = String(buyerAddress || '').split(',')[0].trim();
    const parsedSeller = parseCashAddress(cleanSeller, isChipnet);
    const parsedBuyer = parseCashAddress(cleanBuyer, isChipnet);

    if (!parsedSeller || !parsedSeller.bytecode) {
      throw new Error(`Dirección BCH del vendedor inválida para ${isChipnet ? 'Chipnet (bchtest:)' : 'Mainnet (bitcoincash:)'}.`);
    }
    if (!parsedBuyer || !parsedBuyer.bytecode) {
      throw new Error(`Dirección BCH del comprador inválida para ${isChipnet ? 'Chipnet (bchtest:)' : 'Mainnet (bitcoincash:)'}.`);
    }

    // Extract 20-byte pubkey hash from standard 25-byte P2PKH bytecode (76 a9 14 <20 bytes> 88 ac)
    const sellerPkh =
      parsedSeller.bytecode.length === 25 &&
      parsedSeller.bytecode[0] === 0x76 &&
      parsedSeller.bytecode[1] === 0xa9 &&
      parsedSeller.bytecode[2] === 0x14
        ? parsedSeller.bytecode.slice(3, 23)
        : ethers.getBytes(ethers.id(cleanSeller)).slice(0, 20);

    const expiry = BigInt(expiryTimestamp || (Math.floor(Date.now() / 1000) + 86400));
    const tradeSalt = ethers.getBytes(ethers.id(`P2P:${String(tradeId)}`)).slice(0, 16);

    const escrowContract = new CashContract(
      this.p2pEscrowArtifact,
      [
        activeSigner.publicKeyCompressed,
        sellerPkh,
        parsedBuyer.bytecode,
        parsedSeller.bytecode,
        expiry,
        tradeSalt
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
      sellerAddress: parsedSeller.baseAddress,
      sellerTokenAddress: parsedSeller.tokenAddress,
      buyerAddress: parsedBuyer.baseAddress,
      buyerTokenAddress: parsedBuyer.tokenAddress,
      contractName: 'BinaryLiquidP2PEscrow.cash',
      contractType: 'P2SH32 Non-Custodial P2P Covenant (Buyer/Seller Locked + 24h Timelock)',
      expiryTimestamp: Number(expiry),
      explorerUrl: `${explorerBase}/${escrowContract.address}`
    };
  }

  /**
   * Executes real on-chain settlement of `BinaryLiquidP2PEscrow.cash`:
   * - action === 'release': calls `releaseToBuyer(arbiterSig)` -> VM enforces 100% strictly to Buyer.
   * - action === 'refund': calls `refundToSeller(arbiterSig)` -> VM enforces 100% strictly to Seller.
   */
  async settleP2PEscrow({
    tradeId,
    sellerAddress,
    buyerAddress,
    expiryTimestamp,
    action = 'release',
    isChipnet = true
  }) {
    await this.readyPromise;
    const activeSigner = isChipnet ? this.chipnetSigner : this.mainnetSigner;
    const activeProvider = isChipnet ? this.chipnetProvider : this.mainnetProvider;
    const activeWif = isChipnet ? config.bch.watchmanChipnetWif : config.bch.watchmanMainnetWif;
    const explorerTxBase = isChipnet
      ? 'https://chipnet.imaginary.cash/tx'
      : 'https://3xpl.com/bitcoin-cash/transaction';

    if (!activeSigner || !activeProvider || !activeWif || !this.p2pEscrowArtifact) {
      throw new Error(`Firmante / Contrato P2P no disponible en ${isChipnet ? 'Chipnet' : 'Mainnet'}.`);
    }

    const cleanSeller = String(sellerAddress || '').split(',')[0].trim();
    const cleanBuyer = String(buyerAddress || '').split(',')[0].trim();
    const parsedSeller = parseCashAddress(cleanSeller, isChipnet);
    const parsedBuyer = parseCashAddress(cleanBuyer, isChipnet);
    if (!parsedSeller || !parsedBuyer) {
      throw new Error('Direcciones BCH de comprador o vendedor inválidas para liquidar el Escrow P2P.');
    }

    const sellerPkh =
      parsedSeller.bytecode.length === 25 &&
      parsedSeller.bytecode[0] === 0x76 &&
      parsedSeller.bytecode[1] === 0xa9 &&
      parsedSeller.bytecode[2] === 0x14
        ? parsedSeller.bytecode.slice(3, 23)
        : ethers.getBytes(ethers.id(cleanSeller)).slice(0, 20);

    const tradeSalt = ethers.getBytes(ethers.id(`P2P:${String(tradeId)}`)).slice(0, 16);
    const escrowContract = new CashContract(
      this.p2pEscrowArtifact,
      [
        activeSigner.publicKeyCompressed,
        sellerPkh,
        parsedBuyer.bytecode,
        parsedSeller.bytecode,
        BigInt(expiryTimestamp),
        tradeSalt
      ],
      { provider: activeProvider }
    );

    return db.withLock(`bch:utxo_spend:${isChipnet ? 'chipnet' : 'mainnet'}`, async () => {
      const utxos = await this._withTimeout(escrowContract.getUtxos(), 7000, 'P2P Escrow UTXOs');
      if (!utxos || utxos.length === 0) {
        throw new Error(`No hay fondos bloqueados en el Escrow P2P (${escrowContract.tokenAddress}) para liquidar.`);
      }

      const sigTemplate = new SignatureTemplate(activeWif);
      const targetParsed = action === 'refund' ? parsedSeller : parsedBuyer;
      let lastTxId = null;

      for (const targetUtxo of utxos) {
        const signerUtxos = await activeProvider.getUtxos(activeSigner.cashaddr);
        const feeUtxos = (signerUtxos || []).filter(u => !u.token && BigInt(u.satoshis || 0) >= 2000n);
        if (feeUtxos.length === 0) {
          throw new Error(`Watchman ${activeSigner.cashaddr} no tiene suficiente BCH de gas para patrocinar la liquidación P2P.`);
        }

        const unlocker =
          action === 'refund'
            ? escrowContract.unlock.refundToSeller(sigTemplate)
            : escrowContract.unlock.releaseToBuyer(sigTemplate);

        const txBuilder = new TransactionBuilder({ provider: activeProvider })
          .addInput(targetUtxo, unlocker)
          .addInput(feeUtxos[0], sigTemplate.unlockP2PKH());

        if (targetUtxo.token && BigInt(targetUtxo.token.amount || 0) > 0n) {
          txBuilder.addOutput({
            to: targetParsed.tokenAddress,
            amount: BigInt(targetUtxo.satoshis) >= 1000n ? BigInt(targetUtxo.satoshis) : 1000n,
            token: {
              category: targetUtxo.token.category,
              amount: BigInt(targetUtxo.token.amount),
              ...(targetUtxo.token.nft ? { nft: targetUtxo.token.nft } : {})
            }
          });
        } else {
          txBuilder.addOutput({
            to: targetParsed.baseAddress,
            amount: BigInt(targetUtxo.satoshis)
          });
        }

        txBuilder.addBchChangeOutputIfNeeded({
          to: activeSigner.cashaddr,
          feeRate: 1.5
        });

        const txDetails = await txBuilder.send();
        lastTxId = txDetails.txid;
        console.log(
          `[BCH P2P Escrow] ✅ ${action === 'refund' ? 'Refunded to Seller' : 'Released to Buyer'} | Trade ${tradeId} | TXID: ${txDetails.txid}`
        );
      }

      return {
        txHash: lastTxId,
        explorerUrl: `${explorerTxBase}/${lastTxId}`,
        escrowAddress: escrowContract.tokenAddress,
        recipientAddress: targetParsed.tokenAddress
      };
    });
  }

  getTokenCategory(tokenSymbol = 'PUSD', isChipnet = false) {
    const tok = config.bch.tokens[tokenSymbol.toUpperCase()] || config.bch.tokens.PUSD;
    if (isChipnet && tokenSymbol.toUpperCase() === 'PUSD') {
      return tok.chipnetCategory || tok.category;
    }
    return tok.category;
  }

  getVaultInfo(isChipnet = true) {
    const vault = isChipnet ? this.chipnetVault : this.mainnetVault;
    if (!vault) return null;
    return {
      address: vault.address,
      tokenAddress: vault.tokenAddress
    };
  }

  _verifyRawTxHexOutputs(rawTxHex, { depositAddress, isNativeBch, expectedCat, decimals, expectedAmountNum }) {
    if (!rawTxHex || typeof rawTxHex !== 'string' || !depositAddress) {
      return { matched: false, amount: 0 };
    }
    const cleanHex = rawTxHex.trim().replace(/^0x/i, '');
    if (cleanHex.length < 20 || cleanHex.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(cleanHex)) {
      return { matched: false, amount: 0 };
    }

    const targetDecoded = cashAddressToLockingBytecode(depositAddress.trim());
    if (typeof targetDecoded === 'string') {
      return { matched: false, amount: 0 };
    }
    const targetLockHex = binToHex(targetDecoded.bytecode).toLowerCase();

    try {
      const rawBin = hexToBin(cleanHex);
      const decodedTx = decodeTransaction(rawBin);
      if (typeof decodedTx === 'string' || !Array.isArray(decodedTx?.outputs)) {
        return { matched: false, amount: 0 };
      }

      if (isNativeBch) {
        let totalSats = 0n;
        for (const out of decodedTx.outputs) {
          if (binToHex(out.lockingBytecode).toLowerCase() === targetLockHex) {
            totalSats += BigInt(out.valueSatoshis || 0n);
          }
        }
        const receivedBch = Number(totalSats) / 1e8;
        return {
          matched: totalSats > 0n && receivedBch + 1e-12 >= expectedAmountNum * 0.99,
          amount: receivedBch
        };
      }

      const wantCat = String(expectedCat || '').toLowerCase();
      let totalUnits = 0n;
      for (const out of decodedTx.outputs) {
        if (
          binToHex(out.lockingBytecode).toLowerCase() === targetLockHex &&
          out.token &&
          binToHex(out.token.category).toLowerCase() === wantCat
        ) {
          totalUnits += BigInt(out.token.amount || 0n);
        }
      }
      const amountWithDecimals = Number(totalUnits) / (10 ** decimals);
      return {
        matched: totalUnits > 0n && amountWithDecimals + 1e-12 >= expectedAmountNum * 0.99,
        amount: amountWithDecimals
      };
    } catch (_) {
      return { matched: false, amount: 0 };
    }
  }

  async getBalances() {
    await this.readyPromise;
    const balances = {
      mainnet: { bch: 0.0, PUSD: 0.0, MUSD: 0.0, vaultAddress: this.mainnetVault?.tokenAddress || null },
      chipnet: { bch: 0.0, PUSD: 0.0, MUSD: 0.0, vaultAddress: this.chipnetVault?.tokenAddress || null }
    };

    if (this.mainnetVault) {
      try {
        const utxos = await this._withTimeout(this.mainnetVault.getUtxos(), 6000, 'Mainnet Vault');
        const pusdCat = String(this.getTokenCategory('PUSD', false) || '').toLowerCase();
        let sats = 0n;
        let pusdUnits = 0n;
        for (const u of utxos) {
          sats += u.satoshis;
          if (u.token?.category?.toLowerCase() === pusdCat) pusdUnits += u.token.amount;
        }
        balances.mainnet.bch = Number(sats) / 1e8;
        balances.mainnet.PUSD = Number(pusdUnits) / 1e6;
      } catch (e) {
        console.warn('[BCH Mainnet Covenant] Balance query warning:', e.message);
      }
    }

    if (this.chipnetVault) {
      try {
        const utxos = await this._withTimeout(this.chipnetVault.getUtxos(), 6000, 'Chipnet Vault');
        const pusdCat = String(this.getTokenCategory('PUSD', true) || '').toLowerCase();
        let sats = 0n;
        let pusdUnits = 0n;
        for (const u of utxos) {
          sats += u.satoshis;
          if (u.token?.category?.toLowerCase() === pusdCat) pusdUnits += u.token.amount;
        }
        balances.chipnet.bch = Number(sats) / 1e8;
        balances.chipnet.PUSD = Number(pusdUnits) / 1e6;
      } catch (e) {
        console.warn('[BCH Chipnet Covenant] Balance query warning:', e.message);
      }
    }

    return balances;
  }

  async verifyDeposit(txHash, expectedAmount, tokenSymbol = 'PUSD', depositAddress = null, customCategory = null, customDecimals = null) {
    await this.readyPromise;
    const expectedNum = Number(expectedAmount);
    if (!Number.isFinite(expectedNum) || expectedNum <= 0) {
      return { verified: false, reason: `Monto esperado inválido (${expectedAmount})` };
    }

    const cleanDeposit = depositAddress ? String(depositAddress).trim().toLowerCase() : '';
    const isChipnet = cleanDeposit
      ? cleanDeposit.startsWith('bchtest:')
      : config.bch.network !== 'mainnet';
    const provider = isChipnet ? this.chipnetProvider : this.mainnetProvider;
    const upperSym = String(tokenSymbol || 'PUSD').toUpperCase();
    const isNativeBch = upperSym === 'BCH';
    const expectedCat = isNativeBch ? null : (customCategory || this.getTokenCategory(upperSym, isChipnet));
    const decimals =
      customDecimals !== null && customDecimals !== undefined && !Number.isNaN(Number(customDecimals))
        ? Number(customDecimals)
        : config.bch.tokens[upperSym]?.decimals ?? 6;
    const cleanHash =
      txHash && /^[0-9a-fA-F]{64}$/.test(String(txHash).trim())
        ? String(txHash).trim().toLowerCase()
        : null;

    const sharedVaultAddresses = new Set(
      [
        this.chipnetVault?.address,
        this.chipnetVault?.tokenAddress,
        this.mainnetVault?.address,
        this.mainnetVault?.tokenAddress
      ]
        .filter(Boolean)
        .map(a => a.toLowerCase())
    );
    const isSharedVault = Boolean(depositAddress && sharedVaultAddresses.has(depositAddress.trim().toLowerCase()));

    // Retry up to 4 times (1.2s apart) when a signed txHash is provided so Electrum mempool indexing lag never causes false negatives
    const maxAttempts = cleanHash ? 4 : 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      // A) Inspect live UTXOs at the Non-Custodial Covenant deposit address
      // For shared pool vaults, never blindly credit pre-existing UTXOs without a matching txHash.
      if (depositAddress && provider && (!isSharedVault || cleanHash)) {
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
            const candidateUtxos = cleanHash
              ? utxos.filter(u => String(u.txid || '').toLowerCase() === cleanHash)
              : utxos;

            if (isNativeBch && candidateUtxos.length > 0) {
              const totalSats = candidateUtxos.reduce((sum, u) => sum + BigInt(u.satoshis || 0), 0n);
              const receivedBch = Number(totalSats) / 1e8;
              if (totalSats > 0n && receivedBch + 1e-12 >= expectedNum * 0.99) {
                return {
                  verified: true,
                  onChain: true,
                  nonCustodial: true,
                  amount: receivedBch,
                  txHash: cleanHash || candidateUtxos[0].txid
                };
              }
            } else if (candidateUtxos.length > 0) {
              const matching = candidateUtxos.filter(
                u => u.token?.category?.toLowerCase() === expectedCat?.toLowerCase() && BigInt(u.token.amount || 0) > 0n
              );
              if (matching.length > 0) {
                const totalUnits = matching.reduce((sum, u) => sum + BigInt(u.token.amount || 0), 0n);
                const amountWithDecimals = Number(totalUnits) / (10 ** decimals);

                if (amountWithDecimals + 1e-12 >= expectedNum * 0.99) {
                  return {
                    verified: true,
                    onChain: true,
                    nonCustodial: true,
                    amount: amountWithDecimals,
                    txHash: cleanHash || matching[0].txid
                  };
                }
              }
            }
          }
        } catch (err) {
          console.warn(`[BCH ${isChipnet ? 'Chipnet' : 'Mainnet'}] Covenant UTXO check warning (attempt ${attempt}):`, err.message);
        }
      }

      // B) Verify raw transaction outputs cryptographically on Electrum network if txHash was provided
      if (cleanHash && provider && depositAddress) {
        try {
          const rawTxHex = await provider.getRawTransaction(cleanHash);
          if (rawTxHex) {
            const parsedCheck = this._verifyRawTxHexOutputs(rawTxHex, {
              depositAddress,
              isNativeBch,
              expectedCat,
              decimals,
              expectedAmountNum: expectedNum
            });
            if (parsedCheck.matched) {
              return {
                verified: true,
                onChain: true,
                nonCustodial: true,
                amount: parsedCheck.amount,
                txHash: cleanHash
              };
            }
          }
        } catch (err) {
          console.warn(`[BCH ${isChipnet ? 'Chipnet' : 'Mainnet'}] Raw TX lookup warning (attempt ${attempt}):`, err.message);
        }

        // C) Inspect recently self-broadcasted serialized TX hex (never blind-trust txids without raw output match)
        const recentBroadcast = this.recentlyBroadcastTxs.get(cleanHash);
        if (recentBroadcast?.txHex && Date.now() - recentBroadcast.timestamp < 10 * 60 * 1000) {
          try {
            const cleanCachedHex = recentBroadcast.txHex.trim().replace(/^0x/i, '');
            if (cleanCachedHex.length > 64) {
              const computedTxId = binToHex(new Uint8Array(hash256(hexToBin(cleanCachedHex))).reverse()).toLowerCase();
              if (computedTxId === cleanHash) {
                const parsedCached = this._verifyRawTxHexOutputs(cleanCachedHex, {
                  depositAddress,
                  isNativeBch,
                  expectedCat,
                  decimals,
                  expectedAmountNum: expectedNum
                });
                if (parsedCached.matched) {
                  return {
                    verified: true,
                    onChain: true,
                    nonCustodial: true,
                    amount: parsedCached.amount,
                    txHash: cleanHash
                  };
                }
              }
            }
          } catch (_) {}
        }
      }

      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1200));
      }
    }

    if (config.simulateIfNoFunds) {
      return { verified: true, simulated: true, amount: expectedNum, txHash: cleanHash || 'simulated_fallback' };
    }

    return {
      verified: false,
      reason: `No se detectaron ${isNativeBch ? 'BCH' : `CashTokens ${upperSym}`} confirmados (${expectedNum} ${upperSym}) en el Smart Contract Covenant (${depositAddress || 'BCH'})`
    };
  }

  /**
   * Executes a 100% Non-Custodial CashTokens payout directly from `BinaryLiquidVault.cash` P2SH32 Covenant,
   * co-signed by The Watchman's Schnorr key and enforcing on-chain Covenant State Continuation!
   */
  async releaseFromVault(
    recipientAddress,
    amount,
    tokenSymbol = 'PUSD',
    customCategory = null,
    customDecimals = null,
    expectedIsTestnet = null
  ) {
    await this.readyPromise;

    const parsedRecipient = parseCashAddress(recipientAddress);
    if (!parsedRecipient) {
      throw new Error(`Dirección CashAddr de Bitcoin Cash inválida: ${recipientAddress}`);
    }

    const isChipnet = parsedRecipient.isTestnet;
    if (expectedIsTestnet !== null && expectedIsTestnet !== undefined && Boolean(expectedIsTestnet) !== Boolean(isChipnet)) {
      throw new Error(
        `[Security Alert] Bloqueo de red cruzada: el destino (${recipientAddress}) no coincide con la red autorizada (${expectedIsTestnet ? 'Testnet/Chipnet' : 'Mainnet'}).`
      );
    }
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
      throw new Error(`[BCH Covenant] BinaryLiquidVault.cash opera exclusivamente con CashTokens. Retira en USDT/USDC o PUSD.`);
    }

    const category = customCategory || this.getTokenCategory(tokenSym, isChipnet);
    const decimals =
      customDecimals !== null && customDecimals !== undefined && !Number.isNaN(Number(customDecimals))
        ? Number(customDecimals)
        : config.bch.tokens[tokenSym]?.decimals ?? 6;
    const payoutUnits = BigInt(Math.max(1, Math.round(Number(amount) * (10 ** decimals))));

    if (payoutUnits <= 0n) {
      throw new Error('El monto de liberación del Covenant debe ser mayor a cero');
    }

    const { tokenAddress: recipientTokenAddr, lockingBytecode: recipientLockingBytecode } =
      this.toTokenAwareAddress(parsedRecipient.baseAddress);

    return db.withLock(`bch:utxo_spend:${isChipnet ? 'chipnet' : 'mainnet'}`, async () => {
      try {
        // 1. Fetch Covenant Pool UTXOs holding the target CashToken category
        const vaultUtxos = await this._withTimeout(activeVault.getUtxos(), 6000, 'BCH Vault UTXOs');
        const expectedCatLower = String(category || '').toLowerCase();
        const poolUtxo = vaultUtxos.find(
          u => u.token?.category?.toLowerCase() === expectedCatLower && u.token.amount >= payoutUnits
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

        // Mark continuation TXID as protocol-owned before releasing UTXO lock so it can never be hijacked
        db.markTxHashConsumed(txDetails.txid, {
          module: 'PROTOCOL_CONTINUATION',
          chain: isChipnet ? 'bch_chipnet' : 'bch_mainnet',
          refId: recipientTokenAddr
        });

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
    });
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
    const parsedRecipient = parseCashAddress(recipientAddress, true);
    if (!parsedRecipient || parsedRecipient.prefix !== 'bchtest') {
      throw new Error('Ingresa una dirección de Bitcoin Cash Chipnet válida (bchtest:q... o bchtest:z...)');
    }
    if (!this.chipnetSigner) {
      throw new Error('Chipnet Faucet signer no disponible');
    }

    const cappedAmount = Math.min(Math.max(Number(amount) || 50, 1), 500);
    const decimals = config.bch.tokens.PUSD?.decimals ?? 6;
    const rawUnits = BigInt(Math.round(cappedAmount * (10 ** decimals)));
    const category = this.getTokenCategory('PUSD', true);
    const tokenAddress = parsedRecipient.tokenAddress;

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
      const rawAddrs = splitCashAddresses(cashaddr);
      if (rawAddrs.length === 0) {
        return { BCH: 0, PUSD: 0, MUSD: 0, LIFT: 0, tokens: {}, utxoCount: 0, network: 'invalid' };
      }

      const defaultHint = forceTestnet !== null ? Boolean(forceTestnet) : null;
      const parsedEntries = rawAddrs.map(raw => {
        const hasExplicitPrefix = raw.includes(':');
        return {
          raw,
          hasExplicitPrefix,
          parsed: parseCashAddress(raw, defaultHint)
        };
      });

      const validEntries = parsedEntries.filter(e => e.parsed);
      if (validEntries.length === 0) {
        return { BCH: 0, PUSD: 0, MUSD: 0, LIFT: 0, tokens: {}, utxoCount: 0, network: 'invalid' };
      }

      // Reject explicit cross-network prefix instead of silently coercing bitcoincash:<->bchtest:
      if (forceTestnet !== null) {
        const expectedTestnet = Boolean(forceTestnet);
        const mismatched = validEntries.find(
          e => e.hasExplicitPrefix && e.parsed.isTestnet !== expectedTestnet
        );
        if (mismatched) {
          return {
            BCH: 0,
            PUSD: 0,
            MUSD: 0,
            LIFT: 0,
            tokens: {},
            utxoCount: 0,
            networkMismatch: true,
            network: expectedTestnet ? 'chipnet' : 'mainnet',
            address: validEntries[0].parsed.baseAddress
          };
        }
      }

      const isChipnet = forceTestnet !== null ? Boolean(forceTestnet) : validEntries[0].parsed.isTestnet;
      const targetPrefix = isChipnet ? 'bchtest' : 'bitcoincash';
      const provider = isChipnet ? this.chipnetProvider : this.mainnetProvider;
      if (!provider) {
        return {
          BCH: 0,
          PUSD: 0,
          MUSD: 0,
          LIFT: 0,
          tokens: {},
          utxoCount: 0,
          electrumError: true,
          network: isChipnet ? 'chipnet' : 'mainnet'
        };
      }

      const pusdCategory = String(this.getTokenCategory('PUSD', isChipnet) || '').toLowerCase();
      const musdCategory = String(this.getTokenCategory('MUSD', isChipnet) || '').toLowerCase();
      const liftCategory = String(this.getTokenCategory('LIFT', isChipnet) || '').toLowerCase();
      const pusdDecimals = config.bch.tokens.PUSD?.decimals ?? 6;
      const musdDecimals = config.bch.tokens.MUSD?.decimals ?? 6;
      const liftDecimals = config.bch.tokens.LIFT?.decimals ?? 2;

      const addressesToQuery = new Set();
      for (const entry of validEntries) {
        const p = entry.parsed;
        if (p.prefix === targetPrefix) {
          addressesToQuery.add(p.baseAddress);
        }
      }

      let totalSats = 0n;
      let totalPusdFloating = 0.0;
      let totalMusdFloating = 0.0;
      let totalLiftFloating = 0.0;
      const rawTokenUnitsByCategory = new Map();
      let totalUtxos = 0;
      const seenUtxoKeys = new Set();
      let hadElectrumError = false;

      for (const addr of addressesToQuery) {
        try {
          const utxos = await this._withTimeout(provider.getUtxos(addr), 6000, `Electrum ${addr}`);
          for (const u of utxos || []) {
            const utxoKey = `${u.txid}:${u.vout}`;
            if (seenUtxoKeys.has(utxoKey)) continue;
            seenUtxoKeys.add(utxoKey);
            totalUtxos++;

            totalSats += BigInt(u.satoshis || 0);
            if (u.token?.category) {
              const cat = String(u.token.category).toLowerCase();
              const rawAmt = Number(u.token.amount || 0);
              rawTokenUnitsByCategory.set(cat, (rawTokenUnitsByCategory.get(cat) || 0n) + BigInt(u.token.amount || 0));

              if (cat === pusdCategory) {
                totalPusdFloating += rawAmt / (10 ** pusdDecimals);
              } else if (cat === musdCategory) {
                totalMusdFloating += rawAmt / (10 ** musdDecimals);
              } else if (cat === liftCategory) {
                totalLiftFloating += rawAmt / (10 ** liftDecimals);
              }
            }
          }
        } catch (e) {
          hadElectrumError = true;
          console.warn(`[BCH Wallet Balance] Error querying ${addr}:`, e.message);
        }
      }

      const pusdBalance = Number(totalPusdFloating.toFixed(6));
      const musdBalance = Number(totalMusdFloating.toFixed(6));
      const liftBalance = Number(totalLiftFloating.toFixed(2));
      const tokens = {
        PUSD: pusdBalance,
        MUSD: musdBalance,
        LIFT: liftBalance
      };
      for (const [cat, units] of rawTokenUnitsByCategory.entries()) {
        tokens[cat] = units.toString();
      }

      return {
        BCH: Number(totalSats) / 1e8,
        PUSD: pusdBalance,
        MUSD: musdBalance,
        LIFT: liftBalance,
        tokens,
        utxoCount: totalUtxos,
        electrumError: hadElectrumError || undefined,
        network: isChipnet ? 'chipnet' : 'mainnet',
        address: Array.from(addressesToQuery)[0] || rawAddrs[0]
      };
    } catch (err) {
      console.warn('[BCH Wallet Balance] Query warning:', err.message);
      return {
        BCH: 0,
        PUSD: 0,
        MUSD: 0,
        LIFT: 0,
        tokens: {},
        utxoCount: 0,
        electrumError: true,
        network: 'error'
      };
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

    const rawFirst = borrowerCashAddr.split(',')[0].trim();
    const candidateClean = rawFirst.includes(':')
      ? rawFirst.toLowerCase()
      : `${isChipnet ? 'bchtest' : 'bitcoincash'}:${rawFirst.toLowerCase()}`;
    const decoded = cashAddressToLockingBytecode(candidateClean);
    if (typeof decoded === 'string') {
      throw new Error(`Dirección Bitcoin Cash inválida (${rawFirst}): ${decoded}`);
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
      const utxos = await this._withTimeout(info.contract.getUtxos(), 6000, 'Collateral Covenant');
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
        utxos: [],
        liveError: true
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
    tokenCategory = null,
    tokenDecimals = null,
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

    const primarySender = senderAddress.split(',')[0].trim();
    const decodedSender = cashAddressToLockingBytecode(primarySender);
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

    // Support both single CashAddress (Cashonize / WC2) and comma-separated HD derived addresses (Paytaca)
    const rawSenderList = senderAddress.split(',').map(s => s.trim()).filter(Boolean);
    const candidateBaseAddrs = [];
    for (const rawAddr of rawSenderList) {
      const dec = cashAddressToLockingBytecode(rawAddr);
      if (typeof dec !== 'string') {
        const enc = lockingBytecodeToCashAddress({
          bytecode: dec.bytecode,
          prefix,
          tokenSupport: false
        });
        if (typeof enc !== 'string' && !candidateBaseAddrs.includes(enc.address)) {
          candidateBaseAddrs.push(enc.address);
        }
      }
    }
    if (!candidateBaseAddrs.includes(senderBaseAddr)) {
      candidateBaseAddrs.unshift(senderBaseAddr);
    }

    const utxos = [];
    const seenUtxoKeys = new Set();
    for (const addr of candidateBaseAddrs) {
      try {
        const addrUtxos = await provider.getUtxos(addr);
        for (const u of addrUtxos || []) {
          const k = `${u.txid}:${u.vout}`;
          if (seenUtxoKeys.has(k)) continue;
          seenUtxoKeys.add(k);
          u._ownerBaseAddr = addr;
          utxos.push(u);
        }
      } catch (_) {}
    }

    if (!utxos || utxos.length === 0) {
      throw new Error(`No se detectaron UTXOs disponibles en ${senderBaseAddr}.`);
    }

    const txBuilder = new TransactionBuilder({ provider });
    const inputOwners = [];
    const addTrackedInput = u => {
      const ownerAddr = u._ownerBaseAddr || senderBaseAddr;
      txBuilder.addInput(u, placeholderP2PKHUnlocker(ownerAddr));
      inputOwners.push(ownerAddr);
    };

    if (isNativeBch) {
      const requiredSats = BigInt(Math.round(Number(amount) * 1e8));
      const pureUtxos = utxos
        .filter(u => !u.token && BigInt(u.satoshis || 0) > 0n)
        .sort((a, b) => (BigInt(b.satoshis) > BigInt(a.satoshis) ? 1 : -1));

      let gatheredSats = 0n;
      for (const u of pureUtxos) {
        addTrackedInput(u);
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
      const category = tokenCategory || this.getTokenCategory(sym, isChipnet);
      const decimals = tokenDecimals !== null ? Number(tokenDecimals) : (config.bch.tokens[sym]?.decimals ?? 6);
      const requiredUnits = BigInt(Math.max(1, Math.round(Number(amount) * (10 ** decimals))));
      const { tokenAddress: depositTokenAddr } = this.toTokenAwareAddress(depositAddress);

      const tokenUtxos = utxos
        .filter(u => u.token?.category === category && !u.token?.nft && BigInt(u.token.amount || 0) > 0n)
        .sort((a, b) => (BigInt(b.token.amount) > BigInt(a.token.amount) ? 1 : -1));

      let gatheredUnits = 0n;
      let gatheredSats = 0n;
      for (const u of tokenUtxos) {
        addTrackedInput(u);
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

      const initialTokenChange = gatheredUnits - requiredUnits;
      const minRequiredSats = initialTokenChange > 0n ? 3200n : 2200n;

      // Ensure enough satoshis for dust output (1000 sats) + token change dust (1000 sats) + miner fee (~800 sats)
      if (gatheredSats < minRequiredSats) {
        const pureBchUtxos = utxos
          .filter(u => !u.token && BigInt(u.satoshis || 0) > 0n)
          .sort((a, b) => (BigInt(b.satoshis) > BigInt(a.satoshis) ? 1 : -1));

        for (const u of pureBchUtxos) {
          addTrackedInput(u);
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
            addTrackedInput(u);
            gatheredUnits += BigInt(u.token.amount);
            gatheredSats += BigInt(u.satoshis);
            if (gatheredSats >= minRequiredSats + 500n) break;
          }
        }
      }

      const tokenChangeUnits = gatheredUnits - requiredUnits;
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
      broadcast: false,
      userPrompt
    });
    const wcTransaction = JSON.parse(stringify(wcTxRaw));
    const unsignedHex = txBuilder.build();

    return {
      wcTransaction,
      unsignedHex,
      inputOwners,
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
    const rememberBroadcast = (id, rawHex) => {
      if (!id || !rawHex || rawHex.length <= 64) return;
      const now = Date.now();
      this.recentlyBroadcastTxs.set(String(id).toLowerCase(), {
        txHex: rawHex,
        isChipnet,
        timestamp: now
      });
      if (this.recentlyBroadcastTxs.size > 1000) {
        for (const [k, v] of this.recentlyBroadcastTxs.entries()) {
          if (now - v.timestamp > 10 * 60 * 1000 || this.recentlyBroadcastTxs.size > 900) {
            this.recentlyBroadcastTxs.delete(k);
          } else {
            break;
          }
        }
      }
    };

    // If wallet already broadcast on-chain and returned a 64-character txid, return it without spoofing raw cache
    if (/^[0-9a-fA-F]{64}$/.test(cleanHex)) {
      return cleanHex.toLowerCase();
    }

    try {
      const txId = await provider.sendRawTransaction(cleanHex);
      if (txId) {
        rememberBroadcast(txId, cleanHex);
      }
      return txId;
    } catch (err) {
      const msg = String(err.message || '').toLowerCase();
      if (
        msg.includes('already in mempool') ||
        msg.includes('txn-already-known') ||
        msg.includes('already known')
      ) {
        try {
          const bin = hexToBin(cleanHex);
          const hash = hash256(bin);
          const reversed = new Uint8Array(hash).reverse();
          const computedTxId = binToHex(reversed);
          rememberBroadcast(computedTxId, cleanHex);
          return computedTxId;
        } catch {}
      }
      throw err;
    }
  }

  /**
   * Sweeps CashTokens locked in an isolated per-swap `BinaryLiquidEscrow.cash` P2SH32 Covenant
   * directly into the main `BinaryLiquidVault.cash` liquidity pool Covenant (`settleToVault`).
   */
  async sweepEscrowToVault(swap) {
    await this.readyPromise;
    const isV2Escrow = swap?.contractName === 'BinaryLiquidEscrowV2.cash';
    const isV1Escrow = swap?.contractName === 'BinaryLiquidEscrow.cash';
    if (!swap || !swap.orderSeed || !swap.timelockExpiry || (!isV1Escrow && !isV2Escrow)) {
      return null;
    }

    const activeArtifact = isV2Escrow ? this.escrowV2Artifact : this.escrowArtifact;
    const isChipnet = String(swap.depositAddress || '').trim().toLowerCase().startsWith('bchtest:');
    const activeVault = isChipnet ? this.chipnetVault : this.mainnetVault;
    const activeSigner = isChipnet ? this.chipnetSigner : this.mainnetSigner;
    const activeProvider = isChipnet ? this.chipnetProvider : this.mainnetProvider;
    const activeWif = isChipnet ? config.bch.watchmanChipnetWif : config.bch.watchmanMainnetWif;

    if (!activeVault || !activeSigner || !activeProvider || !activeArtifact) {
      return null;
    }

    return db.withLock(`bch:utxo_spend:${isChipnet ? 'chipnet' : 'mainnet'}`, async () => {
      try {
        const vaultDecoded = cashAddressToLockingBytecode(activeVault.address);
        const vaultLockingBytecode = vaultDecoded.bytecode;

        let refundLockingBytecode = vaultLockingBytecode;
        const primaryRefundAddr = swap.senderAddress ? String(swap.senderAddress).split(',')[0].trim() : null;
        const parsedRefund = parseCashAddress(primaryRefundAddr, isChipnet);
        if (parsedRefund) {
          refundLockingBytecode = parsedRefund.bytecode;
        }

        const orderSalt = ethers.getBytes(ethers.id(String(swap.orderSeed))).slice(0, 16);
        const escrowContract = new CashContract(
          activeArtifact,
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

        const sigTemplate = new SignatureTemplate(activeWif);
        let lastSweepTxId = null;

        for (const targetUtxo of utxos) {
          const signerUtxos = await activeProvider.getUtxos(activeSigner.cashaddr);
          const feeUtxos = (signerUtxos || []).filter(u => !u.token && BigInt(u.satoshis || 0) >= 2000n);
          if (feeUtxos.length === 0) {
            throw new Error(`Watchman ${activeSigner.cashaddr} lacks BCH fee UTXOs to sweep escrow`);
          }

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
          lastSweepTxId = txDetails.txid;
          db.markTxHashConsumed(txDetails.txid, {
            module: 'PROTOCOL_SWEEP',
            chain: isChipnet ? 'bch_chipnet' : 'bch_mainnet',
            refId: swap.id || ''
          });
          console.log(
            `[BCH Escrow Sweep] ✅ Swept UTXO from ${swap.contractName} -> BinaryLiquidVault.cash | TXID: ${txDetails.txid}`
          );
        }

        return lastSweepTxId;
      } catch (err) {
        console.error('[BCH Escrow Sweep] Failed sweeping escrow UTXO:', err.message);
        throw err;
      }
    });
  }

  /**
   * Non-custodial read-only UTXO & CashTokens metadata query for Wallet UI.
   */
  async getAddressUtxos(cashaddr, forceTestnet = null) {
    const parts = splitCashAddresses(String(cashaddr || ''));
    const primaryAddr = parts[0] || String(cashaddr || '').trim();
    const parsed = parseCashAddress(primaryAddr, forceTestnet);
    if (!parsed) {
      throw new Error('Dirección BCH inválida');
    }

    const isChipnet = forceTestnet !== null ? Boolean(forceTestnet) : parsed.isTestnet;
    const activeProvider = isChipnet ? this.chipnetProvider : this.mainnetProvider;
    if (!activeProvider) {
      throw new Error(`Electrum provider no disponible para ${isChipnet ? 'chipnet' : 'mainnet'}`);
    }

    const pusdCat = String(this.getTokenCategory('PUSD', isChipnet) || '').toLowerCase();
    const musdCat = String(this.getTokenCategory('MUSD', isChipnet) || '').toLowerCase();
    const liftCat = String(this.getTokenCategory('LIFT', isChipnet) || '').toLowerCase();

    const pusdDec = config.bch.tokens.PUSD?.decimals ?? 6;
    const musdDec = config.bch.tokens.MUSD?.decimals ?? 6;
    const liftDec = config.bch.tokens.LIFT?.decimals ?? 2;

    const categoryMap = new Map();
    if (pusdCat) categoryMap.set(pusdCat, { symbol: 'PUSD', decimals: pusdDec });
    if (musdCat) categoryMap.set(musdCat, { symbol: 'MUSD', decimals: musdDec });
    if (liftCat) categoryMap.set(liftCat, { symbol: 'LIFT', decimals: liftDec });

    const seen = new Set();
    const utxos = [];
    const targetAddrs = parts.length > 0 ? parts : [parsed.baseAddress];
    const parsedAddrs = targetAddrs
      .map((part) => parseCashAddress(part, isChipnet))
      .filter(Boolean);

    // Query all HD receive addresses concurrently instead of looping sequentially
    const addressUtxoSets = await Promise.all(
      parsedAddrs.map(async (p) => {
        const rawUtxos = await this._withTimeout(
          activeProvider.getUtxos(p.baseAddress),
          5000,
          `Electrum getUtxos(${p.baseAddress})`
        );
        return { p, rawUtxos: rawUtxos || [] };
      })
    );

    for (const { p, rawUtxos } of addressUtxoSets) {
      for (const u of rawUtxos) {
        const key = `${u.txid}:${u.vout}`;
        if (seen.has(key)) continue;
        seen.add(key);

        let tokenInfo = null;
        let symbol = 'BCH';
        let decimals = 8;

        if (u.token) {
          const cat = String(u.token.category || '').toLowerCase();
          const matched = categoryMap.get(cat);
          symbol = matched ? matched.symbol : 'UNKNOWN';
          decimals = matched ? matched.decimals : 0;
          tokenInfo = {
            amount: u.token.amount !== undefined ? u.token.amount.toString() : '0',
            category: cat,
            ...(u.token.nft
              ? {
                  nft: {
                    capability: u.token.nft.capability,
                    commitment:
                      typeof u.token.nft.commitment === 'string'
                        ? u.token.nft.commitment
                        : binToHex(u.token.nft.commitment)
                  }
                }
              : {})
          };
        }

        utxos.push({
          txid: u.txid,
          vout: Number(u.vout),
          satoshis: Number(u.satoshis),
          address: p.baseAddress,
          token: tokenInfo,
          symbol,
          decimals
        });
      }
    }

    return {
      network: isChipnet ? 'testnet' : 'mainnet',
      address: parsed.baseAddress,
      tokenAddress: parsed.tokenAddress,
      tokensMeta: {
        PUSD: { symbol: 'PUSD', category: pusdCat, decimals: pusdDec },
        MUSD: { symbol: 'MUSD', category: musdCat, decimals: musdDec },
        LIFT: { symbol: 'LIFT', category: liftCat, decimals: liftDec }
      },
      utxos
    };
  }

  /**
   * Non-custodial Electrum transaction history for single or comma-separated HD BCH addresses.
   */
  async getAddressHistory(cashaddr, forceTestnet = null, limit = 20) {
    const parts = splitCashAddresses(String(cashaddr || ''));
    const primaryAddr = parts[0] || String(cashaddr || '').trim();
    const parsed = parseCashAddress(primaryAddr, forceTestnet);
    if (!parsed) {
      throw new Error('Dirección BCH inválida');
    }

    const isChipnet = forceTestnet !== null ? Boolean(forceTestnet) : parsed.isTestnet;
    const activeProvider = isChipnet ? this.chipnetProvider : this.mainnetProvider;
    if (!activeProvider) {
      throw new Error(`Electrum provider no disponible para ${isChipnet ? 'chipnet' : 'mainnet'}`);
    }

    const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 30));
    const parsedTargets = (parts.length > 0 ? parts : [parsed.baseAddress])
      .map((a) => parseCashAddress(a, isChipnet))
      .filter(Boolean);
    const selfBytecodes = new Set(parsedTargets.map((p) => p.bytecodeHex.toLowerCase()));

    const pusdCat = String(this.getTokenCategory('PUSD', isChipnet) || '').toLowerCase();
    const musdCat = String(this.getTokenCategory('MUSD', isChipnet) || '').toLowerCase();
    const liftCat = String(this.getTokenCategory('LIFT', isChipnet) || '').toLowerCase();
    const categoryMap = new Map();
    if (pusdCat) categoryMap.set(pusdCat, { symbol: 'PUSD', decimals: config.bch.tokens.PUSD?.decimals ?? 6 });
    if (musdCat) categoryMap.set(musdCat, { symbol: 'MUSD', decimals: config.bch.tokens.MUSD?.decimals ?? 6 });
    if (liftCat) categoryMap.set(liftCat, { symbol: 'LIFT', decimals: config.bch.tokens.LIFT?.decimals ?? 2 });

    const seenTx = new Map();
    const scripthashResults = await Promise.allSettled(
      parsedTargets.map(async (p) => {
        const scriptHash = Buffer.from(
          crypto.createHash('sha256').update(Buffer.from(p.bytecode)).digest()
        )
          .reverse()
          .toString('hex');
        return this._withTimeout(
          activeProvider.performRequest('blockchain.scripthash.get_history', scriptHash),
          4500,
          `Electrum get_history(${p.baseAddress})`
        );
      })
    );
    let fulfilledCount = 0;
    for (const res of scripthashResults) {
      if (res.status !== 'fulfilled') continue;
      fulfilledCount++;
      for (const item of Array.isArray(res.value) ? res.value : []) {
        if (item?.tx_hash && !seenTx.has(item.tx_hash)) {
          seenTx.set(item.tx_hash, item);
        }
      }
    }
    if (parsedTargets.length > 0 && fulfilledCount === 0) {
      throw new Error('Electrum scripthash history unreachable across all HD addresses');
    }

    const sorted = Array.from(seenTx.values())
      .sort((a, b) => {
        const ah = a.height <= 0 ? Number.MAX_SAFE_INTEGER : a.height;
        const bh = b.height <= 0 ? Number.MAX_SAFE_INTEGER : b.height;
        return bh - ah;
      })
      .slice(0, safeLimit);

    const txExplorerBase = isChipnet
      ? 'https://chipnet.imaginary.cash/tx'
      : 'https://3xpl.com/bitcoin-cash/transaction';

    // Deduplicate concurrent verbose tx lookups across outputs and input parents
    const txPromiseCache = new Map();
    const fetchVerboseTx = (txid) => {
      if (txPromiseCache.has(txid)) return txPromiseCache.get(txid);
      const p = this._withTimeout(
        activeProvider.performRequest('blockchain.transaction.get', txid, true),
        4500,
        `Electrum tx.get(${txid})`
      )
        .then((detail) => detail || null)
        .catch(() => null);
      txPromiseCache.set(txid, p);
      return p;
    };

    const rawVerboseTxs = await Promise.all(sorted.map((entry) => fetchVerboseTx(entry.tx_hash)));

    const items = await Promise.all(
      sorted.map(async (entry, idx) => {
        const tx = rawVerboseTxs[idx];
        if (!tx) return null;

        let outSatsSelf = 0n;
        let totalOutSats = 0n;
        const outTokensSelf = new Map();

        for (const vout of tx.vout || []) {
          const sats = BigInt(Math.round((Number(vout.value) || 0) * 100_000_000));
          totalOutSats += sats;
          const spkHex = String(vout.scriptPubKey?.hex || '').toLowerCase();
          if (selfBytecodes.has(spkHex)) {
            outSatsSelf += sats;
            if (vout.tokenData?.category) {
              const cat = String(vout.tokenData.category).toLowerCase();
              const amt = BigInt(vout.tokenData.amount || '0');
              outTokensSelf.set(cat, (outTokensSelf.get(cat) || 0n) + amt);
            }
          }
        }

        let inSatsSelf = 0n;
        let totalInSats = 0n;
        const inTokensSelf = new Map();
        let resolvedInputs = false;

        const vins = Array.isArray(tx.vin) ? tx.vin : [];
        if (vins.length > 0 && vins.length <= 12 && !vins[0]?.coinbase) {
          resolvedInputs = true;
          const prevTxs = await Promise.all(
            vins.map((vin) =>
              vin.txid && vin.vout !== undefined ? fetchVerboseTx(vin.txid) : Promise.resolve(null)
            )
          );
          for (let i = 0; i < vins.length; i++) {
            const vin = vins[i];
            if (!vin.txid || vin.vout === undefined) continue;
            const prevTx = prevTxs[i];
            const prevOut = prevTx?.vout?.[vin.vout];
            if (!prevOut) {
              resolvedInputs = false;
              continue;
            }
            const sats = BigInt(Math.round((Number(prevOut.value) || 0) * 100_000_000));
            totalInSats += sats;
            const spkHex = String(prevOut.scriptPubKey?.hex || '').toLowerCase();
            if (selfBytecodes.has(spkHex)) {
              inSatsSelf += sats;
              if (prevOut.tokenData?.category) {
                const cat = String(prevOut.tokenData.category).toLowerCase();
                const amt = BigInt(prevOut.tokenData.amount || '0');
                inTokensSelf.set(cat, (inTokensSelf.get(cat) || 0n) + amt);
              }
            }
          }
        }

        // Determine primary asset moved (CashToken takes precedence if net token delta != 0)
        let primarySymbol = 'BCH';
        let primaryDecimals = 8;
        let netSignedBase = outSatsSelf - inSatsSelf;

        const allCats = new Set([...outTokensSelf.keys(), ...inTokensSelf.keys()]);
        for (const cat of allCats) {
          const meta = categoryMap.get(cat);
          if (!meta) continue;
          const delta = (outTokensSelf.get(cat) || 0n) - (inTokensSelf.get(cat) || 0n);
          if (delta !== 0n || (inTokensSelf.get(cat) || 0n) > 0n) {
            primarySymbol = meta.symbol;
            primaryDecimals = meta.decimals;
            netSignedBase = delta !== 0n ? delta : -(inTokensSelf.get(cat) || 0n);
            break;
          }
        }

        let direction = 'in';
        if (resolvedInputs) {
          if (inSatsSelf > 0n && netSignedBase <= 0n) {
            direction = 'out';
          } else {
            direction = 'in';
          }
        } else {
          direction = outSatsSelf > 0n ? 'in' : 'out';
        }

        const absBase = netSignedBase < 0n ? -netSignedBase : netSignedBase;
        const amount = Number(absBase) / 10 ** primaryDecimals;
        const satsDelta = Number(outSatsSelf - inSatsSelf);
        const feeSats = resolvedInputs && totalInSats >= totalOutSats ? Number(totalInSats - totalOutSats) : undefined;
        const tsSec = Number(tx.time || tx.blocktime || 0);
        const height = Number(entry.height || 0);
        const confirmations = Number(tx.confirmations || (height > 0 ? 1 : 0));

        return {
          id: entry.tx_hash,
          txid: entry.tx_hash,
          type: direction === 'out' ? 'send' : 'receive',
          direction,
          symbol: primarySymbol,
          amount,
          satsDelta,
          status: height > 0 ? 'confirmed' : 'pending',
          timestamp: tsSec > 0 ? tsSec * 1000 : Date.now(),
          height,
          confirmations,
          feeSats,
          explorerUrl: `${txExplorerBase}/${entry.tx_hash}`
        };
      })
    );

    return {
      network: isChipnet ? 'testnet' : 'mainnet',
      address: parsed.baseAddress,
      items: items.filter(Boolean)
    };
  }
}

export const bchService = new BchService();
