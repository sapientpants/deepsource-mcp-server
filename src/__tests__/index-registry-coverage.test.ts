/**
 * @fileoverview Focused tests to improve index-registry.ts coverage
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Set up environment before any imports
process.env.DEEPSOURCE_API_KEY = 'test-api-key';

// Mock dependencies
vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: vi.fn().mockImplementation(() => ({
    registerTool: vi.fn(),
    connect: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn(),
}));

vi.mock('../utils/logging/logger.js', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
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

vi.mock('../server/tool-registry.js', () => ({
  ToolRegistry: vi.fn().mockImplementation(() => {
    // Create a new instance-specific tools object
    const instanceTools: Record<string, RegisteredTool> = {};

    return {
      registerTool: vi.fn((tool) => {
        instanceTools[tool.name] = tool;
        // Also store globally for test access
        registeredTools[tool.name] = tool;
      }),
      getToolNames: vi.fn(() => Object.keys(instanceTools)),
    };
  }),
}));

// Mock adapters - they just pass through params
vi.mock('../adapters/handler-adapters.js', () => ({
  adaptQualityMetricsParams: vi.fn((p) => p),
  adaptUpdateMetricThresholdParams: vi.fn((p) => p),
  adaptUpdateMetricSettingParams: vi.fn((p) => p),
  adaptComplianceReportParams: vi.fn((p) => p),
  adaptProjectIssuesParams: vi.fn((p) => p),
  adaptDependencyVulnerabilitiesParams: vi.fn((p) => p),
  adaptProjectRunsParams: vi.fn((p) => p),
  adaptRunParams: vi.fn((p) => p),
  adaptRecentRunIssuesParams: vi.fn((p) => p),
}));

// Mock handlers
const mockHandlers = {
  handleProjects: vi.fn().mockResolvedValue({ content: [] }),
  handleDeepsourceQualityMetrics: vi.fn().mockResolvedValue({ content: [] }),
  handleDeepsourceUpdateMetricThreshold: vi.fn().mockResolvedValue({ content: [] }),
  handleDeepsourceUpdateMetricSetting: vi.fn().mockResolvedValue({ content: [] }),
  handleDeepsourceComplianceReport: vi.fn().mockResolvedValue({ content: [] }),
  handleDeepsourceProjectIssues: vi.fn().mockResolvedValue({ content: [] }),
  handleDeepsourceDependencyVulnerabilities: vi.fn().mockResolvedValue({ content: [] }),
  handleDeepsourceProjectRuns: vi.fn().mockResolvedValue({ content: [] }),
  handleDeepsourceRun: vi.fn().mockResolvedValue({ content: [] }),
  handleDeepsourceRecentRunIssues: vi.fn().mockResolvedValue({ content: [] }),
};

vi.mock('../handlers/index.js', () => mockHandlers);

describe('Index Registry Coverage Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset registered tools
    registeredTools = {};
  });

  afterEach(() => {
    vi.resetModules();
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
