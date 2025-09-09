/**
 * @vitest-environment node
 */

import { AxiosError } from 'axios';
import { ErrorCategory } from '../utils/errors/categories.js';
import {
  classifyGraphQLError,
  isError,
  isErrorWithMessage,
  isAxiosErrorWithCriteria,
  extractGraphQLErrorMessages,
  handleGraphQLSpecificError,
  handleNetworkError,
  handleHttpStatusError,
  handleApiError,
} from '../utils/errors/handlers.js';

// Helper function to create a mock AxiosError
const createMockAxiosError = (statusCode?: number, data?: unknown, code?: string): AxiosError => {
  const error = new Error('Axios error') as AxiosError;
  error.isAxiosError = true;
  error.code = code;

  if (statusCode) {
    error.response = {
      status: statusCode,
      statusText: `Status ${statusCode}`,
      headers: {},
      config: { headers: {} as Record<string, unknown> },
      data,
    };
  }

  return error;
};

describe('Error Handlers', () => {
  describe('classifyGraphQLError', () => {
    it('should classify authentication errors correctly', () => {
      const authErrors = [
        new Error('Authentication failed'),
        new Error('Unauthorized access'),
        new Error('Access denied'),
        new Error('Not authorized to access this resource'),
        new Error('This action is forbidden'),
        new Error('Invalid token provided'),
        new Error('Missing API key'),
      ];

      for (const error of authErrors) {
        expect(classifyGraphQLError(error)).toBe(ErrorCategory.AUTH);
      }
    });

    it('should classify rate limit errors correctly', () => {
      const rateLimitErrors = [
        new Error('Rate limit exceeded'),
        new Error('Too many requests'),
        new Error('Your account is throttled'),
      ];

      for (const error of rateLimitErrors) {
        expect(classifyGraphQLError(error)).toBe(ErrorCategory.RATE_LIMIT);
      }
    });

    it('should classify network errors correctly', () => {
      const networkErrors = [
        new Error('Network error occurred'),
        new Error('Connection failed'),
        new Error('ECONNRESET error'),
        new Error('ECONNREFUSED error'),
      ];

      for (const error of networkErrors) {
        expect(classifyGraphQLError(error)).toBe(ErrorCategory.NETWORK);
      }
    });

    it('should classify timeout errors correctly', () => {
      const timeoutErrors = [
        new Error('Request timeout'),
        new Error('Operation timed out'),
        new Error('ETIMEDOUT error'),
      ];

      for (const error of timeoutErrors) {
        expect(classifyGraphQLError(error)).toBe(ErrorCategory.TIMEOUT);
      }
    });

    it('should classify schema errors correctly', () => {
      const schemaErrors = [
        new Error('Cannot query field "nonexistent"'),
        new Error('Unknown argument "invalid"'),
        new Error('Unknown type "Invalid"'),
        new Error('Field not defined on type "Object"'),
      ];

      for (const error of schemaErrors) {
        expect(classifyGraphQLError(error)).toBe(ErrorCategory.SCHEMA);
      }
    });

    it('should classify not found errors correctly', () => {
      const notFoundErrors = [
        new Error('Resource not found'),
        new Error('Object not found'),
        new Error('NoneType error'),
        new Error('The requested project does not exist'),
      ];

      for (const error of notFoundErrors) {
        expect(classifyGraphQLError(error)).toBe(ErrorCategory.NOT_FOUND);
      }
    });

    it('should classify server errors correctly', () => {
      const serverErrors = [
        new Error('Server error occurred'),
        new Error('Internal server error'),
        new Error('500 error'),
      ];

      for (const error of serverErrors) {
        expect(classifyGraphQLError(error)).toBe(ErrorCategory.SERVER);
      }
    });

    it('should classify unrecognized errors as OTHER', () => {
      const otherErrors = [
        new Error('Some random error'),
        new Error('Unexpected behavior'),
        new Error('Unknown issue'),
      ];

      for (const error of otherErrors) {
        expect(classifyGraphQLError(error)).toBe(ErrorCategory.OTHER);
      }
    });
  });

  describe('isError', () => {
    it('should return true for Error instances', () => {
      expect(isError(new Error('Test error'))).toBe(true);
    });

    it('should return true for objects with message property', () => {
      expect(isError({ message: 'Test error' })).toBe(true);
    });

    it('should return false for null or undefined', () => {
      expect(isError(null)).toBe(false);
      expect(isError(undefined)).toBe(false);
    });

    it('should return false for primitive values', () => {
      expect(isError(123)).toBe(false);
      expect(isError('string')).toBe(false);
      expect(isError(true)).toBe(false);
    });

    it('should return false for objects without message property', () => {
      expect(isError({})).toBe(false);
      expect(isError({ other: 'property' })).toBe(false);
    });

    it('should return false if message is not a string', () => {
      expect(isError({ message: 123 })).toBe(false);
      expect(isError({ message: true })).toBe(false);
      expect(isError({ message: {} })).toBe(false);
    });
  });

  describe('isErrorWithMessage', () => {
    it('should return true if error message contains the substring', () => {
      const error = new Error('This is a test error message');
      expect(isErrorWithMessage(error, 'test')).toBe(true);
    });

    it('should return false if error message does not contain the substring', () => {
      const error = new Error('This is a test error message');
      expect(isErrorWithMessage(error, 'missing')).toBe(false);
    });

    it('should return false for non-error objects', () => {
      expect(isErrorWithMessage(null, 'test')).toBe(false);
      expect(isErrorWithMessage(undefined, 'test')).toBe(false);
      expect(isErrorWithMessage(123, 'test')).toBe(false);
      expect(isErrorWithMessage('string', 'test')).toBe(false);
      expect(isErrorWithMessage({}, 'test')).toBe(false);
    });
  });

  describe('isAxiosErrorWithCriteria', () => {
    it('should return true for basic axios errors', () => {
      const axiosError = createMockAxiosError();
      expect(isAxiosErrorWithCriteria(axiosError)).toBe(true);
    });

    it('should return true when status code matches', () => {
      const axiosError = createMockAxiosError(404);
      expect(isAxiosErrorWithCriteria(axiosError, 404)).toBe(true);
    });

    it('should return false when status code does not match', () => {
      const axiosError = createMockAxiosError(404);
      expect(isAxiosErrorWithCriteria(axiosError, 500)).toBe(false);
    });

    it('should return true when error code matches', () => {
      const axiosError = createMockAxiosError(undefined, undefined, 'ECONNREFUSED');
      expect(isAxiosErrorWithCriteria(axiosError, undefined, 'ECONNREFUSED')).toBe(true);
    });

    it('should return false when error code does not match', () => {
      const axiosError = createMockAxiosError(undefined, undefined, 'ECONNREFUSED');
      expect(isAxiosErrorWithCriteria(axiosError, undefined, 'ETIMEDOUT')).toBe(false);
    });

    it('should return true when both status and error code match', () => {
      const axiosError = createMockAxiosError(404, undefined, 'ENOTFOUND');
      expect(isAxiosErrorWithCriteria(axiosError, 404, 'ENOTFOUND')).toBe(true);
    });

    it('should return false when either status or error code does not match', () => {
      const axiosError = createMockAxiosError(404, undefined, 'ENOTFOUND');
      expect(isAxiosErrorWithCriteria(axiosError, 500, 'ENOTFOUND')).toBe(false);
      expect(isAxiosErrorWithCriteria(axiosError, 404, 'ECONNREFUSED')).toBe(false);
    });

    it('should return false for non-axios errors', () => {
      expect(isAxiosErrorWithCriteria(new Error('Not an axios error'))).toBe(false);
      expect(isAxiosErrorWithCriteria(null)).toBe(false);
      expect(isAxiosErrorWithCriteria(undefined)).toBe(false);
      expect(isAxiosErrorWithCriteria({})).toBe(false);
    });
  });

  describe('extractGraphQLErrorMessages', () => {
    it('should extract and join error messages from an array of errors', () => {
      const errors = [
        { message: 'First error' },
        { message: 'Second error' },
        { message: 'Third error' },
      ];

      expect(extractGraphQLErrorMessages(errors)).toBe('First error, Second error, Third error');
    });

    it('should handle a single error', () => {
      const errors = [{ message: 'Only error' }];
      expect(extractGraphQLErrorMessages(errors)).toBe('Only error');
    });

    it('should handle an empty array', () => {
      expect(extractGraphQLErrorMessages([])).toBe('');
    });
  });

  describe('handleGraphQLSpecificError', () => {
    it('should create a ClassifiedError for GraphQL errors', () => {
      const graphqlErrors = [{ message: 'Authentication failed' }, { message: 'Invalid token' }];

      const axiosError = createMockAxiosError(200, { errors: graphqlErrors });
      const result = handleGraphQLSpecificError(axiosError);

      expect(result).not.toBeNull();
      expect(result?.message).toContain('GraphQL Error');
      expect(result?.message).toContain('Authentication failed');
      expect(result?.message).toContain('Invalid token');
      expect(result?.category).toBe(ErrorCategory.AUTH);
      expect(result?.originalError).toBe(axiosError);
      expect(result?.metadata).toEqual({ graphqlErrors });
    });

    it('should classify GraphQL errors correctly based on message content', () => {
      const testCases = [
        {
          errors: [{ message: 'Authentication failed' }],
          expectedCategory: ErrorCategory.AUTH,
        },
        {
          errors: [{ message: 'Rate limit exceeded' }],
          expectedCategory: ErrorCategory.RATE_LIMIT,
        },
        {
          errors: [{ message: 'Network error' }],
          expectedCategory: ErrorCategory.NETWORK,
        },
        {
          errors: [{ message: 'Cannot query field' }],
          expectedCategory: ErrorCategory.SCHEMA,
        },
        {
          errors: [{ message: 'Resource not found' }],
          expectedCategory: ErrorCategory.NOT_FOUND,
        },
        {
          errors: [{ message: 'Server error' }],
          expectedCategory: ErrorCategory.SERVER,
        },
        {
          errors: [{ message: 'Unknown error' }],
          expectedCategory: ErrorCategory.OTHER,
        },
      ];

      for (const testCase of testCases) {
        const axiosError = createMockAxiosError(200, { errors: testCase.errors });
        const result = handleGraphQLSpecificError(axiosError);

        expect(result).not.toBeNull();
        expect(result?.category).toBe(testCase.expectedCategory);
      }
    });

    it('should return null for non-GraphQL errors', () => {
      const nonGraphqlError = createMockAxiosError(404, { message: 'Not found' });
      expect(handleGraphQLSpecificError(nonGraphqlError)).toBeNull();
    });

    it('should return null for non-axios errors', () => {
      expect(handleGraphQLSpecificError(new Error('Regular error'))).toBeNull();
      expect(handleGraphQLSpecificError(null)).toBeNull();
      expect(handleGraphQLSpecificError(undefined)).toBeNull();
    });
  });

  describe('handleNetworkError', () => {
    it('should handle ECONNREFUSED errors', () => {
      const connectionError = createMockAxiosError(undefined, undefined, 'ECONNREFUSED');
      const result = handleNetworkError(connectionError);

      expect(result).not.toBeNull();
      expect(result?.message).toContain('Connection error');
      expect(result?.category).toBe(ErrorCategory.NETWORK);
      expect(result?.originalError).toBe(connectionError);
    });

    it('should handle ETIMEDOUT errors', () => {
      const timeoutError = createMockAxiosError(undefined, undefined, 'ETIMEDOUT');
      const result = handleNetworkError(timeoutError);

      expect(result).not.toBeNull();
      expect(result?.message).toContain('Timeout error');
      expect(result?.category).toBe(ErrorCategory.TIMEOUT);
      expect(result?.originalError).toBe(timeoutError);
    });

    it('should return null for other error types', () => {
      const otherError = createMockAxiosError(404);
      expect(handleNetworkError(otherError)).toBeNull();

      const nonAxiosError = new Error('Not an axios error');
      expect(handleNetworkError(nonAxiosError)).toBeNull();
    });
  });

  describe('handleHttpStatusError', () => {
    it('should handle 401 errors', () => {
      const authError = createMockAxiosError(401);
      const result = handleHttpStatusError(authError);

      expect(result).not.toBeNull();
      expect(result?.message).toContain('Authentication error');
      expect(result?.category).toBe(ErrorCategory.AUTH);
      expect(result?.originalError).toBe(authError);
    });

    it('should handle 429 errors', () => {
      const rateLimitError = createMockAxiosError(429);
      const result = handleHttpStatusError(rateLimitError);

      expect(result).not.toBeNull();
      expect(result?.message).toContain('Rate limit exceeded');
      expect(result?.category).toBe(ErrorCategory.RATE_LIMIT);
      expect(result?.originalError).toBe(rateLimitError);
    });

    it('should handle 500+ errors', () => {
      const serverErrors = [500, 502, 503, 504, 520].map((status) => createMockAxiosError(status));

      for (const error of serverErrors) {
        const result = handleHttpStatusError(error);
        expect(result).not.toBeNull();
        expect(result?.message).toContain('Server error');
        expect(result?.category).toBe(ErrorCategory.SERVER);
        expect(result?.originalError).toBe(error);
      }
    });

    it('should handle 404 errors', () => {
      const notFoundError = createMockAxiosError(404);
      const result = handleHttpStatusError(notFoundError);

      expect(result).not.toBeNull();
      expect(result?.message).toContain('Not found');
      expect(result?.category).toBe(ErrorCategory.NOT_FOUND);
      expect(result?.originalError).toBe(notFoundError);
    });

    it('should handle other 4xx errors', () => {
      const clientErrors = [400, 403, 405, 422].map((status) => createMockAxiosError(status));

      for (const error of clientErrors) {
        const result = handleHttpStatusError(error);
        expect(result).not.toBeNull();
        expect(result?.message).toContain('Client error');
        expect(result?.category).toBe(ErrorCategory.CLIENT);
        expect(result?.originalError).toBe(error);
      }
    });

    it('should return null for errors without status code', () => {
      const noStatusError = createMockAxiosError();
      expect(handleHttpStatusError(noStatusError)).toBeNull();
    });

    it('should return null for non-axios errors', () => {
      expect(handleHttpStatusError(new Error('Regular error'))).toBeNull();
      expect(handleHttpStatusError(null)).toBeNull();
      expect(handleHttpStatusError(undefined)).toBeNull();
    });

    it('should return null for status codes outside the handled ranges', () => {
      // Status codes like 300, 301, 302 (redirects) don't fall into the 4xx or 5xx ranges
      const redirectError = createMockAxiosError(302);
      expect(handleHttpStatusError(redirectError)).toBeNull();
    });
  });

  describe('handleApiError', () => {
    it('should return input if it is already a ClassifiedError', () => {
      const classifiedError = {
        name: 'Error',
        message: 'Already classified',
        category: ErrorCategory.CLIENT,
      };

      expect(handleApiError(classifiedError)).toBe(classifiedError);
    });

    it('should handle GraphQL errors', () => {
      const graphqlErrors = [{ message: 'Cannot query field' }];
      const graphqlError = createMockAxiosError(200, { errors: graphqlErrors });

      // Create a real GraphQL error that will be detected by handleGraphQLSpecificError
      const result = handleApiError(graphqlError);

      expect(result.category).toBe(ErrorCategory.SCHEMA);
      expect(result.message).toContain('GraphQL Error');
      expect(result.message).toContain('Cannot query field');
    });

    it('should handle network errors', () => {
      const networkError = createMockAxiosError(undefined, undefined, 'ECONNREFUSED');

      const result = handleApiError(networkError);

      expect(result.category).toBe(ErrorCategory.NETWORK);
      expect(result.message).toContain('Connection error');
    });

    it('should handle HTTP errors', () => {
      const httpError = createMockAxiosError(401);

      const result = handleApiError(httpError);

      expect(result.category).toBe(ErrorCategory.AUTH);
      expect(result.message).toContain('Authentication error');
    });

    it('should handle standard Error objects with classification', () => {
      const standardError = new Error('Authentication failed');

      // We can't mock the imported functions directly in ES modules
      // So we'll just test the result of handleApiError
      const result = handleApiError(standardError);

      expect(result.category).toBe(ErrorCategory.AUTH); // Based on message classification
      expect(result.message).toContain('DeepSource API error');
      expect(result.message).toContain('Authentication failed');
    });

    it('should handle unknown error types as a fallback', () => {
      const unknownError = { notAnError: true };

      const result = handleApiError(unknownError);

      expect(result.category).toBe(ErrorCategory.OTHER);
      expect(result.message).toContain('Unknown error occurred');
      expect(result.originalError).toBe(unknownError);
    });
  });
});
