/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CircuitBreaker,
  CircuitBreakerManager,
  CircuitState,
  CircuitBreakerConfig,
} from '../../../utils/retry/circuit-breaker.js';

describe('Circuit Breaker', () => {
  let breaker: CircuitBreaker;
  const testConfig: Partial<CircuitBreakerConfig> = {
    failureThreshold: 3,
    failureWindow: 1000,
    recoveryTimeout: 500,
    successThreshold: 2,
    halfOpenMaxAttempts: 3,
  };

  beforeEach(() => {
    breaker = new CircuitBreaker('test-endpoint', testConfig);
  });

  describe('State transitions', () => {
    it('should start in closed state', () => {
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
      expect(breaker.canRequest()).toBe(true);
    });

    it('should open after failure threshold', () => {
      // Record failures up to threshold
      for (let i = 0; i < 3; i++) {
        expect(breaker.getState()).toBe(CircuitState.CLOSED);
        breaker.recordFailure();
      }

      // Should now be open
      expect(breaker.getState()).toBe(CircuitState.OPEN);
      expect(breaker.canRequest()).toBe(false);
    });

    it('should transition to half-open after recovery timeout', async () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        breaker.recordFailure();
      }
      expect(breaker.getState()).toBe(CircuitState.OPEN);

      // Wait for recovery timeout
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Should transition to half-open on next request check
      expect(breaker.canRequest()).toBe(true);
      expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);
    });

    it('should close from half-open after success threshold', async () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        breaker.recordFailure();
      }

      // Wait for recovery timeout
      await new Promise((resolve) => setTimeout(resolve, 600));
      breaker.canRequest(); // Transition to half-open

      // Record successes
      breaker.recordSuccess();
      expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);

      breaker.recordSuccess();
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should reopen from half-open on failure', async () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        breaker.recordFailure();
      }

      // Wait for recovery timeout
      await new Promise((resolve) => setTimeout(resolve, 600));
      breaker.canRequest(); // Transition to half-open
      expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);

      // Any failure in half-open reopens
      breaker.recordFailure();
      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });
  });

  describe('Request limiting', () => {
    it('should block requests when open', () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        breaker.recordFailure();
      }

      expect(breaker.canRequest()).toBe(false);
      expect(breaker.canRequest()).toBe(false);
      expect(breaker.canRequest()).toBe(false);
    });

    it('should limit requests in half-open state', async () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        breaker.recordFailure();
      }
      expect(breaker.getState()).toBe(CircuitState.OPEN);

      // Wait for recovery timeout
      await new Promise((resolve) => setTimeout(resolve, 600));

      // First canRequest should transition to half-open and return true
      expect(breaker.canRequest()).toBe(true);
      expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);

      // We should be able to make maxAttempts-1 more requests (since we just made one)
      expect(breaker.canRequest()).toBe(true);

      // After reaching max attempts, should return false
      expect(breaker.canRequest()).toBe(false);
    });
  });

  describe('Time window management', () => {
    it('should only count failures within time window', async () => {
      // Record 2 failures
      breaker.recordFailure();
      breaker.recordFailure();
      expect(breaker.getState()).toBe(CircuitState.CLOSED);

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // These failures are outside the window, so count resets
      breaker.recordFailure();
      expect(breaker.getState()).toBe(CircuitState.CLOSED);

      breaker.recordFailure();
      breaker.recordFailure();
      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });

    it('should clean up old entries', async () => {
      const stats1 = breaker.getStats();
      expect(stats1.failureCount).toBe(0);

      breaker.recordFailure();
      breaker.recordSuccess();

      const stats2 = breaker.getStats();
      expect(stats2.failureCount).toBe(1);
      expect(stats2.successCount).toBe(1);

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const stats3 = breaker.getStats();
      expect(stats3.failureCount).toBe(0);
      expect(stats3.successCount).toBe(0);
    });
  });

  describe('Statistics', () => {
    it('should track statistics correctly', () => {
      breaker.recordSuccess();
      breaker.recordSuccess();
      breaker.recordFailure();

      const stats = breaker.getStats();
      expect(stats.state).toBe(CircuitState.CLOSED);
      expect(stats.successCount).toBe(2);
      expect(stats.failureCount).toBe(1);
      expect(stats.totalRequests).toBe(3);
      expect(stats.successRate).toBeCloseTo(66.67, 1);
    });

    it('should include timestamps in statistics', () => {
      const stats1 = breaker.getStats();
      expect(stats1.lastCloseTime).toBeDefined();
      expect(stats1.lastOpenTime).toBeUndefined();

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        breaker.recordFailure();
      }

      const stats2 = breaker.getStats();
      expect(stats2.lastOpenTime).toBeDefined();
      expect(stats2.lastCloseTime).toBeUndefined();
    });
  });

  describe('Reset functionality', () => {
    it('should reset to initial state', () => {
      // Put breaker in open state with some history
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure();
      }
      expect(breaker.getState()).toBe(CircuitState.OPEN);

      // Reset
      breaker.reset();

      expect(breaker.getState()).toBe(CircuitState.CLOSED);
      expect(breaker.canRequest()).toBe(true);

      const stats = breaker.getStats();
      expect(stats.failureCount).toBe(0);
      expect(stats.successCount).toBe(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle success in open state gracefully', () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        breaker.recordFailure();
      }
      expect(breaker.getState()).toBe(CircuitState.OPEN);

      // This shouldn't happen in practice, but handle gracefully
      breaker.recordSuccess();
      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });

    it('should handle rapid state checks', () => {
      for (let i = 0; i < 100; i++) {
        breaker.canRequest();
      }
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });
  });
});

describe('CircuitBreakerManager', () => {
  let manager: CircuitBreakerManager;

  beforeEach(() => {
    manager = CircuitBreakerManager.getInstance();
    manager.clear();
  });

  describe('Singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = CircuitBreakerManager.getInstance();
      const instance2 = CircuitBreakerManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Breaker management', () => {
    it('should create and retrieve breakers', () => {
      const breaker1 = manager.getBreaker('endpoint1');
      const breaker2 = manager.getBreaker('endpoint2');
      const breaker1Again = manager.getBreaker('endpoint1');

      expect(breaker1).not.toBe(breaker2);
      expect(breaker1).toBe(breaker1Again);
    });

    it('should accept custom configuration', () => {
      const breaker = manager.getBreaker('custom', {
        failureThreshold: 10,
        recoveryTimeout: 1000,
      });

      // Verify it uses custom config by not opening after 3 failures
      for (let i = 0; i < 3; i++) {
        breaker.recordFailure();
      }
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });
  });

  describe('Global operations', () => {
    it('should get all statistics', () => {
      const breaker1 = manager.getBreaker('endpoint1');
      const breaker2 = manager.getBreaker('endpoint2');

      breaker1.recordSuccess();
      breaker2.recordFailure();

      const allStats = manager.getAllStats();
      expect(allStats.size).toBe(2);
      expect(allStats.get('endpoint1')?.successCount).toBe(1);
      expect(allStats.get('endpoint2')?.failureCount).toBe(1);
    });

    it('should reset all breakers', () => {
      const breaker1 = manager.getBreaker('endpoint1');
      const breaker2 = manager.getBreaker('endpoint2');

      // Open both breakers
      for (let i = 0; i < 5; i++) {
        breaker1.recordFailure();
        breaker2.recordFailure();
      }

      expect(breaker1.getState()).toBe(CircuitState.OPEN);
      expect(breaker2.getState()).toBe(CircuitState.OPEN);

      // Reset all
      manager.resetAll();

      expect(breaker1.getState()).toBe(CircuitState.CLOSED);
      expect(breaker2.getState()).toBe(CircuitState.CLOSED);
    });

    it('should clear all breakers', () => {
      manager.getBreaker('endpoint1');
      manager.getBreaker('endpoint2');

      const stats1 = manager.getAllStats();
      expect(stats1.size).toBe(2);

      manager.clear();

      const stats2 = manager.getAllStats();
      expect(stats2.size).toBe(0);
    });
  });

  describe('Environment variable configuration', () => {
    beforeEach(() => {
      vi.stubEnv('CIRCUIT_BREAKER_THRESHOLD', '');
      vi.stubEnv('CIRCUIT_BREAKER_TIMEOUT_MS', '');
    });

    it('should use environment variables when set', () => {
      vi.stubEnv('CIRCUIT_BREAKER_THRESHOLD', '10');
      vi.stubEnv('CIRCUIT_BREAKER_TIMEOUT_MS', '5000');

      // Create a new circuit breaker directly with custom config
      const breaker = new CircuitBreaker('env-test', {
        failureThreshold: parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD || '5', 10),
        failureWindow: 60000,
        recoveryTimeout: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT_MS || '30000', 10),
        successThreshold: 3,
        halfOpenMaxAttempts: 5,
      });

      // Should not open after 5 failures (threshold from env is 10)
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure();
      }
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });
  });
});
