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
import { useWizardConnect } from '@wizardconnect/react';
import { 
  connectWalletConnect, 
  disconnectWalletConnect, 
  connectInjectedWallet, 
  WALLETCONNECT_PROJECT_ID 
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
  const [mainView, setMainView] = useState<'bridge' | 'gateway' | 'pools' | 'docs' | 'sdk' | 'lend'>('gateway');
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
  const [platformNetwork, setPlatformNetwork] = useState<'mainnet' | 'testnet'>('mainnet');
  const [docTab, setDocTab] = useState<'overview' | 'relayer' | 'pools' | 'fees' | 'security' | 'wallets'>('overview');

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
    return saved ? JSON.parse(saved) : null;
  });

  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [selectedWalletType, setSelectedWalletType] = useState<'paytaca' | 'walletconnect' | 'injected' | null>(null);

  const t = translations[lang];
  const wc = useWizardConnect({ dappName: 'BinaryLiquid Gateway', persistSession: true });
  const connectLockRef = useRef(false);

  const showToast = (message: string, type: 'success'|'error' = 'success') => {
    setToast({message, type});
    setTimeout(() => setToast(null), 3000);
  };
  
  const handleDisconnect = async () => {
    try { wc.disconnect(); } catch(e) {}
    try { await disconnectWalletConnect(); } catch(e) {}
    setUserContext(null);
    localStorage.removeItem('bliq_user');
    showToast('Wallet disconnected');
  };

  const onWalletConnected = async (address: string, providerName: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, signature: 'verified_session' })
      });
      const data = await res.json();
      if (data.user) {
        setUserContext(data.user);
        localStorage.setItem('bliq_user', JSON.stringify(data.user));
        showToast(`Connected via ${providerName}: ${address.slice(0, 10)}...${address.slice(-4)}`);
        return;
      }
    } catch (e) {}

    const fallbackUser = {
      address,
      connectedAt: new Date().toISOString(),
      provider: providerName
    };
    setUserContext(fallbackUser);
    localStorage.setItem('bliq_user', JSON.stringify(fallbackUser));
    showToast(`Connected via ${providerName}: ${address.slice(0, 10)}...${address.slice(-4)}`);
  };

  const handleConnectWallet = async (type: 'paytaca' | 'walletconnect' | 'injected') => {
    if (connectLockRef.current) return;
    connectLockRef.current = true;
    setTimeout(() => { connectLockRef.current = false; }, 3000);
    
    setShowWalletModal(false);
    setSelectedWalletType(type);

    if (type === 'paytaca') {
      // WizardConnect for Paytaca native Bitcoin Cash
      wc.connect();
    } else if (type === 'walletconnect') {
      // Official WalletConnect V2 with Project ID 4f9a67dcbecde36938bbeb6d312a5bad
      try {
        const { address } = await connectWalletConnect();
        await onWalletConnected(address, 'WalletConnect');
      } catch (err: any) {
        const msg = err.message || '';
        if (!msg.includes('User rejected') && !msg.includes('Connection cancelled')) {
          showToast(msg || 'WalletConnect cancelled', 'error');
        }
      } finally {
        setSelectedWalletType(null);
      }
    } else if (type === 'injected') {
      // Injected browser wallet (MetaMask / Rabby / Brave)
      try {
        const { address } = await connectInjectedWallet();
        await onWalletConnected(address, 'Browser Wallet');
      } catch (err: any) {
        showToast(err.message || 'Error connecting browser wallet', 'error');
      } finally {
        setSelectedWalletType(null);
      }
    }
  };

  // LOGIN via WizardConnect (Paytaca session listener)
  useEffect(() => {
    if (wc.state === 'connected') {
       let realAddress = '';
       try {
         const paths = wc.manager?.getSessionPaths();
         if (paths && paths.length > 0) {
            realAddress = paths[0].xpub || '';
         }
       } catch (e) {}
       
       if (!realAddress && wc.manager) {
         realAddress = (wc.manager as any).walletPublicKey || (wc.manager as any).address || '';
       }

       if (realAddress) {
         onWalletConnected(realAddress, 'Paytaca');
         setSelectedWalletType(null);
       }
    }
  }, [wc.state]);

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
            onConnectWallet={() => setShowWalletModal(true)}
            showToast={showToast}
            backendUrl=""
            onOpenLanding={() => {}}
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

          {/* Network Switcher Pill (Desktop) */}
          <div className="hidden lg:inline-flex p-0.5 bg-gray-100 dark:bg-[#161c28] rounded-full border border-gray-200/90 dark:border-gray-800 shadow-2xs text-xs">
            <button
              onClick={() => {
                setPlatformNetwork('mainnet');
                showToast('Red activa: Bitcoin Cash Mainnet (Producción)');
              }}
              className={`px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                platformNetwork === 'mainnet'
                  ? 'bg-primary text-black font-black shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
              title="Red Principal de Producción"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-black"></span>
              <span>Mainnet</span>
            </button>
            <button
              onClick={() => {
                setPlatformNetwork('testnet');
                showToast('Red activa: BCH Chipnet (Testnet)');
              }}
              className={`px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                platformNetwork === 'testnet'
                  ? 'bg-amber-500 text-white font-black shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
              title="Entorno de Pruebas Chipnet"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
              <span>Testnet</span>
            </button>
          </div>

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

          {/* Non-Custodial Wallet Action Button (Compact on phone, full on desktop) */}
          {userContext ? (
            <button 
              onClick={() => setShowAccountModal(true)} 
              className="bg-white dark:bg-[#161c28] hover:bg-gray-50 dark:hover:bg-[#1e2535] text-gray-900 dark:text-white px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full font-bold text-xs transition-all border border-gray-200/90 dark:border-gray-800 shadow-2xs flex items-center gap-1.5 sm:gap-2 hover:scale-105 cursor-pointer shrink-0"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-mono text-xs">
                {userContext.address ? `${userContext.address.slice(0, 6)}...${userContext.address.slice(-3)}` : 'Connected'}
              </span>
            </button>
          ) : (
            <button 
              onClick={() => setShowWalletModal(true)} 
              disabled={wc.state !== 'idle' && wc.state !== 'disconnected'} 
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

      {/* QR / WIZARDCONNECT DIALOG */}
      {wc.uri && wc.state === 'connecting' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[120] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#141924] rounded-3xl p-6 sm:p-8 w-full max-w-sm shadow-2xl relative border border-gray-100 dark:border-gray-800 flex flex-col items-center text-center">
            <button onClick={() => { wc.disconnect(); setSelectedWalletType(null); }} className="absolute top-5 right-5 text-gray-400 hover:text-gray-900 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 px-3 py-1 rounded-full transition-colors font-bold cursor-pointer">X</button>
            
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mb-2 mt-4 flex items-center justify-center gap-3">
              <img src="/wizardconnect-logo.png" className="w-9 h-9 sm:w-10 sm:h-10 object-contain" alt="Paytaca" />
              Scan with Paytaca
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-6">
              Open your Paytaca wallet, tap the Scan QR icon, and approve the connection via WizardConnect (100% Non-Custodial).
            </p>

            <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-inner flex items-center justify-center mb-6">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(wc.uri)}`} 
                alt="Connect QR" 
                className="w-44 h-44 sm:w-48 sm:h-48"
              />
            </div>
            
            <button 
              onClick={() => { copyToClipboard(wc.uri || ''); }} 
              className="w-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-800 dark:text-gray-200 font-bold text-xs py-3 rounded-xl transition-all cursor-pointer"
            >
              {copied ? '✓ Copied URI to Clipboard!' : 'Copy Connection URI'}
            </button>
          </div>
        </div>
      )}

      {/* DOCUMENTATION VIEW */}
      {mainView === 'docs' && (
        <main className="flex-1 p-4 sm:p-6 max-w-[1240px] w-full mx-auto animate-in fade-in zoom-in duration-300 pb-28 md:pb-12 text-left">
          {/* Header */}
          <div className="mb-6 sm:mb-8 border-b border-gray-200 dark:border-gray-800 pb-5 sm:pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>BinaryLiquid Technical Whitepaper & Architecture</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tight">
                Cross-Chain Gateway Docs
              </h2>
              <p className="text-gray-500 dark:text-gray-400 font-bold mt-1 text-xs sm:text-sm">
                Hybrid Relayer Engine, Non-Custodial Liquidity Pools & Autonomous Security Sweeper
              </p>
            </div>
            <button 
              onClick={() => setMainView('bridge')} 
              className="bg-primary hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md shadow-orange-500/20 hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <span>Launch Bridge Swap</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 sm:gap-8">
            {/* Sidebar Navigation */}
            <div className="lg:col-span-1 hidden lg:block">
              <div className="sticky top-24 space-y-1.5 border-r border-gray-100 dark:border-gray-800 pr-4">
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3 px-3">
                  Documentación
                </p>
                
                {[
                  { id: 'overview', label: '1. Overview & BLAZE Mission', icon: Globe },
                  { id: 'relayer', label: '2. Hybrid Relayer Engine', icon: Zap },
                  { id: 'pools', label: '3. Liquidity Pools & AMM', icon: Droplets },
                  { id: 'fees', label: '4. Fee Model & Oracles', icon: Activity },
                  { id: 'security', label: '5. Cold Vault & Anti-DDoS', icon: ShieldCheck },
                  { id: 'wallets', label: '6. Non-Custodial Wallets', icon: Wallet },
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = docTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setDocTab(item.id as any);
                        const el = document.getElementById(`doc-${item.id}`);
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                        isActive
                          ? 'bg-primary/10 text-primary border border-primary/20 shadow-2xs font-black'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}

                {/* Quick Network Status Card in Sidebar */}
                <div className="mt-6 p-3.5 rounded-2xl bg-gray-50 dark:bg-[#151a24] border border-gray-200/60 dark:border-gray-800 text-xs">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Red de la Plataforma</div>
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-500 mb-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>{PLATFORM_NETWORKS[platformNetwork].name}</span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed font-normal">
                    Conectado con Bitcoin Cash Mainnet y Polygon PoS.
                  </p>
                </div>
              </div>
            </div>

            {/* Main Documentation Body */}
            <div className="lg:col-span-3 space-y-10 sm:space-y-14">
              
              {/* SECTION 1: OVERVIEW & MISSION */}
              <section id="doc-overview" className="scroll-mt-24 space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black">
                    <Globe className="w-4 h-4" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
                    1. Protocol Overview & BLAZE Hackathon Mission
                  </h3>
                </div>

                <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm sm:text-base font-normal">
                  BinaryLiquid es la primera pasarela de liquidez cross-chain 100% sin custodia construida sobre la red <strong>Bitcoin Cash (BCH)</strong> y la tecnología de <strong>CashTokens</strong>. Diseñada específicamente para el hackathon <strong>BCH BLAZE Hackathon ($750 PUSD Stablecoin Track)</strong> patrocinado por <a href="https://paryonusd.com" target="_blank" rel="noreferrer" className="text-primary font-bold hover:underline">paryonusd.com</a> y <a href="https://bchblaze.cash" target="_blank" rel="noreferrer" className="text-primary font-bold hover:underline">bchblaze.cash</a>.
                </p>

                {/* 3 Value Pillars */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
                  <div className="p-4 rounded-2xl bg-white dark:bg-[#141924] border border-gray-200 dark:border-gray-800 shadow-xs">
                    <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center mb-3">
                      <Zap className="w-4 h-4" />
                    </div>
                    <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-1">Liquidación Instantánea</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                      Ejecución automatizada en ~3 segundos entre CashTokens UTXO (BCH) y tokens ERC-20 (Polygon).
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white dark:bg-[#141924] border border-gray-200 dark:border-gray-800 shadow-xs">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-3">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-1">100% No Custodial</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                      Las llaves privadas nunca salen de la wallet del usuario (firma directa vía WizardConnect o WalletConnect).
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white dark:bg-[#141924] border border-gray-200 dark:border-gray-800 shadow-xs">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-3">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-1">Rendimiento Real (LP)</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                      El 0.20% del volumen de swaps se distribuye directamente a los proveedores de liquidez en stablecoins reales.
                    </p>
                  </div>
                </div>

                {/* Platform Network Switcher Card */}
                <div className="bg-gray-50 dark:bg-[#141924] border border-gray-200 dark:border-gray-800 rounded-2xl p-4 sm:p-5 border-l-4 border-l-primary space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                        <Globe className="w-4 h-4 text-primary" /> Red de la Plataforma (Platform Network):
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-400 font-medium">Modo Activo:</span>
                        <span className={`text-xs font-bold flex items-center gap-1.5 ${
                          platformNetwork === 'mainnet' ? 'text-emerald-500 dark:text-emerald-400' : 'text-amber-500'
                        }`}>
                          <span className={`w-2 h-2 rounded-full ${
                            platformNetwork === 'mainnet' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                          }`}></span>
                          {PLATFORM_NETWORKS[platformNetwork].name}
                        </span>
                      </div>
                    </div>

                    {/* Selector Tabs: Mainnet vs Testnet */}
                    <div className="inline-flex p-1 bg-white dark:bg-[#1b2230] rounded-xl border border-gray-200 dark:border-gray-700 self-start sm:self-auto shadow-xs text-xs">
                      <button
                        onClick={() => {
                          setPlatformNetwork('mainnet');
                          showToast('Plataforma en Bitcoin Cash Mainnet (Producción)');
                        }}
                        className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          platformNetwork === 'mainnet'
                            ? 'bg-primary text-black shadow-xs font-black'
                            : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-black"></span>
                        Mainnet (Principal)
                      </button>
                      <button
                        onClick={() => {
                          setPlatformNetwork('testnet');
                          showToast('Plataforma en BCH Chipnet (Testnet)');
                        }}
                        className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          platformNetwork === 'testnet'
                            ? 'bg-amber-500 text-white shadow-xs font-black'
                            : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                        Testnet (Chipnet)
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="bg-white dark:bg-[#1b2230] p-3 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Capa Bitcoin Cash</div>
                        <div className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                          <img src="/BCH.png" className="w-4 h-4 rounded-full object-contain" alt="BCH" />
                          <span>{PLATFORM_NETWORKS[platformNetwork].bchChain}</span>
                        </div>
                      </div>
                      <a 
                        href={PLATFORM_NETWORKS[platformNetwork].explorerBch}
                        target="_blank" 
                        rel="noreferrer"
                        className="text-primary hover:underline text-xs font-bold flex items-center gap-1"
                      >
                        <span>Explorador</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="bg-white dark:bg-[#1b2230] p-3 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Capa EVM Cross-Chain</div>
                        <div className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                          <img src="/POL.png" className="w-4 h-4 rounded-full object-contain" alt="Polygon" />
                          <span>{PLATFORM_NETWORKS[platformNetwork].evmChain}</span>
                        </div>
                      </div>
                      <a 
                        href={PLATFORM_NETWORKS[platformNetwork].explorerEvm}
                        target="_blank" 
                        rel="noreferrer"
                        className="text-primary hover:underline text-xs font-bold flex items-center gap-1"
                      >
                        <span>Explorador</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              </section>

              {/* SECTION 2: HYBRID RELAYER ARCHITECTURE */}
              <section id="doc-relayer" className="scroll-mt-24 space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center font-black">
                    <Zap className="w-4 h-4" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
                    2. Hybrid Relayer Architecture & Cross-Chain Swapping
                  </h3>
                </div>

                <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm sm:text-base font-normal">
                  El motor Relayer de BinaryLiquid combina validación criptográfica en ambas cadenas con despacho automatizado desde la reserva flotante líquida del protocolo:
                </p>

                {/* 4-Step Pipeline Flow */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
                  <div className="p-4 rounded-2xl bg-white dark:bg-[#141924] border border-gray-200 dark:border-gray-800 text-left relative">
                    <div className="w-6 h-6 rounded-full bg-primary/20 text-primary font-black text-xs flex items-center justify-center mb-2">1</div>
                    <h5 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white mb-1">Cotización Oracle</h5>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                      El frontend calcula el monto neto descontando automáticamente la comisión del 0.30% con oráculos en vivo.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white dark:bg-[#141924] border border-gray-200 dark:border-gray-800 text-left relative">
                    <div className="w-6 h-6 rounded-full bg-primary/20 text-primary font-black text-xs flex items-center justify-center mb-2">2</div>
                    <h5 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white mb-1">Depósito On-Chain</h5>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                      El usuario firma la transacción desde su wallet (Paytaca o MetaMask) a la Hot Wallet de custodia operativa.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white dark:bg-[#141924] border border-gray-200 dark:border-gray-800 text-left relative">
                    <div className="w-6 h-6 rounded-full bg-primary/20 text-primary font-black text-xs flex items-center justify-center mb-2">3</div>
                    <h5 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white mb-1">Verificación Relayer</h5>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                      El Relayer L3 detecta el evento en la blockchain, valida la categoría CashToken o ERC-20 y confirma el bloque.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white dark:bg-[#141924] border border-gray-200 dark:border-gray-800 text-left relative">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-500 font-black text-xs flex items-center justify-center mb-2">4</div>
                    <h5 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white mb-1">Despacho Inmediato</h5>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                      Se envían los tokens equivalentes a la dirección destino en ~3 segundos y se registra en el ledger PostgreSQL.
                    </p>
                  </div>
                </div>
              </section>

              {/* SECTION 3: LIQUIDITY POOLS & AMM */}
              <section id="doc-pools" className="scroll-mt-24 space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center font-black">
                    <Droplets className="w-4 h-4" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
                    3. Liquidity Pools & Bootstrapping Auto-Unlock
                  </h3>
                </div>

                <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm sm:text-base font-normal">
                  La plataforma opera con <strong>8 pools canónicos</strong> que conectan el ecosistema Bitcoin Cash con las principales cadenas EVM y Solana:
                </p>

                {/* 8 Canonical Pools Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {[
                    { pair: 'PUSD / USDC', bch: 'ParyonUSD (CashTokens)', evm: 'USD Coin (Polygon)', status: 'ACTIVE', apy: '7.1%', tag: 'BLAZE Sponsor Pool Oficial' },
                    { pair: 'BCH / USDC', bch: 'Bitcoin Cash Native', evm: 'USD Coin (Polygon)', status: 'ACTIVE', apy: '6.4%', tag: 'Pool Principal BCH' },
                    { pair: 'PUSD / USDT', bch: 'ParyonUSD (CashTokens)', evm: 'Tether USD (Polygon)', status: 'ACTIVE', apy: '6.8%', tag: 'Stablecoin Parity' },
                    { pair: 'BCH / PUSD', bch: 'Bitcoin Cash Native', evm: 'ParyonUSD (CashTokens)', status: 'ACTIVE', apy: '8.2%', tag: 'UTXO Native AMM' },
                    { pair: 'MUSD / USDC', bch: 'MoriaUSD (CashTokens)', evm: 'USD Coin (Polygon)', status: 'ACTIVE', apy: '5.9%', tag: 'CashTokens Stable' },
                    { pair: 'SOL / USDC', bch: 'Solana SPL', evm: 'USD Coin (Polygon)', status: 'ACTIVE', apy: '7.8%', tag: 'Cross-Chain Solana' },
                    { pair: 'ETH / USDC', bch: 'Ethereum ERC-20', evm: 'USD Coin (Polygon)', status: 'BOOTSTRAPPING', apy: '8.5%', tag: 'Meta $20,000' },
                    { pair: 'POL / USDC', bch: 'Polygon Native', evm: 'USD Coin (Polygon)', status: 'ACTIVE', apy: '7.5%', tag: 'Polygon PoS AMM' },
                  ].map((p, i) => (
                    <div key={i} className="p-4 rounded-2xl bg-white dark:bg-[#141924] border border-gray-200 dark:border-gray-800 shadow-xs flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-sm text-gray-900 dark:text-white">{p.pair}</span>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            p.status === 'ACTIVE' 
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30' 
                              : 'bg-amber-500/10 text-amber-500 border border-amber-500/30'
                          }`}>
                            {p.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400">
                          {p.bch} ⟷ {p.evm}
                        </div>
                        <div className="text-[10px] text-primary font-bold mt-1">{p.tag}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-400 font-bold">APY Estimado</div>
                        <div className="text-base font-black text-emerald-500">{p.apy}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bootstrapping Auto-Unlock Feature Card */}
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-primary/10 border border-primary/20 space-y-2">
                  <h4 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Mecanismo de Desbloqueo Automático (Bootstrapping Auto-Unlock)
                  </h4>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-normal">
                    Los nuevos pools se inician en fase <code>BOOTSTRAPPING</code> con una meta de TVL objetivo (ej. $10,000 o $20,000). Los usuarios pueden proveer liquidez para fondear el pool. En el instante exacto en que la liquidez alcanza el 100% de la meta, el backend <strong>lo desbloquea automáticamente a estado `ACTIVE`</strong>, habilitando swaps públicos inmediatos sin intervención humana.
                  </p>
                </div>
              </section>

              {/* SECTION 4: FEE MODEL & ORACLES */}
              <section id="doc-fees" className="scroll-mt-24 space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-black">
                    <Activity className="w-4 h-4" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
                    4. Fee Model & High-Frequency Oracles
                  </h3>
                </div>

                <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm sm:text-base font-normal">
                  BinaryLiquid opera bajo un modelo de <strong>comisión plana y transparente del 0.30%</strong> sobre el volumen intercambiado:
                </p>

                {/* Fee Split Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="p-5 rounded-2xl bg-white dark:bg-[#141924] border border-gray-200 dark:border-gray-800 shadow-xs border-l-4 border-l-emerald-500">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Proveedores de Liquidez</span>
                      <span className="text-lg font-black text-emerald-500">0.20% (66.7%)</span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                      Se acredita de inmediato al balance del pool en cada swap, aumentando el valor contable de los shares LP sin dilución.
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-white dark:bg-[#141924] border border-gray-200 dark:border-gray-800 shadow-xs border-l-4 border-l-primary">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tesorería Bóveda Fría</span>
                      <span className="text-lg font-black text-primary">0.10% (33.3%)</span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                      Se transfiere automáticamente hacia la bóveda fría (Cold Treasury) para respaldar la infraestructura y reservas.
                    </p>
                  </div>
                </div>

                {/* Example Breakdown */}
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#161c28] border border-gray-200 dark:border-gray-700/80 text-xs">
                  <div className="font-bold text-gray-900 dark:text-white mb-1.5 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Ejemplo Matemático de Swap (1,000 PUSD ➔ USDC):</span>
                  </div>
                  <div className="space-y-1 font-mono text-[11px] text-gray-600 dark:text-gray-300">
                    <div>• Monto de Venta (Sell): 1,000.00 PUSD</div>
                    <div>• Comisión Total (0.30%): -3.00 USD (2.00 USD para LPs + 1.00 USD para Bóveda Fría)</div>
                    <div className="font-bold text-primary">• Monto Neto Recibido (Buy): 997.00 USDC (Despacho inmediato a la wallet de destino)</div>
                  </div>
                </div>

                {/* Oracle Engine Details */}
                <div className="p-4 rounded-2xl bg-white dark:bg-[#141924] border border-gray-200 dark:border-gray-800 space-y-2">
                  <h4 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-purple-500" />
                    Pool de Oráculos Multi-Fuente con Caché Redis
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    Para los pares volátiles (BCH, SOL, ETH, POL), el motor consulta cada 10 segundos las cotizaciones agregadas de <strong>Binance API, CoinGecko, Coinbase y Kraken</strong>. La persistencia en Redis previene caídas durante congestión o picos masivos de usuarios.
                  </p>
                </div>
              </section>

              {/* SECTION 5: SECURITY & COLD VAULT SWEPER */}
              <section id="doc-security" className="scroll-mt-24 space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-black">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
                    5. Security Architecture, Cold Vault Sweeper & Anti-DDoS
                  </h3>
                </div>

                <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm sm:text-base font-normal">
                  Para mitigar vectores de ataque y proteger los fondos de los usuarios, BinaryLiquid implementa una estricta separación entre la <strong>Hot Wallet operativa</strong> y la <strong>Bóveda Fría de Tesorería</strong>:
                </p>

                {/* Hot Float vs Cold Vault */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#141924] border border-gray-200 dark:border-gray-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-orange-500 uppercase tracking-widest">Hot Float Operativo</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500">Líquido</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                      Reserva activa (175 BCH, 50k PUSD, 50k USDC, 25k USDT) destinada exclusivamente a despachar swaps de forma inmediata.
                    </p>
                  </div>

                  <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#141924] border border-gray-200 dark:border-gray-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-blue-500 uppercase tracking-widest">Cold Treasury Vault</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500">Offline</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                      Bóveda fría protegida criptográficamente donde se resguardan las comisiones acumuladas del protocolo.
                    </p>
                  </div>
                </div>

                {/* Sweeper Engine Box */}
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#161c28] border border-gray-200 dark:border-gray-700 space-y-2">
                  <div className="font-bold text-xs text-gray-900 dark:text-white flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-primary" />
                    <span>Direcciones Oficiales de la Bóveda Fría (Cold Vault):</span>
                  </div>
                  <div className="space-y-1.5 font-mono text-[11px]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-2 rounded bg-white dark:bg-[#121620] border border-gray-200/60 dark:border-gray-700/60">
                      <span className="text-gray-500 font-sans font-bold">BCH Mainnet:</span>
                      <span className="text-gray-900 dark:text-gray-200 select-all">bitcoincash:qqgm9rel5xlyhwt3r6n8uq9fxk5zzxrcavaal6aw8v</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-2 rounded bg-white dark:bg-[#121620] border border-gray-200/60 dark:border-gray-700/60">
                      <span className="text-gray-500 font-sans font-bold">Polygon / EVM:</span>
                      <span className="text-gray-900 dark:text-gray-200 select-all">0x31ED1e684BD45a8724Ec11E873bA3F63fcf19f3f</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-2 rounded bg-white dark:bg-[#121620] border border-gray-200/60 dark:border-gray-700/60">
                      <span className="text-gray-500 font-sans font-bold">Solana:</span>
                      <span className="text-gray-900 dark:text-gray-200 select-all">7QRhmj6TeGXbPKDD4otBJ23kTv6F2wydkuvtRQ6RRWfT</span>
                    </div>
                  </div>
                </div>

                {/* Anti-DDoS Architecture */}
                <div className="p-4 rounded-2xl bg-white dark:bg-[#141924] border border-gray-200 dark:border-gray-800 space-y-2">
                  <h4 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                    <Server className="w-4 h-4 text-emerald-500" />
                    Protección Contra Ataques y Failover
                  </h4>
                  <ul className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400 list-disc list-inside">
                    <li><strong>Zonas de Rate-Limiting Nginx:</strong> Límites estrictos para mitigar inundaciones de órdenes spam (8 req/ráfaga en swaps, 25 req/ráfaga en API).</li>
                    <li><strong>Pool de 5 Nodos RPC:</strong> Conmutación automática por fallo entre dRPC, PublicNode, Ankr, BlockPI y 1RPC.</li>
                    <li><strong>Capa de Persistencia Inmutable:</strong> Base de datos PostgreSQL con auditoría de transacciones protegida contra pérdida de paquetes.</li>
                  </ul>
                </div>
              </section>

              {/* SECTION 6: NON-CUSTODIAL WALLETS */}
              <section id="doc-wallets" className="scroll-mt-24 space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-black">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
                    6. Non-Custodial Web3 Wallets & Sovereignty
                  </h3>
                </div>

                <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm sm:text-base font-normal">
                  BinaryLiquid no requiere creación de cuentas ni verificación KYC. La interacción ocurre de forma soberana a través de estándares Web3 abiertos:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                  <div className="p-4 rounded-2xl bg-white dark:bg-[#141924] border border-gray-200 dark:border-gray-800">
                    <div className="flex items-center gap-2.5 mb-2">
                      <img src="/wizardconnect-logo.png" className="w-7 h-7 object-contain" alt="Paytaca" />
                      <div>
                        <h5 className="font-bold text-sm text-gray-900 dark:text-white">Paytaca (WizardConnect)</h5>
                        <p className="text-[10px] text-primary font-bold uppercase tracking-wider">Recomendado para CashTokens</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                      Conexión nativa peer-to-peer para transaccionar PUSD, MUSD y BCH directamente desde dispositivos móviles o extensión de navegador.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white dark:bg-[#141924] border border-gray-200 dark:border-gray-800">
                    <div className="flex items-center gap-2.5 mb-2">
                      <img src="https://raw.githubusercontent.com/WalletConnect/walletconnect-assets/master/Icon/Blue%20(Default)/Icon.svg" className="w-6 h-6 object-contain" alt="WC" />
                      <div>
                        <h5 className="font-bold text-sm text-gray-900 dark:text-white">WalletConnect V2</h5>
                        <p className="text-[10px] text-blue-500 font-bold uppercase tracking-wider">MetaMask, Cashonize, Zapit</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                      Soporte multicadena para billeteras EVM (Polygon, Ethereum) y aplicaciones web compatibles con WalletConnect.
                    </p>
                  </div>
                </div>
              </section>

            </div>
          </div>
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
            onConnectWallet={() => setShowWalletModal(true)}
            showToast={showToast}
            backendUrl=""
            onOpenLanding={() => setMainView('gateway')}
          />
        </main>
      )}

      {/* LIQUIDITY POOLS VIEW */}
      {mainView === 'pools' && (
        <main className="flex-1 flex flex-col items-center justify-start p-4 sm:p-6 w-full max-w-7xl mx-auto pb-28 md:pb-12">
          <PoolsView
            backendUrl=""
            userAddress={userContext?.address || ''}
            onConnectWallet={() => setShowWalletModal(true)}
            showToast={showToast}
          />
        </main>
      )}

      {/* LENDING & BCH COLLATERAL VAULTS VIEW */}
      {mainView === 'lend' && (
        <main className="flex-1 flex flex-col items-center justify-start p-4 sm:p-6 w-full max-w-7xl mx-auto pb-28 md:pb-12">
          <LendingView
            backendUrl=""
            userAddress={userContext?.address || ''}
            isWalletConnected={Boolean(userContext?.address)}
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

      {/* NON-CUSTODIAL ACCOUNT MODAL */}
      <AnimatePresence>
        {showAccountModal && userContext && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[130] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="bg-white dark:bg-[#121620] rounded-[32px] p-6 sm:p-7 w-full max-w-sm shadow-2xl border border-gray-100 dark:border-gray-800 relative text-left"
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
                  <h3 className="font-bold text-gray-900 dark:text-white text-base">Connected Account</h3>
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    100% Non-Custodial Web3
                  </span>
                </div>
              </div>

              {/* Address Card */}
              <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-[#171d2b] border border-gray-200/80 dark:border-gray-700/80 mb-5">
                <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Your Active Wallet Address</div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-gray-900 dark:text-gray-200 truncate font-semibold">
                    {userContext.address || 'bitcoincash:qq...'}
                  </span>
                  <button 
                    onClick={() => copyToClipboard(userContext.address || '')}
                    className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors shrink-0 cursor-pointer"
                    title="Copy address"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Non-custodial Balances Preview */}
              <div className="space-y-2 mb-6">
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Self-Custody Assets</div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#171d2b] flex items-center justify-between border border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-2">
                    <img src="/PUSD.png" className="w-6 h-6 rounded-full object-contain" alt="PUSD" />
                    <span className="text-xs font-bold text-gray-900 dark:text-white">ParyonUSD (PUSD)</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">Direct UTXO</span>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#171d2b] flex items-center justify-between border border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-2">
                    <img src="/BCH.png" className="w-6 h-6 rounded-full object-contain" alt="BCH" />
                    <span className="text-xs font-bold text-gray-900 dark:text-white">Bitcoin Cash</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-gray-900 dark:text-white">On-Chain</span>
                </div>
              </div>

              <button 
                onClick={() => { handleDisconnect(); setShowAccountModal(false); }}
                className="w-full py-3 rounded-2xl bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Disconnect Wallet</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* WALLET SELECTOR MODAL */}
      {showWalletModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[120] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121722] rounded-3xl p-6 sm:p-8 w-full max-w-sm shadow-2xl relative border border-gray-100 dark:border-gray-800">
            <button onClick={() => setShowWalletModal(false)} className="absolute top-5 right-5 text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-3 py-1 rounded-full transition-colors font-bold cursor-pointer">
              ✕
            </button>
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mb-1.5 text-center">Connect Wallet</h2>
            <p className="text-xs text-gray-400 text-center mb-6">Choose your preferred provider (100% Non-Custodial)</p>
            
            <div className="space-y-3">
              {/* Option 1: Paytaca via WizardConnect */}
              <button 
                onClick={() => handleConnectWallet('paytaca')} 
                className="w-full bg-gray-50 dark:bg-[#171e2c] hover:bg-orange-50 dark:hover:bg-orange-950/20 border border-gray-200 dark:border-gray-700 hover:border-primary/50 p-3.5 sm:p-4 rounded-2xl flex items-center gap-3.5 sm:gap-4 transition-all group cursor-pointer text-left"
              >
                <div className="w-11 h-11 sm:w-12 sm:h-12 bg-white dark:bg-[#1f2737] rounded-xl shadow-2xs flex items-center justify-center group-hover:scale-105 transition-transform p-2 shrink-0">
                  <img src="/wizardconnect-logo.png" className="w-7 h-7 sm:w-8 sm:h-8 object-contain" alt="Paytaca" />
                </div>
                <div>
                  <h4 className="font-black text-gray-900 dark:text-white text-sm sm:text-base flex items-center gap-1.5">
                    <span>Paytaca</span>
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-500">BCH / CashTokens</span>
                  </h4>
                  <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 mt-0.5">WizardConnect Native Protocol</p>
                </div>
              </button>

              {/* Option 2: Official WalletConnect V2 */}
              <button 
                onClick={() => handleConnectWallet('walletconnect')} 
                className="w-full bg-gray-50 dark:bg-[#171e2c] hover:bg-blue-50 dark:hover:bg-blue-950/20 border border-gray-200 dark:border-gray-700 hover:border-blue-400/50 p-3.5 sm:p-4 rounded-2xl flex items-center gap-3.5 sm:gap-4 transition-all group cursor-pointer text-left"
              >
                <div className="w-11 h-11 sm:w-12 sm:h-12 bg-white dark:bg-[#1f2737] rounded-xl shadow-2xs flex items-center justify-center group-hover:scale-105 transition-transform p-2 shrink-0">
                  <img src="https://raw.githubusercontent.com/WalletConnect/walletconnect-assets/master/Icon/Blue%20(Default)/Icon.svg" className="w-6 h-6 object-contain" alt="WC" />
                </div>
                <div>
                  <h4 className="font-black text-gray-900 dark:text-white text-sm sm:text-base flex items-center gap-1.5">
                    <span>WalletConnect V2</span>
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500">Official SDK</span>
                  </h4>
                  <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 mt-0.5">MetaMask, Rainbow, Trust, Cashonize</p>
                </div>
              </button>

              {/* Option 3: Browser Extension (Injected MetaMask / Rabby) */}
              <button 
                onClick={() => handleConnectWallet('injected')} 
                className="w-full bg-gray-50 dark:bg-[#171e2c] hover:bg-emerald-50 dark:hover:bg-emerald-950/20 border border-gray-200 dark:border-gray-700 hover:border-emerald-400/50 p-3.5 sm:p-4 rounded-2xl flex items-center gap-3.5 sm:gap-4 transition-all group cursor-pointer text-left"
              >
                <div className="w-11 h-11 sm:w-12 sm:h-12 bg-white dark:bg-[#1f2737] rounded-xl shadow-2xs flex items-center justify-center group-hover:scale-105 transition-transform p-2 shrink-0">
                  <Wallet className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                  <h4 className="font-black text-gray-900 dark:text-white text-sm sm:text-base flex items-center gap-1.5">
                    <span>Browser Wallet</span>
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500">1-Click</span>
                  </h4>
                  <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 mt-0.5">MetaMask, Rabby, Brave Extension</p>
                </div>
              </button>
            </div>
            
            <p className="text-center text-xs text-gray-400 dark:text-gray-500 font-bold mt-6">
              New to Bitcoin Cash? <a href="https://paytaca.com" target="_blank" rel="noreferrer" className="text-primary hover:underline">Get Paytaca</a>
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
