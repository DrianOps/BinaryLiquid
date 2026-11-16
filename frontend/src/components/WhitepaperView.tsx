import { useState } from 'react';
import { Copy, Check, ExternalLink, Printer, ArrowLeft } from 'lucide-react';

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
        { id: 'silo', label: '1. Aislamiento UTXO' },
        { id: 'architecture', label: '2. Liquidez sin wrappers' },
        { id: 'covenants', label: '3. Covenants P2SH32' },
        { id: 'evm', label: '4. Liquidación EVM' },
        { id: 'pools', label: '5. Pools cross-chain' },
        { id: 'lending', label: '6. Colateral & oráculos' },
        { id: 'security', label: '7. Modelo de seguridad' },
        { id: 'integration', label: '8. SDK & estándar DEX' },
        { id: 'deployments', label: 'Anexo A. Contratos' }
      ]
    : [
        { id: 'abstract', label: 'Abstract' },
        { id: 'silo', label: '1. UTXO Liquidity Silo' },
        { id: 'architecture', label: '2. Zero-Wrapper Native' },
        { id: 'covenants', label: '3. P2SH32 Covenants' },
        { id: 'evm', label: '4. EVM Settlement' },
        { id: 'pools', label: '5. Cross-Chain Pools' },
        { id: 'lending', label: '6. Collateral & Oracles' },
        { id: 'security', label: '7. Security Model' },
        { id: 'integration', label: '8. SDK & DEX Standards' },
        { id: 'deployments', label: 'Appendix A. Contracts' }
      ];

  return (
    <div className="w-full xl:grid xl:grid-cols-[190px_minmax(0,820px)_190px] xl:justify-center xl:gap-8 items-start">
      {/* BORDERLESS MARGIN OUTLINE (Wide desktop only — zero card box) */}
      <aside className="hidden xl:block sticky top-24 print:hidden pt-10">
        <nav aria-label="Whitepaper sections" className="space-y-1 border-l border-line pl-3">
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
      <div className="w-full max-w-[820px] mx-auto space-y-3 print:max-w-none print:space-y-0">
        {/* SUBTLE DOCUMENT CONTROLS ABOVE THE PAPER */}
        <div className="flex items-center justify-between gap-2 px-1 print:hidden">
          <button
            type="button"
            onClick={onOpenSwap}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-3 hover:text-ink transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{isEs ? 'Volver al Swap' : 'Back to Swap'}</span>
          </button>

          <div className="flex items-center gap-2">
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

        {/* SINGLE CONTINUOUS WHITEPAPER SHEET */}
        <article className="bg-surface border border-line rounded-xl shadow-soft px-6 py-8 sm:px-14 sm:py-12 print:border-none print:shadow-none print:p-0 print:bg-white print:text-black">
          {/* FORMAL PAPER HEADER */}
          <header className="text-center pb-8 border-b border-line space-y-4">
            <div className="text-[11px] font-mono text-ink-3">
              BinaryLiquid Protocol · Whitepaper v1.0 · CHIP-2022-02 · P2SH32 · EIP-191
            </div>

            <h1 className="text-2xl sm:text-[30px] font-semibold tracking-tight text-ink leading-tight max-w-2xl mx-auto">
              {isEs
                ? 'BinaryLiquid: Infraestructura de Liquidez y Préstamos Cross-Chain Sin Custodia para Bitcoin Cash CashTokens y Redes EVM'
                : 'BinaryLiquid: Non-Custodial Cross-Chain Liquidity & Lending Infrastructure Connecting Bitcoin Cash CashTokens and EVM Networks'}
            </h1>

            <p className="text-sm text-ink-2 leading-relaxed max-w-2xl mx-auto">
              {isEs
                ? 'Especificación formal de arquitectura basada en Covenants de Introspección UTXO (CashScript P2SH32), Bóvedas Deterministas en Solidity y Emparejamiento de Liquidez Nativa sin Tokens Envueltos.'
                : 'Formal architectural specification leveraging Native UTXO Introspection Covenants (CashScript P2SH32), Deterministic Solidity Vaults, and Zero-Wrapper Cross-Chain Liquidity Pairing.'}
            </p>

            <div className="pt-2 text-xs text-ink-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
              <span>Drian Stack Labs (Adrian · @drianops)</span>
              <span>·</span>
              <span>Bitcoin Cash (CashTokens) ⟷ Polygon EVM</span>
              <span>·</span>
              <span>BCH BLAZE · ParyonUSD (PUSD)</span>
            </div>
          </header>

          {/* COMPACT MOBILE / TABLET CONTENTS JUMP BAR */}
          <nav
            aria-label="Document index"
            className="xl:hidden py-3 border-b border-line flex items-center gap-2 overflow-x-auto no-scrollbar print:hidden"
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

          {/* ABSTRACT */}
          <section id="wp-abstract" className="pt-8 scroll-mt-20 space-y-4">
            <h2 className="text-base font-semibold text-ink text-center">
              {isEs ? 'Resumen Ejecutivo' : 'Abstract'}
            </h2>

            <p className="text-[15px] text-ink-2 leading-[1.8]">
              {isEs
                ? 'La activación de CashTokens (CHIP-2022-02) dotó a Bitcoin Cash de activos nativos validados directamente por los mineros sobre el modelo UTXO, logrando costos de transacción inferiores a $0.001 USD y ejecución determinista sin cuellos de botella de gas. Sin embargo, los tokens emitidos en Bitcoin Cash permanecían económicamente aislados: carecían de un puente sin custodia para emparejar liquidez directa con los más de $150,000 millones en stablecoins que circulan en redes EVM (USDT, USDC). BinaryLiquid resuelve esta fragmentación mediante una arquitectura de reservas nativas coordinadas por Covenants CashScript P2SH32 en Bitcoin Cash y bóvedas inmutables en Solidity sobre EVM, eliminando por completo las billeteras calientes (hot wallets), las multifirmas custodias y los tokens envueltos sintéticos (wrapped IOUs).'
                : 'The activation of CashTokens (CHIP-2022-02) brought miner-validated native assets to Bitcoin Cash’s UTXO model with sub-$0.001 transaction fees and deterministic execution. Despite these technical advantages, CashToken assets remained economically isolated—lacking trustless infrastructure to pair directly against the $150B+ stablecoin liquidity residing on EVM networks (USDT, USDC). BinaryLiquid eliminates this liquidity silo through a native dual-reserve protocol governed by P2SH32 CashScript Covenants on Bitcoin Cash and immutable Solidity vaults on EVM, completely removing custodial hot wallets, federated multisigs, and synthetic wrapped tokens.'}
            </p>

            {/* Specification invariants bar — pure typography, no dashboard cards */}
            <div className="my-6 py-4 border-y border-line grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <div className="text-ink-3">{isEs ? 'Custodia EOA' : 'EOA Custody'}</div>
                <div className="text-base font-semibold text-ink tabular-nums mt-0.5">0%</div>
                <div className="text-[11px] text-ink-3">{isEs ? 'Cero llaves en bóveda' : 'Zero vault keys'}</div>
              </div>
              <div>
                <div className="text-ink-3">{isEs ? 'Liquidación media' : 'Mean Settlement'}</div>
                <div className="text-base font-semibold text-ink tabular-nums mt-0.5">~3.2s</div>
                <div className="text-[11px] text-ink-3">{isEs ? 'Detección UTXO + EVM' : 'UTXO + EVM finality'}</div>
              </div>
              <div>
                <div className="text-ink-3">{isEs ? 'Comisión / LP' : 'Fee / LP Cut'}</div>
                <div className="text-base font-semibold text-ink tabular-nums mt-0.5">0.30% / 0.20%</div>
                <div className="text-[11px] text-ink-3">{isEs ? 'Rendimiento nativo' : 'Native real yield'}</div>
              </div>
              <div>
                <div className="text-ink-3">{isEs ? 'Timelock reembolso' : 'Refund Timelock'}</div>
                <div className="text-base font-semibold text-ink tabular-nums mt-0.5">24h</div>
                <div className="text-[11px] text-ink-3">{isEs ? 'Salida sin permisos' : 'Permissionless exit'}</div>
              </div>
            </div>
          </section>

          {/* SECTION 1 */}
          <section id="wp-silo" className="pt-6 scroll-mt-20 space-y-4">
            <h2 className="text-lg sm:text-xl font-semibold text-ink">
              {isEs
                ? '1. El problema histórico: Aislamiento de liquidez en ecosistemas UTXO'
                : '1. Problem Statement: Liquidity Siloing Across UTXO and EVM'}
            </h2>

            <p className="text-[15px] text-ink-2 leading-[1.75]">
              {isEs
                ? 'Antes de BinaryLiquid, cualquier proyecto que emitía un CashToken en Bitcoin Cash —como stablecoins descentralizadas (ParyonUSD / PUSD), tokens de utilidad o activos de gobernanza— enfrentaba tres barreras estructurales que frenaban su adopción externa:'
                : 'Prior to BinaryLiquid, any protocol issuing a CashToken on Bitcoin Cash—whether decentralized stablecoins (ParyonUSD / PUSD), utility tokens, or governance assets—faced three structural barriers limiting external capital inflows:'}
            </p>

            <div className="space-y-3 pl-3 border-l-2 border-line">
              <div>
                <h3 className="text-sm font-semibold text-ink">
                  {isEs ? '1.1 Liquidez encerrada en un solo par' : '1.1 Single-chain liquidity trap'}
                </h3>
                <p className="text-sm text-ink-2 leading-relaxed mt-1">
                  {isEs
                    ? 'Los DEX locales en BCH solo permiten emparejar CashTokens contra BCH u otros CashTokens locales, impidiendo acceso directo al capital estable de Polygon, Ethereum o Arbitrum.'
                    : 'Local BCH DEXes can only pair CashTokens against BCH or other local CashTokens, cutting issuers off from deep stablecoin capital on Polygon, Ethereum, or Arbitrum.'}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-ink">
                  {isEs ? '1.2 Fragilidad de puentes custodios' : '1.2 Custodial & multisig risk'}
                </h3>
                <p className="text-sm text-ink-2 leading-relaxed mt-1">
                  {isEs
                    ? 'Los puentes tradicionales dependen de hot wallets o multifirmas opacas donde la filtración de llaves privadas compromete el 100% del TVL depositado.'
                    : 'Legacy cross-chain bridges rely on server hot wallets or opaque multisigs where key compromise drains 100% of locked TVL.'}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-ink">
                  {isEs ? '1.3 Riesgo sistémico de tokens envueltos' : '1.3 Wrapped token depeg risk'}
                </h3>
                <p className="text-sm text-ink-2 leading-relaxed mt-1">
                  {isEs
                    ? 'Acuñar tokens sintéticos ("wUSDT" o "wBCH") fragmenta la liquidez y traslada al usuario final el riesgo permanente de insolvencia del emisor.'
                    : 'Minting synthetic IOU wrappers ("wUSDT" or "wBCH") fragments liquidity and exposes end users to permanent backing insolvency risk.'}
                </p>
              </div>
            </div>
          </section>

          {/* SECTION 2 */}
          <section id="wp-architecture" className="pt-8 scroll-mt-20 space-y-4">
            <h2 className="text-lg sm:text-xl font-semibold text-ink">
              {isEs
                ? '2. Solución BinaryLiquid: Intercambio nativo sin tokens envueltos'
                : '2. BinaryLiquid Architecture: Native-to-Native Inventory Settlement'}
            </h2>

            <p className="text-[15px] text-ink-2 leading-[1.75]">
              {isEs
                ? 'BinaryLiquid sustituye el modelo "Lock-and-Mint" por bóvedas de inventario nativo en ambas cadenas. El usuario entrega un CashToken real en Bitcoin Cash (ej. PUSD) a un contrato P2SH32 determinista y recibe USDT o USDC nativo en Polygon directamente desde el contrato inteligente BinaryLiquidVault.sol, sin intermediarios custodios.'
                : 'BinaryLiquid replaces fragile Lock-and-Mint wrappers with native liquidity vaults on both chains. A user deposits native CashTokens (e.g. PUSD) into a deterministic P2SH32 covenant on Bitcoin Cash and receives native ERC-20 USDT or USDC directly from BinaryLiquidVault.sol on Polygon.'}
            </p>

            <figure className="my-4 space-y-2">
              <div className="bg-surface-2/50 border border-line rounded-lg p-4 font-mono text-[11px] text-ink-2 overflow-x-auto leading-relaxed">
                <pre className="whitespace-pre">{isEs
                  ? `[Billetera BCH (Paytaca / Cashonize)]
       │  1. Envía PUSD nativo al Covenant P2SH32 único por orden
       ▼
[BinaryLiquidEscrow.cash] ──(Expira 24h)──► [Reembolso 100% al Usuario]
       │  2. Introspección UTXO fuerza salida hacia BinaryLiquidVault.cash
       ▼
[The Watchman Sentinel] ──► Verifica UTXO + Audita Oráculo + Firma EIP-191
       │
       ▼
[BinaryLiquidVault.sol (Polygon EVM)]
       │  3. ecrecover + Anti-Replay (executedPayouts) + Circuit Breaker
       ▼
[Billetera EVM Destino] ◄── Recibe USDT / USDC nativo (~3s)`
                  : `[BCH Wallet (Paytaca / Cashonize)]
       │  1. Sends native PUSD to per-order P2SH32 Covenant
       ▼
[BinaryLiquidEscrow.cash] ──(24h Expiry)──► [100% User Refund]
       │  2. UTXO Introspection routes strictly to BinaryLiquidVault.cash
       ▼
[The Watchman Sentinel] ──► UTXO finality + Oracle Sanity + EIP-191 Sig
       │
       ▼
[BinaryLiquidVault.sol (Polygon EVM)]
       │  3. ecrecover + Anti-Replay (executedPayouts) + Circuit Breaker
       ▼
[Destination EVM Wallet] ◄── Receives native USDT / USDC (~3s)`}</pre>
              </div>
              <figcaption className="text-xs text-ink-3 text-center">
                {isEs
                  ? 'Figura 1: Ciclo determinista de liquidación cross-chain sin custodia entre Bitcoin Cash y EVM.'
                  : 'Figure 1: Deterministic non-custodial cross-chain settlement cycle between Bitcoin Cash and EVM.'}
              </figcaption>
            </figure>
          </section>

          {/* SECTION 3 */}
          <section id="wp-covenants" className="pt-8 scroll-mt-20 space-y-4">
            <h2 className="text-lg sm:text-xl font-semibold text-ink">
              {isEs
                ? '3. Especificación formal de Covenants en Bitcoin Cash (CashScript P2SH32)'
                : '3. Formal Bitcoin Cash Covenant Specification (CashScript P2SH32)'}
            </h2>

            <p className="text-[15px] text-ink-2 leading-[1.75]">
              {isEs
                ? 'Todos los contratos en Bitcoin Cash se compilan bajo Pay-to-Script-Hash de 32 bytes (P2SH32, OP_HASH256), ofreciendo 256 bits de resistencia a colisiones frente a ataques de preimagen. Utilizando introspección nativa UTXO (CHIP-2021-02), la máquina virtual de BCH evalúa matemáticamente hacia qué bytecode exacto pueden fluir los tokens:'
                : 'All Bitcoin Cash contracts compile to 32-byte Pay-to-Script-Hash (P2SH32 via OP_HASH256), providing 256-bit collision resistance. Using Native UTXO Introspection (CHIP-2021-02), the BCH VM mathematically constrains exact output locking bytecodes and token amounts:'}
            </p>

            <div className="space-y-4 pt-1">
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-ink">
                  3.1 BinaryLiquidEscrow.cash — {isEs ? 'Covenant determinista por orden' : 'Per-order intent covenant'}
                </h3>
                <p className="text-sm text-ink-2 leading-relaxed">
                  {isEs
                    ? 'Cada swap instancia una dirección de contrato única parametrizada con un orderSalt de 16 bytes, el refundLockingBytecode del usuario y expiryTimestamp (+24h). La ruta settleToVault fuerza por consenso que el 100% de los tokens ingresen únicamente a la bóveda principal BinaryLiquidVault; la ruta refund permite al usuario recuperar su capital sin firmas externas tras expirar el timelock.'
                    : 'Every swap instantiates a unique P2SH32 contract parameterized with a 16-byte orderSalt, the user’s refundLockingBytecode, and expiryTimestamp (+24h). The settleToVault path mathematically forces 100% of tokens into BinaryLiquidVault; the refund path lets the user reclaim full principal permissionlessly once tx.time >= expiryTimestamp.'}
                </p>
                <pre className="bg-surface-2/50 border border-line rounded-lg p-4 font-mono text-[11.5px] text-ink overflow-x-auto leading-relaxed">{`function settleToVault(sig watchmanSig) {
    require(orderSalt.length == 16);
    require(checkSig(watchmanSig, watchmanPk));
    bytes tokenCat = tx.inputs[this.activeInputIndex].tokenCategory;
    int tokenAmt = tx.inputs[this.activeInputIndex].tokenAmount;
    require(tx.outputs[0].lockingBytecode == vaultPoolLockingBytecode);
    if (tokenAmt > 0) {
        require(tx.outputs[0].tokenCategory == tokenCat);
        require(tx.outputs[0].tokenAmount >= tokenAmt);
    }
}
function refund() {
    require(tx.time >= expiryTimestamp); // 24h Timelock
    require(tx.outputs[0].lockingBytecode == refundLockingBytecode);
}`}</pre>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-ink">
                  3.2 BinaryLiquidVault.cash — {isEs ? 'Continuación de estado de bóveda' : 'Covenant state continuation'}
                </h3>
                <p className="text-sm text-ink-2 leading-relaxed">
                  {isEs
                    ? 'Al despachar liquidez hacia BCH, el contrato lee su propio saldo UTXO (poolBalance), verifica el disyuntor on-chain (payoutAmount <= maxSinglePayout) y obliga matemáticamente a que el remanente exacto (poolBalance - payoutAmount) regrese al mismo lockingBytecode del Covenant en tx.outputs[1]. No existe llave privada capaz de vaciar el pool.'
                    : 'When releasing CashTokens on BCH, the covenant inspects its own UTXO balance (poolBalance), enforces the on-chain circuit breaker (payoutAmount <= maxSinglePayout), and mathematically forces the exact remainder (poolBalance - payoutAmount) back into the identical covenant lockingBytecode at tx.outputs[1].'}
                </p>
                <pre className="bg-surface-2/50 border border-line rounded-lg p-4 font-mono text-[11.5px] text-ink overflow-x-auto leading-relaxed">{`int remainingBalance = poolBalance - payoutAmount;
if (remainingBalance > 0) {
    bytes vaultBytecode = tx.inputs[this.activeInputIndex].lockingBytecode;
    require(tx.outputs[1].lockingBytecode == vaultBytecode);
    require(tx.outputs[1].tokenCategory == poolCategory);
    require(tx.outputs[1].tokenAmount >= remainingBalance);
}`}</pre>
              </div>
            </div>
          </section>

          {/* SECTION 4 */}
          <section id="wp-evm" className="pt-8 scroll-mt-20 space-y-4">
            <h2 className="text-lg sm:text-xl font-semibold text-ink">
              {isEs
                ? '4. Bóveda inteligente en EVM (BinaryLiquidVault.sol)'
                : '4. EVM Smart Contract Settlement (BinaryLiquidVault.sol)'}
            </h2>

            <p className="text-[15px] text-ink-2 leading-[1.75]">
              {isEs
                ? 'En Polygon (PoS Mainnet y Amoy Testnet), las reservas estables (USDT, USDC) residen exclusivamente dentro de BinaryLiquidVault.sol (Solidity 0.8.20). El contrato carece deliberadamente de cualquier función administrativa de retiro de liquidez (sin ownerWithdraw); las liberaciones requieren atestación EIP-191 de Watchman con techo por operación, y la especificación V2 (BinaryLiquidVaultV2.sol) añade timelock de 48h para rotación de firmante y límites diarios.'
                : 'On Polygon (PoS Mainnet and Amoy Testnet), ERC-20 reserves (USDT, USDC) live strictly inside BinaryLiquidVault.sol (Solidity 0.8.20). The contract deliberately omits any administrative liquidity withdrawal function (no ownerWithdraw); payouts require Watchman EIP-191 attestation bounded per transaction, while V2 (BinaryLiquidVaultV2.sol) adds a 48h signer-rotation timelock and daily outflow limits.'}
            </p>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-ink">
                {isEs ? 'Invariantes de liquidación EIP-191 y Anti-Replay:' : 'EIP-191 attestation & anti-replay invariants:'}
              </div>
              <pre className="bg-surface-2/50 border border-line rounded-lg p-4 font-mono text-[11.5px] text-ink overflow-x-auto leading-relaxed">{`require(!executedPayouts[bchTxHash], "BinaryLiquid: Anti-Replay blocked");
require(amount > 0 && amount <= MAX_SINGLE_PAYOUT, "BinaryLiquid: Exceeds circuit breaker");
bytes32 messageHash = keccak256(abi.encodePacked(
    "\\x19Ethereum Signed Message:\\n32",
    keccak256(abi.encodePacked(bchTxHash, recipient, token, amount, nonce, block.chainid, address(this)))
));
require(recoverSigner(messageHash, watchmanSignature) == watchmanSigner, "Invalid signature");`}</pre>
              <p className="text-xs text-ink-3 leading-relaxed">
                {isEs
                  ? 'Al ligar la firma a block.chainid y address(this), ninguna atestación válida en Testnet o en otra red puede reutilizarse en Mainnet.'
                  : 'Binding signatures to block.chainid and address(this) mathematically prevents cross-chain and cross-deployment replay attacks.'}
              </p>
            </div>
          </section>

          {/* SECTION 5 */}
          <section id="wp-pools" className="pt-8 scroll-mt-20 space-y-4">
            <h2 className="text-lg sm:text-xl font-semibold text-ink">
              {isEs
                ? '5. Pools de liquidez cross-chain para cualquier proyecto CashToken'
                : '5. Permissionless Cross-Chain Liquidity Pools for CashToken Issuers'}
            </h2>

            <p className="text-[15px] text-ink-2 leading-[1.75]">
              {isEs
                ? 'Uno de los pilares fundamentales de BinaryLiquid es democratizar la liquidez multicadena para todo el ecosistema Bitcoin Cash. Cualquier emisor o comunidad de un CashToken puede registrar su Category ID hexadecimal de 64 caracteres y abrir un pool de liquidez emparejado directamente con un activo de otra cadena (como USDT o USDC en Polygon):'
                : 'A foundational pillar of BinaryLiquid is opening multi-chain liquidity to the entire Bitcoin Cash ecosystem. Any CashToken project or community can register its 64-character hex Category ID and launch a liquidity pool paired directly against an asset on another chain (such as USDT or USDC on Polygon):'}
            </p>

            <div className="space-y-3 pl-3 border-l-2 border-line">
              <div>
                <h3 className="text-sm font-semibold text-ink">
                  {isEs ? '5.1 Modo Bootstrapping y Liquidez Dual' : '5.1 Bootstrapping & Dual-Reserve Modes'}
                </h3>
                <p className="text-sm text-ink-2 leading-relaxed mt-1">
                  {isEs
                    ? 'Los proyectos nuevos pueden iniciar en Modo Bootstrapping fijando una meta mínima de TVL (ej. $2,500 USD) donde la comunidad aporta CashTokens y stablecoins EVM antes de habilitar el enrutamiento público, o abrir directamente en Modo Estándar.'
                    : 'New CashToken projects can launch in Bootstrapping Mode—accumulating community CashTokens and EVM stablecoins toward a target TVL threshold before public swap routing activates—or deploy directly in Standard Dual-Reserve Mode.'}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-ink">
                  {isEs ? '5.2 Economía Real Yield (0.20% para LPs)' : '5.2 Sustainable Real Yield (0.20% to LPs)'}
                </h3>
                <p className="text-sm text-ink-2 leading-relaxed mt-1">
                  {isEs
                    ? 'Cada intercambio aplica una comisión plana del 0.30% (30 bps): el 0.20% (66.7% del ingreso) se acumula directamente en las reservas a favor de los Proveedores de Liquidez según sus LP Shares, y el 0.10% financia la operación del protocolo.'
                    : 'Every cross-chain swap charges a transparent 0.30% (30 bps) flat fee: 0.20% (two-thirds of revenue) accrues directly in native reserve assets to Liquidity Providers pro-rata by LP Shares, while 0.10% sustains protocol infrastructure.'}
                </p>
              </div>
            </div>

            <div className="print:hidden">
              <button
                type="button"
                onClick={onOpenPools}
                className="text-xs font-medium text-ink-2 hover:text-ink underline underline-offset-4 cursor-pointer"
              >
                {isEs ? 'Explorar Pools Cross-Chain →' : 'Explore Cross-Chain Pools →'}
              </button>
            </div>
          </section>

          {/* SECTION 6 */}
          <section id="wp-lending" className="pt-8 scroll-mt-20 space-y-4">
            <h2 className="text-lg sm:text-xl font-semibold text-ink">
              {isEs
                ? '6. Préstamos con colateral BCH nativo y consenso de oráculos'
                : '6. Native BCH Collateralized Lending & Multi-Source Oracle Consensus'}
            </h2>

            <p className="text-[15px] text-ink-2 leading-[1.75]">
              {isEs
                ? 'Los tenedores de Bitcoin Cash pueden obtener liquidez estable (PUSD en BCH o USDT en Polygon) sin vender su posición en BCH. El colateral se deposita en BinaryLiquidCollateralVault.cash, un Covenant P2SH32 individual donde la regla tx.outputs[0].lockingBytecode == borrowerLockingBytecode garantiza a nivel de protocolo que el BCH depositado jamás puede retirarse hacia una dirección distinta a la del propio prestatario.'
                : 'Bitcoin Cash holders can unlock stablecoin liquidity (PUSD on BCH or USDT on Polygon) without selling their BCH exposure. Collateral is locked in a dedicated per-borrower BinaryLiquidCollateralVault.cash P2SH32 covenant where tx.outputs[0].lockingBytecode == borrowerLockingBytecode mathematically guarantees collateral can never be withdrawn to any address other than the borrower’s own wallet.'}
            </p>

            <div className="py-3 border-y border-line grid grid-cols-3 gap-4 text-xs">
              <div>
                <div className="text-ink-3">{isEs ? 'LTV Máximo Inicial' : 'Max Initial LTV'}</div>
                <div className="text-sm font-semibold text-ink tabular-nums mt-0.5">65.0%</div>
              </div>
              <div>
                <div className="text-ink-3">{isEs ? 'Umbral de Liquidación' : 'Liquidation Threshold'}</div>
                <div className="text-sm font-semibold text-ink tabular-nums mt-0.5">80.0%</div>
              </div>
              <div>
                <div className="text-ink-3">{isEs ? 'Factor de Salud Mínimo' : 'Min Health Factor'}</div>
                <div className="text-sm font-semibold text-ink tabular-nums mt-0.5">HF ≥ 1.15</div>
              </div>
            </div>

            <p className="text-xs text-ink-3 leading-relaxed">
              {isEs
                ? 'Oráculos en cascada: Los precios de BCH y activos mayores se obtienen mediante failover automático entre Binance, CoinGecko, Coinbase y Kraken (caché Redis 15s); el precio de LIFT se consulta en vivo vía Cauldron DEX Router (WebSocket), mientras OracleAuditor bloquea desviaciones mayores al 1.5%.'
                : 'Multi-Provider Oracles: BCH and major asset prices query Binance, CoinGecko, Coinbase, and Kraken with automatic failover (15s Redis cache); LIFT pricing queries Cauldron DEX Router live via WebSocket, while OracleAuditor blocks deviations exceeding 1.5%.'}
            </p>
          </section>

          {/* SECTION 7 */}
          <section id="wp-security" className="pt-8 scroll-mt-20 space-y-4">
            <h2 className="text-lg sm:text-xl font-semibold text-ink">
              {isEs
                ? '7. Modelo de seguridad y garantías ante fallos (Liveness & Safety)'
                : '7. Security Model, Fault Tolerance & Autonomous Liveness Guarantees'}
            </h2>

            <figure className="space-y-2">
              <div className="overflow-x-auto border-y border-line">
                <table className="w-full text-left text-xs">
                  <thead className="text-ink border-b border-line">
                    <tr>
                      <th className="py-2.5 pr-4 font-semibold">{isEs ? 'Escenario / Vector' : 'Scenario / Vector'}</th>
                      <th className="py-2.5 px-4 font-semibold">{isEs ? 'Defensa On-Chain' : 'On-Chain Defense'}</th>
                      <th className="py-2.5 pl-4 font-semibold">{isEs ? 'Resultado para el usuario' : 'User Outcome'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line text-ink-2">
                    <tr>
                      <td className="py-2.5 pr-4 font-medium text-ink">
                        {isEs ? 'Caída o censura del Relayer' : 'Relayer downtime or censorship'}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px]">
                        tx.time &gt;= expiry (BCH) &amp; REFUND_TIMELOCK (EVM)
                      </td>
                      <td className="py-2.5 pl-4">
                        {isEs ? 'Reembolso autónomo del 100% tras 24h sin permisos.' : '100% unilateral principal recovery after 24h.'}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-4 font-medium text-ink">
                        {isEs ? 'Intento de desvío de depósito' : 'Escrow diversion attempt'}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px]">
                        outputs[0].lockingBytecode == vaultBytecode
                      </td>
                      <td className="py-2.5 pl-4">
                        {isEs ? 'Rechazado por consenso de nodos BCH.' : 'Rejected by BCH consensus rules.'}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-4 font-medium text-ink">
                        {isEs ? 'Compromiso de firma atestadora' : 'Attester key compromise'}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px]">
                        maxSinglePayout + State Continuation + Pause (48h timelock V2)
                      </td>
                      <td className="py-2.5 pl-4">
                        {isEs ? 'Colateral BCH intocable; pool acotado por techo VM y pausa.' : 'BCH collateral untouchable; pool bounded by VM cap & pause.'}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-4 font-medium text-ink">
                        {isEs ? 'Ataque de Replay entre redes' : 'Cross-chain signature replay'}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px]">
                        executedPayouts[bchTxHash] + chainid
                      </td>
                      <td className="py-2.5 pl-4">
                        {isEs ? 'Ejecución única estricta por hash UTXO.' : 'Strict single execution per UTXO TxID.'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <figcaption className="text-xs text-ink-3 text-center">
                {isEs
                  ? 'Tabla 1: Matriz de amenazas y garantías criptográficas de preservación de fondos.'
                  : 'Table 1: Threat matrix and cryptographic fund-safety invariants.'}
              </figcaption>
            </figure>
          </section>

          {/* SECTION 8 */}
          <section id="wp-integration" className="pt-8 scroll-mt-20 space-y-4">
            <h2 className="text-lg sm:text-xl font-semibold text-ink">
              {isEs
                ? '8. Facilidad de integración: SDK, Widget iFrame y estándares CoinGecko / CMC'
                : '8. Frictionless Integration: SDK, iFrame Widget & CoinGecko / CMC Standards'}
            </h2>

            <p className="text-[15px] text-ink-2 leading-[1.75]">
              {isEs
                ? 'BinaryLiquid fue diseñado como infraestructura componible para que billeteras (Paytaca vía WizardConnect, Cashonize vía WalletConnect v2 wc2-bch-bcr, carteras EVM EIP-6963), DEXes y portales CashToken integren liquidez cross-chain en minutos:'
                : 'BinaryLiquid is engineered as composable infrastructure so wallets (Paytaca via WizardConnect, Cashonize via WalletConnect v2 wc2-bch-bcr, EIP-6963 EVM wallets), DEXes, and CashToken portals can embed cross-chain liquidity in minutes:'}
            </p>

            <ol className="space-y-2.5 text-sm text-ink-2 leading-relaxed list-decimal list-inside">
              <li>
                <strong className="text-ink font-semibold">Widget iFrame (/embed):</strong>{' '}
                {isEs
                  ? 'Una sola etiqueta HTML incrusta la tarjeta no-custodia con par inicial y tema configurables en cualquier web de un CashToken.'
                  : 'A single HTML iframe tag embeds the non-custodial swap card with preselected token pair and theme into any CashToken site.'}
              </li>
              <li>
                <strong className="text-ink font-semibold">API REST de Covenants:</strong>{' '}
                {isEs
                  ? 'Endpoints /api/quote, /api/swap/create y /api/swap/:id permiten a billeteras y bots instanciar contratos P2SH32 al vuelo.'
                  : 'Endpoints /api/quote, /api/swap/create, and /api/swap/:id let native wallets and bots instantiate P2SH32 escrows programmatically.'}
              </li>
              <li>
                <strong className="text-ink font-semibold">Indexación Global DEX:</strong>{' '}
                {isEs
                  ? 'Rutas nativas /api/coingecko/tickers y /api/cmc/summary exponen volumen, liquidez y precio en formato oficial de agregadores.'
                  : 'Built-in /api/coingecko/tickers and /api/cmc/summary routes expose real-time pair pricing and TVL to global market trackers.'}
              </li>
            </ol>

            <div className="print:hidden">
              <button
                type="button"
                onClick={onOpenSdk}
                className="text-xs font-medium text-ink-2 hover:text-ink underline underline-offset-4 cursor-pointer"
              >
                {isEs ? 'Portal SDK y Generador de Widget →' : 'SDK Portal & Widget Generator →'}
              </button>
            </div>
          </section>

          {/* APPENDIX A */}
          <section id="wp-deployments" className="pt-8 scroll-mt-20 space-y-4">
            <h2 className="text-lg sm:text-xl font-semibold text-ink">
              {isEs ? 'Anexo A. Contratos y artefactos verificados en Testnet' : 'Appendix A. Verifiable Testnet Contracts & Artifacts'}
            </h2>

            <div className="divide-y divide-line border-y border-line">
              {DEPLOYED_ARTIFACTS.map((item) => (
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

                  <div className="flex items-center gap-2 shrink-0 print:hidden text-xs">
                    <button
                      type="button"
                      onClick={() => handleCopy(item.key, item.value)}
                      className="inline-flex items-center gap-1 text-ink-3 hover:text-ink transition-colors cursor-pointer"
                    >
                      {copiedId === item.key ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedId === item.key ? (isEs ? 'Copiado' : 'Copied') : (isEs ? 'Copiar' : 'Copy')}</span>
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
          </section>
        </article>
      </div>

      {/* SYMMETRIC RIGHT GUTTER SPACER ON ULTRA-WIDE VIEWPORTS SO PAPER STAYS DEAD CENTER */}
      <div className="hidden xl:block" aria-hidden="true" />
    </div>
  );
}
