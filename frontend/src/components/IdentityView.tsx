import React, { useState, useMemo, useEffect } from 'react';
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
  AlertCircle,
  AlertTriangle,
  Globe,
  CheckCheck,
  Code2,
  QrCode,
  User,
  Zap,
  AtSign,
  Flame,
  X,
  ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  SimplePool,
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
  signBchMessage
} from '../services/walletConnectService';
import {
  USERLINK_RELAYS,
  USERLINK_D_TAG,
  signBitcoinMessage,
  verifyUserLinkEvent,
  resolveUserLinkFromRelays,
  publishUserLinkToRelay,
  type VerifiedUserLinkResult
} from '../utils/userlinkCrypto';

interface IdentityViewProps {
  bchWallet: {
    address: string;
    tokenAddress?: string;
    publicKey?: string;
    provider?: string;
    source?: 'wizard' | 'wc2-bch' | 'extension' | 'manual';
  } | null;
  onConnectBch: () => void;
  lang?: 'en' | 'es';
  platformNetwork?: 'mainnet' | 'testnet';
  onToggleNetwork?: (net: 'mainnet' | 'testnet') => void;
}

export default function IdentityView({
  bchWallet,
  onConnectBch,
  lang = 'en',
  platformNetwork = 'mainnet',
  onToggleNetwork
}: IdentityViewProps) {
  const isEs = lang === 'es';

  // Sync network cleanly with top-level platformNetwork
  const [selectedNetwork, setSelectedNetwork] = useState<'mainnet' | 'testnet'>(platformNetwork);
  useEffect(() => {
    setSelectedNetwork(platformNetwork);
  }, [platformNetwork]);
  const isMainnet = selectedNetwork === 'mainnet';

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'card' | 'pay' | 'verify' | 'auth' | 'spec'>('card');

  // Custom Human Username Handle
  const [userHandle, setUserHandle] = useState<string>(() => {
    try {
      return localStorage.getItem('userlink_custom_handle') || 'myuser';
    } catch {
      return 'myuser';
    }
  });
  const [isEditingHandle, setIsEditingHandle] = useState<boolean>(false);
  const [tempHandleInput, setTempHandleInput] = useState<string>(userHandle);

  const cleanHandle = (userHandle || 'myuser').toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'myuser';
  const nip05Address = `${cleanHandle}@bliquid.xyz`;

  // Nostr identity: Local BIP-340 keypair OR optional NIP-07 browser extension
  const [useNip07, setUseNip07] = useState<boolean>(false);
  const [nip07PubkeyHex, setNip07PubkeyHex] = useState<string>('');
  const [hasNip07Extension, setHasNip07Extension] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).nostr) {
      setHasNip07Extension(true);
    }
  }, []);

  const [nostrSkHex, setNostrSkHex] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('sovereign_nostr_sk');
      if (saved && /^[0-9a-fA-F]{64}$/.test(saved)) return saved;
      const sk = generateSecretKey();
      const hex = bytesToHex(sk);
      localStorage.setItem('sovereign_nostr_sk', hex);
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

  // Ephemeral / local verifiable BCH secp256k1 keypair
  const [demoBchSkHex, setDemoBchSkHex] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('sovereign_demo_bch_sk');
      if (saved && /^[0-9a-fA-F]{64}$/.test(saved)) return saved;
      const sk = bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
      localStorage.setItem('sovereign_demo_bch_sk', sk);
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

  // Wallet message signing capability (`bch_signMessage` via WC2 Cashonize/Paytaca WC2 or Extension)
  const walletCanSignMessage = useMemo(
    () => Boolean(bchWallet?.address) && hasActiveBchMessageSigningCapability(bchWallet?.source),
    [bchWallet?.address, bchWallet?.source]
  );

  // Signing source: never silently mismatch wallet address with demo key!
  const [bchSigningMode, setBchSigningMode] = useState<'wallet' | 'local'>(() =>
    walletCanSignMessage ? 'wallet' : 'local'
  );

  useEffect(() => {
    if (walletCanSignMessage) {
      setBchSigningMode('wallet');
    } else {
      setBchSigningMode('local');
    }
  }, [walletCanSignMessage]);

  const effectiveBchAddress = useMemo(() => {
    if (bchSigningMode === 'wallet' && bchWallet?.address) {
      return convertCashAddressNetwork(bchWallet.address, !isMainnet, false);
    }
    return demoBchData?.address || '';
  }, [bchSigningMode, bchWallet?.address, demoBchData?.address, isMainnet]);

  // Linking & Relay state
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishLogs, setPublishLogs] = useState<
    Array<{ relay: string; status: 'pending' | 'ok' | 'error'; latency?: number; error?: string }>
  >([]);
  const [publishedEvent, setPublishedEvent] = useState<{
    event: NostrEvent;
    verified: VerifiedUserLinkResult;
    indexedCount: number;
  } | null>(null);

  // Live relay online summary (from real connection probe or last publish)
  const [onlineRelayCount, setOnlineRelayCount] = useState<number | null>(null);
  useEffect(() => {
    if (publishLogs.length > 0 && publishLogs.every(l => l.status !== 'pending')) {
      setOnlineRelayCount(publishLogs.filter(l => l.status === 'ok').length);
    }
  }, [publishLogs]);

  // Probe relays lazily once on mount so the header indicator reflects reality without blocking
  useEffect(() => {
    let cancelled = false;
    const sockets: WebSocket[] = [];
    let okCount = 0;
    let settled = 0;

    USERLINK_RELAYS.forEach((url) => {
      try {
        const ws = new WebSocket(url);
        sockets.push(ws);
        const timer = setTimeout(() => {
          try { ws.close(); } catch {}
          settled++;
          if (!cancelled && settled === USERLINK_RELAYS.length) {
            setOnlineRelayCount(okCount);
          }
        }, 3500);
        ws.onopen = () => {
          clearTimeout(timer);
          okCount++;
          settled++;
          try { ws.close(); } catch {}
          if (!cancelled) setOnlineRelayCount(okCount);
        };
        ws.onerror = () => {
          clearTimeout(timer);
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
      sockets.forEach(ws => {
        try { ws.close(); } catch {}
      });
    };
  }, []);

  // QR Modal state
  const [showQrModal, setShowQrModal] = useState<boolean>(false);

  // Copy helper
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copyToClipboard = (text: string, keyId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Payment Resolver & Demo State (Tab 2)
  const [payTarget, setPayTarget] = useState<string>(`@${cleanHandle}`);
  const [payAmount, setPayAmount] = useState<string>('0.01');
  const [isResolvingPay, setIsResolvingPay] = useState<boolean>(false);
  const [resolvePayError, setResolvePayError] = useState<string | null>(null);
  const [resolvedPayData, setResolvedPayData] = useState<{
    handle: string;
    bchAddress: string;
    npub: string;
    nip05: string;
    isVerified: boolean;
    sourceLabel: string;
  } | null>(null);
  const [isSendingPay, setIsSendingPay] = useState<boolean>(false);
  const [paySuccessData, setPaySuccessData] = useState<{
    txId: string;
    amount: string;
    recipient: string;
    bchAddress: string;
    isDemoSimulation: boolean;
  } | null>(null);

  // Verification State (Tab 3)
  const [verifyInput, setVerifyInput] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verificationResult, setVerificationResult] = useState<VerifiedUserLinkResult | null>(null);
  const [authenticEventBackup, setAuthenticEventBackup] = useState<NostrEvent | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [isTamperedPreview, setIsTamperedPreview] = useState<boolean>(false);

  // Challenge Auth State (Tab 4)
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
    setAuthResult(null);
    setAuthSignature('');
  };

  const handleSelectNetwork = (net: 'mainnet' | 'testnet') => {
    if (net === selectedNetwork) return;
    setSelectedNetwork(net);
    onToggleNetwork?.(net);
    resetActiveProofs();
    setResolvedPayData(null);
    setPaySuccessData(null);
  };

  const handleSaveHandle = () => {
    const formatted =
      tempHandleInput.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'myuser';
    setUserHandle(formatted);
    try {
      localStorage.setItem('userlink_custom_handle', formatted);
    } catch {}
    setPayTarget(`@${formatted}`);
    setIsEditingHandle(false);
    resetActiveProofs();
  };

  const handleConnectNip07 = async () => {
    const win = window as any;
    if (!win?.nostr?.getPublicKey) return;
    try {
      const pk: string = await win.nostr.getPublicKey();
      if (pk && /^[0-9a-fA-F]{64}$/.test(pk)) {
        setNip07PubkeyHex(pk.toLowerCase());
        setUseNip07(true);
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
    setNostrSkHex(hex);
    try {
      localStorage.setItem('sovereign_nostr_sk', hex);
    } catch {}
    resetActiveProofs();
  };

  const handleRegenerateBchDemo = () => {
    const sk = bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
    setDemoBchSkHex(sk);
    try {
      localStorage.setItem('sovereign_demo_bch_sk', sk);
    } catch {}
    resetActiveProofs();
  };

  // PUBLISH REAL CRYPTOGRAPHIC BINDING TO NOSTR RELAYS
  const handleCreateBinding = async () => {
    if (!nostrKeys || !effectiveBchAddress) return;
    setIsPublishing(true);
    setPublishError(null);
    setPublishLogs(USERLINK_RELAYS.map(r => ({ relay: r, status: 'pending', latency: 0 })));

    try {
      const now = Math.floor(Date.now() / 1000);

      // 1. Canonical Bidirectional Identity Statement
      const statementObject = {
        protocol: 'bch-nostr-userlink-id-v1',
        issuer: 'Drian Stack Labs UserLink',
        username: `@${cleanHandle}`,
        nip05: nip05Address,
        bchAddress: effectiveBchAddress,
        bchSignerMode: bchSigningMode,
        nostrPubkey: nostrKeys.pk,
        statement:
          'I cryptographically attest that I control both this Bitcoin Cash address and this Nostr identity without reliance on custodial intermediaries.',
        issuedAt: now,
        network: selectedNetwork
      };

      const statementJson = JSON.stringify(statementObject);

      // 2. Authentic Bitcoin Signed Message signature (`bch_signMessage` via wallet OR verifiable local secp256k1)
      let bchSignature = '';
      if (bchSigningMode === 'wallet' && walletCanSignMessage) {
        const res = await signBchMessage({
          message: statementJson,
          userPrompt: isEs
            ? `Vincular @${cleanHandle} (${effectiveBchAddress}) con tu identidad Nostr`
            : `Bind @${cleanHandle} (${effectiveBchAddress}) with your Nostr identity`,
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

      // Verify ownership mathematically before broadcasting!
      const provisionalTemplate = {
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
          ['nip05', nip05Address],
          ['c', 'userlink-bch-id'],
          ['client', 'UserLink by Drian Stack Labs'],
          ['network', selectedNetwork],
          ['claim', 'bch-schnorr-bsm-binding']
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

      // Attach verified bchPubkey tag preview if needed (preCheck already recovered it)
      // 4. Broadcast cleanly to live Nostr Relays with genuine awaited OK acks
      type LogItem = { relay: string; status: 'pending' | 'ok' | 'error'; latency?: number; error?: string };
      const logs: LogItem[] = USERLINK_RELAYS.map(r => ({ relay: r, status: 'pending', latency: 0 }));

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

      const indexedCount = logs.filter(l => l.status === 'ok').length;
      setPublishedEvent({
        event: signedEvent,
        verified: preCheck,
        indexedCount
      });
      setVerifyInput(nostrKeys.npub);

      if (indexedCount > 0) {
        try {
          confetti({
            particleCount: 70,
            spread: 65,
            origin: { y: 0.6 }
          });
        } catch {}
      } else {
        setPublishError(
          isEs
            ? 'El evento se firmó correctamente en local, pero ningún relay respondió a tiempo. Verifica tu conexión.'
            : 'Event was signed locally, but no relay acknowledged within timeout. Please check connectivity.'
        );
      }
    } catch (err: any) {
      console.error('UserLink binding generation error:', err);
      setPublishError(err?.message || (isEs ? 'Error al generar o publicar el enlace.' : 'Failed to create or publish UserLink binding.'));
      setPublishLogs([]);
    } finally {
      setIsPublishing(false);
    }
  };

  // REAL DECENTRALIZED PAYMENT RESOLUTION (Tab 2)
  const handleResolvePaymentTarget = async () => {
    const query = payTarget.trim();
    if (!query) return;
    setIsResolvingPay(true);
    setResolvePayError(null);
    setResolvedPayData(null);
    setPaySuccessData(null);

    try {
      const { verified, nip05Fallback } = await resolveUserLinkFromRelays(query);

      if (verified && verified.isOverallValid) {
        setResolvedPayData({
          handle: verified.handle,
          nip05: verified.nip05,
          bchAddress: verified.bchAddress,
          npub: verified.npub,
          isVerified: true,
          sourceLabel: isEs ? 'Relay Nostr + Prueba Criptográfica' : 'Nostr Relay + Crypto Proof'
        });
        return;
      }

      // Check just-published session event ONLY if the query genuinely matches its handle/npub/address
      const cleanQuery = query.replace(/^@/, '').split('@')[0].toLowerCase();
      if (
        publishedEvent?.verified.isOverallValid &&
        (publishedEvent.verified.handle.replace(/^@/, '').toLowerCase() === cleanQuery ||
          publishedEvent.verified.npub === query ||
          publishedEvent.verified.bchAddress === query)
      ) {
        setResolvedPayData({
          handle: publishedEvent.verified.handle,
          nip05: publishedEvent.verified.nip05,
          bchAddress: publishedEvent.verified.bchAddress,
          npub: publishedEvent.verified.npub,
          isVerified: true,
          sourceLabel: isEs ? 'Sesión Verificada Localmente' : 'Verified Session Binding'
        });
        return;
      }

      // Static NIP-05 fallback (if domain serves .well-known/nostr.json with bch_addresses, without Kind 30078 proof)
      if (nip05Fallback?.bchAddress) {
        setResolvedPayData({
          handle: nip05Fallback.handle,
          nip05: nip05Fallback.nip05,
          bchAddress: nip05Fallback.bchAddress,
          npub: nip19.npubEncode(nip05Fallback.pubkeyHex),
          isVerified: false,
          sourceLabel: isEs ? 'Directorio NIP-05 (Sin firma Kind 30078)' : 'NIP-05 Directory (No Kind 30078 proof)'
        });
        return;
      }

      setResolvePayError(
        isEs
          ? `No se encontró ninguna identidad UserLink para "${query}" en los relays de Nostr ni en NIP-05. Crea primero el enlace en la pestaña 1 o prueba con myuser@bliquid.xyz.`
          : `No UserLink identity found for "${query}" on Nostr relays or NIP-05. Create your binding in Tab 1 first or try myuser@bliquid.xyz.`
      );
    } catch {
      setResolvePayError(
        isEs ? 'Error consultando los relays descentralizados.' : 'Error querying decentralized relays.'
      );
    } finally {
      setIsResolvingPay(false);
    }
  };

  // DEMO PAYMENT SIMULATION (Explicitly marked non-broadcasting demo)
  const handleSendSimulationPay = async () => {
    if (!resolvedPayData) return;
    setIsSendingPay(true);

    await new Promise(r => setTimeout(r, 850));

    const demoTxId = bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
    setPaySuccessData({
      txId: demoTxId,
      amount: payAmount,
      recipient: resolvedPayData.handle,
      bchAddress: resolvedPayData.bchAddress,
      isDemoSimulation: true
    });
    setIsSendingPay(false);

    try {
      confetti({
        particleCount: 55,
        spread: 55,
        origin: { y: 0.55 }
      });
    } catch {}
  };

  // LIVE DECENTRALIZED VERIFICATION (Tab 3)
  const handleVerify = async (targetOverride?: string) => {
    const rawTarget = (targetOverride || verifyInput).trim();
    if (!rawTarget) return;

    setIsVerifying(true);
    setVerificationResult(null);
    setAuthenticEventBackup(null);
    setVerifyError(null);
    setIsTamperedPreview(false);

    try {
      const { verified } = await resolveUserLinkFromRelays(rawTarget);
      if (verified) {
        setVerificationResult(verified);
        return;
      }

      // Session fallback ONLY if exact match AND run real cryptographic verification!
      const cleanQ = rawTarget.replace(/^@/, '').split('@')[0].toLowerCase();
      if (
        publishedEvent &&
        (publishedEvent.verified.handle.replace(/^@/, '').toLowerCase() === cleanQ ||
          publishedEvent.verified.npub === rawTarget ||
          publishedEvent.verified.pubkeyHex.toLowerCase() === rawTarget.toLowerCase() ||
          publishedEvent.verified.bchAddress === rawTarget)
      ) {
        setVerificationResult(verifyUserLinkEvent(publishedEvent.event));
        return;
      }

      setVerifyError(
        isEs
          ? 'No se encontró ningún registro de identidad publicado en los relays para este identificador.'
          : 'No decentralized identity binding found on public relays for this identifier.'
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

  // Interactive security demo: alter signed event content and re-run real cryptographic check
  const handleRunTamperTest = () => {
    if (!verificationResult) return;
    if (isTamperedPreview && authenticEventBackup) {
      // Restore authentic verification from untouched backup
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

  // CHALLENGE AUTH DEMO (Tab 4): Verifies Schnorr challenge + checks live/verified Nostr <-> BCH binding
  const handleGenerateChallenge = () => {
    const now = Math.floor(Date.now() / 1000);
    const nonce = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
    const challengeText = `userlink-auth-challenge:${nonce}:${now}:bliquid.xyz`;
    setAuthChallenge(challengeText);
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

      // Verify that this Nostr pubkey actually has a valid BCH UserLink attestation on relays or in session!
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
            particleCount: 50,
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

  // BIP-21 URI (never double-prefixes `bitcoincash:` / `bchtest:`)
  const buildBip21Uri = (address: string, amount?: string, label?: string) => {
    const cleanAddr = (address || '').trim();
    const params = new URLSearchParams();
    if (amount && Number(amount) > 0) params.set('amount', amount);
    if (label) params.set('label', label);
    const qs = params.toString();
    return qs ? `${cleanAddr}?${qs}` : cleanAddr;
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
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-semibold">
              <Flame className="w-3.5 h-3.5 fill-primary text-primary" />
              <span>BCH BLAZE 2026 · Decentralized Identity Track ($500 PUSD)</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-amber-400 p-0.5 shadow-md shadow-primary/20">
                <div className="w-full h-full rounded-[14px] bg-surface flex items-center justify-center">
                  <AtSign className="w-6 h-6 text-primary" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink flex items-center gap-2">
                  <span>UserLink</span>
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-surface-2 text-ink-2 border border-line">
                    v1.1
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-primary font-bold">
                  {isEs
                    ? 'Identidad Soberana & Pagos en Bitcoin Cash por @usuario (BCH ⇄ Nostr)'
                    : 'Self-Sovereign Identity & Bitcoin Cash Payments by @handle (BCH ⇄ Nostr)'}
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-ink-2 leading-relaxed">
              {isEs
                ? 'Vincula criptográficamente tu @usuario e identidad de Nostr a tu dirección Bitcoin Cash mediante firmas Bitcoin Signed Message + BIP-340 Schnorr, sin custodia, sin gas y verificable en relays públicos.'
                : 'Cryptographically bind your human username and Nostr identity to a Bitcoin Cash address using Bitcoin Signed Message + BIP-340 Schnorr proofs — non-custodial, zero gas, and independently verifiable across global relays.'}
            </p>
          </div>

          {/* Quick Header Badges & Actions */}
          <div className="flex flex-wrap lg:flex-col items-start lg:items-end gap-2.5 shrink-0">
            {/* Mainnet / Chipnet Network Toggle Pill */}
            <div className="inline-flex items-center p-1 rounded-xl bg-surface-2 border border-line text-xs font-bold shadow-sm">
              <button
                type="button"
                onClick={() => handleSelectNetwork('mainnet')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  isMainnet
                    ? 'bg-primary text-black font-extrabold shadow-sm'
                    : 'text-ink-2 hover:text-ink'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isMainnet ? 'bg-black animate-pulse' : 'bg-primary'}`} />
                <span>BCH Mainnet</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectNetwork('testnet')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  !isMainnet
                    ? 'bg-primary text-black font-extrabold shadow-sm'
                    : 'text-ink-2 hover:text-ink'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${!isMainnet ? 'bg-black animate-pulse' : 'bg-ink-3'}`} />
                <span>Chipnet Testnet</span>
              </button>
            </div>

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
              <div className="px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/30 text-xs font-semibold text-primary flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span>
                  {bchWallet.provider || 'BCH Wallet'}: {formatAddress(convertCashAddressNetwork(bchWallet.address, !isMainnet, false))}
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={onConnectBch}
                className="ui-btn-secondary ui-btn-sm text-xs font-semibold flex items-center gap-1.5"
              >
                <Wallet className="w-3.5 h-3.5 text-primary" />
                <span>{isEs ? 'Conectar Billetera BCH' : 'Connect BCH Wallet'}</span>
              </button>
            )}

            {/* Dynamic Relay Status */}
            <div className="text-[11px] font-mono text-ink-3 flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  onlineRelayCount === null
                    ? 'bg-amber-500 animate-pulse'
                    : onlineRelayCount > 0
                    ? 'bg-emerald-500'
                    : 'bg-rose-500'
                }`}
              />
              <span>
                {onlineRelayCount === null
                  ? isEs
                    ? 'Probando relays Nostr...'
                    : 'Probing Nostr relays...'
                  : isEs
                  ? `Relays Nostr: ${onlineRelayCount}/${USERLINK_RELAYS.length} Online`
                  : `Nostr Relays: ${onlineRelayCount}/${USERLINK_RELAYS.length} Online`}
              </span>
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
          <User className="w-3.5 h-3.5 text-primary" />
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
          <Zap className="w-3.5 h-3.5 text-primary" />
          <span>{isEs ? '2. Resolver y Pagar' : '2. Resolve & Pay'}</span>
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
          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
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
          <span>{isEs ? '5. Especificación Técnica' : '5. Technical Spec'}</span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: USERLINK PASSPORT & BINDING SUITE
          ========================================================================= */}
      {activeTab === 'card' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: PASSPORT CARD */}
          <div className="lg:col-span-5 space-y-4">
            <div className="relative group overflow-hidden rounded-3xl p-6 sm:p-7 bg-gradient-to-br from-surface via-surface-2 to-surface border-2 border-primary/35 shadow-xl shadow-primary/10 transition-all">
              <div className="absolute top-0 right-0 w-44 h-44 bg-gradient-to-bl from-primary/20 via-amber-500/5 to-transparent rounded-bl-full pointer-events-none" />

              {/* Card Header */}
              <div className="flex items-center justify-between pb-5 border-b border-line/60">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-amber-400 p-0.5 shadow-sm">
                    <div className="w-full h-full rounded-[14px] bg-surface flex items-center justify-center text-lg font-black text-primary uppercase">
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
                    <div className="text-[11px] text-ink-3 font-mono">
                      {isEs ? 'Identificador Nostr:' : 'Nostr Handle:'} @{cleanHandle}
                    </div>
                  </div>
                </div>

                <div className="px-2.5 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-[11px] font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span>{isMainnet ? 'BCH Mainnet' : 'Chipnet ID'}</span>
                </div>
              </div>

              {/* Edit Handle Dropdown */}
              {isEditingHandle && (
                <div className="my-3 p-3 rounded-xl bg-surface border border-line space-y-2">
                  <div className="text-xs font-bold text-ink">
                    {isEs ? 'Personalizar Nombre de Usuario:' : 'Customize Username Handle:'}
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-ink-3 font-bold">@</span>
                      <input
                        type="text"
                        value={tempHandleInput}
                        onChange={(e) => setTempHandleInput(e.target.value)}
                        placeholder="myuser"
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
                    <div className="text-[10px] uppercase font-bold text-primary flex items-center gap-1.5">
                      <Wallet className="w-3 h-3" />
                      <span>
                        Bitcoin Cash ({isMainnet ? 'Mainnet' : 'Chipnet'}) ·{' '}
                        {bchSigningMode === 'wallet'
                          ? bchWallet?.provider || 'WC2 Wallet'
                          : isEs
                          ? 'Par Soberano Local'
                          : 'Local Sovereign Key'}
                      </span>
                    </div>
                    <div className="text-xs font-mono text-ink truncate select-all">
                      {effectiveBchAddress}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(effectiveBchAddress, 'card_bch')}
                    className="p-1.5 rounded-lg hover:bg-surface-2 text-ink-3 hover:text-ink transition-colors shrink-0 cursor-pointer"
                    title="Copy CashAddress"
                  >
                    {copiedKey === 'card_bch' ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Proof 2: Nostr */}
                <div className="p-3 rounded-2xl bg-surface border border-line flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase font-bold text-amber-500 flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      <span>
                        Nostr Protocol (BIP-340){nostrKeys?.isExtension ? ' · NIP-07' : ''}
                      </span>
                    </div>
                    <div className="text-xs font-mono text-ink truncate select-all">
                      {nostrKeys?.npub || (isEs ? 'Generando...' : 'Generating...')}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(nostrKeys?.npub || '', 'card_npub')}
                    className="p-1.5 rounded-lg hover:bg-surface-2 text-ink-3 hover:text-ink transition-colors shrink-0 cursor-pointer"
                    title="Copy npub"
                  >
                    {copiedKey === 'card_npub' ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
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
                  <QrCode className="w-3.5 h-3.5 text-primary" />
                  <span>{isEs ? 'Ver Código QR' : 'Show QR Code'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('pay');
                    setPayTarget(publishedEvent ? `@${cleanHandle}` : 'myuser@bliquid.xyz');
                  }}
                  className="ui-btn-secondary ui-btn-sm text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5 text-primary fill-primary" />
                  <span>{isEs ? 'Probar Pago' : 'Test Payment'}</span>
                </button>
              </div>

              {/* Security Seal */}
              <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between text-[11px] text-ink-3">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                  <span>{isEs ? 'Sin Custodia · Sin Gas' : 'Non-Custodial · Zero Gas'}</span>
                </span>
                <span className="font-mono text-[10px]">BSM ECDSA ⇄ BIP-340</span>
              </div>
            </div>

            {/* QR Modal */}
            <AnimatePresence>
              {showQrModal && (
                <div
                  onClick={() => setShowQrModal(false)}
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-surface border border-line rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl relative"
                  >
                    <button
                      type="button"
                      onClick={() => setShowQrModal(false)}
                      className="absolute top-4 right-4 p-1 rounded-full hover:bg-surface-2 text-ink-3 hover:text-ink transition-colors cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>

                    <div className="text-center space-y-1">
                      <div className="text-base font-extrabold text-ink">@{cleanHandle}</div>
                      <div className="text-[10px] font-mono text-primary font-bold">
                        {isMainnet ? 'Bitcoin Cash Mainnet' : 'Chipnet Testnet'}
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white border border-line flex items-center justify-center">
                      {qrDataUrl ? (
                        <img src={qrDataUrl} alt="CashAddress QR" className="w-52 h-52 object-contain" />
                      ) : (
                        <div className="w-52 h-52 flex items-center justify-center text-xs text-gray-400">
                          {isEs ? 'Generando QR...' : 'QR Loading...'}
                        </div>
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
            {/* WizardConnect transparency notice when connected wallet lacks off-chain `bch_signMessage` */}
            {bchWallet?.address && !walletCanSignMessage && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2">
                <div className="flex items-start gap-2 font-bold text-amber-500">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    {isEs
                      ? `${bchWallet.provider || 'Paytaca'} (${bchWallet.source === 'wizard' ? 'WizardConnect' : 'Modo lectura'}) no soporta firma off-chain bch_signMessage`
                      : `${bchWallet.provider || 'Paytaca'} (${bchWallet.source === 'wizard' ? 'WizardConnect' : 'Read-only'}) does not expose off-chain bch_signMessage`}
                  </span>
                </div>
                <p className="text-ink-2 leading-relaxed">
                  {isEs
                    ? 'Para mantener integridad criptográfica del 100% (donde hash160(pubkey) coincida exactamente con la dirección BCH firmada), actualmente se usa tu Par Soberano Local para generar una firma Bitcoin Signed Message real. Si deseas firmar directamente desde tu billetera móvil, conecta Cashonize / WalletConnect V2 (bch_signMessage).'
                    : 'To guarantee 100% cryptographic integrity (where hash160(pubkey) strictly matches the signed CashAddress), UserLink uses your Local Sovereign Keypair to produce an authentic Bitcoin Signed Message signature. Connect via Cashonize / WalletConnect V2 (bch_signMessage) to sign with an external wallet.'}
                </p>
                <button
                  type="button"
                  onClick={onConnectBch}
                  className="ui-btn-secondary ui-btn-sm text-xs font-bold"
                >
                  {isEs ? 'Cambiar a Cashonize / WC2 BCH' : 'Switch to Cashonize / WC2 BCH'}
                </button>
              </div>
            )}

            {/* Step 1: Dual Identity Engines */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* BCH Card */}
              <div className="p-5 rounded-2xl bg-surface border border-line space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5" />
                    <span>Bitcoin Cash ({isMainnet ? 'Mainnet' : 'Chipnet'})</span>
                  </span>
                  {bchSigningMode === 'local' && (
                    <button
                      type="button"
                      onClick={handleRegenerateBchDemo}
                      className="text-[10px] text-ink-3 hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
                      title={isEs ? 'Generar nuevo par secp256k1 local' : 'New local secp256k1 pair'}
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>{isEs ? 'Nuevo par' : 'New pair'}</span>
                    </button>
                  )}
                </div>

                {/* Explicit Mode Toggle if external wallet supports `bch_signMessage` */}
                {walletCanSignMessage && (
                  <div className="flex gap-1 p-0.5 rounded-lg bg-surface-2 border border-line text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => { setBchSigningMode('wallet'); resetActiveProofs(); }}
                      className={`flex-1 py-1 rounded-md cursor-pointer transition-colors ${
                        bchSigningMode === 'wallet' ? 'bg-primary text-black' : 'text-ink-2 hover:text-ink'
                      }`}
                    >
                      {bchWallet?.provider || 'WC2 Wallet'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setBchSigningMode('local'); resetActiveProofs(); }}
                      className={`flex-1 py-1 rounded-md cursor-pointer transition-colors ${
                        bchSigningMode === 'local' ? 'bg-primary text-black' : 'text-ink-2 hover:text-ink'
                      }`}
                    >
                      {isEs ? 'Par Local' : 'Local Key'}
                    </button>
                  </div>
                )}

                <div className="p-2.5 rounded-xl bg-surface-2 border border-line space-y-1">
                  <div className="text-[10px] text-ink-3 uppercase font-bold">CashAddress</div>
                  <div className="text-xs font-mono text-ink break-all select-all">
                    {effectiveBchAddress}
                  </div>
                </div>

                <div className="text-[11px] text-ink-3 leading-snug">
                  {bchSigningMode === 'wallet'
                    ? isEs
                      ? `Firmará directamente en ${bchWallet?.provider || 'tu wallet'} vía bch_signMessage (sin exponer claves).`
                      : `Signs directly inside ${bchWallet?.provider || 'your wallet'} via bch_signMessage (private key stays in wallet).`
                    : isEs
                    ? `Clave local secp256k1 vinculada exactamente a esta dirección en ${isMainnet ? 'Mainnet' : 'Chipnet'}.`
                    : `Local secp256k1 keypair mathematically bound to this ${isMainnet ? 'Mainnet' : 'Chipnet'} CashAddress.`}
                </div>
              </div>

              {/* Nostr Card */}
              <div className="p-5 rounded-2xl bg-surface border border-line space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" />
                    <span>Nostr (Schnorr)</span>
                  </span>
                  <div className="flex items-center gap-2">
                    {hasNip07Extension && !useNip07 && (
                      <button
                        type="button"
                        onClick={handleConnectNip07}
                        className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                      >
                        NIP-07
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleRegenerateNostr}
                      className="text-[10px] text-ink-3 hover:text-amber-500 transition-colors flex items-center gap-1 cursor-pointer"
                      title={isEs ? 'Generar nuevo par Nostr' : 'Generate new Nostr keypair'}
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>{isEs ? 'Nueva' : 'New'}</span>
                    </button>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-surface-2 border border-line space-y-1">
                  <div className="text-[10px] text-ink-3 uppercase font-bold flex items-center justify-between">
                    <span>npub {nostrKeys?.isExtension ? '(NIP-07)' : ''}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(nostrKeys?.npub || '', 'npub_right')}
                      className="hover:text-primary transition-colors cursor-pointer"
                    >
                      {copiedKey === 'npub_right' ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  <div className="text-xs font-mono text-ink break-all select-all">
                    {nostrKeys?.npub || (isEs ? 'Generando...' : 'Generating...')}
                  </div>
                </div>

                <div className="text-[11px] text-ink-3 leading-snug">
                  {nostrKeys?.isExtension
                    ? isEs
                      ? 'Conectado vía extensión NIP-07: tus claves privadas permanecen en tu extensión.'
                      : 'Connected via NIP-07 extension: your nsec never leaves the extension.'
                    : isEs
                    ? 'Generada localmente en tu navegador con curva BIP-340. Tu clave privada nunca se envía a servidores.'
                    : 'Generated client-side via BIP-340. Your private key never leaves the browser.'}
                </div>
              </div>
            </div>

            {/* Step 2: Bind & Broadcast Action Panel */}
            <div className="p-6 rounded-3xl bg-surface border border-line space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-ink flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-primary" />
                    <span>{isEs ? 'Vincular y Publicar en Relays Nostr' : 'Bind & Broadcast to Nostr Relays'}</span>
                  </h3>
                  <p className="text-xs text-ink-2">
                    {isEs
                      ? `Firma la atestación dual (Bitcoin Signed Message + Schnorr BIP-340) en ${isMainnet ? 'BCH Mainnet' : 'Chipnet'} y la publica en 4 relays reales.`
                      : `Dual-signs attestation (Bitcoin Signed Message + Schnorr BIP-340) on ${isMainnet ? 'BCH Mainnet' : 'Chipnet'} and publishes to 4 live relays.`}
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

              {publishError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{publishError}</span>
                </div>
              )}

              {/* Live Relays Tracker (Genuine awaited OK acks) */}
              {publishLogs.length > 0 && (
                <div className="p-4 rounded-2xl bg-surface-2 border border-line space-y-2.5 animate-fade-in">
                  <div className="text-[11px] font-bold text-ink-2 uppercase tracking-wider flex items-center justify-between">
                    <span>{isEs ? 'Confirmación Real de Relays:' : 'Live Relay Acknowledgements:'}</span>
                    <span className="text-[10px] font-mono text-primary font-bold">Kind 30078 · NIP-01 / NIP-78</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {publishLogs.map((log) => (
                      <div
                        key={log.relay}
                        className="p-2.5 rounded-xl bg-surface border border-line flex items-center justify-between text-xs font-mono"
                      >
                        <span className="text-ink truncate max-w-[155px]">{log.relay.replace('wss://', '')}</span>
                        {log.status === 'pending' && (
                          <span className="text-primary text-[11px] flex items-center gap-1 font-bold">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            <span>{isEs ? 'Enviando...' : 'Publishing...'}</span>
                          </span>
                        )}
                        {log.status === 'ok' && (
                          <span className="text-emerald-500 text-[11px] font-bold flex items-center gap-1">
                            <CheckCheck className="w-3.5 h-3.5" />
                            <span>
                              {isEs ? 'Indexado' : 'Indexed'} ({log.latency}ms)
                            </span>
                          </span>
                        )}
                        {log.status === 'error' && (
                          <span className="text-rose-500 text-[11px] font-bold flex items-center gap-1">
                            <span>{isEs ? 'Sin respuesta' : 'Timeout'}</span>
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Published Result Summary */}
              {publishedEvent && (
                <div className="p-4 rounded-2xl bg-primary/10 border border-primary/30 text-primary space-y-2 animate-fade-in">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 font-extrabold text-sm text-primary">
                      <CheckCircle2 className="w-5 h-5" />
                      <span>
                        {publishedEvent.indexedCount > 0
                          ? isEs
                            ? `¡Identidad Vinculada en ${publishedEvent.indexedCount}/${USERLINK_RELAYS.length} Relays!`
                            : `Identity Bound on ${publishedEvent.indexedCount}/${USERLINK_RELAYS.length} Relays!`
                          : isEs
                          ? 'Evento Firmado (Sin confirmación de relay)'
                          : 'Event Signed (No relay confirmation)'}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-500 font-bold">
                      BSM + Schnorr Verified ✓
                    </span>
                  </div>

                  <div className="text-xs text-ink-2 space-y-1 font-mono pt-1">
                    <div>
                      <span className="font-bold text-ink font-sans">Handle: </span>
                      <span>@{cleanHandle}</span>
                    </div>
                    <div className="truncate">
                      <span className="font-bold text-ink font-sans">Event ID: </span>
                      <span className="select-all">{publishedEvent.event.id}</span>
                    </div>
                    <div className="truncate">
                      <span className="font-bold text-ink font-sans">Recovered BCH Pubkey: </span>
                      <span className="select-all">{publishedEvent.verified.bchPubkey}</span>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('pay');
                        setPayTarget(`@${cleanHandle}`);
                      }}
                      className="ui-btn-primary ui-btn-sm text-xs font-bold flex-1 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5 text-black" />
                      <span>{isEs ? 'Resolver y Probar Pago' : 'Resolve & Test Payment'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('verify');
                        setVerifyInput(nostrKeys?.npub || `@${cleanHandle}`);
                        handleVerify(nostrKeys?.npub);
                      }}
                      className="ui-btn-secondary ui-btn-sm text-xs font-semibold flex-1 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                      <span>{isEs ? 'Inspeccionar en Relays' : 'Inspect on Relays'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: REAL RESOLUTION & PAYMENT LAUNCHER
          ========================================================================= */}
      {activeTab === 'pay' && (
        <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
          <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-line space-y-6 shadow-sm">
            <div className="space-y-1 text-center max-w-lg mx-auto">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold mb-1">
                <Zap className="w-3.5 h-3.5" />
                <span>
                  {isEs
                    ? `Resolución Real P2P en Nostr & NIP-05 (${isMainnet ? 'Mainnet' : 'Chipnet'})`
                    : `Live Nostr & NIP-05 P2P Resolution (${isMainnet ? 'Mainnet' : 'Chipnet'})`}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-ink">
                {isEs ? 'Enviar Bitcoin Cash por Nombre de Usuario' : 'Send Bitcoin Cash via Human Username'}
              </h2>
              <p className="text-xs sm:text-sm text-ink-2">
                {isEs
                  ? 'Consulta en vivo los relays de Nostr o el registro NIP-05, valida las firmas criptográficas y genera el enlace BIP-21 listo para tu billetera BCH.'
                  : 'Queries live Nostr relays or NIP-05 registries, validates cryptographic proofs, and builds a ready-to-pay BIP-21 URI.'}
              </p>
            </div>

            {/* Quick sample buttons */}
            <div className="flex flex-wrap items-center justify-center gap-2 text-[11px]">
              <span className="text-ink-3">{isEs ? 'Probar rápido:' : 'Quick test:'}</span>
              <button
                type="button"
                onClick={() => setPayTarget('myuser@bliquid.xyz')}
                className="px-2.5 py-1 rounded-full bg-surface-2 hover:bg-surface-3 border border-line font-mono text-ink cursor-pointer"
              >
                myuser@bliquid.xyz
              </button>
              <button
                type="button"
                onClick={() => setPayTarget(`@${cleanHandle}`)}
                className="px-2.5 py-1 rounded-full bg-surface-2 hover:bg-surface-3 border border-line font-mono text-ink cursor-pointer"
              >
                @{cleanHandle}
              </button>
              {nostrKeys?.npub && (
                <button
                  type="button"
                  onClick={() => setPayTarget(nostrKeys.npub)}
                  className="px-2.5 py-1 rounded-full bg-surface-2 hover:bg-surface-3 border border-line font-mono text-ink cursor-pointer"
                >
                  npub1...{nostrKeys.npub.slice(-6)}
                </button>
              )}
            </div>

            {/* Input Form */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-ink flex items-center justify-between">
                  <span>{isEs ? 'Usuario (@handle), NIP-05 o npub:' : 'Username (@handle), NIP-05 or npub:'}</span>
                  <span className="text-[11px] text-ink-3 font-mono">
                    {isEs ? 'Ej: myuser@bliquid.xyz o @tuusuario' : 'e.g. myuser@bliquid.xyz'}
                  </span>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <AtSign className="w-3.5 h-3.5 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={payTarget}
                      onChange={(e) => setPayTarget(e.target.value)}
                      placeholder="myuser@bliquid.xyz"
                      className="ui-input pl-9 font-mono text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={isResolvingPay || !payTarget.trim()}
                    onClick={handleResolvePaymentTarget}
                    className="ui-btn-primary px-5 text-xs font-bold shrink-0 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isResolvingPay ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-black" />
                        <span>{isEs ? 'Resolviendo...' : 'Resolving...'}</span>
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

              {resolvePayError && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{resolvePayError}</span>
                </div>
              )}

              {/* Resolved Target Card */}
              {resolvedPayData && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-2xl bg-surface-2 border border-primary/30 space-y-3"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-bold text-xs uppercase">
                        {resolvedPayData.handle.replace('@', '').slice(0, 2)}
                      </div>
                      <div>
                        <div className="text-sm font-extrabold text-ink">{resolvedPayData.handle}</div>
                        <div className="text-[11px] text-ink-3 font-mono">{resolvedPayData.sourceLabel}</div>
                      </div>
                    </div>
                    {resolvedPayData.isVerified ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold border border-emerald-500/20">
                        ✓ {isEs ? 'Firma Criptográfica Verificada' : 'Crypto Proof Verified'}
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-bold border border-amber-500/20">
                        {isEs ? 'Solo NIP-05 (Sin evento en relay)' : 'NIP-05 Only (No relay event)'}
                      </span>
                    )}
                  </div>

                  <div className="p-2.5 rounded-xl bg-surface border border-line text-xs font-mono text-ink-2 break-all">
                    <div className="text-[10px] font-bold uppercase text-ink-3 font-sans pb-0.5">
                      {isEs ? 'CashAddress Resuelta:' : 'Resolved CashAddress:'}
                    </div>
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
                        step="0.001"
                        min="0"
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        className="ui-input text-base font-bold font-mono"
                      />
                      <div className="flex gap-1.5 shrink-0">
                        {['0.005', '0.01', '0.05'].map((amt) => (
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

                  {/* Real BIP-21 Launch + Explicit Demo Simulation */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                    <a
                      href={buildBip21Uri(resolvedPayData.bchAddress, payAmount, resolvedPayData.handle)}
                      className="ui-btn-primary ui-btn-lg text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-primary/20"
                    >
                      <Wallet className="w-4 h-4 text-black" />
                      <span>{isEs ? `Abrir Pago Real en Wallet (${payAmount} BCH)` : `Open Real BIP-21 Payment (${payAmount} BCH)`}</span>
                    </a>

                    <button
                      type="button"
                      disabled={isSendingPay}
                      onClick={handleSendSimulationPay}
                      className="ui-btn-secondary ui-btn-lg text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isSendingPay ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>{isEs ? 'Simulando...' : 'Simulating...'}</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5 text-primary" />
                          <span>{isEs ? 'Simular Flujo Demo (Sin Gasto)' : 'Run Demo Simulation (No Spend)'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Honest Demo Simulation Receipt */}
              {paySuccessData && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-5 rounded-2xl bg-primary/10 border-2 border-primary/40 text-primary space-y-3"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 font-extrabold text-sm text-primary">
                      <CheckCircle2 className="w-5 h-5" />
                      <span>{isEs ? 'Simulación de Pago UX Completada' : 'UX Payment Simulation Completed'}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-500 text-[10px] font-mono font-bold">
                      SANDBOX DEMO (OFF-CHAIN)
                    </span>
                  </div>

                  <div className="text-xs text-ink-2 space-y-1 font-mono pt-1">
                    <div>
                      <span className="font-bold text-ink font-sans">{isEs ? 'Destinatario:' : 'Recipient:'} </span>
                      <span>{paySuccessData.recipient}</span>
                    </div>
                    <div>
                      <span className="font-bold text-ink font-sans">{isEs ? 'Dirección Resuelta:' : 'Resolved Address:'} </span>
                      <span className="break-all select-all">{paySuccessData.bchAddress}</span>
                    </div>
                    <div>
                      <span className="font-bold text-ink font-sans">{isEs ? 'Monto Simulado:' : 'Simulated Amount:'} </span>
                      <span className="font-bold text-ink">{paySuccessData.amount} BCH</span>
                    </div>
                    <div className="truncate">
                      <span className="font-bold text-ink font-sans">Mock Demo Hash: </span>
                      <span className="select-all">{paySuccessData.txId}</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-ink-3 pt-1">
                    {isEs
                      ? 'Nota: Esta vista previa simula la experiencia de usuario sin gastar fondos reales. Usa el botón "Abrir Pago Real en Wallet" para enviar una transacción BIP-21 verdadera desde Paytaca o Cashonize.'
                      : 'Note: This preview demonstrates wallet UX without spending real funds. Use "Open Real BIP-21 Payment" to send an actual on-chain BCH transaction via Paytaca or Cashonize.'}
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: LIVE CRYPTOGRAPHIC NOSTR RELAY VERIFIER
          ========================================================================= */}
      {activeTab === 'verify' && (
        <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
          <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-line space-y-5 shadow-sm">
            <div>
              <h3 className="text-lg font-bold text-ink flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <span>{isEs ? 'Verificador Criptográfico en Relays Públicos' : 'Public Nostr Relays Verifier'}</span>
              </h3>
              <p className="text-xs sm:text-sm text-ink-2 mt-1">
                {isEs
                  ? 'Consulta los relays de Nostr y valida matemáticamente: 1) firma Schnorr BIP-340, 2) firma ECDSA / Bitcoin Signed Message, 3) propiedad CashAddress (hash160) y 4) enlace bidireccional.'
                  : 'Queries live Nostr relays and mathematically validates: 1) BIP-340 Schnorr signature, 2) Bitcoin Signed Message / ECDSA proof, 3) CashAddress hash160 ownership, and 4) bidirectional binding.'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={verifyInput}
                onChange={(e) => setVerifyInput(e.target.value)}
                placeholder={isEs ? 'Ingresa @usuario, npub1... o bitcoincash:qp...' : 'Enter @username, npub1... or bitcoincash:qp...'}
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
                    <span>{isEs ? 'Verificando...' : 'Verifying...'}</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-black" />
                    <span>{isEs ? 'Verificar en Relays' : 'Verify on Relays'}</span>
                  </>
                )}
              </button>
            </div>

            {verifyError && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{verifyError}</span>
              </div>
            )}

            {/* Honest Verification Result Card */}
            {verificationResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-5 sm:p-6 rounded-2xl bg-surface-2 border space-y-4 ${
                  verificationResult.isOverallValid ? 'border-emerald-500/40' : 'border-rose-500/50'
                }`}
              >
                <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-line">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-3 h-3 rounded-full ${
                        verificationResult.isOverallValid ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                      }`}
                    />
                    <span
                      className={`text-sm font-bold ${
                        verificationResult.isOverallValid ? 'text-emerald-500' : 'text-rose-500'
                      }`}
                    >
                      {verificationResult.isOverallValid
                        ? isEs
                          ? '✅ Enlace UserLink Criptográficamente Válido'
                          : '✅ Cryptographically Verified UserLink Identity'
                        : isEs
                        ? '❌ Verificación Fallida / Evento Alterado'
                        : '❌ Cryptographic Verification Failed / Tampered'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleRunTamperTest}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer transition-colors ${
                      isTamperedPreview
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                        : 'bg-surface border-line text-ink-2 hover:text-ink'
                    }`}
                  >
                    {isTamperedPreview
                      ? isEs
                        ? 'Restaurar Evento Real'
                        : 'Restore Authentic Event'
                      : isEs
                      ? '🧪 Probar Detección de Alteración'
                      : '🧪 Test Tamper Detection'}
                  </button>
                </div>

                {!verificationResult.isOverallValid && verificationResult.verificationNote && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-semibold flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>{verificationResult.verificationNote}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-surface border border-line space-y-1.5">
                    <div className="text-[10px] text-ink-3 uppercase font-bold flex items-center gap-1">
                      <User className="w-3 h-3 text-primary" />
                      <span>{isEs ? 'Identidad Nostr & Handle' : 'Nostr Identity & Handle'}</span>
                    </div>
                    <div className="font-bold text-ink text-sm">{verificationResult.handle}</div>
                    <div className="font-mono text-ink-2 text-[11px] truncate select-all">
                      {verificationResult.npub}
                    </div>
                    <div
                      className={`text-[11px] flex items-center gap-1 font-semibold pt-1 ${
                        verificationResult.isNostrSigValid ? 'text-emerald-500' : 'text-rose-500'
                      }`}
                    >
                      {verificationResult.isNostrSigValid ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                      <span>
                        {verificationResult.isNostrSigValid
                          ? 'BIP-340 Schnorr Signature Valid'
                          : 'BIP-340 Schnorr Signature INVALID'}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-surface border border-line space-y-1.5">
                    <div className="text-[10px] text-ink-3 uppercase font-bold flex items-center gap-1">
                      <Wallet className="w-3 h-3 text-primary" />
                      <span>Bitcoin Cash Address</span>
                    </div>
                    <div className="font-mono text-ink text-xs truncate select-all">
                      {verificationResult.bchAddress}
                    </div>
                    <div
                      className={`text-[11px] flex items-center gap-1 font-semibold pt-1 ${
                        verificationResult.isBchSigValid ? 'text-emerald-500' : 'text-rose-500'
                      }`}
                    >
                      {verificationResult.isBchSigValid ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                      <span>
                        {verificationResult.isBchSigValid
                          ? `BCH ${verificationResult.sigScheme === 'bitcoin-signed-message' ? 'Signed Message' : 'ECDSA'} Valid`
                          : 'BCH Signature INVALID'}
                      </span>
                    </div>
                    <div
                      className={`text-[11px] flex items-center gap-1 font-semibold ${
                        verificationResult.isAddressOwned && verificationResult.isMutualBindingValid
                          ? 'text-emerald-500'
                          : 'text-rose-500'
                      }`}
                    >
                      {verificationResult.isAddressOwned && verificationResult.isMutualBindingValid ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <X className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {verificationResult.isAddressOwned && verificationResult.isMutualBindingValid
                          ? isEs
                            ? 'Hash160(Pubkey) == CashAddress · Enlace Mutuo OK'
                            : 'Hash160(Pubkey) == CashAddress · Mutual Bind OK'
                          : isEs
                          ? 'Fallo en Propiedad o Enlace Mutuo'
                          : 'Address Ownership / Mutual Bind FAILED'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-surface border border-line text-[11px] font-mono space-y-1 text-ink-2 select-all">
                  <div className="text-[10px] uppercase font-bold text-ink font-sans pb-1">
                    {isEs ? 'Detalle de la Atestación en Relays:' : 'Relay Attestation Proof Payload:'}
                  </div>
                  <div className="truncate">Event ID: {verificationResult.event.id}</div>
                  {verificationResult.bchPubkey && (
                    <div className="truncate">Recovered BCH Pubkey: {verificationResult.bchPubkey}</div>
                  )}
                  <div>Timestamp: {new Date(verificationResult.timestamp * 1000).toUTCString()}</div>
                  <div>Kind: 30078 (NIP-78 + NIP-39 i-tag)</div>
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
                <span>{isEs ? 'Autenticación Soberana Challenge-Response' : 'Sovereign Challenge-Response Authentication'}</span>
              </h3>
              <p className="text-xs sm:text-sm text-ink-2 mt-1">
                {isEs
                  ? 'Demuestra cómo una dApp autentica al usuario firmando un reto único con Nostr y validando en vivo en los relays que esa identidad posee un enlace UserLink BCH válido, sin contraseñas ni bases de datos.'
                  : 'Demonstrates how any dApp authenticates a user by signing a fresh cryptographic challenge with Nostr and verifying their bound Bitcoin Cash identity directly on relays — zero passwords or central auth servers.'}
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
                  className="ui-btn-secondary ui-btn-sm text-xs font-semibold cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  <span>{isEs ? 'Generar Reto' : 'Generate Challenge'}</span>
                </button>
              </div>

              {authChallenge ? (
                <div className="p-2.5 rounded-xl bg-surface border border-line text-xs font-mono text-ink select-all break-all">
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
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-ink flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[11px] font-bold">2</span>
                    <span>{isEs ? 'Firmar y Validar Enlace en Relays' : 'Sign & Verify Relay Binding'}</span>
                  </span>
                  <button
                    type="button"
                    disabled={isAuthenticating}
                    onClick={handleSignChallenge}
                    className="ui-btn-primary ui-btn-sm text-xs font-bold text-black cursor-pointer disabled:opacity-50"
                  >
                    {isAuthenticating ? (
                      <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <Key className="w-3 h-3 mr-1" />
                    )}
                    <span>
                      {isAuthenticating
                        ? isEs
                          ? 'Validando...'
                          : 'Verifying...'
                        : isEs
                        ? 'Firmar y Autenticar'
                        : 'Sign & Authenticate'}
                    </span>
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

            {/* Step 3: Auth Verification Result */}
            {authResult && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`p-4 rounded-2xl border-2 space-y-2 ${
                  authResult.isChallengeSigValid && authResult.isIdentityBound
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-500'
                    : 'bg-amber-500/10 border-amber-500/40 text-amber-500'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-sm">
                  {authResult.isChallengeSigValid && authResult.isIdentityBound ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5" />
                  )}
                  <span>
                    {authResult.isChallengeSigValid && authResult.isIdentityBound
                      ? isEs
                        ? '¡Sesión Web3 y Dirección BCH Autenticadas!'
                        : 'Web3 Session & Bound BCH Identity Authenticated!'
                      : isEs
                      ? 'Reto Nostr Válido, pero Falta Publicar Enlace BCH'
                      : 'Nostr Challenge Valid, but BCH Binding Not Published Yet'}
                  </span>
                </div>

                <div className="text-xs text-ink-2 space-y-1 font-mono">
                  <div className="truncate">Nostr: {authResult.signerNpub}</div>
                  {authResult.linkedBchAddress ? (
                    <div className="truncate text-ink font-semibold">
                      BCH: {authResult.linkedBchAddress}
                    </div>
                  ) : (
                    <div className="font-sans text-amber-500 pt-1">
                      {isEs
                        ? 'Primero crea y publica tu enlace en la pestaña "1. Pasaporte UserLink" para vincular tu dirección Bitcoin Cash a esta sesión.'
                        : 'First create & publish your binding in Tab "1. UserLink Passport" to bind a Bitcoin Cash address to this identity.'}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 5: TECHNICAL SPECIFICATION (NIP-78 / NIP-39 / BSM)
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
                  ? 'Estándar abierto para vincular criptográficamente Bitcoin Cash (Bitcoin Signed Message / secp256k1) e identidades Nostr (BIP-340 Schnorr) mediante eventos reemplazables Kind 30078 (NIP-78) y tags indexables NIP-01/NIP-39 (#i, #t).'
                  : 'Open standard for cryptographically binding Bitcoin Cash (Bitcoin Signed Message / secp256k1) and Nostr (BIP-340 Schnorr) identities using replaceable Kind 30078 (NIP-78) events and indexed NIP-01/NIP-39 tags (#i, #t).'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-surface-2 border border-line space-y-2 font-mono text-xs text-ink-2">
              <div className="text-xs font-bold text-ink font-sans">
                {isEs ? 'Arquitectura Criptográfica Bidireccional:' : 'Bidirectional Cryptographic Architecture:'}
              </div>
              <div className="p-3 rounded-xl bg-surface border border-line overflow-x-auto whitespace-pre">
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

            <div className="space-y-2">
              <div className="text-xs font-bold text-ink">
                {isEs ? 'Estructura del Evento Nostr (Kind 30078):' : 'Nostr Event Schema (Kind 30078):'}
              </div>
              <div className="p-4 rounded-xl bg-surface-2 border border-line text-[11px] font-mono text-ink-2 overflow-x-auto whitespace-pre">
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
        </div>
      )}
    </div>
  );
}
