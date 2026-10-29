import React, { useEffect, useState } from 'react';

export default function LiveOrderbook({ symbol = 'BTCUSDT' }: { symbol: string }) {
  const [bids, setBids] = useState<[string, string][]>([]);
  const [asks, setAsks] = useState<[string, string][]>([]);
  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const [priceColor, setPriceColor] = useState<'text-success' | 'text-danger' | 'text-gray-900'>('text-gray-900');

  useEffect(() => {
    // Top 20 levels every 100ms
    const wsUrl = `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@depth20@100ms`;
    const ws = new WebSocket(wsUrl);

    let previousPrice = 0;

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.bids && data.asks) {
        setBids(data.bids.slice(0, 15));
        
        // Asks come sorted by price ascending. We want highest price at top, lowest price at bottom of the asks section.
        const topAsks = data.asks.slice(0, 15).reverse();
        setAsks(topAsks);

        // Derive pseudo-last price from the spread center
        if (data.bids.length > 0 && data.asks.length > 0) {
            const highestBid = parseFloat(data.bids[0][0]);
            const lowestAsk = parseFloat(data.asks[0][0]);
            const midPrice = (highestBid + lowestAsk) / 2;
            
            if (previousPrice !== 0) {
                if (midPrice > previousPrice) setPriceColor('text-success');
                else if (midPrice < previousPrice) setPriceColor('text-danger');
            }
            setLastPrice(midPrice);
            previousPrice = midPrice;
        }
      }
    };

    return () => {
      ws.close();
    };
  }, [symbol]);

  const renderRow = (row: [string, string], type: 'bid' | 'ask') => {
    const price = parseFloat(row[0]).toFixed(2);
    const size = parseFloat(row[1]).toFixed(4);
    const total = (parseFloat(row[0]) * parseFloat(row[1])).toFixed(0);
    
    // Calculate a pseudo-depth bar width
    const depthPercent = Math.min(100, (parseFloat(row[1]) * 10));

    return (
      <div key={row[0]} className="relative flex justify-between text-[11px] font-mono py-[2px] cursor-pointer hover:bg-gray-100 z-10 group">
        <div className={`absolute top-0 right-0 bottom-0 ${type === 'bid' ? 'bg-success/10' : 'bg-danger/10'} -z-10`} style={{ width: `${depthPercent}%` }}></div>
        <span className={`w-1/3 text-left pl-2 ${type === 'bid' ? 'text-success' : 'text-danger'} font-bold`}>{price}</span>
        <span className="w-1/3 text-right text-gray-700">{size}</span>
        <span className="w-1/3 text-right pr-2 text-gray-400 group-hover:text-gray-600 transition-colors">{total}</span>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <div className="h-10 flex items-center px-4 border-b border-gray-100 bg-gray-50">
        <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">Order Book</h3>
      </div>
      
      <div className="flex justify-between px-2 py-2 text-[10px] font-bold text-gray-400 border-b border-gray-100">
        <span className="w-1/3 text-left pl-1">Price (USD)</span>
        <span className="w-1/3 text-right">Size (BLIQ)</span>
        <span className="w-1/3 text-right pr-1">Total</span>
      </div>

      <div className="flex-1 flex flex-col justify-between p-1 overflow-hidden">
        {/* ASKS */}
        <div className="flex flex-col justify-end flex-1 mb-1">
          {asks.map(ask => renderRow(ask, 'ask'))}
        </div>

        {/* CURRENT PRICE SPREAD */}
        <div className="py-2 border-y border-gray-100 bg-gray-50 flex items-center justify-center gap-2">
           <span className={`text-lg font-black ${priceColor}`}>
             {lastPrice ? lastPrice.toFixed(2) : '---'}
           </span>
           {priceColor === 'text-success' ? (
              <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg>
           ) : priceColor === 'text-danger' ? (
              <svg className="w-4 h-4 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
           ) : null}
        </div>

        {/* BIDS */}
        <div className="flex flex-col justify-start flex-1 mt-1">
          {bids.map(bid => renderRow(bid, 'bid'))}
        </div>
      </div>
    </div>
  );
}
