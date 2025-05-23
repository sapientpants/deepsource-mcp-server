/**
 * @fileoverview Pagination-related models for DeepSource integration.
 * @packageDocumentation
 */

import { DeepSourceIssue } from './analysis.js';

/**
 * Pagination parameters for API requests
 * @public
 */
export interface PaginationParams {
  first?: number;
  last?: number;
  after?: string;
  before?: string;
}

/**
 * Issue filter parameters extending pagination
 * @public
 */
export interface IssueFilterParams extends PaginationParams {
  analyzerIn?: string[];
  categoryIn?: string[];
  path?: string;
  tags?: string[];
}

/**
 * Run filter parameters extending pagination
 * @public
 */
export interface RunFilterParams extends PaginationParams {
  analyzerIn?: string[];
}

/**
 * Paginated response structure
 * @public
 */
export interface PaginatedResponse<T> {
  data: T[];
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: string;
    endCursor?: string;
  };
  totalCount: number;
}

/**
 * Response structure for recent run issues
 * @public
 */
export interface RecentRunIssuesResponse extends PaginatedResponse<DeepSourceIssue> {
  runUid: string;
  commitOid: string;
  runStatus: string;
}
