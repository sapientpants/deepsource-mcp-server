/**
 * This test module tests that index.ts can be imported and works correctly
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

describe('index.ts module', () => {
  // Import the module
  let indexModule;

  beforeAll(async () => {
    // Import the module - this should trigger the code execution
    // and provide us with the exported mcpServer object
    indexModule = await import('../index.js');
  });

  it('should export an mcpServer instance', () => {
    expect(indexModule.mcpServer).toBeDefined();
    expect(indexModule.mcpServer).toBeInstanceOf(McpServer);
  });

  it('should have a server with appropriate methods', () => {
    expect(typeof indexModule.mcpServer.tool).toBe('function');
    expect(typeof indexModule.mcpServer.connect).toBe('function');
  });
});
