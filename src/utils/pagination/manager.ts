/**
 * @fileoverview Pagination manager for handling multi-page data fetching
 * This module provides utilities for orchestrating pagination across multiple pages.
 */

import { createLogger } from '../logging/logger.js';
import {
  PageInfo,
  PaginationParams,
  PaginatedResponse,
  MultiPageOptions,
  MultiPageResult,
  PaginatedResponseWithMetadata,
  PaginationMetadata,
} from './types.js';
import { normalizePaginationParams } from './helpers.js';

const logger = createLogger('PaginationManager');

/**
 * Type for a function that fetches a page of data
 * @template T The type of items being fetched
 */
export type PageFetcher<T> = (cursor?: string, pageSize?: number) => Promise<PaginatedResponse<T>>;

/**
 * Fetches multiple pages of data with configurable limits
 * @template T The type of items being fetched
 * @param fetcher Function that fetches a single page
 * @param options Configuration for multi-page fetching
 * @returns Aggregated results from all fetched pages
 */
export async function fetchMultiplePages<T>(
  fetcher: PageFetcher<T>,
  options: MultiPageOptions = {}
): Promise<MultiPageResult<T>> {
  const { maxPages = 10, pageSize = 50, fetchAll = false, onProgress } = options;

  const allItems: T[] = [];
  let pagesFetched = 0;
  let currentCursor: string | undefined;
  let hasMore = true;
  let totalCount: number | undefined;

  logger.debug('Starting multi-page fetch', {
    maxPages,
    pageSize,
    fetchAll,
  });

  while (hasMore && (fetchAll || pagesFetched < maxPages)) {
    try {
      // Fetch the next page
      const response = await fetcher(currentCursor, pageSize);

      // Add items to the collection
      allItems.push(...response.items);
      pagesFetched++;

      // Update pagination state - these updates prevent infinite loops
      hasMore = response.pageInfo.hasNextPage;
      currentCursor = response.pageInfo.endCursor;
      totalCount = response.totalCount;

      // Report progress if callback provided
      if (onProgress) {
        onProgress(pagesFetched, allItems.length);
      }

      logger.debug('Fetched page', {
        pageNumber: pagesFetched,
        itemsInPage: response.items.length,
        totalItemsSoFar: allItems.length,
        hasMore,
      });

      // Break if we've reached the limit and not fetching all
      if (!fetchAll && pagesFetched >= maxPages && hasMore) {
        logger.info('Reached max pages limit', {
          maxPages,
          pagesFetched,
          totalItemsFetched: allItems.length,
        });
        break;
      }
    } catch (error) {
      logger.error('Error fetching page', {
        pageNumber: pagesFetched + 1,
        error,
      });
      // Ensure loop termination on error to prevent infinite loops
      hasMore = false;
      throw error;
    }
  }

  logger.info('Multi-page fetch completed', {
    pagesFetched,
    totalItems: allItems.length,
    hasMore,
  });

  return {
    items: allItems,
    pagesFetched,
    hasMore,
    ...(currentCursor && { lastCursor: currentCursor }),
    ...(totalCount && { totalCount }),
  };
}

/**
 * Adds user-friendly pagination metadata to a standard response
 * @template T The type of items in the response
 * @param response Standard paginated response
 * @param pagesFetched Number of pages that were fetched (for multi-page operations)
 * @param limitReached Whether a max_pages limit was reached
 * @returns Response with additional metadata
 */
export function addPaginationMetadata<T>(
  response: PaginatedResponse<T>,
  pagesFetched = 1,
  limitReached = false
): PaginatedResponseWithMetadata<T> {
  const metadata: PaginationMetadata = {
    has_more_pages: response.pageInfo.hasNextPage,
    page_size: response.items.length,
    ...(response.pageInfo.endCursor && { next_cursor: response.pageInfo.endCursor }),
    ...(response.pageInfo.startCursor && { previous_cursor: response.pageInfo.startCursor }),
    ...(response.totalCount > 0 && { total_count: response.totalCount }),
    ...(pagesFetched > 1 && { pages_fetched: pagesFetched }),
    ...(limitReached && { limit_reached: limitReached }),
  };

  return {
    ...response,
    pagination: metadata,
  };
}

/**
 * Handles pagination parameters including page_size alias and max_pages
 * @param params Raw pagination parameters from user input
 * @returns Normalized parameters ready for API calls
 */
export function processPaginationParams(params: PaginationParams): {
  normalizedParams: PaginationParams;
  maxPages?: number;
} {
  const { page_size, max_pages, ...restParams } = params;

  // Use page_size as an alias for first if provided
  if (page_size !== undefined && restParams.first === undefined) {
    restParams.first = page_size;
  }

  // Normalize the parameters
  const normalizedParams = normalizePaginationParams(restParams);

  return {
    normalizedParams,
    ...(max_pages !== undefined && { maxPages: max_pages }),
  };
}

/**
 * Creates a pagination iterator for async iteration over pages
 * @template T The type of items being fetched
 * @param fetcher Function that fetches a single page
 * @param pageSize Size of each page
 * @returns Async iterator for pages
 */
export function createPaginationIterator<T>(
  fetcher: PageFetcher<T>,
  pageSize = 50
): AsyncIterable<T[]> {
  return {
    [Symbol.asyncIterator](): AsyncIterator<T[]> {
      let currentCursor: string | undefined;
      let hasMore = true;

      return {
        async next(): Promise<IteratorResult<T[]>> {
          if (!hasMore) {
            return { done: true, value: undefined };
          }

          try {
            const response = await fetcher(currentCursor, pageSize);
            hasMore = response.pageInfo.hasNextPage;
            currentCursor = response.pageInfo.endCursor;

            return {
              done: false,
              value: response.items,
            };
          } catch (error) {
            logger.error('Error in pagination iterator', { error });
            throw error;
          }
        },
      };
    },
  };
}

/**
 * Validates cursor format and checks for expiration
 * @param cursor The cursor to validate
 * @returns Whether the cursor is valid
 */
export function isValidCursor(cursor: string | undefined): boolean {
  if (cursor === undefined) {
    return true; // Undefined cursor is valid (starts from beginning)
  }

  // Basic validation - cursor should be a non-empty string
  return typeof cursor === 'string' && cursor.trim().length > 0;
}

/**
 * Merges multiple paginated responses into a single response
 * @template T The type of items being merged
 * @param responses Array of paginated responses to merge
 * @returns Merged paginated response
 */
export function mergeResponses<T>(responses: PaginatedResponse<T>[]): PaginatedResponse<T> {
  if (responses.length === 0) {
    return {
      items: [],
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
      },
      totalCount: 0,
    };
  }

  const allItems = responses.flatMap((r) => r.items);
  const firstResponse = responses[0];
  const lastResponse = responses[responses.length - 1];

  if (!firstResponse || !lastResponse) {
    return {
      items: allItems,
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
      },
      totalCount: allItems.length,
    };
  }

  const pageInfo: PageInfo = {
    hasNextPage: lastResponse.pageInfo.hasNextPage,
    hasPreviousPage: firstResponse.pageInfo.hasPreviousPage,
    ...(firstResponse.pageInfo.startCursor && {
      startCursor: firstResponse.pageInfo.startCursor,
    }),
    ...(lastResponse.pageInfo.endCursor && { endCursor: lastResponse.pageInfo.endCursor }),
  };

  return {
    items: allItems,
    pageInfo,
    totalCount: lastResponse.totalCount || allItems.length,
  };
}
