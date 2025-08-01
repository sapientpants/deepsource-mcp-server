/**
 * @fileoverview Minimal test for index.ts to ensure it loads without errors
 * Since index.ts is primarily registration code and the handlers are tested elsewhere,
 * this ensures the module can be imported successfully
 */

import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';

// Minimal mocks to allow the module to load
jest.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: jest.fn().mockImplementation(() => ({
    registerTool: jest.fn(),
    connect: jest.fn(),
  })),
}));

jest.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: jest.fn(),
}));

describe('index.ts module loading', () => {
  let originalEnv: typeof process.env;

  beforeAll(() => {
    originalEnv = { ...process.env };
    process.env.DEEPSOURCE_API_KEY = 'test-key';
    process.env.NODE_ENV = 'test';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should load without errors', async () => {
    const module = await import('../index.js');
    expect(module).toBeDefined();
    expect(module.mcpServer).toBeDefined();
  });

  it('should export mcpServer', async () => {
    const { mcpServer } = await import('../index.js');
    expect(mcpServer).toBeDefined();
    expect(mcpServer.mcpServer).toBeDefined();
  });
});
