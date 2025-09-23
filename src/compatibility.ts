/**
 * @fileoverview Compatibility layer for modules that import from index-registry
 *
 * This module provides backward compatibility for code that imports from
 * the old index-registry.ts entry point. It redirects to the consolidated
 * implementation in index.ts.
 *
 * @deprecated This module is provided for backward compatibility only.
 * New code should import directly from index.ts
 *
 * @packageDocumentation
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
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
import { createLogger } from './utils/logging/logger.js';

const logger = createLogger('Compatibility');

/**
 * Validates environment configuration
 * @deprecated Use getConfig from config/index.js instead
 */
export function validateEnvironment() {
  logger.warn(
    'DEPRECATED: validateEnvironment() is deprecated. ' +
      'Please use getConfig() from config/index.js instead. ' +
      'This function will be removed in the next major version.'
  );

  if (!process.env.DEEPSOURCE_API_KEY) {
    const errorMsg = 'DEEPSOURCE_API_KEY environment variable is required';
    logger.error(errorMsg);
    process.exit(1);
  }
  logger.info('Environment validated', { hasApiKey: true });
}

/**
 * Creates and configures the tool registry with all handlers
 * @deprecated Use DeepSourceMCPServer from index.ts instead
 */
export function createAndConfigureToolRegistry(server: McpServer) {
  logger.warn(
    'DEPRECATED: createAndConfigureToolRegistry() is deprecated. ' +
      'Please use DeepSourceMCPServer from index.ts instead. ' +
      'This function will be removed in the next major version.'
  );

  const toolRegistry = new ToolRegistry(server);

  // Register project listing tool
  toolRegistry.registerTool({
    ...projectsToolSchema,
    handler: async () => {
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

  logger.info('Tool registry configured (compatibility mode)', {
    toolCount: toolRegistry.getToolNames().length,
    tools: toolRegistry.getToolNames(),
  });

  return toolRegistry;
}
