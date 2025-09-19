/**
 * @fileoverview Retry configuration settings
 * Centralizes retry-related configuration from environment variables
 */

import { RetryConfig } from '../utils/retry/retry-policy.js';

export { RetryConfig } from '../utils/retry/retry-policy.js';

/**
 * Load retry configuration from environment variables
 * @returns Complete retry configuration
 */
export function loadRetryConfig(): RetryConfig {
  return {
    maxAttempts: parseInt(process.env.RETRY_MAX_ATTEMPTS ?? '3', 10),
    baseDelayMs: parseInt(process.env.RETRY_BASE_DELAY_MS ?? '1000', 10),
    maxDelayMs: parseInt(process.env.RETRY_MAX_DELAY_MS ?? '30000', 10),
    retryBudgetPerMinute: parseInt(process.env.RETRY_BUDGET_PER_MINUTE ?? '10', 10),
    circuitBreakerThreshold: parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD ?? '5', 10),
    circuitBreakerTimeoutMs: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT_MS ?? '30000', 10),
  };
}

/**
 * Validate retry configuration
 * @param config Configuration to validate
 * @returns True if valid, throws error otherwise
 */
export function validateRetryConfig(config: RetryConfig): boolean {
  if (config.maxAttempts < 0 || config.maxAttempts > 10) {
    throw new Error('RETRY_MAX_ATTEMPTS must be between 0 and 10');
  }

  if (config.baseDelayMs < 100 || config.baseDelayMs > 60000) {
    throw new Error('RETRY_BASE_DELAY_MS must be between 100 and 60000');
  }

  if (config.maxDelayMs < config.baseDelayMs || config.maxDelayMs > 300000) {
    throw new Error('RETRY_MAX_DELAY_MS must be >= baseDelay and <= 300000');
  }

  if (config.retryBudgetPerMinute < 1 || config.retryBudgetPerMinute > 100) {
    throw new Error('RETRY_BUDGET_PER_MINUTE must be between 1 and 100');
  }

  if (config.circuitBreakerThreshold < 1 || config.circuitBreakerThreshold > 20) {
    throw new Error('CIRCUIT_BREAKER_THRESHOLD must be between 1 and 20');
  }

  if (config.circuitBreakerTimeoutMs < 1000 || config.circuitBreakerTimeoutMs > 300000) {
    throw new Error('CIRCUIT_BREAKER_TIMEOUT_MS must be between 1000 and 300000');
  }

  return true;
}

/**
 * Get default retry configuration for testing
 * @returns Default retry configuration
 */
export function getDefaultRetryConfig(): RetryConfig {
  return {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    retryBudgetPerMinute: 10,
    circuitBreakerThreshold: 5,
    circuitBreakerTimeoutMs: 30000,
  };
}

/**
 * Get aggressive retry configuration for critical operations
 * @returns Aggressive retry configuration
 */
export function getAggressiveRetryConfig(): RetryConfig {
  return {
    maxAttempts: 5,
    baseDelayMs: 500,
    maxDelayMs: 30000,
    retryBudgetPerMinute: 20,
    circuitBreakerThreshold: 8,
    circuitBreakerTimeoutMs: 20000,
  };
}

/**
 * Get cautious retry configuration for write operations
 * @returns Cautious retry configuration
 */
export function getCautiousRetryConfig(): RetryConfig {
  return {
    maxAttempts: 1,
    baseDelayMs: 2000,
    maxDelayMs: 10000,
    retryBudgetPerMinute: 5,
    circuitBreakerThreshold: 3,
    circuitBreakerTimeoutMs: 60000,
  };
}
