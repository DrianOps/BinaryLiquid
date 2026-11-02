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

export default function App() {
  const [mainView, setMainView] = useState<'bridge' | 'gateway' | 'pools' | 'docs' | 'sdk' | 'lend'>(() => {
    // Deep links: bsprotocol.xyz/#bridge, #pools, #lend, #docs, #sdk
    const hash = typeof window !== 'undefined' ? window.location.hash.replace('#', '') : '';
    return (['bridge', 'pools', 'lend', 'docs', 'sdk'] as const).includes(hash as any)
      ? (hash as 'bridge' | 'pools' | 'lend' | 'docs' | 'sdk')
      : 'gateway';
  });
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('bliq_theme') === 'dark' || 
      (!localStorage.getItem('bliq_theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  const isEmbed = typeof window !== 'undefined' && (
    window.location.pathname === '/embed' || 
    window.location.search.includes('embed=true')
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'} | null>(null);
  const [lang, setLang] = useState<'en' | 'es'>('en');
  const [isScrolled, setIsScrolled] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [platformNetwork, setPlatformNetwork] = useState<'mainnet' | 'testnet'>('testnet');

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
      <nav className={`h-16 sticky top-0 z-40 transition-all duration-300 flex items-center justify-between px-3 sm:px-8 ${
        isScrolled
          ? 'bg-white/85 dark:bg-[#0d1119]/85 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-800/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)]'
          : 'bg-transparent border-b border-transparent shadow-none'
      }`}>
        <div className="flex items-center gap-3 sm:gap-8">
          
          {/* LOGO */}
          <div 
            className="flex items-center gap-2 sm:gap-2.5 cursor-pointer group py-1"
            onClick={() => setMainView('gateway')}
          >
            <div className="w-8 h-8 rounded-xl overflow-hidden flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <img src="/logo.png" alt="BinaryLiquid" className="w-full h-full object-contain" />
            </div>
            <span className="text-lg sm:text-xl font-bold tracking-tight text-gray-950 dark:text-white flex items-center">
              Binary<span className="text-primary font-extrabold">Liquid</span>
            </span>
          </div>
          
          {/* CENTER TABS (Desktop / Tablet) */}
          <div className="hidden md:flex items-center gap-1">
            <button 
              onClick={() => setMainView('bridge')} 
              className={`font-bold text-sm px-4 py-2 rounded-full transition-all ${
                mainView === 'bridge' 
                  ? 'bg-gray-100 dark:bg-[#1a202c] text-gray-900 dark:text-white shadow-2xs' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <span>{t.navSwap}</span>
            </button>

            <button 
              onClick={() => setMainView('pools')} 
              className={`font-bold text-sm px-4 py-2 rounded-full transition-all ${
                mainView === 'pools' 
                  ? 'bg-gray-100 dark:bg-[#1a202c] text-gray-900 dark:text-white shadow-2xs' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <span>{t.navPools}</span>
            </button>

            <button 
              onClick={() => setMainView('lend')} 
              className={`font-bold text-sm px-4 py-2 rounded-full transition-all ${
                mainView === 'lend' 
                  ? 'bg-gray-100 dark:bg-[#1a202c] text-gray-900 dark:text-white shadow-2xs' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <span>{t.navLend}</span>
            </button>

            <button 
              onClick={() => setMainView('docs')} 
              className={`font-bold text-sm px-4 py-2 rounded-full transition-all ${
                mainView === 'docs' 
                  ? 'bg-gray-100 dark:bg-[#1a202c] text-gray-900 dark:text-white shadow-2xs' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <span>{t.navDocs}</span>
            </button>

            <button 
              onClick={() => setMainView('sdk')} 
              className={`font-bold text-sm px-4 py-2 rounded-full transition-all ${
                mainView === 'sdk' 
                  ? 'bg-gray-100 dark:bg-[#1a202c] text-gray-900 dark:text-white shadow-2xs' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <span>SDK & API</span>
            </button>
          </div>
        </div>
        
        {/* RIGHT CONTROLS (Responsive) */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Desktop Launch App / Gateway Switcher */}
          {mainView !== 'bridge' ? (
            <button 
              onClick={() => setMainView('bridge')}
              className="hidden sm:flex items-center bg-primary hover:bg-orange-600 text-white px-3.5 sm:px-4 py-2 rounded-full font-bold text-xs shadow-md shadow-orange-500/20 hover:scale-105 active:scale-95 transition-all shrink-0 cursor-pointer"
            >
              <span>Launch App</span>
            </button>
          ) : (
            <button 
              onClick={() => setMainView('gateway')}
              className="hidden sm:flex items-center bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 px-3.5 py-2 rounded-full font-bold text-xs transition-all shrink-0 cursor-pointer"
            >
              <span>Gateway</span>
            </button>
          )}

          {/* Theme Toggle Button (Desktop/Tablet) */}
          <button 
            onClick={() => setDarkMode(!darkMode)} 
            className="hidden sm:flex w-9 h-9 rounded-full bg-white dark:bg-[#161c28] border border-gray-200/90 dark:border-gray-800 text-gray-600 dark:text-amber-400 shadow-2xs hover:scale-105 active:scale-95 transition-all items-center justify-center cursor-pointer"
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Language Selector Pill (Desktop/Tablet) */}
          <button 
            onClick={() => setLang(lang === 'en' ? 'es' : 'en')} 
            className="hidden sm:flex items-center gap-1.5 text-gray-700 dark:text-gray-300 font-bold text-xs bg-white dark:bg-[#161c28] px-3 py-2 rounded-full border border-gray-200/90 dark:border-gray-800 shadow-2xs hover:scale-105 transition-all cursor-pointer"
          >
            <span className="text-sm">{lang === 'en' ? '🇺🇸' : '🇪🇸'}</span>
            <span>{lang.toUpperCase()}</span>
          </button>

          {/* Non-Custodial Wallet Action Button (Shows Dual BCH+EVM Status) */}
          {userContext ? (
            <button 
              onClick={() => setShowAccountModal(true)} 
              className="bg-white dark:bg-[#161c28] hover:bg-gray-50 dark:hover:bg-[#1e2535] text-gray-900 dark:text-white px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full font-bold text-xs transition-all border border-gray-200/90 dark:border-gray-800 shadow-2xs flex items-center gap-1.5 sm:gap-2 hover:scale-105 cursor-pointer shrink-0"
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
              className="bg-white dark:bg-[#161c28] hover:bg-gray-50 dark:hover:bg-[#1e2535] text-gray-900 dark:text-white px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full font-bold text-xs transition-all border border-gray-200/90 dark:border-gray-800 shadow-2xs hover:scale-105 cursor-pointer shrink-0"
            >
              <span className="hidden sm:inline">{wc.state === 'connecting' ? t.openWallet : t.navWallet}</span>
              <span className="sm:hidden font-semibold">Connect</span>
            </button>
          )}

          {/* Hamburger Menu Trigger Button */}
          <button 
            onClick={() => setMobileMenuOpen(true)}
            className="w-9 h-9 rounded-full bg-white dark:bg-[#161c28] border border-gray-200/90 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white shadow-2xs flex items-center justify-center transition-all hover:scale-105 cursor-pointer"
            title="Open Menu"
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
              className="fixed inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
            />

            {/* Drawer Sheet */}
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="relative z-10 w-[85%] max-w-sm h-full bg-white dark:bg-[#121722] border-l border-gray-100 dark:border-gray-800 shadow-2xl p-6 flex flex-col justify-between overflow-y-auto"
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between pb-5 border-b border-gray-100 dark:border-gray-800 mb-6">
                  <div className="flex items-center gap-2.5">
                    <img src="/logo.png" className="w-7 h-7 object-contain" alt="Logo" />
                    <div>
                      <div className="font-bold text-gray-900 dark:text-white text-base">BinaryLiquid</div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Cross-Chain Gateway</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setMobileMenuOpen(false)} 
                    className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Primary Navigation Links */}
                <div className="space-y-2 mb-6">
                  <button 
                    onClick={() => { setMainView('bridge'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-2xl font-bold text-sm transition-all cursor-pointer ${
                      mainView === 'bridge' 
                        ? 'bg-primary/10 text-primary border border-primary/20 shadow-2xs' 
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div>Bridge Swap</div>
                      <div className="text-[10px] text-gray-400 font-normal">Cross-chain stablecoins</div>
                    </div>
                  </button>

                  <button 
                    onClick={() => { setMainView('pools'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-2xl font-bold text-sm transition-all cursor-pointer ${
                      mainView === 'pools' 
                        ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 shadow-2xs' 
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center shrink-0">
                      <Droplets className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div>Liquidity Pools</div>
                      <div className="text-[10px] text-gray-400 font-normal">Earn 0.20% passive yield</div>
                    </div>
                  </button>

                  <button 
                    onClick={() => { setMainView('lend'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-2xl font-bold text-sm transition-all cursor-pointer ${
                      mainView === 'lend' 
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-2xs' 
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div>Préstamos & Bóvedas</div>
                      <div className="text-[10px] text-gray-400 font-normal">BCH Vaults • Borrow PUSD</div>
                    </div>
                  </button>

                  <button 
                    onClick={() => { setMainView('gateway'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-2xl font-bold text-sm transition-all cursor-pointer ${
                      mainView === 'gateway' 
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-2xs' 
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div>Liquidity Gateway</div>
                      <div className="text-[10px] text-gray-400 font-normal">#1 Bitcoin Cash Hub</div>
                    </div>
                  </button>

                  <button 
                    onClick={() => { setMainView('docs'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-2xl font-bold text-sm transition-all cursor-pointer ${
                      mainView === 'docs' 
                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shadow-2xs' 
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div>Docs</div>
                      <div className="text-[10px] text-gray-400 font-normal">Tokenomics & BLAZE specs</div>
                    </div>
                  </button>

                  <button 
                    onClick={() => { setMainView('sdk'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-2xl font-bold text-sm transition-all cursor-pointer ${
                      mainView === 'sdk' 
                        ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shadow-2xs' 
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                      <Code2 className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div>SDK & Integración</div>
                      <div className="text-[10px] text-gray-400 font-normal">Widget iFrame & APIs Trackers</div>
                    </div>
                  </button>
                </div>

                {/* Mobile Quick Toggles (Theme & Language) */}
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#171e2c] border border-gray-100 dark:border-gray-800 space-y-3 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-600 dark:text-gray-300">Appearance</span>
                    <button 
                      onClick={() => setDarkMode(!darkMode)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-[#202737] border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-800 dark:text-gray-200 shadow-2xs cursor-pointer"
                    >
                      {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-gray-600" />}
                      <span>{darkMode ? 'Dark' : 'Light'}</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-200/50 dark:border-gray-700/50">
                    <span className="text-xs font-bold text-gray-600 dark:text-gray-300">Language</span>
                    <button 
                      onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-[#202737] border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-800 dark:text-gray-200 shadow-2xs cursor-pointer"
                    >
                      <span>{lang === 'en' ? '🇺🇸 English' : '🇪🇸 Español'}</span>
                    </button>
                  </div>
                </div>

                {/* Ecosystem & Resources */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1 mb-2">Ecosystem Links</div>
                  <a 
                    href="https://bchblaze.cash" 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-200 transition-colors"
                  >
                    <span className="flex items-center gap-2"><Flame className="w-4 h-4 text-orange-500" /> BCH BLAZE Hackathon</span>
                    <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                  </a>
                  <a 
                    href="https://paryonusd.com" 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-200 transition-colors"
                  >
                    <span className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-emerald-500" /> ParyonUSD Sponsor</span>
                    <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                  </a>
                  <a 
                    href="https://t.me/bchblaze" 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-200 transition-colors"
                  >
                    <span className="flex items-center gap-2"><Globe className="w-4 h-4 text-blue-500" /> Telegram Community</span>
                    <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                  </a>
                </div>
              </div>

              {/* Selector de Red de la Plataforma (Platform Network Switcher) */}
              <div className="pt-4 border-t border-gray-100 dark:border-gray-800 text-xs">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5 text-xs">
                    <Globe className="w-3.5 h-3.5 text-primary" />
                    <span>Red de la Plataforma</span>
                  </div>
                  {/* Selector: Mainnet (Principal / Defecto) vs Testnet */}
                  <div className="inline-flex p-0.5 bg-gray-100 dark:bg-[#1b2230] rounded-xl border border-gray-200/60 dark:border-gray-700/60 text-[10px]">
                    <button
                      onClick={() => {
                        setPlatformNetwork('mainnet');
                        showToast('Red activa: Bitcoin Cash Mainnet (Producción)');
                      }}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        platformNetwork === 'mainnet'
                          ? 'bg-primary text-black shadow-xs font-black'
                          : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-black"></span>
                      <span>Mainnet</span>
                    </button>
                    <button
                      onClick={() => {
                        setPlatformNetwork('testnet');
                        showToast('Red activa: BCH Chipnet (Testnet)');
                      }}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        platformNetwork === 'testnet'
                          ? 'bg-amber-500 text-white shadow-xs font-black'
                          : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                      <span>Testnet</span>
                    </button>
                  </div>
                </div>

                {/* Card de Estado de la Red */}
                <div className="p-3 rounded-2xl bg-gray-50 dark:bg-[#171e2c] border border-gray-200/60 dark:border-gray-700/60 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-500 dark:text-gray-400 font-medium">Modo Activo:</span>
                    <span className={`font-bold flex items-center gap-1.5 ${
                      platformNetwork === 'mainnet' ? 'text-emerald-500 dark:text-emerald-400' : 'text-amber-500'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${
                        platformNetwork === 'mainnet' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                      }`}></span>
                      {PLATFORM_NETWORKS[platformNetwork].name}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-gray-200/50 dark:border-gray-700/50">
                    <span className="text-gray-500 dark:text-gray-400 font-medium">Bitcoin Cash:</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      {PLATFORM_NETWORKS[platformNetwork].bchChain}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-gray-200/50 dark:border-gray-700/50">
                    <span className="text-gray-500 dark:text-gray-400 font-medium">EVM:</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      {PLATFORM_NETWORKS[platformNetwork].evmChain}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MOBILE BOTTOM FLOATING DOCK (md:hidden: lightning 1-thumb navigation) */}
      <div className="fixed bottom-3 left-3 right-3 z-40 md:hidden pointer-events-none">
        <div className="pointer-events-auto bg-white/95 dark:bg-[#121722]/95 backdrop-blur-xl border border-gray-200/90 dark:border-gray-800/90 shadow-[0_8px_32px_rgba(0,0,0,0.18)] rounded-2xl px-2 py-1.5 flex items-center justify-around">
          
          {/* Tab 1: Home / Gateway */}
          <button 
            onClick={() => setMainView('gateway')}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all cursor-pointer ${
              mainView === 'gateway' 
                ? 'text-primary font-black scale-105' 
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 font-medium'
            }`}
          >
            <Sparkles className="w-5 h-5" />
            <span className="text-[10px] leading-tight">Home</span>
          </button>

          {/* Tab 2: Bridge Swap */}
          <button 
            onClick={() => setMainView('bridge')}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all cursor-pointer ${
              mainView === 'bridge' 
                ? 'text-primary font-black scale-105' 
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 font-medium'
            }`}
          >
            <Zap className="w-5 h-5" />
            <span className="text-[10px] leading-tight">Swap</span>
          </button>

          {/* Tab 3: Pools */}
          <button 
            onClick={() => setMainView('pools')}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all cursor-pointer ${
              mainView === 'pools' 
                ? 'text-cyan-500 font-black scale-105' 
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 font-medium'
            }`}
          >
            <Droplets className="w-5 h-5" />
            <span className="text-[10px] leading-tight">Pools</span>
          </button>

          {/* Tab 3.5: Lend */}
          <button 
            onClick={() => setMainView('lend')}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all cursor-pointer ${
              mainView === 'lend' 
                ? 'text-emerald-500 font-black scale-105' 
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 font-medium'
            }`}
          >
            <Lock className="w-5 h-5" />
            <span className="text-[10px] leading-tight">Lend</span>
          </button>

          {/* Tab 4: Docs */}
          <button 
            onClick={() => setMainView('docs')}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all cursor-pointer ${
              mainView === 'docs' 
                ? 'text-blue-500 font-black scale-105' 
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 font-medium'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span className="text-[10px] leading-tight">Docs</span>
          </button>

          {/* Tab 4: Wallet */}
          <button 
            onClick={() => {
              if (userContext) {
                setShowAccountModal(true);
              } else {
                setShowWalletModal(true);
              }
            }}
            className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 font-medium transition-all relative cursor-pointer"
          >
            <div className="relative">
              <Wallet className={`w-5 h-5 ${userContext ? 'text-emerald-500' : ''}`} />
              {userContext && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              )}
            </div>
            <span className={`text-[10px] leading-tight ${userContext ? 'text-emerald-500 font-bold' : ''}`}>
              {userContext ? 'Active' : 'Wallet'}
            </span>
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
