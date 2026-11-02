import React from 'react';
import { ArrowRight, ArrowDown, ShieldCheck, Zap, Wallet } from 'lucide-react';

interface LandingPageProps {
  onLaunchApp: () => void;
  onOpenDocs: () => void;
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
    text: 'Deposits are detected on-chain and paid out in seconds.'
  },
  {
    icon: Wallet,
    title: 'Your wallets',
    text: 'Paytaca, Cashonize, MetaMask and WalletConnect.'
  }
];

export default function LandingPage({ onLaunchApp, onOpenDocs }: LandingPageProps) {
  return (
    <div className="w-full flex flex-col flex-1 text-ink pb-28 md:pb-12 overflow-x-hidden">
      {/* HERO */}
      <section className="px-4 sm:px-6 pt-12 sm:pt-24 pb-12 sm:pb-16 max-w-3xl mx-auto w-full text-center">
        <span className="ui-badge-warn mb-6">Live on Testnet · PUSD ⟷ USDT</span>

        <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight leading-[1.08] text-ink">
          Stablecoins between
          <br />
          Bitcoin Cash and EVM
        </h1>

        <p className="mt-5 text-base sm:text-lg text-ink-2 max-w-xl mx-auto">
          Swap PUSD on Bitcoin Cash for USDT on Polygon, without a custodian.
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

      {/* PREVIEW */}
      <section className="px-4 sm:px-6 max-w-md mx-auto w-full">
        <div className="ui-card p-3 space-y-1.5">
          <div className="ui-panel p-4 flex items-center justify-between">
            <div>
              <div className="ui-label">You pay</div>
              <div className="text-2xl font-semibold tabular-nums mt-1">100</div>
            </div>
            <div className="ui-token-chip cursor-default hover:bg-surface">
              <img src="/PUSD.png" alt="PUSD" className="w-6 h-6 rounded-full" />
              <span>PUSD</span>
            </div>
          </div>

          <div className="relative h-2 flex items-center justify-center z-10">
            <div className="w-9 h-9 rounded-control bg-surface border-4 border-surface shadow-soft flex items-center justify-center text-ink-2">
              <ArrowDown className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="ui-panel p-4 flex items-center justify-between">
            <div>
              <div className="ui-label">You receive</div>
              <div className="text-2xl font-semibold tabular-nums mt-1">99.70</div>
            </div>
            <div className="ui-token-chip cursor-default hover:bg-surface">
              <img src="/USDT.png" alt="USDT" className="w-6 h-6 rounded-full" />
              <span>USDT</span>
            </div>
          </div>

          <div className="flex items-center justify-between px-2 pt-1.5 text-xs text-ink-3">
            <span className="tabular-nums">1 PUSD = 1 USDT</span>
            <span>Fee 0.3%</span>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="px-4 sm:px-6 py-16 sm:py-24 max-w-5xl mx-auto w-full">
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
        <div className="flex gap-5">
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
