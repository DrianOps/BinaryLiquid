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
  rpcUrls: ['https://polygon-amoy-bor-rpc.publicnode.com', 'https://polygon-amoy.drpc.org', 'https://80002.rpc.thirdweb.com'],
  blockExplorerUrls: ['https://amoy.polygonscan.com']
};

export const POLYGON_MAINNET_CONFIG = {
  chainIdHex: '0x89', // 137
  chainId: 137,
  chainName: 'Polygon PoS Mainnet',
  nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
  rpcUrls: [
    'https://polygon-bor-rpc.publicnode.com',
    'https://polygon-bor.publicnode.com',
    'https://polygon.drpc.org',
    'https://1rpc.io/matic'
  ],
  blockExplorerUrls: ['https://polygonscan.com']
};

export const BSC_MAINNET_CONFIG = {
  chainIdHex: '0x38', // 56
  chainId: 56,
  chainName: 'BNB Smart Chain Mainnet',
  nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
  rpcUrls: ['https://bsc-rpc.publicnode.com', 'https://bsc-dataseed.binance.org'],
  blockExplorerUrls: ['https://bscscan.com']
};

export const BSC_TESTNET_CONFIG = {
  chainIdHex: '0x61', // 97
  chainId: 97,
  chainName: 'BNB Smart Chain Testnet',
  nativeCurrency: { name: 'tBNB', symbol: 'tBNB', decimals: 18 },
  rpcUrls: [
    'https://bsc-testnet-rpc.publicnode.com',
    'https://data-seed-prebsc-1-s1.binance.org:8545'
  ],
  blockExplorerUrls: ['https://testnet.bscscan.com']
};

export const ETHEREUM_MAINNET_CONFIG = {
  chainIdHex: '0x1', // 1
  chainId: 1,
  chainName: 'Ethereum Mainnet',
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: ['https://ethereum-rpc.publicnode.com'],
  blockExplorerUrls: ['https://etherscan.io']
};

export const EVM_CHAIN_CONFIGS: Record<number, typeof AMOY_CHAIN_CONFIG> = {
  80002: AMOY_CHAIN_CONFIG,
  137: POLYGON_MAINNET_CONFIG,
  56: BSC_MAINNET_CONFIG,
  97: BSC_TESTNET_CONFIG,
  1: ETHEREUM_MAINNET_CONFIG
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
const EVM_RDNS_STORAGE_KEY = 'binaryliquid_evm_rdns';

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
  const handleDisconnect = async () => {
    // EIP-1193 providers sometimes emit transient disconnect (e.g. code 1013 RPC drop) while account stays authorized
    if (provider === activeInjectedProvider && typeof provider.request === 'function') {
      try {
        const remaining: string[] = await provider.request({ method: 'eth_accounts' });
        if (Array.isArray(remaining) && remaining.length > 0) {
          return;
        }
      } catch {
        // Proceed with disconnect cleanup if eth_accounts query fails
      }
    }
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
        optionalChains: [80002, 137, 1, 56, 97],
        rpcMap: {
          80002: AMOY_CHAIN_CONFIG.rpcUrls[0],
          137: POLYGON_MAINNET_CONFIG.rpcUrls[0],
          1: ETHEREUM_MAINNET_CONFIG.rpcUrls[0],
          56: BSC_MAINNET_CONFIG.rpcUrls[0],
          97: BSC_TESTNET_CONFIG.rpcUrls[0]
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

function sessionHasNamespaceAccounts(sess: any, namespace: 'eip155' | 'bch'): boolean {
  const nsMap = sess?.namespaces;
  if (!nsMap || typeof nsMap !== 'object') return false;
  for (const [key, val] of Object.entries(nsMap)) {
    const kLow = key.toLowerCase();
    if (kLow === namespace || kLow.startsWith(`${namespace}:`)) {
      if (Array.isArray((val as any)?.accounts) && (val as any).accounts.length > 0) {
        return true;
      }
      if (namespace === 'bch') {
        return true;
      }
    }
  }
  return false;
}

function payloadHasNamespaceSession(raw: unknown, namespace: 'eip155' | 'bch'): boolean {
  if (!raw) return false;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const sessions = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === 'object'
      ? Object.values(parsed)
      : [];
    return sessions.some((sess: any) => sessionHasNamespaceAccounts(sess, namespace));
  } catch {
    return typeof raw === 'string' && raw.includes(`"${namespace}`);
  }
}

/**
 * Inspects persisted WalletConnect v2 storage entries (`localStorage` + `WALLET_CONNECT_V2_INDEXED_DB`)
 * to check whether a session exists for the specific CAIP-2 namespace (`eip155` vs `bch`)
 * without triggering unnecessary SignClient/EthereumProvider initialization on cold visits.
 */
function hasLocalWc2NamespaceSession(namespace: 'eip155' | 'bch'): boolean {
  if (typeof window === 'undefined') return false;
  try {
    for (const key of Object.keys(localStorage)) {
      if (!key.startsWith('wc@2:') || !key.includes('session')) continue;
      if (payloadHasNamespaceSession(localStorage.getItem(key), namespace)) {
        return true;
      }
    }
  } catch {}
  return false;
}

async function hasPersistedWc2NamespaceSession(namespace: 'eip155' | 'bch'): Promise<boolean> {
  if (hasLocalWc2NamespaceSession(namespace)) return true;
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') return false;

  try {
    if (typeof indexedDB.databases === 'function') {
      const dbs = await indexedDB.databases();
      if (!dbs.some(db => db?.name === 'WALLET_CONNECT_V2_INDEXED_DB')) {
        return false;
      }
    }
    return await new Promise<boolean>(resolve => {
      let settled = false;
      const done = (val: boolean) => {
        if (!settled) {
          settled = true;
          resolve(val);
        }
      };
      const timer = setTimeout(() => done(false), 600);
      const req = indexedDB.open('WALLET_CONNECT_V2_INDEXED_DB');
      req.onupgradeneeded = () => {
        // DB did not exist prior to open; abort creation and avoid leaving an empty DB behind
        try { req.transaction?.abort(); } catch {}
        clearTimeout(timer);
        done(false);
      };
      req.onerror = () => {
        clearTimeout(timer);
        done(false);
      };
      req.onsuccess = () => {
        const db = req.result;
        try {
          if (!db.objectStoreNames.contains('keyvaluestorage')) {
            db.close();
            clearTimeout(timer);
            done(false);
            return;
          }
          const tx = db.transaction('keyvaluestorage', 'readonly');
          const store = tx.objectStore('keyvaluestorage');
          const getReq = store.get('wc@2:client:0.3//session');
          getReq.onsuccess = () => {
            const matched = payloadHasNamespaceSession(getReq.result, namespace);
            try { db.close(); } catch {}
            clearTimeout(timer);
            done(matched);
          };
          getReq.onerror = () => {
            try { db.close(); } catch {}
            clearTimeout(timer);
            done(false);
          };
        } catch {
          try { db.close(); } catch {}
          clearTimeout(timer);
          done(false);
        }
      };
    });
  } catch {
    return false;
  }
}

function purgeWc2NamespaceStorage(namespace: 'eip155' | 'bch'): void {
  if (typeof window === 'undefined') return;
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('wc@2:'));
    for (const key of keys) {
      if (namespace === 'eip155' && key.includes('ethereum_provider')) {
        localStorage.removeItem(key);
        continue;
      }
      if (!key.includes('session')) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((sess: any) => !sess?.namespaces?.[namespace]?.accounts?.length);
          if (filtered.length === 0) {
            localStorage.removeItem(key);
          } else {
            localStorage.setItem(key, JSON.stringify(filtered));
          }
        } else if (parsed && typeof parsed === 'object') {
          const nextObj: Record<string, any> = {};
          for (const [k, sess] of Object.entries(parsed)) {
            if (!(sess as any)?.namespaces?.[namespace]?.accounts?.length) {
              nextObj[k] = sess;
            }
          }
          if (Object.keys(nextObj).length === 0) {
            localStorage.removeItem(key);
          } else {
            localStorage.setItem(key, JSON.stringify(nextObj));
          }
        }
      } catch {
        // Ignore unparseable session payloads
      }
    }
  } catch {}
}

export async function restoreEvmWalletConnectSession(
  callbacks?: EvmWalletEventCallbacks,
  options?: { forceCheck?: boolean }
): Promise<{ address: string; chainId: number; providerName: string } | null> {
  try {
    // Only initialize WalletConnect provider if an active EVM session exists (localStorage or IndexedDB)
    if (!options?.forceCheck && !(await hasPersistedWc2NamespaceSession('eip155'))) return null;

    const provider = await getWalletConnectProvider();
    if (provider.session && provider.accounts && provider.accounts.length > 0) {
      activeInjectedProvider = null;
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
    activeInjectedProvider = null;
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
      optionalChains: isTestnet ? [80002, 97, 137, 56, 1] : [137, 56, 1, 80002, 97],
      rpcMap: {
        80002: AMOY_CHAIN_CONFIG.rpcUrls[0],
        137: POLYGON_MAINNET_CONFIG.rpcUrls[0],
        1: ETHEREUM_MAINNET_CONFIG.rpcUrls[0],
        56: BSC_MAINNET_CONFIG.rpcUrls[0],
        97: BSC_TESTNET_CONFIG.rpcUrls[0]
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

  activeInjectedProvider = null;
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
    purgeWc2NamespaceStorage('eip155');
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
): Promise<{ address: string; chainId: number; providerName: string; rdns?: string }> {
  initEip6963Discovery();
  const win = typeof window !== 'undefined' ? (window as any) : {};

  let chosenProvider: any = null;
  let providerName = 'Browser Wallet';
  let chosenRdns: string | undefined;

  if (options?.rdns && discoveredWallets.has(options.rdns)) {
    const found = discoveredWallets.get(options.rdns)!;
    chosenProvider = found.provider;
    providerName = found.info.name;
    chosenRdns = found.info.rdns;
  } else if (discoveredWallets.size > 0) {
    // Prefer MetaMask or Rabby if multiple extensions are present
    const list = Array.from(discoveredWallets.values());
    const preferred =
      list.find(w => w.info.rdns.includes('metamask')) ||
      list.find(w => w.info.rdns.includes('rabby')) ||
      list[0];
    chosenProvider = preferred.provider;
    providerName = preferred.info.name;
    chosenRdns = preferred.info.rdns;
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
  try {
    if (chosenRdns) {
      localStorage.setItem(EVM_RDNS_STORAGE_KEY, chosenRdns);
    } else {
      localStorage.removeItem(EVM_RDNS_STORAGE_KEY);
    }
  } catch {}
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
    providerName,
    ...(chosenRdns ? { rdns: chosenRdns } : {})
  };
}

export async function trySilentReconnectInjectedEvm(
  callbacks?: EvmWalletEventCallbacks
): Promise<{ address: string; chainId: number; providerName: string; rdns?: string } | null> {
  if (typeof window === 'undefined') return null;
  initEip6963Discovery();
  const win = window as any;

  let chosenProvider: any = null;
  let providerName = 'MetaMask';
  let chosenRdns: string | undefined;

  let savedRdns: string | null = null;
  try {
    savedRdns = localStorage.getItem(EVM_RDNS_STORAGE_KEY);
  } catch {}

  if (savedRdns && discoveredWallets.has(savedRdns)) {
    const saved = discoveredWallets.get(savedRdns)!;
    chosenProvider = saved.provider;
    providerName = saved.info.name;
    chosenRdns = saved.info.rdns;
  } else if (discoveredWallets.size > 0) {
    const list = Array.from(discoveredWallets.values());
    const preferred =
      list.find(w => w.info.rdns.includes('metamask')) ||
      list.find(w => w.info.rdns.includes('rabby')) ||
      list[0];
    chosenProvider = preferred.provider;
    providerName = preferred.info.name;
    chosenRdns = preferred.info.rdns;
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
        providerName,
        ...(chosenRdns ? { rdns: chosenRdns } : {})
      };
    }
  } catch (_) {}

  return null;
}

export async function switchEvmNetwork(
  isTestnetOrChainId: boolean | number,
  explicitProvider?: any
): Promise<number> {
  const provider = explicitProvider || getActiveEip1193Provider();
  const targetChainId =
    typeof isTestnetOrChainId === 'number'
      ? isTestnetOrChainId
      : isTestnetOrChainId
      ? 80002
      : 137;
  const cfg = EVM_CHAIN_CONFIGS[targetChainId] || (targetChainId === 80002 ? AMOY_CHAIN_CONFIG : POLYGON_MAINNET_CONFIG);

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
let currentBchSessionDeletedCb: (() => void) | undefined;

export interface BchWcSessionResult {
  address: string;
  tokenAddress: string;
  walletName: string;
  topic: string;
  networkMismatch?: boolean;
  expectedNetwork?: 'chipnet' | 'mainnet';
  actualNetwork?: 'chipnet' | 'mainnet';
}

function detectExplicitBchNetworkMismatch(rawAddr: string, expectedTestnet: boolean): 'chipnet' | 'mainnet' | null {
  const clean = String(rawAddr || '').trim().replace(/^bch:/i, '').toLowerCase();
  if (clean.startsWith('bitcoincash:') && expectedTestnet) return 'mainnet';
  if (clean.startsWith('bchtest:') && !expectedTestnet) return 'chipnet';
  return null;
}

async function getBchSignClient(onSessionDeleted?: () => void): Promise<InstanceType<typeof SignClient>> {
  if (onSessionDeleted) {
    currentBchSessionDeletedCb = onSessionDeleted;
  }
  if (bchSignClient) return bchSignClient;
  if (bchSignClientPromise) return bchSignClientPromise;

  bchSignClientPromise = (async () => {
    try {
      const client = await SignClient.init({
        projectId: WALLETCONNECT_PROJECT_ID,
        metadata: WC_METADATA
      });

      const handleDeletedOrExpired = (payload: any) => {
        const topic = payload?.topic;
        if (!topic || !activeBchSession || activeBchSession.topic === topic) {
          activeBchSession = null;
          currentBchSessionDeletedCb?.();
        }
      };

      client.on('session_delete', handleDeletedOrExpired);
      client.on('session_expire', handleDeletedOrExpired);

      bchSignClient = client;
      return client;
    } catch (err) {
      bchSignClientPromise = null;
      throw err;
    }
  })();

  return bchSignClientPromise;
}

function getBchSessionNamespace(session: any): {
  accounts: string[];
  chains: string[];
  methods: string[];
  events: string[];
} | null {
  if (!session || typeof session !== 'object') return null;
  const nsMap = session.namespaces || {};
  const bchKeys = Object.keys(nsMap).filter(
    k => k.toLowerCase() === 'bch' || k.toLowerCase().startsWith('bch:')
  );
  if (bchKeys.length === 0) return null;

  const accounts: string[] = [];
  const chains: string[] = [];
  const methods: string[] = [];
  const events: string[] = [];

  for (const key of bchKeys) {
    const ns = nsMap[key];
    if (!ns || typeof ns !== 'object') continue;
    if (key.includes(':') && !chains.includes(key)) {
      chains.push(key);
    }
    if (Array.isArray(ns.accounts)) {
      for (const a of ns.accounts) {
        if (typeof a === 'string') {
          if (!accounts.includes(a)) accounts.push(a);
          const parts = a.split(':');
          if (parts.length >= 2 && parts[0].toLowerCase() === 'bch') {
            const derivedChain = `${parts[0].toLowerCase()}:${parts[1].toLowerCase()}`;
            if (!chains.includes(derivedChain)) chains.push(derivedChain);
          }
        }
      }
    }
    if (Array.isArray(ns.chains)) {
      for (const c of ns.chains) {
        if (typeof c === 'string' && !chains.includes(c)) chains.push(c);
      }
    }
    if (Array.isArray(ns.methods)) {
      for (const m of ns.methods) {
        if (typeof m === 'string' && !methods.includes(m)) methods.push(m);
      }
    }
    if (Array.isArray(ns.events)) {
      for (const e of ns.events) {
        if (typeof e === 'string' && !events.includes(e)) events.push(e);
      }
    }
  }

  return { accounts, chains, methods, events };
}

function extractBchAddressFromSession(session: SessionTypes.Struct, isTestnet: boolean): BchWcSessionResult | null {
  const bchNamespace = getBchSessionNamespace(session);
  const accounts = bchNamespace?.accounts || [];
  if (accounts.length === 0) return null;

  // Prefer matching network account if multiple accounts were shared
  const preferredPrefix = isTestnet ? 'bch:bchtest:' : 'bch:bitcoincash:';
  const matchingAccount = accounts.find(a => a.toLowerCase().startsWith(preferredPrefix));
  const rawAccount = matchingAccount || accounts[0];
  // CAIP-10 format: "bch:bchtest:qp..." or "bch:bitcoincash:qp..." -> strip leading "bch:"
  const rawCashAddr = rawAccount.replace(/^bch:/i, '');
  const walletName = session.peer?.metadata?.name || 'Cashonize / BCH WC2';

  const mismatchActual = !matchingAccount ? detectExplicitBchNetworkMismatch(rawCashAddr, isTestnet) : null;
  if (mismatchActual) {
    return {
      address: rawCashAddr,
      tokenAddress: rawCashAddr,
      walletName,
      topic: session.topic,
      networkMismatch: true,
      expectedNetwork: isTestnet ? 'chipnet' : 'mainnet',
      actualNetwork: mismatchActual
    };
  }

  const address = convertCashAddressNetwork(rawCashAddr, isTestnet, false);
  const tokenAddress = convertCashAddressNetwork(rawCashAddr, isTestnet, true);

  return {
    address,
    tokenAddress,
    walletName,
    topic: session.topic
  };
}

export async function restoreBchWalletConnectSession(
  isTestnet: boolean,
  onSessionDeleted?: () => void,
  options?: { forceCheck?: boolean }
): Promise<BchWcSessionResult | null> {
  try {
    // Only initialize BCH SignClient if an active BCH session exists in localStorage/IndexedDB or caller forces check
    if (!options?.forceCheck && !(await hasPersistedWc2NamespaceSession('bch'))) return null;

    const client = await getBchSignClient(onSessionDeleted);
    const sessions = client.session.getAll();
    const bchSess = [...sessions].reverse().find(s => Boolean(getBchSessionNamespace(s)));
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

    // Clean up any older stale BCH WC2 sessions only AFTER the new session is approved
    try {
      const existingSessions = client.session.getAll();
      for (const sess of existingSessions) {
        if (sess.topic !== session.topic && getBchSessionNamespace(sess)) {
          await client.disconnect({
            topic: sess.topic,
            reason: { code: 6000, message: 'Replacing previous BCH session' }
          }).catch(() => {});
        }
      }
    } catch {}

    const peerName = session.peer?.metadata?.name || 'Cashonize / Paytaca (WC2)';

    const extracted = extractBchAddressFromSession(session, isTestnet);
    if (extracted?.networkMismatch) {
      await client.disconnect({
        topic: session.topic,
        reason: { code: 6000, message: 'Network mismatch with app environment' }
      }).catch(() => {});
      activeBchSession = null;
      throw new Error(
        `La billetera ${peerName} está en ${extracted.actualNetwork === 'mainnet' ? 'BCH Mainnet (bitcoincash:)' : 'Chipnet Testnet (bchtest:)'}, pero BinaryLiquid está en ${isTestnet ? 'Chipnet Testnet' : 'BCH Mainnet'}. Cambia la red en tu billetera y vuelve a intentar.`
      );
    }

    // If CAIP-10 session accounts already provided a valid address, return immediately without blocking on a second RPC round-trip
    if (extracted) {
      return extracted;
    }

    // Fallback: request explicit addresses via `bch_getAddresses` with a 3s timeout if session accounts were empty
    try {
      const bchNs = getBchSessionNamespace(session);
      const chainToQuery = bchNs?.chains?.includes(primaryChain)
        ? primaryChain
        : bchNs?.chains?.[0] || primaryChain;
      const addrList = await Promise.race([
        client.request<string[]>({
          topic: session.topic,
          chainId: chainToQuery,
          request: {
            method: 'bch_getAddresses',
            params: { token: true }
          }
        }),
        new Promise<null>(resolve => setTimeout(() => resolve(null), 3000))
      ]);
      if (Array.isArray(addrList) && addrList.length > 0) {
        const expectedPrefix = isTestnet ? 'bchtest:' : 'bitcoincash:';
        const matchingAddr = addrList.find(a => a.toLowerCase().startsWith(expectedPrefix)) || addrList[0];
        const mismatchActual = detectExplicitBchNetworkMismatch(matchingAddr, isTestnet);
        if (mismatchActual) {
          await client.disconnect({
            topic: session.topic,
            reason: { code: 6000, message: 'Network mismatch with app environment' }
          }).catch(() => {});
          activeBchSession = null;
          throw new Error(
            `La billetera ${peerName} respondió con dirección de ${mismatchActual === 'mainnet' ? 'BCH Mainnet' : 'Chipnet Testnet'}, cambia tu red en la app o en la billetera.`
          );
        }
        return {
          address: convertCashAddressNetwork(matchingAddr, isTestnet, false),
          tokenAddress: convertCashAddressNetwork(matchingAddr, isTestnet, true),
          walletName: peerName,
          topic: session.topic
        };
      }
    } catch (rpcErr: any) {
      if (rpcErr?.message && rpcErr.message.includes('Network mismatch') || rpcErr?.message?.includes('respondió con dirección')) {
        throw rpcErr;
      }
    }

    throw new Error('La billetera BCH no compartió ninguna dirección CashAddr válida.');
  };

  return { uri, qrDataUrl, waitForApproval };
}

export async function disconnectBchWalletConnect(): Promise<void> {
  try {
    if (bchSignClient) {
      const sessions = bchSignClient.session?.getAll?.() || [];
      for (const sess of sessions) {
        if (getBchSessionNamespace(sess)) {
          await bchSignClient.disconnect({
            topic: sess.topic,
            reason: { code: 6000, message: 'User disconnected from BinaryLiquid' }
          }).catch(() => {});
        }
      }
    }
  } catch (err) {
    console.warn('BCH WalletConnect disconnect warning:', err);
  } finally {
    activeBchSession = null;
    purgeWc2NamespaceStorage('bch');
  }
}

export function resolveHydratedBchSession() {
  if (bchSignClient && !activeBchSession) {
    try {
      const sessions = bchSignClient.session.getAll();
      const latest = [...sessions].reverse().find(s => Boolean(getBchSessionNamespace(s)));
      if (latest) activeBchSession = latest;
    } catch {}
  }
  return bchSignClient && activeBchSession && Boolean(getBchSessionNamespace(activeBchSession))
    ? activeBchSession
    : null;
}

export function isBchWc2SessionConnected(): boolean {
  return Boolean(resolveHydratedBchSession());
}

export function getBchWc2SessionMethods(): string[] {
  const session = resolveHydratedBchSession();
  return getBchSessionNamespace(session)?.methods || [];
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
  const hasWc2Sign = () => {
    const session = resolveHydratedBchSession();
    if (!session) return false;
    const methods = getBchSessionNamespace(session)?.methods || [];
    return methods.length === 0 || methods.includes('bch_signMessage');
  };
  const hasExtSign = () => {
    if (typeof window === 'undefined') return false;
    const ext = (window as any).paytaca || (window as any).bitcoinCash;
    return Boolean(ext && typeof ext.signMessage === 'function');
  };

  if (preferredSource === 'wc2-bch') return hasWc2Sign();
  if (preferredSource === 'extension') return hasExtSign();
  return hasWc2Sign() || hasExtSign();
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
  if (preferredSource === 'manual' || preferredSource === 'wizard') {
    throw new Error('La fuente BCH conectada actualmente no soporta firma criptográfica de mensajes.');
  }

  const session = resolveHydratedBchSession();
  const canUseWc2 = preferredSource === 'wc2-bch' || (!preferredSource && Boolean(session));
  const canUseExt = preferredSource === 'extension' || !preferredSource;

  if (canUseWc2) {
    if (!session || !bchSignClient) {
      if (preferredSource === 'wc2-bch') {
        throw new Error('La sesión WalletConnect V2 BCH no está activa.');
      }
    } else {
      const desiredChain = isTestnet ? 'bch:bchtest' : 'bch:bitcoincash';
      const allowedChains = getBchSessionNamespace(session)?.chains || [];
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
  }

  if (canUseExt && typeof window !== 'undefined') {
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
      const mismatchActual = detectExplicitBchNetworkMismatch(rawAddr, isTestnet);
      if (mismatchActual) {
        throw new Error(
          `Paytaca Extension está conectada en ${mismatchActual === 'mainnet' ? 'BCH Mainnet' : 'Chipnet Testnet'}, pero la plataforma está en ${isTestnet ? 'Chipnet Testnet' : 'BCH Mainnet'}.`
        );
      }
      return {
        address: convertCashAddressNetwork(rawAddr, isTestnet, false),
        tokenAddress: convertCashAddressNetwork(rawAddr, isTestnet, true),
        walletName: 'Paytaca Extension'
      };
    }
  } catch (err: any) {
    if (err?.message && err.message.includes('Paytaca Extension está conectada')) {
      throw err;
    }
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

async function evmPublicRpcCall(
  isTestnet: boolean,
  method: string,
  params: any[],
  eipProvider?: any
): Promise<any> {
  const urls = isTestnet
    ? AMOY_CHAIN_CONFIG.rpcUrls
    : POLYGON_MAINNET_CONFIG.rpcUrls;

  for (const rpcUrl of urls) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
        signal: controller.signal
      });
      clearTimeout(timer);
      if (!res.ok) continue;
      const json = await res.json();
      if (json && !json.error && json.result !== undefined) {
        return json.result;
      }
    } catch {
      // Try next public RPC node
    }
  }

  if (eipProvider && typeof eipProvider.request === 'function') {
    return await eipProvider.request({ method, params });
  }
  throw new Error('Todos los nodos RPC de Polygon están temporalmente inaccesibles.');
}

function normalizeEvmTxError(err: any, isTestnet: boolean): Error {
  const code = err?.code ?? err?.info?.error?.code ?? err?.data?.originalError?.code;
  const rawMsg =
    err?.data?.message ||
    err?.info?.error?.message ||
    err?.cause?.message ||
    err?.shortMessage ||
    err?.message ||
    'Error desconocido al firmar en MetaMask/EVM';
  const lower = String(rawMsg).toLowerCase();

  if (code === 4001 || lower.includes('user rejected') || lower.includes('user denied') || lower.includes('rejected the request')) {
    return new Error('Firma cancelada en tu billetera Web3.');
  }

  if (lower.includes('gas price below minimum') || lower.includes('tip cap') || lower.includes('underpriced')) {
    return new Error(
      'Comisión de gas rechazada por Polygon (mínimo 25 Gwei de priority fee). Intenta de nuevo o sube el gas en MetaMask a 30 Gwei.'
    );
  }

  const looksLikeRpcError =
    code === -32603 ||
    code === -32002 ||
    lower.includes('internal json-rpc error') ||
    lower.includes('failed to fetch') ||
    lower.includes('could not coalesce') ||
    lower.includes('network error') ||
    lower.includes('rpc') ||
    lower.includes('enotfound') ||
    lower.includes('header not found') ||
    lower.includes('timeout');

  if (looksLikeRpcError) {
    const netName = isTestnet ? 'Polygon Amoy Testnet (80002)' : 'Polygon PoS (137)';
    const suggestedRpc = isTestnet ? AMOY_CHAIN_CONFIG.rpcUrls[0] : POLYGON_MAINNET_CONFIG.rpcUrls[0];
    const wrapped = new Error(
      `Error de RPC en tu billetera para ${netName}: ${rawMsg}. Actualiza el RPC de la red a ${suggestedRpc} e inténtalo de nuevo.`
    ) as Error & { isRpcError?: boolean };
    wrapped.isRpcError = true;
    return wrapped;
  }

  return err instanceof Error ? err : new Error(String(rawMsg));
}

async function getPolygonEip1559Fees(isTestnet: boolean, eipProvider: any): Promise<{
  maxPriorityFeePerGas: string;
  maxFeePerGas: string;
}> {
  // Polygon validators enforce a 25 Gwei minimum priority fee floor (`gas tip cap >= 25000000000`).
  const minTipWei = 30_000_000_000n;
  let tipWei = minTipWei;
  let gasPriceWei = minTipWei;

  try {
    const [gasHex, tipHex] = await Promise.all([
      evmPublicRpcCall(isTestnet, 'eth_gasPrice', [], eipProvider).catch(() => null),
      evmPublicRpcCall(isTestnet, 'eth_maxPriorityFeePerGas', [], eipProvider).catch(() => null)
    ]);
    if (gasHex && gasHex !== '0x') {
      const parsed = BigInt(gasHex);
      if (parsed > gasPriceWei) gasPriceWei = parsed;
    }
    if (tipHex && tipHex !== '0x') {
      const parsedTip = BigInt(tipHex);
      if (parsedTip > tipWei) tipWei = parsedTip;
    }
  } catch {
    // Fallback to safe 30 Gwei priority fee floor
  }

  const maxFeeWei = gasPriceWei * 2n > tipWei * 2n ? gasPriceWei * 2n : tipWei * 2n;
  return {
    maxPriorityFeePerGas: `0x${tipWei.toString(16)}`,
    maxFeePerGas: `0x${maxFeeWei.toString(16)}`
  };
}

async function sendEvmTxWithPolygonFees(
  eipProvider: any,
  isTestnet: boolean,
  txParams: { from: string; to: string; data: string }
): Promise<string> {
  const fees = await getPolygonEip1559Fees(isTestnet, eipProvider);
  try {
    return await eipProvider.request({
      method: 'eth_sendTransaction',
      params: [{ ...txParams, ...fees }]
    });
  } catch (txErr: any) {
    throw normalizeEvmTxError(txErr, isTestnet);
  }
}

export async function repairEvmNetworkRpc(isTestnet = true): Promise<string> {
  const provider = getActiveEip1193Provider();
  const cfg = isTestnet ? AMOY_CHAIN_CONFIG : POLYGON_MAINNET_CONFIG;
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
  await provider.request({
    method: 'wallet_switchEthereumChain',
    params: [{ chainId: cfg.chainIdHex }]
  }).catch(() => {});
  return cfg.rpcUrls[0];
}

async function waitForTxReceipt(
  eipProvider: any,
  txHash: string,
  maxPolls = 45,
  isTestnet = true
): Promise<any> {
  for (let i = 0; i < maxPolls; i++) {
    try {
      const receipt = await evmPublicRpcCall(
        isTestnet,
        'eth_getTransactionReceipt',
        [txHash],
        eipProvider
      );
      if (receipt) {
        if (receipt.status === '0x0' || receipt.status === 0) {
          throw new Error('La transacción fue revertida on-chain.');
        }
        return receipt;
      }
    } catch (err: any) {
      if (err?.message?.includes('revertida')) throw err;
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  return null;
}

/**
 * Converts a decimal token amount to base integer units (`bigint`) using string splitting
 * so floating-point multiplication never introduces rounding drift.
 */
function toTokenBaseUnits(amount: number | string, decimals: number): bigint {
  const numeric = Number(amount);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new Error('El monto del depósito debe ser mayor a cero.');
  }
  const normalized =
    typeof amount === 'number'
      ? numeric.toFixed(decimals)
      : String(amount).trim();
  const safeFixed = normalized.includes('e') || normalized.includes('E')
    ? numeric.toFixed(decimals)
    : normalized;
  if (!/^\d+(\.\d+)?$/.test(safeFixed)) {
    throw new Error(`Monto decimal inválido: ${amount}`);
  }
  const [whole, frac = ''] = safeFixed.split('.');
  const fracPadded = (frac + '0'.repeat(decimals)).slice(0, decimals);
  return BigInt(`${whole}${fracPadded}`);
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
    try {
      await switchEvmNetwork(isTestnet, eipProvider);
    } catch (switchErr: any) {
      throw normalizeEvmTxError(switchErr, isTestnet);
    }
  }

  const rawUnits = toTokenBaseUnits(amount, decimals);

  // Pre-flight native gas (POL) and ERC-20 balance check via resilient public RPCs
  try {
    const [polBalanceHex, tokenBalHex] = await Promise.all([
      evmPublicRpcCall(isTestnet, 'eth_getBalance', [sender, 'latest'], eipProvider),
      evmPublicRpcCall(isTestnet, 'eth_call', [{ to: tokenAddress, data: `0x70a08231${pad32(sender)}` }, 'latest'], eipProvider)
    ]);
    const polWei = polBalanceHex && polBalanceHex !== '0x' ? BigInt(polBalanceHex) : 0n;
    if (polWei < 500_000_000_000_000n) {
      throw new Error(
        isTestnet
          ? 'Necesitas al menos 0.001 POL en Polygon Amoy para pagar el gas de aprobación y depósito.'
          : 'Necesitas POL en Polygon PoS para pagar el gas de transacción.'
      );
    }
    const tokenBal = tokenBalHex && tokenBalHex !== '0x' ? BigInt(tokenBalHex) : 0n;
    if (tokenBal < rawUnits) {
      throw new Error(`Saldo insuficiente en Polygon para cubrir ${amount} USDT.`);
    }
  } catch (preErr: any) {
    if (preErr?.message?.includes('Necesitas') || preErr?.message?.includes('Saldo insuficiente')) {
      throw preErr;
    }
    // Non-fatal if pre-flight RPC read returned unexpected shape; proceed to allowance check
  }

  // Check current ERC-20 allowance: `allowance(address,address)` = 0xdd62ed3e
  const allowanceCallData = `0xdd62ed3e${pad32(sender)}${pad32(vaultAddress)}`;
  let currentAllowance = 0n;
  try {
    const allowanceHex = await evmPublicRpcCall(
      isTestnet,
      'eth_call',
      [{ to: tokenAddress, data: allowanceCallData }, 'latest'],
      eipProvider
    );
    currentAllowance = allowanceHex && allowanceHex !== '0x' ? BigInt(allowanceHex) : 0n;
  } catch (allowErr: any) {
    throw normalizeEvmTxError(allowErr, isTestnet);
  }

  if (currentAllowance < rawUnits) {
    onStatus?.('Paso 1/2: Aprueba USDT en tu billetera para el Smart Contract Vault...');
    // `approve(address,uint256)` = 0x095ea7b3
    const approveData = `0x095ea7b3${pad32(vaultAddress)}${pad32(rawUnits.toString(16))}`;
    const approveTxHash = await sendEvmTxWithPolygonFees(eipProvider, isTestnet, {
      from: sender,
      to: tokenAddress,
      data: approveData
    });
    onStatus?.('Confirmando aprobación ERC-20 en Polygon...');
    await waitForTxReceipt(eipProvider, approveTxHash, 45, isTestnet);
  }

  onStatus?.('Paso 2/2: Confirma el depósito en BinaryLiquidVault.sol...');
  const depositData = encodeVaultDepositCall(tokenAddress, rawUnits, bchRecipient);
  const depositTxHash = await sendEvmTxWithPolygonFees(eipProvider, isTestnet, {
    from: sender,
    to: vaultAddress,
    data: depositData
  });

  onStatus?.('Esperando confirmación del bloque en Polygon...');
  await waitForTxReceipt(eipProvider, depositTxHash, 45, isTestnet);

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

  const rawUnits = toTokenBaseUnits(amount, decimals);
  // ERC-20 `transfer(address,uint256)` selector = 0xa9059cbb
  const transferData = `0xa9059cbb${pad32(vaultAddress)}${pad32(rawUnits.toString(16))}`;

  onStatus?.('Confirma el depósito de liquidez al Smart Contract Vault en tu billetera...');
  const txHash = await sendEvmTxWithPolygonFees(eipProvider, isTestnet, {
    from: sender,
    to: tokenAddress,
    data: transferData
  });

  onStatus?.('Esperando confirmación del bloque en Polygon...');
  await waitForTxReceipt(eipProvider, txHash, 45, isTestnet);

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
  const session = resolveHydratedBchSession();
  const hasWc2 = Boolean(session);
  const hasWizard = isWizardManagerConnected(wizardManager);
  const hasExt =
    typeof window !== 'undefined' &&
    typeof ((window as any).paytaca || (window as any).bitcoinCash)?.signTransaction === 'function';

  if (preferredSource === 'wc2-bch') return hasWc2;
  if (preferredSource === 'wizard') return hasWizard;
  if (preferredSource === 'extension') return hasExt;
  return hasWc2 || hasWizard || hasExt;
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

  if (preferredSource === 'manual') {
    throw new Error('Las direcciones BCH de solo lectura (manuales) no pueden firmar transacciones. Conecta Cashonize o Paytaca.');
  }

  // Ensure activeBchSession is hydrated if bchSignClient is active
  resolveHydratedBchSession();

  const hasWc2Session = Boolean(
    bchSignClient && activeBchSession && getBchSessionNamespace(activeBchSession)
  );
  const hasWizardSession = isWizardManagerConnected(wizardManager);
  const hasExtExtension =
    typeof window !== 'undefined' &&
    typeof ((window as any).paytaca || (window as any).bitcoinCash)?.signTransaction === 'function';

  // Enforce preferredSource strictly when explicitly connected with one wallet channel
  const useExtension = preferredSource ? preferredSource === 'extension' : false;
  const useWc2 = preferredSource ? preferredSource === 'wc2-bch' : !useExtension && hasWc2Session;
  const useWizard = preferredSource ? preferredSource === 'wizard' : !useExtension && !useWc2 && hasWizardSession;

  if (useWc2 && !hasWc2Session) {
    throw new Error('Tu sesión de Cashonize / WalletConnect BCH se desconectó. Vuelve a conectar tu billetera.');
  }
  if (useWizard && !hasWizardSession) {
    throw new Error('Tu sesión de Paytaca WizardConnect se desconectó. Vuelve a conectar tu billetera.');
  }
  if (useExtension && !hasExtExtension) {
    throw new Error('La extensión Paytaca no está disponible en este navegador.');
  }

  // Determine the exact sender address corresponding to the active signing wallet
  let effectiveSenderAddress = senderAddress;
  if (useExtension) {
    effectiveSenderAddress = senderAddress;
  } else if (useWc2 && activeBchSession) {
    const wcExtracted = extractBchAddressFromSession(activeBchSession, isTestnet);
    if (wcExtracted?.tokenAddress && !wcExtracted.networkMismatch) {
      effectiveSenderAddress = wcExtracted.tokenAddress;
    }
  } else if (useWizard && wizardManager) {
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
    const allowedChains = getBchSessionNamespace(activeBchSession)?.chains || [];
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

  const runExtensionSign = async (): Promise<{ txHash: string }> => {
    const ext = typeof window !== 'undefined' ? ((window as any).paytaca || (window as any).bitcoinCash) : null;
    if (!ext || typeof ext.signTransaction !== 'function') {
      throw new Error('La extensión BCH no está disponible para firmar.');
    }
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
  };

  if (useExtension) {
    return await runExtensionSign();
  }

  if (useWc2 && hasWc2Session) {
    return await runWc2Sign();
  }

  if (useWizard && hasWizardSession) {
    return await runWizardSign();
  }

  if (!preferredSource && hasWc2Session) {
    return await runWc2Sign();
  }

  if (!preferredSource && hasWizardSession) {
    return await runWizardSign();
  }

  if (!preferredSource && hasExtExtension) {
    return await runExtensionSign();
  }

  throw new Error('No hay canal de firma activo (conecta Cashonize o Paytaca).');
}

// ============================================================================
// 9. AUTHENTICATION CHALLENGE SIGNERS & INJECTED EVM DISCONNECT
// ============================================================================
export async function disconnectInjectedEvmWallet(): Promise<void> {
  try {
    if (evmEventCleanup) {
      evmEventCleanup();
      evmEventCleanup = null;
    }
    const target = activeInjectedProvider || (typeof window !== 'undefined' ? (window as any).ethereum : null);
    if (target && typeof target.request === 'function') {
      await target.request({
        method: 'wallet_revokePermissions',
        params: [{ eth_accounts: {} }]
      }).catch(() => {});
    }
  } catch {
    // Some extensions do not implement EIP-2255 wallet_revokePermissions
  } finally {
    activeInjectedProvider = null;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(EVM_RDNS_STORAGE_KEY);
      }
    } catch {}
  }
}

export function hasActiveEvmSigningCapability(): boolean {
  if (activeInjectedProvider) {
    return true;
  }
  if (evmWcProvider && evmWcProvider.session && evmWcProvider.accounts && evmWcProvider.accounts.length > 0) {
    return true;
  }
  return false;
}

export async function signEvmAuthMessage(message: string, expectedAddress?: string): Promise<{ address: string; signature: string }> {
  const eipProvider = getActiveEip1193Provider();
  const accounts: string[] = await eipProvider.request({ method: 'eth_accounts' }).catch(() => []);
  const fallbackAccounts: string[] =
    accounts && accounts.length > 0
      ? accounts
      : await eipProvider.request({ method: 'eth_requestAccounts' });
  const target =
    (expectedAddress && fallbackAccounts.find(a => a.toLowerCase() === expectedAddress.toLowerCase())) ||
    fallbackAccounts[0];
  if (!target) {
    throw new Error('No hay una cuenta EVM conectada para firmar el desafío de sesión.');
  }
  const bytes = new TextEncoder().encode(message);
  let msgHex = '0x';
  for (let i = 0; i < bytes.length; i++) {
    msgHex += bytes[i].toString(16).padStart(2, '0');
  }
  const signature: string = await eipProvider.request({
    method: 'personal_sign',
    params: [msgHex, target]
  });
  if (!signature) {
    throw new Error('Firma EVM cancelada.');
  }
  return { address: target, signature };
}

export async function signSolanaAuthMessage(
  message: string,
  preferredProvider?: 'phantom' | 'solflare'
): Promise<{ address: string; signature: string }> {
  if (typeof window === 'undefined') {
    throw new Error('Entorno de navegador requerido para firmar con Solana.');
  }
  const win = window as any;
  const provider =
    preferredProvider === 'solflare'
      ? win.solflare
      : win.solana?.isPhantom
      ? win.solana
      : win.phantom?.solana || win.solana || win.solflare;

  if (!provider || typeof provider.signMessage !== 'function') {
    throw new Error('La billetera Solana conectada no soporta firma de mensajes (signMessage).');
  }

  const encoded = new TextEncoder().encode(message);
  const res = await provider.signMessage(encoded, 'utf8');
  const sigBytes: Uint8Array = res?.signature || res;
  if (!(sigBytes instanceof Uint8Array) || sigBytes.length === 0) {
    throw new Error('Firma Solana cancelada o inválida.');
  }
  let sigHex = '';
  for (let i = 0; i < sigBytes.length; i++) {
    sigHex += sigBytes[i].toString(16).padStart(2, '0');
  }
  const pubkey = provider.publicKey?.toString?.() || '';
  if (!pubkey) {
    throw new Error('No se pudo leer la clave pública de Solana.');
  }
  return { address: pubkey, signature: sigHex };
}

export type AuthSessionChain = 'bch' | 'evm' | 'solana';

export interface EnsureAuthSessionOptions {
  chains?: AuthSessionChain[];
}
