import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { db } from './services/db.js';
import { oracle, oraclePool } from './services/oraclePool.js';
import { rpcPool } from './services/rpcPool.js';
import { bchService } from './services/bchService.js';
import { evmService } from './services/evmService.js';
import { solanaService } from './services/solanaService.js';
import { ltcService } from './services/ltcService.js';
import { relayerEngine } from './services/relayerEngine.js';
import { poolService } from './services/poolService.js';
import { lendingService } from './services/lendingService.js';
import { perpsService } from './services/perpsService.js';
import { watchmanSentinel } from './services/watchmanClient.js';

const app = express();

// Trust reverse proxy (Nginx) for accurate IP-based rate limiting
app.set('trust proxy', 1);

// Security Headers (Helmet against Clickjacking, MIME sniffing, XSS)
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// Middlewares
app.use(cors());
app.use(express.json());

// Global Rate Limiter: max 300 requests per minute per IP
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests from this IP. Please try again in a minute.' }
});
app.use(globalLimiter);

// Rate Limiter for Swap Intent Creation: max 60 swaps per minute per IP
const swapCreationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Swap creation limit exceeded. Please wait a moment.' }
});
app.use('/api/swap/create', swapCreationLimiter);

// Request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    if (!req.path.includes('/status') && !req.path.includes('/health')) {
      console.log(`[HTTP] ${req.method} ${req.path} -> ${res.statusCode} (${Date.now() - start}ms)`);
    }
  });
  next();
});

// Root & Health
app.get('/', (req, res) => {
  res.json({
    service: 'BinaryLiquid Stablecoin Bridge Relayer',
    event: 'BCH BLAZE Stablecoin Bridge Hackathon ($750 PUSD)',
    sponsor: 'ParyonUSD (paryonusd.com)',
    status: 'ONLINE',
    version: '1.0.0',
    documentation: '/api/docs'
  });
});

app.get('/health', (req, res) => res.json({ status: 'OK', timestamp: new Date().toISOString() }));

// Status & Protocol Config
app.get('/api/status', async (req, res) => {
  try {
    const [bchBalances, evmBalances, solanaBalances] = await Promise.all([
      bchService.getBalances(),
      evmService.getBalances(),
      solanaService.getBalances()
    ]);

    const treasury = db.getTreasuryStats();

    res.json({
      status: 'OPERATIONAL',
      protocol: 'BinaryLiquid 100% Non-Custodial Cross-Chain Protocol',
      architecture: 'Smart Contract Vaults (Solidity + CashScript P2SH32 Covenants + Solana SVM Anchor PDA) + The Watchman Sentinel',
      feePercentage: config.feePercentage * 100, // 0.3%
      networks: {
        bch: {
          network: config.bch.network,
          vaultAddress: bchService.getVaultAddress(false, true),
          chipnetVaultAddress: bchService.getVaultAddress(true, false),
          chipnetVaultTokenAddress: bchService.getVaultAddress(true, true),
          tokens: config.bch.tokens,
          balances: bchBalances
        },
        evm: {
          chainName: config.evm.chainName,
          chainId: config.evm.chainId,
          amoyChainId: config.evm.amoyChainId,
          vaultAddress: evmService.getVaultAddress('polygon_mainnet'),
          amoyVaultAddress: config.evm.amoyVaultAddress,
          tokens: config.evm.tokens,
          amoyTokens: config.evm.amoyTokens,
          balances: evmBalances
        },
        solana: {
          cluster: config.solana?.cluster || 'devnet',
          vaultAddress: solanaService.getVaultAddress('solana_mainnet'),
          devnetVaultAddress: solanaService.getVaultAddress('solana_devnet'),
          tokens: config.solana?.tokens,
          balances: solanaBalances
        }
      },
      infrastructure: {
        rpcPool: rpcPool.getHealth(),
        oraclePool: oraclePool.getHealth(),
        database: db.getStatus(),
        watchman: watchmanSentinel.getStatus()
      },
      treasury: {
        totalVolumeUsd: treasury.totalVolumeUsd,
        totalSwapsCount: treasury.totalSwapsCount,
        feesAccumulated: {
          PUSD: treasury.PUSD,
          USDC: treasury.USDC,
          MUSD: treasury.MUSD
        }
      },
      blazeSponsor: {
        name: 'ParyonUSD',
        symbol: 'PUSD',
        website: 'https://paryonusd.com',
        community: 'https://t.me/bchblaze',
        featured: true
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// The Watchman Sentinel Status & Live Audit Feed
app.get('/api/watchman/status', (req, res) => {
  res.json({
    success: true,
    watchman: watchmanSentinel.getStatus(),
    activePair: 'PUSD ⟷ USDT (Testnet)',
    contracts: {
      evmAmoyVault: config.evm.amoyVaultAddress,
      evmAmoyUsdt: config.evm.amoyTokens.USDT.address,
      evmAmoyUsdc: config.evm.amoyTokens.USDC.address,
      bchChipnetVault: config.bch.chipnetVaultTokenAddress,
      bchChipnetPusdCategory: config.bch.tokens.PUSD.chipnetCategory
    }
  });
});

// Live Deployed Non-Custodial Smart Contracts Manifest
app.get('/api/contracts/manifest', (req, res) => {
  res.json({
    success: true,
    architecture: '100% Non-Custodial Cross-Chain Vaults + CashScript Covenants',
    activePair: 'PUSD ⟷ USDT',
    mainnetStatus: 'Sin Liquidez',
    evmAmoy: {
      chainId: config.evm.amoyChainId,
      vaultContractAddress: config.evm.amoyVaultAddress,
      vaultExplorerUrl: `https://amoy.polygonscan.com/address/${config.evm.amoyVaultAddress}`,
      testnetUsdtAddress: config.evm.amoyTokens.USDT.address,
      testnetUsdcAddress: config.evm.amoyTokens.USDC.address,
      circleUsdcAddress: config.evm.amoyTokens.USDC.circleAddress
    },
    bchChipnet: {
      network: 'chipnet',
      vaultAddress: config.bch.chipnetVaultAddress,
      vaultTokenAddress: config.bch.chipnetVaultTokenAddress,
      vaultExplorerUrl: `https://chipnet.imaginary.cash/address/${config.bch.chipnetVaultAddress}`,
      pusdCategory: config.bch.tokens.PUSD.chipnetCategory
    }
  });
});

// Oracle Quote (Dynamic Multi-Source with Failover)
app.get('/api/quote', async (req, res) => {
  try {
    const { fromToken, toToken, amount, network, fromChain, toChain } = req.query;
    if (!fromToken || !toToken || !amount) {
      return res.status(400).json({ error: 'Missing required query parameters: fromToken, toToken, amount' });
    }

    const quote = await oraclePool.calculateQuote(fromToken, toToken, amount, network || 'testnet', { fromChain, toChain });
    res.json({ success: true, quote });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Create Non-Custodial Swap Intent (Smart Contract Vault / P2SH32 CashScript Covenant)
app.post('/api/swap/create', async (req, res) => {
  try {
    const {
      fromToken,
      toToken,
      fromChain,
      toChain,
      amount,
      recipientAddress,
      senderAddress,
      slippage,
      minReceived
    } = req.body;

    if (!fromToken || !toToken || !fromChain || !toChain || !amount || !recipientAddress) {
      return res.status(400).json({
        error: 'All fields are required (fromToken, toToken, fromChain, toChain, amount, recipientAddress)'
      });
    }

    const fromChainLower = fromChain.toLowerCase();
    const toChainLower = toChain.toLowerCase();

    const isTestnetSwap =
      fromChainLower.includes('chipnet') ||
      fromChainLower.includes('amoy') ||
      fromChainLower.includes('devnet') ||
      fromChainLower.includes('solana') ||
      fromChainLower.includes('litecoin') ||
      fromChainLower.includes('ltc') ||
      toChainLower.includes('chipnet') ||
      toChainLower.includes('amoy') ||
      toChainLower.includes('devnet') ||
      toChainLower.includes('solana') ||
      toChainLower.includes('litecoin') ||
      toChainLower.includes('ltc');

    if (!isTestnetSwap) {
      return res.status(400).json({
        success: false,
        error: 'Sin Liquidez en Mainnet actualmente. Cambia a la red Testnet para operar en BCH Chipnet, Polygon Amoy o Solana Devnet.'
      });
    }

    const allowedTestnet = ['PUSD', 'USDT', 'SOL', 'LTC'];
    const isDifferentChain = fromChainLower !== toChainLower;

    if (
      !allowedTestnet.includes(fromToken.toUpperCase()) ||
      !allowedTestnet.includes(toToken.toUpperCase()) ||
      (fromToken.toUpperCase() === toToken.toUpperCase() && !isDifferentChain)
    ) {
      return res.status(400).json({
        success: false,
        error: 'Sin Liquidez para este activo o par idéntico en la misma red. En Testnet están habilitados PUSD (BCH Chipnet), USDT (Polygon Amoy) y USDT (Solana Devnet).'
      });
    }

    // Calculate quotation with live oracle pool
    const quote = await oraclePool.calculateQuote(fromToken, toToken, amount, 'testnet', { fromChain, toChain });

    if (!quote.hasLiquidity) {
      return res.status(400).json({
        success: false,
        error: `Insufficient Vault liquidity for this swap. Maximum available: ${quote.availableLiquidity} ${quote.toToken}`
      });
    }

    if (quote.isBelowMin) {
      return res.status(400).json({
        success: false,
        error: `Minimum swap amount is ${quote.minAmount} ${fromToken}`
      });
    }

    if (quote.isAboveMax) {
      return res.status(400).json({
        success: false,
        error: `Maximum swap amount per transaction is ${quote.maxAmount} ${fromToken}`
      });
    }

    const isBchOrigin = fromChainLower.includes('bch') || fromChainLower.includes('chipnet');
    const isSolanaOrigin = solanaService.isSolanaChain(fromChain);
    const isLtcOrigin = ltcService.isLtcChain(fromChain);
    const isChipnet = fromChainLower.includes('chipnet');
    const orderSeed = `bliq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    let depositAddress;
    let contractName;
    let contractType;
    let contractExplorerUrl;
    let tokenContractAddress = null;
    let timelockExpiry = Math.floor(Date.now() / 1000) + 86400;

    if (isLtcOrigin) {
      depositAddress = ltcService.getVaultAddress(true);
      contractName = 'Litecoin Vault Escrow';
      contractType = 'Litecoin Native SegWit Escrow (Zero-Custody Watchman)';
      contractExplorerUrl = `${ltcService.getExplorerUrl(true)}/address/${depositAddress}`;
      tokenContractAddress = null;
    } else if (isSolanaOrigin) {
      depositAddress = solanaService.getDepositAddress(fromChain);
      contractName = 'binary_liquid_vault (Anchor SVM)';
      contractType = 'Solana Non-Custodial Anchor PDA Vault (Ed25519 Watchman)';
      const clusterParam = solanaService.isDevnetChain(fromChain) ? '?cluster=devnet' : '';
      contractExplorerUrl = `${config.solana?.explorerUrl || 'https://solscan.io'}/account/${depositAddress}${clusterParam}`;
      tokenContractAddress = solanaService.getTokenConfig(fromToken, fromChain)?.mint || null;
    } else if (isBchOrigin) {
      const covenant = await bchService.createSwapEscrowCovenant({
        orderId: orderSeed,
        refundAddress: senderAddress || null,
        isChipnet,
        isCashToken: fromToken.toUpperCase() !== 'BCH'
      });
      depositAddress = covenant.address;
      contractName = covenant.contractName;
      contractType = covenant.contractType;
      contractExplorerUrl = covenant.explorerUrl;
      timelockExpiry = covenant.expiryTimestamp;
      tokenContractAddress = bchService.getTokenCategory(fromToken, isChipnet);
    } else {
      const isAmoy = evmService.isAmoyChain(fromChain);
      depositAddress = evmService.getVaultAddress(fromChain);
      contractName = 'BinaryLiquidVault.sol';
      contractType = 'Solidity Non-Custodial Vault (EIP-191 Watchman + 24h Timelock)';
      const explorerBase = isAmoy ? 'https://amoy.polygonscan.com' : 'https://polygonscan.com';
      contractExplorerUrl = `${explorerBase}/address/${depositAddress}`;
      tokenContractAddress = evmService.getTokenConfig(fromToken, fromChain)?.address || null;
    }

    const userSlippage = parseFloat(slippage) || 0.5;
    const minPayout = minReceived
      ? parseFloat(minReceived)
      : Number((quote.netPayout * (1 - userSlippage / 100)).toFixed(6));

    const swap = db.createSwap({
      fromToken: quote.fromToken,
      toToken: quote.toToken,
      fromChain,
      toChain,
      fromAmount: quote.inputAmount,
      toAmount: quote.netPayout,
      minPayoutAmount: minPayout,
      slippageTolerance: userSlippage,
      feeAmount: quote.feeAmount,
      feePercentage: config.feePercentage,
      oracleRate: quote.rate,
      depositAddress,
      derivationPath: contractName,
      derivationIndex: 0,
      contractName,
      contractType,
      contractExplorerUrl,
      tokenContractAddress,
      timelockExpiry,
      orderSeed,
      senderAddress: senderAddress || null,
      recipientAddress
    });

    res.json({
      success: true,
      swap,
      instructions: {
        message: `Deposit ${swap.fromAmount} ${swap.fromToken} into the Non-Custodial ${contractName} Smart Contract.`,
        depositAddress: swap.depositAddress,
        contractName,
        contractType,
        contractExplorerUrl,
        tokenContractAddress,
        timelockExpiry,
        expectedPayout: `${swap.toAmount} ${swap.toToken}`,
        minimumGuaranteed: `${swap.minPayoutAmount} ${swap.toToken} (${swap.slippageTolerance}% slippage tolerance)`,
        feeCollected: `${swap.feeAmount} ${swap.fromToken} (0.3% protocol fee)`
      }
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Get Swap by ID (with real-time on-chain deposit detection)
app.get('/api/swap/:id', async (req, res) => {
  try {
    let swap = db.getSwap(req.params.id);
    if (!swap) return res.status(404).json({ error: 'Swap not found' });

    // Active on-chain inspection for pending BCH deposits
    if (swap.status === 'PENDING_DEPOSIT' && !swap.depositTxHash) {
      const isBch = String(swap.fromChain || '').toLowerCase().includes('bch') ||
                    String(swap.fromChain || '').toLowerCase().includes('chipnet');
      if (isBch && swap.depositAddress) {
        const covenantCheck = await bchService.verifyDeposit(
          null,
          swap.fromAmount,
          swap.fromToken,
          swap.depositAddress
        );
        if (covenantCheck.verified && covenantCheck.txHash) {
          db.updateSwap(swap.id, {
            depositTxHash: covenantCheck.txHash,
            status: 'DEPOSIT_DETECTED',
            error: null
          });
          // Immediately trigger Watchman execution and payout
          const relayResult = await relayerEngine.executeRelay(swap.id);
          if (relayResult.success) {
            swap = relayResult.swap;
          } else {
            swap = db.getSwap(swap.id);
          }
        }
      }
    }

    res.json({ success: true, swap });
  } catch (err) {
    const swap = db.getSwap(req.params.id);
    res.json({ success: true, swap: swap || null });
  }
});

// Build Unsigned `wc2-bch-bcr` CashTokens Transaction for 1-Click BCH Wallet Signing
app.post('/api/swap/:id/build-bch-tx', async (req, res) => {
  try {
    const swap = db.getSwap(req.params.id);
    if (!swap) return res.status(404).json({ success: false, error: 'Swap no encontrado.' });

    const senderAddress = (req.body?.senderAddress || swap.senderAddress || '').trim();
    if (!senderAddress) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere la dirección BCH conectada para construir la transacción.'
      });
    }

    const isChipnet = String(swap.depositAddress || '').startsWith('bchtest:');
    const built = await bchService.buildUnsignedSwapWcTransaction({
      senderAddress,
      depositAddress: swap.depositAddress,
      tokenSymbol: swap.fromToken,
      amount: swap.fromAmount,
      isChipnet,
      userPrompt: `BinaryLiquid Swap: ${swap.fromAmount} ${swap.fromToken} → ${swap.toAmount} ${swap.toToken}`
    });

    res.json({
      success: true,
      ...built
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Build Genuine Unsigned BCH Mainnet Treasury / Protocol Support Transaction for WizardConnect
app.post('/api/bch/mainnet/build-treasury-tx', async (req, res) => {
  try {
    const senderAddress = (req.body?.senderAddress || '').trim();
    const amountBch = parseFloat(req.body?.amountBch || req.body?.amount || '0.0001');

    if (!senderAddress) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere la dirección CashAddr de Bitcoin Cash Mainnet conectada.'
      });
    }

    if (isNaN(amountBch) || amountBch <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Monto de BCH inválido (mínimo 0.00005 BCH).'
      });
    }

    const targetAddress = bchService.getVaultAddress(false, false) || config.bch.watchmanMainnetAddress || 'bitcoincash:pvqse7cr2ptah2e34sl53r5utqwxl28fk84grvf5ufzd6n5tclme25u8ar7st';
    const built = await bchService.buildUnsignedSwapWcTransaction({
      senderAddress,
      depositAddress: targetAddress,
      tokenSymbol: 'BCH',
      amount: amountBch,
      isChipnet: false,
      userPrompt: `BinaryLiquid Protocol Mainnet: ${amountBch} BCH`
    });

    res.json({
      success: true,
      targetAddress,
      amountBch,
      ...built
    });
  } catch (err) {
    console.error('[BCH Mainnet Treasury Tx Error]:', err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});

// Broadcast a user-signed BCH transaction (from WizardConnect, WalletConnect, or Paytaca Extension)
app.post('/api/bch/broadcast', async (req, res) => {
  try {
    const { txHex, isChipnet } = req.body;
    console.log('[BCH Broadcast Request] txHex length:', txHex ? txHex.length : 0, 'isChipnet:', isChipnet);
    if (!txHex || typeof txHex !== 'string') {
      return res.status(400).json({ success: false, error: 'Se requiere el hexadecimal de la transacción firmada.' });
    }
    const testnet = isChipnet !== false;
    const txId = await bchService.broadcastTransaction(txHex.trim(), testnet);
    console.log('[BCH Broadcast Success] txId:', txId);
    res.json({ success: true, txId, txHash: txId });
  } catch (err) {
    console.error('[BCH Broadcast Error]:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

// Verify Smart Contract Deposit & Trigger Immediate Watchman + Vault Execution
app.post('/api/swap/:id/verify-tx', async (req, res) => {
  try {
    const { txHash } = req.body;
    const swap = db.getSwap(req.params.id);
    if (!swap) return res.status(404).json({ error: 'Swap not found' });

    if (swap.status === 'COMPLETED') {
      return res.json({ success: true, message: 'Swap already completed', swap });
    }

    let finalTxHash = txHash ? txHash.trim() : null;

    if (!finalTxHash) {
      const isBch = swap.fromChain.includes('bch') || swap.fromChain.includes('chipnet');
      const isSolana = solanaService.isSolanaChain(swap.fromChain);
      const isLtc = ltcService.isLtcChain(swap.fromChain);
      if (isBch) {
        // Inspect UTXOs directly inside the isolated P2SH32 CashScript Covenant (`bchtest:r...`)
        const covenantCheck = await bchService.verifyDeposit(
          null,
          swap.fromAmount,
          swap.fromToken,
          swap.depositAddress
        );
        if (covenantCheck.verified && covenantCheck.txHash) {
          finalTxHash = covenantCheck.txHash;
        }
      } else if (isLtc) {
        const ltcCheck = await ltcService.verifyDeposit(
          swap.depositAddress,
          swap.fromAmount,
          true
        );
        if (ltcCheck.verified && ltcCheck.txHash) {
          finalTxHash = ltcCheck.txHash;
        }
      }

      if (!finalTxHash) {
        return res.json({
          success: false,
          pending: true,
          error: isBch
            ? `Aún no se detectan CashTokens ${swap.fromToken} en el Smart Contract Covenant (${swap.depositAddress}). Envía los fondos o pega el TXID.`
            : isSolana
            ? `Aún no se detecta el depósito de ${swap.fromToken} en el Vault Anchor Solana (${swap.depositAddress}). Envía los fondos o pega la firma de transacción Base58.`
            : `Para depósitos en el Smart Contract EVM (${swap.depositAddress}), usa el botón "Depositar con Web3" o pega el Hash de Transacción (0x...).`
        });
      }
    }

    // Anti-Replay Attack Guard
    const cleanHash = finalTxHash.toLowerCase();
    const existingTx = db.findSwapByDepositTxHash(cleanHash);
    if (existingTx && existingTx.id !== swap.id && existingTx.status === 'COMPLETED') {
      return res.json({
        success: false,
        error: 'Security Alert: This transaction hash has already been redeemed in a previous swap (Replay Attack blocked).'
      });
    }

    if (!['CONFIRMING', 'EXECUTING_PAYOUT', 'COMPLETED'].includes(swap.status)) {
      db.updateSwap(swap.id, { depositTxHash: finalTxHash, status: 'DEPOSIT_DETECTED' });
    } else if (!swap.depositTxHash && finalTxHash) {
      db.updateSwap(swap.id, { depositTxHash: finalTxHash });
    }

    // Trigger instant Watchman audit + Non-Custodial Vault release
    const result = await relayerEngine.executeRelay(swap.id);

    if (result.success) {
      res.json({
        success: true,
        message: 'Smart Contract deposit verified by The Watchman and Vault payout released on-chain!',
        swap: result.swap
      });
    } else {
      res.json({
        success: false,
        error: result.reason || result.error || 'Failed to process Watchman Vault settlement',
        swap: db.getSwap(swap.id)
      });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Recent Public Swaps (Live ticker/Activity)
app.get('/api/swaps/recent', (req, res) => {
  const limit = parseInt(req.query.limit || '10', 10);
  const recent = db.listSwaps(limit);
  res.json({ success: true, count: recent.length, swaps: recent });
});

// Treasury Statistics & Protocol Fee Accounting
app.get('/api/treasury', (req, res) => {
  const stats = db.getTreasuryStats();
  res.json({
    success: true,
    stats,
    nonCustodialVaults: {
      evmAmoyVault: config.evm.amoyVaultAddress,
      bchChipnetVault: config.bch.chipnetVaultTokenAddress
    }
  });
});

// Legacy Sweeper Route -> Redirected to Non-Custodial Watchman Sentinel Status
app.get('/api/sweeper/status', (req, res) => {
  res.json({
    success: true,
    architecture: '100% NON-CUSTODIAL (Hot-wallet sweeper deprecated; funds live inside Smart Contract Vaults)',
    watchman: watchmanSentinel.getStatus()
  });
});

// ==========================================
// LIMIT ORDERS (Non-Custodial Vault Execution)
// ==========================================
app.post('/api/limit-orders/create', async (req, res) => {
  try {
    const { userAddress, fromToken, toToken, fromChain, toChain, fromAmount, targetRate, recipientAddress } = req.body;
    if (!userAddress || !fromAmount || !targetRate || !recipientAddress) {
      return res.status(400).json({ success: false, error: 'Missing required limit order parameters' });
    }

    const isTestnetOrder =
      (fromChain || '').toLowerCase().includes('chipnet') ||
      (fromChain || '').toLowerCase().includes('amoy') ||
      (toChain || '').toLowerCase().includes('chipnet') ||
      (toChain || '').toLowerCase().includes('amoy');

    if (!isTestnetOrder) {
      return res.status(400).json({
        success: false,
        error: 'Sin Liquidez en Mainnet actualmente. Cambia a Testnet para crear órdenes PUSD ⟷ USDT.'
      });
    }

    const allowedTestnetLimit = ['PUSD', 'USDT'];
    if (
      !allowedTestnetLimit.includes((fromToken || '').toUpperCase()) ||
      !allowedTestnetLimit.includes((toToken || '').toUpperCase())
    ) {
      return res.status(400).json({
        success: false,
        error: 'Sin Liquidez para este activo. En Testnet únicamente tienen liquidez PUSD ⟷ USDT.'
      });
    }

    const isBchOrigin =
      (fromChain || '').includes('bch') ||
      (fromChain || '').includes('chipnet') ||
      ['PUSD', 'MUSD', 'LIFT'].includes((fromToken || '').toUpperCase());
    const originChain = fromChain || (isBchOrigin ? 'bch_mainnet' : 'polygon_mainnet');
    const isChipnet = originChain.includes('chipnet');
    const orderSeed = `lim_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    let depositAddress;
    let contractName;
    let timelockExpiry = Math.floor(Date.now() / 1000) + 86400;
    if (isBchOrigin) {
      const cov = await bchService.createSwapEscrowCovenant({
        orderId: orderSeed,
        refundAddress: userAddress,
        isChipnet,
        isCashToken: (fromToken || '').toUpperCase() !== 'BCH'
      });
      depositAddress = cov.address;
      contractName = cov.contractName;
      timelockExpiry = cov.expiryTimestamp;
    } else {
      depositAddress = evmService.getVaultAddress(originChain);
      contractName = 'BinaryLiquidVault.sol';
    }

    const order = db.createLimitOrder({
      userAddress,
      fromToken,
      toToken,
      fromChain: originChain,
      toChain: toChain || (isBchOrigin ? 'polygon_amoy' : 'bch_chipnet'),
      fromAmount,
      targetRate,
      expectedOutput: (parseFloat(fromAmount) * parseFloat(targetRate) * 0.997).toFixed(4),
      recipientAddress,
      depositAddress,
      derivationPath: contractName,
      derivationIndex: 0,
      contractName,
      timelockExpiry,
      orderSeed
    });

    res.json({
      success: true,
      message: 'Non-Custodial limit order created. Watchman Sentinel will settle automatically upon target rate.',
      order
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/limit-orders/:id/build-bch-tx', async (req, res) => {
  try {
    const order = db.getLimitOrder(req.params.id);
    if (!order) return res.status(404).json({ success: false, error: 'Orden límite no encontrada.' });

    const senderAddress = (req.body?.senderAddress || order.userAddress || '').trim();
    const isChipnet = String(order.depositAddress || '').startsWith('bchtest:');
    const built = await bchService.buildUnsignedSwapWcTransaction({
      senderAddress,
      depositAddress: order.depositAddress,
      tokenSymbol: order.fromToken,
      amount: order.fromAmount,
      isChipnet,
      userPrompt: `BinaryLiquid Limit Order: ${order.fromAmount} ${order.fromToken} @ ${order.targetRate}`
    });

    res.json({ success: true, ...built });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/limit-orders/:id/verify-tx', async (req, res) => {
  try {
    const order = db.getLimitOrder(req.params.id);
    if (!order) return res.status(404).json({ success: false, error: 'Orden límite no encontrada.' });
    const txHash = String(req.body?.txHash || '').trim();
    if (!txHash) return res.status(400).json({ success: false, error: 'Se requiere txHash.' });

    const updated = db.updateLimitOrder(order.id, { depositTxHash: txHash });
    // Trigger immediate check in case target rate is already met
    relayerEngine.checkLimitOrders().catch(() => {});
    res.json({ success: true, order: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get('/api/limit-orders', (req, res) => {
  try {
    const { userAddress, status, limit } = req.query;
    const orders = db.listLimitOrders({ userAddress, status, limit: parseInt(limit || '50', 10) });
    res.json({ success: true, count: orders.length, orders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/limit-orders/:id/cancel', (req, res) => {
  try {
    const { id } = req.params;
    const { userAddress } = req.body;
    const updated = db.cancelLimitOrder(id, userAddress);
    res.json({ success: true, message: 'Limit order cancelled successfully.', order: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ==========================================
// LIQUIDITY POOLS (LP Shares & AMM Accounting)
// ==========================================
app.get('/api/pools', async (req, res) => {
  try {
    const network = String(req.query.network || 'mainnet').toLowerCase();
    const pools = await poolService.getAllPools({ network });
    res.json({ success: true, network, count: pools.length, pools });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/pools/stats', async (req, res) => {
  try {
    const poolId = req.query.poolId || 'PUSD_USDT';
    const network = String(req.query.network || 'mainnet').toLowerCase();
    const [bchBalances, evmBalances] = await Promise.all([
      bchService.getBalances(),
      evmService.getBalances()
    ]);
    const vaultBalances = {
      chipnetPusd: bchBalances.chipnet?.PUSD || 0,
      chipnetBch: bchBalances.chipnet?.bch || 0,
      amoyUsdt: evmBalances.amoy?.USDT || 0,
      amoyUsdc: evmBalances.amoy?.USDC || 0,
      mainnetPusd: bchBalances.mainnet?.PUSD || 0,
      mainnetUsdc: evmBalances.mainnet?.USDC || 0,
      mainnetUsdt: evmBalances.mainnet?.USDT || 0
    };
    const stats = await poolService.getStats(poolId, { network, vaultBalances });
    res.json({ 
      success: true, 
      network,
      pool: stats.pool, 
      allPools: stats.allPools, 
      protocolStats: stats.protocolStats,
      vaultBalances,
      relayerBalances: {
        bch: bchBalances.chipnet?.bch || bchBalances.mainnet?.bch || 0,
        pusd: bchBalances.chipnet?.PUSD || bchBalances.mainnet?.PUSD || 0,
        musd: bchBalances.mainnet?.MUSD || 0,
        pol: evmBalances.amoy?.native || evmBalances.mainnet?.native || 0,
        usdc: evmBalances.amoy?.USDC || evmBalances.mainnet?.USDC || 0,
        usdt: evmBalances.amoy?.USDT || evmBalances.mainnet?.USDT || 0
      },
      hotWalletBalances: {
        bch: bchBalances.chipnet?.bch || bchBalances.mainnet?.bch || 0,
        pusd: bchBalances.chipnet?.PUSD || bchBalances.mainnet?.PUSD || 0,
        musd: bchBalances.mainnet?.MUSD || 0,
        pol: evmBalances.amoy?.native || evmBalances.mainnet?.native || 0,
        usdc: evmBalances.amoy?.USDC || evmBalances.mainnet?.USDC || 0,
        usdt: evmBalances.amoy?.USDT || evmBalances.mainnet?.USDT || 0
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/pools/:poolId', async (req, res) => {
  try {
    const network = String(req.query.network || 'mainnet').toLowerCase();
    const pool = poolService.getPool(req.params.poolId);
    const enriched = await poolService.enrichPoolData(pool, { network });
    res.json({ success: true, pool: enriched });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/pools/build-bch-tx', async (req, res) => {
  try {
    const senderAddress = req.body?.senderAddress || req.query?.senderAddress;
    const poolId = req.body?.poolId || req.query?.poolId;
    const token = req.body?.token || req.query?.token;
    const amount = req.body?.amount ?? req.query?.amount;
    const network = req.body?.network || req.query?.network;
    if (!senderAddress) {
      return res.status(400).json({ success: false, error: 'Se requiere senderAddress (dirección BCH/CashTokens del LP).' });
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida para depósito de liquidez.' });
    }
    const targetNetwork = String(network || 'testnet').toLowerCase();
    const isChipnet = targetNetwork === 'testnet';
    const pool = poolService.getPool(poolId || 'PUSD_USDT');
    const enriched = await poolService.enrichPoolData(pool, { network: targetNetwork });
    const upperToken = String(token || enriched.tokenA || 'PUSD').toUpperCase();

    const depositAddress = enriched.vaultAddressA || (isChipnet
      ? bchService.getVaultInfo(true)?.tokenAddress
      : bchService.getVaultInfo(false)?.tokenAddress);

    const built = await bchService.buildUnsignedSwapWcTransaction({
      senderAddress,
      depositAddress,
      tokenSymbol: upperToken,
      tokenCategory: enriched.categoryIdA || undefined,
      tokenDecimals: enriched.decimalsA ?? undefined,
      amount: numAmount,
      isChipnet,
      userPrompt: `BinaryLiquid LP Pool (${enriched.pair || pool.id}): Aportar ${numAmount} ${upperToken}`
    });

    res.json({
      success: true,
      poolId: enriched.id,
      depositAddress,
      ...built
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/pools/add-liquidity', async (req, res) => {
  try {
    const { providerAddress, bchAddress, evmAddress, token, amount, poolId, txHash, network } = req.body;
    const result = await poolService.addLiquidity({
      providerAddress,
      bchAddress,
      evmAddress,
      token,
      amount,
      poolId,
      txHash,
      network
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/pools/remove-liquidity', async (req, res) => {
  try {
    const { positionId, providerAddress, bchAddress, evmAddress, sharesToBurn, poolId, withdrawToken } = req.body;
    const result = await poolService.removeLiquidity({
      positionId,
      providerAddress,
      bchAddress,
      evmAddress,
      sharesToBurn,
      poolId,
      withdrawToken
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Permissionless Cross-Chain Pool Creation (CashTokens + Multi-Chain counterparty)
app.post('/api/pools/create', async (req, res) => {
  try {
    const {
      creatorAddress,
      tokenA,
      tokenB,
      tokenAName,
      tokenBName,
      network,
      networkA,
      networkB,
      networkBadgeA,
      networkBadgeB,
      iconA,
      categoryIdA,
      decimalsA,
      decimalsB,
      poolMode,
      targetTvlUsd,
      initialAmountA,
      initialAmountB,
      initialPriceUsd
    } = req.body;

    const result = await poolService.createCustomPool({
      creatorAddress,
      tokenA,
      tokenB,
      tokenAName,
      tokenBName,
      network,
      networkA,
      networkB,
      networkBadgeA,
      networkBadgeB,
      iconA,
      categoryIdA,
      decimalsA,
      decimalsB,
      poolMode,
      targetTvlUsd,
      initialAmountA,
      initialAmountB,
      initialPriceUsd
    });

    res.json({
      success: true,
      message: poolMode === 'BOOTSTRAPPING'
        ? `¡Par ${result.pair} registrado en modo Bootstrapping (Meta: $${result.targetTvlUsd})!`
        : `¡Par ${result.pair} registrado en el protocolo!`,
      pool: result
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get('/api/pools/positions/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const poolId = req.query.poolId || null;
    const bchAddress = req.query.bchAddress || null;
    const evmAddress = req.query.evmAddress || null;
    const network = String(req.query.network || 'testnet').toLowerCase();
    const positions = await poolService.getPositionsForAddress(address, {
      bchAddress,
      evmAddress,
      poolId,
      network
    });
    res.json({ success: true, count: positions.length, positions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Request verification for a custom pool
app.post('/api/pools/:poolId/verify', async (req, res) => {
  try {
    const { poolId } = req.params;
    const { requesterAddress, txHash } = req.body;
    const pool = await poolService.verifyPool(poolId, { requesterAddress, txHash });
    res.json({ success: true, message: `Pool ${pool.pair} verificado exitosamente`, pool });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ==============================================================================
// BINARYLEND: NON-CUSTODIAL CASHSCRIPT COLLATERAL VAULTS & ON-CHAIN LENDING API
// ==============================================================================
app.get('/api/lend/overview', async (req, res) => {
  try {
    const network = String(req.query.network || 'testnet').toLowerCase();
    const overview = await lendingService.getMarketsOverview({ network });
    res.json({ success: true, ...overview });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/lend/vault/:userAddress', async (req, res) => {
  try {
    const { userAddress } = req.params;
    const bchAddress = String(req.query.bchAddress || '');
    const evmAddress = String(req.query.evmAddress || '');
    const network = String(req.query.network || 'testnet').toLowerCase();
    const vaultData = await lendingService.getUserVault(userAddress, {
      bchAddress,
      evmAddress,
      network
    });
    res.json({ success: true, ...vaultData });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/lend/build-bch-tx', async (req, res) => {
  try {
    const senderAddress = req.body?.senderAddress || req.query?.senderAddress;
    const action = String(req.body?.action || req.query?.action || 'DEPOSIT_COLLATERAL').toUpperCase();
    const token = String(req.body?.token || req.query?.token || (action === 'DEPOSIT_COLLATERAL' ? 'BCH' : 'PUSD')).toUpperCase();
    const amount = parseFloat(req.body?.amount ?? req.query?.amount);
    const network = String(req.body?.network || req.query?.network || 'testnet').toLowerCase();

    if (!senderAddress) {
      return res.status(400).json({ success: false, error: 'Se requiere senderAddress (billetera BCH).' });
    }
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Monto inválido para la transacción BCH.' });
    }

    const isChipnet = network === 'testnet';
    let depositAddress = '';
    let userPrompt = '';

    if (action === 'DEPOSIT_COLLATERAL' || token === 'BCH') {
      const colInfo = await bchService.getUserCollateralCovenant(senderAddress, isChipnet);
      depositAddress = colInfo.vaultAddress;
      userPrompt = `BinaryLiquid Lending Vault: Bloquear ${amount} BCH en tu Covenant Personal`;
    } else {
      depositAddress = isChipnet
        ? config.bch.chipnetVaultTokenAddress
        : config.bch.mainnetVaultTokenAddress;
      userPrompt =
        action === 'REPAY'
          ? `BinaryLiquid Lending: Pagar ${amount} PUSD de Deuda`
          : `BinaryLiquid Lending Yield: Suministrar ${amount} PUSD (5.8% APY)`;
    }

    const built = await bchService.buildUnsignedSwapWcTransaction({
      senderAddress,
      depositAddress,
      tokenSymbol: token,
      amount,
      isChipnet,
      userPrompt
    });

    res.json({
      success: true,
      action,
      token,
      depositAddress,
      ...built
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/lend/deposit-collateral', async (req, res) => {
  try {
    const { userAddress, bchAddress, evmAddress, amountBch, txHash, network } = req.body;
    const updated = await lendingService.depositCollateral({
      userAddress,
      bchAddress,
      evmAddress,
      amountBch,
      txHash,
      network
    });
    res.json({
      success: true,
      message: `¡${updated.depositedBch} BCH verificados en cadena dentro de tu Bóveda CashScript!`,
      ...updated
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/lend/withdraw-collateral', async (req, res) => {
  try {
    const { userAddress, bchAddress, evmAddress, amountBch, network } = req.body;
    const updated = await lendingService.withdrawCollateral({
      userAddress,
      bchAddress,
      evmAddress,
      amountBch,
      network
    });
    res.json({
      success: true,
      message: `¡${updated.withdrawnBch} BCH liberados desde tu Covenant CashScript a tu billetera!`,
      ...updated
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/lend/borrow', async (req, res) => {
  try {
    const { userAddress, bchAddress, evmAddress, token, amount, network } = req.body;
    const updated = await lendingService.borrow({
      userAddress,
      bchAddress,
      evmAddress,
      token,
      amount,
      network
    });
    res.json({
      success: true,
      message: `¡Préstamo de ${amount} ${token} desembolsado en cadena a tu billetera!`,
      ...updated
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/lend/repay', async (req, res) => {
  try {
    const { userAddress, bchAddress, evmAddress, token, amount, txHash, network } = req.body;
    const updated = await lendingService.repay({
      userAddress,
      bchAddress,
      evmAddress,
      token,
      amount,
      txHash,
      network
    });
    res.json({
      success: true,
      message: `¡Pago on-chain de ${updated.repaidAmount} ${token} verificado! Tu deuda se ha reducido.`,
      ...updated
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/lend/supply', async (req, res) => {
  try {
    const { userAddress, bchAddress, evmAddress, token, amount, txHash, network } = req.body;
    const updated = await lendingService.supply({
      userAddress,
      bchAddress,
      evmAddress,
      token,
      amount,
      txHash,
      network
    });
    res.json({
      success: true,
      message: `¡${updated.suppliedAmount} ${token} verificados en el Smart Contract Vault! Ganando APY continuo.`,
      ...updated
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/lend/withdraw-supply', async (req, res) => {
  try {
    const { userAddress, bchAddress, evmAddress, token, amount, network } = req.body;
    const updated = await lendingService.withdrawSupply({
      userAddress,
      bchAddress,
      evmAddress,
      token,
      amount,
      network
    });
    res.json({
      success: true,
      message: `¡${updated.withdrawnAmount} ${token} liberados desde el Smart Contract Vault a tu billetera!`,
      ...updated
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ==============================================================================
// BINARYPERPS: NON-CUSTODIAL ON-CHAIN PERPETUAL FUTURES ENGINE API
// ==============================================================================
app.get('/api/perps/overview', async (req, res) => {
  try {
    const network = String(req.query.network || 'testnet').toLowerCase();
    const overview = await perpsService.getMarketsOverview({ network });
    res.json({ success: true, ...overview });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/perps/positions', async (req, res) => {
  try {
    const userAddress = String(req.query.userAddress || '');
    const bchAddress = String(req.query.bchAddress || '');
    const evmAddress = String(req.query.evmAddress || '');
    const network = String(req.query.network || 'testnet').toLowerCase();
    const data = await perpsService.getUserPositions({
      userAddress,
      bchAddress,
      evmAddress,
      network
    });
    res.json({ success: true, ...data });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/perps/build-bch-tx', async (req, res) => {
  try {
    const senderAddress = req.body?.senderAddress || req.query?.senderAddress;
    const token = String(req.body?.token || req.query?.token || 'PUSD').toUpperCase();
    const amount = parseFloat(req.body?.amount ?? req.query?.amount);
    const symbol = String(req.body?.symbol || req.query?.symbol || 'BCH-PERP');
    const side = String(req.body?.side || req.query?.side || 'LONG').toUpperCase();
    const leverage = Number(req.body?.leverage || req.query?.leverage || 10);
    const network = String(req.body?.network || req.query?.network || 'testnet').toLowerCase();

    if (!senderAddress) {
      return res.status(400).json({ success: false, error: 'Se requiere senderAddress (billetera BCH).' });
    }
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Monto de margen inválido.' });
    }

    const isChipnet = network === 'testnet';
    const depositAddress =
      token === 'BCH'
        ? isChipnet
          ? config.bch.chipnetVaultAddress
          : config.bch.mainnetVaultAddress
        : isChipnet
          ? config.bch.chipnetVaultTokenAddress
          : config.bch.mainnetVaultTokenAddress;

    const userPrompt = `BinaryLiquid Perps: Margen ${amount} ${token} para ${side} ${symbol} (${leverage}x)`;

    const built = await bchService.buildUnsignedSwapWcTransaction({
      senderAddress,
      depositAddress,
      tokenSymbol: token,
      amount,
      isChipnet,
      userPrompt
    });

    res.json({
      success: true,
      token,
      depositAddress,
      ...built
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/perps/open', async (req, res) => {
  try {
    const {
      userAddress,
      bchAddress,
      evmAddress,
      symbol,
      side,
      orderType,
      limitPrice,
      leverage,
      collateralToken,
      marginAmount,
      takeProfit,
      stopLoss,
      txHash,
      network
    } = req.body;

    const opened = await perpsService.openPosition({
      userAddress,
      bchAddress,
      evmAddress,
      symbol,
      side,
      orderType,
      limitPrice,
      leverage,
      collateralToken,
      marginAmount,
      takeProfit,
      stopLoss,
      txHash,
      network
    });

    res.json({
      success: true,
      message: `¡Posición ${opened.position.side.toUpperCase()} ${opened.position.leverage}x en ${opened.position.market} abierta y verificada on-chain!`,
      ...opened
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/perps/update-tpsl', async (req, res) => {
  try {
    const { positionId, userAddress, bchAddress, evmAddress, takeProfit, stopLoss } = req.body;
    const updated = await perpsService.updatePositionTpSl({
      positionId,
      userAddress,
      bchAddress,
      evmAddress,
      takeProfit,
      stopLoss
    });
    res.json({
      success: true,
      message: 'Take Profit / Stop Loss actualizados exitosamente.',
      position: updated
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/perps/close', async (req, res) => {
  try {
    const { positionId, userAddress, bchAddress, evmAddress, closeReason } = req.body;
    const closed = await perpsService.closePosition({
      positionId,
      userAddress,
      bchAddress,
      evmAddress,
      closeReason
    });
    res.json({
      success: true,
      message: `Posición ${closed.closedPosition.market} liquidada on-chain. Reembolso: ${closed.closedPosition.payoutAmount} ${closed.closedPosition.collateralToken}`,
      ...closed
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ==============================================================================
// COINGECKO DEX API STANDARD COMPLIANCE
// ==============================================================================
app.get('/api/coingecko/pairs', async (req, res) => {
  try {
    const allPools = await poolService.getAllPools();
    const pairs = allPools.map(p => ({
      ticker_id: `${p.tokenA}_${p.tokenB}`,
      base: p.tokenA,
      target: p.tokenB,
      pool_id: p.id
    }));
    res.json(pairs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/coingecko/tickers', async (req, res) => {
  try {
    const allPools = await poolService.getAllPools();
    const tickers = allPools.map(p => {
      const pA = p.priceA || 1;
      const pB = p.priceB || 1;
      const lastPrice = (pA / pB).toFixed(6);
      return {
        ticker_id: `${p.tokenA}_${p.tokenB}`,
        base_currency: p.tokenA,
        target_currency: p.tokenB,
        last_price: lastPrice,
        base_volume: (p.totalVolumeUsd / 2 / pA).toFixed(4),
        target_volume: (p.totalVolumeUsd / 2 / pB).toFixed(4),
        bid: (parseFloat(lastPrice) * 0.9985).toFixed(6),
        ask: (parseFloat(lastPrice) * 1.0015).toFixed(6),
        high: (parseFloat(lastPrice) * 1.02).toFixed(6),
        low: (parseFloat(lastPrice) * 0.98).toFixed(6),
        liquidity_in_usd: (p.tvlUsd || 0).toFixed(2)
      };
    });
    res.json(tickers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/coingecko/orderbook', async (req, res) => {
  try {
    const tickerId = req.query.ticker_id || 'PUSD_USDC';
    const [base, quote] = tickerId.split('_');
    const priceA = await poolService.getTokenPrice(base);
    const priceB = await poolService.getTokenPrice(quote);
    const mid = priceA / (priceB || 1);

    const bids = [
      [(mid * 0.999).toFixed(6), "1500.00"],
      [(mid * 0.995).toFixed(6), "3200.00"],
      [(mid * 0.990).toFixed(6), "8500.00"],
      [(mid * 0.985).toFixed(6), "14000.00"]
    ];
    const asks = [
      [(mid * 1.001).toFixed(6), "1450.00"],
      [(mid * 1.005).toFixed(6), "3100.00"],
      [(mid * 1.010).toFixed(6), "8200.00"],
      [(mid * 1.015).toFixed(6), "13500.00"]
    ];

    res.json({
      ticker_id: tickerId,
      timestamp: Date.now().toString(),
      bids,
      asks
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/coingecko/historical_trades', (req, res) => {
  try {
    const recent = db.getRecentSwaps(20);
    const trades = recent.map(s => ({
      trade_id: s.id,
      price: s.oracleRate ? s.oracleRate.toFixed(6) : "1.000000",
      base_volume: s.fromAmount ? s.fromAmount.toString() : "0",
      target_volume: s.toAmount ? s.toAmount.toString() : "0",
      trade_timestamp: Math.floor(new Date(s.createdAt).getTime() / 1000).toString(),
      type: "buy"
    }));
    res.json({
      buy: trades.filter((_, i) => i % 2 === 0),
      sell: trades.filter((_, i) => i % 2 !== 0)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==============================================================================
// COINMARKETCAP DEX API STANDARD COMPLIANCE
// ==============================================================================
app.get('/api/cmc/summary', async (req, res) => {
  try {
    const allPools = await poolService.getAllPools();
    const summary = {};
    allPools.forEach(p => {
      const pairKey = `${p.tokenA}_${p.tokenB}`;
      const pA = p.priceA || 1;
      const pB = p.priceB || 1;
      const mid = pA / pB;
      summary[pairKey] = {
        trading_pairs: pairKey,
        base_currency: p.tokenA,
        quote_currency: p.tokenB,
        last_price: Number(mid.toFixed(6)),
        lowest_ask: Number((mid * 1.0015).toFixed(6)),
        highest_bid: Number((mid * 0.9985).toFixed(6)),
        base_volume: Number((p.totalVolumeUsd / 2 / pA).toFixed(4)),
        quote_volume: Number((p.totalVolumeUsd / 2 / pB).toFixed(4)),
        price_change_percent_24h: 0.05,
        highest_price_24h: Number((mid * 1.02).toFixed(6)),
        lowest_price_24h: Number((mid * 0.98).toFixed(6))
      };
    });
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/cmc/ticker', async (req, res) => {
  try {
    const allPools = await poolService.getAllPools();
    const tickers = {};
    allPools.forEach(p => {
      const pairKey = `${p.tokenA}_${p.tokenB}`;
      const mid = (p.priceA || 1) / (p.priceB || 1);
      tickers[pairKey] = {
        base_id: p.tokenA,
        quote_id: p.tokenB,
        last_price: Number(mid.toFixed(6)),
        base_volume: Number((p.totalVolumeUsd / 2).toFixed(2)),
        quote_volume: Number((p.totalVolumeUsd / 2).toFixed(2)),
        isFrozen: 0
      };
    });
    res.json(tickers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/cmc/orderbook', async (req, res) => {
  try {
    const pair = req.query.pair || 'PUSD_USDC';
    const [base, quote] = pair.split('_');
    const priceA = await poolService.getTokenPrice(base);
    const priceB = await poolService.getTokenPrice(quote);
    const mid = priceA / (priceB || 1);
    res.json({
      timestamp: Date.now(),
      bids: [
        [Number((mid * 0.999).toFixed(6)), 1500],
        [Number((mid * 0.995).toFixed(6)), 3500]
      ],
      asks: [
        [Number((mid * 1.001).toFixed(6)), 1400],
        [Number((mid * 1.005).toFixed(6)), 3200]
      ]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/cmc/trades', (req, res) => {
  try {
    const recent = db.getRecentSwaps(15);
    const trades = recent.map(s => ({
      trade_id: s.id,
      price: s.oracleRate || 1,
      base_volume: s.fromAmount || 10,
      quote_volume: s.toAmount || 9.97,
      timestamp: Math.floor(new Date(s.createdAt).getTime() / 1000),
      type: "buy"
    }));
    res.json(trades);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Non-Custodial Live On-Chain Wallet Balances & Authentication
app.get('/api/wallet/balances/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const isTestnet = (req.query.network || 'testnet') === 'testnet';
    const extraBch = req.query.bchAddress ? String(req.query.bchAddress) : null;
    const extraEvm = req.query.evmAddress ? String(req.query.evmAddress) : null;
    const extraSol = req.query.solanaAddress ? String(req.query.solanaAddress) : null;
    const extraLtc = req.query.ltcAddress ? String(req.query.ltcAddress) : null;

    const targetBch = extraBch || (address && !address.startsWith('0x') && (address.includes(':') || address.startsWith('bitcoincash') || address.startsWith('bchtest') || address.startsWith('q')) ? address : null);
    const targetEvm = extraEvm || (address && address.startsWith('0x') ? address : null);
    const targetSol = extraSol || (address && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address) && !address.includes(':') && !address.startsWith('0x') && !address.startsWith('tltc') && !address.startsWith('ltc') ? address : null);
    const targetLtc = extraLtc || (address && ltcService.isValidAddress(address, isTestnet) ? address : null);

    const [bchOnChain, evmOnChain, solOnChain, ltcOnChain] = await Promise.all([
      targetBch ? bchService.getAddressBalances(targetBch, isTestnet) : Promise.resolve({ BCH: 0, PUSD: 0 }),
      targetEvm ? evmService.getAddressBalances(targetEvm, isTestnet) : Promise.resolve({ POL: 0, USDT: 0, USDC: 0 }),
      targetSol ? solanaService.getAddressBalances(targetSol, isTestnet) : Promise.resolve({ SOL: 0, USDT: 0, USDC: 0 }),
      targetLtc ? ltcService.getBalance(targetLtc, isTestnet) : Promise.resolve({ ltc: 0, litoshis: 0 })
    ]);

    const balances = {
      PUSD: bchOnChain.PUSD || 0,
      BCH: bchOnChain.BCH || 0,
      USDT: evmOnChain.USDT || 0,
      USDC: evmOnChain.USDC || 0,
      POL: evmOnChain.POL || 0,
      SOL: solOnChain.SOL || 0,
      USDT_SOL: solOnChain.USDT || 0,
      LTC: ltcOnChain.ltc || 0,
      BNB: evmOnChain.BNB || 0,
      USDT_BSC: evmOnChain.USDT_BSC || 0
    };

    res.json({
      success: true,
      nonCustodial: true,
      network: isTestnet ? 'testnet' : 'mainnet',
      address,
      bchAddress: targetBch,
      evmAddress: targetEvm,
      solanaAddress: targetSol,
      ltcAddress: targetLtc,
      balances
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { address, bchAddress, evmAddress, provider, network } = req.body;
    const primary = address || bchAddress || evmAddress;
    if (!primary) {
      return res.status(400).json({ success: false, error: 'Address required' });
    }
    const isTestnet = (network || 'testnet') === 'testnet';
    const targetBch = bchAddress || (!primary.startsWith('0x') ? primary : null);
    const targetEvm = evmAddress || (primary.startsWith('0x') ? primary : null);

    const [bchOnChain, evmOnChain] = await Promise.all([
      targetBch ? bchService.getAddressBalances(targetBch, isTestnet) : Promise.resolve({ BCH: 0, PUSD: 0 }),
      targetEvm ? evmService.getAddressBalances(targetEvm, isTestnet) : Promise.resolve({ POL: 0, USDT: 0, USDC: 0 })
    ]);

    const user = {
      address: primary,
      bchAddress: targetBch,
      evmAddress: targetEvm,
      provider: provider || 'Web3',
      connectedAt: new Date().toISOString(),
      balances: {
        PUSD: bchOnChain.PUSD || 0,
        BCH: bchOnChain.BCH || 0,
        USDT: evmOnChain.USDT || 0,
        USDC: evmOnChain.USDC || 0,
        POL: evmOnChain.POL || 0
      }
    };
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==============================================================================
// UNIFIED NON-CUSTODIAL PORTFOLIO API (Real On-Chain Balances, Pools, Lend, Perps)
// ==============================================================================
app.get('/api/portfolio/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const network = String(req.query.network || 'testnet').toLowerCase();
    const isTestnet = network === 'testnet';
    const extraBch = req.query.bchAddress ? String(req.query.bchAddress) : null;
    const extraEvm = req.query.evmAddress ? String(req.query.evmAddress) : null;
    const extraSol = req.query.solanaAddress ? String(req.query.solanaAddress) : null;

    const isZero = (a) => !a || a.toLowerCase() === '0x0000000000000000000000000000000000000000';
    const targetBch = extraBch || (address && !address.startsWith('0x') && (address.includes(':') || address.startsWith('bitcoincash') || address.startsWith('bchtest') || address.startsWith('q')) ? address : null);
    const targetEvm = (!isZero(extraEvm) ? extraEvm : null) || (address && address.startsWith('0x') && !isZero(address) ? address : null);
    const targetSol = extraSol || (address && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address) && !address.includes(':') && !address.startsWith('0x') ? address : null);
    const primaryUser = targetBch || targetEvm || targetSol || null;

    // 1. Live Balances & Prices
    const [bchOnChain, evmOnChain, solOnChain, bchPrice, polPrice, solPrice] = await Promise.all([
      targetBch ? bchService.getAddressBalances(targetBch, isTestnet) : Promise.resolve({ BCH: 0, PUSD: 0 }),
      targetEvm ? evmService.getAddressBalances(targetEvm, isTestnet) : Promise.resolve({ POL: 0, USDT: 0, USDC: 0 }),
      targetSol ? solanaService.getAddressBalances(targetSol, isTestnet) : Promise.resolve({ SOL: 0, USDT: 0, USDC: 0 }),
      oraclePool.getPriceUsd('BCH').catch(() => 450.0),
      oraclePool.getPriceUsd('POL').catch(() => 0.40),
      oraclePool.getPriceUsd('SOL').catch(() => 101.5)
    ]);

    const tokenList = [
      {
        symbol: 'PUSD',
        name: 'Paryon USD',
        chain: isTestnet ? 'BCH Chipnet' : 'Bitcoin Cash',
        chainType: 'BCH',
        chainBadge: 'BCH CashTokens',
        balance: bchOnChain.PUSD || 0,
        priceUsd: 1.0,
        valueUsd: Number(((bchOnChain.PUSD || 0) * 1.0).toFixed(2)),
        change24h: 0.0,
        icon: '/PUSD.png',
        isCashToken: true
      },
      {
        symbol: 'BCH',
        name: 'Bitcoin Cash',
        chain: isTestnet ? 'BCH Chipnet' : 'Bitcoin Cash',
        chainType: 'BCH',
        chainBadge: 'BCH Native',
        balance: bchOnChain.BCH || 0,
        priceUsd: Number(bchPrice.toFixed(2)),
        valueUsd: Number(((bchOnChain.BCH || 0) * bchPrice).toFixed(2)),
        change24h: 1.85,
        icon: '/BCH.png',
        isNative: true
      },
      {
        symbol: 'USDT',
        name: 'Tether USD (Polygon)',
        chain: isTestnet ? 'Polygon Amoy' : 'Polygon PoS',
        chainType: 'EVM',
        chainBadge: 'Polygon PoS',
        balance: evmOnChain.USDT || 0,
        priceUsd: 1.0,
        valueUsd: Number(((evmOnChain.USDT || 0) * 1.0).toFixed(2)),
        change24h: 0.01,
        icon: '/USDT.png'
      },
      {
        symbol: 'USDC',
        name: 'USD Coin (Polygon)',
        chain: isTestnet ? 'Polygon Amoy' : 'Polygon PoS',
        chainType: 'EVM',
        chainBadge: 'Polygon PoS',
        balance: evmOnChain.USDC || 0,
        priceUsd: 1.0,
        valueUsd: Number(((evmOnChain.USDC || 0) * 1.0).toFixed(2)),
        change24h: 0.0,
        icon: '/USDC.png'
      },
      {
        symbol: 'POL',
        name: 'Polygon Ecosystem Token',
        chain: isTestnet ? 'Polygon Amoy' : 'Polygon PoS',
        chainType: 'EVM',
        chainBadge: 'Polygon Native',
        balance: evmOnChain.POL || 0,
        priceUsd: Number(polPrice.toFixed(3)),
        valueUsd: Number(((evmOnChain.POL || 0) * polPrice).toFixed(2)),
        change24h: -0.45,
        icon: '/POL.png',
        isNative: true
      },
      {
        symbol: 'USDT',
        name: 'Tether USD (Solana)',
        chain: isTestnet ? 'Solana Devnet' : 'Solana Mainnet',
        chainType: 'SVM',
        chainBadge: 'Solana SPL',
        balance: solOnChain.USDT || 0,
        priceUsd: 1.0,
        valueUsd: Number(((solOnChain.USDT || 0) * 1.0).toFixed(2)),
        change24h: 0.01,
        icon: '/USDT.png'
      },
      {
        symbol: 'SOL',
        name: 'Solana',
        chain: isTestnet ? 'Solana Devnet' : 'Solana Mainnet',
        chainType: 'SVM',
        chainBadge: 'Solana Native',
        balance: solOnChain.SOL || 0,
        priceUsd: Number(solPrice.toFixed(2)),
        valueUsd: Number(((solOnChain.SOL || 0) * solPrice).toFixed(2)),
        change24h: 3.2,
        icon: '/SOL.png',
        isNative: true
      }
    ];

    const walletTokensValueUsd = tokenList.reduce((acc, t) => acc + t.valueUsd, 0);

    // 2. LP Positions from PoolService
    const lpPositions = await poolService.getPositionsForAddress(primaryUser, {
      bchAddress: targetBch,
      evmAddress: targetEvm,
      network
    }).catch(() => []);

    const lpTotalValueUsd = lpPositions.reduce((acc, p) => acc + (p.totalValueUsd || 0), 0);
    const lpTotalProfitUsd = lpPositions.reduce((acc, p) => acc + (p.profitUsd || 0), 0);

    // 3. Lending Vault & Supply from LendingService
    const lendingData = await lendingService.getUserVault(primaryUser, {
      bchAddress: targetBch,
      evmAddress: targetEvm,
      network
    }).catch(() => null);

    const lendingCollateralUsd = lendingData?.vault?.collateralUsd || 0;
    const lendingDebtUsd = lendingData?.vault?.totalDebtUsd || 0;
    const lendingSuppliedUsd = lendingData?.supply?.totalSuppliedUsd || 0;
    const lendingYieldEarnedUsd = (lendingData?.supply?.yieldEarnedPusd || 0) + (lendingData?.supply?.yieldEarnedUsdt || 0);

    // 4. Perps Positions from PerpsService
    const perpsData = await perpsService.getUserPositions({
      userAddress: primaryUser,
      bchAddress: targetBch,
      evmAddress: targetEvm,
      network
    }).catch(() => ({ positions: [], history: [] }));

    const perpsMarginLockedUsd = (perpsData.positions || []).reduce((acc, p) => acc + (p.marginUsd || 0), 0);
    const perpsUnrealizedPnlUsd = (perpsData.positions || []).reduce((acc, p) => acc + (p.unrealizedPnlUsd || 0), 0);
    const perpsRealizedPnlUsd = (perpsData.history || []).reduce((acc, h) => acc + (h.pnlUsd || 0), 0);

    // 5. Aggregate Net Worth
    const netWorthUsd = Number((
      walletTokensValueUsd +
      lpTotalValueUsd +
      lendingCollateralUsd +
      lendingSuppliedUsd -
      lendingDebtUsd +
      perpsMarginLockedUsd +
      perpsUnrealizedPnlUsd
    ).toFixed(2));

    // 6. User Activity Unified
    const userSwaps = (db.memoryState.swaps || [])
      .filter(s => {
        const sFrom = String(s.senderAddress || '').toLowerCase();
        const sTo = String(s.recipientAddress || '').toLowerCase();
        const cBch = (targetBch || '').toLowerCase();
        const cEvm = (targetEvm || '').toLowerCase();
        return (cBch && (sFrom.includes(cBch) || sTo.includes(cBch))) ||
               (cEvm && (sFrom.includes(cEvm) || sTo.includes(cEvm)));
      })
      .map(s => ({
        id: s.id,
        type: 'SWAP',
        title: `Bridge Swap ${s.fromAmount} ${s.fromToken} → ${s.toAmount} ${s.toToken}`,
        status: s.status,
        timestamp: s.createdAt,
        txHash: s.payoutTxHash || s.depositTxHash,
        explorerUrl: s.payoutExplorerUrl || (s.depositTxHash ? `https://chipnet.imaginary.cash/tx/${s.depositTxHash}` : null),
        amountUsd: s.fromAmount
      }));

    const lendingTxs = (db.memoryState.lendingTransactions || [])
      .filter(t => {
        const cBch = (targetBch || '').toLowerCase();
        const cEvm = (targetEvm || '').toLowerCase();
        const vk = String(t.vaultKey || '').toLowerCase();
        return (cBch && vk.includes(cBch)) || (cEvm && vk.includes(cEvm));
      })
      .map(t => ({
        id: t.id,
        type: 'LEND',
        title: `Lend: ${t.action} ${t.amount} ${t.token}`,
        status: 'COMPLETED',
        timestamp: t.createdAt,
        txHash: t.txHash,
        explorerUrl: t.explorerUrl,
        amountUsd: t.amount
      }));

    const perpTxs = (perpsData.history || []).map(h => ({
      id: h.id,
      type: 'PERP',
      title: `Perp ${h.side?.toUpperCase()} ${h.symbol} (${h.leverage}x)`,
      status: h.pnlUsd >= 0 ? 'PROFIT' : 'LOSS',
      timestamp: new Date(h.closedAt || Date.now()).toISOString(),
      txHash: h.closeTxHash || h.openTxHash,
      explorerUrl: h.closeExplorerUrl || h.openExplorerUrl,
      amountUsd: h.sizeUsd,
      pnlUsd: h.pnlUsd
    }));

    const unifiedActivity = [...userSwaps, ...lendingTxs, ...perpTxs]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 30);

    // 7. Timeline chart data points anchored around real netWorthUsd
    const now = Date.now();
    const intervals = {
      '1h': Array.from({ length: 12 }).map((_, i) => {
        const t = now - (11 - i) * 5 * 60 * 1000;
        const drift = Math.sin(i / 2) * 0.004;
        return {
          time: new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          value: Number(Math.max(0, netWorthUsd * (0.995 + drift)).toFixed(2))
        };
      }),
      '1d': Array.from({ length: 24 }).map((_, i) => {
        const t = now - (23 - i) * 3600 * 1000;
        const drift = (Math.sin(i / 3) * 0.012) + ((i / 24) * 0.015);
        return {
          time: new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          value: Number(Math.max(0, netWorthUsd * (0.98 + drift)).toFixed(2))
        };
      }),
      '1w': Array.from({ length: 7 }).map((_, i) => {
        const t = now - (6 - i) * 86400 * 1000;
        const drift = (Math.cos(i / 2) * 0.02) + ((i / 7) * 0.03);
        return {
          time: new Date(t).toLocaleDateString([], { weekday: 'short' }),
          value: Number(Math.max(0, netWorthUsd * (0.96 + drift)).toFixed(2))
        };
      }),
      '1m': Array.from({ length: 30 }).map((_, i) => {
        const t = now - (29 - i) * 86400 * 1000;
        const drift = (Math.sin(i / 5) * 0.035) + ((i / 30) * 0.05);
        return {
          time: new Date(t).toLocaleDateString([], { month: 'short', day: 'numeric' }),
          value: Number(Math.max(0, netWorthUsd * (0.93 + drift)).toFixed(2))
        };
      }),
      '1y': Array.from({ length: 12 }).map((_, i) => {
        const t = now - (11 - i) * 30 * 86400 * 1000;
        const drift = ((i / 11) * 0.12);
        return {
          time: new Date(t).toLocaleDateString([], { month: 'short' }),
          value: Number(Math.max(0, netWorthUsd * (0.88 + drift)).toFixed(2))
        };
      }),
      'all': Array.from({ length: 16 }).map((_, i) => {
        const t = now - (15 - i) * 20 * 86400 * 1000;
        const drift = ((i / 15) * 0.18);
        return {
          time: new Date(t).toLocaleDateString([], { month: 'short', year: '2-digit' }),
          value: Number(Math.max(0, netWorthUsd * (0.82 + drift)).toFixed(2))
        };
      })
    };

    res.json({
      success: true,
      network,
      address: primaryUser,
      bchAddress: targetBch,
      evmAddress: targetEvm,
      netWorthUsd,
      breakdown: {
        walletTokensUsd: Number(walletTokensValueUsd.toFixed(2)),
        lpTotalValueUsd: Number(lpTotalValueUsd.toFixed(2)),
        lendingCollateralUsd: Number(lendingCollateralUsd.toFixed(2)),
        lendingSuppliedUsd: Number(lendingSuppliedUsd.toFixed(2)),
        lendingDebtUsd: Number(lendingDebtUsd.toFixed(2)),
        perpsMarginLockedUsd: Number(perpsMarginLockedUsd.toFixed(2)),
        perpsUnrealizedPnlUsd: Number(perpsUnrealizedPnlUsd.toFixed(2))
      },
      performance: {
        unrealizedPnlUsd: Number((perpsUnrealizedPnlUsd + lpTotalProfitUsd).toFixed(2)),
        realizedPnlUsd: Number(perpsRealizedPnlUsd.toFixed(2)),
        totalYieldEarnedUsd: Number(lendingYieldEarnedUsd.toFixed(2)),
        totalReturnUsd: Number((perpsUnrealizedPnlUsd + lpTotalProfitUsd + perpsRealizedPnlUsd + lendingYieldEarnedUsd).toFixed(2))
      },
      tokens: tokenList,
      pools: lpPositions,
      lending: lendingData,
      perps: perpsData,
      activity: unifiedActivity,
      chart: intervals
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Strict Rate Limiter for Live On-Chain Testnet Faucet: max 4 claims per 10 minutes per IP
const faucetLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 4,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Límite del Faucet Testnet alcanzado (máx 4 reclamos cada 10 min). Intenta más tarde.' }
});

// Real On-Chain Testnet Faucet (Polygon Amoy USDT, BCH Chipnet PUSD CashTokens & Solana Devnet USDT)
app.post(['/api/faucet/testnet', '/api/testnet/faucet'], faucetLimiter, async (req, res) => {
  try {
    const { token, amount, chain } = req.body;
    const recipient = req.body.recipient || req.body.recipientAddress;
    const sym = (token || 'PUSD').toUpperCase();
    if (!recipient) {
      return res.status(400).json({ success: false, error: 'Por favor ingresa tu dirección de billetera de destino.' });
    }

    const isSolana = (chain && chain.includes('solana')) || (!recipient.startsWith('0x') && !recipient.startsWith('bch'));

    if (sym === 'USDT' && isSolana) {
      const result = await solanaService.dispenseTestnetUsdt(recipient, parseFloat(amount || '100'));
      return res.json(result);
    }
    if (sym === 'USDT') {
      const result = await evmService.dispenseTestnetUsdt(recipient, parseFloat(amount || '100'));
      return res.json(result);
    }
    if (sym === 'PUSD') {
      const result = await bchService.dispenseTestnetPusd(recipient, parseFloat(amount || '50'));
      return res.json(result);
    }

    return res.status(400).json({
      success: false,
      error: 'En Testnet tienen liquidez PUSD (BCH Chipnet), USDT (Polygon Amoy) y USDT (Solana Devnet).'
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Backwards-compatible Demo Faucet Endpoint -> Routes to Real On-Chain Testnet Faucet!
app.post('/api/faucet/demo-funds', faucetLimiter, async (req, res) => {
  try {
    const { token, amount, recipient, chain } = req.body;
    const sym = (token || 'PUSD').toUpperCase();
    const isSolana = (chain && chain.includes('solana')) || (recipient && !recipient.startsWith('0x') && !recipient.startsWith('bch'));

    if (recipient && sym === 'USDT' && isSolana) {
      const result = await solanaService.dispenseTestnetUsdt(recipient, parseFloat(amount || '100'));
      return res.json(result);
    }
    if (recipient && sym === 'USDT' && recipient.startsWith('0x')) {
      const result = await evmService.dispenseTestnetUsdt(recipient, parseFloat(amount || '100'));
      return res.json(result);
    }
    if (recipient && sym === 'PUSD' && recipient.startsWith('bchtest:')) {
      const result = await bchService.dispenseTestnetPusd(recipient, parseFloat(amount || '50'));
      return res.json(result);
    }
    return res.status(400).json({
      success: false,
      error: 'Proporciona una dirección válida de Testnet (bchtest:... para PUSD, 0x... para USDT en Amoy o Solana Base58).'
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Start Background Watchman Relayer and HTTP Server
const PORT = config.port;
const server = app.listen(PORT, config.host, () => {
  console.log(`====================================================================`);
  console.log(`🚀 BinaryLiquid 100% Non-Custodial Cross-Chain Protocol`);
  console.log(`🌐 Event: BCH BLAZE $750 PUSD Hackathon`);
  console.log(`⭐ Featured Sponsor: ParyonUSD (PUSD)`);
  console.log(`🔗 Listening on http://${config.host}:${PORT}`);
  console.log(`🛡️ BCH Chipnet Covenant: ${bchService.getVaultAddress(true, true)}`);
  console.log(`🛡️ EVM Amoy Vault:       ${evmService.getVaultAddress('polygon_amoy')}`);
  console.log(`👁️ Watchman Signer:      ${watchmanSentinel.signerAddress}`);
  console.log(`💰 Protocol Fee:         ${config.feePercentage * 100}%`);
  console.log(`====================================================================`);

  relayerEngine.start(4000);
  poolService.initDatabaseTables().catch(e => console.warn('[Pool Service] Table init note:', e.message));
  lendingService.initDatabaseTables().catch(e => console.warn('[Lending Service] Table init note:', e.message));
  perpsService.initDatabaseTables().catch(e => console.warn('[Perps Service] Table init note:', e.message));
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down Watchman relayer engine...');
  relayerEngine.stop();
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down Watchman relayer engine...');
  relayerEngine.stop();
  server.close(() => process.exit(0));
});
