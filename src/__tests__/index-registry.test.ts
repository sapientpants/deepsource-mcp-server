/**
 * @fileoverview Integration tests for the registry-based MCP server implementation
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ToolRegistry } from '../server/tool-registry.js';

// Mock MCP SDK modules
jest.mock('@modelcontextprotocol/sdk/server/mcp.js');
jest.mock('@modelcontextprotocol/sdk/server/stdio.js');
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

  describe.skip('Main Entry Point Functions', () => {
    let mockExit: jest.SpyInstance;
    let mockConsoleError: jest.SpyInstance;
    let originalProcessEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
      // Mock process.exit
      mockExit = jest.spyOn(process, 'exit').mockImplementation((code?: number) => {
        throw new Error(`process.exit called with code ${code}`);
      });

      // Mock console.error
      mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Save and set environment
      originalProcessEnv = { ...process.env };
      process.env.DEEPSOURCE_API_KEY = 'test-api-key';

      // Mock MCP SDK classes
      (McpServer as jest.MockedClass<typeof McpServer>).mockImplementation(() => ({
        connect: jest.fn().mockResolvedValue(undefined),
      } as any));

      (StdioServerTransport as jest.MockedClass<typeof StdioServerTransport>).mockImplementation(() => ({} as any));
    });

    afterEach(() => {
      mockExit.mockRestore();
      mockConsoleError.mockRestore();
      process.env = originalProcessEnv;
      jest.clearAllMocks();
    });

    describe('validateEnvironment', () => {
      it('should pass when DEEPSOURCE_API_KEY is set', () => {
        process.env.DEEPSOURCE_API_KEY = 'valid-api-key';
        
        // Import the module functions
        const { validateEnvironment } = require('../index-registry.js');
        
        // Should not throw
        expect(() => validateEnvironment()).not.toThrow();
      });

      it('should exit when DEEPSOURCE_API_KEY is missing', () => {
        delete process.env.DEEPSOURCE_API_KEY;
        
        const { validateEnvironment } = require('../index-registry.js');
        
        expect(() => validateEnvironment()).toThrow('process.exit called with code 1');
        expect(mockExit).toHaveBeenCalledWith(1);
      });

      it('should exit when DEEPSOURCE_API_KEY is empty', () => {
        process.env.DEEPSOURCE_API_KEY = '';
        
        const { validateEnvironment } = require('../index-registry.js');
        
        expect(() => validateEnvironment()).toThrow('process.exit called with code 1');
        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });

    describe('createAndConfigureToolRegistry', () => {
      it('should create registry and register all tools', () => {
        const mockServer = new McpServer({ name: 'test', version: '1.0.0' });
        const mockToolRegistry = new ToolRegistry(mockServer);
        
        jest.spyOn(ToolRegistry.prototype, 'registerTool').mockImplementation(() => {});
        jest.spyOn(ToolRegistry.prototype, 'getToolNames').mockReturnValue([
          'projects', 'quality_metrics', 'update_metric_threshold', 
          'update_metric_setting', 'compliance_report', 'project_issues',
          'dependency_vulnerabilities', 'runs', 'run', 'recent_run_issues'
        ]);

        const { createAndConfigureToolRegistry } = require('../index-registry.js');
        const registry = createAndConfigureToolRegistry(mockServer);

        expect(registry).toBeInstanceOf(ToolRegistry);
        expect(ToolRegistry.prototype.registerTool).toHaveBeenCalledTimes(10);
      });

      it('should log tool configuration', () => {
        const mockServer = new McpServer({ name: 'test', version: '1.0.0' });
        
        jest.spyOn(ToolRegistry.prototype, 'registerTool').mockImplementation(() => {});
        jest.spyOn(ToolRegistry.prototype, 'getToolNames').mockReturnValue(['test-tool']);

        const { createAndConfigureToolRegistry } = require('../index-registry.js');
        createAndConfigureToolRegistry(mockServer);

        expect(ToolRegistry.prototype.getToolNames).toHaveBeenCalled();
      });
    });

    describe('main function', () => {
      it('should start server successfully', async () => {
        const mockServer = {
          connect: jest.fn().mockResolvedValue(undefined),
        };
        
(McpServer as jest.MockedClass<typeof McpServer>).mockImplementation(() => mockServer as any);

        const { main } = require('../index-registry.js');
        
        await expect(main()).resolves.not.toThrow();
        expect(McpServer).toHaveBeenCalledWith({
          name: 'deepsource-mcp-server',
          version: '1.2.2',
        });
        expect(mockServer.connect).toHaveBeenCalled();
      });

      it('should handle connection errors', async () => {
        const mockServer = {
          connect: jest.fn().mockRejectedValue(new Error('Connection failed')),
        };
        
(McpServer as jest.MockedClass<typeof McpServer>).mockImplementation(() => mockServer as any);

        const { main } = require('../index-registry.js');
        
        await expect(main()).rejects.toThrow('process.exit called with code 1');
        expect(mockExit).toHaveBeenCalledWith(1);
      });

      it('should handle validation errors', async () => {
        delete process.env.DEEPSOURCE_API_KEY;

        const { main } = require('../index-registry.js');
        
        await expect(main()).rejects.toThrow('process.exit called with code 1');
        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });

    describe('error handlers', () => {
      let originalListeners: any;

      beforeEach(() => {
        // Store and clear existing listeners
        originalListeners = {
          uncaughtException: process.listeners('uncaughtException'),
          unhandledRejection: process.listeners('unhandledRejection'),
        };
        
        process.removeAllListeners('uncaughtException');
        process.removeAllListeners('unhandledRejection');
      });

      afterEach(() => {
        // Restore original listeners
        process.removeAllListeners('uncaughtException');
        process.removeAllListeners('unhandledRejection');
        
        originalListeners.uncaughtException.forEach((listener: any) => {
          process.on('uncaughtException', listener);
        });
        originalListeners.unhandledRejection.forEach((listener: any) => {
          process.on('unhandledRejection', listener);
        });
      });

      it('should handle uncaught exceptions', () => {
        // Import the module to register error handlers
        require('../index-registry.js');

        const testError = new Error('Test uncaught exception');
        
        expect(() => {
          process.emit('uncaughtException', testError);
        }).toThrow('process.exit called with code 1');

        expect(mockExit).toHaveBeenCalledWith(1);
        expect(mockConsoleError).toHaveBeenCalledWith('Uncaught exception:', testError);
      });

      it('should handle unhandled rejections', () => {
        // Import the module to register error handlers
        require('../index-registry.js');

        const testReason = 'Test unhandled rejection';
        const testPromise = Promise.resolve();

        expect(() => {
          process.emit('unhandledRejection', testReason, testPromise);
        }).toThrow('process.exit called with code 1');

        expect(mockExit).toHaveBeenCalledWith(1);
        expect(mockConsoleError).toHaveBeenCalledWith('Unhandled rejection at:', testPromise, 'reason:', testReason);
      });
    });

    describe('tool handler integrations', () => {
      it('should register projects handler without parameters', () => {
        const mockServer = new McpServer({ name: 'test', version: '1.0.0' });
        let registeredHandler: any;
        
        jest.spyOn(ToolRegistry.prototype, 'registerTool').mockImplementation((tool) => {
          if (tool.name === 'projects') {
            registeredHandler = tool.handler;
          }
        });

        const { createAndConfigureToolRegistry } = require('../index-registry.js');
        createAndConfigureToolRegistry(mockServer);

        expect(registeredHandler).toBeDefined();
      });

      it('should register quality metrics handler with adapter', () => {
        const mockServer = new McpServer({ name: 'test', version: '1.0.0' });
        let registeredHandler: any;
        
        jest.spyOn(ToolRegistry.prototype, 'registerTool').mockImplementation((tool) => {
          if (tool.name === 'quality_metrics') {
            registeredHandler = tool.handler;
          }
        });

        const { createAndConfigureToolRegistry } = require('../index-registry.js');
        createAndConfigureToolRegistry(mockServer);

        expect(registeredHandler).toBeDefined();
      });

      it('should call handlers with correct parameters', async () => {
        const mockServer = new McpServer({ name: 'test', version: '1.0.0' });
        const handlers: Record<string, any> = {};
        
        jest.spyOn(ToolRegistry.prototype, 'registerTool').mockImplementation((tool) => {
          handlers[tool.name] = tool.handler;
        });

        const { createAndConfigureToolRegistry } = require('../index-registry.js');
        createAndConfigureToolRegistry(mockServer);

        // Test projects handler (no params)
        if (handlers.projects) {
          await expect(handlers.projects()).resolves.toBeDefined();
        }

        // Test quality metrics handler (with params)
        if (handlers.quality_metrics) {
          await expect(handlers.quality_metrics({ projectKey: 'test' })).resolves.toBeDefined();
        }
      });
    });
  });
});
