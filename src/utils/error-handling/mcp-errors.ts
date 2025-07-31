/**
 * @fileoverview MCP-compliant error handling utilities
 *
 * This module provides standardized error handling for Model Context Protocol (MCP)
 * servers, including error types, formatting, and response generation that comply
 * with MCP specifications.
 */

import { ApiResponse } from '../../models/common.js';
import { createLogger } from '../logging/logger.js';

const logger = createLogger('MCPErrorHandler');

/**
 * Standard MCP error codes based on JSON-RPC 2.0 specification
 */
export enum MCPErrorCode {
  // JSON-RPC 2.0 standard error codes
  PARSE_ERROR = -32700, // eslint-disable-line no-unused-vars
  INVALID_REQUEST = -32600, // eslint-disable-line no-unused-vars
  METHOD_NOT_FOUND = -32601, // eslint-disable-line no-unused-vars
  INVALID_PARAMS = -32602, // eslint-disable-line no-unused-vars
  INTERNAL_ERROR = -32603, // eslint-disable-line no-unused-vars

  // MCP-specific error codes (range -32000 to -32099)
  SERVER_ERROR = -32000, // eslint-disable-line no-unused-vars
  RESOURCE_NOT_FOUND = -32001, // eslint-disable-line no-unused-vars
  AUTHENTICATION_ERROR = -32002, // eslint-disable-line no-unused-vars
  AUTHORIZATION_ERROR = -32003, // eslint-disable-line no-unused-vars
  RATE_LIMITED = -32004, // eslint-disable-line no-unused-vars
  TIMEOUT_ERROR = -32005, // eslint-disable-line no-unused-vars
  VALIDATION_ERROR = -32006, // eslint-disable-line no-unused-vars
  DEPENDENCY_ERROR = -32007, // eslint-disable-line no-unused-vars
  CONFIGURATION_ERROR = -32008, // eslint-disable-line no-unused-vars
}

/**
 * MCP error categories for better error classification
 */
export enum MCPErrorCategory {
  CLIENT_ERROR = 'client_error', // eslint-disable-line no-unused-vars
  SERVER_ERROR = 'server_error', // eslint-disable-line no-unused-vars
  NETWORK_ERROR = 'network_error', // eslint-disable-line no-unused-vars
  VALIDATION_ERROR = 'validation_error', // eslint-disable-line no-unused-vars
  AUTHENTICATION_ERROR = 'authentication_error', // eslint-disable-line no-unused-vars
  RESOURCE_ERROR = 'resource_error', // eslint-disable-line no-unused-vars
}

/**
 * Interface for structured MCP error information
 */
export interface MCPErrorInfo {
  code: MCPErrorCode;
  message: string;
  category: MCPErrorCategory;
  details?: Record<string, unknown>;
  cause?: Error;
  retryable?: boolean;
  userFriendly?: boolean;
}

/**
 * Enhanced error class for MCP-compliant errors
 */
export class MCPError extends Error {
  public readonly code: MCPErrorCode;
  public readonly category: MCPErrorCategory;
  public readonly details?: Record<string, unknown>;
  public readonly cause?: Error;
  public readonly retryable: boolean;
  public readonly userFriendly: boolean;
  public readonly timestamp: Date;

  constructor(info: MCPErrorInfo) {
    super(info.message);
    this.name = 'MCPError';
    this.code = info.code;
    this.category = info.category;
    this.details = info.details;
    this.cause = info.cause;
    this.retryable = info.retryable ?? false;
    this.userFriendly = info.userFriendly ?? true;
    this.timestamp = new Date();

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MCPError);
    }
  }

  /**
   * Converts the error to a JSON-serializable object
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      category: this.category,
      details: this.details,
      retryable: this.retryable,
      userFriendly: this.userFriendly,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
    };
  }
}

/**
 * Factory functions for creating common MCP errors
 */
export class MCPErrorFactory {
  /**
   * Creates an authentication error
   */
  static authentication(
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
  static resourceNotFound(resource: string, details?: Record<string, unknown>): MCPError {
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
  static validation(message: string, details?: Record<string, unknown>): MCPError {
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
  static server(
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
  static timeout(operation: string, timeoutMs: number): MCPError {
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
  static rateLimited(resetTime?: Date): MCPError {
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
  static configuration(message: string, details?: Record<string, unknown>): MCPError {
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
  static dependency(service: string, cause?: Error): MCPError {
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
}

/**
 * Converts various error types to MCP-compliant errors
 */
export class MCPErrorConverter {
  /**
   * Converts any error to an MCPError
   */
  static toMCPError(error: unknown, context?: string): MCPError {
    // Already an MCPError
    if (error instanceof MCPError) {
      return error;
    }

    // Standard Error
    if (error instanceof Error) {
      return this.fromStandardError(error, context);
    }

    // String error
    if (typeof error === 'string') {
      return MCPErrorFactory.server(error);
    }

    // Unknown error type
    return MCPErrorFactory.server('Unknown error occurred', undefined, {
      originalError: String(error),
      context,
    });
  }

  /**
   * Converts standard JavaScript errors to MCPError
   */
  private static fromStandardError(error: Error, context?: string): MCPError {
    const details = { context, originalName: error.name };

    // Network/API errors
    if (this.isNetworkError(error)) {
      return new MCPError({
        code: MCPErrorCode.SERVER_ERROR,
        category: MCPErrorCategory.NETWORK_ERROR,
        message: `Network error: ${error.message}`,
        cause: error,
        details,
        retryable: true,
        userFriendly: true,
      });
    }

    // Timeout errors
    if (this.isTimeoutError(error)) {
      return MCPErrorFactory.timeout(context || 'operation', 30000);
    }

    // Authentication errors
    if (this.isAuthError(error)) {
      return MCPErrorFactory.authentication(error.message, details);
    }

    // Validation errors
    if (this.isValidationError(error)) {
      // Remove "Validation failed:" prefix if it already exists to avoid duplication
      const message = error.message.replace(/^Validation failed:\s*/, '');
      return MCPErrorFactory.validation(message, details);
    }

    // Default to server error
    return MCPErrorFactory.server(error.message, error, details);
  }

  /**
   * Checks if an error is network-related
   */
  private static isNetworkError(error: Error): boolean {
    const networkIndicators = [
      'ECONNREFUSED',
      'ENOTFOUND',
      'EHOSTUNREACH',
      'ETIMEDOUT',
      'fetch failed',
      'network error',
    ];

    return networkIndicators.some(
      (indicator) =>
        error.message.toLowerCase().includes(indicator.toLowerCase()) ||
        error.name.toLowerCase().includes(indicator.toLowerCase())
    );
  }

  /**
   * Checks if an error is timeout-related
   */
  private static isTimeoutError(error: Error): boolean {
    const timeoutIndicators = ['timeout', 'ETIMEDOUT'];
    return timeoutIndicators.some((indicator) =>
      error.message.toLowerCase().includes(indicator.toLowerCase())
    );
  }

  /**
   * Checks if an error is authentication-related
   */
  private static isAuthError(error: Error): boolean {
    const authIndicators = [
      'unauthorized',
      'authentication',
      'invalid token',
      'access denied',
      'forbidden',
    ];
    return authIndicators.some((indicator) =>
      error.message.toLowerCase().includes(indicator.toLowerCase())
    );
  }

  /**
   * Checks if an error is validation-related
   */
  private static isValidationError(error: Error): boolean {
    const validationIndicators = [
      'validation',
      'invalid input',
      'schema',
      'required field',
      'invalid format',
    ];
    return validationIndicators.some((indicator) =>
      error.message.toLowerCase().includes(indicator.toLowerCase())
    );
  }
}

/**
 * Formats errors into MCP-compliant API responses
 */
export class MCPErrorFormatter {
  /**
   * Creates an MCP-compliant error response
   */
  static createErrorResponse(error: unknown, context?: string): ApiResponse {
    const mcpError = MCPErrorConverter.toMCPError(error, context);

    // Log the error for debugging
    this.logError(mcpError, context);

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
   * Logs errors with appropriate log levels
   */
  private static logError(error: MCPError, context?: string): void {
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

    switch (error.category) {
      case MCPErrorCategory.CLIENT_ERROR:
      case MCPErrorCategory.VALIDATION_ERROR:
        logger.warn('Client error occurred', logData);
        break;
      case MCPErrorCategory.AUTHENTICATION_ERROR:
        logger.warn('Authentication error occurred', logData);
        break;
      case MCPErrorCategory.RESOURCE_ERROR:
        logger.info('Resource error occurred', logData);
        break;
      case MCPErrorCategory.NETWORK_ERROR:
        logger.error('Network error occurred', logData);
        break;
      case MCPErrorCategory.SERVER_ERROR:
      default:
        logger.error('Server error occurred', logData);
        break;
    }
  }
}

/**
 * Higher-order function to wrap handlers with MCP-compliant error handling
 */
export function withMCPErrorHandling<TParams, TResult>(
  handler: (_params: TParams) => Promise<TResult>,
  context?: string
) {
  return async (params: TParams): Promise<TResult | ApiResponse> => {
    try {
      return await handler(params);
    } catch (error) {
      return MCPErrorFormatter.createErrorResponse(error, context);
    }
  };
}

/**
 * Validates that a value is defined and not null
 */
export function validateRequired<T>(value: T | null | undefined, fieldName: string): T {
  if (value === null || value === undefined) {
    throw MCPErrorFactory.validation(`${fieldName} is required`);
  }
  return value;
}

/**
 * Validates that a string is not empty
 */
export function validateNonEmptyString(
  value: string | null | undefined,
  fieldName: string
): string {
  const validated = validateRequired(value, fieldName);
  if (typeof validated !== 'string' || validated.trim().length === 0) {
    throw MCPErrorFactory.validation(`${fieldName} must be a non-empty string`);
  }
  return validated.trim();
}

/**
 * Validates that a number is within a specified range
 */
export function validateNumberRange(
  value: number,
  fieldName: string,
  min?: number,
  max?: number
): number {
  if (typeof value !== 'number' || isNaN(value)) {
    throw MCPErrorFactory.validation(`${fieldName} must be a valid number`);
  }

  if (min !== undefined && value < min) {
    throw MCPErrorFactory.validation(`${fieldName} must be >= ${min}`);
  }

  if (max !== undefined && value > max) {
    throw MCPErrorFactory.validation(`${fieldName} must be <= ${max}`);
  }

  return value;
}
