import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowUpDown, 
  SlidersHorizontal, 
  ChevronDown, 
  ShieldCheck, 
  Clock, 
  ExternalLink, 
  CheckCircle2, 
  Flame, 
  Coins, 
  Copy, 
  Check, 
  Wallet, 
  RefreshCw, 
  Info, 
  Sparkles, 
  ArrowRight,
  QrCode,
  Activity,
  Layers,
  Send,
  Lock,
  Target,
  Trash2,
  AlertCircle,
  Clipboard,
  ArrowLeft,
  X,
  XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import TokenSelectModal, { TokenInfo, SUPPORTED_TOKENS } from './TokenSelectModal';

interface BridgeSwapProps {
  userContext: any;
  userAddress: string;
  onConnectWallet: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  backendUrl?: string;
  onOpenLanding?: () => void;
  lang?: 'en' | 'es';
}

const swapTranslations = {
  en: {
    tabSwap: 'Swap',
    tabLimit: 'Limit',
    tabPrivate: 'Private',
    settingsTitle: 'Swap Settings',
    slippageTolerance: 'Slippage Tolerance',
    slippageNotice: 'Fixed 0.3% protocol fee applies to maintain high-liquidity cross-chain vaults and relayer settlement guarantees.',
    sellLabel: 'Sell',
    sellLimitLabel: 'Sell (Limit Order)',
    buyLabel: 'Buy',
    network: 'Network',
    clear: 'Clear',
    targetRateTitle: 'Target Execution Price',
    marketRate: 'Market',
    expectedOutput: 'Expected Output at Target:',
    intraBchTitle: 'Intra-BCH Direct CashTokens (~2s)',
    intraBchBadge: 'Intra-BCH CashTokens Swap',
    intraBchFrictionless: 'Single Wallet • 0 Friction',
    autoSettling: 'Auto-Settling to your connected BCH wallet',
    destAddress: 'Destination Address',
    validFormat: 'Valid format',
    required: 'Required',
    fundsNotice: 'Funds will be delivered directly to this address',
    useConnected: 'Use Connected Wallet',
    paste: 'Paste',
    execMode: 'Execution Mode',
    directRelayer: 'Cross-Chain Relayer (~3s)',
    limitRelayer: 'Limit Order (Orderbook Relayer)',
    marketPrice: 'Market Rate',
    grossAmount: 'Estimated Gross Amount',
    totalFee: 'Total Bridge Fee (0.30%)',
    transparentBreakdown: '↳ Transparent breakdown:',
    feeSplit: '0.20% LPs • 0.10% Protocol',
    youReceive: 'You Receive (Real Net)',
    minGuaranteed: 'Guaranteed Minimum',
    enterAmount: 'Enter Amount',
    connectWallet: 'Connect Wallet',
    insufficientLiquidity: 'Insufficient Liquidity',
    placeLimitOrder: 'Place Limit Order',
    registeringLimit: 'Registering Limit Order...',
    swapNow: 'Swap Now',
    preparingRelayer: 'Preparing Relayer Intent...',
    limitOrdersTitle: 'My Limit Orders',
    monitoring247: 'Monitoring 24/7 by Relayer',
    copy: 'Copy',
    copied: 'Copied',
    orderLabel: 'Order:',
    back: 'Back',
    depositInstruction: 'Send exactly',
    toBridgeAddr: 'to the bridge address:',
    depositAddr: 'Deposit Address',
    hdSubaccount: '🔒 Dedicated HD sub-account for this order',
    txidLabel: 'Transaction Hash / TXID:',
    txidOptional: 'Optional for fast verification',
    txidPlaceholder: 'Paste your deposit TXID (e.g., 0x... or 64-char hash)',
    verifyDepositBtn: 'I Have Sent Funds • Verify Deposit',
    verifyingOnChain: 'Verifying Deposit on Blockchain...',
    swapSuccessTitle: 'Swap Successful!',
    swapSuccessDesc: 'Your funds have been settled and sent to your destination address',
    youSent: 'You Sent',
    tidBox: 'Transaction ID (TID)',
    destinationLabel: 'Destination:',
    viewExplorer: 'View on Block Explorer',
    newSwap: 'Make another Swap',
    txFailedTitle: 'Transaction Not Completed',
    txFailedDefault: 'An issue occurred while processing the order in the relayer.',
    requestedOp: 'Requested Operation:',
    fundsSafe: 'Your funds are safe (no debit occurred)',
    diagnosticLabel: 'Diagnostic:',
    retrySwap: 'Retry Swap',
    cancel: 'Cancel',
    zkTitle: 'Zero-Knowledge Private Swaps',
    zkDesc: 'Breaks the public link between your Bitcoin Cash source wallet and EVM/Solana recipient using disposable Stealth Addresses and ZK-SNARK batch relayers.',
    returnSwap: 'Return to Instant Swap'
  },
  es: {
    tabSwap: 'Swap',
    tabLimit: 'Límite',
    tabPrivate: 'Privado',
    settingsTitle: 'Ajustes del Swap',
    slippageTolerance: 'Tolerancia al Deslizamiento (Slippage)',
    slippageNotice: 'Se aplica una tarifa fija del 0.3% del protocolo para mantener bóvedas de alta liquidez y garantías de liquidación del relayer.',
    sellLabel: 'Vender',
    sellLimitLabel: 'Vender (Orden Límite)',
    buyLabel: 'Recibir',
    network: 'Red',
    clear: 'Limpiar',
    targetRateTitle: 'Precio Objetivo de Ejecución',
    marketRate: 'Mercado',
    expectedOutput: 'Retorno Esperado al Objetivo:',
    intraBchTitle: 'CashTokens Directo Intra-BCH (~2s)',
    intraBchBadge: 'Intercambio Intra-BCH CashTokens',
    intraBchFrictionless: 'Billetera Única • Cero Fricción',
    autoSettling: 'Liquidación directa a tu billetera BCH conectada',
    destAddress: 'Dirección de Destino',
    validFormat: 'Formato válido',
    required: 'Requerido',
    fundsNotice: 'Los fondos se entregarán directamente en esta dirección',
    useConnected: 'Usar Billetera Conectada',
    paste: 'Pegar',
    execMode: 'Modo de Ejecución',
    directRelayer: 'Relayer Cross-Chain (~3s)',
    limitRelayer: 'Orden Límite (Libro de Órdenes Relayer)',
    marketPrice: 'Tasa de Mercado',
    grossAmount: 'Monto Bruto Estimado',
    totalFee: 'Comisión Total del Puente (0.30%)',
    transparentBreakdown: '↳ Desglose transparente:',
    feeSplit: '0.20% LPs • 0.10% Protocolo',
    youReceive: 'Recibes (Neto Real)',
    minGuaranteed: 'Mínimo Garantizado',
    enterAmount: 'Ingresa un Monto',
    connectWallet: 'Conectar Billetera',
    insufficientLiquidity: 'Liquidez Insuficiente',
    placeLimitOrder: 'Crear Orden Límite',
    registeringLimit: 'Registrando Orden Límite...',
    swapNow: 'Intercambiar Ahora',
    preparingRelayer: 'Preparando Intención de Relayer...',
    limitOrdersTitle: 'Mis Órdenes Límite',
    monitoring247: 'Monitoreado 24/7 por el Relayer',
    copy: 'Copiar',
    copied: 'Copiado',
    orderLabel: 'Orden:',
    back: 'Volver',
    depositInstruction: 'Envía exactamente',
    toBridgeAddr: 'a la dirección del puente:',
    depositAddr: 'Dirección de Depósito',
    hdSubaccount: '🔒 Sub-cuenta HD dedicada para esta orden',
    txidLabel: 'Hash de Transacción / TXID:',
    txidOptional: 'Opcional para verificación rápida',
    txidPlaceholder: 'Pega el TXID de tu envío (ej: 0x... o hash de 64 caracteres)',
    verifyDepositBtn: 'Ya Envié los Fondos • Verificar Depósito',
    verifyingOnChain: 'Verificando Depósito en Blockchain...',
    swapSuccessTitle: '¡Intercambio Exitoso!',
    swapSuccessDesc: 'Tus fondos han sido liquidados y enviados a tu dirección de destino',
    youSent: 'Enviaste',
    tidBox: 'ID de Transacción (TID)',
    destinationLabel: 'Destino:',
    viewExplorer: 'Ver en el Explorador de Bloques',
    newSwap: 'Hacer otro Intercambio',
    txFailedTitle: 'Transacción No Completada',
    txFailedDefault: 'Ocurrió un inconveniente al procesar la orden en el relayer.',
    requestedOp: 'Operación solicitada:',
    fundsSafe: 'Tus fondos están seguros (no se realizó débito)',
    diagnosticLabel: 'Diagnóstico:',
    retrySwap: 'Reintentar Swap',
    cancel: 'Cancelar',
    zkTitle: 'Intercambios Privados Zero-Knowledge',
    zkDesc: 'Rompe el enlace público entre tu billetera de origen Bitcoin Cash y el receptor EVM/Solana usando Stealth Addresses desechables y relayers por lotes ZK-SNARK.',
    returnSwap: 'Volver al Intercambio Instantáneo'
  }
};

export default function BridgeSwap({
  userContext,
  userAddress,
  onConnectWallet,
  showToast,
  backendUrl = '',
  onOpenLanding,
  lang = 'en'
}: BridgeSwapProps) {
  const t = swapTranslations[lang] || swapTranslations.en;
  // Navigation sub-tab (Swap | Limit | Private)
  const [subTab, setSubTab] = useState<'swap' | 'limit' | 'private'>('swap');

  // Token selections
  const [sellToken, setSellToken] = useState<TokenInfo>(SUPPORTED_TOKENS[0]); // PUSD
  const [buyToken, setBuyToken] = useState<TokenInfo>(SUPPORTED_TOKENS[1]);  // USDC

  // Modal selector states
  const [modalType, setModalType] = useState<'sell' | 'buy' | null>(null);

  // Amounts
  const [sellAmount, setSellAmount] = useState<string>('');
  const [recipientAddress, setRecipientAddress] = useState<string>('');
  const [showRecipientInput, setShowRecipientInput] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [slippage, setSlippage] = useState<number>(0.5);
  const [flipDegree, setFlipDegree] = useState<number>(0);

  // Quote state
  const [quoteLoading, setQuoteLoading] = useState<boolean>(false);
  const [quote, setQuote] = useState<{
    grossAmount: number;
    feeAmount: number;
    netPayout: number;
    feePercentage: number;
    rate: number;
    oracleProvider?: string;
    netPayoutUsd?: number;
    hasLiquidity?: boolean;
    availableLiquidity?: number;
  }>({
    grossAmount: 0,
    feeAmount: 0,
    netPayout: 0,
    feePercentage: 0.3,
    rate: 1.0,
    oracleProvider: 'Oracle Pool',
    hasLiquidity: true,
    availableLiquidity: 50000
  });

  // Swap Execution state
  const [isSwapping, setIsSwapping] = useState<boolean>(false);
  const [cardState, setCardState] = useState<'form' | 'deposit' | 'success' | 'error'>('form');
  const [swapError, setSwapError] = useState<{
    title: string;
    message: string;
    diagnostic?: string;
  } | null>(null);
  const [swapModalOpen, setSwapModalOpen] = useState<boolean>(false);
  const [activeSwap, setActiveSwap] = useState<any>(null);
  const [swapStep, setSwapStep] = useState<number>(1);
  const [copied, setCopied] = useState<boolean>(false);
  const [manualTxHash, setManualTxHash] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [customTokens, setCustomTokens] = useState<TokenInfo[]>([]);

  // Load custom community tokens from pools
  useEffect(() => {
    fetch(`${backendUrl}/api/pools`)
      .then(r => r.json())
      .then(d => {
        if (d.success && d.pools) {
          const list: TokenInfo[] = [];
          for (const p of d.pools) {
            if (p.isCustom) {
              list.push({
                symbol: p.tokenA,
                name: p.name.split('⟷')[0].trim() || p.tokenA,
                network: p.networkA,
                networkBadge: p.networkBadgeA,
                icon: p.iconA || '/BCH.png',
                decimals: p.decimalsA || 6,
                isBch: true,
                categoryOrAddress: p.categoryIdA || undefined
              });
            }
          }
          setCustomTokens(list);
        }
      })
      .catch(() => {});
  }, [backendUrl]);

  // Polling ref for active swap tracking
  const pollTimerRef = useRef<any>(null);

  // Limit Order states
  const [targetRate, setTargetRate] = useState<string>('1.0025');
  const [limitOrders, setLimitOrders] = useState<any[]>([]);
  const [isPlacingLimitOrder, setIsPlacingLimitOrder] = useState<boolean>(false);
  const [showOrdersList, setShowOrdersList] = useState<boolean>(false);

  // Fetch Limit Orders
  const fetchLimitOrders = async () => {
    if (!userAddress) return;
    try {
      const res = await fetch(`${backendUrl}/api/limit-orders?userAddress=${userAddress}`);
      const data = await res.json();
      if (data.success && data.orders) {
        setLimitOrders(data.orders);
      }
    } catch (err) {
      console.warn('Failed to load limit orders:', err);
    }
  };

  useEffect(() => {
    fetchLimitOrders();
    const interval = setInterval(fetchLimitOrders, 5000);
    return () => clearInterval(interval);
  }, [userAddress, backendUrl]);

  // Recipient validation helper
  const isRecipientValid = () => {
    if (!recipientAddress.trim()) return false;
    if (buyToken.isBch) {
      return recipientAddress.startsWith('bch') || recipientAddress.startsWith('bitcoincash');
    } else if (buyToken.symbol === 'SOL') {
      return /^[1-9A-HJ-NP-za-km-z]{32,44}$/.test(recipientAddress.trim());
    } else {
      return /^0x[a-fA-F0-9]{40}$/.test(recipientAddress.trim());
    }
  };

  // Place Limit Order
  const handlePlaceLimitOrder = async () => {
    if (!userAddress) {
      onConnectWallet();
      return;
    }
    const amt = parseFloat(sellAmount);
    const tgt = parseFloat(targetRate);
    if (isNaN(amt) || amt <= 0) {
      showToast('Enter a valid amount to sell', 'error');
      return;
    }
    if (isNaN(tgt) || tgt <= 0) {
      showToast('Enter a valid target price', 'error');
      return;
    }
    if (!recipientAddress.trim()) {
      showToast('Destination wallet address is required', 'error');
      return;
    }

    setIsPlacingLimitOrder(true);
    try {
      const res = await fetch(`${backendUrl}/api/limit-orders/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress,
          fromToken: sellToken.symbol,
          toToken: buyToken.symbol,
          fromChain: sellToken.isBch ? 'bch' : 'evm',
          toChain: buyToken.isBch ? 'bch' : 'evm',
          fromAmount: amt,
          targetRate: tgt,
          recipientAddress: recipientAddress.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Limit order placed! Trigger target: ${tgt} ${buyToken.symbol}`, 'success');
        confetti({ particleCount: 60, spread: 50, origin: { y: 0.7 } });
        setSellAmount('');
        await fetchLimitOrders();
      } else {
        showToast(data.error || 'Failed to place limit order', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Network error', 'error');
    } finally {
      setIsPlacingLimitOrder(false);
    }
  };

  // Cancel Limit Order
  const handleCancelLimitOrder = async (orderId: string) => {
    try {
      const res = await fetch(`${backendUrl}/api/limit-orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Limit order cancelled', 'success');
        await fetchLimitOrders();
      } else {
        showToast(data.error || 'Failed to cancel order', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Network error', 'error');
    }
  };

  // 1-Click Paste from clipboard
  const handlePasteRecipient = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          setRecipientAddress(text.trim());
          showToast('Address pasted from clipboard!', 'success');
        } else {
          showToast('Clipboard is empty', 'error');
        }
      } else {
        showToast('Clipboard permission needed. Please paste manually.', 'error');
      }
    } catch (err) {
      showToast('Clipboard error. Please paste manually.', 'error');
    }
  };

  // Auto-fill recipient based on destination token chain
  useEffect(() => {
    if (buyToken.isBch) {
      if (userAddress && (userAddress.startsWith('bch') || userAddress.startsWith('bitcoincash'))) {
        setRecipientAddress(userAddress);
      } else {
        setRecipientAddress('');
      }
    } else {
      if (userAddress && userAddress.startsWith('0x')) {
        setRecipientAddress(userAddress);
      } else {
        setRecipientAddress('');
      }
    }
  }, [buyToken.symbol, userAddress]);

  // Dynamic Quote calculation with Oracle Pool & 10s auto-refresh
  useEffect(() => {
    const num = parseFloat(sellAmount);
    if (isNaN(num) || num <= 0) {
      setQuote({ grossAmount: 0, feeAmount: 0, netPayout: 0, feePercentage: 0.3, rate: 1.0 });
      return;
    }

    let isSubscribed = true;

    const fetchQuote = async (isInitial = false) => {
      if (isInitial) setQuoteLoading(true);
      try {
        const res = await fetch(`${backendUrl}/api/quote?fromToken=${sellToken.symbol}&toToken=${buyToken.symbol}&amount=${num}`);
        const data = await res.json();
        if (!isSubscribed) return;
        if (data.success && data.quote) {
          setQuote(data.quote);
        } else {
          // Safe fallback
          const gross = num;
          const fee = gross * 0.003;
          setQuote({
            grossAmount: gross,
            feeAmount: Number(fee.toFixed(6)),
            netPayout: Number((gross - fee).toFixed(6)),
            feePercentage: 0.3,
            rate: 1.0,
            oracleProvider: 'Fallback Peg'
          });
        }
      } catch (err) {
        if (!isSubscribed) return;
        const gross = num;
        const fee = gross * 0.003;
        setQuote({
          grossAmount: gross,
          feeAmount: Number(fee.toFixed(6)),
          netPayout: Number((gross - fee).toFixed(6)),
          feePercentage: 0.3,
          rate: 1.0,
          oracleProvider: 'Fallback Peg'
        });
      } finally {
        if (isSubscribed && isInitial) setQuoteLoading(false);
      }
    };

    fetchQuote(true);

    // Auto-refresh quote every 10 seconds seamlessly in background
    const intervalTimer = setInterval(() => {
      fetchQuote(false);
    }, 10000);

    return () => {
      isSubscribed = false;
      clearInterval(intervalTimer);
    };
  }, [sellAmount, sellToken.symbol, buyToken.symbol, backendUrl]);

  // Active Swap Status Polling (Every 2.5s)
  useEffect(() => {
    if (!swapModalOpen || !activeSwap || activeSwap.status === 'COMPLETED') {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      return;
    }

    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${backendUrl}/api/swap/${activeSwap.id}`);
        const data = await res.json();
        if (data.success && data.swap) {
          setActiveSwap(data.swap);
          const st = data.swap.status;
          if (st === 'PENDING_DEPOSIT') {
            setSwapStep(1);
          } else if (st === 'DEPOSIT_DETECTED' || st === 'CONFIRMING') {
            setSwapStep(2);
          } else if (st === 'EXECUTING_PAYOUT') {
            setSwapStep(3);
          } else if (st === 'COMPLETED') {
            setSwapStep(4);
            setIsSwapping(false);
            clearInterval(pollTimerRef.current);
            confetti({
              particleCount: 80,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#F7931A', '#0AC18E', '#10B981', '#FFB703', '#FFFFFF']
            });
            showToast(`Successfully swapped for ${data.swap.toAmount} ${data.swap.toToken}!`);
          }
        }
      } catch (err) {}
    }, 2500);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [swapModalOpen, activeSwap?.id, activeSwap?.status, backendUrl]);

  // Invert / Swap Tokens with animation
  const handleFlip = () => {
    setFlipDegree(prev => prev + 180);
    const prevSell = sellToken;
    const prevBuy = buyToken;
    setSellToken(prevBuy);
    setBuyToken(prevSell);
  };

  // Percentage quick buttons
  const handlePercent = (pct: number) => {
    if (pct === 0) {
      setSellAmount('');
    } else if (pct === 50) {
      setSellAmount('50');
    } else if (pct === 100) {
      setSellAmount('100');
    }
  };

  // Copy to clipboard helper
  const copyToClipboard = (text: string) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text);
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try { document.execCommand('copy'); } catch (err) {}
      document.body.removeChild(textArea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper to classify error into human-friendly Spanish explanation
  const classifySwapError = (err: any) => {
    const msg = (err?.message || String(err)).toLowerCase();

    if (msg.includes('user rejected') || msg.includes('cancelled') || msg.includes('denied') || msg.includes('declined') || msg.includes('desestimó') || msg.includes('rechazó')) {
      return {
        title: 'Firma Cancelada',
        message: 'Rechazaste la firma de la transacción en tu billetera. No se realizó ningún cargo ni envío de fondos.',
        diagnostic: 'User Rejected Transaction Signature'
      };
    }

    if (msg.includes('insufficient balance') || msg.includes('insufficient funds') || msg.includes('saldo') || msg.includes('not enough')) {
      return {
        title: 'Saldo Insuficiente',
        message: 'Tu billetera no cuenta con los fondos suficientes para cubrir el monto a cambiar y la tarifa de gas de la red.',
        diagnostic: 'Insufficient Balance in Wallet'
      };
    }

    if (msg.includes('liquidity') || msg.includes('liquidez') || msg.includes('reserve')) {
      return {
        title: 'Liquidez Insuficiente en Pool',
        message: err?.message || 'El monto solicitado supera las reservas activas en el pool de liquidez del relayer.',
        diagnostic: 'Exceeded Pool Reserve Float'
      };
    }

    if (msg.includes('timeout') || msg.includes('etimedout') || msg.includes('aborted') || msg.includes('network') || msg.includes('tiempo')) {
      return {
        title: 'Tiempo de Red Agotado (RPC)',
        message: 'El nodo RPC de la blockchain demoró en responder. Tus fondos están totalmente seguros.',
        diagnostic: 'Network RPC Node Timeout'
      };
    }

    if (msg.includes('destination') || msg.includes('recipient') || msg.includes('address') || msg.includes('dirección')) {
      return {
        title: 'Dirección de Destino Inválida',
        message: 'El formato de la dirección de destino no es válido para la red de este token.',
        diagnostic: 'Invalid Destination Address Format'
      };
    }

    return {
      title: 'Transacción No Completada',
      message: err?.message || 'Ocurrió un inconveniente al procesar la orden en el relayer.',
      diagnostic: msg.substring(0, 70)
    };
  };

  const getExplorerUrl = (swap: any) => {
    if (swap?.payoutExplorerUrl) return swap.payoutExplorerUrl;
    const hash = swap?.payoutTxHash || swap?.depositTxHash || swap?.id;
    if (!hash) return null;
    const to = (swap?.toToken || buyToken.symbol).toUpperCase();
    if (to === 'PUSD' || to === 'MUSD' || to === 'BCH') {
      return `https://3xpl.com/bitcoin-cash/transaction/${hash}`;
    } else if (to === 'SOL') {
      return `https://solscan.io/tx/${hash}`;
    } else {
      return `https://polygonscan.com/tx/${hash}`;
    }
  };

  const handleResetSwap = () => {
    setCardState('form');
    setSwapError(null);
    setSellAmount('');
    setActiveSwap(null);
    setSwapStep(1);
    setManualTxHash('');
    setIsSwapping(false);
    setIsVerifying(false);
  };

  const handleRetrySwap = () => {
    setCardState('form');
    setSwapError(null);
    setIsSwapping(false);
    setIsVerifying(false);
  };

  // Execute swap: create real on-chain intent
  const handleSwap = async () => {
    const num = parseFloat(sellAmount);
    if (isNaN(num) || num <= 0) return;

    if (quote?.hasLiquidity === false) {
      const err = classifySwapError(new Error(`El monto solicitado supera la liquidez del pool (Máx: ${quote.availableLiquidity} ${buyToken.symbol})`));
      setSwapError(err);
      setCardState('error');
      return;
    }

    if (!recipientAddress.trim() || !isRecipientValid()) {
      const err = classifySwapError(new Error(buyToken.isBch ? 'Por favor introduce una dirección válida de Bitcoin Cash (CashAddr)' : buyToken.symbol === 'SOL' ? 'Por favor introduce una dirección válida de Solana' : 'Por favor introduce una dirección 0x... EVM válida'));
      setSwapError(err);
      setCardState('error');
      return;
    }

    setIsSwapping(true);
    setSwapStep(1);

    try {
      const minPayout = Number((quote.netPayout * (1 - slippage / 100)).toFixed(6));
      const res = await fetch(`${backendUrl}/api/swap/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromToken: sellToken.symbol,
          toToken: buyToken.symbol,
          fromChain: sellToken.isBch ? 'bch_mainnet' : 'polygon_mainnet',
          toChain: buyToken.isBch ? 'bch_mainnet' : 'polygon_mainnet',
          amount: num,
          recipientAddress: recipientAddress.trim(),
          slippage: slippage,
          minReceived: minPayout
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to create swap order');

      setActiveSwap(data.swap);
      setCardState('deposit');
      setIsSwapping(false);
    } catch (err: any) {
      setIsSwapping(false);
      const classified = classifySwapError(err);
      setSwapError(classified);
      setCardState('error');
    }
  };

  // Trigger deposit verification
  const handleVerifyDeposit = async () => {
    if (!activeSwap) return;
    setIsVerifying(true);
    setSwapStep(2);

    try {
      const hashToSend = manualTxHash.trim();

      const res = await fetch(`${backendUrl}/api/swap/${activeSwap.id}/verify-tx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txHash: hashToSend || undefined })
      });
      const data = await res.json();
      setIsVerifying(false);

      if (data.success && data.swap) {
        setActiveSwap(data.swap);
        setSwapStep(4);
        setIsSwapping(false);
        setCardState('success');
        confetti({
          particleCount: 90,
          spread: 75,
          origin: { y: 0.6 },
          colors: ['#F7931A', '#0AC18E', '#10B981', '#FFB703', '#FFFFFF']
        });
      } else {
        const classified = classifySwapError(new Error(data.error || 'No se detectó la confirmación en el pool de validadores'));
        setSwapError(classified);
        setCardState('error');
      }
    } catch (err: any) {
      setIsVerifying(false);
      const classified = classifySwapError(err);
      setSwapError(classified);
      setCardState('error');
    }
  };

  const parsedAmount = parseFloat(sellAmount) || 0;
  const isZero = parsedAmount <= 0;

  // Smart crypto amount formatter that guarantees visibility of exact decimals like 0.997
  const formatNetPayout = (val: number, symbol: string): string => {
    if (!val || isNaN(val) || val <= 0) return '0';
    const isStable = ['PUSD', 'USDC', 'USDT', 'MUSD'].includes(symbol.toUpperCase());
    
    if (isStable) {
      if (val < 10) {
        // e.g. 1 PUSD -> 0.997 USDC
        return Number(val.toFixed(4)).toString();
      }
      return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // Volatile crypto assets (BCH, ETH, SOL, BNB, POL)
    if (val >= 1000) {
      return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (val >= 1) {
      return Number(val.toFixed(4)).toString();
    }
    // Small fractions (e.g. 0.034695 BCH, 0.0012 ETH)
    return Number(val.toFixed(6)).toString();
  };

  const formatFeeAmount = (fee: number): string => {
    if (!fee || isNaN(fee) || fee <= 0) return '0.00';
    if (fee < 0.01) {
      return Number(fee.toFixed(6)).toString();
    }
    return fee.toFixed(4);
  };

  return (
    <div className="w-full flex flex-col items-center justify-center min-h-[calc(100vh-140px)] py-6 sm:py-8 px-3 sm:px-4 selection:bg-orange-500 selection:text-white">

      {/* TOP HEADER / TAB ROW (MINIMALIST DARK-LINE DESIGN) */}
      <div className="w-full max-w-[480px] flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-100/90 dark:bg-[#121620] border border-zinc-200/90 dark:border-zinc-800">
          {(['swap', 'limit', 'private'] as const).map(tab => {
            const label = tab === 'swap' ? t.tabSwap : tab === 'limit' ? t.tabLimit : t.tabPrivate;
            return (
              <button 
                key={tab}
                onClick={() => { setSubTab(tab); setCardState('form'); }}
                className={`relative px-3.5 py-1.5 text-xs font-semibold capitalize transition-all cursor-pointer rounded-lg ${
                  subTab === tab 
                    ? 'text-zinc-900 dark:text-white' 
                    : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                <span className="relative z-10">{label}</span>
                {subTab === tab && (
                  <motion.div 
                    layoutId="activeSubTab"
                    className="absolute inset-0 bg-white dark:bg-[#1C2333] rounded-lg shadow-2xs border border-zinc-200/90 dark:border-zinc-700/80 z-0"
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Slippage / Settings icon */}
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowSettingsModal(!showSettingsModal)}
          className="w-9 h-9 rounded-xl bg-white dark:bg-[#121620] border border-zinc-200/90 dark:border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white shadow-2xs transition-colors cursor-pointer"
          title={t.settingsTitle}
        >
          <SlidersHorizontal className="w-4 h-4" />
        </motion.button>
      </div>

      {/* SWAP CARD (MINIMALIST DARK-LINE AESTHETIC) */}
      <motion.div 
        layout
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-[480px] bg-white dark:bg-[#0B0E14] rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-3.5 sm:p-4.5 relative transition-colors duration-200"
      >
        
        {/* SUBTAB CONTENT SWITCHER */}
        <AnimatePresence mode="wait">
          {cardState === 'success' ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="py-3 sm:py-5 px-1 sm:px-3 text-center space-y-4"
            >
              {/* Checkmark in Center with Elastic Spring & Draw */}
              <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: [1, 1.3, 1], opacity: [0.25, 0.6, 0.25] }}
                  transition={{ repeat: Infinity, duration: 2.2 }}
                  className="absolute inset-0 rounded-full bg-emerald-500/20 blur-md"
                />
                <motion.div
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 450, damping: 20 }}
                  className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30"
                >
                  <motion.svg
                    className="w-9 h-9 text-white stroke-current"
                    viewBox="0 0 24 24"
                    fill="none"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <motion.path
                      d="M20 6L9 17L4 12"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.45, delay: 0.1 }}
                    />
                  </motion.svg>
                </motion.div>
              </div>

              <div>
                <h3 className="text-xl font-extrabold text-zinc-900 dark:text-white">
                  {t.swapSuccessTitle}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  {t.swapSuccessDesc}
                </p>
              </div>

              {/* Swap Amount Pair Summary */}
              <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-[#121620] border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img src={sellToken.icon} alt={sellToken.symbol} className="w-8 h-8 rounded-full object-contain" />
                  <div className="text-left">
                    <div className="text-[10px] uppercase font-bold text-zinc-400">{t.youSent}</div>
                    <div className="font-bold text-sm text-zinc-900 dark:text-white font-mono">
                      {activeSwap?.fromAmount || sellAmount} {sellToken.symbol}
                    </div>
                  </div>
                </div>

                <ArrowRight className="w-4 h-4 text-emerald-500 shrink-0" />

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">{t.youReceive}</div>
                    <div className="font-bold text-sm text-emerald-600 dark:text-emerald-400 font-mono">
                      {activeSwap?.toAmount || quote.netPayout} {buyToken.symbol}
                    </div>
                  </div>
                  <img src={buyToken.icon} alt={buyToken.symbol} className="w-8 h-8 rounded-full object-contain" />
                </div>
              </div>

              {/* TID Box with 1-click Copy */}
              <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-[#121620] border border-zinc-200/80 dark:border-zinc-800 text-left space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    {t.tidBox}
                  </span>
                  {copied ? (
                    <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1 font-mono">
                      <Check className="w-3 h-3" /> {t.copied}!
                    </span>
                  ) : (
                    <span className="text-[10px] text-zinc-400 font-mono">
                      1-Click Copy
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 bg-white dark:bg-[#0B0E14] p-2 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
                  <span className="font-mono text-xs text-zinc-900 dark:text-zinc-100 truncate select-all">
                    {activeSwap?.payoutTxHash || activeSwap?.depositTxHash || activeSwap?.id || 'tx_pending'}
                  </span>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => copyToClipboard(activeSwap?.payoutTxHash || activeSwap?.depositTxHash || activeSwap?.id || '')}
                    className="px-2.5 py-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 font-bold text-[11px] flex items-center gap-1 shrink-0 cursor-pointer border border-orange-500/20 transition-all"
                    title={t.copy}
                  >
                    <Copy className="w-3 h-3" />
                    <span>{t.copy}</span>
                  </motion.button>
                </div>

                {/* Destination address */}
                <div className="flex justify-between items-center text-[11px] text-zinc-500 dark:text-zinc-400 pt-1">
                  <span>{t.destinationLabel}</span>
                  <span className="font-mono truncate max-w-[220px] text-zinc-700 dark:text-zinc-300 font-medium">
                    {activeSwap?.recipientAddress || recipientAddress}
                  </span>
                </div>
              </div>

              {/* Explorer Link */}
              {getExplorerUrl(activeSwap) && (
                <div className="pt-1">
                  <a
                    href={getExplorerUrl(activeSwap)!}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-orange-500 font-bold hover:underline"
                  >
                    <span>{t.viewExplorer}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              {/* Reset Button */}
              <button
                type="button"
                onClick={handleResetSwap}
                className="w-full py-3.5 sm:py-4 rounded-xl font-bold text-base bg-orange-500 hover:bg-orange-600 text-white shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{t.newSwap}</span>
              </button>
            </motion.div>
          ) : cardState === 'error' ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="py-3 sm:py-5 px-1 sm:px-3 text-center space-y-4"
            >
              {/* Animated X in Center with Shake */}
              <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: [1, 1.25, 1], opacity: [0.2, 0.5, 0.2] }}
                  transition={{ repeat: Infinity, duration: 2.2 }}
                  className="absolute inset-0 rounded-full bg-rose-500/20 blur-md"
                />
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1, x: [0, -5, 5, -5, 5, 0] }}
                  transition={{ duration: 0.5 }}
                  className="w-16 h-16 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/30"
                >
                  <motion.svg
                    className="w-9 h-9 text-white stroke-current"
                    viewBox="0 0 24 24"
                    fill="none"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <motion.path
                      d="M18 6L6 18M6 6l12 12"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.4, delay: 0.1 }}
                    />
                  </motion.svg>
                </motion.div>
              </div>

              <div>
                <h3 className="text-xl font-extrabold text-zinc-900 dark:text-white">
                  {swapError?.title || t.txFailedTitle}
                </h3>
                <p className="text-xs text-rose-500 dark:text-rose-400 mt-1 max-w-sm mx-auto font-medium leading-relaxed">
                  {swapError?.message || t.txFailedDefault}
                </p>
              </div>

              {/* Attempted Swap & Funds Safety Box */}
              <div className="p-3.5 rounded-2xl bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 text-left text-xs space-y-2">
                <div className="flex justify-between items-center text-zinc-500 dark:text-zinc-400">
                  <span>{t.requestedOp}</span>
                  <span className="font-bold text-zinc-900 dark:text-white font-mono">
                    {sellAmount} {sellToken.symbol} ➔ {buyToken.symbol}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold pt-1 border-t border-rose-500/15">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                  <span>{t.fundsSafe}</span>
                </div>
                {swapError?.diagnostic && (
                  <div className="text-[10px] text-zinc-400 font-mono bg-white/60 dark:bg-black/30 p-2 rounded-lg">
                    {t.diagnosticLabel} {swapError.diagnostic}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleRetrySwap}
                  className="flex-1 py-3.5 rounded-xl font-bold text-sm bg-orange-500 hover:bg-orange-600 text-white shadow-sm transition-all cursor-pointer"
                >
                  {t.retrySwap}
                </button>
                <button
                  type="button"
                  onClick={handleResetSwap}
                  className="px-5 py-3.5 rounded-xl font-bold text-sm bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-all cursor-pointer"
                >
                  {t.cancel}
                </button>
              </div>
            </motion.div>
          ) : cardState === 'deposit' ? (
            <motion.div
              key="deposit"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="space-y-4"
            >
              {/* Header with Cancel */}
              <div className="flex justify-between items-center pb-2 border-b border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={handleResetSwap}
                  className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{t.back}</span>
                </button>
                <span className="text-[11px] font-mono text-zinc-400">
                  {t.orderLabel} <strong className="text-orange-500">{activeSwap?.id?.substring(0, 10)}...</strong>
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 leading-relaxed font-medium text-center">
                {t.depositInstruction} <strong>{activeSwap?.fromAmount} {activeSwap?.fromToken}</strong> {t.toBridgeAddr}
              </div>

              {/* QR Code Container */}
              <div className="flex justify-center p-3 bg-white rounded-2xl border border-zinc-200 shadow-inner w-40 h-40 mx-auto">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(activeSwap?.depositAddress || '')}`}
                  alt="Deposit QR"
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Deposit Address Box with 1-click Copy & HD Badge */}
              <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-[#121620] border border-zinc-200/80 dark:border-zinc-800 space-y-2">
                <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  <span>{t.depositAddr} ({sellToken.networkBadge})</span>
                  {activeSwap?.derivationIndex !== undefined && activeSwap?.derivationIndex !== null && (
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/25 flex items-center gap-1 font-semibold">
                      <ShieldCheck className="w-3 h-3" />
                      BIP-44 HD #{activeSwap.derivationIndex}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 bg-white dark:bg-[#0B0E14] p-2 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <span className="font-mono text-xs text-zinc-900 dark:text-zinc-200 truncate font-semibold select-all">
                    {activeSwap?.depositAddress}
                  </span>
                  <motion.button 
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => copyToClipboard(activeSwap?.depositAddress || '')}
                    className="px-2.5 py-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 font-bold text-[11px] flex items-center gap-1 shrink-0 border border-orange-500/20 cursor-pointer transition-all"
                    title={t.copy}
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? t.copied : t.copy}</span>
                  </motion.button>
                </div>
                {activeSwap?.derivationPath && (
                  <div className="pt-1 border-t border-zinc-200/60 dark:border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                      {t.hdSubaccount}
                    </span>
                    <span className="opacity-75">{activeSwap.derivationPath}</span>
                  </div>
                )}
              </div>

              {/* TXID Input Field */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 flex items-center justify-between">
                  <span>{t.txidLabel}</span>
                  <span className="text-[10px] text-zinc-400 font-normal">{t.txidOptional}</span>
                </label>
                <input
                  type="text"
                  value={manualTxHash}
                  onChange={(e) => setManualTxHash(e.target.value)}
                  placeholder={t.txidPlaceholder}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#0B0E14] border border-zinc-200 dark:border-zinc-800 text-xs font-mono text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition-colors"
                />
              </div>

              {/* Verify Trigger Button */}
              <button 
                type="button"
                onClick={handleVerifyDeposit}
                disabled={isVerifying}
                className="w-full py-3.5 sm:py-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{t.verifyingOnChain}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{t.verifyDepositBtn}</span>
                  </>
                )}
              </button>
            </motion.div>
          ) : subTab === 'private' ? (
            <div className="py-6 px-3 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-orange-500/10 dark:bg-orange-500/20 text-orange-500 flex items-center justify-center mx-auto border border-orange-500/20">
                <Lock className="w-7 h-7" />
              </div>
              <div>
                <span className="inline-block px-3 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800/60 uppercase tracking-wider mb-2">
                  v2 Roadmap
                </span>
                <h3 className="text-xl font-extrabold text-zinc-900 dark:text-white">{t.zkTitle}</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto mt-1 leading-relaxed">
                  {t.zkDesc}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-[#121620] border border-zinc-200/80 dark:border-zinc-800 text-left text-xs space-y-2">
                <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Decoupled UTXO ➔ Account Traceability</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>One-Time Ephemeral Deposit Addresses</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>No IP Logging & RPC Mixer Relay</span>
                </div>
              </div>

              <button
                onClick={() => setSubTab('swap')}
                className="w-full py-3.5 rounded-xl font-bold text-sm bg-zinc-900 hover:bg-black dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-950 transition-all cursor-pointer"
              >
                {t.returnSwap}
              </button>
            </div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
            {/* INTRA-BCH NATIVE CASHTOKENS BADGE */}
            {sellToken.isBch && buyToken.isBch && (
              <div className="mb-3 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-emerald-500" /> {t.intraBchBadge}
                </span>
                <span className="text-[10px] font-mono font-semibold bg-emerald-500/20 px-2 py-0.5 rounded-md">
                  {t.intraBchFrictionless}
                </span>
              </div>
            )}

            {/* SELL BOX (MINIMALIST DARK-LINE DESIGN) */}
            <div className="rounded-2xl bg-zinc-50 dark:bg-[#121620] border border-zinc-200/80 dark:border-zinc-800/80 p-3.5 sm:p-4.5 relative transition-colors focus-within:border-zinc-400 dark:focus-within:border-zinc-650">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  {subTab === 'limit' ? t.sellLimitLabel : t.sellLabel}
                </span>
                <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono font-medium">
                  {t.network}: {sellToken.networkBadge}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 mt-1">
                <input 
                  type="number"
                  value={sellAmount}
                  onChange={e => setSellAmount(e.target.value)}
                  placeholder="0"
                  className="w-full bg-transparent text-3xl sm:text-4xl font-semibold text-zinc-900 dark:text-white outline-none placeholder:text-zinc-300 dark:placeholder:text-zinc-600 font-mono tracking-tight"
                />

                {/* Token Selector Pill */}
                <button
                  type="button"
                  onClick={() => setModalType('sell')}
                  className="flex items-center gap-2 bg-white dark:bg-[#1A202E] hover:bg-zinc-100 dark:hover:bg-[#222A3D] px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700/80 shadow-2xs transition-all shrink-0 cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-full overflow-hidden shrink-0">
                    <img src={sellToken.icon} alt={sellToken.symbol} className="w-full h-full object-contain" />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-bold text-zinc-900 dark:text-white leading-tight">
                        {sellToken.symbol}
                      </span>
                      {(sellToken.isVerified ?? true) && (
                        <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-blue-500 text-white shrink-0" title="Token Oficial Verificado">
                          <Check className="w-2 h-2 stroke-[3]" />
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-zinc-400 font-medium leading-tight hidden sm:block">
                      {sellToken.name.split(' ')[0]}
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-400 ml-0.5" />
                </button>
              </div>

              {/* Under amount: USD value & Quick Percentage pills */}
              <div className="flex items-center justify-between mt-3 pt-1">
                <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500 font-mono">
                  ${(parsedAmount * (quote.rate || 1.0)).toFixed(2)}
                </span>

                {/* Percentage Pills (Clear | 50% | 100%) */}
                <div className="flex items-center gap-1.5">
                  <button 
                    type="button"
                    onClick={() => handlePercent(0)}
                    className="text-[11px] font-medium px-2.5 py-0.5 rounded-lg bg-white dark:bg-[#1A202E] text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-zinc-700/80 shadow-2xs transition-all cursor-pointer"
                  >
                    {t.clear}
                  </button>
                  <button 
                    type="button"
                    onClick={() => handlePercent(50)}
                    className="text-[11px] font-medium px-2.5 py-0.5 rounded-lg bg-white dark:bg-[#1A202E] text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-zinc-700/80 shadow-2xs transition-all cursor-pointer"
                  >
                    50%
                  </button>
                  <button 
                    type="button"
                    onClick={() => handlePercent(100)}
                    className="text-[11px] font-medium px-2.5 py-0.5 rounded-lg bg-white dark:bg-[#1A202E] text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-zinc-700/80 shadow-2xs transition-all cursor-pointer"
                  >
                    100%
                  </button>
                </div>
              </div>
            </div>

            {/* FLIP / REVERSE BUTTON */}
            <div className="flex justify-center -my-3 relative z-10">
              <motion.button 
                type="button"
                onClick={handleFlip}
                title="Invert tokens"
                animate={{ rotate: flipDegree }}
                transition={{ type: "spring", stiffness: 350, damping: 22 }}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                className="w-8 h-8 rounded-xl bg-white dark:bg-[#0B0E14] border border-zinc-200 dark:border-zinc-750 shadow-xs flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-orange-500 dark:hover:text-orange-400 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors cursor-pointer"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
              </motion.button>
            </div>

            {/* BUY / TARGET RATE BOX */}
            {subTab === 'limit' ? (
              <div className="rounded-2xl bg-zinc-50 dark:bg-[#121620] border border-zinc-200/80 dark:border-zinc-800/80 p-3.5 sm:p-4.5 relative transition-colors">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                    <Target className="w-3.5 h-3.5 text-orange-500" /> {t.targetRateTitle}
                  </span>
                  <span className="text-xs text-zinc-400 dark:text-zinc-500 font-medium font-mono">
                    {t.marketRate}: {quote.rate.toFixed(4)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 mt-1">
                  <div className="flex items-center gap-2 w-full">
                    <span className="text-sm font-bold text-zinc-400">1 {sellToken.symbol} =</span>
                    <input 
                      type="number"
                      value={targetRate}
                      onChange={e => setTargetRate(e.target.value)}
                      placeholder="1.0020"
                      className="w-full bg-transparent text-2xl sm:text-3xl font-semibold text-zinc-900 dark:text-white outline-none font-mono tracking-tight"
                    />
                  </div>

                  {/* Token Selector Pill */}
                  <button
                    type="button"
                    onClick={() => setModalType('buy')}
                    className="flex items-center gap-2 bg-white dark:bg-[#1A202E] hover:bg-zinc-100 dark:hover:bg-[#222A3D] px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700/80 shadow-2xs transition-all shrink-0 cursor-pointer"
                  >
                    <div className="w-6 h-6 rounded-full overflow-hidden shrink-0">
                      <img src={buyToken.icon} alt={buyToken.symbol} className="w-full h-full object-contain" />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-bold text-zinc-900 dark:text-white">{buyToken.symbol}</span>
                      {(buyToken.isVerified ?? true) && (
                        <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-blue-500 text-white shrink-0" title="Token Oficial Verificado">
                          <Check className="w-2 h-2 stroke-[3]" />
                        </span>
                      )}
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-zinc-400 ml-0.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between mt-3 pt-1 text-xs">
                  <span className="text-zinc-400">{t.expectedOutput}</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {(parsedAmount * (parseFloat(targetRate) || 1.0) * 0.997).toFixed(2)} {buyToken.symbol}
                  </span>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-zinc-50 dark:bg-[#121620] border border-zinc-200/80 dark:border-zinc-800/80 p-3.5 sm:p-4.5 relative transition-colors">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    {t.buyLabel}
                  </span>
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono font-medium">
                    {t.network}: {buyToken.networkBadge}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 mt-1">
                  <div className="text-3xl sm:text-4xl font-semibold text-zinc-900 dark:text-white font-mono tracking-tight">
                    {quoteLoading ? (
                      <span className="text-zinc-300 dark:text-zinc-600 animate-pulse text-2xl">...</span>
                    ) : isZero ? (
                      <span className="text-zinc-300 dark:text-zinc-600">0</span>
                    ) : (
                      formatNetPayout(quote.netPayout, buyToken.symbol)
                    )}
                  </div>

                  {/* Token Selector Pill */}
                  <button
                    type="button"
                    onClick={() => setModalType('buy')}
                    className="flex items-center gap-2 bg-white dark:bg-[#1A202E] hover:bg-zinc-100 dark:hover:bg-[#222A3D] px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700/80 shadow-2xs transition-all shrink-0 cursor-pointer"
                  >
                    <div className="w-6 h-6 rounded-full overflow-hidden shrink-0">
                      <img src={buyToken.icon} alt={buyToken.symbol} className="w-full h-full object-contain" />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-bold text-zinc-900 dark:text-white leading-tight">
                          {buyToken.symbol}
                        </span>
                        {(buyToken.isVerified ?? true) && (
                          <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-blue-500 text-white shrink-0" title="Token Oficial Verificado">
                            <Check className="w-2 h-2 stroke-[3]" />
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-zinc-400 font-medium leading-tight hidden sm:block">
                        {buyToken.name.split(' ')[0]}
                      </div>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-zinc-400 ml-0.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between mt-3 pt-1">
                  <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500 font-mono">
                    ≈ ${quote.netPayoutUsd !== undefined 
                      ? (quote.netPayoutUsd < 1 ? quote.netPayoutUsd.toFixed(3) : quote.netPayoutUsd.toFixed(2))
                      : (['PUSD', 'USDC', 'USDT', 'MUSD'].includes(buyToken.symbol) 
                          ? (quote.netPayout < 1 ? quote.netPayout.toFixed(3) : quote.netPayout.toFixed(2)) 
                          : (parsedAmount * 0.997).toFixed(2))} USD
                  </span>
                  {quote.oracleProvider && (
                    <span className="text-[10px] font-bold text-zinc-400 bg-zinc-200/60 dark:bg-zinc-800/80 px-2 py-0.5 rounded-md flex items-center gap-1.5 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>Feed: {quote.oracleProvider}</span>
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* DESTINATION WALLET BOX */}
            {sellToken.isBch && buyToken.isBch ? (
              <div className="mt-3 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>{t.autoSettling}</span>
                  </span>
                  <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-md">
                    Intra-BCH
                  </span>
                </div>
                <div className="font-mono text-[11px] text-zinc-700 dark:text-zinc-200 bg-white/70 dark:bg-[#0B0E14] p-2.5 rounded-xl border border-emerald-500/20 truncate">
                  {userAddress || recipientAddress || 'Connecting Bitcoin Cash wallet...'}
                </div>
              </div>
            ) : (
              <div className="mt-3 p-3.5 rounded-2xl bg-zinc-50 dark:bg-[#121620] border border-zinc-200/80 dark:border-zinc-800/80 transition-colors focus-within:border-zinc-400 dark:focus-within:border-zinc-650">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-orange-500" />
                    <span>{t.destAddress} ({buyToken.networkBadge})</span>
                  </span>

                  {/* Format validation status badge */}
                  {recipientAddress.trim() ? (
                    isRecipientValid() ? (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> {t.validFormat}
                      </span>
                    ) : (
                      <span className="text-[10px] text-rose-500 font-mono font-bold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {buyToken.isBch ? 'Invalid CashAddr' : buyToken.symbol === 'SOL' ? 'Needs Solana format' : 'Needs 0x... format'}
                      </span>
                    )
                  ) : (
                    <span className="text-[10px] text-amber-500 font-mono font-bold">
                      {t.required}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    value={recipientAddress}
                    onChange={e => setRecipientAddress(e.target.value)}
                    placeholder={buyToken.isBch ? "bitcoincash:qq... or bchtest:qq..." : buyToken.symbol === 'SOL' ? "Solana address (e.g. 7xKXtg...)" : "0x... (Paste your destination address)"}
                    className="w-full bg-white dark:bg-[#0B0E14] border border-zinc-200 dark:border-zinc-750 text-xs font-mono text-zinc-900 dark:text-white rounded-xl p-2.5 outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition-colors"
                  />

                  {/* 1-Click Paste Button */}
                  <button
                    type="button"
                    onClick={handlePasteRecipient}
                    className="px-3 py-2.5 rounded-xl bg-white dark:bg-[#1A202E] hover:bg-zinc-100 dark:hover:bg-[#222A3D] text-zinc-700 dark:text-zinc-300 font-semibold text-xs flex items-center gap-1.5 shrink-0 border border-zinc-200 dark:border-zinc-750 cursor-pointer transition-all"
                    title="Paste from clipboard"
                  >
                    <Clipboard className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{t.paste}</span>
                  </button>
                </div>

                <div className="flex justify-between items-center mt-2 text-[10px] text-zinc-400">
                  <span>{t.fundsNotice}</span>
                  {userAddress && (
                    <button
                      type="button"
                      onClick={() => setRecipientAddress(userAddress)}
                      className="text-orange-500 font-bold hover:underline cursor-pointer"
                    >
                      {t.useConnected}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* DETAILS BREAKDOWN ACCORDION */}
            <AnimatePresence>
              {!isZero && (
                <motion.div 
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="my-3 p-3.5 rounded-2xl bg-zinc-50/70 dark:bg-[#121620]/70 border border-zinc-200/80 dark:border-zinc-800/80 text-xs space-y-1.5"
                >
                  <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                    <span className="font-medium">{t.execMode}</span>
                    <span className="font-semibold text-zinc-900 dark:text-white">
                      {sellToken.isBch && buyToken.isBch
                        ? t.intraBchTitle
                        : subTab === 'limit'
                        ? t.limitRelayer
                        : t.directRelayer}
                    </span>
                  </div>

                  <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                    <span className="font-medium">{t.marketPrice}</span>
                    <span className="font-semibold text-zinc-900 dark:text-white font-mono">
                      1 {sellToken.symbol} ≈ {Number((quote.rate || 1.0).toFixed(6))} {buyToken.symbol}
                    </span>
                  </div>

                  <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                    <span className="font-medium">{t.grossAmount}</span>
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300 font-mono">
                      {formatNetPayout(quote.grossAmount || parsedAmount, buyToken.symbol)} {buyToken.symbol}
                    </span>
                  </div>

                  <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                    <span className="font-medium">{t.totalFee}</span>
                    <span className="font-semibold text-orange-600 dark:text-orange-400 font-mono">
                      -{formatFeeAmount(quote.feeAmount)} {buyToken.symbol}
                    </span>
                  </div>

                  <div className="flex justify-between text-zinc-500 dark:text-zinc-400 pl-2 border-l-2 border-orange-500/30">
                    <span className="text-[11px]">{t.transparentBreakdown}</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono text-[11px]">
                      {t.feeSplit}
                    </span>
                  </div>

                  <div className="flex justify-between text-zinc-700 dark:text-zinc-300 pt-1.5 border-t border-zinc-200 dark:border-zinc-800">
                    <span className="font-bold text-zinc-900 dark:text-white">{t.youReceive}</span>
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                      {formatNetPayout(quote.netPayout, buyToken.symbol)} {buyToken.symbol}
                    </span>
                  </div>

                  <div className="flex justify-between text-zinc-500 dark:text-zinc-400 text-xs pt-1">
                    <span className="flex items-center gap-1">
                      <span>{t.minGuaranteed} ({slippage}% slippage):</span>
                    </span>
                    <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300">
                      {formatNetPayout(quote.netPayout * (1 - slippage / 100), buyToken.symbol)} {buyToken.symbol}
                    </span>
                  </div>

                  {/* Pre-flight Liquidity Warning Badge */}
                  {quote?.hasLiquidity === false && (
                    <div className="mt-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                      <span>Insufficient pool liquidity. Max available: <strong>{quote.availableLiquidity} {buyToken.symbol}</strong></span>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* MAIN ACTION BUTTON */}
            <div className="mt-3">
              {isZero ? (
                <button 
                  disabled
                  className="w-full py-3.5 sm:py-4 rounded-xl font-semibold text-sm sm:text-base bg-zinc-100 dark:bg-[#121620] text-zinc-400 dark:text-zinc-600 border border-zinc-200/80 dark:border-zinc-800/80 cursor-not-allowed text-center transition-all"
                >
                  {t.enterAmount}
                </button>
              ) : !userContext ? (
                <motion.button 
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={onConnectWallet}
                  className="w-full py-3.5 sm:py-4 rounded-xl font-bold text-sm sm:text-base bg-zinc-900 hover:bg-black dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-950 shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Wallet className="w-4 h-4 text-orange-500" /> {t.connectWallet}
                </motion.button>
              ) : quote?.hasLiquidity === false ? (
                <button 
                  disabled
                  className="w-full py-3.5 sm:py-4 rounded-xl font-bold text-sm sm:text-base bg-rose-500/10 border border-rose-500/30 text-rose-500 cursor-not-allowed text-center transition-all flex items-center justify-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-rose-500" /> {t.insufficientLiquidity}
                </button>
              ) : subTab === 'limit' ? (
                <motion.button 
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={handlePlaceLimitOrder}
                  disabled={isPlacingLimitOrder}
                  className="w-full py-3.5 sm:py-4 rounded-xl font-bold text-sm sm:text-base bg-orange-500 hover:bg-orange-600 text-white shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isPlacingLimitOrder ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> {t.registeringLimit}
                    </>
                  ) : (
                    <>
                      <Target className="w-4 h-4" /> {t.placeLimitOrder}
                    </>
                  )}
                </motion.button>
              ) : (
                <motion.button 
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={handleSwap}
                  disabled={isSwapping}
                  className="w-full py-3.5 sm:py-4 rounded-xl font-bold text-sm sm:text-base bg-orange-500 hover:bg-orange-600 text-white shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSwapping ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> {t.preparingRelayer}
                    </>
                  ) : (
                    t.swapNow
                  )}
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      </motion.div>

      {/* ACTIVE LIMIT ORDERS DRAWER */}
      {limitOrders.length > 0 && (
        <div className="w-full max-w-[480px] mt-4 p-4 rounded-2xl bg-white dark:bg-[#0B0E14] border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-orange-500" /> {t.limitOrdersTitle} ({limitOrders.length})
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">{t.monitoring247}</span>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {limitOrders.map(order => (
              <div key={order.id} className="p-2.5 rounded-xl bg-zinc-50 dark:bg-[#121620] border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-zinc-900 dark:text-white">
                    {order.fromAmount} {order.fromToken} ➔ {order.expectedOutput} {order.toToken}
                  </div>
                  <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                    Target Rate: {order.targetRate} • Status: <span className="text-orange-500 font-semibold">{order.status}</span>
                  </div>
                </div>

                {order.status === 'OPEN' && (
                  <button
                    onClick={() => handleCancelLimitOrder(order.id)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                    title="Cancel order"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="w-full max-w-[800px] mt-10 pt-6 border-t border-gray-200/60 dark:border-gray-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400 dark:text-gray-500 text-center sm:text-left">
        <div>
          <span>BinaryLiquid Protocol • Powered by <strong className="text-gray-600 dark:text-gray-300 font-semibold">Bitcoin Cash CashTokens</strong></span>
        </div>

        <div className="flex items-center justify-center gap-4">
          <a href="https://bchblaze.cash" target="_blank" rel="noreferrer" className="hover:text-primary transition-colors flex items-center gap-1">
            <span>BCH BLAZE</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <a href="https://paryonusd.com" target="_blank" rel="noreferrer" className="hover:text-primary transition-colors flex items-center gap-1">
            <span>ParyonUSD</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </footer>

      {/* REAL-TIME CROSS-CHAIN SWAP MODAL */}
      <AnimatePresence>
        {swapModalOpen && activeSwap && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[120] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="bg-white dark:bg-[#121620] rounded-[32px] p-5 sm:p-7 w-full max-w-md shadow-2xl border border-gray-100 dark:border-gray-800 relative text-left my-8"
            >
              
              <button 
                onClick={() => setSwapModalOpen(false)}
                className="absolute top-5 right-5 text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-800 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs cursor-pointer"
              >
                ✕
              </button>

              {/* Title & Status */}
              <div className="text-center mb-5">
                <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-[#1a2130] border border-gray-100 dark:border-gray-800 flex items-center justify-center mx-auto mb-2.5 shadow-xs">
                  {swapStep === 4 ? (
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  ) : (
                    <img src="/logo.png" alt="BinaryLiquid" className="w-8 h-8 object-contain animate-heartbeat" />
                  )}
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                  {swapStep === 4 ? 'Swap Completed!' : 'Bridge Deposit & Relayer Execution'}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                  Order ID: <span className="font-bold text-primary">{activeSwap.id}</span>
                </p>
              </div>

              {/* Step Timeline Indicator */}
              <div className="grid grid-cols-4 gap-1.5 mb-5">
                {[
                  { step: 1, label: 'Deposit' },
                  { step: 2, label: 'Confirm' },
                  { step: 3, label: 'Dispatch' },
                  { step: 4, label: 'Done' }
                ].map(s => {
                  const isDone = swapStep > s.step;
                  const isCur = swapStep === s.step;
                  return (
                    <div key={s.step} className="flex flex-col items-center">
                      <div className={`w-full h-1.5 rounded-full mb-1 transition-all ${
                        isDone ? 'bg-emerald-500' : isCur ? 'bg-primary animate-pulse' : 'bg-gray-200 dark:bg-gray-800'
                      }`} />
                      <span className={`text-[10px] font-bold ${
                        isDone ? 'text-emerald-500' : isCur ? 'text-primary' : 'text-gray-400'
                      }`}>
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* STEP 1: Awaiting Deposit (Shows QR & Deposit Address) */}
              {swapStep === 1 && (
                <div className="space-y-4 mb-5">
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 leading-relaxed font-medium">
                    Please send <strong>{activeSwap.fromAmount} {activeSwap.fromToken}</strong> to the bridge deposit address below.
                  </div>

                  {/* QR Code Container */}
                  <div className="flex justify-center p-3 bg-white dark:bg-white rounded-2xl border border-gray-200 shadow-inner w-44 h-44 mx-auto">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(activeSwap.depositAddress)}`}
                      alt="Deposit QR"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {/* Deposit Address Box with HD Badge */}
                  <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-[#171e2c] border border-gray-200 dark:border-gray-700/80 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      <span>Bridge Deposit Address</span>
                      {activeSwap.derivationIndex !== undefined && activeSwap.derivationIndex !== null && (
                        <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/25 flex items-center gap-1 font-semibold">
                          <ShieldCheck className="w-3 h-3" />
                          HD #{activeSwap.derivationIndex}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-gray-900 dark:text-gray-200 truncate font-semibold">
                        {activeSwap.depositAddress}
                      </span>
                      <button 
                        onClick={() => copyToClipboard(activeSwap.depositAddress)}
                        className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors shrink-0 cursor-pointer"
                        title="Copy address"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    {activeSwap.derivationPath && (
                      <div className="pt-1 border-t border-gray-200/60 dark:border-gray-800/80 flex items-center justify-between text-[10px] text-gray-400 font-mono">
                        <span className="text-emerald-500 font-medium">BIP-44 Dedicated Vault</span>
                        <span className="opacity-75">{activeSwap.derivationPath}</span>
                      </div>
                    )}
                  </div>

                  {/* TXID Input */}
                  <div className="space-y-1">
                    <input
                      type="text"
                      value={manualTxHash}
                      onChange={(e) => setManualTxHash(e.target.value)}
                      placeholder="TXID de envío (opcional)"
                      className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#161c28] border border-gray-200 dark:border-gray-700 text-xs font-mono text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-primary"
                    />
                  </div>

                  {/* Instant Verification Trigger */}
                  <div className="pt-2">
                    <button 
                      onClick={handleVerifyDeposit}
                      disabled={isVerifying}
                      className="w-full py-3 rounded-2xl bg-primary hover:bg-orange-600 text-white font-bold text-xs transition-all shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isVerifying ? 'Checking On-Chain Deposit...' : 'I Have Sent Funds • Verify Now'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2 & 3: In-Progress Confirming / Dispatching */}
              {(swapStep === 2 || swapStep === 3) && (
                <div className="p-6 rounded-2xl bg-gray-50 dark:bg-[#171e2c] border border-gray-100 dark:border-gray-800 text-center space-y-3 mb-5">
                  <div className="w-16 h-16 mx-auto relative flex items-center justify-center">
                    <img src="/logo.png" alt="BinaryLiquid" className="w-12 h-12 object-contain animate-heartbeat" />
                  </div>
                  <h4 className="font-bold text-gray-900 dark:text-white text-sm">
                    {swapStep === 2 ? 'Deposit Confirmed On-Chain' : 'Relayer Signing Payout'}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
                    {swapStep === 2 
                      ? 'Validating transaction through RPC failover pool. Preparing settlement dispatch...' 
                      : `Transferring ${activeSwap.toAmount} ${activeSwap.toToken} to ${activeSwap.recipientAddress.substring(0, 10)}...`}
                  </p>
                </div>
              )}

              {/* STEP 4: Completed with on-chain proofs */}
              {swapStep === 4 && (
                <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/20 rounded-2xl p-4 mb-5 text-xs space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-500 dark:text-gray-400">Delivered:</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                      {activeSwap.toAmount} {activeSwap.toToken}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-500 dark:text-gray-400">Recipient:</span>
                    <span className="font-mono text-gray-900 dark:text-gray-200 font-semibold truncate max-w-[200px]">
                      {activeSwap.recipientAddress}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-500 dark:text-gray-400">Protocol Fee:</span>
                    <span className="font-mono font-bold text-orange-500">
                      {activeSwap.feeAmount} {activeSwap.fromToken} (0.3%)
                    </span>
                  </div>
                  {activeSwap.payoutExplorerUrl && (
                    <div className="pt-2 border-t border-emerald-500/20">
                      <a 
                        href={activeSwap.payoutExplorerUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-primary hover:underline font-bold text-xs"
                      >
                        <span>View Settlement on Block Explorer</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              )}

              <button 
                onClick={() => setSwapModalOpen(false)}
                className="w-full py-3 rounded-2xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold text-xs transition-all cursor-pointer"
              >
                {swapStep === 4 ? 'Done • Start Another Swap' : 'Close Window (Swap Remains Active in Background)'}
              </button>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SETTINGS / SLIPPAGE MODAL */}
      <AnimatePresence>
        {showSettingsModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#0B0E14] rounded-2xl p-5 sm:p-6 w-full max-w-sm shadow-2xl border border-zinc-200 dark:border-zinc-800 relative text-left"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-zinc-900 dark:text-white">{t.settingsTitle}</h3>
                <button onClick={() => setShowSettingsModal(false)} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white font-bold cursor-pointer">✕</button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 block mb-2">
                    {t.slippageTolerance}
                  </label>
                  <div className="flex gap-2">
                    {[0.1, 0.5, 1.0].map(s => (
                      <button 
                        key={s} 
                        onClick={() => setSlippage(s)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                          slippage === s 
                            ? 'bg-orange-500 text-white border-orange-500' 
                            : 'bg-zinc-50 dark:bg-[#121620] text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800'
                        }`}
                      >
                        {s}%
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 text-[11px] text-zinc-400 leading-relaxed border-t border-zinc-200 dark:border-zinc-800">
                  {t.slippageNotice}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TOKEN SELECTOR MODAL */}
      <TokenSelectModal
        isOpen={modalType !== null}
        onClose={() => setModalType(null)}
        onSelect={token => {
          if (modalType === 'sell') {
            if (token.symbol === buyToken.symbol) {
              setBuyToken(sellToken);
            }
            setSellToken(token);
          } else {
            if (token.symbol === sellToken.symbol) {
              setSellToken(buyToken);
            }
            setBuyToken(token);
          }
        }}
        selectedTokenSymbol={modalType === 'sell' ? sellToken.symbol : buyToken.symbol}
        title={modalType === 'sell' ? 'Select Token to Sell' : 'Select Token to Buy'}
        customTokens={customTokens}
      />

    </div>
  );
}
