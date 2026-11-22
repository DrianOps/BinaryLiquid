const assert = require('node:assert/strict');
const sdk = require('../dist/index.cjs');

assert.equal(typeof sdk.resolveUserLinkFromRelays, 'function');
assert.equal(typeof sdk.verifyUserLinkEvent, 'function');
assert.equal(typeof sdk.verifyBitcoinMessageAndAddress, 'function');
assert.equal(typeof sdk.createUserLinkStatement, 'function');
assert.equal(typeof sdk.buildUserLinkEventTemplate, 'function');
assert.equal(typeof sdk.buildUserLinkDidDocument, 'function');
assert.equal(typeof sdk.createAuthChallenge, 'function');
assert.equal(typeof sdk.verifyAuthChallengeEvent, 'function');
assert.equal(typeof sdk.createSignedAttestationEvent, 'function');
assert.equal(typeof sdk.verifyAttestationEvent, 'function');
assert.equal(typeof sdk.verifySelectiveDisclosure, 'function');
assert.equal(typeof sdk.buildBchOpReturnScriptHex, 'function');
assert.equal(typeof sdk.verifyBchOnChainAnchor, 'function');

const h = sdk.computeUserLinkCommitmentHash('{"protocol":"bch-nostr-userlink-id-v1"}');
assert.match(h, /^[0-9a-f]{64}$/);
assert.equal(sdk.buildBchOpReturnScriptHex('{"protocol":"bch-nostr-userlink-id-v1"}'), `6a24554c313a${h}`);

console.log('✅ @binaryliquid/userlink-sdk CommonJS bundle verified');
