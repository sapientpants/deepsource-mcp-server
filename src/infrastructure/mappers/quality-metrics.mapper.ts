/**
 * @fileoverview QualityMetrics mapper
 *
 * Maps between DeepSource API models and domain QualityMetrics aggregates.
 */

import { QualityMetrics } from '../../domain/aggregates/quality-metrics/quality-metrics.aggregate.js';
import { RepositoryMetric, RepositoryMetricItem, MetricKey } from '../../models/metrics.js';
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
 * Maps a single metric item to a domain QualityMetrics aggregate
 *
 * @param apiMetric - The API metric model
 * @param item - The specific metric item
 * @param projectKey - The project key
 * @param repositoryId - The repository GraphQL ID
 * @returns The domain QualityMetrics aggregate
 */
export function mapQualityMetricToDomain(
  apiMetric: RepositoryMetric,
  item: RepositoryMetricItem,
  projectKey: string,
  repositoryId: string
): QualityMetrics {
  const configuration: MetricConfiguration = {
    name: apiMetric.name,
    description: apiMetric.description,
    shortcode: apiMetric.shortcode,
    metricKey: item.key as MetricKey, // Cast to MetricKey
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
  };

  if (item.latestValue !== null) {
    params.currentValue = MetricValue.create(
      item.latestValue,
      apiMetric.unit,
      item.latestValueDisplay,
      new Date() // API doesn't provide measurement time
    );
  }

  return QualityMetrics.create(params);
}

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
export function mapQualityMetricsToDomainList(
  apiMetric: RepositoryMetric,
  projectKey: string,
  repositoryId: string
): QualityMetrics[] {
  return apiMetric.items.map((item) =>
    mapQualityMetricToDomain(apiMetric, item, projectKey, repositoryId)
  );
}

/**
 * Maps API threshold status to domain threshold status
 *
 * @param apiStatus - The API threshold status
 * @returns The domain threshold status
 */
export function mapThresholdStatus(apiStatus: string): ThresholdStatus {
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
export function mapQualityMetricsToPersistence(metrics: QualityMetrics): {
  id: string;
  projectKey: string;
  repositoryId: string;
  configuration: MetricConfiguration;
  currentValue: MetricValue | null;
  history: MetricHistoryEntry[];
  lastUpdated: Date;
} {
  const persistence = metrics.toPersistence();
  return {
    ...persistence,
    projectKey: persistence.projectKey as string,
    repositoryId: persistence.repositoryId as string,
  };
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
export function createMetricHistoryEntry(
  value: number,
  threshold: number | null,
  commitOid: string,
  recordedAt: Date,
  unit: string,
  minAllowed = 0,
  maxAllowed = 100
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
  if (thresholdValue && metricValue && threshold !== null) {
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
export function mapQualityMetricsFromList(
  apiMetrics: RepositoryMetric[],
  projectKey: string,
  repositoryId: string
): QualityMetrics[] {
  const allMetrics: QualityMetrics[] = [];

  for (const apiMetric of apiMetrics) {
    const domainMetrics = mapQualityMetricsToDomainList(apiMetric, projectKey, repositoryId);
    allMetrics.push(...domainMetrics);
  }

  return allMetrics;
}

// For backward compatibility, export a namespace with the old static methods
export const QualityMetricsMapper = {
  toDomain: mapQualityMetricToDomain,
  toDomainList: mapQualityMetricsToDomainList,
  mapThresholdStatus,
  toPersistence: mapQualityMetricsToPersistence,
  createHistoryEntry: createMetricHistoryEntry,
  toDomainFromList: mapQualityMetricsFromList,
};
