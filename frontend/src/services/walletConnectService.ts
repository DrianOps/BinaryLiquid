import { EthereumProvider } from '@walletconnect/ethereum-provider';
import SignClient from '@walletconnect/sign-client';
import type { SessionTypes } from '@walletconnect/types';
import { convertCashAddressNetwork, generateQrDataUrl, pubkeyToCashAddress } from '../utils/bchAddress';

export const WALLETCONNECT_PROJECT_ID =
  ((import.meta as any).env?.VITE_WALLETCONNECT_PROJECT_ID as string) ||
  '5f82a5af5c6aa90535d813b07f3216cc';

export const AMOY_CHAIN_CONFIG = {
  chainIdHex: '0x13882', // 80002
  chainId: 80002,
  chainName: 'Polygon Amoy Testnet',
  nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
  rpcUrls: ['https://80002.rpc.thirdweb.com', 'https://polygon-amoy.drpc.org'],
  blockExplorerUrls: ['https://amoy.polygonscan.com']
};

export const POLYGON_MAINNET_CONFIG = {
  chainIdHex: '0x89', // 137
  chainId: 137,
  chainName: 'Polygon PoS Mainnet',
  nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
  rpcUrls: ['https://polygon-bor.publicnode.com'],
  blockExplorerUrls: ['https://polygonscan.com']
};

export const DEPLOYED_TESTNET_CONTRACTS = {
  amoyVaultAddress: '0xc830c7cB16cd05bdEd8CA9d0c73E9038ed25Aa4A',
  amoyUsdtAddress: '0x1a29793F2a64424D09f56AD045827dF1F0Fa1A75',
  amoyUsdcAddress: '0x08d7CF325c44af76602922cBA6D37E4b267CDa71',
  chipnetVaultTokenAddress: 'bchtest:rvqse7cr2ptah2e34sl53r5utqwxl28fk84grvf5ufzd6n5tclme29g2zzvuj',
  chipnetPusdCategory: '6b6cf8de5963d67594a4565d49a7bcf3e668a18a7328828de16bd393ac00dcad',
  solanaDevnetUsdtMint: 'CMYCfg6aEDAvQCvR7Vb2hjRScfDn76rpiBdrnzPrWVnL',
  solanaDevnetVaultAddress: '2VGPfWsD8KU1mddNCrMsxiqK4eqgZV2cW38dLRYvHzYN'
};

const WC_METADATA = {
  name: 'BinaryLiquid Protocol',
  description: '100% Non-Custodial Cross-Chain Gateway connecting Bitcoin Cash CashTokens & Polygon',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://bliquid.xyz',
  icons: [typeof window !== 'undefined' ? `${window.location.origin}/logo.png` : 'https://bliquid.xyz/logo.png']
};

// ============================================================================
// 1. EIP-6963 MULTI-EXTENSION WALLET DISCOVERY (MetaMask, Rabby, Brave, Trust)
// ============================================================================
export interface DiscoveredEip6963Wallet {
  info: {
    uuid: string;
    name: string;
    icon: string;
    rdns: string;
  };
  provider: any;
}

const discoveredWallets = new Map<string, DiscoveredEip6963Wallet>();
let eip6963Initialized = false;
let activeInjectedProvider: any = null;

export function initEip6963Discovery(onUpdate?: (wallets: DiscoveredEip6963Wallet[]) => void): void {
  if (typeof window === 'undefined') return;

  if (!eip6963Initialized) {
    eip6963Initialized = true;
    window.addEventListener('eip6963:announceProvider', (event: any) => {
      const detail = event?.detail;
      if (detail?.info?.rdns && detail?.provider) {
        discoveredWallets.set(detail.info.rdns, detail);
        onUpdate?.(Array.from(discoveredWallets.values()));
      }
    });
  }

  window.dispatchEvent(new Event('eip6963:requestProvider'));
  onUpdate?.(Array.from(discoveredWallets.values()));
}

export function getDiscoveredEvmWallets(): DiscoveredEip6963Wallet[] {
  initEip6963Discovery();
  return Array.from(discoveredWallets.values());
}

export function isMobileBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function hasInjectedEvmWallet(): boolean {
  if (typeof window === 'undefined') return false;
  return discoveredWallets.size > 0 || Boolean((window as any).ethereum);
}

export function getMetaMaskDeepLink(): string {
  if (typeof window === 'undefined') return 'https://metamask.app.link/dapp/bliquid.xyz';
  const cleanUrl = window.location.href.replace(/^https?:\/\//, '');
  return `https://metamask.app.link/dapp/${cleanUrl}`;
}

// ============================================================================
// 2. EVM EVENT LISTENERS (accountsChanged / chainChanged / disconnect)
// ============================================================================
export interface EvmWalletEventCallbacks {
  onAccountsChanged?: (accounts: string[]) => void;
  onChainChanged?: (chainId: number) => void;
  onDisconnect?: () => void;
}

let evmEventCleanup: (() => void) | null = null;

function bindEvmProviderEvents(provider: any, callbacks?: EvmWalletEventCallbacks) {
  if (!provider || typeof provider.on !== 'function' || !callbacks) return;

  if (evmEventCleanup) {
    try { evmEventCleanup(); } catch (_) {}
    evmEventCleanup = null;
  }

  const handleAccounts = (accounts: string[]) => {
    callbacks.onAccountsChanged?.(accounts || []);
  };
  const handleChain = (chainIdHexOrNum: string | number) => {
    const parsed =
      typeof chainIdHexOrNum === 'number'
        ? chainIdHexOrNum
        : parseInt(String(chainIdHexOrNum), String(chainIdHexOrNum).startsWith('0x') ? 16 : 10);
    if (!isNaN(parsed)) callbacks.onChainChanged?.(parsed);
  };
  const handleDisconnect = () => {
    callbacks.onDisconnect?.();
  };

  provider.on('accountsChanged', handleAccounts);
  provider.on('chainChanged', handleChain);
  provider.on('disconnect', handleDisconnect);

  evmEventCleanup = () => {
    if (typeof provider.removeListener === 'function') {
      provider.removeListener('accountsChanged', handleAccounts);
      provider.removeListener('chainChanged', handleChain);
      provider.removeListener('disconnect', handleDisconnect);
    }
  };
}

// ============================================================================
// 3. WALLETCONNECT V2 EVM PROVIDER (`@walletconnect/ethereum-provider` 2.26)
// ============================================================================
let evmWcProvider: InstanceType<typeof EthereumProvider> | null = null;
let evmWcInitPromise: Promise<InstanceType<typeof EthereumProvider>> | null = null;

export async function getWalletConnectProvider(): Promise<InstanceType<typeof EthereumProvider>> {
  if (evmWcProvider) return evmWcProvider;
  if (evmWcInitPromise) return evmWcInitPromise;

  evmWcInitPromise = (async () => {
    try {
      const provider = await EthereumProvider.init({
        projectId: WALLETCONNECT_PROJECT_ID,
        showQrModal: true,
        chains: [],
        optionalChains: [80002, 137, 1, 56],
        rpcMap: {
          80002: 'https://polygon-amoy-bor-rpc.publicnode.com',
          137: 'https://polygon-bor.publicnode.com',
          1: 'https://ethereum-rpc.publicnode.com',
          56: 'https://bsc-rpc.publicnode.com'
        },
        metadata: WC_METADATA,
        qrModalOptions: {
          themeMode: 'dark',
          themeVariables: {
            '--wcm-accent-color': '#F7931A',
            '--wcm-background-color': '#080B11',
            '--wcm-z-index': '99999',
            '--w3m-z-index': '99999'
          } as any
        }
      });

      evmWcProvider = provider;
      return provider;
    } catch (err) {
      console.error('Failed to initialize WalletConnect EthereumProvider:', err);
      evmWcInitPromise = null;
      throw err;
    }
  })();

  return evmWcInitPromise;
}

export async function restoreEvmWalletConnectSession(
  callbacks?: EvmWalletEventCallbacks
): Promise<{ address: string; chainId: number; providerName: string } | null> {
  try {
    // Only initialize WalletConnect provider if an active session exists in localStorage
    const hasWcSession =
      typeof window !== 'undefined' &&
      Object.keys(localStorage).some(k => k.startsWith('wc@2:') && k.includes('session'));
    if (!hasWcSession) return null;

    const provider = await getWalletConnectProvider();
    if (provider.session && provider.accounts && provider.accounts.length > 0) {
      bindEvmProviderEvents(provider, callbacks);
      const peerName = provider.session?.peer?.metadata?.name || 'WalletConnect V2';
      return {
        address: provider.accounts[0],
        chainId: Number(provider.chainId) || 80002,
        providerName: peerName
      };
    }
  } catch (err) {
    console.warn('Silent WalletConnect EVM restore skipped:', err);
  }
  return null;
}

export async function connectWalletConnect(
  isTestnet = true,
  callbacks?: EvmWalletEventCallbacks
): Promise<{ address: string; chainId: number; providerName: string; provider: any }> {
  const provider = await getWalletConnectProvider();

  if (provider.session && provider.accounts && provider.accounts.length > 0) {
    bindEvmProviderEvents(provider, callbacks);
    const peerName = provider.session?.peer?.metadata?.name || 'WalletConnect V2';
    return {
      address: provider.accounts[0],
      chainId: Number(provider.chainId) || (isTestnet ? 80002 : 137),
      providerName: peerName,
      provider
    };
  }

  try {
    await provider.connect({
      optionalChains: isTestnet ? [80002, 137, 1, 56] : [137, 80002, 1, 56],
      rpcMap: {
        80002: 'https://polygon-amoy-bor-rpc.publicnode.com',
        137: 'https://polygon-bor.publicnode.com'
      }
    });
  } catch (err) {
    // Ensure clean state if modal was closed before pairing completed
    if (!provider.session) {
      try { await provider.disconnect(); } catch (_) {}
    }
    throw err;
  }

  if (!provider.accounts || provider.accounts.length === 0) {
    throw new Error('No se recibió ninguna cuenta EVM desde WalletConnect.');
  }

  bindEvmProviderEvents(provider, callbacks);
  const peerName = provider.session?.peer?.metadata?.name || 'WalletConnect V2';

  return {
    address: provider.accounts[0],
    chainId: Number(provider.chainId) || (isTestnet ? 80002 : 137),
    providerName: peerName,
    provider
  };
}

export async function disconnectWalletConnect(): Promise<void> {
  try {
    if (evmEventCleanup) {
      evmEventCleanup();
      evmEventCleanup = null;
    }
    if (evmWcProvider) {
      await evmWcProvider.disconnect();
    }
  } catch (err) {
    console.warn('Error during WalletConnect EVM disconnect:', err);
  } finally {
    evmWcProvider = null;
    evmWcInitPromise = null;
    activeInjectedProvider = null;
  }
}

// ============================================================================
// 4. INJECTED BROWSER EVM WALLET (MetaMask / Rabby / Brave / EIP-6963)
// ============================================================================
export async function connectInjectedWallet(
  options?: {
    rdns?: string;
    isTestnet?: boolean;
    autoSwitchNetwork?: boolean;
    callbacks?: EvmWalletEventCallbacks;
  }
): Promise<{ address: string; chainId: number; providerName: string }> {
  initEip6963Discovery();
  const win = typeof window !== 'undefined' ? (window as any) : {};

  let chosenProvider: any = null;
  let providerName = 'Browser Wallet';

  if (options?.rdns && discoveredWallets.has(options.rdns)) {
    const found = discoveredWallets.get(options.rdns)!;
    chosenProvider = found.provider;
    providerName = found.info.name;
  } else if (discoveredWallets.size > 0) {
    // Prefer MetaMask or Rabby if multiple extensions are present
    const list = Array.from(discoveredWallets.values());
    const preferred =
      list.find(w => w.info.rdns.includes('metamask')) ||
      list.find(w => w.info.rdns.includes('rabby')) ||
      list[0];
    chosenProvider = preferred.provider;
    providerName = preferred.info.name;
  } else if (win.ethereum) {
    if (Array.isArray(win.ethereum.providers) && win.ethereum.providers.length > 0) {
      chosenProvider = win.ethereum.providers.find((p: any) => p.isMetaMask) || win.ethereum.providers[0];
    } else {
      chosenProvider = win.ethereum;
    }
    providerName = chosenProvider.isRabby
      ? 'Rabby Wallet'
      : chosenProvider.isBraveWallet
      ? 'Brave Wallet'
      : chosenProvider.isMetaMask
      ? 'MetaMask'
      : 'Browser Wallet';
  }

  if (!chosenProvider) {
    if (isMobileBrowser()) {
      window.location.href = getMetaMaskDeepLink();
      throw new Error('Abriendo navegador integrado de MetaMask Mobile...');
    }
    throw new Error(
      'No se detectó extensión Web3 en el navegador (ej. MetaMask o Rabby). Instálala o usa WalletConnect V2.'
    );
  }

  const accounts: string[] = await chosenProvider.request({ method: 'eth_requestAccounts' });
  if (!accounts || accounts.length === 0) {
    throw new Error('No seleccionaste ninguna cuenta en tu billetera Web3.');
  }

  activeInjectedProvider = chosenProvider;
  bindEvmProviderEvents(chosenProvider, options?.callbacks);

  let chainIdHex = await chosenProvider.request({ method: 'eth_chainId' });
  let chainId = parseInt(chainIdHex, 16);

  // Auto-switch to Polygon Amoy (80002) if Testnet is active and user requested autoSwitch
  const desiredChainId = options?.isTestnet !== false ? 80002 : 137;
  if (options?.autoSwitchNetwork !== false && chainId !== desiredChainId) {
    try {
      await switchEvmNetwork(options?.isTestnet !== false, chosenProvider);
      chainIdHex = await chosenProvider.request({ method: 'eth_chainId' });
      chainId = parseInt(chainIdHex, 16);
    } catch (_) {
      // Non-fatal: user can switch later with 1 click
    }
  }

  return {
    address: accounts[0],
    chainId,
    providerName
  };
}

export async function trySilentReconnectInjectedEvm(
  callbacks?: EvmWalletEventCallbacks
): Promise<{ address: string; chainId: number; providerName: string } | null> {
  if (typeof window === 'undefined') return null;
  initEip6963Discovery();
  const win = window as any;

  let chosenProvider: any = null;
  let providerName = 'MetaMask';

  if (discoveredWallets.size > 0) {
    const first =
      Array.from(discoveredWallets.values()).find(w => w.info.rdns.includes('metamask')) ||
      Array.from(discoveredWallets.values())[0];
    chosenProvider = first.provider;
    providerName = first.info.name;
  } else if (win.ethereum) {
    chosenProvider = win.ethereum;
  }

  if (!chosenProvider) return null;

  try {
    const accounts: string[] = await chosenProvider.request({ method: 'eth_accounts' });
    if (accounts && accounts.length > 0) {
      activeInjectedProvider = chosenProvider;
      bindEvmProviderEvents(chosenProvider, callbacks);
      const chainIdHex = await chosenProvider.request({ method: 'eth_chainId' });
      return {
        address: accounts[0],
        chainId: parseInt(chainIdHex, 16) || 80002,
        providerName
      };
    }
  } catch (_) {}

  return null;
}

export async function switchEvmNetwork(isTestnet: boolean, explicitProvider?: any): Promise<number> {
  const provider = explicitProvider || getActiveEip1193Provider();
  const cfg = isTestnet ? AMOY_CHAIN_CONFIG : POLYGON_MAINNET_CONFIG;

  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: cfg.chainIdHex }]
    });
  } catch (switchErr: any) {
    if (
      switchErr?.code === 4902 ||
      switchErr?.data?.originalError?.code === 4902 ||
      String(switchErr?.message || '').toLowerCase().includes('unrecognized')
    ) {
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: cfg.chainIdHex,
            chainName: cfg.chainName,
            nativeCurrency: cfg.nativeCurrency,
            rpcUrls: cfg.rpcUrls,
            blockExplorerUrls: cfg.blockExplorerUrls
          }
        ]
      });
    } else {
      throw switchErr;
    }
  }

  return cfg.chainId;
}

// ============================================================================
// 5. OFFICIAL BITCOIN CASH WALLETCONNECT V2 (`wc2-bch-bcr`: Cashonize / Paytaca)
// ============================================================================
let bchSignClient: InstanceType<typeof SignClient> | null = null;
let bchSignClientPromise: Promise<InstanceType<typeof SignClient>> | null = null;
let activeBchSession: SessionTypes.Struct | null = null;

export interface BchWcSessionResult {
  address: string;
  tokenAddress: string;
  walletName: string;
  topic: string;
}

async function getBchSignClient(onSessionDeleted?: () => void): Promise<InstanceType<typeof SignClient>> {
  if (bchSignClient) return bchSignClient;
  if (bchSignClientPromise) return bchSignClientPromise;

  bchSignClientPromise = (async () => {
    const client = await SignClient.init({
      projectId: WALLETCONNECT_PROJECT_ID,
      metadata: WC_METADATA
    });

    client.on('session_delete', ({ topic }) => {
      if (activeBchSession && activeBchSession.topic === topic) {
        activeBchSession = null;
        onSessionDeleted?.();
      }
    });

    bchSignClient = client;
    return client;
  })();

  return bchSignClientPromise;
}

function extractBchAddressFromSession(session: SessionTypes.Struct, isTestnet: boolean): BchWcSessionResult | null {
  const bchNamespace = session.namespaces?.bch;
  const accounts = bchNamespace?.accounts || [];
  if (accounts.length === 0) return null;

  // Prefer matching network account if multiple accounts were shared
  const preferredPrefix = isTestnet ? 'bch:bchtest:' : 'bch:bitcoincash:';
  const rawAccount = accounts.find(a => a.startsWith(preferredPrefix)) || accounts[0];
  // CAIP-10 format: "bch:bchtest:qp..." or "bch:bitcoincash:qp..." -> strip leading "bch:"
  const rawCashAddr = rawAccount.startsWith('bch:') ? rawAccount.slice(4) : rawAccount;

  const address = convertCashAddressNetwork(rawCashAddr, isTestnet, false);
  const tokenAddress = convertCashAddressNetwork(rawCashAddr, isTestnet, true);
  const walletName = session.peer?.metadata?.name || 'Cashonize / BCH WC2';

  return {
    address,
    tokenAddress,
    walletName,
    topic: session.topic
  };
}

export async function restoreBchWalletConnectSession(
  isTestnet: boolean,
  onSessionDeleted?: () => void
): Promise<BchWcSessionResult | null> {
  try {
    // Only initialize BCH SignClient if an active session exists in localStorage
    const hasBchSession =
      typeof window !== 'undefined' &&
      Object.keys(localStorage).some(k => k.startsWith('wc@2:') && k.includes('session'));
    if (!hasBchSession) return null;

    const client = await getBchSignClient(onSessionDeleted);
    const sessions = client.session.getAll();
    const bchSess = [...sessions].reverse().find(s => Boolean(s.namespaces?.bch?.accounts?.length));
    if (!bchSess) return null;

    activeBchSession = bchSess;
    return extractBchAddressFromSession(bchSess, isTestnet);
  } catch (err) {
    console.warn('Silent BCH WalletConnect restore skipped:', err);
    return null;
  }
}

export async function startBchWalletConnectPairing(
  isTestnet: boolean,
  onSessionDeleted?: () => void
): Promise<{
  uri: string;
  qrDataUrl: string;
  waitForApproval: () => Promise<BchWcSessionResult>;
}> {
  const client = await getBchSignClient(onSessionDeleted);

  // Clean up any stale BCH WC2 sessions before starting a fresh pairing
  try {
    const existingSessions = client.session.getAll();
    for (const sess of existingSessions) {
      if (sess.namespaces?.bch) {
        await client.disconnect({
          topic: sess.topic,
          reason: { code: 6000, message: 'Replacing previous BCH session' }
        }).catch(() => {});
      }
    }
    activeBchSession = null;
  } catch {}

  const primaryChain = isTestnet ? 'bch:bchtest' : 'bch:bitcoincash';
  const secondaryChain = isTestnet ? 'bch:bitcoincash' : 'bch:bchtest';

  const { uri, approval } = await client.connect({
    optionalNamespaces: {
      bch: {
        chains: [primaryChain, secondaryChain],
        methods: ['bch_getAddresses', 'bch_signTransaction', 'bch_signMessage'],
        events: ['addressesChanged']
      }
    }
  });

  if (!uri) {
    throw new Error('No se pudo generar el URI de emparejamiento WalletConnect V2 para BCH.');
  }

  const qrDataUrl = generateQrDataUrl(uri, 5, 2);

  const waitForApproval = async (): Promise<BchWcSessionResult> => {
    const session = await approval();
    activeBchSession = session;

    // Optionally request explicit token-aware addresses via `bch_getAddresses` if supported
    try {
      const chainToQuery = session.namespaces?.bch?.chains?.[0] || primaryChain;
      const addrList = await client.request<string[]>({
        topic: session.topic,
        chainId: chainToQuery,
        request: {
          method: 'bch_getAddresses',
          params: { token: true }
        }
      });
      if (Array.isArray(addrList) && addrList.length > 0) {
        const first = addrList[0];
        return {
          address: convertCashAddressNetwork(first, isTestnet, false),
          tokenAddress: convertCashAddressNetwork(first, isTestnet, true),
          walletName: session.peer?.metadata?.name || 'Cashonize / Paytaca (WC2)',
          topic: session.topic
        };
      }
    } catch (_) {
      // Fallback to CAIP-10 session accounts
    }

    const extracted = extractBchAddressFromSession(session, isTestnet);
    if (!extracted) {
      throw new Error('La billetera BCH no compartió ninguna dirección CashAddr válida.');
    }
    return extracted;
  };

  return { uri, qrDataUrl, waitForApproval };
}

export async function disconnectBchWalletConnect(): Promise<void> {
  try {
    if (bchSignClient && activeBchSession) {
      await bchSignClient.disconnect({
        topic: activeBchSession.topic,
        reason: { code: 6000, message: 'User disconnected from BinaryLiquid' }
      });
    }
  } catch (err) {
    console.warn('BCH WalletConnect disconnect warning:', err);
  } finally {
    activeBchSession = null;
  }
}

function resolveHydratedBchSession() {
  if (bchSignClient && !activeBchSession) {
    try {
      const sessions = bchSignClient.session.getAll();
      const latest = [...sessions].reverse().find(s => Boolean(s.namespaces?.bch?.accounts?.length));
      if (latest) activeBchSession = latest;
    } catch {}
  }
  return bchSignClient && activeBchSession && activeBchSession.namespaces?.bch?.accounts?.length
    ? activeBchSession
    : null;
}

/**
 * Checks whether the currently active BCH wallet supports arbitrary off-chain `bch_signMessage`
 * (`wc2-bch-bcr` Cashonize / Paytaca WC2 / Zapit, or browser extension exposing `signMessage`).
 * Note: WizardConnect (`hdwalletv1`) exposes `signTransaction` only and does not support `signMessage`.
 */
export function hasActiveBchMessageSigningCapability(
  preferredSource?: 'wizard' | 'wc2-bch' | 'extension' | 'manual'
): boolean {
  if (preferredSource === 'manual' || preferredSource === 'wizard') {
    return false;
  }
  const session = resolveHydratedBchSession();
  if (session) {
    const methods = session.namespaces?.bch?.methods || [];
    if (methods.length === 0 || methods.includes('bch_signMessage')) {
      return true;
    }
  }
  if (typeof window !== 'undefined') {
    const ext = (window as any).paytaca || (window as any).bitcoinCash;
    if (ext && typeof ext.signMessage === 'function') {
      return true;
    }
  }
  return false;
}

/**
 * Requests an authentic Bitcoin Signed Message signature from a connected BCH wallet
 * (`bch_signMessage` via WalletConnect V2 BCH or injected extension).
 */
export async function signBchMessage(params: {
  message: string;
  userPrompt?: string;
  isTestnet: boolean;
  preferredSource?: 'wizard' | 'wc2-bch' | 'extension' | 'manual';
}): Promise<{ signature: string; walletName: string }> {
  const { message, userPrompt, isTestnet, preferredSource } = params;
  const session = resolveHydratedBchSession();

  if (preferredSource !== 'extension' && preferredSource !== 'wizard' && session && bchSignClient) {
    const desiredChain = isTestnet ? 'bch:bchtest' : 'bch:bitcoincash';
    const allowedChains = session.namespaces?.bch?.chains || [];
    const chainIdToUse = allowedChains.includes(desiredChain) ? desiredChain : allowedChains[0] || desiredChain;
    const peerName = session.peer?.metadata?.name || 'Cashonize / WalletConnect';

    const result: any = await bchSignClient.request({
      topic: session.topic,
      chainId: chainIdToUse,
      request: {
        method: 'bch_signMessage',
        params: {
          message,
          ...(userPrompt ? { userPrompt } : {})
        }
      }
    });

    const sig =
      typeof result === 'string'
        ? result
        : result?.signature || result?.signedMessage || '';
    if (!sig) {
      throw new Error(`La billetera ${peerName} canceló o no devolvió una firma válida.`);
    }
    return { signature: sig.trim(), walletName: peerName };
  }

  if (typeof window !== 'undefined' && preferredSource !== 'wizard' && preferredSource !== 'manual') {
    const ext = (window as any).paytaca || (window as any).bitcoinCash;
    if (ext && typeof ext.signMessage === 'function') {
      const result: any = await ext.signMessage({ message, userPrompt });
      const sig =
        typeof result === 'string'
          ? result
          : result?.signature || result?.signedMessage || '';
      if (!sig) {
        throw new Error('La extensión BCH canceló la firma del mensaje.');
      }
      return { signature: sig.trim(), walletName: 'Paytaca Extension' };
    }
  }

  throw new Error('La billetera BCH activa no soporta firma de mensajes (bch_signMessage).');
}

// ============================================================================
// 6. PAYTACA BROWSER EXTENSION DETECTION (`window.paytaca`)
// ============================================================================
export function hasPaytacaExtension(): boolean {
  if (typeof window === 'undefined') return false;
  const win = window as any;
  return Boolean(win.paytaca || win.bitcoinCash);
}

export async function connectPaytacaExtension(
  isTestnet: boolean
): Promise<{ address: string; tokenAddress: string; walletName: string } | null> {
  if (typeof window === 'undefined') return null;
  const ext = (window as any).paytaca || (window as any).bitcoinCash;
  if (!ext) return null;

  try {
    if (typeof ext.connect === 'function') {
      await ext.connect();
    }
    let rawAddr = '';
    if (typeof ext.address === 'function') {
      rawAddr = await ext.address();
    } else if (typeof ext.getAddress === 'function') {
      rawAddr = await ext.getAddress();
    } else if (typeof ext.getAddresses === 'function') {
      const list = await ext.getAddresses();
      rawAddr = Array.isArray(list) ? list[0] : '';
    }
    if (rawAddr && typeof rawAddr === 'string') {
      return {
        address: convertCashAddressNetwork(rawAddr, isTestnet, false),
        tokenAddress: convertCashAddressNetwork(rawAddr, isTestnet, true),
        walletName: 'Paytaca Extension'
      };
    }
  } catch (err) {
    console.warn('Paytaca extension direct connect fallback to WizardConnect:', err);
  }
  return null;
}

// ============================================================================
// 7. 1-CLICK NON-CUSTODIAL EVM VAULT DEPOSIT (`BinaryLiquidVault.sol`)
// ============================================================================
function getActiveEip1193Provider(): any {
  if (activeInjectedProvider) {
    return activeInjectedProvider;
  }
  if (evmWcProvider && evmWcProvider.accounts && evmWcProvider.accounts.length > 0) {
    return evmWcProvider;
  }
  if (discoveredWallets.size > 0) {
    const first =
      Array.from(discoveredWallets.values()).find(w => w.info.rdns.includes('metamask')) ||
      Array.from(discoveredWallets.values())[0];
    return first.provider;
  }
  const win = typeof window !== 'undefined' ? (window as any) : {};
  if (win.ethereum) {
    return win.ethereum;
  }
  throw new Error('No se detectó billetera Web3 EVM activa (conecta MetaMask o WalletConnect V2).');
}

function pad32(hexWithoutPrefix: string): string {
  return hexWithoutPrefix.replace(/^0x/, '').toLowerCase().padStart(64, '0');
}

function encodeVaultDepositCall(tokenAddress: string, rawAmount: bigint, bchRecipient: string): string {
  // selector for `deposit(address,uint256,string)` = 0xbfe07da6
  const selector = '0xbfe07da6';
  const wordToken = pad32(tokenAddress);
  const wordAmount = pad32(rawAmount.toString(16));
  const wordStringOffset = pad32('60'); // 3 * 32 bytes

  const encoder = new TextEncoder();
  const strBytes = encoder.encode(bchRecipient);
  const wordStrLen = pad32(strBytes.length.toString(16));

  let strHex = '';
  for (let i = 0; i < strBytes.length; i++) {
    strHex += strBytes[i].toString(16).padStart(2, '0');
  }
  const paddedByteHexLen = Math.ceil(strHex.length / 64) * 64 || 64;
  const wordStrData = strHex.padEnd(paddedByteHexLen, '0');

  return `${selector}${wordToken}${wordAmount}${wordStringOffset}${wordStrLen}${wordStrData}`;
}

async function waitForTxReceipt(eipProvider: any, txHash: string, maxPolls = 45): Promise<any> {
  for (let i = 0; i < maxPolls; i++) {
    const receipt = await eipProvider.request({
      method: 'eth_getTransactionReceipt',
      params: [txHash]
    });
    if (receipt) {
      if (receipt.status === '0x0' || receipt.status === 0) {
        throw new Error('La transacción fue revertida on-chain.');
      }
      return receipt;
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  return null;
}

/**
 * 1-Click Non-Custodial Smart Contract Deposit via MetaMask / Rabby / WalletConnect:
 * Switches to Polygon Amoy (if testnet), approves ERC-20 (USDT) if needed, and calls `BinaryLiquidVault.deposit(...)`.
 */
export async function executeWeb3VaultDeposit(params: {
  isTestnet: boolean;
  vaultAddress: string;
  tokenAddress: string;
  amount: number;
  decimals?: number;
  bchRecipient: string;
  onStatus?: (msg: string) => void;
}): Promise<{ txHash: string }> {
  const {
    isTestnet,
    vaultAddress,
    tokenAddress,
    amount,
    decimals = 6,
    bchRecipient,
    onStatus
  } = params;

  const eipProvider = getActiveEip1193Provider();
  const accounts = await eipProvider.request({ method: 'eth_requestAccounts' });
  const sender = accounts?.[0];
  if (!sender) {
    throw new Error('No se encontró cuenta activa en tu billetera Web3.');
  }

  const targetChainHex = isTestnet ? AMOY_CHAIN_CONFIG.chainIdHex : POLYGON_MAINNET_CONFIG.chainIdHex;
  const currentChainHex = await eipProvider.request({ method: 'eth_chainId' });

  if (String(currentChainHex || '').toLowerCase() !== targetChainHex.toLowerCase()) {
    onStatus?.(isTestnet ? 'Cambiando red a Polygon Amoy Testnet...' : 'Cambiando red a Polygon Mainnet...');
    await switchEvmNetwork(isTestnet, eipProvider);
  }

  const rawUnits = BigInt(Math.round(amount * (10 ** decimals)));

  // Check current ERC-20 allowance: `allowance(address,address)` = 0xdd62ed3e
  const allowanceCallData = `0xdd62ed3e${pad32(sender)}${pad32(vaultAddress)}`;
  const allowanceHex = await eipProvider.request({
    method: 'eth_call',
    params: [{ to: tokenAddress, data: allowanceCallData }, 'latest']
  });
  const currentAllowance = allowanceHex && allowanceHex !== '0x' ? BigInt(allowanceHex) : 0n;

  if (currentAllowance < rawUnits) {
    onStatus?.('Paso 1/2: Aprueba USDT en tu billetera para el Smart Contract Vault...');
    // `approve(address,uint256)` = 0x095ea7b3
    const approveData = `0x095ea7b3${pad32(vaultAddress)}${pad32(rawUnits.toString(16))}`;
    const approveTxHash = await eipProvider.request({
      method: 'eth_sendTransaction',
      params: [{ from: sender, to: tokenAddress, data: approveData }]
    });
    onStatus?.('Confirmando aprobación ERC-20 en Polygon...');
    await waitForTxReceipt(eipProvider, approveTxHash);
  }

  onStatus?.('Paso 2/2: Confirma el depósito en BinaryLiquidVault.sol...');
  const depositData = encodeVaultDepositCall(tokenAddress, rawUnits, bchRecipient);
  const depositTxHash = await eipProvider.request({
    method: 'eth_sendTransaction',
    params: [{ from: sender, to: vaultAddress, data: depositData }]
  });

  onStatus?.('Esperando confirmación del bloque en Polygon...');
  await waitForTxReceipt(eipProvider, depositTxHash);

  return { txHash: depositTxHash };
}

/**
 * 1-Click Non-Custodial Liquidity Pool Deposit into `BinaryLiquidVault.sol`:
 * Transfers ERC-20 (`USDT` / `USDC`) directly into the Vault's liquidity reserve in a single signature.
 */
export async function executeWeb3LpDeposit(params: {
  isTestnet: boolean;
  vaultAddress: string;
  tokenAddress: string;
  amount: number;
  decimals?: number;
  onStatus?: (msg: string) => void;
}): Promise<{ txHash: string; sender: string }> {
  const {
    isTestnet,
    vaultAddress,
    tokenAddress,
    amount,
    decimals = 6,
    onStatus
  } = params;

  const eipProvider = getActiveEip1193Provider();
  const accounts = await eipProvider.request({ method: 'eth_requestAccounts' });
  const sender = accounts?.[0];
  if (!sender) {
    throw new Error('No se encontró cuenta activa en tu billetera Web3.');
  }

  const targetChainHex = isTestnet ? AMOY_CHAIN_CONFIG.chainIdHex : POLYGON_MAINNET_CONFIG.chainIdHex;
  const currentChainHex = await eipProvider.request({ method: 'eth_chainId' });

  if (String(currentChainHex || '').toLowerCase() !== targetChainHex.toLowerCase()) {
    onStatus?.(isTestnet ? 'Cambiando red a Polygon Amoy Testnet...' : 'Cambiando red a Polygon Mainnet...');
    await switchEvmNetwork(isTestnet, eipProvider);
  }

  const rawUnits = BigInt(Math.round(amount * (10 ** decimals)));
  // ERC-20 `transfer(address,uint256)` selector = 0xa9059cbb
  const transferData = `0xa9059cbb${pad32(vaultAddress)}${pad32(rawUnits.toString(16))}`;

  onStatus?.('Confirma el depósito de liquidez al Smart Contract Vault en tu billetera...');
  const txHash = await eipProvider.request({
    method: 'eth_sendTransaction',
    params: [{ from: sender, to: tokenAddress, data: transferData }]
  });

  onStatus?.('Esperando confirmación del bloque en Polygon...');
  await waitForTxReceipt(eipProvider, txHash);

  return { txHash, sender };
}

// ============================================================================
// 8. 1-CLICK NON-CUSTODIAL BCH COVENANT DEPOSIT (`wc2-bch-bcr` & Paytaca Ext)
// ============================================================================
export function isWizardManagerConnected(wizardManager?: any): boolean {
  if (!wizardManager || typeof wizardManager.signTransaction !== 'function') {
    return false;
  }
  try {
    if (typeof wizardManager.getSessionPaths === 'function') {
      const paths = wizardManager.getSessionPaths();
      if (Array.isArray(paths) && paths.length > 0) return true;
    }
    if (typeof wizardManager.getPubkey === 'function') {
      const pk = wizardManager.getPubkey(0, 0);
      if (pk) return true;
    }
  } catch {}
  return false;
}

export function hasActiveBchSigningCapability(
  wizardManager?: any,
  preferredSource?: 'wizard' | 'wc2-bch' | 'extension' | 'manual'
): boolean {
  if (preferredSource === 'manual') {
    return false;
  }
  if (bchSignClient && !activeBchSession) {
    try {
      const sessions = bchSignClient.session.getAll();
      const latest = [...sessions].reverse().find(s => Boolean(s.namespaces?.bch?.accounts?.length));
      if (latest) activeBchSession = latest;
    } catch {}
  }
  if (bchSignClient && activeBchSession && activeBchSession.namespaces?.bch?.accounts?.length) {
    return true;
  }
  if (isWizardManagerConnected(wizardManager)) {
    return true;
  }
  if (typeof window !== 'undefined') {
    const ext = (window as any).paytaca || (window as any).bitcoinCash;
    if (ext && typeof ext.signTransaction === 'function') {
      return true;
    }
  }
  return false;
}

export async function executeBchSwapDeposit(params: {
  backendUrl: string;
  buildEndpoint: string;
  senderAddress: string;
  isTestnet: boolean;
  wizardManager?: any;
  preferredSource?: 'wizard' | 'wc2-bch' | 'extension' | 'manual';
  bodyPayload?: Record<string, any>;
  onStatus?: (msg: string) => void;
}): Promise<{ txHash: string }> {
  const {
    backendUrl,
    buildEndpoint,
    senderAddress,
    isTestnet,
    wizardManager,
    preferredSource,
    bodyPayload,
    onStatus
  } = params;

  // Ensure activeBchSession is hydrated if bchSignClient is active
  if (bchSignClient && !activeBchSession) {
    try {
      const sessions = bchSignClient.session.getAll();
      const latest = [...sessions].reverse().find(s => Boolean(s.namespaces?.bch?.accounts?.length));
      if (latest) activeBchSession = latest;
    } catch {}
  }

  const hasWc2Session = Boolean(
    bchSignClient && activeBchSession && activeBchSession.namespaces?.bch?.accounts?.length
  );
  const hasWizardSession = isWizardManagerConnected(wizardManager);
  const useWc2First =
    preferredSource === 'wc2-bch' || (hasWc2Session && (!hasWizardSession || preferredSource !== 'wizard'));

  // Determine the exact sender address corresponding to the active signing wallet
  let effectiveSenderAddress = senderAddress;
  if (useWc2First && activeBchSession) {
    const wcExtracted = extractBchAddressFromSession(activeBchSession, isTestnet);
    if (wcExtracted?.tokenAddress) {
      effectiveSenderAddress = wcExtracted.tokenAddress;
    }
  } else if (hasWizardSession && wizardManager) {
    try {
      const derivedList: string[] = [];
      if (senderAddress) {
        for (const part of senderAddress.split(',')) {
          const trimmed = part.trim();
          if (trimmed && !derivedList.includes(trimmed)) derivedList.push(trimmed);
        }
      }
      for (const child of [0, 1]) {
        for (let i = 0; i < 6; i++) {
          try {
            const pk = wizardManager.getPubkey(child, i as any);
            if (pk) {
              const bAddr = pubkeyToCashAddress(pk, isTestnet, false);
              if (bAddr && !derivedList.includes(bAddr)) {
                derivedList.push(bAddr);
              }
            }
          } catch {}
        }
      }
      if (derivedList.length > 0) {
        effectiveSenderAddress = derivedList.join(',');
      }
    } catch {}
  }

  onStatus?.('Preparando transacción CashTokens No-Custodia...');
  const buildRes = await fetch(`${backendUrl}${buildEndpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ senderAddress: effectiveSenderAddress, ...(bodyPayload || {}) })
  });
  const buildData = await buildRes.json();
  if (!buildRes.ok || !buildData?.success || !buildData?.wcTransaction) {
    throw new Error(buildData?.error || 'No se pudo construir la transacción CashTokens.');
  }

  const desiredChain = isTestnet ? 'bch:bchtest' : 'bch:bitcoincash';

  // Helper to broadcast raw signed hex via our backend Electrum node (idempotent even if wallet already broadcasted)
  const broadcastRawHexToNetwork = async (rawHexOrTxId: string): Promise<string> => {
    const cleaned = String(rawHexOrTxId || '').trim().replace(/^0x/i, '');
    if (!cleaned) {
      throw new Error('No se recibió transacción firmada desde la billetera.');
    }
    onStatus?.('Transmitiendo transacción firmada a Bitcoin Cash...');
    const broadcastRes = await fetch(`${backendUrl}/api/bch/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ txHex: cleaned, isChipnet: isTestnet })
    });
    const broadcastData = await broadcastRes.json();
    if (!broadcastData.success || !broadcastData.txHash) {
      throw new Error(broadcastData.error || 'Error transmitiendo la transacción firmada a la red.');
    }
    return broadcastData.txHash;
  };

  // Branch A: WalletConnect V2 BCH (`wc2-bch-bcr`: Cashonize / Paytaca WC2 / Zapit)
  const runWc2Sign = async (): Promise<{ txHash: string }> => {
    if (!bchSignClient || !activeBchSession) {
      throw new Error('Sesión WalletConnect V2 BCH no activa.');
    }
    const allowedChains = activeBchSession.namespaces?.bch?.chains || [];
    const chainIdToUse = allowedChains.includes(desiredChain)
      ? desiredChain
      : allowedChains[0] || buildData.chainId || desiredChain;
    const peerName = activeBchSession.peer?.metadata?.name || 'Cashonize / WalletConnect';

    onStatus?.(`Confirma la firma en ${peerName}...`);
    const wcTxPayload = {
      ...buildData.wcTransaction,
      broadcast: true
    };

    const signResult: any = await bchSignClient.request({
      topic: activeBchSession.topic,
      chainId: chainIdToUse,
      request: {
        method: 'bch_signTransaction',
        params: wcTxPayload
      }
    });

    // Extract raw signed hex if returned by Cashonize / Paytaca WC2
    let rawSignedHex = '';
    if (typeof signResult?.signedTransaction === 'string' && signResult.signedTransaction.length > 64) {
      rawSignedHex = signResult.signedTransaction;
    } else if (typeof signResult?.signedTransaction?.hex === 'string') {
      rawSignedHex = signResult.signedTransaction.hex;
    } else if (typeof signResult === 'string' && signResult.length > 64) {
      rawSignedHex = signResult;
    }

    const returnedTxId =
      signResult?.signedTransactionHash ||
      signResult?.txid ||
      signResult?.hash ||
      (typeof signResult === 'string' && signResult.length === 64 ? signResult : '');

    // CRITICAL FIX: Always broadcast rawSignedHex through `/api/bch/broadcast` so our Electrum node
    // immediately indexes the transaction (even if Cashonize had broadcast=false or used a different node!)
    if (rawSignedHex) {
      const broadcastedTxHash = await broadcastRawHexToNetwork(rawSignedHex);
      return { txHash: broadcastedTxHash || returnedTxId };
    }

    if (returnedTxId) {
      return { txHash: returnedTxId };
    }

    throw new Error(`La billetera ${peerName} canceló la firma o no devolvió la transacción firmada.`);
  };

  // Branch B: WizardConnect Nostr Tunnel (Paytaca Mobile / Desktop)
  const runWizardSign = async (): Promise<{ txHash: string }> => {
    onStatus?.('📱 Revisa Paytaca: autoriza la transacción con 1 toque...');
    const sessionPaths = typeof wizardManager.getSessionPaths === 'function' ? wizardManager.getSessionPaths() : [];
    const receivePathName = sessionPaths.find((p: any) => p.name === 'receive')?.name || sessionPaths[0]?.name || 'receive';
    const changePathName = sessionPaths.find((p: any) => p.name === 'change')?.name || (sessionPaths[1]?.name ?? 'change');

    // Build lookup map of derived base CashAddress -> [pathName, addressIndex]
    const addrToPath = new Map<string, [string, number]>();
    try {
      for (const [childIdx, pathLabel] of [[0, receivePathName], [1, changePathName]] as const) {
        for (let i = 0; i < 6; i++) {
          try {
            const pk = wizardManager.getPubkey(childIdx, i as any);
            if (pk) {
              const bAddr = pubkeyToCashAddress(pk, isTestnet, false);
              if (bAddr && !addrToPath.has(bAddr)) {
                addrToPath.set(bAddr, [pathLabel, i]);
              }
            }
          } catch {}
        }
      }
    } catch {}

    const rawInputs =
      buildData.wcTransaction?.transaction?.inputs ||
      buildData.wcTransaction?.inputs ||
      [];
    const inputOwners: string[] = Array.isArray(buildData.inputOwners) ? buildData.inputOwners : [];

    const inputPaths: [number, string, number][] = rawInputs.map((_: any, idx: number) => {
      const ownerBase = inputOwners[idx] ? convertCashAddressNetwork(inputOwners[idx], isTestnet, false) : '';
      const matched = ownerBase ? addrToPath.get(ownerBase) : undefined;
      if (matched) {
        return [idx, matched[0], matched[1]];
      }
      return [idx, receivePathName, 0];
    });

    const wcTxToSend = {
      ...buildData.wcTransaction,
      broadcast: false
    };

    const response: any = await wizardManager.signTransaction({
      transaction: wcTxToSend,
      inputPaths
    });

    let signedHex = '';
    if (typeof response === 'string') {
      signedHex = response;
    } else if (typeof response?.signedTransaction === 'string') {
      signedHex = response.signedTransaction;
    } else if (typeof response?.signedTransaction?.hex === 'string') {
      signedHex = response.signedTransaction.hex;
    } else if (typeof response?.signedTransactionHash === 'string') {
      signedHex = response.signedTransactionHash;
    } else if (typeof response?.txid === 'string') {
      signedHex = response.txid;
    } else if (typeof response?.hash === 'string') {
      signedHex = response.hash;
    }

    if (!signedHex) {
      throw new Error(response?.error || 'Firma cancelada en Paytaca.');
    }

    const txHash = await broadcastRawHexToNetwork(signedHex);
    return { txHash };
  };

  if (useWc2First && hasWc2Session) {
    return await runWc2Sign();
  }

  if (hasWizardSession) {
    return await runWizardSign();
  }

  if (hasWc2Session) {
    return await runWc2Sign();
  }

  // Priority 3: Paytaca Browser Extension (`window.paytaca.signTransaction`)
  if (typeof window !== 'undefined') {
    const ext = (window as any).paytaca || (window as any).bitcoinCash;
    if (ext && typeof ext.signTransaction === 'function') {
      onStatus?.('Confirma el pago en la extensión Paytaca...');
      const signResult: any = await ext.signTransaction({
        ...buildData.wcTransaction,
        broadcast: true
      });

      let rawSignedHex = '';
      if (typeof signResult?.signedTransaction === 'string' && signResult.signedTransaction.length > 64) {
        rawSignedHex = signResult.signedTransaction;
      } else if (typeof signResult === 'string' && signResult.length > 64) {
        rawSignedHex = signResult;
      }

      const txHash =
        signResult?.signedTransactionHash ||
        signResult?.txid ||
        signResult?.hash ||
        (typeof signResult === 'string' && signResult.length === 64 ? signResult : '');

      if (rawSignedHex) {
        const broadcastedHash = await broadcastRawHexToNetwork(rawSignedHex);
        return { txHash: broadcastedHash || txHash };
      }

      if (!txHash) {
        throw new Error('La extensión BCH canceló la firma.');
      }
      return { txHash };
    }
  }

  throw new Error('No hay canal de firma activo (conecta Cashonize o Paytaca).');
}
