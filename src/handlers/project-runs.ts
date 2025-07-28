/**
 * @fileoverview Project runs handler for the DeepSource MCP server
 * This module provides MCP tool handlers for DeepSource project analysis runs.
 */

import { DeepSourceClient, DeepSourceRun } from '../deepsource.js';
import { ApiResponse } from '../models/common.js';
import { createLogger } from '../utils/logging/logger.js';
import { RunFilterParams } from '../models/runs.js';
import { AnalyzerShortcode } from '../types/branded.js';
import { BaseHandlerDeps } from './base/handler.interface.js';
import {
  createBaseHandlerFactory,
  wrapInApiResponse,
  createDefaultHandlerDeps,
} from './base/handler.factory.js';

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
 * Fetches and returns analysis runs from a specified DeepSource project
 * @param params - Parameters for fetching runs, including project key and optional filters
 * @returns A response containing the runs data
 * @throws Error if the DEEPSOURCE_API_KEY environment variable is not set
 * @public
 */
export async function handleDeepsourceProjectRuns(
  params: DeepsourceProjectRunsParams
): Promise<ApiResponse> {
  const deps = createDefaultHandlerDeps({ logger });
  const handler = createProjectRunsHandler(deps);
  return handler(params);
}
