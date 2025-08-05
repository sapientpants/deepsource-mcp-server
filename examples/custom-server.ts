/**
 * @fileoverview Example of creating a custom DeepSource MCP server
 * 
 * This example demonstrates how to use the modular MCP server to create
 * a custom server with specific configuration and additional tools.
 */

import { DeepSourceMCPServer } from '../src/server/mcp-server.js';
import { ToolDefinition } from '../src/server/tool-registry.js';
import { z } from 'zod';
import { createLogger } from '../src/utils/logging/logger.js';

const logger = createLogger('CustomServer');

/**
 * Example custom tool that demonstrates how to add additional tools
 * to the DeepSource MCP server.
 */
const customHealthCheckTool: ToolDefinition = {
  name: 'health_check',
  description: 'Check the health status of the DeepSource MCP server',
  outputSchema: z.object({
    status: z.enum(['healthy', 'degraded', 'unhealthy']),
    timestamp: z.string(),
    version: z.string(),
    registeredTools: z.array(z.string()),
    apiKeyConfigured: z.boolean(),
  }),
  handler: async () => {
    const apiKeyConfigured = Boolean(process.env.DEEPSOURCE_API_KEY);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            status: apiKeyConfigured ? 'healthy' : 'degraded',
            timestamp: new Date().toISOString(),
            version: '1.2.0',
            registeredTools: [], // Will be populated by the server
            apiKeyConfigured,
          }),
        },
      ],
      isError: false,
    };
  },
};

/**
 * Creates a custom DeepSource MCP server with additional configuration
 */
async function createCustomServer() {
  logger.info('Creating custom DeepSource MCP server');

  // Create server with custom configuration
  const server = await DeepSourceMCPServer.create({
    name: 'custom-deepsource-server',
    version: '1.0.0',
    autoRegisterTools: true, // Register default DeepSource tools
    autoStart: false, // We'll start it manually
  });

  // Get the tool registry to add custom tools
  const registry = server.getToolRegistry();

  // Register the custom health check tool
  registry.registerTool(customHealthCheckTool);
  logger.info('Registered custom health check tool');

  // Update the health check handler to include actual registered tools
  const originalHandler = customHealthCheckTool.handler;
  customHealthCheckTool.handler = async (params) => {
    const result = await originalHandler(params);
    if (result.content?.[0]?.type === 'text') {
      const data = JSON.parse(result.content[0].text);
      data.registeredTools = server.getRegisteredTools();
      result.content[0].text = JSON.stringify(data);
    }
    return result;
  };

  // Log all registered tools
  const tools = server.getRegisteredTools();
  logger.info(`Server has ${tools.length} registered tools:`, tools);

  return server;
}

/**
 * Example of using the custom server programmatically
 */
async function useCustomServer() {
  const server = await createCustomServer();
  
  // Example: Get the MCP server instance for direct access
  const mcpServer = server.getMcpServer();
  logger.info('MCP server instance obtained', { name: mcpServer.name });

  // Example: Check if specific tools are registered
  const registry = server.getToolRegistry();
  const hasHealthCheck = registry.hasTool('health_check');
  const hasProjects = registry.hasTool('projects');
  logger.info('Tool availability', { hasHealthCheck, hasProjects });

  // Example: Get tool metadata
  const healthCheckTool = registry.getTool('health_check');
  if (healthCheckTool) {
    logger.info('Health check tool info', {
      name: healthCheckTool.name,
      description: healthCheckTool.description,
    });
  }

  return server;
}

// Main entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  logger.info('Starting custom DeepSource MCP server example');
  
  useCustomServer()
    .then(async (server) => {
      // Start the server
      await server.start();
      logger.info('Custom server started successfully');
    })
    .catch((error) => {
      logger.error('Failed to start custom server', error);
      process.exit(1);
    });
}

// Export for use in other modules
export { createCustomServer, customHealthCheckTool };
