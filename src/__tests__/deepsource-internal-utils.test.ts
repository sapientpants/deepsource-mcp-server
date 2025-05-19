import { DeepSourceClient } from '../deepsource';

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
});
