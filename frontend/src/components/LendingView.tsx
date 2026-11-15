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
  executeBchSwapDeposit,
  hasActiveBchSigningCapability,
  DEPLOYED_TESTNET_CONTRACTS,
  AuthSessionChain,
  EnsureAuthSessionOptions
} from '../services/walletConnectService';
import {
  convertCashAddressNetwork,
  generateQrDataUrl,
  formatAddress
} from '../utils/bchAddress';

interface LendingViewProps {
  userAddress: string;
  bchAddress?: string;
  bchWalletSource?: 'wizard' | 'wc2-bch' | 'extension' | 'manual';
  evmAddress?: string;
  walletBalances?: Record<string, number>;
  wizardConnectManager?: any;
  wizardConnectState?: string;
  platformNetwork?: 'mainnet' | 'testnet';
  onToggleNetwork?: (net: 'mainnet' | 'testnet') => void;
  onRefreshBalances?: () => void;
  backendUrl: string;
  isWalletConnected: boolean;
  onConnectWallet: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  lang?: 'en' | 'es';
  authToken?: string | null;
  onEnsureAuthSession?: (options?: EnsureAuthSessionOptions) => Promise<string | null>;
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
  bchWalletSource,
  evmAddress = '',
  walletBalances: parentBalances,
  wizardConnectManager,
  wizardConnectState,
  platformNetwork = 'testnet',
  onToggleNetwork,
  onRefreshBalances,
  backendUrl,
  isWalletConnected,
  onConnectWallet,
  showToast,
  lang = 'es',
  authToken,
  onEnsureAuthSession
}: LendingViewProps) {
  const t = lendTexts[lang] || lendTexts.es;
  const isTestnet = platformNetwork === 'testnet';
  const isEs = lang === 'es';

  const [activeTab, setActiveTab] = useState<'vault' | 'supply' | 'markets'>('vault');
  const [vaultSubTab, setVaultSubTab] = useState<
    'deposit_collateral' | 'borrow' | 'repay' | 'withdraw_collateral'
  >('deposit_collateral');
  const [supplyMode, setSupplyMode] = useState<'deposit' | 'withdraw'>('deposit');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [faucetClaiming, setFaucetClaiming] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [lastTxResult, setLastTxResult] = useState<{ txHash: string; explorerUrl: string; label: string } | null>(null);
  const [overview, setOverview] = useState<any>(null);
  const [userVaultData, setUserVaultData] = useState<any>(null);
  const [walletBalances, setWalletBalances] = useState<Record<string, number>>(() => parentBalances || {});
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

  const hasOneClickBchSign =
    Boolean(connectedBch) &&
    hasActiveBchSigningCapability(wizardConnectManager, bchWalletSource);

  useEffect(() => {
    if (parentBalances && Object.keys(parentBalances).length > 0) {
      setWalletBalances(prev => ({ ...prev, ...parentBalances }));
    }
  }, [parentBalances]);

  const copyToClipboard = (value: string, key: string) => {
    if (!value) return;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(value);
    }
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 2000);
  };

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
      console.warn('Failed to load wallet balances in LendingView:', err);
    }
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
    fetchWalletBalances();
    const interval = setInterval(() => {
      fetchData();
      fetchWalletBalances();
    }, 9000);
    return () => clearInterval(interval);
  }, [backendUrl, effectiveAddress, connectedBch, connectedEvm, platformNetwork]);

  const handleClaimTestnetFaucet = async (tokenSym: 'PUSD' | 'USDT') => {
    const recipient = tokenSym === 'USDT' ? connectedEvm : connectedBch;
    if (!recipient) {
      onConnectWallet();
      return;
    }
    setFaucetClaiming(true);
    try {
      const claimAmt = tokenSym === 'USDT' ? 100 : 25;
      const res = await fetch(`${backendUrl}/api/faucet/testnet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: tokenSym,
          amount: claimAmt,
          recipient
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(
          isEs
            ? `💧 ¡Faucet envió ${claimAmt} ${tokenSym} on-chain a tu billetera!`
            : `💧 Faucet sent ${claimAmt} ${tokenSym} on-chain to your wallet!`,
          'success'
        );
        onRefreshBalances?.();
        setTimeout(() => fetchWalletBalances(), 2000);
      } else {
        showToast(data.error || 'Error solicitando tokens del Faucet', 'error');
      }
    } catch (err: any) {
      showToast(err.message || (isEs ? 'Error de red' : 'Network error'), 'error');
    } finally {
      setFaucetClaiming(false);
    }
  };

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
  // 1. LOCK / VERIFY & SYNC BCH COLLATERAL COVENANT (1-Click WC or Auto-Detect)
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
      let confirmedTxHash = collateralTxId.trim();
      const inputAmtBch = parseFloat(depositCollateralAmount) || 0;

      // If user entered an amount and has 1-click BCH signing connected, sign & broadcast directly!
      if (!confirmedTxHash && hasOneClickBchSign && inputAmtBch > 0) {
        const signed = await executeBchSwapDeposit({
          backendUrl,
          buildEndpoint: '/api/lend/build-bch-tx',
          senderAddress: connectedBch,
          isTestnet,
          wizardManager: wizardConnectManager,
          preferredSource: bchWalletSource,
          bodyPayload: {
            action: 'DEPOSIT_COLLATERAL',
            token: 'BCH',
            amount: inputAmtBch,
            network: platformNetwork
          },
          onStatus: msg => setStatusMessage(msg)
        });
        confirmedTxHash = signed.txHash;
      }

      setStatusMessage(t.btnVerifyingCollateral);
      const res = await fetch(`${backendUrl}/api/lend/deposit-collateral`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({
          userAddress: effectiveAddress,
          bchAddress: connectedBch,
          evmAddress: connectedEvm,
          amountBch: inputAmtBch,
          txHash: confirmedTxHash || undefined,
          network: platformNetwork
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || (isEs ? 'Colateral BCH verificado en cadena' : 'BCH collateral verified on-chain'), 'success');
        confetti({ particleCount: 55, spread: 65, origin: { y: 0.6 } });
        setCollateralTxId('');
        setDepositCollateralAmount('');
        if (data.txHash && data.explorerUrl) {
          setLastTxResult({
            txHash: data.txHash,
            explorerUrl: data.explorerUrl,
            label: isEs ? 'Depósito Colateral BCH' : 'BCH Collateral Deposit'
          });
        }
        await Promise.all([fetchData(), fetchWalletBalances()]);
        onRefreshBalances?.();
      } else {
        showToast(data.error || (isEs ? 'No se detectó nuevo depósito en tu Bóveda' : 'No new deposit detected in your Vault'), 'error');
      }
    } catch (err: any) {
      showToast(err.message || (isEs ? 'Error de conexión' : 'Connection error'), 'error');
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
      showToast(isEs ? 'Ingresa un monto válido de BCH para desbloquear' : 'Enter valid BCH amount to unlock', 'error');
      return;
    }

    const token = await onEnsureAuthSession?.({ chains: ['bch'] });
    if (!token) return;

    setIsSubmitting(true);
    setStatusMessage(t.btnWithdrawing);
    try {
      const res = await fetch(`${backendUrl}/api/lend/withdraw-collateral`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          userAddress: connectedBch,
          bchAddress: connectedBch,
          amountBch: amt,
          network: platformNetwork
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(
          data.message || (isEs ? `¡${amt} BCH desbloqueados a tu billetera!` : `${amt} BCH unlocked to your wallet!`),
          'success'
        );
        confetti({ particleCount: 45, spread: 55, origin: { y: 0.6 } });
        setWithdrawCollateralAmount('');
        if (data.txHash && data.explorerUrl) {
          setLastTxResult({
            txHash: data.txHash,
            explorerUrl: data.explorerUrl,
            label: isEs ? 'Retiro Colateral BCH' : 'BCH Collateral Withdrawal'
          });
        }
        await Promise.all([fetchData(), fetchWalletBalances()]);
        onRefreshBalances?.();
      } else {
        showToast(data.error || (isEs ? 'Error liberando colateral' : 'Error unlocking collateral'), 'error');
      }
    } catch (err: any) {
      showToast(err.message || (isEs ? 'Error de conexión' : 'Connection error'), 'error');
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
      showToast(isEs ? `Ingresa un monto válido en ${borrowToken}` : `Enter a valid ${borrowToken} amount`, 'error');
      return;
    }

    const borrowChains: AuthSessionChain[] =
      borrowToken === 'USDT' ? (connectedBch ? ['bch', 'evm'] : ['evm']) : ['bch'];
    const token = await onEnsureAuthSession?.({ chains: borrowChains });
    if (!token) return;

    setIsSubmitting(true);
    setStatusMessage(t.btnBorrowing);
    try {
      const res = await fetch(`${backendUrl}/api/lend/borrow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          userAddress: borrowToken === 'USDT' ? effectiveAddress : connectedBch,
          bchAddress: connectedBch,
          evmAddress: borrowToken === 'USDT' ? connectedEvm : '',
          token: borrowToken,
          amount: amt,
          network: platformNetwork
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(
          data.message || (isEs ? `¡Préstamo de ${amt} ${borrowToken} enviado a tu wallet!` : `Loan of ${amt} ${borrowToken} sent to your wallet!`),
          'success'
        );
        confetti({ particleCount: 65, spread: 70, origin: { y: 0.6 } });
        setBorrowAmount('');
        if (data.txHash && data.explorerUrl) {
          setLastTxResult({
            txHash: data.txHash,
            explorerUrl: data.explorerUrl,
            label: isEs ? `Préstamo ${borrowToken}` : `${borrowToken} Loan`
          });
        }
        await Promise.all([fetchData(), fetchWalletBalances()]);
        onRefreshBalances?.();
      } else {
        showToast(data.error || (isEs ? 'Error aprobando préstamo' : 'Error approving loan'), 'error');
      }
    } catch (err: any) {
      showToast(err.message || (isEs ? 'Error de conexión' : 'Connection error'), 'error');
    } finally {
      setIsSubmitting(false);
      setStatusMessage('');
    }
  };

  // =========================================================================
  // 4. REPAY DEBT ON-CHAIN (1-Click Web3 USDT or 1-Click WC / Auto-Detect PUSD)
  // =========================================================================
  const handleRepay = async () => {
    if (!isTestnet) {
      showToast(t.mainnetBannerDesc, 'error');
      return;
    }

    const pendingDebt = repayToken === 'PUSD' ? vault.totalPusdDebt : vault.totalUsdtDebt;
    const rawInput = parseFloat(repayAmount);
    if (isNaN(rawInput) || rawInput <= 0) {
      showToast(isEs ? `Ingresa un monto válido de ${repayToken}` : `Enter a valid ${repayToken} amount`, 'error');
      return;
    }
    const amt = Math.min(rawInput, pendingDebt);
    if (amt <= 0) {
      showToast(isEs ? `No tienes deuda activa en ${repayToken}` : `You have no active ${repayToken} debt`, 'error');
      return;
    }
    if (rawInput > pendingDebt) {
      showToast(
        isEs
          ? `Monto ajustado automáticamente a tu deuda exacta (${pendingDebt.toFixed(4)} ${repayToken})`
          : `Adjusted repayment to your exact debt (${pendingDebt.toFixed(4)} ${repayToken})`,
        'info'
      );
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
          isTestnet,
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
        if (!finalTxHash) {
          if (hasOneClickBchSign) {
            const signed = await executeBchSwapDeposit({
              backendUrl,
              buildEndpoint: '/api/lend/build-bch-tx',
              senderAddress: connectedBch,
              isTestnet,
              wizardManager: wizardConnectManager,
              preferredSource: bchWalletSource,
              bodyPayload: {
                action: 'REPAY',
                token: 'PUSD',
                amount: amt,
                network: platformNetwork
              },
              onStatus: msg => setStatusMessage(msg)
            });
            finalTxHash = signed.txHash;
          } else {
            finalTxHash = 'AUTO_DETECT';
          }
        }
        setStatusMessage(t.btnRepaying);
      }

      const res = await fetch(`${backendUrl}/api/lend/repay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        },
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
        showToast(
          data.message || (isEs ? `¡Pago de ${amt} ${repayToken} verificado!` : `Repayment of ${amt} ${repayToken} verified!`),
          'success'
        );
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
        setRepayAmount('');
        setRepayPusdTxId('');
        if (data.txHash && data.explorerUrl) {
          setLastTxResult({
            txHash: data.txHash,
            explorerUrl: data.explorerUrl,
            label: isEs ? `Pago Deuda ${repayToken}` : `${repayToken} Debt Repayment`
          });
        }
        await Promise.all([fetchData(), fetchWalletBalances()]);
        onRefreshBalances?.();
      } else {
        showToast(data.error || (isEs ? 'Error verificando pago' : 'Error verifying repayment'), 'error');
      }
    } catch (err: any) {
      showToast(err.message || (isEs ? 'Error en firma o verificación' : 'Signing or verification error'), 'error');
    } finally {
      setIsSubmitting(false);
      setStatusMessage('');
    }
  };

  // =========================================================================
  // 5. SUPPLY STABLECOINS FOR PASSIVE APY (1-Click Web3 USDT or 1-Click WC / Auto-Detect PUSD)
  // =========================================================================
  const handleSupply = async () => {
    if (!isTestnet) {
      showToast(t.mainnetBannerDesc, 'error');
      return;
    }

    const amt = parseFloat(supplyAmount);
    if (isNaN(amt) || amt <= 0) {
      showToast(isEs ? `Ingresa un monto válido en ${supplyToken}` : `Enter a valid ${supplyToken} amount`, 'error');
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
          isTestnet,
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
        if (!finalTxHash) {
          if (hasOneClickBchSign) {
            const signed = await executeBchSwapDeposit({
              backendUrl,
              buildEndpoint: '/api/lend/build-bch-tx',
              senderAddress: connectedBch,
              isTestnet,
              wizardManager: wizardConnectManager,
              preferredSource: bchWalletSource,
              bodyPayload: {
                action: 'SUPPLY',
                token: 'PUSD',
                amount: amt,
                network: platformNetwork
              },
              onStatus: msg => setStatusMessage(msg)
            });
            finalTxHash = signed.txHash;
          } else {
            finalTxHash = 'AUTO_DETECT';
          }
        }
        setStatusMessage(isEs ? 'Verificando depósito de PUSD en BCH Chipnet...' : 'Verifying PUSD deposit on BCH Chipnet...');
      }

      const res = await fetch(`${backendUrl}/api/lend/supply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        },
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
        showToast(
          data.message || (isEs ? `¡${amt} ${supplyToken} depositados para APY!` : `${amt} ${supplyToken} deposited for APY!`),
          'success'
        );
        confetti({ particleCount: 55, spread: 60, origin: { y: 0.6 } });
        setSupplyAmount('');
        setSupplyPusdTxId('');
        if (data.txHash && data.explorerUrl) {
          setLastTxResult({
            txHash: data.txHash,
            explorerUrl: data.explorerUrl,
            label: isEs ? `Suministro APY ${supplyToken}` : `${supplyToken} APY Supply`
          });
        }
        await Promise.all([fetchData(), fetchWalletBalances()]);
        onRefreshBalances?.();
      } else {
        showToast(data.error || (isEs ? 'Error verificando suministro' : 'Error verifying supply'), 'error');
      }
    } catch (err: any) {
      showToast(err.message || (isEs ? 'Error en depósito' : 'Deposit error'), 'error');
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
      showToast(isEs ? `Ingresa un monto válido de ${supplyToken} para retirar` : `Enter a valid ${supplyToken} amount to withdraw`, 'error');
      return;
    }

    const supplyChains: AuthSessionChain[] =
      supplyToken === 'USDT' ? (connectedBch ? ['bch', 'evm'] : ['evm']) : ['bch'];
    const token = await onEnsureAuthSession?.({ chains: supplyChains });
    if (!token) return;

    setIsSubmitting(true);
    setStatusMessage(isEs ? `Liberando ${amt} ${supplyToken} desde el Smart Contract...` : `Releasing ${amt} ${supplyToken} from Smart Contract...`);
    try {
      const res = await fetch(`${backendUrl}/api/lend/withdraw-supply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          userAddress: supplyToken === 'USDT' ? effectiveAddress : connectedBch,
          bchAddress: connectedBch,
          evmAddress: supplyToken === 'USDT' ? connectedEvm : '',
          token: supplyToken,
          amount: amt,
          network: platformNetwork
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(
          data.message || (isEs ? `¡${amt} ${supplyToken} retirados a tu wallet!` : `${amt} ${supplyToken} withdrawn to your wallet!`),
          'success'
        );
        confetti({ particleCount: 45, spread: 55, origin: { y: 0.6 } });
        setWithdrawSupplyAmount('');
        if (data.txHash && data.explorerUrl) {
          setLastTxResult({
            txHash: data.txHash,
            explorerUrl: data.explorerUrl,
            label: isEs ? `Retiro APY ${supplyToken}` : `${supplyToken} APY Withdrawal`
          });
        }
        await fetchData();
        onRefreshBalances?.();
      } else {
        showToast(data.error || (isEs ? 'Error retirando fondos' : 'Error withdrawing funds'), 'error');
      }
    } catch (err: any) {
      showToast(err.message || (isEs ? 'Error de conexión' : 'Connection error'), 'error');
    } finally {
      setIsSubmitting(false);
      setStatusMessage('');
    }
  };

  const pusdAvailLiquidity = markets?.PUSD_BORROW?.availableLiquidity ?? 0;
  const usdtAvailLiquidity = markets?.USDT_BORROW?.availableLiquidity ?? 0;
  const maxWithdrawableSelectedSupply =
    supplyToken === 'PUSD' ? supply.totalWithdrawablePusd : supply.totalWithdrawableUsdt;

  // Live solvency & projected simulation metrics (Max LTV 65%, Liquidation 80%)
  const currentLtvPercent =
    vault.collateralUsd > 0 ? Math.min(100, (vault.totalDebtUsd / vault.collateralUsd) * 100) : 0;

  const parsedDepositBch =
    activeTab === 'vault' && vaultSubTab === 'deposit_collateral'
      ? Math.max(0, parseFloat(depositCollateralAmount) || 0)
      : 0;
  const parsedWithdrawBch =
    activeTab === 'vault' && vaultSubTab === 'withdraw_collateral'
      ? Math.max(0, parseFloat(withdrawCollateralAmount) || 0)
      : 0;
  const parsedBorrowUsd =
    activeTab === 'vault' && vaultSubTab === 'borrow'
      ? Math.max(0, parseFloat(borrowAmount) || 0)
      : 0;
  const parsedRepayUsd =
    activeTab === 'vault' && vaultSubTab === 'repay'
      ? Math.max(0, parseFloat(repayAmount) || 0)
      : 0;

  const hasVaultSimulation =
    parsedDepositBch > 0 ||
    parsedWithdrawBch > 0 ||
    parsedBorrowUsd > 0 ||
    parsedRepayUsd > 0;

  const projectedCollateralBch = Math.max(
    0,
    vault.collateralBch + parsedDepositBch - parsedWithdrawBch
  );
  const projectedCollateralUsd = projectedCollateralBch * bchPrice;
  const projectedDebtUsd = Math.max(0, vault.totalDebtUsd + parsedBorrowUsd - parsedRepayUsd);
  const projectedMaxBorrowUsd = projectedCollateralUsd * 0.65;
  const projectedAvailableUsd = Math.max(0, projectedMaxBorrowUsd - projectedDebtUsd);
  const projectedLtvPercent =
    projectedCollateralUsd > 0
      ? Math.min(100, (projectedDebtUsd / projectedCollateralUsd) * 100)
      : projectedDebtUsd > 0
      ? 100
      : 0;
  const projectedHealthFactor =
    projectedDebtUsd <= 0 ? 999 : (projectedCollateralUsd * 0.8) / projectedDebtUsd;

  const activeBorrowLiquidity =
    borrowToken === 'PUSD' ? pusdAvailLiquidity : usdtAvailLiquidity;
  const maxBorrowSelectable = Math.max(
    0,
    Math.min(vault.availableBorrowUsd, activeBorrowLiquidity)
  );
  const selectedRepayDebt =
    repayToken === 'PUSD' ? vault.totalPusdDebt : vault.totalUsdtDebt || 0;

  const simError = (() => {
    if (parsedWithdrawBch > vault.withdrawableBch + 0.000001 && vault.collateralBch > 0) {
      return isEs
        ? 'El retiro supera tu margen seguro (80% liquidación).'
        : 'Withdrawal exceeds your safe collateral margin.';
    }
    if (parsedBorrowUsd > vault.availableBorrowUsd + 0.01) {
      return isEs
        ? 'El monto supera tu capacidad disponible al 65% LTV.'
        : 'Amount exceeds your 65% LTV borrow capacity.';
    }
    if (parsedBorrowUsd > activeBorrowLiquidity && activeBorrowLiquidity > 0) {
      return isEs
        ? `Liquidez insuficiente en el vault de ${borrowToken}.`
        : `Insufficient ${borrowToken} vault liquidity.`;
    }
    return '';
  })();

  // Supply & APY forecast metrics
  const supplyApyRate = supplyToken === 'USDT' ? 0.064 : 0.058;
  const parsedSupplyInput = Math.max(0, parseFloat(supplyAmount) || 0);
  const currentTotalSupplied =
    (supply.suppliedPusd || 0) + (supply.suppliedUsdt || 0);
  const simulatedSupplyDelta = supplyMode === 'deposit' ? parsedSupplyInput : 0;
  const estAnnualYieldUsd =
    (supply.suppliedPusd || 0) * 0.058 +
    (supply.suppliedUsdt || 0) * 0.064 +
    simulatedSupplyDelta * supplyApyRate;
  const estMonthlyYieldUsd = estAnnualYieldUsd / 12;

  // Smart wallet requirement check for current subtab
  const missingVaultWallet =
    (vaultSubTab === 'deposit_collateral' && !connectedBch) ||
    (vaultSubTab === 'withdraw_collateral' && !connectedBch) ||
    (vaultSubTab === 'borrow' &&
      ((borrowToken === 'PUSD' && !connectedBch) ||
        (borrowToken === 'USDT' && !connectedEvm))) ||
    (vaultSubTab === 'repay' &&
      ((repayToken === 'PUSD' && !connectedBch) ||
        (repayToken === 'USDT' && !connectedEvm)));

  const missingSupplyWallet =
    (supplyToken === 'PUSD' && !connectedBch) ||
    (supplyToken === 'USDT' && !connectedEvm);

  const connectLabelFor = (needsEvm: boolean) =>
    needsEvm ? t.connectEvmBtn : t.connectBchBtn;

  const isBorrowEvmMissing = borrowToken === 'USDT' && !connectedEvm;
  const isRepayEvmMissing = repayToken === 'USDT' && !connectedEvm;
  const isSupplyEvmMissing = supplyToken === 'USDT' && !connectedEvm;

  const jumpToBorrow = (token: 'PUSD' | 'USDT') => {
    setBorrowToken(token);
    setVaultSubTab('borrow');
    setActiveTab('vault');
  };

  const jumpToSupply = (token: 'PUSD' | 'USDT') => {
    setSupplyToken(token);
    setSupplyMode('deposit');
    setActiveTab('supply');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-24 sm:pb-16">
      {/* MAINNET NOTICE */}
      {!isTestnet && (
        <div className="mb-5 ui-panel px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-2.5 text-xs text-ink-2">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5 sm:mt-0" />
            <span>{t.mainnetBannerDesc}</span>
          </div>
          {onToggleNetwork && (
            <button
              type="button"
              onClick={() => onToggleNetwork('testnet')}
              className="ui-btn-sm ui-btn-primary shrink-0 self-start sm:self-auto"
            >
              {t.switchToTestnetBtn}
            </button>
          )}
        </div>
      )}

      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="ui-title">{t.heroTitle}</h1>
            <span className={isTestnet ? 'ui-badge-warn' : 'ui-badge-danger'}>
              {isTestnet ? 'Testnet' : isEs ? 'Sin Liquidez' : 'No Liquidity'}
            </span>
          </div>
          <p className="ui-subtitle">
            {isTestnet
              ? isEs
                ? 'Bloquea BCH en tu covenant personal P2SH32 y pide liquidez en PUSD o USDT.'
                : 'Lock BCH in your personal P2SH32 covenant and borrow PUSD or USDT.'
              : isEs
              ? 'Mercados en Mainnet sin liquidez activa. Cambia a Testnet para operar.'
              : 'Mainnet markets have no active liquidity. Switch to Testnet to operate.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-line text-xs text-ink-2 tabular-nums">
            <img src="/BCH.png" alt="BCH" className="w-4 h-4 rounded-full object-contain" />
            <span className="font-mono font-semibold text-ink">
              1 BCH = ${bchPrice.toFixed(2)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              fetchData();
              onRefreshBalances?.();
            }}
            className="ui-btn-sm ui-btn-secondary"
            title={isEs ? 'Actualizar datos en cadena' : 'Refresh on-chain data'}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{isEs ? 'Actualizar' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* LAST ON-CHAIN TX RECEIPT */}
      {lastTxResult && (
        <div className="mb-5 ui-panel px-4 py-2.5 flex items-center justify-between gap-3 text-xs border-emerald-500/30">
          <div className="flex items-center gap-2 min-w-0">
            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="font-semibold text-ink shrink-0">{lastTxResult.label}:</span>
            <span className="font-mono text-ink-2 truncate">{lastTxResult.txHash}</span>
          </div>
          <a
            href={lastTxResult.explorerUrl}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 shrink-0"
          >
            <span>Explorer</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {/* KPI SUMMARY STRIP */}
      <div className="ui-card p-4 sm:p-5 mb-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-4 gap-x-4 lg:gap-0 lg:divide-x divide-line">
          <div className="lg:pr-5">
            <div className="ui-label mb-1">{t.cardCollateralTitle}</div>
            <div className="ui-stat tabular-nums">
              {vault.collateralBch.toFixed(4)}{' '}
              <span className="text-xs font-normal text-ink-3">BCH</span>
            </div>
            <div className="text-xs text-ink-3 mt-1 tabular-nums">
              ${vault.collateralUsd.toFixed(2)} USD
            </div>
          </div>

          <div className="lg:px-5">
            <div className="ui-label mb-1">{t.cardDebtTitle}</div>
            <div
              className={`ui-stat tabular-nums ${
                vault.totalDebtUsd > 0 ? 'text-primary' : 'text-ink'
              }`}
            >
              ${vault.totalDebtUsd.toFixed(2)}{' '}
              <span className="text-xs font-normal text-ink-3">USD</span>
            </div>
            <div className="text-xs text-ink-3 mt-1 truncate tabular-nums">
              {vault.totalPusdDebt.toFixed(2)} PUSD · {(vault.totalUsdtDebt || 0).toFixed(2)} USDT
            </div>
          </div>

          <div className="lg:px-5">
            <div className="ui-label mb-1">{t.cardHealthTitle}</div>
            <div className="ui-stat flex items-center gap-2 tabular-nums">
              {vault.totalDebtUsd === 0 ? (
                <span className="text-emerald-600 dark:text-emerald-400">
                  {t.cardHealthInfinite}
                </span>
              ) : (
                <span
                  className={
                    vault.healthFactor >= 1.5
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : vault.healthFactor >= 1.15
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }
                >
                  {vault.healthFactor.toFixed(2)}
                </span>
              )}
              <span
                className={
                  vault.healthStatus === 'SAFE'
                    ? 'ui-badge-success'
                    : vault.healthStatus === 'MODERATE'
                    ? 'ui-badge-warn'
                    : 'ui-badge-danger'
                }
              >
                {vault.healthStatus === 'SAFE'
                  ? t.cardHealthSafe
                  : vault.healthStatus === 'MODERATE'
                  ? t.cardHealthModerate
                  : t.cardHealthAlert}
              </span>
            </div>
            <div className="text-xs text-ink-3 mt-1 tabular-nums">
              LTV {currentLtvPercent.toFixed(1)}% · {isEs ? 'Liq. 80%' : 'Liq. 80%'}
            </div>
          </div>

          <div className="lg:pl-5">
            <div className="ui-label mb-1">{t.cardAvailableTitle}</div>
            <div className="ui-stat tabular-nums">
              ${vault.availableBorrowUsd.toFixed(2)}{' '}
              <span className="text-xs font-normal text-ink-3">USD</span>
            </div>
            <div className="text-xs text-ink-3 mt-1">
              {t.cardCollateralLtv}
            </div>
          </div>
        </div>
      </div>

      {/* PRIMARY MODE NAVIGATION */}
      <div className="ui-segment grid grid-cols-3 w-full max-w-md mb-6">
        <button
          type="button"
          onClick={() => setActiveTab('vault')}
          className={`ui-segment-item whitespace-nowrap ${
            activeTab === 'vault' ? 'ui-segment-item-active' : ''
          }`}
        >
          {isEs ? 'Bóveda' : 'Vault'}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('supply')}
          className={`ui-segment-item whitespace-nowrap inline-flex items-center justify-center gap-1.5 ${
            activeTab === 'supply' ? 'ui-segment-item-active' : ''
          }`}
        >
          <span>{isEs ? 'Rendimiento' : 'Yield'}</span>
          <span className="hidden sm:inline text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
            6.4%
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('markets')}
          className={`ui-segment-item whitespace-nowrap ${
            activeTab === 'markets' ? 'ui-segment-item-active' : ''
          }`}
        >
          {isEs ? 'Mercados' : 'Markets'}
        </button>
      </div>

      {/* =================================================================== */}
      {/* TAB 1: VAULT WORKSPACE + SOLVENCY SIMULATOR                         */}
      {/* =================================================================== */}
      {activeTab === 'vault' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: INTERACTIVE VAULT CONSOLE */}
          <div className="lg:col-span-7 ui-card p-5 sm:p-6 space-y-5">
            <div className="ui-segment grid grid-cols-4 w-full">
              {(
                [
                  { id: 'deposit_collateral', label: isEs ? 'Depositar' : 'Deposit' },
                  { id: 'borrow', label: isEs ? 'Pedir' : 'Borrow' },
                  { id: 'repay', label: isEs ? 'Pagar' : 'Repay' },
                  { id: 'withdraw_collateral', label: isEs ? 'Retirar' : 'Withdraw' }
                ] as const
              ).map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setVaultSubTab(tab.id)}
                  className={`ui-segment-item whitespace-nowrap !px-1.5 sm:!px-3 text-[11px] sm:text-[13px] ${
                    vaultSubTab === tab.id ? 'ui-segment-item-active' : ''
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* SUBTAB 1: DEPOSIT COLLATERAL */}
            {vaultSubTab === 'deposit_collateral' && (
              <div className="space-y-4">
                <div>
                  <h2 className="ui-section-title">{t.depositTitle}</h2>
                  <p className="text-xs text-ink-muted mt-1 leading-relaxed">{t.depositDesc}</p>
                </div>

                <AmountInputPanel
                  label={
                    isEs
                      ? 'Monto de colateral tBCH'
                      : 'tBCH collateral amount'
                  }
                  rightMeta={
                    connectedBch
                      ? `${isEs ? 'Wallet:' : 'Wallet:'} ${(walletBalances.BCH || 0).toFixed(4)} tBCH`
                      : isEs
                      ? 'Modo simulación'
                      : 'Simulation mode'
                  }
                  tokenSymbol="tBCH"
                  tokenIcon="/BCH.png"
                  value={depositCollateralAmount}
                  onChange={setDepositCollateralAmount}
                  placeholder="0.25"
                  usdEquivalent={parsedDepositBch * bchPrice}
                  presets={
                    connectedBch && (walletBalances.BCH || 0) > 0.0005
                      ? [0.25, 0.5, 0.75, 1].map(pct => ({
                          label: pct === 1 ? 'MAX' : `${pct * 100}%`,
                          value: Math.max(0, (walletBalances.BCH || 0) - 0.0002) * pct
                        }))
                      : [
                          { label: '0.1', value: 0.1 },
                          { label: '0.5', value: 0.5 },
                          { label: '1.0', value: 1 }
                        ]
                  }
                  decimals={4}
                />

                <div className="ui-panel px-4 py-3 space-y-2 text-xs">
                  <div className="ui-row">
                    <span className="text-ink-muted">{t.newBorrowCapacity}</span>
                    <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      +${(parsedDepositBch * bchPrice * 0.65).toFixed(2)} USD
                    </span>
                  </div>
                  <div className="ui-row">
                    <span className="text-ink-muted">
                      {isEs ? 'Tipo de contrato' : 'Contract type'}
                    </span>
                    <span className="font-mono text-ink">P2SH32 CashScript</span>
                  </div>
                  {connectedBch && hasOneClickBchSign && (
                    <div className="ui-row">
                      <span className="text-ink-muted">
                        {isEs ? 'Método de firma' : 'Signing mode'}
                      </span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        {isEs ? 'Firma directa 1-clic lista' : '1-click signing ready'}
                      </span>
                    </div>
                  )}
                </div>

                {connectedBch && isTestnet && (
                  <VaultAddressDisclosure
                    title={t.personalVaultLabel}
                    address={collateralCovenant?.vaultAddress || ''}
                    explorerUrl={collateralCovenant?.explorerUrl}
                    explorerLabel="BinaryLiquidCollateralVault.cash"
                    qrDataUrl={collateralQr}
                    txIdValue={collateralTxId}
                    onTxIdChange={setCollateralTxId}
                    txIdLabel={t.optionalTxidLabel}
                    txIdPlaceholder={t.txidPlaceholder}
                    copyKey="colVault"
                    copiedKey={copiedKey}
                    onCopy={copyToClipboard}
                    copyLabel={t.copyBtn}
                    copiedLabel={t.copiedBtn}
                    defaultOpen={!hasOneClickBchSign}
                    isEs={isEs}
                  />
                )}

                <button
                  type="button"
                  onClick={missingVaultWallet ? onConnectWallet : handleVerifyCollateral}
                  disabled={!missingVaultWallet && (isSubmitting || !isTestnet)}
                  className="ui-btn-primary w-full py-3"
                >
                  {missingVaultWallet ? (
                    <>
                      <Wallet className="w-4 h-4" />
                      <span>{t.connectBchBtn}</span>
                    </>
                  ) : isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{statusMessage || t.btnVerifyingCollateral}</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>
                        {hasOneClickBchSign &&
                        !collateralTxId.trim() &&
                        parsedDepositBch > 0
                          ? isEs
                            ? `Bloquear ${depositCollateralAmount} tBCH en Covenant`
                            : `Lock ${depositCollateralAmount} tBCH in Covenant`
                          : t.btnVerifyCollateral}
                      </span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* SUBTAB 2: BORROW STABLECOINS */}
            {vaultSubTab === 'borrow' && (
              <div className="space-y-4">
                <div>
                  <h2 className="ui-section-title">{t.borrowTitle}</h2>
                  <p className="text-xs text-ink-muted mt-1 leading-relaxed">{t.borrowDesc}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <AssetSelectorPill
                    symbol="PUSD"
                    icon="/PUSD.png"
                    rateLabel="3.5% APR"
                    meta={
                      isTestnet
                        ? `${pusdAvailLiquidity.toLocaleString()} PUSD · BCH Chipnet`
                        : t.sinLiquidezBadge
                    }
                    selected={borrowToken === 'PUSD'}
                    onSelect={() => setBorrowToken('PUSD')}
                  />
                  <AssetSelectorPill
                    symbol="USDT"
                    icon="/USDT.png"
                    rateLabel="4.0% APR"
                    meta={
                      isTestnet
                        ? `${usdtAvailLiquidity.toLocaleString()} USDT · Polygon Amoy`
                        : t.sinLiquidezBadge
                    }
                    selected={borrowToken === 'USDT'}
                    onSelect={() => setBorrowToken('USDT')}
                  />
                </div>

                <div className="ui-panel px-4 py-2.5 flex items-center justify-between gap-2 text-xs">
                  <span className="text-ink-muted">
                    {isEs ? 'Wallet receptora' : 'Receiving wallet'} (
                    {borrowToken === 'PUSD' ? 'BCH Chipnet' : 'Polygon Amoy'})
                  </span>
                  {borrowToken === 'PUSD' ? (
                    connectedBch ? (
                      <span className="font-mono font-medium text-ink">
                        {formatAddress(connectedBch)}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={onConnectWallet}
                        className="text-primary font-medium hover:underline cursor-pointer"
                      >
                        {t.connectBchBtn}
                      </button>
                    )
                  ) : connectedEvm ? (
                    <span className="font-mono font-medium text-ink">
                      {formatAddress(connectedEvm)}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={onConnectWallet}
                      className="text-primary font-medium hover:underline cursor-pointer"
                    >
                      {t.connectEvmBtn}
                    </button>
                  )}
                </div>

                <AmountInputPanel
                  label={t.borrowAmountLabel}
                  rightMeta={`${t.availableLabel} $${vault.availableBorrowUsd.toFixed(2)}`}
                  tokenSymbol={borrowToken}
                  tokenIcon={borrowToken === 'PUSD' ? '/PUSD.png' : '/USDT.png'}
                  value={borrowAmount}
                  onChange={setBorrowAmount}
                  placeholder="0.00"
                  usdEquivalent={parsedBorrowUsd}
                  presets={
                    maxBorrowSelectable > 0
                      ? [0.25, 0.5, 0.75, 1].map(pct => ({
                          label: pct === 1 ? 'MAX' : `${pct * 100}%`,
                          value: maxBorrowSelectable * pct
                        }))
                      : [
                          { label: '25', value: 25 },
                          { label: '50', value: 50 },
                          { label: '100', value: 100 }
                        ]
                  }
                  decimals={2}
                />

                <div className="ui-panel px-4 py-3 space-y-2 text-xs">
                  <div className="ui-row">
                    <span className="text-ink-muted">{t.poolLiquidityLabel}</span>
                    <span className="font-mono font-semibold text-ink tabular-nums">
                      {activeBorrowLiquidity.toLocaleString()} {borrowToken}
                    </span>
                  </div>
                  <div className="ui-row">
                    <span className="text-ink-muted">{t.borrowRate}</span>
                    <span className="font-mono text-ink">
                      {borrowToken === 'PUSD' ? t.borrowRatePusd : t.borrowRateUsdt}
                    </span>
                  </div>
                  <div className="ui-row">
                    <span className="text-ink-muted">{t.originationFeeLabel}</span>
                    <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
                      {t.originationFeeFree}
                    </span>
                  </div>
                  {parsedBorrowUsd > 0 && vault.collateralUsd > 0 && (
                    <div className="ui-row pt-1 border-t border-line">
                      <span className="text-ink-muted">{t.healthImpactLabel}</span>
                      <span
                        className={`font-mono font-semibold tabular-nums ${
                          projectedHealthFactor >= 1.5
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : projectedHealthFactor >= 1.15
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {projectedHealthFactor.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={missingVaultWallet ? onConnectWallet : handleBorrow}
                  disabled={
                    !missingVaultWallet &&
                    (isSubmitting ||
                      !isTestnet ||
                      !borrowAmount ||
                      parseFloat(borrowAmount) <= 0 ||
                      parseFloat(borrowAmount) > vault.availableBorrowUsd + 0.01)
                  }
                  className="ui-btn-primary w-full py-3"
                >
                  {missingVaultWallet ? (
                    <>
                      <Wallet className="w-4 h-4" />
                      <span>{connectLabelFor(isBorrowEvmMissing)}</span>
                    </>
                  ) : isSubmitting ? (
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

            {/* SUBTAB 3: REPAY DEBT */}
            {vaultSubTab === 'repay' && (
              <div className="space-y-4">
                <div>
                  <h2 className="ui-section-title">{t.repayTitle}</h2>
                  <p className="text-xs text-ink-muted mt-1 leading-relaxed">{t.repayDesc}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <AssetSelectorPill
                    symbol="PUSD"
                    icon="/PUSD.png"
                    rateLabel={`${vault.totalPusdDebt.toFixed(2)} ${isEs ? 'deuda' : 'debt'}`}
                    meta={`${(walletBalances.PUSD || 0).toFixed(2)} PUSD ${isEs ? 'en wallet' : 'in wallet'}`}
                    selected={repayToken === 'PUSD'}
                    onSelect={() => setRepayToken('PUSD')}
                  />
                  <AssetSelectorPill
                    symbol="USDT"
                    icon="/USDT.png"
                    rateLabel={`${(vault.totalUsdtDebt || 0).toFixed(2)} ${isEs ? 'deuda' : 'debt'}`}
                    meta={`${(walletBalances.USDT || 0).toFixed(2)} USDT ${isEs ? 'en wallet' : 'in wallet'}`}
                    selected={repayToken === 'USDT'}
                    onSelect={() => setRepayToken('USDT')}
                  />
                </div>

                <AmountInputPanel
                  label={t.repayAmountLabel}
                  rightMeta={`${t.pendingDebtLabel} ${selectedRepayDebt.toFixed(4)} ${repayToken}`}
                  tokenSymbol={repayToken}
                  tokenIcon={repayToken === 'PUSD' ? '/PUSD.png' : '/USDT.png'}
                  value={repayAmount}
                  onChange={setRepayAmount}
                  placeholder="0.00"
                  usdEquivalent={parsedRepayUsd}
                  presets={
                    selectedRepayDebt > 0
                      ? [
                          { label: '25%', value: selectedRepayDebt * 0.25 },
                          { label: '50%', value: selectedRepayDebt * 0.5 },
                          { label: t.payAllBtn, value: selectedRepayDebt }
                        ]
                      : undefined
                  }
                  decimals={4}
                />

                {isTestnet && (
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => handleClaimTestnetFaucet(repayToken)}
                      disabled={faucetClaiming}
                      className="text-xs font-medium text-primary hover:underline cursor-pointer disabled:opacity-50"
                    >
                      {faucetClaiming
                        ? isEs
                          ? `Enviando ${repayToken} de prueba...`
                          : `Sending test ${repayToken}...`
                        : isEs
                        ? `¿Necesitas ${repayToken} de prueba? Reclamar ${repayToken === 'USDT' ? '100 USDT' : '25 PUSD'} del Faucet`
                        : `Need test ${repayToken}? Claim ${repayToken === 'USDT' ? '100 USDT' : '25 PUSD'} from Faucet`}
                    </button>
                  </div>
                )}

                {repayToken === 'PUSD' && isTestnet && (
                  <VaultAddressDisclosure
                    key={`repay-${Boolean(connectedBch)}-${hasOneClickBchSign}`}
                    title={
                      isEs
                        ? 'Pago manual / TXID (BinaryLiquidVault.cash)'
                        : 'Manual transfer / TXID (BinaryLiquidVault.cash)'
                    }
                    address={pusdVaultAddress}
                    qrDataUrl={pusdVaultQr}
                    txIdValue={repayPusdTxId}
                    onTxIdChange={setRepayPusdTxId}
                    txIdLabel={t.pusdSendStep}
                    txIdPlaceholder={t.txidPlaceholder}
                    copyKey="repayPusdVault"
                    copiedKey={copiedKey}
                    onCopy={copyToClipboard}
                    copyLabel={t.copyBtn}
                    copiedLabel={t.copiedBtn}
                    defaultOpen={Boolean(connectedBch && !hasOneClickBchSign)}
                    isEs={isEs}
                  />
                )}

                <button
                  type="button"
                  onClick={missingVaultWallet ? onConnectWallet : handleRepay}
                  disabled={
                    !missingVaultWallet && (isSubmitting || !isTestnet || !repayAmount)
                  }
                  className="ui-btn-primary w-full py-3"
                >
                  {missingVaultWallet ? (
                    <>
                      <Wallet className="w-4 h-4" />
                      <span>{connectLabelFor(isRepayEvmMissing)}</span>
                    </>
                  ) : isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{statusMessage || t.btnRepaying}</span>
                    </>
                  ) : (
                    <>
                      <ArrowUpRight className="w-4 h-4" />
                      <span>
                        {repayToken === 'USDT'
                          ? t.btnRepayUsdt
                          : hasOneClickBchSign && !repayPusdTxId.trim()
                          ? isEs
                            ? `Pagar ${repayAmount || '0'} PUSD y verificar`
                            : `Repay ${repayAmount || '0'} PUSD & Verify`
                          : t.btnRepayPusd}
                      </span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* SUBTAB 4: WITHDRAW COLLATERAL */}
            {vaultSubTab === 'withdraw_collateral' && (
              <div className="space-y-4">
                <div>
                  <h2 className="ui-section-title">{t.withdrawTitle}</h2>
                  <p className="text-xs text-ink-muted mt-1 leading-relaxed">{t.withdrawDesc}</p>
                </div>

                <AmountInputPanel
                  label={t.withdrawAmountLabel}
                  rightMeta={`${t.safeWithdrawableLabel} ${vault.withdrawableBch.toFixed(6)} BCH`}
                  tokenSymbol="BCH"
                  tokenIcon="/BCH.png"
                  value={withdrawCollateralAmount}
                  onChange={setWithdrawCollateralAmount}
                  placeholder="0.0000"
                  usdEquivalent={parsedWithdrawBch * bchPrice}
                  presets={
                    vault.withdrawableBch > 0
                      ? [0.25, 0.5, 1].map(pct => ({
                          label: pct === 1 ? 'MAX' : `${pct * 100}%`,
                          value: vault.withdrawableBch * pct
                        }))
                      : undefined
                  }
                  decimals={6}
                />

                <button
                  type="button"
                  onClick={missingVaultWallet ? onConnectWallet : handleWithdrawCollateral}
                  disabled={
                    !missingVaultWallet &&
                    (isSubmitting ||
                      !isTestnet ||
                      !withdrawCollateralAmount ||
                      parseFloat(withdrawCollateralAmount) <= 0 ||
                      parseFloat(withdrawCollateralAmount) > vault.withdrawableBch + 0.000001)
                  }
                  className="ui-btn-primary w-full py-3"
                >
                  {missingVaultWallet ? (
                    <>
                      <Wallet className="w-4 h-4" />
                      <span>{t.connectBchBtn}</span>
                    </>
                  ) : isSubmitting ? (
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

          {/* RIGHT: SOLVENCY SIMULATOR + RECENT ACTIVITY + ARCHITECTURE */}
          <div className="lg:col-span-5 space-y-5">
            <LtvSolvencySimulator
              isEs={isEs}
              hasSimulation={hasVaultSimulation}
              currentCollateralUsd={vault.collateralUsd}
              projectedCollateralUsd={projectedCollateralUsd}
              currentDebtUsd={vault.totalDebtUsd}
              projectedDebtUsd={projectedDebtUsd}
              currentAvailableUsd={vault.availableBorrowUsd}
              projectedAvailableUsd={projectedAvailableUsd}
              currentLtvPercent={currentLtvPercent}
              projectedLtvPercent={projectedLtvPercent}
              currentHealth={vault.healthFactor}
              projectedHealth={projectedHealthFactor}
              simError={simError}
            />

            {/* RECENT ON-CHAIN VAULT ACTIVITY */}
            <div className="ui-card p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="ui-section-title">{t.recentTxTitle}</h3>
                <Activity className="w-4 h-4 text-ink-3" />
              </div>

              {recentTransactions.length === 0 ? (
                <p className="text-xs text-ink-muted">{t.noRecentTx}</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {recentTransactions.map((tx: any) => (
                    <div
                      key={tx.id}
                      className="ui-panel px-3 py-2.5 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <span className="font-medium text-ink block truncate tabular-nums">
                          {tx.action.replace('_', ' ')} · {tx.amount} {tx.token}
                        </span>
                        <span className="font-mono text-[11px] text-ink-3">
                          {tx.txHash?.slice(0, 10)}...{tx.txHash?.slice(-6)}
                        </span>
                      </div>
                      {tx.explorerUrl && (
                        <a
                          href={tx.explorerUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 font-medium shrink-0"
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

            {/* COLLAPSIBLE CASHSCRIPT ARCHITECTURE SUMMARY */}
            <ArchitectureDisclosure
              title={t.howItWorksTitle}
              items={[
                { title: t.step1Title, desc: t.step1Desc },
                { title: t.step2Title, desc: t.step2Desc },
                { title: t.step3Title, desc: t.step3Desc }
              ]}
            />
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: YIELD (ON-CHAIN SUPPLY & LIVE APY FORECAST)                  */}
      {/* =================================================================== */}
      {activeTab === 'supply' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 ui-card p-5 sm:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="ui-section-title">{t.supplyTitle}</h2>
                <p className="text-xs text-ink-muted mt-1">{t.supplyDesc}</p>
              </div>
              <div className="ui-segment grid grid-cols-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setSupplyMode('deposit')}
                  className={`ui-segment-item whitespace-nowrap text-xs ${
                    supplyMode === 'deposit' ? 'ui-segment-item-active' : ''
                  }`}
                >
                  {isEs ? 'Depositar' : 'Deposit'}
                </button>
                <button
                  type="button"
                  onClick={() => setSupplyMode('withdraw')}
                  className={`ui-segment-item whitespace-nowrap text-xs ${
                    supplyMode === 'withdraw' ? 'ui-segment-item-active' : ''
                  }`}
                >
                  {isEs ? 'Retirar' : 'Withdraw'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <AssetSelectorPill
                symbol="PUSD"
                icon="/PUSD.png"
                rateLabel={isTestnet ? '5.8% APY' : '0%'}
                meta={`${t.suppliedLabel} ${supply.suppliedPusd.toFixed(2)} PUSD`}
                selected={supplyToken === 'PUSD'}
                onSelect={() => setSupplyToken('PUSD')}
              />
              <AssetSelectorPill
                symbol="USDT"
                icon="/USDT.png"
                rateLabel={isTestnet ? '6.4% APY' : '0%'}
                meta={`${t.suppliedLabel} ${(supply.suppliedUsdt || 0).toFixed(2)} USDT`}
                selected={supplyToken === 'USDT'}
                onSelect={() => setSupplyToken('USDT')}
              />
            </div>

            {supplyMode === 'deposit' ? (
              <div className="space-y-4">
                <AmountInputPanel
                  label={t.supplyAmountLabel}
                  rightMeta={`${isEs ? 'En tu Wallet:' : 'In Wallet:'} ${(walletBalances[supplyToken] || 0).toFixed(2)} ${supplyToken}`}
                  tokenSymbol={supplyToken}
                  tokenIcon={supplyToken === 'PUSD' ? '/PUSD.png' : '/USDT.png'}
                  value={supplyAmount}
                  onChange={setSupplyAmount}
                  placeholder="0.00"
                  usdEquivalent={parsedSupplyInput}
                  presets={
                    (walletBalances[supplyToken] || 0) > 0
                      ? [0.25, 0.5, 1].map(pct => ({
                          label: pct === 1 ? 'MAX' : `${pct * 100}%`,
                          value: (walletBalances[supplyToken] || 0) * pct
                        }))
                      : [
                          { label: '50', value: 50 },
                          { label: '250', value: 250 },
                          { label: '1,000', value: 1000 }
                        ]
                  }
                  decimals={2}
                />

                {isTestnet && (
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => handleClaimTestnetFaucet(supplyToken)}
                      disabled={faucetClaiming}
                      className="text-xs font-medium text-primary hover:underline cursor-pointer disabled:opacity-50"
                    >
                      {faucetClaiming
                        ? isEs
                          ? `Enviando ${supplyToken} de prueba...`
                          : `Sending test ${supplyToken}...`
                        : isEs
                        ? `¿Necesitas ${supplyToken}? Reclamar ${supplyToken === 'USDT' ? '100 USDT' : '25 PUSD'} del Faucet`
                        : `Need ${supplyToken}? Claim ${supplyToken === 'USDT' ? '100 USDT' : '25 PUSD'} from Faucet`}
                    </button>
                  </div>
                )}

                {supplyToken === 'PUSD' && isTestnet && (
                  <VaultAddressDisclosure
                    key={`supply-${Boolean(connectedBch)}-${hasOneClickBchSign}`}
                    title={
                      isEs
                        ? 'Depósito manual PUSD / TXID (BinaryLiquidVault.cash)'
                        : 'Manual PUSD transfer / TXID (BinaryLiquidVault.cash)'
                    }
                    address={pusdVaultAddress}
                    qrDataUrl={pusdVaultQr}
                    txIdValue={supplyPusdTxId}
                    onTxIdChange={setSupplyPusdTxId}
                    txIdLabel={t.pusdSendStep}
                    txIdPlaceholder={t.txidPlaceholder}
                    copyKey="supplyPusdVault"
                    copiedKey={copiedKey}
                    onCopy={copyToClipboard}
                    copyLabel={t.copyBtn}
                    copiedLabel={t.copiedBtn}
                    defaultOpen={Boolean(connectedBch && !hasOneClickBchSign)}
                    isEs={isEs}
                  />
                )}

                <button
                  type="button"
                  onClick={missingSupplyWallet ? onConnectWallet : handleSupply}
                  disabled={
                    !missingSupplyWallet && (isSubmitting || !isTestnet || !supplyAmount)
                  }
                  className="ui-btn-primary w-full py-3"
                >
                  {missingSupplyWallet ? (
                    <>
                      <Wallet className="w-4 h-4" />
                      <span>{connectLabelFor(isSupplyEvmMissing)}</span>
                    </>
                  ) : isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{statusMessage || (isEs ? 'Procesando...' : 'Processing...')}</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>
                        {supplyToken === 'USDT'
                          ? t.btnSupplyUsdt
                          : hasOneClickBchSign && !supplyPusdTxId.trim()
                          ? isEs
                            ? `Depositar ${supplyAmount || '0'} PUSD (5.8% APY)`
                            : `Supply ${supplyAmount || '0'} PUSD (5.8% APY)`
                          : t.btnSupplyPusd}
                      </span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <AmountInputPanel
                  label={t.withdrawSupplyAmountLabel}
                  rightMeta={`${t.withdrawableSupplyLabel} ${(maxWithdrawableSelectedSupply || 0).toFixed(4)} ${supplyToken}`}
                  tokenSymbol={supplyToken}
                  tokenIcon={supplyToken === 'PUSD' ? '/PUSD.png' : '/USDT.png'}
                  value={withdrawSupplyAmount}
                  onChange={setWithdrawSupplyAmount}
                  placeholder="0.00"
                  usdEquivalent={Math.max(0, parseFloat(withdrawSupplyAmount) || 0)}
                  presets={
                    (maxWithdrawableSelectedSupply || 0) > 0
                      ? [0.25, 0.5, 1].map(pct => ({
                          label: pct === 1 ? 'MAX' : `${pct * 100}%`,
                          value: (maxWithdrawableSelectedSupply || 0) * pct
                        }))
                      : undefined
                  }
                  decimals={4}
                />

                <button
                  type="button"
                  onClick={missingSupplyWallet ? onConnectWallet : handleWithdrawSupply}
                  disabled={
                    !missingSupplyWallet &&
                    (isSubmitting ||
                      !isTestnet ||
                      !withdrawSupplyAmount ||
                      parseFloat(withdrawSupplyAmount) <= 0 ||
                      parseFloat(withdrawSupplyAmount) > (maxWithdrawableSelectedSupply || 0) + 0.0001)
                  }
                  className="ui-btn-primary w-full py-3"
                >
                  {missingSupplyWallet ? (
                    <>
                      <Wallet className="w-4 h-4" />
                      <span>{connectLabelFor(isSupplyEvmMissing)}</span>
                    </>
                  ) : isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{statusMessage || (isEs ? 'Liberando fondos...' : 'Withdrawing...')}</span>
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
              </div>
            )}
          </div>

          {/* RIGHT: ACCRUED YIELD + APY FORECAST */}
          <div className="lg:col-span-5 space-y-5">
            <div className="ui-card p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="ui-section-title">{t.myYieldTitle}</h3>
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>

              <div className="ui-panel p-4 text-center space-y-1">
                <span className="ui-label block">{t.yieldEarnedLabel}</span>
                <span className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums block">
                  +${((supply.yieldEarnedPusd || 0) + (supply.yieldEarnedUsdt || 0)).toFixed(6)} USD
                </span>
                <span className="text-xs text-ink-muted block">{t.yieldEarnedSub}</span>
              </div>

              <div className="ui-panel px-4 py-3 space-y-2 text-xs">
                <div className="ui-row">
                  <span className="text-ink-muted">{t.pusdSuppliedLabel}</span>
                  <span className="font-mono font-medium text-ink tabular-nums">
                    {supply.suppliedPusd.toFixed(4)} PUSD
                  </span>
                </div>
                <div className="ui-row">
                  <span className="text-ink-muted">{t.usdtSuppliedLabel}</span>
                  <span className="font-mono font-medium text-ink tabular-nums">
                    {(supply.suppliedUsdt || 0).toFixed(4)} USDT
                  </span>
                </div>
              </div>

              {(currentTotalSupplied > 0 || simulatedSupplyDelta > 0) && (
                <div className="ui-panel px-4 py-3 space-y-2 text-xs border-emerald-500/25">
                  <div className="ui-row">
                    <span className="text-ink-muted">
                      {isEs ? 'Proyección mensual' : 'Projected monthly'}
                    </span>
                    <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      +${estMonthlyYieldUsd.toFixed(2)} USD
                    </span>
                  </div>
                  <div className="ui-row">
                    <span className="text-ink-muted">
                      {isEs
                        ? `Proyección anual (${supplyToken === 'USDT' ? '6.4%' : '5.8%'} APY)`
                        : `Projected annual (${supplyToken === 'USDT' ? '6.4%' : '5.8%'} APY)`}
                    </span>
                    <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      +${estAnnualYieldUsd.toFixed(2)} USD
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: INSTITUTIONAL MARKETS TABLE                                  */}
      {/* =================================================================== */}
      {activeTab === 'markets' && (
        <MarketsTable
          isEs={isEs}
          isTestnet={isTestnet}
          bchPrice={bchPrice}
          markets={markets}
          pusdAvailLiquidity={pusdAvailLiquidity}
          usdtAvailLiquidity={usdtAvailLiquidity}
          t={t}
          onDepositBch={() => {
            setVaultSubTab('deposit_collateral');
            setActiveTab('vault');
          }}
          onBorrow={jumpToBorrow}
          onSupply={jumpToSupply}
        />
      )}
    </div>
  );
}

// =============================================================================
// MODULAR SUBCOMPONENTS (STRICT DESIGN.MD TOKENS & ACCESSIBILITY)
// =============================================================================

function AssetSelectorPill({
  symbol,
  icon,
  rateLabel,
  meta,
  selected,
  onSelect
}: {
  symbol: string;
  icon: string;
  rateLabel: string;
  meta: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`p-3.5 rounded-panel border text-left transition-colors cursor-pointer ${
        selected
          ? 'bg-surface border-primary'
          : 'bg-surface-2 border-line hover:border-line-strong'
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <img src={icon} alt={symbol} className="w-5 h-5 rounded-full object-contain" />
          <span className="font-semibold text-sm text-ink">{symbol}</span>
        </div>
        <span className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
          {rateLabel}
        </span>
      </div>
      <span className="text-xs text-ink-3 block truncate tabular-nums">{meta}</span>
    </button>
  );
}

function AmountInputPanel({
  label,
  rightMeta,
  tokenSymbol,
  tokenIcon,
  value,
  onChange,
  placeholder,
  usdEquivalent,
  presets,
  decimals
}: {
  label: string;
  rightMeta: string;
  tokenSymbol: string;
  tokenIcon: string;
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  usdEquivalent: number;
  presets?: Array<{ label: string; value: number }>;
  decimals: number;
}) {
  return (
    <div className="ui-panel p-4 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="ui-label">{label}</span>
        <span className="text-ink-3 font-mono tabular-nums">{rightMeta}</span>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="number"
          step="any"
          min="0"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full min-w-0 bg-transparent text-2xl sm:text-3xl font-semibold font-mono tabular-nums text-ink outline-none placeholder:text-ink-3"
        />
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface border border-line shrink-0">
          <img src={tokenIcon} alt={tokenSymbol} className="w-4 h-4 rounded-full object-contain" />
          <span className="font-semibold text-xs text-ink">{tokenSymbol}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <span className="text-xs text-ink-3 font-mono tabular-nums">
          ≈ ${usdEquivalent.toFixed(2)} USD
        </span>
        {presets && presets.length > 0 && (
          <div className="flex items-center gap-1.5">
            {presets.map(preset => (
              <button
                key={preset.label}
                type="button"
                onClick={() => onChange(preset.value.toFixed(decimals))}
                className="px-2.5 py-1 rounded-full bg-surface border border-line hover:border-line-strong text-[11px] font-medium text-ink-2 hover:text-ink transition-colors cursor-pointer tabular-nums"
              >
                {preset.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function VaultAddressDisclosure({
  title,
  address,
  explorerUrl,
  explorerLabel,
  qrDataUrl,
  txIdValue,
  onTxIdChange,
  txIdLabel,
  txIdPlaceholder,
  copyKey,
  copiedKey,
  onCopy,
  copyLabel,
  copiedLabel,
  defaultOpen,
  isEs
}: {
  title: string;
  address: string;
  explorerUrl?: string;
  explorerLabel?: string;
  qrDataUrl: string;
  txIdValue: string;
  onTxIdChange: (v: string) => void;
  txIdLabel: string;
  txIdPlaceholder: string;
  copyKey: string;
  copiedKey: string;
  onCopy: (val: string, key: string) => void;
  copyLabel: string;
  copiedLabel: string;
  defaultOpen: boolean;
  isEs: boolean;
}) {
  const [open, setOpen] = useState<boolean>(defaultOpen);
  const [showQr, setShowQr] = useState<boolean>(false);

  return (
    <div className="ui-panel overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full px-4 py-3 flex items-center justify-between gap-2 text-xs text-left cursor-pointer hover:bg-surface/60 transition-colors"
      >
        <span className="font-medium text-ink truncate">{title}</span>
        <span className="text-ink-3 shrink-0 font-medium">
          {open ? (isEs ? 'Ocultar' : 'Hide') : isEs ? 'Ver QR / TXID' : 'QR / TXID'}
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-2 border-t border-line space-y-3 text-xs">
          {explorerUrl && explorerLabel && (
            <div className="flex items-center justify-end">
              <a
                href={explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 font-medium"
              >
                <span>{explorerLabel}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {address ? (
            <>
              <div className="flex items-center justify-between gap-2 bg-surface px-3 py-2 rounded-control border border-line">
                <span className="font-mono text-[11px] text-ink truncate">{address}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {qrDataUrl && (
                    <button
                      type="button"
                      onClick={() => setShowQr(v => !v)}
                      className="ui-btn-sm ui-btn-secondary py-1 px-2 text-[11px]"
                    >
                      {showQr ? (isEs ? 'Ocultar QR' : 'Hide QR') : 'QR'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onCopy(address, copyKey)}
                    className="ui-btn-sm ui-btn-secondary py-1 px-2.5 text-[11px]"
                  >
                    {copiedKey === copyKey ? (
                      <Check className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>{copiedKey === copyKey ? copiedLabel : copyLabel}</span>
                  </button>
                </div>
              </div>

              {showQr && qrDataUrl && (
                <div className="w-28 h-28 mx-auto bg-white p-2 rounded-panel border border-line">
                  <img
                    src={qrDataUrl}
                    alt={title}
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
            </>
          ) : (
            <p className="text-ink-3 text-center py-1">
              {isEs ? 'Generando dirección del contrato...' : 'Preparing contract address...'}
            </p>
          )}

          <div className="space-y-1.5">
            <label className="text-[11px] text-ink-muted block">{txIdLabel}</label>
            <input
              type="text"
              value={txIdValue}
              onChange={e => onTxIdChange(e.target.value)}
              placeholder={txIdPlaceholder}
              className="ui-input py-2 px-3 text-xs font-mono"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function LtvSolvencySimulator({
  isEs,
  hasSimulation,
  currentCollateralUsd,
  projectedCollateralUsd,
  currentDebtUsd,
  projectedDebtUsd,
  currentAvailableUsd,
  projectedAvailableUsd,
  currentLtvPercent,
  projectedLtvPercent,
  currentHealth,
  projectedHealth,
  simError
}: {
  isEs: boolean;
  hasSimulation: boolean;
  currentCollateralUsd: number;
  projectedCollateralUsd: number;
  currentDebtUsd: number;
  projectedDebtUsd: number;
  currentAvailableUsd: number;
  projectedAvailableUsd: number;
  currentLtvPercent: number;
  projectedLtvPercent: number;
  currentHealth: number;
  projectedHealth: number;
  simError: string;
}) {
  const activeLtv = hasSimulation ? projectedLtvPercent : currentLtvPercent;
  const barWidth = Math.min(100, Math.max(0, activeLtv));
  const barColor =
    activeLtv >= 75
      ? 'bg-rose-500'
      : activeLtv >= 60
      ? 'bg-amber-500'
      : 'bg-primary';

  const formatHealth = (h: number, debt: number) =>
    debt <= 0 ? '∞' : h.toFixed(2);

  return (
    <div className="ui-card p-5 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <h3 className="ui-section-title">
            {isEs ? 'Solvencia y Simulador LTV' : 'Solvency & LTV Simulator'}
          </h3>
        </div>
        {hasSimulation && (
          <span className="ui-badge-warn">
            {isEs ? 'Vista previa' : 'Preview'}
          </span>
        )}
      </div>

      {/* LTV GAUGE WITH 65% BORROW LIMIT & 80% LIQUIDATION THRESHOLD */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between text-xs">
          <span className="ui-label">Loan-to-Value (LTV)</span>
          <div className="font-mono font-semibold text-ink tabular-nums flex items-center gap-1.5">
            <span>{currentLtvPercent.toFixed(1)}%</span>
            {hasSimulation && Math.abs(projectedLtvPercent - currentLtvPercent) > 0.05 && (
              <>
                <span className="text-ink-3">→</span>
                <span
                  className={
                    projectedLtvPercent > currentLtvPercent
                      ? projectedLtvPercent >= 65
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-primary'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }
                >
                  {projectedLtvPercent.toFixed(1)}%
                </span>
              </>
            )}
          </div>
        </div>

        <div className="relative h-2.5 w-full rounded-full bg-surface-2 border border-line overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${barColor}`}
            style={{ width: `${barWidth}%` }}
          />
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-ink/40"
            style={{ left: '65%' }}
            title="Max Borrow LTV: 65%"
          />
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-rose-500/80"
            style={{ left: '80%' }}
            title="Liquidation Threshold: 80%"
          />
        </div>

        <div className="relative flex justify-between text-[11px] text-ink-3 font-mono tabular-nums">
          <span>0%</span>
          <span>65% {isEs ? 'Límite' : 'Max'}</span>
          <span className="text-rose-600 dark:text-rose-400">80% Liq.</span>
        </div>
      </div>

      {/* SIMULATED POSITION TABLE */}
      <div className="ui-panel px-4 py-3 space-y-2.5 text-xs">
        <SimRow
          label={isEs ? 'Colateral' : 'Collateral'}
          current={`$${currentCollateralUsd.toFixed(2)}`}
          projected={
            hasSimulation && Math.abs(projectedCollateralUsd - currentCollateralUsd) > 0.01
              ? `$${projectedCollateralUsd.toFixed(2)}`
              : undefined
          }
          positive={projectedCollateralUsd >= currentCollateralUsd}
        />
        <SimRow
          label={isEs ? 'Deuda total' : 'Total debt'}
          current={`$${currentDebtUsd.toFixed(2)}`}
          projected={
            hasSimulation && Math.abs(projectedDebtUsd - currentDebtUsd) > 0.01
              ? `$${projectedDebtUsd.toFixed(2)}`
              : undefined
          }
          positive={projectedDebtUsd <= currentDebtUsd}
        />
        <SimRow
          label={isEs ? 'Disponible (65% LTV)' : 'Borrow limit (65%)'}
          current={`$${currentAvailableUsd.toFixed(2)}`}
          projected={
            hasSimulation && Math.abs(projectedAvailableUsd - currentAvailableUsd) > 0.01
              ? `$${projectedAvailableUsd.toFixed(2)}`
              : undefined
          }
          positive={projectedAvailableUsd >= currentAvailableUsd}
        />
        <SimRow
          label={isEs ? 'Ratio de salud' : 'Health factor'}
          current={formatHealth(currentHealth, currentDebtUsd)}
          projected={
            hasSimulation &&
            (Math.abs(projectedHealth - currentHealth) > 0.01 ||
              (currentDebtUsd === 0 && projectedDebtUsd > 0) ||
              (currentDebtUsd > 0 && projectedDebtUsd === 0))
              ? formatHealth(projectedHealth, projectedDebtUsd)
              : undefined
          }
          positive={projectedHealth >= currentHealth}
        />
      </div>

      {simError && (
        <div className="flex items-start gap-2 text-xs text-rose-600 dark:text-rose-400 px-1">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{simError}</span>
        </div>
      )}
    </div>
  );
}

function SimRow({
  label,
  current,
  projected,
  positive
}: {
  label: string;
  current: string;
  projected?: string;
  positive: boolean;
}) {
  return (
    <div className="ui-row">
      <span className="text-ink-muted">{label}</span>
      <span className="font-mono font-medium text-ink tabular-nums flex items-center gap-1.5">
        <span>{current}</span>
        {projected && (
          <>
            <span className="text-ink-3">→</span>
            <span
              className={
                positive
                  ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                  : 'text-primary font-semibold'
              }
            >
              {projected}
            </span>
          </>
        )}
      </span>
    </div>
  );
}

function ArchitectureDisclosure({
  title,
  items
}: {
  title: string;
  items: Array<{ title: string; desc: string }>;
}) {
  const [open, setOpen] = useState<boolean>(false);

  return (
    <div className="ui-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full px-5 py-4 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-surface-2/50 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-sm text-ink truncate">{title}</span>
          <span className="ui-badge-success shrink-0">P2SH32</span>
        </div>
        <span className="text-xs text-ink-3 shrink-0">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className="px-5 pb-5 pt-2 border-t border-line space-y-2.5 text-xs">
          {items.map(item => (
            <div key={item.title} className="ui-panel p-3 space-y-0.5">
              <span className="font-semibold text-ink block">{item.title}</span>
              <span className="text-ink-muted leading-relaxed block">{item.desc}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MarketsTable({
  isEs,
  isTestnet,
  bchPrice,
  markets,
  pusdAvailLiquidity,
  usdtAvailLiquidity,
  t,
  onDepositBch,
  onBorrow,
  onSupply
}: {
  isEs: boolean;
  isTestnet: boolean;
  bchPrice: number;
  markets: any;
  pusdAvailLiquidity: number;
  usdtAvailLiquidity: number;
  t: any;
  onDepositBch: () => void;
  onBorrow: (token: 'PUSD' | 'USDT') => void;
  onSupply: (token: 'PUSD' | 'USDT') => void;
}) {
  const rows = [
    {
      symbol: 'BCH',
      name: 'Bitcoin Cash',
      icon: '/BCH.png',
      contract: 'BinaryLiquidCollateralVault.cash',
      network: markets?.BCH_COLLATERAL?.network || (isTestnet ? 'Chipnet' : 'Mainnet'),
      borrowApr: '—',
      supplyApy: '—',
      liquidity: isTestnet
        ? `$${bchPrice.toFixed(2)} · 65% LTV`
        : t.sinLiquidezBadge,
      active: isTestnet,
      type: 'collateral' as const
    },
    {
      symbol: 'PUSD' as const,
      name: 'ParyonUSD',
      icon: '/PUSD.png',
      contract: 'BinaryLiquidVault.cash',
      network: markets?.PUSD_BORROW?.network || 'BCH CashTokens',
      borrowApr: '3.5% APR',
      supplyApy: '5.8% APY',
      liquidity: isTestnet
        ? `${pusdAvailLiquidity.toLocaleString()} PUSD`
        : t.sinLiquidezBadge,
      active: Boolean(markets?.PUSD_BORROW?.hasLiquidity),
      type: 'stable' as const
    },
    {
      symbol: 'USDT' as const,
      name: 'Tether USD',
      icon: '/USDT.png',
      contract: 'BinaryLiquidVault.sol',
      network: markets?.USDT_BORROW?.network || 'Polygon Amoy',
      borrowApr: '4.0% APR',
      supplyApy: '6.4% APY',
      liquidity: isTestnet
        ? `${usdtAvailLiquidity.toLocaleString()} USDT`
        : t.sinLiquidezBadge,
      active: Boolean(markets?.USDT_BORROW?.hasLiquidity),
      type: 'stable' as const
    },
    {
      symbol: 'USDC',
      name: 'USD Coin',
      icon: '/USDC.png',
      contract: 'Settlement Pending',
      network: 'Polygon',
      borrowApr: '4.2% APR',
      supplyApy: '6.0% APY',
      liquidity: t.sinLiquidezBadge,
      active: false,
      type: 'disabled' as const
    }
  ];

  return (
    <div className="ui-card overflow-hidden">
      <div className="p-5 sm:p-6 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="ui-section-title">{t.marketsTitle}</h2>
          <p className="text-xs text-ink-muted mt-1">{t.marketsDesc}</p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-2 border border-line text-xs tabular-nums shrink-0 self-start sm:self-auto">
          <span className="text-ink-3">{t.oracleSource}</span>
          <span className="font-mono font-semibold text-ink">
            ${bchPrice.toFixed(2)}
          </span>
        </div>
      </div>

      {/* DESKTOP TABLE */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-line text-xs text-ink-muted bg-surface-2/40">
              <th className="py-3 px-6 font-medium">{isEs ? 'Activo' : 'Asset'}</th>
              <th className="py-3 px-4 font-medium">{isEs ? 'Préstamo APR' : 'Borrow APR'}</th>
              <th className="py-3 px-4 font-medium">{isEs ? 'Rendimiento APY' : 'Supply APY'}</th>
              <th className="py-3 px-4 font-medium">{isEs ? 'Liquidez / Parámetro' : 'Liquidity / Limit'}</th>
              <th className="py-3 px-6 font-medium text-right">{isEs ? 'Acciones' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line text-sm">
            {rows.map(row => (
              <tr
                key={row.symbol}
                className={row.type === 'disabled' ? 'opacity-60' : 'hover:bg-surface-2/30 transition-colors'}
              >
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    <img
                      src={row.icon}
                      alt={row.symbol}
                      className={`w-8 h-8 rounded-full object-contain ${
                        row.type === 'disabled' ? 'grayscale' : ''
                      }`}
                    />
                    <div>
                      <div className="font-semibold text-ink">{row.name}</div>
                      <div className="text-xs text-ink-3 font-mono">
                        {row.contract} · {row.network}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4 font-mono font-medium text-ink tabular-nums">
                  {row.borrowApr}
                </td>
                <td className="py-4 px-4 font-mono font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {row.supplyApy}
                </td>
                <td className="py-4 px-4">
                  {row.active || row.type === 'collateral' ? (
                    <span className="font-mono text-xs font-medium text-ink tabular-nums">
                      {row.liquidity}
                    </span>
                  ) : (
                    <span className="ui-badge-warn">{t.sinLiquidezBadge}</span>
                  )}
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center justify-end gap-2">
                    {row.type === 'collateral' && (
                      <button
                        type="button"
                        onClick={onDepositBch}
                        className="ui-btn-sm ui-btn-secondary"
                      >
                        {isEs ? 'Depositar' : 'Deposit'}
                      </button>
                    )}
                    {row.type === 'stable' && (
                      <>
                        <button
                          type="button"
                          onClick={() => onBorrow(row.symbol as 'PUSD' | 'USDT')}
                          className="ui-btn-sm ui-btn-secondary"
                        >
                          {isEs ? 'Pedir' : 'Borrow'}
                        </button>
                        <button
                          type="button"
                          onClick={() => onSupply(row.symbol as 'PUSD' | 'USDT')}
                          className="ui-btn-sm ui-btn-secondary"
                        >
                          {isEs ? 'Aportar' : 'Supply'}
                        </button>
                      </>
                    )}
                    {row.type === 'disabled' && (
                      <span className="text-xs text-ink-3">
                        {isEs ? 'Pronto' : 'Soon'}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MOBILE STACKED ROWS */}
      <div className="md:hidden divide-y divide-line">
        {rows.map(row => (
          <div
            key={row.symbol}
            className={`p-4 space-y-3 ${row.type === 'disabled' ? 'opacity-60' : ''}`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={row.icon}
                  alt={row.symbol}
                  className={`w-7 h-7 rounded-full object-contain ${
                    row.type === 'disabled' ? 'grayscale' : ''
                  }`}
                />
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-ink truncate">{row.name}</div>
                  <div className="text-[11px] text-ink-3 font-mono truncate">{row.network}</div>
                </div>
              </div>
              {!row.active && row.type !== 'collateral' ? (
                <span className="ui-badge-warn shrink-0">{t.sinLiquidezBadge}</span>
              ) : (
                <span className="text-xs font-mono font-medium text-ink tabular-nums shrink-0">
                  {row.liquidity}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="ui-panel px-3 py-2 flex justify-between">
                <span className="text-ink-3">APR</span>
                <span className="font-mono font-medium text-ink tabular-nums">{row.borrowApr}</span>
              </div>
              <div className="ui-panel px-3 py-2 flex justify-between">
                <span className="text-ink-3">APY</span>
                <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {row.supplyApy}
                </span>
              </div>
            </div>

            {row.type !== 'disabled' && (
              <div className="flex items-center gap-2">
                {row.type === 'collateral' ? (
                  <button
                    type="button"
                    onClick={onDepositBch}
                    className="ui-btn-sm ui-btn-secondary w-full"
                  >
                    {isEs ? 'Depositar BCH' : 'Deposit BCH'}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => onBorrow(row.symbol as 'PUSD' | 'USDT')}
                      className="ui-btn-sm ui-btn-secondary flex-1"
                    >
                      {isEs ? 'Pedir' : 'Borrow'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onSupply(row.symbol as 'PUSD' | 'USDT')}
                      className="ui-btn-sm ui-btn-secondary flex-1"
                    >
                      {isEs ? 'Aportar' : 'Supply'}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* RISK PARAMETERS FOOTER */}
      <div className="px-5 py-3 bg-surface-2/40 border-t border-line flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
        <span>
          {t.maxLtv} 65% · {t.liquidationThreshold} 80% · {t.liquidationPenalty} 5%
        </span>
        <span className="font-mono">CashScript P2SH32 &amp; Polygon Amoy</span>
      </div>
    </div>
  );
}
