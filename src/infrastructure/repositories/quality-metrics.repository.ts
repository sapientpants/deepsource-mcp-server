/**
 * @fileoverview QualityMetrics repository implementation
 *
 * Concrete implementation of IQualityMetricsRepository using DeepSource API.
 */

import { IQualityMetricsRepository } from '../../domain/aggregates/quality-metrics/quality-metrics.repository.js';
import { QualityMetrics } from '../../domain/aggregates/quality-metrics/quality-metrics.aggregate.js';
import { ProjectKey } from '../../types/branded.js';
import { MetricShortcode, MetricKey } from '../../models/metrics.js';
import { QualityMetricsId } from '../../domain/aggregates/quality-metrics/quality-metrics.types.js';
import { DeepSourceClient } from '../../deepsource.js';
import { QualityMetricsMapper } from '../mappers/quality-metrics.mapper.js';
import { createLogger } from '../../utils/logging/logger.js';

const logger = createLogger('QualityMetricsRepository');

/**
 * Concrete implementation of IQualityMetricsRepository using DeepSource API
 *
 * This repository provides access to QualityMetrics aggregates by fetching data
 * from the DeepSource API and mapping it to domain models.
 *
 * Note: The DeepSource API returns metrics at the repository level with items
 * for each context (language). This repository maps each item to a separate
 * QualityMetrics aggregate. This ensures fresh data retrieval on every request
 * as per requirements.
 */
export class QualityMetricsRepository implements IQualityMetricsRepository {
  // eslint-disable-next-line no-unused-vars
  constructor(private readonly client: DeepSourceClient) {
    // client is stored for use in methods
  }

  /**
   * Helper method to get repository ID for a project
   *
   * @param projectKey - The project key
   * @returns The repository GraphQL ID
   */
  private async getRepositoryId(projectKey: ProjectKey): Promise<string> {
    const projects = await this.client.listProjects();
    const project = projects.find((p) => p.key === projectKey);
    if (!project) {
      throw new Error(`Project not found: ${projectKey}`);
    }
    return project.repository.id;
  }

  /**
   * Finds metrics by composite ID
   *
   * @param id - The composite ID (projectKey:metricKey:shortcode)
   * @returns The metrics if found, null otherwise
   */
  async findById(id: string): Promise<QualityMetrics | null> {
    try {
      logger.debug('Finding metrics by composite ID', { id });

      // Parse composite ID
      const parts = id.split(':');
      if (parts.length !== 3) {
        logger.error('Invalid composite ID format', { id });
        return null;
      }

      const [projectKey, metricKey, shortcode] = parts;
      return this.findByProjectAndMetric(
        projectKey as ProjectKey,
        shortcode as MetricShortcode,
        metricKey as MetricKey
      );
    } catch (error) {
      logger.error('Error finding metrics by ID', { id, error });
      throw error;
    }
  }

  /**
   * Finds all metrics for a project
   *
   * @param projectKey - The project key
   * @returns All quality metrics for the project
   */
  async findByProject(projectKey: ProjectKey): Promise<QualityMetrics[]> {
    try {
      logger.debug('Finding all metrics for project', { projectKey });

      const repositoryId = await this.getRepositoryId(projectKey);
      const apiMetrics = await this.client.getQualityMetrics(projectKey);

      const domainMetrics = QualityMetricsMapper.toDomainFromList(
        apiMetrics,
        projectKey,
        repositoryId
      );

      logger.debug('Metrics found for project', {
        projectKey,
        count: domainMetrics.length,
      });

      return domainMetrics;
    } catch (error) {
      logger.error('Error finding metrics by project', { projectKey, error });
      throw error;
    }
  }

  /**
   * Finds metrics by project and metric type
   *
   * @param projectKey - The project key
   * @param shortcode - The metric shortcode
   * @param metricKey - Optional metric key filter
   * @returns The metrics if found, null otherwise
   */
  async findByProjectAndMetric(
    projectKey: ProjectKey,
    shortcode: MetricShortcode,
    metricKey?: MetricKey
  ): Promise<QualityMetrics | null> {
    try {
      logger.debug('Finding metrics by project and type', {
        projectKey,
        shortcode,
        metricKey,
      });

      const repositoryId = await this.getRepositoryId(projectKey);
      const apiMetrics = await this.client.getQualityMetrics(projectKey, {
        shortcodeIn: [shortcode],
      });

      const metric = apiMetrics.find((m) => m.shortcode === shortcode);
      if (!metric) {
        logger.debug('Metric not found', { projectKey, shortcode });
        return null;
      }

      // If metricKey is specified, find that specific item
      if (metricKey) {
        const item = metric.items.find((i) => i.key === metricKey);
        if (!item) {
          logger.debug('Metric item not found', { projectKey, shortcode, metricKey });
          return null;
        }
        return QualityMetricsMapper.toDomain(metric, item, projectKey, repositoryId);
      }

      // If no metricKey specified, return the first item (usually AGGREGATE)
      if (metric.items.length > 0) {
        return QualityMetricsMapper.toDomain(metric, metric.items[0], projectKey, repositoryId);
      }

      logger.debug('No metric items found', { projectKey, shortcode });
      return null;
    } catch (error) {
      logger.error('Error finding metrics by project and type', {
        projectKey,
        shortcode,
        metricKey,
        error,
      });
      throw error;
    }
  }

  /**
   * Finds all metrics with failing thresholds for a project
   *
   * @param projectKey - The project key
   * @returns Metrics that are currently failing their thresholds
   */
  async findFailingMetrics(projectKey: ProjectKey): Promise<QualityMetrics[]> {
    try {
      logger.debug('Finding failing metrics for project', { projectKey });

      const allMetrics = await this.findByProject(projectKey);
      const failingMetrics = allMetrics.filter((m) => m.thresholdStatus === 'FAILING');

      logger.debug('Failing metrics found', {
        projectKey,
        count: failingMetrics.length,
      });

      return failingMetrics;
    } catch (error) {
      logger.error('Error finding failing metrics', { projectKey, error });
      throw error;
    }
  }

  /**
   * Finds all reported metrics for a project
   *
   * @param projectKey - The project key
   * @returns Metrics that have isReported set to true
   */
  async findReportedMetrics(projectKey: ProjectKey): Promise<QualityMetrics[]> {
    try {
      logger.debug('Finding reported metrics for project', { projectKey });

      const allMetrics = await this.findByProject(projectKey);
      const reportedMetrics = allMetrics.filter((m) => m.configuration.isReported);

      logger.debug('Reported metrics found', {
        projectKey,
        count: reportedMetrics.length,
      });

      return reportedMetrics;
    } catch (error) {
      logger.error('Error finding reported metrics', { projectKey, error });
      throw error;
    }
  }

  /**
   * Finds metrics by composite ID components
   *
   * @param id - The composite ID components
   * @returns The metrics if found, null otherwise
   */
  async findByCompositeId(id: QualityMetricsId): Promise<QualityMetrics | null> {
    try {
      logger.debug('Finding metrics by composite ID components', { id });

      return this.findByProjectAndMetric(id.projectKey, id.shortcode, id.metricKey);
    } catch (error) {
      logger.error('Error finding metrics by composite ID', { id, error });
      throw error;
    }
  }

  /**
   * Counts total metrics for a project
   *
   * @param projectKey - The project key
   * @returns The total number of metrics
   */
  async countByProject(projectKey: ProjectKey): Promise<number> {
    try {
      logger.debug('Counting metrics for project', { projectKey });

      const metrics = await this.findByProject(projectKey);
      const count = metrics.length;

      logger.debug('Metric count for project', { projectKey, count });
      return count;
    } catch (error) {
      logger.error('Error counting metrics', { projectKey, error });
      throw error;
    }
  }

  /**
   * Counts failing metrics for a project
   *
   * @param projectKey - The project key
   * @returns The number of failing metrics
   */
  async countFailingByProject(projectKey: ProjectKey): Promise<number> {
    try {
      logger.debug('Counting failing metrics for project', { projectKey });

      const failingMetrics = await this.findFailingMetrics(projectKey);
      const count = failingMetrics.length;

      logger.debug('Failing metric count', { projectKey, count });
      return count;
    } catch (error) {
      logger.error('Error counting failing metrics', { projectKey, error });
      throw error;
    }
  }

  /**
   * Checks if metrics exist for a project and shortcode
   *
   * @param projectKey - The project key
   * @param shortcode - The metric shortcode
   * @returns True if metrics exist, false otherwise
   */
  async exists(projectKey: ProjectKey, shortcode: MetricShortcode): Promise<boolean> {
    try {
      logger.debug('Checking if metrics exist', { projectKey, shortcode });

      const metric = await this.findByProjectAndMetric(projectKey, shortcode);
      const exists = metric !== null;

      logger.debug('Metrics existence check', { projectKey, shortcode, exists });
      return exists;
    } catch (error) {
      logger.error('Error checking metrics existence', { projectKey, shortcode, error });
      throw error;
    }
  }

  /**
   * Saves quality metrics
   *
   * Note: The DeepSource API only supports updating thresholds and settings,
   * not creating new metrics. This method updates the threshold if needed.
   *
   * @param metrics - The metrics to save
   * @throws Error if the metric doesn't exist or update fails
   */
  async save(metrics: QualityMetrics): Promise<void> {
    logger.debug('Attempting to save metrics', {
      id: metrics.id,
      projectKey: metrics.projectKey,
    });

    try {
      // Update threshold if it has changed
      const threshold = metrics.configuration.threshold;
      const thresholdValue = threshold ? threshold.value : null;

      await this.client.updateMetricThreshold({
        projectKey: metrics.projectKey,
        repositoryId: metrics.repositoryId,
        metricShortcode: metrics.configuration.shortcode,
        metricKey: metrics.configuration.metricKey,
        thresholdValue,
      });

      // Update settings
      await this.client.updateMetricSetting({
        projectKey: metrics.projectKey,
        repositoryId: metrics.repositoryId,
        metricShortcode: metrics.configuration.shortcode,
        isReported: metrics.configuration.isReported,
        isThresholdEnforced: metrics.configuration.isThresholdEnforced,
      });

      logger.debug('Metrics saved successfully', { id: metrics.id });
    } catch (error) {
      logger.error('Error saving metrics', { id: metrics.id, error });
      throw error;
    }
  }

  /**
   * Deletes quality metrics
   *
   * Note: The DeepSource API doesn't support deleting metrics.
   * This method is implemented to satisfy the interface but will
   * throw an error indicating the operation is not supported.
   *
   * @param id - The metrics ID to delete
   * @throws Error indicating the operation is not supported
   */
  async delete(id: string): Promise<void> {
    logger.warn('Attempted to delete metrics', { id });

    throw new Error(
      'Delete operation is not supported by DeepSource API. ' +
        'Metrics are managed automatically based on repository configuration.'
    );
  }
}
