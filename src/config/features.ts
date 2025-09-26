/**
 * @fileoverview Feature flags configuration for the DeepSource MCP server
 *
 * This module provides a centralized system for managing feature flags,
 * allowing experimental and optional features to be toggled via environment
 * variables without code changes.
 *
 * @packageDocumentation
 */

/**
 * Feature flags interface defining all available toggles
 */
export interface FeatureFlags {
  /** Enable automatic tool discovery from filesystem */
  toolDiscovery: boolean;
  /** Enable enhanced logging with additional debug information */
  enhancedLogging: boolean;
  /** Enable metrics collection and reporting */
  metrics: boolean;
  /** Enable caching layer for API responses (future) */
  cache: boolean;
}

/**
 * Default feature flag values used when environment variables are not set
 */
const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  toolDiscovery: false,
  enhancedLogging: false,
  metrics: false,
  cache: false,
};

/**
 * Get current feature flags from environment variables
 *
 * @returns Current feature flag configuration
 *
 * @example
 * ```typescript
 * const features = getFeatureFlags();
 * if (features.toolDiscovery) {
 *   await discoverTools();
 * }
 * ```
 */
export function getFeatureFlags(): FeatureFlags {
  return {
    toolDiscovery: process.env.FEATURE_TOOL_DISCOVERY === 'true',
    enhancedLogging: process.env.FEATURE_ENHANCED_LOGGING === 'true',
    metrics: process.env.FEATURE_METRICS === 'true',
    cache: process.env.FEATURE_CACHE === 'true',
  };
}

/**
 * Check if a specific feature is enabled
 *
 * @param feature - The feature to check
 * @returns Whether the feature is enabled
 *
 * @example
 * ```typescript
 * if (isFeatureEnabled('toolDiscovery')) {
 *   // Feature-specific code
 * }
 * ```
 */
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  const flags = getFeatureFlags();
  return flags[feature];
}

/**
 * Get all enabled features as an array
 *
 * @returns Array of enabled feature names
 *
 * @example
 * ```typescript
 * const enabled = getEnabledFeatures();
 * console.log('Enabled features:', enabled);
 * // Output: ['toolDiscovery', 'metrics']
 * ```
 */
export function getEnabledFeatures(): Array<keyof FeatureFlags> {
  const flags = getFeatureFlags();
  return (Object.keys(flags) as Array<keyof FeatureFlags>).filter((key) => flags[key]);
}

/**
 * Get feature flags with defaults applied
 *
 * @returns Feature flags with defaults for unset values
 */
export function getFeaturesWithDefaults(): FeatureFlags {
  const envFlags = getFeatureFlags();
  return { ...DEFAULT_FEATURE_FLAGS, ...envFlags };
}

/**
 * Log current feature flag configuration (for debugging)
 *
 * @param logger - Optional logger function (defaults to console.log)
 */
export function logFeatureFlags(
  logger: (message: string, data?: unknown) => void = console.log // eslint-disable-line no-console
): void {
  const flags = getFeatureFlags();
  const enabled = getEnabledFeatures();

  logger('Feature flags configuration:', {
    flags,
    enabledCount: enabled.length,
    enabledFeatures: enabled,
  });
}
