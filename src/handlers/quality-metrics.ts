import { DeepSourceClient } from '../deepsource.js';
import { MetricShortcode, MetricKey, MetricThresholdStatus } from '../types/metrics.js';
import { BaseHandlerDeps, HandlerFactory } from './base/handler.interface.js';
import {
  createBaseHandlerFactory,
  wrapInApiResponse,
  createDefaultHandlerDeps,
} from './base/handler.factory.js';
import { createLogger } from '../utils/logging/logger.js';
import { IQualityMetricsRepository } from '../domain/aggregates/quality-metrics/quality-metrics.repository.js';
import { RepositoryFactory } from '../infrastructure/factories/repository.factory.js';
import { asProjectKey } from '../types/branded.js';
import { MCPErrorFormatter, validateNonEmptyString } from '../utils/error-handling/index.js';

// Logger for the quality metrics handler
const logger = createLogger('QualityMetricsHandler');

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
 * Extended dependencies interface for quality metrics handler
 */
interface QualityMetricsHandlerDeps {
  qualityMetricsRepository: IQualityMetricsRepository;
  logger: any;
}

/**
 * Creates a quality metrics handler with injected dependencies
 * @param deps - The dependencies for the handler
 * @returns The configured handler function
 */
export function createQualityMetricsHandlerWithRepo(deps: QualityMetricsHandlerDeps) {
  return async function handleQualityMetrics(params: DeepsourceQualityMetricsParams) {
    try {
      const { projectKey, shortcodeIn } = params;

      // Validate required parameters using MCP error handling
      validateNonEmptyString(projectKey, 'projectKey');

      const projectKeyBranded = asProjectKey(projectKey);
      deps.logger.info('Fetching quality metrics from repository', { projectKey, shortcodeIn });

      // Get all metrics for the project from repository
      const allMetrics = await deps.qualityMetricsRepository.findByProject(projectKeyBranded);

      // Filter by shortcode if specified
      const filteredMetrics = shortcodeIn
        ? allMetrics.filter((metric: any) => shortcodeIn.includes(metric.configuration.shortcode))
        : allMetrics;

      deps.logger.info('Successfully fetched quality metrics', {
        count: filteredMetrics.length,
        projectKey,
      });

      const metricsData = {
        metrics: filteredMetrics.map((domainMetric: any) => ({
          name: domainMetric.configuration.name,
          shortcode: domainMetric.configuration.shortcode,
          description: domainMetric.configuration.description,
          positiveDirection: domainMetric.configuration.positiveDirection,
          unit: domainMetric.configuration.unit,
          minValueAllowed: domainMetric.configuration.minValueAllowed,
          maxValueAllowed: domainMetric.configuration.maxValueAllowed,
          isReported: domainMetric.configuration.isReported,
          isThresholdEnforced: domainMetric.configuration.isThresholdEnforced,
          items: [
            {
              id: domainMetric.repositoryId,
              key: domainMetric.configuration.metricKey,
              threshold: domainMetric.configuration.threshold?.value ?? null,
              latestValue: domainMetric.currentValue?.value ?? null,
              latestValueDisplay: domainMetric.currentValue?.displayValue ?? null,
              thresholdStatus: domainMetric.thresholdStatus,
              // Add helpful metadata for threshold values
              thresholdInfo:
                domainMetric.configuration.threshold &&
                domainMetric.currentValue &&
                domainMetric.configuration.threshold.value !== null &&
                domainMetric.currentValue.value !== null
                  ? {
                      difference:
                        domainMetric.currentValue.value -
                        domainMetric.configuration.threshold.value,
                      percentDifference:
                        domainMetric.configuration.threshold.value !== 0
                          ? `${(((domainMetric.currentValue.value - domainMetric.configuration.threshold.value) / domainMetric.configuration.threshold.value) * 100).toFixed(2)}%`
                          : 'N/A',
                      isPassing: domainMetric.isCompliant,
                    }
                  : null,
            },
          ],
        })),
        // Add helpful examples for threshold management
        usage_examples: {
          filtering:
            'To filter metrics by type, use the shortcodeIn parameter with specific metric codes (e.g., ["LCV", "BCV"])',
          updating_threshold: 'To update a threshold, use the update_metric_threshold tool',
          updating_settings:
            'To update metric settings (e.g., enable reporting or threshold enforcement), use the update_metric_setting tool',
        },
      };

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(metricsData),
          },
        ],
      };
    } catch (error) {
      deps.logger.error('Error in handleQualityMetrics', {
        errorType: typeof error,
        errorName: error instanceof Error ? error.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : 'No stack available',
      });

      // Use MCP-compliant error formatting
      return MCPErrorFormatter.createErrorResponse(error, 'quality-metrics-fetch');
    }
  };
}

// Keep the old handler for backward compatibility with the base handler pattern
export const createQualityMetricsHandler: HandlerFactory<
  BaseHandlerDeps,
  DeepsourceQualityMetricsParams
> = createBaseHandlerFactory('quality_metrics', async (deps, { projectKey, shortcodeIn }) => {
  const apiKey = deps.getApiKey();
  deps.logger.debug('API key retrieved from config', {
    length: apiKey.length,
    prefix: `${apiKey.substring(0, 5)}...`,
  });

  const client = new DeepSourceClient(apiKey);
  deps.logger.info('Fetching quality metrics', { projectKey, shortcodeIn });

  const metrics = await client.getQualityMetrics(projectKey, { shortcodeIn });

  deps.logger.info('Successfully fetched quality metrics', {
    count: metrics.length,
    projectKey,
  });

  const metricsData = {
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
                    ? `${(((item.latestValue - item.threshold) / item.threshold) * 100).toFixed(
                        2
                      )}%`
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
  };

  return wrapInApiResponse(metricsData);
});

/**
 * Fetches and returns quality metrics from a specified DeepSource project using domain aggregates
 * @param params - Parameters for fetching metrics, including project key and optional filters
 * @returns A response containing the metrics data with their values and thresholds
 * @throws Error if the DEEPSOURCE_API_KEY environment variable is not set or if API call fails
 * @public
 */
export async function handleDeepsourceQualityMetrics(params: DeepsourceQualityMetricsParams) {
  try {
    const baseDeps = createDefaultHandlerDeps({ logger });
    const apiKey = baseDeps.getApiKey();
    const repositoryFactory = new RepositoryFactory({ apiKey });
    const qualityMetricsRepository = repositoryFactory.createQualityMetricsRepository();

    const deps: QualityMetricsHandlerDeps = {
      qualityMetricsRepository,
      logger,
    };

    const handler = createQualityMetricsHandlerWithRepo(deps);
    const result = await handler(params);

    return result;
  } catch (error) {
    // Handle configuration errors and other setup issues
    return MCPErrorFormatter.createErrorResponse(error, 'quality-metrics-setup');
  }
}

/**
 * Creates an update metric threshold handler with injected dependencies
 * @param deps - The dependencies for the handler
 * @returns The configured handler factory
 */
export const createUpdateMetricThresholdHandler: HandlerFactory<
  BaseHandlerDeps,
  DeepsourceUpdateMetricThresholdParams
> = createBaseHandlerFactory(
  'update_metric_threshold',
  async (deps, { projectKey, repositoryId, metricShortcode, metricKey, thresholdValue }) => {
    const apiKey = deps.getApiKey();
    deps.logger.debug('API key retrieved from config', {
      length: apiKey.length,
      prefix: `${apiKey.substring(0, 5)}...`,
    });

    const client = new DeepSourceClient(apiKey);
    deps.logger.info('Updating metric threshold', {
      projectKey,
      repositoryId,
      metricShortcode,
      metricKey,
      thresholdValue,
    });

    const result = await client.setMetricThreshold({
      repositoryId,
      metricShortcode,
      metricKey,
      thresholdValue: thresholdValue ?? null,
    });

    deps.logger.info('Metric threshold update result', {
      success: result.ok,
      projectKey,
      metricShortcode,
      metricKey,
    });

    const updateResult = {
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
    };

    return wrapInApiResponse(updateResult);
  }
);

/**
 * Updates the threshold for a specific metric in a project
 * @param params - Parameters for updating the threshold
 * @returns A response indicating whether the update was successful
 * @throws Error if the DEEPSOURCE_API_KEY environment variable is not set
 * @public
 */
export async function handleDeepsourceUpdateMetricThreshold(
  params: DeepsourceUpdateMetricThresholdParams
) {
  const deps = createDefaultHandlerDeps({ logger });
  const handler = createUpdateMetricThresholdHandler(deps);
  return handler(params);
}

/**
 * Creates an update metric setting handler with injected dependencies
 * @param deps - The dependencies for the handler
 * @returns The configured handler factory
 */
export const createUpdateMetricSettingHandler: HandlerFactory<
  BaseHandlerDeps,
  DeepsourceUpdateMetricSettingParams
> = createBaseHandlerFactory(
  'update_metric_setting',
  async (deps, { projectKey, repositoryId, metricShortcode, isReported, isThresholdEnforced }) => {
    const apiKey = deps.getApiKey();
    deps.logger.debug('API key retrieved from config', {
      length: apiKey.length,
      prefix: `${apiKey.substring(0, 5)}...`,
    });

    const client = new DeepSourceClient(apiKey);
    deps.logger.info('Updating metric setting', {
      projectKey,
      repositoryId,
      metricShortcode,
      isReported,
      isThresholdEnforced,
    });

    const result = await client.updateMetricSetting({
      repositoryId,
      metricShortcode,
      isReported,
      isThresholdEnforced,
    });

    deps.logger.info('Metric setting update result', {
      success: result.ok,
      projectKey,
      metricShortcode,
    });

    const updateResult = {
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
    };

    return wrapInApiResponse(updateResult);
  }
);

/**
 * Updates the settings for a specific metric in a project
 * @param params - Parameters for updating the metric settings
 * @returns A response indicating whether the update was successful
 * @throws Error if the DEEPSOURCE_API_KEY environment variable is not set
 * @public
 */
export async function handleDeepsourceUpdateMetricSetting(
  params: DeepsourceUpdateMetricSettingParams
) {
  const deps = createDefaultHandlerDeps({ logger });
  const handler = createUpdateMetricSettingHandler(deps);
  return handler(params);
}
