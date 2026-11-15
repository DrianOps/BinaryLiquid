import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { getAccount, getAssociatedTokenAddress, getOrCreateAssociatedTokenAccount, mintTo } from '@solana/spl-token';
import { config } from '../config.js';
import { db } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * @file solanaService.js
 * @description Non-Custodial Solana SVM Service for BinaryLiquid Protocol.
 * Handles on-chain SPL Token operations on Solana Devnet and Anchor PDA attestation.
 */
class SolanaService {
  constructor() {
    this.programId = config.solana?.programId || 'BLiqVau1tSo1anaCrossChainBridge111111111111';
    this.mainnetRpcUrl = config.solana?.rpcUrl || 'https://solana-rpc.publicnode.com';
    this.devnetRpcUrl = config.solana?.devnetRpcUrl || 'https://api.devnet.solana.com';
    this.vaultAddress = config.solana?.vaultAddress || '7QRhmj6TeGXbPKDD4otBJ23kTv6F2wydkuvtRQ6RRWfT';
    this.devnetVaultAddress = config.solana?.devnetVaultAddress || '2VGPfWsD8KU1mddNCrMsxiqK4eqgZV2cW38dLRYvHzYN';
    this.coldTreasuryAddress = config.solana?.coldTreasuryAddress || '5V41TxyvJcuXAqEsUMWuQZVy2zAWGHU4xfq6GCXribY2';
    this.authorityKeypair = null;

    this.initAuthority();

    console.log(
      `[Solana SVM] 🛡️ Non-Custodial Anchor Vault: ${this.vaultAddress} | Devnet: ${this.devnetVaultAddress} (Cold Treasury: ${this.coldTreasuryAddress})`
    );
  }

  initAuthority() {
    try {
      const keypairPath = path.resolve(__dirname, '../config/solana-authority.json');
      if (fs.existsSync(keypairPath)) {
        const raw = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
        this.authorityKeypair = Keypair.fromSecretKey(Uint8Array.from(raw));
        console.log(`[Solana SVM] 🔑 Loaded Authority/Vault Keypair: ${this.authorityKeypair.publicKey.toBase58()}`);
      }
    } catch (e) {
      console.warn('[Solana SVM] Could not load authority keypair:', e.message);
    }
  }

  isSolanaChain(chain = '') {
    const c = String(chain || '').toLowerCase();
    return c.includes('solana') || c === 'sol' || c.includes('svm');
  }

  isDevnetChain(chain = '') {
    const c = String(chain || '').toLowerCase();
    return c.includes('devnet') || c.includes('testnet') || c.includes('solana_devnet');
  }

  getRpcCandidates(chain = 'solana-mainnet') {
    const isDev = this.isDevnetChain(chain);
    const primary = isDev ? this.devnetRpcUrl : this.mainnetRpcUrl;
    const list = isDev
      ? [primary, 'https://api.devnet.solana.com']
      : [primary, 'https://solana-rpc.publicnode.com', 'https://api.mainnet-beta.solana.com'];
    return Array.from(new Set(list.filter(Boolean)));
  }

  getRpcUrl(chain = 'solana-mainnet') {
    return this.getRpcCandidates(chain)[0];
  }

  getVaultAddress(chain = 'solana-mainnet') {
    if (this.isDevnetChain(chain)) {
      return this.devnetVaultAddress;
    }
    return this.vaultAddress;
  }

  getDepositAddress(chain = 'solana-mainnet') {
    return this.getVaultAddress(chain);
  }

  getTokenConfig(tokenSymbol = 'USDC', chain = 'solana-mainnet') {
    const sym = String(tokenSymbol || 'USDC').toUpperCase();
    const isDev = this.isDevnetChain(chain);
    const tok = config.solana?.tokens?.[sym] || config.solana?.tokens?.USDC || {
      name: 'USD Coin (Solana SPL)',
      symbol: 'USDC',
      mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      devnetMint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
      decimals: 6
    };

    const activeMint = isDev && tok.devnetMint ? tok.devnetMint : tok.mint;
    return {
      ...tok,
      mint: activeMint,
      address: activeMint
    };
  }

  async rpcCall(method, params = [], chain = 'solana-mainnet') {
    const urls = this.getRpcCandidates(chain);
    let lastError = null;
    for (const url of urls) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(10000),
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method,
            params
          })
        });
        if (!res.ok) {
          throw new Error(`Solana RPC HTTP ${res.status} (${url})`);
        }
        const json = await res.json();
        if (json.error) {
          throw new Error(json.error.message || 'Solana JSON-RPC error');
        }
        return json.result;
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError || new Error('All Solana RPC endpoints failed');
  }

  async _withConnection(chain, operationFn) {
    const urls = this.getRpcCandidates(chain);
    let lastError = null;
    for (const url of urls) {
      try {
        const connection = new Connection(url, 'confirmed');
        return await operationFn(connection, url);
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError || new Error('All Solana RPC connections failed');
  }

  /**
   * Verifies an inbound SPL Token or native SOL deposit into the Non-Custodial Solana Vault
   */
  async verifyDeposit(txSignature, expectedAmount, tokenSymbol = 'USDC', expectedVault = null, chain = 'solana-mainnet') {
    if (!txSignature) {
      return { verified: false, reason: 'Missing Solana transaction signature' };
    }
    const expectedNum = Number(expectedAmount);
    if (!Number.isFinite(expectedNum) || expectedNum <= 0) {
      return { verified: false, reason: `Invalid expected Solana amount (${expectedAmount})` };
    }

    const sig = String(txSignature).trim();
    const targetVault = expectedVault || this.getVaultAddress(chain);
    const tokenCfg = this.getTokenConfig(tokenSymbol, chain);
    const upperSym = String(tokenSymbol || 'USDC').toUpperCase();

    if (!tokenCfg?.mint && upperSym !== 'SOL') {
      return { verified: false, reason: `Solana token ${upperSym} not configured for ${chain}` };
    }

    try {
      const tx = await this.rpcCall(
        'getTransaction',
        [sig, { encoding: 'jsonParsed', commitment: 'confirmed', maxSupportedTransactionVersion: 0 }],
        chain
      );

      if (!tx) {
        if (config.simulateIfNoFunds) {
          return {
            verified: true,
            simulated: true,
            txHash: sig,
            depositId: `0x${crypto.createHash('sha256').update(sig).digest('hex')}`,
            amount: expectedNum
          };
        }
        return { verified: false, reason: 'Solana transaction not confirmed on-chain yet' };
      }

      if (tx.meta?.err) {
        return { verified: false, reason: `Solana transaction failed on-chain: ${JSON.stringify(tx.meta.err)}` };
      }

      const postBalances = tx.meta?.postTokenBalances || [];
      const preBalances = tx.meta?.preTokenBalances || [];

      if (tokenCfg?.mint) {
        for (const post of postBalances) {
          if (
            post.owner === targetVault &&
            post.mint === tokenCfg.mint &&
            post.uiTokenAmount?.uiAmount !== undefined
          ) {
            const pre = preBalances.find(p => p.accountIndex === post.accountIndex);
            const preUi = pre?.uiTokenAmount?.uiAmount || 0;
            const delta = post.uiTokenAmount.uiAmount - preUi;
            if (delta + 1e-6 >= expectedNum * 0.99) {
              return {
                verified: true,
                onChain: true,
                txHash: sig,
                depositId: `0x${crypto.createHash('sha256').update(sig).digest('hex')}`,
                amount: delta
              };
            }
          }
        }
      }

      // Check native SOL lamport balance delta when depositing SOL
      if (upperSym === 'SOL') {
        const accountKeys = (tx.transaction?.message?.accountKeys || []).map(k =>
          typeof k === 'string' ? k : k?.pubkey
        );
        const targetIdx = accountKeys.indexOf(targetVault);
        if (targetIdx !== -1 && Array.isArray(tx.meta?.preBalances) && Array.isArray(tx.meta?.postBalances)) {
          const preLamports = Number(tx.meta.preBalances[targetIdx] || 0);
          const postLamports = Number(tx.meta.postBalances[targetIdx] || 0);
          const deltaSol = (postLamports - preLamports) / 1e9;
          if (deltaSol + 1e-9 >= expectedNum * 0.99) {
            return {
              verified: true,
              onChain: true,
              txHash: sig,
              depositId: `0x${crypto.createHash('sha256').update(sig).digest('hex')}`,
              amount: deltaSol
            };
          }
        }
      }

      return {
        verified: false,
        reason: `Solana TX ${sig.slice(0, 12)}... did not transfer ${expectedNum} ${upperSym} to Vault ${targetVault}`
      };
    } catch (err) {
      if (config.simulateIfNoFunds) {
        return {
          verified: true,
          simulated: true,
          txHash: sig,
          depositId: `0x${crypto.createHash('sha256').update(sig).digest('hex')}`,
          amount: expectedNum
        };
      }
      return { verified: false, reason: `Solana RPC verification error: ${err.message}` };
    }
  }

  /**
   * Releases SPL Tokens from the Solana Vault:
   * On Devnet, executes a REAL on-chain mint / SPL transfer to recipient's ATA!
   */
  async releaseFromVault({
    bchTxHashBytes32,
    recipientAddress,
    amount,
    tokenSymbol = 'USDT',
    chain = 'solana-devnet',
    nonce,
    watchmanSignature
  }) {
    const isDev = this.isDevnetChain(chain);
    const tokenCfg = this.getTokenConfig(tokenSymbol, chain);
    const clusterParam = isDev ? '?cluster=devnet' : '';

    try {
      if (!recipientAddress) {
        throw new Error('Missing recipient address for Solana release');
      }

      // 1. Real on-chain Devnet SPL Token release
      if (isDev && this.authorityKeypair && tokenCfg.mint) {
        console.log(
          `[Solana Devnet] 🚀 Releasing real on-chain ${amount} ${tokenSymbol} (${tokenCfg.mint}) -> ${recipientAddress}...`
        );
        const txSig = await this._withConnection('solana-devnet', async connection => {
          const mintPubkey = new PublicKey(tokenCfg.mint);
          const recipientPubkey = new PublicKey(recipientAddress);

          const recipientAta = await getOrCreateAssociatedTokenAccount(
            connection,
            this.authorityKeypair,
            mintPubkey,
            recipientPubkey
          );

          const decimals = tokenCfg.decimals || 6;
          const rawAmount = BigInt(Math.round(Number(amount) * 10 ** decimals));

          return await mintTo(
            connection,
            this.authorityKeypair,
            mintPubkey,
            recipientAta.address,
            this.authorityKeypair,
            rawAmount
          );
        });

        console.log(`[Solana Devnet] ✅ Real SPL token release confirmed! TX: ${txSig}`);
        const explorerUrl = `https://solscan.io/tx/${txSig}${clusterParam}`;

        db.logEvent('SOLANA_VAULT_RELEASE', `Released on-chain ${amount} ${tokenSymbol} to ${recipientAddress}`, {
          txSignature: txSig,
          recipient: recipientAddress,
          mint: tokenCfg.mint,
          amount
        });

        return {
          success: true,
          onChain: true,
          txHash: txSig,
          explorerUrl
        };
      }

      // 2. Non-Devnet Mainnet release requires explicit live relayer or SIMULATE_IF_NO_FUNDS mode
      if (!config.simulateIfNoFunds) {
        throw new Error(
          `Solana ${isDev ? 'Devnet' : 'Mainnet'} Vault Anchor release requires funded authority signer / live RPC settlement (simulated release disabled)`
        );
      }

      if (!watchmanSignature) {
        throw new Error('Missing Watchman Ed25519 cryptographic attestation');
      }

      const rawHash = crypto
        .createHash('sha256')
        .update(`SOLANA_RELEASE:${bchTxHashBytes32}:${recipientAddress}:${amount}:${nonce}:${watchmanSignature}`)
        .digest();

      const base58Alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
      const combined = Buffer.concat([rawHash, crypto.createHash('sha256').update(rawHash).digest()]);
      let sigBase58 = '';
      for (let i = 0; i < 64; i++) {
        sigBase58 += base58Alphabet[combined[i % combined.length] % 58];
      }

      const explorerUrl = `${config.solana?.explorerUrl || 'https://solscan.io'}/tx/${sigBase58}${clusterParam}`;

      db.logEvent('SOLANA_VAULT_RELEASE_SIMULATED', `Simulated ${amount} ${tokenSymbol} release`, {
        programId: this.programId,
        vaultPda: this.getVaultAddress(chain),
        originHash: bchTxHashBytes32,
        recipient: recipientAddress,
        mint: tokenCfg.mint,
        amount,
        nonce,
        txSignature: sigBase58
      });

      return {
        success: true,
        simulated: true,
        txHash: sigBase58,
        explorerUrl
      };
    } catch (err) {
      console.error('[Solana SVM Vault] Release error:', err.message);
      return {
        success: false,
        error: err.message
      };
    }
  }

  async markDepositSettled(depositId, destinationPayoutTxHash, chain = 'solana-mainnet') {
    db.logEvent('SOLANA_DEPOSIT_MARKED_SETTLED', `Marked Solana deposit ${depositId} completed`, {
      depositId,
      destinationPayoutTxHash,
      chain
    });
    return { success: true };
  }

  /**
   * Queries real on-chain SOL, USDT and USDC SPL balances across Solana Devnet & Mainnet with RPC failover
   */
  async getAddressBalances(solanaAddress, isTestnet = true) {
    if (!solanaAddress || typeof solanaAddress !== 'string' || solanaAddress.length < 32) {
      return { SOL: 0, USDT: 0, USDC: 0, invalid: true };
    }
    const cleanAddr = solanaAddress.trim();
    let userPubkey;
    try {
      userPubkey = new PublicKey(cleanAddr);
    } catch {
      return { SOL: 0, USDT: 0, USDC: 0, invalid: true };
    }

    const chain = isTestnet ? 'solana-devnet' : 'solana-mainnet';
    const rpcCandidates = this.getRpcCandidates(chain);

    let solBalance = 0;
    let usdtBalance = 0;
    let usdcBalance = 0;
    let rpcDegraded = true;

    const usdtCfg = this.getTokenConfig('USDT', chain);
    const usdcCfg = this.getTokenConfig('USDC', chain);

    const fetchSplBalance = async (connection, tokenCfg) => {
      if (!tokenCfg?.mint) return 0;
      const mintPubkey = new PublicKey(tokenCfg.mint);
      const decimals = Number(tokenCfg.decimals || 6);
      try {
        const parsedRes = await Promise.race([
          connection.getParsedTokenAccountsByOwner(userPubkey, { mint: mintPubkey }),
          new Promise((_, rej) => setTimeout(() => rej(new Error('Solana SPL timeout')), 7000))
        ]);
        const accounts = parsedRes?.value || [];
        let sum = 0;
        for (const acc of accounts) {
          const uiAmt = Number(acc?.account?.data?.parsed?.info?.tokenAmount?.uiAmount ?? 0);
          if (Number.isFinite(uiAmt)) sum += uiAmt;
        }
        return sum;
      } catch {
        // Fallback to deterministic ATA lookup if getParsedTokenAccountsByOwner is rate-limited
        try {
          const ata = await getAssociatedTokenAddress(mintPubkey, userPubkey);
          const acc = await getAccount(connection, ata);
          return Number(acc.amount) / 10 ** decimals;
        } catch (ataErr) {
          if (String(ataErr?.name || '').includes('TokenAccountNotFoundError') || String(ataErr?.message || '').includes('could not find account')) {
            return 0;
          }
          throw ataErr;
        }
      }
    };

    for (const rpcUrl of rpcCandidates) {
      try {
        const connection = new Connection(rpcUrl, 'confirmed');
        const lamports = await Promise.race([
          connection.getBalance(userPubkey),
          new Promise((_, rej) => setTimeout(() => rej(new Error('Solana getBalance timeout')), 7000))
        ]);
        solBalance = Number(lamports || 0) / 1e9;

        const [uRes, cRes] = await Promise.allSettled([
          fetchSplBalance(connection, usdtCfg),
          fetchSplBalance(connection, usdcCfg)
        ]);
        if (uRes.status === 'fulfilled') usdtBalance = uRes.value;
        if (cRes.status === 'fulfilled') usdcBalance = cRes.value;

        rpcDegraded = uRes.status === 'rejected' && cRes.status === 'rejected';
        if (!rpcDegraded || uRes.status === 'fulfilled' || cRes.status === 'fulfilled') {
          break;
        }
      } catch (e) {
        console.warn(`[Solana RPC] Balance query failed on ${rpcUrl}:`, e.message);
      }
    }

    return {
      SOL: Number(solBalance.toFixed(6)),
      USDT: Number(usdtBalance.toFixed(6)),
      USDC: Number(usdcBalance.toFixed(6)),
      network: isTestnet ? 'devnet' : 'mainnet',
      address: cleanAddr,
      ...(rpcDegraded ? { rpcDegraded: true } : {})
    };
  }

  /**
   * Real On-Chain Faucet: Dispenses Testnet SPL USDT to any Solana Devnet wallet!
   */
  async dispenseTestnetUsdt(recipientAddress, amount = 100) {
    if (!this.authorityKeypair) {
      throw new Error('Solana Devnet authority wallet not initialized');
    }
    const tokenCfg = this.getTokenConfig('USDT', 'solana-devnet');
    const mintPubkey = new PublicKey(tokenCfg.mint);
    const recipientPubkey = new PublicKey(recipientAddress);

    const cappedAmount = Math.min(Math.max(Number(amount) || 100, 1), 1000);
    const rawAmount = BigInt(Math.round(cappedAmount * 10 ** (tokenCfg.decimals || 6)));

    const txSig = await this._withConnection('solana-devnet', async connection => {
      const recipientAta = await getOrCreateAssociatedTokenAccount(
        connection,
        this.authorityKeypair,
        mintPubkey,
        recipientPubkey
      );

      return await mintTo(
        connection,
        this.authorityKeypair,
        mintPubkey,
        recipientAta.address,
        this.authorityKeypair,
        rawAmount
      );
    });

    return {
      success: true,
      onChain: true,
      token: 'USDT',
      network: 'Solana Devnet',
      amount: cappedAmount,
      recipient: recipientAddress,
      tokenAddress: tokenCfg.mint,
      txHash: txSig,
      explorerUrl: `https://solscan.io/tx/${txSig}?cluster=devnet`
    };
  }

  async getBalances() {
    const devnetVault = this.getVaultAddress('solana_devnet');
    const [mainnetBal, devnetBal] = await Promise.all([
      this.vaultAddress
        ? this.getAddressBalances(this.vaultAddress, false)
        : Promise.resolve({ SOL: 0, USDT: 0, USDC: 0, rpcDegraded: true }),
      devnetVault
        ? this.getAddressBalances(devnetVault, true)
        : Promise.resolve({ SOL: 0, USDT: 0, USDC: 0, rpcDegraded: true })
    ]);

    return {
      mainnet: {
        SOL: mainnetBal.SOL || 0,
        USDT: mainnetBal.USDT || 0,
        USDC: mainnetBal.USDC || 0,
        ...(mainnetBal.rpcDegraded ? { rpcDegraded: true } : {}),
        vaultAddress: this.vaultAddress
      },
      devnet: {
        SOL: devnetBal.SOL || 0,
        USDT: devnetBal.USDT || 0,
        USDC: devnetBal.USDC || 0,
        ...(devnetBal.rpcDegraded ? { rpcDegraded: true } : {}),
        vaultAddress: devnetVault
      }
    };
  }
}

export const solanaService = new SolanaService();
