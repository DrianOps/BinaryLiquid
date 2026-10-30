/**
 * @file circuitBreaker.js
 * @description The Watchman Circuit Breaker: Autonomous safety valve that pauses operations
 * if abnormal volume, deep chain reorgs, or rapid anomalies are detected.
 */

export class CircuitBreaker {
  constructor(config = {}) {
    this.maxSingleTxUsd = config.maxSingleTxUsd || 50000;
    this.hourlyVolumeCapUsd = config.hourlyVolumeCapUsd || 250000;
    this.rollingVolume = 0;
    this.isTriggered = false;
    this.triggerReason = null;
    this.lastReset = Date.now();

    // Reset rolling volume hourly
    setInterval(() => {
      this.rollingVolume = 0;
      this.lastReset = Date.now();
    }, 3600000);
  }

  /**
   * Evaluates if a transaction passes safety limits
   * @param {number} amountUsd 
   * @returns {{ allowed: boolean, reason?: string }}
   */
  evaluateTransaction(amountUsd) {
    if (this.isTriggered) {
      return { allowed: false, reason: `Circuit Breaker active: ${this.triggerReason}` };
    }

    if (amountUsd > this.maxSingleTxUsd) {
      return {
        allowed: false,
        reason: `Exceeds maximum single transaction limit of $${this.maxSingleTxUsd}`
      };
    }

    if (this.rollingVolume + amountUsd > this.hourlyVolumeCapUsd) {
      this.trip(`Hourly volume threshold of $${this.hourlyVolumeCapUsd} reached`);
      return { allowed: false, reason: `Hourly bridge limit exceeded` };
    }

    this.rollingVolume += amountUsd;
    return { allowed: true };
  }

  trip(reason) {
    this.isTriggered = true;
    this.triggerReason = reason;
    console.error(`[THE WATCHMAN] 🚨 CIRCUIT BREAKER TRIPPED: ${reason}`);
  }

  reset() {
    this.isTriggered = false;
    this.triggerReason = null;
    this.rollingVolume = 0;
    console.log('[THE WATCHMAN] ✅ Circuit breaker manually reset to NORMAL');
  }

  getStatus() {
    return {
      active: !this.isTriggered,
      isTriggered: this.isTriggered,
      reason: this.triggerReason,
      rollingVolumeUsd: this.rollingVolume,
      hourlyCapUsd: this.hourlyVolumeCapUsd,
      maxSingleTxUsd: this.maxSingleTxUsd
    };
  }
}
