/**
 * @fileoverview Minimal test for index.ts to ensure it loads without errors
 * Since index.ts is primarily registration code and the handlers are tested elsewhere,
 * this ensures the module can be imported successfully
 */

import { vi } from 'vitest';

// Use unstable_mockModule for ES modules - set up all mocks before imports
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

vi.mock('../server/mcp-server.js', () => ({
  DeepSourceMCPServer: {
    create: vi.fn().mockResolvedValue({
      getRegisteredTools: vi.fn().mockReturnValue([]),
      getMcpServer: vi.fn().mockReturnValue({
        registerTool: vi.fn(),
      }),
      start: vi.fn(),
    }),
  },
}));

// Import test utilities after all mocks are set
const { describe, it, expect, beforeAll, afterAll } = await import('vitest');

describe('index.ts module loading', () => {
  let originalEnv: typeof process.env;
  let indexModule: {
    mcpServer: {
      current: {
        getRegisteredTools?: () => string[];
        getMcpServer?: () => unknown;
      };
    };
  };

  beforeAll(async () => {
    originalEnv = { ...process.env };
    process.env.DEEPSOURCE_API_KEY = 'test-key';
    process.env.NODE_ENV = 'test';

    // Import the module after mocking
    indexModule = await import('../index.js');
  });

  afterAll(() => {
    process.env = originalEnv;
    vi.resetModules();
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
