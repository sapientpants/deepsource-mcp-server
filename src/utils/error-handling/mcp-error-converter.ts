/**
 * @fileoverview Converts various error types to MCP-compliant errors
 */

import { MCPError, MCPErrorCode, MCPErrorCategory } from './mcp-errors.js';
import { createServerError } from './mcp-error-factory.js';
import { handleApiError } from '../errors/handlers.js';
import { ClassifiedError } from '../errors/types.js';

/**
 * Converts a standard Error to MCPError
 */
function fromStandardError(error: Error, context?: string): MCPError {
  // Check for specific error types
  const message = error.message.toLowerCase();

  if (message.includes('authentication') || message.includes('unauthorized')) {
    return new MCPError({
      code: MCPErrorCode.AUTHENTICATION_ERROR,
      category: MCPErrorCategory.AUTHENTICATION_ERROR,
      message: error.message,
      cause: error,
      details: { context },
      retryable: false,
      userFriendly: true,
    });
  }

  if (message.includes('not found')) {
    return new MCPError({
      code: MCPErrorCode.RESOURCE_NOT_FOUND,
      category: MCPErrorCategory.RESOURCE_ERROR,
      message: error.message,
      cause: error,
      details: { context },
      retryable: false,
      userFriendly: true,
    });
  }

  if (message.includes('validation') || message.includes('invalid')) {
    return new MCPError({
      code: MCPErrorCode.VALIDATION_ERROR,
      category: MCPErrorCategory.VALIDATION_ERROR,
      message: error.message,
      cause: error,
      details: { context },
      retryable: false,
      userFriendly: true,
    });
  }

  if (message.includes('timeout')) {
    return new MCPError({
      code: MCPErrorCode.TIMEOUT_ERROR,
      category: MCPErrorCategory.NETWORK_ERROR,
      message: `Operation timed out: ${context || 'API call'}`,
      cause: error,
      details: { context, originalMessage: error.message },
      retryable: true,
      userFriendly: true,
    });
  }

  if (message.includes('rate limit')) {
    return new MCPError({
      code: MCPErrorCode.RATE_LIMITED,
      category: MCPErrorCategory.CLIENT_ERROR,
      message: error.message,
      cause: error,
      details: { context },
      retryable: true,
      userFriendly: true,
    });
  }

  // Check for network errors based on message content
  if (
    message.includes('network') ||
    message.includes('econnrefused') ||
    message.includes('fetch failed')
  ) {
    return new MCPError({
      code: MCPErrorCode.SERVER_ERROR,
      category: MCPErrorCategory.NETWORK_ERROR,
      message: `Network error: ${error.message}`,
      cause: error,
      details: { context },
      retryable: true,
      userFriendly: true,
    });
  }

  // Default to server error
  return createServerError(error.message, error, { context });
}

/**
 * Converts a DeepSource API error to MCPError
 */
function fromDeepSourceError(error: ClassifiedError): MCPError {
  const categoryMap: Record<string, MCPErrorCategory> = {
    AUTH: MCPErrorCategory.AUTHENTICATION_ERROR,
    NETWORK: MCPErrorCategory.NETWORK_ERROR,
    TIMEOUT: MCPErrorCategory.NETWORK_ERROR,
    RATE_LIMIT: MCPErrorCategory.CLIENT_ERROR,
    NOT_FOUND: MCPErrorCategory.RESOURCE_ERROR,
    CLIENT: MCPErrorCategory.CLIENT_ERROR,
    SERVER: MCPErrorCategory.SERVER_ERROR,
    SCHEMA: MCPErrorCategory.SERVER_ERROR,
    FORMAT: MCPErrorCategory.SERVER_ERROR,
    OTHER: MCPErrorCategory.SERVER_ERROR,
  };

  const codeMap: Record<string, MCPErrorCode> = {
    AUTH: MCPErrorCode.AUTHENTICATION_ERROR,
    NETWORK: MCPErrorCode.NETWORK_ERROR,
    TIMEOUT: MCPErrorCode.TIMEOUT_ERROR,
    RATE_LIMIT: MCPErrorCode.RATE_LIMITED,
    NOT_FOUND: MCPErrorCode.RESOURCE_NOT_FOUND,
    CLIENT: MCPErrorCode.CLIENT_ERROR,
    SERVER: MCPErrorCode.INTERNAL_ERROR,
    SCHEMA: MCPErrorCode.INTERNAL_ERROR,
    FORMAT: MCPErrorCode.INTERNAL_ERROR,
    OTHER: MCPErrorCode.INTERNAL_ERROR,
  };

  return new MCPError({
    code: codeMap[error.category] || MCPErrorCode.INTERNAL_ERROR,
    category: categoryMap[error.category] || MCPErrorCategory.SERVER_ERROR,
    message: error.message,
    cause: error.originalError instanceof Error ? error.originalError : undefined,
    details: error.metadata,
    retryable: ['NETWORK', 'TIMEOUT', 'RATE_LIMIT', 'SERVER'].includes(error.category),
    userFriendly: ['AUTH', 'NOT_FOUND', 'RATE_LIMIT', 'TIMEOUT'].includes(error.category),
  });
}

/**
 * Converts any error to an MCPError
 */
export function toMCPError(error: unknown, context?: string): MCPError {
  // Already an MCPError
  if (error instanceof MCPError) {
    return error;
  }

  // Standard Error
  if (error instanceof Error) {
    return fromStandardError(error, context);
  }

  // String error
  if (typeof error === 'string') {
    return createServerError(error);
  }

  // Unknown error type
  return createServerError('Unknown error occurred', undefined, {
    errorType: typeof error,
    originalError: String(error),
    context,
  });
}

/**
 * Converts DeepSource API errors to MCP errors
 */
export function fromApiError(error: unknown, context?: string): MCPError {
  // Use the API error handler to classify the error
  const classifiedError = handleApiError(error);
  const mcpError = fromDeepSourceError(classifiedError);

  // Add context if provided
  if (context && mcpError.details) {
    mcpError.details.context = context;
  }

  return mcpError;
}

// For backward compatibility, export a namespace-like object
export const MCPErrorConverter = {
  toMCPError,
  fromApiError,
  fromStandardError,
  fromDeepSourceError,
};
