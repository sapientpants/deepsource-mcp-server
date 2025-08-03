/**
 * @fileoverview Factory functions for creating common MCP errors
 */

import { MCPError, MCPErrorCode, MCPErrorCategory } from './mcp-errors.js';

/**
 * Creates an authentication error
 */
export function createAuthenticationError(
  message = 'Authentication failed',
  details?: Record<string, unknown>
): MCPError {
  return new MCPError({
    code: MCPErrorCode.AUTHENTICATION_ERROR,
    category: MCPErrorCategory.AUTHENTICATION_ERROR,
    message,
    details,
    retryable: false,
    userFriendly: true,
  });
}

/**
 * Creates a resource not found error
 */
export function createResourceNotFoundError(
  resource: string,
  details?: Record<string, unknown>
): MCPError {
  return new MCPError({
    code: MCPErrorCode.RESOURCE_NOT_FOUND,
    category: MCPErrorCategory.RESOURCE_ERROR,
    message: `Resource not found: ${resource}`,
    details: { resource, ...details },
    retryable: false,
    userFriendly: true,
  });
}

/**
 * Creates a validation error
 */
export function createValidationError(
  message: string,
  details?: Record<string, unknown>
): MCPError {
  return new MCPError({
    code: MCPErrorCode.VALIDATION_ERROR,
    category: MCPErrorCategory.VALIDATION_ERROR,
    message: `Validation failed: ${message}`,
    details,
    retryable: false,
    userFriendly: true,
  });
}

/**
 * Creates a server error
 */
export function createServerError(
  message = 'Internal server error',
  cause?: Error,
  details?: Record<string, unknown>
): MCPError {
  return new MCPError({
    code: MCPErrorCode.INTERNAL_ERROR,
    category: MCPErrorCategory.SERVER_ERROR,
    message,
    cause,
    details,
    retryable: true,
    userFriendly: false,
  });
}

/**
 * Creates a timeout error
 */
export function createTimeoutError(operation: string, timeoutMs: number): MCPError {
  return new MCPError({
    code: MCPErrorCode.TIMEOUT_ERROR,
    category: MCPErrorCategory.NETWORK_ERROR,
    message: `Operation timed out: ${operation}`,
    details: { operation, timeoutMs },
    retryable: true,
    userFriendly: true,
  });
}

/**
 * Creates a rate limiting error
 */
export function createRateLimitedError(resetTime?: Date): MCPError {
  return new MCPError({
    code: MCPErrorCode.RATE_LIMITED,
    category: MCPErrorCategory.CLIENT_ERROR,
    message: 'Rate limit exceeded',
    details: resetTime ? { resetTime: resetTime.toISOString() } : undefined,
    retryable: true,
    userFriendly: true,
  });
}

/**
 * Creates a configuration error
 */
export function createConfigurationError(
  message: string,
  details?: Record<string, unknown>
): MCPError {
  return new MCPError({
    code: MCPErrorCode.CONFIGURATION_ERROR,
    category: MCPErrorCategory.SERVER_ERROR,
    message: `Configuration error: ${message}`,
    details,
    retryable: false,
    userFriendly: false,
  });
}

/**
 * Creates a dependency error
 */
export function createDependencyError(service: string, cause?: Error): MCPError {
  return new MCPError({
    code: MCPErrorCode.DEPENDENCY_ERROR,
    category: MCPErrorCategory.SERVER_ERROR,
    message: `Dependency error: ${service} is unavailable`,
    cause,
    details: { service },
    retryable: true,
    userFriendly: false,
  });
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
