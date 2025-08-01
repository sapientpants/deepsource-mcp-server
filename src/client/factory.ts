/**
 * @fileoverview Factory for creating DeepSource clients
 * This module provides a factory for creating client instances.
 */

import { DeepSourceClientConfig } from './base-client.js';
import { ProjectsClient } from './projects-client.js';
import { IssuesClient } from './issues-client.js';
import { RunsClient } from './runs-client.js';
import { MetricsClient } from './metrics-client.js';
import { SecurityClient } from './security-client.js';
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
  private issuesClient?: IssuesClient;
  private runsClient?: RunsClient;
  private metricsClient?: MetricsClient;
  private securityClient?: SecurityClient;

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
   * Gets or creates an IssuesClient instance
   * @returns An IssuesClient instance
   * @public
   */
  getIssuesClient(): IssuesClient {
    if (!this.issuesClient) {
      logger.debug('Creating new IssuesClient instance');
      this.issuesClient = new IssuesClient(this.apiKey, this.config);
    }

    return this.issuesClient;
  }

  /**
   * Gets or creates a RunsClient instance
   * @returns A RunsClient instance
   * @public
   */
  getRunsClient(): RunsClient {
    if (!this.runsClient) {
      logger.debug('Creating new RunsClient instance');
      this.runsClient = new RunsClient(this.apiKey, this.config);
    }

    return this.runsClient;
  }

  /**
   * Gets or creates a MetricsClient instance
   * @returns A MetricsClient instance
   * @public
   */
  getMetricsClient(): MetricsClient {
    if (!this.metricsClient) {
      logger.debug('Creating new MetricsClient instance');
      this.metricsClient = new MetricsClient(this.apiKey, this.config);
    }

    return this.metricsClient;
  }

  /**
   * Gets or creates a SecurityClient instance
   * @returns A SecurityClient instance
   * @public
   */
  getSecurityClient(): SecurityClient {
    if (!this.securityClient) {
      logger.debug('Creating new SecurityClient instance');
      this.securityClient = new SecurityClient(this.apiKey, this.config);
    }

    return this.securityClient;
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
