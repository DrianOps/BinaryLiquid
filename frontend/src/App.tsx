import React, { useState, useEffect, useRef } from 'react';
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
  PieChart
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import BridgeSwap from './components/BridgeSwap';
import LandingPage from './components/LandingPage';
import PoolsView from './components/PoolsView';
import SdkView from './components/SdkView';
import LendingView from './components/LendingView';
import DocsView from './components/DocsView';
import WhitepaperView from './components/WhitepaperView';
import PerpsView from './components/PerpsView';
import PortfolioView from './components/PortfolioView';
import { useWizardConnect, AlphanumericQRCode } from '@wizardconnect/react';
import {
  deriveCashAddressFromXpub,
  pubkeyToCashAddress,
  convertCashAddressNetwork,
  formatAddress,
  formatCryptoBalance
} from './utils/bchAddress';
import {
  connectWalletConnect,
  disconnectWalletConnect,
  connectInjectedWallet,
  restoreEvmWalletConnectSession,
  trySilentReconnectInjectedEvm,
  switchEvmNetwork,
  initEip6963Discovery,
  DiscoveredEip6963Wallet,
  startBchWalletConnectPairing,
  restoreBchWalletConnectSession,
  disconnectBchWalletConnect,
  connectPaytacaExtension,
  hasPaytacaExtension,
  isMobileBrowser
} from './services/walletConnectService';

const translations = {
  en: {
    navSwap: "Bridge Swap",
    navPerps: "Perps",
    navGateway: "Gateway",
    navPools: "Pools",
    navLend: "Lend",
    navPortfolio: "Portfolio",
    navDocs: "Docs",
    navWallet: "Connect Wallet",
    connect: "Connect Wallet",
    openWallet: "Connecting...",
    disconnect: "Disconnect",
    modalConnectTitle: "Connect Wallet",
    modalConnectSubtitle: "Choose a network and wallet to connect",
    tabBch: "Bitcoin Cash",
    tabEvm: "EVM (Polygon)",
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
    disconnectAll: "Disconnect All Wallets",
    connectBchPrompt: "+ Connect Bitcoin Cash Wallet",
    connectEvmPrompt: "+ Connect EVM Wallet",
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
    addressUpdated: "Bitcoin Cash address updated",
    invalidAddress: "Invalid CashAddress"
  },
  es: {
    navSwap: "Bridge Swap",
    navPerps: "Perps",
    navGateway: "Gateway",
    navPools: "Pools",
    navLend: "Lend",
    navPortfolio: "Portafolio",
    navDocs: "Docs",
    navWallet: "Conectar Billetera",
    connect: "Conectar Billetera",
    openWallet: "Conectando...",
    disconnect: "Desconectar",
    modalConnectTitle: "Conectar Billetera",
    modalConnectSubtitle: "Elige una red y billetera para conectar",
    tabBch: "Bitcoin Cash",
    tabEvm: "EVM (Polygon)",
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
    disconnectAll: "Desconectar Todas las Billeteras",
    connectBchPrompt: "+ Conectar Billetera Bitcoin Cash",
    connectEvmPrompt: "+ Conectar Billetera EVM",
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

const VALID_VIEWS = ['bridge', 'perps', 'pools', 'lend', 'portfolio', 'docs', 'sdk', 'whitepaper'] as const;
type MainView = typeof VALID_VIEWS[number] | 'gateway';

function getViewFromUrl(): MainView {
  if (typeof window === 'undefined') return 'gateway';
  
  // 1. Clean path routing: e.g. /perps, /swap, /bridge, /pools, /lend, /docs, /whitepaper, /sdk
  const pathPart = window.location.pathname.replace(/^\/+/, '').split('/')[0].toLowerCase();
  const normalizedPath = pathPart === 'swap' ? 'bridge' : pathPart;
  if ((VALID_VIEWS as readonly string[]).includes(normalizedPath)) {
    return normalizedPath as MainView;
  }

  // 2. Fallback to hash for legacy bookmarks (e.g. /#perps -> cleaned automatically)
  const hashPart = window.location.hash.replace('#', '').split('/')[0].split('?')[0].toLowerCase();
  const normalizedHash = hashPart === 'swap' ? 'bridge' : hashPart;
  if ((VALID_VIEWS as readonly string[]).includes(normalizedHash)) {
    return normalizedHash as MainView;
  }

  return 'gateway';
}

export default function App() {
  const [mainView, setMainView] = useState<MainView>(() => getViewFromUrl());
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('bliq_theme') === 'dark' || 
      (!localStorage.getItem('bliq_theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  const isEmbed = typeof window !== 'undefined' && (
    window.location.pathname === '/embed' || 
    window.location.search.includes('embed=true')
  );
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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('bliq_network', platformNetwork);
    }
  }, [platformNetwork]);

  // Clean HTML5 History URL synchronization (No '#' hashes in URL!)
  useEffect(() => {
    if (typeof window === 'undefined' || isEmbed) return;
    const nextPath = mainView === 'gateway' ? '/' : `/${mainView}`;
    
    // Clean up any legacy hash and push clean path
    if (window.location.pathname !== nextPath || window.location.hash) {
      window.history.pushState(null, '', nextPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [mainView, isEmbed]);

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
  useEffect(() => {
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

  // Dark mode effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.backgroundColor = '#080B11';
      document.body.style.backgroundColor = '#080B11';
      localStorage.setItem('bliq_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.backgroundColor = '#FAFAF9';
      document.body.style.backgroundColor = '#FAFAF9';
      localStorage.setItem('bliq_theme', 'light');
    }
  }, [darkMode]);

  const [userContext, setUserContext] = useState<any>(() => {
    const saved = localStorage.getItem('bliq_user');
    if (!saved) return null;
    try {
      const parsed = JSON.parse(saved);
      if (parsed?.address && (parsed.address.startsWith('xpub') || parsed.address.startsWith('tpub'))) {
        parsed.address = deriveCashAddressFromXpub(parsed.address, true, true);
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
    source: 'wizard' | 'wc2-bch' | 'extension' | 'manual';
    queryAddress?: string;
  } | null>(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const queryBch = params.get('bch');
        if (queryBch) {
          const base = convertCashAddressNetwork(queryBch, true, false);
          const token = convertCashAddressNetwork(queryBch, true, true);
          const primaryBase = base.split(',')[0].trim();
          const primaryToken = token.split(',')[0].trim();
          return {
            address: primaryBase,
            tokenAddress: primaryToken,
            provider: 'Paytaca / Manual',
            source: 'manual',
            queryAddress: base
          };
        }
      }
      const raw = localStorage.getItem('bliq_wallets_v2');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.bchWallet?.address) return parsed.bchWallet;
      }
      const legacy = localStorage.getItem('bliq_user');
      if (legacy) {
        const p = JSON.parse(legacy);
        if (p?.address && !p.address.startsWith('0x')) {
          return {
            address: convertCashAddressNetwork(p.address, true, false),
            tokenAddress: convertCashAddressNetwork(p.address, true, true),
            provider: p.provider || 'Paytaca',
            source: 'wizard'
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
    source: 'injected' | 'wc2-evm';
  } | null>(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const queryEvm = params.get('evm');
        if (queryEvm) {
          return {
            address: queryEvm,
            chainId: 80002,
            provider: 'MetaMask',
            source: 'injected'
          };
        }
      }
      const raw = localStorage.getItem('bliq_wallets_v2');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.evmWallet?.address) return parsed.evmWallet;
      }
      const legacy = localStorage.getItem('bliq_user');
      if (legacy) {
        const p = JSON.parse(legacy);
        if (p?.address && p.address.startsWith('0x')) {
          return {
            address: p.address,
            chainId: 80002,
            provider: p.provider || 'MetaMask',
            source: 'injected'
          };
        }
      }
    } catch {}
    return null;
  });

  const [discoveredEvmWallets, setDiscoveredEvmWallets] = useState<DiscoveredEip6963Wallet[]>([]);
  const [bchWcPairing, setBchWcPairing] = useState<{ uri: string; qrDataUrl: string } | null>(null);
  const [walletBalances, setWalletBalances] = useState<{
    PUSD: number;
    BCH: number;
    USDT: number;
    USDC: number;
    POL: number;
  }>({ PUSD: 0, BCH: 0, USDT: 0, USDC: 0, POL: 0 });
  const [balancesLoading, setBalancesLoading] = useState<boolean>(false);
  const [isSwitchingChain, setIsSwitchingChain] = useState<boolean>(false);

  const [showWalletModal, setShowWalletModal] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('wallet') === 'open' || params.get('modal') === 'wallet';
    }
    return false;
  });
  const [walletModalTab, setWalletModalTab] = useState<'bch' | 'evm'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('tab') === 'evm') return 'evm';
    }
    return 'bch';
  });
  const [showAccountModal, setShowAccountModal] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('modal') === 'account';
    }
    return false;
  });
  const [selectedWalletType, setSelectedWalletType] = useState<'paytaca' | 'bch_wc2' | 'walletconnect' | 'injected' | null>(null);
  const [isEditingBch, setIsEditingBch] = useState<boolean>(false);
  const [customBchInput, setCustomBchInput] = useState<string>('');

  const t = translations[lang];
  const wc = useWizardConnect({ dappName: 'BinaryLiquid Gateway', persistSession: true });
  const connectLockRef = useRef(false);

  const showToast = (message: string, type: 'success'|'error' = 'success') => {
    setToast({message, type});
    setTimeout(() => setToast(null), 3200);
  };

  // Persist dual-chain wallet state & synchronize userContext seamlessly
  useEffect(() => {
    localStorage.setItem('bliq_wallets_v2', JSON.stringify({ bchWallet, evmWallet }));
    const primaryAddr = bchWallet?.tokenAddress || evmWallet?.address || '';
    if (!primaryAddr) {
      setUserContext(null);
      localStorage.removeItem('bliq_user');
      return;
    }
    const nextCtx = {
      address: primaryAddr,
      bchAddress: bchWallet?.tokenAddress || bchWallet?.address || null,
      evmAddress: evmWallet?.address || null,
      provider:
        bchWallet && evmWallet
          ? `${bchWallet.provider} + ${evmWallet.provider}`
          : bchWallet?.provider || evmWallet?.provider || 'Web3',
      connectedAt: new Date().toISOString(),
      balances: walletBalances
    };
    setUserContext(nextCtx);
    localStorage.setItem('bliq_user', JSON.stringify(nextCtx));
  }, [bchWallet, evmWallet, walletBalances]);

  // Dynamically re-encode BCH CashAddress prefix (`bchtest:` <-> `bitcoincash:`) when switching Testnet/Mainnet
  useEffect(() => {
    if (!bchWallet?.address) return;
    const isTest = platformNetwork === 'testnet';
    const nextBase = convertCashAddressNetwork(bchWallet.address, isTest, false);
    const nextToken = convertCashAddressNetwork(bchWallet.address, isTest, true);
    if (nextBase !== bchWallet.address || nextToken !== bchWallet.tokenAddress) {
      setBchWallet(prev => (prev ? { ...prev, address: nextBase, tokenAddress: nextToken } : null));
    }
  }, [platformNetwork]);

  // Fetch real live on-chain balances for connected BCH + EVM wallets
  const refreshWalletBalances = async (
    overrideBch?: string | null,
    overrideEvm?: string | null
  ) => {
    const targetBch = overrideBch !== undefined ? overrideBch : bchWallet?.queryAddress || bchWallet?.address || null;
    const targetEvm = overrideEvm !== undefined ? overrideEvm : evmWallet?.address || null;
    const primary = targetBch || targetEvm;
    if (!primary) return;

    setBalancesLoading(true);
    try {
      const qs = new URLSearchParams({
        network: platformNetwork,
        ...(targetBch ? { bchAddress: targetBch } : {}),
        ...(targetEvm ? { evmAddress: targetEvm } : {})
      });
      const res = await fetch(`/api/wallet/balances/${encodeURIComponent(primary)}?${qs.toString()}`);
      const data = await res.json();
      if (data.success && data.balances) {
        setWalletBalances(data.balances);
      }
    } catch (_) {
      // Keep previous cached balances on transient RPC error
    } finally {
      setBalancesLoading(false);
    }
  };

  useEffect(() => {
    if (bchWallet?.address || evmWallet?.address) {
      refreshWalletBalances();
    }
  }, [bchWallet?.address, evmWallet?.address, platformNetwork, showAccountModal]);

  // EVM live event callbacks (accountsChanged / chainChanged / disconnect)
  const evmEventCallbacks = {
    onAccountsChanged: (accounts: string[]) => {
      if (!accounts || accounts.length === 0) {
        setEvmWallet(null);
        showToast(lang === 'es' ? 'Billetera EVM desconectada' : 'EVM wallet disconnected');
      } else {
        setEvmWallet(prev =>
          prev
            ? { ...prev, address: accounts[0] }
            : { address: accounts[0], chainId: 80002, provider: 'Web3 Wallet', source: 'injected' }
        );
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
      setEvmWallet(null);
      showToast(lang === 'es' ? 'Sesión EVM finalizada' : 'EVM session ended');
    }
  };

  // Discover EIP-6963 browser extensions & silently restore persisted WC2 / Injected sessions on mount
  useEffect(() => {
    initEip6963Discovery(wallets => setDiscoveredEvmWallets(wallets));

    const isTest = platformNetwork === 'testnet';

    // 1. Restore EVM WalletConnect V2 or Injected session
    restoreEvmWalletConnectSession(evmEventCallbacks).then(restoredWc => {
      if (restoredWc) {
        setEvmWallet({
          address: restoredWc.address,
          chainId: restoredWc.chainId,
          provider: restoredWc.providerName,
          source: 'wc2-evm'
        });
      } else if (evmWallet?.source === 'injected') {
        trySilentReconnectInjectedEvm(evmEventCallbacks).then(restoredInj => {
          if (restoredInj) {
            setEvmWallet({
              address: restoredInj.address,
              chainId: restoredInj.chainId,
              provider: restoredInj.providerName,
              source: 'injected'
            });
          } else {
            // Extension locked or permission revoked -> clear stale state
            setEvmWallet(null);
          }
        });
      }
    });

    // 2. Restore BCH WalletConnect V2 (Cashonize / Paytaca WC2) session
    restoreBchWalletConnectSession(isTest, () => {
      setBchWallet(prev => (prev?.source === 'wc2-bch' ? null : prev));
    }).then(restoredBch => {
      if (restoredBch) {
        setBchWallet({
          address: restoredBch.address,
          tokenAddress: restoredBch.tokenAddress,
          provider: restoredBch.walletName,
          source: 'wc2-bch'
        });
      }
    });
  }, []);

  const handleDisconnectBch = async () => {
    try { wc.disconnect(); } catch {}
    try { await disconnectBchWalletConnect(); } catch {}
    setBchWallet(null);
    showToast(lang === 'es' ? 'Billetera Bitcoin Cash desconectada' : 'Bitcoin Cash wallet disconnected');
  };

  const handleDisconnectEvm = async () => {
    try { await disconnectWalletConnect(); } catch {}
    setEvmWallet(null);
    showToast(lang === 'es' ? 'Billetera EVM desconectada' : 'EVM wallet disconnected');
  };

  const handleDisconnect = async () => {
    try { wc.disconnect(); } catch {}
    try { await disconnectBchWalletConnect(); } catch {}
    try { await disconnectWalletConnect(); } catch {}
    setBchWallet(null);
    setEvmWallet(null);
    setUserContext(null);
    localStorage.removeItem('bliq_user');
    localStorage.removeItem('bliq_wallets_v2');
    showToast(lang === 'es' ? 'Billeteras desconectadas' : 'All wallets disconnected');
  };

  const registerBackendSession = async (
    primaryAddr: string,
    bchAddr: string | null,
    evmAddr: string | null,
    providerName: string
  ) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: primaryAddr,
          bchAddress: bchAddr,
          evmAddress: evmAddr,
          provider: providerName,
          network: platformNetwork
        })
      });
      const data = await res.json();
      if (data?.user?.balances) {
        setWalletBalances(data.user.balances);
      }
    } catch {}
  };

  const handleSaveCustomBch = (rawInput: string) => {
    const trimmed = rawInput.trim();
    if (!trimmed) return;
    const isTest = platformNetwork === 'testnet';
    const base = convertCashAddressNetwork(trimmed, isTest, false);
    const token = convertCashAddressNetwork(trimmed, isTest, true);
    if (!base) {
      showToast(t.invalidAddress, 'error');
      return;
    }
    const primaryBase = base.split(',')[0].trim();
    const primaryToken = token ? token.split(',')[0].trim() : primaryBase;
    setBchWallet({
      address: primaryBase,
      tokenAddress: primaryToken,
      provider: 'Paytaca / Manual',
      source: 'manual',
      queryAddress: base
    });
    registerBackendSession(primaryToken, base, evmWallet?.address || null, 'Manual');
    refreshWalletBalances(base, evmWallet?.address || null);
    showToast(t.addressUpdated, 'success');
    setIsEditingBch(false);
    setCustomBchInput('');
  };

  const handleConnectWallet = async (
    type: 'paytaca' | 'bch_wc2' | 'walletconnect' | 'injected',
    rdns?: string
  ) => {
    if (connectLockRef.current) return;
    connectLockRef.current = true;
    setTimeout(() => { connectLockRef.current = false; }, 1500);

    setShowWalletModal(false);
    setSelectedWalletType(type);
    const isTest = platformNetwork === 'testnet';

    if (type === 'paytaca') {
      // Disconnect any active BCH WalletConnect V2 (Cashonize) session before switching to Paytaca
      try { await disconnectBchWalletConnect(); } catch {}

      // 1. Try direct Paytaca Browser Extension if installed, otherwise launch WizardConnect QR
      if (hasPaytacaExtension()) {
        const extRes = await connectPaytacaExtension(isTest);
        if (extRes) {
          setBchWallet({
            address: extRes.address,
            tokenAddress: extRes.tokenAddress,
            provider: extRes.walletName,
            source: 'extension'
          });
          await registerBackendSession(extRes.tokenAddress, extRes.address, evmWallet?.address || null, extRes.walletName);
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
    } else if (type === 'bch_wc2') {
      // Official Bitcoin Cash WalletConnect V2 (`wc2-bch-bcr` for Cashonize / Paytaca WC2 / Zapit)
      // Disconnect any active Paytaca WizardConnect session first so it never conflicts or keeps saying Paytaca
      try { wc.disconnect(); } catch {}
      try {
        const pairing = await startBchWalletConnectPairing(isTest, () => {
          setBchWallet(prev => (prev?.source === 'wc2-bch' ? null : prev));
        });
        setBchWcPairing({ uri: pairing.uri, qrDataUrl: pairing.qrDataUrl });
        const approved = await pairing.waitForApproval();
        setBchWcPairing(null);
        try { wc.disconnect(); } catch {}
        setBchWallet({
          address: approved.address,
          tokenAddress: approved.tokenAddress,
          provider: approved.walletName,
          source: 'wc2-bch',
          queryAddress: approved.address
        });
        await registerBackendSession(approved.tokenAddress, approved.address, evmWallet?.address || null, approved.walletName);
        refreshWalletBalances(approved.address, evmWallet?.address || null);
        showToast(
          lang === 'es'
            ? `Conectado con ${approved.walletName}: ${formatAddress(approved.tokenAddress)}`
            : `Connected with ${approved.walletName}: ${formatAddress(approved.tokenAddress)}`
        );
      } catch (err: any) {
        setBchWcPairing(null);
        const msg = err?.message || '';
        if (!msg.includes('rejected') && !msg.includes('cancelled') && !msg.includes('expired')) {
          showToast(
            msg || (lang === 'es' ? 'Conexión BCH WalletConnect cancelada' : 'BCH WalletConnect pairing cancelled'),
            'error'
          );
        }
      } finally {
        setSelectedWalletType(null);
      }
    } else if (type === 'walletconnect') {
      // Official WalletConnect V2 EVM (`@walletconnect/ethereum-provider`)
      try {
        const { address, chainId, providerName } = await connectWalletConnect(isTest, evmEventCallbacks);
        setEvmWallet({
          address,
          chainId,
          provider: providerName,
          source: 'wc2-evm'
        });
        await registerBackendSession(address, bchWallet?.address || null, address, providerName);
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
        const { address, chainId, providerName } = await connectInjectedWallet({
          rdns,
          isTestnet: isTest,
          autoSwitchNetwork: true,
          callbacks: evmEventCallbacks
        });
        setEvmWallet({
          address,
          chainId,
          provider: providerName,
          source: 'injected'
        });
        await registerBackendSession(address, bchWallet?.address || null, address, providerName);
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
  };

  // LOGIN via WizardConnect (Paytaca native HD session listener)
  useEffect(() => {
    const isTest = platformNetwork === 'testnet';
    if (wc.state === 'connected' && wc.manager) {
      // If user explicitly switched to Cashonize / WC2 (`source === 'wc2-bch'`), do not let a stale persisted WizardConnect session overwrite it
      if (bchWallet?.source === 'wc2-bch' && selectedWalletType !== 'paytaca') {
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
        setBchWallet({
          address: baseAddr,
          tokenAddress: tokenAddr || baseAddr,
          provider: wName,
          source: 'wizard',
          queryAddress: queryAddresses
        });
        registerBackendSession(tokenAddr || baseAddr, queryAddresses, evmWallet?.address || null, wName);
        refreshWalletBalances(queryAddresses, evmWallet?.address || null);
        showToast(
          lang === 'es'
            ? `Conectado con ${wName}: ${formatAddress(tokenAddr || baseAddr)}`
            : `Connected with ${wName}: ${formatAddress(tokenAddr || baseAddr)}`
        );
        setSelectedWalletType(null);
      }
    } else if (wc.state === 'disconnected') {
      setBchWallet(prev => (prev?.source === 'wizard' ? null : prev));
    }
  }, [wc.state, wc.manager]);

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
            evmAddress={evmWallet?.address || ''}
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
        <div className="flex items-center gap-3 sm:gap-8">
          
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
              className="flex items-center gap-2 sm:gap-2.5 cursor-pointer group py-1.5 px-1.5 -ml-1.5 rounded-xl hover:bg-surface-2/70 transition-colors"
              title={lang === 'es' ? 'Menú de BinaryLiquid (Whitepaper, SDK & Inicio)' : 'BinaryLiquid Menu (Whitepaper, SDK & Home)'}
            >
              <div className="w-8 h-8 rounded-xl overflow-hidden flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform shrink-0">
                <img src="/logo.png" alt="BinaryLiquid" className="w-full h-full object-contain" />
              </div>
              <span className="text-lg sm:text-xl font-bold tracking-tight text-ink flex items-center">
                Binary<span className="text-primary font-extrabold">Liquid</span>
              </span>
              <ChevronDown
                className={`w-4 h-4 text-ink-3 group-hover:text-ink transition-transform duration-200 ${
                  brandMenuOpen ? 'rotate-180 text-ink' : ''
                }`}
              />
              {(mainView === 'whitepaper' || mainView === 'sdk') && (
                <span className="hidden lg:inline-flex items-center px-2 py-0.5 rounded-full bg-surface-2 border border-line text-[11px] font-semibold text-ink-2">
                  {mainView === 'whitepaper' ? 'Whitepaper' : 'SDK & API'}
                </span>
              )}
            </button>

            <AnimatePresence>
              {brandMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.98 }}
                  transition={{ duration: 0.14, ease: 'easeOut' }}
                  className="absolute left-0 top-full mt-1.5 w-64 bg-surface border border-line rounded-panel shadow-soft p-1.5 z-50"
                >
                  {[
                    {
                      id: 'gateway',
                      title: 'Gateway',
                      desc: lang === 'es' ? 'Inicio y vista general' : 'Protocol home & overview',
                      icon: Sparkles
                    },
                    {
                      id: 'whitepaper',
                      title: 'Whitepaper',
                      desc: lang === 'es' ? 'Arquitectura & Covenants P2SH32' : 'Architecture & P2SH32 Covenants',
                      badge: 'v1.0',
                      icon: BookOpen
                    },
                    {
                      id: 'sdk',
                      title: 'SDK & API',
                      desc: lang === 'es' ? 'Widget iFrame & endpoints DEX' : 'iFrame widget & DEX endpoints',
                      icon: Code2
                    },
                    {
                      id: 'docs',
                      title: lang === 'es' ? 'Documentación' : 'Documentation',
                      desc: lang === 'es' ? 'Guía de uso y contratos' : 'User guide & contracts',
                      icon: FileText
                    }
                  ].map((item) => {
                    const Icon = item.icon;
                    const active = mainView === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setMainView(item.id as any);
                          setBrandMenuOpen(false);
                        }}
                        className={`w-full flex items-start gap-2.5 p-2.5 rounded-control text-left transition-colors cursor-pointer ${
                          active ? 'bg-surface-2 text-ink' : 'hover:bg-surface-2/80 text-ink-2 hover:text-ink'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border ${
                            active
                              ? 'bg-primary/10 border-primary/30 text-primary'
                              : 'bg-surface-2 border-line text-ink-3'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="text-xs font-semibold text-ink">{item.title}</span>
                            {item.badge && (
                              <span className="px-1.5 py-0.2 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-ink-3 leading-snug mt-0.5 truncate">{item.desc}</p>
                        </div>
                      </button>
                    );
                  })}

                  <div className="my-1 border-t border-line" />

                  <div className="px-2.5 py-1.5 flex items-center justify-between text-[11px] text-ink-3">
                    <a
                      href="https://bchblaze.cash"
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-ink inline-flex items-center gap-1 transition-colors"
                    >
                      <span>BCH BLAZE</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                    <a
                      href="https://paryonusd.com"
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-ink inline-flex items-center gap-1 transition-colors"
                    >
                      <span>ParyonUSD</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                    <a
                      href={PLATFORM_NETWORKS[platformNetwork].explorerBch}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-ink inline-flex items-center gap-1 transition-colors"
                    >
                      <span>Explorer</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* CENTER TABS (Desktop / Tablet — Centered directly over Swap Card on all screen sizes) */}
          <div className="hidden md:flex items-center p-1 bg-surface-2 rounded-full border border-line text-xs font-semibold md:absolute md:left-1/2 md:-translate-x-1/2">
            <button 
              onClick={() => setMainView('bridge')} 
              className={`px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
                mainView === 'bridge' 
                  ? 'bg-surface text-ink shadow-xs font-bold' 
                  : 'text-ink-3 hover:text-ink font-medium'
              }`}
            >
              <span>{t.navSwap}</span>
            </button>

            <button 
              onClick={() => setMainView('perps')} 
              className={`px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
                mainView === 'perps' 
                  ? 'bg-surface text-ink shadow-xs font-bold' 
                  : 'text-ink-3 hover:text-ink font-medium'
              }`}
            >
              <span>{t.navPerps}</span>
            </button>

            <button 
              onClick={() => setMainView('pools')} 
              className={`px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
                mainView === 'pools' 
                  ? 'bg-surface text-ink shadow-xs font-bold' 
                  : 'text-ink-3 hover:text-ink font-medium'
              }`}
            >
              <span>{t.navPools}</span>
            </button>

            <button 
              onClick={() => setMainView('lend')} 
              className={`px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
                mainView === 'lend' 
                  ? 'bg-surface text-ink shadow-xs font-bold' 
                  : 'text-ink-3 hover:text-ink font-medium'
              }`}
            >
              <span>{t.navLend}</span>
            </button>

            <button 
              onClick={() => setMainView('portfolio')} 
              className={`px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
                mainView === 'portfolio' 
                  ? 'bg-surface text-ink shadow-xs font-bold' 
                  : 'text-ink-3 hover:text-ink font-medium'
              }`}
            >
              <span>{t.navPortfolio}</span>
            </button>

            <button 
              onClick={() => setMainView('docs')} 
              className={`px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
                mainView === 'docs' 
                  ? 'bg-surface text-ink shadow-xs font-bold' 
                  : 'text-ink-3 hover:text-ink font-medium'
              }`}
            >
              <span>{t.navDocs}</span>
            </button>
          </div>
        </div>
        
        {/* RIGHT CONTROLS (Responsive) */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Network Switcher Pill (Desktop/Tablet: hidden on mobile to avoid navbar crowding) */}
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
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium border border-line bg-surface hover:bg-surface-2 text-ink-2 transition-all cursor-pointer shadow-2xs"
            title={lang === 'es' ? 'Click para alternar red (Mainnet / Testnet)' : 'Click to toggle network (Mainnet / Testnet)'}
          >
            <span className={`w-2 h-2 rounded-full ${platformNetwork === 'mainnet' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
            <span className="capitalize font-semibold text-[11px] sm:text-xs">
              {platformNetwork === 'mainnet' ? 'Mainnet' : 'Chipnet'}
            </span>
          </button>

          {/* Theme Toggle Button (Desktop/Tablet) */}
          <button 
            onClick={() => setDarkMode(!darkMode)} 
            className="hidden sm:flex w-8 h-8 rounded-full bg-surface hover:bg-surface-2 border border-line text-ink-2 hover:text-ink shadow-2xs transition-all items-center justify-center cursor-pointer"
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-ink-3" />}
          </button>

          {/* Language Selector Pill (Desktop/Tablet) */}
          <button 
            onClick={() => setLang(lang === 'en' ? 'es' : 'en')} 
            className="hidden sm:flex items-center gap-1 text-ink-2 hover:text-ink font-semibold text-xs bg-surface hover:bg-surface-2 px-2.5 py-1.5 rounded-full border border-line shadow-2xs transition-all cursor-pointer"
          >
            <span className="text-xs">{lang === 'en' ? '🇺🇸' : '🇪🇸'}</span>
            <span className="text-[11px]">{lang.toUpperCase()}</span>
          </button>

          {/* Non-Custodial Wallet Action Button (Shows Dual BCH+EVM Status) */}
          {userContext ? (
            <button 
              onClick={() => setShowAccountModal(true)} 
              className="bg-surface hover:bg-surface-2 text-ink px-2.5 sm:px-3.5 py-1.5 rounded-full font-semibold text-xs transition-all border border-line shadow-2xs flex items-center gap-1.5 sm:gap-2 hover:border-line-strong cursor-pointer shrink-0"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-mono text-xs">
                {bchWallet && evmWallet
                  ? `BCH + EVM (${formatAddress(evmWallet.address)})`
                  : userContext.address
                  ? formatAddress(userContext.address)
                  : 'Connected'}
              </span>
            </button>
          ) : (
            <button 
              onClick={() => setShowWalletModal(true)} 
              className="bg-primary hover:bg-primary-hover text-black px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full font-bold text-xs transition-all shadow-xs cursor-pointer shrink-0"
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

            {/* Drawer Sheet */}
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="relative z-10 w-72 max-w-[80vw] h-full bg-surface border-l border-line shadow-2xl p-5 flex flex-col justify-between overflow-y-auto"
            >
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-line">
                  <div className="flex items-center gap-2">
                    <img src="/logo.png" className="w-6 h-6 object-contain" alt="Logo" />
                    <span className="font-bold text-ink text-sm tracking-tight">Binary<span className="text-primary font-extrabold">Liquid</span></span>
                  </div>
                  <button 
                    onClick={() => setMobileMenuOpen(false)} 
                    className="w-7 h-7 rounded-lg hover:bg-surface-2 text-ink-3 hover:text-ink flex items-center justify-center transition-colors cursor-pointer"
                    title="Cerrar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Network Switcher (Clean Segment) */}
                <div className="space-y-1.5">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-ink-3 px-1">
                    {lang === 'es' ? 'Red de la plataforma' : 'Platform Network'}
                  </div>
                  <div className="grid grid-cols-2 p-0.5 bg-surface-2 rounded-xl border border-line text-xs">
                    <button
                      onClick={() => {
                        setPlatformNetwork('mainnet');
                        showToast(lang === 'es' ? 'Red activa: Bitcoin Cash Mainnet (Producción)' : 'Active network: Bitcoin Cash Mainnet (Production)');
                      }}
                      className={`py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        platformNetwork === 'mainnet'
                          ? 'bg-surface text-ink shadow-xs font-bold'
                          : 'text-ink-3 hover:text-ink'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>Mainnet</span>
                    </button>
                    <button
                      onClick={() => {
                        setPlatformNetwork('testnet');
                        showToast(lang === 'es' ? 'Red activa: BCH Chipnet (Testnet)' : 'Active network: BCH Chipnet (Testnet)');
                      }}
                      className={`py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        platformNetwork === 'testnet'
                          ? 'bg-surface text-amber-500 shadow-xs font-bold'
                          : 'text-ink-3 hover:text-ink'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      <span>Testnet</span>
                    </button>
                  </div>
                </div>

                {/* Primary Navigation Links (Minimalist single-line rows, NO subtitle clutter) */}
                <div className="space-y-1 pt-2">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-ink-3 px-1 mb-1">
                    {lang === 'es' ? 'Navegación' : 'Navigation'}
                  </div>
                  {[
                    { id: 'bridge', label: 'Bridge Swap', icon: Zap },
                    { id: 'perps', label: 'Perps (Futuros)', icon: TrendingUp },
                    { id: 'pools', label: 'Pools', icon: Droplets },
                    { id: 'lend', label: 'Lend', icon: Lock },
                    { id: 'portfolio', label: lang === 'es' ? 'Portafolio' : 'Portfolio', icon: PieChart },
                    { id: 'gateway', label: 'Gateway', icon: Sparkles },
                    { id: 'whitepaper', label: 'Whitepaper', icon: BookOpen },
                    { id: 'docs', label: 'Docs', icon: FileText },
                    { id: 'sdk', label: 'SDK & API', icon: Code2 },
                  ].map(item => {
                    const Icon = item.icon;
                    const active = mainView === item.id;
                    return (
                      <button 
                        key={item.id}
                        onClick={() => { setMainView(item.id as any); setMobileMenuOpen(false); }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-medium text-xs sm:text-sm transition-all cursor-pointer ${
                          active 
                            ? 'bg-primary/10 text-primary font-bold' 
                            : 'hover:bg-surface-2 text-ink-2 hover:text-ink'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className={`w-4 h-4 ${active ? 'text-primary' : 'text-ink-3'}`} />
                          <span>{item.label}</span>
                        </div>
                        {active && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Settings & Links */}
              <div className="pt-4 border-t border-line space-y-3">
                {/* Theme & Language Quick Toggles */}
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setDarkMode(!darkMode)}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl border border-line bg-surface hover:bg-surface-2 text-xs font-semibold text-ink-2 transition-all cursor-pointer"
                  >
                    {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-ink-3" />}
                    <span>{darkMode ? 'Claro' : 'Oscuro'}</span>
                  </button>
                  <button 
                    onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl border border-line bg-surface hover:bg-surface-2 text-xs font-semibold text-ink-2 transition-all cursor-pointer"
                  >
                    <span>{lang === 'en' ? '🇺🇸 EN' : '🇪🇸 ES'}</span>
                  </button>
                </div>

                {/* Minimal Footer Links */}
                <div className="flex items-center justify-between text-[11px] text-ink-3 px-1 pt-1">
                  <a href="https://bchblaze.cash" target="_blank" rel="noreferrer" className="hover:text-ink transition-colors">BLAZE</a>
                  <a href="https://paryonusd.com" target="_blank" rel="noreferrer" className="hover:text-ink transition-colors">ParyonUSD</a>
                  <a href="https://t.me/drianops" target="_blank" rel="noreferrer" className="hover:text-primary transition-colors font-medium">@drianops</a>
                  <a href={PLATFORM_NETWORKS[platformNetwork].explorerBch} target="_blank" rel="noreferrer" className="hover:text-ink transition-colors">Explorer</a>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MOBILE BOTTOM FLOATING DOCK (md:hidden: lightning 1-thumb navigation) */}
      <div className="fixed bottom-3 left-3 right-3 z-40 md:hidden print:hidden pointer-events-none">
        <div className="pointer-events-auto bg-surface/90 backdrop-blur-md border border-line shadow-lg rounded-2xl px-2 py-1.5 flex items-center justify-around">
          
          {/* Tab 1: Swap */}
          <button 
            onClick={() => setMainView('bridge')}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all cursor-pointer ${
              mainView === 'bridge' 
                ? 'text-primary font-bold' 
                : 'text-ink-3 hover:text-ink font-medium'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span className="text-[10px]">Swap</span>
          </button>

          {/* Tab 2: Perps */}
          <button 
            onClick={() => setMainView('perps')}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all cursor-pointer ${
              mainView === 'perps' 
                ? 'text-primary font-bold' 
                : 'text-ink-3 hover:text-ink font-medium'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span className="text-[10px]">Perps</span>
          </button>

          {/* Tab 3: Pools */}
          <button 
            onClick={() => setMainView('pools')}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all cursor-pointer ${
              mainView === 'pools' 
                ? 'text-primary font-bold' 
                : 'text-ink-3 hover:text-ink font-medium'
            }`}
          >
            <Droplets className="w-4 h-4" />
            <span className="text-[10px]">Pools</span>
          </button>

          {/* Tab 4: Lend */}
          <button 
            onClick={() => setMainView('lend')}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all cursor-pointer ${
              mainView === 'lend' 
                ? 'text-primary font-bold' 
                : 'text-ink-3 hover:text-ink font-medium'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span className="text-[10px]">Lend</span>
          </button>

          {/* Tab 5: Menú (Opens Drawer!) */}
          <button 
            onClick={() => setMobileMenuOpen(true)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all cursor-pointer ${
              mobileMenuOpen 
                ? 'text-primary font-bold' 
                : 'text-ink-3 hover:text-ink font-medium'
            }`}
          >
            <Menu className="w-4 h-4" />
            <span className="text-[10px]">{lang === 'es' ? 'Menú' : 'Menu'}</span>
          </button>

        </div>
      </div>

      {/* NATIVE WIZARDCONNECT DIALOG (Paytaca Alphanumeric QR) */}
      {(wc.qrUri || wc.uri) && wc.state === 'connecting' && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-md z-[140] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#141924] rounded-3xl p-6 sm:p-7 w-full max-w-sm shadow-2xl relative border border-gray-100 dark:border-gray-800 flex flex-col items-center text-center">
            <button
              onClick={() => { wc.disconnect(); setSelectedWalletType(null); }}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 px-3 py-1 rounded-full transition-colors font-bold cursor-pointer"
            >
              ✕
            </button>

            <h2 className="text-xl font-black text-gray-900 dark:text-white mb-1.5 mt-2 flex items-center justify-center gap-2.5">
              <img src="/wizardconnect-logo.png" className="w-8 h-8 object-contain" alt="Paytaca" />
              <span>{lang === 'es' ? 'Conectar Paytaca' : 'Connect Paytaca'}</span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-5">
              {lang === 'es'
                ? 'Abre tu billetera Paytaca, toca el ícono de escanear QR y aprueba la sesión WizardConnect (100% No-Custodio).'
                : 'Open your Paytaca wallet, tap the QR scan icon and approve the WizardConnect session (100% Non-Custodial).'}
            </p>

            <div className="p-3 bg-white rounded-2xl border border-gray-200 shadow-inner flex items-center justify-center mb-5">
              {wc.qrUri ? (
                <AlphanumericQRCode value={wc.qrUri} size={215} foreground="#0E131E" background="#FFFFFF" />
              ) : null}
            </div>

            <button
              onClick={() => copyToClipboard(wc.uri || '')}
              className="w-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold text-xs py-3 rounded-xl transition-all cursor-pointer"
            >
              {copied
                ? (lang === 'es' ? '✓ ¡URI WizardConnect copiado!' : '✓ WizardConnect URI copied!')
                : (lang === 'es' ? 'Copiar URI de Conexión (wiz://...)' : 'Copy Connection URI (wiz://...)')}
            </button>
          </div>
        </div>
      )}

      {/* OFFICIAL BCH WALLETCONNECT V2 DIALOG (`wc2-bch-bcr`: Cashonize / Paytaca WC2) */}
      {bchWcPairing && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-md z-[140] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#141924] rounded-3xl p-6 sm:p-7 w-full max-w-sm shadow-2xl relative border border-gray-100 dark:border-gray-800 flex flex-col items-center text-center">
            <button
              onClick={() => { setBchWcPairing(null); setSelectedWalletType(null); }}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 px-3 py-1 rounded-full transition-colors font-bold cursor-pointer"
            >
              ✕
            </button>

            <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white mb-1.5 mt-2">
              BCH WalletConnect V2
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-4">
              {lang === 'es'
                ? `Escanea con Cashonize / Paytaca o copia el URI wc:... y pégalo en la pestaña WalletConnect de tu billetera (${platformNetwork === 'testnet' ? 'Chipnet Testnet' : 'BCH Mainnet'}).`
                : `Scan with Cashonize / Paytaca or copy the wc:... URI and paste it into the WalletConnect tab of your wallet (${platformNetwork === 'testnet' ? 'Chipnet Testnet' : 'BCH Mainnet'}).`}
            </p>

            {bchWcPairing.qrDataUrl && (
              <div className="p-3 bg-white rounded-2xl border border-gray-200 shadow-inner flex items-center justify-center mb-4">
                <img src={bchWcPairing.qrDataUrl} alt="BCH WalletConnect QR" className="w-48 h-48 object-contain" />
              </div>
            )}

            <div className="w-full space-y-2">
              <button
                onClick={() => copyToClipboard(bchWcPairing.uri)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>
                  {copied
                    ? (lang === 'es' ? '¡URI wc: Copiado al Portapapeles!' : 'wc: URI copied to clipboard!')
                    : (lang === 'es' ? 'Copiar URI WalletConnect (Cashonize / Paytaca)' : 'Copy WalletConnect URI (Cashonize / Paytaca)')}
                </span>
              </button>
              <a
                href="https://cashonize.com"
                target="_blank"
                rel="noreferrer"
                className="w-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5"
              >
                <span>{lang === 'es' ? 'Abrir Cashonize Web Wallet' : 'Open Cashonize Web Wallet'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

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
            evmAddress={evmWallet?.address || ''}
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
            evmAddress={evmWallet?.address || ''}
            walletBalances={walletBalances}
            wizardConnectManager={wc.manager}
            wizardConnectState={wc.state}
            platformNetwork={platformNetwork}
            onToggleNetwork={setPlatformNetwork}
            onRefreshBalances={() => refreshWalletBalances()}
            onConnectWallet={() => setShowWalletModal(true)}
            showToast={showToast}
            lang={lang}
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
            evmAddress={evmWallet?.address || ''}
            walletBalances={walletBalances}
            wizardConnectManager={wc.manager}
            wizardConnectState={wc.state}
            platformNetwork={platformNetwork}
            onToggleNetwork={setPlatformNetwork}
            onRefreshBalances={() => refreshWalletBalances()}
            onConnectWallet={() => setShowWalletModal(true)}
            showToast={showToast}
            lang={lang}
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
            evmAddress={evmWallet?.address || ''}
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
          />
        </main>
      )}

      {/* PORTFOLIO VIEW (Live On-Chain Net Worth, Tokens, Pools, Lend, Perps, Activity) */}
      {mainView === 'portfolio' && (
        <main className="flex-1 flex flex-col items-center justify-start p-3 sm:p-6 w-full max-w-7xl mx-auto pb-28 md:pb-12 text-left">
          <PortfolioView
            backendUrl=""
            userAddress={userContext?.address || ''}
            bchAddress={bchWallet?.tokenAddress || bchWallet?.address || ''}
            evmAddress={evmWallet?.address || ''}
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

      {/* DEVELOPER PORTAL & SDK VIEW */}
      {mainView === 'sdk' && (
        <main className="flex-1 flex flex-col items-center justify-start p-4 sm:p-6 w-full max-w-7xl mx-auto pb-28 md:pb-12">
          <SdkView lang={lang} />
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

      {/* NON-CUSTODIAL DUAL-CHAIN ACCOUNT MODAL */}
      <AnimatePresence>
        {showAccountModal && userContext && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[130] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              className="bg-surface border border-line rounded-card p-5 sm:p-6 w-full max-w-sm sm:max-w-md shadow-soft relative text-left my-6"
            >
              <button 
                onClick={() => setShowAccountModal(false)}
                className="absolute top-4 right-4 w-7 h-7 rounded-full bg-surface-2 hover:bg-surface-3 text-ink-3 hover:text-ink flex items-center justify-center transition-colors cursor-pointer"
                title="Cerrar"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-control bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-ink text-base">{t.accountTitle}</h3>
                  <span className="text-[11px] text-ink-3 flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>{t.accountSubtitle} • {platformNetwork === 'testnet' ? 'Chipnet + Amoy' : 'Mainnet'}</span>
                  </span>
                </div>
              </div>

              {/* SLOT 1: BITCOIN CASH WALLET */}
              <div className="p-3 rounded-control bg-surface-2 border border-line mb-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] uppercase font-bold text-ink-3 tracking-wider">
                    {t.tabBch} ({platformNetwork === 'testnet' ? 'Chipnet' : 'Mainnet'})
                  </span>
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
                        {bchWallet.tokenAddress || bchWallet.address}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
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
                  !isEditingBch ? (
                    <div className="space-y-1.5">
                      <button
                        onClick={() => { setShowAccountModal(false); setWalletModalTab('bch'); setShowWalletModal(true); }}
                        className="w-full py-2 rounded-control bg-surface hover:bg-surface-3 border border-line text-ink font-semibold text-xs transition-colors cursor-pointer"
                      >
                        {t.connectBchPrompt}
                      </button>
                      <button
                        onClick={() => { setIsEditingBch(true); setCustomBchInput(''); }}
                        className="w-full text-center text-[11px] text-ink-3 hover:text-primary transition-colors cursor-pointer font-medium"
                      >
                        {t.orManualAddress}
                      </button>
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
                )}
              </div>

              {/* SLOT 2: EVM POLYGON WALLET */}
              <div className="p-3 rounded-control bg-surface-2 border border-line mb-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] uppercase font-bold text-ink-3 tracking-wider">
                    {t.tabEvm} ({platformNetwork === 'testnet' ? 'Amoy 80002' : 'Polygon 137'})
                  </span>
                  {evmWallet && (
                    <span className="ui-badge text-[10px]">
                      {evmWallet.provider}
                    </span>
                  )}
                </div>
                {evmWallet ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-ink truncate font-semibold">
                        {evmWallet.address}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
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
                    className="w-full py-2 rounded-control bg-surface hover:bg-surface-3 border border-line text-ink font-semibold text-xs transition-colors cursor-pointer"
                  >
                    {t.connectEvmPrompt}
                  </button>
                )}
              </div>

              {/* REAL ON-CHAIN BALANCES PREVIEW */}
              <div className="space-y-1.5 mb-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="ui-label">{t.liveBalances}</span>
                  <button
                    onClick={() => refreshWalletBalances()}
                    className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                  >
                    {balancesLoading ? t.refreshing : `↻ ${t.refresh}`}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <div className="p-2 rounded-control bg-surface-2 border border-line flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <img src="/PUSD.png" className="w-4 h-4 rounded-full object-contain" alt="PUSD" />
                      <span className="text-xs font-semibold text-ink">PUSD</span>
                    </div>
                    {bchWallet ? (
                      <span className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatCryptoBalance(walletBalances.PUSD, false)}
                      </span>
                    ) : (
                      <button
                        onClick={() => { setShowAccountModal(false); setWalletModalTab('bch'); setShowWalletModal(true); }}
                        className="text-[10px] text-ink-3 hover:text-primary transition-colors cursor-pointer font-medium"
                      >
                        -- ({t.connectBchNotice})
                      </button>
                    )}
                  </div>

                  <div className="p-2 rounded-control bg-surface-2 border border-line flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <img src="/USDT.png" className="w-4 h-4 rounded-full object-contain" alt="USDT" />
                      <span className="text-xs font-semibold text-ink">USDT</span>
                    </div>
                    {evmWallet ? (
                      <span className="text-xs font-mono font-semibold text-ink">
                        {formatCryptoBalance(walletBalances.USDT, false)}
                      </span>
                    ) : (
                      <button
                        onClick={() => { setShowAccountModal(false); setWalletModalTab('evm'); setShowWalletModal(true); }}
                        className="text-[10px] text-ink-3 hover:text-primary transition-colors cursor-pointer font-medium"
                      >
                        -- ({t.connectEvmNotice})
                      </button>
                    )}
                  </div>

                  <div className="p-2 rounded-control bg-surface-2 border border-line flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <img src="/BCH.png" className="w-4 h-4 rounded-full object-contain" alt="BCH" />
                      <span className="text-xs font-semibold text-ink">
                        {platformNetwork === 'testnet' ? 'tBCH' : 'BCH'}
                      </span>
                    </div>
                    {bchWallet ? (
                      <span className="text-xs font-mono font-semibold text-ink">
                        {formatCryptoBalance(walletBalances.BCH, true)}
                      </span>
                    ) : (
                      <button
                        onClick={() => { setShowAccountModal(false); setWalletModalTab('bch'); setShowWalletModal(true); }}
                        className="text-[10px] text-ink-3 hover:text-primary transition-colors cursor-pointer font-medium"
                      >
                        -- ({t.connectBchNotice})
                      </button>
                    )}
                  </div>

                  <div className="p-2 rounded-control bg-surface-2 border border-line flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <img src="/POL.png" className="w-4 h-4 rounded-full object-contain" alt="POL" />
                      <span className="text-xs font-semibold text-ink">POL</span>
                    </div>
                    {evmWallet ? (
                      <span className="text-xs font-mono font-semibold text-ink">
                        {formatCryptoBalance(walletBalances.POL, true)}
                      </span>
                    ) : (
                      <button
                        onClick={() => { setShowAccountModal(false); setWalletModalTab('evm'); setShowWalletModal(true); }}
                        className="text-[10px] text-ink-3 hover:text-primary transition-colors cursor-pointer font-medium"
                      >
                        -- ({t.connectEvmNotice})
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <button 
                onClick={() => { handleDisconnect(); setShowAccountModal(false); }}
                className="w-full py-2.5 rounded-control bg-surface-2 hover:bg-rose-500/10 border border-line hover:border-rose-500/30 text-rose-500 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{t.disconnectAll}</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MULTI-CHAIN WALLET SELECTOR MODAL (BCH CashTokens + EVM Polygon) */}
      <AnimatePresence>
        {showWalletModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[130] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              className="bg-surface border border-line rounded-card p-5 sm:p-6 w-full max-w-sm sm:max-w-[400px] shadow-soft relative text-left my-6"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowWalletModal(false)}
                className="absolute top-4 right-4 w-7 h-7 rounded-full bg-surface-2 hover:bg-surface-3 text-ink-3 hover:text-ink flex items-center justify-center transition-colors cursor-pointer"
                title="Cerrar"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              {/* Header */}
              <div className="mb-4">
                <h3 className="text-base sm:text-lg font-bold text-ink">
                  {t.modalConnectTitle}
                </h3>
                <p className="text-xs text-ink-3 mt-0.5">
                  {t.modalConnectSubtitle}
                </p>
              </div>

              {/* Segmented Network Switcher: [Bitcoin Cash] | [EVM (Polygon)] */}
              <div className="grid grid-cols-2 p-1 bg-surface-2 rounded-panel border border-line text-xs font-semibold mb-3">
                <button
                  type="button"
                  onClick={() => setWalletModalTab('bch')}
                  className={`py-1.5 px-2 rounded-control transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    walletModalTab === 'bch'
                      ? 'bg-surface text-ink shadow-soft font-bold'
                      : 'text-ink-3 hover:text-ink'
                  }`}
                >
                  <img src="/BCH.png" className="w-3.5 h-3.5 object-contain" alt="BCH" />
                  <span>{t.tabBch}</span>
                  {bchWallet && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                </button>

                <button
                  type="button"
                  onClick={() => setWalletModalTab('evm')}
                  className={`py-1.5 px-2 rounded-control transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    walletModalTab === 'evm'
                      ? 'bg-surface text-ink shadow-soft font-bold'
                      : 'text-ink-3 hover:text-ink'
                  }`}
                >
                  <img src="/POL.png" className="w-3.5 h-3.5 object-contain" alt="POL" />
                  <span>{t.tabEvm}</span>
                  {evmWallet && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                </button>
              </div>

              {/* Wallet Options List (Clean, frictionless rows, NO paragraphs) */}
              <div className="space-y-2">
                {walletModalTab === 'bch' ? (
                  <>
                    {/* Paytaca */}
                    <button
                      type="button"
                      onClick={() => handleConnectWallet('paytaca')}
                      className="w-full flex items-center justify-between p-3 rounded-control bg-surface-2 hover:bg-surface-3 border border-line text-ink transition-all group cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-control bg-surface border border-line flex items-center justify-center shrink-0 p-1.5 shadow-2xs">
                          <img src="/wizardconnect-logo.png" className="w-6 h-6 object-contain" alt="Paytaca" />
                        </div>
                        <div className="text-left min-w-0">
                          <div className="text-sm font-semibold text-ink flex items-center gap-1.5">
                            <span>Paytaca Wallet</span>
                            {bchWallet?.provider?.includes('Paytaca') && (
                              <span className="text-[10px] text-emerald-500 font-bold">✓</span>
                            )}
                          </div>
                          <span className="text-[11px] text-ink-3">
                            {hasPaytacaExtension() ? (lang === 'es' ? 'Extensión lista' : 'Extension ready') : 'WizardConnect QR'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="ui-badge text-[10px]">
                          {hasPaytacaExtension() ? t.detected : t.mobileQr}
                        </span>
                        <ChevronRight className="w-4 h-4 text-ink-3 group-hover:text-ink transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </button>

                    {/* Cashonize / BCH WC2 */}
                    <button
                      type="button"
                      onClick={() => handleConnectWallet('bch_wc2')}
                      className="w-full flex items-center justify-between p-3 rounded-control bg-surface-2 hover:bg-surface-3 border border-line text-ink transition-all group cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-control bg-surface border border-line flex items-center justify-center shrink-0 p-1.5 shadow-2xs">
                          <img src="/BCH.png" className="w-6 h-6 object-contain" alt="Cashonize" />
                        </div>
                        <div className="text-left min-w-0">
                          <div className="text-sm font-semibold text-ink flex items-center gap-1.5">
                            <span>Cashonize / WC2</span>
                            {bchWallet?.source === 'wc2-bch' && (
                              <span className="text-[10px] text-emerald-500 font-bold">✓</span>
                            )}
                          </div>
                          <span className="text-[11px] text-ink-3">Cashonize Web, Zapit, WC2</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="ui-badge text-[10px]">Web / QR</span>
                        <ChevronRight className="w-4 h-4 text-ink-3 group-hover:text-ink transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </button>
                  </>
                ) : (
                  <>
                    {/* Discovered EIP-6963 Wallets or MetaMask / Browser Wallet */}
                    {discoveredEvmWallets.length > 0 ? (
                      discoveredEvmWallets.slice(0, 3).map((w) => (
                        <button
                          key={w.info.rdns}
                          type="button"
                          onClick={() => handleConnectWallet('injected', w.info.rdns)}
                          className="w-full flex items-center justify-between p-3 rounded-control bg-surface-2 hover:bg-surface-3 border border-line text-ink transition-all group cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-control bg-surface border border-line flex items-center justify-center shrink-0 p-1.5 shadow-2xs">
                              <img src={w.info.icon} className="w-6 h-6 object-contain rounded" alt={w.info.name} />
                            </div>
                            <div className="text-left min-w-0">
                              <div className="text-sm font-semibold text-ink flex items-center gap-1.5">
                                <span>{w.info.name}</span>
                                {evmWallet?.address && (
                                  <span className="text-[10px] text-emerald-500 font-bold">✓</span>
                                )}
                              </div>
                              <span className="text-[11px] text-ink-3">{t.extension}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="ui-badge ui-badge-success text-[10px]">{t.detected}</span>
                            <ChevronRight className="w-4 h-4 text-ink-3 group-hover:text-ink transition-transform group-hover:translate-x-0.5" />
                          </div>
                        </button>
                      ))
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleConnectWallet('injected')}
                        className="w-full flex items-center justify-between p-3 rounded-control bg-surface-2 hover:bg-surface-3 border border-line text-ink transition-all group cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-control bg-surface border border-line flex items-center justify-center shrink-0 p-1.5 shadow-2xs">
                            <img src="/POL.png" className="w-6 h-6 object-contain" alt="Browser Wallet" />
                          </div>
                          <div className="text-left min-w-0">
                            <div className="text-sm font-semibold text-ink flex items-center gap-1.5">
                              <span>Browser Wallet</span>
                              {evmWallet && <span className="text-[10px] text-emerald-500 font-bold">✓</span>}
                            </div>
                            <span className="text-[11px] text-ink-3">MetaMask, Rabby, Brave</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="ui-badge text-[10px]">{isMobileBrowser() ? 'Mobile' : t.extension}</span>
                          <ChevronRight className="w-4 h-4 text-ink-3 group-hover:text-ink transition-transform group-hover:translate-x-0.5" />
                        </div>
                      </button>
                    )}

                    {/* Official WalletConnect V2 EVM */}
                    <button
                      type="button"
                      onClick={() => handleConnectWallet('walletconnect')}
                      className="w-full flex items-center justify-between p-3 rounded-control bg-surface-2 hover:bg-surface-3 border border-line text-ink transition-all group cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-control bg-surface border border-line flex items-center justify-center shrink-0 p-1.5 shadow-2xs">
                          <img
                            src="https://raw.githubusercontent.com/WalletConnect/walletconnect-assets/master/Icon/Blue%20(Default)/Icon.svg"
                            className="w-5 h-5 object-contain"
                            alt="WalletConnect"
                          />
                        </div>
                        <div className="text-left min-w-0">
                          <div className="text-sm font-semibold text-ink flex items-center gap-1.5">
                            <span>WalletConnect</span>
                            {evmWallet?.source === 'wc2-evm' && (
                              <span className="text-[10px] text-emerald-500 font-bold">✓</span>
                            )}
                          </div>
                          <span className="text-[11px] text-ink-3">Trust, Rainbow, OKX, Mobile</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="ui-badge text-[10px]">{t.mobileQr}</span>
                        <ChevronRight className="w-4 h-4 text-ink-3 group-hover:text-ink transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </button>
                  </>
                )}
              </div>

              {/* Minimalist 1-Line Footer */}
              <div className="pt-3 mt-3 border-t border-line flex items-center justify-between text-[11px] text-ink-3">
                <span>{t.needWallet}</span>
                <div className="flex items-center gap-2">
                  <a
                    href="https://paytaca.com"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-ink font-semibold text-primary transition-colors"
                  >
                    Paytaca
                  </a>
                  <span>·</span>
                  <a
                    href="https://cashonize.com"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-ink font-semibold transition-colors"
                  >
                    Cashonize
                  </a>
                </div>
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
