import React, { useState, useEffect } from 'react';
import { Rocket, Send, Copy, CheckCircle2 } from 'lucide-react';

export default function PresaleView({ userContext, showToast, fetchBalances }: any) {
  const [info, setInfo] = useState<any>(null);
  const [txid, setTxid] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('https://bsprotocol.xyz/api/presale/info')
      .then(r => r.json())
      .then(d => setInfo(d))
      .catch(e => console.error(e));
  }, []);

  const handleCopy = () => {
    if (!info?.address) return;
    navigator.clipboard.writeText(info.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBuy = async () => {
    if (!userContext) return showToast('Please connect your wallet first', 'error');
    if (!txid || txid.length < 20) return showToast('Please enter a valid TXID', 'error');
    
    setLoading(true);
    try {
      const res = await fetch('https://bsprotocol.xyz/api/presale/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userContext.id, txid: txid.trim() })
      });
      const data = await res.json();
      
      if (data.error) {
        showToast(data.error, 'error');
      } else {
        showToast(`🎉 Success! You bought ${data.bliqBought.toLocaleString()} BLIQ!`);
        setTxid('');
        fetchBalances(userContext.id);
      }
    } catch(e:any) {
      showToast('Network error', 'error');
    }
    setLoading(false);
  };

  if (!info) return <div className="text-center py-20 animate-pulse font-bold text-gray-500">Loading Oracles...</div>;

  const progress = Math.min(100, (info.totalRaisedBch / info.goalBch) * 100);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-3xl mx-auto mt-8 animate-in zoom-in">
       <div className="text-center mb-8">
           <div className="inline-block bg-orange-100 text-orange-600 font-black px-4 py-1.5 rounded-full text-sm mb-4">PHASE 1: PRIVATE ROUND</div>
           <h2 className="text-4xl font-black text-gray-900 mb-4 tracking-tight flex items-center justify-center gap-3">
             <Rocket className="w-8 h-8 text-[#f7931a]"/> The Future of Web3 Options
           </h2>
           <p className="text-gray-500 font-medium text-lg">
             Secure your <span className="text-[#f7931a] font-bold">$BLIQ</span> tokens before the public DEX listing. The smart contract uses live Binance Oracles to calculate your tokens instantly.
           </p>
       </div>
       
       <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 text-left">
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
             <p className="text-xs text-gray-500 font-bold uppercase">Presale Price</p>
             <p className="text-xl font-black text-gray-900">${info.tokenPriceUsd}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
             <p className="text-xs text-gray-500 font-bold uppercase">Live BCH Price</p>
             <p className="text-xl font-black text-green-600">${info.bchPriceUsd.toFixed(2)}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
             <p className="text-xs text-gray-500 font-bold uppercase">Min / Max</p>
             <p className="text-xl font-black text-gray-900">{info.minBch} / {info.maxBch} <span className="text-sm text-gray-400">BCH</span></p>
          </div>
          <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
             <p className="text-xs text-orange-600 font-bold uppercase">1 BCH Gets You</p>
             <p className="text-xl font-black text-[#f7931a]">{Math.floor(info.bchPriceUsd / info.tokenPriceUsd).toLocaleString()}</p>
          </div>
       </div>
       
       <div className="bg-gray-100 h-4 w-full rounded-full overflow-hidden mb-2">
          <div className="bg-gradient-to-r from-orange-400 to-[#f7931a] h-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
       </div>
       <div className="flex justify-between text-xs font-bold text-gray-500 mb-8">
          <span>{info.totalRaisedBch.toFixed(2)} BCH Raised</span>
          <span>Goal: {info.goalBch} BCH</span>
       </div>
       
       <div className="bg-gray-900 rounded-2xl p-6 text-white shadow-xl">
          <h3 className="text-xl font-black mb-4 flex items-center gap-2"><Send className="w-5 h-5 text-[#f7931a]"/> How to Participate</h3>
          <ol className="text-gray-400 text-sm font-medium space-y-3 mb-6 list-decimal list-inside">
             <li>Send BCH (Min {info.minBch} - Max {info.maxBch}) from your wallet to the Treasury Address.</li>
             <li>Copy the TXID (Transaction ID) of your transfer.</li>
             <li>Paste the TXID below. Our L3 Engine will verify the blockchain and credit your BLIQ instantly.</li>
          </ol>
          
          <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 mb-6 flex flex-col md:flex-row items-center gap-4">
             <div className="flex-1 overflow-hidden">
                <p className="text-xs text-gray-500 font-bold uppercase mb-1">Treasury Address</p>
                <p className="font-mono text-sm text-[#f7931a] truncate break-all">{info.address}</p>
             </div>
             <button onClick={handleCopy} className="bg-gray-700 hover:bg-gray-600 text-white p-3 rounded-lg transition-colors flex-shrink-0">
                {copied ? <CheckCircle2 className="w-5 h-5 text-green-400"/> : <Copy className="w-5 h-5"/>}
             </button>
          </div>
          
          <div className="flex flex-col md:flex-row gap-3">
             <input 
               type="text" 
               value={txid}
               onChange={(e) => setTxid(e.target.value)}
               placeholder="Paste your BCH TXID here..."
               className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#f7931a] font-mono text-sm"
             />
             <button 
                onClick={handleBuy}
                disabled={loading || !txid}
                className="bg-[#f7931a] hover:bg-orange-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-black px-8 py-3 rounded-xl transition-colors"
             >
                {loading ? 'VERIFYING...' : 'CLAIM BLIQ'}
             </button>
          </div>
       </div>
    </div>
  );
}
