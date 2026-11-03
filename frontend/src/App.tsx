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
  Code2
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
import { useWizardConnect, AlphanumericQRCode } from '@wizardconnect/react';
import {
  deriveCashAddressFromXpub,
  pubkeyToCashAddress,
  convertCashAddressNetwork,
  formatAddress
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
    navDocs: "Docs",
    navWallet: "Connect Wallet",
    connect: "Connect Wallet",
    openWallet: "Connecting...",
    disconnect: "Disconnect"
  },
  es: {
    navSwap: "Bridge Swap",
    navPerps: "Perps",
    navGateway: "Gateway",
    navPools: "Pools",
    navLend: "Lend",
    navDocs: "Docs",
    navWallet: "Conectar Billetera",
    connect: "Conectar Billetera",
    openWallet: "Conectando...",
    disconnect: "Desconectar"
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

const VALID_VIEWS = ['bridge', 'perps', 'pools', 'lend', 'docs', 'sdk', 'whitepaper'] as const;
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
  const [lang, setLang] = useState<'en' | 'es'>('en');
  const [isScrolled, setIsScrolled] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [platformNetwork, setPlatformNetwork] = useState<'mainnet' | 'testnet'>('testnet');

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
    source: 'wizard' | 'wc2-bch' | 'extension';
  } | null>(() => {
    try {
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

  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [, setSelectedWalletType] = useState<'paytaca' | 'bch_wc2' | 'walletconnect' | 'injected' | null>(null);

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
    const targetBch = overrideBch !== undefined ? overrideBch : bchWallet?.address || null;
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
        showToast('Billetera EVM desconectada');
      } else {
        setEvmWallet(prev =>
          prev
            ? { ...prev, address: accounts[0] }
            : { address: accounts[0], chainId: 80002, provider: 'Web3 Wallet', source: 'injected' }
        );
        showToast(`Cuenta EVM actualizada: ${formatAddress(accounts[0])}`);
      }
    },
    onChainChanged: (chainId: number) => {
      setEvmWallet(prev => (prev ? { ...prev, chainId } : null));
    },
    onDisconnect: () => {
      setEvmWallet(null);
      showToast('Sesión EVM finalizada');
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
    showToast('Billetera Bitcoin Cash desconectada');
  };

  const handleDisconnectEvm = async () => {
    try { await disconnectWalletConnect(); } catch {}
    setEvmWallet(null);
    showToast('Billetera EVM desconectada');
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
    showToast('Billeteras desconectadas');
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
          showToast(`Conectado con ${extRes.walletName}: ${formatAddress(extRes.tokenAddress)}`);
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
      try {
        const pairing = await startBchWalletConnectPairing(isTest, () => {
          setBchWallet(prev => (prev?.source === 'wc2-bch' ? null : prev));
        });
        setBchWcPairing({ uri: pairing.uri, qrDataUrl: pairing.qrDataUrl });
        const approved = await pairing.waitForApproval();
        setBchWcPairing(null);
        setBchWallet({
          address: approved.address,
          tokenAddress: approved.tokenAddress,
          provider: approved.walletName,
          source: 'wc2-bch'
        });
        await registerBackendSession(approved.tokenAddress, approved.address, evmWallet?.address || null, approved.walletName);
        showToast(`Conectado con ${approved.walletName}: ${formatAddress(approved.tokenAddress)}`);
      } catch (err: any) {
        setBchWcPairing(null);
        const msg = err?.message || '';
        if (!msg.includes('rejected') && !msg.includes('cancelled') && !msg.includes('expired')) {
          showToast(msg || 'Conexión BCH WalletConnect cancelada', 'error');
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
        showToast(`Conectado vía ${providerName}: ${formatAddress(address)}`);
      } catch (err: any) {
        const msg = err?.message || '';
        if (
          !msg.includes('User rejected') &&
          !msg.includes('Connection cancelled') &&
          !msg.includes('Modal closed') &&
          !msg.includes('reset')
        ) {
          showToast(msg || 'Conexión WalletConnect cancelada', 'error');
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
        showToast(`Conectado con ${providerName}: ${formatAddress(address)}`);
      } catch (err: any) {
        const msg = err?.message || '';
        if (!msg.includes('User rejected') && !msg.includes('4001')) {
          showToast(msg || 'Error conectando billetera de navegador', 'error');
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
      let baseAddr = '';
      let tokenAddr = '';
      try {
        // DappPubkeyStateManager.getPubkey expects numbers: (childIndex = 0, index = 0)
        const pubkey = wc.manager.getPubkey(0, 0 as any);
        if (pubkey) {
          baseAddr = pubkeyToCashAddress(pubkey, isTest, false);
          tokenAddr = pubkeyToCashAddress(pubkey, isTest, true);
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
        setBchWallet({
          address: baseAddr,
          tokenAddress: tokenAddr || baseAddr,
          provider: wName,
          source: 'wizard'
        });
        registerBackendSession(tokenAddr || baseAddr, baseAddr, evmWallet?.address || null, wName);
        showToast(`Conectado con ${wName}: ${formatAddress(tokenAddr || baseAddr)}`);
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
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-warm-mesh dark:bg-[#080B11] flex flex-col font-sans transition-colors duration-200 text-gray-900 dark:text-gray-100 selection:bg-orange-500 selection:text-white">
      
      {/* NAVBAR WITH SCROLL-REACTIVE BORDER & ELEVATION */}
      <nav className={`h-16 sticky top-0 z-40 print:hidden transition-all duration-300 flex items-center justify-between px-3 sm:px-8 ${
        isScrolled
          ? 'bg-canvas/90 backdrop-blur-md border-b border-line shadow-xs'
          : 'bg-transparent border-b border-transparent shadow-none'
      }`}>
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
          
          {/* CENTER TABS (Desktop / Tablet — Core DeFi & Docs) */}
          <div className="hidden md:flex items-center p-1 bg-surface-2 rounded-full border border-line text-xs font-semibold">
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
              showToast(next === 'mainnet' ? 'Red activa: Bitcoin Cash Mainnet (Producción)' : 'Red activa: BCH Chipnet (Testnet)');
            }}
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium border border-line bg-surface hover:bg-surface-2 text-ink-2 transition-all cursor-pointer shadow-2xs"
            title="Click para alternar red (Mainnet / Testnet)"
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
                  <div className="text-[10px] uppercase font-bold tracking-wider text-ink-3 px-1">Red de la plataforma</div>
                  <div className="grid grid-cols-2 p-0.5 bg-surface-2 rounded-xl border border-line text-xs">
                    <button
                      onClick={() => {
                        setPlatformNetwork('mainnet');
                        showToast('Red activa: Bitcoin Cash Mainnet (Producción)');
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
                        showToast('Red activa: BCH Chipnet (Testnet)');
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
                  <div className="text-[10px] uppercase font-bold tracking-wider text-ink-3 px-1 mb-1">Navegación</div>
                  {[
                    { id: 'bridge', label: 'Bridge Swap', icon: Zap },
                    { id: 'perps', label: 'Perps (Futuros)', icon: TrendingUp },
                    { id: 'pools', label: 'Pools', icon: Droplets },
                    { id: 'lend', label: 'Lend', icon: Lock },
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
                  <a href="https://t.me/bchblaze" target="_blank" rel="noreferrer" className="hover:text-ink transition-colors">Telegram</a>
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
            <span className="text-[10px]">Menú</span>
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
              <span>Conectar Paytaca</span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-5">
              Abre tu billetera <strong>Paytaca</strong>, toca el ícono de escanear QR y aprueba la sesión WizardConnect (100% No-Custodio).
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
              {copied ? '✓ ¡URI WizardConnect copiado!' : 'Copiar URI de Conexión (wiz://...)'}
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
              Escanea con <strong>Cashonize / Paytaca</strong> o copia el URI <code className="font-mono">wc:...</code> y pégalo en la pestaña WalletConnect de tu billetera ({platformNetwork === 'testnet' ? 'Chipnet Testnet' : 'BCH Mainnet'}).
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
                <span>{copied ? '¡URI wc: Copiado al Portapapeles!' : 'Copiar URI WalletConnect (Cashonize / Paytaca)'}</span>
              </button>
              <a
                href="https://cashonize.com"
                target="_blank"
                rel="noreferrer"
                className="w-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5"
              >
                <span>Abrir Cashonize Web Wallet</span>
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
        />
      )}

      {/* BRIDGE SWAP VIEW */}
      {mainView === 'bridge' && (
        <main className="flex-1 flex flex-col items-center justify-start p-4 sm:p-6 w-full max-w-7xl mx-auto pb-28 md:pb-12">
          <BridgeSwap
            userContext={userContext}
            userAddress={userContext?.address || ''}
            bchAddress={bchWallet?.tokenAddress || bchWallet?.address || ''}
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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[130] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="bg-white dark:bg-[#121620] rounded-[32px] p-6 sm:p-7 w-full max-w-md shadow-2xl border border-gray-100 dark:border-gray-800 relative text-left my-6"
            >
              <button 
                onClick={() => setShowAccountModal(false)}
                className="absolute top-5 right-5 text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-800 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs cursor-pointer"
              >
                ✕
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-base">Billeteras Conectadas</h3>
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    100% No-Custodio • {platformNetwork === 'testnet' ? 'Testnet (Chipnet + Amoy)' : 'Mainnet'}
                  </span>
                </div>
              </div>

              {/* SLOT 1: BITCOIN CASH WALLET */}
              <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-[#171d2b] border border-gray-200/80 dark:border-gray-700/80 mb-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">
                    Bitcoin Cash ({platformNetwork === 'testnet' ? 'Chipnet CashTokens' : 'Mainnet CashTokens'})
                  </span>
                  {bchWallet && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      {bchWallet.provider}
                    </span>
                  )}
                </div>
                {bchWallet ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-gray-900 dark:text-gray-200 truncate font-semibold">
                      {bchWallet.tokenAddress || bchWallet.address}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => copyToClipboard(bchWallet.tokenAddress || bchWallet.address)}
                        className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
                        title="Copiar CashAddr"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={handleDisconnectBch}
                        className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/50 text-red-500 transition-colors cursor-pointer"
                        title="Desconectar BCH"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setShowAccountModal(false); setShowWalletModal(true); }}
                    className="w-full py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs transition-all cursor-pointer"
                  >
                    + Conectar Paytaca / Cashonize (BCH)
                  </button>
                )}
              </div>

              {/* SLOT 2: EVM POLYGON WALLET */}
              <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-[#171d2b] border border-gray-200/80 dark:border-gray-700/80 mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 tracking-wider">
                    EVM ({platformNetwork === 'testnet' ? 'Polygon Amoy 80002' : 'Polygon PoS 137'})
                  </span>
                  {evmWallet && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      {evmWallet.provider} • Chain {evmWallet.chainId}
                    </span>
                  )}
                </div>
                {evmWallet ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-gray-900 dark:text-gray-200 truncate font-semibold">
                        {evmWallet.address}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => copyToClipboard(evmWallet.address)}
                          className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
                          title="Copiar dirección 0x"
                        >
                          {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={handleDisconnectEvm}
                          className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/50 text-red-500 transition-colors cursor-pointer"
                          title="Desconectar EVM"
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
                                ? 'Red cambiada a Polygon Amoy Testnet (80002)'
                                : 'Red cambiada a Polygon PoS (137)'
                            );
                          } catch (e: any) {
                            showToast(e?.message || 'No se pudo cambiar la red automáticamente', 'error');
                          } finally {
                            setIsSwitchingChain(false);
                          }
                        }}
                        className="w-full py-1.5 px-2.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 font-bold text-[11px] transition-all cursor-pointer"
                      >
                        {isSwitchingChain
                          ? 'Cambiando red en billetera...'
                          : platformNetwork === 'testnet'
                          ? '⚡ Cambiar billetera a Polygon Amoy (80002)'
                          : '⚡ Cambiar billetera a Polygon Mainnet (137)'}
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => { setShowAccountModal(false); setShowWalletModal(true); }}
                    className="w-full py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold text-xs transition-all cursor-pointer"
                  >
                    + Conectar MetaMask / WalletConnect (EVM)
                  </button>
                )}
              </div>

              {/* REAL ON-CHAIN BALANCES PREVIEW */}
              <div className="space-y-2 mb-5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    Saldos On-Chain en Vivo
                  </span>
                  <button
                    onClick={() => refreshWalletBalances()}
                    className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                  >
                    {balancesLoading ? 'Actualizando...' : '↻ Actualizar'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#171d2b] flex items-center justify-between border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-1.5">
                      <img src="/PUSD.png" className="w-5 h-5 rounded-full object-contain" alt="PUSD" />
                      <span className="text-xs font-bold text-gray-900 dark:text-white">PUSD</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {walletBalances.PUSD.toFixed(2)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#171d2b] flex items-center justify-between border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-1.5">
                      <img src="/USDT.png" className="w-5 h-5 rounded-full object-contain" alt="USDT" />
                      <span className="text-xs font-bold text-gray-900 dark:text-white">USDT</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-teal-600 dark:text-teal-400">
                      {walletBalances.USDT.toFixed(2)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#171d2b] flex items-center justify-between border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-1.5">
                      <img src="/BCH.png" className="w-5 h-5 rounded-full object-contain" alt="BCH" />
                      <span className="text-xs font-bold text-gray-900 dark:text-white">
                        {platformNetwork === 'testnet' ? 'tBCH' : 'BCH'}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-gray-900 dark:text-white">
                      {walletBalances.BCH.toFixed(4)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#171d2b] flex items-center justify-between border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-1.5">
                      <img src="/POL.png" className="w-5 h-5 rounded-full object-contain" alt="POL" />
                      <span className="text-xs font-bold text-gray-900 dark:text-white">POL</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-gray-900 dark:text-white">
                      {walletBalances.POL.toFixed(4)}
                    </span>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => { handleDisconnect(); setShowAccountModal(false); }}
                className="w-full py-3 rounded-2xl bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Desconectar Todas las Billeteras</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MULTI-CHAIN WALLET SELECTOR MODAL (BCH CashTokens + EVM Polygon) */}
      {showWalletModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[120] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#121722] rounded-3xl p-6 sm:p-7 w-full max-w-md shadow-2xl relative border border-gray-100 dark:border-gray-800 my-6">
            <button onClick={() => setShowWalletModal(false)} className="absolute top-5 right-5 text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-3 py-1 rounded-full transition-colors font-bold cursor-pointer">
              ✕
            </button>
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mb-1 text-center">Conectar Billetera</h2>
            <p className="text-xs text-gray-400 text-center mb-5">
              Puedes conectar tu billetera <strong>BCH</strong> y tu billetera <strong>EVM</strong> al mismo tiempo (100% No-Custodio)
            </p>
            
            <div className="space-y-4">
              {/* SECTION 1: BITCOIN CASH (PUSD CashTokens) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    1. Red Bitcoin Cash ({platformNetwork === 'testnet' ? 'Chipnet Testnet' : 'Mainnet'})
                  </span>
                  {bchWallet && (
                    <span className="text-[10px] font-mono font-bold text-emerald-500">
                      ✓ {formatAddress(bchWallet.tokenAddress)}
                    </span>
                  )}
                </div>

                {/* Option 1A: Paytaca via WizardConnect / Extension */}
                <button 
                  onClick={() => handleConnectWallet('paytaca')} 
                  className="w-full bg-gray-50 dark:bg-[#171e2c] hover:bg-orange-50 dark:hover:bg-orange-950/20 border border-gray-200 dark:border-gray-700 hover:border-primary/50 p-3.5 rounded-2xl flex items-center gap-3.5 transition-all group cursor-pointer text-left"
                >
                  <div className="w-11 h-11 bg-white dark:bg-[#1f2737] rounded-xl shadow-2xs flex items-center justify-center group-hover:scale-105 transition-transform p-2 shrink-0">
                    <img src="/wizardconnect-logo.png" className="w-7 h-7 object-contain" alt="Paytaca" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-gray-900 dark:text-white text-sm flex items-center gap-1.5 flex-wrap">
                      <span>Paytaca Wallet</span>
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-500">
                        {hasPaytacaExtension() ? 'Extensión Detectada' : 'WizardConnect QR'}
                      </span>
                    </h4>
                    <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 mt-0.5">
                      BCH & PUSD CashTokens nativo (Móvil / Extensión)
                    </p>
                  </div>
                </button>

                {/* Option 1B: Cashonize / Paytaca via BCH WalletConnect V2 (`wc2-bch-bcr`) */}
                <button 
                  onClick={() => handleConnectWallet('bch_wc2')} 
                  className="w-full bg-gray-50 dark:bg-[#171e2c] hover:bg-emerald-50 dark:hover:bg-emerald-950/20 border border-gray-200 dark:border-gray-700 hover:border-emerald-500/50 p-3.5 rounded-2xl flex items-center gap-3.5 transition-all group cursor-pointer text-left"
                >
                  <div className="w-11 h-11 bg-white dark:bg-[#1f2737] rounded-xl shadow-2xs flex items-center justify-center group-hover:scale-105 transition-transform p-2 shrink-0">
                    <img src="/BCH.png" className="w-7 h-7 object-contain" alt="Cashonize" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-gray-900 dark:text-white text-sm flex items-center gap-1.5 flex-wrap">
                      <span>Cashonize / BCH WC2</span>
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500">
                        Chipnet & Mainnet
                      </span>
                    </h4>
                    <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 mt-0.5">
                      Estándar wc2-bch-bcr • Cashonize Web, Paytaca WC2, Zapit
                    </p>
                  </div>
                </button>
              </div>

              {/* SECTION 2: EVM POLYGON (USDT) */}
              <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    2. Red EVM ({platformNetwork === 'testnet' ? 'Polygon Amoy 80002' : 'Polygon PoS 137'})
                  </span>
                  {evmWallet && (
                    <span className="text-[10px] font-mono font-bold text-blue-500">
                      ✓ {formatAddress(evmWallet.address)}
                    </span>
                  )}
                </div>

                {/* Option 2A: Discovered EIP-6963 Extensions or Generic Browser Wallet / MetaMask Mobile */}
                {discoveredEvmWallets.length > 0 ? (
                  discoveredEvmWallets.slice(0, 3).map(w => (
                    <button
                      key={w.info.rdns}
                      onClick={() => handleConnectWallet('injected', w.info.rdns)}
                      className="w-full bg-gray-50 dark:bg-[#171e2c] hover:bg-amber-50 dark:hover:bg-amber-950/20 border border-gray-200 dark:border-gray-700 hover:border-amber-500/50 p-3.5 rounded-2xl flex items-center gap-3.5 transition-all group cursor-pointer text-left"
                    >
                      <div className="w-11 h-11 bg-white dark:bg-[#1f2737] rounded-xl shadow-2xs flex items-center justify-center group-hover:scale-105 transition-transform p-2 shrink-0">
                        <img src={w.info.icon} className="w-7 h-7 object-contain rounded-md" alt={w.info.name} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-black text-gray-900 dark:text-white text-sm flex items-center gap-1.5">
                          <span>{w.info.name}</span>
                          <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500">
                            Detectada
                          </span>
                        </h4>
                        <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 mt-0.5">
                          Conexión directa EIP-6963 • Auto-configura Polygon Amoy
                        </p>
                      </div>
                    </button>
                  ))
                ) : (
                  <button
                    onClick={() => handleConnectWallet('injected')}
                    className="w-full bg-gray-50 dark:bg-[#171e2c] hover:bg-amber-50 dark:hover:bg-amber-950/20 border border-gray-200 dark:border-gray-700 hover:border-amber-500/50 p-3.5 rounded-2xl flex items-center gap-3.5 transition-all group cursor-pointer text-left"
                  >
                    <div className="w-11 h-11 bg-white dark:bg-[#1f2737] rounded-xl shadow-2xs flex items-center justify-center group-hover:scale-105 transition-transform p-2 shrink-0">
                      <img src="/POL.png" className="w-7 h-7 object-contain" alt="MetaMask" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-gray-900 dark:text-white text-sm flex items-center gap-1.5">
                        <span>MetaMask / Browser Wallet</span>
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500">
                          {isMobileBrowser() ? 'App Móvil' : 'Extensión Web3'}
                        </span>
                      </h4>
                      <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 mt-0.5">
                        MetaMask, Rabby, Brave, Trust • Polygon Amoy (USDT)
                      </p>
                    </div>
                  </button>
                )}

                {/* Option 2B: Official WalletConnect V2 EVM */}
                <button 
                  onClick={() => handleConnectWallet('walletconnect')} 
                  className="w-full bg-gray-50 dark:bg-[#171e2c] hover:bg-blue-50 dark:hover:bg-blue-950/20 border border-gray-200 dark:border-gray-700 hover:border-blue-400/50 p-3.5 rounded-2xl flex items-center gap-3.5 transition-all group cursor-pointer text-left"
                >
                  <div className="w-11 h-11 bg-white dark:bg-[#1f2737] rounded-xl shadow-2xs flex items-center justify-center group-hover:scale-105 transition-transform p-2 shrink-0">
                    <img src="https://raw.githubusercontent.com/WalletConnect/walletconnect-assets/master/Icon/Blue%20(Default)/Icon.svg" className="w-6 h-6 object-contain" alt="WC" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-gray-900 dark:text-white text-sm flex items-center gap-1.5">
                      <span>WalletConnect V2 (EVM)</span>
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500">QR / Móvil</span>
                    </h4>
                    <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 mt-0.5">
                      MetaMask Mobile, Trust, Rainbow, OKX, Coinbase
                    </p>
                  </div>
                </button>
              </div>
            </div>
            
            <p className="text-center text-xs text-gray-400 dark:text-gray-500 font-bold mt-5">
              ¿Necesitas billetera BCH Testnet?{' '}
              <a href="https://cashonize.com" target="_blank" rel="noreferrer" className="text-emerald-500 hover:underline">Cashonize</a>
              {' • '}
              <a href="https://paytaca.com" target="_blank" rel="noreferrer" className="text-primary hover:underline">Paytaca</a>
            </p>
          </div>
        </div>
      )}

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
