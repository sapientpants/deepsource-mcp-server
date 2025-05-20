/**
 * @fileoverview GraphQL response interfaces for the DeepSource API
 *
 * This module defines type-safe interfaces for GraphQL responses from the DeepSource API.
 * These interfaces help ensure that responses are properly typed throughout the codebase.
 */

import {
  AnalyzerShortcode,
  BranchName,
  CommitOid,
  GraphQLNodeId,
  // ProjectKey, - Commented out to satisfy linter, as it's not referenced in this file
  RunId,
} from './branded.js';

/**
 * Common GraphQL error object
 */
export interface GraphQLError {
  /** Error message */
  message: string;
  /** Locations in the query where the error occurred */
  locations?: Array<{ line: number; column: number }>;
  /** Path in the GraphQL response associated with the error */
  path?: string[];
  /** Additional error metadata */
  extensions?: Record<string, unknown>;
}

/**
 * Common GraphQL response wrapper
 */
export interface GraphQLResponse<T> {
  /** Response data if successful */
  data?: T;
  /** Array of errors if any occurred */
  errors?: GraphQLError[];
}

/**
 * Common GraphQL page info for cursor-based pagination
 */
export interface GraphQLPageInfo {
  /** Whether there are more items after the current page */
  hasNextPage: boolean;
  /** Whether there are more items before the current page */
  hasPreviousPage: boolean;
  /** Cursor pointing to the first item in the current page */
  startCursor?: string;
  /** Cursor pointing to the last item in the current page */
  endCursor?: string;
}

/**
 * Common GraphQL edge type for Relay connection pattern
 */
export interface GraphQLEdge<T> {
  /** Node containing the actual data */
  node: T;
  /** Cursor for this node (optional, sometimes not returned) */
  cursor?: string;
}

/**
 * Common GraphQL connection pattern for paginated lists
 */
export interface GraphQLConnection<T> {
  /** Pagination information */
  pageInfo: GraphQLPageInfo;
  /** Total count of items (not just current page) */
  totalCount: number;
  /** Edges containing the actual data nodes */
  edges: GraphQLEdge<T>[];
}

/**
 * Repository node in the DeepSource API
 */
export interface GraphQLRepositoryNode {
  /** Repository name */
  name?: string;
  /** Repository ID */
  id?: GraphQLNodeId;
  /** Default branch name */
  defaultBranch?: string;
  /** Repository DSN (DeepSource Number) used as project key */
  dsn?: string;
  /** Whether the repository is private */
  isPrivate?: boolean;
  /** Whether the repository is activated in DeepSource */
  isActivated?: boolean;
  /** Version control provider (e.g., 'GITHUB', 'GITLAB') */
  vcsProvider?: string;
}

/**
 * Account node in the DeepSource API
 */
export interface GraphQLAccountNode {
  /** Account login (username) */
  login: string;
  /** Repositories in this account */
  repositories?: {
    /** Repository edges */
    edges?: GraphQLEdge<GraphQLRepositoryNode>[];
  };
}

/**
 * Viewer response for the projects query
 */
export interface ViewerProjectsResponse {
  /** Viewer data */
  data?: {
    /** Current user information */
    viewer?: {
      /** User email */
      email?: string;
      /** Accounts associated with this user */
      accounts?: {
        /** Account edges */
        edges?: GraphQLEdge<GraphQLAccountNode>[];
      };
    };
  };
}

/**
 * Issue node in the DeepSource API
 */
export interface GraphQLIssueNode {
  /** Issue ID */
  id?: GraphQLNodeId;
  /** Issue shortcode */
  shortcode?: string;
  /** Issue title */
  title?: string;
  /** Issue category */
  category?: string;
  /** Issue severity */
  severity?: string;
  /** Issue description */
  description?: string;
  /** Status of the issue */
  status?: string;
  /** Tags associated with the issue */
  tags?: string[];
}

/**
 * Issue occurrence node in the DeepSource API
 */
export interface GraphQLOccurrenceNode {
  /** Occurrence ID */
  id?: GraphQLNodeId;
  /** File path where the issue occurred */
  path?: string;
  /** Starting line number */
  beginLine?: number;
  /** Ending line number */
  endLine?: number;
  /** Starting column number */
  beginColumn?: number;
  /** Ending column number */
  endColumn?: number;
  /** Occurrence title */
  title?: string;
  /** Issue details */
  issue?: GraphQLIssueNode;
}

/**
 * Repository issues response
 */
export interface RepositoryIssuesResponse {
  /** Response data */
  data?: {
    /** Repository information */
    repository?: {
      /** Repository name */
      name?: string;
      /** Default branch */
      defaultBranch?: string;
      /** Repository DSN */
      dsn?: string;
      /** Whether repository is private */
      isPrivate?: boolean;
      /** Issues in the repository */
      issues?: GraphQLConnection<{
        /** Issue node */
        id?: GraphQLNodeId;
        /** Issue details */
        issue?: GraphQLIssueNode;
        /** Issue occurrences */
        occurrences?: GraphQLConnection<GraphQLOccurrenceNode>;
      }>;
    };
  };
}

/**
 * Occurrence distribution by analyzer
 */
export interface GraphQLOccurrenceDistributionByAnalyzer {
  /** Analyzer shortcode */
  analyzerShortcode?: AnalyzerShortcode;
  /** Number of issues introduced */
  introduced?: number;
}

/**
 * Occurrence distribution by category
 */
export interface GraphQLOccurrenceDistributionByCategory {
  /** Category of issues */
  category?: string;
  /** Number of issues introduced */
  introduced?: number;
}

/**
 * Run summary in the DeepSource API
 */
export interface GraphQLRunSummary {
  /** Number of new issues introduced in this run */
  occurrencesIntroduced?: number;
  /** Number of issues resolved in this run */
  occurrencesResolved?: number;
  /** Number of issues suppressed in this run */
  occurrencesSuppressed?: number;
  /** Distribution of issues by analyzer */
  occurrenceDistributionByAnalyzer?: GraphQLOccurrenceDistributionByAnalyzer[];
  /** Distribution of issues by category */
  occurrenceDistributionByCategory?: GraphQLOccurrenceDistributionByCategory[];
}

/**
 * Analyzer node in the DeepSource API
 */
export interface GraphQLAnalyzerNode {
  /** Analyzer shortcode */
  shortcode?: AnalyzerShortcode;
}

/**
 * Check node in the DeepSource API
 */
export interface GraphQLCheckNode {
  /** Analyzer information */
  analyzer?: GraphQLAnalyzerNode;
  /** Occurrences for this check */
  occurrences?: GraphQLConnection<GraphQLOccurrenceNode>;
}

/**
 * Run node in the DeepSource API
 */
export interface GraphQLRunNode {
  /** Run ID */
  id?: GraphQLNodeId;
  /** Run UID */
  runUid?: RunId;
  /** Commit hash that this run analyzed */
  commitOid?: CommitOid;
  /** Branch name for the run */
  branchName?: BranchName;
  /** Base commit hash used for comparison */
  baseOid?: CommitOid;
  /** Current status of the run */
  status?: string;
  /** Timestamp when the run was created */
  createdAt?: string;
  /** Timestamp when the run was last updated */
  updatedAt?: string;
  /** Timestamp when the run was finished (if completed) */
  finishedAt?: string;
  /** Summary of results from the run */
  summary?: GraphQLRunSummary;
  /** Repository information */
  repository?: {
    /** Repository name */
    name?: string;
    /** Repository ID */
    id?: GraphQLNodeId;
  };
  /** Checks performed in this run */
  checks?: GraphQLConnection<GraphQLCheckNode>;
}

/**
 * Repository runs response
 */
export interface RepositoryRunsResponse {
  /** Response data */
  data?: {
    /** Repository information */
    repository?: {
      /** Repository name */
      name?: string;
      /** Repository ID */
      id?: GraphQLNodeId;
      /** Analysis runs for this repository */
      analysisRuns?: GraphQLConnection<GraphQLRunNode>;
    };
  };
}

/**
 * Run response
 */
export interface RunResponse {
  /** Response data */
  data?: {
    /** Run details */
    run?: GraphQLRunNode;
  };
}

/**
 * Recent run response
 */
export interface RecentRunResponse {
  /** Response data */
  data?: {
    /** Repository information */
    repository?: {
      /** Analysis runs for this repository */
      runs?: {
        /** Run edges */
        edges?: GraphQLEdge<GraphQLRunNode>[];
      };
    };
  };
}

/**
 * Run issues response
 */
export interface RunIssuesResponse {
  /** Response data */
  data?: {
    /** Run information */
    run?: {
      /** Checks performed in this run */
      checks?: {
        /** Check edges */
        edges?: GraphQLEdge<GraphQLCheckNode>[];
      };
    };
  };
}

/**
 * Package node in the DeepSource API
 */
export interface GraphQLPackageNode {
  /** Package ID */
  id?: GraphQLNodeId;
  /** Ecosystem (e.g., "npm", "pypi") */
  ecosystem?: string;
  /** Package name */
  name?: string;
  /** Package URL */
  purl?: string;
}

/**
 * Package version node in the DeepSource API
 */
export interface GraphQLPackageVersionNode {
  /** Version ID */
  id?: GraphQLNodeId;
  /** Version string */
  version?: string;
  /** Version type */
  versionType?: string;
}

/**
 * Vulnerability node in the DeepSource API
 */
export interface GraphQLVulnerabilityNode {
  /** Vulnerability ID */
  id?: GraphQLNodeId;
  /** Vulnerability identifier (e.g., CVE number) */
  identifier?: string;
  /** Alternative identifiers for this vulnerability */
  aliases?: string[];
  /** Brief summary of the vulnerability */
  summary?: string;
  /** Detailed description of the vulnerability */
  details?: string;
  /** When the vulnerability was published */
  publishedAt?: string;
  /** When the vulnerability information was last updated */
  updatedAt?: string;
  /** When the vulnerability was withdrawn (if applicable) */
  withdrawnAt?: string;
  /** Severity rating */
  severity?: string;
  /** CVSS v2 vector string */
  cvssV2Vector?: string;
  /** CVSS v2 base score */
  cvssV2BaseScore?: number;
  /** CVSS v2 severity */
  cvssV2Severity?: string;
  /** CVSS v3 vector string */
  cvssV3Vector?: string;
  /** CVSS v3 base score */
  cvssV3BaseScore?: number;
  /** CVSS v3 severity */
  cvssV3Severity?: string;
  /** CVSS v4 vector string */
  cvssV4Vector?: string;
  /** CVSS v4 base score */
  cvssV4BaseScore?: number;
  /** CVSS v4 severity */
  cvssV4Severity?: string;
  /** EPSS score */
  epssScore?: number;
  /** EPSS percentile */
  epssPercentile?: number;
  /** Versions where the vulnerability was introduced */
  introducedVersions?: string[];
  /** Versions where the vulnerability was fixed */
  fixedVersions?: string[];
  /** Reference URLs for more information */
  referenceUrls?: string[];
}

/**
 * Dependency vulnerability node in the DeepSource API
 */
export interface GraphQLDependencyVulnerabilityNode {
  /** Vulnerability node ID */
  id?: GraphQLNodeId;
  /** Package information */
  package?: GraphQLPackageNode;
  /** Package version information */
  packageVersion?: GraphQLPackageVersionNode;
  /** Vulnerability details */
  vulnerability?: GraphQLVulnerabilityNode;
  /** Reachability information */
  reachability?: string;
  /** Fixability information */
  fixability?: string;
}

/**
 * Vulnerabilities response
 */
export interface VulnerabilitiesResponse {
  /** Response data */
  data?: {
    /** Repository information */
    repository?: {
      /** Dependency vulnerabilities */
      dependencyVulnerabilities?: GraphQLConnection<GraphQLDependencyVulnerabilityNode>;
    };
  };
}

/**
 * Metric item node in the DeepSource API
 */
export interface GraphQLMetricItemNode {
  /** Item ID */
  id?: GraphQLNodeId;
  /** Metric key */
  key?: string;
  /** Threshold value */
  threshold?: number;
  /** Latest measured value */
  latestValue?: number;
  /** Display string for the latest value */
  latestValueDisplay?: string;
  /** Status of the threshold check */
  thresholdStatus?: string;
}

/**
 * Metric node in the DeepSource API
 */
export interface GraphQLMetricNode {
  /** Metric name */
  name?: string;
  /** Metric shortcode */
  shortcode?: string;
  /** Metric description */
  description?: string;
  /** Whether higher values are better (true) or worse (false) */
  positiveDirection?: boolean;
  /** Unit of measurement */
  unit?: string;
  /** Minimum allowed value */
  minValueAllowed?: number;
  /** Maximum allowed value */
  maxValueAllowed?: number;
  /** Whether the metric is reported */
  isReported?: boolean;
  /** Whether threshold enforcement is enabled */
  isThresholdEnforced?: boolean;
  /** Metric items */
  items?: GraphQLMetricItemNode[];
}

/**
 * Quality metrics response
 */
export interface QualityMetricsResponse {
  /** Response data */
  data?: {
    /** Repository information */
    repository?: {
      /** Repository ID */
      id?: GraphQLNodeId;
      /** Metrics for this repository */
      metrics?: {
        /** Metric edges */
        edges?: GraphQLEdge<GraphQLMetricNode>[];
      };
    };
  };
}

/**
 * Metric update response
 */
export interface MetricUpdateResponse {
  /** Response data */
  data?: {
    /** Result of setting metric threshold */
    setMetricThreshold?: {
      /** Whether the operation was successful */
      ok?: boolean;
    };
    /** Result of updating metric setting */
    updateMetricSetting?: {
      /** Whether the operation was successful */
      ok?: boolean;
    };
  };
}

/**
 * Security issue statistics node in the DeepSource API
 */
export interface GraphQLSecurityIssueStatsNode {
  /** Issue key */
  key?: string;
  /** Issue title */
  title?: string;
  /** Occurrence counts */
  occurrence?: {
    /** Critical severity count */
    critical?: number;
    /** Major severity count */
    major?: number;
    /** Minor severity count */
    minor?: number;
    /** Total count */
    total?: number;
  };
}

/**
 * Compliance report node in the DeepSource API
 */
export interface GraphQLComplianceReportNode {
  /** Report key */
  key?: string;
  /** Report title */
  title?: string;
  /** Current value */
  currentValue?: number;
  /** Status of compliance */
  status?: string;
  /** Security issue statistics */
  securityIssueStats?: GraphQLSecurityIssueStatsNode[];
  /** Trend data */
  trends?: Record<string, unknown>;
}

/**
 * Compliance report response
 */
export interface ComplianceReportResponse {
  /** Response data */
  data?: {
    /** Repository information */
    repository?: {
      /** Compliance report */
      complianceReport?: GraphQLComplianceReportNode;
    };
  };
}
