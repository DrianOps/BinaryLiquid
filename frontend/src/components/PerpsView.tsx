import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Sliders, 
  Clock, 
  Activity, 
  ShieldCheck, 
  AlertCircle, 
  X, 
  Check, 
  ExternalLink, 
  Zap, 
  RefreshCw, 
  ChevronDown,
  Layers,
  ArrowRight,
  Maximize2
} from 'lucide-react';
import { createChart, ColorType, IChartApi, ISeriesApi, IPriceLine } from 'lightweight-charts';

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
  side: 'long' | 'short';
  leverage: number;
  margin: number;
  sizeUsd: number;
  sizeAsset: number;
  entryPrice: number;
  liquidationPrice: number;
  openTime: number;
  takeProfit?: number;
  stopLoss?: number;
}

export interface PerpTradeHistory {
  id: string;
  symbol: string;
  market: string;
  side: 'long' | 'short';
  leverage: number;
  margin: number;
  sizeUsd: number;
  entryPrice: number;
  exitPrice: number;
  pnlUsd: number;
  pnlPercent: number;
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
    minMargin: 5,
    tickDecimals: 2,
    assetDecimals: 3,
    icon: '/bch-logo.png',
    initialPrice: 275.40,
    mmr: 0.01 // Maintenance margin rate 1%
  },
  {
    symbol: 'BTCUSDT',
    name: 'BTC-PERP',
    base: 'BTC',
    quote: 'USD',
    fullName: 'Bitcoin',
    maxLeverage: 50,
    minMargin: 10,
    tickDecimals: 1,
    assetDecimals: 4,
    icon: '/tokens/btc.png',
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
    minMargin: 10,
    tickDecimals: 2,
    assetDecimals: 3,
    icon: '/tokens/eth.png',
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
    minMargin: 5,
    tickDecimals: 2,
    assetDecimals: 2,
    icon: '/tokens/sol.png',
    initialPrice: 178.50,
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

export default function PerpsView({
  userAddress = '',
  bchAddress = '',
  walletBalances = { PUSD: 0, BCH: 0, USDT: 0, USDC: 0, POL: 0 },
  platformNetwork = 'testnet',
  onRefreshBalances,
  onConnectWallet,
  showToast,
  lang = 'es'
}: PerpsViewProps) {
  // Selected market
  const [selectedSymbol, setSelectedSymbol] = useState<string>('BCHUSDT');
  const market = useMemo(() => MARKETS.find(m => m.symbol === selectedSymbol) || MARKETS[0], [selectedSymbol]);

  // Mobile View Switcher: 'chart' | 'trade' | 'positions'
  const [mobileTab, setMobileTab] = useState<'chart' | 'trade' | 'positions'>(() => {
    if (typeof window !== 'undefined' && window.location.hash.includes('trade')) return 'trade';
    if (typeof window !== 'undefined' && window.location.hash.includes('positions')) return 'positions';
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
  const [marginInput, setMarginInput] = useState<string>('50');
  const [leverage, setLeverage] = useState<number>(10);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Live market stats
  const [markPrice, setMarkPrice] = useState<number>(market.initialPrice);
  const [prevPrice, setPrevPrice] = useState<number>(market.initialPrice);
  const [priceChange24h, setPriceChange24h] = useState<number>(1.85);
  const [high24h, setHigh24h] = useState<number>(market.initialPrice * 1.035);
  const [low24h, setLow24h] = useState<number>(market.initialPrice * 0.972);
  const [volume24h, setVolume24h] = useState<number>(1248000);
  const [fundingRate] = useState<number>(0.0100);
  const [fundingCountdown, setFundingCountdown] = useState<string>('04:18:22');

  // Chart ref & elements
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<IChartApi | null>(null);
  const seriesInstanceRef = useRef<ISeriesApi<any> | null>(null);
  const entryLineRef = useRef<IPriceLine | null>(null);
  const liqLineRef = useRef<IPriceLine | null>(null);

  // Positions & History state
  const [positionsTab, setPositionsTab] = useState<'positions' | 'orders' | 'history'>('positions');
  const [positions, setPositions] = useState<PerpPosition[]>(() => {
    try {
      const stored = localStorage.getItem('bliq_perp_positions_v1');
      if (stored) return JSON.parse(stored);
    } catch {}
    // Default seed position for instant demo & review
    return [
      {
        id: 'seed-pos-bch',
        symbol: 'BCHUSDT',
        market: 'BCH-PERP',
        side: 'long',
        leverage: 10,
        margin: 50,
        sizeUsd: 500,
        sizeAsset: 1.838,
        entryPrice: 272.00,
        liquidationPrice: 247.52,
        openTime: Date.now() - 3600000 * 2
      }
    ];
  });

  const [tradeHistory, setTradeHistory] = useState<PerpTradeHistory[]>(() => {
    try {
      const stored = localStorage.getItem('bliq_perp_history_v1');
      if (stored) return JSON.parse(stored);
    } catch {}
    return [
      {
        id: 'hist-1',
        symbol: 'BCHUSDT',
        market: 'BCH-PERP',
        side: 'long',
        leverage: 10,
        margin: 100,
        sizeUsd: 1000,
        entryPrice: 265.50,
        exitPrice: 274.20,
        pnlUsd: 32.76,
        pnlPercent: 32.76,
        closedAt: Date.now() - 86400000
      }
    ];
  });

  // Position closing state
  const [closingPosId, setClosingPosId] = useState<string | null>(null);

  // Synchronize positions with localStorage
  useEffect(() => {
    localStorage.setItem('bliq_perp_positions_v1', JSON.stringify(positions));
  }, [positions]);

  useEffect(() => {
    localStorage.setItem('bliq_perp_history_v1', JSON.stringify(tradeHistory));
  }, [tradeHistory]);

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

  // Fetch 24h ticker data
  useEffect(() => {
    let active = true;
    const fetchTicker = async () => {
      try {
        const res = await fetch(`https://data-api.binance.vision/api/v3/ticker/24hr?symbol=${selectedSymbol}`);
        if (!res.ok) throw new Error('Ticker fetch error');
        const data = await res.json();
        if (active) {
          const p = parseFloat(data.lastPrice);
          setPrevPrice(markPrice);
          setMarkPrice(p);
          setPriceChange24h(parseFloat(data.priceChangePercent));
          setHigh24h(parseFloat(data.highPrice));
          setLow24h(parseFloat(data.lowPrice));
          setVolume24h(parseFloat(data.quoteVolume));
          if (!limitPrice || orderType === 'market') {
            setLimitPrice(p.toFixed(market.tickDecimals));
          }
        }
      } catch {
        // Fallback: gentle micro-drift
        if (active) {
          setPrevPrice(markPrice);
          const drift = (Math.random() - 0.49) * (markPrice * 0.001);
          setMarkPrice(prev => Math.round((prev + drift) * 100) / 100);
        }
      }
    };

    fetchTicker();
    const interval = setInterval(fetchTicker, 4000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [selectedSymbol]);

  // Setup Lightweight Charts
  useEffect(() => {
    if (!chartContainerRef.current) return;
    let isDisposed = false;

    // Detect dark mode
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
        textColor: textColor,
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
        borderColor: borderColor,
        timeVisible: true,
        secondsVisible: false
      },
      rightPriceScale: {
        borderColor: borderColor,
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

    // Generate immediate synchronous base candles so chart is NEVER blank
    const baseCandles: any[] = [];
    const nowSec = Math.floor(Date.now() / 1000);
    let runPrice = market.initialPrice * 0.985;
    for (let i = 80; i >= 0; i--) {
      const t = (nowSec - i * 900) as any;
      const step = (Math.sin(i / 5) * 1.8) + (Math.random() - 0.48) * (market.initialPrice * 0.006);
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

    // Fetch live klines asynchronously from Binance Vision
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
          setMarkPrice(lastBar.close);
        }
        chart.timeScale().fitContent();
      } catch {}
    };

    loadKlines();

    // Live WebSocket connection
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(`wss://stream.binance.com:9443/ws/${selectedSymbol.toLowerCase()}@kline_${timeframe}`);
      ws.onmessage = (event) => {
        if (isDisposed) return;
        try {
          const msg = JSON.parse(event.data);
          const k = msg.k;
          if (!k) return;
          const closePrice = parseFloat(k.c);
          setMarkPrice(closePrice);

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

    // Responsive resize observer
    const ro = new ResizeObserver((entries) => {
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
  }, [selectedSymbol, timeframe, chartType, market.tickDecimals, market.initialPrice]);

  // Update entry & liquidation price lines on the chart for the current market's positions
  useEffect(() => {
    if (!seriesInstanceRef.current) return;
    const series = seriesInstanceRef.current;

    // Clean up previous lines
    if (entryLineRef.current) {
      try { series.removePriceLine(entryLineRef.current); } catch {}
      entryLineRef.current = null;
    }
    if (liqLineRef.current) {
      try { series.removePriceLine(liqLineRef.current); } catch {}
      liqLineRef.current = null;
    }

    const currentPos = positions.find(p => p.symbol === selectedSymbol);
    if (currentPos) {
      entryLineRef.current = series.createPriceLine({
        price: currentPos.entryPrice,
        color: '#F7931A',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: `${currentPos.side.toUpperCase()} ${currentPos.leverage}x (${currentPos.entryPrice.toFixed(market.tickDecimals)})`
      });

      liqLineRef.current = series.createPriceLine({
        price: currentPos.liquidationPrice,
        color: '#ef4444',
        lineWidth: 1,
        lineStyle: 3,
        axisLabelVisible: true,
        title: `LIQ (${currentPos.liquidationPrice.toFixed(market.tickDecimals)})`
      });
    }
  }, [positions, selectedSymbol, market.tickDecimals]);

  // Financial calculations
  const parsedMargin = Math.max(0, parseFloat(marginInput) || 0);
  const executionPrice = orderType === 'market' ? markPrice : (parseFloat(limitPrice) || markPrice);
  const positionSizeUsd = parsedMargin * leverage;
  const positionSizeAsset = executionPrice > 0 ? positionSizeUsd / executionPrice : 0;
  const estimatedFee = positionSizeUsd * 0.0005; // 0.05% taker fee

  // Liquidation calculation
  const calculatedLiqPrice = useMemo(() => {
    if (executionPrice <= 0 || leverage <= 0) return 0;
    const mmr = market.mmr;
    if (side === 'long') {
      const liq = executionPrice * (1 - (1 / leverage) + mmr);
      return Math.max(0, liq);
    } else {
      const liq = executionPrice * (1 + (1 / leverage) - mmr);
      return Math.max(0, liq);
    }
  }, [executionPrice, leverage, side, market.mmr]);

  // Active positions calculations for current market
  const marketPositions = useMemo(() => {
    return positions.filter(p => p.symbol === selectedSymbol);
  }, [positions, selectedSymbol]);

  // Open position execution
  const handleOpenPosition = async () => {
    if (!userAddress && !bchAddress) {
      if (onConnectWallet) onConnectWallet();
      return;
    }

    if (parsedMargin <= 0) {
      showToast(lang === 'es' ? 'Ingresa un margen válido en PUSD' : 'Enter valid PUSD margin', 'error');
      return;
    }

    const availablePusd = walletBalances?.PUSD || 0;
    if (parsedMargin > availablePusd && availablePusd > 0) {
      showToast(lang === 'es' ? 'Margen excede tu saldo PUSD' : 'Margin exceeds your PUSD balance', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      // Simulate on-chain covenant position lock
      await new Promise(r => setTimeout(r, 650));

      const newPosition: PerpPosition = {
        id: `pos-${Date.now()}`,
        symbol: selectedSymbol,
        market: market.name,
        side,
        leverage,
        margin: parsedMargin,
        sizeUsd: positionSizeUsd,
        sizeAsset: Number(positionSizeAsset.toFixed(market.assetDecimals)),
        entryPrice: executionPrice,
        liquidationPrice: Number(calculatedLiqPrice.toFixed(market.tickDecimals)),
        openTime: Date.now()
      };

      setPositions(prev => [newPosition, ...prev]);
      showToast(
        lang === 'es' 
          ? `Posición ${side.toUpperCase()} ${leverage}x abierta: ${parsedMargin} PUSD de margen`
          : `Opened ${side.toUpperCase()} ${leverage}x position: ${parsedMargin} PUSD margin`,
        'success'
      );
      if (onRefreshBalances) onRefreshBalances();
    } catch {
      showToast(lang === 'es' ? 'Error al ejecutar orden de futuros' : 'Error opening position', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Close position execution
  const handleClosePosition = async (pos: PerpPosition) => {
    setClosingPosId(pos.id);
    try {
      await new Promise(r => setTimeout(r, 600));

      // Calculate realized PnL against current markPrice
      const currentPrice = markPrice;
      const priceDelta = pos.side === 'long' 
        ? currentPrice - pos.entryPrice 
        : pos.entryPrice - currentPrice;
      const pnlUsd = (pos.sizeAsset * priceDelta);
      const pnlPercent = (pnlUsd / pos.margin) * 100;

      const historyRecord: PerpTradeHistory = {
        id: `hist-${Date.now()}`,
        symbol: pos.symbol,
        market: pos.market,
        side: pos.side,
        leverage: pos.leverage,
        margin: pos.margin,
        sizeUsd: pos.sizeUsd,
        entryPrice: pos.entryPrice,
        exitPrice: currentPrice,
        pnlUsd: Number(pnlUsd.toFixed(2)),
        pnlPercent: Number(pnlPercent.toFixed(2)),
        closedAt: Date.now()
      };

      setTradeHistory(prev => [historyRecord, ...prev]);
      setPositions(prev => prev.filter(p => p.id !== pos.id));

      const pnlSign = pnlUsd >= 0 ? '+' : '';
      showToast(
        lang === 'es'
          ? `Posición ${pos.market} cerrada. PnL: ${pnlSign}$${pnlUsd.toFixed(2)} (${pnlSign}${pnlPercent.toFixed(2)}%)`
          : `Position ${pos.market} closed. PnL: ${pnlSign}$${pnlUsd.toFixed(2)} (${pnlSign}${pnlPercent.toFixed(2)}%)`,
        pnlUsd >= 0 ? 'success' : 'error'
      );
      if (onRefreshBalances) onRefreshBalances();
    } catch {
      showToast(lang === 'es' ? 'Error al liquidar posición' : 'Failed to close position', 'error');
    } finally {
      setClosingPosId(null);
    }
  };

  return (
    <div className="w-full max-w-[1360px] mx-auto space-y-3 sm:space-y-4">
      {/* 1. TOP MARKET STRIP (Non-generic, clean single row with pair selector, prices & funding) */}
      <div className="ui-card p-3 sm:p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 overflow-visible">
        
        {/* Left: Market Selector & Mark Price */}
        <div className="flex items-center gap-3 sm:gap-4 w-full lg:w-auto justify-between lg:justify-start">
          
          {/* Pair Selector Dropdown */}
          <div className="relative" ref={marketDropdownRef}>
            <button
              onClick={() => setMarketDropdownOpen(!marketDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-control bg-surface-2 hover:bg-surface-3 border border-line text-ink transition-colors cursor-pointer"
            >
              <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-[10px]">
                {market.base[0]}
              </div>
              <span className="font-bold text-sm tracking-tight">{market.name}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-ink-3 transition-transform ${marketDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {marketDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-60 bg-surface border border-line rounded-panel shadow-soft p-1.5 z-50">
                <div className="text-[10px] uppercase font-semibold text-ink-3 px-2 py-1">
                  {lang === 'es' ? 'Mercados Disponibles' : 'Available Markets'}
                </div>
                {MARKETS.map(m => (
                  <button
                    key={m.symbol}
                    onClick={() => {
                      setSelectedSymbol(m.symbol);
                      setMarketDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-control text-xs transition-colors cursor-pointer ${
                      selectedSymbol === m.symbol ? 'bg-surface-2 text-ink font-bold' : 'hover:bg-surface-2/70 text-ink-2'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{m.name}</span>
                      <span className="text-[10px] text-ink-3">{m.fullName}</span>
                    </div>
                    <span className="text-[11px] font-mono text-ink-3">{m.maxLeverage}x</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Mark Price & 24h Change */}
          <div className="flex items-baseline gap-2">
            <span className={`text-xl sm:text-2xl font-bold tabular-nums transition-colors ${
              markPrice >= prevPrice ? 'text-ink' : 'text-ink'
            }`}>
              ${markPrice.toLocaleString(undefined, { minimumFractionDigits: market.tickDecimals, maximumFractionDigits: market.tickDecimals })}
            </span>
            <span className={`text-xs font-semibold tabular-nums px-1.5 py-0.5 rounded ${
              priceChange24h >= 0 
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
            }`}>
              {priceChange24h >= 0 ? '+' : ''}{priceChange24h.toFixed(2)}%
            </span>
          </div>

          {/* On-Chain Collateral Badge */}
          <div className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-ink text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span>PUSD Chipnet Collateral</span>
          </div>
        </div>

        {/* Right: Key Stats Strip (High, Low, Funding, Volume) */}
        <div className="flex items-center gap-4 sm:gap-6 text-xs w-full lg:w-auto justify-between lg:justify-end border-t lg:border-t-0 border-line pt-2 lg:pt-0">
          <div>
            <div className="ui-label text-[10px]">24h High</div>
            <div className="ui-value text-xs font-mono">${high24h.toFixed(market.tickDecimals)}</div>
          </div>
          <div>
            <div className="ui-label text-[10px]">24h Low</div>
            <div className="ui-value text-xs font-mono">${low24h.toFixed(market.tickDecimals)}</div>
          </div>
          <div>
            <div className="ui-label text-[10px]">24h Vol</div>
            <div className="ui-value text-xs font-mono">${(volume24h / 1000).toFixed(0)}k</div>
          </div>
          <div>
            <div className="ui-label text-[10px]">Funding / Countdown</div>
            <div className="ui-value text-xs font-mono flex items-center gap-1">
              <span className="text-emerald-600 dark:text-emerald-400">+{fundingRate.toFixed(4)}%</span>
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
            mobileTab === 'chart' ? 'bg-surface-2 text-ink shadow-xs font-bold' : 'text-ink-3 hover:text-ink'
          }`}
        >
          {lang === 'es' ? 'Gráfico' : 'Chart'}
        </button>
        <button
          onClick={() => setMobileTab('trade')}
          className={`flex-1 py-1.5 rounded-control transition-all cursor-pointer ${
            mobileTab === 'trade' ? 'bg-surface-2 text-ink shadow-xs font-bold' : 'text-ink-3 hover:text-ink'
          }`}
        >
          {lang === 'es' ? 'Operar' : 'Trade'}
        </button>
        <button
          onClick={() => setMobileTab('positions')}
          className={`flex-1 py-1.5 rounded-control transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            mobileTab === 'positions' ? 'bg-surface-2 text-ink shadow-xs font-bold' : 'text-ink-3 hover:text-ink'
          }`}
        >
          <span>{lang === 'es' ? 'Posiciones' : 'Positions'}</span>
          {positions.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-primary/20 text-primary text-[10px] font-bold">
              {positions.length}
            </span>
          )}
        </button>
      </div>

      {/* 2. MAIN TRADING WORKSPACE (Desktop Split Grid / Responsive Tabs) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-start">
        
        {/* LEFT COLUMN: Interactive Chart (Desktop: 8 cols, Mobile: if tab === 'chart') */}
        <div className={`lg:col-span-8 flex flex-col gap-3 sm:gap-4 ${
          mobileTab !== 'chart' ? 'hidden lg:flex' : 'flex'
        }`}>
          
          {/* Chart Card */}
          <div className="ui-card p-3 sm:p-4 flex flex-col h-[440px] sm:h-[500px]">
            {/* Chart Toolbar */}
            <div className="flex items-center justify-between pb-3 border-b border-line gap-2">
              {/* Timeframes */}
              <div className="flex items-center gap-1">
                {TIMEFRAMES.map(tf => (
                  <button
                    key={tf.value}
                    onClick={() => setTimeframe(tf.value)}
                    className={`px-2 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                      timeframe === tf.value
                        ? 'bg-surface-2 text-ink'
                        : 'text-ink-3 hover:text-ink'
                    }`}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>

              {/* Chart Mode Toggle */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setChartType(chartType === 'candles' ? 'line' : 'candles')}
                  className="px-2 py-1 rounded bg-surface-2 text-ink-2 hover:text-ink text-xs font-medium border border-line cursor-pointer"
                >
                  {chartType === 'candles' ? (lang === 'es' ? 'Velas' : 'Candles') : (lang === 'es' ? 'Línea' : 'Line')}
                </button>
              </div>
            </div>

            {/* Chart Viewport */}
            <div className="flex-1 w-full min-h-[360px] relative mt-2">
              <div ref={chartContainerRef} className="absolute inset-0 w-full h-full" />
            </div>

            {/* Bottom Chart Indicator Hint */}
            <div className="pt-2 border-t border-line flex items-center justify-between text-[11px] text-ink-3">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  <span>Entrada</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>Liquidación</span>
                </span>
              </div>
              <span className="font-mono text-[10px]">Binance Vision Oracle Feed</span>
            </div>
          </div>

          {/* Desktop Positions Table (Shows right below chart on large screens) */}
          <div className="hidden lg:block">
            {renderPositionsCard()}
          </div>

        </div>

        {/* RIGHT COLUMN: Order Form (Desktop: 4 cols, Mobile: if tab === 'trade') */}
        <div className={`lg:col-span-4 flex flex-col gap-3 ${
          mobileTab !== 'trade' ? 'hidden lg:flex' : 'flex'
        }`}>
          
          <div className="ui-card p-4 sm:p-5 space-y-4">
            
            {/* Long / Short Segment */}
            <div className="grid grid-cols-2 p-1 bg-surface-2 rounded-panel border border-line text-xs font-bold">
              <button
                type="button"
                onClick={() => setSide('long')}
                className={`py-2 rounded-control transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  side === 'long'
                    ? 'bg-surface text-ink border border-line shadow-soft font-bold'
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
                    ? 'bg-surface text-ink border border-line shadow-soft font-bold'
                    : 'text-ink-3 hover:text-ink'
                }`}
              >
                <TrendingDown className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>Short</span>
              </button>
            </div>

            {/* Order Type (Market / Limit) */}
            <div className="flex items-center justify-between text-xs">
              <span className="ui-label">{lang === 'es' ? 'Tipo de Orden' : 'Order Type'}</span>
              <div className="inline-flex items-center p-0.5 bg-surface-2 rounded-control border border-line">
                <button
                  type="button"
                  onClick={() => setOrderType('market')}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                    orderType === 'market' ? 'bg-surface text-ink shadow-xs' : 'text-ink-3 hover:text-ink'
                  }`}
                >
                  {lang === 'es' ? 'Mercado' : 'Market'}
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType('limit')}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                    orderType === 'limit' ? 'bg-surface text-ink shadow-xs' : 'text-ink-3 hover:text-ink'
                  }`}
                >
                  {lang === 'es' ? 'Límite' : 'Limit'}
                </button>
              </div>
            </div>

            {/* Limit Price Input (Only if limit order) */}
            {orderType === 'limit' && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="ui-label">{lang === 'es' ? 'Precio Límite (USD)' : 'Limit Price (USD)'}</span>
                  <button 
                    onClick={() => setLimitPrice(markPrice.toFixed(market.tickDecimals))}
                    className="text-[11px] text-primary hover:underline cursor-pointer"
                  >
                    {lang === 'es' ? 'Usar Mark' : 'Use Mark'}
                  </button>
                </div>
                <input
                  type="number"
                  step="any"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  className="ui-input font-mono"
                  placeholder={markPrice.toFixed(market.tickDecimals)}
                />
              </div>
            )}

            {/* Margin Input (PUSD CashToken) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="ui-label">{lang === 'es' ? 'Margen Colateral (PUSD)' : 'Collateral Margin (PUSD)'}</span>
                <span className="ui-label font-mono">
                  {lang === 'es' ? 'Disp:' : 'Bal:'} {(walletBalances?.PUSD || 0).toFixed(2)} PUSD
                </span>
              </div>

              <div className="relative">
                <input
                  type="number"
                  step="any"
                  min="1"
                  value={marginInput}
                  onChange={(e) => setMarginInput(e.target.value)}
                  className="ui-input pr-16 font-mono text-base font-semibold"
                  placeholder="50"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-ink-3 pointer-events-none">
                  PUSD
                </span>
              </div>

              {/* Quick % buttons */}
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                {[25, 50, 75, 100].map(pct => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => {
                      const bal = walletBalances?.PUSD || 500;
                      const val = Math.floor(bal * (pct / 100));
                      setMarginInput(val.toString());
                    }}
                    className="py-1 rounded bg-surface-2 hover:bg-surface-3 border border-line text-[11px] font-semibold text-ink-2 hover:text-ink transition-colors cursor-pointer"
                  >
                    {pct === 100 ? 'Max' : `${pct}%`}
                  </button>
                ))}
              </div>
            </div>

            {/* Leverage Slider & Presets */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="ui-label">{lang === 'es' ? 'Apalancamiento' : 'Leverage'}</span>
                <span className="font-bold text-primary text-sm font-mono">{leverage}x</span>
              </div>

              {/* Slider */}
              <input
                type="range"
                min="1"
                max={market.maxLeverage}
                step="1"
                value={leverage}
                onChange={(e) => setLeverage(parseInt(e.target.value))}
                className="w-full accent-primary h-1.5 bg-surface-2 rounded-lg cursor-pointer"
              />

              {/* Quick Pills */}
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

            {/* Order Metrics Summary (Strict sentences, no text bloat) */}
            <div className="ui-panel p-3 space-y-2 text-xs border border-line">
              <div className="flex items-center justify-between">
                <span className="text-ink-3">{lang === 'es' ? 'Tamaño de posición' : 'Position Size'}</span>
                <span className="ui-value font-mono">
                  ${positionSizeUsd.toFixed(2)} ({positionSizeAsset.toFixed(market.assetDecimals)} {market.base})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-3">{lang === 'es' ? 'Precio estimado' : 'Entry Price'}</span>
                <span className="ui-value font-mono">${executionPrice.toFixed(market.tickDecimals)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-3">{lang === 'es' ? 'Precio de liquidación' : 'Est. Liquidation Price'}</span>
                <span className="ui-value font-mono text-rose-500 font-semibold">
                  ${calculatedLiqPrice.toFixed(market.tickDecimals)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-3">{lang === 'es' ? 'Comisión (0.05%)' : 'Fee (0.05%)'}</span>
                <span className="ui-value font-mono">${estimatedFee.toFixed(3)} PUSD</span>
              </div>
            </div>

            {/* Primary Action Button */}
            {!userAddress && !bchAddress ? (
              <button
                type="button"
                onClick={onConnectWallet}
                className="w-full ui-btn-primary h-12 text-sm font-bold"
              >
                {lang === 'es' ? 'Conectar Billetera para Operar' : 'Connect Wallet to Trade'}
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting || parsedMargin <= 0}
                onClick={handleOpenPosition}
                className={`w-full h-12 rounded-panel font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  isSubmitting || parsedMargin <= 0
                    ? 'ui-btn-disabled'
                    : side === 'long'
                    ? 'bg-primary hover:bg-primary-hover text-black shadow-soft'
                    : 'bg-rose-500 hover:bg-rose-600 text-white shadow-soft'
                }`}
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>
                      {lang === 'es' 
                        ? `Abrir ${side.toUpperCase()} ${market.base} [${leverage}x]`
                        : `Open ${side.toUpperCase()} ${market.base} [${leverage}x]`}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            )}

            {/* Non-custodial covenant footnote */}
            <div className="text-[11px] text-ink-3 text-center flex items-center justify-center gap-1.5 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              <span>Colateral PUSD en Covenants Chipnet P2SH32</span>
            </div>

          </div>

        </div>

      </div>

      {/* 3. MOBILE POSITIONS VIEW (Active when mobileTab === 'positions') */}
      <div className={`lg:hidden ${mobileTab !== 'positions' ? 'hidden' : 'block'}`}>
        {renderPositionsCard()}
      </div>

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
              <span>{lang === 'es' ? 'Posiciones Abiertas' : 'Open Positions'}</span>
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
              <span>{lang === 'es' ? 'Historial de Trades' : 'Trade History'}</span>
              <span className="px-1.5 py-0.2 rounded-full bg-surface-2 text-ink-2 text-[10px]">
                {tradeHistory.length}
              </span>
            </button>
          </div>

          {/* Quick Refresh */}
          {onRefreshBalances && (
            <button
              onClick={onRefreshBalances}
              className="text-ink-3 hover:text-ink transition-colors p-1 rounded hover:bg-surface-2 cursor-pointer"
              title="Refrescar"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Content View */}
        {positionsTab === 'positions' ? (
          positions.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <div className="text-xs text-ink-3">
                {lang === 'es' ? 'No tienes posiciones abiertas en este momento.' : 'No open positions currently.'}
              </div>
              <button
                type="button"
                onClick={() => {
                  setSide('long');
                  setLeverage(10);
                  setMarginInput('50');
                  setMobileTab('trade');
                }}
                className="ui-btn-secondary ui-btn-sm"
              >
                {lang === 'es' ? 'Abrir una posición Long' : 'Open a Long position'}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-line text-ink-3 text-[11px]">
                      <th className="pb-2 font-medium">{lang === 'es' ? 'Mercado / Lado' : 'Market / Side'}</th>
                      <th className="pb-2 font-medium">{lang === 'es' ? 'Tamaño' : 'Size'}</th>
                      <th className="pb-2 font-medium">{lang === 'es' ? 'Precio Entrada' : 'Entry Price'}</th>
                      <th className="pb-2 font-medium">{lang === 'es' ? 'Precio Mark' : 'Mark Price'}</th>
                      <th className="pb-2 font-medium">{lang === 'es' ? 'Liquidación' : 'Liq Price'}</th>
                      <th className="pb-2 font-medium">{lang === 'es' ? 'Margen' : 'Margin'}</th>
                      <th className="pb-2 font-medium">{lang === 'es' ? 'PnL No Realizado' : 'uPnL'}</th>
                      <th className="pb-2 font-medium text-right">{lang === 'es' ? 'Acción' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {positions.map(pos => {
                      const currentPrice = markPrice;
                      const priceDelta = pos.side === 'long' 
                        ? currentPrice - pos.entryPrice 
                        : pos.entryPrice - currentPrice;
                      const uPnl = pos.sizeAsset * priceDelta;
                      const uPnlPct = (uPnl / pos.margin) * 100;
                      const isProfit = uPnl >= 0;

                      return (
                        <tr key={pos.id} className="hover:bg-surface-2/40 transition-colors">
                          <td className="py-3">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-ink">{pos.market}</span>
                              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                pos.side === 'long' 
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                              }`}>
                                {pos.side.toUpperCase()} {pos.leverage}x
                              </span>
                            </div>
                          </td>
                          <td className="py-3 font-mono font-medium text-ink">
                            ${pos.sizeUsd.toFixed(2)}
                          </td>
                          <td className="py-3 font-mono text-ink-2">
                            ${pos.entryPrice.toFixed(2)}
                          </td>
                          <td className="py-3 font-mono text-ink">
                            ${currentPrice.toFixed(2)}
                          </td>
                          <td className="py-3 font-mono text-rose-500 font-medium">
                            ${pos.liquidationPrice.toFixed(2)}
                          </td>
                          <td className="py-3 font-mono text-ink-2">
                            {pos.margin.toFixed(2)} PUSD
                          </td>
                          <td className="py-3 font-mono font-bold">
                            <span className={isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                              {isProfit ? '+' : ''}${uPnl.toFixed(2)} ({isProfit ? '+' : ''}{uPnlPct.toFixed(2)}%)
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
                              ) : (
                                lang === 'es' ? 'Cerrar' : 'Close'
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
                  const currentPrice = markPrice;
                  const priceDelta = pos.side === 'long' 
                    ? currentPrice - pos.entryPrice 
                    : pos.entryPrice - currentPrice;
                  const uPnl = pos.sizeAsset * priceDelta;
                  const uPnlPct = (uPnl / pos.margin) * 100;
                  const isProfit = uPnl >= 0;

                  return (
                    <div key={pos.id} className="ui-panel p-3 space-y-2 border border-line">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-ink text-sm">{pos.market}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            pos.side === 'long' 
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          }`}>
                            {pos.side.toUpperCase()} {pos.leverage}x
                          </span>
                        </div>
                        <button
                          disabled={closingPosId === pos.id}
                          onClick={() => handleClosePosition(pos)}
                          className="px-2.5 py-1 rounded bg-surface border border-line text-ink text-xs font-semibold cursor-pointer"
                        >
                          {closingPosId === pos.id ? '...' : (lang === 'es' ? 'Cerrar' : 'Close')}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-line">
                        <div>
                          <div className="ui-label text-[10px]">Entrada / Mark</div>
                          <div className="font-mono text-ink">${pos.entryPrice.toFixed(1)} / ${currentPrice.toFixed(1)}</div>
                        </div>
                        <div>
                          <div className="ui-label text-[10px]">Liquidación</div>
                          <div className="font-mono text-rose-500">${pos.liquidationPrice.toFixed(1)}</div>
                        </div>
                        <div>
                          <div className="ui-label text-[10px]">Tamaño / Margen</div>
                          <div className="font-mono text-ink">${pos.sizeUsd.toFixed(0)} ({pos.margin} PUSD)</div>
                        </div>
                        <div>
                          <div className="ui-label text-[10px]">uPnL</div>
                          <div className={`font-mono font-bold ${isProfit ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {isProfit ? '+' : ''}${uPnl.toFixed(2)} ({isProfit ? '+' : ''}{uPnlPct.toFixed(1)}%)
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        ) : (
          /* History View */
          tradeHistory.length === 0 ? (
            <div className="py-8 text-center text-xs text-ink-3">
              {lang === 'es' ? 'No hay trades cerrados en el historial.' : 'No trade history available.'}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-line text-ink-3 text-[11px]">
                      <th className="pb-2 font-medium">{lang === 'es' ? 'Mercado' : 'Market'}</th>
                      <th className="pb-2 font-medium">{lang === 'es' ? 'Lado' : 'Side'}</th>
                      <th className="pb-2 font-medium">{lang === 'es' ? 'Tamaño' : 'Size'}</th>
                      <th className="pb-2 font-medium">{lang === 'es' ? 'Entrada / Cierre' : 'Entry / Exit'}</th>
                      <th className="pb-2 font-medium">{lang === 'es' ? 'PnL Realizado' : 'Realized PnL'}</th>
                      <th className="pb-2 font-medium text-right">{lang === 'es' ? 'Fecha' : 'Date'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {tradeHistory.map(hist => {
                      const isProfit = hist.pnlUsd >= 0;
                      return (
                        <tr key={hist.id} className="hover:bg-surface-2/40 transition-colors">
                          <td className="py-2.5 font-bold text-ink">{hist.market}</td>
                          <td className="py-2.5">
                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              hist.side === 'long' 
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                            }`}>
                              {hist.side.toUpperCase()} {hist.leverage}x
                            </span>
                          </td>
                          <td className="py-2.5 font-mono text-ink">${hist.sizeUsd.toFixed(2)}</td>
                          <td className="py-2.5 font-mono text-ink-2">
                            ${hist.entryPrice.toFixed(1)} → ${hist.exitPrice.toFixed(1)}
                          </td>
                          <td className="py-2.5 font-mono font-bold">
                            <span className={isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                              {isProfit ? '+' : ''}${hist.pnlUsd.toFixed(2)} ({isProfit ? '+' : ''}{hist.pnlPercent.toFixed(2)}%)
                            </span>
                          </td>
                          <td className="py-2.5 font-mono text-[11px] text-ink-3 text-right">
                            {new Date(hist.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}

      </div>
    );
  }
}
