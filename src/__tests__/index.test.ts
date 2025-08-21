/**
 * This test module tests that index.ts can be imported and works correctly
 */

import { jest } from '@jest/globals';

// Set up all mocks BEFORE any imports - using unstable_mockModule for ES modules
jest.unstable_mockModule('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: jest.fn().mockImplementation(() => ({
    registerTool: jest.fn(),
    connect: jest.fn(),
    setRequestHandler: jest.fn(),
  })),
}));

jest.unstable_mockModule('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: jest.fn(),
}));

jest.unstable_mockModule('../utils/logging/logger.js', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  })),
}));

jest.unstable_mockModule('../server/tool-registry.js', () => ({
  ToolRegistry: jest.fn().mockImplementation(() => ({
    registerTool: jest.fn(),
    getTools: jest.fn().mockReturnValue([]),
  })),
}));

jest.unstable_mockModule('../handlers/base/handler.factory.js', () => ({
  createDefaultHandlerDeps: jest.fn(() => ({
    client: {},
    logger: {
      info: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    },
  })),
}));

jest.unstable_mockModule('../server/tool-registration.js', () => ({
  registerDeepSourceTools: jest.fn(),
}));

jest.unstable_mockModule('../server/mcp-server.js', () => ({
  DeepSourceMCPServer: {
    create: jest.fn().mockResolvedValue({
      getRegisteredTools: jest.fn().mockReturnValue(['projects', 'issues']),
      getMcpServer: jest.fn().mockReturnValue({
        registerTool: jest.fn(),
      }),
      start: jest.fn(),
    }),
  },
}));

// Now import test utilities after mocks are set
const { describe, it, expect, beforeAll, afterAll } = await import('@jest/globals');

describe('index.ts module', () => {
  // Import the module
  let indexModule: any;
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
