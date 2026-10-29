import React, { useState } from 'react';
import { Shield, Zap, Gift, CheckCircle2 } from 'lucide-react';

export default function WelcomeModal({ onAccept }: { onAccept: () => void }) {
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-300">
        
        <div className="bg-gray-900 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/20 to-transparent"></div>
          <Shield className="w-16 h-16 text-primary mx-auto mb-4 relative z-10" />
          <h2 className="text-3xl font-black text-white relative z-10">Welcome to BinaryLiquid</h2>
          <p className="text-gray-400 font-medium mt-2 relative z-10">The Ultimate Web3 Binary Options Engine</p>
        </div>
        
        <div className="p-8">
          <div className="space-y-6 mb-8">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-black text-gray-900">Zero-Gas Off-Chain Engine</h4>
                <p className="text-sm text-gray-500 font-medium mt-1">Experience instant 1-minute trades without paying a single cent in network fees.</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <Gift className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h4 className="font-black text-gray-900">Free Airdrop for New Users</h4>
                <p className="text-sm text-gray-500 font-medium mt-1">Connect your wallet and join our Telegram group to spin the Faucet Roulette for free $BLIQ.</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6">
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative flex items-center mt-0.5">
                <input 
                  type="checkbox" 
                  checked={agreed} 
                  onChange={(e) => setAgreed(e.target.checked)} 
                  className="w-5 h-5 border-2 border-gray-300 rounded appearance-none checked:bg-primary checked:border-primary transition-colors cursor-pointer"
                />
                <CheckCircle2 className={`absolute inset-0 w-5 h-5 text-white pointer-events-none transition-opacity ${agreed ? 'opacity-100' : 'opacity-0'}`} />
              </div>
              <p className="text-xs font-bold text-gray-500 leading-relaxed">
                I confirm that I am at least 18 years old, gambling is legal in my jurisdiction, and I accept the <span className="text-primary hover:underline">Terms of Service</span> & <span className="text-primary hover:underline">Privacy Policy</span>.
              </p>
            </label>
          </div>
          
          <button 
            onClick={onAccept}
            disabled={!agreed}
            className="w-full bg-primary hover:bg-orange-600 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-black text-lg py-4 rounded-xl transition-all shadow-lg shadow-orange-500/20"
          >
            ENTER THE ARENA
          </button>
        </div>
      </div>
    </div>
  );
}
