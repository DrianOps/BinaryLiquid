import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  DollarSign, 
  TrendingUp, 
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
  Check,
  Activity,
  Layers,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

interface LendingViewProps {
  userAddress: string;
  backendUrl: string;
  isWalletConnected: boolean;
  onConnectWallet: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function LendingView({
  userAddress,
  backendUrl,
  isWalletConnected,
  onConnectWallet,
  showToast
}: LendingViewProps) {
  const [activeTab, setActiveTab] = useState<'vault' | 'supply' | 'markets'>('vault');
  const [vaultSubTab, setVaultSubTab] = useState<'deposit_collateral' | 'withdraw_collateral' | 'borrow' | 'repay'>('deposit_collateral');
  const [supplySubTab, setSupplySubTab] = useState<'supply' | 'withdraw_supply'>('supply');

  const [loading, setLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [overview, setOverview] = useState<any>(null);
  const [userVaultData, setUserVaultData] = useState<any>(null);

  // Form inputs
  const [depositCollateralAmount, setDepositCollateralAmount] = useState<string>('');
  const [withdrawCollateralAmount, setWithdrawCollateralAmount] = useState<string>('');
  const [borrowToken, setBorrowToken] = useState<'PUSD' | 'USDC'>('PUSD');
  const [borrowAmount, setBorrowAmount] = useState<string>('');
  const [repayToken, setRepayToken] = useState<'PUSD' | 'USDC'>('PUSD');
  const [repayAmount, setRepayAmount] = useState<string>('');

  const [supplyToken, setSupplyToken] = useState<'PUSD' | 'USDC'>('PUSD');
  const [supplyAmount, setSupplyAmount] = useState<string>('');
  const [withdrawSupplyToken, setWithdrawSupplyToken] = useState<'PUSD' | 'USDC'>('PUSD');
  const [withdrawSupplyAmount, setWithdrawSupplyAmount] = useState<string>('');

  const effectiveAddress = isWalletConnected && userAddress 
    ? userAddress 
    : 'bitcoincash:qqgm9rel5xlyhwt3r6n8uq9fxk5zzxrcavaal6aw8v';

  const fetchData = async () => {
    try {
      const [resOverview, resVault] = await Promise.all([
        fetch(`${backendUrl}/api/lend/overview`).then(r => r.json()),
        fetch(`${backendUrl}/api/lend/vault/${effectiveAddress}`).then(r => r.json())
      ]);

      if (resOverview.success) setOverview(resOverview);
      if (resVault.success) setUserVaultData(resVault);
    } catch (err) {
      console.warn('Failed to load lending data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, [backendUrl, effectiveAddress]);

  const bchPrice = overview?.bchPrice || userVaultData?.bchPrice || 285.0;
  const vault = userVaultData?.vault || {
    collateralBch: 0,
    collateralUsd: 0,
    totalPusdDebt: 0,
    totalUsdcDebt: 0,
    totalDebtUsd: 0,
    maxBorrowCapacityUsd: 0,
    availableBorrowUsd: 0,
    healthFactor: 999,
    healthStatus: 'SAFE',
    withdrawableBch: 0,
    currentLtvPercent: 0
  };

  const supply = userVaultData?.supply || {
    suppliedPusd: 0,
    suppliedUsdc: 0,
    yieldEarnedPusd: 0,
    yieldEarnedUsdc: 0,
    totalSuppliedUsd: 0
  };

  // Actions
  const handleDepositCollateral = async () => {
    const amt = parseFloat(depositCollateralAmount);
    if (isNaN(amt) || amt <= 0) {
      showToast('Ingresa una cantidad válida de BCH', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`${backendUrl}/api/lend/deposit-collateral`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress: effectiveAddress, amountBch: amt })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`¡${amt} BCH agregados a tu bóveda de garantía!`, 'success');
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
        setDepositCollateralAmount('');
        await fetchData();
      } else {
        showToast(data.error || 'Error al depositar colateral', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error de conexión', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdrawCollateral = async () => {
    const amt = parseFloat(withdrawCollateralAmount);
    if (isNaN(amt) || amt <= 0) {
      showToast('Ingresa una cantidad válida de BCH para retirar', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`${backendUrl}/api/lend/withdraw-collateral`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress: effectiveAddress, amountBch: amt })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`¡${amt} BCH liberados de tu bóveda!`, 'success');
        confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } });
        setWithdrawCollateralAmount('');
        await fetchData();
      } else {
        showToast(data.error || 'Error al retirar colateral', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error de conexión', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBorrow = async () => {
    const amt = parseFloat(borrowAmount);
    if (isNaN(amt) || amt <= 0) {
      showToast(`Ingresa una cantidad válida de ${borrowToken}`, 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`${backendUrl}/api/lend/borrow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress: effectiveAddress, token: borrowToken, amount: amt })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`¡Préstamo de ${amt} ${borrowToken} acreditado a tu billetera!`, 'success');
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
        setBorrowAmount('');
        await fetchData();
      } else {
        showToast(data.error || 'Error al procesar préstamo', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error de conexión', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRepay = async () => {
    const amt = parseFloat(repayAmount);
    if (isNaN(amt) || amt <= 0) {
      showToast(`Ingresa una cantidad válida de ${repayToken}`, 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`${backendUrl}/api/lend/repay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress: effectiveAddress, token: repayToken, amount: amt })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`¡Pago de ${amt} ${repayToken} procesado! Tu deuda ha disminuido.`, 'success');
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
        setRepayAmount('');
        await fetchData();
      } else {
        showToast(data.error || 'Error al procesar pago', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error de conexión', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSupply = async () => {
    const amt = parseFloat(supplyAmount);
    if (isNaN(amt) || amt <= 0) {
      showToast(`Ingresa una cantidad válida de ${supplyToken}`, 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`${backendUrl}/api/lend/supply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress: effectiveAddress, token: supplyToken, amount: amt })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`¡${amt} ${supplyToken} depositados al fondo de rendimiento!`, 'success');
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
        setSupplyAmount('');
        await fetchData();
      } else {
        showToast(data.error || 'Error al suministrar fondos', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error de conexión', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdrawSupply = async () => {
    const amt = parseFloat(withdrawSupplyAmount);
    if (isNaN(amt) || amt <= 0) {
      showToast(`Ingresa una cantidad válida de ${withdrawSupplyToken}`, 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`${backendUrl}/api/lend/withdraw-supply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress: effectiveAddress, token: withdrawSupplyToken, amount: amt })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`¡${amt} ${withdrawSupplyToken} retirados con éxito!`, 'success');
        confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } });
        setWithdrawSupplyAmount('');
        await fetchData();
      } else {
        showToast(data.error || 'Error al retirar fondos', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error de conexión', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-6 sm:py-10 selection:bg-orange-500 selection:text-white">
      
      {/* HEADER SECTION */}
      <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold uppercase tracking-wider mb-3">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>BCH Collateral Vaults & Stablecoin Liquidity</span>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-950 dark:text-white tracking-tight">
          Préstamos & Bóvedas BCH
        </h1>
        <p className="text-xs sm:text-sm md:text-base text-gray-500 dark:text-gray-400 mt-2 sm:mt-3 leading-relaxed">
          No vendas tu <strong className="text-gray-900 dark:text-white font-bold">Bitcoin Cash</strong>. Bloquéalo en tu bóveda segura como garantía, obtén liquidez inmediata en <strong className="text-primary font-bold">PUSD (CashTokens)</strong> o <strong className="text-blue-500 font-bold">USDC</strong> al 3.5% APR y recupera tus monedas intactas cuando decidas.
        </p>
      </div>

      {/* TOP USER METRICS DASHBOARD */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        
        {/* CARD 1: MI COLATERAL BCH */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#121622] border border-gray-200/80 dark:border-gray-800 shadow-2xs">
          <div className="flex items-center justify-between text-gray-400 mb-1.5 sm:mb-2">
            <span className="text-[11px] sm:text-xs font-medium">Mi Colateral en Bóveda</span>
            <div className="flex items-center gap-1">
              <img src="/BCH.png" alt="BCH" className="w-4 h-4 rounded-full" />
              <span className="inline-flex items-center justify-center w-3 h-3 rounded-full bg-blue-500 text-white">
                <Check className="w-2 h-2 stroke-[3]" />
              </span>
            </div>
          </div>
          <div className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 dark:text-white font-mono">
            {vault.collateralBch.toFixed(4)} <span className="text-xs font-sans text-gray-400">BCH</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-gray-500 mt-1">
            <span>≈ ${vault.collateralUsd.toLocaleString()} USD</span>
            <span className="text-emerald-500 font-bold">LTV Máx: 65%</span>
          </div>
        </div>

        {/* CARD 2: MI DEUDA TOTAL PRESTADA */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#121622] border border-gray-200/80 dark:border-gray-800 shadow-2xs">
          <div className="flex items-center justify-between text-gray-400 mb-1.5 sm:mb-2">
            <span className="text-[11px] sm:text-xs font-medium">Mi Deuda Prestada</span>
            <Coins className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-xl sm:text-2xl md:text-3xl font-black text-orange-500 font-mono">
            ${vault.totalDebtUsd.toLocaleString()} <span className="text-xs font-sans text-gray-400">USD</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-gray-500 mt-1">
            <span>{vault.totalPusdDebt.toFixed(2)} PUSD • {vault.totalUsdcDebt.toFixed(2)} USDC</span>
            <span className="text-primary font-bold">~3.5% APR</span>
          </div>
        </div>

        {/* CARD 3: RATIO DE SALUD (HEALTH FACTOR) */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#121622] border border-gray-200/80 dark:border-gray-800 shadow-2xs">
          <div className="flex items-center justify-between text-gray-400 mb-1.5 sm:mb-2">
            <span className="text-[11px] sm:text-xs font-medium">Ratio de Salud (Seguridad)</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl md:text-3xl font-black font-mono flex items-baseline gap-2">
            {vault.totalDebtUsd === 0 ? (
              <span className="text-emerald-500">∞ Seguro</span>
            ) : (
              <span className={vault.healthFactor >= 1.5 ? 'text-emerald-500' : vault.healthFactor >= 1.1 ? 'text-amber-500' : 'text-rose-500'}>
                {vault.healthFactor.toFixed(2)}
              </span>
            )}
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              vault.healthStatus === 'SAFE' 
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                : vault.healthStatus === 'MODERATE' 
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' 
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
            }`}>
              {vault.healthStatus === 'SAFE' ? 'Óptimo' : vault.healthStatus === 'MODERATE' ? 'Moderado' : 'Alerta'}
            </span>
          </div>
          <span className="text-[11px] text-gray-400 mt-1 block">
            Liquidación si cae por debajo de 1.00 (80% LTV)
          </span>
        </div>

        {/* CARD 4: CAPACIDAD DE PRÉSTAMO DISPONIBLE */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#121622] border border-gray-200/80 dark:border-gray-800 shadow-2xs">
          <div className="flex items-center justify-between text-gray-400 mb-1.5 sm:mb-2">
            <span className="text-[11px] sm:text-xs font-medium">Disponible para Pedir</span>
            <DollarSign className="w-4 h-4 text-primary" />
          </div>
          <div className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 dark:text-white font-mono">
            ${vault.availableBorrowUsd.toLocaleString()}
          </div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-1 inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Aprobación instantánea sin KYC
          </span>
        </div>

      </div>

      {/* NAVIGATION TABS */}
      <div className="flex items-center gap-2 p-1 rounded-2xl bg-gray-100/90 dark:bg-[#131826] border border-gray-200/70 dark:border-gray-800 mb-8 max-w-md mx-auto">
        <button
          onClick={() => setActiveTab('vault')}
          className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'vault'
              ? 'bg-white dark:bg-[#1e2538] text-gray-950 dark:text-white shadow-xs'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Lock className="w-3.5 h-3.5 text-primary" />
          <span>Mi Bóveda BCH</span>
        </button>

        <button
          onClick={() => setActiveTab('supply')}
          className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'supply'
              ? 'bg-white dark:bg-[#1e2538] text-gray-950 dark:text-white shadow-xs'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
          <span>Rendimiento (~6.1% APY)</span>
        </button>

        <button
          onClick={() => setActiveTab('markets')}
          className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'markets'
              ? 'bg-white dark:bg-[#1e2538] text-gray-950 dark:text-white shadow-xs'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Activity className="w-3.5 h-3.5 text-blue-500" />
          <span>Mercados</span>
        </button>
      </div>

      {/* TAB 1: MI BÓVEDA BCH (COLATERAL Y PRÉSTAMOS) */}
      {activeTab === 'vault' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: ACTION CARD */}
          <div className="lg:col-span-7 rounded-3xl bg-white dark:bg-[#121622] border border-gray-200/90 dark:border-gray-800 p-5 sm:p-7 shadow-2xs">
            
            {/* SUBTABS */}
            <div className="grid grid-cols-4 gap-1.5 p-1 rounded-2xl bg-gray-50 dark:bg-[#181f2f] mb-6">
              <button
                onClick={() => setVaultSubTab('deposit_collateral')}
                className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  vaultSubTab === 'deposit_collateral'
                    ? 'bg-white dark:bg-[#222c42] text-gray-900 dark:text-white shadow-xs'
                    : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                + Depositar BCH
              </button>
              <button
                onClick={() => setVaultSubTab('borrow')}
                className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  vaultSubTab === 'borrow'
                    ? 'bg-white dark:bg-[#222c42] text-primary shadow-xs'
                    : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                Pedir Préstamo
              </button>
              <button
                onClick={() => setVaultSubTab('repay')}
                className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  vaultSubTab === 'repay'
                    ? 'bg-white dark:bg-[#222c42] text-emerald-500 shadow-xs'
                    : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                Pagar Deuda
              </button>
              <button
                onClick={() => setVaultSubTab('withdraw_collateral')}
                className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  vaultSubTab === 'withdraw_collateral'
                    ? 'bg-white dark:bg-[#222c42] text-gray-900 dark:text-white shadow-xs'
                    : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                Retirar BCH
              </button>
            </div>

            {/* ACTION 1: DEPOSIT COLLATERAL */}
            {vaultSubTab === 'deposit_collateral' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-extrabold text-gray-900 dark:text-white">
                    Bloquear Bitcoin Cash como Garantía
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Tus BCH quedan bajo tu custodia en la bóveda y habilitan hasta un 65% de su valor en préstamos de stablecoins.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#161c28] border border-gray-100 dark:border-gray-800">
                  <div className="flex justify-between items-center text-xs text-gray-400 mb-2">
                    <span>Monto de BCH a Depositar</span>
                    <span className="font-mono">Precio BCH: <strong>${bchPrice.toFixed(2)} USD</strong></span>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      step="any"
                      value={depositCollateralAmount}
                      onChange={e => setDepositCollateralAmount(e.target.value)}
                      placeholder="0.0"
                      className="w-full bg-transparent text-2xl sm:text-3xl font-mono font-bold text-gray-900 dark:text-white outline-none"
                    />
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-[#202737] border border-gray-200 dark:border-gray-700 shrink-0">
                      <img src="/BCH.png" alt="BCH" className="w-5 h-5 rounded-full object-contain" />
                      <span className="font-bold text-sm text-gray-900 dark:text-white">BCH</span>
                      <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-blue-500 text-white">
                        <Check className="w-2 h-2 stroke-[3]" />
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-400 mt-3 pt-2 border-t border-gray-100 dark:border-gray-800">
                    <span>Valor estimado en USD:</span>
                    <span className="font-mono font-bold text-gray-900 dark:text-white">
                      ${((parseFloat(depositCollateralAmount) || 0) * bchPrice).toFixed(2)} USD
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1">
                  <div className="flex justify-between items-center text-emerald-700 dark:text-emerald-400 font-medium">
                    <span>Nueva Capacidad de Préstamo que se Habilita:</span>
                    <strong className="font-mono font-bold text-sm">
                      +${(((parseFloat(depositCollateralAmount) || 0) * bchPrice) * 0.65).toFixed(2)} USD
                    </strong>
                  </div>
                </div>

                <button
                  onClick={handleDepositCollateral}
                  disabled={isSubmitting || !depositCollateralAmount}
                  className="w-full py-3.5 rounded-2xl bg-primary hover:bg-orange-600 disabled:opacity-50 text-white font-bold text-sm shadow-md shadow-orange-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Bloqueando BCH en Bóveda...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Depositar BCH Colateral</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* ACTION 2: BORROW STABLECOINS */}
            {vaultSubTab === 'borrow' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-extrabold text-gray-900 dark:text-white">
                    Solicitar Préstamo de Stablecoins
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Fondos acreditados instantáneamente contra tu garantía sin vender tus BCH.
                  </p>
                </div>

                {/* TOKEN SELECTOR (PUSD vs USDC) */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setBorrowToken('PUSD')}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      borrowToken === 'PUSD'
                        ? 'bg-primary/10 border-primary text-gray-950 dark:text-white shadow-xs'
                        : 'bg-gray-50 dark:bg-[#161c28] border-gray-100 dark:border-gray-800 text-gray-500'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <img src="/PUSD.png" alt="PUSD" className="w-6 h-6 rounded-full" />
                        <span className="font-bold text-sm">PUSD</span>
                        <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-blue-500 text-white">
                          <Check className="w-2 h-2 stroke-[3]" />
                        </span>
                      </div>
                      <span className="text-[10px] font-black uppercase text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">
                        BLAZE Sponsor
                      </span>
                    </div>
                    <span className="text-[11px] text-gray-400 block">Tasa: 3.5% APR • BCH CashToken</span>
                  </button>

                  <button
                    onClick={() => setBorrowToken('USDC')}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      borrowToken === 'USDC'
                        ? 'bg-blue-500/10 border-blue-500 text-gray-950 dark:text-white shadow-xs'
                        : 'bg-gray-50 dark:bg-[#161c28] border-gray-100 dark:border-gray-800 text-gray-500'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <img src="/USDC.png" alt="USDC" className="w-6 h-6 rounded-full" />
                        <span className="font-bold text-sm">USDC</span>
                        <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-blue-500 text-white">
                          <Check className="w-2 h-2 stroke-[3]" />
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded">
                        Polygon PoS
                      </span>
                    </div>
                    <span className="text-[11px] text-gray-400 block">Tasa: 4.2% APR • EVM Native</span>
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#161c28] border border-gray-100 dark:border-gray-800">
                  <div className="flex justify-between items-center text-xs text-gray-400 mb-2">
                    <span>Monto a Pedir Prestado</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">Disponible: <strong>${vault.availableBorrowUsd.toLocaleString()}</strong></span>
                      {vault.availableBorrowUsd > 0 && (
                        <button
                          onClick={() => setBorrowAmount(String(vault.availableBorrowUsd))}
                          className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded cursor-pointer"
                        >
                          MAX
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      step="any"
                      value={borrowAmount}
                      onChange={e => setBorrowAmount(e.target.value)}
                      placeholder="0.0"
                      className="w-full bg-transparent text-2xl sm:text-3xl font-mono font-bold text-gray-900 dark:text-white outline-none"
                    />
                    <span className="font-bold text-sm text-gray-700 dark:text-gray-200 shrink-0">
                      {borrowToken}
                    </span>
                  </div>
                </div>

                {/* HEALTH FACTOR SIMULATOR */}
                {parseFloat(borrowAmount) > 0 && (
                  <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-[#181f2f] text-xs space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Impacto en Ratio de Salud:</span>
                      <span className="font-mono font-bold">
                        {vault.collateralUsd > 0 ? (
                          ((vault.collateralUsd * 0.80) / (vault.totalDebtUsd + parseFloat(borrowAmount))).toFixed(2)
                        ) : '0.00'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Comisión de originación:</span>
                      <span className="text-emerald-500 font-bold font-mono">0.00% (Hackathon Promo)</span>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleBorrow}
                  disabled={isSubmitting || !borrowAmount || parseFloat(borrowAmount) > vault.availableBorrowUsd}
                  className="w-full py-3.5 rounded-2xl bg-primary hover:bg-orange-600 disabled:opacity-50 text-white font-bold text-sm shadow-md shadow-orange-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Aprobando Préstamo On-Chain...</span>
                    </>
                  ) : (
                    <>
                      <ArrowDownLeft className="w-4 h-4" />
                      <span>Retirar Préstamo en {borrowToken}</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* ACTION 3: REPAY DEBT */}
            {vaultSubTab === 'repay' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-extrabold text-gray-900 dark:text-white">
                    Pagar Deuda y Restaurar Ratio de Salud
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Paga total o parcialmente tus préstamos para liberar tu colateral BCH.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setRepayToken('PUSD')}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      repayToken === 'PUSD'
                        ? 'bg-primary/10 border-primary text-gray-950 dark:text-white shadow-xs'
                        : 'bg-gray-50 dark:bg-[#161c28] border-gray-100 dark:border-gray-800 text-gray-500'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <img src="/PUSD.png" alt="PUSD" className="w-5 h-5 rounded-full" />
                      <span className="font-bold text-sm">PUSD</span>
                    </div>
                    <span className="text-[11px] text-gray-400 block font-mono">
                      Deuda: <strong>{vault.totalPusdDebt.toFixed(2)} PUSD</strong>
                    </span>
                  </button>

                  <button
                    onClick={() => setRepayToken('USDC')}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      repayToken === 'USDC'
                        ? 'bg-blue-500/10 border-blue-500 text-gray-950 dark:text-white shadow-xs'
                        : 'bg-gray-50 dark:bg-[#161c28] border-gray-100 dark:border-gray-800 text-gray-500'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <img src="/USDC.png" alt="USDC" className="w-5 h-5 rounded-full" />
                      <span className="font-bold text-sm">USDC</span>
                    </div>
                    <span className="text-[11px] text-gray-400 block font-mono">
                      Deuda: <strong>{vault.totalUsdcDebt.toFixed(2)} USDC</strong>
                    </span>
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#161c28] border border-gray-100 dark:border-gray-800">
                  <div className="flex justify-between items-center text-xs text-gray-400 mb-2">
                    <span>Monto a Pagar</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">
                        Deuda pendiente: <strong>{(repayToken === 'PUSD' ? vault.totalPusdDebt : vault.totalUsdcDebt).toFixed(2)} {repayToken}</strong>
                      </span>
                      {(repayToken === 'PUSD' ? vault.totalPusdDebt : vault.totalUsdcDebt) > 0 && (
                        <button
                          onClick={() => setRepayAmount(String((repayToken === 'PUSD' ? vault.totalPusdDebt : vault.totalUsdcDebt)))}
                          className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded cursor-pointer"
                        >
                          Pagar Todo
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      step="any"
                      value={repayAmount}
                      onChange={e => setRepayAmount(e.target.value)}
                      placeholder="0.0"
                      className="w-full bg-transparent text-2xl sm:text-3xl font-mono font-bold text-gray-900 dark:text-white outline-none"
                    />
                    <span className="font-bold text-sm text-gray-700 dark:text-gray-200 shrink-0">
                      {repayToken}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleRepay}
                  disabled={isSubmitting || !repayAmount}
                  className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm shadow-md shadow-emerald-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Liquidando Pago de Deuda...</span>
                    </>
                  ) : (
                    <>
                      <ArrowUpRight className="w-4 h-4" />
                      <span>Pagar {repayAmount || '0'} {repayToken}</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* ACTION 4: WITHDRAW COLLATERAL */}
            {vaultSubTab === 'withdraw_collateral' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-extrabold text-gray-900 dark:text-white">
                    Retirar Bitcoin Cash a tu Billetera
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Puedes retirar el BCH no comprometido en préstamos de forma instantánea.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#161c28] border border-gray-100 dark:border-gray-800">
                  <div className="flex justify-between items-center text-xs text-gray-400 mb-2">
                    <span>Monto de BCH a Retirar</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">Retirable seguro: <strong>{vault.withdrawableBch.toFixed(4)} BCH</strong></span>
                      {vault.withdrawableBch > 0 && (
                        <button
                          onClick={() => setWithdrawCollateralAmount(String(vault.withdrawableBch))}
                          className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded cursor-pointer"
                        >
                          MAX
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      step="any"
                      value={withdrawCollateralAmount}
                      onChange={e => setWithdrawCollateralAmount(e.target.value)}
                      placeholder="0.0"
                      className="w-full bg-transparent text-2xl sm:text-3xl font-mono font-bold text-gray-900 dark:text-white outline-none"
                    />
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-[#202737] border border-gray-200 dark:border-gray-700 shrink-0">
                      <img src="/BCH.png" alt="BCH" className="w-5 h-5 rounded-full object-contain" />
                      <span className="font-bold text-sm text-gray-900 dark:text-white">BCH</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleWithdrawCollateral}
                  disabled={isSubmitting || !withdrawCollateralAmount || parseFloat(withdrawCollateralAmount) > vault.withdrawableBch}
                  className="w-full py-3.5 rounded-2xl bg-gray-900 dark:bg-gray-100 hover:bg-gray-800 dark:hover:bg-white text-white dark:text-gray-900 disabled:opacity-50 font-bold text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Liberando BCH de Bóveda...</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-4 h-4" />
                      <span>Retirar {withdrawCollateralAmount || '0'} BCH a Mi Billetera</span>
                    </>
                  )}
                </button>
              </div>
            )}

          </div>

          {/* RIGHT: HOW IT WORKS / VAULT DETAILS */}
          <div className="lg:col-span-5 space-y-4">
            
            <div className="p-5 rounded-3xl bg-white dark:bg-[#121622] border border-gray-200/90 dark:border-gray-800 shadow-2xs">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-primary" />
                <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">
                  ¿Cómo funciona el Préstamo sin Vender BCH?
                </h4>
              </div>

              <div className="space-y-3 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                  <p><strong className="text-gray-900 dark:text-white">Depositas BCH en garantía:</strong> Conservas tu exposición completa al precio alcista de Bitcoin Cash.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                  <p><strong className="text-gray-900 dark:text-white">Pides prestado PUSD o USDC:</strong> Obtienes hasta el 65% de su valor en dólares de inmediato para usar en swaps o transferir.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
                  <p><strong className="text-gray-900 dark:text-white">Recuperas tu BCH intacto:</strong> Pagas tu préstamo cuando desees y retiras tus monedas sin penalización.</p>
                </div>
              </div>
            </div>

            {/* SPONSOR CALLOUT: PUSD CASH TOKEN */}
            <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-emerald-500/10 border border-amber-500/20 shadow-2xs">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
                <span className="text-xs font-black uppercase text-orange-600 dark:text-orange-400 tracking-wider">
                  Patrocinador BLAZE • ParyonUSD (PUSD)
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                Pide prestado <strong>PUSD</strong> sin comisiones de originación (0%). El primer CashToken de stablecoin nativo en Bitcoin Cash con liquidación en segundos.
              </p>
            </div>

          </div>

        </div>
      )}

      {/* TAB 2: RENDIMIENTO (SUPPLY & EARN) */}
      {activeTab === 'supply' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          <div className="lg:col-span-7 rounded-3xl bg-white dark:bg-[#121622] border border-gray-200/90 dark:border-gray-800 p-5 sm:p-7 shadow-2xs">
            
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800 mb-5">
              <div>
                <h3 className="text-lg font-extrabold text-gray-900 dark:text-white">
                  Suministrar Stablecoins y Ganar Rendimiento Pasivo
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Aporta dólares al fondo de liquidez y gana intereses de los préstamos continuamente.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                onClick={() => setSupplyToken('PUSD')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  supplyToken === 'PUSD'
                    ? 'bg-primary/10 border-primary text-gray-900 dark:text-white shadow-xs'
                    : 'bg-gray-50 dark:bg-[#161c28] border-gray-100 dark:border-gray-800 text-gray-500'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <img src="/PUSD.png" alt="PUSD" className="w-6 h-6 rounded-full" />
                    <span className="font-bold text-sm">PUSD</span>
                  </div>
                  <span className="text-xs font-black text-emerald-500">5.8% APY</span>
                </div>
                <span className="text-[11px] text-gray-400 block font-mono">
                  Suministrado: <strong>{supply.suppliedPusd.toFixed(2)} PUSD</strong>
                </span>
              </button>

              <button
                onClick={() => setSupplyToken('USDC')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  supplyToken === 'USDC'
                    ? 'bg-blue-500/10 border-blue-500 text-gray-900 dark:text-white shadow-xs'
                    : 'bg-gray-50 dark:bg-[#161c28] border-gray-100 dark:border-gray-800 text-gray-500'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <img src="/USDC.png" alt="USDC" className="w-6 h-6 rounded-full" />
                    <span className="font-bold text-sm">USDC</span>
                  </div>
                  <span className="text-xs font-black text-blue-500">6.4% APY</span>
                </div>
                <span className="text-[11px] text-gray-400 block font-mono">
                  Suministrado: <strong>{supply.suppliedUsdc.toFixed(2)} USDC</strong>
                </span>
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#161c28] border border-gray-100 dark:border-gray-800 mb-5">
              <span className="text-xs text-gray-400 block mb-2">Monto a Depositar al Fondo de Rendimiento</span>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  step="any"
                  value={supplyAmount}
                  onChange={e => setSupplyAmount(e.target.value)}
                  placeholder="0.0"
                  className="w-full bg-transparent text-2xl sm:text-3xl font-mono font-bold text-gray-900 dark:text-white outline-none"
                />
                <span className="font-bold text-sm text-gray-700 dark:text-gray-200 shrink-0">
                  {supplyToken}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSupply}
                disabled={isSubmitting || !supplyAmount}
                className="flex-1 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm shadow-md shadow-emerald-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Depositar y Ganar APY</span>
              </button>

              <button
                onClick={handleWithdrawSupply}
                disabled={isSubmitting || !supplyAmount}
                className="px-5 py-3.5 rounded-2xl bg-gray-100 dark:bg-[#1e2538] hover:bg-gray-200 dark:hover:bg-[#28324a] text-gray-700 dark:text-gray-200 font-bold text-sm transition-all cursor-pointer"
              >
                Retirar
              </button>
            </div>

          </div>

          <div className="lg:col-span-5 space-y-4">
            <div className="p-5 rounded-3xl bg-white dark:bg-[#121622] border border-gray-200/90 dark:border-gray-800 shadow-2xs">
              <h4 className="font-extrabold text-sm text-gray-900 dark:text-white mb-3">
                Mi Balance de Rendimiento Acumulado
              </h4>

              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center mb-4">
                <span className="text-xs text-gray-400 block uppercase font-bold">Rendimientos Ganados</span>
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1 block">
                  +${(supply.yieldEarnedPusd + supply.yieldEarnedUsdc).toFixed(4)} USD
                </span>
                <span className="text-[10px] text-emerald-500 font-medium">Auto-capitalizable cada segundo</span>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between items-center p-2 rounded-xl bg-gray-50 dark:bg-[#161c28]">
                  <span className="text-gray-400">PUSD Suministrado:</span>
                  <span className="font-bold text-gray-900 dark:text-white">{supply.suppliedPusd.toFixed(2)} PUSD</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-xl bg-gray-50 dark:bg-[#161c28]">
                  <span className="text-gray-400">USDC Suministrado:</span>
                  <span className="font-bold text-gray-900 dark:text-white">{supply.suppliedUsdc.toFixed(2)} USDC</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* TAB 3: MERCADOS Y PARÁMETROS */}
      {activeTab === 'markets' && (
        <div className="rounded-3xl bg-white dark:bg-[#121622] border border-gray-200/90 dark:border-gray-800 p-5 sm:p-7 shadow-2xs">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800 mb-6">
            <div>
              <h3 className="text-lg font-extrabold text-gray-900 dark:text-white">
                Mercados del Protocolo de Préstamos
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Parámetros de riesgo, liquidez disponible y tasas de interés en tiempo real.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-gray-400">Oráculo Origen:</span>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                Binance / CoinGecko Feed
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* BCH COLLATERAL MARKET */}
            <div className="p-5 rounded-2xl bg-gray-50 dark:bg-[#161c28] border border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <img src="/BCH.png" alt="BCH" className="w-8 h-8 rounded-full" />
                  <div>
                    <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">Bitcoin Cash (BCH)</h4>
                    <span className="text-[10px] text-gray-400">Mercado de Colateral L1</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  Colateral
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-gray-400">
                  <span>Precio de Referencia:</span>
                  <span className="font-mono font-bold text-gray-900 dark:text-white">${bchPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>LTV Máximo:</span>
                  <span className="font-mono font-bold text-emerald-500">65%</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Umbral Liquidación:</span>
                  <span className="font-mono font-bold text-rose-500">80%</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Penalización:</span>
                  <span className="font-mono font-bold">5%</span>
                </div>
              </div>
            </div>

            {/* PUSD BORROW MARKET */}
            <div className="p-5 rounded-2xl bg-gray-50 dark:bg-[#161c28] border border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <img src="/PUSD.png" alt="PUSD" className="w-8 h-8 rounded-full" />
                  <div>
                    <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">ParyonUSD (PUSD)</h4>
                    <span className="text-[10px] text-gray-400">BCH CashToken Sponsor</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  Préstamo
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-gray-400">
                  <span>Tasa Préstamo (Borrow APR):</span>
                  <span className="font-mono font-bold text-primary">3.5% APR</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Tasa Rendimiento (Supply APY):</span>
                  <span className="font-mono font-bold text-emerald-500">5.8% APY</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Liquidez Disponible:</span>
                  <span className="font-mono font-bold text-gray-900 dark:text-white">175,800 PUSD</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Comisión Originación:</span>
                  <span className="font-mono font-bold text-emerald-500">0.00%</span>
                </div>
              </div>
            </div>

            {/* USDC BORROW MARKET */}
            <div className="p-5 rounded-2xl bg-gray-50 dark:bg-[#161c28] border border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <img src="/USDC.png" alt="USDC" className="w-8 h-8 rounded-full" />
                  <div>
                    <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">USD Coin (USDC)</h4>
                    <span className="text-[10px] text-gray-400">Polygon PoS Native</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-full">
                  Préstamo
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-gray-400">
                  <span>Tasa Préstamo (Borrow APR):</span>
                  <span className="font-mono font-bold text-blue-500">4.2% APR</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Tasa Rendimiento (Supply APY):</span>
                  <span className="font-mono font-bold text-emerald-500">6.4% APY</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Liquidez Disponible:</span>
                  <span className="font-mono font-bold text-gray-900 dark:text-white">137,500 USDC</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Red de Liquidación:</span>
                  <span className="font-mono font-bold">Polygon PoS</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
