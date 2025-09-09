/**
 * @fileoverview MCP-compliant error handling utilities
 *
 * This module provides standardized error handling for Model Context Protocol (MCP)
 * servers, including error types, formatting, and response generation that comply
 * with MCP specifications.
 */

import { ApiResponse } from '../../models/common.js';

/**
 * Standard MCP error codes based on JSON-RPC 2.0 specification
 * These codes are exported for use by consumers of the library
 */

export enum MCPErrorCode {
  // JSON-RPC 2.0 standard error codes
  PARSE_ERROR = -32700,
  INVALID_REQUEST = -32600,
  METHOD_NOT_FOUND = -32601,
  INVALID_PARAMS = -32602,
  INTERNAL_ERROR = -32603,

  // MCP-specific error codes (range -32000 to -32099)
  SERVER_ERROR = -32000,
  RESOURCE_NOT_FOUND = -32001,
  AUTHENTICATION_ERROR = -32002,
  AUTHORIZATION_ERROR = -32003,
  RATE_LIMITED = -32004,
  TIMEOUT_ERROR = -32005,
  VALIDATION_ERROR = -32006,
  DEPENDENCY_ERROR = -32007,
  CONFIGURATION_ERROR = -32008,

  // Additional error codes for compatibility
  NETWORK_ERROR = -32009,
  CLIENT_ERROR = -32010,
}

/**
 * MCP error categories for better error classification
 * These categories are exported for use by consumers of the library
 */

export enum MCPErrorCategory {
  CLIENT_ERROR = 'client_error',
  SERVER_ERROR = 'server_error',
  NETWORK_ERROR = 'network_error',
  VALIDATION_ERROR = 'validation_error',
  AUTHENTICATION_ERROR = 'authentication_error',
  RESOURCE_ERROR = 'resource_error',
  INTERNAL_ERROR = 'internal_error',
  TRANSPORT_ERROR = 'transport_error',
}

/**
 * Interface for structured MCP error information
 */
export interface MCPErrorInfo {
  code: MCPErrorCode | string;
  message: string;
  category: MCPErrorCategory | string;
  details?: Record<string, unknown>;
  cause?: Error;
  retryable?: boolean;
  userFriendly?: boolean;
}

/**
 * Enhanced error class for MCP-compliant errors
 */
export class MCPError extends Error {
  public override readonly name = 'MCPError';
  public readonly code: MCPErrorCode | string;
  public readonly category: MCPErrorCategory | string;
  public readonly details?: Record<string, unknown>;
  public override readonly cause?: Error;
  public readonly retryable: boolean;
  public readonly userFriendly: boolean;
  public readonly timestamp: Date;

  constructor(info: MCPErrorInfo) {
    super(info.message);
    this.code = info.code;
    this.category = info.category;
    if (info.details !== undefined) {
      this.details = info.details;
    }
    if (info.cause !== undefined) {
      this.cause = info.cause;
    }
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

// Re-export factory functions
export { MCPErrorFactory } from './mcp-error-factory.js';

// Re-export converter functions
export { MCPErrorConverter } from './mcp-error-converter.js';

// Re-export formatter functions
export { MCPErrorFormatter } from './mcp-error-formatter.js';

/**
 * Type guard to check if an error is an MCPError
 */
export function isMCPError(error: unknown): error is MCPError {
  return error instanceof MCPError;
}

/**
 * Validates that a value is not null or undefined
 */
export function validateRequired<T>(value: T | null | undefined, fieldName: string): T {
  if (value === null || value === undefined) {
    throw new MCPError({
      code: MCPErrorCode.VALIDATION_ERROR,
      category: MCPErrorCategory.VALIDATION_ERROR,
      message: `Validation failed: ${fieldName} is required`,
      retryable: false,
      userFriendly: true,
    });
  }
  return value;
}

/**
 * Validates that a string is not empty
 */
export function validateNonEmptyString(value: unknown, fieldName: string): string {
  const validated = validateRequired(value, fieldName);
  if (typeof validated !== 'string') {
    throw new MCPError({
      code: MCPErrorCode.VALIDATION_ERROR,
      category: MCPErrorCategory.VALIDATION_ERROR,
      message: `Validation failed: ${fieldName} must be a non-empty string`,
      retryable: false,
      userFriendly: true,
    });
  }
  if (!validated.trim()) {
    throw new MCPError({
      code: MCPErrorCode.VALIDATION_ERROR,
      category: MCPErrorCategory.VALIDATION_ERROR,
      message: `Validation failed: ${fieldName} must be a non-empty string`,
      retryable: false,
      userFriendly: true,
    });
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
    throw new MCPError({
      code: MCPErrorCode.VALIDATION_ERROR,
      category: MCPErrorCategory.VALIDATION_ERROR,
      message: `Validation failed: ${fieldName} must be a valid number`,
      retryable: false,
      userFriendly: true,
    });
  }

  if (min !== undefined && value < min) {
    throw new MCPError({
      code: MCPErrorCode.VALIDATION_ERROR,
      category: MCPErrorCategory.VALIDATION_ERROR,
      message: `Validation failed: ${fieldName} must be >= ${min}`,
      retryable: false,
      userFriendly: true,
    });
  }

  if (max !== undefined && value > max) {
    throw new MCPError({
      code: MCPErrorCode.VALIDATION_ERROR,
      category: MCPErrorCategory.VALIDATION_ERROR,
      message: `Validation failed: ${fieldName} must be <= ${max}`,
      retryable: false,
      userFriendly: true,
    });
  }

  return value;
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
      const { createErrorResponse } = await import('./mcp-error-formatter.js');
      return createErrorResponse(error, context);
    }
  };
}
