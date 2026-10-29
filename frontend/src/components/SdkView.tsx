import React, { useState } from 'react';
import { 
  Code2, 
  Copy, 
  Check, 
  ExternalLink, 
  Box, 
  TrendingUp, 
  Terminal 
} from 'lucide-react';

interface SdkViewProps {
  lang?: 'en' | 'es';
}

const texts = {
  en: {
    heroBadge: "DEVELOPER PORTAL & SDK",
    heroTitle: "Integrate BinaryLiquid into your ",
    heroTitleHighlight: "dApp or Website",
    heroSubtitle: "Embed our cross-chain swap with a customizable iFrame Widget or connect your bots and trackers with CoinGecko and CoinMarketCap compliant APIs.",
    widgetTitle: "iFrame Widget Generator",
    widgetBadge: "1-Click Embed",
    widgetSubtitle: "Embed the cross-chain exchange gateway directly into any web project",
    fromToken: "Initial Token (From):",
    toToken: "Target Token (To):",
    themeLabel: "Visual Theme:",
    widthLabel: "Width (px):",
    heightLabel: "Height (px):",
    codeLabel: "HTML Code to embed into your website:",
    copyCode: "Copy Code",
    copied: "Copied!",
    previewBadge: "Live Real-Time Preview:",
    previewTitle: "Preview Widget",
    trackersTitle: "Standard APIs for CoinGecko & CoinMarketCap",
    trackersSubtitle: "Public endpoints for DEX aggregators, volume trackers, DEXScreener, and arbitrage bots",
    cgSpec: "CoinGecko DEX Spec",
    cgDesc: "Endpoints compliant with the official CoinGecko DEX integration specification:",
    cmcSpec: "CoinMarketCap DEX Spec",
    cmcDesc: "Official endpoints structured for CoinMarketCap DEX listing:",
    codeTitle: "Create Swaps with Code (JavaScript / Python / cURL)",
    copyExample: "Copy Example",
    codeSnippet: `// 1. Fetch real-time market quote
const quote = await fetch('https://bsprotocol.xyz/api/quote?fromToken=PUSD&toToken=USDC&amount=50')
  .then(r => r.json());

// 2. Create order with dedicated HD derivation (Zero Collision)
const order = await fetch('https://bsprotocol.xyz/api/swap/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fromToken: 'PUSD',
    toToken: 'USDC',
    fromChain: 'bch_mainnet',
    toChain: 'polygon_mainnet',
    amount: 50,
    recipientAddress: '0xYOUR_POLYGON_WALLET'
  })
}).then(r => r.json());

// 3. Result: Dedicated HD deposit address
console.log('HD Deposit Address:', order.instructions.depositAddress);
console.log('Derivation Path:', order.instructions.derivationPath);`
  },
  es: {
    heroBadge: "PORTAL DE DESARROLLADORES & SDK",
    heroTitle: "Integra BinaryLiquid en tu ",
    heroTitleHighlight: "dApp o Web",
    heroSubtitle: "Incrusta nuestra swap cross-chain con un Widget iFrame personalizable o conecta tus bots y rastreadores con nuestras APIs compatibles con CoinGecko y CoinMarketCap.",
    widgetTitle: "Generador de Widget iFrame",
    widgetBadge: "1-Click Embed",
    widgetSubtitle: "Incrusta la pasarela de intercambio directamente en cualquier proyecto web",
    fromToken: "Token Inicial (From):",
    toToken: "Token Destino (To):",
    themeLabel: "Tema Visual:",
    widthLabel: "Ancho (px):",
    heightLabel: "Alto (px):",
    codeLabel: "Código HTML para pegar en tu web:",
    copyCode: "Copiar Código",
    copied: "¡Copiado!",
    previewBadge: "Vista Previa en Tiempo Real:",
    previewTitle: "Vista Previa Widget",
    trackersTitle: "APIs Estándar para CoinGecko & CoinMarketCap",
    trackersSubtitle: "Endpoints públicos para indexación en agregadores de volumen, DEXScreener y bots de arbitraje",
    cgSpec: "CoinGecko DEX Spec",
    cgDesc: "Endpoints compatibles con la especificación oficial de integración DEX de CoinGecko:",
    cmcSpec: "CoinMarketCap DEX Spec",
    cmcDesc: "Endpoints oficiales estructurados para listado DEX en CoinMarketCap:",
    codeTitle: "Crear Swaps con Código (JavaScript / Python / cURL)",
    copyExample: "Copiar Ejemplo",
    codeSnippet: `// 1. Consultar cotización en tiempo real
const quote = await fetch('https://bsprotocol.xyz/api/quote?fromToken=PUSD&toToken=USDC&amount=50')
  .then(r => r.json());

// 2. Crear orden con derivación HD aislada (Zero Collision)
const order = await fetch('https://bsprotocol.xyz/api/swap/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fromToken: 'PUSD',
    toToken: 'USDC',
    fromChain: 'bch_mainnet',
    toChain: 'polygon_mainnet',
    amount: 50,
    recipientAddress: '0xTU_WALLET_POLYGON'
  })
}).then(r => r.json());

// 3. Resultado: Dirección HD única exclusiva de la orden
console.log('Dirección HD de Depósito:', order.instructions.depositAddress);
console.log('Ruta de Derivación:', order.instructions.derivationPath);`
  }
};

export const SdkView: React.FC<SdkViewProps> = ({ lang = 'en' }) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [embedFrom, setEmbedFrom] = useState('PUSD');
  const [embedTo, setEmbedTo] = useState('USDC');
  const [embedTheme, setEmbedTheme] = useState<'dark' | 'light'>('dark');
  const [embedWidth, setEmbedWidth] = useState('420');
  const [embedHeight, setEmbedHeight] = useState('640');

  const t = texts[lang] || texts.en;

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://bsprotocol.xyz';
  const embedUrl = `${origin}/embed?from=${embedFrom}&to=${embedTo}&theme=${embedTheme}`;

  const iframeSnippet = `<!-- BinaryLiquid Cross-Chain Stablecoin Bridge Widget -->
<iframe
  src="${embedUrl}"
  width="${embedWidth}"
  height="${embedHeight}"
  style="border: none; border-radius: 24px; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);"
  title="BinaryLiquid Bridge Swap"
  allow="clipboard-write">
</iframe>`;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 space-y-12">
      {/* HERO SECTION */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold tracking-wide">
          <Code2 className="w-4 h-4" />
          <span>{t.heroBadge}</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-gray-950 dark:text-white tracking-tight">
          {t.heroTitle}<span className="text-primary">{t.heroTitleHighlight}</span>
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base leading-relaxed">
          {t.heroSubtitle}
        </p>
      </div>

      {/* SECTION 1: INTERACTIVE IFRAME GENERATOR */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#121622] border border-gray-200 dark:border-gray-800 shadow-xl space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
              <Box className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                {t.widgetTitle}
                <span className="text-xs bg-emerald-500/10 text-emerald-500 font-bold px-2 py-0.5 rounded-full">
                  {t.widgetBadge}
                </span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t.widgetSubtitle}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* CONFIGURATION CONTROLS */}
          <div className="lg:col-span-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1.5">
                  {t.fromToken}
                </label>
                <select
                  value={embedFrom}
                  onChange={(e) => setEmbedFrom(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-[#161c28] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-bold text-xs focus:outline-none focus:border-primary"
                >
                  <option value="PUSD">PUSD (BCH CashTokens)</option>
                  <option value="BCH">BCH (Bitcoin Cash Native)</option>
                  <option value="USDC">USDC (Polygon PoS)</option>
                  <option value="MUSD">MUSD (CashTokens)</option>
                  <option value="LIFT">Paytaca LIFT (CashToken)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1.5">
                  {t.toToken}
                </label>
                <select
                  value={embedTo}
                  onChange={(e) => setEmbedTo(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-[#161c28] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-bold text-xs focus:outline-none focus:border-primary"
                >
                  <option value="USDC">USDC (Polygon PoS)</option>
                  <option value="PUSD">PUSD (BCH CashTokens)</option>
                  <option value="USDT">USDT (Polygon PoS)</option>
                  <option value="POL">POL (Polygon Native)</option>
                  <option value="BCH">BCH Native</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1.5">
                  {t.themeLabel}
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEmbedTheme('dark')}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      embedTheme === 'dark' 
                        ? 'bg-gray-900 text-white border-primary shadow-xs' 
                        : 'bg-gray-100 dark:bg-[#161c28] text-gray-500 border-transparent'
                    }`}
                  >
                    🌙 Dark
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmbedTheme('light')}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      embedTheme === 'light' 
                        ? 'bg-primary text-white border-primary shadow-xs' 
                        : 'bg-gray-100 dark:bg-[#161c28] text-gray-500 border-transparent'
                    }`}
                  >
                    ☀️ Light
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1.5">
                  {t.widthLabel}
                </label>
                <input
                  type="text"
                  value={embedWidth}
                  onChange={(e) => setEmbedWidth(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#161c28] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-mono text-xs focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1.5">
                  {t.heightLabel}
                </label>
                <input
                  type="text"
                  value={embedHeight}
                  onChange={(e) => setEmbedHeight(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#161c28] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-mono text-xs focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* CODE SNIPPET */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  {t.codeLabel}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(iframeSnippet, 'iframe')}
                  className="flex items-center gap-1.5 text-xs text-primary font-bold hover:underline cursor-pointer"
                >
                  {copiedSection === 'iframe' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-500">{t.copied}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{t.copyCode}</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="p-4 rounded-2xl bg-gray-950 text-gray-200 font-mono text-xs overflow-x-auto border border-gray-800 leading-relaxed">
                <code>{iframeSnippet}</code>
              </pre>
            </div>
          </div>

          {/* LIVE IFRAME PREVIEW */}
          <div className="lg:col-span-6 flex flex-col items-center">
            <span className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {t.previewBadge}
            </span>
            <div className="w-full max-w-[420px] rounded-3xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-2xl bg-gray-900">
              <iframe
                src={embedUrl}
                width="100%"
                height="580"
                style={{ border: 'none' }}
                title={t.previewTitle}
              />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: TRACKERS & INDEXERS (CoinGecko / CoinMarketCap) */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white">
              {t.trackersTitle}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t.trackersSubtitle}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* COINGECKO CARD */}
          <div className="p-6 rounded-3xl bg-white dark:bg-[#121622] border border-gray-200 dark:border-gray-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <span className="text-lg">🦎</span>
                <h3 className="font-bold text-gray-900 dark:text-white text-base">
                  {t.cgSpec}
                </h3>
              </div>
              <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-500 font-bold px-2 py-0.5 rounded-full">
                HTTP REST • 200 OK
              </span>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-400">
              {t.cgDesc}
            </p>

            <div className="space-y-2 text-xs font-mono">
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#161c28] border border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div className="overflow-hidden truncate pr-2">
                  <span className="text-emerald-500 font-bold">GET</span>{' '}
                  <span className="text-gray-700 dark:text-gray-300">/api/coingecko/pairs</span>
                </div>
                <a
                  href="/api/coingecko/pairs"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:text-orange-500 shrink-0"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#161c28] border border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div className="overflow-hidden truncate pr-2">
                  <span className="text-emerald-500 font-bold">GET</span>{' '}
                  <span className="text-gray-700 dark:text-gray-300">/api/coingecko/tickers</span>
                </div>
                <a
                  href="/api/coingecko/tickers"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:text-orange-500 shrink-0"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#161c28] border border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div className="overflow-hidden truncate pr-2">
                  <span className="text-emerald-500 font-bold">GET</span>{' '}
                  <span className="text-gray-700 dark:text-gray-300">/api/coingecko/orderbook</span>
                </div>
                <a
                  href="/api/coingecko/orderbook?ticker_id=PUSD_USDC"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:text-orange-500 shrink-0"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#161c28] border border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div className="overflow-hidden truncate pr-2">
                  <span className="text-emerald-500 font-bold">GET</span>{' '}
                  <span className="text-gray-700 dark:text-gray-300">/api/coingecko/historical_trades</span>
                </div>
                <a
                  href="/api/coingecko/historical_trades?ticker_id=PUSD_USDC"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:text-orange-500 shrink-0"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>

          {/* COINMARKETCAP CARD */}
          <div className="p-6 rounded-3xl bg-white dark:bg-[#121622] border border-gray-200 dark:border-gray-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <span className="text-lg">Ⓜ️</span>
                <h3 className="font-bold text-gray-900 dark:text-white text-base">
                  {t.cmcSpec}
                </h3>
              </div>
              <span className="text-[10px] font-mono bg-blue-500/10 text-blue-500 font-bold px-2 py-0.5 rounded-full">
                CMC DEX Data
              </span>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-400">
              {t.cmcDesc}
            </p>

            <div className="space-y-2 text-xs font-mono">
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#161c28] border border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div className="overflow-hidden truncate pr-2">
                  <span className="text-blue-500 font-bold">GET</span>{' '}
                  <span className="text-gray-700 dark:text-gray-300">/api/cmc/summary</span>
                </div>
                <a
                  href="/api/cmc/summary"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:text-orange-500 shrink-0"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#161c28] border border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div className="overflow-hidden truncate pr-2">
                  <span className="text-blue-500 font-bold">GET</span>{' '}
                  <span className="text-gray-700 dark:text-gray-300">/api/cmc/ticker</span>
                </div>
                <a
                  href="/api/cmc/ticker"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:text-orange-500 shrink-0"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#161c28] border border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div className="overflow-hidden truncate pr-2">
                  <span className="text-blue-500 font-bold">GET</span>{' '}
                  <span className="text-gray-700 dark:text-gray-300">/api/cmc/orderbook</span>
                </div>
                <a
                  href="/api/cmc/orderbook?pair=PUSD_USDC"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:text-orange-500 shrink-0"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#161c28] border border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div className="overflow-hidden truncate pr-2">
                  <span className="text-blue-500 font-bold">GET</span>{' '}
                  <span className="text-gray-700 dark:text-gray-300">/api/cmc/trades</span>
                </div>
                <a
                  href="/api/cmc/trades?pair=PUSD_USDC"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:text-orange-500 shrink-0"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: JAVASCRIPT / TYPESCRIPT QUICKSTART */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#121622] border border-gray-200 dark:border-gray-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Terminal className="w-5 h-5 text-primary" />
            <h3 className="font-black text-gray-900 dark:text-white text-base">
              {t.codeTitle}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => copyToClipboard(t.codeSnippet, 'code')}
            className="flex items-center gap-1.5 text-xs text-primary font-bold hover:underline cursor-pointer"
          >
            {copiedSection === 'code' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-500">{t.copied}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>{t.copyExample}</span>
              </>
            )}
          </button>
        </div>

        <pre className="p-4 rounded-2xl bg-gray-950 text-gray-200 font-mono text-xs overflow-x-auto border border-gray-800 leading-relaxed">
          <code>{t.codeSnippet}</code>
        </pre>
      </div>
    </div>
  );
};

export default SdkView;
