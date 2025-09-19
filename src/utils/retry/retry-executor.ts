/**
 * @fileoverview Retry executor that orchestrates retry logic with circuit breaker and budget
 * Coordinates all retry mechanisms for resilient API calls
 */

import { AxiosError, AxiosResponse } from 'axios';
import { createLogger } from '../logging/logger.js';
import { ErrorCategory } from '../errors/categories.js';
import { isClassifiedError } from '../errors/types.js';
import { RetryPolicy, isIdempotentHttpMethod, isRetriableError } from './retry-policy.js';
import { getRetryDelay, sleep } from './exponential-backoff.js';
import { CircuitBreaker } from './circuit-breaker.js';
import { RetryBudget } from './retry-budget.js';

const logger = createLogger('RetryExecutor');

/**
 * Retry context for tracking attempt information
 */
export interface RetryContext {
  endpoint: string;
  method: string;
  attempt: number;
  maxAttempts: number;
  totalDelay: number;
  errors: Error[];
}

/**
 * Retry result with metrics
 */
export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  totalDelay: number;
}

/**
 * Options for retry execution
 */
export interface RetryExecutorOptions {
  endpoint: string;
  policy: RetryPolicy;
  circuitBreaker?: CircuitBreaker;
  retryBudget?: RetryBudget;
  onRetry?: (context: RetryContext) => void;
}

/**
 * Telemetry data for retry attempts
 */
export interface RetryTelemetry {
  endpoint: string;
  attemptNumber: number;
  delayMs: number;
  errorCategory: ErrorCategory | undefined;
  errorMessage: string | undefined;
  circuitState: string | undefined;
  budgetRemaining: number | undefined;
}

/**
 * Execute a function with retry logic
 * @template T The return type of the function
 * @param fn The function to execute
 * @param options Retry execution options
 * @returns Result with data or error
 */
export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  options: RetryExecutorOptions
): Promise<RetryResult<T>> {
  const { endpoint, policy, circuitBreaker, retryBudget, onRetry } = options;
  const context: RetryContext = {
    endpoint,
    method: 'unknown',
    attempt: 0,
    maxAttempts: policy.maxAttempts,
    totalDelay: 0,
    errors: [],
  };

  logger.debug('Starting retry execution', {
    endpoint,
    maxAttempts: policy.maxAttempts,
    baseDelay: policy.baseDelay,
  });

  while (context.attempt <= policy.maxAttempts) {
    // Check circuit breaker
    if (circuitBreaker && !circuitBreaker.canAttempt()) {
      const error = new Error(`Circuit breaker is open for endpoint: ${endpoint}`);
      logger.warn('Circuit breaker prevented attempt', {
        endpoint,
        circuitState: circuitBreaker.getState(),
      });
      return {
        success: false,
        error,
        attempts: context.attempt,
        totalDelay: context.totalDelay,
      };
    }

    // Check retry budget (only for retries, not initial attempt)
    if (context.attempt > 0 && retryBudget && !retryBudget.canRetry(endpoint)) {
      const error = new Error(`Retry budget exhausted for endpoint: ${endpoint}`);
      logger.warn('Retry budget exhausted', {
        endpoint,
        attempt: context.attempt,
        budgetStats: retryBudget.getStats(),
      });
      return {
        success: false,
        error,
        attempts: context.attempt,
        totalDelay: context.totalDelay,
      };
    }

    try {
      // Execute the function
      const startTime = Date.now();
      const result = await fn();
      const duration = Date.now() - startTime;

      // Record success
      if (circuitBreaker) {
        circuitBreaker.recordSuccess();
      }

      logger.debug('Retry execution succeeded', {
        endpoint,
        attempt: context.attempt,
        duration,
        totalDelay: context.totalDelay,
      });

      return {
        success: true,
        data: result,
        attempts: context.attempt + 1,
        totalDelay: context.totalDelay,
      };
    } catch (error) {
      context.errors.push(error as Error);

      // Record failure
      if (circuitBreaker) {
        circuitBreaker.recordFailure();
      }

      // Check if error is retriable
      const errorInfo = extractErrorInfo(error);
      const isRetriable = shouldRetry(errorInfo, policy, context);

      logger.debug('Retry execution failed', {
        endpoint,
        attempt: context.attempt,
        isRetriable,
        errorCategory: errorInfo.category,
        statusCode: errorInfo.statusCode,
        errorMessage: errorInfo.message,
      });

      if (!isRetriable || context.attempt >= policy.maxAttempts) {
        // No more retries
        return {
          success: false,
          error: error as Error,
          attempts: context.attempt + 1,
          totalDelay: context.totalDelay,
        };
      }

      // Calculate delay for next attempt
      const delay = getRetryDelay(
        errorInfo.headers,
        context.attempt,
        policy.baseDelay,
        policy.maxDelay,
        policy.jitterFactor,
        policy.respectRetryAfter
      );

      // Consume retry budget
      if (retryBudget) {
        retryBudget.consume(endpoint);
      }

      // Log telemetry
      const telemetry: RetryTelemetry = {
        endpoint,
        attemptNumber: context.attempt + 1,
        delayMs: delay,
        errorCategory: errorInfo.category,
        errorMessage: errorInfo.message,
        circuitState: circuitBreaker?.getState(),
        budgetRemaining: retryBudget?.getRemaining(),
      };
      logRetryTelemetry(telemetry);

      // Notify retry callback
      if (onRetry) {
        onRetry(context);
      }

      // Wait before retry
      logger.debug('Waiting before retry', {
        endpoint,
        attempt: context.attempt,
        delay,
      });
      await sleep(delay);

      context.attempt++;
      context.totalDelay += delay;
    }
  }

  // Should not reach here, but handle edge case
  const lastError = context.errors[context.errors.length - 1];
  return {
    success: false,
    error: lastError ?? new Error('Retry execution failed'),
    attempts: context.attempt,
    totalDelay: context.totalDelay,
  };
}

/**
 * Extract error information for retry logic
 * @param error The error to analyze
 * @returns Error information
 */
function extractErrorInfo(error: unknown): {
  category: ErrorCategory | undefined;
  statusCode: number | undefined;
  message: string;
  headers: Record<string, string | string[] | undefined> | undefined;
  method: string | undefined;
} {
  const info: ReturnType<typeof extractErrorInfo> = {
    message: 'Unknown error',
    category: undefined,
    statusCode: undefined,
    headers: undefined,
    method: undefined,
  };

  if (isClassifiedError(error)) {
    info.category = error.category;
    info.message = error.message;
  }

  if (isAxiosError(error)) {
    info.statusCode = error.response?.status ?? undefined;
    info.headers = error.response?.headers as
      | Record<string, string | string[] | undefined>
      | undefined;
    info.method = error.config?.method?.toUpperCase() ?? undefined;
    info.message = error.message;

    // Try to determine category from status code if not already set
    if (!info.category && info.statusCode) {
      info.category = categorizeByStatusCode(info.statusCode);
    }
  }

  if (error instanceof Error) {
    info.message = error.message;
  }

  return info;
}

/**
 * Type guard for Axios errors
 * @param error The error to check
 * @returns True if it's an AxiosError
 */
function isAxiosError(error: unknown): error is AxiosError {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'isAxiosError' in error &&
      (error as AxiosError).isAxiosError
  );
}

/**
 * Categorize error by status code
 * @param statusCode The HTTP status code
 * @returns Error category
 */
function categorizeByStatusCode(statusCode: number): ErrorCategory | undefined {
  if (statusCode === 429) {
    return ErrorCategory.RATE_LIMIT;
  }
  if (statusCode >= 500) {
    return ErrorCategory.SERVER;
  }
  if (statusCode === 408) {
    return ErrorCategory.TIMEOUT;
  }
  if (statusCode >= 400 && statusCode < 500) {
    return ErrorCategory.CLIENT;
  }
  return undefined;
}

/**
 * Determine if an error should trigger a retry
 * @param errorInfo Error information
 * @param policy Retry policy
 * @param context Retry context
 * @returns True if should retry
 */
function shouldRetry(
  errorInfo: ReturnType<typeof extractErrorInfo>,
  policy: RetryPolicy,
  context: RetryContext
): boolean {
  // Check if method is idempotent
  if (errorInfo.method && !isIdempotentHttpMethod(errorInfo.method)) {
    logger.debug('Non-idempotent method, skipping retry', {
      method: errorInfo.method,
      endpoint: context.endpoint,
    });
    return false;
  }

  // Check if error is retriable
  const retriable = isRetriableError(
    {
      category: errorInfo.category ?? undefined,
      statusCode: errorInfo.statusCode ?? undefined,
    },
    policy
  );

  if (!retriable) {
    logger.debug('Non-retriable error', {
      category: errorInfo.category,
      statusCode: errorInfo.statusCode,
      endpoint: context.endpoint,
    });
  }

  return retriable;
}

/**
 * Log retry telemetry data
 * @param telemetry Telemetry data
 */
function logRetryTelemetry(telemetry: RetryTelemetry): void {
  logger.info('Retry attempt', {
    ...telemetry,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Create a retry-aware axios response interceptor
 * @param executor Function to execute with retry
 * @returns Axios response interceptor
 */
export function createRetryInterceptor<T = AxiosResponse>(
  executor: (response: AxiosResponse) => Promise<T>
): (response: AxiosResponse) => Promise<T> {
  return async (response: AxiosResponse): Promise<T> => {
    // Pass through successful responses
    if (response.status >= 200 && response.status < 300) {
      return executor(response);
    }

    // For error responses, let the error interceptor handle it
    return Promise.reject(response);
  };
}

/**
 * Create a retry-aware axios error interceptor
 * @param options Retry options
 * @returns Axios error interceptor
 */
export function createRetryErrorInterceptor(
  options: Omit<RetryExecutorOptions, 'endpoint'>
): (error: AxiosError) => Promise<never> {
  return async (error: AxiosError): Promise<never> => {
    const endpoint = extractEndpointFromUrl(error.config?.url ?? '');
    const fullOptions: RetryExecutorOptions = {
      ...options,
      endpoint,
    };

    // Extract method for idempotency check
    const method = error.config?.method?.toUpperCase() ?? 'GET';
    if (!isIdempotentHttpMethod(method)) {
      logger.debug('Non-idempotent request, not retrying', { method, endpoint });
      return Promise.reject(error);
    }

    // Execute with retry
    const result = await executeWithRetry(async () => {
      // Retry the original request
      if (error.config) {
        // Use axios to retry the request
        const axios = (await import('axios')).default;
        const response = await axios.request(error.config);
        return response;
      }
      throw error;
    }, fullOptions);

    if (result.success && result.data) {
      return result.data as never;
    }

    return Promise.reject(result.error ?? error);
  };
}

/**
 * Extract endpoint name from URL
 * @param url The URL to parse
 * @returns Endpoint name
 */
function extractEndpointFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    // Extract the last segment of the path as endpoint
    const segments = path.split('/').filter(Boolean);
    return segments[segments.length - 1] ?? 'unknown';
  } catch {
    // For relative URLs or GraphQL, use a default
    return 'graphql';
  }
}
