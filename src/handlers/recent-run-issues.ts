/**
 * @fileoverview Recent run issues handler for the DeepSource MCP server
 * This module provides MCP tool handlers for fetching issues from the most recent run.
 */

import { DeepSourceClient } from '../deepsource.js';
import { ApiResponse } from '../models/common.js';
import { DeepSourceIssue } from '../models/issues.js';
import { createLogger } from '../utils/logging/logger.js';
import { PaginationParams } from '../utils/pagination/types.js';
import { BranchName } from '../types/branded.js';

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
 * Fetches and returns issues from the most recent analysis run on a specific branch
 * @param params - Parameters for fetching the issues, including project key, branch name, and pagination
 * @returns A response containing the issues data and run information
 * @throws Error if the DEEPSOURCE_API_KEY environment variable is not set
 * @public
 */
export async function handleDeepsourceRecentRunIssues({
  projectKey,
  branchName,
}: DeepsourceRecentRunIssuesParams): Promise<ApiResponse> {
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

    logger.info('Fetching recent run issues', {
      projectKey,
      branchName,
    });

    const result = await client.getRecentRunIssues(projectKey, branchName as BranchName);

    if (!result.run) {
      logger.error('No recent run found for branch', { projectKey, branchName });
      throw new Error(
        `No recent analysis run found for branch "${branchName}" in project "${projectKey}"`
      );
    }

    logger.info('Successfully fetched recent run issues', {
      runUid: result.run.runUid,
      commitOid: result.run.commitOid,
      issueCount: result.items.length,
      totalCount: result.totalCount,
      hasNextPage: result.pageInfo?.hasNextPage,
      hasPreviousPage: result.pageInfo?.hasPreviousPage,
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
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
                  occurrenceDistributionByAnalyzer:
                    result.run.summary.occurrenceDistributionByAnalyzer,
                  occurrenceDistributionByCategory:
                    result.run.summary.occurrenceDistributionByCategory,
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
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    logger.error('Error in handleDeepsourceRecentRunIssues', {
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
            details: 'Failed to retrieve recent run issues',
            project_key: projectKey,
            branch_name: branchName,
          }),
        },
      ],
    };
  }
}
