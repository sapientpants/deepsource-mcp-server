/**
 * @fileoverview Factory for creating DeepSource clients with retry capabilities
 * Enhanced factory that creates retry-enabled client instances
 */

import { EnhancedClientConfig } from './base-client-with-retry.js';
import { ProjectsClientWithRetry } from './projects-client-with-retry.js';
import { IssuesClientWithRetry } from './issues-client-with-retry.js';
import { RunsClientWithRetry } from './runs-client-with-retry.js';
import { MetricsClientWithRetry } from './metrics-client-with-retry.js';
import { SecurityClientWithRetry } from './security-client-with-retry.js';
import { createLogger } from '../utils/logging/logger.js';
import { getRetryConfig } from '../utils/retry/index.js';

// Logger for the client factory
const logger = createLogger('DeepSourceClientFactoryWithRetry');

/**
 * Factory for creating retry-enabled DeepSource client instances
 * @class
 * @public
 */
export class DeepSourceClientFactoryWithRetry {
  private apiKey: string;
  private config: EnhancedClientConfig;

  // Cached client instances
  private projectsClient?: ProjectsClientWithRetry;
  private issuesClient?: IssuesClientWithRetry;
  private runsClient?: RunsClientWithRetry;
  private metricsClient?: MetricsClientWithRetry;
  private securityClient?: SecurityClientWithRetry;

  /**
   * Creates a new DeepSourceClientFactoryWithRetry instance
   * @param apiKey The DeepSource API key
   * @param config Optional client configuration
   * @public
   */
  constructor(apiKey: string, config: EnhancedClientConfig = {}) {
    if (!apiKey) {
      logger.error('No API key provided to DeepSourceClientFactoryWithRetry');
      throw new Error('DeepSource API key is required');
    }

    this.apiKey = apiKey;
    this.config = {
      ...config,
      enableRetry: config.enableRetry ?? true,
      enableCircuitBreaker: config.enableCircuitBreaker ?? true,
      enableRetryBudget: config.enableRetryBudget ?? true,
    };

    const retryConfig = getRetryConfig();
    logger.info('DeepSourceClientFactoryWithRetry created', {
      retryEnabled: this.config.enableRetry,
      circuitBreakerEnabled: this.config.enableCircuitBreaker,
      retryBudgetEnabled: this.config.enableRetryBudget,
      retryConfig,
    });
  }

  /**
   * Gets or creates a ProjectsClientWithRetry instance
   * @returns A ProjectsClientWithRetry instance
   * @public
   */
  getProjectsClient(): ProjectsClientWithRetry {
    if (!this.projectsClient) {
      logger.debug('Creating new ProjectsClientWithRetry instance');
      this.projectsClient = new ProjectsClientWithRetry(this.apiKey, this.config);
    }

    return this.projectsClient;
  }

  /**
   * Gets or creates an IssuesClientWithRetry instance
   * @returns An IssuesClientWithRetry instance
   * @public
   */
  getIssuesClient(): IssuesClientWithRetry {
    if (!this.issuesClient) {
      logger.debug('Creating new IssuesClientWithRetry instance');
      this.issuesClient = new IssuesClientWithRetry(this.apiKey, this.config);
    }

    return this.issuesClient;
  }

  /**
   * Gets or creates a RunsClientWithRetry instance
   * @returns A RunsClientWithRetry instance
   * @public
   */
  getRunsClient(): RunsClientWithRetry {
    if (!this.runsClient) {
      logger.debug('Creating new RunsClientWithRetry instance');
      this.runsClient = new RunsClientWithRetry(this.apiKey, this.config);
    }

    return this.runsClient;
  }

  /**
   * Gets or creates a MetricsClientWithRetry instance
   * @returns A MetricsClientWithRetry instance
   * @public
   */
  getMetricsClient(): MetricsClientWithRetry {
    if (!this.metricsClient) {
      logger.debug('Creating new MetricsClientWithRetry instance');
      this.metricsClient = new MetricsClientWithRetry(this.apiKey, this.config);
    }

    return this.metricsClient;
  }

  /**
   * Gets or creates a SecurityClientWithRetry instance
   * @returns A SecurityClientWithRetry instance
   * @public
   */
  getSecurityClient(): SecurityClientWithRetry {
    if (!this.securityClient) {
      logger.debug('Creating new SecurityClientWithRetry instance');
      this.securityClient = new SecurityClientWithRetry(this.apiKey, this.config);
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
      logger.info('Connection test successful');
      return true;
    } catch (error) {
      logger.error('Connection test failed', error);
      return false;
    }
  }

  /**
   * Get circuit breaker statistics for all clients
   * @returns Combined circuit breaker statistics
   * @public
   */
  getCircuitBreakerStats() {
    const stats: Record<string, unknown> = {};

    if (this.projectsClient) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stats.projects = (this.projectsClient as any).getCircuitBreakerStats?.() ?? {};
    }
    if (this.issuesClient) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stats.issues = (this.issuesClient as any).getCircuitBreakerStats?.() ?? {};
    }
    if (this.runsClient) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stats.runs = (this.runsClient as any).getCircuitBreakerStats?.() ?? {};
    }
    if (this.metricsClient) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stats.metrics = (this.metricsClient as any).getCircuitBreakerStats?.() ?? {};
    }
    if (this.securityClient) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stats.security = (this.securityClient as any).getCircuitBreakerStats?.() ?? {};
    }

    return stats;
  }

  /**
   * Get retry budget statistics for all clients
   * @returns Combined retry budget statistics
   * @public
   */
  getRetryBudgetStats() {
    const stats: Record<string, unknown> = {};

    if (this.projectsClient) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stats.projects = (this.projectsClient as any).getRetryBudgetStats?.() ?? {};
    }
    if (this.issuesClient) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stats.issues = (this.issuesClient as any).getRetryBudgetStats?.() ?? {};
    }
    if (this.runsClient) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stats.runs = (this.runsClient as any).getRetryBudgetStats?.() ?? {};
    }
    if (this.metricsClient) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stats.metrics = (this.metricsClient as any).getRetryBudgetStats?.() ?? {};
    }
    if (this.securityClient) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stats.security = (this.securityClient as any).getRetryBudgetStats?.() ?? {};
    }

    return stats;
  }

  /**
   * Reset all circuit breakers
   * @public
   */
  resetCircuitBreakers(): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.projectsClient as any)?.resetCircuitBreakers?.();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.issuesClient as any)?.resetCircuitBreakers?.();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.runsClient as any)?.resetCircuitBreakers?.();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.metricsClient as any)?.resetCircuitBreakers?.();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.securityClient as any)?.resetCircuitBreakers?.();
    logger.info('All circuit breakers reset');
  }

  /**
   * Reset all retry budgets
   * @public
   */
  resetRetryBudgets(): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.projectsClient as any)?.resetRetryBudgets?.();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.issuesClient as any)?.resetRetryBudgets?.();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.runsClient as any)?.resetRetryBudgets?.();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.metricsClient as any)?.resetRetryBudgets?.();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.securityClient as any)?.resetRetryBudgets?.();
    logger.info('All retry budgets reset');
  }
}
