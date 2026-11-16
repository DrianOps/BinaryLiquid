import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  ExternalLink,
  RefreshCw,
  ChevronDown,
  ArrowRight,
  Copy,
  Check,
  Target,
  AlertTriangle
} from 'lucide-react';
import { createChart, ColorType, IChartApi, ISeriesApi, IPriceLine } from 'lightweight-charts';
import { formatCryptoBalance, generateQrDataUrl } from '../utils/bchAddress';
import {
  executeBchSwapDeposit,
  executeWeb3LpDeposit,
  hasActiveBchSigningCapability,
  AuthSessionChain,
  EnsureAuthSessionOptions
} from '../services/walletConnectService';

export interface PerpsViewProps {
  backendUrl?: string;
  userAddress?: string;
  bchAddress?: string;
  bchWalletSource?: 'wizard' | 'wc2-bch' | 'extension' | 'manual';
  evmAddress?: string;
  walletBalances?: {
    PUSD: number;
    BCH: number;
    USDT: number;
    USDC: number;
    POL: number;
  };
  wizardConnectManager?: any;
  wizardConnectState?: any;
  platformNetwork?: 'mainnet' | 'testnet';
  onToggleNetwork?: (net: 'mainnet' | 'testnet') => void;
  onRefreshBalances?: () => void;
  onConnectWallet?: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  lang?: 'en' | 'es';
  authToken?: string | null;
  onEnsureAuthSession?: (options?: EnsureAuthSessionOptions) => Promise<string | null>;
}

export interface PerpPosition {
  id: string;
  bchAddress?: string | null;
  evmAddress?: string | null;
  symbol: string;
  market: string;
  base?: string;
  side: 'long' | 'short';
  orderType?: 'market' | 'limit';
  leverage: number;
  collateralToken: 'PUSD' | 'USDT' | 'BCH';
  margin: number;
  marginAmount: number;
  marginUsd: number;
  sizeUsd: number;
  sizeAsset: number;
  entryPrice: number;
  markPrice?: number;
  liquidationPrice: number;
  openTime: number;
  takeProfit?: number | null;
  stopLoss?: number | null;
  openTxHash?: string;
  openExplorerUrl?: string;
  unrealizedPnlUsd?: number;
  unrealizedPnlPercent?: number;
}

export interface PerpTradeHistory {
  id: string;
  positionId?: string;
  symbol: string;
  market: string;
  side: 'long' | 'short';
  leverage: number;
  collateralToken?: 'PUSD' | 'USDT' | 'BCH';
  margin: number;
  marginAmount?: number;
  marginUsd?: number;
  sizeUsd: number;
  entryPrice: number;
  exitPrice: number;
  pnlUsd: number;
  pnlPercent: number;
  payoutAmount?: number;
  openTxHash?: string;
  openExplorerUrl?: string;
  closeTxHash?: string;
  closeExplorerUrl?: string;
  closeReason?: string;
  closedAt: number;
}

const MARKETS = [
  {
    symbol: 'BCHUSDT',
    name: 'BCH-PERP',
    base: 'BCH',
    quote: 'USD',
    fullName: 'Bitcoin Cash',
    maxLeverage: 50,
    minMarginUsd: 1,
    tickDecimals: 2,
    assetDecimals: 4,
    icon: '/BCH.png',
    initialPrice: 275.4,
    mmr: 0.01
  },
  {
    symbol: 'BTCUSDT',
    name: 'BTC-PERP',
    base: 'BTC',
    quote: 'USD',
    fullName: 'Bitcoin',
    maxLeverage: 50,
    minMarginUsd: 2,
    tickDecimals: 1,
    assetDecimals: 5,
    icon: '/BTC.png',
    initialPrice: 68420.0,
    mmr: 0.01
  },
  {
    symbol: 'ETHUSDT',
    name: 'ETH-PERP',
    base: 'ETH',
    quote: 'USD',
    fullName: 'Ethereum',
    maxLeverage: 50,
    minMarginUsd: 2,
    tickDecimals: 2,
    assetDecimals: 4,
    icon: '/ETH.png',
    initialPrice: 2540.0,
    mmr: 0.01
  },
  {
    symbol: 'SOLUSDT',
    name: 'SOL-PERP',
    base: 'SOL',
    quote: 'USD',
    fullName: 'Solana',
    maxLeverage: 20,
    minMarginUsd: 1,
    tickDecimals: 2,
    assetDecimals: 3,
    icon: '/SOL.png',
    initialPrice: 178.5,
    mmr: 0.025
  }
];

const TIMEFRAMES = [
  { label: '1m', value: '1m' },
  { label: '5m', value: '5m' },
  { label: '15m', value: '15m' },
  { label: '1h', value: '1h' },
  { label: '4h', value: '4h' },
  { label: '1D', value: '1d' }
];

const LEVERAGE_PRESETS = [1, 2, 5, 10, 20, 50];

const DEFAULT_VAULTS = {
  pusdVaultAddress: 'bchtest:rvqse7cr2ptah2e34sl53r5utqwxl28fk84grvf5ufzd6n5tclme29g2zzvuj',
  bchVaultAddress: 'bchtest:pvqse7cr2ptah2e34sl53r5utqwxl28fk84grvf5ufzd6n5tclme2hmkrmd9e',
  usdtVaultAddress: '0xc830c7cB16cd05bdEd8CA9d0c73E9038ed25Aa4A',
  usdtTokenAddress: '0x1a29793F2a64424D09f56AD045827dF1F0Fa1A75',
  availablePusd: 0,
  availableBch: 0,
  availableUsdt: 0,
  totalLiquidityUsd: 0
};

const ERC20_TRANSFER_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function decimals() external view returns (uint8)'
];

export default function PerpsView({
  backendUrl = '',
  userAddress = '',
  bchAddress = '',
  bchWalletSource,
  evmAddress = '',
  walletBalances: propBalances,
  wizardConnectManager,
  wizardConnectState,
  platformNetwork = 'testnet',
  onToggleNetwork,
  onRefreshBalances,
  onConnectWallet,
  showToast,
  lang = 'es',
  authToken,
  onEnsureAuthSession
}: PerpsViewProps) {
  const isEs = lang === 'es';
  const isTestnet = platformNetwork === 'testnet';

  // Selected market
  const [selectedSymbol, setSelectedSymbol] = useState<string>('BCHUSDT');
  const market = useMemo(
    () => MARKETS.find(m => m.symbol === selectedSymbol) || MARKETS[0],
    [selectedSymbol]
  );

  // Mobile View Switcher: 'chart' | 'trade' | 'positions'
  const [mobileTab, setMobileTab] = useState<'chart' | 'trade' | 'positions'>(() => {
    if (typeof window !== 'undefined') {
      const search = window.location.search.toLowerCase();
      const path = window.location.pathname.toLowerCase();
      if (search.includes('tab=trade') || path.endsWith('/trade')) return 'trade';
      if (search.includes('tab=positions') || path.endsWith('/positions')) return 'positions';
    }
    return 'chart';
  });

  // Market Dropdown toggle
  const [marketDropdownOpen, setMarketDropdownOpen] = useState(false);
  const marketDropdownRef = useRef<HTMLDivElement>(null);

  // Chart controls
  const [timeframe, setTimeframe] = useState<string>('15m');
  const [chartType, setChartType] = useState<'candles' | 'line'>('candles');

  // Trade inputs
  const [side, setSide] = useState<'long' | 'short'>('long');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [limitPrice, setLimitPrice] = useState<string>('');
  const orderTypeRef = useRef<'market' | 'limit'>(orderType);
  const limitPriceRef = useRef<string>(limitPrice);
  orderTypeRef.current = orderType;
  limitPriceRef.current = limitPrice;
  const [collateralToken, setCollateralToken] = useState<'PUSD' | 'USDT' | 'BCH'>('PUSD');
  const [marginInput, setMarginInput] = useState<string>('10');
  const [leverage, setLeverage] = useState<number>(10);
  const [showTpSlInputs, setShowTpSlInputs] = useState<boolean>(false);
  const [takeProfitInput, setTakeProfitInput] = useState<string>('');
  const [stopLossInput, setStopLossInput] = useState<string>('');
  const [manualTxHash, setManualTxHash] = useState<string>('');
  const [showManualQrDeposit, setShowManualQrDeposit] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [faucetClaiming, setFaucetClaiming] = useState<boolean>(false);

  // Multi-market live price map so all open positions calculate exact live uPnL
  const [marketPrices, setMarketPrices] = useState<Record<string, number>>({
    BCHUSDT: 275.4,
    BTCUSDT: 68420.0,
    ETHUSDT: 2540.0,
    SOLUSDT: 178.5,
    BCH: 275.4,
    BTC: 68420.0,
    ETH: 2540.0,
    SOL: 178.5
  });

  const markPrice = marketPrices[selectedSymbol] || market.initialPrice;
  const [prevPrice, setPrevPrice] = useState<number>(market.initialPrice);
  const [priceChange24h, setPriceChange24h] = useState<number>(1.85);
  const [high24h, setHigh24h] = useState<number>(market.initialPrice * 1.035);
  const [low24h, setLow24h] = useState<number>(market.initialPrice * 0.972);
  const [volume24h, setVolume24h] = useState<number>(1248000);
  const [fundingRate, setFundingRate] = useState<number>(0.01);
  const [fundingCountdown, setFundingCountdown] = useState<string>('04:18:22');

  // Protocol & Vault Backing State
  const [vaultsInfo, setVaultsInfo] = useState(DEFAULT_VAULTS);
  const [protocolStats, setProtocolStats] = useState({
    totalLongOiUsd: 0,
    totalShortOiUsd: 0,
    totalOpenInterestUsd: 0,
    openPositionsCount: 0,
    totalTradesClosed: 0
  });

  // Local fallback wallet balances (zeroed when disconnected)
  const [localBalances, setLocalBalances] = useState({
    PUSD: 0,
    BCH: 0,
    USDT: 0,
    USDC: 0,
    POL: 0
  });

  // Chart ref & elements
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<IChartApi | null>(null);
  const seriesInstanceRef = useRef<ISeriesApi<any> | null>(null);
  const entryLineRef = useRef<IPriceLine | null>(null);
  const liqLineRef = useRef<IPriceLine | null>(null);
  const tpLineRef = useRef<IPriceLine | null>(null);
  const slLineRef = useRef<IPriceLine | null>(null);

  // Real On-Chain Positions & History state
  const [positionsTab, setPositionsTab] = useState<'positions' | 'history'>('positions');
  const [positions, setPositions] = useState<PerpPosition[]>([]);
  const [tradeHistory, setTradeHistory] = useState<PerpTradeHistory[]>([]);
  const [closingPosId, setClosingPosId] = useState<string | null>(null);
  const [editingTpSlPos, setEditingTpSlPos] = useState<PerpPosition | null>(null);
  const [editTpVal, setEditTpVal] = useState<string>('');
  const [editSlVal, setEditSlVal] = useState<string>('');

  const connectedBch = useMemo(() => {
    if (bchAddress) return bchAddress;
    const trimmed = (userAddress || '').trim();
    if (/^(bchtest:|bitcoincash:)/i.test(trimmed)) {
      return trimmed.toLowerCase();
    }
    return '';
  }, [bchAddress, userAddress]);

  const connectedEvm = useMemo(() => {
    if (evmAddress) return evmAddress;
    if (userAddress && userAddress.startsWith('0x')) {
      return userAddress;
    }
    return '';
  }, [evmAddress, userAddress]);

  const walletBalances = useMemo(() => {
    if (!connectedBch && !connectedEvm && !userAddress) {
      return { PUSD: 0, BCH: 0, USDT: 0, USDC: 0, POL: 0 };
    }
    if (propBalances) {
      return propBalances;
    }
    return localBalances;
  }, [propBalances, localBalances, connectedBch, connectedEvm, userAddress]);

  useEffect(() => {
    if (!connectedBch && !connectedEvm && !userAddress) {
      setLocalBalances({ PUSD: 0, BCH: 0, USDT: 0, USDC: 0, POL: 0 });
      setPositions([]);
      setTradeHistory([]);
    }
  }, [connectedBch, connectedEvm, userAddress]);

  const hasOneClickBchSign = useMemo(() => {
    return (
      Boolean(connectedBch) &&
      hasActiveBchSigningCapability(wizardConnectManager, bchWalletSource)
    );
  }, [connectedBch, wizardConnectManager, bchWalletSource]);

  // Purge any old simulated localStorage keys on mount
  useEffect(() => {
    try {
      localStorage.removeItem('bliq_perp_positions_v1');
      localStorage.removeItem('bliq_perp_history_v1');
    } catch {}
  }, []);

  const copyToClipboard = (text: string, key: string) => {
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
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Fetch wallet balances directly from backend if needed
  const fetchWalletBalances = useCallback(async () => {
    const effectiveAddr = connectedBch || connectedEvm || userAddress;
    if (!effectiveAddr) return;
    try {
      const qs = new URLSearchParams({
        network: platformNetwork,
        ...(connectedBch ? { bchAddress: connectedBch } : {}),
        ...(connectedEvm ? { evmAddress: connectedEvm } : {})
      });
      const res = await fetch(
        `${backendUrl}/api/wallet/balances/${encodeURIComponent(effectiveAddr)}?${qs.toString()}`
      );
      const data = await res.json();
      if (data.success && data.balances) {
        setLocalBalances(prev => ({ ...prev, ...data.balances }));
      }
    } catch {}
  }, [backendUrl, connectedBch, connectedEvm, userAddress, platformNetwork]);

  // Fetch on-chain Perps overview + user positions
  const fetchPerpsData = useCallback(async () => {
    try {
      const ovRes = await fetch(`${backendUrl}/api/perps/overview?network=${platformNetwork}`);
      const ovData = await ovRes.json();
      if (ovData.success) {
        if (ovData.prices) {
          setMarketPrices(prev => ({
            ...prev,
            ...ovData.prices,
            BCHUSDT: ovData.prices.BCH || prev.BCHUSDT,
            BTCUSDT: ovData.prices.BTC || prev.BTCUSDT,
            ETHUSDT: ovData.prices.ETH || prev.ETHUSDT,
            SOLUSDT: ovData.prices.SOL || prev.SOLUSDT
          }));
        }
        if (ovData.vaults) {
          setVaultsInfo(ovData.vaults);
        }
        if (ovData.protocolStats) {
          setProtocolStats(ovData.protocolStats);
        }
        const mInfo = ovData.markets?.[selectedSymbol];
        if (mInfo?.fundingRatePct !== undefined) {
          setFundingRate(Number(mInfo.fundingRatePct));
        }
      }

      if (connectedBch || connectedEvm || userAddress) {
        const params = new URLSearchParams({
          userAddress: userAddress || '',
          bchAddress: connectedBch || '',
          evmAddress: connectedEvm || '',
          network: platformNetwork
        });
        const posRes = await fetch(`${backendUrl}/api/perps/positions?${params.toString()}`);
        const posData = await posRes.json();
        if (posData.success) {
          setPositions(Array.isArray(posData.positions) ? posData.positions : []);
          setTradeHistory(Array.isArray(posData.history) ? posData.history : []);
        }
      } else {
        setPositions([]);
        setTradeHistory([]);
      }
    } catch {}
  }, [backendUrl, platformNetwork, selectedSymbol, connectedBch, connectedEvm, userAddress]);

  useEffect(() => {
    fetchPerpsData();
    fetchWalletBalances();
    const interval = setInterval(() => {
      fetchPerpsData();
      fetchWalletBalances();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchPerpsData, fetchWalletBalances]);

  // Close market dropdown when clicking outside
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (marketDropdownRef.current && !marketDropdownRef.current.contains(e.target as Node)) {
        setMarketDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Update funding timer
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const nextFundingHour = (Math.floor(now.getUTCHours() / 8) + 1) * 8;
      const target = new Date(now);
      target.setUTCHours(nextFundingHour, 0, 0, 0);
      const diffMs = target.getTime() - now.getTime();
      const h = String(Math.floor(diffMs / 3600000)).padStart(2, '0');
      const m = String(Math.floor((diffMs % 3600000) / 60000)).padStart(2, '0');
      const s = String(Math.floor((diffMs % 60000) / 1000)).padStart(2, '0');
      setFundingCountdown(`${h}:${m}:${s}`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch 24h ticker data for selected symbol + keep all 4 symbols fresh
  useEffect(() => {
    let active = true;
    const fetchTicker = async () => {
      try {
        const res = await fetch(
          `https://data-api.binance.vision/api/v3/ticker/24hr?symbol=${selectedSymbol}`
        );
        if (!res.ok) throw new Error('Ticker fetch error');
        const data = await res.json();
        if (active) {
          const p = parseFloat(data.lastPrice);
          setPrevPrice(markPrice);
          setMarketPrices(prev => ({
            ...prev,
            [selectedSymbol]: p,
            [market.base]: p
          }));
          setPriceChange24h(parseFloat(data.priceChangePercent));
          setHigh24h(parseFloat(data.highPrice));
          setLow24h(parseFloat(data.lowPrice));
          setVolume24h(parseFloat(data.quoteVolume));
          if (!limitPriceRef.current || orderTypeRef.current === 'market') {
            setLimitPrice(p.toFixed(market.tickDecimals));
          }
        }
      } catch {}
    };

    fetchTicker();
    const interval = setInterval(fetchTicker, 4000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [selectedSymbol, market.base, market.tickDecimals]);

  // Setup Lightweight Charts (with live Dark/Light theme MutationObserver)
  useEffect(() => {
    if (!chartContainerRef.current) return;
    let isDisposed = false;

    const getThemeColors = () => {
      const dark = document.documentElement.classList.contains('dark');
      return {
        textColor: dark ? '#9ca3af' : '#64748b',
        gridColor: dark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)',
        borderColor: dark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'
      };
    };

    const { textColor, gridColor, borderColor } = getThemeColors();
    const container = chartContainerRef.current;
    const initialWidth = container.clientWidth || 600;
    const initialHeight = container.clientHeight || 380;

    const chart = createChart(container, {
      width: initialWidth,
      height: initialHeight,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor,
        fontFamily: 'inherit'
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor }
      },
      crosshair: {
        vertLine: { color: borderColor, width: 1, style: 2 },
        horzLine: { color: borderColor, width: 1, style: 2 }
      },
      timeScale: {
        borderColor,
        timeVisible: true,
        secondsVisible: false
      },
      rightPriceScale: {
        borderColor,
        scaleMargins: { top: 0.12, bottom: 0.12 }
      }
    });

    chartInstanceRef.current = chart;

    let series: ISeriesApi<any>;
    if (chartType === 'line') {
      series = chart.addLineSeries({
        color: '#F7931A',
        lineWidth: 2,
        priceLineVisible: true
      });
    } else {
      series = chart.addCandlestickSeries({
        upColor: '#22c55e',
        downColor: '#f43f5e',
        borderVisible: false,
        wickUpColor: '#22c55e',
        wickDownColor: '#f43f5e',
        priceLineVisible: true
      });
    }
    seriesInstanceRef.current = series;

    const loadKlines = async () => {
      try {
        const res = await fetch(
          `https://data-api.binance.vision/api/v3/klines?symbol=${selectedSymbol}&interval=${timeframe}&limit=150`
        );
        if (!res.ok) return;
        const raw = await res.json();
        if (isDisposed || !raw || !Array.isArray(raw)) return;

        const formatted = raw.map((d: any) => ({
          time: Math.floor(d[0] / 1000) as any,
          open: parseFloat(d[1]),
          high: parseFloat(d[2]),
          low: parseFloat(d[3]),
          close: parseFloat(d[4]),
          value: parseFloat(d[4])
        }));

        if (chartType === 'line') {
          series.setData(formatted.map((f: any) => ({ time: f.time, value: f.close })));
        } else {
          series.setData(formatted);
        }

        const lastBar = formatted[formatted.length - 1];
        if (lastBar) {
          setMarketPrices(prev => ({
            ...prev,
            [selectedSymbol]: lastBar.close,
            [market.base]: lastBar.close
          }));
        }
        chart.timeScale().fitContent();
      } catch {}
    };

    loadKlines();

    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(
        `wss://stream.binance.com:9443/ws/${selectedSymbol.toLowerCase()}@kline_${timeframe}`
      );
      ws.onmessage = event => {
        if (isDisposed) return;
        try {
          const msg = JSON.parse(event.data);
          const k = msg.k;
          if (!k) return;
          const closePrice = parseFloat(k.c);
          setMarketPrices(prev => ({
            ...prev,
            [selectedSymbol]: closePrice,
            [market.base]: closePrice
          }));

          const candle = {
            time: Math.floor(k.t / 1000) as any,
            open: parseFloat(k.o),
            high: parseFloat(k.h),
            low: parseFloat(k.l),
            close: closePrice,
            value: closePrice
          };

          if (chartType === 'line') {
            series.update({ time: candle.time, value: candle.close });
          } else {
            series.update(candle);
          }
        } catch {}
      };
    } catch {}

    const ro = new ResizeObserver(entries => {
      if (!isDisposed && chart && entries[0]) {
        const { width, height } = entries[0].contentRect;
        if (width > 0 && height > 0) {
          chart.applyOptions({ width, height });
        }
      }
    });
    ro.observe(container);


    const themeObserver = new MutationObserver(() => {
      if (isDisposed || !chartInstanceRef.current) return;
      const next = getThemeColors();
      chartInstanceRef.current.applyOptions({
        layout: {
          background: { type: ColorType.Solid, color: 'transparent' },
          textColor: next.textColor
        },
        grid: {
          vertLines: { color: next.gridColor },
          horzLines: { color: next.gridColor }
        },
        crosshair: {
          vertLine: { color: next.borderColor, width: 1, style: 2 },
          horzLine: { color: next.borderColor, width: 1, style: 2 }
        },
        timeScale: { borderColor: next.borderColor },
        rightPriceScale: { borderColor: next.borderColor }
      });
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => {
      isDisposed = true;
      themeObserver.disconnect();
      ro.disconnect();
      if (ws) ws.close();
      chart.remove();
      chartInstanceRef.current = null;
      seriesInstanceRef.current = null;
    };
  }, [selectedSymbol, timeframe, chartType, market.tickDecimals, market.initialPrice, market.base]);

  // Draw live Position lines (or Order Preview simulation lines when planning a trade)
  useEffect(() => {
    if (!seriesInstanceRef.current) return;
    const series = seriesInstanceRef.current;

    for (const ref of [entryLineRef, liqLineRef, tpLineRef, slLineRef]) {
      if (ref.current) {
        try {
          series.removePriceLine(ref.current);
        } catch {}
        ref.current = null;
      }
    }

    const currentPos = positions.find(p => p.symbol === selectedSymbol);
    if (currentPos) {
      entryLineRef.current = series.createPriceLine({
        price: currentPos.entryPrice,
        color: '#F7931A',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: `${currentPos.side.toUpperCase()} ${currentPos.leverage}x`
      });

      liqLineRef.current = series.createPriceLine({
        price: currentPos.liquidationPrice,
        color: '#ef4444',
        lineWidth: 1,
        lineStyle: 3,
        axisLabelVisible: true,
        title: 'LIQ'
      });

      if (currentPos.takeProfit && currentPos.takeProfit > 0) {
        tpLineRef.current = series.createPriceLine({
          price: currentPos.takeProfit,
          color: '#10b981',
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: 'TP'
        });
      }

      if (currentPos.stopLoss && currentPos.stopLoss > 0) {
        slLineRef.current = series.createPriceLine({
          price: currentPos.stopLoss,
          color: '#f59e0b',
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: 'SL'
        });
      }
      return;
    }

    // No active position on this symbol: render interactive order preview lines
    const marginVal = Math.max(0, parseFloat(marginInput) || 0);
    if (marginVal <= 0 || markPrice <= 0) return;

    const previewExec =
      orderType === 'limit' && parseFloat(limitPrice) > 0
        ? parseFloat(limitPrice)
        : markPrice;
    const previewLiq =
      side === 'long'
        ? Math.max(0.01, previewExec * (1 - 1 / leverage + market.mmr))
        : Math.max(0.01, previewExec * (1 + 1 / leverage - market.mmr));

    if (orderType === 'limit' && parseFloat(limitPrice) > 0) {
      entryLineRef.current = series.createPriceLine({
        price: previewExec,
        color: '#F7931A',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: `LIMIT ${side.toUpperCase()}`
      });
    }

    liqLineRef.current = series.createPriceLine({
      price: previewLiq,
      color: '#f43f5e',
      lineWidth: 1,
      lineStyle: 3,
      axisLabelVisible: true,
      title: `EST. LIQ (${leverage}x)`
    });

    const previewTp = parseFloat(takeProfitInput);
    if (previewTp > 0) {
      tpLineRef.current = series.createPriceLine({
        price: previewTp,
        color: '#10b981',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: 'EST. TP'
      });
    }

    const previewSl = parseFloat(stopLossInput);
    if (previewSl > 0) {
      slLineRef.current = series.createPriceLine({
        price: previewSl,
        color: '#f59e0b',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: 'EST. SL'
      });
    }
  }, [
    positions,
    selectedSymbol,
    timeframe,
    chartType,
    market.tickDecimals,
    market.mmr,
    marginInput,
    markPrice,
    orderType,
    limitPrice,
    side,
    leverage,
    takeProfitInput,
    stopLossInput
  ]);

  // Financial calculations for the order form
  const collateralUsdPrice = collateralToken === 'BCH' ? (marketPrices.BCH || 275.4) : 1.0;
  const parsedMarginToken = Math.max(0, parseFloat(marginInput) || 0);
  const parsedMarginUsd = parsedMarginToken * collateralUsdPrice;
  const executionPrice =
    orderType === 'market' ? markPrice : parseFloat(limitPrice) || markPrice;
  const positionSizeUsd = parsedMarginUsd * leverage;
  const positionSizeAsset = executionPrice > 0 ? positionSizeUsd / executionPrice : 0;
  const estimatedFeeUsd = positionSizeUsd * 0.0005;

  const calculatedLiqPrice = useMemo(() => {
    if (executionPrice <= 0 || leverage <= 0) return 0;
    const mmr = market.mmr;
    if (side === 'long') {
      const liq = executionPrice * (1 - 1 / leverage + mmr);
      return Math.max(0.01, liq);
    } else {
      const liq = executionPrice * (1 + 1 / leverage - mmr);
      return Math.max(0.01, liq);
    }
  }, [executionPrice, leverage, side, market.mmr]);

  const activeVaultDepositAddr = useMemo(() => {
    if (collateralToken === 'BCH') return vaultsInfo.bchVaultAddress;
    if (collateralToken === 'USDT') return vaultsInfo.usdtVaultAddress;
    return vaultsInfo.pusdVaultAddress;
  }, [collateralToken, vaultsInfo]);

  const manualDepositQr = useMemo(() => {
    if (!activeVaultDepositAddr) return '';
    return generateQrDataUrl(activeVaultDepositAddr, 5, 2);
  }, [activeVaultDepositAddr]);

  // 1-Click Testnet Faucet helper
  const handleClaimTestnetFaucet = async (tokenSym: 'PUSD' | 'USDT') => {
    const recipient = tokenSym === 'USDT' ? connectedEvm : connectedBch;
    if (!recipient) {
      onConnectWallet?.();
      return;
    }

    setFaucetClaiming(true);
    try {
      const claimAmt = tokenSym === 'USDT' ? 100 : 25;
      const res = await fetch(`${backendUrl}/api/faucet/testnet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: tokenSym,
          amount: claimAmt,
          recipient
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(
          isEs
            ? `💧 ¡Faucet envió ${claimAmt} ${tokenSym} on-chain a tu billetera!`
            : `💧 Faucet sent ${claimAmt} ${tokenSym} on-chain to your wallet!`,
          'success'
        );
        onRefreshBalances?.();
        setTimeout(() => fetchWalletBalances(), 2000);
      } else {
        showToast(data.error || 'Error solicitando tokens del Faucet', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error de red', 'error');
    } finally {
      setFaucetClaiming(false);
    }
  };

  // =========================================================================
  // OPEN PERPETUAL POSITION (100% On-Chain Margin Deposit + Backend Verification)
  // =========================================================================
  const handleOpenPosition = async () => {
    if (!isTestnet) {
      showToast(
        isEs
          ? 'Los mercados de Futuros Perpetuos en Mainnet aún no tienen liquidez. Cambia a Testnet (Chipnet / Amoy).'
          : 'Mainnet Perpetual Markets have no active liquidity yet. Switch to Testnet.',
        'error'
      );
      return;
    }

    if ((collateralToken === 'PUSD' || collateralToken === 'BCH') && !connectedBch) {
      onConnectWallet?.();
      return;
    }
    if (collateralToken === 'USDT' && !connectedEvm) {
      onConnectWallet?.();
      return;
    }

    if (parsedMarginToken <= 0 || parsedMarginUsd < market.minMarginUsd) {
      showToast(
        isEs
          ? `El margen mínimo para ${market.name} es $${market.minMarginUsd} USD`
          : `Minimum margin for ${market.name} is $${market.minMarginUsd} USD`,
        'error'
      );
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(
      isEs ? `Depositando margen ${collateralToken} on-chain...` : `Locking ${collateralToken} margin on-chain...`
    );

    try {
      let confirmedTxHash = manualTxHash.trim();

      if (collateralToken === 'USDT') {
        if (!confirmedTxHash) {
          const web3Res = await executeWeb3LpDeposit({
            isTestnet,
            vaultAddress: vaultsInfo.usdtVaultAddress,
            tokenAddress: vaultsInfo.usdtTokenAddress,
            amount: parsedMarginToken,
            decimals: 6,
            onStatus: msg => setStatusMessage(msg)
          });
          confirmedTxHash = web3Res.txHash;
        }
      } else {
        // PUSD CashToken or Native tBCH on BCH Chipnet
        if (!confirmedTxHash && hasOneClickBchSign) {
          const signed = await executeBchSwapDeposit({
            backendUrl,
            buildEndpoint: '/api/perps/build-bch-tx',
            senderAddress: connectedBch,
            isTestnet,
            wizardManager: wizardConnectManager,
            preferredSource: bchWalletSource,
            bodyPayload: {
              token: collateralToken,
              amount: parsedMarginToken,
              symbol: market.name,
              side: side.toUpperCase(),
              leverage,
              network: platformNetwork
            },
            onStatus: msg => setStatusMessage(msg)
          });
          confirmedTxHash = signed.txHash;
        } else if (!confirmedTxHash) {
          confirmedTxHash = 'AUTO_DETECT';
        }
      }

      setStatusMessage(
        isEs ? 'Verificando margen on-chain y abriendo posición...' : 'Verifying margin & opening position...'
      );

      const res = await fetch(`${backendUrl}/api/perps/open`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: userAddress || connectedBch || connectedEvm,
          bchAddress: connectedBch,
          evmAddress: connectedEvm,
          symbol: selectedSymbol,
          side,
          orderType,
          limitPrice: orderType === 'limit' ? parseFloat(limitPrice) : null,
          leverage,
          collateralToken,
          marginAmount: parsedMarginToken,
          takeProfit: parseFloat(takeProfitInput) > 0 ? parseFloat(takeProfitInput) : null,
          stopLoss: parseFloat(stopLossInput) > 0 ? parseFloat(stopLossInput) : null,
          txHash: confirmedTxHash,
          network: platformNetwork
        })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'No se pudo abrir la posición perpetua on-chain.');
      }

      showToast(data.message, 'success');
      setManualTxHash('');
      setTakeProfitInput('');
      setStopLossInput('');
      await fetchPerpsData();
      onRefreshBalances?.();
      fetchWalletBalances();
    } catch (err: any) {
      showToast(err.message || (isEs ? 'Error al abrir posición' : 'Error opening position'), 'error');
    } finally {
      setIsSubmitting(false);
      setStatusMessage('');
    }
  };

  const resolvePositionAuthChain = (pos: PerpPosition): AuthSessionChain =>
    (pos.collateralToken || 'PUSD').toUpperCase() === 'USDT' ? 'evm' : 'bch';

  // =========================================================================
  // CLOSE PERPETUAL POSITION (100% Real On-Chain Payout from Vault)
  // =========================================================================
  const handleClosePosition = async (pos: PerpPosition, reason = 'USER_CLOSE') => {
    const requiredChain = resolvePositionAuthChain(pos);
    let token = authToken || null;
    if (requiredChain === 'evm') {
      token = (await onEnsureAuthSession?.({ chains: ['evm'] })) || null;
      if (!token) return;
    }
    setClosingPosId(pos.id);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${backendUrl}/api/perps/close`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          positionId: pos.id,
          userAddress:
            requiredChain === 'bch'
              ? connectedBch || pos.bchAddress || userAddress
              : connectedEvm || pos.evmAddress || userAddress,
          bchAddress: connectedBch || pos.bchAddress || '',
          evmAddress: requiredChain === 'evm' ? connectedEvm || pos.evmAddress || '' : '',
          closeReason: reason
        })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Error al liquidar posición on-chain.');
      }

      const closed = data.closedPosition;
      const pnlSign = closed.pnlUsd >= 0 ? '+' : '';
      showToast(
        isEs
          ? `✅ ${closed.market} liquidado on-chain (${pnlSign}$${closed.pnlUsd.toFixed(2)}). Reembolsado: ${closed.payoutAmount} ${closed.collateralToken}`
          : `✅ ${closed.market} settled on-chain (${pnlSign}$${closed.pnlUsd.toFixed(2)}). Payout: ${closed.payoutAmount} ${closed.collateralToken}`,
        closed.pnlUsd >= 0 ? 'success' : 'error'
      );

      await fetchPerpsData();
      onRefreshBalances?.();
      fetchWalletBalances();
    } catch (err: any) {
      showToast(err.message || (isEs ? 'Error al cerrar posición' : 'Failed to close position'), 'error');
    } finally {
      setClosingPosId(null);
    }
  };

  // Update TP / SL on an open position
  const handleSaveTpSl = async () => {
    if (!editingTpSlPos) return;
    try {
      const requiredChain = resolvePositionAuthChain(editingTpSlPos);
      let token = authToken || null;
      if (requiredChain === 'evm') {
        token = (await onEnsureAuthSession?.({ chains: ['evm'] })) || null;
        if (!token) return;
      }
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${backendUrl}/api/perps/update-tpsl`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          positionId: editingTpSlPos.id,
          userAddress:
            requiredChain === 'bch'
              ? connectedBch || editingTpSlPos.bchAddress || userAddress
              : connectedEvm || editingTpSlPos.evmAddress || userAddress,
          bchAddress: connectedBch || editingTpSlPos.bchAddress || '',
          evmAddress: requiredChain === 'evm' ? connectedEvm || editingTpSlPos.evmAddress || '' : '',
          takeProfit: parseFloat(editTpVal) > 0 ? parseFloat(editTpVal) : null,
          stopLoss: parseFloat(editSlVal) > 0 ? parseFloat(editSlVal) : null
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      showToast(
        isEs ? 'Take Profit / Stop Loss actualizados' : 'Take Profit / Stop Loss updated',
        'success'
      );
      setEditingTpSlPos(null);
      await fetchPerpsData();
    } catch (err: any) {
      showToast(err.message || 'Error actualizando TP/SL', 'error');
    }
  };

  // Derived terminal & risk-reward preview metrics
  const activeMarketHasPosition = positions.some(p => p.symbol === selectedSymbol);
  const liqDistancePct =
    executionPrice > 0 && calculatedLiqPrice > 0
      ? ((calculatedLiqPrice - executionPrice) / executionPrice) * 100
      : 0;

  const parsedTp = parseFloat(takeProfitInput) || 0;
  const parsedSl = parseFloat(stopLossInput) || 0;
  const estTpPnlUsd =
    parsedTp > 0 && executionPrice > 0 && positionSizeAsset > 0
      ? side === 'long'
        ? positionSizeAsset * (parsedTp - executionPrice)
        : positionSizeAsset * (executionPrice - parsedTp)
      : null;
  const estSlPnlUsd =
    parsedSl > 0 && executionPrice > 0 && positionSizeAsset > 0
      ? side === 'long'
        ? positionSizeAsset * (parsedSl - executionPrice)
        : positionSizeAsset * (executionPrice - parsedSl)
      : null;
  const riskRewardRatio =
    estTpPnlUsd !== null &&
    estSlPnlUsd !== null &&
    estTpPnlUsd > 0 &&
    estSlPnlUsd < 0
      ? estTpPnlUsd / Math.abs(estSlPnlUsd)
      : null;

  const totalOpenInterest =
    (protocolStats.totalLongOiUsd || 0) + (protocolStats.totalShortOiUsd || 0);
  const longOiPercent =
    totalOpenInterest > 0
      ? ((protocolStats.totalLongOiUsd || 0) / totalOpenInterest) * 100
      : 50;

  const totalAccountUpnl = positions.reduce((sum, pos) => {
    const curPrice =
      marketPrices[pos.symbol] ||
      (pos.base ? marketPrices[pos.base] : 0) ||
      pos.markPrice ||
      pos.entryPrice;
    const delta = pos.side === 'long' ? curPrice - pos.entryPrice : pos.entryPrice - curPrice;
    return sum + pos.sizeAsset * delta;
  }, 0);

  const formattedVolume24h =
    volume24h >= 1_000_000
      ? `$${(volume24h / 1_000_000).toFixed(2)}M`
      : `$${Math.round(volume24h / 1000).toLocaleString('en-US')}k`;

  const formattedVaultUsd = `$${vaultsInfo.totalLiquidityUsd.toLocaleString('en-US', {
    maximumFractionDigits: 0
  })}`;

  const needsWalletForCollateral =
    ((collateralToken === 'PUSD' || collateralToken === 'BCH') && !connectedBch) ||
    (collateralToken === 'USDT' && !connectedEvm);

  return (
    <div className="w-full max-w-[1360px] mx-auto px-3 sm:px-5 pt-3 sm:pt-5 pb-24 lg:pb-12 space-y-4">
      {/* MAINNET HONESTY NOTICE */}
      {!isTestnet && (
        <div className="ui-panel px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-2.5 text-xs text-ink-2">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5 sm:mt-0" />
            <span>
              <strong className="text-ink">
                {isEs ? 'Mainnet sin liquidez:' : 'No Mainnet Liquidity:'}
              </strong>{' '}
              {isEs
                ? 'Las bóvedas de perpetuos operan con liquidez real en Testnet (BCH Chipnet y Polygon Amoy).'
                : 'Perpetual vaults are funded and active on Testnet (BCH Chipnet & Polygon Amoy).'}
            </span>
          </div>
          {onToggleNetwork && (
            <button
              type="button"
              onClick={() => onToggleNetwork('testnet')}
              className="ui-btn-sm ui-btn-primary shrink-0 self-start sm:self-auto"
            >
              {isEs ? 'Cambiar a Testnet' : 'Switch to Testnet'}
            </button>
          )}
        </div>
      )}

      {/* 1. TOP MARKET STRIP */}
      <div className="ui-card px-4 py-3.5 flex flex-col xl:flex-row xl:items-center justify-between gap-3.5 overflow-visible">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 justify-between xl:justify-start">
          {/* Market Pair Selector */}
          <div className="relative" ref={marketDropdownRef}>
            <button
              type="button"
              onClick={() => setMarketDropdownOpen(!marketDropdownOpen)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-control bg-surface-2 hover:bg-surface-3 border border-line text-ink transition-colors cursor-pointer"
            >
              <img src={market.icon} alt={market.base} className="w-5 h-5 rounded-full object-contain" />
              <div className="text-left leading-none">
                <span className="font-semibold text-sm block">{market.name}</span>
                <span className="text-[11px] text-ink-3">{market.maxLeverage}x</span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-ink-3 transition-transform ${
                  marketDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {marketDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-64 bg-surface border border-line rounded-panel shadow-soft p-1.5 z-50">
                <div className="text-xs font-medium text-ink-3 px-2.5 py-1.5">
                  {isEs ? 'Mercados perpetuos' : 'Perpetual markets'}
                </div>
                {MARKETS.map(m => {
                  const mPrice = marketPrices[m.symbol] || m.initialPrice;
                  return (
                    <button
                      key={m.symbol}
                      type="button"
                      onClick={() => {
                        setSelectedSymbol(m.symbol);
                        if (leverage > m.maxLeverage) setLeverage(m.maxLeverage);
                        setMarketDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-control text-xs transition-colors cursor-pointer ${
                        selectedSymbol === m.symbol
                          ? 'bg-surface-2 text-ink font-semibold'
                          : 'hover:bg-surface-2/70 text-ink-2'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <img src={m.icon} alt={m.base} className="w-4 h-4 rounded-full object-contain" />
                        <span className="font-medium">{m.name}</span>
                        <span className="text-[11px] text-ink-3">{m.maxLeverage}x</span>
                      </div>
                      <span className="text-xs font-mono tabular-nums text-ink">
                        ${mPrice.toLocaleString('en-US', {
                          minimumFractionDigits: m.tickDecimals,
                          maximumFractionDigits: m.tickDecimals
                        })}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Live Mark Price + 24h Change */}
          <div className="flex items-baseline gap-2.5">
            <span className="text-xl sm:text-2xl font-semibold font-mono tabular-nums text-ink">
              ${markPrice.toLocaleString('en-US', {
                minimumFractionDigits: market.tickDecimals,
                maximumFractionDigits: market.tickDecimals
              })}
            </span>
            <span
              className={
                priceChange24h >= 0 ? 'ui-badge-success tabular-nums' : 'ui-badge-danger tabular-nums'
              }
            >
              {priceChange24h >= 0 ? '+' : ''}
              {priceChange24h.toFixed(2)}%
            </span>
          </div>

          {/* Vault Liquidity Pill */}
          <div className="hidden md:inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-2 border border-line text-xs text-ink-2 tabular-nums">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isTestnet ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
            />
            <span>
              {isTestnet
                ? `${isEs ? 'Liquidez Vault:' : 'Vault Backing:'} ${formattedVaultUsd}`
                : isEs
                ? 'Sin liquidez Mainnet'
                : 'No Mainnet liquidity'}
            </span>
          </div>
        </div>

        {/* Right: Market Telemetry Strip + OI Skew Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:flex xl:items-center gap-3 sm:gap-5 text-xs border-t xl:border-t-0 border-line pt-3 xl:pt-0">
          <div>
            <div className="ui-label">{isEs ? 'Rango 24h' : '24h Range'}</div>
            <div className="font-mono font-medium text-ink tabular-nums mt-0.5">
              ${low24h.toFixed(market.tickDecimals)} – ${high24h.toFixed(market.tickDecimals)}
            </div>
          </div>

          <div>
            <div className="ui-label">{isEs ? 'Volumen 24h' : '24h Volume'}</div>
            <div className="font-mono font-medium text-ink tabular-nums mt-0.5">
              {formattedVolume24h}
            </div>
          </div>

          <div className="space-y-1">
            <div className="ui-label">Open Interest (L/S)</div>
            <div className="font-mono font-medium tabular-nums flex items-center gap-1.5">
              <span className="text-emerald-600 dark:text-emerald-400">
                ${Math.round(protocolStats.totalLongOiUsd).toLocaleString('en-US')}
              </span>
              <span className="text-ink-3">/</span>
              <span className="text-rose-600 dark:text-rose-400">
                ${Math.round(protocolStats.totalShortOiUsd).toLocaleString('en-US')}
              </span>
            </div>
            <div className="h-1 w-24 rounded-full bg-rose-500/70 overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${longOiPercent}%` }}
              />
            </div>
          </div>

          <div>
            <div className="ui-label">Funding / 8h</div>
            <div className="font-mono font-medium tabular-nums mt-0.5 flex items-center gap-1.5">
              <span className="text-emerald-600 dark:text-emerald-400">
                {fundingRate >= 0 ? '+' : ''}
                {fundingRate.toFixed(4)}%
              </span>
              <span className="text-ink-3">{fundingCountdown}</span>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE SEGMENTED TABS (< 1024px) */}
      <div className="lg:hidden ui-segment grid grid-cols-3 w-full">
        <button
          type="button"
          onClick={() => setMobileTab('chart')}
          className={`ui-segment-item whitespace-nowrap ${
            mobileTab === 'chart' ? 'ui-segment-item-active' : ''
          }`}
        >
          {isEs ? 'Gráfico' : 'Chart'}
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('trade')}
          className={`ui-segment-item whitespace-nowrap ${
            mobileTab === 'trade' ? 'ui-segment-item-active' : ''
          }`}
        >
          {isEs ? 'Operar' : 'Trade'}
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('positions')}
          className={`ui-segment-item whitespace-nowrap inline-flex items-center justify-center gap-1.5 ${
            mobileTab === 'positions' ? 'ui-segment-item-active' : ''
          }`}
        >
          <span>{isEs ? 'Posiciones' : 'Positions'}</span>
          {positions.length > 0 && (
            <span className="text-[11px] font-semibold text-primary tabular-nums">
              ({positions.length})
            </span>
          )}
        </button>
      </div>

      {/* 2. MAIN TRADING WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT COLUMN: Chart + Positions */}
        <div
          className={`lg:col-span-8 flex flex-col gap-4 ${
            mobileTab !== 'chart' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Chart Card */}
          <div className="ui-card p-3.5 sm:p-4 flex flex-col h-[430px] sm:h-[510px]">
            {/* Chart Toolbar */}
            <div className="flex flex-wrap items-center justify-between pb-3 border-b border-line gap-2">
              <div className="inline-flex items-center gap-1 p-0.5 rounded-panel bg-surface-2 border border-line">
                {TIMEFRAMES.map(tf => (
                  <button
                    key={tf.value}
                    type="button"
                    onClick={() => setTimeframe(tf.value)}
                    className={`px-2.5 py-1 rounded-control text-xs font-medium transition-colors cursor-pointer ${
                      timeframe === tf.value
                        ? 'bg-surface text-ink font-semibold shadow-2xs'
                        : 'text-ink-3 hover:text-ink'
                    }`}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setChartType(chartType === 'candles' ? 'line' : 'candles')}
                  className="ui-btn-sm ui-btn-secondary"
                >
                  {chartType === 'candles'
                    ? isEs
                      ? 'Velas'
                      : 'Candles'
                    : isEs
                    ? 'Línea'
                    : 'Line'}
                </button>
              </div>
            </div>

            {/* Chart Viewport */}
            <div className="flex-1 w-full min-h-[340px] relative mt-2">
              <div ref={chartContainerRef} className="absolute inset-0 w-full h-full" />
            </div>

            {/* Chart Status & Simulation Legend */}
            <div className="pt-2.5 border-t border-line flex flex-wrap items-center justify-between gap-2 text-xs text-ink-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  <span>{isEs ? 'Entrada' : 'Entry'}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>TP</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>SL</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>{isEs ? 'Liquidación' : 'Liquidation'}</span>
                </span>
              </div>
              <span className="font-mono text-[11px] text-ink-3">
                {activeMarketHasPosition
                  ? isEs
                    ? 'Niveles de posición activa'
                    : 'Active position lines'
                  : isEs
                  ? 'Simulación de orden en vivo'
                  : 'Live order preview'}
              </span>
            </div>
          </div>

          {/* Desktop Positions & History */}
          <div className="hidden lg:block">{renderPositionsCard()}</div>
        </div>

        {/* RIGHT COLUMN: On-Chain Order Console */}
        <div
          className={`lg:col-span-4 flex flex-col gap-4 ${
            mobileTab !== 'trade' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          <div className="ui-card p-4 space-y-3.5">
            {/* Long / Short Segment */}
            <div className="grid grid-cols-2 p-1 bg-surface-2 rounded-panel border border-line text-xs font-semibold gap-1">
              <button
                type="button"
                onClick={() => setSide('long')}
                className={`py-2 rounded-control transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                  side === 'long'
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                    : 'text-ink-3 hover:text-ink border border-transparent'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Long</span>
              </button>
              <button
                type="button"
                onClick={() => setSide('short')}
                className={`py-2 rounded-control transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                  side === 'short'
                    ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                    : 'text-ink-3 hover:text-ink border border-transparent'
                }`}
              >
                <TrendingDown className="w-3.5 h-3.5" />
                <span>Short</span>
              </button>
            </div>

            {/* Order Type (Market / Limit) */}
            <div className="flex items-center justify-between text-xs">
              <span className="ui-label">{isEs ? 'Tipo de orden' : 'Order type'}</span>
              <div className="inline-flex items-center p-0.5 bg-surface-2 rounded-control border border-line">
                <button
                  type="button"
                  onClick={() => setOrderType('market')}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                    orderType === 'market'
                      ? 'bg-surface text-ink font-semibold shadow-2xs'
                      : 'text-ink-3 hover:text-ink'
                  }`}
                >
                  {isEs ? 'Mercado' : 'Market'}
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType('limit')}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                    orderType === 'limit'
                      ? 'bg-surface text-ink font-semibold shadow-2xs'
                      : 'text-ink-3 hover:text-ink'
                  }`}
                >
                  {isEs ? 'Límite' : 'Limit'}
                </button>
              </div>
            </div>

            {/* Limit Price Input */}
            {orderType === 'limit' && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="ui-label">{isEs ? 'Precio límite (USD)' : 'Limit price (USD)'}</span>
                  <button
                    type="button"
                    onClick={() => setLimitPrice(markPrice.toFixed(market.tickDecimals))}
                    className="text-xs font-medium text-primary hover:underline cursor-pointer"
                  >
                    {isEs ? 'Usar Mark' : 'Use Mark'}
                  </button>
                </div>
                <input
                  type="number"
                  step="any"
                  value={limitPrice}
                  onChange={e => setLimitPrice(e.target.value)}
                  className="ui-input font-mono tabular-nums"
                  placeholder={markPrice.toFixed(market.tickDecimals)}
                />
              </div>
            )}

            {/* Collateral Asset Selector */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="ui-label">
                  {isEs ? 'Colateral en cadena' : 'On-chain collateral'}
                </span>
                <span className="text-xs font-mono text-ink-3">
                  {collateralToken === 'USDT' ? 'Polygon Amoy' : 'BCH Chipnet'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(['PUSD', 'USDT', 'BCH'] as const).map(tok => (
                  <button
                    key={tok}
                    type="button"
                    onClick={() => {
                      setCollateralToken(tok);
                      setMarginInput(tok === 'BCH' ? '0.02' : '10');
                    }}
                    className={`py-2 px-2 rounded-control border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                      collateralToken === tok
                        ? 'bg-surface border-primary text-ink'
                        : 'bg-surface-2 border-line text-ink-3 hover:text-ink hover:border-line-strong'
                    }`}
                  >
                    <img src={`/${tok}.png`} alt={tok} className="w-4 h-4 rounded-full object-contain" />
                    <span>{tok}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Unified Margin Panel */}
            <div className="ui-panel p-3.5 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
                <span className="ui-label">
                  {isEs ? `Margen (${collateralToken})` : `Margin (${collateralToken})`}
                </span>
                <div className="flex items-center gap-2 font-mono tabular-nums text-ink-3">
                  <span>
                    {formatCryptoBalance(walletBalances?.[collateralToken] || 0)} {collateralToken}
                  </span>
                  {isTestnet && (collateralToken === 'PUSD' || collateralToken === 'USDT') && (
                    <button
                      type="button"
                      onClick={() => handleClaimTestnetFaucet(collateralToken)}
                      disabled={faucetClaiming}
                      className="font-sans text-xs font-medium text-primary hover:underline cursor-pointer disabled:opacity-50"
                    >
                      {faucetClaiming ? '...' : 'Faucet'}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="any"
                  min="0.001"
                  value={marginInput}
                  onChange={e => setMarginInput(e.target.value)}
                  className="w-full min-w-0 bg-transparent text-2xl font-semibold font-mono tabular-nums text-ink outline-none placeholder:text-ink-3"
                  placeholder={collateralToken === 'BCH' ? '0.02' : '10'}
                />
                <span className="text-xs font-semibold text-ink-2 px-2.5 py-1 rounded-full bg-surface border border-line shrink-0">
                  {collateralToken}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                <span className="text-xs font-mono text-ink-3 tabular-nums">
                  ≈ ${parsedMarginUsd.toFixed(2)} USD
                </span>
                <div className="flex items-center gap-1">
                  {[25, 50, 75, 100].map(pct => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => {
                        const rawBal = walletBalances?.[collateralToken] || 0;
                        if (rawBal <= 0) {
                          setMarginInput(collateralToken === 'BCH' ? '0.02' : '10');
                          return;
                        }
                        const usable =
                          collateralToken === 'BCH' ? Math.max(0, rawBal - 0.0002) : rawBal;
                        const val =
                          collateralToken === 'BCH'
                            ? (usable * (pct / 100)).toFixed(4)
                            : (usable * (pct / 100)).toFixed(2);
                        setMarginInput(val);
                      }}
                      className="px-2 py-0.5 rounded-full bg-surface border border-line hover:border-line-strong text-[11px] font-medium text-ink-2 hover:text-ink transition-colors cursor-pointer tabular-nums"
                    >
                      {pct === 100 ? 'MAX' : `${pct}%`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Leverage Control */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="ui-label">{isEs ? 'Apalancamiento' : 'Leverage'}</span>
                  <span
                    className={
                      leverage <= 5
                        ? 'ui-badge-success'
                        : leverage <= 20
                        ? 'ui-badge-warn'
                        : 'ui-badge-danger'
                    }
                  >
                    {leverage <= 5
                      ? isEs
                        ? 'Bajo'
                        : 'Low'
                      : leverage <= 20
                      ? isEs
                        ? 'Medio'
                        : 'Moderate'
                      : isEs
                      ? 'Alto'
                      : 'High'}
                  </span>
                </div>
                <span className="font-semibold text-ink text-sm font-mono tabular-nums">
                  {leverage}x
                </span>
              </div>

              <input
                type="range"
                min="1"
                max={market.maxLeverage}
                step="1"
                value={leverage}
                onChange={e => setLeverage(parseInt(e.target.value))}
                className="w-full accent-primary h-1.5 bg-surface-2 rounded-lg cursor-pointer"
              />

              <div className="flex items-center justify-between gap-1.5">
                {LEVERAGE_PRESETS.filter(p => p <= market.maxLeverage).map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setLeverage(preset)}
                    className={`flex-1 py-1 rounded-full text-xs font-mono font-medium transition-colors cursor-pointer border tabular-nums ${
                      leverage === preset
                        ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 border-transparent font-semibold'
                        : 'bg-surface-2 text-ink-3 hover:text-ink border-line'
                    }`}
                  >
                    {preset}x
                  </button>
                ))}
              </div>
            </div>

            {/* Take Profit / Stop Loss with Quick % Presets & R:R Preview */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowTpSlInputs(!showTpSlInputs)}
                className="w-full flex items-center justify-between text-xs text-ink-2 hover:text-ink font-medium cursor-pointer py-0.5"
              >
                <span className="flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-primary" />
                  <span>Take Profit / Stop Loss</span>
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${showTpSlInputs ? 'rotate-180' : ''}`}
                />
              </button>

              {showTpSlInputs && (
                <div className="ui-panel p-3 space-y-2.5 text-xs">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                          Take Profit
                        </label>
                        <div className="flex items-center gap-1">
                          {[0.05, 0.15].map(pct => (
                            <button
                              key={pct}
                              type="button"
                              onClick={() => {
                                const target =
                                  side === 'long'
                                    ? executionPrice * (1 + pct)
                                    : executionPrice * (1 - pct);
                                setTakeProfitInput(target.toFixed(market.tickDecimals));
                              }}
                              className="text-[10px] font-mono text-ink-3 hover:text-emerald-500 cursor-pointer"
                            >
                              {side === 'long' ? '+' : '-'}{pct * 100}%
                            </button>
                          ))}
                        </div>
                      </div>
                      <input
                        type="number"
                        step="any"
                        value={takeProfitInput}
                        onChange={e => setTakeProfitInput(e.target.value)}
                        placeholder={
                          side === 'long'
                            ? (executionPrice * 1.05).toFixed(market.tickDecimals)
                            : (executionPrice * 0.95).toFixed(market.tickDecimals)
                        }
                        className="w-full px-2.5 py-1.5 rounded-control bg-surface border border-line focus:border-primary text-xs font-mono tabular-nums text-ink outline-none transition-colors"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                          Stop Loss
                        </label>
                        <div className="flex items-center gap-1">
                          {[0.02, 0.05].map(pct => (
                            <button
                              key={pct}
                              type="button"
                              onClick={() => {
                                const target =
                                  side === 'long'
                                    ? executionPrice * (1 - pct)
                                    : executionPrice * (1 + pct);
                                setStopLossInput(target.toFixed(market.tickDecimals));
                              }}
                              className="text-[10px] font-mono text-ink-3 hover:text-amber-500 cursor-pointer"
                            >
                              {side === 'long' ? '-' : '+'}{pct * 100}%
                            </button>
                          ))}
                        </div>
                      </div>
                      <input
                        type="number"
                        step="any"
                        value={stopLossInput}
                        onChange={e => setStopLossInput(e.target.value)}
                        placeholder={
                          side === 'long'
                            ? (executionPrice * 0.97).toFixed(market.tickDecimals)
                            : (executionPrice * 1.03).toFixed(market.tickDecimals)
                        }
                        className="w-full px-2.5 py-1.5 rounded-control bg-surface border border-line focus:border-primary text-xs font-mono tabular-nums text-ink outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {(estTpPnlUsd !== null || estSlPnlUsd !== null) && (
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-line font-mono text-[11px] tabular-nums">
                      {estTpPnlUsd !== null && (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          TP: {estTpPnlUsd >= 0 ? '+' : ''}${estTpPnlUsd.toFixed(2)}
                        </span>
                      )}
                      {estSlPnlUsd !== null && (
                        <span className="text-rose-600 dark:text-rose-400">
                          SL: ${estSlPnlUsd.toFixed(2)}
                        </span>
                      )}
                      {riskRewardRatio !== null && (
                        <span className="text-ink-2">R:R 1:{riskRewardRatio.toFixed(2)}</span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 1-Click Signing Status / Manual Vault Deposit */}
            {(collateralToken === 'PUSD' || collateralToken === 'BCH') && isTestnet && (
              <div className="space-y-2">
                {hasOneClickBchSign ? (
                  <div className="ui-panel px-3 py-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    {isEs
                      ? `Firma directa 1-clic lista (${collateralToken})`
                      : `1-click signing ready (${collateralToken})`}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowManualQrDeposit(!showManualQrDeposit)}
                    className="w-full text-left text-xs text-primary hover:underline font-medium cursor-pointer"
                  >
                    {showManualQrDeposit
                      ? isEs
                        ? 'Ocultar depósito manual (QR / TXID)'
                        : 'Hide manual deposit (QR / TXID)'
                      : isEs
                      ? `Transferencia manual ${collateralToken} (QR / TXID)`
                      : `Manual ${collateralToken} deposit (QR / TXID)`}
                  </button>
                )}

                {showManualQrDeposit && (
                  <div className="ui-panel p-3 space-y-2 text-xs">
                    {manualDepositQr && (
                      <div className="w-24 h-24 mx-auto bg-white p-1.5 rounded-control border border-line">
                        <img src={manualDepositQr} alt="Vault QR" className="w-full h-full object-contain" />
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2 bg-surface px-2.5 py-1.5 rounded-control border border-line">
                      <span className="font-mono text-[11px] text-ink truncate">
                        {activeVaultDepositAddr}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(activeVaultDepositAddr, 'perpVault')}
                        className="ui-btn-sm ui-btn-secondary py-0.5 px-2 text-[11px] shrink-0"
                      >
                        {copiedKey === 'perpVault' ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>{copiedKey === 'perpVault' ? 'OK' : isEs ? 'Copiar' : 'Copy'}</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      value={manualTxHash}
                      onChange={e => setManualTxHash(e.target.value)}
                      placeholder={
                        isEs
                          ? 'TXID opcional (autodetección UTXO si queda vacío)'
                          : 'Optional TXID (blank for UTXO auto-detect)'
                      }
                      className="ui-input py-1.5 px-2.5 text-xs font-mono"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Order Metrics Summary */}
            <div className="ui-panel px-3.5 py-3 space-y-2 text-xs">
              <div className="ui-row">
                <span className="text-ink-muted">{isEs ? 'Tamaño de posición' : 'Position size'}</span>
                <span className="font-mono font-semibold text-ink tabular-nums">
                  ${positionSizeUsd.toFixed(2)} ({positionSizeAsset.toFixed(market.assetDecimals)}{' '}
                  {market.base})
                </span>
              </div>
              <div className="ui-row">
                <span className="text-ink-muted">{isEs ? 'Precio de entrada' : 'Entry price'}</span>
                <span className="font-mono font-medium text-ink tabular-nums">
                  ${executionPrice.toFixed(market.tickDecimals)}
                </span>
              </div>
              <div className="ui-row">
                <span className="text-ink-muted">
                  {isEs ? 'Liquidación est.' : 'Est. liquidation'}
                </span>
                <span className="font-mono font-semibold text-rose-600 dark:text-rose-400 tabular-nums">
                  ${calculatedLiqPrice.toFixed(market.tickDecimals)} (
                  {liqDistancePct >= 0 ? '+' : ''}
                  {liqDistancePct.toFixed(1)}%)
                </span>
              </div>
              <div className="ui-row">
                <span className="text-ink-muted">
                  {isEs ? 'Comisión (0.05%)' : 'Protocol fee (0.05%)'}
                </span>
                <span className="font-mono text-ink-2 tabular-nums">
                  ${estimatedFeeUsd.toFixed(3)} USD
                </span>
              </div>
            </div>

            {/* Single Primary CTA */}
            {needsWalletForCollateral ? (
              <button
                type="button"
                onClick={onConnectWallet}
                className="ui-btn-primary w-full py-3"
              >
                {collateralToken === 'USDT'
                  ? isEs
                    ? 'Conectar Billetera EVM (Amoy)'
                    : 'Connect EVM Wallet (Amoy)'
                  : isEs
                  ? 'Conectar Billetera BCH'
                  : 'Connect BCH Wallet'}
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting || !isTestnet || parsedMarginToken <= 0}
                onClick={handleOpenPosition}
                className={`w-full h-11 rounded-full font-semibold text-sm transition-colors cursor-pointer flex items-center justify-center gap-2 ${
                  isSubmitting || !isTestnet || parsedMarginToken <= 0
                    ? 'ui-btn-disabled'
                    : side === 'long'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-rose-600 hover:bg-rose-700 text-white'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span className="text-xs">
                      {statusMessage || (isEs ? 'Ejecutando en cadena...' : 'Executing on-chain...')}
                    </span>
                  </>
                ) : (
                  <>
                    <span>
                      {isEs
                        ? `Abrir ${side.toUpperCase()} ${market.base} (${leverage}x)`
                        : `Open ${side.toUpperCase()} ${market.base} (${leverage}x)`}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            )}

            <div className="text-[11px] text-ink-3 text-center flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>
                {collateralToken === 'USDT'
                  ? 'BinaryLiquidVault.sol (Polygon Amoy)'
                  : 'BinaryLiquidVault.cash (BCH Chipnet P2SH32)'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. MOBILE POSITIONS VIEW */}
      <div className={`lg:hidden ${mobileTab !== 'positions' ? 'hidden' : 'block'}`}>
        {renderPositionsCard()}
      </div>

      {/* TP / SL EDIT MODAL */}
      {editingTpSlPos && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="ui-card max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="ui-section-title">
                TP / SL · {editingTpSlPos.market} ({editingTpSlPos.side.toUpperCase()}{' '}
                {editingTpSlPos.leverage}x)
              </h3>
              <button
                type="button"
                onClick={() => setEditingTpSlPos(null)}
                className="text-xs text-ink-3 hover:text-ink cursor-pointer"
              >
                {isEs ? 'Cerrar' : 'Close'}
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between text-ink-3 font-mono tabular-nums">
                <span>Entry: ${editingTpSlPos.entryPrice}</span>
                <span>Liq: ${editingTpSlPos.liquidationPrice}</span>
              </div>
              <div>
                <label className="block font-medium text-emerald-600 dark:text-emerald-400 mb-1">
                  Take Profit (USD)
                </label>
                <input
                  type="number"
                  step="any"
                  value={editTpVal}
                  onChange={e => setEditTpVal(e.target.value)}
                  placeholder={isEs ? 'Sin límite' : 'No limit'}
                  className="ui-input font-mono text-xs tabular-nums"
                />
              </div>
              <div>
                <label className="block font-medium text-amber-600 dark:text-amber-400 mb-1">
                  Stop Loss (USD)
                </label>
                <input
                  type="number"
                  step="any"
                  value={editSlVal}
                  onChange={e => setEditSlVal(e.target.value)}
                  placeholder={isEs ? 'Sin límite' : 'No limit'}
                  className="ui-input font-mono text-xs tabular-nums"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingTpSlPos(null)}
                className="ui-btn-secondary ui-btn-sm flex-1"
              >
                {isEs ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleSaveTpSl}
                className="ui-btn-primary ui-btn-sm flex-1"
              >
                {isEs ? 'Guardar TP/SL' : 'Save TP/SL'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Helper function to render Positions & History Card cleanly
  function renderPositionsCard() {
    return (
      <div className="ui-card p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="ui-segment inline-grid grid-cols-2">
            <button
              type="button"
              onClick={() => setPositionsTab('positions')}
              className={`ui-segment-item whitespace-nowrap text-xs ${
                positionsTab === 'positions' ? 'ui-segment-item-active' : ''
              }`}
            >
              {isEs ? `Posiciones (${positions.length})` : `Positions (${positions.length})`}
            </button>
            <button
              type="button"
              onClick={() => setPositionsTab('history')}
              className={`ui-segment-item whitespace-nowrap text-xs ${
                positionsTab === 'history' ? 'ui-segment-item-active' : ''
              }`}
            >
              {isEs ? `Historial (${tradeHistory.length})` : `History (${tradeHistory.length})`}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {positions.length > 0 && (
              <span
                className={
                  totalAccountUpnl >= 0
                    ? 'ui-badge-success tabular-nums font-mono'
                    : 'ui-badge-danger tabular-nums font-mono'
                }
              >
                uPnL: {totalAccountUpnl >= 0 ? '+' : ''}${totalAccountUpnl.toFixed(2)}
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                fetchPerpsData();
                onRefreshBalances?.();
              }}
              className="ui-btn-sm ui-btn-secondary px-2.5"
              title={isEs ? 'Sincronizar posiciones' : 'Sync positions'}
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {positionsTab === 'positions' ? (
          positions.length === 0 ? (
            <div className="py-8 text-center space-y-3">
              <p className="text-xs text-ink-3">
                {isEs
                  ? 'No tienes posiciones perpetuas abiertas en este momento.'
                  : 'You have no open on-chain perpetual positions right now.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSide('long');
                  setLeverage(10);
                  setMobileTab('trade');
                }}
                className="ui-btn-secondary ui-btn-sm"
              >
                {isEs ? 'Abrir posición Long / Short' : 'Open Long / Short position'}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-line text-ink-3">
                      <th className="pb-2.5 font-medium">{isEs ? 'Mercado' : 'Market'}</th>
                      <th className="pb-2.5 font-medium">{isEs ? 'Tamaño' : 'Size'}</th>
                      <th className="pb-2.5 font-medium">{isEs ? 'Entrada / Mark' : 'Entry / Mark'}</th>
                      <th className="pb-2.5 font-medium">Liq / TP / SL</th>
                      <th className="pb-2.5 font-medium">{isEs ? 'Margen' : 'Margin'}</th>
                      <th className="pb-2.5 font-medium">uPnL</th>
                      <th className="pb-2.5 font-medium text-right">{isEs ? 'Acción' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {positions.map(pos => {
                      const posMkt = MARKETS.find(m => m.symbol === pos.symbol) || MARKETS[0];
                      const currentPrice =
                        marketPrices[pos.symbol] ||
                        (pos.base ? marketPrices[pos.base] : 0) ||
                        pos.markPrice ||
                        pos.entryPrice;
                      const priceDelta =
                        pos.side === 'long'
                          ? currentPrice - pos.entryPrice
                          : pos.entryPrice - currentPrice;
                      const uPnl = pos.sizeAsset * priceDelta;
                      const baseMarginUsd = pos.marginUsd || pos.margin || 1;
                      const uPnlPct = (uPnl / baseMarginUsd) * 100;
                      const isProfit = uPnl >= 0;
                      const colTok = pos.collateralToken || 'PUSD';

                      return (
                        <tr key={pos.id} className="hover:bg-surface-2/40 transition-colors">
                          <td className="py-3">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-ink">{pos.market}</span>
                              <span
                                className={
                                  pos.side === 'long' ? 'ui-badge-success' : 'ui-badge-danger'
                                }
                              >
                                {pos.side.toUpperCase()} {pos.leverage}x
                              </span>
                            </div>
                          </td>
                          <td className="py-3 font-mono font-medium text-ink tabular-nums">
                            ${pos.sizeUsd.toFixed(2)}
                            <span className="block text-[11px] text-ink-3">
                              {pos.sizeAsset} {posMkt.base}
                            </span>
                          </td>
                          <td className="py-3 font-mono text-ink tabular-nums">
                            ${pos.entryPrice.toFixed(posMkt.tickDecimals)}
                            <span className="block text-[11px] text-ink-2">
                              ${currentPrice.toFixed(posMkt.tickDecimals)}
                            </span>
                          </td>
                          <td className="py-3 font-mono tabular-nums">
                            <span className="text-rose-600 dark:text-rose-400 font-medium block">
                              ${pos.liquidationPrice.toFixed(posMkt.tickDecimals)}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTpSlPos(pos);
                                setEditTpVal(pos.takeProfit ? String(pos.takeProfit) : '');
                                setEditSlVal(pos.stopLoss ? String(pos.stopLoss) : '');
                              }}
                              className="text-[11px] text-primary hover:underline cursor-pointer"
                            >
                              {pos.takeProfit || pos.stopLoss
                                ? `${pos.takeProfit || '-'} / ${pos.stopLoss || '-'}`
                                : '+ TP / SL'}
                            </button>
                          </td>
                          <td className="py-3 font-mono text-ink-2 tabular-nums">
                            <span>
                              {(pos.marginAmount ?? pos.margin).toFixed(colTok === 'BCH' ? 4 : 2)}{' '}
                              {colTok}
                            </span>
                            {pos.openExplorerUrl && (
                              <a
                                href={pos.openExplorerUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="block text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-0.5"
                              >
                                <span>TX</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </td>
                          <td className="py-3 font-mono font-semibold tabular-nums">
                            <span
                              className={
                                isProfit
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-rose-600 dark:text-rose-400'
                              }
                            >
                              {isProfit ? '+' : ''}${uPnl.toFixed(2)} ({isProfit ? '+' : ''}
                              {uPnlPct.toFixed(1)}%)
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <button
                              type="button"
                              disabled={closingPosId === pos.id}
                              onClick={() => handleClosePosition(pos)}
                              className="ui-btn-sm ui-btn-secondary"
                            >
                              {closingPosId === pos.id ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : isEs ? (
                                'Cerrar'
                              ) : (
                                'Close'
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Stacked Cards */}
              <div className="sm:hidden space-y-2.5">
                {positions.map(pos => {
                  const posMkt = MARKETS.find(m => m.symbol === pos.symbol) || MARKETS[0];
                  const currentPrice =
                    marketPrices[pos.symbol] ||
                    (pos.base ? marketPrices[pos.base] : 0) ||
                    pos.markPrice ||
                    pos.entryPrice;
                  const priceDelta =
                    pos.side === 'long'
                      ? currentPrice - pos.entryPrice
                      : pos.entryPrice - currentPrice;
                  const uPnl = pos.sizeAsset * priceDelta;
                  const baseMarginUsd = pos.marginUsd || pos.margin || 1;
                  const uPnlPct = (uPnl / baseMarginUsd) * 100;
                  const isProfit = uPnl >= 0;
                  const colTok = pos.collateralToken || 'PUSD';

                  return (
                    <div key={pos.id} className="ui-panel p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-ink text-sm">{pos.market}</span>
                          <span
                            className={
                              pos.side === 'long' ? 'ui-badge-success' : 'ui-badge-danger'
                            }
                          >
                            {pos.side.toUpperCase()} {pos.leverage}x
                          </span>
                        </div>
                        <button
                          type="button"
                          disabled={closingPosId === pos.id}
                          onClick={() => handleClosePosition(pos)}
                          className="ui-btn-sm ui-btn-secondary"
                        >
                          {closingPosId === pos.id ? '...' : isEs ? 'Cerrar' : 'Close'}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-line tabular-nums">
                        <div>
                          <div className="ui-label">{isEs ? 'Entrada / Mark' : 'Entry / Mark'}</div>
                          <div className="font-mono text-ink mt-0.5">
                            ${pos.entryPrice.toFixed(posMkt.tickDecimals)} / $
                            {currentPrice.toFixed(posMkt.tickDecimals)}
                          </div>
                        </div>
                        <div>
                          <div className="ui-label">{isEs ? 'Liquidación' : 'Liquidation'}</div>
                          <div className="font-mono text-rose-600 dark:text-rose-400 mt-0.5">
                            ${pos.liquidationPrice.toFixed(posMkt.tickDecimals)}
                          </div>
                        </div>
                        <div>
                          <div className="ui-label">{isEs ? 'Tamaño / Margen' : 'Size / Margin'}</div>
                          <div className="font-mono text-ink mt-0.5">
                            ${pos.sizeUsd.toFixed(0)} ({pos.marginAmount ?? pos.margin} {colTok})
                          </div>
                        </div>
                        <div>
                          <div className="ui-label">uPnL</div>
                          <div
                            className={`font-mono font-semibold mt-0.5 ${
                              isProfit
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {isProfit ? '+' : ''}${uPnl.toFixed(2)} ({isProfit ? '+' : ''}
                            {uPnlPct.toFixed(1)}%)
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        ) : tradeHistory.length === 0 ? (
          <div className="py-8 text-center text-xs text-ink-3">
            {isEs
              ? 'No hay posiciones cerradas en tu historial.'
              : 'No settled positions in your on-chain history.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-line text-ink-3">
                  <th className="pb-2.5 font-medium">{isEs ? 'Mercado' : 'Market'}</th>
                  <th className="pb-2.5 font-medium">{isEs ? 'Lado' : 'Side'}</th>
                  <th className="pb-2.5 font-medium">{isEs ? 'Entrada → Cierre' : 'Entry → Exit'}</th>
                  <th className="pb-2.5 font-medium">{isEs ? 'PnL' : 'Realized PnL'}</th>
                  <th className="pb-2.5 font-medium">{isEs ? 'Pago' : 'Payout'}</th>
                  <th className="pb-2.5 font-medium text-right">TX</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {tradeHistory.map(hist => {
                  const isProfit = hist.pnlUsd >= 0;
                  const colTok = hist.collateralToken || 'PUSD';
                  return (
                    <tr key={hist.id} className="hover:bg-surface-2/40 transition-colors">
                      <td className="py-2.5 font-semibold text-ink">{hist.market}</td>
                      <td className="py-2.5">
                        <span
                          className={
                            hist.side === 'long' ? 'ui-badge-success' : 'ui-badge-danger'
                          }
                        >
                          {hist.side.toUpperCase()} {hist.leverage}x
                        </span>
                      </td>
                      <td className="py-2.5 font-mono text-ink-2 tabular-nums">
                        ${hist.entryPrice} → ${hist.exitPrice}
                      </td>
                      <td className="py-2.5 font-mono font-semibold tabular-nums">
                        <span
                          className={
                            isProfit
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }
                        >
                          {isProfit ? '+' : ''}${hist.pnlUsd.toFixed(2)} ({isProfit ? '+' : ''}
                          {hist.pnlPercent.toFixed(1)}%)
                        </span>
                      </td>
                      <td className="py-2.5 font-mono text-ink tabular-nums">
                        {hist.payoutAmount !== undefined
                          ? `${hist.payoutAmount} ${colTok}`
                          : `${hist.margin} ${colTok}`}
                      </td>
                      <td className="py-2.5 font-mono text-ink-3 text-right">
                        {hist.closeExplorerUrl ? (
                          <a
                            href={hist.closeExplorerUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 font-medium"
                          >
                            <span>TX</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          new Date(hist.closedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }
}
