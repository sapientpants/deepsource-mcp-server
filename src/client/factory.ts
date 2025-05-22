/**
 * @fileoverview Factory for creating DeepSource clients
 * This module provides a factory for creating client instances.
 */

import { DeepSourceClientConfig } from './base-client.js';
import { ProjectsClient } from './projects-client.js';
import { createLogger } from '../utils/logging/logger.js';

// Logger for the client factory
const logger = createLogger('DeepSourceClientFactory');

/**
 * Factory for creating DeepSource client instances
 * @class
 * @public
 */
export class DeepSourceClientFactory {
  private apiKey: string;
  private config: DeepSourceClientConfig;

  // Cached client instances
  private projectsClient?: ProjectsClient;

  /**
   * Creates a new DeepSourceClientFactory instance
   * @param apiKey The DeepSource API key
   * @param config Optional client configuration
   * @public
   */
  constructor(apiKey: string, config: DeepSourceClientConfig = {}) {
    if (!apiKey) {
      logger.error('No API key provided to DeepSourceClientFactory');
      throw new Error('DeepSource API key is required');
    }

    this.apiKey = apiKey;
    this.config = config;

    logger.debug('DeepSourceClientFactory created');
  }

  /**
   * Gets or creates a ProjectsClient instance
   * @returns A ProjectsClient instance
   * @public
   */
  getProjectsClient(): ProjectsClient {
    if (!this.projectsClient) {
      logger.debug('Creating new ProjectsClient instance');
      this.projectsClient = new ProjectsClient(this.apiKey, this.config);
    }

    return this.projectsClient;
  }

  /**
   * Helper method to test connectivity to the DeepSource API
   * @returns True if connection was successful, false otherwise
   * @public
   */
  async testConnection(): Promise<boolean> {
    try {
      const client = this.getProjectsClient();
      await client.listProjects();
      return true;
    } catch (error) {
      logger.error('Connection test failed', error);
      return false;
    }
  }
}
