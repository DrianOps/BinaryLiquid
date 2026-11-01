import React, { useState, useEffect, useMemo } from 'react';
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
  Copy,
  ExternalLink,
  Activity,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  AlertTriangle,
  Wallet
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  executeWeb3LpDeposit,
  DEPLOYED_TESTNET_CONTRACTS
} from '../services/walletConnectService';
import {
  convertCashAddressNetwork,
  generateQrDataUrl,
  formatAddress
} from '../utils/bchAddress';

interface LendingViewProps {
  userAddress: string;
  bchAddress?: string;
  evmAddress?: string;
  platformNetwork?: 'mainnet' | 'testnet';
  onToggleNetwork?: (net: 'mainnet' | 'testnet') => void;
  onRefreshBalances?: () => void;
  backendUrl: string;
  isWalletConnected: boolean;
  onConnectWallet: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  lang?: 'en' | 'es';
}

const lendTexts = {
  en: {
    heroBadge: 'Non-Custodial CashScript Collateral Vaults',
    heroTitle: 'BCH Lending & Collateral Vaults',
    heroSubtitle1: "Don't sell your ",
    heroSubtitleBch: 'Bitcoin Cash',
    heroSubtitle2:
      '. Lock tBCH inside your personal zero-private-key P2SH32 Covenant, borrow instant liquidity in ',
    heroSubtitlePusd: 'PUSD (CashTokens)',
    heroSubtitleOr: ' or ',
    heroSubtitleUsdt: 'USDT (Polygon Amoy)',
    heroSubtitle3:
      ' from 3.5% APR, and unlock 100% of your coins directly back to your wallet whenever you decide.',
    mainnetBannerTitle: 'Mainnet Markets: Sin Liquidez',
    mainnetBannerDesc:
      'All Mainnet lending vaults currently have 0 reserves (Sin Liquidez). Switch to Testnet to lock tBCH in BinaryLiquidCollateralVault.cash and borrow/supply live PUSD & USDT.',
    switchToTestnetBtn: 'Switch to Testnet',
    testnetBannerBadge: 'Testnet Contracts Active',
    testnetBannerDesc: 'Collateral: BinaryLiquidCollateralVault.cash (P2SH32) • Loans & Yield: PUSD + USDT',
    sinLiquidezBadge: 'Sin Liquidez',
    activeOnChainBadge: 'Active On-Chain',
    cardCollateralTitle: 'My Covenant Collateral',
    cardCollateralLtv: 'Max LTV: 65%',
    cardDebtTitle: 'My Borrowed Debt',
    cardHealthTitle: 'Health Factor (Solvency)',
    cardHealthInfinite: '∞ Safe',
    cardHealthSafe: 'Optimal',
    cardHealthModerate: 'Moderate',
    cardHealthAlert: 'Risk',
    cardHealthSub: 'Liquidation threshold at 1.00 (80% LTV)',
    cardAvailableTitle: 'Available to Borrow',
    cardAvailableSub: 'Backed 100% by your on-chain BCH Covenant',
    tabVault: 'My BCH Vault',
    tabSupply: 'Yield (~6.1% APY)',
    tabMarkets: 'Markets',
    subTabDeposit: '+ Lock BCH',
    subTabBorrow: 'Borrow',
    subTabRepay: 'Repay Debt',
    subTabWithdraw: 'Unlock BCH',
    depositTitle: 'Lock Bitcoin Cash in Your Personal CashScript Covenant',
    depositDesc:
      'Zero EOA private keys: BCH VM Script mathematically enforces that withdrawn collateral can ONLY go back to your own BCH wallet.',
    personalVaultLabel: 'Your Personal P2SH32 Collateral Covenant (BCH Chipnet)',
    connectBchPrompt: 'Connect a Bitcoin Cash wallet (Paytaca or Cashonize) to instantiate your personal P2SH32 Collateral Covenant.',
    connectBchBtn: 'Connect BCH Wallet',
    connectEvmBtn: 'Connect EVM Wallet (MetaMask / WC)',
    optionalTxidLabel: 'Optional Deposit TXID (64-hex) — or leave blank to auto-detect new UTXOs',
    btnVerifyCollateral: 'Verify & Sync On-Chain BCH Collateral',
    btnVerifyingCollateral: 'Scanning BCH Chipnet Covenant...',
    bchPriceLabel: 'Oracle BCH Price:',
    estUsdValue: 'Estimated USD Value:',
    newBorrowCapacity: 'Borrowing Capacity Enabled (65% LTV):',
    borrowTitle: 'Borrow On-Chain Stablecoins',
    borrowDesc: 'Disbursed directly from BinaryLiquidVault.cash (PUSD) or BinaryLiquidVault.sol (USDT) to your wallet.',
    borrowAmountLabel: 'Amount to Borrow',
    availableLabel: 'Borrow Limit:',
    poolLiquidityLabel: 'Vault Liquidity:',
    healthImpactLabel: 'Projected Health Factor:',
    originationFeeLabel: 'Origination Fee:',
    originationFeeFree: '0.00% (BLAZE Promo)',
    borrowRatePusd: '3.5% APR • BCH Chipnet CashToken',
    borrowRateUsdt: '4.0% APR • Polygon Amoy ERC-20',
    btnBorrow: 'Borrow On-Chain',
    btnBorrowing: 'Executing Smart Contract Payout...',
    repayTitle: 'Repay Debt On-Chain & Restore Solvency',
    repayDesc: 'Sign a 1-click Web3 transfer (USDT) or send PUSD to BinaryLiquidVault.cash to settle your loan.',
    debtLabel: 'Debt:',
    repayAmountLabel: 'Amount to Repay',
    pendingDebtLabel: 'Pending debt:',
    payAllBtn: 'MAX',
    btnRepayUsdt: 'Sign Web3 Repayment',
    btnRepayPusd: 'Verify PUSD Repayment TXID',
    btnRepaying: 'Verifying On-Chain Repayment...',
    withdrawTitle: 'Unlock Bitcoin Cash from Covenant to Your Wallet',
    withdrawDesc: 'Executes BinaryLiquidCollateralVault.releaseCollateral() on BCH Chipnet with zero slippage.',
    withdrawAmountLabel: 'Amount of BCH to Unlock',
    safeWithdrawableLabel: 'Safe withdrawable:',
    btnWithdraw: 'Unlock to My BCH Wallet',
    btnWithdrawing: 'Unlocking CashScript Covenant...',
    howItWorksTitle: 'How Non-Custodial BCH Lending Works',
    step1Title: 'User-Bound P2SH32 Covenant: ',
    step1Desc: 'Your BCH sits in a 45-opcode CashScript contract bound exclusively to your lockingBytecode.',
    step2Title: 'Cross-Chain Liquidity: ',
    step2Desc: 'Borrow PUSD on Bitcoin Cash or USDT on Polygon Amoy instantly at up to 65% LTV.',
    step3Title: 'Covenant State Continuation: ',
    step3Desc: 'Partial withdrawals return remaining BCH to your exact Covenant; full repayment unlocks 100%.',
    sponsorBadge: 'BLAZE Sponsor • ParyonUSD (PUSD)',
    sponsorDesc: 'Borrow PUSD CashTokens at 3.5% APR with 0% origination fees and sub-second UTXO finality.',
    recentTxTitle: 'Recent On-Chain Vault Activity',
    noRecentTx: 'No on-chain transactions recorded for this vault yet.',
    supplyTitle: 'Supply Stablecoins to Smart Contract Vaults & Earn APY',
    supplyDesc: 'Provide non-custodial PUSD or USDT liquidity to earn continuous borrower interest.',
    supplySubDeposit: 'Deposit & Earn',
    supplySubWithdraw: 'Withdraw + Yield',
    suppliedLabel: 'Supplied:',
    withdrawableSupplyLabel: 'Withdrawable (Principal + Yield):',
    supplyAmountLabel: 'Amount to Supply On-Chain',
    withdrawSupplyAmountLabel: 'Amount to Withdraw to Your Wallet',
    btnSupplyUsdt: 'Sign Web3 USDT Supply',
    btnSupplyPusd: 'Verify PUSD Supply TXID',
    btnWithdrawSupply: 'Withdraw On-Chain',
    myYieldTitle: 'My Real-Time Yield Position',
    yieldEarnedLabel: 'Accrued Yield',
    yieldEarnedSub: 'Compounds continuously every second',
    pusdSuppliedLabel: 'PUSD Supplied:',
    usdtSuppliedLabel: 'USDT Supplied:',
    marketsTitle: 'On-Chain Lending Protocol Markets',
    marketsDesc: 'Live reserves queried directly from BCH Chipnet Covenants & Polygon Amoy Vault.',
    oracleSource: 'Oracle Feed:',
    referencePrice: 'Oracle Price:',
    maxLtv: 'Max LTV:',
    liquidationThreshold: 'Liquidation Threshold:',
    liquidationPenalty: 'Penalty:',
    borrowRate: 'Borrow APR:',
    supplyRate: 'Supply APY:',
    availLiquidity: 'Live Vault Liquidity:',
    settlementNetwork: 'Smart Contract:',
    copyBtn: 'Copy',
    copiedBtn: 'Copied',
    pusdSendStep: 'Send exact PUSD CashTokens to BinaryLiquidVault.cash and paste the 64-char TXID:',
    txidPlaceholder: 'Paste 64-character BCH Chipnet TXID...'
  },
  es: {
    heroBadge: 'Bóvedas de Colateral No-Custodia en CashScript',
    heroTitle: 'Préstamos & Bóvedas BCH',
    heroSubtitle1: 'No vendas tu ',
    heroSubtitleBch: 'Bitcoin Cash',
    heroSubtitle2:
      '. Bloquéalo en tu Smart Contract personal P2SH32 sin llaves privadas, pide liquidez inmediata en ',
    heroSubtitlePusd: 'PUSD (CashTokens)',
    heroSubtitleOr: ' o ',
    heroSubtitleUsdt: 'USDT (Polygon Amoy)',
    heroSubtitle3:
      ' desde 3.5% APR y desbloquea tus monedas directo a tu billetera cuando decidas.',
    mainnetBannerTitle: 'Mercados en Mainnet: Sin Liquidez',
    mainnetBannerDesc:
      'Todos los mercados en Mainnet tienen $0 de reservas (Sin Liquidez). Cambia a Testnet para bloquear tBCH en BinaryLiquidCollateralVault.cash y operar con PUSD y USDT reales en cadena.',
    switchToTestnetBtn: 'Cambiar a Testnet',
    testnetBannerBadge: 'Smart Contracts Testnet Activos',
    testnetBannerDesc: 'Colateral: BinaryLiquidCollateralVault.cash (P2SH32) • Liquidez Activa: PUSD + USDT',
    sinLiquidezBadge: 'Sin Liquidez',
    activeOnChainBadge: 'Liquidez On-Chain Activa',
    cardCollateralTitle: 'Mi Colateral en Covenant',
    cardCollateralLtv: 'LTV Máx: 65%',
    cardDebtTitle: 'Mi Deuda en Cadena',
    cardHealthTitle: 'Ratio de Salud (Solvencia)',
    cardHealthInfinite: '∞ Seguro',
    cardHealthSafe: 'Óptimo',
    cardHealthModerate: 'Moderado',
    cardHealthAlert: 'Riesgo',
    cardHealthSub: 'Liquidación si cae debajo de 1.00 (80% LTV)',
    cardAvailableTitle: 'Disponible para Pedir',
    cardAvailableSub: 'Respaldado 100% por tu Covenant BCH On-Chain',
    tabVault: 'Mi Bóveda BCH',
    tabSupply: 'Rendimiento (~6.1% APY)',
    tabMarkets: 'Mercados',
    subTabDeposit: '+ Depositar BCH',
    subTabBorrow: 'Pedir Préstamo',
    subTabRepay: 'Pagar Deuda',
    subTabWithdraw: 'Retirar BCH',
    depositTitle: 'Bloquear Bitcoin Cash en tu Covenant CashScript Personal',
    depositDesc:
      'Cero llaves privadas EOA: la máquina virtual de BCH garantiza matemáticamente que tu colateral SOLO puede retirarse de vuelta a tu propia billetera.',
    personalVaultLabel: 'Tu Smart Contract P2SH32 de Colateral (BCH Chipnet)',
    connectBchPrompt:
      'Conecta una billetera Bitcoin Cash (Paytaca o Cashonize) para generar tu Smart Contract P2SH32 de colateral personal.',
    connectBchBtn: 'Conectar Billetera BCH',
    connectEvmBtn: 'Conectar Billetera EVM (MetaMask / WC)',
    optionalTxidLabel: 'TXID del depósito (64 hex, opcional) — o déjalo vacío para auto-detectar tu UTXO en cadena',
    btnVerifyCollateral: 'Verificar y Sincronizar Colateral BCH On-Chain',
    btnVerifyingCollateral: 'Escaneando Covenant en BCH Chipnet...',
    bchPriceLabel: 'Precio Oráculo BCH:',
    estUsdValue: 'Valor estimado del simulador:',
    newBorrowCapacity: 'Capacidad de Préstamo Habilitada (65% LTV):',
    borrowTitle: 'Solicitar Préstamo de Stablecoins On-Chain',
    borrowDesc: 'Desembolsado directamente desde BinaryLiquidVault.cash (PUSD) o BinaryLiquidVault.sol (USDT) hacia tu billetera.',
    borrowAmountLabel: 'Monto a Pedir Prestado',
    availableLabel: 'Tu Límite:',
    poolLiquidityLabel: 'Liquidez en Vault:',
    healthImpactLabel: 'Ratio de Salud Proyectado:',
    originationFeeLabel: 'Comisión de originación:',
    originationFeeFree: '0.00% (Promo BLAZE)',
    borrowRatePusd: '3.5% APR • CashToken BCH Chipnet',
    borrowRateUsdt: '4.0% APR • ERC-20 Polygon Amoy',
    btnBorrow: 'Recibir Préstamo en',
    btnBorrowing: 'Desembolsando desde Smart Contract...',
    repayTitle: 'Pagar Deuda On-Chain y Liberar Garantía',
    repayDesc: 'Firma en 1 clic con MetaMask/WC (USDT) o envía PUSD al Covenant BinaryLiquidVault.cash para reducir tu deuda.',
    debtLabel: 'Deuda:',
    repayAmountLabel: 'Monto a Pagar',
    pendingDebtLabel: 'Deuda pendiente:',
    payAllBtn: 'PAGAR TODO',
    btnRepayUsdt: 'Firmar Pago Web3 en USDT',
    btnRepayPusd: 'Verificar TXID de Pago PUSD',
    btnRepaying: 'Verificando Pago On-Chain...',
    withdrawTitle: 'Desbloquear Bitcoin Cash desde tu Covenant',
    withdrawDesc: 'Ejecuta BinaryLiquidCollateralVault.releaseCollateral() en BCH Chipnet enviando tus monedas directo a tu wallet.',
    withdrawAmountLabel: 'Monto de BCH a Desbloquear',
    safeWithdrawableLabel: 'Retirable seguro:',
    btnWithdraw: 'Desbloquear a Mi Wallet BCH',
    btnWithdrawing: 'Ejecutando Covenant CashScript...',
    howItWorksTitle: '¿Cómo funciona el Préstamo No-Custodia en BCH?',
    step1Title: 'Covenant P2SH32 Exclusivo: ',
    step1Desc: 'Tus BCH viven en un contrato CashScript de 45 opcodes atado únicamente a tu lockingBytecode.',
    step2Title: 'Liquidez Cross-Chain Real: ',
    step2Desc: 'Pide prestado PUSD en Bitcoin Cash o USDT en Polygon Amoy al instante hasta el 65% LTV.',
    step3Title: 'Continuación de Estado UTXO: ',
    step3Desc: 'Los retiros parciales mantienen el resto en tu mismo Covenant; al pagar tu deuda liberas el 100%.',
    sponsorBadge: 'Patrocinador BLAZE • ParyonUSD (PUSD)',
    sponsorDesc: 'Pide prestado PUSD CashTokens al 3.5% APR con 0% comisión de apertura y liquidación en segundos.',
    recentTxTitle: 'Actividad On-Chain de tu Bóveda',
    noRecentTx: 'Aún no hay transacciones en cadena registradas en esta bóveda.',
    supplyTitle: 'Suministrar Stablecoins al Vault y Ganar APY',
    supplyDesc: 'Aporta liquidez real no-custodia en PUSD o USDT a los Smart Contracts y gana intereses continuos.',
    supplySubDeposit: 'Depositar y Ganar APY',
    supplySubWithdraw: 'Retirar + Rendimientos',
    suppliedLabel: 'Suministrado:',
    withdrawableSupplyLabel: 'Disponible (Capital + Intereses):',
    supplyAmountLabel: 'Monto a Depositar en el Smart Contract',
    withdrawSupplyAmountLabel: 'Monto a Retirar a tu Billetera',
    btnSupplyUsdt: 'Firmar Depósito Web3 USDT',
    btnSupplyPusd: 'Verificar Depósito PUSD (TXID)',
    btnWithdrawSupply: 'Retirar desde Smart Contract',
    myYieldTitle: 'Mi Posición de Rendimiento en Vivo',
    yieldEarnedLabel: 'Intereses Acumulados',
    yieldEarnedSub: 'Capitalización continua cada segundo',
    pusdSuppliedLabel: 'PUSD Suministrado:',
    usdtSuppliedLabel: 'USDT Suministrado:',
    marketsTitle: 'Mercados On-Chain del Protocolo de Préstamos',
    marketsDesc: 'Reservas reales consultadas en vivo desde los Covenants de BCH Chipnet y el Vault de Polygon Amoy.',
    oracleSource: 'Oráculo en Vivo:',
    referencePrice: 'Precio de Referencia:',
    maxLtv: 'LTV Máximo:',
    liquidationThreshold: 'Umbral Liquidación:',
    liquidationPenalty: 'Penalización:',
    borrowRate: 'Tasa Préstamo (APR):',
    supplyRate: 'Tasa Rendimiento (APY):',
    availLiquidity: 'Liquidez Real en Vault:',
    settlementNetwork: 'Smart Contract:',
    copyBtn: 'Copiar',
    copiedBtn: 'Copiado',
    pusdSendStep: 'Envía los PUSD CashTokens exactos al Covenant BinaryLiquidVault.cash y pega el TXID (64 hex):',
    txidPlaceholder: 'Pega aquí el TXID de 64 caracteres de BCH Chipnet...'
  }
};

export default function LendingView({
  userAddress,
  bchAddress = '',
  evmAddress = '',
  platformNetwork = 'testnet',
  onToggleNetwork,
  onRefreshBalances,
  backendUrl,
  isWalletConnected,
  onConnectWallet,
  showToast,
  lang = 'es'
}: LendingViewProps) {
  const t = lendTexts[lang] || lendTexts.es;
  const isTestnet = platformNetwork === 'testnet';

  const [activeTab, setActiveTab] = useState<'vault' | 'supply' | 'markets'>('vault');
  const [vaultSubTab, setVaultSubTab] = useState<
    'deposit_collateral' | 'borrow' | 'repay' | 'withdraw_collateral'
  >('deposit_collateral');
  const [supplyMode, setSupplyMode] = useState<'deposit' | 'withdraw'>('deposit');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [lastTxResult, setLastTxResult] = useState<{ txHash: string; explorerUrl: string; label: string } | null>(null);
  const [overview, setOverview] = useState<any>(null);
  const [userVaultData, setUserVaultData] = useState<any>(null);
  const [copiedKey, setCopiedKey] = useState<string>('');

  // Form inputs
  const [depositCollateralAmount, setDepositCollateralAmount] = useState<string>('');
  const [collateralTxId, setCollateralTxId] = useState<string>('');
  const [withdrawCollateralAmount, setWithdrawCollateralAmount] = useState<string>('');

  const [borrowToken, setBorrowToken] = useState<'PUSD' | 'USDT'>('PUSD');
  const [borrowAmount, setBorrowAmount] = useState<string>('');

  const [repayToken, setRepayToken] = useState<'PUSD' | 'USDT'>('PUSD');
  const [repayAmount, setRepayAmount] = useState<string>('');
  const [repayPusdTxId, setRepayPusdTxId] = useState<string>('');

  const [supplyToken, setSupplyToken] = useState<'PUSD' | 'USDT'>('PUSD');
  const [supplyAmount, setSupplyAmount] = useState<string>('');
  const [supplyPusdTxId, setSupplyPusdTxId] = useState<string>('');
  const [withdrawSupplyAmount, setWithdrawSupplyAmount] = useState<string>('');

  // Normalize connected BCH & EVM addresses for current network
  const connectedBch = useMemo(() => {
    const raw =
      bchAddress ||
      (userAddress && (userAddress.startsWith('bchtest:') || userAddress.startsWith('bitcoincash:'))
        ? userAddress
        : '');
    if (!raw) return '';
    return convertCashAddressNetwork(raw, isTestnet, true);
  }, [bchAddress, userAddress, isTestnet]);

  const connectedEvm = useMemo(() => {
    return evmAddress || (userAddress && userAddress.startsWith('0x') ? userAddress : '');
  }, [evmAddress, userAddress]);

  const effectiveAddress = connectedBch || connectedEvm || (isWalletConnected ? userAddress : '');

  const copyToClipboard = (value: string, key: string) => {
    if (!value) return;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(value);
    }
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 2000);
  };

  const fetchData = async () => {
    try {
      const resOverview = await fetch(
        `${backendUrl}/api/lend/overview?network=${platformNetwork}`
      ).then(r => r.json());
      if (resOverview.success) setOverview(resOverview);

      if (effectiveAddress) {
        const params = new URLSearchParams({
          network: platformNetwork,
          bchAddress: connectedBch,
          evmAddress: connectedEvm
        });
        const resVault = await fetch(
          `${backendUrl}/api/lend/vault/${encodeURIComponent(effectiveAddress)}?${params.toString()}`
        ).then(r => r.json());
        if (resVault.success) setUserVaultData(resVault);
      } else {
        setUserVaultData(null);
      }
    } catch (err) {
      console.warn('Failed to load lending data:', err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 9000);
    return () => clearInterval(interval);
  }, [backendUrl, effectiveAddress, connectedBch, connectedEvm, platformNetwork]);

  const bchPrice = overview?.bchPrice || userVaultData?.bchPrice || 289.0;
  const markets = overview?.markets || {};
  const collateralCovenant = userVaultData?.collateralCovenant || null;
  const recentTransactions = userVaultData?.recentTransactions || [];

  const pusdVaultAddress =
    userVaultData?.repayVaults?.pusdVaultAddress ||
    DEPLOYED_TESTNET_CONTRACTS.chipnetVaultTokenAddress;
  const usdtVaultAddress =
    userVaultData?.repayVaults?.usdtVaultAddress ||
    DEPLOYED_TESTNET_CONTRACTS.amoyVaultAddress;
  const usdtTokenAddress =
    userVaultData?.repayVaults?.usdtTokenAddress ||
    DEPLOYED_TESTNET_CONTRACTS.amoyUsdtAddress;

  const collateralQr = useMemo(() => {
    if (!collateralCovenant?.vaultAddress) return '';
    return generateQrDataUrl(collateralCovenant.vaultAddress, 5, 2);
  }, [collateralCovenant?.vaultAddress]);

  const pusdVaultQr = useMemo(() => {
    return generateQrDataUrl(pusdVaultAddress, 5, 2);
  }, [pusdVaultAddress]);

  const vault = userVaultData?.vault || {
    collateralBch: 0,
    collateralUsd: 0,
    totalPusdDebt: 0,
    totalUsdtDebt: 0,
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
    suppliedUsdt: 0,
    yieldEarnedPusd: 0,
    yieldEarnedUsdt: 0,
    totalWithdrawablePusd: 0,
    totalWithdrawableUsdt: 0,
    totalSuppliedUsd: 0
  };

  // =========================================================================
  // 1. VERIFY & SYNC BCH COLLATERAL COVENANT
  // =========================================================================
  const handleVerifyCollateral = async () => {
    if (!isTestnet) {
      showToast(t.mainnetBannerDesc, 'error');
      return;
    }
    if (!connectedBch) {
      onConnectWallet();
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(t.btnVerifyingCollateral);
    try {
      const res = await fetch(`${backendUrl}/api/lend/deposit-collateral`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: effectiveAddress,
          bchAddress: connectedBch,
          evmAddress: connectedEvm,
          amountBch: parseFloat(depositCollateralAmount) || 0,
          txHash: collateralTxId.trim() || undefined,
          network: platformNetwork
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Colateral BCH verificado en cadena', 'success');
        confetti({ particleCount: 55, spread: 65, origin: { y: 0.6 } });
        setCollateralTxId('');
        setDepositCollateralAmount('');
        if (data.txHash && data.explorerUrl) {
          setLastTxResult({ txHash: data.txHash, explorerUrl: data.explorerUrl, label: 'Depósito Colateral BCH' });
        }
        await fetchData();
        onRefreshBalances?.();
      } else {
        showToast(data.error || 'No se detectó nuevo depósito en tu Bóveda', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error de conexión', 'error');
    } finally {
      setIsSubmitting(false);
      setStatusMessage('');
    }
  };

  // =========================================================================
  // 2. UNLOCK BCH COLLATERAL FROM COVENANT
  // =========================================================================
  const handleWithdrawCollateral = async () => {
    if (!isTestnet) {
      showToast(t.mainnetBannerDesc, 'error');
      return;
    }
    if (!connectedBch) {
      onConnectWallet();
      return;
    }
    const amt = parseFloat(withdrawCollateralAmount);
    if (isNaN(amt) || amt <= 0) {
      showToast('Ingresa un monto válido de BCH para desbloquear', 'error');
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(t.btnWithdrawing);
    try {
      const res = await fetch(`${backendUrl}/api/lend/withdraw-collateral`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: effectiveAddress,
          bchAddress: connectedBch,
          evmAddress: connectedEvm,
          amountBch: amt,
          network: platformNetwork
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || `¡${amt} BCH desbloqueados a tu billetera!`, 'success');
        confetti({ particleCount: 45, spread: 55, origin: { y: 0.6 } });
        setWithdrawCollateralAmount('');
        if (data.txHash && data.explorerUrl) {
          setLastTxResult({ txHash: data.txHash, explorerUrl: data.explorerUrl, label: 'Retiro Colateral BCH' });
        }
        await fetchData();
        onRefreshBalances?.();
      } else {
        showToast(data.error || 'Error liberando colateral', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error de conexión', 'error');
    } finally {
      setIsSubmitting(false);
      setStatusMessage('');
    }
  };

  // =========================================================================
  // 3. BORROW PUSD OR USDT ON-CHAIN
  // =========================================================================
  const handleBorrow = async () => {
    if (!isTestnet) {
      showToast(t.mainnetBannerDesc, 'error');
      return;
    }
    if (borrowToken === 'PUSD' && !connectedBch) {
      onConnectWallet();
      return;
    }
    if (borrowToken === 'USDT' && !connectedEvm) {
      onConnectWallet();
      return;
    }

    const amt = parseFloat(borrowAmount);
    if (isNaN(amt) || amt <= 0) {
      showToast(`Ingresa un monto válido en ${borrowToken}`, 'error');
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(t.btnBorrowing);
    try {
      const res = await fetch(`${backendUrl}/api/lend/borrow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: effectiveAddress,
          bchAddress: connectedBch,
          evmAddress: connectedEvm,
          token: borrowToken,
          amount: amt,
          network: platformNetwork
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || `¡Préstamo de ${amt} ${borrowToken} enviado a tu wallet!`, 'success');
        confetti({ particleCount: 65, spread: 70, origin: { y: 0.6 } });
        setBorrowAmount('');
        if (data.txHash && data.explorerUrl) {
          setLastTxResult({ txHash: data.txHash, explorerUrl: data.explorerUrl, label: `Préstamo ${borrowToken}` });
        }
        await fetchData();
        onRefreshBalances?.();
      } else {
        showToast(data.error || 'Error aprobando préstamo', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error de conexión', 'error');
    } finally {
      setIsSubmitting(false);
      setStatusMessage('');
    }
  };

  // =========================================================================
  // 4. REPAY DEBT ON-CHAIN (1-Click Web3 USDT or PUSD Covenant TXID)
  // =========================================================================
  const handleRepay = async () => {
    if (!isTestnet) {
      showToast(t.mainnetBannerDesc, 'error');
      return;
    }

    const pendingDebt = repayToken === 'PUSD' ? vault.totalPusdDebt : vault.totalUsdtDebt;
    const rawInput = parseFloat(repayAmount);
    if (isNaN(rawInput) || rawInput <= 0) {
      showToast(`Ingresa un monto válido de ${repayToken}`, 'error');
      return;
    }
    const amt = Math.min(rawInput, pendingDebt);
    if (amt <= 0) {
      showToast(`No tienes deuda activa en ${repayToken}`, 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      let finalTxHash = repayPusdTxId.trim();

      if (repayToken === 'USDT') {
        if (!connectedEvm) {
          onConnectWallet();
          setIsSubmitting(false);
          return;
        }
        const web3Res = await executeWeb3LpDeposit({
          isTestnet: true,
          vaultAddress: usdtVaultAddress,
          tokenAddress: usdtTokenAddress,
          amount: amt,
          decimals: 6,
          onStatus: msg => setStatusMessage(msg)
        });
        finalTxHash = web3Res.txHash;
      } else {
        if (!finalTxHash || finalTxHash.length < 64) {
          showToast('Envía primero los PUSD al Covenant y pega el TXID de 64 caracteres', 'error');
          setIsSubmitting(false);
          return;
        }
        setStatusMessage(t.btnRepaying);
      }

      const res = await fetch(`${backendUrl}/api/lend/repay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: effectiveAddress,
          bchAddress: connectedBch,
          evmAddress: connectedEvm,
          token: repayToken,
          amount: amt,
          txHash: finalTxHash,
          network: platformNetwork
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || `¡Pago de ${amt} ${repayToken} verificado!`, 'success');
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
        setRepayAmount('');
        setRepayPusdTxId('');
        if (data.txHash && data.explorerUrl) {
          setLastTxResult({ txHash: data.txHash, explorerUrl: data.explorerUrl, label: `Pago Deuda ${repayToken}` });
        }
        await fetchData();
        onRefreshBalances?.();
      } else {
        showToast(data.error || 'Error verificando pago', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error en firma o verificación', 'error');
    } finally {
      setIsSubmitting(false);
      setStatusMessage('');
    }
  };

  // =========================================================================
  // 5. SUPPLY STABLECOINS FOR PASSIVE APY
  // =========================================================================
  const handleSupply = async () => {
    if (!isTestnet) {
      showToast(t.mainnetBannerDesc, 'error');
      return;
    }

    const amt = parseFloat(supplyAmount);
    if (isNaN(amt) || amt <= 0) {
      showToast(`Ingresa un monto válido en ${supplyToken}`, 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      let finalTxHash = supplyPusdTxId.trim();

      if (supplyToken === 'USDT') {
        if (!connectedEvm) {
          onConnectWallet();
          setIsSubmitting(false);
          return;
        }
        const web3Res = await executeWeb3LpDeposit({
          isTestnet: true,
          vaultAddress: usdtVaultAddress,
          tokenAddress: usdtTokenAddress,
          amount: amt,
          decimals: 6,
          onStatus: msg => setStatusMessage(msg)
        });
        finalTxHash = web3Res.txHash;
      } else {
        if (!connectedBch) {
          onConnectWallet();
          setIsSubmitting(false);
          return;
        }
        if (!finalTxHash || finalTxHash.length < 64) {
          showToast('Envía los PUSD al Covenant BinaryLiquidVault.cash y pega el TXID de 64 caracteres', 'error');
          setIsSubmitting(false);
          return;
        }
        setStatusMessage('Verificando depósito de PUSD en BCH Chipnet...');
      }

      const res = await fetch(`${backendUrl}/api/lend/supply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: effectiveAddress,
          bchAddress: connectedBch,
          evmAddress: connectedEvm,
          token: supplyToken,
          amount: amt,
          txHash: finalTxHash,
          network: platformNetwork
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || `¡${amt} ${supplyToken} depositados para APY!`, 'success');
        confetti({ particleCount: 55, spread: 60, origin: { y: 0.6 } });
        setSupplyAmount('');
        setSupplyPusdTxId('');
        if (data.txHash && data.explorerUrl) {
          setLastTxResult({ txHash: data.txHash, explorerUrl: data.explorerUrl, label: `Suministro APY ${supplyToken}` });
        }
        await fetchData();
        onRefreshBalances?.();
      } else {
        showToast(data.error || 'Error verificando suministro', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error en depósito', 'error');
    } finally {
      setIsSubmitting(false);
      setStatusMessage('');
    }
  };

  // =========================================================================
  // 6. WITHDRAW SUPPLY + ACCRUED APY
  // =========================================================================
  const handleWithdrawSupply = async () => {
    if (!isTestnet) {
      showToast(t.mainnetBannerDesc, 'error');
      return;
    }
    if (supplyToken === 'PUSD' && !connectedBch) {
      onConnectWallet();
      return;
    }
    if (supplyToken === 'USDT' && !connectedEvm) {
      onConnectWallet();
      return;
    }

    const amt = parseFloat(withdrawSupplyAmount);
    if (isNaN(amt) || amt <= 0) {
      showToast(`Ingresa un monto válido de ${supplyToken} para retirar`, 'error');
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(`Liberando ${amt} ${supplyToken} desde el Smart Contract...`);
    try {
      const res = await fetch(`${backendUrl}/api/lend/withdraw-supply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: effectiveAddress,
          bchAddress: connectedBch,
          evmAddress: connectedEvm,
          token: supplyToken,
          amount: amt,
          network: platformNetwork
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || `¡${amt} ${supplyToken} retirados a tu wallet!`, 'success');
        confetti({ particleCount: 45, spread: 55, origin: { y: 0.6 } });
        setWithdrawSupplyAmount('');
        if (data.txHash && data.explorerUrl) {
          setLastTxResult({ txHash: data.txHash, explorerUrl: data.explorerUrl, label: `Retiro APY ${supplyToken}` });
        }
        await fetchData();
        onRefreshBalances?.();
      } else {
        showToast(data.error || 'Error retirando fondos', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error de conexión', 'error');
    } finally {
      setIsSubmitting(false);
      setStatusMessage('');
    }
  };

  const pusdAvailLiquidity = markets?.PUSD_BORROW?.availableLiquidity ?? 0;
  const usdtAvailLiquidity = markets?.USDT_BORROW?.availableLiquidity ?? 0;
  const maxWithdrawableSelectedSupply =
    supplyToken === 'PUSD' ? supply.totalWithdrawablePusd : supply.totalWithdrawableUsdt;

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-6 sm:py-10 selection:bg-orange-500 selection:text-white">
      {/* NETWORK STATUS BANNER (TESTNET ACTIVE vs MAINNET SIN LIQUIDEZ) */}
      {!isTestnet ? (
        <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  {t.mainnetBannerTitle}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-300">
                  {t.sinLiquidezBadge}
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">{t.mainnetBannerDesc}</p>
            </div>
          </div>
          {onToggleNetwork && (
            <button
              onClick={() => onToggleNetwork('testnet')}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shrink-0 transition-all cursor-pointer shadow-xs"
            >
              {t.switchToTestnetBtn}
            </button>
          )}
        </div>
      ) : (
        <div className="mb-6 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 text-[11px] font-extrabold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {t.testnetBannerBadge}
            </span>
            <span className="text-xs text-gray-600 dark:text-gray-300">{t.testnetBannerDesc}</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono">
            <a
              href={`https://chipnet.imaginary.cash/address/${pusdVaultAddress}`}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-[#161c28] border border-gray-200 dark:border-gray-700 text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
            >
              <span>PUSD Covenant</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href={`https://amoy.polygonscan.com/address/${usdtVaultAddress}`}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-[#161c28] border border-gray-200 dark:border-gray-700 text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
            >
              <span>Amoy USDT Vault</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold uppercase tracking-wider mb-3">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{t.heroBadge}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-950 dark:text-white tracking-tight">
          {t.heroTitle}
        </h1>
        <p className="text-xs sm:text-sm md:text-base text-gray-500 dark:text-gray-400 mt-2 sm:mt-3 leading-relaxed">
          {t.heroSubtitle1}
          <strong className="text-gray-900 dark:text-white font-bold">{t.heroSubtitleBch}</strong>
          {t.heroSubtitle2}
          <strong className="text-primary font-bold">{t.heroSubtitlePusd}</strong>
          {t.heroSubtitleOr}
          <strong className="text-emerald-500 font-bold">{t.heroSubtitleUsdt}</strong>
          {t.heroSubtitle3}
        </p>
      </div>

      {/* LAST ON-CHAIN TX RECEIPT BANNER */}
      {lastTxResult && (
        <div className="mb-6 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="font-bold text-gray-900 dark:text-white">{lastTxResult.label}:</span>
            <span className="font-mono text-gray-500 dark:text-gray-300 truncate max-w-[180px] sm:max-w-xs">
              {lastTxResult.txHash}
            </span>
          </div>
          <a
            href={lastTxResult.explorerUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 shrink-0"
          >
            <span>Explorer</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {/* TOP USER METRICS DASHBOARD */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        {/* CARD 1: COLLATERAL */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#121622] border border-gray-200/80 dark:border-gray-800 shadow-2xs">
          <div className="flex items-center justify-between text-gray-400 mb-1.5 sm:mb-2">
            <span className="text-[11px] sm:text-xs font-medium">{t.cardCollateralTitle}</span>
            <div className="flex items-center gap-1">
              <img src="/BCH.png" alt="BCH" className="w-4 h-4 rounded-full" />
              <span className="inline-flex items-center justify-center w-3 h-3 rounded-full bg-emerald-500 text-white">
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
            ${vault.totalDebtUsd.toFixed(2)} <span className="text-xs font-sans text-gray-400">USD</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-gray-500 mt-1">
            <span>
              {vault.totalPusdDebt.toFixed(2)} PUSD • {(vault.totalUsdtDebt || 0).toFixed(2)} USDT
            </span>
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
              <span
                className={
                  vault.healthFactor >= 1.5
                    ? 'text-emerald-500'
                    : vault.healthFactor >= 1.15
                    ? 'text-amber-500'
                    : 'text-rose-500'
                }
              >
                {vault.healthFactor.toFixed(2)}
              </span>
            )}
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                vault.healthStatus === 'SAFE'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  : vault.healthStatus === 'MODERATE'
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
              }`}
            >
              {vault.healthStatus === 'SAFE'
                ? t.cardHealthSafe
                : vault.healthStatus === 'MODERATE'
                ? t.cardHealthModerate
                : t.cardHealthAlert}
            </span>
          </div>
          <span className="text-[11px] text-gray-400 mt-1 block">{t.cardHealthSub}</span>
        </div>

        {/* CARD 4: AVAILABLE TO BORROW */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#121622] border border-gray-200/80 dark:border-gray-800 shadow-2xs">
          <div className="flex items-center justify-between text-gray-400 mb-1.5 sm:mb-2">
            <span className="text-[11px] sm:text-xs font-medium">{t.cardAvailableTitle}</span>
            <DollarSign className="w-4 h-4 text-primary" />
          </div>
          <div className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 dark:text-white font-mono">
            ${vault.availableBorrowUsd.toFixed(2)}
          </div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-1 inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
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

      {/* =================================================================== */}
      {/* TAB 1: MY BCH VAULT (COLLATERAL + BORROW + REPAY + UNLOCK)          */}
      {/* =================================================================== */}
      {activeTab === 'vault' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: ACTION CARD */}
          <div className="lg:col-span-7 rounded-3xl bg-white dark:bg-[#121622] border border-gray-200/90 dark:border-gray-800 p-5 sm:p-7 shadow-2xs">
            {/* SUBTABS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-2xl bg-gray-50 dark:bg-[#181f2f] mb-6">
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

            {/* SUBTAB 1: LOCK BCH COLLATERAL IN CASHSCRIPT COVENANT */}
            {vaultSubTab === 'deposit_collateral' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-extrabold text-gray-900 dark:text-white">
                    {t.depositTitle}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t.depositDesc}</p>
                </div>

                {!connectedBch ? (
                  <div className="p-5 rounded-2xl bg-orange-500/10 border border-orange-500/25 text-center space-y-3">
                    <Wallet className="w-8 h-8 text-primary mx-auto" />
                    <p className="text-xs text-gray-600 dark:text-gray-300 max-w-md mx-auto">
                      {t.connectBchPrompt}
                    </p>
                    <button
                      onClick={onConnectWallet}
                      className="px-5 py-2.5 rounded-xl bg-primary hover:bg-orange-600 text-white font-bold text-xs cursor-pointer transition-all"
                    >
                      {t.connectBchBtn}
                    </button>
                  </div>
                ) : (
                  <>
                    {/* PERSONAL P2SH32 COVENANT BOX */}
                    <div className="p-4 rounded-2xl bg-emerald-500/5 dark:bg-[#151d2b] border border-emerald-500/25 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                          {t.personalVaultLabel}
                        </span>
                        {collateralCovenant?.explorerUrl && (
                          <a
                            href={collateralCovenant.explorerUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
                          >
                            <span>BinaryLiquidCollateralVault.cash</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>

                      {collateralCovenant?.vaultAddress ? (
                        <>
                          {collateralQr && (
                            <div className="w-32 h-32 mx-auto bg-white p-2 rounded-2xl shadow-xs">
                              <img
                                src={collateralQr}
                                alt="Personal BCH Collateral Covenant QR"
                                className="w-full h-full object-contain"
                              />
                            </div>
                          )}

                          <div className="flex items-center justify-between gap-2 bg-white dark:bg-[#0E131E] p-2.5 rounded-xl border border-gray-200 dark:border-gray-800">
                            <span className="font-mono text-[11px] text-gray-800 dark:text-gray-200 truncate">
                              {collateralCovenant.vaultAddress}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(collateralCovenant.vaultAddress, 'colVault')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] flex items-center gap-1 shrink-0 cursor-pointer"
                            >
                              {copiedKey === 'colVault' ? (
                                <Check className="w-3 h-3" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                              <span>{copiedKey === 'colVault' ? t.copiedBtn : t.copyBtn}</span>
                            </button>
                          </div>

                          <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center justify-between">
                            <span>Billetera vinculada:</span>
                            <span className="font-mono font-bold text-gray-800 dark:text-gray-200">
                              {formatAddress(connectedBch)}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="text-xs text-gray-400 py-3 text-center">
                          {isTestnet
                            ? 'Instanciando tu Covenant P2SH32 en BCH Chipnet...'
                            : t.mainnetBannerTitle}
                        </div>
                      )}
                    </div>

                    {/* CAPACITY SIMULATOR */}
                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#161c28] border border-gray-100 dark:border-gray-800 space-y-2.5">
                      <div className="flex justify-between items-center text-xs text-gray-400">
                        <span>Simulador de capacidad (tBCH)</span>
                        <span className="font-mono">
                          {t.bchPriceLabel} <strong>${bchPrice.toFixed(2)} USD</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          step="any"
                          value={depositCollateralAmount}
                          onChange={e => setDepositCollateralAmount(e.target.value)}
                          placeholder="0.01"
                          className="w-full bg-transparent text-2xl font-mono font-bold text-gray-900 dark:text-white outline-none"
                        />
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-[#202737] border border-gray-200 dark:border-gray-700 shrink-0">
                          <img src="/BCH.png" alt="BCH" className="w-5 h-5 rounded-full object-contain" />
                          <span className="font-bold text-xs text-gray-900 dark:text-white">tBCH</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-200/60 dark:border-gray-800">
                        <span className="text-gray-400">{t.newBorrowCapacity}</span>
                        <strong className="font-mono font-bold text-emerald-500">
                          +${(((parseFloat(depositCollateralAmount) || 0) * bchPrice) * 0.65).toFixed(2)} USD
                        </strong>
                      </div>
                    </div>

                    {/* OPTIONAL TXID INPUT */}
                    <div>
                      <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 block mb-1.5">
                        {t.optionalTxidLabel}
                      </label>
                      <input
                        type="text"
                        value={collateralTxId}
                        onChange={e => setCollateralTxId(e.target.value)}
                        placeholder={t.txidPlaceholder}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-[#161c28] border border-gray-200 dark:border-gray-800 text-xs font-mono text-gray-900 dark:text-white outline-none focus:border-primary"
                      />
                    </div>

                    <button
                      onClick={handleVerifyCollateral}
                      disabled={isSubmitting || !isTestnet}
                      className="w-full py-3.5 rounded-2xl bg-primary hover:bg-orange-600 disabled:opacity-50 text-white font-bold text-sm shadow-md shadow-orange-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>{statusMessage || t.btnVerifyingCollateral}</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4" />
                          <span>{t.btnVerifyCollateral}</span>
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* SUBTAB 2: BORROW PUSD OR USDT ON-CHAIN */}
            {vaultSubTab === 'borrow' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-extrabold text-gray-900 dark:text-white">{t.borrowTitle}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t.borrowDesc}</p>
                </div>

                {/* TOKEN SELECTOR (PUSD + USDT Active, USDC Sin Liquidez) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    onClick={() => setBorrowToken('PUSD')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      borrowToken === 'PUSD'
                        ? 'bg-primary/10 border-primary text-gray-950 dark:text-white shadow-xs'
                        : 'bg-gray-50 dark:bg-[#161c28] border-gray-100 dark:border-gray-800 text-gray-500'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <img src="/PUSD.png" alt="PUSD" className="w-5 h-5 rounded-full" />
                        <span className="font-bold text-xs">PUSD</span>
                      </div>
                      <span className="text-[9px] font-black uppercase text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">
                        Sponsor
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400 block">{t.borrowRatePusd}</span>
                    <span className="text-[10px] font-mono text-emerald-500 font-bold block mt-0.5">
                      {isTestnet ? `${pusdAvailLiquidity.toLocaleString()} PUSD` : t.sinLiquidezBadge}
                    </span>
                  </button>

                  <button
                    onClick={() => setBorrowToken('USDT')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      borrowToken === 'USDT'
                        ? 'bg-emerald-500/10 border-emerald-500 text-gray-950 dark:text-white shadow-xs'
                        : 'bg-gray-50 dark:bg-[#161c28] border-gray-100 dark:border-gray-800 text-gray-500'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <img src="/USDT.png" alt="USDT" className="w-5 h-5 rounded-full" />
                        <span className="font-bold text-xs">USDT</span>
                      </div>
                      <span className="text-[9px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        Amoy
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400 block">{t.borrowRateUsdt}</span>
                    <span className="text-[10px] font-mono text-emerald-500 font-bold block mt-0.5">
                      {isTestnet ? `${usdtAvailLiquidity.toLocaleString()} USDT` : t.sinLiquidezBadge}
                    </span>
                  </button>

                  <div className="p-3 rounded-2xl border border-gray-200/60 dark:border-gray-800 bg-gray-100/60 dark:bg-[#141824] opacity-60 cursor-not-allowed">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <img src="/USDC.png" alt="USDC" className="w-5 h-5 rounded-full grayscale" />
                        <span className="font-bold text-xs text-gray-500">USDC</span>
                      </div>
                      <span className="text-[9px] font-bold text-amber-500 bg-amber-500/15 px-1.5 py-0.5 rounded">
                        {t.sinLiquidezBadge}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400 block">4.2% APR • Polygon</span>
                    <span className="text-[10px] font-mono text-gray-400 block mt-0.5">0.00 USDC</span>
                  </div>
                </div>

                {/* DESTINATION WALLET CHECK */}
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#161c28] border border-gray-200/70 dark:border-gray-800 flex items-center justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">
                    Wallet receptora ({borrowToken === 'PUSD' ? 'BCH Chipnet' : 'Polygon Amoy'}):
                  </span>
                  {borrowToken === 'PUSD' ? (
                    connectedBch ? (
                      <span className="font-mono font-bold text-emerald-500">{formatAddress(connectedBch)}</span>
                    ) : (
                      <button
                        onClick={onConnectWallet}
                        className="text-primary font-bold hover:underline cursor-pointer"
                      >
                        {t.connectBchBtn}
                      </button>
                    )
                  ) : connectedEvm ? (
                    <span className="font-mono font-bold text-emerald-500">{formatAddress(connectedEvm)}</span>
                  ) : (
                    <button
                      onClick={onConnectWallet}
                      className="text-primary font-bold hover:underline cursor-pointer"
                    >
                      {t.connectEvmBtn}
                    </button>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#161c28] border border-gray-100 dark:border-gray-800">
                  <div className="flex justify-between items-center text-xs text-gray-400 mb-2">
                    <span>{t.borrowAmountLabel}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">
                        {t.availableLabel} <strong>${vault.availableBorrowUsd.toFixed(2)}</strong>
                      </span>
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

                {parseFloat(borrowAmount) > 0 && (
                  <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-[#181f2f] text-xs space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">{t.healthImpactLabel}</span>
                      <span className="font-mono font-bold text-emerald-500">
                        {vault.collateralUsd > 0
                          ? ((vault.collateralUsd * 0.8) / (vault.totalDebtUsd + parseFloat(borrowAmount))).toFixed(2)
                          : '0.00'}
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
                  disabled={
                    isSubmitting ||
                    !isTestnet ||
                    !borrowAmount ||
                    parseFloat(borrowAmount) <= 0 ||
                    parseFloat(borrowAmount) > vault.availableBorrowUsd + 0.01
                  }
                  className="w-full py-3.5 rounded-2xl bg-primary hover:bg-orange-600 disabled:opacity-50 text-white font-bold text-sm shadow-md shadow-orange-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{statusMessage || t.btnBorrowing}</span>
                    </>
                  ) : (
                    <>
                      <ArrowDownLeft className="w-4 h-4" />
                      <span>
                        {t.btnBorrow} {borrowToken}
                      </span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* SUBTAB 3: REPAY DEBT ON-CHAIN */}
            {vaultSubTab === 'repay' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-extrabold text-gray-900 dark:text-white">{t.repayTitle}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t.repayDesc}</p>
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
                      {t.debtLabel} <strong>{vault.totalPusdDebt.toFixed(4)} PUSD</strong>
                    </span>
                  </button>

                  <button
                    onClick={() => setRepayToken('USDT')}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      repayToken === 'USDT'
                        ? 'bg-emerald-500/10 border-emerald-500 text-gray-950 dark:text-white shadow-xs'
                        : 'bg-gray-50 dark:bg-[#161c28] border-gray-100 dark:border-gray-800 text-gray-500'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <img src="/USDT.png" alt="USDT" className="w-5 h-5 rounded-full" />
                      <span className="font-bold text-sm">USDT</span>
                    </div>
                    <span className="text-[11px] text-gray-400 block font-mono">
                      {t.debtLabel} <strong>{(vault.totalUsdtDebt || 0).toFixed(4)} USDT</strong>
                    </span>
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#161c28] border border-gray-100 dark:border-gray-800">
                  <div className="flex justify-between items-center text-xs text-gray-400 mb-2">
                    <span>{t.repayAmountLabel}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">
                        {t.pendingDebtLabel}{' '}
                        <strong>
                          {(repayToken === 'PUSD' ? vault.totalPusdDebt : vault.totalUsdtDebt || 0).toFixed(4)}{' '}
                          {repayToken}
                        </strong>
                      </span>
                      {(repayToken === 'PUSD' ? vault.totalPusdDebt : vault.totalUsdtDebt || 0) > 0 && (
                        <button
                          onClick={() =>
                            setRepayAmount(
                              String(repayToken === 'PUSD' ? vault.totalPusdDebt : vault.totalUsdtDebt || 0)
                            )
                          }
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

                {repayToken === 'PUSD' && isTestnet && (
                  <div className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-2.5">
                    <p className="text-[11px] text-gray-600 dark:text-gray-300 font-medium">{t.pusdSendStep}</p>
                    <div className="flex items-center justify-between gap-2 bg-white dark:bg-[#0E131E] p-2 rounded-xl border border-gray-200 dark:border-gray-800">
                      <span className="font-mono text-[11px] text-gray-800 dark:text-gray-200 truncate">
                        {pusdVaultAddress}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(pusdVaultAddress, 'repayPusdVault')}
                        className="px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        {copiedKey === 'repayPusdVault' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedKey === 'repayPusdVault' ? t.copiedBtn : t.copyBtn}</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      value={repayPusdTxId}
                      onChange={e => setRepayPusdTxId(e.target.value)}
                      placeholder={t.txidPlaceholder}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#0E131E] border border-gray-200 dark:border-gray-800 text-xs font-mono text-gray-900 dark:text-white outline-none"
                    />
                  </div>
                )}

                <button
                  onClick={handleRepay}
                  disabled={isSubmitting || !isTestnet || !repayAmount}
                  className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm shadow-md shadow-emerald-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{statusMessage || t.btnRepaying}</span>
                    </>
                  ) : (
                    <>
                      <ArrowUpRight className="w-4 h-4" />
                      <span>{repayToken === 'USDT' ? t.btnRepayUsdt : t.btnRepayPusd}</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* SUBTAB 4: UNLOCK BCH COLLATERAL */}
            {vaultSubTab === 'withdraw_collateral' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-extrabold text-gray-900 dark:text-white">{t.withdrawTitle}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t.withdrawDesc}</p>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#161c28] border border-gray-100 dark:border-gray-800">
                  <div className="flex justify-between items-center text-xs text-gray-400 mb-2">
                    <span>{t.withdrawAmountLabel}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">
                        {t.safeWithdrawableLabel} <strong>{vault.withdrawableBch.toFixed(6)} BCH</strong>
                      </span>
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
                  disabled={
                    isSubmitting ||
                    !isTestnet ||
                    !withdrawCollateralAmount ||
                    parseFloat(withdrawCollateralAmount) <= 0 ||
                    parseFloat(withdrawCollateralAmount) > vault.withdrawableBch + 0.000001
                  }
                  className="w-full py-3.5 rounded-2xl bg-gray-900 dark:bg-gray-100 hover:bg-gray-800 dark:hover:bg-white text-white dark:text-gray-900 disabled:opacity-50 font-bold text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{statusMessage || t.btnWithdrawing}</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-4 h-4" />
                      <span>
                        {t.btnWithdraw} ({withdrawCollateralAmount || '0'} BCH)
                      </span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* RIGHT: HOW IT WORKS + SPONSOR + RECENT ON-CHAIN ACTIVITY */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-5 rounded-3xl bg-white dark:bg-[#121622] border border-gray-200/90 dark:border-gray-800 shadow-2xs">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-primary" />
                <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">{t.howItWorksTitle}</h4>
              </div>
              <div className="space-y-3 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-[11px]">
                    1
                  </span>
                  <p>
                    <strong className="text-gray-900 dark:text-white">{t.step1Title}</strong>
                    {t.step1Desc}
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-[11px]">
                    2
                  </span>
                  <p>
                    <strong className="text-gray-900 dark:text-white">{t.step2Title}</strong>
                    {t.step2Desc}
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-[11px]">
                    3
                  </span>
                  <p>
                    <strong className="text-gray-900 dark:text-white">{t.step3Title}</strong>
                    {t.step3Desc}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-emerald-500/10 border border-amber-500/20 shadow-2xs">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
                <span className="text-xs font-black uppercase text-orange-600 dark:text-orange-400 tracking-wider">
                  {t.sponsorBadge}
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{t.sponsorDesc}</p>
            </div>

            {/* RECENT ON-CHAIN VAULT TRANSACTIONS */}
            <div className="p-5 rounded-3xl bg-white dark:bg-[#121622] border border-gray-200/90 dark:border-gray-800 shadow-2xs">
              <h4 className="font-extrabold text-sm text-gray-900 dark:text-white mb-3">{t.recentTxTitle}</h4>
              {recentTransactions.length === 0 ? (
                <p className="text-xs text-gray-400">{t.noRecentTx}</p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {recentTransactions.map((tx: any) => (
                    <div
                      key={tx.id}
                      className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#161c28] border border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <span className="font-bold text-gray-900 dark:text-white block">
                          {tx.action.replace('_', ' ')} • {tx.amount} {tx.token}
                        </span>
                        <span className="font-mono text-[10px] text-gray-400">
                          {tx.txHash?.slice(0, 10)}...{tx.txHash?.slice(-6)}
                        </span>
                      </div>
                      {tx.explorerUrl && (
                        <a
                          href={tx.explorerUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-500 hover:underline inline-flex items-center gap-1 font-bold text-[11px]"
                        >
                          <span>TX</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: RENDIMIENTO (ON-CHAIN SUPPLY & WITHDRAW + APY)               */}
      {/* =================================================================== */}
      {activeTab === 'supply' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 rounded-3xl bg-white dark:bg-[#121622] border border-gray-200/90 dark:border-gray-800 p-5 sm:p-7 shadow-2xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h3 className="text-lg font-extrabold text-gray-900 dark:text-white">{t.supplyTitle}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t.supplyDesc}</p>
              </div>
              <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-[#181f2f] shrink-0">
                <button
                  onClick={() => setSupplyMode('deposit')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                    supplyMode === 'deposit'
                      ? 'bg-white dark:bg-[#222c42] text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-gray-500'
                  }`}
                >
                  {t.supplySubDeposit}
                </button>
                <button
                  onClick={() => setSupplyMode('withdraw')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                    supplyMode === 'withdraw'
                      ? 'bg-white dark:bg-[#222c42] text-primary shadow-xs'
                      : 'text-gray-500'
                  }`}
                >
                  {t.supplySubWithdraw}
                </button>
              </div>
            </div>

            {/* TOKEN SELECTOR (PUSD + USDT Active, USDC Sin Liquidez) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => setSupplyToken('PUSD')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  supplyToken === 'PUSD'
                    ? 'bg-primary/10 border-primary text-gray-900 dark:text-white shadow-xs'
                    : 'bg-gray-50 dark:bg-[#161c28] border-gray-100 dark:border-gray-800 text-gray-500'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <img src="/PUSD.png" alt="PUSD" className="w-5 h-5 rounded-full" />
                    <span className="font-bold text-xs">PUSD</span>
                  </div>
                  <span className="text-xs font-black text-emerald-500">{isTestnet ? '5.8% APY' : '0%'}</span>
                </div>
                <span className="text-[10px] text-gray-400 block font-mono">
                  {t.suppliedLabel} <strong>{supply.suppliedPusd.toFixed(2)} PUSD</strong>
                </span>
              </button>

              <button
                onClick={() => setSupplyToken('USDT')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  supplyToken === 'USDT'
                    ? 'bg-emerald-500/10 border-emerald-500 text-gray-900 dark:text-white shadow-xs'
                    : 'bg-gray-50 dark:bg-[#161c28] border-gray-100 dark:border-gray-800 text-gray-500'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <img src="/USDT.png" alt="USDT" className="w-5 h-5 rounded-full" />
                    <span className="font-bold text-xs">USDT</span>
                  </div>
                  <span className="text-xs font-black text-emerald-500">{isTestnet ? '6.4% APY' : '0%'}</span>
                </div>
                <span className="text-[10px] text-gray-400 block font-mono">
                  {t.suppliedLabel} <strong>{(supply.suppliedUsdt || 0).toFixed(2)} USDT</strong>
                </span>
              </button>

              <div className="p-3.5 rounded-2xl border border-gray-200/60 dark:border-gray-800 bg-gray-100/60 dark:bg-[#141824] opacity-60 cursor-not-allowed">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <img src="/USDC.png" alt="USDC" className="w-5 h-5 rounded-full grayscale" />
                    <span className="font-bold text-xs text-gray-500">USDC</span>
                  </div>
                  <span className="text-[9px] font-bold text-amber-500 bg-amber-500/15 px-1.5 py-0.5 rounded">
                    {t.sinLiquidezBadge}
                  </span>
                </div>
                <span className="text-[10px] text-gray-400 block font-mono">0.00 USDC</span>
              </div>
            </div>

            {supplyMode === 'deposit' ? (
              <>
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#161c28] border border-gray-100 dark:border-gray-800">
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

                {supplyToken === 'PUSD' && isTestnet && (
                  <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-3">
                    <p className="text-xs text-gray-600 dark:text-gray-300 font-medium">{t.pusdSendStep}</p>
                    {pusdVaultQr && (
                      <div className="w-28 h-28 mx-auto bg-white p-2 rounded-xl shadow-xs">
                        <img src={pusdVaultQr} alt="PUSD Vault QR" className="w-full h-full object-contain" />
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2 bg-white dark:bg-[#0E131E] p-2 rounded-xl border border-gray-200 dark:border-gray-800">
                      <span className="font-mono text-[11px] text-gray-800 dark:text-gray-200 truncate">
                        {pusdVaultAddress}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(pusdVaultAddress, 'supplyPusdVault')}
                        className="px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        {copiedKey === 'supplyPusdVault' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedKey === 'supplyPusdVault' ? t.copiedBtn : t.copyBtn}</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      value={supplyPusdTxId}
                      onChange={e => setSupplyPusdTxId(e.target.value)}
                      placeholder={t.txidPlaceholder}
                      className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-[#0E131E] border border-gray-200 dark:border-gray-800 text-xs font-mono text-gray-900 dark:text-white outline-none"
                    />
                  </div>
                )}

                <button
                  onClick={handleSupply}
                  disabled={isSubmitting || !isTestnet || !supplyAmount}
                  className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm shadow-md shadow-emerald-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{statusMessage || 'Procesando...'}</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>{supplyToken === 'USDT' ? t.btnSupplyUsdt : t.btnSupplyPusd}</span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#161c28] border border-gray-100 dark:border-gray-800">
                  <div className="flex justify-between items-center text-xs text-gray-400 mb-2">
                    <span>{t.withdrawSupplyAmountLabel}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">
                        {t.withdrawableSupplyLabel}{' '}
                        <strong>
                          {(maxWithdrawableSelectedSupply || 0).toFixed(4)} {supplyToken}
                        </strong>
                      </span>
                      {(maxWithdrawableSelectedSupply || 0) > 0 && (
                        <button
                          onClick={() => setWithdrawSupplyAmount(String(maxWithdrawableSelectedSupply))}
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
                      value={withdrawSupplyAmount}
                      onChange={e => setWithdrawSupplyAmount(e.target.value)}
                      placeholder="0.0"
                      className="w-full bg-transparent text-2xl sm:text-3xl font-mono font-bold text-gray-900 dark:text-white outline-none"
                    />
                    <span className="font-bold text-sm text-gray-700 dark:text-gray-200 shrink-0">
                      {supplyToken}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleWithdrawSupply}
                  disabled={
                    isSubmitting ||
                    !isTestnet ||
                    !withdrawSupplyAmount ||
                    parseFloat(withdrawSupplyAmount) <= 0 ||
                    parseFloat(withdrawSupplyAmount) > (maxWithdrawableSelectedSupply || 0) + 0.0001
                  }
                  className="w-full py-3.5 rounded-2xl bg-primary hover:bg-orange-600 disabled:opacity-50 text-white font-bold text-sm shadow-md shadow-orange-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{statusMessage || 'Liberando fondos...'}</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-4 h-4" />
                      <span>
                        {t.btnWithdrawSupply} ({supplyToken})
                      </span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>

          <div className="lg:col-span-5 space-y-4">
            <div className="p-5 rounded-3xl bg-white dark:bg-[#121622] border border-gray-200/90 dark:border-gray-800 shadow-2xs">
              <h4 className="font-extrabold text-sm text-gray-900 dark:text-white mb-3">{t.myYieldTitle}</h4>

              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center mb-4">
                <span className="text-xs text-gray-400 block uppercase font-bold">{t.yieldEarnedLabel}</span>
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1 block">
                  +${((supply.yieldEarnedPusd || 0) + (supply.yieldEarnedUsdt || 0)).toFixed(6)} USD
                </span>
                <span className="text-[10px] text-emerald-500 font-medium">{t.yieldEarnedSub}</span>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-gray-50 dark:bg-[#161c28]">
                  <span className="text-gray-400">{t.pusdSuppliedLabel}</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {supply.suppliedPusd.toFixed(4)} PUSD
                  </span>
                </div>
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-gray-50 dark:bg-[#161c28]">
                  <span className="text-gray-400">{t.usdtSuppliedLabel}</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {(supply.suppliedUsdt || 0).toFixed(4)} USDT
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: LIVE ON-CHAIN MARKETS & RISK PARAMETERS                      */}
      {/* =================================================================== */}
      {activeTab === 'markets' && (
        <div className="rounded-3xl bg-white dark:bg-[#121622] border border-gray-200/90 dark:border-gray-800 p-5 sm:p-7 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100 dark:border-gray-800 mb-6">
            <div>
              <h3 className="text-lg font-extrabold text-gray-900 dark:text-white">{t.marketsTitle}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t.marketsDesc}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-gray-400">{t.oracleSource}</span>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                Binance / CoinGecko Live (${bchPrice.toFixed(2)})
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. BCH COLLATERAL MARKET */}
            <div className="p-5 rounded-2xl bg-gray-50 dark:bg-[#161c28] border border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <img src="/BCH.png" alt="BCH" className="w-8 h-8 rounded-full" />
                  <div>
                    <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">Bitcoin Cash</h4>
                    <span className="text-[10px] text-gray-400">
                      {markets?.BCH_COLLATERAL?.network || 'BCH'}
                    </span>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isTestnet
                      ? 'text-emerald-500 bg-emerald-500/10'
                      : 'text-amber-500 bg-amber-500/15'
                  }`}
                >
                  {isTestnet ? 'Covenant P2SH32' : t.sinLiquidezBadge}
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-gray-400">
                  <span>{t.referencePrice}</span>
                  <span className="font-mono font-bold text-gray-900 dark:text-white">
                    ${bchPrice.toFixed(2)}
                  </span>
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
                  <span>{t.settlementNetwork}</span>
                  <span className="font-mono font-bold text-[11px]">CollateralVault.cash</span>
                </div>
              </div>
            </div>

            {/* 2. PUSD BORROW & SUPPLY MARKET */}
            <div className="p-5 rounded-2xl bg-gray-50 dark:bg-[#161c28] border border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <img src="/PUSD.png" alt="PUSD" className="w-8 h-8 rounded-full" />
                  <div>
                    <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">ParyonUSD</h4>
                    <span className="text-[10px] text-gray-400">
                      {markets?.PUSD_BORROW?.network || 'BCH CashTokens'}
                    </span>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    markets?.PUSD_BORROW?.hasLiquidity
                      ? 'text-emerald-500 bg-emerald-500/10'
                      : 'text-amber-500 bg-amber-500/15'
                  }`}
                >
                  {markets?.PUSD_BORROW?.hasLiquidity ? t.activeOnChainBadge : t.sinLiquidezBadge}
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
                  <span className="font-mono font-bold text-gray-900 dark:text-white">
                    {pusdAvailLiquidity.toLocaleString()} PUSD
                  </span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>{t.settlementNetwork}</span>
                  <span className="font-mono font-bold text-[11px]">BinaryLiquidVault.cash</span>
                </div>
              </div>
            </div>

            {/* 3. USDT BORROW & SUPPLY MARKET */}
            <div className="p-5 rounded-2xl bg-gray-50 dark:bg-[#161c28] border border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <img src="/USDT.png" alt="USDT" className="w-8 h-8 rounded-full" />
                  <div>
                    <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">Tether USD</h4>
                    <span className="text-[10px] text-gray-400">
                      {markets?.USDT_BORROW?.network || 'Polygon'}
                    </span>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    markets?.USDT_BORROW?.hasLiquidity
                      ? 'text-emerald-500 bg-emerald-500/10'
                      : 'text-amber-500 bg-amber-500/15'
                  }`}
                >
                  {markets?.USDT_BORROW?.hasLiquidity ? t.activeOnChainBadge : t.sinLiquidezBadge}
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-gray-400">
                  <span>{t.borrowRate}</span>
                  <span className="font-mono font-bold text-emerald-500">4.0% APR</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>{t.supplyRate}</span>
                  <span className="font-mono font-bold text-emerald-500">6.4% APY</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>{t.availLiquidity}</span>
                  <span className="font-mono font-bold text-gray-900 dark:text-white">
                    {usdtAvailLiquidity.toLocaleString()} USDT
                  </span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>{t.settlementNetwork}</span>
                  <span className="font-mono font-bold text-[11px]">BinaryLiquidVault.sol</span>
                </div>
              </div>
            </div>

            {/* 4. USDC MARKET (MARKED SIN LIQUIDEZ) */}
            <div className="p-5 rounded-2xl bg-gray-100/70 dark:bg-[#141824] border border-gray-200/70 dark:border-gray-800 opacity-75">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <img src="/USDC.png" alt="USDC" className="w-8 h-8 rounded-full grayscale" />
                  <div>
                    <h4 className="font-extrabold text-sm text-gray-600 dark:text-gray-300">USD Coin</h4>
                    <span className="text-[10px] text-gray-400">Polygon</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-amber-500 bg-amber-500/15 px-2 py-0.5 rounded-full">
                  {t.sinLiquidezBadge}
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-gray-400">
                  <span>{t.borrowRate}</span>
                  <span className="font-mono font-bold">4.2% APR</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>{t.supplyRate}</span>
                  <span className="font-mono font-bold">6.0% APY</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>{t.availLiquidity}</span>
                  <span className="font-mono font-bold text-amber-500">0.00 USDC</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Estado:</span>
                  <span className="font-mono font-bold text-amber-500">{t.sinLiquidezBadge}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
