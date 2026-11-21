import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, 
  ArrowDown, 
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  MoreVertical,
  ShieldCheck, 
  Zap, 
  Wallet, 
  Check, 
  Loader2,
  X,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LandingPageProps {
  onLaunchApp: () => void;
  onOpenDocs: () => void;
  onOpenWhitepaper?: () => void;
  lang?: 'en' | 'es';
}

const LANDING_TEXTS = {
  en: {
    badge: 'Chipnet & Mainnet · BCH ⟷ EVM · Solana · TON',
    title1: 'Stablecoins between',
    title2: 'Bitcoin Cash and Web3',
    subtitle: 'Non-custodial bridge, perps, pools and lending across BCH, Polygon, Solana, BNB and TON.',
    launchBtn: 'Launch app',
    docsBtn: 'Read docs',
    demoBadge: 'Live Non-Custodial Demo',
    trySwap: 'Try real swap',
    youPay: 'You pay',
    youReceive: 'You receive',
    swapFor: (sell: string, buy: string) => `Swap ${sell} for ${buy}`,
    signing: 'Signing Transaction...',
    locking: 'Locking in CashScript Covenant (P2SH32)...',
    assurance: '100% Non-custodial · Settled via smart contracts & CashScript covenants',
    confirmed: 'Swap Confirmed On-Chain',
    receivedFrom: (amt: string, sym: string) => `Received from ${amt} ${sym}`,
    settlementTimeLabel: 'Settlement time:',
    settlementTimeVal: '~2.8 seconds',
    securityLabel: 'Security:',
    securityVal: 'Covenant CashScript P2SH32',
    promoModal: {
      badge: 'Official Hackathon Selection',
      title: 'BinaryLiquid @ BCH BLAZE 2026',
      desc: 'BinaryLiquid has been entered into the global Bitcoin Cash hackathon on DoraHacks. Explore our non-custodial bridge and vote for innovation on BCH!',
      acceptBtn: 'Accept & Visit Hackathon',
      dismissBtn: 'Continue to dApp',
    },
    features: [
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
        text: 'BinaryLiquid Wallet, BlConnect, Paytaca, Cashonize and MetaMask.'
      }
    ],
    walletBanner: {
      eyebrow: 'wallet.bliquid.xyz',
      title: 'Non-custodial vault built for Bitcoin Cash.',
      subtitle:
        'Hold BCH and CashTokens with encrypted local storage, instant BlConnect pairing, and 1-click bridge settlements.',
      specs: [
        { label: 'Architecture', value: 'HD BIP44 or Single Address · AES-GCM' },
        { label: 'Connection', value: 'BlConnect Instant & Nostr E2EE' },
        { label: 'Fiat & settlement', value: 'USD, EUR, VES, COP, MXN · P2SH32' }
      ],
      openBtn: 'Open Web Wallet',
      createBtn: 'Create wallet',
      greeting: 'Hi, Sovereign',
      vaultReady: 'BCH L1 Vault Ready',
      portfolioLabel: 'Portfolio',
      networkBadge: 'Chipnet + Mainnet',
      txHeading: 'Transactions',
      faucetSub: 'CashTokens L1 · Confirmed',
      sendLabel: 'Send @user',
      sendSub: 'Fee ~250 sats · Schnorr',
      bridgeSub: 'Polygon & Solana ↔ BCH'
    }
  },
  es: {
    badge: 'Chipnet y Mainnet · BCH ⟷ EVM · Solana · TON',
    title1: 'Stablecoins entre',
    title2: 'Bitcoin Cash y Web3',
    subtitle: 'Puente sin custodia, perps, pools y lending entre BCH, Polygon, Solana, BNB y TON.',
    launchBtn: 'Abrir aplicación',
    docsBtn: 'Ver documentación',
    demoBadge: 'Demo en Vivo Sin Custodia',
    trySwap: 'Probar swap real',
    youPay: 'Pagas',
    youReceive: 'Recibes',
    swapFor: (sell: string, buy: string) => `Intercambiar ${sell} por ${buy}`,
    signing: 'Firmando Transacción...',
    locking: 'Bloqueando en Covenant CashScript (P2SH32)...',
    assurance: '100% Sin custodia · Liquidado vía smart contracts y covenants CashScript',
    confirmed: 'Swap Confirmado On-Chain',
    receivedFrom: (amt: string, sym: string) => `Recibido desde ${amt} ${sym}`,
    settlementTimeLabel: 'Tiempo de liquidación:',
    settlementTimeVal: '~2.8 segundos',
    securityLabel: 'Seguridad:',
    securityVal: 'Covenant CashScript P2SH32',
    promoModal: {
      badge: 'Selección Oficial Hackathon',
      title: 'BinaryLiquid @ BCH BLAZE 2026',
      desc: 'BinaryLiquid participa en el hackathon global de Bitcoin Cash en DoraHacks. ¡Descubre nuestro puente sin custodia y apoya la innovación en BCH!',
      acceptBtn: 'Aceptar y Visitar Hackathon',
      dismissBtn: 'Continuar a la app',
    },
    features: [
      {
        icon: ShieldCheck,
        title: 'Sin custodia',
        text: 'Los fondos se liquidan a través de smart contracts y covenants de CashScript.'
      },
      {
        icon: Zap,
        title: 'Liquidación rápida',
        text: 'Los depósitos se detectan en cadena y se pagan en ~3 segundos.'
      },
      {
        icon: Wallet,
        title: 'Tus billeteras',
        text: 'BinaryLiquid Wallet, BlConnect, Paytaca, Cashonize y MetaMask.'
      }
    ],
    walletBanner: {
      eyebrow: 'wallet.bliquid.xyz',
      title: 'Bóveda sin custodia diseñada para Bitcoin Cash.',
      subtitle:
        'Gestiona BCH y CashTokens con cifrado local, conexión instantánea vía BlConnect y retiros por el puente en 1 clic.',
      specs: [
        { label: 'Arquitectura', value: 'HD BIP44 o Address Única · AES-GCM' },
        { label: 'Protocolo', value: 'BlConnect Instant y Nostr E2EE' },
        { label: 'Divisas y red', value: 'USD, EUR, VES, COP, MXN · P2SH32' }
      ],
      openBtn: 'Abrir Web Wallet',
      createBtn: 'Crear bóveda',
      greeting: 'Hola, Soberano',
      vaultReady: 'Bóveda BCH L1 Lista',
      portfolioLabel: 'Portafolio',
      networkBadge: 'Chipnet + Mainnet',
      txHeading: 'Transacciones',
      faucetSub: 'CashTokens L1 · Confirmado',
      sendLabel: 'Envío @usuario',
      sendSub: 'Fee ~250 sats · Schnorr',
      bridgeSub: 'Polygon y Solana ↔ BCH'
    }
  }
};

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

function AnimatedSwapPreview({ onLaunchApp, lang = 'en' }: { onLaunchApp: () => void; lang?: 'en' | 'es' }) {
  const [pairIdx, setPairIdx] = useState(0);
  const [stage, setStage] = useState<'typing' | 'pressing' | 'locking' | 'success'>('typing');
  const [displayAmount, setDisplayAmount] = useState('');

  const t = LANDING_TEXTS[lang === 'es' ? 'es' : 'en'];
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
          <span className="text-ink-2">{t.demoBadge}</span>
        </div>
        <span className="group-hover:text-primary transition-colors font-medium flex items-center gap-1">
          <span>{t.trySwap}</span>
          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </span>
      </div>

      {/* Pay Panel */}
      <div className="ui-panel p-4 flex items-center justify-between relative overflow-hidden">
        <div>
          <div className="ui-label">{t.youPay}</div>
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
          <div className="ui-label">{t.youReceive}</div>
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
            <span>{t.swapFor(currentPair.sellToken, currentPair.buyToken)}</span>
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
            <span>{t.signing}</span>
          </motion.button>
        )}

        {stage === 'locking' && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full py-2.5 px-4 rounded-xl bg-primary/10 border border-primary/20 text-ink flex items-center justify-center gap-2 text-xs font-semibold"
          >
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
            <span>{t.locking}</span>
          </motion.div>
        )}
      </div>

      {/* Non-custodial assurance banner */}
      <div className="text-center pt-1">
        <span className="text-[10px] text-ink-3">
          {t.assurance}
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
              <span>{t.confirmed}</span>
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
                  {t.receivedFrom(currentPair.sellAmount, currentPair.sellToken)}
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
                <span>{t.settlementTimeLabel}</span>
                <span className="font-bold text-primary font-mono">{t.settlementTimeVal}</span>
              </div>
              <div className="flex items-center justify-between text-ink-3">
                <span>{t.securityLabel}</span>
                <span className="font-semibold text-ink-2">{t.securityVal}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const WALLET_FIAT_TOTALS = {
  USD: { whole: '$4,850', decimals: '.00' },
  EUR: { whole: '€4,462', decimals: '.00' },
  VES: { whole: 'Bs. 223,100', decimals: '' }
} as const;

function WalletVaultPreview({ lang = 'en' }: { lang?: 'en' | 'es' }) {
  const t = LANDING_TEXTS[lang === 'es' ? 'es' : 'en'].walletBanner;
  const [fiat, setFiat] = useState<'USD' | 'EUR' | 'VES'>('USD');
  const amount = WALLET_FIAT_TOTALS[fiat];

  return (
    <div className="relative mx-auto w-full max-w-[345px] lg:ml-auto lg:mr-0">
      {/* Phone Outer Bezel */}
      <div className="relative rounded-[42px] border-[5px] border-[#090D16] bg-[#121624] p-2.5 shadow-[0_32px_90px_-15px_rgba(0,0,0,0.45)] ring-1 ring-white/10">
        {/* Top Orange Gradient Card inside Phone */}
        <div
          className="relative overflow-hidden rounded-[30px] p-5 text-white shadow-inner"
          style={{
            background: 'linear-gradient(145deg, #FB923C 0%, #F97316 48%, #9A3412 100%)'
          }}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-base font-bold leading-tight">{t.greeting}</div>
              <div className="text-[11px] text-white/80 mt-0.5">{t.vaultReady}</div>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/25 bg-black/25 backdrop-blur">
              <img src="/logo.png" alt="BinaryLiquid Wallet" className="h-6 w-6 rounded-full object-contain" />
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-white/85">
                {t.portfolioLabel} ({fiat})
              </span>
              <div className="inline-flex items-center gap-0.5 rounded-full bg-black/20 p-0.5 border border-white/15">
                {(['USD', 'EUR', 'VES'] as const).map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setFiat(code)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors cursor-pointer ${
                      fiat === code ? 'bg-white text-neutral-900 shadow-xs' : 'text-white/80 hover:text-white'
                    }`}
                  >
                    {code}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              <span className="text-3xl font-bold tracking-tight tabular-nums leading-none">
                {amount.whole}
                {amount.decimals && <span className="text-xl text-white/85">{amount.decimals}</span>}
              </span>
              <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold text-neutral-900 shadow-sm shrink-0">
                {t.networkBadge}
              </span>
            </div>
          </div>

          {/* 4 Circular Quick Action Buttons */}
          <div className="mt-4 grid grid-cols-4 gap-2 text-center">
            <a
              href="https://wallet.bliquid.xyz/dashboard/deposit"
              target="_blank"
              rel="noreferrer"
              className="flex h-10 items-center justify-center rounded-full border border-white/25 bg-white/15 text-xs font-semibold text-white backdrop-blur transition hover:bg-white/25"
            >
              Add +
            </a>
            <a
              href="https://wallet.bliquid.xyz/dashboard/send"
              target="_blank"
              rel="noreferrer"
              aria-label="Send"
              className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-white/15 text-white backdrop-blur transition hover:bg-white/25"
            >
              <ArrowUpRight className="h-4 w-4" />
            </a>
            <a
              href="https://wallet.bliquid.xyz/dashboard/receive"
              target="_blank"
              rel="noreferrer"
              aria-label="Receive"
              className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-white/15 text-white backdrop-blur transition hover:bg-white/25"
            >
              <ArrowDownLeft className="h-4 w-4" />
            </a>
            <a
              href="https://wallet.bliquid.xyz/dashboard/dapps"
              target="_blank"
              rel="noreferrer"
              aria-label="BlConnect"
              className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-white/15 text-white backdrop-blur transition hover:bg-white/25"
            >
              <Wallet className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* Floating Tilted Pill Overlapping Left Edge */}
        <div
          className="relative z-20 -ml-2 -mt-3 mb-1.5 w-fit max-w-[235px] -rotate-6 rounded-2xl border border-white/30 px-3.5 py-2 text-white shadow-xl backdrop-blur-xl sm:-ml-8"
          style={{
            background: 'linear-gradient(90deg, #FB923C 0%, #C2410C 100%)'
          }}
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/20">
              <ArrowLeftRight className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="text-xs font-bold leading-tight">Watchman Bridge</div>
              <div className="text-[10px] text-white/90">{t.bridgeSub}</div>
            </div>
          </div>
        </div>

        {/* Lower Phone Feed: Recent Transactions */}
        <div className="px-2.5 pb-2.5 pt-1">
          <div className="mb-2 flex items-center justify-between text-xs font-semibold text-white/90">
            <span>{t.txHeading}</span>
            <MoreVertical className="h-3.5 w-3.5 text-white/50" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src="/PUSD.png"
                  alt="PUSD"
                  className="h-7 w-7 rounded-xl bg-white/90 p-0.5 object-contain shrink-0"
                />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white truncate">Faucet / Bridge PUSD</div>
                  <div className="text-[10px] text-white/55 truncate">{t.faucetSub}</div>
                </div>
              </div>
              <span className="font-mono text-xs font-bold text-emerald-400 shrink-0 tabular-nums">+50.00</span>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src="/BCH.png"
                  alt="BCH"
                  className="h-7 w-7 rounded-xl bg-white/90 p-0.5 object-contain shrink-0"
                />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white truncate">{t.sendLabel}</div>
                  <div className="text-[10px] text-white/55 truncate">{t.sendSub}</div>
                </div>
              </div>
              <span className="font-mono text-xs font-bold text-white/90 shrink-0 tabular-nums">-0.025 BCH</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage({ onLaunchApp, onOpenDocs, onOpenWhitepaper, lang = 'en' }: LandingPageProps) {
  const t = LANDING_TEXTS[lang === 'es' ? 'es' : 'en'];
  const [showPromoModal, setShowPromoModal] = useState<boolean>(false);

  useEffect(() => {
    try {
      const isDismissed = localStorage.getItem('bliq_blaze_banner_dismissed') === 'true';
      const forceShow = typeof window !== 'undefined' && (
        window.location.search.includes('promo=1') ||
        window.location.search.includes('banner=1')
      );
      if (!isDismissed || forceShow) {
        const timer = setTimeout(() => setShowPromoModal(true), 400);
        return () => clearTimeout(timer);
      }
    } catch {
      setShowPromoModal(true);
    }
  }, []);

  const handleAcceptPromo = () => {
    try {
      localStorage.setItem('bliq_blaze_banner_dismissed', 'true');
    } catch {}
    setShowPromoModal(false);
    window.open('https://dorahacks.io/hackathon/bchblaze2026/detail', '_blank', 'noopener,noreferrer');
  };

  const handleDismissPromo = () => {
    try {
      localStorage.setItem('bliq_blaze_banner_dismissed', 'true');
    } catch {}
    setShowPromoModal(false);
  };

  return (
    <div className="w-full flex flex-col flex-1 text-ink pb-28 md:pb-12 overflow-x-hidden">
      {/* HERO */}
      <section className="px-4 sm:px-6 pt-8 sm:pt-12 pb-8 sm:pb-10 max-w-3xl mx-auto w-full text-center">
        <span className="ui-badge-warn mb-4">{t.badge}</span>

        <h1 className="text-4xl sm:text-[54px] font-semibold tracking-tight leading-[1.08] text-ink">
          {t.title1}
          <br />
          {t.title2}
        </h1>

        <p className="mt-3.5 text-base sm:text-lg text-ink-2 max-w-[560px] mx-auto leading-relaxed">
          {t.subtitle}
        </p>

        <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
          <button 
            type="button" 
            onMouseEnter={() => import('./BridgeSwap')}
            onClick={onLaunchApp} 
            className="ui-btn-primary ui-btn-lg px-6 cursor-pointer"
          >
            <span>{t.launchBtn}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button 
            type="button" 
            onMouseEnter={() => import('./DocsView')}
            onClick={onOpenDocs} 
            className="ui-btn-secondary ui-btn-lg px-6 cursor-pointer"
          >
            {t.docsBtn}
          </button>
        </div>
      </section>

      {/* ANIMATED PREVIEW CARD */}
      <section className="px-4 sm:px-6 max-w-md mx-auto w-full">
        <AnimatedSwapPreview onLaunchApp={onLaunchApp} lang={lang} />
      </section>

      {/* FEATURES */}
      <section className="px-4 sm:px-6 pt-16 sm:pt-20 pb-14 sm:pb-16 max-w-5xl mx-auto w-full">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-10">
          {t.features.map(({ icon: Icon, title, text }) => (
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

      {/* BINARYLIQUID WALLET SHOWCASE */}
      <section className="px-4 sm:px-6 pb-16 sm:pb-20 max-w-5xl mx-auto w-full">
        <div className="ui-divider pt-14 sm:pt-16 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          <div className="lg:col-span-6 space-y-6 text-left">
            <div className="flex items-center gap-2.5">
              <img
                src="/logo.png"
                alt="BinaryLiquid Wallet"
                className="w-6 h-6 rounded-full object-contain border border-line bg-surface shrink-0"
              />
              <span className="text-sm font-semibold text-ink">BinaryLiquid Wallet</span>
              <span className="text-ink-3 text-xs">·</span>
              <span className="text-xs font-mono text-ink-3">{t.walletBanner.eyebrow}</span>
            </div>

            <div>
              <h2 className="text-2xl sm:text-[32px] font-semibold tracking-tight leading-[1.15] text-ink">
                {t.walletBanner.title}
              </h2>
              <p className="mt-3 text-sm sm:text-[15px] text-ink-2 leading-relaxed max-w-md">
                {t.walletBanner.subtitle}
              </p>
            </div>

            <div className="divide-y divide-line border-y border-line">
              {t.walletBanner.specs.map((item) => (
                <div key={item.label} className="py-3 flex items-center justify-between gap-4 text-xs sm:text-[13px]">
                  <span className="text-ink-3 font-medium shrink-0">{item.label}</span>
                  <span className="text-ink font-medium text-right">{item.value}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
              <a
                href="https://wallet.bliquid.xyz"
                target="_blank"
                rel="noreferrer"
                className="ui-btn-primary px-5"
              >
                <span>{t.walletBanner.openBtn}</span>
                <ExternalLink className="w-4 h-4" />
              </a>
              <a
                href="https://wallet.bliquid.xyz/register"
                target="_blank"
                rel="noreferrer"
                className="ui-btn-secondary px-5"
              >
                <span>{t.walletBanner.createBtn}</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div className="lg:col-span-6">
            <WalletVaultPreview lang={lang} />
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 ui-divider flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-ink-3">
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
          <span className="whitespace-nowrap">© 2026 BinaryLiquid</span>
          <span>·</span>
          <a
            href="https://t.me/drianops"
            target="_blank"
            rel="noreferrer"
            className="hover:text-ink transition-colors font-medium text-ink-2 whitespace-nowrap"
          >
            Drian Stack Labs (@drianops)
          </a>
        </div>
        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-5">
          <a
            href="https://wallet.bliquid.xyz"
            target="_blank"
            rel="noreferrer"
            className="text-ink-2 hover:text-ink font-medium transition-colors whitespace-nowrap"
          >
            Web Wallet
          </a>
          {onOpenWhitepaper && (
            <button
              type="button"
              onClick={onOpenWhitepaper}
              className="text-ink-2 hover:text-ink font-medium transition-colors cursor-pointer whitespace-nowrap"
            >
              Whitepaper v1.0
            </button>
          )}
          <a href="https://paryonusd.com" target="_blank" rel="noreferrer" className="hover:text-ink transition-colors whitespace-nowrap">
            ParyonUSD
          </a>
          <a href="https://bchblaze.cash" target="_blank" rel="noreferrer" className="hover:text-ink transition-colors whitespace-nowrap">
            BCH BLAZE
          </a>
          <a href="https://t.me/bchblaze" target="_blank" rel="noreferrer" className="hover:text-ink transition-colors whitespace-nowrap">
            BCH Blaze TG
          </a>
        </div>
      </footer>

      {/* PROMOTIONAL HACKATHON MODAL */}
      <AnimatePresence>
        {showPromoModal && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-opacity"
            onClick={handleDismissPromo}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ type: 'spring', damping: 26, stiffness: 340 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg bg-surface border border-line rounded-card shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Top Close Button */}
              <button
                type="button"
                onClick={handleDismissPromo}
                className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center transition-colors cursor-pointer border border-white/10"
                title="Cerrar / Close"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Banner Image with Badge */}
              <div className="relative w-full overflow-hidden bg-black flex items-center justify-center border-b border-line group">
                <img
                  src="/binaryliquid_.jpeg"
                  alt="BinaryLiquid - BCH BLAZE 2026"
                  className="w-full h-auto max-h-[260px] sm:max-h-[300px] object-cover"
                />
                <div className="absolute top-3 left-3 pointer-events-none">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/85 backdrop-blur-md border border-primary/40 text-primary text-[11px] font-bold shadow-md">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    {t.promoModal.badge}
                  </span>
                </div>
              </div>

              {/* Content Body */}
              <div className="p-5 sm:p-6 space-y-4">
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-ink tracking-tight flex items-center gap-2">
                    {t.promoModal.title}
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-ink-2 leading-relaxed">
                    {t.promoModal.desc}
                  </p>
                </div>

                {/* Actions */}
                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleAcceptPromo}
                    className="flex-1 ui-btn-primary ui-btn-lg text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all"
                  >
                    <span>{t.promoModal.acceptBtn}</span>
                    <ExternalLink className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleDismissPromo}
                    className="ui-btn-secondary ui-btn-lg text-xs sm:text-sm font-semibold"
                  >
                    {t.promoModal.dismissBtn}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
