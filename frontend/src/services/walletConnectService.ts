import { EthereumProvider } from '@walletconnect/ethereum-provider';

export const WALLETCONNECT_PROJECT_ID = '4f9a67dcbecde36938bbeb6d312a5bad';

let providerInstance: InstanceType<typeof EthereumProvider> | null = null;
let initPromise: Promise<InstanceType<typeof EthereumProvider>> | null = null;

export async function getWalletConnectProvider(): Promise<InstanceType<typeof EthereumProvider>> {
  if (providerInstance) {
    return providerInstance;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      const provider = await EthereumProvider.init({
        projectId: WALLETCONNECT_PROJECT_ID,
        showQrModal: true,
        chains: [137], // Polygon PoS Mainnet
        optionalChains: [1, 56], // Ethereum Mainnet, BNB Chain
        metadata: {
          name: 'BinaryLiquid Protocol',
          description: 'Cross-Chain Liquidity Gateway connecting Bitcoin Cash & EVM',
          url: 'https://bsprotocol.xyz',
          icons: ['https://bsprotocol.xyz/logo.png']
        },
        qrModalOptions: {
          themeMode: 'dark',
          themeVariables: {
            '--wcm-accent-color': '#F7931A',
            '--wcm-background-color': '#080B11'
          }
        }
      });

      providerInstance = provider;
      return provider;
    } catch (err) {
      console.error('Failed to initialize WalletConnect EthereumProvider:', err);
      initPromise = null;
      throw err;
    }
  })();

  return initPromise;
}

export async function connectWalletConnect(): Promise<{ address: string; chainId: number; provider: any }> {
  const provider = await getWalletConnectProvider();

  // If already connected with an account, return it
  if (provider.accounts && provider.accounts.length > 0) {
    return {
      address: provider.accounts[0],
      chainId: provider.chainId || 137,
      provider
    };
  }

  // Open modal and wait for user to connect
  await provider.connect();

  if (!provider.accounts || provider.accounts.length === 0) {
    throw new Error('No accounts found in WalletConnect session');
  }

  return {
    address: provider.accounts[0],
    chainId: provider.chainId || 137,
    provider
  };
}

export async function disconnectWalletConnect(): Promise<void> {
  try {
    if (providerInstance) {
      await providerInstance.disconnect();
    }
  } catch (err) {
    console.warn('Error during WalletConnect disconnect:', err);
  } finally {
    providerInstance = null;
    initPromise = null;
  }
}

// Injected Web3 (MetaMask, Rabby, Brave)
export async function connectInjectedWallet(): Promise<{ address: string; chainId: number }> {
  const win = window as any;
  if (!win.ethereum) {
    throw new Error('No browser Web3 wallet detected (e.g. MetaMask). Please install an extension or use WalletConnect.');
  }

  const accounts = await win.ethereum.request({ method: 'eth_requestAccounts' });
  if (!accounts || accounts.length === 0) {
    throw new Error('No accounts selected in Web3 wallet');
  }

  const chainIdHex = await win.ethereum.request({ method: 'eth_chainId' });
  const chainId = parseInt(chainIdHex, 16);

  return {
    address: accounts[0],
    chainId
  };
}
