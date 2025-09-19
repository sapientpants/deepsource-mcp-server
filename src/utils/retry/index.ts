/**
 * @fileoverview Main exports for the retry mechanism module
 * Provides a unified interface for retry functionality
 */

// Policy exports
export {
  RetryPolicy,
  RetryConfig,
  EndpointCategory,
  DEFAULT_RETRY_POLICIES,
  ENDPOINT_POLICIES,
  IDEMPOTENT_HTTP_METHODS,
  IDEMPOTENT_GRAPHQL_OPERATIONS,
  getRetryPolicyForEndpoint,
  getRetryConfig,
  isIdempotentHttpMethod,
  isIdempotentGraphQLOperation,
  isRetriableError,
} from './retry-policy.js';

// Exponential backoff exports
export {
  calculateBackoffDelay,
  parseRetryAfterHeader,
  getRetryDelay,
  sleep,
  generateJitteredDelays,
  isProperlyDistributed,
} from './exponential-backoff.js';

// Circuit breaker exports
export {
  CircuitBreaker,
  CircuitBreakerManager,
  CircuitState,
  CircuitBreakerConfig,
  CircuitStats,
  DEFAULT_CIRCUIT_CONFIG,
} from './circuit-breaker.js';

// Retry budget exports
export {
  RetryBudget,
  RetryBudgetManager,
  RetryBudgetConfig,
  BudgetStats,
  DEFAULT_BUDGET_CONFIG,
} from './retry-budget.js';

// Retry executor exports
export {
  executeWithRetry,
  createRetryInterceptor,
  createRetryErrorInterceptor,
  RetryContext,
  RetryResult,
  RetryExecutorOptions,
  RetryTelemetry,
} from './retry-executor.js';

// Re-export error categories for convenience
export { ErrorCategory } from '../errors/categories.js';
