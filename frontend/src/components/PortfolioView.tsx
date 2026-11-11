import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Layers,
  PieChart,
  Activity,
  DollarSign,
  Percent,
  Lock,
  Coins,
  Sparkles,
  AlertCircle,
  ChevronRight,
  Share2,
  Filter,
  Repeat,
  Zap,
  PiggyBank,
  ArrowUpDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PortfolioToken {
  symbol: string;
  name: string;
  chain: string;
  chainType: 'BCH' | 'EVM';
  balance: number;
  priceUsd: number;
  valueUsd: number;
  change24h?: number;
  icon: string;
  isCashToken?: boolean;
  isNative?: boolean;
}

interface PortfolioActivityItem {
  id: string;
  type: 'SWAP' | 'LEND' | 'PERP';
  title: string;
  status: string;
  timestamp: string;
  txHash?: string;
  explorerUrl?: string;
  amountUsd?: number;
  pnlUsd?: number;
}

interface PortfolioData {
  netWorthUsd: number;
  breakdown: {
    walletTokensUsd: number;
    lpTotalValueUsd: number;
    lendingCollateralUsd: number;
    lendingSuppliedUsd: number;
    lendingDebtUsd: number;
    perpsMarginLockedUsd: number;
    perpsUnrealizedPnlUsd: number;
  };
  performance: {
    unrealizedPnlUsd: number;
    realizedPnlUsd: number;
    totalYieldEarnedUsd: number;
    totalReturnUsd: number;
  };
  tokens: PortfolioToken[];
  pools: any[];
  lending: any;
  perps: any;
  activity: PortfolioActivityItem[];
  chart: Record<string, Array<{ time: string; value: number }>>;
}

interface PortfolioViewProps {
  backendUrl?: string;
  userAddress: string;
  bchAddress?: string;
  evmAddress?: string;
  walletBalances: Record<string, number>;
  platformNetwork: 'mainnet' | 'testnet';
  onToggleNetwork?: (network: 'mainnet' | 'testnet') => void;
  onRefreshBalances?: () => void;
  onConnectWallet?: () => void;
  onNavigate?: (view: 'bridge' | 'perps' | 'pools' | 'lend') => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  lang: 'en' | 'es';
}

const tMap = {
  en: {
    portfolio: "Portfolio",
    overview: "Overview",
    tokens: "Tokens",
    pools: "Pools",
    defi: "Lend & Perps",
    activity: "Activity",
    netWorth: "Total Net Worth",
    today: "today",
    quickActions: "Quick Actions",
    swap: "Bridge Swap",
    deposit: "Receive / Deposit",
    earn: "Earn / Pools",
    lend: "Lend Vaults",
    performance: "Performance",
    unrealizedReturn: "Unrealized Return",
    realizedReturn: "Realized Return",
    totalReturn: "Total Return",
    earnOpportunities: "Earn & Yield",
    historicalEarned: "Historical Yield Earned",
    obtain: "Supply",
    token: "Token",
    price: "Price",
    balance: "Balance",
    value: "Value",
    action: "Action",
    allChains: "All Networks",
    bchOnly: "Bitcoin Cash",
    evmOnly: "Polygon Amoy",
    noTokens: "No tokens found in connected wallet.",
    noPools: "No active Liquidity Pool positions.",
    explorePools: "Explore Pools",
    openPositions: "Active Perpetual Positions",
    noPerps: "No open perpetual contracts.",
    tradePerps: "Trade Perps",
    lendingVault: "CashScript Collateral Vault",
    collateralLocked: "Collateral Deposited",
    borrowedDebt: "Borrowed Debt",
    healthFactor: "Health Factor",
    safe: "Safe",
    moderate: "Moderate",
    risk: "At Risk",
    noActivity: "No recent on-chain activity recorded.",
    copyAddress: "Copy Address",
    copied: "Copied!",
    share: "Share Portfolio",
    connectPrompt: "Connect your Bitcoin Cash or EVM wallet to view real live on-chain portfolio balances, yields, and vault covenants.",
    connectBtn: "Connect Wallet",
    refreshing: "Refreshing on-chain metrics...",
    updatedJustNow: "Updated just now",
    liveOnChain: "100% Non-Custodial On-Chain",
    apy: "APY"
  },
  es: {
    portfolio: "Portafolio",
    overview: "Resumen",
    tokens: "Tokens",
    pools: "Pools",
    defi: "Lend & Perps",
    activity: "Actividad",
    netWorth: "Patrimonio Total",
    today: "hoy",
    quickActions: "Acciones Rápidas",
    swap: "Bridge Swap",
    deposit: "Recibir / Depositar",
    earn: "Earn / Pools",
    lend: "Bóvedas Lend",
    performance: "Rendimiento",
    unrealizedReturn: "Retorno no realizado",
    realizedReturn: "Retorno realizado",
    totalReturn: "Retorno total",
    earnOpportunities: "Earn & Rendimientos",
    historicalEarned: "Ganancias acumuladas",
    obtain: "Suministrar",
    token: "Token",
    price: "Precio",
    balance: "Saldo",
    value: "Valor",
    action: "Acción",
    allChains: "Todas las redes",
    bchOnly: "Bitcoin Cash",
    evmOnly: "Polygon Amoy",
    noTokens: "No se detectaron tokens en la billetera conectada.",
    noPools: "No tienes posiciones activas en Pools de Liquidez.",
    explorePools: "Explorar Pools",
    openPositions: "Posiciones Perpetuas Activas",
    noPerps: "Sin contratos perpetuos abiertos.",
    tradePerps: "Operar Futuros",
    lendingVault: "Bóveda Covenant CashScript",
    collateralLocked: "Colateral Depositado",
    borrowedDebt: "Deuda Prestada",
    healthFactor: "Factor de Salud",
    safe: "Seguro",
    moderate: "Moderado",
    risk: "En Riesgo",
    noActivity: "No hay actividad reciente registrada en cadena.",
    copyAddress: "Copiar Dirección",
    copied: "¡Copiado!",
    share: "Compartir Portafolio",
    connectPrompt: "Conecta tu billetera Bitcoin Cash o EVM para ver balances reales en cadena, rendimientos, covenants y posiciones activas.",
    connectBtn: "Conectar Billetera",
    refreshing: "Actualizando datos on-chain...",
    updatedJustNow: "Actualizado ahora mismo",
    liveOnChain: "100% No-Custodial On-Chain",
    apy: "APY"
  }
};

export default function PortfolioView({
  backendUrl = '',
  userAddress,
  bchAddress,
  evmAddress,
  walletBalances,
  platformNetwork,
  onToggleNetwork,
  onRefreshBalances,
  onConnectWallet,
  onNavigate,
  showToast,
  lang = 'es'
}: PortfolioViewProps) {
  const t = tMap[lang] || tMap.es;

  const [activeTab, setActiveTab] = useState<'overview' | 'tokens' | 'pools' | 'defi' | 'activity'>('overview');
  const [timeframe, setTimeframe] = useState<'1h' | '1d' | '1w' | '1m' | '1y' | 'all'>('1d');
  const [networkFilter, setNetworkFilter] = useState<'all' | 'bch' | 'evm'>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [hoveredPoint, setHoveredPoint] = useState<{ time: string; value: number } | null>(null);
  const [receiveModalOpen, setReceiveModalOpen] = useState<boolean>(false);

  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);

  const isConnected = Boolean(userAddress || bchAddress || evmAddress);
  const primaryDisplayAddress = bchAddress || evmAddress || userAddress;

  const fetchPortfolio = async (isManual = false) => {
    if (!isConnected || !primaryDisplayAddress) {
      setPortfolio({
        netWorthUsd: 0,
        breakdown: {
          walletTokensUsd: 0,
          lpTotalValueUsd: 0,
          lendingCollateralUsd: 0,
          lendingSuppliedUsd: 0,
          lendingDebtUsd: 0,
          perpsMarginLockedUsd: 0,
          perpsUnrealizedPnlUsd: 0
        },
        performance: {
          unrealizedPnlUsd: 0,
          realizedPnlUsd: 0,
          totalYieldEarnedUsd: 0,
          totalReturnUsd: 0
        },
        tokens: [
          { symbol: 'PUSD', name: 'Paryon USD', chain: platformNetwork === 'testnet' ? 'BCH Chipnet' : 'Bitcoin Cash', chainType: 'BCH', balance: 0, priceUsd: 1.0, valueUsd: 0, change24h: 0, icon: '/PUSD.png', isCashToken: true },
          { symbol: 'BCH', name: 'Bitcoin Cash', chain: platformNetwork === 'testnet' ? 'BCH Chipnet' : 'Bitcoin Cash', chainType: 'BCH', balance: 0, priceUsd: 230.5, valueUsd: 0, change24h: 1.85, icon: '/BCH.png', isNative: true },
          { symbol: 'USDT', name: 'Tether USD', chain: platformNetwork === 'testnet' ? 'Polygon Amoy' : 'Polygon PoS', chainType: 'EVM', balance: 0, priceUsd: 1.0, valueUsd: 0, change24h: 0.01, icon: '/USDT.png' },
          { symbol: 'USDC', name: 'USD Coin', chain: platformNetwork === 'testnet' ? 'Polygon Amoy' : 'Polygon PoS', chainType: 'EVM', balance: 0, priceUsd: 1.0, valueUsd: 0, change24h: 0, icon: '/USDC.png' },
          { symbol: 'POL', name: 'Polygon Ecosystem Token', chain: platformNetwork === 'testnet' ? 'Polygon Amoy' : 'Polygon PoS', chainType: 'EVM', balance: 0, priceUsd: 0.09, valueUsd: 0, change24h: -0.45, icon: '/POL.png', isNative: true }
        ],
        pools: [],
        lending: null,
        perps: { positions: [], history: [] },
        activity: [],
        chart: {
          '1h': [{ time: '00:00', value: 0 }, { time: '12:00', value: 0 }],
          '1d': [{ time: '00:00', value: 0 }, { time: '12:00', value: 0 }],
          '1w': [{ time: 'Mon', value: 0 }, { time: 'Sun', value: 0 }],
          '1m': [{ time: 'W1', value: 0 }, { time: 'W4', value: 0 }],
          '1y': [{ time: 'Jan', value: 0 }, { time: 'Dec', value: 0 }],
          'all': [{ time: 'Start', value: 0 }, { time: 'Now', value: 0 }]
        }
      });
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const q = new URLSearchParams({
        network: platformNetwork,
        ...(bchAddress ? { bchAddress } : {}),
        ...(evmAddress ? { evmAddress } : {})
      });
      const res = await fetch(`${backendUrl}/api/portfolio/${encodeURIComponent(primaryDisplayAddress)}?${q.toString()}`);
      const data = await res.json();
      if (data.success) {
        setPortfolio(data);
      }
    } catch (err) {
      console.error('[Portfolio] Fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
    const interval = setInterval(() => {
      fetchPortfolio(true);
    }, 25000);
    return () => clearInterval(interval);
  }, [userAddress, bchAddress, evmAddress, platformNetwork]);

  const handleCopy = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast(t.copied, 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  // Filter tokens based on network selection
  const filteredTokens = useMemo(() => {
    if (!portfolio?.tokens) return [];
    if (networkFilter === 'bch') return portfolio.tokens.filter(tk => tk.chainType === 'BCH');
    if (networkFilter === 'evm') return portfolio.tokens.filter(tk => tk.chainType === 'EVM');
    return portfolio.tokens;
  }, [portfolio?.tokens, networkFilter]);

  // Chart data calculation
  const chartPoints = useMemo(() => {
    const list = portfolio?.chart?.[timeframe] || [];
    if (list.length === 0) {
      const base = portfolio?.netWorthUsd || 0;
      return [
        { time: '00:00', value: base },
        { time: '12:00', value: base },
        { time: '23:59', value: base }
      ];
    }
    return list;
  }, [portfolio?.chart, timeframe, portfolio?.netWorthUsd]);

  // Generate smooth SVG curve
  const chartSvgData = useMemo(() => {
    if (chartPoints.length < 2) return { pathD: '', areaD: '', minVal: 0, maxVal: 0 };
    const values = chartPoints.map(p => p.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal === 0 ? 1 : maxVal - minVal;

    const width = 600;
    const height = 180;
    const paddingY = 20;

    const coords = chartPoints.map((p, idx) => {
      const x = (idx / (chartPoints.length - 1)) * width;
      const normalized = (p.value - minVal) / range;
      const y = height - paddingY - normalized * (height - paddingY * 2);
      return { x, y };
    });

    let pathD = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i === 0 ? 0 : i - 1];
      const p1 = coords[i];
      const p2 = coords[i + 1];
      const p3 = coords[i + 2 < coords.length ? i + 2 : i + 1];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }

    const areaD = `${pathD} L ${width} ${height} L 0 ${height} Z`;

    return { pathD, areaD, minVal, maxVal };
  }, [chartPoints]);

  const currentNetWorth = hoveredPoint ? hoveredPoint.value : (portfolio?.netWorthUsd ?? 0);
  const changeUsd = (portfolio?.performance?.totalReturnUsd ?? 0.12);
  const changePercent = currentNetWorth > 0 ? (changeUsd / currentNetWorth) * 100 : 0.15;
  const isPositive = changeUsd >= 0;

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-6 animate-in fade-in duration-300">
      
      {/* 1. TOP HEADER & IDENTITY BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-line">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm sm:text-base font-bold text-ink">
                {primaryDisplayAddress ? (
                  `${primaryDisplayAddress.slice(0, 10)}...${primaryDisplayAddress.slice(-6)}`
                ) : (
                  lang === 'es' ? 'Billetera No Conectada' : 'Wallet Not Connected'
                )}
              </span>
              {primaryDisplayAddress && (
                <button
                  onClick={() => handleCopy(primaryDisplayAddress)}
                  className="p-1 rounded-md text-ink-3 hover:text-ink hover:bg-surface-2 transition-colors cursor-pointer"
                  title={t.copyAddress}
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-ink-3 mt-0.5">
              <span className="inline-flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${platformNetwork === 'mainnet' ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse'}`} />
                {platformNetwork === 'mainnet' ? 'BCH Mainnet + Polygon' : 'BCH Chipnet + Amoy'}
              </span>
              <span>•</span>
              <span>{t.liveOnChain}</span>
            </div>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2">
          {/* Network Filter Pill */}
          <div className="inline-flex items-center p-0.5 rounded-full bg-surface-2 border border-line text-xs">
            <button
              onClick={() => setNetworkFilter('all')}
              className={`px-2.5 py-1 rounded-full transition-all cursor-pointer font-medium ${
                networkFilter === 'all' ? 'bg-surface text-ink shadow-2xs font-bold' : 'text-ink-3 hover:text-ink'
              }`}
            >
              {t.allChains}
            </button>
            <button
              onClick={() => setNetworkFilter('bch')}
              className={`px-2.5 py-1 rounded-full transition-all cursor-pointer font-medium ${
                networkFilter === 'bch' ? 'bg-surface text-ink shadow-2xs font-bold' : 'text-ink-3 hover:text-ink'
              }`}
            >
              BCH
            </button>
            <button
              onClick={() => setNetworkFilter('evm')}
              className={`px-2.5 py-1 rounded-full transition-all cursor-pointer font-medium ${
                networkFilter === 'evm' ? 'bg-surface text-ink shadow-2xs font-bold' : 'text-ink-3 hover:text-ink'
              }`}
            >
              Polygon
            </button>
          </div>

          {/* Refresh on-chain data button */}
          <button
            onClick={() => {
              fetchPortfolio(true);
              if (onRefreshBalances) onRefreshBalances();
            }}
            disabled={refreshing}
            className="p-2 rounded-full border border-line bg-surface hover:bg-surface-2 text-ink-2 hover:text-ink transition-all shadow-2xs cursor-pointer disabled:opacity-50"
            title={t.refreshing}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-primary' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. SUB-NAVIGATION TABS */}
      <div className="flex items-center gap-1 sm:gap-2 border-b border-line overflow-x-auto pb-1 text-sm font-semibold [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {[
          { id: 'overview', label: t.overview, icon: PieChart },
          { id: 'tokens', label: t.tokens, icon: Coins },
          { id: 'pools', label: t.pools, icon: Layers },
          { id: 'defi', label: t.defi, icon: ShieldCheck },
          { id: 'activity', label: t.activity, icon: Activity }
        ].map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                active
                  ? 'border-primary text-ink font-bold'
                  : 'border-transparent text-ink-3 hover:text-ink font-medium'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* DISCONNECTED CALLOUT (Sleek floating banner instead of blocking the whole UI) */}
      {!isConnected && (
        <div className="bg-surface border border-line rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-soft">
          <div className="flex items-center gap-3 text-left">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-ink">
                {lang === 'es' ? 'Modo Exploración: Conecta tu Billetera' : 'Preview Mode: Connect Your Wallet'}
              </div>
              <p className="text-xs text-ink-3 mt-0.5">
                {t.connectPrompt}
              </p>
            </div>
          </div>
          {onConnectWallet && (
            <button
              onClick={onConnectWallet}
              className="ui-btn ui-btn-primary ui-btn-sm font-bold shadow-xs whitespace-nowrap shrink-0"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>{t.connectBtn}</span>
            </button>
          )}
        </div>
      )}

      {/* TAB CONTENT (Always rendered, populated with real on-chain data when connected!) */}
      {(
        <>
          {/* TAB 1: OVERVIEW (Resumen) */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              
              {/* TOP HERO: NET WORTH + INTERACTIVE CHART + QUICK ACTIONS */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Left (8 cols): Total Net Worth & Chart */}
                <div className="lg:col-span-8 bg-surface border border-line rounded-3xl p-5 sm:p-7 shadow-soft space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-ink-3">
                        {t.netWorth}
                      </div>
                      <div className="text-3xl sm:text-4xl font-black text-ink tracking-tight mt-1 tabular-nums">
                        USD ${currentNetWorth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 text-xs font-medium">
                        <span className={`inline-flex items-center gap-0.5 font-bold ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                          <span>{isPositive ? '+' : ''}${Math.abs(changeUsd).toFixed(2)} ({isPositive ? '+' : ''}{changePercent.toFixed(2)}%)</span>
                        </span>
                        <span className="text-ink-3">{hoveredPoint ? hoveredPoint.time : t.today}</span>
                      </div>
                    </div>

                    {/* Timeframe selector pill */}
                    <div className="inline-flex items-center p-1 rounded-full bg-surface-2 border border-line text-xs">
                      {(['1h', '1d', '1w', '1m', '1y', 'all'] as const).map(tf => (
                        <button
                          key={tf}
                          onClick={() => {
                            setTimeframe(tf);
                            setHoveredPoint(null);
                          }}
                          className={`px-2.5 py-1 rounded-full transition-all cursor-pointer font-semibold ${
                            timeframe === tf
                              ? 'bg-surface text-ink shadow-2xs font-bold'
                              : 'text-ink-3 hover:text-ink'
                          }`}
                        >
                          {tf === '1w' ? (lang === 'es' ? '1sem' : '1w') : tf === 'all' ? (lang === 'es' ? 'Todo' : 'All') : tf}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* High-Tech Interactive SVG Chart */}
                  <div
                    className="relative w-full h-44 sm:h-48 pt-2 select-none"
                    onMouseLeave={() => setHoveredPoint(null)}
                  >
                    <svg viewBox="0 0 600 180" className="w-full h-full overflow-visible">
                      <defs>
                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10B981" stopOpacity="0.28" />
                          <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Area fill */}
                      {chartSvgData.areaD && (
                        <path d={chartSvgData.areaD} fill="url(#chartGradient)" />
                      )}

                      {/* Smooth Line */}
                      {chartSvgData.pathD && (
                        <path
                          d={chartSvgData.pathD}
                          fill="none"
                          stroke="#10B981"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}
                    </svg>

                    {/* Interactive overlay points */}
                    <div className="absolute inset-0 flex items-stretch">
                      {chartPoints.map((pt, idx) => (
                        <div
                          key={idx}
                          className="flex-1 cursor-crosshair group relative"
                          onMouseEnter={() => setHoveredPoint(pt)}
                          onTouchStart={() => setHoveredPoint(pt)}
                        >
                          <div className="hidden group-hover:block absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px bg-emerald-500/40" />
                          <div className="hidden group-hover:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-gray-900 shadow-sm" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Chart timeline axis labels */}
                  <div className="flex items-center justify-between text-[11px] font-mono text-ink-3 px-1 pt-1 border-t border-line/60">
                    <span>{chartPoints[0]?.time}</span>
                    <span>{chartPoints[Math.floor(chartPoints.length / 2)]?.time}</span>
                    <span>{chartPoints[chartPoints.length - 1]?.time}</span>
                  </div>
                </div>

                {/* Right (4 cols): Quick Action Cards (Inspired by Reference Image) */}
                <div className="lg:col-span-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {/* Action 1: Swap */}
                    <button
                      onClick={() => onNavigate && onNavigate('bridge')}
                      className="p-4 rounded-2xl bg-surface border border-line hover:border-line-strong hover:bg-surface-2 transition-all text-left group shadow-2xs cursor-pointer flex flex-col justify-between h-28"
                    >
                      <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Repeat className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-ink">{t.swap}</div>
                        <div className="text-[11px] text-ink-3">3-4s Non-Custodial</div>
                      </div>
                    </button>

                    {/* Action 2: Deposit / Receive */}
                    <button
                      onClick={() => setReceiveModalOpen(true)}
                      className="p-4 rounded-2xl bg-surface border border-line hover:border-line-strong hover:bg-surface-2 transition-all text-left group shadow-2xs cursor-pointer flex flex-col justify-between h-28"
                    >
                      <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <ArrowDownLeft className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-ink">{t.deposit}</div>
                        <div className="text-[11px] text-ink-3">BCH / EVM QR</div>
                      </div>
                    </button>

                    {/* Action 3: Pools / Earn */}
                    <button
                      onClick={() => onNavigate && onNavigate('pools')}
                      className="p-4 rounded-2xl bg-surface border border-line hover:border-line-strong hover:bg-surface-2 transition-all text-left group shadow-2xs cursor-pointer flex flex-col justify-between h-28"
                    >
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <PiggyBank className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-ink">{t.earn}</div>
                        <div className="text-[11px] text-ink-3">LP Fee Accrual</div>
                      </div>
                    </button>

                    {/* Action 4: Lend */}
                    <button
                      onClick={() => onNavigate && onNavigate('lend')}
                      className="p-4 rounded-2xl bg-surface border border-line hover:border-line-strong hover:bg-surface-2 transition-all text-left group shadow-2xs cursor-pointer flex flex-col justify-between h-28"
                    >
                      <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-ink">{t.lend}</div>
                        <div className="text-[11px] text-ink-3">CashScript Vaults</div>
                      </div>
                    </button>
                  </div>

                  {/* Performance Card (Rendimiento) */}
                  <div className="bg-surface border border-line rounded-2xl p-4 shadow-soft space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-ink">
                      <span>{t.performance}</span>
                      <span className="text-[11px] text-ink-3 font-normal">{lang === 'es' ? 'Todo' : 'All time'}</span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-ink-3">{t.unrealizedReturn}</span>
                        <span className="font-semibold text-ink tabular-nums">
                          ${(portfolio?.performance?.unrealizedPnlUsd ?? 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-ink-3">{t.realizedReturn}</span>
                        <span className="font-semibold text-ink tabular-nums">
                          ${(portfolio?.performance?.realizedPnlUsd ?? 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-line flex items-center justify-between font-bold">
                        <span className="text-ink">{t.totalReturn}</span>
                        <span className={`tabular-nums ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {isPositive ? '+' : ''}${(portfolio?.performance?.totalReturnUsd ?? 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* BOTTOM SECTION: TOKENS TABLE + YIELD EARN CARD */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Left (8 cols): Tokens Table */}
                <div className="lg:col-span-8 bg-surface border border-line rounded-3xl p-5 sm:p-6 shadow-soft space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-base font-bold text-ink">{t.tokens}</h4>
                      <p className="text-xs text-ink-3 mt-0.5">
                        {filteredTokens.length} {lang === 'es' ? 'activos detectados' : 'assets detected'}
                      </p>
                    </div>
                    <div className="text-sm font-bold text-ink tabular-nums">
                      USD ${(portfolio?.breakdown?.walletTokensUsd ?? 0).toFixed(2)}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-ink-3 border-b border-line pb-2 font-medium">
                          <th className="py-2.5 font-medium">{t.token}</th>
                          <th className="py-2.5 font-medium">{t.price}</th>
                          <th className="py-2.5 font-medium">{t.balance}</th>
                          <th className="py-2.5 font-medium text-right">{t.value}</th>
                          <th className="py-2.5 font-medium text-right">{t.action}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line/60">
                        {filteredTokens.map(tk => (
                          <tr key={`${tk.chainType}_${tk.symbol}`} className="hover:bg-surface-2/60 transition-colors">
                            <td className="py-3 flex items-center gap-2.5">
                              <img src={tk.icon} alt={tk.symbol} className="w-7 h-7 rounded-full object-contain shrink-0" />
                              <div>
                                <div className="font-bold text-ink">{tk.symbol}</div>
                                <div className="text-[11px] text-ink-3">{tk.chain}</div>
                              </div>
                            </td>
                            <td className="py-3 font-mono text-ink tabular-nums">
                              ${tk.priceUsd < 1 ? tk.priceUsd.toFixed(3) : tk.priceUsd.toFixed(2)}
                            </td>
                            <td className="py-3 font-mono text-ink tabular-nums">
                              {tk.balance.toLocaleString('en-US', { maximumFractionDigits: 6 })}
                            </td>
                            <td className="py-3 font-mono font-bold text-ink text-right tabular-nums">
                              ${tk.valueUsd.toFixed(2)}
                            </td>
                            <td className="py-3 text-right">
                              <button
                                onClick={() => onNavigate && onNavigate('bridge')}
                                className="px-2.5 py-1 rounded-lg bg-surface-2 hover:bg-surface-3 text-ink font-semibold text-[11px] transition-colors cursor-pointer"
                              >
                                Swap
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Right (4 cols): Earn & Opportunities Card */}
                <div className="lg:col-span-4 bg-surface border border-line rounded-3xl p-5 sm:p-6 shadow-soft space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-base font-bold text-ink">{t.earnOpportunities}</h4>
                      <p className="text-xs text-ink-3 mt-0.5">
                        {t.historicalEarned}: <span className="font-bold text-emerald-500">${(portfolio?.performance?.totalYieldEarnedUsd ?? 0).toFixed(2)}</span>
                      </p>
                    </div>
                  </div>

                  {/* Yield options list */}
                  <div className="space-y-3 pt-1">
                    {[
                      { token: 'PUSD', name: 'Paryon USD', apy: '5.8%', icon: '/PUSD.png', route: 'lend' },
                      { token: 'USDT', name: 'Tether USD', apy: '6.2%', icon: '/USDT.png', route: 'lend' },
                      { token: 'USDC', name: 'USD Coin', apy: '5.5%', icon: '/USDC.png', route: 'lend' }
                    ].map(opp => (
                      <div
                        key={opp.token}
                        className="p-3 rounded-2xl bg-surface-2 border border-line/60 flex items-center justify-between hover:border-line transition-all"
                      >
                        <div className="flex items-center gap-2.5">
                          <img src={opp.icon} alt={opp.token} className="w-7 h-7 rounded-full object-contain" />
                          <div>
                            <div className="font-bold text-xs text-ink">{opp.token}</div>
                            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">{opp.apy} {t.apy}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => onNavigate && onNavigate(opp.route as any)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-primary-hover transition-colors cursor-pointer"
                        >
                          <span>{t.obtain}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Summary Callout */}
                  <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/20 text-xs text-ink-2 space-y-1">
                    <div className="font-bold text-ink flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-primary" />
                      <span>CashScript & Solidity Covenants</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-ink-3">
                      {lang === 'es'
                        ? 'Tus activos permanecen asegurados bajo contratos no-custodiales con timelocks de 24 horas y pruebas criptográficas ECDSA/Schnorr.'
                        : 'Your assets stay secured in non-custodial smart contracts backed by 24h timelocks and ECDSA/Schnorr proofs.'}
                    </p>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: TOKENS ONLY */}
          {activeTab === 'tokens' && (
            <div className="bg-surface border border-line rounded-3xl p-6 shadow-soft space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-ink">{t.tokens}</h3>
                  <p className="text-xs text-ink-3 mt-0.5">
                    {lang === 'es' ? 'Saldos disponibles en tus billeteras conectadas de Bitcoin Cash y Polygon' : 'Available balances in connected Bitcoin Cash & Polygon wallets'}
                  </p>
                </div>
                <div className="text-lg font-black text-ink font-mono tabular-nums">
                  USD ${(portfolio?.breakdown?.walletTokensUsd ?? 0).toFixed(2)}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-ink-3 border-b border-line pb-2 font-medium">
                      <th className="py-2.5 font-medium">{t.token}</th>
                      <th className="py-2.5 font-medium">{t.price}</th>
                      <th className="py-2.5 font-medium">{t.balance}</th>
                      <th className="py-2.5 font-medium text-right">{t.value}</th>
                      <th className="py-2.5 font-medium text-right">{t.action}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/60">
                    {filteredTokens.map(tk => (
                      <tr key={`${tk.chainType}_${tk.symbol}`} className="hover:bg-surface-2/60 transition-colors">
                        <td className="py-3.5 flex items-center gap-3">
                          <img src={tk.icon} alt={tk.symbol} className="w-8 h-8 rounded-full object-contain shrink-0" />
                          <div>
                            <div className="font-bold text-sm text-ink">{tk.symbol}</div>
                            <div className="text-xs text-ink-3">{tk.name} • <span className="font-semibold">{tk.chain}</span></div>
                          </div>
                        </td>
                        <td className="py-3.5 font-mono text-ink text-sm tabular-nums">
                          ${tk.priceUsd < 1 ? tk.priceUsd.toFixed(3) : tk.priceUsd.toFixed(2)}
                        </td>
                        <td className="py-3.5 font-mono text-ink text-sm tabular-nums">
                          {tk.balance.toLocaleString('en-US', { maximumFractionDigits: 6 })}
                        </td>
                        <td className="py-3.5 font-mono font-bold text-ink text-sm text-right tabular-nums">
                          ${tk.valueUsd.toFixed(2)}
                        </td>
                        <td className="py-3.5 text-right">
                          <button
                            onClick={() => onNavigate && onNavigate('bridge')}
                            className="ui-btn ui-btn-primary ui-btn-sm"
                          >
                            Swap
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: POOLS */}
          {activeTab === 'pools' && (
            <div className="bg-surface border border-line rounded-3xl p-6 shadow-soft space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-ink">{t.pools}</h3>
                  <p className="text-xs text-ink-3 mt-0.5">
                    {lang === 'es' ? 'Posiciones de proveedor de liquidez (LP) en BinaryLiquid AMM' : 'Liquidity provider (LP) shares in BinaryLiquid AMM'}
                  </p>
                </div>
                <div className="text-lg font-black text-ink font-mono tabular-nums">
                  USD ${(portfolio?.breakdown?.lpTotalValueUsd ?? 0).toFixed(2)}
                </div>
              </div>

              {(!portfolio?.pools || portfolio.pools.length === 0) ? (
                <div className="text-center py-12 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-surface-2 text-ink-3 mx-auto flex items-center justify-center">
                    <Layers className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-semibold text-ink">{t.noPools}</div>
                  <p className="text-xs text-ink-3 max-w-sm mx-auto">
                    {lang === 'es' ? 'Aporta liquidez a los pares PUSD / USDT o BCH para devengar 0.25% de comisión por cada swap.' : 'Deposit liquidity in PUSD / USDT or BCH pairs to earn 0.25% fee on every cross-chain swap.'}
                  </p>
                  <button
                    onClick={() => onNavigate && onNavigate('pools')}
                    className="ui-btn ui-btn-primary ui-btn-sm font-bold mt-2"
                  >
                    {t.explorePools}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {portfolio.pools.map((p: any) => (
                    <div key={p.id} className="p-4 rounded-2xl bg-surface-2 border border-line flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex -space-x-2">
                          <img src={p.iconA} alt={p.tokenA} className="w-7 h-7 rounded-full border border-surface" />
                          <img src={p.iconB} alt={p.tokenB} className="w-7 h-7 rounded-full border border-surface" />
                        </div>
                        <div>
                          <div className="font-bold text-sm text-ink">{p.pair}</div>
                          <div className="text-xs text-ink-3">{p.poolSharePercent}% {lang === 'es' ? 'del pool' : 'pool share'}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-sm text-ink font-mono tabular-nums">${p.totalValueUsd}</div>
                        <div className="text-xs text-emerald-500 font-semibold font-mono tabular-nums">+${p.profitUsd} fees</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: DEFI (LEND & PERPS) */}
          {activeTab === 'defi' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Card 1: Lending Covenant Vault */}
              <div className="bg-surface border border-line rounded-3xl p-6 shadow-soft space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-ink">{t.lendingVault}</h4>
                      <p className="text-[11px] text-ink-3">CashScript P2SH32 Covenant</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-500">
                    {portfolio?.lending?.vault?.healthStatus || 'SAFE'}
                  </span>
                </div>

                <div className="space-y-2.5 pt-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-ink-3">{t.collateralLocked}</span>
                    <span className="font-bold text-ink font-mono tabular-nums">
                      {portfolio?.lending?.vault?.collateralBch || 0} BCH (${portfolio?.lending?.vault?.collateralUsd || 0})
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-ink-3">{t.borrowedDebt}</span>
                    <span className="font-bold text-rose-500 font-mono tabular-nums">
                      ${portfolio?.lending?.vault?.totalDebtUsd || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-ink-3">{t.healthFactor}</span>
                    <span className="font-bold text-emerald-500 font-mono tabular-nums">
                      {portfolio?.lending?.vault?.healthFactor || 999.0}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => onNavigate && onNavigate('lend')}
                  className="w-full ui-btn ui-btn-secondary ui-btn-sm font-bold mt-2"
                >
                  {lang === 'es' ? 'Administrar Bóveda Lend' : 'Manage Lend Vault'}
                </button>
              </div>

              {/* Card 2: Active Perps */}
              <div className="bg-surface border border-line rounded-3xl p-6 shadow-soft space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-ink">{t.openPositions}</h4>
                      <p className="text-[11px] text-ink-3">Non-Custodial Perps</p>
                    </div>
                  </div>
                </div>

                {(!portfolio?.perps?.positions || portfolio.perps.positions.length === 0) ? (
                  <div className="text-center py-6 space-y-2">
                    <p className="text-xs text-ink-3">{t.noPerps}</p>
                    <button
                      onClick={() => onNavigate && onNavigate('perps')}
                      className="ui-btn ui-btn-primary ui-btn-sm font-bold"
                    >
                      {t.tradePerps}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {portfolio.perps.positions.map((pos: any) => (
                      <div key={pos.id} className="p-3 rounded-xl bg-surface-2 border border-line text-xs flex items-center justify-between">
                        <div>
                          <div className="font-bold text-ink">{pos.symbol} • {pos.side?.toUpperCase()} ({pos.leverage}x)</div>
                          <div className="text-[11px] text-ink-3">Margin: ${pos.marginUsd}</div>
                        </div>
                        <div className="text-right font-mono font-bold">
                          <span className={pos.unrealizedPnlUsd >= 0 ? 'text-emerald-500' : 'text-rose-500'}>
                            {pos.unrealizedPnlUsd >= 0 ? '+' : ''}${pos.unrealizedPnlUsd}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 5: ACTIVITY */}
          {activeTab === 'activity' && (
            <div className="bg-surface border border-line rounded-3xl p-6 shadow-soft space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-ink">{t.activity}</h3>
                  <p className="text-xs text-ink-3 mt-0.5">
                    {lang === 'es' ? 'Historial unificado de transacciones on-chain verificadas' : 'Unified verified on-chain transaction history'}
                  </p>
                </div>
              </div>

              {(!portfolio?.activity || portfolio.activity.length === 0) ? (
                <div className="text-center py-12 text-ink-3 text-xs">
                  {t.noActivity}
                </div>
              ) : (
                <div className="divide-y divide-line/60">
                  {portfolio.activity.map(act => (
                    <div key={act.id} className="py-3.5 flex items-center justify-between gap-3 text-xs hover:bg-surface-2/40 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          act.type === 'SWAP' ? 'bg-primary/10 text-primary' :
                          act.type === 'LEND' ? 'bg-amber-500/10 text-amber-500' : 'bg-purple-500/10 text-purple-500'
                        }`}>
                          {act.type === 'SWAP' ? <Repeat className="w-4 h-4" /> :
                           act.type === 'LEND' ? <ShieldCheck className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="font-bold text-ink">{act.title}</div>
                          <div className="text-[11px] text-ink-3">
                            {new Date(act.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {act.explorerUrl && (
                          <a
                            href={act.explorerUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink-3 hover:text-ink px-2 py-1 rounded-md bg-surface-2 hover:bg-surface-3 transition-colors"
                          >
                            <span>Explorer</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* RECEIVE / DEPOSIT MODAL */}
      <AnimatePresence>
        {receiveModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface border border-line rounded-3xl p-6 max-w-md w-full space-y-4 shadow-xl text-left"
            >
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-base text-ink">{t.deposit}</h4>
                <button
                  onClick={() => setReceiveModalOpen(false)}
                  className="p-1 rounded-full text-ink-3 hover:text-ink cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                {bchAddress && (
                  <div className="p-3.5 rounded-2xl bg-surface-2 border border-line space-y-1.5">
                    <div className="font-bold text-ink flex items-center justify-between">
                      <span>Bitcoin Cash (CashTokens PUSD)</span>
                      <button onClick={() => handleCopy(bchAddress)} className="text-primary hover:underline cursor-pointer">
                        {copied ? t.copied : t.copyAddress}
                      </button>
                    </div>
                    <div className="font-mono text-[11px] text-ink-2 break-all bg-surface p-2 rounded-lg border border-line/60">
                      {bchAddress}
                    </div>
                  </div>
                )}

                {evmAddress && (
                  <div className="p-3.5 rounded-2xl bg-surface-2 border border-line space-y-1.5">
                    <div className="font-bold text-ink flex items-center justify-between">
                      <span>Polygon (Amoy / PoS)</span>
                      <button onClick={() => handleCopy(evmAddress)} className="text-primary hover:underline cursor-pointer">
                        {copied ? t.copied : t.copyAddress}
                      </button>
                    </div>
                    <div className="font-mono text-[11px] text-ink-2 break-all bg-surface p-2 rounded-lg border border-line/60">
                      {evmAddress}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => setReceiveModalOpen(false)}
                className="w-full ui-btn ui-btn-primary ui-btn-sm font-bold"
              >
                {lang === 'es' ? 'Cerrar' : 'Done'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
