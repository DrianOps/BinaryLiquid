import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Contract, MockNetworkProvider, SignatureTemplate, TransactionBuilder, randomUtxo } from 'cashscript';
import {
  cashAddressToLockingBytecode,
  encodeCashAddress,
  hash160,
  secp256k1
} from '@bitauth/libauth';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const marketArtifact = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'bch/artifacts/UserLinkHandleMarket.json'), 'utf8')
);
const mintArtifact = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'bch/artifacts/UserLinkHandleMint.json'), 'utf8')
);

function makeWallet(seedHex) {
  const priv = Uint8Array.from(Buffer.from(seedHex, 'hex'));
  const pub = secp256k1.derivePublicKeyCompressed(priv);
  if (typeof pub === 'string') throw new Error(pub);
  const pkh = hash160(pub);
  const addr = encodeCashAddress({ prefix: 'bchtest', type: 'p2pkh', payload: pkh });
  const tokenAddr = encodeCashAddress({ prefix: 'bchtest', type: 'p2pkhWithTokens', payload: pkh });
  if (typeof addr === 'string' || typeof tokenAddr === 'string') throw new Error('Failed encoding addr');
  const lock = cashAddressToLockingBytecode(addr.address);
  if (typeof lock === 'string') throw new Error(lock);
  return {
    priv,
    pub,
    pkh,
    address: addr.address,
    tokenAddress: tokenAddr.address,
    lockingBytecode: lock.bytecode,
    sigTemplate: new SignatureTemplate(priv)
  };
}

function sha256d(buf) {
  return crypto.createHash('sha256').update(crypto.createHash('sha256').update(buf).digest()).digest();
}

async function runTests() {
  const seller = makeWallet('11'.repeat(32));
  const buyer = makeWallet('22'.repeat(32));
  const treasury = makeWallet('33'.repeat(32));

  const categoryHex = 'aa'.repeat(32);
  const handleCommitmentBytes = Buffer.from('UL1:cash', 'utf8');
  const handleCommitmentHex = handleCommitmentBytes.toString('hex');
  const priceSats = 100_000n; // 0.001 BCH
  const protocolFeeBps = 200n; // 2% -> 2,000 sats
  const expiryTimestamp = 1_800_000_000n;

  // =========================================================================
  // 1. UserLinkHandleMarket.cash (Atomic Secondary Marketplace Covenant)
  // =========================================================================
  const provider = new MockNetworkProvider();
  const market = new Contract(
    marketArtifact,
    [
      seller.pkh,
      seller.lockingBytecode,
      treasury.lockingBytecode,
      priceSats,
      protocolFeeBps,
      handleCommitmentBytes,
      expiryTimestamp
    ],
    { provider, addressType: 'p2sh32' }
  );
  assert.ok(market.tokenAddress.startsWith('bchtest:r'), 'Market must be P2SH-32 token-aware address');

  // Fund market with Handle NFT (`UL1:cash`) + fund buyer with BCH
  provider.addUtxo(
    market.tokenAddress,
    randomUtxo({
      satoshis: 1000n,
      token: {
        category: categoryHex,
        amount: 0n,
        nft: { capability: 'none', commitment: handleCommitmentHex }
      }
    })
  );
  provider.addUtxo(buyer.address, randomUtxo({ satoshis: 200_000n }));
  const [listingUtxo] = await provider.getUtxos(market.tokenAddress);
  const [buyerBchUtxo] = await provider.getUtxos(buyer.address);

  // 1a. Negative test: underpaying seller by 1 satoshi MUST fail on BCH VM
  let underpayRejected = false;
  try {
    await new TransactionBuilder({ provider })
      .addInput(listingUtxo, market.unlock.buyHandle())
      .addInput(buyerBchUtxo, buyer.sigTemplate.unlockP2PKH())
      .addOutput({ to: seller.address, amount: 97_999n }) // 1 sat short of 98,000
      .addOutput({ to: treasury.address, amount: 2_000n })
      .addOutput({
        to: buyer.tokenAddress,
        amount: 1_000n,
        token: {
          category: categoryHex,
          amount: 0n,
          nft: { capability: 'none', commitment: handleCommitmentHex }
        }
      })
      .addOutput({ to: buyer.address, amount: 98_000n })
      .send();
  } catch {
    underpayRejected = true;
  }
  assert.equal(underpayRejected, true, 'Underpaying seller by 1 satoshi must be rejected by BCH VM');

  // 1b. Positive test: atomic buyHandle() succeeds on BCH VM!
  const buyTx = await new TransactionBuilder({ provider })
    .addInput(listingUtxo, market.unlock.buyHandle())
    .addInput(buyerBchUtxo, buyer.sigTemplate.unlockP2PKH())
    .addOutput({ to: seller.address, amount: 98_000n })
    .addOutput({ to: treasury.address, amount: 2_000n })
    .addOutput({
      to: buyer.tokenAddress,
      amount: 1_000n,
      token: {
        category: categoryHex,
        amount: 0n,
        nft: { capability: 'none', commitment: handleCommitmentHex }
      }
    })
    .addOutput({ to: buyer.address, amount: 98_500n })
    .send();
  assert.ok(buyTx.txid && buyTx.txid.length === 64, 'Atomic buyHandle() tx must execute on BCH VM');

  // 1c. Positive test: seller cancelListing() returns NFT to seller
  provider.addUtxo(
    market.tokenAddress,
    randomUtxo({
      satoshis: 2_500n,
      token: {
        category: categoryHex,
        amount: 0n,
        nft: { capability: 'none', commitment: handleCommitmentHex }
      }
    })
  );
  const cancelUtxo = (await provider.getUtxos(market.tokenAddress)).at(-1);
  const cancelTx = await new TransactionBuilder({ provider })
    .addInput(cancelUtxo, market.unlock.cancelListing(seller.sigTemplate, seller.pub))
    .addOutput({
      to: seller.tokenAddress,
      amount: 1_000n,
      token: {
        category: categoryHex,
        amount: 0n,
        nft: { capability: 'none', commitment: handleCommitmentHex }
      }
    })
    .send();
  assert.ok(cancelTx.txid && cancelTx.txid.length === 64, 'Seller cancelListing() must execute on BCH VM');

  // 1d. Positive test: permissionless reclaimExpired() after expiryTimestamp
  provider.addUtxo(
    market.tokenAddress,
    randomUtxo({
      satoshis: 2_500n,
      token: {
        category: categoryHex,
        amount: 0n,
        nft: { capability: 'none', commitment: handleCommitmentHex }
      }
    })
  );
  const expiredUtxo = (await provider.getUtxos(market.tokenAddress)).at(-1);
  const reclaimTx = await new TransactionBuilder({ provider })
    .setLocktime(Number(expiryTimestamp) + 60)
    .addInput(expiredUtxo, market.unlock.reclaimExpired())
    .addOutput({
      to: seller.tokenAddress,
      amount: 1_000n,
      token: {
        category: categoryHex,
        amount: 0n,
        nft: { capability: 'none', commitment: handleCommitmentHex }
      }
    })
    .send();
  assert.ok(reclaimTx.txid && reclaimTx.txid.length === 64, 'reclaimExpired() must execute on BCH VM');

  // =========================================================================
  // 2. UserLinkHandleMint.cash (Tiered Anti-Spam Commit-Reveal Minter Covenant)
  // =========================================================================
  const handle3 = Buffer.from('bch', 'utf8');
  const salt = Buffer.from('44'.repeat(32), 'hex');
  const commitHash = sha256d(Buffer.concat([salt, handle3, Buffer.from(buyer.lockingBytecode)]));
  const minRevealTime = 1_750_000_000n;
  const tier13Sats = 300_000n;
  const tier4Sats = 50_000n;
  const tier5Sats = 10_000n;
  const tier6PlusSats = 2_000n;

  const minter = new Contract(
    mintArtifact,
    [
      treasury.lockingBytecode,
      tier13Sats,
      tier4Sats,
      tier5Sats,
      tier6PlusSats,
      commitHash,
      minRevealTime
    ],
    { provider, addressType: 'p2sh32' }
  );

  provider.addUtxo(
    minter.tokenAddress,
    randomUtxo({
      satoshis: 1_500n,
      token: {
        category: categoryHex,
        amount: 0n,
        nft: { capability: 'minting', commitment: '' }
      }
    })
  );
  provider.addUtxo(buyer.address, randomUtxo({ satoshis: 400_000n }));
  const [mintingNftUtxo] = await provider.getUtxos(minter.tokenAddress);
  const buyerMintBch = (await provider.getUtxos(buyer.address)).find((u) => u.satoshis === 400_000n);

  // 2a. Negative test: paying 6-char fee for 3-char handle ("bch") MUST fail on BCH VM
  let tierBypassRejected = false;
  try {
    await new TransactionBuilder({ provider })
      .setLocktime(Number(minRevealTime) + 10)
      .addInput(mintingNftUtxo, minter.unlock.mintHandle(handle3, salt, buyer.lockingBytecode))
      .addInput(buyerMintBch, buyer.sigTemplate.unlockP2PKH())
      .addOutput({
        to: minter.tokenAddress,
        amount: 1_500n,
        token: { category: categoryHex, amount: 0n, nft: { capability: 'minting', commitment: '' } }
      })
      .addOutput({
        to: buyer.tokenAddress,
        amount: 1_000n,
        token: {
          category: categoryHex,
          amount: 0n,
          nft: { capability: 'none', commitment: Buffer.from('UL1:bch', 'utf8').toString('hex') }
        }
      })
      .addOutput({ to: treasury.address, amount: tier6PlusSats }) // underpaying 3-char tier!
      .addOutput({ to: buyer.address, amount: 396_000n })
      .send();
  } catch {
    tierBypassRejected = true;
  }
  assert.equal(tierBypassRejected, true, 'Underpaying 3-char anti-spam tier MUST be rejected by BCH VM');

  // 2b. Negative test: wrong salt / frontrunning attacker trying to redirect recipient MUST fail
  let frontrunRejected = false;
  try {
    await new TransactionBuilder({ provider })
      .setLocktime(Number(minRevealTime) + 10)
      .addInput(mintingNftUtxo, minter.unlock.mintHandle(handle3, salt, seller.lockingBytecode))
      .addInput(buyerMintBch, buyer.sigTemplate.unlockP2PKH())
      .addOutput({
        to: minter.tokenAddress,
        amount: 1_500n,
        token: { category: categoryHex, amount: 0n, nft: { capability: 'minting', commitment: '' } }
      })
      .addOutput({
        to: seller.tokenAddress,
        amount: 1_000n,
        token: {
          category: categoryHex,
          amount: 0n,
          nft: { capability: 'none', commitment: Buffer.from('UL1:bch', 'utf8').toString('hex') }
        }
      })
      .addOutput({ to: treasury.address, amount: tier13Sats })
      .addOutput({ to: buyer.address, amount: 96_000n })
      .send();
  } catch {
    frontrunRejected = true;
  }
  assert.equal(frontrunRejected, true, 'Commit-reveal frontrunning attempt MUST be rejected by BCH VM');

  // 2c. Positive test: valid tiered commit-reveal minting succeeds on BCH VM!
  const mintTx = await new TransactionBuilder({ provider })
    .setLocktime(Number(minRevealTime) + 10)
    .addInput(mintingNftUtxo, minter.unlock.mintHandle(handle3, salt, buyer.lockingBytecode))
    .addInput(buyerMintBch, buyer.sigTemplate.unlockP2PKH())
    .addOutput({
      to: minter.tokenAddress,
      amount: 1_500n,
      token: { category: categoryHex, amount: 0n, nft: { capability: 'minting', commitment: '' } }
    })
    .addOutput({
      to: buyer.tokenAddress,
      amount: 1_000n,
      token: {
        category: categoryHex,
        amount: 0n,
        nft: { capability: 'none', commitment: Buffer.from('UL1:bch', 'utf8').toString('hex') }
      }
    })
    .addOutput({ to: treasury.address, amount: tier13Sats })
    .addOutput({ to: buyer.address, amount: 97_000n })
    .send();
  assert.ok(mintTx.txid && mintTx.txid.length === 64, 'Tiered commit-reveal mintHandle() must execute on BCH VM');

  console.log('✅ UserLinkHandleMarket.cash & UserLinkHandleMint.cash BCH VM test suite PASSED (6/6 VM checks)');
}

runTests().catch((err) => {
  console.error('❌ BCH VM contract test failed:', err);
  process.exit(1);
});
