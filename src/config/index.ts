/**
 * @fileoverview Configuration management for DeepSource MCP Server
 * @packageDocumentation
 */

import { createLogger } from '../utils/logging/logger.js';

const logger = createLogger('DeepSourceMCP:Config');

/**
 * Configuration interface for the DeepSource MCP Server
 */
export interface DeepSourceConfig {
  /** DeepSource API key for authentication */
  apiKey: string;
  /** Base URL for DeepSource API */
  apiBaseUrl: string;
  /** Request timeout in milliseconds */
  requestTimeout: number;
  /** Log file path (optional) */
  logFile?: string;
  /** Log level */
  logLevel: string;
}

/**
 * Default configuration values
 */
const defaultConfig: Partial<DeepSourceConfig> = {
  apiBaseUrl: 'https://api.deepsource.io/graphql/',
  requestTimeout: 30000,
  logLevel: 'DEBUG',
};

/**
 * Validates the configuration
 * @throws Error if configuration is invalid
 */
function validateConfig(config: Partial<DeepSourceConfig>): DeepSourceConfig {
  if (!config.apiKey) {
    throw new Error('DEEPSOURCE_API_KEY environment variable is not set');
  }

  // Validate timeout is a positive number
  if (
    config.requestTimeout &&
    (typeof config.requestTimeout !== 'number' || config.requestTimeout <= 0)
  ) {
    throw new Error('Request timeout must be a positive number');
  }

  return config as DeepSourceConfig;
}

/**
 * Loads configuration from environment variables
 */
function loadConfigFromEnv(): Partial<DeepSourceConfig> {
  return {
    apiKey: process.env.DEEPSOURCE_API_KEY,
    apiBaseUrl: process.env.DEEPSOURCE_API_BASE_URL,
    requestTimeout: process.env.DEEPSOURCE_REQUEST_TIMEOUT
      ? parseInt(process.env.DEEPSOURCE_REQUEST_TIMEOUT, 10)
      : undefined,
    logFile: process.env.LOG_FILE,
    logLevel: process.env.LOG_LEVEL,
  };
}

/**
 * Gets the current configuration
 * @returns The validated configuration
 * @throws Error if configuration is invalid
 */
export function getConfig(): DeepSourceConfig {
  const envConfig = loadConfigFromEnv();

  // Merge with defaults
  const mergedConfig = {
    ...defaultConfig,
    ...Object.fromEntries(Object.entries(envConfig).filter(([, value]) => value !== undefined)),
  };

  logger.debug('Loading configuration', {
    hasApiKey: Boolean(mergedConfig.apiKey),
    apiBaseUrl: mergedConfig.apiBaseUrl,
    requestTimeout: mergedConfig.requestTimeout,
    logLevel: mergedConfig.logLevel,
  });

  return validateConfig(mergedConfig);
}

/**
 * Checks if the API key is configured
 * @returns True if API key is set
 */
export function hasApiKey(): boolean {
  return Boolean(process.env.DEEPSOURCE_API_KEY);
}

/**
 * Gets the API key from configuration
 * @returns The API key
 * @throws Error if API key is not set
 */
export function getApiKey(): string {
  const config = getConfig();
  return config.apiKey;
}
