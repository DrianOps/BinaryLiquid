import crypto from 'crypto';
import { config } from '../config.js';
import { db } from './db.js';

function crc16ccitt(data) {
  let crc = 0;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i] << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc;
}

class TonService {
  constructor() {
    this.network = config.ton?.network || 'mainnet';
    this.tonApiUrl = config.ton?.tonApiUrl || 'https://tonapi.io/v2';
    this.testnetTonApiUrl = config.ton?.testnetTonApiUrl || 'https://testnet.tonapi.io/v2';
    this.rpcUrl = config.ton?.rpcUrl || 'https://toncenter.com/api/v2/jsonRPC';
    this.testnetRpcUrl = config.ton?.testnetRpcUrl || 'https://testnet.toncenter.com/api/v2/jsonRPC';
  }

  isTonChain(chain = '') {
    const c = String(chain || '').toLowerCase();
    return c.includes('ton') || c.includes('the-open-network') || c.includes('telegram');
  }

  parseTonAddress(address = '') {
    if (!address || typeof address !== 'string') return null;
    const clean = address.trim();
    if (!clean) return null;

    // Raw format: workchain:hex64 (workchain 0 basechain or -1 masterchain)
    const rawMatch = clean.match(/^(-1|0):([0-9a-fA-F]{64})$/);
    if (rawMatch) {
      const workchain = parseInt(rawMatch[1], 10);
      const hashHex = rawMatch[2].toLowerCase();
      return {
        isValid: true,
        format: 'raw',
        workchain,
        hashHex,
        raw: `${workchain}:${hashHex}`,
        bounceable: null,
        isTestnet: null
      };
    }

    // TEP-2 friendly 48-char base64/base64url format (36 decoded bytes with CRC16-CCITT)
    if (!/^[A-Za-z0-9+/_-]{48}$/.test(clean)) return null;
    try {
      const stdB64 = clean.replace(/-/g, '+').replace(/_/g, '/');
      const buf = Buffer.from(stdB64, 'base64');
      if (buf.length !== 36) return null;

      const expectedCrc = (buf[34] << 8) | buf[35];
      if (crc16ccitt(buf.subarray(0, 34)) !== expectedCrc) {
        return null;
      }

      const tag = buf[0];
      let bounceable = null;
      let isTestnet = null;
      if (tag === 0x11) {
        bounceable = true;
        isTestnet = false;
      } else if (tag === 0x51) {
        bounceable = false;
        isTestnet = false;
      } else if (tag === 0x91) {
        bounceable = true;
        isTestnet = true;
      } else if (tag === 0xd1) {
        bounceable = false;
        isTestnet = true;
      } else {
        return null;
      }

      const workchain = buf.readInt8(1);
      if (workchain !== 0 && workchain !== -1) return null;

      const hashHex = buf.subarray(2, 34).toString('hex').toLowerCase();
      return {
        isValid: true,
        format: 'friendly',
        workchain,
        hashHex,
        raw: `${workchain}:${hashHex}`,
        bounceable,
        isTestnet
      };
    } catch {
      return null;
    }
  }

  isValidAddress(address = '', isTestnet = null) {
    const parsed = this.parseTonAddress(address);
    if (!parsed) return false;
    if (isTestnet !== null && parsed.isTestnet !== null && parsed.isTestnet !== Boolean(isTestnet)) {
      return false;
    }
    return true;
  }

  getVaultAddress(isTestnet = false) {
    // Explicit config strings (unconfigured fallback placeholders are rejected by parseTonAddress for on-chain verify)
    if (isTestnet) {
      return config.ton?.testnetVaultAddress || 'kQB_BLiquidVaultTONCrossChainBridge111111111111111';
    }
    return config.ton?.vaultAddress || 'EQB_BLiquidVaultTONCrossChainBridge111111111111111';
  }

  getDepositAddress(isTestnet = false) {
    return this.getVaultAddress(isTestnet);
  }

  getExplorerUrl(isTestnet = false) {
    return isTestnet ? config.ton?.testnetExplorerUrl : config.ton?.explorerUrl;
  }

  getTxExplorerUrl(txHash, isTestnet = false) {
    const base = this.getExplorerUrl(isTestnet);
    return `${base}/transaction/${txHash}`;
  }

  /**
   * Queries real on-chain TON and USDT Jetton balance using TonAPI + Toncenter JSON-RPC failover
   */
  async getAddressBalances(address, isTestnet = false) {
    const parsed = this.parseTonAddress(address);
    if (!parsed) {
      return { TON: 0, USDT: 0, invalid: true };
    }
    if (parsed.isTestnet !== null && parsed.isTestnet !== Boolean(isTestnet)) {
      return { TON: 0, USDT: 0, networkMismatch: true };
    }

    const clean = address.trim();
    const apiUrl = isTestnet ? this.testnetTonApiUrl : this.tonApiUrl;
    const rpcUrl = isTestnet ? this.testnetRpcUrl : this.rpcUrl;
    const result = { TON: 0, USDT: 0 };
    let tonDegraded = false;
    let jettonDegraded = false;

    let tonFetched = false;
    try {
      // 1. Fetch native TON balance via TonAPI (canonical raw account lookup)
      const accountRes = await fetch(`${apiUrl}/accounts/${encodeURIComponent(parsed.raw)}`, {
        signal: AbortSignal.timeout(3500),
        headers: { 'Accept': 'application/json' }
      });
      if (accountRes.ok) {
        const accountData = await accountRes.json();
        const nanoTon = Number(accountData?.balance || 0);
        if (Number.isFinite(nanoTon)) {
          result.TON = nanoTon / 1e9;
          tonFetched = true;
        }
      }
    } catch (_) {
      // Failover to toncenter below
    }

    if (!tonFetched) {
      try {
        const rpcRes = await fetch(rpcUrl, {
          method: 'POST',
          signal: AbortSignal.timeout(4000),
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getAddressBalance',
            params: { address: clean }
          })
        });
        if (rpcRes.ok) {
          const rpcData = await rpcRes.json();
          const nanoTon = Number(rpcData?.result);
          if (rpcData?.ok !== false && Number.isFinite(nanoTon)) {
            result.TON = nanoTon / 1e9;
            tonFetched = true;
          }
        }
      } catch (_) {
        // Both TON RPCs unreachable
      }
    }
    if (!tonFetched) tonDegraded = true;

    const usdtMaster = (
      isTestnet ? config.ton?.testnetTokens?.USDT?.masterAddress : config.ton?.tokens?.USDT?.masterAddress
    ) || '';
    const parsedMaster = usdtMaster ? this.parseTonAddress(usdtMaster) : null;

    try {
      // 2. Fetch Jettons (strict canonical USDT Jetton master comparison)
      const jettonsRes = await fetch(`${apiUrl}/accounts/${encodeURIComponent(parsed.raw)}/jettons`, {
        signal: AbortSignal.timeout(3500),
        headers: { 'Accept': 'application/json' }
      });
      if (jettonsRes.ok) {
        const jettonsData = await jettonsRes.json();
        const balances = jettonsData?.balances || [];
        if (parsedMaster) {
          for (const j of balances) {
            const parsedJetton = this.parseTonAddress(j?.jetton?.address || '');
            if (parsedJetton && parsedJetton.raw === parsedMaster.raw) {
              const rawAmt = Number(j.balance || 0);
              const decimals = j?.jetton?.decimals ?? 6;
              if (Number.isFinite(rawAmt)) {
                result.USDT += rawAmt / Math.pow(10, decimals);
              }
            }
          }
        }
      } else {
        jettonDegraded = true;
      }
    } catch (_) {
      jettonDegraded = true;
    }

    if (tonDegraded || jettonDegraded) {
      result.rpcDegraded = true;
    }

    return result;
  }

  /**
   * Verifies incoming USDT Jetton transfer on TON (strict canonical master & recipient hash comparison)
   */
  async verifyDeposit(txHash, expectedAmount, depositAddress = null, isTestnet = false) {
    const vault = (depositAddress || this.getVaultAddress(isTestnet)).trim();
    const parsedVault = this.parseTonAddress ? this.parseTonAddress(vault) : null;
    const expectedNum = Number(expectedAmount);
    if (!Number.isFinite(expectedNum) || expectedNum <= 0) {
      return { verified: false, reason: `Monto esperado inválido en TON (${expectedAmount})` };
    }
    if (!txHash || txHash.trim().length < 10) {
      return {
        verified: false,
        reason: `Por favor proporciona el Hash de Transacción de tu depósito de USDT en TON al Vault (${vault})`
      };
    }

    const cleanHash = txHash.trim();
    const apiUrl = isTestnet ? this.testnetTonApiUrl : this.tonApiUrl;
    const usdtMaster = (
      isTestnet ? config.ton?.testnetTokens?.USDT?.masterAddress : config.ton?.tokens?.USDT?.masterAddress
    ) || '';
    const parsedMaster = usdtMaster && this.parseTonAddress ? this.parseTonAddress(usdtMaster) : null;

    if (parsedMaster && parsedVault) {
      try {
        const res = await fetch(`${apiUrl}/events/${encodeURIComponent(cleanHash)}`, {
          signal: AbortSignal.timeout(4000),
          headers: { 'Accept': 'application/json' }
        });

        if (res.ok) {
          const event = await res.json();
          const actions = event?.actions || [];
          let verifiedAmount = 0;

          for (const act of actions) {
            if (act.type === 'JettonTransfer') {
              const details = act.JettonTransfer || {};
              const parsedRecip = this.parseTonAddress(details.recipient?.address || '');
              const parsedJetton = this.parseTonAddress(details.jetton?.address || '');
              const masterMatches = Boolean(parsedJetton && parsedJetton.raw === parsedMaster.raw);
              const recipientMatches = Boolean(parsedRecip && parsedRecip.raw === parsedVault.raw);

              if (recipientMatches && masterMatches) {
                const decimals = details.jetton?.decimals ?? 6;
                const rawAmt = Number(details.amount || 0);
                if (Number.isFinite(rawAmt) && rawAmt > 0) {
                  verifiedAmount += rawAmt / Math.pow(10, decimals);
                }
              }
            }
          }

          if (verifiedAmount > 0 && verifiedAmount + 1e-6 >= expectedNum * 0.99) {
            return {
              verified: true,
              onChain: true,
              amount: verifiedAmount,
              txHash: cleanHash,
              depositId: `ton_${cleanHash.slice(0, 16)}`,
              explorerUrl: this.getTxExplorerUrl(cleanHash, isTestnet)
            };
          }
        }
      } catch (err) {
        console.warn('[TON Service] Verification warning:', err.message);
      }
    }

    if (config.simulateIfNoFunds) {
      return {
        verified: true,
        simulated: true,
        amount: expectedNum,
        txHash: cleanHash,
        depositId: `ton_sim_${Date.now()}`,
        explorerUrl: this.getTxExplorerUrl(cleanHash, isTestnet)
      };
    }

    return {
      verified: false,
      reason: `No se pudo confirmar la transferencia verificada de ${expectedNum} USDT Jetton hacia el Vault (${vault}) en TON`
    };
  }

  /**
   * Disburses USDT Jettons from the TON Non-Custodial Vault to the recipient
   */
  async sendPayout(recipientAddress, amount, tokenSymbol = 'USDT', isTestnet = false) {
    if (!this.isValidAddress(recipientAddress)) {
      throw new Error(`Dirección TON de destino inválida: ${recipientAddress}`);
    }

    if (!config.simulateIfNoFunds) {
      throw new Error(
        'Liquidación automática on-chain de TON Vault pendiente de despliegue/firma (SIMULATE_IF_NO_FUNDS desactivado en producción).'
      );
    }

    const cleanRecipient = recipientAddress.trim();
    const mockHash = crypto.randomBytes(32).toString('hex');
    const explorerUrl = this.getTxExplorerUrl(mockHash, isTestnet);

    console.log(`[TON Vault] [SIMULATED] Disbursing ${amount} ${tokenSymbol} -> ${cleanRecipient} on TON (${isTestnet ? 'Testnet' : 'Mainnet'})...`);
    db.updateLiquidity(`ton_${tokenSymbol.toLowerCase()}`, -Number(amount));

    return {
      success: true,
      simulated: true,
      onChain: false,
      nonCustodial: true,
      network: isTestnet ? 'testnet' : 'mainnet',
      recipient: cleanRecipient,
      amount: Number(amount),
      txHash: mockHash,
      explorerUrl
    };
  }
}

export const tonService = new TonService();
