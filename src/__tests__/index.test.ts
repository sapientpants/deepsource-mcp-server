/**
 * This test module tests that index.ts can be imported
 */

import { describe, it, expect } from '@jest/globals';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Create minimal test to verify module can be imported
describe('index.ts module', () => {
  // Import the module
  let indexModule;

  beforeAll(async () => {
    indexModule = await import('../index.js');
  });

  it('should export an mcpServer instance', () => {
    expect(indexModule.mcpServer).toBeDefined();
    expect(indexModule.mcpServer).toBeInstanceOf(McpServer);
  });
});
