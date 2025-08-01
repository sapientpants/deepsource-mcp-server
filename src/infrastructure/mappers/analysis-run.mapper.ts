/**
 * @fileoverview AnalysisRun mapper
 *
 * Maps between DeepSource API models and domain AnalysisRun aggregates.
 */

import { AnalysisRun } from '../../domain/aggregates/analysis-run/analysis-run.aggregate.js';
import { DeepSourceRun } from '../../models/runs.js';
import {
  CommitInfo,
  RunSummary,
  RunStatus,
  AnalyzerDistribution,
  CategoryDistribution,
  IssueCategory,
} from '../../domain/aggregates/analysis-run/analysis-run.types.js';
import {
  asRunId,
  asProjectKey,
  asCommitOid,
  asBranchName,
  asAnalyzerShortcode,
  asGraphQLNodeId,
} from '../../types/branded.js';
import { IssueCount } from '../../domain/value-objects/issue-count.js';

/**
 * Maps API status to domain status
 *
 * @param apiStatus - The API status
 * @returns The domain status
 */
function mapApiStatusToDomain(apiStatus: string): RunStatus {
  // API uses different status names than domain
  const statusMap: Record<string, RunStatus> = {
    PENDING: 'PENDING',
    READY: 'RUNNING',
    SUCCESS: 'SUCCESS',
    FAILURE: 'FAILURE',
    TIMEOUT: 'TIMEOUT',
    CANCEL: 'CANCELLED',
    CANCELLED: 'CANCELLED',
    SKIPPED: 'SKIPPED',
  };

  return statusMap[apiStatus] || 'FAILURE';
}

/**
 * Maps API category to domain category
 *
 * @param apiCategory - The API category
 * @returns The domain category
 */
function mapApiCategoryToDomain(apiCategory: string): IssueCategory {
  // Map API categories to domain categories
  const categoryMap: Record<string, IssueCategory> = {
    'anti-pattern': 'ANTI_PATTERN',
    'bug-risk': 'BUG_RISK',
    coverage: 'COVERAGE',
    documentation: 'DOCUMENTATION',
    performance: 'PERFORMANCE',
    security: 'SECURITY',
    style: 'STYLE',
    typecheck: 'TYPE_CHECK',
  };

  return categoryMap[apiCategory.toLowerCase()] || 'OTHER';
}
/**
 * Maps a DeepSource API run to a domain AnalysisRun aggregate
 *
 * @param apiRun - The API run model
 * @param projectKey - The project key (not available in API response)
 * @returns The domain AnalysisRun aggregate
 */
export function mapAnalysisRunToDomain(apiRun: DeepSourceRun, projectKey: string): AnalysisRun {
    const commitInfo: CommitInfo = {
      oid: asCommitOid(apiRun.commitOid),
      branch: asBranchName(apiRun.branchName),
      baseOid: asCommitOid(apiRun.baseOid),
    };

    // Map API status to domain status
    const status = mapApiStatusToDomain(apiRun.status);

    // Map issue distributions
    const analyzerDistributions: AnalyzerDistribution[] =
      apiRun.summary.occurrenceDistributionByAnalyzer?.map((dist) => ({
        analyzerShortcode: asAnalyzerShortcode(dist.analyzerShortcode),
        introduced: IssueCount.create(dist.introduced),
        resolved: IssueCount.create(0), // API doesn't provide resolved by analyzer
        suppressed: IssueCount.create(0), // API doesn't provide suppressed by analyzer
      })) || [];

    const categoryDistributions: CategoryDistribution[] =
      apiRun.summary.occurrenceDistributionByCategory?.map((dist) => ({
        category: mapApiCategoryToDomain(dist.category) as IssueCategory,
        introduced: IssueCount.create(dist.introduced),
        resolved: IssueCount.create(0), // API doesn't provide resolved by category
        suppressed: IssueCount.create(0), // API doesn't provide suppressed by category
      })) || [];

    const summary: RunSummary = {
      totalIntroduced: IssueCount.create(apiRun.summary.occurrencesIntroduced),
      totalResolved: IssueCount.create(apiRun.summary.occurrencesResolved),
      totalSuppressed: IssueCount.create(apiRun.summary.occurrencesSuppressed),
      byAnalyzer: analyzerDistributions,
      byCategory: categoryDistributions,
    };

    const run = AnalysisRun.fromPersistence({
      runId: asRunId(apiRun.runUid),
      projectKey: asProjectKey(projectKey),
      repositoryId: asGraphQLNodeId(apiRun.repository.id),
      commitInfo,
      status,
      timestamps: {
        createdAt: new Date(apiRun.createdAt),
        startedAt: status !== 'PENDING' ? new Date(apiRun.updatedAt) : undefined,
        finishedAt: apiRun.finishedAt ? new Date(apiRun.finishedAt) : undefined,
      },
      summary,
      issues: [], // Issues are fetched separately if needed
    });

    return run;
  }

/**
 * Maps a domain AnalysisRun aggregate to persistence format
 *
 * @param run - The domain AnalysisRun aggregate
 * @returns The persistence model
 */
export function mapAnalysisRunToPersistence(run: AnalysisRun): {
  runId: string;
  projectKey: string;
  repositoryId: string;
  commitInfo: CommitInfo;
  status: RunStatus;
  timestamps: {
    createdAt: Date;
    startedAt?: Date;
    finishedAt?: Date;
  };
  summary?: RunSummary;
  issues: Array<{
    id: string;
    issueCode: string;
    analyzerShortcode: string;
    category: string;
    severity: string;
    message: string;
    path: string;
    line?: number;
    column?: number;
  }>;
} {
  return run.toPersistence();
}

/**
 * Maps multiple API runs to domain aggregates
 *
 * @param apiRuns - Array of API run models
 * @param projectKey - The project key for all runs
 * @returns Array of domain AnalysisRun aggregates
 */
export function mapAnalysisRunsToDomainList(apiRuns: DeepSourceRun[], projectKey: string): AnalysisRun[] {
  return apiRuns.map((run) => mapAnalysisRunToDomain(run, projectKey));
}

// For backward compatibility, export a namespace with the old static methods
export const AnalysisRunMapper = {
  toDomain: mapAnalysisRunToDomain,
  toPersistence: mapAnalysisRunToPersistence,
  toDomainList: mapAnalysisRunsToDomainList,
};
