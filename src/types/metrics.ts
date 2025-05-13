/**
 * Types and interfaces for DeepSource quality metrics
 * @packageDocumentation
 */

/* eslint-disable no-unused-vars */
/**
 * Shortcodes for the different types of metrics that DeepSource supports
 * @public
 */
export enum MetricShortcode {
  /** Line Coverage - percentage of lines covered by tests */
  LCV = 'LCV',
  /** Branch Coverage - percentage of branches covered by tests */
  BCV = 'BCV',
  /** Documentation Coverage - percentage of public functions with documentation */
  DCV = 'DCV',
  /** Duplicate Code Percentage - percentage of code that is duplicated */
  DDP = 'DDP',
  /** Statement Coverage - percentage of statements covered by tests */
  SCV = 'SCV',
  /** Type Coverage - percentage of code with type annotations */
  TCV = 'TCV',
  /** Complexity - code complexity metrics */
  CMP = 'CMP',
}

/**
 * Keys for different metric contexts, like programming languages or aggregates
 * @public
 */
export enum MetricKey {
  /** Aggregate metrics for the entire repository */
  AGGREGATE = 'AGGREGATE',
  /** Python-specific metrics */
  PYTHON = 'PYTHON',
  /** JavaScript-specific metrics */
  JAVASCRIPT = 'JAVASCRIPT',
  /** TypeScript-specific metrics */
  TYPESCRIPT = 'TYPESCRIPT',
  /** Go-specific metrics */
  GO = 'GO',
  /** Java-specific metrics */
  JAVA = 'JAVA',
  /** Ruby-specific metrics */
  RUBY = 'RUBY',
  /** Rust-specific metrics */
  RUST = 'RUST',
}

/**
 * Status of a metric's threshold comparison
 * @public
 */
export enum MetricThresholdStatus {
  /** Metric is passing (meets or exceeds threshold) */
  PASSING = 'PASSING',
  /** Metric is failing (does not meet threshold) */
  FAILING = 'FAILING',
  /** Metric threshold status is unknown or not applicable */
  UNKNOWN = 'UNKNOWN',
}

/**
 * Direction in which a metric is considered "positive"
 * @public
 */
export enum MetricDirection {
  /** Higher values are better (e.g., code coverage) */
  UPWARD = 'UPWARD',
  /** Lower values are better (e.g., duplicate code percentage) */
  DOWNWARD = 'DOWNWARD',
}
/* eslint-enable no-unused-vars */

/**
 * Settings for a specific metric
 * @public
 */
export interface MetricSetting {
  /** Whether the metric is reported in the UI and API */
  isReported: boolean;
  /** Whether the threshold for this metric is enforced (can fail checks) */
  isThresholdEnforced: boolean;
}

/**
 * Parameters for updating a metric's threshold
 * @public
 */
export interface UpdateMetricThresholdParams {
  /** Repository GraphQL ID */
  repositoryId: string;
  /** Code for the metric to update */
  metricShortcode: MetricShortcode;
  /** Context key for the metric */
  metricKey: MetricKey;
  /** New threshold value, or null to remove */
  thresholdValue: number | null;
}

/**
 * Parameters for updating a metric's settings
 * @public
 */
export interface UpdateMetricSettingParams {
  /** Repository GraphQL ID */
  repositoryId: string;
  /** Code for the metric to update */
  metricShortcode: MetricShortcode;
  /** Whether the metric should be reported */
  isReported: boolean;
  /** Whether the threshold should be enforced */
  isThresholdEnforced: boolean;
}

/**
 * Response from updating a metric threshold
 * @public
 */
export interface MetricThresholdUpdateResponse {
  /** Whether the operation was successful */
  ok: boolean;
}

/**
 * Response from updating a metric's settings
 * @public
 */
export interface MetricSettingUpdateResponse {
  /** Whether the operation was successful */
  ok: boolean;
}

/**
 * A specific metric item, with values for a specific context (e.g., language)
 * @public
 */
export interface RepositoryMetricItem {
  /** Unique identifier for this metric item */
  id: string;
  /** Context key, e.g., language or AGGREGATE */
  key: string;
  /** The threshold value, if set */
  threshold: number | null;
  /** Current value of the metric */
  latestValue: number | null;
  /** Formatted display string for the latest value */
  latestValueDisplay: string;
  /** Status of the metric compared to its threshold */
  thresholdStatus: string;
}

/**
 * A repository metric with all its configuration and values
 * @public
 */
export interface RepositoryMetric {
  /** Human-readable name of the metric */
  name: string;
  /** Shortcode identifier for the metric */
  shortcode: MetricShortcode;
  /** Description of what the metric measures */
  description: string;
  /** Direction in which higher values are considered better */
  positiveDirection: MetricDirection;
  /** Unit of measurement (e.g., '%') */
  unit: string;
  /** Minimum allowed value for this metric */
  minValueAllowed: number;
  /** Maximum allowed value for this metric */
  maxValueAllowed: number;
  /** Whether the metric is being reported */
  isReported: boolean;
  /** Whether threshold enforcement is enabled */
  isThresholdEnforced: boolean;
  /** List of metric items for different contexts */
  items: RepositoryMetricItem[];
}
