#!/usr/bin/env node

/**
 * @fileoverview Main entry point for the DeepSource MCP server using ToolRegistry
 *
 * This implementation uses the domain-driven architecture with repository pattern
 * and type adapters to bridge between MCP tool schemas and domain handlers.
 */

import process from 'node:process';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createLogger } from './utils/logging/logger.js';
// import { RepositoryFactory } from './infrastructure/factories/repository.factory.js';
import { ToolRegistry } from './server/tool-registry.js';
import {
  adaptQualityMetricsParams,
  adaptUpdateMetricThresholdParams,
  adaptUpdateMetricSettingParams,
  adaptComplianceReportParams,
  adaptProjectIssuesParams,
  adaptDependencyVulnerabilitiesParams,
  adaptProjectRunsParams,
  adaptRunParams,
  adaptRecentRunIssuesParams,
} from './adapters/handler-adapters.js';
import {
  handleProjects,
  handleDeepsourceQualityMetrics,
  handleDeepsourceUpdateMetricThreshold,
  handleDeepsourceUpdateMetricSetting,
  handleDeepsourceComplianceReport,
  handleDeepsourceProjectIssues,
  handleDeepsourceDependencyVulnerabilities,
  handleDeepsourceProjectRuns,
  handleDeepsourceRun,
  handleDeepsourceRecentRunIssues,
} from './handlers/index.js';
import {
  projectsToolSchema,
  qualityMetricsToolSchema,
  updateMetricThresholdToolSchema,
  updateMetricSettingToolSchema,
  complianceReportToolSchema,
  projectIssuesToolSchema,
  dependencyVulnerabilitiesToolSchema,
  runsToolSchema,
  runToolSchema,
  recentRunIssuesToolSchema,
} from './server/tool-definitions.js';

// Environment variables are handled by the getApiKey function in config

// Module logger
const logger = createLogger('Main');

/**
 * Validates environment configuration
 */
export function validateEnvironment(): void {
  if (!process.env.DEEPSOURCE_API_KEY) {
    const errorMsg = 'DEEPSOURCE_API_KEY environment variable is required';
    logger.error(errorMsg);
    process.exit(1);
  }
  logger.info('Environment validated', { hasApiKey: true });
}

/**
 * Creates and configures the tool registry with all handlers
 */
export function createAndConfigureToolRegistry(server: McpServer): ToolRegistry {
  const toolRegistry = new ToolRegistry(server);

  // Register project listing tool
  toolRegistry.registerTool({
    ...projectsToolSchema,
    handler: async () => {
      // No adaptation needed - no parameters
      return handleProjects();
    },
  });

  // Register quality metrics tools
  toolRegistry.registerTool({
    ...qualityMetricsToolSchema,
    handler: async (params) => {
      const adaptedParams = adaptQualityMetricsParams(params);
      return handleDeepsourceQualityMetrics(adaptedParams);
    },
  });

  toolRegistry.registerTool({
    ...updateMetricThresholdToolSchema,
    handler: async (params) => {
      const adaptedParams = adaptUpdateMetricThresholdParams(params);
      return handleDeepsourceUpdateMetricThreshold(adaptedParams);
    },
  });

  toolRegistry.registerTool({
    ...updateMetricSettingToolSchema,
    handler: async (params) => {
      const adaptedParams = adaptUpdateMetricSettingParams(params);
      return handleDeepsourceUpdateMetricSetting(adaptedParams);
    },
  });

  // Register compliance report tool
  toolRegistry.registerTool({
    ...complianceReportToolSchema,
    handler: async (params) => {
      const adaptedParams = adaptComplianceReportParams(params);
      return handleDeepsourceComplianceReport(adaptedParams);
    },
  });

  // Register issue tools
  toolRegistry.registerTool({
    ...projectIssuesToolSchema,
    handler: async (params) => {
      const adaptedParams = adaptProjectIssuesParams(params);
      return handleDeepsourceProjectIssues(adaptedParams);
    },
  });

  toolRegistry.registerTool({
    ...dependencyVulnerabilitiesToolSchema,
    handler: async (params) => {
      const adaptedParams = adaptDependencyVulnerabilitiesParams(params);
      return handleDeepsourceDependencyVulnerabilities(adaptedParams);
    },
  });

  // Register run tools
  toolRegistry.registerTool({
    ...runsToolSchema,
    handler: async (params) => {
      const adaptedParams = adaptProjectRunsParams(params);
      return handleDeepsourceProjectRuns(adaptedParams);
    },
  });

  toolRegistry.registerTool({
    ...runToolSchema,
    handler: async (params) => {
      const adaptedParams = adaptRunParams(params);
      return handleDeepsourceRun(adaptedParams);
    },
  });

  toolRegistry.registerTool({
    ...recentRunIssuesToolSchema,
    handler: async (params) => {
      const adaptedParams = adaptRecentRunIssuesParams(params);
      return handleDeepsourceRecentRunIssues(adaptedParams);
    },
  });

  logger.info('Tool registry configured', {
    toolCount: toolRegistry.getToolNames().length,
    tools: toolRegistry.getToolNames(),
  });

  return toolRegistry;
}

/**
 * Main function that starts the MCP server
 */
export async function main() {
  logger.info('Starting DeepSource MCP Server (Registry Implementation)');

  // Validate environment
  validateEnvironment();

  // Create MCP server
  const server = new McpServer({
    name: 'deepsource-mcp-server',
    version: '1.2.2',
  });

  // Create and configure tool registry
  createAndConfigureToolRegistry(server);

  // Set up transport
  const transport = new StdioServerTransport();
  logger.info('Transport initialized', { type: 'stdio' });

  // Connect server to transport
  await server.connect(transport);
  logger.info('Server connected to transport');

  logger.info('DeepSource MCP Server running (Registry Implementation)');
}

// Handle errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', {
    error: error.message,
    stack: error.stack,
  });
  console.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', {
    reason,
    promise,
  });
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the server
main().catch((error) => {
  logger.error('Failed to start server', {
    error: error.message,
    stack: error.stack,
  });
  console.error('Failed to start server:', error);
  process.exit(1);
});
