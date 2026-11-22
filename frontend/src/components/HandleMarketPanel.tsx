import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  RefreshCw,
  Trash2
} from 'lucide-react';
import { convertCashAddressNetwork, formatAddress } from '../utils/bchAddress';

interface HandleQuote {
  handle: string;
  cleanHandle: string;
  length: number;
  network: 'mainnet' | 'testnet';
  bchPriceUsd: number;
  nostrIdentityCostUsd: number;
  tier: {
    key: string;
    label: string;
    usd: number;
    sats: number;
    bch: number;
  };
  allTiers: Array<{
    key: string;
    minLen: number;
    maxLen: number;
    usd: number;
    label: string;
    sats: number;
    bch: number;
  }>;
  nftCommitmentHex: string;
  commitReveal: {
    commitSaltHex: string;
    commitHashHex: string;
    minRevealTime: number;
    recipientAddress: string;
  };
  covenant: {
    contractName: string;
    opcodes: number;
    treasuryAddress: string;
    covenantBaseAddress: string;
    covenantTokenAddress: string;
    lockingBytecodeHex: string;
  };
}

interface MarketListing {
  id: string;
  handle: string;
  cleanHandle: string;
  network: 'mainnet' | 'testnet';
  status: string;
  sellerAddress: string;
  sellerTokenAddress: string;
  priceSats: number;
  priceBch: number;
  priceUsdEst: number;
  protocolFeeBps: number;
  feeSats: number;
  sellerNetSats: number;
  nftCommitmentHex: string;
  expiryTimestamp: number;
  covenant: {
    contractName: string;
    opcodes: number;
    covenantBaseAddress: string;
    covenantTokenAddress: string;
  };
  createdAt: number;
}

interface HandleMarketPanelProps {
  isEs: boolean;
  network: 'mainnet' | 'testnet';
  connectedBchAddress?: string;
  activeHandle?: string;
  nostrPubkeyHex?: string;
  onConnectBch: () => void;
}

export const HandleMarketPanel: React.FC<HandleMarketPanelProps> = ({
  isEs,
  network,
  connectedBchAddress,
  activeHandle,
  nostrPubkeyHex,
  onConnectBch
}) => {
  const isMainnet = network === 'mainnet';
  const normalizedWalletAddr = connectedBchAddress
    ? convertCashAddressNetwork(connectedBchAddress, !isMainnet, false)
    : '';

  const [quoteHandle, setQuoteHandle] = useState('bch');
  const [quoteData, setQuoteData] = useState<HandleQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const [sellHandle, setSellHandle] = useState(
    (activeHandle || 'cash').replace(/^@+/, '').split('@')[0] || 'cash'
  );
  const [sellAddress, setSellAddress] = useState(normalizedWalletAddr);
  const [sellPriceBch, setSellPriceBch] = useState('0.01');
  const [creatingListing, setCreatingListing] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdListing, setCreatedListing] = useState<MarketListing | null>(null);

  const [listings, setListings] = useState<MarketListing[]>([]);
  const [loadingListings, setLoadingListings] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (normalizedWalletAddr) {
      setSellAddress(normalizedWalletAddr);
    }
  }, [normalizedWalletAddr]);

  const copyText = (val: string, key: string) => {
    try {
      navigator.clipboard?.writeText(val).catch(() => {});
    } catch {}
    setCopiedId(key);
    setTimeout(() => setCopiedId((prev) => (prev === key ? null : prev)), 1800);
  };

  const fetchQuote = useCallback(
    async (targetHandle: string) => {
      const clean = targetHandle.replace(/^@+/, '').trim();
      if (!clean) return;
      setQuoteLoading(true);
      setQuoteError(null);
      try {
        const params = new URLSearchParams({ handle: clean, network });
        if (normalizedWalletAddr) {
          params.set('recipientAddress', normalizedWalletAddr);
        }
        const res = await fetch(`/api/identity/handle-pricing?${params.toString()}`);
        const data = await res.json();
        if (!res.ok || !data?.success) {
          throw new Error(data?.error || 'Pricing quote failed');
        }
        setQuoteData(data.quote);
      } catch (err: any) {
        setQuoteError(err?.message || 'Error');
      } finally {
        setQuoteLoading(false);
      }
    },
    [network, normalizedWalletAddr]
  );

  const fetchListings = useCallback(async () => {
    setLoadingListings(true);
    try {
      const res = await fetch(`/api/identity/market/listings?network=${network}`);
      const data = await res.json();
      if (res.ok && data?.success) {
        setListings(Array.isArray(data.listings) ? data.listings : []);
      }
    } catch {} finally {
      setLoadingListings(false);
    }
  }, [network]);

  useEffect(() => {
    void fetchQuote(quoteHandle);
    void fetchListings();
  }, [network, fetchListings]);

  const handleQuoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void fetchQuote(quoteHandle);
  };

  const handleCreateCovenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreatedListing(null);
    setCreatingListing(true);
    try {
      const res = await fetch('/api/identity/market/covenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handle: sellHandle,
          sellerAddress: sellAddress.trim(),
          priceBch: Number(sellPriceBch),
          protocolFeeBps: 200,
          expiryHours: 168,
          network,
          nostrPubkeyHex: nostrPubkeyHex || ''
        })
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to create P2SH-32 covenant');
      }
      setCreatedListing(data.listing);
      void fetchListings();
    } catch (err: any) {
      setCreateError(err?.message || 'Could not create marketplace covenant');
    } finally {
      setCreatingListing(false);
    }
  };

  const handleRemoveListing = async (listing: MarketListing) => {
    try {
      const res = await fetch(
        `/api/identity/market/listings/${encodeURIComponent(listing.id)}?sellerAddress=${encodeURIComponent(
          listing.sellerAddress
        )}`,
        { method: 'DELETE' }
      );
      if (res.ok) {
        setListings((prev) => prev.filter((item) => item.id !== listing.id));
        if (createdListing?.id === listing.id) setCreatedListing(null);
      }
    } catch {}
  };

  return (
    <div className="max-w-[960px] mx-auto space-y-6">
      {/* SHEET 1: BCH-NATIVE ON-CHAIN HANDLE PRICING & MINT COVENANT */}
      <section className="bg-surface border border-line rounded-card shadow-soft p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-5 border-b border-line">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-ink">
              {isEs ? 'Handles Transferibles como CashToken NFT' : 'On-Chain Handle NFTs & Anti-Spam Pricing'}
            </h2>
            <p className="text-sm text-ink-2 mt-1 max-w-2xl">
              {isEs
                ? 'La identidad base Nostr (Kind 30078) siempre es $0. Si deseas un handle global único y vendible como NFT en Bitcoin Cash, el covenant cobra una tarifa única accesible pensada para BCH.'
                : 'Base Nostr handles (Kind 30078) remain free forever. Optional tradeable CashToken NFT handles use Bitcoin Cash micro-pricing with zero annual renewals.'}
            </p>
          </div>
          <div className="text-xs font-mono text-ink-3 shrink-0">
            {isMainnet ? 'Mainnet · P2SH-32' : 'Chipnet · P2SH-32'}
          </div>
        </div>

        {/* Handle lookup & live covenant derivation */}
        <form onSubmit={handleQuoteSubmit} className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3 font-mono text-sm">@</span>
            <input
              type="text"
              value={quoteHandle}
              onChange={(e) => setQuoteHandle(e.target.value.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase())}
              placeholder="bch, cash, maria, tienda..."
              maxLength={32}
              className="ui-input bg-surface-2 pl-8 font-mono text-sm"
            />
          </div>
          <button type="submit" disabled={quoteLoading} className="ui-btn-primary sm:px-6 shrink-0">
            {quoteLoading
              ? isEs
                ? 'Calculando...'
                : 'Deriving...'
              : isEs
              ? 'Calcular tarifa'
              : 'Calculate rate'}
          </button>
        </form>

        {quoteError && (
          <div className="text-xs text-rose-500 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{quoteError}</span>
          </div>
        )}

        {quoteData && (
          <div className="space-y-6">
            {/* Compact horizontal hairline pricing table (no nested box cards) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 border-y border-line divide-y sm:divide-y-0 sm:divide-x divide-line">
              {quoteData.allTiers.map((tier) => {
                const active = tier.key === quoteData.tier.key;
                const rangeLabel =
                  tier.minLen === tier.maxLen
                    ? `${tier.minLen} ${isEs ? 'letras' : 'chars'}`
                    : tier.maxLen === 3
                    ? `1–3 ${isEs ? 'letras' : 'chars'}`
                    : `6+ ${isEs ? 'letras' : 'chars'}`;
                return (
                  <div
                    key={tier.key}
                    className={`py-3.5 px-3 sm:px-4 transition-colors ${
                      active ? 'bg-surface-2/80' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs text-ink-3">
                      <span>{rangeLabel}</span>
                      {active && (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" title="Selected tier" />
                      )}
                    </div>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="text-lg font-semibold text-ink tabular-nums">
                        ${tier.usd < 1 ? tier.usd.toFixed(2) : tier.usd}
                      </span>
                      <span className="text-[11px] text-ink-3">{isEs ? 'pago único' : 'one-time'}</span>
                    </div>
                    <div className="text-[11px] font-mono text-ink-2 mt-0.5 tabular-nums">
                      {tier.bch} BCH
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Visual BCMR NFT Preview + Technical Covenant Spec (side-by-side cleanly) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-7 divide-y divide-line text-xs">
                <div className="py-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-ink-3">{isEs ? 'Cotización seleccionada' : 'Selected handle & fee'}</span>
                  <span className="font-mono font-semibold text-ink tabular-nums">
                    {quoteData.handle} · ${quoteData.tier.usd < 1 ? quoteData.tier.usd.toFixed(2) : quoteData.tier.usd} USD ({quoteData.tier.bch} BCH)
                  </span>
                </div>

                <div className="py-3 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-ink-3 shrink-0">
                    {isEs ? 'Covenant P2SH-32 Mint' : 'P2SH-32 Mint Covenant'}
                  </span>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-ink truncate max-w-[220px] sm:max-w-[300px]">
                      {quoteData.covenant.covenantTokenAddress}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyText(quoteData.covenant.covenantTokenAddress, 'mint-addr')}
                      className="text-ink-3 hover:text-ink cursor-pointer shrink-0"
                      title="Copy P2SH-32 address"
                    >
                      {copiedId === 'mint-addr' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="py-3 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-ink-3 shrink-0">NFT Commitment (hex)</span>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-ink-2">{quoteData.nftCommitmentHex}</span>
                    <button
                      type="button"
                      onClick={() => copyText(quoteData.nftCommitmentHex, 'mint-comm')}
                      className="text-ink-3 hover:text-ink cursor-pointer shrink-0"
                      title="Copy commitment"
                    >
                      {copiedId === 'mint-comm' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="py-3 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-ink-3 shrink-0">Commit-Reveal SHA256d</span>
                  <span className="font-mono text-ink-2 truncate max-w-[220px] sm:max-w-[300px]">
                    {quoteData.commitReveal.commitHashHex}
                  </span>
                </div>

                <div className="py-3 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-ink-3 shrink-0">BCMR v2 Metadata JSON</span>
                  <a
                    href={`/api/identity/bcmr/${encodeURIComponent(quoteData.cleanHandle)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-mono text-ink-2 hover:text-ink underline underline-offset-4"
                  >
                    <span>/api/identity/bcmr/{quoteData.cleanHandle}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                </div>
              </div>

              {/* Right: Live CashTokens BCMR Visual NFT Card */}
              <div className="lg:col-span-5 space-y-2">
                <div className="rounded-panel overflow-hidden border border-line bg-[#0D1017] shadow-soft">
                  <img
                    src={`/api/identity/nft-card/${encodeURIComponent(quoteData.cleanHandle)}`}
                    alt={`${quoteData.handle} CashTokens BCMR NFT`}
                    className="w-full h-auto block"
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-ink-3 px-0.5">
                  <span>{isEs ? 'Vista previa BCMR (@ID)' : 'BCMR (@ID) wallet artwork'}</span>
                  <a
                    href={`/api/identity/nft-card/${encodeURIComponent(quoteData.cleanHandle)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono hover:text-ink inline-flex items-center gap-1"
                  >
                    <span>SVG</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* SHEET 2: P2P NON-CUSTODIAL HANDLE MARKETPLACE (2-COLUMN LEDGER + COMPOSER) */}
      <section className="bg-surface border border-line rounded-card shadow-soft overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-line">
          {/* LEFT: Active Orderbook (7 cols) */}
          <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-ink">
                    {isEs ? 'Órdenes Activas en Mercado P2SH-32' : 'Open P2SH-32 Handle Orderbook'}
                  </h3>
                  <p className="text-xs text-ink-2 mt-0.5">
                    {isEs
                      ? 'Compra directa on-chain al vendedor en la misma tx del NFT.'
                      : 'Atomic BCH-for-NFT settlement directly with the listing owner.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void fetchListings()}
                  className="ui-btn-ghost ui-btn-sm shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingListings ? 'animate-spin' : ''}`} />
                  <span>{isEs ? 'Actualizar' : 'Refresh'}</span>
                </button>
              </div>

              {listings.length === 0 ? (
                <div className="py-12 border-t border-line text-center space-y-1">
                  <div className="text-sm font-medium text-ink">
                    {isEs ? 'Sin handles en venta en esta red' : 'No open listings on this network'}
                  </div>
                  <p className="text-xs text-ink-3">
                    {isEs
                      ? 'Publica un handle desde el formulario lateral para crear el primer covenant P2SH-32.'
                      : 'Create a P2SH-32 covenant on the right to list a Handle CashToken NFT.'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-line border-t border-line">
                  {listings.map((item) => (
                    <div key={item.id} className="py-3.5 flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-ink text-sm">{item.handle}</span>
                          <span className="text-ink-3 font-mono text-[11px]">
                            {formatAddress(item.sellerAddress)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-ink-3">
                          <span className="truncate max-w-[230px] sm:max-w-[300px]">
                            {item.covenant.covenantTokenAddress}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyText(item.covenant.covenantTokenAddress, item.id)}
                            className="text-ink-3 hover:text-ink cursor-pointer shrink-0"
                          >
                            {copiedId === item.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right tabular-nums">
                          <div className="font-mono font-semibold text-ink">{item.priceBch} BCH</div>
                          <div className="text-[11px] text-ink-3">~${item.priceUsdEst} USD</div>
                        </div>
                        {normalizedWalletAddr &&
                          item.sellerAddress.toLowerCase() === normalizedWalletAddr.toLowerCase() && (
                            <button
                              type="button"
                              onClick={() => void handleRemoveListing(item)}
                              className="p-1.5 rounded-control text-ink-3 hover:text-rose-500 cursor-pointer"
                              title={isEs ? 'Retirar listado' : 'Remove listing'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-line text-[11px] text-ink-3 flex flex-wrap items-center justify-between gap-2">
              <span>UserLinkHandleMarket.cash · P2SH-32</span>
              <span>{isEs ? 'Royalty 2% · Timelock 7 días' : '2% protocol fee · 7d reclaim'}</span>
            </div>
          </div>

          {/* RIGHT: Create Sale Covenant Form (5 cols) */}
          <div className="lg:col-span-5 p-6 sm:p-8 bg-surface-2/40 space-y-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-ink">
                {isEs ? 'Vender un Handle NFT' : 'List Handle NFT'}
              </h3>
              {!normalizedWalletAddr && (
                <button
                  type="button"
                  onClick={onConnectBch}
                  className="text-xs font-medium text-ink-2 hover:text-ink underline cursor-pointer"
                >
                  {isEs ? 'Usar mi wallet' : 'Connect wallet'}
                </button>
              )}
            </div>

            <form onSubmit={handleCreateCovenant} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-medium text-ink-2">
                  {isEs ? 'Nombre del handle' : 'Handle name'}
                </label>
                <input
                  type="text"
                  value={sellHandle}
                  onChange={(e) => setSellHandle(e.target.value.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase())}
                  placeholder="cash"
                  required
                  className="ui-input bg-surface border-line font-mono text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-ink-2">
                  {isEs ? 'Precio solicitado (BCH)' : 'Price (BCH)'}
                </label>
                <input
                  type="number"
                  step="0.0001"
                  min="0.00001"
                  max="1000"
                  value={sellPriceBch}
                  onChange={(e) => setSellPriceBch(e.target.value)}
                  required
                  className="ui-input bg-surface border-line font-mono text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-ink-2">
                  {isEs ? 'Tu dirección BCH (P2PKH)' : 'Seller BCH address (P2PKH)'}
                </label>
                <input
                  type="text"
                  value={sellAddress}
                  onChange={(e) => setSellAddress(e.target.value)}
                  placeholder={isMainnet ? 'bitcoincash:q...' : 'bchtest:q...'}
                  required
                  className="ui-input bg-surface border-line font-mono text-xs"
                />
              </div>

              {createError && (
                <div className="text-xs text-rose-500 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              <button type="submit" disabled={creatingListing} className="ui-btn-primary w-full">
                {creatingListing
                  ? isEs
                    ? 'Generando contrato...'
                    : 'Generating covenant...'
                  : isEs
                  ? 'Crear contrato de venta'
                  : 'Create Sale Covenant'}
              </button>
            </form>

            {createdListing && (
              <div className="pt-3 border-t border-line space-y-1.5 text-xs">
                <div className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    {isEs
                      ? `Contrato listo para ${createdListing.handle}`
                      : `Covenant ready for ${createdListing.handle}`}
                  </span>
                </div>
                <p className="text-[11px] text-ink-3 leading-relaxed">
                  {isEs
                    ? 'Envía el NFT a esta dirección P2SH-32 para abrir la compra atómica:'
                    : 'Deposit the Handle NFT to this P2SH-32 address to activate:'}
                </p>
                <div className="flex items-center justify-between gap-2 bg-surface border border-line rounded-control px-2.5 py-2 font-mono text-[11px]">
                  <span className="truncate text-ink">{createdListing.covenant.covenantTokenAddress}</span>
                  <button
                    type="button"
                    onClick={() => copyText(createdListing.covenant.covenantTokenAddress, 'new-covenant')}
                    className="text-ink-3 hover:text-ink cursor-pointer shrink-0"
                  >
                    {copiedId === 'new-covenant' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default HandleMarketPanel;
