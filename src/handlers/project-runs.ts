/**
 * @fileoverview Project runs handler for the DeepSource MCP server
 * This module provides MCP tool handlers for DeepSource project analysis runs.
 */

import { DeepSourceClient, DeepSourceRun } from '../deepsource.js';
import { ApiResponse } from '../models/common.js';
import { createLogger } from '../utils/logging/logger.js';
import { RunFilterParams } from '../models/runs.js';
import { AnalyzerShortcode } from '../types/branded.js';

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
 * Fetches and returns analysis runs from a specified DeepSource project
 * @param params - Parameters for fetching runs, including project key and optional filters
 * @returns A response containing the runs data
 * @throws Error if the DEEPSOURCE_API_KEY environment variable is not set
 * @public
 */
export async function handleDeepsourceProjectRuns({
  projectKey,
  analyzerIn,
  first,
  after,
  last,
  before,
}: DeepsourceProjectRunsParams): Promise<ApiResponse> {
  const apiKey = process.env.DEEPSOURCE_API_KEY;
  logger.debug('Checking API key', {
    exists: Boolean(apiKey),
    length: apiKey ? apiKey.length : 0,
    prefix: apiKey ? `${apiKey.substring(0, 5)}...` : 'N/A',
  });

  if (!apiKey) {
    logger.error('DEEPSOURCE_API_KEY environment variable is not set');
    throw new Error('DEEPSOURCE_API_KEY environment variable is not set');
  }

  try {
    logger.debug('Creating DeepSource client');
    const client = new DeepSourceClient(apiKey);

    logger.info('Fetching project runs', {
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

    logger.info('Successfully fetched project runs', {
      count: runs.items.length,
      totalCount: runs.totalCount,
      hasNextPage: runs.pageInfo?.hasNextPage,
      hasPreviousPage: runs.pageInfo?.hasPreviousPage,
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
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
                  run_issues:
                    'Use the recent_run_issues tool to get issues from the most recent run',
                },
              },
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    logger.error('Error in handleDeepsourceProjectRuns', {
      errorType: typeof error,
      errorName: error instanceof Error ? error.name : 'Unknown',
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : 'No stack available',
    });

    // Return an error object with details
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.debug('Returning error response', { errorMessage });

    return {
      isError: true,
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            error: errorMessage,
            details: 'Failed to retrieve project runs',
            project_key: projectKey,
          }),
        },
      ],
    };
  }
}
