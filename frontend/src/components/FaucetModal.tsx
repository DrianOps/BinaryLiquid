import React, { useState, useEffect, useRef } from 'react';
import { X, Gift, Send, CheckCircle2, Loader2 } from 'lucide-react';

export default function FaucetModal({ onClose, userContext, fetchBalances, showToast }: any) {
  const [tgCode, setTgCode] = useState<string>('');
  const [isVerified, setIsVerified] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const tickerRef = useRef<HTMLDivElement>(null);

  const REWARDS = [2, 4, 6, 8, 9, 12, 15];
  const TickerItems = Array(50).fill(0).map(() => REWARDS[Math.floor(Math.random() * REWARDS.length)]);

  useEffect(() => {
    // Get unique verification code
    fetch(`/api/faucet/tg_code/${userContext.id}`)
      .then(r => r.json())
      .then(d => {
         if (d.code) setTgCode(d.code);
         else if (d.error) showToast(d.error, 'error');
      });
  }, [userContext.id]);

  useEffect(() => {
    if (!tgCode || isVerified) return;
    
    // Poll for verification
    const int = setInterval(() => {
      fetch(`/api/faucet/tg_status/${tgCode}`)
        .then(r => r.json())
        .then(d => {
           if (d.verified) setIsVerified(true);
        });
    }, 3000);
    return () => clearInterval(int);
  }, [tgCode, isVerified]);

  const handleSpin = async () => {
    if (!isVerified || !tgCode) return;
    setLoading(true);
    
    try {
      const res = await fetch('/api/faucet/spin_tg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userContext.id, code: tgCode })
      });
      const data = await res.json();
      
      if (data.error) {
        showToast(data.error, 'error');
        setLoading(false);
        return;
      }
      
      if (data.success) {
        setResult(data.reward);
        setSpinning(true);
        
        TickerItems[40] = data.reward;
        
        if (tickerRef.current) {
           tickerRef.current.style.transition = 'transform 4s cubic-bezier(0.15, 0.85, 0.15, 1)';
           tickerRef.current.style.transform = `translateX(-${40 * 72 - 120}px)`;
        }
        
        setTimeout(() => {
           showToast(`🎉 You won ${data.reward} BLIQ!`);
           fetchBalances(userContext.id);
           setTimeout(onClose, 2000);
        }, 4500);
      }
    } catch (e) {
      setLoading(false);
      showToast('Connection error', 'error');
    }
  };

  const botUrl = "https://t.me/Guanaco_TestBot"; // NEED to change this to the real bot name

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-100 overflow-hidden relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"><X className="w-5 h-5"/></button>
        
        <div className="bg-gradient-to-r from-purple-600 to-pink-500 p-6 text-center text-white">
           <Gift className="w-12 h-12 mx-auto mb-2 opacity-90" />
           <h2 className="text-2xl font-black">Free BLIQ Airdrop</h2>
           <p className="text-sm opacity-90 font-medium mt-1">Spin the wheel to win your starting balance!</p>
        </div>
        
        <div className="p-6">
           {!spinning ? (
             <div className="space-y-4">
               {!isVerified ? (
                 <div className="bg-blue-50 p-5 rounded-xl border border-blue-100 text-center animate-in fade-in">
                   <div className="w-12 h-12 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                     <Send className="w-6 h-6 ml-[-2px] mt-[2px]" />
                   </div>
                   <h3 className="font-bold text-gray-800 mb-2">Join our Telegram Group</h3>
                   <p className="text-xs text-gray-600 mb-4 font-medium">To stop bots and claim your free spin, please join our official group and send this code to our bot.</p>
                   
                   <div className="bg-white px-4 py-3 rounded-lg font-mono font-black text-blue-600 border border-blue-200 mb-4 select-all cursor-pointer shadow-inner">
                     /verify {tgCode || '...'}
                   </div>
                   
                   <a href="https://t.me/BinaryLiquidBot" target="_blank" rel="noreferrer" className="w-full bg-[#0088cc] hover:bg-[#0077b3] text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2">
                      <Send className="w-4 h-4" /> Open Telegram Bot
                   </a>
                   
                   <div className="mt-4 flex items-center justify-center gap-2 text-xs font-bold text-blue-400">
                     <Loader2 className="w-3.5 h-3.5 animate-spin" /> Waiting for verification...
                   </div>
                 </div>
               ) : (
                 <div className="bg-green-50 p-6 rounded-xl border border-green-200 text-center animate-in zoom-in">
                   <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-3" />
                   <h3 className="text-xl font-black text-green-800 mb-1">Verified!</h3>
                   <p className="text-sm text-green-600 font-medium mb-6">You are ready to spin the wheel.</p>
                   
                   <button 
                      onClick={handleSpin} 
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-500 hover:opacity-90 disabled:opacity-50 text-white font-black py-4 rounded-xl transition-all shadow-lg shadow-purple-500/30 text-lg"
                   >
                     {loading ? 'Spinning...' : 'SPIN ROULETTE'}
                   </button>
                 </div>
               )}
             </div>
           ) : (
             <div className="py-6">
                <div className="relative w-full h-24 bg-gray-100 rounded-xl overflow-hidden border-2 border-gray-200 shadow-inner">
                   {/* Center tick */}
                   <div className="absolute top-0 bottom-0 left-1/2 w-1 bg-red-500 z-10 -ml-[2px]"></div>
                   
                   <div ref={tickerRef} className="absolute top-0 bottom-0 left-0 flex items-center gap-2 px-2" style={{ transform: 'translateX(0px)' }}>
                      {TickerItems.map((val, i) => (
                         <div key={i} className={`w-16 h-16 flex-shrink-0 flex items-center justify-center rounded-lg font-black text-xl shadow-sm ${i === 40 && result ? 'bg-purple-600 text-white border-2 border-purple-800' : 'bg-white text-gray-800 border border-gray-200'}`}>
                            {val}
                         </div>
                      ))}
                   </div>
                </div>
                {result && (
                   <div className="mt-6 text-center animate-in zoom-in duration-500 delay-4000 fill-mode-both">
                      <p className="text-sm font-bold text-gray-500">You won</p>
                      <p className="text-4xl font-black text-purple-600">{result} BLIQ</p>
                   </div>
                )}
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
