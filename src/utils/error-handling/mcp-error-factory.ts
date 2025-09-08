/**
 * @fileoverview Factory functions for creating common MCP errors
 */

import { MCPError, MCPErrorCode, MCPErrorCategory, MCPErrorInfo } from './mcp-errors.js';

/**
 * Creates an authentication error
 */
export function createAuthenticationError(
  message = 'Authentication failed',
  details?: Record<string, unknown>
): MCPError {
  const errorInfo: MCPErrorInfo = {
    code: MCPErrorCode.AUTHENTICATION_ERROR,
    category: MCPErrorCategory.AUTHENTICATION_ERROR,
    message,
    retryable: false,
    userFriendly: true,
  };
  if (details !== undefined) {
    errorInfo.details = details;
  }
  return new MCPError(errorInfo);
}

/**
 * Creates a resource not found error
 */
export function createResourceNotFoundError(
  resource: string,
  details?: Record<string, unknown>
): MCPError {
  const errorInfo: MCPErrorInfo = {
    code: MCPErrorCode.RESOURCE_NOT_FOUND,
    category: MCPErrorCategory.RESOURCE_ERROR,
    message: `Resource not found: ${resource}`,
    details: { resource, ...(details || {}) },
    retryable: false,
    userFriendly: true,
  };
  return new MCPError(errorInfo);
}

/**
 * Creates a validation error
 */
export function createValidationError(
  message: string,
  details?: Record<string, unknown>
): MCPError {
  const errorInfo: MCPErrorInfo = {
    code: MCPErrorCode.VALIDATION_ERROR,
    category: MCPErrorCategory.VALIDATION_ERROR,
    message: `Validation failed: ${message}`,
    retryable: false,
    userFriendly: true,
  };
  if (details !== undefined) {
    errorInfo.details = details;
  }
  return new MCPError(errorInfo);
}

/**
 * Creates a server error
 */
export function createServerError(
  message = 'Internal server error',
  cause?: Error,
  details?: Record<string, unknown>
): MCPError {
  const errorInfo: MCPErrorInfo = {
    code: MCPErrorCode.INTERNAL_ERROR,
    category: MCPErrorCategory.SERVER_ERROR,
    message,
    retryable: true,
    userFriendly: false,
  };
  if (cause !== undefined) {
    errorInfo.cause = cause;
  }
  if (details !== undefined) {
    errorInfo.details = details;
  }
  return new MCPError(errorInfo);
}

/**
 * Creates a timeout error
 */
export function createTimeoutError(operation: string, timeoutMs: number): MCPError {
  const errorInfo: MCPErrorInfo = {
    code: MCPErrorCode.TIMEOUT_ERROR,
    category: MCPErrorCategory.NETWORK_ERROR,
    message: `Operation timed out: ${operation}`,
    details: { operation, timeoutMs },
    retryable: true,
    userFriendly: true,
  };
  return new MCPError(errorInfo);
}

/**
 * Creates a rate limiting error
 */
export function createRateLimitedError(resetTime?: Date): MCPError {
  const errorInfo: MCPErrorInfo = {
    code: MCPErrorCode.RATE_LIMITED,
    category: MCPErrorCategory.CLIENT_ERROR,
    message: 'Rate limit exceeded',
    retryable: true,
    userFriendly: true,
  };
  if (resetTime) {
    errorInfo.details = { resetTime: resetTime.toISOString() };
  }
  return new MCPError(errorInfo);
}

/**
 * Creates a configuration error
 */
export function createConfigurationError(
  message: string,
  details?: Record<string, unknown>
): MCPError {
  const errorInfo: MCPErrorInfo = {
    code: MCPErrorCode.CONFIGURATION_ERROR,
    category: MCPErrorCategory.SERVER_ERROR,
    message: `Configuration error: ${message}`,
    retryable: false,
    userFriendly: false,
  };
  if (details !== undefined) {
    errorInfo.details = details;
  }
  return new MCPError(errorInfo);
}

/**
 * Creates a dependency error
 */
export function createDependencyError(service: string, cause?: Error): MCPError {
  const errorInfo: MCPErrorInfo = {
    code: MCPErrorCode.DEPENDENCY_ERROR,
    category: MCPErrorCategory.SERVER_ERROR,
    message: `Dependency error: ${service} is unavailable`,
    details: { service },
    retryable: true,
    userFriendly: false,
  };
  if (cause !== undefined) {
    errorInfo.cause = cause;
  }
  return new MCPError(errorInfo);
}

// For backward compatibility, export a namespace-like object
export const MCPErrorFactory = {
  authentication: createAuthenticationError,
  resourceNotFound: createResourceNotFoundError,
  validation: createValidationError,
  server: createServerError,
  timeout: createTimeoutError,
  rateLimited: createRateLimitedError,
  configuration: createConfigurationError,
  dependency: createDependencyError,
};
