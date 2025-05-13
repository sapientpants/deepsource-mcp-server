import axios, { AxiosError } from 'axios';

/**
 * @fileoverview DeepSource API client for interacting with the DeepSource service.
 * This module exports interfaces and classes for working with the DeepSource API.
 * @packageDocumentation
 */

// Interfaces and types below are exported as part of the public API

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

export class DeepSourceClient {
  /**
   * HTTP client for making API requests to DeepSource
   * @private
   */
  private client;

  /**
   * Creates a new DeepSourceClient instance
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
    const errorMessages = errors.map((e) => e.message);
    return errorMessages.join(', ');
  }

  /**
   * Handles GraphQL errors by formatting and throwing appropriate error messages
   * @param error - The error object from the GraphQL request
   * @throws Error with formatted GraphQL error messages
   */
  private static handleGraphQLError(error: Error | unknown): never {
    // Handle AxiosError with GraphQL errors
    if (error instanceof AxiosError && error.response?.data?.errors) {
      const graphqlErrors: Array<{ message: string }> = error.response.data.errors;
      const errorMessage = DeepSourceClient.extractErrorMessages(graphqlErrors);
      throw new Error(`GraphQL Error: ${errorMessage}`);
    }

    // Handle network errors
    if (error instanceof AxiosError && error.code === 'ECONNREFUSED') {
      throw new Error(`Connection error: Unable to connect to DeepSource API`);
    }

    // Handle timeout errors
    if (error instanceof AxiosError && error.code === 'ETIMEDOUT') {
      throw new Error(`Timeout error: DeepSource API request timed out`);
    }

    // Handle authentication errors
    if (error instanceof AxiosError && error.response?.status === 401) {
      throw new Error(`Authentication error: Invalid or expired API key`);
    }

    // Handle rate limiting
    if (error instanceof AxiosError && error.response?.status === 429) {
      throw new Error(`Rate limit exceeded: Too many requests to DeepSource API`);
    }

    // Pass through the original error if we can't categorize it
    if (error instanceof Error) {
      throw new Error(`DeepSource API error: ${error.message}`);
    }

    // For completely unknown errors
    throw new Error(`Unknown error occurred while communicating with DeepSource API`);
  }

  /**
   * Logs a warning message about non-standard pagination usage
   *
   * This method logs warnings when pagination parameters are used in
   * ways that don't follow standard Relay cursor pagination conventions.
   *
   * Current implementation is a no-op to avoid console spam, but can be
   * replaced with a proper logging implementation in production.
   *
   * @param _message Optional custom warning message (currently unused)
   * @private
   */
  // eslint-disable-next-line no-unused-vars
  private static logPaginationWarning(_message?: string): void {
    // Using a separate method for logging instead of console.warn
    // This can be replaced with a proper logger implementation later
    // For now, we'll just make it a no-op to avoid console warnings
    // If a real logger is implemented, use this:
    // const warningMessage = message || 'Non-standard pagination: Using "last" without "before" is not recommended in Relay pagination';
    // logger.warn(warningMessage);
  }

  /**
   * Creates an empty paginated response
   * @returns Empty paginated response with consistent structure
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
   * Integer validation is also applied to ensure numerical parameters are valid.
   *
   * @param params - Original pagination parameters
   * @returns Normalized pagination parameters with consistent values
   * @private
   */
  private static normalizePaginationParams<T extends PaginationParams>(params: T): T {
    // Create a copy to avoid modifying the original object
    const normalizedParams = { ...params };

    // Validate and normalize numerical parameters
    if (normalizedParams.offset !== undefined) {
      normalizedParams.offset = Math.max(0, Math.floor(Number(normalizedParams.offset) || 0));
    }

    if (normalizedParams.first !== undefined) {
      // Ensure first is a positive integer or undefined
      normalizedParams.first = Math.max(1, Math.floor(Number(normalizedParams.first) || 0));
    }

    if (normalizedParams.last !== undefined) {
      // Ensure last is a positive integer or undefined
      normalizedParams.last = Math.max(1, Math.floor(Number(normalizedParams.last) || 0));
    }

    // Validate cursor parameters (ensure they're valid strings)
    if (normalizedParams.after !== undefined && typeof normalizedParams.after !== 'string') {
      normalizedParams.after = String(normalizedParams.after || '');
    }

    if (normalizedParams.before !== undefined && typeof normalizedParams.before !== 'string') {
      normalizedParams.before = String(normalizedParams.before || '');
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
   */
  async listProjects(): Promise<DeepSourceProject[]> {
    try {
      const viewerQuery = `
        query {
          viewer {
            email
            accounts {
              edges {
                node {
                  login
                  repositories(first: 100) {
                    edges {
                      node {
                        name
                        defaultBranch
                        dsn
                        isPrivate
                        isActivated
                        vcsProvider
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
      if (error instanceof Error && error.message.includes('NoneType')) {
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

      // Normalize pagination parameters using the helper method
      const normalizedParams = DeepSourceClient.normalizePaginationParams(params);

      const repoQuery = `
        query($login: String!, $name: String!, $provider: VCSProvider!, $offset: Int, $first: Int, $after: String, $before: String, $last: Int, $path: String, $analyzerIn: [String], $tags: [String]) {
          repository(login: $login, name: $name, vcsProvider: $provider) {
            name
            defaultBranch
            dsn
            isPrivate
            issues(offset: $offset, first: $first, after: $after, before: $before, last: $last, path: $path, analyzerIn: $analyzerIn, tags: $tags) {
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
                  occurrences(first: 100) {
                    edges {
                      node {
                        id
                        path
                        beginLine
                        endLine
                        beginColumn
                        endColumn
                        title
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
      if (error instanceof Error && error.message.includes('NoneType')) {
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

      // Normalize pagination parameters using the helper method
      const normalizedParams = DeepSourceClient.normalizePaginationParams(params);

      const repoQuery = `
        query($login: String!, $name: String!, $provider: VCSProvider!, $offset: Int, $first: Int, $after: String, $before: String, $last: Int, $analyzerIn: [String]) {
          repository(login: $login, name: $name, vcsProvider: $provider) {
            name
            id
            analysisRuns(offset: $offset, first: $first, after: $after, before: $before, last: $last) {
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
                  runUid
                  commitOid
                  branchName
                  baseOid
                  status
                  createdAt
                  updatedAt
                  finishedAt
                  summary {
                    occurrencesIntroduced
                    occurrencesResolved
                    occurrencesSuppressed
                    occurrenceDistributionByAnalyzer {
                      analyzerShortcode
                      introduced
                    }
                    occurrenceDistributionByCategory {
                      category
                      introduced
                    }
                  }
                  repository {
                    name
                    id
                  }
                  checks(analyzerIn: $analyzerIn) {
                    edges {
                      node {
                        analyzer {
                          shortcode
                        }
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
      if (error instanceof Error && error.message.includes('NoneType')) {
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
   */
  async getRun(runIdentifier: string): Promise<DeepSourceRun | null> {
    try {
      // Determine if the identifier is a UUID or a commit hash
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        runIdentifier
      );

      const runQuery = `
        query($runUid: UUID, $commitOid: String) {
          run(runUid: $runUid, commitOid: $commitOid) {
            id
            runUid
            commitOid
            branchName
            baseOid
            status
            createdAt
            updatedAt
            finishedAt
            summary {
              occurrencesIntroduced
              occurrencesResolved
              occurrencesSuppressed
              occurrenceDistributionByAnalyzer {
                analyzerShortcode
                introduced
              }
              occurrenceDistributionByCategory {
                category
                introduced
              }
            }
            repository {
              name
              id
            }
          }
        }
      `;

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
        error instanceof Error &&
        (error.message.includes('NoneType') || error.message.includes('not found'))
      ) {
        return null;
      }
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
   * @param node The raw vulnerability node from the GraphQL response
   * @returns Boolean indicating whether the node has valid required fields
   * @private
   */
  private static isValidVulnerabilityNode(node: any): boolean {
    // Validate root level fields
    if (!node || typeof node !== 'object') {
      console.warn('Skipping invalid vulnerability node: not an object');
      return false;
    }

    if (!node.id || typeof node.id !== 'string') {
      console.warn(
        `Skipping vulnerability node with missing or invalid ID: ${JSON.stringify(node)}`
      );
      return false;
    }

    // Validate nested objects
    if (!node.package || typeof node.package !== 'object') {
      console.warn(
        `Skipping vulnerability node with missing or invalid package: ${JSON.stringify(node)}`
      );
      return false;
    }

    if (!node.packageVersion || typeof node.packageVersion !== 'object') {
      console.warn(
        `Skipping vulnerability node with missing or invalid packageVersion: ${JSON.stringify(node)}`
      );
      return false;
    }

    if (!node.vulnerability || typeof node.vulnerability !== 'object') {
      console.warn(
        `Skipping vulnerability node with missing or invalid vulnerability: ${JSON.stringify(node)}`
      );
      return false;
    }

    // Validate required package fields
    if (!node.package.id || !node.package.ecosystem || !node.package.name) {
      console.warn(
        `Skipping vulnerability with incomplete package information: ${JSON.stringify(node.package)}`
      );
      return false;
    }

    // Validate required packageVersion fields
    if (!node.packageVersion.id || !node.packageVersion.version) {
      console.warn(
        `Skipping vulnerability with incomplete package version information: ${JSON.stringify(node.packageVersion)}`
      );
      return false;
    }

    // Validate required vulnerability fields
    if (!node.vulnerability.id || !node.vulnerability.identifier) {
      console.warn(
        `Skipping vulnerability with incomplete vulnerability information: ${JSON.stringify(node.vulnerability)}`
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
  private static isValidVersionType(value: any): value is PackageVersionType {
    const validVersionTypes: PackageVersionType[] = ['SEMVER', 'ECOSYSTEM', 'GIT'];
    return DeepSourceClient.isValidEnum(value, validVersionTypes);
  }

  /**
   * Maps raw package data to a Package object with proper validation
   * @param packageData The raw package data from GraphQL
   * @returns A properly formatted Package object
   * @private
   */
  private static mapPackageData(packageData: any): Package {
    return {
      // Required fields with fallbacks to empty strings
      id: DeepSourceClient.validateString(packageData.id),
      ecosystem: DeepSourceClient.validateString(packageData.ecosystem),
      name: DeepSourceClient.validateString(packageData.name),
      // Optional URL field
      purl: DeepSourceClient.validateNullableString(packageData.purl) || undefined,
    };
  }

  /**
   * Maps raw package version data to a PackageVersion object with proper validation
   * @param versionData The raw package version data from GraphQL
   * @returns A properly formatted PackageVersion object
   * @private
   */
  private static mapPackageVersionData(versionData: any): PackageVersion {
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
  private static isValidEnum<T extends string>(value: any, validValues: T[]): value is T {
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
  private static validateArray(value: any): string[] {
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
  private static validateString(value: any, defaultValue: string = ''): string {
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
  private static validateNullableString(value: any): string | null {
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
  private static validateNumber(value: any): number | null {
    return typeof value === 'number' ? value : null;
  }

  /**
   * Maps raw vulnerability data to a Vulnerability object with proper validation
   * @param vulnData The raw vulnerability data from GraphQL
   * @returns A properly formatted Vulnerability object
   * @private
   */
  private static mapVulnerabilityData(vulnData: any): Vulnerability {
    // Check if severity is valid
    const isValidSeverity = (value: any): value is VulnerabilitySeverity => {
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
      summary: DeepSourceClient.validateNullableString(vulnData.summary) || undefined,
      details: DeepSourceClient.validateNullableString(vulnData.details) || undefined,

      // Required date fields with fallbacks
      publishedAt: DeepSourceClient.validateString(vulnData.publishedAt),
      updatedAt: DeepSourceClient.validateString(vulnData.updatedAt),

      // Optional date field that can be undefined
      withdrawnAt: DeepSourceClient.validateNullableString(vulnData.withdrawnAt) || undefined,

      // Severity with validation
      severity: isValidSeverity(vulnData.severity) ? vulnData.severity : 'NONE',

      // CVSSv2 fields with validation
      cvssV2Vector: DeepSourceClient.validateNullableString(vulnData.cvssV2Vector) || undefined,
      cvssV2BaseScore:
        typeof vulnData.cvssV2BaseScore === 'number' ? vulnData.cvssV2BaseScore : undefined,
      cvssV2Severity: isValidSeverity(vulnData.cvssV2Severity)
        ? vulnData.cvssV2Severity
        : undefined,

      // CVSSv3 fields with validation
      cvssV3Vector: DeepSourceClient.validateNullableString(vulnData.cvssV3Vector) || undefined,
      cvssV3BaseScore:
        typeof vulnData.cvssV3BaseScore === 'number' ? vulnData.cvssV3BaseScore : undefined,
      cvssV3Severity: isValidSeverity(vulnData.cvssV3Severity)
        ? vulnData.cvssV3Severity
        : undefined,

      // CVSSv4 fields with validation
      cvssV4Vector: DeepSourceClient.validateNullableString(vulnData.cvssV4Vector) || undefined,
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
  private static isValidReachability(value: any): value is VulnerabilityReachability {
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
  private static isValidFixability(value: any): value is VulnerabilityFixability {
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
  private static mapVulnerabilityOccurrence(node: any): VulnerabilityOccurrence {
    return {
      id: node.id,
      package: DeepSourceClient.mapPackageData(node.package),
      packageVersion: DeepSourceClient.mapPackageVersionData(node.packageVersion),
      vulnerability: DeepSourceClient.mapVulnerabilityData(node.vulnerability),

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
   * Memory-efficient iterator for processing vulnerabilities
   * Allows for streaming processing of vulnerability data rather than building the entire array at once
   *
   * Includes protections against:
   * - Malformed or missing data (with detailed logging)
   * - Infinite loops (with iteration limit)
   * - Exceptionally large data sets (with memory-efficient processing)
   *
   * @param edges Array of vulnerability edges from GraphQL response
   * @yields Valid VulnerabilityOccurrence objects
   * @private
   */
  private static *iterateVulnerabilities(edges: any[]): Generator<VulnerabilityOccurrence> {
    // Sanity check for edges
    if (!Array.isArray(edges)) {
      console.warn('Invalid edges data: expected an array but got', typeof edges);
      return; // Early return - nothing to iterate
    }

    // Safety counter to prevent infinite loops in case of malformed data
    let iterationCount = 0;

    for (const edge of edges) {
      // Iteration safety check
      if (iterationCount++ > DeepSourceClient.MAX_ITERATIONS) {
        console.warn(
          `Exceeded maximum iteration count (${DeepSourceClient.MAX_ITERATIONS}). Stopping processing.`
        );
        break;
      }

      try {
        // Skip if edge is missing or not an object
        if (!edge || typeof edge !== 'object') {
          continue;
        }

        // Skip if node is missing
        if (!edge.node) {
          continue;
        }

        // Validate node before processing
        if (DeepSourceClient.isValidVulnerabilityNode(edge.node)) {
          yield DeepSourceClient.mapVulnerabilityOccurrence(edge.node);
        }
      } catch (error) {
        // Log error but continue processing other edges
        console.warn(
          'Error processing vulnerability edge:',
          error instanceof Error ? error.message : 'Unknown error'
        );
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
  private static processVulnerabilityResponse(response: any): {
    vulnerabilities: VulnerabilityOccurrence[];
    pageInfo: {
      hasNextPage: boolean;
      hasPreviousPage: boolean;
      startCursor?: string;
      endCursor?: string;
    };
    totalCount: number;
  } {
    // Extract response data safely with optional chaining and nullish coalescing
    const occurrencesData = response?.data?.data?.repository?.dependencyVulnerabilityOccurrences;

    // Extract edges, page info, and total count with defaults for missing data
    const vulnEdges = occurrencesData?.edges ?? [];
    const pageInfo = occurrencesData?.pageInfo ?? {
      hasNextPage: false,
      hasPreviousPage: false,
    };
    const totalCount = occurrencesData?.totalCount ?? 0;

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
      if (!projectKey || typeof projectKey !== 'string') {
        throw new Error('Invalid project key: Project key must be a non-empty string');
      }

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
      if (!project.repository || !project.repository.login || !project.repository.provider) {
        throw new Error(`Invalid repository information for project '${projectKey}'`);
      }

      // Optimize query by using a tagged template for better readability
      // and direct trimming rather than creating an intermediate string
      const repoQuery = `
        query($login: String!, $name: String!, $provider: VCSProvider!, $offset: Int, $first: Int, $after: String, $before: String, $last: Int) {
          repository(login: $login, name: $name, vcsProvider: $provider) {
            name
            id
            dependencyVulnerabilityOccurrences(offset: $offset, first: $first, after: $after, before: $before, last: $last) {
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
                  reachability
                  fixability
                  package {
                    id
                    ecosystem
                    name
                    purl
                  }
                  packageVersion {
                    id
                    version
                    versionType
                  }
                  vulnerability {
                    id
                    identifier
                    aliases
                    summary
                    details
                    publishedAt
                    updatedAt
                    withdrawnAt
                    severity
                    cvssV2Vector
                    cvssV2BaseScore
                    cvssV2Severity
                    cvssV3Vector
                    cvssV3BaseScore
                    cvssV3Severity
                    cvssV4Vector
                    cvssV4BaseScore
                    cvssV4Severity
                    epssScore
                    epssPercentile
                    introducedVersions
                    fixedVersions
                    referenceUrls
                  }
                }
              }
            }
          }
        }
      `.trim();

      // Set request timeout for large datasets to prevent hanging
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
      if (error instanceof Error) {
        // Handle NoneType errors (common in Python-based GraphQL APIs)
        if (error.message.includes('NoneType')) {
          return {
            items: [],
            pageInfo: {
              hasNextPage: false,
              hasPreviousPage: false,
            },
            totalCount: 0,
          };
        }

        // Handle errors from improper GraphQL schema
        if (
          error.message.includes('Cannot query field') ||
          error.message.includes('Unknown argument')
        ) {
          throw new Error(`GraphQL schema error: ${error.message}`);
        }

        // Handle project access errors
        if (error.message.includes('access denied') || error.message.includes('not authorized')) {
          throw new Error(
            `Access denied: You don't have permission to access project '${projectKey}'`
          );
        }

        // Handle rate limiting errors
        if (error.message.includes('rate limit') || error.message.includes('too many requests')) {
          throw new Error(`Rate limit exceeded: Please retry after a short delay`);
        }

        // Handle timeout errors
        if (error.message.includes('timeout') || error.message.includes('timed out')) {
          throw new Error(
            `Request timeout: The vulnerability data query took too long to complete. Try querying with pagination.`
          );
        }

        // Handle network errors
        if (
          error.message.includes('network') ||
          error.message.includes('ECONNRESET') ||
          error.message.includes('ECONNREFUSED') ||
          error.message.includes('ETIMEDOUT')
        ) {
          throw new Error(
            `Network error: Unable to connect to DeepSource API. Please check your network connection.`
          );
        }

        // Handle authentication errors
        if (
          error.message.includes('authentication') ||
          error.message.includes('unauthorized') ||
          error.message.includes('token') ||
          error.message.includes('API key')
        ) {
          throw new Error(`Authentication error: Please check your API key and permissions.`);
        }

        // Handle server errors
        if (
          error.message.includes('server error') ||
          error.message.includes('internal error') ||
          error.message.includes('500')
        ) {
          throw new Error(
            `Server error: DeepSource API is experiencing issues. Please try again later.`
          );
        }
      }

      // Fall back to the generic GraphQL error handler
      return DeepSourceClient.handleGraphQLError(error);
    }
  }
}
