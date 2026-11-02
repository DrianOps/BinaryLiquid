import React, { useState } from 'react';
import {
  BookOpen,
  ShieldCheck,
  Layers,
  Code2,
  Droplets,
  Lock,
  Cpu,
  ArrowRight,
  Copy,
  Check,
  ExternalLink,
  Printer,
  FileText
} from 'lucide-react';

interface WhitepaperViewProps {
  lang?: 'en' | 'es';
  onChangeLang?: (lang: 'en' | 'es') => void;
  onOpenSdk: () => void;
  onOpenSwap: () => void;
  onOpenPools: () => void;
  showToast?: (msg: string, type?: 'success' | 'error') => void;
}

const DEPLOYED_ARTIFACTS = [
  {
    key: 'bch_vault',
    labelEs: 'Covenant Bóveda CashTokens (P2SH32)',
    labelEn: 'CashTokens Vault Covenant (P2SH32)',
    network: 'BCH Chipnet',
    value: 'bchtest:rvqse7cr2ptah2e34sl53r5utqwxl28fk84grvf5ufzd6n5tclme29g2zzvuj',
    explorer: 'https://chipnet.imaginary.cash/address/bchtest:pvqse7cr2ptah2e34sl53r5utqwxl28fk84grvf5ufzd6n5tclme2hmkrmd9e'
  },
  {
    key: 'pusd_cat',
    labelEs: 'Categoría Oficial CashToken PUSD',
    labelEn: 'Official PUSD CashToken Category',
    network: 'CHIP-2022-02',
    value: '6b6cf8de5963d67594a4565d49a7bcf3e668a18a7328828de16bd393ac00dcad',
    explorer: 'https://chipnet.chaingraph.cash'
  },
  {
    key: 'evm_vault',
    labelEs: 'Contrato BinaryLiquidVault.sol',
    labelEn: 'BinaryLiquidVault.sol Contract',
    network: 'Polygon Amoy (80002)',
    value: '0xc830c7cB16cd05bdEd8CA9d0c73E9038ed25Aa4A',
    explorer: 'https://amoy.polygonscan.com/address/0xc830c7cB16cd05bdEd8CA9d0c73E9038ed25Aa4A'
  },
  {
    key: 'evm_usdt',
    labelEs: 'Reserva Estable USDT (ERC-20)',
    labelEn: 'USDT Stable Reserve (ERC-20)',
    network: 'Polygon Amoy (80002)',
    value: '0x1a29793F2a64424D09f56AD045827dF1F0Fa1A75',
    explorer: 'https://amoy.polygonscan.com/address/0x1a29793F2a64424D09f56AD045827dF1F0Fa1A75'
  }
];

export default function WhitepaperView({
  lang = 'es',
  onChangeLang,
  onOpenSdk,
  onOpenSwap,
  onOpenPools,
  showToast
}: WhitepaperViewProps) {
  const [localLang, setLocalLang] = useState<'en' | 'es'>(lang);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>('abstract');

  const currentLang = onChangeLang ? lang : localLang;
  const isEs = currentLang === 'es';

  const handleSwitchLang = (next: 'en' | 'es') => {
    setLocalLang(next);
    onChangeLang?.(next);
  };

  const handleCopy = (id: string, value: string) => {
    navigator.clipboard?.writeText(value).catch(() => {});
    setCopiedId(id);
    showToast?.(isEs ? 'Copiado al portapapeles' : 'Copied to clipboard', 'success');
    setTimeout(() => setCopiedId(null), 1800);
  };

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const el = document.getElementById(`wp-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const sections = isEs
    ? [
        { id: 'abstract', label: 'Resumen ejecutivo' },
        { id: 'silo', label: '1. El aislamiento de CashTokens' },
        { id: 'architecture', label: '2. Liquidez nativa sin wrappers' },
        { id: 'covenants', label: '3. Covenants CashScript P2SH32' },
        { id: 'evm', label: '4. Liquidación atómica en EVM' },
        { id: 'pools', label: '5. Pools cross-chain sin permisos' },
        { id: 'lending', label: '6. Colateral BCH & oráculos' },
        { id: 'security', label: '7. Modelo de seguridad & reembolsos' },
        { id: 'integration', label: '8. SDK, APIs & estándar DEX' },
        { id: 'deployments', label: 'Anexo: Contratos verificados' }
      ]
    : [
        { id: 'abstract', label: 'Executive abstract' },
        { id: 'silo', label: '1. The CashTokens liquidity silo' },
        { id: 'architecture', label: '2. Zero-wrapper native liquidity' },
        { id: 'covenants', label: '3. CashScript P2SH32 covenants' },
        { id: 'evm', label: '4. EVM cryptographic settlement' },
        { id: 'pools', label: '5. Permissionless cross-chain pools' },
        { id: 'lending', label: '6. BCH collateral & oracles' },
        { id: 'security', label: '7. Threat model & liveness' },
        { id: 'integration', label: '8. SDK, APIs & DEX standards' },
        { id: 'deployments', label: 'Appendix: Verified contracts' }
      ];

  return (
    <div className="w-full space-y-6 print:space-y-4">
      {/* PAPER HEADER CARD */}
      <div className="ui-card p-5 sm:p-7 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="ui-badge-warn">Whitepaper v1.0</span>
            <span className="ui-badge">CHIP-2022-02 · P2SH32 · EIP-191</span>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            {/* Inline EN / ES Paper Switch */}
            <div className="ui-segment">
              <button
                type="button"
                onClick={() => handleSwitchLang('es')}
                className={`ui-segment-item ${isEs ? 'ui-segment-item-active' : ''}`}
              >
                ES
              </button>
              <button
                type="button"
                onClick={() => handleSwitchLang('en')}
                className={`ui-segment-item ${!isEs ? 'ui-segment-item-active' : ''}`}
              >
                EN
              </button>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="ui-btn-secondary ui-btn-sm"
              title={isEs ? 'Imprimir o guardar como PDF' : 'Print or save as PDF'}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>
          </div>
        </div>

        <div className="space-y-2 max-w-4xl">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-ink leading-snug">
            {isEs
              ? 'BinaryLiquid: Infraestructura de Liquidez y Préstamos Cross-Chain Sin Custodia para Bitcoin Cash CashTokens y Redes EVM'
              : 'BinaryLiquid: Non-Custodial Cross-Chain Liquidity & Lending Infrastructure Connecting Bitcoin Cash CashTokens and EVM Networks'}
          </h1>
          <p className="text-sm text-ink-2 leading-relaxed">
            {isEs
              ? 'Especificación formal de arquitectura basada en Covenants de Introspección UTXO (CashScript P2SH32), Bóvedas Deterministas en Solidity y Emparejamiento de Liquidez Nativa sin Tokens Envueltos.'
              : 'Formal architectural specification leveraging Native UTXO Introspection Covenants (CashScript P2SH32), Deterministic Solidity Vaults, and Zero-Wrapper Cross-Chain Liquidity Pairing.'}
          </p>
        </div>

        <div className="pt-3 border-t border-line flex flex-wrap items-center justify-between gap-3 text-xs text-ink-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>
              <strong className="text-ink-2 font-semibold">{isEs ? 'Autoría:' : 'Authorship:'}</strong> BinaryLiquid Protocol Engineering
            </span>
            <span>
              <strong className="text-ink-2 font-semibold">{isEs ? 'Ecosistema:' : 'Ecosystem:'}</strong> Bitcoin Cash (CashTokens) ⟷ Polygon EVM
            </span>
            <span>
              <strong className="text-ink-2 font-semibold">Track:</strong> BCH BLAZE · ParyonUSD (PUSD)
            </span>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button type="button" onClick={onOpenSdk} className="ui-btn-secondary ui-btn-sm">
              <Code2 className="w-3.5 h-3.5" />
              <span>SDK & API</span>
            </button>
            <button type="button" onClick={onOpenSwap} className="ui-btn-primary ui-btn-sm">
              <span>{isEs ? 'Ejecutar Swap' : 'Launch Swap'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* MAIN GRID: STICKY INDEX + FULL TECHNICAL SPECIFICATION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT STICKY TABLE OF CONTENTS */}
        <aside className="lg:col-span-3 lg:sticky lg:top-20 print:hidden">
          <div className="ui-card p-3 space-y-1">
            <div className="px-2.5 py-1.5 text-xs font-semibold text-ink flex items-center gap-1.5 border-b border-line mb-1">
              <FileText className="w-3.5 h-3.5 text-primary" />
              <span>{isEs ? 'Índice técnico' : 'Table of contents'}</span>
            </div>
            <div className="flex lg:flex-col overflow-x-auto lg:overflow-x-visible gap-0.5">
              {sections.map((sec) => {
                const active = activeSection === sec.id;
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => scrollToSection(sec.id)}
                    className={`text-left px-2.5 py-1.5 rounded-lg text-xs whitespace-nowrap lg:whitespace-normal transition-colors cursor-pointer ${
                      active
                        ? 'bg-surface-2 text-ink font-semibold'
                        : 'text-ink-3 hover:text-ink hover:bg-surface-2/60 font-medium'
                    }`}
                  >
                    {sec.label}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* RIGHT PAPER BODY */}
        <article className="lg:col-span-9 space-y-6">
          {/* ABSTRACT */}
          <section id="wp-abstract" className="ui-card p-5 sm:p-6 space-y-3 scroll-mt-20">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              <h2 className="ui-section-title">
                {isEs ? 'Resumen ejecutivo (Abstract)' : 'Executive abstract'}
              </h2>
            </div>
            <p className="text-sm text-ink-2 leading-relaxed">
              {isEs
                ? 'La activación de CashTokens (CHIP-2022-02) dotó a Bitcoin Cash de activos nativos validados directamente por los mineros sobre el modelo UTXO, logrando costos de transacción inferiores a $0.001 USD y ejecución determinista sin cuellos de botella de gas. Sin embargo, los tokens emitidos en Bitcoin Cash permanecían económicamente aislados: carecían de un puente sin custodia para emparejar liquidez directa con los más de $150,000 millones en stablecoins que circulan en redes EVM (USDT, USDC). BinaryLiquid resuelve esta fragmentación mediante una arquitectura de reservas nativas coordinadas por Covenants CashScript P2SH32 en Bitcoin Cash y bóvedas inmutables en Solidity sobre EVM, eliminando por completo las billeteras calientes (hot wallets), las multifirmas custodias y los tokens envueltos sintéticos (wrapped IOUs).'
                : 'The activation of CashTokens (CHIP-2022-02) brought miner-validated native assets to Bitcoin Cash’s UTXO model with sub-$0.001 transaction fees and deterministic execution. Despite these technical advantages, CashToken assets remained economically isolated—lacking trustless infrastructure to pair directly against the $150B+ stablecoin liquidity residing on EVM networks (USDT, USDC). BinaryLiquid eliminates this liquidity silo through a native dual-reserve protocol governed by P2SH32 CashScript Covenants on Bitcoin Cash and immutable Solidity vaults on EVM, completely removing custodial hot wallets, federated multisigs, and synthetic wrapped tokens.'}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="ui-panel p-3">
                <div className="ui-label">{isEs ? 'Custodia privada' : 'EOA custody'}</div>
                <div className="text-lg font-semibold text-ink tabular-nums mt-0.5">0%</div>
                <div className="text-[11px] text-ink-3">{isEs ? 'Cero llaves EOA en bóveda' : 'Zero EOA vault keys'}</div>
              </div>
              <div className="ui-panel p-3">
                <div className="ui-label">{isEs ? 'Liquidación media' : 'Mean settlement'}</div>
                <div className="text-lg font-semibold text-ink tabular-nums mt-0.5">~3.2s</div>
                <div className="text-[11px] text-ink-3">{isEs ? 'Detección UTXO + EVM' : 'UTXO + EVM finality'}</div>
              </div>
              <div className="ui-panel p-3">
                <div className="ui-label">{isEs ? 'Tarifa plana / LP' : 'Flat fee / LP cut'}</div>
                <div className="text-lg font-semibold text-ink tabular-nums mt-0.5">0.30% / 0.20%</div>
                <div className="text-[11px] text-ink-3">{isEs ? 'Rendimiento real nativo' : 'Native real yield'}</div>
              </div>
              <div className="ui-panel p-3">
                <div className="ui-label">{isEs ? 'Garantía Timelock' : 'Timelock safety'}</div>
                <div className="text-lg font-semibold text-ink tabular-nums mt-0.5">24h</div>
                <div className="text-[11px] text-ink-3">{isEs ? 'Reembolso autónomo' : 'Permissionless refund'}</div>
              </div>
            </div>
          </section>

          {/* SECTION 1: THE CASHTOKENS SILO PROBLEM */}
          <section id="wp-silo" className="ui-card p-5 sm:p-6 space-y-4 scroll-mt-20">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              <h2 className="ui-section-title">
                {isEs
                  ? '1. El problema histórico: Aislamiento de liquidez en ecosistemas UTXO'
                  : '1. Problem statement: Liquidity siloing across UTXO and EVM'}
              </h2>
            </div>

            <p className="text-sm text-ink-2 leading-relaxed">
              {isEs
                ? 'Antes de BinaryLiquid, cualquier proyecto que emitía un CashToken en Bitcoin Cash —como stablecoins descentralizadas (ParyonUSD / PUSD), tokens de utilidad o activos de gobernanza— enfrentaba tres barreras estructurales que frenaban su adopción externa:'
                : 'Prior to BinaryLiquid, any protocol issuing a CashToken on Bitcoin Cash—whether decentralized stablecoins (ParyonUSD / PUSD), utility tokens, or governance assets—faced three structural barriers limiting external capital inflows:'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="ui-panel p-4 space-y-1.5">
                <div className="text-xs font-semibold text-ink">
                  {isEs ? '1.1 Liquidez encerrada en un solo par' : '1.1 Single-chain liquidity trap'}
                </div>
                <p className="text-xs text-ink-2 leading-relaxed">
                  {isEs
                    ? 'Los DEX locales en BCH solo permiten emparejar CashTokens contra BCH u otros CashTokens locales, impidiendo acceso directo al capital estable de Polygon, Ethereum o Arbitrum.'
                    : 'Local BCH DEXes can only pair CashTokens against BCH or other local CashTokens, cutting issuers off from deep stablecoin capital on Polygon, Ethereum, or Arbitrum.'}
                </p>
              </div>

              <div className="ui-panel p-4 space-y-1.5">
                <div className="text-xs font-semibold text-ink">
                  {isEs ? '1.2 Fragilidad de puentes custodios' : '1.2 Custodial & multisig risk'}
                </div>
                <p className="text-xs text-ink-2 leading-relaxed">
                  {isEs
                    ? 'Los puentes tradicionales dependen de hot wallets o multifirmas opacas donde la filtración de llaves privadas compromete el 100% del TVL depositado.'
                    : 'Legacy cross-chain bridges rely on server hot wallets or opaque multisigs where key compromise drains 100% of locked TVL.'}
                </p>
              </div>

              <div className="ui-panel p-4 space-y-1.5">
                <div className="text-xs font-semibold text-ink">
                  {isEs ? '1.3 Riesgo sistémico de tokens envueltos' : '1.3 Wrapped token depeg risk'}
                </div>
                <p className="text-xs text-ink-2 leading-relaxed">
                  {isEs
                    ? 'Acuñar tokens sintéticos ("wUSDT" o "wBCH") fragmenta la liquidez y traslada al usuario final el riesgo permanente de insolvencia del emisor.'
                    : 'Minting synthetic IOU wrappers ("wUSDT" or "wBCH") fragments liquidity and exposes end users to permanent backing insolvency risk.'}
                </p>
              </div>
            </div>
          </section>

          {/* SECTION 2: ZERO-WRAPPER NATIVE ARCHITECTURE */}
          <section id="wp-architecture" className="ui-card p-5 sm:p-6 space-y-4 scroll-mt-20">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-primary" />
              <h2 className="ui-section-title">
                {isEs
                  ? '2. Solución BinaryLiquid: Intercambio nativo sin tokens envueltos'
                  : '2. BinaryLiquid architecture: Native-to-native inventory settlement'}
              </h2>
            </div>

            <p className="text-sm text-ink-2 leading-relaxed">
              {isEs
                ? 'BinaryLiquid sustituye el modelo "Lock-and-Mint" por bóvedas de inventario nativo en ambas cadenas. El usuario entrega un CashToken real en Bitcoin Cash (ej. PUSD) a un contrato P2SH32 determinista y recibe USDT o USDC nativo en Polygon directamente desde el contrato inteligente BinaryLiquidVault.sol, sin intermediarios custodios.'
                : 'BinaryLiquid replaces fragile Lock-and-Mint wrappers with native liquidity vaults on both chains. A user deposits native CashTokens (e.g. PUSD) into a deterministic P2SH32 covenant on Bitcoin Cash and receives native ERC-20 USDT or USDC directly from BinaryLiquidVault.sol on Polygon.'}
            </p>

            <div className="ui-panel p-4 font-mono text-[11px] text-ink-2 overflow-x-auto leading-relaxed">
              <pre className="whitespace-pre">{isEs
                ? `[Billetera BCH (Paytaca / Cashonize)]
       │  1. Envía PUSD (CashToken nativo) al Covenant P2SH32 único por orden
       ▼
[BinaryLiquidEscrow.cash (BCH P2SH32)] ──(Si expira 24h sin liquidar)──► [Reembolso 100% al Usuario]
       │  2. Introspección UTXO fuerza salida exclusiva hacia BinaryLiquidVault.cash
       ▼
[The Watchman Sentinel] ──► Verifica prueba UTXO + Audita Oráculo + Firma EIP-191
       │
       ▼
[BinaryLiquidVault.sol (Polygon EVM)]
       │  3. Verifica ecrecover + Anti-Replay (executedPayouts[bchTxHash]) + Circuit Breaker
       ▼
[Billetera EVM Destino] ◄── Recibe USDT / USDC nativo en ~3 segundos`
                : `[BCH Wallet (Paytaca / Cashonize)]
       │  1. Sends native PUSD CashToken to per-order P2SH32 Covenant
       ▼
[BinaryLiquidEscrow.cash (BCH P2SH32)] ──(If 24h expires unsettled)──► [100% Permissionless Refund]
       │  2. UTXO Introspection forces output strictly into BinaryLiquidVault.cash
       ▼
[The Watchman Sentinel] ──► Verifies UTXO finality + Oracle Sanity + Signs EIP-191
       │
       ▼
[BinaryLiquidVault.sol (Polygon EVM)]
       │  3. Verifies ecrecover + Anti-Replay (executedPayouts[bchTxHash]) + Circuit Breaker
       ▼
[Destination EVM Wallet] ◄── Receives native USDT / USDC in ~3 seconds`}</pre>
            </div>
          </section>

          {/* SECTION 3: CASHSCRIPT COVENANTS */}
          <section id="wp-covenants" className="ui-card p-5 sm:p-6 space-y-4 scroll-mt-20">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <h2 className="ui-section-title">
                {isEs
                  ? '3. Especificación formal de Covenants en Bitcoin Cash (CashScript P2SH32)'
                  : '3. Formal Bitcoin Cash Covenant specification (CashScript P2SH32)'}
              </h2>
            </div>

            <p className="text-sm text-ink-2 leading-relaxed">
              {isEs
                ? 'Todos los contratos en Bitcoin Cash se compilan bajo Pay-to-Script-Hash de 32 bytes (P2SH32, OP_HASH256), ofreciendo 256 bits de resistencia a colisiones frente a ataques de preimagen. Utilizando introspección nativa UTXO (CHIP-2021-02), la máquina virtual de BCH evalúa matemáticamente hacia qué bytecode exacto pueden fluir los tokens:'
                : 'All Bitcoin Cash contracts compile to 32-byte Pay-to-Script-Hash (P2SH32 via OP_HASH256), providing 256-bit collision resistance. Using Native UTXO Introspection (CHIP-2021-02), the BCH VM mathematically constrains exact output locking bytecodes and token amounts:'}
            </p>

            <div className="space-y-3">
              {/* 3.1 Escrow */}
              <div className="ui-panel p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-ink">3.1 BinaryLiquidEscrow.cash — {isEs ? 'Covenant determinista por orden' : 'Per-order intent covenant'}</span>
                  <span className="ui-badge">P2SH32 Intent</span>
                </div>
                <p className="text-xs text-ink-2 leading-relaxed">
                  {isEs
                    ? 'Cada swap instancia una dirección de contrato única parametrizada con un orderSalt de 16 bytes, el refundLockingBytecode del usuario y expiryTimestamp (+24h). La ruta settleToVault fuerza por consenso que el 100% de los tokens ingresen únicamente a la bóveda principal BinaryLiquidVault; la ruta refund permite al usuario recuperar su capital sin firmas externas tras expirar el timelock.'
                    : 'Every swap instantiates a unique P2SH32 contract parameterized with a 16-byte orderSalt, the user’s refundLockingBytecode, and expiryTimestamp (+24h). The settleToVault path mathematically forces 100% of tokens into BinaryLiquidVault; the refund path lets the user reclaim full principal permissionlessly once tx.time >= expiryTimestamp.'}
                </p>
                <pre className="bg-surface p-3 rounded-control border border-line font-mono text-[11px] text-ink overflow-x-auto">{`function settleToVault(sig watchmanSig) {
    require(checkSig(watchmanSig, watchmanPk));
    require(tx.outputs[0].lockingBytecode == vaultPoolLockingBytecode);
    require(tx.outputs[0].tokenCategory == tx.inputs[this.activeInputIndex].tokenCategory);
    require(tx.outputs[0].tokenAmount >= tx.inputs[this.activeInputIndex].tokenAmount);
}
function refund() {
    require(tx.time >= expiryTimestamp); // Autonomous 24h Timelock
    require(tx.outputs[0].lockingBytecode == refundLockingBytecode);
}`}</pre>
              </div>

              {/* 3.2 Vault */}
              <div className="ui-panel p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-ink">3.2 BinaryLiquidVault.cash — {isEs ? 'Continuación de estado de bóveda' : 'Covenant state continuation'}</span>
                  <span className="ui-badge">State Continuation</span>
                </div>
                <p className="text-xs text-ink-2 leading-relaxed">
                  {isEs
                    ? 'Al despachar liquidez hacia BCH, el contrato lee su propio saldo UTXO (poolBalance), verifica el disyuntor on-chain (payoutAmount <= maxSinglePayout) y obliga matemáticamente a que el remanente exacto (poolBalance - payoutAmount) regrese al mismo lockingBytecode del Covenant en tx.outputs[1]. No existe llave privada capaz de vaciar el pool.'
                    : 'When releasing CashTokens on BCH, the covenant inspects its own UTXO balance (poolBalance), enforces the on-chain circuit breaker (payoutAmount <= maxSinglePayout), and mathematically forces the exact remainder (poolBalance - payoutAmount) back into the identical covenant lockingBytecode at tx.outputs[1].'}
                </p>
                <pre className="bg-surface p-3 rounded-control border border-line font-mono text-[11px] text-ink overflow-x-auto">{`int remainingBalance = poolBalance - payoutAmount;
if (remainingBalance > 0) {
    bytes vaultBytecode = tx.inputs[this.activeInputIndex].lockingBytecode;
    require(tx.outputs[1].lockingBytecode == vaultBytecode);
    require(tx.outputs[1].tokenCategory == poolCategory);
    require(tx.outputs[1].tokenAmount >= remainingBalance);
}`}</pre>
              </div>
            </div>
          </section>

          {/* SECTION 4: EVM VAULT */}
          <section id="wp-evm" className="ui-card p-5 sm:p-6 space-y-4 scroll-mt-20">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-primary" />
              <h2 className="ui-section-title">
                {isEs
                  ? '4. Bóveda inteligente en EVM (BinaryLiquidVault.sol)'
                  : '4. EVM smart contract settlement (BinaryLiquidVault.sol)'}
              </h2>
            </div>

            <p className="text-sm text-ink-2 leading-relaxed">
              {isEs
                ? 'En Polygon (PoS Mainnet y Amoy Testnet), las reservas estables (USDT, USDC) residen exclusivamente dentro de BinaryLiquidVault.sol (Solidity 0.8.20). El contrato carece deliberadamente de cualquier función administrativa de retiro de liquidez (sin ownerWithdraw), garantizando cero riesgo de rug-pull o custodia.'
                : 'On Polygon (PoS Mainnet and Amoy Testnet), ERC-20 reserves (USDT, USDC) live strictly inside BinaryLiquidVault.sol (Solidity 0.8.20). The contract deliberately omits any administrative liquidity withdrawal function, eliminating admin rug-pull vectors.'}
            </p>

            <div className="ui-panel p-4 space-y-2">
              <div className="text-xs font-semibold text-ink">
                {isEs ? 'Invariantes de liquidación EIP-191 & Anti-Replay:' : 'EIP-191 attestation & anti-replay invariants:'}
              </div>
              <pre className="bg-surface p-3 rounded-control border border-line font-mono text-[11px] text-ink overflow-x-auto">{`bytes32 digest = keccak256(abi.encodePacked(
    bchTxHash, recipient, token, amount, nonce, block.chainid, address(this)
));
require(!executedPayouts[bchTxHash], "Anti-Replay");
require(amount <= MAX_SINGLE_PAYOUT, "Circuit Breaker");
require(ecrecover(ethSignedHash, v, r, s) == watchmanSigner, "Invalid Attestation");`}</pre>
              <p className="text-xs text-ink-3">
                {isEs
                  ? 'Al ligar la firma a block.chainid y address(this), ninguna atestación válida en Testnet o en otra red puede reutilizarse en Mainnet.'
                  : 'Binding signatures to block.chainid and address(this) mathematically prevents cross-chain and cross-deployment replay attacks.'}
              </p>
            </div>
          </section>

          {/* SECTION 5: PERMISSIONLESS CROSS-CHAIN POOLS FOR CASHTOKENS */}
          <section id="wp-pools" className="ui-card p-5 sm:p-6 space-y-4 scroll-mt-20">
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-primary" />
              <h2 className="ui-section-title">
                {isEs
                  ? '5. Pools de liquidez cross-chain para cualquier proyecto CashToken'
                  : '5. Permissionless cross-chain liquidity pools for CashToken issuers'}
              </h2>
            </div>

            <p className="text-sm text-ink-2 leading-relaxed">
              {isEs
                ? 'Uno de los pilares fundamentales de BinaryLiquid es democratizar la liquidez multicadena para todo el ecosistema Bitcoin Cash. Cualquier emisor o comunidad de un CashToken puede registrar su Category ID hexadecimal de 64 caracteres y abrir un pool de liquidez emparejado directamente con un activo de otra cadena (como USDT o USDC en Polygon):'
                : 'A foundational pillar of BinaryLiquid is opening multi-chain liquidity to the entire Bitcoin Cash ecosystem. Any CashToken project or community can register its 64-character hex Category ID and launch a liquidity pool paired directly against an asset on another chain (such as USDT or USDC on Polygon):'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="ui-panel p-4 space-y-1.5">
                <div className="text-xs font-semibold text-ink">
                  {isEs ? 'Modo Bootstrapping y Liquidez Dual' : 'Bootstrapping & Dual-Reserve Modes'}
                </div>
                <p className="text-xs text-ink-2 leading-relaxed">
                  {isEs
                    ? 'Los proyectos nuevos pueden iniciar en Modo Bootstrapping fijando una meta mínima de TVL (ej. $2,500 USD) donde la comunidad aporta CashTokens y stablecoins EVM antes de habilitar el enrutamiento público, o abrir directamente en Modo Estándar.'
                    : 'New CashToken projects can launch in Bootstrapping Mode—accumulating community CashTokens and EVM stablecoins toward a target TVL threshold before public swap routing activates—or deploy directly in Standard Dual-Reserve Mode.'}
                </p>
              </div>

              <div className="ui-panel p-4 space-y-1.5">
                <div className="text-xs font-semibold text-ink">
                  {isEs ? 'Economía Real Yield (0.20% para LPs)' : 'Sustainable Real Yield (0.20% to LPs)'}
                </div>
                <p className="text-xs text-ink-2 leading-relaxed">
                  {isEs
                    ? 'Cada intercambio aplica una comisión plana del 0.30% (30 bps): el 0.20% (66.7% del ingreso) se acumula directamente en las reservas a favor de los Proveedores de Liquidez según sus LP Shares, y el 0.10% financia la operación del protocolo.'
                    : 'Every cross-chain swap charges a transparent 0.30% (30 bps) flat fee: 0.20% (two-thirds of revenue) accrues directly in native reserve assets to Liquidity Providers pro-rata by LP Shares, while 0.10% sustains protocol infrastructure.'}
                </p>
              </div>
            </div>

            <div className="print:hidden">
              <button type="button" onClick={onOpenPools} className="ui-btn-secondary ui-btn-sm">
                <Droplets className="w-3.5 h-3.5" />
                <span>{isEs ? 'Explorar Pools Cross-Chain' : 'Explore Cross-Chain Pools'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </section>

          {/* SECTION 6: LENDING & MULTI-ORACLE */}
          <section id="wp-lending" className="ui-card p-5 sm:p-6 space-y-4 scroll-mt-20">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary" />
              <h2 className="ui-section-title">
                {isEs
                  ? '6. Préstamos con colateral BCH nativo y consenso de oráculos'
                  : '6. Native BCH collateralized lending & multi-source oracle consensus'}
              </h2>
            </div>

            <p className="text-sm text-ink-2 leading-relaxed">
              {isEs
                ? 'Los tenedores de Bitcoin Cash pueden obtener liquidez estable (PUSD en BCH o USDT en Polygon) sin vender su posición en BCH. El colateral se deposita en BinaryLiquidCollateralVault.cash, un Covenant P2SH32 individual donde la regla tx.outputs[0].lockingBytecode == borrowerLockingBytecode garantiza a nivel de protocolo que el BCH depositado jamás puede retirarse hacia una dirección distinta a la del propio prestatario.'
                : 'Bitcoin Cash holders can unlock stablecoin liquidity (PUSD on BCH or USDT on Polygon) without selling their BCH exposure. Collateral is locked in a dedicated per-borrower BinaryLiquidCollateralVault.cash P2SH32 covenant where tx.outputs[0].lockingBytecode == borrowerLockingBytecode mathematically guarantees collateral can never be withdrawn to any address other than the borrower’s own wallet.'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="ui-panel p-3">
                <span className="ui-label block">{isEs ? 'LTV Máximo Inicial' : 'Max Initial LTV'}</span>
                <span className="text-base font-semibold text-ink tabular-nums">70.0%</span>
              </div>
              <div className="ui-panel p-3">
                <span className="ui-label block">{isEs ? 'Umbral de Liquidación' : 'Liquidation Threshold'}</span>
                <span className="text-base font-semibold text-ink tabular-nums">80.0%</span>
              </div>
              <div className="ui-panel p-3">
                <span className="ui-label block">{isEs ? 'Factor de Salud Mínimo' : 'Min Health Factor'}</span>
                <span className="text-base font-semibold text-ink tabular-nums">HF ≥ 1.15</span>
              </div>
            </div>

            <p className="text-xs text-ink-3 leading-relaxed">
              {isEs
                ? 'Oráculos híbridos: Los precios de BCH y CashTokens se validan cruzando reservas on-chain de Cauldron DEX en Bitcoin Cash con feeds medianizados de mercado (Binance / CoinGecko), auditados continuamente por el módulo oracleAuditor del Watchman.'
                : 'Hybrid Oracles: BCH and CashToken valuations cross-verify on-chain Cauldron DEX UTXO reserves against medianized market feeds (Binance / CoinGecko), continuously checked by the Watchman oracleAuditor module.'}
            </p>
          </section>

          {/* SECTION 7: SECURITY & THREAT MODEL */}
          <section id="wp-security" className="ui-card p-5 sm:p-6 space-y-4 scroll-mt-20">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <h2 className="ui-section-title">
                {isEs
                  ? '7. Modelo de seguridad y garantías ante fallos (Liveness & Safety)'
                  : '7. Security model, fault tolerance & autonomous liveness guarantees'}
              </h2>
            </div>

            <div className="overflow-x-auto border border-line rounded-panel">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-2 text-ink-2 border-b border-line">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">{isEs ? 'Escenario / Vector' : 'Scenario / Vector'}</th>
                    <th className="py-2.5 px-3 font-semibold">{isEs ? 'Defensa On-Chain' : 'On-Chain Defense'}</th>
                    <th className="py-2.5 px-3 font-semibold">{isEs ? 'Resultado para el usuario' : 'User Outcome'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-ink-2">
                  <tr>
                    <td className="py-2.5 px-3 font-medium text-ink">
                      {isEs ? 'Caída o censura del Relayer' : 'Relayer downtime or censorship'}
                    </td>
                    <td className="py-2.5 px-3">
                      <code>tx.time &gt;= expiry</code> (BCH) &amp; <code>REFUND_TIMELOCK</code> (EVM)
                    </td>
                    <td className="py-2.5 px-3">
                      {isEs ? 'Reembolso autónomo del 100% tras 24h sin permisos.' : '100% unilateral principal recovery after 24h.'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-medium text-ink">
                      {isEs ? 'Intento de desvío de depósito' : 'Escrow diversion attempt'}
                    </td>
                    <td className="py-2.5 px-3">
                      <code>outputs[0].lockingBytecode == vaultBytecode</code>
                    </td>
                    <td className="py-2.5 px-3">
                      {isEs ? 'Rechazado por consenso de nodos BCH.' : 'Rejected by BCH consensus rules.'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-medium text-ink">
                      {isEs ? 'Compromiso de firma atestadora' : 'Attester key compromise'}
                    </td>
                    <td className="py-2.5 px-3">
                      <code>maxSinglePayout</code> + <code>State Continuation</code> + <code>Pause</code>
                    </td>
                    <td className="py-2.5 px-3">
                      {isEs ? 'Colateral BCH intocable; pool protegido por techo VM.' : 'BCH collateral untouchable; pool bounded by VM cap.'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-medium text-ink">
                      {isEs ? 'Ataque de Replay entre redes' : 'Cross-chain signature replay'}
                    </td>
                    <td className="py-2.5 px-3">
                      <code>executedPayouts[bchTxHash]</code> + <code>chainid</code>
                    </td>
                    <td className="py-2.5 px-3">
                      {isEs ? 'Ejecución única estricta por hash UTXO.' : 'Strict single execution per UTXO TxID.'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* SECTION 8: DEVELOPER INTEGRATION & SDK */}
          <section id="wp-integration" className="ui-card p-5 sm:p-6 space-y-4 scroll-mt-20">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-primary" />
              <h2 className="ui-section-title">
                {isEs
                  ? '8. Facilidad de integración: SDK, Widget iFrame y estándares CoinGecko / CMC'
                  : '8. Frictionless integration: SDK, iFrame Widget & CoinGecko / CMC standards'}
              </h2>
            </div>

            <p className="text-sm text-ink-2 leading-relaxed">
              {isEs
                ? 'BinaryLiquid fue diseñado como infraestructura componible para que billeteras (Paytaca vía WizardConnect, Cashonize vía WalletConnect v2 wc2-bch-bcr, carteras EVM EIP-6963), DEXes y portales CashToken integren liquidez cross-chain en minutos:'
                : 'BinaryLiquid is engineered as composable infrastructure so wallets (Paytaca via WizardConnect, Cashonize via WalletConnect v2 wc2-bch-bcr, EIP-6963 EVM wallets), DEXes, and CashToken portals can embed cross-chain liquidity in minutes:'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="ui-panel p-4 space-y-1.5">
                <div className="text-xs font-semibold text-ink">1. Widget iFrame (/embed)</div>
                <p className="text-xs text-ink-2 leading-relaxed">
                  {isEs
                    ? 'Una sola etiqueta HTML incrusta la tarjeta no-custodia con par inicial y tema configurables en cualquier web de un CashToken.'
                    : 'A single HTML iframe tag embeds the non-custodial swap card with preselected token pair and theme into any CashToken site.'}
                </p>
              </div>
              <div className="ui-panel p-4 space-y-1.5">
                <div className="text-xs font-semibold text-ink">2. API REST de Covenants</div>
                <p className="text-xs text-ink-2 leading-relaxed">
                  {isEs
                    ? 'Endpoints /api/quote, /api/swap/create y /api/swap/status/:id permiten a billeteras y bots instanciar contratos P2SH32 al vuelo.'
                    : 'Endpoints /api/quote, /api/swap/create, and /api/swap/status/:id let native wallets and bots instantiate P2SH32 escrows programmatically.'}
                </p>
              </div>
              <div className="ui-panel p-4 space-y-1.5">
                <div className="text-xs font-semibold text-ink">3. Indexación Global DEX</div>
                <p className="text-xs text-ink-2 leading-relaxed">
                  {isEs
                    ? 'Rutas nativas /api/coingecko/tickers y /api/cmc/summary exponen volumen, liquidez y precio en formato oficial de agregadores.'
                    : 'Built-in /api/coingecko/tickers and /api/cmc/summary routes expose real-time pair pricing and TVL to global market trackers.'}
                </p>
              </div>
            </div>

            <div className="print:hidden">
              <button type="button" onClick={onOpenSdk} className="ui-btn-secondary ui-btn-sm">
                <Code2 className="w-3.5 h-3.5" />
                <span>{isEs ? 'Ir al Portal SDK & Generador de Widget' : 'Open SDK Portal & Widget Generator'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </section>

          {/* APPENDIX: VERIFIED ON-CHAIN DEPLOYMENTS */}
          <section id="wp-deployments" className="ui-card p-5 sm:p-6 space-y-4 scroll-mt-20">
            <div className="flex items-center justify-between gap-2">
              <h2 className="ui-section-title">
                {isEs ? 'Anexo: Artefactos y contratos verificados on-chain' : 'Appendix: Verifiable on-chain contracts & artifacts'}
              </h2>
              <span className="ui-badge-success">{isEs ? 'Activo en Testnet' : 'Live on Testnet'}</span>
            </div>

            <div className="divide-y divide-line border border-line rounded-panel overflow-hidden">
              {DEPLOYED_ARTIFACTS.map((item) => (
                <div key={item.key} className="p-3.5 bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-ink">
                        {isEs ? item.labelEs : item.labelEn}
                      </span>
                      <span className="text-[11px] text-ink-3">· {item.network}</span>
                    </div>
                    <div className="font-mono text-xs text-ink-2 truncate mt-0.5 select-all">
                      {item.value}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 print:hidden">
                    <button
                      type="button"
                      onClick={() => handleCopy(item.key, item.value)}
                      className="ui-btn-secondary ui-btn-sm"
                    >
                      {copiedId === item.key ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedId === item.key ? (isEs ? 'Copiado' : 'Copied') : (isEs ? 'Copiar' : 'Copy')}</span>
                    </button>
                    <a
                      href={item.explorer}
                      target="_blank"
                      rel="noreferrer"
                      className="ui-btn-secondary ui-btn-sm"
                    >
                      <span>Explorer</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </article>
      </div>
    </div>
  );
}
