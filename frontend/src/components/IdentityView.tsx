import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Key,
  Wallet,
  Send,
  AlertCircle,
  AlertTriangle,
  CheckCheck,
  Code2,
  QrCode,
  User,
  Zap,
  AtSign,
  X,
  ShieldAlert,
  Search,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { HandleMarketPanel } from './HandleMarketPanel';
import {
  generateSecretKey,
  getPublicKey,
  finalizeEvent,
  verifyEvent,
  nip19,
  type Event as NostrEvent
} from 'nostr-tools';
import { secp256k1, schnorr } from '@noble/curves/secp256k1.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import {
  pubkeyToCashAddress,
  convertCashAddressNetwork,
  generateQrDataUrl,
  formatAddress
} from '../utils/bchAddress';
import {
  hasActiveBchMessageSigningCapability,
  restoreBchWalletConnectSession,
  signBchMessage
} from '../services/walletConnectService';
import {
  USERLINK_RELAYS,
  USERLINK_D_TAG,
  signBitcoinMessage,
  verifyUserLinkEvent,
  resolveUserLinkFromRelays,
  publishUserLinkToRelay,
  buildUserLinkDidDocument,
  buildBchOpReturnScriptHex,
  computeUserLinkCommitmentHash,
  createSaltedDisclosureCommitment,
  verifySelectiveDisclosure,
  createSignedAttestationEvent,
  verifyAttestationEvent,
  fetchAttestationsFromRelays,
  verifyBchOnChainAnchor,
  type VerifiedUserLinkResult,
  type UserLinkAttestationResult
} from '../utils/userlinkCrypto';

interface IdentityViewProps {
  bchWallet: {
    address: string;
    tokenAddress?: string;
    publicKey?: string;
    provider?: string;
    source?: 'blconnect' | 'wizard' | 'wc2-bch' | 'extension' | 'manual';
  } | null;
  onConnectBch: () => void;
  lang?: 'en' | 'es';
  platformNetwork?: 'mainnet' | 'testnet';
  onToggleNetwork?: (net: 'mainnet' | 'testnet') => void;
}

type MainSection = 'register' | 'profile' | 'market' | 'inspector';
type RegisterSubStep = 'search' | 'checkout' | 'resolved';
type InspectorSubTab = 'verify' | 'auth' | 'spec';

interface ResolvedIdentityRecord {
  handle: string;
  nip05: string;
  bchAddress: string;
  npub: string;
  pubkeyHex?: string;
  isVerified: boolean;
  sourceLabel: string;
}

const AVATAR_TONES = [
  'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  'bg-rose-500/10 text-rose-600 dark:text-rose-400'
];

function HandleAvatar({ handle, size = 'md' }: { handle: string; size?: 'sm' | 'md' | 'lg' }) {
  const clean = (handle || 'id').replace(/^@/, '').trim() || 'id';
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = (hash * 31 + clean.charCodeAt(i)) >>> 0;
  }
  const tone = AVATAR_TONES[hash % AVATAR_TONES.length];
  const dims =
    size === 'lg'
      ? 'w-12 h-12 rounded-2xl text-base'
      : size === 'sm'
      ? 'w-8 h-8 rounded-xl text-xs'
      : 'w-10 h-10 rounded-xl text-sm';

  return (
    <div
      className={`${dims} ${tone} border border-line font-semibold uppercase flex items-center justify-center shrink-0 select-none`}
    >
      {clean.slice(0, 2)}
    </div>
  );
}

function classifyQuery(raw: string):
  | { kind: 'empty' }
  | { kind: 'lookup'; query: string }
  | { kind: 'invalid_handle'; reason: 'short' | 'long' | 'chars'; clean: string }
  | { kind: 'handle'; handle: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { kind: 'empty' };

  const lower = trimmed.toLowerCase();
  const stripped = lower.replace(/^@/, '');
  const looksLikeAddressOrKey =
    lower.startsWith('npub1') ||
    lower.startsWith('bitcoincash:') ||
    lower.startsWith('bchtest:') ||
    /^[0-9a-f]{64}$/i.test(lower) ||
    stripped.includes('@');

  if (looksLikeAddressOrKey) {
    return { kind: 'lookup', query: trimmed };
  }

  if (stripped.length < 3) {
    return { kind: 'invalid_handle', reason: 'short', clean: stripped };
  }
  if (stripped.length > 20) {
    return { kind: 'invalid_handle', reason: 'long', clean: stripped };
  }
  if (!/^[a-z0-9_-]+$/.test(stripped)) {
    return { kind: 'invalid_handle', reason: 'chars', clean: stripped };
  }
  return { kind: 'handle', handle: stripped };
}

/**
 * Step-by-step live registration & Nostr relay publication feedback panel.
 */
function RelayPublishStepper({
  isEs,
  isPublishing,
  signingStage,
  isDone,
  publishLogs,
  indexedCount
}: {
  isEs: boolean;
  isPublishing: boolean;
  signingStage: 'idle' | 'bch' | 'nostr' | 'relays' | 'done';
  isDone: boolean;
  publishLogs: Array<{ relay: string; status: 'pending' | 'ok' | 'error'; latency?: number; error?: string }>;
  indexedCount?: number;
}) {
  if (!isPublishing && publishLogs.length === 0 && !isDone) return null;

  return (
    <div className="ui-panel p-4 space-y-2.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-ink">
          {isEs ? '1. Firma de titularidad BCH (BSM)' : '1. BCH ownership signature (BSM)'}
        </span>
        {signingStage === 'bch' ? (
          <RefreshCw className="w-3.5 h-3.5 text-ink-3 animate-spin" />
        ) : signingStage !== 'idle' || isDone ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        ) : null}
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-ink">
          {isEs ? '2. Sello criptográfico Nostr (BIP-340)' : '2. Nostr identity seal (BIP-340)'}
        </span>
        {signingStage === 'nostr' ? (
          <RefreshCw className="w-3.5 h-3.5 text-ink-3 animate-spin" />
        ) : signingStage === 'relays' || signingStage === 'done' || isDone ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        ) : (
          <span className="text-[11px] text-ink-3">{isEs ? 'Pendiente' : 'Pending'}</span>
        )}
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-ink">
          {isEs ? '3. Publicación en relays públicos' : '3. Broadcast to public relays'}
        </span>
        {signingStage === 'relays' ? (
          <RefreshCw className="w-3.5 h-3.5 text-ink-3 animate-spin" />
        ) : isDone ? (
          <span className="text-xs font-medium text-emerald-500">
            {indexedCount ?? 0}/{USERLINK_RELAYS.length} OK
          </span>
        ) : (
          <span className="text-[11px] text-ink-3">{isEs ? 'Pendiente' : 'Pending'}</span>
        )}
      </div>

      {publishLogs.length > 0 && (
        <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-line">
          {publishLogs.map((log) => (
            <div
              key={log.relay}
              className="px-2.5 py-1.5 rounded-lg bg-surface border border-line flex items-center justify-between text-[11px] font-mono"
            >
              <span className="text-ink-2 truncate max-w-[115px]">{log.relay.replace('wss://', '')}</span>
              {log.status === 'pending' && <RefreshCw className="w-3 h-3 animate-spin text-ink-3" />}
              {log.status === 'ok' && <span className="text-emerald-500">{log.latency}ms</span>}
              {log.status === 'error' && <span className="text-rose-500">timeout</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Collapsible advanced BCH/Nostr signer controls tucked away from primary flows.
 */
function AdvancedSignerDetails({
  isEs,
  isOpen,
  onToggle,
  title,
  walletAddress,
  walletProvider,
  walletCanSignMessage,
  bchSigningMode,
  onSelectBchSigningMode,
  effectiveBchAddress,
  onRegenerateBch,
  nostrNpub,
  nostrIsExtension,
  hasNip07Extension,
  useNip07,
  onConnectNip07,
  onRegenerateNostr,
  onConnectBch,
  publishedEventSummary
}: {
  isEs: boolean;
  isOpen: boolean;
  onToggle: () => void;
  title: string;
  walletAddress?: string;
  walletProvider?: string;
  walletCanSignMessage: boolean;
  bchSigningMode: 'wallet' | 'local';
  onSelectBchSigningMode: (mode: 'wallet' | 'local') => void;
  effectiveBchAddress: string;
  onRegenerateBch: () => void;
  nostrNpub?: string;
  nostrIsExtension?: boolean;
  hasNip07Extension: boolean;
  useNip07: boolean;
  onConnectNip07: () => void;
  onRegenerateNostr: () => void;
  onConnectBch: () => void;
  publishedEventSummary?: { eventId: string; bchPubkey?: string } | null;
}) {
  return (
    <div className="border-t border-line pt-3">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between text-xs font-medium text-ink-2 hover:text-ink cursor-pointer"
      >
        <span>{title}</span>
        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {isOpen && (
        <div className="mt-3 ui-panel p-3.5 space-y-3 text-xs">
          {walletAddress && !walletCanSignMessage && (
            <div className="text-ink-2 flex items-center justify-between gap-2 pb-2 border-b border-line">
              <span>
                {isEs
                  ? `${walletProvider || 'Wallet'} no expone firma off-chain`
                  : `${walletProvider || 'Wallet'} lacks off-chain signing`}
              </span>
              <button type="button" onClick={onConnectBch} className="font-semibold text-ink hover:underline cursor-pointer">
                WC2
              </button>
            </div>
          )}

          {walletCanSignMessage && (
            <div className="flex items-center justify-between gap-2">
              <span className="ui-label">{isEs ? 'Modo BCH' : 'BCH signer'}</span>
              <div className="ui-segment">
                <button
                  type="button"
                  onClick={() => onSelectBchSigningMode('wallet')}
                  className={`ui-segment-item ${bchSigningMode === 'wallet' ? 'ui-segment-item-active' : ''}`}
                >
                  {walletProvider || 'WC2'}
                </button>
                <button
                  type="button"
                  onClick={() => onSelectBchSigningMode('local')}
                  className={`ui-segment-item ${bchSigningMode === 'local' ? 'ui-segment-item-active' : ''}`}
                >
                  Local
                </button>
              </div>
            </div>
          )}

          {bchSigningMode === 'local' && (
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] text-ink-2 truncate">{effectiveBchAddress}</span>
              <button
                type="button"
                onClick={onRegenerateBch}
                className="font-medium text-ink-2 hover:text-ink flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>{isEs ? 'Rotar BCH' : 'Rotate BCH'}</span>
              </button>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 border-t border-line pt-2.5">
            <div className="min-w-0">
              <div className="ui-label mb-0.5">
                Nostr npub {nostrIsExtension ? '(NIP-07)' : ''}
              </div>
              <div className="font-mono text-[11px] text-ink-2 truncate">{nostrNpub || '...'}</div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {hasNip07Extension && !useNip07 && (
                <button
                  type="button"
                  onClick={onConnectNip07}
                  className="font-semibold text-ink hover:underline cursor-pointer"
                >
                  NIP-07
                </button>
              )}
              <button
                type="button"
                onClick={onRegenerateNostr}
                className="font-medium text-ink-2 hover:text-ink flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>{isEs ? 'Nueva' : 'New'}</span>
              </button>
            </div>
          </div>

          {publishedEventSummary && (
            <div className="border-t border-line pt-2.5 space-y-1 font-mono text-[11px] text-ink-3">
              <div className="truncate">Event ID: {publishedEventSummary.eventId}</div>
              {publishedEventSummary.bchPubkey && (
                <div className="truncate">BCH Pubkey: {publishedEventSummary.bchPubkey}</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function IdentityView({
  bchWallet,
  onConnectBch,
  lang = 'en',
  platformNetwork = 'mainnet',
  onToggleNetwork
}: IdentityViewProps) {
  const isEs = lang === 'es';

  // First-visit Paytaca sponsorship modal banner (mirrors LandingPage promo behavior)
  const PAYTACA_BANNER_STORAGE_KEY = 'bliq_paytaca_identity_banner_dismissed';
  const [showPaytacaBanner, setShowPaytacaBanner] = useState<boolean>(false);

  useEffect(() => {
    try {
      const isDismissed = localStorage.getItem(PAYTACA_BANNER_STORAGE_KEY) === 'true';
      const forceShow =
        typeof window !== 'undefined' &&
        (window.location.search.includes('promo=1') || window.location.search.includes('banner=1'));
      if (!isDismissed || forceShow) {
        const timer = setTimeout(() => setShowPaytacaBanner(true), 400);
        return () => clearTimeout(timer);
      }
    } catch {
      setShowPaytacaBanner(true);
    }
  }, []);

  const handleDismissPaytacaBanner = useCallback(() => {
    setShowPaytacaBanner(false);
    try {
      localStorage.setItem(PAYTACA_BANNER_STORAGE_KEY, 'true');
    } catch {
      // ignore storage quota/privacy errors
    }
  }, []);

  useEffect(() => {
    if (!showPaytacaBanner) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleDismissPaytacaBanner();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showPaytacaBanner, handleDismissPaytacaBanner]);

  // Sync network with platformNetwork
  const [selectedNetwork, setSelectedNetwork] = useState<'mainnet' | 'testnet'>(platformNetwork);
  useEffect(() => {
    setSelectedNetwork(platformNetwork);
  }, [platformNetwork]);
  const isMainnet = selectedNetwork === 'mainnet';

  // Primary navigation (ENS / Basenames minimalist model)
  const [activeSection, setActiveSection] = useState<MainSection>('register');
  const [registerStep, setRegisterStep] = useState<RegisterSubStep>('search');
  const [inspectorTab, setInspectorTab] = useState<InspectorSubTab>('verify');

  // Claimed / active handle in local profile
  const [userHandle, setUserHandle] = useState<string>(() => {
    try {
      return localStorage.getItem('userlink_custom_handle') || 'myuser';
    } catch {
      return 'myuser';
    }
  });
  const cleanHandle = (userHandle || 'myuser').toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'myuser';
  const nip05Address = `${cleanHandle}@bliquid.xyz`;

  // Search-first state (Explore & Register)
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchState, setSearchState] = useState<
    | { status: 'idle' }
    | { status: 'invalid'; reason: 'short' | 'long' | 'chars' }
    | { status: 'searching'; queryLabel: string }
    | { status: 'available'; handle: string }
    | { status: 'taken'; record: ResolvedIdentityRecord; isOwnSession: boolean }
    | { status: 'not_found'; query: string }
    | { status: 'error'; message: string }
  >({ status: 'idle' });
  const searchSeqRef = useRef<number>(0);

  // Target handle currently inside Checkout
  const [checkoutHandle, setCheckoutHandle] = useState<string>(cleanHandle);
  const [showCheckoutAdvanced, setShowCheckoutAdvanced] = useState<boolean>(false);
  const [showProfileAdvanced, setShowProfileAdvanced] = useState<boolean>(false);
  const [isEditingProfileHandle, setIsEditingProfileHandle] = useState<boolean>(false);
  const [tempHandleInput, setTempHandleInput] = useState<string>(cleanHandle);

  // Nostr identity: Local BIP-340 keypair OR optional NIP-07 browser extension
  const [useNip07, setUseNip07] = useState<boolean>(() => {
    try {
      return localStorage.getItem('userlink_use_nip07') === '1';
    } catch {
      return false;
    }
  });
  const [nip07PubkeyHex, setNip07PubkeyHex] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('userlink_nip07_pubkey') || '';
      return /^[0-9a-fA-F]{64}$/.test(saved) ? saved.toLowerCase() : '';
    } catch {
      return '';
    }
  });
  const [hasNip07Extension, setHasNip07Extension] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).nostr) {
      setHasNip07Extension(true);
    }
  }, []);

  const [nostrSkHex, setNostrSkHex] = useState<string>(() => {
    try {
      localStorage.removeItem('sovereign_nostr_sk');
      const saved = sessionStorage.getItem('sovereign_nostr_sk');
      if (saved && /^[0-9a-fA-F]{64}$/.test(saved)) return saved;
      const sk = generateSecretKey();
      const hex = bytesToHex(sk);
      sessionStorage.setItem('sovereign_nostr_sk', hex);
      return hex;
    } catch {
      return bytesToHex(generateSecretKey());
    }
  });

  const nostrKeys = useMemo(() => {
    if (useNip07 && nip07PubkeyHex) {
      try {
        return {
          skBytes: null as Uint8Array | null,
          pk: nip07PubkeyHex,
          npub: nip19.npubEncode(nip07PubkeyHex),
          isExtension: true
        };
      } catch {
        return null;
      }
    }
    try {
      if (!nostrSkHex) return null;
      const skBytes = hexToBytes(nostrSkHex);
      const pk = getPublicKey(skBytes);
      const npub = nip19.npubEncode(pk);
      return { skBytes, pk, npub, isExtension: false };
    } catch {
      return null;
    }
  }, [nostrSkHex, useNip07, nip07PubkeyHex]);

  // Ephemeral session-scoped verifiable BCH secp256k1 keypair (never persisted in localStorage)
  const [demoBchSkHex, setDemoBchSkHex] = useState<string>(() => {
    try {
      localStorage.removeItem('sovereign_demo_bch_sk');
      const saved = sessionStorage.getItem('sovereign_demo_bch_sk');
      if (saved && /^[0-9a-fA-F]{64}$/.test(saved)) return saved;
      const sk = bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
      sessionStorage.setItem('sovereign_demo_bch_sk', sk);
      return sk;
    } catch {
      return bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
    }
  });

  const demoBchData = useMemo(() => {
    try {
      if (!demoBchSkHex) return null;
      const skBytes = hexToBytes(demoBchSkHex);
      const pubkeyBytes = secp256k1.getPublicKey(skBytes, true);
      const pubkeyHex = bytesToHex(pubkeyBytes);
      const address = pubkeyToCashAddress(pubkeyBytes, !isMainnet, false);
      return { skBytes, pubkeyBytes, pubkeyHex, address };
    } catch {
      return null;
    }
  }, [demoBchSkHex, isMainnet]);

  const [wc2HydrationTick, setWc2HydrationTick] = useState(0);
  useEffect(() => {
    let active = true;
    if (bchWallet?.source === 'wc2-bch' && !hasActiveBchMessageSigningCapability('wc2-bch')) {
      restoreBchWalletConnectSession(platformNetwork === 'testnet')
        .then((session) => {
          if (active && session) {
            setWc2HydrationTick((tick) => tick + 1);
          }
        })
        .catch(() => {});
    }
    return () => {
      active = false;
    };
  }, [bchWallet?.source, bchWallet?.address, platformNetwork]);

  const walletCanSignMessage = useMemo(
    () => Boolean(bchWallet?.address) && hasActiveBchMessageSigningCapability(bchWallet?.source),
    [bchWallet?.address, bchWallet?.source, wc2HydrationTick]
  );

  const [bchSigningMode, setBchSigningMode] = useState<'wallet' | 'local'>(() =>
    walletCanSignMessage ? 'wallet' : 'local'
  );

  useEffect(() => {
    setBchSigningMode(walletCanSignMessage ? 'wallet' : 'local');
  }, [walletCanSignMessage]);

  const effectiveBchAddress = useMemo(() => {
    if (bchSigningMode === 'wallet' && bchWallet?.address) {
      return convertCashAddressNetwork(bchWallet.address, !isMainnet, false);
    }
    return demoBchData?.address || '';
  }, [bchSigningMode, bchWallet?.address, demoBchData?.address, isMainnet]);

  // Binding / publishing state
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [signingStage, setSigningStage] = useState<'idle' | 'bch' | 'nostr' | 'relays' | 'done'>('idle');
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishLogs, setPublishLogs] = useState<
    Array<{ relay: string; status: 'pending' | 'ok' | 'error'; latency?: number; error?: string }>
  >([]);
  const [publishedEvent, setPublishedEvent] = useState<{
    event: NostrEvent;
    verified: VerifiedUserLinkResult;
    indexedCount: number;
  } | null>(null);

  // Live relay connectivity status
  const [onlineRelayCount, setOnlineRelayCount] = useState<number | null>(null);
  useEffect(() => {
    if (publishLogs.length > 0 && publishLogs.every((l) => l.status !== 'pending')) {
      setOnlineRelayCount(publishLogs.filter((l) => l.status === 'ok').length);
    }
  }, [publishLogs]);

  useEffect(() => {
    let cancelled = false;
    const sockets: WebSocket[] = [];
    const timers: ReturnType<typeof setTimeout>[] = [];
    let okCount = 0;
    let settled = 0;

    USERLINK_RELAYS.forEach((url) => {
      try {
        const ws = new WebSocket(url);
        sockets.push(ws);
        const timer = setTimeout(() => {
          ws.onopen = null;
          ws.onerror = null;
          try {
            ws.close();
          } catch {}
          settled++;
          if (!cancelled && settled === USERLINK_RELAYS.length) {
            setOnlineRelayCount(okCount);
          }
        }, 3500);
        timers.push(timer);
        ws.onopen = () => {
          clearTimeout(timer);
          ws.onopen = null;
          ws.onerror = null;
          okCount++;
          settled++;
          try {
            ws.close();
          } catch {}
          if (!cancelled) setOnlineRelayCount(okCount);
        };
        ws.onerror = () => {
          clearTimeout(timer);
          ws.onopen = null;
          ws.onerror = null;
          settled++;
          if (!cancelled && settled === USERLINK_RELAYS.length) {
            setOnlineRelayCount(okCount);
          }
        };
      } catch {
        settled++;
      }
    });

    return () => {
      cancelled = true;
      timers.forEach((t) => clearTimeout(t));
      sockets.forEach((ws) => {
        ws.onopen = null;
        ws.onerror = null;
        try {
          ws.close();
        } catch {}
      });
    };
  }, []);

  // QR modal state
  const [qrModalData, setQrModalData] = useState<{ handle: string; address: string } | null>(null);

  // Copy helper
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copyToClipboard = (text: string, keyId: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).catch(() => {});
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
    } catch {}
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Resolved public profile + payment launcher state
  const [resolvedRecord, setResolvedRecord] = useState<ResolvedIdentityRecord | null>(null);
  const [payAmount, setPayAmount] = useState<string>('0.01');
  const [isSendingPay, setIsSendingPay] = useState<boolean>(false);
  const [paySuccessData, setPaySuccessData] = useState<{
    txId: string;
    amount: string;
    recipient: string;
    bchAddress: string;
  } | null>(null);

  // Inspector: Relay Verifier state
  const [verifyInput, setVerifyInput] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verificationResult, setVerificationResult] = useState<VerifiedUserLinkResult | null>(null);
  const [authenticEventBackup, setAuthenticEventBackup] = useState<NostrEvent | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [isTamperedPreview, setIsTamperedPreview] = useState<boolean>(false);

  // Stretch-goal states: DID Doc, Portable W3C Attestations (Kind 1985), Key Rotation, OP_RETURN Anchor, Selective Disclosure
  const [showDidDoc, setShowDidDoc] = useState<boolean>(false);
  const [anchorTxInput, setAnchorTxInput] = useState<string>('');
  const [anchorAuditInput, setAnchorAuditInput] = useState<string>('');
  const [anchorAuditResult, setAnchorAuditResult] = useState<{
    checking: boolean;
    verifiedOnChain?: boolean;
    confirmations?: number;
    commitmentHex?: string;
    reason?: string;
  } | null>(null);
  const [resolvedAttestations, setResolvedAttestations] = useState<UserLinkAttestationResult[]>([]);
  const [attestations, setAttestations] = useState<UserLinkAttestationResult[]>([]);
  const [attClaimType, setAttClaimType] = useState<string>('MerchantVerified');
  const [attSummary, setAttSummary] = useState<string>('Verified peer settlement & CashTokens support');
  const [attPrivateAttr, setAttPrivateAttr] = useState<string>('tier');
  const [attPrivateVal, setAttPrivateVal] = useState<string>('verified_gold');
  const [attPrivateSalt, setAttPrivateSalt] = useState<string>('ul_salt_2026');
  const [attPublishing, setAttPublishing] = useState<boolean>(false);
  const [sdCheckResult, setSdCheckResult] = useState<boolean | null>(null);
  const [payAsset, setPayAsset] = useState<'BCH' | 'PUSD' | 'MUSD' | 'LIFT'>('PUSD');

  // Inspector: Challenge Auth state
  const [authChallenge, setAuthChallenge] = useState<string>('');
  const [authSignature, setAuthSignature] = useState<string>('');
  const [authResult, setAuthResult] = useState<{
    isChallengeSigValid: boolean;
    linkedBchAddress: string | null;
    isIdentityBound: boolean;
    signerNpub: string;
  } | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);

  const resetActiveProofs = () => {
    setPublishedEvent(null);
    setPublishLogs([]);
    setPublishError(null);
    setSigningStage('idle');
    setAuthResult(null);
    setAuthSignature('');
  };

  const handleSelectNetwork = (net: 'mainnet' | 'testnet') => {
    if (net === selectedNetwork) return;
    setSelectedNetwork(net);
    onToggleNetwork?.(net);
    resetActiveProofs();
    setPaySuccessData(null);
  };

  const persistHandle = (nextHandle: string) => {
    const formatted = nextHandle.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'myuser';
    setUserHandle(formatted);
    try {
      localStorage.setItem('userlink_custom_handle', formatted);
    } catch {}
    return formatted;
  };

  const handleSaveProfileHandle = () => {
    const formatted = persistHandle(tempHandleInput);
    setTempHandleInput(formatted);
    setIsEditingProfileHandle(false);
    resetActiveProofs();
  };

  const handleConnectNip07 = async () => {
    const win = window as any;
    if (!win?.nostr?.getPublicKey) return;
    try {
      const pk: string = await win.nostr.getPublicKey();
      if (pk && /^[0-9a-fA-F]{64}$/.test(pk)) {
        const cleanPk = pk.toLowerCase();
        setNip07PubkeyHex(cleanPk);
        setUseNip07(true);
        try {
          localStorage.setItem('userlink_use_nip07', '1');
          localStorage.setItem('userlink_nip07_pubkey', cleanPk);
        } catch {}
        resetActiveProofs();
      }
    } catch (err: any) {
      setPublishError(
        err?.message ||
          (isEs ? 'No se pudo obtener la clave pública de tu extensión Nostr.' : 'Failed to connect Nostr NIP-07 extension.')
      );
    }
  };

  const handleRegenerateNostr = () => {
    const sk = generateSecretKey();
    const hex = bytesToHex(sk);
    setUseNip07(false);
    setNip07PubkeyHex('');
    setNostrSkHex(hex);
    try {
      localStorage.removeItem('userlink_use_nip07');
      localStorage.removeItem('userlink_nip07_pubkey');
      localStorage.removeItem('sovereign_nostr_sk');
      sessionStorage.setItem('sovereign_nostr_sk', hex);
    } catch {}
    resetActiveProofs();
  };

  const handleRegenerateBchDemo = () => {
    const sk = bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
    setDemoBchSkHex(sk);
    try {
      localStorage.removeItem('sovereign_demo_bch_sk');
      sessionStorage.setItem('sovereign_demo_bch_sk', sk);
    } catch {}
    resetActiveProofs();
  };

  // Real debounced ENS-style availability & profile lookup
  const runSearchLookup = useCallback(
    async (rawInput: string) => {
      const classified = classifyQuery(rawInput);
      const seq = ++searchSeqRef.current;

      if (classified.kind === 'empty') {
        setSearchState({ status: 'idle' });
        return;
      }

      if (classified.kind === 'invalid_handle') {
        setSearchState({ status: 'invalid', reason: classified.reason });
        return;
      }

      const queryString =
        classified.kind === 'handle' ? `@${classified.handle}` : classified.query;

      setSearchState({ status: 'searching', queryLabel: queryString });

      // Check local session published record first if it matches exact handle or query
      const qNoAt = queryString.replace(/^@/, '').split('@')[0].toLowerCase();
      if (
        publishedEvent?.verified.isOverallValid &&
        (publishedEvent.verified.handle.replace(/^@/, '').toLowerCase() === qNoAt ||
          publishedEvent.verified.npub === queryString ||
          publishedEvent.verified.bchAddress === queryString)
      ) {
        if (seq !== searchSeqRef.current) return;
        setSearchState({
          status: 'taken',
          isOwnSession: true,
          record: {
            handle: publishedEvent.verified.handle,
            nip05: publishedEvent.verified.nip05,
            bchAddress: publishedEvent.verified.bchAddress,
            npub: publishedEvent.verified.npub,
            pubkeyHex: publishedEvent.verified.pubkeyHex,
            isVerified: true,
            sourceLabel: isEs ? 'Registrado en esta sesión' : 'Registered in this session'
          }
        });
        return;
      }

      try {
        const { verified, nip05Fallback } = await resolveUserLinkFromRelays(queryString);
        if (seq !== searchSeqRef.current) return;

        if (verified && verified.isOverallValid) {
          setSearchState({
            status: 'taken',
            isOwnSession: Boolean(nostrKeys?.pk && verified.pubkeyHex.toLowerCase() === nostrKeys.pk.toLowerCase()),
            record: {
              handle: verified.handle,
              nip05: verified.nip05,
              bchAddress: verified.bchAddress,
              npub: verified.npub,
              pubkeyHex: verified.pubkeyHex,
              isVerified: true,
              sourceLabel: isEs ? 'Relay Nostr + Prueba criptográfica' : 'Nostr Relay + Crypto Proof'
            }
          });
          return;
        }

        if (nip05Fallback?.bchAddress) {
          setSearchState({
            status: 'taken',
            isOwnSession: Boolean(
              nostrKeys?.pk && nip05Fallback.pubkeyHex.toLowerCase() === nostrKeys.pk.toLowerCase()
            ),
            record: {
              handle: nip05Fallback.handle,
              nip05: nip05Fallback.nip05,
              bchAddress: nip05Fallback.bchAddress,
              npub: nip19.npubEncode(nip05Fallback.pubkeyHex),
              pubkeyHex: nip05Fallback.pubkeyHex,
              isVerified: false,
              sourceLabel: isEs ? 'Directorio NIP-05 (sin evento Kind 30078)' : 'NIP-05 Directory (no Kind 30078 proof)'
            }
          });
          return;
        }

        if (classified.kind === 'handle') {
          setSearchState({ status: 'available', handle: classified.handle });
        } else {
          setSearchState({ status: 'not_found', query: queryString });
        }
      } catch (err: any) {
        if (seq !== searchSeqRef.current) return;
        setSearchState({
          status: 'error',
          message:
            err?.message === 'INVALID_NPUB'
              ? isEs
                ? 'El npub ingresado no es válido.'
                : 'Invalid npub format.'
              : isEs
              ? 'No pudimos consultar los relays en este momento.'
              : 'Could not query decentralized relays right now.'
        });
      }
    },
    [isEs, nostrKeys?.pk, publishedEvent]
  );

  // Debounced live search when typing in the search bar
  useEffect(() => {
    if (activeSection !== 'register' || registerStep !== 'search') return;
    const classified = classifyQuery(searchQuery);
    if (classified.kind === 'empty') {
      searchSeqRef.current++;
      setSearchState({ status: 'idle' });
      return;
    }
    if (classified.kind === 'invalid_handle') {
      searchSeqRef.current++;
      setSearchState({ status: 'invalid', reason: classified.reason });
      return;
    }
    const timer = setTimeout(() => {
      runSearchLookup(searchQuery);
    }, 450);
    return () => clearTimeout(timer);
  }, [searchQuery, activeSection, registerStep, runSearchLookup]);

  const handleOpenCheckout = (targetHandle: string) => {
    const clean = persistHandle(targetHandle);
    setCheckoutHandle(clean);
    setTempHandleInput(clean);
    resetActiveProofs();
    setRegisterStep('checkout');
  };

  const handleOpenResolvedProfile = (record: ResolvedIdentityRecord) => {
    setResolvedRecord(record);
    setResolvedAttestations([]);
    setPaySuccessData(null);
    setActiveSection('register');
    setRegisterStep('resolved');
    if (record.pubkeyHex) {
      fetchAttestationsFromRelays(record.pubkeyHex)
        .then((list) => setResolvedAttestations(list))
        .catch(() => {});
    }
  };

  // PUBLISH REAL CRYPTOGRAPHIC BINDING (OR BCH-AUTHORIZED KEY ROTATION) TO NOSTR RELAYS
  const handleCreateBinding = async (
    targetHandleOverride?: string,
    rotationOpts?: { previousNostrPubkey?: string; anchorTxId?: string }
  ) => {
    const activeHandle = persistHandle(targetHandleOverride || cleanHandle);
    const activeNip05 = `${activeHandle}@bliquid.xyz`;
    const prevPubkey = (rotationOpts?.previousNostrPubkey || '').trim().toLowerCase();
    const cleanAnchorTx = (rotationOpts?.anchorTxId ?? anchorTxInput).trim().toLowerCase();

    if (!nostrKeys || !effectiveBchAddress) return;
    setIsPublishing(true);
    setSigningStage('bch');
    setPublishError(null);
    setPublishLogs(USERLINK_RELAYS.map((r) => ({ relay: r, status: 'pending', latency: 0 })));

    try {
      const now = Math.floor(Date.now() / 1000);
      const isRotation = /^[0-9a-f]{64}$/.test(prevPubkey) && prevPubkey !== nostrKeys.pk;

      // 1. Canonical Bidirectional Identity Statement (supports BCH-Authorized Key Rotation)
      const statementObject: Record<string, unknown> = {
        protocol: 'bch-nostr-userlink-id-v1',
        issuer: 'Drian Stack Labs UserLink',
        username: `@${activeHandle}`,
        nip05: activeNip05,
        bchAddress: effectiveBchAddress,
        bchSignerMode: bchSigningMode,
        nostrPubkey: nostrKeys.pk,
        ...(isRotation ? { action: 'bch-authorized-key-rotation', previousNostrPubkey: prevPubkey } : {}),
        statement: isRotation
          ? 'My Bitcoin Cash key authorizes rotating this identity from previousNostrPubkey to nostrPubkey without central intermediaries.'
          : 'I cryptographically attest that I control both this Bitcoin Cash address and this Nostr identity without reliance on custodial intermediaries.',
        issuedAt: now,
        network: selectedNetwork
      };

      const statementJson = JSON.stringify(statementObject);

      // 2. Bitcoin Signed Message signature (`bch_signMessage` via wallet OR verifiable local secp256k1)
      let bchSignature = '';
      if (bchSigningMode === 'wallet' && walletCanSignMessage) {
        const res = await signBchMessage({
          message: statementJson,
          userPrompt: isEs
            ? `Registrar @${activeHandle} (${effectiveBchAddress})`
            : `Register @${activeHandle} (${effectiveBchAddress})`,
          isTestnet: !isMainnet,
          preferredSource: bchWallet?.source
        });
        bchSignature = res.signature;
      } else {
        if (!demoBchData) {
          throw new Error(isEs ? 'Par local BCH no disponible.' : 'Local BCH keypair unavailable.');
        }
        bchSignature = signBitcoinMessage(statementJson, demoBchData.skBytes);
      }

      setSigningStage('nostr');

      const provisionalTemplate = {
        kind: 30078,
        created_at: now,
        tags: [
          ['d', USERLINK_D_TAG],
          ['t', activeHandle],
          ['t', effectiveBchAddress],
          ['i', `bch:${effectiveBchAddress}`, bchSignature],
          ['bch', effectiveBchAddress],
          ['bch_sig', bchSignature],
          ['sig_scheme', 'bitcoin-signed-message'],
          ['handle', activeHandle],
          ['nip05', activeNip05],
          ['c', 'userlink-bch-id'],
          ['client', 'UserLink by Drian Stack Labs'],
          ['network', selectedNetwork],
          ['claim', isRotation ? 'bch-authorized-key-rotation' : 'bch-schnorr-bsm-binding'],
          ...(isRotation ? [['prev_nostr', prevPubkey]] : []),
          ...(/^[0-9a-f]{64}$/.test(cleanAnchorTx) ? [['anchor_tx', cleanAnchorTx]] : [])
        ],
        content: statementJson
      };

      // 3. Sign BIP-340 Schnorr Nostr Event (Kind 30078)
      let signedEvent: NostrEvent;
      if (nostrKeys.isExtension && (window as any).nostr?.signEvent) {
        signedEvent = await (window as any).nostr.signEvent({
          ...provisionalTemplate,
          pubkey: nostrKeys.pk
        });
      } else if (nostrKeys.skBytes) {
        signedEvent = finalizeEvent(provisionalTemplate, nostrKeys.skBytes);
      } else {
        throw new Error('No active Nostr signer available.');
      }

      const preCheck = verifyUserLinkEvent(signedEvent);
      if (!preCheck.isOverallValid) {
        throw new Error(
          preCheck.verificationNote ||
            (isEs
              ? 'La firma BCH no coincide con la dirección seleccionada.'
              : 'BCH signature does not match the selected CashAddress.')
        );
      }

      // 4. Broadcast cleanly to live Nostr Relays with awaited OK acks
      setSigningStage('relays');
      type LogItem = { relay: string; status: 'pending' | 'ok' | 'error'; latency?: number; error?: string };
      const logs: LogItem[] = USERLINK_RELAYS.map((r) => ({ relay: r, status: 'pending', latency: 0 }));

      await Promise.all(
        USERLINK_RELAYS.map(async (relayUrl, idx) => {
          const res = await publishUserLinkToRelay(relayUrl, signedEvent, 5500);
          logs[idx] = {
            relay: relayUrl,
            status: res.ok ? 'ok' : 'error',
            latency: res.latency,
            error: res.error
          };
          setPublishLogs([...logs]);
        })
      );

      const indexedCount = logs.filter((l) => l.status === 'ok').length;
      setPublishedEvent({
        event: signedEvent,
        verified: preCheck,
        indexedCount
      });
      setVerifyInput(nostrKeys.npub);
      try {
        localStorage.setItem(
          'userlink_verified_identity_v1',
          JSON.stringify({
            handle: preCheck.handle,
            nip05: preCheck.nip05,
            bchAddress: preCheck.bchAddress,
            connectedBchAddress: bchWallet?.address || preCheck.bchAddress,
            npub: preCheck.npub,
            pubkeyHex: preCheck.pubkeyHex,
            eventId: signedEvent.id,
            timestamp: preCheck.timestamp
          })
        );
      } catch {}

      if (indexedCount > 0) {
        setSigningStage('done');
        try {
          confetti({
            particleCount: 65,
            spread: 60,
            origin: { y: 0.6 }
          });
        } catch {}
      } else {
        setSigningStage('idle');
        setPublishError(
          isEs
            ? 'El evento se firmó localmente, pero ningún relay respondió a tiempo.'
            : 'Event was signed locally, but no relay acknowledged within timeout.'
        );
      }
    } catch (err: any) {
      console.error('UserLink binding error:', err);
      setSigningStage('idle');
      setPublishError(
        err?.message || (isEs ? 'Error al generar o publicar el registro.' : 'Failed to create or publish registration.')
      );
      setPublishLogs([]);
    } finally {
      setIsPublishing(false);
    }
  };

  // Sandbox demo payment receipt inside Resolved Profile
  const handleSendSimulationPay = async () => {
    if (!resolvedRecord) return;
    setIsSendingPay(true);
    await new Promise((r) => setTimeout(r, 750));
    const demoTxId = bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
    setPaySuccessData({
      txId: demoTxId,
      amount: payAmount,
      recipient: resolvedRecord.handle,
      bchAddress: resolvedRecord.bchAddress
    });
    setIsSendingPay(false);
    try {
      confetti({
        particleCount: 50,
        spread: 55,
        origin: { y: 0.55 }
      });
    } catch {}
  };

  // Live cryptographic verification (Inspector)
  const handleVerify = async (targetOverride?: string) => {
    const rawTarget = (targetOverride || verifyInput).trim();
    if (!rawTarget) return;

    setIsVerifying(true);
    setVerificationResult(null);
    setAuthenticEventBackup(null);
    setVerifyError(null);
    setIsTamperedPreview(false);
    setAttestations([]);
    setAnchorAuditResult(null);
    setSdCheckResult(null);

    try {
      const { verified } = await resolveUserLinkFromRelays(rawTarget);
      if (verified) {
        setVerificationResult(verified);
        setAnchorAuditInput(verified.anchorTxId || '');
        fetchAttestationsFromRelays(verified.pubkeyHex)
          .then((list) => setAttestations(list))
          .catch(() => {});
        return;
      }

      const cleanQ = rawTarget.replace(/^@/, '').split('@')[0].toLowerCase();
      if (
        publishedEvent &&
        (publishedEvent.verified.handle.replace(/^@/, '').toLowerCase() === cleanQ ||
          publishedEvent.verified.npub === rawTarget ||
          publishedEvent.verified.pubkeyHex.toLowerCase() === rawTarget.toLowerCase() ||
          publishedEvent.verified.bchAddress === rawTarget)
      ) {
        const localChecked = verifyUserLinkEvent(publishedEvent.event);
        setVerificationResult(localChecked);
        setAnchorAuditInput(localChecked.anchorTxId || '');
        fetchAttestationsFromRelays(localChecked.pubkeyHex)
          .then((list) => setAttestations(list))
          .catch(() => {});
        return;
      }

      setVerifyError(
        isEs
          ? 'No se encontró ningún evento Kind 30078 en los relays para este identificador.'
          : 'No Kind 30078 UserLink binding found on public relays for this identifier.'
      );
    } catch (err: any) {
      if (err?.message === 'INVALID_NPUB') {
        setVerifyError(isEs ? 'El npub ingresado no es válido.' : 'Invalid npub format.');
      } else {
        setVerifyError(isEs ? 'Error al consultar relays de Nostr.' : 'Error querying public Nostr relays.');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  // BCH-authorized Nostr key rotation (signs transition from previousNostrPubkey -> new key with BCH wallet)
  const handleRotateAuthorizedKey = async () => {
    const prevPk = nostrKeys?.pk || '';
    if (!prevPk) return;
    const nextSk = generateSecretKey();
    const nextHex = bytesToHex(nextSk);
    const nextPk = getPublicKey(nextSk);
    const nextNpub = nip19.npubEncode(nextPk);

    setUseNip07(false);
    setNip07PubkeyHex('');
    setNostrSkHex(nextHex);
    try {
      localStorage.removeItem('userlink_use_nip07');
      localStorage.removeItem('userlink_nip07_pubkey');
      sessionStorage.setItem('sovereign_nostr_sk', nextHex);
    } catch {}

    // Sign rotation directly with the new key while passing prev_nostr authorization to BCH signer
    setIsPublishing(true);
    setSigningStage('bch');
    setPublishError(null);
    setPublishLogs(USERLINK_RELAYS.map((r) => ({ relay: r, status: 'pending', latency: 0 })));
    try {
      const now = Math.floor(Date.now() / 1000);
      const statementObject = {
        protocol: 'bch-nostr-userlink-id-v1',
        issuer: 'Drian Stack Labs UserLink',
        action: 'bch-authorized-key-rotation',
        username: `@${cleanHandle}`,
        nip05: `${cleanHandle}@bliquid.xyz`,
        bchAddress: effectiveBchAddress,
        bchSignerMode: bchSigningMode,
        previousNostrPubkey: prevPk,
        nostrPubkey: nextPk,
        statement:
          'My Bitcoin Cash key authorizes rotating this identity from previousNostrPubkey to nostrPubkey without central intermediaries.',
        issuedAt: now,
        network: selectedNetwork
      };
      const statementJson = JSON.stringify(statementObject);
      let bchSignature = '';
      if (bchSigningMode === 'wallet' && walletCanSignMessage) {
        const res = await signBchMessage({
          message: statementJson,
          userPrompt: isEs ? `Autorizar rotación @${cleanHandle}` : `Authorize key rotation @${cleanHandle}`,
          isTestnet: !isMainnet,
          preferredSource: bchWallet?.source
        });
        bchSignature = res.signature;
      } else if (demoBchData) {
        bchSignature = signBitcoinMessage(statementJson, demoBchData.skBytes);
      }

      setSigningStage('nostr');
      const signedEvent = finalizeEvent(
        {
          kind: 30078,
          created_at: now,
          tags: [
            ['d', USERLINK_D_TAG],
            ['t', cleanHandle],
            ['t', effectiveBchAddress],
            ['i', `bch:${effectiveBchAddress}`, bchSignature],
            ['bch', effectiveBchAddress],
            ['bch_sig', bchSignature],
            ['sig_scheme', 'bitcoin-signed-message'],
            ['handle', cleanHandle],
            ['nip05', `${cleanHandle}@bliquid.xyz`],
            ['prev_nostr', prevPk],
            ['claim', 'bch-authorized-key-rotation'],
            ['network', selectedNetwork],
            ...(/^[0-9a-f]{64}$/i.test(anchorTxInput.trim()) ? [['anchor_tx', anchorTxInput.trim().toLowerCase()]] : [])
          ],
          content: statementJson
        },
        nextSk
      );

      setSigningStage('relays');
      const logs: Array<{ relay: string; status: 'pending' | 'ok' | 'error'; latency?: number; error?: string }> =
        USERLINK_RELAYS.map((r) => ({ relay: r, status: 'pending', latency: 0 }));
      await Promise.all(
        USERLINK_RELAYS.map(async (relayUrl, idx) => {
          const r = await publishUserLinkToRelay(relayUrl, signedEvent, 5500);
          logs[idx] = { relay: relayUrl, status: r.ok ? 'ok' : 'error', latency: r.latency, error: r.error };
          setPublishLogs([...logs]);
        })
      );
      const checked = verifyUserLinkEvent(signedEvent);
      setPublishedEvent({ event: signedEvent, verified: checked, indexedCount: logs.filter((l) => l.status === 'ok').length });
      setVerifyInput(nextNpub);
      setSigningStage('done');
    } catch (err: any) {
      setSigningStage('idle');
      setPublishError(err?.message || 'Rotation failed');
    } finally {
      setIsPublishing(false);
    }
  };

  // Publish third-party / peer W3C Verifiable Credential (Kind 1985 NIP-32 + Salted Selective Disclosure)
  const handlePublishAttestation = async () => {
    if (!verificationResult || !nostrKeys?.skBytes) return;
    setAttPublishing(true);
    try {
      const saltedCommitments: Record<string, string> = {};
      if (attPrivateAttr.trim() && attPrivateVal.trim() && attPrivateSalt.trim()) {
        saltedCommitments[attPrivateAttr.trim().toLowerCase()] = createSaltedDisclosureCommitment(
          attPrivateSalt.trim(),
          attPrivateAttr.trim(),
          attPrivateVal.trim()
        );
      }
      const signedVc = createSignedAttestationEvent({
        subjectPubkeyHex: verificationResult.pubkeyHex,
        subjectBchAddress: verificationResult.bchAddress,
        subjectHandle: verificationResult.handle,
        claimType: attClaimType,
        claimSummary: attSummary.trim() || attClaimType,
        rating: attClaimType === 'TradeReputation' ? 5 : undefined,
        saltedCommitments,
        issuerSkBytes: nostrKeys.skBytes
      });
      await Promise.all(USERLINK_RELAYS.map((r) => publishUserLinkToRelay(r, signedVc, 4500)));
      const checked = verifyAttestationEvent(signedVc);
      if (checked.isOverallValid) {
        setAttestations((prev) => [checked, ...prev]);
      }
    } finally {
      setAttPublishing(false);
    }
  };

  const handleCheckOnChainAnchor = async () => {
    if (!verificationResult || !anchorAuditInput.trim()) return;
    setAnchorAuditResult({ checking: true });
    try {
      const checkNet: 'mainnet' | 'testnet' = verificationResult.bchAddress.startsWith('bchtest:')
        ? 'testnet'
        : 'mainnet';
      const res = await verifyBchOnChainAnchor({
        txid: anchorAuditInput.trim(),
        statementContent: verificationResult.event.content,
        network: checkNet
      });
      setAnchorAuditResult({ checking: false, ...res });
    } catch (err: any) {
      setAnchorAuditResult({ checking: false, verifiedOnChain: false, reason: err?.message || 'Error' });
    }
  };

  const handleRunTamperTest = () => {
    if (!verificationResult) return;
    if (isTamperedPreview && authenticEventBackup) {
      setVerificationResult(verifyUserLinkEvent(authenticEventBackup));
      setAuthenticEventBackup(null);
      setIsTamperedPreview(false);
      return;
    }
    const fakeAddr = verificationResult.bchAddress.startsWith('bchtest:')
      ? 'bchtest:qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqp5t4s9r'
      : 'bitcoincash:qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqfnhks603';
    const nextContent = verificationResult.event.content.includes(verificationResult.bchAddress)
      ? verificationResult.event.content.replace(verificationResult.bchAddress, fakeAddr)
      : `${verificationResult.event.content} `;
    setAuthenticEventBackup(verificationResult.event);
    const tamperedEvent: NostrEvent = {
      ...verificationResult.event,
      content: nextContent
    };
    setVerificationResult(verifyUserLinkEvent(tamperedEvent));
    setIsTamperedPreview(true);
  };

  // Challenge auth (Inspector)
  const handleGenerateChallenge = () => {
    const now = Math.floor(Date.now() / 1000);
    const nonce = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
    setAuthChallenge(`userlink-auth-challenge:${nonce}:${now}:bliquid.xyz`);
    setAuthSignature('');
    setAuthResult(null);
  };

  const handleSignChallenge = async () => {
    if (!authChallenge || !nostrKeys) return;
    setIsAuthenticating(true);
    try {
      let isChallengeSigValid = false;
      let sigDisplay = '';

      if (nostrKeys.isExtension && (window as any).nostr?.signEvent) {
        const signedAuthEvent = await (window as any).nostr.signEvent({
          kind: 22242,
          created_at: Math.floor(Date.now() / 1000),
          tags: [
            ['relay', 'wss://bliquid.xyz'],
            ['challenge', authChallenge]
          ],
          content: authChallenge
        });
        sigDisplay = signedAuthEvent.sig;
        isChallengeSigValid = verifyEvent(signedAuthEvent);
      } else if (nostrKeys.skBytes) {
        const challengeBytes = new TextEncoder().encode(authChallenge);
        const challengeHash = sha256(challengeBytes);
        const sigBytes = schnorr.sign(challengeHash, nostrKeys.skBytes);
        sigDisplay = bytesToHex(sigBytes);
        isChallengeSigValid = schnorr.verify(sigBytes, challengeHash, hexToBytes(nostrKeys.pk));
      }

      setAuthSignature(sigDisplay);

      let linkedBchAddress: string | null = null;
      let isIdentityBound = false;

      const { verified } = await resolveUserLinkFromRelays(nostrKeys.npub);
      if (verified && verified.isOverallValid) {
        linkedBchAddress = verified.bchAddress;
        isIdentityBound = true;
      } else if (
        publishedEvent?.verified.isOverallValid &&
        publishedEvent.verified.pubkeyHex === nostrKeys.pk
      ) {
        linkedBchAddress = publishedEvent.verified.bchAddress;
        isIdentityBound = true;
      }

      setAuthResult({
        isChallengeSigValid,
        linkedBchAddress,
        isIdentityBound,
        signerNpub: nostrKeys.npub
      });

      if (isChallengeSigValid && isIdentityBound) {
        try {
          confetti({
            particleCount: 45,
            spread: 50,
            origin: { y: 0.6 }
          });
        } catch {}
      }
    } catch (err) {
      console.error('Challenge signing error:', err);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const buildBip21Uri = (address: string, amount?: string, label?: string) => {
    const cleanAddr = (address || '').trim();
    const params = new URLSearchParams();
    if (amount && Number(amount) > 0) params.set('amount', amount);
    if (label) params.set('label', label);
    const qs = params.toString();
    return qs ? `${cleanAddr}?${qs}` : cleanAddr;
  };

  const qrModalUrl = useMemo(() => {
    if (!qrModalData?.address) return '';
    return generateQrDataUrl(qrModalData.address, 6, 2);
  }, [qrModalData?.address]);

  const isCurrentHandlePublished =
    Boolean(publishedEvent?.verified.isOverallValid) &&
    publishedEvent?.verified.handle.replace(/^@/, '').toLowerCase() === cleanHandle;

  const isCheckoutDone =
    Boolean(publishedEvent?.verified.isOverallValid) &&
    publishedEvent?.verified.handle.replace(/^@/, '').toLowerCase() === checkoutHandle &&
    publishedEvent.indexedCount > 0;

  return (
    <div className="ui-page pb-24 sm:pb-16 animate-fade-in">
      {/* =====================================================================
          CLEAN PAGE HEADER (BinaryLiquid Design System: Minimal & Calm)
          ===================================================================== */}
      <div className="ui-page-header">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="ui-title">UserLink</h1>
            <span className="ui-badge">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  onlineRelayCount === null
                    ? 'bg-amber-500'
                    : onlineRelayCount > 0
                    ? 'bg-emerald-500'
                    : 'bg-rose-500'
                }`}
              />
              <span>
                {onlineRelayCount === null
                  ? isEs
                    ? 'Conectando relays...'
                    : 'Connecting relays...'
                  : `${onlineRelayCount}/${USERLINK_RELAYS.length} relays`}
              </span>
            </span>
            <button
              type="button"
              onClick={() => setShowPaytacaBanner(true)}
              className="ui-badge hover:bg-surface-3 transition-colors cursor-pointer"
              title={isEs ? 'Patrocinado por Paytaca Wallet' : 'Sponsored by Paytaca Wallet'}
            >
              <img src="/paytaca-logo.png" alt="Paytaca" className="w-3.5 h-3.5 object-contain" />
              <span>{isEs ? 'Patrocinado por Paytaca' : 'Sponsored by Paytaca'}</span>
            </button>
          </div>
          <p className="ui-subtitle">
            {isEs
              ? 'Tu @usuario en Bitcoin Cash, verificable sin custodia ni gas.'
              : 'Your @handle on Bitcoin Cash, cryptographically verifiable with zero gas.'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="ui-segment">
            <button
              type="button"
              onClick={() => handleSelectNetwork('mainnet')}
              className={`ui-segment-item ${isMainnet ? 'ui-segment-item-active' : ''}`}
            >
              Mainnet
            </button>
            <button
              type="button"
              onClick={() => handleSelectNetwork('testnet')}
              className={`ui-segment-item ${!isMainnet ? 'ui-segment-item-active' : ''}`}
            >
              Chipnet
            </button>
          </div>

          <a
            href="/explainer-id/"
            target="_blank"
            rel="noreferrer"
            className="ui-btn-secondary ui-btn-sm"
          >
            <span>{isEs ? 'Cómo funciona' : 'How it works'}</span>
            <ExternalLink className="w-3.5 h-3.5 text-ink-3" />
          </a>
        </div>
      </div>

      {/* =====================================================================
          TOP MODE SWITCHER (3 Consumer/Audit Pillars)
          ===================================================================== */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="ui-segment max-w-full overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => {
              setActiveSection('register');
              if (registerStep === 'checkout' && isCheckoutDone) {
                setRegisterStep('search');
              }
            }}
            className={`ui-segment-item flex items-center gap-1.5 whitespace-nowrap ${
              activeSection === 'register' ? 'ui-segment-item-active' : ''
            }`}
          >
            <Search className="w-3.5 h-3.5 shrink-0" />
            <span className="sm:hidden">{isEs ? 'Registrar' : 'Register'}</span>
            <span className="hidden sm:inline">{isEs ? 'Explorar y registrar' : 'Search & Register'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('profile')}
            className={`ui-segment-item flex items-center gap-1.5 whitespace-nowrap ${
              activeSection === 'profile' ? 'ui-segment-item-active' : ''
            }`}
          >
            <User className="w-3.5 h-3.5 shrink-0" />
            <span className="sm:hidden">{isEs ? 'Mi perfil' : 'Profile'}</span>
            <span className="hidden sm:inline">{isEs ? 'Mi identidad' : 'My Identity'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('market')}
            className={`ui-segment-item flex items-center gap-1.5 whitespace-nowrap ${
              activeSection === 'market' ? 'ui-segment-item-active' : ''
            }`}
          >
            <Tag className="w-3.5 h-3.5 shrink-0" />
            <span className="sm:hidden">{isEs ? 'Mercado' : 'Market'}</span>
            <span className="hidden sm:inline">{isEs ? 'Mercado NFT' : 'Handle Market'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('inspector')}
            className={`ui-segment-item flex items-center gap-1.5 whitespace-nowrap ${
              activeSection === 'inspector' ? 'ui-segment-item-active' : ''
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>Inspector</span>
          </button>
        </div>

        {bchWallet?.address ? (
          <div className="ui-badge py-1 px-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="font-medium">
              {bchWallet.provider || 'BCH'}:{' '}
              <span className="font-mono">
                {formatAddress(convertCashAddressNetwork(bchWallet.address, !isMainnet, false))}
              </span>
            </span>
          </div>
        ) : (
          <button
            type="button"
            onClick={onConnectBch}
            className="ui-btn-secondary ui-btn-sm"
          >
            <Wallet className="w-3.5 h-3.5 text-ink-2" />
            <span>{isEs ? 'Conectar billetera BCH' : 'Connect BCH Wallet'}</span>
          </button>
        )}
      </div>

      {/* =====================================================================
          SECTION 1: SEARCH & REGISTER (ENS / Basenames Pattern)
          ===================================================================== */}
      {activeSection === 'register' && (
        <>
          {/* 1A: SEARCH HERO */}
          {registerStep === 'search' && (
            <div className="max-w-[580px] mx-auto pt-2 sm:pt-6 space-y-5">
              <div className="ui-card p-5 sm:p-7 space-y-5">
                <div className="space-y-1 text-center">
                  <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-ink">
                    {isEs ? 'Busca un nombre en Bitcoin Cash' : 'Find a name on Bitcoin Cash'}
                  </h2>
                  <p className="ui-muted">
                    {isEs
                      ? 'Reclama tu @usuario gratis o busca un perfil existente para enviar BCH.'
                      : 'Claim a free @handle or look up a registered profile to send BCH.'}
                  </p>
                </div>

                {/* Main ENS-style search bar */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    runSearchLookup(searchQuery);
                  }}
                  className="relative"
                >
                  <Search className="w-4 h-4 text-ink-3 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={isEs ? 'ej. adrian, myuser@bliquid.xyz o npub1...' : 'e.g. adrian, myuser@bliquid.xyz or npub1...'}
                    className="w-full h-12 bg-surface-2 border border-line focus:border-line-strong rounded-panel pl-11 pr-24 text-sm sm:text-[15px] text-ink placeholder:text-ink-3 outline-none transition-colors"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setSearchState({ status: 'idle' });
                        }}
                        className="p-1.5 rounded-lg text-ink-3 hover:text-ink hover:bg-surface-3 cursor-pointer"
                        aria-label={isEs ? 'Limpiar búsqueda' : 'Clear search'}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="submit"
                      className="ui-btn-secondary ui-btn-sm"
                    >
                      {isEs ? 'Buscar' : 'Search'}
                    </button>
                  </div>
                </form>

                {/* Real-time Availability / Profile Preview Row */}
                {searchState.status === 'invalid' && (
                  <div className="ui-panel px-4 py-3 flex items-center justify-between gap-3">
                    <span className="text-xs text-ink-2">
                      {searchState.reason === 'short'
                        ? isEs
                          ? 'El nombre debe tener al menos 3 caracteres.'
                          : 'Handle must be at least 3 characters.'
                        : searchState.reason === 'long'
                        ? isEs
                          ? 'Máximo 20 caracteres permitidos.'
                          : 'Maximum 20 characters allowed.'
                        : isEs
                        ? 'Solo minúsculas, números, guion (-) y guion bajo (_).'
                        : 'Use only lowercase letters, numbers, hyphens (-), or underscores (_).'}
                    </span>
                    <span className="ui-badge-warn shrink-0">
                      {isEs ? 'Inválido' : 'Invalid'}
                    </span>
                  </div>
                )}

                {searchState.status === 'searching' && (
                  <div className="ui-panel px-4 py-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <RefreshCw className="w-4 h-4 text-ink-3 animate-spin shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-ink truncate">{searchState.queryLabel}</div>
                        <div className="text-xs text-ink-3">
                          {isEs ? 'Consultando relays Nostr...' : 'Checking Nostr relays...'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {searchState.status === 'available' && (
                  <div className="ui-panel p-3.5 sm:p-4 border border-line flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <HandleAvatar handle={searchState.handle} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base font-semibold text-ink">@{searchState.handle}</span>
                          <span className="ui-badge-success">{isEs ? 'Disponible' : 'Available'}</span>
                        </div>
                        <div className="text-xs text-ink-3">
                          {searchState.handle}@bliquid.xyz · {isEs ? 'Gratis (sin gas)' : 'Free (zero gas)'}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenCheckout(searchState.handle)}
                      className="ui-btn-primary ui-btn-sm shrink-0"
                    >
                      <span>{isEs ? 'Registrar' : 'Register'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {searchState.status === 'taken' && (
                  <div className="ui-panel p-3.5 sm:p-4 border border-line flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <HandleAvatar handle={searchState.record.handle} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base font-semibold text-ink truncate">
                            {searchState.record.handle}
                          </span>
                          <span className={searchState.record.isVerified ? 'ui-badge-success' : 'ui-badge-warn'}>
                            {searchState.record.isVerified
                              ? isEs
                                ? 'Registrado · Verificado'
                                : 'Registered · Verified'
                              : isEs
                              ? 'Solo NIP-05'
                              : 'NIP-05 Only'}
                          </span>
                        </div>
                        <div className="text-xs font-mono text-ink-3 truncate">
                          {formatAddress(searchState.record.bchAddress)}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenResolvedProfile(searchState.record)}
                      className="ui-btn-secondary ui-btn-sm shrink-0"
                    >
                      <span>{isEs ? 'Ver perfil y pagar' : 'View profile & pay'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {searchState.status === 'not_found' && (
                  <div className="ui-panel px-4 py-3.5 flex items-center justify-between gap-3">
                    <span className="text-xs text-ink-2">
                      {isEs
                        ? `No encontramos ningún registro para "${searchState.query}".`
                        : `No registration found for "${searchState.query}".`}
                    </span>
                    <span className="ui-badge shrink-0">{isEs ? 'Sin registro' : 'Unregistered'}</span>
                  </div>
                )}

                {searchState.status === 'error' && (
                  <div className="ui-panel px-4 py-3 flex items-center gap-2 text-xs text-rose-500">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{searchState.message}</span>
                  </div>
                )}

                {/* Quick search suggestions when idle */}
                {searchState.status === 'idle' && (
                  <div className="pt-1 flex items-center justify-between gap-2 flex-wrap border-t border-line">
                    <span className="ui-label">
                      {isEs ? 'Prueba rápida:' : 'Quick lookup:'}
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {['myuser@bliquid.xyz', ...(isCurrentHandlePublished ? [`@${cleanHandle}`] : ['satoshi_bch'])].map(
                        (sample) => (
                          <button
                            key={sample}
                            type="button"
                            onClick={() => {
                              setSearchQuery(sample);
                              runSearchLookup(sample);
                            }}
                            className="px-2.5 py-1 rounded-full bg-surface-2 hover:bg-surface-3 border border-line text-xs text-ink-2 hover:text-ink transition-colors cursor-pointer"
                          >
                            {sample}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Quiet capability strip (3 facts, clean & subtle) */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="ui-card p-3 space-y-0.5">
                  <div className="text-xs font-semibold text-ink">Bitcoin Cash</div>
                  <div className="text-[11px] text-ink-3">{isEs ? 'Firma ECDSA / BSM' : 'ECDSA / BSM proof'}</div>
                </div>
                <div className="ui-card p-3 space-y-0.5">
                  <div className="text-xs font-semibold text-ink">Nostr BIP-340</div>
                  <div className="text-[11px] text-ink-3">{isEs ? 'Relays descentralizados' : 'Decentralized relays'}</div>
                </div>
                <div className="ui-card p-3 space-y-0.5">
                  <div className="text-xs font-semibold text-ink">{isEs ? 'Sin custodia' : 'Non-custodial'}</div>
                  <div className="text-[11px] text-ink-3">{isEs ? '0 BCH en comisiones' : 'Zero gas fees'}</div>
                </div>
              </div>
            </div>
          )}

          {/* 1B: REGISTRATION CHECKOUT CARD (ENS / Basenames Stepper) */}
          {registerStep === 'checkout' && (
            <div className="max-w-[540px] mx-auto space-y-4">
              <button
                type="button"
                onClick={() => {
                  setRegisterStep('search');
                  setSigningStage('idle');
                }}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-2 hover:text-ink transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{isEs ? 'Buscar otro nombre' : 'Search another name'}</span>
              </button>

              <div className="ui-card p-5 sm:p-6 space-y-5">
                {/* Identity Preview Header */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <HandleAvatar handle={checkoutHandle} size="lg" />
                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold text-ink truncate">@{checkoutHandle}</h2>
                      <div className="text-xs text-ink-3 truncate">{checkoutHandle}@bliquid.xyz</div>
                    </div>
                  </div>
                  <span className="ui-badge-success">
                    {isCheckoutDone
                      ? isEs
                        ? 'Registrado'
                        : 'Registered'
                      : isEs
                      ? 'Disponible'
                      : 'Available'}
                  </span>
                </div>

                {/* Clean Summary Rows */}
                <div className="ui-panel px-4 py-1">
                  <div className="ui-row">
                    <span className="ui-label">{isEs ? 'Red' : 'Network'}</span>
                    <span className="ui-value">
                      Bitcoin Cash ({isMainnet ? 'Mainnet' : 'Chipnet'})
                    </span>
                  </div>

                  <div className="ui-row">
                    <span className="ui-label">{isEs ? 'Dirección receptora' : 'Receiving address'}</span>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-mono text-ink truncate max-w-[200px] sm:max-w-[260px]">
                        {formatAddress(effectiveBchAddress)}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(effectiveBchAddress, 'checkout_addr')}
                        className="p-1 rounded hover:bg-surface-3 text-ink-3 hover:text-ink cursor-pointer"
                        title={isEs ? 'Copiar dirección' : 'Copy address'}
                      >
                        {copiedKey === 'checkout_addr' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="ui-row">
                    <span className="ui-label">{isEs ? 'Origen de firma' : 'Signer source'}</span>
                    <span className="text-xs font-medium text-ink">
                      {bchSigningMode === 'wallet'
                        ? `${bchWallet?.provider || 'WalletConnect'} (bch_signMessage)`
                        : isEs
                        ? 'Llave soberana local (BSM)'
                        : 'Local sovereign key (BSM)'}
                    </span>
                  </div>

                  <div className="ui-row">
                    <span className="ui-label">{isEs ? 'Costo de red' : 'Network fee'}</span>
                    <span className="ui-value">0 BCH</span>
                  </div>
                </div>

                {/* Calm transparency notice when external wallet is read-only */}
                {bchWallet?.address && !walletCanSignMessage && (
                  <div className="px-3.5 py-2.5 rounded-control bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-3 text-xs">
                    <span className="text-ink-2">
                      {isEs
                        ? `${bchWallet.provider || 'Tu billetera'} no soporta firma off-chain; se usará tu llave local verificable.`
                        : `${bchWallet.provider || 'Your wallet'} lacks off-chain signing; signing with your verifiable local key.`}
                    </span>
                    <button
                      type="button"
                      onClick={onConnectBch}
                      className="text-xs font-semibold text-ink hover:underline shrink-0 cursor-pointer"
                    >
                      {isEs ? 'Cambiar' : 'Switch'}
                    </button>
                  </div>
                )}

                <AdvancedSignerDetails
                  isEs={isEs}
                  isOpen={showCheckoutAdvanced}
                  onToggle={() => setShowCheckoutAdvanced((v) => !v)}
                  title={isEs ? 'Detalles de firma y claves Nostr' : 'Signer & Nostr key details'}
                  walletAddress={bchWallet?.address}
                  walletProvider={bchWallet?.provider}
                  walletCanSignMessage={walletCanSignMessage}
                  bchSigningMode={bchSigningMode}
                  onSelectBchSigningMode={(mode) => {
                    setBchSigningMode(mode);
                    resetActiveProofs();
                  }}
                  effectiveBchAddress={effectiveBchAddress}
                  onRegenerateBch={handleRegenerateBchDemo}
                  nostrNpub={nostrKeys?.npub}
                  nostrIsExtension={nostrKeys?.isExtension}
                  hasNip07Extension={hasNip07Extension}
                  useNip07={useNip07}
                  onConnectNip07={handleConnectNip07}
                  onRegenerateNostr={handleRegenerateNostr}
                  onConnectBch={onConnectBch}
                />

                <RelayPublishStepper
                  isEs={isEs}
                  isPublishing={isPublishing}
                  signingStage={signingStage}
                  isDone={isCheckoutDone}
                  publishLogs={publishLogs}
                  indexedCount={publishedEvent?.indexedCount}
                />

                {publishError && (
                  <div className="p-3 rounded-control bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{publishError}</span>
                  </div>
                )}

                {/* Single Primary CTA */}
                {isCheckoutDone ? (
                  <div className="space-y-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSection('profile');
                      }}
                      className="ui-btn-primary ui-btn-lg w-full"
                    >
                      <span>{isEs ? `Ver mi perfil @${checkoutHandle}` : `Open @${checkoutHandle} profile`}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSection('inspector');
                        setInspectorTab('verify');
                        const target = nostrKeys?.npub || `@${checkoutHandle}`;
                        setVerifyInput(target);
                        handleVerify(target);
                      }}
                      className="ui-btn-secondary ui-btn-sm w-full"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{isEs ? 'Inspeccionar prueba criptográfica' : 'Inspect cryptographic proof'}</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={isPublishing}
                    onClick={() => handleCreateBinding(checkoutHandle)}
                    className="ui-btn-primary ui-btn-lg w-full"
                  >
                    {isPublishing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>{isEs ? 'Registrando identidad...' : 'Registering handle...'}</span>
                      </>
                    ) : (
                      <span>{isEs ? `Registrar @${checkoutHandle}` : `Register @${checkoutHandle}`}</span>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 1C: RESOLVED PUBLIC PROFILE & PAYMENT LAUNCHER */}
          {registerStep === 'resolved' && resolvedRecord && (
            <div className="max-w-[540px] mx-auto space-y-4">
              <button
                type="button"
                onClick={() => setRegisterStep('search')}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-2 hover:text-ink transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{isEs ? 'Volver al buscador' : 'Back to search'}</span>
              </button>

              <div className="ui-card p-5 sm:p-6 space-y-5">
                {/* Public Identity Header */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <HandleAvatar handle={resolvedRecord.handle} size="lg" />
                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold text-ink truncate">{resolvedRecord.handle}</h2>
                      <div className="text-xs text-ink-3 truncate">{resolvedRecord.nip05}</div>
                    </div>
                  </div>
                  <span className={resolvedRecord.isVerified ? 'ui-badge-success' : 'ui-badge-warn'}>
                    {resolvedRecord.isVerified
                      ? isEs
                        ? 'Verificado'
                        : 'Verified'
                      : isEs
                      ? 'Solo NIP-05'
                      : 'NIP-05 Only'}
                  </span>
                </div>

                {/* Records */}
                <div className="ui-panel px-4 py-1">
                  <div className="ui-row">
                    <span className="ui-label">CashAddress</span>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-mono text-ink truncate max-w-[190px] sm:max-w-[260px]">
                        {formatAddress(resolvedRecord.bchAddress)}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(resolvedRecord.bchAddress, 'res_bch')}
                        className="p-1 rounded hover:bg-surface-3 text-ink-3 hover:text-ink cursor-pointer"
                        title="Copy CashAddress"
                      >
                        {copiedKey === 'res_bch' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setQrModalData({ handle: resolvedRecord.handle, address: resolvedRecord.bchAddress })
                        }
                        className="p-1 rounded hover:bg-surface-3 text-ink-3 hover:text-ink cursor-pointer"
                        title="Show QR"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="ui-row">
                    <span className="ui-label">Nostr npub</span>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-mono text-ink-2 truncate max-w-[190px] sm:max-w-[260px]">
                        {resolvedRecord.npub}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(resolvedRecord.npub, 'res_npub')}
                        className="p-1 rounded hover:bg-surface-3 text-ink-3 hover:text-ink cursor-pointer"
                        title="Copy npub"
                      >
                        {copiedKey === 'res_npub' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="ui-row">
                    <span className="ui-label">{isEs ? 'Resolución' : 'Source'}</span>
                    <span className="text-xs font-medium text-ink">{resolvedRecord.sourceLabel}</span>
                  </div>
                </div>

                {/* Portable W3C Verifiable Credentials / Reputation (Kind 1985) */}
                {resolvedAttestations.length > 0 && (
                  <div className="ui-panel p-3.5 space-y-2 border border-line">
                    <div className="flex items-center justify-between text-xs font-semibold text-ink">
                      <span>{isEs ? 'Credenciales y Reputación (Kind 1985)' : 'Portable Attestations (Kind 1985)'}</span>
                      <span className="ui-badge-success">{resolvedAttestations.length} W3C VC</span>
                    </div>
                    <div className="space-y-1.5">
                      {resolvedAttestations.slice(0, 3).map((att) => (
                        <div key={att.eventId} className="text-xs flex items-center justify-between gap-2 bg-surface px-2.5 py-1.5 rounded-control border border-line">
                          <span className="font-medium text-ink truncate">
                            {att.claimType}: {att.claimSummary}
                          </span>
                          <span className="font-mono text-[10px] text-ink-3 shrink-0">
                            {att.issuerNpub.slice(0, 10)}...
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Send BCH & CashTokens Payment Panel */}
                <div className="border-t border-line pt-4 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="ui-section-title">{isEs ? 'Enviar por identidad' : 'Pay by Identity'}</span>
                    <div className="flex items-center gap-1">
                      {(['PUSD', 'BCH', 'MUSD', 'LIFT'] as const).map((sym) => (
                        <button
                          key={sym}
                          type="button"
                          onClick={() => setPayAsset(sym)}
                          className={`px-2 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer transition-colors ${
                            payAsset === sym
                              ? 'bg-surface-3 border-line-strong text-ink'
                              : 'bg-surface border-line text-ink-2 hover:text-ink'
                          }`}
                        >
                          {sym}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        className="ui-input pr-16 font-mono tabular-nums"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-3">
                        {payAsset}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {['0.01', '1', '5'].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setPayAmount(amt)}
                          className={`px-2 py-1.5 rounded-lg text-xs font-medium border cursor-pointer transition-colors ${
                            payAmount === amt
                              ? 'bg-surface-3 border-line-strong text-ink'
                              : 'bg-surface border-line text-ink-2 hover:text-ink'
                          }`}
                        >
                          {amt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Direct real on-chain BCH & CashTokens send via UserLink */}
                  <a
                    href={`https://wallet.bliquid.xyz/dashboard/send?to=${encodeURIComponent(resolvedRecord.handle)}&asset=${payAsset}&amount=${encodeURIComponent(payAmount)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="ui-btn-primary ui-btn-lg w-full"
                  >
                    <Send className="w-4 h-4" />
                    <span>
                      {isEs
                        ? `Enviar ${payAmount} ${payAsset} a ${resolvedRecord.handle}`
                        : `Send ${payAmount} ${payAsset} to ${resolvedRecord.handle}`}
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                  </a>

                  <a
                    href={buildBip21Uri(resolvedRecord.bchAddress, payAmount, resolvedRecord.handle)}
                    className="ui-btn-secondary ui-btn-sm w-full"
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    <span>
                      {isEs
                        ? `Abrir BIP-21 en billetera externa (${payAmount} BCH)`
                        : `Open external wallet BIP-21 (${payAmount} BCH)`}
                    </span>
                  </a>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={isSendingPay}
                      onClick={handleSendSimulationPay}
                      className="ui-btn-secondary ui-btn-sm"
                    >
                      {isSendingPay ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>{isEs ? 'Simular demo' : 'Demo preview'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveSection('inspector');
                        setInspectorTab('verify');
                        const q = resolvedRecord.npub || resolvedRecord.handle;
                        setVerifyInput(q);
                        handleVerify(q);
                      }}
                      className="ui-btn-secondary ui-btn-sm"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{isEs ? 'Auditar prueba' : 'Audit proof'}</span>
                    </button>
                  </div>
                </div>

                {/* Honest Sandbox Demo Receipt */}
                {paySuccessData && (
                  <div className="ui-panel p-4 border border-line space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-ink flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span>{isEs ? 'Vista previa de pago UX' : 'UX Payment Preview'}</span>
                      </span>
                      <span className="ui-badge-warn">SANDBOX DEMO</span>
                    </div>
                    <div className="text-xs text-ink-2 font-mono space-y-1">
                      <div>
                        {paySuccessData.recipient} · {paySuccessData.amount} BCH
                      </div>
                      <div className="truncate text-ink-3">Mock TX: {paySuccessData.txId}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* =====================================================================
          SECTION 2: MY IDENTITY PROFILE (Focused & Calm)
          ===================================================================== */}
      {activeSection === 'profile' && (
        <div className="max-w-[540px] mx-auto pt-2 space-y-4">
          <div className="ui-card p-5 sm:p-6 space-y-5">
            {/* Profile Header */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                <HandleAvatar handle={cleanHandle} size="lg" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-ink truncate">@{cleanHandle}</h2>
                    <button
                      type="button"
                      onClick={() => {
                        setTempHandleInput(cleanHandle);
                        setIsEditingProfileHandle((v) => !v);
                      }}
                      className="text-xs font-medium text-ink-3 hover:text-ink underline cursor-pointer"
                    >
                      {isEs ? 'Cambiar' : 'Edit'}
                    </button>
                  </div>
                  <div className="text-xs text-ink-3 truncate">{nip05Address}</div>
                </div>
              </div>

              <span className={isCurrentHandlePublished ? 'ui-badge-success' : 'ui-badge-warn'}>
                {isCurrentHandlePublished
                  ? isEs
                    ? 'Publicado'
                    : 'Published'
                  : isEs
                  ? 'Borrador local'
                  : 'Local draft'}
              </span>
            </div>

            {/* Inline Handle Editor */}
            {isEditingProfileHandle && (
              <div className="ui-panel p-3 flex items-center gap-2">
                <div className="relative flex-1">
                  <AtSign className="w-3.5 h-3.5 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={tempHandleInput}
                    onChange={(e) => setTempHandleInput(e.target.value)}
                    placeholder="myuser"
                    className="ui-input h-9 pl-8 text-xs font-mono"
                    maxLength={20}
                  />
                </div>
                <button type="button" onClick={handleSaveProfileHandle} className="ui-btn-secondary ui-btn-sm">
                  {isEs ? 'Guardar' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingProfileHandle(false)}
                  className="ui-btn-ghost ui-btn-sm px-2"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Records Table */}
            <div className="ui-panel px-4 py-1">
              <div className="ui-row">
                <span className="ui-label">
                  Bitcoin Cash ({isMainnet ? 'Mainnet' : 'Chipnet'})
                </span>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xs font-mono text-ink truncate max-w-[190px] sm:max-w-[260px]">
                    {formatAddress(effectiveBchAddress)}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(effectiveBchAddress, 'prof_bch')}
                    className="p-1 rounded hover:bg-surface-3 text-ink-3 hover:text-ink cursor-pointer"
                  >
                    {copiedKey === 'prof_bch' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="ui-row">
                <span className="ui-label">Nostr</span>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xs font-mono text-ink-2 truncate max-w-[190px] sm:max-w-[260px]">
                    {nostrKeys?.npub || '...'}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(nostrKeys?.npub || '', 'prof_npub')}
                    className="p-1 rounded hover:bg-surface-3 text-ink-3 hover:text-ink cursor-pointer"
                  >
                    {copiedKey === 'prof_npub' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="ui-row">
                <span className="ui-label">{isEs ? 'Firma activa' : 'Signing mode'}</span>
                <span className="text-xs font-medium text-ink">
                  {bchSigningMode === 'wallet'
                    ? bchWallet?.provider || 'WalletConnect'
                    : isEs
                    ? 'Llave soberana local'
                    : 'Local sovereign key'}
                </span>
              </div>
            </div>

            {publishError && (
              <div className="p-3 rounded-control bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{publishError}</span>
              </div>
            )}

            {/* Primary + Secondary Actions (max 1 orange CTA per card) */}
            {isCurrentHandlePublished ? (
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => setQrModalData({ handle: `@${cleanHandle}`, address: effectiveBchAddress })}
                  className="ui-btn-primary ui-btn-lg w-full"
                >
                  <QrCode className="w-4 h-4" />
                  <span>{isEs ? 'Mostrar QR para recibir BCH' : 'Show QR to receive BCH'}</span>
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!publishedEvent) return;
                      handleOpenResolvedProfile({
                        handle: publishedEvent.verified.handle,
                        nip05: publishedEvent.verified.nip05,
                        bchAddress: publishedEvent.verified.bchAddress,
                        npub: publishedEvent.verified.npub,
                        pubkeyHex: publishedEvent.verified.pubkeyHex,
                        isVerified: true,
                        sourceLabel: isEs ? 'Identidad publicada' : 'Published Identity'
                      });
                    }}
                    className="ui-btn-secondary ui-btn-sm"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>{isEs ? 'Probar pago' : 'Test payment'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSection('inspector');
                      setInspectorTab('verify');
                      const target = nostrKeys?.npub || `@${cleanHandle}`;
                      setVerifyInput(target);
                      handleVerify(target);
                    }}
                    className="ui-btn-secondary ui-btn-sm"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{isEs ? 'Ver en relays' : 'Inspect on relays'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                <button
                  type="button"
                  disabled={isPublishing}
                  onClick={() => handleCreateBinding(cleanHandle)}
                  className="ui-btn-primary ui-btn-lg w-full"
                >
                  {isPublishing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{isEs ? 'Publicando en relays...' : 'Publishing to relays...'}</span>
                    </>
                  ) : (
                    <span>{isEs ? `Publicar @${cleanHandle} en relays` : `Publish @${cleanHandle} to relays`}</span>
                  )}
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setQrModalData({ handle: `@${cleanHandle}`, address: effectiveBchAddress })}
                    className="ui-btn-secondary ui-btn-sm"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>{isEs ? 'Ver código QR' : 'Show QR code'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSection('register');
                      setRegisterStep('search');
                    }}
                    className="ui-btn-secondary ui-btn-sm"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>{isEs ? 'Buscar otro nombre' : 'Find another name'}</span>
                  </button>
                </div>
              </div>
            )}

            <RelayPublishStepper
              isEs={isEs}
              isPublishing={isPublishing}
              signingStage={signingStage}
              isDone={isCurrentHandlePublished}
              publishLogs={publishLogs}
              indexedCount={publishedEvent?.indexedCount}
            />

            {/* Sovereign Key Rotation & Optional BCH OP_RETURN Anchor */}
            <div className="ui-panel p-3.5 space-y-3 border border-line">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <div className="text-xs font-semibold text-ink">
                    {isEs ? 'Rotación soberana y ancla BCH' : 'Key Rotation & On-Chain BCH Anchor'}
                  </div>
                  <div className="text-[11px] text-ink-3">
                    {isEs
                      ? 'Autoriza una nueva clave Nostr con tu firma BCH o adjunta un txid OP_RETURN.'
                      : 'Authorize rotating to a fresh Nostr key via BCH signature or attach an OP_RETURN txid.'}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isPublishing || !nostrKeys}
                  onClick={handleRotateAuthorizedKey}
                  className="ui-btn-secondary ui-btn-sm shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isPublishing ? 'animate-spin' : ''}`} />
                  <span>{isEs ? 'Rotar clave Nostr' : 'Rotate Nostr Key'}</span>
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={anchorTxInput}
                  onChange={(e) => setAnchorTxInput(e.target.value)}
                  placeholder={isEs ? 'TxID BCH con OP_RETURN UL1 (opcional, 64 hex)' : 'Optional BCH OP_RETURN UL1 txid (64 hex)'}
                  className="ui-input bg-surface border-line h-9 flex-1 font-mono text-[11px]"
                />
                {publishedEvent && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(buildBchOpReturnScriptHex(publishedEvent.event.content), 'op_return_hex')}
                    className="ui-btn-ghost ui-btn-sm border border-line shrink-0"
                    title="Copy OP_RETURN hex"
                  >
                    {copiedKey === 'op_return_hex' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isEs ? 'Copiar OP_RETURN' : 'Copy OP_RETURN'}</span>
                  </button>
                )}
              </div>
              {publishedEvent && (
                <div className="text-[10px] font-mono text-ink-3 truncate">
                  UL1 SHA-256: {computeUserLinkCommitmentHash(publishedEvent.event.content)}
                </div>
              )}
            </div>

            <AdvancedSignerDetails
              isEs={isEs}
              isOpen={showProfileAdvanced}
              onToggle={() => setShowProfileAdvanced((v) => !v)}
              title={isEs ? 'Configuración avanzada y detalles técnicos' : 'Advanced settings & technical details'}
              walletAddress={bchWallet?.address}
              walletProvider={bchWallet?.provider}
              walletCanSignMessage={walletCanSignMessage}
              bchSigningMode={bchSigningMode}
              onSelectBchSigningMode={(mode) => {
                setBchSigningMode(mode);
                resetActiveProofs();
              }}
              effectiveBchAddress={effectiveBchAddress}
              onRegenerateBch={handleRegenerateBchDemo}
              nostrNpub={nostrKeys?.npub}
              nostrIsExtension={nostrKeys?.isExtension}
              hasNip07Extension={hasNip07Extension}
              useNip07={useNip07}
              onConnectNip07={handleConnectNip07}
              onRegenerateNostr={handleRegenerateNostr}
              onConnectBch={onConnectBch}
              publishedEventSummary={
                publishedEvent
                  ? { eventId: publishedEvent.event.id, bchPubkey: publishedEvent.verified.bchPubkey }
                  : null
              }
            />
          </div>
        </div>
      )}

      {/* =====================================================================
          SECTION 2B: HANDLE MARKET (CashTokens NFT Minting & P2SH-32 Market)
          ===================================================================== */}
      {activeSection === 'market' && (
        <HandleMarketPanel
          isEs={isEs}
          network={selectedNetwork}
          connectedBchAddress={bchWallet?.address}
          activeHandle={userHandle}
          nostrPubkeyHex={nostrKeys?.pk}
          onConnectBch={onConnectBch}
        />
      )}

      {/* =====================================================================
          SECTION 3: INSPECTOR (Developer & Cryptographic Audit Tools)
          ===================================================================== */}
      {activeSection === 'inspector' && (
        <div className="max-w-3xl mx-auto space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="ui-segment max-w-full overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setInspectorTab('verify')}
                className={`ui-segment-item flex items-center gap-1.5 whitespace-nowrap ${
                  inspectorTab === 'verify' ? 'ui-segment-item-active' : ''
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>{isEs ? 'Verificador' : 'Verifier'}</span>
              </button>
              <button
                type="button"
                onClick={() => setInspectorTab('auth')}
                className={`ui-segment-item flex items-center gap-1.5 whitespace-nowrap ${
                  inspectorTab === 'auth' ? 'ui-segment-item-active' : ''
                }`}
              >
                <Key className="w-3.5 h-3.5 shrink-0" />
                <span>Challenge Auth</span>
              </button>
              <button
                type="button"
                onClick={() => setInspectorTab('spec')}
                className={`ui-segment-item flex items-center gap-1.5 whitespace-nowrap ${
                  inspectorTab === 'spec' ? 'ui-segment-item-active' : ''
                }`}
              >
                <Code2 className="w-3.5 h-3.5 shrink-0" />
                <span>{isEs ? 'Especificación' : 'Spec'}</span>
              </button>
            </div>
          </div>

          {/* 3A: RELAY VERIFIER */}
          {inspectorTab === 'verify' && (
            <div className="ui-card p-5 sm:p-6 space-y-5">
              <div>
                <h3 className="ui-section-title">
                  {isEs ? 'Auditoría criptográfica en relays Nostr' : 'Live Nostr Relay Cryptographic Audit'}
                </h3>
                <p className="ui-subtitle">
                  {isEs
                    ? 'Verifica en vivo BIP-340 Schnorr, Bitcoin Signed Message ECDSA, hash160(pubkey) y coherencia mutua.'
                    : 'Independently checks BIP-340 Schnorr, Bitcoin Signed Message ECDSA, CashAddress hash160 ownership, and mutual binding.'}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={verifyInput}
                  onChange={(e) => setVerifyInput(e.target.value)}
                  placeholder={isEs ? '@usuario, myuser@bliquid.xyz, npub1... o bitcoincash:qp...' : '@handle, myuser@bliquid.xyz, npub1... or bitcoincash:qp...'}
                  className="ui-input flex-1 font-mono text-xs sm:text-sm"
                />
                <button
                  type="button"
                  disabled={isVerifying || !verifyInput.trim()}
                  onClick={() => handleVerify()}
                  className="ui-btn-primary shrink-0 px-5"
                >
                  {isVerifying ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{isEs ? 'Verificando...' : 'Verifying...'}</span>
                    </>
                  ) : (
                    <span>{isEs ? 'Verificar' : 'Verify'}</span>
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="ui-label">{isEs ? 'Ejemplos:' : 'Samples:'}</span>
                <button
                  type="button"
                  onClick={() => {
                    setVerifyInput('@myuser');
                    handleVerify('@myuser');
                  }}
                  className="px-2.5 py-1 rounded-full bg-surface-2 hover:bg-surface-3 border border-line font-mono text-ink-2 hover:text-ink cursor-pointer"
                >
                  @myuser
                </button>
                {nostrKeys?.npub && (
                  <button
                    type="button"
                    onClick={() => {
                      setVerifyInput(nostrKeys.npub);
                      handleVerify(nostrKeys.npub);
                    }}
                    className="px-2.5 py-1 rounded-full bg-surface-2 hover:bg-surface-3 border border-line font-mono text-ink-2 hover:text-ink cursor-pointer"
                  >
                    npub1...{nostrKeys.npub.slice(-6)}
                  </button>
                )}
              </div>

              {verifyError && (
                <div className="p-3 rounded-control bg-amber-500/10 border border-amber-500/20 text-ink-2 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>{verifyError}</span>
                </div>
              )}

              {verificationResult && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="ui-panel p-4 sm:p-5 border border-line space-y-4"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-line">
                    <div className="flex items-center gap-2">
                      {verificationResult.isOverallValid ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <ShieldAlert className="w-4 h-4 text-rose-500" />
                      )}
                      <span className="text-sm font-semibold text-ink">
                        {verificationResult.isOverallValid
                          ? isEs
                            ? 'Enlace criptográficamente válido'
                            : 'Cryptographically Verified Identity'
                          : isEs
                          ? 'Verificación fallida o evento alterado'
                          : 'Cryptographic Verification Failed'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleRunTamperTest}
                      className="ui-btn-secondary ui-btn-sm"
                    >
                      {isTamperedPreview
                        ? isEs
                          ? 'Restaurar evento real'
                          : 'Restore authentic event'
                        : isEs
                        ? 'Simular alteración'
                        : 'Test tamper detection'}
                    </button>
                  </div>

                  {!verificationResult.isOverallValid && verificationResult.verificationNote && (
                    <div className="p-3 rounded-control bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <span>{verificationResult.verificationNote}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 rounded-panel bg-surface border border-line space-y-1.5">
                      <div className="ui-label flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" />
                        <span>{isEs ? 'Identidad Nostr' : 'Nostr Identity'}</span>
                      </div>
                      <div className="font-semibold text-ink text-sm">{verificationResult.handle}</div>
                      <div className="font-mono text-ink-3 text-[11px] truncate select-all">
                        {verificationResult.npub}
                      </div>
                      <div
                        className={`text-[11px] flex items-center gap-1 font-medium pt-1 ${
                          verificationResult.isNostrSigValid ? 'text-emerald-500' : 'text-rose-500'
                        }`}
                      >
                        {verificationResult.isNostrSigValid ? <CheckCheck className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                        <span>
                          {verificationResult.isNostrSigValid
                            ? 'BIP-340 Schnorr Valid'
                            : 'BIP-340 Schnorr INVALID'}
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-panel bg-surface border border-line space-y-1.5">
                      <div className="ui-label flex items-center gap-1.5">
                        <Wallet className="w-3.5 h-3.5" />
                        <span>Bitcoin Cash Address</span>
                      </div>
                      <div className="font-mono text-ink text-xs truncate select-all">
                        {verificationResult.bchAddress}
                      </div>
                      <div
                        className={`text-[11px] flex items-center gap-1 font-medium pt-1 ${
                          verificationResult.isBchSigValid ? 'text-emerald-500' : 'text-rose-500'
                        }`}
                      >
                        {verificationResult.isBchSigValid ? <CheckCheck className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                        <span>
                          {verificationResult.isBchSigValid
                            ? `BCH ${verificationResult.sigScheme === 'bitcoin-signed-message' ? 'Signed Message' : 'ECDSA'} Valid`
                            : 'BCH Signature INVALID'}
                        </span>
                      </div>
                      <div
                        className={`text-[11px] flex items-center gap-1 font-medium ${
                          verificationResult.isAddressOwned && verificationResult.isMutualBindingValid
                            ? 'text-emerald-500'
                            : 'text-rose-500'
                        }`}
                      >
                        {verificationResult.isAddressOwned && verificationResult.isMutualBindingValid ? (
                          <CheckCheck className="w-3.5 h-3.5" />
                        ) : (
                          <X className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {verificationResult.isAddressOwned && verificationResult.isMutualBindingValid
                            ? isEs
                              ? 'Hash160(Pubkey) == CashAddress · Mutuo OK'
                              : 'Hash160(Pubkey) == CashAddress · Mutual Bind OK'
                            : isEs
                            ? 'Fallo en propiedad o enlace mutuo'
                            : 'Ownership / Mutual Bind FAILED'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-panel bg-surface border border-line text-[11px] font-mono space-y-1 text-ink-3 select-all">
                    <div className="text-xs font-sans font-medium text-ink pb-0.5 flex items-center justify-between gap-2 flex-wrap">
                      <span>{isEs ? 'Atestación en relays:' : 'Relay attestation payload:'}</span>
                      {verificationResult.rotationAuthorized && (
                        <span className="ui-badge-success">
                          {isEs ? 'Rotación autorizada por BCH' : 'BCH-Authorized Key Rotation'}
                        </span>
                      )}
                    </div>
                    <div className="truncate">Event ID: {verificationResult.event.id}</div>
                    {verificationResult.previousNostrPubkey && (
                      <div className="truncate">Prev Nostr Key: {verificationResult.previousNostrPubkey}</div>
                    )}
                    {verificationResult.bchPubkey && (
                      <div className="truncate">Recovered BCH Pubkey: {verificationResult.bchPubkey}</div>
                    )}
                    {verificationResult.commitmentHashHex && (
                      <div className="truncate">UL1 Commitment SHA-256: {verificationResult.commitmentHashHex}</div>
                    )}
                    <div>Timestamp: {new Date(verificationResult.timestamp * 1000).toUTCString()}</div>
                    <div>Kind: 30078 (NIP-78 + NIP-39 i-tag + W3C DID)</div>
                  </div>

                  {/* 1. W3C DID Document Resolver */}
                  <div className="p-3.5 rounded-panel bg-surface border border-line space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="text-xs font-semibold text-ink">
                        W3C DID Document (`did:nostr` ↔ `did:pkh:bch`)
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            copyToClipboard(
                              JSON.stringify(buildUserLinkDidDocument(verificationResult), null, 2),
                              'did_doc'
                            )
                          }
                          className="ui-btn-ghost ui-btn-sm border border-line"
                        >
                          {copiedKey === 'did_doc' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{isEs ? 'Copiar DID' : 'Copy DID'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowDidDoc((v) => !v)}
                          className="ui-btn-secondary ui-btn-sm"
                        >
                          <span>{showDidDoc ? (isEs ? 'Ocultar' : 'Hide') : (isEs ? 'Ver DID JSON' : 'Inspect DID JSON')}</span>
                        </button>
                      </div>
                    </div>
                    {showDidDoc && (
                      <pre className="p-2.5 rounded-control bg-surface-2 border border-line font-mono text-[10px] text-ink-2 overflow-x-auto max-h-56">
                        {JSON.stringify(buildUserLinkDidDocument(verificationResult), null, 2)}
                      </pre>
                    )}
                  </div>

                  {/* 2. On-Chain BCH OP_RETURN Commitment Check */}
                  <div className="p-3.5 rounded-panel bg-surface border border-line space-y-2.5">
                    <div className="text-xs font-semibold text-ink">
                      {isEs ? 'Anclaje On-Chain Bitcoin Cash (OP_RETURN UL1)' : 'On-Chain Bitcoin Cash Commitment (OP_RETURN UL1)'}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={anchorAuditInput}
                        onChange={(e) => setAnchorAuditInput(e.target.value)}
                        placeholder={isEs ? 'TxID de transacción BCH con OP_RETURN UL1...' : 'BCH txid containing OP_RETURN UL1 commitment...'}
                        className="ui-input h-9 flex-1 font-mono text-[11px]"
                      />
                      <button
                        type="button"
                        disabled={anchorAuditResult?.checking || !anchorAuditInput.trim()}
                        onClick={handleCheckOnChainAnchor}
                        className="ui-btn-secondary ui-btn-sm shrink-0"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>{anchorAuditResult?.checking ? (isEs ? 'Auditando...' : 'Checking...') : (isEs ? 'Verificar en BCH' : 'Verify on BCH')}</span>
                      </button>
                    </div>
                    {anchorAuditResult && !anchorAuditResult.checking && (
                      <div className={`text-xs font-medium ${anchorAuditResult.verifiedOnChain ? 'text-emerald-500' : 'text-amber-500'}`}>
                        {anchorAuditResult.verifiedOnChain
                          ? `${isEs ? 'Compromiso OP_RETURN confirmado en BCH' : 'BCH OP_RETURN commitment verified'} (${anchorAuditResult.confirmations || 0} conf.)`
                          : anchorAuditResult.reason}
                      </div>
                    )}
                  </div>

                  {/* 3. Portable W3C Verifiable Credentials (Kind 1985 NIP-32) + Selective Disclosure */}
                  <div className="p-3.5 rounded-panel bg-surface border border-line space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="text-xs font-semibold text-ink">
                        {isEs ? 'Credenciales Verificables W3C y Reputación (Kind 1985)' : 'Portable W3C Verifiable Credentials & Reputation (Kind 1985)'}
                      </div>
                      <span className="ui-badge">{attestations.length} {isEs ? 'atestaciones' : 'attestations'}</span>
                    </div>

                    {attestations.length > 0 && (
                      <div className="space-y-2">
                        {attestations.slice(0, 4).map((att) => (
                          <div key={att.eventId} className="p-2.5 rounded-control bg-surface-2 border border-line text-xs space-y-1">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className="font-semibold text-ink">{att.claimType}</span>
                              <span className="ui-badge-success">Schnorr VC OK</span>
                            </div>
                            <div className="text-ink-2">{att.claimSummary}</div>
                            <div className="font-mono text-[10px] text-ink-3 truncate">Issuer: {att.issuerNpub}</div>
                            {Object.keys(att.saltedCommitments).length > 0 && (
                              <div className="pt-1 border-t border-line flex items-center justify-between gap-2 flex-wrap">
                                <span className="font-mono text-[10px] text-ink-3 truncate">
                                  Salted Commitment ({Object.keys(att.saltedCommitments)[0]}): {Object.values(att.saltedCommitments)[0].slice(0, 18)}...
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const firstAttr = Object.keys(att.saltedCommitments)[0];
                                    const ok = verifySelectiveDisclosure({
                                      salt: attPrivateSalt,
                                      attribute: firstAttr,
                                      value: attPrivateVal,
                                      commitmentHex: att.saltedCommitments[firstAttr]
                                    });
                                    setSdCheckResult(ok);
                                  }}
                                  className="text-[11px] font-semibold text-ink hover:underline cursor-pointer"
                                >
                                  {isEs ? 'Probar Selective Disclosure' : 'Verify Selective Disclosure'}
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                        {sdCheckResult !== null && (
                          <div className={`text-xs font-medium ${sdCheckResult ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {sdCheckResult
                              ? isEs
                                ? `Divulgación selectiva válida: "${attPrivateAttr}=${attPrivateVal}" coincide con el hash privado sin haber expuesto datos en el relay.`
                                : `Selective Disclosure valid: "${attPrivateAttr}=${attPrivateVal}" matches private salted commitment without leaking PII on relays.`
                              : isEs
                              ? 'Salt o valor privado incorrecto para este compromiso.'
                              : 'Salt or private attribute does not match committed hash.'}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Third-party issuer form (uses active session Nostr signer) */}
                    {nostrKeys?.skBytes && (
                      <div className="pt-2 border-t border-line space-y-2">
                        <div className="text-[11px] font-medium text-ink-2">
                          {isEs ? 'Emitir atestación W3C VC firmada (Kind 1985 + hash privado opcional):' : 'Issue signed W3C VC attestation (Kind 1985 + optional private hash):'}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <select
                            value={attClaimType}
                            onChange={(e) => setAttClaimType(e.target.value)}
                            className="ui-input h-9 text-xs"
                          >
                            <option value="MerchantVerified">MerchantVerified</option>
                            <option value="TradeReputation">TradeReputation (5★)</option>
                            <option value="HumanVerified">HumanVerified</option>
                            <option value="DeveloperBadge">DeveloperBadge</option>
                          </select>
                          <input
                            type="text"
                            value={attSummary}
                            onChange={(e) => setAttSummary(e.target.value)}
                            placeholder="Credential summary"
                            className="ui-input h-9 text-xs"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <input
                            type="text"
                            value={attPrivateAttr}
                            onChange={(e) => setAttPrivateAttr(e.target.value)}
                            placeholder="Private attr (e.g. tier)"
                            className="ui-input h-8 text-[11px] font-mono"
                          />
                          <input
                            type="text"
                            value={attPrivateVal}
                            onChange={(e) => setAttPrivateVal(e.target.value)}
                            placeholder="Secret value"
                            className="ui-input h-8 text-[11px] font-mono"
                          />
                          <input
                            type="text"
                            value={attPrivateSalt}
                            onChange={(e) => setAttPrivateSalt(e.target.value)}
                            placeholder="Salt"
                            className="ui-input h-8 text-[11px] font-mono"
                          />
                        </div>
                        <button
                          type="button"
                          disabled={attPublishing}
                          onClick={handlePublishAttestation}
                          className="ui-btn-secondary ui-btn-sm w-full"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>
                            {attPublishing
                              ? isEs
                                ? 'Publicando W3C VC en relays...'
                                : 'Publishing W3C VC to relays...'
                              : isEs
                              ? 'Firmar y emitir credencial Kind 1985'
                              : 'Sign & Issue Kind 1985 Credential'}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {/* 3B: CHALLENGE AUTH */}
          {inspectorTab === 'auth' && (
            <div className="ui-card p-5 sm:p-6 space-y-5">
              <div>
                <h3 className="ui-section-title">
                  {isEs ? 'Autenticación sin contraseñas (Challenge-Response)' : 'Passwordless Challenge-Response Auth'}
                </h3>
                <p className="ui-subtitle">
                  {isEs
                    ? 'Firma un reto criptográfico con Nostr y valida contra los relays que esa clave controla una CashAddress vinculada.'
                    : 'Sign a nonce challenge with Nostr and verify on live relays that the signer owns a bound Bitcoin Cash identity.'}
                </p>
              </div>

              <div className="ui-panel p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-ink">
                    {isEs ? '1. Reto criptográfico (Nonce)' : '1. Cryptographic challenge'}
                  </span>
                  <button
                    type="button"
                    onClick={handleGenerateChallenge}
                    className="ui-btn-secondary ui-btn-sm"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{isEs ? 'Generar reto' : 'Generate challenge'}</span>
                  </button>
                </div>

                {authChallenge ? (
                  <div className="p-2.5 rounded-control bg-surface border border-line text-xs font-mono text-ink select-all break-all">
                    {authChallenge}
                  </div>
                ) : (
                  <div className="text-xs text-ink-3">
                    {isEs ? 'Genera un reto único para comenzar.' : 'Generate a fresh nonce to start.'}
                  </div>
                )}
              </div>

              {authChallenge && (
                <div className="ui-panel p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-ink">
                      {isEs ? '2. Firmar y verificar vínculo BCH' : '2. Sign & verify BCH link'}
                    </span>
                    <button
                      type="button"
                      disabled={isAuthenticating}
                      onClick={handleSignChallenge}
                      className="ui-btn-primary ui-btn-sm"
                    >
                      {isAuthenticating ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Key className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {isAuthenticating
                          ? isEs
                            ? 'Validando...'
                            : 'Verifying...'
                          : isEs
                          ? 'Firmar reto'
                          : 'Sign challenge'}
                      </span>
                    </button>
                  </div>

                  {authSignature && (
                    <div className="p-2.5 rounded-control bg-surface border border-line text-[11px] font-mono text-ink-2 break-all select-all">
                      {authSignature}
                    </div>
                  )}
                </div>
              )}

              {authResult && (
                <div
                  className={`p-4 rounded-panel border space-y-1.5 ${
                    authResult.isChallengeSigValid && authResult.isIdentityBound
                      ? 'bg-emerald-500/10 border-emerald-500/20'
                      : 'bg-amber-500/10 border-amber-500/20'
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                    {authResult.isChallengeSigValid && authResult.isIdentityBound ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                    )}
                    <span>
                      {authResult.isChallengeSigValid && authResult.isIdentityBound
                        ? isEs
                          ? 'Sesión e identidad BCH autenticadas'
                          : 'Web3 session & BCH identity authenticated'
                        : isEs
                        ? 'Firma válida, pero falta publicar tu enlace UserLink'
                        : 'Signature valid, but UserLink binding is not published yet'}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-ink-2 space-y-0.5">
                    <div className="truncate">Nostr: {authResult.signerNpub}</div>
                    {authResult.linkedBchAddress && (
                      <div className="truncate text-ink">BCH: {authResult.linkedBchAddress}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3C: PROTOCOL SPEC */}
          {inspectorTab === 'spec' && (
            <div className="ui-card p-5 sm:p-6 space-y-5">
              <div>
                <h3 className="ui-section-title">
                  {isEs ? 'Especificación del protocolo UserLink (NIP-78 + BSM)' : 'UserLink Protocol Specification (NIP-78 + BSM)'}
                </h3>
                <p className="ui-subtitle">
                  {isEs
                    ? 'Vinculación bidireccional sin custodia entre Bitcoin Cash (secp256k1 BSM) y Nostr (BIP-340 Schnorr) en eventos Kind 30078.'
                    : 'Bidirectional non-custodial binding between Bitcoin Cash (secp256k1 BSM) and Nostr (BIP-340 Schnorr) via replaceable Kind 30078 events.'}
                </p>
              </div>

              <div className="ui-panel p-4 space-y-2">
                <div className="text-xs font-semibold text-ink">
                  {isEs ? 'Flujo criptográfico bidireccional:' : 'Bidirectional cryptographic architecture:'}
                </div>
                <div className="p-3 rounded-control bg-surface border border-line font-mono text-xs text-ink-2 overflow-x-auto whitespace-pre">
{`+----------------------------+          +----------------------------+
|  Bitcoin Cash (secp256k1)  |          |     Nostr (BIP-340)        |
|  bch_signMessage / ECDSA   |          |   Schnorr Keypair / NIP-07 |
+-------------+--------------+          +-------------+--------------+
              |                                       |
              v                                       v
 Signs Canonical Statement                  Signs Kind 30078 Event
 Containing Nostr Pubkey                    Containing BCH Proof Tag
              |                                       |
              +-------------------+-------------------+
                                  |
                                  v
            [ Indexed Public Nostr Relays (#d, #i, #t) ]
         (primal.net, snort.social, nostr.oxtr.dev, offchain.pub)
                                  |
                                  v
            [ Independent Client-Side Verification ]
     1) verifyEvent (Schnorr)   2) Recover Pubkey from BSM Sig
     3) hash160(pubkey) == CashAddr   4) Bidirectional JSON Match`}
                </div>
              </div>

              <div className="ui-panel p-4 space-y-2">
                <div className="text-xs font-semibold text-ink">
                  {isEs ? 'Esquema del evento Kind 30078:' : 'Kind 30078 Event Schema:'}
                </div>
                <div className="p-3 rounded-control bg-surface border border-line text-[11px] font-mono text-ink-2 overflow-x-auto whitespace-pre">
{`{
  "kind": 30078,
  "created_at": 1763059200,
  "pubkey": "de69276e520917aa8227ba4ab4460edd64b5dc263e6f475b29f33fad3af81990",
  "tags": [
    ["d", "${USERLINK_D_TAG}"],
    ["t", "myuser"],
    ["t", "bitcoincash:qr5zz6098wax242qrz3k7dctsx2kd3vszvywzsefgn"],
    ["i", "bch:bitcoincash:qr5zz6098wax242qrz3k7dctsx2kd3vszvywzsefgn", "<bsm_base64_sig>"],
    ["bch", "bitcoincash:qr5zz6098wax242qrz3k7dctsx2kd3vszvywzsefgn"],
    ["bch_sig", "<bsm_base64_sig>"],
    ["sig_scheme", "bitcoin-signed-message"],
    ["handle", "myuser"],
    ["nip05", "myuser@bliquid.xyz"],
    ["network", "${selectedNetwork}"],
    ["client", "UserLink by Drian Stack Labs"]
  ],
  "content": "{\\"protocol\\":\\"bch-nostr-userlink-id-v1\\",\\"username\\":\\"@myuser\\",\\"bchAddress\\":\\"bitcoincash:qr5zz6098wax242qrz3k7dctsx2kd3vszvywzsefgn\\",\\"nostrPubkey\\":\\"de69276e520917aa8227ba4ab4460edd64b5dc263e6f475b29f33fad3af81990\\"}"
}`}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          SHARED QR CODE MODAL
          ===================================================================== */}
      <AnimatePresence>
        {qrModalData && (
          <div
            onClick={() => setQrModalData(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
              className="ui-card max-w-sm w-full p-6 space-y-4 relative"
            >
              <button
                type="button"
                onClick={() => setQrModalData(null)}
                className="absolute top-4 right-4 p-1 rounded-full hover:bg-surface-2 text-ink-3 hover:text-ink transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center space-y-0.5">
                <div className="text-base font-semibold text-ink">{qrModalData.handle}</div>
                <div className="text-xs text-ink-3">
                  {qrModalData.address.startsWith('bchtest:') ? 'Chipnet Testnet' : 'Bitcoin Cash Mainnet'}
                </div>
              </div>

              <div className="p-4 rounded-panel bg-white border border-line flex items-center justify-center">
                {qrModalUrl ? (
                  <img src={qrModalUrl} alt="CashAddress QR" className="w-48 h-48 object-contain" />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-xs text-gray-400">
                    {isEs ? 'Generando QR...' : 'Loading QR...'}
                  </div>
                )}
              </div>

              <div className="text-center text-xs font-mono text-ink-2 break-all bg-surface-2 p-2.5 rounded-control border border-line select-all">
                {qrModalData.address}
              </div>

              <button
                type="button"
                onClick={() => copyToClipboard(qrModalData.address, 'modal_qr')}
                className="ui-btn-primary w-full"
              >
                {copiedKey === 'modal_qr' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>
                  {copiedKey === 'modal_qr'
                    ? isEs
                      ? 'Copiado'
                      : 'Copied'
                    : isEs
                    ? 'Copiar dirección BCH'
                    : 'Copy BCH Address'}
                </span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =====================================================================
          PAYTACA WALLET SPONSORSHIP MODAL (First-visit / on-demand banner)
          Rendered via portal so backdrop always covers full viewport cleanly.
          ===================================================================== */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {showPaytacaBanner && (
              <div
                className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm transition-opacity overflow-y-auto"
                onClick={handleDismissPaytacaBanner}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: 16 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: 16 }}
                  transition={{ type: 'spring', damping: 26, stiffness: 340 }}
                  onClick={(e) => e.stopPropagation()}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="paytaca-sponsor-title"
                  className="relative my-auto w-full max-w-lg bg-surface border border-line rounded-card shadow-2xl overflow-hidden flex flex-col"
                >
                  {/* Official Paytaca Promotional Banner Graphic */}
                  <div className="relative w-full overflow-hidden bg-[#0B1220] border-b border-line">
                    <img
                      src="/paytaca-banner.jpg"
                      alt="Paytaca Wallet - Your money, your control."
                      className="w-full h-auto aspect-[1200/630] object-cover block select-none"
                    />
                    <button
                      type="button"
                      onClick={handleDismissPaytacaBanner}
                      aria-label={isEs ? 'Cerrar banner de patrocinio' : 'Close sponsor banner'}
                      className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center transition-colors cursor-pointer border border-white/15"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Clean Editorial Content Body */}
                  <div className="p-5 sm:p-6 space-y-4 bg-surface">
                    <div className="space-y-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-2 border border-line text-[11px] font-semibold text-ink-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>
                          {isEs
                            ? 'Patrocinador oficial · Paytaca × UserLink'
                            : 'Official Sponsor · Paytaca × UserLink'}
                        </span>
                      </span>

                      <h3
                        id="paytaca-sponsor-title"
                        className="text-xl sm:text-2xl font-bold text-ink tracking-tight"
                      >
                        {isEs
                          ? 'Patrocinado por Paytaca Wallet'
                          : 'Sponsored by Paytaca Wallet'}
                      </h3>

                      <p className="text-xs sm:text-sm text-ink-2 leading-relaxed">
                        {isEs
                          ? 'Paytaca respalda el desarrollo de UserLink en BinaryLiquid para llevar identidades @usuario verificables entre Bitcoin Cash, CashTokens y Nostr con autocustodia total.'
                          : 'Paytaca backs UserLink on BinaryLiquid to bring verifiable @handle identities across Bitcoin Cash, CashTokens, and Nostr with complete self-custody.'}
                      </p>
                    </div>

                    <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                      <button
                        type="button"
                        onClick={handleDismissPaytacaBanner}
                        className="ui-btn-primary ui-btn-lg w-full sm:flex-1 text-sm font-bold flex items-center justify-center gap-2"
                      >
                        <span>
                          {isEs ? 'Continuar a UserLink' : 'Continue to UserLink'}
                        </span>
                        <ArrowRight className="w-4 h-4" />
                      </button>

                      <a
                        href="https://www.paytaca.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={handleDismissPaytacaBanner}
                        className="ui-btn-secondary ui-btn-lg w-full sm:flex-1 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2"
                      >
                        <img
                          src="/paytaca-logo.png"
                          alt=""
                          className="w-4 h-4 object-contain"
                        />
                        <span>
                          {isEs ? 'Explorar Paytaca' : 'Explore Paytaca'}
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 text-ink-3" />
                      </a>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
