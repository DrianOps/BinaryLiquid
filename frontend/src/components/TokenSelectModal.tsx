import React, { useState } from 'react';
import { Search, X, Check, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { DEPLOYED_TESTNET_CONTRACTS } from '../services/walletConnectService';

export interface TokenInfo {
  symbol: string;
  name: string;
  network: string;
  networkBadge: string;
  icon: string;
  decimals: number;
  isBch: boolean;
  isSponsor?: boolean;
  isVerified?: boolean;
  categoryOrAddress?: string;
  disabled?: boolean;
  unavailableBadge?: string;
}

export const SUPPORTED_TOKENS: TokenInfo[] = [
  {
    symbol: 'PUSD',
    name: 'ParyonUSD',
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
    symbol: 'USDT',
    name: 'Tether USD',
    network: 'Polygon (Mainnet)',
    networkBadge: 'Polygon PoS',
    icon: '/USDT.png',
    decimals: 6,
    isBch: false,
    isVerified: true,
    categoryOrAddress: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F'
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    network: 'Polygon (Mainnet)',
    networkBadge: 'Polygon PoS',
    icon: '/USDC.png',
    decimals: 6,
    isBch: false,
    isVerified: true,
    categoryOrAddress: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359'
  },
  {
    symbol: 'MUSD',
    name: 'MoriaUSD',
    network: 'Bitcoin Cash (Mainnet)',
    networkBadge: 'BCH CashTokens',
    icon: '/MUSD.png',
    decimals: 6,
    isBch: true,
    isVerified: true,
    categoryOrAddress: 'b7d0c2e800000000000000000000000000000000000000000000000000000000'
  },
  {
    symbol: 'LIFT',
    name: 'Paytaca LIFT',
    network: 'Bitcoin Cash (Mainnet)',
    networkBadge: 'BCH CashTokens',
    icon: '/LIFT.png',
    decimals: 2,
    isBch: true,
    isVerified: true,
    categoryOrAddress: '5932b2fd4915d6a75d3ec53282cd49118149a2176ee67ed68b1111ff0786f7fc'
  },
  {
    symbol: 'BCH',
    name: 'Bitcoin Cash',
    network: 'Bitcoin Cash (Mainnet)',
    networkBadge: 'BCH Layer 1',
    icon: '/BCH.png',
    decimals: 8,
    isBch: true,
    isVerified: true
  },
  {
    symbol: 'POL',
    name: 'Polygon Ecosystem Token',
    network: 'Polygon (Mainnet)',
    networkBadge: 'Polygon 2.0',
    icon: '/POL.png',
    decimals: 18,
    isBch: false,
    isVerified: true
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    network: 'Ethereum (Mainnet)',
    networkBadge: 'Ethereum L1',
    icon: '/ETH.png',
    decimals: 18,
    isBch: false,
    isVerified: true
  },
  {
    symbol: 'SOL',
    name: 'Solana',
    network: 'Solana (Mainnet)',
    networkBadge: 'Solana SPL',
    icon: '/SOL.png',
    decimals: 9,
    isBch: false,
    isVerified: true
  },
  {
    symbol: 'BNB',
    name: 'BNB Smart Chain',
    network: 'BNB Chain (Mainnet)',
    networkBadge: 'BEP-20',
    icon: '/BNB.png',
    decimals: 18,
    isBch: false,
    isVerified: true
  }
];

interface TokenSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (token: TokenInfo) => void;
  selectedTokenSymbol: string;
  title?: string;
  customTokens?: TokenInfo[];
  isTestnet?: boolean;
}

export default function TokenSelectModal({
  isOpen,
  onClose,
  onSelect,
  selectedTokenSymbol,
  title = 'Select a token',
  customTokens = [],
  isTestnet = false
}: TokenSelectModalProps) {
  const [search, setSearch] = useState('');

  const allAvailable = React.useMemo(() => {
    const list: TokenInfo[] = SUPPORTED_TOKENS.map(t => {
      const sym = t.symbol.toUpperCase();

      if (isTestnet) {
        const isActiveInTestnet = sym === 'PUSD' || sym === 'USDT';
        return {
          ...t,
          network: t.isBch
            ? 'BCH Chipnet (Testnet4)'
            : sym === 'SOL'
            ? 'Solana Devnet'
            : 'Polygon Amoy (Testnet)',
          networkBadge: t.isBch
            ? 'Chipnet CashTokens'
            : sym === 'SOL'
            ? 'Devnet SPL'
            : 'Polygon Amoy',
          categoryOrAddress:
            sym === 'PUSD'
              ? DEPLOYED_TESTNET_CONTRACTS.chipnetPusdCategory
              : sym === 'USDT'
              ? DEPLOYED_TESTNET_CONTRACTS.amoyUsdtAddress
              : sym === 'USDC'
              ? DEPLOYED_TESTNET_CONTRACTS.amoyUsdcAddress
              : t.categoryOrAddress,
          disabled: !isActiveInTestnet,
          unavailableBadge: isActiveInTestnet ? undefined : 'Sin Liquidez'
        };
      }

      // Mainnet mode: ALL tokens marked with "Sin Liquidez" while liquidity lives in Testnet Vaults
      return {
        ...t,
        disabled: true,
        unavailableBadge: 'Sin Liquidez'
      };
    });

    if (customTokens && customTokens.length > 0) {
      for (const ct of customTokens) {
        if (!list.find(t => t.symbol.toUpperCase() === ct.symbol.toUpperCase())) {
          list.push({
            ...ct,
            disabled: true,
            unavailableBadge: 'Sin Liquidez'
          });
        }
      }
    }
    return list;
  }, [customTokens, isTestnet]);

  if (!isOpen) return null;

  const filtered = allAvailable.filter(t =>
    t.symbol.toLowerCase().includes(search.toLowerCase()) ||
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.network.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        className="w-full sm:max-w-[400px] bg-surface rounded-t-card sm:rounded-card border border-line shadow-soft overflow-hidden flex flex-col max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="ui-section-title">{title}</h3>
            <span className={isTestnet ? 'ui-badge-warn' : 'ui-badge-danger'}>
              {isTestnet ? 'Testnet' : 'Sin Liquidez'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="w-8 h-8 rounded-full text-ink-3 hover:text-ink hover:bg-surface-2 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 pb-3">
          <div className="flex items-center gap-2.5 px-3.5 h-11 rounded-control bg-surface-2 border border-transparent focus-within:border-line-strong transition-colors">
            <Search className="w-4 h-4 text-ink-3" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search token"
              className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-3"
              autoFocus
            />
          </div>
        </div>

        {/* Token List */}
        <div className="flex-1 overflow-y-auto px-2 pb-3 custom-scrollbar">
          {filtered.length === 0 ? (
            <div className="text-center py-10 ui-muted">No tokens found</div>
          ) : (
            filtered.map(t => {
              const isSelected = selectedTokenSymbol === t.symbol && !t.disabled;
              return (
                <button
                  key={t.symbol + t.network}
                  type="button"
                  disabled={t.disabled}
                  onClick={() => {
                    if (t.disabled) return;
                    onSelect(t);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-panel text-left transition-colors ${
                    t.disabled
                      ? 'cursor-not-allowed'
                      : isSelected
                      ? 'bg-surface-2 cursor-pointer'
                      : 'hover:bg-surface-2 cursor-pointer'
                  }`}
                >
                  <div className={`flex items-center gap-3 min-w-0 ${t.disabled ? 'opacity-45' : ''}`}>
                    <img src={t.icon} alt={t.symbol} className="w-9 h-9 rounded-full object-contain shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-ink">{t.symbol}</div>
                      <div className="text-xs text-ink-3 truncate">
                        {t.name} · {t.networkBadge}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {t.disabled && t.unavailableBadge ? (
                      <span className="ui-badge-danger">
                        <Lock className="w-2.5 h-2.5" />
                        {t.unavailableBadge}
                      </span>
                    ) : isSelected ? (
                      <Check className="w-4 h-4 text-ink" />
                    ) : null}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </motion.div>
    </div>
  );
}
