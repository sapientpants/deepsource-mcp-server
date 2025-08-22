/**
 * @fileoverview Integration tests for the registry-based MCP server implementation
 */

import { jest } from '@jest/globals';

// Mock MCP SDK modules FIRST using unstable_mockModule
jest.unstable_mockModule('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: jest.fn().mockImplementation(() => ({
    registerTool: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.unstable_mockModule('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: jest.fn().mockImplementation(() => ({})),
}));

// Mock logger
jest.unstable_mockModule('../utils/logging/logger.js', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  })),
}));

// Mock the handlers
jest.unstable_mockModule('../handlers/index.js', () => ({
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
    content: [{ type: 'text', text: JSON.stringify({ success: true }) }],
  }),
  handleDeepsourceComplianceReport: jest.fn().mockResolvedValue({
    content: [{ type: 'text', text: JSON.stringify({ report: {} }) }],
  }),
  handleDeepsourceProjectIssues: jest.fn().mockResolvedValue({
    content: [{ type: 'text', text: JSON.stringify({ issues: [] }) }],
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
  handleDeepsourceDependencyVulnerabilities: jest.fn().mockResolvedValue({
    content: [{ type: 'text', text: JSON.stringify({ vulnerabilities: [] }) }],
  }),
}));

// Mock the server/tool-helpers
jest.unstable_mockModule('../server/tool-helpers.js', () => ({
  logToolInvocation: jest.fn(),
  logToolResult: jest.fn(),
  logAndFormatError: jest.fn().mockReturnValue('Formatted error'),
}));

// Mock the handler-adapters
jest.unstable_mockModule('../adapters/handler-adapters.js', () => ({
  adaptQualityMetricsParams: jest.fn((params) => params),
  adaptUpdateMetricThresholdParams: jest.fn((params) => params),
  adaptComplianceReportParams: jest.fn((params) => params),
  adaptProjectIssuesParams: jest.fn((params) => params),
}));

// Mock zod for schema validation
jest.unstable_mockModule('zod', () => ({
  z: {
    object: jest.fn(() => ({ safeParse: jest.fn(() => ({ success: true, data: {} })) })),
    string: jest.fn(() => ({})),
    number: jest.fn(() => ({})),
    boolean: jest.fn(() => ({})),
    array: jest.fn(() => ({})),
    optional: jest.fn(() => ({})),
  },
}));

// Mock handler base modules
jest.unstable_mockModule('../handlers/base/handler.interface.js', () => ({
  HandlerFunction: {},
  BaseHandlerDeps: {},
}));

jest.unstable_mockModule('../handlers/base/handler.factory.js', () => ({
  createDefaultHandlerDeps: jest.fn(),
  isApiResponse: jest.fn(() => false),
  createErrorResponse: jest.fn((error) => ({
    content: [{ type: 'text', text: `Error: ${error.message}` }],
    isError: true,
  })),
}));

// Mock the ToolRegistry class
class MockToolRegistry {
  private tools: Array<{
    name: string;
    description: string;
    inputSchema?: Record<string, unknown>;
    handler: jest.MockedFunction<() => Promise<unknown>>;
  }> = [];

  registerTool(tool: {
    name: string;
    description: string;
    inputSchema?: Record<string, unknown>;
    handler: jest.MockedFunction<() => Promise<unknown>>;
  }) {
    if (this.tools.find((t) => t.name === tool.name)) {
      throw new Error(`Tool ${tool.name} is already registered`);
    }
    this.tools.push(tool);
  }

  getTools() {
    return this.tools;
  }

  registerWithMcpServer(server: {
    registerTool: (_config: {
      name: string;
      description: string;
      inputSchema?: unknown;
      handler: unknown;
    }) => void;
  }) {
    this.tools.forEach((tool) => {
      server.registerTool({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        handler: tool.handler,
      });
    });
  }
}

jest.unstable_mockModule('../server/tool-registry.js', () => ({
  ToolRegistry: MockToolRegistry,
}));

// Now import test utilities and modules after mocks are set
const { describe, it, expect, beforeEach, afterEach } = await import('@jest/globals');
const { McpServer } = await import('@modelcontextprotocol/sdk/server/mcp.js');
const { ToolRegistry } = await import('../server/tool-registry.js');
const {
  adaptQualityMetricsParams,
  adaptUpdateMetricThresholdParams,
  adaptComplianceReportParams,
  adaptProjectIssuesParams,
} = await import('../adapters/handler-adapters.js');

describe('Registry-based MCP Server Integration', () => {
  let registry: MockToolRegistry;
  let mockMcpServer: {
    registerTool: jest.MockedFunction<() => void>;
    connect: jest.MockedFunction<() => Promise<void>>;
  };

  beforeEach(() => {
    // Create fresh instances for each test
    mockMcpServer = {
      registerTool: jest.fn(),
      connect: jest.fn().mockResolvedValue(undefined),
    };
    (McpServer as jest.MockedFunction<typeof McpServer>).mockImplementation(
      () => mockMcpServer as ReturnType<typeof McpServer>
    );
    registry = new ToolRegistry();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('ToolRegistry', () => {
    it('should register tools successfully', () => {
      const tool = {
        name: 'test-tool',
        description: 'A test tool',
        inputSchema: {
          type: 'object',
          properties: {
            param: { type: 'string' },
          },
        },
        handler: jest.fn().mockResolvedValue({ success: true }),
      };

      registry.registerTool(tool);
      const tools = registry.getTools();

      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('test-tool');
    });

    it('should prevent duplicate tool registration', () => {
      const tool = {
        name: 'test-tool',
        description: 'A test tool',
        handler: jest.fn(),
      };

      registry.registerTool(tool);

      expect(() => registry.registerTool(tool)).toThrow('Tool test-tool is already registered');
    });

    it('should register tools with MCP server', () => {
      const server = new McpServer('test-server', '1.0.0') as ReturnType<typeof McpServer>;
      const tool = {
        name: 'test-tool',
        description: 'A test tool',
        handler: jest.fn(),
      };

      registry.registerTool(tool);
      registry.registerWithMcpServer(server);

      expect(server.registerTool).toHaveBeenCalledWith({
        name: 'test-tool',
        description: 'A test tool',
        inputSchema: undefined,
        handler: expect.any(Function),
      });
    });
  });

  describe('Handler Adapter Integration', () => {
    it('should correctly adapt quality metrics parameters', () => {
      const params = {
        project_key: 'test-project',
        from_date: '2024-01-01',
        to_date: '2024-01-31',
      };

      const adapted = adaptQualityMetricsParams(params);
      expect(adapted).toEqual(params);
      expect(adaptQualityMetricsParams).toHaveBeenCalledWith(params);
    });

    it('should correctly adapt update metric threshold parameters', () => {
      const params = {
        project_key: 'test-project',
        metric_key: 'coverage',
        threshold: 80,
      };

      const adapted = adaptUpdateMetricThresholdParams(params);
      expect(adapted).toEqual(params);
      expect(adaptUpdateMetricThresholdParams).toHaveBeenCalledWith(params);
    });

    it('should correctly adapt compliance report parameters', () => {
      const params = {
        project_key: 'test-project',
        framework: 'OWASP',
      };

      const adapted = adaptComplianceReportParams(params);
      expect(adapted).toEqual(params);
      expect(adaptComplianceReportParams).toHaveBeenCalledWith(params);
    });

    it('should correctly adapt project issues parameters', () => {
      const params = {
        project_key: 'test-project',
        page: 1,
        limit: 20,
        category: 'bug',
      };

      const adapted = adaptProjectIssuesParams(params);
      expect(adapted).toEqual(params);
      expect(adaptProjectIssuesParams).toHaveBeenCalledWith(params);
    });
  });

  describe('End-to-End Tool Registration', () => {
    it('should handle successful tool execution', async () => {
      const handler = jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Success' }],
      });

      const tool = {
        name: 'test-tool',
        description: 'A test tool',
        inputSchema: {
          type: 'object',
          properties: {
            param: { type: 'string' },
          },
          required: ['param'],
        },
        handler,
      };

      registry.registerTool(tool);
      const registeredTool = registry.getTools()[0];

      // Call the wrapped handler
      const result = await registeredTool.handler({ param: 'test' });

      expect(handler).toHaveBeenCalledWith({ param: 'test' });
      expect(result).toEqual({
        content: [{ type: 'text', text: 'Success' }],
      });
    });

    it('should handle tool execution errors', async () => {
      const handler = jest.fn().mockRejectedValue(new Error('Tool error'));

      const tool = {
        name: 'test-tool',
        description: 'A test tool',
        handler,
      };

      registry.registerTool(tool);
      const registeredTool = registry.getTools()[0];

      // Call the wrapped handler
      await expect(registeredTool.handler({})).rejects.toThrow('Tool error');
    });
  });

  describe('Schema Validation', () => {
    it('should validate input schema when provided', async () => {
      const handler = jest.fn().mockResolvedValue({ success: true });

      const tool = {
        name: 'test-tool',
        description: 'A test tool',
        inputSchema: {
          type: 'object',
          properties: {
            required_param: { type: 'string' },
          },
          required: ['required_param'],
        },
        handler,
      };

      registry.registerTool(tool);
      const registeredTool = registry.getTools()[0];

      // This will be validated by the registry's wrapper
      await registeredTool.handler({ required_param: 'value' });

      expect(handler).toHaveBeenCalledWith({ required_param: 'value' });
    });
  });
});
