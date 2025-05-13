/**
 * @fileoverview Error utilities for handling API errors
 * This module provides utilities for classifying and handling errors.
 */

/**
 * Possible error categories for API errors
 * @enum {string}
 */
// This enum is part of the public API and is used by consumers, even if not all values are used in this file
/* eslint-disable no-unused-vars */
export enum ErrorCategory {
  /** Error related to authentication or authorization */
  AUTH = 'AUTH',
  /** Error with network connectivity */
  NETWORK = 'NETWORK',
  /** Error with server processing */
  SERVER = 'SERVER',
  /** Error with client input */
  CLIENT = 'CLIENT',
  /** Error with request timing out */
  TIMEOUT = 'TIMEOUT',
  /** Error with rate limiting */
  RATE_LIMIT = 'RATE_LIMIT',
  /** Error with the GraphQL schema */
  SCHEMA = 'SCHEMA',
  /** Error with data not found */
  NOT_FOUND = 'NOT_FOUND',
  /** Error with data formatting */
  FORMAT = 'FORMAT',
  /** Other uncategorized errors */
  OTHER = 'OTHER',
}
/* eslint-enable no-unused-vars */

/**
 * Enriched error with additional metadata
 * Extends the standard Error with additional properties for better error handling.
 * @interface
 */
export interface ClassifiedError extends Error {
  /** The category of the error */
  category: ErrorCategory;
  /** The original error that caused this error */
  originalError?: unknown;
  /** Any additional metadata related to the error */
  metadata?: Record<string, unknown>;
}

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
  error.metadata = metadata;
  return error;
}

/**
 * Check if an error is a classified error
 * @param error The error to check
 * @returns True if the error is a classified error
 */
export function isClassifiedError(error: unknown): error is ClassifiedError {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'message' in error &&
      'category' in error &&
      typeof (error as any).category === 'string'
  );
}

/**
 * Error classifier for GraphQL errors
 * @param error The error to classify
 * @returns The classified error category
 */
export function classifyGraphQLError(error: Error): ErrorCategory {
  const message = error.message.toLowerCase();

  // Check for auth errors
  if (
    message.includes('authentication') ||
    message.includes('unauthorized') ||
    message.includes('access denied') ||
    message.includes('not authorized') ||
    message.includes('forbidden') ||
    message.includes('token') ||
    message.includes('api key')
  ) {
    return ErrorCategory.AUTH;
  }

  // Check for rate limit errors
  if (
    message.includes('rate limit') ||
    message.includes('too many requests') ||
    message.includes('throttled')
  ) {
    return ErrorCategory.RATE_LIMIT;
  }

  // Check for network errors
  if (
    message.includes('network') ||
    message.includes('connection') ||
    message.includes('econnreset') ||
    message.includes('econnrefused')
  ) {
    return ErrorCategory.NETWORK;
  }

  // Check for timeout errors
  if (
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('etimedout')
  ) {
    return ErrorCategory.TIMEOUT;
  }

  // Check for schema errors
  if (
    message.includes('cannot query field') ||
    message.includes('unknown argument') ||
    message.includes('unknown type') ||
    message.includes('field not defined')
  ) {
    return ErrorCategory.SCHEMA;
  }

  // Check for not found errors
  if (
    message.includes('not found') ||
    message.includes('nonetype') ||
    message.includes('does not exist')
  ) {
    return ErrorCategory.NOT_FOUND;
  }

  // Check for server errors
  if (
    message.includes('server error') ||
    message.includes('internal error') ||
    message.includes('500')
  ) {
    return ErrorCategory.SERVER;
  }

  // Default to OTHER
  return ErrorCategory.OTHER;
}

// This code helps document the intended use of the enum values
// Each category has a specific use case in the error handling flow
// For example:
// - AUTH errors are for authentication-related failures
// - NETWORK errors happen when network connectivity is lost
// - etc.
