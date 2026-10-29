import React, { useState } from 'react';
import { 
  Globe, 
  Zap, 
  Droplets, 
  Activity, 
  ShieldCheck, 
  Wallet, 
  ArrowRight, 
  TrendingUp, 
  ExternalLink, 
  CheckCircle, 
  Cpu, 
  Lock, 
  Server, 
  Sparkles,
  BookOpen
} from 'lucide-react';

interface DocsViewProps {
  lang?: 'en' | 'es';
  platformNetwork: 'mainnet' | 'testnet';
  setPlatformNetwork: (net: 'mainnet' | 'testnet') => void;
  onLaunchApp: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  networks: Record<string, any>;
}

const docTexts = {
  en: {
    badge: "Official Protocol Documentation",
    title: "Cross-Chain Gateway Docs",
    subtitle: "Hybrid Relayer Engine, Non-Custodial Liquidity Pools & Autonomous Security Sweeper",
    launchBtn: "Launch Bridge Swap",
    navHeader: "Documentation",
    navItems: [
      { id: 'overview', label: '1. Overview & BLAZE Mission', icon: Globe },
      { id: 'relayer', label: '2. Hybrid Relayer Engine', icon: Zap },
      { id: 'pools', label: '3. Liquidity Pools & AMM', icon: Droplets },
      { id: 'fees', label: '4. Fee Model & Oracles', icon: Activity },
      { id: 'security', label: '5. Cold Vault & Anti-DDoS', icon: ShieldCheck },
      { id: 'wallets', label: '6. Non-Custodial Wallets', icon: Wallet },
    ],
    sidebarNetTitle: "Platform Network",
    sidebarNetDesc: "Connected with Bitcoin Cash Mainnet and Polygon PoS.",

    // Section 1
    sec1Title: "1. Protocol Overview & BLAZE Hackathon Mission",
    sec1Desc: "BinaryLiquid is the first 100% non-custodial cross-chain liquidity gateway built on the Bitcoin Cash (BCH) network and CashTokens technology. Designed specifically for the BCH BLAZE Hackathon ($750 PUSD Stablecoin Track) sponsored by",
    pillar1Title: "Instant Settlement",
    pillar1Desc: "Automated execution in ~3 seconds between CashTokens UTXO (BCH) and ERC-20 tokens (Polygon).",
    pillar2Title: "100% Non-Custodial",
    pillar2Desc: "Private keys never leave the user's wallet (direct cryptographic signing via WizardConnect or WalletConnect).",
    pillar3Title: "Real Yield (LP)",
    pillar3Desc: "0.20% of swap volume is distributed directly to liquidity providers in real stablecoins.",
    netCardTitle: "Platform Network (Network Environment):",
    netActiveMode: "Active Mode:",
    mainnetBtn: "Mainnet (Production)",
    testnetBtn: "Testnet (Chipnet)",
    bchLayer: "Bitcoin Cash Layer",
    evmLayer: "EVM Cross-Chain Layer",
    explorerLink: "Explorer",

    // Section 2
    sec2Title: "2. Hybrid Relayer Architecture & Cross-Chain Swapping",
    sec2Desc: "The BinaryLiquid Relayer engine combines dual-chain cryptographic validation with automated dispatch from the protocol's active liquidity reserve vaults:",
    step1Title: "Oracle Quote",
    step1Desc: "The frontend calculates the exact net amount automatically deducting the 0.30% fee using real-time oracle price feeds.",
    step2Title: "On-Chain Deposit",
    step2Desc: "The user signs the transaction from their wallet (Paytaca or MetaMask) directly to the protocol's automated settlement vault.",
    step3Title: "Relayer Verification",
    step3Desc: "The L3 Relayer detects the blockchain event, verifies the CashToken or ERC-20 category, and confirms the block.",
    step4Title: "Instant Settlement",
    step4Desc: "Equivalent tokens are dispatched to the target address in ~3 seconds and indexed in the persistent PostgreSQL ledger.",

    // Section 3
    sec3Title: "3. Liquidity Pools & Bootstrapping Auto-Unlock",
    sec3Desc: "The platform operates with 8 canonical pools connecting the Bitcoin Cash ecosystem with major EVM chains and Solana:",
    poolApyLabel: "Estimated APY",
    bootstrapTitle: "Bootstrapping Auto-Unlock Mechanism",
    bootstrapDesc: "New pools launch in BOOTSTRAPPING status with a target TVL goal (e.g. $10,000 or $20,000). Community members can provide liquidity to fund the pool. The exact moment liquidity reaches 100% of the target, the backend automatically transitions it to ACTIVE status, enabling instant public swaps without human intervention.",

    // Section 4
    sec4Title: "4. Fee Model & High-Frequency Oracles",
    sec4Desc: "BinaryLiquid operates under a flat and transparent 0.30% fee model on all swap volume:",
    lpShareTitle: "Liquidity Providers",
    lpSharePct: "0.20% (66.7%)",
    lpShareDesc: "Credited immediately to pool reserves on every swap, increasing the book value of LP shares without dilution.",
    coldShareTitle: "Cold Treasury Vault",
    coldSharePct: "0.10% (33.3%)",
    coldShareDesc: "Transferred automatically into the cold vault to back infrastructure and solvency reserves.",
    mathExampleTitle: "Mathematical Swap Example (1,000 PUSD ➔ USDC):",
    mathSell: "• Sell Amount: 1,000.00 PUSD",
    mathFee: "• Total Fee (0.30%): -3.00 USD (2.00 USD for LPs + 1.00 USD for Cold Treasury)",
    mathNet: "• Net Received (Buy): 997.00 USDC (Instant dispatch to destination wallet)",
    oracleTitle: "Multi-Source Oracle Pool with Redis In-Memory Cache",
    oracleDesc: "For volatile pairs (BCH, SOL, ETH, POL), the engine aggregates live feeds every 10 seconds from Binance API, CoinGecko, Coinbase, and Kraken. In-memory Redis caching prevents downtime during network congestion or volume surges.",

    // Section 5
    sec5Title: "5. Security Architecture, Cold Vault Sweeper & Anti-DDoS",
    sec5Desc: "To eliminate attack vectors and safeguard funds, BinaryLiquid enforces strict structural separation between the Automated Settlement Vaults and the Offline Cold Treasury Vault:",
    activeVaultTitle: "Automated Settlement Vault",
    activeVaultStatus: "Liquid",
    activeVaultDesc: "Automated multi-asset liquidity reserves (175 BCH, 50k PUSD, 50k USDC, 25k USDT) strictly dedicated to executing swaps instantly.",
    coldVaultTitle: "Cold Treasury Vault",
    coldVaultStatus: "Offline",
    coldVaultDesc: "Cryptographically protected offline cold storage where accumulated protocol reserves and treasury fees are secured.",
    vaultAddressesTitle: "Official Cold Treasury Vault Addresses:",
    antiDdosTitle: "Attack Mitigation & Infrastructure Failover",
    antiDdos1: "Nginx Rate-Limiting Zones: Strict thresholds to mitigate spam order floods (8 req/burst on swaps, 25 req/burst on API).",
    antiDdos2: "5-RPC Node Failover Pool: Automated failover between dRPC, PublicNode, Ankr, BlockPI, and 1RPC.",
    antiDdos3: "Immutable Persistence Layer: Industrial PostgreSQL database with full transaction auditing protected against packet loss.",

    // Section 6
    sec6Title: "6. Non-Custodial Web3 Wallets & Sovereignty",
    sec6Desc: "BinaryLiquid requires no account creation or KYC verification. Interaction occurs sovereignly through open Web3 standards:",
    walletPaytacaTitle: "Paytaca (WizardConnect)",
    walletPaytacaBadge: "Recommended for CashTokens",
    walletPaytacaDesc: "Native peer-to-peer connection to transact PUSD, MUSD, and BCH directly from mobile devices or browser extensions.",
    walletWcTitle: "WalletConnect V2",
    walletWcBadge: "MetaMask, Cashonize, Zapit",
    walletWcDesc: "Multi-chain support for EVM wallets (Polygon, Ethereum) and Web3 applications compatible with WalletConnect."
  },
  es: {
    badge: "Documentación Oficial del Protocolo",
    title: "Documentación del Gateway Cross-Chain",
    subtitle: "Motor Relayer Híbrido, Pools de Liquidez No Custodiales & Sweeper de Seguridad Autónomo",
    launchBtn: "Abrir Bridge Swap",
    navHeader: "Documentación",
    navItems: [
      { id: 'overview', label: '1. Visión General & BLAZE', icon: Globe },
      { id: 'relayer', label: '2. Motor Relayer Híbrido', icon: Zap },
      { id: 'pools', label: '3. Pools de Liquidez & AMM', icon: Droplets },
      { id: 'fees', label: '4. Modelo de Tarifas & Oráculos', icon: Activity },
      { id: 'security', label: '5. Bóvedas de Seguridad & Anti-DDoS', icon: ShieldCheck },
      { id: 'wallets', label: '6. Billeteras No Custodiales', icon: Wallet },
    ],
    sidebarNetTitle: "Red de la Plataforma",
    sidebarNetDesc: "Conectado con Bitcoin Cash Mainnet y Polygon PoS.",

    // Section 1
    sec1Title: "1. Visión General del Protocolo & Misión Hackathon BLAZE",
    sec1Desc: "BinaryLiquid es la primera pasarela de liquidez cross-chain 100% sin custodia construida sobre la red Bitcoin Cash (BCH) y la tecnología de CashTokens. Diseñada específicamente para el hackathon BCH BLAZE Hackathon ($750 PUSD Stablecoin Track) patrocinado por",
    pillar1Title: "Liquidación Instantánea",
    pillar1Desc: "Ejecución automatizada en ~3 segundos entre CashTokens UTXO (BCH) y tokens ERC-20 (Polygon).",
    pillar2Title: "100% No Custodial",
    pillar2Desc: "Las llaves privadas nunca salen de la wallet del usuario (firma directa vía WizardConnect o WalletConnect).",
    pillar3Title: "Rendimiento Real (LP)",
    pillar3Desc: "El 0.20% del volumen de swaps se distribuye directamente a los proveedores de liquidez en stablecoins reales.",
    netCardTitle: "Red de la Plataforma (Entorno de Red):",
    netActiveMode: "Modo Activo:",
    mainnetBtn: "Mainnet (Principal)",
    testnetBtn: "Testnet (Chipnet)",
    bchLayer: "Capa Bitcoin Cash",
    evmLayer: "Capa EVM Cross-Chain",
    explorerLink: "Explorador",

    // Section 2
    sec2Title: "2. Arquitectura Relayer Híbrida & Swaps Cross-Chain",
    sec2Desc: "El motor Relayer de BinaryLiquid combina validación criptográfica en ambas cadenas con despacho automatizado desde las bóvedas de liquidación activa del protocolo:",
    step1Title: "Cotización Oracle",
    step1Desc: "El frontend calcula el monto neto descontando automáticamente la comisión del 0.30% con oráculos en vivo.",
    step2Title: "Depósito On-Chain",
    step2Desc: "El usuario firma la transacción desde su wallet (Paytaca o MetaMask) hacia la bóveda automatizada de liquidación del protocolo.",
    step3Title: "Verificación Relayer",
    step3Desc: "El Relayer L3 detecta el evento en la blockchain, valida la categoría CashToken o ERC-20 y confirma el bloque.",
    step4Title: "Despacho Inmediato",
    step4Desc: "Se envían los tokens equivalentes a la dirección destino en ~3 segundos y se registra en el ledger inmutable PostgreSQL.",

    // Section 3
    sec3Title: "3. Pools de Liquidez & Desbloqueo Automático",
    sec3Desc: "La plataforma opera con 8 pools canónicos que conectan el ecosistema Bitcoin Cash con las principales cadenas EVM y Solana:",
    poolApyLabel: "APY Estimado",
    bootstrapTitle: "Mecanismo de Desbloqueo Automático (Bootstrapping Auto-Unlock)",
    bootstrapDesc: "Los nuevos pools se inician en fase BOOTSTRAPPING con una meta de TVL objetivo (ej. $10,000 o $20,000). Los usuarios pueden proveer liquidez para fondear el pool. En el instante exacto en que la liquidez alcanza el 100% de la meta, el backend lo desbloquea automáticamente a estado ACTIVE, habilitando swaps públicos inmediatos sin intervención humana.",

    // Section 4
    sec4Title: "4. Modelo de Comisiones & Oráculos de Alta Frecuencia",
    sec4Desc: "BinaryLiquid opera bajo un modelo de comisión plana y transparente del 0.30% sobre el volumen intercambiado:",
    lpShareTitle: "Proveedores de Liquidez",
    lpSharePct: "0.20% (66.7%)",
    lpShareDesc: "Se acredita de inmediato al balance del pool en cada swap, aumentando el valor contable de los shares LP sin dilución.",
    coldShareTitle: "Tesorería Bóveda Fría",
    coldSharePct: "0.10% (33.3%)",
    coldShareDesc: "Se transfiere automáticamente hacia la bóveda fría (Cold Treasury) para respaldar la infraestructura y reservas.",
    mathExampleTitle: "Ejemplo Matemático de Swap (1,000 PUSD ➔ USDC):",
    mathSell: "• Monto de Venta (Sell): 1,000.00 PUSD",
    mathFee: "• Comisión Total (0.30%): -3.00 USD (2.00 USD para LPs + 1.00 USD para Bóveda Fría)",
    mathNet: "• Monto Neto Recibido (Buy): 997.00 USDC (Despacho inmediato a la wallet de destino)",
    oracleTitle: "Pool de Oráculos Multi-Fuente con Caché Redis",
    oracleDesc: "Para los pares volátiles (BCH, SOL, ETH, POL), el motor consulta cada 10 segundos las cotizaciones agregadas de Binance API, CoinGecko, Coinbase y Kraken. La persistencia en Redis previene caídas durante congestión o picos masivos de usuarios.",

    // Section 5
    sec5Title: "5. Arquitectura de Seguridad, Bóvedas de Reserva & Anti-DDoS",
    sec5Desc: "Para mitigar vectores de ataque y proteger los fondos de los usuarios, BinaryLiquid implementa una estricta separación estructural entre la Bóveda de Liquidación Automatizada y la Bóveda Fría de Tesorería:",
    activeVaultTitle: "Bóveda de Liquidación Automatizada",
    activeVaultStatus: "Líquido",
    activeVaultDesc: "Reserva de liquidez activa automatizada (175 BCH, 50k PUSD, 50k USDC, 25k USDT) destinada exclusivamente a despachar swaps de forma inmediata.",
    coldVaultTitle: "Bóveda Fría de Tesorería (Cold Treasury)",
    coldVaultStatus: "Offline",
    coldVaultDesc: "Bóveda fría protegida criptográficamente fuera de línea donde se resguardan las reservas del protocolo y comisiones acumuladas.",
    vaultAddressesTitle: "Direcciones Oficiales de la Bóveda Fría (Cold Vault):",
    antiDdosTitle: "Protección Contra Ataques y Conmutación por Fallo",
    antiDdos1: "Zonas de Rate-Limiting Nginx: Límites estrictos para mitigar inundaciones de órdenes spam (8 req/ráfaga en swaps, 25 req/ráfaga en API).",
    antiDdos2: "Pool de 5 Nodos RPC: Conmutación automática por fallo entre dRPC, PublicNode, Ankr, BlockPI y 1RPC.",
    antiDdos3: "Capa de Persistencia Inmutable: Base de datos PostgreSQL con auditoría de transacciones protegida contra pérdida de paquetes.",

    // Section 6
    sec6Title: "6. Billeteras Web3 No Custodiales & Soberanía",
    sec6Desc: "BinaryLiquid no requiere creación de cuentas ni verificación KYC. La interacción ocurre de forma soberana a través de estándares Web3 abiertos:",
    walletPaytacaTitle: "Paytaca (WizardConnect)",
    walletPaytacaBadge: "Recomendado para CashTokens",
    walletPaytacaDesc: "Conexión nativa peer-to-peer para transaccionar PUSD, MUSD y BCH directamente desde dispositivos móviles o extensión de navegador.",
    walletWcTitle: "WalletConnect V2",
    walletWcBadge: "MetaMask, Cashonize, Zapit",
    walletWcDesc: "Soporte multicadena para billeteras EVM (Polygon, Ethereum) y aplicaciones web compatibles con WalletConnect."
  }
};

export default function DocsView({
  lang = 'en',
  platformNetwork,
  setPlatformNetwork,
  onLaunchApp,
  showToast,
  networks
}: DocsViewProps) {
  const [docTab, setDocTab] = useState<'overview' | 'relayer' | 'pools' | 'fees' | 'security' | 'wallets'>('overview');
  const t = docTexts[lang] || docTexts.en;

  const currentNetwork = networks[platformNetwork] || networks.mainnet;

  return (
    <div className="w-full">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-6 sm:pb-8 mb-6 sm:mb-8 text-left">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black uppercase tracking-wider mb-2">
            <BookOpen className="w-3.5 h-3.5" />
            <span>{t.badge}</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tight">
            {t.title}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 font-bold mt-1 text-xs sm:text-sm">
            {t.subtitle}
          </p>
        </div>
        <button 
          onClick={onLaunchApp} 
          className="bg-primary hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md shadow-orange-500/20 hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer self-start md:self-auto shrink-0"
        >
          <span>{t.launchBtn}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 sm:gap-8 text-left">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1 hidden lg:block">
          <div className="sticky top-24 space-y-1.5 border-r border-gray-100 dark:border-gray-800 pr-4">
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3 px-3">
              {t.navHeader}
            </p>
            
            {t.navItems.map((item) => {
              const Icon = item.icon;
              const isActive = docTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setDocTab(item.id as any);
                    const el = document.getElementById(`doc-${item.id}`);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                    isActive
                      ? 'bg-primary/10 text-primary border border-primary/20 shadow-2xs font-black'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}

            {/* Quick Network Status Card in Sidebar */}
            <div className="mt-6 p-3.5 rounded-2xl bg-gray-50 dark:bg-[#151a24] border border-gray-200/60 dark:border-gray-800 text-xs">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">{t.sidebarNetTitle}</div>
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-500 mb-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>{currentNetwork.name}</span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed font-normal">
                {t.sidebarNetDesc}
              </p>
            </div>
          </div>
        </div>

        {/* Main Documentation Body */}
        <div className="lg:col-span-3 space-y-10 sm:space-y-14">
          
          {/* SECTION 1: OVERVIEW & MISSION */}
          <section id="doc-overview" className="scroll-mt-24 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black">
                <Globe className="w-4 h-4" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
                {t.sec1Title}
              </h3>
            </div>

            <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm sm:text-base font-normal">
              {t.sec1Desc} <a href="https://paryonusd.com" target="_blank" rel="noreferrer" className="text-primary font-bold hover:underline">paryonusd.com</a> {lang === 'es' ? 'y' : 'and'} <a href="https://bchblaze.cash" target="_blank" rel="noreferrer" className="text-primary font-bold hover:underline">bchblaze.cash</a>.
            </p>

            {/* 3 Value Pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
              <div className="p-4 rounded-2xl bg-white dark:bg-[#141924] border border-gray-200 dark:border-gray-800 shadow-xs">
                <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center mb-3">
                  <Zap className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-1">{t.pillar1Title}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  {t.pillar1Desc}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-[#141924] border border-gray-200 dark:border-gray-800 shadow-xs">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-3">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-1">{t.pillar2Title}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  {t.pillar2Desc}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-[#141924] border border-gray-200 dark:border-gray-800 shadow-xs">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-3">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-1">{t.pillar3Title}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  {t.pillar3Desc}
                </p>
              </div>
            </div>

            {/* Platform Network Switcher Card */}
            <div className="bg-gray-50 dark:bg-[#141924] border border-gray-200 dark:border-gray-800 rounded-2xl p-4 sm:p-5 border-l-4 border-l-primary space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-primary" /> {t.netCardTitle}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400 font-medium">{t.netActiveMode}</span>
                    <span className={`text-xs font-bold flex items-center gap-1.5 ${
                      platformNetwork === 'mainnet' ? 'text-emerald-500 dark:text-emerald-400' : 'text-amber-500'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${
                        platformNetwork === 'mainnet' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                      }`}></span>
                      {currentNetwork.name}
                    </span>
                  </div>
                </div>

                {/* Selector Tabs: Mainnet vs Testnet */}
                <div className="inline-flex p-1 bg-white dark:bg-[#1b2230] rounded-xl border border-gray-200 dark:border-gray-700 self-start sm:self-auto shadow-xs text-xs">
                  <button
                    onClick={() => {
                      setPlatformNetwork('mainnet');
                      showToast(lang === 'es' ? 'Plataforma en Bitcoin Cash Mainnet (Producción)' : 'Platform set to Bitcoin Cash Mainnet (Production)');
                    }}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      platformNetwork === 'mainnet'
                        ? 'bg-primary text-black shadow-xs font-black'
                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-black"></span>
                    {t.mainnetBtn}
                  </button>
                  <button
                    onClick={() => {
                      setPlatformNetwork('testnet');
                      showToast(lang === 'es' ? 'Plataforma en BCH Chipnet (Testnet)' : 'Platform set to BCH Chipnet (Testnet)');
                    }}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      platformNetwork === 'testnet'
                        ? 'bg-amber-500 text-white shadow-xs font-black'
                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                    {t.testnetBtn}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="bg-white dark:bg-[#1b2230] p-3 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{t.bchLayer}</div>
                    <div className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                      <img src="/BCH.png" className="w-4 h-4 rounded-full object-contain" alt="BCH" />
                      <span>{currentNetwork.bchChain}</span>
                    </div>
                  </div>
                  <a 
                    href={currentNetwork.explorerBch}
                    target="_blank" 
                    rel="noreferrer"
                    className="text-primary hover:underline text-xs font-bold flex items-center gap-1"
                  >
                    <span>{t.explorerLink}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="bg-white dark:bg-[#1b2230] p-3 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{t.evmLayer}</div>
                    <div className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                      <img src="/POL.png" className="w-4 h-4 rounded-full object-contain" alt="Polygon" />
                      <span>{currentNetwork.evmChain}</span>
                    </div>
                  </div>
                  <a 
                    href={currentNetwork.explorerEvm}
                    target="_blank" 
                    rel="noreferrer"
                    className="text-primary hover:underline text-xs font-bold flex items-center gap-1"
                  >
                    <span>{t.explorerLink}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 2: HYBRID RELAYER ARCHITECTURE */}
          <section id="doc-relayer" className="scroll-mt-24 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center font-black">
                <Zap className="w-4 h-4" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
                {t.sec2Title}
              </h3>
            </div>

            <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm sm:text-base font-normal">
              {t.sec2Desc}
            </p>

            {/* 4-Step Pipeline Flow */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-4 rounded-2xl bg-white dark:bg-[#141924] border border-gray-200 dark:border-gray-800 text-left relative">
                <div className="w-6 h-6 rounded-full bg-primary/20 text-primary font-black text-xs flex items-center justify-center mb-2">1</div>
                <h5 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white mb-1">{t.step1Title}</h5>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                  {t.step1Desc}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-[#141924] border border-gray-200 dark:border-gray-800 text-left relative">
                <div className="w-6 h-6 rounded-full bg-primary/20 text-primary font-black text-xs flex items-center justify-center mb-2">2</div>
                <h5 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white mb-1">{t.step2Title}</h5>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                  {t.step2Desc}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-[#141924] border border-gray-200 dark:border-gray-800 text-left relative">
                <div className="w-6 h-6 rounded-full bg-primary/20 text-primary font-black text-xs flex items-center justify-center mb-2">3</div>
                <h5 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white mb-1">{t.step3Title}</h5>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                  {t.step3Desc}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-[#141924] border border-gray-200 dark:border-gray-800 text-left relative">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-500 font-black text-xs flex items-center justify-center mb-2">4</div>
                <h5 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white mb-1">{t.step4Title}</h5>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                  {t.step4Desc}
                </p>
              </div>
            </div>
          </section>

          {/* SECTION 3: LIQUIDITY POOLS & AMM */}
          <section id="doc-pools" className="scroll-mt-24 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center font-black">
                <Droplets className="w-4 h-4" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
                {t.sec3Title}
              </h3>
            </div>

            <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm sm:text-base font-normal">
              {t.sec3Desc}
            </p>

            {/* 8 Canonical Pools Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {[
                { pair: 'PUSD / USDC', bch: 'ParyonUSD (CashTokens)', evm: 'USD Coin (Polygon)', status: 'ACTIVE', apy: '7.1%', tag: lang === 'es' ? 'BLAZE Sponsor Pool Oficial' : 'Official BLAZE Sponsor Pool' },
                { pair: 'BCH / USDC', bch: 'Bitcoin Cash Native', evm: 'USD Coin (Polygon)', status: 'ACTIVE', apy: '6.4%', tag: lang === 'es' ? 'Pool Principal BCH' : 'Core BCH Pool' },
                { pair: 'PUSD / USDT', bch: 'ParyonUSD (CashTokens)', evm: 'Tether USD (Polygon)', status: 'ACTIVE', apy: '6.8%', tag: 'Stablecoin Parity' },
                { pair: 'BCH / PUSD', bch: 'Bitcoin Cash Native', evm: 'ParyonUSD (CashTokens)', status: 'ACTIVE', apy: '8.2%', tag: 'UTXO Native AMM' },
                { pair: 'MUSD / USDC', bch: 'MoriaUSD (CashTokens)', evm: 'USD Coin (Polygon)', status: 'ACTIVE', apy: '5.9%', tag: 'CashTokens Stable' },
                { pair: 'SOL / USDC', bch: 'Solana SPL', evm: 'USD Coin (Polygon)', status: 'ACTIVE', apy: '7.8%', tag: 'Cross-Chain Solana' },
                { pair: 'ETH / USDC', bch: 'Ethereum ERC-20', evm: 'USD Coin (Polygon)', status: 'BOOTSTRAPPING', apy: '8.5%', tag: lang === 'es' ? 'Meta $20,000' : 'Goal $20,000' },
                { pair: 'POL / USDC', bch: 'Polygon Native', evm: 'USD Coin (Polygon)', status: 'ACTIVE', apy: '7.5%', tag: 'Polygon PoS AMM' },
              ].map((p, i) => (
                <div key={i} className="p-4 rounded-2xl bg-white dark:bg-[#141924] border border-gray-200 dark:border-gray-800 shadow-xs flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-sm text-gray-900 dark:text-white">{p.pair}</span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        p.status === 'ACTIVE' 
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30' 
                          : 'bg-amber-500/10 text-amber-500 border border-amber-500/30'
                      }`}>
                        {p.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400">
                      {p.bch} ⟷ {p.evm}
                    </div>
                    <div className="text-[10px] text-primary font-bold mt-1">{p.tag}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-400 font-bold">{t.poolApyLabel}</div>
                    <div className="text-base font-black text-emerald-500">{p.apy}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bootstrapping Auto-Unlock Feature Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-primary/10 border border-primary/20 space-y-2">
              <h4 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                {t.bootstrapTitle}
              </h4>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-normal">
                {t.bootstrapDesc}
              </p>
            </div>
          </section>

          {/* SECTION 4: FEE MODEL & ORACLES */}
          <section id="doc-fees" className="scroll-mt-24 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-black">
                <Activity className="w-4 h-4" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
                {t.sec4Title}
              </h3>
            </div>

            <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm sm:text-base font-normal">
              {t.sec4Desc}
            </p>

            {/* Fee Split Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-5 rounded-2xl bg-white dark:bg-[#141924] border border-gray-200 dark:border-gray-800 shadow-xs border-l-4 border-l-emerald-500">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t.lpShareTitle}</span>
                  <span className="text-lg font-black text-emerald-500">{t.lpSharePct}</span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  {t.lpShareDesc}
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-[#141924] border border-gray-200 dark:border-gray-800 shadow-xs border-l-4 border-l-primary">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t.coldShareTitle}</span>
                  <span className="text-lg font-black text-primary">{t.coldSharePct}</span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  {t.coldShareDesc}
                </p>
              </div>
            </div>

            {/* Example Breakdown */}
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#161c28] border border-gray-200 dark:border-gray-700/80 text-xs">
              <div className="font-bold text-gray-900 dark:text-white mb-1.5 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                <span>{t.mathExampleTitle}</span>
              </div>
              <div className="space-y-1 font-mono text-[11px] text-gray-600 dark:text-gray-300">
                <div>{t.mathSell}</div>
                <div>{t.mathFee}</div>
                <div className="font-bold text-primary">{t.mathNet}</div>
              </div>
            </div>

            {/* Oracle Engine Details */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#141924] border border-gray-200 dark:border-gray-800 space-y-2">
              <h4 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-purple-500" />
                {t.oracleTitle}
              </h4>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                {t.oracleDesc}
              </p>
            </div>
          </section>

          {/* SECTION 5: SECURITY & COLD VAULT SWEPER */}
          <section id="doc-security" className="scroll-mt-24 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-black">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
                {t.sec5Title}
              </h3>
            </div>

            <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm sm:text-base font-normal">
              {t.sec5Desc}
            </p>

            {/* Active Settlement Vault vs Cold Vault */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#141924] border border-gray-200 dark:border-gray-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-orange-500 uppercase tracking-widest">{t.activeVaultTitle}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500">{t.activeVaultStatus}</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  {t.activeVaultDesc}
                </p>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#141924] border border-gray-200 dark:border-gray-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-blue-500 uppercase tracking-widest">{t.coldVaultTitle}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500">{t.coldVaultStatus}</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  {t.coldVaultDesc}
                </p>
              </div>
            </div>

            {/* Sweeper Engine Box */}
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#161c28] border border-gray-200 dark:border-gray-700 space-y-2">
              <div className="font-bold text-xs text-gray-900 dark:text-white flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-primary" />
                <span>{t.vaultAddressesTitle}</span>
              </div>
              <div className="space-y-1.5 font-mono text-[11px]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-2 rounded bg-white dark:bg-[#121620] border border-gray-200/60 dark:border-gray-700/60">
                  <span className="text-gray-500 font-sans font-bold">BCH Mainnet:</span>
                  <span className="text-gray-900 dark:text-gray-200 select-all">bitcoincash:qqgm9rel5xlyhwt3r6n8uq9fxk5zzxrcavaal6aw8v</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-2 rounded bg-white dark:bg-[#121620] border border-gray-200/60 dark:border-gray-700/60">
                  <span className="text-gray-500 font-sans font-bold">Polygon / EVM:</span>
                  <span className="text-gray-900 dark:text-gray-200 select-all">0x31ED1e684BD45a8724Ec11E873bA3F63fcf19f3f</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-2 rounded bg-white dark:bg-[#121620] border border-gray-200/60 dark:border-gray-700/60">
                  <span className="text-gray-500 font-sans font-bold">Solana:</span>
                  <span className="text-gray-900 dark:text-gray-200 select-all">7QRhmj6TeGXbPKDD4otBJ23kTv6F2wydkuvtRQ6RRWfT</span>
                </div>
              </div>
            </div>

            {/* Anti-DDoS Architecture */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#141924] border border-gray-200 dark:border-gray-800 space-y-2">
              <h4 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                <Server className="w-4 h-4 text-emerald-500" />
                {t.antiDdosTitle}
              </h4>
              <ul className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400 list-disc list-inside">
                <li><strong>{t.antiDdos1.split(':')[0]}:</strong>{t.antiDdos1.substring(t.antiDdos1.indexOf(':') + 1)}</li>
                <li><strong>{t.antiDdos2.split(':')[0]}:</strong>{t.antiDdos2.substring(t.antiDdos2.indexOf(':') + 1)}</li>
                <li><strong>{t.antiDdos3.split(':')[0]}:</strong>{t.antiDdos3.substring(t.antiDdos3.indexOf(':') + 1)}</li>
              </ul>
            </div>
          </section>

          {/* SECTION 6: NON-CUSTODIAL WALLETS */}
          <section id="doc-wallets" className="scroll-mt-24 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-black">
                <Wallet className="w-4 h-4" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
                {t.sec6Title}
              </h3>
            </div>

            <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm sm:text-base font-normal">
              {t.sec6Desc}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
              <div className="p-4 rounded-2xl bg-white dark:bg-[#141924] border border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2.5 mb-2">
                  <img src="/wizardconnect-logo.png" className="w-7 h-7 object-contain" alt="Paytaca" />
                  <div>
                    <h5 className="font-bold text-sm text-gray-900 dark:text-white">{t.walletPaytacaTitle}</h5>
                    <p className="text-[10px] text-primary font-bold uppercase tracking-wider">{t.walletPaytacaBadge}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  {t.walletPaytacaDesc}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-[#141924] border border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2.5 mb-2">
                  <img src="https://raw.githubusercontent.com/WalletConnect/walletconnect-assets/master/Icon/Blue%20(Default)/Icon.svg" className="w-6 h-6 object-contain" alt="WC" />
                  <div>
                    <h5 className="font-bold text-sm text-gray-900 dark:text-white">{t.walletWcTitle}</h5>
                    <p className="text-[10px] text-blue-500 font-bold uppercase tracking-wider">{t.walletWcBadge}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  {t.walletWcDesc}
                </p>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
