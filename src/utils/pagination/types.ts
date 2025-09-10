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
  /** Alias for 'first' - Number of items per page (for user convenience) */
  page_size?: number;
  /** Maximum number of pages to fetch (prevents runaway pagination) */
  max_pages?: number;
}

/**
 * Metadata about the pagination state
 * Provides detailed information about the current pagination operation
 * @public
 */
export interface PaginationMetadata {
  /** Whether there are more pages available */
  has_more_pages: boolean;
  /** Cursor to fetch the next page (if available) */
  next_cursor?: string;
  /** Cursor to fetch the previous page (if available) */
  previous_cursor?: string;
  /** Total number of items across all pages (if known) */
  total_count?: number;
  /** Number of items in the current page */
  page_size: number;
  /** Number of pages fetched so far (for multi-page operations) */
  pages_fetched?: number;
  /** Whether the max_pages limit was reached */
  limit_reached?: boolean;
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

/**
 * Paginated response with enhanced metadata for MCP tool responses
 * This extends the standard response with user-friendly pagination info
 * @public
 * @template T - The type of items in the response
 */
export interface PaginatedResponseWithMetadata<T> extends PaginatedResponse<T> {
  /** User-friendly pagination metadata (in addition to pageInfo) */
  pagination?: PaginationMetadata;
}

/**
 * Options for multi-page fetching operations
 * @public
 */
export interface MultiPageOptions {
  /** Maximum number of pages to fetch (default: 10) */
  maxPages?: number;
  /** Page size for each request (default: 50) */
  pageSize?: number;
  /** Whether to fetch all pages regardless of maxPages (use with caution) */
  fetchAll?: boolean;
  /** Callback for progress updates during multi-page fetching */
  onProgress?: (pagesFetched: number, itemsFetched: number) => void;
}

/**
 * Result from a multi-page fetch operation
 * @public
 * @template T - The type of items in the response
 */
export interface MultiPageResult<T> {
  /** All items fetched across all pages */
  items: T[];
  /** Number of pages that were fetched */
  pagesFetched: number;
  /** Whether there are still more pages available */
  hasMore: boolean;
  /** The last cursor position (for resuming later) */
  lastCursor?: string;
  /** Total count if available from the API */
  totalCount?: number;
}
