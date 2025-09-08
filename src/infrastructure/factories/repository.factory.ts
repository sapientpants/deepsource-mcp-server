/**
 * @fileoverview Repository factory for dependency injection
 *
 * This factory provides a centralized way to create repository instances
 * with their required dependencies, following the dependency injection pattern.
 */

import { DeepSourceClient } from '../../deepsource.js';
import { ProjectsClient } from '../../client/projects-client.js';
import { IProjectRepository } from '../../domain/aggregates/project/project.repository.js';
import { IAnalysisRunRepository } from '../../domain/aggregates/analysis-run/analysis-run.repository.js';
import { IQualityMetricsRepository } from '../../domain/aggregates/quality-metrics/quality-metrics.repository.js';
import { IComplianceReportRepository } from '../../domain/aggregates/compliance-report/compliance-report.repository.js';
import { ProjectRepository } from '../repositories/project.repository.js';
import { AnalysisRunRepository } from '../repositories/analysis-run.repository.js';
import { QualityMetricsRepository } from '../repositories/quality-metrics.repository.js';
import { ComplianceReportRepository } from '../repositories/compliance-report.repository.js';
import { createLogger } from '../../utils/logging/logger.js';

const logger = createLogger('RepositoryFactory');

/**
 * Configuration for repository creation
 */
export interface RepositoryConfig {
  apiKey: string;
  baseUrl?: string;
}

/**
 * Repository instances container
 */
export interface RepositoryInstances {
  projectRepository: IProjectRepository;
  analysisRunRepository: IAnalysisRunRepository;
  qualityMetricsRepository: IQualityMetricsRepository;
  complianceReportRepository: IComplianceReportRepository;
}

/**
 * Factory for creating repository instances with dependency injection
 *
 * This factory ensures that all repositories are created with the proper
 * dependencies and configuration. It provides a single point of configuration
 * for all repository instances.
 *
 * @example
 * ```typescript
 * const factory = new RepositoryFactory({ apiKey: 'your-api-key' });
 * const repositories = factory.createRepositories();
 *
 * // Use repositories
 * const project = await repositories.projectRepository.findByKey(projectKey);
 * ```
 */
export class RepositoryFactory {
  private readonly config: RepositoryConfig;
  private cachedInstances: RepositoryInstances | undefined;

  constructor(config: RepositoryConfig) {
    this.config = config;
    logger.debug('Repository factory initialized', {
      hasApiKey: Boolean(config.apiKey),
      baseUrl: config.baseUrl,
    });
  }

  /**
   * Creates all repository instances
   *
   * This method creates instances of all repositories with their required
   * dependencies. The instances are cached for subsequent calls.
   *
   * @returns Container with all repository instances
   */
  createRepositories(): RepositoryInstances {
    if (this.cachedInstances) {
      logger.debug('Returning cached repository instances');
      return this.cachedInstances;
    }

    logger.info('Creating new repository instances');

    // Create clients
    const deepSourceClient = this.createDeepSourceClient();
    const projectsClient = this.createProjectsClient();

    // Create repositories
    const projectRepository = this.createProjectRepository(projectsClient);
    const analysisRunRepository = this.createAnalysisRunRepository(deepSourceClient);
    const qualityMetricsRepository = this.createQualityMetricsRepository(deepSourceClient);
    const complianceReportRepository = this.createComplianceReportRepository(deepSourceClient);

    this.cachedInstances = {
      projectRepository,
      analysisRunRepository,
      qualityMetricsRepository,
      complianceReportRepository,
    };

    logger.info('Repository instances created successfully');
    return this.cachedInstances;
  }

  /**
   * Creates a DeepSource client instance
   */
  private createDeepSourceClient(): DeepSourceClient {
    logger.debug('Creating DeepSource client');
    return new DeepSourceClient(this.config.apiKey);
  }

  /**
   * Creates a Projects client instance
   */
  private createProjectsClient(): ProjectsClient {
    logger.debug('Creating Projects client');
    const clientConfig = this.config.baseUrl ? { baseURL: this.config.baseUrl } : undefined;
    return new ProjectsClient(this.config.apiKey, clientConfig);
  }

  /**
   * Creates a Project repository instance
   */
  createProjectRepository(client?: ProjectsClient): IProjectRepository {
    const projectsClient = client || this.createProjectsClient();
    logger.debug('Creating Project repository');
    return new ProjectRepository(projectsClient);
  }

  /**
   * Creates an AnalysisRun repository instance
   */
  createAnalysisRunRepository(client?: DeepSourceClient): IAnalysisRunRepository {
    const deepSourceClient = client || this.createDeepSourceClient();
    logger.debug('Creating AnalysisRun repository');
    return new AnalysisRunRepository(deepSourceClient);
  }

  /**
   * Creates a QualityMetrics repository instance
   */
  createQualityMetricsRepository(client?: DeepSourceClient): IQualityMetricsRepository {
    const deepSourceClient = client || this.createDeepSourceClient();
    logger.debug('Creating QualityMetrics repository');
    return new QualityMetricsRepository(deepSourceClient);
  }

  /**
   * Creates a ComplianceReport repository instance
   */
  createComplianceReportRepository(client?: DeepSourceClient): IComplianceReportRepository {
    const deepSourceClient = client || this.createDeepSourceClient();
    logger.debug('Creating ComplianceReport repository');
    return new ComplianceReportRepository(deepSourceClient);
  }

  /**
   * Clears cached instances
   *
   * This method is useful for testing or when you need to force
   * recreation of repository instances.
   */
  clearCache(): void {
    logger.debug('Clearing cached repository instances');
    this.cachedInstances = undefined;
  }

  /**
   * Gets the current configuration
   */
  getConfig(): Readonly<RepositoryConfig> {
    return { ...this.config };
  }
}

/**
 * Creates a repository factory with the given configuration
 *
 * This is a convenience function for creating a factory instance.
 *
 * @param config - Repository configuration
 * @returns A new repository factory instance
 */
export function createRepositoryFactory(config: RepositoryConfig): RepositoryFactory {
  return new RepositoryFactory(config);
}

/**
 * Creates all repositories with the given configuration
 *
 * This is a convenience function that creates a factory and immediately
 * returns all repository instances.
 *
 * @param config - Repository configuration
 * @returns Container with all repository instances
 */
export function createRepositories(config: RepositoryConfig): RepositoryInstances {
  const factory = new RepositoryFactory(config);
  return factory.createRepositories();
}
