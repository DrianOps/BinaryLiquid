import { useState, useEffect } from 'react';
import { ArrowLeft, Check, Copy, ExternalLink } from 'lucide-react';

interface DocsViewProps {
  lang?: 'en' | 'es';
  platformNetwork: 'mainnet' | 'testnet';
  setPlatformNetwork: (net: 'mainnet' | 'testnet') => void;
  onLaunchApp: () => void;
  onOpenWhitepaper?: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  networks: Record<string, any>;
}

const TESTNET_CONTRACTS = [
  {
    key: 'bch-cov',
    labelEs: 'Covenant Bóveda CashTokens (P2SH32)',
    labelEn: 'CashTokens Vault Covenant (P2SH32)',
    network: 'BCH Chipnet (Testnet4)',
    value: 'bchtest:pvqse7cr2ptah2e34sl53r5utqwxl28fk84grvf5ufzd6n5tclme2hmkrmd9e',
    explorer: 'https://chipnet.imaginary.cash/address/bchtest:pvqse7cr2ptah2e34sl53r5utqwxl28fk84grvf5ufzd6n5tclme2hmkrmd9e'
  },
  {
    key: 'pusd-cat',
    labelEs: 'Categoría CashToken PUSD',
    labelEn: 'PUSD CashToken Category ID',
    network: 'CHIP-2022-02',
    value: '6b6cf8de5963d67594a4565d49a7bcf3e668a18a7328828de16bd393ac00dcad',
    explorer: 'https://chipnet.chaingraph.cash'
  },
  {
    key: 'evm-vault',
    labelEs: 'Contrato BinaryLiquidVault.sol',
    labelEn: 'BinaryLiquidVault.sol Contract',
    network: 'Polygon Amoy (80002)',
    value: '0xc830c7cB16cd05bdEd8CA9d0c73E9038ed25Aa4A',
    explorer: 'https://amoy.polygonscan.com/address/0xc830c7cB16cd05bdEd8CA9d0c73E9038ed25Aa4A'
  },
  {
    key: 'evm-usdt',
    labelEs: 'Reserva Estable USDT (ERC-20)',
    labelEn: 'USDT Stable Reserve (ERC-20)',
    network: 'Polygon Amoy (80002)',
    value: '0x1a29793F2a64424D09f56AD045827dF1F0Fa1A75',
    explorer: 'https://amoy.polygonscan.com/address/0x1a29793F2a64424D09f56AD045827dF1F0Fa1A75'
  }
];

const MAINNET_TOKENS = [
  {
    key: 'pos-usdt',
    labelEs: 'Polygon PoS USDT (ERC-20)',
    labelEn: 'Polygon PoS USDT (ERC-20)',
    network: 'Polygon PoS (137)',
    value: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    explorer: 'https://polygonscan.com/token/0xc2132D05D31c914a87C6611C10748AEb04B58e8F'
  },
  {
    key: 'pos-usdc',
    labelEs: 'Polygon PoS USDC (ERC-20)',
    labelEn: 'Polygon PoS USDC (ERC-20)',
    network: 'Polygon PoS (137)',
    value: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    explorer: 'https://polygonscan.com/token/0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359'
  }
];

export default function DocsView({
  lang = 'es',
  platformNetwork,
  setPlatformNetwork,
  onLaunchApp,
  onOpenWhitepaper,
  showToast,
  networks
}: DocsViewProps) {
  const [activeSection, setActiveSection] = useState<string>('overview');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const isEs = lang === 'es';

  const sections = isEs
    ? [
        { id: 'overview', label: '1. Visión general' },
        { id: 'architecture', label: '2. Arquitectura sin custodia' },
        { id: 'pools', label: '3. Pools & Real Yield' },
        { id: 'lending', label: '4. Préstamos & colateral' },
        { id: 'fees', label: '5. Tarifas & oráculos' },
        { id: 'contracts', label: '6. Contratos & billeteras' }
      ]
    : [
        { id: 'overview', label: '1. Overview' },
        { id: 'architecture', label: '2. Architecture' },
        { id: 'pools', label: '3. Pools & Real Yield' },
        { id: 'lending', label: '4. Lending & Collateral' },
        { id: 'fees', label: '5. Fees & Oracles' },
        { id: 'contracts', label: '6. Contracts & Wallets' }
      ];

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const ids = ['overview', 'architecture', 'pools', 'lending', 'fees', 'contracts'];
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((e) => e.isIntersecting);
        if (visible) {
          const clean = visible.target.id.replace(/^doc-/, '');
          setActiveSection(clean);
        }
      },
      { rootMargin: '-18% 0px -68% 0px', threshold: 0.05 }
    );

    ids.forEach((id) => {
      const el = document.getElementById(`doc-${id}`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const el = document.getElementById(`doc-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const copyAddress = (key: string, text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedKey(key);
    showToast(isEs ? 'Dirección copiada al portapapeles' : 'Address copied to clipboard', 'success');
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleSelectNetwork = (next: 'mainnet' | 'testnet') => {
    if (next === platformNetwork) return;
    setPlatformNetwork(next);
    showToast(next === 'mainnet' ? 'Red: Bitcoin Cash Mainnet' : 'Red: BCH Chipnet');
  };

  const contractsList = platformNetwork === 'testnet' ? TESTNET_CONTRACTS : MAINNET_TOKENS;

  return (
    <div className="w-full xl:grid xl:grid-cols-[190px_minmax(0,820px)_190px] xl:justify-center xl:gap-8 items-start">
      {/* BORDERLESS MARGIN OUTLINE (Wide desktop only — matching Whitepaper) */}
      <aside className="hidden xl:block sticky top-24 pt-10">
        <nav aria-label="Documentation sections" className="space-y-1 border-l border-line pl-3">
          {sections.map((sec) => {
            const active = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => scrollToSection(sec.id)}
                className={`block w-full text-left py-1 text-xs transition-colors cursor-pointer ${
                  active
                    ? 'text-ink font-semibold'
                    : 'text-ink-3 hover:text-ink-2 font-normal'
                }`}
              >
                {sec.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* CENTERED DOCUMENT COLUMN */}
      <div className="w-full max-w-[820px] mx-auto space-y-3">
        {/* SUBTLE CONTROLS ABOVE THE PAPER */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <button
            type="button"
            onClick={onLaunchApp}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-3 hover:text-ink transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{isEs ? 'Volver al Swap' : 'Back to Swap'}</span>
          </button>

          <div className="flex items-center gap-2">
            <div className="ui-segment">
              <button
                type="button"
                onClick={() => handleSelectNetwork('testnet')}
                className={`ui-segment-item inline-flex items-center gap-1.5 ${
                  platformNetwork === 'testnet' ? 'ui-segment-item-active' : ''
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>Chipnet</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectNetwork('mainnet')}
                className={`ui-segment-item inline-flex items-center gap-1.5 ${
                  platformNetwork === 'mainnet' ? 'ui-segment-item-active' : ''
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Mainnet</span>
              </button>
            </div>

            {onOpenWhitepaper && (
              <button
                type="button"
                onClick={onOpenWhitepaper}
                className="ui-btn-secondary ui-btn-sm"
              >
                Whitepaper
              </button>
            )}
          </div>
        </div>

        {/* SINGLE CONTINUOUS DOCUMENTATION SHEET */}
        <article className="bg-surface border border-line rounded-xl shadow-soft px-6 py-8 sm:px-14 sm:py-12">
          {/* DOCUMENT HEADER */}
          <header className="pb-6 border-b border-line space-y-3">
            <div className="text-[11px] font-mono text-ink-3">
              BinaryLiquid Protocol · Docs · BCH (CashTokens) ⟷ Polygon EVM · {platformNetwork === 'mainnet' ? 'Mainnet' : 'Chipnet / Amoy'}
            </div>

            <h1 className="text-2xl sm:text-[28px] font-semibold tracking-tight text-ink leading-tight">
              {isEs ? 'Documentación del Protocolo' : 'Protocol Documentation'}
            </h1>

            <p className="text-sm text-ink-2 leading-relaxed">
              {isEs
                ? 'Especificación práctica de la arquitectura no custodial basada en covenants CashScript P2SH32, bóvedas deterministas en Solidity, pools cross-chain y préstamos sobre BCH.'
                : 'Technical reference covering non-custodial CashScript P2SH32 covenants, deterministic EVM vaults, cross-chain liquidity pools, and native BCH collateralized lending.'}
            </p>
          </header>

          {/* COMPACT MOBILE / TABLET JUMP BAR */}
          <nav
            aria-label="Documentation index"
            className="xl:hidden py-3 border-b border-line flex items-center gap-2 overflow-x-auto no-scrollbar"
          >
            {sections.map((sec) => (
              <button
                key={sec.id}
                type="button"
                onClick={() => scrollToSection(sec.id)}
                className={`text-[11px] whitespace-nowrap px-2 py-1 rounded-md transition-colors cursor-pointer ${
                  activeSection === sec.id
                    ? 'bg-surface-2 text-ink font-semibold'
                    : 'text-ink-3 hover:text-ink'
                }`}
              >
                {sec.label}
              </button>
            ))}
          </nav>

          {/* SECTION 1: OVERVIEW */}
          <section id="doc-overview" className="pt-8 scroll-mt-20 space-y-4">
            <h2 className="text-lg font-semibold text-ink">
              {isEs ? '1. Visión general & entornos soportados' : '1. Protocol overview & supported networks'}
            </h2>

            <p className="text-[15px] text-ink-2 leading-[1.75]">
              {isEs
                ? 'BinaryLiquid conecta activos nativos emitidos bajo CashTokens (CHIP-2022-02) en Bitcoin Cash directamente con stablecoins y tokens líquidos en Polygon EVM, sin emisores de tokens envueltos (wrapped IOUs) ni custodia centralizada. El protocolo nació para el track de stablecoins de BCH BLAZE Hackathon en torno a ParyonUSD (PUSD).'
                : 'BinaryLiquid connects native CashTokens assets (CHIP-2022-02) on Bitcoin Cash directly with EVM liquidity on Polygon without wrapped tokens or centralized custody. Built around ParyonUSD (PUSD) for the BCH BLAZE Hackathon stablecoin track.'}
            </p>

            {/* Pure typographic guarantees row */}
            <div className="my-5 py-4 border-y border-line grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <div className="text-ink-3">{isEs ? 'Modelo de custodia' : 'Custody model'}</div>
                <div className="text-base font-semibold text-ink mt-0.5">100% On-Chain</div>
                <div className="text-[11px] text-ink-3 mt-0.5">
                  {isEs ? 'Covenants P2SH32 y bóvedas sin ownerWithdraw' : 'P2SH32 covenants & vaults with no ownerWithdraw'}
                </div>
              </div>
              <div>
                <div className="text-ink-3">{isEs ? 'Liquidación media' : 'Mean settlement'}</div>
                <div className="text-base font-semibold text-ink tabular-nums mt-0.5">~3.2s</div>
                <div className="text-[11px] text-ink-3 mt-0.5">
                  {isEs ? 'Detección UTXO en tiempo real y despacho EVM' : 'Real-time UTXO detection & EVM payout'}
                </div>
              </div>
              <div>
                <div className="text-ink-3">{isEs ? 'Rendimiento Real (LP)' : 'LP Real Yield'}</div>
                <div className="text-base font-semibold text-ink tabular-nums mt-0.5">0.20% / swap</div>
                <div className="text-[11px] text-ink-3 mt-0.5">
                  {isEs ? 'Acreditado a reservas nativas, cero inflación' : 'Accrued directly in native reserves, zero inflation'}
                </div>
              </div>
            </div>

            {/* Active environment explorers */}
            <div className="divide-y divide-line border-y border-line text-xs">
              <div className="py-3 flex items-center justify-between gap-4">
                <div>
                  <div className="text-ink-3 text-[11px]">Bitcoin Cash</div>
                  <div className="font-medium text-ink flex items-center gap-2 mt-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${platformNetwork === 'mainnet' ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                    <span>{platformNetwork === 'mainnet' ? 'BCH Mainnet' : 'BCH Chipnet (Testnet4)'}</span>
                  </div>
                </div>
                <a
                  href={networks[platformNetwork]?.explorerBch}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-ink-2 hover:text-ink font-medium"
                >
                  <span>Explorer</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="py-3 flex items-center justify-between gap-4">
                <div>
                  <div className="text-ink-3 text-[11px]">EVM Layer</div>
                  <div className="font-medium text-ink flex items-center gap-2 mt-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${platformNetwork === 'mainnet' ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                    <span>{platformNetwork === 'mainnet' ? 'Polygon PoS (137)' : 'Polygon Amoy (80002)'}</span>
                  </div>
                </div>
                <a
                  href={networks[platformNetwork]?.explorerEvm}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-ink-2 hover:text-ink font-medium"
                >
                  <span>Explorer</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </section>

          {/* SECTION 2: NON-CUSTODIAL ARCHITECTURE */}
          <section id="doc-architecture" className="pt-8 scroll-mt-20 space-y-4">
            <h2 className="text-lg font-semibold text-ink">
              {isEs ? '2. Arquitectura sin custodia & covenants' : '2. Non-custodial architecture & covenants'}
            </h2>

            <p className="text-[15px] text-ink-2 leading-[1.75]">
              {isEs
                ? 'Las llaves privadas del usuario nunca salen de su billetera. Cada intercambio bloquea fondos en contratos deterministas auditables en ambas cadenas:'
                : 'User private keys never leave their wallet. Each swap locks principal directly into verifiable on-chain contracts across both chains:'}
            </p>

            <div className="space-y-3 pl-3 border-l-2 border-line">
              <div>
                <h3 className="text-sm font-semibold text-ink">
                  BinaryLiquidEscrow.cash &amp; BinaryLiquidVault.cash (P2SH32)
                </h3>
                <p className="text-sm text-ink-2 leading-relaxed mt-1">
                  {isEs
                    ? 'Cada orden instancia un covenant P2SH32 parametrizado con un orderSalt de 16 bytes. Mediante introspección UTXO nativa, settleToVault obliga por consenso a enviar el 100% de los tokens hacia BinaryLiquidVault.cash, cuyo remanente regresa al mismo lockingBytecode. Si pasan 24h sin liquidación, refund() permite al usuario recuperar su depósito sin permisos externos.'
                    : 'Each swap deploys a deterministic P2SH32 escrow parameterized with a 16-byte orderSalt. Via native UTXO introspection, settleToVault forces 100% of tokens into BinaryLiquidVault.cash, while state continuation sends any remainder back to the vault lockingBytecode. After 24h, refund() grants permissionless unilateral recovery.'}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-ink">
                  BinaryLiquidVault.sol (Polygon EVM)
                </h3>
                <p className="text-sm text-ink-2 leading-relaxed mt-1">
                  {isEs
                    ? 'Bóveda ERC-20 con ReentrancyGuard y disyuntor por operación (MAX_SINGLE_PAYOUT = 50,000 USDC/USDT). Carece de función administrativa ownerWithdraw; los pagos requieren firma EIP-191 ligada a block.chainid y address(this) con registro anti-replay (executedPayouts). La especificación V2 añade timelock de 48h para rotación de firmante y límites diarios.'
                    : 'ERC-20 liquidity vault protected with ReentrancyGuard and a per-tx cap (MAX_SINGLE_PAYOUT = 50,000 USDC/USDT). Contains no ownerWithdraw admin function; payouts require Watchman EIP-191 attestation bound to block.chainid and address(this) with executedPayouts anti-replay. BinaryLiquidVaultV2 adds a 48h signer-rotation timelock and daily caps.'}
                </p>
              </div>
            </div>

            {/* 4-step pipeline strip */}
            <div className="my-5 py-4 border-y border-line grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
              {[
                {
                  step: '01',
                  title: isEs ? 'Cotización Oracle' : 'Oracle quote',
                  desc: isEs ? 'Cálculo en vivo y comisión transparente de 0.30%.' : 'Live market feed and flat 0.30% fee computation.'
                },
                {
                  step: '02',
                  title: isEs ? 'Bloqueo P2SH32' : 'Covenant lock',
                  desc: isEs ? 'El usuario firma desde su billetera hacia el escrow único.' : 'User signs lock transaction directly into P2SH32 escrow.'
                },
                {
                  step: '03',
                  title: isEs ? 'Validación Watchman' : 'Watchman proof',
                  desc: isEs ? 'Detección UTXO, auditoría de desvío (≤1.5%) y firma EIP-191.' : 'UTXO check, ≤1.5% oracle audit & EIP-191 attestation.'
                },
                {
                  step: '04',
                  title: isEs ? 'Despacho nativo' : 'Native payout',
                  desc: isEs ? 'Liberación al destinatario en ~3.2s con timelock de 24h.' : 'Native asset release to recipient in ~3.2s (24h safety exit).'
                }
              ].map((s) => (
                <div key={s.step} className="space-y-1">
                  <div className="font-mono text-[11px] text-ink-3">{s.step}</div>
                  <div className="font-semibold text-ink">{s.title}</div>
                  <p className="text-[11px] text-ink-3 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* SECTION 3: POOLS & REAL YIELD */}
          <section id="doc-pools" className="pt-8 scroll-mt-20 space-y-4">
            <h2 className="text-lg font-semibold text-ink">
              {isEs ? '3. Pools cross-chain & Real Yield' : '3. Cross-chain liquidity pools & Real Yield'}
            </h2>

            <p className="text-[15px] text-ink-2 leading-[1.75]">
              {isEs
                ? 'Los Proveedores de Liquidez (LPs) depositan inventario nativo sin tokens intermediarios. En cada swap, el 0.20% del volumen se acumula directamente en las reservas a favor de los LP Shares (Real Yield sin emisión inflacionaria).'
                : 'Liquidity Providers (LPs) supply native inventory on each chain. On every executed swap, 0.20% of volume accrues directly to pool reserves pro-rata by LP Shares with zero inflationary token emissions.'}
            </p>

            <div className="overflow-x-auto border-y border-line">
              <table className="w-full text-left text-xs">
                <thead className="text-ink border-b border-line">
                  <tr>
                    <th className="py-2.5 pr-4 font-semibold">{isEs ? 'Par' : 'Pair'}</th>
                    <th className="py-2.5 px-4 font-semibold">{isEs ? 'Rutas / Capas' : 'Layers'}</th>
                    <th className="py-2.5 px-4 font-semibold">{isEs ? 'Rendimiento' : 'Yield model'}</th>
                    <th className="py-2.5 pl-4 font-semibold">{isEs ? 'Modo' : 'Mode'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-ink-2">
                  <tr>
                    <td className="py-2.5 pr-4 font-medium text-ink">PUSD / USDT</td>
                    <td className="py-2.5 px-4">CashTokens ⟷ Polygon</td>
                    <td className="py-2.5 px-4 tabular-nums">0.20% / vol</td>
                    <td className="py-2.5 pl-4 text-emerald-500 font-medium">{isEs ? 'Activo (Testnet)' : 'Active (Testnet)'}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-medium text-ink">PUSD / USDC</td>
                    <td className="py-2.5 px-4">CashTokens ⟷ Polygon</td>
                    <td className="py-2.5 px-4 tabular-nums">0.20% / vol</td>
                    <td className="py-2.5 pl-4">{isEs ? 'Par canónico' : 'Canonical pair'}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-medium text-ink">BCH / USDT</td>
                    <td className="py-2.5 px-4">Bitcoin Cash L1 ⟷ Polygon</td>
                    <td className="py-2.5 px-4 tabular-nums">0.20% / vol</td>
                    <td className="py-2.5 pl-4">{isEs ? 'Par canónico' : 'Canonical pair'}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-medium text-ink">CashToken (64-hex)</td>
                    <td className="py-2.5 px-4">{isEs ? 'Cualquier Category ID ⟷ EVM' : 'Any Category ID ⟷ EVM'}</td>
                    <td className="py-2.5 px-4 tabular-nums">0.20% / vol</td>
                    <td className="py-2.5 pl-4">Standard / Bootstrapping</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="pl-3 border-l-2 border-line space-y-1">
              <div className="text-xs font-semibold text-ink">
                {isEs ? 'Activación por Bootstrapping' : 'Bootstrapping activation threshold'}
              </div>
              <p className="text-xs text-ink-2 leading-relaxed">
                {isEs
                  ? 'Los proyectos nuevos pueden iniciar en estado BOOTSTRAPPING con una meta mínima de TVL. La comunidad aporta liquidez inicial y, al alcanzar el 100% de la meta, el enrutamiento público de swaps queda habilitado.'
                  : 'New CashToken pools can start in BOOTSTRAPPING mode with a target TVL. Once community liquidity reaches 100% of the target threshold, public swap routing unlocks cleanly.'}
              </p>
            </div>
          </section>

          {/* SECTION 4: LENDING & COLLATERAL */}
          <section id="doc-lending" className="pt-8 scroll-mt-20 space-y-4">
            <h2 className="text-lg font-semibold text-ink">
              {isEs ? '4. Préstamos & bóvedas de colateral BCH' : '4. Lending & BCH collateral vaults'}
            </h2>

            <p className="text-[15px] text-ink-2 leading-[1.75]">
              {isEs
                ? 'Permite depositar Bitcoin Cash nativo como colateral en un covenant individual BinaryLiquidCollateralVault.cash para pedir prestadas stablecoins (PUSD o USDT) sin vender tu exposición a BCH. La restricción tx.outputs[0].lockingBytecode == borrowerLockingBytecode impide que terceros retiren el colateral hacia otra dirección.'
                : 'Borrowers deposit native Bitcoin Cash into a per-user BinaryLiquidCollateralVault.cash covenant to borrow stablecoins (PUSD or USDT) without selling BCH exposure. Enforcing tx.outputs[0].lockingBytecode == borrowerLockingBytecode guarantees collateral can only return to the borrower wallet.'}
            </p>

            <div className="py-4 border-y border-line grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <div className="text-ink-3">{isEs ? 'LTV máximo inicial' : 'Max initial LTV'}</div>
                <div className="text-base font-semibold text-ink tabular-nums mt-0.5">65.0%</div>
                <div className="text-[11px] text-ink-3 mt-0.5">
                  {isEs ? 'Crédito máximo respecto al valor del BCH depositado' : 'Maximum borrow ratio against deposited BCH value'}
                </div>
              </div>
              <div>
                <div className="text-ink-3">{isEs ? 'Umbral de liquidación' : 'Liquidation threshold'}</div>
                <div className="text-base font-semibold text-amber-500 tabular-nums mt-0.5">80.0%</div>
                <div className="text-[11px] text-ink-3 mt-0.5">
                  {isEs ? 'Nivel donde la bóveda entra en liquidación' : 'LTV level where positions become eligible for liquidation'}
                </div>
              </div>
              <div>
                <div className="text-ink-3">{isEs ? 'Health Factor mínimo' : 'Minimum Health Factor'}</div>
                <div className="text-base font-semibold text-emerald-500 tabular-nums mt-0.5">HF ≥ 1.15</div>
                <div className="text-[11px] text-ink-3 mt-0.5">
                  {isEs ? 'Margen operativo mínimo tras el préstamo o retiro' : 'Minimum operational health factor after borrow/withdraw'}
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 5: FEES & ORACLES */}
          <section id="doc-fees" className="pt-8 scroll-mt-20 space-y-4">
            <h2 className="text-lg font-semibold text-ink">
              {isEs ? '5. Modelo de tarifas & oráculos' : '5. Fee model & multi-source oracles'}
            </h2>

            <p className="text-[15px] text-ink-2 leading-[1.75]">
              {isEs
                ? 'Cada intercambio aplica una comisión plana y transparente del 0.30% (30 bps) sobre el volumen operado, sin recargos ocultos por retiro:'
                : 'Every swap charges a flat, transparent 0.30% (30 bps) fee on traded volume with zero hidden withdrawal surcharges:'}
            </p>

            <div className="py-3 border-y border-line grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-ink">{isEs ? 'Proveedores de Liquidez (LPs)' : 'Liquidity Providers (LPs)'}</span>
                  <span className="font-mono font-semibold text-emerald-500 tabular-nums">0.20% (66.7%)</span>
                </div>
                <p className="text-ink-3 mt-1 leading-relaxed">
                  {isEs
                    ? 'Acreditado en reservas reales para los dueños de LP Shares.'
                    : 'Accrued directly in real reserve assets for LP Share holders.'}
                </p>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-ink">{isEs ? 'Reserva del Protocolo' : 'Protocol Reserve'}</span>
                  <span className="font-mono font-semibold text-ink tabular-nums">0.10% (33.3%)</span>
                </div>
                <p className="text-ink-3 mt-1 leading-relaxed">
                  {isEs
                    ? 'Sostenibilidad de infraestructura, auditorías y monitoreo Watchman.'
                    : 'Sustains network infrastructure, security audits, and Watchman uptime.'}
                </p>
              </div>
            </div>

            <div className="bg-surface-2/50 border border-line rounded-lg p-4 font-mono text-[11.5px] text-ink-2 space-y-1">
              <div className="text-ink font-semibold">
                {isEs ? 'Ejemplo (1,000.00 PUSD → USDT):' : 'Example (1,000.00 PUSD → USDT):'}
              </div>
              <div>· {isEs ? 'Monto entregado' : 'Input'}: 1,000.00 PUSD</div>
              <div>· {isEs ? 'Comisión total (0.30%)' : 'Total fee (0.30%)'}: -3.00 USD (2.00 LP + 1.00 Protocolo)</div>
              <div className="text-ink font-semibold">· {isEs ? 'Neto recibido' : 'Net output'}: 997.00 USDT</div>
            </div>

            <div className="pl-3 border-l-2 border-line space-y-1">
              <div className="text-xs font-semibold text-ink">
                {isEs ? 'Failover de oráculos & OracleAuditor' : 'Cascading oracle failover & OracleAuditor'}
              </div>
              <p className="text-xs text-ink-2 leading-relaxed">
                {isEs
                  ? 'Para BCH y criptoactivos mayores, el backend consulta Binance, CoinGecko, Coinbase y Kraken con failover secuencial y caché Redis de 15s. LIFT consulta Cauldron DEX Router vía WebSocket en vivo, las stablecoins operan con paridad 1:1 y OracleAuditor bloquea ejecuciones con desviaciones mayores al 1.5%.'
                  : 'For BCH and major assets, pricing fails over sequentially across Binance, CoinGecko, Coinbase, and Kraken (15s Redis cache). LIFT queries Cauldron DEX Router live via WebSocket, stablecoins settle at 1:1 parity, and OracleAuditor blocks execution if price deviation exceeds 1.5%.'}
              </p>
            </div>
          </section>

          {/* SECTION 6: CONTRACTS & WALLETS */}
          <section id="doc-contracts" className="pt-8 scroll-mt-20 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-ink">
                {isEs ? '6. Contratos verificados & billeteras' : '6. Verified contracts & wallets'}
              </h2>
              <span className="text-xs font-mono text-ink-3">
                {platformNetwork === 'mainnet' ? 'Mainnet (PoS / BCH)' : 'Testnet (Chipnet / Amoy)'}
              </span>
            </div>

            {platformNetwork === 'mainnet' && (
              <p className="text-xs text-ink-3 leading-relaxed">
                {isEs
                  ? 'Las bóvedas puente en Mainnet están en preparación para despliegue auditado; abajo se listan los contratos oficiales de stablecoins en Polygon PoS:'
                  : 'Mainnet bridge vaults are scheduled following final audit sign-off; canonical Polygon PoS stablecoin contracts are listed below:'}
              </p>
            )}

            <div className="divide-y divide-line border-y border-line">
              {contractsList.map((item) => (
                <div key={item.key} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-ink">
                        {isEs ? item.labelEs : item.labelEn}
                      </span>
                      <span className="text-[11px] text-ink-3">· {item.network}</span>
                    </div>
                    <div className="font-mono text-[11px] text-ink-2 break-all mt-0.5 select-all">
                      {item.value}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 text-xs">
                    <button
                      type="button"
                      onClick={() => copyAddress(item.key, item.value)}
                      className="inline-flex items-center gap-1 text-ink-3 hover:text-ink transition-colors cursor-pointer"
                    >
                      {copiedKey === item.key ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === item.key ? (isEs ? 'Copiado' : 'Copied') : (isEs ? 'Copiar' : 'Copy')}</span>
                    </button>
                    <span className="text-line-strong">·</span>
                    <a
                      href={item.explorer}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-ink-3 hover:text-ink transition-colors"
                    >
                      <span>Explorer</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 space-y-2">
              <h3 className="text-sm font-semibold text-ink">
                {isEs ? 'Billeteras Web3 compatibles' : 'Supported Web3 wallets'}
              </h3>
              <div className="divide-y divide-line border-y border-line text-xs">
                <div className="py-2.5 flex items-center justify-between gap-3">
                  <div>
                    <span className="font-semibold text-ink">Paytaca Wallet</span>
                    <span className="text-ink-3 ml-2">· WizardConnect &amp; WalletConnect v2</span>
                  </div>
                  <span className="text-ink-3 text-[11px]">
                    {isEs ? 'CashTokens (PUSD, MUSD, LIFT)' : 'Native CashTokens & covenants'}
                  </span>
                </div>
                <div className="py-2.5 flex items-center justify-between gap-3">
                  <div>
                    <span className="font-semibold text-ink">Cashonize</span>
                    <span className="text-ink-3 ml-2">· WalletConnect v2 (wc2-bch-bcr)</span>
                  </div>
                  <span className="text-ink-3 text-[11px]">
                    {isEs ? 'Chipnet & BCH Mainnet' : 'Chipnet & BCH Mainnet'}
                  </span>
                </div>
                <div className="py-2.5 flex items-center justify-between gap-3">
                  <div>
                    <span className="font-semibold text-ink">MetaMask / Rabby</span>
                    <span className="text-ink-3 ml-2">· EIP-6963</span>
                  </div>
                  <span className="text-ink-3 text-[11px]">
                    {isEs ? 'Polygon PoS & Polygon Amoy' : 'Polygon PoS & Polygon Amoy'}
                  </span>
                </div>
              </div>
            </div>
          </section>
        </article>
      </div>

      {/* SYMMETRIC RIGHT SPACER ON WIDE SCREENS SO SHEET STAYS DEAD CENTER */}
      <div className="hidden xl:block" aria-hidden="true" />
    </div>
  );
}
