/**
 * This test module tests that index.ts can be imported and works correctly
 */

import { vi } from 'vitest';

// Set up all mocks BEFORE any imports - using unstable_mockModule for ES modules
vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: vi.fn().mockImplementation(() => ({
    registerTool: vi.fn(),
    connect: vi.fn(),
    setRequestHandler: vi.fn(),
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

vi.mock('../server/tool-registry.js', () => ({
  ToolRegistry: vi.fn().mockImplementation(() => ({
    registerTool: vi.fn(),
    getTools: vi.fn().mockReturnValue([]),
  })),
}));

vi.mock('../handlers/base/handler.factory.js', () => ({
  createDefaultHandlerDeps: vi.fn(() => ({
    client: {},
    logger: {
      info: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    },
  })),
  createBaseHandlerFactory: vi.fn(),
}));

vi.mock('../server/tool-registration.js', () => ({
  registerDeepSourceTools: vi.fn(),
}));

vi.mock('../server/mcp-server.js', () => ({
  DeepSourceMCPServer: {
    create: vi.fn().mockResolvedValue({
      getRegisteredTools: vi.fn().mockReturnValue(['projects', 'issues']),
      getMcpServer: vi.fn().mockReturnValue({
        registerTool: vi.fn(),
      }),
      start: vi.fn(),
    }),
  },
}));

// Now import test utilities after mocks are set
const { describe, it, expect, beforeAll, afterAll } = await import('vitest');

describe('index.ts module', () => {
  // Import the module
  let indexModule: {
    mcpServer: {
      current: {
        getRegisteredTools: () => string[];
        getMcpServer: () => unknown;
        start?: () => Promise<void>;
      };
    };
    getMcpServer: () => unknown;
  };
  let originalEnv: typeof process.env;

  beforeAll(async () => {
    // Save original env
    originalEnv = { ...process.env };

    // Set required environment variables for testing
    process.env.DEEPSOURCE_API_KEY = 'test-key';
    process.env.NODE_ENV = 'test';

    // Import the module - this should trigger the code execution
    // and provide us with the exported mcpServer object
    indexModule = await import('../index.js');
  });

  afterAll(() => {
    // Restore original env
    process.env = originalEnv;
  });

  it('should export an mcpServer instance', () => {
    expect(indexModule.mcpServer).toBeDefined();
    expect(indexModule.mcpServer.current).toBeDefined();
  });

  it('should have a server with appropriate methods', () => {
    expect(typeof indexModule.mcpServer.current.getRegisteredTools).toBe('function');
    expect(typeof indexModule.getMcpServer).toBe('function');
  });
});
