/**
 * @fileoverview Discriminated union types for complex state management
 *
 * This module defines type-safe discriminated union types for various complex state
 * management scenarios in the codebase. Discriminated unions help ensure that code
 * handling different states properly accounts for all possible variants.
 */

import { ErrorCategory } from '../utils/errors/categories.js';
import { AnalysisRunStatus } from '../models/runs.js';
import { MetricDirection, MetricShortcode, MetricThresholdStatus } from './metrics.js';
import { BranchName, CommitOid, RunId } from './branded.js';
import { ReportType, ReportStatus } from '../deepsource.js';

/**
 * -----------------------------------------------------------------------------
 * Error Handling Discriminated Unions
 * -----------------------------------------------------------------------------
 */

/**
 * Base interface for all error types
 */
interface ErrorBase {
  /** Message describing the error */
  message: string;
  /** Error category discriminant */
  category: ErrorCategory;
  /** Additional metadata for the error */
  metadata?: Record<string, unknown>;
}

/**
 * Authentication error (invalid API key, expired token, etc.)
 */
export interface AuthError extends ErrorBase {
  category: ErrorCategory.AUTH;
  /** Token information if available */
  token?: {
    /** Whether the token was present */
    present: boolean;
    /** Whether the token was expired */
    expired?: boolean;
  };
}

/**
 * Network error (connection issues, DNS failures, etc.)
 */
export interface NetworkError extends ErrorBase {
  category: ErrorCategory.NETWORK;
  /** The URL that failed */
  url?: string;
  /** Information about the connection */
  connection?: {
    /** Whether a connection was established */
    established: boolean;
    /** Time spent trying to connect */
    timeSpent?: number;
  };
}

/**
 * Server error (500 errors, backend failures, etc.)
 */
export interface ServerError extends ErrorBase {
  category: ErrorCategory.SERVER;
  /** HTTP status code if available */
  statusCode?: number;
  /** Server response if available */
  response?: unknown;
}

/**
 * Client error (400 errors, invalid input, etc.)
 */
export interface ClientError extends ErrorBase {
  category: ErrorCategory.CLIENT;
  /** HTTP status code if available */
  statusCode?: number;
  /** Validation errors if available */
  validationErrors?: Record<string, string>;
}

/**
 * Timeout error (request took too long)
 */
export interface TimeoutError extends ErrorBase {
  category: ErrorCategory.TIMEOUT;
  /** The timeout limit in milliseconds */
  timeoutLimit?: number;
  /** Time spent before timeout */
  timeSpent?: number;
}

/**
 * Rate limit error (too many requests)
 */
export interface RateLimitError extends ErrorBase {
  category: ErrorCategory.RATE_LIMIT;
  /** When the rate limit resets */
  resetAt?: string;
  /** Request limit information */
  limit?: {
    /** Max requests allowed */
    max: number;
    /** Remaining requests */
    remaining: number;
  };
}

/**
 * Schema error (GraphQL schema issues)
 */
export interface SchemaError extends ErrorBase {
  category: ErrorCategory.SCHEMA;
  /** The problematic field or type */
  field?: string;
  /** Original GraphQL error */
  graphqlErrors?: Array<{ message: string; path?: string[] }>;
}

/**
 * Not found error (resource doesn't exist)
 */
export interface NotFoundError extends ErrorBase {
  category: ErrorCategory.NOT_FOUND;
  /** Resource that wasn't found */
  resource?: string;
  /** ID or key that was looked up */
  identifier?: string;
}

/**
 * Format error (data in unexpected format)
 */
export interface FormatError extends ErrorBase {
  category: ErrorCategory.FORMAT;
  /** Expected format */
  expected?: string;
  /** Received format */
  received?: string;
}

/**
 * Other/unknown errors
 */
export interface OtherError extends ErrorBase {
  category: ErrorCategory.OTHER;
}

/**
 * Union type for all possible error types
 */
export type ApiError =
  | AuthError
  | NetworkError
  | ServerError
  | ClientError
  | TimeoutError
  | RateLimitError
  | SchemaError
  | NotFoundError
  | FormatError
  | OtherError;

/**
 * Type guard to check if an API error belongs to a specific error category
 *
 * This function performs a runtime check on the error's category discriminant
 * to determine if it matches the requested category. Use this with type narrowing
 * to access category-specific properties safely.
 *
 * @example
 * ```typescript
 * if (isErrorOfCategory(error, ErrorCategory.NOT_FOUND)) {
 *   // TypeScript knows this is a NotFoundError now
 *   console.log(error.resource); // Safely access NotFoundError property
 * }
 * ```
 *
 * @param error - The API error object to check
 * @param category - The error category to test against
 * @returns True if the error is of the specified category, false otherwise
 * @public
 */
export function isErrorOfCategory(error: ApiError, category: ErrorCategory): boolean {
  return error.category === category;
}

/**
 * -----------------------------------------------------------------------------
 * API Response Discriminated Unions
 * -----------------------------------------------------------------------------
 */

/**
 * Base interface for API responses
 */
interface ApiResponseBase {
  /** Whether the request was successful */
  success: boolean;
}

/**
 * Successful API response
 */
export interface SuccessResponse<T> extends ApiResponseBase {
  success: true;
  /** Response data */
  data: T;
}

/**
 * Failed API response
 */
export interface ErrorResponse extends ApiResponseBase {
  success: false;
  /** Error information */
  error: ApiError;
}

/**
 * Union type for API responses
 */
export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

/**
 * Type guard to check if an API response was successful
 *
 * This function enables safe handling of API responses by distinguishing between
 * success and error cases in a type-safe manner. It acts as a TypeScript type predicate,
 * allowing the compiler to narrow the type when used in conditions.
 *
 * @example
 * ```typescript
 * const response = await fetchData();
 *
 * if (isSuccessResponse(response)) {
 *   // TypeScript knows this is a SuccessResponse<T> now
 *   console.log(response.data); // Safely access response.data
 * } else {
 *   // TypeScript knows this is an ErrorResponse now
 *   console.error(response.error.message); // Safely access error properties
 * }
 * ```
 *
 * @param response - The API response to check
 * @returns Type predicate indicating whether the response is a successful response
 * @typeParam T - The type of data contained in a successful response
 * @public
 */
export function isSuccessResponse<T>(response: ApiResponse<T>): response is SuccessResponse<T> {
  return response.success === true;
}

/**
 * -----------------------------------------------------------------------------
 * Run Status Discriminated Unions
 * -----------------------------------------------------------------------------
 */

/**
 * Base interface for run states
 */
interface RunStateBase {
  /** Run status discriminant */
  status: AnalysisRunStatus;
  /** Run ID */
  runId: RunId;
  /** Commit hash */
  commitOid: CommitOid;
  /** Branch name */
  branchName: BranchName;
  /** Base commit hash */
  baseOid: CommitOid;
  /** Timestamp when the run was created */
  createdAt: string;
  /** Timestamp when the run was last updated */
  updatedAt: string;
}

/**
 * Run in pending state
 */
export interface PendingRun extends RunStateBase {
  status: 'PENDING';
  /** Position in queue if available */
  queuePosition?: number;
  /** Estimated start time if available */
  estimatedStartTime?: string;
}

/**
 * Run in progress state
 */
export interface RunningRun extends RunStateBase {
  status: 'READY';
  /** Current progress percentage if available */
  progress?: number;
  /** Current stage of analysis if available */
  currentStage?: string;
  /** Estimated completion time if available */
  estimatedCompletionTime?: string;
}

/**
 * Successful run
 */
export interface SuccessfulRun extends RunStateBase {
  status: 'SUCCESS';
  /** When the run finished */
  finishedAt: string;
  /** Summary of results */
  summary: {
    /** Number of new issues introduced */
    occurrencesIntroduced: number;
    /** Number of issues resolved */
    occurrencesResolved: number;
    /** Number of issues suppressed */
    occurrencesSuppressed: number;
    /** Analyzer distribution */
    analyzerDistribution?: Array<{
      analyzer: string;
      count: number;
    }>;
    /** Category distribution */
    categoryDistribution?: Array<{
      category: string;
      count: number;
    }>;
  };
}

/**
 * Failed run (error occurred)
 */
export interface FailedRun extends RunStateBase {
  status: 'FAILURE';
  /** When the run failed */
  finishedAt: string;
  /** Error information if available */
  error?: {
    /** Error message */
    message: string;
    /** Error code if available */
    code?: string;
  };
}

/**
 * Timed out run
 */
export interface TimedOutRun extends RunStateBase {
  status: 'TIMEOUT';
  /** When the run timed out */
  finishedAt: string;
  /** Timeout information */
  timeout?: {
    /** Time limit in seconds */
    limitSeconds: number;
    /** Partial results if available */
    partialResultsAvailable: boolean;
  };
}

/**
 * Cancelled run
 */
export interface CancelledRun extends RunStateBase {
  status: 'CANCEL';
  /** When the run was cancelled */
  finishedAt: string;
  /** Who cancelled the run if available */
  cancelledBy?: string;
  /** Reason for cancellation if available */
  cancellationReason?: string;
}

/**
 * Skipped run
 */
export interface SkippedRun extends RunStateBase {
  status: 'SKIPPED';
  /** When the run was skipped */
  finishedAt: string;
  /** Reason for skipping */
  skipReason?: string;
}

/**
 * Union type for run states
 */
export type RunState =
  | PendingRun
  | RunningRun
  | SuccessfulRun
  | FailedRun
  | TimedOutRun
  | CancelledRun
  | SkippedRun;

/**
 * Type guard to check if a run is in a specific state
 * @param run Run to check
 * @param status Status to check for
 * @returns Whether the run is in the specified state
 */
/**
 * Type guard to check if a run is in a specific state
 *
 * This generic type guard determines if a run is in a particular state based on
 * its status discriminant. It enables type-safe access to state-specific properties
 * after TypeScript narrows the type.
 *
 * @example
 * ```typescript
 * // Check if run is successful and access success-specific properties
 * if (isRunInState<SuccessfulRun>(run, 'SUCCESS')) {
 *   // TypeScript knows this is a SuccessfulRun now
 *   console.log(run.finishedAt);
 *   console.log(run.summary.occurrencesIntroduced);
 * }
 *
 * // Check if run is in progress and access progress-specific properties
 * if (isRunInState<RunningRun>(run, 'READY')) {
 *   // TypeScript knows this is a RunningRun now
 *   console.log(run.progress);
 *   console.log(run.currentStage);
 * }
 * ```
 *
 * @param run - The run object to check
 * @param status - The status to test against
 * @returns Type predicate indicating whether the run is in the specified state
 * @typeParam T - The specific run state type to check for (must extend RunState)
 * @public
 */
export function isRunInState<T extends RunState>(
  run: RunState,
  status: AnalysisRunStatus
): run is T {
  return run.status === status;
}

/**
 * -----------------------------------------------------------------------------
 * Report Type Discriminated Unions
 * -----------------------------------------------------------------------------
 */

/**
 * Base interface for compliance reports
 */
interface ComplianceReportBase {
  /** Report type discriminant */
  type: ReportType;
  /** Report title */
  title: string;
  /** Current compliance value (percentage or score) */
  currentValue: number;
  /** Compliance status */
  status: ReportStatus;
  /** Trend data if available */
  trends?: Record<string, unknown>;
}

/**
 * OWASP Top 10 report
 */
export interface OwaspTop10Report extends ComplianceReportBase {
  type: ReportType.OWASP_TOP_10;
  /** OWASP Top 10 categories with issues */
  categories: Array<{
    /** OWASP category key */
    key: string;
    /** Category title */
    title: string;
    /** Issue counts by severity */
    issues: {
      critical: number;
      major: number;
      minor: number;
      total: number;
    };
  }>;
}

/**
 * SANS Top 25 report
 */
export interface SansTop25Report extends ComplianceReportBase {
  type: ReportType.SANS_TOP_25;
  /** SANS Top 25 categories with issues */
  categories: Array<{
    /** SANS category key */
    key: string;
    /** Category title */
    title: string;
    /** Issue counts by severity */
    issues: {
      critical: number;
      major: number;
      minor: number;
      total: number;
    };
  }>;
}

/**
 * MISRA-C report
 */
export interface MisraCReport extends ComplianceReportBase {
  type: ReportType.MISRA_C;
  /** MISRA violation categories */
  categories: Array<{
    /** MISRA rule key */
    key: string;
    /** Rule title */
    title: string;
    /** Issue counts by severity */
    issues: {
      critical: number;
      major: number;
      minor: number;
      total: number;
    };
  }>;
}

/**
 * Code coverage report
 */
export interface CodeCoverageReport extends ComplianceReportBase {
  type: ReportType.CODE_COVERAGE;
  /** Coverage by type */
  coverage: {
    /** Line coverage percentage */
    line?: number;
    /** Branch coverage percentage */
    branch?: number;
    /** Statement coverage percentage */
    statement?: number;
    /** Function coverage percentage */
    function?: number;
  };
  /** Coverage trend over time */
  trend?: Array<{
    /** Date of the data point */
    date: string;
    /** Coverage value */
    value: number;
  }>;
}

/**
 * Issues prevented report
 */
export interface IssuesPreventedReport extends ComplianceReportBase {
  type: ReportType.ISSUES_PREVENTED;
  /** Issues prevented by severity */
  prevented: {
    /** Critical issues prevented */
    critical: number;
    /** Major issues prevented */
    major: number;
    /** Minor issues prevented */
    minor: number;
    /** Total issues prevented */
    total: number;
  };
  /** Percentage of issues that were prevented */
  preventionRate: number;
}

/**
 * Union type for all report types
 */
export type ComplianceReport =
  | OwaspTop10Report
  | SansTop25Report
  | MisraCReport
  | CodeCoverageReport
  | IssuesPreventedReport;

/**
 * Type guard to check if a compliance report is of a specific type
 *
 * This generic type guard determines if a compliance report is of a particular type
 * based on its type discriminant. It enables type-safe access to report-type-specific
 * properties after TypeScript narrows the type.
 *
 * @example
 * ```typescript
 * // Check if report is an OWASP Top 10 report
 * if (isReportOfType<OwaspTop10Report>(report, ReportType.OWASP_TOP_10)) {
 *   // TypeScript knows this is an OwaspTop10Report now
 *   console.log(report.owaspCategories);
 *   console.log(report.vulnerabilityCount);
 * }
 * ```
 *
 * @param report - The compliance report to check
 * @param type - The report type to test against
 * @returns Type predicate indicating whether the report is of the specified type
 * @typeParam T - The specific report type to check for (must extend ComplianceReport)
 * @public
 */
export function isReportOfType<T extends ComplianceReport>(
  report: ComplianceReport,
  type: ReportType
): report is T {
  return report.type === type;
}

/**
 * -----------------------------------------------------------------------------
 * Metric Status Discriminated Unions
 * -----------------------------------------------------------------------------
 */

/**
 * Base interface for metric states
 */
interface MetricStateBase {
  /** Metric shortcode */
  shortcode: MetricShortcode;
  /** Metric name */
  name: string;
  /** Unit of measurement */
  unit: string;
  /** Direction in which higher values are considered positive */
  positiveDirection: MetricDirection;
  /** Current metric value */
  value: number;
  /** Status discriminant */
  status: MetricThresholdStatus;
}

/**
 * Passing metric
 */
export interface PassingMetric extends MetricStateBase {
  status: MetricThresholdStatus.PASSING;
  /** The threshold that was met or exceeded */
  threshold: number;
  /** By how much the metric exceeds the threshold */
  margin?: number;
}

/**
 * Failing metric
 */
export interface FailingMetric extends MetricStateBase {
  status: MetricThresholdStatus.FAILING;
  /** The threshold that wasn't met */
  threshold: number;
  /** By how much the metric falls short of the threshold */
  gap?: number;
  /** Recommendations for improving the metric */
  recommendations?: string[];
}

/**
 * Metric with unknown status (no threshold set)
 */
export interface UnknownMetric extends MetricStateBase {
  status: MetricThresholdStatus.UNKNOWN;
  /** Whether a threshold is recommended */
  thresholdRecommended?: boolean;
  /** Recommended threshold value if available */
  recommendedThreshold?: number;
}

/**
 * Union type for metric states
 */
export type MetricState = PassingMetric | FailingMetric | UnknownMetric;

/**
 * Type guard to check if a metric is in a specific threshold state
 *
 * This generic type guard determines if a quality metric is in a particular threshold
 * state based on its status discriminant. It enables type-safe access to state-specific
 * properties after TypeScript narrows the type.
 *
 * @example
 * ```typescript
 * // Check if metric is passing its threshold
 * if (isMetricInState<PassingMetric>(metric, MetricThresholdStatus.PASS)) {
 *   // TypeScript knows this is a PassingMetric now
 *   console.log(metric.passPercentage);
 *   console.log(metric.margin);
 * }
 *
 * // Check if metric is failing its threshold
 * if (isMetricInState<FailingMetric>(metric, MetricThresholdStatus.FAIL)) {
 *   // TypeScript knows this is a FailingMetric now
 *   console.log(metric.thresholdDelta);
 *   console.log(metric.recommendedThreshold);
 * }
 * ```
 *
 * @param metric - The metric to check
 * @param status - The threshold status to test against
 * @returns Type predicate indicating whether the metric is in the specified state
 * @typeParam T - The specific metric state to check for (must extend MetricState)
 * @public
 */
export function isMetricInState<T extends MetricState>(
  metric: MetricState,
  status: MetricThresholdStatus
): metric is T {
  return metric.status === status;
}
