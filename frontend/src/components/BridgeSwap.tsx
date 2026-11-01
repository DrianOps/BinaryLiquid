import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowDownUp,
  ChevronDown,
  Settings,
  Droplets,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  X,
  Lock,
  Sparkles,
  QrCode,
  ArrowLeft,
  CheckCircle2,
  ClipboardPaste
} from 'lucide-react';
import TokenSelectModal, { SUPPORTED_TOKENS, TokenInfo } from './TokenSelectModal';
import { convertCashAddressNetwork, formatAddress, generateQrDataUrl } from '../utils/bchAddress';
import {
  executeWeb3VaultDeposit,
  executeBchSwapDeposit,
  hasActiveBchSigningCapability,
  DEPLOYED_TESTNET_CONTRACTS
} from '../services/walletConnectService';

interface BridgeSwapProps {
  userContext: any;
  userAddress: string;
  bchAddress?: string;
  evmAddress?: string;
  walletBalances?: {
    PUSD: number;
    BCH: number;
    USDT: number;
    USDC: number;
    POL: number;
  };
  onRefreshBalances?: () => void;
  onConnectWallet: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  backendUrl: string;
  onOpenLanding: () => void;
  lang: 'en' | 'es';
  platformNetwork?: 'mainnet' | 'testnet';
  onToggleNetwork?: (net: 'mainnet' | 'testnet') => void;
}

const UI_TEXT = {
  es: {
    swap: 'Swap',
    limit: 'Limit',
    pay: 'Pagar',
    receive: 'Recibir',
    receiveAt: 'Recibir en',
    balance: 'Saldo',
    max: 'MAX',
    paste: 'Pegar',
    myWallet: 'Mi wallet',
    targetPrice: 'Precio objetivo',
    market: 'Mercado',
    fee: 'Comisión',
    minReceived: 'Mínimo garantizado',
    contract: 'Contrato',
    slippage: 'Slippage máximo',
    faucet: 'Faucet',
    faucetClaim: 'Recibir 50 PUSD',
    faucetPlaceholder: 'Dirección Chipnet (bchtest:...)',
    noLiquidity: 'Sin Liquidez',
    mainnetNotice: 'Mainnet sin liquidez activa',
    switchToTestnet: 'Usar Testnet',
    connectBchToPay: 'Conectar Wallet BCH para pagar',
    connectEvmToPay: 'Conectar Wallet EVM para pagar',
    enterAmount: 'Ingresa un monto',
    enterDestination: 'Ingresa dirección para recibir',
    invalidDestination: 'Dirección de destino inválida',
    swapAction: 'Intercambiar',
    createLimitAction: 'Crear orden límite',
    signing: 'Confirmando en wallet...',
    settling: 'Liquidando en contrato...',
    completed: 'Intercambio completado',
    sentTo: 'Enviado a',
    newSwap: 'Nuevo intercambio',
    awaitingPayment: 'Esperando pago en contrato',
    autoDetectHint: 'Detección automática en tiempo real (~3s)',
    openPaytaca: 'Abrir en billetera BCH',
    copyAddress: 'Copiar contrato',
    manualTxToggle: '¿Ya enviaste? Verificar TXID',
    verifyNow: 'Verificar',
    back: 'Volver',
    openOrders: 'Órdenes abiertas',
    cancel: 'Cancelar',
    selectPayToken: 'Pagar con',
    selectReceiveToken: 'Recibir en'
  },
  en: {
    swap: 'Swap',
    limit: 'Limit',
    pay: 'Pay',
    receive: 'Receive',
    receiveAt: 'Receive at',
    balance: 'Balance',
    max: 'MAX',
    paste: 'Paste',
    myWallet: 'My wallet',
    targetPrice: 'Target price',
    market: 'Market',
    fee: 'Fee',
    minReceived: 'Min. received',
    contract: 'Contract',
    slippage: 'Max slippage',
    faucet: 'Faucet',
    faucetClaim: 'Claim 50 PUSD',
    faucetPlaceholder: 'Chipnet address (bchtest:...)',
    noLiquidity: 'No Liquidity',
    mainnetNotice: 'Mainnet liquidity paused',
    switchToTestnet: 'Switch to Testnet',
    connectBchToPay: 'Connect BCH Wallet to pay',
    connectEvmToPay: 'Connect EVM Wallet to pay',
    enterAmount: 'Enter an amount',
    enterDestination: 'Enter destination address',
    invalidDestination: 'Invalid destination address',
    swapAction: 'Swap',
    createLimitAction: 'Place limit order',
    signing: 'Confirm in wallet...',
    settling: 'Settling on-chain...',
    completed: 'Swap completed',
    sentTo: 'Sent to',
    newSwap: 'New swap',
    awaitingPayment: 'Awaiting contract deposit',
    autoDetectHint: 'Live automatic UTXO detection (~3s)',
    openPaytaca: 'Open in BCH Wallet',
    copyAddress: 'Copy contract',
    manualTxToggle: 'Already sent? Verify TXID',
    verifyNow: 'Verify',
    back: 'Back',
    openOrders: 'Open orders',
    cancel: 'Cancel',
    selectPayToken: 'Pay with',
    selectReceiveToken: 'Receive token'
  }
};

function getTokenChainId(symbol: string, isBch: boolean, isTestnet: boolean): string {
  if (isBch) return isTestnet ? 'bch_chipnet' : 'bch_mainnet';
  const s = symbol.toUpperCase();
  if (s === 'ETH') return 'ethereum_mainnet';
  if (s === 'SOL') return isTestnet ? 'solana_devnet' : 'solana_mainnet';
  if (s === 'BNB') return 'bsc_mainnet';
  return isTestnet ? 'polygon_amoy' : 'polygon_mainnet';
}

export default function BridgeSwap({
  userAddress,
  bchAddress = '',
  evmAddress = '',
  walletBalances,
  onRefreshBalances,
  onConnectWallet,
  showToast,
  backendUrl,
  lang,
  platformNetwork = 'testnet',
  onToggleNetwork
}: BridgeSwapProps) {
  const t = UI_TEXT[lang] || UI_TEXT.es;
  const isTestnet = platformNetwork === 'testnet';

  // Core Mode & Token Pair (Default: PUSD -> USDT)
  const [activeTab, setActiveTab] = useState<'swap' | 'limit'>('swap');
  const [sellToken, setSellToken] = useState<TokenInfo>(SUPPORTED_TOKENS[0]); // PUSD
  const [buyToken, setBuyToken] = useState<TokenInfo>(SUPPORTED_TOKENS[1]); // USDT
  const [tokenModalTarget, setTokenModalTarget] = useState<'sell' | 'buy' | null>(null);

  // Amounts & Destination
  const [amount, setAmount] = useState<string>('');
  const [recipientAddress, setRecipientAddress] = useState<string>('');
  const [targetRate, setTargetRate] = useState<string>('1.00');

  // Quote & UI Popovers
  const [quote, setQuote] = useState<any>(null);
  const [loadingQuote, setLoadingQuote] = useState<boolean>(false);
  const [detailsOpen, setDetailsOpen] = useState<boolean>(false);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [slippage, setSlippage] = useState<number>(0.5);
  const [customSlippage, setCustomSlippage] = useState<string>('');

  // Faucet Compact Drawer
  const [faucetOpen, setFaucetOpen] = useState<boolean>(false);
  const [faucetAddress, setFaucetAddress] = useState<string>('');
  const [claimingFaucet, setClaimingFaucet] = useState<boolean>(false);

  // Execution Lifecycle
  const [cardState, setCardState] = useState<'form' | 'deposit' | 'success'>('form');
  const [executing, setExecuting] = useState<boolean>(false);
  const [signingStep, setSigningStep] = useState<string>('');
  const [activeSwap, setActiveSwap] = useState<any>(null);
  const [manualTxOpen, setManualTxOpen] = useState<boolean>(false);
  const [txHashInput, setTxHashInput] = useState<string>('');
  const [verifyingTx, setVerifyingTx] = useState<boolean>(false);
  const [copiedContract, setCopiedContract] = useState<boolean>(false);

  // Limit Orders
  const [limitOrders, setLimitOrders] = useState<any[]>([]);

  // ==========================================================================
  // STRICT PAY-WALLET vs RECEIVE-ADDRESS SEPARATION
  // ==========================================================================
  const connectedBch = useMemo(() => {
    const raw = bchAddress || (userAddress && !userAddress.startsWith('0x') ? userAddress : '');
    if (!raw) return '';
    return convertCashAddressNetwork(raw, isTestnet, true);
  }, [bchAddress, userAddress, isTestnet]);

  const connectedEvm = useMemo(() => {
    const raw = evmAddress || (userAddress && userAddress.startsWith('0x') ? userAddress : '');
    return raw ? raw.trim() : '';
  }, [evmAddress, userAddress]);

  // Wallet that PAYS (`sellToken`)
  const payingWalletAddress = sellToken.isBch ? connectedBch : connectedEvm;
  const isPayingWalletConnected = Boolean(payingWalletAddress);

  // Optional secondary wallet ONLY used if user taps "Mi wallet" chip
  const optionalReceiveWallet = buyToken.isBch ? connectedBch : connectedEvm;

  // Live balance of the paying token
  const sellBalance = useMemo(() => {
    if (!isPayingWalletConnected || !walletBalances) return null;
    const sym = sellToken.symbol.toUpperCase() as keyof typeof walletBalances;
    return typeof walletBalances[sym] === 'number' ? walletBalances[sym] : 0;
  }, [isPayingWalletConnected, walletBalances, sellToken.symbol]);

  // Sync default faucet input with connected BCH wallet if empty
  useEffect(() => {
    if (connectedBch && !faucetAddress) {
      setFaucetAddress(connectedBch);
    }
  }, [connectedBch, faucetAddress]);

  // Keep pair liquidity-aware
  const isPairLiquid = useMemo(() => {
    if (!isTestnet) return false;
    const a = sellToken.symbol.toUpperCase();
    const b = buyToken.symbol.toUpperCase();
    return a !== b && (a === 'PUSD' || a === 'USDT') && (b === 'PUSD' || b === 'USDT');
  }, [isTestnet, sellToken.symbol, buyToken.symbol]);

  // Validate manually entered destination address (`Recibir en`)
  const normalizedRecipient = useMemo(() => {
    const raw = recipientAddress.trim();
    if (!raw) return '';
    if (buyToken.isBch) {
      if (raw.startsWith('0x')) return '';
      const candidate =
        raw.startsWith('bchtest:') || raw.startsWith('bitcoincash:')
          ? raw
          : `${isTestnet ? 'bchtest' : 'bitcoincash'}:${raw}`;
      const converted = convertCashAddressNetwork(candidate, isTestnet, true);
      if (isTestnet && !converted.startsWith('bchtest:')) return '';
      if (!isTestnet && !converted.startsWith('bitcoincash:')) return '';
      return converted.length > 24 ? converted : '';
    }
    return /^0x[a-fA-F0-9]{40}$/.test(raw) ? raw : '';
  }, [recipientAddress, buyToken.isBch, isTestnet]);

  const isRecipientValid = Boolean(normalizedRecipient);

  // ==========================================================================
  // LIVE ORACLE QUOTE
  // ==========================================================================
  const fetchQuote = useCallback(async () => {
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0 || !isPairLiquid) {
      setQuote(null);
      return;
    }

    setLoadingQuote(true);
    try {
      const res = await fetch(
        `${backendUrl}/api/quote?fromToken=${sellToken.symbol}&toToken=${buyToken.symbol}&amount=${parsed}&network=${platformNetwork}`
      );
      const data = await res.json();
      if (data.success && data.quote) {
        setQuote(data.quote);
      } else {
        setQuote(null);
      }
    } catch {
      setQuote(null);
    } finally {
      setLoadingQuote(false);
    }
  }, [amount, sellToken.symbol, buyToken.symbol, isPairLiquid, platformNetwork, backendUrl]);

  useEffect(() => {
    const timer = setTimeout(fetchQuote, 220);
    return () => clearTimeout(timer);
  }, [fetchQuote]);

  // ==========================================================================
  // LIMIT ORDERS FETCH
  // ==========================================================================
  const fetchLimitOrders = useCallback(async () => {
    if (!payingWalletAddress) {
      setLimitOrders([]);
      return;
    }
    try {
      const res = await fetch(
        `${backendUrl}/api/limit-orders?userAddress=${encodeURIComponent(payingWalletAddress)}`
      );
      const data = await res.json();
      if (data.success) {
        setLimitOrders(data.orders || []);
      }
    } catch {
      // silent
    }
  }, [backendUrl, payingWalletAddress]);

  useEffect(() => {
    if (activeTab === 'limit') {
      fetchLimitOrders();
    }
  }, [activeTab, fetchLimitOrders]);

  // ==========================================================================
  // LIVE AUTO-POLLING WHEN ON COVENANT QR SCREEN (`cardState === 'deposit'`)
  // ==========================================================================
  useEffect(() => {
    if (cardState !== 'deposit' || !activeSwap?.id || activeSwap.status === 'COMPLETED') {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${backendUrl}/api/swap/${activeSwap.id}`);
        const data = await res.json();
        if (data.success && data.swap) {
          setActiveSwap(data.swap);
          if (data.swap.status === 'COMPLETED') {
            setCardState('success');
            onRefreshBalances?.();
            showToast(
              lang === 'es'
                ? `¡${data.swap.toAmount} ${data.swap.toToken} enviados a destino!`
                : `${data.swap.toAmount} ${data.swap.toToken} sent to destination!`,
              'success'
            );
          }
        }
      } catch {
        // silent retry
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [cardState, activeSwap?.id, activeSwap?.status, backendUrl, onRefreshBalances, showToast, lang]);

  // ==========================================================================
  // ACTIONS
  // ==========================================================================
  const handleFlipTokens = () => {
    const prevSell = sellToken;
    const prevBuy = buyToken;
    setSellToken(prevBuy);
    setBuyToken(prevSell);
    setQuote(null);

    // Clear recipientAddress if it belongs to the previous chain format
    if (recipientAddress.trim()) {
      const wasEvmAddr = recipientAddress.trim().startsWith('0x');
      const nextNeedsBch = prevSell.isBch;
      if ((nextNeedsBch && wasEvmAddr) || (!nextNeedsBch && !wasEvmAddr)) {
        setRecipientAddress('');
      }
    }
  };

  const handleSelectToken = (token: TokenInfo) => {
    if (tokenModalTarget === 'sell') {
      if (token.symbol === buyToken.symbol) {
        handleFlipTokens();
      } else {
        setSellToken(token);
      }
    } else if (tokenModalTarget === 'buy') {
      if (token.symbol === sellToken.symbol) {
        handleFlipTokens();
      } else {
        setBuyToken(token);
        const wasEvm = recipientAddress.trim().startsWith('0x');
        if ((token.isBch && wasEvm) || (!token.isBch && recipientAddress && !wasEvm)) {
          setRecipientAddress('');
        }
      }
    }
    setTokenModalTarget(null);
  };

  const handlePasteRecipient = async () => {
    try {
      const clip = await navigator.clipboard.readText();
      if (clip && clip.trim()) {
        setRecipientAddress(clip.trim());
      }
    } catch {
      showToast(
        lang === 'es' ? 'Pega la dirección con Ctrl+V o mantén presionado' : 'Paste with Ctrl+V',
        'error'
      );
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedContract(true);
    setTimeout(() => setCopiedContract(false), 1800);
  };

  const handleClaimFaucet = async () => {
    const target = (faucetAddress || connectedBch || '').trim();
    if (!target) {
      showToast(t.faucetPlaceholder, 'error');
      return;
    }
    const cleanAddr = convertCashAddressNetwork(
      target.includes(':') ? target : `bchtest:${target}`,
      true,
      true
    );

    setClaimingFaucet(true);
    try {
      const res = await fetch(`${backendUrl}/api/testnet/faucet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientAddress: cleanAddr, amount: 50 })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Faucet error');

      showToast('50 PUSD enviados en BCH Chipnet', 'success');
      setFaucetOpen(false);
      setTimeout(() => onRefreshBalances?.(), 2000);
    } catch (err: any) {
      showToast(err.message || 'Error en Faucet', 'error');
    } finally {
      setClaimingFaucet(false);
    }
  };

  // ==========================================================================
  // 1-CLICK SWAP EXECUTION (PAY FROM CONNECTED WALLET -> RECEIVE AT DESTINATION)
  // ==========================================================================
  const handleSwap = async () => {
    if (!isPairLiquid) return;
    if (!isPayingWalletConnected) {
      onConnectWallet();
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      showToast(t.enterAmount, 'error');
      return;
    }
    if (!isRecipientValid) {
      showToast(t.invalidDestination, 'error');
      return;
    }

    setExecuting(true);
    setSigningStep(t.signing);

    try {
      const minOut = quote
        ? Number((quote.netPayout * (1 - slippage / 100)).toFixed(6))
        : 0;

      // 1. Create Non-Custodial Swap Order
      const createRes = await fetch(`${backendUrl}/api/swap/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromToken: sellToken.symbol,
          toToken: buyToken.symbol,
          fromChain: getTokenChainId(sellToken.symbol, sellToken.isBch, isTestnet),
          toChain: getTokenChainId(buyToken.symbol, buyToken.isBch, isTestnet),
          amount: parsedAmount,
          senderAddress: payingWalletAddress,
          recipientAddress: normalizedRecipient,
          slippage,
          minReceived: minOut
        })
      });
      const createData = await createRes.json();
      if (!createData.success || !createData.swap) {
        throw new Error(createData.error || 'No se pudo iniciar el intercambio');
      }

      const createdSwap = createData.swap;
      setActiveSwap(createdSwap);

      // 2A. Paying EVM Token (`USDT` -> `PUSD`): Direct 1-Click MetaMask / WC2 Deposit + Instant Settlement
      if (!sellToken.isBch) {
        const tokenAddress =
          createdSwap.tokenContractAddress ||
          (isTestnet ? DEPLOYED_TESTNET_CONTRACTS.amoyUsdtAddress : sellToken.categoryOrAddress || '');

        const { txHash } = await executeWeb3VaultDeposit({
          isTestnet,
          vaultAddress: createdSwap.depositAddress,
          tokenAddress,
          amount: Number(createdSwap.fromAmount),
          decimals: sellToken.decimals || 6,
          bchRecipient: normalizedRecipient,
          onStatus: msg => setSigningStep(msg)
        });

        setSigningStep(t.settling);
        const verifyRes = await fetch(`${backendUrl}/api/swap/${createdSwap.id}/verify-tx`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ txHash })
        });
        const verifyData = await verifyRes.json();
        if (!verifyData.success) {
          throw new Error(verifyData.error || 'Error liquidando en contrato destino');
        }

        setActiveSwap(verifyData.swap);
        setCardState('success');
        setAmount('');
        onRefreshBalances?.();
        showToast(t.completed, 'success');
        return;
      }

      // 2B. Paying BCH CashToken (`PUSD` -> `USDT`):
      // Try 1-Click WalletConnect V2 (`bch_signTransaction`) or Paytaca Extension first!
      if (hasActiveBchSigningCapability()) {
        try {
          const { txHash } = await executeBchSwapDeposit({
            backendUrl,
            buildEndpoint: `/api/swap/${createdSwap.id}/build-bch-tx`,
            senderAddress: payingWalletAddress,
            isTestnet,
            onStatus: msg => setSigningStep(msg)
          });

          setSigningStep(t.settling);
          const verifyRes = await fetch(`${backendUrl}/api/swap/${createdSwap.id}/verify-tx`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ txHash })
          });
          const verifyData = await verifyRes.json();
          if (!verifyData.success) {
            throw new Error(verifyData.error || 'Error liquidando USDT en Polygon');
          }

          setActiveSwap(verifyData.swap);
          setCardState('success');
          setAmount('');
          onRefreshBalances?.();
          showToast(t.completed, 'success');
          return;
        } catch (bchSignErr: any) {
          const msg = String(bchSignErr?.message || '').toLowerCase();
          if (msg.includes('reject') || msg.includes('cancel') || msg.includes('denied')) {
            throw new Error(lang === 'es' ? 'Firma cancelada en tu billetera BCH' : 'Signature cancelled');
          }
          // Fallback cleanly to Covenant URI/QR with live UTXO auto-detection
        }
      }

      // Read-only BCH session (e.g. WizardConnect xpub): show sleek Covenant payment sheet with auto-polling
      setManualTxOpen(false);
      setTxHashInput('');
      setCardState('deposit');
    } catch (err: any) {
      showToast(err.message || 'Error al ejecutar swap', 'error');
    } finally {
      setExecuting(false);
      setSigningStep('');
    }
  };

  // Manual or instant check on Covenant deposit screen
  const handleVerifyDeposit = async () => {
    if (!activeSwap?.id) return;
    setVerifyingTx(true);
    try {
      const res = await fetch(`${backendUrl}/api/swap/${activeSwap.id}/verify-tx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txHash: txHashInput.trim() })
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Aún no se detecta confirmación en el contrato');
      }
      setActiveSwap(data.swap);
      setCardState('success');
      setAmount('');
      onRefreshBalances?.();
      showToast(t.completed, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setVerifyingTx(false);
    }
  };

  // ==========================================================================
  // 1-CLICK LIMIT ORDER CREATION + DEPOSIT
  // ==========================================================================
  const handleCreateLimitOrder = async () => {
    if (!isPairLiquid) return;
    if (!isPayingWalletConnected) {
      onConnectWallet();
      return;
    }

    const parsedAmount = parseFloat(amount);
    const parsedRate = parseFloat(targetRate);
    if (!parsedAmount || parsedAmount <= 0 || !parsedRate || parsedRate <= 0) {
      showToast(t.enterAmount, 'error');
      return;
    }
    if (!isRecipientValid) {
      showToast(t.invalidDestination, 'error');
      return;
    }

    setExecuting(true);
    setSigningStep(t.signing);
    try {
      const createRes = await fetch(`${backendUrl}/api/limit-orders/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: payingWalletAddress,
          fromToken: sellToken.symbol,
          toToken: buyToken.symbol,
          fromChain: getTokenChainId(sellToken.symbol, sellToken.isBch, isTestnet),
          toChain: getTokenChainId(buyToken.symbol, buyToken.isBch, isTestnet),
          fromAmount: parsedAmount,
          targetRate: parsedRate,
          recipientAddress: normalizedRecipient
        })
      });
      const createData = await createRes.json();
      if (!createData.success || !createData.order) {
        throw new Error(createData.error || 'No se pudo crear la orden límite');
      }

      const order = createData.order;

      if (!sellToken.isBch) {
        const tokenAddress = isTestnet
          ? DEPLOYED_TESTNET_CONTRACTS.amoyUsdtAddress
          : sellToken.categoryOrAddress || '';
        const { txHash } = await executeWeb3VaultDeposit({
          isTestnet,
          vaultAddress: order.depositAddress,
          tokenAddress,
          amount: parsedAmount,
          decimals: sellToken.decimals || 6,
          bchRecipient: normalizedRecipient,
          onStatus: msg => setSigningStep(msg)
        });

        await fetch(`${backendUrl}/api/limit-orders/${order.id}/verify-tx`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ txHash })
        });
      } else if (hasActiveBchSigningCapability()) {
        const { txHash } = await executeBchSwapDeposit({
          backendUrl,
          buildEndpoint: `/api/limit-orders/${order.id}/build-bch-tx`,
          senderAddress: payingWalletAddress,
          isTestnet,
          onStatus: msg => setSigningStep(msg)
        });

        await fetch(`${backendUrl}/api/limit-orders/${order.id}/verify-tx`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ txHash })
        });
      }

      setAmount('');
      fetchLimitOrders();
      onRefreshBalances?.();
      showToast(
        lang === 'es' ? 'Orden límite activa en contrato' : 'Limit order active on-chain',
        'success'
      );
    } catch (err: any) {
      showToast(err.message || 'Error en orden límite', 'error');
    } finally {
      setExecuting(false);
      setSigningStep('');
    }
  };

  const handleCancelLimitOrder = async (orderId: string) => {
    try {
      const res = await fetch(`${backendUrl}/api/limit-orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress: payingWalletAddress })
      });
      const data = await res.json();
      if (data.success) {
        fetchLimitOrders();
        showToast(lang === 'es' ? 'Orden cancelada' : 'Order cancelled', 'success');
      }
    } catch {
      // silent
    }
  };

  // ==========================================================================
  // COMPUTED DISPLAY VALUES & PRIMARY CTA STATE
  // ==========================================================================
  const receiveDisplay = useMemo(() => {
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0 || !isPairLiquid) return '';
    if (activeTab === 'limit') {
      const r = parseFloat(targetRate) || 1;
      return (parsed * r * 0.997).toFixed(2);
    }
    if (quote?.netPayout !== undefined) {
      return Number(quote.netPayout).toFixed(2);
    }
    return '';
  }, [amount, isPairLiquid, activeTab, targetRate, quote]);

  const ctaConfig = useMemo(() => {
    if (!isPairLiquid) {
      return { label: t.noLiquidity, disabled: true, variant: 'muted' as const };
    }
    if (executing) {
      return { label: signingStep || t.signing, disabled: true, variant: 'primary' as const };
    }
    if (!isPayingWalletConnected) {
      return {
        label: sellToken.isBch ? t.connectBchToPay : t.connectEvmToPay,
        disabled: false,
        variant: 'connect' as const
      };
    }
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0) {
      return { label: t.enterAmount, disabled: true, variant: 'muted' as const };
    }
    if (!sellToken.isBch && sellBalance !== null && parsed > sellBalance) {
      return {
        label: lang === 'es' ? `Saldo ${sellToken.symbol} insuficiente` : `Insufficient ${sellToken.symbol}`,
        disabled: true,
        variant: 'muted' as const
      };
    }
    if (!recipientAddress.trim()) {
      return { label: t.enterDestination, disabled: true, variant: 'muted' as const };
    }
    if (!isRecipientValid) {
      return { label: t.invalidDestination, disabled: true, variant: 'muted' as const };
    }
    if (activeTab === 'swap' && quote && !quote.hasLiquidity) {
      return { label: t.noLiquidity, disabled: true, variant: 'muted' as const };
    }
    return {
      label:
        activeTab === 'swap'
          ? `${t.swapAction} ${sellToken.symbol} → ${buyToken.symbol}`
          : t.createLimitAction,
      disabled: false,
      variant: 'primary' as const
    };
  }, [
    isPairLiquid,
    executing,
    signingStep,
    t,
    isPayingWalletConnected,
    sellToken.isBch,
    sellToken.symbol,
    buyToken.symbol,
    amount,
    sellBalance,
    lang,
    recipientAddress,
    isRecipientValid,
    activeTab,
    quote
  ]);

  return (
    <div className="w-full max-w-[440px] mx-auto pt-2 sm:pt-6 pb-8">
      {/* Minimal Mainnet Switch Bar (only shown if user switched platform to Mainnet) */}
      {!isTestnet && (
        <div className="mb-3 px-3.5 py-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between text-xs">
          <span className="font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 shrink-0" />
            {t.mainnetNotice}
          </span>
          {onToggleNetwork && (
            <button
              type="button"
              onClick={() => onToggleNetwork('testnet')}
              className="px-2.5 py-1 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-950 font-semibold text-[11px] hover:opacity-90 transition cursor-pointer"
            >
              {t.switchToTestnet}
            </button>
          )}
        </div>
      )}

      {/* MAIN MINIMALIST SWAP CARD */}
      <div className="bg-white dark:bg-[#0F131A] border border-gray-200/80 dark:border-white/[0.07] rounded-[28px] p-3.5 sm:p-4 shadow-[0_12px_40px_rgba(0,0,0,0.04)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.45)]">
        {/* CARD TOP BAR */}
        {cardState === 'form' && (
          <div className="flex items-center justify-between px-1 pb-3">
            {/* Swap | Limit Segmented Control */}
            <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-gray-100/80 dark:bg-white/[0.04]">
              <button
                type="button"
                onClick={() => setActiveTab('swap')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'swap'
                    ? 'bg-white dark:bg-[#1C2230] text-gray-900 dark:text-white shadow-2xs'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {t.swap}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('limit')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'limit'
                    ? 'bg-white dark:bg-[#1C2230] text-gray-900 dark:text-white shadow-2xs'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {t.limit}
              </button>
            </div>

            {/* Subtle Utility Actions (Faucet + Slippage) */}
            <div className="flex items-center gap-1.5">
              {isTestnet && (
                <button
                  type="button"
                  onClick={() => {
                    setFaucetOpen(!faucetOpen);
                    setSettingsOpen(false);
                  }}
                  className={`h-8 px-2.5 rounded-xl text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                    faucetOpen
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : 'bg-gray-100/80 dark:bg-white/[0.04] text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                  title="Testnet PUSD Faucet"
                >
                  <Droplets className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{t.faucet}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setSettingsOpen(!settingsOpen);
                  setFaucetOpen(false);
                }}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                  settingsOpen
                    ? 'bg-primary/15 text-primary'
                    : 'bg-gray-100/80 dark:bg-white/[0.04] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
                title={t.slippage}
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* COMPACT FAUCET POPOVER */}
        {cardState === 'form' && faucetOpen && isTestnet && (
          <div className="mb-3 p-3 rounded-2xl bg-gray-50 dark:bg-[#161B24] border border-gray-200/70 dark:border-white/[0.06] space-y-2">
            <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
              <span className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-500" /> PUSD Chipnet Faucet
              </span>
              <button
                type="button"
                onClick={() => setFaucetOpen(false)}
                className="text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={faucetAddress}
                onChange={e => setFaucetAddress(e.target.value)}
                placeholder={t.faucetPlaceholder}
                className="flex-1 min-w-0 bg-white dark:bg-[#0F131A] border border-gray-200 dark:border-white/[0.07] rounded-xl px-2.5 py-1.5 text-xs font-mono text-gray-900 dark:text-white outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                disabled={claimingFaucet}
                onClick={handleClaimFaucet}
                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-semibold shrink-0 transition cursor-pointer"
              >
                {claimingFaucet ? '...' : t.faucetClaim}
              </button>
            </div>
          </div>
        )}

        {/* COMPACT SLIPPAGE POPOVER */}
        {cardState === 'form' && settingsOpen && (
          <div className="mb-3 p-3 rounded-2xl bg-gray-50 dark:bg-[#161B24] border border-gray-200/70 dark:border-white/[0.06] flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{t.slippage}</span>
            <div className="flex items-center gap-1">
              {[0.1, 0.5, 1.0].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    setSlippage(val);
                    setCustomSlippage('');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    slippage === val && !customSlippage
                      ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-950'
                      : 'bg-white dark:bg-[#0F131A] text-gray-600 dark:text-gray-400 border border-gray-200/70 dark:border-white/[0.06]'
                  }`}
                >
                  {val}%
                </button>
              ))}
              <input
                type="number"
                step="0.1"
                min="0.05"
                max="20"
                placeholder="Custom"
                value={customSlippage}
                onChange={e => {
                  setCustomSlippage(e.target.value);
                  const n = parseFloat(e.target.value);
                  if (!isNaN(n) && n > 0 && n <= 20) setSlippage(n);
                }}
                className="w-16 px-2 py-1 rounded-lg text-xs text-right bg-white dark:bg-[#0F131A] border border-gray-200/70 dark:border-white/[0.06] text-gray-900 dark:text-white outline-none"
              />
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* VIEW 1: CLEAN SWAP / LIMIT FORM                                  */}
        {/* ================================================================ */}
        {cardState === 'form' && (
          <div className="space-y-1.5">
            {/* PAY BOX (`sellToken` — Bound to Connected Paying Wallet) */}
            <div className="p-4 rounded-2xl bg-gray-50/90 dark:bg-[#161B24] border border-transparent focus-within:border-gray-300 dark:focus-within:border-white/[0.12] transition-colors">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
                <span className="font-medium">{t.pay}</span>
                {isPayingWalletConnected ? (
                  <div className="flex items-center gap-1.5">
                    <span>
                      {t.balance}:{' '}
                      <strong className="text-gray-700 dark:text-gray-200 font-semibold tabular-nums">
                        {sellBalance !== null ? sellBalance.toFixed(2) : '0.00'}
                      </strong>
                    </span>
                    {sellBalance !== null && sellBalance > 0 && (
                      <button
                        type="button"
                        onClick={() => setAmount(String(sellBalance))}
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-primary/15 text-primary hover:bg-primary/25 transition cursor-pointer"
                      >
                        {t.max}
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={onConnectWallet}
                    className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                  >
                    + {sellToken.isBch ? 'Wallet BCH' : 'Wallet EVM'}
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between gap-3">
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0"
                  className="w-full min-w-0 bg-transparent text-3xl font-semibold tracking-tight text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 outline-none tabular-nums"
                />

                <button
                  type="button"
                  onClick={() => setTokenModalTarget('sell')}
                  className="flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-full bg-white dark:bg-[#202736] hover:bg-gray-100 dark:hover:bg-[#283042] border border-gray-200/80 dark:border-white/[0.08] shadow-2xs shrink-0 transition cursor-pointer"
                >
                  <img
                    src={sellToken.icon}
                    alt={sellToken.symbol}
                    className="w-6 h-6 rounded-full object-contain"
                  />
                  <span className="font-bold text-sm text-gray-900 dark:text-white">
                    {sellToken.symbol}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </button>
              </div>

              <div className="flex items-center justify-between mt-1.5 text-[11px] text-gray-400 dark:text-gray-500">
                <span className="tabular-nums">
                  {amount && parseFloat(amount) > 0
                    ? `~$${(parseFloat(amount) * (quote?.priceFromUsd || 1)).toFixed(2)}`
                    : '$0.00'}
                </span>
                <span>{sellToken.isBch ? (isTestnet ? 'BCH Chipnet' : 'Bitcoin Cash') : isTestnet ? 'Polygon Amoy' : 'Polygon'}</span>
              </div>
            </div>

            {/* FLIP BUTTON */}
            <div className="relative h-2 flex items-center justify-center z-10">
              <button
                type="button"
                onClick={handleFlipTokens}
                aria-label="Invertir par"
                className="w-9 h-9 rounded-xl bg-white dark:bg-[#1A202C] hover:bg-gray-50 dark:hover:bg-[#232B3B] border-4 border-white dark:border-[#0F131A] shadow-xs flex items-center justify-center text-gray-600 dark:text-gray-300 hover:rotate-180 transition-all duration-200 cursor-pointer"
              >
                <ArrowDownUp className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* RECEIVE BOX (`buyToken`) */}
            <div className="p-4 rounded-2xl bg-gray-50/90 dark:bg-[#161B24] border border-transparent transition-colors">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
                <span className="font-medium">{t.receive}</span>
                {!isPairLiquid && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500">
                    {t.noLiquidity}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="w-full min-w-0 text-3xl font-semibold tracking-tight tabular-nums truncate">
                  {loadingQuote ? (
                    <span className="inline-block w-24 h-8 rounded-lg bg-gray-200/70 dark:bg-white/[0.06] animate-pulse align-middle" />
                  ) : receiveDisplay ? (
                    <span className="text-gray-900 dark:text-white">{receiveDisplay}</span>
                  ) : (
                    <span className="text-gray-300 dark:text-gray-600">0</span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setTokenModalTarget('buy')}
                  className="flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-full bg-white dark:bg-[#202736] hover:bg-gray-100 dark:hover:bg-[#283042] border border-gray-200/80 dark:border-white/[0.08] shadow-2xs shrink-0 transition cursor-pointer"
                >
                  <img
                    src={buyToken.icon}
                    alt={buyToken.symbol}
                    className="w-6 h-6 rounded-full object-contain"
                  />
                  <span className="font-bold text-sm text-gray-900 dark:text-white">
                    {buyToken.symbol}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </button>
              </div>

              <div className="flex items-center justify-between mt-1.5 text-[11px] text-gray-400 dark:text-gray-500">
                <span className="tabular-nums">
                  {receiveDisplay ? `~$${receiveDisplay}` : '$0.00'}
                </span>
                <span>{buyToken.isBch ? (isTestnet ? 'BCH Chipnet' : 'Bitcoin Cash') : isTestnet ? 'Polygon Amoy' : 'Polygon'}</span>
              </div>
            </div>

            {/* TARGET PRICE ROW (Only in Limit Tab) */}
            {activeTab === 'limit' && (
              <div className="px-4 py-3 rounded-2xl bg-gray-50/90 dark:bg-[#161B24] flex items-center justify-between gap-3">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  <div className="font-medium">{t.targetPrice}</div>
                  <button
                    type="button"
                    onClick={() => setTargetRate('1.00')}
                    className="text-[10px] text-primary font-semibold hover:underline cursor-pointer"
                  >
                    {t.market}: 1.00
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    step="0.001"
                    min="0.0001"
                    value={targetRate}
                    onChange={e => setTargetRate(e.target.value)}
                    className="w-24 bg-white dark:bg-[#0F131A] border border-gray-200/80 dark:border-white/[0.07] rounded-xl px-2.5 py-1.5 text-right text-sm font-semibold text-gray-900 dark:text-white outline-none tabular-nums"
                  />
                  <span className="text-xs font-semibold text-gray-500">{buyToken.symbol}</span>
                </div>
              </div>
            )}

            {/* DESTINATION ADDRESS INPUT (`Recibir en` — User manually pastes/enters destination!) */}
            <div className="px-4 py-3 rounded-2xl bg-gray-50/90 dark:bg-[#161B24] border border-transparent focus-within:border-gray-300 dark:focus-within:border-white/[0.12] transition-colors">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                  <span>
                    {t.receiveAt} ({buyToken.symbol})
                  </span>
                  {recipientAddress.trim() && isRecipientValid && (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  )}
                </label>

                <div className="flex items-center gap-1.5">
                  {optionalReceiveWallet &&
                    recipientAddress.trim().toLowerCase() !== optionalReceiveWallet.toLowerCase() && (
                      <button
                        type="button"
                        onClick={() => setRecipientAddress(optionalReceiveWallet)}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-gray-200/70 dark:bg-white/[0.06] text-gray-700 dark:text-gray-300 hover:bg-gray-300/70 dark:hover:bg-white/[0.1] transition cursor-pointer"
                      >
                        {t.myWallet}
                      </button>
                    )}
                  <button
                    type="button"
                    onClick={handlePasteRecipient}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-gray-200/70 dark:bg-white/[0.06] text-gray-700 dark:text-gray-300 hover:bg-gray-300/70 dark:hover:bg-white/[0.1] flex items-center gap-1 transition cursor-pointer"
                  >
                    <ClipboardPaste className="w-2.5 h-2.5" />
                    <span>{t.paste}</span>
                  </button>
                </div>
              </div>

              <input
                type="text"
                value={recipientAddress}
                onChange={e => setRecipientAddress(e.target.value)}
                placeholder={
                  buyToken.isBch
                    ? isTestnet
                      ? 'bchtest:q... / bchtest:z...'
                      : 'bitcoincash:q... / bitcoincash:z...'
                    : '0x...'
                }
                spellCheck={false}
                className="w-full bg-transparent text-xs font-mono text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 outline-none"
              />
            </div>

            {/* 1-LINE COLLAPSIBLE QUOTE SUMMARY */}
            {quote && isPairLiquid && parseFloat(amount) > 0 && (
              <div className="px-3.5 py-2.5 rounded-2xl border border-gray-100 dark:border-white/[0.05] text-xs">
                <button
                  type="button"
                  onClick={() => setDetailsOpen(!detailsOpen)}
                  className="w-full flex items-center justify-between text-gray-500 dark:text-gray-400 cursor-pointer"
                >
                  <span className="font-medium text-gray-700 dark:text-gray-300 tabular-nums">
                    1 {sellToken.symbol} = {quote.rate} {buyToken.symbol}
                  </span>
                  <span className="flex items-center gap-1.5 text-[11px]">
                    <span>{t.fee} 0.3%</span>
                    <span>•</span>
                    <span>~3s</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform ${detailsOpen ? 'rotate-180' : ''}`}
                    />
                  </span>
                </button>

                {detailsOpen && (
                  <div className="pt-2.5 mt-2.5 border-t border-gray-100 dark:border-white/[0.05] space-y-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                    <div className="flex justify-between">
                      <span>{t.minReceived} ({slippage}%)</span>
                      <span className="font-medium text-gray-800 dark:text-gray-200 tabular-nums">
                        {(quote.netPayout * (1 - slippage / 100)).toFixed(4)} {buyToken.symbol}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t.fee} (0.20% LP + 0.10% Protocol)</span>
                      <span className="font-medium text-gray-800 dark:text-gray-200 tabular-nums">
                        {quote.feeAmount} {buyToken.symbol}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t.contract}</span>
                      <span className="font-mono text-gray-700 dark:text-gray-300">
                        {sellToken.isBch ? 'BinaryLiquidEscrow.cash' : 'BinaryLiquidVault.sol'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* PRIMARY CTA BUTTON */}
            <div className="pt-1.5">
              <button
                type="button"
                disabled={ctaConfig.disabled}
                onClick={activeTab === 'swap' ? handleSwap : handleCreateLimitOrder}
                className={`w-full h-13 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                  ctaConfig.variant === 'primary'
                    ? 'bg-primary hover:brightness-105 text-black shadow-sm cursor-pointer'
                    : ctaConfig.variant === 'connect'
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-950 hover:opacity-95 cursor-pointer'
                    : 'bg-gray-100 dark:bg-white/[0.05] text-gray-400 dark:text-gray-500 cursor-not-allowed'
                }`}
              >
                {executing && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{ctaConfig.label}</span>
              </button>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* VIEW 2: MINIMALIST COVENANT PAYMENT FALLBACK (BCH Watch-Only QR) */}
        {/* ================================================================ */}
        {cardState === 'deposit' && activeSwap && (
          <div className="p-2 space-y-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCardState('form')}
                className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{t.back}</span>
              </button>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                <Loader2 className="w-3 h-3 animate-spin" />
                {t.awaitingPayment}
              </span>
            </div>

            <div className="text-center space-y-1">
              <div className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
                {activeSwap.fromAmount} {activeSwap.fromToken}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                → {activeSwap.toAmount} {activeSwap.toToken} ({formatAddress(activeSwap.recipientAddress)})
              </div>
            </div>

            {/* Clean QR of Unique Per-Swap P2SH32 Covenant */}
            <div className="flex flex-col items-center">
              <div className="p-3 bg-white rounded-2xl border border-gray-200 shadow-2xs">
                <img
                  src={generateQrDataUrl(activeSwap.depositAddress, 5, 2)}
                  alt="Covenant QR"
                  className="w-44 h-44 object-contain"
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-2.5">{t.autoDetectHint}</p>
            </div>

            {/* Copy / Deep-Link Actions */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleCopy(activeSwap.depositAddress)}
                className="h-10 rounded-xl bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200/70 dark:hover:bg-white/[0.1] text-xs font-semibold text-gray-800 dark:text-gray-200 flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                {copiedContract ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedContract ? 'Copiado' : t.copyAddress}</span>
              </button>

              <a
                href={activeSwap.depositAddress}
                className="h-10 rounded-xl bg-primary text-black text-xs font-bold flex items-center justify-center gap-1.5 hover:brightness-105 transition"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>{t.openPaytaca}</span>
              </a>
            </div>

            {/* Optional Collapsible Manual TXID Input */}
            <div className="pt-1 border-t border-gray-100 dark:border-white/[0.06]">
              <button
                type="button"
                onClick={() => setManualTxOpen(!manualTxOpen)}
                className="w-full text-center text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 py-1 cursor-pointer"
              >
                {t.manualTxToggle}
              </button>
              {manualTxOpen && (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="text"
                    value={txHashInput}
                    onChange={e => setTxHashInput(e.target.value)}
                    placeholder="TXID (64 hex)..."
                    className="flex-1 min-w-0 bg-gray-50 dark:bg-[#161B24] border border-gray-200 dark:border-white/[0.08] rounded-xl px-3 py-2 text-xs font-mono text-gray-900 dark:text-white outline-none"
                  />
                  <button
                    type="button"
                    disabled={verifyingTx}
                    onClick={handleVerifyDeposit}
                    className="px-3.5 py-2 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-950 text-xs font-semibold cursor-pointer disabled:opacity-50"
                  >
                    {verifyingTx ? '...' : t.verifyNow}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* VIEW 3: MINIMALIST SUCCESS RECEIPT                               */}
        {/* ================================================================ */}
        {cardState === 'success' && activeSwap && (
          <div className="p-3 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">{t.completed}</h3>
              <p className="text-2xl font-bold text-emerald-500 mt-1 tabular-nums">
                +{activeSwap.toAmount} {activeSwap.toToken}
              </p>
              <p className="text-xs text-gray-400 mt-1 font-mono">
                {t.sentTo}: {formatAddress(activeSwap.recipientAddress)}
              </p>
            </div>

            {activeSwap.payoutExplorerUrl && (
              <a
                href={activeSwap.payoutExplorerUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              >
                <span>Explorer TX</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            <button
              type="button"
              onClick={() => {
                setActiveSwap(null);
                setCardState('form');
              }}
              className="w-full h-11 rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-gray-950 font-bold text-xs hover:opacity-95 transition cursor-pointer"
            >
              {t.newSwap}
            </button>
          </div>
        )}
      </div>

      {/* COMPACT OPEN LIMIT ORDERS LIST */}
      {activeTab === 'limit' && limitOrders.length > 0 && (
        <div className="mt-4 bg-white dark:bg-[#0F131A] border border-gray-200/80 dark:border-white/[0.07] rounded-2xl p-3.5 space-y-2">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-1">
            {t.openOrders}
          </div>
          {limitOrders.slice(0, 5).map(order => (
            <div
              key={order.id}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-[#161B24] text-xs"
            >
              <div>
                <div className="font-semibold text-gray-900 dark:text-white tabular-nums">
                  {order.fromAmount} {order.fromToken} → {order.expectedOutput} {order.toToken}
                </div>
                <div className="text-[11px] text-gray-400 tabular-nums">
                  @ {order.targetRate} • {order.status}
                </div>
              </div>
              {order.status === 'OPEN' && (
                <button
                  type="button"
                  onClick={() => handleCancelLimitOrder(order.id)}
                  className="text-[11px] font-semibold text-rose-500 hover:underline cursor-pointer"
                >
                  {t.cancel}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* TOKEN SELECTOR MODAL */}
      <TokenSelectModal
        isOpen={tokenModalTarget !== null}
        onClose={() => setTokenModalTarget(null)}
        onSelect={handleSelectToken}
        selectedTokenSymbol={tokenModalTarget === 'sell' ? sellToken.symbol : buyToken.symbol}
        title={tokenModalTarget === 'sell' ? t.selectPayToken : t.selectReceiveToken}
        isTestnet={isTestnet}
      />
    </div>
  );
}
