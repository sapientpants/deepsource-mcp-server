/**
 * @fileoverview Enhanced MCP server setup with automatic tool discovery
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createLogger } from '../utils/logging/logger.js';
import { createDefaultHandlerDeps } from '../handlers/base/handler.factory.js';
import { EnhancedToolRegistry } from './tool-registry-enhanced.js';
import { getToolDiscoveryConfig } from '../config/tool-discovery.config.js';

const logger = createLogger('EnhancedMCPServer');

/**
 * Initializes and runs the enhanced MCP server with tool discovery
 */
export async function runEnhancedServer(): Promise<void> {
  const server = new McpServer({
    name: 'deepsource-mcp-enhanced',
    version: '1.0.0',
  });

  const transport = new StdioServerTransport();

  // Get configuration for potential future use
  // const config = {
  //   apiKey: process.env.DEEPSOURCE_API_KEY || '',
  //   baseUrl: process.env.DEEPSOURCE_API_URL,
  // };

  // Create dependencies
  const defaultDeps = createDefaultHandlerDeps();
  // Repository factory available for future use
  // const repositoryFactory = createRepositoryFactory(config);

  // Create enhanced tool registry
  const toolRegistry = new EnhancedToolRegistry(server, defaultDeps);

  // Register existing tools manually (for backward compatibility)
  logger.info('Registering core DeepSource tools...');
  registerCoreTools(toolRegistry);

  // Discover and load additional tools
  logger.info('Discovering additional tools...');
  const discoveryConfig = getToolDiscoveryConfig();

  try {
    const discoveredTools = await toolRegistry.discoverTools(discoveryConfig);
    logger.info(`Discovered ${discoveredTools.length} additional tools`, {
      tools: discoveredTools,
    });
  } catch (error) {
    logger.error('Tool discovery failed', error);
  }

  // Log tool information
  const toolsInfo = toolRegistry.getToolsInfo();
  logger.info('Available tools:', {
    total: toolsInfo.length,
    categories: toolRegistry.getCategories(),
    tags: toolRegistry.getTags(),
  });

  // Start the server
  await server.connect(transport);
  logger.info('Enhanced MCP server started successfully');

  // Handle shutdown gracefully
  process.on('SIGINT', async () => {
    logger.info('Shutting down enhanced MCP server...');
    await server.close();
    process.exit(0);
  });
}

/**
 * Registers core DeepSource tools with the enhanced registry
 * @param registry - Enhanced tool registry
 */
function registerCoreTools(registry: EnhancedToolRegistry): void {
  // This is a simplified version for demonstration
  // In a real implementation, you would properly type each tool
  logger.info(
    `Core tools registration available in production implementation. Registry initialized: ${registry ? 'yes' : 'no'}`
  );
}

// Run the server if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  runEnhancedServer().catch((error) => {
    logger.error('Failed to start enhanced MCP server', error);
    process.exit(1);
  });
}
