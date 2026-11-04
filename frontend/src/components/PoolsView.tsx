import React, { useState, useEffect } from 'react';
import {
  Droplets,
  TrendingUp,
  DollarSign,
  Coins,
  Plus,
  RefreshCw,
  Sparkles,
  ExternalLink,
  PieChart,
  Wallet,
  Lock,
  Flame,
  ChevronDown,
  Layers,
  ShieldCheck,
  Check,
  Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  executeWeb3LpDeposit,
  DEPLOYED_TESTNET_CONTRACTS
} from '../services/walletConnectService';
import {
  convertCashAddressNetwork,
  generateQrDataUrl
} from '../utils/bchAddress';

interface PoolData {
  id: string;
  pair: string;
  name: string;
  tokenA: string;
  tokenB: string;
  network?: string;
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
  status: 'ACTIVE' | 'BOOTSTRAPPING' | 'NO_LIQUIDITY';
  hasLiquidity?: boolean;
  liquidityBadge?: string;
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
  vaultAddressA?: string | null;
  vaultAddressB?: string | null;
  tokenAddressB?: string | null;
  contractExplorerA?: string | null;
  contractExplorerB?: string | null;
  creatorFeePercent?: number;
  isVerified?: boolean;
  verificationBadge?: string;
}

interface UserPosition {
  id: string;
  poolId: string;
  pair: string;
  providerAddress: string;
  bchAddress?: string | null;
  evmAddress?: string | null;
  shares: number;
  depositedAmount: number;
  tokenSymbol: string;
  depositUsd: number;
  txHash?: string;
  explorerUrl?: string;
  network?: string;
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
  bchAddress?: string;
  evmAddress?: string;
  platformNetwork?: 'mainnet' | 'testnet';
  onToggleNetwork?: (net: 'mainnet' | 'testnet') => void;
  onRefreshBalances?: () => void;
  onConnectWallet: () => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
  lang?: 'en' | 'es';
}

const poolTexts = {
  en: {
    badgeTestnet: 'Non-Custodial Smart Contract Vaults • Testnet',
    badgeMainnet: 'Cross-Chain AMM Liquidity • Mainnet',
    title: 'Liquidity Pools & Automated Yield',
    subtitleTestnet:
      'Provide real on-chain liquidity into BinaryLiquidVault.cash (BCH Chipnet) and BinaryLiquidVault.sol (Polygon Amoy). Earn 0.20% fees from every PUSD ⟷ USDT cross-chain swap.',
    subtitleMainnet:
      'Mainnet vaults currently have no active liquidity (Sin Liquidez). Switch to Testnet to test live non-custodial liquidity provision on PUSD ⟷ USDT.',

    statTvlLabel: 'Total Protocol TVL',
    statTvlSubTestnet: 'Verified On-Chain Smart Contracts',
    statTvlSubMainnet: 'Mainnet: No Liquidity Active',
    statVolumeLabel: 'Settled Swap Volume',
    statVolumeSub: 'Real On-Chain Settlements',
    statFeesLabel: 'LP Fees Accrued',
    statFeesSub: '0.20% to LPs • 0.10% Protocol',
    statPairsLabel: 'Active Pairs / No Liquidity',
    statActive: 'Active',
    statNoLiq: 'No Liq.',
    statPairsSub: 'PUSD / USDT active on Testnet',

    tabAll: 'All Pools',
    tabActive: 'Active',
    tabBootstrapping: 'Bootstrapping',
    tabMyPositions: 'My Positions',
    btnCreatePair: '+ Register Pair',
    refreshTooltip: 'Refresh On-Chain Data',

    sponsorBadge: 'BLAZE Sponsor',
    antiRugLock: 'Anti-Rug Lock • Goal',
    standardPair: 'Standard AMM',
    verifiedOfficial: 'Official Vault',
    communityBadge: 'Community',
    verifyAction: 'Verify Pair',
    verifyTitle: 'Mark custom pair as verified',
    viewExplorer: 'Inspect Smart Contract on Explorer',
    statusActive: 'Active',
    statusNoLiquidity: 'Sin Liquidez',
    statusFunding: 'Bootstrapping',
    unlockGoal: 'Unlock Goal',
    unlockRemainingPrefix: 'Remaining:',
    unlockRemainingSuffix: 'USD to unlock active swaps.',
    poolTvl: 'Vault TVL',
    annualApy: 'Estimated APY',
    lpFee: 'LP Fee Tier',
    reservePrefix: 'Vault Reserve',
    btnProvideLiquidity: 'Provide Liquidity & Earn Yield',
    btnSwitchToTestnet: 'No Liquidity on Mainnet • Switch to Testnet',
    btnNoLiquidityDisabled: 'No Liquidity Available',

    positionsTitle: 'My Non-Custodial LP Positions',
    refresh: 'Refresh',
    noPositionsTitle: 'No active LP positions found',
    noPositionsDesc:
      'Deposit PUSD (Chipnet) or USDT (Polygon Amoy) into the PUSD / USDT Smart Contract Vault to mint LP Shares and earn 0.20% swap fees.',
    btnExplorePools: 'View Active Pools',
    thPair: 'Pool',
    thShares: 'LP Shares',
    thPoolShare: 'Vault Share',
    thDeposit: 'On-Chain Deposit',
    thCurrentValue: 'Redeemable Value',
    thProfit: 'Accrued Fees',
    thAction: 'Action',
    btnWithdraw: 'Withdraw On-Chain',

    modalAddTitle: 'Provide Liquidity •',
    depositTabPrefix: 'Deposit',
    depositAmountLabel: 'Amount to Deposit',
    balanceLabel: 'Wallet Balance:',
    sharesToReceive: 'LP Shares to Mint:',
    newShareRatio: 'Resulting Vault Share:',
    projectedYield: 'Estimated Annual Yield:',
    fundingGoalNotePrefix: 'Moves this pool toward its',
    fundingGoalNoteSuffix: 'USD funding target.',
    btnSubmittingAdd: 'Verifying On-Chain Deposit...',
    btnConfirmAddEvm: '⚡ Sign & Deposit USDT via Web3 Vault',
    btnConfirmAddBch: 'Verify BCH Covenant TX & Mint LP Shares',

    modalRemoveTitle: 'Withdraw Liquidity •',
    withdrawPctLabel: 'Shares to Burn',
    sharesToBurn: 'LP Shares to Burn:',
    payoutToReceive: 'On-Chain Payout:',
    totalUsdReturn: 'Total Redemption Value:',
    feeProfit: 'Accrued LP Fee Yield:',
    btnSubmittingRemove: 'Releasing Funds from Smart Contract...',
    btnConfirmRemove: 'Burn LP Shares & Release to Wallet',

    createTitle: 'Register Custom CashToken Pair',
    createSubtitle: 'List a Bitcoin Cash CashToken pair in Bootstrapping mode',
    baseTokenTitle: 'Token 1 (CashToken / BCH)',
    quoteTokenTitle: 'Token 2 (Quote Asset)',
    symbolPlaceholder: 'e.g. LIFT',
    namePlaceholder: 'Token Name (optional)',
    advancedOptions: 'Advanced (Category ID & Logo)',
    categoryIdLabel: 'CashToken Category ID (64 hex):',
    categoryIdPlaceholder: '64-character hex category ID...',
    iconLabel: 'Logo URL or IPFS URI (ipfs://...):',
    iconPlaceholder: 'https://... or ipfs://...',
    modeStandard: 'Standard Pair',
    modeStandardDesc: 'Registers the pair entry (starts with Sin Liquidez until funded on-chain).',
    modeBootstrapping: 'Fair Launch Goal',
    modeBootstrappingDesc: 'Sets a community TVL target with Anti-Rug protection.',
    amountToDeposit: 'Target Base Supply',
    targetTvl: 'Target TVL Goal (USD)',
    btnCreating: 'Registering Pair...',
    btnCreate: 'Register Liquidity Pair',

    toastVerified: 'Pool verified successfully!',
    toastVerifyError: 'Could not verify pool',
    toastNetworkError: 'Network communication error',
    toastEnterSymbol: 'Please enter a valid CashToken symbol',
    toastInvalidCatId: 'CashToken Category ID must be exactly 64 hexadecimal characters',
    toastCreateSuccess: 'Custom pair registered successfully!',
    toastCreateError: 'Error registering pair',
    toastInvalidAmount: 'Enter a deposit amount greater than zero',
    toastInsufficientBalance: (bal: number, token: string) =>
      `Insufficient wallet balance (${bal.toLocaleString()} ${token} available)`,
    toastGoalReached: (pair: string) => `🎉 Funding goal reached! ${pair} is now ACTIVE!`,
    toastDepositSuccess: (amt: number, token: string, shares: any) =>
      `Verified on-chain deposit of ${amt} ${token}! Minted ${shares} LP Shares.`,
    toastDepositError: 'Failed to verify liquidity deposit',
    toastWithdrawSuccess: (amt: any, tok: string, tx: string) =>
      `Smart Contract released ${amt} ${tok} on-chain! TX: ${tx.slice(0, 12)}...`,
    toastWithdrawError: 'Failed to release liquidity from Vault'
  },
  es: {
    badgeTestnet: 'Smart Contract Vaults No-Custodios • Testnet',
    badgeMainnet: 'Liquidez AMM Cross-Chain • Mainnet',
    title: 'Pools de Liquidez & Rendimiento On-Chain',
    subtitleTestnet:
      'Aporta liquidez real no-custodia directamente en BinaryLiquidVault.cash (BCH Chipnet) y BinaryLiquidVault.sol (Polygon Amoy). Gana el 0.20% de cada swap PUSD ⟷ USDT.',
    subtitleMainnet:
      'Actualmente todos los pares en Mainnet se encuentran Sin Liquidez ($0 reservas activas). Cambia a Testnet para operar y proveer liquidez real en el par oficial PUSD ⟷ USDT.',

    statTvlLabel: 'TVL Total en Contratos',
    statTvlSubTestnet: 'Verificado On-Chain en Vivo',
    statTvlSubMainnet: 'Mainnet: Sin Liquidez Activa',
    statVolumeLabel: 'Volumen Liquidado',
    statVolumeSub: 'Swaps Reales Liquidados On-Chain',
    statFeesLabel: 'Comisiones de LPs',
    statFeesSub: '0.20% a LPs • 0.10% Protocolo',
    statPairsLabel: 'Pares Activos / Sin Liquidez',
    statActive: 'Activo',
    statNoLiq: 'Sin Liq.',
    statPairsSub: 'PUSD / USDT habilitado en Testnet',

    tabAll: 'Todos los Pools',
    tabActive: 'Con Liquidez',
    tabBootstrapping: 'En Fondeo',
    tabMyPositions: 'Mis Posiciones',
    btnCreatePair: '+ Registrar Par',
    refreshTooltip: 'Actualizar Reservas On-Chain',

    sponsorBadge: 'Patrocinador BLAZE',
    antiRugLock: 'Anti-Rug Lock • Meta',
    standardPair: 'AMM Estándar',
    verifiedOfficial: 'Vault Oficial',
    communityBadge: 'Comunitario',
    verifyAction: 'Verificar Par',
    verifyTitle: 'Solicitar insignia de verificación para este par',
    viewExplorer: 'Ver Smart Contract en el Explorador de Bloques',
    statusActive: 'Activo',
    statusNoLiquidity: 'Sin Liquidez',
    statusFunding: 'En Fondeo',
    unlockGoal: 'Meta de Desbloqueo',
    unlockRemainingPrefix: 'Faltan',
    unlockRemainingSuffix: 'USD para habilitar swaps en este par.',
    poolTvl: 'TVL en Vault',
    annualApy: 'APY Estimado',
    lpFee: 'Comisión LP',
    reservePrefix: 'Reserva en Contrato',
    btnProvideLiquidity: 'Aportar Liquidez & Ganar Rendimiento',
    btnSwitchToTestnet: 'Sin Liquidez en Mainnet • Cambiar a Testnet (PUSD / USDT)',
    btnNoLiquidityDisabled: 'Sin Liquidez Disponible',

    positionsTitle: 'Mis Posiciones de Liquidez No-Custodias',
    refresh: 'Actualizar',
    noPositionsTitle: 'Aún no tienes posiciones de liquidez activas',
    noPositionsDesc:
      'Deposita PUSD (Chipnet) o USDT (Polygon Amoy) en el Smart Contract Vault PUSD / USDT para emitir LP Shares y ganar el 0.20% de los swaps.',
    btnExplorePools: 'Ver Pools Disponibles',
    thPair: 'Par',
    thShares: 'Acciones (LP Shares)',
    thPoolShare: 'Participación',
    thDeposit: 'Depósito On-Chain',
    thCurrentValue: 'Valor Rescatable',
    thProfit: 'Comisiones Ganadas',
    thAction: 'Acción',
    btnWithdraw: 'Retirar On-Chain',

    modalAddTitle: 'Aportar Liquidez •',
    depositTabPrefix: 'Depositar',
    depositAmountLabel: 'Monto a Depositar',
    balanceLabel: 'Saldo en Wallet:',
    sharesToReceive: 'LP Shares a Recibir:',
    newShareRatio: 'Participación en el Vault:',
    projectedYield: 'Rendimiento Anual Proyectado:',
    fundingGoalNotePrefix: 'Tu aporte acerca este par a su meta de',
    fundingGoalNoteSuffix: 'USD.',
    btnSubmittingAdd: 'Verificando Depósito On-Chain...',
    btnConfirmAddEvm: '⚡ Firmar y Depositar USDT en BinaryLiquidVault.sol',
    btnConfirmAddBch: 'Verificar TX en Covenant BCH y Emitir LP Shares',

    modalRemoveTitle: 'Retirar Liquidez •',
    withdrawPctLabel: 'Porcentaje de Acciones a Quemar',
    sharesToBurn: 'LP Shares a Quemar:',
    payoutToReceive: 'Retiro On-Chain a Recibir:',
    totalUsdReturn: 'Valor Total de Rescate:',
    feeProfit: 'Rendimiento por Comisiones:',
    btnSubmittingRemove: 'Liberando Fondos desde el Smart Contract...',
    btnConfirmRemove: 'Quemar LP Shares y Liberar Fondos a mi Wallet',

    createTitle: 'Registrar Par CashToken Personalizado',
    createSubtitle: 'Registra un nuevo par de Bitcoin Cash CashTokens en el protocolo',
    baseTokenTitle: 'Token 1 (CashToken / BCH)',
    quoteTokenTitle: 'Token 2 (Activo Contraparte)',
    symbolPlaceholder: 'Ej: LIFT',
    namePlaceholder: 'Nombre del Proyecto (opcional)',
    advancedOptions: 'Opciones Avanzadas (Category ID y Logo)',
    categoryIdLabel: 'CashToken Category ID (64 hex):',
    categoryIdPlaceholder: 'Hash hexadecimal de 64 caracteres...',
    iconLabel: 'URL del Logo o Hash IPFS (ipfs://...):',
    iconPlaceholder: 'https://... o ipfs://...',
    modeStandard: 'Par Estándar',
    modeStandardDesc: 'Registra el par en el listado (inicia con etiqueta Sin Liquidez hasta fondear contrato).',
    modeBootstrapping: 'Meta Comunitaria',
    modeBootstrappingDesc: 'Define una meta de TVL comunitario con bloqueo Anti-Rug.',
    amountToDeposit: 'Oferta Base Referencial',
    targetTvl: 'Meta de TVL (USD)',
    btnCreating: 'Registrando Par...',
    btnCreate: 'Registrar Par de Liquidez',

    toastVerified: '¡Par verificado exitosamente!',
    toastVerifyError: 'No se pudo verificar el par',
    toastNetworkError: 'Error de conexión con el servidor',
    toastEnterSymbol: 'Ingresa el símbolo del token CashToken (ej: LIFT)',
    toastInvalidCatId: 'El Category ID debe tener exactamente 64 caracteres hexadecimales',
    toastCreateSuccess: '¡Par registrado exitosamente!',
    toastCreateError: 'Error al registrar el par',
    toastInvalidAmount: 'Ingresa un monto de depósito mayor a cero',
    toastInsufficientBalance: (bal: number, token: string) =>
      `Saldo insuficiente en tu billetera (${bal.toLocaleString()} ${token} disponibles)`,
    toastGoalReached: (pair: string) => `🎉 ¡Meta completada! ${pair} ahora está ACTIVO.`,
    toastDepositSuccess: (amt: number, token: string, shares: any) =>
      `¡Depósito on-chain verificado de ${amt} ${token}! Recibiste ${shares} LP Shares.`,
    toastDepositError: 'No se pudo verificar el depósito de liquidez',
    toastWithdrawSuccess: (amt: any, tok: string, tx: string) =>
      `¡Smart Contract liberó ${amt} ${tok} a tu wallet! TX: ${tx.slice(0, 12)}...`,
    toastWithdrawError: 'Error al liberar liquidez desde el Smart Contract'
  }
};

export default function PoolsView({
  backendUrl = '',
  userAddress,
  bchAddress = '',
  evmAddress = '',
  platformNetwork = 'mainnet',
  onToggleNetwork,
  onRefreshBalances,
  onConnectWallet,
  showToast,
  lang = 'es'
}: PoolsViewProps) {
  const isTestnet = platformNetwork === 'testnet';
  const t = poolTexts[lang] || poolTexts.es;
  const isEs = lang === 'es';

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

  // Add Liquidity state
  const [depositToken, setDepositToken] = useState<string>('USDT');
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [bchDepositTxHash, setBchDepositTxHash] = useState<string>('');
  const [bchVaultQr, setBchVaultQr] = useState<string>('');
  const [copiedVault, setCopiedVault] = useState<boolean>(false);
  const [web3StepMsg, setWeb3StepMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Remove Liquidity state
  const [burnPercentage, setBurnPercentage] = useState<number>(100);
  const [withdrawToken, setWithdrawToken] = useState<'USDT' | 'PUSD'>('USDT');

  // Create Pool Form State
  const [createForm, setCreateForm] = useState({
    tokenA: '',
    tokenAName: '',
    categoryIdA: '',
    decimalsA: '6',
    iconA: '',
    tokenB: 'USDT',
    tokenBName: 'Tether USD',
    networkB: 'Polygon Amoy (Testnet)',
    networkBadgeB: 'Polygon Amoy',
    poolMode: 'BOOTSTRAPPING' as 'BOOTSTRAPPING' | 'STANDARD',
    targetTvlUsd: '2500',
    initialAmountA: '100000',
    initialAmountB: '0',
    initialPriceUsd: '0.01'
  });

  const connectedBch =
    bchAddress ||
    (userAddress && (userAddress.startsWith('bchtest:') || userAddress.startsWith('bitcoincash:'))
      ? userAddress
      : '');
  const connectedEvm =
    evmAddress || (userAddress && userAddress.startsWith('0x') ? userAddress : '');
  const effectiveAddress = connectedBch || connectedEvm || userAddress || '';

  useEffect(() => {
    const addr = selectedPool?.vaultAddressA || DEPLOYED_TESTNET_CONTRACTS.chipnetVaultTokenAddress;
    if (actionModal === 'add' && depositToken === 'PUSD' && addr) {
      setBchVaultQr(generateQrDataUrl(addr));
    }
  }, [actionModal, depositToken, selectedPool?.vaultAddressA]);

  const copyText = (txt: string) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(txt);
    }
    setCopiedVault(true);
    setTimeout(() => setCopiedVault(false), 2000);
  };

  // Fetch live network-aware pool statistics
  const fetchPoolsData = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/pools/stats?network=${platformNetwork}`);
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

  // Fetch real non-custodial wallet balances across both BCH & EVM
  const fetchWalletBalances = async () => {
    if (!effectiveAddress) {
      setWalletBalances({});
      return;
    }
    try {
      const qs = new URLSearchParams({
        network: platformNetwork,
        ...(connectedBch ? { bchAddress: connectedBch } : {}),
        ...(connectedEvm ? { evmAddress: connectedEvm } : {})
      });
      const res = await fetch(
        `${backendUrl}/api/wallet/balances/${encodeURIComponent(effectiveAddress)}?${qs.toString()}`
      );
      const data = await res.json();
      if (data.success && data.balances) {
        setWalletBalances(data.balances);
      }
    } catch (err) {
      console.warn('Failed to load wallet balances:', err);
    }
  };

  // Fetch user LP positions unified across both BCH and EVM connected wallets
  const fetchUserPositions = async () => {
    if (!effectiveAddress) {
      setPositions([]);
      return;
    }
    try {
      const qs = new URLSearchParams({
        network: platformNetwork,
        ...(connectedBch ? { bchAddress: connectedBch } : {}),
        ...(connectedEvm ? { evmAddress: connectedEvm } : {})
      });
      const res = await fetch(
        `${backendUrl}/api/pools/positions/${encodeURIComponent(effectiveAddress)}?${qs.toString()}`
      );
      const data = await res.json();
      if (data.success && data.positions) {
        setPositions(data.positions);
      }
    } catch (err) {
      console.warn('Failed to load user positions:', err);
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
    }, 8000);
    return () => clearInterval(interval);
  }, [backendUrl, effectiveAddress, connectedBch, connectedEvm, platformNetwork]);

  const handleVerifyPool = async (poolId: string) => {
    if (!effectiveAddress) {
      onConnectWallet();
      return;
    }
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

  const handleOpenAddModal = (pool: PoolData) => {
    if (!isTestnet) {
      if (onToggleNetwork) onToggleNetwork('testnet');
      showToast(
        isEs
          ? 'Red cambiada a Testnet (PUSD ⟷ USDT con liquidez activa)'
          : 'Network switched to Testnet (PUSD ⟷ USDT with active liquidity)',
        'success'
      );
      return;
    }
    if (!pool.hasLiquidity && pool.id !== 'PUSD_USDT') {
      showToast(
        isEs
          ? `El par ${pool.pair} se encuentra Sin Liquidez actualmente.`
          : `Pair ${pool.pair} currently has 0 reserves (Sin Liquidez).`,
        'error'
      );
      return;
    }
    if (!effectiveAddress) {
      onConnectWallet();
      return;
    }
    setSelectedPool(pool);
    // Default to USDT if EVM wallet is connected, otherwise PUSD
    setDepositToken(connectedEvm ? pool.tokenB : pool.tokenA);
    setDepositAmount('');
    setBchDepositTxHash('');
    setWeb3StepMsg('');
    setActionModal('add');
  };

  const getSelectedTokenBalance = (): number => {
    if (!depositToken) return 0;
    return Number(walletBalances[depositToken.toUpperCase()] || 0);
  };

  const handleSetQuickAmount = (pct: number) => {
    const bal = getSelectedTokenBalance();
    if (bal <= 0) return;
    const calc = bal * (pct / 100);
    setDepositAmount(pct === 100 ? String(Number(bal.toFixed(4))) : calc.toFixed(4));
  };

  const handleCreatePool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveAddress) {
      onConnectWallet();
      return;
    }
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
          network: platformNetwork,
          tokenA: createForm.tokenA.trim().toUpperCase(),
          tokenB: createForm.tokenB.trim().toUpperCase(),
          tokenAName: createForm.tokenAName.trim() || createForm.tokenA.trim().toUpperCase(),
          tokenBName: createForm.tokenBName,
          networkA: isTestnet ? 'BCH Chipnet (Testnet4)' : 'Bitcoin Cash (Mainnet)',
          networkB: createForm.networkB,
          networkBadgeA: isTestnet ? 'Chipnet CashTokens' : 'BCH CashTokens',
          networkBadgeB: createForm.networkBadgeB,
          categoryIdA: createForm.categoryIdA.trim() || null,
          iconA: createForm.iconA.trim() || null,
          decimalsA: parseInt(createForm.decimalsA, 10) || 6,
          decimalsB: 6,
          poolMode: createForm.poolMode,
          targetTvlUsd: parseFloat(createForm.targetTvlUsd) || 2500,
          initialAmountA: parseFloat(createForm.initialAmountA) || 0,
          initialAmountB: parseFloat(createForm.initialAmountB) || 0,
          initialPriceUsd: parseFloat(createForm.initialPriceUsd) || 0.01
        })
      });

      const data = await res.json();
      setIsCreatingPool(false);

      if (data.success) {
        showToast(data.message || t.toastCreateSuccess, 'success');
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        setCreateModalOpen(false);
        setCreateForm({
          ...createForm,
          tokenA: '',
          tokenAName: '',
          categoryIdA: '',
          iconA: ''
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
    if (!selectedPool) return '0.0000';
    const shares = calcEstimatedShares();
    const newTotal = selectedPool.totalShares + shares;
    if (newTotal <= 0) return '0.0000';
    return ((shares / newTotal) * 100).toFixed(4);
  };

  const calcEstimatedAnnualYieldUsd = () => {
    if (!selectedPool) return 0;
    const num = parseFloat(depositAmount);
    if (isNaN(num) || num <= 0) return 0;
    const price = depositToken === selectedPool.tokenA ? selectedPool.priceA : selectedPool.priceB;
    const depositUsd = num * price;
    return Number((depositUsd * (selectedPool.apyPercentage / 100)).toFixed(2));
  };

  // Submit 100% Non-Custodial Add Liquidity (Web3 Vault Transfer for USDT / Covenant TXID Verify for PUSD)
  const handleAddLiquidity = async () => {
    if (!selectedPool) return;
    const num = parseFloat(depositAmount);
    const bal = getSelectedTokenBalance();

    if (isNaN(num) || num <= 0) {
      showToast(t.toastInvalidAmount, 'error');
      return;
    }

    const isEvmDeposit = depositToken === 'USDT' || depositToken === 'USDC';
    if (isEvmDeposit && !connectedEvm) {
      onConnectWallet();
      return;
    }
    if (!isEvmDeposit && !connectedBch) {
      onConnectWallet();
      return;
    }

    if (bal > 0 && num > bal + 0.0001) {
      showToast(t.toastInsufficientBalance(bal, depositToken), 'error');
      return;
    }

    setIsSubmitting(true);
    setWeb3StepMsg('');

    try {
      let confirmedTxHash = bchDepositTxHash.trim();
      let activeProviderAddr = isEvmDeposit ? connectedEvm : connectedBch;

      if (isEvmDeposit) {
        const vaultAddr = selectedPool.vaultAddressB || DEPLOYED_TESTNET_CONTRACTS.amoyVaultAddress;
        const tokenAddr = selectedPool.tokenAddressB || DEPLOYED_TESTNET_CONTRACTS.amoyUsdtAddress;

        const { txHash, sender } = await executeWeb3LpDeposit({
          isTestnet,
          vaultAddress: vaultAddr,
          tokenAddress: tokenAddr,
          amount: num,
          decimals: selectedPool.decimalsB || 6,
          onStatus: msg => setWeb3StepMsg(msg)
        });
        confirmedTxHash = txHash;
        activeProviderAddr = sender || connectedEvm;
      } else {
        if (!confirmedTxHash || confirmedTxHash.length < 64) {
          setIsSubmitting(false);
          showToast(
            isEs
              ? 'Envía primero los PUSD al Covenant BinaryLiquidVault.cash y pega el TXID (64 caracteres hex) para verificar tu depósito.'
              : 'Please send PUSD to BinaryLiquidVault.cash Covenant first and paste the 64-char hex TXID to verify.',
            'error'
          );
          return;
        }
      }

      setWeb3StepMsg(isEs ? 'Registrando LP Shares tras verificación on-chain...' : 'Minting LP shares after on-chain verification...');
      const res = await fetch(`${backendUrl}/api/pools/add-liquidity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerAddress: activeProviderAddr,
          bchAddress: connectedBch ? convertCashAddressNetwork(connectedBch, isTestnet, true) : null,
          evmAddress: connectedEvm || null,
          token: depositToken,
          amount: num,
          poolId: selectedPool.id,
          txHash: confirmedTxHash,
          network: platformNetwork
        })
      });
      const data = await res.json();

      if (data.success) {
        showToast(t.toastDepositSuccess(num, depositToken, data.sharesMinted), 'success');
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        setActionModal(null);
        setDepositAmount('');
        setBchDepositTxHash('');
        setWeb3StepMsg('');
        onRefreshBalances?.();
        await Promise.all([fetchPoolsData(), fetchWalletBalances(), fetchUserPositions()]);
      } else {
        showToast(data.error || t.toastDepositError, 'error');
      }
    } catch (err: any) {
      showToast(err.message || t.toastDepositError, 'error');
    } finally {
      setIsSubmitting(false);
      setWeb3StepMsg('');
    }
  };

  // Submit 100% Non-Custodial Remove Liquidity (Watchman Smart Contract Vault Release)
  const handleRemoveLiquidity = async () => {
    if (!selectedPosition) return;
    const sharesToBurn = selectedPosition.shares * (burnPercentage / 100);
    if (sharesToBurn <= 0) return;

    if (withdrawToken === 'USDT' && !connectedEvm) {
      showToast(
        isEs
          ? 'Conecta tu billetera EVM (MetaMask / WalletConnect) para recibir tus USDT en Polygon Amoy.'
          : 'Connect your EVM wallet (MetaMask / WalletConnect) to receive USDT on Polygon Amoy.',
        'error'
      );
      onConnectWallet();
      return;
    }
    if (withdrawToken === 'PUSD' && !connectedBch) {
      showToast(
        isEs
          ? 'Conecta tu billetera BCH (Paytaca / Cashonize) para recibir tus PUSD en Chipnet.'
          : 'Connect your BCH wallet (Paytaca / Cashonize) to receive PUSD on Chipnet.',
        'error'
      );
      onConnectWallet();
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${backendUrl}/api/pools/remove-liquidity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          positionId: selectedPosition.id,
          providerAddress: effectiveAddress,
          bchAddress: connectedBch ? convertCashAddressNetwork(connectedBch, true, true) : null,
          evmAddress: connectedEvm || null,
          sharesToBurn: Number(sharesToBurn.toFixed(4)),
          poolId: selectedPosition.poolId,
          withdrawToken
        })
      });
      const data = await res.json();

      if (data.success) {
        showToast(
          t.toastWithdrawSuccess(
            data.payout.withdrawnAmount,
            data.payout.withdrawnToken,
            data.txHash || ''
          ),
          'success'
        );
        confetti({ particleCount: 65, spread: 55, origin: { y: 0.65 } });
        setActionModal(null);
        setSelectedPosition(null);
        onRefreshBalances?.();
        await Promise.all([fetchPoolsData(), fetchWalletBalances(), fetchUserPositions()]);
      } else {
        showToast(data.error || t.toastWithdrawError, 'error');
      }
    } catch (err: any) {
      showToast(err.message || t.toastNetworkError, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPools = allPools.filter(p => {
    if (activeTab === 'active') return p.status === 'ACTIVE' && p.hasLiquidity;
    if (activeTab === 'bootstrapping') return p.status === 'BOOTSTRAPPING';
    return true;
  });

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-6 sm:py-10 selection:bg-orange-500 selection:text-white">
      {/* NETWORK ALERT BANNER (Only on Mainnet) */}
      {!isTestnet && (
        <div className="mb-6 px-4 py-2.5 rounded-panel bg-rose-500/10 border border-rose-500/20 text-xs flex items-center justify-between gap-2">
          <span className="font-medium text-rose-600 dark:text-rose-400 flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span>
              {isEs
                ? 'Mainnet sin liquidez activa. La liquidez de prueba está en Testnet (PUSD / USDT).'
                : 'Mainnet has 0 active liquidity. Test liquidity is on Testnet (PUSD / USDT).'}
            </span>
          </span>
          {onToggleNetwork && (
            <button
              type="button"
              onClick={() => {
                onToggleNetwork('testnet');
                showToast(isEs ? 'Red cambiada a Testnet' : 'Network switched to Testnet', 'success');
              }}
              className="ui-btn-sm ui-btn-primary shrink-0"
            >
              {isEs ? 'Cambiar a Testnet' : 'Switch to Testnet'}
            </button>
          )}
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="ui-title">{t.title}</h1>
            <span className={isTestnet ? 'ui-badge-warn' : 'ui-badge-danger'}>
              {isTestnet ? 'Testnet' : (isEs ? 'Sin Liquidez' : 'No Liquidity')}
            </span>
          </div>
          <p className="ui-subtitle">
            {isTestnet
              ? (isEs ? 'Provee liquidez en BinaryLiquidVault y gana 0.20% de comisiones por swap.' : 'Provide liquidity in BinaryLiquidVault and earn 0.20% swap fees.')
              : (isEs ? 'Mainnet sin liquidez activa. Cambia a Testnet para operar.' : 'Mainnet has no active liquidity. Switch to Testnet to trade.')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isTestnet && onToggleNetwork && (
            <button
              type="button"
              onClick={() => onToggleNetwork('testnet')}
              className="ui-btn-sm ui-btn-primary"
            >
              {isEs ? 'Cambiar a Testnet' : 'Switch to Testnet'}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              fetchPoolsData();
              fetchWalletBalances();
              fetchUserPositions();
            }}
            className="ui-btn-sm ui-btn-secondary"
            title={t.refreshTooltip}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{t.refresh}</span>
          </button>
        </div>
      </div>

      {/* PROTOCOL METRICS STATS CARDS */}
      <div className="ui-card p-4 sm:p-5 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 divide-y md:divide-y-0 md:divide-x divide-line">
          <div className="pt-2 md:pt-0 md:px-3 first:pl-0">
            <div className="ui-label mb-1">{t.statTvlLabel}</div>
            <div className="ui-stat">
              {loading ? '...' : `$${(protocolStats?.totalTvlUsd ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </div>
            <div className="text-[11px] text-ink-3 mt-1 flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isTestnet ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <span>{isTestnet ? (isEs ? 'Bóvedas activas' : 'Active vaults') : (isEs ? 'Sin liquidez' : 'No liquidity')}</span>
            </div>
          </div>

          <div className="pt-2 md:pt-0 md:px-3">
            <div className="ui-label mb-1">{t.statVolumeLabel}</div>
            <div className="ui-stat">
              ${(protocolStats?.totalVolumeUsd ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-ink-3 mt-1">{isEs ? 'En cadena' : 'On-chain'}</div>
          </div>

          <div className="pt-2 md:pt-0 md:px-3">
            <div className="ui-label mb-1">{t.statFeesLabel}</div>
            <div className="ui-stat text-emerald-600 dark:text-emerald-400">
              ${(protocolStats?.totalCumulativeFeesUsd ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
            </div>
            <div className="text-[11px] text-ink-3 mt-1">{isEs ? '0.20% a LPs' : '0.20% to LPs'}</div>
          </div>

          <div className="pt-2 md:pt-0 md:px-3">
            <div className="ui-label mb-1">{t.statPairsLabel}</div>
            <div className="ui-stat flex items-baseline gap-1.5">
              <span>{protocolStats?.activePoolsCount ?? 0}</span>
              <span className="text-xs text-emerald-500 font-semibold">{t.statActive}</span>
              <span className="text-xs text-ink-3">/</span>
              <span>{protocolStats?.noLiquidityPoolsCount ?? 0}</span>
              <span className="text-xs text-rose-500 font-semibold">{t.statNoLiq}</span>
            </div>
            <div className="text-[11px] text-ink-3 mt-1">{isEs ? 'PUSD / USDT en Testnet' : 'PUSD / USDT on Testnet'}</div>
          </div>
        </div>
      </div>

      {/* FILTER TABS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="ui-segment flex-wrap">
          <button
            onClick={() => setActiveTab('all')}
            className={`ui-segment-item ${activeTab === 'all' ? 'ui-segment-item-active' : ''}`}
          >
            {t.tabAll} ({allPools.length})
          </button>

          <button
            onClick={() => setActiveTab('active')}
            className={`ui-segment-item ${activeTab === 'active' ? 'ui-segment-item-active text-emerald-600 dark:text-emerald-400' : ''}`}
          >
            {t.tabActive} ({allPools.filter(p => p.status === 'ACTIVE' && p.hasLiquidity).length})
          </button>

          <button
            onClick={() => setActiveTab('bootstrapping')}
            className={`ui-segment-item ${activeTab === 'bootstrapping' ? 'ui-segment-item-active text-amber-600 dark:text-amber-400' : ''}`}
          >
            {t.tabBootstrapping} ({allPools.filter(p => p.status === 'BOOTSTRAPPING').length})
          </button>

          <button
            onClick={() => setActiveTab('my-positions')}
            className={`ui-segment-item ${activeTab === 'my-positions' ? 'ui-segment-item-active text-primary' : ''}`}
          >
            {t.tabMyPositions} {positions.length > 0 && `(${positions.length})`}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (!effectiveAddress) {
                onConnectWallet();
                return;
              }
              setCreateModalOpen(true);
            }}
            className="ui-btn-sm ui-btn-primary"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.btnCreatePair}</span>
          </button>
        </div>
      </div>

      {/* POOLS GRID */}
      {activeTab !== 'my-positions' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 mb-10">
          {filteredPools.map(pool => {
            const isPoolActive = pool.status === 'ACTIVE' && Boolean(pool.hasLiquidity);
            return (
              <motion.div
                key={pool.id}
                whileHover={{ y: -2 }}
                className={`rounded-3xl bg-surface border p-5 sm:p-6 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between ${
                  isPoolActive
                    ? 'border-emerald-500/30 dark:border-emerald-500/25'
                    : 'border-line opacity-90'
                }`}
              >
                <div>
                  {/* POOL HEADER WITH LOGOS AND STATUS */}
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-line">
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-2 shrink-0">
                        <img src={pool.iconA} alt={pool.tokenA} className="w-8 h-8 rounded-full border-2 border-surface object-contain" />
                        <img src={pool.iconB} alt={pool.tokenB} className="w-8 h-8 rounded-full border-2 border-surface object-contain" />
                      </div>

                      <div>
                        <h3 className="font-semibold text-base text-ink leading-tight">
                          {pool.pair}
                        </h3>
                        <p className="text-xs text-ink-3 mt-0.5">
                          {pool.networkBadgeA} ⟷ {pool.networkBadgeB}
                        </p>
                      </div>
                    </div>

                    {/* STATUS BADGE */}
                    <div className="shrink-0">
                      {isPoolActive ? (
                        <span className="ui-badge-success">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {t.statusActive}
                        </span>
                      ) : pool.status === 'BOOTSTRAPPING' ? (
                        <span className="ui-badge-warn">
                          {t.statusFunding}
                        </span>
                      ) : (
                        <span className="ui-badge-danger">
                          <Lock className="w-2.5 h-2.5" />
                          {t.statusNoLiquidity}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* SMART CONTRACT EXPLORER LINKS */}
                  {isPoolActive && (pool.contractExplorerA || pool.contractExplorerB) && (
                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-ink-3">
                      <span>{isEs ? 'Contratos:' : 'Contracts:'}</span>
                      <div className="flex items-center gap-3">
                        {pool.contractExplorerA && (
                          <a
                            href={pool.contractExplorerA}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:text-ink hover:underline inline-flex items-center gap-1"
                          >
                            <span>BCH Covenant</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {pool.contractExplorerB && (
                          <a
                            href={pool.contractExplorerB}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:text-ink hover:underline inline-flex items-center gap-1"
                          >
                            <span>Polygon Vault</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* BOOTSTRAPPING GOAL PROGRESS BAR */}
                  {pool.status === 'BOOTSTRAPPING' && (
                    <div className="mt-3.5 p-3 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20">
                      <div className="flex justify-between items-center text-xs mb-1.5">
                        <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5" />
                          {t.unlockGoal} ({pool.fundingProgress}%)
                        </span>
                        <span className="font-mono text-ink-2 font-semibold">
                          ${pool.tvlUsd.toLocaleString()} / ${pool.targetTvlUsd.toLocaleString()} USD
                        </span>
                      </div>

                      <div className="w-full bg-gray-200 dark:bg-gray-700 h-2.5 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pool.fundingProgress}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full"
                        />
                      </div>

                      <p className="text-[10px] text-ink-2 mt-1.5">
                        {t.unlockRemainingPrefix}{' '}
                        <strong className="text-ink">
                          ${pool.remainingFundingUsd.toLocaleString()}
                        </strong>{' '}
                        {t.unlockRemainingSuffix}
                      </p>
                    </div>
                  )}

                  {/* METRICS ROW */}
                  <div className="grid grid-cols-3 gap-2 py-4 my-1">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-ink-3 block mb-0.5">
                        {t.poolTvl}
                      </span>
                      <span className="text-sm sm:text-base font-semibold text-ink font-mono">
                        ${pool.tvlUsd.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-ink-3 block mb-0.5">
                        {t.annualApy}
                      </span>
                      <span
                        className={`text-sm sm:text-base font-semibold font-mono ${
                          isPoolActive ? 'text-orange-500' : 'text-ink-3'
                        }`}
                      >
                        {isPoolActive ? `${pool.apyPercentage}%` : '—'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-ink-3 block mb-0.5">
                        {t.lpFee}
                      </span>
                      <span className="text-sm sm:text-base font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                        0.20%
                      </span>
                    </div>
                  </div>

                  {/* RESERVES BREAKDOWN */}
                  <div className="p-3 rounded-2xl bg-surface-2 border border-line text-xs space-y-1.5 mb-4">
                    <div className="flex justify-between items-center text-ink-2">
                      <span className="flex items-center gap-1.5">
                        <img src={pool.iconA} className="w-3.5 h-3.5 rounded-full" alt="" />
                        <span>
                          {t.reservePrefix} {pool.tokenA}:
                        </span>
                      </span>
                      <span className="font-mono font-bold text-ink">
                        {pool.reserveA.toLocaleString()} {pool.tokenA} (${pool.reserveAValueUsd.toLocaleString()})
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-ink-2">
                      <span className="flex items-center gap-1.5">
                        <img src={pool.iconB} className="w-3.5 h-3.5 rounded-full" alt="" />
                        <span>
                          {t.reservePrefix} {pool.tokenB}:
                        </span>
                      </span>
                      <span className="font-mono font-bold text-ink">
                        {pool.reserveB.toLocaleString()} {pool.tokenB} (${pool.reserveBValueUsd.toLocaleString()})
                      </span>
                    </div>
                  </div>
                </div>

                {/* ACTION BUTTON */}
                {!isTestnet ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (onToggleNetwork) onToggleNetwork('testnet');
                      showToast(isEs ? 'Red cambiada a Testnet' : 'Network switched to Testnet', 'success');
                    }}
                    className="w-full ui-btn ui-btn-secondary mt-2"
                  >
                    <Lock className="w-4 h-4 text-rose-500" />
                    <span>{t.btnSwitchToTestnet}</span>
                  </button>
                ) : isPoolActive ? (
                  <button
                    type="button"
                    onClick={() => handleOpenAddModal(pool)}
                    className="w-full ui-btn ui-btn-primary mt-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{t.btnProvideLiquidity}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="w-full ui-btn ui-btn-disabled mt-2"
                  >
                    <Lock className="w-4 h-4 text-ink-3" />
                    <span>{t.btnNoLiquidityDisabled}</span>
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      ) : null}

      {/* USER POSITIONS TABLE VIEW */}
      <div
        className={`rounded-3xl bg-surface border border-line p-5 sm:p-8 shadow-sm ${
          activeTab !== 'my-positions' ? 'mt-8' : ''
        }`}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <h3 className="text-lg sm:text-xl font-semibold text-ink">
              {t.positionsTitle}
            </h3>
            {positions.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-500/10 text-primary border border-orange-500/20">
                {positions.length}
              </span>
            )}
          </div>

          <button
            onClick={() => {
              fetchUserPositions();
              fetchWalletBalances();
            }}
            className="text-xs text-ink-3 hover:text-primary transition-colors flex items-center gap-1.5 cursor-pointer font-bold"
          >
            <RefreshCw className="w-3.5 h-3.5" /> {t.refresh}
          </button>
        </div>

        {!effectiveAddress ? (
          <div className="py-12 text-center text-ink-3 space-y-3">
            <Wallet className="w-11 h-11 mx-auto text-ink-3/60" />
            <h4 className="font-bold text-base text-ink">
              Conecta tu billetera BCH o EVM para ver tus LP Shares
            </h4>
            <button
              onClick={onConnectWallet}
              className="px-5 py-2.5 rounded-2xl bg-primary hover:bg-orange-600 text-white text-xs font-bold cursor-pointer transition-all"
            >
              Conectar Billetera
            </button>
          </div>
        ) : positions.length === 0 ? (
          <div className="py-14 text-center text-ink-3 space-y-3">
            <Droplets className="w-12 h-12 mx-auto text-ink-3/60" />
            <h4 className="font-bold text-base text-ink">{t.noPositionsTitle}</h4>
            <p className="text-xs sm:text-sm max-w-md mx-auto text-gray-500">{t.noPositionsDesc}</p>
            {activeTab === 'my-positions' && (
              <button
                onClick={() => setActiveTab('all')}
                className="px-5 py-2.5 rounded-2xl bg-ink text-canvas text-xs font-bold hover:opacity-90 cursor-pointer transition-all"
              >
                {t.btnExplorePools}
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line text-ink-3 font-semibold uppercase text-[10px] ">
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
                  <tr key={pos.id} className="hover:bg-gray-50/50 dark:hover:bg-surface-3 transition-colors">
                    <td className="py-4 px-3">
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2 shrink-0">
                          <img src={pos.iconA} className="w-6 h-6 rounded-full border border-white dark:border-surface" alt="" />
                          <img src={pos.iconB} className="w-6 h-6 rounded-full border border-white dark:border-surface" alt="" />
                        </div>
                        <span className="font-bold text-ink text-sm">{pos.pair}</span>
                      </div>
                    </td>
                    <td className="py-4 px-3 font-mono font-bold text-ink">
                      {pos.shares.toFixed(4)}
                    </td>
                    <td className="py-4 px-3 font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                      {pos.poolSharePercent}%
                    </td>
                    <td className="py-4 px-3 font-mono text-ink-2">
                      <div>
                        {pos.depositedAmount} {pos.tokenSymbol} (${(pos.depositUsd || pos.depositedAmount).toFixed(2)})
                      </div>
                      {pos.explorerUrl && (
                        <a
                          href={pos.explorerUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-primary hover:underline inline-flex items-center gap-1"
                        >
                          <span>TX Verificada</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </td>
                    <td className="py-4 px-3 font-mono font-bold text-ink text-sm">
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
                          setWithdrawToken((pos.tokenSymbol === 'PUSD' ? 'PUSD' : 'USDT') as 'PUSD' | 'USDT');
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

      {/* ADD LIQUIDITY MODAL (100% NON-CUSTODIAL SMART CONTRACT DEPOSIT) */}
      <AnimatePresence>
        {actionModal === 'add' && selectedPool && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[120] flex items-start sm:items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-surface rounded-3xl p-5 sm:p-7 border border-line shadow-2xl relative my-6"
            >
              <div className="flex justify-between items-center mb-5">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    <img src={selectedPool.iconA} className="w-6 h-6 rounded-full" alt="" />
                    <img src={selectedPool.iconB} className="w-6 h-6 rounded-full" alt="" />
                  </div>
                  <h3 className="text-lg font-semibold text-ink">
                    {t.modalAddTitle} {selectedPool.pair}
                  </h3>
                </div>
                <button
                  onClick={() => setActionModal(null)}
                  className="w-8 h-8 rounded-full bg-surface-2 text-gray-500 hover:text-ink flex items-center justify-center cursor-pointer transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* TOKEN SELECTOR TABS */}
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setDepositToken(selectedPool.tokenB);
                    setDepositAmount('');
                  }}
                  className={`flex-1 py-2.5 px-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    depositToken === selectedPool.tokenB
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'bg-surface-2 text-gray-500 hover:text-ink'
                  }`}
                >
                  <img src={selectedPool.iconB} className="w-4 h-4 rounded-full" alt="" />
                  <span>
                    {t.depositTabPrefix} {selectedPool.tokenB} (Amoy)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDepositToken(selectedPool.tokenA);
                    setDepositAmount('');
                  }}
                  className={`flex-1 py-2.5 px-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    depositToken === selectedPool.tokenA
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-surface-2 text-gray-500 hover:text-ink'
                  }`}
                >
                  <img src={selectedPool.iconA} className="w-4 h-4 rounded-full" alt="" />
                  <span>
                    {t.depositTabPrefix} {selectedPool.tokenA} (Chipnet)
                  </span>
                </button>
              </div>

              {/* AMOUNT INPUT BOX */}
              <div className="p-4 rounded-2xl bg-surface-2 border border-line mb-4">
                <div className="flex justify-between items-center text-xs text-ink-3 mb-1.5">
                  <span>{t.depositAmountLabel}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono">
                      {t.balanceLabel}{' '}
                      <strong className="text-ink font-bold">
                        {getSelectedTokenBalance().toLocaleString()} {depositToken}
                      </strong>
                    </span>
                    {getSelectedTokenBalance() > 0 && (
                      <button
                        type="button"
                        onClick={() => handleSetQuickAmount(100)}
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
                    className="w-full bg-transparent text-2xl font-mono font-bold text-ink outline-none"
                  />
                  <span className="font-bold text-sm text-ink shrink-0">
                    {depositToken}
                  </span>
                </div>

                <div className="flex gap-2 mt-3 pt-3 border-t border-line">
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

              {/* BCH COVENANT DEPOSIT INSTRUCTIONS WHEN PUSD IS SELECTED */}
              {depositToken === 'PUSD' && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-2.5 mb-4 text-xs">
                  <div className="flex items-center justify-between text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                    <span>1. Envía los PUSD al Covenant No-Custodio:</span>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-500/15">P2SH32</span>
                  </div>

                  {bchVaultQr && (
                    <div className="w-32 h-32 mx-auto p-2 bg-white rounded-xl border border-gray-200">
                      <img src={bchVaultQr} alt="Covenant QR" className="w-full h-full object-contain" />
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 bg-surface p-2 rounded-xl border border-line">
                    <span className="font-mono text-[11px] text-ink truncate">
                      {selectedPool.vaultAddressA || DEPLOYED_TESTNET_CONTRACTS.chipnetVaultTokenAddress}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        copyText(selectedPool.vaultAddressA || DEPLOYED_TESTNET_CONTRACTS.chipnetVaultTokenAddress)
                      }
                      className="px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      {copiedVault ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedVault ? (isEs ? 'Copiado' : 'Copied') : (isEs ? 'Copiar' : 'Copy')}</span>
                    </button>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-ink-2 block mb-1">
                      {isEs ? '2. Pega el TXID de tu envío en Chipnet (64 hex):' : '2. Paste your Chipnet transaction TXID (64 hex):'}
                    </label>
                    <input
                      type="text"
                      value={bchDepositTxHash}
                      onChange={e => setBchDepositTxHash(e.target.value)}
                      placeholder={isEs ? 'Ej: 8f3a1c...' : 'Ex: 8f3a1c...'}
                      className="w-full px-3 py-2 rounded-xl bg-surface border border-line font-mono text-xs text-ink outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}

              {/* REAL-TIME PREVIEW METRICS */}
              <div className="p-4 rounded-2xl bg-surface-2 border border-line text-xs space-y-2 mb-5">
                <div className="flex justify-between text-ink-2">
                  <span>{t.sharesToReceive}</span>
                  <span className="font-mono font-bold text-ink">
                    {calcEstimatedShares().toFixed(4)} LP Shares
                  </span>
                </div>

                <div className="flex justify-between text-ink-2">
                  <span>{t.newShareRatio}</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {calcNewPoolSharePercent()}%
                  </span>
                </div>

                <div className="flex justify-between text-ink-2">
                  <span>{t.projectedYield}</span>
                  <span className="font-mono font-bold text-orange-500">
                    +${calcEstimatedAnnualYieldUsd().toFixed(2)} USD ({selectedPool.apyPercentage}%)
                  </span>
                </div>
              </div>

              {/* SUBMIT / CONNECT DESTINATION CHAIN BUTTON */}
              {depositToken === 'USDT' && !connectedEvm ? (
                <button
                  type="button"
                  onClick={() => {
                    setActionModal(null);
                    onConnectWallet();
                  }}
                  className="w-full py-3.5 rounded-2xl font-bold text-sm bg-amber-500 hover:bg-amber-600 text-white transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Wallet className="w-4 h-4" />
                  <span>Conectar MetaMask / WalletConnect EVM primero</span>
                </button>
              ) : depositToken === 'PUSD' && !connectedBch ? (
                <button
                  type="button"
                  onClick={() => {
                    setActionModal(null);
                    onConnectWallet();
                  }}
                  className="w-full py-3.5 rounded-2xl font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Wallet className="w-4 h-4" />
                  <span>Conectar Billetera BCH (Paytaca / Cashonize) primero</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleAddLiquidity}
                  disabled={isSubmitting}
                  className="w-full py-4 rounded-2xl font-bold text-xs sm:text-sm bg-primary hover:bg-orange-600 text-white shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{web3StepMsg || t.btnSubmittingAdd}</span>
                    </>
                  ) : depositToken === 'USDT' ? (
                    t.btnConfirmAddEvm
                  ) : (
                    t.btnConfirmAddBch
                  )}
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* REMOVE LIQUIDITY MODAL (REAL ON-CHAIN VAULT RELEASE) */}
      <AnimatePresence>
        {actionModal === 'remove' && selectedPosition && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[120] flex items-start sm:items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-surface rounded-3xl p-5 sm:p-7 border border-line shadow-2xl relative my-6"
            >
              <div className="flex justify-between items-center mb-5">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    <img src={selectedPosition.iconA} className="w-6 h-6 rounded-full" alt="" />
                    <img src={selectedPosition.iconB} className="w-6 h-6 rounded-full" alt="" />
                  </div>
                  <h3 className="text-lg font-semibold text-ink">
                    {t.modalRemoveTitle} {selectedPosition.pair}
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setActionModal(null);
                    setSelectedPosition(null);
                  }}
                  className="w-8 h-8 rounded-full bg-surface-2 text-gray-500 hover:text-ink flex items-center justify-center cursor-pointer transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* PERCENTAGE SLIDER */}
              <div className="p-4 rounded-2xl bg-surface-2 border border-line mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-ink-3 font-bold uppercase">{t.withdrawPctLabel}</span>
                  <span className="text-lg font-semibold text-primary font-mono">{burnPercentage}%</span>
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
                          : 'bg-gray-200/60 dark:bg-gray-800 text-ink-2'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              {/* SELECT ON-CHAIN PAYOUT ASSET */}
              <div className="mb-4">
                <label className="text-[11px] font-bold text-ink-2 block mb-1.5">
                  Elige el activo y red para recibir tu retiro on-chain:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setWithdrawToken('USDT')}
                    className={`py-2.5 px-3 rounded-xl font-bold text-xs border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      withdrawToken === 'USDT'
                        ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                        : 'bg-surface-2 text-ink-2 border-line'
                    }`}
                  >
                    <img src="/USDT.png" className="w-4 h-4 rounded-full" alt="" />
                    <span>USDT (Polygon Amoy)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWithdrawToken('PUSD')}
                    className={`py-2.5 px-3 rounded-xl font-bold text-xs border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      withdrawToken === 'PUSD'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-surface-2 text-ink-2 border-line'
                    }`}
                  >
                    <img src="/PUSD.png" className="w-4 h-4 rounded-full" alt="" />
                    <span>PUSD (BCH Chipnet)</span>
                  </button>
                </div>
                <div className="mt-1.5 text-[11px] font-mono text-ink-2 truncate">
                  Destino:{' '}
                  {withdrawToken === 'USDT'
                    ? connectedEvm || '⚠️ Conecta tu billetera EVM'
                    : connectedBch
                    ? convertCashAddressNetwork(connectedBch, true, true)
                    : '⚠️ Conecta tu billetera BCH'}
                </div>
              </div>

              {/* PAYOUT METRICS */}
              <div className="p-4 rounded-2xl bg-surface-2 border border-line text-xs space-y-2.5 mb-6">
                <div className="flex justify-between text-ink-2">
                  <span>{t.sharesToBurn}</span>
                  <span className="font-mono font-bold text-ink">
                    {(selectedPosition.shares * (burnPercentage / 100)).toFixed(4)} /{' '}
                    {selectedPosition.shares.toFixed(4)}
                  </span>
                </div>

                <div className="flex justify-between text-ink-2">
                  <span>{t.payoutToReceive}</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {(selectedPosition.totalValueUsd * (burnPercentage / 100)).toFixed(4)} {withdrawToken}
                  </span>
                </div>

                <div className="pt-2 border-t border-line flex justify-between font-bold">
                  <span className="text-ink">{t.totalUsdReturn}</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                    ${(selectedPosition.totalValueUsd * (burnPercentage / 100)).toFixed(2)} USD
                  </span>
                </div>

                <div className="flex justify-between text-[11px] text-gray-500">
                  <span>{t.feeProfit}</span>
                  <span className="font-mono font-bold text-orange-500">
                    +${(selectedPosition.profitUsd * (burnPercentage / 100)).toFixed(4)} (
                    {selectedPosition.profitPercentage}%)
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRemoveLiquidity}
                disabled={isSubmitting}
                className="w-full py-4 rounded-2xl font-bold text-xs sm:text-sm bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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

        {/* CREATE CUSTOM POOL MODAL */}
        {createModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-start sm:items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="w-full max-w-lg bg-surface rounded-3xl border border-line p-5 sm:p-6 shadow-2xl space-y-4 my-6 text-left"
            >
              <div className="flex items-center justify-between pb-3 border-b border-line">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-xs">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base sm:text-lg text-ink">
                      {t.createTitle}
                    </h3>
                    <p className="text-xs text-ink-3 font-medium">{t.createSubtitle}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-ink-3 hover:text-ink hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreatePool} className="space-y-3.5">
                <div className="space-y-1.5">
                  <div className="p-3 rounded-2xl bg-surface-2 border border-line/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold  text-orange-500 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                        {t.baseTokenTitle}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-ink-3 bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-full">
                        {isTestnet ? 'Chipnet CashToken' : 'BCH CashToken'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        required
                        value={createForm.tokenA}
                        onChange={e => setCreateForm({ ...createForm, tokenA: e.target.value.toUpperCase() })}
                        placeholder={t.symbolPlaceholder}
                        className="w-full px-3 py-2 rounded-xl bg-surface border border-line/80 font-mono font-semibold text-sm text-ink placeholder:text-ink-3 placeholder:font-normal focus:outline-none focus:border-primary transition-colors"
                      />
                      <input
                        type="text"
                        value={createForm.tokenAName}
                        onChange={e => setCreateForm({ ...createForm, tokenAName: e.target.value })}
                        placeholder={t.namePlaceholder}
                        className="w-full px-3 py-2 rounded-xl bg-surface border border-line/80 text-xs font-medium text-ink placeholder:text-ink-3 focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>
                  </div>

                  <div className="flex justify-center -my-2.5 relative z-10">
                    <div className="w-7 h-7 rounded-full bg-surface-2 border border-line shadow-xs flex items-center justify-center text-primary">
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-surface-2 border border-line/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold  text-blue-500 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        {t.quoteTokenTitle}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-ink-3 bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-full">
                        {createForm.networkBadgeB}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={createForm.tokenB}
                        onChange={e => {
                          const val = e.target.value;
                          if (val === 'USDT') {
                            setCreateForm({
                              ...createForm,
                              tokenB: 'USDT',
                              tokenBName: 'Tether USD',
                              networkB: isTestnet ? 'Polygon Amoy (Testnet)' : 'Polygon (Mainnet)',
                              networkBadgeB: isTestnet ? 'Polygon Amoy' : 'Polygon PoS'
                            });
                          } else if (val === 'PUSD') {
                            setCreateForm({
                              ...createForm,
                              tokenB: 'PUSD',
                              tokenBName: 'ParyonUSD',
                              networkB: isTestnet ? 'BCH Chipnet (Testnet4)' : 'Bitcoin Cash (Mainnet)',
                              networkBadgeB: isTestnet ? 'Chipnet CashTokens' : 'BCH CashTokens'
                            });
                          } else if (val === 'USDC') {
                            setCreateForm({
                              ...createForm,
                              tokenB: 'USDC',
                              tokenBName: 'USD Coin',
                              networkB: isTestnet ? 'Polygon Amoy (Testnet)' : 'Polygon (Mainnet)',
                              networkBadgeB: isTestnet ? 'Polygon Amoy' : 'Polygon PoS'
                            });
                          }
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-surface border border-line/80 font-bold text-xs text-ink focus:outline-none focus:border-primary transition-colors cursor-pointer"
                      >
                        <option value="USDT">USDT ({isTestnet ? 'Polygon Amoy' : 'Polygon PoS'})</option>
                        <option value="PUSD">PUSD ({isTestnet ? 'BCH Chipnet' : 'BCH CashTokens'})</option>
                        <option value="USDC">USDC ({isTestnet ? 'Polygon Amoy' : 'Polygon PoS'})</option>
                      </select>

                      <div className="relative">
                        <input
                          type="number"
                          step="any"
                          value={createForm.initialPriceUsd}
                          onChange={e => setCreateForm({ ...createForm, initialPriceUsd: e.target.value })}
                          placeholder="0.01"
                          className="w-full px-3 py-2 rounded-xl bg-surface border border-line/80 font-mono font-bold text-xs text-ink focus:outline-none focus:border-primary transition-colors pr-11"
                        />
                        <span className="absolute right-3 top-2 text-[10px] font-bold text-ink-3 pointer-events-none">
                          USD
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border border-line rounded-2xl p-2.5 bg-surface">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="w-full flex items-center justify-between text-xs font-bold text-ink-2 px-1 py-0.5 cursor-pointer hover:text-primary transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-primary" />
                      {t.advancedOptions}
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${
                        showAdvanced ? 'rotate-180 text-primary' : 'text-ink-3'
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {showAdvanced && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-2 pt-2.5 border-t border-line mt-2 text-xs"
                      >
                        <div>
                          <label className="text-[10px] font-medium text-ink-3 block mb-1">
                            {t.categoryIdLabel}
                          </label>
                          <input
                            type="text"
                            value={createForm.categoryIdA}
                            onChange={e =>
                              setCreateForm({ ...createForm, categoryIdA: e.target.value.toLowerCase() })
                            }
                            placeholder={t.categoryIdPlaceholder}
                            className="w-full px-3 py-2 rounded-xl bg-surface border border-line font-mono text-[11px] text-ink focus:outline-none focus:border-primary"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-medium text-ink-3 block mb-1">
                            {t.iconLabel}
                          </label>
                          <input
                            type="text"
                            value={createForm.iconA}
                            onChange={e => setCreateForm({ ...createForm, iconA: e.target.value })}
                            placeholder={t.iconPlaceholder}
                            className="w-full px-3 py-2 rounded-xl bg-surface border border-line font-mono text-[11px] text-ink focus:outline-none focus:border-primary"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="space-y-1.5">
                  <div className="grid grid-cols-2 p-1 rounded-2xl bg-surface-2 border border-line text-xs">
                    <button
                      type="button"
                      onClick={() => setCreateForm({ ...createForm, poolMode: 'BOOTSTRAPPING' })}
                      className={`py-2 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        createForm.poolMode === 'BOOTSTRAPPING'
                          ? 'bg-surface text-amber-500 shadow-xs font-semibold'
                          : 'text-gray-500 hover:text-ink'
                      }`}
                    >
                      <span>🔒 {t.modeBootstrapping}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreateForm({ ...createForm, poolMode: 'STANDARD' })}
                      className={`py-2 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        createForm.poolMode === 'STANDARD'
                          ? 'bg-surface text-ink shadow-xs font-semibold'
                          : 'text-gray-500 hover:text-ink'
                      }`}
                    >
                      <span>⚡ {t.modeStandard}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-ink-2 px-1 leading-snug">
                    {createForm.poolMode === 'STANDARD' ? t.modeStandardDesc : t.modeBootstrappingDesc}
                  </p>
                </div>

                {createForm.poolMode === 'BOOTSTRAPPING' && (
                  <div className="grid grid-cols-2 gap-2.5 p-3 rounded-2xl bg-amber-500/5 border border-amber-500/20">
                    <div>
                      <label className="text-[10px] font-bold text-ink-3 block mb-1">
                        {t.amountToDeposit} ({createForm.tokenA || 'Base'}):
                      </label>
                      <input
                        type="number"
                        value={createForm.initialAmountA}
                        onChange={e => setCreateForm({ ...createForm, initialAmountA: e.target.value })}
                        placeholder="100000"
                        className="w-full px-3 py-2 rounded-xl bg-surface border border-line font-mono font-bold text-xs text-ink focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-ink-3 block mb-1">
                        {t.targetTvl}:
                      </label>
                      <input
                        type="number"
                        value={createForm.targetTvlUsd}
                        onChange={e => setCreateForm({ ...createForm, targetTvlUsd: e.target.value })}
                        placeholder="2500"
                        className="w-full px-3 py-2 rounded-xl bg-surface border border-line font-mono font-bold text-xs text-ink focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                )}

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
