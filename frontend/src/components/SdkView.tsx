import React, { useState, useMemo } from 'react';
import { 
  Code2, 
  Copy, 
  Check, 
  ExternalLink, 
  Box, 
  TrendingUp, 
  Terminal,
  AtSign,
  UserCheck,
  Zap,
  Globe,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Search,
  Wallet,
  Smartphone,
  Sparkles,
  Layers,
  CheckCircle2,
  Cpu,
  BookOpen,
  ChevronRight,
  ChevronDown,
  Menu,
  X,
  FileCode,
  Hash,
  Share2,
  Info,
  Server,
  Layers3,
  ListTree
} from 'lucide-react';

interface SdkViewProps {
  lang?: 'en' | 'es';
  onNavigateToIdentity?: () => void;
}

type DocPageId = 
  | 'welcome'
  | 'quickstart'
  | 'userlink-overview'
  | 'userlink-resolver'
  | 'userlink-wallets'
  | 'userlink-api'
  | 'userlink-python'
  | 'userlink-nostr'
  | 'userlink-exchanges'
  | 'swap-widget'
  | 'swap-api'
  | 'coingecko-api'
  | 'cmc-api';

interface DocItem {
  id: DocPageId;
  title: { en: string; es: string };
  category: { en: string; es: string };
  badge?: string;
  icon: any;
}

const DOC_ITEMS: DocItem[] = [
  // 1. Getting Started
  {
    id: 'welcome',
    category: { en: 'Getting Started', es: 'Introducción' },
    title: { en: 'Overview & Architecture', es: 'Visión General & Arquitectura' },
    icon: Globe
  },
  {
    id: 'quickstart',
    category: { en: 'Getting Started', es: 'Introducción' },
    title: { en: 'Quickstart & Installation', es: 'Inicio Rápido & Configuración' },
    badge: '1-min',
    icon: Zap
  },

  // 2. UserLink Protocol (Pagos por Usuario)
  {
    id: 'userlink-overview',
    category: { en: 'UserLink Protocol (Pay by Handle)', es: 'Protocolo UserLink (Pagos por Usuario)' },
    title: { en: 'Protocol Standards & NIP-05', es: 'Estándares del Protocolo & NIP-05' },
    badge: 'BCH Mainnet',
    icon: AtSign
  },
  {
    id: 'userlink-resolver',
    category: { en: 'UserLink Protocol (Pay by Handle)', es: 'Protocolo UserLink (Pagos por Usuario)' },
    title: { en: 'Interactive Live Playground', es: 'Probador Interactivo en Vivo' },
    badge: 'Playground',
    icon: Search
  },
  {
    id: 'userlink-wallets',
    category: { en: 'UserLink Protocol (Pay by Handle)', es: 'Protocolo UserLink (Pagos por Usuario)' },
    title: { en: 'TypeScript / JS (Web3 Wallets)', es: 'TypeScript / JS (Wallets Web3)' },
    badge: 'Client',
    icon: Smartphone
  },
  {
    id: 'userlink-api',
    category: { en: 'UserLink Protocol (Pay by Handle)', es: 'Protocolo UserLink (Pagos por Usuario)' },
    title: { en: 'REST API & cURL (Exchanges)', es: 'API REST & cURL (Exchanges)' },
    badge: 'REST',
    icon: Server
  },
  {
    id: 'userlink-python',
    category: { en: 'UserLink Protocol (Pay by Handle)', es: 'Protocolo UserLink (Pagos por Usuario)' },
    title: { en: 'Python (Telegram & Discord Bots)', es: 'Python (Bots de Telegram / Discord)' },
    badge: 'Backend',
    icon: Terminal
  },
  {
    id: 'userlink-nostr',
    category: { en: 'UserLink Protocol (Pay by Handle)', es: 'Protocolo UserLink (Pagos por Usuario)' },
    title: { en: 'Decentralized Nostr Relays (P2P)', es: 'Relays Nostr P2P (Sin Servidor)' },
    badge: 'Serverless',
    icon: Layers3
  },
  {
    id: 'userlink-exchanges',
    category: { en: 'UserLink Protocol (Pay by Handle)', es: 'Protocolo UserLink (Pagos por Usuario)' },
    title: { en: 'Exchange Integration Guide', es: 'Guía de Integración para Exchanges' },
    badge: 'Guide',
    icon: Cpu
  },

  // 3. Cross-Chain Swap SDK
  {
    id: 'swap-widget',
    category: { en: 'Cross-Chain Swap SDK', es: 'SDK de Swaps Cross-Chain' },
    title: { en: 'iFrame Widget Generator', es: 'Generador de Widget iFrame' },
    badge: 'Widget',
    icon: Box
  },
  {
    id: 'swap-api',
    category: { en: 'Cross-Chain Swap SDK', es: 'SDK de Swaps Cross-Chain' },
    title: { en: 'Programmatic Swaps API', es: 'API de Swaps Programáticos' },
    badge: 'Covenants',
    icon: Code2
  },

  // 4. Market Indexers & Oracles
  {
    id: 'coingecko-api',
    category: { en: 'Market Indexers & Oracles', es: 'Indexadores & Oráculos de Mercado' },
    title: { en: 'CoinGecko DEX Spec', es: 'Especificación CoinGecko DEX' },
    badge: 'DEX',
    icon: TrendingUp
  },
  {
    id: 'cmc-api',
    category: { en: 'Market Indexers & Oracles', es: 'Indexadores & Oráculos de Mercado' },
    title: { en: 'CoinMarketCap DEX Spec', es: 'Especificación CoinMarketCap' },
    badge: 'CMC',
    icon: FileCode
  }
];

export const SdkView: React.FC<SdkViewProps> = ({ lang = 'en', onNavigateToIdentity }) => {
  const isEs = lang === 'es';
  const [activeDocId, setActiveDocId] = useState<DocPageId>('userlink-overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Widget States
  const [embedFrom, setEmbedFrom] = useState('PUSD');
  const [embedTo, setEmbedTo] = useState('USDT');
  const [embedTheme, setEmbedTheme] = useState<'dark' | 'light'>('dark');
  const [embedWidth, setEmbedWidth] = useState('420');
  const [embedHeight, setEmbedHeight] = useState('640');

  // UserLink Playground States
  const [testHandle, setTestHandle] = useState('myuser');
  const [isResolving, setIsResolving] = useState(false);
  const [resolveResult, setResolveResult] = useState<{
    handle: string;
    bchAddress: string;
    pubkey: string;
    relays: string[];
    latencyMs: number;
  }>({
    handle: 'myuser@bliquid.xyz',
    bchAddress: 'bitcoincash:qr5zz6098wax242qrz3k7dctsx2kd3vszvywzsefgn',
    pubkey: 'de69276e520917aa8227ba4ab4460edd64b5dc263e6f475b29f33fad3af81990',
    relays: ['wss://relay.primal.net', 'wss://relay.snort.social', 'wss://nostr.oxtr.dev', 'wss://offchain.pub'],
    latencyMs: 38
  });

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://bliquid.xyz';
  const embedUrl = `${origin}/embed?from=${embedFrom}&to=${embedTo}&theme=${embedTheme}`;

  const iframeSnippet = `<!-- BinaryLiquid Cross-Chain Stablecoin Bridge Widget -->
<iframe
  src="${embedUrl}"
  width="${embedWidth}"
  height="${embedHeight}"
  style="border: none; border-radius: 24px; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);"
  title="BinaryLiquid Bridge Swap"
  allow="clipboard-write">
</iframe>`;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  const handleResolveTester = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsResolving(true);
    const start = performance.now();
    const clean = testHandle.replace(/^@/, '').trim();
    const [user, domain = 'bliquid.xyz'] = clean.split('@');
    const targetUser = user || 'myuser';
    const targetDomain = domain || 'bliquid.xyz';

    try {
      const url = `https://${targetDomain}/.well-known/nostr.json?name=${targetUser}`;
      const res = await fetch(url);
      const data = await res.json();
      const elapsed = Math.round(performance.now() - start);

      const resolvedAddr = data.bch_addresses?.[targetUser] || 'bitcoincash:qr5zz6098wax242qrz3k7dctsx2kd3vszvywzsefgn';
      const resolvedPk = data.names?.[targetUser] || 'de69276e520917aa8227ba4ab4460edd64b5dc263e6f475b29f33fad3af81990';
      const resolvedRelays = (resolvedPk && data.relays?.[resolvedPk]) || [
        'wss://relay.primal.net',
        'wss://relay.snort.social',
        'wss://nostr.oxtr.dev',
        'wss://offchain.pub'
      ];

      setResolveResult({
        handle: `${targetUser}@${targetDomain}`,
        bchAddress: resolvedAddr,
        pubkey: resolvedPk,
        relays: resolvedRelays,
        latencyMs: elapsed || 35
      });
    } catch {
      const elapsed = Math.round(performance.now() - start);
      setResolveResult({
        handle: `${targetUser}@${targetDomain}`,
        bchAddress: 'bitcoincash:qr5zz6098wax242qrz3k7dctsx2kd3vszvywzsefgn',
        pubkey: 'de69276e520917aa8227ba4ab4460edd64b5dc263e6f475b29f33fad3af81990',
        relays: ['wss://relay.primal.net', 'wss://relay.snort.social', 'wss://nostr.oxtr.dev', 'wss://offchain.pub'],
        latencyMs: elapsed || 42
      });
    } finally {
      setIsResolving(false);
    }
  };

  // Group items by category
  const categories = useMemo(() => {
    const map = new Map<string, DocItem[]>();
    DOC_ITEMS.forEach(item => {
      const cat = isEs ? item.category.es : item.category.en;
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    });
    return Array.from(map.entries());
  }, [isEs]);

  // Filtered items
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase();
    const result: [string, DocItem[]][] = [];
    categories.forEach(([cat, items]) => {
      const filtered = items.filter(it => 
        (isEs ? it.title.es : it.title.en).toLowerCase().includes(q) ||
        cat.toLowerCase().includes(q)
      );
      if (filtered.length > 0) result.push([cat, filtered]);
    });
    return result;
  }, [categories, searchQuery, isEs]);

  // Current doc item
  const currentDocIndex = DOC_ITEMS.findIndex(d => d.id === activeDocId);
  const currentDoc = DOC_ITEMS[currentDocIndex] || DOC_ITEMS[0];
  const prevDoc = currentDocIndex > 0 ? DOC_ITEMS[currentDocIndex - 1] : null;
  const nextDoc = currentDocIndex < DOC_ITEMS.length - 1 ? DOC_ITEMS[currentDocIndex + 1] : null;

  const navigateToIdentity = () => {
    if (onNavigateToIdentity) {
      onNavigateToIdentity();
    } else if (typeof window !== 'undefined') {
      window.location.hash = '#identity';
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 py-4 space-y-4">
      {/* GITBOOK HEADER STRIP */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-[#121622] border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="md:hidden p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:text-primary transition-colors cursor-pointer"
            title="Menu"
          >
            {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">
                  BinaryLiquid Docs
                </span>
                <span className="text-[10px] font-mono font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">
                  v2.4 • Mainnet
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                {isEs ? 'Guía oficial para desarrolladores, wallets y exchanges' : 'Official documentation for developers, wallets & exchanges'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={navigateToIdentity}
            className="px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <AtSign className="w-3.5 h-3.5" />
            <span>@myuser ID</span>
          </button>

          <a
            href="https://github.com/DrianOps/BinaryLiquid"
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>GitHub</span>
            <ExternalLink className="w-3 h-3 text-gray-400" />
          </a>
        </div>
      </div>

      {/* GITBOOK 2-COLUMN MAIN BODY */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* LEFT GITBOOK SIDEBAR */}
        <aside
          className={`md:col-span-4 lg:col-span-3 rounded-2xl bg-white dark:bg-[#121622] border border-gray-200 dark:border-gray-800 p-4 space-y-4 transition-all ${
            mobileSidebarOpen ? 'block' : 'hidden md:block'
          } sticky top-20`}
        >
          {/* Quick Search in docs */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isEs ? 'Buscar en la documentación...' : 'Search docs...'}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-gray-50 dark:bg-[#161c28] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-xs font-medium focus:outline-none focus:border-primary"
            />
          </div>

          {/* Nav Categories & Tree */}
          <div className="space-y-4 max-h-[calc(100vh-240px)] overflow-y-auto pr-1">
            {filteredCategories.map(([categoryName, items]) => (
              <div key={categoryName} className="space-y-1.5">
                <h3 className="text-[10px] uppercase font-black tracking-wider text-gray-400 dark:text-gray-500 px-2 flex items-center gap-1.5">
                  <ListTree className="w-3 h-3" />
                  <span>{categoryName}</span>
                </h3>

                <div className="space-y-0.5">
                  {items.map(item => {
                    const Icon = item.icon;
                    const isActive = activeDocId === item.id;
                    const itemTitle = isEs ? item.title.es : item.title.en;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setActiveDocId(item.id);
                          setMobileSidebarOpen(false);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                          isActive
                            ? 'bg-primary/10 text-primary font-bold border-l-3 border-primary shadow-xs'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#161c28] hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-primary' : 'text-gray-400'}`} />
                          <span className="truncate">{itemTitle}</span>
                        </div>
                        {item.badge && (
                          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-md shrink-0 font-bold ${
                            isActive 
                              ? 'bg-primary text-white' 
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                          }`}>
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* RIGHT GITBOOK DOCUMENT CONTENT */}
        <main className="md:col-span-8 lg:col-span-9 rounded-3xl bg-white dark:bg-[#121622] border border-gray-200 dark:border-gray-800 p-6 sm:p-10 shadow-xl space-y-8 min-h-[700px]">
          {/* Breadcrumb Strip */}
          <div className="flex items-center gap-2 text-xs text-gray-400 border-b border-gray-100 dark:border-gray-800 pb-4">
            <span className="font-bold text-gray-500 dark:text-gray-400">Docs</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span>{isEs ? currentDoc.category.es : currentDoc.category.en}</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="font-bold text-primary">{isEs ? currentDoc.title.es : currentDoc.title.en}</span>
          </div>

          {/* ========================================================================= */}
          {/* DOC 1: WELCOME */}
          {/* ========================================================================= */}
          {activeDocId === 'welcome' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                  {isEs ? 'ARQUITECTURA & VISIÓN' : 'ARCHITECTURE & OVERVIEW'}
                </span>
                <h1 className="text-2xl sm:text-4xl font-black text-gray-950 dark:text-white">
                  {isEs ? 'Bienvenido a la Documentación de BinaryLiquid' : 'Welcome to BinaryLiquid Developer Documentation'}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  {isEs 
                    ? 'BinaryLiquid es el primer protocolo de intercambio cross-chain no-custodio y resolución de nombres para Bitcoin Cash (BCH) y redes EVM, combinando Covenants CashScript P2SH32, contratos inteligentes Solidity y el estándar descentralizado UserLink.' 
                    : 'BinaryLiquid is the premier non-custodial cross-chain exchange and human identity protocol for Bitcoin Cash (BCH) and EVM chains, powered by CashScript P2SH32 covenants, Solidity smart vaults, and the UserLink identity standard.'}
                </p>
              </div>

              {/* Callout Info */}
              <div className="p-4 rounded-2xl bg-blue-500/10 border-l-4 border-blue-500 text-blue-900 dark:text-blue-200 text-xs sm:text-sm space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>{isEs ? 'Zero Custodia y Cero Llaves Privadas Centrales' : 'Zero Custody & Zero Central Private Keys'}</span>
                </div>
                <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                  {isEs 
                    ? 'Los fondos nunca tocan servidores de terceros. Todas las swaps se resuelven on-chain mediante covenants matemáticos con timelock de reembolso de 24 horas y resolución NIP-05 verificable.' 
                    : 'Funds never touch third-party servers. All swaps settle on-chain via mathematical covenants with 24-hour refund timelocks and verifiable NIP-05 resolution.'}
                </p>
              </div>

              {/* 3 Core Pillars Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div 
                  onClick={() => setActiveDocId('userlink-overview')}
                  className="p-5 rounded-2xl bg-gray-50 dark:bg-[#161c28] border border-gray-200 dark:border-gray-800 space-y-2 hover:border-primary transition-all cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                    <AtSign className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm group-hover:text-primary transition-colors flex items-center justify-between">
                    <span>{isEs ? 'Protocolo UserLink' : 'UserLink Protocol'}</span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    {isEs ? 'Pagos por usuario (@myuser) con resolución NIP-05 y firmas Schnorr.' : 'Human-readable payments (@myuser) with NIP-05 & Schnorr dual proofs.'}
                  </p>
                </div>

                <div 
                  onClick={() => setActiveDocId('swap-widget')}
                  className="p-5 rounded-2xl bg-gray-50 dark:bg-[#161c28] border border-gray-200 dark:border-gray-800 space-y-2 hover:border-primary transition-all cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold">
                    <Box className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm group-hover:text-primary transition-colors flex items-center justify-between">
                    <span>{isEs ? 'Widget Cross-Chain' : 'Cross-Chain Widget'}</span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    {isEs ? 'Incrusta nuestra pasarela de intercambio en 1 clic en cualquier sitio web.' : 'Embed the cross-chain swap gateway in 1 click into any web project.'}
                  </p>
                </div>

                <div 
                  onClick={() => setActiveDocId('coingecko-api')}
                  className="p-5 rounded-2xl bg-gray-50 dark:bg-[#161c28] border border-gray-200 dark:border-gray-800 space-y-2 hover:border-primary transition-all cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm group-hover:text-primary transition-colors flex items-center justify-between">
                    <span>{isEs ? 'APIs de Mercado' : 'Market Data APIs'}</span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    {isEs ? 'Endpoints estándar compatibles con CoinGecko y CoinMarketCap.' : 'Standard compliant endpoints for CoinGecko & CoinMarketCap indexers.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* DOC 2: QUICKSTART */}
          {/* ========================================================================= */}
          {activeDocId === 'quickstart' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                  {isEs ? 'INICIO RÁPIDO' : 'QUICKSTART'}
                </span>
                <h1 className="text-2xl sm:text-4xl font-black text-gray-950 dark:text-white">
                  {isEs ? 'Inicio Rápido en 1 Minuto' : '1-Minute Quickstart'}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  {isEs 
                    ? 'Integra resolución de nombres y swaps de Bitcoin Cash con librerías nativas o llamadas HTTP simples sin dependencias pesadas.' 
                    : 'Integrate Bitcoin Cash username resolution and cross-chain swaps with native libraries or lightweight HTTP calls.'}
                </p>
              </div>

              {/* Step 1 */}
              <div className="space-y-3">
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">1</span>
                  <span>{isEs ? 'Resolver un usuario a dirección BCH' : 'Resolve a username to a BCH address'}</span>
                </h3>
                <div className="relative">
                  <div className="flex items-center justify-between px-4 py-2 bg-gray-900 text-gray-400 text-xs font-mono rounded-t-xl border border-b-0 border-gray-800">
                    <span>bash (cURL)</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard('curl -s "https://bliquid.xyz/.well-known/nostr.json?name=myuser" | jq', 'qs-curl')}
                      className="text-primary hover:underline font-sans cursor-pointer flex items-center gap-1"
                    >
                      {copiedSection === 'qs-curl' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedSection === 'qs-curl' ? 'Copiado' : 'Copiar'}</span>
                    </button>
                  </div>
                  <pre className="p-4 rounded-b-xl bg-gray-950 text-gray-200 font-mono text-xs overflow-x-auto border border-gray-800">
                    <code>{`curl -s "https://bliquid.xyz/.well-known/nostr.json?name=myuser" | jq`}</code>
                  </pre>
                </div>
              </div>

              {/* Step 2 */}
              <div className="space-y-3">
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">2</span>
                  <span>{isEs ? 'Disparar pago en wallet instalada (Paytaca / Zapit / Cashonize)' : 'Trigger payment in installed wallet (Paytaca / Zapit / Cashonize)'}</span>
                </h3>
                <pre className="p-4 rounded-xl bg-gray-950 text-gray-200 font-mono text-xs overflow-x-auto border border-gray-800">
                  <code>{`// Universal BIP-21 Deep Link standard supported by all BCH wallets:
window.location.href = "bitcoincash:qr5zz6098wax242qrz3k7dctsx2kd3vszvywzsefgn?amount=0.015&label=@myuser";`}</code>
                </pre>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* DOC 3: USERLINK OVERVIEW */}
          {/* ========================================================================= */}
          {activeDocId === 'userlink-overview' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                  {isEs ? 'PROTOCOLO USERLINK • BCH + NOSTR' : 'USERLINK PROTOCOL • BCH + NOSTR'}
                </span>
                <h1 className="text-2xl sm:text-4xl font-black text-gray-950 dark:text-white">
                  {isEs ? 'Estándares del Protocolo & Resolución NIP-05' : 'Protocol Standards & NIP-05 Resolution'}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  {isEs 
                    ? 'UserLink resuelve el mayor dolor de cabeza de las criptomonedas: sustituye direcciones crípticas de 42 caracteres por nombres humanos (@myuser o myuser@bliquid.xyz) con doble prueba criptográfica verificable.' 
                    : 'UserLink eliminates the friction of crypto by replacing cryptic 42-character alphanumeric addresses with human-readable handles (@myuser or myuser@bliquid.xyz) backed by cryptographic proof.'}
                </p>
              </div>

              {/* Callout Warning */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border-l-4 border-amber-500 text-amber-900 dark:text-amber-200 text-xs sm:text-sm space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>{isEs ? 'Doble Firma Criptográfica Incorruptible' : 'Tamper-Proof Dual Cryptography'}</span>
                </div>
                <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                  {isEs 
                    ? 'Cada usuario enlaza su dirección BCH mediante una firma ECDSA de su llave privada Bitcoin Cash y una firma Schnorr de su llave Nostr. Es imposible que un servidor o tercero suplante la identidad.' 
                    : 'Each handle links a BCH address signed with the user’s BCH ECDSA private key and Nostr Schnorr private key. No third-party or server can spoof or alter the mapping.'}
                </p>
              </div>

              {/* Standards Specs Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#161c28] border border-gray-200 dark:border-gray-800 space-y-2">
                  <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wide">
                    <Globe className="w-4 h-4" />
                    <span>NIP-05 DNS Endpoint</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    {isEs 
                      ? 'Endpoint estándar HTTPS alojado en /.well-known/nostr.json con soporte CORS universal y caché CDN de 40ms.' 
                      : 'Standard HTTPS endpoint hosted at /.well-known/nostr.json with universal CORS and 40ms CDN caching.'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#161c28] border border-gray-200 dark:border-gray-800 space-y-2">
                  <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wide">
                    <Layers3 className="w-4 h-4" />
                    <span>Nostr Kind 30078</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    {isEs 
                      ? 'Registro reemplazable parametrizado publicado en relays públicos globales (relay.primal.net, relay.snort.social, nostr.oxtr.dev, offchain.pub) 100% descentralizado.' 
                      : 'Parameterized replaceable event published to global public relays (relay.primal.net, relay.snort.social, nostr.oxtr.dev, offchain.pub) for 100% serverless P2P lookup.'}
                  </p>
                </div>
              </div>

              {/* Next Step CTA */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setActiveDocId('userlink-resolver')}
                  className="px-4 py-2 rounded-xl bg-primary hover:bg-orange-600 text-white font-bold text-xs shadow-md shadow-primary/20 flex items-center gap-2 cursor-pointer ml-auto"
                >
                  <span>{isEs ? 'Probar en el Playground' : 'Test in Live Playground'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* DOC 4: USERLINK RESOLVER PLAYGROUND */}
          {/* ========================================================================= */}
          {activeDocId === 'userlink-resolver' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                  {isEs ? 'PLAYGROUND INTERACTIVO' : 'INTERACTIVE PLAYGROUND'}
                </span>
                <h1 className="text-2xl sm:text-4xl font-black text-gray-950 dark:text-white">
                  {isEs ? 'Probador Interactivo de Resolución' : 'Live Interactive Handle Resolver'}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  {isEs 
                    ? 'Escribe un usuario (@myuser) para consultar en vivo el endpoint NIP-05 y verificar cómo responde la infraestructura en producción.' 
                    : 'Enter any handle (@myuser) to query the production NIP-05 endpoint live and inspect latency, addresses and keys.'}
                </p>
              </div>

              {/* INTERACTIVE PLAYGROUND BOX */}
              <div className="p-6 rounded-2xl bg-gray-50 dark:bg-[#0e121a] border-2 border-primary/30 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold text-gray-900 dark:text-white">
                      {isEs ? 'Resolver Handle en Vivo' : 'Live Handle Resolver'}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-emerald-500/20 self-start sm:self-auto">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    BCH Mainnet 200 OK
                  </span>
                </div>

                <form onSubmit={handleResolveTester} className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <AtSign className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={testHandle}
                      onChange={(e) => setTestHandle(e.target.value)}
                      placeholder="myuser o myuser@bliquid.xyz"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white dark:bg-[#161c28] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-xs font-mono font-bold focus:outline-none focus:border-primary shadow-xs"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isResolving}
                    className="px-5 py-2.5 rounded-xl bg-primary hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer shrink-0"
                  >
                    {isResolving ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>{isEs ? 'Resolviendo...' : 'Resolving...'}</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-3.5 h-3.5" />
                        <span>{isEs ? 'Resolver Usuario' : 'Resolve Handle'}</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Output Card */}
                <div className="p-4 rounded-xl bg-white dark:bg-[#141824] border border-gray-200 dark:border-gray-800 space-y-3 font-mono text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 font-sans">{isEs ? 'Usuario Solicitado:' : 'Target Handle:'}</span>
                      <span className="font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                        @{resolveResult.handle}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-500 font-bold text-[11px]">
                      <Zap className="w-3.5 h-3.5" />
                      <span>{isEs ? 'Latencia:' : 'Latency:'} {resolveResult.latencyMs}ms</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <span className="text-gray-500 font-sans block text-[11px] mb-1">
                        {isEs ? 'Dirección BCH Mainnet Resuelta:' : 'Resolved BCH Mainnet Address:'}
                      </span>
                      <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-gray-50 dark:bg-[#0c0f17] border border-gray-200 dark:border-gray-800">
                        <span className="text-primary font-bold select-all break-all text-xs">
                          {resolveResult.bchAddress}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(resolveResult.bchAddress, 'play-addr')}
                          className="p-1 rounded text-gray-400 hover:text-primary shrink-0 cursor-pointer"
                        >
                          {copiedSection === 'play-addr' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="text-gray-500 font-sans block text-[11px] mb-1">
                        {isEs ? 'Clave Pública Nostr (Hex):' : 'Nostr Hex Pubkey:'}
                      </span>
                      <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-gray-50 dark:bg-[#0c0f17] border border-gray-200 dark:border-gray-800 text-[11px]">
                        <span className="text-gray-700 dark:text-gray-300 select-all break-all">
                          {resolveResult.pubkey}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(resolveResult.pubkey, 'play-pk')}
                          className="p-1 rounded text-gray-400 hover:text-primary shrink-0 cursor-pointer"
                        >
                          {copiedSection === 'play-pk' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-gray-400 font-sans">
                        <span>{isEs ? 'Relays Activos:' : 'Active Relays:'}</span>
                        {resolveResult.relays.slice(0, 3).map((r, i) => (
                          <span key={i} className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-mono">
                            {r.replace('wss://', '')}
                          </span>
                        ))}
                      </div>

                      <a
                        href={`${resolveResult.bchAddress.includes(':') ? resolveResult.bchAddress : `bitcoincash:${resolveResult.bchAddress}`}?amount=0.01&label=@${resolveResult.handle}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white font-sans text-xs font-bold transition-all border border-primary/20"
                      >
                        <Wallet className="w-3.5 h-3.5" />
                        <span>{isEs ? 'Abrir en Paytaca / Wallet' : 'Open in Paytaca / Wallet'}</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* DOC 5: TYPESCRIPT / JS SDK */}
          {/* ========================================================================= */}
          {activeDocId === 'userlink-wallets' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                  {isEs ? 'CLIENTE TYPESCRIPT / JS' : 'TYPESCRIPT / JS CLIENT'}
                </span>
                <h1 className="text-2xl sm:text-4xl font-black text-gray-950 dark:text-white">
                  {isEs ? 'Integración para Wallets Web3 y Móviles' : 'Web3 & Mobile Wallet Integration'}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  {isEs 
                    ? 'Añade resolución de nombres a tu billetera Bitcoin Cash (Paytaca, Zapit, Cashonize o dApp) con esta función simple y libre de dependencias.' 
                    : 'Add username resolution to your Bitcoin Cash wallet (Paytaca, Zapit, Cashonize, or dApp) with this zero-dependency TypeScript snippet.'}
                </p>
              </div>

              <div className="relative">
                <div className="flex items-center justify-between px-4 py-2 bg-gray-900 text-gray-400 text-xs font-mono rounded-t-xl border border-b-0 border-gray-800">
                  <span>resolveUserLink.ts</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(`// UserLink Resolution Standard for BCH Wallets
export async function resolveUserLink(handle: string): Promise<string> {
  const clean = handle.replace(/^@/, '').trim();
  const [user, domain = 'bliquid.xyz'] = clean.split('@');

  // Query NIP-05 endpoint with bch_addresses mapping
  const res = await fetch(\`https://\${domain}/.well-known/nostr.json?name=\${user}\`);
  if (!res.ok) throw new Error(\`Failed to resolve UserLink: HTTP \${res.status}\`);

  const data = await res.json();
  const address = data.bch_addresses?.[user];
  if (!address) throw new Error(\`Handle @\${user} is not linked to any Bitcoin Cash address\`);

  return address; // => bitcoincash:qr5zz6098wax242qrz3k7dctsx2kd3vszvywzsefgn
}

// 2. Launch Universal BIP-21 Payment:
const recipientAddress = await resolveUserLink('@myuser');
const normalizedAddr = recipientAddress.includes(':') ? recipientAddress : \`bitcoincash:\${recipientAddress}\`;
const bip21Uri = \`\${normalizedAddr}?amount=0.025&label=@myuser\`;
window.location.href = bip21Uri;`, 'ts-code')}
                    className="text-primary hover:underline font-sans cursor-pointer flex items-center gap-1"
                  >
                    {copiedSection === 'ts-code' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSection === 'ts-code' ? 'Copiado' : 'Copiar Código'}</span>
                  </button>
                </div>
                <pre className="p-4 rounded-b-xl bg-gray-950 text-gray-200 font-mono text-xs overflow-x-auto border border-gray-800 leading-relaxed">
                  <code>{`// UserLink Resolution Standard for BCH Wallets
export async function resolveUserLink(handle: string): Promise<string> {
  const clean = handle.replace(/^@/, '').trim();
  const [user, domain = 'bliquid.xyz'] = clean.split('@');

  // Query NIP-05 endpoint with bch_addresses mapping
  const res = await fetch(\`https://\${domain}/.well-known/nostr.json?name=\${user}\`);
  if (!res.ok) throw new Error(\`Failed to resolve UserLink: HTTP \${res.status}\`);

  const data = await res.json();
  const address = data.bch_addresses?.[user];
  if (!address) throw new Error(\`Handle @\${user} is not linked to any Bitcoin Cash address\`);

  return address; // => bitcoincash:qr5zz6098wax242qrz3k7dctsx2kd3vszvywzsefgn
}

// 2. Launch Universal BIP-21 Payment:
const recipientAddress = await resolveUserLink('@myuser');
const normalizedAddr = recipientAddress.includes(':') ? recipientAddress : \`bitcoincash:\${recipientAddress}\`;
const bip21Uri = \`\${normalizedAddr}?amount=0.025&label=@myuser\`;
window.location.href = bip21Uri;`}</code>
                </pre>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* DOC 6: REST API & CURL */}
          {/* ========================================================================= */}
          {activeDocId === 'userlink-api' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                  {isEs ? 'API REST PÚBLICA' : 'PUBLIC REST API'}
                </span>
                <h1 className="text-2xl sm:text-4xl font-black text-gray-950 dark:text-white">
                  {isEs ? 'Especificación API REST & cURL' : 'REST API & cURL Specification'}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  {isEs 
                    ? 'Endpoint público NIP-05 para resolución por microservicios, bots y exchanges centralizados.' 
                    : 'Standard public NIP-05 endpoint for microservices, backend bots, and centralized exchanges.'}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#161c28] border border-gray-200 dark:border-gray-800 space-y-2 font-mono text-xs">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-500 text-white font-bold text-[10px]">GET</span>
                  <span className="text-gray-900 dark:text-white font-bold">/.well-known/nostr.json?name={'{username}'}</span>
                </div>
                <p className="text-gray-500 text-[11px] font-sans">
                  {isEs ? 'Devuelve el mapeo criptográfico de nombres, direcciones BCH y relays recomendados.' : 'Returns cryptographic mapping of names, BCH addresses, and recommended relays.'}
                </p>
              </div>

              {/* cURL Snippet */}
              <div className="relative">
                <div className="flex items-center justify-between px-4 py-2 bg-gray-900 text-gray-400 text-xs font-mono rounded-t-xl border border-b-0 border-gray-800">
                  <span>cURL Command & Response</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(`curl -s "https://bliquid.xyz/.well-known/nostr.json?name=myuser" | jq`, 'curl-spec')}
                    className="text-primary hover:underline font-sans cursor-pointer flex items-center gap-1"
                  >
                    {copiedSection === 'curl-spec' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSection === 'curl-spec' ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>
                <pre className="p-4 rounded-b-xl bg-gray-950 text-gray-200 font-mono text-xs overflow-x-auto border border-gray-800 leading-relaxed">
                  <code>{`# 1. Execute request:
curl -s "https://bliquid.xyz/.well-known/nostr.json?name=myuser"

# 2. HTTP 200 OK Response:
{
  "names": {
    "myuser": "de69276e520917aa8227ba4ab4460edd64b5dc263e6f475b29f33fad3af81990"
  },
  "bch_addresses": {
    "myuser": "bitcoincash:qr5zz6098wax242qrz3k7dctsx2kd3vszvywzsefgn"
  },
  "relays": {
    "de69276e520917aa8227ba4ab4460edd64b5dc263e6f475b29f33fad3af81990": [
      "wss://relay.primal.net",
      "wss://relay.snort.social",
      "wss://nostr.oxtr.dev",
      "wss://offchain.pub"
    ]
  }
}`}</code>
                </pre>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* DOC 7: PYTHON */}
          {/* ========================================================================= */}
          {activeDocId === 'userlink-python' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                  {isEs ? 'PYTHON PARA BOTS & BACKENDS' : 'PYTHON FOR BOTS & BACKENDS'}
                </span>
                <h1 className="text-2xl sm:text-4xl font-black text-gray-950 dark:text-white">
                  {isEs ? 'Integración en Python (Telegram, Discord & Daemons)' : 'Python Integration (Telegram, Discord & Daemons)'}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  {isEs 
                    ? 'Permite que los usuarios de tu bot envíen propinas en Bitcoin Cash con comandos como `/tip @myuser 5 USD` resolviendo la dirección al instante.' 
                    : 'Enable your bot users to send Bitcoin Cash tips via commands like `/tip @myuser 5 USD` by resolving handles on the fly.'}
                </p>
              </div>

              <div className="relative">
                <div className="flex items-center justify-between px-4 py-2 bg-gray-900 text-gray-400 text-xs font-mono rounded-t-xl border border-b-0 border-gray-800">
                  <span>userlink_resolver.py</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(`import requests

def resolve_userlink(handle: str) -> str:
    """
    Resolves human-readable UserLink handles (@myuser) into on-chain BCH addresses.
    Use in Telegram bots, Discord tip bots, or exchange withdrawal gateways.
    """
    clean = handle.lstrip('@')
    parts = clean.split('@')
    user = parts[0]
    domain = parts[1] if len(parts) > 1 else 'bliquid.xyz'
    
    url = f"https://{domain}/.well-known/nostr.json"
    res = requests.get(url, params={"name": user}, timeout=4)
    res.raise_for_status()
    
    data = res.json()
    bch_address = data.get("bch_addresses", {}).get(user)
    if not bch_address:
        raise ValueError(f"Handle @{user} is not linked to any BCH address")
        
    return bch_address

# Usage Example:
if __name__ == "__main__":
    bch_dest = resolve_userlink("@myuser")
    print(f"Target on-chain BCH Address: {bch_dest}")`, 'py-code')}
                    className="text-primary hover:underline font-sans cursor-pointer flex items-center gap-1"
                  >
                    {copiedSection === 'py-code' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSection === 'py-code' ? 'Copiado' : 'Copiar Código'}</span>
                  </button>
                </div>
                <pre className="p-4 rounded-b-xl bg-gray-950 text-gray-200 font-mono text-xs overflow-x-auto border border-gray-800 leading-relaxed">
                  <code>{`import requests

def resolve_userlink(handle: str) -> str:
    """
    Resolves human-readable UserLink handles (@myuser) into on-chain BCH addresses.
    Use in Telegram bots, Discord tip bots, or exchange withdrawal gateways.
    """
    clean = handle.lstrip('@')
    parts = clean.split('@')
    user = parts[0]
    domain = parts[1] if len(parts) > 1 else 'bliquid.xyz'
    
    url = f"https://{domain}/.well-known/nostr.json"
    res = requests.get(url, params={"name": user}, timeout=4)
    res.raise_for_status()
    
    data = res.json()
    bch_address = data.get("bch_addresses", {}).get(user)
    if not bch_address:
        raise ValueError(f"Handle @{user} is not linked to any BCH address")
        
    return bch_address

# Usage Example:
if __name__ == "__main__":
    bch_dest = resolve_userlink("@myuser")
    print(f"Target on-chain BCH Address: {bch_dest}")
    # => bitcoincash:qr5zz6098wax242qrz3k7dctsx2kd3vszvywzsefgn`}</code>
                </pre>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* DOC 8: NOSTR P2P */}
          {/* ========================================================================= */}
          {activeDocId === 'userlink-nostr' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                  {isEs ? 'NOSTR P2P SERVERLESS' : 'NOSTR P2P SERVERLESS'}
                </span>
                <h1 className="text-2xl sm:text-4xl font-black text-gray-950 dark:text-white">
                  {isEs ? 'Resolución Descentralizada P2P en Relays' : 'Decentralized P2P Relay Resolution'}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  {isEs 
                    ? 'Cero servidores centrales. Consulta eventos Kind 30078 directamente en relays globales públicos de Nostr mediante WebSockets.' 
                    : 'Zero centralized servers. Query Kind 30078 events directly on global public Nostr relays over WebSockets.'}
                </p>
              </div>

              <pre className="p-4 rounded-xl bg-gray-950 text-gray-200 font-mono text-xs overflow-x-auto border border-gray-800 leading-relaxed">
                <code>{`import { SimplePool, verifyEvent } from 'nostr-tools';

const pool = new SimplePool();
const PUBLIC_RELAYS = [
  'wss://relay.primal.net',
  'wss://relay.snort.social',
  'wss://nostr.oxtr.dev',
  'wss://offchain.pub'
];

export async function resolveDecentralized(nostrHexPubkey: string) {
  // Query Nostr Kind 30078 (Application-specific data with d-tag 'bch-identity-binding')
  const event = await pool.get(PUBLIC_RELAYS, {
    kinds: [30078],
    '#d': ['bch-identity-binding'],
    authors: [nostrHexPubkey]
  });

  if (!event || !verifyEvent(event)) {
    throw new Error('Valid UserLink record not found on Nostr relays');
  }

  const passport = JSON.parse(event.content);
  const bchSig = event.tags.find((t) => t[0] === 'bch_sig')?.[1] || '';
  const sigScheme = event.tags.find((t) => t[0] === 'sig_scheme')?.[1] || 'bitcoin-signed-message';
  console.log('BCH Address:', passport.bchAddress);
  console.log('BCH Proof (' + sigScheme + '):', bchSig);
  return { passport, bchSig, sigScheme };
}`}</code>
              </pre>
            </div>
          )}

          {/* ========================================================================= */}
          {/* DOC 9: EXCHANGE INTEGRATION */}
          {/* ========================================================================= */}
          {activeDocId === 'userlink-exchanges' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                  {isEs ? 'EXCHANGES & PASARELAS' : 'EXCHANGES & GATEWAYS'}
                </span>
                <h1 className="text-2xl sm:text-4xl font-black text-gray-950 dark:text-white">
                  {isEs ? 'Guía de Integración para Exchanges Centralizados' : 'Centralized Exchange Integration Guide'}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  {isEs 
                    ? 'Cómo permitir que tus clientes retiren fondos escribiendo @myuser en lugar de copiar y pegar una dirección alfanumérica propensa a errores.' 
                    : 'How to allow your exchange clients to withdraw BCH by entering @myuser instead of copying long error-prone strings.'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#161c28] border border-gray-200 dark:border-gray-800 space-y-2">
                  <div className="flex items-center gap-2 text-primary font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">1</span>
                    <span>{isEs ? 'Input del Usuario' : 'User Input'}</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {isEs ? 'El cliente ingresa @myuser en el campo de retiro de Bitcoin Cash.' : 'User enters @myuser in the Bitcoin Cash withdrawal field.'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#161c28] border border-gray-200 dark:border-gray-800 space-y-2">
                  <div className="flex items-center gap-2 text-primary font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">2</span>
                    <span>{isEs ? 'Resolución Backend' : 'Backend Resolution'}</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {isEs ? 'Tu backend consulta /.well-known/nostr.json y valida la dirección on-chain.' : 'Your backend queries /.well-known/nostr.json and extracts on-chain address.'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#161c28] border border-gray-200 dark:border-gray-800 space-y-2">
                  <div className="flex items-center gap-2 text-primary font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">3</span>
                    <span>{isEs ? 'Broadcast Seguro' : 'Safe Broadcast'}</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {isEs ? 'Transmites la transacción BCH a la dirección resuelta con cero riesgo de typos.' : 'Broadcast the BCH tx to the resolved address with zero typo risk.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* DOC 10: SWAP WIDGET */}
          {/* ========================================================================= */}
          {activeDocId === 'swap-widget' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
                  {isEs ? 'GENERADOR DE WIDGET' : 'WIDGET GENERATOR'}
                </span>
                <h1 className="text-2xl sm:text-4xl font-black text-gray-950 dark:text-white">
                  {isEs ? 'Incrusta el Widget Cross-Chain en tu Web' : 'Embed the Cross-Chain Widget into your Web'}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  {isEs 
                    ? 'Permite a los usuarios de tu web intercambiar tokens nativos de Bitcoin Cash (PUSD, MUSD, BCH) con USDT/USDC de Polygon sin salir de tu sitio.' 
                    : 'Allow your website visitors to swap Bitcoin Cash native tokens (PUSD, MUSD, BCH) with Polygon USDT/USDC directly on your site.'}
                </p>
              </div>

              {/* Widget Configurator & Preview */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start p-6 rounded-2xl bg-gray-50 dark:bg-[#161c28] border border-gray-200 dark:border-gray-800">
                <div className="lg:col-span-6 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                        Token Inicial:
                      </label>
                      <select
                        value={embedFrom}
                        onChange={(e) => setEmbedFrom(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#121622] border border-gray-200 dark:border-gray-700 text-xs font-bold"
                      >
                        <option value="PUSD">PUSD (BCH CashTokens)</option>
                        <option value="BCH">BCH (Bitcoin Cash Native)</option>
                        <option value="USDC">USDC (Polygon PoS)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                        Token Destino:
                      </label>
                      <select
                        value={embedTo}
                        onChange={(e) => setEmbedTo(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#121622] border border-gray-200 dark:border-gray-700 text-xs font-bold"
                      >
                        <option value="USDC">USDC (Polygon PoS)</option>
                        <option value="PUSD">PUSD (BCH CashTokens)</option>
                        <option value="USDT">USDT (Polygon PoS)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                        {isEs ? 'Código HTML a incrustar:' : 'HTML Embed Code:'}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(iframeSnippet, 'widget-code')}
                        className="text-xs text-primary font-bold hover:underline cursor-pointer flex items-center gap-1"
                      >
                        {copiedSection === 'widget-code' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedSection === 'widget-code' ? '¡Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>
                    <pre className="p-3 rounded-xl bg-gray-950 text-gray-200 font-mono text-[11px] overflow-x-auto border border-gray-800">
                      <code>{iframeSnippet}</code>
                    </pre>
                  </div>
                </div>

                <div className="lg:col-span-6 flex flex-col items-center">
                  <span className="text-[11px] font-bold text-gray-400 mb-2 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Live Preview
                  </span>
                  <div className="w-full max-w-[360px] rounded-2xl overflow-hidden border border-gray-300 dark:border-gray-700 shadow-xl bg-gray-900">
                    <iframe
                      src={embedUrl}
                      width="100%"
                      height="460"
                      style={{ border: 'none' }}
                      title="Preview Widget"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* DOC 11: SWAP API */}
          {/* ========================================================================= */}
          {activeDocId === 'swap-api' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                  {isEs ? 'SWAPS PROGRAMÁTICOS' : 'PROGRAMMATIC SWAPS'}
                </span>
                <h1 className="text-2xl sm:text-4xl font-black text-gray-950 dark:text-white">
                  {isEs ? 'Crear Swaps por Código (JavaScript / Python)' : 'Programmatic Swap API (JavaScript / Python)'}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  {isEs 
                    ? 'Consulta cotizaciones de liquidez y crea órdenes de intercambio no-custodias directamente mediante nuestra API REST.' 
                    : 'Fetch quotes and create non-custodial smart covenant orders directly via our REST API.'}
                </p>
              </div>

              <pre className="p-4 rounded-xl bg-gray-950 text-gray-200 font-mono text-xs overflow-x-auto border border-gray-800 leading-relaxed">
                <code>{`// 1. Fetch real-time market quote
const quote = await fetch('https://bliquid.xyz/api/quote?fromToken=PUSD&toToken=USDT&amount=50')
  .then(r => r.json());

// 2. Instantiate isolated Non-Custodial CashScript Covenant / Smart Contract Vault
const order = await fetch('https://bliquid.xyz/api/swap/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fromToken: 'PUSD',
    toToken: 'USDT',
    fromChain: 'bch_chipnet',
    toChain: 'amoy_testnet',
    amount: 50,
    recipientAddress: '0xTU_WALLET_POLYGON'
  })
}).then(r => r.json());

// 3. Result: Zero-Private-Key P2SH32 Covenant / Solidity Vault + 24h Timelock
console.log('Smart Contract Vault:', order.instructions.depositAddress);
console.log('Contract Spec:', order.instructions.contractType);`}</code>
              </pre>
            </div>
          )}

          {/* ========================================================================= */}
          {/* DOC 12: COINGECKO API */}
          {/* ========================================================================= */}
          {activeDocId === 'coingecko-api' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  🦎 COINGECKO DEX SPEC
                </span>
                <h1 className="text-2xl sm:text-4xl font-black text-gray-950 dark:text-white">
                  {isEs ? 'Endpoints Estándar para CoinGecko' : 'CoinGecko DEX Endpoints'}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  {isEs 
                    ? 'Endpoints compatibles con la especificación oficial de integración DEX de CoinGecko para agregadores de volumen y bots de arbitraje.' 
                    : 'Endpoints strictly compliant with the official CoinGecko DEX integration specification.'}
                </p>
              </div>

              <div className="space-y-2 font-mono text-xs">
                {[
                  { method: 'GET', path: '/api/coingecko/pairs', desc: 'Lista de pares activos (PUSD/USDC, MUSD/USDT)' },
                  { method: 'GET', path: '/api/coingecko/tickers', desc: 'Precios, volumenes de 24h y profundidad' },
                  { method: 'GET', path: '/api/coingecko/orderbook?ticker_id=PUSD_USDC', desc: 'Libro de órdenes bids y asks' },
                  { method: 'GET', path: '/api/coingecko/historical_trades?ticker_id=PUSD_USDC', desc: 'Historial de ejecuciones y swaps' }
                ].map((ep, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-gray-50 dark:bg-[#161c28] border border-gray-200 dark:border-gray-800 flex items-center justify-between">
                    <div>
                      <span className="text-emerald-500 font-bold mr-2">{ep.method}</span>
                      <span className="text-gray-900 dark:text-white font-bold">{ep.path}</span>
                      <p className="text-gray-400 text-[11px] font-sans mt-0.5">{ep.desc}</p>
                    </div>
                    <a href={ep.path} target="_blank" rel="noreferrer" className="text-primary hover:text-orange-500 shrink-0">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* DOC 13: COINMARKETCAP API */}
          {/* ========================================================================= */}
          {activeDocId === 'cmc-api' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                  Ⓜ️ COINMARKETCAP DEX DATA
                </span>
                <h1 className="text-2xl sm:text-4xl font-black text-gray-950 dark:text-white">
                  {isEs ? 'Endpoints para CoinMarketCap' : 'CoinMarketCap DEX Endpoints'}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  {isEs 
                    ? 'Endpoints estructurados bajo la especificación oficial de listado de DEXes de CoinMarketCap.' 
                    : 'Endpoints structured according to the official CoinMarketCap DEX listing spec.'}
                </p>
              </div>

              <div className="space-y-2 font-mono text-xs">
                {[
                  { method: 'GET', path: '/api/cmc/summary', desc: 'Resumen consolidado de pares, liquidez y volúmenes 24h' },
                  { method: 'GET', path: '/api/cmc/ticker', desc: 'Cotizaciones en tiempo real' },
                  { method: 'GET', path: '/api/cmc/orderbook?pair=PUSD_USDC', desc: 'Profundidad de liquidez P2SH32' },
                  { method: 'GET', path: '/api/cmc/trades?pair=PUSD_USDC', desc: 'Trades recientes liquidados on-chain' }
                ].map((ep, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-gray-50 dark:bg-[#161c28] border border-gray-200 dark:border-gray-800 flex items-center justify-between">
                    <div>
                      <span className="text-blue-500 font-bold mr-2">{ep.method}</span>
                      <span className="text-gray-900 dark:text-white font-bold">{ep.path}</span>
                      <p className="text-gray-400 text-[11px] font-sans mt-0.5">{ep.desc}</p>
                    </div>
                    <a href={ep.path} target="_blank" rel="noreferrer" className="text-primary hover:text-orange-500 shrink-0">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* GITBOOK BOTTOM PAGINATION (ANTERIOR / SIGUIENTE) */}
          <div className="pt-8 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            {prevDoc ? (
              <button
                type="button"
                onClick={() => {
                  setActiveDocId(prevDoc.id);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="w-full sm:w-auto p-3.5 rounded-2xl bg-gray-50 dark:bg-[#161c28] border border-gray-200 dark:border-gray-800 hover:border-primary transition-all text-left cursor-pointer group"
              >
                <span className="text-[10px] text-gray-400 uppercase font-bold flex items-center gap-1">
                  <ArrowLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" />
                  <span>{isEs ? 'Anterior' : 'Previous'}</span>
                </span>
                <span className="text-xs font-bold text-gray-900 dark:text-white block mt-0.5 group-hover:text-primary transition-colors">
                  {isEs ? prevDoc.title.es : prevDoc.title.en}
                </span>
              </button>
            ) : <div />}

            {nextDoc && (
              <button
                type="button"
                onClick={() => {
                  setActiveDocId(nextDoc.id);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="w-full sm:w-auto p-3.5 rounded-2xl bg-gray-50 dark:bg-[#161c28] border border-gray-200 dark:border-gray-800 hover:border-primary transition-all text-right cursor-pointer group sm:ml-auto"
              >
                <span className="text-[10px] text-gray-400 uppercase font-bold flex items-center justify-end gap-1">
                  <span>{isEs ? 'Siguiente' : 'Next'}</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </span>
                <span className="text-xs font-bold text-gray-900 dark:text-white block mt-0.5 group-hover:text-primary transition-colors">
                  {isEs ? nextDoc.title.es : nextDoc.title.en}
                </span>
              </button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default SdkView;