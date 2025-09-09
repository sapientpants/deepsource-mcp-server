/**
 * @fileoverview Project issues handler for the DeepSource MCP server
 * This module provides MCP tool handlers for DeepSource project issues.
 */

import { DeepSourceClient } from '../deepsource.js';
import { ApiResponse } from '../models/common.js';
import { createLogger } from '../utils/logging/logger.js';
import { DeepSourceIssue, IssueFilterParams } from '../models/issues.js';
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
    });

    const params: {
      path?: string;
      analyzerIn?: string[];
      tags?: string[];
      first?: number;
      after?: string;
      last?: number;
      before?: string;
    } = {};
    if (path !== undefined) params.path = path;
    if (analyzerIn !== undefined) params.analyzerIn = analyzerIn;
    if (tags !== undefined) params.tags = tags;
    if (first !== undefined) params.first = first;
    if (after !== undefined) params.after = after;
    if (last !== undefined) params.last = last;
    if (before !== undefined) params.before = before;

    const issues = await client.getIssues(projectKey, params);

    deps.logger.info('Successfully fetched project issues', {
      count: issues.items.length,
      totalCount: issues.totalCount,
      hasNextPage: issues.pageInfo?.hasNextPage,
      hasPreviousPage: issues.pageInfo?.hasPreviousPage,
    });

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
