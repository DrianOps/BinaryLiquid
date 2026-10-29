import React, { useState, useEffect } from 'react';
import { 
  Droplets, 
  TrendingUp, 
  DollarSign, 
  Coins, 
  ArrowRight, 
  Plus, 
  Minus, 
  RefreshCw, 
  CheckCircle2, 
  Sparkles, 
  ExternalLink,
  ShieldAlert,
  PieChart,
  Percent,
  Wallet,
  Lock,
  Unlock,
  Flame,
  AlertCircle,
  ChevronDown,
  Info,
  Layers,
  ShieldCheck,
  Server,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

interface PoolData {
  id: string;
  pair: string;
  name: string;
  tokenA: string;
  tokenB: string;
  networkA: string;
  networkB: string;
  networkBadgeA: string;
  networkBadgeB: string;
  iconA: string;
  iconB: string;
  decimalsA: number;
  decimalsB: number;
  reserveA: number;
  reserveB: number;
  reserveAValueUsd: number;
  reserveBValueUsd: number;
  priceA: number;
  priceB: number;
  totalShares: number;
  targetTvlUsd: number;
  status: 'ACTIVE' | 'BOOTSTRAPPING';
  feePercent: number;
  lpFeePercent: number;
  protocolFeePercent: number;
  cumulativeFeesA: number;
  cumulativeFeesB: number;
  cumulativeFeesUsd: number;
  totalVolumeUsd: number;
  tvlUsd: number;
  apyPercentage: number;
  sharePriceUsd: number;
  fundingProgress: number;
  remainingFundingUsd: number;
  isSponsorPool?: boolean;
  sponsorTag?: string;
  isCustom?: boolean;
  poolMode?: 'BOOTSTRAPPING' | 'STANDARD';
  liquidityLocked?: boolean;
  creatorAddress?: string;
  categoryIdA?: string | null;
  creatorFeePercent?: number;
  isVerified?: boolean;
  verificationBadge?: string;
  creatorFeesEarnedA?: number;
  creatorFeesEarnedB?: number;
}

interface UserPosition {
  id: string;
  poolId: string;
  pair: string;
  providerAddress: string;
  shares: number;
  depositedAmount: number;
  tokenSymbol: string;
  depositUsd: number;
  createdAt: string;
  updatedAt: string;
  tokenA: string;
  tokenB: string;
  iconA: string;
  iconB: string;
  shareRatio: number;
  poolSharePercent: number;
  currentAmountA: number;
  currentAmountB: number;
  totalValueUsd: number;
  profitUsd: number;
  profitPercentage: number;
}

interface PoolsViewProps {
  backendUrl?: string;
  userAddress: string;
  onConnectWallet: () => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
}

export default function PoolsView({
  backendUrl = '',
  userAddress,
  onConnectWallet,
  showToast
}: PoolsViewProps) {
  const [allPools, setAllPools] = useState<PoolData[]>([]);
  const [protocolStats, setProtocolStats] = useState<any>(null);
  const [positions, setPositions] = useState<UserPosition[]>([]);
  const [walletBalances, setWalletBalances] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'bootstrapping' | 'my-positions'>('all');
  
  // Modal states
  const [actionModal, setActionModal] = useState<'add' | 'remove' | null>(null);
  const [selectedPool, setSelectedPool] = useState<PoolData | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<UserPosition | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [isCreatingPool, setIsCreatingPool] = useState<boolean>(false);

  // Create Pool Form State
  const [createForm, setCreateForm] = useState({
    tokenA: '',
    tokenAName: '',
    categoryIdA: '',
    decimalsA: '6',
    iconA: '',
    tokenB: 'USDC',
    tokenBName: 'USD Coin',
    networkB: 'Polygon (Mainnet)',
    networkBadgeB: 'Polygon PoS',
    poolMode: 'BOOTSTRAPPING' as 'BOOTSTRAPPING' | 'STANDARD',
    targetTvlUsd: '2500',
    initialAmountA: '1000000',
    initialAmountB: '0',
    initialPriceUsd: '0.0025'
  });

  // Add Liquidity form state
  const [depositToken, setDepositToken] = useState<string>('');
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Remove Liquidity form state
  const [burnPercentage, setBurnPercentage] = useState<number>(100);

  // Active address for balance calculation (fallback to default cold address if not yet connected)
  const effectiveAddress = userAddress || 'bitcoincash:qqgm9rel5xlyhwt3r6n8uq9fxk5zzxrcavaal6aw8v';

  // Fetch live pool statistics & all pools from backend
  const fetchPoolsData = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/pools/stats`);
      const data = await res.json();
      if (data.success) {
        if (data.allPools) setAllPools(data.allPools);
        if (data.protocolStats) setProtocolStats(data.protocolStats);
      }
    } catch (err) {
      console.warn('Failed to load pool stats:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch real non-custodial wallet balances
  const fetchWalletBalances = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/wallet/balances/${encodeURIComponent(effectiveAddress)}`);
      const data = await res.json();
      if (data.success && data.balances) {
        setWalletBalances(data.balances);
      }
    } catch (err) {
      console.warn('Failed to load wallet balances:', err);
    }
  };

  // Fetch user LP positions
  const fetchUserPositions = async () => {
    if (!userAddress) {
      setPositions([]);
      return;
    }
    try {
      const res = await fetch(`${backendUrl}/api/pools/positions/${encodeURIComponent(userAddress)}`);
      const data = await res.json();
      if (data.success && data.positions) {
        setPositions(data.positions);
      }
    } catch (err) {
      console.warn('Failed to load user positions:', err);
    }
  };

  const handleVerifyPool = async (poolId: string) => {
    try {
      const res = await fetch(`${backendUrl}/api/pools/${poolId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterAddress: effectiveAddress })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`¡Par verificado oficialmente! Insignia asignada.`, 'success');
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
        await fetchPoolsData();
      } else {
        showToast(data.error || 'No se pudo verificar el par', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Error de red', 'error');
    }
  };

  useEffect(() => {
    fetchPoolsData();
    fetchWalletBalances();
    fetchUserPositions();
    const interval = setInterval(() => {
      fetchPoolsData();
      fetchWalletBalances();
      fetchUserPositions();
    }, 6000);
    return () => clearInterval(interval);
  }, [backendUrl, userAddress, effectiveAddress]);

  // Open Add Liquidity modal for a pool
  const handleOpenAddModal = (pool: PoolData) => {
    setSelectedPool(pool);
    setDepositToken(pool.tokenA);
    setDepositAmount('');
    setActionModal('add');
  };

  // Available balance for the selected deposit token
  const getSelectedTokenBalance = (): number => {
    if (!depositToken) return 0;
    return walletBalances[depositToken.toUpperCase()] || 0;
  };

  // Quick percentage balance setter
  const handleSetQuickAmount = (pct: number) => {
    const bal = getSelectedTokenBalance();
    if (bal <= 0) return;
    const calc = (bal * (pct / 100));
    setDepositAmount(pct === 100 ? bal.toString() : calc.toFixed(4));
  };

  // Create Custom Pool Handler
  const handleCreatePool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.tokenA.trim()) {
      showToast('Por favor ingresa el símbolo del token de Bitcoin Cash (ej: BCHAD)', 'error');
      return;
    }
    if (createForm.categoryIdA && createForm.categoryIdA.trim().length !== 64) {
      showToast('El CashToken Category ID debe tener exactamente 64 caracteres hexadecimales', 'error');
      return;
    }

    setIsCreatingPool(true);
    try {
      const res = await fetch(`${backendUrl}/api/pools/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorAddress: effectiveAddress,
          tokenA: createForm.tokenA.trim().toUpperCase(),
          tokenB: createForm.tokenB.trim().toUpperCase(),
          tokenAName: createForm.tokenAName.trim() || createForm.tokenA.trim().toUpperCase(),
          tokenBName: createForm.tokenBName,
          networkA: 'Bitcoin Cash (Mainnet)',
          networkB: createForm.networkB,
          networkBadgeA: 'BCH CashTokens',
          networkBadgeB: createForm.networkBadgeB,
          categoryIdA: createForm.categoryIdA.trim() || null,
          iconA: createForm.iconA.trim() || null,
          decimalsA: parseInt(createForm.decimalsA, 10) || 6,
          decimalsB: 6,
          poolMode: createForm.poolMode,
          targetTvlUsd: parseFloat(createForm.targetTvlUsd) || 2500,
          initialAmountA: parseFloat(createForm.initialAmountA) || 0,
          initialAmountB: parseFloat(createForm.initialAmountB) || 0,
          initialPriceUsd: parseFloat(createForm.initialPriceUsd) || 0.0025
        })
      });

      const data = await res.json();
      setIsCreatingPool(false);

      if (data.success) {
        showToast(data.message || '¡Par de liquidez creado con éxito!', 'success');
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#0AC18E', '#F7931A', '#8B5CF6', '#FFFFFF']
        });
        setCreateModalOpen(false);
        setCreateForm({
          tokenA: '',
          tokenAName: '',
          categoryIdA: '',
          decimalsA: '6',
          iconA: '',
          tokenB: 'USDC',
          tokenBName: 'USD Coin',
          networkB: 'Polygon (Mainnet)',
          networkBadgeB: 'Polygon PoS',
          poolMode: 'BOOTSTRAPPING',
          targetTvlUsd: '2500',
          initialAmountA: '1000000',
          initialAmountB: '0',
          initialPriceUsd: '0.0025'
        });
        await fetchPoolsData();
      } else {
        showToast(data.error || 'Error al crear el par', 'error');
      }
    } catch (err: any) {
      setIsCreatingPool(false);
      showToast(err.message || 'Error de conexión con el servidor', 'error');
    }
  };


  // Calculations for Add Liquidity preview
  const calcEstimatedShares = () => {
    if (!selectedPool) return 0;
    const num = parseFloat(depositAmount);
    if (isNaN(num) || num <= 0) return 0;
    const price = depositToken === selectedPool.tokenA ? selectedPool.priceA : selectedPool.priceB;
    const depositUsd = num * price;
    if (selectedPool.tvlUsd <= 0) return depositUsd;
    return (depositUsd / selectedPool.tvlUsd) * selectedPool.totalShares;
  };

  const calcNewPoolSharePercent = () => {
    if (!selectedPool) return '0.000';
    const shares = calcEstimatedShares();
    const newTotal = selectedPool.totalShares + shares;
    if (newTotal <= 0) return '0.000';
    return ((shares / newTotal) * 100).toFixed(3);
  };

  const calcEstimatedAnnualYieldUsd = () => {
    if (!selectedPool) return 0;
    const num = parseFloat(depositAmount);
    if (isNaN(num) || num <= 0) return 0;
    const price = depositToken === selectedPool.tokenA ? selectedPool.priceA : selectedPool.priceB;
    const depositUsd = num * price;
    return Number(((depositUsd * (selectedPool.apyPercentage / 100))).toFixed(2));
  };

  // Submit Add Liquidity
  const handleAddLiquidity = async () => {
    const num = parseFloat(depositAmount);
    const bal = getSelectedTokenBalance();

    if (isNaN(num) || num <= 0) {
      showToast('Introduce un monto de depósito válido', 'error');
      return;
    }
    if (num > bal) {
      showToast(`Saldo insuficiente. Tienes ${bal.toLocaleString()} ${depositToken}`, 'error');
      return;
    }
    if (!selectedPool) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`${backendUrl}/api/pools/add-liquidity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerAddress: effectiveAddress,
          token: depositToken,
          amount: num,
          poolId: selectedPool.id
        })
      });
      const data = await res.json();

      if (data.success) {
        if (data.unlockedNow) {
          showToast(`🎉 ¡Felicidades! Tu depósito completó la meta de fondeo. ¡${selectedPool.pair} ahora está 100% ACTIVO en Mainnet!`, 'success');
        } else {
          showToast(`¡Depositados ${num} ${depositToken} con éxito! Recibiste ${data.sharesMinted} LP Shares.`, 'success');
        }
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        setActionModal(null);
        setDepositAmount('');
        await Promise.all([fetchPoolsData(), fetchWalletBalances(), fetchUserPositions()]);
      } else {
        showToast(data.error || 'Fallo al agregar liquidez', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error de red', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Remove Liquidity
  const handleRemoveLiquidity = async () => {
    if (!selectedPosition) return;
    const sharesToBurn = (selectedPosition.shares * (burnPercentage / 100));
    if (sharesToBurn <= 0) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`${backendUrl}/api/pools/remove-liquidity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          positionId: selectedPosition.id,
          providerAddress: effectiveAddress,
          sharesToBurn: Number(sharesToBurn.toFixed(4)),
          poolId: selectedPosition.poolId
        })
      });
      const data = await res.json();

      if (data.success) {
        showToast(`¡Rescatadas ${burnPercentage}% acciones! Recibiste ${data.payout.amountA} ${data.payout.tokenA} + ${data.payout.amountB} ${data.payout.tokenB} ($${data.payout.totalUsdValue} USD) directamente en tu billetera.`, 'success');
        confetti({ particleCount: 60, spread: 50, origin: { y: 0.65 } });
        setActionModal(null);
        setSelectedPosition(null);
        await Promise.all([fetchPoolsData(), fetchWalletBalances(), fetchUserPositions()]);
      } else {
        showToast(data.error || 'Fallo al retirar liquidez', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error de red', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered pools
  const filteredPools = allPools.filter(p => {
    if (activeTab === 'active') return p.status === 'ACTIVE';
    if (activeTab === 'bootstrapping') return p.status === 'BOOTSTRAPPING';
    return true;
  });

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-6 sm:py-10 selection:bg-orange-500 selection:text-white">
      
      {/* HEADER SECTION */}
      <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold uppercase tracking-wider mb-3">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Mainnet Cross-Chain AMM Liquidity</span>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-950 dark:text-white tracking-tight">
          Liquidity Pools & Automated Yield
        </h1>
        <p className="text-xs sm:text-sm md:text-base text-gray-500 dark:text-gray-400 mt-2 sm:mt-3 leading-relaxed">
          Provee liquidez en la red principal de <strong className="text-gray-900 dark:text-white font-semibold">Bitcoin Cash Mainnet</strong> y <strong className="text-gray-900 dark:text-white font-semibold">Polygon PoS</strong>. Gana comisiones pasivas del <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">0.20% de cada swap</strong> auto-compuestas en las reservas sin pérdida impermanente en pares estables.
        </p>
      </div>

      {/* PROTOCOL METRICS STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#121622] border border-gray-200/80 dark:border-gray-800 shadow-2xs">
          <div className="flex items-center justify-between text-gray-400 mb-1.5 sm:mb-2">
            <span className="text-[11px] sm:text-xs font-medium">TVL Total del Protocolo</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 dark:text-white font-mono">
            ${(protocolStats?.totalTvlUsd ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] sm:text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-1 inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            100% Solvente en Mainnet
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#121622] border border-gray-200/80 dark:border-gray-800 shadow-2xs">
          <div className="flex items-center justify-between text-gray-400 mb-1.5 sm:mb-2">
            <span className="text-[11px] sm:text-xs font-medium">Volumen Acumulado</span>
            <TrendingUp className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-xl sm:text-2xl md:text-3xl font-black text-orange-500 font-mono">
            ${(protocolStats?.totalVolumeUsd ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] sm:text-[11px] text-gray-400 font-medium mt-1 block">
            En Pares On-Chain Verificados
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#121622] border border-gray-200/80 dark:border-gray-800 shadow-2xs">
          <div className="flex items-center justify-between text-gray-400 mb-1.5 sm:mb-2">
            <span className="text-[11px] sm:text-xs font-medium">Comisiones a LPs Pagadas</span>
            <Coins className="w-4 h-4 text-primary" />
          </div>
          <div className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 dark:text-white font-mono">
            ${(protocolStats?.totalCumulativeFeesUsd ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] sm:text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1 block">
            0.20% a LPs • 0.10% Tesorería
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#121622] border border-gray-200/80 dark:border-gray-800 shadow-2xs">
          <div className="flex items-center justify-between text-gray-400 mb-1.5 sm:mb-2">
            <span className="text-[11px] sm:text-xs font-medium">Pares Activos / Fondeo</span>
            <PieChart className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 dark:text-white font-mono flex items-baseline gap-1.5">
            <span>{protocolStats?.activePoolsCount ?? 0}</span>
            <span className="text-xs text-emerald-500 font-bold uppercase">Activos</span>
            <span className="text-xs text-gray-400">/</span>
            <span>{protocolStats?.bootstrappingPoolsCount ?? 0}</span>
            <span className="text-xs text-amber-500 font-bold uppercase">Meta</span>
          </div>
          <span className="text-[10px] sm:text-[11px] text-gray-400 font-medium mt-1 block">
            Desbloqueo automático al 100%
          </span>
        </div>
      </div>

      {/* FILTER TABS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-gray-100/90 dark:bg-[#131826] border border-gray-200/70 dark:border-gray-800">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'all' 
                ? 'bg-white dark:bg-[#1e2538] text-gray-950 dark:text-white shadow-xs' 
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Todos los Pools ({allPools.length})
          </button>

          <button
            onClick={() => setActiveTab('active')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'active' 
                ? 'bg-white dark:bg-[#1e2538] text-emerald-600 dark:text-emerald-400 shadow-xs' 
                : 'text-gray-500 dark:text-gray-400 hover:text-emerald-600'
            }`}
          >
            Activos ({allPools.filter(p => p.status === 'ACTIVE').length})
          </button>

          <button
            onClick={() => setActiveTab('bootstrapping')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'bootstrapping' 
                ? 'bg-white dark:bg-[#1e2538] text-amber-600 dark:text-amber-400 shadow-xs' 
                : 'text-gray-500 dark:text-gray-400 hover:text-amber-600'
            }`}
          >
            En Fondeo / Meta ({allPools.filter(p => p.status === 'BOOTSTRAPPING').length})
          </button>

          <button
            onClick={() => setActiveTab('my-positions')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'my-positions' 
                ? 'bg-white dark:bg-[#1e2538] text-primary shadow-xs' 
                : 'text-gray-500 dark:text-gray-400 hover:text-primary'
            }`}
          >
            Mis Posiciones {positions.length > 0 && `(${positions.length})`}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-orange-600 text-white text-xs font-bold transition-all shadow-md shadow-orange-500/20 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Crear Nuevo Par</span>
          </button>

          <button 
            onClick={() => { fetchPoolsData(); fetchWalletBalances(); fetchUserPositions(); }}
            className="text-xs text-gray-400 hover:text-primary transition-colors flex items-center gap-1.5 cursor-pointer font-bold px-2 py-1.5"
            title="Actualizar Datos"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* POOLS GRID */}
      {activeTab !== 'my-positions' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 mb-10">
          {filteredPools.map(pool => (
            <motion.div
              key={pool.id}
              whileHover={{ y: -2 }}
              className="rounded-3xl bg-white dark:bg-[#121622] border border-gray-200/90 dark:border-gray-800/90 p-5 sm:p-6 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* POOL HEADER WITH LOGOS AND BADGES */}
                <div className="flex items-start justify-between gap-3 pb-4 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-3">
                    {/* OVERLAPPING COIN LOGOS */}
                    <div className="flex -space-x-3 shrink-0">
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gray-50 dark:bg-[#1a2130] border-2 border-white dark:border-[#121622] flex items-center justify-center p-1 shadow-xs">
                        <img src={pool.iconA} alt={pool.tokenA} className="w-full h-full object-contain rounded-full" />
                      </div>
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gray-50 dark:bg-[#1a2130] border-2 border-white dark:border-[#121622] flex items-center justify-center p-1 shadow-xs">
                        <img src={pool.iconB} alt={pool.tokenB} className="w-full h-full object-contain rounded-full" />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-extrabold text-base sm:text-lg text-gray-950 dark:text-white leading-tight">
                          {pool.pair}
                        </h3>
                        {pool.isSponsorPool && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                            <Flame className="w-3 h-3 fill-amber-500" /> Patrocinador BLAZE
                          </span>
                        )}
                        {pool.isCustom && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 border ${
                            pool.poolMode === 'BOOTSTRAPPING'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
                          }`}>
                            {pool.poolMode === 'BOOTSTRAPPING' ? (
                              <>
                                <Lock className="w-3 h-3 text-amber-500" />
                                <span>Anti-Rug Lock • Meta ${(pool.targetTvlUsd || 0).toLocaleString()}</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3 h-3 text-emerald-500" />
                                <span>Par Estándar (Uniswap)</span>
                              </>
                            )}
                          </span>
                        )}

                        {/* TOKEN VERIFICATION BADGE */}
                        {pool.isVerified ? (
                          <span className="text-[10px] font-bold text-blue-500 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Check className="w-3 h-3 text-blue-500" />
                            <span>Verificado Oficial</span>
                          </span>
                        ) : pool.isCustom ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                              Comunitario
                            </span>
                            <button
                              type="button"
                              onClick={() => handleVerifyPool(pool.id)}
                              className="text-[10px] font-bold text-blue-500 hover:text-blue-400 underline cursor-pointer"
                              title="Verificar este token con insignia de confianza"
                            >
                              Verificar (5 PUSD)
                            </button>
                          </div>
                        ) : null}

                        {pool.categoryIdA && (
                          <a
                            href={`https://3xpl.com/bitcoin-cash/token/${pool.categoryIdA}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-gray-400 hover:text-primary font-mono flex items-center gap-1"
                            title="Ver CashToken en explorador de bloques"
                          >
                            <span>Cat: {pool.categoryIdA.substring(0, 8)}...</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                        {pool.networkBadgeA} ⟷ {pool.networkBadgeB}
                      </p>
                    </div>
                  </div>

                  {/* STATUS BADGE */}
                  <div className="shrink-0">
                    {pool.status === 'ACTIVE' ? (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Activo
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1.5">
                        <Lock className="w-3 h-3 text-amber-500" />
                        Fondeo
                      </span>
                    )}
                  </div>
                </div>

                {/* BOOTSTRAPPING GOAL PROGRESS BAR (IF IN FUNDING MODE) */}
                {pool.status === 'BOOTSTRAPPING' && (
                  <div className="mt-3.5 p-3 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20">
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        Meta de Desbloqueo ({pool.fundingProgress}%)
                      </span>
                      <span className="font-mono text-gray-600 dark:text-gray-300 font-semibold">
                        ${pool.tvlUsd.toLocaleString()} / ${pool.targetTvlUsd.toLocaleString()} USD
                      </span>
                    </div>

                    <div className="w-full bg-gray-200 dark:bg-gray-700 h-2.5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${pool.fundingProgress}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full"
                      />
                    </div>

                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1.5">
                      Aporta los <strong className="text-gray-900 dark:text-white">${pool.remainingFundingUsd.toLocaleString()} USD</strong> restantes para desbloquear automáticamente los swaps instantáneos en este par.
                    </p>
                  </div>
                )}

                {/* METRICS ROW */}
                <div className="grid grid-cols-3 gap-2 py-4 my-1">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">TVL del Pool</span>
                    <span className="text-sm sm:text-base font-black text-gray-900 dark:text-white font-mono">
                      ${pool.tvlUsd.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">APY Anual</span>
                    <span className="text-sm sm:text-base font-black text-orange-500 font-mono">
                      {pool.apyPercentage}%
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">Comisión a LPs</span>
                    <span className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
                      0.20%
                    </span>
                  </div>
                </div>

                {/* RESERVES BREAKDOWN */}
                <div className="p-3 rounded-2xl bg-gray-50 dark:bg-[#161c28] border border-gray-100 dark:border-gray-800 text-xs space-y-1.5 mb-4">
                  <div className="flex justify-between items-center text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1.5">
                      <img src={pool.iconA} className="w-3.5 h-3.5 rounded-full" alt="" />
                      <span>Reserva {pool.tokenA}:</span>
                    </span>
                    <span className="font-mono font-bold text-gray-900 dark:text-white">
                      {pool.reserveA.toLocaleString()} {pool.tokenA} (${pool.reserveAValueUsd.toLocaleString()})
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1.5">
                      <img src={pool.iconB} className="w-3.5 h-3.5 rounded-full" alt="" />
                      <span>Reserva {pool.tokenB}:</span>
                    </span>
                    <span className="font-mono font-bold text-gray-900 dark:text-white">
                      {pool.reserveB.toLocaleString()} {pool.tokenB} (${pool.reserveBValueUsd.toLocaleString()})
                    </span>
                  </div>
                </div>
              </div>

              {/* ACTION BUTTON */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleOpenAddModal(pool)}
                className="w-full py-3 rounded-2xl font-bold text-xs sm:text-sm bg-primary hover:bg-orange-600 text-white shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all mt-2"
              >
                <Plus className="w-4 h-4" /> Aportar Liquidez & Ganar Rendimiento
              </motion.button>
            </motion.div>
          ))}
        </div>
      ) : null}

      {/* USER POSITIONS TABLE VIEW */}
      <div className={`rounded-3xl bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 p-5 sm:p-8 shadow-sm ${activeTab !== 'my-positions' ? 'mt-8' : ''}`}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <h3 className="text-lg sm:text-xl font-black text-gray-950 dark:text-white">
              Mis Posiciones de Liquidez Activas
            </h3>
            {positions.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-500/10 text-primary border border-orange-500/20">
                {positions.length}
              </span>
            )}
          </div>

          <button 
            onClick={() => { fetchUserPositions(); fetchWalletBalances(); }}
            className="text-xs text-gray-400 hover:text-primary transition-colors flex items-center gap-1.5 cursor-pointer font-bold"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Actualizar
          </button>
        </div>

        {positions.length === 0 ? (
          <div className="py-14 text-center text-gray-400 space-y-3">
            <Droplets className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600" />
            <h4 className="font-bold text-base text-gray-900 dark:text-white">No tienes posiciones de liquidez aún</h4>
            <p className="text-xs sm:text-sm max-w-md mx-auto text-gray-500">
              Aporta liquidez en cualquiera de los 8 pools para acumular automáticamente el 0.20% de todas las transacciones en tu saldo.
            </p>
            <button
              onClick={() => setActiveTab('all')}
              className="px-5 py-2.5 rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-gray-950 text-xs font-bold hover:opacity-90 cursor-pointer transition-all"
            >
              Explorar Pools
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-100 dark:border-gray-800 text-gray-400 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-3">Par</th>
                  <th className="py-3 px-3">Acciones (LP Shares)</th>
                  <th className="py-3 px-3">Participación</th>
                  <th className="py-3 px-3">Depósito Inicial</th>
                  <th className="py-3 px-3">Valor Actual</th>
                  <th className="py-3 px-3">Rendimiento Ganado</th>
                  <th className="py-3 px-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {positions.map(pos => (
                  <tr key={pos.id} className="hover:bg-gray-50/50 dark:hover:bg-[#161c28]/50 transition-colors">
                    <td className="py-4 px-3">
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2 shrink-0">
                          <img src={pos.iconA} className="w-6 h-6 rounded-full border border-white dark:border-[#121622]" alt="" />
                          <img src={pos.iconB} className="w-6 h-6 rounded-full border border-white dark:border-[#121622]" alt="" />
                        </div>
                        <span className="font-bold text-gray-900 dark:text-white text-sm">{pos.pair}</span>
                      </div>
                    </td>
                    <td className="py-4 px-3 font-mono font-bold text-gray-900 dark:text-white">
                      {pos.shares.toFixed(4)}
                    </td>
                    <td className="py-4 px-3 font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                      {pos.poolSharePercent}%
                    </td>
                    <td className="py-4 px-3 font-mono text-gray-500">
                      ${(pos.depositUsd || pos.depositedAmount).toFixed(2)}
                    </td>
                    <td className="py-4 px-3 font-mono font-bold text-gray-900 dark:text-white text-sm">
                      ${pos.totalValueUsd.toFixed(2)}
                    </td>
                    <td className="py-4 px-3 font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                      +${pos.profitUsd.toFixed(4)} ({pos.profitPercentage}%)
                    </td>
                    <td className="py-4 px-3 text-right">
                      <button
                        onClick={() => {
                          setSelectedPosition(pos);
                          setBurnPercentage(100);
                          setActionModal('remove');
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-bold text-xs cursor-pointer transition-all"
                      >
                        Retirar Fondos
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD LIQUIDITY MODAL */}
      <AnimatePresence>
        {actionModal === 'add' && selectedPool && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white dark:bg-[#121622] rounded-3xl p-6 sm:p-7 border border-gray-200 dark:border-gray-800 shadow-2xl relative"
            >
              <div className="flex justify-between items-center mb-5">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    <img src={selectedPool.iconA} className="w-6 h-6 rounded-full" alt="" />
                    <img src={selectedPool.iconB} className="w-6 h-6 rounded-full" alt="" />
                  </div>
                  <h3 className="text-lg font-black text-gray-950 dark:text-white">
                    Aportar Liquidez • {selectedPool.pair}
                  </h3>
                </div>
                <button 
                  onClick={() => setActionModal(null)}
                  className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* TOKEN SELECTOR TABS */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => { setDepositToken(selectedPool.tokenA); setDepositAmount(''); }}
                  className={`flex-1 py-2.5 px-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    depositToken === selectedPool.tokenA 
                      ? 'bg-primary text-white shadow-sm' 
                      : 'bg-gray-100 dark:bg-[#171d2c] text-gray-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <img src={selectedPool.iconA} className="w-4 h-4 rounded-full" alt="" />
                  <span>Depositar {selectedPool.tokenA}</span>
                </button>

                <button
                  onClick={() => { setDepositToken(selectedPool.tokenB); setDepositAmount(''); }}
                  className={`flex-1 py-2.5 px-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    depositToken === selectedPool.tokenB 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'bg-gray-100 dark:bg-[#171d2c] text-gray-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <img src={selectedPool.iconB} className="w-4 h-4 rounded-full" alt="" />
                  <span>Depositar {selectedPool.tokenB}</span>
                </button>
              </div>

              {/* AMOUNT INPUT BOX */}
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#161c28] border border-gray-100 dark:border-gray-800 mb-4">
                <div className="flex justify-between items-center text-xs text-gray-400 mb-1.5">
                  <span>Monto a Depositar</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono">
                      Saldo: <strong className="text-gray-900 dark:text-white font-bold">{getSelectedTokenBalance().toLocaleString()} {depositToken}</strong>
                    </span>
                    {getSelectedTokenBalance() > 0 && (
                      <button
                        type="button"
                        onClick={() => setDepositAmount(String(getSelectedTokenBalance()))}
                        className="text-[10px] font-bold text-primary hover:text-orange-600 bg-primary/10 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                      >
                        MAX
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={e => setDepositAmount(e.target.value)}
                    placeholder="0.0"
                    className="w-full bg-transparent text-2xl font-mono font-bold text-gray-900 dark:text-white outline-none"
                  />
                  <span className="font-bold text-sm text-gray-700 dark:text-gray-200 shrink-0">
                    {depositToken}
                  </span>
                </div>

                {/* QUICK PERCENTAGE CHIPS */}
                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200/50 dark:border-gray-700/50">
                  {[25, 50, 75, 100].map(pct => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handleSetQuickAmount(pct)}
                      className="flex-1 py-1 rounded-lg text-[10px] font-bold bg-gray-200/60 dark:bg-gray-800 hover:bg-primary/20 hover:text-primary dark:hover:text-primary transition-all cursor-pointer"
                    >
                      {pct === 100 ? 'MAX' : `${pct}%`}
                    </button>
                  ))}
                </div>
              </div>

              {/* REAL-TIME PREVIEW METRICS */}
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#161c28] border border-gray-100 dark:border-gray-800 text-xs space-y-2 mb-6">
                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>Acciones de Liquidez a Recibir:</span>
                  <span className="font-mono font-bold text-gray-900 dark:text-white">
                    {calcEstimatedShares().toFixed(4)} LP Shares
                  </span>
                </div>

                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>Tu Participación Resultante:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {calcNewPoolSharePercent()}%
                  </span>
                </div>

                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>Rendimiento Proyectado (1 año):</span>
                  <span className="font-mono font-bold text-orange-500">
                    +${calcEstimatedAnnualYieldUsd().toFixed(2)} USD ({selectedPool.apyPercentage}%)
                  </span>
                </div>

                {selectedPool.status === 'BOOTSTRAPPING' && (
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700 text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1.5 font-medium">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span>¡Tu depósito acerca este pool a la meta de $10,000 USD para desbloquearlo!</span>
                  </div>
                )}
              </div>

              {/* SUBMIT BUTTON */}
              <button
                onClick={handleAddLiquidity}
                disabled={isSubmitting}
                className="w-full py-4 rounded-2xl font-bold text-sm bg-primary hover:bg-orange-600 text-white shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Emitiendo Acciones de Liquidez...
                  </>
                ) : (
                  'Confirmar y Depositar Liquidez'
                )}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* REMOVE LIQUIDITY MODAL */}
      <AnimatePresence>
        {actionModal === 'remove' && selectedPosition && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white dark:bg-[#121622] rounded-3xl p-6 sm:p-7 border border-gray-200 dark:border-gray-800 shadow-2xl relative"
            >
              <div className="flex justify-between items-center mb-5">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    <img src={selectedPosition.iconA} className="w-6 h-6 rounded-full" alt="" />
                    <img src={selectedPosition.iconB} className="w-6 h-6 rounded-full" alt="" />
                  </div>
                  <h3 className="text-lg font-black text-gray-950 dark:text-white">
                    Retirar Liquidez • {selectedPosition.pair}
                  </h3>
                </div>
                <button 
                  onClick={() => { setActionModal(null); setSelectedPosition(null); }}
                  className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* SLIDER TO SELECT PERCENTAGE */}
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#161c28] border border-gray-100 dark:border-gray-800 mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-gray-400 font-bold uppercase">Porcentaje a Retirar</span>
                  <span className="text-lg font-black text-primary font-mono">{burnPercentage}%</span>
                </div>

                <input
                  type="range"
                  min="1"
                  max="100"
                  value={burnPercentage}
                  onChange={e => setBurnPercentage(parseInt(e.target.value, 10))}
                  className="w-full accent-orange-500 cursor-pointer"
                />

                <div className="flex gap-2 mt-3">
                  {[25, 50, 75, 100].map(pct => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setBurnPercentage(pct)}
                      className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                        burnPercentage === pct 
                          ? 'bg-primary text-white shadow-xs' 
                          : 'bg-gray-200/60 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              {/* PAYOUT METRICS */}
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#161c28] border border-gray-100 dark:border-gray-800 text-xs space-y-2.5 mb-6">
                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>Acciones a Quemar:</span>
                  <span className="font-mono font-bold text-gray-900 dark:text-white">
                    {(selectedPosition.shares * (burnPercentage / 100)).toFixed(4)} / {selectedPosition.shares.toFixed(4)}
                  </span>
                </div>

                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>Pago a recibir ({selectedPosition.tokenA}):</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {(selectedPosition.currentAmountA * (burnPercentage / 100)).toFixed(4)} {selectedPosition.tokenA}
                  </span>
                </div>

                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>Pago a recibir ({selectedPosition.tokenB}):</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                    {(selectedPosition.currentAmountB * (burnPercentage / 100)).toFixed(4)} {selectedPosition.tokenB}
                  </span>
                </div>

                <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between font-bold">
                  <span className="text-gray-900 dark:text-white">Retorno Total en USD:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                    ${(selectedPosition.totalValueUsd * (burnPercentage / 100)).toFixed(2)} USD
                  </span>
                </div>

                <div className="flex justify-between text-[11px] text-gray-500">
                  <span>Ganancia Neta por Comisiones:</span>
                  <span className="font-mono font-bold text-orange-500">
                    +${(selectedPosition.profitUsd * (burnPercentage / 100)).toFixed(4)} ({selectedPosition.profitPercentage}%)
                  </span>
                </div>
              </div>

              {/* ACTION BUTTON */}
              <button
                onClick={handleRemoveLiquidity}
                disabled={isSubmitting}
                className="w-full py-4 rounded-2xl font-bold text-sm bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Quemando Acciones y Acreditando Fondos...
                  </>
                ) : (
                  'Quemar Acciones y Retirar Fondos a Billetera'
                )}
              </button>
            </motion.div>
          </div>
        )}

        {/* CREATE CUSTOM POOL MODAL */}
        {createModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-white dark:bg-[#121622] rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-2xl space-y-4 my-8"
            >
              {/* MODAL HEADER */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base sm:text-lg text-gray-900 dark:text-white">
                      Crear Nuevo Par de Liquidez
                    </h3>
                    <p className="text-xs text-gray-400">
                      Conecta un CashToken de Bitcoin Cash con cualquier red
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="p-2 rounded-xl text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreatePool} className="space-y-4 text-xs">
                {/* TOKEN A: BITCOIN CASH TOKEN */}
                <div className="p-3 rounded-2xl bg-gray-50 dark:bg-[#161c28] border border-gray-200/80 dark:border-gray-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                      1. Token de Bitcoin Cash (Base)
                    </span>
                    <span className="text-[10px] text-orange-500 font-mono font-bold bg-orange-500/10 px-2 py-0.5 rounded-full">
                      BCH Layer 1
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-1">Símbolo (Ticker):</label>
                      <input
                        type="text"
                        required
                        value={createForm.tokenA}
                        onChange={(e) => setCreateForm({ ...createForm, tokenA: e.target.value.toUpperCase() })}
                        placeholder="Ej: BCHAD"
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#121622] border border-gray-200 dark:border-gray-700 font-bold text-gray-900 dark:text-white focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-1">Nombre del Proyecto:</label>
                      <input
                        type="text"
                        value={createForm.tokenAName}
                        onChange={(e) => setCreateForm({ ...createForm, tokenAName: e.target.value })}
                        placeholder="Ej: BCH Chad Token"
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#121622] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-400 block mb-1 flex items-center justify-between">
                      <span>CashToken Category ID (64 hex):</span>
                      <span className="text-[10px] text-gray-400">Opcional si es BCH nativo</span>
                    </label>
                    <input
                      type="text"
                      value={createForm.categoryIdA}
                      onChange={(e) => setCreateForm({ ...createForm, categoryIdA: e.target.value.toLowerCase() })}
                      placeholder="64 caracteres hex del contrato CashToken en BCH..."
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#121622] border border-gray-200 dark:border-gray-700 font-mono text-[11px] text-gray-900 dark:text-white focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-400 block mb-1 flex items-center justify-between">
                      <span>URL del Logo o Hash IPFS (ipfs://...):</span>
                      <span className="text-[10px] text-emerald-500 font-mono">BCMR Compatible</span>
                    </label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={createForm.iconA}
                        onChange={(e) => setCreateForm({ ...createForm, iconA: e.target.value })}
                        placeholder="ipfs://bafy... o https://..."
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#121622] border border-gray-200 dark:border-gray-700 font-mono text-[11px] text-gray-900 dark:text-white focus:outline-none focus:border-primary"
                      />
                      {createForm.iconA && (
                        <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 p-0.5 border border-gray-200 dark:border-gray-700 shrink-0 flex items-center justify-center overflow-hidden">
                          <img 
                            src={createForm.iconA.startsWith('ipfs://') ? `https://ipfs.io/ipfs/${createForm.iconA.replace('ipfs://', '')}` : createForm.iconA} 
                            alt="Logo" 
                            className="w-full h-full object-contain rounded"
                            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* TOKEN B: COUNTERPARTY TOKEN */}
                <div className="p-3 rounded-2xl bg-gray-50 dark:bg-[#161c28] border border-gray-200/80 dark:border-gray-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      2. Token de Contraparte (Cotización)
                    </span>
                    <span className="text-[10px] text-blue-500 font-mono font-bold bg-blue-500/10 px-2 py-0.5 rounded-full">
                      Cross-Chain o Intra-BCH
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-1">Red y Token:</label>
                      <select
                        value={createForm.tokenB}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'USDC') {
                            setCreateForm({
                              ...createForm,
                              tokenB: 'USDC',
                              tokenBName: 'USD Coin',
                              networkB: 'Polygon (Mainnet)',
                              networkBadgeB: 'Polygon PoS'
                            });
                          } else if (val === 'USDT') {
                            setCreateForm({
                              ...createForm,
                              tokenB: 'USDT',
                              tokenBName: 'Tether USD',
                              networkB: 'Polygon (Mainnet)',
                              networkBadgeB: 'Polygon PoS'
                            });
                          } else if (val === 'PUSD') {
                            setCreateForm({
                              ...createForm,
                              tokenB: 'PUSD',
                              tokenBName: 'ParyonUSD',
                              networkB: 'Bitcoin Cash (Mainnet)',
                              networkBadgeB: 'BCH CashTokens'
                            });
                          } else if (val === 'BCH') {
                            setCreateForm({
                              ...createForm,
                              tokenB: 'BCH',
                              tokenBName: 'Bitcoin Cash',
                              networkB: 'Bitcoin Cash (Mainnet)',
                              networkBadgeB: 'BCH Layer 1'
                            });
                          }
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#121622] border border-gray-200 dark:border-gray-700 font-bold text-gray-900 dark:text-white focus:outline-none focus:border-primary"
                      >
                        <option value="USDC">USDC (Polygon Mainnet)</option>
                        <option value="USDT">USDT (Polygon Mainnet)</option>
                        <option value="PUSD">PUSD (BCH CashTokens)</option>
                        <option value="BCH">BCH Nativo</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-gray-400 block mb-1">Precio Inicial Estimado ($):</label>
                      <input
                        type="number"
                        step="any"
                        value={createForm.initialPriceUsd}
                        onChange={(e) => setCreateForm({ ...createForm, initialPriceUsd: e.target.value })}
                        placeholder="0.0025"
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#121622] border border-gray-200 dark:border-gray-700 font-mono font-bold text-gray-900 dark:text-white focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                </div>

                {/* MODALIDAD DE LANZAMIENTO (LAS 2 OPCIONES DEL USUARIO) */}
                <div className="space-y-2">
                  <span className="font-bold text-gray-900 dark:text-white uppercase tracking-wider text-[11px] block">
                    3. Elige la Modalidad de tu Par
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* OPTION 1: BOOTSTRAPPING (ANTI-RUG RECAUDO) */}
                    <div
                      onClick={() => setCreateForm({ ...createForm, poolMode: 'BOOTSTRAPPING' })}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        createForm.poolMode === 'BOOTSTRAPPING'
                          ? 'bg-amber-500/10 border-amber-500 dark:border-amber-500 shadow-xs'
                          : 'bg-gray-50 dark:bg-[#161c28] border-gray-200 dark:border-gray-800 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-extrabold text-amber-600 dark:text-amber-400 flex items-center gap-1 text-xs">
                          <Lock className="w-3.5 h-3.5" />
                          Opción 1: Recaudo de Fondo
                        </span>
                        <span className="text-[9px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-300 px-1.5 py-0.5 rounded">
                          Anti-Rug Lock
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-snug">
                        Tú aportas tu token pero <strong>no puedes drenar la liquidez</strong> (Fondos Bloqueados). Ganas el <strong>0.10% de comisión continua</strong> de cada swap y los LPs el <strong>0.20%</strong>. Si tú también aportas liquidez de contraparte, ¡ganas ambas comisiones!
                      </p>
                    </div>

                    {/* OPTION 2: STANDARD UNISWAP-STYLE */}
                    <div
                      onClick={() => setCreateForm({ ...createForm, poolMode: 'STANDARD' })}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        createForm.poolMode === 'STANDARD'
                          ? 'bg-emerald-500/10 border-emerald-500 dark:border-emerald-500 shadow-xs'
                          : 'bg-gray-50 dark:bg-[#161c28] border-gray-200 dark:border-gray-800 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 text-xs">
                          <Sparkles className="w-3.5 h-3.5" />
                          Opción 2: Par Estándar AMM
                        </span>
                        <span className="text-[9px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 px-1.5 py-0.5 rounded">
                          Uniswap V2
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-snug">
                        Aportas la liquidez de ambos tokens tú mismo. El par queda <strong>activo de inmediato</strong> para trading libre. Ganas el <strong>0.20% de comisiones LP</strong> con retiro estándar.
                      </p>
                    </div>
                  </div>
                </div>

                {/* DYNAMIC FORM INPUTS BASED ON MODE */}
                {createForm.poolMode === 'BOOTSTRAPPING' ? (
                  <div className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-gray-400 block mb-1">
                          Tokens {createForm.tokenA || 'Base'} a Depositar:
                        </label>
                        <input
                          type="number"
                          value={createForm.initialAmountA}
                          onChange={(e) => setCreateForm({ ...createForm, initialAmountA: e.target.value })}
                          placeholder="1000000"
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#121622] border border-gray-200 dark:border-gray-700 font-mono font-bold text-gray-900 dark:text-white focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 block mb-1">
                          Meta de Recaudo (Target TVL en USD):
                        </label>
                        <input
                          type="number"
                          value={createForm.targetTvlUsd}
                          onChange={(e) => setCreateForm({ ...createForm, targetTvlUsd: e.target.value })}
                          placeholder="2500"
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#121622] border border-gray-200 dark:border-gray-700 font-mono font-bold text-gray-900 dark:text-white focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                    <div className="text-[10px] text-amber-700 dark:text-amber-300 font-medium">
                      🔒 <strong>Garantía Anti-Rug:</strong> La comunidad podrá fondear {createForm.tokenB} sabiendo que el creador no puede retirar el fondo.
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-gray-400 block mb-1">
                          Cantidad {createForm.tokenA || 'Base'}:
                        </label>
                        <input
                          type="number"
                          value={createForm.initialAmountA}
                          onChange={(e) => setCreateForm({ ...createForm, initialAmountA: e.target.value })}
                          placeholder="500000"
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#121622] border border-gray-200 dark:border-gray-700 font-mono font-bold text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 block mb-1">
                          Cantidad {createForm.tokenB}:
                        </label>
                        <input
                          type="number"
                          value={createForm.initialAmountB}
                          onChange={(e) => setCreateForm({ ...createForm, initialAmountB: e.target.value })}
                          placeholder="500"
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#121622] border border-gray-200 dark:border-gray-700 font-mono font-bold text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                    <div className="text-[10px] text-emerald-700 dark:text-emerald-300 font-medium">
                      ⚡ <strong>Trading Inmediato:</strong> El par queda listo en el swap en el segundo 1.
                    </div>
                  </div>
                )}

                {/* SUBMIT BUTTON */}
                <button
                  type="submit"
                  disabled={isCreatingPool}
                  className="w-full py-4 rounded-2xl font-bold text-sm bg-primary hover:bg-orange-600 text-white shadow-xl shadow-orange-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isCreatingPool ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Registrando Par en la Fábrica de Pools...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" /> Crear y Registrar Par de Liquidez
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
