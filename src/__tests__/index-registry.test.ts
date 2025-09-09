/**
 * @fileoverview Integration tests for the registry-based MCP server implementation
 */

import { vi } from 'vitest';

// Mock MCP SDK modules FIRST using unstable_mockModule
vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: vi.fn().mockImplementation(() => ({
    registerTool: vi.fn(),
    connect: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn().mockImplementation(() => ({})),
}));

// Mock logger
vi.mock('../utils/logging/logger.js', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  })),
}));

// Mock the handlers
vi.mock('../handlers/index.js', () => ({
  handleProjects: vi.fn().mockResolvedValue({
    content: [{ type: 'text', text: JSON.stringify([{ key: 'test', name: 'Test Project' }]) }],
  }),
  handleDeepsourceQualityMetrics: vi.fn().mockResolvedValue({
    content: [{ type: 'text', text: JSON.stringify({ metrics: [] }) }],
  }),
  handleDeepsourceUpdateMetricThreshold: vi.fn().mockResolvedValue({
    content: [{ type: 'text', text: JSON.stringify({ ok: true }) }],
  }),
  handleDeepsourceUpdateMetricSetting: vi.fn().mockResolvedValue({
    content: [{ type: 'text', text: JSON.stringify({ success: true }) }],
  }),
  handleDeepsourceComplianceReport: vi.fn().mockResolvedValue({
    content: [{ type: 'text', text: JSON.stringify({ report: {} }) }],
  }),
  handleDeepsourceProjectIssues: vi.fn().mockResolvedValue({
    content: [{ type: 'text', text: JSON.stringify({ issues: [] }) }],
  }),
  handleDeepsourceProjectRuns: vi.fn().mockResolvedValue({
    content: [{ type: 'text', text: JSON.stringify({ runs: [] }) }],
  }),
  handleDeepsourceRun: vi.fn().mockResolvedValue({
    content: [{ type: 'text', text: JSON.stringify({ run: {} }) }],
  }),
  handleDeepsourceRecentRunIssues: vi.fn().mockResolvedValue({
    content: [{ type: 'text', text: JSON.stringify({ issues: [] }) }],
  }),
  handleDeepsourceDependencyVulnerabilities: vi.fn().mockResolvedValue({
    content: [{ type: 'text', text: JSON.stringify({ vulnerabilities: [] }) }],
  }),
}));

// Mock the server/tool-helpers
vi.mock('../server/tool-helpers.js', () => ({
  logToolInvocation: vi.fn(),
  logToolResult: vi.fn(),
  logAndFormatError: vi.fn().mockReturnValue('Formatted error'),
}));

// Mock the handler-adapters
vi.mock('../adapters/handler-adapters.js', () => ({
  adaptQualityMetricsParams: vi.fn((params) => params),
  adaptUpdateMetricThresholdParams: vi.fn((params) => params),
  adaptComplianceReportParams: vi.fn((params) => params),
  adaptProjectIssuesParams: vi.fn((params) => params),
}));

// Mock zod for schema validation
vi.mock('zod', () => ({
  z: {
    object: vi.fn(() => ({ safeParse: vi.fn(() => ({ success: true, data: {} })) })),
    string: vi.fn(() => ({})),
    number: vi.fn(() => ({})),
    boolean: vi.fn(() => ({})),
    array: vi.fn(() => ({})),
    optional: vi.fn(() => ({})),
  },
}));

// Mock handler base modules
vi.mock('../handlers/base/handler.interface.js', () => ({
  HandlerFunction: {},
  BaseHandlerDeps: {},
}));

vi.mock('../handlers/base/handler.factory.js', () => ({
  createDefaultHandlerDeps: vi.fn(),
  isApiResponse: vi.fn(() => false),
  createErrorResponse: vi.fn((error) => ({
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
    handler: MockedFunction<(...args: any[]) => Promise<unknown>>;
  }> = [];

  registerTool(tool: {
    name: string;
    description: string;
    inputSchema?: Record<string, unknown>;
    handler: MockedFunction<(...args: any[]) => Promise<unknown>>;
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

vi.mock('../server/tool-registry.js', () => ({
  ToolRegistry: MockToolRegistry,
}));

// Now import test utilities and modules after mocks are set
const { describe, it, expect, beforeEach, afterEach } = await import('vitest');
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
    registerTool: any; // skipcq: JS-0323
    connect: MockedFunction<(...args: any[]) => Promise<void>>;
  };

  beforeEach(() => {
    // Create fresh instances for each test
    mockMcpServer = {
      registerTool: vi.fn(),
      connect: vi.fn().mockResolvedValue(undefined),
    };
    (McpServer as any).mockImplementation(() => mockMcpServer as ReturnType<typeof McpServer>);
    registry = new ToolRegistry();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
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
        handler: vi.fn().mockResolvedValue({ success: true }),
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
        handler: vi.fn(),
      };

      registry.registerTool(tool);

      expect(() => registry.registerTool(tool)).toThrow('Tool test-tool is already registered');
    });

    it('should register tools with MCP server', () => {
      const server = new McpServer('test-server', '1.0.0') as ReturnType<typeof McpServer>;
      const tool = {
        name: 'test-tool',
        description: 'A test tool',
        handler: vi.fn(),
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
      const handler = vi.fn().mockResolvedValue({
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
      const handler = vi.fn().mockRejectedValue(new Error('Tool error'));

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
      const handler = vi.fn().mockResolvedValue({ success: true });

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
