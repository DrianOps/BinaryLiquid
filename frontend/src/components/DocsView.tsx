import React, { useState } from 'react';
import { 
  Globe, 
  Zap, 
  Droplets, 
  Activity, 
  ShieldCheck, 
  Wallet, 
  ArrowRight, 
  ExternalLink, 
  Check, 
  Copy,
  Lock, 
  Sparkles,
  BookOpen,
  Code2,
  Coins,
  FileText
} from 'lucide-react';

interface DocsViewProps {
  lang?: 'en' | 'es';
  platformNetwork: 'mainnet' | 'testnet';
  setPlatformNetwork: (net: 'mainnet' | 'testnet') => void;
  onLaunchApp: () => void;
  onOpenWhitepaper?: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  networks: Record<string, any>;
}

export default function DocsView({
  lang = 'es',
  platformNetwork,
  setPlatformNetwork,
  onLaunchApp,
  onOpenWhitepaper,
  showToast,
  networks
}: DocsViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'architecture' | 'pools' | 'lending' | 'fees' | 'contracts'>('overview');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const isEs = lang === 'es';

  const copyAddress = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast(isEs ? 'Dirección copiada al portapapeles' : 'Address copied to clipboard', 'success');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const navItems = [
    { id: 'overview', label: isEs ? '1. Visión & BLAZE' : '1. Overview & BLAZE', icon: Globe },
    { id: 'architecture', label: isEs ? '2. Arquitectura Covenants' : '2. Non-Custodial Architecture', icon: ShieldCheck },
    { id: 'pools', label: isEs ? '3. Pools & Real Yield' : '3. Pools & Real Yield', icon: Droplets },
    { id: 'lending', label: isEs ? '4. Préstamos & Colateral' : '4. Lending & Collateral', icon: Lock },
    { id: 'fees', label: isEs ? '5. Tarifas & Oráculos' : '5. Fees & Oracles', icon: Activity },
    { id: 'contracts', label: isEs ? '6. Contratos & Billeteras' : '6. Contracts & Wallets', icon: Code2 },
  ];

  return (
    <div className="w-full space-y-6">
      {/* Header Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-line">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-bold uppercase tracking-wider mb-2">
            <BookOpen className="w-3.5 h-3.5" />
            <span>{isEs ? 'Documentación Oficial' : 'Official Documentation'}</span>
          </div>
          <h1 className="ui-title text-2xl sm:text-3xl">
            {isEs ? 'Protocolo BinaryLiquid' : 'BinaryLiquid Protocol'}
          </h1>
          <p className="ui-subtitle mt-1 text-xs sm:text-sm">
            {isEs 
              ? 'Arquitectura 100% no custodial basada en covenants CashScript y contratos inteligentes EVM.' 
              : '100% non-custodial architecture built on CashScript covenants and EVM smart contracts.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Network Selector Pill */}
          <button
            onClick={() => {
              const next = platformNetwork === 'mainnet' ? 'testnet' : 'mainnet';
              setPlatformNetwork(next);
              showToast(next === 'mainnet' ? 'Red: Bitcoin Cash Mainnet' : 'Red: BCH Chipnet');
            }}
            className="ui-btn-secondary ui-btn-sm"
            title={isEs ? 'Cambiar red' : 'Switch network'}
          >
            <span className={`w-2 h-2 rounded-full ${platformNetwork === 'mainnet' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
            <span className="capitalize">{platformNetwork}</span>
          </button>

          {onOpenWhitepaper && (
            <button
              type="button"
              onClick={onOpenWhitepaper}
              className="ui-btn-secondary ui-btn-sm flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Whitepaper</span>
            </button>
          )}

          <button 
            onClick={onLaunchApp}
            className="ui-btn-primary ui-btn-sm flex items-center gap-1.5"
          >
            <span>{isEs ? 'Abrir Swap' : 'Launch Swap'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Layout: Nav Tabs + Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Navigation Sidebar (Desktop) / Horizontal Segment (Mobile) */}
        <div className="lg:col-span-3 lg:sticky lg:top-20">
          <div className="flex lg:flex-col overflow-x-auto lg:overflow-x-visible gap-1 p-1 bg-surface-2 rounded-xl border border-line">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    active
                      ? 'bg-surface text-ink shadow-xs font-bold'
                      : 'text-ink-3 hover:text-ink'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-primary' : 'text-ink-3'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Body */}
        <div className="lg:col-span-9 space-y-6">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="ui-card p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-bold text-ink">
                    {isEs ? 'Visión General & Misión BLAZE Hackathon' : 'Protocol Overview & BLAZE Mission'}
                  </h2>
                </div>
                
                <p className="text-sm text-ink-2 leading-relaxed">
                  {isEs ? (
                    <>
                      <strong>BinaryLiquid</strong> es la primera pasarela de liquidez cross-chain y protocolo de préstamos <strong>100% sin custodia</strong> construida sobre la red <strong>Bitcoin Cash (BCH)</strong> con tecnología <strong>CashTokens</strong> y <strong>Polygon (EVM)</strong>. Desarrollada para el hackathon <strong>BCH BLAZE Hackathon</strong> ($750 PUSD Stablecoin Track) patrocinado por <em>ParyonUSD</em>.
                    </>
                  ) : (
                    <>
                      <strong>BinaryLiquid</strong> is the first <strong>100% non-custodial</strong> cross-chain liquidity gateway and lending protocol built on the <strong>Bitcoin Cash (BCH)</strong> network with <strong>CashTokens</strong> and <strong>Polygon (EVM)</strong>. Built for the <strong>BCH BLAZE Hackathon</strong> ($750 PUSD Stablecoin Track) sponsored by <em>ParyonUSD</em>.
                    </>
                  )}
                </p>

                {/* 3 Core Pillars */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="ui-panel p-4 space-y-1.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-xs">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-xs text-ink">{isEs ? '100% No Custodial' : '100% Non-Custodial'}</h3>
                    <p className="text-[11px] text-ink-3 leading-relaxed">
                      {isEs 
                        ? 'Las llaves privadas nunca salen de tu billetera. Los fondos residen en covenants CashScript inmutables.' 
                        : 'Private keys never leave your wallet. Funds are secured in immutable CashScript covenants.'}
                    </p>
                  </div>

                  <div className="ui-panel p-4 space-y-1.5">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                      <Zap className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-xs text-ink">{isEs ? 'Liquidación en ~3s' : '~3s Settlement'}</h3>
                    <p className="text-[11px] text-ink-3 leading-relaxed">
                      {isEs 
                        ? 'Detección en tiempo real de UTXOs en CashTokens y eventos EVM con ejecución automática.' 
                        : 'Real-time UTXO CashToken detection and EVM events with automated settlement.'}
                    </p>
                  </div>

                  <div className="ui-panel p-4 space-y-1.5">
                    <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-500 flex items-center justify-center font-bold text-xs">
                      <Coins className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-xs text-ink">{isEs ? 'Rendimiento Real (LP)' : 'Real Yield (LP)'}</h3>
                    <p className="text-[11px] text-ink-3 leading-relaxed">
                      {isEs 
                        ? 'El 0.20% del volumen de swap se distribuye directamente a los pools de liquidez sin inflación.' 
                        : '0.20% of swap volume is distributed directly to liquidity pools with zero token dilution.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Network Status Card */}
              <div className="ui-card p-5 space-y-3">
                <div className="text-xs font-bold text-ink uppercase tracking-wider">
                  {isEs ? 'Entornos de Red Soportados' : 'Supported Network Environments'}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="ui-panel p-3 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-ink-3 font-semibold uppercase block">Bitcoin Cash</span>
                      <span className="font-bold text-ink flex items-center gap-1.5 mt-0.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        {platformNetwork === 'mainnet' ? 'BCH Mainnet' : 'BCH Chipnet (Testnet4)'}
                      </span>
                    </div>
                    <a 
                      href={networks[platformNetwork]?.explorerBch}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline font-semibold flex items-center gap-1"
                    >
                      <span>Explorer</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="ui-panel p-3 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-ink-3 font-semibold uppercase block">EVM Layer</span>
                      <span className="font-bold text-ink flex items-center gap-1.5 mt-0.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        {platformNetwork === 'mainnet' ? 'Polygon PoS (137)' : 'Polygon Amoy (80002)'}
                      </span>
                    </div>
                    <a 
                      href={networks[platformNetwork]?.explorerEvm}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline font-semibold flex items-center gap-1"
                    >
                      <span>Explorer</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ARCHITECTURE */}
          {activeTab === 'architecture' && (
            <div className="space-y-6">
              <div className="ui-card p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  <h2 className="text-lg font-bold text-ink">
                    {isEs ? 'Arquitectura 100% No Custodial & Covenants' : '100% Non-Custodial Architecture & Covenants'}
                  </h2>
                </div>

                <p className="text-sm text-ink-2 leading-relaxed">
                  {isEs ? (
                    <>
                      BinaryLiquid <strong>no utiliza billeteras calientes (hot wallets) ni custodia fondos</strong>. Toda la liquidez y las operaciones de los usuarios están resguardadas directamente en <strong>Covenants CashScript P2SH-32</strong> en Bitcoin Cash y <strong>Smart Contracts auditados</strong> en Polygon.
                    </>
                  ) : (
                    <>
                      BinaryLiquid <strong>does not use hot wallets or custodial fund pools</strong>. All user swaps and liquidity are safeguarded directly by <strong>CashScript P2SH-32 Covenants</strong> on Bitcoin Cash and <strong>audited Smart Contracts</strong> on Polygon.
                    </>
                  )}
                </p>

                {/* Technical Mechanics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="ui-panel p-4 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                      {isEs ? 'Bitcoin Cash: CashScript Covenants' : 'Bitcoin Cash: CashScript Covenants'}
                    </span>
                    <h3 className="font-bold text-sm text-ink">BinaryLiquidEscrow.cash</h3>
                    <p className="text-xs text-ink-3 leading-relaxed">
                      {isEs
                        ? 'Contratos covenants P2SH-32 compilados directamente a bytecode nativo BCH. Solo liberan fondos si se presenta la prueba criptográfica de liquidación o si expira el timelock de reembolso para el usuario.'
                        : 'P2SH-32 covenants compiled directly to native BCH bytecode. Funds are only unlocked upon cryptographic settlement proof or returned to the user via timelock refund.'}
                    </p>
                  </div>

                  <div className="ui-panel p-4 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500">
                      {isEs ? 'Polygon EVM: Bóveda Inteligente' : 'Polygon EVM: Smart Vault'}
                    </span>
                    <h3 className="font-bold text-sm text-ink">BinaryLiquidVault.sol</h3>
                    <p className="text-xs text-ink-3 leading-relaxed">
                      {isEs
                        ? 'Contrato ERC-20 con protección contra reentrancia (ReentrancyGuard). Los depósitos emiten eventos inmutables indexados y solo despachan bajo validación de solvencia descentralizada.'
                        : 'ERC-20 vault with ReentrancyGuard. Deposits emit immutable on-chain events and execute payouts under decentralized validation.'}
                    </p>
                  </div>
                </div>

                {/* 4-Step Pipeline */}
                <div className="pt-4 border-t border-line space-y-3">
                  <div className="text-xs font-bold text-ink uppercase tracking-wider">
                    {isEs ? 'Flujo de Ejecución Paso a Paso' : 'Step-by-Step Execution Pipeline'}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                    {[
                      { step: '1', title: isEs ? 'Cotización Oracle' : 'Oracle Quote', desc: isEs ? 'Cálculo de tipo de cambio y comisión plana de 0.30% en tiempo real.' : 'Real-time price feed and transparent 0.30% fee computation.' },
                      { step: '2', title: isEs ? 'Firma en Covenant' : 'Covenant Lock', desc: isEs ? 'El usuario firma la transacción bloqueando fondos en el contrato P2SH32.' : 'User signs transaction directly locking tokens in P2SH32 escrow.' },
                      { step: '3', title: isEs ? 'Validación Relayer' : 'Relayer Proof', desc: isEs ? 'El indexador detecta la confirmación on-chain y valida la categoría.' : 'Relayer detects the on-chain UTXO and validates token categories.' },
                      { step: '4', title: isEs ? 'Despacho Inmediato' : 'Instant Release', desc: isEs ? 'Tokens liberados al destino en ~3s con timelock de seguridad.' : 'Tokens dispatched to recipient in ~3s with safety timelock.' }
                    ].map((s) => (
                      <div key={s.step} className="ui-panel p-3 space-y-1">
                        <span className="w-5 h-5 rounded-full bg-primary/20 text-primary font-bold text-[11px] flex items-center justify-center">
                          {s.step}
                        </span>
                        <div className="font-bold text-xs text-ink">{s.title}</div>
                        <p className="text-[11px] text-ink-3 leading-relaxed">{s.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LIQUIDITY POOLS */}
          {activeTab === 'pools' && (
            <div className="space-y-6">
              <div className="ui-card p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Droplets className="w-5 h-5 text-cyan-500" />
                  <h2 className="text-lg font-bold text-ink">
                    {isEs ? 'Pools de Liquidez & Rendimiento Real' : 'Liquidity Pools & Real Yield'}
                  </h2>
                </div>

                <p className="text-sm text-ink-2 leading-relaxed">
                  {isEs ? (
                    <>
                      Los Proveedores de Liquidez (LPs) suministran reservas a los contratos sin intermediarios. Por cada swap realizado en la plataforma, <strong>el 0.20% del volumen se transfiere automáticamente a los pools</strong>, aumentando el valor intrínseco de cada share LP en stablecoins reales (Real Yield).
                    </>
                  ) : (
                    <>
                      Liquidity Providers (LPs) supply reserves to smart contracts without intermediaries. On every swap, <strong>0.20% of trading volume is credited directly to the pool reserves</strong>, boosting LP share value in real stablecoins (Real Yield).
                    </>
                  )}
                </p>

                {/* Pool Status Table */}
                <div className="space-y-2 pt-2">
                  <div className="text-xs font-bold text-ink uppercase tracking-wider">
                    {isEs ? 'Pares Oficiales del Protocolo' : 'Protocol Canonical Pairs'}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { pair: 'PUSD / USDT', type: isEs ? 'CashTokens ⟷ Polygon PoS' : 'CashTokens ⟷ Polygon PoS', apy: '6.8%', status: 'ACTIVE', tag: 'BLAZE Track' },
                      { pair: 'PUSD / USDC', type: isEs ? 'CashTokens ⟷ Polygon PoS' : 'CashTokens ⟷ Polygon PoS', apy: '7.1%', status: 'ACTIVE', tag: 'Paryon Sponsor' },
                      { pair: 'BCH / USDC', type: isEs ? 'Bitcoin Cash ⟷ USD Coin' : 'Bitcoin Cash ⟷ USD Coin', apy: '6.4%', status: 'ACTIVE', tag: 'Core BCH' },
                      { pair: 'BCH / PUSD', type: isEs ? 'UTXO Native AMM' : 'UTXO Native AMM', apy: '8.2%', status: 'ACTIVE', tag: 'Native AMM' },
                    ].map((p, i) => (
                      <div key={i} className="ui-panel p-3.5 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-ink">{p.pair}</span>
                            <span className="ui-badge-success text-[10px]">{p.status}</span>
                          </div>
                          <span className="text-[11px] text-ink-3 block mt-0.5">{p.type}</span>
                          <span className="text-[10px] font-semibold text-primary">{p.tag}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-ink-3 uppercase block font-semibold">APY Est.</span>
                          <span className="text-sm font-bold text-emerald-500">{p.apy}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bootstrapping Mechanism */}
                <div className="p-4 rounded-xl bg-surface-2 border border-line space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="font-bold text-xs text-ink">
                      {isEs ? 'Mecanismo de Activación Automática (Bootstrapping)' : 'Bootstrapping Auto-Unlock'}
                    </span>
                  </div>
                  <p className="text-xs text-ink-2 leading-relaxed">
                    {isEs 
                      ? 'Nuevos pools se lanzan en estado BOOTSTRAPPING con una meta de TVL. La comunidad provee liquidez y, en cuanto se alcanza el 100% de la meta, el smart contract habilita automáticamente los swaps públicos sin intervención de administradores.' 
                      : 'New pools start in BOOTSTRAPPING phase with a target TVL. The community provides liquidity and the exact moment 100% is reached, public swapping is unlocked automatically with zero admin intervention.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: LENDING */}
          {activeTab === 'lending' && (
            <div className="space-y-6">
              <div className="ui-card p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-emerald-500" />
                  <h2 className="text-lg font-bold text-ink">
                    {isEs ? 'Préstamos & Bóvedas de Colateral BCH' : 'Lending & BCH Collateral Vaults'}
                  </h2>
                </div>

                <p className="text-sm text-ink-2 leading-relaxed">
                  {isEs ? (
                    <>
                      El módulo de préstamos permite depositar <strong>Bitcoin Cash nativo</strong> como colateral en un contrato covenant <strong>BinaryLiquidCollateralVault.cash</strong> para pedir prestadas stablecoins <strong>ParyonUSD (PUSD)</strong> manteniendo la soberanía total.
                    </>
                  ) : (
                    <>
                      The lending module allows depositing <strong>native Bitcoin Cash</strong> as collateral into a <strong>BinaryLiquidCollateralVault.cash</strong> covenant to borrow <strong>ParyonUSD (PUSD)</strong> stablecoins while retaining full sovereign ownership.
                    </>
                  )}
                </p>

                {/* Risk Parameters */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="ui-panel p-4 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-ink-3">LTV Máximo</span>
                    <div className="text-lg font-black text-ink">70.0%</div>
                    <p className="text-[11px] text-ink-3">
                      {isEs ? 'Monto máximo de préstamo respecto al valor del BCH depositado.' : 'Maximum borrow amount relative to deposited BCH value.'}
                    </p>
                  </div>

                  <div className="ui-panel p-4 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-ink-3">Umbral Liquidación</span>
                    <div className="text-lg font-black text-amber-500">80.0%</div>
                    <p className="text-[11px] text-ink-3">
                      {isEs ? 'Nivel donde la posición se abre a liquidadores descentralizados.' : 'Threshold where positions become eligible for decentralized liquidation.'}
                    </p>
                  </div>

                  <div className="ui-panel p-4 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-ink-3">Health Factor</span>
                    <div className="text-lg font-black text-emerald-500">&gt; 1.25</div>
                    <p className="text-[11px] text-ink-3">
                      {isEs ? 'Rango seguro de salud para proteger el colateral ante volatilidad.' : 'Safe health buffer safeguarding collateral against market dips.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: FEES & ORACLES */}
          {activeTab === 'fees' && (
            <div className="space-y-6">
              <div className="ui-card p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-purple-500" />
                  <h2 className="text-lg font-bold text-ink">
                    {isEs ? 'Modelo de Tarifas & Oráculos de Alta Frecuencia' : 'Fee Model & High-Frequency Oracles'}
                  </h2>
                </div>

                <p className="text-sm text-ink-2 leading-relaxed">
                  {isEs ? (
                    <>
                      BinaryLiquid cobra una <strong>comisión plana y transparente del 0.30%</strong> sobre el volumen intercambiado. No existen tarifas ocultas ni comisiones por retiro.
                    </>
                  ) : (
                    <>
                      BinaryLiquid operates a <strong>flat, transparent 0.30% fee</strong> on all swap volume. There are zero hidden fees or withdrawal surcharges.
                    </>
                  )}
                </p>

                {/* Fee Split */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="ui-panel p-4 space-y-1.5 border-l-2 border-l-emerald-500">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-ink">{isEs ? 'Proveedores de Liquidez (LPs)' : 'Liquidity Providers'}</span>
                      <span className="text-sm font-bold text-emerald-500">0.20% (66.7%)</span>
                    </div>
                    <p className="text-xs text-ink-3 leading-relaxed">
                      {isEs 
                        ? 'Se acredita instantáneamente al balance del pool en cada swap, aumentando el valor de los shares LP sin dilución.' 
                        : 'Credited instantly to pool reserves on every swap, increasing the book value of LP shares without dilution.'}
                    </p>
                  </div>

                  <div className="ui-panel p-4 space-y-1.5 border-l-2 border-l-primary">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-ink">{isEs ? 'Reserva de Liquidez del Protocolo' : 'Protocol Liquidity Reserve'}</span>
                      <span className="text-sm font-bold text-primary">0.10% (33.3%)</span>
                    </div>
                    <p className="text-xs text-ink-3 leading-relaxed">
                      {isEs 
                        ? 'Asignado al fondo de reserva para respaldar infraestructura, auditorías continuas y solvencia.' 
                        : 'Allocated to protocol reserves backing network infrastructure, ongoing audits, and cross-chain solvency.'}
                    </p>
                  </div>
                </div>

                {/* Math Example */}
                <div className="p-4 rounded-xl bg-surface-2 border border-line space-y-2 text-xs">
                  <div className="font-bold text-ink flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <span>{isEs ? 'Ejemplo Matemático (Swap de 1,000 PUSD ➔ USDT)' : 'Mathematical Example (1,000 PUSD ➔ USDT Swap)'}</span>
                  </div>
                  <div className="font-mono text-[11px] text-ink-2 space-y-0.5">
                    <div>• {isEs ? 'Monto Vendido' : 'Sell Amount'}: 1,000.00 PUSD</div>
                    <div>• {isEs ? 'Comisión Total (0.30%)' : 'Total Fee (0.30%)'}: -3.00 USD (2.00 USD LPs + 1.00 USD Reserva)</div>
                    <div className="font-bold text-primary">• {isEs ? 'Monto Neto Recibido' : 'Net Received'}: 997.00 USDT (Despacho inmediato a la dirección indicada)</div>
                  </div>
                </div>

                {/* Multi-Source Oracle Engine */}
                <div className="ui-panel p-4 space-y-2">
                  <h3 className="font-bold text-xs text-ink flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-primary" />
                    <span>{isEs ? 'Motor de Oráculos Multi-Fuente Descentralizado' : 'Decentralized Multi-Source Oracle Engine'}</span>
                  </h3>
                  <p className="text-xs text-ink-3 leading-relaxed">
                    {isEs 
                      ? 'Para pares con precios fluctuantes (BCH, ETH, SOL, POL), el motor consulta agregadores DEX y fuentes primarias con caché persistente de alta velocidad para asegurar cotizaciones precisas y prevenir manipulaciones de slippage.' 
                      : 'For volatile assets (BCH, ETH, SOL, POL), our engine aggregates decentralized DEX feeds with high-frequency caching to deliver true market quotes and protect against slippage spikes.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: CONTRACTS & WALLETS */}
          {activeTab === 'contracts' && (
            <div className="space-y-6">
              <div className="ui-card p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Code2 className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-bold text-ink">
                    {isEs ? 'Contratos Oficiales & Billeteras Soportadas' : 'Official Contracts & Supported Wallets'}
                  </h2>
                </div>

                <p className="text-sm text-ink-2 leading-relaxed">
                  {isEs ? (
                    <>
                      Todos los contratos y covenants son públicos, auditables y verificables en exploradores blockchain:
                    </>
                  ) : (
                    <>
                      All smart contracts and covenants are public, auditable, and verifiable on-chain:
                    </>
                  )}
                </p>

                {/* Contract Addresses Box */}
                <div className="space-y-2.5 pt-2">
                  <div className="text-xs font-bold text-ink uppercase tracking-wider">
                    {platformNetwork === 'mainnet' ? 'Producción (Mainnet)' : 'Pruebas (Chipnet & Amoy)'}
                  </div>

                  {platformNetwork === 'testnet' ? (
                    <div className="space-y-2">
                      <div className="ui-panel p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="text-[10px] text-ink-3 font-semibold uppercase block">BCH Chipnet Covenant (P2SH-32)</span>
                          <span className="font-mono text-xs text-ink select-all break-all">
                            bchtest:pvqse7cr2ptah2e34sl53r5utqwxl28fk84grvf5ufzd6n5tclme2hmkrmd9e
                          </span>
                        </div>
                        <button
                          onClick={() => copyAddress('bch-cov', 'bchtest:pvqse7cr2ptah2e34sl53r5utqwxl28fk84grvf5ufzd6n5tclme2hmkrmd9e')}
                          className="ui-btn-secondary ui-btn-sm shrink-0 flex items-center gap-1 self-start sm:self-center"
                        >
                          {copiedKey === 'bch-cov' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedKey === 'bch-cov' ? (isEs ? 'Copiado' : 'Copied') : (isEs ? 'Copiar' : 'Copy')}</span>
                        </button>
                      </div>

                      <div className="ui-panel p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="text-[10px] text-ink-3 font-semibold uppercase block">PUSD CashTokens Category ID</span>
                          <span className="font-mono text-xs text-ink select-all break-all">
                            6b6cf8de5963d67594a4565d49a7bcf3e668a18a7328828de16bd393ac00dcad
                          </span>
                        </div>
                        <button
                          onClick={() => copyAddress('pusd-cat', '6b6cf8de5963d67594a4565d49a7bcf3e668a18a7328828de16bd393ac00dcad')}
                          className="ui-btn-secondary ui-btn-sm shrink-0 flex items-center gap-1 self-start sm:self-center"
                        >
                          {copiedKey === 'pusd-cat' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedKey === 'pusd-cat' ? (isEs ? 'Copiado' : 'Copied') : (isEs ? 'Copiar' : 'Copy')}</span>
                        </button>
                      </div>

                      <div className="ui-panel p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="text-[10px] text-ink-3 font-semibold uppercase block">Polygon Amoy Vault Contract</span>
                          <span className="font-mono text-xs text-ink select-all break-all">
                            0xc830c7cB16cd05bdEd8CA9d0c73E9038ed25Aa4A
                          </span>
                        </div>
                        <button
                          onClick={() => copyAddress('evm-vault', '0xc830c7cB16cd05bdEd8CA9d0c73E9038ed25Aa4A')}
                          className="ui-btn-secondary ui-btn-sm shrink-0 flex items-center gap-1 self-start sm:self-center"
                        >
                          {copiedKey === 'evm-vault' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedKey === 'evm-vault' ? (isEs ? 'Copiado' : 'Copied') : (isEs ? 'Copiar' : 'Copy')}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="ui-panel p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="text-[10px] text-ink-3 font-semibold uppercase block">Polygon PoS USDT (ERC-20)</span>
                          <span className="font-mono text-xs text-ink select-all break-all">
                            0xc2132D05D31c914a87C6611C10748AEb04B58e8F
                          </span>
                        </div>
                        <button
                          onClick={() => copyAddress('pos-usdt', '0xc2132D05D31c914a87C6611C10748AEb04B58e8F')}
                          className="ui-btn-secondary ui-btn-sm shrink-0 flex items-center gap-1 self-start sm:self-center"
                        >
                          {copiedKey === 'pos-usdt' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedKey === 'pos-usdt' ? (isEs ? 'Copiado' : 'Copied') : (isEs ? 'Copiar' : 'Copy')}</span>
                        </button>
                      </div>

                      <div className="ui-panel p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="text-[10px] text-ink-3 font-semibold uppercase block">Polygon PoS USDC (ERC-20)</span>
                          <span className="font-mono text-xs text-ink select-all break-all">
                            0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359
                          </span>
                        </div>
                        <button
                          onClick={() => copyAddress('pos-usdc', '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359')}
                          className="ui-btn-secondary ui-btn-sm shrink-0 flex items-center gap-1 self-start sm:self-center"
                        >
                          {copiedKey === 'pos-usdc' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedKey === 'pos-usdc' ? (isEs ? 'Copiado' : 'Copied') : (isEs ? 'Copiar' : 'Copy')}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Supported Wallets */}
                <div className="pt-4 border-t border-line space-y-3">
                  <div className="text-xs font-bold text-ink uppercase tracking-wider">
                    {isEs ? 'Billeteras Web3 Recomendadas' : 'Recommended Web3 Wallets'}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="ui-panel p-3.5 flex items-center gap-3">
                      <img src="/wizardconnect-logo.png" className="w-8 h-8 object-contain rounded-lg" alt="Paytaca" />
                      <div>
                        <div className="font-bold text-xs text-ink flex items-center gap-1.5">
                          <span>Paytaca Wallet</span>
                          <span className="ui-badge-success text-[10px]">WizardConnect</span>
                        </div>
                        <p className="text-[11px] text-ink-3 mt-0.5">
                          {isEs ? 'Soporte nativo para CashTokens (PUSD, MUSD, LIFT).' : 'Native peer-to-peer support for CashTokens (PUSD, MUSD, LIFT).'}
                        </p>
                      </div>
                    </div>

                    <div className="ui-panel p-3.5 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-xs">
                        <Wallet className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-xs text-ink flex items-center gap-1.5">
                          <span>MetaMask / Rabby</span>
                          <span className="ui-badge-neutral text-[10px]">EVM Web3</span>
                        </div>
                        <p className="text-[11px] text-ink-3 mt-0.5">
                          {isEs ? 'Soporte directo para Polygon PoS y Polygon Amoy.' : 'Multi-chain support for Polygon PoS and Polygon Amoy.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
