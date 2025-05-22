/**
 * @fileoverview Security-related models
 * This module defines interfaces for security vulnerabilities and compliance.
 */

import { PaginationParams, PaginatedResponse } from '../utils/pagination/types.js';

/* eslint-disable no-unused-vars */
/**
 * Available report types in DeepSource
 * This enum combines both compliance-specific and general report types
 * @public
 */
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

/**
 * Report status indicating whether the report is passing, failing, or not applicable
 * @public
 */
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
  /** Label for the trend data point */
  label?: string;
  /** Value of the trend data point */
  value?: number;
  /** Percentage change from previous value */
  changePercentage?: number;
}

/**
 * Severity distribution of issues
 * @public
 */
export interface SeverityDistribution {
  /** Count of critical severity issues */
  critical: number;
  /** Count of major severity issues */
  major: number;
  /** Count of minor severity issues */
  minor: number;
  /** Total count of issues */
  total: number;
}

/**
 * Security issue statistic
 * @public
 */
export interface SecurityIssueStat {
  /** Key identifier for the statistic */
  key: string;
  /** Human-readable title for the statistic */
  title: string;
  /** Breakdown of occurrences by severity */
  occurrence: SeverityDistribution;
}

/**
 * Compliance report interface
 * @public
 */
export interface ComplianceReport {
  /** Type of the report */
  key: ReportType;
  /** Human-readable title of the report */
  title: string;
  /** Current value of the compliance metric */
  currentValue?: number;
  /** Status of compliance against the standard */
  status?: ReportStatus;
  /** Detailed statistics about security issues */
  securityIssueStats: SecurityIssueStat[];
  /** Trend data for the report over time */
  trends?: ReportTrend[];
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
  /** Package URL (optional) - follows the package URL specification */
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
  /** Whether the vulnerability is reachable in the codebase */
  reachability: VulnerabilityReachability;
  /** Whether and how the vulnerability can be fixed */
  fixability: VulnerabilityFixability;
}

/**
 * Interface for parameters used to fetch dependency vulnerabilities
 * @public
 */
export interface DependencyVulnerabilitiesParams extends PaginationParams {
  /** DeepSource project key */
  projectKey: string;
}

/**
 * Response containing a list of vulnerability occurrences with pagination
 * @public
 */
export type VulnerabilitiesResponse = PaginatedResponse<VulnerabilityOccurrence>;
