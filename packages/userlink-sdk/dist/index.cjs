"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  USERLINK_ATTESTATION_LABEL: () => USERLINK_ATTESTATION_LABEL,
  USERLINK_D_TAG: () => USERLINK_D_TAG,
  USERLINK_PROTOCOL_ID: () => USERLINK_PROTOCOL_ID,
  USERLINK_RELAYS: () => USERLINK_RELAYS,
  base64ToBytes: () => base64ToBytes,
  bitcoinMessageHash: () => bitcoinMessageHash,
  buildBchOpReturnScriptHex: () => buildBchOpReturnScriptHex,
  buildUserLinkDidDocument: () => buildUserLinkDidDocument,
  buildUserLinkEventTemplate: () => buildUserLinkEventTemplate,
  bytesToBase64: () => bytesToBase64,
  computeUserLinkCommitmentHash: () => computeUserLinkCommitmentHash,
  convertCashAddressNetwork: () => convertCashAddressNetwork,
  createAuthChallenge: () => createAuthChallenge,
  createSaltedDisclosureCommitment: () => createSaltedDisclosureCommitment,
  createSignedAttestationEvent: () => createSignedAttestationEvent,
  createUserLinkStatement: () => createUserLinkStatement,
  decodeCashAddress: () => decodeCashAddress,
  encodeCashAddress: () => encodeCashAddress,
  fetchAttestationsFromRelays: () => fetchAttestationsFromRelays,
  hash160: () => hash160,
  isValidCashAddress: () => isValidCashAddress,
  pubkeyToCashAddress: () => pubkeyToCashAddress,
  publishUserLinkToRelay: () => publishUserLinkToRelay,
  resolveUserLinkFromRelays: () => resolveUserLinkFromRelays,
  signBitcoinMessage: () => signBitcoinMessage,
  verifyAttestationEvent: () => verifyAttestationEvent,
  verifyAuthChallengeEvent: () => verifyAuthChallengeEvent,
  verifyBchOnChainAnchor: () => verifyBchOnChainAnchor,
  verifyBitcoinMessageAndAddress: () => verifyBitcoinMessageAndAddress,
  verifySelectiveDisclosure: () => verifySelectiveDisclosure,
  verifyUserLinkEvent: () => verifyUserLinkEvent
});
module.exports = __toCommonJS(src_exports);
var import_nostr_tools = require("nostr-tools");
var import_secp256k1 = require("@noble/curves/secp256k1.js");
var import_sha22 = require("@noble/hashes/sha2.js");
var import_utils2 = require("@noble/hashes/utils.js");

// src/bchAddress.ts
var import_sha2 = require("@noble/hashes/sha2.js");
var import_legacy = require("@noble/hashes/legacy.js");
var import_utils = require("@noble/hashes/utils.js");
var CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
var CHARSET_MAP = Object.fromEntries(
  Array.from(CHARSET).map((ch, idx) => [ch, idx])
);
var SIZE_BITS_TO_BYTES = {
  0: 20,
  1: 24,
  2: 28,
  3: 32,
  4: 40,
  5: 48,
  6: 56,
  7: 64
};
var BYTES_TO_SIZE_BITS = Object.fromEntries(
  Object.entries(SIZE_BITS_TO_BYTES).map(([bits, bytes]) => [bytes, Number(bits)])
);
var TYPE_CODE_TO_NAME = {
  0: "p2pkh",
  1: "p2sh",
  2: "p2pkhWithTokens",
  3: "p2shWithTokens"
};
var TYPE_NAME_TO_CODE = {
  p2pkh: 0,
  p2sh: 1,
  p2pkhWithTokens: 2,
  p2shWithTokens: 3
};
function hash160(data) {
  return (0, import_legacy.ripemd160)((0, import_sha2.sha256)(data));
}
function polymod(values) {
  let c = 1n;
  for (const d of values) {
    const c0 = c >> 35n;
    c = (c & 0x07ffffffffn) << 5n ^ BigInt(d);
    if ((c0 & 1n) !== 0n) c ^= 0x98f2bc8e61n;
    if ((c0 & 2n) !== 0n) c ^= 0x79b76d99e2n;
    if ((c0 & 4n) !== 0n) c ^= 0xf33e5fb3c4n;
    if ((c0 & 8n) !== 0n) c ^= 0xae2eabe2a8n;
    if ((c0 & 16n) !== 0n) c ^= 0x1e4f43e470n;
  }
  return c ^ 1n;
}
function prefixToWords(prefix) {
  const words = [];
  for (let i = 0; i < prefix.length; i++) {
    words.push(prefix.charCodeAt(i) & 31);
  }
  words.push(0);
  return words;
}
function convertBits(data, fromBits, toBits, pad) {
  let acc = 0;
  let bits = 0;
  const maxv = (1 << toBits) - 1;
  const ret = [];
  for (const value of data) {
    if (value < 0 || value >> fromBits !== 0) return null;
    acc = acc << fromBits | value;
    bits += fromBits;
    while (bits >= toBits) {
      bits -= toBits;
      ret.push(acc >> bits & maxv);
    }
  }
  if (pad) {
    if (bits > 0) {
      ret.push(acc << toBits - bits & maxv);
    }
  } else {
    if (bits >= fromBits) return null;
    if ((acc << toBits - bits & maxv) !== 0) return null;
  }
  return ret;
}
function decodeCashAddress(address) {
  if (!address || typeof address !== "string") return "Invalid address";
  const trimmed = address.trim();
  const hasLower = trimmed !== trimmed.toUpperCase();
  const hasUpper = trimmed !== trimmed.toLowerCase();
  if (hasLower && hasUpper) return "Mixed case CashAddress is invalid";
  const lower = trimmed.toLowerCase();
  const colonIdx = lower.indexOf(":");
  if (colonIdx <= 0 || colonIdx !== lower.lastIndexOf(":")) {
    return "CashAddress must contain prefix:payload";
  }
  const prefix = lower.slice(0, colonIdx);
  const payloadStr = lower.slice(colonIdx + 1);
  if (payloadStr.length < 10) return "CashAddress payload too short";
  const dataWords = [];
  for (let i = 0; i < payloadStr.length; i++) {
    const val = CHARSET_MAP[payloadStr[i]];
    if (val === void 0) return "Invalid CashAddress character";
    dataWords.push(val);
  }
  const checksumInput = [...prefixToWords(prefix), ...dataWords];
  if (polymod(checksumInput) !== 0n) {
    return "Invalid CashAddress checksum";
  }
  const payloadWords = dataWords.slice(0, -8);
  const bytes = convertBits(payloadWords, 5, 8, false);
  if (!bytes || bytes.length < 21) return "Invalid CashAddress bit encoding";
  const versionByte = bytes[0];
  if ((versionByte & 128) !== 0) return "Invalid CashAddress version MSB";
  const typeCode = versionByte >> 3 & 15;
  const sizeBits = versionByte & 7;
  const type = TYPE_CODE_TO_NAME[typeCode];
  const expectedLen = SIZE_BITS_TO_BYTES[sizeBits];
  if (!type || !expectedLen) return "Unsupported CashAddress version or hash size";
  const payload = new Uint8Array(bytes.slice(1));
  if (payload.length !== expectedLen) return "CashAddress payload length mismatch";
  return { prefix, type, payload };
}
function encodeCashAddress(params) {
  const typeCode = TYPE_NAME_TO_CODE[params.type];
  const sizeBits = BYTES_TO_SIZE_BITS[params.payload.length];
  if (typeCode === void 0 || sizeBits === void 0) {
    return "Unsupported CashAddress type or payload length";
  }
  const versionByte = typeCode << 3 | sizeBits;
  const raw = new Uint8Array(1 + params.payload.length);
  raw[0] = versionByte;
  raw.set(params.payload, 1);
  const payloadWords = convertBits(raw, 8, 5, true);
  if (!payloadWords) return "Failed encoding CashAddress words";
  const mod = polymod([...prefixToWords(params.prefix), ...payloadWords, 0, 0, 0, 0, 0, 0, 0, 0]);
  const checksumWords = [];
  for (let i = 7; i >= 0; i--) {
    checksumWords.push(Number(mod >> BigInt(i * 5) & 31n));
  }
  const encoded = [...payloadWords, ...checksumWords].map((w) => CHARSET[w]).join("");
  return { address: `${params.prefix}:${encoded}` };
}
function pubkeyToCashAddress(pubkey, isTestnet = false, tokenAware = false) {
  try {
    const rawBytes = typeof pubkey === "string" ? (0, import_utils.hexToBytes)(pubkey.replace(/^0x/, "")) : pubkey;
    if (!rawBytes || rawBytes.length < 32) return "";
    const res = encodeCashAddress({
      prefix: isTestnet ? "bchtest" : "bitcoincash",
      type: tokenAware ? "p2pkhWithTokens" : "p2pkh",
      payload: hash160(rawBytes)
    });
    if (typeof res !== "string" && res.address) {
      return res.address;
    }
  } catch {
  }
  return "";
}
function convertCashAddressNetwork(address, isTestnet, tokenAware = false) {
  if (!address || typeof address !== "string") return "";
  if (address.includes(",")) {
    return address.split(",").map((a) => convertCashAddressNetwork(a.trim(), isTestnet, tokenAware)).filter(Boolean).join(",");
  }
  let clean = address.trim();
  if (clean.startsWith("bch:bitcoincash:")) {
    clean = clean.slice(4);
  } else if (clean.startsWith("bch:bchtest:")) {
    clean = clean.slice(4);
  }
  if (!clean.includes(":") && /^[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{40,54}$/i.test(clean)) {
    const tryTest = decodeCashAddress(`bchtest:${clean}`);
    if (typeof tryTest !== "string") {
      clean = `bchtest:${clean}`;
    } else {
      const tryMain = decodeCashAddress(`bitcoincash:${clean}`);
      if (typeof tryMain !== "string") {
        clean = `bitcoincash:${clean}`;
      }
    }
  }
  const decoded = decodeCashAddress(clean);
  if (typeof decoded === "string") return clean;
  const isP2sh = decoded.type === "p2sh" || decoded.type === "p2shWithTokens";
  const targetType = isP2sh ? tokenAware ? "p2shWithTokens" : "p2sh" : tokenAware ? "p2pkhWithTokens" : "p2pkh";
  const encoded = encodeCashAddress({
    prefix: isTestnet ? "bchtest" : "bitcoincash",
    type: targetType,
    payload: decoded.payload
  });
  return typeof encoded !== "string" ? encoded.address : clean;
}
function isValidCashAddress(address, requireTestnet) {
  if (!address || typeof address !== "string") return false;
  if (address.includes(",")) {
    const parts = address.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length === 0) return false;
    return parts.every((p) => isValidCashAddress(p, requireTestnet));
  }
  const decoded = decodeCashAddress(address.trim());
  if (typeof decoded === "string") return false;
  if (requireTestnet === true) return decoded.prefix === "bchtest";
  if (requireTestnet === false) return decoded.prefix === "bitcoincash";
  return decoded.prefix === "bchtest" || decoded.prefix === "bitcoincash";
}

// src/index.ts
var USERLINK_PROTOCOL_ID = "bch-nostr-userlink-id-v1";
var USERLINK_RELAYS = [
  "wss://relay.primal.net",
  "wss://relay.snort.social",
  "wss://nostr.oxtr.dev",
  "wss://offchain.pub"
];
var USERLINK_D_TAG = "bch-identity-binding";
var USERLINK_ATTESTATION_LABEL = "userlink.vc.v1";
function encodeVarInt(n) {
  if (n < 253) return new Uint8Array([n]);
  if (n <= 65535) return new Uint8Array([253, n & 255, n >> 8 & 255]);
  return new Uint8Array([
    254,
    n & 255,
    n >> 8 & 255,
    n >> 16 & 255,
    n >>> 24 & 255
  ]);
}
function bitcoinMessageHash(message) {
  const prefix = new TextEncoder().encode("Bitcoin Signed Message:\n");
  const body = new TextEncoder().encode(message);
  const lenBytes = encodeVarInt(body.length);
  const full = new Uint8Array(prefix.length + lenBytes.length + body.length);
  full.set(prefix, 0);
  full.set(lenBytes, prefix.length);
  full.set(body, prefix.length + lenBytes.length);
  return (0, import_sha22.sha256)((0, import_sha22.sha256)(full));
}
function getNodeBuffer() {
  return globalThis.Buffer;
}
function bytesToBase64(bytes) {
  const buf = getNodeBuffer();
  if (buf) {
    return buf.from(bytes).toString("base64");
  }
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
function base64ToBytes(b64) {
  const buf = getNodeBuffer();
  if (buf) {
    return new Uint8Array(buf.from(b64.trim(), "base64"));
  }
  const binary = atob(b64.trim());
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
function signBitcoinMessage(message, skBytes) {
  const digest = bitcoinMessageHash(message);
  const sigRec = import_secp256k1.secp256k1.sign(digest, skBytes, { prehash: false, format: "recovered" });
  const recId = sigRec[0];
  const bsmBytes = new Uint8Array(65);
  bsmBytes[0] = 31 + recId;
  bsmBytes.set(sigRec.slice(1, 65), 1);
  return bytesToBase64(bsmBytes);
}
function createUserLinkStatement(params) {
  const cleanHandle = params.handle.replace(/^@+/, "").trim().toLowerCase();
  const prev = params.previousNostrPubkey?.trim().toLowerCase();
  const isRotation = Boolean(prev && /^[0-9a-f]{64}$/.test(prev) && prev !== params.nostrPubkeyHex.toLowerCase());
  const statement = {
    protocol: USERLINK_PROTOCOL_ID,
    action: isRotation ? "bch-authorized-key-rotation" : "identity-binding",
    username: `@${cleanHandle}`,
    bchAddress: params.bchAddress.trim(),
    nostrPubkey: params.nostrPubkeyHex.trim().toLowerCase(),
    ...isRotation ? { previousNostrPubkey: prev } : {},
    network: params.network || (params.bchAddress.trim().startsWith("bchtest:") ? "testnet" : "mainnet"),
    timestamp: params.timestamp ?? Math.floor(Date.now() / 1e3)
  };
  return JSON.stringify(statement);
}
function buildUserLinkEventTemplate(params) {
  const cleanHandle = params.handle.replace(/^@+/, "").trim().toLowerCase();
  const cleanAddr = params.bchAddress.trim();
  const domain = (params.nip05Domain || "bliquid.xyz").trim().toLowerCase();
  const network = params.network || (cleanAddr.startsWith("bchtest:") ? "testnet" : "mainnet");
  const tags = [
    ["d", USERLINK_D_TAG],
    ["t", cleanHandle],
    ["t", cleanAddr],
    ["i", `bch:${cleanAddr}`, params.bchSigBase64.trim()],
    ["bch", cleanAddr],
    ["bch_sig", params.bchSigBase64.trim()],
    ["sig_scheme", params.sigScheme || "bitcoin-signed-message"],
    ["handle", cleanHandle],
    ["nip05", `${cleanHandle}@${domain}`],
    ["network", network],
    ["client", params.clientName || "UserLink SDK"]
  ];
  if (params.bchPubkeyHex) {
    tags.push(["bch_pubkey", params.bchPubkeyHex.trim().toLowerCase()]);
  }
  if (params.previousNostrPubkey && /^[0-9a-fA-F]{64}$/.test(params.previousNostrPubkey.trim())) {
    tags.push(["prev_nostr", params.previousNostrPubkey.trim().toLowerCase()]);
  }
  if (params.anchorTxId && /^[0-9a-fA-F]{64}$/.test(params.anchorTxId.trim())) {
    tags.push(["anchor_tx", params.anchorTxId.trim().toLowerCase()]);
  }
  return {
    kind: 30078,
    created_at: params.createdAt ?? Math.floor(Date.now() / 1e3),
    tags,
    content: params.statementContent
  };
}
function getCashAddressHash160(address) {
  if (!address) return null;
  let clean = address.trim().toLowerCase();
  if (clean.includes(",")) {
    clean = clean.split(",")[0].trim();
  }
  if (!clean.includes(":")) {
    const main = convertCashAddressNetwork(clean, false, false);
    if (main.includes(":")) clean = main;
  }
  const decoded = decodeCashAddress(clean);
  if (typeof decoded === "string") return null;
  if (decoded.type !== "p2pkh" && decoded.type !== "p2pkhWithTokens") {
    return null;
  }
  return decoded.payload;
}
function checkPubkeyMatchesAddress(pubkeyBytes, address) {
  const expectedPayload = getCashAddressHash160(address);
  if (!expectedPayload) return false;
  const actualPayload = hash160(pubkeyBytes);
  return (0, import_utils2.bytesToHex)(actualPayload) === (0, import_utils2.bytesToHex)(expectedPayload);
}
function verifyBitcoinMessageAndAddress(params) {
  const { message, bchSig, expectedAddress = "", expectedPubkeyHex = "", sigScheme = "" } = params;
  const sigTrimmed = (bchSig || "").trim();
  if (!sigTrimmed || !message) {
    return {
      isBchSigValid: false,
      isAddressOwned: false,
      recoveredPubkeyHex: "",
      reason: "Missing BCH signature or attestation payload"
    };
  }
  const looksLikeHex = /^[0-9a-fA-F]{128,144}$/.test(sigTrimmed);
  const tryBsmFirst = sigScheme === "bitcoin-signed-message" || !looksLikeHex;
  if (tryBsmFirst) {
    try {
      const raw = base64ToBytes(sigTrimmed);
      if (raw.length === 65 && raw[0] >= 27 && raw[0] <= 34) {
        const hdr = raw[0];
        const isCompressed = hdr >= 31;
        const recId = hdr - 27 & 3;
        const nobleRec = new Uint8Array(65);
        nobleRec[0] = recId;
        nobleRec.set(raw.slice(1, 65), 1);
        const digest = bitcoinMessageHash(message);
        const compressedPk = import_secp256k1.secp256k1.recoverPublicKey(nobleRec, digest, { prehash: false });
        const compactSig = raw.slice(1, 65);
        const isSigValid = import_secp256k1.secp256k1.verify(compactSig, digest, compressedPk, { prehash: false });
        if (!isSigValid) {
          return {
            isBchSigValid: false,
            isAddressOwned: false,
            recoveredPubkeyHex: "",
            reason: "Recovered key failed ECDSA verification"
          };
        }
        const keyForHash = isCompressed ? compressedPk : import_secp256k1.secp256k1.Point.fromBytes(compressedPk).toBytes(false);
        const recoveredHex = (0, import_utils2.bytesToHex)(compressedPk);
        const isAddressOwned = expectedAddress ? checkPubkeyMatchesAddress(keyForHash, expectedAddress) : false;
        const matchesPubkey = !expectedPubkeyHex || recoveredHex === expectedPubkeyHex.trim().toLowerCase();
        const validForClaim = expectedAddress ? isAddressOwned && matchesPubkey : matchesPubkey;
        return {
          isBchSigValid: validForClaim,
          isAddressOwned,
          recoveredPubkeyHex: validForClaim ? recoveredHex : "",
          reason: validForClaim ? void 0 : !isAddressOwned ? "Recovered BSM key does not own the claimed CashAddress (message altered or wrong key)" : "Recovered BSM key does not match claimed bch_pubkey"
        };
      }
    } catch {
    }
  }
  if (looksLikeHex && expectedPubkeyHex) {
    try {
      const sigBytes = (0, import_utils2.hexToBytes)(sigTrimmed);
      const pkBytes = (0, import_utils2.hexToBytes)(expectedPubkeyHex.trim());
      const statementHash = (0, import_sha22.sha256)(new TextEncoder().encode(message));
      const sigFormat = sigBytes.length === 64 ? "compact" : "der";
      const isSigValid = import_secp256k1.secp256k1.verify(sigBytes, statementHash, pkBytes, { prehash: false, format: sigFormat }) || import_secp256k1.secp256k1.verify(sigBytes, statementHash, pkBytes, { prehash: true, format: sigFormat });
      const isAddressOwned = expectedAddress ? checkPubkeyMatchesAddress(pkBytes, expectedAddress) : false;
      return {
        isBchSigValid: isSigValid,
        isAddressOwned,
        recoveredPubkeyHex: isSigValid ? (0, import_utils2.bytesToHex)(pkBytes) : "",
        reason: !isSigValid ? "ECDSA secp256k1 signature invalid" : isAddressOwned ? void 0 : "Public key hash160 does not match CashAddress"
      };
    } catch {
      return {
        isBchSigValid: false,
        isAddressOwned: false,
        recoveredPubkeyHex: "",
        reason: "Malformed hex signature or public key"
      };
    }
  }
  return {
    isBchSigValid: false,
    isAddressOwned: false,
    recoveredPubkeyHex: "",
    reason: "Unsupported or malformed BCH signature"
  };
}
function verifyUserLinkEvent(foundEvent) {
  const cleanEventForVerify = {
    id: foundEvent.id,
    pubkey: foundEvent.pubkey,
    created_at: foundEvent.created_at,
    kind: foundEvent.kind,
    tags: Array.isArray(foundEvent.tags) ? foundEvent.tags.map((t) => [...t]) : [],
    content: foundEvent.content,
    sig: foundEvent.sig
  };
  const isNostrSigValid = Boolean((0, import_nostr_tools.verifyEvent)(cleanEventForVerify));
  const bchAddressTag = foundEvent.tags.find((t) => t[0] === "bch")?.[1] || "";
  const bchPubkeyTag = foundEvent.tags.find((t) => t[0] === "bch_pubkey")?.[1] || "";
  const bchSigTag = foundEvent.tags.find((t) => t[0] === "bch_sig")?.[1] || "";
  const handleTag = foundEvent.tags.find((t) => t[0] === "handle")?.[1] || "";
  const nip05Tag = foundEvent.tags.find((t) => t[0] === "nip05")?.[1] || "";
  const prevNostrTag = foundEvent.tags.find((t) => t[0] === "prev_nostr")?.[1] || "";
  const anchorTxTag = foundEvent.tags.find((t) => t[0] === "anchor_tx")?.[1] || "";
  const sigSchemeTag = foundEvent.tags.find((t) => t[0] === "sig_scheme")?.[1] || (/^[0-9a-fA-F]{128,144}$/.test(bchSigTag) ? "ecdsa-secp256k1-sha256" : "bitcoin-signed-message");
  let parsedStatement = null;
  try {
    parsedStatement = JSON.parse(foundEvent.content);
  } catch {
  }
  const previousNostrPubkey = (prevNostrTag || (typeof parsedStatement?.previousNostrPubkey === "string" ? parsedStatement.previousNostrPubkey : "")).trim().toLowerCase();
  const isMutualBindingValid = Boolean(
    parsedStatement && typeof parsedStatement === "object" && parsedStatement.nostrPubkey === foundEvent.pubkey && (!bchAddressTag || parsedStatement.bchAddress === bchAddressTag) && (!prevNostrTag || parsedStatement.previousNostrPubkey === prevNostrTag)
  );
  const bchCheck = verifyBitcoinMessageAndAddress({
    message: foundEvent.content,
    bchSig: bchSigTag,
    expectedAddress: bchAddressTag || String(parsedStatement?.bchAddress || ""),
    expectedPubkeyHex: bchPubkeyTag || String(parsedStatement?.bchPubkeyHex || ""),
    sigScheme: sigSchemeTag
  });
  const resolvedAddress = bchAddressTag || String(parsedStatement?.bchAddress || "");
  const resolvedHandle = handleTag || String(parsedStatement?.username || "").replace(/^@/, "") || "user";
  let npub = "";
  try {
    npub = import_nostr_tools.nip19.npubEncode(foundEvent.pubkey);
  } catch {
    npub = foundEvent.pubkey;
  }
  const isOverallValid = isNostrSigValid && bchCheck.isBchSigValid && bchCheck.isAddressOwned && isMutualBindingValid;
  const rotationAuthorized = Boolean(
    isOverallValid && /^[0-9a-f]{64}$/.test(previousNostrPubkey) && previousNostrPubkey !== foundEvent.pubkey
  );
  const commitmentHashHex = computeUserLinkCommitmentHash(foundEvent.content);
  let verificationNote = bchCheck.reason;
  if (!isNostrSigValid) verificationNote = "Invalid Nostr BIP-340 Schnorr signature";
  else if (!isMutualBindingValid) verificationNote = "Signed statement does not bind event pubkey and BCH address";
  return {
    npub,
    pubkeyHex: foundEvent.pubkey,
    bchAddress: resolvedAddress,
    bchPubkey: bchCheck.recoveredPubkeyHex || bchPubkeyTag,
    nip05: nip05Tag || `${resolvedHandle}@bliquid.xyz`,
    handle: `@${resolvedHandle}`,
    sigScheme: sigSchemeTag,
    event: foundEvent,
    timestamp: foundEvent.created_at,
    isNostrSigValid,
    isBchSigValid: bchCheck.isBchSigValid,
    isAddressOwned: bchCheck.isAddressOwned,
    isMutualBindingValid,
    isOverallValid,
    ...previousNostrPubkey ? { previousNostrPubkey } : {},
    rotationAuthorized,
    ...anchorTxTag ? { anchorTxId: anchorTxTag.trim().toLowerCase() } : {},
    commitmentHashHex,
    verificationNote
  };
}
function getAddressLookupVariants(raw) {
  const variants = /* @__PURE__ */ new Set();
  const trimmed = raw.trim();
  if (!trimmed) return [];
  variants.add(trimmed);
  try {
    const mainBase = convertCashAddressNetwork(trimmed, false, false);
    const mainToken = convertCashAddressNetwork(trimmed, false, true);
    const testBase = convertCashAddressNetwork(trimmed, true, false);
    const testToken = convertCashAddressNetwork(trimmed, true, true);
    for (const v of [mainBase, mainToken, testBase, testToken]) {
      if (v && isValidCashAddress(v)) {
        variants.add(v);
        variants.add(`bch:${v}`);
      }
    }
  } catch {
  }
  return Array.from(variants);
}
async function resolveUserLinkFromRelays(rawInput, relays = USERLINK_RELAYS, timeoutMs = 5500) {
  const rawTarget = rawInput.trim();
  if (!rawTarget) return { verified: null };
  const pool = new import_nostr_tools.SimplePool();
  let nip05Fallback;
  try {
    const filters = [];
    let expectedHandle = "";
    let expectedAddressVariants = [];
    let expectedPubkey = "";
    let expectedNip05 = "";
    let requireHttpNip05 = false;
    if (rawTarget.startsWith("npub1")) {
      const decoded = import_nostr_tools.nip19.decode(rawTarget);
      if (decoded.type !== "npub" || typeof decoded.data !== "string") {
        throw new Error("INVALID_NPUB");
      }
      expectedPubkey = decoded.data;
      filters.push({ kinds: [30078], "#d": [USERLINK_D_TAG], authors: [expectedPubkey] });
    } else if (/^[0-9a-fA-F]{64}$/.test(rawTarget)) {
      expectedPubkey = rawTarget.toLowerCase();
      filters.push({ kinds: [30078], "#d": [USERLINK_D_TAG], authors: [expectedPubkey] });
    } else if (rawTarget.startsWith("bitcoincash:") || rawTarget.startsWith("bchtest:") || isValidCashAddress(convertCashAddressNetwork(rawTarget, false, false))) {
      expectedAddressVariants = getAddressLookupVariants(rawTarget);
      const iTags = expectedAddressVariants.filter((v) => v.startsWith("bch:"));
      const bareAddrs = expectedAddressVariants.filter((v) => !v.startsWith("bch:"));
      if (iTags.length > 0) {
        filters.push({ kinds: [30078], "#d": [USERLINK_D_TAG], "#i": iTags });
      }
      if (bareAddrs.length > 0) {
        filters.push({ kinds: [30078], "#d": [USERLINK_D_TAG], "#t": bareAddrs });
      }
    } else {
      const noAt = rawTarget.replace(/^@/, "").trim();
      const hasExplicitDomain = noAt.includes("@");
      const [userPart, domainPart] = hasExplicitDomain ? noAt.split("@") : [noAt, "bliquid.xyz"];
      expectedHandle = (userPart || "").toLowerCase().replace(/[^a-z0-9_-]/g, "");
      const cleanDomain = (domainPart || "").trim().toLowerCase();
      if (hasExplicitDomain) {
        if (!cleanDomain || !cleanDomain.includes(".") || !expectedHandle) {
          return { verified: null };
        }
        expectedNip05 = `${expectedHandle}@${cleanDomain}`;
        requireHttpNip05 = true;
      }
      if (expectedHandle && !requireHttpNip05) {
        filters.push({ kinds: [30078], "#d": [USERLINK_D_TAG], "#t": [expectedHandle] });
      }
      if (cleanDomain && cleanDomain.includes(".") && expectedHandle) {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 3500);
          const res = await fetch(
            `https://${cleanDomain}/.well-known/nostr.json?name=${encodeURIComponent(expectedHandle)}`,
            { signal: controller.signal }
          );
          clearTimeout(timer);
          if (res.ok) {
            const json = await res.json();
            const pk = json?.names?.[expectedHandle];
            const bchAddr = json?.bch_addresses?.[expectedHandle];
            if (pk && /^[0-9a-fA-F]{64}$/.test(pk)) {
              expectedPubkey = pk.toLowerCase();
              filters.push({ kinds: [30078], "#d": [USERLINK_D_TAG], authors: [expectedPubkey] });
              if (bchAddr) {
                nip05Fallback = {
                  handle: `@${expectedHandle}`,
                  nip05: `${expectedHandle}@${cleanDomain}`,
                  bchAddress: bchAddr,
                  pubkeyHex: expectedPubkey
                };
              }
            }
          }
        } catch {
        }
      }
      if (requireHttpNip05 && !expectedPubkey) {
        return { verified: null };
      }
    }
    if (filters.length === 0) {
      return { verified: null, nip05Fallback };
    }
    const queryPromise = Promise.all(
      filters.map((f) => pool.querySync(relays, f).catch(() => []))
    );
    const batches = await Promise.race([
      queryPromise,
      new Promise((resolve) => setTimeout(() => resolve([]), timeoutMs))
    ]);
    const eventsMap = /* @__PURE__ */ new Map();
    for (const batch of batches) {
      for (const ev of batch) {
        if (!eventsMap.has(ev.id)) {
          eventsMap.set(ev.id, ev);
        }
      }
    }
    const candidates = Array.from(eventsMap.values()).sort((a, b) => b.created_at - a.created_at);
    for (const ev of candidates) {
      const checked = verifyUserLinkEvent(ev);
      if (!checked.isOverallValid) continue;
      if (expectedHandle && checked.handle.replace(/^@/, "").toLowerCase() !== expectedHandle) {
        continue;
      }
      if (expectedNip05 && (checked.nip05 || "").trim().toLowerCase() !== expectedNip05) {
        continue;
      }
      if (expectedAddressVariants.length > 0) {
        const addrVariants = getAddressLookupVariants(checked.bchAddress);
        const hasIntersection = addrVariants.some((v) => expectedAddressVariants.includes(v));
        if (!hasIntersection) continue;
      }
      if (expectedPubkey && checked.pubkeyHex.toLowerCase() !== expectedPubkey.toLowerCase()) {
        continue;
      }
      return { verified: checked, nip05Fallback };
    }
    return { verified: null, nip05Fallback };
  } finally {
    try {
      pool.close(relays);
    } catch {
    }
  }
}
async function publishUserLinkToRelay(relayUrl, signedEvent, timeoutMs = 5500) {
  const pool = new import_nostr_tools.SimplePool();
  const start = Date.now();
  try {
    await Promise.race([
      Promise.all(pool.publish([relayUrl], signedEvent)),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), timeoutMs))
    ]);
    return { ok: true, latency: Date.now() - start };
  } catch (err) {
    return {
      ok: false,
      latency: Date.now() - start,
      error: err instanceof Error ? err.message : "Relay publish failed"
    };
  } finally {
    try {
      pool.close([relayUrl]);
    } catch {
    }
  }
}
function createAuthChallenge(domain, ttlSeconds = 300) {
  const randomBytes = new Uint8Array(16);
  if (typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(randomBytes);
  } else {
    for (let i = 0; i < randomBytes.length; i++) {
      randomBytes[i] = Math.floor(Math.random() * 256);
    }
  }
  const nonce = (0, import_utils2.bytesToHex)(randomBytes);
  const issuedAt = Math.floor(Date.now() / 1e3);
  const expiresAt = issuedAt + ttlSeconds;
  const cleanDomain = domain.trim().toLowerCase();
  return {
    domain: cleanDomain,
    nonce,
    issuedAt,
    expiresAt,
    message: `UserLink Auth Challenge | domain=${cleanDomain} | nonce=${nonce}`
  };
}
function verifyAuthChallengeEvent(signedEvent, expected, nowUnix = Math.floor(Date.now() / 1e3)) {
  const clean = {
    id: signedEvent.id,
    pubkey: signedEvent.pubkey,
    created_at: signedEvent.created_at,
    kind: signedEvent.kind,
    tags: Array.isArray(signedEvent.tags) ? signedEvent.tags.map((t) => [...t]) : [],
    content: signedEvent.content,
    sig: signedEvent.sig
  };
  if (!(0, import_nostr_tools.verifyEvent)(clean)) {
    return { valid: false, pubkeyHex: "", reason: "Invalid BIP-340 Schnorr signature" };
  }
  if (clean.kind !== 22242) {
    return { valid: false, pubkeyHex: "", reason: "Expected NIP-42 kind 22242 challenge event" };
  }
  if (nowUnix > expected.expiresAt) {
    return { valid: false, pubkeyHex: "", reason: "Challenge expired" };
  }
  const challengeTag = clean.tags.find((t) => t[0] === "challenge")?.[1] || "";
  const domainTag = clean.tags.find((t) => t[0] === "relay" || t[0] === "domain")?.[1] || "";
  const hasNonce = challengeTag === expected.nonce || clean.content.includes(expected.nonce);
  const hasDomain = !expected.domain || domainTag.toLowerCase().includes(expected.domain) || clean.content.toLowerCase().includes(expected.domain);
  if (!hasNonce || !hasDomain) {
    return { valid: false, pubkeyHex: "", reason: "Challenge nonce or domain mismatch" };
  }
  return { valid: true, pubkeyHex: clean.pubkey };
}
function computeUserLinkCommitmentHash(statementContent) {
  const prefixed = new TextEncoder().encode(`UL1:${statementContent}`);
  return (0, import_utils2.bytesToHex)((0, import_sha22.sha256)(prefixed));
}
function buildBchOpReturnScriptHex(statementContent) {
  const hashHex = computeUserLinkCommitmentHash(statementContent);
  return `6a24554c313a${hashHex}`;
}
function buildUserLinkDidDocument(verified) {
  const didId = `did:nostr:${verified.pubkeyHex}`;
  const isChipnet = verified.bchAddress.startsWith("bchtest:");
  const bchRaw = verified.bchAddress.includes(":") ? verified.bchAddress.split(":")[1] : verified.bchAddress;
  const didBch = `did:pkh:bch:${isChipnet ? "chipnet" : "mainnet"}:${bchRaw}`;
  return {
    "@context": [
      "https://www.w3.org/ns/did/v1",
      "https://w3id.org/security/suites/secp256k1-2019/v1"
    ],
    id: didId,
    alsoKnownAs: [
      didBch,
      `acct:${verified.nip05}`,
      verified.npub,
      ...verified.previousNostrPubkey ? [`did:nostr:${verified.previousNostrPubkey}`] : []
    ],
    verificationMethod: [
      {
        id: `${didId}#nostr-key`,
        type: "SchnorrSecp256k1VerificationKey2019",
        controller: didId,
        publicKeyHex: verified.pubkeyHex
      },
      {
        id: `${didId}#bch-key`,
        type: "EcdsaSecp256k1RecoveryMethod2020",
        controller: didId,
        ...verified.bchPubkey ? { publicKeyHex: verified.bchPubkey } : {},
        blockchainAccountId: `bch:${isChipnet ? "chipnet" : "mainnet"}:${verified.bchAddress}`
      }
    ],
    authentication: [`${didId}#nostr-key`, `${didId}#bch-key`],
    assertionMethod: [`${didId}#nostr-key`],
    service: [
      {
        id: `${didId}#nostr-relays`,
        type: "NostrRelayRegistry",
        serviceEndpoint: USERLINK_RELAYS
      },
      {
        id: `${didId}#nip05`,
        type: "LinkedDomains",
        serviceEndpoint: `https://bliquid.xyz/.well-known/nostr.json?name=${encodeURIComponent(
          verified.handle.replace(/^@/, "")
        )}`
      }
    ]
  };
}
function createSaltedDisclosureCommitment(salt, attribute, value) {
  const payload = `ul_sd_v1:${salt}:${attribute.trim().toLowerCase()}:${value.trim()}`;
  return (0, import_utils2.bytesToHex)((0, import_sha22.sha256)(new TextEncoder().encode(payload)));
}
function verifySelectiveDisclosure(params) {
  if (!params.salt || !params.attribute || !params.commitmentHex) return false;
  const computed = createSaltedDisclosureCommitment(params.salt, params.attribute, params.value);
  return computed === params.commitmentHex.trim().toLowerCase();
}
function createSignedAttestationEvent(params) {
  const now = Math.floor(Date.now() / 1e3);
  const credential = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiableCredential", "UserLinkAttestation"],
    issuer: "",
    validFrom: new Date(now * 1e3).toISOString(),
    credentialSubject: {
      id: `did:nostr:${params.subjectPubkeyHex.toLowerCase()}`,
      bchAddress: params.subjectBchAddress,
      ...params.subjectHandle ? { handle: params.subjectHandle } : {},
      claimType: params.claimType,
      summary: params.claimSummary,
      ...params.rating !== void 0 ? { rating: params.rating } : {},
      ...params.saltedCommitments && Object.keys(params.saltedCommitments).length > 0 ? { saltedCommitments: params.saltedCommitments } : {}
    }
  };
  const tempSigned = (0, import_nostr_tools.finalizeEvent)(
    {
      kind: 1985,
      created_at: now,
      tags: [
        ["L", USERLINK_ATTESTATION_LABEL],
        ["l", params.claimType, USERLINK_ATTESTATION_LABEL],
        ["p", params.subjectPubkeyHex.toLowerCase()],
        ["i", `bch:${params.subjectBchAddress}`]
      ],
      content: ""
    },
    params.issuerSkBytes
  );
  credential.issuer = `did:nostr:${tempSigned.pubkey}`;
  return (0, import_nostr_tools.finalizeEvent)(
    {
      kind: 1985,
      created_at: now,
      tags: tempSigned.tags,
      content: JSON.stringify(credential)
    },
    params.issuerSkBytes
  );
}
function verifyAttestationEvent(event) {
  const clean = {
    id: event.id,
    pubkey: event.pubkey,
    created_at: event.created_at,
    kind: event.kind,
    tags: Array.isArray(event.tags) ? event.tags.map((t) => [...t]) : [],
    content: event.content,
    sig: event.sig
  };
  const isSigValid = Boolean((0, import_nostr_tools.verifyEvent)(clean));
  let parsed = {};
  try {
    parsed = JSON.parse(event.content);
  } catch {
  }
  const pTag = clean.tags.find((t) => t[0] === "p")?.[1]?.toLowerCase() || "";
  const lTag = clean.tags.find((t) => t[0] === "l")?.[1] || "";
  const subj = parsed?.credentialSubject || {};
  const matchesSubject = Boolean(pTag && subj.id === `did:nostr:${pTag}`);
  const matchesIssuer = !parsed?.issuer || parsed.issuer === `did:nostr:${event.pubkey}`;
  let issuerNpub = event.pubkey;
  try {
    issuerNpub = import_nostr_tools.nip19.npubEncode(event.pubkey);
  } catch {
  }
  const isOverallValid = isSigValid && clean.kind === 1985 && matchesSubject && matchesIssuer && Boolean(subj.claimType || lTag);
  return {
    eventId: event.id,
    issuerPubkeyHex: event.pubkey,
    issuerNpub,
    subjectPubkeyHex: pTag,
    claimType: String(subj.claimType || lTag || "Attestation"),
    claimSummary: String(subj.summary || ""),
    ...typeof subj.rating === "number" ? { rating: subj.rating } : {},
    saltedCommitments: subj.saltedCommitments && typeof subj.saltedCommitments === "object" ? subj.saltedCommitments : {},
    issuedAt: event.created_at,
    isSigValid,
    isOverallValid,
    rawCredential: parsed
  };
}
async function fetchAttestationsFromRelays(subjectPubkeyHex, relays = USERLINK_RELAYS, timeoutMs = 4500) {
  const cleanPk = (subjectPubkeyHex || "").trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(cleanPk)) return [];
  const pool = new import_nostr_tools.SimplePool();
  try {
    const events = await Promise.race([
      pool.querySync(relays, {
        kinds: [1985],
        "#p": [cleanPk],
        "#L": [USERLINK_ATTESTATION_LABEL]
      }).catch(() => []),
      new Promise((resolve) => setTimeout(() => resolve([]), timeoutMs))
    ]);
    const seen = /* @__PURE__ */ new Set();
    const results = [];
    for (const ev of events.sort((a, b) => b.created_at - a.created_at)) {
      if (seen.has(ev.id)) continue;
      seen.add(ev.id);
      const checked = verifyAttestationEvent(ev);
      if (checked.isOverallValid) results.push(checked);
    }
    return results;
  } finally {
    try {
      pool.close(relays);
    } catch {
    }
  }
}
async function verifyBchOnChainAnchor(params) {
  const expectedHex = computeUserLinkCommitmentHash(params.statementContent);
  const cleanTxid = (params.txid || "").trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(cleanTxid)) {
    return {
      verifiedOnChain: false,
      confirmations: 0,
      commitmentHex: expectedHex,
      reason: "Invalid txid format"
    };
  }
  const base = (params.apiBase || "https://bliquid.xyz").replace(/\/+$/, "");
  const res = await fetch(
    `${base}/api/bch/tx/${encodeURIComponent(cleanTxid)}?network=${params.network}`
  );
  const data = await res.json();
  if (!res.ok || !data?.success) {
    return {
      verifiedOnChain: false,
      confirmations: 0,
      commitmentHex: expectedHex,
      reason: data?.error || "Transaction not found on BCH Electrum"
    };
  }
  const opReturns = data.opReturns || [];
  const matched = opReturns.find(
    (o) => String(o.payloadHex || "").toLowerCase().includes(expectedHex) || String(o.scriptHex || "").toLowerCase().includes(expectedHex)
  );
  return {
    verifiedOnChain: Boolean(matched),
    confirmations: Number(data.confirmations || 0),
    commitmentHex: expectedHex,
    ...matched ? { matchedScriptHex: matched.scriptHex } : {},
    ...matched ? {} : { reason: "No matching UL1 SHA-256 OP_RETURN commitment found in transaction outputs" }
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  USERLINK_ATTESTATION_LABEL,
  USERLINK_D_TAG,
  USERLINK_PROTOCOL_ID,
  USERLINK_RELAYS,
  base64ToBytes,
  bitcoinMessageHash,
  buildBchOpReturnScriptHex,
  buildUserLinkDidDocument,
  buildUserLinkEventTemplate,
  bytesToBase64,
  computeUserLinkCommitmentHash,
  convertCashAddressNetwork,
  createAuthChallenge,
  createSaltedDisclosureCommitment,
  createSignedAttestationEvent,
  createUserLinkStatement,
  decodeCashAddress,
  encodeCashAddress,
  fetchAttestationsFromRelays,
  hash160,
  isValidCashAddress,
  pubkeyToCashAddress,
  publishUserLinkToRelay,
  resolveUserLinkFromRelays,
  signBitcoinMessage,
  verifyAttestationEvent,
  verifyAuthChallengeEvent,
  verifyBchOnChainAnchor,
  verifyBitcoinMessageAndAddress,
  verifySelectiveDisclosure,
  verifyUserLinkEvent
});
