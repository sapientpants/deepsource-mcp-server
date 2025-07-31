/**
 * @fileoverview Project runs handler for the DeepSource MCP server
 * This module provides MCP tool handlers for DeepSource project analysis runs.
 */

import { DeepSourceClient, DeepSourceRun } from '../deepsource.js';
import { ApiResponse } from '../models/common.js';
import { createLogger, Logger } from '../utils/logging/logger.js';
import { RunFilterParams } from '../models/runs.js';
import { AnalyzerShortcode, asProjectKey } from '../types/branded.js';
import { BaseHandlerDeps } from './base/handler.interface.js';
import {
  createBaseHandlerFactory,
  wrapInApiResponse,
  createDefaultHandlerDeps,
} from './base/handler.factory.js';
import { IAnalysisRunRepository } from '../domain/aggregates/analysis-run/analysis-run.repository.js';
import { AnalysisRun } from '../domain/aggregates/analysis-run/analysis-run.aggregate.js';
import { RepositoryFactory } from '../infrastructure/factories/repository.factory.js';

// Logger for the project runs handler
const logger = createLogger('ProjectRunsHandler');

/**
 * Interface for parameters for fetching project runs
 * @public
 */
export interface DeepsourceProjectRunsParams extends RunFilterParams {
  /** DeepSource project key to fetch runs for */
  projectKey: string;
}

/**
 * Extended dependencies interface for project runs handler
 */
interface ProjectRunsHandlerDeps {
  analysisRunRepository: IAnalysisRunRepository;
  logger: Logger;
}

/**
 * Creates a project runs handler with injected dependencies using domain aggregates
 * @param deps - The dependencies for the handler
 * @returns The configured handler function
 */
export function createProjectRunsHandlerWithRepo(deps: ProjectRunsHandlerDeps) {
  return async function handleProjectRuns(params: DeepsourceProjectRunsParams) {
    try {
      const { projectKey, analyzerIn, first } = params;
      // Note: after, last, before pagination parameters not yet implemented
      const projectKeyBranded = asProjectKey(projectKey);
      deps.logger.info('Fetching project runs from repository', {
        projectKey,
        hasAnalyzerFilter: Boolean(analyzerIn),
      });

      // Get the analysis runs from repository
      // Note: Basic pagination using page/pageSize for now
      // Note: Advanced pagination and analyzer filtering can be implemented in future versions
      const pageSize = first || 20; // Default page size
      const page = 1; // For now, always fetch first page

      const result = await deps.analysisRunRepository.findByProject(projectKeyBranded, {
        page,
        pageSize,
      });

      deps.logger.info('Successfully fetched project runs', {
        count: result.items.length,
        totalCount: result.totalCount,
        hasNextPage: result.hasNextPage,
        hasPreviousPage: result.hasPreviousPage,
      });

      const runsData = {
        runs: result.items.map((run: AnalysisRun) => ({
          id: run.runId,
          runUid: run.runId, // Domain aggregate uses runId as the unique identifier
          commitOid: run.commitInfo.oid,
          branchName: run.commitInfo.branch,
          baseOid: run.commitInfo.baseOid,
          status: run.status,
          createdAt: run.timestamps.createdAt,
          updatedAt: run.timestamps.startedAt || run.timestamps.createdAt, // Use startedAt or fallback to createdAt
          finishedAt: run.timestamps.finishedAt,
          summary: {
            occurrencesIntroduced: run.summary.totalIntroduced.count,
            occurrencesResolved: run.summary.totalResolved.count,
            occurrencesSuppressed: run.summary.totalSuppressed.count,
            occurrenceDistributionByAnalyzer: run.summary.byAnalyzer,
            occurrenceDistributionByCategory: run.summary.byCategory,
          },
          repository: {
            name: 'Repository', // Domain aggregate doesn't store repository name directly
            id: run.repositoryId,
          },
        })),
        pageInfo: {
          hasNextPage: result.hasNextPage || false,
          hasPreviousPage: result.hasPreviousPage || false,
          startCursor: null, // Cursor-based pagination not yet implemented in domain layer
          endCursor: null, // Cursor-based pagination not yet implemented in domain layer
        },
        totalCount: result.totalCount,
        // Provide helpful guidance on filtering and pagination
        usage_examples: {
          filtering: {
            by_analyzer: 'Use the analyzerIn parameter to filter by specific analyzers',
          },
          pagination: {
            next_page: 'For forward pagination, use first and after parameters',
            previous_page: 'For backward pagination, use last and before parameters',
          },
          related_tools: {
            run_details: 'Use the run tool to get detailed information about a specific run',
            run_issues: 'Use the recent_run_issues tool to get issues from the most recent run',
          },
        },
      };

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(runsData),
          },
        ],
      };
    } catch (error) {
      deps.logger.error('Error in handleProjectRuns', {
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
              details: 'Failed to retrieve project runs',
            }),
          },
        ],
      };
    }
  };
}

/**
 * Creates a project runs handler with injected dependencies
 * @param deps - The dependencies for the handler
 * @returns The configured handler factory
 */
export const createProjectRunsHandler = createBaseHandlerFactory(
  'runs',
  async (
    deps: BaseHandlerDeps,
    { projectKey, analyzerIn, first, after, last, before }: DeepsourceProjectRunsParams
  ) => {
    const apiKey = deps.getApiKey();
    deps.logger.debug('API key retrieved from config', {
      length: apiKey.length,
      prefix: `${apiKey.substring(0, 5)}...`,
    });

    const client = new DeepSourceClient(apiKey);

    deps.logger.info('Fetching project runs', {
      projectKey,
      hasAnalyzerFilter: Boolean(analyzerIn),
    });

    const runs = await client.listRuns(projectKey, {
      analyzerIn: analyzerIn as AnalyzerShortcode[],
      first,
      after,
      last,
      before,
    });

    deps.logger.info('Successfully fetched project runs', {
      count: runs.items.length,
      totalCount: runs.totalCount,
      hasNextPage: runs.pageInfo?.hasNextPage,
      hasPreviousPage: runs.pageInfo?.hasPreviousPage,
    });

    const runsData = {
      runs: runs.items.map((run: DeepSourceRun) => ({
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
          occurrencesIntroduced: run.summary.occurrencesIntroduced,
          occurrencesResolved: run.summary.occurrencesResolved,
          occurrencesSuppressed: run.summary.occurrencesSuppressed,
          occurrenceDistributionByAnalyzer: run.summary.occurrenceDistributionByAnalyzer,
          occurrenceDistributionByCategory: run.summary.occurrenceDistributionByCategory,
        },
        repository: {
          name: run.repository.name,
          id: run.repository.id,
        },
      })),
      pageInfo: {
        hasNextPage: runs.pageInfo?.hasNextPage || false,
        hasPreviousPage: runs.pageInfo?.hasPreviousPage || false,
        startCursor: runs.pageInfo?.startCursor || null,
        endCursor: runs.pageInfo?.endCursor || null,
      },
      totalCount: runs.totalCount,
      // Provide helpful guidance on filtering and pagination
      usage_examples: {
        filtering: {
          by_analyzer: 'Use the analyzerIn parameter to filter by specific analyzers',
        },
        pagination: {
          next_page: 'For forward pagination, use first and after parameters',
          previous_page: 'For backward pagination, use last and before parameters',
        },
        related_tools: {
          run_details: 'Use the run tool to get detailed information about a specific run',
          run_issues: 'Use the recent_run_issues tool to get issues from the most recent run',
        },
      },
    };

    return wrapInApiResponse(runsData);
  }
);

/**
 * Fetches and returns analysis runs from a specified DeepSource project using domain aggregates
 * @param params - Parameters for fetching runs, including project key and optional filters
 * @returns A response containing the runs data
 * @throws Error if the DEEPSOURCE_API_KEY environment variable is not set
 * @public
 */
export async function handleDeepsourceProjectRuns(
  params: DeepsourceProjectRunsParams
): Promise<ApiResponse> {
  const baseDeps = createDefaultHandlerDeps({ logger });
  const apiKey = baseDeps.getApiKey();
  const repositoryFactory = new RepositoryFactory({ apiKey });
  const analysisRunRepository = repositoryFactory.createAnalysisRunRepository();

  const deps: ProjectRunsHandlerDeps = {
    analysisRunRepository,
    logger,
  };

  const handler = createProjectRunsHandlerWithRepo(deps);
  const result = await handler(params);

  // If the domain handler returned an error response, throw an error for backward compatibility
  if (result.isError) {
    const errorData = JSON.parse(result.content[0].text);
    throw new Error(errorData.error);
  }

  return result;
}
