/**
 * @fileoverview Error handlers for specific error types
 * This module provides utilities for handling different types of errors.
 */

import { AxiosError } from 'axios';
import { ErrorCategory } from './categories.js';
import { ClassifiedError } from './types.js';
import { createClassifiedError } from './factory.js';
import { createLogger } from '../logging/logger.js';

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
  if (!isAxiosErrorWithCriteria(error)) {
    return null;
  }

  // Define a lookup table for error codes
  const errorCodeHandlers: Record<string, () => ClassifiedError> = {
    ECONNREFUSED: () =>
      createClassifiedError(
        'Connection error: Unable to connect to DeepSource API',
        ErrorCategory.NETWORK,
        error
      ),
    ETIMEDOUT: () =>
      createClassifiedError(
        'Timeout error: DeepSource API request timed out',
        ErrorCategory.TIMEOUT,
        error
      ),
  };

  // Get the error code
  const errorCode = error.code;

  // Return the appropriate classified error based on the error code
  return errorCode ? (errorCodeHandlers[errorCode]?.() ?? null) : null;
}

/**
 * Handle HTTP status-specific errors
 * @param error The error to check
 * @returns A ClassifiedError if an HTTP status error is found, otherwise null
 * @public
 */
export function handleHttpStatusError(error: unknown): ClassifiedError | null {
  if (!isAxiosErrorWithCriteria(error)) {
    return null;
  }

  const status = error.response?.status;
  if (!status) {
    return null;
  }

  // Define a lookup table for specific HTTP status codes
  const statusHandlers: Record<number, () => ClassifiedError> = {
    401: () =>
      createClassifiedError(
        'Authentication error: Invalid or expired API key',
        ErrorCategory.AUTH,
        error
      ),
    429: () =>
      createClassifiedError(
        'Rate limit exceeded: Too many requests to DeepSource API',
        ErrorCategory.RATE_LIMIT,
        error
      ),
    404: () =>
      createClassifiedError(
        'Not found (404): The requested resource was not found',
        ErrorCategory.NOT_FOUND,
        error
      ),
    502: () =>
      createClassifiedError(
        `Bad Gateway (${status}): DeepSource API gateway error`,
        ErrorCategory.SERVER,
        error
      ),
    503: () =>
      createClassifiedError(
        `Service Unavailable (${status}): DeepSource API temporarily unavailable`,
        ErrorCategory.SERVER,
        error
      ),
    504: () =>
      createClassifiedError(
        `Gateway Timeout (${status}): DeepSource API gateway timeout`,
        ErrorCategory.SERVER,
        error
      ),
  };

  // Check for exact status code matches first
  if (statusHandlers[status]) {
    return statusHandlers[status]();
  }

  // Handle status code ranges
  if (status >= 500) {
    return createClassifiedError(
      `Server error (${status}): DeepSource API server error`,
      ErrorCategory.SERVER,
      error
    );
  }

  if (status >= 400 && status < 500) {
    return createClassifiedError(
      `Client error (${status}): ${error.response?.statusText || 'Bad request'}`,
      ErrorCategory.CLIENT,
      error
    );
  }

  return null;
}

/**
 * Check if an error is retriable based on its classification
 * @param error The error to check
 * @returns True if the error should be retried
 * @public
 */
export function isRetriableError(error: unknown): boolean {
  const retriableCategories = [
    ErrorCategory.RATE_LIMIT,
    ErrorCategory.NETWORK,
    ErrorCategory.TIMEOUT,
    ErrorCategory.SERVER,
  ];

  // Check if it's already a classified error
  if (error && typeof error === 'object' && 'category' in error) {
    const classifiedError = error as ClassifiedError;
    return retriableCategories.includes(classifiedError.category);
  }

  // Check for specific HTTP status codes
  if (isAxiosErrorWithCriteria(error)) {
    const status = (error as AxiosError).response?.status;
    if (status) {
      // Retriable status codes
      const retriableStatusCodes = [429, 502, 503, 504];
      if (retriableStatusCodes.includes(status)) {
        return true;
      }
      // Server errors are generally retriable
      if (status >= 500) {
        return true;
      }
    }

    // Check for network errors
    const errorCode = (error as AxiosError).code;
    if (errorCode) {
      const retriableErrorCodes = ['ECONNREFUSED', 'ETIMEDOUT', 'ECONNRESET', 'EPIPE'];
      return retriableErrorCodes.includes(errorCode);
    }
  }

  return false;
}

/**
 * Extract Retry-After header from an error response
 * @param error The error to extract from
 * @returns The Retry-After header value or undefined
 * @public
 */
export function extractRetryAfterHeader(error: unknown): string | undefined {
  if (!isAxiosErrorWithCriteria(error)) {
    return undefined;
  }

  const axiosError = error as AxiosError;
  const retryAfter = axiosError.response?.headers?.['retry-after'];

  if (typeof retryAfter === 'string') {
    return retryAfter;
  }

  return undefined;
}

/**
 * Main error handler that processes different error types in sequence
 * @param error The error to handle
 * @returns A ClassifiedError appropriate for the error type
 * @public
 */
export function handleApiError(error: unknown): ClassifiedError {
  // Create a logger for error handling
  const logger = createLogger('ErrorHandler');

  logger.debug('Handling API error', {
    errorType: typeof error,
    isObject: error !== null && typeof error === 'object',
    errorKeys: error !== null && typeof error === 'object' ? Object.keys(error) : [],
  });

  // If it's already a classified error, just return it
  if (error && typeof error === 'object' && 'category' in error) {
    logger.debug('Error is already classified', {
      category: (error as ClassifiedError).category,
      message: (error as ClassifiedError).message,
    });
    return error as ClassifiedError;
  }

  // Try handling specific error types in order of specificity
  logger.debug('Checking for GraphQL-specific errors');
  const graphqlError = handleGraphQLSpecificError(error);
  if (graphqlError) {
    logger.debug('Identified as GraphQL error', {
      category: graphqlError.category,
      message: graphqlError.message,
    });
    return graphqlError;
  }

  logger.debug('Checking for network errors');
  const networkError = handleNetworkError(error);
  if (networkError) {
    logger.debug('Identified as network error', {
      category: networkError.category,
      message: networkError.message,
    });
    return networkError;
  }

  logger.debug('Checking for HTTP status errors');
  const httpError = handleHttpStatusError(error);
  if (httpError) {
    logger.debug('Identified as HTTP status error', {
      category: httpError.category,
      message: httpError.message,
    });
    return httpError;
  }

  // If no specific handler worked, create a generic classified error
  if (isError(error)) {
    logger.debug('No specific handler matched, creating generic error', {
      message: error.message,
    });
    const category = classifyGraphQLError(error);
    return createClassifiedError(`DeepSource API error: ${error.message}`, category, error);
  }

  // Last resort for truly unknown errors
  logger.debug('Handling completely unknown error type', {
    error: String(error),
  });
  return createClassifiedError(
    'Unknown error occurred while communicating with DeepSource API',
    ErrorCategory.OTHER,
    error
  );
}
