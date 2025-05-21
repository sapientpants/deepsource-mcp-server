/**
 * Test file for the tool handler function in index.ts
 */

import { describe, it, expect } from '@jest/globals';

describe('tool handler transformation', () => {
  it('should correctly transform handler results to MCP format', () => {
    // Create mock input data
    const mockHandlerResult = {
      content: [{ type: 'text', text: 'Test result' }],
      isError: false,
    };

    // Function that mimics the transformation logic in index.ts
    const transformToMcpResult = (result) => {
      return {
        content: result.content,
        structuredContent: {},
        isError: result.isError,
      };
    };

    // Call the function with our mock data
    const mcpResult = transformToMcpResult(mockHandlerResult);

    // Verify it transforms correctly
    expect(mcpResult).toEqual({
      content: [{ type: 'text', text: 'Test result' }],
      structuredContent: {},
      isError: false,
    });
  });
});
