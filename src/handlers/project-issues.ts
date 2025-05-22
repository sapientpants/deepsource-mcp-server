/**
 * @fileoverview Project issues handler for the DeepSource MCP server
 * This module provides MCP tool handlers for DeepSource project issues.
 */

import { DeepSourceClient } from '../deepsource.js';
import { ApiResponse } from '../models/common.js';
import { createLogger } from '../utils/logging/logger.js';
import { DeepSourceIssue, IssueFilterParams } from '../models/issues.js';

// Logger for the project issues handler
const logger = createLogger('ProjectIssuesHandler');

/**
 * Interface for parameters for fetching project issues
 * @public
 */
export interface DeepsourceProjectIssuesParams extends IssueFilterParams {
  /** DeepSource project key to fetch issues for */
  projectKey: string;
}

/**
 * Fetches and returns issues from a specified DeepSource project
 * @param params - Parameters for fetching issues, including project key and optional filters
 * @returns A response containing the issues data
 * @throws Error if the DEEPSOURCE_API_KEY environment variable is not set
 * @public
 */
export async function handleDeepsourceProjectIssues({
  projectKey,
  path,
  analyzerIn,
  tags,
  first,
  after,
  last,
  before,
}: DeepsourceProjectIssuesParams): Promise<ApiResponse> {
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

    logger.info('Fetching project issues', {
      projectKey,
      hasFilterPath: Boolean(path),
      hasAnalyzerFilter: Boolean(analyzerIn),
      hasTagsFilter: Boolean(tags),
    });

    const issues = await client.getIssues(projectKey, {
      path,
      analyzerIn,
      tags,
      first,
      after,
      last,
      before,
    });

    logger.info('Successfully fetched project issues', {
      count: issues.items.length,
      totalCount: issues.totalCount,
      hasNextPage: issues.pageInfo?.hasNextPage,
      hasPreviousPage: issues.pageInfo?.hasPreviousPage,
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              issues: issues.items.map((issue: DeepSourceIssue) => ({
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
                hasNextPage: issues.pageInfo?.hasNextPage || false,
                hasPreviousPage: issues.pageInfo?.hasPreviousPage || false,
                startCursor: issues.pageInfo?.startCursor || null,
                endCursor: issues.pageInfo?.endCursor || null,
              },
              totalCount: issues.totalCount,
              // Provide helpful guidance on filtering and pagination
              usage_examples: {
                filtering: {
                  by_path: 'Use the path parameter to filter issues by file path',
                  by_analyzer: 'Use the analyzerIn parameter to filter by specific analyzers',
                  by_tags: 'Use the tags parameter to filter by specific tags',
                },
                pagination: {
                  next_page: 'For forward pagination, use first and after parameters',
                  previous_page: 'For backward pagination, use last and before parameters',
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
    logger.error('Error in handleDeepsourceProjectIssues', {
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
            details: 'Failed to retrieve project issues',
            project_key: projectKey,
          }),
        },
      ],
    };
  }
}
