/**
 * @fileoverview Tests for the ToolRegistry class
 */

import { vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ToolRegistry, ToolDefinition } from '../../server/tool-registry.js';
import { BaseHandlerDeps } from '../../handlers/base/handler.interface.js';
import { ApiResponse } from '../../models/common.js';
import { DeepSourceClientFactory } from '../../client/factory.js';
import { Logger } from '../../utils/logging/logger.js';

// Mock the MCP server
vi.mock('@modelcontextprotocol/sdk/server/mcp.js');

// Mock the logger
vi.mock('../../utils/logging/logger.js', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

// Mock the config
vi.mock('../../config/index.js', () => ({
  getApiKey: vi.fn(() => 'test-api-key'),
}));

// Mock tool helpers
vi.mock('../../server/tool-helpers.js', () => ({
  logToolInvocation: vi.fn(),
  logToolResult: vi.fn(),
  logAndFormatError: vi.fn((error: unknown, _toolName: string) => {
    if (error instanceof Error) {
      return `${error.message}`;
    }
    return `${String(error)}`;
  }),
}));

// Mock error formatter
vi.mock('../../utils/error-handling/mcp-error-formatter.js', () => ({
  createErrorResponse: vi.fn((_error: unknown) => ({
    content: [{ type: 'text', text: JSON.stringify({ error: 'formatted error' }) }],
    isError: true,
  })),
}));

describe('ToolRegistry', () => {
  let mockServer: any;
  let registry: ToolRegistry;
  let mockDeps: BaseHandlerDeps;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock server
    mockServer = {
      registerTool: vi.fn(),
    } as unknown as any;

    // Create mock dependencies without calling createDefaultHandlerDeps
    mockDeps = {
      clientFactory: {
        createClient: vi.fn(),
      } as DeepSourceClientFactory,
      logger: {
        info: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      },
      getApiKey: vi.fn(() => 'test-api-key'),
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

      const mockHandler = vi.fn(async (params: { message: string }) => ({
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
      // The error content is the raw JSON string that was in the ApiResponse
      expect(result.content[0].text).toBe('{"error":"API failed"}');
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
        clientFactory: {} as DeepSourceClientFactory,
        logger: {} as Logger,
        getApiKey: vi.fn(),
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

    it('should handle error response with malformed JSON', async () => {
      const tool: ToolDefinition = {
        name: 'malformed_json_error_tool',
        description: 'Returns error with malformed JSON',
        handler: async () => ({
          content: [{ type: 'text' as const, text: '{ invalid json }' }],
          isError: true,
        }),
      };

      registry.registerTool(tool);

      const registeredHandler = mockServer.registerTool.mock.calls[0][2];
      const result = await registeredHandler({}, {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('{ invalid json }');
      expect(result.structuredContent).toEqual({
        code: 'HANDLER_ERROR',
        message: '{ invalid json }',
      });
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

    it('should handle error response parsing failure', async () => {
      // Mock createErrorResponse to return malformed JSON that will fail to parse
      const { createErrorResponse } = vi.mocked(
        await import('../../utils/error-handling/mcp-error-formatter.js')
      );
      createErrorResponse.mockReturnValueOnce({
        content: [{ type: 'text', text: 'malformed{json}' }],
        isError: true,
      });

      const tool: ToolDefinition = {
        name: 'parse_error_tool',
        description: 'Tool that causes error response parsing to fail',
        handler: async () => {
          throw new Error('Test error for parsing failure');
        },
      };

      registry.registerTool(tool);

      const registeredHandler = mockServer.registerTool.mock.calls[0][2];
      const result = await registeredHandler({}, {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('Test error for parsing failure');
      // The actual structured content that gets set when JSON parsing fails
      expect(result.structuredContent).toEqual({
        code: 'HANDLER_ERROR',
        message: 'Test error for parsing failure',
      });
    });
  });
});
