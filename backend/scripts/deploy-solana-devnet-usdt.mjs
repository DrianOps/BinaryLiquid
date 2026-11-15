import { Connection, Keypair, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from '@solana/spl-token';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('--- BinaryLiquid Solana Devnet SPL USDT Deployer ---');
  const keypairPath = path.join(__dirname, '../config/solana-authority.json');
  if (!fs.existsSync(keypairPath)) {
    throw new Error('Keypair file not found at ' + keypairPath);
  }
  const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(keypairPath, 'utf8')));
  const authority = Keypair.fromSecretKey(secretKey);
  console.log('Authority Wallet:', authority.publicKey.toBase58());

  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
  const balance = await connection.getBalance(authority.publicKey);
  console.log('Current SOL Balance:', balance / 1e9, 'SOL');

  if (balance < 0.1 * 1e9) {
    console.log('⚠️ Insufficient SOL to create mint. Please send at least 0.5 SOL to:', authority.publicKey.toBase58());
    return;
  }

  console.log('1. Creating SPL Token Mint (USDT - 6 decimals)...');
  const mint = await createMint(
    connection,
    authority,
    authority.publicKey, // mint authority
    authority.publicKey, // freeze authority
    6 // 6 decimals like real USDT
  );
  console.log('✅ Token Mint created:', mint.toBase58());

  console.log('2. Creating Vault ATA...');
  const vaultAta = await getOrCreateAssociatedTokenAccount(
    connection,
    authority,
    mint,
    authority.publicKey
  );
  console.log('✅ Vault ATA:', vaultAta.address.toBase58());

  console.log('3. Minting 1,000,000 USDT to Vault...');
  await mintTo(
    connection,
    authority,
    mint,
    vaultAta.address,
    authority,
    1_000_000 * 10 ** 6
  );
  console.log('✅ Minted 1,000,000 USDT to Vault ATA!');

  // Also mint to user's address if provided
  const userAddressStr = '5V41TxyvJcuXAqEsUMWuQZVy2zAWGHU4xfq6GCXribY2';
  try {
    const userPubkey = new PublicKey(userAddressStr);
    console.log('4. Creating ATA for User:', userAddressStr);
    const userAta = await getOrCreateAssociatedTokenAccount(
      connection,
      authority,
      mint,
      userPubkey
    );
    console.log('✅ User ATA created:', userAta.address.toBase58());
    console.log('5. Dispensing 1,000 USDT to User...');
    await mintTo(
      connection,
      authority,
      mint,
      userAta.address,
      authority,
      1_000 * 10 ** 6
    );
    console.log('🎉 Dispensed 1,000 USDT to User on Solana Devnet!');
  } catch (err) {
    console.warn('Could not auto-mint to user:', err.message);
  }

  // Save info
  const deploymentInfo = {
    network: 'devnet',
    mint: mint.toBase58(),
    decimals: 6,
    symbol: 'USDT',
    name: 'Tether USD (Devnet SPL)',
    authority: authority.publicKey.toBase58(),
    vaultAta: vaultAta.address.toBase58(),
    createdAt: new Date().toISOString()
  };
  fs.writeFileSync(path.join(__dirname, '../config/solana-devnet-token.json'), JSON.stringify(deploymentInfo, null, 2));
  console.log('Deployment info saved to config/solana-devnet-token.json');
}

main().catch(err => {
  console.error('Deployment failed:', err);
});
