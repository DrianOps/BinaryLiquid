import React, { useState, useEffect, useCallback } from 'react';
import {
  Check,
  Copy,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
  Wallet,
  AlertCircle,
  RefreshCw,
  Lock
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

  // 1. Tiered Minting Quote state
  const [quoteHandle, setQuoteHandle] = useState('bch');
  const [quoteData, setQuoteData] = useState<HandleQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // 2. Secondary Market Listing state
  const [sellHandle, setSellHandle] = useState(
    (activeHandle || 'cash').replace(/^@+/, '').split('@')[0] || 'cash'
  );
  const [sellAddress, setSellAddress] = useState(normalizedWalletAddr);
  const [sellPriceBch, setSellPriceBch] = useState('0.05');
  const [creatingListing, setCreatingListing] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdListing, setCreatedListing] = useState<MarketListing | null>(null);

  // 3. Active listings
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
        const params = new URLSearchParams({
          handle: clean,
          network
        });
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
    } catch {
      // ignore offline preview
    } finally {
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
        throw new Error(data?.error || 'Failed to instantiate P2SH-32 covenant');
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
    <div className="space-y-6">
      {/* CARD 1: ANTI-SPAM TIERED CASHTOKENS NFT MINTING COVENANT */}
      <div className="ui-card p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-mono text-primary font-semibold uppercase tracking-wide">
              <Sparkles className="w-3.5 h-3.5" />
              <span>CashScript P2SH-32 · UserLinkHandleMint.cash</span>
            </div>
            <h3 className="ui-section-title mt-1">
              {isEs
                ? 'Registro Anti-Spam de Handles NFT (Commit-Reveal)'
                : 'Anti-Spam Handle CashTokens NFT Minting (Commit-Reveal)'}
            </h3>
            <p className="ui-subtitle">
              {isEs
                ? 'La identidad base Nostr (Kind 30078) siempre es gratis. Para nombres globales únicos transferibles como CashToken NFT (UL1:<handle>), el contrato cobra tarifa anti-spam escalonada por longitud.'
                : 'Base Nostr identities (Kind 30078) remain 100% free. Optional tradeable CashToken NFT handles (UL1:<handle>) enforce length-tiered anti-spam fees directly on BCH L1.'}
            </p>
          </div>
          <span className="ui-badge font-mono text-[11px]">
            {isMainnet ? 'Mainnet P2SH-32' : 'Chipnet P2SH-32'}
          </span>
        </div>

        {/* Handle quote form */}
        <form onSubmit={handleQuoteSubmit} className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3 font-mono text-sm">@</span>
            <input
              type="text"
              value={quoteHandle}
              onChange={(e) => setQuoteHandle(e.target.value.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase())}
              placeholder="bch, cash, maria, satoshi..."
              maxLength={32}
              className="ui-input pl-8 font-mono text-sm"
            />
          </div>
          <button type="submit" disabled={quoteLoading} className="ui-btn-primary sm:w-auto">
            {quoteLoading
              ? isEs
                ? 'Calculando...'
                : 'Quoting...'
              : isEs
              ? 'Cotizar & Generar Covenant'
              : 'Quote & Derive Covenant'}
          </button>
        </form>

        {quoteError && (
          <div className="p-3 rounded-control border border-rose-500/30 bg-rose-500/5 text-xs text-rose-500 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{quoteError}</span>
          </div>
        )}

        {quoteData && (
          <div className="space-y-4">
            {/* 4-tier anti-spam pricing strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
              {quoteData.allTiers.map((tier) => {
                const isSelected = tier.key === quoteData.tier.key;
                return (
                  <div
                    key={tier.key}
                    className={`rounded-panel p-3 border transition-colors ${
                      isSelected
                        ? 'bg-primary/5 border-primary/50'
                        : 'bg-surface-2/60 border-line'
                    }`}
                  >
                    <div className="text-[11px] text-ink-3 font-medium">
                      {tier.minLen === tier.maxLen
                        ? `${tier.minLen} ${isEs ? 'letras' : 'chars'}`
                        : tier.maxLen === 3
                        ? `1–3 ${isEs ? 'letras' : 'chars'}`
                        : `6+ ${isEs ? 'letras' : 'chars'}`}
                    </div>
                    <div className="text-base font-bold text-ink mt-0.5 tabular-nums">
                      ${tier.usd < 1 ? tier.usd.toFixed(2) : tier.usd} USD
                    </div>
                    <div className="text-[11px] font-mono text-ink-2 tabular-nums">
                      {tier.bch} BCH ({tier.sats.toLocaleString()} sats)
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Derived P2SH-32 Mint Covenant details */}
            <div className="ui-panel p-4 space-y-2.5 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-line">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-ink text-sm">{quoteData.handle}</span>
                  <span className="ui-badge text-[11px]">{quoteData.tier.label}</span>
                </div>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold tabular-nums">
                  {quoteData.tier.bch} BCH (~${quoteData.tier.usd} USD) · {quoteData.covenant.opcodes} opcodes
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <div className="text-[11px] text-ink-3">
                    {isEs ? 'Dirección P2SH-32 Mint Covenant (Token-Aware)' : 'P2SH-32 Mint Covenant Address (Token-Aware)'}
                  </div>
                  <div className="flex items-center justify-between gap-2 bg-surface border border-line rounded-control px-2.5 py-1.5 font-mono text-[11px]">
                    <span className="truncate text-ink">{quoteData.covenant.covenantTokenAddress}</span>
                    <button
                      type="button"
                      onClick={() => copyText(quoteData.covenant.covenantTokenAddress, 'mint-addr')}
                      className="text-ink-3 hover:text-ink shrink-0 cursor-pointer"
                    >
                      {copiedId === 'mint-addr' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] text-ink-3">
                    {isEs ? 'Compromiso NFT CashToken (UL1:<handle>)' : 'CashToken NFT Commitment (UL1:<handle>)'}
                  </div>
                  <div className="flex items-center justify-between gap-2 bg-surface border border-line rounded-control px-2.5 py-1.5 font-mono text-[11px]">
                    <span className="truncate text-ink">{quoteData.nftCommitmentHex}</span>
                    <button
                      type="button"
                      onClick={() => copyText(quoteData.nftCommitmentHex, 'mint-comm')}
                      className="text-ink-3 hover:text-ink shrink-0 cursor-pointer"
                    >
                      {copiedId === 'mint-comm' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="text-[11px] font-mono text-ink-3 break-all pt-1">
                Commit-Reveal SHA256d: <span className="text-ink-2">{quoteData.commitReveal.commitHashHex}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CARD 2: ATOMIC NON-CUSTODIAL HANDLE NFT MARKETPLACE */}
      <div className="ui-card p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wide">
              <Lock className="w-3.5 h-3.5" />
              <span>CashScript P2SH-32 · UserLinkHandleMarket.cash</span>
            </div>
            <h3 className="ui-section-title mt-1">
              {isEs
                ? 'Mercado P2P sin Custodia para Comprar / Vender Handles NFT'
                : 'Non-Custodial P2P Handle NFT Marketplace'}
            </h3>
            <p className="ui-subtitle">
              {isEs
                ? 'Publica tu CashToken NFT en un covenant atómico P2SH-32: cualquier comprador paga BCH directo a tu dirección (2% royalty on-chain) y recibe el NFT en la misma transacción. Cancela cuando quieras con tu firma BCH.'
                : 'Lock your Handle CashToken NFT inside an atomic P2SH-32 covenant: buyers pay BCH directly to your address (2% on-chain royalty) and receive the NFT in the same L1 tx. Cancel anytime with your BCH key.'}
            </p>
          </div>
          {!normalizedWalletAddr && (
            <button type="button" onClick={onConnectBch} className="ui-btn-secondary ui-btn-sm">
              <Wallet className="w-3.5 h-3.5" />
              <span>{isEs ? 'Autocompletar con Wallet' : 'Autofill from Wallet'}</span>
            </button>
          )}
        </div>

        <form onSubmit={handleCreateCovenant} className="ui-panel p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-ink-2">
                {isEs ? 'Handle NFT a vender' : 'Handle NFT to sell'}
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
                {isEs ? 'Precio de venta (BCH)' : 'Asking Price (BCH)'}
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
                {isEs ? 'Dirección BCH del vendedor (P2PKH)' : 'Seller BCH Address (P2PKH)'}
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
          </div>

          {createError && (
            <div className="p-2.5 rounded-control border border-rose-500/30 bg-rose-500/5 text-xs text-rose-500 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{createError}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <span className="text-[11px] text-ink-3">
              {isEs
                ? 'Royalty on-chain: 2% · Timelock de recuperación: 7 días · 100% sin custodia'
                : 'On-chain royalty: 2% · Expiry reclaim timelock: 7 days · 100% non-custodial'}
            </span>
            <button type="submit" disabled={creatingListing} className="ui-btn-primary ui-btn-sm">
              <Tag className="w-3.5 h-3.5" />
              <span>
                {creatingListing
                  ? isEs
                    ? 'Instanciando Covenant...'
                    : 'Instantiating Covenant...'
                  : isEs
                  ? 'Crear Covenant de Venta P2SH-32'
                  : 'Create P2SH-32 Sale Covenant'}
              </span>
            </button>
          </div>
        </form>

        {createdListing && (
          <div className="p-4 rounded-panel border border-emerald-500/35 bg-emerald-500/5 space-y-2 text-xs">
            <div className="flex items-center justify-between gap-2 font-semibold text-emerald-700 dark:text-emerald-400">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                {isEs
                  ? `Covenant P2SH-32 listo para ${createdListing.handle}`
                  : `P2SH-32 Covenant Ready for ${createdListing.handle}`}
              </span>
              <span className="font-mono tabular-nums">
                {createdListing.priceBch} BCH (~${createdListing.priceUsdEst})
              </span>
            </div>
            <p className="text-ink-2 leading-relaxed">
              {isEs
                ? 'Envía tu CashToken NFT (UL1:' + createdListing.cleanHandle + ') a esta dirección P2SH-32 para activar la venta atómica:'
                : 'Send your CashToken NFT (UL1:' + createdListing.cleanHandle + ') to this P2SH-32 token-aware address to activate atomic settlement:'}
            </p>
            <div className="flex items-center justify-between gap-2 bg-surface border border-line rounded-control px-3 py-2 font-mono text-[11px]">
              <span className="break-all text-ink">{createdListing.covenant.covenantTokenAddress}</span>
              <button
                type="button"
                onClick={() => copyText(createdListing.covenant.covenantTokenAddress, 'new-covenant')}
                className="text-ink-3 hover:text-ink shrink-0 cursor-pointer"
              >
                {copiedId === 'new-covenant' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        )}

        {/* Active P2SH-32 Listings */}
        <div className="space-y-2.5 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-ink">
              {isEs ? 'Órdenes P2SH-32 Activas' : 'Active P2SH-32 Covenant Listings'} ({listings.length})
            </h4>
            <button
              type="button"
              onClick={() => void fetchListings()}
              className="inline-flex items-center gap-1 text-xs text-ink-3 hover:text-ink cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingListings ? 'animate-spin' : ''}`} />
              <span>{isEs ? 'Actualizar' : 'Refresh'}</span>
            </button>
          </div>

          {listings.length === 0 ? (
            <div className="ui-panel p-5 text-center text-xs text-ink-3">
              {isEs
                ? 'Aún no hay handles listados en esta red. Crea el primer covenant P2SH-32 arriba (cero anuncios falsos).'
                : 'No handles listed on this network yet. Instantiate the first P2SH-32 sale covenant above (zero mock listings).'}
            </div>
          ) : (
            <div className="divide-y divide-line border border-line rounded-panel overflow-hidden">
              {listings.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-ink text-sm">{item.handle}</span>
                      <span className="ui-badge text-[10px] font-mono">
                        UL1:{item.cleanHandle}
                      </span>
                      <span className="text-[11px] text-ink-3 font-mono">
                        {isEs ? 'Vendedor:' : 'Seller:'} {formatAddress(item.sellerAddress)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono text-[11px] text-ink-2">
                      <span className="truncate">P2SH-32: {item.covenant.covenantTokenAddress}</span>
                      <button
                        type="button"
                        onClick={() => copyText(item.covenant.covenantTokenAddress, item.id)}
                        className="text-ink-3 hover:text-ink shrink-0 cursor-pointer"
                        title="Copy P2SH-32 covenant address"
                      >
                        {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="font-mono font-bold text-ink tabular-nums">{item.priceBch} BCH</div>
                      <div className="text-[11px] text-ink-3 tabular-nums">~${item.priceUsdEst} USD</div>
                    </div>
                    {normalizedWalletAddr &&
                      item.sellerAddress.toLowerCase() === normalizedWalletAddr.toLowerCase() && (
                        <button
                          type="button"
                          onClick={() => void handleRemoveListing(item)}
                          className="p-1.5 rounded-control border border-line text-ink-3 hover:text-rose-500 hover:border-rose-500/40 cursor-pointer"
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
      </div>
    </div>
  );
};

export default HandleMarketPanel;
