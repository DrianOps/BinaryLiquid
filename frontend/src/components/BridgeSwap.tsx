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
  ArrowRight,
  CheckCircle2,
  ClipboardPaste,
  Smartphone,
  ArrowLeftRight,
  ShieldCheck
} from 'lucide-react';
import TokenSelectModal, { SUPPORTED_TOKENS, TokenInfo } from './TokenSelectModal';
import { convertCashAddressNetwork, formatAddress, generateQrDataUrl, formatCryptoBalance } from '../utils/bchAddress';
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
  wizardConnectManager?: any;
  wizardConnectState?: string;
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
    selectReceiveToken: 'Recibir en',
    confirmInWallet: 'Confirma en tu billetera',
    confirmInWalletSubBch: 'Revisa tu billetera BCH (Paytaca) para autorizar el intercambio.',
    confirmInWalletSubEvm: 'Revisa tu billetera Web3 (MetaMask/WalletConnect) para autorizar el depósito.',
    settlingTitle: 'Liquidando en cadena...',
    settlingSubBch: 'Firma recibida. Verificando contrato inteligente y liberando fondos...',
    settlingSubEvm: 'Depósito verificado. Despachando fondos en contrato destino...',
    signatureRequiredBadge: 'Firma requerida',
    settlingBadge: 'Liquidando en cadena',
    nonCustodialBadge: '100% No custodial • Atómico',
    switchToQrAction: '¿Prefieres pagar escaneando código QR?',
    mainnetLiveBadge: 'Red Bitcoin Cash Mainnet Activa',
    mainnetTreasuryAction: 'Firmar y Enviar 0.0001 BCH en Mainnet',
    mainnetTreasuryTitle: 'Aporte a Tesorería / Proof-of-Reserve',
    mainnetTreasuryDesc: 'Transacción real en Bitcoin Cash Mainnet con WizardConnect hacia el Protocol Vault Covenant.',
    mainnetConfirmSub: 'Revisa tu billetera BCH (Paytaca) para autorizar la transacción real en Mainnet.',
    mainnetSuccessTitle: 'Transacción Confirmada en BCH Mainnet',
    protocolVault: 'Tesorería BinaryLiquid'
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
    selectReceiveToken: 'Receive token',
    confirmInWallet: 'Confirm in your wallet',
    confirmInWalletSubBch: 'Check your BCH wallet (Paytaca) to authorize the swap.',
    confirmInWalletSubEvm: 'Check your Web3 wallet (MetaMask/WalletConnect) to authorize deposit.',
    settlingTitle: 'Settling on-chain...',
    settlingSubBch: 'Signature received. Verifying smart contract and releasing funds...',
    settlingSubEvm: 'Deposit verified. Dispatching funds on target contract...',
    signatureRequiredBadge: 'Signature required',
    settlingBadge: 'Settling on-chain',
    nonCustodialBadge: '100% Non-custodial • Atomic',
    switchToQrAction: 'Prefer to pay by scanning QR code?',
    mainnetLiveBadge: 'Bitcoin Cash Mainnet Live',
    mainnetTreasuryAction: 'Sign & Broadcast 0.0001 BCH on Mainnet',
    mainnetTreasuryTitle: 'Treasury Backing / Proof-of-Reserve',
    mainnetTreasuryDesc: 'Real on-chain transaction via WizardConnect to BinaryLiquid Protocol Vault Covenant.',
    mainnetConfirmSub: 'Check your BCH wallet (Paytaca) to authorize transaction on Mainnet.',
    mainnetSuccessTitle: 'BCH Mainnet Transaction Confirmed',
    protocolVault: 'BinaryLiquid Treasury'
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
  onToggleNetwork,
  wizardConnectManager,
  wizardConnectState
}: BridgeSwapProps) {
  const t = UI_TEXT[lang] || UI_TEXT.es;
  const isTestnet = platformNetwork === 'testnet';

  // Core Mode & Token Pair (Default: PUSD -> USDT)
  const [activeTab, setActiveTab] = useState<'swap' | 'limit'>('swap');
  const [sellToken, setSellToken] = useState<TokenInfo>(SUPPORTED_TOKENS[0]); // PUSD
  const [buyToken, setBuyToken] = useState<TokenInfo>(SUPPORTED_TOKENS[1]); // USDT
  const [tokenModalTarget, setTokenModalTarget] = useState<'sell' | 'buy' | null>(null);

  // Amounts & Destination
  const [amount, setAmount] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('amount') || '';
    }
    return '';
  });
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
  const [cardState, setCardState] = useState<'form' | 'processing' | 'deposit' | 'success'>('form');
  const [processingStage, setProcessingStage] = useState<'authorizing' | 'settling'>('authorizing');
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

  // Automatically configure tokens and defaults when switching Mainnet / Testnet
  useEffect(() => {
    if (!isTestnet) {
      const bch = SUPPORTED_TOKENS.find(t => t.symbol === 'BCH') || SUPPORTED_TOKENS[0];
      setSellToken(bch);
      if (!amount || amount === '0') {
        setAmount('0.0001');
      }
    } else {
      setSellToken(SUPPORTED_TOKENS[0]); // PUSD
      setBuyToken(SUPPORTED_TOKENS[1]); // USDT
    }
  }, [isTestnet]);

  // Keep pair liquidity-aware
  const isPairLiquid = useMemo(() => {
    if (!isTestnet) return true; // Mainnet BCH Treasury transactions are always active!
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
                ? `¡${data.swap.toAmount} ${data.swap.toToken} recibidos en tu billetera!`
                : `${data.swap.toAmount} ${data.swap.toToken} received in your wallet!`,
              'success'
            );
          }
        }
      } catch {
        // silent retry
      }
    }, 2000);

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
      const res = await fetch(`${backendUrl}/api/faucet/testnet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient: cleanAddr, recipientAddress: cleanAddr, token: 'PUSD', amount: 50 })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Faucet error');

      showToast(
        lang === 'es' ? '50 PUSD enviados en BCH Chipnet' : '50 PUSD sent on BCH Chipnet',
        'success'
      );
      setFaucetOpen(false);
      setTimeout(() => onRefreshBalances?.(), 2000);
    } catch (err: any) {
      showToast(err.message || (lang === 'es' ? 'Error en Faucet' : 'Faucet error'), 'error');
    } finally {
      setClaimingFaucet(false);
    }
  };

  // ==========================================================================
  // REAL 1-CLICK BCH MAINNET TRANSACTION (FOR BLAZE HACKATHON MAINNET TRACK)
  // ==========================================================================
  const handleMainnetTreasuryDeposit = async () => {
    if (!isPayingWalletConnected) {
      onConnectWallet();
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      showToast(t.enterAmount, 'error');
      return;
    }

    setExecuting(true);
    setCardState('processing');
    setProcessingStage('authorizing');
    setSigningStep(t.signing);

    try {
      const { txHash } = await executeBchSwapDeposit({
        backendUrl,
        buildEndpoint: '/api/bch/mainnet/build-treasury-tx',
        senderAddress: payingWalletAddress,
        isTestnet: false,
        wizardManager: wizardConnectManager,
        onStatus: msg => setSigningStep(msg)
      });

      setProcessingStage('settling');
      setSigningStep(t.settling);

      setActiveSwap({
        id: `mainnet_tx_${Date.now()}`,
        fromToken: 'BCH',
        toToken: 'Protocol Vault',
        fromAmount: parsedAmount,
        toAmount: parsedAmount,
        payoutTxHash: txHash,
        depositTxHash: txHash,
        payoutExplorerUrl: `https://3xpl.com/bitcoin-cash/transaction/${txHash}`,
        recipientAddress: 'bitcoincash:pvqse7cr2ptah2e34sl53r5utqwxl28fk84grvf5ufzd6n5tclme25u8ar7st',
        status: 'COMPLETED'
      });

      setCardState('success');
      setAmount('');
      onRefreshBalances?.();
      showToast(lang === 'es' ? '¡Transacción en BCH Mainnet confirmada!' : 'BCH Mainnet transaction confirmed!', 'success');
    } catch (err: any) {
      const msg = String(err?.message || '').toLowerCase();
      const isUserCancel =
        (msg.includes('cancel') || msg.includes('denied') || msg.includes('user rejected')) &&
        !msg.includes('network') && !msg.includes('rules') && !msg.includes('script') && !msg.includes('stack');
      if (isUserCancel) {
        showToast(lang === 'es' ? 'Firma cancelada en tu billetera BCH' : 'Signature cancelled in wallet', 'error');
      } else {
        showToast(err.message || 'Error en transacción Mainnet', 'error');
      }
      setCardState('form');
    } finally {
      setExecuting(false);
      setSigningStep('');
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

    if (!isTestnet) {
      await handleMainnetTreasuryDeposit();
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
    setCardState('processing');
    setProcessingStage('authorizing');
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

        setProcessingStage('settling');
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
      // Try 1-Click WizardConnect (Paytaca) / WalletConnect V2 / Extension first!
      if (hasActiveBchSigningCapability(wizardConnectManager)) {
        try {
          const { txHash } = await executeBchSwapDeposit({
            backendUrl,
            buildEndpoint: `/api/swap/${createdSwap.id}/build-bch-tx`,
            senderAddress: payingWalletAddress,
            isTestnet,
            wizardManager: wizardConnectManager,
            onStatus: msg => setSigningStep(msg)
          });

          setProcessingStage('settling');
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
          const isUserCancel =
            (msg.includes('cancel') || msg.includes('denied') || msg.includes('user rejected')) &&
            !msg.includes('network') && !msg.includes('rules') && !msg.includes('script') && !msg.includes('stack');
          if (isUserCancel) {
            throw new Error(lang === 'es' ? 'Firma cancelada en tu billetera BCH' : 'Signature cancelled');
          }
          showToast(bchSignErr?.message || (lang === 'es' ? 'Error al procesar firma' : 'Error processing signature'), 'error');
          // Fallback cleanly to Covenant URI/QR with live UTXO auto-detection
        }
      }

      // Read-only BCH session or manual mode: show sleek Covenant payment sheet with auto-polling
      setManualTxOpen(false);
      setTxHashInput('');
      setCardState('deposit');
    } catch (err: any) {
      showToast(err.message || (lang === 'es' ? 'Error al ejecutar swap' : 'Error executing swap'), 'error');
      setCardState('form');
    } finally {
      setExecuting(false);
      setSigningStep('');
    }
  };

  // Re-trigger 1-Click Remote Sign from the Deposit Screen
  const handleTriggerRemoteSign = async () => {
    if (!activeSwap?.id || !hasActiveBchSigningCapability(wizardConnectManager)) return;
    setExecuting(true);
    setCardState('processing');
    setProcessingStage('authorizing');
    setSigningStep(t.signing);
    try {
      const { txHash } = await executeBchSwapDeposit({
        backendUrl,
        buildEndpoint: `/api/swap/${activeSwap.id}/build-bch-tx`,
        senderAddress: payingWalletAddress || bchAddress,
        isTestnet,
        wizardManager: wizardConnectManager,
        onStatus: msg => setSigningStep(msg)
      });
      setProcessingStage('settling');
      setSigningStep(t.settling);
      const verifyRes = await fetch(`${backendUrl}/api/swap/${activeSwap.id}/verify-tx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txHash })
      });
      const verifyData = await verifyRes.json();
      if (!verifyData.success) {
        throw new Error(verifyData.error || 'Error liquidando en contrato');
      }
      setActiveSwap(verifyData.swap);
      setCardState('success');
      setAmount('');
      onRefreshBalances?.();
      showToast(t.completed, 'success');
    } catch (err: any) {
      showToast(err.message || 'Error autorizando en Paytaca', 'error');
      setCardState('deposit');
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
    setCardState('processing');
    setProcessingStage('authorizing');
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
      } else if (hasActiveBchSigningCapability(wizardConnectManager)) {
        const { txHash } = await executeBchSwapDeposit({
          backendUrl,
          buildEndpoint: `/api/limit-orders/${order.id}/build-bch-tx`,
          senderAddress: payingWalletAddress,
          isTestnet,
          wizardManager: wizardConnectManager,
          onStatus: msg => setSigningStep(msg)
        });

        await fetch(`${backendUrl}/api/limit-orders/${order.id}/verify-tx`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ txHash })
        });
      }

      setAmount('');
      setCardState('form');
      fetchLimitOrders();
      onRefreshBalances?.();
      showToast(
        lang === 'es' ? 'Orden límite activa en contrato' : 'Limit order active on-chain',
        'success'
      );
    } catch (err: any) {
      showToast(err.message || (lang === 'es' ? 'Error en orden límite' : 'Limit order error'), 'error');
      setCardState('form');
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

    let rawVal: number;
    if (activeTab === 'limit') {
      const r = parseFloat(targetRate) || 1;
      rawVal = parsed * r * 0.997;
    } else if (quote?.netPayout !== undefined) {
      rawVal = Number(quote.netPayout);
    } else {
      const rate = sellToken.isBch && !buyToken.isBch ? 470 : !sellToken.isBch && buyToken.isBch ? 1 / 470 : 1;
      rawVal = parsed * rate * 0.997;
    }

    if (isNaN(rawVal) || rawVal <= 0) return '';

    // If buy token is volatile crypto (BCH, BTC, ETH, SOL), display up to 6 decimals
    if (['BCH', 'BTC', 'ETH', 'SOL'].includes(buyToken.symbol.toUpperCase())) {
      return rawVal.toFixed(6).replace(/\.?0+$/, '');
    }

    // For stablecoins (USDT, PUSD, USDC, MUSD):
    // For amounts < 10 or whenever fractional fee digits exist (e.g. 0.997, 1.994, 4.985):
    // Show exact decimals up to 4 decimal places, stripping unnecessary trailing zeroes
    const rounded2 = Number(rawVal.toFixed(2));
    const diff = Math.abs(rawVal - rounded2);
    if (rawVal < 10 || diff > 0.0001) {
      return rawVal.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
    }

    return rawVal.toFixed(2);
  }, [amount, isPairLiquid, activeTab, targetRate, quote, buyToken.symbol, sellToken.isBch, buyToken.isBch]);

  const ctaConfig = useMemo(() => {
    if (!isTestnet) {
      if (executing) {
        return { label: signingStep || t.signing, disabled: true, variant: 'primary' as const };
      }
      if (!isPayingWalletConnected) {
        return {
          label: t.connectBchToPay,
          disabled: false,
          variant: 'connect' as const
        };
      }
      const parsed = parseFloat(amount);
      if (!amount || isNaN(parsed) || parsed <= 0) {
        return { label: t.enterAmount, disabled: true, variant: 'muted' as const };
      }
      if (sellBalance !== null && parsed > sellBalance) {
        return {
          label: lang === 'es' ? 'Saldo BCH insuficiente' : 'Insufficient BCH balance',
          disabled: true,
          variant: 'muted' as const
        };
      }
      return {
        label: t.mainnetTreasuryAction,
        disabled: false,
        variant: 'primary' as const
      };
    }

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
    isTestnet,
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
      {/* Active Mainnet Badge & Switcher */}
      {!isTestnet && (
        <div className="mb-3 px-3.5 py-2.5 rounded-panel bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between text-xs">
          <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span>{t.mainnetLiveBadge}</span>
          </span>
          {onToggleNetwork && (
            <button
              type="button"
              onClick={() => onToggleNetwork('testnet')}
              className="px-2.5 py-1 rounded-lg bg-surface text-ink-2 hover:text-ink font-semibold text-[11px] border border-line transition cursor-pointer"
            >
              {t.switchToTestnet}
            </button>
          )}
        </div>
      )}

      {/* MAIN MINIMALIST SWAP CARD */}
      <div className={`bg-surface rounded-card p-3.5 sm:p-4 transition-all duration-300 ${
        cardState === 'success'
          ? 'border-2 border-primary shadow-xl shadow-primary/20'
          : 'border border-line shadow-soft'
      }`}>
        {/* CARD TOP BAR */}
        {cardState === 'form' && (
          <div className="flex items-center justify-between px-1 pb-3">
            {/* Swap | Limit Segmented Control */}
            <div className="ui-segment">
              <button
                type="button"
                onClick={() => setActiveTab('swap')}
                className={`ui-segment-item ${activeTab === 'swap' ? 'ui-segment-item-active' : ''}`}
              >
                {t.swap}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('limit')}
                className={`ui-segment-item ${activeTab === 'limit' ? 'ui-segment-item-active' : ''}`}
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
                  className={`h-8 px-2.5 rounded-control text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                    faucetOpen
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : 'bg-surface-2 text-ink-2 hover:text-ink'
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
                className={`w-8 h-8 rounded-control flex items-center justify-center transition-colors cursor-pointer ${
                  settingsOpen
                    ? 'bg-primary/15 text-primary'
                    : 'bg-surface-2 text-ink-2 hover:text-ink'
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
          <div className="mb-3 p-3 rounded-panel bg-surface-2 border border-line space-y-2">
            <div className="flex items-center justify-between text-[11px] text-ink-2">
              <span className="font-semibold text-ink flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-500" /> PUSD Chipnet Faucet
              </span>
              <button
                type="button"
                onClick={() => setFaucetOpen(false)}
                className="text-ink-3 hover:text-ink cursor-pointer"
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
                className="flex-1 min-w-0 bg-surface border border-line rounded-control px-2.5 py-1.5 text-xs font-mono text-ink outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                disabled={claimingFaucet}
                onClick={handleClaimFaucet}
                className="px-3 py-1.5 rounded-control bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-semibold shrink-0 transition cursor-pointer"
              >
                {claimingFaucet ? '...' : t.faucetClaim}
              </button>
            </div>
          </div>
        )}

        {/* COMPACT SLIPPAGE POPOVER */}
        {cardState === 'form' && settingsOpen && (
          <div className="mb-3 p-3 rounded-panel bg-surface-2 border border-line flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-ink-2">{t.slippage}</span>
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
                      ? 'bg-ink text-canvas'
                      : 'bg-surface text-ink-2 border border-line'
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
                className="w-16 px-2 py-1 rounded-lg text-xs text-right bg-surface border border-line text-ink outline-none"
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
            <div className="p-4 rounded-panel bg-surface-2 border border-transparent focus-within:border-line-strong transition-colors">
              <div className="flex items-center justify-between text-xs text-ink-2 mb-2">
                <span className="font-medium">{t.pay}</span>
                {isPayingWalletConnected ? (
                  <div className="flex items-center gap-1.5">
                    <span>
                      {t.balance}:{' '}
                      <strong className="text-ink font-semibold tabular-nums">
                        {sellBalance !== null
                          ? formatCryptoBalance(sellBalance, sellToken.isBch && sellToken.symbol === 'BCH')
                          : '0.00'}
                      </strong>
                    </span>
                    {sellBalance !== null && sellBalance > 0 && (
                      <button
                        type="button"
                        onClick={() => setAmount(String(sellBalance))}
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-primary/15 text-primary hover:bg-primary/25 transition cursor-pointer"
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
                  className="w-full min-w-0 bg-transparent text-3xl font-semibold tracking-tight text-ink placeholder:text-ink-3/60 outline-none tabular-nums"
                />

                <button
                  type="button"
                  onClick={() => setTokenModalTarget('sell')}
                  className="flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-full bg-surface hover:bg-surface-3 border border-line  shrink-0 transition cursor-pointer"
                >
                  <img
                    src={sellToken.icon}
                    alt={sellToken.symbol}
                    className="w-6 h-6 rounded-full object-contain"
                  />
                  <span className="font-semibold text-sm text-ink">
                    {sellToken.symbol}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-ink-3" />
                </button>
              </div>

              <div className="flex items-center justify-between mt-1.5 text-[11px] text-ink-3">
                <span className="tabular-nums">
                  {amount && parseFloat(amount) > 0
                    ? `~$${(parseFloat(amount) * (quote?.priceFromUsd || 1)).toFixed(2)}`
                    : '$0.00'}
                </span>
                <span>{sellToken.isBch ? (isTestnet ? 'BCH Chipnet' : 'Bitcoin Cash') : isTestnet ? 'Polygon Amoy' : 'Polygon'}</span>
              </div>
            </div>

            {/* FLIP BUTTON (Only in Testnet) */}
            {isTestnet && (
              <div className="relative h-2 flex items-center justify-center z-10">
                <button
                  type="button"
                  onClick={handleFlipTokens}
                  aria-label="Invertir par"
                  className="w-9 h-9 rounded-control bg-surface hover:bg-surface-3 border-4 border-surface shadow-soft flex items-center justify-center text-ink-2 hover:rotate-180 transition-all duration-200 cursor-pointer"
                >
                  <ArrowDownUp className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* RECEIVE BOX (Only in Testnet) */}
            {isTestnet && (
              <div className="p-4 rounded-panel bg-surface-2 border border-transparent transition-colors">
                <div className="flex items-center justify-between text-xs text-ink-2 mb-2">
                  <span className="font-medium">{t.receive}</span>
                  {!isPairLiquid ? (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500">
                      {t.noLiquidity}
                    </span>
                  ) : null}
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="w-full min-w-0 text-3xl font-semibold tracking-tight tabular-nums truncate">
                    {loadingQuote && !receiveDisplay ? (
                      <span className="inline-block w-24 h-8 rounded-lg bg-surface-3 animate-pulse align-middle" />
                    ) : receiveDisplay ? (
                      <span className="text-ink">{receiveDisplay}</span>
                    ) : (
                      <span className="text-ink-3/60">0</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setTokenModalTarget('buy')}
                    className="flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-full bg-surface hover:bg-surface-3 border border-line shrink-0 transition cursor-pointer"
                  >
                    <img
                      src={buyToken.icon}
                      alt={buyToken.symbol}
                      className="w-6 h-6 rounded-full object-contain"
                    />
                    <span className="font-semibold text-sm text-ink">
                      {buyToken.symbol}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-ink-3" />
                  </button>
                </div>

                <div className="flex items-center justify-between mt-1.5 text-[11px] text-ink-3">
                  <span className="tabular-nums">
                    {quote?.netPayoutUsd !== undefined
                      ? `~$${Number(quote.netPayoutUsd).toFixed(2)}`
                      : receiveDisplay
                      ? `~$${receiveDisplay}`
                      : '$0.00'}
                  </span>
                  <span>{buyToken.isBch ? (isTestnet ? 'BCH Chipnet' : 'Bitcoin Cash') : isTestnet ? 'Polygon Amoy' : 'Polygon'}</span>
                </div>
              </div>
            )}

            {/* TARGET PRICE ROW (Only in Limit Tab) */}
            {activeTab === 'limit' && isTestnet && (
              <div className="px-4 py-3 rounded-panel bg-surface-2 flex items-center justify-between gap-3">
                <div className="text-xs text-ink-2">
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
                    className="w-24 bg-surface border border-line rounded-control px-2.5 py-1.5 text-right text-sm font-semibold text-ink outline-none tabular-nums"
                  />
                  <span className="text-xs font-semibold text-ink-3">{buyToken.symbol}</span>
                </div>
              </div>
            )}

            {/* DESTINATION ADDRESS (Only in Testnet) */}
            {isTestnet && (
              <div className="px-4 py-3 rounded-panel bg-surface-2 border border-transparent focus-within:border-line-strong transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-ink-2 flex items-center gap-1.5">
                    <span>{`${t.receiveAt} (${buyToken.symbol})`}</span>
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
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-surface-3 text-ink-2 hover:bg-surface-3 transition cursor-pointer"
                        >
                          {t.myWallet}
                        </button>
                      )}
                    <button
                      type="button"
                      onClick={handlePasteRecipient}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-surface-3 text-ink-2 hover:bg-surface-3 flex items-center gap-1 transition cursor-pointer"
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
                      ? 'bchtest:q... / bchtest:z...'
                      : '0x...'
                  }
                  spellCheck={false}
                  className="w-full bg-transparent text-xs font-mono text-ink placeholder:text-ink-3 outline-none"
                />
              </div>
            )}

            {/* DEDICATED MAINNET PROTOCOL VAULT CARD (When on Mainnet) */}
            {!isTestnet && (
              <div className="p-4 rounded-panel bg-surface-2 border border-line/70 space-y-3">
                <div className="flex items-center justify-between text-xs text-ink-2">
                  <span className="font-semibold flex items-center gap-1.5 text-ink">
                    <Lock className="w-3.5 h-3.5 text-emerald-500" />
                    {lang === 'es' ? 'Covenant Destino (BCH Mainnet)' : 'Destination Covenant (BCH Mainnet)'}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Verificado P2SH-32
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-surface border border-line text-xs font-mono text-ink-2 break-all select-all flex items-center justify-between gap-2">
                  <span className="text-[11px] leading-tight">bitcoincash:pvqse7cr2ptah2e34sl53r5utqwxl28fk84grvf5ufzd6n5tclme25u8ar7st</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText('bitcoincash:pvqse7cr2ptah2e34sl53r5utqwxl28fk84grvf5ufzd6n5tclme25u8ar7st');
                        showToast(lang === 'es' ? 'Dirección de Covenant copiada' : 'Covenant address copied', 'success');
                      }
                    }}
                    className="p-1 rounded hover:bg-surface-3 text-ink-3 hover:text-ink shrink-0 cursor-pointer"
                    title="Copiar dirección"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="text-[11px] text-ink-3 leading-relaxed">
                  {lang === 'es'
                    ? '🛡️ Transacción real en Bitcoin Cash Mainnet con WizardConnect hacia el Protocol Vault Covenant para verificar la integración en vivo para DoraHacks BCH BLAZE.'
                    : '🛡️ Genuine on-chain transaction on Bitcoin Cash Mainnet via WizardConnect to Protocol Vault Covenant for DoraHacks BCH BLAZE verification.'}
                </div>

                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300 flex items-start gap-2">
                  <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" />
                  <span>
                    {lang === 'es'
                      ? '¿Deseas probar el Swap Atómico cruzado PUSD (Paryon) ⟷ USDT? Activa la red "Chipnet" en la barra superior para usar el Faucet y los pools con liquidez automática.'
                      : 'Want to test the atomic PUSD (Paryon) ⟷ USDT Cross-Chain Swap? Switch to "Chipnet" in the top bar to use the Faucet and automated liquidity pools.'}
                  </span>
                </div>
              </div>
            )}

            {/* 1-LINE COLLAPSIBLE QUOTE SUMMARY */}
            {isTestnet && quote && isPairLiquid && parseFloat(amount) > 0 && (
              <div className="px-3.5 py-2.5 rounded-panel border border-line text-xs">
                <button
                  type="button"
                  onClick={() => setDetailsOpen(!detailsOpen)}
                  className="w-full flex items-center justify-between text-ink-2 cursor-pointer"
                >
                  <span className="font-medium text-ink-2 tabular-nums">
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
                  <div className="pt-2.5 mt-2.5 border-t border-line space-y-1.5 text-[11px] text-ink-2">
                    <div className="flex justify-between">
                      <span>{t.minReceived} ({slippage}%)</span>
                      <span className="font-medium text-ink tabular-nums">
                        {(quote.netPayout * (1 - slippage / 100)).toFixed(4)} {buyToken.symbol}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t.fee} (0.20% LP + 0.10% Protocol)</span>
                      <span className="font-medium text-ink tabular-nums">
                        {quote.feeAmount} {buyToken.symbol}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t.contract}</span>
                      <span className="font-mono text-ink-2">
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
                className={`w-full ui-btn-lg ${
                  ctaConfig.variant === 'primary'
                    ? 'ui-btn-primary'
                    : ctaConfig.variant === 'connect'
                    ? 'ui-btn-inverse'
                    : 'ui-btn-disabled'
                }`}
              >
                {executing && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{ctaConfig.label}</span>
              </button>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* VIEW 2: FLUID 1-CLICK PROCESSING & SIGNING LIFECYCLE              */}
        {/* ================================================================ */}
        {cardState === 'processing' && (
          <div className="p-1 sm:p-2 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            {/* Header: Discreet Back / Cancel Action + Live Status Badge */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setCardState('form');
                  setExecuting(false);
                }}
                className="flex items-center gap-1.5 text-xs font-semibold text-ink-3 hover:text-ink transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{t.back}</span>
              </button>

              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-surface-2 border border-line">
                {processingStage === 'authorizing' ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                      {t.signatureRequiredBadge}
                    </span>
                  </>
                ) : (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin text-primary" />
                    <span className="text-primary font-medium">
                      {t.settlingBadge}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Token Exchange Hero Pair */}
            <div className="p-4 sm:p-5 rounded-panel bg-surface-2 border border-line relative overflow-hidden">
              <div className="flex items-center justify-between gap-3 relative z-10">
                {/* Sell Token (From) */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <img
                      src={sellToken.icon}
                      alt={sellToken.symbol}
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-contain bg-surface border border-line shadow-soft shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-base sm:text-lg font-bold text-ink tabular-nums truncate">
                        {amount || '0'}
                      </div>
                      <div className="text-xs font-semibold text-ink-2">
                        {sellToken.symbol}
                      </div>
                    </div>
                  </div>
                  <div className="text-[11px] text-ink-3 truncate">
                    {sellToken.isBch ? (isTestnet ? 'BCH Chipnet' : 'Bitcoin Cash') : (isTestnet ? 'Polygon Amoy' : 'Polygon')}
                  </div>
                </div>

                {/* Center Circular Exchange Orb */}
                <div className="shrink-0 flex items-center justify-center">
                  <div
                    className={`w-11 h-11 rounded-full bg-surface border shadow-soft flex items-center justify-center transition-all duration-300 ${
                      processingStage === 'settling'
                        ? 'border-primary ring-2 ring-primary/20 scale-105'
                        : 'border-line'
                    }`}
                  >
                    <ArrowLeftRight
                      className={`w-4 h-4 transition-transform duration-500 ${
                        processingStage === 'settling'
                          ? 'text-primary animate-spin'
                          : 'text-ink-2'
                      }`}
                    />
                  </div>
                </div>

                {/* Buy Token (To) */}
                <div className="flex-1 min-w-0 space-y-1 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="min-w-0">
                      <div className="text-base sm:text-lg font-bold text-ink tabular-nums truncate">
                        {!isTestnet
                          ? amount || '0.0001'
                          : activeSwap?.toAmount || receiveDisplay || (quote?.netPayout ? Number(quote.netPayout).toFixed(2) : '0')}
                      </div>
                      <div className="text-xs font-semibold text-ink-2">
                        {!isTestnet ? t.protocolVault : buyToken.symbol}
                      </div>
                    </div>
                    <img
                      src={!isTestnet ? '/favicon.png' : buyToken.icon}
                      alt={!isTestnet ? 'BinaryLiquid' : buyToken.symbol}
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-contain bg-surface border border-line shadow-soft shrink-0"
                    />
                  </div>
                  <div className="text-[11px] text-ink-3 truncate">
                    {!isTestnet ? 'Bitcoin Cash Mainnet' : buyToken.isBch ? (isTestnet ? 'BCH Chipnet' : 'Bitcoin Cash') : isTestnet ? 'Polygon Amoy' : 'Polygon'}
                  </div>
                </div>
              </div>
            </div>

            {/* Stage Title, Explanation & Animated Progress Bar */}
            <div className="text-center space-y-2 pt-1">
              <h3 className="text-base font-semibold text-ink">
                {processingStage === 'authorizing'
                  ? t.confirmInWallet
                  : t.settlingTitle}
              </h3>
              <p className="text-xs text-ink-3 max-w-xs mx-auto leading-relaxed">
                {processingStage === 'authorizing'
                  ? !isTestnet
                    ? t.mainnetConfirmSub
                    : sellToken.isBch
                    ? t.confirmInWalletSubBch
                    : t.confirmInWalletSubEvm
                  : !isTestnet
                  ? (lang === 'es' ? 'Firma recibida. Transmitiendo a la red Bitcoin Cash Mainnet...' : 'Signature received. Broadcasting to Bitcoin Cash Mainnet...')
                  : sellToken.isBch
                  ? t.settlingSubBch
                  : t.settlingSubEvm}
              </p>

              {/* Minimal Progress Bar */}
              <div className="w-full max-w-xs mx-auto h-1.5 bg-surface-2 rounded-full overflow-hidden mt-3">
                <div
                  className={`h-full bg-primary transition-all duration-700 ease-out rounded-full ${
                    processingStage === 'authorizing'
                      ? 'w-1/2 animate-pulse'
                      : 'w-full'
                  }`}
                />
              </div>
            </div>

            {/* Recipient Preview & Non-Custodial Protocol Badge */}
            <div className="p-3 rounded-control bg-surface-2 border border-line space-y-2 text-xs">
              <div className="flex items-center justify-between text-ink-2">
                <span className="text-ink-3">{t.sentTo}</span>
                <span className="font-mono text-ink tabular-nums">
                  {!isTestnet
                    ? 'bitcoincash:pvqse7cr... (Vault Covenant)'
                    : formatAddress(normalizedRecipient || recipientAddress)}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-line/60 text-[11px] text-ink-3">
                <span>{lang === 'es' ? 'Protocolo:' : 'Protocol:'}</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  {!isTestnet ? '100% No custodial • Bitcoin Cash Mainnet' : t.nonCustodialBadge}
                </span>
              </div>
            </div>

            {/* Optional Switch to QR Code View for BCH */}
            {sellToken.isBch && (
              <button
                type="button"
                onClick={() => setCardState('deposit')}
                className="w-full text-center text-[11px] text-ink-3 hover:text-ink transition cursor-pointer pt-0.5"
              >
                {t.switchToQrAction}
              </button>
            )}
          </div>
        )}

        {/* ================================================================ */}
        {/* VIEW 3: MINIMALIST COVENANT PAYMENT FALLBACK (BCH Watch-Only QR) */}
        {/* ================================================================ */}
        {cardState === 'deposit' && activeSwap && (
          <div className="p-2 space-y-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCardState('form')}
                className="flex items-center gap-1.5 text-xs font-semibold text-ink-3 hover:text-ink cursor-pointer"
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
              <div className="text-2xl font-semibold text-ink tabular-nums">
                {activeSwap.fromAmount} {activeSwap.fromToken}
              </div>
              <div className="text-xs text-ink-2">
                → {activeSwap.toAmount} {activeSwap.toToken} ({formatAddress(activeSwap.recipientAddress)})
              </div>
            </div>

            {/* Clean QR of Unique Per-Swap P2SH32 Covenant */}
            <div className="flex flex-col items-center">
              <div className="p-3 bg-white rounded-panel border border-gray-200 ">
                <img
                  src={generateQrDataUrl(activeSwap.depositAddress, 5, 2)}
                  alt="Covenant QR"
                  className="w-44 h-44 object-contain"
                />
              </div>
              <p className="text-[11px] text-ink-3 mt-2.5">{t.autoDetectHint}</p>
            </div>

            {/* 1-Click Remote Sign Action via WizardConnect / Nostr Tunnel */}
            {hasActiveBchSigningCapability(wizardConnectManager) && (
              <button
                type="button"
                disabled={executing}
                onClick={handleTriggerRemoteSign}
                className="w-full h-11 rounded-control bg-primary text-black font-semibold text-xs flex items-center justify-center gap-2 hover:brightness-105 active:scale-[0.99] transition shadow-xs cursor-pointer disabled:opacity-60"
              >
                {executing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{signingStep || (lang === 'es' ? 'Autorizando en Paytaca...' : 'Authorizing in Paytaca...')}</span>
                  </>
                ) : (
                  <>
                    <Smartphone className="w-4 h-4" />
                    <span>{lang === 'es' ? '📱 Autorizar en Paytaca (1-Click Remoto)' : '📱 Authorize in Paytaca (1-Click)'}</span>
                  </>
                )}
              </button>
            )}

            {/* Copy / Deep-Link Actions */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleCopy(activeSwap.depositAddress)}
                className="h-10 rounded-control bg-surface-2 hover:bg-surface-3 text-xs font-semibold text-ink flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                {copiedContract ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedContract ? (lang === 'es' ? 'Copiado' : 'Copied') : t.copyAddress}</span>
              </button>

              <a
                href={activeSwap.depositAddress}
                className="h-10 rounded-control bg-primary text-black text-xs font-semibold flex items-center justify-center gap-1.5 hover:brightness-105 transition"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>{t.openPaytaca}</span>
              </a>
            </div>

            {/* Optional Collapsible Manual TXID Input */}
            <div className="pt-1 border-t border-line">
              <button
                type="button"
                onClick={() => setManualTxOpen(!manualTxOpen)}
                className="w-full text-center text-[11px] text-ink-3 hover:text-ink-2 py-1 cursor-pointer"
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
                    className="flex-1 min-w-0 bg-surface-2 border border-line rounded-control px-3 py-2 text-xs font-mono text-ink outline-none"
                  />
                  <button
                    type="button"
                    disabled={verifyingTx}
                    onClick={handleVerifyDeposit}
                    className="px-3.5 py-2 rounded-control bg-ink text-canvas text-xs font-semibold cursor-pointer disabled:opacity-50"
                  >
                    {verifyingTx ? '...' : t.verifyNow}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* VIEW 3: CELEBRATORY ON-CHAIN SUCCESS RECEIPT                     */}
        {/* ================================================================ */}
        {cardState === 'success' && activeSwap && (
          <div className="p-4 sm:p-6 text-center space-y-5 animate-in fade-in zoom-in-95 duration-300">
            {/* Top Status Badge in Bitcoin Orange */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-[11px] font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span>{!isTestnet ? t.mainnetSuccessTitle : (lang === 'es' ? 'Swap Confirmado On-Chain' : 'On-Chain Settlement Confirmed')}</span>
            </div>

            {/* Big Animated Check Circle in Bitcoin Orange */}
            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto border-2 border-primary/40 shadow-lg shadow-primary/25">
              <Check className="w-8 h-8 text-primary stroke-[3]" />
            </div>

            {/* Received Amount & Source */}
            <div className="space-y-1">
              <p className="text-3xl font-extrabold text-ink tabular-nums tracking-tight">
                +{activeSwap.toAmount} {activeSwap.toToken}
              </p>
              <p className="text-xs text-ink-3">
                {!isTestnet
                  ? (lang === 'es' ? 'Aporte recibido en la Tesorería de BinaryLiquid' : 'Contributed to BinaryLiquid Treasury Vault')
                  : `${lang === 'es' ? 'Recibido desde' : 'Swapped from'} ${activeSwap.fromAmount} ${activeSwap.fromToken}`}
              </p>
              <p className="text-xs text-ink-2 font-mono pt-1">
                {t.sentTo}: {formatAddress(activeSwap.recipientAddress)} {!isTestnet ? '(Protocol Vault)' : ''}
              </p>
            </div>

            {/* Real TXID Pill with Copy & Explorer Link */}
            {(activeSwap.payoutTxHash || activeSwap.depositTxHash) && (
              <div className="p-3 rounded-xl bg-surface-2 border border-line space-y-2 text-left">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-ink-3 uppercase">
                    {activeSwap.payoutTxHash ? (lang === 'es' ? 'TxID Despacho:' : 'Payout TxID:') : 'Deposit TxID:'}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopy(activeSwap.payoutTxHash || activeSwap.depositTxHash)}
                      className="text-ink-3 hover:text-ink font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Copiar TxID"
                    >
                      {copiedContract ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedContract ? (lang === 'es' ? 'Copiado' : 'Copied') : (lang === 'es' ? 'Copiar' : 'Copy')}</span>
                    </button>
                    {activeSwap.payoutExplorerUrl && (
                      <a
                        href={activeSwap.payoutExplorerUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline font-semibold flex items-center gap-1"
                        title={lang === 'es' ? 'Ver en explorador blockchain' : 'View on blockchain explorer'}
                      >
                        <span>{lang === 'es' ? 'Explorador' : 'Explorer'}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
                <div className="font-mono text-[11px] text-ink select-all break-all bg-surface p-2 rounded-lg border border-line/60">
                  {activeSwap.payoutTxHash || activeSwap.depositTxHash}
                </div>
              </div>
            )}

            {/* Settlement Guarantee Specs */}
            <div className="space-y-1.5 pt-2 border-t border-line text-[11px] text-ink-3 text-left">
              <div className="flex items-center justify-between">
                <span>{lang === 'es' ? 'Seguridad:' : 'Security:'}</span>
                <span className="font-semibold text-ink-2">{!isTestnet ? 'Bitcoin Cash Mainnet (P2SH32 Covenant)' : 'Covenant CashScript P2SH32'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>{lang === 'es' ? 'Custodia:' : 'Custody:'}</span>
                <span className="font-semibold text-primary">{!isTestnet ? '100% No Custodial • On-Chain' : '100% No Custodial'}</span>
              </div>
            </div>

            {/* New Swap Button */}
            <button
              type="button"
              onClick={() => {
                setActiveSwap(null);
                setCardState('form');
              }}
              className="w-full ui-btn-primary ui-btn-lg font-bold text-xs cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
            >
              <span>{t.newSwap}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* COMPACT OPEN LIMIT ORDERS LIST */}
      {activeTab === 'limit' && limitOrders.length > 0 && (
        <div className="mt-4 bg-surface border border-line rounded-panel p-3.5 space-y-2">
          <div className="text-xs font-semibold text-ink-2 px-1">
            {t.openOrders}
          </div>
          {limitOrders.slice(0, 5).map(order => (
            <div
              key={order.id}
              className="flex items-center justify-between px-3 py-2.5 rounded-control bg-surface-2 text-xs"
            >
              <div>
                <div className="font-semibold text-ink tabular-nums">
                  {order.fromAmount} {order.fromToken} → {order.expectedOutput} {order.toToken}
                </div>
                <div className="text-[11px] text-ink-3 tabular-nums">
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
