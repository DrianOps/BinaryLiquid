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
    this.tripKind = null;
    this.trippedAt = null;
    this.lastReset = Date.now();

    // Reset rolling volume hourly and clear hourly volume trips automatically
    const timer = setInterval(() => {
      this.rollingVolume = 0;
      this.lastReset = Date.now();
      if (this.isTriggered && this.tripKind === 'hourly') {
        this.isTriggered = false;
        this.triggerReason = null;
        this.tripKind = null;
        this.trippedAt = null;
        console.log('[THE WATCHMAN] ✅ Hourly Circuit Breaker window reset to NORMAL');
      }
    }, 3600000);
    if (typeof timer.unref === 'function') timer.unref();
  }

  /**
   * Evaluates if a transaction passes safety limits
   * @param {number} amountUsd
   * @returns {{ allowed: boolean, reason?: string }}
   */
  evaluateTransaction(amountUsd) {
    if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
      return { allowed: false, reason: 'Invalid non-positive or non-finite transaction amount' };
    }

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
      this.trip(`Hourly volume threshold of $${this.hourlyVolumeCapUsd} reached`, 'hourly');
      return { allowed: false, reason: 'Hourly bridge limit exceeded' };
    }

    this.rollingVolume += amountUsd;
    return { allowed: true };
  }

  trip(reason, kind = 'manual') {
    this.isTriggered = true;
    this.triggerReason = reason;
    this.tripKind = kind;
    this.trippedAt = Date.now();
    console.error(`[THE WATCHMAN] 🚨 CIRCUIT BREAKER TRIPPED (${kind}): ${reason}`);
  }

  reset() {
    this.isTriggered = false;
    this.triggerReason = null;
    this.tripKind = null;
    this.trippedAt = null;
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
