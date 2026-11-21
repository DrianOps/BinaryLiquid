import { schnorr } from '@noble/curves/secp256k1.js';
import { convertCashAddressNetwork, generateQrDataUrl } from '../utils/bchAddress';

export const BLC_PROTOCOL_VERSION = 1;
export const BLC_NOSTR_KIND = 24133;
export const BLC_STORAGE_KEY = 'bliq_blconnect_session_v1';

export const BLC_WALLET_ORIGIN = (
  ((import.meta as any).env?.VITE_BLCONNECT_WALLET_URL as string) ||
  'https://wallet.bliquid.xyz'
).replace(/\/+$/, '');

export const BLC_DEFAULT_RELAYS = [
  'wss://nos.lol',
  'wss://relay.primal.net',
  'wss://nostr.bitcoiner.social',
  'wss://nostr.mom'
];

export type BlcMethod =
  | 'blc_connect'
  | 'blc_signTransaction'
  | 'blc_signMessage'
  | 'blc_disconnect';

export interface BlConnectSession {
  transport: 'popup' | 'nostr';
  sessionId: string;
  cashAddress: string;
  tokenAddress: string;
  allAddresses: string[];
  walletName: string;
  walletMode: 'hd' | 'single';
  network: 'testnet' | 'mainnet';
  channel?: string;
  secret?: string;
  relays?: string[];
  connectedAt: string;
}

interface BlcPacket {
  v: number;
  id: string;
  from: 'dapp' | 'wallet';
  type: 'request' | 'response' | 'event';
  method?: BlcMethod;
  params?: Record<string, unknown>;
  result?: unknown;
  error?: string;
  ts: number;
}

interface BlcWindowEnvelope {
  __blconnect: 'v1';
  sessionId: string;
  requestId?: string;
  type: 'BLC_READY' | 'BLC_REQUEST' | 'BLC_RESPONSE' | 'BLC_CANCEL';
  method?: BlcMethod;
  params?: Record<string, unknown>;
  result?: unknown;
  error?: string;
}

function bytesToHex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, '0');
  }
  return out;
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim().replace(/^0x/i, '');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin);
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}

function randomHex(byteLen = 16): string {
  const buf = new Uint8Array(byteLen);
  crypto.getRandomValues(buf);
  return bytesToHex(buf);
}

async function importAesKey(secretHex: string): Promise<CryptoKey> {
  const raw = hexToBytes(secretHex);
  const copy = new Uint8Array(raw.length);
  copy.set(raw);
  return crypto.subtle.importKey('raw', copy, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

async function encryptPacket(packet: BlcPacket, secretHex: string, channelHex: string): Promise<string> {
  const key = await importAesKey(secretHex);
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const enc = new TextEncoder();
  const cipherBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: enc.encode(`blc-v1:${channelHex}`) },
    key,
    enc.encode(JSON.stringify(packet))
  );
  const cipher = new Uint8Array(cipherBuf);
  const combined = new Uint8Array(iv.length + cipher.length);
  combined.set(iv, 0);
  combined.set(cipher, iv.length);
  return bytesToBase64(combined);
}

async function decryptPacket(encoded: string, secretHex: string, channelHex: string): Promise<BlcPacket | null> {
  try {
    const combined = base64ToBytes(encoded);
    if (combined.length < 28) return null;
    const iv = combined.slice(0, 12);
    const cipher = combined.slice(12);
    const key = await importAesKey(secretHex);
    const plainBuf = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(`blc-v1:${channelHex}`) },
      key,
      cipher
    );
    const parsed = JSON.parse(new TextDecoder().decode(plainBuf)) as BlcPacket;
    if (!parsed || parsed.v !== BLC_PROTOCOL_VERSION || !parsed.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function createSignedNostrEvent(
  ephemPriv: Uint8Array,
  ephemPubHex: string,
  channelHex: string,
  content: string
) {
  const created_at = Math.floor(Date.now() / 1000);
  const tags = [['p', channelHex]];
  const serialized = JSON.stringify([0, ephemPubHex, created_at, BLC_NOSTR_KIND, tags, content]);
  const hashBuf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(serialized));
  const idBytes = new Uint8Array(hashBuf);
  const id = bytesToHex(idBytes);
  const sig = bytesToHex(schnorr.sign(idBytes, ephemPriv));
  return { id, pubkey: ephemPubHex, created_at, kind: BLC_NOSTR_KIND, tags, content, sig };
}

class BlcDappNostrChannel {
  private readonly channel: string;
  private readonly secret: string;
  private readonly relays: string[];
  private readonly ephemPriv: Uint8Array;
  private readonly ephemPub: string;
  private readonly sockets = new Map<string, WebSocket>();
  private readonly seenIds = new Set<string>();
  private readonly outgoingQueue: string[] = [];
  private readonly listeners = new Set<(pkt: BlcPacket) => void>();
  private closed = false;
  private reconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(channel: string, secret: string, relays: string[] = BLC_DEFAULT_RELAYS) {
    this.channel = channel.toLowerCase();
    this.secret = secret.toLowerCase();
    this.relays = relays.length > 0 ? relays : BLC_DEFAULT_RELAYS;
    this.ephemPriv = new Uint8Array(32);
    crypto.getRandomValues(this.ephemPriv);
    this.ephemPub = bytesToHex(schnorr.getPublicKey(this.ephemPriv));
    for (const url of this.relays) {
      this.connectRelay(url);
    }
  }

  private connectRelay(url: string) {
    if (this.closed || typeof window === 'undefined') return;
    try {
      const ws = new WebSocket(url);
      this.sockets.set(url, ws);
      const subId = `blcd_${this.channel.slice(0, 12)}_${randomHex(4)}`;
      ws.onopen = () => {
        if (this.closed) {
          ws.close();
          return;
        }
        const since = Math.floor(Date.now() / 1000) - 60;
        ws.send(JSON.stringify(['REQ', subId, { kinds: [BLC_NOSTR_KIND], '#p': [this.channel], since }]));
        for (const frame of this.outgoingQueue) {
          try { ws.send(frame); } catch {}
        }
      };
      ws.onmessage = async (ev) => {
        if (this.closed) return;
        try {
          const msg = JSON.parse(String(ev.data));
          if (!Array.isArray(msg) || msg[0] !== 'EVENT') return;
          const nostrEv = msg[2];
          if (!nostrEv || nostrEv.kind !== BLC_NOSTR_KIND || typeof nostrEv.content !== 'string') return;
          const pkt = await decryptPacket(nostrEv.content, this.secret, this.channel);
          if (!pkt || pkt.from === 'dapp' || this.seenIds.has(pkt.id)) return;
          this.seenIds.add(pkt.id);
          if (this.seenIds.size > 400) {
            const first = this.seenIds.values().next().value;
            if (first) this.seenIds.delete(first);
          }
          for (const cb of this.listeners) {
            try { cb(pkt); } catch {}
          }
        } catch {}
      };
      ws.onclose = () => {
        this.sockets.delete(url);
        if (!this.closed) {
          this.reconnectTimers.set(url, setTimeout(() => this.connectRelay(url), 3000));
        }
      };
      ws.onerror = () => {
        try { ws.close(); } catch {}
      };
    } catch {}
  }

  public onPacket(cb: (pkt: BlcPacket) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  public async waitForReady(timeoutMs = 5000): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      for (const ws of this.sockets.values()) {
        if (ws.readyState === WebSocket.OPEN) return true;
      }
      await new Promise((r) => setTimeout(r, 120));
    }
    return false;
  }

  public async send(partial: Omit<BlcPacket, 'v' | 'from' | 'ts' | 'id'> & { id?: string }): Promise<string> {
    const id = partial.id || randomHex(12);
    const pkt: BlcPacket = {
      v: BLC_PROTOCOL_VERSION,
      id,
      from: 'dapp',
      type: partial.type,
      method: partial.method,
      params: partial.params,
      result: partial.result,
      error: partial.error,
      ts: Date.now()
    };
    const encrypted = await encryptPacket(pkt, this.secret, this.channel);
    const ev = await createSignedNostrEvent(this.ephemPriv, this.ephemPub, this.channel, encrypted);
    const frame = JSON.stringify(['EVENT', ev]);
    this.outgoingQueue.push(frame);
    if (this.outgoingQueue.length > 20) this.outgoingQueue.shift();

    await this.waitForReady(4000);
    for (const ws of this.sockets.values()) {
      if (ws.readyState === WebSocket.OPEN) {
        try { ws.send(frame); } catch {}
      }
    }
    return id;
  }

  public close() {
    this.closed = true;
    for (const t of this.reconnectTimers.values()) clearTimeout(t);
    this.reconnectTimers.clear();
    for (const ws of this.sockets.values()) {
      try { ws.close(); } catch {}
    }
    this.sockets.clear();
    this.listeners.clear();
  }
}

let activeSession: BlConnectSession | null = null;
let activeNostrChannel: BlcDappNostrChannel | null = null;
let onRemoteDisconnectCb: (() => void) | null = null;

function persistSession(sess: BlConnectSession | null) {
  activeSession = sess;
  if (typeof window === 'undefined') return;
  try {
    if (sess) localStorage.setItem(BLC_STORAGE_KEY, JSON.stringify(sess));
    else localStorage.removeItem(BLC_STORAGE_KEY);
  } catch {}
}

export function getActiveBlConnectSession(): BlConnectSession | null {
  if (activeSession) return activeSession;
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(BLC_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BlConnectSession;
    if (parsed && parsed.cashAddress && parsed.tokenAddress && parsed.transport) {
      activeSession = parsed;
      return parsed;
    }
  } catch {}
  return null;
}

export function hasActiveBlConnectSession(): boolean {
  return Boolean(getActiveBlConnectSession());
}

function attachActiveNostrListeners(ch: BlcDappNostrChannel) {
  ch.onPacket((pkt) => {
    if (pkt.type === 'event' && pkt.method === 'blc_disconnect') {
      ch.close();
      activeNostrChannel = null;
      persistSession(null);
      onRemoteDisconnectCb?.();
    }
  });
}

export function restoreBlConnectSession(
  isTestnet: boolean,
  onDisconnect?: () => void
): BlConnectSession | null {
  if (onDisconnect) onRemoteDisconnectCb = onDisconnect;
  const sess = getActiveBlConnectSession();
  if (!sess) return null;

  if (sess.transport === 'nostr' && sess.channel && sess.secret && !activeNostrChannel) {
    activeNostrChannel = new BlcDappNostrChannel(sess.channel, sess.secret, sess.relays || BLC_DEFAULT_RELAYS);
    attachActiveNostrListeners(activeNostrChannel);
  }

  return {
    ...sess,
    network: isTestnet ? 'testnet' : 'mainnet',
    cashAddress: convertCashAddressNetwork(sess.cashAddress, isTestnet, false),
    tokenAddress: convertCashAddressNetwork(sess.tokenAddress || sess.cashAddress, isTestnet, true),
    allAddresses: (sess.allAddresses || [sess.cashAddress]).map((a) =>
      convertCashAddressNetwork(a, isTestnet, false)
    )
  };
}

export async function disconnectBlConnect(): Promise<void> {
  if (activeNostrChannel) {
    try {
      await activeNostrChannel.send({ type: 'event', method: 'blc_disconnect' });
    } catch {}
    activeNostrChannel.close();
    activeNostrChannel = null;
  }
  persistSession(null);
}

/**
 * Mode 1: Instant Popup Transport (`window.postMessage`, <50ms, 0 external relays).
 * MUST be invoked directly inside a user click gesture so browsers allow the popup.
 */
function runBlConnectPopupRpc<T>(opts: {
  action: 'connect' | 'sign';
  method: BlcMethod;
  params?: Record<string, unknown>;
  isTestnet: boolean;
  timeoutMs?: number;
}): Promise<T> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('BlConnect requires a browser environment.'));
  }
  const sessionId = randomHex(12);
  const requestId = randomHex(10);
  const url =
    `${BLC_WALLET_ORIGIN}/connect` +
    `?session=${encodeURIComponent(sessionId)}` +
    `&origin=${encodeURIComponent(window.location.origin)}` +
    `&app=${encodeURIComponent('BinaryLiquid Bridge')}` +
    `&net=${opts.isTestnet ? 'testnet' : 'mainnet'}` +
    `&action=${opts.action}`;

  const w = 440;
  const h = 680;
  const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - w) / 2));
  const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - h) / 2));
  const popup = window.open(
    url,
    `blconnect_${sessionId.slice(0, 8)}`,
    `popup=yes,width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`
  );

  if (!popup) {
    return Promise.reject(
      new Error('Popup bloqueado por el navegador. Permite popups para bliquid.xyz o usa el QR BlConnect.')
    );
  }

  return new Promise<T>((resolve, reject) => {
    let requestSent = false;
    let settled = false;

    const cleanup = () => {
      window.removeEventListener('message', onMsg);
      clearInterval(closePoller);
      clearTimeout(timer);
    };

    const fail = (msg: string) => {
      if (settled) return;
      settled = true;
      cleanup();
      try { if (!popup.closed) popup.close(); } catch {}
      reject(new Error(msg));
    };

    const succeed = (res: T) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(res);
    };

    const onMsg = (ev: MessageEvent) => {
      if (ev.origin !== BLC_WALLET_ORIGIN) return;
      const data = ev.data as BlcWindowEnvelope | undefined;
      if (!data || data.__blconnect !== 'v1' || data.sessionId !== sessionId) return;

      if (data.type === 'BLC_READY' && !requestSent) {
        requestSent = true;
        const reqEnv: BlcWindowEnvelope = {
          __blconnect: 'v1',
          sessionId,
          requestId,
          type: 'BLC_REQUEST',
          method: opts.method,
          params: opts.params
        };
        try {
          popup.postMessage(reqEnv, BLC_WALLET_ORIGIN);
        } catch {}
        return;
      }

      if (data.type === 'BLC_RESPONSE') {
        succeed(data.result as T);
        return;
      }

      if (data.type === 'BLC_CANCEL') {
        fail(data.error || 'Solicitud cancelada en BinaryLiquid Wallet.');
      }
    };

    window.addEventListener('message', onMsg);

    const closePoller = setInterval(() => {
      if (popup.closed && !settled) {
        fail('Ventana de firma BinaryLiquid Wallet cerrada.');
      }
    }, 500);

    const timer = setTimeout(() => {
      fail('Tiempo de espera agotado en BinaryLiquid Wallet.');
    }, opts.timeoutMs || 180_000);
  });
}

export async function connectBlConnectPopup(isTestnet: boolean): Promise<BlConnectSession> {
  if (activeNostrChannel) {
    activeNostrChannel.close();
    activeNostrChannel = null;
  }

  const res = await runBlConnectPopupRpc<{
    cashAddress: string;
    tokenAddress: string;
    allAddresses?: string[];
    network: 'testnet' | 'mainnet';
    walletName?: string;
    walletMode?: 'hd' | 'single';
  }>({
    action: 'connect',
    method: 'blc_connect',
    isTestnet
  });

  const baseAddr = convertCashAddressNetwork(res.cashAddress, isTestnet, false);
  const tokAddr = convertCashAddressNetwork(res.tokenAddress || res.cashAddress, isTestnet, true);
  const allAddrs = (res.allAddresses && res.allAddresses.length > 0 ? res.allAddresses : [baseAddr]).map((a) =>
    convertCashAddressNetwork(a, isTestnet, false)
  );

  const session: BlConnectSession = {
    transport: 'popup',
    sessionId: randomHex(10),
    cashAddress: baseAddr,
    tokenAddress: tokAddr,
    allAddresses: allAddrs,
    walletName: res.walletName || 'BinaryLiquid Wallet',
    walletMode: res.walletMode || 'hd',
    network: isTestnet ? 'testnet' : 'mainnet',
    connectedAt: new Date().toISOString()
  };

  persistSession(session);
  return session;
}

/**
 * Mode 2: Cross-Device Decentralized Nostr E2EE Pairing (PC <-> Mobile QR).
 */
export function startBlConnectNostrPairing(
  isTestnet: boolean,
  onDisconnect?: () => void
): {
  uri: string;
  qrDataUrl: string;
  waitForApproval: () => Promise<BlConnectSession>;
  cancel: () => void;
} {
  if (onDisconnect) onRemoteDisconnectCb = onDisconnect;
  const chanPriv = new Uint8Array(32);
  crypto.getRandomValues(chanPriv);
  const channel = bytesToHex(schnorr.getPublicKey(chanPriv));
  const secret = randomHex(32);
  const relays = BLC_DEFAULT_RELAYS;

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://bliquid.xyz';
  const uri =
    `blconnect://${channel}` +
    `?s=${secret}` +
    `&r=${encodeURIComponent(relays.join(','))}` +
    `&n=${isTestnet ? 'testnet' : 'mainnet'}` +
    `&a=${encodeURIComponent('BinaryLiquid Bridge')}` +
    `&o=${encodeURIComponent(origin)}`;

  const qrDataUrl = generateQrDataUrl(uri, 5, 2);
  const ch = new BlcDappNostrChannel(channel, secret, relays);

  let settled = false;
  let rejectFn: ((err: Error) => void) | null = null;

  const waitForApproval = () =>
    new Promise<BlConnectSession>((resolve, reject) => {
      rejectFn = reject;
      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        ch.close();
        reject(new Error('Tiempo de emparejamiento BlConnect expirado.'));
      }, 300_000);

      ch.onPacket((pkt) => {
        if (settled) return;
        if (pkt.type === 'response' && pkt.method === 'blc_connect') {
          settled = true;
          clearTimeout(timeout);
          if (pkt.error || !pkt.result) {
            ch.close();
            reject(new Error(pkt.error || 'Conexión BlConnect rechazada.'));
            return;
          }
          const res = pkt.result as {
            cashAddress: string;
            tokenAddress?: string;
            allAddresses?: string[];
            walletName?: string;
            walletMode?: 'hd' | 'single';
          };
          const baseAddr = convertCashAddressNetwork(res.cashAddress, isTestnet, false);
          const tokAddr = convertCashAddressNetwork(res.tokenAddress || res.cashAddress, isTestnet, true);
          const allAddrs = (
            res.allAddresses && res.allAddresses.length > 0 ? res.allAddresses : [baseAddr]
          ).map((a) => convertCashAddressNetwork(a, isTestnet, false));

          if (activeNostrChannel && activeNostrChannel !== ch) {
            activeNostrChannel.close();
          }
          activeNostrChannel = ch;
          attachActiveNostrListeners(ch);

          const session: BlConnectSession = {
            transport: 'nostr',
            sessionId: channel.slice(0, 16),
            cashAddress: baseAddr,
            tokenAddress: tokAddr,
            allAddresses: allAddrs,
            walletName: res.walletName || 'BinaryLiquid Wallet',
            walletMode: res.walletMode || 'hd',
            network: isTestnet ? 'testnet' : 'mainnet',
            channel,
            secret,
            relays,
            connectedAt: new Date().toISOString()
          };
          persistSession(session);
          resolve(session);
        }
      });
    });

  const cancel = () => {
    if (settled) return;
    settled = true;
    ch.close();
    rejectFn?.(new Error('cancelled'));
  };

  return { uri, qrDataUrl, waitForApproval, cancel };
}

async function runNostrRpc<T>(
  method: BlcMethod,
  params: Record<string, unknown>,
  timeoutMs = 180_000
): Promise<T> {
  const sess = getActiveBlConnectSession();
  if (!sess || sess.transport !== 'nostr' || !sess.channel || !sess.secret) {
    throw new Error('Sesión remota BlConnect Nostr no activa.');
  }
  if (!activeNostrChannel) {
    activeNostrChannel = new BlcDappNostrChannel(sess.channel, sess.secret, sess.relays || BLC_DEFAULT_RELAYS);
    attachActiveNostrListeners(activeNostrChannel);
  }
  const ch = activeNostrChannel;
  const reqId = randomHex(12);

  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const unsub = ch.onPacket((pkt) => {
      if (settled) return;
      if (pkt.type === 'response' && pkt.id === reqId) {
        settled = true;
        clearTimeout(timer);
        unsub();
        if (pkt.error) reject(new Error(pkt.error));
        else resolve(pkt.result as T);
      }
    });

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      unsub();
      reject(new Error('Tiempo agotado esperando firma en BinaryLiquid Wallet (Nostr E2EE).'));
    }, timeoutMs);

    void ch
      .send({ id: reqId, type: 'request', method, params })
      .catch((err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        unsub();
        reject(err instanceof Error ? err : new Error('Error enviando solicitud BlConnect.'));
      });
  });
}

export async function signBlConnectTransaction(
  wcTransaction: Record<string, unknown>,
  isTestnet: boolean,
  onStatus?: (msg: string) => void
): Promise<{ signedTransaction: string; signedTransactionHash: string }> {
  const sess = getActiveBlConnectSession();
  if (!sess) {
    throw new Error('No hay sesión activa de BinaryLiquid Wallet (BlConnect).');
  }

  if (sess.transport === 'popup') {
    onStatus?.('⚡ Confirma la firma en el popup seguro de BinaryLiquid Wallet...');
    return runBlConnectPopupRpc<{ signedTransaction: string; signedTransactionHash: string }>({
      action: 'sign',
      method: 'blc_signTransaction',
      params: wcTransaction,
      isTestnet
    });
  }

  onStatus?.('📱 Revisa BinaryLiquid Wallet (BlConnect E2EE): autoriza la firma...');
  return runNostrRpc<{ signedTransaction: string; signedTransactionHash: string }>(
    'blc_signTransaction',
    wcTransaction
  );
}

export async function signBlConnectMessage(params: {
  message: string;
  userPrompt?: string;
  isTestnet: boolean;
}): Promise<{ signature: string; address: string; walletName: string }> {
  const sess = getActiveBlConnectSession();
  if (!sess) {
    throw new Error('No hay sesión activa de BinaryLiquid Wallet (BlConnect).');
  }

  if (sess.transport === 'popup') {
    return runBlConnectPopupRpc<{ signature: string; address: string; walletName: string }>({
      action: 'sign',
      method: 'blc_signMessage',
      params: { message: params.message, userPrompt: params.userPrompt },
      isTestnet: params.isTestnet
    });
  }

  return runNostrRpc<{ signature: string; address: string; walletName: string }>('blc_signMessage', {
    message: params.message,
    userPrompt: params.userPrompt
  });
}
