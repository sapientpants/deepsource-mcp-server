/**
 * This test module tests that index.ts can be imported and works correctly
 */

import { describe, it, expect, beforeAll, jest } from '@jest/globals';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Mock the projects handler
jest.mock('../handlers/projects.js', () => ({
  handleProjects: jest.fn().mockResolvedValue({
    content: [
      {
        type: 'text',
        text: JSON.stringify([{ key: 'test-key', name: 'test-project' }]),
      },
    ],
    isError: false,
  }),
}));

describe('index.ts module', () => {
  // Import the module
  let indexModule;
  let originalEnv;

  beforeAll(async () => {
    // Save original env
    originalEnv = process.env;

    // Set required environment variables for testing
    process.env.DEEPSOURCE_API_KEY = 'test-key';

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
    expect(indexModule.mcpServer.mcpServer).toBeDefined();
  });

  it('should have a server with appropriate methods', () => {
    expect(typeof indexModule.mcpServer.getRegisteredTools).toBe('function');
    expect(typeof indexModule.getMcpServer).toBe('function');
  });
});
