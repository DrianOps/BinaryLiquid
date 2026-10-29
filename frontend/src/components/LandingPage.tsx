import React from 'react';
import { 
  ArrowRight, 
  ArrowDown,
  Flame, 
  ShieldCheck, 
  Zap, 
  Coins, 
  Lock, 
  ExternalLink, 
  CheckCircle2, 
  Layers, 
  Activity, 
  Globe2, 
  Sparkles,
  ChevronRight,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { motion } from 'framer-motion';

interface LandingPageProps {
  onLaunchApp: () => void;
  onOpenDocs: () => void;
}

export default function LandingPage({ onLaunchApp, onOpenDocs }: LandingPageProps) {
  return (
    <div className="w-full flex flex-col flex-1 bg-transparent text-gray-900 dark:text-gray-100 transition-colors selection:bg-orange-500 selection:text-white pb-28 md:pb-12 overflow-x-hidden">
      
      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-8 pb-16 sm:pt-20 sm:pb-28 px-4 sm:px-6 max-w-7xl mx-auto w-full">
        
        {/* Soft Ambient Glows (Responsive to avoid mobile overflow) */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[650px] h-[250px] sm:h-[400px] bg-gradient-to-tr from-amber-500/15 via-orange-500/10 to-emerald-500/10 blur-[90px] sm:blur-[130px] pointer-events-none rounded-full"></div>
        <div className="absolute top-1/3 left-1/4 w-[200px] sm:w-[350px] h-[200px] sm:h-[350px] bg-orange-400/10 blur-[70px] sm:blur-[100px] pointer-events-none rounded-full"></div>

        <div className="relative z-10 flex flex-col items-center text-center max-w-4xl mx-auto">
          
          {/* Announcement Badge with Spring Motion */}
          <motion.div 
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            onClick={onLaunchApp}
            className="inline-flex flex-wrap items-center justify-center gap-1.5 sm:gap-2.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-white/90 dark:bg-[#141924]/90 backdrop-blur-md border border-gray-200/90 dark:border-gray-800 shadow-xs mb-6 sm:mb-8 hover:border-orange-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group max-w-[95%] sm:max-w-none"
          >
            <span className="flex h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-orange-500 animate-pulse"></span>
            <span className="text-[11px] sm:text-xs font-bold text-gray-700 dark:text-gray-200 group-hover:text-primary transition-colors">
              BCH BLAZE Hackathon Stablecoin Track
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:translate-x-0.5 transition-transform hidden xs:block" />
          </motion.div>

          {/* Main Title with Fluid Responsive Typography */}
          <motion.h1 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
            className="text-3xl xs:text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-gray-950 dark:text-white leading-[1.12] sm:leading-[1.08] mb-4 sm:mb-6"
          >
            The #1 Cross-Chain <br />
            <span className="bg-gradient-to-r from-orange-500 via-amber-500 to-emerald-500 bg-clip-text text-transparent">
              Liquidity Gateway
            </span>{' '}
            for Bitcoin Cash
          </motion.h1>

          {/* Subtitle */}
          <motion.p 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            className="text-sm sm:text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl font-normal leading-relaxed mb-8 sm:mb-10 px-2"
          >
            Seamlessly bridge stablecoins between EVM networks and Bitcoin Cash. Swap USDC & USDT directly into <strong className="text-gray-900 dark:text-white font-bold">ParyonUSD (PUSD CashTokens)</strong> in ~3 seconds with zero slippage and deterministic settlement.
          </motion.p>

          {/* CTA Buttons (Stack on mobile, row on tablet/desktop) */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
            className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 w-full sm:w-auto mb-12 sm:mb-16 px-4 sm:px-0"
          >
            <button
              onClick={onLaunchApp}
              className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl bg-primary hover:bg-orange-600 text-white font-bold text-sm sm:text-base shadow-xl shadow-orange-500/25 hover:shadow-orange-500/35 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group cursor-pointer"
            >
              <span>Launch App (Swap Now)</span>
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>

          {/* FLOATING PREVIEW CARD (Responsive layout: vertical on phone, horizontal on desktop) */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4, ease: "easeOut" }}
            className="w-full max-w-2xl p-0.5 sm:p-1 rounded-2xl sm:rounded-[32px] bg-gradient-to-r from-orange-500/20 via-amber-500/10 to-emerald-500/20 shadow-2xl mb-12 sm:mb-16"
          >
            <div className="bg-white/95 dark:bg-[#111622]/95 backdrop-blur-xl rounded-[22px] sm:rounded-[30px] p-4 sm:p-7 border border-white/50 dark:border-white/5 text-left">
              
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 sm:pb-4 mb-3 sm:mb-4 border-b border-gray-100 dark:border-gray-800/80">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-xs font-bold text-gray-600 dark:text-gray-300">Live Relayer Engine</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">Active</span>
                </div>
                <div className="text-[11px] sm:text-xs font-mono text-gray-400">Parity 1.0000 • Fee 0.3%</div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4 items-center">
                
                {/* From Token */}
                <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-gray-50 dark:bg-[#171d2b] border border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <img src="/USDC.png" className="w-8 h-8 rounded-full object-contain shrink-0" alt="USDC" />
                    <div>
                      <div className="font-black text-sm text-gray-900 dark:text-white font-mono">1,000 USDC</div>
                      <div className="text-[10px] text-gray-400 font-medium">USD Coin • Polygon EVM</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-200/50 dark:bg-gray-800 px-2 py-0.5 rounded-md sm:hidden">From</span>
                </div>

                {/* Animated Bridge Arrow (Down on phone, Right on desktop) */}
                <div className="flex sm:flex-col items-center justify-center py-1 sm:py-0 gap-2 sm:gap-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <ArrowDown className="w-3.5 h-3.5 sm:hidden animate-bounce" />
                    <ArrowRight className="w-4 h-4 hidden sm:block animate-pulse" />
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 sm:mt-1">~3s Execution</span>
                </div>

                {/* To Token */}
                <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-gray-50 dark:bg-[#171d2b] border border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <img src="/PUSD.png" className="w-8 h-8 rounded-full object-contain shrink-0" alt="PUSD" />
                    <div>
                      <div className="font-black text-sm text-emerald-600 dark:text-emerald-400 font-mono">997.00 PUSD</div>
                      <div className="text-[10px] text-gray-400 font-medium">ParyonUSD • BCH CashTokens</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md sm:hidden">To</span>
                </div>

              </div>

            </div>
          </motion.div>

          {/* Metric Stats Strip (2x2 on phone, 4 on desktop, no cramped overflow) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4 md:gap-6 w-full max-w-4xl">
            <motion.div 
              whileHover={{ y: -3 }}
              className="bg-white/90 dark:bg-[#141824]/90 backdrop-blur-md p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-gray-100 dark:border-gray-800/80 shadow-2xs text-left transition-all"
            >
              <span className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Execution Speed</span>
              <span className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 dark:text-white font-mono">~3 Sec</span>
              <span className="text-[11px] text-emerald-500 font-medium block mt-0.5 truncate">Deterministic Relayer</span>
            </motion.div>

            <motion.div 
              whileHover={{ y: -3 }}
              className="bg-white/90 dark:bg-[#141824]/90 backdrop-blur-md p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-gray-100 dark:border-gray-800/80 shadow-2xs text-left transition-all"
            >
              <span className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Protocol Fee</span>
              <span className="text-xl sm:text-2xl md:text-3xl font-black text-primary font-mono">0.30%</span>
              <span className="text-[11px] text-gray-400 font-medium block mt-0.5 truncate">Transparent & Fixed</span>
            </motion.div>

            <motion.div 
              whileHover={{ y: -3 }}
              className="bg-white/90 dark:bg-[#141824]/90 backdrop-blur-md p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-gray-100 dark:border-gray-800/80 shadow-2xs text-left transition-all"
            >
              <span className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Active Pool Depth</span>
              <span className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 dark:text-white font-mono">$100,000+</span>
              <span className="text-[11px] text-emerald-500 font-medium block mt-0.5 truncate">PUSD & USDC</span>
            </motion.div>

            <motion.div 
              whileHover={{ y: -3 }}
              className="bg-white/90 dark:bg-[#141824]/90 backdrop-blur-md p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-gray-100 dark:border-gray-800/80 shadow-2xs text-left transition-all"
            >
              <span className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">BCH Token Standard</span>
              <span className="text-xl sm:text-2xl md:text-3xl font-black text-emerald-500 font-mono">CashTokens</span>
              <span className="text-[11px] text-gray-400 font-medium block mt-0.5 truncate">Native Chipnet & Main</span>
            </motion.div>
          </div>

        </div>
      </section>

      {/* THREE PILLARS / WHY WE ARE #1 */}
      <section className="py-14 sm:py-24 px-4 sm:px-6 bg-white/70 dark:bg-[#0c1017]/70 backdrop-blur-md border-y border-gray-100 dark:border-gray-800/60 relative">
        <div className="max-w-6xl mx-auto">
          
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-primary mb-2 block">
              Architectural Superiority
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tight">
              Why BinaryLiquid is the #1 Gateway for BCH
            </h2>
            <p className="text-xs sm:text-base text-gray-500 dark:text-gray-400 mt-2 sm:mt-3 font-normal px-2">
              Solving the liquidity fragmentation problem between Ethereum/Polygon and Bitcoin Cash without heavy smart contract friction.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-8">
            
            {/* Pillar 1 */}
            <motion.div 
              whileHover={{ y: -4 }}
              className="p-5 sm:p-8 rounded-2xl sm:rounded-[28px] bg-white dark:bg-[#141924] border border-gray-100 dark:border-gray-800/80 flex flex-col justify-between hover:border-orange-500/30 dark:hover:border-orange-500/30 hover:shadow-xl hover:shadow-orange-500/5 transition-all group"
            >
              <div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
                  <Zap className="w-5 h-5 sm:w-6 sm:h-6 fill-orange-500/20" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Native Liquidity Engine
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-normal">
                  Engineered specifically for the Bitcoin Cash ecosystem. Routes EVM stablecoins directly into native CashTokens with deterministic execution, zero slippage, and instant confirmation.
                </p>
              </div>
              <div className="mt-5 sm:mt-6 pt-3 sm:pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center text-xs font-bold text-primary">
                <span>Sub-Second Settlement</span>
                <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>

            {/* Pillar 2 */}
            <motion.div 
              whileHover={{ y: -4 }}
              className="p-5 sm:p-8 rounded-2xl sm:rounded-[28px] bg-white dark:bg-[#141924] border border-gray-100 dark:border-gray-800/80 flex flex-col justify-between hover:border-emerald-500/30 dark:hover:border-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/5 transition-all group"
            >
              <div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
                  <Flame className="w-5 h-5 sm:w-6 sm:h-6 fill-emerald-500" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2">
                  ParyonUSD (PUSD) Native
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-normal">
                  Purpose-built to support the official sponsors of the BCH BLAZE Hackathon. Delivering direct minting and redemption of ParyonUSD and MoriaUSD CashTokens.
                </p>
              </div>
              <div className="mt-5 sm:mt-6 pt-3 sm:pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center text-xs font-bold text-emerald-500">
                <span>Official BLAZE Track</span>
                <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>

            {/* Pillar 3 */}
            <motion.div 
              whileHover={{ y: -4 }}
              className="p-5 sm:p-8 rounded-2xl sm:rounded-[28px] bg-white dark:bg-[#141924] border border-gray-100 dark:border-gray-800/80 flex flex-col justify-between hover:border-blue-500/30 dark:hover:border-blue-500/30 hover:shadow-xl hover:shadow-blue-500/5 transition-all group"
            >
              <div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
                  <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 fill-blue-500/20" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2">
                  WizardConnect & Paytaca
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-normal">
                  Integrated with the recommended BCH connection protocol WizardConnect. Sign with Paytaca, Electron Cash, or WalletConnect with zero security compromises.
                </p>
              </div>
              <div className="mt-5 sm:mt-6 pt-3 sm:pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center text-xs font-bold text-blue-500">
                <span>100% Non-Custodial</span>
                <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* HOW IT WORKS (3 STEPS + RESPONSIVE SOLAR SYSTEM) */}
      <section className="py-14 sm:py-24 px-4 sm:px-6 max-w-5xl mx-auto w-full">
        <div className="text-center mb-8 sm:mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-1 sm:mb-2">
            Seamless Experience
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tight">
            How Cross-Chain Swapping Works
          </h2>
        </div>

        {/* ORBITAL SOLAR SYSTEM (RESPONSIVE: Fits 360px phones without horizontal scroll!) */}
        <div className="relative w-full max-w-[420px] sm:max-w-[500px] h-[340px] sm:h-[480px] mx-auto flex items-center justify-center my-4 sm:my-10 overflow-hidden">
          
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute w-[240px] sm:w-[320px] h-[240px] sm:h-[320px] rounded-full bg-gradient-to-tr from-orange-500/15 via-amber-500/10 to-emerald-500/15 blur-[60px] sm:blur-[70px] pointer-events-none"></div>

          {/* INNER ORBIT RING */}
          <div className="absolute w-[170px] h-[170px] sm:w-[260px] sm:h-[260px] rounded-full border border-dashed border-emerald-400/30 dark:border-emerald-500/25 pointer-events-none"></div>

          {/* INNER ORBIT ROTATING LAYER */}
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
            className="absolute w-[170px] h-[170px] sm:w-[260px] sm:h-[260px] rounded-full pointer-events-none"
          >
            {/* BCH Native Planet (Top) */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
              <motion.div 
                animate={{ rotate: -360 }}
                transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
                whileHover={{ scale: 1.15 }}
                className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-white/95 dark:bg-[#151a26]/95 backdrop-blur-md border border-emerald-500/40 shadow-lg shadow-emerald-500/15 cursor-pointer"
              >
                <img src="/BCH.png" alt="BCH" className="w-4 h-4 sm:w-5 sm:h-5 rounded-full object-contain" />
                <span className="text-[10px] sm:text-[11px] font-black text-gray-900 dark:text-white font-mono">BCH</span>
              </motion.div>
            </div>

            {/* PUSD Planet (Bottom) */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 pointer-events-auto">
              <motion.div 
                animate={{ rotate: -360 }}
                transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
                whileHover={{ scale: 1.15 }}
                className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-white/95 dark:bg-[#151a26]/95 backdrop-blur-md border border-emerald-500/40 shadow-lg shadow-emerald-500/15 cursor-pointer"
              >
                <img src="/PUSD.png" alt="PUSD" className="w-4 h-4 sm:w-5 sm:h-5 rounded-full object-contain" />
                <span className="text-[10px] sm:text-[11px] font-black text-emerald-600 dark:text-emerald-400 font-mono">PUSD</span>
              </motion.div>
            </div>
          </motion.div>

          {/* OUTER ORBIT RING */}
          <div className="absolute w-[270px] h-[270px] sm:w-[390px] sm:h-[390px] rounded-full border border-dashed border-gray-300 dark:border-gray-800 pointer-events-none"></div>

          {/* OUTER ORBIT ROTATING LAYER (Rotates counter-clockwise for celestial depth) */}
          <motion.div 
            animate={{ rotate: -360 }}
            transition={{ duration: 34, repeat: Infinity, ease: "linear" }}
            className="absolute w-[270px] h-[270px] sm:w-[390px] sm:h-[390px] rounded-full pointer-events-none"
          >
            {/* ETH Planet (Top) */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 34, repeat: Infinity, ease: "linear" }}
                whileHover={{ scale: 1.15 }}
                className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-white/95 dark:bg-[#151a26]/95 backdrop-blur-md border border-blue-500/40 shadow-lg shadow-blue-500/15 cursor-pointer"
              >
                <img src="/ETH.png" alt="ETH" className="w-4 h-4 sm:w-5 sm:h-5 rounded-full object-contain" />
                <span className="text-[10px] sm:text-[11px] font-black text-blue-600 dark:text-blue-400 font-mono">ETH</span>
              </motion.div>
            </div>

            {/* SOL Planet (Right) */}
            <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 pointer-events-auto">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 34, repeat: Infinity, ease: "linear" }}
                whileHover={{ scale: 1.15 }}
                className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-white/95 dark:bg-[#151a26]/95 backdrop-blur-md border border-emerald-500/40 shadow-lg shadow-emerald-500/15 cursor-pointer"
              >
                <img src="/SOL.png" alt="SOL" className="w-4 h-4 sm:w-5 sm:h-5 rounded-full object-contain" />
                <span className="text-[10px] sm:text-[11px] font-black text-emerald-600 dark:text-emerald-400 font-mono">SOL</span>
              </motion.div>
            </div>

            {/* BNB Planet (Bottom) */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 pointer-events-auto">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 34, repeat: Infinity, ease: "linear" }}
                whileHover={{ scale: 1.15 }}
                className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-white/95 dark:bg-[#151a26]/95 backdrop-blur-md border border-amber-500/40 shadow-lg shadow-amber-500/15 cursor-pointer"
              >
                <img src="/BNB.png" alt="BNB" className="w-4 h-4 sm:w-5 sm:h-5 rounded-full object-contain" />
                <span className="text-[10px] sm:text-[11px] font-black text-amber-600 dark:text-amber-400 font-mono">BNB</span>
              </motion.div>
            </div>

            {/* POL Planet (Left) */}
            <div className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 34, repeat: Infinity, ease: "linear" }}
                whileHover={{ scale: 1.15 }}
                className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-white/95 dark:bg-[#151a26]/95 backdrop-blur-md border border-purple-400/40 shadow-lg shadow-purple-500/15 cursor-pointer"
              >
                <img src="/POL.png" alt="POL" className="w-4 h-4 sm:w-5 sm:h-5 rounded-full object-contain" />
                <span className="text-[10px] sm:text-[11px] font-black text-purple-600 dark:text-purple-400 font-mono">POL</span>
              </motion.div>
            </div>
          </motion.div>

          {/* CENTER SUN: BINARYLIQUID LOGO WITH REAL HEARTBEAT PULSE */}
          <div className="relative z-20 flex flex-col items-center justify-center">
            
            {/* Heartbeat Expanding Pulse Rings */}
            <motion.div 
              animate={{ 
                scale: [1, 1.25, 1.05, 1.4, 1],
                opacity: [0.6, 0.2, 0.4, 0, 0.6] 
              }}
              transition={{ 
                duration: 1.8, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
              className="absolute w-20 h-20 sm:w-28 sm:h-28 rounded-full border-2 border-orange-500/50 pointer-events-none"
            />
            <motion.div 
              animate={{ 
                scale: [1, 1.4, 1.1, 1.6, 1],
                opacity: [0.4, 0.1, 0.25, 0, 0.4] 
              }}
              transition={{ 
                duration: 1.8, 
                repeat: Infinity, 
                ease: "easeInOut",
                delay: 0.15 
              }}
              className="absolute w-24 h-24 sm:w-32 sm:h-32 rounded-full border border-orange-500/30 pointer-events-none"
            />

            {/* Heartbeat Core Logo */}
            <motion.div 
              animate={{ 
                scale: [1, 1.08, 1, 1.15, 1] 
              }}
              transition={{ 
                duration: 1.8, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
              whileHover={{ scale: 1.2 }}
              className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#141924] p-2.5 sm:p-3 shadow-[0_0_35px_rgba(247,147,26,0.35)] border-2 border-orange-500/60 flex items-center justify-center cursor-pointer transition-colors"
            >
              <img src="/logo.png" alt="BinaryLiquid Core" className="w-full h-full object-contain" />
            </motion.div>

            {/* Core Label */}
            <div className="mt-1.5 sm:mt-2 text-center">
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-primary bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
                Liquidity Hub
              </span>
            </div>

          </div>

        </div>

        {/* Step Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          
          <div className="bg-white/90 dark:bg-[#141824]/90 backdrop-blur-md p-5 sm:p-7 rounded-2xl sm:rounded-[26px] border border-gray-100 dark:border-gray-800 relative hover:border-gray-300 dark:hover:border-gray-700 transition-all">
            <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-black text-xs sm:text-sm flex items-center justify-center mb-4 sm:mb-5">
              1
            </span>
            <h4 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white mb-1.5 sm:mb-2">Connect Your Wallet</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-normal">
              Connect Paytaca via WizardConnect or your favorite EVM wallet via WalletConnect.
            </p>
          </div>

          <div className="bg-white/90 dark:bg-[#141824]/90 backdrop-blur-md p-5 sm:p-7 rounded-2xl sm:rounded-[26px] border border-gray-100 dark:border-gray-800 relative hover:border-gray-300 dark:hover:border-gray-700 transition-all">
            <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-primary/20 text-primary font-black text-xs sm:text-sm flex items-center justify-center mb-4 sm:mb-5">
              2
            </span>
            <h4 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white mb-1.5 sm:mb-2">Select Your Pair</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-normal">
              Swap PUSD (BCH) to USDC (Polygon/EVM) or vice-versa at 1:1 parity minus the transparent 0.3% fee.
            </p>
          </div>

          <div className="bg-white/90 dark:bg-[#141824]/90 backdrop-blur-md p-5 sm:p-7 rounded-2xl sm:rounded-[26px] border border-gray-100 dark:border-gray-800 relative hover:border-gray-300 dark:hover:border-gray-700 transition-all">
            <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-emerald-500/20 text-emerald-500 font-black text-xs sm:text-sm flex items-center justify-center mb-4 sm:mb-5">
              3
            </span>
            <h4 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white mb-1.5 sm:mb-2">Instant Settlement</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-normal">
              The automated engine verifies your deposit on-chain and dispatches tokens to your destination address within seconds.
            </p>
          </div>

        </div>
      </section>

      {/* FINAL CALL TO ACTION */}
      <section className="py-10 sm:py-16 px-4 sm:px-6 max-w-5xl mx-auto w-full mb-8 sm:mb-16">
        <div className="p-6 sm:p-14 rounded-3xl sm:rounded-[36px] bg-gradient-to-r from-gray-950 via-black to-[#131722] text-white text-center relative overflow-hidden shadow-2xl border border-gray-800">
          <div className="absolute top-0 right-0 w-64 sm:w-96 h-64 sm:h-96 bg-primary/20 blur-3xl rounded-full pointer-events-none"></div>
          
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-black mb-3 sm:mb-4 relative z-10 tracking-tight">
            Ready to Bridge Liquidity into Bitcoin Cash?
          </h2>
          <p className="text-gray-300 max-w-xl mx-auto text-xs sm:text-base mb-6 sm:mb-8 relative z-10 leading-relaxed px-2">
            Experience the fastest, cheapest, and most seamless stablecoin bridge built specifically for the BCH ecosystem.
          </p>
          
          <button
            onClick={onLaunchApp}
            className="w-full sm:w-auto px-8 py-3.5 sm:py-4 rounded-2xl bg-primary hover:bg-orange-600 text-white font-bold text-sm sm:text-base shadow-xl shadow-orange-500/30 hover:scale-105 active:scale-95 transition-all relative z-10 inline-flex items-center justify-center gap-2.5 mx-auto cursor-pointer"
          >
            <span>Launch App • Swap Now</span>
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="w-full py-8 sm:py-10 px-4 sm:px-6 border-t border-gray-200/60 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400 flex flex-col sm:flex-row items-center justify-between gap-4 max-w-6xl mx-auto text-center sm:text-left">
        <div>
          © 2026 BinaryLiquid. Powered by Bitcoin Cash & CashTokens.
        </div>
        <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
          <a href="https://bchblaze.cash" target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">BCH BLAZE</a>
          <a href="https://paryonusd.com" target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">ParyonUSD</a>
          <a href="https://t.me/bchblaze" target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">Telegram Support</a>
        </div>
      </footer>

    </div>
  );
}
