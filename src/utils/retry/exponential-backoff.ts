/**
 * @fileoverview Exponential backoff implementation for retry logic
 * This module handles delay calculations with exponential growth and jitter.
 */

import { RetryPolicy } from './retry-policy.js';
import { createLogger } from '../logging/logger.js';

const logger = createLogger('ExponentialBackoff');

/**
 * Information about a Retry-After header
 * @interface
 * @public
 */
export interface RetryAfterInfo {
  /** The delay in milliseconds to wait */
  delayMs: number;
  /** The source of the retry information */
  source: 'header-seconds' | 'header-date' | 'exponential';
  /** The original header value if present */
  originalValue?: string;
}

/**
 * Calculate exponential backoff delay with jitter
 * @param attemptNumber The current retry attempt (0-indexed)
 * @param policy The retry policy to use
 * @returns The delay in milliseconds
 * @public
 */
export function calculateBackoffDelay(attemptNumber: number, policy: RetryPolicy): number {
  // Calculate base exponential backoff: baseDelay * (2 ^ attempt)
  const exponentialDelay = policy.baseDelay * Math.pow(2, attemptNumber);

  // Cap at maximum delay
  const cappedDelay = Math.min(exponentialDelay, policy.maxDelay);

  // Apply jitter to prevent thundering herd
  const jitterRange = cappedDelay * policy.jitterFactor;
  const jitter = (Math.random() - 0.5) * 2 * jitterRange;
  const finalDelay = Math.round(cappedDelay + jitter);

  // Ensure delay is never negative
  const safeDelay = Math.max(0, finalDelay);

  logger.debug('Calculated backoff delay', {
    attemptNumber,
    baseDelay: policy.baseDelay,
    exponentialDelay,
    cappedDelay,
    jitterFactor: policy.jitterFactor,
    jitter: Math.round(jitter),
    finalDelay: safeDelay,
  });

  return safeDelay;
}

/**
 * Parse a Retry-After header value
 * Supports both seconds (e.g., "120") and HTTP-date format
 * @param retryAfterHeader The Retry-After header value
 * @returns The parsed retry information or null if invalid
 * @public
 */
export function parseRetryAfter(retryAfterHeader: string | undefined): RetryAfterInfo | null {
  if (!retryAfterHeader) {
    return null;
  }

  const trimmedHeader = retryAfterHeader.trim();

  // First, try to parse as seconds (most common)
  const secondsMatch = /^\d+$/.test(trimmedHeader);
  if (secondsMatch) {
    const seconds = parseInt(trimmedHeader, 10);
    if (!isNaN(seconds) && seconds >= 0) {
      const delayMs = seconds * 1000;
      logger.debug('Parsed Retry-After as seconds', { seconds, delayMs });
      return {
        delayMs,
        source: 'header-seconds',
        originalValue: trimmedHeader,
      };
    }
  }

  // Check for negative numbers (invalid)
  if (/^-\d+$/.test(trimmedHeader)) {
    logger.warn('Negative Retry-After value', { header: trimmedHeader });
    return null;
  }

  // Try to parse as HTTP-date (e.g., "Wed, 21 Oct 2025 07:28:00 GMT")
  try {
    const retryDate = new Date(trimmedHeader);
    if (!isNaN(retryDate.getTime())) {
      const now = Date.now();
      const delayMs = Math.max(0, retryDate.getTime() - now);
      logger.debug('Parsed Retry-After as HTTP-date', {
        retryDate: retryDate.toISOString(),
        delayMs,
      });
      return {
        delayMs,
        source: 'header-date',
        originalValue: trimmedHeader,
      };
    }
  } catch (error) {
    logger.debug('Failed to parse Retry-After as date', { header: trimmedHeader, error });
  }

  logger.warn('Could not parse Retry-After header', { header: trimmedHeader });
  return null;
}

/**
 * Calculate the retry delay considering both policy and Retry-After header
 * @param attemptNumber The current retry attempt (0-indexed)
 * @param policy The retry policy to use
 * @param retryAfterHeader Optional Retry-After header value
 * @returns The retry information with calculated delay
 * @public
 */
export function calculateRetryDelay(
  attemptNumber: number,
  policy: RetryPolicy,
  retryAfterHeader?: string
): RetryAfterInfo {
  // If policy respects Retry-After headers and one is present, use it
  if (policy.respectRetryAfter && retryAfterHeader) {
    const retryAfterInfo = parseRetryAfter(retryAfterHeader);
    if (retryAfterInfo) {
      // Still apply max delay cap from policy
      const cappedDelay = Math.min(retryAfterInfo.delayMs, policy.maxDelay);
      if (cappedDelay !== retryAfterInfo.delayMs) {
        logger.debug('Capped Retry-After delay to policy maximum', {
          original: retryAfterInfo.delayMs,
          capped: cappedDelay,
        });
      }
      return {
        ...retryAfterInfo,
        delayMs: cappedDelay,
      };
    }
  }

  // Fall back to exponential backoff
  const delayMs = calculateBackoffDelay(attemptNumber, policy);
  return {
    delayMs,
    source: 'exponential',
  };
}

/**
 * Sleep for a specified duration
 * @param ms The number of milliseconds to sleep
 * @returns A promise that resolves after the specified duration
 * @public
 */
export function sleep(ms: number): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate the total maximum possible delay for a retry policy
 * This is useful for timeouts and resource planning
 * @param policy The retry policy
 * @returns The maximum total delay in milliseconds
 * @public
 */
export function calculateMaxTotalDelay(policy: RetryPolicy): number {
  if (policy.maxAttempts === 0) {
    return 0;
  }

  let totalDelay = 0;
  for (let i = 0; i < policy.maxAttempts; i++) {
    const exponentialDelay = policy.baseDelay * Math.pow(2, i);
    const cappedDelay = Math.min(exponentialDelay, policy.maxDelay);
    totalDelay += cappedDelay;
  }

  // Add jitter buffer (max possible jitter on each attempt)
  const maxJitterPerAttempt = policy.maxDelay * policy.jitterFactor;
  totalDelay += maxJitterPerAttempt * policy.maxAttempts;

  return Math.round(totalDelay);
}

/**
 * Check if we should continue retrying based on elapsed time
 * @param startTime The timestamp when retries started
 * @param maxDuration Maximum duration allowed for retries (ms)
 * @returns True if we can continue retrying
 * @public
 */
export function canContinueRetrying(startTime: number, maxDuration: number): boolean {
  const elapsed = Date.now() - startTime;
  return elapsed < maxDuration;
}
