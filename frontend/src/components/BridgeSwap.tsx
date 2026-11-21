import { Buffer } from 'buffer';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  ArrowLeft,
  ArrowRight,
  ClipboardPaste,
  ArrowLeftRight,
  RefreshCw,
  ShieldCheck,
  Wallet
} from 'lucide-react';
import TokenSelectModal, { SUPPORTED_TOKENS, TokenInfo } from './TokenSelectModal';
import qrcode from 'qrcode-generator';
import { convertCashAddressNetwork, formatAddress, formatCryptoBalance, isValidCashAddress } from '../utils/bchAddress';
import { Connection, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  createAssociatedTokenAccountInstruction
} from '@solana/spl-token';

if (typeof globalThis !== 'undefined' && !(globalThis as any).Buffer) {
  (globalThis as any).Buffer = Buffer;
}
import {
  executeWeb3VaultDeposit,
  executeBchSwapDeposit,
  hasActiveBchSigningCapability,
  repairEvmNetworkRpc,
  DEPLOYED_TESTNET_CONTRACTS,
  AuthSessionChain,
  EnsureAuthSessionOptions
} from '../services/walletConnectService';
import {
  hasActiveTonConnectSession,
  sendTonConnectDeposit,
  openTonConnectModal
} from '../services/tonConnectService';

interface BridgeSwapProps {
  userContext: any;
  userAddress: string;
  bchAddress?: string;
  bchQueryAddress?: string;
  bchWalletName?: string;
  bchWalletSource?: 'blconnect' | 'wizard' | 'wc2-bch' | 'extension' | 'manual';
  evmAddress?: string;
  solanaAddress?: string;
  solanaSource?: 'phantom' | 'solflare' | 'injected';
  tonAddress?: string;
  ltcAddress?: string;
  walletBalances?: {
    PUSD: number;
    BCH: number;
    USDT: number;
    USDC: number;
    POL: number;
    SOL?: number;
    USDT_SOL?: number;
    [k: string]: number | undefined;
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
  authToken?: string | null;
  onEnsureAuthSession?: (options?: EnsureAuthSessionOptions) => Promise<string | null>;
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
    limitRouteHint: 'Por precio objetivo',
    flipPair: 'Invertir par',
    quoting: 'Cotizando...',
    nonCustodialShort: '100% No custodial',
    minShort: 'Mín.',
    details: 'Detalles',
    fromLabel: 'Desde',
    toLabel: 'Hasta',
    customAddress: 'Otra dirección',
    covenantProtected: 'Covenant Protected',
    covenantSub: 'Enrutado vía CashScript P2SH32',
    estimatedTime: 'Tiempo estimado',
    networkFeeLabel: 'Comisión protocolo',
    bestRoute: 'Ruta directa sin custodia · ~3s'
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
    limitRouteHint: 'Target execution',
    flipPair: 'Flip pair',
    quoting: 'Quoting...',
    nonCustodialShort: '100% Non-custodial',
    minShort: 'Min.',
    details: 'Details',
    fromLabel: 'From',
    toLabel: 'To',
    customAddress: 'Custom Address',
    covenantProtected: 'Covenant Protected',
    covenantSub: 'Routed via CashScript P2SH32',
    estimatedTime: 'Estimated time',
    networkFeeLabel: 'Protocol fee',
    bestRoute: 'Direct non-custodial route · ~3s'
  }
};

type TokenChainKey = 'ton' | 'bnb' | 'bch' | 'solana' | 'litecoin' | 'ethereum' | 'polygon';

function resolveTokenChainKey(
  token: Pick<TokenInfo, 'symbol' | 'isBch' | 'isSolana' | 'isLtc' | 'isTon' | 'chain'>
): TokenChainKey {
  const sym = token.symbol.toUpperCase();
  if (token.chain === 'ton' || token.isTon || sym === 'TON') return 'ton';
  if (token.chain === 'bnb' || sym === 'BNB') return 'bnb';
  if (token.isBch || token.chain === 'bch') return 'bch';
  if (token.isSolana || token.chain === 'solana' || sym === 'SOL') return 'solana';
  if (token.isLtc || token.chain === 'litecoin' || sym === 'LTC') return 'litecoin';
  if (token.chain === 'ethereum' || sym === 'ETH') return 'ethereum';
  return 'polygon';
}

function getTokenChainMeta(token: TokenInfo, isTestnet: boolean) {
  const chainKey = resolveTokenChainKey(token);
  const table: Record<
    TokenChainKey,
    { badge: string; badgeClass: string; networkLabel: string; contractName: string; chainIcon: string }
  > = {
    ton: {
      badge: 'TON',
      badgeClass: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/20',
      networkLabel: isTestnet ? 'TON Testnet' : 'TON Blockchain',
      contractName: 'BinaryLiquidTonVault',
      chainIcon: '/TON.png'
    },
    bnb: {
      badge: 'BNB Chain',
      badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20',
      networkLabel: isTestnet ? 'BNB Testnet' : 'BNB Chain',
      contractName: 'BinaryLiquidVault.sol',
      chainIcon: '/BNB.png'
    },
    bch: {
      badge: 'BCH',
      badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      networkLabel: isTestnet ? 'BCH Chipnet' : 'Bitcoin Cash',
      contractName: 'BinaryLiquidEscrow.cash',
      chainIcon: '/BCH.png'
    },
    solana: {
      badge: 'Solana',
      badgeClass: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
      networkLabel: isTestnet ? 'Solana Devnet' : 'Solana',
      contractName: 'BinaryLiquidAnchorVault (SVM)',
      chainIcon: '/SOL.png'
    },
    litecoin: {
      badge: 'Litecoin',
      badgeClass: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20',
      networkLabel: isTestnet ? 'Litecoin Testnet4' : 'Litecoin',
      contractName: 'Litecoin P2WPKH Vault',
      chainIcon: '/LTC.png'
    },
    ethereum: {
      badge: 'Ethereum',
      badgeClass: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
      networkLabel: 'Ethereum Mainnet',
      contractName: 'BinaryLiquidVault.sol',
      chainIcon: '/ETH.png'
    },
    polygon: {
      badge: 'Polygon',
      badgeClass: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/20',
      networkLabel: isTestnet ? 'Polygon Amoy' : 'Polygon',
      contractName: 'BinaryLiquidVault.sol',
      chainIcon: '/POL.png'
    }
  };
  return { chainKey, ...table[chainKey] };
}

function formatPresetAmount(value: number, isVolatile: boolean): string {
  const decimals = isVolatile || value < 1 ? 4 : 2;
  return value.toFixed(decimals).replace(/\.?0+$/, '') || '0';
}

function isNativeChainAsset(symbol: string, chainKey: TokenChainKey): boolean {
  const sym = symbol.toUpperCase();
  return (
    (chainKey === 'bch' && sym === 'BCH') ||
    (chainKey === 'solana' && sym === 'SOL') ||
    (chainKey === 'litecoin' && sym === 'LTC') ||
    (chainKey === 'ton' && sym === 'TON') ||
    (chainKey === 'ethereum' && sym === 'ETH') ||
    (chainKey === 'bnb' && sym === 'BNB') ||
    (chainKey === 'polygon' && sym === 'POL')
  );
}

interface TokenPillChipProps {
  token: TokenInfo;
  meta: ReturnType<typeof getTokenChainMeta>;
  onClick: () => void;
}

function TokenPillChip({ token, meta, onClick }: TokenPillChipProps) {
  const showChainBadge = !isNativeChainAsset(token.symbol, meta.chainKey);
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2.5 pl-2 pr-1 py-1 rounded-2xl hover:bg-surface-2/70 transition-colors shrink-0 cursor-pointer group"
    >
      <div className="text-right">
        <div className="flex items-center justify-end gap-1">
          <ChevronDown className="w-3.5 h-3.5 text-ink-3 group-hover:text-ink transition-colors shrink-0" />
          <span className="font-semibold text-[16px] leading-tight text-ink">{token.symbol}</span>
        </div>
        <div className="text-[11px] leading-tight text-ink-3 mt-0.5 truncate max-w-[96px]">
          {meta.badge}
        </div>
      </div>
      <div className="relative shrink-0">
        <img
          src={token.icon}
          alt={token.symbol}
          className="w-10 h-10 rounded-full object-contain"
        />
        {showChainBadge && (
          <img
            src={meta.chainIcon}
            alt={meta.badge}
            className="w-4 h-4 rounded-full object-contain bg-surface ring-2 ring-surface absolute -bottom-0.5 -right-0.5"
          />
        )}
      </div>
    </button>
  );
}

function getTokenChainId(symbol: string, isBch: boolean, isTestnet: boolean, isSolana?: boolean, isLtc?: boolean, chain?: string): string {
  const key = resolveTokenChainKey({ symbol, isBch, isSolana, isLtc, chain });
  if (key === 'ton') return isTestnet ? 'ton_testnet' : 'ton_mainnet';
  if (key === 'bnb') return isTestnet ? 'bsc_testnet' : 'bsc_mainnet';
  if (key === 'bch') return isTestnet ? 'bch_chipnet' : 'bch_mainnet';
  if (key === 'solana') return isTestnet ? 'solana_devnet' : 'solana_mainnet';
  if (key === 'litecoin') return isTestnet ? 'litecoin_testnet4' : 'litecoin_mainnet';
  if (key === 'ethereum') return 'ethereum_mainnet';
  return isTestnet ? 'polygon_amoy' : 'polygon_mainnet';
}

function resolveTokenFromQuery(paramKey: 'from' | 'to', fallback: TokenInfo): TokenInfo {
  if (typeof window === 'undefined') return fallback;
  const raw = new URLSearchParams(window.location.search).get(paramKey)?.trim().toLowerCase();
  if (!raw) return fallback;
  return (
    SUPPORTED_TOKENS.find((tk) => !tk.disabled && (tk.id?.toLowerCase() === raw || tk.symbol.toLowerCase() === raw)) ||
    fallback
  );
}

export default function BridgeSwap({
  userContext,
  userAddress,
  bchAddress = '',
  bchQueryAddress = '',
  bchWalletName = '',
  bchWalletSource,
  evmAddress = '',
  solanaAddress = '',
  solanaSource,
  tonAddress = '',
  ltcAddress = '',
  walletBalances,
  onRefreshBalances,
  onConnectWallet,
  showToast,
  backendUrl,
  lang,
  platformNetwork = 'testnet',
  onToggleNetwork,
  wizardConnectManager,
  authToken,
  onEnsureAuthSession
}: BridgeSwapProps) {
  const t = UI_TEXT[lang] || UI_TEXT.es;
  const isTestnet = platformNetwork === 'testnet';
  const activeBchWalletLabel =
    bchWalletName && !bchWalletName.toLowerCase().includes('manual')
      ? bchWalletName
      : 'BinaryLiquid / WizardConnect';

  // Core Mode & Token Pair (Default: PUSD -> Polygon USDT)
  const [activeTab, setActiveTab] = useState<'swap' | 'limit'>('swap');
  const [sellToken, setSellToken] = useState<TokenInfo>(() => resolveTokenFromQuery('from', SUPPORTED_TOKENS[0])); // PUSD
  const [buyToken, setBuyToken] = useState<TokenInfo>(() =>
    resolveTokenFromQuery('to', SUPPORTED_TOKENS.find(tk => tk.id === 'usdt_polygon') || SUPPORTED_TOKENS[4])
  ); // USDT (Polygon)
  const sellMeta = useMemo(() => getTokenChainMeta(sellToken, isTestnet), [sellToken, isTestnet]);
  const buyMeta = useMemo(() => getTokenChainMeta(buyToken, isTestnet), [buyToken, isTestnet]);
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
  const [quoteCountdown, setQuoteCountdown] = useState<number>(12);
  const quoteAbortRef = useRef<AbortController | null>(null);
  const [detailsOpen, setDetailsOpen] = useState<boolean>(false);
  const [customAddressOpen, setCustomAddressOpen] = useState<boolean>(false);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [slippage, setSlippage] = useState<number>(0.5);
  const [customSlippage, setCustomSlippage] = useState<string>('');

  // Faucet Compact Drawer
  const [faucetOpen, setFaucetOpen] = useState<boolean>(false);
  const [faucetAddress, setFaucetAddress] = useState<string>('');
  const [claimingFaucet, setClaimingFaucet] = useState<boolean>(false);

  // Execution Lifecycle (100% Direct 1-Click Signing: form -> processing -> success)
  const [cardState, setCardState] = useState<'form' | 'processing' | 'success'>('form');
  const [processingStage, setProcessingStage] = useState<'authorizing' | 'settling'>('authorizing');
  const [executing, setExecuting] = useState<boolean>(false);
  const [signingStep, setSigningStep] = useState<string>('');
  const [swapError, setSwapError] = useState<{ message: string; isRpcError?: boolean } | null>(null);
  const [repairingRpc, setRepairingRpc] = useState<boolean>(false);
  const [activeSwap, setActiveSwap] = useState<any>(null);
  const [copiedContract, setCopiedContract] = useState<boolean>(false);

  // Limit Orders
  const [limitOrders, setLimitOrders] = useState<any[]>([]);

  // ==========================================================================
  // STRICT PAY-WALLET vs RECEIVE-ADDRESS SEPARATION
  // ==========================================================================
  const connectedSolana = solanaAddress || '';

  const ltcPollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ltcPollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoFilledTargetRef = useRef<string>('');

  const clearLtcPolling = useCallback(() => {
    if (ltcPollIntervalRef.current) {
      clearInterval(ltcPollIntervalRef.current);
      ltcPollIntervalRef.current = null;
    }
    if (ltcPollTimeoutRef.current) {
      clearTimeout(ltcPollTimeoutRef.current);
      ltcPollTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => () => clearLtcPolling(), [clearLtcPolling]);


  const connectedBch = useMemo(() => {
    const raw =
      bchAddress && isValidCashAddress(bchAddress)
        ? bchAddress
        : userAddress && isValidCashAddress(userAddress)
        ? userAddress
        : '';
    if (!raw) return '';
    return convertCashAddressNetwork(raw, isTestnet, true);
  }, [bchAddress, userAddress, isTestnet]);

  const connectedEvm = useMemo(() => {
    const raw =
      evmAddress ||
      (userContext?.evmAddress && userContext.evmAddress.startsWith('0x') ? userContext.evmAddress : '') ||
      (userAddress && userAddress.startsWith('0x') ? userAddress : '');
    return raw ? raw.trim() : '';
  }, [evmAddress, userContext?.evmAddress, userAddress]);

  // Wallet that PAYS (`sellToken`)
  const payingWalletAddress = sellToken.isBch
    ? connectedBch
    : sellToken.isSolana
    ? connectedSolana
    : sellToken.isLtc || sellToken.symbol.toUpperCase() === 'LTC'
    ? (ltcAddress || '')
    : sellToken.chain === 'ton' || sellToken.symbol.toUpperCase() === 'TON'
    ? (tonAddress || '')
    : connectedEvm;
  const isPayingWalletConnected = Boolean(payingWalletAddress);

  // Optional secondary wallet ONLY used if user taps "Mi wallet" chip
  const optionalReceiveWallet = buyToken.isBch
    ? connectedBch
    : buyToken.isSolana
    ? connectedSolana
    : buyToken.isLtc || buyToken.symbol.toUpperCase() === 'LTC'
    ? ltcAddress
    : buyToken.chain === 'ton' || buyToken.symbol.toUpperCase() === 'TON'
    ? tonAddress
    : connectedEvm;
  const isReceivingWalletConnected = Boolean(optionalReceiveWallet);

  // Live balance of the paying token
  const sellBalance = useMemo(() => {
    if (!isPayingWalletConnected || !walletBalances) return null;
    if (sellToken.chain === 'ton') {
      if (sellToken.symbol.toUpperCase() === 'TON') return walletBalances.TON ?? 0;
      return walletBalances.USDT_TON ?? 0;
    }
    if (sellToken.chain === 'bnb') {
      if (sellToken.symbol.toUpperCase() === 'BNB') return walletBalances.BNB ?? 0;
      return walletBalances.USDT_BSC ?? 0;
    }
    if (sellToken.isLtc || sellToken.symbol.toUpperCase() === 'LTC') {
      return typeof walletBalances.LTC === 'number' ? walletBalances.LTC : null;
    }
    if (sellToken.isSolana) {
      if (sellToken.symbol.toUpperCase() === 'SOL') return walletBalances.SOL ?? 0;
      return walletBalances.USDT_SOL ?? 0;
    }
    const sym = sellToken.symbol.toUpperCase() as keyof typeof walletBalances;
    return typeof walletBalances[sym] === 'number' ? (walletBalances[sym] as number) : 0;
  }, [isPayingWalletConnected, walletBalances, sellToken.symbol, sellToken.isSolana, sellToken.isLtc, sellToken.chain]);

  // Live balance of the receiving token
  const buyBalance = useMemo(() => {
    if (!isReceivingWalletConnected || !walletBalances) return null;
    if (buyToken.chain === 'ton') {
      if (buyToken.symbol.toUpperCase() === 'TON') return walletBalances.TON ?? 0;
      return walletBalances.USDT_TON ?? 0;
    }
    if (buyToken.chain === 'bnb') {
      if (buyToken.symbol.toUpperCase() === 'BNB') return walletBalances.BNB ?? 0;
      return walletBalances.USDT_BSC ?? 0;
    }
    if (buyToken.isLtc || buyToken.symbol.toUpperCase() === 'LTC') {
      return typeof walletBalances.LTC === 'number' ? walletBalances.LTC : null;
    }
    if (buyToken.isSolana) {
      if (buyToken.symbol.toUpperCase() === 'SOL') return walletBalances.SOL ?? 0;
      return walletBalances.USDT_SOL ?? 0;
    }
    const sym = buyToken.symbol.toUpperCase() as keyof typeof walletBalances;
    return typeof walletBalances[sym] === 'number' ? (walletBalances[sym] as number) : 0;
  }, [isReceivingWalletConnected, walletBalances, buyToken.symbol, buyToken.isSolana, buyToken.isLtc, buyToken.chain]);

  // Auto-fill recipient whenever receiving wallet connects/changes or customAddressOpen is off
  useEffect(() => {
    if (!optionalReceiveWallet) {
      const previousAutoFill = autoFilledTargetRef.current;
      autoFilledTargetRef.current = '';
      if (previousAutoFill) {
        setRecipientAddress(prev => (prev === previousAutoFill ? '' : prev));
      }
      return;
    }
    if (autoFilledTargetRef.current !== optionalReceiveWallet) {
      autoFilledTargetRef.current = optionalReceiveWallet;
      setRecipientAddress(optionalReceiveWallet);
      setCustomAddressOpen(false);
      return;
    }
    if (!customAddressOpen && recipientAddress !== optionalReceiveWallet) {
      setRecipientAddress(optionalReceiveWallet);
    }
  }, [optionalReceiveWallet, customAddressOpen, recipientAddress]);

  // Sync default faucet input with connected BCH wallet if empty
  useEffect(() => {
    if (connectedBch && !faucetAddress) {
      setFaucetAddress(connectedBch);
    }
  }, [connectedBch, faucetAddress]);

  // Keep pair liquidity-aware
  const isPairLiquid = useMemo(() => {
    if (!isTestnet) return false;
    const unsupportedTestnetChains = ['ton', 'bnb', 'ethereum'];
    if (
      unsupportedTestnetChains.includes(sellToken.chain || '') ||
      unsupportedTestnetChains.includes(buyToken.chain || '')
    ) {
      return false;
    }
    const a = sellToken.symbol.toUpperCase();
    const b = buyToken.symbol.toUpperCase();
    const sameToken = a === b;
    const differentChains = Boolean(
      sellToken.chain !== buyToken.chain ||
      sellToken.isBch !== buyToken.isBch ||
      Boolean(sellToken.isSolana) !== Boolean(buyToken.isSolana) ||
      Boolean(sellToken.isLtc) !== Boolean(buyToken.isLtc)
    );
    if (sameToken && !differentChains) return false;

    const allowed = ['PUSD', 'USDT', 'SOL', 'LTC'];
    return allowed.includes(a) && allowed.includes(b);
  }, [isTestnet, sellToken, buyToken]);

  // Validate destination address (`Recibir en`), auto-falling back to connected receiving wallet when customAddressOpen is off
  const normalizedRecipient = useMemo(() => {
    const raw = (
      customAddressOpen
        ? recipientAddress.trim()
        : recipientAddress.trim() || optionalReceiveWallet || ''
    ).trim();
    if (!raw) return '';
    if (buyToken.isBch) {
      if (/^0x/i.test(raw)) return '';
      const lowerRaw = raw.toLowerCase();
      const candidate =
        lowerRaw.startsWith('bchtest:') || lowerRaw.startsWith('bitcoincash:')
          ? lowerRaw
          : `${isTestnet ? 'bchtest' : 'bitcoincash'}:${lowerRaw}`;
      const converted = convertCashAddressNetwork(candidate, isTestnet, true);
      if (!isValidCashAddress(converted, isTestnet)) return '';
      return converted.length > 24 ? converted : '';
    }
    if (buyToken.isSolana || buyToken.symbol.toUpperCase() === 'SOL') {
      // Solana Base58 validation (32 to 44 characters)
      return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(raw) ? raw : '';
    }
    if (buyToken.chain === 'ton' || buyToken.symbol.toUpperCase() === 'TON') {
      if (/^[a-zA-Z0-9_-]{48}$/.test(raw)) return raw;
      if (/^-?[0-1]:[0-9a-fA-F]{64}$/.test(raw)) return raw;
      return '';
    }
    if (buyToken.isLtc || buyToken.symbol.toUpperCase() === 'LTC') {
      const bech32Match = (hrp: string) => {
        if (!new RegExp(`^${hrp}1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+$`, 'i').test(raw)) return false;
        if (raw !== raw.toLowerCase() && raw !== raw.toUpperCase()) return false;
        const body = raw.toLowerCase().slice(hrp.length + 1);
        return (
          (body[0] === 'q' && raw.length === hrp.length + 40) ||
          ((body[0] === 'q' || body[0] === 'p') && raw.length === hrp.length + 60)
        );
      };
      if (isTestnet) {
        if (bech32Match('tltc')) return raw.toLowerCase();
        if (/^[mn2Q][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(raw)) return raw;
        return '';
      }
      if (bech32Match('ltc')) return raw.toLowerCase();
      if (/^[LM3][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(raw)) return raw;
      return '';
    }
    return /^0x[a-fA-F0-9]{40}$/.test(raw) ? raw : '';
  }, [recipientAddress, customAddressOpen, optionalReceiveWallet, buyToken.isBch, buyToken.isSolana, buyToken.isLtc, buyToken.chain, buyToken.symbol, isTestnet]);

  const isRecipientValid = Boolean(normalizedRecipient);

  // ==========================================================================
  // LIVE ORACLE QUOTE (WITH ABORT CONTROLLER & 12s AUTO-REFRESH COUNTDOWN)
  // ==========================================================================
  const fetchQuote = useCallback(async () => {
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0 || !isPairLiquid) {
      quoteAbortRef.current?.abort();
      setQuote(null);
      setLoadingQuote(false);
      return;
    }

    quoteAbortRef.current?.abort();
    const controller = new AbortController();
    quoteAbortRef.current = controller;

    setLoadingQuote(true);
    try {
      const fromChain = getTokenChainId(sellToken.symbol, sellToken.isBch, isTestnet, sellToken.isSolana, sellToken.isLtc, sellToken.chain);
      const toChain = getTokenChainId(buyToken.symbol, buyToken.isBch, isTestnet, buyToken.isSolana, buyToken.isLtc, buyToken.chain);
      const res = await fetch(
        `${backendUrl}/api/quote?fromToken=${sellToken.symbol}&toToken=${buyToken.symbol}&amount=${parsed}&network=${platformNetwork}&fromChain=${fromChain}&toChain=${toChain}`,
        { signal: controller.signal }
      );
      const data = await res.json();
      if (controller.signal.aborted) return;
      if (data.success && data.quote) {
        setQuote(data.quote);
        setQuoteCountdown(12);
      } else {
        setQuote(null);
      }
    } catch (err: any) {
      if (err?.name === 'AbortError' || controller.signal.aborted) return;
      setQuote(null);
    } finally {
      if (!controller.signal.aborted) {
        setLoadingQuote(false);
      }
    }
  }, [amount, sellToken, buyToken, isPairLiquid, isTestnet, platformNetwork, backendUrl]);

  useEffect(() => {
    const timer = setTimeout(fetchQuote, 180);
    return () => {
      clearTimeout(timer);
      quoteAbortRef.current?.abort();
    };
  }, [fetchQuote]);

  useEffect(() => {
    const parsed = parseFloat(amount);
    if (cardState !== 'form' || activeTab !== 'swap' || !isPairLiquid || !amount || isNaN(parsed) || parsed <= 0) {
      return;
    }
    const interval = setInterval(() => {
      setQuoteCountdown(prev => {
        if (prev <= 1) {
          fetchQuote();
          return 12;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [cardState, activeTab, isPairLiquid, amount, fetchQuote]);

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

  const quickAmountOptions = useMemo(() => {
    const isVolatile = ['BCH', 'SOL', 'LTC', 'ETH', 'BNB', 'TON', 'POL'].includes(
      sellToken.symbol.toUpperCase()
    );
    if (isPayingWalletConnected && sellBalance !== null && sellBalance > 0) {
      return [
        { label: '25%', value: formatPresetAmount(sellBalance * 0.25, isVolatile) },
        { label: '50%', value: formatPresetAmount(sellBalance * 0.5, isVolatile) },
        { label: '75%', value: formatPresetAmount(sellBalance * 0.75, isVolatile) },
        { label: t.max, value: String(sellBalance) }
      ];
    }
    const defaults = isVolatile ? ['0.05', '0.1', '0.5', '1'] : ['10', '25', '50', '100'];
    return defaults.map(v => ({ label: isVolatile ? v : `$${v}`, value: v }));
  }, [sellToken.symbol, isPayingWalletConnected, sellBalance, t.max]);

  // ==========================================================================
  // ACTIONS
  // ==========================================================================
  const getConnectedWalletForToken = useCallback(
    (tk: TokenInfo): string => {
      if (tk.isBch) return connectedBch;
      if (tk.isSolana) return connectedSolana;
      if (tk.isLtc || tk.symbol.toUpperCase() === 'LTC') return ltcAddress || '';
      if (tk.chain === 'ton' || tk.symbol.toUpperCase() === 'TON') return tonAddress || '';
      return connectedEvm;
    },
    [connectedBch, connectedSolana, ltcAddress, tonAddress, connectedEvm]
  );

  const handleFlipTokens = () => {
    const prevSell = sellToken;
    const prevBuy = buyToken;
    const nextReceive = getConnectedWalletForToken(prevSell);
    setSellToken(prevBuy);
    setBuyToken(prevSell);
    setQuote(null);
    setSwapError(null);
    setCustomAddressOpen(false);
    setRecipientAddress(nextReceive || '');
    autoFilledTargetRef.current = nextReceive || '';
  };

  const handleSelectToken = (token: TokenInfo) => {
    const incomingChain = resolveTokenChainKey(token);
    if (tokenModalTarget === 'sell') {
      const isSameTokenAndChain =
        token.symbol.toUpperCase() === buyToken.symbol.toUpperCase() &&
        incomingChain === buyMeta.chainKey;

      if (isSameTokenAndChain) {
        handleFlipTokens();
      } else {
        setSellToken(token);
      }
    } else if (tokenModalTarget === 'buy') {
      const isSameTokenAndChain =
        token.symbol.toUpperCase() === sellToken.symbol.toUpperCase() &&
        incomingChain === sellMeta.chainKey;

      if (isSameTokenAndChain) {
        handleFlipTokens();
      } else {
        const nextReceive = getConnectedWalletForToken(token);
        setBuyToken(token);
        if (!customAddressOpen && nextReceive) {
          setRecipientAddress(nextReceive);
          autoFilledTargetRef.current = nextReceive;
        } else {
          const raw = recipientAddress.trim();
          if (raw) {
            const isEvm = raw.startsWith('0x');
            const isBch = raw.startsWith('bchtest:') || raw.startsWith('bitcoincash:');
            const isSol = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(raw) && !isEvm;
            if (incomingChain === 'bch' && !isBch) setRecipientAddress(nextReceive || '');
            else if (incomingChain === 'solana' && !isSol) setRecipientAddress(nextReceive || '');
            else if (!['bch', 'solana', 'litecoin', 'ton'].includes(incomingChain) && !isEvm)
              setRecipientAddress(nextReceive || '');
          } else if (nextReceive) {
            setRecipientAddress(nextReceive);
            autoFilledTargetRef.current = nextReceive;
          }
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
    if (!isValidCashAddress(cleanAddr, true)) {
      showToast(t.faucetPlaceholder, 'error');
      return;
    }

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

    setSwapError(null);
    setExecuting(true);
    setCardState('processing');
    setProcessingStage('authorizing');
    setSigningStep(t.signing);

    try {
      const minOut =
        effectiveQuoteMetrics.netPayout > 0
          ? Number((effectiveQuoteMetrics.netPayout * (1 - slippage / 100)).toFixed(6))
          : 0;

      // 1. Create Non-Custodial Swap Order
      const createRes = await fetch(`${backendUrl}/api/swap/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromToken: sellToken.symbol,
          toToken: buyToken.symbol,
          fromChain: getTokenChainId(sellToken.symbol, sellToken.isBch, isTestnet, sellToken.isSolana, sellToken.isLtc, sellToken.chain),
          toChain: getTokenChainId(buyToken.symbol, buyToken.isBch, isTestnet, buyToken.isSolana, buyToken.isLtc, buyToken.chain),
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

      const verifySwapWithRetry = async (swapId: string, txHash: string, maxAttempts = 5) => {
        let lastData: any = null;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          const verifyRes = await fetch(`${backendUrl}/api/swap/${swapId}/verify-tx`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ txHash })
          });
          lastData = await verifyRes.json();
          if (lastData?.success) return lastData;
          const errText = String(lastData?.error || lastData?.reason || '').toLowerCase();
          const isPermanentError =
            errText.includes('replay') ||
            errText.includes('slippage') ||
            errText.includes('rejected') ||
            errText.includes('failed on-chain');
          if (isPermanentError || attempt === maxAttempts) break;
          await new Promise(r => setTimeout(r, 1500));
        }
        return lastData;
      };

      // 2A. Paying Litecoin (tLTC / LTC): Show QR & Auto-poll for on-chain mempool detection
      if (sellToken.isLtc || sellToken.symbol.toUpperCase() === 'LTC') {
        setProcessingStage('settling');
        setSigningStep(
          lang === 'es'
            ? 'Esperando depósito de Litecoin en la red...'
            : 'Waiting for Litecoin deposit on network...'
        );

        clearLtcPolling();
        ltcPollIntervalRef.current = setInterval(async () => {
          try {
            const checkRes = await fetch(`${backendUrl}/api/swap/${createdSwap.id}`);
            const checkData = await checkRes.json();
            if (checkData.success && checkData.swap) {
              if (checkData.swap.status === 'DEPOSIT_DETECTED' || checkData.swap.status === 'CONFIRMING') {
                setSigningStep(
                  lang === 'es'
                    ? '¡Depósito detectado en Litecoin! Confirmando y liquidando...'
                    : 'Litecoin deposit detected! Confirming and settling...'
                );
              } else if (checkData.swap.status === 'COMPLETED') {
                clearLtcPolling();
                setActiveSwap(checkData.swap);
                setCardState('success');
                setAmount('');
                onRefreshBalances?.();
                showToast(t.completed, 'success');
              }
            }
          } catch (_) {}
        }, 3000);

        ltcPollTimeoutRef.current = setTimeout(() => {
          clearLtcPolling();
          setExecuting(false);
          setCardState('form');
          setSigningStep('');
          showToast(
            lang === 'es'
              ? 'Tiempo de espera de detección de Litecoin agotado (15m). Puedes verificar el estado en tu historial.'
              : 'Litecoin deposit detection timed out (15m). You can check status in your history.',
            'error'
          );
        }, 15 * 60 * 1000);
        return;
      }

      // 2B. Paying Solana Native SOL or SPL Token (`USDT` on Solana Devnet): Phantom / Solflare Sign & Send
      if (sellToken.isSolana) {
        const isNativeSol = sellToken.symbol.toUpperCase() === 'SOL';
        setSigningStep(
          lang === 'es'
            ? `Esperando firma en Phantom/Solflare (${isNativeSol ? 'SOL' : 'SPL'})...`
            : `Waiting for Solana wallet signature (${isNativeSol ? 'SOL' : 'SPL'})...`
        );

        const win = typeof window !== 'undefined' ? (window as any) : {};
        const solanaProvider =
          solanaSource === 'solflare'
            ? win.solflare
            : solanaSource === 'phantom'
            ? (win.phantom?.solana || (win.solana?.isPhantom ? win.solana : null))
            : win.solflare?.publicKey &&
              connectedSolana &&
              win.solflare.publicKey.toString() === connectedSolana
            ? win.solflare
            : win.phantom?.solana || (win.solana?.isPhantom ? win.solana : win.solana);
        if (!solanaProvider) {
          throw new Error(
            lang === 'es'
              ? 'Por favor instala y conecta Phantom o Solflare Wallet para pagar desde Solana'
              : 'Please install and connect Phantom or Solflare Wallet to pay from Solana'
          );
        }

        if (!solanaProvider.publicKey) {
          await solanaProvider.connect();
        }
        const rawUserPk = solanaProvider.publicKey;
        if (!rawUserPk) {
          throw new Error(lang === 'es' ? 'No se detectó cuenta activa en billetera Solana' : 'No active Solana wallet account');
        }
        const userPubkey = new PublicKey(
          typeof rawUserPk.toBase58 === 'function' ? rawUserPk.toBase58() : rawUserPk.toString()
        );

        const solanaRpc = isTestnet
          ? 'https://api.devnet.solana.com'
          : 'https://solana-rpc.publicnode.com';
        const connection = new Connection(solanaRpc, 'confirmed');

        const vaultAddress = createdSwap.depositAddress || DEPLOYED_TESTNET_CONTRACTS.solanaDevnetVaultAddress;
        const vaultPubkey = new PublicKey(vaultAddress);

        const decimals = isNativeSol ? 9 : sellToken.decimals || 6;
        const fixedAmt = Number(createdSwap.fromAmount).toFixed(decimals);
        const [wholePart, fracPart = ''] = fixedAmt.split('.');
        const rawAmount = BigInt(`${wholePart}${(fracPart + '0'.repeat(decimals)).slice(0, decimals)}`);

        const transaction = new Transaction();

        if (isNativeSol) {
          transaction.add(
            SystemProgram.transfer({
              fromPubkey: userPubkey,
              toPubkey: vaultPubkey,
              lamports: rawAmount
            })
          );
        } else {
          const mintAddress =
            createdSwap.tokenContractAddress ||
            (isTestnet
              ? DEPLOYED_TESTNET_CONTRACTS.solanaDevnetUsdtMint
              : sellToken.categoryOrAddress || 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB');
          const mintPubkey = new PublicKey(mintAddress);
          const sourceAta = await getAssociatedTokenAddress(mintPubkey, userPubkey);
          const vaultAta = await getAssociatedTokenAddress(mintPubkey, vaultPubkey, true);

          if (isTestnet) {
            let currentTokenUnits = 0n;
            try {
              const balRes = await connection.getTokenAccountBalance(sourceAta, 'confirmed');
              currentTokenUnits = BigInt(balRes?.value?.amount || '0');
            } catch {
              currentTokenUnits = 0n;
            }
            if (currentTokenUnits < rawAmount) {
              await fetch(`${backendUrl}/api/faucet/testnet`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  recipient: userPubkey.toBase58(),
                  token: 'USDT',
                  chain: 'solana_devnet',
                  amount: Math.max(Number(createdSwap.fromAmount), 100)
                })
              }).catch(() => null);
            }
          }

          // Ensure Vault ATA exists
          const vaultAtaInfo = await connection.getAccountInfo(vaultAta);
          if (!vaultAtaInfo) {
            transaction.add(
              createAssociatedTokenAccountInstruction(
                userPubkey,
                vaultAta,
                vaultPubkey,
                mintPubkey
              )
            );
          }

          transaction.add(
            createTransferInstruction(
              sourceAta,
              vaultAta,
              userPubkey,
              rawAmount
            )
          );
        }

        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = userPubkey;

        let txSignature = '';
        try {
          const sendResult = await solanaProvider.signAndSendTransaction(transaction, {
            skipPreflight: false,
            preflightCommitment: 'confirmed'
          });
          txSignature = typeof sendResult === 'string' ? sendResult : sendResult?.signature;
        } catch (sendErr: any) {
          const errMsg = String(sendErr?.message || sendErr || '').toLowerCase();
          const userRejected =
            sendErr?.code === 4001 ||
            errMsg.includes('rejected') ||
            errMsg.includes('cancelled') ||
            errMsg.includes('canceled') ||
            errMsg.includes('user denied');
          if (userRejected || typeof solanaProvider.signTransaction !== 'function') {
            throw sendErr;
          }
          // Fallback if wallet internal RPC is on Mainnet while dApp is on Devnet
          const signedTx = await solanaProvider.signTransaction(transaction);
          const rawTx =
            typeof signedTx?.serialize === 'function'
              ? signedTx.serialize()
              : transaction.serialize();
          txSignature = await connection.sendRawTransaction(rawTx, {
            skipPreflight: false,
            preflightCommitment: 'confirmed'
          });
        }
        if (!txSignature) {
          throw new Error(lang === 'es' ? 'Solana no devolvió firma de transacción' : 'Solana did not return a transaction signature');
        }
        try {
          await connection.confirmTransaction(
            { signature: txSignature, blockhash, lastValidBlockHeight },
            'confirmed'
          );
        } catch (confirmErr) {
          // Fallback to HTTP status check if WS confirmation drops; backend /verify-tx confirms on-chain too.
          console.warn('[Solana] confirmTransaction WS fallback:', confirmErr);
          await connection.getSignatureStatuses([txSignature]).catch(() => null);
        }

        setProcessingStage('settling');
        setSigningStep(t.settling);

        const verifyData = await verifySwapWithRetry(createdSwap.id, txSignature, 5);
        if (!verifyData?.success) {
          throw new Error(verifyData?.error || 'Error liquidando swap en contrato destino');
        }

        setActiveSwap(verifyData.swap);
        setCardState('success');
        setAmount('');
        onRefreshBalances?.();
        showToast(t.completed, 'success');
        return;
      }

      // 2B-TON. Paying from TON (Native TON or TON Jetton via TON Connect UI 2.0)
      if (sellToken.isTon || sellToken.chain === 'ton' || sellToken.symbol.toUpperCase() === 'TON') {
        if (!hasActiveTonConnectSession()) {
          setCardState('form');
          setExecuting(false);
          setSigningStep('');
          showToast(
            lang === 'es'
              ? 'Conecta tu billetera TON con TON Connect para firmar el depósito en 1-Click'
              : 'Connect your TON wallet via TON Connect for 1-Click signing',
            'error'
          );
          await openTonConnectModal();
          return;
        }

        setSigningStep(
          lang === 'es'
            ? 'Esperando firma en tu billetera TON (TON Connect)...'
            : 'Waiting for TON wallet signature (TON Connect)...'
        );
        const { boc } = await sendTonConnectDeposit({
          depositAddress: createdSwap.depositAddress,
          amountTon: Number(createdSwap.fromAmount)
        });

        setProcessingStage('settling');
        setSigningStep(t.settling);
        const verifyData = await verifySwapWithRetry(createdSwap.id, boc, 4);
        if (!verifyData?.success) {
          throw new Error(verifyData?.error || 'Error liquidando swap desde TON');
        }

        setActiveSwap(verifyData.swap);
        setCardState('success');
        setAmount('');
        onRefreshBalances?.();
        showToast(t.completed, 'success');
        return;
      }

      // 2B. Paying EVM Token (`USDT` on Polygon): Direct 1-Click MetaMask / WC2 Deposit + Instant Settlement
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
        const verifyData = await verifySwapWithRetry(createdSwap.id, txHash, 4);
        if (!verifyData?.success) {
          throw new Error(verifyData?.error || 'Error liquidando en contrato destino');
        }

        setActiveSwap(verifyData.swap);
        setCardState('success');
        setAmount('');
        onRefreshBalances?.();
        showToast(t.completed, 'success');
        return;
      }

      // 2C. Paying BCH CashToken (`PUSD` -> `USDT` Polygon or Solana):
      // Always use 1-Click Direct Signing (Cashonize WC2 / Paytaca WizardConnect / Paytaca Extension)
      if (!hasActiveBchSigningCapability(wizardConnectManager, bchWalletSource)) {
        setCardState('form');
        setExecuting(false);
        setSigningStep('');
        showToast(
          lang === 'es'
            ? 'Sesión de firma expirada: vuelve a conectar BinaryLiquid o WizardConnect para firmar en 1-Click'
            : 'Signing session expired: please reconnect BinaryLiquid or WizardConnect for 1-Click signing',
          'error'
        );
        onConnectWallet();
        return;
      }

      const { txHash } = await executeBchSwapDeposit({
        backendUrl,
        buildEndpoint: `/api/swap/${createdSwap.id}/build-bch-tx`,
        senderAddress: bchQueryAddress || payingWalletAddress,
        isTestnet,
        wizardManager: wizardConnectManager,
        preferredSource: bchWalletSource,
        onStatus: msg => setSigningStep(msg)
      });

      setProcessingStage('settling');
      setSigningStep(t.settling);

      const verifyData = await verifySwapWithRetry(createdSwap.id, txHash, 4);
      if (!verifyData?.success) {
        throw new Error(verifyData?.error || 'Error liquidando en contrato destino');
      }

      setActiveSwap(verifyData.swap);
      setCardState('success');
      setAmount('');
      onRefreshBalances?.();
      showToast(t.completed, 'success');
      return;
    } catch (err: any) {
      const message = err?.message || (lang === 'es' ? 'Error al ejecutar swap' : 'Error executing swap');
      setSwapError({ message, isRpcError: Boolean(err?.isRpcError) });
      showToast(message, 'error');
      setCardState('form');
    } finally {
      setExecuting(false);
      setSigningStep('');
    }
  };

  const handleRepairEvmRpc = async () => {
    setRepairingRpc(true);
    try {
      const rpcUrl = await repairEvmNetworkRpc(isTestnet);
      setSwapError(null);
      showToast(
        lang === 'es'
          ? `Red Polygon actualizada (${rpcUrl}). Intenta tu swap de nuevo.`
          : `Polygon RPC updated (${rpcUrl}). Try your swap again.`,
        'success'
      );
    } catch (err: any) {
      showToast(
        err?.message ||
          (lang === 'es'
            ? 'No se pudo actualizar automáticamente. Cámbialo manualmente en MetaMask.'
            : 'Could not auto-update RPC. Update it manually in MetaMask.'),
        'error'
      );
    } finally {
      setRepairingRpc(false);
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

    const sellChain = (
      sellToken.chain ||
      (sellToken.isBch ? 'bch' : sellToken.isSolana ? 'solana' : sellToken.isLtc ? 'litecoin' : sellToken.isTon ? 'ton' : 'polygon')
    ).toLowerCase();
    if (
      sellToken.isSolana ||
      sellToken.isLtc ||
      sellToken.isTon ||
      ['solana', 'litecoin', 'ltc', 'ton', 'bnb', 'bsc'].includes(sellChain)
    ) {
      showToast(
        lang === 'es'
          ? `Las órdenes límite aún no están disponibles para ${sellToken.symbol} en esta red. Usa Intercambiar.`
          : `Limit orders are not yet supported for ${sellToken.symbol} on this network. Use Swap instead.`,
        'error'
      );
      return;
    }
    if (sellToken.isBch && !hasActiveBchSigningCapability(wizardConnectManager, bchWalletSource)) {
      showToast(
        lang === 'es'
          ? 'Las órdenes límite BCH requieren una billetera con firma activa (BinaryLiquid Wallet o WizardConnect).'
          : 'BCH limit orders require an active signing wallet (BinaryLiquid Wallet or WizardConnect).',
        'error'
      );
      return;
    }

    setSwapError(null);
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
          fromChain: getTokenChainId(sellToken.symbol, sellToken.isBch, isTestnet, sellToken.isSolana, sellToken.isLtc, sellToken.chain),
          toChain: getTokenChainId(buyToken.symbol, buyToken.isBch, isTestnet, buyToken.isSolana, buyToken.isLtc, buyToken.chain),
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
        const tokenAddress =
          order.tokenContractAddress ||
          (isTestnet ? DEPLOYED_TESTNET_CONTRACTS.amoyUsdtAddress : sellToken.categoryOrAddress || '');
        const { txHash } = await executeWeb3VaultDeposit({
          isTestnet,
          vaultAddress: order.depositAddress,
          tokenAddress,
          amount: parsedAmount,
          decimals: sellToken.decimals || 6,
          bchRecipient: normalizedRecipient,
          onStatus: msg => setSigningStep(msg)
        });

        const verifyRes = await fetch(`${backendUrl}/api/limit-orders/${order.id}/verify-tx`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ txHash })
        });
        const verifyData = await verifyRes.json().catch(() => ({}));
        if (!verifyRes.ok || !verifyData.success) {
          throw new Error(verifyData.error || 'Error verificando depósito de orden límite on-chain');
        }
      } else if (hasActiveBchSigningCapability(wizardConnectManager, bchWalletSource)) {
        const { txHash } = await executeBchSwapDeposit({
          backendUrl,
          buildEndpoint: `/api/limit-orders/${order.id}/build-bch-tx`,
          senderAddress: bchQueryAddress || payingWalletAddress,
          isTestnet,
          wizardManager: wizardConnectManager,
          preferredSource: bchWalletSource,
          onStatus: msg => setSigningStep(msg)
        });

        const verifyRes = await fetch(`${backendUrl}/api/limit-orders/${order.id}/verify-tx`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ txHash })
        });
        const verifyData = await verifyRes.json().catch(() => ({}));
        if (!verifyRes.ok || !verifyData.success) {
          throw new Error(verifyData.error || 'Error verificando depósito BCH de orden límite');
        }
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
      const targetOrder = limitOrders.find(o => o.id === orderId);
      const orderOwnerAddr = String(targetOrder?.userAddress || payingWalletAddress || '').trim();
      const orderChainHint = String(targetOrder?.fromChain || '').toLowerCase();
      let requiredChains: AuthSessionChain[];
      if (/^0x/i.test(orderOwnerAddr)) {
        requiredChains = ['evm'];
      } else if (/^(bchtest:|bitcoincash:)/i.test(orderOwnerAddr)) {
        requiredChains = ['bch'];
      } else if (orderChainHint.includes('bch') || orderChainHint.includes('chipnet')) {
        requiredChains = ['bch'];
      } else if (orderChainHint.includes('sol')) {
        requiredChains = ['solana'];
      } else if (
        orderChainHint.includes('poly') ||
        orderChainHint.includes('amoy') ||
        orderChainHint.includes('bsc') ||
        orderChainHint.includes('eth')
      ) {
        requiredChains = ['evm'];
      } else {
        requiredChains = sellToken.isBch ? ['bch'] : sellToken.isSolana ? ['solana'] : ['evm'];
      }

      const token = await onEnsureAuthSession?.({ chains: requiredChains });
      if (!token) return;
      const res = await fetch(`${backendUrl}/api/limit-orders/${orderId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ userAddress: orderOwnerAddr || payingWalletAddress })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || (lang === 'es' ? 'No se pudo cancelar la orden' : 'Failed to cancel order'), 'error');
        return;
      }
      fetchLimitOrders();
      showToast(lang === 'es' ? 'Orden cancelada' : 'Order cancelled', 'success');
    } catch (err: any) {
      showToast(err?.message || (lang === 'es' ? 'Error cancelando orden' : 'Cancel error'), 'error');
    }
  };

  // ==========================================================================
  // COMPUTED DISPLAY VALUES & PRIMARY CTA STATE
  // ==========================================================================
  const effectiveQuoteMetrics = useMemo(() => {
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0 || !isPairLiquid) {
      return { netPayout: 0, feeAmount: 0, netPayoutUsd: 0 };
    }
    const isExactQuoteMatch =
      quote?.netPayout !== undefined &&
      Math.abs(Number(quote.inputAmount) - parsed) < 1e-9;

    if (isExactQuoteMatch) {
      return {
        netPayout: Number(quote.netPayout),
        feeAmount: Number(quote.feeAmount || 0),
        netPayoutUsd:
          quote.netPayoutUsd !== undefined
            ? Number(quote.netPayoutUsd)
            : Number((Number(quote.netPayout) * Number(quote.priceToUsd || 1)).toFixed(2))
      };
    }

    const fallbackRate =
      quote?.rate && Number(quote.rate) > 0
        ? Number(quote.rate)
        : sellToken.isBch && !buyToken.isBch && sellToken.symbol === 'BCH'
        ? 470
        : !sellToken.isBch && buyToken.isBch && buyToken.symbol === 'BCH'
        ? 1 / 470
        : 1;
    const gross = parsed * fallbackRate;
    const fee = Number((gross * 0.003).toFixed(6));
    const net = Number((gross - fee).toFixed(6));
    const priceToUsd = Number(quote?.priceToUsd || 1);
    return {
      netPayout: net,
      feeAmount: fee,
      netPayoutUsd: Number((net * priceToUsd).toFixed(2))
    };
  }, [amount, isPairLiquid, quote, sellToken.isBch, sellToken.symbol, buyToken.isBch, buyToken.symbol]);

  const receiveDisplay = useMemo(() => {
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0 || !isPairLiquid) return '';

    let rawVal: number;
    if (activeTab === 'limit') {
      const r = parseFloat(targetRate) || 1;
      rawVal = parsed * r * 0.997;
    } else {
      rawVal = effectiveQuoteMetrics.netPayout;
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
  }, [amount, isPairLiquid, activeTab, targetRate, effectiveQuoteMetrics.netPayout, buyToken.symbol]);

  const ctaConfig = useMemo(() => {
    if (!isPairLiquid) {
      return { label: t.noLiquidity, disabled: true, variant: 'muted' as const };
    }
    if (executing) {
      return { label: signingStep || t.signing, disabled: true, variant: 'primary' as const };
    }
    if (!isPayingWalletConnected) {
      return {
        label: sellToken.isBch
          ? t.connectBchToPay
          : sellToken.isSolana
          ? (lang === 'es' ? 'Conectar Phantom / Solflare' : 'Connect Phantom / Solflare')
          : sellToken.isLtc
          ? (lang === 'es' ? 'Conectar Litecoin para pagar' : 'Connect Litecoin to Pay')
          : t.connectEvmToPay,
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
        label: lang === 'es' ? `Saldo ${sellToken.symbol} insuficiente` : `Insufficient ${sellToken.symbol}`,
        disabled: true,
        variant: 'muted' as const
      };
    }
    if (!normalizedRecipient && !recipientAddress.trim()) {
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
    sellToken.isSolana,
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
    <div className="w-full max-w-[448px] mx-auto pt-2 sm:pt-4 pb-6">
      {/* Minimal Mainnet Switch Bar (only shown if user switched platform to Mainnet) */}
      {!isTestnet && (
        <div className="mb-3 px-3.5 py-2.5 rounded-panel bg-rose-500/10 border border-rose-500/20 flex items-center justify-between text-xs">
          <span className="font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 shrink-0" />
            {t.mainnetNotice}
          </span>
          {onToggleNetwork && (
            <button
              type="button"
              onClick={() => onToggleNetwork('testnet')}
              className="px-2.5 py-1 rounded-lg bg-ink text-canvas font-semibold text-[11px] hover:opacity-90 transition cursor-pointer"
            >
              {t.switchToTestnet}
            </button>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/* VIEW 1: SWISS STUDIO BORDERLESS STACKED SWAP / LIMIT FORM        */}
      {/* ================================================================ */}
      {cardState === 'form' && (
        <div>
          {/* TOP SUB-BAR: MINIMAL SWAP / LIMIT SEGMENT */}
          <div className="flex items-center justify-between px-1 pb-3">
            <div className="inline-flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('swap')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'swap'
                    ? 'bg-surface text-ink shadow-[0_1px_6px_rgba(0,0,0,0.06)]'
                    : 'text-ink-3 hover:text-ink'
                }`}
              >
                {t.swap}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('limit')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'limit'
                    ? 'bg-surface text-ink shadow-[0_1px_6px_rgba(0,0,0,0.06)]'
                    : 'text-ink-3 hover:text-ink'
                }`}
              >
                {t.limit}
              </button>
            </div>

            <span className="text-[11px] text-ink-3 font-medium">
              {sellMeta.badge} → {buyMeta.badge}
            </span>
          </div>

          {/* COMPACT FAUCET POPOVER */}
          {faucetOpen && isTestnet && (
            <div className="mb-2.5 p-4 rounded-[22px] bg-surface shadow-[0_2px_14px_rgba(0,0,0,0.03)] space-y-2.5">
              <div className="flex items-center justify-between text-[11px] text-ink-2">
                <span className="font-semibold text-ink flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500" /> PUSD Chipnet Faucet
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
                  className="flex-1 min-w-0 bg-canvas rounded-xl px-3 py-2 text-xs font-mono text-ink outline-none"
                />
                <button
                  type="button"
                  disabled={claimingFaucet}
                  onClick={handleClaimFaucet}
                  className="px-3.5 py-2 rounded-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-semibold shrink-0 transition cursor-pointer"
                >
                  {claimingFaucet ? '...' : t.faucetClaim}
                </button>
              </div>
            </div>
          )}

          {/* COMPACT SLIPPAGE POPOVER */}
          {settingsOpen && (
            <div className="mb-2.5 p-4 rounded-[22px] bg-surface shadow-[0_2px_14px_rgba(0,0,0,0.03)] flex items-center justify-between gap-2">
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
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                      slippage === val && !customSlippage
                        ? 'bg-ink text-canvas'
                        : 'bg-canvas text-ink-2 hover:text-ink'
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
                  className="w-16 px-2.5 py-1 rounded-full text-xs text-right bg-canvas text-ink outline-none"
                />
              </div>
            </div>
          )}

          {/* CARD 1: FROM (`sellToken`) — BORDERLESS WHITE PANEL */}
          <div className="bg-surface rounded-[24px] p-5 shadow-[0_2px_14px_rgba(0,0,0,0.03)]">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <img
                  src={sellMeta.chainIcon}
                  alt={sellMeta.badge}
                  className="w-4 h-4 rounded-full object-contain shrink-0"
                />
                {isPayingWalletConnected ? (
                  <span className="font-mono text-xs font-medium text-ink truncate" title={payingWalletAddress}>
                    {formatAddress(payingWalletAddress)}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={onConnectWallet}
                    className="text-xs font-medium text-ink-2 hover:text-ink transition-colors cursor-pointer truncate"
                  >
                    {sellToken.isBch ? 'Connect BCH' : sellToken.isSolana ? 'Connect Solana' : sellToken.isLtc ? 'Connect LTC' : sellToken.isTon || sellToken.chain === 'ton' ? 'Connect TON' : 'Connect EVM'}
                  </button>
                )}
              </div>

              {/* Minimal Naked Utility Icons (exact Relay/Uniswap style) */}
              <div className="flex items-center gap-2.5 text-ink-3 shrink-0">
                {isTestnet && (
                  <button
                    type="button"
                    onClick={() => {
                      setFaucetOpen(!faucetOpen);
                      setSettingsOpen(false);
                    }}
                    title="Testnet PUSD Faucet"
                    aria-label="Faucet"
                    className={`transition-colors cursor-pointer ${
                      faucetOpen ? 'text-emerald-500' : 'hover:text-ink'
                    }`}
                  >
                    <Droplets className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => fetchQuote()}
                  aria-label={lang === 'es' ? 'Actualizar cotización' : 'Refresh quote'}
                  title={lang === 'es' ? 'Actualizar cotización' : 'Refresh quote'}
                  className="hover:text-ink transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingQuote ? 'animate-spin text-ink' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSettingsOpen(!settingsOpen);
                    setFaucetOpen(false);
                  }}
                  aria-label={t.slippage}
                  title={`${t.slippage} (${slippage}%)`}
                  className={`transition-colors cursor-pointer ${
                    settingsOpen ? 'text-ink' : 'hover:text-ink'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="text-[13px] font-medium text-ink-3 mt-3.5">{t.fromLabel}</div>

            <div className="flex items-center justify-between gap-3 mt-1">
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0"
                className="w-full min-w-0 bg-transparent text-[34px] leading-none font-medium tracking-tight text-ink placeholder:text-ink-3/50 outline-none tabular-nums"
              />

              <TokenPillChip
                token={sellToken}
                meta={sellMeta}
                onClick={() => setTokenModalTarget('sell')}
              />
            </div>

            <div className="flex items-center justify-between gap-2 mt-3 text-xs text-ink-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="tabular-nums">
                  {amount && parseFloat(amount) > 0
                    ? `~$${(parseFloat(amount) * (quote?.priceFromUsd || 1)).toFixed(2)}`
                    : '$0.00'}
                </span>
                <div className="flex items-center gap-1.5 text-[11px]">
                  {quickAmountOptions.map(preset => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setAmount(preset.value)}
                      className={`transition-colors cursor-pointer tabular-nums ${
                        amount === preset.value ? 'text-ink font-semibold' : 'text-ink-3 hover:text-ink'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (isPayingWalletConnected && sellBalance !== null) {
                    setAmount(String(sellBalance));
                  } else if (!isPayingWalletConnected) {
                    onConnectWallet();
                  }
                }}
                className="inline-flex items-center gap-1 text-ink-3 hover:text-ink transition-colors cursor-pointer shrink-0 tabular-nums"
                title={t.max}
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>
                  {isPayingWalletConnected && sellBalance !== null
                    ? formatCryptoBalance(sellBalance, sellToken.isBch && sellToken.symbol === 'BCH')
                    : '$0.00'}
                </span>
              </button>
            </div>
          </div>

          {/* CARVED CANVAS HALO FLIP CIRCLE */}
          <div className="relative -my-3 flex items-center justify-center z-10">
            <button
              type="button"
              onClick={handleFlipTokens}
              aria-label={t.flipPair}
              className="w-10 h-10 rounded-full bg-surface border-[4px] border-canvas shadow-[0_2px_8px_rgba(0,0,0,0.06)] flex items-center justify-center text-ink-2 hover:text-ink hover:rotate-180 transition-all duration-200 cursor-pointer"
            >
              <ArrowDownUp className="w-4 h-4" />
            </button>
          </div>

          {/* CARD 2: TO (`buyToken`) — BORDERLESS WHITE PANEL */}
          <div className="bg-surface rounded-[24px] p-5 shadow-[0_2px_14px_rgba(0,0,0,0.03)]">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <img
                  src={buyMeta.chainIcon}
                  alt={buyMeta.badge}
                  className="w-4 h-4 rounded-full object-contain shrink-0"
                />
                {normalizedRecipient ? (
                  <button
                    type="button"
                    onClick={() => setCustomAddressOpen(prev => !prev)}
                    className="inline-flex items-center gap-1.5 min-w-0 cursor-pointer group"
                    title={normalizedRecipient}
                  >
                    <span className="text-xs font-medium text-ink-3 truncate hidden sm:inline">
                      {buyMeta.networkLabel} ·
                    </span>
                    <span className="font-mono text-xs font-semibold text-ink group-hover:text-accent transition-colors truncate">
                      {formatAddress(normalizedRecipient)}
                    </span>
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onConnectWallet()}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-3 hover:text-ink transition-colors cursor-pointer truncate"
                  >
                    <span>{buyMeta.networkLabel}</span>
                    <span className="text-[11px] font-semibold text-accent underline underline-offset-2">
                      {lang === 'es' ? 'Conectar' : 'Connect'}
                    </span>
                  </button>
                )}
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={customAddressOpen}
                onClick={() => {
                  const next = !customAddressOpen;
                  setCustomAddressOpen(next);
                  if (!next && optionalReceiveWallet) {
                    setRecipientAddress(optionalReceiveWallet);
                  }
                }}
                className="flex items-center gap-2 text-xs font-medium text-ink-2 hover:text-ink transition-colors cursor-pointer shrink-0"
              >
                <span>{t.customAddress}</span>
                <span
                  className={`inline-flex items-center w-9 h-5 p-0.5 rounded-full transition-colors ${
                    customAddressOpen ? 'bg-ink' : 'bg-[#D6D7D2] dark:bg-surface-3'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full bg-surface shadow-xs transition-transform ${
                      customAddressOpen ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </span>
              </button>
            </div>

            <div className="flex items-center justify-between text-[13px] font-medium text-ink-3 mt-3.5">
              <span>{t.toLabel}</span>
              {!isPairLiquid && <span className="ui-badge-danger">{t.noLiquidity}</span>}
            </div>

            <div className="flex items-center justify-between gap-3 mt-1">
              <div className="w-full min-w-0 text-[34px] leading-none font-medium tracking-tight tabular-nums truncate">
                {loadingQuote && !receiveDisplay ? (
                  <span className="inline-block w-24 h-8 rounded-lg bg-canvas animate-pulse align-middle" />
                ) : receiveDisplay ? (
                  <span className="text-ink">{receiveDisplay}</span>
                ) : (
                  <span className="text-ink-3/50">0</span>
                )}
              </div>

              <TokenPillChip
                token={buyToken}
                meta={buyMeta}
                onClick={() => setTokenModalTarget('buy')}
              />
            </div>

            <div className="flex items-center justify-between gap-2 mt-3 text-xs text-ink-3">
              <span className="tabular-nums">
                {effectiveQuoteMetrics.netPayoutUsd > 0
                  ? `~$${effectiveQuoteMetrics.netPayoutUsd.toFixed(2)}`
                  : receiveDisplay
                  ? `~$${receiveDisplay}`
                  : '$0.00'}
              </span>

              <div className="inline-flex items-center gap-1 tabular-nums">
                <Wallet className="w-3.5 h-3.5" />
                <span>
                  {isReceivingWalletConnected && buyBalance !== null
                    ? formatCryptoBalance(buyBalance, (buyToken.isBch && buyToken.symbol === 'BCH') || (buyToken.isSolana && buyToken.symbol === 'SOL'))
                    : '$0.00'}
                </span>
              </div>
            </div>

            {/* Destination input stays cleanly tucked away until toggled OR when user types amount without connected wallet */}
            {(customAddressOpen || (!isReceivingWalletConnected && (parseFloat(amount) > 0 || Boolean(recipientAddress)))) && (
              <div className="mt-3.5 flex items-center gap-1.5 bg-canvas/85 rounded-2xl px-3.5 py-2">
                <input
                  type="text"
                  value={recipientAddress}
                  onChange={e => setRecipientAddress(e.target.value)}
                  placeholder={
                    buyToken.isBch
                      ? isTestnet
                        ? 'bchtest:q... / bchtest:z...'
                        : 'bitcoincash:q... / bitcoincash:z...'
                      : buyToken.isSolana || buyToken.symbol === 'SOL'
                      ? (lang === 'es' ? 'Dirección Solana Base58...' : 'Solana Base58 address...')
                      : '0x...'
                  }
                  spellCheck={false}
                  className="flex-1 min-w-0 bg-transparent text-xs font-mono text-ink placeholder:text-ink-3 outline-none"
                />
                {optionalReceiveWallet &&
                  recipientAddress.trim().toLowerCase() !== optionalReceiveWallet.toLowerCase() && (
                    <button
                      type="button"
                      onClick={() => setRecipientAddress(optionalReceiveWallet)}
                      className="text-[11px] font-medium px-2 py-1 rounded-full bg-surface text-ink-2 hover:text-ink transition cursor-pointer shrink-0"
                    >
                      {t.myWallet}
                    </button>
                  )}
                <button
                  type="button"
                  onClick={handlePasteRecipient}
                  className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-surface text-ink-2 hover:text-ink flex items-center gap-1 transition cursor-pointer shrink-0"
                  title={t.paste}
                >
                  <ClipboardPaste className="w-3 h-3" />
                  <span>{t.paste}</span>
                </button>
              </div>
            )}
          </div>

          {/* TARGET PRICE CARD (Only in Limit Tab) */}
          {activeTab === 'limit' && (
            <div className="mt-2.5 bg-surface rounded-[24px] px-5 py-3.5 shadow-[0_2px_14px_rgba(0,0,0,0.03)] flex items-center justify-between gap-3">
              <div className="text-xs text-ink-2">
                <div className="font-medium text-ink">{t.targetPrice}</div>
                <button
                  type="button"
                  onClick={() => setTargetRate('1.00')}
                  className="text-[11px] text-primary font-medium hover:underline cursor-pointer"
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
                  className="w-24 bg-canvas rounded-xl px-2.5 py-1.5 text-right text-sm font-semibold text-ink outline-none tabular-nums"
                />
                <span className="text-xs font-semibold text-ink-3">{buyToken.symbol}</span>
              </div>
            </div>
          )}

          {/* CARD 3: COVENANT PROTECTION & COLLAPSIBLE QUOTE PANEL */}
          <div className="mt-2.5 bg-surface rounded-[24px] p-5 shadow-[0_2px_14px_rgba(0,0,0,0.03)] space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-canvas flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4 text-ink" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-ink leading-tight">{t.covenantProtected}</div>
                  <div className="text-[10px] text-ink-3 leading-tight mt-0.5 truncate">{t.covenantSub}</div>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-2 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Atomic
              </span>
            </div>

            <button
              type="button"
              onClick={() => setDetailsOpen(!detailsOpen)}
              className="w-full pt-3 border-t border-line/60 flex items-center justify-between gap-2 text-xs cursor-pointer"
            >
              <span className="font-semibold text-ink tabular-nums truncate">
                {loadingQuote
                  ? t.quoting
                  : quote && parseFloat(amount) > 0
                  ? `1 ${sellToken.symbol} = ${quote.rate} ${buyToken.symbol}`
                  : t.bestRoute}
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-ink-3 shrink-0 tabular-nums">
                {quote && parseFloat(amount) > 0 && <span>{quoteCountdown}s</span>}
                <span>0.30%</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${detailsOpen ? 'rotate-180' : ''}`} />
              </span>
            </button>

            {detailsOpen && (
              <div className="pt-1 space-y-2 text-xs">
                <div className="flex items-center justify-between text-ink-3">
                  <span>{t.estimatedTime}</span>
                  <span className="font-medium text-ink tabular-nums">~3s</span>
                </div>
                <div className="flex items-center justify-between text-ink-3">
                  <span>{t.networkFeeLabel}</span>
                  <span className="font-medium text-ink tabular-nums">
                    {quote && parseFloat(amount) > 0
                      ? `${effectiveQuoteMetrics.feeAmount} ${buyToken.symbol} (0.30%)`
                      : '0.30%'}
                  </span>
                </div>
                {quote && parseFloat(amount) > 0 && (
                  <div className="flex items-center justify-between text-ink-3">
                    <span>{t.minReceived} ({slippage}%)</span>
                    <span className="font-medium text-ink tabular-nums">
                      {(effectiveQuoteMetrics.netPayout * (1 - slippage / 100)).toFixed(4)} {buyToken.symbol}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-ink-3">
                  <span>{t.contract}</span>
                  <span className="font-mono text-[11px] text-ink-2">{sellMeta.contractName}</span>
                </div>
              </div>
            )}
          </div>

          {swapError && (
            <div className="mt-2.5 rounded-[20px] bg-red-500/10 px-4 py-3 text-xs text-red-500 dark:text-red-400 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <span className="leading-relaxed break-words">{swapError.message}</span>
                <button
                  type="button"
                  onClick={() => setSwapError(null)}
                  aria-label="Cerrar error"
                  className="p-0.5 rounded hover:bg-red-500/20 shrink-0 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              {swapError.isRpcError && (
                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  <button
                    type="button"
                    disabled={repairingRpc}
                    onClick={handleRepairEvmRpc}
                    className="px-2.5 py-1 rounded-full bg-red-500/20 hover:bg-red-500/30 font-semibold text-[11px] transition cursor-pointer disabled:opacity-50"
                  >
                    {repairingRpc
                      ? (lang === 'es' ? 'Actualizando MetaMask...' : 'Updating MetaMask...')
                      : (lang === 'es' ? 'Reparar RPC en MetaMask' : 'Repair MetaMask RPC')}
                  </button>
                  <span className="text-[11px] font-mono select-all">
                    {isTestnet
                      ? 'https://polygon-amoy-bor-rpc.publicnode.com'
                      : 'https://polygon-bor-rpc.publicnode.com'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* FULL-WIDTH PILL CTA (JET BLACK OBSIDIAN LIKE REFERENCE) */}
          <button
            type="button"
            disabled={ctaConfig.disabled}
            onClick={activeTab === 'swap' ? handleSwap : handleCreateLimitOrder}
            className={`mt-3 w-full h-[54px] rounded-full text-[15px] font-semibold inline-flex items-center justify-center gap-2 transition-all cursor-pointer disabled:cursor-not-allowed ${
              ctaConfig.variant === 'primary' || ctaConfig.variant === 'connect'
                ? 'bg-ink text-canvas hover:opacity-90 shadow-[0_4px_16px_rgba(0,0,0,0.08)]'
                : 'bg-surface-3/80 text-ink-3'
            }`}
          >
            {executing && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{ctaConfig.label}</span>
          </button>
        </div>
      )}

      {/* VIEW 2 & VIEW 3: PROCESSING & SUCCESS RECEIPT WRAPPED IN UNIFIED CARD */}
      {cardState !== 'form' && (
        <div className="bg-surface rounded-card border border-line shadow-soft overflow-hidden transition-all duration-300">

        {/* ================================================================ */}
        {/* VIEW 2: FLUID 1-CLICK PROCESSING & SIGNING LIFECYCLE              */}
        {/* ================================================================ */}
        {cardState === 'processing' && (
          <div className="p-4 sm:p-5 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            {/* Header: Discreet Back / Cancel Action + Live Status Badge */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  clearLtcPolling();
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
                    {sellMeta.networkLabel}
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
                        {activeSwap?.toAmount || receiveDisplay || (quote?.netPayout ? Number(quote.netPayout).toFixed(2) : '0')}
                      </div>
                      <div className="text-xs font-semibold text-ink-2">
                        {buyToken.symbol}
                      </div>
                    </div>
                    <img
                      src={buyToken.icon}
                      alt={buyToken.symbol}
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-contain bg-surface border border-line shadow-soft shrink-0"
                    />
                  </div>
                  <div className="text-[11px] text-ink-3 truncate">
                    {buyMeta.networkLabel}
                  </div>
                </div>
              </div>
            </div>

            {/* Stage Title, Explanation & Animated Progress Bar / QR Deposit */}
            {(sellToken.isLtc || sellToken.symbol === 'LTC') && activeSwap?.depositAddress ? (
              <div className="p-4 rounded-panel bg-surface border border-line text-center space-y-3 shadow-soft">
                <div className="text-xs font-semibold text-ink">
                  {lang === 'es' ? 'Escanea para pagar desde tu billetera Litecoin' : 'Scan to pay from your Litecoin wallet'}
                </div>
                <div className="flex justify-center p-2.5 bg-white rounded-xl w-fit mx-auto shadow-sm border border-line">
                  {(() => {
                    try {
                      const qr = qrcode(0, 'M');
                      qr.addData(activeSwap.depositAddress);
                      qr.make();
                      return <img src={qr.createDataURL(4)} alt="LTC Deposit QR" className="w-40 h-40 object-contain" />;
                    } catch {
                      return null;
                    }
                  })()}
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs text-ink-2 font-medium">
                    {lang === 'es' ? 'Envía exactamente:' : 'Send exactly:'}{' '}
                    <strong className="text-ink font-mono font-bold text-sm">{activeSwap.fromAmount} LTC</strong>
                  </div>
                  <div className="flex items-center justify-between gap-1.5 p-2 rounded-lg bg-surface-2 border border-line max-w-sm mx-auto">
                    <span className="font-mono text-xs text-ink truncate select-all">{activeSwap.depositAddress}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(activeSwap.depositAddress);
                        showToast(lang === 'es' ? 'Dirección copiada' : 'Address copied', 'success');
                      }}
                      className="p-1.5 hover:bg-surface-3 rounded text-ink-3 hover:text-ink transition cursor-pointer shrink-0"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2 text-xs text-amber-500 font-medium pt-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{signingStep || (lang === 'es' ? 'Monitoreando mempool de Litecoin en vivo...' : 'Monitoring Litecoin mempool live...')}</span>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-2 pt-1">
                <h3 className="text-base font-semibold text-ink">
                  {processingStage === 'authorizing'
                    ? t.confirmInWallet
                    : t.settlingTitle}
                </h3>
                <p className="text-xs text-ink-3 max-w-xs mx-auto leading-relaxed">
                  {processingStage === 'authorizing'
                    ? sellMeta.chainKey === 'bch'
                      ? lang === 'es'
                        ? `Revisa tu billetera BCH (${activeBchWalletLabel}) para autorizar el intercambio.`
                        : `Check your BCH wallet (${activeBchWalletLabel}) to authorize the swap.`
                      : sellMeta.chainKey === 'solana'
                      ? lang === 'es'
                        ? `Revisa tu billetera Solana (Phantom / Solflare) para autorizar el depósito en ${sellMeta.networkLabel}.`
                        : `Check your Solana wallet (Phantom / Solflare) to authorize deposit on ${sellMeta.networkLabel}.`
                      : t.confirmInWalletSubEvm
                    : lang === 'es'
                    ? `Depósito verificado en ${sellMeta.networkLabel}. Despachando ${buyToken.symbol} hacia ${buyMeta.networkLabel}...`
                    : `Deposit verified on ${sellMeta.networkLabel}. Dispatching ${buyToken.symbol} to ${buyMeta.networkLabel}...`}
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
            )}

            {/* Recipient Preview & Non-Custodial Protocol Badge */}
            <div className="p-3 rounded-control bg-surface-2 border border-line space-y-2 text-xs">
              <div className="flex items-center justify-between text-ink-2">
                <span className="text-ink-3">{t.sentTo}</span>
                <span className="font-mono text-ink tabular-nums">
                  {formatAddress(normalizedRecipient || recipientAddress)}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-line/60 text-[11px] text-ink-3">
                <span>{lang === 'es' ? 'Protocolo:' : 'Protocol:'}</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  {t.nonCustodialBadge}
                </span>
              </div>
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
              <span>{lang === 'es' ? 'Swap Confirmado On-Chain' : 'On-Chain Settlement Confirmed'}</span>
            </div>

            {/* Big Animated Check Circle in Bitcoin Orange */}
            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto border-2 border-primary/40 shadow-lg shadow-primary/25">
              <Check className="w-8 h-8 text-primary stroke-[3]" />
            </div>

            {/* Received Amount & Source */}
            <div className="space-y-1">
              <p className="text-3xl font-extrabold text-ink tabular-nums tracking-tight">
                +{activeSwap.toAmount} {activeSwap.toToken}{' '}
                <span className="text-sm font-semibold text-ink-3">({buyMeta.networkLabel})</span>
              </p>
              <p className="text-xs text-ink-3">
                {lang === 'es' ? 'Recibido desde' : 'Swapped from'} {activeSwap.fromAmount} {activeSwap.fromToken} ({sellMeta.networkLabel})
              </p>
              <p className="text-xs text-ink-2 font-mono pt-1">
                {t.sentTo}: {formatAddress(activeSwap.recipientAddress)}
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
                <span className="font-semibold text-ink-2">
                  {sellMeta.chainKey === 'bch' || buyMeta.chainKey === 'bch'
                    ? 'Covenant CashScript P2SH32'
                    : `${sellMeta.contractName} + Watchman`}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>{lang === 'es' ? 'Custodia:' : 'Custody:'}</span>
                <span className="font-semibold text-primary">100% No Custodial</span>
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
      )}

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

      {/* TOKEN SELECTOR MODAL (THORChain style split-view with chain filters) */}
      <TokenSelectModal
        isOpen={tokenModalTarget !== null}
        onClose={() => setTokenModalTarget(null)}
        onSelect={handleSelectToken}
        selectedTokenSymbol={tokenModalTarget === 'sell' ? sellToken.symbol : buyToken.symbol}
        selectedTokenId={tokenModalTarget === 'sell' ? sellToken.id : buyToken.id}
        title={tokenModalTarget === 'sell' ? t.selectPayToken : t.selectReceiveToken}
        isTestnet={isTestnet}
        lang={lang}
        walletBalances={walletBalances}
      />
    </div>
  );
}
