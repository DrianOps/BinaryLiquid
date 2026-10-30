/**
 * @file index.js
 * @description The Watchman Daemon Entry Point
 */

import { SentinelService } from './SentinelService.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const BANNER = `
================================================================================
  👁️  THE WATCHMAN — Autonomous Cross-Chain Sentinel & Oracle Daemon
  BinaryLiquid Protocol • 100% Non-Custodial Cross-Chain Settlement
================================================================================
  [Security]    Zero-Custody Cryptographic Attestation
  [Chains]      Bitcoin Cash (CashTokens) <===> Polygon PoS / Amoy
  [Protection]  ECDSA Attestation • Circuit Breaker • Anti-Replay Guard
================================================================================
`;

console.log(BANNER);

const sentinel = new SentinelService({
  signerPrivateKey: process.env.EVM_HOT_WALLET_KEY,
  polygonRpcUrl: process.env.EVM_RPC_URL,
  bchElectrumUrl: process.env.BCH_ELECTRUM_URL
});

export { sentinel };
