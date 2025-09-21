/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { executeWithRetry, withRetry, RetryContext } from '../../../utils/retry/retry-executor.js';
import { CircuitBreakerManager } from '../../../utils/retry/circuit-breaker.js';
import { RetryBudgetManager } from '../../../utils/retry/retry-budget.js';
import { ErrorCategory } from '../../../utils/errors/categories.js';
import { createClassifiedError } from '../../../utils/errors/factory.js';

describe('Retry Executor', () => {
  let circuitBreakerManager: CircuitBreakerManager;
  let retryBudgetManager: RetryBudgetManager;

  beforeEach(() => {
    circuitBreakerManager = CircuitBreakerManager.getInstance();
    retryBudgetManager = RetryBudgetManager.getInstance();
    circuitBreakerManager.clear();
    retryBudgetManager.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('executeWithRetry', () => {
    it('should succeed on first attempt', async () => {
      vi.useRealTimers(); // Use real timers for synchronous success
      const fn = vi.fn().mockResolvedValue('success');

      const result = await executeWithRetry(fn);

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.attempts).toBe(1);
      expect(fn).toHaveBeenCalledTimes(1);
      vi.useFakeTimers(); // Reset to fake timers
    });

    it('should retry on retriable errors', async () => {
      const retriableError = createClassifiedError(
        'Rate limit exceeded',
        ErrorCategory.RATE_LIMIT,
        new Error('429')
      );

      const fn = vi
        .fn()
        .mockRejectedValueOnce(retriableError)
        .mockRejectedValueOnce(retriableError)
        .mockResolvedValueOnce('success');

      const promise = executeWithRetry(fn, {
        endpoint: 'test',
      });

      // Advance through retries
      await vi.advanceTimersByTimeAsync(1500); // First retry
      await vi.advanceTimersByTimeAsync(3000); // Second retry

      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.attempts).toBe(3);
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should not retry non-retriable errors', async () => {
      const nonRetriableError = createClassifiedError(
        'Not found',
        ErrorCategory.NOT_FOUND,
        new Error('404')
      );

      const fn = vi.fn().mockRejectedValue(nonRetriableError);

      const result = await executeWithRetry(fn);

      expect(result.success).toBe(false);
      expect(result.error).toBe(nonRetriableError);
      expect(result.attempts).toBe(1);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should respect circuit breaker', async () => {
      const endpoint = 'test-circuit';
      const breaker = circuitBreakerManager.getBreaker(endpoint);

      // Open the circuit
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure();
      }

      const fn = vi.fn().mockResolvedValue('success');

      const result = await executeWithRetry(fn, { endpoint });

      expect(result.success).toBe(false);
      expect(result.circuitBreakerBlocked).toBe(true);
      expect(result.attempts).toBe(0);
      expect(fn).not.toHaveBeenCalled();
    });

    it('should respect retry budget', async () => {
      const endpoint = 'test-budget';
      const budget = retryBudgetManager.getBudget(endpoint);

      // Exhaust the budget
      for (let i = 0; i < 10; i++) {
        budget.consumeRetry();
      }

      const retriableError = createClassifiedError(
        'Server error',
        ErrorCategory.SERVER,
        new Error('500')
      );

      const fn = vi.fn().mockRejectedValue(retriableError);

      const result = await executeWithRetry(fn, { endpoint });

      expect(result.success).toBe(false);
      expect(result.budgetExhausted).toBe(true);
      expect(result.attempts).toBe(1); // First attempt is made
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should call onRetryAttempt callback', async () => {
      const retriableError = createClassifiedError(
        'Network error',
        ErrorCategory.NETWORK,
        new Error('ECONNREFUSED')
      );

      const fn = vi.fn().mockRejectedValueOnce(retriableError).mockResolvedValueOnce('success');

      const contexts: RetryContext[] = [];
      const onRetryAttempt = vi.fn((context: RetryContext) => {
        contexts.push(context);
      });

      const promise = executeWithRetry(fn, {
        endpoint: 'test',
        onRetryAttempt,
      });

      await vi.advanceTimersByTimeAsync(2000);
      const result = await promise;

      expect(result.success).toBe(true);
      expect(onRetryAttempt).toHaveBeenCalledTimes(1);
      expect(contexts[0]).toMatchObject({
        endpoint: 'test',
        attemptNumber: 1,
        isLastAttempt: false,
      });
    });

    it('should respect maximum total duration', async () => {
      vi.useRealTimers(); // Use real timers for this test
      const retriableError = createClassifiedError(
        'Timeout',
        ErrorCategory.TIMEOUT,
        new Error('ETIMEDOUT')
      );

      const fn = vi.fn().mockRejectedValue(retriableError);

      const result = await executeWithRetry(fn, {
        endpoint: 'test',
        maxTotalDuration: 50, // Very short duration
      });

      expect(result.success).toBe(false);
      expect(fn).toHaveBeenCalledTimes(1); // Should stop after first attempt due to max duration
      vi.useFakeTimers(); // Reset to fake timers
    });

    it('should use custom Retry-After header', async () => {
      const retriableError = createClassifiedError(
        'Rate limit',
        ErrorCategory.RATE_LIMIT,
        new Error('429')
      );

      const fn = vi.fn().mockRejectedValueOnce(retriableError).mockResolvedValueOnce('success');

      const promise = executeWithRetry(fn, {
        endpoint: 'test',
        extractRetryAfter: () => '2', // 2 seconds
      });

      // Should wait 2 seconds as specified by Retry-After
      await vi.advanceTimersByTimeAsync(1500);
      expect(fn).toHaveBeenCalledTimes(1); // Still waiting

      await vi.advanceTimersByTimeAsync(1000);
      const result = await promise;

      expect(result.success).toBe(true);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should exhaust all retry attempts', async () => {
      const retriableError = createClassifiedError(
        'Server error',
        ErrorCategory.SERVER,
        new Error('503')
      );

      const fn = vi.fn().mockRejectedValue(retriableError);

      const promise = executeWithRetry(fn, {
        endpoint: 'test',
      });

      // Advance through all retries
      await vi.advanceTimersByTimeAsync(1500); // First retry
      await vi.advanceTimersByTimeAsync(3000); // Second retry
      await vi.advanceTimersByTimeAsync(6000); // Third retry

      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.error).toBe(retriableError);
      expect(result.attempts).toBe(4); // Initial + 3 retries
      expect(fn).toHaveBeenCalledTimes(4);
    });

    it('should handle circuit breaker opening during retries', async () => {
      vi.useRealTimers(); // Use real timers
      const endpoint = 'test-circuit-open';
      const breaker = circuitBreakerManager.getBreaker(endpoint, {
        failureThreshold: 2,
        failureWindow: 10000,
        recoveryTimeout: 5000,
      });

      const retriableError = createClassifiedError(
        'Server error',
        ErrorCategory.SERVER,
        new Error('500')
      );

      const fn = vi.fn().mockRejectedValue(retriableError);

      const result = await executeWithRetry(fn, { endpoint });

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(3); // Initial + 2 retries before circuit opens
      expect(breaker.getState()).toBe('open');
      vi.useFakeTimers(); // Reset to fake timers
    });
  });

  describe('withRetry', () => {
    it('should create a retry-enabled wrapper', async () => {
      let attemptCount = 0;
      const fn = vi.fn(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw createClassifiedError('Temporary error', ErrorCategory.NETWORK, new Error());
        }
        return 'success';
      });

      const wrappedFn = withRetry(fn);

      const promise = wrappedFn();
      await vi.advanceTimersByTimeAsync(5000);

      const result = await promise;
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should throw error when all retries fail', async () => {
      const error = createClassifiedError(
        'Persistent error',
        ErrorCategory.SERVER,
        new Error('500')
      );

      const fn = vi.fn().mockRejectedValue(error);
      const wrappedFn = withRetry(fn);

      const promise = wrappedFn();
      await vi.advanceTimersByTimeAsync(20000); // Advance through all retries

      await expect(promise).rejects.toThrow();
      expect(fn).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });

    it('should use provided options', async () => {
      vi.useRealTimers(); // Use real timers
      const fn = vi
        .fn()
        .mockRejectedValue(createClassifiedError('Error', ErrorCategory.NETWORK, new Error()));

      const wrappedFn = withRetry(fn, {
        endpoint: 'custom',
        maxTotalDuration: 50, // Very short duration
      });

      await expect(wrappedFn()).rejects.toThrow();
      // Should stop early due to max duration
      expect(fn).toHaveBeenCalledTimes(1);
      vi.useFakeTimers(); // Reset to fake timers
    });
  });

  describe('Error classification', () => {
    it('should correctly identify retriable errors', async () => {
      vi.useRealTimers(); // Use real timers
      const testCases = [
        { error: new Error('Network error'), shouldRetry: true },
        { error: new Error('ECONNREFUSED'), shouldRetry: true },
        { error: new Error('Rate limit exceeded'), shouldRetry: true },
        { error: new Error('500 Internal Server Error'), shouldRetry: true },
        { error: new Error('502 Bad Gateway'), shouldRetry: true },
        { error: new Error('503 Service Unavailable'), shouldRetry: true },
        { error: new Error('Timeout occurred'), shouldRetry: true },
        { error: new Error('404 Not Found'), shouldRetry: false },
        { error: new Error('Invalid input'), shouldRetry: false },
        { error: new Error('Authentication failed'), shouldRetry: false },
      ];

      for (const testCase of testCases) {
        circuitBreakerManager.clear(); // Clear state between tests
        retryBudgetManager.clear();

        const fn = vi.fn().mockRejectedValue(testCase.error);

        // Use a custom policy with minimal retry attempts for speed
        const quickPolicy = {
          maxAttempts: 1,
          baseDelay: 10,
          maxDelay: 100,
          jitterFactor: 0,
          retriableErrors: [
            ErrorCategory.RATE_LIMIT,
            ErrorCategory.NETWORK,
            ErrorCategory.TIMEOUT,
            ErrorCategory.SERVER,
          ],
          respectRetryAfter: false,
          name: 'test-quick',
        };

        const result = await executeWithRetry(fn, {
          endpoint: `test-${Math.random()}`, // Use unique endpoint for each test
          policy: quickPolicy,
        });

        if (testCase.shouldRetry) {
          expect(result.attempts).toBeGreaterThan(1);
        } else {
          expect(result.attempts).toBe(1);
        }
      }
      vi.useFakeTimers(); // Reset to fake timers
    });

    it('should handle classified errors', async () => {
      const classifiedRetriable = createClassifiedError(
        'Server error',
        ErrorCategory.SERVER,
        new Error()
      );

      const classifiedNonRetriable = createClassifiedError(
        'Auth error',
        ErrorCategory.AUTH,
        new Error()
      );

      const fnRetriable = vi
        .fn()
        .mockRejectedValueOnce(classifiedRetriable)
        .mockResolvedValueOnce('success');

      const fnNonRetriable = vi.fn().mockRejectedValue(classifiedNonRetriable);

      const promise1 = executeWithRetry(fnRetriable);
      await vi.advanceTimersByTimeAsync(2000);
      const result1 = await promise1;

      const result2 = await executeWithRetry(fnNonRetriable);

      expect(result1.attempts).toBe(2);
      expect(result2.attempts).toBe(1);
    });
  });

  describe('Integration with all components', () => {
    it('should coordinate circuit breaker, budget, and backoff', async () => {
      const endpoint = 'integration-test';
      const breaker = circuitBreakerManager.getBreaker(endpoint, {
        failureThreshold: 5,
        recoveryTimeout: 1000,
      });
      const budget = retryBudgetManager.getBudget(endpoint);

      const retriableError = createClassifiedError(
        'Intermittent error',
        ErrorCategory.NETWORK,
        new Error()
      );

      let attemptCount = 0;
      const fn = vi.fn(async () => {
        attemptCount++;
        if (attemptCount < 4) {
          throw retriableError;
        }
        return 'success';
      });

      const promise = executeWithRetry(fn, {
        endpoint,
        onRetryAttempt: (context) => {
          // Verify context is properly populated
          expect(context.endpoint).toBe(endpoint);
          expect(context.attemptNumber).toBeGreaterThan(0);
          expect(context.elapsedMs).toBeGreaterThan(0);
        },
      });

      // Advance through retries with exponential backoff
      await vi.advanceTimersByTimeAsync(1500); // ~1s + jitter
      await vi.advanceTimersByTimeAsync(2500); // ~2s + jitter
      await vi.advanceTimersByTimeAsync(5000); // ~4s + jitter

      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(4);

      // Check budget was consumed
      const budgetStats = budget.getStats();
      expect(budgetStats.consumed).toBe(3); // 3 retries

      // Check circuit breaker recorded attempts
      const breakerStats = breaker.getStats();
      expect(breakerStats.failureCount).toBe(3);
      expect(breakerStats.successCount).toBe(1);
      expect(breakerStats.state).toBe('closed');
    });
  });
});
