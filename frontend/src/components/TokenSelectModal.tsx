import React, { useState, useMemo } from 'react';
import { Search, X, Check, Lock, LayoutGrid, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DEPLOYED_TESTNET_CONTRACTS } from '../services/walletConnectService';

export interface TokenInfo {
  symbol: string;
  name: string;
  chain?: 'bch' | 'polygon' | 'solana' | 'ethereum' | 'bnb' | string;
  network: string;
  networkBadge: string;
  icon: string;
  decimals: number;
  isBch: boolean;
  isSolana?: boolean;
  isLtc?: boolean;
  id?: string;
  isSponsor?: boolean;
  isVerified?: boolean;
  categoryOrAddress?: string;
  disabled?: boolean;
  unavailableBadge?: string;
}

export interface ChainOption {
  id: string; // 'all' | 'bch' | 'polygon' | 'solana' | 'litecoin' | 'ethereum' | 'bnb'
  name: string;
  icon?: string;
  badge?: string;
}

export const SUPPORTED_CHAINS: ChainOption[] = [
  { id: 'all', name: 'All Chains' },
  { id: 'bch', name: 'Bitcoin Cash', icon: '/BCH.png', badge: 'Chipnet / L1' },
  { id: 'polygon', name: 'Polygon', icon: '/POL.png', badge: 'Amoy / PoS' },
  { id: 'solana', name: 'Solana', icon: '/SOL.png', badge: 'Devnet / SVM' },
  { id: 'litecoin', name: 'Litecoin', icon: '/LTC.png', badge: 'Testnet4 / L1' },
  { id: 'ethereum', name: 'Ethereum', icon: '/ETH.png', badge: 'Mainnet' },
  { id: 'bnb', name: 'BNB Chain', icon: '/BNB.png', badge: 'BEP-20' }
];

export const SUPPORTED_TOKENS: TokenInfo[] = [
  // --- BITCOIN CASH (Chipnet & CashTokens) ---
  {
    id: 'pusd_bch',
    symbol: 'PUSD',
    name: 'ParyonUSD',
    chain: 'bch',
    network: 'Bitcoin Cash (Mainnet)',
    networkBadge: 'BCH CashTokens',
    icon: '/PUSD.png',
    decimals: 6,
    isBch: true,
    isSponsor: true,
    isVerified: true,
    categoryOrAddress: 'a5c0b1f900000000000000000000000000000000000000000000000000000000'
  },
  {
    id: 'bch_l1',
    symbol: 'BCH',
    name: 'Bitcoin Cash',
    chain: 'bch',
    network: 'Bitcoin Cash (Mainnet)',
    networkBadge: 'BCH Layer 1',
    icon: '/BCH.png',
    decimals: 8,
    isBch: true,
    isVerified: true
  },
  {
    id: 'musd_bch',
    symbol: 'MUSD',
    name: 'MoriaUSD',
    chain: 'bch',
    network: 'Bitcoin Cash (Mainnet)',
    networkBadge: 'BCH CashTokens',
    icon: '/MUSD.png',
    decimals: 6,
    isBch: true,
    isVerified: true,
    categoryOrAddress: 'b7d0c2e800000000000000000000000000000000000000000000000000000000'
  },
  {
    id: 'lift_bch',
    symbol: 'LIFT',
    name: 'Paytaca LIFT',
    chain: 'bch',
    network: 'Bitcoin Cash (Mainnet)',
    networkBadge: 'BCH CashTokens',
    icon: '/LIFT.png',
    decimals: 2,
    isBch: true,
    isVerified: true,
    categoryOrAddress: '5932b2fd4915d6a75d3ec53282cd49118149a2176ee67ed68b1111ff0786f7fc'
  },

  // --- POLYGON (Amoy & PoS) ---
  {
    id: 'usdt_polygon',
    symbol: 'USDT',
    name: 'Tether USD (Polygon)',
    chain: 'polygon',
    network: 'Polygon (Mainnet)',
    networkBadge: 'Polygon PoS',
    icon: '/USDT.png',
    decimals: 6,
    isBch: false,
    isSolana: false,
    isVerified: true,
    categoryOrAddress: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F'
  },
  {
    id: 'usdc_polygon',
    symbol: 'USDC',
    name: 'USD Coin',
    chain: 'polygon',
    network: 'Polygon (Mainnet)',
    networkBadge: 'Polygon PoS',
    icon: '/USDC.png',
    decimals: 6,
    isBch: false,
    isVerified: true,
    categoryOrAddress: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359'
  },
  {
    id: 'pol_l1',
    symbol: 'POL',
    name: 'Polygon Ecosystem Token',
    chain: 'polygon',
    network: 'Polygon (Mainnet)',
    networkBadge: 'Polygon 2.0',
    icon: '/POL.png',
    decimals: 18,
    isBch: false,
    isVerified: true
  },

  // --- SOLANA (Devnet & SPL) ---
  {
    id: 'usdt_solana',
    symbol: 'USDT',
    name: 'Tether USD (Solana)',
    chain: 'solana',
    network: 'Solana (Mainnet)',
    networkBadge: 'Solana SPL',
    icon: '/USDT.png',
    decimals: 6,
    isBch: false,
    isSolana: true,
    isVerified: true,
    categoryOrAddress: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'
  },
  {
    id: 'sol_spl',
    symbol: 'SOL',
    name: 'Solana',
    chain: 'solana',
    network: 'Solana (Mainnet)',
    networkBadge: 'Solana SPL',
    icon: '/SOL.png',
    decimals: 9,
    isBch: false,
    isSolana: true,
    isVerified: true
  },

  // --- LITECOIN (Testnet4 & Mainnet) ---
  {
    id: 'ltc_l1',
    symbol: 'LTC',
    name: 'Litecoin',
    chain: 'litecoin',
    network: 'Litecoin (Mainnet)',
    networkBadge: 'Litecoin L1',
    icon: '/LTC.png',
    decimals: 8,
    isBch: false,
    isSolana: false,
    isLtc: true,
    isVerified: true
  },

  // --- OTHERS ---
  {
    id: 'eth_l1',
    symbol: 'ETH',
    name: 'Ethereum',
    chain: 'ethereum',
    network: 'Ethereum (Mainnet)',
    networkBadge: 'Ethereum L1',
    icon: '/ETH.png',
    decimals: 18,
    isBch: false,
    isVerified: true
  },
  // --- BNB SMART CHAIN (BEP-20) ---
  {
    id: 'usdt_bsc',
    symbol: 'USDT',
    name: 'Tether USD (BNB Chain)',
    chain: 'bnb',
    network: 'BNB Chain (Mainnet)',
    networkBadge: 'BNB BEP-20',
    icon: '/USDT.png',
    decimals: 18,
    isBch: false,
    isSolana: false,
    isVerified: true,
    categoryOrAddress: '0x55d398326f99059fF775485246999027B3197955'
  },
  {
    id: 'bnb_bsc',
    symbol: 'BNB',
    name: 'BNB Smart Chain',
    chain: 'bnb',
    network: 'BNB Chain (Mainnet)',
    networkBadge: 'BEP-20',
    icon: '/BNB.png',
    decimals: 18,
    isBch: false,
    isVerified: true
  }
];

const CHAIN_ICONS: Record<string, string> = {
  bch: '/BCH.png',
  polygon: '/POL.png',
  solana: '/SOL.png',
  litecoin: '/LTC.png',
  ethereum: '/ETH.png',
  bnb: '/BNB.png'
};

interface TokenSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (token: TokenInfo) => void;
  selectedTokenSymbol: string;
  selectedTokenId?: string;
  title?: string;
  customTokens?: TokenInfo[];
  isTestnet?: boolean;
  lang?: 'en' | 'es';
  walletBalances?: {
    PUSD?: number;
    BCH?: number;
    USDT?: number;
    USDC?: number;
    POL?: number;
    SOL?: number;
    USDT_SOL?: number;
    [k: string]: number | undefined;
  };
}

export default function TokenSelectModal({
  isOpen,
  onClose,
  onSelect,
  selectedTokenSymbol,
  selectedTokenId,
  title,
  customTokens = [],
  isTestnet = false,
  lang = 'es',
  walletBalances
}: TokenSelectModalProps) {
  const [search, setSearch] = useState('');
  const [selectedChain, setSelectedChain] = useState<string>('all');

  const t = {
    selectCoin: lang === 'es' ? 'Seleccionar moneda' : 'Select coin',
    allChains: lang === 'es' ? 'Todas las redes' : 'All Chains',
    networksHeader: lang === 'es' ? 'Redes soportadas' : 'Networks',
    searchPlaceholder: lang === 'es' ? 'Buscar moneda o contrato...' : 'Search coin or contract...',
    noTokens: lang === 'es' ? 'No se encontraron monedas' : 'No tokens found',
    noTokensDesc: lang === 'es' ? 'Prueba con otro término de búsqueda o selecciona otra red.' : 'Try another search query or switch to another network.',
    viewAllChains: lang === 'es' ? 'Ver todas las redes' : 'View all chains',
    balance: lang === 'es' ? 'Saldo' : 'Balance',
    blazeSponsor: 'BLAZE Sponsor',
    noLiquidity: lang === 'es' ? 'Sin Liquidez' : 'No Liquidity'
  };

  const allAvailable = useMemo(() => {
    const list: TokenInfo[] = SUPPORTED_TOKENS.map(token => {
      const sym = token.symbol.toUpperCase();

      if (isTestnet) {
        const isActiveInTestnet = sym === 'PUSD' || sym === 'USDT' || sym === 'SOL' || sym === 'LTC';
        return {
          ...token,
          network: token.isBch
            ? 'BCH Chipnet (Testnet4)'
            : token.isSolana || sym === 'SOL'
            ? 'Solana Devnet'
            : token.isLtc || sym === 'LTC'
            ? 'Litecoin (Testnet4)'
            : 'Polygon Amoy (Testnet)',
          networkBadge: token.isBch
            ? 'Chipnet CashTokens'
            : token.isSolana || sym === 'SOL'
            ? 'Solana Devnet'
            : token.isLtc || sym === 'LTC'
            ? 'Litecoin Testnet4'
            : 'Polygon Amoy',
          categoryOrAddress:
            sym === 'PUSD'
              ? DEPLOYED_TESTNET_CONTRACTS.chipnetPusdCategory
              : token.isSolana
              ? DEPLOYED_TESTNET_CONTRACTS.solanaDevnetUsdtMint
              : sym === 'USDT'
              ? DEPLOYED_TESTNET_CONTRACTS.amoyUsdtAddress
              : sym === 'USDC'
              ? DEPLOYED_TESTNET_CONTRACTS.amoyUsdcAddress
              : token.categoryOrAddress,
          disabled: !isActiveInTestnet,
          unavailableBadge: isActiveInTestnet ? undefined : t.noLiquidity
        };
      }

      // Mainnet mode: liquidity marked while live testnet vaults operate
      return {
        ...token,
        disabled: true,
        unavailableBadge: t.noLiquidity
      };
    });

    if (customTokens && customTokens.length > 0) {
      for (const ct of customTokens) {
        if (!list.find(item => item.symbol.toUpperCase() === ct.symbol.toUpperCase())) {
          list.push({
            ...ct,
            chain: ct.chain || (ct.isBch ? 'bch' : ct.isSolana ? 'solana' : 'polygon'),
            disabled: true,
            unavailableBadge: t.noLiquidity
          });
        }
      }
    }
    return list;
  }, [customTokens, isTestnet, t.noLiquidity]);

  // Filter tokens based on selected chain and search query
  const filteredTokens = useMemo(() => {
    return allAvailable.filter(token => {
      // 1. Chain Filter
      if (selectedChain !== 'all') {
        const tokenChain = token.chain || (token.isBch ? 'bch' : token.isSolana ? 'solana' : 'polygon');
        if (tokenChain !== selectedChain) return false;
      }

      // 2. Search Filter
      if (!search.trim()) return true;
      const query = search.trim().toLowerCase();
      return (
        token.symbol.toLowerCase().includes(query) ||
        token.name.toLowerCase().includes(query) ||
        token.network.toLowerCase().includes(query) ||
        (token.categoryOrAddress && token.categoryOrAddress.toLowerCase().includes(query))
      );
    });
  }, [allAvailable, selectedChain, search]);

  // Count tokens per chain
  const chainCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allAvailable.length };
    for (const token of allAvailable) {
      const c = token.chain || (token.isBch ? 'bch' : token.isSolana ? 'solana' : 'polygon');
      counts[c] = (counts[c] || 0) + 1;
    }
    return counts;
  }, [allAvailable]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="w-full max-w-sm sm:max-w-2xl md:max-w-[720px] bg-surface rounded-2xl sm:rounded-3xl border border-line shadow-2xl overflow-hidden flex flex-col h-[560px] max-h-[90vh] my-auto text-left"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-line flex items-center justify-between shrink-0 bg-surface">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <h3 className="text-base sm:text-lg font-bold text-ink">
              {t.selectCoin}
            </h3>
            {title && (
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-surface-2 text-ink-2 border border-line">
                {title}
              </span>
            )}
            <span className={isTestnet ? 'ui-badge-warn text-[10px]' : 'ui-badge-danger text-[10px]'}>
              {isTestnet ? 'Testnet' : t.noLiquidity}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="w-8 h-8 rounded-full bg-surface-2 hover:bg-surface-3 text-ink-3 hover:text-ink flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mobile Horizontal Network Selector Strip (< sm) */}
        <div className="sm:hidden px-3 py-2 border-b border-line flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 bg-surface-2/40">
          {SUPPORTED_CHAINS.map(chain => {
            const isActive = selectedChain === chain.id;
            return (
              <button
                key={chain.id}
                type="button"
                onClick={() => setSelectedChain(chain.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs shrink-0 transition-all cursor-pointer font-medium ${
                  isActive
                    ? 'border-2 border-emerald-500 bg-emerald-500/15 text-ink font-bold shadow-2xs'
                    : 'border border-line bg-surface hover:bg-surface-2 text-ink-3 hover:text-ink'
                }`}
              >
                {chain.id === 'all' ? (
                  <LayoutGrid className="w-3.5 h-3.5 text-ink-3" />
                ) : (
                  <img src={chain.icon} className="w-3.5 h-3.5 object-contain rounded-full" alt={chain.name} />
                )}
                <span>{chain.id === 'all' ? t.allChains : chain.name}</span>
              </button>
            );
          })}
        </div>

        {/* Body: Two-column layout on Desktop */}
        <div className="flex-1 flex flex-col sm:flex-row min-h-0 overflow-hidden">
          {/* Left Column: Chain Selector (Desktop) */}
          <div className="hidden sm:flex w-52 md:w-60 shrink-0 border-r border-line p-3 flex-col gap-1 overflow-y-auto custom-scrollbar bg-surface/40">
            {/* "All Chains" row */}
            <button
              type="button"
              onClick={() => setSelectedChain('all')}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer text-left ${
                selectedChain === 'all'
                  ? 'border-2 border-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/15 text-ink font-bold shadow-2xs'
                  : 'border-2 border-transparent hover:bg-surface-2 text-ink-3 hover:text-ink font-medium'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-surface-2 border border-line flex items-center justify-center shrink-0">
                  <LayoutGrid className={`w-4 h-4 ${selectedChain === 'all' ? 'text-emerald-500' : 'text-ink-3'}`} />
                </div>
                <span className="text-sm truncate">{t.allChains}</span>
              </div>
              <span className="text-[11px] font-mono text-ink-3 font-semibold px-1.5 py-0.5 rounded bg-surface border border-line">
                {chainCounts.all || 0}
              </span>
            </button>

            {/* Section label */}
            <div className="text-[10px] uppercase font-bold text-ink-3 tracking-wider px-3 pt-3 pb-1">
              {t.networksHeader}
            </div>

            {/* Individual Chain Rows */}
            {SUPPORTED_CHAINS.filter(c => c.id !== 'all').map(chain => {
              const isActive = selectedChain === chain.id;
              const count = chainCounts[chain.id] || 0;
              return (
                <button
                  key={chain.id}
                  type="button"
                  onClick={() => setSelectedChain(chain.id)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer text-left ${
                    isActive
                      ? 'border-2 border-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/15 text-ink font-bold shadow-2xs'
                      : 'border-2 border-transparent hover:bg-surface-2 text-ink-3 hover:text-ink font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={chain.icon}
                      className="w-7 h-7 object-contain rounded-full bg-surface border border-line p-0.5 shrink-0"
                      alt={chain.name}
                    />
                    <div className="min-w-0">
                      <div className="text-sm truncate">{chain.name}</div>
                      {chain.badge && (
                        <div className="text-[10px] text-ink-3 truncate font-normal leading-tight">
                          {chain.badge}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-ink-3 font-semibold px-1.5 py-0.5 rounded bg-surface border border-line shrink-0">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right Column: Search + Token List */}
          <div className="flex-1 flex flex-col min-w-0 p-3 sm:p-4 overflow-hidden">
            {/* Search Input Box */}
            <div className="relative mb-3 shrink-0">
              <Search className="w-4 h-4 text-ink-3 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-surface-2 border border-transparent focus:border-line-strong text-sm text-ink outline-none placeholder:text-ink-3 transition-colors"
                autoFocus
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="w-6 h-6 rounded-full text-ink-3 hover:text-ink absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Active Chain Filter Indicator (Desktop helper) */}
            {selectedChain !== 'all' && (
              <div className="flex items-center justify-between mb-2 px-1 text-xs text-ink-3 shrink-0">
                <span className="flex items-center gap-1.5 font-medium">
                  <span>Filtrando por:</span>
                  <span className="text-ink font-semibold">
                    {SUPPORTED_CHAINS.find(c => c.id === selectedChain)?.name}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedChain('all')}
                  className="text-primary hover:underline font-semibold text-[11px] cursor-pointer"
                >
                  {t.viewAllChains}
                </button>
              </div>
            )}

            {/* Scrollable Token Rows */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-1">
              {filteredTokens.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 my-auto">
                  <div className="w-12 h-12 rounded-full bg-surface-2 border border-line flex items-center justify-center text-ink-3 mb-2">
                    <Search className="w-5 h-5" />
                  </div>
                  <div className="text-sm font-semibold text-ink mb-1">{t.noTokens}</div>
                  <div className="text-xs text-ink-3 max-w-[260px] mb-3">{t.noTokensDesc}</div>
                  {selectedChain !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setSelectedChain('all')}
                      className="px-3 py-1.5 rounded-control bg-surface-2 hover:bg-surface-3 text-ink text-xs font-semibold border border-line transition-colors cursor-pointer"
                    >
                      {t.viewAllChains}
                    </button>
                  )}
                </div>
              ) : (
                filteredTokens.map(token => {
                  const isSelected = selectedTokenId
                    ? token.id === selectedTokenId && !token.disabled
                    : selectedTokenSymbol === token.symbol && !token.disabled;

                  // Retrieve live wallet balance if available
                  const tokenChain = token.chain || (token.isBch ? 'bch' : token.isSolana ? 'solana' : 'polygon');
                  const chainLogo = CHAIN_ICONS[tokenChain];
                  let userBalance: number | null = null;
                  if (walletBalances) {
                    if (token.isLtc || tokenChain === 'litecoin') {
                      userBalance = typeof walletBalances.LTC === 'number' ? walletBalances.LTC : null;
                    } else if (token.isSolana || tokenChain === 'solana') {
                      if (token.symbol === 'SOL') userBalance = typeof walletBalances.SOL === 'number' ? walletBalances.SOL : null;
                      else if (token.symbol === 'USDT') userBalance = typeof walletBalances.USDT_SOL === 'number' ? walletBalances.USDT_SOL : null;
                    } else if (token.isBch || tokenChain === 'bch') {
                      if (token.symbol === 'PUSD') userBalance = typeof walletBalances.PUSD === 'number' ? walletBalances.PUSD : null;
                      else if (token.symbol === 'BCH') userBalance = typeof walletBalances.BCH === 'number' ? walletBalances.BCH : null;
                    } else {
                      if (token.symbol === 'USDT') userBalance = typeof walletBalances.USDT === 'number' ? walletBalances.USDT : null;
                      else if (token.symbol === 'USDC') userBalance = typeof walletBalances.USDC === 'number' ? walletBalances.USDC : null;
                      else if (token.symbol === 'POL') userBalance = typeof walletBalances.POL === 'number' ? walletBalances.POL : null;
                      else if (typeof walletBalances[token.symbol] === 'number') userBalance = walletBalances[token.symbol];
                    }
                  }

                  return (
                    <button
                      key={token.id || token.symbol + token.network}
                      type="button"
                      disabled={token.disabled}
                      onClick={() => {
                        if (token.disabled) return;
                        onSelect(token);
                        onClose();
                      }}
                      className={`w-full flex items-center justify-between p-2.5 sm:p-3 rounded-xl border transition-all text-left group ${
                        token.disabled
                          ? 'border-transparent opacity-60 cursor-not-allowed hover:bg-surface-2/40'
                          : isSelected
                          ? 'border-emerald-500/40 bg-emerald-500/10 dark:bg-emerald-500/15 cursor-pointer shadow-2xs'
                          : 'border-transparent hover:border-line hover:bg-surface-2 cursor-pointer'
                      }`}
                    >
                      {/* Left: Token Icon + Name Details */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          <img
                            src={token.icon}
                            alt={token.symbol}
                            className="w-10 h-10 object-contain rounded-full bg-surface border border-line p-1 shadow-2xs"
                          />
                          {/* Mini chain overlay icon when in 'All Chains' view */}
                          {selectedChain === 'all' && chainLogo && (
                            <img
                              src={chainLogo}
                              alt={tokenChain}
                              className="absolute -bottom-0.5 -right-0.5 w-4 h-4 object-contain rounded-full bg-surface border border-line p-0.5 shadow-2xs"
                              title={token.network}
                            />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-ink">
                              {token.symbol}
                            </span>
                            {token.isSponsor && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 shrink-0">
                                <Sparkles className="w-2.5 h-2.5" />
                                {t.blazeSponsor}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-ink-3 truncate mt-0.5">
                            <span>{token.name}</span>
                            <span className="mx-1 text-ink-3/60">·</span>
                            <span className="text-ink-3/90 font-medium">{token.networkBadge}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Balances + Status Badges + Selection Check */}
                      <div className="flex items-center gap-2.5 shrink-0 ml-2">
                        {userBalance !== null && userBalance > 0 && (
                          <div className="text-right hidden sm:block">
                            <div className="text-xs font-mono font-semibold text-ink">
                              {userBalance.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                            </div>
                            <div className="text-[10px] text-ink-3">
                              {t.balance}
                            </div>
                          </div>
                        )}

                        {token.disabled && token.unavailableBadge ? (
                          <span className="ui-badge-danger text-[10px] flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5 shrink-0" />
                            <span>{token.unavailableBadge}</span>
                          </span>
                        ) : (
                          <span className="ui-badge text-[10px] hidden md:inline-flex">
                            {token.networkBadge}
                          </span>
                        )}

                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
