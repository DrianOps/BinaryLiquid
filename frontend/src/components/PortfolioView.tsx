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
  chainType: 'BCH' | 'EVM' | 'SVM' | 'BSC' | 'LTC' | 'TON';
  chainBadge?: string;
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
  solanaAddress?: string;
  tonAddress?: string;
  ltcAddress?: string;
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
    solanaOnly: "Solana Devnet",
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
    connectPrompt: "Connect your Bitcoin Cash, EVM, or Solana wallet to view real live on-chain portfolio balances, yields, and vault covenants.",
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
    solanaOnly: "Solana Devnet",
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
  solanaAddress,
  tonAddress,
  ltcAddress,
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
  const [networkFilter, setNetworkFilter] = useState<'all' | 'bch' | 'evm' | 'bsc' | 'solana' | 'ltc' | 'ton'>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [hoveredPoint, setHoveredPoint] = useState<{ time: string; value: number } | null>(null);
  const [receiveModalOpen, setReceiveModalOpen] = useState<boolean>(false);

  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);

  const isConnected = Boolean(userAddress || bchAddress || evmAddress || solanaAddress || tonAddress || ltcAddress);
  const primaryDisplayAddress = bchAddress || evmAddress || solanaAddress || tonAddress || ltcAddress || userAddress;

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
          { symbol: 'PUSD', name: 'Paryon USD', chain: platformNetwork === 'testnet' ? 'BCH Chipnet' : 'Bitcoin Cash', chainType: 'BCH', chainBadge: 'BCH CashTokens', balance: 0, priceUsd: 1.0, valueUsd: 0, change24h: 0, icon: '/PUSD.png', isCashToken: true },
          { symbol: 'BCH', name: 'Bitcoin Cash', chain: platformNetwork === 'testnet' ? 'BCH Chipnet' : 'Bitcoin Cash', chainType: 'BCH', chainBadge: 'BCH Native', balance: 0, priceUsd: 230.5, valueUsd: 0, change24h: 1.85, icon: '/BCH.png', isNative: true },
          { symbol: 'USDT', name: 'Tether USD (Polygon)', chain: platformNetwork === 'testnet' ? 'Polygon Amoy' : 'Polygon PoS', chainType: 'EVM', chainBadge: 'Polygon PoS', balance: 0, priceUsd: 1.0, valueUsd: 0, change24h: 0.01, icon: '/USDT.png' },
          { symbol: 'USDC', name: 'USD Coin (Polygon)', chain: platformNetwork === 'testnet' ? 'Polygon Amoy' : 'Polygon PoS', chainType: 'EVM', chainBadge: 'Polygon PoS', balance: 0, priceUsd: 1.0, valueUsd: 0, change24h: 0, icon: '/USDC.png' },
          { symbol: 'POL', name: 'Polygon Ecosystem Token', chain: platformNetwork === 'testnet' ? 'Polygon Amoy' : 'Polygon PoS', chainType: 'EVM', chainBadge: 'Polygon Native', balance: 0, priceUsd: 0.09, valueUsd: 0, change24h: -0.45, icon: '/POL.png', isNative: true },
          { symbol: 'USDT', name: 'Tether USD (Solana)', chain: platformNetwork === 'testnet' ? 'Solana Devnet' : 'Solana Mainnet', chainType: 'SVM', chainBadge: 'Solana SPL', balance: 0, priceUsd: 1.0, valueUsd: 0, change24h: 0.01, icon: '/USDT.png' },
          { symbol: 'SOL', name: 'Solana', chain: platformNetwork === 'testnet' ? 'Solana Devnet' : 'Solana Mainnet', chainType: 'SVM', chainBadge: 'Solana Native', balance: 0, priceUsd: 101.5, valueUsd: 0, change24h: 3.2, icon: '/SOL.png', isNative: true }
        ],
        pools: [],
        lending: null,
        perps: { positions: [], history: [] },
        activity: [],
        chart: {
          '1h': [{ time: '00m', value: 0 }, { time: '30m', value: 0 }, { time: '60m', value: 0 }],
          '1d': [{ time: '00:00', value: 0 }, { time: '12:00', value: 0 }, { time: '23:59', value: 0 }],
          '1w': [{ time: 'Lun', value: 0 }, { time: 'Jue', value: 0 }, { time: 'Dom', value: 0 }],
          '1m': [{ time: 'Sem 1', value: 0 }, { time: 'Sem 2', value: 0 }, { time: 'Sem 4', value: 0 }],
          '1y': [{ time: 'Ene', value: 0 }, { time: 'Jun', value: 0 }, { time: 'Dic', value: 0 }],
          'all': [{ time: 'Inicio', value: 0 }, { time: 'Mitad', value: 0 }, { time: 'Hoy', value: 0 }]
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
        ...(evmAddress ? { evmAddress } : {}),
        ...(solanaAddress ? { solanaAddress } : {}),
        ...(tonAddress ? { tonAddress } : {}),
        ...(ltcAddress ? { ltcAddress } : {})
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
  }, [userAddress, bchAddress, evmAddress, solanaAddress, tonAddress, ltcAddress, platformNetwork]);

  const handleCopy = (text: string) => {
    if (!text) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).catch(() => {});
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
    } catch {}
    setCopied(true);
    showToast(t.copied, 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  // Filter tokens based on network selection
  const filteredTokens = useMemo(() => {
    if (!portfolio?.tokens) return [];
    if (networkFilter === 'bch') return portfolio.tokens.filter(tk => tk.chainType === 'BCH');
    if (networkFilter === 'evm') return portfolio.tokens.filter(tk => tk.chainType === 'EVM');
    if (networkFilter === 'bsc') return portfolio.tokens.filter(tk => tk.chainType === 'BSC');
    if (networkFilter === 'solana') return portfolio.tokens.filter(tk => tk.chainType === 'SVM');
    if (networkFilter === 'ltc') return portfolio.tokens.filter(tk => tk.chainType === 'LTC');
    if (networkFilter === 'ton') return portfolio.tokens.filter(tk => tk.chainType === 'TON');
    return portfolio.tokens;
  }, [portfolio?.tokens, networkFilter]);

  const getChainUiMeta = (chainType: PortfolioToken['chainType']) => {
    switch (chainType) {
      case 'BCH':
        return { icon: '/BCH.png', label: 'BCH', badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' };
      case 'EVM':
        return { icon: '/POL.png', label: 'Polygon', badgeClass: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' };
      case 'BSC':
        return { icon: '/BNB.png', label: 'BSC', badgeClass: 'bg-amber-500/10 text-amber-500 border-amber-500/20' };
      case 'LTC':
        return { icon: '/LTC.png', label: 'Litecoin', badgeClass: 'bg-sky-500/10 text-sky-500 border-sky-500/20' };
      case 'TON':
        return { icon: '/TON.png', label: 'TON', badgeClass: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20' };
      case 'SVM':
      default:
        return { icon: '/SOL.png', label: 'Solana', badgeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/20' };
    }
  };

  const renderChainFilterPills = () => {
    const items: Array<{ id: typeof networkFilter; label: string; icon?: string }> = [
      { id: 'all', label: t.allChains },
      { id: 'bch', label: 'BCH', icon: '/BCH.png' },
      { id: 'evm', label: 'Polygon', icon: '/POL.png' },
      { id: 'bsc', label: 'BSC', icon: '/BNB.png' },
      { id: 'solana', label: 'Solana', icon: '/SOL.png' },
      { id: 'ltc', label: 'LTC', icon: '/LTC.png' },
      { id: 'ton', label: 'TON', icon: '/TON.png' }
    ];
    return (
      <div className="flex items-center gap-1 p-1 rounded-control bg-surface-2 overflow-x-auto max-w-full [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setNetworkFilter(item.id)}
            className={`px-3 py-1.5 rounded-[9px] text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              networkFilter === item.id
                ? 'bg-surface text-ink shadow-soft font-semibold'
                : 'text-ink-2 hover:text-ink'
            }`}
          >
            {item.icon && <img src={item.icon} className="w-3.5 h-3.5 object-contain rounded-full" alt={item.label} />}
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    );
  };

  const filteredTokensUsd = useMemo(() => {
    return filteredTokens.reduce((acc, tk) => acc + (tk.valueUsd || 0), 0);
  }, [filteredTokens]);

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

  // Generate smooth SVG curve (flattened cleanly along subtle bottom gridline when variance = 0)
  const chartSvgData = useMemo(() => {
    if (chartPoints.length < 2) return { pathD: '', areaD: '', minVal: 0, maxVal: 0, isFlat: true };
    const values = chartPoints.map(p => p.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const isFlat = maxVal - minVal === 0;
    const range = isFlat ? 1 : maxVal - minVal;

    const width = 600;
    const height = 160;
    const paddingY = 18;

    const coords = chartPoints.map((p, idx) => {
      const x = (idx / (chartPoints.length - 1)) * width;
      const y = isFlat
        ? height - 24
        : height - paddingY - ((p.value - minVal) / range) * (height - paddingY * 2);
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

    const areaD = isFlat ? '' : `${pathD} L ${width} ${height} L 0 ${height} Z`;

    return { pathD, areaD, minVal, maxVal, isFlat };
  }, [chartPoints]);

  const currentNetWorth = hoveredPoint ? hoveredPoint.value : (portfolio?.netWorthUsd ?? 0);
  const changeUsd = portfolio?.performance?.totalReturnUsd ?? 0;
  const changePercent = currentNetWorth > 0 ? (changeUsd / currentNetWorth) * 100 : (changeUsd < 0 ? -100 : 0);
  const isPositive = changeUsd >= 0;

  const showMockPrices = isConnected;
  const displayTokens = useMemo(() => {
    if (showMockPrices) return filteredTokens;
    return filteredTokens.map(tk => ({ ...tk, balance: 0, valueUsd: 0 }));
  }, [filteredTokens, showMockPrices]);

  return (
    <div className="ui-page pt-2 sm:pt-4 pb-12 animate-in fade-in duration-300">
      {/* 1. CLEAN PAGE HEADER */}
      <div className="ui-page-header">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="ui-title">{t.portfolio}</h1>
            {primaryDisplayAddress && (
              <button
                type="button"
                onClick={() => handleCopy(primaryDisplayAddress)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-control bg-surface border border-line font-mono text-xs text-ink-2 hover:text-ink transition-colors cursor-pointer"
                title={t.copyAddress}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${platformNetwork === 'mainnet' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <span>{`${primaryDisplayAddress.slice(0, 8)}...${primaryDisplayAddress.slice(-6)}`}</span>
                {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-ink-3" />}
              </button>
            )}
          </div>
          <p className="ui-subtitle">
            {isConnected
              ? (lang === 'es'
                  ? `Consolidado no-custodio · ${platformNetwork === 'mainnet' ? 'Mainnet' : 'Chipnet / Testnet'}`
                  : `Non-custodial consolidated balances · ${platformNetwork === 'mainnet' ? 'Mainnet' : 'Chipnet / Testnet'}`)
              : (lang === 'es'
                  ? 'Balance agregado en BCH, Polygon, BSC, Solana, LTC y TON.'
                  : 'Consolidated holdings in BCH, Polygon, BSC, Solana, LTC & TON.')}
          </p>
        </div>

        {/* Right Header Navigation & Single Primary CTA */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
          <div className="ui-segment overflow-x-auto max-w-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[
              { id: 'overview', label: t.overview },
              { id: 'tokens', label: t.tokens },
              { id: 'pools', label: t.pools },
              { id: 'defi', label: t.defi },
              { id: 'activity', label: t.activity }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`ui-segment-item px-2.5 sm:px-3.5 text-[11px] sm:text-xs whitespace-nowrap shrink-0 ${
                  activeTab === tab.id ? 'ui-segment-item-active' : ''
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              fetchPortfolio(true);
              if (onRefreshBalances) onRefreshBalances();
            }}
            disabled={refreshing}
            className="w-9 h-9 rounded-control border border-line bg-surface hover:bg-surface-2 text-ink-2 hover:text-ink flex items-center justify-center transition-colors cursor-pointer shrink-0 disabled:opacity-50"
            title={t.refreshing}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          {!isConnected && onConnectWallet ? (
            <button
              type="button"
              onClick={onConnectWallet}
              className="ui-btn-primary ui-btn-sm whitespace-nowrap shrink-0"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>{t.connectBtn}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setReceiveModalOpen(true)}
              className="ui-btn-primary ui-btn-sm whitespace-nowrap shrink-0"
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>{lang === 'es' ? 'Recibir' : 'Receive'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. SINGLE UNIFIED CHAIN FILTER BAR (Zero clipping, zero duplication) */}
      {(activeTab === 'overview' || activeTab === 'tokens') && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {renderChainFilterPills()}
          <div className="text-xs text-ink-3 tabular-nums hidden sm:block">
            {displayTokens.length} {lang === 'es' ? 'activos mostrados' : 'assets shown'} ·{' '}
            <span className="font-semibold text-ink">${filteredTokensUsd.toFixed(2)} USD</span>
          </div>
        </div>
      )}

      {/* TAB CONTENT */}
      <>
        {/* TAB 1: OVERVIEW (Resumen) */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            {/* TOP HERO BENTO: NET WORTH + CHART (8 cols) | QUICK ACTIONS + PERFORMANCE (4 cols) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              {/* Left (8 cols): Total Net Worth & Chart */}
              <div className="lg:col-span-8 ui-card p-5 sm:p-6 flex flex-col justify-between space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="ui-label">{t.netWorth}</div>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-3xl sm:text-4xl font-semibold text-ink tracking-tight tabular-nums">
                        {currentNetWorth < 0 ? '-' : ''}$
                        {Math.abs(currentNetWorth).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </span>
                      <span className="text-xs font-medium text-ink-3">USD</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 text-xs">
                      <span
                        className={`inline-flex items-center gap-1 font-semibold tabular-nums ${
                          isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                        }`}
                      >
                        {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        <span>
                          {isPositive ? '+' : '-'}${Math.abs(changeUsd).toFixed(2)} ({changePercent > 0 ? '+' : ''}
                          {changePercent.toFixed(2)}%)
                        </span>
                      </span>
                      <span className="text-ink-3">{hoveredPoint ? hoveredPoint.time : t.today}</span>
                    </div>
                  </div>

                  {/* Timeframe selector */}
                  <div className="ui-segment self-start">
                    {(['1h', '1d', '1w', '1m', '1y', 'all'] as const).map(tf => (
                      <button
                        key={tf}
                        type="button"
                        onClick={() => {
                          setTimeframe(tf);
                          setHoveredPoint(null);
                        }}
                        className={`ui-segment-item px-2.5 py-1 ${
                          timeframe === tf ? 'ui-segment-item-active' : ''
                        }`}
                      >
                        {tf === '1w' ? (lang === 'es' ? '1s' : '1w') : tf === 'all' ? (lang === 'es' ? 'Todo' : 'All') : tf}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Clean Institutional SVG Chart with hairline grid */}
                <div>
                  <div
                    className="relative w-full h-40 select-none"
                    onMouseLeave={() => setHoveredPoint(null)}
                  >
                    <svg viewBox="0 0 600 160" className="w-full h-full overflow-visible">
                      <defs>
                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10B981" stopOpacity="0.18" />
                          <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Subtle horizontal gridlines */}
                      {[32, 74, 116].map(yLine => (
                        <line
                          key={yLine}
                          x1="0"
                          y1={yLine}
                          x2="600"
                          y2={yLine}
                          stroke="currentColor"
                          className="text-line"
                          strokeDasharray="3 4"
                          strokeWidth="1"
                        />
                      ))}

                      {chartSvgData.areaD && (
                        <path d={chartSvgData.areaD} fill="url(#chartGradient)" />
                      )}

                      {chartSvgData.pathD && (
                        <path
                          d={chartSvgData.pathD}
                          fill="none"
                          stroke={chartSvgData.isFlat ? '#9CA3AF' : '#10B981'}
                          strokeOpacity={chartSvgData.isFlat ? '0.6' : '1'}
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}
                    </svg>

                    <div className="absolute inset-0 flex items-stretch">
                      {chartPoints.map((pt, idx) => (
                        <div
                          key={idx}
                          className="flex-1 cursor-crosshair group relative"
                          onMouseEnter={() => setHoveredPoint(pt)}
                          onTouchStart={() => setHoveredPoint(pt)}
                        >
                          <div className="hidden group-hover:block absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px bg-line-strong" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Distinct Timeline Axis Labels */}
                  <div className="flex items-center justify-between text-[11px] font-mono text-ink-3 pt-1.5 border-t border-line tabular-nums">
                    <span>{chartPoints[0]?.time}</span>
                    <span>{chartPoints[Math.floor(chartPoints.length / 2)]?.time}</span>
                    <span>{chartPoints[chartPoints.length - 1]?.time}</span>
                  </div>
                </div>

                {/* Inline Capital Allocation Footer inside Net Worth Card */}
                <div className="pt-3 border-t border-line grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <div className="ui-label">{lang === 'es' ? 'Billetera spot' : 'Spot wallet'}</div>
                    <div className="font-semibold text-ink tabular-nums mt-0.5">
                      ${(portfolio?.breakdown?.walletTokensUsd ?? 0).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="ui-label">{lang === 'es' ? 'Liquidez AMM' : 'AMM pools'}</div>
                    <div className="font-semibold text-ink tabular-nums mt-0.5">
                      ${(portfolio?.breakdown?.lpTotalValueUsd ?? 0).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="ui-label">{lang === 'es' ? 'Colateral Lend' : 'Lend vaults'}</div>
                    <div className="font-semibold text-ink tabular-nums mt-0.5">
                      ${(portfolio?.breakdown?.lendingCollateralUsd ?? 0).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="ui-label">{lang === 'es' ? 'Margen Perps' : 'Perps margin'}</div>
                    <div className="font-semibold text-ink tabular-nums mt-0.5">
                      ${(portfolio?.breakdown?.perpsMarginLockedUsd ?? 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right (4 cols): Monochrome Swiss Actions + Performance Summary */}
              <div className="lg:col-span-4 flex flex-col gap-4">
                <div className="ui-card p-4 space-y-2.5">
                  <div className="ui-label">{t.quickActions}</div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      {
                        label: t.swap,
                        sub: lang === 'es' ? 'Cross-chain' : 'Cross-chain',
                        icon: Repeat,
                        onClick: () => onNavigate && onNavigate('bridge')
                      },
                      {
                        label: t.deposit,
                        sub: lang === 'es' ? 'Direcciones QR' : 'QR addresses',
                        icon: ArrowDownLeft,
                        onClick: () => setReceiveModalOpen(true)
                      },
                      {
                        label: t.earn,
                        sub: lang === 'es' ? '0.25% APY LP' : 'LP fee accrual',
                        icon: PiggyBank,
                        onClick: () => onNavigate && onNavigate('pools')
                      },
                      {
                        label: t.lend,
                        sub: 'P2SH32 Vaults',
                        icon: ShieldCheck,
                        onClick: () => onNavigate && onNavigate('lend')
                      }
                    ].map(act => {
                      const Icon = act.icon;
                      return (
                        <button
                          key={act.label}
                          type="button"
                          onClick={act.onClick}
                          className="p-3 rounded-panel bg-surface-2 hover:bg-surface-3 border border-line text-left transition-colors cursor-pointer flex flex-col justify-between h-[84px] group"
                        >
                          <div className="flex items-center justify-between text-ink-2 group-hover:text-ink">
                            <Icon className="w-4 h-4" />
                            <ArrowUpRight className="w-3.5 h-3.5 text-ink-3 group-hover:text-ink transition-colors" />
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-ink truncate">{act.label}</div>
                            <div className="text-[11px] text-ink-3 truncate">{act.sub}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="ui-card p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-ink">{t.performance}</span>
                    <span className="text-[11px] text-ink-3">{lang === 'es' ? 'Histórico' : 'All time'}</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-ink-3">{t.unrealizedReturn}</span>
                      <span className="font-medium text-ink tabular-nums">
                        ${(portfolio?.performance?.unrealizedPnlUsd ?? 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-ink-3">{t.realizedReturn}</span>
                      <span className="font-medium text-ink tabular-nums">
                        ${(portfolio?.performance?.realizedPnlUsd ?? 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-ink-3">{t.historicalEarned}</span>
                      <span className="font-medium text-ink tabular-nums">
                        ${(portfolio?.performance?.totalYieldEarnedUsd ?? 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="pt-2.5 border-t border-line flex items-center justify-between font-semibold">
                      <span className="text-ink">{t.totalReturn}</span>
                      <span
                        className={`tabular-nums ${
                          isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                        }`}
                      >
                        {isPositive ? '+' : ''}${(portfolio?.performance?.totalReturnUsd ?? 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* BOTTOM SECTION: TOKENS LEDGER TABLE (8 cols) + YIELD VAULTS (4 cols) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left (8 cols): Clean Ledger Table */}
              <div className="lg:col-span-8 ui-card overflow-hidden">
                <div className="px-5 py-3.5 border-b border-line flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <h4 className="ui-section-title">{t.tokens}</h4>
                    <span className="ui-badge font-mono tabular-nums">
                      {displayTokens.length}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-ink font-mono tabular-nums">
                    ${filteredTokensUsd.toFixed(2)} USD
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-ink-3 border-b border-line bg-surface-2/40 text-[11px] font-medium">
                        <th className="px-5 py-2.5 font-medium">{t.token}</th>
                        <th className="px-3 py-2.5 font-medium">{t.price}</th>
                        <th className="px-3 py-2.5 font-medium">{t.balance}</th>
                        <th className="px-3 py-2.5 font-medium text-right">{t.value}</th>
                        <th className="px-5 py-2.5 font-medium text-right">{t.action}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {displayTokens.map(tk => {
                        const meta = getChainUiMeta(tk.chainType);
                        return (
                          <tr
                            key={`${tk.chainType}_${tk.symbol}_${tk.name}`}
                            className="hover:bg-surface-2/40 transition-colors"
                          >
                            <td className="px-5 py-3 flex items-center gap-3">
                              <div className="relative shrink-0">
                                <img
                                  src={tk.icon}
                                  alt={tk.symbol}
                                  className="w-8 h-8 rounded-full object-contain bg-surface border border-line p-0.5"
                                />
                                <img
                                  src={meta.icon}
                                  alt={tk.chainType}
                                  className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full object-contain bg-surface border border-line"
                                  title={tk.chain}
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-ink">{tk.symbol}</span>
                                  <span className="text-[11px] text-ink-3">· {meta.label}</span>
                                </div>
                                <div className="text-[11px] text-ink-3 truncate">{tk.name}</div>
                              </div>
                            </td>
                            <td className="px-3 py-3 font-mono text-ink-2 tabular-nums">
                              ${tk.priceUsd < 1 ? tk.priceUsd.toFixed(3) : tk.priceUsd.toFixed(2)}
                            </td>
                            <td className="px-3 py-3 font-mono text-ink tabular-nums">
                              {tk.balance.toLocaleString('en-US', { maximumFractionDigits: 6 })}
                            </td>
                            <td className="px-3 py-3 font-mono font-semibold text-ink text-right tabular-nums">
                              ${tk.valueUsd.toFixed(2)}
                            </td>
                            <td className="px-5 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => onNavigate && onNavigate('bridge')}
                                className="px-2.5 py-1 rounded-lg bg-surface-2 border border-line hover:bg-surface-3 text-ink font-medium text-[11px] transition-colors cursor-pointer"
                              >
                                Swap
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right (4 cols): Yield Markets (No AI boilerplate box) */}
              <div className="lg:col-span-4 ui-card overflow-hidden">
                <div className="px-5 py-3.5 border-b border-line flex items-center justify-between">
                  <div>
                    <h4 className="ui-section-title">{t.earnOpportunities}</h4>
                  </div>
                  <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
                    +${(portfolio?.performance?.totalYieldEarnedUsd ?? 0).toFixed(2)}
                  </span>
                </div>

                <div className="divide-y divide-line">
                  {[
                    { token: 'PUSD', name: 'Paryon USD · CashTokens', apy: '5.8%', icon: '/PUSD.png', route: 'lend' },
                    { token: 'USDT', name: 'Tether USD · Polygon', apy: '6.2%', icon: '/USDT.png', route: 'lend' },
                    { token: 'USDC', name: 'USD Coin · Polygon', apy: '5.5%', icon: '/USDC.png', route: 'lend' }
                  ].map(opp => (
                    <div
                      key={opp.token}
                      className="px-5 py-3.5 flex items-center justify-between hover:bg-surface-2/40 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img src={opp.icon} alt={opp.token} className="w-7 h-7 rounded-full object-contain shrink-0" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-xs text-ink">{opp.token}</span>
                            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold tabular-nums">
                              {opp.apy} {t.apy}
                            </span>
                          </div>
                          <div className="text-[11px] text-ink-3 truncate">{opp.name}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onNavigate && onNavigate(opp.route as any)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-ink-2 hover:text-ink transition-colors cursor-pointer shrink-0"
                      >
                        <span>{t.obtain}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TOKENS ONLY */}
        {activeTab === 'tokens' && (
          <div className="ui-card overflow-hidden">
            <div className="px-5 py-4 border-b border-line flex items-center justify-between gap-3">
              <div>
                <h3 className="ui-section-title">{t.tokens}</h3>
                <p className="text-xs text-ink-3 mt-0.5">
                  {networkFilter === 'all'
                    ? (lang === 'es' ? 'Saldos on-chain consolidados' : 'Consolidated on-chain balances')
                    : `${displayTokens.length} ${lang === 'es' ? 'activos en red seleccionada' : 'assets on selected network'}`}
                </p>
              </div>
              <div className="text-sm font-semibold text-ink font-mono tabular-nums">
                ${filteredTokensUsd.toFixed(2)} USD
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-ink-3 border-b border-line bg-surface-2/40 text-[11px] font-medium">
                    <th className="px-5 py-2.5 font-medium">{t.token}</th>
                    <th className="px-3 py-2.5 font-medium">{t.price}</th>
                    <th className="px-3 py-2.5 font-medium">{t.balance}</th>
                    <th className="px-3 py-2.5 font-medium text-right">{t.value}</th>
                    <th className="px-5 py-2.5 font-medium text-right">{t.action}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {displayTokens.map(tk => {
                    const meta = getChainUiMeta(tk.chainType);
                    return (
                      <tr key={`${tk.chainType}_${tk.symbol}_${tk.name}`} className="hover:bg-surface-2/40 transition-colors">
                        <td className="px-5 py-3.5 flex items-center gap-3">
                          <div className="relative shrink-0">
                            <img src={tk.icon} alt={tk.symbol} className="w-8 h-8 rounded-full object-contain bg-surface border border-line p-0.5" />
                            <img
                              src={meta.icon}
                              alt={tk.chainType}
                              className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full object-contain bg-surface border border-line"
                              title={tk.chain}
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-sm text-ink">{tk.symbol}</span>
                              <span className="text-[11px] text-ink-3">· {meta.label}</span>
                            </div>
                            <div className="text-[11px] text-ink-3 truncate">{tk.name}</div>
                          </div>
                        </td>
                        <td className="px-3 py-3.5 font-mono text-ink-2 tabular-nums">
                          ${tk.priceUsd < 1 ? tk.priceUsd.toFixed(3) : tk.priceUsd.toFixed(2)}
                        </td>
                        <td className="px-3 py-3.5 font-mono text-ink tabular-nums">
                          {tk.balance.toLocaleString('en-US', { maximumFractionDigits: 6 })}
                        </td>
                        <td className="px-3 py-3.5 font-mono font-semibold text-ink text-right tabular-nums">
                          ${tk.valueUsd.toFixed(2)}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => onNavigate && onNavigate('bridge')}
                            className="ui-btn-secondary ui-btn-sm"
                          >
                            Swap
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: POOLS */}
        {activeTab === 'pools' && (
          <div className="ui-card overflow-hidden">
            <div className="px-5 py-4 border-b border-line flex items-center justify-between">
              <div>
                <h3 className="ui-section-title">{t.pools}</h3>
                <p className="text-xs text-ink-3 mt-0.5">
                  {lang === 'es' ? 'Posiciones de liquidez (LP) en BinaryLiquid AMM' : 'Liquidity provider (LP) shares in BinaryLiquid AMM'}
                </p>
              </div>
              <div className="text-sm font-semibold text-ink font-mono tabular-nums">
                ${(portfolio?.breakdown?.lpTotalValueUsd ?? 0).toFixed(2)} USD
              </div>
            </div>

            {(!portfolio?.pools || portfolio.pools.length === 0) ? (
              <div className="text-center py-14 px-6 space-y-3">
                <div className="text-sm font-semibold text-ink">{t.noPools}</div>
                <p className="text-xs text-ink-3 max-w-sm mx-auto">
                  {lang === 'es'
                    ? 'Aporta liquidez en pares PUSD / USDT o BCH para generar comisiones por cada swap.'
                    : 'Supply liquidity in PUSD / USDT or BCH pairs to earn cross-chain swap fees.'}
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate && onNavigate('pools')}
                  className="ui-btn-secondary ui-btn-sm"
                >
                  {t.explorePools}
                </button>
              </div>
            ) : (
              <div className="divide-y divide-line">
                {portfolio.pools.map((p: any) => (
                  <div key={p.id} className="px-5 py-4 flex items-center justify-between hover:bg-surface-2/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-2">
                        <img src={p.iconA} alt={p.tokenA} className="w-7 h-7 rounded-full border border-surface" />
                        <img src={p.iconB} alt={p.tokenB} className="w-7 h-7 rounded-full border border-surface" />
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-ink">{p.pair}</div>
                        <div className="text-xs text-ink-3">{p.poolSharePercent}% {lang === 'es' ? 'del pool' : 'pool share'}</div>
                      </div>
                    </div>
                    <div className="text-right font-mono tabular-nums">
                      <div className="font-semibold text-sm text-ink">${p.totalValueUsd}</div>
                      <div className="text-xs text-emerald-600 dark:text-emerald-400">+${p.profitUsd} fees</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: DEFI (LEND & PERPS) */}
        {activeTab === 'defi' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Card 1: Lending Covenant Vault */}
            <div className="ui-card p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-line">
                <div>
                  <h4 className="ui-section-title">{t.lendingVault}</h4>
                  <p className="text-[11px] text-ink-3">CashScript P2SH32 Covenant</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                  portfolio?.lending?.vault?.healthStatus === 'RISK'
                    ? 'bg-rose-500/10 text-rose-500'
                    : portfolio?.lending?.vault?.healthStatus === 'MODERATE'
                    ? 'bg-amber-500/10 text-amber-500'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                }`}>
                  {portfolio?.lending?.vault?.healthStatus || 'SAFE'}
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-ink-3">{t.collateralLocked}</span>
                  <span className="font-semibold text-ink font-mono tabular-nums">
                    {portfolio?.lending?.vault?.collateralBch || 0} BCH (${portfolio?.lending?.vault?.collateralUsd || 0})
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-ink-3">{t.borrowedDebt}</span>
                  <span className="font-semibold text-rose-500 font-mono tabular-nums">
                    ${portfolio?.lending?.vault?.totalDebtUsd || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-ink-3">{t.healthFactor}</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                    {portfolio?.lending?.vault?.healthFactor || 999.0}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigate && onNavigate('lend')}
                className="w-full ui-btn-secondary ui-btn-sm"
              >
                {lang === 'es' ? 'Administrar Bóveda Lend' : 'Manage Lend Vault'}
              </button>
            </div>

            {/* Card 2: Active Perps */}
            <div className="ui-card p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-line">
                <div>
                  <h4 className="ui-section-title">{t.openPositions}</h4>
                  <p className="text-[11px] text-ink-3">Non-Custodial Perps</p>
                </div>
              </div>

              {(!portfolio?.perps?.positions || portfolio.perps.positions.length === 0) ? (
                <div className="text-center py-8 space-y-2.5">
                  <p className="text-xs text-ink-3">{t.noPerps}</p>
                  <button
                    type="button"
                    onClick={() => onNavigate && onNavigate('perps')}
                    className="ui-btn-secondary ui-btn-sm"
                  >
                    {t.tradePerps}
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-line">
                  {portfolio.perps.positions.map((pos: any) => (
                    <div key={pos.id} className="py-2.5 text-xs flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-ink">{pos.symbol} · {pos.side?.toUpperCase()} ({pos.leverage}x)</div>
                        <div className="text-[11px] text-ink-3 tabular-nums">Margin: ${pos.marginUsd}</div>
                      </div>
                      <div className="text-right font-mono font-semibold tabular-nums">
                        <span className={pos.unrealizedPnlUsd >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}>
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
          <div className="ui-card overflow-hidden">
            <div className="px-5 py-4 border-b border-line">
              <h3 className="ui-section-title">{t.activity}</h3>
              <p className="text-xs text-ink-3 mt-0.5">
                {lang === 'es' ? 'Historial unificado de transacciones on-chain verificadas' : 'Unified verified on-chain transaction history'}
              </p>
            </div>

            {(!portfolio?.activity || portfolio.activity.length === 0) ? (
              <div className="text-center py-12 text-ink-3 text-xs">
                {t.noActivity}
              </div>
            ) : (
              <div className="divide-y divide-line">
                {portfolio.activity.map(act => (
                  <div key={act.id} className="px-5 py-3.5 flex items-center justify-between gap-3 text-xs hover:bg-surface-2/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-control bg-surface-2 border border-line text-ink-2 flex items-center justify-center shrink-0">
                        {act.type === 'SWAP' ? <Repeat className="w-4 h-4" /> :
                         act.type === 'LEND' ? <ShieldCheck className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="font-semibold text-ink">{act.title}</div>
                        <div className="text-[11px] text-ink-3">
                          {new Date(act.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </div>
                      </div>
                    </div>

                    {act.explorerUrl && (
                      <a
                        href={act.explorerUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-2 hover:text-ink px-2.5 py-1 rounded-md bg-surface-2 border border-line transition-colors"
                      >
                        <span>Explorer</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </>

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

                {solanaAddress && (
                  <div className="p-3.5 rounded-2xl bg-surface-2 border border-line space-y-1.5">
                    <div className="font-bold text-ink flex items-center justify-between">
                      <span>Solana (Devnet / SVM)</span>
                      <button onClick={() => handleCopy(solanaAddress)} className="text-primary hover:underline cursor-pointer">
                        {copied ? t.copied : t.copyAddress}
                      </button>
                    </div>
                    <div className="font-mono text-[11px] text-ink-2 break-all bg-surface p-2 rounded-lg border border-line/60">
                      {solanaAddress}
                    </div>
                  </div>
                )}

                {tonAddress && (
                  <div className="p-3.5 rounded-2xl bg-surface-2 border border-line space-y-1.5">
                    <div className="font-bold text-ink flex items-center justify-between">
                      <span>TON Network (Jettons)</span>
                      <button onClick={() => handleCopy(tonAddress)} className="text-primary hover:underline cursor-pointer">
                        {copied ? t.copied : t.copyAddress}
                      </button>
                    </div>
                    <div className="font-mono text-[11px] text-ink-2 break-all bg-surface p-2 rounded-lg border border-line/60">
                      {tonAddress}
                    </div>
                  </div>
                )}

                {ltcAddress && (
                  <div className="p-3.5 rounded-2xl bg-surface-2 border border-line space-y-1.5">
                    <div className="font-bold text-ink flex items-center justify-between">
                      <span>Litecoin (Native SegWit / Taproot)</span>
                      <button onClick={() => handleCopy(ltcAddress)} className="text-primary hover:underline cursor-pointer">
                        {copied ? t.copied : t.copyAddress}
                      </button>
                    </div>
                    <div className="font-mono text-[11px] text-ink-2 break-all bg-surface p-2 rounded-lg border border-line/60">
                      {ltcAddress}
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
