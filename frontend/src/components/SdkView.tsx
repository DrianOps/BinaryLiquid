import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  ExternalLink
} from 'lucide-react';

interface SdkViewProps {
  lang?: 'en' | 'es';
  onNavigateToIdentity?: () => void;
  onBackToSwap?: () => void;
  showToast?: (msg: string, type?: 'success' | 'error') => void;
}

type DocPageId =
  | 'welcome'
  | 'quickstart'
  | 'userlink-overview'
  | 'userlink-resolver'
  | 'userlink-wallets'
  | 'userlink-api'
  | 'userlink-python'
  | 'userlink-nostr'
  | 'userlink-exchanges'
  | 'swap-widget'
  | 'swap-api'
  | 'coingecko-api'
  | 'cmc-api';

interface DocItem {
  id: DocPageId;
  category: { en: string; es: string };
  navLabel: { en: string; es: string };
  title: { en: string; es: string };
  subtitle: { en: string; es: string };
}

const DOC_ITEMS: DocItem[] = [
  // 1. Getting Started
  {
    id: 'welcome',
    category: { en: 'Getting Started', es: 'Introducción' },
    navLabel: { en: 'Overview', es: 'Visión general' },
    title: { en: 'SDK & API Overview', es: 'Visión general de SDK & API' },
    subtitle: {
      en: 'Non-custodial cross-chain swap engine, human-readable UserLink resolution, and market indexers.',
      es: 'Motor de swaps sin custodia, resolución de nombres UserLink y endpoints estándar para indexadores DEX.'
    }
  },
  {
    id: 'quickstart',
    category: { en: 'Getting Started', es: 'Introducción' },
    navLabel: { en: 'Quickstart', es: 'Inicio rápido' },
    title: { en: '1-Minute Quickstart', es: 'Inicio rápido en 1 minuto' },
    subtitle: {
      en: 'Integrate Bitcoin Cash handle lookups and cross-chain payments using standard HTTP and BIP-21 URIs.',
      es: 'Integra resolución de nombres Bitcoin Cash y pagos BIP-21 con llamadas HTTP estándar sin dependencias.'
    }
  },

  // 2. UserLink Protocol
  {
    id: 'userlink-overview',
    category: { en: 'UserLink Protocol', es: 'Protocolo UserLink' },
    navLabel: { en: 'NIP-05 Standard', es: 'Estándar NIP-05' },
    title: { en: 'Protocol Standards & NIP-05', es: 'Estándares UserLink & NIP-05' },
    subtitle: {
      en: 'Human-readable handles (@user@bliquid.xyz) backed by BCH ECDSA + Nostr Schnorr dual cryptographic proofs.',
      es: 'Nombres legibles (@usuario) respaldados por doble firma criptográfica ECDSA (BCH) y Schnorr (Nostr).'
    }
  },
  {
    id: 'userlink-resolver',
    category: { en: 'UserLink Protocol', es: 'Protocolo UserLink' },
    navLabel: { en: 'Live Resolver', es: 'Probador en vivo' },
    title: { en: 'Live Handle Resolver Playground', es: 'Probador interactivo de resolución' },
    subtitle: {
      en: 'Query the production NIP-05 endpoint directly to inspect BCH address mappings, pubkeys, and relays.',
      es: 'Consulta en vivo el endpoint NIP-05 para inspeccionar direcciones BCH resueltas, claves públicas y relays.'
    }
  },
  {
    id: 'userlink-wallets',
    category: { en: 'UserLink Protocol', es: 'Protocolo UserLink' },
    navLabel: { en: 'TypeScript / JS', es: 'TypeScript / JS' },
    title: { en: 'TypeScript & Web3 Wallet Client', es: 'Cliente TypeScript / JS para wallets' },
    subtitle: {
      en: 'Zero-dependency helper for Paytaca, Cashonize, Zapit, and web dApps to resolve handles into BCH addresses.',
      es: 'Función ligera sin dependencias para integrar resolución @handle en billeteras web y móviles Bitcoin Cash.'
    }
  },
  {
    id: 'userlink-api',
    category: { en: 'UserLink Protocol', es: 'Protocolo UserLink' },
    navLabel: { en: 'REST API & cURL', es: 'API REST & cURL' },
    title: { en: 'REST API & cURL Reference', es: 'Referencia API REST & cURL' },
    subtitle: {
      en: 'Standard GET /.well-known/nostr.json endpoint with CORS enabled for backends and microservices.',
      es: 'Endpoint público GET /.well-known/nostr.json con soporte CORS para microservicios y pasarelas.'
    }
  },
  {
    id: 'userlink-python',
    category: { en: 'UserLink Protocol', es: 'Protocolo UserLink' },
    navLabel: { en: 'Python (Bots)', es: 'Python (Bots)' },
    title: { en: 'Python Integration (Bots & Daemons)', es: 'Integración en Python (Telegram / Discord)' },
    subtitle: {
      en: 'Resolve @user handles on the fly in tip bots, automated settlement daemons, or withdrawal scripts.',
      es: 'Resuelve usuarios @handle al instante en bots de propinas o servicios de pago automatizados.'
    }
  },
  {
    id: 'userlink-nostr',
    category: { en: 'UserLink Protocol', es: 'Protocolo UserLink' },
    navLabel: { en: 'Nostr P2P Relays', es: 'Relays Nostr P2P' },
    title: { en: 'Serverless P2P Nostr Resolution', es: 'Resolución descentralizada en relays Nostr' },
    subtitle: {
      en: 'Query parameterized replaceable Kind 30078 events directly from public WebSocket relays without DNS.',
      es: 'Consulta eventos Kind 30078 directamente desde relays públicos Nostr vía WebSocket sin servidores centrales.'
    }
  },
  {
    id: 'userlink-exchanges',
    category: { en: 'UserLink Protocol', es: 'Protocolo UserLink' },
    navLabel: { en: 'Exchanges', es: 'Exchanges' },
    title: { en: 'Exchange Integration Guide', es: 'Guía de integración para exchanges' },
    subtitle: {
      en: 'Let users withdraw Bitcoin Cash to @handle identifiers with address verification before broadcast.',
      es: 'Habilita retiros a identificadores @usuario eliminando errores manuales al copiar direcciones.'
    }
  },

  // 3. Cross-Chain Swap SDK
  {
    id: 'swap-widget',
    category: { en: 'Cross-Chain SDK', es: 'SDK Cross-Chain' },
    navLabel: { en: 'iFrame Widget', es: 'Widget iFrame' },
    title: { en: 'Embeddable Cross-Chain Swap Widget', es: 'Generador de Widget iFrame' },
    subtitle: {
      en: 'Configure and embed BinaryLiquid Swap directly inside any CashToken or DeFi web portal.',
      es: 'Configura e incrusta la pasarela no custodial directamente en cualquier portal CashToken o Web3.'
    }
  },
  {
    id: 'swap-api',
    category: { en: 'Cross-Chain SDK', es: 'SDK Cross-Chain' },
    navLabel: { en: 'Swap REST API', es: 'API de Swaps' },
    title: { en: 'Programmatic Covenants & Swap API', es: 'API de Swaps Programáticos' },
    subtitle: {
      en: 'Fetch oracle quotes, instantiate deterministic P2SH32 escrows, and poll live swap status via REST.',
      es: 'Consulta cotizaciones del oráculo, instancia escrows P2SH32 y monitorea órdenes mediante HTTP.'
    }
  },

  // 4. Market Indexers & Oracles
  {
    id: 'coingecko-api',
    category: { en: 'Market Indexers', es: 'Indexadores DEX' },
    navLabel: { en: 'CoinGecko Spec', es: 'CoinGecko Spec' },
    title: { en: 'CoinGecko DEX Endpoints', es: 'Endpoints estándar CoinGecko DEX' },
    subtitle: {
      en: 'Standard /api/coingecko/* market data routes for aggregators, volume trackers, and orderbook feeds.',
      es: 'Rutas estándar /api/coingecko/* compatibles con agregadores de liquidez, precios y volumen 24h.'
    }
  },
  {
    id: 'cmc-api',
    category: { en: 'Market Indexers', es: 'Indexadores DEX' },
    navLabel: { en: 'CoinMarketCap Spec', es: 'CoinMarketCap Spec' },
    title: { en: 'CoinMarketCap DEX Endpoints', es: 'Endpoints estándar CoinMarketCap DEX' },
    subtitle: {
      en: 'Standard /api/cmc/* routes exposing canonical pool summaries, tickers, depth, and settled trades.',
      es: 'Rutas /api/cmc/* que exponen resumen de pares, precios en vivo, profundidad y trades liquidados.'
    }
  }
];

interface CodeBlockProps {
  title: string;
  code: string;
  copyId: string;
  copiedSection: string | null;
  onCopy: (text: string, id: string) => void;
  copyLabel: string;
  copiedLabel: string;
}

function CodeBlock({
  title,
  code,
  copyId,
  copiedSection,
  onCopy,
  copyLabel,
  copiedLabel
}: CodeBlockProps) {
  const isCopied = copiedSection === copyId;
  return (
    <div className="bg-surface-2/50 border border-line rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-line text-[11px] font-mono text-ink-3">
        <span>{title}</span>
        <button
          type="button"
          onClick={() => onCopy(code, copyId)}
          className="inline-flex items-center gap-1 font-sans font-medium text-ink-2 hover:text-ink transition-colors cursor-pointer"
        >
          {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{isCopied ? copiedLabel : copyLabel}</span>
        </button>
      </div>
      <pre className="p-4 font-mono text-[11.5px] text-ink overflow-x-auto leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

const TS_WALLET_CODE = `// UserLink Resolution Standard for BCH Wallets
export async function resolveUserLink(handle: string): Promise<string> {
  const clean = handle.replace(/^@/, '').trim();
  const [user, domain = 'bliquid.xyz'] = clean.split('@');

  // Query NIP-05 endpoint with bch_addresses mapping
  const res = await fetch(\`https://\${domain}/.well-known/nostr.json?name=\${encodeURIComponent(user)}\`);
  if (!res.ok) throw new Error(\`Failed to resolve UserLink: HTTP \${res.status}\`);

  const data = await res.json();
  const address = data.bch_addresses?.[user];
  if (!address) throw new Error(\`Handle @\${user} is not linked to any Bitcoin Cash address\`);

  return address; // => bitcoincash:qr5zz6098wax242qrz3k7dctsx2kd3vszvywzsefgn
}

// Launch Universal BIP-21 Payment:
const recipientAddress = await resolveUserLink('@myuser');
const normalized = recipientAddress.includes(':') ? recipientAddress : \`bitcoincash:\${recipientAddress}\`;
window.location.href = \`\${normalized}?amount=0.025&label=@myuser\`;`;

const CURL_SPEC_CODE = `# 1. Execute NIP-05 lookup:
curl -s "https://bliquid.xyz/.well-known/nostr.json?name=myuser"

# 2. HTTP 200 OK Response:
{
  "names": {
    "myuser": "de69276e520917aa8227ba4ab4460edd64b5dc263e6f475b29f33fad3af81990"
  },
  "bch_addresses": {
    "myuser": "bitcoincash:qr5zz6098wax242qrz3k7dctsx2kd3vszvywzsefgn"
  },
  "relays": {
    "de69276e520917aa8227ba4ab4460edd64b5dc263e6f475b29f33fad3af81990": [
      "wss://relay.primal.net",
      "wss://relay.snort.social",
      "wss://nostr.oxtr.dev",
      "wss://offchain.pub"
    ]
  }
}`;

const PYTHON_CODE = `import requests

def resolve_userlink(handle: str) -> str:
    """Resolve @handle into an on-chain Bitcoin Cash address via NIP-05."""
    clean = handle.lstrip('@').strip()
    parts = clean.split('@')
    user = parts[0]
    domain = parts[1] if len(parts) > 1 else 'bliquid.xyz'

    url = f"https://{domain}/.well-known/nostr.json"
    res = requests.get(url, params={"name": user}, timeout=4)
    res.raise_for_status()

    bch_address = res.json().get("bch_addresses", {}).get(user)
    if not bch_address:
        raise ValueError(f"Handle @{user} is not linked to any BCH address")
    return bch_address

if __name__ == "__main__":
    print(resolve_userlink("@myuser"))
    # => bitcoincash:qr5zz6098wax242qrz3k7dctsx2kd3vszvywzsefgn`;

const NOSTR_P2P_CODE = `import { SimplePool, verifyEvent } from 'nostr-tools';

const pool = new SimplePool();
const PUBLIC_RELAYS = [
  'wss://relay.primal.net',
  'wss://relay.snort.social',
  'wss://nostr.oxtr.dev',
  'wss://offchain.pub'
];

export async function resolveDecentralized(nostrHexPubkey: string) {
  const event = await pool.get(PUBLIC_RELAYS, {
    kinds: [30078],
    '#d': ['bch-identity-binding'],
    authors: [nostrHexPubkey]
  });

  if (!event || !verifyEvent(event)) {
    throw new Error('Valid UserLink record not found on Nostr relays');
  }

  const passport = JSON.parse(event.content);
  const bchSig = event.tags.find((t) => t[0] === 'bch_sig')?.[1] || '';
  const sigScheme = event.tags.find((t) => t[0] === 'sig_scheme')?.[1] || 'bitcoin-signed-message';
  return { passport, bchSig, sigScheme };
}`;

const SWAP_API_CODE = `// 1. Fetch real-time oracle quote (includes 0.30% flat protocol fee)
const quoteRes = await fetch(
  'https://bliquid.xyz/api/quote?fromToken=PUSD&toToken=USDT&amount=50&network=testnet'
).then((r) => r.json());

// 2. Instantiate deterministic P2SH32 escrow covenant (senderAddress derives 24h refund script)
const order = await fetch('https://bliquid.xyz/api/swap/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fromToken: 'PUSD',
    toToken: 'USDT',
    fromChain: 'bch_chipnet',
    toChain: 'amoy_testnet',
    amount: 50,
    senderAddress: 'bchtest:qq...',
    recipientAddress: '0xYOUR_POLYGON_WALLET'
  })
}).then((r) => r.json());

console.log('P2SH32 Escrow:', order.instructions.depositAddress);
console.log('Order ID:', order.swap.id);

// 3. Poll real-time cross-chain settlement status
const status = await fetch(\`https://bliquid.xyz/api/swap/\${order.swap.id}\`)
  .then((r) => r.json());`;

export const SdkView: React.FC<SdkViewProps> = ({
  lang = 'en',
  onNavigateToIdentity,
  onBackToSwap,
  showToast
}) => {
  const isEs = lang === 'es';
  const [activeDocId, setActiveDocId] = useState<DocPageId>('welcome');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Widget States
  const [embedFrom, setEmbedFrom] = useState('PUSD');
  const [embedTo, setEmbedTo] = useState('USDT');
  const [embedTheme, setEmbedTheme] = useState<'dark' | 'light'>('dark');

  // UserLink Playground States
  const [testHandle, setTestHandle] = useState('myuser');
  const [isResolving, setIsResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [resolveResult, setResolveResult] = useState<{
    handle: string;
    bchAddress: string;
    pubkey: string;
    relays: string[];
    latencyMs: number;
  } | null>({
    handle: 'myuser@bliquid.xyz',
    bchAddress: 'bitcoincash:qr5zz6098wax242qrz3k7dctsx2kd3vszvywzsefgn',
    pubkey: 'de69276e520917aa8227ba4ab4460edd64b5dc263e6f475b29f33fad3af81990',
    relays: ['wss://relay.primal.net', 'wss://relay.snort.social', 'wss://nostr.oxtr.dev', 'wss://offchain.pub'],
    latencyMs: 38
  });

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://bliquid.xyz';
  const embedUrl = `${origin}/embed?from=${embedFrom}&to=${embedTo}&theme=${embedTheme}&lang=${lang}`;

  const iframeSnippet = `<!-- BinaryLiquid Cross-Chain Swap Widget -->
<iframe
  src="${embedUrl}"
  width="420"
  height="640"
  style="border: none; border-radius: 24px;"
  title="BinaryLiquid Bridge Swap"
  allow="clipboard-write">
</iframe>`;

  const copyLabel = isEs ? 'Copiar' : 'Copy';
  const copiedLabel = isEs ? 'Copiado' : 'Copied';

  const copyToClipboard = (text: string, id: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).catch(() => {});
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
    } catch {}
    setCopiedSection(id);
    showToast?.(isEs ? 'Copiado al portapapeles' : 'Copied to clipboard', 'success');
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleResolveTester = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsResolving(true);
    setResolveError(null);
    const start = performance.now();
    const clean = testHandle.replace(/^@/, '').trim().toLowerCase();
    const [user, domain = 'bliquid.xyz'] = clean.split('@');
    const targetUser = (user || '').replace(/[^a-z0-9_-]/g, '');
    const targetDomain = (domain || 'bliquid.xyz').trim();

    if (!targetUser || !targetDomain.includes('.')) {
      setResolveResult(null);
      setResolveError(isEs ? 'Handle o dominio NIP-05 inválido.' : 'Invalid NIP-05 handle or domain.');
      setIsResolving(false);
      return;
    }

    try {
      const url = `https://${targetDomain}/.well-known/nostr.json?name=${encodeURIComponent(targetUser)}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      const elapsed = Math.round(performance.now() - start);

      const resolvedPk = data?.names?.[targetUser] || '';
      const resolvedAddr = data?.bch_addresses?.[targetUser] || '';
      if (!resolvedPk || !resolvedAddr) {
        setResolveResult(null);
        setResolveError(
          isEs
            ? `El identificador "${targetUser}@${targetDomain}" no fue encontrado en nostr.json.`
            : `Handle "${targetUser}@${targetDomain}" not found in nostr.json.`
        );
        return;
      }

      const resolvedRelays = (resolvedPk && data?.relays?.[resolvedPk]) || [
        'wss://relay.primal.net',
        'wss://relay.snort.social',
        'wss://nostr.oxtr.dev',
        'wss://offchain.pub'
      ];

      setResolveResult({
        handle: `${targetUser}@${targetDomain}`,
        bchAddress: resolvedAddr,
        pubkey: resolvedPk,
        relays: resolvedRelays,
        latencyMs: elapsed
      });
    } catch (err: any) {
      setResolveResult(null);
      setResolveError(
        isEs
          ? `No se pudo consultar ${targetDomain}/.well-known/nostr.json (${err?.message || 'Error de red o CORS'}).`
          : `Failed querying ${targetDomain}/.well-known/nostr.json (${err?.message || 'Network or CORS error'}).`
      );
    } finally {
      setIsResolving(false);
    }
  };

  const categories = useMemo(() => {
    const map = new Map<string, DocItem[]>();
    DOC_ITEMS.forEach((item) => {
      const cat = isEs ? item.category.es : item.category.en;
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    });
    return Array.from(map.entries());
  }, [isEs]);

  const currentDocIndex = DOC_ITEMS.findIndex((d) => d.id === activeDocId);
  const currentDoc = DOC_ITEMS[currentDocIndex] || DOC_ITEMS[0];
  const prevDoc = currentDocIndex > 0 ? DOC_ITEMS[currentDocIndex - 1] : null;
  const nextDoc = currentDocIndex < DOC_ITEMS.length - 1 ? DOC_ITEMS[currentDocIndex + 1] : null;

  const selectDoc = (id: DocPageId) => {
    setActiveDocId(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToIdentity = () => {
    if (onNavigateToIdentity) {
      onNavigateToIdentity();
    } else if (typeof window !== 'undefined') {
      window.location.href = '/identity';
    }
  };

  return (
    <div className="w-full xl:grid xl:grid-cols-[190px_minmax(0,820px)_190px] xl:justify-center xl:gap-8 items-start">
      {/* BORDERLESS MARGIN OUTLINE (Wide desktop only — matching Whitepaper) */}
      <aside className="hidden xl:block sticky top-24 pt-10">
        <nav aria-label="SDK sections" className="border-l border-line pl-3 space-y-4">
          {categories.map(([catName, items]) => (
            <div key={catName} className="space-y-1">
              <div className="text-[11px] font-semibold text-ink-2 pb-0.5">
                {catName}
              </div>
              {items.map((item) => {
                const active = activeDocId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectDoc(item.id)}
                    className={`block w-full text-left py-0.5 text-xs transition-colors cursor-pointer ${
                      active
                        ? 'text-ink font-semibold'
                        : 'text-ink-3 hover:text-ink-2 font-normal'
                    }`}
                  >
                    {isEs ? item.navLabel.es : item.navLabel.en}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      {/* CENTERED DOCUMENT COLUMN */}
      <div className="w-full max-w-[820px] mx-auto space-y-3">
        {/* SUBTLE CONTROLS ABOVE THE PAPER */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          {onBackToSwap ? (
            <button
              type="button"
              onClick={onBackToSwap}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-3 hover:text-ink transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{isEs ? 'Volver al Swap' : 'Back to Swap'}</span>
            </button>
          ) : (
            <span className="text-xs font-medium text-ink-3">SDK &amp; API</span>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={navigateToIdentity}
              className="ui-btn-secondary ui-btn-sm"
            >
              <span>{isEs ? 'Identidad @handle' : '@handle Identity'}</span>
            </button>

            <a
              href="https://github.com/DrianOps/BinaryLiquid"
              target="_blank"
              rel="noreferrer"
              className="ui-btn-secondary ui-btn-sm inline-flex items-center gap-1"
            >
              <span>GitHub</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* SINGLE CONTINUOUS SDK & API SHEET */}
        <article className="bg-surface border border-line rounded-xl shadow-soft px-6 py-8 sm:px-14 sm:py-12 space-y-6">
          {/* DOCUMENT HEADER */}
          <header className="pb-6 border-b border-line space-y-2.5">
            <div className="text-[11px] font-mono text-ink-3">
              SDK &amp; API · {isEs ? currentDoc.category.es : currentDoc.category.en}
            </div>

            <h1 className="text-2xl sm:text-[28px] font-semibold tracking-tight text-ink leading-tight">
              {isEs ? currentDoc.title.es : currentDoc.title.en}
            </h1>

            <p className="text-sm text-ink-2 leading-relaxed">
              {isEs ? currentDoc.subtitle.es : currentDoc.subtitle.en}
            </p>
          </header>

          {/* COMPACT MOBILE / TABLET JUMP BAR */}
          <nav
            aria-label="SDK index"
            className="xl:hidden pb-3 border-b border-line flex items-center gap-1.5 overflow-x-auto no-scrollbar"
          >
            {DOC_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => selectDoc(item.id)}
                className={`text-[11px] whitespace-nowrap px-2 py-1 rounded-md transition-colors cursor-pointer ${
                  activeDocId === item.id
                    ? 'bg-surface-2 text-ink font-semibold'
                    : 'text-ink-3 hover:text-ink'
                }`}
              >
                {isEs ? item.navLabel.es : item.navLabel.en}
              </button>
            ))}
          </nav>

          {/* =============================================================== */}
          {/* DOC 1: WELCOME                                                  */}
          {/* =============================================================== */}
          {activeDocId === 'welcome' && (
            <div className="space-y-6">
              <div className="pl-3 border-l-2 border-line space-y-1">
                <div className="text-xs font-semibold text-ink">
                  {isEs ? 'Cero custodia y cero llaves privadas centrales' : 'Zero custody and zero central private keys'}
                </div>
                <p className="text-xs text-ink-2 leading-relaxed">
                  {isEs
                    ? 'Los depósitos se bloquean en covenants P2SH32 con reembolso autónomo tras 24 horas (tx.time >= expiryTimestamp) y resolución NIP-05 verificable.'
                    : 'All swap funds lock directly into P2SH32 covenants with unilateral 24-hour refund timelocks and verifiable NIP-05 resolution.'}
                </p>
              </div>

              <div className="divide-y divide-line border-y border-line">
                {[
                  {
                    id: 'userlink-overview' as DocPageId,
                    title: isEs ? 'Protocolo UserLink (@handle)' : 'UserLink Protocol (@handle)',
                    desc: isEs
                      ? 'Pagos por identificador humano con resolución NIP-05 y firmas ECDSA + Schnorr.'
                      : 'Human-readable BCH payments backed by NIP-05 lookups and dual BCH + Nostr proofs.'
                  },
                  {
                    id: 'swap-widget' as DocPageId,
                    title: isEs ? 'Widget iFrame cross-chain (/embed)' : 'Cross-Chain iFrame Widget (/embed)',
                    desc: isEs
                      ? 'Incrusta el widget de swaps en cualquier web con par inicial y tema configurables.'
                      : 'Embed the non-custodial swap flow into any site with configurable pairs and theme.'
                  },
                  {
                    id: 'swap-api' as DocPageId,
                    title: isEs ? 'API REST de Covenants (/api/swap/*)' : 'Covenant Swap REST API (/api/swap/*)',
                    desc: isEs
                      ? 'Consulta cotizaciones del oráculo e instancia escrows P2SH32 programáticamente.'
                      : 'Fetch oracle quotes and instantiate per-order P2SH32 escrows via REST.'
                  },
                  {
                    id: 'coingecko-api' as DocPageId,
                    title: isEs ? 'Endpoints DEX CoinGecko & CoinMarketCap' : 'CoinGecko & CoinMarketCap DEX Specs',
                    desc: isEs
                      ? 'Rutas estándar para indexación de pares, profundidad y volumen 24h.'
                      : 'Spec-compliant market ticker, orderbook depth, and trade history routes.'
                  }
                ].map((mod) => (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => selectDoc(mod.id)}
                    className="w-full py-3.5 flex items-center justify-between gap-4 text-left hover:opacity-80 transition-opacity cursor-pointer group"
                  >
                    <div>
                      <div className="text-sm font-semibold text-ink group-hover:text-primary transition-colors">
                        {mod.title}
                      </div>
                      <p className="text-xs text-ink-2 mt-0.5">{mod.desc}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-ink-3 shrink-0 group-hover:text-ink transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* DOC 2: QUICKSTART                                               */}
          {/* =============================================================== */}
          {activeDocId === 'quickstart' && (
            <div className="space-y-6">
              <div className="space-y-2.5">
                <h2 className="text-sm font-semibold text-ink">
                  {isEs ? '1. Resolver un identificador @handle a dirección BCH' : '1. Resolve a @handle to a Bitcoin Cash address'}
                </h2>
                <CodeBlock
                  title="bash (cURL)"
                  code={`curl -s "https://bliquid.xyz/.well-known/nostr.json?name=myuser" | jq`}
                  copyId="qs-curl"
                  copiedSection={copiedSection}
                  onCopy={copyToClipboard}
                  copyLabel={copyLabel}
                  copiedLabel={copiedLabel}
                />
              </div>

              <div className="space-y-2.5">
                <h2 className="text-sm font-semibold text-ink">
                  {isEs ? '2. Lanzar enlace de pago BIP-21 en la billetera instalada' : '2. Launch universal BIP-21 payment URI'}
                </h2>
                <CodeBlock
                  title="bip21.ts"
                  code={`// Universal BIP-21 Deep Link supported by Paytaca, Cashonize & Zapit:
window.location.href = "bitcoincash:qr5zz6098wax242qrz3k7dctsx2kd3vszvywzsefgn?amount=0.015&label=@myuser";`}
                  copyId="qs-bip21"
                  copiedSection={copiedSection}
                  onCopy={copyToClipboard}
                  copyLabel={copyLabel}
                  copiedLabel={copiedLabel}
                />
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* DOC 3: USERLINK OVERVIEW                                        */}
          {/* =============================================================== */}
          {activeDocId === 'userlink-overview' && (
            <div className="space-y-6">
              <div className="pl-3 border-l-2 border-line space-y-1">
                <div className="text-xs font-semibold text-ink">
                  {isEs ? 'Doble firma criptográfica verificable' : 'Tamper-proof dual cryptographic binding'}
                </div>
                <p className="text-xs text-ink-2 leading-relaxed">
                  {isEs
                    ? 'Cada usuario enlaza su dirección BCH mediante firma ECDSA/BSM de su billetera Bitcoin Cash y firma Schnorr de su clave Nostr. Ningún servidor intermediario puede alterar el mapeo sin invalidar la prueba.'
                    : 'Each binding attaches both a Bitcoin Cash BSM signature and a Nostr Schnorr event signature. No third party can alter the target address without failing verification.'}
                </p>
              </div>

              <div className="py-4 border-y border-line grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                <div className="space-y-1">
                  <div className="font-semibold text-ink">NIP-05 HTTP Lookup</div>
                  <p className="text-ink-2 leading-relaxed">
                    {isEs
                      ? 'Endpoint JSON estándar en /.well-known/nostr.json con soporte CORS universal para wallets y exchanges.'
                      : 'Standard HTTPS JSON mapping at /.well-known/nostr.json with universal CORS headers.'}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="font-semibold text-ink">Nostr Kind 30078 (d-tag: bch-identity-binding)</div>
                  <p className="text-ink-2 leading-relaxed">
                    {isEs
                      ? 'Evento reemplazable parametrizado en relays públicos globales (Primal, Snort, Oxtr, Offchain) para resolución P2P sin DNS.'
                      : 'Parameterized replaceable event stored across public WebSocket relays (Primal, Snort, Oxtr, Offchain) for serverless lookup.'}
                  </p>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => selectDoc('userlink-resolver')}
                  className="ui-btn-primary ui-btn-sm inline-flex items-center gap-1.5"
                >
                  <span>{isEs ? 'Probar en el Playground' : 'Open Live Playground'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* DOC 4: USERLINK RESOLVER PLAYGROUND                             */}
          {/* =============================================================== */}
          {activeDocId === 'userlink-resolver' && (
            <div className="space-y-5">
              <form onSubmit={handleResolveTester} className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={testHandle}
                  onChange={(e) => setTestHandle(e.target.value)}
                  placeholder="myuser o myuser@bliquid.xyz"
                  className="ui-input flex-1 font-mono text-xs"
                />
                <button
                  type="submit"
                  disabled={isResolving}
                  className="ui-btn-primary ui-btn-sm shrink-0"
                >
                  {isResolving
                    ? (isEs ? 'Resolviendo...' : 'Resolving...')
                    : (isEs ? 'Resolver usuario' : 'Resolve handle')}
                </button>
              </form>

              {resolveError ? (
                <div className="border border-rose-500/30 bg-rose-500/5 rounded-lg p-3.5 font-mono text-xs text-rose-500">
                  {resolveError}
                </div>
              ) : resolveResult ? (
                <div className="divide-y divide-line border-y border-line text-xs">
                  <div className="py-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-ink-3">{isEs ? 'Identificador' : 'Handle'}:</span>
                      <span className="font-mono font-semibold text-ink">@{resolveResult.handle}</span>
                    </div>
                    <span className="font-mono text-[11px] text-emerald-500 tabular-nums">
                      NIP-05 · {resolveResult.latencyMs}ms
                    </span>
                  </div>

                  <div className="py-3 space-y-1">
                    <div className="text-ink-3 text-[11px]">
                      {isEs ? 'Dirección BCH resuelta' : 'Resolved BCH address'}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-ink font-medium select-all break-all">
                        {resolveResult.bchAddress}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(resolveResult.bchAddress, 'play-addr')}
                        className="text-ink-3 hover:text-ink shrink-0 cursor-pointer"
                        title={copyLabel}
                      >
                        {copiedSection === 'play-addr' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="py-3 space-y-1">
                    <div className="text-ink-3 text-[11px]">
                      {isEs ? 'Clave pública Nostr (Hex)' : 'Nostr Hex Pubkey'}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-ink-2 text-[11px] select-all break-all">
                        {resolveResult.pubkey}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(resolveResult.pubkey, 'play-pk')}
                        className="text-ink-3 hover:text-ink shrink-0 cursor-pointer"
                        title={copyLabel}
                      >
                        {copiedSection === 'play-pk' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="py-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-[11px] text-ink-3 font-mono">
                      Relays: {resolveResult.relays.slice(0, 3).map((r) => r.replace('wss://', '')).join(' · ')}
                    </div>
                    <a
                      href={`${resolveResult.bchAddress.includes(':') ? resolveResult.bchAddress : `bitcoincash:${resolveResult.bchAddress}`}?amount=0.01&label=@${resolveResult.handle}`}
                      className="text-xs font-medium text-ink-2 hover:text-ink underline underline-offset-4"
                    >
                      {isEs ? 'Abrir en billetera BIP-21 ↗' : 'Open BIP-21 wallet URI ↗'}
                    </a>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* =============================================================== */}
          {/* DOC 5: TYPESCRIPT / JS SDK                                      */}
          {/* =============================================================== */}
          {activeDocId === 'userlink-wallets' && (
            <CodeBlock
              title="resolveUserLink.ts"
              code={TS_WALLET_CODE}
              copyId="ts-code"
              copiedSection={copiedSection}
              onCopy={copyToClipboard}
              copyLabel={copyLabel}
              copiedLabel={copiedLabel}
            />
          )}

          {/* =============================================================== */}
          {/* DOC 6: REST API & CURL                                          */}
          {/* =============================================================== */}
          {activeDocId === 'userlink-api' && (
            <div className="space-y-4">
              <div className="py-3 border-y border-line flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="font-mono">
                  <span className="text-emerald-500 font-semibold mr-2">GET</span>
                  <span className="text-ink font-medium">/.well-known/nostr.json?name=&#123;username&#125;</span>
                </div>
                <span className="text-ink-3 text-[11px]">CORS: *</span>
              </div>

              <CodeBlock
                title="cURL & JSON Response"
                code={CURL_SPEC_CODE}
                copyId="curl-spec"
                copiedSection={copiedSection}
                onCopy={copyToClipboard}
                copyLabel={copyLabel}
                copiedLabel={copiedLabel}
              />
            </div>
          )}

          {/* =============================================================== */}
          {/* DOC 7: PYTHON                                                   */}
          {/* =============================================================== */}
          {activeDocId === 'userlink-python' && (
            <CodeBlock
              title="userlink_resolver.py"
              code={PYTHON_CODE}
              copyId="py-code"
              copiedSection={copiedSection}
              onCopy={copyToClipboard}
              copyLabel={copyLabel}
              copiedLabel={copiedLabel}
            />
          )}

          {/* =============================================================== */}
          {/* DOC 8: NOSTR P2P                                                */}
          {/* =============================================================== */}
          {activeDocId === 'userlink-nostr' && (
            <CodeBlock
              title="resolveDecentralized.ts"
              code={NOSTR_P2P_CODE}
              copyId="nostr-code"
              copiedSection={copiedSection}
              onCopy={copyToClipboard}
              copyLabel={copyLabel}
              copiedLabel={copiedLabel}
            />
          )}

          {/* =============================================================== */}
          {/* DOC 9: EXCHANGE INTEGRATION                                     */}
          {/* =============================================================== */}
          {activeDocId === 'userlink-exchanges' && (
            <div className="py-4 border-y border-line grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="space-y-1">
                <div className="font-mono text-[11px] text-ink-3">01</div>
                <div className="font-semibold text-ink">{isEs ? 'Input del usuario' : 'User handle input'}</div>
                <p className="text-ink-2 leading-relaxed">
                  {isEs
                    ? 'El cliente ingresa @myuser en el formulario de retiro BCH en lugar de una dirección CashAddr.'
                    : 'Client enters @myuser in the Bitcoin Cash withdrawal field instead of a raw address.'}
                </p>
              </div>
              <div className="space-y-1">
                <div className="font-mono text-[11px] text-ink-3">02</div>
                <div className="font-semibold text-ink">{isEs ? 'Consulta NIP-05' : 'Backend NIP-05 query'}</div>
                <p className="text-ink-2 leading-relaxed">
                  {isEs
                    ? 'El backend consulta /.well-known/nostr.json?name=... y muestra al usuario la dirección on-chain para confirmar.'
                    : 'Your backend queries /.well-known/nostr.json and previews the verified BCH address before broadcast.'}
                </p>
              </div>
              <div className="space-y-1">
                <div className="font-mono text-[11px] text-ink-3">03</div>
                <div className="font-semibold text-ink">{isEs ? 'Broadcast seguro' : 'On-chain broadcast'}</div>
                <p className="text-ink-2 leading-relaxed">
                  {isEs
                    ? 'Transmites la transacción hacia bch_addresses[user] eliminando riesgo de errores al copiar.'
                    : 'Broadcast the BCH transaction to bch_addresses[user] with zero copy-paste typos.'}
                </p>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* DOC 10: SWAP WIDGET                                             */}
          {/* =============================================================== */}
          {activeDocId === 'swap-widget' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-ink-2 block mb-1">
                    {isEs ? 'Token origen' : 'From token'}
                  </label>
                  <select
                    value={embedFrom}
                    onChange={(e) => setEmbedFrom(e.target.value)}
                    className="ui-input text-xs"
                  >
                    <option value="PUSD">PUSD (CashTokens)</option>
                    <option value="BCH">BCH (Native)</option>
                    <option value="USDT">USDT (Polygon)</option>
                    <option value="USDC">USDC (Polygon)</option>
                    <option value="LIFT">LIFT (CashTokens)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-ink-2 block mb-1">
                    {isEs ? 'Token destino' : 'To token'}
                  </label>
                  <select
                    value={embedTo}
                    onChange={(e) => setEmbedTo(e.target.value)}
                    className="ui-input text-xs"
                  >
                    <option value="USDT">USDT (Polygon)</option>
                    <option value="USDC">USDC (Polygon)</option>
                    <option value="PUSD">PUSD (CashTokens)</option>
                    <option value="BCH">BCH (Native)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-ink-2 block mb-1">
                    {isEs ? 'Tema' : 'Theme'}
                  </label>
                  <select
                    value={embedTheme}
                    onChange={(e) => setEmbedTheme(e.target.value as 'dark' | 'light')}
                    className="ui-input text-xs"
                  >
                    <option value="dark">{isEs ? 'Oscuro' : 'Dark'}</option>
                    <option value="light">{isEs ? 'Claro' : 'Light'}</option>
                  </select>
                </div>
              </div>

              <CodeBlock
                title="embed.html"
                code={iframeSnippet}
                copyId="widget-code"
                copiedSection={copiedSection}
                onCopy={copyToClipboard}
                copyLabel={copyLabel}
                copiedLabel={copiedLabel}
              />

              <div className="space-y-2 pt-2">
                <div className="text-xs font-medium text-ink-3 text-center">
                  {isEs ? 'Vista previa en vivo (/embed)' : 'Live embed preview (/embed)'}
                </div>
                <div className="w-full max-w-[420px] mx-auto rounded-panel overflow-hidden border border-line bg-canvas shadow-soft">
                  <iframe
                    src={embedUrl}
                    width="100%"
                    height="580"
                    style={{ border: 'none' }}
                    title="BinaryLiquid Swap Preview"
                  />
                </div>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* DOC 11: SWAP API                                                */}
          {/* =============================================================== */}
          {activeDocId === 'swap-api' && (
            <div className="space-y-4">
              <div className="divide-y divide-line border-y border-line font-mono text-xs">
                <div className="py-2.5 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-emerald-500 font-semibold mr-2">GET</span>
                    <span className="text-ink">/api/quote</span>
                  </div>
                  <span className="text-ink-3 font-sans text-[11px]">
                    {isEs ? 'Cotización y comisión 0.30%' : 'Quote & 0.30% fee'}
                  </span>
                </div>
                <div className="py-2.5 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-ink font-semibold mr-2">POST</span>
                    <span className="text-ink">/api/swap/create</span>
                  </div>
                  <span className="text-ink-3 font-sans text-[11px]">
                    {isEs ? 'Instanciar escrow P2SH32' : 'Instantiate P2SH32 escrow'}
                  </span>
                </div>
                <div className="py-2.5 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-emerald-500 font-semibold mr-2">GET</span>
                    <span className="text-ink">/api/swap/:id</span>
                  </div>
                  <span className="text-ink-3 font-sans text-[11px]">
                    {isEs ? 'Estado en vivo de liquidación' : 'Live settlement status'}
                  </span>
                </div>
              </div>

              <CodeBlock
                title="swapClient.js"
                code={SWAP_API_CODE}
                copyId="swap-api-code"
                copiedSection={copiedSection}
                onCopy={copyToClipboard}
                copyLabel={copyLabel}
                copiedLabel={copiedLabel}
              />
            </div>
          )}

          {/* =============================================================== */}
          {/* DOC 12: COINGECKO API                                           */}
          {/* =============================================================== */}
          {activeDocId === 'coingecko-api' && (
            <div className="divide-y divide-line border-y border-line">
              {[
                {
                  path: '/api/coingecko/pairs',
                  desc: isEs ? 'Lista de pares activos (PUSD_USDT, PUSD_USDC, BCH_USDT)' : 'Active pool pairs list (PUSD_USDT, PUSD_USDC, BCH_USDT)'
                },
                {
                  path: '/api/coingecko/tickers',
                  desc: isEs ? 'Último precio, bid/ask, volumen 24h y liquidez USD' : 'Latest prices, bid/ask, 24h volume and USD liquidity'
                },
                {
                  path: '/api/coingecko/orderbook?ticker_id=PUSD_USDT',
                  desc: isEs ? 'Profundidad de bids y asks por par' : 'Simulated liquidity depth bids and asks per ticker'
                },
                {
                  path: '/api/coingecko/historical_trades?ticker_id=PUSD_USDT',
                  desc: isEs ? 'Historial de swaps recientes liquidados on-chain' : 'Historical settled cross-chain trades'
                }
              ].map((ep) => (
                <div key={ep.path} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-mono text-xs font-medium text-ink break-all">
                      <span className="text-emerald-500 mr-2">GET</span>
                      {ep.path}
                    </div>
                    <p className="text-xs text-ink-3 mt-0.5">{ep.desc}</p>
                  </div>
                  <a
                    href={ep.path}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-ink-3 hover:text-ink shrink-0"
                  >
                    <span>JSON</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ))}
            </div>
          )}

          {/* =============================================================== */}
          {/* DOC 13: COINMARKETCAP API                                       */}
          {/* =============================================================== */}
          {activeDocId === 'cmc-api' && (
            <div className="divide-y divide-line border-y border-line">
              {[
                {
                  path: '/api/cmc/summary',
                  desc: isEs ? 'Resumen consolidado de pares, liquidez y volúmenes 24h' : 'Consolidated summary of pairs, prices, and 24h volume'
                },
                {
                  path: '/api/cmc/ticker',
                  desc: isEs ? 'Cotizaciones por par en formato DEX CoinMarketCap' : 'Real-time market tickers following CMC DEX spec'
                },
                {
                  path: '/api/cmc/orderbook?pair=PUSD_USDT',
                  desc: isEs ? 'Profundidad de liquidez P2SH32 para el par indicado' : 'Orderbook depth snapshot for the specified pair'
                },
                {
                  path: '/api/cmc/trades?pair=PUSD_USDT',
                  desc: isEs ? 'Trades recientes liquidados on-chain' : 'Recent settled cross-chain trades'
                }
              ].map((ep) => (
                <div key={ep.path} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-mono text-xs font-medium text-ink break-all">
                      <span className="text-emerald-500 mr-2">GET</span>
                      {ep.path}
                    </div>
                    <p className="text-xs text-ink-3 mt-0.5">{ep.desc}</p>
                  </div>
                  <a
                    href={ep.path}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-ink-3 hover:text-ink shrink-0"
                  >
                    <span>JSON</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ))}
            </div>
          )}

          {/* MINIMAL HAIRLINE BOTTOM PAGINATION */}
          <footer className="pt-6 border-t border-line flex items-center justify-between gap-4 text-xs">
            {prevDoc ? (
              <button
                type="button"
                onClick={() => selectDoc(prevDoc.id)}
                className="text-left text-ink-2 hover:text-ink transition-colors cursor-pointer group"
              >
                <span className="text-[11px] text-ink-3 block">
                  ← {isEs ? 'Anterior' : 'Previous'}
                </span>
                <span className="font-medium text-ink group-hover:underline underline-offset-4">
                  {isEs ? prevDoc.navLabel.es : prevDoc.navLabel.en}
                </span>
              </button>
            ) : (
              <div />
            )}

            {nextDoc && (
              <button
                type="button"
                onClick={() => selectDoc(nextDoc.id)}
                className="text-right text-ink-2 hover:text-ink transition-colors cursor-pointer group ml-auto"
              >
                <span className="text-[11px] text-ink-3 block">
                  {isEs ? 'Siguiente' : 'Next'} →
                </span>
                <span className="font-medium text-ink group-hover:underline underline-offset-4">
                  {isEs ? nextDoc.navLabel.es : nextDoc.navLabel.en}
                </span>
              </button>
            )}
          </footer>
        </article>
      </div>

      {/* SYMMETRIC RIGHT SPACER ON WIDE SCREENS SO SHEET STAYS DEAD CENTER */}
      <div className="hidden xl:block" aria-hidden="true" />
    </div>
  );
};

export default SdkView;
