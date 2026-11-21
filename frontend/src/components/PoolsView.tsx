import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Plus,
  RefreshCw,
  ExternalLink,
  Wallet,
  Lock,
  ChevronDown,
  Layers,
  ShieldCheck,
  Check,
  Copy,
  Search,
  X,
  ArrowUpRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
  categoryIdB?: string | null;
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
  bchWalletSource?: 'blconnect' | 'wizard' | 'wc2-bch' | 'extension' | 'manual';
  evmAddress?: string;
  walletBalances?: Record<string, number>;
  wizardConnectManager?: any;
  wizardConnectState?: string;
  platformNetwork?: 'mainnet' | 'testnet';
  onToggleNetwork?: (net: 'mainnet' | 'testnet') => void;
  onRefreshBalances?: () => void;
  onConnectWallet: () => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
  lang?: 'en' | 'es';
  authToken?: string | null;
  onEnsureAuthSession?: (options?: EnsureAuthSessionOptions) => Promise<string | null>;
}

/** Formats USD figures uniformly using en-US decimals so tables stay aligned across locales. */
function formatUsd(value: number, maxDecimals = 2, minDecimals = 2): string {
  const safe = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: Math.min(minDecimals, maxDecimals),
    maximumFractionDigits: maxDecimals
  }).format(safe);
}

/** Formats token balances cleanly using en-US thousands separators. */
function formatToken(value: number, maxDecimals = 4): string {
  const safe = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals
  }).format(safe);
}

/** Computes reserve allocation split percentages for a dual-vault pool. */
function getReserveSplit(reserveAUsd: number, reserveBUsd: number): { pctA: number; pctB: number } {
  const total = Math.max(0, reserveAUsd) + Math.max(0, reserveBUsd);
  if (total <= 0) return { pctA: 50, pctB: 50 };
  const pctA = Math.min(100, Math.max(0, (reserveAUsd / total) * 100));
  return { pctA, pctB: 100 - pctA };
}

/** Truncates long CashAddr / EVM / Category IDs cleanly for summary display. */
function shortHash(value?: string | null, head = 10, tail = 6): string {
  if (!value) return '--';
  if (value.length <= head + tail + 3) return value;
  return `${value.slice(0, head)}...${value.slice(-tail)}`;
}

const poolTexts = {
  en: {
    title: 'Liquidity Pools',
    subtitleTestnet:
      'Provide single-sided liquidity to BCH CashTokens and Polygon vaults and earn 0.20% of swap volume.',
    subtitleMainnet:
      'Mainnet vaults hold zero active liquidity. Switch to Testnet for live PUSD / USDT vaults.',

    statTvlLabel: 'Protocol TVL',
    statVolumeLabel: 'Settled Volume',
    statFeesLabel: 'LP Fees Accrued',
    statPairsLabel: 'Vault Pairs',
    statActive: 'Active',
    statNoLiq: 'Unseeded',

    tabAll: 'All',
    tabActive: 'Active',
    tabBootstrapping: 'Bootstrapping',
    tabMyPositions: 'My Positions',
    btnCreatePair: 'Register pair',
    refresh: 'Refresh',
    refreshTooltip: 'Refresh on-chain reserves',
    searchPlaceholder: 'Search pair or token...',

    sponsorBadge: 'BLAZE Sponsor',
    verifiedOfficial: 'Official',
    communityBadge: 'Community',
    verifyAction: 'Verify pair',
    statusActive: 'Active',
    statusNoLiquidity: 'No liquidity',
    statusFunding: 'Bootstrapping',
    unlockGoal: 'Launch goal',
    unlockRemainingPrefix: 'Remaining:',
    unlockRemainingSuffix: 'USD to unlock swaps.',

    poolTvl: 'Vault TVL',
    annualApy: 'APY',
    lpFee: 'LP fee',
    reservePrefix: 'Vault reserve',

    positionsTitle: 'Your LP Positions',
    noPositionsTitle: 'No active LP positions found.',
    noPositionsDesc:
      'Deposit PUSD (Chipnet) or USDT (Polygon Amoy) in the vault panel to mint LP shares and earn 0.20% fees.',
    connectPositionsTitle: 'Connect a BCH or EVM wallet to inspect your LP shares and accrued fees.',
    btnConnectWallet: 'Connect wallet',
    btnExplorePools: 'Explore pools',
    thPair: 'Pool',
    thShares: 'LP shares',
    thPoolShare: 'Share',
    thDeposit: 'Deposit',
    thCurrentValue: 'Redeemable',
    thProfit: 'Fees earned',
    thAction: 'Action',
    btnWithdraw: 'Withdraw',

    depositTabPrefix: 'Deposit',
    depositAmountLabel: 'Deposit amount',
    balanceLabel: 'Wallet:',
    sharesToReceive: 'LP shares to mint',
    newShareRatio: 'New vault share',
    projectedYield: 'Projected yield',
    btnSubmittingAdd: 'Verifying on-chain deposit...',
    btnConfirmAddBch: 'Verify BCH TX & mint LP shares',

    modalRemoveTitle: 'Withdraw liquidity',
    withdrawPctLabel: 'Shares to burn',
    withdrawAssetLabel: 'Select payout asset and destination network',
    sharesToBurn: 'LP shares to burn',
    payoutToReceive: 'On-chain payout',
    totalUsdReturn: 'Redemption value',
    feeProfit: 'Accrued LP fees',
    btnSubmittingRemove: 'Releasing vault funds...',
    btnConfirmRemove: 'Burn shares & release to wallet',

    createTitle: 'Register CashToken Pair',
    createSubtitle: 'Pair a Bitcoin Cash CashToken with PUSD or another CashToken (BCH), or with USDT/USDC (Polygon)',
    baseTokenTitle: 'Token 1 (BCH CashToken)',
    quoteTokenTitle: 'Token 2 (BCH or Polygon)',
    symbolPlaceholder: 'e.g. LIFT',
    namePlaceholder: 'Name (optional)',
    decimalsLabel: 'Decimals',
    advancedOptions: 'Optional logo (URL or IPFS)',
    categoryIdLabel: 'CashToken Category ID (64 hex)',
    categoryIdPlaceholder: '64-character hex category ID...',
    lookupChecking: 'Querying blockchain and BCMR...',
    lookupVerifiedBcmr: 'On-chain + BCMR verified',
    lookupOnChainOnly: 'Confirmed on blockchain (no BCMR metadata published; enter symbol and decimals).',
    lookupOppositeNet: 'Found on',
    lookupOppositeHint: '(switch platform network or verify Category ID).',
    lookupNotFound: 'Not found on blockchain or BCMR registries for this network.',
    lookupRefreshTip: 'Re-query blockchain and BCMR',
    iconLabel: 'Logo URL or IPFS URI (ipfs://...)',
    iconPlaceholder: 'https://... or ipfs://...',
    modeStandard: 'Standard pair',
    modeStandardDesc: 'Lists the pair with zero liquidity until funded on-chain.',
    modeBootstrapping: 'Fair launch goal',
    modeBootstrappingDesc: 'Defines a community TVL target with anti-rug protection.',
    amountToDeposit: 'Target base supply',
    targetTvl: 'Target TVL goal (USD)',
    btnCreating: 'Registering pair...',
    btnCreate: 'Register liquidity pair',

    toastVerified: 'Pool verified successfully.',
    toastVerifyError: 'Could not verify pool',
    toastNetworkError: 'Network communication error',
    toastEnterSymbol: 'Please enter a valid CashToken symbol',
    toastInvalidCatId: 'CashToken Category ID must be exactly 64 hexadecimal characters',
    toastInvalidCatIdB: 'Token 2 CashToken Category ID must be exactly 64 hexadecimal characters',
    toastMissingCatId: 'Enter the 64-hex CashToken Category ID to verify on-chain deposits',
    toastCreateSuccess: 'Custom pair registered successfully.',
    toastCreateError: 'Error registering pair',
    toastInvalidAmount: 'Enter a deposit amount greater than zero',
    toastInsufficientBalance: (bal: number, token: string) =>
      `Insufficient wallet balance (${formatToken(bal)} ${token} available)`,
    toastGoalReached: (pair: string) => `Funding goal reached. ${pair} is now Active.`,
    toastDepositSuccess: (amt: number, token: string, shares: any) =>
      `Verified on-chain deposit of ${amt} ${token}. Minted ${shares} LP shares.`,
    toastDepositError: 'Failed to verify liquidity deposit',
    toastWithdrawSuccess: (amt: any, tok: string, tx: string) =>
      `Vault released ${amt} ${tok} on-chain. TX: ${tx.slice(0, 12)}...`,
    toastWithdrawError: 'Failed to release liquidity from vault'
  },
  es: {
    title: 'Pools de Liquidez',
    subtitleTestnet:
      'Aporta liquidez unilateral en bóvedas BCH CashTokens y Polygon para ganar 0.20% del volumen de swaps.',
    subtitleMainnet:
      'Las bóvedas en Mainnet están sin liquidez activa. Cambia a Testnet para operar en PUSD / USDT.',

    statTvlLabel: 'TVL en Contratos',
    statVolumeLabel: 'Volumen Liquidado',
    statFeesLabel: 'Comisiones LP',
    statPairsLabel: 'Pares Registrados',
    statActive: 'Activo',
    statNoLiq: 'Sin liq.',

    tabAll: 'Todos',
    tabActive: 'Activos',
    tabBootstrapping: 'En fondeo',
    tabMyPositions: 'Mis posiciones',
    btnCreatePair: 'Registrar par',
    refresh: 'Actualizar',
    refreshTooltip: 'Actualizar reservas on-chain',
    searchPlaceholder: 'Buscar par o token...',

    sponsorBadge: 'Patrocinador BLAZE',
    verifiedOfficial: 'Oficial',
    communityBadge: 'Comunitario',
    verifyAction: 'Verificar par',
    statusActive: 'Activo',
    statusNoLiquidity: 'Sin Liquidez',
    statusFunding: 'En fondeo',
    unlockGoal: 'Meta de desbloqueo',
    unlockRemainingPrefix: 'Faltan',
    unlockRemainingSuffix: 'USD para habilitar swaps.',

    poolTvl: 'TVL Vault',
    annualApy: 'APY',
    lpFee: 'Comisión LP',
    reservePrefix: 'Reserva en contrato',

    positionsTitle: 'Mis Posiciones LP',
    noPositionsTitle: 'Sin posiciones activas de liquidez.',
    noPositionsDesc:
      'Deposita PUSD (Chipnet) o USDT (Polygon Amoy) en el panel derecho para emitir LP Shares y ganar 0.20% por swap.',
    connectPositionsTitle: 'Conecta una billetera BCH o EVM para consultar tus LP Shares y comisiones.',
    btnConnectWallet: 'Conectar wallet',
    btnExplorePools: 'Explorar pools',
    thPair: 'Par',
    thShares: 'LP Shares',
    thPoolShare: 'Participación',
    thDeposit: 'Depósito',
    thCurrentValue: 'Rescatable',
    thProfit: 'Comisiones',
    thAction: 'Acción',
    btnWithdraw: 'Retirar',

    depositTabPrefix: 'Depositar',
    depositAmountLabel: 'Monto a depositar',
    balanceLabel: 'Saldo:',
    sharesToReceive: 'LP Shares estimadas',
    newShareRatio: 'Tu participación en bóveda',
    projectedYield: 'Rendimiento estimado',
    btnSubmittingAdd: 'Verificando depósito on-chain...',
    btnConfirmAddBch: 'Verificar TX BCH y emitir LP Shares',

    modalRemoveTitle: 'Retirar liquidez',
    withdrawPctLabel: 'Acciones a quemar',
    withdrawAssetLabel: 'Selecciona activo y red para recibir el retiro on-chain',
    sharesToBurn: 'LP Shares a quemar',
    payoutToReceive: 'Retiro on-chain',
    totalUsdReturn: 'Valor de rescate',
    feeProfit: 'Comisiones acumuladas',
    btnSubmittingRemove: 'Liberando fondos del contrato...',
    btnConfirmRemove: 'Quemar shares y liberar a wallet',

    createTitle: 'Registrar Par CashToken',
    createSubtitle: 'Empareja un CashToken de Bitcoin Cash con PUSD u otro CashToken (BCH), o con USDT/USDC (Polygon)',
    baseTokenTitle: 'Token 1 (CashToken BCH)',
    quoteTokenTitle: 'Token 2 (BCH o Polygon)',
    symbolPlaceholder: 'Ej: LIFT',
    namePlaceholder: 'Nombre (opcional)',
    decimalsLabel: 'Decimales',
    advancedOptions: 'Logo opcional (URL o IPFS)',
    categoryIdLabel: 'CashToken Category ID (64 hex)',
    categoryIdPlaceholder: 'Hash hexadecimal de 64 caracteres...',
    lookupChecking: 'Consultando blockchain y BCMR...',
    lookupVerifiedBcmr: 'On-chain + BCMR verificado',
    lookupOnChainOnly: 'Confirmado en blockchain (sin BCMR publicado; ingresa símbolo y decimales).',
    lookupOppositeNet: 'Encontrado en',
    lookupOppositeHint: '(red opuesta a la seleccionada).',
    lookupNotFound: 'No encontrado en blockchain ni registros BCMR de esta red.',
    lookupRefreshTip: 'Consultar nuevamente blockchain y BCMR',
    iconLabel: 'URL del logo o URI IPFS (ipfs://...)',
    iconPlaceholder: 'https://... o ipfs://...',
    modeStandard: 'Par estándar',
    modeStandardDesc: 'Registra el par sin liquidez inicial hasta su primer depósito on-chain.',
    modeBootstrapping: 'Meta comunitaria',
    modeBootstrappingDesc: 'Define una meta de TVL comunitario con bloqueo anti-rug.',
    amountToDeposit: 'Oferta base referencial',
    targetTvl: 'Meta de TVL (USD)',
    btnCreating: 'Registrando par...',
    btnCreate: 'Registrar par de liquidez',

    toastVerified: 'Par verificado correctamente.',
    toastVerifyError: 'No se pudo verificar el par',
    toastNetworkError: 'Error de conexión con el servidor',
    toastEnterSymbol: 'Ingresa un símbolo CashToken válido (ej: LIFT)',
    toastInvalidCatId: 'El Category ID debe tener exactamente 64 caracteres hexadecimales',
    toastInvalidCatIdB: 'El Category ID del Token 2 debe tener exactamente 64 caracteres hexadecimales',
    toastMissingCatId: 'Ingresa el Category ID (64 hex) del CashToken para verificar depósitos on-chain',
    toastCreateSuccess: 'Par personalizado registrado correctamente.',
    toastCreateError: 'Error al registrar el par',
    toastInvalidAmount: 'Ingresa un monto de depósito mayor a cero',
    toastInsufficientBalance: (bal: number, token: string) =>
      `Saldo insuficiente en tu billetera (${formatToken(bal)} ${token} disponibles)`,
    toastGoalReached: (pair: string) => `Meta alcanzada. ${pair} ahora está activo.`,
    toastDepositSuccess: (amt: number, token: string, shares: any) =>
      `Depósito on-chain verificado de ${amt} ${token}. Emitidas ${shares} LP Shares.`,
    toastDepositError: 'No se pudo verificar el depósito de liquidez',
    toastWithdrawSuccess: (amt: any, tok: string, tx: string) =>
      `Bóveda liberó ${amt} ${tok} on-chain. TX: ${tx.slice(0, 12)}...`,
    toastWithdrawError: 'Error al liberar liquidez desde la bóveda'
  }
};

/** Overlapping dual-token avatars with subtle neutral ring. */
function PairIcons({
  iconA,
  iconB,
  tokenA,
  tokenB,
  size = 'md'
}: {
  iconA: string;
  iconB: string;
  tokenA: string;
  tokenB: string;
  size?: 'sm' | 'md';
}) {
  const dim = size === 'sm' ? 'w-6 h-6' : 'w-8 h-8';
  return (
    <div className="flex -space-x-2 shrink-0">
      <img
        src={iconA}
        alt={tokenA}
        className={`${dim} rounded-full border-2 border-surface bg-surface object-contain`}
      />
      <img
        src={iconB}
        alt={tokenB}
        className={`${dim} rounded-full border-2 border-surface bg-surface object-contain`}
      />
    </div>
  );
}

/** Semantic status pill mapped strictly to real pool liquidity state. */
function PoolStatusBadge({ pool, t }: { pool: PoolData; t: (typeof poolTexts)['en'] }) {
  const isPoolActive = pool.status === 'ACTIVE' && Boolean(pool.hasLiquidity);
  if (isPoolActive) {
    return (
      <span className="ui-badge-success whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        {t.statusActive}
      </span>
    );
  }
  if (pool.status === 'BOOTSTRAPPING') {
    return (
      <span className="ui-badge-warn whitespace-nowrap">
        {t.statusFunding} ({pool.fundingProgress}%)
      </span>
    );
  }
  return (
    <span className="ui-badge-danger whitespace-nowrap">
      <Lock className="w-2.5 h-2.5 shrink-0" />
      {t.statusNoLiquidity}
    </span>
  );
}

/** Selected pool dual-vault reserve composition + collapsed technical contract inspection. */
function SelectedPoolInspector({
  pool,
  isEs,
  t,
  detailsOpen,
  onToggleDetails,
  copiedKey,
  onCopy,
  onVerifyPool
}: {
  pool: PoolData;
  isEs: boolean;
  t: (typeof poolTexts)['en'];
  detailsOpen: boolean;
  onToggleDetails: () => void;
  copiedKey: string | null;
  onCopy: (text: string, key: string) => void;
  onVerifyPool: (poolId: string) => void;
}) {
  const { pctA, pctB } = getReserveSplit(pool.reserveAValueUsd, pool.reserveBValueUsd);
  const hasDepth = pool.tvlUsd > 0;
  const vaultA = pool.vaultAddressA || DEPLOYED_TESTNET_CONTRACTS.chipnetVaultTokenAddress;
  const vaultB = pool.vaultAddressB || DEPLOYED_TESTNET_CONTRACTS.amoyVaultAddress;

  return (
    <div className="ui-card p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <PairIcons iconA={pool.iconA} iconB={pool.iconB} tokenA={pool.tokenA} tokenB={pool.tokenB} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="ui-section-title truncate">{pool.name || pool.pair}</h2>
              <PoolStatusBadge pool={pool} t={t} />
            </div>
            <p className="text-xs text-ink-3 mt-0.5 truncate">
              {pool.networkBadgeA} ⟷ {pool.networkBadgeB}
            </p>
          </div>
        </div>

        <div className="text-left sm:text-right tabular-nums shrink-0">
          <div className="ui-label">{isEs ? 'Precio LP Share' : 'LP share price'}</div>
          <div className="text-sm font-semibold text-ink">
            ${formatUsd(pool.sharePriceUsd || 1, 4, 2)}
          </div>
        </div>
      </div>

      {/* Bootstrapping target bar (only when Bootstrapping) */}
      {pool.status === 'BOOTSTRAPPING' && (
        <div className="ui-panel p-3.5 space-y-2 border border-amber-500/20">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-amber-600 dark:text-amber-400">
              {t.unlockGoal} ({pool.fundingProgress}%)
            </span>
            <span className="tabular-nums font-medium text-ink">
              ${formatUsd(pool.tvlUsd)} / ${formatUsd(pool.targetTvlUsd, 0, 0)}
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-surface-3 overflow-hidden">
            <div
              className="h-full rounded-full bg-amber-500 transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, pool.fundingProgress))}%` }}
            />
          </div>
          <p className="text-xs text-ink-3">
            {t.unlockRemainingPrefix}{' '}
            <span className="text-ink font-medium tabular-nums">
              ${formatUsd(pool.remainingFundingUsd)}
            </span>{' '}
            {t.unlockRemainingSuffix}
          </p>
        </div>
      )}

      {/* Dual-Vault Reserves Breakdown */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs text-ink-2">
          <span>{isEs ? 'Composición de reservas en bóvedas' : 'Dual-vault reserve composition'}</span>
          <span className="tabular-nums font-medium text-ink">
            {hasDepth ? `${pctA.toFixed(1)}% ${pool.tokenA} · ${pctB.toFixed(1)}% ${pool.tokenB}` : '0% / 0%'}
          </span>
        </div>

        <div className="w-full h-1.5 rounded-full bg-surface-3 overflow-hidden flex">
          {hasDepth ? (
            <>
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${pctA}%` }}
              />
              <div
                className="h-full bg-sky-500 transition-all duration-500"
                style={{ width: `${pctB}%` }}
              />
            </>
          ) : (
            <div className="h-full w-full bg-surface-3" />
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="ui-panel p-3.5 space-y-1">
            <div className="flex items-center justify-between text-xs text-ink-3">
              <span className="flex items-center gap-1.5">
                <img src={pool.iconA} alt="" className="w-4 h-4 rounded-full object-contain" />
                <span className="font-medium text-ink">{pool.tokenA}</span>
              </span>
              <span>{pool.networkBadgeA}</span>
            </div>
            <div className="text-sm font-semibold text-ink tabular-nums">
              {formatToken(pool.reserveA, 4)} {pool.tokenA}
            </div>
            <div className="text-xs text-ink-3 tabular-nums">
              ${formatUsd(pool.reserveAValueUsd)}
            </div>
          </div>

          <div className="ui-panel p-3.5 space-y-1">
            <div className="flex items-center justify-between text-xs text-ink-3">
              <span className="flex items-center gap-1.5">
                <img src={pool.iconB} alt="" className="w-4 h-4 rounded-full object-contain" />
                <span className="font-medium text-ink">{pool.tokenB}</span>
              </span>
              <span>{pool.networkBadgeB}</span>
            </div>
            <div className="text-sm font-semibold text-ink tabular-nums">
              {formatToken(pool.reserveB, 4)} {pool.tokenB}
            </div>
            <div className="text-xs text-ink-3 tabular-nums">
              ${formatUsd(pool.reserveBValueUsd)}
            </div>
          </div>
        </div>
      </div>

      {/* Collapsed Technical Details (DESIGN.md Rule 5) */}
      <div className="border-t border-line pt-3">
        <button
          type="button"
          onClick={onToggleDetails}
          className="w-full flex items-center justify-between text-xs font-medium text-ink-2 hover:text-ink cursor-pointer transition-colors"
        >
          <span>{isEs ? 'Detalles técnicos y contratos' : 'Vault contracts & details'}</span>
          <ChevronDown
            className={`w-4 h-4 text-ink-3 transition-transform duration-200 ${detailsOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {detailsOpen && (
          <div className="mt-3 space-y-2.5 text-xs">
            <div className="ui-panel p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-ink-3">{isEs ? 'Volumen liquidado' : 'Settled volume'}</span>
                <span className="tabular-nums font-medium text-ink">${formatUsd(pool.totalVolumeUsd)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-ink-3">{isEs ? 'Comisiones acumuladas' : 'Cumulative LP fees'}</span>
                <span className="tabular-nums font-medium text-emerald-600 dark:text-emerald-400">
                  +${formatUsd(pool.cumulativeFeesUsd, 4, 2)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-ink-3">{isEs ? 'Distribución de comisión' : 'Fee split'}</span>
                <span className="tabular-nums text-ink">
                  {pool.lpFeePercent}% LP · {pool.protocolFeePercent}% Protocol
                </span>
              </div>
            </div>

            <div className="ui-panel p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-ink-3 shrink-0">BCH Covenant</span>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-mono text-[11px] text-ink truncate">{shortHash(vaultA, 12, 8)}</span>
                  <button
                    type="button"
                    onClick={() => onCopy(vaultA, `vaultA-${pool.id}`)}
                    className="p-1 rounded hover:bg-surface-3 text-ink-3 hover:text-ink cursor-pointer"
                    title="Copy BCH vault"
                  >
                    {copiedKey === `vaultA-${pool.id}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  </button>
                  {pool.contractExplorerA && (
                    <a
                      href={pool.contractExplorerA}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 rounded hover:bg-surface-3 text-ink-3 hover:text-ink"
                      title="Open BCH Explorer"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-ink-3 shrink-0">
                  {pool.tokenB === 'USDT' || pool.tokenB === 'USDC'
                    ? 'Polygon Vault'
                    : `BCH Covenant (${pool.tokenB})`}
                </span>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-mono text-[11px] text-ink truncate">{shortHash(vaultB, 10, 6)}</span>
                  <button
                    type="button"
                    onClick={() => onCopy(vaultB, `vaultB-${pool.id}`)}
                    className="p-1 rounded hover:bg-surface-3 text-ink-3 hover:text-ink cursor-pointer"
                    title="Copy vault"
                  >
                    {copiedKey === `vaultB-${pool.id}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  </button>
                  {pool.contractExplorerB && (
                    <a
                      href={pool.contractExplorerB}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 rounded hover:bg-surface-3 text-ink-3 hover:text-ink"
                      title="Open Explorer"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              {pool.categoryIdA && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-ink-3 shrink-0">Category ID ({pool.tokenA})</span>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-mono text-[11px] text-ink truncate">{shortHash(pool.categoryIdA, 10, 6)}</span>
                    <button
                      type="button"
                      onClick={() => onCopy(pool.categoryIdA || '', `catA-${pool.id}`)}
                      className="p-1 rounded hover:bg-surface-3 text-ink-3 hover:text-ink cursor-pointer"
                      title="Copy Category ID"
                    >
                      {copiedKey === `catA-${pool.id}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              )}

              {pool.categoryIdB && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-ink-3 shrink-0">Category ID ({pool.tokenB})</span>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-mono text-[11px] text-ink truncate">{shortHash(pool.categoryIdB, 10, 6)}</span>
                    <button
                      type="button"
                      onClick={() => onCopy(pool.categoryIdB || '', `catB-${pool.id}`)}
                      className="p-1 rounded hover:bg-surface-3 text-ink-3 hover:text-ink cursor-pointer"
                      title="Copy Category ID"
                    >
                      {copiedKey === `catB-${pool.id}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {pool.isCustom && !pool.isVerified && typeof window !== 'undefined' && Boolean(sessionStorage.getItem('bliq_admin_key')) && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => onVerifyPool(pool.id)}
                  className="ui-btn-sm ui-btn-secondary"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{t.verifyAction}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Active LP positions table (Desktop) and stacked list (Mobile), with concise empty states. */
function LiquidityPositionsSection({
  positions,
  effectiveAddress,
  isEs,
  t,
  showExploreButton,
  onExplorePools,
  onConnectWallet,
  onRefresh,
  onOpenWithdraw
}: {
  positions: UserPosition[];
  effectiveAddress: string;
  isEs: boolean;
  t: (typeof poolTexts)['en'];
  showExploreButton: boolean;
  onExplorePools: () => void;
  onConnectWallet: () => void;
  onRefresh: () => void;
  onOpenWithdraw: (pos: UserPosition) => void;
}) {
  return (
    <div className="ui-card p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="ui-section-title">{t.positionsTitle}</h3>
          {positions.length > 0 && <span className="ui-badge tabular-nums">{positions.length}</span>}
        </div>
        <button type="button" onClick={onRefresh} className="ui-btn-sm ui-btn-ghost">
          <RefreshCw className="w-3.5 h-3.5" />
          <span>{t.refresh}</span>
        </button>
      </div>

      {!effectiveAddress ? (
        <div className="py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-line">
          <p className="ui-muted">{t.connectPositionsTitle}</p>
          <button type="button" onClick={onConnectWallet} className="ui-btn-sm ui-btn-secondary shrink-0 self-start sm:self-auto">
            <Wallet className="w-3.5 h-3.5" />
            <span>{t.btnConnectWallet}</span>
          </button>
        </div>
      ) : positions.length === 0 ? (
        <div className="py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-line">
          <p className="ui-muted">{t.noPositionsTitle}</p>
          {showExploreButton && (
            <button type="button" onClick={onExplorePools} className="ui-btn-sm ui-btn-secondary shrink-0 self-start sm:self-auto">
              <span>{t.btnExplorePools}</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line text-ink-3 font-medium">
                <tr>
                  <th className="py-2.5 pr-3 font-medium">{t.thPair}</th>
                  <th className="py-2.5 px-3 font-medium">{t.thShares}</th>
                  <th className="py-2.5 px-3 font-medium">{t.thPoolShare}</th>
                  <th className="py-2.5 px-3 font-medium">{t.thDeposit}</th>
                  <th className="py-2.5 px-3 font-medium">{t.thCurrentValue}</th>
                  <th className="py-2.5 px-3 font-medium">{t.thProfit}</th>
                  <th className="py-2.5 pl-3 text-right font-medium">{t.thAction}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {positions.map(pos => (
                  <tr key={pos.id} className="hover:bg-surface-2/60 transition-colors">
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-2">
                        <PairIcons iconA={pos.iconA} iconB={pos.iconB} tokenA={pos.tokenA} tokenB={pos.tokenB} size="sm" />
                        <span className="font-semibold text-ink text-sm">{pos.pair}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 tabular-nums font-medium text-ink">
                      {formatToken(pos.shares, 4)}
                    </td>
                    <td className="py-3 px-3 tabular-nums text-ink-2">
                      {pos.poolSharePercent}%
                    </td>
                    <td className="py-3 px-3 tabular-nums text-ink-2">
                      <div>
                        {formatToken(pos.depositedAmount)} {pos.tokenSymbol} (${formatUsd(pos.depositUsd || pos.depositedAmount)})
                      </div>
                      {pos.explorerUrl && (
                        <a
                          href={pos.explorerUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-primary hover:underline inline-flex items-center gap-1 mt-0.5"
                        >
                          <span>{isEs ? 'TX verificada' : 'Verified TX'}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </td>
                    <td className="py-3 px-3 tabular-nums font-semibold text-ink text-sm">
                      ${formatUsd(pos.totalValueUsd)}
                    </td>
                    <td className="py-3 px-3 tabular-nums text-emerald-600 dark:text-emerald-400 font-medium">
                      +${formatUsd(pos.profitUsd, 4, 2)} ({pos.profitPercentage}%)
                    </td>
                    <td className="py-3 pl-3 text-right">
                      <button
                        type="button"
                        onClick={() => onOpenWithdraw(pos)}
                        className="ui-btn-sm ui-btn-secondary"
                      >
                        {t.btnWithdraw}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-line">
            {positions.map(pos => (
              <div key={pos.id} className="py-3.5 space-y-2.5 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <PairIcons iconA={pos.iconA} iconB={pos.iconB} tokenA={pos.tokenA} tokenB={pos.tokenB} size="sm" />
                    <span className="font-semibold text-sm text-ink">{pos.pair}</span>
                  </div>
                  <button type="button" onClick={() => onOpenWithdraw(pos)} className="ui-btn-sm ui-btn-secondary">
                    {t.btnWithdraw}
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="ui-label">{t.thShares}</div>
                    <div className="ui-value">{formatToken(pos.shares, 4)}</div>
                  </div>
                  <div>
                    <div className="ui-label">{t.thCurrentValue}</div>
                    <div className="ui-value">${formatUsd(pos.totalValueUsd)}</div>
                  </div>
                  <div>
                    <div className="ui-label">{t.thProfit}</div>
                    <div className="tabular-nums font-medium text-emerald-600 dark:text-emerald-400">
                      +${formatUsd(pos.profitUsd, 4, 2)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

interface CashTokenLookupState {
  status: 'idle' | 'loading' | 'verified-bcmr' | 'onchain-only' | 'opposite-net' | 'not-found' | 'error';
  lastKey: string;
  source?: string | null;
  token?: { symbol: string; name: string; decimals: number; icon: string } | null;
  oppositeNetwork?: 'mainnet' | 'testnet';
  oppositeToken?: { symbol: string; name: string; decimals: number; icon: string } | null;
}

const IDLE_LOOKUP: CashTokenLookupState = { status: 'idle', lastKey: '' };
const CATEGORY_HEX_RE = /^[0-9a-f]{64}$/;
const BASE_DECIMAL_OPTIONS = ['0', '2', '6', '8'];

function getDecimalOptions(currentVal: string): string[] {
  const normalized = String(currentVal || '').trim();
  const set = new Set(BASE_DECIMAL_OPTIONS);
  if (/^\d+$/.test(normalized)) {
    set.add(normalized);
  }
  return Array.from(set).sort((a, b) => Number(a) - Number(b));
}

export default function PoolsView({
  backendUrl = '',
  userAddress,
  bchAddress = '',
  evmAddress = '',
  walletBalances: parentBalances,
  wizardConnectManager,
  wizardConnectState,
  platformNetwork = 'mainnet',
  onToggleNetwork,
  onRefreshBalances,
  onConnectWallet,
  showToast,
  lang = 'es',
  bchWalletSource,
  authToken,
  onEnsureAuthSession
}: PoolsViewProps) {
  const isTestnet = platformNetwork === 'testnet';
  const t = poolTexts[lang] || poolTexts.es;
  const isEs = lang === 'es';

  const [allPools, setAllPools] = useState<PoolData[]>([]);
  const [protocolStats, setProtocolStats] = useState<any>(null);
  const [positions, setPositions] = useState<UserPosition[]>([]);
  const [walletBalances, setWalletBalances] = useState<Record<string, number>>(() => parentBalances || {});
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'bootstrapping' | 'my-positions'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [detailsOpen, setDetailsOpen] = useState<boolean>(false);
  const [manualBchOpen, setManualBchOpen] = useState<boolean>(false);

  // Selected pool & Modal states
  const [actionModal, setActionModal] = useState<'remove' | null>(null);
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
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [web3StepMsg, setWeb3StepMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [faucetClaiming, setFaucetClaiming] = useState<boolean>(false);

  // Remove Liquidity state
  const [burnPercentage, setBurnPercentage] = useState<number>(100);
  const [withdrawToken, setWithdrawToken] = useState<string>('USDT');

  // Create Pool Form State
  const [createForm, setCreateForm] = useState({
    tokenA: '',
    tokenAName: '',
    categoryIdA: '',
    decimalsA: '6',
    iconA: '',
    tokenBMode: 'USDT' as 'USDT' | 'USDC' | 'PUSD' | 'CUSTOM_CASHTOKEN',
    tokenB: 'USDT',
    tokenBName: 'Tether USD',
    categoryIdB: '',
    decimalsB: '6',
    iconB: '',
    networkB: 'Polygon Amoy (Testnet)',
    networkBadgeB: 'Polygon Amoy',
    poolMode: 'BOOTSTRAPPING' as 'BOOTSTRAPPING' | 'STANDARD',
    targetTvlUsd: '2500',
    initialAmountA: '100000',
    initialAmountB: '0',
    initialPriceUsd: '0.01'
  });

  const [lookupBySide, setLookupBySide] = useState<{ A: CashTokenLookupState; B: CashTokenLookupState }>({
    A: IDLE_LOOKUP,
    B: IDLE_LOOKUP
  });
  const lookupAbortRef = useRef<{ A: AbortController | null; B: AbortController | null }>({ A: null, B: null });
  const lastLookupKeyRef = useRef<{ A: string; B: string }>({ A: '', B: '' });
  const [brokenPreviewIcons, setBrokenPreviewIcons] = useState<Record<string, boolean>>({});

  const resolveCashTokenSide = useCallback(
    async (side: 'A' | 'B', rawCategoryId: string, force = false) => {
      const clean = rawCategoryId.trim().toLowerCase();
      if (!CATEGORY_HEX_RE.test(clean)) {
        lookupAbortRef.current[side]?.abort();
        lookupAbortRef.current[side] = null;
        lastLookupKeyRef.current[side] = '';
        setLookupBySide(prev => (prev[side].status === 'idle' ? prev : { ...prev, [side]: IDLE_LOOKUP }));
        return;
      }

      const queryKey = `${platformNetwork}:${clean}`;
      if (!force && lastLookupKeyRef.current[side] === queryKey) return;

      lastLookupKeyRef.current[side] = queryKey;
      lookupAbortRef.current[side]?.abort();
      const controller = new AbortController();
      lookupAbortRef.current[side] = controller;

      setLookupBySide(prev => ({ ...prev, [side]: { status: 'loading', lastKey: queryKey } }));

      try {
        const res = await fetch(
          `${backendUrl}/api/tokens/cashtoken-metadata/${clean}?network=${platformNetwork}`,
          { signal: controller.signal }
        );
        const data = await res.json();
        if (controller.signal.aborted) return;

        if (!res.ok || !data?.success) {
          setLookupBySide(prev => ({ ...prev, [side]: { status: 'error', lastKey: queryKey } }));
          return;
        }

        if (data.bcmrVerified && data.token) {
          setLookupBySide(prev => ({
            ...prev,
            [side]: {
              status: 'verified-bcmr',
              lastKey: queryKey,
              source: data.source || null,
              token: data.token
            }
          }));
          setBrokenPreviewIcons(prev => ({ ...prev, [`${side}:${clean}`]: false }));
          setCreateForm(prev => {
            const currentCat = (side === 'A' ? prev.categoryIdA : prev.categoryIdB).trim().toLowerCase();
            if (currentCat !== clean) return prev;
            if (side === 'A') {
              return {
                ...prev,
                tokenA: (data.token.symbol || prev.tokenA).toUpperCase(),
                tokenAName: data.token.name || prev.tokenAName,
                decimalsA: String(data.token.decimals ?? prev.decimalsA),
                iconA: data.token.icon || prev.iconA
              };
            }
            if (prev.tokenBMode !== 'CUSTOM_CASHTOKEN') return prev;
            return {
              ...prev,
              tokenB: (data.token.symbol || prev.tokenB).toUpperCase(),
              tokenBName: data.token.name || prev.tokenBName,
              decimalsB: String(data.token.decimals ?? prev.decimalsB),
              iconB: data.token.icon || prev.iconB
            };
          });
          return;
        }

        if (data.onChain) {
          setLookupBySide(prev => ({
            ...prev,
            [side]: { status: 'onchain-only', lastKey: queryKey, source: data.source || null }
          }));
          return;
        }

        if (data.onOppositeNetwork) {
          setLookupBySide(prev => ({
            ...prev,
            [side]: {
              status: 'opposite-net',
              lastKey: queryKey,
              oppositeNetwork: data.oppositeNetwork,
              oppositeToken: data.oppositeToken || null
            }
          }));
          return;
        }

        setLookupBySide(prev => ({ ...prev, [side]: { status: 'not-found', lastKey: queryKey } }));
      } catch (err: any) {
        if (err?.name === 'AbortError' || controller.signal.aborted) return;
        setLookupBySide(prev => ({ ...prev, [side]: { status: 'error', lastKey: queryKey } }));
      }
    },
    [backendUrl, platformNetwork]
  );

  useEffect(() => {
    if (!createModalOpen) return;
    const cleanA = createForm.categoryIdA.trim().toLowerCase();
    if (!CATEGORY_HEX_RE.test(cleanA)) {
      resolveCashTokenSide('A', cleanA);
      return;
    }
    if (lastLookupKeyRef.current.A === `${platformNetwork}:${cleanA}`) return;
    const timer = setTimeout(() => {
      resolveCashTokenSide('A', cleanA);
    }, 220);
    return () => clearTimeout(timer);
  }, [createModalOpen, createForm.categoryIdA, platformNetwork, resolveCashTokenSide]);

  useEffect(() => {
    if (!createModalOpen || createForm.tokenBMode !== 'CUSTOM_CASHTOKEN') {
      if (lastLookupKeyRef.current.B) {
        resolveCashTokenSide('B', '');
      }
      return;
    }
    const cleanB = createForm.categoryIdB.trim().toLowerCase();
    if (!CATEGORY_HEX_RE.test(cleanB)) {
      resolveCashTokenSide('B', cleanB);
      return;
    }
    if (lastLookupKeyRef.current.B === `${platformNetwork}:${cleanB}`) return;
    const timer = setTimeout(() => {
      resolveCashTokenSide('B', cleanB);
    }, 220);
    return () => clearTimeout(timer);
  }, [createModalOpen, createForm.tokenBMode, createForm.categoryIdB, platformNetwork, resolveCashTokenSide]);

  const renderCategoryLookupFeedback = (side: 'A' | 'B') => {
    const state = lookupBySide[side];
    if (!state || state.status === 'idle') return null;
    const cleanCat = (side === 'A' ? createForm.categoryIdA : createForm.categoryIdB).trim().toLowerCase();

    if (state.status === 'loading') {
      return (
        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-ink-3">
          <RefreshCw className="w-3 h-3 animate-spin shrink-0" />
          <span>{t.lookupChecking}</span>
        </div>
      );
    }
    if (state.status === 'verified-bcmr' && state.token) {
      const iconKey = `${side}:${cleanCat}`;
      const showIcon = Boolean(state.token.icon) && !brokenPreviewIcons[iconKey];
      return (
        <div className="mt-1.5 flex items-center gap-2 text-[11px] text-emerald-600 dark:text-emerald-400">
          {showIcon ? (
            <img
              src={state.token.icon}
              alt={state.token.symbol}
              onError={() => setBrokenPreviewIcons(prev => ({ ...prev, [iconKey]: true }))}
              className="w-4 h-4 rounded-full object-cover border border-line shrink-0"
            />
          ) : (
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
          )}
          <span className="truncate">
            {t.lookupVerifiedBcmr}: <span className="font-semibold">{state.token.symbol}</span>
            {state.source ? ` (${state.source})` : ''}
          </span>
        </div>
      );
    }
    if (state.status === 'onchain-only') {
      return (
        <div className="mt-1.5 text-[11px] text-amber-600 dark:text-amber-400 leading-snug">
          {t.lookupOnChainOnly}
        </div>
      );
    }
    if (state.status === 'opposite-net') {
      const oppLabel = state.oppositeNetwork === 'mainnet' ? 'Mainnet' : 'Chipnet';
      const symHint = state.oppositeToken?.symbol ? ` (${state.oppositeToken.symbol})` : '';
      return (
        <div className="mt-1.5 text-[11px] text-amber-600 dark:text-amber-400 leading-snug">
          {t.lookupOppositeNet} <span className="font-medium">{oppLabel}</span>
          {symHint} {t.lookupOppositeHint}
        </div>
      );
    }
    if (state.status === 'not-found' || state.status === 'error') {
      return (
        <div className="mt-1.5 text-[11px] text-rose-600 dark:text-rose-400 leading-snug">
          {t.lookupNotFound}
        </div>
      );
    }
    return null;
  };

  const isEvmSymbol = (sym: string) => {
    const u = String(sym || '').trim().toUpperCase();
    return u === 'USDT' || u === 'USDC';
  };

  const getChainShortLabel = (sym: string) => {
    const u = String(sym || '').trim().toUpperCase();
    if (u === 'USDT' || u === 'USDC') return isTestnet ? 'Amoy' : 'Polygon';
    if (u === 'BCH') return isTestnet ? 'Chipnet L1' : 'BCH L1';
    return isTestnet ? 'Chipnet' : 'BCH';
  };

  const connectedBch =
    bchAddress ||
    (userAddress && (userAddress.startsWith('bchtest:') || userAddress.startsWith('bitcoincash:'))
      ? userAddress
      : '');
  const connectedEvm =
    evmAddress || (userAddress && userAddress.startsWith('0x') ? userAddress : '');
  const effectiveAddress = connectedBch || connectedEvm || userAddress || '';

  const hasOneClickBchSign =
    Boolean(connectedBch) &&
    hasActiveBchSigningCapability(wizardConnectManager, bchWalletSource);

  const activePool = useMemo(() => {
    if (selectedPool) {
      const updated = allPools.find(p => p.id === selectedPool.id);
      if (updated) return updated;
    }
    return allPools.find(p => p.status === 'ACTIVE' && p.hasLiquidity) || allPools[0] || null;
  }, [allPools, selectedPool]);

  useEffect(() => {
    if (parentBalances && Object.keys(parentBalances).length > 0) {
      setWalletBalances(prev => ({ ...prev, ...parentBalances }));
    }
  }, [parentBalances]);

  // Keep depositToken synchronized whenever activePool changes
  useEffect(() => {
    if (!activePool) return;
    if (depositToken !== activePool.tokenA && depositToken !== activePool.tokenB) {
      setDepositToken(connectedEvm ? activePool.tokenB : activePool.tokenA);
    }
  }, [activePool, connectedEvm, depositToken]);

  const selectedBchVaultAddress =
    depositToken === activePool?.tokenB && activePool?.vaultAddressB && !isEvmSymbol(depositToken)
      ? activePool.vaultAddressB
      : activePool?.vaultAddressA || DEPLOYED_TESTNET_CONTRACTS.chipnetVaultTokenAddress;

  useEffect(() => {
    if (!isEvmSymbol(depositToken) && selectedBchVaultAddress) {
      setBchVaultQr(generateQrDataUrl(selectedBchVaultAddress));
    }
  }, [depositToken, selectedBchVaultAddress]);

  const copyText = (txt: string, key = 'vault') => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(txt);
    }
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
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

  const handleSelectPool = (pool: PoolData, scrollToWorkbench = false) => {
    setSelectedPool(pool);
    setDetailsOpen(false);
    if (depositToken !== pool.tokenA && depositToken !== pool.tokenB) {
      setDepositToken(connectedEvm ? pool.tokenB : pool.tokenA);
      setDepositAmount('');
    }
    setBchDepositTxHash('');
    setWeb3StepMsg('');
    if (scrollToWorkbench && typeof document !== 'undefined') {
      const el = document.getElementById('pools-workbench');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const handleClaimTestnetFaucet = async (tokenSym: string) => {
    const upper = tokenSym.toUpperCase();
    const isEvmTok = upper === 'USDT' || upper === 'USDC';
    const recipient = isEvmTok
      ? connectedEvm
      : connectedBch
      ? convertCashAddressNetwork(connectedBch, true, true)
      : '';

    if (!recipient) {
      onConnectWallet();
      return;
    }

    setFaucetClaiming(true);
    try {
      const claimAmt = upper === 'USDT' ? 100 : 25;
      const res = await fetch(`${backendUrl}/api/faucet/testnet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: upper === 'USDC' ? 'USDT' : upper,
          amount: claimAmt,
          recipient
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(
          isEs
            ? `Faucet envió ${claimAmt} ${upper} on-chain a tu wallet.`
            : `Faucet sent ${claimAmt} ${upper} on-chain to your wallet.`,
          'success'
        );
        onRefreshBalances?.();
        setTimeout(() => fetchWalletBalances(), 2000);
      } else {
        showToast(data.error || (isEs ? 'Error solicitando tokens de prueba' : 'Failed to request testnet tokens'), 'error');
      }
    } catch (err: any) {
      showToast(err.message || t.toastNetworkError, 'error');
    } finally {
      setFaucetClaiming(false);
    }
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

  const handleSetUsdPreset = (usdAmount: number) => {
    if (!activePool) return;
    const price = depositToken === activePool.tokenA ? activePool.priceA : activePool.priceB;
    const unitPrice = price > 0 ? price : 1;
    const tokenQty = usdAmount / unitPrice;
    setDepositAmount(tokenQty >= 1 ? String(Number(tokenQty.toFixed(2))) : tokenQty.toFixed(4));
  };

  const handleCreatePool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveAddress) {
      onConnectWallet();
      return;
    }

    const symA = createForm.tokenA.trim().toUpperCase();
    const symB = createForm.tokenB.trim().toUpperCase();
    const catA = createForm.categoryIdA.trim().toLowerCase();
    const catB = createForm.categoryIdB.trim().toLowerCase();
    const BUILTIN_CASHTOKENS = new Set(['PUSD', 'MUSD', 'LIFT']);
    const hexCatRe = /^[0-9a-f]{64}$/;

    if (!symA || symA === 'BCH' || symA === 'USDT' || symA === 'USDC') {
      showToast(t.toastEnterSymbol, 'error');
      return;
    }
    if (catA && !hexCatRe.test(catA)) {
      showToast(t.toastInvalidCatId, 'error');
      return;
    }
    if (!catA && !BUILTIN_CASHTOKENS.has(symA)) {
      showToast(t.toastMissingCatId, 'error');
      return;
    }
    if (!symB || symB === symA || symB === 'BCH') {
      showToast(t.toastEnterSymbol, 'error');
      return;
    }
    if (createForm.tokenBMode === 'CUSTOM_CASHTOKEN') {
      if (catB && !hexCatRe.test(catB)) {
        showToast(t.toastInvalidCatIdB, 'error');
        return;
      }
      if (!catB && !BUILTIN_CASHTOKENS.has(symB)) {
        showToast(t.toastMissingCatId, 'error');
        return;
      }
    }

    const creatorChains: AuthSessionChain[] = /^0x/i.test(effectiveAddress)
      ? ['evm']
      : /^(bchtest:|bitcoincash:)/i.test(effectiveAddress)
      ? ['bch']
      : ['bch', 'evm'];
    const token = await onEnsureAuthSession?.({ chains: creatorChains });
    if (!token) return;

    const isEvmB = isEvmSymbol(symB);
    setIsCreatingPool(true);
    try {
      const res = await fetch(`${backendUrl}/api/pools/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          creatorAddress: effectiveAddress,
          network: platformNetwork,
          tokenA: symA,
          tokenB: symB,
          tokenAName: createForm.tokenAName.trim() || symA,
          tokenBName: createForm.tokenBName.trim() || symB,
          networkA: isTestnet ? 'BCH Chipnet (Testnet4)' : 'Bitcoin Cash (Mainnet)',
          networkB: isEvmB
            ? isTestnet
              ? 'Polygon Amoy (Testnet)'
              : 'Polygon (Mainnet)'
            : isTestnet
            ? 'BCH Chipnet (Testnet4)'
            : 'Bitcoin Cash (Mainnet)',
          networkBadgeA: isTestnet ? 'Chipnet CashTokens' : 'BCH CashTokens',
          networkBadgeB: isEvmB
            ? isTestnet
              ? 'Polygon Amoy'
              : 'Polygon PoS'
            : isTestnet
            ? 'Chipnet CashTokens'
            : 'BCH CashTokens',
          categoryIdA: catA || null,
          categoryIdB: isEvmB ? null : catB || null,
          iconA: createForm.iconA.trim() || null,
          iconB: isEvmB ? null : createForm.iconB.trim() || null,
          decimalsA: parseInt(createForm.decimalsA, 10) || 6,
          decimalsB: isEvmB ? 6 : parseInt(createForm.decimalsB, 10) || 6,
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
        setCreateForm(prev => ({
          ...prev,
          tokenA: '',
          tokenAName: '',
          categoryIdA: '',
          iconA: '',
          categoryIdB: '',
          iconB: '',
          ...(prev.tokenBMode === 'CUSTOM_CASHTOKEN' ? { tokenB: '', tokenBName: '' } : {})
        }));
        lastLookupKeyRef.current = { A: '', B: '' };
        setLookupBySide({ A: IDLE_LOOKUP, B: IDLE_LOOKUP });
        await fetchPoolsData();
        if (data.pool) {
          setSearchQuery('');
          setActiveTab(data.pool.status === 'BOOTSTRAPPING' ? 'bootstrapping' : 'all');
          setSelectedPool(data.pool);
          setDepositToken(data.pool.tokenA);
          setDepositAmount('');
        }
      } else {
        showToast(data.error || t.toastCreateError, 'error');
      }
    } catch (err: any) {
      setIsCreatingPool(false);
      showToast(err.message || t.toastNetworkError, 'error');
    }
  };

  const depositPriceUsd = useMemo(() => {
    if (!activePool) return 1;
    const p = depositToken === activePool.tokenA ? activePool.priceA : activePool.priceB;
    return p > 0 ? p : 1;
  }, [activePool, depositToken]);

  const parsedDepositNum = parseFloat(depositAmount);
  const validDepositNum = Number.isFinite(parsedDepositNum) && parsedDepositNum > 0 ? parsedDepositNum : 0;
  const depositValueUsd = validDepositNum * depositPriceUsd;

  const calcEstimatedShares = () => {
    if (!activePool || validDepositNum <= 0) return 0;
    if (activePool.tvlUsd <= 0 || activePool.totalShares <= 0) return depositValueUsd;
    return (depositValueUsd / activePool.tvlUsd) * activePool.totalShares;
  };

  const calcNewPoolSharePercent = () => {
    if (!activePool || validDepositNum <= 0) return '0.0000';
    const shares = calcEstimatedShares();
    const newTotal = activePool.totalShares + shares;
    if (newTotal <= 0) return '0.0000';
    return ((shares / newTotal) * 100).toFixed(4);
  };

  const calcEstimatedAnnualYieldUsd = () => {
    if (!activePool || validDepositNum <= 0) return 0;
    const apy = activePool.apyPercentage > 0 ? activePool.apyPercentage : 0;
    return Number((depositValueUsd * (apy / 100)).toFixed(2));
  };

  // Submit 100% Non-Custodial Add Liquidity (Web3 Vault Transfer for EVM / 1-Click WC or Auto-Detect Covenant for BCH)
  const handleAddLiquidity = async () => {
    if (!activePool) return;
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

    if (bal !== null && bal >= 0 && num > bal + 0.0001) {
      showToast(t.toastInsufficientBalance(bal, depositToken), 'error');
      return;
    }

    setIsSubmitting(true);
    setWeb3StepMsg('');

    try {
      let confirmedTxHash = bchDepositTxHash.trim();
      let activeProviderAddr = isEvmDeposit ? connectedEvm : connectedBch;

      if (isEvmDeposit) {
        const vaultAddr = activePool.vaultAddressB || DEPLOYED_TESTNET_CONTRACTS.amoyVaultAddress;
        const tokenAddr = activePool.tokenAddressB || DEPLOYED_TESTNET_CONTRACTS.amoyUsdtAddress;

        const { txHash, sender } = await executeWeb3LpDeposit({
          isTestnet,
          vaultAddress: vaultAddr,
          tokenAddress: tokenAddr,
          amount: num,
          decimals: activePool.decimalsB || 6,
          onStatus: msg => setWeb3StepMsg(msg)
        });
        confirmedTxHash = txHash;
        activeProviderAddr = sender || connectedEvm;
      } else {
        if (!confirmedTxHash) {
          if (hasOneClickBchSign) {
            const signed = await executeBchSwapDeposit({
              backendUrl,
              buildEndpoint: '/api/pools/build-bch-tx',
              senderAddress: connectedBch,
              isTestnet,
              wizardManager: wizardConnectManager,
              preferredSource: bchWalletSource,
              bodyPayload: {
                poolId: activePool.id,
                token: depositToken,
                amount: num,
                network: platformNetwork
              },
              onStatus: msg => setWeb3StepMsg(msg)
            });
            confirmedTxHash = signed.txHash;
          } else {
            setWeb3StepMsg(
              isEs
                ? 'Escaneando UTXOs del Covenant BinaryLiquidVault.cash en Electrum...'
                : 'Scanning BinaryLiquidVault.cash Covenant UTXOs on Electrum...'
            );
            confirmedTxHash = 'AUTO_DETECT';
          }
        }
      }

      setWeb3StepMsg(
        isEs
          ? 'Verificando depósito on-chain y emitiendo LP Shares...'
          : 'Verifying on-chain deposit and minting LP shares...'
      );
      const res = await fetch(`${backendUrl}/api/pools/add-liquidity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerAddress: activeProviderAddr,
          bchAddress: connectedBch ? convertCashAddressNetwork(connectedBch, isTestnet, true) : null,
          evmAddress: connectedEvm || null,
          token: depositToken,
          amount: num,
          poolId: activePool.id,
          txHash: confirmedTxHash,
          network: platformNetwork
        })
      });
      const data = await res.json();

      if (data.success) {
        if (data.bootstrappingUnlocked) {
          showToast(t.toastGoalReached(activePool.pair), 'success');
        } else {
          showToast(t.toastDepositSuccess(num, depositToken, data.sharesMinted), 'success');
        }
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
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

    const isEvmWithdraw = withdrawToken === 'USDT' || withdrawToken === 'USDC';
    if (isEvmWithdraw && !connectedEvm) {
      showToast(
        isEs
          ? `Conecta tu billetera EVM (MetaMask / WalletConnect) para recibir tus ${withdrawToken}.`
          : `Connect your EVM wallet (MetaMask / WalletConnect) to receive ${withdrawToken}.`,
        'error'
      );
      onConnectWallet();
      return;
    }
    if (!isEvmWithdraw && !connectedBch) {
      showToast(
        isEs
          ? `Conecta tu billetera BCH (Paytaca / Cashonize) para recibir tus ${withdrawToken}.`
          : `Connect your BCH wallet (Paytaca / Cashonize) to receive ${withdrawToken}.`,
        'error'
      );
      onConnectWallet();
      return;
    }

    const posHasBch = Boolean(
      selectedPosition.bchAddress ||
        /^(bchtest:|bitcoincash:)/i.test(selectedPosition.providerAddress || '')
    );
    const posHasEvm = Boolean(
      selectedPosition.evmAddress || /^0x/i.test(selectedPosition.providerAddress || '')
    );
    const removeChains: AuthSessionChain[] = isEvmWithdraw
      ? posHasEvm || !posHasBch
        ? ['evm']
        : ['bch', 'evm']
      : posHasBch || !posHasEvm
      ? ['bch']
      : ['bch', 'evm'];

    const token = await onEnsureAuthSession?.({ chains: removeChains });
    if (!token) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`${backendUrl}/api/pools/remove-liquidity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          positionId: selectedPosition.id,
          providerAddress: effectiveAddress,
          bchAddress: connectedBch ? convertCashAddressNetwork(connectedBch, isTestnet, true) : null,
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

  const openWithdrawModal = (pos: UserPosition) => {
    setSelectedPosition(pos);
    setBurnPercentage(100);
    const defaultTok =
      pos.tokenSymbol === 'BCH'
        ? isEvmSymbol(pos.tokenB)
          ? pos.tokenB
          : 'PUSD'
        : pos.tokenSymbol || pos.tokenA || 'PUSD';
    setWithdrawToken(defaultTok);
    setActionModal('remove');
  };

  const filteredPools = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allPools.filter(p => {
      if (activeTab === 'active' && !(p.status === 'ACTIVE' && p.hasLiquidity)) return false;
      if (activeTab === 'bootstrapping' && p.status !== 'BOOTSTRAPPING') return false;
      if (q) {
        const hay = `${p.pair} ${p.name} ${p.tokenA} ${p.tokenB}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allPools, activeTab, searchQuery]);

  const activeCount = allPools.filter(p => p.status === 'ACTIVE' && p.hasLiquidity).length;
  const bootstrappingCount = allPools.filter(p => p.status === 'BOOTSTRAPPING').length;

  const isEvmDeposit = depositToken === 'USDT' || depositToken === 'USDC';
  const hasRequiredWallet = isEvmDeposit ? Boolean(connectedEvm) : Boolean(connectedBch);
  const currentBalance = getSelectedTokenBalance();
  const displayApy = activePool && activePool.apyPercentage > 0 ? activePool.apyPercentage : 0.0;
  const estimatedAnnualUsd = calcEstimatedAnnualYieldUsd();
  const estimatedMonthlyUsd = estimatedAnnualUsd / 12;

  return (
    <div className="w-full max-w-[1160px] mx-auto px-2 sm:px-4 py-4 sm:py-8 selection:bg-orange-500 selection:text-white space-y-6">
      {/* MAINNET ALERT BANNER (Only when Mainnet has 0 liquidity) */}
      {!isTestnet && (
        <div className="ui-panel border border-rose-500/20 px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <span className="font-medium text-rose-600 dark:text-rose-400 flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span>
              {isEs
                ? 'Mainnet sin liquidez activa. Las bóvedas operativas están en Testnet (PUSD / USDT).'
                : 'Mainnet vaults hold zero active liquidity. Live PUSD / USDT vaults are on Testnet.'}
            </span>
          </span>
          {onToggleNetwork && (
            <button
              type="button"
              onClick={() => {
                onToggleNetwork('testnet');
                showToast(isEs ? 'Red cambiada a Testnet' : 'Network switched to Testnet', 'success');
              }}
              className="ui-btn-sm ui-btn-secondary shrink-0 self-start sm:self-auto"
            >
              {isEs ? 'Cambiar a Testnet' : 'Switch to Testnet'}
            </button>
          )}
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="ui-page-header">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="ui-title">{t.title}</h1>
            <span className={isTestnet ? 'ui-badge-warn shrink-0' : 'ui-badge-danger shrink-0'}>
              {isTestnet ? 'Testnet' : isEs ? 'Sin Liquidez' : 'No Liquidity'}
            </span>
          </div>
          <p className="ui-subtitle">{isTestnet ? t.subtitleTestnet : t.subtitleMainnet}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              fetchPoolsData();
              fetchWalletBalances();
              fetchUserPositions();
            }}
            className="ui-btn-sm ui-btn-ghost"
            title={t.refreshTooltip}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{t.refresh}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (!effectiveAddress) {
                onConnectWallet();
                return;
              }
              setCreateModalOpen(true);
            }}
            className="ui-btn-sm ui-btn-secondary"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.btnCreatePair}</span>
          </button>
        </div>
      </div>

      {/* PROTOCOL METRICS STRIP */}
      <div className="ui-card p-4 sm:p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
          <div>
            <div className="ui-label mb-1">{t.statTvlLabel}</div>
            <div className="ui-stat">
              {loading ? '...' : `$${formatUsd(protocolStats?.totalTvlUsd ?? 0)}`}
            </div>
            <div className="text-[11px] text-ink-3 mt-1 flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isTestnet ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <span>{isTestnet ? (isEs ? 'Bóvedas activas' : 'Active vaults') : isEs ? 'Sin liquidez' : 'No liquidity'}</span>
            </div>
          </div>

          <div className="md:border-l md:border-line md:pl-5">
            <div className="ui-label mb-1">{t.statVolumeLabel}</div>
            <div className="ui-stat">${formatUsd(protocolStats?.totalVolumeUsd ?? 0)}</div>
            <div className="text-[11px] text-ink-3 mt-1">
              {isEs ? 'Swaps on-chain' : 'On-chain swaps'}
            </div>
          </div>

          <div className="border-t border-line pt-3 md:border-t-0 md:pt-0 md:border-l md:pl-5">
            <div className="ui-label mb-1">{t.statFeesLabel}</div>
            <div className="ui-stat text-emerald-600 dark:text-emerald-400">
              ${formatUsd(protocolStats?.totalCumulativeFeesUsd ?? 0, 2, 2)}
            </div>
            <div className="text-[11px] text-ink-3 mt-1">
              {isEs ? '0.20% LPs · 0.10% Protocolo' : '0.20% LPs · 0.10% Protocol'}
            </div>
          </div>

          <div className="border-t border-line pt-3 md:border-t-0 md:pt-0 md:border-l md:pl-5">
            <div className="ui-label mb-1">{t.statPairsLabel}</div>
            <div className="ui-stat flex items-baseline gap-1.5">
              <span>{protocolStats?.activePoolsCount ?? 0}</span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{t.statActive}</span>
              <span className="text-xs text-ink-3">/</span>
              <span>{protocolStats?.noLiquidityPoolsCount ?? 0}</span>
              <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">{t.statNoLiq}</span>
            </div>
            <div className="text-[11px] text-ink-3 mt-1">
              {isEs ? 'PUSD / USDT activo en Testnet' : 'PUSD / USDT active on Testnet'}
            </div>
          </div>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="ui-segment w-full sm:w-auto grid grid-cols-4 sm:inline-flex">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`ui-segment-item !px-2 sm:!px-3.5 text-[11px] sm:text-xs whitespace-nowrap text-center ${
              activeTab === 'all' ? 'ui-segment-item-active' : ''
            }`}
          >
            {t.tabAll} ({allPools.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('active')}
            className={`ui-segment-item !px-2 sm:!px-3.5 text-[11px] sm:text-xs whitespace-nowrap text-center ${
              activeTab === 'active' ? 'ui-segment-item-active' : ''
            }`}
          >
            {t.tabActive} ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bootstrapping')}
            className={`ui-segment-item !px-2 sm:!px-3.5 text-[11px] sm:text-xs whitespace-nowrap text-center ${
              activeTab === 'bootstrapping' ? 'ui-segment-item-active' : ''
            }`}
          >
            <span className="sm:hidden">{isEs ? 'Fondeo' : 'Funding'}</span>
            <span className="hidden sm:inline">{t.tabBootstrapping}</span> ({bootstrappingCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('my-positions')}
            className={`ui-segment-item !px-2 sm:!px-3.5 text-[11px] sm:text-xs whitespace-nowrap text-center ${
              activeTab === 'my-positions' ? 'ui-segment-item-active' : ''
            }`}
          >
            <span className="sm:hidden">{isEs ? 'Posiciones' : 'Positions'}</span>
            <span className="hidden sm:inline">{t.tabMyPositions}</span> ({positions.length})
          </button>
        </div>

        {activeTab !== 'my-positions' && (
          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="ui-input pl-8 !h-9 text-xs"
            />
          </div>
        )}
      </div>

      {/* MAIN WORKSPACE */}
      {activeTab !== 'my-positions' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN (7 Cols): DIRECTORY + INSPECTOR + POSITIONS */}
          <div className="lg:col-span-7 space-y-6">
            {/* POOL DIRECTORY CARD */}
            <div className="ui-card overflow-hidden">
              <div className="hidden sm:grid grid-cols-12 gap-2 px-5 py-2.5 text-xs font-medium text-ink-3 border-b border-line">
                <div className="col-span-6">{isEs ? 'Par / Bóveda' : 'Pool'}</div>
                <div className="col-span-2">{t.poolTvl}</div>
                <div className="col-span-2">{t.annualApy}</div>
                <div className="col-span-2 text-right">{isEs ? 'Estado' : 'Status'}</div>
              </div>

              {filteredPools.length === 0 ? (
                <div className="p-8 text-center space-y-3">
                  <p className="ui-muted">
                    {isEs ? 'No hay pools que coincidan con este filtro.' : 'No liquidity pools match this filter.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('all');
                      setSearchQuery('');
                    }}
                    className="ui-btn-sm ui-btn-secondary"
                  >
                    {isEs ? 'Mostrar todos los pools' : 'Show all pools'}
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-line">
                  {filteredPools.map(pool => {
                    const isPoolActive = pool.status === 'ACTIVE' && Boolean(pool.hasLiquidity);
                    const isSelected = activePool?.id === pool.id;
                    const { pctA, pctB } = getReserveSplit(pool.reserveAValueUsd, pool.reserveBValueUsd);

                    return (
                      <div
                        key={pool.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleSelectPool(pool)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleSelectPool(pool);
                          }
                        }}
                        className={`relative w-full text-left px-4 sm:px-5 py-4 transition-colors cursor-pointer ${
                          isSelected ? 'bg-surface-2/85' : 'hover:bg-surface-2/50'
                        }`}
                      >
                        {isSelected && (
                          <span className="absolute left-0 top-3 bottom-3 w-0.5 rounded-r bg-primary" />
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 sm:gap-2 sm:items-center">
                          {/* Pair + Metadata (max 1 extra badge) */}
                          <div className="sm:col-span-6 flex items-center justify-between sm:justify-start gap-2.5">
                            <div className="flex items-center gap-3 min-w-0">
                              <PairIcons iconA={pool.iconA} iconB={pool.iconB} tokenA={pool.tokenA} tokenB={pool.tokenB} />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-semibold text-sm text-ink whitespace-nowrap">
                                    {pool.pair}
                                  </span>
                                  {pool.isSponsorPool ? (
                                    <span className="ui-badge whitespace-nowrap">{t.sponsorBadge}</span>
                                  ) : pool.isVerified ? (
                                    <span className="ui-badge whitespace-nowrap">{t.verifiedOfficial}</span>
                                  ) : (
                                    <span className="ui-badge whitespace-nowrap">{t.communityBadge}</span>
                                  )}
                                </div>
                                <div className="text-xs text-ink-3 truncate mt-0.5">
                                  {pool.networkBadgeA} ⟷ {pool.networkBadgeB}
                                </div>
                              </div>
                            </div>

                            {/* Mobile-only right status */}
                            <div className="sm:hidden shrink-0">
                              <PoolStatusBadge pool={pool} t={t} />
                            </div>
                          </div>

                          {/* TVL & Depth Skew */}
                          <div className="sm:col-span-2 flex sm:block items-center justify-between gap-2">
                            <span className="sm:hidden ui-label">{t.poolTvl}</span>
                            <div className="text-right sm:text-left">
                              <div className="text-sm font-semibold text-ink tabular-nums">
                                ${formatUsd(pool.tvlUsd)}
                              </div>
                              <div className="mt-1 flex items-center gap-1.5 justify-end sm:justify-start">
                                <div className="w-12 h-1 rounded-full bg-surface-3 overflow-hidden flex shrink-0">
                                  {pool.tvlUsd > 0 ? (
                                    <>
                                      <div className="h-full bg-emerald-500" style={{ width: `${pctA}%` }} />
                                      <div className="h-full bg-sky-500" style={{ width: `${pctB}%` }} />
                                    </>
                                  ) : null}
                                </div>
                                <span className="text-[11px] text-ink-3 tabular-nums whitespace-nowrap">
                                  ${formatUsd(pool.totalVolumeUsd, 0, 0)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* APY & Fee */}
                          <div className="sm:col-span-2 flex sm:block items-center justify-between gap-2">
                            <span className="sm:hidden ui-label">{t.annualApy}</span>
                            <div className="text-right sm:text-left tabular-nums">
                              <div
                                className={`text-sm font-semibold ${
                                  isPoolActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-ink-3'
                                }`}
                              >
                                {`${(pool.apyPercentage || 0).toFixed(1)}%`}
                              </div>
                              <div className="text-[11px] text-ink-3">0.20% fee</div>
                            </div>
                          </div>

                          {/* Desktop Status + Quick Select */}
                          <div className="hidden sm:flex sm:col-span-2 items-center justify-end gap-2">
                            <PoolStatusBadge pool={pool} t={t} />
                          </div>
                        </div>

                        {/* Mobile tap shortcut */}
                        <div className="sm:hidden mt-2.5 pt-2.5 border-t border-line flex items-center justify-between text-xs">
                          <span className="text-ink-3">
                            {isPoolActive
                              ? isEs ? 'Bóveda activa en vivo' : 'Live active vault'
                              : isEs ? 'Disponible para inicializar' : 'Ready to seed liquidity'}
                          </span>
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              handleSelectPool(pool, true);
                            }}
                            className="font-medium text-primary inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>{isEs ? 'Seleccionar' : 'Select'}</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* SELECTED POOL INSPECTOR */}
            {activePool && (
              <SelectedPoolInspector
                pool={activePool}
                isEs={isEs}
                t={t}
                detailsOpen={detailsOpen}
                onToggleDetails={() => setDetailsOpen(o => !o)}
                copiedKey={copiedKey}
                onCopy={copyText}
                onVerifyPool={handleVerifyPool}
              />
            )}

            {/* USER LP POSITIONS SUMMARY */}
            <LiquidityPositionsSection
              positions={positions}
              effectiveAddress={effectiveAddress}
              isEs={isEs}
              t={t}
              showExploreButton={false}
              onExplorePools={() => setActiveTab('all')}
              onConnectWallet={onConnectWallet}
              onRefresh={() => {
                fetchUserPositions();
                fetchWalletBalances();
              }}
              onOpenWithdraw={openWithdrawModal}
            />
          </div>

          {/* RIGHT COLUMN (5 Cols): INTERACTIVE LIQUIDITY WORKBENCH */}
          <div id="pools-workbench" className="lg:col-span-5 lg:sticky lg:top-6">
            {activePool && (
              <div className="ui-card p-5 sm:p-6 space-y-4">
                {/* Workbench Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <PairIcons
                      iconA={activePool.iconA}
                      iconB={activePool.iconB}
                      tokenA={activePool.tokenA}
                      tokenB={activePool.tokenB}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <h2 className="ui-section-title truncate">
                        {isEs ? 'Aportar liquidez' : 'Add liquidity'} · {activePool.pair}
                      </h2>
                      <p className="text-xs text-ink-3 truncate">
                        {isEs ? 'Depósito unilateral no-custodio' : 'Single-sided non-custodial vault'}
                      </p>
                    </div>
                  </div>
                  <span className={activePool.hasLiquidity ? 'ui-badge-success shrink-0' : 'ui-badge shrink-0'}>
                    {`${(activePool.apyPercentage || 0).toFixed(1)}% APY`}
                  </span>
                </div>

                {/* Single-Asset Segmented Selector */}
                <div className="ui-segment grid grid-cols-2 w-full">
                  <button
                    type="button"
                    onClick={() => {
                      setDepositToken(activePool.tokenB);
                      setDepositAmount('');
                    }}
                    className={`ui-segment-item flex items-center justify-center gap-1.5 ${
                      depositToken === activePool.tokenB ? 'ui-segment-item-active' : ''
                    }`}
                  >
                    <img src={activePool.iconB} alt="" className="w-4 h-4 rounded-full object-contain" />
                    <span className="truncate">
                      {activePool.tokenB} ({getChainShortLabel(activePool.tokenB)})
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDepositToken(activePool.tokenA);
                      setDepositAmount('');
                    }}
                    className={`ui-segment-item flex items-center justify-center gap-1.5 ${
                      depositToken === activePool.tokenA ? 'ui-segment-item-active' : ''
                    }`}
                  >
                    <img src={activePool.iconA} alt="" className="w-4 h-4 rounded-full object-contain" />
                    <span className="truncate">
                      {activePool.tokenA} ({getChainShortLabel(activePool.tokenA)})
                    </span>
                  </button>
                </div>

                {/* Unified Amount Input Panel */}
                <div className="ui-panel p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-ink-3">{t.depositAmountLabel}</span>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-ink-3 tabular-nums truncate">
                        {t.balanceLabel}{' '}
                        <span className="font-medium text-ink">
                          {formatToken(currentBalance)} {depositToken}
                        </span>
                      </span>
                      {isTestnet && (depositToken === 'USDT' || depositToken === 'PUSD') && (
                        <button
                          type="button"
                          disabled={faucetClaiming}
                          onClick={() => handleClaimTestnetFaucet(depositToken)}
                          className="text-primary hover:text-primary-hover font-medium cursor-pointer disabled:opacity-50 shrink-0"
                        >
                          {faucetClaiming
                            ? isEs ? 'Enviando...' : 'Sending...'
                            : isEs ? 'Faucet' : 'Faucet'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={depositAmount}
                      onChange={e => setDepositAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-transparent text-2xl font-semibold text-ink tabular-nums placeholder:text-ink-3 outline-none"
                    />
                    <div className="ui-token-chip cursor-default">
                      <img
                        src={depositToken === activePool.tokenA ? activePool.iconA : activePool.iconB}
                        alt=""
                        className="w-5 h-5 rounded-full object-contain"
                      />
                      <span>{depositToken}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-line">
                    <span className="text-xs text-ink-3 tabular-nums">
                      ≈ ${formatUsd(depositValueUsd)} USD
                    </span>
                    <div className="flex items-center gap-1">
                      {currentBalance > 0 ? (
                        [25, 50, 75, 100].map(pct => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => handleSetQuickAmount(pct)}
                            className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-surface text-ink-2 hover:text-ink border border-line cursor-pointer transition-colors"
                          >
                            {pct === 100 ? 'MAX' : `${pct}%`}
                          </button>
                        ))
                      ) : (
                        [50, 100, 500, 1000].map(usd => (
                          <button
                            key={usd}
                            type="button"
                            onClick={() => handleSetUsdPreset(usd)}
                            className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-surface text-ink-2 hover:text-ink border border-line cursor-pointer transition-colors tabular-nums"
                          >
                            ${usd}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* BCH Covenant Sign / QR Progressive Panel (only when BCH/CashToken selected) */}
                {!isEvmDeposit && (
                  <div className="ui-panel p-3.5 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-ink-2 font-medium">
                        {hasOneClickBchSign
                          ? isEs ? 'Firma 1-clic lista (Paytaca / WalletConnect)' : '1-click signing ready (Paytaca / WC)'
                          : isEs ? 'Depósito en Covenant BCH (P2SH32)' : 'BCH Covenant deposit (P2SH32)'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setManualBchOpen(o => !o)}
                        className="text-ink-3 hover:text-ink inline-flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <span>{isEs ? 'QR / TXID' : 'QR / TXID'}</span>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${manualBchOpen ? 'rotate-180' : ''}`} />
                      </button>
                    </div>

                    {(manualBchOpen || (Boolean(connectedBch) && !hasOneClickBchSign)) && (
                      <div className="space-y-2.5 pt-2 border-t border-line">
                        {!hasOneClickBchSign && bchVaultQr && (
                          <div className="w-28 h-28 mx-auto p-1.5 bg-white rounded-xl border border-line">
                            <img src={bchVaultQr} alt="Covenant QR" className="w-full h-full object-contain" />
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-2 bg-surface px-2.5 py-2 rounded-control border border-line">
                          <span className="font-mono text-[11px] text-ink truncate">
                            {selectedBchVaultAddress}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              copyText(
                                selectedBchVaultAddress,
                                'workbench-vault'
                              )
                            }
                            className="text-[11px] font-medium text-ink-2 hover:text-ink flex items-center gap-1 shrink-0 cursor-pointer"
                          >
                            {copiedKey === 'workbench-vault' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedKey === 'workbench-vault' ? (isEs ? 'Copiado' : 'Copied') : isEs ? 'Copiar' : 'Copy'}</span>
                          </button>
                        </div>

                        <input
                          type="text"
                          value={bchDepositTxHash}
                          onChange={e => setBchDepositTxHash(e.target.value)}
                          placeholder={
                            isEs
                              ? 'TXID manual opcional (vacío = auto-detectar)'
                              : 'Optional manual TXID (blank = auto-detect)'
                          }
                          className="ui-input !h-9 font-mono text-xs bg-surface border-line"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Real-Time LP Projection Summary */}
                <div className="ui-panel px-4 py-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-ink-3">{t.sharesToReceive}</span>
                    <span className="tabular-nums font-semibold text-ink">
                      {formatToken(calcEstimatedShares(), 4)} LP
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-ink-3">{t.newShareRatio}</span>
                    <span className="tabular-nums font-medium text-ink">{calcNewPoolSharePercent()}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-ink-3">
                      {t.projectedYield} ({displayApy.toFixed(1)}%)
                    </span>
                    <span className="tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                      +${formatUsd(estimatedMonthlyUsd)} / {isEs ? 'mes' : 'mo'} · +${formatUsd(estimatedAnnualUsd)} / {isEs ? 'año' : 'yr'}
                    </span>
                  </div>
                </div>

                {/* Primary Next-Step CTA */}
                {!isTestnet && !activePool.hasLiquidity ? (
                  <button
                    type="button"
                    onClick={() => {
                      onToggleNetwork?.('testnet');
                      showToast(isEs ? 'Red cambiada a Testnet' : 'Network switched to Testnet', 'success');
                    }}
                    className="ui-btn-secondary ui-btn-lg w-full"
                  >
                    <Lock className="w-4 h-4 text-rose-500" />
                    <span>{isEs ? 'Cambiar a Testnet (PUSD / USDT)' : 'Switch to Testnet (PUSD / USDT)'}</span>
                  </button>
                ) : !hasRequiredWallet ? (
                  <button
                    type="button"
                    onClick={onConnectWallet}
                    className="ui-btn-primary ui-btn-lg w-full rounded-full"
                  >
                    <Wallet className="w-4 h-4" />
                    <span>
                      {isEvmDeposit
                        ? isEs ? `Conectar wallet EVM para depositar ${depositToken}` : `Connect EVM wallet to deposit ${depositToken}`
                        : isEs ? `Conectar wallet BCH para depositar ${depositToken}` : `Connect BCH wallet to deposit ${depositToken}`}
                    </span>
                  </button>
                ) : validDepositNum <= 0 ? (
                  <button
                    type="button"
                    onClick={handleAddLiquidity}
                    className="ui-btn-disabled ui-btn-lg w-full rounded-full"
                  >
                    {isEs ? `Ingresa monto de ${depositToken}` : `Enter ${depositToken} amount`}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleAddLiquidity}
                    disabled={isSubmitting}
                    className="ui-btn-primary ui-btn-lg w-full rounded-full"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>{web3StepMsg || t.btnSubmittingAdd}</span>
                      </>
                    ) : isEvmDeposit ? (
                      isEs
                        ? `Depositar ${depositAmount} ${depositToken} en bóveda`
                        : `Deposit ${depositAmount} ${depositToken} to vault`
                    ) : hasOneClickBchSign && !bchDepositTxHash.trim() ? (
                      isEs
                        ? `Firmar y depositar ${depositAmount} ${depositToken}`
                        : `Sign & deposit ${depositAmount} ${depositToken}`
                    ) : (
                      t.btnConfirmAddBch
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* MY POSITIONS FOCUSED VIEW */
        <LiquidityPositionsSection
          positions={positions}
          effectiveAddress={effectiveAddress}
          isEs={isEs}
          t={t}
          showExploreButton={true}
          onExplorePools={() => setActiveTab('all')}
          onConnectWallet={onConnectWallet}
          onRefresh={() => {
            fetchUserPositions();
            fetchWalletBalances();
          }}
          onOpenWithdraw={openWithdrawModal}
        />
      )}

      {/* REMOVE LIQUIDITY MODAL (ON-CHAIN VAULT RELEASE) */}
      <AnimatePresence>
        {actionModal === 'remove' && selectedPosition && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[120] flex items-start sm:items-center justify-center p-4 overflow-y-auto">
            <motion.div
              key="remove-liquidity-modal"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-md bg-surface rounded-card p-5 sm:p-6 border border-line shadow-soft relative my-6 space-y-4"
            >
              <div className="flex justify-between items-center pb-3 border-b border-line">
                <div className="flex items-center gap-2.5">
                  <PairIcons
                    iconA={selectedPosition.iconA}
                    iconB={selectedPosition.iconB}
                    tokenA={selectedPosition.tokenA}
                    tokenB={selectedPosition.tokenB}
                    size="sm"
                  />
                  <h3 className="ui-section-title">
                    {t.modalRemoveTitle} · {selectedPosition.pair}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActionModal(null);
                    setSelectedPosition(null);
                  }}
                  className="w-8 h-8 rounded-full bg-surface-2 text-ink-3 hover:text-ink flex items-center justify-center cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Percentage Slider */}
              <div className="ui-panel p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="ui-label">{t.withdrawPctLabel}</span>
                  <span className="text-lg font-semibold text-primary tabular-nums">{burnPercentage}%</span>
                </div>

                <input
                  type="range"
                  min="1"
                  max="100"
                  value={burnPercentage}
                  onChange={e => setBurnPercentage(parseInt(e.target.value, 10))}
                  className="w-full accent-primary cursor-pointer"
                />

                <div className="flex gap-2">
                  {[25, 50, 75, 100].map(pct => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setBurnPercentage(pct)}
                      className={`flex-1 py-1.5 rounded-control text-xs font-medium cursor-pointer transition-colors border ${
                        burnPercentage === pct
                          ? 'bg-ink text-canvas border-ink'
                          : 'bg-surface text-ink-2 border-line hover:text-ink'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Payout Asset Selector */}
              {(() => {
                const payoutOptA = selectedPosition.tokenA === 'BCH' ? 'PUSD' : selectedPosition.tokenA;
                const payoutOptB = selectedPosition.tokenB || 'USDT';
                const optAIcon =
                  selectedPosition.tokenA === 'BCH' ? '/PUSD.png' : selectedPosition.iconA || '/PUSD.png';
                const optBIcon = selectedPosition.iconB || '/USDT.png';
                return (
                  <div className="space-y-2">
                    <label className="ui-label block">{t.withdrawAssetLabel}</label>
                    <div className="ui-segment grid grid-cols-2 w-full">
                      <button
                        type="button"
                        onClick={() => setWithdrawToken(payoutOptB)}
                        className={`ui-segment-item flex items-center justify-center gap-1.5 ${
                          withdrawToken === payoutOptB ? 'ui-segment-item-active' : ''
                        }`}
                      >
                        <img src={optBIcon} className="w-4 h-4 rounded-full object-contain" alt="" />
                        <span className="truncate">
                          {payoutOptB} ({getChainShortLabel(payoutOptB)})
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setWithdrawToken(payoutOptA)}
                        className={`ui-segment-item flex items-center justify-center gap-1.5 ${
                          withdrawToken === payoutOptA ? 'ui-segment-item-active' : ''
                        }`}
                      >
                        <img src={optAIcon} className="w-4 h-4 rounded-full object-contain" alt="" />
                        <span className="truncate">
                          {payoutOptA} ({getChainShortLabel(payoutOptA)})
                        </span>
                      </button>
                    </div>
                    <div className="text-[11px] font-mono text-ink-3 truncate">
                      {isEs ? 'Destino: ' : 'Destination: '}
                      {isEvmSymbol(withdrawToken)
                        ? connectedEvm || (isEs ? 'Conecta tu billetera EVM' : 'Connect your EVM wallet')
                        : connectedBch
                        ? convertCashAddressNetwork(connectedBch, isTestnet, true)
                        : isEs
                        ? 'Conecta tu billetera BCH'
                        : 'Connect your BCH wallet'}
                    </div>
                  </div>
                );
              })()}

              {/* Payout Summary */}
              <div className="ui-panel p-4 text-xs space-y-2">
                <div className="flex justify-between text-ink-2">
                  <span>{t.sharesToBurn}</span>
                  <span className="tabular-nums font-medium text-ink">
                    {formatToken(selectedPosition.shares * (burnPercentage / 100), 4)} /{' '}
                    {formatToken(selectedPosition.shares, 4)}
                  </span>
                </div>
                <div className="flex justify-between text-ink-2">
                  <span>{t.payoutToReceive}</span>
                  <span className="tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatToken(selectedPosition.totalValueUsd * (burnPercentage / 100), 4)} {withdrawToken}
                  </span>
                </div>
                <div className="pt-2 border-t border-line flex justify-between font-semibold">
                  <span className="text-ink">{t.totalUsdReturn}</span>
                  <span className="text-emerald-600 dark:text-emerald-400 tabular-nums text-sm">
                    ${formatUsd(selectedPosition.totalValueUsd * (burnPercentage / 100))} USD
                  </span>
                </div>
                <div className="flex justify-between text-ink-3">
                  <span>{t.feeProfit}</span>
                  <span className="tabular-nums font-medium text-ink">
                    +${formatUsd(selectedPosition.profitUsd * (burnPercentage / 100), 4, 2)} ({selectedPosition.profitPercentage}%)
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRemoveLiquidity}
                disabled={isSubmitting}
                className="w-full ui-btn-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-full transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{t.btnSubmittingRemove}</span>
                  </>
                ) : (
                  t.btnConfirmRemove
                )}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CREATE CUSTOM POOL MODAL */}
      <AnimatePresence>
        {createModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-start sm:items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
            <motion.div
              key="create-custom-pool-modal"
              initial={{ scale: 0.96, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 8 }}
              className="w-full max-w-lg bg-surface rounded-card border border-line p-5 sm:p-6 shadow-soft space-y-4 my-6 text-left"
            >
              <div className="flex items-center justify-between pb-3 border-b border-line">
                <div>
                  <h3 className="ui-section-title">{t.createTitle}</h3>
                  <p className="text-xs text-ink-3 mt-0.5">{t.createSubtitle}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center text-ink-3 hover:text-ink transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreatePool} className="space-y-3.5">
                <div className="ui-panel p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium text-ink">{t.baseTokenTitle}</span>
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {[
                        {
                          sym: 'PUSD',
                          name: 'ParyonUSD',
                          dec: '6',
                          cat: ''
                        },
                        {
                          sym: 'LIFT',
                          name: 'Paytaca LIFT',
                          dec: '2',
                          cat: '5932b2fd4915d6a75d3ec53282cd49118149a2176ee67ed68b1111ff0786f7fc'
                        },
                        {
                          sym: 'MUSD',
                          name: 'Moria USD',
                          dec: '6',
                          cat: 'b7d0c2e800000000000000000000000000000000000000000000000000000000'
                        }
                      ].map(preset => (
                        <button
                          key={preset.sym}
                          type="button"
                          onClick={() =>
                            setCreateForm(prev => ({
                              ...prev,
                              tokenA: preset.sym,
                              tokenAName: preset.name,
                              decimalsA: preset.dec,
                              categoryIdA: preset.cat
                            }))
                          }
                          className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-surface border border-line text-ink-2 hover:text-ink cursor-pointer transition-colors"
                        >
                          {preset.sym}
                        </button>
                      ))}
                      <span className="ui-badge">{isTestnet ? 'Chipnet CashToken' : 'BCH CashToken'}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-12 gap-2">
                    <input
                      type="text"
                      required
                      value={createForm.tokenA}
                      onChange={e => setCreateForm({ ...createForm, tokenA: e.target.value.toUpperCase() })}
                      placeholder={t.symbolPlaceholder}
                      className="col-span-4 ui-input bg-surface border-line font-mono font-semibold"
                    />
                    <input
                      type="text"
                      value={createForm.tokenAName}
                      onChange={e => setCreateForm({ ...createForm, tokenAName: e.target.value })}
                      placeholder={t.namePlaceholder}
                      className="col-span-5 ui-input bg-surface border-line"
                    />
                    <select
                      value={createForm.decimalsA}
                      onChange={e => setCreateForm({ ...createForm, decimalsA: e.target.value })}
                      aria-label={t.decimalsLabel}
                      title={t.decimalsLabel}
                      className="col-span-3 ui-input bg-surface border-line text-xs cursor-pointer"
                    >
                      {getDecimalOptions(createForm.decimalsA).map(dec => (
                        <option key={dec} value={dec}>
                          {dec} dec
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="ui-label block mb-1">{t.categoryIdLabel}</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={createForm.categoryIdA}
                        onChange={e =>
                          setCreateForm({ ...createForm, categoryIdA: e.target.value.toLowerCase() })
                        }
                        placeholder={t.categoryIdPlaceholder}
                        className="ui-input !h-9 bg-surface border-line font-mono text-xs flex-1"
                      />
                      {CATEGORY_HEX_RE.test(createForm.categoryIdA.trim().toLowerCase()) && (
                        <button
                          type="button"
                          onClick={() => resolveCashTokenSide('A', createForm.categoryIdA, true)}
                          title={t.lookupRefreshTip}
                          aria-label={t.lookupRefreshTip}
                          className="h-9 w-9 shrink-0 rounded-control border border-line bg-surface flex items-center justify-center text-ink-2 hover:text-ink cursor-pointer transition-colors"
                        >
                          <RefreshCw
                            className={`w-3.5 h-3.5 ${lookupBySide.A.status === 'loading' ? 'animate-spin' : ''}`}
                          />
                        </button>
                      )}
                    </div>
                    {renderCategoryLookupFeedback('A')}
                  </div>
                </div>

                <div className="ui-panel p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-ink">{t.quoteTokenTitle}</span>
                    <span className="ui-badge">
                      {createForm.tokenBMode === 'USDT' || createForm.tokenBMode === 'USDC'
                        ? isTestnet
                          ? 'Polygon Amoy'
                          : 'Polygon PoS'
                        : isTestnet
                        ? 'Chipnet CashTokens'
                        : 'BCH CashTokens'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={createForm.tokenBMode}
                      onChange={e => {
                        const mode = e.target.value as 'USDT' | 'USDC' | 'PUSD' | 'CUSTOM_CASHTOKEN';
                        if (mode === 'USDT') {
                          setCreateForm(prev => ({
                            ...prev,
                            tokenBMode: 'USDT',
                            tokenB: 'USDT',
                            tokenBName: 'Tether USD',
                            categoryIdB: '',
                            decimalsB: '6',
                            networkB: isTestnet ? 'Polygon Amoy (Testnet)' : 'Polygon (Mainnet)',
                            networkBadgeB: isTestnet ? 'Polygon Amoy' : 'Polygon PoS'
                          }));
                        } else if (mode === 'USDC') {
                          setCreateForm(prev => ({
                            ...prev,
                            tokenBMode: 'USDC',
                            tokenB: 'USDC',
                            tokenBName: 'USD Coin',
                            categoryIdB: '',
                            decimalsB: '6',
                            networkB: isTestnet ? 'Polygon Amoy (Testnet)' : 'Polygon (Mainnet)',
                            networkBadgeB: isTestnet ? 'Polygon Amoy' : 'Polygon PoS'
                          }));
                        } else if (mode === 'PUSD') {
                          setCreateForm(prev => ({
                            ...prev,
                            tokenBMode: 'PUSD',
                            tokenB: 'PUSD',
                            tokenBName: 'ParyonUSD',
                            categoryIdB: '',
                            decimalsB: '6',
                            networkB: isTestnet ? 'BCH Chipnet (Testnet4)' : 'Bitcoin Cash (Mainnet)',
                            networkBadgeB: isTestnet ? 'Chipnet CashTokens' : 'BCH CashTokens'
                          }));
                        } else {
                          setCreateForm(prev => ({
                            ...prev,
                            tokenBMode: 'CUSTOM_CASHTOKEN',
                            tokenB: '',
                            tokenBName: '',
                            categoryIdB: '',
                            decimalsB: '6',
                            networkB: isTestnet ? 'BCH Chipnet (Testnet4)' : 'Bitcoin Cash (Mainnet)',
                            networkBadgeB: isTestnet ? 'Chipnet CashTokens' : 'BCH CashTokens'
                          }));
                        }
                      }}
                      className="ui-input bg-surface border-line font-medium cursor-pointer text-xs"
                    >
                      <option value="USDT">USDT ({isTestnet ? 'Polygon Amoy' : 'Polygon PoS'})</option>
                      <option value="USDC">USDC ({isTestnet ? 'Polygon Amoy' : 'Polygon PoS'})</option>
                      <option value="PUSD">PUSD ({isTestnet ? 'BCH Chipnet' : 'BCH CashTokens'})</option>
                      <option value="CUSTOM_CASHTOKEN">
                        {isEs ? 'Otro CashToken (BCH)' : 'Custom CashToken (BCH)'}
                      </option>
                    </select>

                    <div className="relative">
                      <input
                        type="number"
                        step="any"
                        value={createForm.initialPriceUsd}
                        onChange={e => setCreateForm({ ...createForm, initialPriceUsd: e.target.value })}
                        placeholder="0.01"
                        className="ui-input bg-surface border-line font-mono pr-11"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-medium text-ink-3 pointer-events-none">
                        USD
                      </span>
                    </div>
                  </div>

                  {createForm.tokenBMode === 'CUSTOM_CASHTOKEN' && (
                    <div className="space-y-2 pt-2 border-t border-line">
                      <div className="grid grid-cols-12 gap-2">
                        <input
                          type="text"
                          required
                          value={createForm.tokenB}
                          onChange={e => setCreateForm({ ...createForm, tokenB: e.target.value.toUpperCase() })}
                          placeholder={t.symbolPlaceholder}
                          className="col-span-4 ui-input bg-surface border-line font-mono font-semibold"
                        />
                        <input
                          type="text"
                          value={createForm.tokenBName}
                          onChange={e => setCreateForm({ ...createForm, tokenBName: e.target.value })}
                          placeholder={t.namePlaceholder}
                          className="col-span-5 ui-input bg-surface border-line"
                        />
                        <select
                          value={createForm.decimalsB}
                          onChange={e => setCreateForm({ ...createForm, decimalsB: e.target.value })}
                          aria-label={t.decimalsLabel}
                          title={t.decimalsLabel}
                          className="col-span-3 ui-input bg-surface border-line text-xs cursor-pointer"
                        >
                          {getDecimalOptions(createForm.decimalsB).map(dec => (
                            <option key={dec} value={dec}>
                              {dec} dec
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="ui-label block mb-1">{t.categoryIdLabel} (Token 2)</label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={createForm.categoryIdB}
                            onChange={e =>
                              setCreateForm({ ...createForm, categoryIdB: e.target.value.toLowerCase() })
                            }
                            placeholder={t.categoryIdPlaceholder}
                            className="ui-input !h-9 bg-surface border-line font-mono text-xs flex-1"
                          />
                          {CATEGORY_HEX_RE.test(createForm.categoryIdB.trim().toLowerCase()) && (
                            <button
                              type="button"
                              onClick={() => resolveCashTokenSide('B', createForm.categoryIdB, true)}
                              title={t.lookupRefreshTip}
                              aria-label={t.lookupRefreshTip}
                              className="h-9 w-9 shrink-0 rounded-control border border-line bg-surface flex items-center justify-center text-ink-2 hover:text-ink cursor-pointer transition-colors"
                            >
                              <RefreshCw
                                className={`w-3.5 h-3.5 ${lookupBySide.B.status === 'loading' ? 'animate-spin' : ''}`}
                              />
                            </button>
                          )}
                        </div>
                        {renderCategoryLookupFeedback('B')}
                      </div>
                    </div>
                  )}
                </div>

                {/* Optional Logo Toggle */}
                <div className="border border-line rounded-panel p-3 bg-surface">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="w-full flex items-center justify-between text-xs font-medium text-ink-2 hover:text-ink cursor-pointer transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-ink-3" />
                      {t.advancedOptions}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-ink-3 transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {showAdvanced && (
                    <div className="space-y-2.5 pt-3 border-t border-line mt-2.5 text-xs">
                      <div>
                        <label className="ui-label block mb-1">
                          {t.iconLabel} ({createForm.tokenA || 'Token 1'})
                        </label>
                        <input
                          type="text"
                          value={createForm.iconA}
                          onChange={e => setCreateForm({ ...createForm, iconA: e.target.value })}
                          placeholder={t.iconPlaceholder}
                          className="ui-input !h-9 bg-surface-2 font-mono text-xs"
                        />
                      </div>
                      {createForm.tokenBMode === 'CUSTOM_CASHTOKEN' && (
                        <div>
                          <label className="ui-label block mb-1">
                            {t.iconLabel} ({createForm.tokenB || 'Token 2'})
                          </label>
                          <input
                            type="text"
                            value={createForm.iconB}
                            onChange={e => setCreateForm({ ...createForm, iconB: e.target.value })}
                            placeholder={t.iconPlaceholder}
                            className="ui-input !h-9 bg-surface-2 font-mono text-xs"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Pool Launch Mode */}
                <div className="space-y-1.5">
                  <div className="ui-segment grid grid-cols-2 w-full">
                    <button
                      type="button"
                      onClick={() => setCreateForm({ ...createForm, poolMode: 'BOOTSTRAPPING' })}
                      className={`ui-segment-item ${
                        createForm.poolMode === 'BOOTSTRAPPING' ? 'ui-segment-item-active' : ''
                      }`}
                    >
                      {t.modeBootstrapping}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreateForm({ ...createForm, poolMode: 'STANDARD' })}
                      className={`ui-segment-item ${
                        createForm.poolMode === 'STANDARD' ? 'ui-segment-item-active' : ''
                      }`}
                    >
                      {t.modeStandard}
                    </button>
                  </div>
                  <p className="text-xs text-ink-3 px-1">
                    {createForm.poolMode === 'STANDARD' ? t.modeStandardDesc : t.modeBootstrappingDesc}
                  </p>
                </div>

                {createForm.poolMode === 'BOOTSTRAPPING' && (
                  <div className="grid grid-cols-2 gap-2.5 ui-panel p-3.5">
                    <div>
                      <label className="ui-label block mb-1">
                        {t.amountToDeposit} ({createForm.tokenA || 'Base'})
                      </label>
                      <input
                        type="number"
                        value={createForm.initialAmountA}
                        onChange={e => setCreateForm({ ...createForm, initialAmountA: e.target.value })}
                        placeholder="100000"
                        className="ui-input !h-9 bg-surface border-line font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="ui-label block mb-1">{t.targetTvl}</label>
                      <input
                        type="number"
                        value={createForm.targetTvlUsd}
                        onChange={e => setCreateForm({ ...createForm, targetTvlUsd: e.target.value })}
                        placeholder="2500"
                        className="ui-input !h-9 bg-surface border-line font-mono text-xs"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isCreatingPool || !createForm.tokenA.trim() || !createForm.tokenB.trim()}
                  className="ui-btn-primary ui-btn-lg w-full rounded-full"
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
