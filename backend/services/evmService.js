import fs from 'fs';
import path from 'path';
import { ethers } from 'ethers';
import { config } from '../config.js';
import { db } from './db.js';

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
    this.mainnetSigner = null;
    this.amoySigner = null;
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

    // 1. Polygon Mainnet Provider & Watchman Gas Signer
    try {
      this.mainnetProvider = new ethers.JsonRpcProvider(config.evm.rpcUrl);
      if (formattedKey) {
        this.mainnetSigner = new ethers.Wallet(formattedKey, this.mainnetProvider);
        this.watchmanAddress = this.mainnetSigner.address;
      }
    } catch (err) {
      console.warn('[EVM Mainnet] Init warning:', err.message);
    }

    // 2. Polygon Amoy (Testnet 80002) Provider & Watchman Gas Signer
    try {
      this.amoyProvider = new ethers.JsonRpcProvider(
        config.evm.amoyRpcUrl || 'https://polygon-amoy-bor-rpc.publicnode.com'
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
  }

  isAmoyChain(chain = '') {
    const c = (chain || '').toLowerCase();
    return c.includes('amoy') || c.includes('testnet') || c.includes('80002');
  }

  getVaultAddress(chain = 'polygon_amoy') {
    if (this.isAmoyChain(chain)) {
      return config.evm.amoyVaultAddress;
    }
    return config.evm.mainnetVaultAddress || config.evm.amoyVaultAddress;
  }

  getDepositAddress(chain = 'polygon_amoy') {
    return this.getVaultAddress(chain);
  }

  getTokenConfig(tokenSymbol = 'USDC', chain = 'polygon_amoy') {
    const sym = (tokenSymbol || 'USDC').toUpperCase();
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

    if (this.mainnetProvider && this.watchmanAddress) {
      try {
        const nativeWei = await this.mainnetProvider.getBalance(this.watchmanAddress);
        balances.mainnet.native = parseFloat(ethers.formatEther(nativeWei)) || 0.0;

        const targetHolder = config.evm.mainnetVaultAddress || this.watchmanAddress;
        const usdcToken = config.evm.tokens.USDC;
        if (usdcToken?.address) {
          const contract = new ethers.Contract(usdcToken.address, ERC20_ABI, this.mainnetProvider);
          const raw = await contract.balanceOf(targetHolder);
          balances.mainnet.USDC = parseFloat(ethers.formatUnits(raw, usdcToken.decimals)) || 0.0;
        }
      } catch (e) {
        console.warn('[EVM Mainnet] Balance query warning:', e.message);
      }
    }

    if (this.amoyProvider && config.evm.amoyVaultAddress) {
      try {
        const nativeWei = await this.amoyProvider.getBalance(this.watchmanAddress);
        balances.amoy.native = parseFloat(ethers.formatEther(nativeWei)) || 0.0;

        const amoyUsdt = config.evm.amoyTokens?.USDT;
        if (amoyUsdt?.address) {
          const usdtContract = new ethers.Contract(amoyUsdt.address, ERC20_ABI, this.amoyProvider);
          const rawUsdt = await usdtContract.balanceOf(config.evm.amoyVaultAddress);
          balances.amoy.USDT = parseFloat(ethers.formatUnits(rawUsdt, amoyUsdt.decimals)) || 0.0;
        }

        const amoyUsdc = config.evm.amoyTokens?.USDC;
        if (amoyUsdc?.address) {
          const contract = new ethers.Contract(amoyUsdc.address, ERC20_ABI, this.amoyProvider);
          const raw = await contract.balanceOf(config.evm.amoyVaultAddress);
          balances.amoy.USDC = parseFloat(ethers.formatUnits(raw, amoyUsdc.decimals)) || 0.0;
        }
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
    const isAmoy = this.isAmoyChain(chain);
    const activeProvider = isAmoy ? this.amoyProvider : this.mainnetProvider;
    const networkName = isAmoy ? 'Polygon Amoy (Testnet)' : 'Polygon Mainnet';
    const targetVault = (depositAddress || this.getVaultAddress(chain)).toLowerCase();
    const tokenCfg = this.getTokenConfig(tokenSymbol, chain);
    const decimals = tokenCfg?.decimals || 6;

    if (!txHash || txHash.trim().length < 20) {
      return {
        verified: false,
        reason: `Por favor proporciona el Hash de Transacción (0x...) de tu depósito al Smart Contract Vault (${targetVault})`
      };
    }

    const cleanHash = txHash.trim();
    if (!activeProvider) {
      return { verified: false, reason: `Proveedor RPC no disponible para ${networkName}` };
    }

    try {
      const receipt = await activeProvider.getTransactionReceipt(cleanHash);
      if (!receipt || receipt.status !== 1) {
        return { verified: false, reason: `Transacción no confirmada o revertida en ${networkName}` };
      }

      const vaultIface = this.vaultAbi ? new ethers.Interface(this.vaultAbi) : null;
      const erc20Iface = new ethers.Interface(ERC20_ABI);

      let verifiedAmount = 0;
      let onChainDepositId = null;

      for (const log of receipt.logs) {
        // Check 1: Native Vault `BridgeDepositInitiated` event
        if (vaultIface && log.address.toLowerCase() === targetVault) {
          try {
            const parsed = vaultIface.parseLog(log);
            if (parsed && parsed.name === 'BridgeDepositInitiated') {
              onChainDepositId = parsed.args.depositId;
              verifiedAmount = parseFloat(ethers.formatUnits(parsed.args.amount, decimals));
              break;
            }
          } catch (_) {
            // Ignore non-matching log
          }
        }

        // Check 2: Standard ERC-20 `Transfer(from, vaultAddress, value)`
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
          }
        } catch (_) {
          // Ignore non-ERC20 log
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

    const isAmoy = this.isAmoyChain(chain);
    const activeSigner = isAmoy ? this.amoySigner : this.mainnetSigner;
    const activeExplorer = isAmoy ? (config.evm.amoyExplorerUrl || 'https://amoy.polygonscan.com') : config.evm.explorerUrl;
    const networkName = isAmoy ? 'Polygon Amoy (Testnet)' : 'Polygon Mainnet';
    const vaultAddress = this.getVaultAddress(chain);
    const tokenConfig = this.getTokenConfig(tokenSymbol, chain);

    if (!activeSigner || !vaultAddress || !this.vaultAbi) {
      throw new Error(`[EVM Vault] Smart Contract Vault no inicializado para ${networkName}`);
    }
    if (!tokenConfig?.address) {
      throw new Error(`Token ${tokenSymbol} no configurado en ${networkName}`);
    }

    const parsedAmount = ethers.parseUnits(Number(amount).toFixed(tokenConfig.decimals), tokenConfig.decimals);
    const vaultContract = new ethers.Contract(vaultAddress, this.vaultAbi, activeSigner);

    try {
      console.log(
        `[EVM Vault] 🛡️ Releasing ${amount} ${tokenSymbol} from BinaryLiquidVault (${vaultAddress}) -> ${cleanRecipient} on ${networkName}...`
      );
      const tx = await vaultContract.release(
        bchTxHashBytes32,
        cleanRecipient,
        tokenConfig.address,
        parsedAmount,
        nonce,
        watchmanSignature
      );
      const txReceipt = await tx.wait(1);

      console.log(`[EVM Vault] ✅ Smart Contract release confirmed! TX: ${txReceipt.hash}`);
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
   * Marks an EVM -> BCH `depositId` settled on-chain once the BCH Covenant releases CashTokens
   */
  async markDepositSettled(depositId, bchPayoutTxHash, chain = 'polygon_amoy') {
    if (!depositId) return null;
    try {
      const isAmoy = this.isAmoyChain(chain);
      const activeSigner = isAmoy ? this.amoySigner : this.mainnetSigner;
      const vaultAddress = this.getVaultAddress(chain);
      if (!activeSigner || !vaultAddress || !this.vaultAbi) return null;

      const cleanBchHash = bchPayoutTxHash.startsWith('0x')
        ? bchPayoutTxHash
        : `0x${bchPayoutTxHash.padStart(64, '0')}`;
      const vaultContract = new ethers.Contract(vaultAddress, this.vaultAbi, activeSigner);
      const tx = await vaultContract.markDepositCompleted(depositId, cleanBchHash);
      const receipt = await tx.wait(1);
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
    if (!this.amoySigner || !abi) {
      throw new Error('Polygon Amoy Faucet signer no disponible');
    }

    const tokenCfg = config.evm.amoyTokens[sym];
    if (!tokenCfg?.address) {
      throw new Error(`Token ${sym} no disponible en Polygon Amoy Testnet`);
    }

    const cleanRecipient = ethers.getAddress(rawRecipient);
    const cappedAmount = Math.min(Math.max(Number(amount) || 100, 1), 1000);
    const parsedAmount = ethers.parseUnits(cappedAmount.toFixed(tokenCfg.decimals || 6), tokenCfg.decimals || 6);

    const tokenContract = new ethers.Contract(tokenCfg.address, abi, this.amoySigner);
    const tx = await tokenContract.faucet(cleanRecipient, parsedAmount);
    const receipt = await tx.wait(1);

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
    if (!evmAddress || !ethers.isAddress(evmAddress.trim().toLowerCase())) {
      return { POL: 0, USDT: 0, USDC: 0, network: isTestnet ? 'amoy' : 'polygon' };
    }

    const cleanAddr = ethers.getAddress(evmAddress.trim().toLowerCase());
    const provider = isTestnet ? this.amoyProvider : this.mainnetProvider;
    const tokenMap = isTestnet ? config.evm.amoyTokens : config.evm.tokens;

    if (!provider) {
      return { POL: 0, USDT: 0, USDC: 0, network: isTestnet ? 'amoy' : 'polygon' };
    }

    const result = {
      POL: 0,
      USDT: 0,
      USDC: 0,
      network: isTestnet ? 'amoy' : 'polygon',
      chainId: isTestnet ? 80002 : 137,
      address: cleanAddr
    };

    try {
      const promises = [
        provider.getBalance(cleanAddr).then(w => {
          result.POL = parseFloat(ethers.formatEther(w)) || 0;
        }).catch(() => {})
      ];

      if (tokenMap?.USDT?.address) {
        const usdtContract = new ethers.Contract(tokenMap.USDT.address, ERC20_ABI, provider);
        promises.push(
          usdtContract.balanceOf(cleanAddr).then(raw => {
            result.USDT = parseFloat(ethers.formatUnits(raw, tokenMap.USDT.decimals || 6)) || 0;
          }).catch(() => {})
        );
      }

      if (tokenMap?.USDC?.address) {
        const usdcContract = new ethers.Contract(tokenMap.USDC.address, ERC20_ABI, provider);
        promises.push(
          usdcContract.balanceOf(cleanAddr).then(raw => {
            result.USDC = parseFloat(ethers.formatUnits(raw, tokenMap.USDC.decimals || 6)) || 0;
          }).catch(() => {})
        );
      }

      await Promise.all(promises);
    } catch (err) {
      console.warn('[EVM Wallet Balance] Query warning:', err.message);
    }

    return result;
  }
}

export const evmService = new EvmService();
