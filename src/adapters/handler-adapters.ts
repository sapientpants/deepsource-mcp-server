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
export function adaptQualityMetricsParams(params: any): DeepsourceQualityMetricsParams {
  return {
    projectKey: params.projectKey, // Handler still expects string
    shortcodeIn: params.shortcodeIn as MetricShortcode[] | undefined,
  };
}

/**
 * Adapts update metric threshold parameters from tool schema to handler interface
 */
export function adaptUpdateMetricThresholdParams(
  params: any
): DeepsourceUpdateMetricThresholdParams {
  return {
    projectKey: params.projectKey, // Handler still expects string
    repositoryId: params.repositoryId, // Handler still expects string
    metricShortcode: params.metricShortcode as MetricShortcode,
    metricKey: params.metricKey as MetricKey,
    thresholdValue: params.thresholdValue,
  };
}

/**
 * Adapts update metric setting parameters from tool schema to handler interface
 */
export function adaptUpdateMetricSettingParams(params: any): DeepsourceUpdateMetricSettingParams {
  return {
    projectKey: params.projectKey, // Handler still expects string
    repositoryId: params.repositoryId, // Handler still expects string
    metricShortcode: params.metricShortcode as MetricShortcode,
    isReported: params.isReported,
    isThresholdEnforced: params.isThresholdEnforced,
  };
}

/**
 * Adapts compliance report parameters from tool schema to handler interface
 */
export function adaptComplianceReportParams(params: any): DeepsourceComplianceReportParams {
  return {
    projectKey: params.projectKey, // Handler still expects string
    reportType: params.reportType as ReportType,
  };
}

/**
 * Adapts project issues parameters from tool schema to handler interface
 */
export function adaptProjectIssuesParams(params: any): DeepsourceProjectIssuesParams {
  return {
    projectKey: params.projectKey, // Handler still expects string
    path: params.path,
    analyzerIn: params.analyzerIn,
    tags: params.tags,
    first: params.first,
    last: params.last,
    after: params.after,
    before: params.before,
  };
}

/**
 * Adapts dependency vulnerabilities parameters from tool schema to handler interface
 */
export function adaptDependencyVulnerabilitiesParams(
  params: any
): DeepsourceDependencyVulnerabilitiesParams {
  return {
    projectKey: params.projectKey, // Handler still expects string
    first: params.first,
    last: params.last,
    after: params.after,
    before: params.before,
  };
}

/**
 * Adapts project runs parameters from tool schema to handler interface
 */
export function adaptProjectRunsParams(params: any): DeepsourceProjectRunsParams {
  return {
    projectKey: params.projectKey, // Handler still expects string
    analyzerIn: params.analyzerIn,
    first: params.first,
    last: params.last,
    after: params.after,
    before: params.before,
  };
}

/**
 * Adapts run parameters from tool schema to handler interface
 */
export function adaptRunParams(params: any): DeepsourceRunParams {
  return {
    projectKey: params.projectKey, // Handler still expects string
    runIdentifier: params.runIdentifier, // Handler still expects string
    isCommitOid: params.isCommitOid || false,
  };
}

/**
 * Adapts recent run issues parameters from tool schema to handler interface
 */
export function adaptRecentRunIssuesParams(params: any): DeepsourceRecentRunIssuesParams {
  return {
    projectKey: params.projectKey, // Handler still expects string
    branchName: params.branchName,
    first: params.first,
    last: params.last,
    after: params.after,
    before: params.before,
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
export function adaptToDomainQualityMetricsParams(params: any): DomainQualityMetricsParams {
  return {
    projectKey: asProjectKey(params.projectKey),
    shortcodeIn: params.shortcodeIn as MetricShortcode[] | undefined,
  };
}

export function adaptToDomainUpdateMetricThresholdParams(
  params: any
): DomainUpdateMetricThresholdParams {
  return {
    projectKey: asProjectKey(params.projectKey),
    repositoryId: asGraphQLNodeId(params.repositoryId),
    metricShortcode: params.metricShortcode as MetricShortcode,
    metricKey: params.metricKey as MetricKey,
    thresholdValue: params.thresholdValue,
  };
}

export function adaptToDomainUpdateMetricSettingParams(
  params: any
): DomainUpdateMetricSettingParams {
  return {
    projectKey: asProjectKey(params.projectKey),
    repositoryId: asGraphQLNodeId(params.repositoryId),
    metricShortcode: params.metricShortcode as MetricShortcode,
    isReported: params.isReported,
    isThresholdEnforced: params.isThresholdEnforced,
  };
}

export function adaptToDomainComplianceReportParams(params: any): DomainComplianceReportParams {
  return {
    projectKey: asProjectKey(params.projectKey),
    reportType: params.reportType as ReportType,
  };
}

export function adaptToDomainProjectIssuesParams(params: any): DomainProjectIssuesParams {
  return {
    projectKey: asProjectKey(params.projectKey),
    path: params.path,
    analyzerIn: params.analyzerIn?.map((a: string) => asAnalyzerShortcode(a)),
    tags: params.tags,
    first: params.first,
    last: params.last,
    after: params.after,
    before: params.before,
  };
}

export function adaptToDomainDependencyVulnerabilitiesParams(
  params: any
): DomainDependencyVulnerabilitiesParams {
  return {
    projectKey: asProjectKey(params.projectKey),
    first: params.first,
    last: params.last,
    after: params.after,
    before: params.before,
  };
}

export function adaptToDomainProjectRunsParams(params: any): DomainProjectRunsParams {
  return {
    projectKey: asProjectKey(params.projectKey),
    analyzerIn: params.analyzerIn?.map((a: string) => asAnalyzerShortcode(a)),
    first: params.first,
    last: params.last,
    after: params.after,
    before: params.before,
  };
}

export function adaptToDomainRunParams(params: any): DomainRunParams {
  return {
    projectKey: asProjectKey(params.projectKey),
    runIdentifier: params.isCommitOid
      ? asCommitOid(params.runIdentifier)
      : asRunId(params.runIdentifier),
    isCommitOid: params.isCommitOid,
  };
}

export function adaptToDomainRecentRunIssuesParams(params: any): DomainRecentRunIssuesParams {
  return {
    projectKey: asProjectKey(params.projectKey),
    branchName: params.branchName,
    first: params.first,
    last: params.last,
    after: params.after,
    before: params.before,
  };
}
