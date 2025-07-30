/**
 * @fileoverview Types for the QualityMetrics aggregate
 *
 * This module defines the types and interfaces used by the QualityMetrics aggregate.
 */

import { ProjectKey, GraphQLNodeId } from '../../../types/branded.js';
import { MetricShortcode, MetricKey } from '../../../models/metrics.js';
import { ThresholdValue } from '../../value-objects/threshold-value.js';
import { MetricValue } from '../../value-objects/metric-value.js';

/**
 * Metric direction - whether higher values are better
 */
export type MetricDirection = 'UPWARD' | 'DOWNWARD';

/**
 * Threshold status for a metric
 */
export type ThresholdStatus = 'PASSING' | 'FAILING' | 'UNKNOWN';

/**
 * Configuration for a quality metric
 */
export interface MetricConfiguration {
  name: string;
  description: string;
  shortcode: MetricShortcode;
  metricKey: MetricKey;
  unit: string;
  minAllowed: number;
  maxAllowed: number;
  positiveDirection: MetricDirection;
  isReported: boolean;
  isThresholdEnforced: boolean;
  threshold: ThresholdValue | null;
}

/**
 * A single metric history entry
 */
export interface MetricHistoryEntry {
  value: MetricValue;
  threshold: ThresholdValue | null;
  thresholdStatus: ThresholdStatus;
  commitOid: string;
  recordedAt: Date;
}

/**
 * Metric trend information
 */
export interface MetricTrend {
  direction: 'IMPROVING' | 'DEGRADING' | 'STABLE';
  changePercentage: number;
  periodDays: number;
}

/**
 * Parameters for creating a new QualityMetrics aggregate
 */
export interface CreateQualityMetricsParams {
  projectKey: ProjectKey;
  repositoryId: GraphQLNodeId;
  configuration: MetricConfiguration;
  currentValue?: MetricValue;
  history?: MetricHistoryEntry[];
}

/**
 * Parameters for updating metric configuration
 */
export interface UpdateMetricConfigParams {
  name?: string;
  description?: string;
  isReported?: boolean;
  isThresholdEnforced?: boolean;
}

/**
 * Parameters for recording a new measurement
 */
export interface RecordMeasurementParams {
  value: number;
  commitOid: string;
  measuredAt?: Date;
}

/**
 * Composite key for QualityMetrics aggregate
 */
export interface QualityMetricsId {
  projectKey: ProjectKey;
  metricKey: MetricKey;
  shortcode: MetricShortcode;
}
