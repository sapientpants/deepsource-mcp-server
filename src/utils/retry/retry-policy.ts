/**
 * @fileoverview Retry policy configuration for DeepSource MCP Server
 * This module defines retry policies and configuration for automatic retries.
 */

import { ErrorCategory } from '../errors/categories.js';

/**
 * Retry policy configuration for API operations
 * @interface
 * @public
 */
export interface RetryPolicy {
  /** Maximum number of retry attempts */
  maxAttempts: number;
  /** Base delay in milliseconds for exponential backoff */
  baseDelay: number;
  /** Maximum delay in milliseconds */
  maxDelay: number;
  /** Jitter factor (0-1) for randomization */
  jitterFactor: number;
  /** Error categories that should trigger a retry */
  retriableErrors: ErrorCategory[];
  /** Whether to respect Retry-After headers */
  respectRetryAfter: boolean;
  /** Policy name for logging */
  name: string;
}

/**
 * Retry policy presets
 * @enum
 * @public
 */
export enum RetryPolicyType {
  /** Aggressive retry for critical read operations */
  AGGRESSIVE = 'aggressive',
  /** Standard retry for normal operations */
  STANDARD = 'standard',
  /** Cautious retry for sensitive operations */
  CAUTIOUS = 'cautious',
  /** No retry for mutations */
  NONE = 'none',
}

/**
 * Default retry configuration from environment variables
 * @private
 */
const DEFAULT_CONFIG = {
  maxAttempts: parseInt(process.env.RETRY_MAX_ATTEMPTS || '3', 10),
  baseDelay: parseInt(process.env.RETRY_BASE_DELAY_MS || '1000', 10),
  maxDelay: parseInt(process.env.RETRY_MAX_DELAY_MS || '30000', 10),
  jitterFactor: 0.25,
  respectRetryAfter: true,
};

/**
 * Retriable error categories
 * @private
 */
const RETRIABLE_ERRORS: ErrorCategory[] = [
  ErrorCategory.RATE_LIMIT,
  ErrorCategory.NETWORK,
  ErrorCategory.TIMEOUT,
  ErrorCategory.SERVER,
];

/**
 * Predefined retry policies for different operation types
 * @public
 */
export const RETRY_POLICIES: Record<RetryPolicyType, RetryPolicy> = {
  [RetryPolicyType.AGGRESSIVE]: {
    maxAttempts: 5,
    baseDelay: DEFAULT_CONFIG.baseDelay,
    maxDelay: DEFAULT_CONFIG.maxDelay,
    jitterFactor: DEFAULT_CONFIG.jitterFactor,
    retriableErrors: RETRIABLE_ERRORS,
    respectRetryAfter: DEFAULT_CONFIG.respectRetryAfter,
    name: 'aggressive',
  },
  [RetryPolicyType.STANDARD]: {
    maxAttempts: DEFAULT_CONFIG.maxAttempts,
    baseDelay: DEFAULT_CONFIG.baseDelay,
    maxDelay: DEFAULT_CONFIG.maxDelay,
    jitterFactor: DEFAULT_CONFIG.jitterFactor,
    retriableErrors: RETRIABLE_ERRORS,
    respectRetryAfter: DEFAULT_CONFIG.respectRetryAfter,
    name: 'standard',
  },
  [RetryPolicyType.CAUTIOUS]: {
    maxAttempts: 1,
    baseDelay: DEFAULT_CONFIG.baseDelay * 2,
    maxDelay: DEFAULT_CONFIG.maxDelay,
    jitterFactor: DEFAULT_CONFIG.jitterFactor,
    retriableErrors: RETRIABLE_ERRORS,
    respectRetryAfter: DEFAULT_CONFIG.respectRetryAfter,
    name: 'cautious',
  },
  [RetryPolicyType.NONE]: {
    maxAttempts: 0,
    baseDelay: 0,
    maxDelay: 0,
    jitterFactor: 0,
    retriableErrors: [],
    respectRetryAfter: false,
    name: 'none',
  },
};

/**
 * Map of endpoint patterns to retry policies
 * Used to determine which policy to apply for a given operation
 * @public
 */
export const ENDPOINT_POLICIES: Map<string, RetryPolicyType> = new Map([
  // Critical read operations - aggressive retry
  ['projects', RetryPolicyType.AGGRESSIVE],
  ['project_issues', RetryPolicyType.AGGRESSIVE],

  // Standard read operations
  ['quality_metrics', RetryPolicyType.STANDARD],
  ['runs', RetryPolicyType.STANDARD],
  ['run', RetryPolicyType.STANDARD],
  ['recent_run_issues', RetryPolicyType.STANDARD],
  ['dependency_vulnerabilities', RetryPolicyType.STANDARD],
  ['compliance_report', RetryPolicyType.STANDARD],

  // Mutation operations - no retry
  ['update_metric_threshold', RetryPolicyType.NONE],
  ['update_metric_setting', RetryPolicyType.NONE],
]);

/**
 * Get retry policy for a given endpoint
 * @param endpoint The endpoint or operation name
 * @returns The appropriate retry policy
 * @public
 */
export function getRetryPolicyForEndpoint(endpoint: string): RetryPolicy {
  const policyType = ENDPOINT_POLICIES.get(endpoint) ?? RetryPolicyType.STANDARD;
  return RETRY_POLICIES[policyType];
}

/**
 * Check if an error category is retriable according to a policy
 * @param errorCategory The error category to check
 * @param policy The retry policy to check against
 * @returns True if the error is retriable
 * @public
 */
export function isRetriableByPolicy(errorCategory: ErrorCategory, policy: RetryPolicy): boolean {
  return policy.retriableErrors.includes(errorCategory);
}

/**
 * Create a custom retry policy
 * @param options Partial policy options to override defaults
 * @returns A new retry policy
 * @public
 */
export function createCustomPolicy(options: Partial<RetryPolicy>): RetryPolicy {
  return {
    ...RETRY_POLICIES[RetryPolicyType.STANDARD],
    ...options,
    name: options.name || 'custom',
  };
}
