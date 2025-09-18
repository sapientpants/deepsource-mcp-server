/**
 * @fileoverview Issues client for the DeepSource API
 * This module provides functionality for working with DeepSource issues.
 */

import { BaseDeepSourceClient } from './base-client.js';
import { DeepSourceIssue, IssueFilterParams } from '../models/issues.js';
import { PaginatedResponse, PageInfo } from '../utils/pagination/types.js';
import { isErrorWithMessage } from '../utils/errors/handlers.js';
// TODO: Enable optimized queries in future iteration
// import { createOptimizedIssuesQuery } from '../utils/graphql/optimized-queries.js';
// import { queryPerformanceTracker } from '../utils/graphql/query-optimizer.js';

/**
 * Client for interacting with DeepSource issues API
 * @class
 * @extends BaseDeepSourceClient
 * @public
 */
export class IssuesClient extends BaseDeepSourceClient {
  /**
   * Fetches issues from a DeepSource project with optional filtering
   * Supports multi-page fetching when max_pages is specified
   * @param projectKey The project key to fetch issues for
   * @param params Optional filter parameters including pagination
   * @returns Promise that resolves to a paginated list of issues
   * @throws {ClassifiedError} When the API request fails
   * @public
   */
  async getIssues(
    projectKey: string,
    params: IssueFilterParams = {}
  ): Promise<PaginatedResponse<DeepSourceIssue>> {
    try {
      this.logger.info('Fetching issues from DeepSource API', {
        projectKey,
        hasFilters: Object.keys(params).length > 0,
        maxPages: params.max_pages,
      });

      const project = await this.findProjectByKey(projectKey);
      if (!project) {
        return BaseDeepSourceClient.createEmptyPaginatedResponse<DeepSourceIssue>();
      }

      // Create a fetcher function for single page
      const singlePageFetcher = async (
        pageParams: IssueFilterParams
      ): Promise<PaginatedResponse<DeepSourceIssue>> => {
        const normalizedParams = BaseDeepSourceClient.normalizePaginationParams(pageParams);

        // For now, use the original query until optimization is fully implemented
        const query = IssuesClient.buildIssuesQuery();

        const response = await this.executeGraphQL(query, {
          login: project.repository.login,
          name: project.repository.name,
          provider: project.repository.provider,
          ...normalizedParams,
        });

        if (!response.data) {
          throw new Error('No data received from GraphQL API');
        }

        const responseData = response.data as { repository?: { issues?: unknown } };
        const issuesData = responseData.repository?.issues as
          | {
              pageInfo?: PageInfo;
              totalCount?: number;
              edges?: unknown[];
            }
          | undefined;
        if (!issuesData) {
          return BaseDeepSourceClient.createEmptyPaginatedResponse<DeepSourceIssue>();
        }

        const issues = this.extractIssuesFromResponse(response.data);
        const pageInfo: PageInfo = issuesData.pageInfo || {
          hasNextPage: false,
          hasPreviousPage: false,
        };
        const totalCount = issuesData.totalCount || issues.length;

        this.logger.debug('Fetched issues page', {
          count: issues.length,
          totalCount,
          hasNextPage: pageInfo.hasNextPage,
        });

        return {
          items: issues,
          pageInfo,
          totalCount,
        };
      };

      // Use fetchWithPagination for automatic multi-page support
      const result = await this.fetchWithPagination(singlePageFetcher, params);

      this.logger.info('Successfully fetched all issues', {
        totalItems: result.items.length,
        totalCount: result.totalCount,
      });

      return result;
    } catch (error) {
      return this.handleIssuesError(error);
    }
  }

  /**
   * Fetches a specific issue by ID
   * @param projectKey The project key
   * @param issueId The issue ID to fetch
   * @returns Promise that resolves to the issue if found, null otherwise
   * @public
   */
  async getIssue(projectKey: string, issueId: string): Promise<DeepSourceIssue | null> {
    try {
      const result = await this.getIssues(projectKey);
      return result.items.find((issue) => issue.id === issueId) || null;
    } catch (error) {
      this.logger.error('Error fetching specific issue', { projectKey, issueId, error });
      throw error;
    }
  }

  /**
   * Builds the GraphQL query for fetching issues
   * @deprecated Use createOptimizedIssuesQuery instead for better performance
   * @private
   */
  private static buildIssuesQuery(): string {
    return `
      query getRepositoryIssues(
        $login: String!
        $name: String!
        $provider: VCSProvider!
        $analyzerIn: [String!]
        $tags: [String!]
        $path: String
        $first: Int
        $after: String
        $last: Int
        $before: String
      ) {
        repository(login: $login, name: $name, vcsProvider: $provider) {
          issues(
            analyzerIn: $analyzerIn, 
            tags: $tags, 
            path: $path, 
            first: $first, 
            after: $after,
            last: $last,
            before: $before
          ) {
            totalCount
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
            edges {
              node {
                id
                title
                shortcode
                category
                severity
                occurrences(first: 1) {
                  edges {
                    node {
                      id
                      status
                      issueText
                      filePath
                      beginLine
                      tags
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;
  }

  /**
   * Extracts issues from GraphQL response
   * @private
   */
  private extractIssuesFromResponse(responseData: unknown): DeepSourceIssue[] {
    const issues: DeepSourceIssue[] = [];

    try {
      const repository = (responseData as Record<string, unknown>)?.repository as Record<
        string,
        unknown
      >;
      const repositoryIssues = repository?.issues as Record<string, unknown>;
      const repoIssues = (repositoryIssues?.edges ?? []) as Array<Record<string, unknown>>;

      for (const { node: repoIssue } of repoIssues) {
        const issueNode = repoIssue as Record<string, unknown>;
        const occurrences = ((issueNode.occurrences as Record<string, unknown>)?.edges ??
          []) as Array<Record<string, unknown>>;

        for (const { node: occurrence } of occurrences) {
          const occurrenceNode = occurrence as Record<string, unknown>;
          issues.push({
            id: String(occurrenceNode.id ?? 'unknown'),
            title: String(issueNode.title ?? 'Unknown Issue'),
            shortcode: String(issueNode.shortcode ?? 'UNKNOWN'),
            category: String(issueNode.category ?? 'UNKNOWN'),
            severity: String(issueNode.severity ?? 'UNKNOWN'),
            status: String(occurrenceNode.status ?? 'UNKNOWN'),
            issue_text: String(occurrenceNode.issueText ?? ''),
            file_path: String(occurrenceNode.filePath ?? ''),
            line_number: Number(occurrenceNode.beginLine ?? 0),
            tags: Array.isArray(occurrenceNode.tags) ? (occurrenceNode.tags as string[]) : [],
          });
        }
      }
    } catch (error) {
      this.logger.error('Error extracting issues from response', { error });
    }

    return issues;
  }

  /**
   * Handles errors during issues fetching
   * @private
   */
  private handleIssuesError(error: unknown): PaginatedResponse<DeepSourceIssue> {
    this.logger.error('Error in getIssues', {
      errorType: typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
    });

    // Handle special case where no issues exist
    if (isErrorWithMessage(error, 'NoneType')) {
      return {
        items: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
        },
        totalCount: 0,
      };
    }

    throw error;
  }
}
