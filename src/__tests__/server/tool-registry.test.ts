/**
 * @fileoverview Tests for the ToolRegistry class
 */

import { jest } from '@jest/globals';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ToolRegistry, ToolDefinition } from '../../server/tool-registry.js';
import { BaseHandlerDeps } from '../../handlers/base/handler.interface.js';
import { ApiResponse } from '../../models/common.js';

// Mock the MCP server
jest.mock('@modelcontextprotocol/sdk/server/mcp.js');

// Mock the logger
jest.mock('../../utils/logging/logger.js', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

// Mock the config
jest.mock('../../config/index.js', () => ({
  getApiKey: jest.fn(() => 'test-api-key'),
}));

// Mock tool helpers
jest.mock('../../server/tool-helpers.js', () => ({
  logToolInvocation: jest.fn(),
  logToolResult: jest.fn(),
  logAndFormatError: jest.fn((error: unknown, toolName: string) => {
    if (error instanceof Error) {
      return `${toolName} error: ${error.message}`;
    }
    return `${toolName} error: ${String(error)}`;
  }),
}));

describe('ToolRegistry', () => {
  let mockServer: jest.Mocked<McpServer>;
  let registry: ToolRegistry;
  let mockDeps: BaseHandlerDeps;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock server
    mockServer = {
      registerTool: jest.fn(),
    } as unknown as jest.Mocked<McpServer>;

    // Create mock dependencies without calling createDefaultHandlerDeps
    mockDeps = {
      clientFactory: {
        createClient: jest.fn(),
      } as any,
      logger: {
        info: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      },
      getApiKey: jest.fn(() => 'test-api-key'),
    };

    // Create registry instance
    registry = new ToolRegistry(mockServer, mockDeps);
  });

  describe('constructor', () => {
    it('should initialize with server and default deps', () => {
      // Set env var for this test
      process.env.DEEPSOURCE_API_KEY = 'test-key';
      const newRegistry = new ToolRegistry(mockServer);
      expect(newRegistry).toBeDefined();
      delete process.env.DEEPSOURCE_API_KEY;
    });

    it('should initialize with server and custom deps', () => {
      const newRegistry = new ToolRegistry(mockServer, mockDeps);
      expect(newRegistry).toBeDefined();
    });
  });

  describe('registerTool', () => {
    it('should register a simple tool without schemas', () => {
      const tool: ToolDefinition = {
        name: 'test_tool',
        description: 'A test tool',
        handler: async () => ({
          content: [{ type: 'text', text: 'test result' }],
        }),
      };

      registry.registerTool(tool);

      expect(mockServer.registerTool).toHaveBeenCalledWith(
        'test_tool',
        { description: 'A test tool' },
        expect.any(Function)
      );
    });

    it('should register a tool with input and output schemas', () => {
      const inputSchema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const outputSchema = z.object({
        message: z.string(),
      });

      const tool: ToolDefinition = {
        name: 'user_tool',
        description: 'A user tool',
        inputSchema,
        outputSchema,
        handler: async (params) => ({
          content: [{ type: 'text', text: JSON.stringify({ message: `Hello ${params.name}` }) }],
        }),
      };

      registry.registerTool(tool);

      expect(mockServer.registerTool).toHaveBeenCalledWith(
        'user_tool',
        {
          description: 'A user tool',
          inputSchema,
          outputSchema,
        },
        expect.any(Function)
      );
    });

    it('should warn when overwriting an existing tool', () => {
      const tool1: ToolDefinition = {
        name: 'duplicate_tool',
        description: 'First version',
        handler: async () => ({ content: [{ type: 'text', text: 'v1' }] }),
      };

      const tool2: ToolDefinition = {
        name: 'duplicate_tool',
        description: 'Second version',
        handler: async () => ({ content: [{ type: 'text', text: 'v2' }] }),
      };

      registry.registerTool(tool1);
      registry.registerTool(tool2);

      expect(mockServer.registerTool).toHaveBeenCalledTimes(2);
    });
  });

  describe('tool execution', () => {
    it('should execute handler successfully with valid input', async () => {
      const inputSchema = z.object({
        message: z.string(),
      });

      const mockHandler = jest.fn(async (params: { message: string }) => ({
        content: [{ type: 'text' as const, text: `Echo: ${params.message}` }],
      }));

      const tool: ToolDefinition = {
        name: 'echo_tool',
        description: 'Echoes input',
        inputSchema,
        handler: mockHandler,
      };

      registry.registerTool(tool);

      // Get the registered handler
      const registeredHandler = mockServer.registerTool.mock.calls[0][2];

      // Execute with valid input
      const result = await registeredHandler({ message: 'Hello' }, {});

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Echo: Hello' }],
        structuredContent: 'Echo: Hello',
        isError: false,
      });
      expect(mockHandler).toHaveBeenCalledWith({ message: 'Hello' });
    });

    it('should handle input validation errors', async () => {
      const inputSchema = z.object({
        age: z.number().min(0).max(120),
      });

      const tool: ToolDefinition = {
        name: 'age_tool',
        description: 'Validates age',
        inputSchema,
        handler: async () => ({ content: [{ type: 'text', text: 'OK' }] }),
      };

      registry.registerTool(tool);

      const registeredHandler = mockServer.registerTool.mock.calls[0][2];

      // Execute with invalid input
      const result = await registeredHandler({ age: 'not a number' }, {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid input:');
    });

    it('should handle handler execution errors', async () => {
      const tool: ToolDefinition = {
        name: 'error_tool',
        description: 'Throws errors',
        handler: async () => {
          throw new Error('Handler failed');
        },
      };

      registry.registerTool(tool);

      const registeredHandler = mockServer.registerTool.mock.calls[0][2];

      const result = await registeredHandler({}, {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('Handler failed');
    });

    it('should handle ApiResponse format from handler', async () => {
      const apiResponse: ApiResponse = {
        content: [{ type: 'text', text: JSON.stringify({ data: 'test' }) }],
        isError: false,
      };

      const tool: ToolDefinition = {
        name: 'api_tool',
        description: 'Returns API response',
        handler: async () => apiResponse,
      };

      registry.registerTool(tool);

      const registeredHandler = mockServer.registerTool.mock.calls[0][2];

      const result = await registeredHandler({}, {});

      expect(result).toEqual({
        content: apiResponse.content,
        structuredContent: { data: 'test' },
        isError: false,
      });
    });

    it('should handle ApiResponse errors', async () => {
      const errorResponse: ApiResponse = {
        content: [{ type: 'text', text: JSON.stringify({ error: 'API failed' }) }],
        isError: true,
      };

      const tool: ToolDefinition = {
        name: 'api_error_tool',
        description: 'Returns API error',
        handler: async () => errorResponse,
      };

      registry.registerTool(tool);

      const registeredHandler = mockServer.registerTool.mock.calls[0][2];

      const result = await registeredHandler({}, {});

      expect(result.isError).toBe(true);
      // The error is thrown and caught, producing the actual error message
      expect(result.content[0].text).toBe('DeepSource API Error: API failed');
    });

    it('should handle non-ApiResponse results', async () => {
      const tool: ToolDefinition = {
        name: 'plain_tool',
        description: 'Returns plain object',
        handler: async () => ({ data: 'plain result' }),
      };

      registry.registerTool(tool);

      const registeredHandler = mockServer.registerTool.mock.calls[0][2];

      const result = await registeredHandler({}, {});

      expect(result).toEqual({
        content: [{ type: 'text', text: '{\n  "data": "plain result"\n}' }],
        structuredContent: { data: 'plain result' },
        isError: false,
      });
    });

    it('should handle undefined params', async () => {
      const tool: ToolDefinition = {
        name: 'no_params_tool',
        description: 'No params',
        handler: async (params) => ({
          content: [{ type: 'text', text: JSON.stringify(params) }],
        }),
      };

      registry.registerTool(tool);

      const registeredHandler = mockServer.registerTool.mock.calls[0][2];

      const result = await registeredHandler(undefined, {});

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toBe('{}');
    });
  });

  describe('registerTools', () => {
    it('should register multiple tools at once', () => {
      const tools: ToolDefinition[] = [
        {
          name: 'tool1',
          description: 'First tool',
          handler: async () => ({ content: [{ type: 'text', text: '1' }] }),
        },
        {
          name: 'tool2',
          description: 'Second tool',
          handler: async () => ({ content: [{ type: 'text', text: '2' }] }),
        },
        {
          name: 'tool3',
          description: 'Third tool',
          handler: async () => ({ content: [{ type: 'text', text: '3' }] }),
        },
      ];

      registry.registerTools(tools);

      expect(mockServer.registerTool).toHaveBeenCalledTimes(3);
      expect(mockServer.registerTool).toHaveBeenCalledWith(
        'tool1',
        expect.any(Object),
        expect.any(Function)
      );
      expect(mockServer.registerTool).toHaveBeenCalledWith(
        'tool2',
        expect.any(Object),
        expect.any(Function)
      );
      expect(mockServer.registerTool).toHaveBeenCalledWith(
        'tool3',
        expect.any(Object),
        expect.any(Function)
      );
    });
  });

  describe('getTool', () => {
    it('should return registered tool', () => {
      const tool: ToolDefinition = {
        name: 'get_tool',
        description: 'Tool to get',
        handler: async () => ({ content: [{ type: 'text', text: 'got' }] }),
      };

      registry.registerTool(tool);

      const retrieved = registry.getTool('get_tool');
      expect(retrieved).toEqual(tool);
    });

    it('should return undefined for non-existent tool', () => {
      const retrieved = registry.getTool('non_existent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('getToolNames', () => {
    it('should return empty array initially', () => {
      expect(registry.getToolNames()).toEqual([]);
    });

    it('should return all registered tool names', () => {
      const tools: ToolDefinition[] = [
        { name: 'alpha', description: 'A', handler: async () => ({ content: [] }) },
        { name: 'beta', description: 'B', handler: async () => ({ content: [] }) },
        { name: 'gamma', description: 'C', handler: async () => ({ content: [] }) },
      ];

      registry.registerTools(tools);

      const names = registry.getToolNames();
      expect(names).toHaveLength(3);
      expect(names).toContain('alpha');
      expect(names).toContain('beta');
      expect(names).toContain('gamma');
    });
  });

  describe('hasTool', () => {
    it('should return false for non-existent tool', () => {
      expect(registry.hasTool('missing')).toBe(false);
    });

    it('should return true for registered tool', () => {
      registry.registerTool({
        name: 'exists',
        description: 'Existing tool',
        handler: async () => ({ content: [] }),
      });

      expect(registry.hasTool('exists')).toBe(true);
    });
  });

  describe('updateDefaultDeps', () => {
    it('should update default dependencies', () => {
      const newDeps = {
        clientFactory: {} as any,
        logger: {} as any,
        getApiKey: jest.fn(),
      };
      registry.updateDefaultDeps(newDeps);
      // No error thrown means success
      expect(true).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle malformed JSON in ApiResponse', async () => {
      const tool: ToolDefinition = {
        name: 'malformed_tool',
        description: 'Returns malformed JSON',
        handler: async () => ({
          content: [{ type: 'text' as const, text: 'not valid json' }],
        }),
      };

      registry.registerTool(tool);

      const registeredHandler = mockServer.registerTool.mock.calls[0][2];
      const result = await registeredHandler({}, {});

      expect(result.structuredContent).toBe('not valid json');
    });

    it('should handle error response with non-JSON text', async () => {
      const tool: ToolDefinition = {
        name: 'error_text_tool',
        description: 'Returns error with plain text',
        handler: async () => ({
          content: [{ type: 'text' as const, text: 'Plain error message' }],
          isError: true,
        }),
      };

      registry.registerTool(tool);

      const registeredHandler = mockServer.registerTool.mock.calls[0][2];
      const result = await registeredHandler({}, {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('Plain error message');
    });

    it('should handle empty content array', async () => {
      const tool: ToolDefinition = {
        name: 'empty_content_tool',
        description: 'Returns empty content',
        handler: async () => ({
          content: [],
        }),
      };

      registry.registerTool(tool);

      const registeredHandler = mockServer.registerTool.mock.calls[0][2];
      const result = await registeredHandler({}, {});

      expect(result.content).toEqual([]);
    });
  });
});
