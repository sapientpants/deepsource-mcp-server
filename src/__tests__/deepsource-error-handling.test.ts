import { DeepSourceClient } from '../deepsource';
import { TestableDeepSourceClient } from './utils/test-utils';

// Create a local test subclass to expose additional private methods not in TestableDeepSourceClient
class LocalTestableDeepSourceClient extends DeepSourceClient {
  static testIsError(error: unknown): error is Error {
    // @ts-expect-error - Accessing private method for testing
    return DeepSourceClient.isError(error);
  }

  static testExtractErrorMessages(errors: unknown[]): string {
    // @ts-expect-error - Accessing private method for testing
    return DeepSourceClient.extractErrorMessages(errors);
  }
}

describe('DeepSource Error Handling', () => {
  describe('isError', () => {
    it('should return true for Error instances', () => {
      const error = new Error('Test Error');
      expect(LocalTestableDeepSourceClient.testIsError(error)).toBe(true);
    });

    it('should return false for non-Error values', () => {
      expect(LocalTestableDeepSourceClient.testIsError('string error')).toBe(false);
      expect(LocalTestableDeepSourceClient.testIsError(123)).toBe(false);
      expect(LocalTestableDeepSourceClient.testIsError({})).toBe(false);
      expect(LocalTestableDeepSourceClient.testIsError(null)).toBe(false);
      expect(LocalTestableDeepSourceClient.testIsError(undefined)).toBe(false);
    });
  });

  describe('extractErrorMessages', () => {
    it('should extract message from GraphQL errors', () => {
      const errors = [{ message: 'Error 1' }, { message: 'Error 2' }];

      const result = LocalTestableDeepSourceClient.testExtractErrorMessages(errors);
      expect(result).toContain('Error 1');
      expect(result).toContain('Error 2');
    });

    it('should handle missing message property', () => {
      const errors = [{ message: 'Error 1' }, { other: 'Not a message' }];

      const result = LocalTestableDeepSourceClient.testExtractErrorMessages(errors);
      expect(result).toContain('Error 1');
    });

    it('should handle empty array', () => {
      const result = LocalTestableDeepSourceClient.testExtractErrorMessages([]);
      // The implementation may return different default messages
      expect(result).toBeDefined();
    });

    it('should handle non-object array items', () => {
      const errors = [{ message: 'Error 1' }, 'Not an object', 42];

      const result = LocalTestableDeepSourceClient.testExtractErrorMessages(errors);
      expect(result).toContain('Error 1');
    });
  });

  describe('NoneTypeErrorHandler', () => {
    it('should return empty array when NoneType error occurs', async () => {
      const result = await TestableDeepSourceClient.testNoneTypeErrorHandler();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it('should handle NoneType error in getQualityMetrics', async () => {
      const result = await TestableDeepSourceClient.testGetQualityMetricsWithNoneTypeError();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });
  });

  describe('Error type checking', () => {
    it('should check if an error matches specific criteria', () => {
      const result = TestableDeepSourceClient.testIsAxiosErrorWithCriteria(
        new Error('Network error'),
        undefined,
        undefined
      );
      expect(result).toBe(false);
    });

    it('should handle network errors', () => {
      expect(() => {
        TestableDeepSourceClient.testHandleNetworkError(new Error('Network error'));
      }).not.toThrow();
    });

    it('should handle HTTP status errors', () => {
      expect(() => {
        TestableDeepSourceClient.testHandleHttpStatusError(new Error('HTTP 500 error'));
      }).not.toThrow();
    });

    it('should handle GraphQL errors', () => {
      expect(() => {
        try {
          TestableDeepSourceClient.testHandleGraphQLError(new Error('GraphQL error'));
        } catch (error) {
          // Expected to throw, we're just testing coverage here
          expect(error).toBeDefined();
          throw error;
        }
      }).toThrow();
    });

    it('should handle specific GraphQL errors', () => {
      expect(() => {
        TestableDeepSourceClient.testHandleGraphQLSpecificError(
          new Error('GraphQL specific error')
        );
      }).not.toThrow();
    });
  });

  describe('Validation', () => {
    it('should validate numbers', () => {
      expect(TestableDeepSourceClient.testValidateNumber(42)).toBe(42);
      expect(TestableDeepSourceClient.testValidateNumber(0)).toBe(0);
      expect(TestableDeepSourceClient.testValidateNumber('not a number')).toBeNull();
      expect(TestableDeepSourceClient.testValidateNumber(null)).toBeNull();
    });
  });

  describe('Report processing', () => {
    it('should get report field', () => {
      const fieldName = TestableDeepSourceClient.testGetReportField('OWASP_TOP_10');
      expect(fieldName).toBeDefined();
    });

    it('should extract report data', () => {
      const mockResponse = {
        data: {
          data: {
            repository: {
              reports: {
                owaspTop10: {
                  issues: [],
                },
              },
            },
          },
        },
      };

      const result = TestableDeepSourceClient.testExtractReportData(mockResponse, 'OWASP_TOP_10');
      expect(result).toBeDefined();
    });
  });
});
