import { TonConnectUI, TonConnect, THEME, toUserFriendlyAddress, CHAIN, type Wallet } from '@tonconnect/ui';

let tonConnectInstance: TonConnectUI | null = null;

export interface ConnectedTonAccount {
  address: string;
  rawAddress: string;
  provider: string;
  chain?: string;
  isTestnetWallet: boolean;
}

export function formatTonFriendlyAddress(address: string, isTestnet = false): string {
  const clean = (address || '').trim();
  if (!clean) return '';
  if (/^(-1|0):[0-9a-fA-F]{64}$/.test(clean)) {
    try {
      return toUserFriendlyAddress(clean, isTestnet);
    } catch {
      return clean;
    }
  }
  return clean;
}

export function getTonConnectUI(isDark?: boolean): TonConnectUI | null {
  if (typeof window === 'undefined') return null;
  if (!tonConnectInstance) {
    const manifestUrl = `${window.location.origin}/tonconnect-manifest.json`;
    const darkActive =
      typeof isDark === 'boolean'
        ? isDark
        : document.documentElement.classList.contains('dark');

    const connector = new TonConnect({
      manifestUrl,
      walletsListSource: `${window.location.origin}/ton-wallets.json`
    });

    tonConnectInstance = new TonConnectUI({
      connector,
      buttonRootId: null,
      restoreConnection: true,
      uiPreferences: {
        theme: darkActive ? THEME.DARK : THEME.LIGHT,
        borderRadius: 'm'
      }
    });
  } else if (typeof isDark === 'boolean') {
    try {
      tonConnectInstance.uiOptions = {
        uiPreferences: {
          theme: isDark ? THEME.DARK : THEME.LIGHT,
          borderRadius: 'm'
        }
      };
    } catch {}
  }
  return tonConnectInstance;
}

function parseConnectedWallet(wallet: Wallet | null, isTestnet: boolean): ConnectedTonAccount | null {
  if (!wallet || !wallet.account?.address) return null;
  const rawAddress = wallet.account.address;
  const walletChain = wallet.account.chain;
  const isTestnetWallet = walletChain === CHAIN.TESTNET || String(walletChain) === '-3';
  const friendly = formatTonFriendlyAddress(rawAddress, isTestnetWallet || isTestnet);
  const appName =
    (wallet as any)?.device?.appName ||
    (wallet as any)?.name ||
    'TON Connect';

  return {
    address: friendly,
    rawAddress,
    provider: appName,
    chain: walletChain,
    isTestnetWallet
  };
}

export function subscribeTonConnect(
  isTestnet: boolean,
  onChange: (account: ConnectedTonAccount | null) => void
): () => void {
  const ui = getTonConnectUI();
  if (!ui) return () => {};

  // Check if already restored
  if (ui.connected && ui.wallet) {
    onChange(parseConnectedWallet(ui.wallet, isTestnet));
  }

  const unsubscribe = ui.onStatusChange((wallet) => {
    onChange(parseConnectedWallet(wallet, isTestnet));
  });

  return () => {
    try {
      unsubscribe();
    } catch {}
  };
}

export async function openTonConnectModal(options?: {
  isDark?: boolean;
  singleWalletAppName?: string;
}): Promise<void> {
  const ui = getTonConnectUI(options?.isDark);
  if (!ui) return;

  if (options?.singleWalletAppName) {
    try {
      await ui.openSingleWalletModal(options.singleWalletAppName);
      return;
    } catch {
      // Fallback to main selector modal
    }
  }
  await ui.openModal();
}

export async function disconnectTonConnect(): Promise<void> {
  try {
    if (tonConnectInstance?.connected) {
      await tonConnectInstance.disconnect();
    }
  } catch {}
}

export function hasActiveTonConnectSession(): boolean {
  return Boolean(tonConnectInstance?.connected && tonConnectInstance?.account?.address);
}

export async function sendTonConnectDeposit(params: {
  depositAddress: string;
  amountTon: number;
}): Promise<{ boc: string }> {
  const ui = getTonConnectUI();
  if (!ui || !ui.connected) {
    throw new Error('TON Connect session is not active. Please connect your TON wallet first.');
  }
  const nanoTons = BigInt(Math.round(Number(params.amountTon) * 1e9)).toString();
  const res = await ui.sendTransaction({
    validUntil: Math.floor(Date.now() / 1000) + 300,
    messages: [
      {
        address: params.depositAddress.trim(),
        amount: nanoTons
      }
    ]
  });
  return { boc: res.boc };
}
