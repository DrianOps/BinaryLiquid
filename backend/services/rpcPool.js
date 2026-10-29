import { ethers } from 'ethers';

class RpcPoolManager {
  constructor() {
    this.evmPool = [
      { url: 'https://polygon-amoy.drpc.org', name: 'dRPC Amoy', latency: 0, failures: 0, healthy: true },
      { url: 'https://polygon-amoy-bor-rpc.publicnode.com', name: 'PublicNode Amoy', latency: 0, failures: 0, healthy: true },
      { url: 'https://rpc.ankr.com/polygon_amoy', name: 'Ankr Amoy', latency: 0, failures: 0, healthy: true },
      { url: 'https://polygon-amoy.blockpi.network/v1/rpc/public', name: 'BlockPI Amoy', latency: 0, failures: 0, healthy: true },
      { url: 'https://1rpc.io/amoy', name: '1RPC Automata', latency: 0, failures: 0, healthy: true }
    ];

    this.currentIndex = 0;
    this.providers = new Map();
    this.initProviders();
  }

  initProviders() {
    for (const node of this.evmPool) {
      try {
        const provider = new ethers.JsonRpcProvider(node.url, undefined, {
          staticNetwork: true,
          batchMaxCount: 1
        });
        this.providers.set(node.url, provider);
      } catch (err) {
        node.healthy = false;
        node.failures++;
      }
    }
  }

  getPrimaryProvider() {
    const node = this.evmPool[this.currentIndex];
    return this.providers.get(node.url) || this.providers.values().next().value;
  }

  async execute(operationFn, maxRetries = 4) {
    let attempts = 0;
    let lastError = null;

    while (attempts < Math.min(maxRetries, this.evmPool.length)) {
      const node = this.evmPool[this.currentIndex];
      const provider = this.providers.get(node.url);

      if (!provider) {
        this.rotate();
        attempts++;
        continue;
      }

      const startTime = Date.now();
      try {
        // Execute with 4.5s timeout promise
        const result = await Promise.race([
          operationFn(provider),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`RPC Timeout (${node.name} > 4500ms)`)), 4500)
          )
        ]);

        // Success: update latency and mark healthy
        node.latency = Date.now() - startTime;
        node.healthy = true;
        if (node.failures > 0) node.failures--;

        return result;
      } catch (err) {
        node.failures++;
        node.healthy = false;
        lastError = err;
        console.warn(`[RPC Pool] Failover triggered: ${node.name} failed (${err.message}). Switching to next node in pool...`);
        this.rotate();
        attempts++;
      }
    }

    throw new Error(`All RPC pool nodes failed. Last error: ${lastError?.message}`);
  }

  rotate() {
    this.currentIndex = (this.currentIndex + 1) % this.evmPool.length;
  }

  getHealth() {
    return {
      activeNode: this.evmPool[this.currentIndex].name,
      totalNodes: this.evmPool.length,
      healthyNodes: this.evmPool.filter(n => n.healthy).length,
      nodes: this.evmPool.map(n => ({
        name: n.name,
        healthy: n.healthy,
        latencyMs: n.latency,
        failures: n.failures
      }))
    };
  }
}

export const rpcPool = new RpcPoolManager();
