/**
 * @fileoverview Pagination helpers for the DeepSource MCP Server
 * This module provides utilities for working with pagination.
 */

import { createLogger } from '../logging/logger.js';
import { PageInfo, PaginationParams, PaginatedResponse, PaginationMetadata } from './types.js';

// Logger for pagination utilities
const logger = createLogger('PaginationUtils');

/**
 * Creates an empty paginated response with no items
 * @template T The type of items in the response
 * @returns {PaginatedResponse<T>} Empty paginated response with consistent structure
 * @public
 */
export function createEmptyPaginatedResponse<T>(): PaginatedResponse<T> {
  return {
    items: [],
    pageInfo: {
      hasNextPage: false,
      hasPreviousPage: false,
    },
    totalCount: 0,
  };
}

/**
 * Logs a warning message about non-standard pagination usage
 * @param message Optional custom warning message to use instead of the default
 * @private
 */
function logPaginationWarning(message?: string): void {
  const warningMessage =
    message ||
    'Non-standard pagination: Using "last" without "before" is not recommended in Relay pagination';
  logger.warn(warningMessage);
}

/**
 * Normalizes pagination parameters for GraphQL queries
 * Ensures consistency in pagination parameters following Relay pagination best practices
 *
 * Normalization rules:
 * 1. If 'before' is provided (backward pagination):
 *    - Use 'last' as the count parameter (default: 10)
 *    - Remove any 'first' parameter to avoid ambiguity
 * 2. If 'last' is provided without 'before' (non-standard but supported):
 *    - Keep 'last' as is
 *    - Remove any 'first' parameter to avoid ambiguity
 *    - Log a warning about non-standard usage
 * 3. Otherwise (forward pagination or defaults):
 *    - Use 'first' as the count parameter (default: 10)
 *    - Remove any 'last' parameter to avoid ambiguity
 *
 * @template T Type that extends PaginationParams
 * @param {T} params - Original pagination parameters
 * @returns {T} Normalized pagination parameters with consistent values
 * @public
 */
export function normalizePaginationParams<T extends PaginationParams>(params: T): T {
  const normalizedParams = { ...params };

  // Validate and normalize numerical parameters
  if (normalizedParams.offset !== undefined) {
    normalizedParams.offset = Math.max(0, Math.floor(Number(normalizedParams.offset)));
  }

  if (normalizedParams.first !== undefined) {
    // Ensure first is a positive integer or undefined
    normalizedParams.first = Math.max(1, Math.floor(Number(normalizedParams.first)));
  }

  if (normalizedParams.last !== undefined) {
    // Ensure last is a positive integer or undefined
    normalizedParams.last = Math.max(1, Math.floor(Number(normalizedParams.last)));
  }

  // Validate cursor parameters (ensure they're valid strings)
  if (normalizedParams.after !== undefined && typeof normalizedParams.after !== 'string') {
    normalizedParams.after = String(normalizedParams.after ?? '');
  }

  if (normalizedParams.before !== undefined && typeof normalizedParams.before !== 'string') {
    normalizedParams.before = String(normalizedParams.before ?? '');
  }

  // Apply Relay pagination rules
  if (normalizedParams.before) {
    // When fetching backwards with 'before', prioritize 'last'
    normalizedParams.last = normalizedParams.last ?? normalizedParams.first ?? 10;
    delete normalizedParams.first;
  } else if (normalizedParams.last) {
    // If 'last' is provided without 'before', log a warning but still use 'last'
    logPaginationWarning(
      `Non-standard pagination: Using "last=${normalizedParams.last}" without "before" cursor is not recommended`
    );
    // Keep normalizedParams.last as is
    delete normalizedParams.first;
  } else {
    // Default or forward pagination with 'after', prioritize 'first'
    normalizedParams.first = normalizedParams.first ?? 10;
    delete normalizedParams.last;
  }

  return normalizedParams;
}

/**
 * Creates a formatted pagination help object for API responses
 * @param pageInfo The page information to create help documentation for
 * @returns Pagination help documentation object
 * @public
 */
export function createPaginationHelp(pageInfo: PageInfo): Record<string, unknown> {
  return {
    description: 'This API uses Relay-style cursor-based pagination',
    forward_pagination: `To get the next page, use 'first: 10, after: "${
      pageInfo.endCursor || 'cursor_value'
    }"'`,
    backward_pagination: `To get the previous page, use 'last: 10, before: "${
      pageInfo.startCursor || 'cursor_value'
    }"'`,
    page_status: {
      has_next_page: pageInfo.hasNextPage,
      has_previous_page: pageInfo.hasPreviousPage,
    },
  };
}

/**
 * Creates a detailed pagination help object for API responses with more examples
 * @param pageInfo The page information to create help documentation for
 * @param itemCount The number of items in the current page
 * @returns Enhanced pagination help documentation object
 * @public
 */
export function createEnhancedPaginationHelp(
  pageInfo: PageInfo,
  itemCount: number
): Record<string, unknown> {
  return {
    description: 'This API uses Relay-style cursor-based pagination for efficient data retrieval',
    current_page: {
      size: itemCount,
      has_next_page: pageInfo.hasNextPage,
      has_previous_page: pageInfo.hasPreviousPage,
    },
    next_page: pageInfo.hasNextPage
      ? {
          example: `{"first": 10, "after": "${pageInfo.endCursor}"}`,
          description: 'Use these parameters to fetch the next page of results',
        }
      : null,
    previous_page: pageInfo.hasPreviousPage
      ? {
          example: `{"last": 10, "before": "${pageInfo.startCursor}"}`,
          description: 'Use these parameters to fetch the previous page of results',
        }
      : null,
    pagination_types: {
      forward: 'For forward pagination, use "first" with optional "after" cursor',
      backward: 'For backward pagination, use "last" with optional "before" cursor',
      legacy: 'Legacy offset-based pagination is also supported via the "offset" parameter',
    },
  };
}

/**
 * Handles page_size parameter as an alias for first
 * @param params Pagination parameters that may include page_size
 * @returns Normalized params with first set appropriately
 * @public
 */
export function handlePageSizeAlias(params: PaginationParams): PaginationParams {
  const { page_size, ...restParams } = params;

  // Use page_size as an alias for first if first is not already set
  if (page_size !== undefined && restParams.first === undefined && !restParams.before) {
    restParams.first = page_size;
  }

  return restParams;
}

/**
 * Determines if multi-page fetching is needed based on parameters
 * @param params Pagination parameters
 * @returns Whether multiple pages should be fetched
 * @public
 */
export function shouldFetchMultiplePages(params: PaginationParams): boolean {
  return params.max_pages !== undefined && params.max_pages > 1;
}

/**
 * Creates pagination metadata from a standard response
 * @param response Paginated response
 * @param pagesFetched Number of pages fetched (for multi-page operations)
 * @returns User-friendly pagination metadata
 * @public
 */
export function createPaginationMetadata<T>(
  response: PaginatedResponse<T>,
  pagesFetched = 1
): PaginationMetadata {
  const metadata: PaginationMetadata = {
    has_more_pages: response.pageInfo.hasNextPage,
    page_size: response.items.length,
  };

  if (response.pageInfo.endCursor) {
    metadata.next_cursor = response.pageInfo.endCursor;
  }
  if (response.pageInfo.startCursor) {
    metadata.previous_cursor = response.pageInfo.startCursor;
  }
  if (response.totalCount > 0) {
    metadata.total_count = response.totalCount;
  }
  if (pagesFetched > 1) {
    metadata.pages_fetched = pagesFetched;
  }

  return metadata;
}
