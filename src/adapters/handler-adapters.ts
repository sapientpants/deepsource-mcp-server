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
  return {
    projectKey: typedParams.projectKey as string, // Handler still expects string
    shortcodeIn: typedParams.shortcodeIn as MetricShortcode[] | undefined,
  };
}

/**
 * Adapts update metric threshold parameters from tool schema to handler interface
 */
export function adaptUpdateMetricThresholdParams(
  params: unknown
): DeepsourceUpdateMetricThresholdParams {
  const typedParams = params as Record<string, unknown>;
  return {
    projectKey: typedParams.projectKey as string, // Handler still expects string
    repositoryId: typedParams.repositoryId as string, // Handler still expects string
    metricShortcode: typedParams.metricShortcode as MetricShortcode,
    metricKey: typedParams.metricKey as MetricKey,
    thresholdValue: typedParams.thresholdValue as number | null | undefined,
  };
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
  return {
    projectKey: typedParams.projectKey as string, // Handler still expects string
    path: typedParams.path as string | undefined,
    analyzerIn: typedParams.analyzerIn as string[] | undefined,
    tags: typedParams.tags as string[] | undefined,
    first: typedParams.first as number | undefined,
    last: typedParams.last as number | undefined,
    after: typedParams.after as string | undefined,
    before: typedParams.before as string | undefined,
  };
}

/**
 * Adapts dependency vulnerabilities parameters from tool schema to handler interface
 */
export function adaptDependencyVulnerabilitiesParams(
  params: unknown
): DeepsourceDependencyVulnerabilitiesParams {
  const typedParams = params as Record<string, unknown>;
  return {
    projectKey: typedParams.projectKey as string, // Handler still expects string
    first: typedParams.first as number | undefined,
    last: typedParams.last as number | undefined,
    after: typedParams.after as string | undefined,
    before: typedParams.before as string | undefined,
  };
}

/**
 * Adapts project runs parameters from tool schema to handler interface
 */
export function adaptProjectRunsParams(params: unknown): DeepsourceProjectRunsParams {
  const typedParams = params as Record<string, unknown>;
  return {
    projectKey: typedParams.projectKey as string, // Handler still expects string
    analyzerIn: typedParams.analyzerIn as AnalyzerShortcode[] | undefined,
    first: typedParams.first as number | undefined,
    last: typedParams.last as number | undefined,
    after: typedParams.after as string | undefined,
    before: typedParams.before as string | undefined,
  };
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
  return {
    projectKey: typedParams.projectKey as string, // Handler still expects string
    branchName: typedParams.branchName as string,
    first: typedParams.first as number | undefined,
    last: typedParams.last as number | undefined,
    after: typedParams.after as string | undefined,
    before: typedParams.before as string | undefined,
  };
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
  return {
    projectKey: asProjectKey(typedParams.projectKey as string),
    shortcodeIn: typedParams.shortcodeIn as MetricShortcode[] | undefined,
  };
}

export function adaptToDomainUpdateMetricThresholdParams(
  params: unknown
): DomainUpdateMetricThresholdParams {
  const typedParams = params as Record<string, unknown>;
  return {
    projectKey: asProjectKey(typedParams.projectKey as string),
    repositoryId: asGraphQLNodeId(typedParams.repositoryId as string),
    metricShortcode: typedParams.metricShortcode as MetricShortcode,
    metricKey: typedParams.metricKey as MetricKey,
    thresholdValue: typedParams.thresholdValue as number | null | undefined,
  };
}

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

export function adaptToDomainComplianceReportParams(params: unknown): DomainComplianceReportParams {
  const typedParams = params as Record<string, unknown>;
  return {
    projectKey: asProjectKey(typedParams.projectKey as string),
    reportType: typedParams.reportType as ReportType,
  };
}

export function adaptToDomainProjectIssuesParams(params: unknown): DomainProjectIssuesParams {
  const typedParams = params as Record<string, unknown>;
  return {
    projectKey: asProjectKey(typedParams.projectKey as string),
    path: typedParams.path as string | undefined,
    analyzerIn: (typedParams.analyzerIn as string[] | undefined)?.map((a: string) =>
      asAnalyzerShortcode(a)
    ),
    tags: typedParams.tags as string[] | undefined,
    first: typedParams.first as number | undefined,
    last: typedParams.last as number | undefined,
    after: typedParams.after as string | undefined,
    before: typedParams.before as string | undefined,
  };
}

export function adaptToDomainDependencyVulnerabilitiesParams(
  params: unknown
): DomainDependencyVulnerabilitiesParams {
  const typedParams = params as Record<string, unknown>;
  return {
    projectKey: asProjectKey(typedParams.projectKey as string),
    first: typedParams.first as number | undefined,
    last: typedParams.last as number | undefined,
    after: typedParams.after as string | undefined,
    before: typedParams.before as string | undefined,
  };
}

export function adaptToDomainProjectRunsParams(params: unknown): DomainProjectRunsParams {
  const typedParams = params as Record<string, unknown>;
  return {
    projectKey: asProjectKey(typedParams.projectKey as string),
    analyzerIn: (typedParams.analyzerIn as string[] | undefined)?.map((a: string) =>
      asAnalyzerShortcode(a)
    ),
    first: typedParams.first as number | undefined,
    last: typedParams.last as number | undefined,
    after: typedParams.after as string | undefined,
    before: typedParams.before as string | undefined,
  };
}

export function adaptToDomainRunParams(params: unknown): DomainRunParams {
  const typedParams = params as Record<string, unknown>;
  return {
    projectKey: asProjectKey(typedParams.projectKey as string),
    runIdentifier: typedParams.isCommitOid
      ? asCommitOid(typedParams.runIdentifier as string)
      : asRunId(typedParams.runIdentifier as string),
    isCommitOid: typedParams.isCommitOid as boolean | undefined,
  };
}

export function adaptToDomainRecentRunIssuesParams(params: unknown): DomainRecentRunIssuesParams {
  const typedParams = params as Record<string, unknown>;
  return {
    projectKey: asProjectKey(typedParams.projectKey as string),
    branchName: typedParams.branchName as string,
    first: typedParams.first as number | undefined,
    last: typedParams.last as number | undefined,
    after: typedParams.after as string | undefined,
    before: typedParams.before as string | undefined,
  };
}
