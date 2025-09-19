/**
 * @fileoverview Metrics client with retry capabilities
 * Extends MetricsClient with automatic retry mechanism
 */

import { EnhancedClientConfig } from './base-client-with-retry.js';
import { MetricsClient } from './metrics-client.js';
import { BaseDeepSourceClientWithRetry } from './base-client-with-retry.js';

/**
 * Client for metrics-related operations with retry support
 */
export class MetricsClientWithRetry extends MetricsClient {
  /**
   * Creates a new MetricsClientWithRetry instance
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

    this.logger.debug('MetricsClientWithRetry initialized');
  }
}
