/**
 * @fileoverview Retry executor that combines all retry components
 * This module orchestrates retry logic using policies, backoff, circuit breakers, and budgets.
 */

import { RetryPolicy, getRetryPolicyForEndpoint } from './retry-policy.js';
import { calculateRetryDelay, sleep } from './exponential-backoff.js';
import { CircuitBreakerManager } from './circuit-breaker.js';
import { RetryBudgetManager } from './retry-budget.js';
import { ErrorCategory } from '../errors/categories.js';
import { ClassifiedError } from '../errors/types.js';
import { createLogger } from '../logging/logger.js';

const logger = createLogger('RetryExecutor');

/**
 * Context information for retry execution
 * @interface
 * @public
 */
export interface RetryContext {
  /** The endpoint or operation being retried */
  endpoint: string;
  /** The attempt number (0-indexed) */
  attemptNumber: number;
  /** Total elapsed time since first attempt */
  elapsedMs: number;
  /** The last error encountered */
  lastError?: unknown;
  /** Whether this is the last attempt */
  isLastAttempt: boolean;
}

/**
 * Result of a retry execution
 * @interface
 * @public
 */
export interface RetryResult<T> {
  /** Whether the operation succeeded */
  success: boolean;
  /** The result data if successful */
  data?: T;
  /** The final error if unsuccessful */
  error?: unknown;
  /** Number of attempts made */
  attempts: number;
  /** Total time taken for all attempts */
  totalDurationMs: number;
  /** Whether retry was blocked by circuit breaker */
  circuitBreakerBlocked: boolean;
  /** Whether retry was blocked by budget exhaustion */
  budgetExhausted: boolean;
}

/**
 * Options for retry execution
 * @interface
 * @public
 */
export interface RetryExecutorOptions {
  /** Override the default retry policy */
  policy?: RetryPolicy;
  /** Custom endpoint name for circuit breaker and budget */
  endpoint?: string;
  /** Callback for each retry attempt */
  onRetryAttempt?: (context: RetryContext) => void;
  /** Maximum total duration for all retries (ms) */
  maxTotalDuration?: number;
  /** Function to extract Retry-After header from error */
  extractRetryAfter?: (error: unknown) => string | undefined;
}

/**
 * Execute a function with automatic retry logic
 * @template T The return type of the function
 * @param fn The function to execute
 * @param options Retry execution options
 * @returns The result of the execution
 * @public
 */
export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  options: RetryExecutorOptions = {}
): Promise<RetryResult<T>> {
  const endpoint = options.endpoint || 'default';
  const policy = options.policy || getRetryPolicyForEndpoint(endpoint);
  const circuitBreakerManager = CircuitBreakerManager.getInstance();
  const retryBudgetManager = RetryBudgetManager.getInstance();
  const circuitBreaker = circuitBreakerManager.getBreaker(endpoint);

  const startTime = Date.now();
  let lastError: unknown;
  let attemptNumber = 0;
  const maxTotalDuration = options.maxTotalDuration || 120000; // 2 minutes default

  logger.debug('Starting retry execution', {
    endpoint,
    policy: policy.name,
    maxAttempts: policy.maxAttempts,
  });

  // Check if circuit breaker allows the initial request
  if (!circuitBreaker.canRequest()) {
    logger.warn('Circuit breaker is open, blocking request', {
      endpoint,
      state: circuitBreaker.getState(),
    });
    return {
      success: false,
      error: new Error(`Circuit breaker is ${circuitBreaker.getState()} for ${endpoint}`),
      attempts: 0,
      totalDurationMs: 0,
      circuitBreakerBlocked: true,
      budgetExhausted: false,
    };
  }

  while (attemptNumber <= policy.maxAttempts) {
    const elapsedMs = Date.now() - startTime;

    // Check if we've exceeded the maximum total duration
    if (elapsedMs > maxTotalDuration) {
      logger.warn('Maximum retry duration exceeded', {
        endpoint,
        elapsedMs,
        maxTotalDuration,
      });
      break;
    }

    // For retries (not the first attempt), check circuit breaker and budget
    if (attemptNumber > 0) {
      // Check circuit breaker
      if (!circuitBreaker.canRequest()) {
        logger.warn('Circuit breaker blocking retry', {
          endpoint,
          attemptNumber,
          state: circuitBreaker.getState(),
        });
        break;
      }

      // Check retry budget
      if (!retryBudgetManager.canRetry(endpoint)) {
        logger.warn('Retry budget exhausted', {
          endpoint,
          attemptNumber,
        });
        return {
          success: false,
          error: lastError,
          attempts: attemptNumber,
          totalDurationMs: elapsedMs,
          circuitBreakerBlocked: false,
          budgetExhausted: true,
        };
      }
    }

    try {
      logger.debug('Executing attempt', {
        endpoint,
        attemptNumber,
        totalAttempts: policy.maxAttempts + 1,
      });

      // Call the retry callback if provided
      if (options.onRetryAttempt && attemptNumber > 0) {
        const context: RetryContext = {
          endpoint,
          attemptNumber,
          elapsedMs,
          lastError,
          isLastAttempt: attemptNumber === policy.maxAttempts,
        };
        options.onRetryAttempt(context);
      }

      // Execute the function
      const result = await fn();

      // Record success
      circuitBreaker.recordSuccess();

      logger.info('Operation succeeded', {
        endpoint,
        attemptNumber,
        totalDurationMs: Date.now() - startTime,
      });

      return {
        success: true,
        data: result,
        attempts: attemptNumber + 1,
        totalDurationMs: Date.now() - startTime,
        circuitBreakerBlocked: false,
        budgetExhausted: false,
      };
    } catch (error) {
      lastError = error;
      logger.debug('Attempt failed', {
        endpoint,
        attemptNumber,
        error: error instanceof Error ? error.message : String(error),
      });

      // Check if the error is retriable
      const isRetriable = isErrorRetriable(error, policy);

      if (!isRetriable) {
        logger.info('Error is not retriable', {
          endpoint,
          attemptNumber,
          errorType: error instanceof Error ? error.constructor.name : typeof error,
        });
        circuitBreaker.recordFailure();
        break;
      }

      // Record failure
      circuitBreaker.recordFailure();

      // If this was the last attempt, don't calculate delay
      if (attemptNumber >= policy.maxAttempts) {
        break;
      }

      // Consume retry budget for the next attempt
      if (!retryBudgetManager.consumeRetry(endpoint)) {
        logger.warn('Failed to consume retry from budget', {
          endpoint,
          attemptNumber,
        });
        return {
          success: false,
          error: lastError,
          attempts: attemptNumber + 1,
          totalDurationMs: Date.now() - startTime,
          circuitBreakerBlocked: false,
          budgetExhausted: true,
        };
      }

      // Calculate and apply backoff delay
      const retryAfterHeader = options.extractRetryAfter?.(error);
      const retryInfo = calculateRetryDelay(attemptNumber, policy, retryAfterHeader);

      logger.info('Waiting before retry', {
        endpoint,
        attemptNumber,
        delayMs: retryInfo.delayMs,
        delaySource: retryInfo.source,
      });

      await sleep(retryInfo.delayMs);
      attemptNumber++;
    }
  }

  // All attempts failed
  logger.error('All retry attempts failed', {
    endpoint,
    attempts: attemptNumber + 1,
    totalDurationMs: Date.now() - startTime,
  });

  return {
    success: false,
    error: lastError,
    attempts: attemptNumber + 1,
    totalDurationMs: Date.now() - startTime,
    circuitBreakerBlocked: false,
    budgetExhausted: false,
  };
}

/**
 * Check if an error is retriable based on the policy
 * @param error The error to check
 * @param policy The retry policy
 * @returns True if the error is retriable
 * @private
 */
function isErrorRetriable(error: unknown, policy: RetryPolicy): boolean {
  // Check if it's a classified error
  if (error && typeof error === 'object' && 'category' in error) {
    const classifiedError = error as ClassifiedError;
    return policy.retriableErrors.includes(classifiedError.category);
  }

  // Check for specific error patterns
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Network errors
    if (
      message.includes('network') ||
      message.includes('econnrefused') ||
      message.includes('econnreset') ||
      message.includes('etimedout')
    ) {
      return policy.retriableErrors.includes(ErrorCategory.NETWORK);
    }

    // Rate limit errors
    if (message.includes('rate limit') || message.includes('429')) {
      return policy.retriableErrors.includes(ErrorCategory.RATE_LIMIT);
    }

    // Server errors
    if (message.includes('500') || message.includes('502') || message.includes('503')) {
      return policy.retriableErrors.includes(ErrorCategory.SERVER);
    }

    // Timeout errors
    if (message.includes('timeout')) {
      return policy.retriableErrors.includes(ErrorCategory.TIMEOUT);
    }
  }

  // Default to not retriable for unknown errors
  return false;
}

/**
 * Create a retry-enabled wrapper for a function
 * @template T The return type of the function
 * @param fn The function to wrap
 * @param options Default retry options for the wrapper
 * @returns A retry-enabled version of the function
 * @public
 */
export function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryExecutorOptions = {}
): () => Promise<T> {
  return async () => {
    const result = await executeWithRetry(fn, options);
    if (result.success && result.data !== undefined) {
      return result.data;
    }
    throw result.error || new Error('Operation failed after retries');
  };
}
