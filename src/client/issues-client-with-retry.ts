/**
 * @fileoverview Issues client with retry capabilities
 * Extends IssuesClient with automatic retry mechanism
 */

import { BaseDeepSourceClientWithRetry, EnhancedClientConfig } from './base-client-with-retry.js';
import { IssuesClient } from './issues-client.js';

/**
 * Client for issue-related operations with retry support
 * Delegates to IssuesClient but uses retry-enabled base
 */
export class IssuesClientWithRetry extends IssuesClient {
  /**
   * Creates a new IssuesClientWithRetry instance
   * @param apiKey The DeepSource API key for authentication
   * @param config Optional configuration options
   */
  constructor(apiKey: string, config?: EnhancedClientConfig) {
    // Create a retry-enabled base client
    const retryBase = new BaseDeepSourceClientWithRetry(apiKey, config);

    // IssuesClient extends BaseDeepSourceClient, so we need to
    // make it use our retry-enabled methods
    super(apiKey, config);

    // Replace the base client methods with retry-enabled ones
    Object.setPrototypeOf(this, Object.getPrototypeOf(retryBase));
    Object.assign(this, retryBase);

    this.logger.debug('IssuesClientWithRetry initialized');
  }
}
