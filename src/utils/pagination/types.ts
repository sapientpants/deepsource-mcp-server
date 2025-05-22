/**
 * @fileoverview Pagination types for the DeepSource MCP Server
 * This module defines interfaces for pagination parameters and responses.
 */

/**
 * Relay-style pagination information
 * Contains information about whether there are more pages and cursors for navigating between pages.
 * @public
 */
export interface PageInfo {
  /** Whether there are more items after the current page */
  hasNextPage: boolean;
  /** Whether there are more items before the current page */
  hasPreviousPage: boolean;
  /** Cursor for the first item in the current page, used for backward pagination */
  startCursor?: string;
  /** Cursor for the last item in the current page, used for forward pagination */
  endCursor?: string;
}

/**
 * Parameters for paginating through API results
 * Supports both legacy offset-based pagination and Relay-style cursor-based pagination.
 * @public
 */
export interface PaginationParams {
  /** Legacy pagination: Number of items to skip */
  offset?: number;
  /** Relay-style pagination: Number of items to return after the 'after' cursor */
  first?: number;
  /** Relay-style pagination: Cursor to fetch records after this cursor */
  after?: string;
  /** Relay-style pagination: Cursor to fetch records before this cursor */
  before?: string;
  /** Relay-style pagination: Number of items to return before the 'before' cursor */
  last?: number;
}

/**
 * Generic response structure containing paginated results
 * @public
 * @template T - The type of items in the response
 */
export interface PaginatedResponse<T> {
  /** Array of items in the current page */
  items: T[];
  /** Pagination information for navigating between pages */
  pageInfo: PageInfo;
  /** Total number of items across all pages */
  totalCount: number;
}
