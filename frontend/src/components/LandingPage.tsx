import { useState, useEffect, useRef } from 'react';
import { 
  ArrowRight, 
  ArrowDown, 
  ArrowUp,
  ArrowDownLeft,
  ArrowLeftRight,
  ScanLine,
  RefreshCw,
  Home,
  BarChart2,
  Shield,
  Check, 
  Loader2,
  ExternalLink,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type LandingNavView = 'bridge' | 'p2p' | 'pools' | 'identity' | 'sdk' | 'docs' | 'whitepaper';

interface LandingPageProps {
  onLaunchApp: () => void;
  onLaunchPair?: (fromId: string, toId: string) => void;
  onOpenDocs: () => void;
  onOpenWhitepaper?: () => void;
  onNavigateView?: (view: LandingNavView) => void;
  lang?: 'en' | 'es';
}

interface FloatingCoinConfig {
  tokenId: string;
  symbol: string;
  network: string;
  icon: string;
  side: 'left' | 'right';
  size: number;
  xPct: number;
  yPct: number;
  vx: number;
  vy: number;
}

const FLOATING_COINS: FloatingCoinConfig[] = [
  // Open left corridor (x: 3%..21%)
  { tokenId: 'pusd_bch', symbol: 'PUSD', network: 'BCH', icon: '/PUSD.png', side: 'left', size: 54, xPct: 9, yPct: 16, vx: 13, vy: 9 },
  { tokenId: 'bch_l1', symbol: 'BCH', network: 'Bitcoin Cash', icon: '/BCH.png', side: 'left', size: 52, xPct: 18, yPct: 44, vx: -11, vy: 12 },
  { tokenId: 'musd_bch', symbol: 'MUSD', network: 'BCH', icon: '/MUSD.png', side: 'left', size: 46, xPct: 7, yPct: 68, vx: 12, vy: -10 },
  { tokenId: 'ltc_l1', symbol: 'LTC', network: 'Litecoin', icon: '/LTC.png', side: 'left', size: 44, xPct: 17, yPct: 84, vx: -10, vy: -9 },
  // Open right corridor (x: 79%..95%)
  { tokenId: 'usdt_polygon', symbol: 'USDT', network: 'Polygon', icon: '/USDT.png', side: 'right', size: 54, xPct: 87, yPct: 18, vx: -13, vy: 10 },
  { tokenId: 'sol_spl', symbol: 'SOL', network: 'Solana', icon: '/SOL.png', side: 'right', size: 50, xPct: 79, yPct: 45, vx: 11, vy: -12 },
  { tokenId: 'bnb_bsc', symbol: 'BNB', network: 'BNB Chain', icon: '/BNB.png', side: 'right', size: 46, xPct: 90, yPct: 68, vx: -11, vy: -9 },
  { tokenId: 'ton_l1', symbol: 'TON', network: 'TON', icon: '/TON.png', side: 'right', size: 44, xPct: 80, yPct: 84, vx: 10, vy: 11 }
];

function FloatingCoinField({
  lang,
  onSelectPair
}: {
  lang: 'en' | 'es';
  onSelectPair: (fromId: string, toId: string) => void;
}) {
  const isEs = lang === 'es';
  const containerRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const hoveredIdxRef = useRef<number | null>(null);
  const selectedIdxRef = useRef<number | null>(null);

  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [launchingPair, setLaunchingPair] = useState<{ from: FloatingCoinConfig; to: FloatingCoinConfig } | null>(null);

  useEffect(() => {
    hoveredIdxRef.current = hoveredIdx;
  }, [hoveredIdx]);

  useEffect(() => {
    selectedIdxRef.current = selectedIdx;
  }, [selectedIdx]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let rect = container.getBoundingClientRect();
    const bodies = FLOATING_COINS.map((c) => ({
      x: (c.xPct / 100) * Math.max(rect.width, 1024),
      y: (c.yPct / 100) * Math.max(rect.height, 640),
      vx: c.vx,
      vy: c.vy,
      baseVx: c.vx,
      baseVy: c.vy,
      r: c.size / 2,
      side: c.side
    }));

    const applyTransforms = () => {
      for (let i = 0; i < bodies.length; i++) {
        const el = nodeRefs.current[i];
        if (!el) continue;
        const b = bodies[i];
        el.style.transform = `translate3d(${(b.x - b.r).toFixed(1)}px, ${(b.y - b.r).toFixed(1)}px, 0)`;
      }
    };

    const handleResize = () => {
      if (!containerRef.current) return;
      const next = containerRef.current.getBoundingClientRect();
      if (next.width > 0 && rect.width > 0) {
        const sx = next.width / rect.width;
        const sy = next.height / Math.max(rect.height, 1);
        for (const b of bodies) {
          b.x *= sx;
          b.y *= sy;
        }
      }
      rect = next;
      applyTransforms();
    };

    applyTransforms();
    window.addEventListener('resize', handleResize);

    if (prefersReduced) {
      return () => window.removeEventListener('resize', handleResize);
    }

    let rafId = 0;
    let lastTs = performance.now();

    const step = (now: number) => {
      const dt = Math.min((now - lastTs) / 1000, 0.05);
      lastTs = now;

      const w = rect.width;
      const h = rect.height;

      if (w >= 960 && h > 200) {
        for (let i = 0; i < bodies.length; i++) {
          const b = bodies[i];
          const isPaused = hoveredIdxRef.current === i || selectedIdxRef.current === i;

          if (isPaused) {
            // Smooth instant braking on hover or selection
            b.vx *= Math.pow(0.001, dt);
            b.vy *= Math.pow(0.001, dt);
            if (Math.abs(b.vx) < 0.2) b.vx = 0;
            if (Math.abs(b.vy) < 0.2) b.vy = 0;
          } else {
            // Gently recover ambient drift speed when released
            const curSpeed = Math.hypot(b.vx, b.vy);
            const targetSpeed = Math.hypot(b.baseVx, b.baseVy);
            if (curSpeed < 1.5) {
              b.vx += (b.baseVx - b.vx) * Math.min(1, dt * 2.2);
              b.vy += (b.baseVy - b.vy) * Math.min(1, dt * 2.2);
            } else if (curSpeed < targetSpeed * 0.85) {
              const boost = 1 + dt * 1.4;
              b.vx *= boost;
              b.vy *= boost;
            }
          }

          b.x += b.vx * dt;
          b.y += b.vy * dt;

          // Keep strictly inside open left/right hero margins so text & card stay 100% clear across 1024px–1920px+
          const centerHalfClear = b.y < 340 ? 330 : 250;
          const minX =
            b.side === 'left'
              ? Math.max(b.r + 14, w * 0.025)
              : Math.max(w * 0.77 + b.r, w / 2 + centerHalfClear + b.r + 12);
          const maxX =
            b.side === 'left'
              ? Math.max(
                  Math.max(b.r + 14, w * 0.025) + 12,
                  Math.min(w * 0.23 - b.r, w / 2 - centerHalfClear - b.r - 12)
                )
              : Math.min(w - b.r - 14, w * 0.975);
          const minY = b.r + 24;
          const maxY = h - b.r - 28;

          if (b.x < minX) {
            b.x = minX;
            b.vx = Math.abs(b.vx);
            b.baseVx = Math.abs(b.baseVx);
          } else if (b.x > maxX) {
            b.x = maxX;
            b.vx = -Math.abs(b.vx);
            b.baseVx = -Math.abs(b.baseVx);
          }

          if (b.y < minY) {
            b.y = minY;
            b.vy = Math.abs(b.vy);
            b.baseVy = Math.abs(b.baseVy);
          } else if (b.y > maxY) {
            b.y = maxY;
            b.vy = -Math.abs(b.vy);
            b.baseVy = -Math.abs(b.baseVy);
          }
        }

        // Gentle elastic separation between neighboring coins on same side
        for (let i = 0; i < bodies.length; i++) {
          for (let j = i + 1; j < bodies.length; j++) {
            const a = bodies[i];
            const b = bodies[j];
            if (a.side !== b.side) continue;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dist = Math.hypot(dx, dy) || 0.001;
            const minDist = a.r + b.r + 26;
            if (dist < minDist) {
              const nx = dx / dist;
              const ny = dy / dist;
              const overlap = (minDist - dist) * 0.5;
              const aPaused = hoveredIdxRef.current === i || selectedIdxRef.current === i;
              const bPaused = hoveredIdxRef.current === j || selectedIdxRef.current === j;
              if (!aPaused) {
                a.x -= nx * overlap;
                a.y -= ny * overlap;
                a.vx -= nx * 6;
                a.vy -= ny * 6;
              }
              if (!bPaused) {
                b.x += nx * overlap;
                b.y += ny * overlap;
                b.vx += nx * 6;
                b.vy += ny * 6;
              }
            }
          }
        }

        applyTransforms();
      }

      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleCoinClick = (idx: number) => {
    if (launchingPair) return;
    if (selectedIdx === null) {
      setSelectedIdx(idx);
      return;
    }
    if (selectedIdx === idx) {
      setSelectedIdx(null);
      return;
    }
    const first = FLOATING_COINS[selectedIdx];
    const second = FLOATING_COINS[idx];
    setLaunchingPair({ from: first, to: second });
    setTimeout(() => {
      onSelectPair(first.tokenId, second.tokenId);
    }, 220);
  };

  const firstCoin = selectedIdx !== null ? FLOATING_COINS[selectedIdx] : null;
  const hoveredCoin = hoveredIdx !== null ? FLOATING_COINS[hoveredIdx] : null;

  return (
    <>
      {/* Ambient Interactive Floating Coins (Desktop lg+ margins only) */}
      <div
        ref={containerRef}
        aria-label={isEs ? 'Monedas interactivas para armar par de swap' : 'Interactive floating coins to build a swap pair'}
        className="hidden lg:block absolute inset-0 overflow-visible pointer-events-none z-10"
      >
        {FLOATING_COINS.map((coin, idx) => {
          const isHovered = hoveredIdx === idx;
          const isSelected = selectedIdx === idx;
          const isTargetPreview = firstCoin !== null && isHovered && !isSelected;

          return (
            <button
              key={coin.tokenId}
              data-floating-coin={coin.tokenId}
              ref={(el) => {
                nodeRefs.current[idx] = el;
              }}
              type="button"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx((prev) => (prev === idx ? null : prev))}
              onFocus={() => setHoveredIdx(idx)}
              onBlur={() => setHoveredIdx((prev) => (prev === idx ? null : prev))}
              onClick={() => handleCoinClick(idx)}
              style={{ width: coin.size, height: coin.size }}
              className={`pointer-events-auto absolute top-0 left-0 rounded-full flex items-center justify-center cursor-pointer transition-[opacity,box-shadow,border-color,background-color] duration-200 will-change-transform group ${
                isSelected
                  ? 'opacity-100 bg-surface border-2 border-primary shadow-lg shadow-primary/20 z-30'
                  : isHovered
                    ? 'opacity-100 bg-surface border border-line-strong shadow-md z-30'
                    : firstCoin
                      ? 'opacity-90 bg-surface/90 border border-line hover:border-primary/60 shadow-soft z-20'
                      : 'opacity-70 bg-surface/80 border border-line/80 shadow-soft z-10'
              }`}
              title={
                firstCoin && !isSelected
                  ? `${firstCoin.symbol} → ${coin.symbol}`
                  : `${coin.symbol} (${coin.network})`
              }
            >
              <img
                src={coin.icon}
                alt=""
                draggable={false}
                className={`w-[64%] h-[64%] rounded-full object-contain transition-transform duration-200 ${
                  isHovered || isSelected ? 'scale-110' : 'scale-100'
                }`}
              />

              {/* Crisp Hover / Selected Floating Label */}
              {(isHovered || isSelected) && (
                <span className="pointer-events-none absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink text-canvas px-2.5 py-0.5 text-[10.5px] font-semibold shadow-sm tracking-tight">
                  {isTargetPreview && firstCoin
                    ? `${firstCoin.symbol} → ${coin.symbol}`
                    : isSelected
                      ? `${coin.symbol} · ${isEs ? 'origen' : 'from'}`
                      : `${coin.symbol} · ${coin.network}`}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Whisper-Clean Floating Pair Builder Pill (appears only when a coin is picked) */}
      <AnimatePresence>
        {(firstCoin || launchingPair) && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="hidden lg:flex fixed bottom-6 left-1/2 -translate-x-1/2 z-50 items-center gap-3 rounded-full border border-line-strong bg-surface/95 backdrop-blur-md pl-3 pr-2 py-2 shadow-xl text-xs"
          >
            {launchingPair ? (
              <div className="flex items-center gap-2 px-2 font-semibold text-ink">
                <img src={launchingPair.from.icon} alt="" className="w-4 h-4 rounded-full object-contain" />
                <span>{launchingPair.from.symbol}</span>
                <ArrowRight className="w-3.5 h-3.5 text-primary" />
                <img src={launchingPair.to.icon} alt="" className="w-4 h-4 rounded-full object-contain" />
                <span>{launchingPair.to.symbol}</span>
              </div>
            ) : firstCoin ? (
              <>
                <div className="flex items-center gap-1.5 font-semibold text-ink">
                  <img src={firstCoin.icon} alt="" className="w-4 h-4 rounded-full object-contain" />
                  <span>{firstCoin.symbol}</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-ink-3" />
                {hoveredCoin && hoveredCoin.tokenId !== firstCoin.tokenId ? (
                  <div className="flex items-center gap-1.5 font-semibold text-primary">
                    <img src={hoveredCoin.icon} alt="" className="w-4 h-4 rounded-full object-contain" />
                    <span>{hoveredCoin.symbol}</span>
                  </div>
                ) : (
                  <span className="text-ink-2">
                    {isEs ? 'Elige otra moneda flotante para hacer swap' : 'Click another floating coin to swap'}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedIdx(null)}
                  aria-label={isEs ? 'Cancelar selección' : 'Cancel selection'}
                  className="ml-1 w-6 h-6 rounded-full bg-surface-2 hover:bg-surface-3 text-ink-3 hover:text-ink flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

const SUPPORTED_RAIL_ITEMS = [
  { label: 'Bitcoin Cash', icon: '/BCH.png' },
  { label: 'ParyonUSD', icon: '/PUSD.png' },
  { label: 'Moria USD', icon: '/MUSD.png' },
  { label: 'Polygon', icon: '/POL.png' },
  { label: 'Solana', icon: '/SOL.png' },
  { label: 'BNB Chain', icon: '/BNB.png' },
  { label: 'TON', icon: '/TON.png' },
  { label: 'Litecoin', icon: '/LTC.png' }
] as const;

const LANDING_TEXTS = {
  en: {
    badge: 'Mainnet & Chipnet · BCH · EVM · Solana · TON',
    title1: 'Stablecoins between',
    title2: 'Bitcoin Cash and Web3',
    subtitle: 'Non-custodial bridge, P2P fiat escrow, sovereign identity and web wallet built natively for Bitcoin Cash.',
    launchBtn: 'Launch app',
    docsBtn: 'Read docs',
    demoBadge: 'Live Non-Custodial Demo',
    trySwap: 'Try real swap',
    youPay: 'You pay',
    youReceive: 'You receive',
    swapFor: (sell: string, buy: string) => `Swap ${sell} for ${buy}`,
    signing: 'Signing Transaction...',
    locking: 'Locking in CashScript Covenant (P2SH32)...',
    assurance: 'Non-custodial · Settled via CashScript covenants & multi-VM vaults',
    confirmed: 'Swap confirmed',
    receivedFrom: (amt: string, sym: string) => `Received from ${amt} ${sym}`,
    settlementTimeLabel: 'Settlement time',
    settlementTimeVal: '~2.8 seconds',
    securityLabel: 'Settlement',
    securityVal: 'CashScript P2SH32',
    protocolSection: {
      eyebrow: 'Architecture',
      title: 'Native contracts, end to end.',
      desc: 'Every module runs on our own non-custodial CashScript covenants, multi-VM vaults and open standards — auditable on GitHub.',
      githubCta: 'Inspect source on GitHub',
      rows: [
        {
          num: '01',
          name: 'Cross-Chain Bridge & AMM Pools',
          meta: 'CashScript P2SH-32 · EVM · Solana Anchor · TON',
          desc: 'Bidirectional stablecoin settlement (PUSD, MUSD, USDT, USDC) with 24-hour autonomous refund timelocks and 0.30% LP fee split.',
          action: 'Open Bridge',
          view: 'bridge' as LandingNavView
        },
        {
          num: '02',
          name: 'P2P Fiat-to-Crypto Escrow',
          meta: 'Per-trade P2SH-32 · 0% protocol fee',
          desc: 'Destination-locked CashScript escrows for local fiat rails with identity-gated trade rooms and verifiable on-chain release.',
          action: 'Open P2P Desk',
          view: 'p2p' as LandingNavView
        },
        {
          num: '03',
          name: 'UserLink Sovereign Identity',
          meta: 'Nostr Kind 30078 · NIP-05 · Standalone SDK',
          desc: 'Human-readable @handle@bliquid.xyz payment handles with dual BCH/Schnorr signatures, W3C DID resolution and zero L1 gas.',
          action: 'Open Identity',
          view: 'identity' as LandingNavView
        }
      ],
      explainerRow: {
        num: '04',
        name: 'Interactive Explainer Studios',
        meta: 'English & Spanish · Browser-native walkthroughs',
        desc: 'Two narrated technical guides walking through CashScript P2SH-32 cross-chain liquidity and UserLink sovereign identity.',
        link1: 'Bridge & Covenants',
        link2: 'UserLink Identity'
      }
    },
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
      createBtn: 'Create wallet'
    }
  },
  es: {
    badge: 'Mainnet y Chipnet · BCH · EVM · Solana · TON',
    title1: 'Stablecoins entre',
    title2: 'Bitcoin Cash y Web3',
    subtitle: 'Puente sin custodia, mesa P2P fiat, identidad soberana y web wallet construidos de forma nativa para Bitcoin Cash.',
    launchBtn: 'Abrir aplicación',
    docsBtn: 'Ver documentación',
    demoBadge: 'Demo en Vivo Sin Custodia',
    trySwap: 'Probar swap real',
    youPay: 'Pagas',
    youReceive: 'Recibes',
    swapFor: (sell: string, buy: string) => `Intercambiar ${sell} por ${buy}`,
    signing: 'Firmando Transacción...',
    locking: 'Bloqueando en Covenant CashScript (P2SH32)...',
    assurance: 'Sin custodia · Liquidado vía covenants CashScript y bóvedas multi-VM',
    confirmed: 'Swap confirmado',
    receivedFrom: (amt: string, sym: string) => `Recibido desde ${amt} ${sym}`,
    settlementTimeLabel: 'Tiempo de liquidación',
    settlementTimeVal: '~2.8 segundos',
    securityLabel: 'Liquidación',
    securityVal: 'CashScript P2SH32',
    protocolSection: {
      eyebrow: 'Arquitectura',
      title: 'Contratos propios, de punta a punta.',
      desc: 'Cada módulo corre sobre nuestros propios covenants CashScript, bóvedas multi-VM y estándares abiertos — todo auditable en GitHub.',
      githubCta: 'Revisar código en GitHub',
      rows: [
        {
          num: '01',
          name: 'Puente Cross-Chain y Pools AMM',
          meta: 'CashScript P2SH-32 · EVM · Solana Anchor · TON',
          desc: 'Liquidación bidireccional de stablecoins (PUSD, MUSD, USDT, USDC) con timelocks autónomos de 24 h y reparto de fees 0.30%.',
          action: 'Abrir Bridge',
          view: 'bridge' as LandingNavView
        },
        {
          num: '02',
          name: 'Escrow P2P Fiat-a-Cripto',
          meta: 'P2SH-32 por operación · 0% comisión',
          desc: 'Covenants CashScript con destino bloqueado para pagos bancarios locales, identidad verificada y liberación directa on-chain.',
          action: 'Abrir Mesa P2P',
          view: 'p2p' as LandingNavView
        },
        {
          num: '03',
          name: 'Identidad Soberana UserLink',
          meta: 'Nostr Kind 30078 · NIP-05 · SDK propio',
          desc: 'Nombres legibles @usuario@bliquid.xyz con doble firma BCH/Schnorr, resolución W3C DID y cero gas en capa 1.',
          action: 'Abrir Identidad',
          view: 'identity' as LandingNavView
        }
      ],
      explainerRow: {
        num: '04',
        name: 'Estudios Educativos Interactivos',
        meta: 'Español e Inglés · Recorridos guiados en navegador',
        desc: 'Dos guías técnicas narradas paso a paso sobre liquidez cross-chain con CashScript P2SH-32 e identidad soberana UserLink.',
        link1: 'Bridge y Covenants',
        link2: 'Identidad UserLink'
      }
    },
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
      createBtn: 'Crear bóveda'
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
          ? 'border border-emerald-500/40 shadow-soft'
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
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-20 bg-surface rounded-[22px] p-6 flex flex-col items-center justify-between text-center"
          >
            {/* Center: Overlapping Token Pair + Solid Emerald Check */}
            <div className="space-y-2 my-auto w-full">
              <div className="relative flex items-center justify-center mb-3">
                <img
                  src={currentPair.sellIcon}
                  alt={currentPair.sellToken}
                  className="w-11 h-11 rounded-full object-contain bg-surface-2 border border-line opacity-80 -mr-3"
                />
                <div className="relative">
                  <img
                    src={currentPair.buyIcon}
                    alt={currentPair.buyToken}
                    className="w-12 h-12 rounded-full object-contain bg-surface border border-line ring-4 ring-surface"
                  />
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 450, damping: 22, delay: 0.08 }}
                    className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center ring-[2.5px] ring-surface"
                  >
                    <Check className="w-3 h-3 stroke-[3]" />
                  </motion.span>
                </div>
              </div>

              <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                {lang === 'es' ? 'Swap confirmado' : 'Swap confirmed'}
              </div>

              <div>
                <div className="text-2xl sm:text-3xl font-semibold text-ink tabular-nums tracking-tight">
                  +{currentPair.buyAmount} {currentPair.buyToken}
                </div>
                <div className="text-xs text-ink-3 mt-1">
                  {t.receivedFrom(currentPair.sellAmount, currentPair.sellToken)}
                </div>
              </div>
            </div>

            {/* Bottom info & specs */}
            <div className="w-full rounded-panel bg-surface-2 border border-line divide-y divide-line/60 text-[11px] text-left">
              <div className="flex items-center justify-between px-3 py-2 text-ink-3">
                <span>TxID</span>
                <span className="font-mono text-ink font-medium">{currentPair.fakeTxId}</span>
              </div>
              <div className="flex items-center justify-between px-3 py-2 text-ink-3">
                <span>{t.settlementTimeLabel}</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400 font-mono">{t.settlementTimeVal}</span>
              </div>
              <div className="flex items-center justify-between px-3 py-2 text-ink-3">
                <span>{t.securityLabel}</span>
                <span className="font-medium text-ink-2">{t.securityVal}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const WALLET_PREVIEW_ASSETS = [
  { name: 'Bitcoin Cash', amount: '12.40 BCH', usd: '$5,952.00', unit: '$480.00', icon: '/BCH.png' },
  { name: 'ParyonUSD', amount: '1,455.00 PUSD', usd: '$1,455.00', unit: '$1.00', icon: '/PUSD.png' },
  { name: 'Moria USD', amount: '420.00 MUSD', usd: '$420.00', unit: '$1.00', icon: '/MUSD.png' },
  { name: 'Paytaca LIFT', amount: '18,500 LIFT', usd: '$302.66', unit: '$0.0164', icon: '/LIFT.png' }
] as const;

function WalletVaultPreview({
  lang = 'en',
  onLaunchApp
}: {
  lang?: 'en' | 'es';
  onLaunchApp?: () => void;
}) {
  const isEs = lang === 'es';
  const [net, setNet] = useState<'mainnet' | 'chipnet'>('mainnet');
  const isMain = net === 'mainnet';

  return (
    <div className="relative mx-auto w-full max-w-[330px] lg:ml-auto lg:mr-0 select-none">
      {/* Side Hardware Buttons (Volume + Power) */}
      <span className="pointer-events-none absolute -left-[3px] top-[96px] h-7 w-[3px] rounded-l-sm bg-neutral-700/80" />
      <span className="pointer-events-none absolute -left-[3px] top-[138px] h-11 w-[3px] rounded-l-sm bg-neutral-700/80" />
      <span className="pointer-events-none absolute -left-[3px] top-[192px] h-11 w-[3px] rounded-l-sm bg-neutral-700/80" />
      <span className="pointer-events-none absolute -right-[3px] top-[152px] h-16 w-[3px] rounded-r-sm bg-neutral-700/80" />

      {/* Realistic Smartphone Chassis */}
      <div className="relative rounded-[48px] bg-[#14171F] p-[10px] shadow-[0_36px_80px_-20px_rgba(0,0,0,0.45)] ring-1 ring-black/15 dark:ring-white/15">
        {/* Inner Phone Screen (mirrors wallet.bliquid.xyz) */}
        <div className="relative overflow-hidden rounded-[39px] bg-[#F7F8FA] text-[#11141C]">
          {/* iOS Status Bar + Dynamic Island */}
          <div className="flex items-center justify-between px-6 pt-3 pb-2">
            <span className="text-[11px] font-semibold tracking-tight text-[#11141C] tabular-nums">9:41</span>
            <div className="flex h-[22px] w-[86px] items-center justify-end rounded-full bg-[#0B0D12] px-2.5">
              <span className="h-2 w-2 rounded-full bg-[#1C2230] ring-1 ring-white/10" />
            </div>
            <div className="flex items-center gap-1.5 text-[#11141C]">
              <div className="flex items-end gap-[1.5px]">
                <span className="h-1.5 w-[2px] rounded-full bg-[#11141C]" />
                <span className="h-2 w-[2px] rounded-full bg-[#11141C]" />
                <span className="h-2.5 w-[2px] rounded-full bg-[#11141C]" />
                <span className="h-3 w-[2px] rounded-full bg-[#11141C]/30" />
              </div>
              <div className="h-2.5 w-[18px] rounded-[3px] border border-[#11141C]/60 p-[1.5px] flex items-center">
                <div className="h-full w-3 rounded-[1px] bg-[#11141C]" />
              </div>
            </div>
          </div>

          {/* Wallet App Content */}
          <div className="px-4 pt-2 pb-3">
            {/* App Top Header */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FEF3DC] ring-1 ring-amber-200/70">
                  <img src="/logo.png" alt="BinaryLiquid Wallet" className="h-6 w-6 rounded-full object-contain" />
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-bold leading-tight text-[#11141C] truncate">
                    My BCH Wallet
                  </div>
                  <div className="text-[10.5px] text-slate-400 leading-tight mt-0.5">
                    {isEs ? 'Resumen' : 'Overview'} · {isMain ? 'Mainnet' : 'Chipnet'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <a
                  href="https://wallet.bliquid.xyz/dashboard/receive"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Scan"
                  className="p-1 rounded-lg hover:bg-slate-200/70 transition-colors"
                >
                  <ScanLine className="h-4 w-4" />
                </a>
                <span className="relative p-1">
                  <RefreshCw className="h-4 w-4" />
                  <span className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500 ring-2 ring-[#F7F8FA]" />
                </span>
              </div>
            </div>

            {/* Total Balance + Interactive Mainnet/Chipnet Pill */}
            <div className="mt-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium text-slate-500">
                  {isEs ? 'Balance total' : 'Total balance'}
                </span>
                <button
                  type="button"
                  onClick={() => setNet((prev) => (prev === 'mainnet' ? 'chipnet' : 'mainnet'))}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white border border-slate-200/90 px-2.5 py-0.5 text-[10.5px] font-semibold text-[#11141C] shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
                  title={isEs ? 'Alternar red' : 'Switch network'}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${isMain ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <span>{isMain ? 'Mainnet' : 'Chipnet'}</span>
                </button>
              </div>

              <div className="mt-1 text-[30px] font-extrabold tracking-tight text-[#11141C] tabular-nums leading-none">
                $8,129.66
              </div>

              <div className="mt-1.5 flex items-center gap-1.5 text-[10.5px]">
                <span className="font-semibold text-emerald-600 tabular-nums">1 BCH = $480.00</span>
                <span className="text-slate-300">·</span>
                <span className="font-mono text-slate-400">
                  {isMain ? 'bitcoinc…scfls' : 'bchtest:…u5jz6'}
                </span>
              </div>
            </div>

            {/* 3 Clean Action Tiles (mirrors wallet.bliquid.xyz) */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              <a
                href="https://wallet.bliquid.xyz/dashboard/send"
                target="_blank"
                rel="noreferrer"
                className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-[#EEF0F4] py-2.5 text-[#11141C] transition-colors hover:bg-[#E4E7EE]"
              >
                <ArrowUp className="h-4 w-4 stroke-[2]" />
                <span className="text-[11px] font-semibold">{isEs ? 'Enviar' : 'Send'}</span>
              </a>
              <a
                href="https://wallet.bliquid.xyz/dashboard/receive"
                target="_blank"
                rel="noreferrer"
                className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-[#EEF0F4] py-2.5 text-[#11141C] transition-colors hover:bg-[#E4E7EE]"
              >
                <ArrowDownLeft className="h-4 w-4 stroke-[2]" />
                <span className="text-[11px] font-semibold">{isEs ? 'Recibir' : 'Receive'}</span>
              </a>
              <button
                type="button"
                onClick={onLaunchApp}
                className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-[#EEF0F4] py-2.5 text-[#11141C] transition-colors hover:bg-[#E4E7EE] cursor-pointer"
              >
                <ArrowLeftRight className="h-4 w-4 stroke-[2]" />
                <span className="text-[11px] font-semibold">Swap</span>
              </button>
            </div>

            {/* Your Assets List */}
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[12px] font-bold text-[#11141C]">
                  {isEs ? 'Tus Activos' : 'Your Assets'}
                </span>
                <a
                  href="https://wallet.bliquid.xyz"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10.5px] font-semibold text-amber-600 hover:underline"
                >
                  {isEs ? 'Abrir wallet →' : 'Open wallet →'}
                </a>
              </div>

              <div className="divide-y divide-slate-200/70">
                {WALLET_PREVIEW_ASSETS.map((asset) => (
                  <div key={asset.name} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={asset.icon}
                        alt={asset.name}
                        className="h-7 w-7 rounded-full bg-white p-0.5 border border-slate-200/80 object-contain shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-[12px] font-semibold text-[#11141C] leading-tight truncate">
                          {asset.name}
                        </div>
                        <div className="text-[10px] text-slate-400 tabular-nums mt-0.5">
                          {asset.amount}
                        </div>
                      </div>
                    </div>
                    <div className="text-right tabular-nums shrink-0">
                      <div className="text-[12px] font-semibold text-[#11141C] leading-tight">
                        {asset.usd}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {asset.unit}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Floating Bottom App Navigation Dock */}
          <div className="px-3 pb-2 pt-1">
            <div className="flex items-center justify-between rounded-full border border-slate-200/80 bg-white px-4 py-1.5 shadow-[0_8px_22px_-6px_rgba(15,23,42,0.12)]">
              <a
                href="https://wallet.bliquid.xyz/dashboard"
                target="_blank"
                rel="noreferrer"
                className="flex flex-col items-center gap-0.5 text-[#11141C]"
              >
                <Home className="h-3.5 w-3.5" />
                <span className="text-[9px] font-semibold">{isEs ? 'Inicio' : 'Home'}</span>
              </a>
              <a
                href="https://wallet.bliquid.xyz/dashboard/send"
                target="_blank"
                rel="noreferrer"
                className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-[#11141C]"
              >
                <ArrowLeftRight className="h-3.5 w-3.5" />
                <span className="text-[9px] font-medium">{isEs ? 'Enviar' : 'Send'}</span>
              </a>
              <a
                href="https://wallet.bliquid.xyz"
                target="_blank"
                rel="noreferrer"
                aria-label="BinaryLiquid Wallet"
                className="-my-2 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 p-1 shadow-md ring-4 ring-[#F7F8FA]"
              >
                <img src="/logo.png" alt="BinaryLiquid" className="h-6 w-6 rounded-full object-contain" />
              </a>
              <a
                href="https://wallet.bliquid.xyz/dashboard/history"
                target="_blank"
                rel="noreferrer"
                className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-[#11141C]"
              >
                <BarChart2 className="h-3.5 w-3.5" />
                <span className="text-[9px] font-medium">{isEs ? 'Historial' : 'Activity'}</span>
              </a>
              <a
                href="https://wallet.bliquid.xyz/dashboard/settings"
                target="_blank"
                rel="noreferrer"
                className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-[#11141C]"
              >
                <Shield className="h-3.5 w-3.5" />
                <span className="text-[9px] font-medium">{isEs ? 'Seguridad' : 'Vault'}</span>
              </a>
            </div>
            {/* iOS Home Indicator */}
            <div className="mx-auto mt-2 h-1 w-24 rounded-full bg-slate-900/15" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage({
  onLaunchApp,
  onLaunchPair,
  onOpenDocs,
  onOpenWhitepaper,
  onNavigateView,
  lang = 'en'
}: LandingPageProps) {
  const t = LANDING_TEXTS[lang === 'es' ? 'es' : 'en'];

  const goView = (view: LandingNavView) => {
    if (onNavigateView) {
      onNavigateView(view);
    } else if (view === 'bridge') {
      onLaunchApp();
    } else if (view === 'docs') {
      onOpenDocs();
    } else if (view === 'whitepaper' && onOpenWhitepaper) {
      onOpenWhitepaper();
    }
  };

  return (
    <div className="w-full flex flex-col flex-1 text-ink pb-28 md:pb-12 overflow-x-hidden">
      {/* HERO + INTERACTIVE FLOATING COINS STAGE */}
      <div className="relative w-full max-w-[1380px] mx-auto">
        <FloatingCoinField
          lang={lang}
          onSelectPair={(fromId, toId) => {
            if (onLaunchPair) onLaunchPair(fromId, toId);
            else onLaunchApp();
          }}
        />

        {/* HERO */}
        <section className="relative z-20 px-4 sm:px-6 pt-10 sm:pt-14 pb-8 sm:pb-10 max-w-3xl mx-auto w-full text-center">
          <div className="text-[11px] font-mono tracking-wide text-ink-3 mb-4">
            {t.badge}
          </div>

          <h1 className="text-4xl sm:text-[54px] font-semibold tracking-tight leading-[1.06] text-ink">
            {t.title1}
            <br />
            {t.title2}
          </h1>

          <p className="mt-4 text-base sm:text-lg text-ink-2 max-w-[540px] mx-auto leading-relaxed">
            {t.subtitle}
          </p>

          <div className="mt-7 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
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
        <section className="relative z-20 px-4 sm:px-6 max-w-md mx-auto w-full">
          <AnimatedSwapPreview onLaunchApp={onLaunchApp} lang={lang} />
        </section>
      </div>

      {/* QUIET SUPPORTED NETWORKS STRIP */}
      <section className="px-4 sm:px-6 pt-12 pb-6 max-w-5xl mx-auto w-full">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 py-4 border-y border-line/70">
          {SUPPORTED_RAIL_ITEMS.map((item) => (
            <div key={item.label} className="inline-flex items-center gap-2 text-xs font-medium text-ink-2">
              <img
                src={item.icon}
                alt=""
                aria-hidden="true"
                className="w-4 h-4 rounded-full object-contain"
              />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
        <p className="hidden lg:block text-center text-[11px] font-mono text-ink-3/75 mt-2.5">
          {lang === 'es'
            ? 'Tip: pasa el cursor por cualquier moneda flotante para frenarla — haz clic en dos para abrir ese par.'
            : 'Tip: hover any floating coin to pause it — click two to open that swap pair.'}
        </p>
      </section>

      {/* EDITORIAL PROTOCOL INDEX (Asymmetric Swiss specification list, zero generic cards) */}
      <section className="px-4 sm:px-6 pt-12 sm:pt-16 pb-14 sm:pb-16 max-w-5xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          <div className="lg:col-span-4 space-y-4 text-left lg:sticky lg:top-24">
            <div className="text-xs font-mono text-ink-3">
              {t.protocolSection.eyebrow}
            </div>
            <h2 className="text-2xl sm:text-[30px] font-semibold tracking-tight leading-[1.14] text-ink">
              {t.protocolSection.title}
            </h2>
            <p className="text-sm text-ink-2 leading-relaxed">
              {t.protocolSection.desc}
            </p>
            <div className="pt-1">
              <a
                href="https://github.com/DrianOps/BinaryLiquid"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink hover:text-primary transition-colors"
              >
                <span>{t.protocolSection.githubCta}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <div className="lg:col-span-8 border-t border-line divide-y divide-line">
            {t.protocolSection.rows.map((row) => (
              <button
                key={row.num}
                type="button"
                onClick={() => goView(row.view)}
                className="w-full py-5 sm:py-6 flex items-start justify-between gap-4 text-left group cursor-pointer transition-colors hover:bg-surface-2/40 -mx-3 px-3 rounded-xl"
              >
                <div className="flex items-start gap-4 sm:gap-5 min-w-0">
                  <span className="font-mono text-xs text-ink-3 pt-1 shrink-0">
                    {row.num}
                  </span>
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                      <h3 className="text-[15px] sm:text-base font-semibold text-ink group-hover:text-primary transition-colors">
                        {row.name}
                      </h3>
                      <span className="text-[11px] font-mono text-ink-3">
                        {row.meta}
                      </span>
                    </div>
                    <p className="text-xs sm:text-[13px] text-ink-2 leading-relaxed max-w-xl">
                      {row.desc}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-ink-3 group-hover:text-ink transition-colors shrink-0 pt-1">
                  <span className="hidden sm:inline">{row.action}</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </button>
            ))}

            {/* 04: Interactive Explainer Studios */}
            <div className="py-5 sm:py-6 flex items-start gap-4 sm:gap-5 text-left -mx-3 px-3">
              <span className="font-mono text-xs text-ink-3 pt-1 shrink-0">
                {t.protocolSection.explainerRow.num}
              </span>
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                  <h3 className="text-[15px] sm:text-base font-semibold text-ink">
                    {t.protocolSection.explainerRow.name}
                  </h3>
                  <span className="text-[11px] font-mono text-ink-3">
                    {t.protocolSection.explainerRow.meta}
                  </span>
                </div>
                <p className="text-xs sm:text-[13px] text-ink-2 leading-relaxed max-w-xl">
                  {t.protocolSection.explainerRow.desc}
                </p>
                <div className="pt-1.5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold">
                  <a
                    href="/explainer/"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-ink hover:text-primary transition-colors"
                  >
                    <span>{t.protocolSection.explainerRow.link1}</span>
                    <ExternalLink className="w-3 h-3 text-ink-3" />
                  </a>
                  <a
                    href="/explainer-id/"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-ink hover:text-primary transition-colors"
                  >
                    <span>{t.protocolSection.explainerRow.link2}</span>
                    <ExternalLink className="w-3 h-3 text-ink-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
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
            <WalletVaultPreview lang={lang} onLaunchApp={onLaunchApp} />
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
            href="https://github.com/DrianOps/BinaryLiquid"
            target="_blank"
            rel="noreferrer"
            className="text-ink-2 hover:text-ink font-medium transition-colors whitespace-nowrap"
          >
            GitHub
          </a>
          <a
            href="https://wallet.bliquid.xyz"
            target="_blank"
            rel="noreferrer"
            className="text-ink-2 hover:text-ink font-medium transition-colors whitespace-nowrap"
          >
            Web Wallet
          </a>
          <a
            href="/explainer/"
            target="_blank"
            rel="noreferrer"
            className="hover:text-ink transition-colors whitespace-nowrap"
          >
            Explainers
          </a>
          {onOpenWhitepaper && (
            <button
              type="button"
              onClick={onOpenWhitepaper}
              className="hover:text-ink transition-colors cursor-pointer whitespace-nowrap"
            >
              Whitepaper
            </button>
          )}
          <a href="https://paryonusd.com" target="_blank" rel="noreferrer" className="hover:text-ink transition-colors whitespace-nowrap">
            ParyonUSD
          </a>
          <a href="https://bchblaze.cash" target="_blank" rel="noreferrer" className="hover:text-ink transition-colors whitespace-nowrap">
            BCH BLAZE
          </a>
        </div>
      </footer>
    </div>
  );
}
