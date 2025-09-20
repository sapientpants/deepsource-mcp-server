/**
 * @fileoverview Enhanced base client with integrated retry mechanism
 * Extends BaseDeepSourceClient with automatic retry, circuit breaker, and budget management
 */

import { BaseDeepSourceClient, DeepSourceClientConfig } from './base-client.js';
import { GraphQLResponse } from '../types/graphql-responses.js';
import { handleApiError } from '../utils/errors/handlers.js';
import { createLogger } from '../utils/logging/logger.js';
import {
  executeWithRetry,
  RetryExecutorOptions,
  getRetryConfig,
  getRetryPolicyForEndpoint,
  CircuitBreakerManager,
  RetryBudgetManager,
  isIdempotentGraphQLOperation,
} from '../utils/retry/index.js';

/**
 * Enhanced configuration with retry settings
 */
export interface EnhancedClientConfig extends DeepSourceClientConfig {
  /** Enable retry mechanism (default: true) */
  enableRetry?: boolean;
  /** Enable circuit breaker (default: true) */
  enableCircuitBreaker?: boolean;
  /** Enable retry budget (default: true) */
  enableRetryBudget?: boolean;
}

/**
 * Enhanced base client with retry capabilities
 */
export class BaseDeepSourceClientWithRetry extends BaseDeepSourceClient {
  protected readonly retryEnabled: boolean;
  protected readonly circuitBreakerManager?: CircuitBreakerManager;
  protected readonly retryBudgetManager?: RetryBudgetManager;
  protected readonly retryConfig = getRetryConfig();
  protected override readonly logger = createLogger('DeepSourceClientWithRetry');

  constructor(apiKey: string, config: EnhancedClientConfig = {}) {
    super(apiKey, config);

    // Initialize retry settings
    this.retryEnabled = config.enableRetry ?? true;

    if (this.retryEnabled) {
      // Initialize circuit breaker manager if enabled
      if (config.enableCircuitBreaker ?? true) {
        this.circuitBreakerManager = new CircuitBreakerManager({
          failureThreshold: this.retryConfig.circuitBreakerThreshold,
          failureWindow: 60000,
          recoveryTimeout: this.retryConfig.circuitBreakerTimeoutMs,
          successThreshold: 3,
          halfOpenMaxAttempts: 5,
        });
      }

      // Initialize retry budget manager if enabled
      if (config.enableRetryBudget ?? true) {
        this.retryBudgetManager = new RetryBudgetManager({
          maxRetries: this.retryConfig.retryBudgetPerMinute,
          windowMs: 60000,
        });
      }

      this.logger.info('Retry mechanism initialized', {
        circuitBreakerEnabled: Boolean(this.circuitBreakerManager),
        retryBudgetEnabled: Boolean(this.retryBudgetManager),
        config: this.retryConfig,
      });
    }
  }

  /**
   * Execute a GraphQL query with retry logic
   * @param query The GraphQL query to execute
   * @param variables The variables for the query
   * @returns The query response data
   * @throws {ClassifiedError} When the query fails after all retries
   * @protected
   */
  protected override async executeGraphQL<T>(
    query: string,
    variables?: Record<string, unknown>
  ): Promise<GraphQLResponse<T>> {
    // Detect operation type from query
    const operationType = this.detectOperationType(query);
    const endpoint = this.extractEndpointFromQuery(query);

    // Check if operation is idempotent
    const isIdempotent = isIdempotentGraphQLOperation(operationType);

    // If retry is disabled or operation is not idempotent, use base implementation
    if (!this.retryEnabled || !isIdempotent) {
      this.logger.debug('Executing without retry', {
        retryEnabled: this.retryEnabled,
        isIdempotent,
        operationType,
      });
      return super.executeGraphQL(query, variables);
    }

    // Get retry policy for endpoint
    const policy = getRetryPolicyForEndpoint(endpoint);

    // Prepare retry options
    const circuitBreaker = this.circuitBreakerManager?.getBreaker(endpoint);
    const retryBudget = this.retryBudgetManager?.getBudget(endpoint);

    const retryOptions: RetryExecutorOptions = {
      endpoint,
      policy,
      ...(circuitBreaker && { circuitBreaker }),
      ...(retryBudget && { retryBudget }),
      onRetry: (context) => {
        this.logger.info('Retrying GraphQL query', {
          endpoint,
          attempt: context.attempt,
          totalDelay: context.totalDelay,
        });
      },
    };

    // Execute with retry
    const result = await executeWithRetry(async () => {
      try {
        // Log query execution
        this.logger.debug('Executing GraphQL query with retry support', {
          endpoint,
          operationType,
        });

        // Execute the query using base implementation
        const response = await this.client.post('', { query, variables });

        // Check for GraphQL errors in the response
        if (response.data.errors) {
          this.logger.error('GraphQL query returned errors', {
            errors: response.data.errors,
            endpoint,
          });
          throw new Error(`GraphQL Errors: ${JSON.stringify(response.data.errors)}`);
        }

        return response.data as GraphQLResponse<T>;
      } catch (error) {
        // Enhance error with classification
        const handledError = handleApiError(error);
        throw handledError;
      }
    }, retryOptions);

    if (result.success && result.data) {
      this.logger.debug('GraphQL query succeeded', {
        endpoint,
        attempts: result.attempts,
        totalDelay: result.totalDelay,
      });
      return result.data;
    }

    // Throw the final error
    throw result.error ?? new Error('GraphQL query failed after retries');
  }

  /**
   * Execute a GraphQL mutation (no retry for mutations)
   * @param mutation The GraphQL mutation to execute
   * @param variables The variables for the mutation
   * @returns The mutation response data
   * @throws {ClassifiedError} When the mutation fails
   * @protected
   */
  protected override async executeGraphQLMutation<T>(
    mutation: string,
    variables?: Record<string, unknown>
  ): Promise<T> {
    // Mutations are not idempotent, so we don't retry them
    this.logger.debug('Executing mutation without retry (not idempotent)');
    return super.executeGraphQLMutation(mutation, variables);
  }

  /**
   * Detect the operation type from a GraphQL query string
   * @param query The GraphQL query string
   * @returns The operation type (query, mutation, subscription)
   * @private
   */
  private detectOperationType(query: string): string {
    const trimmed = query.trim();

    // Check for explicit operation type
    if (trimmed.startsWith('query')) {
      return 'query';
    }
    if (trimmed.startsWith('mutation')) {
      return 'mutation';
    }
    if (trimmed.startsWith('subscription')) {
      return 'subscription';
    }

    // Default to query for shorthand syntax
    if (trimmed.startsWith('{')) {
      return 'query';
    }

    // Parse the query to find operation type
    const match = /^\s*(query|mutation|subscription)\s/i.exec(trimmed);
    return match && match[1] ? match[1].toLowerCase() : 'query';
  }

  /**
   * Extract endpoint name from GraphQL query
   * @param query The GraphQL query string
   * @returns The endpoint name
   * @private
   */
  private extractEndpointFromQuery(query: string): string {
    // Try to extract the main field being queried
    // Look for the first field after opening brace
    const fieldMatch = /{\s*(\w+)/m.exec(query);
    if (fieldMatch && fieldMatch[1]) {
      return fieldMatch[1];
    }

    // Try to extract from operation name
    const operationMatch = /(?:query|mutation|subscription)\s+(\w+)/i.exec(query);
    if (operationMatch && operationMatch[1]) {
      return operationMatch[1];
    }

    // Default to 'graphql'
    return 'graphql';
  }

  /**
   * Get circuit breaker statistics
   * @returns Map of endpoint to circuit breaker stats
   */
  public getCircuitBreakerStats() {
    return this.circuitBreakerManager?.getAllStats() ?? new Map();
  }

  /**
   * Get retry budget statistics
   * @returns Map of endpoint to budget stats
   */
  public getRetryBudgetStats() {
    return this.retryBudgetManager?.getAllStats() ?? new Map();
  }

  /**
   * Reset all circuit breakers
   */
  public resetCircuitBreakers(): void {
    this.circuitBreakerManager?.resetAll();
    this.logger.info('All circuit breakers reset');
  }

  /**
   * Reset all retry budgets
   */
  public resetRetryBudgets(): void {
    this.retryBudgetManager?.resetAll();
    this.logger.info('All retry budgets reset');
  }
}
