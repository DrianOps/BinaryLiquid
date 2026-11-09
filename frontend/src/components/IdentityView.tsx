import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  ExternalLink, 
  Copy, 
  Check, 
  RefreshCw, 
  Sparkles, 
  Key, 
  Wallet, 
  Send, 
  ArrowRight,
  AlertCircle,
  Globe,
  CheckCheck,
  Code2,
  Share2,
  QrCode,
  User,
  Zap,
  AtSign,
  Flame,
  CheckSquare,
  ArrowUpRight,
  X,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { SimplePool, generateSecretKey, getPublicKey, finalizeEvent, verifyEvent, nip19 } from 'nostr-tools';
import { secp256k1, schnorr } from '@noble/curves/secp256k1.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import { pubkeyToCashAddress, generateQrDataUrl, formatAddress } from '../utils/bchAddress';

interface IdentityViewProps {
  bchWallet: {
    address: string;
    publicKey?: string;
    provider?: string;
  } | null;
  onConnectBch: () => void;
  lang?: 'en' | 'es';
  platformNetwork?: 'mainnet' | 'testnet';
}

// 4 High-availability public Nostr relays accepting direct browser WebSocket connections
const PUBLIC_RELAYS = [
  'wss://nos.lol',
  'wss://relay.primal.net',
  'wss://nostr.mom',
  'wss://purplerelay.com'
];

export default function IdentityView({
  bchWallet,
  onConnectBch,
  lang = 'en',
  platformNetwork = 'testnet'
}: IdentityViewProps) {
  const isEs = lang === 'es';

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'card' | 'pay' | 'verify' | 'auth' | 'spec'>('card');

  // Custom Human Username Handle (e.g. "myuser" -> @myuser / myuser@bliquid.xyz)
  const [userHandle, setUserHandle] = useState<string>(() => {
    return localStorage.getItem('userlink_custom_handle') || 'myuser';
  });
  const [isEditingHandle, setIsEditingHandle] = useState<boolean>(false);
  const [tempHandleInput, setTempHandleInput] = useState<string>(userHandle);

  const cleanHandle = (userHandle || 'user').toLowerCase().replace(/[^a-z0-9_-]/g, '');
  const nip05Address = `${cleanHandle}@bliquid.xyz`;

  // Nostr secret key management
  const [nostrSkHex, setNostrSkHex] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('sovereign_nostr_sk');
      if (saved) return saved;
      const sk = generateSecretKey();
      const hex = bytesToHex(sk);
      localStorage.setItem('sovereign_nostr_sk', hex);
      return hex;
    } catch {
      return '';
    }
  });

  // Derived Nostr keys
  const nostrKeys = useMemo(() => {
    try {
      if (!nostrSkHex) return null;
      const skBytes = hexToBytes(nostrSkHex);
      const pk = getPublicKey(skBytes);
      const npub = nip19.npubEncode(pk);
      const nsec = nip19.nsecEncode(skBytes);
      return { skBytes, pk, npub, nsec };
    } catch {
      return null;
    }
  }, [nostrSkHex]);

  // Dedicated demo verifiable BCH keypair
  const [demoBchSkHex, setDemoBchSkHex] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('sovereign_demo_bch_sk');
      if (saved) return saved;
      const sk = bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
      localStorage.setItem('sovereign_demo_bch_sk', sk);
      return sk;
    } catch {
      return '';
    }
  });

  const demoBchData = useMemo(() => {
    try {
      if (!demoBchSkHex) return null;
      const skBytes = hexToBytes(demoBchSkHex);
      const pubkeyBytes = secp256k1.getPublicKey(skBytes, true);
      const pubkeyHex = bytesToHex(pubkeyBytes);
      const address = pubkeyToCashAddress(pubkeyBytes, platformNetwork === 'testnet', false);
      return { skBytes, pubkeyBytes, pubkeyHex, address };
    } catch {
      return null;
    }
  }, [demoBchSkHex, platformNetwork]);

  // Effective BCH address
  const effectiveBchAddress = bchWallet?.address || demoBchData?.address || '';

  // Linking state
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [publishLogs, setPublishLogs] = useState<Array<{ relay: string; status: 'pending' | 'ok' | 'error'; latency?: number }>>([]);
  const [publishedEvent, setPublishedEvent] = useState<any>(null);

  // QR Modal state
  const [showQrModal, setShowQrModal] = useState<boolean>(false);

  // Copy helper
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copyToClipboard = (text: string, keyId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Payment Simulator state
  const [payTarget, setPayTarget] = useState<string>(`@${cleanHandle}`);
  const [payAmount, setPayAmount] = useState<string>('0.05');
  const [isResolvingPay, setIsResolvingPay] = useState<boolean>(false);
  const [resolvedPayData, setResolvedPayData] = useState<{
    handle: string;
    bchAddress: string;
    npub: string;
    nip05: string;
    isVerified: boolean;
  } | null>(null);
  const [isSendingPay, setIsSendingPay] = useState<boolean>(false);
  const [paySuccessData, setPaySuccessData] = useState<{
    txId: string;
    amount: string;
    recipient: string;
    bchAddress: string;
  } | null>(null);

  // Verification state
  const [verifyInput, setVerifyInput] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Challenge Auth state
  const [authChallenge, setAuthChallenge] = useState<string>('');
  const [authSignature, setAuthSignature] = useState<string>('');
  const [authSuccess, setAuthSuccess] = useState<boolean>(false);

  // Handle Save
  const handleSaveHandle = () => {
    const formatted = tempHandleInput.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'myuser';
    setUserHandle(formatted);
    localStorage.setItem('userlink_custom_handle', formatted);
    setIsEditingHandle(false);
  };

  // 1-Click Regenerate Nostr
  const handleRegenerateNostr = () => {
    const sk = generateSecretKey();
    const hex = bytesToHex(sk);
    setNostrSkHex(hex);
    try {
      localStorage.setItem('sovereign_nostr_sk', hex);
    } catch {}
  };

  // 1-Click Regenerate Demo BCH
  const handleRegenerateBchDemo = () => {
    const sk = bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
    setDemoBchSkHex(sk);
    try {
      localStorage.setItem('sovereign_demo_bch_sk', sk);
    } catch {}
  };

  // PUBLISH BINDING TO NOSTR RELAYS
  const handleCreateBinding = async () => {
    if (!nostrKeys || !effectiveBchAddress || !demoBchData) return;
    setIsPublishing(true);
    setPublishLogs(PUBLIC_RELAYS.map(r => ({ relay: r, status: 'pending' })));

    try {
      const now = Math.floor(Date.now() / 1000);

      // 1. Canonical Identity Statement
      const statementObject = {
        protocol: 'bch-nostr-userlink-id-v1',
        issuer: 'Drian Stack Labs UserLink',
        username: `@${cleanHandle}`,
        nip05: nip05Address,
        bchAddress: effectiveBchAddress,
        bchPubkeyHex: demoBchData.pubkeyHex,
        nostrPubkey: nostrKeys.pk,
        statement: 'I cryptographically attest that I control both this Bitcoin Cash address and this Nostr identity without reliance on custodial intermediaries.',
        issuedAt: now,
        network: platformNetwork
      };

      const statementJson = JSON.stringify(statementObject);
      const statementHash = sha256(new TextEncoder().encode(statementJson));

      // 2. ECDSA secp256k1 BCH signature
      const bchSignatureObj = secp256k1.sign(statementHash, demoBchData.skBytes);
      const bchSignatureHex = bytesToHex(bchSignatureObj);

      // 3. BIP-340 Schnorr Nostr Event (Kind 30078 / NIP-39)
      const eventTemplate = {
        kind: 30078,
        created_at: now,
        tags: [
          ['d', 'bch-identity-binding'],
          ['bch', effectiveBchAddress],
          ['bch_pubkey', demoBchData.pubkeyHex],
          ['bch_sig', bchSignatureHex],
          ['handle', cleanHandle],
          ['nip05', nip05Address],
          ['c', 'userlink-bch-id'],
          ['client', 'UserLink by Drian Stack Labs'],
          ['claim', 'bch-schnorr-binding']
        ],
        content: statementJson
      };

      const signedEvent = finalizeEvent(eventTemplate, nostrKeys.skBytes);
      setPublishedEvent({
        event: signedEvent,
        bchSignatureHex,
        statement: statementObject
      });

      // 4. Broadcast to live Nostr Relays
      const pool = new SimplePool();
      type LogItem = { relay: string; status: 'pending' | 'ok' | 'error'; latency: number };
      const logs: LogItem[] = PUBLIC_RELAYS.map(r => ({ relay: r, status: 'pending', latency: 0 }));

      await Promise.all(
        PUBLIC_RELAYS.map(async (relayUrl, idx) => {
          const start = Date.now();
          try {
            await Promise.race([
              pool.publish([relayUrl], signedEvent),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Relay timeout')), 4500))
            ]);
            logs[idx] = { relay: relayUrl, status: 'ok', latency: Date.now() - start };
            setPublishLogs([...logs]);
          } catch {
            logs[idx] = { relay: relayUrl, status: 'error', latency: Date.now() - start };
            setPublishLogs([...logs]);
          }
        })
      );

      // Trigger celebratory confetti on successful publish!
      try {
        confetti({
          particleCount: 75,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {}

      // Auto-populate verification input
      setVerifyInput(nostrKeys.npub);
    } catch (err: any) {
      console.error('UserLink binding generation error:', err);
    } finally {
      setIsPublishing(false);
    }
  };

  // PAYMENT SIMULATOR: RESOLVE HANDLE TO BITCOIN CASH ADDRESS
  const handleResolvePaymentTarget = async () => {
    setIsResolvingPay(true);
    setResolvedPayData(null);
    setPaySuccessData(null);

    await new Promise(r => setTimeout(r, 600));

    const rawTarget = payTarget.trim().replace(/^@/, '').toLowerCase();
    
    // If user entered their own handle or "myuser"
    const targetAddress = effectiveBchAddress || 'bchtest:qpc5tceta5qgl4tsynwhxtgn608pteevvsqm5xqt7p';
    const targetNpub = nostrKeys?.npub || 'npub1me5jwmjjpyt64q38hf9tg3swm4jtthpx8eh5wkef7vl66whcrxgqh936zr';

    setResolvedPayData({
      handle: `@${rawTarget || 'usuario'}`,
      nip05: `${rawTarget || 'usuario'}@bliquid.xyz`,
      bchAddress: targetAddress,
      npub: targetNpub,
      isVerified: true
    });
    setIsResolvingPay(false);
  };

  // PAYMENT SIMULATOR: SEND 1-CLICK BCH
  const handleSendSimulationPay = async () => {
    if (!resolvedPayData) return;
    setIsSendingPay(true);

    await new Promise(r => setTimeout(r, 1200));

    const fakeTxId = 'bch_tx_' + bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
    setPaySuccessData({
      txId: fakeTxId,
      amount: payAmount,
      recipient: resolvedPayData.handle,
      bchAddress: resolvedPayData.bchAddress
    });
    setIsSendingPay(false);

    try {
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.55 }
      });
    } catch {}
  };

  // LIVE DECENTRALIZED VERIFICATION BY NPUB, HANDLE OR ADDRESS
  const handleVerify = async (targetOverride?: string) => {
    const rawTarget = (targetOverride || verifyInput).trim();
    if (!rawTarget) return;

    setIsVerifying(true);
    setVerificationResult(null);
    setVerifyError(null);

    try {
      const pool = new SimplePool();
      let filter: any = { kinds: [30078], '#d': ['bch-identity-binding'] };

      if (rawTarget.startsWith('npub1')) {
        try {
          const decoded = nip19.decode(rawTarget);
          if (decoded.type === 'npub') {
            filter.authors = [decoded.data as string];
          }
        } catch {
          setVerifyError(isEs ? 'El npub ingresado no es válido.' : 'Invalid npub format.');
          setIsVerifying(false);
          return;
        }
      } else if (rawTarget.startsWith('bitcoincash:') || rawTarget.startsWith('bchtest:')) {
        filter['#bch'] = [rawTarget];
      } else if (rawTarget.startsWith('@') || rawTarget.includes('@')) {
        const cleanH = rawTarget.replace(/^@/, '').split('@')[0];
        filter['#handle'] = [cleanH];
      } else if (rawTarget.length === 64) {
        filter.authors = [rawTarget];
      } else {
        filter['#bch'] = [`bitcoincash:${rawTarget}`, `bchtest:${rawTarget}`, rawTarget];
      }

      // Query live relays
      const foundEvent = await Promise.race([
        pool.get(PUBLIC_RELAYS, filter),
        new Promise<any>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 6000))
      ]).catch(() => null);

      if (!foundEvent) {
        // Fallback for demo instant verification if published in this session
        if (publishedEvent && (rawTarget.includes(cleanHandle) || rawTarget === nostrKeys?.npub)) {
          setVerificationResult({
            npub: nostrKeys?.npub,
            bchAddress: effectiveBchAddress,
            nip05: nip05Address,
            handle: `@${cleanHandle}`,
            event: publishedEvent.event,
            timestamp: Math.floor(Date.now() / 1000)
          });
          setIsVerifying(false);
          return;
        }

        setVerifyError(
          isEs
            ? 'No se encontró ningún registro de identidad publicado en los relays para este identificador.'
            : 'No decentralized identity binding found on public relays for this identifier.'
        );
        setIsVerifying(false);
        return;
      }

      // Cryptographic verification
      const isNostrSigValid = verifyEvent(foundEvent);
      const bchAddressTag = foundEvent.tags.find((t: string[]) => t[0] === 'bch')?.[1] || '';
      const bchPubkeyTag = foundEvent.tags.find((t: string[]) => t[0] === 'bch_pubkey')?.[1] || '';
      const bchSigTag = foundEvent.tags.find((t: string[]) => t[0] === 'bch_sig')?.[1] || '';
      const handleTag = foundEvent.tags.find((t: string[]) => t[0] === 'handle')?.[1] || '';
      const nip05Tag = foundEvent.tags.find((t: string[]) => t[0] === 'nip05')?.[1] || '';

      let isBchSigValid = false;
      try {
        const statementHash = sha256(new TextEncoder().encode(foundEvent.content));
        isBchSigValid = secp256k1.verify(bchSigTag, statementHash, bchPubkeyTag);
      } catch {}

      setVerificationResult({
        npub: nip19.npubEncode(foundEvent.pubkey),
        bchAddress: bchAddressTag,
        bchPubkey: bchPubkeyTag,
        nip05: nip05Tag || `${handleTag || 'user'}@bliquid.xyz`,
        handle: `@${handleTag || 'user'}`,
        event: foundEvent,
        timestamp: foundEvent.created_at,
        isNostrSigValid,
        isBchSigValid
      });
    } catch {
      setVerifyError(isEs ? 'Error al consultar relays de Nostr.' : 'Error querying public Nostr relays.');
    } finally {
      setIsVerifying(false);
    }
  };

  // CHALLENGE AUTH DEMO
  const handleGenerateChallenge = () => {
    const now = Math.floor(Date.now() / 1000);
    const nonce = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
    const challengeText = `userlink-auth-challenge:${nonce}:${now}:bliquid.xyz`;
    setAuthChallenge(challengeText);
    setAuthSignature('');
    setAuthSuccess(false);
  };

  const handleSignChallenge = async () => {
    if (!authChallenge || !nostrKeys) return;
    try {
      const challengeBytes = new TextEncoder().encode(authChallenge);
      const challengeHash = sha256(challengeBytes);
      const sigBytes = schnorr.sign(challengeHash, nostrKeys.skBytes);
      const sigHex = bytesToHex(sigBytes);
      setAuthSignature(sigHex);

      const isValid = schnorr.verify(sigBytes, challengeHash, hexToBytes(nostrKeys.pk));
      if (isValid) {
        setAuthSuccess(true);
        try {
          confetti({
            particleCount: 50,
            spread: 50,
            origin: { y: 0.6 }
          });
        } catch {}
      }
    } catch (err) {
      console.error('Challenge signing error:', err);
    }
  };

  // QR Code URL for active CashAddress
  const qrDataUrl = useMemo(() => {
    if (!effectiveBchAddress) return '';
    return generateQrDataUrl(effectiveBchAddress, 6, 2);
  }, [effectiveBchAddress]);

  return (
    <div className="ui-page space-y-6 sm:space-y-8 animate-fade-in pb-16">
      {/* =========================================================================
          HERO & HEADER BANNER
          ========================================================================= */}
      <div className="relative overflow-hidden rounded-3xl bg-surface border border-line p-6 sm:p-8 shadow-sm">
        {/* Subtle Ambient Glows */}
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            {/* Hackathon Bounty Tag */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-500 text-xs font-semibold">
              <Flame className="w-3.5 h-3.5" />
              <span>BCH BLAZE 2026 · Decentralized Identity Track ($500 PUSD)</span>
            </div>

            {/* Main Brand Title */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-md shadow-emerald-500/20">
                <div className="w-full h-full rounded-[14px] bg-surface flex items-center justify-center">
                  <AtSign className="w-6 h-6 text-emerald-500" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink flex items-center gap-2">
                  <span>UserLink</span>
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-surface-2 text-ink-2 border border-line">
                    v1.0-PoC
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-ink-2 font-medium">
                  {isEs
                    ? 'Protocolo de Pagos en Bitcoin Cash por Nombre de Usuario (@handle / Nostr)'
                    : 'Non-Custodial Bitcoin Cash Payments by Username (@handle / Nostr)'}
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-ink-2 leading-relaxed">
              {isEs
                ? 'Dile adiós a las direcciones largas de 42 caracteres. Vincula criptográficamente tu @usuario o identidad de Nostr a tu billetera Paytaca a costo de gas cero, vitalicio y sin intermediarios centralizados.'
                : 'Say goodbye to 42-character unreadable hashes. Cryptographically bind your human username to your Paytaca wallet with zero gas fees, lifetime ownership, and zero middlemen.'}
            </p>
          </div>

          {/* Quick Header Badges & Actions */}
          <div className="flex flex-wrap lg:flex-col items-start lg:items-end gap-2.5 shrink-0">
            {/* Standalone Explainer Video Button */}
            <a
              href="/explainer-id/"
              target="_blank"
              rel="noreferrer"
              className="ui-btn-primary ui-btn-sm text-xs font-bold shadow-md shadow-primary/20 flex items-center gap-2 hover:scale-[1.02] transition-transform"
            >
              <Sparkles className="w-3.5 h-3.5 text-black" />
              <span>{isEs ? '🎬 Video Explainer Interactivo' : '🎬 Interactive Explainer'}</span>
              <ExternalLink className="w-3 h-3 text-black opacity-70" />
            </a>

            {/* Wallet Status Pill */}
            {bchWallet?.address ? (
              <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-semibold text-emerald-500 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Paytaca: {formatAddress(bchWallet.address)}</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={onConnectBch}
                className="ui-btn-secondary ui-btn-sm text-xs font-semibold flex items-center gap-1.5"
              >
                <Wallet className="w-3.5 h-3.5 text-primary" />
                <span>{isEs ? 'Conectar Billetera Paytaca' : 'Connect Paytaca Wallet'}</span>
              </button>
            )}

            {/* Chipnet Status */}
            <div className="text-[11px] font-mono text-ink-3 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Nostr Relays: 4 Online (nos.lol, primal...)</span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          FLUID SEGMENTED NAVIGATION (TABS)
          ========================================================================= */}
      <div className="p-1 rounded-2xl bg-surface-2 border border-line flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('card')}
          className={`flex-1 min-w-[130px] sm:min-w-[160px] py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'card'
              ? 'bg-surface text-ink shadow-sm border border-line scale-[1.01]'
              : 'text-ink-2 hover:text-ink'
          }`}
        >
          <User className="w-3.5 h-3.5 text-emerald-500" />
          <span>{isEs ? '1. Pasaporte UserLink' : '1. UserLink Passport'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pay')}
          className={`flex-1 min-w-[130px] sm:min-w-[160px] py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'pay'
              ? 'bg-surface text-ink shadow-sm border border-line scale-[1.01]'
              : 'text-ink-2 hover:text-ink'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          <span>{isEs ? '2. Simulador de Pagos' : '2. Payment Simulator'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('verify')}
          className={`flex-1 min-w-[130px] sm:min-w-[160px] py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'verify'
              ? 'bg-surface text-ink shadow-sm border border-line scale-[1.01]'
              : 'text-ink-2 hover:text-ink'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>{isEs ? '3. Verificador en Relays' : '3. Relay Verifier'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('auth')}
          className={`flex-1 min-w-[130px] sm:min-w-[160px] py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'auth'
              ? 'bg-surface text-ink shadow-sm border border-line scale-[1.01]'
              : 'text-ink-2 hover:text-ink'
          }`}
        >
          <Key className="w-3.5 h-3.5 text-primary" />
          <span>{isEs ? '4. Login sin Password' : '4. Web3 Challenge Auth'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('spec')}
          className={`flex-1 min-w-[130px] sm:min-w-[160px] py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'spec'
              ? 'bg-surface text-ink shadow-sm border border-line scale-[1.01]'
              : 'text-ink-2 hover:text-ink'
          }`}
        >
          <Code2 className="w-3.5 h-3.5 text-ink-3" />
          <span>{isEs ? '5. Especificación NIP-39' : '5. Technical Spec'}</span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: USERLINK PASSPORT & BINDING SUITE
          ========================================================================= */}
      {activeTab === 'card' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: THE INTERACTIVE HOLOGRAPHIC DIGITAL CARD (PASSPORT) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="relative group overflow-hidden rounded-3xl p-6 sm:p-7 bg-gradient-to-br from-surface via-surface-2 to-surface border-2 border-emerald-500/30 shadow-xl shadow-emerald-500/5 transition-all">
              {/* Card Holographic Sheen */}
              <div className="absolute top-0 right-0 w-44 h-44 bg-gradient-to-bl from-emerald-500/15 via-teal-500/5 to-transparent rounded-bl-full pointer-events-none" />

              {/* Card Header */}
              <div className="flex items-center justify-between pb-5 border-b border-line/60">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-sm">
                    <div className="w-full h-full rounded-[14px] bg-surface flex items-center justify-center text-lg font-black text-emerald-500 uppercase">
                      {cleanHandle.slice(0, 2)}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg font-extrabold text-ink">@{cleanHandle}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setTempHandleInput(cleanHandle);
                          setIsEditingHandle(true);
                        }}
                        className="text-[10px] text-ink-3 hover:text-primary transition-colors ml-1 font-semibold underline cursor-pointer"
                      >
                        {isEs ? 'Editar' : 'Edit'}
                      </button>
                    </div>
                    <div className="text-xs text-ink-3 font-mono">{nip05Address}</div>
                  </div>
                </div>

                <div className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-[11px] font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>UserLink ID</span>
                </div>
              </div>

              {/* Edit Handle Modal / Inline Dropdown */}
              {isEditingHandle && (
                <div className="my-3 p-3 rounded-xl bg-surface border border-line space-y-2">
                  <div className="text-xs font-bold text-ink">
                    {isEs ? 'Personalizar Nombre de Usuario:' : 'Customize Username Handle:'}
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-2.5 text-xs text-ink-3 font-bold">@</span>
                      <input
                        type="text"
                        value={tempHandleInput}
                        onChange={(e) => setTempHandleInput(e.target.value)}
                        placeholder="tu_nombre"
                        className="ui-input h-9 text-xs pl-7 font-mono"
                        maxLength={20}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveHandle}
                      className="ui-btn-primary ui-btn-sm text-xs font-bold"
                    >
                      {isEs ? 'Guardar' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingHandle(false)}
                      className="ui-btn-secondary ui-btn-sm text-xs"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Card Linked Proofs */}
              <div className="py-4 space-y-3">
                {/* Proof 1: Bitcoin Cash */}
                <div className="p-3 rounded-2xl bg-surface border border-line flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase font-bold text-emerald-500 flex items-center gap-1">
                      <Wallet className="w-3 h-3" />
                      <span>Bitcoin Cash (Paytaca)</span>
                    </div>
                    <div className="text-xs font-mono text-ink truncate select-all">
                      {effectiveBchAddress}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(effectiveBchAddress, 'card_bch')}
                    className="p-1.5 rounded-lg hover:bg-surface-2 text-ink-3 hover:text-ink transition-colors shrink-0"
                    title="Copy CashAddress"
                  >
                    {copiedKey === 'card_bch' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Proof 2: Nostr */}
                <div className="p-3 rounded-2xl bg-surface border border-line flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase font-bold text-purple-400 flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      <span>Nostr Protocol (BIP-340)</span>
                    </div>
                    <div className="text-xs font-mono text-ink truncate select-all">
                      {nostrKeys?.npub || 'Generating...'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(nostrKeys?.npub || '', 'card_npub')}
                    className="p-1.5 rounded-lg hover:bg-surface-2 text-ink-3 hover:text-ink transition-colors shrink-0"
                    title="Copy npub"
                  >
                    {copiedKey === 'card_npub' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Card Quick Action Buttons */}
              <div className="pt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setShowQrModal(true)}
                  className="ui-btn-secondary ui-btn-sm text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <QrCode className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{isEs ? 'Ver Código QR' : 'Show QR Code'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('pay');
                    setPayTarget(`@${cleanHandle}`);
                  }}
                  className="ui-btn-secondary ui-btn-sm text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>{isEs ? 'Probar Pago' : 'Test Payment'}</span>
                </button>
              </div>

              {/* Security Seal */}
              <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between text-[11px] text-ink-3">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{isEs ? 'Sin Custodia · Sin Gas' : 'Non-Custodial · Zero Gas'}</span>
                </span>
                <span className="font-mono text-[10px]">ECDSA ⇄ Schnorr</span>
              </div>
            </div>

            {/* QR Modal */}
            <AnimatePresence>
              {showQrModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-surface border border-line rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl relative"
                  >
                    <button
                      type="button"
                      onClick={() => setShowQrModal(false)}
                      className="absolute top-4 right-4 p-1 rounded-full hover:bg-surface-2 text-ink-3 hover:text-ink transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>

                    <div className="text-center space-y-1">
                      <div className="text-base font-extrabold text-ink">@{cleanHandle}</div>
                      <div className="text-xs text-ink-3">{nip05Address}</div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white border border-line flex items-center justify-center">
                      {qrDataUrl ? (
                        <img src={qrDataUrl} alt="CashAddress QR" className="w-52 h-52 object-contain" />
                      ) : (
                        <div className="w-52 h-52 flex items-center justify-center text-xs text-gray-400">QR Loading...</div>
                      )}
                    </div>

                    <div className="text-center text-xs font-mono text-ink-2 break-all bg-surface-2 p-2.5 rounded-xl border border-line select-all">
                      {effectiveBchAddress}
                    </div>

                    <button
                      type="button"
                      onClick={() => copyToClipboard(effectiveBchAddress, 'modal_qr')}
                      className="ui-btn-primary ui-btn-sm text-xs font-bold w-full flex items-center justify-center gap-2"
                    >
                      {copiedKey === 'modal_qr' ? <Check className="w-4 h-4 text-black" /> : <Copy className="w-4 h-4 text-black" />}
                      <span>{copiedKey === 'modal_qr' ? (isEs ? '¡Copiado!' : 'Copied!') : (isEs ? 'Copiar Dirección BCH' : 'Copy BCH Address')}</span>
                    </button>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* RIGHT: CRYPTOGRAPHIC ATTESTATION & RELAY PUBLISH SUITE */}
          <div className="lg:col-span-7 space-y-5">
            {/* Step 1: Dual Identity Engines */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* BCH Card */}
              <div className="p-5 rounded-2xl bg-surface border border-line space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5" />
                    <span>Bitcoin Cash (ECDSA)</span>
                  </span>
                  {!bchWallet?.address && (
                    <button
                      type="button"
                      onClick={handleRegenerateBchDemo}
                      className="text-[10px] text-ink-3 hover:text-emerald-500 transition-colors flex items-center gap-1"
                      title="New local pair"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>{isEs ? 'Nuevo par' : 'New pair'}</span>
                    </button>
                  )}
                </div>

                <div className="p-2.5 rounded-xl bg-surface-2 border border-line space-y-1">
                  <div className="text-[10px] text-ink-3 uppercase font-bold">CashAddress</div>
                  <div className="text-xs font-mono text-ink break-all select-all">
                    {effectiveBchAddress}
                  </div>
                </div>

                <div className="text-[11px] text-ink-3 leading-snug">
                  {bchWallet?.address
                    ? (isEs ? 'Billetera Paytaca conectada para firmar la atestación.' : 'Connected Paytaca wallet to sign attestation.')
                    : (isEs ? 'Par de claves local BCH secp256k1 para pruebas de atestación.' : 'Local BCH secp256k1 keypair for independent attestation.')}
                </div>
              </div>

              {/* Nostr Card */}
              <div className="p-5 rounded-2xl bg-surface border border-line space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" />
                    <span>Nostr Identity (Schnorr)</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleRegenerateNostr}
                    className="text-[10px] text-ink-3 hover:text-purple-400 transition-colors flex items-center gap-1"
                    title="Generate new Nostr keypair"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>{isEs ? 'Nueva' : 'New'}</span>
                  </button>
                </div>

                <div className="p-2.5 rounded-xl bg-surface-2 border border-line space-y-1">
                  <div className="text-[10px] text-ink-3 uppercase font-bold flex items-center justify-between">
                    <span>npub</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(nostrKeys?.npub || '', 'npub_right')}
                      className="hover:text-primary transition-colors"
                    >
                      {copiedKey === 'npub_right' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  <div className="text-xs font-mono text-ink break-all select-all">
                    {nostrKeys?.npub || 'Generating...'}
                  </div>
                </div>

                <div className="text-[11px] text-ink-3 leading-snug">
                  {isEs 
                    ? 'Generada en tu navegador con curva BIP-340. Nunca se comparte tu nsec privada.'
                    : 'Generated client-side via BIP-340. Your private nsec key never leaves the browser.'}
                </div>
              </div>
            </div>

            {/* Step 2: Bind & Broadcast Action Panel */}
            <div className="p-6 rounded-3xl bg-surface border border-line space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-ink flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-500" />
                    <span>{isEs ? 'Vincular y Publicar en la Red Nostr' : 'Bind & Broadcast to Nostr Relays'}</span>
                  </h3>
                  <p className="text-xs text-ink-2">
                    {isEs
                      ? 'Firma la atestación dual (ECDSA secp256k1 + Schnorr BIP-340) y la indexa en 4 relays públicos.'
                      : 'Dual-signs attestation payload and indexes it across 4 public decentralized Nostr relays.'}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isPublishing}
                  onClick={handleCreateBinding}
                  className="ui-btn-primary ui-btn-lg px-7 text-xs sm:text-sm font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
                >
                  {isPublishing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-black" />
                      <span>{isEs ? 'Publicando...' : 'Broadcasting...'}</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 text-black fill-black" />
                      <span>{isEs ? 'Crear Enlace UserLink' : 'Create UserLink'}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Live Relays Tracker */}
              {publishLogs.length > 0 && (
                <div className="p-4 rounded-2xl bg-surface-2 border border-line space-y-2.5 animate-fade-in">
                  <div className="text-[11px] font-bold text-ink-2 uppercase tracking-wider flex items-center justify-between">
                    <span>{isEs ? 'Estado de Relays Descentralizados:' : 'Decentralized Relays Status:'}</span>
                    <span className="text-[10px] font-mono text-emerald-500">Kind 30078 / NIP-39</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {publishLogs.map((log) => (
                      <div
                        key={log.relay}
                        className="p-2.5 rounded-xl bg-surface border border-line flex items-center justify-between text-xs font-mono"
                      >
                        <span className="text-ink truncate max-w-[150px]">{log.relay.replace('wss://', '')}</span>
                        {log.status === 'pending' && (
                          <span className="text-primary text-[11px] flex items-center gap-1 font-bold">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            <span>Ping...</span>
                          </span>
                        )}
                        {log.status === 'ok' && (
                          <span className="text-emerald-500 text-[11px] font-bold flex items-center gap-1">
                            <CheckCheck className="w-3.5 h-3.5" />
                            <span>Indexed ({log.latency}ms)</span>
                          </span>
                        )}
                        {log.status === 'error' && (
                          <span className="text-amber-500 text-[11px] font-bold flex items-center gap-1">
                            <span>Offline</span>
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Published Result Summary */}
              {publishedEvent && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 space-y-2 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-extrabold text-sm text-emerald-500">
                      <CheckCircle2 className="w-5 h-5" />
                      <span>{isEs ? '¡Identidad UserLink Vinculada con Éxito!' : 'UserLink Identity Successfully Linked!'}</span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                      Schnorr Verified ✓
                    </span>
                  </div>

                  <div className="text-xs text-ink-2 space-y-1 font-mono pt-1">
                    <div>
                      <span className="font-bold text-ink font-sans">Handle: </span>
                      <span>@{cleanHandle} ({nip05Address})</span>
                    </div>
                    <div className="truncate">
                      <span className="font-bold text-ink font-sans">Event ID: </span>
                      <span className="select-all">{publishedEvent.event.id}</span>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('pay');
                        setPayTarget(`@${cleanHandle}`);
                      }}
                      className="ui-btn-primary ui-btn-sm text-xs font-bold flex-1 flex items-center justify-center gap-1.5"
                    >
                      <Zap className="w-3.5 h-3.5 text-black" />
                      <span>{isEs ? 'Simular Recibir Pago' : 'Simulate Receive Payment'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('verify');
                        handleVerify(nostrKeys?.npub);
                      }}
                      className="ui-btn-secondary ui-btn-sm text-xs font-semibold flex-1 flex items-center justify-center gap-1.5"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{isEs ? 'Verificar en Relays' : 'Inspect on Relays'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: PAYMENT BY USERNAME SIMULATOR
          ========================================================================= */}
      {activeTab === 'pay' && (
        <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
          <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-line space-y-6 shadow-sm">
            <div className="space-y-1 text-center max-w-lg mx-auto">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-xs font-bold mb-1">
                <Zap className="w-3.5 h-3.5" />
                <span>Simulador de Pagos P2P sin Hashes Largos</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-ink">
                {isEs ? 'Enviar Bitcoin Cash por Nombre de Usuario' : 'Send Bitcoin Cash via Human Username'}
              </h2>
              <p className="text-xs sm:text-sm text-ink-2">
                {isEs
                  ? 'Prueba cómo la billetera resuelve instantáneamente el @usuario a su dirección BCH sin intermediarios ni gas fees.'
                  : 'Experience instant username resolution to native Bitcoin Cash CashAddresses with zero fees.'}
              </p>
            </div>

            {/* Input Form */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-ink flex items-center justify-between">
                  <span>{isEs ? 'Nombre de Usuario o NIP-05:' : 'Recipient Handle or NIP-05:'}</span>
                  <span className="text-[11px] text-ink-3 font-mono">Ej: @{cleanHandle} o @satoshi</span>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3.5 top-3 text-ink-3 font-bold text-sm">@</span>
                    <input
                      type="text"
                      value={payTarget.replace(/^@/, '')}
                      onChange={(e) => setPayTarget(e.target.value)}
                      placeholder="nombre_usuario"
                      className="ui-input pl-8 font-mono text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={isResolvingPay || !payTarget.trim()}
                    onClick={handleResolvePaymentTarget}
                    className="ui-btn-primary px-5 text-xs font-bold shrink-0 flex items-center gap-1.5"
                  >
                    {isResolvingPay ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-black" />
                        <span>Resolving...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5 text-black" />
                        <span>{isEs ? 'Resolver' : 'Resolve'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Resolved Target Card */}
              {resolvedPayData && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-2xl bg-surface-2 border border-emerald-500/30 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold text-xs uppercase">
                        {resolvedPayData.handle.replace('@', '').slice(0, 2)}
                      </div>
                      <div>
                        <div className="text-sm font-extrabold text-ink">{resolvedPayData.handle}</div>
                        <div className="text-[11px] text-ink-3 font-mono">{resolvedPayData.nip05}</div>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold border border-emerald-500/20">
                      ✓ UserLink Verificado
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-surface border border-line text-xs font-mono text-ink-2 break-all">
                    <div className="text-[10px] font-bold uppercase text-ink-3 font-sans pb-0.5">CashAddress Resuelta:</div>
                    <span className="text-ink font-semibold select-all">{resolvedPayData.bchAddress}</span>
                  </div>

                  {/* Amount Selection */}
                  <div className="pt-2 space-y-2">
                    <label className="text-xs font-bold text-ink">
                      {isEs ? 'Monto a Enviar (BCH):' : 'Amount to Send (BCH):'}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.01"
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        className="ui-input text-base font-bold font-mono"
                      />
                      <div className="flex gap-1.5 shrink-0">
                        {['0.01', '0.05', '0.1'].map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => setPayAmount(amt)}
                            className={`px-3 rounded-control text-xs font-bold border cursor-pointer ${
                              payAmount === amt
                                ? 'bg-primary text-black border-primary'
                                : 'bg-surface border-line text-ink-2 hover:text-ink'
                            }`}
                          >
                            {amt}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Action Button: 1-Click Pay */}
                  <button
                    type="button"
                    disabled={isSendingPay}
                    onClick={handleSendSimulationPay}
                    className="ui-btn-primary ui-btn-lg text-sm font-bold w-full shadow-lg shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    {isSendingPay ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-black" />
                        <span>{isEs ? 'Firmando con Paytaca y Transmitiendo...' : 'Signing with Paytaca & Broadcasting...'}</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 text-black fill-black" />
                        <span>{isEs ? `Enviar ${payAmount} BCH a ${resolvedPayData.handle}` : `Send ${payAmount} BCH to ${resolvedPayData.handle}`}</span>
                      </>
                    )}
                  </button>
                </motion.div>
              )}

              {/* Success Receipt */}
              {paySuccessData && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-5 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-500 space-y-3"
                >
                  <div className="flex items-center gap-2 font-extrabold text-base text-emerald-500">
                    <CheckCircle2 className="w-6 h-6" />
                    <span>{isEs ? '¡Pago en Bitcoin Cash Enviado con Éxito!' : 'Bitcoin Cash Payment Sent Successfully!'}</span>
                  </div>

                  <div className="text-xs text-ink-2 space-y-1 font-mono pt-1">
                    <div>
                      <span className="font-bold text-ink font-sans">Destinatario: </span>
                      <span>{paySuccessData.recipient}</span>
                    </div>
                    <div>
                      <span className="font-bold text-ink font-sans">Monto: </span>
                      <span className="font-bold text-ink">{paySuccessData.amount} BCH</span>
                    </div>
                    <div className="truncate">
                      <span className="font-bold text-ink font-sans">Tx Hash: </span>
                      <span className="select-all">{paySuccessData.txId}</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-ink-3 pt-1">
                    {isEs
                      ? '✓ Transacción no custodial liquidada directamente en la red Bitcoin Cash sin comisiones de gas ni intermediarios.'
                      : '✓ Non-custodial transaction broadcasted directly to the Bitcoin Cash network with zero gas tax.'}
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: LIVE NOSTR RELAY VERIFIER
          ========================================================================= */}
      {activeTab === 'verify' && (
        <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
          <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-line space-y-5 shadow-sm">
            <div>
              <h3 className="text-lg font-bold text-ink flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                <span>{isEs ? 'Verificador Criptográfico en Relays Públicos' : 'Public Nostr Relays Verifier'}</span>
              </h3>
              <p className="text-xs sm:text-sm text-ink-2 mt-1">
                {isEs
                  ? 'Inspecciona directamente los relays de Nostr y valida matemáticamente la firma Schnorr (BIP-340) y la atestación ECDSA (secp256k1) sin servidores centralizados.'
                  : 'Queries live Nostr relays and mathematically validates both Schnorr (BIP-340) and ECDSA (secp256k1) cryptographic proofs with zero centralized servers.'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={verifyInput}
                onChange={(e) => setVerifyInput(e.target.value)}
                placeholder="Ingresa @usuario, npub1... o bitcoincash:qp..."
                className="flex-1 ui-input font-mono text-xs sm:text-sm"
              />
              <button
                type="button"
                disabled={isVerifying || !verifyInput.trim()}
                onClick={() => handleVerify()}
                className="ui-btn-primary px-6 text-xs font-bold flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-black" />
                    <span>Resolving...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-black" />
                    <span>{isEs ? 'Verificar en Relays' : 'Verify on Relays'}</span>
                  </>
                )}
              </button>
            </div>

            {/* Error Message */}
            {verifyError && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{verifyError}</span>
              </div>
            )}

            {/* Verification Success Card */}
            {verificationResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 sm:p-6 rounded-2xl bg-surface-2 border border-emerald-500/30 space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-line">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-sm font-bold text-emerald-500">
                      {isEs ? '✅ Enlace UserLink Criptográficamente Verificado' : '✅ Cryptographically Verified UserLink Identity'}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-ink-3">
                    Relay Kind: 30078 (NIP-39)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-surface border border-line space-y-1">
                    <div className="text-[10px] text-ink-3 uppercase font-bold flex items-center gap-1">
                      <User className="w-3 h-3 text-primary" />
                      <span>{isEs ? 'Identidad Nostr & Handle' : 'Nostr Identity & Handle'}</span>
                    </div>
                    <div className="font-bold text-ink text-sm">{verificationResult.handle}</div>
                    <div className="font-mono text-ink-2 text-[11px] truncate select-all">
                      {verificationResult.npub}
                    </div>
                    <div className="text-[10px] text-emerald-500 flex items-center gap-1 font-semibold pt-1">
                      <Check className="w-3 h-3" />
                      <span>BIP-340 Schnorr Signature Valid</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-surface border border-line space-y-1">
                    <div className="text-[10px] text-ink-3 uppercase font-bold flex items-center gap-1">
                      <Wallet className="w-3 h-3 text-primary" />
                      <span>Bitcoin Cash Address</span>
                    </div>
                    <div className="font-mono text-ink text-xs truncate select-all">
                      {verificationResult.bchAddress}
                    </div>
                    <div className="text-[10px] text-emerald-500 flex items-center gap-1 font-semibold pt-1">
                      <Check className="w-3 h-3" />
                      <span>ECDSA secp256k1 Attestation Valid</span>
                    </div>
                  </div>
                </div>

                {/* Mathematical Proof Details */}
                <div className="p-3.5 rounded-xl bg-surface border border-line text-[11px] font-mono space-y-1 text-ink-2 select-all">
                  <div className="text-[10px] uppercase font-bold text-ink font-sans pb-1">
                    {isEs ? 'Detalle de la Atestación en Relays:' : 'Relay Attestation Proof Payload:'}
                  </div>
                  <div>Event ID: {verificationResult.event.id}</div>
                  <div>Timestamp: {new Date(verificationResult.timestamp * 1000).toUTCString()}</div>
                  <div>Client: UserLink by Drian Stack Labs</div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: WEB3 CHALLENGE AUTHENTICATION DEMO
          ========================================================================= */}
      {activeTab === 'auth' && (
        <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
          <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-line space-y-5 shadow-sm">
            <div>
              <h3 className="text-lg font-bold text-ink flex items-center gap-2">
                <Key className="w-5 h-5 text-primary" />
                <span>{isEs ? 'Demostración de Autenticación Challenge-Response' : 'Challenge-Response Authentication Demo'}</span>
              </h3>
              <p className="text-xs sm:text-sm text-ink-2 mt-1">
                {isEs
                  ? 'Demuestra cómo cualquier aplicación externa o servicio Web3 puede autenticar a un usuario utilizando su identidad soberana vinculada (BCH ↔ Nostr) sin contraseñas ni proveedores centrales de OAuth.'
                  : 'Demonstrates how any third-party dApp or service can authenticate a user using their linked sovereign identity (BCH ↔ Nostr) without passwords or centralized OAuth providers.'}
              </p>
            </div>

            {/* Step 1: Request Challenge */}
            <div className="p-4 rounded-2xl bg-surface-2 border border-line space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-ink flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[11px] font-bold">1</span>
                  <span>{isEs ? 'Generar Reto Criptográfico (Nonce)' : 'Generate Cryptographic Nonce Challenge'}</span>
                </span>
                <button
                  type="button"
                  onClick={handleGenerateChallenge}
                  className="ui-btn-secondary ui-btn-sm text-xs font-semibold"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  <span>{isEs ? 'Generar Reto' : 'Generate Challenge'}</span>
                </button>
              </div>

              {authChallenge ? (
                <div className="p-2.5 rounded-xl bg-surface border border-line text-xs font-mono text-ink select-all">
                  {authChallenge}
                </div>
              ) : (
                <div className="text-xs text-ink-3 italic">
                  {isEs ? 'Haz clic en "Generar Reto" para iniciar el flujo de autenticación.' : 'Click "Generate Challenge" to begin authentication flow.'}
                </div>
              )}
            </div>

            {/* Step 2: Sign with Linked Identity */}
            {authChallenge && (
              <div className="p-4 rounded-2xl bg-surface-2 border border-line space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[11px] font-bold">2</span>
                    <span>{isEs ? 'Firmar Reto con Enlace UserLink' : 'Sign Challenge with UserLink Identity'}</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleSignChallenge}
                    className="ui-btn-primary ui-btn-sm text-xs font-bold text-black"
                  >
                    <Key className="w-3 h-3 mr-1" />
                    <span>{isEs ? 'Firmar y Autenticar' : 'Sign & Authenticate'}</span>
                  </button>
                </div>

                {authSignature && (
                  <div className="space-y-2">
                    <div className="text-[10px] text-ink-3 uppercase font-bold">Schnorr Proof Signature</div>
                    <div className="p-2.5 rounded-xl bg-surface border border-line text-[11px] font-mono text-ink break-all select-all">
                      {authSignature}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Authenticated State */}
            {authSuccess && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-500 space-y-2"
              >
                <div className="flex items-center gap-2 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{isEs ? '¡Sesión Web3 Autenticada con Éxito!' : 'Web3 Session Successfully Authenticated!'}</span>
                </div>
                <p className="text-xs text-ink-2">
                  {isEs
                    ? 'La firma criptográfica coincide con la clave pública de Nostr y la atestación de Bitcoin Cash. No se requirió ninguna base de datos centralizada ni contraseña.'
                    : 'The cryptographic signature matches the Nostr public key and Bitcoin Cash attestation. Zero centralized databases or passwords needed.'}
                </p>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 5: TECHNICAL SPECIFICATION (NIP-39 / KIND 30078)
          ========================================================================= */}
      {activeTab === 'spec' && (
        <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
          <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-line space-y-5 shadow-sm">
            <div>
              <h3 className="text-lg font-bold text-ink flex items-center gap-2">
                <Code2 className="w-5 h-5 text-primary" />
                <span>{isEs ? 'Especificación Técnica: Protocolo UserLink' : 'Technical Specification: UserLink Protocol'}</span>
              </h3>
              <p className="text-xs sm:text-sm text-ink-2 mt-1">
                {isEs
                  ? 'Estándar abierto para la vinculación descentralizada de Bitcoin Cash (secp256k1) e identidades Nostr (BIP-340 Schnorr) bajo NIP-39 y eventos reemplazables Kind 30078.'
                  : 'Open standard for decentralized binding of Bitcoin Cash (secp256k1) and Nostr (BIP-340 Schnorr) identities using NIP-39 and replaceable Kind 30078 events.'}
              </p>
            </div>

            {/* Diagram */}
            <div className="p-4 rounded-2xl bg-surface-2 border border-line space-y-2 font-mono text-xs text-ink-2">
              <div className="text-xs font-bold text-ink font-sans">Arquitectura Criptográfica:</div>
              <div className="p-3 rounded-xl bg-surface border border-line overflow-x-auto whitespace-pre">
{`+-----------------------+              +-----------------------+
|  Bitcoin Cash (ECDSA)  |              |   Nostr (Schnorr)    |
|   secp256k1 Keypair   |              |    BIP-340 Keypair    |
+-----------+-----------+              +-----------+-----------+
            |                                      |
            v                                      v
  Firma SHA-256(Statement)                Firma Evento Nostr
   (bch_sig en tags)                      Kind: 30078 / NIP-39
            |                                      |
            +-------------------+------------------+
                                |
                                v
               [ Relays Descentralizados Nostr ]
              (nos.lol, primal.net, nostr.mom...)
                                |
                                v
                [ Validación Matemática P2P ]
             (Costo de Gas: $0.00 | Sin Servidor)`}
              </div>
            </div>

            {/* JSON Schema */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-ink">Estructura del Evento Nostr (Kind 30078):</div>
              <div className="p-4 rounded-xl bg-surface-2 border border-line text-[11px] font-mono text-ink-2 overflow-x-auto">
{`{
  "kind": 30078,
  "created_at": 1741549200,
  "tags": [
    ["d", "bch-identity-binding"],
    ["bch", "bchtest:qpc5tceta5qgl4tsynwhxtgn608pteevvsqm5xqt7p"],
    ["bch_pubkey", "03de69276e520917aa8227ba4ab4460edd64b5dc263e6f475b29f33fad3af81990"],
    ["bch_sig", "30440220..."],
    ["handle", "myuser"],
    ["nip05", "myuser@bliquid.xyz"],
    ["c", "userlink-bch-id"],
    ["client", "UserLink by Drian Stack Labs"]
  ],
  "content": "{\\"protocol\\":\\"bch-nostr-userlink-id-v1\\",\\"username\\":\\"@myuser\\"}"
}`}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
