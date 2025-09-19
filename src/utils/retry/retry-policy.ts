/**
 * @fileoverview Retry policy configuration for API requests
 * Defines retry strategies and policies for different endpoint categories
 */

import { ErrorCategory } from '../errors/categories.js';

/**
 * HTTP methods that are safe to retry (idempotent operations)
 */
export const IDEMPOTENT_HTTP_METHODS = ['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE'] as const;

/**
 * GraphQL operation types that are safe to retry
 */
export const IDEMPOTENT_GRAPHQL_OPERATIONS = ['query'] as const;

/**
 * Retry policy configuration for API requests
 */
export interface RetryPolicy {
  /** Maximum number of retry attempts */
  maxAttempts: number;
  /** Base delay in milliseconds for exponential backoff */
  baseDelay: number;
  /** Maximum delay in milliseconds between retries */
  maxDelay: number;
  /** Jitter factor (0.0 to 1.0) to randomize delays */
  jitterFactor: number;
  /** Error categories that should trigger retries */
  retriableErrors: ErrorCategory[];
  /** HTTP status codes that should trigger retries */
  retriableStatusCodes: number[];
  /** Whether to respect Retry-After headers */
  respectRetryAfter: boolean;
}

/**
 * Endpoint classification for retry policies
 */
export enum EndpointCategory {
  /** Critical read operations that should retry aggressively */
  AGGRESSIVE = 'aggressive',
  /** Standard operations with balanced retry strategy */
  STANDARD = 'standard',
  /** Write operations that should retry cautiously */
  CAUTIOUS = 'cautious',
}

/**
 * Default retry policies for different endpoint categories
 */
export const DEFAULT_RETRY_POLICIES: Record<EndpointCategory, RetryPolicy> = {
  [EndpointCategory.AGGRESSIVE]: {
    maxAttempts: 5,
    baseDelay: 1000,
    maxDelay: 30000,
    jitterFactor: 0.25,
    retriableErrors: [
      ErrorCategory.NETWORK,
      ErrorCategory.TIMEOUT,
      ErrorCategory.RATE_LIMIT,
      ErrorCategory.SERVER,
    ],
    retriableStatusCodes: [429, 502, 503, 504, 408],
    respectRetryAfter: true,
  },
  [EndpointCategory.STANDARD]: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 20000,
    jitterFactor: 0.25,
    retriableErrors: [
      ErrorCategory.NETWORK,
      ErrorCategory.TIMEOUT,
      ErrorCategory.RATE_LIMIT,
      ErrorCategory.SERVER,
    ],
    retriableStatusCodes: [429, 502, 503, 504],
    respectRetryAfter: true,
  },
  [EndpointCategory.CAUTIOUS]: {
    maxAttempts: 1,
    baseDelay: 2000,
    maxDelay: 10000,
    jitterFactor: 0.1,
    retriableErrors: [ErrorCategory.RATE_LIMIT, ErrorCategory.TIMEOUT],
    retriableStatusCodes: [429, 504],
    respectRetryAfter: true,
  },
};

/**
 * Endpoint to policy category mapping
 */
export const ENDPOINT_POLICIES: Map<string, EndpointCategory> = new Map([
  // Aggressive retry for critical read operations
  ['projects', EndpointCategory.AGGRESSIVE],
  ['project_issues', EndpointCategory.STANDARD],
  ['runs', EndpointCategory.STANDARD],
  ['recent_run_issues', EndpointCategory.STANDARD],

  // Standard retry for normal operations
  ['quality_metrics', EndpointCategory.STANDARD],
  ['compliance_report', EndpointCategory.STANDARD],
  ['dependency_vulnerabilities', EndpointCategory.STANDARD],

  // Cautious retry for write operations
  ['update_metric_threshold', EndpointCategory.CAUTIOUS],
  ['update_metric_setting', EndpointCategory.CAUTIOUS],
]);

/**
 * Get the retry policy for a specific endpoint
 * @param endpoint The API endpoint name
 * @returns The retry policy for the endpoint
 */
export function getRetryPolicyForEndpoint(endpoint: string): RetryPolicy {
  const category = ENDPOINT_POLICIES.get(endpoint) ?? EndpointCategory.STANDARD;
  return DEFAULT_RETRY_POLICIES[category];
}

/**
 * Check if an HTTP method is idempotent and safe to retry
 * @param method The HTTP method
 * @returns True if the method is idempotent
 */
export function isIdempotentHttpMethod(method: string): boolean {
  const upperMethod = method.toUpperCase();
  return IDEMPOTENT_HTTP_METHODS.includes(upperMethod as (typeof IDEMPOTENT_HTTP_METHODS)[number]);
}

/**
 * Check if a GraphQL operation is idempotent and safe to retry
 * @param operationType The GraphQL operation type (query/mutation/subscription)
 * @returns True if the operation is idempotent
 */
export function isIdempotentGraphQLOperation(operationType: string): boolean {
  const lowerType = operationType.toLowerCase();
  return IDEMPOTENT_GRAPHQL_OPERATIONS.includes(
    lowerType as (typeof IDEMPOTENT_GRAPHQL_OPERATIONS)[number]
  );
}

/**
 * Check if an error is retriable based on the retry policy
 * @param error The error to check
 * @param policy The retry policy to apply
 * @returns True if the error is retriable
 */
export function isRetriableError(
  error: { category?: ErrorCategory | undefined; statusCode?: number | undefined },
  policy: RetryPolicy
): boolean {
  // Check error category
  if (error.category && policy.retriableErrors.includes(error.category)) {
    return true;
  }

  // Check status code
  if (error.statusCode && policy.retriableStatusCodes.includes(error.statusCode)) {
    return true;
  }

  return false;
}

/**
 * Configuration for retry mechanism from environment variables
 */
export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryBudgetPerMinute: number;
  circuitBreakerThreshold: number;
  circuitBreakerTimeoutMs: number;
}

/**
 * Get retry configuration from environment variables
 * @returns Retry configuration with defaults
 */
export function getRetryConfig(): RetryConfig {
  return {
    maxAttempts: parseInt(process.env.RETRY_MAX_ATTEMPTS ?? '3', 10),
    baseDelayMs: parseInt(process.env.RETRY_BASE_DELAY_MS ?? '1000', 10),
    maxDelayMs: parseInt(process.env.RETRY_MAX_DELAY_MS ?? '30000', 10),
    retryBudgetPerMinute: parseInt(process.env.RETRY_BUDGET_PER_MINUTE ?? '10', 10),
    circuitBreakerThreshold: parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD ?? '5', 10),
    circuitBreakerTimeoutMs: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT_MS ?? '30000', 10),
  };
}
