import fs from 'fs';
import path from 'path';
import { ethers } from 'ethers';
import { config } from '../config.js';
import { db } from './db.js';
import { rpcPool } from './rpcPool.js';

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 value)'
];

class EvmService {
  constructor() {
    this.mainnetProvider = null;
    this.amoyProvider = null;
    this.amoyFallbackProviders = [];
    this.bscMainnetProvider = null;
    this.bscTestnetProvider = null;
    this.mainnetSigner = null;
    this.amoySigner = null;
    this.bscMainnetSigner = null;
    this.bscTestnetSigner = null;
    this.watchmanFormattedKey = null;
    this.watchmanAddress = config.evm.watchmanAddress || '0x143cA3A5116835d94573C700320B9FEdFf846eF9';
    this.vaultAbi = null;
    this.testnetUsdcAbi = null;
    this.testnetUsdtAbi = null;
    this.init();
  }

  init() {
    try {
      const vaultArtifactPath = path.join(config.contractsDir, 'evm/artifacts/BinaryLiquidVault.json');
      const usdcArtifactPath = path.join(config.contractsDir, 'evm/artifacts/TestnetUSDC.json');
      const usdtArtifactPath = path.join(config.contractsDir, 'evm/artifacts/TestnetUSDT.json');
      this.vaultAbi = JSON.parse(fs.readFileSync(vaultArtifactPath, 'utf8')).abi;
      this.testnetUsdcAbi = JSON.parse(fs.readFileSync(usdcArtifactPath, 'utf8')).abi;
      this.testnetUsdtAbi = fs.existsSync(usdtArtifactPath)
        ? JSON.parse(fs.readFileSync(usdtArtifactPath, 'utf8')).abi
        : this.testnetUsdcAbi;
    } catch (err) {
      console.error('[EVM Vault] Failed to load Solidity ABIs:', err.message);
    }

    const rawKey = config.evm.watchmanPrivateKey;
    const formattedKey = rawKey && rawKey.length >= 64
      ? (rawKey.startsWith('0x') ? rawKey : `0x${rawKey}`)
      : null;
    this.watchmanFormattedKey = formattedKey;

    // 1. Polygon Mainnet Provider (+ fallback pool with staticNetwork) & Watchman Gas Signer
    const mainnetUrls = Array.from(new Set([
      config.evm.rpcUrl,
      'https://polygon-bor-rpc.publicnode.com',
      'https://polygon.drpc.org',
      'https://1rpc.io/matic'
    ].filter(Boolean)));
    this.mainnetFallbackProviders = mainnetUrls.map(
      url => new ethers.JsonRpcProvider(url, 137, { staticNetwork: true, batchMaxCount: 1 })
    );
    try {
      this.mainnetProvider = this.mainnetFallbackProviders[0] || new ethers.JsonRpcProvider(config.evm.rpcUrl, 137, { staticNetwork: true });
      if (formattedKey) {
        this.mainnetSigner = new ethers.Wallet(formattedKey, this.mainnetProvider);
        this.watchmanAddress = this.mainnetSigner.address;
      }
    } catch (err) {
      console.warn('[EVM Mainnet] Init warning:', err.message);
    }

    // 2. Polygon Amoy (Testnet 80002) Provider (+ fallback pool sharing rpcPool healthy endpoints)
    const amoyUrls = Array.from(new Set([
      config.evm.amoyRpcUrl,
      ...rpcPool.evmPool.map(node => node.url)
    ].filter(url => url && !url.includes('rpc-amoy.polygon.technology'))));
    this.amoyFallbackProviders = amoyUrls.map(
      url => new ethers.JsonRpcProvider(url, 80002, { staticNetwork: true, batchMaxCount: 1 })
    );
    try {
      this.amoyProvider = this.amoyFallbackProviders[0] || new ethers.JsonRpcProvider(
        'https://polygon-amoy-bor-rpc.publicnode.com',
        80002,
        { staticNetwork: true, batchMaxCount: 1 }
      );
      if (formattedKey) {
        this.amoySigner = new ethers.Wallet(formattedKey, this.amoyProvider);
        console.log(
          `[EVM Amoy] 🛡️ Non-Custodial Vault: ${config.evm.amoyVaultAddress} (Watchman Signer: ${this.amoySigner.address})`
        );
      }
    } catch (err) {
      console.warn('[EVM Amoy] Init warning:', err.message);
    }

    // 3. BNB Smart Chain (BSC Mainnet) Provider (+ fallback pool)
    const bscMainnetUrls = Array.from(new Set([
      config.bsc?.rpcUrl,
      'https://bsc-rpc.publicnode.com',
      'https://bsc-dataseed.binance.org',
      'https://bsc.drpc.org'
    ].filter(Boolean)));
    this.bscMainnetFallbackProviders = bscMainnetUrls.map(
      url => new ethers.JsonRpcProvider(url, 56, { staticNetwork: true, batchMaxCount: 1 })
    );
    try {
      this.bscMainnetProvider = this.bscMainnetFallbackProviders[0];
      if (formattedKey) {
        this.bscMainnetSigner = new ethers.Wallet(formattedKey, this.bscMainnetProvider);
      }
    } catch (err) {
      console.warn('[BSC Mainnet] Init warning:', err.message);
    }

    // 4. BNB Smart Chain Testnet (Chapel) Provider (+ fallback pool)
    const bscTestnetUrls = Array.from(new Set([
      config.bsc?.testnetRpcUrl,
      'https://bsc-testnet-rpc.publicnode.com',
      'https://data-seed-prebsc-1-s1.binance.org:8545',
      'https://data-seed-prebsc-2-s1.binance.org:8545'
    ].filter(Boolean)));
    this.bscTestnetFallbackProviders = bscTestnetUrls.map(
      url => new ethers.JsonRpcProvider(url, 97, { staticNetwork: true, batchMaxCount: 1 })
    );
    try {
      this.bscTestnetProvider = this.bscTestnetFallbackProviders[0];
      if (formattedKey) {
        this.bscTestnetSigner = new ethers.Wallet(formattedKey, this.bscTestnetProvider);
        console.log(
          `[BSC Testnet] 🛡️ Vault: ${config.bsc?.vaultAddress || this.watchmanAddress} (Signer: ${this.bscTestnetSigner.address})`
        );
      }
    } catch (err) {
      console.warn('[BSC Testnet] Init warning:', err.message);
    }
  }

  isAmoyChain(chain = '') {
    const c = (chain || '').toLowerCase();
    return c.includes('amoy') || c.includes('testnet') || c.includes('80002') || c.includes('chapel') || c === '97';
  }

  isBscChain(chain = '') {
    const c = (chain || '').toLowerCase();
    return c.includes('bsc') || c.includes('bnb') || c.includes('binance') || c === '56' || c === '97' || c.includes('chapel');
  }

  getVaultAddress(chain = 'polygon_amoy') {
    if (this.isBscChain(chain)) {
      return this.isAmoyChain(chain)
        ? (config.bsc?.testnetVaultAddress || config.bsc?.vaultAddress || this.watchmanAddress)
        : (config.bsc?.vaultAddress || this.watchmanAddress);
    }
    if (this.isAmoyChain(chain)) {
      return config.evm.amoyVaultAddress;
    }
    return config.evm.mainnetVaultAddress || null;
  }

  async _withProviderFallback(providers, operationFn, timeoutMs = 4500) {
    let lastError = null;
    for (const provider of providers || []) {
      if (!provider) continue;
      try {
        return await Promise.race([
          operationFn(provider),
          new Promise((_, reject) => setTimeout(() => reject(new Error(`RPC Timeout > ${timeoutMs}ms`)), timeoutMs))
        ]);
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError || new Error('No healthy RPC provider available');
  }

  _getChainProviders(chain = 'polygon_amoy') {
    const isBsc = this.isBscChain(chain);
    const isAmoy = this.isAmoyChain(chain);
    if (isBsc) {
      return isAmoy ? this.bscTestnetFallbackProviders : this.bscMainnetFallbackProviders;
    }
    return isAmoy ? this.amoyFallbackProviders : this.mainnetFallbackProviders;
  }

  /**
   * Polygon validators enforce >= 25 Gwei tip cap; ethers v6 falls back to 1.5 Gwei if RPC omits it.
   */
  async _getPolygonFeeOverrides(provider) {
    const minTipWei = 30_000_000_000n;
    let tipWei = minTipWei;
    let gasFloorWei = minTipWei;

    try {
      const feeData = await Promise.race([
        provider.getFeeData(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('getFeeData timeout')), 3500))
      ]);
      if (feeData?.maxPriorityFeePerGas && feeData.maxPriorityFeePerGas > tipWei) {
        tipWei = feeData.maxPriorityFeePerGas;
      }
      if (feeData?.maxFeePerGas && feeData.maxFeePerGas > gasFloorWei) {
        gasFloorWei = feeData.maxFeePerGas;
      } else if (feeData?.gasPrice && feeData.gasPrice > gasFloorWei) {
        gasFloorWei = feeData.gasPrice;
      }
    } catch (_) {
      // Fallback to 30 Gwei floor
    }

    const maxFeePerGas = gasFloorWei > tipWei * 2n ? gasFloorWei : tipWei * 2n;
    return { maxPriorityFeePerGas: tipWei, maxFeePerGas };
  }

  /**
   * Broadcasts once across fallback providers (never double-broadcasts after tx.hash exists),
   * then waits for confirmation with provider fallback if the broadcast node drops.
   */
  async _executeWriteWithFallback(providers, submitFn) {
    if (!this.watchmanFormattedKey) {
      throw new Error('Watchman EVM private key not configured');
    }
    const list = (providers || []).filter(Boolean);
    if (list.length === 0) {
      throw new Error('No healthy EVM RPC providers available');
    }

    let submittedTx = null;
    let broadcastProvider = null;
    let lastError = null;

    for (const provider of list) {
      try {
        const signer = new ethers.Wallet(this.watchmanFormattedKey, provider);
        submittedTx = await submitFn(signer, provider);
        broadcastProvider = provider;
        break;
      } catch (err) {
        lastError = err;
        // Do not retry non-RPC revert/validation errors (except underpriced/rpc issues)
        const msg = String(err?.message || '').toLowerCase();
        const isRevertOrAuth =
          err?.code === 'CALL_EXCEPTION' &&
          !msg.includes('503') &&
          !msg.includes('timeout') &&
          !msg.includes('missing revert data');
        if (isRevertOrAuth) {
          throw err;
        }
      }
    }

    if (!submittedTx) {
      throw lastError || new Error('All EVM RPC providers failed to broadcast transaction');
    }

    try {
      return await submittedTx.wait(1);
    } catch (waitErr) {
      for (const provider of list) {
        if (provider === broadcastProvider) continue;
        try {
          const receipt = await provider.waitForTransaction(submittedTx.hash, 1, 25000);
          if (receipt) return receipt;
        } catch (_) {}
      }
      throw waitErr;
    }
  }

  getDepositAddress(chain = 'polygon_amoy') {
    return this.getVaultAddress(chain);
  }

  getTokenConfig(tokenSymbol = 'USDC', chain = 'polygon_amoy') {
    const sym = (tokenSymbol || 'USDC').toUpperCase();
    if (this.isBscChain(chain)) {
      const isTest = this.isAmoyChain(chain);
      return isTest
        ? (config.bsc?.testnetTokens?.[sym] || config.bsc?.tokens?.[sym])
        : config.bsc?.tokens?.[sym];
    }
    if (this.isAmoyChain(chain)) {
      return config.evm.amoyTokens?.[sym] || config.evm.tokens[sym];
    }
    return config.evm.tokens[sym];
  }

  async getBalances() {
    const balances = {
      mainnet: {
        native: 0.0,
        USDC: 0.0,
        USDT: 0.0,
        vaultAddress: config.evm.mainnetVaultAddress || null
      },
      amoy: {
        native: 0.0,
        USDT: 0.0,
        USDC: 0.0,
        vaultAddress: config.evm.amoyVaultAddress
      }
    };

    if (this.mainnetFallbackProviders.length > 0 && this.watchmanAddress) {
      try {
        await this._withProviderFallback(this.mainnetFallbackProviders, async provider => {
          const nativeWei = await provider.getBalance(this.watchmanAddress);
          balances.mainnet.native = parseFloat(ethers.formatEther(nativeWei)) || 0.0;

          const targetHolder = config.evm.mainnetVaultAddress || this.watchmanAddress;
          const usdcToken = config.evm.tokens.USDC;
          if (usdcToken?.address) {
            const contract = new ethers.Contract(usdcToken.address, ERC20_ABI, provider);
            const raw = await contract.balanceOf(targetHolder);
            balances.mainnet.USDC = parseFloat(ethers.formatUnits(raw, usdcToken.decimals)) || 0.0;
          }
        });
      } catch (e) {
        console.warn('[EVM Mainnet] Balance query warning:', e.message);
      }
    }

    if (this.amoyFallbackProviders.length > 0 && config.evm.amoyVaultAddress) {
      try {
        await this._withProviderFallback(this.amoyFallbackProviders, async provider => {
          const nativeWei = await provider.getBalance(this.watchmanAddress);
          balances.amoy.native = parseFloat(ethers.formatEther(nativeWei)) || 0.0;

          const amoyUsdt = config.evm.amoyTokens?.USDT;
          if (amoyUsdt?.address) {
            const usdtContract = new ethers.Contract(amoyUsdt.address, ERC20_ABI, provider);
            const rawUsdt = await usdtContract.balanceOf(config.evm.amoyVaultAddress);
            balances.amoy.USDT = parseFloat(ethers.formatUnits(rawUsdt, amoyUsdt.decimals)) || 0.0;
          }

          const amoyUsdc = config.evm.amoyTokens?.USDC;
          if (amoyUsdc?.address) {
            const contract = new ethers.Contract(amoyUsdc.address, ERC20_ABI, provider);
            const raw = await contract.balanceOf(config.evm.amoyVaultAddress);
            balances.amoy.USDC = parseFloat(ethers.formatUnits(raw, amoyUsdc.decimals)) || 0.0;
          }
        });
      } catch (e) {
        console.warn('[EVM Amoy] Balance query warning:', e.message);
      }
    }

    return balances;
  }

  /**
   * Cryptographically verifies on-chain deposit into `BinaryLiquidVault.sol`:
   * Accepts either `BridgeDepositInitiated` event OR direct ERC-20 `Transfer(user -> vaultAddress)` log!
   */
  async verifyDeposit(txHash, expectedAmount, tokenSymbol = 'USDC', depositAddress = null, chain = 'polygon_amoy') {
    const isBsc = this.isBscChain(chain);
    const isAmoy = this.isAmoyChain(chain);
    const providers = this._getChainProviders(chain);
    const networkName = isBsc
      ? (isAmoy ? 'BNB Smart Chain (Testnet)' : 'BNB Smart Chain (Mainnet)')
      : (isAmoy ? 'Polygon Amoy (Testnet)' : 'Polygon Mainnet');
    const targetVault = (depositAddress || this.getVaultAddress(chain)).toLowerCase();
    const tokenCfg = this.getTokenConfig(tokenSymbol, chain);
    const decimals = tokenCfg?.decimals || (isBsc ? 18 : 6);

    if (!txHash || txHash.trim().length < 20) {
      return {
        verified: false,
        reason: `Por favor proporciona el Hash de Transacción (0x...) de tu depósito al Smart Contract Vault (${targetVault})`
      };
    }

    const cleanHash = txHash.trim();
    if (!providers || providers.length === 0) {
      return { verified: false, reason: `Proveedor RPC no disponible para ${networkName}` };
    }

    try {
      if (!Number.isFinite(Number(expectedAmount)) || Number(expectedAmount) <= 0) {
        return { verified: false, reason: `Monto esperado inválido (${expectedAmount})` };
      }

      if (!tokenCfg?.address) {
        return { verified: false, reason: `Token ${tokenSymbol} no configurado en ${networkName}` };
      }
      const expectedTokenAddr = tokenCfg.address.toLowerCase();

      const receipt = await this._withProviderFallback(
        providers,
        provider => provider.getTransactionReceipt(cleanHash),
        6000
      );
      if (!receipt || receipt.status !== 1) {
        return { verified: false, reason: `Transacción no confirmada o revertida en ${networkName}` };
      }

      const vaultIface = this.vaultAbi ? new ethers.Interface(this.vaultAbi) : null;
      const erc20Iface = new ethers.Interface(ERC20_ABI);

      let verifiedAmount = 0;
      let onChainDepositId = null;
      let senderAddress = receipt.from ? String(receipt.from).toLowerCase() : null;

      for (const log of receipt.logs) {
        // Check 1: Native Vault `BridgeDepositInitiated` / `BridgeDepositToChainInitiated` event
        if (vaultIface && log.address.toLowerCase() === targetVault) {
          try {
            const parsed = vaultIface.parseLog(log);
            const eventToken = parsed?.args?.token ? String(parsed.args.token).toLowerCase() : null;
            if (
              parsed &&
              (parsed.name === 'BridgeDepositInitiated' || parsed.name === 'BridgeDepositToChainInitiated') &&
              eventToken === expectedTokenAddr
            ) {
              onChainDepositId = parsed.args.depositId;
              const rawEventAmount = parsed.args.netAmount ?? parsed.args.grossAmount ?? parsed.args.amount;
              if (rawEventAmount !== undefined) {
                verifiedAmount = parseFloat(ethers.formatUnits(rawEventAmount, decimals));
              }
              if (parsed.args.sender) {
                senderAddress = String(parsed.args.sender).toLowerCase();
              }
              break;
            }
          } catch (_) {
            // Ignore non-matching log
          }
        }

        // Check 2: Standard ERC-20 `Transfer(from, vaultAddress, value)` strictly from expected token contract
        if (log.address && log.address.toLowerCase() === expectedTokenAddr) {
          try {
            const parsedTransfer = erc20Iface.parseLog(log);
            if (
              parsedTransfer &&
              parsedTransfer.name === 'Transfer' &&
              parsedTransfer.args.to.toLowerCase() === targetVault
            ) {
              const amt = parseFloat(ethers.formatUnits(parsedTransfer.args.value, decimals));
              if (amt > verifiedAmount) {
                verifiedAmount = amt;
              }
              if (parsedTransfer.args.from) {
                senderAddress = String(parsedTransfer.args.from).toLowerCase();
              }
            }
          } catch (_) {
            // Ignore non-ERC20 log
          }
        }
      }

      if (verifiedAmount <= 0) {
        return {
          verified: false,
          reason: `La transacción ${cleanHash.slice(0, 12)}... no transfirió fondos al Smart Contract Vault (${targetVault})`
        };
      }

      if (verifiedAmount < Number(expectedAmount) * 0.99) {
        return {
          verified: false,
          reason: `Monto depositado en el Vault (${verifiedAmount} ${tokenSymbol}) menor al requerido (${expectedAmount} ${tokenSymbol})`
        };
      }

      return {
        verified: true,
        onChain: true,
        nonCustodial: true,
        amount: verifiedAmount,
        sender: senderAddress,
        depositId: onChainDepositId,
        txHash: cleanHash,
        blockNumber: receipt.blockNumber
      };
    } catch (err) {
      console.warn(`[EVM ${networkName}] Receipt verification error:`, err.message);
      return { verified: false, reason: `Error verificando recibo en ${networkName}: ${err.message}` };
    }
  }

  /**
   * Executes a 100% Non-Custodial ERC-20 release from `BinaryLiquidVault.sol` using The Watchman's ECDSA proof!
   */
  async releaseFromVault({
    bchTxHashBytes32,
    recipientAddress,
    amount,
    tokenSymbol = 'USDC',
    chain = 'polygon_amoy',
    nonce,
    watchmanSignature
  }) {
    const rawRecipient = (recipientAddress || '').trim().toLowerCase();
    if (!ethers.isAddress(rawRecipient)) {
      throw new Error(`Dirección EVM de destino inválida: ${recipientAddress}`);
    }
    const cleanRecipient = ethers.getAddress(rawRecipient);

    // Direct payout for BNB Smart Chain (BEP-20)
    if (this.isBscChain(chain)) {
      const isTest = this.isAmoyChain(chain);
      const activeSigner = isTest ? this.bscTestnetSigner : this.bscMainnetSigner;
      const activeExplorer = isTest ? 'https://testnet.bscscan.com' : 'https://bscscan.com';
      const networkName = isTest ? 'BNB Smart Chain (Testnet)' : 'BNB Smart Chain (Mainnet)';
      const tokenConfig = this.getTokenConfig(tokenSymbol, chain);
      const decimals = tokenConfig?.decimals || 18;

      if (!activeSigner) {
        throw new Error(`[BSC Payout] Signer no inicializado para ${networkName}`);
      }
      if (!tokenConfig?.address) {
        throw new Error(`Token ${tokenSymbol} no configurado en ${networkName}`);
      }

      const parsedAmount = ethers.parseUnits(Number(amount).toFixed(Math.min(decimals, 6)), decimals);
      console.log(`[BSC Vault] 🛡️ Transferring ${amount} ${tokenSymbol} directly -> ${cleanRecipient} on ${networkName}...`);
      const txReceipt = await this._executeWriteWithFallback(
        this._getChainProviders(chain),
        signer => {
          const tokenContract = new ethers.Contract(tokenConfig.address, ERC20_ABI, signer);
          return tokenContract.transfer(cleanRecipient, parsedAmount);
        }
      );

      console.log(`[BSC Vault] ✅ BEP-20 transfer confirmed! TX: ${txReceipt.hash}`);
      db.updateLiquidity(`bsc_${tokenSymbol.toLowerCase()}`, -Number(amount));

      return {
        success: true,
        onChain: true,
        nonCustodial: true,
        vaultAddress: this.getVaultAddress(chain),
        txHash: txReceipt.hash,
        explorerUrl: `${activeExplorer}/tx/${txReceipt.hash}`,
        blockNumber: txReceipt.blockNumber
      };
    }

    const isAmoy = this.isAmoyChain(chain);
    const activeExplorer = isAmoy ? (config.evm.amoyExplorerUrl || 'https://amoy.polygonscan.com') : config.evm.explorerUrl;
    const networkName = isAmoy ? 'Polygon Amoy (Testnet)' : 'Polygon Mainnet';
    const vaultAddress = this.getVaultAddress(chain);
    const tokenConfig = this.getTokenConfig(tokenSymbol, chain);
    const providers = this._getChainProviders(chain);

    if (!this.watchmanFormattedKey || !providers.length || !vaultAddress || !this.vaultAbi) {
      throw new Error(`[EVM Vault] Smart Contract Vault no inicializado para ${networkName}`);
    }
    if (!tokenConfig?.address) {
      throw new Error(`Token ${tokenSymbol} no configurado en ${networkName}`);
    }

    const parsedAmount = ethers.parseUnits(Number(amount).toFixed(tokenConfig.decimals), tokenConfig.decimals);

    try {
      console.log(
        `[EVM Vault] 🛡️ Releasing ${amount} ${tokenSymbol} from BinaryLiquidVault (${vaultAddress}) -> ${cleanRecipient} on ${networkName}...`
      );
      const txReceipt = await this._executeWriteWithFallback(providers, async (signer, provider) => {
        const vaultContract = new ethers.Contract(vaultAddress, this.vaultAbi, signer);
        const overrides = await this._getPolygonFeeOverrides(provider);
        return vaultContract.release(
          bchTxHashBytes32,
          cleanRecipient,
          tokenConfig.address,
          parsedAmount,
          nonce,
          watchmanSignature,
          overrides
        );
      });

      console.log(`[EVM Vault] ✅ Smart Contract release confirmed! TX: ${txReceipt.hash}`);
      db.markTxHashConsumed(txReceipt.hash, {
        module: 'EVM_VAULT_RELEASE',
        recipient: cleanRecipient,
        amount: Number(amount),
        tokenSymbol,
        chain
      });
      db.updateLiquidity(`evm_${tokenSymbol.toLowerCase()}`, -Number(amount));

      return {
        success: true,
        onChain: true,
        nonCustodial: true,
        vaultAddress,
        txHash: txReceipt.hash,
        explorerUrl: `${activeExplorer}/tx/${txReceipt.hash}`,
        blockNumber: txReceipt.blockNumber
      };
    } catch (err) {
      console.error(`[EVM Vault] ❌ Smart Contract release error on ${networkName}:`, err.message);
      throw new Error(`Fallo en liberación del Smart Contract Vault (${networkName}): ${err.message}`);
    }
  }

  /**
   * Marks an EVM -> destination `depositId` settled on-chain once destination vault releases funds
   */
  async markDepositSettled(depositId, bchPayoutTxHash, chain = 'polygon_amoy') {
    if (!depositId || !bchPayoutTxHash) return null;
    try {
      const providers = this._getChainProviders(chain);
      const vaultAddress = this.getVaultAddress(chain);
      if (!this.watchmanFormattedKey || !providers.length || !vaultAddress || !this.vaultAbi) return null;

      const rawHash = String(bchPayoutTxHash).trim();
      const cleanBchHash = /^(0x)?[0-9a-fA-F]{64}$/.test(rawHash)
        ? (rawHash.startsWith('0x') ? rawHash : `0x${rawHash}`)
        : ethers.id(rawHash);

      const receipt = await this._executeWriteWithFallback(providers, async (signer, provider) => {
        const vaultContract = new ethers.Contract(vaultAddress, this.vaultAbi, signer);
        const overrides = this.isBscChain(chain) ? {} : await this._getPolygonFeeOverrides(provider);
        return vaultContract.markDepositCompleted(depositId, cleanBchHash, overrides);
      });
      return receipt.hash;
    } catch (err) {
      console.warn('[EVM Vault] markDepositSettled warning:', err.message);
      return null;
    }
  }

  /**
   * Real On-Chain Testnet Faucet: Calls `TestnetUSDT.faucet(recipient, amount)` on Polygon Amoy!
   */
  async dispenseTestnetErc20(recipientAddress, tokenSymbol = 'USDT', amount = 100) {
    const sym = (tokenSymbol || 'USDT').toUpperCase();
    const rawRecipient = (recipientAddress || '').trim().toLowerCase();
    if (!ethers.isAddress(rawRecipient)) {
      throw new Error(`Ingresa una dirección EVM válida (0x...) para recibir Testnet ${sym} en Polygon Amoy`);
    }
    const abi = sym === 'USDT' ? (this.testnetUsdtAbi || this.testnetUsdcAbi) : this.testnetUsdcAbi;
    if (!this.watchmanFormattedKey || !this.amoyFallbackProviders.length || !abi) {
      throw new Error('Polygon Amoy Faucet signer no disponible');
    }

    const tokenCfg = config.evm.amoyTokens[sym];
    if (!tokenCfg?.address) {
      throw new Error(`Token ${sym} no disponible en Polygon Amoy Testnet`);
    }

    const cleanRecipient = ethers.getAddress(rawRecipient);
    const cappedAmount = Math.min(Math.max(Number(amount) || 100, 1), 1000);
    const parsedAmount = ethers.parseUnits(cappedAmount.toFixed(tokenCfg.decimals || 6), tokenCfg.decimals || 6);

    const receipt = await this._executeWriteWithFallback(this.amoyFallbackProviders, async (signer, provider) => {
      const tokenContract = new ethers.Contract(tokenCfg.address, abi, signer);
      const overrides = await this._getPolygonFeeOverrides(provider);
      return tokenContract.faucet(cleanRecipient, parsedAmount, overrides);
    });

    return {
      success: true,
      onChain: true,
      token: sym,
      network: 'Polygon Amoy (Chain ID 80002)',
      amount: cappedAmount,
      recipient: cleanRecipient,
      tokenAddress: tokenCfg.address,
      txHash: receipt.hash,
      explorerUrl: `https://amoy.polygonscan.com/tx/${receipt.hash}`
    };
  }

  async dispenseTestnetUsdt(recipientAddress, amount = 100) {
    return this.dispenseTestnetErc20(recipientAddress, 'USDT', amount);
  }

  async dispenseTestnetUsdc(recipientAddress, amount = 100) {
    return this.dispenseTestnetErc20(recipientAddress, 'USDC', amount);
  }

  /**
   * Queries real live native POL + ERC-20 (USDT, USDC) balances on Polygon Amoy or Polygon Mainnet.
   */
  async getAddressBalances(evmAddress, isTestnet = true) {
    const emptyResult = {
      POL: 0,
      USDT: 0,
      USDC: 0,
      BNB: 0,
      USDT_BSC: 0,
      network: isTestnet ? 'amoy' : 'polygon',
      chainId: isTestnet ? 80002 : 137,
      address: null,
      rpcDegraded: false
    };

    if (!evmAddress || !ethers.isAddress(evmAddress.trim().toLowerCase())) {
      return emptyResult;
    }

    const cleanAddr = ethers.getAddress(evmAddress.trim().toLowerCase());
    if (cleanAddr === ethers.ZeroAddress) {
      return { ...emptyResult, address: cleanAddr };
    }

    const result = { ...emptyResult, address: cleanAddr };
    const tokenMap = isTestnet ? config.evm.amoyTokens : config.evm.tokens;

    const runPolygonQuery = (provider) => {
      const queries = [
        provider.getBalance(cleanAddr).then(w => {
          result.POL = parseFloat(ethers.formatEther(w)) || 0;
        })
      ];
      if (tokenMap?.USDT?.address) {
        const usdtContract = new ethers.Contract(tokenMap.USDT.address, ERC20_ABI, provider);
        queries.push(
          usdtContract.balanceOf(cleanAddr).then(raw => {
            result.USDT = parseFloat(ethers.formatUnits(raw, tokenMap.USDT.decimals || 6)) || 0;
          })
        );
      }
      if (tokenMap?.USDC?.address) {
        const usdcContract = new ethers.Contract(tokenMap.USDC.address, ERC20_ABI, provider);
        queries.push(
          usdcContract.balanceOf(cleanAddr).then(raw => {
            result.USDC = parseFloat(ethers.formatUnits(raw, tokenMap.USDC.decimals || 6)) || 0;
          })
        );
      }
      return Promise.all(queries);
    };

    const bscProviders = isTestnet ? this.bscTestnetFallbackProviders : this.bscMainnetFallbackProviders;
    const bscTokens = isTestnet ? config.bsc?.testnetTokens : config.bsc?.tokens;
    const runBscQuery = (provider) => {
      const queries = [
        provider.getBalance(cleanAddr).then(w => {
          result.BNB = parseFloat(ethers.formatEther(w)) || 0;
        })
      ];
      if (bscTokens?.USDT?.address) {
        const bscUsdtContract = new ethers.Contract(bscTokens.USDT.address, ERC20_ABI, provider);
        queries.push(
          bscUsdtContract.balanceOf(cleanAddr).then(raw => {
            result.USDT_BSC = parseFloat(ethers.formatUnits(raw, bscTokens.USDT.decimals || 18)) || 0;
          })
        );
      }
      return Promise.all(queries);
    };

    const [polySettled, bscSettled] = await Promise.allSettled([
      isTestnet
        ? rpcPool.execute(runPolygonQuery)
        : this._withProviderFallback(this.mainnetFallbackProviders, runPolygonQuery),
      this._withProviderFallback(bscProviders, runBscQuery)
    ]);

    if (polySettled.status === 'rejected') {
      result.rpcDegraded = true;
      console.warn(`[EVM Wallet Balance] Polygon ${isTestnet ? 'Amoy' : 'Mainnet'} RPC warning:`, polySettled.reason?.message);
    }
    if (bscSettled.status === 'rejected') {
      result.rpcDegraded = true;
      console.warn(`[EVM Wallet Balance] BSC ${isTestnet ? 'Testnet' : 'Mainnet'} RPC warning:`, bscSettled.reason?.message);
    }

    return result;
  }
}

export const evmService = new EvmService();
