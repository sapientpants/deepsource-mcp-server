/**
 * @fileoverview Tests for circuit breaker implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CircuitBreaker,
  CircuitBreakerManager,
  CircuitState,
  CircuitBreakerConfig,
} from '../circuit-breaker.js';

describe('Circuit Breaker', () => {
  let breaker: CircuitBreaker;
  const defaultConfig: CircuitBreakerConfig = {
    failureThreshold: 3,
    failureWindow: 1000,
    recoveryTimeout: 500,
    successThreshold: 2,
    halfOpenMaxAttempts: 3,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    breaker = new CircuitBreaker('test-endpoint', defaultConfig);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Initial state', () => {
    it('should start in CLOSED state', () => {
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
      expect(breaker.canAttempt()).toBe(true);
    });

    it('should have zero statistics initially', () => {
      const stats = breaker.getStats();
      expect(stats.failures).toBe(0);
      expect(stats.successes).toBe(0);
      expect(stats.consecutiveSuccesses).toBe(0);
      expect(stats.consecutiveFailures).toBe(0);
      expect(stats.totalRequests).toBe(0);
    });
  });

  describe('Failure handling', () => {
    it('should remain closed under failure threshold', () => {
      breaker.recordFailure();
      breaker.recordFailure();

      expect(breaker.getState()).toBe(CircuitState.CLOSED);
      expect(breaker.canAttempt()).toBe(true);
    });

    it('should open when failure threshold is reached', () => {
      // Record failures to reach threshold
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();

      expect(breaker.getState()).toBe(CircuitState.OPEN);
      expect(breaker.canAttempt()).toBe(false);
    });

    it('should only count recent failures within window', () => {
      // Record old failures
      breaker.recordFailure();
      breaker.recordFailure();

      // Advance time past failure window
      vi.advanceTimersByTime(1100);

      // These failures should be discarded
      breaker.recordFailure();

      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should track consecutive failures', () => {
      breaker.recordFailure();
      expect(breaker.getStats().consecutiveFailures).toBe(1);

      breaker.recordFailure();
      expect(breaker.getStats().consecutiveFailures).toBe(2);

      breaker.recordSuccess();
      expect(breaker.getStats().consecutiveFailures).toBe(0);
    });
  });

  describe('Success handling', () => {
    it('should track consecutive successes', () => {
      breaker.recordSuccess();
      expect(breaker.getStats().consecutiveSuccesses).toBe(1);

      breaker.recordSuccess();
      expect(breaker.getStats().consecutiveSuccesses).toBe(2);

      breaker.recordFailure();
      expect(breaker.getStats().consecutiveSuccesses).toBe(0);
    });

    it('should not affect closed state', () => {
      breaker.recordSuccess();
      breaker.recordSuccess();
      breaker.recordSuccess();

      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });
  });

  describe('State transitions', () => {
    it('should transition from CLOSED to OPEN on threshold', () => {
      expect(breaker.getState()).toBe(CircuitState.CLOSED);

      // Reach failure threshold
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();

      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });

    it('should transition from OPEN to HALF_OPEN after recovery timeout', () => {
      // Open the circuit
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();
      expect(breaker.getState()).toBe(CircuitState.OPEN);

      // Advance time to recovery timeout
      vi.advanceTimersByTime(500);

      expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);
    });

    it('should transition from HALF_OPEN to CLOSED on success threshold', () => {
      // Open then half-open the circuit
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();
      vi.advanceTimersByTime(500);
      expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);

      // Record successes to meet threshold
      breaker.canAttempt();
      breaker.recordSuccess();
      breaker.canAttempt();
      breaker.recordSuccess();

      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should transition from HALF_OPEN back to OPEN on failure', () => {
      // Open then half-open the circuit
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();
      vi.advanceTimersByTime(500);
      expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);

      // Any failure in half-open reopens
      breaker.recordFailure();

      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });
  });

  describe('Half-open state behavior', () => {
    beforeEach(() => {
      // Get to half-open state
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();
      vi.advanceTimersByTime(500);
    });

    it('should allow limited attempts in half-open state', () => {
      expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);

      expect(breaker.canAttempt()).toBe(true); // 1st attempt
      expect(breaker.canAttempt()).toBe(true); // 2nd attempt
      expect(breaker.canAttempt()).toBe(true); // 3rd attempt
      expect(breaker.canAttempt()).toBe(false); // Max reached
    });

    it('should reset attempt counter on state change', () => {
      // Use up attempts
      breaker.canAttempt();
      breaker.canAttempt();
      breaker.canAttempt();
      expect(breaker.canAttempt()).toBe(false);

      // Transition back to open
      breaker.recordFailure();

      // Wait for half-open again
      vi.advanceTimersByTime(500);

      // Counter should be reset
      expect(breaker.canAttempt()).toBe(true);
    });
  });

  describe('Statistics', () => {
    it('should track total requests', () => {
      let stats = breaker.getStats();
      expect(stats.totalRequests).toBe(0);

      breaker.canAttempt();
      stats = breaker.getStats();
      expect(stats.totalRequests).toBe(1);

      breaker.canAttempt();
      stats = breaker.getStats();
      expect(stats.totalRequests).toBe(2);
    });

    it('should track state changes', () => {
      let stats = breaker.getStats();
      expect(stats.stateChanges).toBe(0);

      // Cause state change to OPEN
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();

      stats = breaker.getStats();
      expect(stats.stateChanges).toBe(1);

      // Cause state change to HALF_OPEN
      vi.advanceTimersByTime(500);
      breaker.getState();

      stats = breaker.getStats();
      expect(stats.stateChanges).toBe(2);
    });

    it('should track last failure and success times', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      let stats = breaker.getStats();
      expect(stats.lastFailureTime).toBeNull();
      expect(stats.lastSuccessTime).toBeNull();

      breaker.recordFailure();
      stats = breaker.getStats();
      expect(stats.lastFailureTime).toBe(now);

      vi.advanceTimersByTime(100);
      breaker.recordSuccess();
      stats = breaker.getStats();
      expect(stats.lastSuccessTime).toBe(now + 100);
    });
  });

  describe('Reset functionality', () => {
    it('should reset all state and statistics', () => {
      // Put breaker in complex state
      breaker.recordFailure();
      breaker.recordSuccess();
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();
      vi.advanceTimersByTime(500);

      // Reset
      breaker.reset();

      const stats = breaker.getStats();
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
      expect(stats.failures).toBe(0);
      expect(stats.successes).toBe(0);
      expect(stats.totalRequests).toBe(0);
      expect(stats.stateChanges).toBe(0);
      expect(stats.lastFailureTime).toBeNull();
      expect(stats.lastSuccessTime).toBeNull();
    });
  });

  describe('Edge cases', () => {
    it('should handle rapid succession of requests', () => {
      for (let i = 0; i < 100; i++) {
        if (breaker.canAttempt()) {
          if (Math.random() > 0.5) {
            breaker.recordSuccess();
          } else {
            breaker.recordFailure();
          }
        }
      }

      // Should not throw and maintain valid state
      expect([CircuitState.CLOSED, CircuitState.OPEN, CircuitState.HALF_OPEN]).toContain(
        breaker.getState()
      );
    });

    it('should handle time jumps correctly', () => {
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();

      // Large time jump
      vi.advanceTimersByTime(100000);

      expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);
    });
  });
});

describe('CircuitBreakerManager', () => {
  let manager: CircuitBreakerManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new CircuitBreakerManager({
      failureThreshold: 2,
      failureWindow: 1000,
      recoveryTimeout: 500,
      successThreshold: 1,
      halfOpenMaxAttempts: 2,
    });
  });

  describe('Breaker creation and retrieval', () => {
    it('should create new breakers on demand', () => {
      const breaker1 = manager.getBreaker('endpoint1');
      const breaker2 = manager.getBreaker('endpoint2');

      expect(breaker1).toBeDefined();
      expect(breaker2).toBeDefined();
      expect(breaker1).not.toBe(breaker2);
    });

    it('should return same breaker for same endpoint', () => {
      const breaker1 = manager.getBreaker('endpoint1');
      const breaker2 = manager.getBreaker('endpoint1');

      expect(breaker1).toBe(breaker2);
    });

    it('should allow custom config per breaker', () => {
      const customConfig = {
        failureThreshold: 5,
        failureWindow: 2000,
        recoveryTimeout: 1000,
        successThreshold: 3,
        halfOpenMaxAttempts: 5,
      };

      const breaker = manager.getBreaker('custom', customConfig);

      // Test that custom config is used (trigger with 5 failures, not 2)
      breaker.recordFailure();
      breaker.recordFailure();
      expect(breaker.getState()).toBe(CircuitState.CLOSED);

      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();
      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });
  });

  describe('Statistics aggregation', () => {
    it('should return stats for all breakers', () => {
      const breaker1 = manager.getBreaker('endpoint1');
      const breaker2 = manager.getBreaker('endpoint2');

      breaker1.recordFailure();
      breaker2.recordSuccess();

      const allStats = manager.getAllStats();

      expect(allStats.size).toBe(2);
      expect(allStats.get('endpoint1')?.consecutiveFailures).toBe(1);
      expect(allStats.get('endpoint2')?.consecutiveSuccesses).toBe(1);
    });

    it('should return empty map when no breakers exist', () => {
      const allStats = manager.getAllStats();
      expect(allStats.size).toBe(0);
    });
  });

  describe('Reset functionality', () => {
    it('should reset all breakers', () => {
      const breaker1 = manager.getBreaker('endpoint1');
      const breaker2 = manager.getBreaker('endpoint2');

      breaker1.recordFailure();
      breaker1.recordFailure();
      breaker2.recordFailure();

      manager.resetAll();

      expect(breaker1.getStats().failures).toBe(0);
      expect(breaker2.getStats().failures).toBe(0);
    });

    it('should reset specific breaker', () => {
      const breaker1 = manager.getBreaker('endpoint1');
      const breaker2 = manager.getBreaker('endpoint2');

      breaker1.recordFailure();
      breaker2.recordFailure();

      manager.reset('endpoint1');

      expect(breaker1.getStats().failures).toBe(0);
      expect(breaker2.getStats().failures).toBe(1);
    });

    it('should handle reset of non-existent breaker', () => {
      // Should not throw
      expect(() => manager.reset('non-existent')).not.toThrow();
    });
  });
});
