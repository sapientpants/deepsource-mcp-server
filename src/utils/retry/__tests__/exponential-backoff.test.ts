/**
 * @fileoverview Tests for exponential backoff implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  calculateBackoffDelay,
  parseRetryAfterHeader,
  getRetryDelay,
  generateJitteredDelays,
  isProperlyDistributed,
  sleep,
} from '../exponential-backoff.js';

describe('Exponential Backoff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateBackoffDelay', () => {
    it('should calculate exponential backoff correctly', () => {
      const baseDelay = 1000;
      const maxDelay = 10000;

      // Test exponential growth
      expect(calculateBackoffDelay(0, baseDelay, maxDelay, 0)).toBe(1000); // 1000 * 2^0 = 1000
      expect(calculateBackoffDelay(1, baseDelay, maxDelay, 0)).toBe(2000); // 1000 * 2^1 = 2000
      expect(calculateBackoffDelay(2, baseDelay, maxDelay, 0)).toBe(4000); // 1000 * 2^2 = 4000
      expect(calculateBackoffDelay(3, baseDelay, maxDelay, 0)).toBe(8000); // 1000 * 2^3 = 8000
    });

    it('should cap delay at maxDelay', () => {
      const baseDelay = 1000;
      const maxDelay = 5000;

      expect(calculateBackoffDelay(4, baseDelay, maxDelay, 0)).toBe(5000); // Would be 16000, capped at 5000
      expect(calculateBackoffDelay(10, baseDelay, maxDelay, 0)).toBe(5000); // Would be 1024000, capped at 5000
    });

    it('should apply jitter within specified range', () => {
      const baseDelay = 1000;
      const maxDelay = 10000;
      const jitterFactor = 0.25;

      // Run multiple times to test jitter range
      for (let i = 0; i < 100; i++) {
        const delay = calculateBackoffDelay(1, baseDelay, maxDelay, jitterFactor);
        // With jitter of 0.25, delay should be between 1500 and 2500 (2000 ± 25%)
        expect(delay).toBeGreaterThanOrEqual(1500);
        expect(delay).toBeLessThanOrEqual(2500);
      }
    });

    it('should ensure minimum delay is baseDelay', () => {
      const baseDelay = 1000;
      const maxDelay = 10000;
      const jitterFactor = 0.9; // High jitter

      // Even with high jitter, should not go below baseDelay
      for (let i = 0; i < 50; i++) {
        const delay = calculateBackoffDelay(0, baseDelay, maxDelay, jitterFactor);
        expect(delay).toBeGreaterThanOrEqual(baseDelay);
      }
    });
  });

  describe('parseRetryAfterHeader', () => {
    it('should parse numeric seconds', () => {
      expect(parseRetryAfterHeader(5)).toBe(5000);
      expect(parseRetryAfterHeader('10')).toBe(10000);
      expect(parseRetryAfterHeader('120')).toBe(120000);
      expect(parseRetryAfterHeader(0)).toBe(0);
    });

    it('should parse HTTP-date format', () => {
      // Mock current time
      const now = new Date('2025-01-19T12:00:00Z').getTime();
      vi.spyOn(Date, 'now').mockReturnValue(now);

      // Future date
      const futureDate = 'Sun, 19 Jan 2025 12:00:05 GMT';
      expect(parseRetryAfterHeader(futureDate)).toBe(5000);

      // Past date should return 0
      const pastDate = 'Sun, 19 Jan 2025 11:59:55 GMT';
      expect(parseRetryAfterHeader(pastDate)).toBe(0);
    });

    it('should handle invalid values', () => {
      expect(parseRetryAfterHeader('')).toBeNull();
      expect(parseRetryAfterHeader('invalid')).toBeNull();
      expect(parseRetryAfterHeader('not-a-date')).toBeNull();
      expect(parseRetryAfterHeader('-5')).toBeNull();
    });

    it('should handle null and undefined', () => {
      expect(parseRetryAfterHeader(null as any)).toBeNull();
      expect(parseRetryAfterHeader(undefined as any)).toBeNull();
    });
  });

  describe('getRetryDelay', () => {
    it('should use Retry-After header when present and respected', () => {
      const headers = { 'retry-after': '5' };
      const delay = getRetryDelay(headers, 2, 1000, 10000, 0.25, true);
      expect(delay).toBe(5000);
    });

    it('should handle different header case variations', () => {
      expect(getRetryDelay({ 'Retry-After': '3' }, 0, 1000, 10000, 0, true)).toBe(3000);
      expect(getRetryDelay({ 'RETRY-AFTER': '3' }, 0, 1000, 10000, 0, true)).toBe(3000);
    });

    it('should cap Retry-After at maxDelay', () => {
      const headers = { 'retry-after': '120' };
      const delay = getRetryDelay(headers, 0, 1000, 5000, 0, true);
      expect(delay).toBe(5000); // Capped at maxDelay
    });

    it('should use exponential backoff when Retry-After not respected', () => {
      const headers = { 'retry-after': '5' };
      const delay = getRetryDelay(headers, 1, 1000, 10000, 0, false);
      expect(delay).toBe(2000); // Exponential backoff instead of Retry-After
    });

    it('should use exponential backoff when no Retry-After header', () => {
      const delay = getRetryDelay({}, 2, 1000, 10000, 0, true);
      expect(delay).toBe(4000); // 1000 * 2^2
    });

    it('should handle array header values', () => {
      const headers = { 'retry-after': ['5', '10'] };
      const delay = getRetryDelay(headers, 0, 1000, 10000, 0, true);
      expect(delay).toBe(5000); // Uses first value
    });
  });

  describe('sleep', () => {
    it('should resolve after specified duration', async () => {
      vi.useFakeTimers();

      let resolved = false;
      const promise = sleep(100).then(() => {
        resolved = true;
      });

      // Should not resolve immediately
      expect(resolved).toBe(false);

      // Advance time by 50ms
      vi.advanceTimersByTime(50);
      await Promise.resolve();
      expect(resolved).toBe(false);

      // Advance to 100ms
      vi.advanceTimersByTime(50);
      await promise;
      expect(resolved).toBe(true);

      vi.useRealTimers();
    });

    it('should resolve immediately for 0 delay', async () => {
      await sleep(0);
      // Should complete without error
      expect(true).toBe(true);
    });
  });

  describe('generateJitteredDelays', () => {
    it('should generate correct number of delays', () => {
      const delays = generateJitteredDelays(1000, 0.25, 10);
      expect(delays).toHaveLength(10);
    });

    it('should apply jitter to all delays', () => {
      const baseDelay = 1000;
      const jitterFactor = 0.25;
      const delays = generateJitteredDelays(baseDelay, jitterFactor, 100);

      for (const delay of delays) {
        expect(delay).toBeGreaterThanOrEqual(750); // 1000 * (1 - 0.25)
        expect(delay).toBeLessThanOrEqual(1250); // 1000 * (1 + 0.25)
      }
    });

    it('should produce varied delays with jitter', () => {
      const delays = generateJitteredDelays(1000, 0.5, 100);
      const uniqueDelays = new Set(delays);

      // With jitter, we should have many unique values
      expect(uniqueDelays.size).toBeGreaterThan(50);
    });

    it('should produce identical delays without jitter', () => {
      const delays = generateJitteredDelays(1000, 0, 10);
      const uniqueDelays = new Set(delays);

      // Without jitter, all delays should be the same
      expect(uniqueDelays.size).toBe(1);
      expect(delays[0]).toBe(1000);
    });
  });

  describe('isProperlyDistributed', () => {
    it('should return true for well-distributed delays', () => {
      const delays = [100, 105, 95, 110, 90, 102, 98, 108, 92, 106];
      expect(isProperlyDistributed(delays, 0.3)).toBe(true);
    });

    it('should return false when too many identical values', () => {
      const delays = [100, 100, 100, 100, 105, 95, 100, 100, 90, 100];
      expect(isProperlyDistributed(delays, 0.3)).toBe(false); // 70% are 100
    });

    it('should handle empty array', () => {
      expect(isProperlyDistributed([], 0.3)).toBe(true);
    });

    it('should respect custom threshold', () => {
      const delays = [100, 100, 100, 105, 95]; // 60% are 100
      expect(isProperlyDistributed(delays, 0.5)).toBe(false); // Threshold 50%
      expect(isProperlyDistributed(delays, 0.7)).toBe(true); // Threshold 70%
    });

    it('should work with generateJitteredDelays', () => {
      // With jitter, delays should be properly distributed
      const delays = generateJitteredDelays(1000, 0.25, 100);
      expect(isProperlyDistributed(delays, 0.3)).toBe(true);

      // Without jitter, all delays are the same
      const uniformDelays = generateJitteredDelays(1000, 0, 100);
      expect(isProperlyDistributed(uniformDelays, 0.3)).toBe(false);
    });
  });

  describe('Property-based tests', () => {
    it('should always increase delay exponentially without jitter', () => {
      const baseDelay = 1000;
      const maxDelay = 1000000;

      let previousDelay = 0;
      for (let attempt = 0; attempt < 10; attempt++) {
        const delay = calculateBackoffDelay(attempt, baseDelay, maxDelay, 0);
        if (attempt > 0) {
          expect(delay).toBe(Math.min(previousDelay * 2, maxDelay));
        }
        previousDelay = delay;
      }
    });

    it('should never exceed maxDelay regardless of attempts', () => {
      const baseDelay = 100;
      const maxDelay = 5000;

      for (let attempt = 0; attempt < 100; attempt++) {
        const delay = calculateBackoffDelay(attempt, baseDelay, maxDelay, Math.random());
        expect(delay).toBeLessThanOrEqual(maxDelay);
      }
    });

    it('should maintain jitter bounds for any valid inputs', () => {
      for (let i = 0; i < 100; i++) {
        const baseDelay = Math.floor(Math.random() * 5000) + 100;
        const maxDelay = baseDelay * 10;
        const attempt = Math.floor(Math.random() * 10);
        const jitterFactor = Math.random();

        const delay = calculateBackoffDelay(attempt, baseDelay, maxDelay, jitterFactor);
        const expectedBase = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
        const minDelay = Math.max(baseDelay, expectedBase * (1 - jitterFactor / 2));
        const maxDelayWithJitter = expectedBase * (1 + jitterFactor / 2);

        expect(delay).toBeGreaterThanOrEqual(Math.floor(minDelay * 0.9)); // Allow some rounding tolerance
        expect(delay).toBeLessThanOrEqual(Math.ceil(maxDelayWithJitter * 1.1));
      }
    });
  });
});
