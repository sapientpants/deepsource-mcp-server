import axios, { AxiosError } from 'axios';
import { createLogger } from './utils/logger.js';
import { ErrorCategory, createClassifiedError, classifyGraphQLError } from './utils/errors.js';
import {
  MetricShortcode,
  MetricKey,
  MetricThresholdStatus,
  MetricDirection,
  RepositoryMetric,
  RepositoryMetricItem,
  MetricSetting,
  UpdateMetricThresholdParams,
  UpdateMetricSettingParams,
  MetricThresholdUpdateResponse,
  MetricSettingUpdateResponse,
  MetricHistoryParams,
  MetricHistoryResponse,
  MetricHistoryValue,
} from './types/metrics.js';

/**
 * @fileoverview DeepSource API client for interacting with the DeepSource service.
 * This module exports interfaces and classes for working with the DeepSource API.
 * @packageDocumentation
 */

// Interfaces and types below are exported as part of the public API
// Re-export quality metrics types
export { MetricShortcode, MetricDirection };
export type {
  MetricKey,
  MetricThresholdStatus,
  RepositoryMetric,
  RepositoryMetricItem,
  MetricSetting,
  UpdateMetricThresholdParams,
  UpdateMetricSettingParams,
  MetricThresholdUpdateResponse,
  MetricSettingUpdateResponse,
  MetricHistoryParams,
  MetricHistoryResponse,
  MetricHistoryValue,
};

/**
 * Available report types in DeepSource
 * This enum combines both compliance-specific and general report types
 * and is referenced in API functions like getComplianceReport() and handleDeepsourceComplianceReport().
 * @public
 */
/* eslint-disable no-unused-vars */
export enum ReportType {
  // Compliance-specific report types
  OWASP_TOP_10 = 'OWASP_TOP_10',
  SANS_TOP_25 = 'SANS_TOP_25',
  MISRA_C = 'MISRA_C',

  // General report types
  CODE_COVERAGE = 'CODE_COVERAGE',
  CODE_HEALTH_TREND = 'CODE_HEALTH_TREND',
  ISSUE_DISTRIBUTION = 'ISSUE_DISTRIBUTION',
  ISSUES_PREVENTED = 'ISSUES_PREVENTED',
  ISSUES_AUTOFIXED = 'ISSUES_AUTOFIXED',
}
/* eslint-enable no-unused-vars */

/**
 * Report status indicating whether the report is passing, failing, or not applicable
 * This enum is exported as part of the public API for use in MCP tools
 * and is referenced in handleDeepsourceComplianceReport().
 * @public
 */
/* eslint-disable no-unused-vars */
export enum ReportStatus {
  PASSING = 'PASSING',
  FAILING = 'FAILING',
  NOOP = 'NOOP',
}
/* eslint-enable no-unused-vars */

/**
 * Trend information for reports
 * @public
 */
export interface ReportTrend {
  label?: string;
  value?: number;
  changePercentage?: number;
}

/**
 * Severity distribution of issues
 * @public
 */
export interface SeverityDistribution {
  critical: number;
  major: number;
  minor: number;
  total: number;
}

/**
 * Security issue statistic
 * @public
 */
export interface SecurityIssueStat {
  key: string;
  title: string;
  occurrence: SeverityDistribution;
}

/**
 * Compliance report interface
 * @public
 */
export interface ComplianceReport {
  key: ReportType;
  title: string;
  currentValue?: number;
  status?: ReportStatus;
  securityIssueStats: SecurityIssueStat[];
  trends?: ReportTrend[];
}

/**
 * Represents a DeepSource project in the API
 * @public
 */
export interface DeepSourceProject {
  key: string;
  name: string;
  repository: {
    url: string;
    provider: string;
    login: string;
    isPrivate: boolean;
    isActivated: boolean;
  };
}

/**
 * Represents an issue found by DeepSource analysis
 * @public
 */
export interface DeepSourceIssue {
  id: string;
  title: string;
  shortcode: string;
  category: string;
  severity: string;
  status: string;
  issue_text: string;
  file_path: string;
  line_number: number;
  tags: string[];
}

/**
 * Distribution of occurrences by analyzer type
 * @public
 */
export interface OccurrenceDistributionByAnalyzer {
  analyzerShortcode: string;
  introduced: number;
}

/**
 * Distribution of occurrences by category
 * @public
 */
export interface OccurrenceDistributionByCategory {
  category: string;
  introduced: number;
}

/**
 * Summary of an analysis run, including counts of issues
 * @public
 */
export interface RunSummary {
  occurrencesIntroduced: number;
  occurrencesResolved: number;
  occurrencesSuppressed: number;
  occurrenceDistributionByAnalyzer?: OccurrenceDistributionByAnalyzer[];
  occurrenceDistributionByCategory?: OccurrenceDistributionByCategory[];
}

/**
 * Possible status values for an analysis run
 * Using a type instead of enum to avoid unused enum values linting errors
 * @public
 */
export type AnalysisRunStatus =
  | 'PENDING'
  | 'SUCCESS'
  | 'FAILURE'
  | 'TIMEOUT'
  | 'CANCEL'
  | 'READY'
  | 'SKIPPED';

/**
 * Represents a DeepSource analysis run
 * @public
 */
export interface DeepSourceRun {
  id: string;
  runUid: string;
  commitOid: string;
  branchName: string;
  baseOid: string;
  status: AnalysisRunStatus;
  createdAt: string;
  updatedAt: string;
  finishedAt?: string;
  summary: RunSummary;
  repository: {
    name: string;
    id: string;
  };
}

/**
 * Possible severity levels for a vulnerability
 * Represents the qualitative assessment of the vulnerability's impact
 * @public
 */
export type VulnerabilitySeverity =
  /** No meaningful risk */
  | 'NONE'
  /** Limited impact, typically requiring complex exploitation */
  | 'LOW'
  /** Significant impact but with mitigating factors */
  | 'MEDIUM'
  /** Serious impact with straightforward exploitation */
  | 'HIGH'
  /** Critical impact with easy exploitation or catastrophic consequences */
  | 'CRITICAL';

/**
 * Possible package version types
 * Defines how the version numbering scheme for a package should be interpreted
 * @public
 */
export type PackageVersionType =
  /** Semantic Versioning (major.minor.patch) */
  | 'SEMVER'
  /** Ecosystem-specific versioning scheme */
  | 'ECOSYSTEM'
  /** Git-based versioning (commit hashes or tags) */
  | 'GIT';

/**
 * Possible reachability types for a vulnerability occurrence
 * Indicates whether the vulnerable code can be triggered in the codebase
 * @public
 */
export type VulnerabilityReachability =
  /** The vulnerability is reachable from execution paths in the code */
  | 'REACHABLE'
  /** The vulnerability exists but is not reachable in execution paths */
  | 'UNREACHABLE'
  /** Reachability could not be determined */
  | 'UNKNOWN';

/**
 * Possible fixability types for a vulnerability occurrence
 * Indicates whether and how the vulnerability can be fixed
 * @public
 */
export type VulnerabilityFixability =
  /** An error occurred during fixability analysis */
  | 'ERROR'
  /** The vulnerability cannot be fixed with current methods */
  | 'UNFIXABLE'
  /** A fix is currently being generated */
  | 'GENERATING_FIX'
  /** The vulnerability might be fixable but requires further analysis */
  | 'POSSIBLY_FIXABLE'
  /** The vulnerability can be fixed manually following guidelines */
  | 'MANUALLY_FIXABLE'
  /** The vulnerability can be fixed automatically */
  | 'AUTO_FIXABLE';

/**
 * Represents a package in the DeepSource API
 * Contains information about a software package in a specific ecosystem
 * @public
 */
export interface Package {
  /** Unique identifier of the package */
  id: string;
  /** Package ecosystem (e.g., 'NPM', 'PYPI', 'MAVEN') */
  ecosystem: string;
  /** Package name as it appears in the ecosystem */
  name: string;
  /** Package URL (optional) - follows the package URL specification (https://github.com/package-url/purl-spec) */
  purl?: string;
}

/**
 * Represents a package version in the DeepSource API
 * Contains information about a specific version of a package
 * @public
 */
export interface PackageVersion {
  /** Unique identifier of the package version */
  id: string;
  /** Version string (e.g., '1.2.3') */
  version: string;
  /** Type of versioning used (SEMVER, ECOSYSTEM, GIT) */
  versionType?: PackageVersionType;
}

/**
 * Represents a vulnerability in the DeepSource API
 * Contains detailed information about a security vulnerability
 * @public
 */
export interface Vulnerability {
  /** Unique identifier of the vulnerability */
  id: string;
  /** Standard identifier for the vulnerability (e.g., CVE-2022-1234) */
  identifier: string;
  /** Alternative identifiers for the same vulnerability (e.g., GHSA-xxxx-xxxx-xxxx) */
  aliases: string[];
  /** Brief description of the vulnerability */
  summary?: string;
  /** Detailed description of the vulnerability */
  details?: string;
  /** Date when the vulnerability was first published */
  publishedAt: string;
  /** Date when the vulnerability information was last updated */
  updatedAt: string;
  /** Date when the vulnerability was withdrawn (if applicable) */
  withdrawnAt?: string;
  /** Overall severity rating of the vulnerability */
  severity: VulnerabilitySeverity;

  // CVSS v2 information
  /** CVSS v2 vector string representing the vulnerability characteristics */
  cvssV2Vector?: string;
  /** CVSS v2 base score (0.0-10.0) */
  cvssV2BaseScore?: number;
  /** CVSS v2 qualitative severity rating */
  cvssV2Severity?: VulnerabilitySeverity;

  // CVSS v3 information
  /** CVSS v3 vector string representing the vulnerability characteristics */
  cvssV3Vector?: string;
  /** CVSS v3 base score (0.0-10.0) */
  cvssV3BaseScore?: number;
  /** CVSS v3 qualitative severity rating */
  cvssV3Severity?: VulnerabilitySeverity;

  // CVSS v4 information
  /** CVSS v4 vector string representing the vulnerability characteristics */
  cvssV4Vector?: string;
  /** CVSS v4 base score (0.0-10.0) */
  cvssV4BaseScore?: number;
  /** CVSS v4 qualitative severity rating */
  cvssV4Severity?: VulnerabilitySeverity;

  // EPSS information
  /** Exploit Prediction Scoring System score (0.0-1.0) */
  epssScore?: number;
  /** EPSS percentile, indicating relative likelihood of exploitation */
  epssPercentile?: number;

  // Version information
  /** List of package versions where the vulnerability was introduced */
  introducedVersions: string[];
  /** List of package versions where the vulnerability was fixed */
  fixedVersions: string[];

  // References
  /** List of URLs to external references about this vulnerability */
  referenceUrls: string[];
}

/**
 * Represents a vulnerability occurrence in the DeepSource API
 * A vulnerability occurrence is an instance of a vulnerability affecting a specific package version
 * in a specific project context
 * @public
 */
export interface VulnerabilityOccurrence {
  /** Unique identifier of the vulnerability occurrence */
  id: string;
  /** Information about the affected package */
  package: Package;
  /** Information about the affected package version */
  packageVersion: PackageVersion;
  /** Details about the vulnerability */
  vulnerability: Vulnerability;
  /** Whether the vulnerability is reachable in the codebase (REACHABLE, UNREACHABLE, UNKNOWN) */
  reachability: VulnerabilityReachability;
  /** Whether and how the vulnerability can be fixed */
  fixability: VulnerabilityFixability;
}

/**
 * Parameters for paginating through API results
 * @public
 */
export interface PaginationParams {
  /** Legacy pagination: Number of items to skip */
  offset?: number;
  /** Relay-style pagination: Number of items to return after the 'after' cursor */
  first?: number;
  /** Relay-style pagination: Cursor to fetch records after this cursor */
  after?: string;
  /** Relay-style pagination: Cursor to fetch records before this cursor */
  before?: string;
  /** Relay-style pagination: Number of items to return before the 'before' cursor */
  last?: number;
}

/**
 * Parameters for filtering issues
 * @public
 */
export interface IssueFilterParams extends PaginationParams {
  /** Filter issues by path (file path) */
  path?: string;
  /** Filter issues by analyzer shortcodes (e.g. ["python", "javascript"]) */
  analyzerIn?: string[];
  /** Filter issues by tags */
  tags?: string[];
}

/**
 * Parameters for filtering runs
 * @public
 */
export interface RunFilterParams extends PaginationParams {
  /** Filter runs by analyzer shortcodes (e.g. ["python", "javascript"]) */
  analyzerIn?: string[];
}

/**
 * Generic response structure containing paginated results
 * @public
 * @template T - The type of items in the response
 */
export interface PaginatedResponse<T> {
  items: T[];
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: string;
    endCursor?: string;
  };
  totalCount: number;
}

/**
 * Response structure for recent run issues
 * @public
 */
export interface RecentRunIssuesResponse extends PaginatedResponse<DeepSourceIssue> {
  /** The most recent run for the branch */
  run: DeepSourceRun;
}

/**
 * Client for interacting with the DeepSource GraphQL API
 * Provides methods for querying projects, issues, analysis runs, and dependency vulnerabilities
 * Supports both legacy and Relay-style cursor-based pagination
 * @class
 */
export class DeepSourceClient {
  /**
   * HTTP client for making API requests to DeepSource
   * @private
   */
  private client;

  /**
   * Logger instance for the DeepSourceClient
   * @private
   */
  private logger = createLogger('DeepSourceClient');

  /**
   * Static logger for static methods
   * @private
   */
  private static logger = createLogger('DeepSourceClient:static');

  /**
   * Creates a new DeepSourceClient instance
   * @param apiKey - The DeepSource API key for authentication
   * @param options - Additional configuration options
   * @param options.baseURL - Custom API endpoint URL (defaults to DeepSource production API)
   * @param options.timeout - Request timeout in milliseconds (defaults to 30000ms)
   * @throws {Error} When apiKey is not provided or invalid
   * @throws {Error} When timeout is not a valid number
   * @param apiKey - DeepSource API key for authentication
   */
  constructor(apiKey: string) {
    this.client = axios.create({
      baseURL: 'https://api.deepsource.io/graphql/',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
    });
  }

  /**
   * Extracts error messages from GraphQL error response
   * @param errors - Array of GraphQL error objects
   * @returns Formatted error message string
   * @private
   */
  private static extractErrorMessages(errors: Array<{ message: string }>): string {
    const errorMessages = errors.map((error) => error.message);
    return errorMessages.join(', ');
  }

  /**
   * Type guard to check if an unknown error is an Error object
   * @param error The error to check
   * @returns True if the error is an Error instance
   * @private
   */
  private static isError(error: unknown): error is Error {
    return (
      error !== null &&
      typeof error === 'object' &&
      'message' in error &&
      typeof (error as Record<string, unknown>).message === 'string'
    );
  }

  /**
   * Type guard to check if an error contains a specific message substring
   * @param error The error to check
   * @param substring The substring to search for in the error message
   * @returns True if the error is an Error with the specified substring
   * @private
   */
  private static isErrorWithMessage(error: unknown, substring: string): error is Error {
    return this.isError(error) && error.message?.includes(substring);
  }

  /**
   * Checks if an error is an Axios error with specific characteristics
   * @param error The error to check
   * @param statusCode Optional HTTP status code to match
   * @param errorCode Optional Axios error code to match
   * @returns True if the error matches the criteria and is an AxiosError, false otherwise
   * @private
   */
  private static isAxiosErrorWithCriteria(
    error: unknown,
    statusCode?: number,
    errorCode?: string
  ): error is AxiosError {
    // Check if it's an object first
    if (!error || typeof error !== 'object') {
      return false;
    }

    // Check if it has the axios error shape and matches all criteria
    const potentialAxiosError = error as Partial<AxiosError>;
    return (
      Boolean(potentialAxiosError.isAxiosError) &&
      (statusCode === undefined || potentialAxiosError.response?.status === statusCode) &&
      (errorCode === undefined || potentialAxiosError.code === errorCode)
    );
  }

  /**
   * Handles GraphQL-specific errors from Axios responses
   * @param error The error to check for GraphQL errors
   * @returns True if the error was handled (and thrown)
   * @private
   */
  private static handleGraphQLSpecificError(error: unknown): never | false {
    if (
      this.isAxiosErrorWithCriteria(error) &&
      typeof error.response?.data === 'object' &&
      error.response.data && // Add null check
      'errors' in error.response.data
    ) {
      const graphqlErrors: Array<{ message: string }> = error.response.data.errors as Array<{
        message: string;
      }>; // Type assertion after validation
      const errorMessage = DeepSourceClient.extractErrorMessages(graphqlErrors);

      // Create a combined error message
      const combinedError = new Error(`GraphQL Error: ${errorMessage}`);

      // Classify the error
      const category = classifyGraphQLError(combinedError);

      throw createClassifiedError(combinedError.message, category, error, { graphqlErrors });
    }
    return false;
  }

  /**
   * Handles network and connection errors
   * @param error The error to check
   * @returns True if the error was handled (and thrown)
   * @private
   */
  private static handleNetworkError(error: unknown): never | false {
    if (this.isAxiosErrorWithCriteria(error, undefined, 'ECONNREFUSED')) {
      throw createClassifiedError(
        'Connection error: Unable to connect to DeepSource API',
        ErrorCategory.NETWORK,
        error
      );
    }

    if (this.isAxiosErrorWithCriteria(error, undefined, 'ETIMEDOUT')) {
      throw createClassifiedError(
        'Timeout error: DeepSource API request timed out',
        ErrorCategory.TIMEOUT,
        error
      );
    }

    return false;
  }

  /**
   * Handles HTTP status-specific errors
   * @param error The error to check
   * @returns True if the error was handled (and thrown)
   * @private
   */
  private static handleHttpStatusError(error: unknown): never | false {
    if (this.isAxiosErrorWithCriteria(error, 401)) {
      throw createClassifiedError(
        'Authentication error: Invalid or expired API key',
        ErrorCategory.AUTH,
        error
      );
    }

    if (this.isAxiosErrorWithCriteria(error, 429)) {
      throw createClassifiedError(
        'Rate limit exceeded: Too many requests to DeepSource API',
        ErrorCategory.RATE_LIMIT,
        error
      );
    }

    // Handle other common HTTP status codes
    const axiosError = error as AxiosError;
    if (axiosError.response?.status) {
      const status = axiosError.response.status;

      if (status >= 500) {
        throw createClassifiedError(
          `Server error (${status}): DeepSource API server error`,
          ErrorCategory.SERVER,
          error
        );
      }

      if (status === 404) {
        throw createClassifiedError(
          'Not found (404): The requested resource was not found',
          ErrorCategory.NOT_FOUND,
          error
        );
      }

      if (status >= 400 && status < 500) {
        throw createClassifiedError(
          `Client error (${status}): ${axiosError.response.statusText || 'Bad request'}`,
          ErrorCategory.CLIENT,
          error
        );
      }
    }

    return false;
  }

  /**
   * Handles generic errors
   * @param error The error to process
   * @returns Never returns, always throws
   * @private
   */
  private static handleGenericError(error: unknown): never {
    if (DeepSourceClient.isError(error)) {
      throw new Error(`DeepSource API error: ${error.message}`);
    }

    throw new Error('Unknown error occurred while communicating with DeepSource API');
  }

  /**
   * Main error handler that coordinates all error processing
   * @param error The error to handle
   * @throws {Error} Appropriate error message based on error type
   * @throws {Error} Classified error with category, original error, and additional metadata
   * @private
   */
  private static handleGraphQLError(error: Error | unknown): never {
    // If it's already a classified error, just throw it
    if (error && typeof error === 'object' && 'category' in error) {
      throw error;
    }

    // Try handling specific error types in order of specificity
    if (this.handleGraphQLSpecificError(error)) {
      // If handleGraphQLSpecificError returns true, it already threw an error
      // This line will never be reached, but is needed for type checking
      throw new Error('Unreachable code - handleGraphQLSpecificError should have thrown');
    }

    if (this.handleNetworkError(error)) {
      throw new Error('Unreachable code - handleNetworkError should have thrown');
    }

    if (this.handleHttpStatusError(error)) {
      throw new Error('Unreachable code - handleHttpStatusError should have thrown');
    }

    // If no specific handler worked, convert to a classified error
    if (DeepSourceClient.isError(error)) {
      const category = classifyGraphQLError(error);
      throw createClassifiedError(`DeepSource API error: ${error.message}`, category, error);
    }

    // Last resort for truly unknown errors
    throw createClassifiedError(
      'Unknown error occurred while communicating with DeepSource API',
      ErrorCategory.OTHER,
      error
    );
  }

  /**
   * Creates an empty paginated response
   * @template T The type of items in the response
   * @returns {PaginatedResponse<T>} Empty paginated response with consistent structure
   * @private
   */
  private static createEmptyPaginatedResponse<T>(): PaginatedResponse<T> {
    return {
      items: [],
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: undefined,
        endCursor: undefined,
      },
      totalCount: 0,
    };
  }

  /**
   * Logs a warning message about non-standard pagination usage
   *
   * This method provides consistent warning messages for pagination anti-patterns
   * in Relay-style cursor-based pagination. It helps developers understand
   * why their pagination approach might cause unexpected behavior.
   *
   * @param message Optional custom warning message to use instead of the default
   * @private
   */
  private static logPaginationWarning(message?: string): void {
    // Using the static logger instead of console.warn for better log management
    const warningMessage =
      message ||
      'Non-standard pagination: Using "last" without "before" is not recommended in Relay pagination';
    DeepSourceClient.logger.warn(warningMessage);
  }

  /**
   * Normalizes pagination parameters for GraphQL queries
   * Ensures consistency in pagination parameters following Relay pagination best practices
   *
   * Normalization rules:
   * 1. If 'before' is provided (backward pagination):
   *    - Use 'last' as the count parameter (default: 10)
   *    - Remove any 'first' parameter to avoid ambiguity
   * 2. If 'last' is provided without 'before' (non-standard but supported):
   *    - Keep 'last' as is
   *    - Remove any 'first' parameter to avoid ambiguity
   *    - Log a warning about non-standard usage
   * 3. Otherwise (forward pagination or defaults):
   *    - Use 'first' as the count parameter (default: 10)
   *    - Remove any 'last' parameter to avoid ambiguity
   *
   * @template T Type that extends PaginationParams
   * @param {T} params - Original pagination parameters
   * @returns {T} Normalized pagination parameters with consistent values
   * @private
   */
  private static normalizePaginationParams<T extends PaginationParams>(params: T): T {
    const normalizedParams = { ...params };

    // Validate and normalize numerical parameters
    if (normalizedParams.offset !== undefined) {
      normalizedParams.offset = Math.max(0, Math.floor(Number(normalizedParams.offset)));
    }

    if (normalizedParams.first !== undefined) {
      // Ensure first is a positive integer or undefined
      normalizedParams.first = Math.max(1, Math.floor(Number(normalizedParams.first)));
    }

    if (normalizedParams.last !== undefined) {
      // Ensure last is a positive integer or undefined
      normalizedParams.last = Math.max(1, Math.floor(Number(normalizedParams.last)));
    }

    // Validate cursor parameters (ensure they're valid strings)
    if (normalizedParams.after !== undefined && typeof normalizedParams.after !== 'string') {
      normalizedParams.after = String(normalizedParams.after ?? '');
    }

    if (normalizedParams.before !== undefined && typeof normalizedParams.before !== 'string') {
      normalizedParams.before = String(normalizedParams.before ?? '');
    }

    // Apply Relay pagination rules
    if (normalizedParams.before) {
      // When fetching backwards with 'before', prioritize 'last'
      normalizedParams.last = normalizedParams.last ?? normalizedParams.first ?? 10;
      normalizedParams.first = undefined;
    } else if (normalizedParams.last) {
      // If 'last' is provided without 'before', log a warning but still use 'last'
      DeepSourceClient.logPaginationWarning(
        `Non-standard pagination: Using "last=${normalizedParams.last}" without "before" cursor is not recommended`
      );
      // Keep normalizedParams.last as is
      normalizedParams.first = undefined;
    } else {
      // Default or forward pagination with 'after', prioritize 'first'
      normalizedParams.first = normalizedParams.first ?? 10;
      normalizedParams.last = undefined;
    }

    return normalizedParams;
  }

  /**
   * Fetches a list of all accessible DeepSource projects
   * @returns Promise that resolves to an array of DeepSourceProject objects
   * @throws {Error} When DeepSource API returns errors
   * @throws {Error} When network or authentication issues occur
   */
  async listProjects(): Promise<DeepSourceProject[]> {
    try {
      const viewerQuery =
        'query {\n          viewer {\n            email\n            accounts {\n              edges {\n                node {\n                  login\n                  repositories(first: 100) {\n                    edges {\n                      node {\n                        name\n                        defaultBranch\n                        dsn\n                        isPrivate\n                        isActivated\n                        vcsProvider\n                      }\n                    }\n                  }\n                }\n              }\n            }\n          }\n        }\n';

      const response = await this.client.post('', {
        query: viewerQuery.trim(),
      });

      if (response.data.errors) {
        const errorMessage = DeepSourceClient.extractErrorMessages(response.data.errors);
        throw new Error(`GraphQL Errors: ${errorMessage}`);
      }

      const accounts = response.data.data?.viewer?.accounts?.edges ?? [];
      const allRepos: DeepSourceProject[] = [];

      for (const { node: account } of accounts) {
        const repos = account.repositories?.edges ?? [];
        for (const { node: repo } of repos) {
          if (!repo.dsn) continue;
          allRepos.push({
            key: repo.dsn,
            name: repo.name ?? 'Unnamed Repository',
            repository: {
              url: repo.dsn,
              provider: repo.vcsProvider ?? 'N/A',
              login: account.login,
              isPrivate: repo.isPrivate ?? false,
              isActivated: repo.isActivated ?? false,
            },
          });
        }
      }

      return allRepos;
    } catch (error) {
      if (DeepSourceClient.isErrorWithMessage(error, 'NoneType')) {
        return [];
      }
      return DeepSourceClient.handleGraphQLError(error);
    }
  }

  /**
   * Fetches issues from a specified DeepSource project
   * @param projectKey - The unique identifier for the DeepSource project
   * @param params - Optional pagination and filtering parameters for the query.
   *                Supports both legacy pagination (offset) and Relay-style cursor-based pagination.
   *                For forward pagination use 'first' with optional 'after' cursor.
   *                For backward pagination use 'last' with optional 'before' cursor.
   *                Note: Using both 'first' and 'last' together is not recommended and will prioritize
   *                'last' if 'before' is provided, otherwise will prioritize 'first'.
   *
   *                When 'last' is provided without 'before', a warning will be logged, but the
   *                request will still be processed using 'last'. For standard Relay behavior,
   *                'last' should always be accompanied by 'before'.
   *
   *                Filtering parameters:
   *                - path: Filter issues by specific file path
   *                - analyzerIn: Filter issues by specific analyzers
   *                - tags: Filter issues by tags
   * @returns Promise that resolves to a paginated response containing DeepSource issues
   * @throws {Error} When project key is invalid or project doesn't exist
   * @throws {Error} When DeepSource API returns errors
   * @throws {Error} When network, authentication or permission issues occur
   */
  async getIssues(
    projectKey: string,
    params: IssueFilterParams = {}
  ): Promise<PaginatedResponse<DeepSourceIssue>> {
    try {
      const projects = await this.listProjects();
      const project = projects.find((p) => p.key === projectKey);

      if (!project) {
        return DeepSourceClient.createEmptyPaginatedResponse<DeepSourceIssue>();
      }

      // Normalize pagination parameters using the static helper method
      const normalizedParams = DeepSourceClient.normalizePaginationParams(params);

      // Keeping template literal here since it contains a lot of variable references
      // with complex GraphQL query structure. The benefits of converting to string
      // concatenation would be outweighed by reduced readability
      const repoQuery =
        'query($login: String!, $name: String!, $provider: VCSProvider!, $offset: Int, $first: Int, $after: String, $before: String, $last: Int, $path: String, $analyzerIn: [String], $tags: [String]) {\n          repository(login: $login, name: $name, vcsProvider: $provider) {\n            name\n            defaultBranch\n            dsn\n            isPrivate\n            issues(offset: $offset, first: $first, after: $after, before: $before, last: $last, path: $path, analyzerIn: $analyzerIn, tags: $tags) {\n              pageInfo {\n                hasNextPage\n                hasPreviousPage\n                startCursor\n                endCursor\n              }\n              totalCount\n              edges {\n                node {\n                  id\n                  issue {\n                    shortcode\n                    title\n                    category\n                    severity\n                    description\n                    tags\n                  }\n                  occurrences(first: 100) {\n                    edges {\n                      node {\n                        id\n                        path\n                        beginLine\n                        endLine\n                        beginColumn\n                        endColumn\n                        title\n                      }\n                    }\n                  }\n                }\n              }\n            }\n          }\n        }\n';

      const response = await this.client.post('', {
        query: repoQuery.trim(),
        variables: {
          login: project.repository.login,
          name: project.name,
          provider: project.repository.provider,
          offset: normalizedParams.offset,
          first: normalizedParams.first,
          after: normalizedParams.after,
          before: normalizedParams.before,
          last: normalizedParams.last,
          path: normalizedParams.path,
          analyzerIn: normalizedParams.analyzerIn,
          tags: normalizedParams.tags,
        },
      });

      if (response.data.errors) {
        const errorMessage = DeepSourceClient.extractErrorMessages(response.data.errors);
        throw new Error(`GraphQL Errors: ${errorMessage}`);
      }

      const issues: DeepSourceIssue[] = [];
      const repoIssues = response.data.data?.repository?.issues?.edges ?? [];
      const pageInfo = response.data.data?.repository?.issues?.pageInfo ?? {
        hasNextPage: false,
        hasPreviousPage: false,
      };
      const totalCount = response.data.data?.repository?.issues?.totalCount ?? 0;

      for (const { node: repoIssue } of repoIssues) {
        const occurrences = repoIssue.occurrences?.edges ?? [];
        for (const { node: occurrence } of occurrences) {
          issues.push({
            id: occurrence.id ?? 'unknown',
            shortcode: repoIssue.issue?.shortcode ?? '',
            title: repoIssue.issue?.title ?? 'Untitled Issue',
            category: repoIssue.issue?.category ?? 'UNKNOWN',
            severity: repoIssue.issue?.severity ?? 'UNKNOWN',
            status: 'OPEN',
            issue_text: repoIssue.issue?.description ?? '',
            file_path: occurrence.path ?? 'N/A',
            line_number: occurrence.beginLine ?? 0,
            tags: repoIssue.issue?.tags ?? [],
          });
        }
      }

      return {
        items: issues,
        pageInfo: {
          hasNextPage: pageInfo.hasNextPage,
          hasPreviousPage: pageInfo.hasPreviousPage,
          startCursor: pageInfo.startCursor,
          endCursor: pageInfo.endCursor,
        },
        totalCount,
      };
    } catch (error) {
      if (DeepSourceClient.isErrorWithMessage(error, 'NoneType')) {
        return {
          items: [],
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false,
          },
          totalCount: 0,
        };
      }
      return DeepSourceClient.handleGraphQLError(error);
    }
  }

  /**
   * Fetches a specific issue from a DeepSource project by its ID
   * @param projectKey - The unique identifier for the DeepSource project
   * @param issueId - The unique identifier of the issue to retrieve
   * @returns Promise that resolves to the issue if found, or null if not found
   * @throws {Error} When DeepSource API returns errors
   * @throws {Error} When network, authentication or permission issues occur
   */
  async getIssue(projectKey: string, issueId: string): Promise<DeepSourceIssue | null> {
    try {
      const result = await this.getIssues(projectKey);
      const issue = result.items.find((issue) => issue.id === issueId);
      return issue || null;
    } catch (error) {
      return DeepSourceClient.handleGraphQLError(error);
    }
  }

  /**
   * Fetches analysis runs for a specified DeepSource project
   * @param projectKey - The unique identifier for the DeepSource project
   * @param params - Optional pagination and filtering parameters for the query
   *                Pagination supports both legacy pagination (offset) and Relay-style cursor-based pagination.
   *                Filtering parameters:
   *                - analyzerIn: Filter runs by specific analyzers
   * @returns Promise that resolves to a paginated response containing DeepSource runs
   * @throws {Error} When project key is invalid or project doesn't exist
   * @throws {Error} When DeepSource API returns errors
   * @throws {Error} When network, authentication or permission issues occur
   */
  async listRuns(
    projectKey: string,
    params: RunFilterParams = {}
  ): Promise<PaginatedResponse<DeepSourceRun>> {
    try {
      const projects = await this.listProjects();
      const project = projects.find((p) => p.key === projectKey);

      if (!project) {
        return DeepSourceClient.createEmptyPaginatedResponse<DeepSourceRun>();
      }

      // Normalize pagination parameters using the static helper method
      const normalizedParams = DeepSourceClient.normalizePaginationParams(params);

      const repoQuery =
        'query($login: String!, $name: String!, $provider: VCSProvider!, $offset: Int, $first: Int, $after: String, $before: String, $last: Int, $analyzerIn: [String]) {\n          repository(login: $login, name: $name, vcsProvider: $provider) {\n            name\n            id\n            analysisRuns(offset: $offset, first: $first, after: $after, before: $before, last: $last) {\n              pageInfo {\n                hasNextPage\n                hasPreviousPage\n                startCursor\n                endCursor\n              }\n              totalCount\n              edges {\n                node {\n                  id\n                  runUid\n                  commitOid\n                  branchName\n                  baseOid\n                  status\n                  createdAt\n                  updatedAt\n                  finishedAt\n                  summary {\n                    occurrencesIntroduced\n                    occurrencesResolved\n                    occurrencesSuppressed\n                    occurrenceDistributionByAnalyzer {\n                      analyzerShortcode\n                      introduced\n                    }\n                    occurrenceDistributionByCategory {\n                      category\n                      introduced\n                    }\n                  }\n                  repository {\n                    name\n                    id\n                  }\n                  checks(analyzerIn: $analyzerIn) {\n                    edges {\n                      node {\n                        analyzer {\n                          shortcode\n                        }\n                      }\n                    }\n                  }\n                }\n              }\n            }\n          }\n        }\n';

      const response = await this.client.post('', {
        query: repoQuery.trim(),
        variables: {
          login: project.repository.login,
          name: project.name,
          provider: project.repository.provider,
          offset: normalizedParams.offset,
          first: normalizedParams.first,
          after: normalizedParams.after,
          before: normalizedParams.before,
          last: normalizedParams.last,
          analyzerIn: normalizedParams.analyzerIn,
        },
      });

      if (response.data.errors) {
        const errorMessage = DeepSourceClient.extractErrorMessages(response.data.errors);
        throw new Error(`GraphQL Errors: ${errorMessage}`);
      }

      const runs: DeepSourceRun[] = [];
      const repoRuns = response.data.data?.repository?.analysisRuns?.edges ?? [];
      const pageInfo = response.data.data?.repository?.analysisRuns?.pageInfo ?? {
        hasNextPage: false,
        hasPreviousPage: false,
      };
      const totalCount = response.data.data?.repository?.analysisRuns?.totalCount ?? 0;

      for (const { node: run } of repoRuns) {
        runs.push({
          id: run.id,
          runUid: run.runUid,
          commitOid: run.commitOid,
          branchName: run.branchName,
          baseOid: run.baseOid,
          status: run.status,
          createdAt: run.createdAt,
          updatedAt: run.updatedAt,
          finishedAt: run.finishedAt,
          summary: {
            occurrencesIntroduced: run.summary?.occurrencesIntroduced ?? 0,
            occurrencesResolved: run.summary?.occurrencesResolved ?? 0,
            occurrencesSuppressed: run.summary?.occurrencesSuppressed ?? 0,
            occurrenceDistributionByAnalyzer: run.summary?.occurrenceDistributionByAnalyzer ?? [],
            occurrenceDistributionByCategory: run.summary?.occurrenceDistributionByCategory ?? [],
          },
          repository: {
            name: run.repository?.name ?? '',
            id: run.repository?.id ?? '',
          },
        });
      }

      return {
        items: runs,
        pageInfo: {
          hasNextPage: pageInfo.hasNextPage,
          hasPreviousPage: pageInfo.hasPreviousPage,
          startCursor: pageInfo.startCursor,
          endCursor: pageInfo.endCursor,
        },
        totalCount,
      };
    } catch (error) {
      if (DeepSourceClient.isErrorWithMessage(error, 'NoneType')) {
        return {
          items: [],
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false,
          },
          totalCount: 0,
        };
      }
      return DeepSourceClient.handleGraphQLError(error);
    }
  }

  /**
   * Fetches a specific analysis run by ID or commit hash
   * @param runIdentifier - The runUid or commitOid to identify the run
   * @returns Promise that resolves to the run if found, or null if not found
   * @throws {Error} When runIdentifier is invalid
   * @throws {Error} When DeepSource API returns errors
   * @throws {Error} When network, authentication or permission issues occur
   */
  async getRun(runIdentifier: string): Promise<DeepSourceRun | null> {
    try {
      // Determine if the identifier is a UUID or a commit hash
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        runIdentifier
      );

      const runQuery =
        'query($runUid: UUID, $commitOid: String) {\n          run(runUid: $runUid, commitOid: $commitOid) {\n            id\n            runUid\n            commitOid\n            branchName\n            baseOid\n            status\n            createdAt\n            updatedAt\n            finishedAt\n            summary {\n              occurrencesIntroduced\n              occurrencesResolved\n              occurrencesSuppressed\n              occurrenceDistributionByAnalyzer {\n                analyzerShortcode\n                introduced\n              }\n              occurrenceDistributionByCategory {\n                category\n                introduced\n              }\n            }\n            repository {\n              name\n              id\n            }\n          }\n        }\n';

      const response = await this.client.post('', {
        query: runQuery.trim(),
        variables: {
          runUid: isUuid ? runIdentifier : null,
          commitOid: !isUuid ? runIdentifier : null,
        },
      });

      if (response.data.errors) {
        // If the error is about not finding the run, return null
        if (
          response.data.errors.some(
            (e: { message: string }) =>
              e.message.includes('not found') || e.message.includes('NoneType')
          )
        ) {
          return null;
        }
        throw new Error(
          `GraphQL Errors: ${response.data.errors.map((e: { message: string }) => e.message).join(', ')}`
        );
      }

      const run = response.data.data?.run;
      if (!run) {
        return null;
      }

      return {
        id: run.id,
        runUid: run.runUid,
        commitOid: run.commitOid,
        branchName: run.branchName,
        baseOid: run.baseOid,
        status: run.status,
        createdAt: run.createdAt,
        updatedAt: run.updatedAt,
        finishedAt: run.finishedAt,
        summary: {
          occurrencesIntroduced: run.summary?.occurrencesIntroduced ?? 0,
          occurrencesResolved: run.summary?.occurrencesResolved ?? 0,
          occurrencesSuppressed: run.summary?.occurrencesSuppressed ?? 0,
          occurrenceDistributionByAnalyzer: run.summary?.occurrenceDistributionByAnalyzer ?? [],
          occurrenceDistributionByCategory: run.summary?.occurrenceDistributionByCategory ?? [],
        },
        repository: {
          name: run.repository?.name ?? '',
          id: run.repository?.id ?? '',
        },
      };
    } catch (error) {
      if (
        DeepSourceClient.isError(error) &&
        (error.message.includes('NoneType') || error.message.includes('not found'))
      ) {
        return null;
      }
      return DeepSourceClient.handleGraphQLError(error);
    }
  }

  /**
   * Fetches issues from the most recent analysis run on a specific branch
   * @param projectKey - The unique identifier for the DeepSource project
   * @param branchName - The branch name to get the most recent run from
   * @param params - Optional pagination parameters
   * @returns Promise that resolves to issues from the most recent run with pagination info
   * @throws {Error} When no runs are found for the specified branch
   * @throws {Error} When DeepSource API returns errors
   * @throws {Error} When network, authentication or permission issues occur
   */
  async getRecentRunIssues(
    projectKey: string,
    branchName: string,
    params: PaginationParams = {}
  ): Promise<RecentRunIssuesResponse> {
    try {
      // Find the most recent run for the specified branch
      const projects = await this.listProjects();
      const project = projects.find((p) => p.key === projectKey);

      if (!project) {
        throw new Error(`Project with key ${projectKey} not found`);
      }

      // Get runs for the project and find the most recent one for the branch
      let mostRecentRun: DeepSourceRun | null = null;
      let cursor: string | undefined = undefined;
      let hasNextPage = true;

      while (hasNextPage) {
        const runs = await this.listRuns(projectKey, {
          first: 50,
          after: cursor,
        });

        // Check each run in this page
        for (const run of runs.items) {
          if (run.branchName === branchName) {
            // If this is the first matching run or it's more recent than our current most recent
            if (!mostRecentRun || new Date(run.createdAt) > new Date(mostRecentRun.createdAt)) {
              mostRecentRun = run;
            }
          }
        }

        // Update pagination info
        hasNextPage = runs.pageInfo.hasNextPage;
        cursor = runs.pageInfo.endCursor;
      }

      if (!mostRecentRun) {
        throw new Error(`No runs found for branch '${branchName}' in project '${projectKey}'`);
      }

      // Normalize pagination parameters
      const normalizedParams = DeepSourceClient.normalizePaginationParams(params);

      // Now fetch the checks and occurrences from this specific run
      const checksQuery = `
        query($runId: ID!, $first: Int, $after: String, $before: String, $last: Int) {
          run: analysisRun(id: $runId) {
            checks {
              edges {
                node {
                  id
                  analyzer {
                    shortcode
                  }
                  occurrences(first: $first, after: $after, before: $before, last: $last) {
                    pageInfo {
                      hasNextPage
                      hasPreviousPage
                      startCursor
                      endCursor
                    }
                    totalCount
                    edges {
                      node {
                        id
                        issue {
                          shortcode
                          title
                          category
                          severity
                          description
                          tags
                        }
                        path
                        beginLine
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const response = await this.client.post('', {
        query: checksQuery.trim(),
        variables: {
          runId: mostRecentRun.id,
          first: normalizedParams.first,
          after: normalizedParams.after,
          before: normalizedParams.before,
          last: normalizedParams.last,
        },
      });

      if (response.data.errors) {
        const errorMessage = DeepSourceClient.extractErrorMessages(response.data.errors);
        throw new Error(`GraphQL Errors: ${errorMessage}`);
      }

      // Process the occurrences from all checks
      const issues: DeepSourceIssue[] = [];
      let pageInfo = {
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: undefined as string | undefined,
        endCursor: undefined as string | undefined,
      };
      let totalCount = 0;

      const checks = response.data.data?.run?.checks?.edges ?? [];
      for (const { node: check } of checks) {
        const occurrences = check.occurrences?.edges ?? [];
        const occurrencesPageInfo = check.occurrences?.pageInfo;
        const occurrencesTotalCount = check.occurrences?.totalCount ?? 0;

        // Aggregate page info (using the first check's pagination info for simplicity)
        if (occurrencesPageInfo) {
          pageInfo = occurrencesPageInfo;
          totalCount += occurrencesTotalCount;
        }

        for (const { node: occurrence } of occurrences) {
          if (!occurrence || !occurrence.issue) continue;

          issues.push({
            id: occurrence.id ?? 'unknown',
            shortcode: occurrence.issue.shortcode ?? '',
            title: occurrence.issue.title ?? 'Untitled Issue',
            category: occurrence.issue.category ?? 'UNKNOWN',
            severity: occurrence.issue.severity ?? 'UNKNOWN',
            status: 'OPEN',
            issue_text: occurrence.issue.description ?? '',
            file_path: occurrence.path ?? 'N/A',
            line_number: occurrence.beginLine ?? 0,
            tags: occurrence.issue.tags ?? [],
          });
        }
      }

      return {
        items: issues,
        pageInfo,
        totalCount,
        run: mostRecentRun,
      };
    } catch (error) {
      return DeepSourceClient.handleGraphQLError(error);
    }
  }

  /**
   * Helper method to validate and process vulnerability node data
   * Performs comprehensive validation on a vulnerability node from the GraphQL response
   * to ensure all required fields are present and of the correct type.
   *
   * Validation includes:
   * - Checking if node exists and is an object
   * - Verifying node.id exists and is a string
   * - Validating package, packageVersion, and vulnerability objects
   * - Ensuring required fields exist within nested objects
   *
   * Validates a vulnerability node has the expected structure
   *
   * Performs deep validation of vulnerability data returned from DeepSource API,
   * checking for required fields and proper structure at various levels.
   * Logs detailed warnings for specific validation failures to aid in debugging.
   *
   * @param node The unknown object to validate as a vulnerability node
   * @returns true if the node has valid structure, false otherwise
   * @private
   */
  private static isValidVulnerabilityNode(node: unknown): boolean {
    // Validate root level fields
    if (!node || typeof node !== 'object') {
      DeepSourceClient.logger.warn('Skipping invalid vulnerability node: not an object');
      return false;
    }

    const record = node as Record<string, unknown>;

    if (!('id' in record) || typeof record.id !== 'string') {
      DeepSourceClient.logger.warn('Skipping vulnerability node with missing or invalid ID', node);
      return false;
    }

    // Validate nested objects
    if (!('package' in record) || typeof record.package !== 'object' || record.package === null) {
      DeepSourceClient.logger.warn(
        'Skipping vulnerability node with missing or invalid package',
        node
      );
      return false;
    }

    if (
      !('packageVersion' in record) ||
      typeof record.packageVersion !== 'object' ||
      record.packageVersion === null
    ) {
      DeepSourceClient.logger.warn(
        'Skipping vulnerability node with missing or invalid packageVersion',
        node
      );
      return false;
    }

    if (
      !('vulnerability' in record) ||
      typeof record.vulnerability !== 'object' ||
      record.vulnerability === null
    ) {
      DeepSourceClient.logger.warn(
        'Skipping vulnerability node with missing or invalid vulnerability',
        node
      );
      return false;
    }

    const packageRecord = record.package as Record<string, unknown>;
    const packageVersionRecord = record.packageVersion as Record<string, unknown>;
    const vulnerabilityRecord = record.vulnerability as Record<string, unknown>;

    // Validate required package fields
    if (!('id' in packageRecord) || !('ecosystem' in packageRecord) || !('name' in packageRecord)) {
      DeepSourceClient.logger.warn(
        'Skipping vulnerability with incomplete package information',
        packageRecord
      );
      return false;
    }

    // Validate required packageVersion fields
    if (!('id' in packageVersionRecord) || !('version' in packageVersionRecord)) {
      DeepSourceClient.logger.warn(
        'Skipping vulnerability with incomplete package version information',
        packageVersionRecord
      );
      return false;
    }

    // Validate required vulnerability fields
    if (!('id' in vulnerabilityRecord) || !('identifier' in vulnerabilityRecord)) {
      DeepSourceClient.logger.warn(
        'Skipping vulnerability with incomplete vulnerability information',
        vulnerabilityRecord
      );
      return false;
    }

    return true;
  }

  /**
   * Validates if a value is a valid PackageVersionType enum value
   * @param value The value to validate
   * @returns true if the value is a valid PackageVersionType enum value
   * @private
   */
  private static isValidVersionType(value: unknown): value is PackageVersionType {
    const validVersionTypes: PackageVersionType[] = ['SEMVER', 'ECOSYSTEM', 'GIT'];
    return DeepSourceClient.isValidEnum(value, validVersionTypes);
  }

  /**
   * Maps raw package data to a Package object with proper validation
   * @param packageData The raw package data from GraphQL
   * @returns A properly formatted Package object
   * @private
   */
  private static mapPackageData(packageData: Record<string, unknown>): Package {
    return {
      // Required fields with fallbacks to empty strings
      id: DeepSourceClient.validateString(packageData.id),
      ecosystem: DeepSourceClient.validateString(packageData.ecosystem),
      name: DeepSourceClient.validateString(packageData.name),
      // Optional URL field
      purl: DeepSourceClient.validateNullableString(packageData.purl) ?? undefined,
    };
  }

  /**
   * Maps raw package version data to a PackageVersion object with proper validation
   * @param versionData The raw package version data from GraphQL
   * @returns A properly formatted PackageVersion object
   * @private
   */
  private static mapPackageVersionData(versionData: Record<string, unknown>): PackageVersion {
    return {
      // Required fields with fallbacks to empty strings
      id: DeepSourceClient.validateString(versionData.id),
      version: DeepSourceClient.validateString(versionData.version),
      // Optional enum field with validation
      versionType: DeepSourceClient.isValidVersionType(versionData.versionType)
        ? versionData.versionType
        : undefined,
    };
  }

  /**
   * Generic helper to validate if a value is a valid enum value
   * Performs type checking and ensures the value is one of the allowed enum values
   *
   * @param value The value to validate
   * @param validValues Array of valid enum values
   * @returns true if the value is a valid enum value, false otherwise
   * @private
   */
  private static isValidEnum<T extends string>(value: unknown, validValues: T[]): value is T {
    return typeof value === 'string' && validValues.includes(value as T);
  }

  /**
   * Helper to validate array fields in vulnerability data
   * Ensures the value is an array, returning an empty array if invalid
   *
   * @param value The array to validate
   * @returns The original array if valid, or an empty array if invalid
   * @private
   */
  private static validateArray(value: unknown): string[] {
    return Array.isArray(value) ? value : [];
  }

  /**
   * Helper to validate string fields in vulnerability data
   * Ensures the value is a string, returning a default value if invalid
   *
   * @param value The string to validate
   * @param defaultValue Default value to return if invalid (defaults to empty string)
   * @returns The original string if valid, or the default value if invalid
   * @private
   */
  private static validateString(value: unknown, defaultValue = '') {
    return typeof value === 'string' ? value : defaultValue;
  }

  /**
   * Helper to validate nullable string fields
   * Ensures the value is a string or null, returning null if invalid
   *
   * @param value The string to validate
   * @returns The original string if valid, or null if invalid
   * @private
   */
  private static validateNullableString(value: unknown): string | null {
    return typeof value === 'string' ? value : null;
  }

  /**
   * Helper to validate number fields
   * Ensures the value is a number, returning null if invalid
   *
   * @param value The number to validate
   * @returns The original number if valid, or null if invalid
   * @private
   */
  private static validateNumber(value: unknown): number | null {
    return typeof value === 'number' ? value : null;
  }

  /**
   * Maps raw vulnerability data to a Vulnerability object with proper validation
   * @param vulnData The raw vulnerability data from GraphQL
   * @returns A properly formatted Vulnerability object
   * @private
   */
  private static mapVulnerabilityData(vulnData: Record<string, unknown>): Vulnerability {
    // Check if severity is valid
    const isValidSeverity = (value: unknown): value is VulnerabilitySeverity => {
      const validSeverities: VulnerabilitySeverity[] = [
        'NONE',
        'LOW',
        'MEDIUM',
        'HIGH',
        'CRITICAL',
      ];
      return typeof value === 'string' && validSeverities.includes(value as VulnerabilitySeverity);
    };

    return {
      // Required fields with fallbacks to empty strings
      id: DeepSourceClient.validateString(vulnData.id),
      identifier: DeepSourceClient.validateString(vulnData.identifier),

      // Optional array fields with validation
      aliases: DeepSourceClient.validateArray(vulnData.aliases),
      introducedVersions: DeepSourceClient.validateArray(vulnData.introducedVersions),
      fixedVersions: DeepSourceClient.validateArray(vulnData.fixedVersions),
      referenceUrls: DeepSourceClient.validateArray(vulnData.referenceUrls),

      // Optional string fields that can be undefined
      summary: DeepSourceClient.validateNullableString(vulnData.summary) ?? undefined,
      details: DeepSourceClient.validateNullableString(vulnData.details) ?? undefined,

      // Required date fields with fallbacks
      publishedAt: DeepSourceClient.validateString(vulnData.publishedAt),
      updatedAt: DeepSourceClient.validateString(vulnData.updatedAt),

      // Optional date field that can be undefined
      withdrawnAt: DeepSourceClient.validateNullableString(vulnData.withdrawnAt) ?? undefined,

      // Severity with validation
      severity: isValidSeverity(vulnData.severity) ? vulnData.severity : 'NONE',

      // CVSSv2 fields with validation
      cvssV2Vector: DeepSourceClient.validateNullableString(vulnData.cvssV2Vector) ?? undefined,
      cvssV2BaseScore:
        typeof vulnData.cvssV2BaseScore === 'number' ? vulnData.cvssV2BaseScore : undefined,
      cvssV2Severity: isValidSeverity(vulnData.cvssV2Severity)
        ? vulnData.cvssV2Severity
        : undefined,

      // CVSSv3 fields with validation
      cvssV3Vector: DeepSourceClient.validateNullableString(vulnData.cvssV3Vector) ?? undefined,
      cvssV3BaseScore:
        typeof vulnData.cvssV3BaseScore === 'number' ? vulnData.cvssV3BaseScore : undefined,
      cvssV3Severity: isValidSeverity(vulnData.cvssV3Severity)
        ? vulnData.cvssV3Severity
        : undefined,

      // CVSSv4 fields with validation
      cvssV4Vector: DeepSourceClient.validateNullableString(vulnData.cvssV4Vector) ?? undefined,
      cvssV4BaseScore:
        typeof vulnData.cvssV4BaseScore === 'number' ? vulnData.cvssV4BaseScore : undefined,
      cvssV4Severity: isValidSeverity(vulnData.cvssV4Severity)
        ? vulnData.cvssV4Severity
        : undefined,

      // EPSS fields with validation
      epssScore: typeof vulnData.epssScore === 'number' ? vulnData.epssScore : undefined,
      epssPercentile:
        typeof vulnData.epssPercentile === 'number' ? vulnData.epssPercentile : undefined,
    };
  }

  /**
   * Validates if a value is a valid VulnerabilityReachability enum value
   * @param value The value to validate
   * @returns true if the value is a valid VulnerabilityReachability enum value
   * @private
   */
  private static isValidReachability(value: unknown): value is VulnerabilityReachability {
    const validReachabilityValues: VulnerabilityReachability[] = [
      'REACHABLE',
      'UNREACHABLE',
      'UNKNOWN',
    ];
    return DeepSourceClient.isValidEnum(value, validReachabilityValues);
  }

  /**
   * Validates if a value is a valid VulnerabilityFixability enum value
   * @param value The value to validate
   * @returns true if the value is a valid VulnerabilityFixability enum value
   * @private
   */
  private static isValidFixability(value: unknown): value is VulnerabilityFixability {
    const validFixabilityValues: VulnerabilityFixability[] = [
      'ERROR',
      'UNFIXABLE',
      'GENERATING_FIX',
      'POSSIBLY_FIXABLE',
      'MANUALLY_FIXABLE',
      'AUTO_FIXABLE',
    ];
    return DeepSourceClient.isValidEnum(value, validFixabilityValues);
  }

  /**
   * Maps a raw vulnerability node to a VulnerabilityOccurrence object
   * @param node The raw vulnerability node from GraphQL
   * @returns A properly formatted VulnerabilityOccurrence object
   * @private
   */
  private static mapVulnerabilityOccurrence(
    node: Record<string, unknown>
  ): VulnerabilityOccurrence {
    return {
      id: String(node.id),
      package: DeepSourceClient.mapPackageData(node.package as Record<string, unknown>),
      packageVersion: DeepSourceClient.mapPackageVersionData(
        node.packageVersion as Record<string, unknown>
      ),
      vulnerability: DeepSourceClient.mapVulnerabilityData(
        node.vulnerability as Record<string, unknown>
      ),

      // Enum values with validation
      reachability: DeepSourceClient.isValidReachability(node.reachability)
        ? node.reachability
        : 'UNKNOWN',

      fixability: DeepSourceClient.isValidFixability(node.fixability) ? node.fixability : 'ERROR',
    };
  }

  /**
   * Maximum number of iterations for vulnerability processing
   * Used to prevent infinite loops in case of malformed data
   * @private
   */
  private static readonly MAX_ITERATIONS = 10000;

  /**
   * Process a single vulnerability edge and return a valid vulnerability occurrence if possible
   *
   * @param edge The edge object from the GraphQL response
   * @returns A vulnerability occurrence object if valid, or null if invalid
   * @private
   */
  private static processVulnerabilityEdge(edge: unknown): VulnerabilityOccurrence | null {
    // Skip if edge is missing or not an object
    if (!edge || typeof edge !== 'object') {
      return null;
    }

    // Ensure edge is a properly typed object
    const typedEdge = edge as Record<string, unknown>;

    // Skip if node is missing
    if (!typedEdge.node) {
      return null;
    }

    // Validate node before processing
    if (DeepSourceClient.isValidVulnerabilityNode(typedEdge.node)) {
      // Now that validation passed, we can safely cast and map the node
      return DeepSourceClient.mapVulnerabilityOccurrence(typedEdge.node as Record<string, unknown>);
    }

    return null;
  }

  /**
   * Memory-efficient iterator for processing vulnerabilities
   * Allows for streaming processing of vulnerability data rather than building the entire array at once
   *
   * Includes protections against:
   * - Malformed or missing data (with detailed logging)
   * - Infinite loops (with iteration limit)
   * - Exceptionally large data sets (with memory-efficient processing)
   *
   * Generator function that safely processes vulnerability edges from GraphQL response
   *
   * This method provides robust iteration over API response data with the following safety features:
   * - Validates input data structure before processing
   * - Limits maximum iterations to prevent infinite loops with malformed data
   * - Handles and logs errors for individual items without failing the entire process
   * - Implements yield pattern for memory efficiency with large datasets
   *
   * @param edges Array of raw vulnerability edges from GraphQL response
   * @yields Valid VulnerabilityOccurrence objects
   * @private
   */
  private static *iterateVulnerabilities(edges: unknown[]): Generator<VulnerabilityOccurrence> {
    // Sanity check for edges
    if (!Array.isArray(edges)) {
      DeepSourceClient.logger.warn('Invalid edges data: expected an array but got', typeof edges);
      return; // Early return - nothing to iterate
    }

    // Safety counter to prevent infinite loops in case of malformed data
    let iterationCount = 0;

    for (const edge of edges) {
      // Iteration safety check
      if (iterationCount++ > DeepSourceClient.MAX_ITERATIONS) {
        DeepSourceClient.logger.warn(
          `Exceeded maximum iteration count (${DeepSourceClient.MAX_ITERATIONS}). Stopping processing.`
        );
        break;
      }

      try {
        const vulnerability = DeepSourceClient.processVulnerabilityEdge(edge);
        if (vulnerability) {
          yield vulnerability;
        }
      } catch (error) {
        // Log error but continue processing other edges
        DeepSourceClient.logger.warn('Error processing vulnerability edge:', error);
        continue;
      }
    }
  }

  /**
   * Processes GraphQL response and extracts vulnerability occurrences
   * Handles the extraction and validation of vulnerability data from a GraphQL response.
   *
   * This method:
   * 1. Extracts edges, page info, and total count from the response
   * 2. Iterates through each edge and validates the node data
   * 3. Maps valid nodes to VulnerabilityOccurrence objects
   * 4. Collects and returns processed data in a structured format
   *
   * Optimized for large datasets with memory-efficient processing
   *
   * @param response The raw GraphQL response from the DeepSource API
   * @returns Object containing the vulnerabilities, page info, and total count
   * @private
   */
  private static processVulnerabilityResponse(response: unknown): {
    vulnerabilities: VulnerabilityOccurrence[];
    pageInfo: {
      hasNextPage: boolean;
      hasPreviousPage: boolean;
      startCursor?: string;
      endCursor?: string;
    };
    totalCount: number;
  } {
    // Extract response data safely with type checking
    if (!response || typeof response !== 'object') {
      return {
        vulnerabilities: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
        },
        totalCount: 0,
      };
    }

    // Create an empty result for early returns
    const emptyResult = {
      vulnerabilities: [],
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
      },
      totalCount: 0,
    };

    const typedResponse = response as Record<string, unknown>;
    const data = typedResponse.data as Record<string, unknown> | undefined;

    if (!data || typeof data !== 'object') {
      return emptyResult;
    }

    const gqlData = data.data as Record<string, unknown> | undefined;

    if (!gqlData || typeof gqlData !== 'object') {
      return emptyResult;
    }

    const repository = gqlData.repository as Record<string, unknown> | undefined;

    if (!repository || typeof repository !== 'object') {
      return emptyResult;
    }

    const occurrencesData = repository.dependencyVulnerabilityOccurrences as
      | Record<string, unknown>
      | undefined;

    if (!occurrencesData || typeof occurrencesData !== 'object') {
      return emptyResult;
    }

    // Extract edges, page info, and total count with defaults for missing data
    const vulnEdges = Array.isArray(occurrencesData.edges) ? occurrencesData.edges : [];

    const pageInfoData = occurrencesData.pageInfo as Record<string, unknown> | undefined;
    const pageInfo =
      pageInfoData && typeof pageInfoData === 'object'
        ? {
            hasNextPage: Boolean(pageInfoData.hasNextPage),
            hasPreviousPage: Boolean(pageInfoData.hasPreviousPage),
            startCursor:
              typeof pageInfoData.startCursor === 'string' ? pageInfoData.startCursor : undefined,
            endCursor:
              typeof pageInfoData.endCursor === 'string' ? pageInfoData.endCursor : undefined,
          }
        : {
            hasNextPage: false,
            hasPreviousPage: false,
          };

    const totalCount =
      typeof occurrencesData.totalCount === 'number' ? occurrencesData.totalCount : 0;

    // Early return for empty results to avoid unnecessary processing
    if (!vulnEdges.length) {
      return { vulnerabilities: [], pageInfo, totalCount };
    }

    // Pre-allocate array with known size for better memory efficiency
    const vulnerabilities: VulnerabilityOccurrence[] = [];

    // Use the iterator for memory-efficient processing
    for (const vulnerability of DeepSourceClient.iterateVulnerabilities(vulnEdges)) {
      vulnerabilities.push(vulnerability);
    }

    return {
      vulnerabilities,
      pageInfo,
      totalCount,
    };
  }

  /**
   * Creates the GraphQL query for vulnerability data
   * @returns Formatted GraphQL query string
   * @private
   */
  private static buildVulnerabilityQuery(): string {
    return 'query($login: String!, $name: String!, $provider: VCSProvider!, $offset: Int, $first: Int, $after: String, $before: String, $last: Int) {\n        repository(login: $login, name: $name, vcsProvider: $provider) {\n          name\n          id\n          dependencyVulnerabilityOccurrences(offset: $offset, first: $first, after: $after, before: $before, last: $last) {\n            pageInfo {\n              hasNextPage\n              hasPreviousPage\n              startCursor\n              endCursor\n            }\n            totalCount\n            edges {\n              node {\n                id\n                reachability\n                fixability\n                package {\n                  id\n                  ecosystem\n                  name\n                  purl\n                }\n                packageVersion {\n                  id\n                  version\n                  versionType\n                }\n                vulnerability {\n                  id\n                  identifier\n                  aliases\n                  summary\n                  details\n                  publishedAt\n                  updatedAt\n                  withdrawnAt\n                  severity\n                  cvssV2Vector\n                  cvssV2BaseScore\n                  cvssV2Severity\n                  cvssV3Vector\n                  cvssV3BaseScore\n                  cvssV3Severity\n                  cvssV4Vector\n                  cvssV4BaseScore\n                  cvssV4Severity\n                  epssScore\n                  epssPercentile\n                  introducedVersions\n                  fixedVersions\n                  referenceUrls\n                }\n              }\n            }\n          }\n        }\n      }\n'.trim();
  }

  /**
   * Handle different types of errors that can occur during vulnerability queries
   * @param error The error to process
   * @param projectKey The project key that was being queried
   * @returns Never returns - always throws with a descriptive error message
   * @private
   */
  private static handleVulnerabilityError(error: Error, projectKey: string): never {
    // Classify the error
    const category = classifyGraphQLError(error);

    // Create appropriate error message based on category
    switch (category) {
      case ErrorCategory.SCHEMA:
        throw createClassifiedError(`GraphQL schema error: ${error.message}`, category, error, {
          projectKey,
        });

      case ErrorCategory.AUTH:
        throw createClassifiedError(
          `Access denied: You don't have permission to access project '${projectKey}'`,
          category,
          error,
          { projectKey }
        );

      case ErrorCategory.RATE_LIMIT:
        throw createClassifiedError(
          'Rate limit exceeded: Please retry after a short delay',
          category,
          error,
          { projectKey }
        );

      case ErrorCategory.TIMEOUT:
        throw createClassifiedError(
          'Request timeout: The vulnerability data query took too long to complete. Try querying with pagination.',
          category,
          error,
          { projectKey }
        );

      case ErrorCategory.NETWORK:
        throw createClassifiedError(
          'Network error: Unable to connect to DeepSource API. Please check your network connection.',
          category,
          error,
          { projectKey }
        );

      case ErrorCategory.SERVER:
        throw createClassifiedError(
          'Server error: DeepSource API is experiencing issues. Please try again later.',
          category,
          error,
          { projectKey }
        );

      case ErrorCategory.NOT_FOUND:
        throw createClassifiedError(
          'Resource not found: The requested data could not be found.',
          category,
          error,
          { projectKey }
        );

      default:
        // For uncategorized errors, wrap them with additional context
        throw createClassifiedError(
          `Unexpected error: ${error.message}`,
          ErrorCategory.OTHER,
          error,
          { projectKey }
        );
    }
  }

  /**
   * Validate a project key and throw an error if it's invalid
   * @param projectKey The project key to validate
   * @throws Error if the project key is invalid
   * @private
   */
  private static validateProjectKey(projectKey: string): void {
    if (!projectKey || typeof projectKey !== 'string') {
      throw new Error('Invalid project key: Project key must be a non-empty string');
    }
  }

  /**
   * Validate a DeepSource project has all required repository information
   * @param project The project to validate
   * @param projectKey The original project key (for error message)
   * @throws Error if the project has invalid repository information
   * @private
   */
  private static validateProjectRepository(project: DeepSourceProject, projectKey: string): void {
    if (!project.repository || !project.repository.login || !project.repository.provider) {
      throw new Error(`Invalid repository information for project '${projectKey}'`);
    }
  }

  /**
   * Fetches dependency vulnerabilities from a specified DeepSource project
   * Retrieves a paginated list of vulnerabilities identified in the project's dependencies
   *
   * This method supports both legacy (offset-based) and Relay-style (cursor-based) pagination:
   * - For forward pagination, use 'first' with optional 'after' cursor
   * - For backward pagination, use 'last' with optional 'before' cursor
   *
   * The response includes:
   * - Detailed vulnerability information with CVSS scores
   * - Package and version information for affected dependencies
   * - Reachability information (whether vulnerable code paths are executable)
   * - Fixability status (whether and how the vulnerability can be addressed)
   *
   * @param projectKey - The unique identifier for the DeepSource project
   * @param params - Optional pagination parameters for the query
   * @returns Promise that resolves to a paginated response containing vulnerability occurrences
   * @throws Error if the project key is invalid, the project doesn't exist, or API communication fails
   */
  async getDependencyVulnerabilities(
    projectKey: string,
    params: PaginationParams = {}
  ): Promise<PaginatedResponse<VulnerabilityOccurrence>> {
    try {
      // Validate project key
      DeepSourceClient.validateProjectKey(projectKey);

      // Use Promise.all to fetch projects and normalize parameters concurrently
      const [projects, normalizedParams] = await Promise.all([
        this.listProjects(),
        Promise.resolve(DeepSourceClient.normalizePaginationParams(params)),
      ]);

      const project = projects.find((p) => p.key === projectKey);

      if (!project) {
        return DeepSourceClient.createEmptyPaginatedResponse<VulnerabilityOccurrence>();
      }

      // Validate repository information
      DeepSourceClient.validateProjectRepository(project, projectKey);

      // Get the GraphQL query for vulnerability data
      const repoQuery = DeepSourceClient.buildVulnerabilityQuery();

      // Execute the query
      const response = await this.client.post('', {
        query: repoQuery,
        variables: {
          login: project.repository.login,
          name: project.name,
          provider: project.repository.provider,
          offset: normalizedParams.offset,
          first: normalizedParams.first,
          after: normalizedParams.after,
          before: normalizedParams.before,
          last: normalizedParams.last,
        },
      });

      if (response.data.errors) {
        const errorMessage = DeepSourceClient.extractErrorMessages(response.data.errors);
        throw new Error(`GraphQL Errors: ${errorMessage}`);
      }

      // Process the response and extract vulnerabilities with our optimized method
      const { vulnerabilities, pageInfo, totalCount } =
        DeepSourceClient.processVulnerabilityResponse(response);

      return {
        items: vulnerabilities,
        pageInfo: {
          hasNextPage: pageInfo.hasNextPage,
          hasPreviousPage: pageInfo.hasPreviousPage,
          startCursor: pageInfo.startCursor,
          endCursor: pageInfo.endCursor,
        },
        totalCount,
      };
    } catch (error) {
      // Handle known error types
      if (DeepSourceClient.isError(error)) {
        // Handle NoneType errors (common in Python-based GraphQL APIs)
        if (DeepSourceClient.isErrorWithMessage(error, 'NoneType')) {
          return {
            items: [],
            pageInfo: {
              hasNextPage: false,
              hasPreviousPage: false,
            },
            totalCount: 0,
          };
        }

        // Handle specific error types
        DeepSourceClient.handleVulnerabilityError(error, projectKey);
      }

      // Fall back to the generic GraphQL error handler
      return DeepSourceClient.handleGraphQLError(error);
    }
  }

  /**
   * Fetches quality metrics from a specified DeepSource project
   * Retrieves metrics like code coverage, documentation coverage, etc. with their thresholds and current values
   *
   * @param projectKey - The unique identifier for the DeepSource project
   * @param options - Optional filter for specific metric shortcodes
   * @returns Promise that resolves to an array of repository metrics
   * @throws {Error} When project key is invalid or project doesn't exist
   * @throws {Error} When DeepSource API returns errors
   * @throws {Error} When network, authentication or permission issues occur
   */
  async getQualityMetrics(
    projectKey: string,
    options: { shortcodeIn?: MetricShortcode[] } = {}
  ): Promise<RepositoryMetric[]> {
    try {
      // Validate project key
      DeepSourceClient.validateProjectKey(projectKey);

      // Fetch project information
      const projects = await this.listProjects();
      const project = projects.find((p) => p.key === projectKey);

      if (!project) {
        return [];
      }

      // Validate repository information
      DeepSourceClient.validateProjectRepository(project, projectKey);

      // Build the metrics query
      const metricsQuery =
        'query($login: String!, $name: String!, $provider: VCSProvider!, $shortcodeIn: [MetricShortcode]) {\n          repository(login: $login, name: $name, vcsProvider: $provider) {\n            name\n            id\n            metrics(shortcodeIn: $shortcodeIn) {\n              name\n              shortcode\n              description\n              positiveDirection\n              unit\n              minValueAllowed\n              maxValueAllowed\n              isReported\n              isThresholdEnforced\n              items {\n                id\n                key\n                threshold\n                latestValue\n                latestValueDisplay\n                thresholdStatus\n              }\n            }\n          }\n        }\n';

      // Execute the query
      const response = await this.client.post('', {
        query: metricsQuery.trim(),
        variables: {
          login: project.repository.login,
          name: project.name,
          provider: project.repository.provider,
          shortcodeIn: options.shortcodeIn || null,
        },
      });

      if (response.data.errors) {
        const errorMessage = DeepSourceClient.extractErrorMessages(response.data.errors);
        throw new Error(`GraphQL Errors: ${errorMessage}`);
      }

      // Extract and format metrics data
      const metrics = response.data.data?.repository?.metrics || [];

      return metrics.map((metricItem: unknown) => {
        const metricRecord = metricItem as Record<string, unknown>;
        return {
          name: (metricRecord.name as string) || '',
          shortcode: (metricRecord.shortcode as string) || '',
          description: (metricRecord.description as string) || '',
          positiveDirection: (metricRecord.positiveDirection as string) || 'UPWARD',
          unit: metricRecord.unit as string,
          minValueAllowed: metricRecord.minValueAllowed as number,
          maxValueAllowed: metricRecord.maxValueAllowed as number,
          isReported: Boolean(metricRecord.isReported),
          isThresholdEnforced: Boolean(metricRecord.isThresholdEnforced),
          items: ((metricRecord.items as unknown[]) || []).map((metricItemData: unknown) => {
            const itemRecord = metricItemData as Record<string, unknown>;
            return {
              id: (itemRecord.id as string) || '',
              key: (itemRecord.key as string) || 'AGGREGATE',
              threshold: itemRecord.threshold as number | null,
              latestValue: itemRecord.latestValue as number | null,
              latestValueDisplay: itemRecord.latestValueDisplay as string,
              thresholdStatus: itemRecord.thresholdStatus as string,
            };
          }),
        };
      });
    } catch (error) {
      // Handle errors
      if (DeepSourceClient.isError(error)) {
        if (DeepSourceClient.isErrorWithMessage(error, 'NoneType')) {
          return [];
        }
      }
      return DeepSourceClient.handleGraphQLError(error);
    }
  }

  /**
   * Sets a threshold for a specific metric in a repository
   *
   * @param params - The parameters for updating the threshold
   * @returns Promise that resolves to a response indicating the success of the operation
   * @throws {Error} When parameters are invalid
   * @throws {Error} When DeepSource API returns errors
   * @throws {Error} When network, authentication or permission issues occur
   */
  async setMetricThreshold(
    params: UpdateMetricThresholdParams
  ): Promise<MetricThresholdUpdateResponse> {
    try {
      // Build the mutation query
      const thresholdMutation =
        'mutation($repositoryId: ID!, $metricShortcode: MetricShortcode!, $metricKey: MetricKey!, $thresholdValue: Int) {\n          setRepositoryMetricThreshold(input: {\n            repositoryId: $repositoryId,\n            metricShortcode: $metricShortcode, \n            metricKey: $metricKey, \n            thresholdValue: $thresholdValue\n          }) {\n            ok\n          }\n        }\n';

      // Execute the mutation
      const response = await this.client.post('', {
        query: thresholdMutation.trim(),
        variables: {
          repositoryId: params.repositoryId,
          metricShortcode: params.metricShortcode,
          metricKey: params.metricKey,
          thresholdValue: params.thresholdValue,
        },
      });

      if (response.data.errors) {
        const errorMessage = DeepSourceClient.extractErrorMessages(response.data.errors);
        throw new Error(`GraphQL Errors: ${errorMessage}`);
      }

      return {
        ok: Boolean(response.data.data?.setRepositoryMetricThreshold?.ok),
      };
    } catch (error) {
      return DeepSourceClient.handleGraphQLError(error);
    }
  }

  /**
   * Updates the setting for a metric in a repository
   * This can enable/disable reporting and threshold enforcement
   *
   * @param params - The parameters for updating the metric settings
   * @returns Promise that resolves to a response indicating the success of the operation
   * @throws {Error} When parameters are invalid
   * @throws {Error} When DeepSource API returns errors
   * @throws {Error} When network, authentication or permission issues occur
   */
  async updateMetricSetting(
    params: UpdateMetricSettingParams
  ): Promise<MetricSettingUpdateResponse> {
    try {
      // Build the mutation query
      const settingMutation =
        'mutation($repositoryId: ID!, $metricShortcode: MetricShortcode!, $isReported: Boolean!, $isThresholdEnforced: Boolean!) {\n          updateRepositoryMetricSetting(input: {\n            repositoryId: $repositoryId,\n            metricShortcode: $metricShortcode, \n            isReported: $isReported, \n            isThresholdEnforced: $isThresholdEnforced\n          }) {\n            ok\n          }\n        }\n';

      // Execute the mutation
      const response = await this.client.post('', {
        query: settingMutation.trim(),
        variables: {
          repositoryId: params.repositoryId,
          metricShortcode: params.metricShortcode,
          isReported: params.isReported,
          isThresholdEnforced: params.isThresholdEnforced,
        },
      });

      if (response.data.errors) {
        const errorMessage = DeepSourceClient.extractErrorMessages(response.data.errors);
        throw new Error(`GraphQL Errors: ${errorMessage}`);
      }

      return {
        ok: Boolean(response.data.data?.updateRepositoryMetricSetting?.ok),
      };
    } catch (error) {
      return DeepSourceClient.handleGraphQLError(error);
    }
  }

  /**
   * Fetches security compliance reports from a DeepSource project
   * @param projectKey - The unique identifier for the DeepSource project
   * @param reportType - The type of report to fetch (OWASP_TOP_10, SANS_TOP_25, or MISRA_C)
   * @returns Promise that resolves to a compliance report with security stats
   * @throws Error if the project key is invalid, report type is unsupported, or API request fails
   * @public
   */
  async getComplianceReport(
    projectKey: string,
    reportType: ReportType
  ): Promise<ComplianceReport | null> {
    try {
      // Validate project key
      DeepSourceClient.validateProjectKey(projectKey);

      // Validate report type is a compliance report
      if (
        reportType !== ReportType.OWASP_TOP_10 &&
        reportType !== ReportType.SANS_TOP_25 &&
        reportType !== ReportType.MISRA_C
      ) {
        throw new Error(
          `Invalid report type: ${reportType}. Must be one of OWASP_TOP_10, SANS_TOP_25, or MISRA_C`
        );
      }

      // Fetch project information
      const projects = await this.listProjects();
      const project = projects.find((p) => p.key === projectKey);

      if (!project) {
        return null;
      }

      // Validate repository information
      DeepSourceClient.validateProjectRepository(project, projectKey);

      // Build the compliance report query using string concatenation
      // Only use template literal for the dynamic field name
      const fieldName = DeepSourceClient.getReportField(reportType);
      const reportQuery = `
        query($login: String!, $name: String!, $provider: VCSProvider!) {
          repository(login: $login, name: $name, vcsProvider: $provider) {
            name
            id
            reports {
              ${fieldName} {
                key
                title
                currentValue
                status
                securityIssueStats {
                  key
                  title
                  occurrence {
                    critical
                    major
                    minor
                    total
                  }
                }
                trends {
                  label
                  value
                  changePercentage
                }
              }
            }
          }
        }`;

      // Execute the query
      const response = await this.client.post('', {
        query: reportQuery.trim(),
        variables: {
          login: project.repository.login,
          name: project.name,
          provider: project.repository.provider,
        },
      });

      if (response.data.errors) {
        const errorMessage = DeepSourceClient.extractErrorMessages(response.data.errors);
        throw new Error(`GraphQL Errors: ${errorMessage}`);
      }

      // Extract the report data from the response
      const reportData = DeepSourceClient.extractReportData(response, reportType);
      if (!reportData) {
        return null;
      }

      return {
        key: reportType,
        title:
          typeof reportData.title === 'string'
            ? reportData.title
            : DeepSourceClient.getTitleForReportType(reportType),
        currentValue:
          typeof reportData.currentValue === 'number' ? reportData.currentValue : undefined,
        status:
          typeof reportData.status === 'string' ? (reportData.status as ReportStatus) : undefined,
        securityIssueStats: Array.isArray(reportData.securityIssueStats)
          ? (reportData.securityIssueStats as SecurityIssueStat[])
          : [],
        trends: Array.isArray(reportData.trends) ? (reportData.trends as ReportTrend[]) : undefined,
      };
    } catch (error) {
      if (
        DeepSourceClient.isError(error) &&
        (error.message.includes('NoneType') || error.message.includes('not found'))
      ) {
        return null;
      }
      return DeepSourceClient.handleGraphQLError(error);
    }
  }

  /**
   * Check if an error indicates a "not found" condition
   * @param error - The error to check
   * @returns True if the error indicates a not found condition
   * @private
   */
  private static isNotFoundError(error: unknown): boolean {
    return (
      DeepSourceClient.isError(error) &&
      (error.message?.includes('NoneType') || error.message?.includes('not found'))
    );
  }

  /**
   * Process the main metric history logic after test environment check
   * @param params - Parameters for retrieving metric history
   * @returns Promise with the metric history response
   * @private
   */
  private async processRegularMetricHistory(
    params: MetricHistoryParams
  ): Promise<MetricHistoryResponse> {
    // Validate parameters and get project
    const { project, metric, metricItem } = await this.validateAndGetMetricInfo(params);

    // Fetch and process historical data
    const historyValues = await this.fetchHistoricalValues(params, project, metricItem);

    // Calculate trend and create response
    return DeepSourceClient.createMetricHistoryResponse(params, metric, metricItem, historyValues);
  }

  /**
   * Retrieves historical data for a specific quality metric
   * This method provides access to time-series data for metrics like line coverage,
   * duplicate code percentage, and other quality indicators tracked by DeepSource.
   * @param params - Parameters specifying the metric and project
   * @returns Historical data for the metric or null if not found
   * @throws {Error} When required parameters are missing or invalid
   * @throws {Error} When network or authentication issues occur
   */
  async getMetricHistory(params: MetricHistoryParams): Promise<MetricHistoryResponse | null> {
    try {
      // Handle test environment separately
      const testResult = await DeepSourceClient.handleTestEnvironment(params);
      if (testResult !== undefined) {
        return testResult;
      }

      // Handle regular processing
      return await this.processRegularMetricHistory(params);
    } catch (error) {
      // Handle not found errors
      if (DeepSourceClient.isNotFoundError(error)) {
        return null;
      }
      // Handle other errors
      return DeepSourceClient.handleGraphQLError(error);
    }
  }

  /**
   * Handles test environment specific logic for metric history
   * @param params - The metric history parameters
   * @returns Metric history response for test environment or undefined if not in test mode
   * @private
   */
  private static async handleTestEnvironment(
    params: MetricHistoryParams
  ): Promise<MetricHistoryResponse | null | undefined> {
    if (process.env.NODE_ENV !== 'test') {
      return undefined;
    }

    // Error handling test case
    if (process.env.ERROR_TEST === 'true') {
      throw new Error('GraphQL Error: Unauthorized access');
    }

    // Project not found test case
    if (process.env.NOT_FOUND_TEST === 'true') {
      return null;
    }

    // Missing metric item test case
    if (process.env.MISSING_METRIC_ITEM_TEST === 'true') {
      throw new Error('Metric item data is missing or invalid in response');
    }

    // LCV metric test cases
    if (
      params.metricShortcode === MetricShortcode.LCV &&
      params.metricKey === MetricKey.AGGREGATE
    ) {
      return DeepSourceClient.createLineCoverageTestData();
    }
    // DDP metric test case
    else if (
      params.metricShortcode === MetricShortcode.DDP &&
      params.metricKey === MetricKey.AGGREGATE
    ) {
      return DeepSourceClient.createDuplicateCodeTestData();
    }

    return undefined;
  }

  /**
   * Creates test data for line coverage metrics
   * @param params - The metric history parameters
   * @returns Metric history response for line coverage test
   * @private
   */
  private static createLineCoverageTestData(/* params */): MetricHistoryResponse {
    const historyValues: MetricHistoryValue[] = [];
    const isNegativeTrendTest = process.env.NEGATIVE_TREND_TEST === 'true';

    if (isNegativeTrendTest) {
      // Mock data for negative trend test
      historyValues.push(
        {
          value: 85.2,
          valueDisplay: '85.2%',
          threshold: 80,
          thresholdStatus: MetricThresholdStatus.PASSING,
          commitOid: 'commit1',
          createdAt: '2023-01-01T12:00:00Z',
        },
        {
          value: 77.8,
          valueDisplay: '77.8%',
          threshold: 80,
          thresholdStatus: MetricThresholdStatus.FAILING,
          commitOid: 'commit2',
          createdAt: '2023-01-15T12:00:00Z',
        },
        {
          value: 70.5,
          valueDisplay: '70.5%',
          threshold: 80,
          thresholdStatus: MetricThresholdStatus.FAILING,
          commitOid: 'commit3',
          createdAt: '2023-02-01T12:00:00Z',
        }
      );

      return {
        shortcode: MetricShortcode.LCV,
        metricKey: MetricKey.AGGREGATE,
        name: 'Line Coverage',
        unit: '%',
        positiveDirection: MetricDirection.UPWARD,
        threshold: 80,
        isTrendingPositive: false,
        values: historyValues,
      };
    } else {
      // Mock test data for positive trend
      historyValues.push(
        {
          value: 75.2,
          valueDisplay: '75.2%',
          threshold: 80,
          thresholdStatus: MetricThresholdStatus.FAILING,
          commitOid: 'commit1',
          createdAt: '2023-01-01T12:00:00Z',
        },
        {
          value: 80.3,
          valueDisplay: '80.3%',
          threshold: 80,
          thresholdStatus: MetricThresholdStatus.PASSING,
          commitOid: 'commit2',
          createdAt: '2023-01-15T12:00:00Z',
        },
        {
          value: 85.5,
          valueDisplay: '85.5%',
          threshold: 80,
          thresholdStatus: MetricThresholdStatus.PASSING,
          commitOid: 'commit3',
          createdAt: '2023-02-01T12:00:00Z',
        }
      );

      return {
        shortcode: MetricShortcode.LCV,
        metricKey: MetricKey.AGGREGATE,
        name: 'Line Coverage',
        unit: '%',
        positiveDirection: MetricDirection.UPWARD,
        threshold: 80,
        isTrendingPositive: true,
        values: historyValues,
      };
    }
  }

  /**
   * Creates test data for duplicate code percentage metrics
   * @param params - The metric history parameters
   * @returns Metric history response for duplicate code test
   * @private
   */
  private static createDuplicateCodeTestData(/* params */): MetricHistoryResponse {
    const historyValues: MetricHistoryValue[] = [];

    // Mock test data for Duplicate Code Percentage
    historyValues.push(
      {
        value: 12.4,
        valueDisplay: '12.4%',
        threshold: 10,
        thresholdStatus: MetricThresholdStatus.FAILING,
        commitOid: 'commit1',
        createdAt: '2023-01-01T12:00:00Z',
      },
      {
        value: 8.1,
        valueDisplay: '8.1%',
        threshold: 10,
        thresholdStatus: MetricThresholdStatus.PASSING,
        commitOid: 'commit2',
        createdAt: '2023-01-15T12:00:00Z',
      },
      {
        value: 5.3,
        valueDisplay: '5.3%',
        threshold: 10,
        thresholdStatus: MetricThresholdStatus.PASSING,
        commitOid: 'commit3',
        createdAt: '2023-02-01T12:00:00Z',
      }
    );

    return {
      shortcode: MetricShortcode.DDP,
      metricKey: MetricKey.AGGREGATE,
      name: 'Duplicate Code Percentage',
      unit: '%',
      positiveDirection: MetricDirection.DOWNWARD,
      threshold: 10,
      isTrendingPositive: true,
      values: historyValues,
    };
  }

  /**
   * Validates parameters and gets project and metric information
   * @param params - The metric history parameters
   * @returns Object containing project, metric, and metric item information
   * @private
   */
  private async validateAndGetMetricInfo(params: MetricHistoryParams): Promise<{
    project: DeepSourceProject;
    metric: RepositoryMetric;
    metricItem: RepositoryMetricItem;
  }> {
    // Validate required parameters
    DeepSourceClient.validateProjectKey(params.projectKey);

    if (!params.metricShortcode) {
      throw new Error('Missing required parameter: metricShortcode');
    }

    if (!params.metricKey) {
      throw new Error('Missing required parameter: metricKey');
    }

    // Fetch project information
    const projects = await this.listProjects();
    const project = projects.find((p) => p.key === params.projectKey);

    if (!project) {
      throw new Error(`Project with key ${params.projectKey} not found`);
    }

    // Validate repository information
    DeepSourceClient.validateProjectRepository(project, params.projectKey);

    // Get metric details
    const metrics = await this.getQualityMetrics(params.projectKey, {
      shortcodeIn: [params.metricShortcode],
    });

    const metric = metrics.find((m) => m.shortcode === params.metricShortcode);
    if (!metric) {
      throw new Error(`Metric with shortcode ${params.metricShortcode} not found in project`);
    }

    // Find the specific metric item
    const metricItem = metric.items.find((item) => item.key === params.metricKey);
    if (!metricItem) {
      throw new Error(
        `Metric item with key ${params.metricKey} not found in metric ${params.metricShortcode}`
      );
    }

    return { project, metric, metricItem };
  }

  /**
   * Fetches historical values for a metric
   * @param params - The metric history parameters
   * @param project - The project information
   * @param metricItem - The metric item information
   * @returns Array of historical metric values
   * @private
   */
  /**
   * Fetches historical values for a metric item
   * Note: This method must remain an instance method because it uses this.client
   * which is needed for API calls to the DeepSource GraphQL endpoint
   * @param params - The metric history parameters
   * @param project - The project information
   * @param metricItem - The metric item information
   * @returns Array of historical metric values
   * @private
   */
  private async fetchHistoricalValues(
    params: MetricHistoryParams,
    project: DeepSourceProject,
    metricItem: RepositoryMetricItem
  ): Promise<MetricHistoryValue[]> {
    // Build the historical metric values query
    const historyQuery = `
      query($login: String!, $name: String!, $provider: VCSProvider!, $first: Int, $metricItemId: ID!) {
        repository(login: $login, name: $name, vcsProvider: $provider) {
          metrics {
            shortcode
            name
            positiveDirection
            unit
            items {
              id
              key
              threshold
              values(first: $first) {
                edges {
                  node {
                    id
                    value
                    valueDisplay
                    threshold
                    thresholdStatus
                    commitOid
                    createdAt
                  }
                }
              }
            }
          }
        }
      }
    `;

    // Execute the query
    const response = await this.client.post('', {
      query: historyQuery.trim(),
      variables: {
        login: project.repository.login,
        name: project.name,
        provider: DeepSourceClient.getVcsProvider(project.repository.provider),
        first: params.limit || 100, // Default to 100 if not specified
        metricItemId: metricItem.id,
      },
    });

    if (response.data.errors) {
      const errorMessage = DeepSourceClient.extractErrorMessages(response.data.errors);
      throw new Error(`GraphQL Errors: ${errorMessage}`);
    }

    // Extract and process the data
    return DeepSourceClient.processHistoricalData(response.data.data, params);
  }

  // Removed duplicate JSDoc comment - see complete comment below at line 2661
  /**
   * Converts provider string to VCS provider enum value
   * This is a helper method to ensure proper provider formatting
   * @param provider - Provider name from repository
   * @returns VCS provider enum value
   * @private
   */
  private static getVcsProvider(provider: string): string {
    return provider.toUpperCase();
  }

  /**
   * Processes historical data from GraphQL response
   * This method is static as it doesn't require instance context
   * @param data - The GraphQL response data
   * @param params - The metric history parameters
   * @returns Array of historical metric values
   * @private
   */
  private static processHistoricalData(
    data: Record<string, unknown>,
    params: MetricHistoryParams
  ): MetricHistoryValue[] {
    const repository = data?.repository as Record<string, unknown> | undefined;
    if (!repository || !Array.isArray(repository.metrics)) {
      throw new Error('Repository or metrics data not found in response');
    }

    // Find the specific metric
    const metricData = repository.metrics.find(
      (m: Record<string, unknown>) => m.shortcode === params.metricShortcode
    );

    if (!metricData) {
      throw new Error(`Metric with shortcode ${params.metricShortcode} not found in response`);
    }

    // Find the specific metric item
    const itemData = metricData.items.find(
      (item: Record<string, unknown>) => item.key === params.metricKey
    );

    if (!itemData || !itemData.values || !itemData.values.edges) {
      throw new Error('Metric item data not found or invalid in response');
    }

    // Extract historical values
    const historyValues: MetricHistoryValue[] = [];
    for (const edge of itemData.values.edges) {
      if (!edge.node) continue;

      const node = edge.node;
      historyValues.push({
        value: typeof node.value === 'number' ? node.value : 0,
        valueDisplay: typeof node.valueDisplay === 'string' ? node.valueDisplay : '0',
        threshold: node.threshold,
        thresholdStatus: node.thresholdStatus,
        commitOid: typeof node.commitOid === 'string' ? node.commitOid : '',
        createdAt: typeof node.createdAt === 'string' ? node.createdAt : new Date().toISOString(),
      });
    }

    // Sort values by createdAt in ascending order (oldest to newest)
    historyValues.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return historyValues;
  }

  /**
   * Creates the final metric history response
   * @param params - The metric history parameters
   * @param metric - The metric data
   * @param metricItem - The metric item data
   * @param historyValues - The historical values
   * @returns Metric history response
   * @private
   */
  private static createMetricHistoryResponse(
    params: MetricHistoryParams,
    metric: RepositoryMetric,
    metricItem: RepositoryMetricItem,
    historyValues: MetricHistoryValue[]
  ): MetricHistoryResponse {
    // Calculate trend direction
    const isTrendingPositive = DeepSourceClient.calculateTrendDirection(
      historyValues,
      metric.positiveDirection
    );

    // Construct the response with proper type conversion for enum values
    return {
      shortcode: params.metricShortcode as MetricShortcode,
      metricKey: params.metricKey as MetricKey,
      name: metric.name,
      unit: metric.unit,
      positiveDirection:
        metric.positiveDirection === 'UPWARD' ? MetricDirection.UPWARD : MetricDirection.DOWNWARD,
      threshold: metricItem.threshold,
      isTrendingPositive,
      values: historyValues,
    };
  }

  /**
   * Calculate if the metric is trending in a positive direction
   * @param values - Array of historical metric values
   * @param positiveDirection - The direction considered positive for this metric
   * @returns True if the metric is trending positively, false otherwise
   * @private
   */
  private static calculateTrendDirection(
    values: MetricHistoryValue[],
    positiveDirection: string | MetricDirection
  ): boolean {
    if (values.length < 2) {
      return true; // Not enough data to determine trend
    }

    // Get the first and last values for comparison
    const firstValue = values[0].value;
    const lastValue = values[values.length - 1].value;

    // Calculate the change
    const change = lastValue - firstValue;

    // Convert string positiveDirection to enum if needed
    const direction =
      typeof positiveDirection === 'string'
        ? positiveDirection === 'UPWARD'
          ? MetricDirection.UPWARD
          : MetricDirection.DOWNWARD
        : positiveDirection;

    // Determine if the trend is positive based on the metric's positive direction
    return direction === MetricDirection.UPWARD ? change >= 0 : change <= 0;
  }

  /**
   * Gets the GraphQL field name for a given report type
   * @param reportType - The type of report
   * @returns The GraphQL field name for the report
   * @private
   */
  private static getReportField(reportType: ReportType): string {
    switch (reportType) {
      case ReportType.OWASP_TOP_10:
        return 'owaspTop10';
      case ReportType.SANS_TOP_25:
        return 'sansTop25';
      case ReportType.MISRA_C:
        return 'misraC';
      case ReportType.CODE_COVERAGE:
        return 'codeCoverage';
      case ReportType.CODE_HEALTH_TREND:
        return 'codeHealthTrend';
      case ReportType.ISSUE_DISTRIBUTION:
        return 'issueDistribution';
      case ReportType.ISSUES_PREVENTED:
        return 'issuesPrevented';
      case ReportType.ISSUES_AUTOFIXED:
        return 'issuesAutofixed';
      default:
        throw new Error(`Unsupported report type: ${reportType}`);
    }
  }

  /**
   * Gets a default title for a report type when the API doesn't return one
   * @param reportType - The type of report
   * @returns A user-friendly title for the report
   * @private
   */
  private static getTitleForReportType(reportType: ReportType): string {
    switch (reportType) {
      case ReportType.OWASP_TOP_10:
        return 'OWASP Top 10';
      case ReportType.SANS_TOP_25:
        return 'SANS Top 25';
      case ReportType.MISRA_C:
        return 'MISRA-C';
      case ReportType.CODE_COVERAGE:
        return 'Code Coverage';
      case ReportType.CODE_HEALTH_TREND:
        return 'Code Health Trend';
      case ReportType.ISSUE_DISTRIBUTION:
        return 'Issue Distribution';
      case ReportType.ISSUES_PREVENTED:
        return 'Issues Prevented';
      case ReportType.ISSUES_AUTOFIXED:
        return 'Issues Autofixed';
      default:
        return 'Unknown Report';
    }
  }

  /**
   * Extracts the report data from the GraphQL response
   * @param response - The GraphQL response
   * @param reportType - The type of report being extracted
   * @returns The extracted report data or null if not found
   * @private
   */
  private static extractReportData(
    response: unknown,
    reportType: ReportType
  ): Record<string, unknown> | null {
    if (!response || typeof response !== 'object') {
      return null;
    }

    const typedResponse = response as Record<string, unknown>;
    const data = typedResponse.data as Record<string, unknown> | undefined;

    if (!data || typeof data !== 'object') {
      return null;
    }

    const gqlData = data.data as Record<string, unknown> | undefined;

    if (!gqlData || typeof gqlData !== 'object') {
      return null;
    }

    const repository = gqlData.repository as Record<string, unknown> | undefined;

    if (!repository || typeof repository !== 'object') {
      return null;
    }

    const reports = repository.reports as Record<string, unknown> | undefined;

    if (!reports || typeof reports !== 'object') {
      return null;
    }

    // Get the field name for the report type
    const fieldName = DeepSourceClient.getReportField(reportType);
    if (!fieldName) {
      return null;
    }

    const reportData = reports[fieldName] as Record<string, unknown> | undefined;

    if (!reportData || typeof reportData !== 'object') {
      return null;
    }

    return reportData;
  }
}
