import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, 
  ArrowDown, 
  ShieldCheck, 
  Zap, 
  Wallet, 
  Check, 
  CheckCircle2, 
  Loader2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LandingPageProps {
  onLaunchApp: () => void;
  onOpenDocs: () => void;
  onOpenWhitepaper?: () => void;
}

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'Non-custodial',
    text: 'Funds settle through smart contracts and CashScript covenants.'
  },
  {
    icon: Zap,
    title: 'Fast settlement',
    text: 'Deposits are detected on-chain and paid out in ~3 seconds.'
  },
  {
    icon: Wallet,
    title: 'Your wallets',
    text: 'Paytaca, Cashonize, MetaMask and WalletConnect.'
  }
];

const DEMO_PAIRS = [
  {
    sellToken: 'PUSD',
    sellIcon: '/PUSD.png',
    sellNetwork: 'Bitcoin Cash (CashTokens)',
    sellAmount: '100',
    buyToken: 'USDT',
    buyIcon: '/USDT.png',
    buyNetwork: 'Polygon PoS (EVM)',
    buyAmount: '99.70',
    rate: '1 PUSD = 1.00 USDT',
    fee: '0.30% (0.30 PUSD)',
    fakeTxId: '0x8f3c...e942'
  },
  {
    sellToken: 'BCH',
    sellIcon: '/BCH.png',
    sellNetwork: 'Bitcoin Cash (Native UTXO)',
    sellAmount: '0.50',
    buyToken: 'USDT',
    buyIcon: '/USDT.png',
    buyNetwork: 'Polygon PoS (EVM)',
    buyAmount: '234.35',
    rate: '1 BCH = 470.10 USDT',
    fee: '0.30% (0.70 USD)',
    fakeTxId: '0x3d91...a78c'
  }
];

function AnimatedSwapPreview({ onLaunchApp }: { onLaunchApp: () => void }) {
  const [pairIdx, setPairIdx] = useState(0);
  const [stage, setStage] = useState<'typing' | 'pressing' | 'locking' | 'success'>('typing');
  const [displayAmount, setDisplayAmount] = useState('');

  const currentPair = DEMO_PAIRS[pairIdx];

  useEffect(() => {
    let isCancelled = false;
    let timerId: any = null;

    // Reset state for current pair
    setStage('typing');
    setDisplayAmount('');

    // 1. Simulate typing of amount char by char
    const target = currentPair.sellAmount;
    let charIdx = 0;

    const typeInterval = setInterval(() => {
      if (isCancelled) return;
      charIdx++;
      setDisplayAmount(target.slice(0, charIdx));

      if (charIdx >= target.length) {
        clearInterval(typeInterval);

        // 2. Wait a moment, then simulate button click (pressing)
        timerId = setTimeout(() => {
          if (isCancelled) return;
          setStage('pressing');

          // 3. Locking in CashScript Covenant
          timerId = setTimeout(() => {
            if (isCancelled) return;
            setStage('locking');

            // 4. Instant Settlement Success (Full Receipt Overlay)
            timerId = setTimeout(() => {
              if (isCancelled) return;
              setStage('success');

              // 5. Hold success receipt, then advance to next pair and loop
              timerId = setTimeout(() => {
                if (isCancelled) return;
                setPairIdx((prev) => (prev + 1) % DEMO_PAIRS.length);
              }, 4500);
            }, 2200);
          }, 600);
        }, 1200);
      }
    }, 180);

    return () => {
      isCancelled = true;
      clearInterval(typeInterval);
      if (timerId) clearTimeout(timerId);
    };
  }, [pairIdx]);

  return (
    <div 
      onClick={onLaunchApp}
      className={`bg-surface rounded-card p-4 space-y-2 relative group cursor-pointer transition-all duration-300 min-h-[380px] flex flex-col justify-between overflow-hidden ${
        stage === 'success'
          ? 'border-2 border-primary shadow-xl shadow-primary/20'
          : 'border border-line hover:border-line-strong shadow-soft'
      }`}
      title="Click to launch Bridge Swap"
    >
      {/* Top micro-header */}
      <div className="flex items-center justify-between px-1 text-[11px] text-ink-3">
        <div className="flex items-center gap-1.5 font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-ink-2">Live Non-Custodial Demo</span>
        </div>
        <span className="group-hover:text-primary transition-colors font-medium flex items-center gap-1">
          <span>Try real swap</span>
          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </span>
      </div>

      {/* Pay Panel */}
      <div className="ui-panel p-4 flex items-center justify-between relative overflow-hidden">
        <div>
          <div className="ui-label">You pay</div>
          <div className="text-2xl sm:text-3xl font-semibold tabular-nums mt-1 text-ink flex items-center">
            <span>{displayAmount || '0'}</span>
            {stage === 'typing' && (
              <span className="inline-block w-0.5 h-6 bg-primary ml-1 animate-pulse" />
            )}
          </div>
          <div className="text-[10px] text-ink-3 mt-0.5">{currentPair.sellNetwork}</div>
        </div>
        <div className="ui-token-chip">
          <img src={currentPair.sellIcon} alt={currentPair.sellToken} className="w-6 h-6 rounded-full object-contain" />
          <span className="font-bold">{currentPair.sellToken}</span>
        </div>
      </div>

      {/* Down arrow indicator */}
      <div className="relative h-2 flex items-center justify-center z-10">
        <div className="w-8 h-8 rounded-full bg-surface border-2 border-line shadow-xs flex items-center justify-center text-ink-2 group-hover:scale-110 transition-transform">
          <ArrowDown className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* Receive Panel */}
      <div className="ui-panel p-4 flex items-center justify-between">
        <div>
          <div className="ui-label">You receive</div>
          <div className="text-2xl sm:text-3xl font-semibold tabular-nums mt-1 text-ink">
            {displayAmount ? currentPair.buyAmount : '0.00'}
          </div>
          <div className="text-[10px] text-ink-3 mt-0.5">{currentPair.buyNetwork}</div>
        </div>
        <div className="ui-token-chip">
          <img src={currentPair.buyIcon} alt={currentPair.buyToken} className="w-6 h-6 rounded-full object-contain" />
          <span className="font-bold">{currentPair.buyToken}</span>
        </div>
      </div>

      {/* Rate & Fee Info */}
      <div className="flex items-center justify-between px-2 pt-1 text-[11px] text-ink-3">
        <span className="tabular-nums font-mono">{currentPair.rate}</span>
        <span>Fee {currentPair.fee}</span>
      </div>

      {/* Dynamic Animated Action Button / State */}
      <div className="pt-2">
        {stage === 'typing' && (
          <button
            type="button"
            className="w-full ui-btn-primary ui-btn-md font-bold text-xs flex items-center justify-center gap-1.5"
          >
            <span>Swap {currentPair.sellToken} for {currentPair.buyToken}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}

        {stage === 'pressing' && (
          <motion.button
            initial={{ scale: 1 }}
            animate={{ scale: 0.96 }}
            transition={{ duration: 0.2 }}
            type="button"
            className="w-full ui-btn-primary ui-btn-md font-bold text-xs bg-orange-600 text-black shadow-inner flex items-center justify-center gap-1.5"
          >
            <span>Signing Transaction...</span>
          </motion.button>
        )}

        {stage === 'locking' && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full py-2.5 px-4 rounded-xl bg-primary/10 border border-primary/20 text-ink flex items-center justify-center gap-2 text-xs font-semibold"
          >
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
            <span>Locking in CashScript Covenant (P2SH32)...</span>
          </motion.div>
        )}
      </div>

      {/* Non-custodial assurance banner */}
      <div className="text-center pt-1">
        <span className="text-[10px] text-ink-3">
          100% Non-custodial · Settled via smart contracts & CashScript covenants
        </span>
      </div>

      {/* FULL RECEIPT OVERLAY ON SUCCESS */}
      <AnimatePresence>
        {stage === 'success' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute inset-0 z-20 bg-surface rounded-[22px] p-6 flex flex-col items-center justify-between text-center"
          >
            {/* Top Status Pill in Bitcoin Orange */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-[11px] font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span>Swap Confirmado On-Chain</span>
            </div>

            {/* Center: Big Animated Check & Amounts in Bitcoin Orange */}
            <div className="space-y-3 my-auto">
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 18, delay: 0.1 }}
                className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto border-2 border-primary/40 shadow-lg shadow-primary/25"
              >
                <Check className="w-8 h-8 text-primary stroke-[3]" />
              </motion.div>

              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-ink tabular-nums tracking-tight">
                  +{currentPair.buyAmount} {currentPair.buyToken}
                </div>
                <div className="text-xs text-ink-3 mt-1">
                  Recibido desde {currentPair.sellAmount} {currentPair.sellToken}
                </div>
              </div>

              {/* Fake TXID pill */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-2 border border-line text-xs font-mono text-ink-2 select-all">
                <span className="text-[10px] uppercase font-bold text-ink-3 font-sans">TxID:</span>
                <span className="text-ink font-semibold">{currentPair.fakeTxId}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              </div>
            </div>

            {/* Bottom info & specs */}
            <div className="w-full space-y-1.5 pt-3 border-t border-line text-[11px]">
              <div className="flex items-center justify-between text-ink-3">
                <span>Tiempo de liquidación:</span>
                <span className="font-bold text-primary font-mono">~2.8 segundos</span>
              </div>
              <div className="flex items-center justify-between text-ink-3">
                <span>Seguridad:</span>
                <span className="font-semibold text-ink-2">Covenant CashScript P2SH32</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function LandingPage({ onLaunchApp, onOpenDocs, onOpenWhitepaper }: LandingPageProps) {
  return (
    <div className="w-full flex flex-col flex-1 text-ink pb-28 md:pb-12 overflow-x-hidden">
      {/* HERO */}
      <section className="px-4 sm:px-6 pt-10 sm:pt-20 pb-10 sm:pb-14 max-w-3xl mx-auto w-full text-center">
        <span className="ui-badge-warn mb-5">Live on Testnet · PUSD ⟷ USDT</span>

        <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight leading-[1.08] text-ink">
          Stablecoins between
          <br />
          Bitcoin Cash and EVM
        </h1>

        <p className="mt-4 text-base sm:text-lg text-ink-2 max-w-xl mx-auto">
          Swap PUSD on Bitcoin Cash for USDT on Polygon, 100% non-custodial.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
          <button type="button" onClick={onLaunchApp} className="ui-btn-primary ui-btn-lg px-6">
            <span>Launch app</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button type="button" onClick={onOpenDocs} className="ui-btn-secondary ui-btn-lg px-6">
            Read docs
          </button>
        </div>
      </section>

      {/* ANIMATED PREVIEW CARD */}
      <section className="px-4 sm:px-6 max-w-md mx-auto w-full">
        <AnimatedSwapPreview onLaunchApp={onLaunchApp} />
      </section>

      {/* FEATURES */}
      <section className="px-4 sm:px-6 py-16 sm:py-20 max-w-5xl mx-auto w-full">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-10">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title}>
              <div className="w-9 h-9 rounded-control bg-surface-2 text-ink flex items-center justify-center mb-4">
                <Icon className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-ink">{title}</h3>
              <p className="text-sm text-ink-2 mt-1">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 ui-divider flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-3">
        <span>© 2026 BinaryLiquid</span>
        <div className="flex flex-wrap items-center gap-5">
          {onOpenWhitepaper && (
            <button
              type="button"
              onClick={onOpenWhitepaper}
              className="hover:text-ink font-semibold text-primary transition-colors cursor-pointer"
            >
              Whitepaper v1.0
            </button>
          )}
          <a href="https://bchblaze.cash" target="_blank" rel="noreferrer" className="hover:text-ink transition-colors">
            BCH BLAZE
          </a>
          <a href="https://paryonusd.com" target="_blank" rel="noreferrer" className="hover:text-ink transition-colors">
            ParyonUSD
          </a>
          <a href="https://t.me/bchblaze" target="_blank" rel="noreferrer" className="hover:text-ink transition-colors">
            Telegram
          </a>
        </div>
      </footer>
    </div>
  );
}
