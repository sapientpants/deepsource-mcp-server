import { DeepSourceClient } from '../deepsource';
import { jest } from '@jest/globals';

// Import types from metrics.ts
import { MetricDirection } from '../types/metrics';

// We need to access private static methods, so we'll create a way to access them
type MetricHistoryValue = {
  value: number;
  valueDisplay: string;
  threshold: number | null;
  thresholdStatus: string;
  commitOid: string;
  createdAt: string;
};

// Create a test subclass to expose private methods
class TestableDeepSourceClient extends DeepSourceClient {
  static testCalculateTrendDirection(
    values: MetricHistoryValue[],
    positiveDirection: string | MetricDirection
  ): boolean {
    // @ts-expect-error - Accessing private method for testing
    return DeepSourceClient.calculateTrendDirection(values, positiveDirection);
  }

  static testGetReportField(reportType: string): string {
    // @ts-expect-error - Accessing private method for testing
    return DeepSourceClient.getReportField(reportType);
  }

  static testIsAxiosErrorWithCriteria(
    error: unknown,
    statusCode?: number,
    errorCode?: string
  ): boolean {
    // @ts-expect-error - Accessing private method for testing
    return DeepSourceClient.isAxiosErrorWithCriteria(error, statusCode, errorCode);
  }

  static testHandleNetworkError(error: unknown): never | false {
    // @ts-expect-error - Accessing private method for testing
    return DeepSourceClient.handleNetworkError(error);
  }

  static testHandleHttpStatusError(error: unknown): never | false {
    // @ts-expect-error - Accessing private method for testing
    return DeepSourceClient.handleHttpStatusError(error);
  }

  static testHandleGraphQLError(error: unknown): never {
    // @ts-expect-error - Accessing private method for testing
    return DeepSourceClient.handleGraphQLError(error);
  }

  static testHandleGraphQLSpecificError(error: unknown): never | false {
    // @ts-expect-error - Accessing private method for testing
    return DeepSourceClient.handleGraphQLSpecificError(error);
  }
}

describe('DeepSource Internal Utilities', () => {
  describe('calculateTrendDirection', () => {
    it('should return true when there are fewer than 2 values', () => {
      const values: MetricHistoryValue[] = [
        {
          value: 85.5,
          valueDisplay: '85.5%',
          threshold: 80,
          thresholdStatus: 'PASSING',
          commitOid: 'commit1',
          createdAt: '2023-01-01T12:00:00Z',
        },
      ];

      const result = TestableDeepSourceClient.testCalculateTrendDirection(values, 'UPWARD');
      expect(result).toBe(true);
    });

    it('should calculate positive trend for UPWARD direction when value increases', () => {
      const values: MetricHistoryValue[] = [
        {
          value: 75.2,
          valueDisplay: '75.2%',
          threshold: 80,
          thresholdStatus: 'FAILING',
          commitOid: 'commit1',
          createdAt: '2023-01-01T12:00:00Z',
        },
        {
          value: 85.5,
          valueDisplay: '85.5%',
          threshold: 80,
          thresholdStatus: 'PASSING',
          commitOid: 'commit2',
          createdAt: '2023-01-15T12:00:00Z',
        },
      ];

      const result = TestableDeepSourceClient.testCalculateTrendDirection(values, 'UPWARD');
      expect(result).toBe(true);
    });

    it('should calculate negative trend for UPWARD direction when value decreases', () => {
      const values: MetricHistoryValue[] = [
        {
          value: 85.5,
          valueDisplay: '85.5%',
          threshold: 80,
          thresholdStatus: 'PASSING',
          commitOid: 'commit1',
          createdAt: '2023-01-01T12:00:00Z',
        },
        {
          value: 75.2,
          valueDisplay: '75.2%',
          threshold: 80,
          thresholdStatus: 'FAILING',
          commitOid: 'commit2',
          createdAt: '2023-01-15T12:00:00Z',
        },
      ];

      const result = TestableDeepSourceClient.testCalculateTrendDirection(values, 'UPWARD');
      expect(result).toBe(false);
    });

    it('should calculate positive trend for DOWNWARD direction when value decreases', () => {
      const values: MetricHistoryValue[] = [
        {
          value: 12.4,
          valueDisplay: '12.4%',
          threshold: 10,
          thresholdStatus: 'FAILING',
          commitOid: 'commit1',
          createdAt: '2023-01-01T12:00:00Z',
        },
        {
          value: 8.1,
          valueDisplay: '8.1%',
          threshold: 10,
          thresholdStatus: 'PASSING',
          commitOid: 'commit2',
          createdAt: '2023-01-15T12:00:00Z',
        },
      ];

      const result = TestableDeepSourceClient.testCalculateTrendDirection(values, 'DOWNWARD');
      expect(result).toBe(true);
    });

    it('should calculate negative trend for DOWNWARD direction when value increases', () => {
      const values: MetricHistoryValue[] = [
        {
          value: 8.1,
          valueDisplay: '8.1%',
          threshold: 10,
          thresholdStatus: 'PASSING',
          commitOid: 'commit1',
          createdAt: '2023-01-01T12:00:00Z',
        },
        {
          value: 12.4,
          valueDisplay: '12.4%',
          threshold: 10,
          thresholdStatus: 'FAILING',
          commitOid: 'commit2',
          createdAt: '2023-01-15T12:00:00Z',
        },
      ];

      const result = TestableDeepSourceClient.testCalculateTrendDirection(values, 'DOWNWARD');
      expect(result).toBe(false);
    });

    it('should handle string values for positiveDirection', () => {
      const values: MetricHistoryValue[] = [
        {
          value: 75.2,
          valueDisplay: '75.2%',
          threshold: 80,
          thresholdStatus: 'FAILING',
          commitOid: 'commit1',
          createdAt: '2023-01-01T12:00:00Z',
        },
        {
          value: 85.5,
          valueDisplay: '85.5%',
          threshold: 80,
          thresholdStatus: 'PASSING',
          commitOid: 'commit2',
          createdAt: '2023-01-15T12:00:00Z',
        },
      ];

      // Test with string value 'UPWARD'
      const resultUpward = TestableDeepSourceClient.testCalculateTrendDirection(values, 'UPWARD');
      expect(resultUpward).toBe(true);

      // Test with string value 'DOWNWARD'
      const resultDownward = TestableDeepSourceClient.testCalculateTrendDirection(
        values,
        'DOWNWARD'
      );
      expect(resultDownward).toBe(false);
    });

    it('should handle no change in value', () => {
      const values: MetricHistoryValue[] = [
        {
          value: 85.5,
          valueDisplay: '85.5%',
          threshold: 80,
          thresholdStatus: 'PASSING',
          commitOid: 'commit1',
          createdAt: '2023-01-01T12:00:00Z',
        },
        {
          value: 85.5,
          valueDisplay: '85.5%',
          threshold: 80,
          thresholdStatus: 'PASSING',
          commitOid: 'commit2',
          createdAt: '2023-01-15T12:00:00Z',
        },
      ];

      // For UPWARD, no change should be considered positive
      const resultUpward = TestableDeepSourceClient.testCalculateTrendDirection(values, 'UPWARD');
      expect(resultUpward).toBe(true);

      // For DOWNWARD, no change should be considered positive
      const resultDownward = TestableDeepSourceClient.testCalculateTrendDirection(
        values,
        'DOWNWARD'
      );
      expect(resultDownward).toBe(true);
    });
  });

  describe('getReportField', () => {
    it('should return the correct field name for OWASP_TOP_10', () => {
      const result = TestableDeepSourceClient.testGetReportField('OWASP_TOP_10');
      expect(result).toBe('owaspTop10');
    });

    it('should return the correct field name for SANS_TOP_25', () => {
      const result = TestableDeepSourceClient.testGetReportField('SANS_TOP_25');
      expect(result).toBe('sansTop25');
    });

    it('should return the correct field name for MISRA_C', () => {
      const result = TestableDeepSourceClient.testGetReportField('MISRA_C');
      expect(result).toBe('misraC');
    });

    it('should return the correct field name for other report types', () => {
      const result = TestableDeepSourceClient.testGetReportField('CODE_COVERAGE');
      expect(result).toBe('codeCoverage');
    });
  });

  describe('isAxiosErrorWithCriteria', () => {
    it('should return false for null error', () => {
      const result = TestableDeepSourceClient.testIsAxiosErrorWithCriteria(null);
      expect(result).toBe(false);
    });

    it('should return false for undefined error', () => {
      const result = TestableDeepSourceClient.testIsAxiosErrorWithCriteria(undefined);
      expect(result).toBe(false);
    });

    it('should return false for non-object errors', () => {
      expect(TestableDeepSourceClient.testIsAxiosErrorWithCriteria('string error')).toBe(false);
      expect(TestableDeepSourceClient.testIsAxiosErrorWithCriteria(123)).toBe(false);
      expect(TestableDeepSourceClient.testIsAxiosErrorWithCriteria(true)).toBe(false);
    });

    it('should return false for empty object', () => {
      const result = TestableDeepSourceClient.testIsAxiosErrorWithCriteria({});
      expect(result).toBe(false);
    });

    it('should return true for axios error with isAxiosError property', () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 400,
          data: {},
        },
        code: 'ECONNREFUSED',
      };
      const result = TestableDeepSourceClient.testIsAxiosErrorWithCriteria(axiosError);
      expect(result).toBe(true);
    });

    it('should filter by status code when provided', () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 404,
          data: {},
        },
      };

      expect(TestableDeepSourceClient.testIsAxiosErrorWithCriteria(axiosError, 404)).toBe(true);
      expect(TestableDeepSourceClient.testIsAxiosErrorWithCriteria(axiosError, 500)).toBe(false);
    });

    it('should filter by error code when provided', () => {
      const axiosError = {
        isAxiosError: true,
        code: 'ECONNREFUSED',
      };

      expect(
        TestableDeepSourceClient.testIsAxiosErrorWithCriteria(axiosError, undefined, 'ECONNREFUSED')
      ).toBe(true);
      expect(
        TestableDeepSourceClient.testIsAxiosErrorWithCriteria(axiosError, undefined, 'TIMEOUT')
      ).toBe(false);
    });

    it('should filter by both status code and error code when provided', () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 400,
          data: {},
        },
        code: 'ECONNREFUSED',
      };

      expect(
        TestableDeepSourceClient.testIsAxiosErrorWithCriteria(axiosError, 400, 'ECONNREFUSED')
      ).toBe(true);
      expect(
        TestableDeepSourceClient.testIsAxiosErrorWithCriteria(axiosError, 400, 'TIMEOUT')
      ).toBe(false);
      expect(
        TestableDeepSourceClient.testIsAxiosErrorWithCriteria(axiosError, 500, 'ECONNREFUSED')
      ).toBe(false);
    });
  });

  describe('handleNetworkError', () => {
    it('should throw connection error for ECONNREFUSED', () => {
      const axiosError = {
        isAxiosError: true,
        code: 'ECONNREFUSED',
        message: 'connect ECONNREFUSED',
      };

      expect(() => TestableDeepSourceClient.testHandleNetworkError(axiosError)).toThrow(
        'Connection error: Unable to connect to DeepSource API'
      );
    });

    it('should throw timeout error for ETIMEDOUT', () => {
      const axiosError = {
        isAxiosError: true,
        code: 'ETIMEDOUT',
        message: 'connect ETIMEDOUT',
      };

      expect(() => TestableDeepSourceClient.testHandleNetworkError(axiosError)).toThrow(
        'Timeout error: DeepSource API request timed out'
      );
    });

    it('should return false for non-network errors', () => {
      const axiosError = {
        isAxiosError: true,
        code: 'ENOTFOUND',
        message: 'connect ENOTFOUND',
      };

      const result = TestableDeepSourceClient.testHandleNetworkError(axiosError);
      expect(result).toBe(false);
    });

    it('should return false for non-axios errors', () => {
      const regularError = new Error('Regular error');

      const result = TestableDeepSourceClient.testHandleNetworkError(regularError);
      expect(result).toBe(false);
    });

    it('should return false for null error', () => {
      const result = TestableDeepSourceClient.testHandleNetworkError(null);
      expect(result).toBe(false);
    });
  });

  describe('handleHttpStatusError', () => {
    it('should throw authentication error for 401', () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 401,
          data: {},
        },
      };

      expect(() => TestableDeepSourceClient.testHandleHttpStatusError(axiosError)).toThrow(
        'Authentication error: Invalid or expired API key'
      );
    });

    it('should throw rate limit error for 429', () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 429,
          data: {},
        },
      };

      expect(() => TestableDeepSourceClient.testHandleHttpStatusError(axiosError)).toThrow(
        'Rate limit exceeded: Too many requests to DeepSource API'
      );
    });

    it('should throw not found error for 404', () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 404,
          data: {},
        },
      };

      expect(() => TestableDeepSourceClient.testHandleHttpStatusError(axiosError)).toThrow(
        'Not found (404): The requested resource was not found'
      );
    });

    it('should throw server error for 500+', () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 500,
          data: {},
        },
      };

      expect(() => TestableDeepSourceClient.testHandleHttpStatusError(axiosError)).toThrow(
        'Server error (500): DeepSource API server error'
      );

      const error503 = {
        isAxiosError: true,
        response: {
          status: 503,
          data: {},
        },
      };

      expect(() => TestableDeepSourceClient.testHandleHttpStatusError(error503)).toThrow(
        'Server error (503): DeepSource API server error'
      );
    });

    it('should throw client error for 400-499 range', () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 403,
          data: {},
          statusText: 'Forbidden',
        },
      };

      expect(() => TestableDeepSourceClient.testHandleHttpStatusError(axiosError)).toThrow(
        'Client error (403): Forbidden'
      );
    });

    it('should return false for non-http-status errors', () => {
      const axiosError = {
        isAxiosError: true,
        code: 'ENOTFOUND',
      };

      const result = TestableDeepSourceClient.testHandleHttpStatusError(axiosError);
      expect(result).toBe(false);
    });

    it('should return false for non-axios errors', () => {
      const regularError = new Error('Regular error');

      const result = TestableDeepSourceClient.testHandleHttpStatusError(regularError);
      expect(result).toBe(false);
    });
  });

  describe('handleGraphQLError', () => {
    // Mock implementations for sub-handlers to simulate different behaviors
    let originalGraphQLHandler: any;
    let originalNetworkHandler: any;
    let originalHttpStatusHandler: any;

    beforeEach(() => {
      // Store original handlers
      // @ts-expect-error - Accessing private static method for testing
      originalGraphQLHandler = DeepSourceClient.handleGraphQLSpecificError;
      // @ts-expect-error - Accessing private static method for testing
      originalNetworkHandler = DeepSourceClient.handleNetworkError;
      // @ts-expect-error - Accessing private static method for testing
      originalHttpStatusHandler = DeepSourceClient.handleHttpStatusError;
    });

    afterEach(() => {
      // Restore original handlers
      // @ts-expect-error - Accessing private static method for testing
      DeepSourceClient.handleGraphQLSpecificError = originalGraphQLHandler;
      // @ts-expect-error - Accessing private static method for testing
      DeepSourceClient.handleNetworkError = originalNetworkHandler;
      // @ts-expect-error - Accessing private static method for testing
      DeepSourceClient.handleHttpStatusError = originalHttpStatusHandler;
    });

    it('should throw error for GraphQL specific error', () => {
      // Create a situation where GraphQL handler returns true instead of throwing
      // This would trigger the unreachable code at line 811
      // @ts-expect-error - Accessing private static method for testing
      DeepSourceClient.handleGraphQLSpecificError = jest.fn().mockReturnValue(true);

      const error = new Error('Test GraphQL error');

      expect(() => TestableDeepSourceClient.testHandleGraphQLError(error)).toThrow(
        'Unreachable code - handleGraphQLSpecificError should have thrown'
      );
    });

    it('should throw error for network error', () => {
      // Create a situation where GraphQL handler returns false (no error handled)
      // but Network handler returns true instead of throwing
      // This would trigger the unreachable code at line 815
      // @ts-expect-error - Accessing private static method for testing
      DeepSourceClient.handleGraphQLSpecificError = jest.fn().mockReturnValue(false);
      // @ts-expect-error - Accessing private static method for testing
      DeepSourceClient.handleNetworkError = jest.fn().mockReturnValue(true);

      const error = new Error('Test network error');

      expect(() => TestableDeepSourceClient.testHandleGraphQLError(error)).toThrow(
        'Unreachable code - handleNetworkError should have thrown'
      );
    });

    it('should throw error for HTTP status error', () => {
      // Create a situation where GraphQL and Network handlers return false
      // but HTTP Status handler returns true instead of throwing
      // This would trigger the unreachable code at line 819
      // @ts-expect-error - Accessing private static method for testing
      DeepSourceClient.handleGraphQLSpecificError = jest.fn().mockReturnValue(false);
      // @ts-expect-error - Accessing private static method for testing
      DeepSourceClient.handleNetworkError = jest.fn().mockReturnValue(false);
      // @ts-expect-error - Accessing private static method for testing
      DeepSourceClient.handleHttpStatusError = jest.fn().mockReturnValue(true);

      const error = new Error('Test HTTP status error');

      expect(() => TestableDeepSourceClient.testHandleGraphQLError(error)).toThrow(
        'Unreachable code - handleHttpStatusError should have thrown'
      );
    });

    it('should throw classified error for standard Error objects', () => {
      // All handlers return false, but the error is a standard Error
      // @ts-expect-error - Accessing private static method for testing
      DeepSourceClient.handleGraphQLSpecificError = jest.fn().mockReturnValue(false);
      // @ts-expect-error - Accessing private static method for testing
      DeepSourceClient.handleNetworkError = jest.fn().mockReturnValue(false);
      // @ts-expect-error - Accessing private static method for testing
      DeepSourceClient.handleHttpStatusError = jest.fn().mockReturnValue(false);

      const error = new Error('Standard Error');

      expect(() => TestableDeepSourceClient.testHandleGraphQLError(error)).toThrow(
        'DeepSource API error: Standard Error'
      );
    });

    it('should throw generic error for non-Error objects', () => {
      // All handlers return false, and the "error" is not an Error object
      // This would trigger line 829
      // @ts-expect-error - Accessing private static method for testing
      DeepSourceClient.handleGraphQLSpecificError = jest.fn().mockReturnValue(false);
      // @ts-expect-error - Accessing private static method for testing
      DeepSourceClient.handleNetworkError = jest.fn().mockReturnValue(false);
      // @ts-expect-error - Accessing private static method for testing
      DeepSourceClient.handleHttpStatusError = jest.fn().mockReturnValue(false);

      const nonError = {}; // A non-Error object without a message property

      expect(() => TestableDeepSourceClient.testHandleGraphQLError(nonError)).toThrow(
        'Unknown error occurred while communicating with DeepSource API'
      );
    });
  });
});
