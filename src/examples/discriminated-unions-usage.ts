/**
 * @fileoverview Examples of using discriminated unions
 *
 * This file provides examples of how to use the discriminated union types
 * defined in the project. These examples serve as documentation and guidance
 * for developers working with the codebase.
 */

import {
  ApiError,
  ApiResponse,
  AuthError,
  ComplianceReport,
  CodeCoverageReport,
  FailedRun,
  FailingMetric,
  MetricState,
  NetworkError,
  OwaspTop10Report,
  PassingMetric,
  RunState,
  ServerError,
  SuccessfulRun,
  isMetricInState,
  isReportOfType,
  isRunInState,
  isSuccessResponse,
} from '../types/discriminated-unions.js';
import { ErrorCategory } from '../utils/errors/categories.js';
import { MetricThresholdStatus } from '../types/metrics.js';
import { ReportType } from '../deepsource.js';

/**
 * Example of handling API errors with discriminated unions
 */
export function handleApiError(error: ApiError): string {
  // Using discriminated union to handle different error types
  switch (error.category) {
    case ErrorCategory.AUTH:
      return `Authentication error: ${error.message}. Please check your API key.`;

    case ErrorCategory.NETWORK:
      return `Network error: ${error.message}. Please check your internet connection.`;

    case ErrorCategory.TIMEOUT:
      return `Timeout error: ${error.message}. The request took too long to complete.`;

    case ErrorCategory.RATE_LIMIT: {
      // Need to cast to specific type to access type-specific properties
      const rateLimitError = error as ApiError & { resetAt?: string };
      const resetTime = rateLimitError.resetAt
        ? new Date(rateLimitError.resetAt).toLocaleTimeString()
        : 'unknown time';
      return `Rate limit exceeded: ${error.message}. Try again after ${resetTime}.`;
    }

    case ErrorCategory.NOT_FOUND: {
      // Need to cast to specific type to access type-specific properties
      const notFoundError = error as ApiError & { resource?: string; identifier?: string };
      return `Resource not found: ${notFoundError.resource || 'Unknown'} with identifier ${
        notFoundError.identifier || 'unknown'
      }.`;
    }

    default:
      return `Error: ${error.message}`;
  }
}

/**
 * Example of handling API errors with type guards
 */
export function handleApiErrorWithTypeGuards(error: ApiError): string {
  // Using type checking for specific error types
  if (error.category === ErrorCategory.AUTH) {
    const authError = error as AuthError;
    return `Authentication error: ${authError.message}. ${
      authError.token ? `Token present: ${authError.token.present}.` : ''
    }`;
  }

  if (error.category === ErrorCategory.NETWORK) {
    const networkError = error as NetworkError;
    return `Network error: ${networkError.message}. ${
      networkError.url ? `URL: ${networkError.url}.` : ''
    }`;
  }

  if (error.category === ErrorCategory.SERVER) {
    const serverError = error as ServerError;
    return `Server error: ${serverError.message}. ${
      serverError.statusCode ? `Status code: ${serverError.statusCode}.` : ''
    }`;
  }

  return `Error: ${error.message}`;
}

/**
 * Example of processing API responses with discriminated unions
 */
export function processApiResponse<T>(response: ApiResponse<T>): T | string {
  // Check if the response was successful
  if (isSuccessResponse(response)) {
    // TypeScript knows this is a SuccessResponse<T>
    return response.data;
  } else {
    // TypeScript knows this is an ErrorResponse
    return handleApiError(response.error);
  }
}

/**
 * Example of handling run states with discriminated unions
 */
export function getRunStatusMessage(run: RunState): string {
  // Using discriminated union to handle different run states
  switch (run.status) {
    case 'PENDING':
      return `Run ${run.runId} is pending. ${
        'queuePosition' in run && run.queuePosition ? `Queue position: ${run.queuePosition}.` : ''
      }`;

    case 'READY':
      return `Run ${run.runId} is in progress. ${
        'progress' in run && run.progress ? `Progress: ${run.progress}%.` : ''
      }`;

    case 'SUCCESS': {
      const successRun = run as SuccessfulRun;
      return `Run ${successRun.runId} completed successfully. ${
        successRun.summary.occurrencesIntroduced
      } issues introduced, ${successRun.summary.occurrencesResolved} issues resolved.`;
    }

    case 'FAILURE': {
      const failedRun = run as FailedRun;
      return `Run ${failedRun.runId} failed. ${
        failedRun.error ? `Error: ${failedRun.error.message}.` : ''
      }`;
    }

    case 'TIMEOUT':
      return `Run ${run.runId} timed out. ${
        'timeout' in run && run.timeout?.partialResultsAvailable
          ? 'Partial results are available.'
          : 'No results available.'
      }`;

    case 'CANCEL':
      return `Run ${run.runId} was cancelled. ${
        'cancellationReason' in run && run.cancellationReason
          ? `Reason: ${run.cancellationReason}.`
          : ''
      }`;

    case 'SKIPPED':
      return `Run ${run.runId} was skipped. ${
        'skipReason' in run && run.skipReason ? `Reason: ${run.skipReason}.` : ''
      }`;
  }
}

/**
 * Example of handling run states with type guards
 */
export function processRun(run: RunState): string {
  // Using type guards for specific run states
  if (isRunInState<SuccessfulRun>(run, 'SUCCESS')) {
    // TypeScript knows this is a SuccessfulRun
    return `Run ${run.runId} completed at ${new Date(run.finishedAt).toLocaleString()}. 
      ${run.summary.occurrencesIntroduced} issues introduced, 
      ${run.summary.occurrencesResolved} issues resolved.`;
  }

  if (isRunInState<FailedRun>(run, 'FAILURE')) {
    // TypeScript knows this is a FailedRun
    return `Run ${run.runId} failed at ${new Date(run.finishedAt).toLocaleString()}. 
      ${run.error ? `Error: ${run.error.message}.` : 'Unknown error'}`;
  }

  return getRunStatusMessage(run);
}

/**
 * Example of handling metrics with discriminated unions
 */
export function getMetricStatusMessage(metric: MetricState): string {
  // Using discriminated union to handle different metric states
  switch (metric.status) {
    case MetricThresholdStatus.PASSING: {
      const passingMetric = metric as PassingMetric;
      return `${passingMetric.name} is passing. Value: ${passingMetric.value}${passingMetric.unit} (threshold: ${passingMetric.threshold}${passingMetric.unit}).`;
    }

    case MetricThresholdStatus.FAILING: {
      const failingMetric = metric as FailingMetric;
      return `${failingMetric.name} is failing. Value: ${failingMetric.value}${failingMetric.unit} (threshold: ${failingMetric.threshold}${failingMetric.unit}).`;
    }

    case MetricThresholdStatus.UNKNOWN:
      return `${metric.name} status is unknown. Value: ${metric.value}${metric.unit}.`;
  }
}

/**
 * Example of handling metrics with type guards
 */
export function processMetric(metric: MetricState): string {
  // Using type guards for specific metric states
  if (isMetricInState<PassingMetric>(metric, MetricThresholdStatus.PASSING)) {
    // TypeScript knows this is a PassingMetric
    return `${metric.name} is passing. Value: ${metric.value}${metric.unit} (threshold: ${metric.threshold}${metric.unit}).
      ${metric.margin ? `Exceeds threshold by ${metric.margin}${metric.unit}.` : ''}`;
  }

  if (isMetricInState<FailingMetric>(metric, MetricThresholdStatus.FAILING)) {
    // TypeScript knows this is a FailingMetric
    return `${metric.name} is failing. Value: ${metric.value}${metric.unit} (threshold: ${metric.threshold}${metric.unit}).
      ${metric.gap ? `Falls short by ${metric.gap}${metric.unit}.` : ''}
      ${metric.recommendations ? `Recommendations: ${metric.recommendations.join(', ')}.` : ''}`;
  }

  return getMetricStatusMessage(metric);
}

/**
 * Example of handling compliance reports with discriminated unions
 */
export function getReportSummary(report: ComplianceReport): string {
  // Using discriminated union to handle different report types
  switch (report.type) {
    case ReportType.OWASP_TOP_10: {
      const owaspReport = report as OwaspTop10Report;
      return `OWASP Top 10 compliance: ${owaspReport.currentValue}%. 
        Status: ${owaspReport.status}. 
        Issues found in ${owaspReport.categories.length} categories.`;
    }

    case ReportType.SANS_TOP_25: {
      // Need to cast to access categories property
      const sansReport = report as ComplianceReport & { categories: Array<unknown> };
      return `SANS Top 25 compliance: ${sansReport.currentValue}%. 
        Status: ${sansReport.status}. 
        Issues found in ${sansReport.categories.length} categories.`;
    }

    case ReportType.MISRA_C: {
      // Need to cast to access categories property
      const misraReport = report as ComplianceReport & { categories: Array<unknown> };
      return `MISRA-C compliance: ${misraReport.currentValue}%. 
        Status: ${misraReport.status}. 
        Violations found in ${misraReport.categories.length} categories.`;
    }

    case ReportType.CODE_COVERAGE: {
      const coverageReport = report as CodeCoverageReport;
      return `Code coverage: ${coverageReport.currentValue}%. 
        Status: ${coverageReport.status}. 
        Line coverage: ${coverageReport.coverage.line}%.`;
    }

    case ReportType.ISSUES_PREVENTED: {
      // Need to cast to access prevented property
      const preventedReport = report as ComplianceReport & {
        prevented: { total: number };
        preventionRate: number;
      };
      return `Issues prevented: ${preventedReport.prevented.total}. 
        Status: ${preventedReport.status}. 
        Prevention rate: ${preventedReport.preventionRate}%.`;
    }
  }
}

/**
 * Example of handling compliance reports with type guards
 */
export function processReport(report: ComplianceReport): string {
  // Using type guards for specific report types
  if (isReportOfType<OwaspTop10Report>(report, ReportType.OWASP_TOP_10)) {
    // TypeScript knows this is an OwaspTop10Report
    const categoriesWithIssues = report.categories.filter((c) => c.issues.total > 0);
    return `OWASP Top 10 compliance: ${report.currentValue}%. 
      Status: ${report.status}. 
      Issues found in ${categoriesWithIssues.length} of ${report.categories.length} categories.`;
  }

  if (isReportOfType<CodeCoverageReport>(report, ReportType.CODE_COVERAGE)) {
    // TypeScript knows this is a CodeCoverageReport
    return `Code coverage: ${report.currentValue}%. 
      Status: ${report.status}. 
      Line: ${report.coverage.line}%, 
      Branch: ${report.coverage.branch}%, 
      Function: ${report.coverage.function}%.`;
  }

  return getReportSummary(report);
}
