import { DeepSourceClient } from '../deepsource.js';
import { MetricShortcode } from '../types/metrics.js';
import { MetricKey, MetricThresholdStatus } from '../types/metrics.js';

/**
 * Interface for parameters for fetching quality metrics
 * @public
 */
export interface DeepsourceQualityMetricsParams {
  /** DeepSource project key to fetch quality metrics for */
  projectKey: string;
  /** Optional filter for specific metric shortcodes */
  shortcodeIn?: MetricShortcode[];
}

/**
 * Interface for parameters for updating a metric threshold
 * @public
 */
export interface DeepsourceUpdateMetricThresholdParams {
  /** DeepSource project key to identify the project */
  projectKey: string;
  /** Repository GraphQL ID */
  repositoryId: string;
  /** Code for the metric to update */
  metricShortcode: MetricShortcode;
  /** Context key for the metric */
  metricKey: MetricKey;
  /** New threshold value, or null to remove */
  thresholdValue?: number | null;
}

/**
 * Interface for parameters for updating metric settings
 * @public
 */
export interface DeepsourceUpdateMetricSettingParams {
  /** DeepSource project key to identify the project */
  projectKey: string;
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
 * Fetches and returns quality metrics from a specified DeepSource project
 * @param params - Parameters for fetching metrics, including project key and optional filters
 * @returns A response containing the metrics data with their values and thresholds
 * @throws Error if the DEEPSOURCE_API_KEY environment variable is not set
 * @public
 */
export async function handleDeepsourceQualityMetrics({
  projectKey,
  shortcodeIn,
}: DeepsourceQualityMetricsParams) {
  const apiKey = process.env.DEEPSOURCE_API_KEY;
  /* istanbul ignore if */
  if (!apiKey) {
    throw new Error('DEEPSOURCE_API_KEY environment variable is not set');
  }

  const client = new DeepSourceClient(apiKey);
  const metrics = await client.getQualityMetrics(projectKey, { shortcodeIn });

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            metrics: metrics.map((metric) => ({
              name: metric.name,
              shortcode: metric.shortcode,
              description: metric.description,
              positiveDirection: metric.positiveDirection,
              unit: metric.unit,
              minValueAllowed: metric.minValueAllowed,
              maxValueAllowed: metric.maxValueAllowed,
              isReported: metric.isReported,
              isThresholdEnforced: metric.isThresholdEnforced,
              items: metric.items.map((item) => ({
                id: item.id,
                key: item.key,
                threshold: item.threshold,
                latestValue: item.latestValue,
                latestValueDisplay: item.latestValueDisplay,
                thresholdStatus: item.thresholdStatus,
                // Add helpful metadata for threshold values
                thresholdInfo:
                  item.threshold !== null &&
                  item.threshold !== undefined &&
                  item.latestValue !== null &&
                  item.latestValue !== undefined
                    ? {
                        difference: item.latestValue - item.threshold,
                        percentDifference:
                          item.threshold !== 0
                            ? `${(
                                ((item.latestValue - item.threshold) / item.threshold) *
                                100
                              ).toFixed(2)}%`
                            : 'N/A',
                        isPassing: item.thresholdStatus === MetricThresholdStatus.PASSING,
                      }
                    : null,
              })),
            })),
            // Add helpful examples for threshold management
            usage_examples: {
              filtering:
                'To filter metrics by type, use the shortcodeIn parameter with specific metric codes (e.g., ["LCV", "BCV"])',
              updating_threshold: 'To update a threshold, use the update_metric_threshold tool',
              updating_settings:
                'To update metric settings (e.g., enable reporting or threshold enforcement), use the update_metric_setting tool',
            },
          },
          null,
          2
        ),
      },
    ],
  };
}

/**
 * Updates the threshold for a specific metric in a project
 * @param params - Parameters for updating the threshold
 * @returns A response indicating whether the update was successful
 * @throws Error if the DEEPSOURCE_API_KEY environment variable is not set
 * @public
 */
export async function handleDeepsourceUpdateMetricThreshold({
  projectKey,
  repositoryId,
  metricShortcode,
  metricKey,
  thresholdValue,
}: DeepsourceUpdateMetricThresholdParams) {
  const apiKey = process.env.DEEPSOURCE_API_KEY;
  /* istanbul ignore if */
  if (!apiKey) {
    throw new Error('DEEPSOURCE_API_KEY environment variable is not set');
  }

  const client = new DeepSourceClient(apiKey);
  const result = await client.setMetricThreshold({
    repositoryId,
    metricShortcode,
    metricKey,
    thresholdValue: thresholdValue ?? null,
  });

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            ok: result.ok,
            projectKey, // Echo back the project key for context
            metricShortcode,
            metricKey,
            thresholdValue,
            message: result.ok
              ? `Successfully ${thresholdValue !== null && thresholdValue !== undefined ? 'updated' : 'removed'} threshold for ${metricShortcode} (${metricKey})`
              : `Failed to update threshold for ${metricShortcode} (${metricKey})`,
            next_steps: result.ok
              ? ['Use quality_metrics to view the updated metrics']
              : ['Check if you have sufficient permissions', 'Verify the repository ID is correct'],
          },
          null,
          2
        ),
      },
    ],
  };
}

/**
 * Updates the settings for a specific metric in a project
 * @param params - Parameters for updating the metric settings
 * @returns A response indicating whether the update was successful
 * @throws Error if the DEEPSOURCE_API_KEY environment variable is not set
 * @public
 */
export async function handleDeepsourceUpdateMetricSetting({
  projectKey,
  repositoryId,
  metricShortcode,
  isReported,
  isThresholdEnforced,
}: DeepsourceUpdateMetricSettingParams) {
  const apiKey = process.env.DEEPSOURCE_API_KEY;
  /* istanbul ignore if */
  if (!apiKey) {
    throw new Error('DEEPSOURCE_API_KEY environment variable is not set');
  }

  const client = new DeepSourceClient(apiKey);
  const result = await client.updateMetricSetting({
    repositoryId,
    metricShortcode,
    isReported,
    isThresholdEnforced,
  });

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            ok: result.ok,
            projectKey, // Echo back the project key for context
            metricShortcode,
            settings: {
              isReported,
              isThresholdEnforced,
            },
            message: result.ok
              ? `Successfully updated settings for ${metricShortcode}`
              : `Failed to update settings for ${metricShortcode}`,
            next_steps: result.ok
              ? ['Use quality_metrics to view the updated metrics']
              : ['Check if you have sufficient permissions', 'Verify the repository ID is correct'],
          },
          null,
          2
        ),
      },
    ],
  };
}
