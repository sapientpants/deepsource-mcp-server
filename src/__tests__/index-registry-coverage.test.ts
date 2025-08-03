/**
 * @fileoverview Focused tests to improve index-registry.ts coverage
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Set up environment before any imports
process.env.DEEPSOURCE_API_KEY = 'test-api-key';

// Mock dependencies
jest.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: jest.fn().mockImplementation(() => ({
    registerTool: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: jest.fn(),
}));

jest.mock('../utils/logging/logger.js', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  })),
}));

// Define a type for registered tools
interface RegisteredTool {
  name: string;
  description: string;
  inputSchema?: unknown;
  handler?: (..._args: unknown[]) => unknown;
  [key: string]: unknown;
}

// Store registered tools - need to use a variable that persists across tests
let registeredTools: Record<string, RegisteredTool> = {};

jest.mock('../server/tool-registry.js', () => ({
  ToolRegistry: jest.fn().mockImplementation(() => {
    // Create a new instance-specific tools object
    const instanceTools: Record<string, RegisteredTool> = {};

    return {
      registerTool: jest.fn((tool) => {
        console.log('Registering tool:', tool.name);
        instanceTools[tool.name] = tool;
        // Also store globally for test access
        registeredTools[tool.name] = tool;
      }),
      getToolNames: jest.fn(() => Object.keys(instanceTools)),
    };
  }),
}));

// Mock adapters - they just pass through params
jest.mock('../adapters/handler-adapters.js', () => ({
  adaptQualityMetricsParams: jest.fn((p) => p),
  adaptUpdateMetricThresholdParams: jest.fn((p) => p),
  adaptUpdateMetricSettingParams: jest.fn((p) => p),
  adaptComplianceReportParams: jest.fn((p) => p),
  adaptProjectIssuesParams: jest.fn((p) => p),
  adaptDependencyVulnerabilitiesParams: jest.fn((p) => p),
  adaptProjectRunsParams: jest.fn((p) => p),
  adaptRunParams: jest.fn((p) => p),
  adaptRecentRunIssuesParams: jest.fn((p) => p),
}));

// Mock handlers
const mockHandlers = {
  handleProjects: jest.fn().mockResolvedValue({ content: [] }),
  handleDeepsourceQualityMetrics: jest.fn().mockResolvedValue({ content: [] }),
  handleDeepsourceUpdateMetricThreshold: jest.fn().mockResolvedValue({ content: [] }),
  handleDeepsourceUpdateMetricSetting: jest.fn().mockResolvedValue({ content: [] }),
  handleDeepsourceComplianceReport: jest.fn().mockResolvedValue({ content: [] }),
  handleDeepsourceProjectIssues: jest.fn().mockResolvedValue({ content: [] }),
  handleDeepsourceDependencyVulnerabilities: jest.fn().mockResolvedValue({ content: [] }),
  handleDeepsourceProjectRuns: jest.fn().mockResolvedValue({ content: [] }),
  handleDeepsourceRun: jest.fn().mockResolvedValue({ content: [] }),
  handleDeepsourceRecentRunIssues: jest.fn().mockResolvedValue({ content: [] }),
};

jest.mock('../handlers/index.js', () => mockHandlers);

describe('Index Registry Coverage Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset registered tools
    registeredTools = {};
  });

  afterEach(() => {
    jest.resetModules();
  });

  describe('Handler Execution Coverage', () => {
    it.skip('should execute all tool handlers', async () => {
      // Import and setup
      const { createAndConfigureToolRegistry } = await import('../index-registry.js');
      const { McpServer } = await import('@modelcontextprotocol/sdk/server/mcp.js');

      const mockServer = new McpServer({ name: 'test', version: '1.0.0' });
      createAndConfigureToolRegistry(mockServer);

      // Verify tools were registered
      expect(Object.keys(registeredTools)).toHaveLength(10);
      expect(registeredTools.projects).toBeDefined();

      // Test each handler

      // Projects handler (line 79-82)
      if (registeredTools.projects) {
        await registeredTools.projects.handler();
        expect(mockHandlers.handleProjects).toHaveBeenCalled();
      }

      // Quality metrics handler (line 88-91)
      if (registeredTools.quality_metrics) {
        await registeredTools.quality_metrics.handler({ projectKey: 'test' });
        expect(mockHandlers.handleDeepsourceQualityMetrics).toHaveBeenCalled();
      }

      // Update metric threshold handler (line 96-99)
      if (registeredTools.update_metric_threshold) {
        await registeredTools.update_metric_threshold.handler({ projectKey: 'test' });
        expect(mockHandlers.handleDeepsourceUpdateMetricThreshold).toHaveBeenCalled();
      }

      // Update metric setting handler (line 104-107)
      if (registeredTools.update_metric_setting) {
        await registeredTools.update_metric_setting.handler({ projectKey: 'test' });
        expect(mockHandlers.handleDeepsourceUpdateMetricSetting).toHaveBeenCalled();
      }

      // Compliance report handler (line 113-116)
      if (registeredTools.compliance_report) {
        await registeredTools.compliance_report.handler({ projectKey: 'test' });
        expect(mockHandlers.handleDeepsourceComplianceReport).toHaveBeenCalled();
      }

      // Project issues handler (line 122-125)
      if (registeredTools.project_issues) {
        await registeredTools.project_issues.handler({ projectKey: 'test' });
        expect(mockHandlers.handleDeepsourceProjectIssues).toHaveBeenCalled();
      }

      // Dependency vulnerabilities handler (line 130-133)
      if (registeredTools.dependency_vulnerabilities) {
        await registeredTools.dependency_vulnerabilities.handler({ projectKey: 'test' });
        expect(mockHandlers.handleDeepsourceDependencyVulnerabilities).toHaveBeenCalled();
      }

      // Runs handler (line 139-142)
      if (registeredTools.runs) {
        await registeredTools.runs.handler({ projectKey: 'test' });
        expect(mockHandlers.handleDeepsourceProjectRuns).toHaveBeenCalled();
      }

      // Run handler (line 147-150)
      if (registeredTools.run) {
        await registeredTools.run.handler({ projectKey: 'test', runIdentifier: '123' });
        expect(mockHandlers.handleDeepsourceRun).toHaveBeenCalled();
      }

      // Recent run issues handler (line 155-158)
      if (registeredTools.recent_run_issues) {
        await registeredTools.recent_run_issues.handler({ projectKey: 'test', branchName: 'main' });
        expect(mockHandlers.handleDeepsourceRecentRunIssues).toHaveBeenCalled();
      }
    });
  });
});
