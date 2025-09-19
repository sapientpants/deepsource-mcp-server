/**
 * @fileoverview Configuration management for DeepSource MCP Server
 * @packageDocumentation
 */

import { createLogger } from '../utils/logging/logger.js';
import { MCPErrorFactory } from '../utils/error-handling/index.js';
import { loadRetryConfig, validateRetryConfig, RetryConfig } from './retry.config.js';
export { RetryConfig, loadRetryConfig, validateRetryConfig } from './retry.config.js';

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
  /** Retry configuration */
  retry: RetryConfig;
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
 * @throws MCPError if configuration is invalid
 */
function validateConfig(config: Partial<DeepSourceConfig>): DeepSourceConfig {
  if (!config.apiKey) {
    throw MCPErrorFactory.configuration('DeepSource API key is required but not configured', {
      environmentVariable: 'DEEPSOURCE_API_KEY',
      documentation:
        'Please set the DEEPSOURCE_API_KEY environment variable with your DeepSource API key',
    });
  }

  // Validate timeout is a positive number
  if (
    config.requestTimeout &&
    (typeof config.requestTimeout !== 'number' || config.requestTimeout <= 0)
  ) {
    throw MCPErrorFactory.configuration('Request timeout must be a positive number', {
      provided: config.requestTimeout,
      environmentVariable: 'DEEPSOURCE_REQUEST_TIMEOUT',
    });
  }

  return config as DeepSourceConfig;
}

/**
 * Loads configuration from environment variables
 */
function loadConfigFromEnv(): Partial<DeepSourceConfig> {
  const config: Partial<DeepSourceConfig> = {};

  if (process.env.DEEPSOURCE_API_KEY) {
    config.apiKey = process.env.DEEPSOURCE_API_KEY;
  }

  if (process.env.DEEPSOURCE_API_BASE_URL) {
    config.apiBaseUrl = process.env.DEEPSOURCE_API_BASE_URL;
  }

  if (process.env.DEEPSOURCE_REQUEST_TIMEOUT) {
    config.requestTimeout = parseInt(process.env.DEEPSOURCE_REQUEST_TIMEOUT, 10);
  }

  if (process.env.LOG_FILE) {
    config.logFile = process.env.LOG_FILE;
  }

  if (process.env.LOG_LEVEL) {
    config.logLevel = process.env.LOG_LEVEL;
  }

  return config;
}

/**
 * Gets the current configuration
 * @returns The validated configuration
 * @throws MCPError if configuration is invalid
 */
export function getConfig(): DeepSourceConfig {
  const envConfig = loadConfigFromEnv();

  // Load retry configuration
  const retryConfig = loadRetryConfig();
  try {
    validateRetryConfig(retryConfig);
  } catch (error) {
    throw MCPErrorFactory.configuration(`Invalid retry configuration: ${error}`, {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Merge with defaults
  const mergedConfig = {
    ...defaultConfig,
    ...Object.fromEntries(Object.entries(envConfig).filter(([, value]) => value !== undefined)),
    retry: retryConfig,
  };

  logger.debug('Loading configuration', {
    hasApiKey: Boolean(mergedConfig.apiKey),
    apiBaseUrl: mergedConfig.apiBaseUrl,
    requestTimeout: mergedConfig.requestTimeout,
    logLevel: mergedConfig.logLevel,
    retryConfig,
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
 * @throws MCPError if API key is not set
 */
export function getApiKey(): string {
  const config = getConfig();
  return config.apiKey;
}
