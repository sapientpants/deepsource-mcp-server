/**
 * @fileoverview QualityMetrics mapper
 *
 * Maps between DeepSource API models and domain QualityMetrics aggregates.
 */

import { QualityMetrics } from '../../domain/aggregates/quality-metrics/quality-metrics.aggregate.js';
import { RepositoryMetric, RepositoryMetricItem } from '../../models/metrics.js';
import {
  MetricConfiguration,
  CreateQualityMetricsParams,
  MetricHistoryEntry,
  ThresholdStatus,
} from '../../domain/aggregates/quality-metrics/quality-metrics.types.js';
import { asProjectKey, asGraphQLNodeId } from '../../types/branded.js';
import { ThresholdValue } from '../../domain/value-objects/threshold-value.js';
import { MetricValue } from '../../domain/value-objects/metric-value.js';

/**
 * Maps between API models and domain models for QualityMetrics
 */
export class QualityMetricsMapper {
  /**
   * Maps a DeepSource API metric to domain QualityMetrics aggregates
   *
   * Since one API metric can have multiple items (e.g., per language),
   * this returns an array of QualityMetrics aggregates.
   *
   * @param apiMetric - The API metric model
   * @param projectKey - The project key
   * @param repositoryId - The repository GraphQL ID
   * @returns Array of domain QualityMetrics aggregates
   */
  static toDomainList(
    apiMetric: RepositoryMetric,
    projectKey: string,
    repositoryId: string
  ): QualityMetrics[] {
    return apiMetric.items.map((item) => this.toDomain(apiMetric, item, projectKey, repositoryId));
  }

  /**
   * Maps a single metric item to a domain QualityMetrics aggregate
   *
   * @param apiMetric - The API metric model
   * @param item - The specific metric item
   * @param projectKey - The project key
   * @param repositoryId - The repository GraphQL ID
   * @returns The domain QualityMetrics aggregate
   */
  static toDomain(
    apiMetric: RepositoryMetric,
    item: RepositoryMetricItem,
    projectKey: string,
    repositoryId: string
  ): QualityMetrics {
    const configuration: MetricConfiguration = {
      name: apiMetric.name,
      description: apiMetric.description,
      shortcode: apiMetric.shortcode,
      metricKey: item.key as any, // Will be validated by domain
      unit: apiMetric.unit,
      minAllowed: apiMetric.minValueAllowed,
      maxAllowed: apiMetric.maxValueAllowed,
      positiveDirection: apiMetric.positiveDirection,
      isReported: apiMetric.isReported,
      isThresholdEnforced: apiMetric.isThresholdEnforced,
      threshold:
        item.threshold !== null
          ? ThresholdValue.create(
              item.threshold,
              apiMetric.unit,
              apiMetric.minValueAllowed,
              apiMetric.maxValueAllowed
            )
          : null,
    };

    const params: CreateQualityMetricsParams = {
      projectKey: asProjectKey(projectKey),
      repositoryId: asGraphQLNodeId(repositoryId),
      configuration,
      currentValue:
        item.latestValue !== null
          ? MetricValue.create(
              item.latestValue,
              apiMetric.unit,
              item.latestValueDisplay,
              new Date() // API doesn't provide measurement time
            )
          : undefined,
    };

    return QualityMetrics.create(params);
  }

  /**
   * Maps API threshold status to domain threshold status
   *
   * @param apiStatus - The API threshold status
   * @returns The domain threshold status
   */
  static mapThresholdStatus(apiStatus: string): ThresholdStatus {
    const statusMap: Record<string, ThresholdStatus> = {
      PASSING: 'PASSING',
      FAILING: 'FAILING',
      UNKNOWN: 'UNKNOWN',
    };

    return statusMap[apiStatus] || 'UNKNOWN';
  }

  /**
   * Maps a domain QualityMetrics aggregate to persistence format
   *
   * @param metrics - The domain QualityMetrics aggregate
   * @returns The persistence model
   */
  static toPersistence(metrics: QualityMetrics): {
    id: string;
    projectKey: string;
    repositoryId: string;
    configuration: MetricConfiguration;
    currentValue: MetricValue | null;
    history: MetricHistoryEntry[];
    lastSyncedAt: Date;
  } {
    return metrics.toPersistence();
  }

  /**
   * Creates a metric history entry from API data
   *
   * @param value - The metric value
   * @param threshold - The threshold at the time (optional)
   * @param commitOid - The commit SHA
   * @param recordedAt - When the metric was recorded
   * @param unit - The metric unit
   * @returns A metric history entry
   */
  static createHistoryEntry(
    value: number,
    threshold: number | null,
    commitOid: string,
    recordedAt: Date,
    unit: string,
    minAllowed: number = 0,
    maxAllowed: number = 100
  ): MetricHistoryEntry {
    const metricValue = MetricValue.create(
      value,
      unit,
      undefined, // Use default display value
      recordedAt
    );

    const thresholdValue =
      threshold !== null ? ThresholdValue.create(threshold, unit, minAllowed, maxAllowed) : null;

    // Determine threshold status based on value and threshold
    let thresholdStatus: ThresholdStatus = 'UNKNOWN';
    if (thresholdValue && metricValue) {
      // This is simplified - actual logic would need to consider metric direction
      thresholdStatus = value >= threshold ? 'PASSING' : 'FAILING';
    }

    return {
      value: metricValue,
      threshold: thresholdValue,
      thresholdStatus,
      commitOid,
      recordedAt,
    };
  }

  /**
   * Maps multiple API metrics to domain aggregates
   *
   * @param apiMetrics - Array of API metric models
   * @param projectKey - The project key
   * @param repositoryId - The repository GraphQL ID
   * @returns Array of domain QualityMetrics aggregates
   */
  static toDomainFromList(
    apiMetrics: RepositoryMetric[],
    projectKey: string,
    repositoryId: string
  ): QualityMetrics[] {
    const allMetrics: QualityMetrics[] = [];

    for (const apiMetric of apiMetrics) {
      const domainMetrics = this.toDomainList(apiMetric, projectKey, repositoryId);
      allMetrics.push(...domainMetrics);
    }

    return allMetrics;
  }
}

