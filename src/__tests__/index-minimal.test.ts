/**
 * @fileoverview Minimal test for index.ts to ensure it loads without errors
 * Since index.ts is primarily registration code and the handlers are tested elsewhere,
 * this ensures the module can be imported successfully
 */

import { jest } from '@jest/globals';

// Use unstable_mockModule for ES modules - set up all mocks before imports
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

jest.unstable_mockModule('../server/mcp-server.js', () => ({
  DeepSourceMCPServer: {
    create: jest.fn().mockResolvedValue({
      getRegisteredTools: jest.fn().mockReturnValue([]),
      getMcpServer: jest.fn().mockReturnValue({
        registerTool: jest.fn(),
      }),
      start: jest.fn(),
    }),
  },
}));

// Import test utilities after all mocks are set
const { describe, it, expect, beforeAll, afterAll } = await import('@jest/globals');

describe('index.ts module loading', () => {
  let originalEnv: typeof process.env;
  let indexModule: any;

  beforeAll(async () => {
    originalEnv = { ...process.env };
    process.env.DEEPSOURCE_API_KEY = 'test-key';
    process.env.NODE_ENV = 'test';

    // Import the module after mocking
    indexModule = await import('../index.js');
  });

  afterAll(() => {
    process.env = originalEnv;
    jest.resetModules();
  });

  it('should load without errors', () => {
    expect(indexModule).toBeDefined();
    expect(indexModule.mcpServer).toBeDefined();
  });

  it('should export mcpServer', () => {
    const { mcpServer } = indexModule;
    expect(mcpServer).toBeDefined();
    expect(mcpServer.current).toBeDefined();
  });
});
