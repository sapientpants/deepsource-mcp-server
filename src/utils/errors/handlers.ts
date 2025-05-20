/**
 * @fileoverview Error handlers for specific error types
 * This module provides utilities for handling different types of errors.
 */

import { AxiosError } from 'axios';
import { ErrorCategory } from './categories.js';
import { ClassifiedError } from './types.js';
import { createClassifiedError } from './factory.js';

/**
 * Error classifier for GraphQL errors
 * @param error The error to classify
 * @returns The classified error category
 * @public
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

/**
 * Type guard to check if an unknown error is an Error object
 * @param error The error to check
 * @returns True if the error is an Error instance
 * @public
 */
export function isError(error: unknown): error is Error {
  return (
    error !== null &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}

/**
 * Type guard to check if an error contains a specific message substring
 * @param error The error to check
 * @param substring The substring to search for in the error message
 * @returns True if the error is an Error with the specified substring
 * @public
 */
export function isErrorWithMessage(error: unknown, substring: string): error is Error {
  return isError(error) && error.message?.includes(substring);
}

/**
 * Checks if an error is an Axios error with specific characteristics
 * @param error The error to check
 * @param statusCode Optional HTTP status code to match
 * @param errorCode Optional Axios error code to match
 * @returns True if the error matches the criteria and is an AxiosError, false otherwise
 * @public
 */
export function isAxiosErrorWithCriteria(
  error: unknown,
  statusCode?: number,
  errorCode?: string
): error is AxiosError {
  // Check if it's an object first
  if (!error || typeof error !== 'object') {
    return false;
  }

  // Check if it has the axios error shape and matches all criteria
  const potentialAxiosError = error as Partial<AxiosError>;
  return (
    Boolean(potentialAxiosError.isAxiosError) &&
    (statusCode === undefined || potentialAxiosError.response?.status === statusCode) &&
    (errorCode === undefined || potentialAxiosError.code === errorCode)
  );
}

/**
 * Extract error messages from GraphQL error response
 * @param errors Array of GraphQL error objects
 * @returns Formatted error message string
 * @public
 */
export function extractGraphQLErrorMessages(errors: Array<{ message: string }>): string {
  const errorMessages = errors.map((error) => error.message);
  return errorMessages.join(', ');
}

/**
 * Handle GraphQL-specific errors from Axios responses
 * @param error The error to check for GraphQL errors
 * @returns A ClassifiedError if a GraphQL error is found, otherwise null
 * @public
 */
export function handleGraphQLSpecificError(error: unknown): ClassifiedError | null {
  if (
    isAxiosErrorWithCriteria(error) &&
    typeof error.response?.data === 'object' &&
    error.response.data &&
    'errors' in error.response.data
  ) {
    const graphqlErrors: Array<{ message: string }> = error.response.data.errors as Array<{
      message: string;
    }>;
    const errorMessage = extractGraphQLErrorMessages(graphqlErrors);

    // Create a combined error message
    const combinedError = new Error(`GraphQL Error: ${errorMessage}`);

    // Classify the error
    const category = classifyGraphQLError(combinedError);

    return createClassifiedError(combinedError.message, category, error, { graphqlErrors });
  }
  return null;
}

/**
 * Handle network and connection errors
 * @param error The error to check
 * @returns A ClassifiedError if a network error is found, otherwise null
 * @public
 */
export function handleNetworkError(error: unknown): ClassifiedError | null {
  if (isAxiosErrorWithCriteria(error, undefined, 'ECONNREFUSED')) {
    return createClassifiedError(
      'Connection error: Unable to connect to DeepSource API',
      ErrorCategory.NETWORK,
      error
    );
  }

  if (isAxiosErrorWithCriteria(error, undefined, 'ETIMEDOUT')) {
    return createClassifiedError(
      'Timeout error: DeepSource API request timed out',
      ErrorCategory.TIMEOUT,
      error
    );
  }

  return null;
}

/**
 * Handle HTTP status-specific errors
 * @param error The error to check
 * @returns A ClassifiedError if an HTTP status error is found, otherwise null
 * @public
 */
export function handleHttpStatusError(error: unknown): ClassifiedError | null {
  if (isAxiosErrorWithCriteria(error, 401)) {
    return createClassifiedError(
      'Authentication error: Invalid or expired API key',
      ErrorCategory.AUTH,
      error
    );
  }

  if (isAxiosErrorWithCriteria(error, 429)) {
    return createClassifiedError(
      'Rate limit exceeded: Too many requests to DeepSource API',
      ErrorCategory.RATE_LIMIT,
      error
    );
  }

  // Handle other common HTTP status codes
  if (isAxiosErrorWithCriteria(error)) {
    const status = error.response?.status;

    if (status && status >= 500) {
      return createClassifiedError(
        `Server error (${status}): DeepSource API server error`,
        ErrorCategory.SERVER,
        error
      );
    }

    if (status === 404) {
      return createClassifiedError(
        'Not found (404): The requested resource was not found',
        ErrorCategory.NOT_FOUND,
        error
      );
    }

    if (status && status >= 400 && status < 500) {
      return createClassifiedError(
        `Client error (${status}): ${error.response?.statusText || 'Bad request'}`,
        ErrorCategory.CLIENT,
        error
      );
    }
  }

  return null;
}

/**
 * Main error handler that processes different error types in sequence
 * @param error The error to handle
 * @returns A ClassifiedError appropriate for the error type
 * @public
 */
export function handleApiError(error: unknown): ClassifiedError {
  // If it's already a classified error, just return it
  if (error && typeof error === 'object' && 'category' in error) {
    return error as ClassifiedError;
  }

  // Try handling specific error types in order of specificity
  const graphqlError = handleGraphQLSpecificError(error);
  if (graphqlError) return graphqlError;

  const networkError = handleNetworkError(error);
  if (networkError) return networkError;

  const httpError = handleHttpStatusError(error);
  if (httpError) return httpError;

  // If no specific handler worked, create a generic classified error
  if (isError(error)) {
    const category = classifyGraphQLError(error);
    return createClassifiedError(`DeepSource API error: ${error.message}`, category, error);
  }

  // Last resort for truly unknown errors
  return createClassifiedError(
    'Unknown error occurred while communicating with DeepSource API',
    ErrorCategory.OTHER,
    error
  );
}
