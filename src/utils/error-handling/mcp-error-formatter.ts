/**
 * @fileoverview Formats errors into MCP-compliant API responses
 */

import { MCPError } from './mcp-errors.js';
import { toMCPError } from './mcp-error-converter.js';
import { createLogger } from '../logging/logger.js';
import type { ApiResponse } from '../../models/common.js';

const logger = createLogger('MCPErrorFormatter');

/**
 * Logs errors with appropriate log levels
 */
function logError(error: MCPError, context?: string): void {
  const logData = {
    code: error.code,
    category: error.category,
    message: error.message,
    context,
    retryable: error.retryable,
    userFriendly: error.userFriendly,
    details: error.details,
    stack: error.stack,
    cause: error.cause
      ? {
          name: error.cause.name,
          message: error.cause.message,
          stack: error.cause.stack,
        }
      : undefined,
  };

  // Choose log level based on error category
  switch (error.category) {
    case 'client_error':
    case 'validation_error':
    case 'authentication_error':
      logger.warn('Client error occurred', logData);
      break;

    case 'server_error':
    case 'internal_error':
      logger.error('Server error occurred', logData);
      break;

    case 'network_error':
    case 'transport_error':
      logger.warn('Network error occurred', logData);
      break;

    case 'resource_error':
      logger.info('Resource error occurred', logData);
      break;

    default:
      logger.error('Unknown error category', logData);
  }
}

/**
 * Creates an MCP-compliant error response
 */
export function createErrorResponse(error: unknown, context?: string): ApiResponse {
  const mcpError = toMCPError(error, context);

  // Log the error for debugging
  logError(mcpError, context);

  // Create user-friendly error message
  const errorData = {
    error: mcpError.userFriendly
      ? mcpError.message
      : 'An error occurred while processing your request',
    code: mcpError.code,
    category: mcpError.category,
    retryable: mcpError.retryable,
    ...(mcpError.details && { details: mcpError.details }),
    timestamp: mcpError.timestamp.toISOString(),
  };

  return {
    isError: true,
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(errorData, null, 2),
      },
    ],
  };
}

/**
 * Creates a validation error response
 */
export function createValidationErrorResponse(
  message: string,
  field?: string,
  value?: unknown
): ApiResponse {
  const details: Record<string, unknown> = {};
  if (field) details.field = field;
  if (value !== undefined) details.value = value;

  const error = new MCPError({
    code: 'VALIDATION_ERROR',
    category: 'VALIDATION_ERROR',
    message: `Validation failed: ${message}`,
    details: Object.keys(details).length > 0 ? details : undefined,
    retryable: false,
    userFriendly: true,
  });

  return createErrorResponse(error);
}

/**
 * Creates a resource not found error response
 */
export function createNotFoundResponse(resource: string, identifier?: string): ApiResponse {
  const details: Record<string, unknown> = { resource };
  if (identifier) details.identifier = identifier;

  const error = new MCPError({
    code: 'RESOURCE_NOT_FOUND',
    category: 'RESOURCE_ERROR',
    message: `Resource not found: ${resource}`,
    details,
    retryable: false,
    userFriendly: true,
  });

  return createErrorResponse(error);
}

// For backward compatibility, export a namespace-like object
export const MCPErrorFormatter = {
  createErrorResponse,
  createValidationErrorResponse,
  createNotFoundResponse,
};
