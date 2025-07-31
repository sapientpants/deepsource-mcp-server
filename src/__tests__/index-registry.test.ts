/**
 * @fileoverview Integration tests for the registry-based MCP server implementation
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolRegistry } from '../server/tool-registry.js';
import {
  adaptQualityMetricsParams,
  adaptUpdateMetricThresholdParams,
  adaptComplianceReportParams,
  adaptProjectIssuesParams,
} from '../adapters/handler-adapters.js';

// Mock the handlers
jest.mock('../handlers/index.js', () => ({
  handleProjects: jest.fn().mockResolvedValue({
    content: [{ type: 'text', text: JSON.stringify([{ key: 'test', name: 'Test Project' }]) }],
  }),
  handleDeepsourceQualityMetrics: jest.fn().mockResolvedValue({
    content: [{ type: 'text', text: JSON.stringify({ metrics: [] }) }],
  }),
  handleDeepsourceUpdateMetricThreshold: jest.fn().mockResolvedValue({
    content: [{ type: 'text', text: JSON.stringify({ ok: true }) }],
  }),
  handleDeepsourceUpdateMetricSetting: jest.fn().mockResolvedValue({
    content: [{ type: 'text', text: JSON.stringify({ ok: true }) }],
  }),
  handleDeepsourceComplianceReport: jest.fn().mockResolvedValue({
    content: [{ type: 'text', text: JSON.stringify({ report: {} }) }],
  }),
  handleDeepsourceProjectIssues: jest.fn().mockResolvedValue({
    content: [{ type: 'text', text: JSON.stringify({ issues: [] }) }],
  }),
  handleDeepsourceDependencyVulnerabilities: jest.fn().mockResolvedValue({
    content: [{ type: 'text', text: JSON.stringify({ vulnerabilities: [] }) }],
  }),
  handleDeepsourceProjectRuns: jest.fn().mockResolvedValue({
    content: [{ type: 'text', text: JSON.stringify({ runs: [] }) }],
  }),
  handleDeepsourceRun: jest.fn().mockResolvedValue({
    content: [{ type: 'text', text: JSON.stringify({ run: {} }) }],
  }),
  handleDeepsourceRecentRunIssues: jest.fn().mockResolvedValue({
    content: [{ type: 'text', text: JSON.stringify({ issues: [] }) }],
  }),
}));

describe('Index Registry Implementation', () => {
  let mockServer: jest.Mocked<McpServer>;
  let toolRegistry: ToolRegistry;
  let originalEnv: typeof process.env;

  beforeEach(() => {
    jest.clearAllMocks();

    // Save original environment
    originalEnv = process.env;
    process.env = { ...originalEnv, DEEPSOURCE_API_KEY: 'test-api-key' };

    // Create a mock MCP server
    mockServer = {
      registerTool: jest.fn(),
      connect: jest.fn(),
    } as any;

    toolRegistry = new ToolRegistry(mockServer);
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Adapter Functions', () => {
    it('should adapt quality metrics parameters correctly', () => {
      const params = {
        projectKey: 'test-project',
        shortcodeIn: ['LCV', 'BCV'],
      };

      const adapted = adaptQualityMetricsParams(params);
      expect(adapted).toEqual({
        projectKey: 'test-project',
        shortcodeIn: ['LCV', 'BCV'],
      });
    });

    it('should adapt update metric threshold parameters correctly', () => {
      const params = {
        projectKey: 'test-project',
        repositoryId: 'repo123',
        metricShortcode: 'LCV',
        metricKey: 'AGGREGATE',
        thresholdValue: 80,
      };

      const adapted = adaptUpdateMetricThresholdParams(params);
      expect(adapted).toEqual({
        projectKey: 'test-project',
        repositoryId: 'repo123',
        metricShortcode: 'LCV',
        metricKey: 'AGGREGATE',
        thresholdValue: 80,
      });
    });

    it('should adapt compliance report parameters correctly', () => {
      const params = {
        projectKey: 'test-project',
        reportType: 'OWASP_TOP_10',
      };

      const adapted = adaptComplianceReportParams(params);
      expect(adapted).toEqual({
        projectKey: 'test-project',
        reportType: 'OWASP_TOP_10',
      });
    });

    it('should adapt project issues parameters correctly', () => {
      const params = {
        projectKey: 'test-project',
        path: '/src/test.js',
        analyzerIn: ['javascript'],
        first: 50,
      };

      const adapted = adaptProjectIssuesParams(params);
      expect(adapted).toEqual({
        projectKey: 'test-project',
        path: '/src/test.js',
        analyzerIn: ['javascript'],
        first: 50,
      });
    });
  });

  describe('Tool Registration', () => {
    it('should register tools with the MCP server', () => {
      // Register a simple test tool
      toolRegistry.registerTool({
        name: 'test_tool',
        description: 'Test tool',
        handler: async () => ({
          content: [{ type: 'text' as const, text: 'test result' }],
        }),
      });

      expect(mockServer.registerTool).toHaveBeenCalledWith(
        'test_tool',
        { description: 'Test tool' },
        expect.any(Function)
      );
    });

    it('should handle tool execution with adapters', async () => {
      const mockHandler = jest.fn().mockResolvedValue({
        content: [{ type: 'text' as const, text: JSON.stringify({ result: 'success' }) }],
      });

      toolRegistry.registerTool({
        name: 'test_with_adapter',
        description: 'Test tool with adapter',
        handler: mockHandler,
      });

      // Get the registered handler function
      const registeredHandler = mockServer.registerTool.mock.calls[0][2];

      // Call the handler with test parameters
      const result = await registeredHandler({ test: 'param' }, {});

      expect(mockHandler).toHaveBeenCalledWith({ test: 'param' });
      expect(result).toHaveProperty('content');
      expect(result.content[0].text).toBe(JSON.stringify({ result: 'success' }));
    });

    it('should return correct tool names', () => {
      toolRegistry.registerTool({
        name: 'tool1',
        description: 'Tool 1',
        handler: async () => ({ content: [] }),
      });

      toolRegistry.registerTool({
        name: 'tool2',
        description: 'Tool 2',
        handler: async () => ({ content: [] }),
      });

      const toolNames = toolRegistry.getToolNames();
      expect(toolNames).toContain('tool1');
      expect(toolNames).toContain('tool2');
      expect(toolNames).toHaveLength(2);
    });

    it('should check if tool exists', () => {
      toolRegistry.registerTool({
        name: 'existing_tool',
        description: 'Existing tool',
        handler: async () => ({ content: [] }),
      });

      expect(toolRegistry.hasTool('existing_tool')).toBe(true);
      expect(toolRegistry.hasTool('non_existing_tool')).toBe(false);
    });

    it('should handle errors in tool execution', async () => {
      const mockHandler = jest.fn().mockRejectedValue(new Error('Test error'));

      toolRegistry.registerTool({
        name: 'error_tool',
        description: 'Tool that throws error',
        handler: mockHandler,
      });

      const registeredHandler = mockServer.registerTool.mock.calls[0][2];
      const result = await registeredHandler({}, {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Test error');
    });
  });

  describe('Integration with Domain Handlers', () => {
    it('should work with projects handler', async () => {
      const mockHandler = jest.fn().mockResolvedValue({
        content: [
          { type: 'text' as const, text: JSON.stringify([{ key: 'test', name: 'Test Project' }]) },
        ],
      });

      toolRegistry.registerTool({
        name: 'projects',
        description: 'List projects',
        handler: mockHandler,
      });

      const registeredHandler = mockServer.registerTool.mock.calls[0][2];
      const result = await registeredHandler({}, {});

      expect(mockHandler).toHaveBeenCalled();
      expect(result.content[0].text).toContain('Test Project');
    });

    it('should work with quality metrics handler through adapter', async () => {
      const mockHandler = jest.fn().mockResolvedValue({
        content: [{ type: 'text' as const, text: JSON.stringify({ metrics: [] }) }],
      });

      toolRegistry.registerTool({
        name: 'quality_metrics',
        description: 'Get quality metrics',
        handler: async (params: Record<string, unknown>) => {
          const adaptedParams = adaptQualityMetricsParams(params);
          return mockHandler(adaptedParams);
        },
      });

      const registeredHandler = mockServer.registerTool.mock.calls[0][2];
      const result = await registeredHandler({ projectKey: 'test-project' }, {});

      expect(mockHandler).toHaveBeenCalledWith({
        projectKey: 'test-project',
      });
      expect(result.content[0].text).toContain('metrics');
    });
  });
});
