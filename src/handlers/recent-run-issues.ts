/**
 * @fileoverview Recent run issues handler for the DeepSource MCP server
 * This module provides MCP tool handlers for fetching issues from the most recent run.
 */

import { DeepSourceClient } from '../deepsource.js';
import { ApiResponse } from '../models/common.js';
import { DeepSourceIssue } from '../models/issues.js';
import { createLogger, Logger } from '../utils/logging/logger.js';
import { PaginationParams } from '../utils/pagination/types.js';
import { BranchName, asProjectKey, asBranchName } from '../types/branded.js';
import { BaseHandlerDeps } from './base/handler.interface.js';
import {
  createBaseHandlerFactory,
  wrapInApiResponse,
  createDefaultHandlerDeps,
} from './base/handler.factory.js';
import { IAnalysisRunRepository } from '../domain/aggregates/analysis-run/analysis-run.repository.js';
import { RepositoryFactory } from '../infrastructure/factories/repository.factory.js';

// Logger for the recent run issues handler
const logger = createLogger('RecentRunIssuesHandler');

/**
 * Interface for parameters for fetching issues from the most recent run
 * @public
 */
export interface DeepsourceRecentRunIssuesParams extends PaginationParams {
  /** DeepSource project key to fetch issues for */
  projectKey: string;
  /** Branch name to fetch the most recent run from */
  branchName: string;
}

/**
 * Extended dependencies interface for recent run issues handler
 */
interface RecentRunIssuesHandlerDeps {
  analysisRunRepository: IAnalysisRunRepository;
  client: DeepSourceClient;
  logger: Logger;
}

/**
 * Creates a recent run issues handler with injected dependencies using domain aggregates
 * @param deps - The dependencies for the handler
 * @returns The configured handler function
 */
export function createRecentRunIssuesHandlerWithRepo(deps: RecentRunIssuesHandlerDeps) {
  return async function handleRecentRunIssues(params: DeepsourceRecentRunIssuesParams) {
    try {
      const { projectKey, branchName } = params;
      const projectKeyBranded = asProjectKey(projectKey);
      const branchNameBranded = asBranchName(branchName);

      deps.logger.info('Fetching recent run from repository and issues from client', {
        projectKey,
        branchName,
      });

      // Get the most recent run using domain repository
      const recentRun = await deps.analysisRunRepository.findMostRecent(
        projectKeyBranded,
        branchNameBranded
      );

      if (!recentRun) {
        deps.logger.error('No recent run found for branch', { projectKey, branchName });
        throw new Error(
          `No recent analysis run found for branch "${branchName}" in project "${projectKey}"`
        );
      }

      deps.logger.info('Found recent run, fetching issues via client', {
        runId: recentRun.runId,
        commitOid: recentRun.commitInfo.oid,
        branchName: recentRun.commitInfo.branch,
      });

      // Get issues for this run using the client (since we don't have an issue domain aggregate yet)
      const result = await deps.client.getRecentRunIssues(projectKey, branchName as BranchName);

      // Verify we got the same run (sanity check)
      if (!result.run || result.run.runUid !== recentRun.runId) {
        deps.logger.warn('Mismatch between domain run and client run', {
          domainRunId: recentRun.runId,
          clientRunUid: result.run?.runUid || 'null',
        });
      }

      deps.logger.info('Successfully fetched recent run issues', {
        runId: recentRun.runId,
        commitOid: recentRun.commitInfo.oid,
        issueCount: result.items.length,
        totalCount: result.totalCount,
        hasNextPage: result.pageInfo?.hasNextPage,
        hasPreviousPage: result.pageInfo?.hasPreviousPage,
      });

      const recentRunData = {
        run: {
          id: recentRun.runId,
          runUid: recentRun.runId, // Domain aggregate uses runId as unique identifier
          commitOid: recentRun.commitInfo.oid,
          branchName: recentRun.commitInfo.branch,
          baseOid: recentRun.commitInfo.baseOid,
          status: recentRun.status,
          createdAt: recentRun.timestamps.createdAt,
          updatedAt: recentRun.timestamps.startedAt || recentRun.timestamps.createdAt,
          finishedAt: recentRun.timestamps.finishedAt,
          summary: {
            occurrencesIntroduced: recentRun.summary.totalIntroduced.count,
            occurrencesResolved: recentRun.summary.totalResolved.count,
            occurrencesSuppressed: recentRun.summary.totalSuppressed.count,
            occurrenceDistributionByAnalyzer: recentRun.summary.byAnalyzer,
            occurrenceDistributionByCategory: recentRun.summary.byCategory,
          },
          repository: {
            name: 'Repository', // Domain aggregate doesn't store repository name directly
            id: recentRun.repositoryId,
          },
        },
        issues: result.items.map((issue: DeepSourceIssue) => ({
          id: issue.id,
          title: issue.title,
          shortcode: issue.shortcode,
          category: issue.category,
          severity: issue.severity,
          status: issue.status,
          issue_text: issue.issue_text,
          file_path: issue.file_path,
          line_number: issue.line_number,
          tags: issue.tags,
        })),
        pageInfo: {
          hasNextPage: result.pageInfo?.hasNextPage || false,
          hasPreviousPage: result.pageInfo?.hasPreviousPage || false,
          startCursor: result.pageInfo?.startCursor || null,
          endCursor: result.pageInfo?.endCursor || null,
        },
        totalCount: result.totalCount,
        // Provide helpful information and guidance
        usage_examples: {
          pagination: {
            next_page: 'For forward pagination, use first and after parameters',
            previous_page: 'For backward pagination, use last and before parameters',
          },
          related_tools: {
            run_details: 'Use the run tool to get detailed information about a specific run',
            all_issues: 'Use the project_issues tool to get all issues in the project',
            other_runs: 'Use the runs tool to list all runs for the project',
          },
        },
      };

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(recentRunData),
          },
        ],
      };
    } catch (error) {
      deps.logger.error('Error in handleRecentRunIssues', {
        errorType: typeof error,
        errorName: error instanceof Error ? error.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : 'No stack available',
      });

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      deps.logger.debug('Returning error response', { errorMessage });

      return {
        isError: true,
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              error: errorMessage,
              details: 'Failed to retrieve recent run issues',
            }),
          },
        ],
      };
    }
  };
}

/**
 * Creates a recent run issues handler with injected dependencies
 * @param deps - The dependencies for the handler
 * @returns The configured handler factory
 */
export const createRecentRunIssuesHandler = createBaseHandlerFactory(
  'recent_run_issues',
  async (deps: BaseHandlerDeps, { projectKey, branchName }: DeepsourceRecentRunIssuesParams) => {
    const apiKey = deps.getApiKey();
    deps.logger.debug('API key retrieved from config', {
      length: apiKey.length,
      prefix: `${apiKey.substring(0, 5)}...`,
    });

    const client = new DeepSourceClient(apiKey);

    deps.logger.info('Fetching recent run issues', {
      projectKey,
      branchName,
    });

    const result = await client.getRecentRunIssues(projectKey, branchName as BranchName);

    if (!result.run) {
      deps.logger.error('No recent run found for branch', { projectKey, branchName });
      throw new Error(
        `No recent analysis run found for branch "${branchName}" in project "${projectKey}"`
      );
    }

    deps.logger.info('Successfully fetched recent run issues', {
      runUid: result.run.runUid,
      commitOid: result.run.commitOid,
      issueCount: result.items.length,
      totalCount: result.totalCount,
      hasNextPage: result.pageInfo?.hasNextPage,
      hasPreviousPage: result.pageInfo?.hasPreviousPage,
    });

    const recentRunData = {
      run: {
        id: result.run.id,
        runUid: result.run.runUid,
        commitOid: result.run.commitOid,
        branchName: result.run.branchName,
        baseOid: result.run.baseOid,
        status: result.run.status,
        createdAt: result.run.createdAt,
        updatedAt: result.run.updatedAt,
        finishedAt: result.run.finishedAt,
        summary: {
          occurrencesIntroduced: result.run.summary.occurrencesIntroduced,
          occurrencesResolved: result.run.summary.occurrencesResolved,
          occurrencesSuppressed: result.run.summary.occurrencesSuppressed,
          occurrenceDistributionByAnalyzer: result.run.summary.occurrenceDistributionByAnalyzer,
          occurrenceDistributionByCategory: result.run.summary.occurrenceDistributionByCategory,
        },
        repository: {
          name: result.run.repository.name,
          id: result.run.repository.id,
        },
      },
      issues: result.items.map((issue: DeepSourceIssue) => ({
        id: issue.id,
        title: issue.title,
        shortcode: issue.shortcode,
        category: issue.category,
        severity: issue.severity,
        status: issue.status,
        issue_text: issue.issue_text,
        file_path: issue.file_path,
        line_number: issue.line_number,
        tags: issue.tags,
      })),
      pageInfo: {
        hasNextPage: result.pageInfo?.hasNextPage || false,
        hasPreviousPage: result.pageInfo?.hasPreviousPage || false,
        startCursor: result.pageInfo?.startCursor || null,
        endCursor: result.pageInfo?.endCursor || null,
      },
      totalCount: result.totalCount,
      // Provide helpful information and guidance
      usage_examples: {
        pagination: {
          next_page: 'For forward pagination, use first and after parameters',
          previous_page: 'For backward pagination, use last and before parameters',
        },
        related_tools: {
          run_details: 'Use the run tool to get detailed information about a specific run',
          all_issues: 'Use the project_issues tool to get all issues in the project',
          other_runs: 'Use the runs tool to list all runs for the project',
        },
      },
    };

    return wrapInApiResponse(recentRunData);
  }
);

/**
 * Fetches and returns issues from the most recent analysis run on a specific branch using domain aggregates
 * @param params - Parameters for fetching the issues, including project key, branch name, and pagination
 * @returns A response containing the issues data and run information
 * @throws Error if the DEEPSOURCE_API_KEY environment variable is not set
 * @public
 */
export async function handleDeepsourceRecentRunIssues(
  params: DeepsourceRecentRunIssuesParams
): Promise<ApiResponse> {
  const baseDeps = createDefaultHandlerDeps({ logger });
  const apiKey = baseDeps.getApiKey();
  const repositoryFactory = new RepositoryFactory({ apiKey });
  const analysisRunRepository = repositoryFactory.createAnalysisRunRepository();
  const client = new DeepSourceClient(apiKey);

  const deps: RecentRunIssuesHandlerDeps = {
    analysisRunRepository,
    client,
    logger,
  };

  const handler = createRecentRunIssuesHandlerWithRepo(deps);
  const result = await handler(params);

  // If the domain handler returned an error response, throw an error for backward compatibility
  if (result.isError) {
    const errorData = JSON.parse(result.content[0].text);
    throw new Error(errorData.error);
  }

  return result;
}
