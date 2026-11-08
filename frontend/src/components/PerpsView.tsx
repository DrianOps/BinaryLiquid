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
  hasActiveBchSigningCapability
} from '../services/walletConnectService';

export interface PerpsViewProps {
  backendUrl?: string;
  userAddress?: string;
  bchAddress?: string;
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
}

export interface PerpPosition {
  id: string;
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
  usdtVaultAddress: '0x572D2ef3796B9ff9329194A3229DC2ff0833540F',
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
  evmAddress = '',
  walletBalances: propBalances,
  wizardConnectManager,
  wizardConnectState,
  platformNetwork = 'testnet',
  onToggleNetwork,
  onRefreshBalances,
  onConnectWallet,
  showToast,
  lang = 'es'
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

  // Local fallback wallet balances
  const [localBalances, setLocalBalances] = useState({
    PUSD: 0,
    BCH: 0,
    USDT: 0,
    USDC: 0,
    POL: 0
  });
  const walletBalances = useMemo(() => {
    if (
      propBalances &&
      (propBalances.PUSD > 0 || propBalances.BCH > 0 || propBalances.USDT > 0)
    ) {
      return propBalances;
    }
    return localBalances;
  }, [propBalances, localBalances]);

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
    if (userAddress && (userAddress.startsWith('bchtest:') || userAddress.startsWith('bitcoincash:'))) {
      return userAddress;
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

  const hasOneClickBchSign = useMemo(() => {
    return (
      Boolean(connectedBch) &&
      (wizardConnectState === 'connected' || hasActiveBchSigningCapability(wizardConnectManager))
    );
  }, [connectedBch, wizardConnectManager, wizardConnectState]);

  // Purge any old simulated localStorage keys on mount
  useEffect(() => {
    try {
      localStorage.removeItem('bliq_perp_positions_v1');
      localStorage.removeItem('bliq_perp_history_v1');
    } catch {}
  }, []);

  const copyToClipboard = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
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
          if (!limitPrice || orderType === 'market') {
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

  // Setup Lightweight Charts
  useEffect(() => {
    if (!chartContainerRef.current) return;
    let isDisposed = false;

    const isDark = document.documentElement.classList.contains('dark');
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)';
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';

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

    // Immediate base candles so chart is never blank while loading
    const baseCandles: any[] = [];
    const nowSec = Math.floor(Date.now() / 1000);
    let runPrice = market.initialPrice * 0.985;
    for (let i = 80; i >= 0; i--) {
      const t = (nowSec - i * 900) as any;
      const step = Math.sin(i / 5) * 1.8 + (Math.random() - 0.48) * (market.initialPrice * 0.006);
      const o = runPrice;
      const c = runPrice + step;
      const h = Math.max(o, c) + Math.random() * (market.initialPrice * 0.002);
      const l = Math.min(o, c) - Math.random() * (market.initialPrice * 0.002);
      runPrice = c;
      baseCandles.push({
        time: t,
        open: Number(o.toFixed(market.tickDecimals)),
        high: Number(h.toFixed(market.tickDecimals)),
        low: Number(l.toFixed(market.tickDecimals)),
        close: Number(c.toFixed(market.tickDecimals)),
        value: Number(c.toFixed(market.tickDecimals))
      });
    }

    if (chartType === 'line') {
      series.setData(baseCandles.map(b => ({ time: b.time, value: b.close })));
    } else {
      series.setData(baseCandles);
    }
    chart.timeScale().fitContent();

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

    return () => {
      isDisposed = true;
      ro.disconnect();
      if (ws) ws.close();
      chart.remove();
      chartInstanceRef.current = null;
      seriesInstanceRef.current = null;
    };
  }, [selectedSymbol, timeframe, chartType, market.tickDecimals, market.initialPrice, market.base]);

  // Draw Entry, Liquidation, TP, and SL price lines on the chart for the active market's position
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
        title: `${currentPos.side.toUpperCase()} ${currentPos.leverage}x ($${currentPos.entryPrice.toFixed(market.tickDecimals)})`
      });

      liqLineRef.current = series.createPriceLine({
        price: currentPos.liquidationPrice,
        color: '#ef4444',
        lineWidth: 1,
        lineStyle: 3,
        axisLabelVisible: true,
        title: `LIQ ($${currentPos.liquidationPrice.toFixed(market.tickDecimals)})`
      });

      if (currentPos.takeProfit && currentPos.takeProfit > 0) {
        tpLineRef.current = series.createPriceLine({
          price: currentPos.takeProfit,
          color: '#10b981',
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: `TP ($${currentPos.takeProfit.toFixed(market.tickDecimals)})`
        });
      }

      if (currentPos.stopLoss && currentPos.stopLoss > 0) {
        slLineRef.current = series.createPriceLine({
          price: currentPos.stopLoss,
          color: '#f59e0b',
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: `SL ($${currentPos.stopLoss.toFixed(market.tickDecimals)})`
        });
      }
    }
  }, [positions, selectedSymbol, market.tickDecimals]);

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
            isTestnet: true,
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
            isTestnet: true,
            wizardManager: wizardConnectManager,
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

  // =========================================================================
  // CLOSE PERPETUAL POSITION (100% Real On-Chain Payout from Vault)
  // =========================================================================
  const handleClosePosition = async (pos: PerpPosition, reason = 'USER_CLOSE') => {
    setClosingPosId(pos.id);
    try {
      const res = await fetch(`${backendUrl}/api/perps/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          positionId: pos.id,
          userAddress: userAddress || connectedBch || connectedEvm,
          bchAddress: connectedBch,
          evmAddress: connectedEvm,
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
      const res = await fetch(`${backendUrl}/api/perps/update-tpsl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          positionId: editingTpSlPos.id,
          userAddress: userAddress || connectedBch || connectedEvm,
          bchAddress: connectedBch,
          evmAddress: connectedEvm,
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

  return (
    <div className="w-full max-w-[1360px] mx-auto space-y-3 sm:space-y-4">
      {/* MAINNET HONESTY BANNER */}
      {!isTestnet && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs text-ink">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              <strong>{isEs ? 'Sin Liquidez en Mainnet:' : 'No Mainnet Liquidity:'}</strong>{' '}
              {isEs
                ? 'Las bóvedas de Futuros Perpetuos están desplegadas y operativas con fondos reales en Testnet (BCH Chipnet y Polygon Amoy).'
                : 'Perpetual Futures vaults are deployed and funded live on Testnet (BCH Chipnet & Polygon Amoy).'}
            </span>
          </div>
          {onToggleNetwork && (
            <button
              onClick={() => onToggleNetwork('testnet')}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs shrink-0 cursor-pointer"
            >
              {isEs ? 'Cambiar a Testnet (Chipnet / Amoy)' : 'Switch to Testnet'}
            </button>
          )}
        </div>
      )}

      {/* 1. TOP MARKET STRIP */}
      <div className="ui-card p-3 sm:p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 overflow-visible">
        {/* Left: Market Selector & Mark Price */}
        <div className="flex items-center gap-3 sm:gap-4 w-full lg:w-auto justify-between lg:justify-start">
          {/* Pair Selector Dropdown */}
          <div className="relative" ref={marketDropdownRef}>
            <button
              onClick={() => setMarketDropdownOpen(!marketDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-control bg-surface-2 hover:bg-surface-3 border border-line text-ink transition-colors cursor-pointer"
            >
              <img src={market.icon} alt={market.base} className="w-5 h-5 rounded-full object-contain" />
              <span className="font-bold text-sm tracking-tight">{market.name}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-ink-3 transition-transform ${
                  marketDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {marketDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-64 bg-surface border border-line rounded-panel shadow-soft p-1.5 z-50">
                <div className="text-[10px] uppercase font-semibold text-ink-3 px-2 py-1">
                  {isEs ? 'Mercados Perpetuos On-Chain' : 'On-Chain Perpetual Markets'}
                </div>
                {MARKETS.map(m => {
                  const mPrice = marketPrices[m.symbol] || m.initialPrice;
                  return (
                    <button
                      key={m.symbol}
                      onClick={() => {
                        setSelectedSymbol(m.symbol);
                        if (leverage > m.maxLeverage) setLeverage(m.maxLeverage);
                        setMarketDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-control text-xs transition-colors cursor-pointer ${
                        selectedSymbol === m.symbol
                          ? 'bg-surface-2 text-ink font-bold'
                          : 'hover:bg-surface-2/70 text-ink-2'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <img src={m.icon} alt={m.base} className="w-4 h-4 rounded-full object-contain" />
                        <span className="font-semibold">{m.name}</span>
                        <span className="text-[10px] text-ink-3">{m.maxLeverage}x</span>
                      </div>
                      <span className="text-[11px] font-mono text-ink">
                        ${mPrice.toLocaleString(undefined, { minimumFractionDigits: m.tickDecimals, maximumFractionDigits: m.tickDecimals })}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Mark Price & 24h Change */}
          <div className="flex items-baseline gap-2">
            <span
              className={`text-xl sm:text-2xl font-bold tabular-nums transition-colors ${
                markPrice >= prevPrice ? 'text-ink' : 'text-ink'
              }`}
            >
              $
              {markPrice.toLocaleString(undefined, {
                minimumFractionDigits: market.tickDecimals,
                maximumFractionDigits: market.tickDecimals
              })}
            </span>
            <span
              className={`text-xs font-semibold tabular-nums px-1.5 py-0.5 rounded ${
                priceChange24h >= 0
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
              }`}
            >
              {priceChange24h >= 0 ? '+' : ''}
              {priceChange24h.toFixed(2)}%
            </span>
          </div>

          {/* On-Chain Vault Backing Badge */}
          <div className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-ink text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              {isTestnet
                ? `${isEs ? 'Liquidez Vault:' : 'Vault Backing:'} $${vaultsInfo.totalLiquidityUsd.toLocaleString()} USD`
                : isEs
                  ? 'Sin Liquidez Mainnet'
                  : 'No Mainnet Liquidity'}
            </span>
          </div>
        </div>

        {/* Right: Key Stats Strip (High, Low, Open Interest, Funding) */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs w-full lg:w-auto justify-between lg:justify-end border-t lg:border-t-0 border-line pt-2 lg:pt-0">
          <div>
            <div className="ui-label text-[10px]">24h High / Low</div>
            <div className="ui-value text-xs font-mono">
              ${high24h.toFixed(market.tickDecimals)} / ${low24h.toFixed(market.tickDecimals)}
            </div>
          </div>
          <div>
            <div className="ui-label text-[10px]">24h Vol</div>
            <div className="ui-value text-xs font-mono">${(volume24h / 1000).toFixed(0)}k</div>
          </div>
          <div>
            <div className="ui-label text-[10px]">Open Interest (L/S)</div>
            <div className="ui-value text-xs font-mono">
              <span className="text-emerald-500">${protocolStats.totalLongOiUsd.toFixed(0)}</span>
              {' / '}
              <span className="text-rose-500">${protocolStats.totalShortOiUsd.toFixed(0)}</span>
            </div>
          </div>
          <div>
            <div className="ui-label text-[10px]">Funding / Countdown</div>
            <div className="ui-value text-xs font-mono flex items-center gap-1">
              <span className="text-emerald-600 dark:text-emerald-400">
                {fundingRate >= 0 ? '+' : ''}
                {fundingRate.toFixed(4)}%
              </span>
              <span className="text-ink-3">in {fundingCountdown}</span>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE SEGMENTED TABS (< 1024px: Gráfico | Operar | Posiciones) */}
      <div className="lg:hidden flex items-center justify-between p-1 bg-surface border border-line rounded-control text-xs font-semibold">
        <button
          onClick={() => setMobileTab('chart')}
          className={`flex-1 py-1.5 rounded-control transition-all cursor-pointer ${
            mobileTab === 'chart'
              ? 'bg-surface-2 text-ink shadow-xs font-bold'
              : 'text-ink-3 hover:text-ink'
          }`}
        >
          {isEs ? 'Gráfico' : 'Chart'}
        </button>
        <button
          onClick={() => setMobileTab('trade')}
          className={`flex-1 py-1.5 rounded-control transition-all cursor-pointer ${
            mobileTab === 'trade'
              ? 'bg-surface-2 text-ink shadow-xs font-bold'
              : 'text-ink-3 hover:text-ink'
          }`}
        >
          {isEs ? 'Operar' : 'Trade'}
        </button>
        <button
          onClick={() => setMobileTab('positions')}
          className={`flex-1 py-1.5 rounded-control transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            mobileTab === 'positions'
              ? 'bg-surface-2 text-ink shadow-xs font-bold'
              : 'text-ink-3 hover:text-ink'
          }`}
        >
          <span>{isEs ? 'Posiciones' : 'Positions'}</span>
          {positions.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-primary/20 text-primary text-[10px] font-bold">
              {positions.length}
            </span>
          )}
        </button>
      </div>

      {/* 2. MAIN TRADING WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-start">
        {/* LEFT COLUMN: Interactive Chart + Positions Table */}
        <div
          className={`lg:col-span-8 flex flex-col gap-3 sm:gap-4 ${
            mobileTab !== 'chart' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Chart Card */}
          <div className="ui-card p-3 sm:p-4 flex flex-col h-[440px] sm:h-[500px]">
            {/* Chart Toolbar */}
            <div className="flex items-center justify-between pb-3 border-b border-line gap-2">
              <div className="flex items-center gap-1">
                {TIMEFRAMES.map(tf => (
                  <button
                    key={tf.value}
                    onClick={() => setTimeframe(tf.value)}
                    className={`px-2 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                      timeframe === tf.value ? 'bg-surface-2 text-ink' : 'text-ink-3 hover:text-ink'
                    }`}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setChartType(chartType === 'candles' ? 'line' : 'candles')}
                  className="px-2 py-1 rounded bg-surface-2 text-ink-2 hover:text-ink text-xs font-medium border border-line cursor-pointer"
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
            <div className="flex-1 w-full min-h-[360px] relative mt-2">
              <div ref={chartContainerRef} className="absolute inset-0 w-full h-full" />
            </div>

            {/* Bottom Chart Indicator Hint */}
            <div className="pt-2 border-t border-line flex flex-wrap items-center justify-between gap-2 text-[11px] text-ink-3">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  <span>{isEs ? 'Entrada' : 'Entry'}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Take Profit</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Stop Loss</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>{isEs ? 'Liquidación' : 'Liquidation'}</span>
                </span>
              </div>
              <span className="font-mono text-[10px]">
                Oracle Pool + CashScript / EVM Vault Settlement
              </span>
            </div>
          </div>

          {/* Desktop Positions Table */}
          <div className="hidden lg:block">{renderPositionsCard()}</div>
        </div>

        {/* RIGHT COLUMN: On-Chain Order Form */}
        <div
          className={`lg:col-span-4 flex flex-col gap-3 ${
            mobileTab !== 'trade' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          <div className="ui-card p-4 sm:p-5 space-y-4">
            {/* Long / Short Segment */}
            <div className="grid grid-cols-2 p-1 bg-surface-2 rounded-panel border border-line text-xs font-bold">
              <button
                type="button"
                onClick={() => setSide('long')}
                className={`py-2 rounded-control transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  side === 'long'
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-soft font-bold'
                    : 'text-ink-3 hover:text-ink'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Long</span>
              </button>
              <button
                type="button"
                onClick={() => setSide('short')}
                className={`py-2 rounded-control transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  side === 'short'
                    ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 shadow-soft font-bold'
                    : 'text-ink-3 hover:text-ink'
                }`}
              >
                <TrendingDown className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>Short</span>
              </button>
            </div>

            {/* Order Type (Market / Limit) */}
            <div className="flex items-center justify-between text-xs">
              <span className="ui-label">{isEs ? 'Tipo de Orden' : 'Order Type'}</span>
              <div className="inline-flex items-center p-0.5 bg-surface-2 rounded-control border border-line">
                <button
                  type="button"
                  onClick={() => setOrderType('market')}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                    orderType === 'market' ? 'bg-surface text-ink shadow-xs' : 'text-ink-3 hover:text-ink'
                  }`}
                >
                  {isEs ? 'Mercado' : 'Market'}
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType('limit')}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                    orderType === 'limit' ? 'bg-surface text-ink shadow-xs' : 'text-ink-3 hover:text-ink'
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
                  <span className="ui-label">{isEs ? 'Precio Límite (USD)' : 'Limit Price (USD)'}</span>
                  <button
                    onClick={() => setLimitPrice(markPrice.toFixed(market.tickDecimals))}
                    className="text-[11px] text-primary hover:underline cursor-pointer"
                  >
                    {isEs ? 'Usar Mark' : 'Use Mark'}
                  </button>
                </div>
                <input
                  type="number"
                  step="any"
                  value={limitPrice}
                  onChange={e => setLimitPrice(e.target.value)}
                  className="ui-input font-mono"
                  placeholder={markPrice.toFixed(market.tickDecimals)}
                />
              </div>
            )}

            {/* Collateral Asset Selector (PUSD, USDT, BCH) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="ui-label">
                  {isEs ? 'Activo de Colateral On-Chain' : 'On-Chain Collateral Asset'}
                </span>
                <span className="text-[10px] font-mono text-ink-3">
                  {collateralToken === 'USDT' ? 'Polygon Amoy' : 'BCH Chipnet'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(['PUSD', 'USDT', 'BCH'] as const).map(tok => (
                  <button
                    key={tok}
                    type="button"
                    onClick={() => {
                      setCollateralToken(tok);
                      if (tok === 'BCH') setMarginInput('0.02');
                      else setMarginInput('10');
                    }}
                    className={`py-1.5 px-2 rounded-control border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      collateralToken === tok
                        ? 'bg-primary/15 border-primary text-ink shadow-2xs'
                        : 'bg-surface-2 border-line text-ink-3 hover:text-ink'
                    }`}
                  >
                    <img src={`/${tok}.png`} alt={tok} className="w-4 h-4 rounded-full object-contain" />
                    <span>{tok}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Margin Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="ui-label">
                  {isEs ? `Margen (${collateralToken})` : `Margin (${collateralToken})`}
                </span>
                <span className="ui-label font-mono">
                  {isEs ? 'En Wallet:' : 'In Wallet:'}{' '}
                  <strong className="text-ink">
                    {formatCryptoBalance(walletBalances?.[collateralToken] || 0)} {collateralToken}
                  </strong>
                </span>
              </div>

              <div className="relative">
                <input
                  type="number"
                  step="any"
                  min="0.001"
                  value={marginInput}
                  onChange={e => setMarginInput(e.target.value)}
                  className="ui-input pr-16 font-mono text-base font-semibold"
                  placeholder={collateralToken === 'BCH' ? '0.02' : '10'}
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-ink-3 pointer-events-none">
                  {collateralToken}
                </span>
              </div>

              {/* Quick % buttons using real wallet balance */}
              <div className="grid grid-cols-4 gap-1.5 pt-1">
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
                    className="py-1 rounded bg-surface-2 hover:bg-surface-3 border border-line text-[11px] font-semibold text-ink-2 hover:text-ink transition-colors cursor-pointer"
                  >
                    {pct === 100 ? 'MAX' : `${pct}%`}
                  </button>
                ))}
              </div>

              {/* 1-Click Testnet Faucet helper for PUSD / USDT */}
              {isTestnet && (collateralToken === 'PUSD' || collateralToken === 'USDT') && (
                <div className="flex items-center justify-end pt-0.5">
                  <button
                    type="button"
                    onClick={() => handleClaimTestnetFaucet(collateralToken)}
                    disabled={faucetClaiming}
                    className="text-[11px] font-bold text-primary hover:underline cursor-pointer disabled:opacity-50"
                  >
                    {faucetClaiming
                      ? isEs
                        ? `Enviando ${collateralToken} de prueba...`
                        : `Sending test ${collateralToken}...`
                      : isEs
                        ? `💧 ¿Falta ${collateralToken}? Reclamar ${collateralToken === 'USDT' ? '100 USDT' : '25 PUSD'} Gratis (Faucet)`
                        : `💧 Need ${collateralToken}? Claim Free ${collateralToken === 'USDT' ? '100 USDT' : '25 PUSD'} (Faucet)`}
                  </button>
                </div>
              )}
            </div>

            {/* Leverage Slider & Presets */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="ui-label">{isEs ? 'Apalancamiento' : 'Leverage'}</span>
                <span className="font-bold text-primary text-sm font-mono">{leverage}x</span>
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

              <div className="flex items-center justify-between gap-1">
                {LEVERAGE_PRESETS.filter(p => p <= market.maxLeverage).map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setLeverage(preset)}
                    className={`flex-1 py-1 rounded text-[11px] font-mono font-semibold transition-colors cursor-pointer ${
                      leverage === preset
                        ? 'bg-primary text-black font-bold'
                        : 'bg-surface-2 text-ink-3 hover:text-ink border border-line'
                    }`}
                  >
                    {preset}x
                  </button>
                ))}
              </div>
            </div>

            {/* Take Profit / Stop Loss Optional Toggle */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => setShowTpSlInputs(!showTpSlInputs)}
                className="w-full flex items-center justify-between text-xs text-ink-2 hover:text-ink font-semibold cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-primary" />
                  <span>Take Profit / Stop Loss {isEs ? '(Opcional)' : '(Optional)'}</span>
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${showTpSlInputs ? 'rotate-180' : ''}`}
                />
              </button>

              {showTpSlInputs && (
                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-control bg-surface-2 border border-line">
                  <div>
                    <label className="text-[10px] font-semibold text-emerald-500 block mb-1">
                      Take Profit (USD)
                    </label>
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
                      className="w-full px-2.5 py-1.5 rounded bg-surface border border-line text-xs font-mono text-ink outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-amber-500 block mb-1">
                      Stop Loss (USD)
                    </label>
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
                      className="w-full px-2.5 py-1.5 rounded bg-surface border border-line text-xs font-mono text-ink outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 1-Click BCH Signing Indicator or Optional Manual QR / TXID */}
            {(collateralToken === 'PUSD' || collateralToken === 'BCH') && isTestnet && (
              <div className="space-y-2">
                {hasOneClickBchSign ? (
                  <div className="p-2 rounded-control bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    ⚡{' '}
                    {isEs
                      ? `Firma 1-Clic Activa (Paytaca / Cashonize): El margen ${collateralToken} se firma directo al abrir la posición.`
                      : `1-Click Signing Active: ${collateralToken} margin signs directly when opening position.`}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowManualQrDeposit(!showManualQrDeposit)}
                    className="w-full text-left text-[11px] text-primary hover:underline font-semibold cursor-pointer"
                  >
                    {showManualQrDeposit
                      ? isEs
                        ? 'Ocultar QR / TXID manual de la bóveda'
                        : 'Hide manual vault QR / TXID'
                      : isEs
                        ? `¿Sin WalletConnect? Mostrar QR de BinaryLiquidVault.cash para depositar ${collateralToken}`
                        : `No WalletConnect? Show BinaryLiquidVault.cash QR to deposit ${collateralToken}`}
                  </button>
                )}

                {showManualQrDeposit && (
                  <div className="p-3 rounded-control bg-surface-2 border border-line space-y-2 text-xs">
                    {manualDepositQr && (
                      <div className="w-24 h-24 mx-auto bg-white p-1.5 rounded-lg">
                        <img src={manualDepositQr} alt="Vault QR" className="w-full h-full object-contain" />
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2 bg-surface p-1.5 rounded border border-line">
                      <span className="font-mono text-[10px] text-ink truncate">
                        {activeVaultDepositAddr}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(activeVaultDepositAddr, 'perpVault')}
                        className="px-2 py-0.5 rounded bg-primary/15 text-primary font-bold text-[10px] shrink-0 cursor-pointer flex items-center gap-1"
                      >
                        {copiedKey === 'perpVault' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedKey === 'perpVault' ? 'OK' : 'Copy'}</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      value={manualTxHash}
                      onChange={e => setManualTxHash(e.target.value)}
                      placeholder={
                        isEs
                          ? 'TXID opcional (dejar vacío para autodetección UTXO)'
                          : 'Optional TXID (leave blank for UTXO auto-detect)'
                      }
                      className="w-full px-2.5 py-1.5 rounded bg-surface border border-line text-[11px] font-mono text-ink outline-none"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Order Metrics Summary */}
            <div className="ui-panel p-3 space-y-2 text-xs border border-line">
              <div className="flex items-center justify-between">
                <span className="text-ink-3">{isEs ? 'Margen (USD)' : 'Margin (USD)'}</span>
                <span className="ui-value font-mono">${parsedMarginUsd.toFixed(2)} USD</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-3">{isEs ? 'Tamaño de posición' : 'Position Size'}</span>
                <span className="ui-value font-mono">
                  ${positionSizeUsd.toFixed(2)} ({positionSizeAsset.toFixed(market.assetDecimals)} {market.base})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-3">{isEs ? 'Precio de entrada' : 'Entry Price'}</span>
                <span className="ui-value font-mono">${executionPrice.toFixed(market.tickDecimals)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-3">{isEs ? 'Precio de liquidación' : 'Est. Liquidation Price'}</span>
                <span className="ui-value font-mono text-rose-500 font-semibold">
                  ${calculatedLiqPrice.toFixed(market.tickDecimals)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-3">{isEs ? 'Comisión protocolo (0.05%)' : 'Protocol Fee (0.05%)'}</span>
                <span className="ui-value font-mono">${estimatedFeeUsd.toFixed(3)} USD</span>
              </div>
            </div>

            {/* Primary Action Button */}
            {((collateralToken === 'PUSD' || collateralToken === 'BCH') && !connectedBch) ||
            (collateralToken === 'USDT' && !connectedEvm) ? (
              <button
                type="button"
                onClick={onConnectWallet}
                className="w-full ui-btn-primary h-12 text-sm font-bold cursor-pointer"
              >
                {collateralToken === 'USDT'
                  ? isEs
                    ? 'Conectar Billetera EVM (Polygon Amoy)'
                    : 'Connect EVM Wallet (Polygon Amoy)'
                  : isEs
                    ? 'Conectar Billetera BCH (Paytaca / Cashonize)'
                    : 'Connect BCH Wallet (Paytaca / Cashonize)'}
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting || !isTestnet || parsedMarginToken <= 0}
                onClick={handleOpenPosition}
                className={`w-full h-12 rounded-panel font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  isSubmitting || !isTestnet || parsedMarginToken <= 0
                    ? 'ui-btn-disabled'
                    : side === 'long'
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-black shadow-soft'
                      : 'bg-rose-500 hover:bg-rose-600 text-white shadow-soft'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span className="text-xs">{statusMessage || (isEs ? 'Ejecutando on-chain...' : 'Executing on-chain...')}</span>
                  </>
                ) : (
                  <>
                    <span>
                      {isEs
                        ? `Abrir ${side.toUpperCase()} ${market.base} [${leverage}x] con ${parsedMarginToken} ${collateralToken}`
                        : `Open ${side.toUpperCase()} ${market.base} [${leverage}x] with ${parsedMarginToken} ${collateralToken}`}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            )}

            {/* Non-custodial covenant footnote */}
            <div className="text-[11px] text-ink-3 text-center flex items-center justify-center gap-1.5 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>
                {collateralToken === 'USDT'
                  ? 'Liquidación On-Chain en BinaryLiquidVault.sol (Polygon Amoy)'
                  : 'Liquidación On-Chain en BinaryLiquidVault.cash (BCH Chipnet P2SH32)'}
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
              <h4 className="font-bold text-sm text-ink">
                TP / SL • {editingTpSlPos.market} ({editingTpSlPos.side.toUpperCase()} {editingTpSlPos.leverage}x)
              </h4>
              <button
                onClick={() => setEditingTpSlPos(null)}
                className="text-xs text-ink-3 hover:text-ink cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between text-ink-3 font-mono">
                <span>Entry: ${editingTpSlPos.entryPrice}</span>
                <span>Liq: ${editingTpSlPos.liquidationPrice}</span>
              </div>
              <div>
                <label className="block font-semibold text-emerald-500 mb-1">Take Profit (USD)</label>
                <input
                  type="number"
                  step="any"
                  value={editTpVal}
                  onChange={e => setEditTpVal(e.target.value)}
                  placeholder="Sin límite"
                  className="ui-input font-mono text-xs"
                />
              </div>
              <div>
                <label className="block font-semibold text-amber-500 mb-1">Stop Loss (USD)</label>
                <input
                  type="number"
                  step="any"
                  value={editSlVal}
                  onChange={e => setEditSlVal(e.target.value)}
                  placeholder="Sin límite"
                  className="ui-input font-mono text-xs"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setEditingTpSlPos(null)}
                className="flex-1 py-2 rounded-control bg-surface-2 text-ink-2 text-xs font-bold cursor-pointer"
              >
                {isEs ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                onClick={handleSaveTpSl}
                className="flex-1 py-2 rounded-control bg-primary text-black text-xs font-bold cursor-pointer"
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
        {/* Card Header & Tabs */}
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm font-semibold">
            <button
              onClick={() => setPositionsTab('positions')}
              className={`pb-1 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                positionsTab === 'positions'
                  ? 'border-primary text-ink font-bold'
                  : 'border-transparent text-ink-3 hover:text-ink'
              }`}
            >
              <span>{isEs ? 'Posiciones Abiertas On-Chain' : 'Open On-Chain Positions'}</span>
              <span className="px-1.5 py-0.2 rounded-full bg-surface-2 text-ink-2 text-[10px]">
                {positions.length}
              </span>
            </button>

            <button
              onClick={() => setPositionsTab('history')}
              className={`pb-1 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                positionsTab === 'history'
                  ? 'border-primary text-ink font-bold'
                  : 'border-transparent text-ink-3 hover:text-ink'
              }`}
            >
              <span>{isEs ? 'Historial de Liquidaciones' : 'Settlement History'}</span>
              <span className="px-1.5 py-0.2 rounded-full bg-surface-2 text-ink-2 text-[10px]">
                {tradeHistory.length}
              </span>
            </button>
          </div>

          <button
            onClick={() => {
              fetchPerpsData();
              onRefreshBalances?.();
            }}
            className="text-ink-3 hover:text-ink transition-colors p-1 rounded hover:bg-surface-2 cursor-pointer"
            title={isEs ? 'Sincronizar posiciones on-chain' : 'Sync on-chain positions'}
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content View */}
        {positionsTab === 'positions' ? (
          positions.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <div className="text-xs text-ink-3">
                {isEs
                  ? 'No tienes posiciones perpetuas abiertas on-chain en este momento.'
                  : 'You have no open on-chain perpetual positions right now.'}
              </div>
              <button
                type="button"
                onClick={() => {
                  setSide('long');
                  setLeverage(10);
                  setMobileTab('trade');
                }}
                className="ui-btn-secondary ui-btn-sm cursor-pointer"
              >
                {isEs ? 'Abrir una posición Long / Short' : 'Open a Long / Short position'}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-line text-ink-3 text-[11px]">
                      <th className="pb-2 font-medium">{isEs ? 'Mercado / Lado' : 'Market / Side'}</th>
                      <th className="pb-2 font-medium">{isEs ? 'Tamaño' : 'Size'}</th>
                      <th className="pb-2 font-medium">{isEs ? 'Entrada / Mark' : 'Entry / Mark'}</th>
                      <th className="pb-2 font-medium">{isEs ? 'Liq / TP / SL' : 'Liq / TP / SL'}</th>
                      <th className="pb-2 font-medium">{isEs ? 'Margen On-Chain' : 'On-Chain Margin'}</th>
                      <th className="pb-2 font-medium">{isEs ? 'PnL No Realizado' : 'uPnL'}</th>
                      <th className="pb-2 font-medium text-right">{isEs ? 'Acción' : 'Action'}</th>
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
                              <span className="font-bold text-ink">{pos.market}</span>
                              <span
                                className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                  pos.side === 'long'
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                }`}
                              >
                                {pos.side.toUpperCase()} {pos.leverage}x
                              </span>
                            </div>
                          </td>
                          <td className="py-3 font-mono font-medium text-ink">
                            ${pos.sizeUsd.toFixed(2)}
                            <span className="block text-[10px] text-ink-3">
                              {pos.sizeAsset} {posMkt.base}
                            </span>
                          </td>
                          <td className="py-3 font-mono text-ink">
                            ${pos.entryPrice.toFixed(posMkt.tickDecimals)}
                            <span className="block text-[10px] text-ink-2">
                              Mark: ${currentPrice.toFixed(posMkt.tickDecimals)}
                            </span>
                          </td>
                          <td className="py-3 font-mono">
                            <span className="text-rose-500 font-medium block">
                              Liq: ${pos.liquidationPrice.toFixed(posMkt.tickDecimals)}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTpSlPos(pos);
                                setEditTpVal(pos.takeProfit ? String(pos.takeProfit) : '');
                                setEditSlVal(pos.stopLoss ? String(pos.stopLoss) : '');
                              }}
                              className="text-[10px] text-primary hover:underline cursor-pointer"
                            >
                              {pos.takeProfit || pos.stopLoss
                                ? `TP: ${pos.takeProfit || '-'} / SL: ${pos.stopLoss || '-'}`
                                : '+ TP / SL'}
                            </button>
                          </td>
                          <td className="py-3 font-mono text-ink-2">
                            <span>
                              {(pos.marginAmount ?? pos.margin).toFixed(colTok === 'BCH' ? 4 : 2)} {colTok}
                            </span>
                            {pos.openExplorerUrl && (
                              <a
                                href={pos.openExplorerUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="block text-[10px] text-emerald-500 hover:underline inline-flex items-center gap-0.5"
                              >
                                <span>TX</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </td>
                          <td className="py-3 font-mono font-bold">
                            <span
                              className={
                                isProfit
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-rose-600 dark:text-rose-400'
                              }
                            >
                              {isProfit ? '+' : ''}${uPnl.toFixed(2)} ({isProfit ? '+' : ''}
                              {uPnlPct.toFixed(2)}%)
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <button
                              disabled={closingPosId === pos.id}
                              onClick={() => handleClosePosition(pos)}
                              className="px-2.5 py-1 rounded bg-surface-2 hover:bg-surface-3 border border-line text-ink text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                            >
                              {closingPosId === pos.id ? (
                                <RefreshCw className="w-3 h-3 animate-spin mx-auto" />
                              ) : isEs ? (
                                'Cerrar y Liquidar'
                              ) : (
                                'Close & Settle'
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Stacked Card View */}
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
                    <div key={pos.id} className="ui-panel p-3 space-y-2 border border-line">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-ink text-sm">{pos.market}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              pos.side === 'long'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {pos.side.toUpperCase()} {pos.leverage}x
                          </span>
                        </div>
                        <button
                          disabled={closingPosId === pos.id}
                          onClick={() => handleClosePosition(pos)}
                          className="px-2.5 py-1 rounded bg-surface border border-line text-ink text-xs font-semibold cursor-pointer"
                        >
                          {closingPosId === pos.id ? '...' : isEs ? 'Cerrar' : 'Close'}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-line">
                        <div>
                          <div className="ui-label text-[10px]">Entrada / Mark</div>
                          <div className="font-mono text-ink">
                            ${pos.entryPrice.toFixed(posMkt.tickDecimals)} / $
                            {currentPrice.toFixed(posMkt.tickDecimals)}
                          </div>
                        </div>
                        <div>
                          <div className="ui-label text-[10px]">Liquidación</div>
                          <div className="font-mono text-rose-500">
                            ${pos.liquidationPrice.toFixed(posMkt.tickDecimals)}
                          </div>
                        </div>
                        <div>
                          <div className="ui-label text-[10px]">Tamaño / Margen</div>
                          <div className="font-mono text-ink">
                            ${pos.sizeUsd.toFixed(0)} ({pos.marginAmount ?? pos.margin} {colTok})
                          </div>
                        </div>
                        <div>
                          <div className="ui-label text-[10px]">uPnL</div>
                          <div
                            className={`font-mono font-bold ${
                              isProfit ? 'text-emerald-500' : 'text-rose-500'
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
        ) : /* History View */
        tradeHistory.length === 0 ? (
          <div className="py-8 text-center text-xs text-ink-3">
            {isEs ? 'No hay posiciones cerradas en tu historial on-chain.' : 'No settled positions in your on-chain history.'}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-line text-ink-3 text-[11px]">
                    <th className="pb-2 font-medium">{isEs ? 'Mercado' : 'Market'}</th>
                    <th className="pb-2 font-medium">{isEs ? 'Lado' : 'Side'}</th>
                    <th className="pb-2 font-medium">{isEs ? 'Entrada → Cierre' : 'Entry → Exit'}</th>
                    <th className="pb-2 font-medium">{isEs ? 'PnL Realizado' : 'Realized PnL'}</th>
                    <th className="pb-2 font-medium">{isEs ? 'Liquidación On-Chain' : 'On-Chain Payout'}</th>
                    <th className="pb-2 font-medium text-right">{isEs ? 'TX / Hora' : 'TX / Time'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {tradeHistory.map(hist => {
                    const isProfit = hist.pnlUsd >= 0;
                    const colTok = hist.collateralToken || 'PUSD';
                    return (
                      <tr key={hist.id} className="hover:bg-surface-2/40 transition-colors">
                        <td className="py-2.5 font-bold text-ink">{hist.market}</td>
                        <td className="py-2.5">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              hist.side === 'long'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {hist.side.toUpperCase()} {hist.leverage}x
                          </span>
                        </td>
                        <td className="py-2.5 font-mono text-ink-2">
                          ${hist.entryPrice} → ${hist.exitPrice}
                        </td>
                        <td className="py-2.5 font-mono font-bold">
                          <span
                            className={
                              isProfit
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }
                          >
                            {isProfit ? '+' : ''}${hist.pnlUsd.toFixed(2)} ({isProfit ? '+' : ''}
                            {hist.pnlPercent.toFixed(2)}%)
                          </span>
                        </td>
                        <td className="py-2.5 font-mono text-ink">
                          {hist.payoutAmount !== undefined
                            ? `${hist.payoutAmount} ${colTok}`
                            : `${hist.margin} ${colTok}`}
                        </td>
                        <td className="py-2.5 font-mono text-[11px] text-ink-3 text-right">
                          {hist.closeExplorerUrl ? (
                            <a
                              href={hist.closeExplorerUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-500 hover:underline inline-flex items-center gap-1 font-semibold"
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
          </div>
        )}
      </div>
    );
  }
}
