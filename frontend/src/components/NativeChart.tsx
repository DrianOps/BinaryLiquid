import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, PriceLineOptions } from 'lightweight-charts';

export default function NativeChart({ 
  symbol = 'BTCUSDT', 
  interval = '1m', 
  activeBets = [], 
  chartType = 'candlestick', 
  showSMA = false, 
  showBollinger = false, 
  onPriceUpdate 
}: { 
  symbol?: string, 
  interval?: string, 
  activeBets: any[], 
  chartType?: string, 
  showSMA?: boolean, 
  showBollinger?: boolean, 
  onPriceUpdate?: (p: number) => void 
}) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);
  const smaSeriesRef = useRef<any>(null);
  const bbUpperRef = useRef<any>(null);
  const bbLowerRef = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const linesRef = useRef<{ [key: string]: any }>({});
  
  // Data refs to calculate indicators on the fly
  const ohlcDataRef = useRef<any[]>([]);

  // Helper: Calculate indicators
  const calculateIndicators = (data: any[]) => {
     let smaData = [];
     let bbUpper = [];
     let bbLower = [];
     const period = 20;
     
     for (let i = 0; i < data.length; i++) {
        if (i < period - 1) continue;
        
        // SMA
        let sum = 0;
        for (let j = 0; j < period; j++) {
           sum += data[i - j].close;
        }
        const sma = sum / period;
        smaData.push({ time: data[i].time, value: sma });
        
        // Bollinger Bands (2 std dev)
        let varianceSum = 0;
        for (let j = 0; j < period; j++) {
           varianceSum += Math.pow(data[i - j].close - sma, 2);
        }
        const stdDev = Math.sqrt(varianceSum / period);
        bbUpper.push({ time: data[i].time, value: sma + (2 * stdDev) });
        bbLower.push({ time: data[i].time, value: sma - (2 * stdDev) });
     }
     
     return { smaData, bbUpper, bbLower };
  };

  useEffect(() => {
    let isDisposed = false;
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: { background: { type: ColorType.Solid, color: '#ffffff' }, textColor: '#333' },
      grid: { vertLines: { color: '#f0f3fa' }, horzLines: { color: '#f0f3fa' } },
      timeScale: { timeVisible: true, secondsVisible: false },
      rightPriceScale: { borderColor: '#f0f3fa' },
      autoSize: true,
    });
    chartRef.current = chart;

    let mainSeries;
    if (chartType === 'area') {
      mainSeries = chart.addAreaSeries({ lineColor: '#2AABEE', topColor: 'rgba(42, 171, 238, 0.4)', bottomColor: 'rgba(42, 171, 238, 0.0)', lineWidth: 2 });
    } else if (chartType === 'bar') {
      mainSeries = chart.addBarSeries({ upColor: '#10b981', downColor: '#ef4444' });
    } else if (chartType === 'line') {
      mainSeries = chart.addLineSeries({ color: '#2AABEE', lineWidth: 2 });
    } else {
      mainSeries = chart.addCandlestickSeries({
        upColor: '#10b981', downColor: '#ef4444', borderVisible: false,
        wickUpColor: '#10b981', wickDownColor: '#ef4444'
      });
    }
    seriesRef.current = mainSeries;

    // Create Indicator Series (hidden by default unless data is set)
    smaSeriesRef.current = chart.addLineSeries({ color: '#F59E0B', lineWidth: 1 });
    bbUpperRef.current = chart.addLineSeries({ color: '#6366F1', lineWidth: 1, lineStyle: 2 });
    bbLowerRef.current = chart.addLineSeries({ color: '#6366F1', lineWidth: 1, lineStyle: 2 });

    // Fetch history
    fetch(`https://data-api.binance.vision/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=1000`)
      .then(res => res.json())
      .then(data => {
        if (isDisposed) return;
        let formattedData = data.map((d: any) => ({
          time: (d[0] / 1000) as any, open: parseFloat(d[1]), high: parseFloat(d[2]),
          low: parseFloat(d[3]), close: parseFloat(d[4]), value: parseFloat(d[4])
        }));
        
        ohlcDataRef.current = [...formattedData];
        
        if (chartType === 'heikin') {
            let haData = [];
            for (let i = 0; i < formattedData.length; i++) {
                let current = formattedData[i];
                let haClose = (current.open + current.high + current.low + current.close) / 4;
                let haOpen = i === 0 ? (current.open + current.close) / 2 : (haData[i-1].open + haData[i-1].close) / 2;
                let haHigh = Math.max(current.high, haOpen, haClose);
                let haLow = Math.min(current.low, haOpen, haClose);
                haData.push({ time: current.time, open: haOpen, high: haHigh, low: haLow, close: haClose, value: haClose });
            }
            formattedData = haData;
        }
        
        mainSeries.setData(formattedData);
        
        // Init indicators if enabled
        if (showSMA || showBollinger) {
            const { smaData, bbUpper, bbLower } = calculateIndicators(formattedData);
            if (showSMA) smaSeriesRef.current.setData(smaData);
            if (showBollinger) {
                bbUpperRef.current.setData(bbUpper);
                bbLowerRef.current.setData(bbLower);
            }
        }
      }).catch(err => console.log('Chart fetch ignored'));

    // Live WebSocket
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${interval}`);
    ws.onmessage = (event) => {
      if (isDisposed) return;
      const message = JSON.parse(event.data);
      const kline = message.k;
      const cPrice = parseFloat(kline.c);
      if (onPriceUpdate) onPriceUpdate(cPrice);
      
      const newPoint = {
        time: (kline.t / 1000) as any, open: parseFloat(kline.o), high: parseFloat(kline.h),
        low: parseFloat(kline.l), close: cPrice, value: cPrice
      };
      
      if (chartType === 'heikin') {
         // Approximate live Heikin update (needs previous candle logic)
         let data = ohlcDataRef.current;
         let prev = data.length > 1 ? data[data.length - 2] : newPoint;
         let haClose = (newPoint.open + newPoint.high + newPoint.low + newPoint.close) / 4;
         let haOpen = (prev.open + prev.close) / 2;
         let haHigh = Math.max(newPoint.high, haOpen, haClose);
         let haLow = Math.min(newPoint.low, haOpen, haClose);
         mainSeries.update({ time: newPoint.time, open: haOpen, high: haHigh, low: haLow, close: haClose, value: haClose });
      } else {
         mainSeries.update(newPoint);
      }
      
      // Update OHLC data ref for live indicator calculation
      let data = ohlcDataRef.current;
      if (data.length > 0) {
          if (data[data.length - 1].time === newPoint.time) {
              data[data.length - 1] = newPoint; // update current candle
          } else {
              data.push(newPoint); // new candle
              if (data.length > 1500) data.shift(); // keep memory low
          }
      }
      
      // Live update indicators
      if (showSMA || showBollinger) {
          const { smaData, bbUpper, bbLower } = calculateIndicators(data);
          if (showSMA && smaData.length > 0) smaSeriesRef.current.update(smaData[smaData.length - 1]);
          if (showBollinger && bbUpper.length > 0) {
              bbUpperRef.current.update(bbUpper[bbUpper.length - 1]);
              bbLowerRef.current.update(bbLower[bbLower.length - 1]);
          }
      }
    };
    wsRef.current = ws;

    return () => {
      isDisposed = true;
      ws.close();
      try { chart.remove(); seriesRef.current = null; } catch(e) {}
    };
  }, [symbol, interval, chartType, showSMA, showBollinger]);

  // Update Price Lines for active bets
  useEffect(() => {
    if (!seriesRef.current) return;
    const currentSeries = seriesRef.current;
    Object.values(linesRef.current).forEach(line => currentSeries.removePriceLine(line));
    linesRef.current = {};

    activeBets.forEach(bet => {
      if (!bet.strike_price) return;
      const lineOptions: any = {
        price: parseFloat(bet.strike_price),
        color: bet.direction === 'UP' ? '#10b981' : '#ef4444',
        lineWidth: 2, lineStyle: 2, axisLabelVisible: true, title: `${bet.direction === 'UP' ? 'BUY' : 'SELL'} (${bet.amount})`,
      };
      linesRef.current[bet.id] = currentSeries.createPriceLine(lineOptions);
    });
  }, [activeBets]);

  return <div ref={chartContainerRef} style={{ width: '100%', height: '100%' }} />;
}
