import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { 
  Wallet, 
  TrendingUp, 
  Clock, 
  Activity, 
  Globe, 
  FileText, 
  LogOut, 
  Zap, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  CheckCircle, 
  Sun, 
  Moon, 
  Flame, 
  Menu, 
  X,
  Sparkles, 
  ArrowRight, 
  ArrowUpRight,
  Copy, 
  Check, 
  Edit3,
  ExternalLink, 
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  BookOpen,
  Droplets,
  Coins,
  Layers,
  Lock,
  Server,
  Cpu,
  Database,
  Code2,
  PieChart,
  Fingerprint,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
const BridgeSwap = lazy(() => import('./components/BridgeSwap'));
import LandingPage from './components/LandingPage';
const PoolsView = lazy(() => import('./components/PoolsView'));
const SdkView = lazy(() => import('./components/SdkView'));
const LendingView = lazy(() => import('./components/LendingView'));
const DocsView = lazy(() => import('./components/DocsView'));
const WhitepaperView = lazy(() => import('./components/WhitepaperView'));
const PerpsView = lazy(() => import('./components/PerpsView'));
const PortfolioView = lazy(() => import('./components/PortfolioView'));
const IdentityView = lazy(() => import('./components/IdentityView'));
const P2PView = lazy(() => import('./components/P2PView'));

// Intelligent Lazy-Preloader map
const preloadMap: Record<string, () => Promise<any>> = {
  bridge: () => import('./components/BridgeSwap'),
  p2p: () => import('./components/P2PView'),
  pools: () => import('./components/PoolsView'),
  lend: () => import('./components/LendingView'),
  perps: () => import('./components/PerpsView'),
  portfolio: () => import('./components/PortfolioView'),
  identity: () => import('./components/IdentityView'),
  docs: () => import('./components/DocsView'),
  whitepaper: () => import('./components/WhitepaperView'),
  sdk: () => import('./components/SdkView'),
};

const preloadView = (view: string) => {
  try {
    preloadMap[view]?.();
  } catch {}
};

class ViewErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; errorMsg: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorMsg: String(error?.message || 'Error cargando módulo') };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[45vh] p-6 text-center space-y-3">
          <p className="text-sm font-medium text-ink">{this.state.errorMsg}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="ui-btn-sm ui-btn-secondary"
          >
            Recargar vista
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
import { useWizardConnect, AlphanumericQRCode } from '@wizardconnect/react';
import {
  deriveCashAddressFromXpub,
  pubkeyToCashAddress,
  convertCashAddressNetwork,
  isValidCashAddress,
  formatAddress,
  formatCryptoBalance
} from './utils/bchAddress';

const isValidEvmWalletAddress = (addr?: string | null): boolean =>
  Boolean(addr && /^0x[a-fA-F0-9]{40}$/.test(addr.trim()));

const isValidSolanaWalletAddress = (addr?: string | null): boolean =>
  Boolean(addr && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr.trim()) && !isValidCashAddress(addr));

const isValidTonWalletAddress = (addr?: string | null, requireTestnet?: boolean): boolean => {
  if (!addr || typeof addr !== 'string') return false;
  const clean = addr.trim();
  if (/^(-1|0):[0-9a-fA-F]{64}$/.test(clean)) return true;
  if (!/^[A-Za-z0-9+/_-]{48}$/.test(clean)) return false;
  const isMainPrefix = clean.startsWith('EQ') || clean.startsWith('UQ');
  const isTestPrefix = clean.startsWith('kQ') || clean.startsWith('0Q');
  if (!isMainPrefix && !isTestPrefix) return false;
  if (requireTestnet === true) return isTestPrefix;
  if (requireTestnet === false) return isMainPrefix;
  return true;
};

const isValidLtcWalletAddress = (addr?: string | null, requireTestnet?: boolean): boolean => {
  if (!addr || typeof addr !== 'string') return false;
  const clean = addr.trim();
  const isMain =
    /^ltc1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{38,87}$/i.test(clean) ||
    /^[LM3][1-9A-HJ-NP-Za-km-z]{25,34}$/.test(clean);
  const isTest =
    /^tltc1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{38,87}$/i.test(clean) ||
    /^[mn2Q][1-9A-HJ-NP-Za-km-z]{25,34}$/.test(clean);
  if (requireTestnet === true) return isTest;
  if (requireTestnet === false) return isMain;
  return isMain || isTest;
};
import {
  connectWalletConnect,
  disconnectWalletConnect,
  disconnectInjectedEvmWallet,
  connectInjectedWallet,
  restoreEvmWalletConnectSession,
  trySilentReconnectInjectedEvm,
  switchEvmNetwork,
  initEip6963Discovery,
  DiscoveredEip6963Wallet,
  disconnectBchWalletConnect,
  connectPaytacaExtension,
  hasPaytacaExtension,
  isMobileBrowser,
  signEvmAuthMessage,
  signSolanaAuthMessage,
  signBchMessage,
  hasActiveBchMessageSigningCapability,
  hasActiveEvmSigningCapability,
  EnsureAuthSessionOptions
} from './services/walletConnectService';
import {
  connectBlConnectPopup,
  disconnectBlConnect,
  restoreBlConnectSession,
  startBlConnectNostrPairing,
  type BlConnectSession
} from './services/blConnectService';
import {
  subscribeTonConnect,
  openTonConnectModal,
  disconnectTonConnect
} from './services/tonConnectService';

const translations = {
  en: {
    navSwap: "Bridge Swap",
    navP2p: "P2P",
    navPerps: "Perps",
    navGateway: "Gateway",
    navPools: "Pools",
    navLend: "Lend",
    navPortfolio: "Portfolio",
    navIdentity: "Identity",
    navDocs: "Docs",
    navWallet: "Connect Wallet",
    connect: "Connect Wallet",
    openWallet: "Connecting...",
    disconnect: "Disconnect",
    modalConnectTitle: "Connect Wallet",
    modalConnectSubtitle: "Choose a network and wallet to connect",
    tabBch: "Bitcoin Cash",
    tabEvm: "EVM (Polygon & BSC)",
    tabSolana: "Solana",
    tabTon: "TON",
    tabLtc: "Litecoin",
    detected: "Detected",
    extension: "Extension",
    mobileQr: "Mobile / QR",
    connected: "Connected",
    notConnected: "Not connected",
    needWallet: "Need a Bitcoin Cash wallet?",
    getPaytaca: "Get Paytaca",
    getCashonize: "Get Cashonize",
    accountTitle: "Connected Wallets",
    accountSubtitle: "100% Non-Custodial",
    copyAddr: "Copy Address",
    disconnectBch: "Disconnect BCH",
    disconnectEvm: "Disconnect EVM",
    disconnectSolana: "Disconnect Solana",
    disconnectTon: "Disconnect TON",
    disconnectLtc: "Disconnect Litecoin",
    disconnectAll: "Disconnect All Wallets",
    connectBchPrompt: "+ Connect Bitcoin Cash Wallet",
    connectEvmPrompt: "+ Connect EVM Wallet",
    connectSolanaPrompt: "+ Connect Solana Wallet",
    connectTonPrompt: "+ Connect TON Wallet",
    connectLtcPrompt: "+ Connect Litecoin",
    liveBalances: "Live On-Chain Balances",
    refresh: "Refresh",
    refreshing: "Refreshing...",
    switchNetworkPrompt: "⚡ Switch wallet network to",
    switchingNetwork: "Switching network in wallet...",
    editAddress: "Edit Address",
    saveAddress: "Save",
    cancelEdit: "Cancel",
    enterCashAddress: "Enter CashAddress (bchtest:... or bitcoincash:...)",
    manualAddressTitle: "Manual CashAddress",
    manualAddressSubtitle: "Paste your Paytaca or Cashonize address directly",
    manualAddressPrompt: "Enter your Bitcoin Cash CashAddress:",
    orManualAddress: "or paste manual address",
    connectBchNotice: "Connect BCH",
    connectEvmNotice: "Connect EVM",
    connectSolanaNotice: "Connect Solana",
    connectTonNotice: "Connect TON",
    connectLtcNotice: "Connect LTC",
    portfolioValue: "Total Portfolio Value",
    viewOnExplorer: "View on Explorer",
    tabWallets: "Connected Wallets",
    tabBalances: "Multi-Chain Assets",
    addressUpdated: "Bitcoin Cash address updated",
    invalidAddress: "Invalid CashAddress"
  },
  es: {
    navSwap: "Bridge Swap",
    navP2p: "P2P",
    navPerps: "Perps",
    navGateway: "Gateway",
    navPools: "Pools",
    navLend: "Lend",
    navPortfolio: "Portafolio",
    navIdentity: "Identidad",
    navDocs: "Docs",
    navWallet: "Conectar Billetera",
    connect: "Conectar Billetera",
    openWallet: "Conectando...",
    disconnect: "Desconectar",
    modalConnectTitle: "Conectar Billetera",
    modalConnectSubtitle: "Elige una red y billetera para conectar",
    tabBch: "Bitcoin Cash",
    tabEvm: "EVM (Polygon & BSC)",
    tabSolana: "Solana",
    tabTon: "TON",
    tabLtc: "Litecoin",
    detected: "Detectada",
    extension: "Extensión",
    mobileQr: "Móvil / QR",
    connected: "Conectado",
    notConnected: "No conectado",
    needWallet: "¿Necesitas billetera Bitcoin Cash?",
    getPaytaca: "Descargar Paytaca",
    getCashonize: "Abrir Cashonize",
    accountTitle: "Billeteras Conectadas",
    accountSubtitle: "100% No-Custodio",
    copyAddr: "Copiar Dirección",
    disconnectBch: "Desconectar BCH",
    disconnectEvm: "Desconectar EVM",
    disconnectSolana: "Desconectar Solana",
    disconnectTon: "Desconectar TON",
    disconnectLtc: "Desconectar Litecoin",
    disconnectAll: "Desconectar Todas las Billeteras",
    connectBchPrompt: "+ Conectar Billetera Bitcoin Cash",
    connectEvmPrompt: "+ Conectar Billetera EVM",
    connectSolanaPrompt: "+ Conectar Billetera Solana",
    connectTonPrompt: "+ Conectar Billetera TON",
    connectLtcPrompt: "+ Conectar Litecoin",
    liveBalances: "Saldos On-Chain en Vivo",
    refresh: "Refrescar",
    refreshing: "Actualizando...",
    switchNetworkPrompt: "⚡ Cambiar red de la billetera a",
    switchingNetwork: "Cambiando red en billetera...",
    editAddress: "Editar Dirección",
    saveAddress: "Guardar",
    cancelEdit: "Cancelar",
    enterCashAddress: "Ingresa tu CashAddress (bchtest:... o bitcoincash:...)",
    manualAddressTitle: "Dirección Manual (Pega tu CashAddress)",
    manualAddressSubtitle: "Pega tu dirección de Paytaca o Cashonize directamente",
    manualAddressPrompt: "Ingresa tu CashAddress de Bitcoin Cash:",
    orManualAddress: "o ingresar dirección manual",
    connectBchNotice: "Conecta BCH",
    connectEvmNotice: "Conecta EVM",
    connectSolanaNotice: "Conecta Solana",
    connectTonNotice: "Conecta TON",
    connectLtcNotice: "Conecta LTC",
    portfolioValue: "Valor Total del Portafolio",
    viewOnExplorer: "Ver en Explorador",
    tabWallets: "Billeteras Conectadas",
    tabBalances: "Activos Multicadena",
    addressUpdated: "Dirección de Bitcoin Cash actualizada",
    invalidAddress: "CashAddress no válida"
  }
};

const PLATFORM_NETWORKS = {
  mainnet: {
    id: 'mainnet',
    name: 'Mainnet (Principal)',
    label: 'Bitcoin Cash Mainnet',
    bchChain: 'Bitcoin Cash (Mainnet)',
    evmChain: 'Polygon PoS (Mainnet)',
    badge: 'Producción',
    isMainnet: true,
    explorerBch: 'https://3xpl.com/bitcoin-cash',
    explorerEvm: 'https://polygonscan.com'
  },
  testnet: {
    id: 'testnet',
    name: 'Testnet (Chipnet)',
    label: 'BCH Chipnet',
    bchChain: 'BCH Chipnet (Testnet4)',
    evmChain: 'Polygon Amoy (Testnet)',
    badge: 'Entorno de Pruebas',
    isMainnet: false,
    explorerBch: 'https://chipnet.chaingraph.cash',
    explorerEvm: 'https://amoy.polygonscan.com'
  }
};

const VALID_VIEWS = ['bridge', 'p2p', 'perps', 'pools', 'lend', 'portfolio', 'identity', 'docs', 'sdk', 'whitepaper'] as const;
type MainView = typeof VALID_VIEWS[number] | 'gateway';

const SITE_ORIGIN = 'https://bliquid.xyz';

const ROUTE_SEO_META: Record<MainView, { en: { title: string; description: string }; es: { title: string; description: string } }> = {
  gateway: {
    en: {
      title: 'BinaryLiquid (Binary Liquid) | Bitcoin Cash Cross-Chain Liquidity Gateway',
      description: 'Binary Liquid (BinaryLiquid) is the non-custodial Bitcoin Cash DeFi gateway: cross-chain swaps, CashTokens AMM pools, perpetuals, lending, and CashIdentity.'
    },
    es: {
      title: 'BinaryLiquid (Binary Liquid) | Pasarela de Liquidez Cross-Chain en Bitcoin Cash',
      description: 'Binary Liquid (BinaryLiquid) es la pasarela DeFi sin custodia en Bitcoin Cash: swaps cross-chain, pools AMM CashTokens, perpetuos, préstamos y CashIdentity.'
    }
  },
  bridge: {
    en: {
      title: 'Cross-Chain Swap & Bridge | BinaryLiquid (Binary Liquid)',
      description: 'Swap cross-chain between Bitcoin Cash CashTokens, EVM networks, and Solana via Binary Liquid (BinaryLiquid) with live settlement proofs.'
    },
    es: {
      title: 'Swap y Puente Cross-Chain | BinaryLiquid (Binary Liquid)',
      description: 'Intercambia liquidez cross-chain entre CashTokens de Bitcoin Cash, redes EVM y Solana en Binary Liquid (BinaryLiquid).'
    }
  },
  p2p: {
    en: {
      title: 'Non-Custodial P2P CashScript Escrow | BinaryLiquid (Binary Liquid)',
      description: 'Buy and sell Bitcoin Cash and CashTokens (PUSD, LIFT) peer-to-peer against fiat using isolated P2SH32 CashScript Escrow covenants and Nostr @usernames.'
    },
    es: {
      title: 'Mercado P2P No-Custodio CashScript | BinaryLiquid (Binary Liquid)',
      description: 'Compra y vende Bitcoin Cash y CashTokens (PUSD, LIFT) contra moneda fiat con Escrow P2SH32 CashScript e identidad @usuario Nostr.'
    }
  },
  pools: {
    en: {
      title: 'CashTokens AMM Liquidity Pools | BinaryLiquid (Binary Liquid)',
      description: 'Provide liquidity, earn swap fees, and explore CashTokens AMM pools with BCMR metadata on Binary Liquid (BinaryLiquid).'
    },
    es: {
      title: 'Pools de Liquidez AMM CashTokens | BinaryLiquid (Binary Liquid)',
      description: 'Aporta liquidez y explora pools AMM CashTokens con metadatos BCMR en tiempo real en Binary Liquid (BinaryLiquid).'
    }
  },
  perps: {
    en: {
      title: 'Decentralized Perpetuals | BinaryLiquid (Binary Liquid)',
      description: 'Trade non-custodial perpetual futures powered by Binary Liquid (BinaryLiquid) on Bitcoin Cash.'
    },
    es: {
      title: 'Futuros Perpetuos Descentralizados | BinaryLiquid (Binary Liquid)',
      description: 'Opera futuros perpetuos sin custodia en Bitcoin Cash con Binary Liquid (BinaryLiquid).'
    }
  },
  lend: {
    en: {
      title: 'Lending & Borrowing Markets | BinaryLiquid (Binary Liquid)',
      description: 'Supply collateral, borrow stablecoins, and monitor health factors on Binary Liquid (BinaryLiquid) CashTokens markets.'
    },
    es: {
      title: 'Mercados de Préstamos y Colateral | BinaryLiquid (Binary Liquid)',
      description: 'Suministra colateral y solicita préstamos en mercados CashTokens con Binary Liquid (BinaryLiquid).'
    }
  },
  portfolio: {
    en: {
      title: 'Multi-Chain Portfolio Tracker | BinaryLiquid (Binary Liquid)',
      description: 'Track balances across Bitcoin Cash, EVM, Solana, TON, and Litecoin in one unified Binary Liquid (BinaryLiquid) portfolio view.'
    },
    es: {
      title: 'Portafolio Multicadena | BinaryLiquid (Binary Liquid)',
      description: 'Consulta balances en Bitcoin Cash, EVM, Solana, TON y Litecoin desde un solo panel en Binary Liquid (BinaryLiquid).'
    }
  },
  identity: {
    en: {
      title: 'CashIdentity & UserLink | BinaryLiquid (Binary Liquid)',
      description: 'Claim human-readable .bch identity handles and link multi-chain addresses with CashIdentity on Binary Liquid (BinaryLiquid).'
    },
    es: {
      title: 'CashIdentity y UserLink | BinaryLiquid (Binary Liquid)',
      description: 'Registra tu identidad .bch y vincula direcciones multicadena con CashIdentity en Binary Liquid (BinaryLiquid).'
    }
  },
  docs: {
    en: {
      title: 'Protocol Documentation | BinaryLiquid (Binary Liquid)',
      description: 'Technical documentation, CashScript covenants, Watchman relayer architecture, and integration guides for Binary Liquid (BinaryLiquid).'
    },
    es: {
      title: 'Documentación del Protocolo | BinaryLiquid (Binary Liquid)',
      description: 'Documentación técnica, contratos CashScript, arquitectura Watchman y guías para Binary Liquid (BinaryLiquid).'
    }
  },
  whitepaper: {
    en: {
      title: 'Whitepaper | BinaryLiquid (Binary Liquid)',
      description: 'Read the Binary Liquid (BinaryLiquid) architectural whitepaper covering non-custodial CashTokens liquidity and cross-chain proofs.'
    },
    es: {
      title: 'Whitepaper | BinaryLiquid (Binary Liquid)',
      description: 'Lee el whitepaper técnico de Binary Liquid (BinaryLiquid) sobre liquidez CashTokens y pruebas cross-chain.'
    }
  },
  sdk: {
    en: {
      title: 'Developer SDK | BinaryLiquid (Binary Liquid)',
      description: 'Integrate cross-chain Bitcoin Cash liquidity quotes and CashIdentity resolution using the Binary Liquid (BinaryLiquid) SDK.'
    },
    es: {
      title: 'SDK para Desarrolladores | BinaryLiquid (Binary Liquid)',
      description: 'Integra cotizaciones cross-chain de Bitcoin Cash y CashIdentity con el SDK de Binary Liquid (BinaryLiquid).'
    }
  }
};

function syncSeoHeadTags(mainView: MainView, lang: 'en' | 'es') {
  const path = mainView === 'gateway' ? '/' : `/${mainView}`;
  const canonicalUrl = `${SITE_ORIGIN}${path}`;
  const seo = ROUTE_SEO_META[mainView][lang];

  document.documentElement.lang = lang;
  document.title = seo.title;

  const metaUpdates: Array<[string, string]> = [
    ['meta[name="description"]', seo.description],
    ['meta[property="og:title"]', seo.title],
    ['meta[property="og:description"]', seo.description],
    ['meta[property="og:url"]', canonicalUrl],
    ['meta[name="twitter:title"]', seo.title],
    ['meta[name="twitter:description"]', seo.description]
  ];
  for (const [selector, content] of metaUpdates) {
    const el = document.querySelector<HTMLMetaElement>(selector);
    if (el) el.setAttribute('content', content);
  }

  const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (canonical) canonical.setAttribute('href', canonicalUrl);
}

function getViewFromUrl(): MainView {
  if (typeof window === 'undefined') return 'gateway';
  
  // 1. Clean path routing: e.g. /perps, /swap, /bridge, /pools, /lend, /identity, /id, /docs, /whitepaper, /sdk
  const pathPart = window.location.pathname.replace(/^\/+/, '').split('/')[0].toLowerCase();
  const normalizedPath = pathPart === 'swap' ? 'bridge' : (pathPart === 'id' ? 'identity' : pathPart);
  if ((VALID_VIEWS as readonly string[]).includes(normalizedPath)) {
    return normalizedPath as MainView;
  }

  // 2. Fallback to hash for legacy bookmarks (e.g. /#perps -> cleaned automatically)
  const hashPart = window.location.hash.replace('#', '').split('/')[0].split('?')[0].toLowerCase();
  const normalizedHash = hashPart === 'swap' ? 'bridge' : (hashPart === 'id' ? 'identity' : hashPart);
  if ((VALID_VIEWS as readonly string[]).includes(normalizedHash)) {
    return normalizedHash as MainView;
  }

  return 'gateway';
}

export default function App() {
  const [mainView, setMainView] = useState<MainView>(() => getViewFromUrl());
  const isEmbed = typeof window !== 'undefined' && (
    window.location.pathname === '/embed' || 
    window.location.search.includes('embed=true')
  );
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && isEmbed) {
      const urlTheme = new URLSearchParams(window.location.search).get('theme');
      if (urlTheme === 'dark') return true;
      if (urlTheme === 'light') return false;
    }
    return localStorage.getItem('bliq_theme') === 'dark' || 
      (!localStorage.getItem('bliq_theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [brandMenuOpen, setBrandMenuOpen] = useState(false);
  const brandMenuRef = useRef<HTMLDivElement | null>(null);
  const brandHoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'} | null>(null);
  const [lang, setLang] = useState<'en' | 'es'>(() => {
    if (typeof window !== 'undefined') {
      const urlLang = new URLSearchParams(window.location.search).get('lang');
      if (urlLang === 'es' || urlLang === 'en') return urlLang;
      const saved = localStorage.getItem('bliq_lang');
      if (saved === 'es' || saved === 'en') return saved;
    }
    return 'en';
  });
  const [isScrolled, setIsScrolled] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [platformNetwork, setPlatformNetwork] = useState<'mainnet' | 'testnet'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bliq_network');
      if (saved === 'mainnet' || saved === 'testnet') return saved;
    }
    return 'testnet';
  });

  const isFirstNetworkMount = useRef(true);
  useEffect(() => {
    if (isFirstNetworkMount.current) {
      isFirstNetworkMount.current = false;
      return;
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('bliq_network', platformNetwork);
    }
  }, [platformNetwork]);

  // Clean HTML5 History URL synchronization (No '#' hashes in URL!)
  useEffect(() => {
    if (typeof window === 'undefined' || isEmbed) return;
    const nextPath = mainView === 'gateway' ? '/' : `/${mainView}`;
    
    // Only update history if there is an actual legacy hash or the path changed
    if (window.location.hash) {
      window.history.replaceState(null, '', nextPath);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (window.location.pathname !== nextPath) {
      window.history.pushState(null, '', nextPath);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [mainView, isEmbed]);

  // Dynamic per-route & per-language SEO head synchronization
  useEffect(() => {
    if (typeof window === 'undefined' || isEmbed) return;
    syncSeoHeadTags(mainView, lang);
  }, [mainView, lang, isEmbed]);

  // Handle browser Back / Forward buttons seamlessly
  useEffect(() => {
    if (typeof window === 'undefined' || isEmbed) return;
    const handlePopState = () => {
      setMainView(getViewFromUrl());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isEmbed]);

  // Close brand dropdown on outside click or Escape key
  useEffect(() => {
    if (!brandMenuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (brandMenuRef.current && !brandMenuRef.current.contains(e.target as Node)) {
        setBrandMenuOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setBrandMenuOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [brandMenuOpen]);

  // Dynamic navbar scroll listener
  const isFirstLangMount = useRef(true);
  useEffect(() => {
    if (isFirstLangMount.current) {
      isFirstLangMount.current = false;
      return;
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('bliq_lang', lang);
    }
  }, [lang]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Idle Preload: Silently fetch core modules while user views LandingPage
  useEffect(() => {
    const timer = setTimeout(() => {
      preloadView('bridge');
      preloadView('pools');
      preloadView('docs');
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  // Dark mode effect
  const isFirstThemeMount = useRef(true);
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.backgroundColor = '#080B11';
      document.body.style.backgroundColor = '#080B11';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.backgroundColor = '#F2F3F0';
      document.body.style.backgroundColor = '#F2F3F0';
    }
    if (isFirstThemeMount.current) {
      isFirstThemeMount.current = false;
      return;
    }
    localStorage.setItem('bliq_theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const [userContext, setUserContext] = useState<any>(() => {
    const saved = localStorage.getItem('bliq_user');
    if (!saved) return null;
    try {
      const parsed = JSON.parse(saved);
      let dirty = false;
      const isTest = platformNetwork === 'testnet';
      if (parsed?.address && (parsed.address.startsWith('xpub') || parsed.address.startsWith('tpub'))) {
        parsed.address = deriveCashAddressFromXpub(parsed.address, isTest, true);
        dirty = true;
      }
      if (parsed?.bchAddress && !isValidCashAddress(parsed.bchAddress)) {
        parsed.bchAddress = null;
        dirty = true;
      }
      if (parsed?.evmAddress && !isValidEvmWalletAddress(parsed.evmAddress)) {
        parsed.evmAddress = null;
        dirty = true;
      }
      if (parsed?.solanaAddress && !isValidSolanaWalletAddress(parsed.solanaAddress)) {
        parsed.solanaAddress = null;
        dirty = true;
      }
      if (dirty) {
        parsed.address =
          parsed.bchAddress ||
          parsed.evmAddress ||
          parsed.solanaAddress ||
          parsed.tonAddress ||
          parsed.ltcAddress ||
          (isValidCashAddress(parsed.address) ? parsed.address : '');
        if (!parsed.address) {
          localStorage.removeItem('bliq_user');
          return null;
        }
        localStorage.setItem('bliq_user', JSON.stringify(parsed));
      }
      return parsed;
    } catch {
      return null;
    }
  });

  const [bchWallet, setBchWallet] = useState<{
    address: string;
    tokenAddress: string;
    provider: string;
    source: 'blconnect' | 'wizard' | 'wc2-bch' | 'extension' | 'manual';
    queryAddress?: string;
  } | null>(() => {
    const isTest = platformNetwork === 'testnet';
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const queryBch = params.get('bch');
        if (queryBch) {
          const base = convertCashAddressNetwork(queryBch, isTest, false);
          const token = convertCashAddressNetwork(queryBch, isTest, true);
          const primaryBase = base.split(',')[0].trim();
          const primaryToken = token.split(',')[0].trim();
          if (isValidCashAddress(primaryBase)) {
            return {
              address: primaryBase,
              tokenAddress: primaryToken,
              provider: 'Paytaca / Manual',
              source: 'manual',
              queryAddress: base
            };
          }
        }
      }
      const inferBchSource = (
        provider?: string,
        rawSource?: 'blconnect' | 'wizard' | 'wc2-bch' | 'extension' | 'manual'
      ): 'blconnect' | 'wizard' | 'wc2-bch' | 'extension' | 'manual' => {
        const prov = String(provider || '').toLowerCase();
        if (rawSource === 'manual' || prov.includes('manual')) return 'manual';
        if (rawSource === 'blconnect' || prov.includes('blconnect') || prov.includes('binaryliquid')) {
          return 'blconnect';
        }
        if (prov.includes('cashonize') || prov.includes('zapit') || prov.includes('wc2') || prov.includes('walletconnect')) {
          return 'wc2-bch';
        }
        if (rawSource === 'wc2-bch' || rawSource === 'extension' || rawSource === 'wizard') {
          return rawSource;
        }
        if (prov.includes('extension')) return 'extension';
        return 'wizard';
      };

      const raw = localStorage.getItem('bliq_wallets_v2');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && 'bchWallet' in parsed) {
          if (parsed.bchWallet?.address && isValidCashAddress(parsed.bchWallet.address)) {
            return {
              ...parsed.bchWallet,
              source: inferBchSource(parsed.bchWallet.provider, parsed.bchWallet.source),
              address: convertCashAddressNetwork(parsed.bchWallet.address, isTest, false),
              tokenAddress: convertCashAddressNetwork(parsed.bchWallet.tokenAddress || parsed.bchWallet.address, isTest, true)
            };
          }
          return null;
        }
      }
      const legacy = localStorage.getItem('bliq_user');
      if (legacy) {
        const p = JSON.parse(legacy);
        const rawCandidate = p?.bchAddress || p?.address || '';
        const candidate =
          rawCandidate.startsWith('xpub') || rawCandidate.startsWith('tpub')
            ? deriveCashAddressFromXpub(rawCandidate, isTest, false)
            : rawCandidate;
        if (
          candidate &&
          candidate !== p?.solanaAddress &&
          candidate !== p?.tonAddress &&
          candidate !== p?.ltcAddress &&
          isValidCashAddress(candidate)
        ) {
          return {
            address: convertCashAddressNetwork(candidate, isTest, false),
            tokenAddress: convertCashAddressNetwork(candidate, isTest, true),
            provider: p.provider || 'Paytaca',
            source: inferBchSource(p.provider)
          };
        }
      }
    } catch {}
    return null;
  });

  const [evmWallet, setEvmWallet] = useState<{
    address: string;
    chainId: number;
    provider: string;
    source: 'injected' | 'wc2-evm' | 'manual';
    rdns?: string;
  } | null>(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const queryEvm = params.get('evm');
        if (queryEvm && isValidEvmWalletAddress(queryEvm)) {
          return {
            address: queryEvm.trim(),
            chainId: platformNetwork === 'testnet' ? 80002 : 137,
            provider: 'Watch Only (URL)',
            source: 'manual'
          };
        }
      }
      const raw = localStorage.getItem('bliq_wallets_v2');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && 'evmWallet' in parsed) {
          return isValidEvmWalletAddress(parsed.evmWallet?.address) ? parsed.evmWallet : null;
        }
      }
      const legacy = localStorage.getItem('bliq_user');
      if (legacy) {
        const p = JSON.parse(legacy);
        const candidate = p?.evmAddress || (p?.address && p.address.startsWith('0x') ? p.address : '');
        if (isValidEvmWalletAddress(candidate)) {
          return {
            address: candidate.trim(),
            chainId: 80002,
            provider: p.provider || 'MetaMask',
            source: 'injected'
          };
        }
      }
    } catch {}
    return null;
  });

  const [solanaWallet, setSolanaWallet] = useState<{
    address: string;
    provider: string;
    source: 'phantom' | 'solflare' | 'injected';
  } | null>(() => {
    try {
      const raw = localStorage.getItem('bliq_wallets_v2');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && 'solanaWallet' in parsed) {
          return isValidSolanaWalletAddress(parsed.solanaWallet?.address) ? parsed.solanaWallet : null;
        }
      }
      const rawSol = localStorage.getItem('bliq_solana_wallet');
      if (rawSol) {
        const parsed = JSON.parse(rawSol);
        if (isValidSolanaWalletAddress(parsed?.address)) return parsed;
      }
    } catch {}
    return null;
  });

  const [tonWallet, setTonWallet] = useState<{
    address: string;
    provider: string;
    source?: 'tonconnect' | 'extension' | 'manual';
  } | null>(() => {
    try {
      const raw = localStorage.getItem('bliq_wallets_v2');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && 'tonWallet' in parsed) {
          return parsed.tonWallet?.address ? parsed.tonWallet : null;
        }
      }
      const rawTon = localStorage.getItem('bliq_ton_wallet');
      if (rawTon) {
        const parsed = JSON.parse(rawTon);
        if (parsed?.address) return parsed;
      }
    } catch {}
    return null;
  });

  const [ltcWallet, setLtcWallet] = useState<{
    address: string;
    provider: string;
  } | null>(() => {
    try {
      const raw = localStorage.getItem('bliq_wallets_v2');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && 'ltcWallet' in parsed) {
          return parsed.ltcWallet?.address ? parsed.ltcWallet : null;
        }
      }
      const rawLtc = localStorage.getItem('bliq_ltc_wallet');
      if (rawLtc) {
        const parsed = JSON.parse(rawLtc);
        if (parsed?.address) return parsed;
      }
    } catch {}
    return null;
  });

  const [discoveredEvmWallets, setDiscoveredEvmWallets] = useState<DiscoveredEip6963Wallet[]>([]);
  const [blConnectModal, setBlConnectModal] = useState<{
    uri: string;
    qrDataUrl: string;
    cancel: () => void;
  } | null>(null);
  const [blConnectPopupBusy, setBlConnectPopupBusy] = useState<boolean>(false);
  const [walletBalances, setWalletBalances] = useState<{
    PUSD: number;
    BCH: number;
    USDT: number;
    USDC: number;
    POL: number;
    SOL?: number;
    USDT_SOL?: number;
    LTC?: number;
    BNB?: number;
    USDT_BSC?: number;
    TON?: number;
    USDT_TON?: number;
    [k: string]: number | undefined;
  }>({ PUSD: 0, BCH: 0, USDT: 0, USDC: 0, POL: 0, SOL: 0, USDT_SOL: 0, LTC: 0, BNB: 0, USDT_BSC: 0, TON: 0, USDT_TON: 0 });
  const [balancesLoading, setBalancesLoading] = useState<boolean>(false);
  const [oraclePrices, setOraclePrices] = useState<Record<string, number>>({});
  const [authToken, setAuthToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem('bliq_auth_token') || null;
    } catch {
      return null;
    }
  });
  const [authAddresses, setAuthAddresses] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('bliq_auth_addrs');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [isSwitchingChain, setIsSwitchingChain] = useState<boolean>(false);

  const [showWalletModal, setShowWalletModal] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('wallet') === 'open' || params.get('modal') === 'wallet';
    }
    return false;
  });
  const [walletModalTab, setWalletModalTab] = useState<'evm' | 'bch' | 'solana' | 'ton' | 'ltc'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('tab') === 'bch') return 'bch';
      if (params.get('tab') === 'solana') return 'solana';
      if (params.get('tab') === 'ton') return 'ton';
      if (params.get('tab') === 'ltc') return 'ltc';
    }
    return 'evm';
  });
  const [showAccountModal, setShowAccountModal] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('modal') === 'account';
    }
    return false;
  });
  const [accountModalTab, setAccountModalTab] = useState<'wallets' | 'balances'>('wallets');
  const [showManualWalletInput, setShowManualWalletInput] = useState<boolean>(false);
  const [selectedWalletType, setSelectedWalletType] = useState<'paytaca' | 'walletconnect' | 'injected' | null>(null);
  const [isEditingBch, setIsEditingBch] = useState<boolean>(false);
  const [customBchInput, setCustomBchInput] = useState<string>('');
  const [isEditingTon, setIsEditingTon] = useState<boolean>(false);
  const [customTonInput, setCustomTonInput] = useState<string>('');
  const [isEditingLtc, setIsEditingLtc] = useState<boolean>(false);
  const [customLtcInput, setCustomLtcInput] = useState<string>('');

  const t = translations[lang];
  const wc = useWizardConnect({ dappName: 'BinaryLiquid Gateway', persistSession: true });
  const connectLockRef = useRef(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectedAtRef = useRef<string>(new Date().toISOString());
  const bchWalletSourceRef = useRef(bchWallet?.source);
  const bchAddressRef = useRef(bchWallet?.address || null);
  const selectedWalletTypeRef = useRef<typeof selectedWalletType>(selectedWalletType);
  const evmAddressRef = useRef(evmWallet?.address || null);
  bchWalletSourceRef.current = bchWallet?.source;
  bchAddressRef.current = bchWallet?.address || null;
  selectedWalletTypeRef.current = selectedWalletType;
  evmAddressRef.current = evmWallet?.address || null;

  const showToast = (message: string, type: 'success'|'error' = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({message, type});
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 3200);
  };

  // Persist multi-chain wallet state & synchronize userContext seamlessly
  const isFirstWalletMount = useRef(true);
  useEffect(() => {
    if (isFirstWalletMount.current) {
      isFirstWalletMount.current = false;
      const hasStaleStorage =
        typeof window !== 'undefined' &&
        Boolean(localStorage.getItem('bliq_wallets_v2') || localStorage.getItem('bliq_user'));
      if (!bchWallet && !evmWallet && !solanaWallet && !tonWallet && !ltcWallet && !hasStaleStorage) {
        return;
      }
    }
    if (bchWallet || evmWallet || solanaWallet || tonWallet || ltcWallet) {
      localStorage.setItem('bliq_wallets_v2', JSON.stringify({ bchWallet, evmWallet, solanaWallet, tonWallet, ltcWallet }));
      if (solanaWallet) {
        localStorage.setItem('bliq_solana_wallet', JSON.stringify(solanaWallet));
      } else {
        localStorage.removeItem('bliq_solana_wallet');
      }
      if (tonWallet) {
        localStorage.setItem('bliq_ton_wallet', JSON.stringify(tonWallet));
      } else {
        localStorage.removeItem('bliq_ton_wallet');
      }
      if (ltcWallet) {
        localStorage.setItem('bliq_ltc_wallet', JSON.stringify(ltcWallet));
      } else {
        localStorage.removeItem('bliq_ltc_wallet');
      }
    } else {
      localStorage.removeItem('bliq_wallets_v2');
      localStorage.removeItem('bliq_solana_wallet');
      localStorage.removeItem('bliq_ton_wallet');
      localStorage.removeItem('bliq_ltc_wallet');
      localStorage.removeItem('bliq_auth_token');
      localStorage.removeItem('bliq_auth_addrs');
      setAuthToken(null);
      setAuthAddresses([]);
    }
    const primaryAddr = bchWallet?.tokenAddress || evmWallet?.address || solanaWallet?.address || tonWallet?.address || ltcWallet?.address || '';
    if (!primaryAddr) {
      setUserContext(null);
      if (typeof window !== 'undefined' && localStorage.getItem('bliq_user')) {
        localStorage.removeItem('bliq_user');
      }
      return;
    }
    const activeProviders = [
      bchWallet?.provider,
      evmWallet?.provider,
      solanaWallet?.provider,
      tonWallet?.provider,
      ltcWallet?.provider
    ].filter(Boolean);

    const nextCtx = {
      address: primaryAddr,
      bchAddress: bchWallet?.tokenAddress || bchWallet?.address || null,
      evmAddress: evmWallet?.address || null,
      solanaAddress: solanaWallet?.address || null,
      tonAddress: tonWallet?.address || null,
      ltcAddress: ltcWallet?.address || null,
      provider: activeProviders.length > 0 ? activeProviders.join(' + ') : 'Web3',
      connectedAt: connectedAtRef.current,
      balances: walletBalances
    };
    setUserContext(nextCtx);
    localStorage.setItem('bliq_user', JSON.stringify(nextCtx));
  }, [bchWallet, evmWallet, solanaWallet, tonWallet, ltcWallet, walletBalances]);

  // Dynamically re-encode BCH CashAddress prefix (`bchtest:` <-> `bitcoincash:`) including multi-HD queryAddress
  useEffect(() => {
    if (!bchWallet?.address) return;
    const isTest = platformNetwork === 'testnet';
    const nextBase = convertCashAddressNetwork(bchWallet.address, isTest, false);
    const nextToken = convertCashAddressNetwork(bchWallet.address, isTest, true);
    const nextQuery = bchWallet.queryAddress
      ? bchWallet.queryAddress
          .split(',')
          .map(addr => addr.trim())
          .filter(Boolean)
          .map(addr => convertCashAddressNetwork(addr, isTest, false) || addr)
          .join(',')
      : undefined;
    if (
      nextBase !== bchWallet.address ||
      nextToken !== bchWallet.tokenAddress ||
      nextQuery !== bchWallet.queryAddress
    ) {
      setBchWallet(prev =>
        prev
          ? {
              ...prev,
              address: nextBase,
              tokenAddress: nextToken,
              ...(nextQuery !== undefined ? { queryAddress: nextQuery } : {})
            }
          : null
      );
    }
  }, [platformNetwork]);

  // Fetch real live on-chain balances for connected BCH + EVM + Solana + TON + LTC wallets
  const refreshWalletBalances = async (
    overrideBch?: string | null,
    overrideEvm?: string | null,
    overrideSol?: string | null,
    overrideTon?: string | null,
    overrideLtc?: string | null
  ) => {
    const targetBch = overrideBch !== undefined ? overrideBch : bchWallet?.queryAddress || bchWallet?.address || null;
    const targetEvm = overrideEvm !== undefined ? overrideEvm : evmWallet?.address || null;
    const targetSol = overrideSol !== undefined ? overrideSol : solanaWallet?.address || null;
    const targetTon = overrideTon !== undefined ? overrideTon : tonWallet?.address || null;
    const targetLtc = overrideLtc !== undefined ? overrideLtc : ltcWallet?.address || null;
    const primary = targetBch || targetEvm || targetSol || targetTon || targetLtc;
    if (!primary) return;

    setBalancesLoading(true);
    try {
      const qs = new URLSearchParams({
        network: platformNetwork,
        ...(targetBch ? { bchAddress: targetBch } : {}),
        ...(targetEvm ? { evmAddress: targetEvm } : {}),
        ...(targetSol ? { solanaAddress: targetSol } : {}),
        ...(targetTon ? { tonAddress: targetTon } : {}),
        ...(targetLtc ? { ltcAddress: targetLtc } : {})
      });
      const res = await fetch(`/api/wallet/balances/${encodeURIComponent(primary)}?${qs.toString()}`);
      const data = await res.json();
      if (data.success && data.balances) {
        setWalletBalances(data.balances);
      }
      if (data.success && data.prices) {
        setOraclePrices(data.prices);
      }
    } catch (_) {
      // Keep previous cached balances on transient RPC error
    } finally {
      setBalancesLoading(false);
    }
  };

  useEffect(() => {
    if (bchWallet?.address || evmWallet?.address || solanaWallet?.address || tonWallet?.address || ltcWallet?.address) {
      refreshWalletBalances();
    }
  }, [bchWallet?.address, evmWallet?.address, solanaWallet?.address, tonWallet?.address, ltcWallet?.address, platformNetwork, showAccountModal]);

  // EVM live event callbacks (accountsChanged / chainChanged / disconnect)
  const evmEventCallbacks = {
    onAccountsChanged: (accounts: string[]) => {
      if (!accounts || accounts.length === 0) {
        setEvmWallet(prev => {
          if (prev?.address) {
            pruneAuthAddresses([prev.address], Boolean(bchWallet || solanaWallet || tonWallet || ltcWallet));
          }
          return null;
        });
        showToast(lang === 'es' ? 'Billetera EVM desconectada' : 'EVM wallet disconnected');
      } else {
        setEvmWallet(prev => {
          if (prev?.address && prev.address.toLowerCase() !== accounts[0].toLowerCase()) {
            pruneAuthAddresses([prev.address], true);
          }
          return prev
            ? { ...prev, address: accounts[0] }
            : { address: accounts[0], chainId: platformNetwork === 'testnet' ? 80002 : 137, provider: 'Web3 Wallet', source: 'injected' };
        });
        showToast(
          lang === 'es'
            ? `Cuenta EVM actualizada: ${formatAddress(accounts[0])}`
            : `EVM account updated: ${formatAddress(accounts[0])}`
        );
      }
    },
    onChainChanged: (chainId: number) => {
      setEvmWallet(prev => (prev ? { ...prev, chainId } : null));
    },
    onDisconnect: () => {
      setEvmWallet(prev => {
        if (prev?.address) {
          pruneAuthAddresses([prev.address], Boolean(bchWallet || solanaWallet || tonWallet || ltcWallet));
        }
        return null;
      });
      showToast(lang === 'es' ? 'Sesión EVM finalizada' : 'EVM session ended');
    }
  };

  // Discover EIP-6963 browser extensions & silently restore persisted WC2 / Injected sessions on mount
  useEffect(() => {
    initEip6963Discovery(wallets => setDiscoveredEvmWallets(wallets));

    const isTest = platformNetwork === 'testnet';
    const manualEvmDisconnect =
      typeof window !== 'undefined' && localStorage.getItem('bliq_manual_disconnect_evm') === '1';
    const manualSolDisconnect =
      typeof window !== 'undefined' && localStorage.getItem('bliq_manual_disconnect_sol') === '1';

    // 1. Restore EVM WalletConnect V2 or Injected session (preserve URL read-only manual inspection)
    if (evmWallet?.source !== 'manual') {
      restoreEvmWalletConnectSession(evmEventCallbacks, {
        forceCheck: evmWallet?.source === 'wc2-evm'
      }).then(restoredWc => {
        if (restoredWc && !manualEvmDisconnect) {
          setEvmWallet({
            address: restoredWc.address,
            chainId: restoredWc.chainId,
            provider: restoredWc.providerName,
            source: 'wc2-evm'
          });
        } else if (manualEvmDisconnect) {
          setEvmWallet(null);
        } else if (evmWallet?.source === 'injected') {
          trySilentReconnectInjectedEvm(evmEventCallbacks).then(restoredInj => {
            if (restoredInj) {
              setEvmWallet({
                address: restoredInj.address,
                chainId: restoredInj.chainId,
                provider: restoredInj.providerName,
                source: 'injected',
                ...(restoredInj.rdns ? { rdns: restoredInj.rdns } : {})
              });
            } else {
              // Extension locked or permission revoked -> clear stale state
              setEvmWallet(null);
            }
          });
        }
      });
    }

    // 2. Restore BlConnect (Native Hybrid) session cleanly (clear any legacy wc2-bch state)
    if (bchWallet?.source === 'wc2-bch') {
      void disconnectBchWalletConnect().catch(() => {});
      setBchWallet(null);
    } else if (bchWallet?.source !== 'manual') {
      const restoredBlc = restoreBlConnectSession(isTest, () => {
        setBchWallet(prev => (prev?.source === 'blconnect' ? null : prev));
      });
      if (restoredBlc) {
        const qAddrs = (restoredBlc.allAddresses || [restoredBlc.cashAddress]).join(',');
        setBchWallet({
          address: restoredBlc.cashAddress,
          tokenAddress: restoredBlc.tokenAddress,
          provider: `${restoredBlc.walletName} (BlConnect)`,
          source: 'blconnect',
          queryAddress: qAddrs
        });
      }
    }

    // 3. Restore Solana (Phantom vs Solflare) strictly respecting saved wallet source
    if (typeof window !== 'undefined') {
      if (manualSolDisconnect) {
        setSolanaWallet(null);
      } else {
        const phantomProvider = (window as any).phantom?.solana || ((window as any).solana?.isPhantom ? (window as any).solana : null);
        const solflareProvider = (window as any).solflare;
        const savedSolSource = solanaWallet?.source;

        if (savedSolSource === 'solflare') {
          if (solflareProvider?.publicKey && solflareProvider?.isConnected) {
            setSolanaWallet({
              address: solflareProvider.publicKey.toString(),
              provider: 'Solflare',
              source: 'solflare'
            });
          } else if (solflareProvider && typeof solflareProvider.connect === 'function') {
            solflareProvider.connect({ onlyIfTrusted: true })
              .then((res: any) => {
                const pk = res?.publicKey || solflareProvider.publicKey;
                if (pk) {
                  setSolanaWallet({
                    address: pk.toString(),
                    provider: 'Solflare',
                    source: 'solflare'
                  });
                } else {
                  setSolanaWallet(null);
                }
              })
              .catch(() => setSolanaWallet(null));
          } else {
            setSolanaWallet(null);
          }
        } else if (savedSolSource === 'phantom' || !savedSolSource) {
          if (phantomProvider?.isConnected && phantomProvider?.publicKey) {
            setSolanaWallet({
              address: phantomProvider.publicKey.toString(),
              provider: 'Phantom',
              source: 'phantom'
            });
          } else if (phantomProvider && typeof phantomProvider.connect === 'function') {
            phantomProvider.connect({ onlyIfTrusted: true })
              .then((res: any) => {
                if (res?.publicKey) {
                  setSolanaWallet({
                    address: res.publicKey.toString(),
                    provider: 'Phantom',
                    source: 'phantom'
                  });
                } else if (savedSolSource === 'phantom') {
                  setSolanaWallet(null);
                }
              })
              .catch(() => {
                if (savedSolSource === 'phantom') setSolanaWallet(null);
              });
          } else if (savedSolSource === 'phantom') {
            setSolanaWallet(null);
          }
        }
      }
    }
  }, []);

  // Subscribe to TON Connect UI 2.0 session & status changes
  useEffect(() => {
    const isTest = platformNetwork === 'testnet';
    return subscribeTonConnect(isTest, (acc) => {
      if (acc && acc.address) {
        const tonObj = {
          address: acc.address,
          provider: `${acc.provider} (TON Connect)`,
          source: 'tonconnect' as const
        };
        setTonWallet(tonObj);
        localStorage.setItem('bliq_ton_wallet', JSON.stringify(tonObj));
        setShowWalletModal(false);
        refreshWalletBalances(undefined, undefined, undefined, acc.address, undefined);
      } else {
        setTonWallet(prev => {
          if (prev?.source === 'tonconnect') {
            localStorage.removeItem('bliq_ton_wallet');
            return null;
          }
          return prev;
        });
      }
    });
  }, [platformNetwork]);

  // Subscribe to Phantom / Solflare live accountChanged & disconnect events
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const win = window as any;
    const phantom = win.phantom?.solana || (win.solana?.isPhantom ? win.solana : null);
    const solflare = win.solflare;

    const handleSolAccountChanged = (src: 'phantom' | 'solflare', name: string) => (publicKey: any) => {
      if (!publicKey) {
        setSolanaWallet(prev => {
          if (prev?.source === src && prev?.address) {
            pruneAuthAddresses([prev.address], Boolean(bchWallet || evmWallet || tonWallet || ltcWallet));
            return null;
          }
          return prev;
        });
        return;
      }
      const nextAddr = typeof publicKey === 'string' ? publicKey : publicKey.toString?.() || '';
      if (nextAddr) {
        setSolanaWallet(prev => {
          if (prev?.address && prev.address.toLowerCase() !== nextAddr.toLowerCase()) {
            pruneAuthAddresses([prev.address], true);
          }
          return { address: nextAddr, provider: name, source: src };
        });
      }
    };

    const handleSolDisconnect = (src: 'phantom' | 'solflare') => () => {
      setSolanaWallet(prev => {
        if (prev?.source === src && prev?.address) {
          pruneAuthAddresses([prev.address], Boolean(bchWallet || evmWallet || tonWallet || ltcWallet));
          return null;
        }
        return prev;
      });
    };

    const onPhantomAccount = handleSolAccountChanged('phantom', 'Phantom');
    const onPhantomDisconnect = handleSolDisconnect('phantom');
    const onSolflareAccount = handleSolAccountChanged('solflare', 'Solflare');
    const onSolflareDisconnect = handleSolDisconnect('solflare');

    try {
      phantom?.on?.('accountChanged', onPhantomAccount);
      phantom?.on?.('disconnect', onPhantomDisconnect);
      solflare?.on?.('accountChanged', onSolflareAccount);
      solflare?.on?.('disconnect', onSolflareDisconnect);
    } catch {}

    return () => {
      try {
        phantom?.removeListener?.('accountChanged', onPhantomAccount);
        phantom?.off?.('accountChanged', onPhantomAccount);
        phantom?.removeListener?.('disconnect', onPhantomDisconnect);
        phantom?.off?.('disconnect', onPhantomDisconnect);
        solflare?.removeListener?.('accountChanged', onSolflareAccount);
        solflare?.off?.('accountChanged', onSolflareAccount);
        solflare?.removeListener?.('disconnect', onSolflareDisconnect);
        solflare?.off?.('disconnect', onSolflareDisconnect);
      } catch {}
    };
  }, []);

  const clearAuthSession = () => {
    setAuthToken(null);
    setAuthAddresses([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('bliq_auth_token');
      localStorage.removeItem('bliq_auth_addrs');
    }
  };

  const pruneAuthAddresses = (removedAddrs: Array<string | null | undefined>, hasRemainingWallets: boolean) => {
    if (!hasRemainingWallets) {
      clearAuthSession();
      return;
    }
    const removedSet = new Set(
      removedAddrs
        .filter(Boolean)
        .flatMap(a => String(a).split(',').map(p => p.trim().toLowerCase()))
        .filter(Boolean)
    );
    if (removedSet.size === 0) return;
    setAuthAddresses(prev => {
      const next = prev.filter(a => !removedSet.has(a.toLowerCase()));
      if (typeof window !== 'undefined') {
        if (next.length === 0) {
          localStorage.removeItem('bliq_auth_token');
          localStorage.removeItem('bliq_auth_addrs');
        } else {
          localStorage.setItem('bliq_auth_addrs', JSON.stringify(next));
        }
      }
      if (next.length === 0) {
        setAuthToken(null);
      }
      return next;
    });
  };

  const disconnectBchInternal = async () => {
    const removedBch = bchWallet?.queryAddress || bchWallet?.address;
    try { wc.disconnect(); } catch {}
    try { await disconnectBchWalletConnect(); } catch {}
    try { await disconnectBlConnect(); } catch {}
    setBchWallet(null);
    setWalletBalances(prev => ({ ...prev, BCH: 0, PUSD: 0 }));
    return removedBch;
  };

  const disconnectEvmInternal = async () => {
    const removedEvm = evmWallet?.address;
    if (typeof window !== 'undefined') {
      localStorage.setItem('bliq_manual_disconnect_evm', '1');
    }
    try { await disconnectWalletConnect(); } catch {}
    try { await disconnectInjectedEvmWallet(); } catch {}
    setEvmWallet(null);
    setWalletBalances(prev => ({ ...prev, USDT: 0, USDC: 0, POL: 0, BNB: 0, USDT_BSC: 0 }));
    return removedEvm;
  };

  const disconnectSolanaInternal = () => {
    const removedSol = solanaWallet?.address;
    if (typeof window !== 'undefined') {
      localStorage.setItem('bliq_manual_disconnect_sol', '1');
      localStorage.removeItem('bliq_solana_wallet');
    }
    try {
      const win = window as any;
      if (solanaWallet?.source === 'solflare') {
        win?.solflare?.disconnect?.();
      } else {
        win?.phantom?.solana?.disconnect?.() || win?.solana?.disconnect?.();
      }
    } catch {}
    setSolanaWallet(null);
    setWalletBalances(prev => ({ ...prev, SOL: 0, USDT_SOL: 0 }));
    return removedSol;
  };

  const disconnectTonInternal = () => {
    void disconnectTonConnect();
    setTonWallet(null);
    setWalletBalances(prev => ({ ...prev, TON: 0, USDT_TON: 0 }));
    if (typeof window !== 'undefined') {
      localStorage.removeItem('bliq_ton_wallet');
    }
  };

  const disconnectLtcInternal = () => {
    setLtcWallet(null);
    setWalletBalances(prev => ({ ...prev, LTC: 0 }));
    if (typeof window !== 'undefined') {
      localStorage.removeItem('bliq_ltc_wallet');
    }
  };

  const handleDisconnectBch = async () => {
    const removed = await disconnectBchInternal();
    const hasRemaining = Boolean(evmWallet || solanaWallet || tonWallet || ltcWallet);
    pruneAuthAddresses([removed], hasRemaining);
    showToast(lang === 'es' ? 'Billetera Bitcoin Cash desconectada' : 'Bitcoin Cash wallet disconnected');
  };

  const handleDisconnectEvm = async () => {
    const removed = await disconnectEvmInternal();
    const hasRemaining = Boolean(bchWallet || solanaWallet || tonWallet || ltcWallet);
    pruneAuthAddresses([removed], hasRemaining);
    showToast(lang === 'es' ? 'Billetera EVM desconectada' : 'EVM wallet disconnected');
  };

  const handleDisconnectSolana = () => {
    const removed = disconnectSolanaInternal();
    const hasRemaining = Boolean(bchWallet || evmWallet || tonWallet || ltcWallet);
    pruneAuthAddresses([removed], hasRemaining);
    showToast(lang === 'es' ? 'Billetera Solana desconectada' : 'Solana wallet disconnected');
  };

  const handleDisconnectTon = () => {
    disconnectTonInternal();
    showToast(lang === 'es' ? 'Billetera TON desconectada' : 'TON wallet disconnected');
  };

  const handleDisconnectLtc = () => {
    disconnectLtcInternal();
    showToast(lang === 'es' ? 'Billetera Litecoin desconectada' : 'Litecoin wallet disconnected');
  };

  const handleDisconnect = async () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('bliq_manual_disconnect_evm', '1');
      localStorage.setItem('bliq_manual_disconnect_sol', '1');
    }
    await disconnectBchInternal();
    await disconnectEvmInternal();
    disconnectSolanaInternal();
    disconnectTonInternal();
    disconnectLtcInternal();
    setWalletBalances({
      PUSD: 0,
      BCH: 0,
      USDT: 0,
      USDC: 0,
      POL: 0,
      SOL: 0,
      USDT_SOL: 0,
      LTC: 0,
      BNB: 0,
      USDT_BSC: 0,
      TON: 0,
      USDT_TON: 0
    });
    setUserContext(null);
    clearAuthSession();
    localStorage.removeItem('bliq_user');
    localStorage.removeItem('bliq_wallets_v2');
    localStorage.removeItem('bliq_solana_wallet');
    localStorage.removeItem('bliq_ton_wallet');
    localStorage.removeItem('bliq_ltc_wallet');
    showToast(lang === 'es' ? 'Todas las billeteras desconectadas' : 'All wallets disconnected');
  };

  const handleConnectSolana = async (preferred: 'phantom' | 'solflare' = 'phantom') => {
    setShowWalletModal(false);
    try {
      if (typeof window === 'undefined') return;
      let providerObj: any = null;
      if (preferred === 'phantom') {
        providerObj = (window as any).phantom?.solana || ((window as any).solana?.isPhantom ? (window as any).solana : null);
        if (!providerObj) {
          window.open('https://phantom.app/', '_blank');
          showToast(lang === 'es' ? 'Instala Phantom Wallet para Solana' : 'Please install Phantom Wallet for Solana', 'error');
          return;
        }
      } else if (preferred === 'solflare') {
        providerObj = (window as any).solflare;
        if (!providerObj) {
          window.open('https://solflare.com/', '_blank');
          showToast(lang === 'es' ? 'Instala Solflare para Solana' : 'Please install Solflare for Solana', 'error');
          return;
        }
      } else {
        providerObj = (window as any).phantom?.solana || (window as any).solana || (window as any).solflare;
      }

      if (!providerObj) {
        showToast(lang === 'es' ? 'No se detectó billetera Solana' : 'No Solana wallet detected', 'error');
        return;
      }

      const resp = await providerObj.connect();
      const pubkey = resp?.publicKey ? resp.publicKey.toString() : providerObj.publicKey?.toString();
      if (!pubkey || !isValidSolanaWalletAddress(pubkey)) {
        throw new Error('No se obtuvo llave pública Solana válida');
      }

      const pName = preferred === 'solflare' ? 'Solflare' : (providerObj.isPhantom ? 'Phantom' : 'Solana Wallet');
      if (typeof window !== 'undefined') {
        localStorage.removeItem('bliq_manual_disconnect_sol');
      }
      setSolanaWallet({
        address: pubkey,
        provider: pName,
        source: preferred
      });
      await registerBackendSession(
        bchWallet?.tokenAddress || evmWallet?.address || pubkey,
        bchWallet?.address || null,
        evmWallet?.address || null,
        pName,
        pubkey
      );
      showToast(
        lang === 'es'
          ? `Conectado con ${pName}: ${formatAddress(pubkey)}`
          : `Connected with ${pName}: ${formatAddress(pubkey)}`
      );
    } catch (err: any) {
      const msg = err?.message || '';
      if (!msg.includes('User rejected') && !msg.includes('4001')) {
        showToast(msg || (lang === 'es' ? 'Error conectando billetera Solana' : 'Error connecting Solana wallet'), 'error');
      }
    }
  };

  const registerBackendSession = async (
    primaryAddr: string,
    bchAddr: string | null,
    evmAddr: string | null,
    providerName: string,
    solAddr: string | null = solanaWallet?.address || null
  ) => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          address: primaryAddr,
          bchAddress: bchAddr,
          evmAddress: evmAddr,
          solanaAddress: solAddr,
          provider: providerName,
          network: platformNetwork
        })
      });
      const data = await res.json();
      if (data?.user?.balances) {
        setWalletBalances(prev => ({ ...prev, ...data.user.balances }));
      }
      if (data?.authToken && Array.isArray(data.authenticatedAddresses)) {
        setAuthToken(data.authToken);
        setAuthAddresses(data.authenticatedAddresses);
        if (typeof window !== 'undefined') {
          localStorage.setItem('bliq_auth_token', data.authToken);
          localStorage.setItem('bliq_auth_addrs', JSON.stringify(data.authenticatedAddresses));
        }
      }
    } catch {}
  };

  /**
   * Ensures an authenticated cryptographic wallet session token exists covering the requested
   * wallet chain(s) (`bch`, `evm`, `solana`) without triggering unrelated wallets like MetaMask
   * during BCH/PUSD actions.
   */
  const ensureAuthSession = async (options?: EnsureAuthSessionOptions): Promise<string | null> => {
    const cleanEvm = evmWallet?.address || '';
    const cleanSol = solanaWallet?.address || '';
    const cleanBch = bchWallet?.address ? bchWallet.address.split(',')[0].trim() : '';

    const scopedChains =
      options?.chains && options.chains.length > 0 ? new Set(options.chains) : null;
    const wantBch = !scopedChains || scopedChains.has('bch');
    const wantEvm = !scopedChains || scopedChains.has('evm');
    const wantSol = !scopedChains || scopedChains.has('solana');

    // Hydrate persisted EVM WalletConnect v2 session lazily on demand
    const effectiveBchSource = bchWallet?.source;
    if (wantEvm && cleanEvm && evmWallet?.source === 'wc2-evm' && !hasActiveEvmSigningCapability()) {
      await restoreEvmWalletConnectSession(evmEventCallbacks, { forceCheck: true }).catch(() => null);
    }

    const canSignBch = Boolean(wantBch && cleanBch && hasActiveBchMessageSigningCapability(effectiveBchSource));
    const canSignEvm = Boolean(wantEvm && cleanEvm && hasActiveEvmSigningCapability());
    const canSignSol = Boolean(wantSol && cleanSol);

    const neededAddrs = [
      ...(canSignEvm ? [cleanEvm.toLowerCase()] : []),
      ...(canSignSol ? [cleanSol.toLowerCase()] : []),
      ...(canSignBch ? [cleanBch.toLowerCase()] : [])
    ];

    if (authToken && neededAddrs.length > 0) {
      const normalizedAuthed = authAddresses.map(a => a.toLowerCase());
      const allCovered = neededAddrs.every(a => normalizedAuthed.includes(a));
      if (allCovered) return authToken;
    }

    const challengeAddresses = [
      ...(canSignEvm ? [cleanEvm] : []),
      ...(canSignSol ? [cleanSol] : []),
      ...(canSignBch ? [cleanBch] : [])
    ];

    if (challengeAddresses.length === 0) {
      const bchOnly = scopedChains?.has('bch') && !scopedChains.has('evm') && !scopedChains.has('solana');
      const evmOnly = scopedChains?.has('evm') && !scopedChains.has('bch') && !scopedChains.has('solana');
      const solOnly = scopedChains?.has('solana') && !scopedChains.has('bch') && !scopedChains.has('evm');

      let msg: string;
      if (bchOnly) {
        if (cleanBch && !canSignBch) {
          msg =
            lang === 'es'
              ? 'Esta acción requiere firma de mensajes. Conecta BinaryLiquid Wallet para autenticar acciones BCH/PUSD.'
              : 'This action requires message signing. Connect BinaryLiquid Wallet to authenticate BCH/PUSD actions.';
          setWalletModalTab('bch');
          setShowWalletModal(true);
        } else {
          msg =
            lang === 'es'
              ? 'Conecta BinaryLiquid Wallet para autenticar acciones BCH/PUSD.'
              : 'Connect BinaryLiquid Wallet to authenticate BCH/PUSD actions.';
        }
      } else if (evmOnly) {
        msg =
          lang === 'es'
            ? 'Conecta una billetera EVM (MetaMask o WalletConnect) para autenticar esta acción USDT/USDC.'
            : 'Connect an EVM wallet (MetaMask or WalletConnect) to authenticate this USDT/USDC action.';
      } else if (solOnly) {
        msg =
          lang === 'es'
            ? 'Conecta Phantom o Solflare para autenticar esta acción en Solana.'
            : 'Connect Phantom or Solflare to authenticate this Solana action.';
      } else {
        msg =
          lang === 'es'
            ? 'Conecta BinaryLiquid Wallet, MetaMask/WalletConnect o Phantom/Solflare para autenticar esta acción.'
            : 'Connect BinaryLiquid Wallet, MetaMask/WalletConnect, or Phantom/Solflare to authenticate this action.';
      }
      showToast(msg, 'error');
      return null;
    }

    try {
      const chRes = await fetch('/api/auth/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addresses: challengeAddresses })
      });
      const chData = await chRes.json();
      if (!chRes.ok || !chData.challengeToken || !chData.message) {
        throw new Error(chData.error || 'No se pudo generar desafío de autenticación.');
      }

      const proofs: Array<{ address: string; signature: string }> = [];

      if (canSignEvm) {
        const signed = await signEvmAuthMessage(chData.message, cleanEvm);
        proofs.push({ address: signed.address, signature: signed.signature });
      }
      if (canSignSol) {
        const pref = solanaWallet?.source === 'solflare' ? 'solflare' : 'phantom';
        const signed = await signSolanaAuthMessage(chData.message, pref);
        proofs.push({ address: cleanSol || signed.address, signature: signed.signature });
      }
      if (canSignBch) {
        const signed = await signBchMessage({
          message: chData.message,
          userPrompt: 'BinaryLiquid Auth Session',
          isTestnet: platformNetwork === 'testnet',
          preferredSource: effectiveBchSource
        });
        proofs.push({ address: cleanBch, signature: signed.signature });
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          address: (canSignBch ? cleanBch : '') || (canSignEvm ? cleanEvm : '') || (canSignSol ? cleanSol : ''),
          bchAddress: canSignBch ? cleanBch : null,
          evmAddress: canSignEvm ? cleanEvm : null,
          provider:
            [
              canSignBch ? bchWallet?.provider : null,
              canSignEvm ? evmWallet?.provider : null,
              canSignSol ? solanaWallet?.provider : null
            ]
              .filter(Boolean)
              .join(' + ') || 'Web3',
          network: platformNetwork,
          challengeToken: chData.challengeToken,
          message: chData.message,
          proofs
        })
      });
      const loginData = await loginRes.json();
      if (!loginRes.ok || !loginData.authToken) {
        throw new Error(loginData.error || 'Autenticación criptográfica rechazada.');
      }
      setAuthToken(loginData.authToken);
      setAuthAddresses(loginData.authenticatedAddresses || challengeAddresses);
      if (typeof window !== 'undefined') {
        localStorage.setItem('bliq_auth_token', loginData.authToken);
        localStorage.setItem('bliq_auth_addrs', JSON.stringify(loginData.authenticatedAddresses || challengeAddresses));
      }
      return loginData.authToken;
    } catch (err: any) {
      showToast(err?.message || 'Autenticación cancelada', 'error');
      return null;
    }
  };

  const handleSaveCustomBch = async (rawInput: string) => {
    const trimmed = rawInput.trim();
    if (!trimmed) return;
    const isTest = platformNetwork === 'testnet';
    const base = convertCashAddressNetwork(trimmed, isTest, false);
    const token = convertCashAddressNetwork(trimmed, isTest, true);
    if (!base || !isValidCashAddress(base)) {
      showToast(t.invalidAddress, 'error');
      return;
    }
    try { await wc.disconnect(); } catch {}
    try { await disconnectBchWalletConnect(); } catch {}
    try { await disconnectBlConnect(); } catch {}
    bchWalletSourceRef.current = 'manual';
    const primaryBase = base.split(',')[0].trim();
    const primaryToken = token ? token.split(',')[0].trim() : primaryBase;
    setBchWallet({
      address: primaryBase,
      tokenAddress: primaryToken,
      provider: 'Manual (Solo lectura)',
      source: 'manual',
      queryAddress: base
    });
    registerBackendSession(primaryToken, base, evmWallet?.address || null, 'Manual', solanaWallet?.address || null);
    refreshWalletBalances(base, evmWallet?.address || null);
    showToast(t.addressUpdated, 'success');
    setIsEditingBch(false);
    setCustomBchInput('');
    setShowManualWalletInput(false);
    setShowWalletModal(false);
  };

  const handleConnectTon = async (preferred: 'tonconnect' | 'Tonkeeper' | 'telegram-wallet' = 'tonconnect') => {
    try {
      setShowWalletModal(false);
      await openTonConnectModal({
        isDark: darkMode,
        singleWalletAppName:
          preferred === 'Tonkeeper'
            ? 'tonkeeper'
            : preferred === 'telegram-wallet'
            ? 'telegram-wallet'
            : undefined
      });
    } catch {
      setWalletModalTab('ton');
      setShowManualWalletInput(true);
      setShowWalletModal(true);
    }
  };

  const handleSaveCustomTon = (rawInput: string) => {
    const trimmed = rawInput.trim();
    const isTest = platformNetwork === 'testnet';
    if (!isValidTonWalletAddress(trimmed, isTest)) {
      const otherValid = isValidTonWalletAddress(trimmed, !isTest);
      showToast(
        otherValid
          ? (isTest
              ? (lang === 'es' ? 'Esa dirección TON es de Mainnet (EQ/UQ). Usa Testnet (kQ/0Q) o raw.' : 'That TON address is Mainnet (EQ/UQ); use Testnet (kQ/0Q) or raw.')
              : (lang === 'es' ? 'Esa dirección TON es de Testnet (kQ/0Q). Usa Mainnet (EQ/UQ) o raw.' : 'That TON address is Testnet (kQ/0Q); use Mainnet (EQ/UQ) or raw.'))
          : (lang === 'es' ? 'Dirección TON no válida (usa 48 chars EQ/UQ/kQ/0Q o raw 0:...)' : 'Invalid TON address'),
        'error'
      );
      return;
    }
    const tonObj = { address: trimmed, provider: 'Tonkeeper / Manual', source: 'manual' as const };
    setTonWallet(tonObj);
    localStorage.setItem('bliq_ton_wallet', JSON.stringify(tonObj));
    refreshWalletBalances(undefined, undefined, undefined, trimmed, undefined);
    setIsEditingTon(false);
    setCustomTonInput('');
    setShowManualWalletInput(false);
    setShowWalletModal(false);
    showToast(lang === 'es' ? `Dirección TON guardada: ${formatAddress(trimmed)}` : `TON address saved: ${formatAddress(trimmed)}`);
  };

  const handleSaveCustomLtc = (rawInput: string) => {
    const trimmed = rawInput.trim();
    const isTest = platformNetwork === 'testnet';
    if (!isValidLtcWalletAddress(trimmed, isTest)) {
      const otherValid = isValidLtcWalletAddress(trimmed, !isTest);
      showToast(
        otherValid
          ? (isTest
              ? (lang === 'es' ? 'Esa dirección Litecoin es de Mainnet (ltc1/L/M). Usa Testnet (tltc1/m/n/Q).' : 'Mainnet LTC address pasted in Testnet mode.')
              : (lang === 'es' ? 'Esa dirección Litecoin es de Testnet (tltc1/m/n). Usa Mainnet (ltc1/L/M).' : 'Testnet LTC address pasted in Mainnet mode.'))
          : (lang === 'es' ? 'Dirección Litecoin no válida' : 'Invalid Litecoin address'),
        'error'
      );
      return;
    }
    setLtcWallet({
      address: trimmed,
      provider: 'Litewallet / Manual'
    });
    localStorage.setItem('bliq_ltc_wallet', JSON.stringify({ address: trimmed, provider: 'Litewallet / Manual' }));
    refreshWalletBalances(undefined, undefined, undefined, undefined, trimmed);
    setIsEditingLtc(false);
    setCustomLtcInput('');
    setShowWalletModal(false);
    showToast(lang === 'es' ? `Dirección Litecoin guardada: ${formatAddress(trimmed)}` : `Litecoin address saved: ${formatAddress(trimmed)}`);
  };

  const getExplorerAddressUrl = (chain: 'bch' | 'evm' | 'solana' | 'ton' | 'ltc', address: string) => {
    const isTest = platformNetwork === 'testnet';
    switch (chain) {
      case 'bch':
        return isTest 
          ? `https://chipnet.imaginary.cash/address/${address}` 
          : `https://blockchair.com/bitcoin-cash/address/${address}`;
      case 'evm':
        return isTest 
          ? `https://amoy.polygonscan.com/address/${address}` 
          : `https://polygonscan.com/address/${address}`;
      case 'solana':
        return isTest 
          ? `https://solscan.io/account/${address}?cluster=devnet` 
          : `https://solscan.io/account/${address}`;
      case 'ton':
        return isTest 
          ? `https://testnet.tonviewer.com/${address}` 
          : `https://tonviewer.com/${address}`;
      case 'ltc':
        return isTest 
          ? `https://live.blockcypher.com/ltc-testnet/address/${address}` 
          : `https://blockchair.com/litecoin/address/${address}`;
      default:
        return '#';
    }
  };

  const estimatedPortfolioUsd = React.useMemo(() => {
    const pusd = (walletBalances.PUSD || 0) * (oraclePrices.PUSD ?? 1.0);
    const usdt = (walletBalances.USDT || 0) * (oraclePrices.USDT ?? 1.0);
    const usdtBsc = (walletBalances.USDT_BSC || 0) * (oraclePrices.USDT_BSC ?? 1.0);
    const usdtSol = (walletBalances.USDT_SOL || 0) * (oraclePrices.USDT_SOL ?? 1.0);
    const usdtTon = (walletBalances.USDT_TON || 0) * (oraclePrices.USDT_TON ?? 1.0);
    const usdc = (walletBalances.USDC || 0) * (oraclePrices.USDC ?? 1.0);
    const bch = (walletBalances.BCH || 0) * (oraclePrices.BCH ?? 480);
    const pol = (walletBalances.POL || 0) * (oraclePrices.POL ?? 0.45);
    const bnb = (walletBalances.BNB || 0) * (oraclePrices.BNB ?? 620);
    const sol = (walletBalances.SOL || 0) * (oraclePrices.SOL ?? 180);
    const ton = (walletBalances.TON || 0) * (oraclePrices.TON ?? 5.2);
    const ltc = (walletBalances.LTC || 0) * (oraclePrices.LTC ?? 85);
    return pusd + usdt + usdtBsc + usdtSol + usdtTon + usdc + bch + pol + bnb + sol + ton + ltc;
  }, [walletBalances, oraclePrices]);

  const applyBlConnectSession = async (sess: BlConnectSession) => {
    try { wc.disconnect(); } catch {}
    try { await disconnectBchWalletConnect(); } catch {}
    const queryAddresses =
      sess.allAddresses && sess.allAddresses.length > 0
        ? sess.allAddresses.join(',')
        : sess.cashAddress;
    const providerLabel = `${sess.walletName || 'BinaryLiquid Wallet'} (BlConnect)`;
    setBchWallet({
      address: sess.cashAddress,
      tokenAddress: sess.tokenAddress || sess.cashAddress,
      provider: providerLabel,
      source: 'blconnect',
      queryAddress: queryAddresses
    });
    await registerBackendSession(
      sess.tokenAddress || sess.cashAddress,
      queryAddresses,
      evmWallet?.address || null,
      providerLabel,
      solanaWallet?.address || null
    );
    refreshWalletBalances(queryAddresses, evmWallet?.address || null);
    showToast(
      lang === 'es'
        ? `⚡ Conectado vía BlConnect (${sess.transport === 'popup' ? 'Instantáneo' : 'Nostr E2EE'}): ${formatAddress(sess.tokenAddress || sess.cashAddress)}`
        : `⚡ Connected via BlConnect (${sess.transport === 'popup' ? 'Instant' : 'Nostr E2EE'}): ${formatAddress(sess.tokenAddress || sess.cashAddress)}`
    );
  };

  const openBlConnectModal = () => {
    setShowWalletModal(false);
    const isTest = platformNetwork === 'testnet';
    const pairing = startBlConnectNostrPairing(isTest, () => {
      setBchWallet(prev => (prev?.source === 'blconnect' ? null : prev));
    });
    setBlConnectModal({
      uri: pairing.uri,
      qrDataUrl: pairing.qrDataUrl,
      cancel: pairing.cancel
    });
    void pairing
      .waitForApproval()
      .then(async (sess) => {
        setBlConnectModal(null);
        await applyBlConnectSession(sess);
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : '';
        if (msg && msg !== 'cancelled') {
          showToast(msg, 'error');
        }
      });
  };

  const handleBlConnectInstantPopup = async () => {
    if (blConnectPopupBusy) return;
    setBlConnectPopupBusy(true);
    const isTest = platformNetwork === 'testnet';
    try {
      const sess = await connectBlConnectPopup(isTest);
      blConnectModal?.cancel();
      setBlConnectModal(null);
      await applyBlConnectSession(sess);
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg && !msg.includes('cerrada') && !msg.includes('rejected') && !msg.includes('cancel')) {
        showToast(msg, 'error');
      }
    } finally {
      setBlConnectPopupBusy(false);
    }
  };

  const handleConnectWallet = async (
    type: 'paytaca' | 'walletconnect' | 'injected',
    rdns?: string
  ) => {
    if (connectLockRef.current) return;
    connectLockRef.current = true;

    try {
    setShowWalletModal(false);
    setSelectedWalletType(type);
    const isTest = platformNetwork === 'testnet';

    if (type === 'paytaca') {
      // Disconnect any active BlConnect / legacy WC2 session before switching to WizardConnect
      try { await disconnectBlConnect(); } catch {}
      try { await disconnectBchWalletConnect(); } catch {}

      // 1. Try direct browser extension if installed, otherwise launch WizardConnect QR
      if (hasPaytacaExtension()) {
        const extRes = await connectPaytacaExtension(isTest);
        if (extRes) {
          setBchWallet({
            address: extRes.address,
            tokenAddress: extRes.tokenAddress,
            provider: extRes.walletName,
            source: 'extension'
          });
          await registerBackendSession(extRes.tokenAddress, extRes.address, evmWallet?.address || null, extRes.walletName, solanaWallet?.address || null);
          showToast(
            lang === 'es'
              ? `Conectado con ${extRes.walletName}: ${formatAddress(extRes.tokenAddress)}`
              : `Connected with ${extRes.walletName}: ${formatAddress(extRes.tokenAddress)}`
          );
          setSelectedWalletType(null);
          return;
        }
      }
      if (wc.state === 'connecting' || wc.state === 'connected') {
        try { await wc.disconnect(); } catch {}
      }
      wc.connect();
    } else if (type === 'walletconnect') {
      // Official WalletConnect V2 EVM (`@walletconnect/ethereum-provider`)
      try {
        const { address, chainId, providerName } = await connectWalletConnect(isTest, evmEventCallbacks);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('bliq_manual_disconnect_evm');
        }
        setEvmWallet({
          address,
          chainId,
          provider: providerName,
          source: 'wc2-evm'
        });
        await registerBackendSession(address, bchWallet?.address || null, address, providerName, solanaWallet?.address || null);
        showToast(
          lang === 'es'
            ? `Conectado vía ${providerName}: ${formatAddress(address)}`
            : `Connected via ${providerName}: ${formatAddress(address)}`
        );
      } catch (err: any) {
        const msg = err?.message || '';
        if (
          !msg.includes('User rejected') &&
          !msg.includes('Connection cancelled') &&
          !msg.includes('Modal closed') &&
          !msg.includes('reset')
        ) {
          showToast(
            msg || (lang === 'es' ? 'Conexión WalletConnect cancelada' : 'WalletConnect pairing cancelled'),
            'error'
          );
        }
      } finally {
        setSelectedWalletType(null);
      }
    } else if (type === 'injected') {
      // Injected Browser Extension (EIP-6963: MetaMask, Rabby, Brave, Trust, Phantom EVM)
      try {
        const { address, chainId, providerName, rdns: connectedRdns } = await connectInjectedWallet({
          rdns,
          isTestnet: isTest,
          autoSwitchNetwork: true,
          callbacks: evmEventCallbacks
        });
        if (typeof window !== 'undefined') {
          localStorage.removeItem('bliq_manual_disconnect_evm');
        }
        setEvmWallet({
          address,
          chainId,
          provider: providerName,
          source: 'injected',
          ...(connectedRdns ? { rdns: connectedRdns } : rdns ? { rdns } : {})
        });
        await registerBackendSession(address, bchWallet?.address || null, address, providerName, solanaWallet?.address || null);
        showToast(
          lang === 'es'
            ? `Conectado con ${providerName}: ${formatAddress(address)}`
            : `Connected with ${providerName}: ${formatAddress(address)}`
        );
      } catch (err: any) {
        const msg = err?.message || '';
        if (!msg.includes('User rejected') && !msg.includes('4001')) {
          showToast(
            msg || (lang === 'es' ? 'Error conectando billetera de navegador' : 'Error connecting browser wallet'),
            'error'
          );
        }
      } finally {
        setSelectedWalletType(null);
      }
    }
    } finally {
      connectLockRef.current = false;
    }
  };

  // LOGIN via WizardConnect (Paytaca native HD session listener)
  useEffect(() => {
    const isTest = platformNetwork === 'testnet';
    if (wc.state === 'connected' && wc.manager) {
      // Do not let a stale persisted WizardConnect session overwrite Cashonize, Extension, or Manual BCH
      if (
        (bchWalletSourceRef.current === 'wc2-bch' ||
          bchWalletSourceRef.current === 'extension' ||
          bchWalletSourceRef.current === 'manual') &&
        selectedWalletTypeRef.current !== 'paytaca'
      ) {
        try { wc.disconnect(); } catch {}
        return;
      }

      let baseAddr = '';
      let tokenAddr = '';
      const allDerived: string[] = [];
      try {
        // DappPubkeyStateManager.getPubkey expects numbers: (childIndex = 0, index = 0)
        const pubkey = wc.manager.getPubkey(0, 0 as any);
        if (pubkey) {
          baseAddr = pubkeyToCashAddress(pubkey, isTest, false);
          tokenAddr = pubkeyToCashAddress(pubkey, isTest, true);
        }

        // Multi-address HD aggregation: check Receive (0) and Change (1) for indices 0..5
        for (const child of [0, 1]) {
          for (let i = 0; i < 5; i++) {
            try {
              const pk = wc.manager.getPubkey(child, i as any);
              if (pk) {
                const bAddr = pubkeyToCashAddress(pk, isTest, false);
                if (bAddr && !allDerived.includes(bAddr)) {
                  allDerived.push(bAddr);
                }
              }
            } catch {}
          }
        }
      } catch {}

      if (!baseAddr) {
        try {
          const paths = wc.manager.getSessionPaths();
          if (paths && paths.length > 0) {
            const receivePath = paths.find(p => p.name === 'receive') || paths[0];
            if (receivePath?.xpub) {
              baseAddr = deriveCashAddressFromXpub(receivePath.xpub, isTest, false);
              tokenAddr = deriveCashAddressFromXpub(receivePath.xpub, isTest, true);
            }
          }
        } catch {}
      }

      if (baseAddr) {
        const wName = wc.walletName || 'Paytaca';
        const queryAddresses = allDerived.length > 0 ? allDerived.join(',') : baseAddr;
        const wasAlreadyRestored =
          bchWalletSourceRef.current === 'wizard' &&
          Boolean(bchAddressRef.current && bchAddressRef.current.toLowerCase() === baseAddr.toLowerCase());

        setBchWallet({
          address: baseAddr,
          tokenAddress: tokenAddr || baseAddr,
          provider: wName,
          source: 'wizard',
          queryAddress: queryAddresses
        });
        registerBackendSession(tokenAddr || baseAddr, queryAddresses, evmAddressRef.current, wName, solanaWallet?.address || null);
        refreshWalletBalances(queryAddresses, evmAddressRef.current);
        if (!wasAlreadyRestored || selectedWalletTypeRef.current === 'paytaca') {
          showToast(
            lang === 'es'
              ? `Conectado con ${wName}: ${formatAddress(tokenAddr || baseAddr)}`
              : `Connected with ${wName}: ${formatAddress(tokenAddr || baseAddr)}`
          );
        }
        setSelectedWalletType(null);
      }
    } else if (wc.state === 'disconnected') {
      setBchWallet(prev => (prev?.source === 'wizard' ? null : prev));
    }
  }, [wc.state, wc.manager, platformNetwork, wc.walletName]);

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

  if (isEmbed) {
    return (
      <div className={`min-h-screen w-full flex items-center justify-center p-2 sm:p-4 bg-transparent font-sans ${darkMode ? 'dark' : ''}`}>
        <div className="w-full max-w-md">
          <BridgeSwap
            userContext={userContext}
            userAddress={userContext?.address || ''}
            bchAddress={bchWallet?.tokenAddress || bchWallet?.address || ''}
            bchQueryAddress={bchWallet?.queryAddress || bchWallet?.address || ''}
            bchWalletName={bchWallet?.provider || ''}
            bchWalletSource={bchWallet?.source}
            evmAddress={evmWallet?.address || userContext?.evmAddress || ''}
            solanaAddress={solanaWallet?.address || ''}
            solanaSource={solanaWallet?.source}
            tonAddress={tonWallet?.address || ''}
            ltcAddress={ltcWallet?.address || ''}
            walletBalances={walletBalances}
            onRefreshBalances={() => refreshWalletBalances()}
            onConnectWallet={() => setShowWalletModal(true)}
            showToast={showToast}
            backendUrl=""
            onOpenLanding={() => {}}
            lang={lang}
            platformNetwork={platformNetwork}
            onToggleNetwork={setPlatformNetwork}
            wizardConnectManager={wc.manager}
            wizardConnectState={wc.state}
            authToken={authToken}
            onEnsureAuthSession={ensureAuthSession}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-warm-mesh dark:bg-[#080B11] flex flex-col font-sans transition-colors duration-200 text-gray-900 dark:text-gray-100 selection:bg-orange-500 selection:text-white">
      
      {/* NAVBAR WITH SCROLL-REACTIVE BORDER & ELEVATION */}
      <nav className={`h-16 sticky top-0 z-40 print:hidden transition-all duration-300 flex items-center px-3 sm:px-8 ${
        isScrolled
          ? 'bg-canvas/90 backdrop-blur-md border-b border-line shadow-xs'
          : 'bg-transparent border-b border-transparent shadow-none'
      }`}>
        <div className="w-full max-w-7xl mx-auto flex items-center justify-between relative">
        <div className="flex items-center gap-2 sm:gap-4 lg:gap-6">
          
          {/* BRAND DROPDOWN (BinaryLiquid ▾ -> Gateway, Whitepaper, SDK & API, Docs) */}
          <div
            ref={brandMenuRef}
            className="relative"
            onMouseEnter={() => {
              if (typeof window !== 'undefined' && window.innerWidth >= 768) {
                if (brandHoverTimerRef.current) clearTimeout(brandHoverTimerRef.current);
                setBrandMenuOpen(true);
              }
            }}
            onMouseLeave={() => {
              if (typeof window !== 'undefined' && window.innerWidth >= 768) {
                brandHoverTimerRef.current = setTimeout(() => setBrandMenuOpen(false), 150);
              }
            }}
          >
            <button
              type="button"
              onClick={() => setBrandMenuOpen((prev) => !prev)}
              aria-expanded={brandMenuOpen}
              className="flex items-center gap-2 cursor-pointer group py-1.5 px-2 -ml-2 rounded-xl hover:bg-surface/60 transition-colors"
              title={lang === 'es' ? 'Menú de BinaryLiquid (Whitepaper, SDK & Inicio)' : 'BinaryLiquid Menu (Whitepaper, SDK & Home)'}
            >
              <div className="w-8 h-8 rounded-xl overflow-hidden flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform shrink-0">
                <img src="/logo.png" alt="BinaryLiquid" className="w-full h-full object-contain" />
              </div>
              <span className="font-brand italic font-semibold text-[21px] sm:text-[23px] tracking-[-0.02em] leading-none text-ink flex items-center">
                BinaryLiquid
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-ink-3 group-hover:text-ink transition-transform duration-200 ${
                  brandMenuOpen ? 'rotate-180 text-ink' : ''
                }`}
              />
            </button>

            <AnimatePresence>
              {brandMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.98 }}
                  transition={{ duration: 0.14, ease: 'easeOut' }}
                  className="absolute left-0 top-full mt-1.5 w-72 bg-surface border border-line rounded-panel shadow-soft p-1.5 z-50"
                >
                  {[
                    {
                      id: 'gateway',
                      title: 'Gateway',
                      desc: lang === 'es' ? 'Inicio y visión general del protocolo' : 'Protocol home & overview'
                    },
                    {
                      id: 'whitepaper',
                      title: 'Whitepaper',
                      desc: lang === 'es' ? 'Especificación técnica P2SH32 & EVM' : 'Technical spec P2SH32 & EVM',
                      badge: 'v1.0'
                    },
                    {
                      id: 'sdk',
                      title: 'SDK & API',
                      desc: lang === 'es' ? 'Widget embed y endpoints DEX' : 'Embed widget & DEX endpoints'
                    },
                    {
                      id: 'identity',
                      title: lang === 'es' ? 'Identidad Soberana' : 'Sovereign Identity',
                      desc: lang === 'es' ? 'BCH ↔ Nostr · PoC Paytaca' : 'BCH ↔ Nostr · Paytaca PoC',
                      badge: 'BCH ⟷ Nostr'
                    },
                    {
                      id: 'docs',
                      title: lang === 'es' ? 'Documentación' : 'Documentation',
                      desc: lang === 'es' ? 'Guía de integración y contratos' : 'Integration guide & contracts'
                    }
                  ].map((item) => {
                    const active = mainView === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onMouseEnter={() => preloadView(item.id)}
                        onClick={() => {
                          setMainView(item.id as any);
                          setBrandMenuOpen(false);
                        }}
                        className={`w-full px-3 py-2 rounded-control text-left transition-colors cursor-pointer ${
                          active ? 'bg-surface-2 text-ink' : 'hover:bg-surface-2/80 text-ink-2 hover:text-ink'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-ink whitespace-nowrap">
                            {item.title}
                          </span>
                          {item.badge && (
                            <span className="px-1.5 py-0.5 rounded-full bg-surface-2 border border-line text-ink-2 text-[10px] font-medium whitespace-nowrap shrink-0">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-ink-3 leading-snug mt-0.5 truncate">
                          {item.desc}
                        </p>
                      </button>
                    );
                  })}

                  <div className="my-1 border-t border-line" />

                  <a
                    href="https://wallet.bliquid.xyz"
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setBrandMenuOpen(false)}
                    className="block w-full px-3 py-2 rounded-control text-left transition-colors hover:bg-surface-2/80 text-ink-2 hover:text-ink mb-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-ink whitespace-nowrap flex items-center gap-1.5">
                        <Wallet className="w-3.5 h-3.5 text-primary" />
                        BinaryLiquid Wallet
                      </span>
                      <span className="px-1.5 py-0.5 rounded-full bg-primary/10 border border-primary/30 text-primary text-[10px] font-bold whitespace-nowrap shrink-0">
                        New ↗
                      </span>
                    </div>
                    <p className="text-[11px] text-ink-3 leading-snug mt-0.5 truncate">
                      {lang === 'es' ? 'wallet.bliquid.xyz · BCH & CashTokens HD' : 'wallet.bliquid.xyz · BCH & CashTokens HD'}
                    </p>
                  </a>

                  <div className="my-1 border-t border-line" />

                  <div className="px-3 py-1.5 flex items-center justify-between text-[11px] font-medium text-ink-3">
                    <a
                      href="https://bchblaze.cash"
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-ink transition-colors"
                    >
                      BCH BLAZE
                    </a>
                    <span className="text-line-strong">·</span>
                    <a
                      href="https://paryonusd.com"
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-ink transition-colors"
                    >
                      ParyonUSD
                    </a>
                    <span className="text-line-strong">·</span>
                    <a
                      href={PLATFORM_NETWORKS[platformNetwork].explorerBch}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-ink transition-colors"
                    >
                      Explorer
                    </a>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* DESKTOP NAVIGATION TABS (Swiss studio clean floating pills) */}
          <div className="hidden md:flex items-center gap-0.5 lg:gap-1 text-xs font-medium ml-1 sm:ml-2">
            {([
              { id: 'bridge', label: t.navSwap },
              { id: 'p2p', label: t.navP2p },
              { id: 'perps', label: t.navPerps },
              { id: 'pools', label: t.navPools },
              { id: 'lend', label: t.navLend },
              { id: 'portfolio', label: t.navPortfolio }
            ] as const).map((tab) => {
              const active = mainView === tab.id;
              return (
                <button
                  key={tab.id}
                  onMouseEnter={() => preloadView(tab.id)}
                  onClick={() => setMainView(tab.id)}
                  className={`px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
                    active
                      ? 'bg-surface text-ink font-semibold shadow-[0_1px_6px_rgba(0,0,0,0.06)]'
                      : 'text-ink-3 hover:text-ink hover:bg-surface/60 font-medium'
                  }`}
                >
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        
        {/* RIGHT CONTROLS (Responsive) */}
        <div className="flex items-center gap-2 sm:gap-2">
          {/* UserLink Identity Pill (Placed next to Chipnet button) */}
          <button
            onMouseEnter={() => preloadView('identity')}
            onClick={() => setMainView('identity')}
            className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
              mainView === 'identity'
                ? 'bg-surface text-ink font-semibold shadow-[0_1px_6px_rgba(0,0,0,0.06)]'
                : 'text-ink-2 hover:text-ink hover:bg-surface/70'
            }`}
            title={lang === 'es' ? 'UserLink: Identidad BCH ↔ Nostr' : 'UserLink: BCH ↔ Nostr Identity'}
          >
            <Fingerprint className="w-3.5 h-3.5 text-ink-2" />
            <span>{t.navIdentity}</span>
          </button>

          {/* Network Switcher Pill */}
          <button
            onClick={() => {
              const next = platformNetwork === 'mainnet' ? 'testnet' : 'mainnet';
              setPlatformNetwork(next);
              showToast(
                next === 'mainnet'
                  ? (lang === 'es' ? 'Red activa: Bitcoin Cash Mainnet (Producción)' : 'Active network: Bitcoin Cash Mainnet (Production)')
                  : (lang === 'es' ? 'Red activa: BCH Chipnet (Testnet)' : 'Active network: BCH Chipnet (Testnet)')
              );
            }}
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium bg-surface/80 hover:bg-surface text-ink-2 transition-all cursor-pointer shadow-[0_1px_4px_rgba(0,0,0,0.04)]"
            title={lang === 'es' ? 'Click para alternar red (Mainnet / Testnet)' : 'Click to toggle network (Mainnet / Testnet)'}
          >
            <span className={`w-2 h-2 rounded-full ${platformNetwork === 'mainnet' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
            <span className="capitalize font-medium text-[11px] sm:text-xs">
              {platformNetwork === 'mainnet' ? 'Mainnet' : 'Chipnet'}
            </span>
          </button>

          {/* Theme Toggle Button */}
          <button 
            onClick={() => setDarkMode(!darkMode)} 
            className="hidden sm:flex w-8 h-8 rounded-full hover:bg-surface/80 text-ink-2 hover:text-ink transition-all items-center justify-center cursor-pointer"
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-ink-2" />}
          </button>

          {/* Language Selector Pill */}
          <button 
            onClick={() => setLang(lang === 'en' ? 'es' : 'en')} 
            className="hidden sm:flex items-center gap-1 text-ink-2 hover:text-ink font-medium text-xs hover:bg-surface/80 px-2.5 py-1.5 rounded-full transition-all cursor-pointer"
          >
            <span className="text-xs">{lang === 'en' ? '🇺🇸' : '🇪🇸'}</span>
            <span className="text-[11px]">{lang.toUpperCase()}</span>
          </button>

          {/* Non-Custodial Wallet Action Button (Shows Multi-Chain BCH+EVM+SVM Status) */}
          {userContext ? (
            <button 
              onClick={() => setShowAccountModal(true)} 
              className="bg-surface hover:bg-surface-2 text-ink px-2.5 sm:px-3.5 py-1.5 rounded-full font-semibold text-xs transition-all border border-line shadow-2xs flex items-center gap-1.5 sm:gap-2 hover:border-line-strong cursor-pointer shrink-0"
              title={lang === 'es' ? 'Billeteras conectadas' : 'Connected wallets'}
            >
              {(() => {
                const hasBch = Boolean(bchWallet?.address || userContext?.bchAddress);
                const hasEvm = Boolean(evmWallet?.address || userContext?.evmAddress);
                const hasSol = Boolean(solanaWallet?.address || userContext?.solanaAddress);
                const hasTon = Boolean(tonWallet?.address || userContext?.tonAddress);
                const hasLtc = Boolean(ltcWallet?.address || userContext?.ltcAddress);

                const activeChains = [
                  hasBch ? 'BCH' : null,
                  hasEvm ? 'EVM' : null,
                  hasSol ? 'SOL' : null,
                  hasTon ? 'TON' : null,
                  hasLtc ? 'LTC' : null
                ].filter(Boolean);

                if (activeChains.length >= 2) {
                  return (
                    <>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                      <span className="font-semibold text-xs flex items-center gap-1">
                        {activeChains.join(' ⇄ ')}
                      </span>
                    </>
                  );
                }

                if (hasBch) {
                  return (
                    <>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                      <span className="font-semibold text-xs flex items-center gap-1">
                        <img src="/BCH.png" className="w-3.5 h-3.5 object-contain" alt="BCH" />
                        <span>{formatAddress(bchWallet?.tokenAddress || bchWallet?.address || userContext?.bchAddress || '')}</span>
                      </span>
                    </>
                  );
                }

                if (hasEvm) {
                  return (
                    <>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                      <span className="font-semibold text-xs flex items-center gap-1">
                        <img src="/POL.png" className="w-3.5 h-3.5 object-contain" alt="EVM" />
                        <span>{formatAddress(evmWallet?.address || userContext?.evmAddress || '')}</span>
                      </span>
                    </>
                  );
                }

                if (hasSol) {
                  return (
                    <>
                      <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse shrink-0" />
                      <span className="font-semibold text-xs flex items-center gap-1">
                        <img src="/SOL.png" className="w-3.5 h-3.5 object-contain" alt="SOL" />
                        <span>{formatAddress(solanaWallet?.address || userContext?.solanaAddress || '')}</span>
                      </span>
                    </>
                  );
                }

                if (hasTon) {
                  return (
                    <>
                      <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse shrink-0" />
                      <span className="font-semibold text-xs flex items-center gap-1">
                        <img src="/TON.png" className="w-3.5 h-3.5 object-contain" alt="TON" />
                        <span>{formatAddress(tonWallet?.address || userContext?.tonAddress || '')}</span>
                      </span>
                    </>
                  );
                }

                if (hasLtc) {
                  return (
                    <>
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0" />
                      <span className="font-semibold text-xs flex items-center gap-1">
                        <img src="/LTC.png" className="w-3.5 h-3.5 object-contain" alt="LTC" />
                        <span>{formatAddress(ltcWallet?.address || userContext?.ltcAddress || '')}</span>
                      </span>
                    </>
                  );
                }

                return (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <span className="font-semibold text-xs">
                      {userContext?.address ? formatAddress(userContext.address) : 'Connected'}
                    </span>
                  </>
                );
              })()}
            </button>
          ) : (
            <button 
              onClick={() => setShowWalletModal(true)} 
              className="bg-ink hover:opacity-90 text-canvas px-4 sm:px-5 py-2 rounded-full font-semibold text-xs transition-all shadow-2xs cursor-pointer shrink-0"
            >
              <span className="hidden sm:inline">{wc.state === 'connecting' ? t.openWallet : t.navWallet}</span>
              <span className="sm:hidden font-semibold">Connect</span>
            </button>
          )}

          {/* Hamburger Menu Trigger Button (Mobile Only) */}
          <button 
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden w-8 h-8 rounded-full bg-surface hover:bg-surface-2 border border-line text-ink-2 hover:text-ink shadow-2xs flex items-center justify-center transition-all cursor-pointer"
            title="Abrir Menú"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>
        </div>
      </nav>

      {/* MOBILE DRAWER / SLIDE-OVER SHEET */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-[150] flex justify-end">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
            />

            {/* Drawer Sheet — Swiss Studio asymmetric left-rounded panel */}
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="relative z-10 w-[308px] max-w-[86vw] h-full bg-surface rounded-l-[32px] shadow-[0_24px_64px_rgba(0,0,0,0.22)] px-5 py-6 flex flex-col justify-between overflow-y-auto"
            >
              <div className="space-y-5">
                {/* Editorial Brand Header */}
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => { setMainView('gateway'); setMobileMenuOpen(false); }}
                    className="flex items-center gap-2.5 cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-xl overflow-hidden flex items-center justify-center shrink-0">
                      <img src="/logo.png" className="w-full h-full object-contain" alt="BinaryLiquid" />
                    </div>
                    <span className="font-brand italic font-semibold text-[21px] tracking-[-0.02em] leading-none text-ink">
                      BinaryLiquid
                    </span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setMobileMenuOpen(false)} 
                    className="w-8 h-8 rounded-full bg-canvas hover:bg-surface-2 text-ink-3 hover:text-ink flex items-center justify-center transition-colors cursor-pointer"
                    title={lang === 'es' ? 'Cerrar' : 'Close'}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Borderless Network Segmented Pill */}
                <div className="grid grid-cols-2 p-1 bg-canvas rounded-full text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setPlatformNetwork('mainnet');
                      showToast(lang === 'es' ? 'Red activa: Bitcoin Cash Mainnet (Producción)' : 'Active network: Bitcoin Cash Mainnet (Production)');
                    }}
                    className={`py-2 rounded-full font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      platformNetwork === 'mainnet'
                        ? 'bg-ink text-surface shadow-xs'
                        : 'text-ink-3 hover:text-ink'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>Mainnet</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPlatformNetwork('testnet');
                      showToast(lang === 'es' ? 'Red activa: BCH Chipnet (Testnet)' : 'Active network: BCH Chipnet (Testnet)');
                    }}
                    className={`py-2 rounded-full font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      platformNetwork === 'testnet'
                        ? 'bg-ink text-surface shadow-xs'
                        : 'text-ink-3 hover:text-ink'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    <span>Chipnet</span>
                  </button>
                </div>

                {/* Primary Ecosystem Grid (Tactile 2x3 Bento Tiles — Zero AI List Clutter) */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'bridge', label: 'Bridge Swap', sub: '5 Redes', subEn: '5 Chains', icon: Zap },
                    { id: 'p2p', label: 'P2P Escrow', sub: 'Fiat ↔ BCH', subEn: 'Fiat ↔ BCH', icon: ShieldCheck },
                    { id: 'perps', label: 'Perps', sub: 'Hasta 50x', subEn: 'Up to 50x', icon: TrendingUp },
                    { id: 'pools', label: 'Pools AMM', sub: 'CashTokens', subEn: 'CashTokens', icon: Droplets },
                    { id: 'lend', label: 'Lend', sub: 'Colateral', subEn: 'Collateral', icon: Lock },
                    { id: 'portfolio', label: lang === 'es' ? 'Portafolio' : 'Portfolio', sub: 'Multired', subEn: 'Multi-chain', icon: PieChart },
                  ].map(item => {
                    const Icon = item.icon;
                    const active = mainView === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => { setMainView(item.id as any); setMobileMenuOpen(false); }}
                        className={`rounded-[20px] p-3 text-left transition-all cursor-pointer flex flex-col justify-between min-h-[76px] ${
                          active
                            ? 'bg-ink text-surface shadow-sm'
                            : 'bg-canvas hover:bg-surface-2 text-ink'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${active ? 'text-surface' : 'text-ink-2'}`} />
                        <div className="mt-2.5">
                          <div className="text-[13px] font-semibold tracking-[-0.01em] leading-tight">
                            {item.label}
                          </div>
                          <div className={`text-[10px] mt-0.5 ${active ? 'text-surface/70' : 'text-ink-3'}`}>
                            {lang === 'es' ? item.sub : item.subEn}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Identity & Wallet Companion Cards */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => { setMainView('identity'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-[18px] transition-all cursor-pointer ${
                      mainView === 'identity'
                        ? 'bg-ink text-surface'
                        : 'bg-canvas hover:bg-surface-2 text-ink'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Fingerprint className={`w-4 h-4 shrink-0 ${mainView === 'identity' ? 'text-surface' : 'text-ink-2'}`} />
                      <div className="text-left min-w-0">
                        <div className="text-xs font-semibold leading-tight">
                          {lang === 'es' ? 'Identidad @usuario' : 'Sovereign @username'}
                        </div>
                        <div className={`text-[10px] truncate ${mainView === 'identity' ? 'text-surface/70' : 'text-ink-3'}`}>
                          Nostr · bliquid.xyz/identity
                        </div>
                      </div>
                    </div>
                    <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${mainView === 'identity' ? 'text-surface/70' : 'text-ink-3'}`} />
                  </button>

                  <a
                    href="https://wallet.bliquid.xyz"
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full flex items-center justify-between px-3.5 py-3 rounded-[18px] bg-canvas hover:bg-surface-2 text-ink transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Wallet className="w-4 h-4 text-ink-2 shrink-0" />
                      <div className="text-left min-w-0">
                        <div className="text-xs font-semibold leading-tight">BinaryLiquid Wallet</div>
                        <div className="text-[10px] text-ink-3 truncate">wallet.bliquid.xyz · BlConnect</div>
                      </div>
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 text-ink-3 shrink-0" />
                  </a>
                </div>

                {/* Compact Secondary Protocol Links (4 clean borderless pills) */}
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'gateway', label: 'Gateway' },
                    { id: 'whitepaper', label: 'Whitepaper' },
                    { id: 'docs', label: 'Docs' },
                    { id: 'sdk', label: 'SDK & API' }
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => { setMainView(item.id as any); setMobileMenuOpen(false); }}
                      className={`px-3 py-2 rounded-xl text-xs font-medium text-center transition-colors cursor-pointer ${
                        mainView === item.id
                          ? 'bg-surface-2 text-ink font-semibold'
                          : 'bg-canvas/60 text-ink-3 hover:text-ink hover:bg-canvas'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Clean Utility Dock Footer */}
              <div className="pt-4 mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    type="button"
                    onClick={() => setDarkMode(!darkMode)}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-full bg-canvas hover:bg-surface-2 text-xs font-medium text-ink transition-colors cursor-pointer"
                  >
                    {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-ink-2" />}
                    <span>{darkMode ? (lang === 'es' ? 'Claro' : 'Light') : (lang === 'es' ? 'Oscuro' : 'Dark')}</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-full bg-canvas hover:bg-surface-2 text-xs font-medium text-ink transition-colors cursor-pointer"
                  >
                    <Globe className="w-3.5 h-3.5 text-ink-2" />
                    <span>{lang === 'en' ? 'English' : 'Español'}</span>
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px] text-ink-3 px-1">
                  <a href="https://t.me/drianops" target="_blank" rel="noreferrer" className="hover:text-ink transition-colors">
                    Drian Stack Labs
                  </a>
                  <a href={PLATFORM_NETWORKS[platformNetwork].explorerBch} target="_blank" rel="noreferrer" className="hover:text-ink transition-colors inline-flex items-center gap-1">
                    <span>Explorer</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MOBILE BOTTOM FLOATING DOCK (md:hidden: lightning 1-thumb navigation) */}
      <div className="fixed bottom-3 left-3 right-3 z-40 md:hidden print:hidden pointer-events-none">
        <div className="pointer-events-auto bg-surface/90 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.12)] rounded-full px-2 py-1.5 flex items-center justify-around">
          
          {/* Tab 1: Swap */}
          <button 
            type="button"
            onClick={() => setMainView('bridge')}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-full transition-all cursor-pointer ${
              mainView === 'bridge' 
                ? 'text-ink font-semibold' 
                : 'text-ink-3 hover:text-ink font-medium'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span className="text-[10px]">Swap</span>
          </button>

          {/* Tab 2: P2P */}
          <button 
            type="button"
            onClick={() => setMainView('p2p')}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-full transition-all cursor-pointer ${
              mainView === 'p2p' 
                ? 'text-ink font-semibold' 
                : 'text-ink-3 hover:text-ink font-medium'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span className="text-[10px]">P2P</span>
          </button>

          {/* Tab 3: Perps */}
          <button 
            type="button"
            onClick={() => setMainView('perps')}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-full transition-all cursor-pointer ${
              mainView === 'perps' 
                ? 'text-ink font-semibold' 
                : 'text-ink-3 hover:text-ink font-medium'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span className="text-[10px]">Perps</span>
          </button>

          {/* Tab 4: Pools */}
          <button 
            type="button"
            onClick={() => setMainView('pools')}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-full transition-all cursor-pointer ${
              mainView === 'pools' 
                ? 'text-ink font-semibold' 
                : 'text-ink-3 hover:text-ink font-medium'
            }`}
          >
            <Droplets className="w-4 h-4" />
            <span className="text-[10px]">Pools</span>
          </button>

          {/* Tab 5: Menú (Opens Drawer!) */}
          <button 
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-full transition-all cursor-pointer ${
              mobileMenuOpen 
                ? 'text-ink font-semibold' 
                : 'text-ink-3 hover:text-ink font-medium'
            }`}
          >
            <Menu className="w-4 h-4" />
            <span className="text-[10px]">{lang === 'es' ? 'Menú' : 'Menu'}</span>
          </button>

        </div>
      </div>

      {/* NATIVE WIZARDCONNECT DIALOG */}
      {(wc.qrUri || wc.uri) && wc.state === 'connecting' && (
        <div className="fixed inset-0 bg-black/45 dark:bg-black/70 backdrop-blur-sm z-[140] flex items-center justify-center p-4">
          <div className="bg-surface rounded-[28px] p-6 w-full max-w-[350px] shadow-[0_24px_60px_-15px_rgba(0,0,0,0.22)] border border-line/60 relative flex flex-col items-center text-center">
            <button
              type="button"
              onClick={() => { wc.disconnect(); setSelectedWalletType(null); }}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-surface-2 hover:bg-surface-3 text-ink-3 hover:text-ink flex items-center justify-center transition-colors cursor-pointer"
              title={lang === 'es' ? 'Cerrar' : 'Close'}
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-11 h-11 rounded-2xl bg-surface-2 flex items-center justify-center mb-3 p-2">
              <img src="/wizardconnect-logo.png" className="w-7 h-7 object-contain" alt="WizardConnect" />
            </div>

            <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-ink">
              WizardConnect
            </h2>
            <p className="text-[13px] text-ink-3 mt-1 mb-5">
              {lang === 'es' ? 'Escanea el QR para conectar' : 'Scan QR to connect'}
            </p>

            <div className="p-3.5 bg-white rounded-[20px] border border-line/70 flex items-center justify-center mb-4">
              {wc.qrUri ? (
                <AlphanumericQRCode value={wc.qrUri} size={200} foreground="#0E131E" background="#FFFFFF" />
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => copyToClipboard(wc.uri || '')}
              className="w-full bg-surface-2 hover:bg-surface-3 text-ink font-medium text-[13px] py-3 px-4 rounded-full transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-ink-3" />}
              <span>
                {copied
                  ? (lang === 'es' ? 'Enlace copiado' : 'Link copied')
                  : (lang === 'es' ? 'Copiar enlace' : 'Copy link')}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* BLCONNECT PROTOCOL V1 MODAL (Instant Popup + Decentralized Nostr E2EE QR) */}
      {blConnectModal && (
        <div className="fixed inset-0 bg-black/45 dark:bg-black/70 backdrop-blur-sm z-[145] flex items-center justify-center p-4">
          <div className="bg-surface rounded-[28px] p-6 w-full max-w-[360px] shadow-[0_24px_60px_-15px_rgba(0,0,0,0.22)] border border-line/60 relative flex flex-col items-center text-center">
            <button
              type="button"
              onClick={() => {
                blConnectModal.cancel();
                setBlConnectModal(null);
              }}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-surface-2 hover:bg-surface-3 text-ink-3 hover:text-ink flex items-center justify-center transition-colors cursor-pointer"
              title={lang === 'es' ? 'Cerrar' : 'Close'}
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-11 h-11 rounded-2xl bg-surface-2 flex items-center justify-center mb-3 p-1.5">
              <img src="/logo.png" className="w-8 h-8 object-contain" alt="BinaryLiquid Wallet" />
            </div>

            <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-ink">
              BinaryLiquid Wallet
            </h2>
            <p className="text-[13px] text-ink-3 mt-1 mb-5">
              {lang === 'es'
                ? 'Conecta aquí o escanea desde tu teléfono'
                : 'Connect here or scan from your phone'}
            </p>

            {/* Primary Instant Same-Browser Popup CTA */}
            <button
              type="button"
              onClick={() => void handleBlConnectInstantPopup()}
              disabled={blConnectPopupBusy}
              className="w-full bg-ink text-canvas hover:opacity-90 font-semibold text-[14px] py-3.5 px-4 rounded-full transition-opacity flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <Zap className="w-4 h-4 text-primary shrink-0" />
              <span>
                {blConnectPopupBusy
                  ? (lang === 'es' ? 'Esperando aprobación...' : 'Waiting for approval...')
                  : (lang === 'es' ? 'Conectar en navegador' : 'Connect in Browser')}
              </span>
            </button>

            <div className="w-full flex items-center gap-3 my-4 text-[11px] font-medium text-ink-3">
              <span className="flex-1 h-px bg-line/70" />
              <span>{lang === 'es' ? 'o escanea el QR' : 'or scan QR'}</span>
              <span className="flex-1 h-px bg-line/70" />
            </div>

            {blConnectModal.qrDataUrl && (
              <div className="p-3 bg-white rounded-[20px] border border-line/70 flex items-center justify-center mb-4">
                <img src={blConnectModal.qrDataUrl} alt="BlConnect QR" className="w-40 h-40 object-contain" />
              </div>
            )}

            <div className="w-full grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => copyToClipboard(blConnectModal.uri)}
                className="bg-surface-2 hover:bg-surface-3 text-ink font-medium text-[12px] py-2.5 px-3 rounded-full transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-ink-3" />}
                <span>
                  {copied
                    ? (lang === 'es' ? 'Copiado' : 'Copied')
                    : (lang === 'es' ? 'Copiar enlace' : 'Copy link')}
                </span>
              </button>
              <a
                href={`https://wallet.bliquid.xyz/dashboard/dapps?blc=${encodeURIComponent(blConnectModal.uri)}`}
                target="_blank"
                rel="noreferrer"
                className="bg-surface-2 hover:bg-surface-3 text-ink font-medium text-[12px] py-2.5 px-3 rounded-full transition-colors flex items-center justify-center gap-1.5"
              >
                <span>{lang === 'es' ? 'Abrir web' : 'Open web'}</span>
                <ExternalLink className="w-3.5 h-3.5 text-ink-3" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* LAZY LOADED SUB-VIEWS WRAPPER */}
      <ViewErrorBoundary key={mainView}>
      <Suspense fallback={
        <div className="flex-1 flex flex-col items-center justify-center min-h-[55vh] w-full">
          <div className="heartbeat-wrapper scale-90">
            <div className="heartbeat-glow"></div>
            <div className="heartbeat-ring"></div>
          </div>
        </div>
      }>
        {/* DOCUMENTATION VIEW */}
        {mainView === 'docs' && (
        <main className="flex-1 p-4 sm:p-6 max-w-[1240px] w-full mx-auto animate-in fade-in zoom-in duration-300 pb-28 md:pb-12 text-left">
          <DocsView 
            lang={lang}
            platformNetwork={platformNetwork}
            setPlatformNetwork={setPlatformNetwork}
            onLaunchApp={() => setMainView('bridge')}
            onOpenWhitepaper={() => setMainView('whitepaper')}
            showToast={showToast}
            networks={PLATFORM_NETWORKS}
          />
        </main>
      )}

      {/* LANDING PAGE VIEW */}
      {mainView === 'gateway' && (
        <LandingPage 
          onLaunchApp={() => setMainView('bridge')}
          onOpenDocs={() => setMainView('docs')}
          onOpenWhitepaper={() => setMainView('whitepaper')}
          lang={lang}
        />
      )}

      {/* BRIDGE SWAP VIEW */}
      {mainView === 'bridge' && (
        <main className="flex-1 flex flex-col items-center justify-start md:justify-center p-4 sm:p-6 w-full max-w-7xl mx-auto pb-28 md:pb-12">
          <BridgeSwap
            userContext={userContext}
            userAddress={userContext?.address || ''}
            bchAddress={bchWallet?.tokenAddress || bchWallet?.address || ''}
            bchQueryAddress={bchWallet?.queryAddress || bchWallet?.address || ''}
            bchWalletName={bchWallet?.provider || ''}
            bchWalletSource={bchWallet?.source}
            evmAddress={evmWallet?.address || userContext?.evmAddress || ''}
            solanaAddress={solanaWallet?.address || ''}
            solanaSource={solanaWallet?.source}
            tonAddress={tonWallet?.address || ''}
            ltcAddress={ltcWallet?.address || ''}
            walletBalances={walletBalances}
            onRefreshBalances={() => refreshWalletBalances()}
            onConnectWallet={() => setShowWalletModal(true)}
            showToast={showToast}
            backendUrl=""
            onOpenLanding={() => setMainView('gateway')}
            lang={lang}
            platformNetwork={platformNetwork}
            onToggleNetwork={setPlatformNetwork}
            wizardConnectManager={wc.manager}
            wizardConnectState={wc.state}
            authToken={authToken}
            onEnsureAuthSession={ensureAuthSession}
          />
        </main>
      )}

      {/* P2P NON-CUSTODIAL CASHSCRIPT ESCROW MARKETPLACE */}
      {mainView === 'p2p' && (
        <main className="flex-1 flex flex-col items-center justify-start p-4 sm:p-6 w-full max-w-7xl mx-auto pb-28 md:pb-12">
          <P2PView
            backendUrl=""
            bchAddress={bchWallet?.tokenAddress || bchWallet?.address || ''}
            bchWalletSource={bchWallet?.source}
            wizardConnectManager={wc.manager}
            platformNetwork={platformNetwork}
            onToggleNetwork={setPlatformNetwork}
            onRefreshBalances={() => refreshWalletBalances()}
            onConnectWallet={() => {
              setWalletModalTab('bch');
              setShowWalletModal(true);
            }}
            onOpenIdentity={() => setMainView('identity')}
            showToast={showToast}
            lang={lang}
          />
        </main>
      )}

      {/* PERPETUAL FUTURES (PERPS) DEX VIEW */}
      {mainView === 'perps' && (
        <main className="flex-1 flex flex-col items-center justify-start p-3 sm:p-5 w-full max-w-[1360px] mx-auto pb-28 md:pb-12 text-left">
          <PerpsView
            backendUrl=""
            userAddress={userContext?.address || ''}
            bchAddress={bchWallet?.tokenAddress || bchWallet?.address || ''}
            bchWalletSource={bchWallet?.source}
            evmAddress={evmWallet?.address || userContext?.evmAddress || ''}
            walletBalances={walletBalances}
            wizardConnectManager={wc.manager}
            wizardConnectState={wc.state}
            platformNetwork={platformNetwork}
            onToggleNetwork={setPlatformNetwork}
            onRefreshBalances={() => refreshWalletBalances()}
            onConnectWallet={() => setShowWalletModal(true)}
            showToast={showToast}
            lang={lang}
            authToken={authToken}
            onEnsureAuthSession={ensureAuthSession}
          />
        </main>
      )}

      {/* LIQUIDITY POOLS VIEW */}
      {mainView === 'pools' && (
        <main className="flex-1 flex flex-col items-center justify-start p-4 sm:p-6 w-full max-w-7xl mx-auto pb-28 md:pb-12">
          <PoolsView
            backendUrl=""
            userAddress={userContext?.address || ''}
            bchAddress={bchWallet?.tokenAddress || bchWallet?.address || ''}
            bchWalletSource={bchWallet?.source}
            evmAddress={evmWallet?.address || userContext?.evmAddress || ''}
            walletBalances={walletBalances}
            wizardConnectManager={wc.manager}
            wizardConnectState={wc.state}
            platformNetwork={platformNetwork}
            onToggleNetwork={setPlatformNetwork}
            onRefreshBalances={() => refreshWalletBalances()}
            onConnectWallet={() => setShowWalletModal(true)}
            showToast={showToast}
            lang={lang}
            authToken={authToken}
            onEnsureAuthSession={ensureAuthSession}
          />
        </main>
      )}

      {/* LENDING & BCH COLLATERAL VAULTS VIEW */}
      {mainView === 'lend' && (
        <main className="flex-1 flex flex-col items-center justify-start p-4 sm:p-6 w-full max-w-7xl mx-auto pb-28 md:pb-12">
          <LendingView
            backendUrl=""
            userAddress={userContext?.address || ''}
            bchAddress={bchWallet?.tokenAddress || bchWallet?.address || ''}
            bchWalletSource={bchWallet?.source}
            evmAddress={evmWallet?.address || userContext?.evmAddress || ''}
            walletBalances={walletBalances}
            wizardConnectManager={wc.manager}
            wizardConnectState={wc.state}
            platformNetwork={platformNetwork}
            onToggleNetwork={setPlatformNetwork}
            onRefreshBalances={() => refreshWalletBalances()}
            isWalletConnected={Boolean(userContext?.address || bchWallet || evmWallet)}
            onConnectWallet={() => setShowWalletModal(true)}
            showToast={showToast}
            lang={lang}
            authToken={authToken}
            onEnsureAuthSession={ensureAuthSession}
          />
        </main>
      )}

      {/* PORTFOLIO VIEW (Live On-Chain Net Worth, Tokens, Pools, Lend, Perps, Activity) */}
      {mainView === 'portfolio' && (
        <main className="flex-1 flex flex-col items-center justify-start p-3 sm:p-6 w-full max-w-7xl mx-auto pb-28 md:pb-12 text-left">
          <PortfolioView
            backendUrl=""
            userAddress={userContext?.address || ''}
            bchAddress={bchWallet?.queryAddress || bchWallet?.tokenAddress || bchWallet?.address || ''}
            evmAddress={evmWallet?.address || userContext?.evmAddress || ''}
            solanaAddress={solanaWallet?.address || ''}
            tonAddress={tonWallet?.address || ''}
            ltcAddress={ltcWallet?.address || ''}
            walletBalances={walletBalances}
            platformNetwork={platformNetwork}
            onToggleNetwork={setPlatformNetwork}
            onRefreshBalances={() => refreshWalletBalances()}
            onConnectWallet={() => setShowWalletModal(true)}
            onNavigate={(view) => setMainView(view)}
            showToast={showToast}
            lang={lang}
          />
        </main>
      )}

      {/* SOVEREIGN IDENTITY VIEW (Paytaca $500 PUSD Bounty PoC) */}
      {mainView === 'identity' && (
        <main className="flex-1 flex flex-col items-center justify-start p-3 sm:p-6 w-full max-w-7xl mx-auto pb-28 md:pb-12 text-left">
          <IdentityView
            bchWallet={bchWallet}
            onConnectBch={() => { setWalletModalTab('bch'); setShowWalletModal(true); }}
            lang={lang}
            platformNetwork={platformNetwork}
            onToggleNetwork={setPlatformNetwork}
          />
        </main>
      )}

      {/* DEVELOPER PORTAL & SDK VIEW */}
      {mainView === 'sdk' && (
        <main className="flex-1 p-4 sm:p-6 max-w-[1240px] w-full mx-auto animate-in fade-in zoom-in duration-300 pb-28 md:pb-12 text-left">
          <SdkView
            lang={lang}
            onNavigateToIdentity={() => setMainView('identity')}
            onBackToSwap={() => setMainView('bridge')}
            showToast={showToast}
          />
        </main>
      )}

      {/* WHITEPAPER VIEW (Formal Cross-Chain Architecture & Covenants) */}
      {mainView === 'whitepaper' && (
        <main className="flex-1 p-4 sm:p-6 max-w-[1240px] w-full mx-auto animate-in fade-in zoom-in duration-300 pb-28 md:pb-12 text-left">
          <WhitepaperView
            lang={lang}
            onChangeLang={(l) => setLang(l)}
            onOpenSdk={() => setMainView('sdk')}
            onOpenSwap={() => setMainView('bridge')}
            onOpenPools={() => setMainView('pools')}
            showToast={showToast}
          />
        </main>
      )}
      </Suspense>
      </ViewErrorBoundary>

      {/* PROFESSIONAL MULTI-CHAIN ACCOUNT & PORTFOLIO MODAL */}
      <AnimatePresence>
        {showAccountModal && userContext && (
          <div className="fixed inset-0 bg-black/45 dark:bg-black/70 backdrop-blur-sm z-[130] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              className="bg-surface rounded-[28px] p-5 sm:p-6 w-full max-w-[440px] shadow-[0_24px_60px_-15px_rgba(0,0,0,0.22)] border border-line/60 relative text-left my-auto max-h-[90vh] flex flex-col"
            >
              {/* Close Button */}
              <button 
                onClick={() => setShowAccountModal(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-surface-2 hover:bg-surface-3 text-ink-3 hover:text-ink flex items-center justify-center transition-colors cursor-pointer"
                title={lang === 'es' ? 'Cerrar' : 'Close'}
              >
                <X className="w-4 h-4" />
              </button>

              {/* Modal Top Header */}
              <div className="mb-4 pr-8">
                <h3 className="text-[18px] font-semibold tracking-[-0.02em] text-ink">
                  {t.accountTitle}
                </h3>
                <span className="text-[12px] text-ink-3 flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>{platformNetwork === 'testnet' ? 'Chipnet · Testnets' : 'Mainnet'}</span>
                </span>
              </div>

              {/* Portfolio Value Summary Card */}
              <div className="p-4 rounded-[20px] bg-surface-2 mb-4 relative overflow-hidden">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] font-medium text-ink-3">
                    {t.portfolioValue}
                  </span>
                  <button
                    onClick={() => refreshWalletBalances()}
                    disabled={balancesLoading}
                    className="text-[12px] font-medium text-ink-2 hover:text-ink flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <RefreshCw className={`w-3 h-3 ${balancesLoading ? 'animate-spin' : ''}`} />
                    <span>{balancesLoading ? t.refreshing : t.refresh}</span>
                  </button>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-[28px] font-semibold text-ink tracking-[-0.02em] tabular-nums">
                    ${estimatedPortfolioUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[12px] font-medium text-ink-3">USD</span>
                </div>
              </div>

              {/* Segmented Mode Selector: [Wallets (X/5)] | [Balances] */}
              <div className="grid grid-cols-2 p-1 bg-surface-2 rounded-full text-[12px] font-medium mb-4 gap-1">
                <button
                  type="button"
                  onClick={() => setAccountModalTab('wallets')}
                  className={`py-1.5 px-3 rounded-full transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    accountModalTab === 'wallets'
                      ? 'bg-surface text-ink shadow-soft font-semibold'
                      : 'text-ink-3 hover:text-ink'
                  }`}
                >
                  <span>{t.tabWallets}</span>
                  <span className="text-[11px] text-ink-3 tabular-nums">
                    {[bchWallet, evmWallet, solanaWallet, tonWallet, ltcWallet].filter(Boolean).length}/5
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setAccountModalTab('balances')}
                  className={`py-1.5 px-3 rounded-full transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    accountModalTab === 'balances'
                      ? 'bg-surface text-ink shadow-soft font-semibold'
                      : 'text-ink-3 hover:text-ink'
                  }`}
                >
                  <span>{t.tabBalances}</span>
                </button>
              </div>

              {/* TAB CONTENT (Scrollable body) */}
              <div className="overflow-y-auto pr-1 flex-1 space-y-3 custom-scrollbar max-h-[50vh]">
                {accountModalTab === 'wallets' ? (
                  <>
                    {/* 1. BITCOIN CASH */}
                    <div className="p-3.5 rounded-2xl bg-surface-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <img src="/BCH.png" className="w-4 h-4 object-contain" alt="BCH" />
                          <span className="text-xs font-bold text-ink">
                            Bitcoin Cash <span className="text-[10px] text-ink-3 font-normal font-mono">({platformNetwork === 'testnet' ? 'Chipnet' : 'Mainnet'})</span>
                          </span>
                        </div>
                        {bchWallet && (
                          <span className="ui-badge ui-badge-success text-[10px]">
                            {bchWallet.provider}
                          </span>
                        )}
                      </div>
                      {bchWallet ? (
                        !isEditingBch ? (
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-xs text-ink truncate font-semibold" title={bchWallet.tokenAddress || bchWallet.address}>
                              {formatAddress(bchWallet.tokenAddress || bchWallet.address)}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              <a
                                href={getExplorerAddressUrl('bch', bchWallet.tokenAddress || bchWallet.address)}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-control hover:bg-surface-3 text-ink-3 hover:text-ink transition-colors cursor-pointer"
                                title={t.viewOnExplorer}
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                              <button
                                onClick={() => {
                                  setCustomBchInput(bchWallet.tokenAddress || bchWallet.address);
                                  setIsEditingBch(true);
                                }}
                                className="p-1.5 rounded-control hover:bg-surface-3 text-ink-3 hover:text-ink transition-colors cursor-pointer"
                                title={t.editAddress}
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => copyToClipboard(bchWallet.tokenAddress || bchWallet.address)}
                                className="p-1.5 rounded-control hover:bg-surface-3 text-ink-3 hover:text-ink transition-colors cursor-pointer"
                                title={t.copyAddr}
                              >
                                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                onClick={handleDisconnectBch}
                                className="p-1.5 rounded-control hover:bg-rose-500/10 text-rose-500 transition-colors cursor-pointer"
                                title={t.disconnectBch}
                              >
                                <LogOut className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2 mt-1">
                            <input
                              type="text"
                              value={customBchInput}
                              onChange={(e) => setCustomBchInput(e.target.value)}
                              placeholder={t.enterCashAddress}
                              className="w-full px-2.5 py-1.5 text-xs font-mono rounded-control bg-surface border border-line text-ink focus:outline-none focus:border-primary"
                              autoFocus
                            />
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => { setIsEditingBch(false); setCustomBchInput(''); }}
                                className="px-2.5 py-1 text-xs text-ink-3 hover:text-ink rounded-control hover:bg-surface-3 cursor-pointer"
                              >
                                {t.cancelEdit}
                              </button>
                              <button
                                onClick={() => handleSaveCustomBch(customBchInput)}
                                className="px-2.5 py-1 text-xs font-semibold text-white bg-primary hover:bg-primary-hover rounded-control cursor-pointer"
                              >
                                {t.saveAddress}
                              </button>
                            </div>
                          </div>
                        )
                      ) : (
                        <button
                          onClick={() => { setShowAccountModal(false); setWalletModalTab('bch'); setShowWalletModal(true); }}
                          className="w-full py-2 rounded-control bg-surface hover:bg-surface-3 border border-dashed border-line text-ink font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <span>{t.connectBchPrompt}</span>
                        </button>
                      )}
                    </div>

                    {/* 2. EVM (POLYGON & BSC) */}
                    <div className="p-3.5 rounded-2xl bg-surface-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <img src="/POL.png" className="w-4 h-4 object-contain" alt="POL" />
                          <img src="/BNB.png" className="w-4 h-4 object-contain -ml-2.5 border border-surface-2 rounded-full" alt="BNB" />
                          <span className="text-xs font-bold text-ink">
                            EVM Multi-Chain <span className="text-[10px] text-ink-3 font-normal font-mono">(Polygon & BSC)</span>
                          </span>
                        </div>
                        {evmWallet && (
                          <span className="ui-badge text-[10px]">
                            {evmWallet.provider}
                          </span>
                        )}
                      </div>
                      {evmWallet ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-xs text-ink truncate font-semibold" title={evmWallet.address}>
                              {formatAddress(evmWallet.address)}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              <a
                                href={getExplorerAddressUrl('evm', evmWallet.address)}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-control hover:bg-surface-3 text-ink-3 hover:text-ink transition-colors cursor-pointer"
                                title={t.viewOnExplorer}
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                              <button
                                onClick={() => copyToClipboard(evmWallet.address)}
                                className="p-1.5 rounded-control hover:bg-surface-3 text-ink-3 hover:text-ink transition-colors cursor-pointer"
                                title={t.copyAddr}
                              >
                                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                onClick={handleDisconnectEvm}
                                className="p-1.5 rounded-control hover:bg-rose-500/10 text-rose-500 transition-colors cursor-pointer"
                                title={t.disconnectEvm}
                              >
                                <LogOut className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* 1-Click Switch to Polygon Amoy (80002) or Polygon Mainnet (137) if mismatched */}
                          {((platformNetwork === 'testnet' && evmWallet.chainId !== 80002) ||
                            (platformNetwork === 'mainnet' && evmWallet.chainId !== 137)) && (
                            <button
                              disabled={isSwitchingChain}
                              onClick={async () => {
                                setIsSwitchingChain(true);
                                try {
                                  const nextId = await switchEvmNetwork(platformNetwork === 'testnet');
                                  setEvmWallet(prev => (prev ? { ...prev, chainId: nextId } : null));
                                  showToast(
                                    platformNetwork === 'testnet'
                                      ? (lang === 'es' ? 'Red cambiada a Polygon Amoy Testnet (80002)' : 'Network switched to Polygon Amoy Testnet (80002)')
                                      : (lang === 'es' ? 'Red cambiada a Polygon PoS (137)' : 'Network switched to Polygon PoS (137)')
                                  );
                                } catch (e: any) {
                                  showToast(e?.message || (lang === 'es' ? 'Error al cambiar de red' : 'Error switching network'), 'error');
                                } finally {
                                  setIsSwitchingChain(false);
                                }
                              }}
                              className="w-full py-1.5 px-2.5 rounded-control bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold text-[11px] transition-colors cursor-pointer"
                            >
                              {isSwitchingChain
                                ? t.switchingNetwork
                                : `${t.switchNetworkPrompt} ${platformNetwork === 'testnet' ? 'Polygon Amoy (80002)' : 'Polygon PoS (137)'}`}
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => { setShowAccountModal(false); setWalletModalTab('evm'); setShowWalletModal(true); }}
                          className="w-full py-2 rounded-control bg-surface hover:bg-surface-3 border border-dashed border-line text-ink font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <span>{t.connectEvmPrompt}</span>
                        </button>
                      )}
                    </div>

                    {/* 3. SOLANA (SVM) */}
                    <div className="p-3.5 rounded-2xl bg-surface-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <img src="/SOL.png" className="w-4 h-4 object-contain" alt="SOL" />
                          <span className="text-xs font-bold text-ink">
                            Solana <span className="text-[10px] text-ink-3 font-normal font-mono">({platformNetwork === 'testnet' ? 'Devnet' : 'Mainnet-Beta'})</span>
                          </span>
                        </div>
                        {solanaWallet && (
                          <span className="ui-badge text-[10px]">
                            {solanaWallet.provider}
                          </span>
                        )}
                      </div>
                      {solanaWallet ? (
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs text-ink truncate font-semibold" title={solanaWallet.address}>
                            {formatAddress(solanaWallet.address)}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <a
                              href={getExplorerAddressUrl('solana', solanaWallet.address)}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-control hover:bg-surface-3 text-ink-3 hover:text-ink transition-colors cursor-pointer"
                              title={t.viewOnExplorer}
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                            <button
                              onClick={() => copyToClipboard(solanaWallet.address)}
                              className="p-1.5 rounded-control hover:bg-surface-3 text-ink-3 hover:text-ink transition-colors cursor-pointer"
                              title={t.copyAddr}
                            >
                              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={handleDisconnectSolana}
                              className="p-1.5 rounded-control hover:bg-rose-500/10 text-rose-500 transition-colors cursor-pointer"
                              title={t.disconnectSolana}
                            >
                              <LogOut className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setShowAccountModal(false); setWalletModalTab('solana'); setShowWalletModal(true); }}
                          className="w-full py-2 rounded-control bg-surface hover:bg-surface-3 border border-dashed border-line text-ink font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <span>{t.connectSolanaPrompt}</span>
                        </button>
                      )}
                    </div>

                    {/* 4. TON BLOCKCHAIN */}
                    <div className="p-3.5 rounded-2xl bg-surface-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <img src="/TON.png" className="w-4 h-4 object-contain" alt="TON" />
                          <span className="text-xs font-bold text-ink">
                            TON Blockchain <span className="text-[10px] text-ink-3 font-normal font-mono">(TVM & Jetton)</span>
                          </span>
                        </div>
                        {tonWallet && (
                          <span className="ui-badge text-[10px]">
                            {tonWallet.provider}
                          </span>
                        )}
                      </div>
                      {tonWallet ? (
                        !isEditingTon ? (
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-xs text-ink truncate font-semibold" title={tonWallet.address}>
                              {formatAddress(tonWallet.address)}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              <a
                                href={getExplorerAddressUrl('ton', tonWallet.address)}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-control hover:bg-surface-3 text-ink-3 hover:text-ink transition-colors cursor-pointer"
                                title={t.viewOnExplorer}
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                              <button
                                onClick={() => {
                                  setCustomTonInput(tonWallet.address);
                                  setIsEditingTon(true);
                                }}
                                className="p-1.5 rounded-control hover:bg-surface-3 text-ink-3 hover:text-ink transition-colors cursor-pointer"
                                title={t.editAddress}
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => copyToClipboard(tonWallet.address)}
                                className="p-1.5 rounded-control hover:bg-surface-3 text-ink-3 hover:text-ink transition-colors cursor-pointer"
                                title={t.copyAddr}
                              >
                                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                onClick={handleDisconnectTon}
                                className="p-1.5 rounded-control hover:bg-rose-500/10 text-rose-500 transition-colors cursor-pointer"
                                title={t.disconnectTon}
                              >
                                <LogOut className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2 mt-1">
                            <input
                              type="text"
                              value={customTonInput}
                              onChange={(e) => setCustomTonInput(e.target.value)}
                              placeholder="EQ... o UQ..."
                              className="w-full px-2.5 py-1.5 text-xs font-mono rounded-control bg-surface border border-line text-ink focus:outline-none focus:border-primary"
                              autoFocus
                            />
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => { setIsEditingTon(false); setCustomTonInput(''); }}
                                className="px-2.5 py-1 text-xs text-ink-3 hover:text-ink rounded-control hover:bg-surface-3 cursor-pointer"
                              >
                                {t.cancelEdit}
                              </button>
                              <button
                                onClick={() => handleSaveCustomTon(customTonInput)}
                                className="px-2.5 py-1 text-xs font-semibold text-white bg-primary hover:bg-primary-hover rounded-control cursor-pointer"
                              >
                                {t.saveAddress}
                              </button>
                            </div>
                          </div>
                        )
                      ) : (
                        <button
                          onClick={() => { setShowAccountModal(false); setWalletModalTab('ton'); setShowWalletModal(true); }}
                          className="w-full py-2 rounded-control bg-surface hover:bg-surface-3 border border-dashed border-line text-ink font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <span>{t.connectTonPrompt}</span>
                        </button>
                      )}
                    </div>

                    {/* 5. LITECOIN */}
                    <div className="p-3.5 rounded-2xl bg-surface-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <img src="/LTC.png" className="w-4 h-4 object-contain" alt="LTC" />
                          <span className="text-xs font-bold text-ink">
                            Litecoin <span className="text-[10px] text-ink-3 font-normal font-mono">(Native SegWit)</span>
                          </span>
                        </div>
                        {ltcWallet && (
                          <span className="ui-badge text-[10px]">
                            {ltcWallet.provider}
                          </span>
                        )}
                      </div>
                      {ltcWallet ? (
                        !isEditingLtc ? (
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-xs text-ink truncate font-semibold" title={ltcWallet.address}>
                              {formatAddress(ltcWallet.address)}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              <a
                                href={getExplorerAddressUrl('ltc', ltcWallet.address)}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-control hover:bg-surface-3 text-ink-3 hover:text-ink transition-colors cursor-pointer"
                                title={t.viewOnExplorer}
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                              <button
                                onClick={() => {
                                  setCustomLtcInput(ltcWallet.address);
                                  setIsEditingLtc(true);
                                }}
                                className="p-1.5 rounded-control hover:bg-surface-3 text-ink-3 hover:text-ink transition-colors cursor-pointer"
                                title={t.editAddress}
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => copyToClipboard(ltcWallet.address)}
                                className="p-1.5 rounded-control hover:bg-surface-3 text-ink-3 hover:text-ink transition-colors cursor-pointer"
                                title={t.copyAddr}
                              >
                                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                onClick={handleDisconnectLtc}
                                className="p-1.5 rounded-control hover:bg-rose-500/10 text-rose-500 transition-colors cursor-pointer"
                                title={t.disconnectLtc}
                              >
                                <LogOut className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2 mt-1">
                            <input
                              type="text"
                              value={customLtcInput}
                              onChange={(e) => setCustomLtcInput(e.target.value)}
                              placeholder="ltc1... o tltc1..."
                              className="w-full px-2.5 py-1.5 text-xs font-mono rounded-control bg-surface border border-line text-ink focus:outline-none focus:border-primary"
                              autoFocus
                            />
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => { setIsEditingLtc(false); setCustomLtcInput(''); }}
                                className="px-2.5 py-1 text-xs text-ink-3 hover:text-ink rounded-control hover:bg-surface-3 cursor-pointer"
                              >
                                {t.cancelEdit}
                              </button>
                              <button
                                onClick={() => handleSaveCustomLtc(customLtcInput)}
                                className="px-2.5 py-1 text-xs font-semibold text-white bg-primary hover:bg-primary-hover rounded-control cursor-pointer"
                              >
                                {t.saveAddress}
                              </button>
                            </div>
                          </div>
                        )
                      ) : (
                        <button
                          onClick={() => { setShowAccountModal(false); setWalletModalTab('ltc'); setShowWalletModal(true); }}
                          className="w-full py-2 rounded-control bg-surface hover:bg-surface-3 border border-dashed border-line text-ink font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <span>{t.connectLtcPrompt}</span>
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  /* TAB 2: MULTI-CHAIN BALANCES & ASSETS BREAKDOWN */
                  <div className="space-y-3">
                    {/* STABLECOINS */}
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-ink-3 mb-1.5 px-0.5">
                        {lang === 'es' ? 'Dólares y Monedas Estables' : 'Stablecoins & Dollar Assets'}
                      </div>
                      <div className="space-y-1.5">
                        {/* PUSD (BCH CashTokens) */}
                        <div className="px-3 py-2.5 rounded-2xl bg-surface-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <img src="/PUSD.png" className="w-6 h-6 rounded-full object-contain" alt="PUSD" />
                            <div>
                              <div className="text-xs font-bold text-ink flex items-center gap-1.5">
                                <span>PUSD</span>
                                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
                                  CashTokens
                                </span>
                              </div>
                              <span className="text-[10px] text-ink-3">ParyonUSD Stablecoin</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              {bchWallet ? formatCryptoBalance(walletBalances.PUSD, false) : '--'}
                            </div>
                            <span className="text-[10px] font-mono text-ink-3">
                              {bchWallet ? `~$${((walletBalances.PUSD || 0) * (oraclePrices.PUSD ?? 1.0)).toFixed(2)} USD` : (lang === 'es' ? 'Conecta BCH' : 'Connect BCH')}
                            </span>
                          </div>
                        </div>

                        {/* USDT (Polygon) */}
                        <div className="px-3 py-2.5 rounded-2xl bg-surface-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <img src="/USDT.png" className="w-6 h-6 rounded-full object-contain" alt="USDT Polygon" />
                            <div>
                              <div className="text-xs font-bold text-ink flex items-center gap-1.5">
                                <span>USDT</span>
                                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-mono font-semibold">
                                  Polygon PoS
                                </span>
                              </div>
                              <span className="text-[10px] text-ink-3">Tether USD (ERC-20)</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-mono font-bold text-ink">
                              {evmWallet ? formatCryptoBalance(walletBalances.USDT, false) : '--'}
                            </div>
                            <span className="text-[10px] font-mono text-ink-3">
                              {evmWallet ? `~$${((walletBalances.USDT || 0) * (oraclePrices.USDT ?? 1.0)).toFixed(2)} USD` : (lang === 'es' ? 'Conecta EVM' : 'Connect EVM')}
                            </span>
                          </div>
                        </div>

                        {/* USDT (BNB Chain) */}
                        <div className="px-3 py-2.5 rounded-2xl bg-surface-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <img src="/USDT.png" className="w-6 h-6 rounded-full object-contain" alt="USDT BSC" />
                            <div>
                              <div className="text-xs font-bold text-ink flex items-center gap-1.5">
                                <span>USDT</span>
                                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono font-semibold">
                                  BNB BEP-20
                                </span>
                              </div>
                              <span className="text-[10px] text-ink-3">Tether USD (BNB Smart Chain)</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-mono font-bold text-ink">
                              {evmWallet ? formatCryptoBalance(walletBalances.USDT_BSC ?? 0, false) : '--'}
                            </div>
                            <span className="text-[10px] font-mono text-ink-3">
                              {evmWallet ? `~$${((walletBalances.USDT_BSC || 0) * (oraclePrices.USDT_BSC ?? 1.0)).toFixed(2)} USD` : (lang === 'es' ? 'Conecta EVM' : 'Connect EVM')}
                            </span>
                          </div>
                        </div>

                        {/* USDT (Solana) */}
                        <div className="px-3 py-2.5 rounded-2xl bg-surface-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <img src="/USDT.png" className="w-6 h-6 rounded-full object-contain" alt="USDT Solana" />
                            <div>
                              <div className="text-xs font-bold text-ink flex items-center gap-1.5">
                                <span>USDT</span>
                                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-mono font-semibold">
                                  Solana SPL
                                </span>
                              </div>
                              <span className="text-[10px] text-ink-3">Tether USD (SVM)</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-mono font-bold text-ink">
                              {solanaWallet ? formatCryptoBalance(walletBalances.USDT_SOL ?? 0, false) : '--'}
                            </div>
                            <span className="text-[10px] font-mono text-ink-3">
                              {solanaWallet ? `~$${((walletBalances.USDT_SOL || 0) * (oraclePrices.USDT_SOL ?? 1.0)).toFixed(2)} USD` : (lang === 'es' ? 'Conecta SOL' : 'Connect SOL')}
                            </span>
                          </div>
                        </div>

                        {/* USDT (TON Jetton) */}
                        <div className="px-3 py-2.5 rounded-2xl bg-surface-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <img src="/USDT.png" className="w-6 h-6 rounded-full object-contain" alt="USDT TON" />
                            <div>
                              <div className="text-xs font-bold text-ink flex items-center gap-1.5">
                                <span>USDT</span>
                                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 font-mono font-semibold">
                                  TON Jetton
                                </span>
                              </div>
                              <span className="text-[10px] text-ink-3">Tether USD (The Open Network)</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-mono font-bold text-ink">
                              {tonWallet ? formatCryptoBalance(walletBalances.USDT_TON ?? 0, false) : '--'}
                            </div>
                            <span className="text-[10px] font-mono text-ink-3">
                              {tonWallet ? `~$${((walletBalances.USDT_TON || 0) * (oraclePrices.USDT_TON ?? 1.0)).toFixed(2)} USD` : (lang === 'es' ? 'Conecta TON' : 'Connect TON')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* NATIVE GAS ASSETS */}
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-ink-3 mb-1.5 px-0.5">
                        {lang === 'es' ? 'Criptomonedas Nativas (Gas)' : 'Native Layer-1 Assets (Gas)'}
                      </div>
                      <div className="space-y-1.5">
                        {/* BCH */}
                        <div className="px-3 py-2.5 rounded-2xl bg-surface-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <img src="/BCH.png" className="w-6 h-6 rounded-full object-contain" alt="BCH" />
                            <div>
                              <div className="text-xs font-bold text-ink">
                                {platformNetwork === 'testnet' ? 'tBCH (Chipnet)' : 'BCH (Native)'}
                              </div>
                              <span className="text-[10px] text-ink-3">Bitcoin Cash</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-mono font-bold text-ink">
                              {bchWallet ? formatCryptoBalance(walletBalances.BCH, true) : '--'}
                            </div>
                            <span className="text-[10px] font-mono text-ink-3">
                              {bchWallet ? `~$${((walletBalances.BCH || 0) * (oraclePrices.BCH ?? 480)).toFixed(2)} USD` : ''}
                            </span>
                          </div>
                        </div>

                        {/* POL */}
                        <div className="px-3 py-2.5 rounded-2xl bg-surface-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <img src="/POL.png" className="w-6 h-6 rounded-full object-contain" alt="POL" />
                            <div>
                              <div className="text-xs font-bold text-ink">POL (Native)</div>
                              <span className="text-[10px] text-ink-3">Polygon Ecosystem Token</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-mono font-bold text-ink">
                              {evmWallet ? formatCryptoBalance(walletBalances.POL, true) : '--'}
                            </div>
                            <span className="text-[10px] font-mono text-ink-3">
                              {evmWallet ? `~$${((walletBalances.POL || 0) * (oraclePrices.POL ?? 0.45)).toFixed(2)} USD` : ''}
                            </span>
                          </div>
                        </div>

                        {/* BNB */}
                        <div className="px-3 py-2.5 rounded-2xl bg-surface-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <img src="/BNB.png" className="w-6 h-6 rounded-full object-contain" alt="BNB" />
                            <div>
                              <div className="text-xs font-bold text-ink">BNB (Native)</div>
                              <span className="text-[10px] text-ink-3">BNB Smart Chain Gas</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-mono font-bold text-ink">
                              {evmWallet ? formatCryptoBalance(walletBalances.BNB ?? 0, true) : '--'}
                            </div>
                            <span className="text-[10px] font-mono text-ink-3">
                              {evmWallet ? `~$${((walletBalances.BNB || 0) * (oraclePrices.BNB ?? 620)).toFixed(2)} USD` : ''}
                            </span>
                          </div>
                        </div>

                        {/* SOL */}
                        <div className="px-3 py-2.5 rounded-2xl bg-surface-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <img src="/SOL.png" className="w-6 h-6 rounded-full object-contain" alt="SOL" />
                            <div>
                              <div className="text-xs font-bold text-ink">SOL (Native)</div>
                              <span className="text-[10px] text-ink-3">Solana Network</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-mono font-bold text-ink">
                              {solanaWallet ? formatCryptoBalance(walletBalances.SOL ?? 0, true) : '--'}
                            </div>
                            <span className="text-[10px] font-mono text-ink-3">
                              {solanaWallet ? `~$${((walletBalances.SOL || 0) * (oraclePrices.SOL ?? 180)).toFixed(2)} USD` : ''}
                            </span>
                          </div>
                        </div>

                        {/* TON */}
                        <div className="px-3 py-2.5 rounded-2xl bg-surface-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <img src="/TON.png" className="w-6 h-6 rounded-full object-contain" alt="TON" />
                            <div>
                              <div className="text-xs font-bold text-ink">TON (Native)</div>
                              <span className="text-[10px] text-ink-3">The Open Network</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-mono font-bold text-ink">
                              {tonWallet ? formatCryptoBalance(walletBalances.TON ?? 0, true) : '--'}
                            </div>
                            <span className="text-[10px] font-mono text-ink-3">
                              {tonWallet ? `~$${((walletBalances.TON || 0) * (oraclePrices.TON ?? 5.2)).toFixed(2)} USD` : ''}
                            </span>
                          </div>
                        </div>

                        {/* LTC */}
                        <div className="px-3 py-2.5 rounded-2xl bg-surface-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <img src="/LTC.png" className="w-6 h-6 rounded-full object-contain" alt="LTC" />
                            <div>
                              <div className="text-xs font-bold text-ink">LTC (Native)</div>
                              <span className="text-[10px] text-ink-3">Litecoin SegWit</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-mono font-bold text-ink">
                              {ltcWallet ? formatCryptoBalance(walletBalances.LTC ?? 0, true) : '--'}
                            </div>
                            <span className="text-[10px] font-mono text-ink-3">
                              {ltcWallet ? `~$${((walletBalances.LTC || 0) * (oraclePrices.LTC ?? 85)).toFixed(2)} USD` : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="pt-3 mt-3 border-t border-line/60 shrink-0">
                <button 
                  onClick={() => { handleDisconnect(); setShowAccountModal(false); }}
                  className="w-full py-2.5 rounded-full bg-surface-2 hover:bg-rose-500/10 text-rose-500 font-semibold text-[13px] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{t.disconnectAll}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MULTI-CHAIN WALLET SELECTOR MODAL (BCH, EVM, SOLANA, TON, LITECOIN) */}
      <AnimatePresence>
        {showWalletModal && (
          <div className="fixed inset-0 bg-black/45 dark:bg-black/70 backdrop-blur-sm z-[130] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              className="bg-surface rounded-[28px] p-5 sm:p-6 w-full max-w-[390px] sm:max-w-[400px] shadow-[0_24px_60px_-15px_rgba(0,0,0,0.22)] border border-line/60 relative text-left my-auto"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => { setShowManualWalletInput(false); setShowWalletModal(false); }}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-surface-2 hover:bg-surface-3 text-ink-3 hover:text-ink flex items-center justify-center transition-colors cursor-pointer"
                title={lang === 'es' ? 'Cerrar' : 'Close'}
              >
                <X className="w-4 h-4" />
              </button>

              {/* Header */}
              <div className="mb-4 pr-8">
                <h3 className="text-[18px] font-semibold tracking-[-0.02em] text-ink">
                  {t.modalConnectTitle}
                </h3>
              </div>

              {/* Segmented Network Switcher: [EVM] | [BCH] | [SOL] | [TON] | [LTC] */}
              <div className="grid grid-cols-5 p-1 bg-surface-2 rounded-full text-[11px] font-medium mb-4 gap-1">
                <button
                  type="button"
                  onClick={() => { setWalletModalTab('evm'); setShowManualWalletInput(false); }}
                  className={`py-1.5 px-1 rounded-full transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    walletModalTab === 'evm'
                      ? 'bg-surface text-ink shadow-soft font-semibold'
                      : 'text-ink-3 hover:text-ink'
                  }`}
                  title="EVM (Polygon & BSC)"
                >
                  <img src="/POL.png" className="w-3.5 h-3.5 object-contain shrink-0" alt="EVM" />
                  <span className="truncate">EVM</span>
                  {evmWallet && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />}
                </button>

                <button
                  type="button"
                  onClick={() => { setWalletModalTab('bch'); setShowManualWalletInput(false); }}
                  className={`py-1.5 px-1 rounded-full transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    walletModalTab === 'bch'
                      ? 'bg-surface text-ink shadow-soft font-semibold'
                      : 'text-ink-3 hover:text-ink'
                  }`}
                  title="Bitcoin Cash"
                >
                  <img src="/BCH.png" className="w-3.5 h-3.5 object-contain shrink-0" alt="BCH" />
                  <span className="truncate">BCH</span>
                  {bchWallet && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />}
                </button>

                <button
                  type="button"
                  onClick={() => { setWalletModalTab('solana'); setShowManualWalletInput(false); }}
                  className={`py-1.5 px-1 rounded-full transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    walletModalTab === 'solana'
                      ? 'bg-surface text-ink shadow-soft font-semibold'
                      : 'text-ink-3 hover:text-ink'
                  }`}
                  title="Solana"
                >
                  <img src="/SOL.png" className="w-3.5 h-3.5 object-contain shrink-0" alt="SOL" />
                  <span className="truncate">SOL</span>
                  {solanaWallet && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />}
                </button>

                <button
                  type="button"
                  onClick={() => { setWalletModalTab('ton'); setShowManualWalletInput(false); }}
                  className={`py-1.5 px-1 rounded-full transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    walletModalTab === 'ton'
                      ? 'bg-surface text-ink shadow-soft font-semibold'
                      : 'text-ink-3 hover:text-ink'
                  }`}
                  title="TON"
                >
                  <img src="/TON.png" className="w-3.5 h-3.5 object-contain shrink-0" alt="TON" />
                  <span className="truncate">TON</span>
                  {tonWallet && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />}
                </button>

                <button
                  type="button"
                  onClick={() => { setWalletModalTab('ltc'); setShowManualWalletInput(false); }}
                  className={`py-1.5 px-1 rounded-full transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    walletModalTab === 'ltc'
                      ? 'bg-surface text-ink shadow-soft font-semibold'
                      : 'text-ink-3 hover:text-ink'
                  }`}
                  title="Litecoin"
                >
                  <img src="/LTC.png" className="w-3.5 h-3.5 object-contain shrink-0" alt="LTC" />
                  <span className="truncate">LTC</span>
                  {ltcWallet && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />}
                </button>
              </div>

              {/* Wallet Options List */}
              <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-0.5 custom-scrollbar">
                {/* 1. EVM TAB */}
                {walletModalTab === 'evm' && (
                  <>
                    {discoveredEvmWallets.length > 0 ? (
                      discoveredEvmWallets.map((w) => (
                        <button
                          key={w.info.rdns}
                          type="button"
                          onClick={() => handleConnectWallet('injected', w.info.rdns)}
                          className="w-full flex items-center justify-between px-3.5 py-3 rounded-2xl bg-surface-2 hover:bg-surface-3 text-ink transition-colors group cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-surface flex items-center justify-center shrink-0 p-1.5 shadow-2xs">
                              <img src={w.info.icon} className="w-6 h-6 object-contain rounded" alt={w.info.name} />
                            </div>
                            <span className="text-[14px] font-semibold text-ink tracking-[-0.01em] truncate flex items-center gap-1.5">
                              {w.info.name}
                              {evmWallet?.source === 'injected' &&
                                (evmWallet.rdns ? evmWallet.rdns === w.info.rdns : evmWallet.provider === w.info.name) && (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                              )}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-medium">
                              {t.detected}
                            </span>
                            <ChevronRight className="w-4 h-4 text-ink-3 group-hover:text-ink transition-colors" />
                          </div>
                        </button>
                      ))
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleConnectWallet('injected')}
                        className="w-full flex items-center justify-between px-3.5 py-3 rounded-2xl bg-surface-2 hover:bg-surface-3 text-ink transition-colors group cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-surface flex items-center justify-center shrink-0 p-1.5 shadow-2xs">
                            <img src="/POL.png" className="w-6 h-6 object-contain" alt="Browser Wallet" />
                          </div>
                          <span className="text-[14px] font-semibold text-ink tracking-[-0.01em] flex items-center gap-1.5">
                            Browser Wallet
                            {evmWallet?.source === 'injected' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[12px] font-medium text-ink-3">MetaMask · Rabby</span>
                          <ChevronRight className="w-4 h-4 text-ink-3 group-hover:text-ink transition-colors" />
                        </div>
                      </button>
                    )}

                    {/* Official WalletConnect V2 EVM */}
                    <button
                      type="button"
                      onClick={() => handleConnectWallet('walletconnect')}
                      className="w-full flex items-center justify-between px-3.5 py-3 rounded-2xl bg-surface-2 hover:bg-surface-3 text-ink transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-surface flex items-center justify-center shrink-0 p-1.5 shadow-2xs">
                          <img
                            src="/Walletconnect-logo.png"
                            className="w-6 h-6 object-contain"
                            alt="WalletConnect"
                          />
                        </div>
                        <span className="text-[14px] font-semibold text-ink tracking-[-0.01em] flex items-center gap-1.5">
                          WalletConnect
                          {evmWallet?.source === 'wc2-evm' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[12px] font-medium text-ink-3">QR</span>
                        <ChevronRight className="w-4 h-4 text-ink-3 group-hover:text-ink transition-colors" />
                      </div>
                    </button>
                  </>
                )}

                {/* 2. BCH TAB */}
                {walletModalTab === 'bch' && (
                  <>
                    {/* BinaryLiquid Wallet (BlConnect) */}
                    <button
                      type="button"
                      onClick={openBlConnectModal}
                      className="w-full flex items-center justify-between px-3.5 py-3 rounded-2xl bg-surface-2 hover:bg-surface-3 border border-primary/25 text-ink transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-surface flex items-center justify-center shrink-0 p-1 shadow-2xs">
                          <img src="/logo.png" className="w-7 h-7 object-contain" alt="BinaryLiquid Wallet" />
                        </div>
                        <span className="text-[14px] font-semibold text-ink tracking-[-0.01em] flex items-center gap-1.5">
                          BinaryLiquid Wallet
                          {bchWallet?.source === 'blconnect' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium">
                          {lang === 'es' ? 'Instantánea' : 'Instant'}
                        </span>
                        <ChevronRight className="w-4 h-4 text-ink-3 group-hover:text-ink transition-colors" />
                      </div>
                    </button>

                    {/* WizardConnect */}
                    <button
                      type="button"
                      onClick={() => handleConnectWallet('paytaca')}
                      className="w-full flex items-center justify-between px-3.5 py-3 rounded-2xl bg-surface-2 hover:bg-surface-3 text-ink transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-surface flex items-center justify-center shrink-0 p-1.5 shadow-2xs">
                          <img src="/wizardconnect-logo.png" className="w-6 h-6 object-contain" alt="WizardConnect" />
                        </div>
                        <span className="text-[14px] font-semibold text-ink tracking-[-0.01em] flex items-center gap-1.5">
                          WizardConnect
                          {(bchWallet?.source === 'wizard' || bchWallet?.source === 'extension') && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {hasPaytacaExtension() ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-medium">
                            {t.detected}
                          </span>
                        ) : (
                          <span className="text-[12px] font-medium text-ink-3">QR</span>
                        )}
                        <ChevronRight className="w-4 h-4 text-ink-3 group-hover:text-ink transition-colors" />
                      </div>
                    </button>

                    {/* Collapsible Manual CashAddress */}
                    <button
                      type="button"
                      onClick={() => setShowManualWalletInput((v) => !v)}
                      className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-ink-3 hover:text-ink hover:bg-surface-2 transition-colors cursor-pointer text-[13px] font-medium"
                    >
                      <span>{lang === 'es' ? 'Pegar dirección BCH' : 'Paste BCH address'}</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${showManualWalletInput ? 'rotate-180' : ''}`} />
                    </button>

                    {showManualWalletInput && (
                      <div className="p-1.5 pl-3 rounded-2xl bg-surface-2 flex items-center gap-2">
                        <input
                          type="text"
                          value={customBchInput}
                          onChange={(e) => setCustomBchInput(e.target.value)}
                          placeholder={platformNetwork === 'testnet' ? 'bchtest:...' : 'bitcoincash:...'}
                          className="flex-1 min-w-0 bg-transparent text-[13px] font-mono text-ink placeholder:text-ink-3 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveCustomBch(customBchInput)}
                          className="px-4 py-2 text-[12px] font-semibold bg-ink text-canvas hover:opacity-90 rounded-full cursor-pointer shrink-0 transition-opacity"
                        >
                          {t.saveAddress}
                        </button>
                      </div>
                    )}
                  </>
                )}

                {/* 3. SOLANA TAB */}
                {walletModalTab === 'solana' && (
                  <>
                    {/* Phantom Wallet */}
                    <button
                      type="button"
                      onClick={() => handleConnectSolana('phantom')}
                      className="w-full flex items-center justify-between px-3.5 py-3 rounded-2xl bg-surface-2 hover:bg-surface-3 text-ink transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-surface flex items-center justify-center shrink-0 p-1.5 shadow-2xs">
                          <img src="/phantom.svg" className="w-6 h-6 object-contain rounded-lg" alt="Phantom" />
                        </div>
                        <span className="text-[14px] font-semibold text-ink tracking-[-0.01em] flex items-center gap-1.5">
                          Phantom
                          {solanaWallet?.provider === 'Phantom' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {typeof window !== 'undefined' && ((window as any)?.phantom?.solana || (window as any)?.solana?.isPhantom) ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-medium">
                            {t.detected}
                          </span>
                        ) : (
                          <span className="text-[12px] font-medium text-ink-3">{t.extension}</span>
                        )}
                        <ChevronRight className="w-4 h-4 text-ink-3 group-hover:text-ink transition-colors" />
                      </div>
                    </button>

                    {/* Solflare Wallet */}
                    <button
                      type="button"
                      onClick={() => handleConnectSolana('solflare')}
                      className="w-full flex items-center justify-between px-3.5 py-3 rounded-2xl bg-surface-2 hover:bg-surface-3 text-ink transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-surface flex items-center justify-center shrink-0 p-1.5 shadow-2xs">
                          <img src="/solflare.svg" className="w-6 h-6 object-contain rounded-lg" alt="Solflare" />
                        </div>
                        <span className="text-[14px] font-semibold text-ink tracking-[-0.01em] flex items-center gap-1.5">
                          Solflare
                          {solanaWallet?.provider === 'Solflare' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {typeof window !== 'undefined' && (window as any)?.solflare ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-medium">
                            {t.detected}
                          </span>
                        ) : (
                          <span className="text-[12px] font-medium text-ink-3">{t.extension}</span>
                        )}
                        <ChevronRight className="w-4 h-4 text-ink-3 group-hover:text-ink transition-colors" />
                      </div>
                    </button>
                  </>
                )}

                {/* 4. TON TAB */}
                {walletModalTab === 'ton' && (
                  <>
                    {/* Official TON Connect UI 2.0 (All Wallets + QR) */}
                    <button
                      type="button"
                      onClick={() => handleConnectTon('tonconnect')}
                      className="w-full flex items-center justify-between px-3.5 py-3 rounded-2xl bg-surface-2 hover:bg-surface-3 border border-sky-500/25 text-ink transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-surface flex items-center justify-center shrink-0 p-1.5 shadow-2xs">
                          <img src="/TON.png" className="w-6 h-6 object-contain" alt="TON Connect" />
                        </div>
                        <span className="text-[14px] font-semibold text-ink tracking-[-0.01em] flex items-center gap-1.5">
                          TON Connect
                          {tonWallet?.source === 'tonconnect' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 text-[11px] font-medium">
                          QR · App
                        </span>
                        <ChevronRight className="w-4 h-4 text-ink-3 group-hover:text-ink transition-colors" />
                      </div>
                    </button>

                    {/* Tonkeeper Direct QR / Extension via TON Connect */}
                    <button
                      type="button"
                      onClick={() => handleConnectTon('Tonkeeper')}
                      className="w-full flex items-center justify-between px-3.5 py-3 rounded-2xl bg-surface-2 hover:bg-surface-3 text-ink transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-surface flex items-center justify-center shrink-0 p-1.5 shadow-2xs">
                          <img src="/TON.png" className="w-6 h-6 object-contain" alt="Tonkeeper" />
                        </div>
                        <span className="text-[14px] font-semibold text-ink tracking-[-0.01em] flex items-center gap-1.5">
                          Tonkeeper
                          {tonWallet?.provider?.toLowerCase().includes('tonkeeper') && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[12px] font-medium text-ink-3">QR</span>
                        <ChevronRight className="w-4 h-4 text-ink-3 group-hover:text-ink transition-colors" />
                      </div>
                    </button>

                    {/* Telegram @wallet via TON Connect */}
                    <button
                      type="button"
                      onClick={() => handleConnectTon('telegram-wallet')}
                      className="w-full flex items-center justify-between px-3.5 py-3 rounded-2xl bg-surface-2 hover:bg-surface-3 text-ink transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-surface flex items-center justify-center shrink-0 p-1.5 shadow-2xs">
                          <img src="/TON.png" className="w-6 h-6 object-contain" alt="Telegram Wallet" />
                        </div>
                        <span className="text-[14px] font-semibold text-ink tracking-[-0.01em]">
                          Telegram Wallet
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[12px] font-medium text-ink-3">Telegram</span>
                        <ChevronRight className="w-4 h-4 text-ink-3 group-hover:text-ink transition-colors" />
                      </div>
                    </button>

                    {/* Collapsible Manual TON Address */}
                    <button
                      type="button"
                      onClick={() => setShowManualWalletInput((v) => !v)}
                      className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-ink-3 hover:text-ink hover:bg-surface-2 transition-colors cursor-pointer text-[13px] font-medium"
                    >
                      <span>{lang === 'es' ? 'Pegar dirección TON' : 'Paste TON address'}</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${showManualWalletInput ? 'rotate-180' : ''}`} />
                    </button>

                    {showManualWalletInput && (
                      <div className="p-1.5 pl-3 rounded-2xl bg-surface-2 flex items-center gap-2">
                        <input
                          type="text"
                          value={customTonInput}
                          onChange={(e) => setCustomTonInput(e.target.value)}
                          placeholder={platformNetwork === 'testnet' ? 'kQ... / 0Q...' : 'EQ... / UQ...'}
                          className="flex-1 min-w-0 bg-transparent text-[13px] font-mono text-ink placeholder:text-ink-3 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveCustomTon(customTonInput)}
                          className="px-4 py-2 text-[12px] font-semibold bg-ink text-canvas hover:opacity-90 rounded-full cursor-pointer shrink-0 transition-opacity"
                        >
                          {t.saveAddress}
                        </button>
                      </div>
                    )}
                  </>
                )}

                {/* 5. LTC TAB */}
                {walletModalTab === 'ltc' && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between px-3.5 py-3 rounded-2xl bg-surface-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-surface flex items-center justify-center shrink-0 p-1.5 shadow-2xs">
                          <img src="/LTC.png" className="w-6 h-6 object-contain" alt="Litewallet" />
                        </div>
                        <span className="text-[14px] font-semibold text-ink tracking-[-0.01em]">
                          Litewallet · SegWit
                        </span>
                      </div>
                      <span className="text-[12px] font-mono text-ink-3">ltc1...</span>
                    </div>

                    <div className="p-1.5 pl-3 rounded-2xl bg-surface-2 flex items-center gap-2">
                      <input
                        type="text"
                        value={customLtcInput}
                        onChange={(e) => setCustomLtcInput(e.target.value)}
                        placeholder={platformNetwork === 'testnet' ? 'tltc1...' : 'ltc1...'}
                        className="flex-1 min-w-0 bg-transparent text-[13px] font-mono text-ink placeholder:text-ink-3 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveCustomLtc(customLtcInput)}
                        className="px-4 py-2 text-[12px] font-semibold bg-ink text-canvas hover:opacity-90 rounded-full cursor-pointer shrink-0 transition-opacity"
                      >
                        {t.saveAddress}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Minimalist 1-Line Footer */}
              <div className="pt-3 mt-4 border-t border-line/60 text-center text-[11px] text-ink-3">
                {lang === 'es' ? 'Sin custodia · Tus llaves permanecen contigo' : 'Non-custodial · Keys stay in your wallet'}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TOAST ALERTS */}
      {toast && (
        <div className="fixed bottom-20 md:bottom-10 left-1/2 -translate-x-1/2 z-[160] animate-fade-in">
          <div className={`px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 font-bold text-white text-xs sm:text-sm border-2 backdrop-blur-sm ${toast.type === 'success' ? 'bg-emerald-500/90 border-emerald-400' : 'bg-rose-500/90 border-rose-400'}`}>
            {toast.type === 'success' ? <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5"/> : <ArrowDownCircle className="w-4 h-4 sm:w-5 sm:h-5"/>}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
