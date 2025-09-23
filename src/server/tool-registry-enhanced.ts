/**
 * @fileoverview Enhanced tool registry with automatic discovery and plugin support
 *
 * @deprecated This file is deprecated. All functionality has been merged into
 * the main ToolRegistry class and can be enabled via the FEATURE_TOOL_DISCOVERY
 * environment variable. Please use ToolRegistry from tool-registry.ts instead.
 *
 * Migration guide:
 * - Import ToolRegistry from './tool-registry.js' instead of EnhancedToolRegistry
 * - Set FEATURE_TOOL_DISCOVERY=true to enable discovery features
 * - All methods are available in the base ToolRegistry when the feature flag is enabled
 * - See MIGRATION.md for detailed migration instructions
 *
 * @packageDocumentation
 */

import { createLogger } from '../utils/logging/logger.js';

const logger = createLogger('EnhancedToolRegistry-Deprecated');

// Log deprecation warning immediately
logger.warn(
  'DEPRECATED: EnhancedToolRegistry is deprecated and will be removed in the next major version. ' +
    'All functionality has been merged into ToolRegistry with FEATURE_TOOL_DISCOVERY flag. ' +
    'Please migrate to using ToolRegistry from tool-registry.ts'
);

// Re-export ToolRegistry as EnhancedToolRegistry for backward compatibility
export {
  ToolRegistry as EnhancedToolRegistry,
  type ToolDefinition as EnhancedToolDefinition,
  type ToolMetadata,
  type ToolDiscoveryOptions,
} from './tool-registry.js';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolRegistry } from './tool-registry.js';
import type { BaseHandlerDeps } from '../handlers/base/handler.interface.js';

/**
 * Creates an enhanced tool registry with discovery capabilities
 * @deprecated Use new ToolRegistry() with FEATURE_TOOL_DISCOVERY=true instead
 */
export function createEnhancedToolRegistry(
  server: McpServer,
  defaultDeps?: BaseHandlerDeps
): ToolRegistry {
  // eslint-disable-next-line no-console
  console.warn(
    '\n⚠️  WARNING: createEnhancedToolRegistry is deprecated.\n' +
      'Use new ToolRegistry() with FEATURE_TOOL_DISCOVERY=true instead.\n' +
      'This function will be removed in the next major version.\n'
  );

  return new ToolRegistry(server, defaultDeps);
}
