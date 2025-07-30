/* eslint-disable no-unused-vars */
/**
 * @fileoverview QualityMetrics repository interface
 *
 * This module defines the repository interface for the QualityMetrics aggregate.
 */

import { IRepository } from '../../shared/repository.interface.js';
import { QualityMetrics } from './quality-metrics.aggregate.js';
import { ProjectKey } from '../../../types/branded.js';
import { MetricShortcode, MetricKey } from '../../../models/metrics.js';
import { QualityMetricsId } from './quality-metrics.types.js';

/**
 * Repository interface for QualityMetrics aggregates
 *
 * Provides methods for persisting and retrieving QualityMetrics aggregates.
 *
 * @example
 * ```typescript
 * class InMemoryQualityMetricsRepository implements IQualityMetricsRepository {
 *   private metrics = new Map<string, QualityMetrics>();
 *
 *   async findById(id: string): Promise<QualityMetrics | null> {
 *     return this.metrics.get(id) || null;
 *   }
 *
 *   async findByProject(projectKey: ProjectKey): Promise<QualityMetrics[]> {
 *     return Array.from(this.metrics.values())
 *       .filter(m => m.projectKey === projectKey);
 *   }
 *
 *   async findByProjectAndMetric(
 *     projectKey: ProjectKey,
 *     shortcode: MetricShortcode,
 *     metricKey?: MetricKey
 *   ): Promise<QualityMetrics | null> {
 *     const results = Array.from(this.metrics.values())
 *       .filter(m =>
 *         m.projectKey === projectKey &&
 *         m.configuration.shortcode === shortcode &&
 *         (!metricKey || m.configuration.metricKey === metricKey)
 *       );
 *     return results[0] || null;
 *   }
 *
 *   async save(metrics: QualityMetrics): Promise<void> {
 *     this.metrics.set(metrics.id, metrics);
 *   }
 * }
 * ```
 */
export interface IQualityMetricsRepository extends IRepository<QualityMetrics, string> {
  /**
   * Finds metrics by composite ID
   *
   * @param _id - The composite ID (projectKey:metricKey:shortcode)
   * @returns The metrics if found, null otherwise
   */
  findById(_id: string): Promise<QualityMetrics | null>;

  /**
   * Finds all metrics for a project
   *
   * @param _projectKey - The project key
   * @returns All quality metrics for the project
   */
  findByProject(_projectKey: ProjectKey): Promise<QualityMetrics[]>;

  /**
   * Finds metrics by project and metric type
   *
   * @param _projectKey - The project key
   * @param _shortcode - The metric shortcode
   * @param _metricKey - Optional metric key filter
   * @returns The metrics if found, null otherwise
   */
  findByProjectAndMetric(
    _projectKey: ProjectKey,
    _shortcode: MetricShortcode,
    _metricKey?: MetricKey
  ): Promise<QualityMetrics | null>;

  /**
   * Finds all metrics with failing thresholds for a project
   *
   * @param _projectKey - The project key
   * @returns Metrics that are currently failing their thresholds
   */
  findFailingMetrics(_projectKey: ProjectKey): Promise<QualityMetrics[]>;

  /**
   * Finds all reported metrics for a project
   *
   * @param _projectKey - The project key
   * @returns Metrics that have isReported set to true
   */
  findReportedMetrics(_projectKey: ProjectKey): Promise<QualityMetrics[]>;

  /**
   * Finds metrics by composite ID components
   *
   * @param _id - The composite ID components
   * @returns The metrics if found, null otherwise
   */
  findByCompositeId(_id: QualityMetricsId): Promise<QualityMetrics | null>;

  /**
   * Counts total metrics for a project
   *
   * @param _projectKey - The project key
   * @returns The total number of metrics
   */
  countByProject(_projectKey: ProjectKey): Promise<number>;

  /**
   * Counts failing metrics for a project
   *
   * @param _projectKey - The project key
   * @returns The number of failing metrics
   */
  countFailingByProject(_projectKey: ProjectKey): Promise<number>;

  /**
   * Checks if metrics exist for a project and shortcode
   *
   * @param _projectKey - The project key
   * @param _shortcode - The metric shortcode
   * @returns True if metrics exist, false otherwise
   */
  exists(_projectKey: ProjectKey, _shortcode: MetricShortcode): Promise<boolean>;
}
