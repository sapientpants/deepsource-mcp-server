/**
 * @fileoverview Exponential backoff implementation with jitter
 * Calculates retry delays and handles Retry-After headers
 */

import { createLogger } from '../logging/logger.js';

const logger = createLogger('ExponentialBackoff');

/**
 * Calculate exponential backoff delay with jitter
 * @param attempt The current retry attempt (0-indexed)
 * @param baseDelay Base delay in milliseconds
 * @param maxDelay Maximum delay in milliseconds
 * @param jitterFactor Jitter factor (0.0 to 1.0)
 * @returns Delay in milliseconds
 */
export function calculateBackoffDelay(
  attempt: number,
  baseDelay: number,
  maxDelay: number,
  jitterFactor = 0.25
): number {
  // Calculate exponential backoff: baseDelay * (2 ^ attempt)
  const exponentialDelay = baseDelay * Math.pow(2, attempt);

  // Cap at maximum delay
  const cappedDelay = Math.min(exponentialDelay, maxDelay);

  // Apply jitter: delay * (1 + (random - 0.5) * jitterFactor)
  const jitter = (Math.random() - 0.5) * jitterFactor;
  const jitteredDelay = cappedDelay * (1 + jitter);

  // Ensure delay is at least baseDelay and at most maxDelay
  const finalDelay = Math.min(maxDelay, Math.max(baseDelay, Math.round(jitteredDelay)));

  logger.debug('Calculated backoff delay', {
    attempt,
    baseDelay,
    maxDelay,
    jitterFactor,
    exponentialDelay,
    cappedDelay,
    jitter: jitter.toFixed(3),
    finalDelay,
  });

  return finalDelay;
}

/**
 * Parse Retry-After header value
 * @param retryAfter The Retry-After header value
 * @returns Delay in milliseconds, or null if invalid
 */
export function parseRetryAfterHeader(retryAfter: string | number): number | null {
  if (retryAfter === null || retryAfter === undefined || retryAfter === '') {
    return null;
  }

  // If it's already a number, treat it as seconds
  if (typeof retryAfter === 'number') {
    if (retryAfter < 0 || isNaN(retryAfter)) {
      return null;
    }
    const delayMs = retryAfter * 1000;
    logger.debug('Parsed Retry-After as seconds', { retryAfter, delayMs });
    return delayMs;
  }

  const retryAfterStr = String(retryAfter).trim();

  // Check if it's a positive number (seconds)
  const seconds = parseInt(retryAfterStr, 10);
  // Must be non-negative integer string to be valid
  if (!isNaN(seconds) && seconds >= 0 && /^\d+$/.test(retryAfterStr)) {
    const delayMs = seconds * 1000;
    logger.debug('Parsed Retry-After as seconds string', { retryAfterStr, seconds, delayMs });
    return delayMs;
  }

  // Try to parse as HTTP-date (RFC 7231)
  // Example: "Wed, 21 Oct 2025 07:28:00 GMT"
  // Only accept proper HTTP-date format, not arbitrary date strings
  if (retryAfterStr.includes(' ') && retryAfterStr.length > 10) {
    try {
      const retryDate = new Date(retryAfterStr);
      if (!isNaN(retryDate.getTime()) && retryDate.getTime() > 0) {
        const now = Date.now();
        const delayMs = Math.max(0, retryDate.getTime() - now);
        logger.debug('Parsed Retry-After as HTTP-date', {
          retryAfterStr,
          retryDate: retryDate.toISOString(),
          now: new Date(now).toISOString(),
          delayMs,
        });
        return delayMs;
      }
    } catch (error) {
      logger.debug('Failed to parse Retry-After as date', { retryAfterStr, error });
    }
  }

  logger.warn('Invalid Retry-After header format', { retryAfter: retryAfterStr });
  return null;
}

/**
 * Get delay from response headers or calculate using backoff
 * @param headers Response headers
 * @param attempt Current retry attempt
 * @param baseDelay Base delay in milliseconds
 * @param maxDelay Maximum delay in milliseconds
 * @param jitterFactor Jitter factor
 * @param respectRetryAfter Whether to respect Retry-After headers
 * @returns Delay in milliseconds
 */
export function getRetryDelay(
  headers: Record<string, string | string[] | undefined> | undefined,
  attempt: number,
  baseDelay: number,
  maxDelay: number,
  jitterFactor: number,
  respectRetryAfter = true
): number {
  // Check for Retry-After header if we should respect it
  if (respectRetryAfter && headers) {
    // Try different case variations
    const retryAfterValue =
      headers['retry-after'] ?? headers['Retry-After'] ?? headers['RETRY-AFTER'];

    if (retryAfterValue) {
      const retryAfterStr = Array.isArray(retryAfterValue) ? retryAfterValue[0] : retryAfterValue;
      const parsedDelay = retryAfterStr ? parseRetryAfterHeader(retryAfterStr) : null;

      if (parsedDelay !== null) {
        // Cap Retry-After delay at maxDelay
        const cappedDelay = Math.min(parsedDelay, maxDelay);
        logger.debug('Using Retry-After header delay', {
          retryAfter: retryAfterStr,
          parsedDelay,
          cappedDelay,
        });
        return cappedDelay;
      }
    }
  }

  // Fall back to exponential backoff with jitter
  return calculateBackoffDelay(attempt, baseDelay, maxDelay, jitterFactor);
}

/**
 * Sleep for a specified duration
 * @param ms Duration in milliseconds
 * @returns Promise that resolves after the duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate jitter distribution for thundering herd prevention
 * @param baseDelay Base delay in milliseconds
 * @param jitterFactor Jitter factor (0.0 to 1.0)
 * @param count Number of delays to generate
 * @returns Array of jittered delays
 */
export function generateJitteredDelays(
  baseDelay: number,
  jitterFactor: number,
  count: number
): number[] {
  const delays: number[] = [];

  for (let i = 0; i < count; i++) {
    const jitter = (Math.random() - 0.5) * jitterFactor;
    const jitteredDelay = baseDelay * (1 + jitter);
    delays.push(Math.round(jitteredDelay));
  }

  return delays;
}

/**
 * Check if delays are properly distributed (for thundering herd prevention)
 * @param delays Array of delays
 * @param threshold Maximum percentage of delays that should be identical
 * @returns True if distribution is acceptable
 */
export function isProperlyDistributed(delays: number[], threshold = 0.3): boolean {
  if (delays.length === 0) {
    return true;
  }

  // Count occurrences of each delay value
  const counts = new Map<number, number>();
  for (const delay of delays) {
    counts.set(delay, (counts.get(delay) ?? 0) + 1);
  }

  // Find the maximum occurrence count
  const maxCount = Math.max(...counts.values());

  // Check if the maximum occurrence is within threshold
  const maxPercentage = maxCount / delays.length;
  return maxPercentage <= threshold;
}
