/**
 * @fileoverview Project issues handler for the DeepSource MCP server
 * This module provides MCP tool handlers for DeepSource project issues.
 */

import { DeepSourceClient } from '../deepsource.js';
import { ApiResponse } from '../models/common.js';
import { createLogger } from '../utils/logging/logger.js';
import { DeepSourceIssue, IssueFilterParams } from '../models/issues.js';
import { createPaginationMetadata } from '../utils/pagination/helpers.js';
import { BaseHandlerDeps } from './base/handler.interface.js';
import {
  createBaseHandlerFactory,
  wrapInApiResponse,
  createDefaultHandlerDeps,
} from './base/handler.factory.js';

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
 * Creates a project issues handler with injected dependencies
 * @param deps - The dependencies for the handler
 * @returns The configured handler factory
 */
export const createProjectIssuesHandler = createBaseHandlerFactory(
  'project_issues',
  async (
    deps: BaseHandlerDeps,
    {
      projectKey,
      path,
      analyzerIn,
      tags,
      first,
      after,
      last,
      before,
      page_size,
      max_pages,
    }: DeepsourceProjectIssuesParams
  ) => {
    const apiKey = deps.getApiKey();
    deps.logger.debug('API key retrieved from config', {
      length: apiKey.length,
      prefix: `${apiKey.substring(0, 5)}...`,
    });

    const client = new DeepSourceClient(apiKey);

    deps.logger.info('Fetching project issues', {
      projectKey,
      hasFilterPath: Boolean(path),
      hasAnalyzerFilter: Boolean(analyzerIn),
      hasTagsFilter: Boolean(tags),
      maxPages: max_pages,
    });

    const params: IssueFilterParams = {};
    if (path !== undefined) params.path = path;
    if (analyzerIn !== undefined) params.analyzerIn = analyzerIn;
    if (tags !== undefined) params.tags = tags;
    if (first !== undefined) params.first = first;
    if (after !== undefined) params.after = after;
    if (last !== undefined) params.last = last;
    if (before !== undefined) params.before = before;
    if (page_size !== undefined) params.page_size = page_size;
    if (max_pages !== undefined) params.max_pages = max_pages;

    const issues = await client.getIssues(projectKey, params);

    deps.logger.info('Successfully fetched project issues', {
      count: issues.items.length,
      totalCount: issues.totalCount,
      hasNextPage: issues.pageInfo?.hasNextPage,
      hasPreviousPage: issues.pageInfo?.hasPreviousPage,
    });

    // Create pagination metadata for user-friendly response
    const paginationMetadata = createPaginationMetadata(issues);

    const issuesData = {
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
      // Include both formats for backward compatibility and user convenience
      pageInfo: {
        hasNextPage: issues.pageInfo?.hasNextPage || false,
        hasPreviousPage: issues.pageInfo?.hasPreviousPage || false,
        startCursor: issues.pageInfo?.startCursor || null,
        endCursor: issues.pageInfo?.endCursor || null,
      },
      pagination: paginationMetadata,
      totalCount: issues.totalCount,
      // Provide helpful guidance on filtering and pagination
      usage_examples: {
        filtering: {
          by_path: 'Use the path parameter to filter issues by file path',
          by_analyzer: 'Use the analyzerIn parameter to filter by specific analyzers',
          by_tags: 'Use the tags parameter to filter by specific tags',
        },
        pagination: {
          next_page: max_pages
            ? 'Multi-page fetching enabled with max_pages parameter'
            : 'For forward pagination, use first and after parameters',
          previous_page: 'For backward pagination, use last and before parameters',
          page_size: 'Use page_size parameter as a convenient alias for first',
          multi_page: 'Use max_pages to automatically fetch multiple pages (e.g., max_pages: 5)',
        },
      },
    };

    return wrapInApiResponse(issuesData);
  }
);

/**
 * Fetches and returns issues from a specified DeepSource project
 * @param params - Parameters for fetching issues, including project key and optional filters
 * @returns A response containing the issues data
 * @throws Error if the DEEPSOURCE_API_KEY environment variable is not set
 * @public
 */
export async function handleDeepsourceProjectIssues(
  params: DeepsourceProjectIssuesParams
): Promise<ApiResponse> {
  const deps = createDefaultHandlerDeps({ logger });
  const handler = createProjectIssuesHandler(deps);
  return handler(params);
}
