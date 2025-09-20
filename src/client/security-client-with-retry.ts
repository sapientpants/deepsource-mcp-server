/**
 * @fileoverview Security client with retry capabilities
 * Extends SecurityClient with automatic retry mechanism
 */

import { EnhancedClientConfig } from './base-client-with-retry.js';
import { SecurityClient } from './security-client.js';
import { BaseDeepSourceClientWithRetry } from './base-client-with-retry.js';

/**
 * Client for security-related operations with retry support
 */
export class SecurityClientWithRetry extends SecurityClient {
  /**
   * Creates a new SecurityClientWithRetry instance
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

    this.logger.debug('SecurityClientWithRetry initialized');
  }
}
