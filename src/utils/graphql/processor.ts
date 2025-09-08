/**
 * @fileoverview GraphQL response processors
 * This module provides utilities for processing GraphQL responses.
 */

import { DeepSourceIssue } from '../../models/issues.js';
import { PageInfo } from '../pagination/types.js';

/**
 * Process issues from run checks in a GraphQL response
 * @param response The raw GraphQL response
 * @returns Processed issues with pagination information
 * @public
 */
export function processRunChecksResponse(response: {
  data: {
    data?: {
      run?: {
        checks?: {
          edges?: Array<{
            node: {
              occurrences?: {
                pageInfo?: {
                  hasNextPage: boolean;
                  hasPreviousPage: boolean;
                  startCursor: string | undefined;
                  endCursor: string | undefined;
                };
                totalCount?: number;
                edges?: Array<{
                  node?: {
                    id?: string;
                    issue?: {
                      shortcode?: string;
                      title?: string;
                      category?: string;
                      severity?: string;
                      description?: string;
                      tags?: string[];
                    };
                    path?: string;
                    beginLine?: number;
                  };
                }>;
              };
            };
          }>;
        };
      };
    };
  };
}): {
  issues: DeepSourceIssue[];
  pageInfo: PageInfo;
  totalCount: number;
} {
  const issues: DeepSourceIssue[] = [];
  let pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: string;
    endCursor?: string;
  } = {
    hasNextPage: false,
    hasPreviousPage: false,
  };
  let totalCount = 0;

  const checks = response.data.data?.run?.checks?.edges ?? [];
  for (const { node: check } of checks) {
    const occurrences = check.occurrences?.edges ?? [];
    const occurrencesPageInfo = check.occurrences?.pageInfo;
    const occurrencesTotalCount = check.occurrences?.totalCount ?? 0;

    // Aggregate page info (using the first check's pagination info for simplicity)
    if (occurrencesPageInfo) {
      pageInfo.hasNextPage = occurrencesPageInfo.hasNextPage;
      pageInfo.hasPreviousPage = occurrencesPageInfo.hasPreviousPage;
      if (occurrencesPageInfo.startCursor) {
        pageInfo.startCursor = occurrencesPageInfo.startCursor;
      }
      if (occurrencesPageInfo.endCursor) {
        pageInfo.endCursor = occurrencesPageInfo.endCursor;
      }
      totalCount += occurrencesTotalCount;
    }

    for (const { node: occurrence } of occurrences) {
      if (!occurrence || !occurrence.issue) continue;

      issues.push({
        id: occurrence.id ?? 'unknown',
        shortcode: occurrence.issue.shortcode ?? '',
        title: occurrence.issue.title ?? 'Untitled Issue',
        category: occurrence.issue.category ?? 'UNKNOWN',
        severity: occurrence.issue.severity ?? 'UNKNOWN',
        status: 'OPEN',
        issue_text: occurrence.issue.description ?? '',
        file_path: occurrence.path ?? 'N/A',
        line_number: occurrence.beginLine ?? 0,
        tags: occurrence.issue.tags ?? [],
      });
    }
  }

  return { issues, pageInfo, totalCount };
}

/**
 * Extract error messages from GraphQL error response
 * @param errors Array of GraphQL error objects
 * @returns Formatted error message string
 * @public
 */
export function extractGraphQLErrorMessages(errors: Array<{ message: string }>): string {
  const errorMessages = errors.map((error) => error.message);
  return errorMessages.join(', ');
}
