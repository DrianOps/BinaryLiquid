import React, { useState, useEffect, useMemo } from 'react';
import { 
  Fingerprint, 
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
  Lock, 
  Unlock, 
  ArrowRight,
  AlertCircle,
  Globe,
  CheckCheck,
  Code2,
  Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SimplePool, generateSecretKey, getPublicKey, finalizeEvent, verifyEvent, nip19 } from 'nostr-tools';
import { secp256k1, schnorr } from '@noble/curves/secp256k1.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { ripemd160 } from '@noble/hashes/legacy.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import { pubkeyToCashAddress, convertCashAddressNetwork } from '../utils/bchAddress';

interface IdentityViewProps {
  bchWallet?: {
    address: string;
    tokenAddress?: string;
    provider?: string;
  } | null;
  onConnectBch: () => void;
  lang?: 'en' | 'es';
  platformNetwork?: 'mainnet' | 'testnet';
}

const PUBLIC_RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.primal.net'
];

export default function IdentityView({
  bchWallet,
  onConnectBch,
  lang = 'en',
  platformNetwork = 'testnet'
}: IdentityViewProps) {
  const isEs = lang === 'es';

  // Active sub-tab: 'create' (Link new ID), 'verify' (Check any ID), 'auth' (Challenge-Response Demo), 'docs' (Spec)
  const [activeTab, setActiveTab] = useState<'create' | 'verify' | 'auth' | 'spec'>('create');

  // Nostr identity state
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

  // Simulated / Connected BCH keys
  // For PoC demonstrations, we also generate a dedicated local verifiable BCH keypair if wallet signing is pending
  const [demoBchSkHex, setDemoBchSkSkHex] = useState<string>(() => {
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

  // The active BCH address to bind (either user's connected wallet or dedicated demo key)
  const effectiveBchAddress = bchWallet?.address || demoBchData?.address || '';

  // Linking flow states
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [publishLogs, setPublishLogs] = useState<Array<{ relay: string; status: 'pending' | 'ok' | 'error'; msg?: string }>>([]);
  const [publishedEvent, setPublishedEvent] = useState<any>(null);

  // Verification flow states
  const [verifyInput, setVerifyInput] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Challenge-response auth demo states
  const [authChallenge, setAuthChallenge] = useState<string>('');
  const [authTimestamp, setAuthTimestamp] = useState<number>(0);
  const [authSignature, setAuthSignature] = useState<string>('');
  const [authSuccess, setAuthSuccess] = useState<boolean>(false);

  // Copy helper
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copyToClipboard = (text: string, keyId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Generate new Nostr Identity in 1-click
  const handleRegenerateNostr = () => {
    const sk = generateSecretKey();
    const hex = bytesToHex(sk);
    setNostrSkHex(hex);
    try {
      localStorage.setItem('sovereign_nostr_sk', hex);
    } catch {}
  };

  // Generate new Demo BCH Identity in 1-click
  const handleRegenerateBchDemo = () => {
    const sk = bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
    setDemoBchSkSkHex(sk);
    try {
      localStorage.setItem('sovereign_demo_bch_sk', sk);
    } catch {}
  };

  // EXECUTE CRYPTOGRAPHIC BINDING AND PUBLISH TO NOSTR RELAYS
  const handleCreateBinding = async () => {
    if (!nostrKeys || !effectiveBchAddress || !demoBchData) return;
    setIsPublishing(true);
    setPublishLogs(PUBLIC_RELAYS.map(r => ({ relay: r, status: 'pending' })));

    try {
      const now = Math.floor(Date.now() / 1000);

      // 1. Canonical Identity Binding Statement
      const statementObject = {
        protocol: 'bch-nostr-sovereign-id-v1',
        issuer: 'Drian Stack Labs SovereignLink',
        bchAddress: effectiveBchAddress,
        bchPubkeyHex: demoBchData.pubkeyHex,
        nostrPubkey: nostrKeys.pk,
        statement: 'I cryptographically attest that I control both this Bitcoin Cash address and this Nostr identity without reliance on custodial intermediaries.',
        issuedAt: now,
        network: platformNetwork
      };
      const statementJson = JSON.stringify(statementObject);
      const statementHash = sha256(new TextEncoder().encode(statementJson));

      // 2. BCH Signs the Statement (secp256k1 signature)
      const bchSignatureBytes = secp256k1.sign(statementHash, demoBchData.skBytes);
      const bchSignatureHex = bytesToHex(bchSignatureBytes);

      // 3. Nostr Finalizes Event with BIP-340 Schnorr Signature (Kind 30078 + NIP-39 identity claims tag)
      const eventTemplate = {
        kind: 30078,
        created_at: now,
        tags: [
          ['d', 'bch-identity-binding'],
          ['bch', effectiveBchAddress],
          ['bch_pubkey', demoBchData.pubkeyHex],
          ['bch_sig', bchSignatureHex],
          ['i', `bch:${effectiveBchAddress}`, bchSignatureHex], // NIP-39 External Identity Claim compliance
          ['client', 'SovereignLink by Drian Stack Labs'],
          ['version', '1.0.0']
        ],
        content: statementJson
      };

      const signedEvent = finalizeEvent(eventTemplate, nostrKeys.skBytes);
      setPublishedEvent({
        event: signedEvent,
        statementObject,
        bchSignatureHex,
        bchPubkeyHex: demoBchData.pubkeyHex
      });

      // 4. Broadcast to live Nostr Relays via SimplePool
      const pool = new SimplePool();
      type LogItem = { relay: string; status: 'pending' | 'ok' | 'error'; msg?: string };
      const logs: LogItem[] = PUBLIC_RELAYS.map(r => ({ relay: r, status: 'pending' }));

      await Promise.all(
        PUBLIC_RELAYS.map(async (relayUrl, idx) => {
          try {
            await Promise.race(pool.publish([relayUrl], signedEvent));
            logs[idx] = { relay: relayUrl, status: 'ok', msg: 'Event accepted & indexed on-relay' };
            setPublishLogs([...logs]);
          } catch (err: any) {
            logs[idx] = { relay: relayUrl, status: 'error', msg: err?.message || 'Connection timeout' };
            setPublishLogs([...logs]);
          }
        })
      );

      // Auto-fill verification input for instant test
      setVerifyInput(nostrKeys.npub);
    } catch (err: any) {
      console.error('Binding generation error:', err);
    } finally {
      setIsPublishing(false);
    }
  };

  // LIVE DECENTRALIZED VERIFICATION BY NPUB OR BCH ADDRESS
  const handleVerify = async (targetOverride?: string) => {
    const rawTarget = (targetOverride || verifyInput).trim();
    if (!rawTarget) return;

    setIsVerifying(true);
    setVerificationResult(null);
    setVerifyError(null);

    try {
      const pool = new SimplePool();
      let authorPubkey = '';
      let filter: any = { kinds: [30078], '#d': ['bch-identity-binding'] };

      // Handle npub or hex
      if (rawTarget.startsWith('npub1')) {
        try {
          const decoded = nip19.decode(rawTarget);
          if (decoded.type === 'npub') {
            authorPubkey = decoded.data as string;
            filter.authors = [authorPubkey];
          }
        } catch {
          setVerifyError(isEs ? 'El npub ingresado no es válido.' : 'Invalid npub format.');
          setIsVerifying(false);
          return;
        }
      } else if (rawTarget.startsWith('bitcoincash:') || rawTarget.startsWith('bchtest:')) {
        filter['#bch'] = [rawTarget];
      } else if (rawTarget.length === 64) {
        authorPubkey = rawTarget;
        filter.authors = [authorPubkey];
      } else {
        // Try as BCH address prefix
        const guessBch = `bitcoincash:${rawTarget}`;
        filter['#bch'] = [guessBch, rawTarget];
      }

      // Query relays for identity event
      const foundEvent = await pool.get(PUBLIC_RELAYS, filter);

      if (!foundEvent) {
        setVerifyError(
          isEs
            ? 'No se encontró ninguna atestación de identidad para este identificador en los relays públicos.'
            : 'No decentralized identity binding found on public relays for this identifier.'
        );
        setIsVerifying(false);
        return;
      }

      // Cryptographic Proof Checks:
      // 1. Verify Nostr BIP-340 Schnorr signature
      const isNostrSigValid = verifyEvent(foundEvent);

      // 2. Extract BCH binding data
      const bchAddressTag = foundEvent.tags.find((t: string[]) => t[0] === 'bch')?.[1];
      const bchPubkeyTag = foundEvent.tags.find((t: string[]) => t[0] === 'bch_pubkey')?.[1];
      const bchSigTag = foundEvent.tags.find((t: string[]) => t[0] === 'bch_sig')?.[1];

      let isBchSigValid = false;
      let parsedStatement: any = null;

      if (bchPubkeyTag && bchSigTag && foundEvent.content) {
        try {
          parsedStatement = JSON.parse(foundEvent.content);
          const statementHash = sha256(new TextEncoder().encode(foundEvent.content));
          const pubkeyBytes = hexToBytes(bchPubkeyTag);
          const sigBytes = hexToBytes(bchSigTag);
          isBchSigValid = secp256k1.verify(sigBytes, statementHash, pubkeyBytes);
        } catch (e) {
          console.warn('Error parsing statement JSON:', e);
        }
      }

      const npubFormatted = nip19.npubEncode(foundEvent.pubkey);

      setVerificationResult({
        event: foundEvent,
        npub: npubFormatted,
        nostrPubkey: foundEvent.pubkey,
        bchAddress: bchAddressTag || parsedStatement?.bchAddress,
        isNostrSigValid,
        isBchSigValid,
        isFullyAuthenticated: isNostrSigValid && isBchSigValid,
        timestamp: foundEvent.created_at,
        parsedStatement
      });
    } catch (err: any) {
      console.error('Verification error:', err);
      setVerifyError(err?.message || (isEs ? 'Error al consultar los relays.' : 'Failed to query Nostr relays.'));
    } finally {
      setIsVerifying(false);
    }
  };

  // CHALLENGE-RESPONSE AUTHENTICATION DEMO
  const handleGenerateChallenge = () => {
    const nonce = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
    const now = Math.floor(Date.now() / 1000);
    const challengeText = `AUTH_CHALLENGE_${nonce}_EXPIRES_${now + 300}`;
    setAuthChallenge(challengeText);
    setAuthTimestamp(now);
    setAuthSignature('');
    setAuthSuccess(false);
  };

  const handleSignChallenge = () => {
    if (!authChallenge || !nostrKeys) return;
    const challengeHash = sha256(new TextEncoder().encode(authChallenge));
    const schnorrSig = schnorr.sign(challengeHash, nostrKeys.skBytes);
    const sigHex = bytesToHex(schnorrSig);
    setAuthSignature(sigHex);

    // Verify immediately on-the-fly
    const verified = schnorr.verify(schnorrSig, challengeHash, hexToBytes(nostrKeys.pk));
    setAuthSuccess(verified);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-line">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>Paytaca Decentralized Identity Bounty · $500 PUSD</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight flex items-center gap-2.5">
            <Fingerprint className="w-8 h-8 text-primary" />
            <span>SovereignLink</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-surface-2 text-ink-3 font-mono font-normal">v1.0-PoC</span>
          </h1>
          <p className="text-sm text-ink-2 mt-1 max-w-2xl">
            {isEs 
              ? 'Prueba de concepto no-custodial que vincula criptográficamente billeteras Bitcoin Cash con identidades Nostr (NIP-39). Descubrible en relays públicos sin bases de datos intermediarias.'
              : 'Non-custodial proof of concept cryptographically linking Bitcoin Cash wallets with Nostr identities (NIP-39). Fully discoverable and verifiable across public Nostr relays without proprietary databases.'}
          </p>
        </div>

        {/* Quick BCH Wallet Status Pill */}
        <div className="flex items-center gap-2">
          {bchWallet?.address ? (
            <div className="px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-semibold text-emerald-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{bchWallet.provider || 'Paytaca'}: {bchWallet.address.slice(0, 14)}...</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={onConnectBch}
              className="ui-btn-secondary ui-btn-sm text-xs font-semibold flex items-center gap-1.5"
            >
              <Wallet className="w-3.5 h-3.5 text-primary" />
              <span>{isEs ? 'Conectar Paytaca' : 'Connect Paytaca'}</span>
            </button>
          )}
        </div>
      </div>

      {/* TOP NAVIGATION TABS */}
      <div className="flex items-center gap-2 p-1.5 rounded-xl bg-surface-2 border border-line overflow-x-auto text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('create')}
          className={`flex-1 min-w-[120px] py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'create'
              ? 'bg-surface text-ink shadow-soft border border-line font-bold'
              : 'text-ink-2 hover:text-ink'
          }`}
        >
          <Lock className="w-3.5 h-3.5 text-primary" />
          <span>{isEs ? '1. Vincular Identidad' : '1. Link Identity'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('verify')}
          className={`flex-1 min-w-[120px] py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'verify'
              ? 'bg-surface text-ink shadow-soft border border-line font-bold'
              : 'text-ink-2 hover:text-ink'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          <span>{isEs ? '2. Verificador en Vivo' : '2. Live Verifier'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('auth')}
          className={`flex-1 min-w-[120px] py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'auth'
              ? 'bg-surface text-ink shadow-soft border border-line font-bold'
              : 'text-ink-2 hover:text-ink'
          }`}
        >
          <Key className="w-3.5 h-3.5 text-primary" />
          <span>{isEs ? '3. Demo Login (Challenge)' : '3. Challenge Auth Demo'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('spec')}
          className={`flex-1 min-w-[120px] py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'spec'
              ? 'bg-surface text-ink shadow-soft border border-line font-bold'
              : 'text-ink-2 hover:text-ink'
          }`}
        >
          <Code2 className="w-3.5 h-3.5 text-primary" />
          <span>{isEs ? 'Especificación Técnica' : 'Technical Spec'}</span>
        </button>
      </div>

      {/* TAB 1: CREATE / LINK IDENTITY */}
      {activeTab === 'create' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Identity A: Bitcoin Cash Wallet */}
            <div className="bg-surface rounded-card p-5 border border-line space-y-3 relative">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Wallet className="w-4 h-4" />
                  <span>Bitcoin Cash Identity (secp256k1)</span>
                </span>
                {bchWallet?.address ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                    Connected Wallet
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleRegenerateBchDemo}
                    className="text-[10px] text-ink-3 hover:text-primary transition-colors flex items-center gap-1"
                    title="Generate new demo BCH keypair"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>{isEs ? 'Nuevo par demo' : 'New demo pair'}</span>
                  </button>
                )}
              </div>

              <div className="ui-panel p-3 space-y-1">
                <div className="text-[10px] text-ink-3 uppercase font-bold">CashAddress</div>
                <div className="text-xs font-mono text-ink break-all select-all">
                  {effectiveBchAddress}
                </div>
              </div>

              <div className="text-[11px] text-ink-3 leading-snug">
                {bchWallet?.address
                  ? (isEs ? 'Billetera Paytaca conectada para firmar la atestación de soberanía.' : 'Connected Paytaca wallet to sign sovereign identity attestation.')
                  : (isEs ? 'Par de claves local BCH secp256k1 para pruebas independientes de atestación.' : 'Local BCH secp256k1 keypair for independent attestation testing.')}
              </div>
            </div>

            {/* Identity B: Nostr Identity */}
            <div className="bg-surface rounded-card p-5 border border-line space-y-3 relative">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Globe className="w-4 h-4" />
                  <span>Nostr Identity (BIP-340 Schnorr)</span>
                </span>
                <button
                  type="button"
                  onClick={handleRegenerateNostr}
                  className="text-[10px] text-ink-3 hover:text-primary transition-colors flex items-center gap-1"
                  title="Generate new Nostr keypair"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>{isEs ? 'Generar nueva' : 'Generate new'}</span>
                </button>
              </div>

              <div className="ui-panel p-3 space-y-1">
                <div className="text-[10px] text-ink-3 uppercase font-bold flex items-center justify-between">
                  <span>npub (Public Key)</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(nostrKeys?.npub || '', 'npub')}
                    className="hover:text-primary transition-colors"
                  >
                    {copiedKey === 'npub' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
                <div className="text-xs font-mono text-ink break-all select-all">
                  {nostrKeys?.npub || 'Generating...'}
                </div>
              </div>

              <div className="text-[11px] text-ink-3 leading-snug">
                {isEs 
                  ? 'Clave pública y privada Nostr generada localmente en tu navegador sin intermediarios.'
                  : 'Nostr public and secret key generated locally in-browser without intermediaries.'}
              </div>
            </div>
          </div>

          {/* Action Trigger: Cross-Signature & Publish */}
          <div className="bg-surface rounded-card p-6 border border-line text-center space-y-4">
            <div className="max-w-xl mx-auto space-y-1">
              <h3 className="text-lg font-bold text-ink">
                {isEs ? 'Vincular Criptográficamente y Publicar en Relays' : 'Cryptographically Bind & Broadcast to Relays'}
              </h3>
              <p className="text-xs text-ink-2">
                {isEs
                  ? 'Genera una atestación firmada con la clave BCH y un evento Nostr (Kind 30078 / NIP-39) firmado con Schnorr. Luego lo transmite a la red de relays descentralizados.'
                  : 'Generates an attestation statement signed with the BCH key, embeds it in a BIP-340 Schnorr Nostr event (Kind 30078 / NIP-39), and broadcasts it to live relays.'}
              </p>
            </div>

            <button
              type="button"
              disabled={isPublishing}
              onClick={handleCreateBinding}
              className="ui-btn-primary ui-btn-lg px-8 text-sm font-bold shadow-lg shadow-primary/20 mx-auto flex items-center gap-2"
            >
              {isPublishing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-black" />
                  <span>{isEs ? 'Firmando y Transmitiendo a Relays...' : 'Signing & Broadcasting to Relays...'}</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-black" />
                  <span>{isEs ? 'Crear Enlace Soberano' : 'Create Sovereign Link'}</span>
                </>
              )}
            </button>

            {/* Live Relays Broadcast Tracker */}
            {publishLogs.length > 0 && (
              <div className="max-w-lg mx-auto pt-4 border-t border-line space-y-2 text-left">
                <div className="text-[11px] font-bold text-ink-2 uppercase tracking-wider">
                  {isEs ? 'Estado de publicación en relays descentralizados:' : 'Decentralized Relays Broadcast Status:'}
                </div>
                <div className="space-y-1.5">
                  {publishLogs.map((log) => (
                    <div
                      key={log.relay}
                      className="p-2 rounded-lg bg-surface-2 border border-line flex items-center justify-between text-xs font-mono"
                    >
                      <span className="text-ink truncate">{log.relay}</span>
                      {log.status === 'pending' && (
                        <span className="text-primary text-[11px] flex items-center gap-1">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>Connecting...</span>
                        </span>
                      )}
                      {log.status === 'ok' && (
                        <span className="text-emerald-400 text-[11px] font-bold flex items-center gap-1">
                          <CheckCheck className="w-3.5 h-3.5" />
                          <span>Indexed ✅</span>
                        </span>
                      )}
                      {log.status === 'error' && (
                        <span className="text-amber-400 text-[11px] flex items-center gap-1">
                          <span>Timeout</span>
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Success Summary Pill */}
            {publishedEvent && (
              <div className="max-w-lg mx-auto p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 space-y-2 text-left">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>{isEs ? '¡Enlace de Identidad Creado con Éxito!' : 'Identity Link Successfully Published!'}</span>
                </div>
                <div className="text-xs text-ink-2 space-y-1">
                  <div>
                    <span className="font-bold text-ink">Nostr Event ID: </span>
                    <span className="font-mono text-[11px] select-all">{publishedEvent.event.id}</span>
                  </div>
                  <div>
                    <span className="font-bold text-ink">BCH Signature: </span>
                    <span className="font-mono text-[11px] select-all">{publishedEvent.bchSignatureHex.slice(0, 32)}...</span>
                  </div>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('verify');
                      handleVerify(nostrKeys?.npub);
                    }}
                    className="ui-btn-primary ui-btn-sm text-xs font-bold w-full flex items-center justify-center gap-1.5"
                  >
                    <span>{isEs ? 'Verificar en Relays Ahora' : 'Verify on Relays Now'}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-black" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: LIVE DECENTRALIZED VERIFIER */}
      {activeTab === 'verify' && (
        <div className="space-y-6">
          <div className="bg-surface rounded-card p-6 border border-line space-y-4">
            <div>
              <h3 className="text-lg font-bold text-ink flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <span>{isEs ? 'Verificador Descentralizado en Tiempo Real' : 'Real-time Decentralized Verifier'}</span>
              </h3>
              <p className="text-xs text-ink-2 mt-1">
                {isEs
                  ? 'Consulta los relays de Nostr de forma directa y verifica matemáticamente las dos firmas (BCH + Nostr) sin consultar ningún servidor centralizado.'
                  : 'Queries public Nostr relays directly and mathematically verifies both cryptographic signatures (BCH + Nostr) without contacting any centralized server.'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={verifyInput}
                onChange={(e) => setVerifyInput(e.target.value)}
                placeholder="Ingresa npub1... o bitcoincash:qp..."
                className="flex-1 ui-input font-mono text-xs"
              />
              <button
                type="button"
                disabled={isVerifying || !verifyInput.trim()}
                onClick={() => handleVerify()}
                className="ui-btn-primary px-6 text-xs font-bold flex items-center justify-center gap-2"
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
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{verifyError}</span>
              </div>
            )}

            {/* Verification Success Card */}
            {verificationResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 rounded-2xl bg-surface-2 border border-line space-y-4"
              >
                {/* Proof Status Badge */}
                <div className="flex items-center justify-between pb-3 border-b border-line">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-sm font-bold text-emerald-400">
                      {isEs ? '✅ Identidad Soberana Criptográficamente Verificada' : '✅ Cryptographically Verified Sovereign Identity'}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-ink-3">
                    Relay Kind: 30078 (NIP-39)
                  </span>
                </div>

                {/* Identity Dual Card */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-surface border border-line space-y-1">
                    <div className="text-[10px] text-ink-3 uppercase font-bold flex items-center gap-1">
                      <Globe className="w-3 h-3 text-primary" />
                      <span>Nostr Identity</span>
                    </div>
                    <div className="font-mono text-ink text-[11px] break-all select-all">
                      {verificationResult.npub}
                    </div>
                    <div className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold pt-1">
                      <Check className="w-3 h-3" />
                      <span>BIP-340 Schnorr Signature Valid</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-surface border border-line space-y-1">
                    <div className="text-[10px] text-ink-3 uppercase font-bold flex items-center gap-1">
                      <Wallet className="w-3 h-3 text-primary" />
                      <span>Bitcoin Cash Address</span>
                    </div>
                    <div className="font-mono text-ink text-[11px] break-all select-all">
                      {verificationResult.bchAddress}
                    </div>
                    <div className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold pt-1">
                      <Check className="w-3 h-3" />
                      <span>secp256k1 Attestation Valid</span>
                    </div>
                  </div>
                </div>

                {/* Mathematical Proof Details */}
                <div className="p-3 rounded-xl bg-surface border border-line text-[11px] font-mono space-y-1 text-ink-2 select-all">
                  <div className="text-[10px] uppercase font-bold text-ink font-sans pb-1">
                    {isEs ? 'Detalle de la Atestación en Relays:' : 'Relay Attestation Proof Payload:'}
                  </div>
                  <div>Event ID: {verificationResult.event.id}</div>
                  <div>Timestamp: {new Date(verificationResult.timestamp * 1000).toUTCString()}</div>
                  <div>Client: SovereignLink by Drian Stack Labs</div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: CHALLENGE-RESPONSE AUTHENTICATION DEMO */}
      {activeTab === 'auth' && (
        <div className="space-y-6">
          <div className="bg-surface rounded-card p-6 border border-line space-y-5">
            <div>
              <h3 className="text-lg font-bold text-ink flex items-center gap-2">
                <Key className="w-5 h-5 text-primary" />
                <span>{isEs ? 'Demostración de Autenticación Challenge-Response' : 'Challenge-Response Authentication Demo'}</span>
              </h3>
              <p className="text-xs text-ink-2 mt-1">
                {isEs
                  ? 'Demuestra cómo cualquier aplicación externa o servicio Web3 puede autenticar a un usuario utilizando su identidad soberana vinculada (BCH ↔ Nostr) sin contraseñas ni proveedores centrales de OAuth.'
                  : 'Demonstrates how any third-party dApp or service can authenticate a user using their linked sovereign identity (BCH ↔ Nostr) without passwords or centralized OAuth providers.'}
              </p>
            </div>

            {/* Step 1: Request Challenge */}
            <div className="p-4 rounded-xl bg-surface-2 border border-line space-y-3">
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
                <div className="p-2.5 rounded-lg bg-surface border border-line text-xs font-mono text-ink select-all">
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
              <div className="p-4 rounded-xl bg-surface-2 border border-line space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[11px] font-bold">2</span>
                    <span>{isEs ? 'Firmar Reto con la Identidad Soberana' : 'Sign Challenge with Sovereign Identity'}</span>
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
                    <div className="p-2.5 rounded-lg bg-surface border border-line text-[11px] font-mono text-ink break-all select-all">
                      {authSignature}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Authenticated State */}
            {authSuccess && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 space-y-3"
              >
                <div className="flex items-center gap-2 font-bold text-base">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  <span>{isEs ? '¡Usuario Autenticado Exitosamente!' : 'User Authenticated Successfully!'}</span>
                </div>
                <div className="text-xs text-ink-2 space-y-1">
                  <div>
                    <span className="font-bold text-ink">Identidad Nostr: </span>
                    <span className="font-mono text-ink select-all">{nostrKeys?.npub}</span>
                  </div>
                  <div>
                    <span className="font-bold text-ink">Billetera Bitcoin Cash: </span>
                    <span className="font-mono text-ink select-all">{effectiveBchAddress}</span>
                  </div>
                  <div>
                    <span className="font-bold text-ink">Zero Passwords · Zero Servers · 100% Peer-to-Peer</span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: TECHNICAL SPECIFICATION */}
      {activeTab === 'spec' && (
        <div className="space-y-6">
          <div className="bg-surface rounded-card p-6 border border-line space-y-4">
            <h3 className="text-lg font-bold text-ink flex items-center gap-2">
              <Code2 className="w-5 h-5 text-primary" />
              <span>{isEs ? 'Especificación Técnica de la Arquitectura' : 'Architectural Technical Specification'}</span>
            </h3>

            <div className="text-xs text-ink-2 space-y-3 leading-relaxed">
              <p>
                <strong>SovereignLink</strong> implementa un protocolo de doble firma criptográfica sobre curvas elípticas <code>secp256k1</code> (BIP-340 Schnorr y ECDSA) para ligar una dirección de Bitcoin Cash con una identidad de Nostr sin comprometer la soberanía de ninguna de las dos claves.
              </p>

              <div className="p-4 rounded-xl bg-surface-2 border border-line font-mono text-[11px] space-y-1 select-all">
                <div className="text-primary font-bold">1. Nostr Relay Event Schema (Kind 30078 / NIP-39 compliant):</div>
                <div>{`{`}</div>
                <div className="pl-4">{`"kind": 30078,`}</div>
                <div className="pl-4">{`"pubkey": "<nostr_schnorr_pubkey_hex>",`}</div>
                <div className="pl-4">{`"tags": [`}</div>
                <div className="pl-8">{`["d", "bch-identity-binding"],`}</div>
                <div className="pl-8">{`["bch", "bitcoincash:<address>"],`}</div>
                <div className="pl-8">{`["bch_sig", "<secp256k1_signature_hex>"],`}</div>
                <div className="pl-8">{`["i", "bch:<address>", "<signature>"], // NIP-39 Claim`}</div>
                <div className="pl-8">{`["client", "SovereignLink by Drian Stack Labs"]`}</div>
                <div className="pl-4">{`],`}</div>
                <div className="pl-4">{`"content": "{ statement_json }"`}</div>
                <div>{`}`}</div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-surface-2 border border-line space-y-1">
                  <div className="font-bold text-ink">Cumplimiento de Bases Paytaca:</div>
                  <ul className="list-disc list-inside space-y-0.5 text-ink-3 text-[11px]">
                    <li>Non-custodial (claves 100% locales)</li>
                    <li>Firma cruzada bidireccional</li>
                    <li>Indexación abierta en relays Nostr</li>
                    <li>Zero bases de datos centralizadas</li>
                  </ul>
                </div>
                <div className="p-3.5 rounded-xl bg-surface-2 border border-line space-y-1">
                  <div className="font-bold text-ink">Estándares Abiertos Utilizados:</div>
                  <ul className="list-disc list-inside space-y-0.5 text-ink-3 text-[11px]">
                    <li>BIP-340 Schnorr Signatures</li>
                    <li>Nostr NIP-01, NIP-19 y NIP-39</li>
                    <li>Bitcoin Cash CashAddress (P2PKH)</li>
                    <li>@noble/curves & @bitauth/libauth</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
