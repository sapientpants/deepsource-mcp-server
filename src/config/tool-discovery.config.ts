/**
 * @fileoverview Configuration for tool discovery and management
 */

import { ToolDiscoveryOptions } from '../server/tool-registry-enhanced.js';

/**
 * Default tool discovery configuration
 */
export const defaultToolDiscoveryConfig: ToolDiscoveryOptions = {
  // Directories to scan for tools
  directories: ['./src/tools', './plugins'],

  // File patterns to match
  patterns: ['*.tool.js', '*.tool.mjs', '*.plugin.js'],

  // Enable recursive scanning
  recursive: true,

  // Category filters (empty means include all)
  includeCategories: [],
  excludeCategories: [],

  // Tag filters (empty means include all)
  includeTags: [],
  excludeTags: ['deprecated', 'experimental'],
};

/**
 * Production tool discovery configuration
 */
export const productionToolDiscoveryConfig: ToolDiscoveryOptions = {
  ...defaultToolDiscoveryConfig,

  // In production, exclude experimental and development tools
  excludeTags: ['deprecated', 'experimental', 'development', 'test'],

  // Only include stable categories
  includeCategories: ['core', 'analytics', 'security', 'compliance'],
};

/**
 * Development tool discovery configuration
 */
export const developmentToolDiscoveryConfig: ToolDiscoveryOptions = {
  ...defaultToolDiscoveryConfig,

  // In development, include all tools except deprecated
  excludeTags: ['deprecated'],

  // Additional development directories
  directories: ['./src/tools', './plugins', './src/tools/dev'],
};

/**
 * Get tool discovery configuration based on environment
 * @returns Tool discovery configuration
 */
export function getToolDiscoveryConfig(): ToolDiscoveryOptions {
  const env = process.env.NODE_ENV || 'development';

  switch (env) {
    case 'production':
      return productionToolDiscoveryConfig;
    case 'development':
      return developmentToolDiscoveryConfig;
    default:
      return defaultToolDiscoveryConfig;
  }
}

/**
 * Tool category definitions
 */
export const TOOL_CATEGORIES = {
  CORE: 'core',
  ANALYTICS: 'analytics',
  SECURITY: 'security',
  COMPLIANCE: 'compliance',
  UTILITIES: 'utilities',
  INTEGRATION: 'integration',
  MONITORING: 'monitoring',
} as const;

/**
 * Tool tag definitions
 */
export const TOOL_TAGS = {
  STABLE: 'stable',
  BETA: 'beta',
  EXPERIMENTAL: 'experimental',
  DEPRECATED: 'deprecated',
  DEVELOPMENT: 'development',
  TEST: 'test',
  FAST: 'fast',
  SLOW: 'slow',
  REQUIRES_AUTH: 'requires-auth',
} as const;

/**
 * Tool versioning scheme
 */
export interface ToolVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
}

/**
 * Parse tool version string
 * @param version - Version string (e.g., "1.2.3-beta")
 * @returns Parsed version object
 */
export function parseToolVersion(version: string): ToolVersion {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
  if (!match) {
    throw new Error(`Invalid version format: ${version}`);
  }

  const result: ToolVersion = {
    major: parseInt(match[1] ?? '0', 10),
    minor: parseInt(match[2] ?? '0', 10),
    patch: parseInt(match[3] ?? '0', 10),
  };

  if (match[4]) {
    result.prerelease = match[4];
  }

  return result;
}

/**
 * Compare tool versions
 * @param a - First version
 * @param b - Second version
 * @returns -1 if a < b, 0 if a === b, 1 if a > b
 */
export function compareToolVersions(a: ToolVersion, b: ToolVersion): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  if (a.patch !== b.patch) return a.patch - b.patch;

  // Handle prerelease versions
  if (a.prerelease && !b.prerelease) return -1;
  if (!a.prerelease && b.prerelease) return 1;
  if (a.prerelease && b.prerelease) {
    return a.prerelease.localeCompare(b.prerelease);
  }

  return 0;
}
