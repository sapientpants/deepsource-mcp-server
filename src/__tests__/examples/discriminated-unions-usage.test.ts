import { describe, it, expect } from '@jest/globals';
import { ErrorCategory } from '../../utils/errors/categories';
import { MetricThresholdStatus } from '../../types/metrics';
import { ReportType } from '../../deepsource';
import {
  handleApiError,
  handleApiErrorWithTypeGuards,
  processApiResponse,
  getRunStatusMessage,
  processRun,
  getMetricStatusMessage,
  processMetric,
  getReportSummary,
  processReport,
} from '../../examples/discriminated-unions-usage';

// Not using asAny in this simplified test file (remove eslint error)

describe('Discriminated Unions Usage Examples', () => {
  describe('handleApiError', () => {
    it('should handle AUTH errors', () => {
      const error = { category: ErrorCategory.AUTH, message: 'Invalid API key' };
      expect(handleApiError(error)).toBe(
        'Authentication error: Invalid API key. Please check your API key.'
      );
    });

    it('should handle NETWORK errors', () => {
      const error = { category: ErrorCategory.NETWORK, message: 'Connection failed' };
      expect(handleApiError(error)).toBe(
        'Network error: Connection failed. Please check your internet connection.'
      );
    });

    it('should handle TIMEOUT errors', () => {
      const error = { category: ErrorCategory.TIMEOUT, message: 'Request timed out' };
      expect(handleApiError(error)).toBe(
        'Timeout error: Request timed out. The request took too long to complete.'
      );
    });

    it('should handle RATE_LIMIT errors', () => {
      const error = {
        category: ErrorCategory.RATE_LIMIT,
        message: 'Too many requests',
        resetAt: '2023-01-01T12:00:00Z',
      };
      expect(handleApiError(error)).toContain(
        'Rate limit exceeded: Too many requests. Try again after'
      );
    });

    it('should handle NOT_FOUND errors', () => {
      const error = {
        category: ErrorCategory.NOT_FOUND,
        message: 'Resource not found',
        resource: 'Project',
        identifier: 'test-123',
      };
      expect(handleApiError(error)).toBe('Resource not found: Project with identifier test-123.');
    });

    it('should handle default case for other errors', () => {
      const error = { category: ErrorCategory.OTHER, message: 'Unknown error' };
      expect(handleApiError(error)).toBe('Error: Unknown error');
    });
  });

  describe('handleApiErrorWithTypeGuards', () => {
    it('should handle AUTH errors', () => {
      const error = {
        category: ErrorCategory.AUTH,
        message: 'Invalid API key',
        token: { present: false },
      };
      expect(handleApiErrorWithTypeGuards(error)).toBe(
        'Authentication error: Invalid API key. Token present: false.'
      );
    });

    it('should handle NETWORK errors', () => {
      const error = {
        category: ErrorCategory.NETWORK,
        message: 'Connection failed',
        url: 'https://api.example.com',
      };
      expect(handleApiErrorWithTypeGuards(error)).toBe(
        'Network error: Connection failed. URL: https://api.example.com.'
      );
    });

    it('should handle SERVER errors', () => {
      const error = {
        category: ErrorCategory.SERVER,
        message: 'Internal server error',
        statusCode: 500,
      };
      expect(handleApiErrorWithTypeGuards(error)).toBe(
        'Server error: Internal server error. Status code: 500.'
      );
    });

    it('should handle default case for other errors', () => {
      const error = { category: ErrorCategory.OTHER, message: 'Unknown error' };
      expect(handleApiErrorWithTypeGuards(error)).toBe('Error: Unknown error');
    });
  });

  describe('getRunStatusMessage', () => {
    it('should handle PENDING runs', () => {
      const run = { status: 'PENDING', runId: 'run-123', queuePosition: 5 };
      expect(getRunStatusMessage(run)).toBe('Run run-123 is pending. Queue position: 5.');
    });

    it('should handle READY runs', () => {
      const run = { status: 'READY', runId: 'run-123', progress: 50 };
      expect(getRunStatusMessage(run)).toBe('Run run-123 is in progress. Progress: 50%.');
    });

    it('should handle SUCCESS runs', () => {
      const run = {
        status: 'SUCCESS',
        runId: 'run-123',
        summary: { occurrencesIntroduced: 5, occurrencesResolved: 3 },
      };
      expect(getRunStatusMessage(run)).toBe(
        'Run run-123 completed successfully. 5 issues introduced, 3 issues resolved.'
      );
    });

    it('should handle FAILURE runs', () => {
      const run = {
        status: 'FAILURE',
        runId: 'run-123',
        error: { message: 'Analysis failed' },
      };
      expect(getRunStatusMessage(run)).toBe('Run run-123 failed. Error: Analysis failed.');
    });

    it('should handle TIMEOUT runs with partial results', () => {
      const run = {
        status: 'TIMEOUT',
        runId: 'run-123',
        timeout: { partialResultsAvailable: true },
      };
      expect(getRunStatusMessage(run)).toBe(
        'Run run-123 timed out. Partial results are available.'
      );
    });

    it('should handle CANCEL runs', () => {
      const run = {
        status: 'CANCEL',
        runId: 'run-123',
        cancellationReason: 'User requested',
      };
      expect(getRunStatusMessage(run)).toBe('Run run-123 was cancelled. Reason: User requested.');
    });

    it('should handle SKIPPED runs', () => {
      const run = {
        status: 'SKIPPED',
        runId: 'run-123',
        skipReason: 'No changes detected',
      };
      expect(getRunStatusMessage(run)).toBe(
        'Run run-123 was skipped. Reason: No changes detected.'
      );
    });

    it('should handle unknown status runs', () => {
      // @ts-expect-error - Testing runtime behavior with invalid input
      const run = {
        status: 'UNKNOWN_STATUS',
        runId: 'run-123',
      };
      expect(getRunStatusMessage(run)).toBe('Run run-123 has an unknown status: UNKNOWN_STATUS.');
    });
  });

  describe('getMetricStatusMessage', () => {
    it('should handle PASSING metrics', () => {
      const metric = {
        status: MetricThresholdStatus.PASSING,
        name: 'Line Coverage',
        value: 85,
        unit: '%',
        threshold: 80,
      };
      expect(getMetricStatusMessage(metric)).toBe(
        'Line Coverage is passing. Value: 85% (threshold: 80%).'
      );
    });

    it('should handle FAILING metrics', () => {
      const metric = {
        status: MetricThresholdStatus.FAILING,
        name: 'Line Coverage',
        value: 75,
        unit: '%',
        threshold: 80,
      };
      expect(getMetricStatusMessage(metric)).toBe(
        'Line Coverage is failing. Value: 75% (threshold: 80%).'
      );
    });

    it('should handle UNKNOWN metrics', () => {
      const metric = {
        status: MetricThresholdStatus.UNKNOWN,
        name: 'Line Coverage',
        value: 85,
        unit: '%',
      };
      expect(getMetricStatusMessage(metric)).toBe('Line Coverage status is unknown. Value: 85%.');
    });

    it('should handle unrecognized status metrics', () => {
      // @ts-expect-error - Testing runtime behavior with invalid input
      const metric = {
        status: 'UNRECOGNIZED_STATUS',
        name: 'Line Coverage',
        value: 85,
        unit: '%',
      };
      expect(getMetricStatusMessage(metric)).toBe(
        'Line Coverage has an unrecognized status: UNRECOGNIZED_STATUS.'
      );
    });
  });

  describe('processApiResponse', () => {
    it('should return data for successful responses', () => {
      const successResponse = {
        success: true,
        status: 'success',
        data: { result: 'Test data' },
        error: undefined,
      };
      const result = processApiResponse(successResponse);
      expect(result).toEqual({ result: 'Test data' });
    });

    it('should handle error responses', () => {
      const errorResponse = {
        success: false,
        status: 'error',
        error: {
          category: ErrorCategory.AUTH,
          message: 'Invalid API key',
        },
      };
      const result = processApiResponse(errorResponse);
      expect(result).toBe('Authentication error: Invalid API key. Please check your API key.');
    });
  });

  describe('processRun', () => {
    it('should handle SUCCESS runs', () => {
      const successfulRun = {
        status: 'SUCCESS',
        runId: 'run-123',
        finishedAt: '2023-01-01T12:00:00Z',
        summary: { occurrencesIntroduced: 5, occurrencesResolved: 3 },
      };
      const result = processRun(successfulRun);
      expect(result).toContain('Run run-123 completed at');
      expect(result).toContain('5 issues introduced');
      expect(result).toContain('3 issues resolved');
    });

    it('should handle FAILURE runs', () => {
      const failedRun = {
        status: 'FAILURE',
        runId: 'run-123',
        finishedAt: '2023-01-01T12:00:00Z',
        error: { message: 'Analysis failed' },
      };
      const result = processRun(failedRun);
      expect(result).toContain('Run run-123 failed at');
      expect(result).toContain('Error: Analysis failed');
    });

    it('should fallback to getRunStatusMessage for other run states', () => {
      const pendingRun = {
        status: 'PENDING',
        runId: 'run-123',
        queuePosition: 5,
      };
      const result = processRun(pendingRun);
      expect(result).toBe('Run run-123 is pending. Queue position: 5.');
    });
  });

  describe('processMetric', () => {
    it('should handle PASSING metrics', () => {
      const passingMetric = {
        status: MetricThresholdStatus.PASSING,
        name: 'Line Coverage',
        value: 85,
        unit: '%',
        threshold: 80,
        margin: 5,
      };
      const result = processMetric(passingMetric);
      expect(result).toContain('Line Coverage is passing');
      expect(result).toContain('Value: 85%');
      expect(result).toContain('Exceeds threshold by 5%');
    });

    it('should handle FAILING metrics', () => {
      const failingMetric = {
        status: MetricThresholdStatus.FAILING,
        name: 'Line Coverage',
        value: 75,
        unit: '%',
        threshold: 80,
        gap: 5,
        recommendations: ['Add more tests', 'Focus on uncovered areas'],
      };
      const result = processMetric(failingMetric);
      expect(result).toContain('Line Coverage is failing');
      expect(result).toContain('Value: 75%');
      expect(result).toContain('Falls short by 5%');
      expect(result).toContain('Recommendations: Add more tests, Focus on uncovered areas');
    });

    it('should fallback to getMetricStatusMessage for other metric states', () => {
      const unknownMetric = {
        status: MetricThresholdStatus.UNKNOWN,
        name: 'Line Coverage',
        value: 85,
        unit: '%',
      };
      const result = processMetric(unknownMetric);
      expect(result).toBe('Line Coverage status is unknown. Value: 85%.');
    });
  });

  describe('getReportSummary', () => {
    it('should handle OWASP_TOP_10 reports', () => {
      const report = {
        type: ReportType.OWASP_TOP_10,
        currentValue: 85,
        status: 'PASSING',
        categories: [{ name: 'A1', issues: { total: 5 } }],
      };
      const result = getReportSummary(report);
      expect(result).toContain('OWASP Top 10 compliance: 85%');
      expect(result).toContain('Status: PASSING');
      expect(result).toContain('Issues found in 1 categories');
    });

    it('should handle SANS_TOP_25 reports', () => {
      const report = {
        type: ReportType.SANS_TOP_25,
        currentValue: 90,
        status: 'PASSING',
        categories: [{ name: 'S1', issues: { total: 3 } }],
      };
      const result = getReportSummary(report);
      expect(result).toContain('SANS Top 25 compliance: 90%');
      expect(result).toContain('Status: PASSING');
      expect(result).toContain('Issues found in 1 categories');
    });

    it('should handle MISRA_C reports', () => {
      const report = {
        type: ReportType.MISRA_C,
        currentValue: 70,
        status: 'FAILING',
        categories: [{ name: 'M1', issues: { total: 10 } }],
      };
      const result = getReportSummary(report);
      expect(result).toContain('MISRA-C compliance: 70%');
      expect(result).toContain('Status: FAILING');
      expect(result).toContain('Violations found in 1 categories');
    });

    it('should handle CODE_COVERAGE reports', () => {
      const report = {
        type: ReportType.CODE_COVERAGE,
        currentValue: 85,
        status: 'PASSING',
        coverage: { line: 85, branch: 70, function: 90 },
      };
      const result = getReportSummary(report);
      expect(result).toContain('Code coverage: 85%');
      expect(result).toContain('Status: PASSING');
      expect(result).toContain('Line coverage: 85%');
    });

    it('should handle ISSUES_PREVENTED reports', () => {
      const report = {
        type: ReportType.ISSUES_PREVENTED,
        currentValue: 95,
        status: 'PASSING',
        prevented: { total: 120 },
        preventionRate: 95,
      };
      const result = getReportSummary(report);
      expect(result).toContain('Issues prevented: 120');
      expect(result).toContain('Status: PASSING');
      expect(result).toContain('Prevention rate: 95%');
    });

    it('should handle unknown report types', () => {
      const report = {
        type: 'UNKNOWN_TYPE',
        status: 'UNKNOWN',
        currentValue: 50,
      };
      const result = getReportSummary(report);
      expect(result).toContain('Unknown report type: UNKNOWN_TYPE');
      expect(result).toContain('Status: UNKNOWN');
      expect(result).toContain('Value: 50%');
    });
  });

  describe('processReport', () => {
    it('should handle OWASP_TOP_10 reports', () => {
      const owaspReport = {
        type: ReportType.OWASP_TOP_10,
        currentValue: 85,
        status: 'PASSING',
        categories: [
          { name: 'A1', issues: { total: 5 } },
          { name: 'A2', issues: { total: 0 } },
        ],
      };
      const result = processReport(owaspReport);
      expect(result).toContain('OWASP Top 10 compliance: 85%');
      expect(result).toContain('Status: PASSING');
      expect(result).toContain('Issues found in 1 of 2 categories');
    });

    it('should handle CODE_COVERAGE reports', () => {
      const coverageReport = {
        type: ReportType.CODE_COVERAGE,
        currentValue: 85,
        status: 'PASSING',
        coverage: { line: 85, branch: 70, function: 90 },
      };
      const result = processReport(coverageReport);
      expect(result).toContain('Code coverage: 85%');
      expect(result).toContain('Status: PASSING');
      expect(result).toContain('Line: 85%');
      expect(result).toContain('Branch: 70%');
      expect(result).toContain('Function: 90%');
    });

    it('should fallback to getReportSummary for other report types', () => {
      const sansReport = {
        type: ReportType.SANS_TOP_25,
        currentValue: 90,
        status: 'PASSING',
        categories: [{ name: 'S1', issues: { total: 3 } }],
      };
      const result = processReport(sansReport);
      expect(result).toContain('SANS Top 25 compliance: 90%');
      expect(result).toContain('Status: PASSING');
      expect(result).toContain('Issues found in 1 categories');
    });
  });
});
