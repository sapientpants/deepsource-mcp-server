/**
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest';
import {
  calculateBackoffDelay,
  parseRetryAfter,
  calculateRetryDelay,
  sleep,
  calculateMaxTotalDelay,
  canContinueRetrying,
} from '../../../utils/retry/exponential-backoff.js';
import { RetryPolicy } from '../../../utils/retry/retry-policy.js';
import { ErrorCategory } from '../../../utils/errors/categories.js';

describe('Exponential Backoff', () => {
  const testPolicy: RetryPolicy = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    jitterFactor: 0.25,
    retriableErrors: [ErrorCategory.NETWORK],
    respectRetryAfter: true,
    name: 'test',
  };

  describe('calculateBackoffDelay', () => {
    it('should calculate exponential backoff correctly', () => {
      // Without jitter (jitterFactor = 0)
      const noJitterPolicy = { ...testPolicy, jitterFactor: 0 };

      expect(calculateBackoffDelay(0, noJitterPolicy)).toBe(1000); // 1000 * 2^0 = 1000
      expect(calculateBackoffDelay(1, noJitterPolicy)).toBe(2000); // 1000 * 2^1 = 2000
      expect(calculateBackoffDelay(2, noJitterPolicy)).toBe(4000); // 1000 * 2^2 = 4000
      expect(calculateBackoffDelay(3, noJitterPolicy)).toBe(8000); // 1000 * 2^3 = 8000
    });

    it('should cap delay at maxDelay', () => {
      const noJitterPolicy = { ...testPolicy, jitterFactor: 0 };

      expect(calculateBackoffDelay(4, noJitterPolicy)).toBe(10000); // Would be 16000, capped at 10000
      expect(calculateBackoffDelay(10, noJitterPolicy)).toBe(10000); // Would be 1024000, capped at 10000
    });

    it('should apply jitter within expected range', () => {
      const delays: number[] = [];
      for (let i = 0; i < 100; i++) {
        delays.push(calculateBackoffDelay(1, testPolicy)); // Base 2000ms
      }

      // With 0.25 jitter factor, delays should be between 1500 and 2500
      const minDelay = Math.min(...delays);
      const maxDelay = Math.max(...delays);

      expect(minDelay).toBeGreaterThanOrEqual(1500);
      expect(maxDelay).toBeLessThanOrEqual(2500);

      // Should have good distribution (not all the same)
      const uniqueDelays = new Set(delays);
      expect(uniqueDelays.size).toBeGreaterThan(50);
    });

    it('should never return negative delays', () => {
      const highJitterPolicy = { ...testPolicy, jitterFactor: 1.0 };

      for (let i = 0; i < 100; i++) {
        const delay = calculateBackoffDelay(0, highJitterPolicy);
        expect(delay).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('parseRetryAfter', () => {
    it('should parse seconds format', () => {
      const result = parseRetryAfter('120');
      expect(result).toBeTruthy();
      expect(result?.delayMs).toBe(120000);
      expect(result?.source).toBe('header-seconds');
      expect(result?.originalValue).toBe('120');
    });

    it('should parse HTTP-date format', () => {
      const futureDate = new Date(Date.now() + 60000); // 1 minute from now
      const httpDate = futureDate.toUTCString();

      const result = parseRetryAfter(httpDate);
      expect(result).toBeTruthy();
      expect(result?.source).toBe('header-date');
      expect(result?.delayMs).toBeGreaterThan(59000);
      expect(result?.delayMs).toBeLessThan(61000);
    });

    it('should handle past dates gracefully', () => {
      const pastDate = new Date(Date.now() - 60000); // 1 minute ago
      const httpDate = pastDate.toUTCString();

      const result = parseRetryAfter(httpDate);
      expect(result).toBeTruthy();
      expect(result?.delayMs).toBe(0);
      expect(result?.source).toBe('header-date');
    });

    it('should return null for invalid values', () => {
      expect(parseRetryAfter(undefined)).toBeNull();
      expect(parseRetryAfter('')).toBeNull();
      expect(parseRetryAfter('invalid')).toBeNull();
      expect(parseRetryAfter('-5')).toBeNull();
      expect(parseRetryAfter('abc123')).toBeNull();
    });

    it('should handle edge cases', () => {
      expect(parseRetryAfter('0')).toEqual({
        delayMs: 0,
        source: 'header-seconds',
        originalValue: '0',
      });

      expect(parseRetryAfter('  120  ')).toEqual({
        delayMs: 120000,
        source: 'header-seconds',
        originalValue: '120',
      });
    });
  });

  describe('calculateRetryDelay', () => {
    it('should use Retry-After header when policy respects it', () => {
      const result = calculateRetryDelay(0, testPolicy, '5');
      expect(result.delayMs).toBe(5000);
      expect(result.source).toBe('header-seconds');
    });

    it('should cap Retry-After delay at policy maxDelay', () => {
      const result = calculateRetryDelay(0, testPolicy, '20'); // 20 seconds > 10 second max
      expect(result.delayMs).toBe(10000);
      expect(result.source).toBe('header-seconds');
    });

    it('should use exponential backoff when no Retry-After header', () => {
      const noJitterPolicy = { ...testPolicy, jitterFactor: 0 };
      const result = calculateRetryDelay(2, noJitterPolicy);
      expect(result.delayMs).toBe(4000);
      expect(result.source).toBe('exponential');
    });

    it('should ignore Retry-After when policy does not respect it', () => {
      const ignorePolicy = { ...testPolicy, respectRetryAfter: false, jitterFactor: 0 };
      const result = calculateRetryDelay(0, ignorePolicy, '5');
      expect(result.delayMs).toBe(1000); // Uses exponential backoff instead
      expect(result.source).toBe('exponential');
    });
  });

  describe('sleep', () => {
    it('should sleep for specified duration', async () => {
      const start = Date.now();
      await sleep(100);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(95); // Allow small variance
      expect(elapsed).toBeLessThan(150);
    });

    it('should return immediately for zero or negative values', async () => {
      const start = Date.now();
      await sleep(0);
      await sleep(-100);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(10);
    });
  });

  describe('calculateMaxTotalDelay', () => {
    it('should calculate total maximum delay correctly', () => {
      const noJitterPolicy = { ...testPolicy, jitterFactor: 0, maxAttempts: 3 };
      // 1000 + 2000 + 4000 = 7000
      expect(calculateMaxTotalDelay(noJitterPolicy)).toBe(7000);
    });

    it('should account for maxDelay cap', () => {
      const noJitterPolicy = { ...testPolicy, jitterFactor: 0, maxAttempts: 5, maxDelay: 5000 };
      // 1000 + 2000 + 4000 + 5000 + 5000 = 17000 (last two capped at 5000)
      expect(calculateMaxTotalDelay(noJitterPolicy)).toBe(17000);
    });

    it('should include jitter buffer', () => {
      const withJitterPolicy = { ...testPolicy, jitterFactor: 0.25, maxAttempts: 3 };
      const total = calculateMaxTotalDelay(withJitterPolicy);
      // Base: 1000 + 2000 + 4000 = 7000
      // Jitter buffer: 10000 * 0.25 * 3 = 7500
      // Total: 7000 + 7500 = 14500
      expect(total).toBeGreaterThan(7000);
      expect(total).toBeLessThanOrEqual(14500);
    });

    it('should return 0 for zero attempts', () => {
      const noAttemptsPolicy = { ...testPolicy, maxAttempts: 0 };
      expect(calculateMaxTotalDelay(noAttemptsPolicy)).toBe(0);
    });
  });

  describe('canContinueRetrying', () => {
    it('should allow retrying within duration', () => {
      const startTime = Date.now();
      expect(canContinueRetrying(startTime, 1000)).toBe(true);
    });

    it('should prevent retrying after max duration', () => {
      const startTime = Date.now() - 2000; // Started 2 seconds ago
      expect(canContinueRetrying(startTime, 1000)).toBe(false); // 1 second limit
    });

    it('should handle edge cases', () => {
      const now = Date.now();
      expect(canContinueRetrying(now, 0)).toBe(false);
      expect(canContinueRetrying(now - 999, 1000)).toBe(true);
      expect(canContinueRetrying(now - 1001, 1000)).toBe(false);
    });
  });

  describe('Property-based tests for jitter distribution', () => {
    it('should maintain jitter within specified bounds', () => {
      const policy = { ...testPolicy, jitterFactor: 0.3 };
      const attemptNumber = 2;
      const baseDelay = policy.baseDelay * Math.pow(2, attemptNumber);
      const samples = 1000;

      const delays: number[] = [];
      for (let i = 0; i < samples; i++) {
        delays.push(calculateBackoffDelay(attemptNumber, policy));
      }

      // Calculate statistics
      const mean = delays.reduce((a, b) => a + b, 0) / samples;
      const min = Math.min(...delays);
      const max = Math.max(...delays);

      // Mean should be close to base delay
      expect(Math.abs(mean - baseDelay)).toBeLessThan(baseDelay * 0.05);

      // Min and max should be within jitter bounds
      const expectedMin = baseDelay * (1 - policy.jitterFactor);
      const expectedMax = baseDelay * (1 + policy.jitterFactor);
      expect(min).toBeGreaterThanOrEqual(expectedMin * 0.95); // Allow small variance
      expect(max).toBeLessThanOrEqual(expectedMax * 1.05);

      // Should have good distribution
      const stdDev = Math.sqrt(
        delays.map((x) => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / samples
      );
      expect(stdDev).toBeGreaterThan(baseDelay * policy.jitterFactor * 0.2);
    });
  });
});
