import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ShieldCheck,
  Plus,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  X,
  MessageSquare,
  Send,
  AlertTriangle,
  Clock,
  Lock,
  ArrowRightLeft,
  Wallet,
  Trash2,
  QrCode,
  CheckCircle2,
  Fingerprint,
  MapPin,
  Building2,
  AtSign,
  Star,
  Gift,
  ChevronDown,
  ArrowUpRight
} from 'lucide-react';
import {
  executeBchSwapDeposit,
  hasActiveBchSigningCapability
} from '../services/walletConnectService';
import {
  convertCashAddressNetwork,
  formatAddress,
  generateQrDataUrl
} from '../utils/bchAddress';
import { resolveUserLinkFromRelays } from '../utils/userlinkCrypto';

interface P2PReview {
  id: string;
  tradeId: string;
  reviewerRole: 'BUYER' | 'SELLER';
  reviewerAddress: string;
  reviewerHandle: string;
  targetAddress: string;
  targetHandle?: string;
  rating: number;
  tags: string[];
  comment: string;
  asset: string;
  cryptoAmount: number;
  fiat: string;
  releaseTxHash?: string | null;
  createdAt: number;
}

interface P2PReputation {
  completedTrades: number;
  disputes: number;
  completionRate: number;
  avgRating?: number;
  reviewCount?: number;
  recentReviews?: P2PReview[];
  liftCashbackEarned?: number;
}

interface P2PPaymentDetails {
  holderName: string;
  bankName: string;
  accountNumber: string;
  documentId?: string | null;
  instructions?: string | null;
  isLockedUntilEscrow?: boolean;
}

interface VerifiedP2PIdentity {
  handle: string;
  nip05: string;
  bchAddress: string;
  npub?: string;
}

interface P2POffer {
  id: string;
  merchantAddress: string;
  merchantHandle?: string;
  side: 'buy' | 'sell';
  asset: string;
  fiat: string;
  pricingMode: 'floating' | 'fixed';
  marginPct: number;
  fixedPrice: number | null;
  oracleFiatPrice: number;
  unitFiatPrice: number;
  fiatSymbol: string;
  availableAmount: number;
  minAmount: number;
  maxAmount: number;
  paymentMethods: string[];
  hasPaymentDetails?: boolean;
  paymentBankLabel?: string | null;
  cashbackRatePct?: number;
  terms?: string;
  network: string;
  reputation: P2PReputation;
}

interface P2PTradeMessage {
  id: string;
  sender: 'SYSTEM' | 'SELLER' | 'BUYER';
  senderAddress?: string;
  text: string;
  timestamp: number;
}

interface P2PTrade {
  id: string;
  offerId: string;
  network: string;
  asset: string;
  assetDecimals: number;
  isCashToken: boolean;
  cryptoAmount: number;
  cryptoUsdValue: number;
  fiat: string;
  fiatSymbol: string;
  unitFiatPrice: number;
  fiatAmount: number;
  cashbackRatePct?: number;
  liftCashbackReward?: number;
  liftCashbackCredited?: boolean;
  paymentMethod: string;
  paymentDetails?: P2PPaymentDetails | null;
  paymentDetailsUnlocked?: boolean;
  sellerAddress: string;
  sellerHandle?: string;
  buyerAddress: string;
  buyerHandle?: string;
  escrowAddress: string;
  escrowBaseAddress: string;
  escrowTokenAddress: string;
  escrowExplorerUrl: string;
  contractName: string;
  contractType: string;
  expiryTimestamp: number;
  status: 'AWAITING_ESCROW' | 'ESCROW_FUNDED' | 'FIAT_SENT' | 'COMPLETED' | 'CANCELLED' | 'DISPUTED';
  fundTxHash?: string | null;
  fundExplorerUrl?: string | null;
  fiatReference?: string | null;
  releaseTxHash?: string | null;
  releaseExplorerUrl?: string | null;
  disputeReason?: string | null;
  buyerReview?: P2PReview | null;
  sellerReview?: P2PReview | null;
  messages: P2PTradeMessage[];
  createdAt: number;
  updatedAt: number;
}

interface FiatMeta {
  code: string;
  symbol: string;
  name: string;
  methods: string[];
}

interface P2PViewProps {
  backendUrl?: string;
  bchAddress?: string;
  bchWalletSource?: 'blconnect' | 'wizard' | 'wc2-bch' | 'extension' | 'manual';
  wizardConnectManager?: any;
  platformNetwork?: 'mainnet' | 'testnet';
  onToggleNetwork?: (net: 'mainnet' | 'testnet') => void;
  onRefreshBalances?: () => void;
  onConnectWallet: () => void;
  onOpenIdentity?: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  lang?: 'en' | 'es';
}

const ASSET_ICONS: Record<string, string> = {
  PUSD: '/PUSD.png',
  BCH: '/BCH.png',
  MUSD: '/MUSD.png',
  LIFT: '/LIFT.png'
};

const DEFAULT_FIATS: FiatMeta[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar', methods: ['Zelle', 'Wise', 'AirTM', 'ACH / Wire'] },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso', methods: ['GCash', 'Maya', 'BPI', 'UnionBank', 'InstaPay'] },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan (RMB)', methods: ['Alipay', 'WeChat Pay', 'UnionPay', 'Bank Card'] },
  { code: 'VES', symbol: 'Bs.', name: 'Bolívar Venezolano', methods: ['Pago Móvil', 'Banesco', 'Mercantil', 'BDV'] },
  { code: 'COP', symbol: 'COP$', name: 'Peso Colombiano', methods: ['Nequi', 'Bancolombia', 'Daviplata'] },
  { code: 'MXN', symbol: 'MX$', name: 'Peso Mexicano', methods: ['SPEI', 'MercadoPago', 'BBVA'] },
  { code: 'ARS', symbol: 'ARS$', name: 'Peso Argentino', methods: ['MercadoPago', 'CBU/CVU', 'Brubank'] },
  { code: 'BRL', symbol: 'R$', name: 'Real Brasileño', methods: ['Pix', 'Nubank', 'Itaú'] },
  { code: 'EUR', symbol: '€', name: 'Euro', methods: ['SEPA Instant', 'Revolut', 'Wise', 'Bizum'] },
  { code: 'PEN', symbol: 'S/', name: 'Sol Peruano', methods: ['Yape', 'Plin', 'BCP', 'Interbank'] },
  { code: 'CLP', symbol: 'CLP$', name: 'Peso Chileno', methods: ['CuentaRUT', 'Mach', 'MercadoPago'] },
  { code: 'DOP', symbol: 'RD$', name: 'Peso Dominicano', methods: ['Banco Popular', 'Banreservas', 'BHD'] },
  { code: 'GBP', symbol: '£', name: 'British Pound', methods: ['Faster Payments', 'Revolut', 'Monzo'] },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', methods: ['OPay', 'Kuda', 'Bank Transfer'] },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', methods: ['UPI', 'IMPS', 'Paytm'] },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', methods: ['PayPay', 'Bank Furikomi', 'Wise'] }
];

const TZ_TO_FIAT: Record<string, string> = {
  'Asia/Manila': 'PHP',
  'Asia/Shanghai': 'CNY',
  'Asia/Chongqing': 'CNY',
  'Asia/Hong_Kong': 'CNY',
  'America/Caracas': 'VES',
  'America/Bogota': 'COP',
  'America/Mexico_City': 'MXN',
  'America/Monterrey': 'MXN',
  'America/Cancun': 'MXN',
  'America/Tijuana': 'MXN',
  'America/Buenos_Aires': 'ARS',
  'America/Argentina/Buenos_Aires': 'ARS',
  'America/Sao_Paulo': 'BRL',
  'America/Lima': 'PEN',
  'America/Santiago': 'CLP',
  'America/Santo_Domingo': 'DOP',
  'Europe/London': 'GBP',
  'Africa/Lagos': 'NGN',
  'Asia/Kolkata': 'INR',
  'Asia/Tokyo': 'JPY',
  'America/New_York': 'USD',
  'America/Chicago': 'USD',
  'America/Denver': 'USD',
  'America/Los_Angeles': 'USD'
};

function getInitialFiatPreference(): { fiat: string; isAuto: boolean } {
  if (typeof window === 'undefined') return { fiat: 'USD', isAuto: true };
  try {
    const saved = localStorage.getItem('bliq_p2p_fiat');
    if (saved && DEFAULT_FIATS.some(f => f.code === saved)) {
      return { fiat: saved, isAuto: false };
    }
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (TZ_TO_FIAT[tz]) return { fiat: TZ_TO_FIAT[tz], isAuto: true };
    if (tz.startsWith('America/Argentina/')) return { fiat: 'ARS', isAuto: true };
    if (tz.startsWith('Europe/')) return { fiat: 'EUR', isAuto: true };

    const navLang = (navigator.language || '').toLowerCase();
    if (navLang.includes('-ph') || navLang.startsWith('fil') || navLang.startsWith('tl')) return { fiat: 'PHP', isAuto: true };
    if (navLang.includes('-cn') || navLang.includes('zh-hans')) return { fiat: 'CNY', isAuto: true };
    if (navLang.includes('-ve')) return { fiat: 'VES', isAuto: true };
    if (navLang.includes('-co')) return { fiat: 'COP', isAuto: true };
    if (navLang.includes('-mx')) return { fiat: 'MXN', isAuto: true };
    if (navLang.includes('-ar')) return { fiat: 'ARS', isAuto: true };
    if (navLang.includes('-br')) return { fiat: 'BRL', isAuto: true };
    if (navLang.includes('-pe')) return { fiat: 'PEN', isAuto: true };
    if (navLang.includes('-cl')) return { fiat: 'CLP', isAuto: true };
    if (navLang.includes('-do')) return { fiat: 'DOP', isAuto: true };
    if (navLang.includes('-gb')) return { fiat: 'GBP', isAuto: true };
    if (navLang.includes('-in') || navLang.startsWith('hi')) return { fiat: 'INR', isAuto: true };
    if (navLang.includes('-jp') || navLang.startsWith('ja')) return { fiat: 'JPY', isAuto: true };
  } catch {}
  return { fiat: 'USD', isAuto: true };
}

function formatFiatNum(num: number, maxDec = 2): string {
  const safe = Number.isFinite(num) ? num : 0;
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: Math.min(2, maxDec),
    maximumFractionDigits: maxDec
  }).format(safe);
}

export default function P2PView({
  backendUrl = '',
  bchAddress = '',
  bchWalletSource,
  wizardConnectManager,
  platformNetwork = 'testnet',
  onRefreshBalances,
  onConnectWallet,
  onOpenIdentity,
  showToast,
  lang = 'es'
}: P2PViewProps) {
  const isEs = lang === 'es';
  const isTestnet = platformNetwork === 'testnet';

  const connectedBch = useMemo(() => {
    if (!bchAddress) return '';
    return convertCashAddressNetwork(bchAddress, isTestnet, true);
  }, [bchAddress, isTestnet]);

  const hasOneClickSign = useMemo(
    () => hasActiveBchSigningCapability(wizardConnectManager, bchWalletSource),
    [wizardConnectManager, bchWalletSource]
  );

  // Decentralized Identity (@usuario@bliquid.xyz via Nostr kind: 30078)
  const [verifiedIdentity, setVerifiedIdentity] = useState<VerifiedP2PIdentity | null>(() => {
    try {
      const saved = localStorage.getItem('userlink_verified_identity_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.handle && parsed?.nip05) {
          return {
            handle: parsed.handle.startsWith('@') ? parsed.handle : `@${parsed.handle}`,
            nip05: parsed.nip05,
            bchAddress: parsed.bchAddress || '',
            npub: parsed.npub || ''
          };
        }
      }
    } catch {}
    return null;
  });
  const [resolvingIdentity, setResolvingIdentity] = useState<boolean>(false);
  const [manualVerifyHandleInput, setManualVerifyHandleInput] = useState<string>('');

  const fullIdentityHandle = useMemo(() => {
    if (!verifiedIdentity) return '';
    const clean = verifiedIdentity.handle.replace(/^@+/, '').split('@')[0];
    return `@${clean}@bliquid.xyz`;
  }, [verifiedIdentity]);

  // Resolve decentralized identity automatically from Nostr relays when BCH wallet connects
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      // Check local storage cache first
      try {
        const saved = localStorage.getItem('userlink_verified_identity_v1');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed?.handle && parsed?.nip05) {
            if (!cancelled) {
              setVerifiedIdentity({
                handle: parsed.handle.startsWith('@') ? parsed.handle : `@${parsed.handle}`,
                nip05: parsed.nip05,
                bchAddress: parsed.bchAddress || connectedBch || '',
                npub: parsed.npub || ''
              });
            }
            return;
          }
        }
      } catch {}

      if (!connectedBch) return;
      setResolvingIdentity(true);
      try {
        const { verified, nip05Fallback } = await resolveUserLinkFromRelays(connectedBch);
        if (cancelled) return;
        if (verified && verified.isOverallValid) {
          const idObj: VerifiedP2PIdentity = {
            handle: verified.handle.startsWith('@') ? verified.handle : `@${verified.handle}`,
            nip05: verified.nip05,
            bchAddress: verified.bchAddress,
            npub: verified.npub
          };
          setVerifiedIdentity(idObj);
          try {
            localStorage.setItem('userlink_verified_identity_v1', JSON.stringify(idObj));
          } catch {}
        } else if (nip05Fallback?.handle) {
          const idObj: VerifiedP2PIdentity = {
            handle: nip05Fallback.handle.startsWith('@') ? nip05Fallback.handle : `@${nip05Fallback.handle}`,
            nip05: nip05Fallback.nip05,
            bchAddress: nip05Fallback.bchAddress
          };
          setVerifiedIdentity(idObj);
          try {
            localStorage.setItem('userlink_verified_identity_v1', JSON.stringify(idObj));
          } catch {}
        }
      } catch {
        // silent relay check
      } finally {
        if (!cancelled) setResolvingIdentity(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [connectedBch]);

  const handleVerifyExistingHandle = async (rawHandle?: string) => {
    const query = String(rawHandle ?? manualVerifyHandleInput).trim();
    if (!query) return;
    setResolvingIdentity(true);
    try {
      const { verified, nip05Fallback } = await resolveUserLinkFromRelays(query);
      if (verified && verified.isOverallValid) {
        const idObj: VerifiedP2PIdentity = {
          handle: verified.handle.startsWith('@') ? verified.handle : `@${verified.handle}`,
          nip05: verified.nip05,
          bchAddress: verified.bchAddress,
          npub: verified.npub
        };
        setVerifiedIdentity(idObj);
        try {
          localStorage.setItem('userlink_verified_identity_v1', JSON.stringify(idObj));
        } catch {}
        showToast(
          isEs
            ? `Identidad Nostr verificada: ${idObj.handle}@bliquid.xyz`
            : `Verified Nostr identity: ${idObj.handle}@bliquid.xyz`
        );
      } else if (nip05Fallback?.handle) {
        const idObj: VerifiedP2PIdentity = {
          handle: nip05Fallback.handle.startsWith('@') ? nip05Fallback.handle : `@${nip05Fallback.handle}`,
          nip05: nip05Fallback.nip05,
          bchAddress: nip05Fallback.bchAddress
        };
        setVerifiedIdentity(idObj);
        try {
          localStorage.setItem('userlink_verified_identity_v1', JSON.stringify(idObj));
        } catch {}
        showToast(isEs ? `Identidad vinculada: ${idObj.nip05}` : `Identity linked: ${idObj.nip05}`);
      } else {
        showToast(
          isEs
            ? 'No se encontró ese @usuario en los relays Nostr. Créalo primero en la pestaña Identidad.'
            : 'That @username was not found on Nostr relays. Mint it first in the Identity tab.',
          'error'
        );
      }
    } catch {
      showToast(isEs ? 'Error consultando relays Nostr' : 'Error querying Nostr relays', 'error');
    } finally {
      setResolvingIdentity(false);
    }
  };

  // Filters & Tab
  const initialFiatPref = useMemo(() => getInitialFiatPreference(), []);
  const [viewMode, setViewMode] = useState<'market' | 'trades'>('market');
  const [sideFilter, setSideFilter] = useState<'sell' | 'buy'>('buy');
  const [assetFilter, setAssetFilter] = useState<'PUSD' | 'BCH' | 'LIFT'>('PUSD');
  const [fiatFilter, setFiatFilter] = useState<string>(initialFiatPref.fiat);
  const [isAutoFiat, setIsAutoFiat] = useState<boolean>(initialFiatPref.isAuto);
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null);
  const hasSyncedServerGeoRef = React.useRef(false);

  // Data
  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState<P2POffer[]>([]);
  const [myTrades, setMyTrades] = useState<P2PTrade[]>([]);
  const [fiats, setFiats] = useState<FiatMeta[]>(DEFAULT_FIATS);
  const [fiatRates, setFiatRates] = useState<Record<string, number>>({});
  const [assetPricesUsd, setAssetPricesUsd] = useState<Record<string, number>>({ PUSD: 1, BCH: 200, LIFT: 0.015 });
  const [oracleProvider, setOracleProvider] = useState<string>('Consensus Median (Multi-CEX)');
  const [stats, setStats] = useState({ activeOffersCount: 0, totalTradesCount: 0, completedTradesCount: 0, totalVolumeUsd: 0 });
  const [userRewards, setUserRewards] = useState({
    liftCashbackEarned: 0,
    completedTrades: 0,
    avgRating: 5.0,
    reviewCount: 0,
    cashbackRatePct: 0.25
  });

  // Modals & UI drawers
  const [showDetails, setShowDetails] = useState(false);
  const [showPostAdModal, setShowPostAdModal] = useState(false);
  const [takeOffer, setTakeOffer] = useState<P2POffer | null>(null);
  const [activeTrade, setActiveTrade] = useState<P2PTrade | null>(null);
  const [reviewsModalOffer, setReviewsModalOffer] = useState<P2POffer | null>(null);
  const [escrowQrUrl, setEscrowQrUrl] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Star Rating & Review Form (inside COMPLETED Trade Room)
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [reviewTags, setReviewTags] = useState<string[]>(['Pago rápido', 'Titular verificado']);
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);

  // Post Ad Form
  const [adSide, setAdSide] = useState<'sell' | 'buy'>('sell');
  const [adAsset, setAdAsset] = useState<'PUSD' | 'BCH' | 'LIFT'>('PUSD');
  const [adFiat, setAdFiat] = useState<string>('VES');
  const [adPricingMode, setAdPricingMode] = useState<'floating' | 'fixed'>('floating');
  const [adMarginPct, setAdMarginPct] = useState<string>('0.5');
  const [adFixedPrice, setAdFixedPrice] = useState<string>('');
  const [adAvailable, setAdAvailable] = useState<string>('100');
  const [adMin, setAdMin] = useState<string>('5');
  const [adMax, setAdMax] = useState<string>('100');
  const [adMethods, setAdMethods] = useState<string[]>(['Pago Móvil']);
  const [adTerms, setAdTerms] = useState<string>('');
  const [postingAd, setPostingAd] = useState(false);

  // Saved Bank / Payment Details for Seller receiving fiat (used both when posting SELL ad or taking BUY ad)
  const [bankHolderName, setBankHolderName] = useState<string>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('bliq_p2p_my_bank_v1') || '{}');
      return saved.holderName || '';
    } catch {
      return '';
    }
  });
  const [bankName, setBankName] = useState<string>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('bliq_p2p_my_bank_v1') || '{}');
      return saved.bankName || '';
    } catch {
      return '';
    }
  });
  const [bankAccountNumber, setBankAccountNumber] = useState<string>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('bliq_p2p_my_bank_v1') || '{}');
      return saved.accountNumber || '';
    } catch {
      return '';
    }
  });
  const [bankDocumentId, setBankDocumentId] = useState<string>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('bliq_p2p_my_bank_v1') || '{}');
      return saved.documentId || '';
    } catch {
      return '';
    }
  });
  const [bankInstructions, setBankInstructions] = useState<string>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('bliq_p2p_my_bank_v1') || '{}');
      return saved.instructions || '';
    } catch {
      return '';
    }
  });

  const persistLocalBankDetails = () => {
    try {
      localStorage.setItem(
        'bliq_p2p_my_bank_v1',
        JSON.stringify({
          holderName: bankHolderName.trim(),
          bankName: bankName.trim(),
          accountNumber: bankAccountNumber.trim(),
          documentId: bankDocumentId.trim(),
          instructions: bankInstructions.trim()
        })
      );
    } catch {}
  };

  // Take Offer Form
  const [takeAmount, setTakeAmount] = useState<string>('10');
  const [takePaymentMethod, setTakePaymentMethod] = useState<string>('');
  const [creatingTrade, setCreatingTrade] = useState(false);

  // Trade Room actions
  const [fundingOneClick, setFundingOneClick] = useState(false);
  const [verifyingEscrow, setVerifyingEscrow] = useState(false);
  const [manualFundTx, setManualFundTx] = useState<string>('');
  const [fiatRefInput, setFiatRefInput] = useState<string>('');
  const [chatInput, setChatInput] = useState<string>('');
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  const fetchOverview = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const tz =
        typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone || '' : '';
      const useAutoOnFirstCall = isAutoFiat && !hasSyncedServerGeoRef.current;
      const qs = new URLSearchParams({
        network: platformNetwork,
        fiat: useAutoOnFirstCall ? 'AUTO' : fiatFilter,
        asset: assetFilter,
        side: sideFilter,
        ...(tz ? { tz } : {}),
        ...(connectedBch ? { userAddress: connectedBch } : {})
      });
      const res = await fetch(`${backendUrl}/api/p2p/overview?${qs.toString()}`);
      const data = await res.json();
      if (data.success) {
        if (useAutoOnFirstCall) {
          hasSyncedServerGeoRef.current = true;
          if (data.activeFiat && data.activeFiat !== fiatFilter) {
            setFiatFilter(data.activeFiat);
          }
        }
        if (data.detectedCountry) setDetectedCountry(data.detectedCountry);
        setOffers(data.offers || []);
        setMyTrades(data.myTrades || []);
        if (Array.isArray(data.fiats) && data.fiats.length > 0) setFiats(data.fiats);
        if (data.fiatRates) setFiatRates(data.fiatRates);
        if (data.assetPricesUsd) setAssetPricesUsd(data.assetPricesUsd);
        if (data.oracleProvider) setOracleProvider(data.oracleProvider);
        if (data.stats) setStats(data.stats);
        if (data.userRewards) setUserRewards(data.userRewards);
      }
    } catch {
      // silent
    } finally {
      if (!silent) setLoading(false);
    }
  }, [backendUrl, platformNetwork, fiatFilter, isAutoFiat, assetFilter, sideFilter, connectedBch]);

  useEffect(() => {
    fetchOverview(false);
    const id = setInterval(() => fetchOverview(true), 12000);
    return () => clearInterval(id);
  }, [fetchOverview]);

  // Keep activeTrade refreshed & generate QR for its unique P2SH32 Escrow address
  useEffect(() => {
    if (!activeTrade?.escrowAddress) {
      setEscrowQrUrl('');
      return;
    }
    let cancelled = false;
    try {
      setEscrowQrUrl(generateQrDataUrl(activeTrade.escrowAddress));
    } catch {
      setEscrowQrUrl('');
    }

    const poll = setInterval(async () => {
      try {
        const res = await fetch(`${backendUrl}/api/p2p/trades/${activeTrade.id}`);
        const data = await res.json();
        if (!cancelled && data.success && data.trade) {
          setActiveTrade(data.trade);
        }
      } catch {}
    }, 6000);

    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, [activeTrade?.id, activeTrade?.escrowAddress, backendUrl]);

  const handleCopy = (val: string, key: string) => {
    navigator.clipboard?.writeText(val).catch(() => {});
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1600);
  };

  const currentFiatMeta = useMemo(
    () => fiats.find(f => f.code === fiatFilter) || DEFAULT_FIATS[0],
    [fiats, fiatFilter]
  );

  const liveReferenceFiatPrice = useMemo(() => {
    const usd = assetPricesUsd[assetFilter] || (assetFilter === 'BCH' ? 200 : 1);
    const fx = fiatRates[fiatFilter] || 1;
    return usd * fx;
  }, [assetPricesUsd, assetFilter, fiatRates, fiatFilter]);

  // Open Take Offer Modal
  const openTakeOffer = (offer: P2POffer) => {
    if (!connectedBch) {
      showToast(
        isEs
          ? 'Conecta tu billetera BCH (BinaryLiquid Wallet o WizardConnect) para operar P2P'
          : 'Connect your BCH wallet (BinaryLiquid Wallet or WizardConnect) to trade P2P',
        'error'
      );
      onConnectWallet();
      return;
    }
    const initialMethod = offer.paymentMethods[0] || '';
    setTakeOffer(offer);
    setTakeAmount(String(Math.min(offer.maxAmount, Math.max(offer.minAmount, offer.asset === 'BCH' ? 0.01 : 10))));
    setTakePaymentMethod(initialMethod);
    if (!bankName.trim() && initialMethod) {
      setBankName(initialMethod);
    }
  };

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connectedBch) {
      onConnectWallet();
      return;
    }
    if (!fullIdentityHandle) {
      showToast(
        isEs
          ? 'Debes tener una Identidad Descentralizada (@usuario) creada en BinaryLiquid Identity para publicar anuncios P2P.'
          : 'You must create a Decentralized Identity (@username) in BinaryLiquid Identity to post P2P offers.',
        'error'
      );
      return;
    }
    if (adSide === 'sell') {
      if (bankHolderName.trim().length < 2 || bankName.trim().length < 2 || bankAccountNumber.trim().length < 4) {
        showToast(
          isEs
            ? 'Completa tus datos bancarios de cobro (Titular, Banco/App y Número de cuenta/Teléfono/Alias) para vender cripto.'
            : 'Complete your bank/payment account details (Account Holder, Bank/App, and Account/Phone/Alias) to sell crypto.',
          'error'
        );
        return;
      }
      persistLocalBankDetails();
    }
    setPostingAd(true);
    try {
      const res = await fetch(`${backendUrl}/api/p2p/offers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantAddress: connectedBch,
          merchantHandle: fullIdentityHandle,
          side: adSide,
          asset: adAsset,
          fiat: adFiat,
          pricingMode: adPricingMode,
          marginPct: Number(adMarginPct) || 0,
          fixedPrice: adPricingMode === 'fixed' ? Number(adFixedPrice) : null,
          availableAmount: Number(adAvailable),
          minAmount: Number(adMin),
          maxAmount: Number(adMax),
          paymentMethods: adMethods,
          paymentDetails:
            adSide === 'sell'
              ? {
                  holderName: bankHolderName.trim(),
                  bankName: bankName.trim() || adMethods[0] || '',
                  accountNumber: bankAccountNumber.trim(),
                  documentId: bankDocumentId.trim() || null,
                  instructions: bankInstructions.trim() || null
                }
              : null,
          terms: adTerms.trim(),
          network: platformNetwork
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Error publicando anuncio');
      showToast(isEs ? 'Anuncio P2P publicado en el libro de órdenes' : 'P2P offer published to orderbook');
      setShowPostAdModal(false);
      setAssetFilter(adAsset);
      setFiatFilter(adFiat);
      setSideFilter(adSide === 'sell' ? 'buy' : 'sell');
      await fetchOverview(false);
    } catch (err: any) {
      showToast(err?.message || 'Error', 'error');
    } finally {
      setPostingAd(false);
    }
  };

  const handleDeleteOffer = async (offerId: string) => {
    try {
      const res = await fetch(`${backendUrl}/api/p2p/offers/${offerId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchantAddress: connectedBch, network: platformNetwork })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      showToast(isEs ? 'Anuncio eliminado' : 'Offer removed');
      fetchOverview(true);
    } catch (err: any) {
      showToast(err?.message || 'Error', 'error');
    }
  };

  const handleCreateTrade = async () => {
    if (!takeOffer || !connectedBch) return;
    if (!fullIdentityHandle) {
      showToast(
        isEs
          ? 'Debes tener una Identidad Descentralizada (@usuario) creada en BinaryLiquid Identity para abrir órdenes P2P.'
          : 'You must create a Decentralized Identity (@username) in BinaryLiquid Identity to open P2P trades.',
        'error'
      );
      return;
    }
    const isTakerSellingCrypto = takeOffer.side === 'buy';
    if (isTakerSellingCrypto) {
      if (bankHolderName.trim().length < 2 || (bankName.trim() || takePaymentMethod).length < 2 || bankAccountNumber.trim().length < 4) {
        showToast(
          isEs
            ? 'Ingresa tus datos bancarios / cuenta de cobro donde el comprador te enviará el pago fiat.'
            : 'Enter your bank/payment account details where the buyer will send the fiat payment.',
          'error'
        );
        return;
      }
      persistLocalBankDetails();
    }
    setCreatingTrade(true);
    try {
      const res = await fetch(`${backendUrl}/api/p2p/trades/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerId: takeOffer.id,
          takerAddress: connectedBch,
          takerHandle: fullIdentityHandle,
          cryptoAmount: Number(takeAmount),
          paymentMethod: takePaymentMethod,
          paymentDetails: isTakerSellingCrypto
            ? {
                holderName: bankHolderName.trim(),
                bankName: bankName.trim() || takePaymentMethod,
                accountNumber: bankAccountNumber.trim(),
                documentId: bankDocumentId.trim() || null,
                instructions: bankInstructions.trim() || null
              }
            : null,
          network: platformNetwork
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Error creando orden P2P');
      setTakeOffer(null);
      setActiveTrade(data.trade);
      setManualFundTx('');
      setFiatRefInput('');
      showToast(
        isEs
          ? 'Escrow CashScript P2SH32 derivado en cadena'
          : 'P2SH32 CashScript Escrow Covenant derived on-chain'
      );
      fetchOverview(true);
    } catch (err: any) {
      showToast(err?.message || 'Error', 'error');
    } finally {
      setCreatingTrade(false);
    }
  };

  const handleOneClickFundEscrow = async () => {
    if (!activeTrade || !connectedBch) return;
    setFundingOneClick(true);
    try {
      const signed = await executeBchSwapDeposit({
        backendUrl,
        buildEndpoint: `/api/p2p/trades/${activeTrade.id}/build-fund-tx`,
        senderAddress: connectedBch,
        isTestnet,
        wizardManager: wizardConnectManager,
        preferredSource: bchWalletSource,
        bodyPayload: {
          senderAddress: connectedBch
        }
      });
      if (signed?.txHash) {
        setManualFundTx(signed.txHash);
        showToast(
          isEs
            ? `Escrow fondeado on-chain (${signed.txHash.slice(0, 10)}...). Verificando...`
            : `Escrow funded on-chain (${signed.txHash.slice(0, 10)}...). Verifying...`
        );
        await handleVerifyEscrow(signed.txHash);
        onRefreshBalances?.();
      }
    } catch (err: any) {
      showToast(err?.message || (isEs ? 'Firma cancelada o error fondeando Escrow' : 'Signing cancelled or funding error'), 'error');
    } finally {
      setFundingOneClick(false);
    }
  };

  const handleVerifyEscrow = async (txOverride?: string) => {
    if (!activeTrade) return;
    setVerifyingEscrow(true);
    try {
      const res = await fetch(`${backendUrl}/api/p2p/trades/${activeTrade.id}/verify-escrow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txHash: (txOverride ?? manualFundTx).trim() })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setActiveTrade(data.trade);
      showToast(isEs ? 'Escrow P2SH32 verificado on-chain' : 'P2SH32 Escrow verified on-chain');
      fetchOverview(true);
    } catch (err: any) {
      showToast(err?.message || 'Error', 'error');
    } finally {
      setVerifyingEscrow(false);
    }
  };

  const handleMarkFiatPaid = async () => {
    if (!activeTrade || !connectedBch) return;
    setActionBusy('paid');
    try {
      const res = await fetch(`${backendUrl}/api/p2p/trades/${activeTrade.id}/mark-paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actorAddress: connectedBch, fiatReference: fiatRefInput.trim() })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setActiveTrade(data.trade);
      showToast(isEs ? 'Pago fiat marcado como enviado' : 'Fiat payment marked as sent');
      fetchOverview(true);
    } catch (err: any) {
      showToast(err?.message || 'Error', 'error');
    } finally {
      setActionBusy(null);
    }
  };

  const handleReleaseTrade = async () => {
    if (!activeTrade || !connectedBch) return;
    setActionBusy('release');
    try {
      const res = await fetch(`${backendUrl}/api/p2p/trades/${activeTrade.id}/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actorAddress: connectedBch })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setActiveTrade(data.trade);
      showToast(isEs ? 'Escrow liberado on-chain al comprador' : 'Escrow released on-chain to buyer');
      onRefreshBalances?.();
      fetchOverview(true);
    } catch (err: any) {
      showToast(err?.message || 'Error', 'error');
    } finally {
      setActionBusy(null);
    }
  };

  const handleCancelOrRefund = async () => {
    if (!activeTrade || !connectedBch) return;
    setActionBusy('cancel');
    try {
      const res = await fetch(`${backendUrl}/api/p2p/trades/${activeTrade.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actorAddress: connectedBch })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setActiveTrade(data.trade);
      showToast(isEs ? 'Orden cancelada / fondos reembolsados' : 'Trade cancelled / funds refunded');
      onRefreshBalances?.();
      fetchOverview(true);
    } catch (err: any) {
      showToast(err?.message || 'Error', 'error');
    } finally {
      setActionBusy(null);
    }
  };

  const handleOpenDispute = async () => {
    if (!activeTrade || !connectedBch) return;
    setActionBusy('dispute');
    try {
      const res = await fetch(`${backendUrl}/api/p2p/trades/${activeTrade.id}/dispute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actorAddress: connectedBch,
          reason: isEs ? 'Revisión solicitada por discrepancia de pago fiat' : 'Arbitration requested for fiat payment discrepancy'
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setActiveTrade(data.trade);
      showToast(isEs ? 'Disputa abierta — fondos protegidos en Escrow' : 'Dispute opened — funds safely locked in Escrow');
      fetchOverview(true);
    } catch (err: any) {
      showToast(err?.message || 'Error', 'error');
    } finally {
      setActionBusy(null);
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTrade || !connectedBch || !chatInput.trim()) return;
    try {
      const res = await fetch(`${backendUrl}/api/p2p/trades/${activeTrade.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actorAddress: connectedBch, text: chatInput.trim() })
      });
      const data = await res.json();
      if (data.success && data.trade) {
        setActiveTrade(data.trade);
        setChatInput('');
      }
    } catch {}
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTrade || !connectedBch) return;
    setSubmittingReview(true);
    try {
      const res = await fetch(`${backendUrl}/api/p2p/trades/${activeTrade.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actorAddress: connectedBch,
          rating: reviewRating,
          tags: reviewTags,
          comment: reviewComment.trim()
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Error enviando reseña');
      if (data.trade) setActiveTrade(data.trade);
      setReviewComment('');
      showToast(
        isEs
          ? `¡Reseña verificada (${reviewRating} ★) publicada en el perfil de tu contraparte!`
          : `Verified review (${reviewRating} ★) published to counterparty profile!`
      );
      fetchOverview(true);
    } catch (err: any) {
      showToast(err?.message || 'Error', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  const statusBadge = (status: P2PTrade['status']) => {
    const map: Record<P2PTrade['status'], { cls: string; label: string }> = {
      AWAITING_ESCROW: {
        cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
        label: isEs ? 'Esperando Escrow' : 'Awaiting Escrow'
      },
      ESCROW_FUNDED: {
        cls: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
        label: isEs ? 'Escrow Bloqueado' : 'Escrow Funded'
      },
      FIAT_SENT: {
        cls: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
        label: isEs ? 'Pago Fiat Enviado' : 'Fiat Sent'
      },
      COMPLETED: {
        cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        label: isEs ? 'Liberado On-Chain' : 'Completed'
      },
      CANCELLED: {
        cls: 'bg-surface-2 text-ink-3',
        label: isEs ? 'Cancelada' : 'Cancelled'
      },
      DISPUTED: {
        cls: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
        label: isEs ? 'En Disputa' : 'Disputed'
      }
    };
    const item = map[status] || map.AWAITING_ESCROW;
    return <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${item.cls}`}>{item.label}</span>;
  };

  const isSellerInActiveTrade = Boolean(
    activeTrade && connectedBch && activeTrade.sellerAddress.toLowerCase() === connectedBch.toLowerCase()
  );
  const isBuyerInActiveTrade = Boolean(
    activeTrade && connectedBch && activeTrade.buyerAddress.toLowerCase() === connectedBch.toLowerCase()
  );

  const selectedAdFiatMeta = useMemo(
    () => fiats.find(f => f.code === adFiat) || DEFAULT_FIATS[0],
    [fiats, adFiat]
  );

  const estimatedTakeLiftCashback = useMemo(() => {
    if (!takeOffer) return 0;
    const amt = Number(takeAmount) || 0;
    const assetUsd = assetPricesUsd[takeOffer.asset] || (takeOffer.asset === 'BCH' ? 200 : 1);
    const liftUsd = assetPricesUsd.LIFT || 0.015;
    const usdVal = amt * assetUsd;
    return Number(Math.max(1, (usdVal * 0.0025) / liftUsd).toFixed(2));
  }, [takeOffer, takeAmount, assetPricesUsd]);

  return (
    <div className="ui-page pt-2 sm:pt-4 pb-12">
      {/* HEADER BAR */}
      <div className="ui-page-header">
        <div className="min-w-0">
          <h1 className="ui-title">
            {isEs ? 'Mercado P2P No-Custodio' : 'Non-Custodial P2P Market'}
          </h1>
          <p className="ui-subtitle truncate">
            {isEs
              ? 'Escrow P2SH32, identidad @usuario y +0.25% cashback en $LIFT.'
              : 'P2SH32 Escrow, @username identity, and +0.25% $LIFT cashback.'}
          </p>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
          {/* Segmented Desk View Tabs */}
          <div className="ui-segment shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('market')}
              className={`ui-segment-item whitespace-nowrap ${viewMode === 'market' ? 'ui-segment-item-active' : ''}`}
            >
              {isEs ? 'Mercado' : 'Orderbook'}
            </button>
            <button
              type="button"
              onClick={() => setViewMode('trades')}
              className={`ui-segment-item inline-flex items-center gap-1.5 whitespace-nowrap ${
                viewMode === 'trades' ? 'ui-segment-item-active' : ''
              }`}
            >
              <span>{isEs ? 'Mis Órdenes' : 'My Trades'}</span>
              {myTrades.length > 0 && (
                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-surface-3 text-ink">
                  {myTrades.length}
                </span>
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowDetails(v => !v)}
            className="ui-btn-secondary ui-btn-sm shrink-0 whitespace-nowrap"
          >
            <span>{isEs ? 'Detalles' : 'Details'}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => {
              if (!connectedBch) {
                onConnectWallet();
                return;
              }
              const fm = fiats.find(f => f.code === fiatFilter) || DEFAULT_FIATS[0];
              setAdAsset(assetFilter);
              setAdFiat(fiatFilter);
              setAdMethods([fm.methods[0]]);
              if (!bankName.trim()) {
                setBankName(fm.methods[0]);
              }
              setShowPostAdModal(true);
            }}
            className="ui-btn-primary ui-btn-sm shrink-0 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isEs ? 'Publicar Anuncio' : 'Post Ad'}</span>
          </button>
        </div>
      </div>

      {/* COLLAPSIBLE PROTOCOL DETAILS (Hidden by default per DESIGN.md) */}
      {showDetails && (
        <div className="ui-card p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <div className="ui-label">{isEs ? 'Covenant Escrow' : 'Escrow Covenant'}</div>
            <div className="font-mono text-ink mt-1 font-medium truncate">BinaryLiquidP2PEscrow.cash</div>
          </div>
          <div>
            <div className="ui-label">{isEs ? 'Seguridad bancaria' : 'Bank privacy'}</div>
            <div className="text-ink mt-1 font-medium">
              {isEs ? 'Oculto hasta bloqueo P2SH32' : 'Escrow-gated unlock'}
            </div>
          </div>
          <div>
            <div className="ui-label">{isEs ? 'Oráculo y liquidaciones' : 'Oracle & settlements'}</div>
            <div className="text-ink mt-1 font-medium tabular-nums">
              {oracleProvider} · {stats.completedTradesCount} tx
            </div>
          </div>
          <div>
            <div className="ui-label">{isEs ? 'Comisión y Cashback' : 'Fee & Cashback'}</div>
            <div className="text-ink mt-1 font-medium tabular-nums">
              0% Fee · +0.25% $LIFT · 24h Timelock
            </div>
          </div>
        </div>
      )}

      {/* UNIFIED DESK CONTROLS + INLINE IDENTITY/REWARDS STRIP */}
      <div className="ui-card overflow-hidden">
        <div className="p-3.5 sm:px-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Buy / Sell Segmented Tabs */}
            <div className="ui-segment">
              <button
                type="button"
                onClick={() => {
                  setViewMode('market');
                  setSideFilter('buy');
                }}
                className={`ui-segment-item ${
                  sideFilter === 'buy'
                    ? 'bg-emerald-500 text-white shadow-soft hover:text-white'
                    : ''
                }`}
              >
                {isEs ? 'Comprar' : 'Buy'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode('market');
                  setSideFilter('sell');
                }}
                className={`ui-segment-item ${
                  sideFilter === 'sell' ? 'ui-segment-item-active' : ''
                }`}
              >
                {isEs ? 'Vender' : 'Sell'}
              </button>
            </div>

            <div className="hidden sm:block h-5 w-px bg-line" />

            {/* Asset Selector */}
            <div className="ui-segment">
              {(['PUSD', 'BCH', 'LIFT'] as const).map(sym => (
                <button
                  key={sym}
                  type="button"
                  onClick={() => {
                    setViewMode('market');
                    setAssetFilter(sym);
                  }}
                  className={`ui-segment-item inline-flex items-center gap-1.5 ${
                    assetFilter === sym ? 'ui-segment-item-active' : ''
                  }`}
                >
                  <img src={ASSET_ICONS[sym]} alt={sym} className="w-3.5 h-3.5 rounded-full object-contain" />
                  <span>{sym}</span>
                </button>
              ))}
            </div>

            {/* Fiat Selector + Auto Location Indicator */}
            <div className="inline-flex items-center gap-1.5">
              <select
                value={fiatFilter}
                onChange={e => {
                  const next = e.target.value;
                  setViewMode('market');
                  setFiatFilter(next);
                  setIsAutoFiat(false);
                  try {
                    localStorage.setItem('bliq_p2p_fiat', next);
                  } catch {}
                }}
                aria-label={isEs ? 'Moneda fiat' : 'Fiat currency'}
                className="h-9 px-3 rounded-control bg-surface-2 border border-line text-xs font-semibold text-ink outline-none focus:border-line-strong cursor-pointer"
              >
                {fiats.map(f => (
                  <option key={f.code} value={f.code}>
                    {f.code} ({f.symbol}) — {f.name}
                  </option>
                ))}
              </select>
              {isAutoFiat ? (
                <span
                  className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-2 border border-line text-[11px] font-medium text-ink-2"
                  title={isEs ? 'Moneda detectada según tu ubicación' : 'Currency auto-detected by location'}
                >
                  <MapPin className="w-3 h-3 text-emerald-500" />
                  <span>Auto{detectedCountry ? ` · ${detectedCountry}` : ''}</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    try {
                      localStorage.removeItem('bliq_p2p_fiat');
                    } catch {}
                    hasSyncedServerGeoRef.current = false;
                    setIsAutoFiat(true);
                    const auto = getInitialFiatPreference();
                    setFiatFilter(auto.fiat);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-2 border border-line text-ink-3 hover:text-ink text-[11px] font-medium cursor-pointer"
                  title={isEs ? 'Detectar moneda por ubicación automáticamente' : 'Auto-detect currency by location'}
                >
                  <MapPin className="w-3 h-3" />
                  <span>Auto</span>
                </button>
              )}
            </div>
          </div>

          {/* Live Oracle Reference */}
          <div className="flex items-center justify-between lg:justify-end gap-3 text-xs">
            <div className="flex items-center gap-2 text-ink-3">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>{isEs ? 'Oráculo:' : 'Oracle:'}</span>
              <span className="font-semibold text-ink tabular-nums">
                {currentFiatMeta.symbol} {formatFiatNum(liveReferenceFiatPrice, liveReferenceFiatPrice < 10 ? 4 : 2)} / {assetFilter}
              </span>
            </div>
            <button
              type="button"
              onClick={() => fetchOverview(false)}
              className="w-8 h-8 rounded-control bg-surface-2 border border-line text-ink-2 hover:text-ink flex items-center justify-center transition cursor-pointer"
              title={isEs ? 'Actualizar libro P2P' : 'Refresh P2P book'}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Inline Decentralized Identity & $LIFT Rewards Strip */}
        <div className="border-t border-line bg-surface-2/40 px-4 sm:px-5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          {verifiedIdentity ? (
            <>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 min-w-0">
                <div className="inline-flex items-center gap-1.5 text-ink font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="font-mono font-semibold">{fullIdentityHandle}</span>
                </div>
                <div className="inline-flex items-center gap-1 text-ink-2 tabular-nums">
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  <span className="font-semibold text-ink">{(userRewards.avgRating ?? 5.0).toFixed(1)}</span>
                  <span className="text-ink-3">
                    ({userRewards.reviewCount ?? 0} {isEs ? 'reseñas' : 'reviews'})
                  </span>
                </div>
                <div className="inline-flex items-center gap-1 text-ink-2 tabular-nums">
                  <Gift className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    +{userRewards.liftCashbackEarned ?? 0} LIFT
                  </span>
                  <span className="text-ink-3">(0.25% cashback)</span>
                </div>
              </div>
              {onOpenIdentity && (
                <button
                  type="button"
                  onClick={onOpenIdentity}
                  className="inline-flex items-center gap-1 text-xs font-medium text-ink-2 hover:text-ink cursor-pointer shrink-0"
                >
                  <span>{isEs ? 'Gestionar @usuario' : 'Manage @username'}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-ink-2 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                <span className="truncate">
                  {isEs
                    ? 'Identidad Descentralizada (@usuario) obligatoria para publicar o tomar órdenes P2P.'
                    : 'Decentralized Identity (@username) required to post or take P2P orders.'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <div className="flex items-center gap-1 bg-surface border border-line rounded-control pl-2.5 pr-1 h-8">
                  <input
                    type="text"
                    value={manualVerifyHandleInput}
                    onChange={e => setManualVerifyHandleInput(e.target.value)}
                    placeholder={isEs ? '¿Ya tienes @usuario?' : 'Have @username?'}
                    className="bg-transparent text-xs text-ink outline-none w-32"
                  />
                  <button
                    type="button"
                    disabled={resolvingIdentity || !manualVerifyHandleInput.trim()}
                    onClick={() => handleVerifyExistingHandle()}
                    className="px-2 py-0.5 rounded-lg bg-surface-2 hover:bg-surface-3 text-[11px] font-semibold text-ink disabled:opacity-50 cursor-pointer"
                  >
                    {resolvingIdentity ? '...' : isEs ? 'Vincular' : 'Verify'}
                  </button>
                </div>

                {onOpenIdentity && (
                  <button
                    type="button"
                    onClick={onOpenIdentity}
                    className="ui-btn-secondary ui-btn-sm"
                  >
                    <span>{isEs ? 'Crear mi @usuario →' : 'Create @username →'}</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* MAIN CONTENT: UNIFIED SWISS LEDGER ORDERBOOK OR MY TRADES */}
      {viewMode === 'market' ? (
        <div className="ui-card overflow-hidden">
          {!loading && offers.length > 0 && (
            <div className="hidden md:grid grid-cols-12 items-center px-5 py-2.5 border-b border-line bg-surface-2/40 text-[11px] font-medium text-ink-3">
              <div className="col-span-4">{isEs ? 'Comerciante · Reputación' : 'Merchant · Reputation'}</div>
              <div className="col-span-3">{isEs ? 'Precio unitario' : 'Unit price'}</div>
              <div className="col-span-3">{isEs ? 'Disponible · Límites y pago' : 'Available · Limits & pay'}</div>
              <div className="col-span-2 text-right">{isEs ? 'Operar' : 'Trade'}</div>
            </div>
          )}

          {loading ? (
            <div className="p-12 text-center text-xs text-ink-3">
              {isEs ? 'Sincronizando libro de órdenes y oráculo multi-CEX...' : 'Syncing P2P orderbook & multi-CEX oracle...'}
            </div>
          ) : offers.length === 0 ? (
            <div className="py-14 px-6 text-center space-y-3">
              <div className="text-sm font-semibold text-ink">
                {isEs
                  ? `No hay anuncios publicados para ${sideFilter === 'buy' ? 'comprar' : 'vender'} ${assetFilter} en ${fiatFilter} (${isTestnet ? 'Chipnet' : 'Mainnet'})`
                  : `No active offers to ${sideFilter} ${assetFilter} for ${fiatFilter} on ${isTestnet ? 'Chipnet' : 'Mainnet'}`}
              </div>
              <p className="text-xs text-ink-3 max-w-md mx-auto">
                {isEs
                  ? 'Solo aparecen anuncios reales publicados por usuarios con @usuario verificado y cuenta bancaria protegida por Escrow P2SH32.'
                  : 'Only authentic offers published by verified @username traders with Escrow-gated bank details appear here.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  if (!connectedBch) {
                    onConnectWallet();
                    return;
                  }
                  const fm = fiats.find(f => f.code === fiatFilter) || DEFAULT_FIATS[0];
                  setAdAsset(assetFilter);
                  setAdFiat(fiatFilter);
                  setAdMethods([fm.methods[0]]);
                  if (!bankName.trim()) setBankName(fm.methods[0]);
                  setShowPostAdModal(true);
                }}
                className="ui-btn-secondary ui-btn-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isEs ? 'Publicar primer anuncio' : 'Post first offer'}</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-line">
              {offers.map(offer => {
                const isOwn = Boolean(
                  connectedBch && offer.merchantAddress.toLowerCase() === connectedBch.toLowerCase()
                );
                const diffPct =
                  offer.oracleFiatPrice > 0
                    ? ((offer.unitFiatPrice - offer.oracleFiatPrice) / offer.oracleFiatPrice) * 100
                    : 0;

                return (
                  <div
                    key={offer.id}
                    className="px-4 sm:px-5 py-4 hover:bg-surface-2/40 transition-colors grid grid-cols-1 md:grid-cols-12 items-center gap-4"
                  >
                    {/* Merchant & Star Reputation */}
                    <div className="md:col-span-4 space-y-1 min-w-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-control bg-surface-2 border border-line flex items-center justify-center text-xs font-semibold text-ink shrink-0">
                          {(offer.merchantHandle || offer.merchantAddress).replace(/^@/, '').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-semibold text-ink truncate">
                              {offer.merchantHandle || formatAddress(offer.merchantAddress)}
                            </span>
                            <button
                              type="button"
                              onClick={() => setReviewsModalOffer(offer)}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-surface-2 hover:bg-surface-3 border border-line text-[11px] font-semibold text-ink transition cursor-pointer tabular-nums"
                              title={isEs ? 'Ver reseñas verificadas con estrellas' : 'View verified star reviews'}
                            >
                              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                              <span>{(offer.reputation.avgRating ?? 5.0).toFixed(1)}</span>
                              <span className="text-ink-3 font-normal">({offer.reputation.reviewCount ?? 0})</span>
                            </button>
                          </div>
                          <div className="text-[11px] text-ink-3 flex items-center gap-1.5 flex-wrap tabular-nums">
                            <span>{offer.reputation.completedTrades} {isEs ? 'órdenes' : 'trades'}</span>
                            <span>·</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                              {offer.reputation.completionRate}%
                            </span>
                            {offer.hasPaymentDetails && (
                              <>
                                <span>·</span>
                                <span className="text-ink-2">
                                  {offer.paymentBankLabel || (isEs ? 'Banco verificado' : 'Verified bank')}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      {offer.terms && (
                        <p className="text-[11px] text-ink-3 line-clamp-1 pl-12">{offer.terms}</p>
                      )}
                    </div>

                    {/* Unit Price */}
                    <div className="md:col-span-3">
                      <div className="md:hidden text-[11px] text-ink-3 mb-0.5">{isEs ? 'Precio unitario' : 'Unit price'}</div>
                      <div className="text-lg font-semibold text-ink tabular-nums tracking-tight">
                        {offer.fiatSymbol} {formatFiatNum(offer.unitFiatPrice, offer.unitFiatPrice < 10 ? 4 : 2)}
                      </div>
                      <div className="text-[11px] text-ink-3 tabular-nums flex items-center gap-1.5">
                        <span>
                          {diffPct >= 0 ? '+' : ''}
                          {diffPct.toFixed(2)}% vs {isEs ? 'oráculo' : 'oracle'}
                        </span>
                        <span>·</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">+0.25% LIFT Cashback</span>
                      </div>
                    </div>

                    {/* Available & Payment Methods */}
                    <div className="md:col-span-3 space-y-1">
                      <div className="text-xs text-ink-2 tabular-nums">
                        <span className="text-ink-3">{isEs ? 'Disp.' : 'Avail.'}</span>{' '}
                        <span className="font-semibold text-ink">
                          {offer.availableAmount} {offer.asset}
                        </span>
                      </div>
                      <div className="text-[11px] text-ink-3 tabular-nums">
                        {offer.minAmount} – {offer.maxAmount} {offer.asset}
                      </div>
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {offer.paymentMethods.slice(0, 3).map(pm => (
                          <span
                            key={pm}
                            className="px-2 py-0.5 rounded-md bg-surface-2 border border-line text-[10px] font-medium text-ink-2"
                          >
                            {pm}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* CTA */}
                    <div className="md:col-span-2 flex md:justify-end">
                      {isOwn ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteOffer(offer.id)}
                          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-control bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold hover:bg-rose-500/15 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{isEs ? 'Eliminar' : 'Delete'}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openTakeOffer(offer)}
                          className={`w-full md:w-auto h-9 px-4 rounded-control text-xs font-semibold transition cursor-pointer ${
                            sideFilter === 'buy'
                              ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                              : 'bg-ink hover:opacity-90 text-canvas'
                          }`}
                        >
                          {sideFilter === 'buy'
                            ? `${isEs ? 'Comprar' : 'Buy'} ${offer.asset}`
                            : `${isEs ? 'Vender' : 'Sell'} ${offer.asset}`}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* MY TRADES LEDGER */
        <div className="ui-card overflow-hidden">
          {!connectedBch ? (
            <div className="py-12 px-6 text-center space-y-3">
              <Wallet className="w-6 h-6 mx-auto text-ink-3" />
              <div className="text-sm font-semibold text-ink">
                {isEs ? 'Conecta tu billetera BCH para ver tus órdenes P2P' : 'Connect your BCH wallet to view your P2P trades'}
              </div>
              <button
                type="button"
                onClick={onConnectWallet}
                className="ui-btn-secondary ui-btn-sm"
              >
                {isEs ? 'Conectar Wallet BCH' : 'Connect BCH Wallet'}
              </button>
            </div>
          ) : myTrades.length === 0 ? (
            <div className="py-12 px-6 text-center text-xs text-ink-3">
              {isEs ? 'Aún no tienes órdenes P2P en esta red.' : 'You have no P2P trades on this network yet.'}
            </div>
          ) : (
            <div className="divide-y divide-line">
              {myTrades.map(tr => (
                <div
                  key={tr.id}
                  onClick={() => setActiveTrade(tr)}
                  className="px-4 sm:px-5 py-4 hover:bg-surface-2/40 transition-colors cursor-pointer flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-sm font-semibold text-ink tabular-nums">
                        {tr.cryptoAmount} {tr.asset} ↔ {tr.fiatSymbol} {formatFiatNum(tr.fiatAmount)} ({tr.fiat})
                      </span>
                      {statusBadge(tr.status)}
                    </div>
                    <div className="text-[11px] font-mono text-ink-3">
                      P2SH32: {formatAddress(tr.escrowAddress)} · {tr.paymentMethod}
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-ink-2 hover:text-ink inline-flex items-center gap-1">
                    <span>{isEs ? 'Abrir Sala Escrow' : 'Open Escrow Room'}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: POST AD */}
      {showPostAdModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="ui-card w-full max-w-lg p-5 sm:p-6 max-h-[92vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h2 className="ui-section-title">
                {isEs ? 'Publicar Anuncio P2P' : 'Post P2P Offer'}
              </h2>
              <button
                type="button"
                onClick={() => setShowPostAdModal(false)}
                className="p-1.5 rounded-control bg-surface-2 border border-line text-ink-3 hover:text-ink cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateOffer} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2 p-1 rounded-full bg-canvas">
                <button
                  type="button"
                  onClick={() => setAdSide('sell')}
                  className={`py-2 rounded-full font-semibold cursor-pointer ${
                    adSide === 'sell' ? 'bg-ink text-surface' : 'text-ink-3'
                  }`}
                >
                  {isEs ? 'Quiero Vender Cripto' : 'I want to Sell'}
                </button>
                <button
                  type="button"
                  onClick={() => setAdSide('buy')}
                  className={`py-2 rounded-full font-semibold cursor-pointer ${
                    adSide === 'buy' ? 'bg-emerald-500 text-white' : 'text-ink-3'
                  }`}
                >
                  {isEs ? 'Quiero Comprar Cripto' : 'I want to Buy'}
                </button>
              </div>

              {/* Mandatory Decentralized Identity Box */}
              <div className="rounded-2xl bg-canvas p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-ink flex items-center gap-1.5">
                    <Fingerprint className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{isEs ? 'Identidad Descentralizada (@usuario) *' : 'Decentralized Identity (@username) *'}</span>
                  </span>
                  {verifiedIdentity && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold">
                      {isEs ? 'Verificada (Kind 30078)' : 'Verified (Kind 30078)'}
                    </span>
                  )}
                </div>

                {verifiedIdentity ? (
                  <div className="px-3.5 py-2.5 rounded-xl bg-surface font-mono font-semibold text-ink flex items-center justify-between">
                    <span>{fullIdentityHandle}</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[11px] text-amber-600 dark:text-amber-400">
                      {isEs
                        ? 'Para publicar un anuncio P2P es obligatorio tener una identidad @usuario creada en BinaryLiquid Identity.'
                        : 'To post a P2P offer you must have a @username identity minted in BinaryLiquid Identity.'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {onOpenIdentity && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowPostAdModal(false);
                            onOpenIdentity();
                          }}
                          className="px-3.5 py-2 rounded-full bg-ink text-surface text-[11px] font-semibold cursor-pointer"
                        >
                          {isEs ? 'Crear mi @usuario en Identidad →' : 'Create @username in Identity →'}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] text-ink-3 mb-1">{isEs ? 'Activo' : 'Asset'}</label>
                  <select
                    value={adAsset}
                    onChange={e => setAdAsset(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-2xl bg-canvas text-ink font-semibold outline-none"
                  >
                    <option value="PUSD">PUSD (CashToken)</option>
                    <option value="BCH">BCH (Bitcoin Cash)</option>
                    <option value="LIFT">LIFT (CashToken)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-ink-3 mb-1">Fiat</label>
                  <select
                    value={adFiat}
                    onChange={e => {
                      const next = e.target.value;
                      setAdFiat(next);
                      const fm = fiats.find(f => f.code === next) || DEFAULT_FIATS[0];
                      setAdMethods([fm.methods[0]]);
                      setBankName(fm.methods[0]);
                    }}
                    className="w-full px-3 py-2.5 rounded-2xl bg-canvas text-ink font-semibold outline-none"
                  >
                    {fiats.map(f => (
                      <option key={f.code} value={f.code}>
                        {f.code} ({f.symbol})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] text-ink-3 mb-1">{isEs ? 'Tipo de Precio' : 'Pricing'}</label>
                  <select
                    value={adPricingMode}
                    onChange={e => setAdPricingMode(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-2xl bg-canvas text-ink font-semibold outline-none"
                  >
                    <option value="floating">{isEs ? 'Flotante (% Oráculo)' : 'Floating (% Oracle)'}</option>
                    <option value="fixed">{isEs ? 'Precio Fijo Fiat' : 'Fixed Fiat Price'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-ink-3 mb-1">
                    {adPricingMode === 'floating' ? (isEs ? 'Margen (%)' : 'Margin (%)') : `${isEs ? 'Precio' : 'Price'} (${adFiat})`}
                  </label>
                  {adPricingMode === 'floating' ? (
                    <input
                      type="number"
                      step="0.1"
                      value={adMarginPct}
                      onChange={e => setAdMarginPct(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-canvas text-ink outline-none tabular-nums"
                    />
                  ) : (
                    <input
                      type="number"
                      step="any"
                      value={adFixedPrice}
                      onChange={e => setAdFixedPrice(e.target.value)}
                      placeholder="Ej. 47.00"
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-canvas text-ink outline-none tabular-nums"
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] text-ink-3 mb-1">{isEs ? 'Disponible' : 'Available'}</label>
                  <input
                    type="number"
                    step="any"
                    value={adAvailable}
                    onChange={e => setAdAvailable(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-2xl bg-canvas text-ink outline-none tabular-nums"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-ink-3 mb-1">{isEs ? 'Mínimo' : 'Min'}</label>
                  <input
                    type="number"
                    step="any"
                    value={adMin}
                    onChange={e => setAdMin(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-2xl bg-canvas text-ink outline-none tabular-nums"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-ink-3 mb-1">{isEs ? 'Máximo' : 'Max'}</label>
                  <input
                    type="number"
                    step="any"
                    value={adMax}
                    onChange={e => setAdMax(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-2xl bg-canvas text-ink outline-none tabular-nums"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-ink-3 mb-1.5">{isEs ? 'Métodos de Pago' : 'Payment Methods'}</label>
                <div className="flex flex-wrap gap-1.5">
                  {selectedAdFiatMeta.methods.map(m => {
                    const selected = adMethods.includes(m);
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          setAdMethods(prev => {
                            const next = prev.includes(m) ? (prev.length > 1 ? prev.filter(x => x !== m) : prev) : [...prev, m];
                            if (!bankName.trim() || selectedAdFiatMeta.methods.includes(bankName.trim())) {
                              setBankName(next[0] || m);
                            }
                            return next;
                          });
                        }}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition cursor-pointer ${
                          selected ? 'bg-ink text-surface' : 'bg-canvas text-ink-3 hover:text-ink'
                        }`}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* STRUCTURED BANK / PAYMENT ACCOUNT DETAILS (Required when Merchant is SELLING crypto & RECEIVING fiat) */}
              {adSide === 'sell' ? (
                <div className="rounded-2xl bg-canvas p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-ink flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>
                        {isEs
                          ? 'Tus Datos Bancarios de Cobro (Donde recibirás el Fiat) *'
                          : 'Your Receiving Bank / Payment Account Details *'}
                      </span>
                    </span>
                    <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                      {isEs ? '🔒 Oculto hasta Escrow' : '🔒 Hidden until Escrow'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] text-ink-3 mb-1">
                        {isEs ? 'Nombre del Titular *' : 'Account Holder Name *'}
                      </label>
                      <input
                        type="text"
                        value={bankHolderName}
                        onChange={e => setBankHolderName(e.target.value)}
                        placeholder={isEs ? 'Ej. Adrian Perez' : 'e.g. Adrian Perez'}
                        className="w-full px-3 py-2 rounded-xl bg-surface text-ink outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-ink-3 mb-1">
                        {isEs ? 'Banco / App de Pago *' : 'Bank / Payment App *'}
                      </label>
                      <input
                        type="text"
                        value={bankName}
                        onChange={e => setBankName(e.target.value)}
                        placeholder={adMethods[0] || 'Ej. Banesco / GCash / Alipay / Zelle'}
                        className="w-full px-3 py-2 rounded-xl bg-surface text-ink outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] text-ink-3 mb-1">
                        {isEs ? 'N° Cuenta / Teléfono / Correo / Alias *' : 'Account No. / Phone / Email / Alias *'}
                      </label>
                      <input
                        type="text"
                        value={bankAccountNumber}
                        onChange={e => setBankAccountNumber(e.target.value)}
                        placeholder={isEs ? '0134-... / +58... / correo@...' : 'Account / Phone / Handle'}
                        className="w-full px-3 py-2 rounded-xl bg-surface text-ink font-mono outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-ink-3 mb-1">
                        {isEs ? 'Cédula / DNI / RIF / ID (Opcional)' : 'National ID / Tax ID (Optional)'}
                      </label>
                      <input
                        type="text"
                        value={bankDocumentId}
                        onChange={e => setBankDocumentId(e.target.value)}
                        placeholder={isEs ? 'Ej. V-12345678' : 'e.g. ID-12345678'}
                        className="w-full px-3 py-2 rounded-xl bg-surface text-ink font-mono outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-ink-3 mb-1">
                      {isEs ? 'Concepto o Instrucción Bancaria (Opcional)' : 'Transfer Note / Instructions (Optional)'}
                    </label>
                    <input
                      type="text"
                      value={bankInstructions}
                      onChange={e => setBankInstructions(e.target.value)}
                      placeholder={isEs ? 'Ej. No colocar palabras cripto en el concepto' : 'e.g. Do not mention crypto in memo'}
                      className="w-full px-3 py-2 rounded-xl bg-surface text-ink outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl bg-canvas p-3 text-[11px] text-ink-3 flex items-start gap-2">
                  <Building2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>
                    {isEs
                      ? 'Como estás publicando un anuncio para COMPRAR cripto, el vendedor que tome tu anuncio ingresará sus datos bancarios y se te revelarán dentro de la Sala Escrow en cuanto su cripto quede bloqueado on-chain.'
                      : 'Since you are posting an offer to BUY crypto, the seller who takes your offer will provide their bank account details, which unlock inside the Escrow Room once their crypto is locked on-chain.'}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-[11px] text-ink-3 mb-1">{isEs ? 'Condiciones Públicas (opcional)' : 'Public Terms (optional)'}</label>
                <input
                  type="text"
                  value={adTerms}
                  onChange={e => setAdTerms(e.target.value)}
                  placeholder={isEs ? 'Ej. Titular verificado, pago en 15 min.' : 'e.g. Verified account, 15m payment.'}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-canvas text-ink outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={postingAd || !verifiedIdentity}
                className="w-full py-3 rounded-full bg-ink text-surface font-semibold text-xs hover:opacity-90 disabled:opacity-50 cursor-pointer"
              >
                {postingAd
                  ? isEs
                    ? 'Publicando...'
                    : 'Publishing...'
                  : !verifiedIdentity
                  ? isEs
                    ? 'Requiere Identidad @usuario para Publicar'
                    : 'Requires @username Identity to Publish'
                  : isEs
                  ? 'Publicar Anuncio P2P'
                  : 'Publish P2P Offer'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: TAKE OFFER -> DERIVE P2SH32 ESCROW */}
      {takeOffer && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="ui-card w-full max-w-lg p-5 sm:p-6 max-h-[92vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div>
                <h2 className="ui-section-title">
                  {takeOffer.side === 'buy'
                    ? `${isEs ? 'Vender' : 'Sell'} ${takeOffer.asset}`
                    : `${isEs ? 'Comprar' : 'Buy'} ${takeOffer.asset}`}
                </h2>
                <p className="text-[11px] text-ink-3 tabular-nums">
                  {takeOffer.merchantHandle || formatAddress(takeOffer.merchantAddress)} · {takeOffer.fiatSymbol}{' '}
                  {formatFiatNum(takeOffer.unitFiatPrice, takeOffer.unitFiatPrice < 10 ? 4 : 2)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTakeOffer(null)}
                className="p-1.5 rounded-control bg-surface-2 border border-line text-ink-3 hover:text-ink cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Mandatory Decentralized Identity Box */}
              <div className="rounded-2xl bg-canvas p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-ink flex items-center gap-1.5">
                    <Fingerprint className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{isEs ? 'Tu Identidad Descentralizada (@usuario) *' : 'Your Decentralized Identity (@username) *'}</span>
                  </span>
                  {verifiedIdentity && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold">
                      {isEs ? 'Verificada' : 'Verified'}
                    </span>
                  )}
                </div>
                {verifiedIdentity ? (
                  <div className="px-3.5 py-2 rounded-xl bg-surface font-mono font-semibold text-ink flex items-center justify-between">
                    <span>{fullIdentityHandle}</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[11px] text-amber-600 dark:text-amber-400">
                      {isEs
                        ? 'Para abrir una orden P2P es obligatorio contar con tu identidad descentralizada @usuario.'
                        : 'To open a P2P trade you must have your decentralized @username identity.'}
                    </p>
                    {onOpenIdentity && (
                      <button
                        type="button"
                        onClick={() => {
                          setTakeOffer(null);
                          onOpenIdentity();
                        }}
                        className="px-3.5 py-2 rounded-full bg-ink text-surface text-[11px] font-semibold cursor-pointer"
                      >
                        {isEs ? 'Crear mi @usuario en Identidad →' : 'Create @username in Identity →'}
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-ink-3 mb-1">
                  <span>{isEs ? `Cantidad en ${takeOffer.asset}` : `Amount in ${takeOffer.asset}`}</span>
                  <span>
                    {takeOffer.minAmount} – {takeOffer.maxAmount} {takeOffer.asset}
                  </span>
                </div>
                <input
                  type="number"
                  step="any"
                  value={takeAmount}
                  onChange={e => setTakeAmount(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-canvas text-base font-semibold text-ink outline-none tabular-nums"
                />
              </div>

              <div className="rounded-2xl bg-canvas p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-ink-3">{isEs ? 'Total Fiat Estimado' : 'Estimated Fiat Total'}</span>
                  <span className="text-base font-semibold text-ink tabular-nums">
                    {takeOffer.fiatSymbol} {formatFiatNum((Number(takeAmount) || 0) * takeOffer.unitFiatPrice)} {takeOffer.fiat}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-line/40 text-[11px]">
                  <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <Gift className="w-3.5 h-3.5" />
                    <span>{isEs ? 'Recompensa Cashback (0.25%)' : 'Cashback Reward (0.25%)'}</span>
                  </span>
                  <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    +{estimatedTakeLiftCashback} LIFT
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-ink-3 mb-1">{isEs ? 'Método de Pago' : 'Payment Method'}</label>
                <div className="flex flex-wrap gap-1.5">
                  {takeOffer.paymentMethods.map(pm => (
                    <button
                      key={pm}
                      type="button"
                      onClick={() => {
                        setTakePaymentMethod(pm);
                        if (!bankName.trim() || takeOffer.paymentMethods.includes(bankName.trim())) {
                          setBankName(pm);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-semibold cursor-pointer ${
                        takePaymentMethod === pm ? 'bg-ink text-surface' : 'bg-canvas text-ink-3'
                      }`}
                    >
                      {pm}
                    </button>
                  ))}
                </div>
              </div>

              {/* If takeOffer.side === 'buy', the Taker is SELLING crypto & RECEIVING fiat -> Require Taker's Bank Details */}
              {takeOffer.side === 'buy' ? (
                <div className="rounded-2xl bg-canvas p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-ink flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>
                        {isEs
                          ? 'Tus Datos Bancarios de Cobro (Donde recibirás el Fiat) *'
                          : 'Your Receiving Bank / Payment Account Details *'}
                      </span>
                    </span>
                    <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                      {isEs ? '🔒 Protegido por Escrow' : '🔒 Escrow-Protected'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] text-ink-3 mb-1">
                        {isEs ? 'Nombre del Titular *' : 'Account Holder Name *'}
                      </label>
                      <input
                        type="text"
                        value={bankHolderName}
                        onChange={e => setBankHolderName(e.target.value)}
                        placeholder={isEs ? 'Ej. Adrian Perez' : 'e.g. Adrian Perez'}
                        className="w-full px-3 py-2 rounded-xl bg-surface text-ink outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-ink-3 mb-1">
                        {isEs ? 'Banco / App de Pago *' : 'Bank / Payment App *'}
                      </label>
                      <input
                        type="text"
                        value={bankName}
                        onChange={e => setBankName(e.target.value)}
                        placeholder={takePaymentMethod || 'Banco / App'}
                        className="w-full px-3 py-2 rounded-xl bg-surface text-ink outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] text-ink-3 mb-1">
                        {isEs ? 'N° Cuenta / Teléfono / Correo / Alias *' : 'Account No. / Phone / Email / Alias *'}
                      </label>
                      <input
                        type="text"
                        value={bankAccountNumber}
                        onChange={e => setBankAccountNumber(e.target.value)}
                        placeholder={isEs ? '0134-... / +58... / correo@...' : 'Account / Phone / Handle'}
                        className="w-full px-3 py-2 rounded-xl bg-surface text-ink font-mono outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-ink-3 mb-1">
                        {isEs ? 'Cédula / DNI / RIF / ID (Opcional)' : 'National ID / Tax ID (Optional)'}
                      </label>
                      <input
                        type="text"
                        value={bankDocumentId}
                        onChange={e => setBankDocumentId(e.target.value)}
                        placeholder={isEs ? 'Ej. V-12345678' : 'e.g. ID-12345678'}
                        className="w-full px-3 py-2 rounded-xl bg-surface text-ink font-mono outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-ink-3 mb-1">
                      {isEs ? 'Concepto o Instrucción Bancaria (Opcional)' : 'Transfer Note / Instructions (Optional)'}
                    </label>
                    <input
                      type="text"
                      value={bankInstructions}
                      onChange={e => setBankInstructions(e.target.value)}
                      placeholder={isEs ? 'Ej. Pago rápido, sin referencia cripto' : 'e.g. Fast transfer, no crypto memo'}
                      className="w-full px-3 py-2 rounded-xl bg-surface text-ink outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl bg-canvas p-3.5 text-[11px] text-ink-2 flex items-start gap-2">
                  <Building2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>
                    {isEs
                      ? `Los datos bancarios de ${takeOffer.merchantHandle || 'el vendedor'} (${takeOffer.paymentBankLabel || takePaymentMethod}) se desbloquearán automáticamente dentro de la Sala Escrow apenas el vendedor bloquee los ${takeAmount || 0} ${takeOffer.asset} en el contrato CashScript P2SH32.`
                      : `The seller's bank details (${takeOffer.paymentBankLabel || takePaymentMethod}) will automatically unlock inside the Escrow Room as soon as the seller locks ${takeAmount || 0} ${takeOffer.asset} in the CashScript P2SH32 contract.`}
                  </span>
                </div>
              )}

              <div className="rounded-2xl bg-emerald-500/10 p-3 text-[11px] text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  {isEs
                    ? 'Se derivará un contrato único CashScript BinaryLiquidP2PEscrow.cash P2SH32. Ningún tercero puede desviar los fondos.'
                    : 'A unique CashScript BinaryLiquidP2PEscrow.cash P2SH32 covenant will be derived. No third party can divert funds.'}
                </span>
              </div>

              <button
                type="button"
                disabled={creatingTrade || !(Number(takeAmount) > 0) || !verifiedIdentity}
                onClick={handleCreateTrade}
                className="w-full py-3 rounded-full bg-ink text-surface font-semibold text-xs hover:opacity-90 disabled:opacity-50 cursor-pointer"
              >
                {creatingTrade
                  ? isEs
                    ? 'Derivando Escrow P2SH32...'
                    : 'Deriving P2SH32 Escrow...'
                  : !verifiedIdentity
                  ? isEs
                    ? 'Requiere Identidad @usuario para Operar'
                    : 'Requires @username Identity to Trade'
                  : isEs
                  ? 'Abrir Orden y Derivar Escrow P2SH32'
                  : 'Open Trade & Derive P2SH32 Escrow'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: LIVE ESCROW TRADE ROOM */}
      {activeTrade && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="ui-card w-full max-w-3xl p-5 sm:p-6 max-h-[92vh] overflow-y-auto space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-line">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-semibold text-ink">
                    {activeTrade.cryptoAmount} {activeTrade.asset} ↔ {activeTrade.fiatSymbol}{' '}
                    {formatFiatNum(activeTrade.fiatAmount)} {activeTrade.fiat}
                  </h2>
                  {statusBadge(activeTrade.status)}
                </div>
                <div className="text-[11px] text-ink-3 flex flex-wrap items-center gap-2">
                  <span>{activeTrade.paymentMethod}</span>
                  <span>·</span>
                  <span>{activeTrade.contractName}</span>
                  <span>·</span>
                  <span>
                    {isSellerInActiveTrade
                      ? isEs
                        ? 'Tu rol: Vendedor (Fondeas Cripto y Recibes Fiat)'
                        : 'Your role: Seller (Fund Crypto & Receive Fiat)'
                      : isBuyerInActiveTrade
                      ? isEs
                        ? 'Tu rol: Comprador (Envías Fiat y Recibes Cripto)'
                        : 'Your role: Buyer (Send Fiat & Receive Crypto)'
                      : 'Viewer'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTrade(null)}
                className="p-1.5 rounded-full bg-canvas text-ink-3 hover:text-ink cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 4-Step Progress Bar */}
            <div className="grid grid-cols-4 gap-2 text-[10px] sm:text-[11px] font-medium">
              {[
                { key: 'derive', label: isEs ? '1. P2SH32' : '1. P2SH32', done: true },
                {
                  key: 'fund',
                  label: isEs ? '2. Fondeado' : '2. Funded',
                  done: ['ESCROW_FUNDED', 'FIAT_SENT', 'COMPLETED'].includes(activeTrade.status)
                },
                {
                  key: 'fiat',
                  label: isEs ? '3. Pago Fiat' : '3. Fiat Paid',
                  done: ['FIAT_SENT', 'COMPLETED'].includes(activeTrade.status)
                },
                {
                  key: 'done',
                  label: isEs ? '4. Liberado' : '4. Released',
                  done: activeTrade.status === 'COMPLETED'
                }
              ].map(step => (
                <div
                  key={step.key}
                  className={`rounded-xl px-2.5 py-2 text-center ${
                    step.done
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold'
                      : 'bg-canvas text-ink-3'
                  }`}
                >
                  {step.label}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* LEFT: Covenant Address, Bank Details & On-Chain Actions */}
              <div className="md:col-span-7 space-y-3.5">
                <div className="rounded-2xl bg-canvas p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-ink flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{isEs ? 'Dirección Única Escrow P2SH32' : 'Isolated P2SH32 Escrow Address'}</span>
                    </span>
                    <a
                      href={activeTrade.escrowExplorerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-2 hover:text-ink"
                    >
                      <span>Explorer</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="flex items-center gap-3">
                    {escrowQrUrl ? (
                      <img src={escrowQrUrl} alt="Escrow QR" className="w-20 h-20 rounded-xl bg-white p-1 shrink-0" />
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-surface flex items-center justify-center shrink-0">
                        <QrCode className="w-6 h-6 text-ink-3" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="font-mono text-[11px] text-ink break-all bg-surface rounded-xl px-2.5 py-2">
                        {activeTrade.escrowAddress}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(activeTrade.escrowAddress, 'escrow')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface text-[11px] font-semibold text-ink-2 hover:text-ink cursor-pointer"
                      >
                        {copiedKey === 'escrow' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedKey === 'escrow' ? (isEs ? 'Copiado' : 'Copied') : isEs ? 'Copiar Escrow' : 'Copy Escrow'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                    <div className="rounded-xl bg-surface px-2.5 py-1.5">
                      <div className="text-ink-3">{isEs ? 'Vendedor (Recibe Fiat)' : 'Seller (Receives Fiat)'}</div>
                      <div className="font-mono text-ink truncate">
                        {activeTrade.sellerHandle || formatAddress(activeTrade.sellerAddress)}
                      </div>
                    </div>
                    <div className="rounded-xl bg-surface px-2.5 py-1.5">
                      <div className="text-ink-3">{isEs ? 'Comprador (Envía Fiat)' : 'Buyer (Sends Fiat)'}</div>
                      <div className="font-mono text-ink truncate">
                        {activeTrade.buyerHandle || formatAddress(activeTrade.buyerAddress)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* SELLER BANK / PAYMENT ACCOUNT DETAILS PANEL */}
                <div className="rounded-2xl bg-canvas p-4 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-ink flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>
                        {isEs
                          ? `Datos Bancarios del Vendedor (${activeTrade.paymentMethod})`
                          : `Seller Bank / Payment Details (${activeTrade.paymentMethod})`}
                      </span>
                    </span>
                    {activeTrade.paymentDetails?.isLockedUntilEscrow || activeTrade.status === 'AWAITING_ESCROW' ? (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-semibold">
                        {isEs ? '🔒 Bloqueado hasta Escrow' : '🔒 Locked until Escrow'}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold">
                        {isEs ? '✅ Desbloqueado por Escrow' : '✅ Unlocked by Escrow'}
                      </span>
                    )}
                  </div>

                  {activeTrade.paymentDetails?.isLockedUntilEscrow || activeTrade.status === 'AWAITING_ESCROW' ? (
                    <div className="rounded-xl bg-surface p-3 text-[11px] text-ink-3 space-y-1">
                      <div className="font-medium text-ink">
                        {isEs
                          ? '🔒 No envíes dinero fiat todavía.'
                          : '🔒 Do not transfer fiat yet.'}
                      </div>
                      <p>
                        {isEs
                          ? `El número de cuenta, teléfono y titular de ${activeTrade.sellerHandle || 'el vendedor'} se revelarán aquí automáticamente en cuanto el contrato BinaryLiquidP2PEscrow.cash verifique el depósito de ${activeTrade.cryptoAmount} ${activeTrade.asset} on-chain.`
                          : `The seller's account number and holder name will automatically unlock here once BinaryLiquidP2PEscrow.cash verifies the ${activeTrade.cryptoAmount} ${activeTrade.asset} deposit on-chain.`}
                      </p>
                    </div>
                  ) : activeTrade.paymentDetails ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div className="rounded-xl bg-surface px-3 py-2 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-[10px] text-ink-3">{isEs ? 'Titular' : 'Holder'}</div>
                          <div className="font-semibold text-ink truncate">{activeTrade.paymentDetails.holderName}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(activeTrade.paymentDetails!.holderName, 'bank_holder')}
                          className="p-1.5 rounded-lg bg-canvas text-ink-3 hover:text-ink cursor-pointer shrink-0"
                        >
                          {copiedKey === 'bank_holder' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>

                      <div className="rounded-xl bg-surface px-3 py-2 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-[10px] text-ink-3">{isEs ? 'Banco / App' : 'Bank / App'}</div>
                          <div className="font-semibold text-ink truncate">{activeTrade.paymentDetails.bankName}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(activeTrade.paymentDetails!.bankName, 'bank_name')}
                          className="p-1.5 rounded-lg bg-canvas text-ink-3 hover:text-ink cursor-pointer shrink-0"
                        >
                          {copiedKey === 'bank_name' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>

                      <div className="sm:col-span-2 rounded-xl bg-surface px-3 py-2 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-[10px] text-ink-3">
                            {isEs ? 'N° Cuenta / Teléfono / Correo / Alias' : 'Account No. / Phone / Email / Alias'}
                          </div>
                          <div className="font-mono font-semibold text-ink break-all">
                            {activeTrade.paymentDetails.accountNumber}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(activeTrade.paymentDetails!.accountNumber, 'bank_acc')}
                          className="p-1.5 rounded-lg bg-canvas text-ink-3 hover:text-ink cursor-pointer shrink-0"
                        >
                          {copiedKey === 'bank_acc' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>

                      {activeTrade.paymentDetails.documentId && (
                        <div className="rounded-xl bg-surface px-3 py-2 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-[10px] text-ink-3">{isEs ? 'Cédula / DNI / ID' : 'Document / Tax ID'}</div>
                            <div className="font-mono font-semibold text-ink truncate">
                              {activeTrade.paymentDetails.documentId}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopy(activeTrade.paymentDetails!.documentId!, 'bank_doc')}
                            className="p-1.5 rounded-lg bg-canvas text-ink-3 hover:text-ink cursor-pointer shrink-0"
                          >
                            {copiedKey === 'bank_doc' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      )}

                      <div className="rounded-xl bg-surface px-3 py-2 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-[10px] text-ink-3">{isEs ? 'Monto Exacto a Transferir' : 'Exact Fiat Amount'}</div>
                          <div className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                            {activeTrade.fiatSymbol} {formatFiatNum(activeTrade.fiatAmount)} {activeTrade.fiat}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(String(activeTrade.fiatAmount), 'bank_amt')}
                          className="p-1.5 rounded-lg bg-canvas text-ink-3 hover:text-ink cursor-pointer shrink-0"
                        >
                          {copiedKey === 'bank_amt' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>

                      {activeTrade.paymentDetails.instructions && (
                        <div className="sm:col-span-2 rounded-xl bg-surface px-3 py-2 text-ink-2">
                          <span className="text-ink-3">{isEs ? 'Instrucciones:' : 'Instructions:'}</span>{' '}
                          <span>{activeTrade.paymentDetails.instructions}</span>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>

                {/* STEP ACTIONS */}
                {activeTrade.status === 'AWAITING_ESCROW' && (
                  <div className="rounded-2xl bg-canvas p-4 space-y-3 text-xs">
                    <div className="font-semibold text-ink">
                      {isEs
                        ? `Paso 2: Bloquear ${activeTrade.cryptoAmount} ${activeTrade.asset} en el Escrow`
                        : `Step 2: Lock ${activeTrade.cryptoAmount} ${activeTrade.asset} in Escrow`}
                    </div>
                    {isSellerInActiveTrade && (
                      <button
                        type="button"
                        disabled={fundingOneClick}
                        onClick={handleOneClickFundEscrow}
                        className="w-full py-2.5 rounded-full bg-ink text-surface font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer"
                      >
                        {fundingOneClick
                          ? isEs
                            ? 'Firmando en billetera BCH...'
                            : 'Signing in BCH wallet...'
                          : hasOneClickSign
                          ? isEs
                            ? `Fondear ${activeTrade.cryptoAmount} ${activeTrade.asset} en 1-Clic`
                            : `1-Click Fund ${activeTrade.cryptoAmount} ${activeTrade.asset}`
                          : isEs
                          ? `Fondear ${activeTrade.cryptoAmount} ${activeTrade.asset} (Billetera BCH)`
                          : `Fund ${activeTrade.cryptoAmount} ${activeTrade.asset} (BCH Wallet)`}
                      </button>
                    )}

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={manualFundTx}
                        onChange={e => setManualFundTx(e.target.value)}
                        placeholder={isEs ? 'TXID opcional (o autodetectar UTXO)' : 'Optional TXID (or auto-detect UTXO)'}
                        className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-surface text-xs font-mono text-ink outline-none"
                      />
                      <button
                        type="button"
                        disabled={verifyingEscrow}
                        onClick={() => handleVerifyEscrow()}
                        className="px-3.5 py-2 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 disabled:opacity-50 cursor-pointer shrink-0"
                      >
                        {verifyingEscrow ? '...' : isEs ? 'Verificar On-Chain' : 'Verify On-Chain'}
                      </button>
                    </div>
                  </div>
                )}

                {activeTrade.status === 'ESCROW_FUNDED' && (
                  <div className="rounded-2xl bg-canvas p-4 space-y-2.5 text-xs">
                    <div className="font-semibold text-ink">
                      {isEs
                        ? `Paso 3: Transferir ${activeTrade.fiatSymbol} ${formatFiatNum(activeTrade.fiatAmount)} a la cuenta del vendedor`
                        : `Step 3: Transfer ${activeTrade.fiatSymbol} ${formatFiatNum(activeTrade.fiatAmount)} to seller's account`}
                    </div>
                    {isBuyerInActiveTrade && (
                      <>
                        <input
                          type="text"
                          value={fiatRefInput}
                          onChange={e => setFiatRefInput(e.target.value)}
                          placeholder={isEs ? 'N° de referencia o comprobante bancario (obligatorio)...' : 'Bank transfer reference number (required)...'}
                          className="w-full px-3 py-2 rounded-xl bg-surface text-ink outline-none"
                        />
                        <button
                          type="button"
                          disabled={actionBusy !== null || fiatRefInput.trim().length < 3}
                          onClick={handleMarkFiatPaid}
                          className="w-full py-2.5 rounded-full bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                        >
                          {isEs ? 'Confirmar Pago Fiat Enviado' : 'Confirm Fiat Payment Sent'}
                        </button>
                      </>
                    )}
                    {isSellerInActiveTrade && (
                      <div className="text-[11px] text-ink-3">
                        {isEs
                          ? 'Esperando a que el comprador realice la transferencia bancaria y adjunte el número de referencia...'
                          : 'Waiting for the buyer to complete the bank transfer and submit the reference number...'}
                      </div>
                    )}
                  </div>
                )}

                {activeTrade.status === 'FIAT_SENT' && (
                  <div className="rounded-2xl bg-emerald-500/10 p-4 space-y-2.5 text-xs">
                    <div className="font-semibold text-emerald-700 dark:text-emerald-300">
                      {isEs ? 'Pago fiat reportado — verifica tu banco antes de liberar' : 'Fiat payment reported — verify your bank before releasing'}
                    </div>
                    {activeTrade.fiatReference && (
                      <div className="text-[11px] text-ink-2">
                        {isEs ? 'Referencia bancaria:' : 'Bank reference:'}{' '}
                        <span className="font-mono font-semibold">{activeTrade.fiatReference}</span>
                      </div>
                    )}
                    {isSellerInActiveTrade && (
                      <button
                        type="button"
                        disabled={actionBusy !== null}
                        onClick={handleReleaseTrade}
                        className="w-full py-2.5 rounded-full bg-emerald-500 text-white font-semibold hover:bg-emerald-600 cursor-pointer"
                      >
                        {actionBusy === 'release'
                          ? isEs
                            ? 'Ejecutando releaseToBuyer() on-chain...'
                            : 'Executing releaseToBuyer() on-chain...'
                          : isEs
                          ? `Confirmar Recepción en Banco y Liberar ${activeTrade.cryptoAmount} ${activeTrade.asset}`
                          : `Confirm Bank Receipt & Release ${activeTrade.cryptoAmount} ${activeTrade.asset}`}
                      </button>
                    )}
                  </div>
                )}

                {activeTrade.status === 'COMPLETED' && (
                  <div className="space-y-3">
                    <div className="rounded-2xl bg-emerald-500/10 p-4 space-y-2 text-xs">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{isEs ? 'Liquidación On-Chain Completada' : 'On-Chain Settlement Completed'}</span>
                        </div>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold">
                          <Gift className="w-3.5 h-3.5" />
                          <span>
                            +{activeTrade.liftCashbackReward ?? 10} LIFT Cashback {isEs ? 'Acreditado' : 'Credited'}
                          </span>
                        </span>
                      </div>
                      {activeTrade.releaseExplorerUrl && (
                        <a
                          href={activeTrade.releaseExplorerUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 font-mono text-[11px] text-ink underline"
                        >
                          <span>TX: {activeTrade.releaseTxHash?.slice(0, 18)}...</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>

                    {/* STAR RATING & VERIFIED REVIEW CARD */}
                    <div className="rounded-2xl bg-canvas p-4 space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-ink flex items-center gap-1.5">
                          <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                          <span>
                            {isEs
                              ? 'Calificar Contraparte con Estrellas (Reseña Verificada On-Chain)'
                              : 'Rate Counterparty with Stars (Verified On-Chain Review)'}
                          </span>
                        </span>
                      </div>

                      {((isBuyerInActiveTrade && activeTrade.buyerReview) ||
                        (isSellerInActiveTrade && activeTrade.sellerReview)) ? (
                        <div className="rounded-xl bg-surface p-3 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              {isEs ? '✅ Tu reseña verificada fue publicada' : '✅ Your verified review was published'}
                            </span>
                            <div className="flex items-center gap-0.5 text-amber-500">
                              {Array.from({ length: 5 }).map((_, i) => {
                                const myRev = isBuyerInActiveTrade ? activeTrade.buyerReview : activeTrade.sellerReview;
                                return (
                                  <Star
                                    key={i}
                                    className={`w-3.5 h-3.5 ${
                                      i < (myRev?.rating || 5) ? 'fill-amber-500 text-amber-500' : 'text-ink-3'
                                    }`}
                                  />
                                );
                              })}
                            </div>
                          </div>
                          <p className="text-[11px] text-ink-2">
                            "{(isBuyerInActiveTrade ? activeTrade.buyerReview : activeTrade.sellerReview)?.comment}"
                          </p>
                        </div>
                      ) : (isBuyerInActiveTrade || isSellerInActiveTrade) ? (
                        <form onSubmit={handleSubmitReview} className="space-y-3">
                          <div className="flex items-center justify-between bg-surface rounded-xl px-3.5 py-2.5">
                            <span className="text-[11px] text-ink-2">
                              {isEs ? 'Selecciona tu calificación:' : 'Select your star rating:'}
                            </span>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map(star => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => setReviewRating(star)}
                                  className="p-1 cursor-pointer transition-transform hover:scale-110"
                                >
                                  <Star
                                    className={`w-5 h-5 ${
                                      star <= reviewRating
                                        ? 'fill-amber-500 text-amber-500'
                                        : 'text-ink-3'
                                    }`}
                                  />
                                </button>
                              ))}
                              <span className="ml-1.5 font-semibold text-amber-600 dark:text-amber-400">
                                {reviewRating}.0 ★
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {[
                              isEs ? 'Pago rápido' : 'Fast payment',
                              isEs ? 'Titular verificado' : 'Verified holder',
                              isEs ? 'Excelente comerciante' : 'Great merchant',
                              isEs ? '100% Recomendado' : '100% Recommended'
                            ].map(tag => {
                              const active = reviewTags.includes(tag);
                              return (
                                <button
                                  key={tag}
                                  type="button"
                                  onClick={() =>
                                    setReviewTags(prev =>
                                      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                                    )
                                  }
                                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium cursor-pointer transition ${
                                    active
                                      ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 font-semibold'
                                      : 'bg-surface text-ink-3 hover:text-ink'
                                  }`}
                                >
                                  {active ? `★ ${tag}` : tag}
                                </button>
                              );
                            })}
                          </div>

                          <input
                            type="text"
                            value={reviewComment}
                            onChange={e => setReviewComment(e.target.value)}
                            placeholder={
                              isEs
                                ? 'Deja un comentario sobre tu experiencia con este comerciante...'
                                : 'Leave a comment about your experience with this merchant...'
                            }
                            className="w-full px-3.5 py-2.5 rounded-xl bg-surface text-ink outline-none"
                          />

                          <button
                            type="submit"
                            disabled={submittingReview}
                            className="w-full py-2.5 rounded-full bg-ink text-surface font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer"
                          >
                            {submittingReview
                              ? isEs
                                ? 'Publicando reseña...'
                                : 'Publishing review...'
                              : isEs
                              ? `Publicar Calificación (${reviewRating} ★) y Reseña`
                              : `Publish Rating (${reviewRating} ★) & Review`}
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                )}

                {/* Secondary Cancel / Dispute */}
                {!['COMPLETED', 'CANCELLED'].includes(activeTrade.status) && (
                  <div className="flex items-center justify-between gap-2 pt-1 text-xs">
                    <button
                      type="button"
                      disabled={actionBusy !== null}
                      onClick={handleCancelOrRefund}
                      className="px-3.5 py-2 rounded-full bg-canvas text-ink-2 hover:text-ink font-medium cursor-pointer"
                    >
                      {activeTrade.status === 'AWAITING_ESCROW'
                        ? isEs
                          ? 'Cancelar Orden'
                          : 'Cancel Trade'
                        : isEs
                        ? 'Cancelar y Reembolsar On-Chain'
                        : 'Cancel & Refund On-Chain'}
                    </button>
                    {['ESCROW_FUNDED', 'FIAT_SENT'].includes(activeTrade.status) && (
                      <button
                        type="button"
                        disabled={actionBusy !== null}
                        onClick={handleOpenDispute}
                        className="inline-flex items-center gap-1 px-3.5 py-2 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-medium cursor-pointer"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>{isEs ? 'Abrir Disputa' : 'Dispute'}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* RIGHT: Peer Trade Chat */}
              <div className="md:col-span-5 rounded-2xl bg-canvas p-3.5 flex flex-col h-[380px]">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-ink pb-2 border-b border-line/50">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{isEs ? 'Chat de la Orden' : 'Trade Room Chat'}</span>
                </div>
                <div className="flex-1 overflow-y-auto py-2.5 space-y-2 pr-1">
                  {activeTrade.messages.map(m => (
                    <div
                      key={m.id}
                      className={`rounded-xl px-3 py-2 text-[11px] leading-relaxed ${
                        m.sender === 'SYSTEM'
                          ? 'bg-surface/70 text-ink-3 text-center'
                          : m.sender === 'SELLER'
                          ? 'bg-surface text-ink'
                          : 'bg-ink text-surface'
                      }`}
                    >
                      {m.sender !== 'SYSTEM' && (
                        <div className="text-[9px] uppercase tracking-wider opacity-70 mb-0.5 font-semibold">
                          {m.sender === 'SELLER' ? (isEs ? 'Vendedor' : 'Seller') : isEs ? 'Comprador' : 'Buyer'}
                        </div>
                      )}
                      <div>{m.text}</div>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleSendChat} className="flex gap-1.5 pt-2 border-t border-line/50">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    placeholder={isEs ? 'Escribe mensaje a tu contraparte...' : 'Message your counterparty...'}
                    className="flex-1 min-w-0 px-3 py-2 rounded-full bg-surface text-xs text-ink outline-none"
                  />
                  <button
                    type="submit"
                    className="p-2 rounded-full bg-ink text-surface cursor-pointer shrink-0"
                    aria-label="Send message"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: MERCHANT VERIFIED REVIEWS & REPUTATION */}
      {reviewsModalOffer && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="ui-card w-full max-w-lg p-5 sm:p-6 max-h-[88vh] overflow-y-auto space-y-4">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-line">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-control bg-surface-2 border border-line flex items-center justify-center text-sm font-bold text-ink shrink-0">
                  {(reviewsModalOffer.merchantHandle || reviewsModalOffer.merchantAddress)
                    .replace(/^@/, '')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="ui-section-title">
                      {reviewsModalOffer.merchantHandle || formatAddress(reviewsModalOffer.merchantAddress)}
                    </h3>
                    <Fingerprint className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="text-[11px] text-ink-3 font-mono">
                    {formatAddress(reviewsModalOffer.merchantAddress)}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReviewsModalOffer(null)}
                className="p-1.5 rounded-control bg-surface-2 border border-line text-ink-3 hover:text-ink cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Reputation Summary Bento */}
            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="rounded-2xl bg-canvas p-3">
                <div className="flex items-center justify-center gap-1 text-base font-semibold text-amber-500">
                  <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                  <span>{(reviewsModalOffer.reputation.avgRating ?? 5.0).toFixed(1)}</span>
                </div>
                <div className="text-[10px] text-ink-3 mt-0.5">
                  {reviewsModalOffer.reputation.reviewCount ?? 0} {isEs ? 'reseñas' : 'reviews'}
                </div>
              </div>
              <div className="rounded-2xl bg-canvas p-3">
                <div className="text-base font-semibold text-emerald-600 dark:text-emerald-400">
                  {reviewsModalOffer.reputation.completionRate}%
                </div>
                <div className="text-[10px] text-ink-3 mt-0.5">
                  {reviewsModalOffer.reputation.completedTrades} {isEs ? 'completadas' : 'completed'}
                </div>
              </div>
              <div className="rounded-2xl bg-canvas p-3">
                <div className="text-base font-semibold text-ink tabular-nums">
                  +{reviewsModalOffer.reputation.liftCashbackEarned ?? 0} LIFT
                </div>
                <div className="text-[10px] text-ink-3 mt-0.5">
                  {isEs ? 'Cashback ganado' : 'Cashback earned'}
                </div>
              </div>
            </div>

            {/* Verified Review List */}
            <div className="space-y-2.5">
              <div className="text-xs font-semibold text-ink">
                {isEs ? 'Reseñas Verificadas On-Chain (P2SH32)' : 'Verified On-Chain Reviews (P2SH32)'}
              </div>

              {!reviewsModalOffer.reputation.recentReviews ||
              reviewsModalOffer.reputation.recentReviews.length === 0 ? (
                <div className="rounded-2xl bg-canvas p-6 text-center space-y-1.5">
                  <div className="flex justify-center gap-1 text-amber-500">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <Star key={idx} className="w-4 h-4 fill-amber-500 text-amber-500" />
                    ))}
                  </div>
                  <div className="text-xs font-semibold text-ink">
                    {isEs ? 'Comerciante 5.0 ★ sin disputas' : '5.0 ★ Merchant with 0 disputes'}
                  </div>
                  <p className="text-[11px] text-ink-3">
                    {isEs
                      ? 'Las reseñas de este comerciante aparecerán aquí conforme liquide órdenes P2P en BinaryLiquidP2PEscrow.cash.'
                      : 'Reviews for this merchant will appear here as they settle P2P trades on BinaryLiquidP2PEscrow.cash.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {reviewsModalOffer.reputation.recentReviews.map(rev => (
                    <div key={rev.id} className="rounded-2xl bg-canvas p-3.5 space-y-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 font-semibold text-ink">
                          <span>{rev.reviewerHandle}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface text-ink-3">
                            {rev.cryptoAmount} {rev.asset} · {rev.fiat}
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5 text-amber-500">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${
                                i < rev.rating ? 'fill-amber-500 text-amber-500' : 'text-ink-3'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      {Array.isArray(rev.tags) && rev.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {rev.tags.map(t => (
                            <span
                              key={t}
                              className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-medium"
                            >
                              ★ {t}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-ink-2 text-[11px] leading-relaxed">"{rev.comment}"</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
