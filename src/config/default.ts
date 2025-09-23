/**
 * @fileoverview Default configuration values for the DeepSource MCP server
 *
 * This module centralizes all default configuration values, providing
 * a single source of truth for server settings and constants.
 *
 * @packageDocumentation
 */

import { VERSION } from '../version.js';

/**
 * Server configuration interface
 */
export interface ServerConfig {
  /** Server name */
  name: string;
  /** Server version */
  version: string;
  /** Whether to auto-register DeepSource tools */
  autoRegisterTools: boolean;
  /** Whether to start the server immediately */
  autoStart: boolean;
  /** Log level for the server */
  logLevel: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  /** Path to log file (optional) */
  logFile?: string;
}

/**
 * Default server configuration
 */
export const DEFAULT_SERVER_CONFIG: ServerConfig = {
  name: 'deepsource-mcp-server',
  version: VERSION,
  autoRegisterTools: true,
  autoStart: false,
  logLevel: 'INFO',
};

/**
 * API configuration interface
 */
export interface ApiConfig {
  /** DeepSource API base URL */
  baseUrl: string;
  /** Request timeout in milliseconds */
  timeout: number;
  /** Maximum number of retries for failed requests */
  maxRetries: number;
  /** Base delay for retry backoff in milliseconds */
  retryBaseDelay: number;
}

/**
 * Default API configuration
 */
export const DEFAULT_API_CONFIG: ApiConfig = {
  baseUrl: 'https://api.deepsource.io/graphql',
  timeout: 30000,
  maxRetries: 3,
  retryBaseDelay: 1000,
};

/**
 * Tool discovery configuration interface
 */
export interface DiscoveryConfig {
  /** Directories to scan for tools */
  directories: string[];
  /** File patterns to match */
  patterns: string[];
  /** Enable recursive scanning */
  recursive: boolean;
  /** Tool categories to include */
  includeCategories: string[];
  /** Tool categories to exclude */
  excludeCategories: string[];
  /** Tool tags to include */
  includeTags: string[];
  /** Tool tags to exclude */
  excludeTags: string[];
}

/**
 * Default tool discovery configuration
 */
export const DEFAULT_DISCOVERY_CONFIG: DiscoveryConfig = {
  directories: ['./src/tools', './plugins'],
  patterns: ['*.tool.js', '*.tool.mjs'],
  recursive: true,
  includeCategories: [],
  excludeCategories: [],
  includeTags: [],
  excludeTags: ['deprecated', 'experimental'],
};

/**
 * Environment-specific discovery configuration
 */
export const DISCOVERY_CONFIG_BY_ENV: Record<string, Partial<DiscoveryConfig>> = {
  production: {
    excludeTags: ['deprecated', 'experimental', 'development', 'test'],
    includeCategories: ['core', 'analytics', 'security', 'compliance'],
  },
  development: {
    excludeTags: ['deprecated'],
    directories: ['./src/tools', './plugins', './src/tools/dev'],
  },
  test: {
    directories: ['./src/tools/test'],
    excludeTags: [],
  },
};

/**
 * Tool categories enum
 */
export enum ToolCategory {
  CORE = 'core',
  ANALYTICS = 'analytics',
  SECURITY = 'security',
  COMPLIANCE = 'compliance',
  UTILITIES = 'utilities',
  DEVELOPMENT = 'development',
  EXPERIMENTAL = 'experimental',
}

/**
 * Tool tags enum
 */
export enum ToolTag {
  STABLE = 'stable',
  BETA = 'beta',
  ALPHA = 'alpha',
  DEPRECATED = 'deprecated',
  EXPERIMENTAL = 'experimental',
  DEVELOPMENT = 'development',
  TEST = 'test',
}

/**
 * Get configuration for the current environment
 *
 * @param env - Environment name (defaults to NODE_ENV or 'development')
 * @returns Merged configuration for the environment
 */
export function getEnvironmentConfig(env?: string): {
  server: ServerConfig;
  api: ApiConfig;
  discovery: DiscoveryConfig;
} {
  const environment = env || process.env.NODE_ENV || 'development';

  return {
    server: DEFAULT_SERVER_CONFIG,
    api: DEFAULT_API_CONFIG,
    discovery: {
      ...DEFAULT_DISCOVERY_CONFIG,
      ...(DISCOVERY_CONFIG_BY_ENV[environment] || {}),
    },
  };
}

/**
 * Validation thresholds for configuration
 */
export const CONFIG_VALIDATION = {
  /** Minimum timeout in milliseconds */
  MIN_TIMEOUT: 1000,
  /** Maximum timeout in milliseconds */
  MAX_TIMEOUT: 300000,
  /** Minimum retry attempts */
  MIN_RETRIES: 0,
  /** Maximum retry attempts */
  MAX_RETRIES: 10,
  /** Valid log levels */
  VALID_LOG_LEVELS: ['DEBUG', 'INFO', 'WARN', 'ERROR'] as const,
};

/**
 * Validate server configuration
 *
 * @param config - Configuration to validate
 * @throws Error if configuration is invalid
 */
export function validateServerConfig(config: Partial<ServerConfig>): void {
  if (config.logLevel && !CONFIG_VALIDATION.VALID_LOG_LEVELS.includes(config.logLevel)) {
    throw new Error(`Invalid log level: ${config.logLevel}`);
  }

  if (config.name && config.name.trim().length === 0) {
    throw new Error('Server name cannot be empty');
  }
}

/**
 * Validate API configuration
 *
 * @param config - Configuration to validate
 * @throws Error if configuration is invalid
 */
export function validateApiConfig(config: Partial<ApiConfig>): void {
  if (config.timeout !== undefined) {
    if (
      config.timeout < CONFIG_VALIDATION.MIN_TIMEOUT ||
      config.timeout > CONFIG_VALIDATION.MAX_TIMEOUT
    ) {
      throw new Error(
        `Timeout must be between ${CONFIG_VALIDATION.MIN_TIMEOUT} and ${CONFIG_VALIDATION.MAX_TIMEOUT}`
      );
    }
  }

  if (config.maxRetries !== undefined) {
    if (
      config.maxRetries < CONFIG_VALIDATION.MIN_RETRIES ||
      config.maxRetries > CONFIG_VALIDATION.MAX_RETRIES
    ) {
      throw new Error(
        `Max retries must be between ${CONFIG_VALIDATION.MIN_RETRIES} and ${CONFIG_VALIDATION.MAX_RETRIES}`
      );
    }
  }

  if (config.baseUrl && !config.baseUrl.startsWith('http')) {
    throw new Error('API base URL must start with http:// or https://');
  }
}
