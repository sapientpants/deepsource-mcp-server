/**
 * @fileoverview Tests for MCP-compliant error handling utilities
 */

import { describe, it, expect, jest } from '@jest/globals';
import {
  MCPError,
  MCPErrorCode,
  MCPErrorCategory,
  MCPErrorFactory,
  MCPErrorConverter,
  MCPErrorFormatter,
  withMCPErrorHandling,
  validateRequired,
  validateNonEmptyString,
  validateNumberRange,
} from '../mcp-errors.js';

describe('MCPError', () => {
  it('should create an error with all properties', () => {
    const error = new MCPError({
      code: MCPErrorCode.VALIDATION_ERROR,
      category: MCPErrorCategory.VALIDATION_ERROR,
      message: 'Test error',
      details: { field: 'test' },
      retryable: true,
      userFriendly: false,
    });

    expect(error.name).toBe('MCPError');
    expect(error.message).toBe('Test error');
    expect(error.code).toBe(MCPErrorCode.VALIDATION_ERROR);
    expect(error.category).toBe(MCPErrorCategory.VALIDATION_ERROR);
    expect(error.details).toEqual({ field: 'test' });
    expect(error.retryable).toBe(true);
    expect(error.userFriendly).toBe(false);
    expect(error.timestamp).toBeInstanceOf(Date);
  });

  it('should use default values for optional properties', () => {
    const error = new MCPError({
      code: MCPErrorCode.SERVER_ERROR,
      category: MCPErrorCategory.SERVER_ERROR,
      message: 'Test error',
    });

    expect(error.retryable).toBe(false);
    expect(error.userFriendly).toBe(true);
    expect(error.details).toBeUndefined();
    expect(error.cause).toBeUndefined();
  });

  it('should serialize to JSON correctly', () => {
    const originalError = new Error('Original error');
    const error = new MCPError({
      code: MCPErrorCode.INTERNAL_ERROR,
      category: MCPErrorCategory.SERVER_ERROR,
      message: 'Test error',
      details: { test: 'value' },
      cause: originalError,
      retryable: true,
      userFriendly: false,
    });

    const json = error.toJSON();

    expect(json).toMatchObject({
      name: 'MCPError',
      message: 'Test error',
      code: MCPErrorCode.INTERNAL_ERROR,
      category: MCPErrorCategory.SERVER_ERROR,
      details: { test: 'value' },
      retryable: true,
      userFriendly: false,
    });
    expect(json.timestamp).toBeDefined();
    expect(json.stack).toBeDefined();
  });
});

describe('MCPErrorFactory', () => {
  describe('authentication', () => {
    it('should create authentication error with default message', () => {
      const error = MCPErrorFactory.authentication();

      expect(error.code).toBe(MCPErrorCode.AUTHENTICATION_ERROR);
      expect(error.category).toBe(MCPErrorCategory.AUTHENTICATION_ERROR);
      expect(error.message).toBe('Authentication failed');
      expect(error.retryable).toBe(false);
      expect(error.userFriendly).toBe(true);
    });

    it('should create authentication error with custom message and details', () => {
      const error = MCPErrorFactory.authentication('Invalid API key', { key: 'test-key' });

      expect(error.message).toBe('Invalid API key');
      expect(error.details).toEqual({ key: 'test-key' });
    });
  });

  describe('resourceNotFound', () => {
    it('should create resource not found error', () => {
      const error = MCPErrorFactory.resourceNotFound('project-123', { type: 'project' });

      expect(error.code).toBe(MCPErrorCode.RESOURCE_NOT_FOUND);
      expect(error.category).toBe(MCPErrorCategory.RESOURCE_ERROR);
      expect(error.message).toBe('Resource not found: project-123');
      expect(error.details).toEqual({ resource: 'project-123', type: 'project' });
      expect(error.retryable).toBe(false);
      expect(error.userFriendly).toBe(true);
    });
  });

  describe('validation', () => {
    it('should create validation error', () => {
      const error = MCPErrorFactory.validation('Invalid input format', { field: 'email' });

      expect(error.code).toBe(MCPErrorCode.VALIDATION_ERROR);
      expect(error.category).toBe(MCPErrorCategory.VALIDATION_ERROR);
      expect(error.message).toBe('Validation failed: Invalid input format');
      expect(error.details).toEqual({ field: 'email' });
      expect(error.retryable).toBe(false);
      expect(error.userFriendly).toBe(true);
    });
  });

  describe('server', () => {
    it('should create server error with default message', () => {
      const error = MCPErrorFactory.server();

      expect(error.code).toBe(MCPErrorCode.INTERNAL_ERROR);
      expect(error.category).toBe(MCPErrorCategory.SERVER_ERROR);
      expect(error.message).toBe('Internal server error');
      expect(error.retryable).toBe(true);
      expect(error.userFriendly).toBe(false);
    });

    it('should create server error with cause and details', () => {
      const cause = new Error('Database connection failed');
      const error = MCPErrorFactory.server('DB error', cause, { connection: 'primary' });

      expect(error.message).toBe('DB error');
      expect(error.cause).toBe(cause);
      expect(error.details).toEqual({ connection: 'primary' });
    });
  });

  describe('timeout', () => {
    it('should create timeout error', () => {
      const error = MCPErrorFactory.timeout('API call', 5000);

      expect(error.code).toBe(MCPErrorCode.TIMEOUT_ERROR);
      expect(error.category).toBe(MCPErrorCategory.NETWORK_ERROR);
      expect(error.message).toBe('Operation timed out: API call');
      expect(error.details).toEqual({ operation: 'API call', timeoutMs: 5000 });
      expect(error.retryable).toBe(true);
      expect(error.userFriendly).toBe(true);
    });
  });

  describe('rateLimited', () => {
    it('should create rate limit error without reset time', () => {
      const error = MCPErrorFactory.rateLimited();

      expect(error.code).toBe(MCPErrorCode.RATE_LIMITED);
      expect(error.category).toBe(MCPErrorCategory.CLIENT_ERROR);
      expect(error.message).toBe('Rate limit exceeded');
      expect(error.retryable).toBe(true);
      expect(error.userFriendly).toBe(true);
      expect(error.details).toBeUndefined();
    });

    it('should create rate limit error with reset time', () => {
      const resetTime = new Date('2023-12-01T12:00:00Z');
      const error = MCPErrorFactory.rateLimited(resetTime);

      expect(error.details).toEqual({ resetTime: '2023-12-01T12:00:00.000Z' });
    });
  });

  describe('configuration', () => {
    it('should create configuration error', () => {
      const error = MCPErrorFactory.configuration('Missing API key', { config: 'api' });

      expect(error.code).toBe(MCPErrorCode.CONFIGURATION_ERROR);
      expect(error.category).toBe(MCPErrorCategory.SERVER_ERROR);
      expect(error.message).toBe('Configuration error: Missing API key');
      expect(error.details).toEqual({ config: 'api' });
      expect(error.retryable).toBe(false);
      expect(error.userFriendly).toBe(false);
    });
  });

  describe('dependency', () => {
    it('should create dependency error', () => {
      const cause = new Error('Connection refused');
      const error = MCPErrorFactory.dependency('database', cause);

      expect(error.code).toBe(MCPErrorCode.DEPENDENCY_ERROR);
      expect(error.category).toBe(MCPErrorCategory.SERVER_ERROR);
      expect(error.message).toBe('Dependency error: database is unavailable');
      expect(error.cause).toBe(cause);
      expect(error.details).toEqual({ service: 'database' });
      expect(error.retryable).toBe(true);
      expect(error.userFriendly).toBe(false);
    });
  });
});

describe('MCPErrorConverter', () => {
  describe('toMCPError', () => {
    it('should return MCPError as-is', () => {
      const originalError = MCPErrorFactory.validation('Test error');
      const result = MCPErrorConverter.toMCPError(originalError);

      expect(result).toBe(originalError);
    });

    it('should convert network errors', () => {
      const networkError = new Error('fetch failed: ECONNREFUSED');
      const result = MCPErrorConverter.toMCPError(networkError);

      expect(result.code).toBe(MCPErrorCode.SERVER_ERROR);
      expect(result.category).toBe(MCPErrorCategory.NETWORK_ERROR);
      expect(result.message).toBe('Network error: fetch failed: ECONNREFUSED');
      expect(result.retryable).toBe(true);
      expect(result.userFriendly).toBe(true);
    });

    it('should convert timeout errors', () => {
      const timeoutError = new Error('Request timeout after 30000ms');
      const result = MCPErrorConverter.toMCPError(timeoutError, 'API call');

      expect(result.code).toBe(MCPErrorCode.TIMEOUT_ERROR);
      expect(result.category).toBe(MCPErrorCategory.NETWORK_ERROR);
      expect(result.message).toBe('Operation timed out: API call');
    });

    it('should convert authentication errors', () => {
      const authError = new Error('Unauthorized: Invalid token');
      const result = MCPErrorConverter.toMCPError(authError);

      expect(result.code).toBe(MCPErrorCode.AUTHENTICATION_ERROR);
      expect(result.category).toBe(MCPErrorCategory.AUTHENTICATION_ERROR);
      expect(result.message).toBe('Unauthorized: Invalid token');
    });

    it('should convert validation errors', () => {
      const validationError = new Error('Validation failed: required field missing');
      const result = MCPErrorConverter.toMCPError(validationError);

      expect(result.code).toBe(MCPErrorCode.VALIDATION_ERROR);
      expect(result.category).toBe(MCPErrorCategory.VALIDATION_ERROR);
      expect(result.message).toBe('Validation failed: required field missing');
    });

    it('should convert string errors', () => {
      const result = MCPErrorConverter.toMCPError('Something went wrong');

      expect(result.code).toBe(MCPErrorCode.INTERNAL_ERROR);
      expect(result.category).toBe(MCPErrorCategory.SERVER_ERROR);
      expect(result.message).toBe('Something went wrong');
    });

    it('should convert unknown errors', () => {
      const result = MCPErrorConverter.toMCPError({ weird: 'object' }, 'test context');

      expect(result.code).toBe(MCPErrorCode.INTERNAL_ERROR);
      expect(result.category).toBe(MCPErrorCategory.SERVER_ERROR);
      expect(result.message).toBe('Unknown error occurred');
      expect(result.details?.context).toBe('test context');
      expect(result.details?.originalError).toBe('[object Object]');
    });

    it('should handle standard errors with context', () => {
      const error = new Error('Database connection failed');
      const result = MCPErrorConverter.toMCPError(error, 'user-fetch');

      expect(result.cause).toBe(error);
      expect(result.details?.context).toBe('user-fetch');
    });
  });
});

describe('MCPErrorFormatter', () => {
  describe('createErrorResponse', () => {
    it('should create error response from MCPError', () => {
      const error = MCPErrorFactory.validation('Invalid email format', { field: 'email' });
      const response = MCPErrorFormatter.createErrorResponse(error, 'user-registration');

      expect(response.isError).toBe(true);
      expect(response.content).toHaveLength(1);
      expect(response.content[0].type).toBe('text');

      const responseData = JSON.parse(response.content[0].text);
      expect(responseData).toMatchObject({
        error: 'Validation failed: Invalid email format',
        code: MCPErrorCode.VALIDATION_ERROR,
        category: MCPErrorCategory.VALIDATION_ERROR,
        retryable: false,
        details: { field: 'email' },
      });
      expect(responseData.timestamp).toBeDefined();
    });

    it('should create error response from standard error', () => {
      const error = new Error('Database connection failed');
      const response = MCPErrorFormatter.createErrorResponse(error, 'data-fetch');

      expect(response.isError).toBe(true);
      const responseData = JSON.parse(response.content[0].text);
      expect(responseData.error).toBe('An error occurred while processing your request');
      expect(responseData.code).toBe(MCPErrorCode.INTERNAL_ERROR);
    });

    it('should create error response from string', () => {
      const response = MCPErrorFormatter.createErrorResponse('Something went wrong');

      expect(response.isError).toBe(true);
      const responseData = JSON.parse(response.content[0].text);
      expect(responseData.error).toBe('An error occurred while processing your request');
    });

    it('should show user-friendly error message when userFriendly is true', () => {
      const error = MCPErrorFactory.resourceNotFound('project-123');
      const response = MCPErrorFormatter.createErrorResponse(error);

      const responseData = JSON.parse(response.content[0].text);
      expect(responseData.error).toBe('Resource not found: project-123');
    });
  });
});

describe('withMCPErrorHandling', () => {
  it('should return result when no error occurs', async () => {
    const handler = jest.fn().mockResolvedValue({ success: true });
    const wrappedHandler = withMCPErrorHandling(handler, 'test-operation');

    const result = await wrappedHandler({ input: 'test' });

    expect(result).toEqual({ success: true });
    expect(handler).toHaveBeenCalledWith({ input: 'test' });
  });

  it('should return error response when handler throws', async () => {
    const handler = jest.fn().mockRejectedValue(new Error('Handler failed'));
    const wrappedHandler = withMCPErrorHandling(handler, 'test-operation');

    const result = await wrappedHandler({ input: 'test' });

    expect(result).toMatchObject({
      isError: true,
      content: expect.arrayContaining([
        expect.objectContaining({
          type: 'text',
          text: expect.stringContaining('error'),
        }),
      ]),
    });
  });

  it('should handle MCPError properly', async () => {
    const mcpError = MCPErrorFactory.validation('Invalid input');
    const handler = jest.fn().mockRejectedValue(mcpError);
    const wrappedHandler = withMCPErrorHandling(handler, 'validation-test');

    const result = await wrappedHandler({ input: 'invalid' });

    expect(result).toMatchObject({
      isError: true,
    });

    const responseText = (result as any).content[0].text;
    const responseData = JSON.parse(responseText);
    expect(responseData.error).toBe('Validation failed: Invalid input');
    expect(responseData.code).toBe(MCPErrorCode.VALIDATION_ERROR);
  });
});

describe('Validation functions', () => {
  describe('validateRequired', () => {
    it('should return value when defined', () => {
      expect(validateRequired('test', 'field')).toBe('test');
      expect(validateRequired(0, 'field')).toBe(0);
      expect(validateRequired(false, 'field')).toBe(false);
    });

    it('should throw error when value is null', () => {
      expect(() => validateRequired(null, 'field')).toThrow(MCPError);
      expect(() => validateRequired(null, 'field')).toThrow('field is required');
    });

    it('should throw error when value is undefined', () => {
      expect(() => validateRequired(undefined, 'field')).toThrow(MCPError);
      expect(() => validateRequired(undefined, 'field')).toThrow('field is required');
    });
  });

  describe('validateNonEmptyString', () => {
    it('should return trimmed string when valid', () => {
      expect(validateNonEmptyString('  test  ', 'field')).toBe('test');
      expect(validateNonEmptyString('hello', 'field')).toBe('hello');
    });

    it('should throw error for empty string', () => {
      expect(() => validateNonEmptyString('', 'field')).toThrow(MCPError);
      expect(() => validateNonEmptyString('   ', 'field')).toThrow(
        'field must be a non-empty string'
      );
    });

    it('should throw error for null/undefined', () => {
      expect(() => validateNonEmptyString(null, 'field')).toThrow('field is required');
      expect(() => validateNonEmptyString(undefined, 'field')).toThrow('field is required');
    });

    it('should throw error for non-string', () => {
      expect(() => validateNonEmptyString(123 as any, 'field')).toThrow(
        'field must be a non-empty string'
      );
    });
  });

  describe('validateNumberRange', () => {
    it('should return number when valid', () => {
      expect(validateNumberRange(5, 'field')).toBe(5);
      expect(validateNumberRange(0, 'field')).toBe(0);
      expect(validateNumberRange(-5, 'field')).toBe(-5);
    });

    it('should validate minimum range', () => {
      expect(validateNumberRange(5, 'field', 0)).toBe(5);
      expect(() => validateNumberRange(-1, 'field', 0)).toThrow('field must be >= 0');
    });

    it('should validate maximum range', () => {
      expect(validateNumberRange(5, 'field', undefined, 10)).toBe(5);
      expect(() => validateNumberRange(15, 'field', undefined, 10)).toThrow('field must be <= 10');
    });

    it('should validate both min and max range', () => {
      expect(validateNumberRange(5, 'field', 0, 10)).toBe(5);
      expect(() => validateNumberRange(-1, 'field', 0, 10)).toThrow('field must be >= 0');
      expect(() => validateNumberRange(15, 'field', 0, 10)).toThrow('field must be <= 10');
    });

    it('should throw error for non-number', () => {
      expect(() => validateNumberRange('5' as any, 'field')).toThrow(
        'field must be a valid number'
      );
      expect(() => validateNumberRange(NaN, 'field')).toThrow('field must be a valid number');
    });
  });
});
