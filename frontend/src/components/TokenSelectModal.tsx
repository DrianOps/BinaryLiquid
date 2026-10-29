import React, { useState } from 'react';
import { Search, X, Check, Flame, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  }
];

interface TokenSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (token: TokenInfo) => void;
  selectedTokenSymbol: string;
  title?: string;
  customTokens?: TokenInfo[];
}

export default function TokenSelectModal({
  isOpen,
  onClose,
  onSelect,
  selectedTokenSymbol,
  title = 'Select a token',
  customTokens = []
}: TokenSelectModalProps) {
  const [search, setSearch] = useState('');

  const allAvailable = React.useMemo(() => {
    const list = [...SUPPORTED_TOKENS];
    if (customTokens && customTokens.length > 0) {
      for (const ct of customTokens) {
        if (!list.find(t => t.symbol.toUpperCase() === ct.symbol.toUpperCase())) {
          list.push(ct);
        }
      }
    }
    return list;
  }, [customTokens]);

  if (!isOpen) return null;

  const filtered = allAvailable.filter(t => 
    t.symbol.toLowerCase().includes(search.toLowerCase()) ||
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.network.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        className="w-full max-w-md bg-white dark:bg-[#12161f] rounded-[30px] border border-gray-100 dark:border-gray-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800/80">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {title}
          </h3>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800/60">
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-gray-50 dark:bg-[#181e2b] border border-gray-200/80 dark:border-gray-700 focus-within:border-primary transition-all">
            <Search className="w-4 h-4 text-gray-400" />
            <input 
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, symbol, or network..."
              className="w-full bg-transparent text-sm text-gray-900 dark:text-white outline-none placeholder:text-gray-400"
              autoFocus
            />
          </div>

          {/* Quick filter pills */}
          <div className="flex flex-wrap gap-2 mt-3">
            {SUPPORTED_TOKENS.slice(0, 4).map(t => (
              <motion.button
                key={t.symbol}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => { onSelect(t); onClose(); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                  selectedTokenSymbol === t.symbol
                    ? 'bg-primary/10 text-primary border-primary/30'
                    : 'bg-white dark:bg-[#181e2b] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-400'
                }`}
              >
                <img src={t.icon} alt={t.symbol} className="w-4 h-4 rounded-full object-contain" />
                <span>{t.symbol}</span>
                {t.isVerified && (
                  <span className="inline-flex items-center justify-center w-3 h-3 rounded-full bg-blue-500 text-white" title="Oficial">
                    <Check className="w-2 h-2 stroke-[3]" />
                  </span>
                )}
                {t.isSponsor && <Flame className="w-3 h-3 text-orange-500 fill-orange-500" />}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Token List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {filtered.length === 0 ? (
            <div className="text-center py-10 text-sm text-gray-400">
              No tokens found
            </div>
          ) : (
            filtered.map(t => {
              const isSelected = selectedTokenSymbol === t.symbol;
              return (
                <motion.button
                  key={t.symbol + t.network}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => { onSelect(t); onClose(); }}
                  className={`w-full flex items-center justify-between p-3.5 rounded-2xl transition-all text-left group ${
                    isSelected 
                      ? 'bg-primary/5 dark:bg-primary/10 border border-primary/20' 
                      : 'hover:bg-gray-50 dark:hover:bg-[#181e2b]'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-full bg-white dark:bg-[#202737] shadow-xs border border-gray-100 dark:border-gray-700 flex items-center justify-center p-1.5 shrink-0">
                      <img src={t.icon} alt={t.symbol} className="w-full h-full object-contain rounded-full" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-gray-900 dark:text-white text-base">
                          {t.symbol}
                        </span>
                        {t.isVerified && (
                          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-500 text-white shadow-2xs" title="Token Oficial Verificado">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </span>
                        )}
                        {t.isSponsor && (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 flex items-center gap-0.5">
                            <Flame className="w-2.5 h-2.5" /> BLAZE Sponsor
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 font-medium flex items-center gap-1.5">
                        <span>{t.name}</span>
                        <span>•</span>
                        <span className="text-gray-500 dark:text-gray-400">{t.networkBadge}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center">
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                </motion.button>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 text-center text-[11px] text-gray-400">
          Native Bitcoin Cash CashTokens & EVM Stablecoins
        </div>
      </motion.div>
    </div>
  );
}
