/**
 * @jest-environment node
 */

import { jest } from '@jest/globals';
import { ErrorCategory } from '../utils/errors/categories.js';
import { MetricThresholdStatus } from '../types/metrics.js';
import { ReportType } from '../deepsource.js';
import {
  AuthError,
  NetworkError,
  ServerError,
  ClientError,
  ApiResponse,
  SuccessResponse,
  ErrorResponse,
  PendingRun,
  RunningRun,
  SuccessfulRun,
  FailedRun,
  TimedOutRun,
  CancelledRun,
  SkippedRun,
  RunState,
  OwaspTop10Report,
  SansTop25Report,
  CodeCoverageReport,
  IssuesPreventedReport,
  ComplianceReport,
  PassingMetric,
  FailingMetric,
  MetricState,
  isErrorOfCategory,
  isSuccessResponse,
  isRunInState,
  isReportOfType,
  isMetricInState,
} from '../types/discriminated-unions.js';
import { asRunId, asBranchName, asCommitOid } from '../types/branded.js';

describe('Discriminated Unions', () => {
  const runId = asRunId('run-123');
  const commitOid = asCommitOid('abcdef123456');
  const branchName = asBranchName('main');

  describe('ApiError Union', () => {
    it('should create different error types with correct discriminants', () => {
      // Auth error
      const authError: AuthError = {
        category: ErrorCategory.AUTH,
        message: 'Invalid API key',
        token: {
          present: true,
          expired: true,
        },
      };

      // Network error
      const networkError: NetworkError = {
        category: ErrorCategory.NETWORK,
        message: 'Connection failed',
        url: 'https://api.deepsource.io',
        connection: {
          established: false,
          timeSpent: 5000,
        },
      };

      // Server error
      const serverError: ServerError = {
        category: ErrorCategory.SERVER,
        message: 'Internal server error',
        statusCode: 500,
        response: { error: 'unexpected error' },
      };

      expect(authError.category).toBe(ErrorCategory.AUTH);
      expect(networkError.category).toBe(ErrorCategory.NETWORK);
      expect(serverError.category).toBe(ErrorCategory.SERVER);

      // Type guard should correctly identify error categories
      expect(isErrorOfCategory(authError, ErrorCategory.AUTH)).toBe(true);
      expect(isErrorOfCategory(networkError, ErrorCategory.AUTH)).toBe(false);
      expect(isErrorOfCategory(serverError, ErrorCategory.SERVER)).toBe(true);
    });

    it('should handle errors with metadata', () => {
      const errorWithMetadata: ClientError = {
        category: ErrorCategory.CLIENT,
        message: 'Validation failed',
        statusCode: 400,
        metadata: {
          requestId: '1234',
          timestamp: new Date().toISOString(),
        },
        validationErrors: {
          field1: 'Required field',
          field2: 'Invalid format',
        },
      };

      expect(errorWithMetadata.metadata).toBeDefined();
      expect(errorWithMetadata.validationErrors).toBeDefined();
      expect(errorWithMetadata.validationErrors?.field1).toBe('Required field');
    });
  });

  describe('ApiResponse Union', () => {
    it('should handle successful responses', () => {
      const successResponse: SuccessResponse<string> = {
        success: true,
        data: 'Response data',
      };

      expect(isSuccessResponse(successResponse)).toBe(true);
      expect(successResponse.data).toBe('Response data');
    });

    it('should handle error responses', () => {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          category: ErrorCategory.SERVER,
          message: 'Server error occurred',
        },
      };

      expect(isSuccessResponse(errorResponse)).toBe(false);
      expect(errorResponse.error.message).toBe('Server error occurred');
    });

    it('should discriminate based on success property', () => {
      const handleResponse = (response: ApiResponse<string>): string => {
        if (isSuccessResponse(response)) {
          return `Success: ${response.data}`;
        } else {
          return `Error: ${response.error.message}`;
        }
      };

      const successResponse: SuccessResponse<string> = {
        success: true,
        data: 'Data received',
      };

      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          category: ErrorCategory.NOT_FOUND,
          message: 'Resource not found',
        },
      };

      expect(handleResponse(successResponse)).toBe('Success: Data received');
      expect(handleResponse(errorResponse)).toBe('Error: Resource not found');
    });
  });

  describe('RunState Union', () => {
    it('should create different run states with correct discriminants', () => {
      // Pending run
      const pendingRun: PendingRun = {
        status: 'PENDING',
        runId,
        commitOid,
        branchName,
        baseOid: commitOid,
        createdAt: '2023-05-20T10:00:00Z',
        updatedAt: '2023-05-20T10:00:00Z',
        queuePosition: 3,
        estimatedStartTime: '2023-05-20T10:05:00Z',
      };

      // Running run
      const runningRun: RunningRun = {
        status: 'READY',
        runId,
        commitOid,
        branchName,
        baseOid: commitOid,
        createdAt: '2023-05-20T10:00:00Z',
        updatedAt: '2023-05-20T10:05:00Z',
        progress: 45,
        currentStage: 'analyzing',
        estimatedCompletionTime: '2023-05-20T10:15:00Z',
      };

      // Successful run
      const successfulRun: SuccessfulRun = {
        status: 'SUCCESS',
        runId,
        commitOid,
        branchName,
        baseOid: commitOid,
        createdAt: '2023-05-20T10:00:00Z',
        updatedAt: '2023-05-20T10:15:00Z',
        finishedAt: '2023-05-20T10:15:00Z',
        summary: {
          occurrencesIntroduced: 5,
          occurrencesResolved: 10,
          occurrencesSuppressed: 2,
          analyzerDistribution: [
            { analyzer: 'python', count: 3 },
            { analyzer: 'javascript', count: 2 },
          ],
          categoryDistribution: [
            { category: 'security', count: 1 },
            { category: 'maintainability', count: 4 },
          ],
        },
      };

      expect(pendingRun.status).toBe('PENDING');
      expect(runningRun.status).toBe('READY');
      expect(successfulRun.status).toBe('SUCCESS');

      // Type guard should correctly identify run states
      expect(isRunInState<PendingRun>(pendingRun, 'PENDING')).toBe(true);
      expect(isRunInState<RunningRun>(runningRun, 'READY')).toBe(true);
      expect(isRunInState<SuccessfulRun>(successfulRun, 'SUCCESS')).toBe(true);
      expect(isRunInState<FailedRun>(successfulRun, 'FAILURE')).toBe(false);
    });

    it('should handle run state specific properties', () => {
      // Function that returns different messages based on run state
      const getRunMessage = (run: RunState): string => {
        switch (run.status) {
          case 'PENDING':
            return `Run ${run.runId} is pending in position ${(run as PendingRun).queuePosition || 'unknown'}`;
          case 'READY':
            return `Run ${run.runId} is in progress (${(run as RunningRun).progress || 0}% complete)`;
          case 'SUCCESS':
            return `Run ${run.runId} succeeded with ${(run as SuccessfulRun).summary.occurrencesIntroduced} new issues`;
          case 'FAILURE':
            return `Run ${run.runId} failed: ${(run as FailedRun).error?.message || 'Unknown error'}`;
          case 'TIMEOUT':
            return `Run ${run.runId} timed out after ${(run as TimedOutRun).timeout?.limitSeconds || 'unknown'} seconds`;
          case 'CANCEL':
            return `Run ${run.runId} was cancelled by ${(run as CancelledRun).cancelledBy || 'unknown'}`;
          case 'SKIPPED':
            return `Run ${run.runId} was skipped: ${(run as SkippedRun).skipReason || 'No reason provided'}`;
        }
      };

      const pendingRun: PendingRun = {
        status: 'PENDING',
        runId,
        commitOid,
        branchName,
        baseOid: commitOid,
        createdAt: '2023-05-20T10:00:00Z',
        updatedAt: '2023-05-20T10:00:00Z',
        queuePosition: 3,
      };

      const failedRun: FailedRun = {
        status: 'FAILURE',
        runId,
        commitOid,
        branchName,
        baseOid: commitOid,
        createdAt: '2023-05-20T10:00:00Z',
        updatedAt: '2023-05-20T10:05:00Z',
        finishedAt: '2023-05-20T10:05:00Z',
        error: {
          message: 'Permission denied',
          code: 'ACCESS_DENIED',
        },
      };

      expect(getRunMessage(pendingRun)).toBe('Run run-123 is pending in position 3');
      expect(getRunMessage(failedRun)).toBe('Run run-123 failed: Permission denied');
    });
  });

  describe('ComplianceReport Union', () => {
    it('should create different report types with correct discriminants', () => {
      // OWASP report
      const owaspReport: OwaspTop10Report = {
        type: ReportType.OWASP_TOP_10,
        title: 'OWASP Top 10',
        currentValue: 85,
        status: 'PASSING',
        categories: [
          {
            key: 'A01:2021',
            title: 'Broken Access Control',
            issues: {
              critical: 0,
              major: 2,
              minor: 1,
              total: 3,
            },
          },
          {
            key: 'A02:2021',
            title: 'Cryptographic Failures',
            issues: {
              critical: 1,
              major: 0,
              minor: 0,
              total: 1,
            },
          },
        ],
      };

      // Code coverage report
      const coverageReport: CodeCoverageReport = {
        type: ReportType.CODE_COVERAGE,
        title: 'Code Coverage',
        currentValue: 78.5,
        status: 'PASSING',
        coverage: {
          line: 80.2,
          branch: 75.6,
          statement: 81.3,
          function: 90.0,
        },
        trend: [
          { date: '2023-04-20', value: 75.0 },
          { date: '2023-05-01', value: 76.2 },
          { date: '2023-05-15', value: 78.5 },
        ],
      };

      expect(owaspReport.type).toBe(ReportType.OWASP_TOP_10);
      expect(coverageReport.type).toBe(ReportType.CODE_COVERAGE);

      // Type guard should correctly identify report types
      expect(isReportOfType<OwaspTop10Report>(owaspReport, ReportType.OWASP_TOP_10)).toBe(true);
      expect(isReportOfType<CodeCoverageReport>(coverageReport, ReportType.CODE_COVERAGE)).toBe(
        true
      );
      expect(isReportOfType<SansTop25Report>(owaspReport, ReportType.SANS_TOP_25)).toBe(false);
    });

    it('should handle report-specific properties', () => {
      // Function that processes report based on type
      const getReportSummary = (report: ComplianceReport): string => {
        let result;
        switch (report.type) {
          case ReportType.OWASP_TOP_10:
            result = `OWASP compliance: ${report.currentValue}%, issues in ${(report as OwaspTop10Report).categories.length} categories`;
            break;
          case ReportType.SANS_TOP_25:
            result = `SANS compliance: ${report.currentValue}%`;
            break;
          case ReportType.MISRA_C:
            result = `MISRA-C compliance: ${report.currentValue}%`;
            break;
          case ReportType.CODE_COVERAGE:
            {
              const codeCoverageReport = report as CodeCoverageReport;
              result = `Code coverage: ${report.currentValue}% (Line: ${codeCoverageReport.coverage.line}%)`;
            }
            break;
          case ReportType.ISSUES_PREVENTED:
            result = `Issues prevented: ${(report as IssuesPreventedReport).prevented.total}`;
            break;
        }
        return result as string;
      };

      const owaspReport: OwaspTop10Report = {
        type: ReportType.OWASP_TOP_10,
        title: 'OWASP Top 10',
        currentValue: 85,
        status: 'PASSING',
        categories: [
          {
            key: 'A01:2021',
            title: 'Broken Access Control',
            issues: {
              critical: 0,
              major: 2,
              minor: 1,
              total: 3,
            },
          },
        ],
      };

      const coverageReport: CodeCoverageReport = {
        type: ReportType.CODE_COVERAGE,
        title: 'Code Coverage',
        currentValue: 78.5,
        status: 'PASSING',
        coverage: {
          line: 80.2,
          branch: 75.6,
          statement: 81.3,
          function: 90.0,
        },
      };

      expect(getReportSummary(owaspReport)).toBe('OWASP compliance: 85%, issues in 1 categories');
      expect(getReportSummary(coverageReport)).toBe('Code coverage: 78.5% (Line: 80.2%)');
    });
  });

  describe('MetricState Union', () => {
    it('should create different metric states with correct discriminants', () => {
      // Passing metric
      const passingMetric: PassingMetric = {
        shortcode: 'LCV',
        name: 'Line Coverage',
        unit: '%',
        positiveDirection: 'UPWARD',
        value: 85.2,
        status: MetricThresholdStatus.PASSING,
        threshold: 80.0,
        margin: 5.2,
      };

      // Failing metric
      const failingMetric: FailingMetric = {
        shortcode: 'DDP',
        name: 'Duplicate Code Percentage',
        unit: '%',
        positiveDirection: 'DOWNWARD',
        value: 12.5,
        status: MetricThresholdStatus.FAILING,
        threshold: 10.0,
        gap: 2.5,
        recommendations: [
          'Extract common code into shared functions',
          'Use inheritance or composition to reduce duplication',
        ],
      };

      expect(passingMetric.status).toBe(MetricThresholdStatus.PASSING);
      expect(failingMetric.status).toBe(MetricThresholdStatus.FAILING);

      // Type guard should correctly identify metric states
      expect(isMetricInState<PassingMetric>(passingMetric, MetricThresholdStatus.PASSING)).toBe(
        true
      );
      expect(isMetricInState<FailingMetric>(failingMetric, MetricThresholdStatus.FAILING)).toBe(
        true
      );
      expect(isMetricInState<FailingMetric>(passingMetric, MetricThresholdStatus.FAILING)).toBe(
        false
      );
    });

    it('should handle metric state specific properties', () => {
      // Function that returns different messages based on metric state
      const getMetricMessage = (metric: MetricState): string => {
        let result;
        switch (metric.status) {
          case MetricThresholdStatus.PASSING:
            {
              const metricWithMargin = metric as PassingMetric;
              result = `${metric.name} is passing at ${metric.value}${metric.unit} (exceeds threshold by ${metricWithMargin.margin}${metric.unit})`;
            }
            break;
          case MetricThresholdStatus.FAILING:
            {
              const metricWithGap = metric as FailingMetric;
              result = `${metric.name} is failing at ${metric.value}${metric.unit} (below threshold by ${metricWithGap.gap}${metric.unit})`;
            }
            break;
          case MetricThresholdStatus.UNKNOWN:
            result = `${metric.name} has no threshold set, current value is ${metric.value}${metric.unit}`;
            break;
        }
        return result as string;
      };

      const passingMetric: PassingMetric = {
        shortcode: 'LCV',
        name: 'Line Coverage',
        unit: '%',
        positiveDirection: 'UPWARD',
        value: 85.2,
        status: MetricThresholdStatus.PASSING,
        threshold: 80.0,
        margin: 5.2,
      };

      const failingMetric: FailingMetric = {
        shortcode: 'DDP',
        name: 'Duplicate Code Percentage',
        unit: '%',
        positiveDirection: 'DOWNWARD',
        value: 12.5,
        status: MetricThresholdStatus.FAILING,
        threshold: 10.0,
        gap: 2.5,
      };

      expect(getMetricMessage(passingMetric)).toBe(
        'Line Coverage is passing at 85.2% (exceeds threshold by 5.2%)'
      );
      expect(getMetricMessage(failingMetric)).toBe(
        'Duplicate Code Percentage is failing at 12.5% (below threshold by 2.5%)'
      );
    });
  });
});
