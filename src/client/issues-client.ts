/**
 * @fileoverview Issues client for the DeepSource API
 * This module provides functionality for working with DeepSource issues.
 */

import { BaseDeepSourceClient } from './base-client.js';
import { DeepSourceIssue, IssueFilterParams } from '../models/issues.js';
import { PaginatedResponse } from '../utils/pagination/types.js';
import { isErrorWithMessage } from '../utils/errors/handlers.js';

/**
 * Client for interacting with DeepSource issues API
 * @class
 * @extends BaseDeepSourceClient
 * @public
 */
export class IssuesClient extends BaseDeepSourceClient {
  /**
   * Fetches issues from a DeepSource project with optional filtering
   * @param projectKey The project key to fetch issues for
   * @param params Optional filter parameters
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
      });

      const project = await this.findProjectByKey(projectKey);
      if (!project) {
        return this.createEmptyPaginatedResponse<DeepSourceIssue>();
      }

      const normalizedParams = this.normalizePaginationParams(params);
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

      const issues = this.extractIssuesFromResponse(response.data);

      this.logger.info('Successfully fetched issues', {
        count: issues.length,
        totalCount: issues.length, // Note: GraphQL API doesn't provide totalCount for issues
      });

      return {
        items: issues,
        pageInfo: {
          hasNextPage: false, // Simplified for now - would need cursor-based pagination
          hasPreviousPage: false,
          startCursor: undefined,
          endCursor: undefined,
        },
        totalCount: issues.length,
      };
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
      ) {
        repository(login: $login, name: $name, vcsProvider: $provider) {
          issues(analyzerIn: $analyzerIn, tags: $tags, path: $path, first: $first, after: $after) {
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
          startCursor: undefined,
          endCursor: undefined,
        },
        totalCount: 0,
      };
    }

    throw error;
  }
}
