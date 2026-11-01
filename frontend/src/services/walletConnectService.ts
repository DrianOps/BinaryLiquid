import { EthereumProvider } from '@walletconnect/ethereum-provider';

export const WALLETCONNECT_PROJECT_ID = '4f9a67dcbecde36938bbeb6d312a5bad';

export const AMOY_CHAIN_CONFIG = {
  chainIdHex: '0x13882', // 80002
  chainId: 80002,
  chainName: 'Polygon Amoy Testnet',
  nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
  rpcUrls: ['https://polygon-amoy-bor-rpc.publicnode.com'],
  blockExplorerUrls: ['https://amoy.polygonscan.com']
};

export const DEPLOYED_TESTNET_CONTRACTS = {
  amoyVaultAddress: '0xc830c7cB16cd05bdEd8CA9d0c73E9038ed25Aa4A',
  amoyUsdtAddress: '0x1a29793F2a64424D09f56AD045827dF1F0Fa1A75',
  amoyUsdcAddress: '0x08d7CF325c44af76602922cBA6D37E4b267CDa71',
  chipnetVaultTokenAddress: 'bchtest:rvqse7cr2ptah2e34sl53r5utqwxl28fk84grvf5ufzd6n5tclme29g2zzvuj',
  chipnetPusdCategory: '6b6cf8de5963d67594a4565d49a7bcf3e668a18a7328828de16bd393ac00dcad'
};

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
        optionalChains: [80002, 1, 56], // Polygon Amoy Testnet (80002), Ethereum, BNB
        metadata: {
          name: 'BinaryLiquid Protocol',
          description: '100% Non-Custodial Cross-Chain Gateway connecting Bitcoin Cash CashTokens & Polygon',
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

  if (provider.accounts && provider.accounts.length > 0) {
    return {
      address: provider.accounts[0],
      chainId: provider.chainId || 137,
      provider
    };
  }

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

function getActiveEip1193Provider(): any {
  if (providerInstance && providerInstance.accounts && providerInstance.accounts.length > 0) {
    return providerInstance;
  }
  const win = window as any;
  if (win.ethereum) {
    return win.ethereum;
  }
  throw new Error('No se detectó billetera Web3 activa (MetaMask / WalletConnect).');
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
 * 1-Click Non-Custodial Smart Contract Deposit via MetaMask / WalletConnect:
 * Switches to Polygon Amoy (if testnet), approves ERC-20 if needed, and invokes `BinaryLiquidVault.deposit(...)`.
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

  const targetChainHex = isTestnet ? AMOY_CHAIN_CONFIG.chainIdHex : '0x89';
  const currentChainHex = await eipProvider.request({ method: 'eth_chainId' });

  if (currentChainHex?.toLowerCase() !== targetChainHex.toLowerCase()) {
    onStatus?.(isTestnet ? 'Cambiando red a Polygon Amoy Testnet...' : 'Cambiando red a Polygon Mainnet...');
    try {
      await eipProvider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: targetChainHex }]
      });
    } catch (switchErr: any) {
      if (isTestnet && (switchErr?.code === 4902 || String(switchErr?.message || '').includes('Unrecognized'))) {
        await eipProvider.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: AMOY_CHAIN_CONFIG.chainIdHex,
              chainName: AMOY_CHAIN_CONFIG.chainName,
              nativeCurrency: AMOY_CHAIN_CONFIG.nativeCurrency,
              rpcUrls: AMOY_CHAIN_CONFIG.rpcUrls,
              blockExplorerUrls: AMOY_CHAIN_CONFIG.blockExplorerUrls
            }
          ]
        });
      } else {
        throw switchErr;
      }
    }
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
