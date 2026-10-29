import { ethers } from 'ethers';
import { config } from '../config.js';
import { db } from './db.js';

// Standard ERC-20 ABI
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
    this.mainnetWallet = null;
    this.amoyWallet = null;
    this.hotWalletAddress = config.evm.hotWalletAddress || '';
    this.init();
  }

  init() {
    // 1. Initialize Mainnet Provider & Wallet
    try {
      this.mainnetProvider = new ethers.JsonRpcProvider(config.evm.rpcUrl);
      if (config.evm.hotWalletPrivateKey && config.evm.hotWalletPrivateKey.length >= 64) {
        const key = config.evm.hotWalletPrivateKey.startsWith('0x')
          ? config.evm.hotWalletPrivateKey
          : `0x${config.evm.hotWalletPrivateKey}`;
        this.mainnetWallet = new ethers.Wallet(key, this.mainnetProvider);
        this.hotWalletAddress = this.mainnetWallet.address;
        console.log(`[EVM] ✅ Loaded Mainnet Hot Wallet: ${this.hotWalletAddress}`);
      }
    } catch (err) {
      console.warn('[EVM] Mainnet provider init warning:', err.message);
    }

    // 2. Initialize Polygon Amoy (Testnet) Provider & Wallet
    try {
      this.amoyProvider = new ethers.JsonRpcProvider(config.evm.amoyRpcUrl || 'https://polygon-amoy-bor-rpc.publicnode.com');
      if (config.evm.hotWalletPrivateKey && config.evm.hotWalletPrivateKey.length >= 64) {
        const key = config.evm.hotWalletPrivateKey.startsWith('0x')
          ? config.evm.hotWalletPrivateKey
          : `0x${config.evm.hotWalletPrivateKey}`;
        this.amoyWallet = new ethers.Wallet(key, this.amoyProvider);
        console.log(`[EVM] ✅ Loaded Polygon Amoy (Testnet) Hot Wallet: ${this.amoyWallet.address}`);
      }
    } catch (err) {
      console.warn('[EVM] Amoy provider init warning:', err.message);
    }

    if (!this.hotWalletAddress) {
      this.hotWalletAddress = config.evm.hotWalletAddress || '0x143cA3A5116835d94573C700320B9FEdFf846eF9';
    }
  }

  get wallet() {
    return this.mainnetWallet || this.amoyWallet;
  }

  get provider() {
    return this.mainnetProvider || this.amoyProvider;
  }

  getDepositAddress() {
    return this.hotWalletAddress;
  }

  async getBalances() {
    const balances = {
      mainnet: { native: 0.0, USDC: 0.0, USDT: 0.0 },
      amoy: { native: 0.0, USDC: 0.0 }
    };

    if (this.mainnetProvider && this.hotWalletAddress) {
      try {
        const nativeWei = await this.mainnetProvider.getBalance(this.hotWalletAddress);
        balances.mainnet.native = parseFloat(ethers.formatEther(nativeWei)) || 0.0;

        const usdcToken = config.evm.tokens.USDC;
        if (usdcToken?.address) {
          const contract = new ethers.Contract(usdcToken.address, ERC20_ABI, this.mainnetProvider);
          const raw = await contract.balanceOf(this.hotWalletAddress);
          balances.mainnet.USDC = parseFloat(ethers.formatUnits(raw, usdcToken.decimals)) || 0.0;
        }
      } catch (e) {
        console.warn('[EVM Mainnet] Balance query warning:', e.message);
      }
    }

    if (this.amoyProvider && this.hotWalletAddress) {
      try {
        const nativeWei = await this.amoyProvider.getBalance(this.hotWalletAddress);
        balances.amoy.native = parseFloat(ethers.formatEther(nativeWei)) || 0.0;

        const amoyUsdc = config.evm.amoyTokens?.USDC;
        if (amoyUsdc?.address) {
          const contract = new ethers.Contract(amoyUsdc.address, ERC20_ABI, this.amoyProvider);
          const raw = await contract.balanceOf(this.hotWalletAddress);
          balances.amoy.USDC = parseFloat(ethers.formatUnits(raw, amoyUsdc.decimals)) || 0.0;
        }
      } catch (e) {
        console.warn('[EVM Amoy] Balance query warning:', e.message);
      }
    }

    return balances;
  }

  async verifyDeposit(txHash, expectedAmount, tokenSymbol = 'USDC', depositAddress = null, chain = 'polygon_mainnet') {
    const isAmoy = (chain && (chain.toLowerCase().includes('amoy') || chain.toLowerCase().includes('testnet')));
    const activeProvider = isAmoy ? this.amoyProvider : this.mainnetProvider;
    const networkName = isAmoy ? 'Polygon Amoy (Testnet)' : 'Polygon Mainnet';

    // A) If dedicated deposit address is known, verify on-chain balance directly
    if (depositAddress && activeProvider) {
      try {
        const isNative = tokenSymbol.toUpperCase() === 'POL' || tokenSymbol.toUpperCase() === 'MATIC' || tokenSymbol.toUpperCase() === 'ETH';
        if (isNative) {
          const bal = await activeProvider.getBalance(depositAddress);
          if (bal && BigInt(bal) > 0n) {
            return {
              verified: true,
              onChain: true,
              amount: parseFloat(ethers.formatEther(bal)),
              txHash: txHash || `onchain_evm_${depositAddress.substring(0, 16)}`
            };
          }
        } else {
          const tokenConfig = isAmoy
            ? (config.evm.amoyTokens?.[tokenSymbol.toUpperCase()] || config.evm.tokens[tokenSymbol.toUpperCase()])
            : config.evm.tokens[tokenSymbol.toUpperCase()];
          if (tokenConfig?.address) {
            const contract = new ethers.Contract(tokenConfig.address, ERC20_ABI, activeProvider);
            const rawBal = await contract.balanceOf(depositAddress);
            if (rawBal && BigInt(rawBal) > 0n) {
              return {
                verified: true,
                onChain: true,
                amount: parseFloat(ethers.formatUnits(rawBal, tokenConfig.decimals)),
                txHash: txHash || `onchain_erc20_${depositAddress.substring(0, 16)}`
              };
            }
          }
        }
      } catch (err) {
        console.warn(`[EVM ${networkName}] Watcher check warning:`, err.message);
      }
    }

    // B) If txHash is provided, verify transaction receipt
    if (txHash && txHash.trim().length >= 20) {
      const cleanHash = txHash.trim();
      if (activeProvider) {
        try {
          const receipt = await activeProvider.getTransactionReceipt(cleanHash);
          if (receipt && receipt.status === 1) {
            return {
              verified: true,
              onChain: true,
              amount: expectedAmount,
              txHash: cleanHash,
              blockNumber: receipt.blockNumber
            };
          }
        } catch (err) {
          console.warn(`[EVM ${networkName}] Receipt query error:`, err.message);
        }
      }

      if (config.simulateIfNoFunds) {
        return { verified: true, simulated: true, amount: expectedAmount, txHash: cleanHash };
      }

      return { verified: false, reason: `Transacción no confirmada en ${networkName}` };
    }

    if (config.simulateIfNoFunds) {
      return { verified: true, simulated: true, amount: expectedAmount, txHash: 'simulated_fallback' };
    }

    return { verified: false, reason: 'No se detectaron fondos recibidos en la dirección de depósito' };
  }

  async sendPayout(recipientAddress, amount, tokenSymbol = 'USDC', chain = 'polygon_mainnet') {
    const raw = recipientAddress.trim().toLowerCase();
    if (!ethers.isAddress(raw)) {
      throw new Error(`Dirección EVM de destino inválida: ${recipientAddress}`);
    }
    const cleanRecipient = ethers.getAddress(raw);

    const isAmoy = chain ? (chain.toLowerCase().includes('amoy') || chain.toLowerCase().includes('testnet')) : false;
    const activeWallet = isAmoy ? this.amoyWallet : this.mainnetWallet;
    const activeExplorer = isAmoy ? (config.evm.amoyExplorerUrl || 'https://amoy.polygonscan.com') : config.evm.explorerUrl;
    const networkName = isAmoy ? 'Polygon Amoy (Testnet)' : 'Polygon Mainnet';

    if (!activeWallet) {
      throw new Error(`[EVM] La Hot Wallet para ${networkName} no está inicializada`);
    }

    try {
      const isNative = tokenSymbol.toUpperCase() === 'POL' || tokenSymbol.toUpperCase() === 'MATIC';
      let txReceipt;

      if (isNative) {
        console.log(`[EVM Payout] Sending ${amount} POL natively to ${cleanRecipient} on ${networkName}...`);
        const tx = await activeWallet.sendTransaction({
          to: cleanRecipient,
          value: ethers.parseEther(amount.toFixed(18))
        });
        txReceipt = await tx.wait(1);
      } else {
        const tokenConfig = isAmoy
          ? (config.evm.amoyTokens?.[tokenSymbol.toUpperCase()] || config.evm.tokens[tokenSymbol.toUpperCase()])
          : config.evm.tokens[tokenSymbol.toUpperCase()];

        if (!tokenConfig?.address) {
          throw new Error(`No hay contrato configurado para ${tokenSymbol} en ${networkName}`);
        }

        const parsedAmount = ethers.parseUnits(amount.toFixed(tokenConfig.decimals), tokenConfig.decimals);
        console.log(`[EVM Payout] Sending ${amount} ${tokenSymbol} via ERC20 (${tokenConfig.address}) to ${cleanRecipient} on ${networkName}...`);
        const contract = new ethers.Contract(tokenConfig.address, ERC20_ABI, activeWallet);
        const tx = await contract.transfer(cleanRecipient, parsedAmount);
        txReceipt = await tx.wait(1);
      }

      console.log(`[EVM Payout] ✅ Confirmed on-chain on ${networkName}! Hash: ${txReceipt.hash}`);
      db.updateLiquidity(`evm_${tokenSymbol.toLowerCase()}`, -amount);

      return {
        success: true,
        onChain: true,
        txHash: txReceipt.hash,
        explorerUrl: `${activeExplorer}/tx/${txReceipt.hash}`,
        blockNumber: txReceipt.blockNumber
      };
    } catch (err) {
      console.error(`[EVM Payout] ❌ Error on-chain en ${networkName}:`, err.message);

      if (config.simulateIfNoFunds) {
        console.warn('[EVM Payout] Falling back to simulated hash due to SIMULATE_IF_NO_FUNDS=true');
        const mockHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
        db.updateLiquidity(`evm_${tokenSymbol.toLowerCase()}`, -amount);
        return {
          success: true,
          simulated: true,
          txHash: mockHash,
          explorerUrl: `${activeExplorer}/tx/${mockHash}`
        };
      }

      throw new Error(`Fallo en el pago on-chain de ${networkName}: ${err.message}. Asegúrate de que la Hot Wallet (${activeWallet.address}) tenga gas suficiente.`);
    }
  }
}

export const evmService = new EvmService();
