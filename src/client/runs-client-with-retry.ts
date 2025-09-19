/**
 * @fileoverview Runs client with retry capabilities
 * Extends RunsClient with automatic retry mechanism
 */

import { EnhancedClientConfig } from './base-client-with-retry.js';
import { RunsClient } from './runs-client.js';
import { BaseDeepSourceClientWithRetry } from './base-client-with-retry.js';

/**
 * Client for run-related operations with retry support
 */
export class RunsClientWithRetry extends RunsClient {
  /**
   * Creates a new RunsClientWithRetry instance
   * @param apiKey The DeepSource API key for authentication
   * @param config Optional configuration options
   */
  constructor(apiKey: string, config?: EnhancedClientConfig) {
    // Create a retry-enabled base client
    const retryBase = new BaseDeepSourceClientWithRetry(apiKey, config);

    // Call parent constructor
    super(apiKey, config);

    // Replace the base client methods with retry-enabled ones
    Object.setPrototypeOf(this, Object.getPrototypeOf(retryBase));
    Object.assign(this, retryBase);

    this.logger.debug('RunsClientWithRetry initialized');
  }
}
