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
  lang?: 'en' | 'es';
}

const poolTexts = {
  en: {
    // Header
    badge: "Mainnet Cross-Chain AMM Liquidity",
    title: "Liquidity Pools & Automated Yield",
    subtitle: "Provide liquidity on Bitcoin Cash Mainnet and Polygon PoS. Earn passive 0.20% fees from every swap auto-compounded into reserves with zero impermanent loss on stable pairs.",

    // Protocol metrics stats cards
    statTvlLabel: "Total Protocol TVL",
    statTvlSub: "100% Solvent on Mainnet",
    statVolumeLabel: "Cumulative Volume",
    statVolumeSub: "On Verified On-Chain Pairs",
    statFeesLabel: "LP Fees Paid",
    statFeesSub: "0.20% to LPs • 0.10% Treasury",
    statPairsLabel: "Active Pairs / Funding",
    statActive: "Active",
    statGoal: "Goal",
    statPairsSub: "Auto-unlocks at 100%",

    // Filter tabs & buttons
    tabAll: "All Pools",
    tabActive: "Active",
    tabBootstrapping: "Funding / Goal",
    tabMyPositions: "My Positions",
    btnCreatePair: "+ Create New Pair",
    refreshTooltip: "Refresh Data",

    // Pool cards
    sponsorBadge: "BLAZE Sponsor",
    antiRugLock: "Anti-Rug Lock • Goal",
    standardPair: "Standard AMM (Uniswap)",
    verifiedOfficial: "Official Verified",
    communityBadge: "Community",
    verifyAction: "Verify (5 PUSD)",
    verifyTitle: "Verify this token with a trust badge",
    viewExplorer: "View CashToken on block explorer",
    statusActive: "Active",
    statusFunding: "Funding",
    unlockGoal: "Unlock Goal",
    unlockRemainingPrefix: "Contribute the remaining",
    unlockRemainingSuffix: "USD to automatically unlock instant swaps on this pair.",
    poolTvl: "Pool TVL",
    annualApy: "Annual APY",
    lpFee: "LP Fee",
    reservePrefix: "Reserve",
    btnProvideLiquidity: "Provide Liquidity & Earn Yield",

    // User positions table
    positionsTitle: "My Active Liquidity Positions",
    refresh: "Refresh",
    noPositionsTitle: "You have no liquidity positions yet",
    noPositionsDesc: "Provide liquidity in any of the pools to automatically accrue 0.20% of all swap transactions in your balance.",
    btnExplorePools: "Explore Pools",
    thPair: "Pair",
    thShares: "Shares (LP Shares)",
    thPoolShare: "Pool Share",
    thDeposit: "Initial Deposit",
    thCurrentValue: "Current Value",
    thProfit: "Earned Profit",
    thAction: "Action",
    btnWithdraw: "Withdraw Funds",

    // Add Liquidity modal
    modalAddTitle: "Provide Liquidity •",
    depositTabPrefix: "Deposit",
    depositAmountLabel: "Amount to Deposit",
    balanceLabel: "Balance:",
    sharesToReceive: "Liquidity Shares to Receive:",
    newShareRatio: "Your Resulting Pool Share:",
    projectedYield: "Projected Yield (1 yr):",
    fundingGoalNotePrefix: "Your deposit moves this pool closer to the",
    fundingGoalNoteSuffix: "USD goal for unlock!",
    btnSubmittingAdd: "Minting Liquidity Shares...",
    btnConfirmAdd: "Confirm & Deposit Liquidity",

    // Remove Liquidity modal
    modalRemoveTitle: "Withdraw Liquidity •",
    withdrawPctLabel: "Percentage to Withdraw",
    sharesToBurn: "Shares to Burn:",
    payoutToReceive: "Payout to receive",
    totalUsdReturn: "Total USD Return:",
    feeProfit: "Net Yield from Fees:",
    btnSubmittingRemove: "Burning Shares & Crediting Funds...",
    btnConfirmRemove: "Burn Shares & Withdraw Funds to Wallet",

    // Create Pair modal
    createTitle: "Create Liquidity Pair",
    createSubtitle: "Launch a new CashToken cross-chain AMM pool",
    baseTokenTitle: "Token 1 (CashToken / BCH)",
    quoteTokenTitle: "Token 2 (Quote Asset)",
    symbolPlaceholder: "e.g. LIFT",
    namePlaceholder: "Project Name (optional)",
    initialPrice: "Initial Price (USD)",
    advancedOptions: "Advanced (Category ID & Icon)",
    categoryIdLabel: "CashToken Category ID (64 hex):",
    categoryIdPlaceholder: "Contract Category ID (optional if BCH)...",
    iconLabel: "Logo URL or IPFS Hash (ipfs://...):",
    iconPlaceholder: "https://... or ipfs://...",
    modeLabel: "Pool Launch Mode",
    modeStandard: "Standard AMM",
    modeStandardBadge: "Instant Trading",
    modeStandardDesc: "Deposit both tokens now. Trading activates immediately with 0.20% LP fees.",
    modeBootstrapping: "Fair Launch",
    modeBootstrappingBadge: "Anti-Rug",
    modeBootstrappingDesc: "Deposit base token now. Community funds quote asset until target TVL is reached.",
    amountToDeposit: "Amount to Deposit",
    amountTokenB: "Amount of",
    targetTvl: "Target TVL Goal (USD)",
    previewTitle: "Pair Summary",
    pairLabel: "Pair:",
    priceLabel: "Price:",
    typeLabel: "Type:",
    feeLabel: "Fee:",
    btnCreating: "Registering Liquidity Pair...",
    btnCreate: "Create & Register Pair",

    // Toasts & Notifications
    toastVerified: "Pair officially verified! Badge assigned.",
    toastVerifyError: "Could not verify pair",
    toastNetworkError: "Network connection error",
    toastEnterSymbol: "Please enter Bitcoin Cash token symbol (e.g. LIFT)",
    toastInvalidCatId: "CashToken Category ID must be exactly 64 hex characters",
    toastCreateSuccess: "Liquidity pair created successfully!",
    toastCreateError: "Error creating pair",
    toastInvalidAmount: "Enter a valid deposit amount",
    toastInsufficientBalance: (bal: number, token: string) => `Insufficient balance. You have ${bal.toLocaleString()} ${token}`,
    toastGoalReached: (pair: string) => `🎉 Congratulations! Your deposit completed the funding goal. ${pair} is now 100% ACTIVE on Mainnet!`,
    toastDepositSuccess: (amt: number, token: string, shares: any) => `Successfully deposited ${amt} ${token}! You received ${shares} LP Shares.`,
    toastDepositError: "Failed to add liquidity",
    toastWithdrawSuccess: (pct: number, aAmt: any, aTok: string, bAmt: any, bTok: string, usd: any) => `Redeemed ${pct}% shares! Received ${aAmt} ${aTok} + ${bAmt} ${bTok} ($${usd} USD) directly in your wallet.`,
    toastWithdrawError: "Failed to withdraw liquidity"
  },
  es: {
    // Header
    badge: "Liquidez AMM Cross-Chain en Mainnet",
    title: "Pools de Liquidez & Rendimiento Automatizado",
    subtitle: "Provee liquidez en la red principal de Bitcoin Cash Mainnet y Polygon PoS. Gana comisiones pasivas del 0.20% de cada swap auto-compuestas en las reservas sin pérdida impermanente en pares estables.",

    // Protocol metrics stats cards
    statTvlLabel: "TVL Total del Protocolo",
    statTvlSub: "{t.statTvlSub}",
    statVolumeLabel: "Volumen Acumulado",
    statVolumeSub: "{t.statVolumeSub}",
    statFeesLabel: "Comisiones a LPs Pagadas",
    statFeesSub: "{t.statFeesSub}",
    statPairsLabel: "Pares Activos / Fondeo",
    statActive: "Activos",
    statGoal: "Meta",
    statPairsSub: "{t.statPairsSub}",

    // Filter tabs & buttons
    tabAll: "Todos los Pools",
    tabActive: "Activos",
    tabBootstrapping: "En Fondeo / Meta",
    tabMyPositions: "Mis Posiciones",
    btnCreatePair: "+ Crear Nuevo Par",
    refreshTooltip: "Actualizar Datos",

    // Pool cards
    sponsorBadge: "Patrocinador BLAZE",
    antiRugLock: "Anti-Rug Lock • Meta",
    standardPair: "Par Estándar (Uniswap)",
    verifiedOfficial: "Verificado Oficial",
    communityBadge: "Comunitario",
    verifyAction: "{t.verifyAction}",
    verifyTitle: "Verificar este token con insignia de confianza",
    viewExplorer: "Ver CashToken en explorador de bloques",
    statusActive: "Activo",
    statusFunding: "Fondeo",
    unlockGoal: "Meta de Desbloqueo",
    unlockRemainingPrefix: "Aporta los",
    unlockRemainingSuffix: "USD restantes para desbloquear automáticamente los swaps instantáneos en este par.",
    poolTvl: "{t.poolTvl}",
    annualApy: "{t.annualApy}",
    lpFee: "{t.lpFee}",
    reservePrefix: "Reserva",
    btnProvideLiquidity: "Aportar Liquidez & Ganar Rendimiento",

    // User positions table
    positionsTitle: "{t.positionsTitle}",
    refresh: "Actualizar",
    noPositionsTitle: "No tienes posiciones de liquidez aún",
    noPositionsDesc: "Aporta liquidez en cualquiera de los pools para acumular automáticamente el 0.20% de todas las transacciones en tu saldo.",
    btnExplorePools: "Explorar Pools",
    thPair: "Par",
    thShares: "Acciones (LP Shares)",
    thPoolShare: "Participación",
    thDeposit: "Depósito Inicial",
    thCurrentValue: "Valor Actual",
    thProfit: "Rendimiento Ganado",
    thAction: "Acción",
    btnWithdraw: "Retirar Fondos",

    // Add Liquidity modal
    modalAddTitle: "Aportar Liquidez •",
    depositTabPrefix: "Depositar",
    depositAmountLabel: "Monto a Depositar",
    balanceLabel: "Saldo:",
    sharesToReceive: "Acciones de Liquidez a Recibir:",
    newShareRatio: "Tu Participación Resultante:",
    projectedYield: "Rendimiento Proyectado (1 año):",
    fundingGoalNotePrefix: "¡Tu depósito acerca este pool a la meta de",
    fundingGoalNoteSuffix: "USD para desbloquearlo!",
    btnSubmittingAdd: "Emitiendo Acciones de Liquidez...",
    btnConfirmAdd: "Confirmar y Depositar Liquidez",

    // Remove Liquidity modal
    modalRemoveTitle: "Retirar Liquidez •",
    withdrawPctLabel: "Porcentaje a Retirar",
    sharesToBurn: "Acciones a Quemar:",
    payoutToReceive: "Pago a recibir",
    totalUsdReturn: "Retorno Total en USD:",
    feeProfit: "Ganancia Neta por Comisiones:",
    btnSubmittingRemove: "Quemando Acciones y Acreditando Fondos...",
    btnConfirmRemove: "Quemar Acciones y Retirar Fondos a Billetera",

    // Create Pair modal
    createTitle: "Crear Par de Liquidez",
    createSubtitle: "Lanza un nuevo pool AMM para cualquier CashToken",
    baseTokenTitle: "Token 1 (CashToken / BCH)",
    quoteTokenTitle: "Token 2 (Activo de Cotización)",
    symbolPlaceholder: "Ej: LIFT",
    namePlaceholder: "Nombre del Proyecto (opcional)",
    initialPrice: "Precio Inicial (USD)",
    advancedOptions: "Opciones Avanzadas (Category ID y Logo)",
    categoryIdLabel: "CashToken Category ID (64 hex):",
    categoryIdPlaceholder: "Category ID del contrato (opcional si es BCH)...",
    iconLabel: "URL del Logo o Hash IPFS (ipfs://...):",
    iconPlaceholder: "https://... o ipfs://...",
    modeLabel: "Modalidad de Lanzamiento",
    modeStandard: "Par Estándar AMM",
    modeStandardBadge: "Trading Inmediato",
    modeStandardDesc: "Depositas ambos tokens ahora. Queda activo de inmediato para trading libre con 0.20% para LPs.",
    modeBootstrapping: "Recaudo Comunitario",
    modeBootstrappingBadge: "Anti-Rug",
    modeBootstrappingDesc: "Depositas el token base ahora y la comunidad fondea la contraparte hasta alcanzar la meta de TVL.",
    amountToDeposit: "Cantidad a Depositar",
    amountTokenB: "Cantidad de",
    targetTvl: "Meta de Recaudo (USD)",
    previewTitle: "Resumen del Par",
    pairLabel: "Par:",
    priceLabel: "Precio:",
    typeLabel: "Tipo:",
    feeLabel: "Comisión:",
    btnCreating: "Registrando Par en el Protocolo...",
    btnCreate: "Crear y Registrar Par",

    // Toasts & Notifications
    toastVerified: "¡Par verificado oficialmente! Insignia asignada.",
    toastVerifyError: "No se pudo verificar el par",
    toastNetworkError: "Error de red",
    toastEnterSymbol: "Por favor ingresa el símbolo del token de Bitcoin Cash (ej: LIFT)",
    toastInvalidCatId: "El CashToken Category ID debe tener exactamente 64 caracteres hexadecimales",
    toastCreateSuccess: "¡Par de liquidez creado con éxito!",
    toastCreateError: "Error al crear el par",
    toastInvalidAmount: "Introduce un monto de depósito válido",
    toastInsufficientBalance: (bal: number, token: string) => `Saldo insuficiente. Tienes ${bal.toLocaleString()} ${token}`,
    toastGoalReached: (pair: string) => `🎉 ¡Felicidades! Tu depósito completó la meta de fondeo. ¡${pair} ahora está 100% ACTIVO en Mainnet!`,
    toastDepositSuccess: (amt: number, token: string, shares: any) => `¡Depositados ${amt} ${token} con éxito! Recibiste ${shares} LP Shares.`,
    toastDepositError: "Fallo al agregar liquidez",
    toastWithdrawSuccess: (pct: number, aAmt: any, aTok: string, bAmt: any, bTok: string, usd: any) => `¡Rescatadas ${pct}% acciones! Recibiste ${aAmt} ${aTok} + ${bAmt} ${bTok} ($${usd} USD) directamente en tu billetera.`,
    toastWithdrawError: "Fallo al retirar liquidez"
  }
};

export default function PoolsView({
  backendUrl = '',
  userAddress,
  onConnectWallet,
  showToast,
  lang = 'en'
}: PoolsViewProps) {
  const t = poolTexts[lang] || poolTexts.en;
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
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

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
        showToast(t.toastVerified, 'success');
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
        await fetchPoolsData();
      } else {
        showToast(data.error || t.toastVerifyError, 'error');
      }
    } catch (e: any) {
      showToast(e.message || t.toastNetworkError, 'error');
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
      showToast(t.toastEnterSymbol, 'error');
      return;
    }
    if (createForm.categoryIdA && createForm.categoryIdA.trim().length !== 64) {
      showToast(t.toastInvalidCatId, 'error');
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
        showToast(data.message || t.toastCreateSuccess, 'success');
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
        showToast(data.error || t.toastCreateError, 'error');
      }
    } catch (err: any) {
      setIsCreatingPool(false);
      showToast(err.message || t.toastNetworkError, 'error');
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
      showToast(t.toastInvalidAmount, 'error');
      return;
    }
    if (num > bal) {
      showToast(t.toastInsufficientBalance(bal, depositToken), 'error');
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
          showToast(t.toastGoalReached(selectedPool.pair), 'success');
        } else {
          showToast(t.toastDepositSuccess(num, depositToken, data.sharesMinted), 'success');
        }
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        setActionModal(null);
        setDepositAmount('');
        await Promise.all([fetchPoolsData(), fetchWalletBalances(), fetchUserPositions()]);
      } else {
        showToast(data.error || t.toastDepositError, 'error');
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
        showToast(t.toastWithdrawSuccess(burnPercentage, data.payout.amountA, data.payout.tokenA, data.payout.amountB, data.payout.tokenB, data.payout.totalUsdValue), 'success');
        confetti({ particleCount: 60, spread: 50, origin: { y: 0.65 } });
        setActionModal(null);
        setSelectedPosition(null);
        await Promise.all([fetchPoolsData(), fetchWalletBalances(), fetchUserPositions()]);
      } else {
        showToast(data.error || t.toastWithdrawError, 'error');
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
          <span>{t.badge}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-950 dark:text-white tracking-tight">
          {t.title}
        </h1>
        <p className="text-xs sm:text-sm md:text-base text-gray-500 dark:text-gray-400 mt-2 sm:mt-3 leading-relaxed">
          {t.subtitle}
        </p>
      </div>

      {/* PROTOCOL METRICS STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#121622] border border-gray-200/80 dark:border-gray-800 shadow-2xs">
          <div className="flex items-center justify-between text-gray-400 mb-1.5 sm:mb-2">
            <span className="text-[11px] sm:text-xs font-medium">{t.statTvlLabel}</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 dark:text-white font-mono">
            ${(protocolStats?.totalTvlUsd ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] sm:text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-1 inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            {t.statTvlSub}
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#121622] border border-gray-200/80 dark:border-gray-800 shadow-2xs">
          <div className="flex items-center justify-between text-gray-400 mb-1.5 sm:mb-2">
            <span className="text-[11px] sm:text-xs font-medium">{t.statVolumeLabel}</span>
            <TrendingUp className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-xl sm:text-2xl md:text-3xl font-black text-orange-500 font-mono">
            ${(protocolStats?.totalVolumeUsd ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] sm:text-[11px] text-gray-400 font-medium mt-1 block">
            {t.statVolumeSub}
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#121622] border border-gray-200/80 dark:border-gray-800 shadow-2xs">
          <div className="flex items-center justify-between text-gray-400 mb-1.5 sm:mb-2">
            <span className="text-[11px] sm:text-xs font-medium">{t.statFeesLabel}</span>
            <Coins className="w-4 h-4 text-primary" />
          </div>
          <div className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 dark:text-white font-mono">
            ${(protocolStats?.totalCumulativeFeesUsd ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] sm:text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1 block">
            {t.statFeesSub}
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#121622] border border-gray-200/80 dark:border-gray-800 shadow-2xs">
          <div className="flex items-center justify-between text-gray-400 mb-1.5 sm:mb-2">
            <span className="text-[11px] sm:text-xs font-medium">{t.statPairsLabel}</span>
            <PieChart className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 dark:text-white font-mono flex items-baseline gap-1.5">
            <span>{protocolStats?.activePoolsCount ?? 0}</span>
            <span className="text-xs text-emerald-500 font-bold uppercase">{t.statActive}</span>
            <span className="text-xs text-gray-400">/</span>
            <span>{protocolStats?.bootstrappingPoolsCount ?? 0}</span>
            <span className="text-xs text-amber-500 font-bold uppercase">{t.statGoal}</span>
          </div>
          <span className="text-[10px] sm:text-[11px] text-gray-400 font-medium mt-1 block">
            {t.statPairsSub}
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
            {t.tabAll} ({allPools.length})
          </button>

          <button
            onClick={() => setActiveTab('active')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'active' 
                ? 'bg-white dark:bg-[#1e2538] text-emerald-600 dark:text-emerald-400 shadow-xs' 
                : 'text-gray-500 dark:text-gray-400 hover:text-emerald-600'
            }`}
          >
            {t.tabActive} ({allPools.filter(p => p.status === 'ACTIVE').length})
          </button>

          <button
            onClick={() => setActiveTab('bootstrapping')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'bootstrapping' 
                ? 'bg-white dark:bg-[#1e2538] text-amber-600 dark:text-amber-400 shadow-xs' 
                : 'text-gray-500 dark:text-gray-400 hover:text-amber-600'
            }`}
          >
            {t.tabBootstrapping} ({allPools.filter(p => p.status === 'BOOTSTRAPPING').length})
          </button>

          <button
            onClick={() => setActiveTab('my-positions')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'my-positions' 
                ? 'bg-white dark:bg-[#1e2538] text-primary shadow-xs' 
                : 'text-gray-500 dark:text-gray-400 hover:text-primary'
            }`}
          >
            {t.tabMyPositions} {positions.length > 0 && `(${positions.length})`}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-orange-600 text-white text-xs font-bold transition-all shadow-md shadow-orange-500/20 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.btnCreatePair}</span>
          </button>

          <button 
            onClick={() => { fetchPoolsData(); fetchWalletBalances(); fetchUserPositions(); }}
            className="text-xs text-gray-400 hover:text-primary transition-colors flex items-center gap-1.5 cursor-pointer font-bold px-2 py-1.5"
            title={t.refreshTooltip}
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
                            <Flame className="w-3 h-3 fill-amber-500" /> {t.sponsorBadge}
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
                                <span>{t.antiRugLock} ${(pool.targetTvlUsd || 0).toLocaleString()}</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3 h-3 text-emerald-500" />
                                <span>{t.standardPair}</span>
                              </>
                            )}
                          </span>
                        )}

                        {/* TOKEN VERIFICATION BADGE */}
                        {pool.isVerified ? (
                          <span className="text-[10px] font-bold text-blue-500 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Check className="w-3 h-3 text-blue-500" />
                            <span>{t.verifiedOfficial}</span>
                          </span>
                        ) : pool.isCustom ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                              {t.communityBadge}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleVerifyPool(pool.id)}
                              className="text-[10px] font-bold text-blue-500 hover:text-blue-400 underline cursor-pointer"
                              title={t.verifyTitle}
                            >
                              {t.verifyAction}
                            </button>
                          </div>
                        ) : null}

                        {pool.categoryIdA && (
                          <a
                            href={`https://3xpl.com/bitcoin-cash/token/${pool.categoryIdA}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-gray-400 hover:text-primary font-mono flex items-center gap-1"
                            title={t.viewExplorer}
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
                        {t.statusActive}
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1.5">
                        <Lock className="w-3 h-3 text-amber-500" />
                        {t.statusFunding}
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
                        {t.unlockGoal} ({pool.fundingProgress}%)
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
                      {t.unlockRemainingPrefix} <strong className="text-gray-900 dark:text-white">${pool.remainingFundingUsd.toLocaleString()}</strong> {t.unlockRemainingSuffix}
                    </p>
                  </div>
                )}

                {/* METRICS ROW */}
                <div className="grid grid-cols-3 gap-2 py-4 my-1">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">{t.poolTvl}</span>
                    <span className="text-sm sm:text-base font-black text-gray-900 dark:text-white font-mono">
                      ${pool.tvlUsd.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">{t.annualApy}</span>
                    <span className="text-sm sm:text-base font-black text-orange-500 font-mono">
                      {pool.apyPercentage}%
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">{t.lpFee}</span>
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
                      <span>{t.reservePrefix} {pool.tokenA}:</span>
                    </span>
                    <span className="font-mono font-bold text-gray-900 dark:text-white">
                      {pool.reserveA.toLocaleString()} {pool.tokenA} (${pool.reserveAValueUsd.toLocaleString()})
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1.5">
                      <img src={pool.iconB} className="w-3.5 h-3.5 rounded-full" alt="" />
                      <span>{t.reservePrefix} {pool.tokenB}:</span>
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
                <Plus className="w-4 h-4" /> {t.btnProvideLiquidity}
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
              {t.positionsTitle}
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
            <RefreshCw className="w-3.5 h-3.5" /> {t.refresh}
          </button>
        </div>

        {positions.length === 0 ? (
          <div className="py-14 text-center text-gray-400 space-y-3">
            <Droplets className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600" />
            <h4 className="font-bold text-base text-gray-900 dark:text-white">{t.noPositionsTitle}</h4>
            <p className="text-xs sm:text-sm max-w-md mx-auto text-gray-500">
              {t.noPositionsDesc}
            </p>
            <button
              onClick={() => setActiveTab('all')}
              className="px-5 py-2.5 rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-gray-950 text-xs font-bold hover:opacity-90 cursor-pointer transition-all"
            >
              {t.btnExplorePools}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-100 dark:border-gray-800 text-gray-400 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-3">{t.thPair}</th>
                  <th className="py-3 px-3">{t.thShares}</th>
                  <th className="py-3 px-3">{t.thPoolShare}</th>
                  <th className="py-3 px-3">{t.thDeposit}</th>
                  <th className="py-3 px-3">{t.thCurrentValue}</th>
                  <th className="py-3 px-3">{t.thProfit}</th>
                  <th className="py-3 px-3 text-right">{t.thAction}</th>
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
                        {t.btnWithdraw}
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
                    {t.modalAddTitle} {selectedPool.pair}
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
                  <span>{t.depositTabPrefix} {selectedPool.tokenA}</span>
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
                  <span>{t.depositTabPrefix} {selectedPool.tokenB}</span>
                </button>
              </div>

              {/* AMOUNT INPUT BOX */}
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#161c28] border border-gray-100 dark:border-gray-800 mb-4">
                <div className="flex justify-between items-center text-xs text-gray-400 mb-1.5">
                  <span>{t.depositAmountLabel}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono">
                      {t.balanceLabel} <strong className="text-gray-900 dark:text-white font-bold">{getSelectedTokenBalance().toLocaleString()} {depositToken}</strong>
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
                  <span>{t.sharesToReceive}</span>
                  <span className="font-mono font-bold text-gray-900 dark:text-white">
                    {calcEstimatedShares().toFixed(4)} LP Shares
                  </span>
                </div>

                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>{t.newShareRatio}</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {calcNewPoolSharePercent()}%
                  </span>
                </div>

                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>{t.projectedYield}</span>
                  <span className="font-mono font-bold text-orange-500">
                    +${calcEstimatedAnnualYieldUsd().toFixed(2)} USD ({selectedPool.apyPercentage}%)
                  </span>
                </div>

                {selectedPool.status === 'BOOTSTRAPPING' && (
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700 text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1.5 font-medium">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span>{t.fundingGoalNotePrefix} ${(selectedPool.targetTvlUsd || 2500).toLocaleString()} {t.fundingGoalNoteSuffix}</span>
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
                    <RefreshCw className="w-4 h-4 animate-spin" /> {t.btnSubmittingAdd}
                  </>
                ) : (
                  t.btnConfirmAdd
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
                    {t.modalRemoveTitle} {selectedPosition.pair}
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
                  <span className="text-xs text-gray-400 font-bold uppercase">{t.withdrawPctLabel}</span>
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
                  <span>{t.sharesToBurn}</span>
                  <span className="font-mono font-bold text-gray-900 dark:text-white">
                    {(selectedPosition.shares * (burnPercentage / 100)).toFixed(4)} / {selectedPosition.shares.toFixed(4)}
                  </span>
                </div>

                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>{t.payoutToReceive} ({selectedPosition.tokenA}):</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {(selectedPosition.currentAmountA * (burnPercentage / 100)).toFixed(4)} {selectedPosition.tokenA}
                  </span>
                </div>

                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>{t.payoutToReceive} ({selectedPosition.tokenB}):</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                    {(selectedPosition.currentAmountB * (burnPercentage / 100)).toFixed(4)} {selectedPosition.tokenB}
                  </span>
                </div>

                <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between font-bold">
                  <span className="text-gray-900 dark:text-white">{t.totalUsdReturn}</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                    ${(selectedPosition.totalValueUsd * (burnPercentage / 100)).toFixed(2)} USD
                  </span>
                </div>

                <div className="flex justify-between text-[11px] text-gray-500">
                  <span>{t.feeProfit}</span>
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
                    <RefreshCw className="w-4 h-4 animate-spin" /> {t.btnSubmittingRemove}
                  </>
                ) : (
                  t.btnConfirmRemove
                )}
              </button>
            </motion.div>
          </div>
        )}

        {/* CREATE CUSTOM POOL MODAL - MINIMALIST & FLUID REDESIGN */}
        {createModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="w-full max-w-lg bg-white dark:bg-[#121622] rounded-3xl border border-gray-200/90 dark:border-gray-800 p-5 sm:p-6 shadow-2xl space-y-4 my-8 text-left"
            >
              {/* MODAL HEADER */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-xs">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-base sm:text-lg text-gray-900 dark:text-white">
                      {t.createTitle}
                    </h3>
                    <p className="text-xs text-gray-400 font-medium">
                      {t.createSubtitle}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreatePool} className="space-y-3.5">
                {/* 2-TOKEN PAIR BUILDER */}
                <div className="space-y-1.5">
                  {/* TOKEN A: BASE CASHTOKEN */}
                  <div className="p-3 rounded-2xl bg-gray-50/90 dark:bg-[#161c28] border border-gray-100 dark:border-gray-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-orange-500 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                        {t.baseTokenTitle}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-gray-400 bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-full">
                        BCH CashToken
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        required
                        value={createForm.tokenA}
                        onChange={(e) => setCreateForm({ ...createForm, tokenA: e.target.value.toUpperCase() })}
                        placeholder={t.symbolPlaceholder}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#10141f] border border-gray-200 dark:border-gray-700/80 font-mono font-black text-sm text-gray-900 dark:text-white placeholder:text-gray-400 placeholder:font-normal focus:outline-none focus:border-primary transition-colors"
                      />
                      <input
                        type="text"
                        value={createForm.tokenAName}
                        onChange={(e) => setCreateForm({ ...createForm, tokenAName: e.target.value })}
                        placeholder={t.namePlaceholder}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#10141f] border border-gray-200 dark:border-gray-700/80 text-xs font-medium text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>
                  </div>

                  {/* CENTRAL LINK CONNECTOR */}
                  <div className="flex justify-center -my-2.5 relative z-10">
                    <div className="w-7 h-7 rounded-full bg-white dark:bg-[#1a2233] border border-gray-200 dark:border-gray-700 shadow-xs flex items-center justify-center text-primary">
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  </div>

                  {/* TOKEN B: QUOTE ASSET & PRICE */}
                  <div className="p-3 rounded-2xl bg-gray-50/90 dark:bg-[#161c28] border border-gray-100 dark:border-gray-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-blue-500 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        {t.quoteTokenTitle}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-gray-400 bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-full">
                        {createForm.networkBadgeB}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
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
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#10141f] border border-gray-200 dark:border-gray-700/80 font-bold text-xs text-gray-900 dark:text-white focus:outline-none focus:border-primary transition-colors cursor-pointer"
                      >
                        <option value="USDC">USDC (Polygon PoS)</option>
                        <option value="PUSD">PUSD (BCH CashTokens)</option>
                        <option value="USDT">USDT (Polygon PoS)</option>
                        <option value="BCH">BCH (Native)</option>
                      </select>

                      <div className="relative">
                        <input
                          type="number"
                          step="any"
                          value={createForm.initialPriceUsd}
                          onChange={(e) => setCreateForm({ ...createForm, initialPriceUsd: e.target.value })}
                          placeholder="0.0025"
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#10141f] border border-gray-200 dark:border-gray-700/80 font-mono font-bold text-xs text-gray-900 dark:text-white focus:outline-none focus:border-primary transition-colors pr-11"
                        />
                        <span className="absolute right-3 top-2 text-[10px] font-bold text-gray-400 pointer-events-none">
                          USD
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* EXPANDABLE ADVANCED OPTIONS (Clean & Tidy Accordion) */}
                <div className="border border-gray-100 dark:border-gray-800 rounded-2xl p-2.5 bg-gray-50/50 dark:bg-[#141924]">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="w-full flex items-center justify-between text-xs font-bold text-gray-600 dark:text-gray-300 px-1 py-0.5 cursor-pointer hover:text-primary transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-primary" />
                      {t.advancedOptions}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showAdvanced ? 'rotate-180 text-primary' : 'text-gray-400'}`} />
                  </button>

                  <AnimatePresence>
                    {showAdvanced && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-2 pt-2.5 border-t border-gray-200/50 dark:border-gray-700/50 mt-2 text-xs"
                      >
                        <div>
                          <label className="text-[10px] font-medium text-gray-400 block mb-1">
                            {t.categoryIdLabel}
                          </label>
                          <input
                            type="text"
                            value={createForm.categoryIdA}
                            onChange={(e) => setCreateForm({ ...createForm, categoryIdA: e.target.value.toLowerCase() })}
                            placeholder={t.categoryIdPlaceholder}
                            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#10141f] border border-gray-200 dark:border-gray-700 font-mono text-[11px] text-gray-900 dark:text-white focus:outline-none focus:border-primary"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-medium text-gray-400 block mb-1">
                            {t.iconLabel}
                          </label>
                          <div className="flex gap-2 items-center">
                            <input
                              type="text"
                              value={createForm.iconA}
                              onChange={(e) => setCreateForm({ ...createForm, iconA: e.target.value })}
                              placeholder={t.iconPlaceholder}
                              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#10141f] border border-gray-200 dark:border-gray-700 font-mono text-[11px] text-gray-900 dark:text-white focus:outline-none focus:border-primary"
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
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* POOL MODE SELECTOR - MINIMALIST PILL SWITCH */}
                <div className="space-y-1.5">
                  <div className="grid grid-cols-2 p-1 rounded-2xl bg-gray-100 dark:bg-[#161c28] border border-gray-200/80 dark:border-gray-800 text-xs">
                    <button
                      type="button"
                      onClick={() => setCreateForm({ ...createForm, poolMode: 'STANDARD' })}
                      className={`py-2 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        createForm.poolMode === 'STANDARD'
                          ? 'bg-white dark:bg-[#202737] text-gray-900 dark:text-white shadow-xs font-black'
                          : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <span>⚡ {t.modeStandard}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreateForm({ ...createForm, poolMode: 'BOOTSTRAPPING' })}
                      className={`py-2 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        createForm.poolMode === 'BOOTSTRAPPING'
                          ? 'bg-white dark:bg-[#202737] text-amber-500 shadow-xs font-black'
                          : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <span>🔒 {t.modeBootstrapping}</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-gray-500 dark:text-gray-400 px-1 leading-snug">
                    {createForm.poolMode === 'STANDARD' ? t.modeStandardDesc : t.modeBootstrappingDesc}
                  </p>
                </div>

                {/* INITIAL LIQUIDITY INPUTS */}
                {createForm.poolMode === 'BOOTSTRAPPING' ? (
                  <div className="grid grid-cols-2 gap-2.5 p-3 rounded-2xl bg-amber-500/5 border border-amber-500/20">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 block mb-1">
                        {t.amountToDeposit} ({createForm.tokenA || 'Base'}):
                      </label>
                      <input
                        type="number"
                        value={createForm.initialAmountA}
                        onChange={(e) => setCreateForm({ ...createForm, initialAmountA: e.target.value })}
                        placeholder="1000000"
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#10141f] border border-gray-200 dark:border-gray-700 font-mono font-bold text-xs text-gray-900 dark:text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 block mb-1">
                        {t.targetTvl}:
                      </label>
                      <input
                        type="number"
                        value={createForm.targetTvlUsd}
                        onChange={(e) => setCreateForm({ ...createForm, targetTvlUsd: e.target.value })}
                        placeholder="2500"
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#10141f] border border-gray-200 dark:border-gray-700 font-mono font-bold text-xs text-gray-900 dark:text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5 p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 block mb-1">
                        {createForm.tokenA || 'Token A'}:
                      </label>
                      <input
                        type="number"
                        value={createForm.initialAmountA}
                        onChange={(e) => setCreateForm({ ...createForm, initialAmountA: e.target.value })}
                        placeholder="500000"
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#10141f] border border-gray-200 dark:border-gray-700 font-mono font-bold text-xs text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 block mb-1">
                        {createForm.tokenB}:
                      </label>
                      <input
                        type="number"
                        value={createForm.initialAmountB}
                        onChange={(e) => setCreateForm({ ...createForm, initialAmountB: e.target.value })}
                        placeholder="500"
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#10141f] border border-gray-200 dark:border-gray-700 font-mono font-bold text-xs text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                )}

                {/* LIVE PREVIEW BADGE */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-[#161c28] border border-gray-100 dark:border-gray-800 text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-gray-900 dark:text-white text-xs">
                      {createForm.tokenA || 'TOKEN'} / {createForm.tokenB}
                    </span>
                    <span className="text-gray-400">•</span>
                    <span className="text-emerald-500 font-mono font-bold">
                      ${createForm.initialPriceUsd || '0.00'} USD
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    createForm.poolMode === 'STANDARD'
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                  }`}>
                    {createForm.poolMode === 'STANDARD' ? 'Active AMM' : `Goal: $${createForm.targetTvlUsd}`}
                  </span>
                </div>

                {/* SUBMIT BUTTON */}
                <button
                  type="submit"
                  disabled={isCreatingPool || !createForm.tokenA}
                  className="w-full py-3.5 rounded-2xl font-bold text-sm bg-primary hover:bg-orange-600 disabled:opacity-50 text-white shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isCreatingPool ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{t.btnCreating}</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>{t.btnCreate}</span>
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
