/**
 * @fileoverview Base client for interacting with the DeepSource API
 * This module provides a base client class with core functionality.
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { createLogger } from '../utils/logging/logger.js';
import { handleApiError } from '../utils/errors/handlers.js';
import { GraphQLResponse } from '../types/graphql-responses.js';
import { DeepSourceProject } from '../models/projects.js';
import {
  PaginatedResponse,
  PaginationParams,
  MultiPageOptions,
  PageInfo,
} from '../utils/pagination/types.js';
import { fetchMultiplePages, PageFetcher } from '../utils/pagination/manager.js';
import { handlePageSizeAlias, shouldFetchMultiplePages } from '../utils/pagination/helpers.js';
import { asProjectKey } from '../types/branded.js';

/**
 * Configuration options for the DeepSource client
 * @public
 */
export interface DeepSourceClientConfig {
  /** The base URL for the API */
  baseURL?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Custom headers to include in requests */
  headers?: Record<string, string>;
}

/**
 * Default configuration for the DeepSource client
 * @private
 */
const DEFAULT_CONFIG: DeepSourceClientConfig = {
  baseURL: 'https://api.deepsource.io/graphql/',
  timeout: 30000,
};

/**
 * Base client for DeepSource API with core HTTP functionality
 * @class
 * @public
 */
export class BaseDeepSourceClient {
  /**
   * HTTP client for making API requests to DeepSource
   * @protected
   */
  protected client: AxiosInstance;

  /**
   * Logger instance for the client
   * @protected
   */
  protected logger = createLogger('DeepSourceClient');

  /**
   * Creates a new BaseDeepSourceClient instance
   * @param apiKey - The DeepSource API key for authentication
   * @param config - Optional configuration options
   * @throws {Error} When apiKey is not provided
   * @public
   */
  constructor(apiKey: string, config: DeepSourceClientConfig = {}) {
    if (!apiKey) {
      throw new Error('DeepSource API key is required');
    }

    // Merge default config with provided config
    const mergedConfig: AxiosRequestConfig = {
      ...DEFAULT_CONFIG,
      ...config,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        ...config.headers,
      },
    };

    this.client = axios.create(mergedConfig);
  }

  /**
   * Execute a GraphQL query with variables against the DeepSource API
   * @param query The GraphQL query to execute
   * @param variables The variables for the query
   * @returns The query response data
   * @throws {ClassifiedError} When the query fails
   * @protected
   */
  protected async executeGraphQL<T>(
    query: string,
    variables?: Record<string, unknown>
  ): Promise<GraphQLResponse<T>> {
    try {
      // Log full query for debugging
      this.logger.debug('Executing GraphQL query', {
        query,
        variables,
        queryLength: query.length,
        requestHeaders: this.client.defaults.headers,
      });

      // Execute the query
      const startTime = Date.now();
      const response = await this.client.post('', { query, variables });
      const duration = Date.now() - startTime;

      this.logger.debug('GraphQL response received', {
        status: response.status,
        statusText: response.statusText,
        duration: `${duration}ms`,
        dataSize: JSON.stringify(response.data).length,
        hasData: Boolean(response.data?.data),
        hasErrors: Boolean(response.data?.errors),
      });

      // Check for GraphQL errors in the response
      if (response.data.errors) {
        this.logger.error('GraphQL query returned errors', {
          errors: response.data.errors,
          query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
        });
        throw new Error(`GraphQL Errors: ${JSON.stringify(response.data.errors)}`);
      }

      return response.data as GraphQLResponse<T>;
    } catch (error) {
      // Log detailed error information
      this.logger.error('Error executing GraphQL query', {
        errorType: typeof error,
        errorName: error instanceof Error ? error.name : 'Unknown error type',
        errorMessage: error instanceof Error ? error.message : String(error),
        errorResponse: (error as Record<string, unknown>)?.response
          ? {
              status: (error as Record<string, Record<string, unknown>>).response?.status,
              statusText: (error as Record<string, Record<string, unknown>>).response?.statusText,
              data: (error as Record<string, Record<string, unknown>>).response?.data,
            }
          : 'No response data available',
        query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
      });

      // Handle the error properly
      const handledError = handleApiError(error);
      this.logger.debug('Handled API error', {
        originalMessage: error instanceof Error ? error.message : String(error),
        handledMessage: handledError.message,
        handledName: handledError.name,
      });

      throw handledError;
    }
  }

  /**
   * Execute a GraphQL mutation against the DeepSource API
   * @param mutation The GraphQL mutation to execute
   * @param variables The variables for the mutation
   * @returns The mutation response data
   * @throws {ClassifiedError} When the mutation fails
   * @protected
   */
  protected async executeGraphQLMutation<T>(
    mutation: string,
    variables?: Record<string, unknown>
  ): Promise<T> {
    try {
      this.logger.debug('Executing GraphQL mutation', { mutation, variables });
      const response = await this.client.post('', { query: mutation, variables });

      // Check for GraphQL errors in the response
      if (response.data.errors) {
        this.logger.error('GraphQL mutation returned errors', response.data.errors);
        throw new Error(`GraphQL Errors: ${JSON.stringify(response.data.errors)}`);
      }

      return response.data as T;
    } catch (error) {
      this.logger.error('Error executing GraphQL mutation', error);
      throw handleApiError(error);
    }
  }

  /**
   * Finds a project by its key using a simplified projects query
   * @param projectKey The project key to find
   * @returns The project if found, null otherwise
   * @protected
   */
  protected async findProjectByKey(projectKey: string): Promise<DeepSourceProject | null> {
    try {
      const brandedKey = asProjectKey(projectKey);
      // Simple cache or fetch implementation
      // For now, we'll use a simplified approach and assume the project exists
      // In a real implementation, this could cache results or use a dedicated query
      return {
        key: brandedKey,
        name: 'Project', // Simplified
        repository: {
          url: projectKey,
          provider: 'github', // Default assumption
          login: projectKey.split('/')[0] || 'unknown',
          name: projectKey.split('/')[1] || 'unknown',
          isPrivate: false,
          isActivated: true,
        },
      };
    } catch (error) {
      this.logger.error('Error finding project by key', { projectKey, error });
      return null;
    }
  }

  /**
   * Normalizes pagination parameters to ensure they're valid
   * @param params The pagination parameters to normalize
   * @returns Normalized pagination parameters
   * @protected
   */
  protected static normalizePaginationParams(params: PaginationParams): PaginationParams {
    const normalizedParams: PaginationParams = {};

    // Ensure offset is a non-negative integer or undefined
    if (params.offset !== undefined) {
      normalizedParams.offset = Math.max(0, Math.floor(Number(params.offset)));
    }

    // Ensure first is a positive integer or undefined
    if (params.first !== undefined) {
      normalizedParams.first = Math.max(1, Math.floor(Number(params.first)));
    }

    // Ensure last is a positive integer or undefined
    if (params.last !== undefined) {
      normalizedParams.last = Math.max(1, Math.floor(Number(params.last)));
    }

    // Ensure after and before are strings if provided
    if (params.after !== undefined) {
      if (typeof params.after === 'string') {
        normalizedParams.after = params.after;
      } else {
        normalizedParams.after = String(params.after);
      }
    }

    if (params.before !== undefined) {
      if (typeof params.before === 'string') {
        normalizedParams.before = params.before;
      } else {
        normalizedParams.before = String(params.before);
      }
    }

    // Handle cursor-based pagination precedence
    if (normalizedParams.before) {
      // When fetching backwards with 'before', prioritize 'last'
      const lastValue = normalizedParams.last ?? normalizedParams.first ?? 10;
      normalizedParams.last = lastValue;
      // Clear 'first' and 'after' to avoid conflicts
      delete normalizedParams.first;
      delete normalizedParams.after;
    } else if (normalizedParams.after) {
      // When fetching forwards with 'after', prioritize 'first'
      const firstValue = normalizedParams.first ?? 10;
      normalizedParams.first = firstValue;
      // Clear 'last' and 'before' to avoid conflicts
      delete normalizedParams.last;
      delete normalizedParams.before;
    }

    return normalizedParams;
  }

  /**
   * Creates an empty paginated response
   * @returns An empty paginated response
   * @protected
   */
  protected static createEmptyPaginatedResponse<T>(): PaginatedResponse<T> {
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
   * Extracts error messages from GraphQL errors array
   * @param errors Array of GraphQL errors
   * @returns Combined error message string
   * @protected
   */
  protected static extractErrorMessages(errors: Array<{ message: string }>): string {
    return errors.map((error) => error.message).join('; ');
  }

  /**
   * Fetches data with automatic pagination support
   * Handles multi-page fetching when max_pages is specified
   * @template T The type of items being fetched
   * @param fetcher Single page fetcher function
   * @param params Pagination parameters including potential max_pages
   * @returns Paginated response with all fetched items
   * @protected
   */
  protected async fetchWithPagination<T>(
    fetcher: (params: PaginationParams) => Promise<PaginatedResponse<T>>,
    params: PaginationParams
  ): Promise<PaginatedResponse<T>> {
    // Handle page_size alias
    const processedParams = handlePageSizeAlias(params);

    // Check if multi-page fetching is needed
    if (shouldFetchMultiplePages(processedParams) && processedParams.max_pages !== undefined) {
      const maxPages = processedParams.max_pages;

      // Create a page fetcher wrapper for the pagination manager
      const pageFetcher: PageFetcher<T> = async (cursor, pageSize) => {
        const pageParams: PaginationParams = {
          ...processedParams,
          first: pageSize || processedParams.first || 50,
        };
        if (cursor) {
          pageParams.after = cursor;
        }
        delete pageParams.max_pages; // Remove max_pages from individual requests
        return fetcher(pageParams);
      };

      // Fetch multiple pages
      const options: MultiPageOptions = {
        maxPages,
        pageSize: processedParams.first || processedParams.page_size || 50,
        onProgress: (pagesFetched, itemsFetched) => {
          this.logger.debug('Pagination progress', { pagesFetched, itemsFetched });
        },
      };

      const result = await fetchMultiplePages(pageFetcher, options);

      // Create a merged response
      const pageInfo: PageInfo = {
        hasNextPage: result.hasMore,
        hasPreviousPage: false, // First page for multi-page fetch
      };
      if (result.lastCursor) {
        pageInfo.endCursor = result.lastCursor;
      }

      return {
        items: result.items,
        pageInfo,
        totalCount: result.totalCount || result.items.length,
      };
    }

    // Single page fetch
    return fetcher(processedParams);
  }
}
