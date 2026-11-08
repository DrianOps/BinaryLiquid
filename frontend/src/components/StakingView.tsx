import React, { useState } from 'react';
import { Lock, Unlock, TrendingUp, ShieldCheck } from 'lucide-react';

export default function StakingView({ userContext, balances, fetchBalances, wc, showToast }: any) {
  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const stakedBalance = balances.stakedBliq || 0;
  const availableBalance = balances.bliq || 0;

  const handleAction = async (type: 'stake' | 'unstake') => {
    if (!userContext) return showToast('Please connect wallet', 'error');
    
    const amountStr = type === 'stake' ? stakeAmount : unstakeAmount;
    const amount = parseFloat(amountStr);
    
    if (isNaN(amount) || amount <= 0) return showToast('Invalid amount', 'error');
    
    if (type === 'stake' && amount > availableBalance) return showToast('Insufficient available balance', 'error');
    if (type === 'unstake' && amount > stakedBalance) return showToast('Insufficient staked balance', 'error');
    
    setLoading(true);
    const msg = type === 'stake' ? `Stake ${amount} BLIQ` : `Unstake ${amount} BLIQ`;
    
    try {
       const signature = await wc.signMessage(msg);
       const res = await fetch(`/api/wallet/${type}`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ userId: userContext.id, amount, signature })
       });
       
       const data = await res.json();
       if (data.success) {
          showToast(data.message);
          if (type === 'stake') setStakeAmount('');
          else setUnstakeAmount('');
          fetchBalances(userContext.id);
       } else {
          showToast(data.error, 'error');
       }
    } catch(e:any) {
       showToast(e.message || 'Signature cancelled', 'error');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto mt-8 p-4 animate-in fade-in">
      
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-3xl p-8 mb-8 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 p-8 opacity-10"><ShieldCheck className="w-48 h-48" /></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
           <div>
             <div className="inline-block bg-purple-500/20 text-purple-300 font-bold px-3 py-1 rounded-full text-xs mb-3 border border-purple-500/30">
               L3 REVENUE SHARING
             </div>
             <h2 className="text-4xl font-black mb-2 tracking-tight">Stake $BLIQ</h2>
             <p className="text-gray-400 font-medium text-lg max-w-lg">
               Lock your tokens in the L3 Engine to earn real yield from casino fees. 30% of all platform trading fees are distributed to stakers.
             </p>
           </div>
           
           <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10 text-center min-w-[200px]">
             <p className="text-sm font-bold text-gray-300 mb-1 uppercase tracking-wider">Estimated APR</p>
             <p className="text-5xl font-black text-[#f7931a] drop-shadow-[0_0_15px_rgba(247,147,26,0.3)]">42%</p>
           </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* STAKE CARD */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col h-full">
           <div className="flex items-center gap-3 mb-6">
             <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center"><Lock className="w-6 h-6" /></div>
             <div>
               <h3 className="text-xl font-black text-gray-900">Stake Tokens</h3>
               <p className="text-sm font-bold text-gray-500">Available: {availableBalance.toFixed(2)} BLIQ</p>
             </div>
           </div>
           
           <div className="relative mb-6">
             <input 
               type="number" 
               value={stakeAmount}
               onChange={(e) => setStakeAmount(e.target.value)}
               placeholder="0.00"
               className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-5 text-2xl font-black text-gray-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
             />
             <button onClick={() => setStakeAmount(availableBalance.toString())} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white border border-gray-200 text-gray-600 text-xs font-black px-3 py-1.5 rounded-lg hover:text-purple-600 transition-colors">MAX</button>
           </div>
           
           <button 
             onClick={() => handleAction('stake')}
             disabled={loading}
             className="mt-auto w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-black text-lg py-4 rounded-xl transition-all shadow-lg shadow-purple-500/30"
           >
             {loading ? 'Processing...' : 'STAKE'}
           </button>
        </div>
        
        {/* UNSTAKE CARD */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col h-full">
           <div className="flex items-center gap-3 mb-6">
             <div className="w-12 h-12 bg-gray-50 text-gray-600 rounded-full flex items-center justify-center"><Unlock className="w-6 h-6" /></div>
             <div>
               <h3 className="text-xl font-black text-gray-900">Unstake Tokens</h3>
               <p className="text-sm font-bold text-gray-500">Currently Staked: {stakedBalance.toFixed(2)} BLIQ</p>
             </div>
           </div>
           
           <div className="relative mb-6">
             <input 
               type="number" 
               value={unstakeAmount}
               onChange={(e) => setUnstakeAmount(e.target.value)}
               placeholder="0.00"
               className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-5 text-2xl font-black text-gray-900 focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-200 transition-all"
             />
             <button onClick={() => setUnstakeAmount(stakedBalance.toString())} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white border border-gray-200 text-gray-600 text-xs font-black px-3 py-1.5 rounded-lg hover:text-gray-900 transition-colors">MAX</button>
           </div>
           
           <button 
             onClick={() => handleAction('unstake')}
             disabled={loading}
             className="mt-auto w-full bg-gray-800 hover:bg-gray-900 disabled:opacity-50 text-white font-black text-lg py-4 rounded-xl transition-all shadow-lg"
           >
             {loading ? 'Processing...' : 'UNSTAKE'}
           </button>
        </div>
        
      </div>
      
    </div>
  );
}
