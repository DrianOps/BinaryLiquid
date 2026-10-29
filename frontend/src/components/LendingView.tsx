import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  DollarSign, 
  TrendingUp, 
  Coins, 
  RefreshCw, 
  Sparkles, 
  Lock, 
  Unlock, 
  Flame, 
  Check, 
  Activity, 
  ArrowUpRight, 
  ArrowDownLeft,
  Plus
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface LendingViewProps {
  userAddress: string;
  backendUrl: string;
  isWalletConnected: boolean;
  onConnectWallet: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  lang?: 'en' | 'es';
}

const lendTexts = {
  en: {
    heroBadge: "BCH Collateral Vaults & Stablecoin Liquidity",
    heroTitle: "BCH Lending & Collateral Vaults",
    heroSubtitle1: "Don't sell your ",
    heroSubtitleBch: "Bitcoin Cash",
    heroSubtitle2: ". Lock your BCH in your secure vault as collateral, borrow instant liquidity in ",
    heroSubtitlePusd: "PUSD (CashTokens)",
    heroSubtitleOr: " or ",
    heroSubtitleUsdc: "USDC",
    heroSubtitle3: " at ~3.5% APR and retrieve your coins intact whenever you decide without tax events.",
    cardCollateralTitle: "My Vault Collateral",
    cardCollateralLtv: "Max LTV: 65%",
    cardDebtTitle: "My Borrowed Debt",
    cardHealthTitle: "Health Factor (Safety)",
    cardHealthInfinite: "∞ Safe",
    cardHealthSafe: "Optimal",
    cardHealthModerate: "Moderate",
    cardHealthAlert: "Alert",
    cardHealthSub: "Liquidation if drops below 1.00 (80% LTV)",
    cardAvailableTitle: "Available to Borrow",
    cardAvailableSub: "Instant approval without KYC",
    tabVault: "My BCH Vault",
    tabSupply: "Yield (~6.1% APY)",
    tabMarkets: "Markets",
    subTabDeposit: "+ Deposit BCH",
    subTabBorrow: "Borrow Funds",
    subTabRepay: "Repay Debt",
    subTabWithdraw: "Withdraw BCH",
    depositTitle: "Lock Bitcoin Cash as Collateral",
    depositDesc: "Your BCH remains under your vault custody and enables up to 65% of its value in stablecoin loans.",
    depositLabel: "Amount of BCH to Deposit",
    bchPriceLabel: "BCH Price:",
    estUsdValue: "Estimated USD Value:",
    newBorrowCapacity: "New Borrowing Capacity Enabled:",
    btnDeposit: "Deposit BCH Collateral",
    btnDepositing: "Locking BCH in Vault...",
    borrowTitle: "Borrow Stablecoins",
    borrowDesc: "Instant funds credited against your collateral without selling your BCH.",
    borrowAmountLabel: "Amount to Borrow",
    availableLabel: "Available:",
    healthImpactLabel: "Impact on Health Factor:",
    originationFeeLabel: "Origination fee:",
    originationFeeFree: "0.00% (Hackathon Promo)",
    borrowRatePusd: "Rate: 3.5% APR • BCH CashToken",
    borrowRateUsdc: "Rate: 4.2% APR • EVM Native",
    btnBorrow: "Borrow",
    btnBorrowing: "Approving On-Chain Loan...",
    repayTitle: "Repay Debt & Restore Health Factor",
    repayDesc: "Pay down your loans partially or in full to release your BCH collateral.",
    debtLabel: "Debt:",
    repayAmountLabel: "Amount to Repay",
    pendingDebtLabel: "Pending debt:",
    payAllBtn: "Pay All",
    btnRepay: "Pay",
    btnRepaying: "Processing Debt Settlement...",
    withdrawTitle: "Withdraw Bitcoin Cash to Your Wallet",
    withdrawDesc: "You can withdraw unencumbered BCH instantly.",
    withdrawAmountLabel: "Amount of BCH to Withdraw",
    safeWithdrawableLabel: "Safe withdrawable:",
    btnWithdraw: "Withdraw to My Wallet",
    btnWithdrawing: "Releasing BCH from Vault...",
    howItWorksTitle: "How does Borrowing without Selling BCH work?",
    step1Title: "Deposit BCH as collateral: ",
    step1Desc: "You retain 100% upside exposure to Bitcoin Cash price appreciation.",
    step2Title: "Borrow PUSD or USDC: ",
    step2Desc: "Access up to 65% in dollars instantly to use in swaps or transfers.",
    step3Title: "Retrieve your BCH intact: ",
    step3Desc: "Pay back your loan whenever you want and unlock your coins with no penalty.",
    sponsorBadge: "BLAZE Sponsor • ParyonUSD (PUSD)",
    sponsorDesc: "Borrow PUSD with 0% origination fees. The premier native Bitcoin Cash stablecoin CashToken with instant settlement.",
    supplyTitle: "Supply Stablecoins & Earn Passive Yield",
    supplyDesc: "Deposit dollars into the liquidity pool and earn interest from borrowers continuously.",
    suppliedLabel: "Supplied:",
    supplyAmountLabel: "Amount to Deposit into Yield Pool",
    btnSupply: "Deposit & Earn APY",
    btnWithdrawSupply: "Withdraw",
    myYieldTitle: "My Accrued Yield Balance",
    yieldEarnedLabel: "Yield Earned",
    yieldEarnedSub: "Auto-compounds every second",
    pusdSuppliedLabel: "PUSD Supplied:",
    usdcSuppliedLabel: "USDC Supplied:",
    marketsTitle: "Lending Protocol Markets",
    marketsDesc: "Risk parameters, available liquidity, and real-time interest rates.",
    oracleSource: "Oracle Source:",
    referencePrice: "Reference Price:",
    maxLtv: "Max LTV:",
    liquidationThreshold: "Liquidation Threshold:",
    liquidationPenalty: "Penalty:",
    borrowRate: "Borrow APR:",
    supplyRate: "Supply APY:",
    availLiquidity: "Available Liquidity:",
    originationFee: "Origination Fee:",
    settlementNetwork: "Settlement Network:",
    bchMarketSubtitle: "L1 Collateral Market",
    bchMarketBadge: "Collateral",
    pusdMarketSubtitle: "BCH CashToken Sponsor",
    pusdMarketBadge: "Borrow",
    usdcMarketSubtitle: "Polygon PoS Native",
    usdcMarketBadge: "Borrow",
    toastEnterValidBch: "Enter a valid amount of BCH",
    toastEnterValidBchWithdraw: "Enter a valid amount of BCH to withdraw",
    toastEnterValidAmount: "Enter a valid amount",
    toastCollateralAdded: "BCH added to your collateral vault!",
    toastCollateralWithdrawn: "BCH unlocked from your vault!",
    toastLoanApproved: "Loan credited to your wallet!",
    toastRepaySuccess: "repaid! Your debt has decreased.",
    toastSupplySuccess: "deposited into yield pool!",
    toastWithdrawSupplySuccess: "withdrawn successfully!",
    toastConnectionError: "Connection error"
  },
  es: {
    heroBadge: "BCH Collateral Vaults & Stablecoin Liquidity",
    heroTitle: "Préstamos & Bóvedas BCH",
    heroSubtitle1: "No vendas tu ",
    heroSubtitleBch: "Bitcoin Cash",
    heroSubtitle2: ". Bloquéalo en tu bóveda segura como garantía, obtén liquidez inmediata en ",
    heroSubtitlePusd: "PUSD (CashTokens)",
    heroSubtitleOr: " o ",
    heroSubtitleUsdc: "USDC",
    heroSubtitle3: " al 3.5% APR y recupera tus monedas intactas cuando decidas sin eventos fiscales.",
    cardCollateralTitle: "Mi Colateral en Bóveda",
    cardCollateralLtv: "LTV Máx: 65%",
    cardDebtTitle: "Mi Deuda Prestada",
    cardHealthTitle: "Ratio de Salud (Seguridad)",
    cardHealthInfinite: "∞ Seguro",
    cardHealthSafe: "Óptimo",
    cardHealthModerate: "Moderado",
    cardHealthAlert: "Alerta",
    cardHealthSub: "Liquidación si cae por debajo de 1.00 (80% LTV)",
    cardAvailableTitle: "Disponible para Pedir",
    cardAvailableSub: "Aprobación instantánea sin KYC",
    tabVault: "Mi Bóveda BCH",
    tabSupply: "Rendimiento (~6.1% APY)",
    tabMarkets: "Mercados",
    subTabDeposit: "+ Depositar BCH",
    subTabBorrow: "Pedir Préstamo",
    subTabRepay: "Pagar Deuda",
    subTabWithdraw: "Retirar BCH",
    depositTitle: "Bloquear Bitcoin Cash como Garantía",
    depositDesc: "Tus BCH quedan bajo tu custodia en la bóveda y habilitan hasta un 65% de su valor en préstamos de stablecoins.",
    depositLabel: "Monto de BCH a Depositar",
    bchPriceLabel: "Precio BCH:",
    estUsdValue: "Valor estimado en USD:",
    newBorrowCapacity: "Nueva Capacidad de Préstamo que se Habilita:",
    btnDeposit: "Depositar BCH Colateral",
    btnDepositing: "Bloqueando BCH en Bóveda...",
    borrowTitle: "Solicitar Préstamo de Stablecoins",
    borrowDesc: "Fondos acreditados instantáneamente contra tu garantía sin vender tus BCH.",
    borrowAmountLabel: "Monto a Pedir Prestado",
    availableLabel: "Disponible:",
    healthImpactLabel: "Impacto en Ratio de Salud:",
    originationFeeLabel: "Comisión de originación:",
    originationFeeFree: "0.00% (Hackathon Promo)",
    borrowRatePusd: "Tasa: 3.5% APR • BCH CashToken",
    borrowRateUsdc: "Tasa: 4.2% APR • EVM Native",
    btnBorrow: "Retirar Préstamo en",
    btnBorrowing: "Aprobando Préstamo On-Chain...",
    repayTitle: "Pagar Deuda y Restaurar Ratio de Salud",
    repayDesc: "Paga total o parcialmente tus préstamos para liberar tu colateral BCH.",
    debtLabel: "Deuda:",
    repayAmountLabel: "Monto a Pagar",
    pendingDebtLabel: "Deuda pendiente:",
    payAllBtn: "Pagar Todo",
    btnRepay: "Pagar",
    btnRepaying: "Liquidando Pago de Deuda...",
    withdrawTitle: "Retirar Bitcoin Cash a tu Billetera",
    withdrawDesc: "Puedes retirar el BCH no comprometido en préstamos de forma instantánea.",
    withdrawAmountLabel: "Monto de BCH a Retirar",
    safeWithdrawableLabel: "Retirable seguro:",
    btnWithdraw: "Retirar a Mi Billetera",
    btnWithdrawing: "Liberando BCH de Bóveda...",
    howItWorksTitle: "¿Cómo funciona el Préstamo sin Vender BCH?",
    step1Title: "Depositas BCH en garantía: ",
    step1Desc: "Conservas tu exposición completa al precio alcista de Bitcoin Cash.",
    step2Title: "Pides prestado PUSD o USDC: ",
    step2Desc: "Obtienes hasta el 65% de su valor en dólares de inmediato para usar en swaps o transferir.",
    step3Title: "Recuperas tu BCH intacto: ",
    step3Desc: "Pagas tu préstamo cuando desees y retiras tus monedas sin penalización.",
    sponsorBadge: "Patrocinador BLAZE • ParyonUSD (PUSD)",
    sponsorDesc: "Pide prestado PUSD sin comisiones de originación (0%). El primer CashToken de stablecoin nativo en Bitcoin Cash con liquidación en segundos.",
    supplyTitle: "Suministrar Stablecoins y Ganar Rendimiento Pasivo",
    supplyDesc: "Aporta dólares al fondo de liquidez y gana intereses de los préstamos continuamente.",
    suppliedLabel: "Suministrado:",
    supplyAmountLabel: "Monto a Depositar al Fondo de Rendimiento",
    btnSupply: "Depositar y Ganar APY",
    btnWithdrawSupply: "Retirar",
    myYieldTitle: "Mi Balance de Rendimiento Acumulado",
    yieldEarnedLabel: "Rendimientos Ganados",
    yieldEarnedSub: "Auto-capitalizable cada segundo",
    pusdSuppliedLabel: "PUSD Suministrado:",
    usdcSuppliedLabel: "USDC Suministrado:",
    marketsTitle: "Mercados del Protocolo de Préstamos",
    marketsDesc: "Parámetros de riesgo, liquidez disponible y tasas de interés en tiempo real.",
    oracleSource: "Oráculo Origen:",
    referencePrice: "Precio de Referencia:",
    maxLtv: "LTV Máximo:",
    liquidationThreshold: "Umbral Liquidación:",
    liquidationPenalty: "Penalización:",
    borrowRate: "Tasa Préstamo (Borrow APR):",
    supplyRate: "Tasa Rendimiento (Supply APY):",
    availLiquidity: "Liquidez Disponible:",
    originationFee: "Comisión Originación:",
    settlementNetwork: "Red de Liquidación:",
    bchMarketSubtitle: "Mercado de Colateral L1",
    bchMarketBadge: "Colateral",
    pusdMarketSubtitle: "BCH CashToken Sponsor",
    pusdMarketBadge: "Préstamo",
    usdcMarketSubtitle: "Polygon PoS Native",
    usdcMarketBadge: "Préstamo",
    toastEnterValidBch: "Ingresa una cantidad válida de BCH",
    toastEnterValidBchWithdraw: "Ingresa una cantidad válida de BCH para retirar",
    toastEnterValidAmount: "Ingresa una cantidad válida",
    toastCollateralAdded: "BCH agregados a tu bóveda de garantía!",
    toastCollateralWithdrawn: "BCH liberados de tu bóveda!",
    toastLoanApproved: "acreditado a tu billetera!",
    toastRepaySuccess: "procesado! Tu deuda ha disminuido.",
    toastSupplySuccess: "depositados al fondo de rendimiento!",
    toastWithdrawSupplySuccess: "retirados con éxito!",
    toastConnectionError: "Error de conexión"
  }
};

export default function LendingView({
  userAddress,
  backendUrl,
  isWalletConnected,
  onConnectWallet,
  showToast,
  lang = 'en'
}: LendingViewProps) {
  const t = lendTexts[lang] || lendTexts.en;
  const [activeTab, setActiveTab] = useState<'vault' | 'supply' | 'markets'>('vault');
  const [vaultSubTab, setVaultSubTab] = useState<'deposit_collateral' | 'withdraw_collateral' | 'borrow' | 'repay'>('deposit_collateral');

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
      showToast(t.toastEnterValidBch, 'error');
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
        showToast(`¡${amt} ${t.toastCollateralAdded}`, 'success');
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
        setDepositCollateralAmount('');
        await fetchData();
      } else {
        showToast(data.error || 'Error', 'error');
      }
    } catch (err: any) {
      showToast(err.message || t.toastConnectionError, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdrawCollateral = async () => {
    const amt = parseFloat(withdrawCollateralAmount);
    if (isNaN(amt) || amt <= 0) {
      showToast(t.toastEnterValidBchWithdraw, 'error');
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
        showToast(`¡${amt} ${t.toastCollateralWithdrawn}`, 'success');
        confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } });
        setWithdrawCollateralAmount('');
        await fetchData();
      } else {
        showToast(data.error || 'Error', 'error');
      }
    } catch (err: any) {
      showToast(err.message || t.toastConnectionError, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBorrow = async () => {
    const amt = parseFloat(borrowAmount);
    if (isNaN(amt) || amt <= 0) {
      showToast(`${t.toastEnterValidAmount} (${borrowToken})`, 'error');
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
        showToast(`¡${amt} ${borrowToken} ${t.toastLoanApproved}`, 'success');
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
        setBorrowAmount('');
        await fetchData();
      } else {
        showToast(data.error || 'Error', 'error');
      }
    } catch (err: any) {
      showToast(err.message || t.toastConnectionError, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRepay = async () => {
    const amt = parseFloat(repayAmount);
    if (isNaN(amt) || amt <= 0) {
      showToast(`${t.toastEnterValidAmount} (${repayToken})`, 'error');
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
        showToast(`¡${amt} ${repayToken} ${t.toastRepaySuccess}`, 'success');
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
        setRepayAmount('');
        await fetchData();
      } else {
        showToast(data.error || 'Error', 'error');
      }
    } catch (err: any) {
      showToast(err.message || t.toastConnectionError, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSupply = async () => {
    const amt = parseFloat(supplyAmount);
    if (isNaN(amt) || amt <= 0) {
      showToast(`${t.toastEnterValidAmount} (${supplyToken})`, 'error');
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
        showToast(`¡${amt} ${supplyToken} ${t.toastSupplySuccess}`, 'success');
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
        setSupplyAmount('');
        await fetchData();
      } else {
        showToast(data.error || 'Error', 'error');
      }
    } catch (err: any) {
      showToast(err.message || t.toastConnectionError, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdrawSupply = async () => {
    const amt = parseFloat(withdrawSupplyAmount);
    if (isNaN(amt) || amt <= 0) {
      showToast(`${t.toastEnterValidAmount} (${withdrawSupplyToken})`, 'error');
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
        showToast(`¡${amt} ${withdrawSupplyToken} ${t.toastWithdrawSupplySuccess}`, 'success');
        confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } });
        setWithdrawSupplyAmount('');
        await fetchData();
      } else {
        showToast(data.error || 'Error', 'error');
      }
    } catch (err: any) {
      showToast(err.message || t.toastConnectionError, 'error');
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
          <span>{t.heroBadge}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-950 dark:text-white tracking-tight">
          {t.heroTitle}
        </h1>
        <p className="text-xs sm:text-sm md:text-base text-gray-500 dark:text-gray-400 mt-2 sm:mt-3 leading-relaxed">
          {t.heroSubtitle1}<strong className="text-gray-900 dark:text-white font-bold">{t.heroSubtitleBch}</strong>{t.heroSubtitle2}<strong className="text-primary font-bold">{t.heroSubtitlePusd}</strong>{t.heroSubtitleOr}<strong className="text-blue-500 font-bold">{t.heroSubtitleUsdc}</strong>{t.heroSubtitle3}
        </p>
      </div>

      {/* TOP USER METRICS DASHBOARD */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        
        {/* CARD 1: COLLATERAL */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#121622] border border-gray-200/80 dark:border-gray-800 shadow-2xs">
          <div className="flex items-center justify-between text-gray-400 mb-1.5 sm:mb-2">
            <span className="text-[11px] sm:text-xs font-medium">{t.cardCollateralTitle}</span>
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
            <span className="text-emerald-500 font-bold">{t.cardCollateralLtv}</span>
          </div>
        </div>

        {/* CARD 2: BORROWED DEBT */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#121622] border border-gray-200/80 dark:border-gray-800 shadow-2xs">
          <div className="flex items-center justify-between text-gray-400 mb-1.5 sm:mb-2">
            <span className="text-[11px] sm:text-xs font-medium">{t.cardDebtTitle}</span>
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

        {/* CARD 3: HEALTH FACTOR */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#121622] border border-gray-200/80 dark:border-gray-800 shadow-2xs">
          <div className="flex items-center justify-between text-gray-400 mb-1.5 sm:mb-2">
            <span className="text-[11px] sm:text-xs font-medium">{t.cardHealthTitle}</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl md:text-3xl font-black font-mono flex items-baseline gap-2">
            {vault.totalDebtUsd === 0 ? (
              <span className="text-emerald-500">{t.cardHealthInfinite}</span>
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
              {vault.healthStatus === 'SAFE' ? t.cardHealthSafe : vault.healthStatus === 'MODERATE' ? t.cardHealthModerate : t.cardHealthAlert}
            </span>
          </div>
          <span className="text-[11px] text-gray-400 mt-1 block">
            {t.cardHealthSub}
          </span>
        </div>

        {/* CARD 4: AVAILABLE TO BORROW */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#121622] border border-gray-200/80 dark:border-gray-800 shadow-2xs">
          <div className="flex items-center justify-between text-gray-400 mb-1.5 sm:mb-2">
            <span className="text-[11px] sm:text-xs font-medium">{t.cardAvailableTitle}</span>
            <DollarSign className="w-4 h-4 text-primary" />
          </div>
          <div className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 dark:text-white font-mono">
            ${vault.availableBorrowUsd.toLocaleString()}
          </div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-1 inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            {t.cardAvailableSub}
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
          <span>{t.tabVault}</span>
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
          <span>{t.tabSupply}</span>
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
          <span>{t.tabMarkets}</span>
        </button>
      </div>

      {/* TAB 1: VAULT & BORROW */}
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
                {t.subTabDeposit}
              </button>
              <button
                onClick={() => setVaultSubTab('borrow')}
                className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  vaultSubTab === 'borrow'
                    ? 'bg-white dark:bg-[#222c42] text-primary shadow-xs'
                    : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {t.subTabBorrow}
              </button>
              <button
                onClick={() => setVaultSubTab('repay')}
                className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  vaultSubTab === 'repay'
                    ? 'bg-white dark:bg-[#222c42] text-emerald-500 shadow-xs'
                    : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {t.subTabRepay}
              </button>
              <button
                onClick={() => setVaultSubTab('withdraw_collateral')}
                className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  vaultSubTab === 'withdraw_collateral'
                    ? 'bg-white dark:bg-[#222c42] text-gray-900 dark:text-white shadow-xs'
                    : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {t.subTabWithdraw}
              </button>
            </div>

            {/* ACTION 1: DEPOSIT COLLATERAL */}
            {vaultSubTab === 'deposit_collateral' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-extrabold text-gray-900 dark:text-white">
                    {t.depositTitle}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {t.depositDesc}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#161c28] border border-gray-100 dark:border-gray-800">
                  <div className="flex justify-between items-center text-xs text-gray-400 mb-2">
                    <span>{t.depositLabel}</span>
                    <span className="font-mono">{t.bchPriceLabel} <strong>${bchPrice.toFixed(2)} USD</strong></span>
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
                    <span>{t.estUsdValue}</span>
                    <span className="font-mono font-bold text-gray-900 dark:text-white">
                      ${((parseFloat(depositCollateralAmount) || 0) * bchPrice).toFixed(2)} USD
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1">
                  <div className="flex justify-between items-center text-emerald-700 dark:text-emerald-400 font-medium">
                    <span>{t.newBorrowCapacity}</span>
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
                      <span>{t.btnDepositing}</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>{t.btnDeposit}</span>
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
                    {t.borrowTitle}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {t.borrowDesc}
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
                    <span className="text-[11px] text-gray-400 block">{t.borrowRatePusd}</span>
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
                    <span className="text-[11px] text-gray-400 block">{t.borrowRateUsdc}</span>
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#161c28] border border-gray-100 dark:border-gray-800">
                  <div className="flex justify-between items-center text-xs text-gray-400 mb-2">
                    <span>{t.borrowAmountLabel}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{t.availableLabel} <strong>${vault.availableBorrowUsd.toLocaleString()}</strong></span>
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
                      <span className="text-gray-400">{t.healthImpactLabel}</span>
                      <span className="font-mono font-bold">
                        {vault.collateralUsd > 0 ? (
                          ((vault.collateralUsd * 0.80) / (vault.totalDebtUsd + parseFloat(borrowAmount))).toFixed(2)
                        ) : '0.00'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">{t.originationFeeLabel}</span>
                      <span className="text-emerald-500 font-bold font-mono">{t.originationFeeFree}</span>
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
                      <span>{t.btnBorrowing}</span>
                    </>
                  ) : (
                    <>
                      <ArrowDownLeft className="w-4 h-4" />
                      <span>{t.btnBorrow} {borrowToken}</span>
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
                    {t.repayTitle}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {t.repayDesc}
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
                      {t.debtLabel} <strong>{vault.totalPusdDebt.toFixed(2)} PUSD</strong>
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
                      {t.debtLabel} <strong>{vault.totalUsdcDebt.toFixed(2)} USDC</strong>
                    </span>
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#161c28] border border-gray-100 dark:border-gray-800">
                  <div className="flex justify-between items-center text-xs text-gray-400 mb-2">
                    <span>{t.repayAmountLabel}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">
                        {t.pendingDebtLabel} <strong>{(repayToken === 'PUSD' ? vault.totalPusdDebt : vault.totalUsdcDebt).toFixed(2)} {repayToken}</strong>
                      </span>
                      {(repayToken === 'PUSD' ? vault.totalPusdDebt : vault.totalUsdcDebt) > 0 && (
                        <button
                          onClick={() => setRepayAmount(String((repayToken === 'PUSD' ? vault.totalPusdDebt : vault.totalUsdcDebt)))}
                          className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded cursor-pointer"
                        >
                          {t.payAllBtn}
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
                      <span>{t.btnRepaying}</span>
                    </>
                  ) : (
                    <>
                      <ArrowUpRight className="w-4 h-4" />
                      <span>{t.btnRepay} {repayAmount || '0'} {repayToken}</span>
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
                    {t.withdrawTitle}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {t.withdrawDesc}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#161c28] border border-gray-100 dark:border-gray-800">
                  <div className="flex justify-between items-center text-xs text-gray-400 mb-2">
                    <span>{t.withdrawAmountLabel}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{t.safeWithdrawableLabel} <strong>{vault.withdrawableBch.toFixed(4)} BCH</strong></span>
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
                      <span>{t.btnWithdrawing}</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-4 h-4" />
                      <span>{t.btnWithdraw} {withdrawCollateralAmount || '0'} BCH</span>
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
                  {t.howItWorksTitle}
                </h4>
              </div>

              <div className="space-y-3 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                  <p><strong className="text-gray-900 dark:text-white">{t.step1Title}</strong>{t.step1Desc}</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                  <p><strong className="text-gray-900 dark:text-white">{t.step2Title}</strong>{t.step2Desc}</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
                  <p><strong className="text-gray-900 dark:text-white">{t.step3Title}</strong>{t.step3Desc}</p>
                </div>
              </div>
            </div>

            {/* SPONSOR CALLOUT: PUSD CASH TOKEN */}
            <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-emerald-500/10 border border-amber-500/20 shadow-2xs">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
                <span className="text-xs font-black uppercase text-orange-600 dark:text-orange-400 tracking-wider">
                  {t.sponsorBadge}
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                {t.sponsorDesc}
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
                  {t.supplyTitle}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {t.supplyDesc}
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
                  {t.suppliedLabel} <strong>{supply.suppliedPusd.toFixed(2)} PUSD</strong>
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
                  {t.suppliedLabel} <strong>{supply.suppliedUsdc.toFixed(2)} USDC</strong>
                </span>
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#161c28] border border-gray-100 dark:border-gray-800 mb-5">
              <span className="text-xs text-gray-400 block mb-2">{t.supplyAmountLabel}</span>
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
                <span>{t.btnSupply}</span>
              </button>

              <button
                onClick={handleWithdrawSupply}
                disabled={isSubmitting || !supplyAmount}
                className="px-5 py-3.5 rounded-2xl bg-gray-100 dark:bg-[#1e2538] hover:bg-gray-200 dark:hover:bg-[#28324a] text-gray-700 dark:text-gray-200 font-bold text-sm transition-all cursor-pointer"
              >
                {t.btnWithdrawSupply}
              </button>
            </div>

          </div>

          <div className="lg:col-span-5 space-y-4">
            <div className="p-5 rounded-3xl bg-white dark:bg-[#121622] border border-gray-200/90 dark:border-gray-800 shadow-2xs">
              <h4 className="font-extrabold text-sm text-gray-900 dark:text-white mb-3">
                {t.myYieldTitle}
              </h4>

              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center mb-4">
                <span className="text-xs text-gray-400 block uppercase font-bold">{t.yieldEarnedLabel}</span>
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1 block">
                  +${(supply.yieldEarnedPusd + supply.yieldEarnedUsdc).toFixed(4)} USD
                </span>
                <span className="text-[10px] text-emerald-500 font-medium">{t.yieldEarnedSub}</span>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between items-center p-2 rounded-xl bg-gray-50 dark:bg-[#161c28]">
                  <span className="text-gray-400">{t.pusdSuppliedLabel}</span>
                  <span className="font-bold text-gray-900 dark:text-white">{supply.suppliedPusd.toFixed(2)} PUSD</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-xl bg-gray-50 dark:bg-[#161c28]">
                  <span className="text-gray-400">{t.usdcSuppliedLabel}</span>
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
                {t.marketsTitle}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {t.marketsDesc}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-gray-400">{t.oracleSource}</span>
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
                    <span className="text-[10px] text-gray-400">{t.bchMarketSubtitle}</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  {t.bchMarketBadge}
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-gray-400">
                  <span>{t.referencePrice}</span>
                  <span className="font-mono font-bold text-gray-900 dark:text-white">${bchPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>{t.maxLtv}</span>
                  <span className="font-mono font-bold text-emerald-500">65%</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>{t.liquidationThreshold}</span>
                  <span className="font-mono font-bold text-rose-500">80%</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>{t.liquidationPenalty}</span>
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
                    <span className="text-[10px] text-gray-400">{t.pusdMarketSubtitle}</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  {t.pusdMarketBadge}
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-gray-400">
                  <span>{t.borrowRate}</span>
                  <span className="font-mono font-bold text-primary">3.5% APR</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>{t.supplyRate}</span>
                  <span className="font-mono font-bold text-emerald-500">5.8% APY</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>{t.availLiquidity}</span>
                  <span className="font-mono font-bold text-gray-900 dark:text-white">175,800 PUSD</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>{t.originationFee}</span>
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
                    <span className="text-[10px] text-gray-400">{t.usdcMarketSubtitle}</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-full">
                  {t.usdcMarketBadge}
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-gray-400">
                  <span>{t.borrowRate}</span>
                  <span className="font-mono font-bold text-blue-500">4.2% APR</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>{t.supplyRate}</span>
                  <span className="font-mono font-bold text-emerald-500">6.4% APY</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>{t.availLiquidity}</span>
                  <span className="font-mono font-bold text-gray-900 dark:text-white">137,500 USDC</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>{t.settlementNetwork}</span>
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
