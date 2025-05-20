/**
 * @fileoverview Base client for interacting with the DeepSource API
 * This module provides a base client class with core functionality.
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { createLogger } from '../utils/logging/logger.js';
import { handleApiError } from '../utils/errors/handlers.js';
import { GraphQLResponse } from '../types/graphql-responses.js';

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
   * Execute a GraphQL query against the DeepSource API
   * @param query The GraphQL query to execute
   * @returns The query response data
   * @throws {ClassifiedError} When the query fails
   * @protected
   */
  protected async executeGraphQL<T>(query: string): Promise<GraphQLResponse<T>> {
    try {
      this.logger.debug('Executing GraphQL query', { query });
      const response = await this.client.post('', { query });

      // Check for GraphQL errors in the response
      if (response.data.errors) {
        this.logger.error('GraphQL query returned errors', response.data.errors);
        throw new Error(`GraphQL Errors: ${JSON.stringify(response.data.errors)}`);
      }

      return response.data as GraphQLResponse<T>;
    } catch (error) {
      this.logger.error('Error executing GraphQL query', error);
      throw handleApiError(error);
    }
  }

  /**
   * Execute a GraphQL mutation against the DeepSource API
   * @param mutation The GraphQL mutation to execute
   * @returns The mutation response data
   * @throws {ClassifiedError} When the mutation fails
   * @protected
   */
  protected async executeGraphQLMutation<T>(mutation: string): Promise<T> {
    try {
      this.logger.debug('Executing GraphQL mutation', { mutation });
      const response = await this.client.post('', { query: mutation });

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
}
