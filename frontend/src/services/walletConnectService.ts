import { EthereumProvider } from '@walletconnect/ethereum-provider';
import SignClient from '@walletconnect/sign-client';
import type { SessionTypes } from '@walletconnect/types';
import { convertCashAddressNetwork, generateQrDataUrl } from '../utils/bchAddress';

export const WALLETCONNECT_PROJECT_ID =
  ((import.meta as any).env?.VITE_WALLETCONNECT_PROJECT_ID as string) ||
  '5f82a5af5c6aa90535d813b07f3216cc';

export const AMOY_CHAIN_CONFIG = {
  chainIdHex: '0x13882', // 80002
  chainId: 80002,
  chainName: 'Polygon Amoy Testnet',
  nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
  rpcUrls: ['https://polygon-amoy-bor-rpc.publicnode.com'],
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
  chipnetPusdCategory: '6b6cf8de5963d67594a4565d49a7bcf3e668a18a7328828de16bd393ac00dcad'
};

const WC_METADATA = {
  name: 'BinaryLiquid Protocol',
  description: '100% Non-Custodial Cross-Chain Gateway connecting Bitcoin Cash CashTokens & Polygon',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://bsprotocol.xyz',
  icons: ['https://bsprotocol.xyz/logo.png']
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
  if (typeof window === 'undefined') return 'https://metamask.app.link/dapp/bsprotocol.xyz';
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
    const client = await getBchSignClient(onSessionDeleted);
    const sessions = client.session.getAll();
    const bchSess = sessions.find(s => Boolean(s.namespaces?.bch?.accounts?.length));
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
export function hasActiveBchSigningCapability(): boolean {
  if (bchSignClient && activeBchSession && activeBchSession.namespaces?.bch?.accounts?.length) {
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
  onStatus?: (msg: string) => void;
}): Promise<{ txHash: string }> {
  const { backendUrl, buildEndpoint, senderAddress, isTestnet, onStatus } = params;

  onStatus?.('Preparando transacción CashTokens No-Custodia...');
  const buildRes = await fetch(`${backendUrl}${buildEndpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ senderAddress })
  });
  const buildData = await buildRes.json();
  if (!buildRes.ok || !buildData?.success || !buildData?.wcTransaction) {
    throw new Error(buildData?.error || 'No se pudo construir la transacción CashTokens.');
  }

  const desiredChain = isTestnet ? 'bch:bchtest' : 'bch:bitcoincash';

  // Priority 1: Active WalletConnect V2 BCH session (`wc2-bch-bcr`: Cashonize / Paytaca Mobile / Zapit)
  if (bchSignClient && activeBchSession) {
    const allowedChains = activeBchSession.namespaces?.bch?.chains || [];
    const chainIdToUse = allowedChains.includes(desiredChain)
      ? desiredChain
      : allowedChains[0] || buildData.chainId || desiredChain;

    onStatus?.('Confirma el pago en tu billetera BCH conectada...');
    const signResult: any = await bchSignClient.request({
      topic: activeBchSession.topic,
      chainId: chainIdToUse,
      request: {
        method: 'bch_signTransaction',
        params: buildData.wcTransaction
      }
    });

    const txHash =
      signResult?.signedTransactionHash ||
      signResult?.txid ||
      signResult?.hash ||
      (typeof signResult === 'string' && signResult.length === 64 ? signResult : '');

    if (!txHash) {
      throw new Error('La billetera canceló la firma o no devolvió el TXID.');
    }

    return { txHash };
  }

  // Priority 2: Paytaca Browser Extension (`window.paytaca.signTransaction`)
  if (typeof window !== 'undefined') {
    const ext = (window as any).paytaca || (window as any).bitcoinCash;
    if (ext && typeof ext.signTransaction === 'function') {
      onStatus?.('Confirma el pago en la extensión Paytaca...');
      const signResult: any = await ext.signTransaction(buildData.wcTransaction);
      const txHash =
        signResult?.signedTransactionHash ||
        signResult?.txid ||
        signResult?.hash ||
        (typeof signResult === 'string' && signResult.length === 64 ? signResult : '');

      if (!txHash) {
        throw new Error('La extensión BCH canceló la firma.');
      }
      return { txHash };
    }
  }

  throw new Error('La sesión BCH actual es de solo lectura (usa WalletConnect V2 o QR para firmar).');
}
