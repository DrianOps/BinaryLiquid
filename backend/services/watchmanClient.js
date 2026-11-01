import { SentinelService } from '../../watchman/SentinelService.js';
import { config } from '../config.js';
import { oraclePool } from './oraclePool.js';

export const watchmanSentinel = new SentinelService({
  signerPrivateKey: config.evm.watchmanPrivateKey,
  rateResolver: (fromToken, toToken) => oraclePool.getRate(fromToken, toToken)
});
