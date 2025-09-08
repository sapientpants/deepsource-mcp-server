/**
 * @fileoverview Error factory for creating classified errors
 * This module provides utilities for creating standardized error objects.
 */

import { ErrorCategory } from './categories.js';
import { ClassifiedError } from './types.js';

/**
 * Create a new classified error with additional metadata
 * @param message The error message
 * @param category The error category
 * @param originalError The original error that caused this error, useful for debugging and error tracing
 * @param metadata Additional contextual information about the error as key-value pairs
 * @returns A new classified error with the specified properties
 * @example
 * const error = createClassifiedError(
 *   'Failed to fetch project data',
 *   ErrorCategory.NETWORK,
 *   originalError,
 *   { projectId: '123', endpoint: '/api/projects' }
 * );
 * @public
 */
export function createClassifiedError(
  message: string,
  category: ErrorCategory,
  originalError?: unknown,
  metadata?: Record<string, unknown>
): ClassifiedError {
  const error = new Error(message) as ClassifiedError;
  error.category = category;
  error.originalError = originalError;
  if (metadata !== undefined) {
    error.metadata = metadata;
  }
  return error;
}

/**
 * Create an authentication error
 * @param message The error message
 * @param originalError The original error that caused this error
 * @param metadata Additional contextual information about the error
 * @returns A classified error with AUTH category
 * @public
 */
export function createAuthError(
  message: string,
  originalError?: unknown,
  metadata?: Record<string, unknown>
): ClassifiedError {
  return createClassifiedError(
    message || 'Authentication failed',
    ErrorCategory.AUTH,
    originalError,
    metadata
  );
}

/**
 * Create a network error
 * @param message The error message
 * @param originalError The original error that caused this error
 * @param metadata Additional contextual information about the error
 * @returns A classified error with NETWORK category
 * @public
 */
export function createNetworkError(
  message: string,
  originalError?: unknown,
  metadata?: Record<string, unknown>
): ClassifiedError {
  return createClassifiedError(
    message || 'Network error occurred',
    ErrorCategory.NETWORK,
    originalError,
    metadata
  );
}

/**
 * Create a server error
 * @param message The error message
 * @param originalError The original error that caused this error
 * @param metadata Additional contextual information about the error
 * @returns A classified error with SERVER category
 * @public
 */
export function createServerError(
  message: string,
  originalError?: unknown,
  metadata?: Record<string, unknown>
): ClassifiedError {
  return createClassifiedError(
    message || 'Server error occurred',
    ErrorCategory.SERVER,
    originalError,
    metadata
  );
}

/**
 * Create a client error
 * @param message The error message
 * @param originalError The original error that caused this error
 * @param metadata Additional contextual information about the error
 * @returns A classified error with CLIENT category
 * @public
 */
export function createClientError(
  message: string,
  originalError?: unknown,
  metadata?: Record<string, unknown>
): ClassifiedError {
  return createClassifiedError(
    message || 'Client error occurred',
    ErrorCategory.CLIENT,
    originalError,
    metadata
  );
}

/**
 * Create a timeout error
 * @param message The error message
 * @param originalError The original error that caused this error
 * @param metadata Additional contextual information about the error
 * @returns A classified error with TIMEOUT category
 * @public
 */
export function createTimeoutError(
  message: string,
  originalError?: unknown,
  metadata?: Record<string, unknown>
): ClassifiedError {
  return createClassifiedError(
    message || 'Request timed out',
    ErrorCategory.TIMEOUT,
    originalError,
    metadata
  );
}

/**
 * Create a rate limit error
 * @param message The error message
 * @param originalError The original error that caused this error
 * @param metadata Additional contextual information about the error
 * @returns A classified error with RATE_LIMIT category
 * @public
 */
export function createRateLimitError(
  message: string,
  originalError?: unknown,
  metadata?: Record<string, unknown>
): ClassifiedError {
  return createClassifiedError(
    message || 'Rate limit exceeded',
    ErrorCategory.RATE_LIMIT,
    originalError,
    metadata
  );
}

/**
 * Create a schema error
 * @param message The error message
 * @param originalError The original error that caused this error
 * @param metadata Additional contextual information about the error
 * @returns A classified error with SCHEMA category
 * @public
 */
export function createSchemaError(
  message: string,
  originalError?: unknown,
  metadata?: Record<string, unknown>
): ClassifiedError {
  return createClassifiedError(
    message || 'GraphQL schema error',
    ErrorCategory.SCHEMA,
    originalError,
    metadata
  );
}

/**
 * Create a not found error
 * @param message The error message
 * @param originalError The original error that caused this error
 * @param metadata Additional contextual information about the error
 * @returns A classified error with NOT_FOUND category
 * @public
 */
export function createNotFoundError(
  message: string,
  originalError?: unknown,
  metadata?: Record<string, unknown>
): ClassifiedError {
  return createClassifiedError(
    message || 'Resource not found',
    ErrorCategory.NOT_FOUND,
    originalError,
    metadata
  );
}

/**
 * Create a format error
 * @param message The error message
 * @param originalError The original error that caused this error
 * @param metadata Additional contextual information about the error
 * @returns A classified error with FORMAT category
 * @public
 */
export function createFormatError(
  message: string,
  originalError?: unknown,
  metadata?: Record<string, unknown>
): ClassifiedError {
  return createClassifiedError(
    message || 'Data format error',
    ErrorCategory.FORMAT,
    originalError,
    metadata
  );
}
