/**
 * Type adapters for converting MCP tool parameters to domain handler parameters
 *
 * These adapters handle the conversion between primitive types from tool schemas
 * and branded types expected by domain handlers.
 */

import {
  asProjectKey,
  asGraphQLNodeId,
  asRunId,
  asCommitOid,
  asAnalyzerShortcode,
  type ProjectKey,
  type GraphQLNodeId,
  type RunId,
  type CommitOid,
  type AnalyzerShortcode,
} from '../types/branded.js';
import { MetricShortcode, MetricKey } from '../types/metrics.js';
import { ReportType } from '../types/report-types.js';
import {
  DeepsourceQualityMetricsParams,
  DeepsourceUpdateMetricThresholdParams,
  DeepsourceUpdateMetricSettingParams,
} from '../handlers/quality-metrics.js';
import { DeepsourceComplianceReportParams } from '../handlers/compliance-reports.js';
import { DeepsourceProjectIssuesParams } from '../handlers/project-issues.js';
import { DeepsourceDependencyVulnerabilitiesParams } from '../handlers/dependency-vulnerabilities.js';
import { DeepsourceProjectRunsParams } from '../handlers/project-runs.js';
import { DeepsourceRunParams } from '../handlers/run.js';
import { DeepsourceRecentRunIssuesParams } from '../handlers/recent-run-issues.js';

/**
 * Adapts quality metrics parameters from tool schema to handler interface
 */
export function adaptQualityMetricsParams(params: unknown): DeepsourceQualityMetricsParams {
  const typedParams = params as Record<string, unknown>;
  const result: DeepsourceQualityMetricsParams = {
    projectKey: typedParams.projectKey as string, // Handler still expects string
  };

  const shortcodeIn = typedParams.shortcodeIn as MetricShortcode[] | undefined;
  if (shortcodeIn !== undefined) {
    result.shortcodeIn = shortcodeIn;
  }

  return result;
}

/**
 * Adapts update metric threshold parameters from tool schema to handler interface
 */
export function adaptUpdateMetricThresholdParams(
  params: unknown
): DeepsourceUpdateMetricThresholdParams {
  const typedParams = params as Record<string, unknown>;
  const result: DeepsourceUpdateMetricThresholdParams = {
    projectKey: typedParams.projectKey as string, // Handler still expects string
    repositoryId: typedParams.repositoryId as string, // Handler still expects string
    metricShortcode: typedParams.metricShortcode as MetricShortcode,
    metricKey: typedParams.metricKey as MetricKey,
  };

  const thresholdValue = typedParams.thresholdValue as number | null | undefined;
  if (thresholdValue !== undefined) {
    result.thresholdValue = thresholdValue;
  }

  return result;
}

/**
 * Adapts update metric setting parameters from tool schema to handler interface
 */
export function adaptUpdateMetricSettingParams(
  params: unknown
): DeepsourceUpdateMetricSettingParams {
  const typedParams = params as Record<string, unknown>;
  return {
    projectKey: typedParams.projectKey as string, // Handler still expects string
    repositoryId: typedParams.repositoryId as string, // Handler still expects string
    metricShortcode: typedParams.metricShortcode as MetricShortcode,
    isReported: typedParams.isReported as boolean,
    isThresholdEnforced: typedParams.isThresholdEnforced as boolean,
  };
}

/**
 * Adapts compliance report parameters from tool schema to handler interface
 */
export function adaptComplianceReportParams(params: unknown): DeepsourceComplianceReportParams {
  const typedParams = params as Record<string, unknown>;
  return {
    projectKey: typedParams.projectKey as string, // Handler still expects string
    reportType: typedParams.reportType as ReportType,
  };
}

/**
 * Adapts project issues parameters from tool schema to handler interface
 */
export function adaptProjectIssuesParams(params: unknown): DeepsourceProjectIssuesParams {
  const typedParams = params as Record<string, unknown>;
  const result: DeepsourceProjectIssuesParams = {
    projectKey: typedParams.projectKey as string, // Handler still expects string
  };

  const path = typedParams.path as string | undefined;
  if (path !== undefined) result.path = path;

  const analyzerIn = typedParams.analyzerIn as string[] | undefined;
  if (analyzerIn !== undefined) result.analyzerIn = analyzerIn;

  const tags = typedParams.tags as string[] | undefined;
  if (tags !== undefined) result.tags = tags;

  const first = typedParams.first as number | undefined;
  if (first !== undefined) result.first = first;

  const last = typedParams.last as number | undefined;
  if (last !== undefined) result.last = last;

  const after = typedParams.after as string | undefined;
  if (after !== undefined) result.after = after;

  const before = typedParams.before as string | undefined;
  if (before !== undefined) result.before = before;

  return result;
}

/**
 * Adapts dependency vulnerabilities parameters from tool schema to handler interface
 */
export function adaptDependencyVulnerabilitiesParams(
  params: unknown
): DeepsourceDependencyVulnerabilitiesParams {
  const typedParams = params as Record<string, unknown>;
  const result: DeepsourceDependencyVulnerabilitiesParams = {
    projectKey: typedParams.projectKey as string, // Handler still expects string
  };

  const first = typedParams.first as number | undefined;
  if (first !== undefined) result.first = first;

  const last = typedParams.last as number | undefined;
  if (last !== undefined) result.last = last;

  const after = typedParams.after as string | undefined;
  if (after !== undefined) result.after = after;

  const before = typedParams.before as string | undefined;
  if (before !== undefined) result.before = before;

  return result;
}

/**
 * Adapts project runs parameters from tool schema to handler interface
 */
export function adaptProjectRunsParams(params: unknown): DeepsourceProjectRunsParams {
  const typedParams = params as Record<string, unknown>;
  const result: DeepsourceProjectRunsParams = {
    projectKey: typedParams.projectKey as string, // Handler still expects string
  };

  const analyzerIn = typedParams.analyzerIn as AnalyzerShortcode[] | undefined;
  if (analyzerIn !== undefined) result.analyzerIn = analyzerIn;

  const first = typedParams.first as number | undefined;
  if (first !== undefined) result.first = first;

  const last = typedParams.last as number | undefined;
  if (last !== undefined) result.last = last;

  const after = typedParams.after as string | undefined;
  if (after !== undefined) result.after = after;

  const before = typedParams.before as string | undefined;
  if (before !== undefined) result.before = before;

  return result;
}

/**
 * Adapts run parameters from tool schema to handler interface
 */
export function adaptRunParams(params: unknown): DeepsourceRunParams {
  const typedParams = params as Record<string, unknown>;
  return {
    projectKey: typedParams.projectKey as string, // Handler still expects string
    runIdentifier: typedParams.runIdentifier as string, // Handler still expects string
    isCommitOid: (typedParams.isCommitOid as boolean | undefined) || false,
  };
}

/**
 * Adapts recent run issues parameters from tool schema to handler interface
 */
export function adaptRecentRunIssuesParams(params: unknown): DeepsourceRecentRunIssuesParams {
  const typedParams = params as Record<string, unknown>;
  const result: DeepsourceRecentRunIssuesParams = {
    projectKey: typedParams.projectKey as string, // Handler still expects string
    branchName: typedParams.branchName as string,
  };

  const first = typedParams.first as number | undefined;
  if (first !== undefined) result.first = first;

  const last = typedParams.last as number | undefined;
  if (last !== undefined) result.last = last;

  const after = typedParams.after as string | undefined;
  if (after !== undefined) result.after = after;

  const before = typedParams.before as string | undefined;
  if (before !== undefined) result.before = before;

  return result;
}

/**
 * Parameters for domain-based handlers that expect branded types
 */
export interface DomainQualityMetricsParams {
  projectKey: ProjectKey;
  shortcodeIn?: MetricShortcode[];
}

export interface DomainUpdateMetricThresholdParams {
  projectKey: ProjectKey;
  repositoryId: GraphQLNodeId;
  metricShortcode: MetricShortcode;
  metricKey: MetricKey;
  thresholdValue?: number | null;
}

export interface DomainUpdateMetricSettingParams {
  projectKey: ProjectKey;
  repositoryId: GraphQLNodeId;
  metricShortcode: MetricShortcode;
  isReported: boolean;
  isThresholdEnforced: boolean;
}

export interface DomainComplianceReportParams {
  projectKey: ProjectKey;
  reportType: ReportType;
}

export interface DomainProjectIssuesParams {
  projectKey: ProjectKey;
  path?: string;
  analyzerIn?: AnalyzerShortcode[];
  tags?: string[];
  first?: number;
  last?: number;
  after?: string;
  before?: string;
}

export interface DomainDependencyVulnerabilitiesParams {
  projectKey: ProjectKey;
  first?: number;
  last?: number;
  after?: string;
  before?: string;
}

export interface DomainProjectRunsParams {
  projectKey: ProjectKey;
  analyzerIn?: AnalyzerShortcode[];
  first?: number;
  last?: number;
  after?: string;
  before?: string;
}

export interface DomainRunParams {
  projectKey: ProjectKey;
  runIdentifier: RunId | CommitOid;
  isCommitOid?: boolean;
}

export interface DomainRecentRunIssuesParams {
  projectKey: ProjectKey;
  branchName: string;
  first?: number;
  last?: number;
  after?: string;
  before?: string;
}

/**
 * Adapts parameters for domain-based handlers
 */
export function adaptToDomainQualityMetricsParams(params: unknown): DomainQualityMetricsParams {
  const typedParams = params as Record<string, unknown>;
  const result: DomainQualityMetricsParams = {
    projectKey: asProjectKey(typedParams.projectKey as string),
  };

  const shortcodeIn = typedParams.shortcodeIn as MetricShortcode[] | undefined;
  if (shortcodeIn !== undefined) {
    result.shortcodeIn = shortcodeIn;
  }

  return result;
}

/**
 * Adapts raw parameters to domain update metric threshold parameters
 * @param params - Raw parameters from the MCP request
 * @returns Typed domain parameters for updating metric thresholds
 */
export function adaptToDomainUpdateMetricThresholdParams(
  params: unknown
): DomainUpdateMetricThresholdParams {
  const typedParams = params as Record<string, unknown>;
  const result: DomainUpdateMetricThresholdParams = {
    projectKey: asProjectKey(typedParams.projectKey as string),
    repositoryId: asGraphQLNodeId(typedParams.repositoryId as string),
    metricShortcode: typedParams.metricShortcode as MetricShortcode,
    metricKey: typedParams.metricKey as MetricKey,
  };

  const thresholdValue = typedParams.thresholdValue as number | null | undefined;
  if (thresholdValue !== undefined) {
    result.thresholdValue = thresholdValue;
  }

  return result;
}

/**
 * Adapts raw parameters to domain update metric setting parameters
 * @param params - Raw parameters from the MCP request
 * @returns Typed domain parameters for updating metric settings
 */
export function adaptToDomainUpdateMetricSettingParams(
  params: unknown
): DomainUpdateMetricSettingParams {
  const typedParams = params as Record<string, unknown>;
  return {
    projectKey: asProjectKey(typedParams.projectKey as string),
    repositoryId: asGraphQLNodeId(typedParams.repositoryId as string),
    metricShortcode: typedParams.metricShortcode as MetricShortcode,
    isReported: typedParams.isReported as boolean,
    isThresholdEnforced: typedParams.isThresholdEnforced as boolean,
  };
}

/**
 * Adapts raw parameters to domain compliance report parameters
 * @param params - Raw parameters from the MCP request
 * @returns Typed domain parameters for compliance reports
 */
export function adaptToDomainComplianceReportParams(params: unknown): DomainComplianceReportParams {
  const typedParams = params as Record<string, unknown>;
  return {
    projectKey: asProjectKey(typedParams.projectKey as string),
    reportType: typedParams.reportType as ReportType,
  };
}

/**
 * Adapts raw parameters to domain project issues parameters
 * @param params - Raw parameters from the MCP request
 * @returns Typed domain parameters for project issues
 */
export function adaptToDomainProjectIssuesParams(params: unknown): DomainProjectIssuesParams {
  const typedParams = params as Record<string, unknown>;
  const result: DomainProjectIssuesParams = {
    projectKey: asProjectKey(typedParams.projectKey as string),
  };

  const path = typedParams.path as string | undefined;
  if (path !== undefined) result.path = path;

  const analyzerIn = (typedParams.analyzerIn as string[] | undefined)?.map((a: string) =>
    asAnalyzerShortcode(a)
  );
  if (analyzerIn !== undefined) result.analyzerIn = analyzerIn;

  const tags = typedParams.tags as string[] | undefined;
  if (tags !== undefined) result.tags = tags;

  const first = typedParams.first as number | undefined;
  if (first !== undefined) result.first = first;

  const last = typedParams.last as number | undefined;
  if (last !== undefined) result.last = last;

  const after = typedParams.after as string | undefined;
  if (after !== undefined) result.after = after;

  const before = typedParams.before as string | undefined;
  if (before !== undefined) result.before = before;

  return result;
}

/**
 * Adapts raw parameters to domain dependency vulnerabilities parameters
 * @param params - Raw parameters from the MCP request
 * @returns Typed domain parameters for dependency vulnerabilities
 */
export function adaptToDomainDependencyVulnerabilitiesParams(
  params: unknown
): DomainDependencyVulnerabilitiesParams {
  const typedParams = params as Record<string, unknown>;
  const result: DomainDependencyVulnerabilitiesParams = {
    projectKey: asProjectKey(typedParams.projectKey as string),
  };

  const first = typedParams.first as number | undefined;
  if (first !== undefined) result.first = first;

  const last = typedParams.last as number | undefined;
  if (last !== undefined) result.last = last;

  const after = typedParams.after as string | undefined;
  if (after !== undefined) result.after = after;

  const before = typedParams.before as string | undefined;
  if (before !== undefined) result.before = before;

  return result;
}

/**
 * Adapts raw parameters to domain project runs parameters
 * @param params - Raw parameters from the MCP request
 * @returns Typed domain parameters for project runs
 */
export function adaptToDomainProjectRunsParams(params: unknown): DomainProjectRunsParams {
  const typedParams = params as Record<string, unknown>;
  const result: DomainProjectRunsParams = {
    projectKey: asProjectKey(typedParams.projectKey as string),
  };

  const analyzerIn = (typedParams.analyzerIn as string[] | undefined)?.map((a: string) =>
    asAnalyzerShortcode(a)
  );
  if (analyzerIn !== undefined) result.analyzerIn = analyzerIn;

  const first = typedParams.first as number | undefined;
  if (first !== undefined) result.first = first;

  const last = typedParams.last as number | undefined;
  if (last !== undefined) result.last = last;

  const after = typedParams.after as string | undefined;
  if (after !== undefined) result.after = after;

  const before = typedParams.before as string | undefined;
  if (before !== undefined) result.before = before;

  return result;
}

/**
 * Adapts raw parameters to domain run parameters
 * @param params - Raw parameters from the MCP request
 * @returns Typed domain parameters for a specific run
 */
export function adaptToDomainRunParams(params: unknown): DomainRunParams {
  const typedParams = params as Record<string, unknown>;
  const result: DomainRunParams = {
    projectKey: asProjectKey(typedParams.projectKey as string),
    runIdentifier: typedParams.isCommitOid
      ? asCommitOid(typedParams.runIdentifier as string)
      : asRunId(typedParams.runIdentifier as string),
  };

  const isCommitOid = typedParams.isCommitOid as boolean | undefined;
  if (isCommitOid !== undefined) {
    result.isCommitOid = isCommitOid;
  }

  return result;
}

/**
 * Adapts raw parameters to domain recent run issues parameters
 * @param params - Raw parameters from the MCP request
 * @returns Typed domain parameters for recent run issues
 */
export function adaptToDomainRecentRunIssuesParams(params: unknown): DomainRecentRunIssuesParams {
  const typedParams = params as Record<string, unknown>;
  const result: DomainRecentRunIssuesParams = {
    projectKey: asProjectKey(typedParams.projectKey as string),
    branchName: typedParams.branchName as string,
  };

  const first = typedParams.first as number | undefined;
  if (first !== undefined) result.first = first;

  const last = typedParams.last as number | undefined;
  if (last !== undefined) result.last = last;

  const after = typedParams.after as string | undefined;
  if (after !== undefined) result.after = after;

  const before = typedParams.before as string | undefined;
  if (before !== undefined) result.before = before;

  return result;
}
