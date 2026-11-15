import crypto from 'crypto';
import { ethers } from 'ethers';
import { parseCashAddress, expandBchAddressVariants } from '../utils/bchAddress.js';

const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');
const BASE58_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

class AuthService {
  constructor() {
    const baseMaterial =
      process.env.SESSION_HMAC_SECRET ||
      crypto.randomBytes(32).toString('hex');

    if (!process.env.SESSION_HMAC_SECRET && process.env.NODE_ENV === 'production') {
      console.warn('[AuthService] ⚠️ SESSION_HMAC_SECRET no definido en .env; usando secreto efímero por proceso.');
    }

    this.hmacSecret = crypto
      .createHash('sha256')
      .update(`BinaryLiquidAuthV1:${baseMaterial}`)
      .digest();
    this.usedChallenges = new Map();
  }

  _b64UrlEncode(input) {
    return Buffer.from(input).toString('base64url');
  }

  _b64UrlDecode(str) {
    return Buffer.from(str, 'base64url');
  }

  _signHmac(payloadB64) {
    return crypto.createHmac('sha256', this.hmacSecret).update(payloadB64).digest('base64url');
  }

  _verifySignedToken(token) {
    if (!token || typeof token !== 'string') return null;
    const parts = token.trim().split('.');
    if (parts.length !== 2) return null;
    const [payloadB64, sigB64] = parts;
    if (!payloadB64 || !sigB64) return null;

    const expectedSig = this._signHmac(payloadB64);
    const sigBuf = Buffer.from(sigB64);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    try {
      return JSON.parse(this._b64UrlDecode(payloadB64).toString('utf8'));
    } catch {
      return null;
    }
  }

  _encodeCompactUint(n) {
    if (n < 0xfd) return Buffer.from([n]);
    if (n <= 0xffff) {
      const b = Buffer.alloc(3);
      b[0] = 0xfd;
      b.writeUInt16LE(n, 1);
      return b;
    }
    const b = Buffer.alloc(5);
    b[0] = 0xfe;
    b.writeUInt32LE(n, 1);
    return b;
  }

  _bitcoinMessageDigest(message) {
    const prefix = Buffer.from('\x18Bitcoin Signed Message:\n', 'utf8');
    const msgBuf = Buffer.from(String(message), 'utf8');
    const lenBuf = this._encodeCompactUint(msgBuf.length);
    const payload = Buffer.concat([prefix, lenBuf, msgBuf]);
    const h1 = crypto.createHash('sha256').update(payload).digest();
    return crypto.createHash('sha256').update(h1).digest();
  }

  _hash160(pubKeyBytes) {
    const sha = crypto.createHash('sha256').update(pubKeyBytes).digest();
    return crypto.createHash('ripemd160').update(sha).digest();
  }

  verifyEvmSignature(address, message, signature) {
    try {
      const recovered = ethers.verifyMessage(message, signature);
      return recovered.toLowerCase() === String(address).trim().toLowerCase();
    } catch {
      return false;
    }
  }

  verifySolanaSignature(address, message, signature) {
    try {
      const cleanAddr = String(address).trim();
      if (!BASE58_REGEX.test(cleanAddr)) return false;

      let pubRaw = BigInt(ethers.decodeBase58(cleanAddr)).toString(16);
      if (pubRaw.length % 2 !== 0) pubRaw = `0${pubRaw}`;
      if (pubRaw.length > 64) return false;
      const pub32 = Buffer.from(pubRaw.padStart(64, '0'), 'hex');

      const sigStr = String(signature || '').trim();
      let sigBuf;
      if (/^[0-9a-fA-F]{128}$/.test(sigStr.replace(/^0x/i, ''))) {
        sigBuf = Buffer.from(sigStr.replace(/^0x/i, ''), 'hex');
      } else if (/^[1-9A-HJ-NP-Za-km-z]{80,96}$/.test(sigStr)) {
        const decHex = BigInt(ethers.decodeBase58(sigStr)).toString(16).padStart(128, '0');
        sigBuf = Buffer.from(decHex.slice(-128), 'hex');
      } else {
        sigBuf = Buffer.from(sigStr, 'base64');
      }
      if (sigBuf.length !== 64) return false;

      const spki = Buffer.concat([ED25519_SPKI_PREFIX, pub32]);
      const pubKeyObj = crypto.createPublicKey({ key: spki, format: 'der', type: 'spki' });
      return crypto.verify(null, Buffer.from(message, 'utf8'), pubKeyObj, sigBuf);
    } catch {
      return false;
    }
  }

  verifyBchSignature(address, message, signature) {
    try {
      const parsed = parseCashAddress(address);
      if (!parsed) return false;

      const bc = parsed.bytecode;
      // Standard P2PKH: OP_DUP (0x76) OP_HASH160 (0xa9) PUSH20 (0x14) <20 bytes> OP_EQUALVERIFY (0x88) OP_CHECKSIG (0xac)
      if (bc.length !== 25 || bc[0] !== 0x76 || bc[1] !== 0xa9 || bc[2] !== 0x14 || bc[23] !== 0x88 || bc[24] !== 0xac) {
        return false;
      }
      const expectedHash160 = Buffer.from(bc.slice(3, 23));
      const sigStr = String(signature || '').trim();

      let sigBuf;
      const strippedHex = sigStr.replace(/^0x/i, '');
      if (/^[0-9a-fA-F]{128,130}$/.test(strippedHex)) {
        sigBuf = Buffer.from(strippedHex, 'hex');
      } else {
        sigBuf = Buffer.from(sigStr, 'base64');
      }

      if (sigBuf.length !== 65 && sigBuf.length !== 64) return false;

      const digestHex = `0x${this._bitcoinMessageDigest(message).toString('hex')}`;
      const r = `0x${sigBuf.subarray(sigBuf.length === 65 ? 1 : 0, sigBuf.length === 65 ? 33 : 32).toString('hex')}`;
      const s = `0x${sigBuf.subarray(sigBuf.length === 65 ? 33 : 32).toString('hex')}`;

      const recCandidates = [];
      if (sigBuf.length === 65) {
        const header = sigBuf[0];
        if (header >= 27 && header <= 42) {
          recCandidates.push((header - 27) & 3);
        }
      }
      for (let i = 0; i < 4; i++) {
        if (!recCandidates.includes(i)) recCandidates.push(i);
      }

      for (const recId of recCandidates) {
        try {
          const uncompressedHex = ethers.SigningKey.recoverPublicKey(digestHex, { r, s, v: 27 + recId });
          const compressedHex = ethers.SigningKey.computePublicKey(uncompressedHex, true);
          const compHash = this._hash160(Buffer.from(compressedHex.slice(2), 'hex'));
          const uncompHash = this._hash160(Buffer.from(uncompressedHex.slice(2), 'hex'));
          if (compHash.equals(expectedHash160) || uncompHash.equals(expectedHash160)) {
            return true;
          }
        } catch {
          // Try next recovery id candidate
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  verifyWalletSignature(address, message, signature) {
    const clean = String(address || '').trim();
    if (!clean || !message || !signature) return false;
    if (clean.startsWith('0x')) {
      return this.verifyEvmSignature(clean, message, signature);
    }
    if (parseCashAddress(clean)) {
      return this.verifyBchSignature(clean, message, signature);
    }
    if (BASE58_REGEX.test(clean)) {
      return this.verifySolanaSignature(clean, message, signature);
    }
    return false;
  }

  issueChallenge(addresses = []) {
    const now = Date.now();
    const nonce = crypto.randomBytes(16).toString('hex');
    const cleanAddrs = (Array.isArray(addresses) ? addresses : [])
      .map(a => String(a || '').trim().toLowerCase())
      .filter(Boolean);

    const payload = {
      typ: 'bliq_challenge_v1',
      nonce,
      addresses: cleanAddrs,
      iat: now,
      exp: now + CHALLENGE_TTL_MS
    };
    const payloadB64 = this._b64UrlEncode(JSON.stringify(payload));
    const sigB64 = this._signHmac(payloadB64);
    const challengeToken = `${payloadB64}.${sigB64}`;
    const message = [
      'BinaryLiquid Non-Custodial Session Auth',
      `Nonce: ${nonce}`,
      `IssuedAt: ${new Date(now).toISOString()}`,
      'Purpose: Authenticate ownership of connected wallet(s) without gas or asset transfer.'
    ].join('\n');

    return { challengeToken, message, nonce, expiresAt: payload.exp };
  }

  authenticateProofs({ challengeToken, message, proofs = [], existingAuthToken = null }) {
    const challenge = this._verifySignedToken(challengeToken);
    if (!challenge || challenge.typ !== 'bliq_challenge_v1') {
      throw new Error('Desafío de autenticación inválido o expirado.');
    }
    if (Date.now() > Number(challenge.exp || 0)) {
      throw new Error('El desafío de autenticación expiró. Solicita uno nuevo.');
    }
    const msgStr = String(message || '');
    if (
      !msgStr.startsWith('BinaryLiquid Non-Custodial Session Auth\n') ||
      !msgStr.includes(`\nNonce: ${challenge.nonce}\n`)
    ) {
      throw new Error('El mensaje firmado no corresponde al formato canónico o nonce del desafío.');
    }
    if (this.usedChallenges.has(challenge.nonce)) {
      throw new Error('Este desafío ya fue utilizado (protección Anti-Replay).');
    }
    if (!Array.isArray(proofs) || proofs.length === 0) {
      throw new Error('Se requiere al menos una firma criptográfica válida.');
    }

    const allowedChallengeAddrs =
      Array.isArray(challenge.addresses) && challenge.addresses.length > 0
        ? new Set(
            challenge.addresses.flatMap(a => {
              const clean = String(a).trim();
              return parseCashAddress(clean) ? expandBchAddressVariants(clean) : [clean.toLowerCase()];
            })
          )
        : null;

    const verifiedAddresses = [];
    if (existingAuthToken) {
      const prevSession = this.verifySessionToken(existingAuthToken);
      if (prevSession?.addresses) {
        verifiedAddresses.push(...prevSession.addresses);
      }
    }
    for (const proof of proofs) {
      const addr = String(proof?.address || '').trim();
      const sig = String(proof?.signature || '').trim();
      if (!addr || !sig) continue;
      if (allowedChallengeAddrs && !allowedChallengeAddrs.has(addr.toLowerCase())) {
        throw new Error(`La billetera ${addr.slice(0, 14)}... no fue incluida en el desafío solicitado.`);
      }
      if (!this.verifyWalletSignature(addr, message, sig)) {
        throw new Error(`Firma criptográfica inválida para la billetera ${addr.slice(0, 14)}...`);
      }
      if (parseCashAddress(addr)) {
        verifiedAddresses.push(...expandBchAddressVariants(addr));
      } else {
        verifiedAddresses.push(addr.toLowerCase());
      }
    }

    if (verifiedAddresses.length === 0) {
      throw new Error('Ninguna firma válida verificada.');
    }

    // Consume nonce after verification (keep bounded map)
    this.usedChallenges.set(challenge.nonce, Date.now());
    if (this.usedChallenges.size > 5000) {
      const cutoff = Date.now() - CHALLENGE_TTL_MS;
      for (const [k, ts] of this.usedChallenges.entries()) {
        if (ts < cutoff || this.usedChallenges.size > 4000) {
          this.usedChallenges.delete(k);
        } else {
          break;
        }
      }
    }

    const now = Date.now();
    const sessionPayload = {
      typ: 'bliq_session_v1',
      addresses: Array.from(new Set(verifiedAddresses)),
      iat: now,
      exp: now + SESSION_TTL_MS,
      jti: crypto.randomBytes(12).toString('hex')
    };
    const payloadB64 = this._b64UrlEncode(JSON.stringify(sessionPayload));
    const sigB64 = this._signHmac(payloadB64);

    return {
      authToken: `${payloadB64}.${sigB64}`,
      authenticatedAddresses: sessionPayload.addresses,
      expiresAt: sessionPayload.exp
    };
  }

  verifySessionToken(token) {
    const payload = this._verifySignedToken(token);
    if (!payload || payload.typ !== 'bliq_session_v1') return null;
    if (Date.now() > Number(payload.exp || 0)) return null;
    if (!Array.isArray(payload.addresses) || payload.addresses.length === 0) return null;
    const expanded = new Set();
    for (const rawAddr of payload.addresses) {
      const clean = String(rawAddr || '').trim().toLowerCase();
      if (!clean) continue;
      if (parseCashAddress(clean)) {
        for (const variant of expandBchAddressVariants(clean)) {
          expanded.add(variant);
        }
      } else {
        expanded.add(clean);
      }
    }
    return {
      addresses: Array.from(expanded),
      expiresAt: payload.exp
    };
  }
}

export const authService = new AuthService();
