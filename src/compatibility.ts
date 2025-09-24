/**
 * @fileoverview Backward compatibility layer for deprecated functions
 *
 * This module provides backward compatibility for code that uses
 * deprecated functions from older versions of the DeepSource MCP Server.
 *
 * @deprecated This entire module is deprecated and will be removed in v2.0.0
 * Please migrate to the new APIs as documented in MIGRATION.md
 *
 * @packageDocumentation
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolRegistry } from './server/tool-registry.js';
import { registerDeepSourceTools } from './server/tool-registration.js';
import type { BaseHandlerDeps } from './handlers/base/handler.interface.js';
import { createDefaultHandlerDeps } from './handlers/base/handler.factory.js';
import { createLogger } from './utils/logging/logger.js';

const logger = createLogger('Compatibility');

/**
 * Validates that required environment variables are set
 * @deprecated Use getConfig() from config/index.js instead
 * @returns true if environment is valid, false otherwise
 */
export function validateEnvironment(): boolean {
  logger.warn(
    'DEPRECATED: validateEnvironment() is deprecated. ' +
      'Please use getConfig() from config/index.js instead. ' +
      'This function will be removed in the next major version.'
  );

  const apiKey = process.env.DEEPSOURCE_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    logger.error('DEEPSOURCE_API_KEY environment variable is not set or is empty');
    return false;
  }

  return true;
}

/**
 * Creates and configures a tool registry with all DeepSource tools
 * @deprecated Use DeepSourceMCPServer.create() from server/mcp-server.js instead
 * @param server - The MCP server instance
 * @param handlerDeps - Optional custom handler dependencies
 * @returns Configured tool registry
 */
export function createAndConfigureToolRegistry(
  server: McpServer,
  handlerDeps?: BaseHandlerDeps
): ToolRegistry {
  logger.warn(
    'DEPRECATED: createAndConfigureToolRegistry() is deprecated. ' +
      'Please use DeepSourceMCPServer.create() from server/mcp-server.js instead. ' +
      'This function will be removed in the next major version.'
  );

  // Create dependencies if not provided
  const deps = handlerDeps || createDefaultHandlerDeps();

  // Create registry with dependencies
  const registry = new ToolRegistry(server, deps);

  try {
    // Register all DeepSource tools using the standard registration
    registerDeepSourceTools(registry);
    logger.info('Successfully registered DeepSource tools in compatibility mode');
  } catch (error) {
    logger.error('Failed to register tools:', error);
    // Don't throw - return the registry even if registration fails
  }

  return registry;
}