/**
 * @fileoverview QualityMetrics aggregate root
 *
 * This module defines the QualityMetrics aggregate which represents quality metrics
 * for a project with their thresholds, measurements, and history.
 */

import { AggregateRoot } from '../../shared/aggregate-root.js';
import { ProjectKey, GraphQLNodeId } from '../../../types/branded.js';
import { ThresholdValue } from '../../value-objects/threshold-value.js';
import { MetricValue } from '../../value-objects/metric-value.js';
import {
  QualityMetricsId,
  MetricConfiguration,
  MetricHistoryEntry,
  MetricTrend,
  ThresholdStatus,
  CreateQualityMetricsParams,
  UpdateMetricConfigParams,
  RecordMeasurementParams,
} from './quality-metrics.types.js';

/**
 * QualityMetrics aggregate root
 *
 * Represents quality metrics for a project with configuration, thresholds, and history.
 * Tracks metric values over time and evaluates compliance with thresholds.
 *
 * @example
 * ```typescript
 * const metrics = QualityMetrics.create({
 *   projectKey: asProjectKey('my-project'),
 *   repositoryId: asGraphQLNodeId('repo123'),
 *   configuration: {
 *     name: 'Line Coverage',
 *     shortcode: MetricShortcode.LCV,
 *     metricKey: MetricKey.AGGREGATE,
 *     unit: '%',
 *     minAllowed: 0,
 *     maxAllowed: 100,
 *     positiveDirection: 'UPWARD',
 *     isReported: true,
 *     isThresholdEnforced: true,
 *     threshold: ThresholdValue.createPercentage(80)
 *   }
 * });
 *
 * metrics.recordMeasurement({ value: 85.5, commitOid: 'abc123' });
 * console.log(metrics.isCompliant); // true
 * ```
 */
export class QualityMetrics extends AggregateRoot<string> {
  private _projectKey: ProjectKey;
  private _repositoryId: GraphQLNodeId;
  private _configuration: MetricConfiguration;
  private _currentValue: MetricValue | null;
  private _history: MetricHistoryEntry[];
  private _lastUpdated: Date;
  private static readonly MAX_HISTORY_ENTRIES = 100;

  private constructor(
    id: string,
    projectKey: ProjectKey,
    repositoryId: GraphQLNodeId,
    configuration: MetricConfiguration,
    currentValue: MetricValue | null,
    history: MetricHistoryEntry[],
    lastUpdated: Date
  ) {
    super(id);
    this._projectKey = projectKey;
    this._repositoryId = repositoryId;
    this._configuration = configuration;
    this._currentValue = currentValue;
    this._history = history;
    this._lastUpdated = lastUpdated;
  }

  /**
   * Creates a new QualityMetrics aggregate
   *
   * @param params - Creation parameters
   * @returns A new QualityMetrics instance
   */
  static create(params: CreateQualityMetricsParams): QualityMetrics {
    const { projectKey, repositoryId, configuration, currentValue, history } = params;

    // Validate configuration
    if (!configuration.name || configuration.name.trim().length === 0) {
      throw new Error('Metric name cannot be empty');
    }

    if (configuration.minAllowed >= configuration.maxAllowed) {
      throw new Error('Min allowed value must be less than max allowed value');
    }

    // Create composite ID
    const id = QualityMetrics.createId({
      projectKey,
      metricKey: configuration.metricKey,
      shortcode: configuration.shortcode,
    });

    const now = new Date();
    const metrics = new QualityMetrics(
      id,
      projectKey,
      repositoryId,
      configuration,
      currentValue || null,
      history || [],
      now
    );

    metrics.addDomainEvent({
      aggregateId: id,
      eventType: 'QualityMetricsCreated',
      occurredAt: now,
      payload: {
        projectKey,
        metricKey: configuration.metricKey,
        shortcode: configuration.shortcode,
        threshold: configuration.threshold?.value,
      },
    });

    return metrics;
  }

  /**
   * Creates a composite ID for the aggregate
   */
  private static createId(id: QualityMetricsId): string {
    return `${id.projectKey}:${id.metricKey}:${id.shortcode}`;
  }

  /**
   * Gets the project key
   */
  get projectKey(): ProjectKey {
    return this._projectKey;
  }

  /**
   * Gets the repository ID
   */
  get repositoryId(): GraphQLNodeId {
    return this._repositoryId;
  }

  /**
   * Gets the metric configuration
   */
  get configuration(): Readonly<MetricConfiguration> {
    return { ...this._configuration };
  }

  /**
   * Gets the current metric value
   */
  get currentValue(): MetricValue | null {
    return this._currentValue;
  }

  /**
   * Gets the metric history
   */
  get history(): ReadonlyArray<MetricHistoryEntry> {
    return [...this._history];
  }

  /**
   * Gets the last update timestamp
   */
  get lastUpdated(): Date {
    return this._lastUpdated;
  }

  /**
   * Checks if the metric is currently compliant with its threshold
   */
  get isCompliant(): boolean {
    if (!this._configuration.threshold || !this._currentValue) {
      return true; // No threshold or no value means compliant
    }

    return this._configuration.threshold.isMet(
      this._currentValue.value,
      this._configuration.positiveDirection === 'UPWARD' ? 'upward' : 'downward'
    );
  }

  /**
   * Gets the current threshold status
   */
  get thresholdStatus(): ThresholdStatus {
    if (!this._configuration.threshold || !this._currentValue) {
      return 'UNKNOWN';
    }

    return this.isCompliant ? 'PASSING' : 'FAILING';
  }

  /**
   * Updates the metric threshold
   *
   * @param threshold - New threshold value or null to remove
   */
  updateThreshold(threshold: ThresholdValue | null): void {
    const oldThreshold = this._configuration.threshold;

    if (threshold && threshold.unit !== this._configuration.unit) {
      throw new Error(
        `Threshold unit '${threshold.unit}' does not match metric unit '${this._configuration.unit}'`
      );
    }

    if (
      threshold &&
      (threshold.value < this._configuration.minAllowed ||
        threshold.value > this._configuration.maxAllowed)
    ) {
      throw new Error('Threshold value is outside allowed range for this metric');
    }

    this._configuration.threshold = threshold;
    this._lastUpdated = new Date();

    this.addDomainEvent({
      aggregateId: this._id,
      eventType: 'MetricThresholdUpdated',
      occurredAt: this._lastUpdated,
      payload: {
        oldThreshold: oldThreshold?.value,
        newThreshold: threshold?.value,
        unit: this._configuration.unit,
      },
    });

    this.markAsModified();
  }

  /**
   * Updates the metric configuration
   *
   * @param params - Configuration update parameters
   */
  updateConfiguration(params: UpdateMetricConfigParams): void {
    let hasChanges = false;

    if (params.name !== undefined) {
      const trimmedName = params.name.trim();
      if (trimmedName.length === 0) {
        throw new Error('Metric name cannot be empty');
      }
      if (trimmedName !== this._configuration.name) {
        this._configuration.name = trimmedName;
        hasChanges = true;
      }
    }

    if (
      params.description !== undefined &&
      params.description !== this._configuration.description
    ) {
      this._configuration.description = params.description;
      hasChanges = true;
    }

    if (params.isReported !== undefined && params.isReported !== this._configuration.isReported) {
      this._configuration.isReported = params.isReported;
      hasChanges = true;
    }

    if (
      params.isThresholdEnforced !== undefined &&
      params.isThresholdEnforced !== this._configuration.isThresholdEnforced
    ) {
      this._configuration.isThresholdEnforced = params.isThresholdEnforced;
      hasChanges = true;
    }

    if (hasChanges) {
      this._lastUpdated = new Date();
      this.addDomainEvent({
        aggregateId: this._id,
        eventType: 'MetricConfigurationUpdated',
        occurredAt: this._lastUpdated,
        payload: params as Record<string, unknown>,
      });
      this.markAsModified();
    }
  }

  /**
   * Records a new measurement
   *
   * @param params - Measurement parameters
   */
  recordMeasurement(params: RecordMeasurementParams): void {
    const { value, commitOid, measuredAt } = params;

    if (value < this._configuration.minAllowed || value > this._configuration.maxAllowed) {
      throw new Error(
        `Value ${value} is outside allowed range [${this._configuration.minAllowed}, ${this._configuration.maxAllowed}]`
      );
    }

    const timestamp = measuredAt || new Date();
    const metricValue = MetricValue.create(value, this._configuration.unit, undefined, timestamp);

    // Update current value
    this._currentValue = metricValue;

    // Add to history
    const historyEntry: MetricHistoryEntry = {
      value: metricValue,
      threshold: this._configuration.threshold,
      thresholdStatus: this.thresholdStatus,
      commitOid,
      recordedAt: timestamp,
    };

    this._history.push(historyEntry);

    // Trim history if needed
    if (this._history.length > QualityMetrics.MAX_HISTORY_ENTRIES) {
      this._history = this._history.slice(-QualityMetrics.MAX_HISTORY_ENTRIES);
    }

    this._lastUpdated = timestamp;

    this.addDomainEvent({
      aggregateId: this._id,
      eventType: 'MeasurementRecorded',
      occurredAt: timestamp,
      payload: {
        value,
        unit: this._configuration.unit,
        commitOid,
        thresholdStatus: this.thresholdStatus,
      },
    });

    this.markAsModified();
  }

  /**
   * Evaluates compliance at a specific point in time
   *
   * @param value - The value to evaluate
   * @returns Whether the value meets the threshold
   */
  evaluateCompliance(value: number): boolean {
    if (!this._configuration.threshold) {
      return true;
    }

    return this._configuration.threshold.isMet(
      value,
      this._configuration.positiveDirection === 'UPWARD' ? 'upward' : 'downward'
    );
  }

  /**
   * Gets the trend over a specified period
   *
   * @param periodDays - Number of days to analyze
   * @returns Trend information or null if insufficient data
   */
  getTrend(periodDays = 30): MetricTrend | null {
    if (this._history.length < 2) {
      return null;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - periodDays);

    const recentHistory = this._history.filter((entry) => entry.recordedAt >= cutoffDate);

    if (recentHistory.length < 2) {
      return null;
    }

    const firstValue = recentHistory[0].value.value;
    const lastValue = recentHistory[recentHistory.length - 1].value.value;
    const changePercentage = ((lastValue - firstValue) / firstValue) * 100;

    let direction: 'IMPROVING' | 'DEGRADING' | 'STABLE';
    if (Math.abs(changePercentage) < 1) {
      direction = 'STABLE';
    } else if (
      (this._configuration.positiveDirection === 'UPWARD' && changePercentage > 0) ||
      (this._configuration.positiveDirection === 'DOWNWARD' && changePercentage < 0)
    ) {
      direction = 'IMPROVING';
    } else {
      direction = 'DEGRADING';
    }

    return {
      direction,
      changePercentage,
      periodDays,
    };
  }

  /**
   * Reconstructs QualityMetrics from persisted data
   *
   * @param data - Persisted metrics data
   * @returns A reconstructed QualityMetrics instance
   */
  static fromPersistence(data: {
    id: string;
    projectKey: ProjectKey;
    repositoryId: GraphQLNodeId;
    configuration: MetricConfiguration;
    currentValue: MetricValue | null;
    history: MetricHistoryEntry[];
    lastUpdated: Date;
  }): QualityMetrics {
    return new QualityMetrics(
      data.id,
      data.projectKey,
      data.repositoryId,
      data.configuration,
      data.currentValue,
      data.history,
      data.lastUpdated
    );
  }

  /**
   * Converts the metrics to a persistence-friendly format
   */
  toPersistence(): {
    id: string;
    projectKey: ProjectKey;
    repositoryId: GraphQLNodeId;
    configuration: MetricConfiguration;
    currentValue: MetricValue | null;
    history: MetricHistoryEntry[];
    lastUpdated: Date;
  } {
    return {
      id: this._id,
      projectKey: this._projectKey,
      repositoryId: this._repositoryId,
      configuration: { ...this._configuration },
      currentValue: this._currentValue,
      history: [...this._history],
      lastUpdated: this._lastUpdated,
    };
  }
}
