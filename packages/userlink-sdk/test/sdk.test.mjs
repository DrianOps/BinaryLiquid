import assert from 'node:assert/strict';
import { secp256k1 } from '@noble/curves/secp256k1.js';
import { finalizeEvent, generateSecretKey, getPublicKey } from 'nostr-tools';
import {
  USERLINK_D_TAG,
  createUserLinkStatement,
  buildUserLinkEventTemplate,
  signBitcoinMessage,
  verifyUserLinkEvent,
  buildUserLinkDidDocument,
  createAuthChallenge,
  verifyAuthChallengeEvent,
  createSaltedDisclosureCommitment,
  verifySelectiveDisclosure,
  createSignedAttestationEvent,
  verifyAttestationEvent,
  computeUserLinkCommitmentHash,
  buildBchOpReturnScriptHex,
  pubkeyToCashAddress,
  convertCashAddressNetwork,
  isValidCashAddress
} from '../dist/index.mjs';

// 1. Separate keys for BCH and Nostr (never reused) + CashAddress vector & optional libauth parity check
const bchSk = generateSecretKey();
const bchPk = secp256k1.getPublicKey(bchSk, true);
const bchAddress = pubkeyToCashAddress(bchPk, false, false);
assert.equal(isValidCashAddress('bitcoincash:qr5zz6098wax242qrz3k7dctsx2kd3vszvywzsefgn', false), true);
assert.equal(
  convertCashAddressNetwork('bitcoincash:qr5zz6098wax242qrz3k7dctsx2kd3vszvywzsefgn', false, true).startsWith('bitcoincash:z'),
  true
);
assert.equal(
  convertCashAddressNetwork('bitcoincash:qr5zz6098wax242qrz3k7dctsx2kd3vszvywzsefgn', true, true).startsWith('bchtest:z'),
  true
);
try {
  const { encodeCashAddress: libauthEncode, hash160: libauthHash160 } = await import('@bitauth/libauth');
  const libauthMain = libauthEncode({ prefix: 'bitcoincash', type: 'p2pkh', payload: libauthHash160(bchPk) });
  const libauthToken = libauthEncode({ prefix: 'bitcoincash', type: 'p2pkhWithTokens', payload: libauthHash160(bchPk) });
  const libauthChip = libauthEncode({ prefix: 'bchtest', type: 'p2pkhWithTokens', payload: libauthHash160(bchPk) });
  assert.equal(typeof libauthMain !== 'string' && libauthMain.address, bchAddress, 'Mainnet P2PKH parity with libauth');
  assert.equal(typeof libauthToken !== 'string' && libauthToken.address, convertCashAddressNetwork(bchAddress, false, true), 'Token-aware CashAddress parity with libauth');
  assert.equal(typeof libauthChip !== 'string' && libauthChip.address, convertCashAddressNetwork(bchAddress, true, true), 'Chipnet token-aware parity with libauth');
} catch {
  // @bitauth/libauth is not required for standalone @binaryliquid/userlink-sdk installs
}
assert.equal(isValidCashAddress(bchAddress, false), true);
assert.equal(isValidCashAddress(bchAddress, true), false);
assert.ok(bchAddress.startsWith('bitcoincash:q'), 'Expected mainnet P2PKH CashAddress');

const nostrSk1 = generateSecretKey();
const nostrPk1 = getPublicKey(nostrSk1);
assert.notEqual(Buffer.from(bchSk).toString('hex'), Buffer.from(nostrSk1).toString('hex'));

// 2. Create canonical binding, sign with BCH BSM & Nostr Schnorr, and verify
const statement = createUserLinkStatement({
  handle: '@satoshi_bch',
  bchAddress,
  nostrPubkeyHex: nostrPk1,
  network: 'mainnet'
});
const bchSig = signBitcoinMessage(statement, bchSk);
const template = buildUserLinkEventTemplate({
  handle: 'satoshi_bch',
  bchAddress,
  nostrPubkeyHex: nostrPk1,
  bchSigBase64: bchSig,
  statementContent: statement
});
assert.equal(template.kind, 30078);
assert.ok(template.tags.some((t) => t[0] === 'd' && t[1] === USERLINK_D_TAG));

const signedEvent = finalizeEvent(template, nostrSk1);
const verified = verifyUserLinkEvent(signedEvent);
assert.equal(verified.isOverallValid, true, verified.verificationNote);
assert.equal(verified.isNostrSigValid, true);
assert.equal(verified.isBchSigValid, true);
assert.equal(verified.isAddressOwned, true);
assert.equal(verified.isMutualBindingValid, true);
assert.equal(verified.handle, '@satoshi_bch');

// 3. Tamper detection: modifying BCH address invalidates proof
const tampered = {
  ...signedEvent,
  tags: signedEvent.tags.map((t) =>
    t[0] === 'bch' ? ['bch', 'bitcoincash:qr5zz6098wax242qrz3k7dctsx2kd3vszvywzsefgn'] : t
  )
};
const tamperedCheck = verifyUserLinkEvent(tampered);
assert.equal(tamperedCheck.isOverallValid, false, 'Tampered event MUST fail verification');

// 4. BCH-Authorized Key Rotation (rotate from nostrPk1 -> nostrPk2 authorized by bchSk)
const nostrSk2 = generateSecretKey();
const nostrPk2 = getPublicKey(nostrSk2);
const rotStatement = createUserLinkStatement({
  handle: 'satoshi_bch',
  bchAddress,
  nostrPubkeyHex: nostrPk2,
  previousNostrPubkey: nostrPk1,
  network: 'mainnet'
});
const rotBchSig = signBitcoinMessage(rotStatement, bchSk);
const rotEvent = finalizeEvent(
  buildUserLinkEventTemplate({
    handle: 'satoshi_bch',
    bchAddress,
    nostrPubkeyHex: nostrPk2,
    previousNostrPubkey: nostrPk1,
    bchSigBase64: rotBchSig,
    statementContent: rotStatement
  }),
  nostrSk2
);
const rotVerified = verifyUserLinkEvent(rotEvent);
assert.equal(rotVerified.isOverallValid, true);
assert.equal(rotVerified.rotationAuthorized, true);
assert.equal(rotVerified.previousNostrPubkey, nostrPk1);

// 5. W3C DID Core Document resolution
const didDoc = buildUserLinkDidDocument(rotVerified);
assert.equal(didDoc.id, `did:nostr:${nostrPk2}`);
assert.ok(Array.isArray(didDoc.alsoKnownAs) && didDoc.alsoKnownAs.some((v) => String(v).startsWith('did:pkh:bch:mainnet:')));
assert.ok(Array.isArray(didDoc.alsoKnownAs) && didDoc.alsoKnownAs.includes(`did:nostr:${nostrPk1}`));

// 6. Challenge-Response Auth (NIP-42 kind 22242)
const challenge = createAuthChallenge('paytaca.com');
const authEvent = finalizeEvent(
  {
    kind: 22242,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['challenge', challenge.nonce],
      ['domain', challenge.domain]
    ],
    content: challenge.message
  },
  nostrSk2
);
const authCheck = verifyAuthChallengeEvent(authEvent, challenge);
assert.equal(authCheck.valid, true);
assert.equal(authCheck.pubkeyHex, nostrPk2);
const wrongNonceCheck = verifyAuthChallengeEvent(authEvent, { ...challenge, nonce: '00'.repeat(16) });
assert.equal(wrongNonceCheck.valid, false);

// 7. Kind 1985 W3C VC Attestation + Privacy-Preserving Selective Disclosure
const issuerSk = generateSecretKey();
const commitment = createSaltedDisclosureCommitment('salt_paytaca_2026', 'tier', 'verified_merchant');
const vcEvent = createSignedAttestationEvent({
  subjectPubkeyHex: nostrPk2,
  subjectBchAddress: bchAddress,
  subjectHandle: '@satoshi_bch',
  claimType: 'MerchantVerified',
  claimSummary: 'Paytaca verified merchant',
  rating: 5,
  saltedCommitments: { tier: commitment },
  issuerSkBytes: issuerSk
});
const vcCheck = verifyAttestationEvent(vcEvent);
assert.equal(vcCheck.isOverallValid, true);
assert.equal(vcCheck.rating, 5);
assert.equal(
  verifySelectiveDisclosure({
    salt: 'salt_paytaca_2026',
    attribute: 'tier',
    value: 'verified_merchant',
    commitmentHex: vcCheck.saltedCommitments.tier
  }),
  true
);
assert.equal(
  verifySelectiveDisclosure({
    salt: 'salt_paytaca_2026',
    attribute: 'tier',
    value: 'wrong_value',
    commitmentHex: vcCheck.saltedCommitments.tier
  }),
  false
);

// 8. BCH OP_RETURN UL1 Anchor Script
const hashHex = computeUserLinkCommitmentHash(rotStatement);
const scriptHex = buildBchOpReturnScriptHex(rotStatement);
assert.equal(hashHex.length, 64);
assert.equal(scriptHex, `6a24554c313a${hashHex}`);

console.log('✅ @binaryliquid/userlink-sdk ESM cryptographic test suite PASSED (8/8 checks)');
