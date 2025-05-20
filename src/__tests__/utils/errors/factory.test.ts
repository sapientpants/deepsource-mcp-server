/**
 * @jest-environment node
 */

import { ErrorCategory } from '../../../utils/errors/categories.js';
import {
  createClassifiedError,
  createAuthError,
  createNetworkError,
  createServerError,
  createClientError,
  createTimeoutError,
  createRateLimitError,
  createSchemaError,
  createNotFoundError,
  createFormatError,
} from '../../../utils/errors/factory.js';
import { ClassifiedError } from '../../../utils/errors/types.js';

describe('Error Factory', () => {
  // Test helper function to verify common properties of classified errors
  const verifyErrorProperties = (
    error: ClassifiedError,
    expectedMessage: string,
    expectedCategory: ErrorCategory,
    expectedOriginalError?: unknown,
    expectedMetadata?: Record<string, unknown>
  ) => {
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe(expectedMessage);
    expect(error.category).toBe(expectedCategory);
    
    if (expectedOriginalError) {
      expect(error.originalError).toBe(expectedOriginalError);
    } else {
      expect(error.originalError).toBeUndefined();
    }
    
    if (expectedMetadata) {
      expect(error.metadata).toEqual(expectedMetadata);
    } else {
      expect(error.metadata).toBeUndefined();
    }

    // Verify stack trace exists
    expect(error.stack).toBeDefined();
  };

  describe('createClassifiedError', () => {
    it('should create a basic classified error with all properties', () => {
      const message = 'Test error message';
      const category = ErrorCategory.NETWORK;
      const originalError = new Error('Original error');
      const metadata = { key: 'value', details: { nested: true } };

      const error = createClassifiedError(message, category, originalError, metadata);

      verifyErrorProperties(error, message, category, originalError, metadata);
    });

    it('should create a classified error without optional properties', () => {
      const message = 'Simple error';
      const category = ErrorCategory.OTHER;

      const error = createClassifiedError(message, category);

      verifyErrorProperties(error, message, category);
    });

    it('should preserve original error instance type', () => {
      class CustomError extends Error {
        code: string;
        constructor(message: string, code: string) {
          super(message);
          this.code = code;
        }
      }

      const originalError = new CustomError('Custom error', 'E001');
      const error = createClassifiedError('Wrapped error', ErrorCategory.CLIENT, originalError);

      expect(error.originalError).toBeInstanceOf(CustomError);
      expect((error.originalError as CustomError).code).toBe('E001');
    });
  });

  describe('Specialized error factories', () => {
    const originalError = new Error('Original error');
    const metadata = { requestId: '123', endpoint: '/api/data' };

    describe('createAuthError', () => {
      it('should create an error with AUTH category and custom message', () => {
        const message = 'Invalid API key';
        const error = createAuthError(message, originalError, metadata);

        verifyErrorProperties(error, message, ErrorCategory.AUTH, originalError, metadata);
      });

      it('should use default message when no message is provided', () => {
        const error = createAuthError('', originalError, metadata);

        verifyErrorProperties(error, 'Authentication failed', ErrorCategory.AUTH, originalError, metadata);
      });
    });

    describe('createNetworkError', () => {
      it('should create an error with NETWORK category and custom message', () => {
        const message = 'Connection refused';
        const error = createNetworkError(message, originalError, metadata);

        verifyErrorProperties(error, message, ErrorCategory.NETWORK, originalError, metadata);
      });

      it('should use default message when no message is provided', () => {
        const error = createNetworkError('', originalError, metadata);

        verifyErrorProperties(error, 'Network error occurred', ErrorCategory.NETWORK, originalError, metadata);
      });
    });

    describe('createServerError', () => {
      it('should create an error with SERVER category and custom message', () => {
        const message = 'Internal server error (500)';
        const error = createServerError(message, originalError, metadata);

        verifyErrorProperties(error, message, ErrorCategory.SERVER, originalError, metadata);
      });

      it('should use default message when no message is provided', () => {
        const error = createServerError('', originalError, metadata);

        verifyErrorProperties(error, 'Server error occurred', ErrorCategory.SERVER, originalError, metadata);
      });
    });

    describe('createClientError', () => {
      it('should create an error with CLIENT category and custom message', () => {
        const message = 'Invalid request parameters';
        const error = createClientError(message, originalError, metadata);

        verifyErrorProperties(error, message, ErrorCategory.CLIENT, originalError, metadata);
      });

      it('should use default message when no message is provided', () => {
        const error = createClientError('', originalError, metadata);

        verifyErrorProperties(error, 'Client error occurred', ErrorCategory.CLIENT, originalError, metadata);
      });
    });

    describe('createTimeoutError', () => {
      it('should create an error with TIMEOUT category and custom message', () => {
        const message = 'Operation timed out after 30s';
        const error = createTimeoutError(message, originalError, metadata);

        verifyErrorProperties(error, message, ErrorCategory.TIMEOUT, originalError, metadata);
      });

      it('should use default message when no message is provided', () => {
        const error = createTimeoutError('', originalError, metadata);

        verifyErrorProperties(error, 'Request timed out', ErrorCategory.TIMEOUT, originalError, metadata);
      });
    });

    describe('createRateLimitError', () => {
      it('should create an error with RATE_LIMIT category and custom message', () => {
        const message = 'Too many requests (429)';
        const error = createRateLimitError(message, originalError, metadata);

        verifyErrorProperties(error, message, ErrorCategory.RATE_LIMIT, originalError, metadata);
      });

      it('should use default message when no message is provided', () => {
        const error = createRateLimitError('', originalError, metadata);

        verifyErrorProperties(error, 'Rate limit exceeded', ErrorCategory.RATE_LIMIT, originalError, metadata);
      });
    });

    describe('createSchemaError', () => {
      it('should create an error with SCHEMA category and custom message', () => {
        const message = 'Invalid field in schema';
        const error = createSchemaError(message, originalError, metadata);

        verifyErrorProperties(error, message, ErrorCategory.SCHEMA, originalError, metadata);
      });

      it('should use default message when no message is provided', () => {
        const error = createSchemaError('', originalError, metadata);

        verifyErrorProperties(error, 'GraphQL schema error', ErrorCategory.SCHEMA, originalError, metadata);
      });
    });

    describe('createNotFoundError', () => {
      it('should create an error with NOT_FOUND category and custom message', () => {
        const message = 'Project with ID 123 not found';
        const error = createNotFoundError(message, originalError, metadata);

        verifyErrorProperties(error, message, ErrorCategory.NOT_FOUND, originalError, metadata);
      });

      it('should use default message when no message is provided', () => {
        const error = createNotFoundError('', originalError, metadata);

        verifyErrorProperties(error, 'Resource not found', ErrorCategory.NOT_FOUND, originalError, metadata);
      });
    });

    describe('createFormatError', () => {
      it('should create an error with FORMAT category and custom message', () => {
        const message = 'Invalid JSON format';
        const error = createFormatError(message, originalError, metadata);

        verifyErrorProperties(error, message, ErrorCategory.FORMAT, originalError, metadata);
      });

      it('should use default message when no message is provided', () => {
        const error = createFormatError('', originalError, metadata);

        verifyErrorProperties(error, 'Data format error', ErrorCategory.FORMAT, originalError, metadata);
      });
    });
  });

  describe('Error integration tests', () => {
    it('should correctly chain original errors for debugging purposes', () => {
      const level1Error = new Error('Low-level error');
      const level2Error = createNetworkError('Mid-level error', level1Error);
      const level3Error = createClientError('High-level error', level2Error, {
        operation: 'getUserData',
      });

      expect(level3Error.message).toBe('High-level error');
      expect(level3Error.category).toBe(ErrorCategory.CLIENT);
      expect(level3Error.metadata).toEqual({ operation: 'getUserData' });
      
      const originalError = level3Error.originalError as ClassifiedError;
      expect(originalError.message).toBe('Mid-level error');
      expect(originalError.category).toBe(ErrorCategory.NETWORK);
      
      const deepestError = originalError.originalError as Error;
      expect(deepestError.message).toBe('Low-level error');
    });

    it('should handle various metadata types', () => {
      const numericMeta = { statusCode: 404, retryCount: 3 };
      const complexMeta = {
        request: { url: '/api/projects', method: 'GET' },
        response: { status: 404, body: null },
        timing: { started: '2023-01-01T00:00:00Z', duration: 1500 },
      };

      const error1 = createNotFoundError('Resource not found', undefined, numericMeta);
      const error2 = createServerError('Server error', undefined, complexMeta);

      expect(error1.metadata).toEqual(numericMeta);
      expect(error2.metadata).toEqual(complexMeta);
    });
  });
});