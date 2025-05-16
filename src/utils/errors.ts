/**
 * @fileoverview Error utilities for handling API errors
 * This module provides utilities for classifying and handling errors.
 */

/**
 * Possible error categories for API errors
 * @enum {string}
 */
// This enum is part of the public API and is used by consumers, even if not all values are used in this file
/* eslint-disable @typescript-eslint/no-unused-vars -- Exported enum part of public API */
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
/* eslint-enable @typescript-eslint/no-unused-vars */

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
  if (originalError !== undefined) {
    error.originalError = originalError;
  }
  if (metadata !== undefined) {
    error.metadata = metadata;
  }
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
      typeof (error as Record<string, unknown>)['category'] === 'string'
  );
}

/**
 * Error classifier for GraphQL errors
 * @param error The error to classify
 * @returns The classified error category
 */
export function classifyGraphQLError(error: Error): ErrorCategory {
  const message = error.message.toLowerCase();

  // Define error patterns and their corresponding categories
  const errorPatterns: Record<ErrorCategory, string[]> = {
    [ErrorCategory.AUTH]: [
      'authentication',
      'unauthorized',
      'access denied',
      'not authorized',
      'forbidden',
      'token',
      'api key',
    ],
    [ErrorCategory.RATE_LIMIT]: ['rate limit', 'too many requests', 'throttled'],
    [ErrorCategory.NETWORK]: ['network', 'connection', 'econnreset', 'econnrefused'],
    [ErrorCategory.TIMEOUT]: ['timeout', 'timed out', 'etimedout'],
    [ErrorCategory.SCHEMA]: [
      'cannot query field',
      'unknown argument',
      'unknown type',
      'field not defined',
    ],
    [ErrorCategory.NOT_FOUND]: ['not found', 'nonetype', 'does not exist'],
    [ErrorCategory.SERVER]: ['server error', 'internal error', '500'],
    [ErrorCategory.CLIENT]: [],
    [ErrorCategory.FORMAT]: [],
    [ErrorCategory.OTHER]: [],
  };

  // Check each category's patterns
  for (const [category, patterns] of Object.entries(errorPatterns)) {
    if (patterns.some((pattern) => message.includes(pattern))) {
      return category as ErrorCategory;
    }
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
